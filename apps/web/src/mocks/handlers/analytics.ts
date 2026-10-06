import { http, HttpResponse, delay } from 'msw';
import { mockFlags } from '../flags';
import {
  combos, etaAccuracy, forecast, kpis, menuMatrix, peakHours, topDishes,
} from '../fixtures/analyticsData';
import type { AnalyticsRange } from '@/types/admin';

const read = (url: string) => {
  const p = new URL(url).searchParams;
  return {
    canteenId: p.get('canteenId') ?? undefined,
    range: (p.get('range') as AnalyticsRange | null) ?? 'today',
  };
};

const mlDown = () =>
  HttpResponse.json(
    { error: { code: 'ML_UNAVAILABLE', message: 'The prediction service is offline. Try again in a few minutes.' } },
    { status: 503 }
  );

export const analyticsHandlers = [
  http.get('*/analytics/kpis', async ({ request }) => {
    await delay(200);
    const { canteenId, range } = read(request.url);
    return HttpResponse.json(kpis(range, canteenId));
  }),
  http.get('*/analytics/peak-hours', async ({ request }) => {
    await delay(250);
    const { canteenId, range } = read(request.url);
    return HttpResponse.json(peakHours(range, canteenId));
  }),
  http.get('*/analytics/top-dishes', async ({ request }) => {
    await delay(300);
    const { canteenId, range } = read(request.url);
    return HttpResponse.json(topDishes(range, canteenId));
  }),
  http.get('*/analytics/forecast', async ({ request }) => {
    await delay(350);
    if (mockFlags.mlOffline) return mlDown();
    return HttpResponse.json(forecast(read(request.url).canteenId));
  }),
  http.get('*/analytics/menu-matrix', async ({ request }) => {
    await delay(350);
    if (mockFlags.mlOffline) return mlDown();
    return HttpResponse.json(menuMatrix(read(request.url).canteenId));
  }),
  http.get('*/analytics/combos', async () => {
    await delay(250);
    return HttpResponse.json(combos());
  }),
  http.get('*/analytics/eta-accuracy', async ({ request }) => {
    await delay(300);
    return HttpResponse.json(etaAccuracy(read(request.url).canteenId));
  }),
];