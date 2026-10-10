import { HttpResponse, http } from 'msw';
import { ensureKitchenSimulator } from '../kitchenSimulator';
import * as db from '../kitchenDb';

// Cover both common error body shapes so the api client can read either one.
const fail = (e: unknown) => {
  if (e instanceof db.MockError) {
    const body = { code: e.code, message: e.code, details: e.details };
    return HttpResponse.json({ ...body, error: body }, { status: e.status });
  }
  throw e;
};

// Returning undefined falls through to the next handler (student orders keep working).
export const kitchenHandlers = [
  http.get('*/kitchen/orders', () => { ensureKitchenSimulator(); return HttpResponse.json(db.listOrders()); }),
  http.get('*/kitchen/summary', () => HttpResponse.json(db.summary())),
  http.get('*/kitchen/menu', () => HttpResponse.json(db.listMenu())),

  http.patch('*/orders/:id/status', async ({ params, request }) => {
    const id = String(params.id);
    if (!db.hasOrder(id)) return undefined;
    const { to } = (await request.json()) as { to: 'preparing' | 'ready' };
    try { return HttpResponse.json(db.moveOrder(id, to)); } catch (e) { return fail(e); }
  }),
  http.post('*/orders/:id/verify-pickup', async ({ params, request }) => {
    const id = String(params.id);
    if (!db.hasOrder(id)) return undefined;
    const { code } = (await request.json()) as { code: string };
    try { return HttpResponse.json(db.verifyPickup(id, code)); } catch (e) { return fail(e); }
  }),
  http.post('*/orders/:id/override-pickup', async ({ params, request }) => {
    const id = String(params.id);
    if (!db.hasOrder(id)) return undefined;
    const { managerPin } = (await request.json()) as { managerPin: string };
    try { return HttpResponse.json(db.overridePickup(id, managerPin)); } catch (e) { return fail(e); }
  }),
  http.post('*/orders/:id/cancel', ({ params }) => {
    const id = String(params.id);
    if (!db.hasOrder(id)) return undefined;
    try { return HttpResponse.json(db.cancelOrder(id)); } catch (e) { return fail(e); }
  }),
  http.patch('*/menu-items/:id', async ({ params, request }) => {
    const id = String(params.id);
    if (!db.hasMenuItem(id)) return undefined;
    const { isAvailable } = (await request.json()) as { isAvailable: boolean };
    try { return HttpResponse.json(db.setAvailability(id, isAvailable)); } catch (e) { return fail(e); }
  }),
  http.patch('*/canteens/me', async ({ request }) => {
    const { isOpen } = (await request.json()) as { isOpen: boolean };
    return HttpResponse.json(db.setOpen(isOpen));
  }),
];