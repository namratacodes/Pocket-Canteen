import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { HttpResponse, http } from 'msw';
import { setupServer } from 'msw/node';
import { viteSourceGuard } from '@/mocks/handlers/viteGuard';

// An API handler that is too greedy, like "*/canteens/:id" matching a source file path.
const greedy = http.get('*/canteens/:id', () => HttpResponse.json({ mocked: true }));
const server = setupServer(viteSourceGuard, greedy);

beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));
afterAll(() => server.close());

describe('viteSourceGuard', () => {
  it('still mocks real API calls', async () => {
    const res = await fetch('http://localhost:1/api/v1/canteens/c1');
    expect(await res.json()).toEqual({ mocked: true });
  });

  it.each([
    '/src/features/student/canteens/CanteenSelectorPage.tsx',
    '/node_modules/.vite/deps/react.js',
    '/@vite/client',
  ])('never answers dev-server request %s with a mock', async (p) => {
    // passthrough means "really fetch it": nothing listens on port 1, so the request fails
    // instead of receiving the mocked JSON.
    await expect(fetch(`http://localhost:1${p}`)).rejects.toThrow();
  });
});