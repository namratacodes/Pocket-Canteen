import { http, passthrough } from 'msw';

/**
 * The dev server hands out source files from URLs like /src/features/student/canteens/CanteenCard.tsx.
 * Mock API handlers whose paths end in "/canteens/:id" or "/orders/:id" would otherwise answer those
 * requests with JSON or a 404, and the page fails with "Failed to fetch dynamically imported module".
 */
export const viteSourceGuard = http.all('*', ({ request }) => {
  const { pathname } = new URL(request.url);
  if (pathname.startsWith('/src/') || pathname.startsWith('/node_modules/') || pathname.startsWith('/@')) {
    return passthrough();
  }
  return undefined;
});
