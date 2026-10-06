import { http, HttpResponse } from 'msw';
import canteensData from '../fixtures/canteens.json';
import type { Canteen } from '@/types';

// In-memory canteens state allowing live mutations
export let mockCanteens: Canteen[] = JSON.parse(JSON.stringify(canteensData));

export const resetMockCanteens = () => {
  mockCanteens = JSON.parse(JSON.stringify(canteensData));
};

export const canteensHandlers = [
  http.get('*/canteens', () => {
    return HttpResponse.json(mockCanteens);
  }),

  http.get('*/canteens/:id', ({ params }) => {
    const { id } = params;
    const canteen = mockCanteens.find((c) => c.id === id);

    if (!canteen) {
      return HttpResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Canteen not found' } },
        { status: 404 }
      );
    }

    return HttpResponse.json(canteen);
  }),
];
