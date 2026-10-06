// Dev toggles for demos. In the browser console, type:
//   pcMock.mlOffline = true     -> forecast + menu matrix return 503
//   pcMock.unbalanced = true    -> settlements fail the conservation check
export const mockFlags = { mlOffline: false, unbalanced: false };

if (typeof window !== 'undefined') {
  (window as unknown as { pcMock: typeof mockFlags }).pcMock = mockFlags;
}