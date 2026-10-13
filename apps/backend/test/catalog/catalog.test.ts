import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../../src/lib/prisma';
import { defaultRecorder } from '../../src/realtime/emitter';
import catalogModule from '../../src/modules/catalog';
import seedCatalog from '../../prisma/seeds/02-catalog';
import { appWith, bearer, makeCanteen, makeMenuItem, makeOrder, makeUser, resetDb } from '../helpers';

describe('Phase 2: Menu, Canteen Status & Staff Analytics', () => {
  const app = appWith(catalogModule);

  beforeEach(async () => {
    await resetDb();
  });

  // 1. Student reads a menu including unavailable items; unknown canteen 404
  it('1. Student reads menu including unavailable items; unknown canteen returns 404', async () => {
    const canteen = await makeCanteen({ name: 'Central Canteen' });
    const student = await makeUser('student');

    // Create 1 available and 1 unavailable item
    const item1 = await makeMenuItem(canteen.id, { name: 'Veg Sandwich', available: true, pricePaise: 4500 });
    const item2 = await makeMenuItem(canteen.id, { name: 'Cold Coffee', available: false, pricePaise: 4000 });

    const res = await app.get(`/api/v1/canteens/${canteen.id}/menu`).set(bearer(student));
    expect(res.status).toBe(200);
    expect(res.body.data.canteen.id).toBe(canteen.id);
    expect(res.body.data.canteen.name).toBe('Central Canteen');
    expect(res.body.data.canteen.isOpen).toBe(true);

    const items = res.body.data.items;
    expect(items.length).toBe(2);

    const coldCoffee = items.find((i: any) => i.id === item2.id);
    expect(coldCoffee).toBeDefined();
    expect(coldCoffee.isAvailable).toBe(false);
    expect(coldCoffee.pricePaise).toBe(4000);

    const vegSandwich = items.find((i: any) => i.id === item1.id);
    expect(vegSandwich).toBeDefined();
    expect(vegSandwich.isAvailable).toBe(true);
    expect(vegSandwich.pricePaise).toBe(4500);

    // Unknown canteen -> 404
    const unknownRes = await app
      .get('/api/v1/canteens/00000000-0000-0000-0000-000000000000/menu')
      .set(bearer(student));
    expect(unknownRes.status).toBe(404);
    expect(unknownRes.body.error.code).toBe('NOT_FOUND');
  });

  // 2. Staff create/patch/toggle works for their canteen; the same call on another canteen's item is 404
  it('2. Staff CRUD operations work for own canteen and return 404 for other canteen items', async () => {
    const canteenA = await makeCanteen({ name: 'Canteen A' });
    const canteenB = await makeCanteen({ name: 'Canteen B' });

    const staffA = await makeUser('staff', { canteenId: canteenA.id });
    const staffB = await makeUser('staff', { canteenId: canteenB.id });

    // Staff A creates an item
    const createRes = await app
      .post('/api/v1/staff/menu')
      .set(bearer(staffA))
      .send({
        name: 'Masala Dosa',
        pricePaise: 7000,
        category: 'South Indian',
        isAvailable: true,
        prep: {
          basePrepSeconds: 360,
          complexityWeight: 1.4,
          cookingStation: 'griddle',
          batchable: false,
        },
      });
    expect(createRes.status).toBe(201);
    expect(createRes.body.data.name).toBe('Masala Dosa');
    expect(createRes.body.data.canteenId).toBe(canteenA.id);
    expect(createRes.body.data.prep.cookingStation).toBe('griddle');
    const itemId = createRes.body.data.id;

    // Staff A patches price
    const patchRes = await app
      .patch(`/api/v1/staff/menu/${itemId}`)
      .set(bearer(staffA))
      .send({ pricePaise: 7500 });
    expect(patchRes.status).toBe(200);
    expect(patchRes.body.data.pricePaise).toBe(7500);

    // Staff A toggles availability
    const toggleRes = await app
      .patch(`/api/v1/staff/menu/${itemId}/availability`)
      .set(bearer(staffA))
      .send({ isAvailable: false });
    expect(toggleRes.status).toBe(200);
    expect(toggleRes.body.data.isAvailable).toBe(false);

    // Staff B attempts to patch Staff A's item -> 404 NOT_FOUND
    const foreignPatch = await app
      .patch(`/api/v1/staff/menu/${itemId}`)
      .set(bearer(staffB))
      .send({ pricePaise: 8000 });
    expect(foreignPatch.status).toBe(404);
    expect(foreignPatch.body.error.code).toBe('NOT_FOUND');

    // Staff B attempts to toggle Staff A's item -> 404 NOT_FOUND
    const foreignToggle = await app
      .patch(`/api/v1/staff/menu/${itemId}/availability`)
      .set(bearer(staffB))
      .send({ isAvailable: true });
    expect(foreignToggle.status).toBe(404);
    expect(foreignToggle.body.error.code).toBe('NOT_FOUND');

    // GET /staff/menu lists items for that canteen
    const listRes = await app.get('/api/v1/staff/menu').set(bearer(staffA));
    expect(listRes.status).toBe(200);
    expect(listRes.body.data.length).toBe(1);
    expect(listRes.body.data[0].id).toBe(itemId);
  });

  // 3. Student or admin calling /staff/* gets 403
  it('3. Student and Admin get 403 FORBIDDEN on /staff/* routes', async () => {
    const student = await makeUser('student');
    const admin = await makeUser('admin');

    // Student calls staff routes
    const s1 = await app.get('/api/v1/staff/menu').set(bearer(student));
    expect(s1.status).toBe(403);
    expect(s1.body.error.code).toBe('FORBIDDEN');

    const s2 = await app.post('/api/v1/staff/menu').set(bearer(student)).send({ name: 'Test' });
    expect(s2.status).toBe(403);
    expect(s2.body.error.code).toBe('FORBIDDEN');

    // Admin calls staff routes (scoped strictly to staff)
    const a1 = await app.get('/api/v1/staff/menu').set(bearer(admin));
    expect(a1.status).toBe(403);
    expect(a1.body.error.code).toBe('FORBIDDEN');

    const a2 = await app.patch('/api/v1/staff/canteen/open').set(bearer(admin)).send({ isOpen: false });
    expect(a2.status).toBe(403);
    expect(a2.body.error.code).toBe('FORBIDDEN');
  });

  // 4. Audit rows: one per changed field with correct old/new values; a no-op patch writes none
  it('4. Audit rows record exact field diffs; no-op patch writes no audit rows', async () => {
    const canteen = await makeCanteen();
    const staff = await makeUser('staff', { canteenId: canteen.id });

    // Create item
    const createRes = await app
      .post('/api/v1/staff/menu')
      .set(bearer(staff))
      .send({
        name: 'Samosa',
        pricePaise: 1500,
        category: 'Snacks',
      });
    const itemId = createRes.body.data.id;

    // Check creation audit log
    const logs1 = await prisma.menuAuditLog.findMany({ where: { menuItemId: itemId } });
    expect(logs1.length).toBe(1);
    expect(logs1[0].field).toBe('created');
    expect(logs1[0].oldValue).toBeNull();
    expect(logs1[0].newValue).toBe('Samosa');

    // Patch 2 fields: name and price
    await app
      .patch(`/api/v1/staff/menu/${itemId}`)
      .set(bearer(staff))
      .send({
        name: 'Special Samosa',
        pricePaise: 2000,
      });

    const logs2 = await prisma.menuAuditLog.findMany({ where: { menuItemId: itemId } });
    expect(logs2.length).toBe(3); // 1 creation + 2 updates

    const nameLog = logs2.find((l) => l.field === 'name');
    expect(nameLog).toBeDefined();
    expect(nameLog!.oldValue).toBe('Samosa');
    expect(nameLog!.newValue).toBe('Special Samosa');

    const priceLog = logs2.find((l) => l.field === 'price');
    expect(priceLog).toBeDefined();
    expect(priceLog!.oldValue).toBe('1500');
    expect(priceLog!.newValue).toBe('2000');

    // No-op patch
    await app
      .patch(`/api/v1/staff/menu/${itemId}`)
      .set(bearer(staff))
      .send({
        name: 'Special Samosa',
        pricePaise: 2000,
      });

    const logs3 = await prisma.menuAuditLog.findMany({ where: { menuItemId: itemId } });
    expect(logs3.length).toBe(3); // Unchanged!
  });

  // 5. Validation: negative price, price above limit, empty name, unknown extra field all return 400
  it('5. Input validation rejects invalid payloads with 400 VALIDATION_ERROR', async () => {
    const canteen = await makeCanteen();
    const staff = await makeUser('staff', { canteenId: canteen.id });

    // Empty name
    const r1 = await app
      .post('/api/v1/staff/menu')
      .set(bearer(staff))
      .send({ name: '', pricePaise: 1500, category: 'Snacks' });
    expect(r1.status).toBe(400);
    expect(r1.body.error.code).toBe('VALIDATION_ERROR');

    // Negative price
    const r2 = await app
      .post('/api/v1/staff/menu')
      .set(bearer(staff))
      .send({ name: 'Tea', pricePaise: -500, category: 'Beverages' });
    expect(r2.status).toBe(400);
    expect(r2.body.error.code).toBe('VALIDATION_ERROR');

    // Price above limit (1,000,000 paise)
    const r3 = await app
      .post('/api/v1/staff/menu')
      .set(bearer(staff))
      .send({ name: 'Gold Tea', pricePaise: 2000000, category: 'Beverages' });
    expect(r3.status).toBe(400);
    expect(r3.body.error.code).toBe('VALIDATION_ERROR');

    // Unknown field (strict check)
    const r4 = await app
      .post('/api/v1/staff/menu')
      .set(bearer(staff))
      .send({ name: 'Coffee', pricePaise: 2000, category: 'Beverages', extraField: 'hack' });
    expect(r4.status).toBe(400);
    expect(r4.body.error.code).toBe('VALIDATION_ERROR');
  });

  // 6. Emits: defaultRecorder.calls contains menu:updated for both menu and canteen targets with right ids; none when request fails
  it('6. Emits menu:updated to both menu and canteen rooms, none on failed requests', async () => {
    const canteen = await makeCanteen();
    const staff = await makeUser('staff', { canteenId: canteen.id });

    const item = await makeMenuItem(canteen.id, { name: 'Burger', pricePaise: 5000 });

    defaultRecorder.clear();

    // Successful patch
    const patchRes = await app
      .patch(`/api/v1/staff/menu/${item.id}`)
      .set(bearer(staff))
      .send({ pricePaise: 5500 });
    expect(patchRes.status).toBe(200);

    // Expect emits to both rooms
    const menuRoomEmit = defaultRecorder.calls.find(
      (c) => c.target === 'menu' && c.id === canteen.id && c.event === 'menu:updated',
    );
    expect(menuRoomEmit).toBeDefined();
    expect((menuRoomEmit!.payload as any).itemId).toBe(item.id);
    expect((menuRoomEmit!.payload as any).changes.price).toBe('5500');

    const canteenRoomEmit = defaultRecorder.calls.find(
      (c) => c.target === 'canteen' && c.id === canteen.id && c.event === 'menu:updated',
    );
    expect(canteenRoomEmit).toBeDefined();

    // Failed request should NOT emit
    defaultRecorder.clear();
    await app
      .patch(`/api/v1/staff/menu/${item.id}`)
      .set(bearer(staff))
      .send({ pricePaise: -100 }); // validation error
    expect(defaultRecorder.calls.length).toBe(0);
  });

  // 7. PATCH /staff/canteen/open changes only is_open and emits canteen:status_changed
  it('7. PATCH /staff/canteen/open updates is_open only and emits canteen:status_changed', async () => {
    const canteen = await makeCanteen({ name: 'Hostel Cafe', isOpen: true });
    const staff = await makeUser('staff', { canteenId: canteen.id });

    defaultRecorder.clear();

    const res = await app
      .patch('/api/v1/staff/canteen/open')
      .set(bearer(staff))
      .send({ isOpen: false });

    expect(res.status).toBe(200);
    expect(res.body.data.canteenId).toBe(canteen.id);
    expect(res.body.data.isOpen).toBe(false);

    // DB verification
    const dbCanteen = await prisma.canteen.findUnique({ where: { id: canteen.id } });
    expect(dbCanteen!.isOpen).toBe(false);
    expect(dbCanteen!.name).toBe('Hostel Cafe'); // name intact

    // Socket verification
    const menuEmit = defaultRecorder.calls.find(
      (c) => c.target === 'menu' && c.id === canteen.id && c.event === 'canteen:status_changed',
    );
    expect(menuEmit).toBeDefined();
    expect((menuEmit!.payload as any).isOpen).toBe(false);

    const canteenEmit = defaultRecorder.calls.find(
      (c) => c.target === 'canteen' && c.id === canteen.id && c.event === 'canteen:status_changed',
    );
    expect(canteenEmit).toBeDefined();
  });

  // 8. Analytics: only completed orders count; byHour has 24 entries; topItems sorted by quantity; another canteen's orders excluded
  it('8. Analytics summary aggregates only completed orders for the staff canteen with 24 hours', async () => {
    const canteenA = await makeCanteen();
    const canteenB = await makeCanteen();

    const staffA = await makeUser('staff', { canteenId: canteenA.id });
    const student = await makeUser('student');

    const itemA1 = await makeMenuItem(canteenA.id, { name: 'Samosa', pricePaise: 1500 });
    const itemA2 = await makeMenuItem(canteenA.id, { name: 'Chai', pricePaise: 1000 });
    const itemB = await makeMenuItem(canteenB.id, { name: 'Foreign Burger', pricePaise: 5000 });

    const now = new Date();

    // 1. Canteen A completed order 1 (2 Samosa, 1 Chai)
    await makeOrder({
      studentId: student.id,
      canteenId: canteenA.id,
      status: 'completed',
      totalPaise: 4000,
      placedAt: now,
      items: [
        { menuItemId: itemA1.id, quantity: 2, pricePaise: 1500 },
        { menuItemId: itemA2.id, quantity: 1, pricePaise: 1000 },
      ],
    });

    // 2. Canteen A completed order 2 (3 Samosa)
    await makeOrder({
      studentId: student.id,
      canteenId: canteenA.id,
      status: 'completed',
      totalPaise: 4500,
      placedAt: now,
      items: [{ menuItemId: itemA1.id, quantity: 3, pricePaise: 1500 }],
    });

    // 3. Canteen A placed order (NOT completed -> should not count)
    await makeOrder({
      studentId: student.id,
      canteenId: canteenA.id,
      status: 'placed',
      totalPaise: 10000,
      placedAt: now,
      items: [{ menuItemId: itemA1.id, quantity: 5, pricePaise: 1500 }],
    });

    // 4. Canteen A cancelled order (NOT completed -> should not count)
    await makeOrder({
      studentId: student.id,
      canteenId: canteenA.id,
      status: 'cancelled',
      totalPaise: 20000,
      placedAt: now,
      items: [{ menuItemId: itemA1.id, quantity: 10, pricePaise: 1500 }],
    });

    // 5. Canteen B completed order (different canteen -> should not count)
    await makeOrder({
      studentId: student.id,
      canteenId: canteenB.id,
      status: 'completed',
      totalPaise: 5000,
      placedAt: now,
      items: [{ menuItemId: itemB.id, quantity: 1, pricePaise: 5000 }],
    });

    const res = await app.get('/api/v1/staff/analytics/summary?days=7').set(bearer(staffA));
    expect(res.status).toBe(200);

    const data = res.body.data;
    expect(data.days).toBe(7);
    expect(data.totals.orders).toBe(2);
    expect(data.totals.revenuePaise).toBe(8500);

    // byHour has 24 entries
    expect(data.byHour.length).toBe(24);
    for (let h = 0; h < 24; h++) {
      expect(data.byHour[h].hour).toBe(h);
    }

    // byDay has 7 entries
    expect(data.byDay.length).toBe(7);

    // topItems sorted by quantity
    expect(data.topItems.length).toBe(2);
    expect(data.topItems[0].menuItemId).toBe(itemA1.id);
    expect(data.topItems[0].name).toBe('Samosa');
    expect(data.topItems[0].quantity).toBe(5); // 2 + 3
    expect(data.topItems[0].revenuePaise).toBe(7500);

    expect(data.topItems[1].menuItemId).toBe(itemA2.id);
    expect(data.topItems[1].name).toBe('Chai');
    expect(data.topItems[1].quantity).toBe(1);
    expect(data.topItems[1].revenuePaise).toBe(1000);
  });

  // 9. Seed runs twice with no duplicate items
  it('9. Seed 02-catalog runs twice idempotently without duplicating items', async () => {
    // Run seed twice
    await seedCatalog();
    await seedCatalog();

    // Verify 5 canteens each have exactly 12 items
    const canteens = await prisma.canteen.findMany();
    expect(canteens.length).toBe(5);

    for (const c of canteens) {
      const items = await prisma.menuItem.findMany({ where: { canteenId: c.id } });
      expect(items.length).toBe(12);

      const prepRows = await prisma.menuItemPrepMetadata.findMany({
        where: { menuItem: { canteenId: c.id } },
      });
      expect(prepRows.length).toBe(12);
    }
  });
});
