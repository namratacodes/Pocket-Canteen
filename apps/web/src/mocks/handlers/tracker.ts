import { HttpResponse, http } from 'msw';
import { SIM_ID } from '../trackerDb';
import * as db from '../trackerDb';
import { MockError } from '../kitchenDb';
import { ensureSim, startTimeline } from '../trackerSimulator';
import { studentBus } from '@/features/student/tracker/studentBus';

const fail = (e: unknown) => {
  if (e instanceof MockError) {
    const body = { code: e.code, message: e.code, details: e.details };
    return HttpResponse.json({ ...body, error: body }, { status: e.status });
  }
  throw e;
};

// Returning undefined falls through to the next handler, so other orders keep working.
export const trackerHandlers = [
  http.get('*/time', () => HttpResponse.json({ now: new Date().toISOString() })),

  http.get('*/orders/:id', ({ params }) => {
    if (String(params.id) !== SIM_ID) return undefined;
    ensureSim();
    return HttpResponse.json(db.getSim());
  }),

  http.get('*/orders', ({ request }) => {
    const u = new URL(request.url);
    const scope = u.searchParams.get('scope');
    if (scope === 'active') return HttpResponse.json(db.listActive());
    if (scope === 'past') return HttpResponse.json(db.listPast(u.searchParams.get('cursor')));
    return undefined;
  }),

  http.post('*/orders/:id/cancel', ({ params }) => {
    if (String(params.id) !== SIM_ID) return undefined;
    try {
      const r = db.studentCancel(SIM_ID);
      studentBus.emit('wallet:updated', db.getWallet());
      return HttpResponse.json(r);
    } catch (e) { return fail(e); }
  }),

  http.post('*/orders/:id/payment/retry', ({ params }) => {
    if (String(params.id) !== SIM_ID) return undefined;
    try {
      const r = db.retryPayment(SIM_ID);
      startTimeline();
      return HttpResponse.json({ razorpay: r.razorpay });
    } catch (e) { return fail(e); }
  }),

  http.post('*/orders/:id/pickup-code/resend', ({ params }) => {
    if (String(params.id) !== SIM_ID) return undefined;
    try { return HttpResponse.json(db.resendCode(SIM_ID)); } catch (e) { return fail(e); }
  }),

  http.get('*/wallet/ledger', ({ request }) => {
    const u = new URL(request.url);
    return HttpResponse.json(db.listLedger(u.searchParams.get('type'), u.searchParams.get('cursor')));
  }),
  http.get('*/wallet', () => HttpResponse.json(db.getWallet())),
];