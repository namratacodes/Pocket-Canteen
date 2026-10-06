import { http, HttpResponse, delay, passthrough } from 'msw';
import { mockUsers } from '../db';
import { mockFlags } from '../flags';
import {
  SEPT, SEPT_FLOATING, makeEntries, mockCanteens, mockStaff, septRows,
} from '../fixtures/adminData';
import type { AdminCanteen, CreateCanteenInput, CreateStaffInput, SettlementReport } from '@/types/admin';

const err = (status: number, code: string, message: string) =>
  HttpResponse.json({ error: { code, message } }, { status });

const withStaffCount = (c: (typeof mockCanteens)[number]): AdminCanteen => ({
  ...c,
  stats: { ...c.stats, staffCount: mockStaff.filter((s) => s.canteenId === c.id).length },
});

const tempPassword = () => {
  const pick = (chars: string, n: number) =>
    Array.from({ length: n }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `${pick('ABCDEFGHJKLMNPQRSTUVWXYZ', 1)}${pick('23456789', 1)}${pick('abcdefghijkmnpqrstuvwxyz', 1)}${pick('#$@!', 1)}${pick('abcdefghijkmnpqrstuvwxyz23456789', 4)}`;
};

export const adminHandlers = [
  http.get('*/admin/overview', async () => {
    await delay(200);
    const canteens = mockCanteens.map(withStaffCount);
    const unbalanced = mockFlags.unbalanced ? 500 : 0;
    return HttpResponse.json({
      activeCanteens: canteens.length,
      ordersToday: canteens.reduce((s, c) => s + c.stats.ordersToday, 0),
      gmvToday: canteens.reduce((s, c) => s + c.stats.gmvToday, 0),
      floatingCredit: SEPT_FLOATING + unbalanced,
      pendingSettlements: septRows.filter((r) => r.status === 'pending').length,
      alerts: [
        { id: 'al_1', level: 'warn', message: 'Order A-09 at Main Canteen is locked after 5 failed pickup-code attempts.', at: new Date(Date.now() - 20 * 60_000).toISOString() },
        ...canteens
          .filter((c) => c.payment.kycStatus === 'pending')
          .map((c) => ({ id: `kyc_${c.id}`, level: 'warn' as const, message: `${c.name} KYC is still pending.`, at: new Date(Date.now() - 3 * 3600_000).toISOString() })),
      ],
    });
  }),

  http.get('*/admin/canteens', async () => {
    await delay(200);
    return HttpResponse.json(mockCanteens.map(withStaffCount));
  }),

  http.get('*/admin/canteens/:id', async ({ params, request }) => {
    // Vite also serves /src/features/admin/canteens/*.tsx. Never mock those.
    if (new URL(request.url).pathname.startsWith('/src/')) return passthrough();
    await delay(150);
    const c = mockCanteens.find((x) => x.id === params.id);
    return c ? HttpResponse.json(withStaffCount(c)) : err(404, 'NOT_FOUND', 'Canteen not found.');
  }),

  http.post('*/admin/canteens', async ({ request }) => {
    const body = (await request.json()) as CreateCanteenInput;
    if (mockCanteens.some((c) => c.fssaiLicenseNo === body.fssaiLicenseNo)) {
      return err(409, 'DUPLICATE_FSSAI', 'A canteen with this FSSAI licence number already exists.');
    }
    const slug = body.name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
    const created = {
      ...body,
      id: `canteen_${slug}_${Date.now().toString(36)}`,
      isOpen: false,
      stats: { ordersToday: 0, gmvToday: 0, activeOrders: 0 },
      createdAt: new Date().toISOString(),
    };
    mockCanteens.push(created);
    await delay(300);
    return HttpResponse.json(withStaffCount(created), { status: 201 });
  }),

  http.patch('*/admin/canteens/:id', async ({ params, request }) => {
    const idx = mockCanteens.findIndex((x) => x.id === params.id);
    if (idx < 0) return err(404, 'NOT_FOUND', 'Canteen not found.');
    const patch = (await request.json()) as Partial<CreateCanteenInput>;
    if (patch.fssaiLicenseNo && mockCanteens.some((c, i) => i !== idx && c.fssaiLicenseNo === patch.fssaiLicenseNo)) {
      return err(409, 'DUPLICATE_FSSAI', 'A canteen with this FSSAI licence number already exists.');
    }
    const { payment, ...rest } = patch;
    mockCanteens[idx] = { ...mockCanteens[idx], ...rest, payment: { ...mockCanteens[idx].payment, ...payment } };
    await delay(250);
    return HttpResponse.json(withStaffCount(mockCanteens[idx]));
  }),

  http.get('*/admin/staff', async ({ request }) => {
    await delay(200);
    const canteenId = new URL(request.url).searchParams.get('canteenId');
    return HttpResponse.json(mockStaff.filter((s) => !canteenId || s.canteenId === canteenId));
  }),

  // Creating staff also registers a login, so "admin creates staff -> staff signs in" works in mock mode.
  http.post('*/admin/staff', async ({ request }) => {
    const body = (await request.json()) as CreateStaffInput;
    const email = body.email.trim().toLowerCase();
    if (mockStaff.some((s) => s.email.toLowerCase() === email) || mockUsers.some((u) => u.user.email?.toLowerCase() === email)) {
      return err(409, 'EMAIL_EXISTS', 'A staff account with this email already exists.');
    }
    const canteen = mockCanteens.find((c) => c.id === body.canteenId);
    if (!canteen) return err(400, 'INVALID_CANTEEN', 'Choose a valid canteen.');
    const password = tempPassword();
    const staff = {
      id: `stf_${Date.now()}`, name: body.name, email, phone: body.phone,
      canteenId: canteen.id, canteenName: canteen.name, status: 'active' as const,
      createdAt: new Date().toISOString(),
    };
    mockStaff.push(staff);
    mockUsers.push({
      user: {
        id: `usr_${staff.id}`, name: body.name, phone: `+91${body.phone}`, email, role: 'staff',
        canteenId: canteen.id, canteenName: canteen.name, mustChangePassword: true,
      },
      secret: password,
    });
    await delay(300);
    return HttpResponse.json({ staff, tempPassword: password }, { status: 201 });
  }),

  http.post('*/admin/staff/:id/reset-password', async ({ params }) => {
    const s = mockStaff.find((x) => x.id === params.id);
    if (!s) return err(404, 'NOT_FOUND', 'Staff account not found.');
    const password = tempPassword();
    const u = mockUsers.find((x) => x.user.email?.toLowerCase() === s.email.toLowerCase());
    if (u) {
      u.secret = password;
      u.user.mustChangePassword = true;
    }
    await delay(250);
    return HttpResponse.json({ tempPassword: password });
  }),

  http.patch('*/admin/staff/:id', async ({ params, request }) => {
    const s = mockStaff.find((x) => x.id === params.id);
    if (!s) return err(404, 'NOT_FOUND', 'Staff account not found.');
    const { status } = (await request.json()) as { status: 'active' | 'disabled' };
    s.status = status;
    const u = mockUsers.find((x) => x.user.email?.toLowerCase() === s.email.toLowerCase());
    if (u) u.isDisabled = status === 'disabled';
    await delay(200);
    return HttpResponse.json(s);
  }),

  http.get('*/admin/settlements', async ({ request }) => {
    await delay(250);
    const period = new URL(request.url).searchParams.get('period') ?? SEPT;
    let report: SettlementReport;
    if (period === SEPT) {
      report = { period, rows: septRows.map((r) => ({ ...r })), floatingCredit: SEPT_FLOATING + (mockFlags.unbalanced ? 500 : 0) };
    } else if (period > SEPT) {
      report = { period, rows: [], floatingCredit: 0 }; // current/future month: nothing to settle yet
    } else {
      // Older months: same shape, already settled and balanced.
      report = {
        period,
        rows: septRows.map((r) => ({
          ...r, id: r.id.replace(SEPT, period), status: 'settled' as const,
          settledAt: `${period}-28T10:00:00Z`, recordedBy: 'Admin',
        })),
        floatingCredit: SEPT_FLOATING,
      };
    }
    return HttpResponse.json(report);
  }),

  http.get('*/admin/settlements/:id/entries', async ({ params }) => {
    await delay(200);
    const id = String(params.id);
    const row = septRows.find((r) => id.endsWith(r.canteenId));
    if (!row) return err(404, 'NOT_FOUND', 'Settlement not found.');
    return HttpResponse.json(makeEntries(id, row.creditIssued, row.creditRedeemed));
  }),

  http.post('*/admin/settlements/:id/settle', async ({ params }) => {
    const row = septRows.find((r) => r.id === params.id);
    if (!row) return err(404, 'NOT_FOUND', 'Settlement not found.');
    row.status = 'settled';
    row.settledAt = new Date().toISOString();
    row.recordedBy = 'Admin';
    await delay(250);
    return HttpResponse.json(row);
  }),
];