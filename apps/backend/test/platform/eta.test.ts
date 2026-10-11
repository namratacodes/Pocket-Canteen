import http from 'http';
import type { AddressInfo } from 'net';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { etaService } from '../../src/modules/platform/eta/eta.service';
import { mlBreaker } from '../../src/modules/platform/eta/breaker';
import { makeCanteen, makeMenuItem, makeOrder, makeUser, resetDb } from '../helpers';

let mode = 'ok';
let calls = 0;
let server: http.Server;

beforeAll(async () => {
  server = http.createServer((req, res) => {
    calls++;
    req.resume();
    req.on('end', () => {
      if (mode === 'slow') return void setTimeout(() => { res.setHeader('content-type', 'application/json'); res.end(JSON.stringify({ etaSeconds: 900 })); }, 250);
      if (mode === '500') { res.statusCode = 500; return void res.end('boom'); }
      if (mode === 'badjson') return void res.end('{not json');
      if (mode === 'zero') return void res.end(JSON.stringify({ etaSeconds: 0 }));
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify({ etaSeconds: 684, modelVersion: '2026-09-20' }));
    });
  });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
});
afterAll(async () => { await new Promise((r) => server.close(r)); delete process.env.ML_SERVICE_URL; });

let canteenId: string;
let item: { id: string };
beforeEach(async () => {
  await resetDb();
  mlBreaker.reset();
  mode = 'ok'; calls = 0;
  process.env.ML_SERVICE_URL = '';
  process.env.ML_TIMEOUT_MS = '50';
  const c = await makeCanteen();
  canteenId = c.id;
  item = await makeMenuItem(c.id, { basePrepSeconds: 120 });
});
const useMl = () => { process.env.ML_SERVICE_URL = `http://127.0.0.1:${(server.address() as AddressInfo).port}`; };
const cart = () => ({ canteenId, items: [{ menuItemId: item.id, quantity: 2 }] });

describe('EtaPort', () => {
  it('fallback formula without ML_SERVICE_URL', async () => {
    const s = await makeUser('student');
    for (const st of ['placed', 'preparing'] as const) {
      await makeOrder({ studentId: s.id, canteenId, status: st, items: [{ menuItemId: item.id, quantity: 1, pricePaise: 5000 }] });
    }
    await makeOrder({ studentId: s.id, canteenId, status: 'ready', items: [{ menuItemId: item.id, quantity: 1, pricePaise: 5000 }] });
    const r = await etaService.estimate(cart());
    expect(r).toEqual({ seconds: 2 * 120 + 120 * 2, source: 'fallback' });
  });

  it('uses ML when available', async () => {
    useMl();
    expect(await etaService.estimate(cart())).toEqual({ seconds: 684, source: 'ml', modelVersion: '2026-09-20' });
  });

  it.each(['slow', '500', 'badjson', 'zero'])('ML %s -> fallback, never throws, and is fast', async (m) => {
    useMl(); mode = m;
    const t0 = Date.now();
    const r = await etaService.estimate(cart());
    expect(r.source).toBe('fallback');
    expect(r.seconds).toBe(240);
    expect(Date.now() - t0).toBeLessThan(200);
  });

  it('breaker opens after 5 failures, then probes once after 15 s', async () => {
    useMl(); mode = '500';
    let t = 1_000_000;
    mlBreaker.now = () => t;
    for (let i = 0; i < 5; i++) await etaService.estimate(cart());
    expect(calls).toBe(5);
    await etaService.estimate(cart());
    await etaService.estimate(cart());
    expect(calls).toBe(5);
    t += 15_001; mode = 'ok';
    expect((await etaService.estimate(cart())).source).toBe('ml');
    expect(calls).toBe(6);
    expect((await etaService.estimate(cart())).source).toBe('ml');
    expect(calls).toBe(7);
  });

  it('never throws even when the database fails', async () => {
    const r = await etaService.estimate({ canteenId: 'not-a-uuid', items: [{ menuItemId: 'nope', quantity: 1 }] });
    expect(r.source).toBe('fallback');
    expect(r.seconds).toBeGreaterThanOrEqual(60);
  });
});
