import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { Providers } from './app/providers';
import { router } from './app/router';
import './styles/globals.css';
import { initPwa } from './pwa/initPwa';

async function initApp() {
  if (import.meta.env.VITE_USE_MOCKS === 'true') {
    const { worker } = await import('./mocks/browser');
    await worker.start({
      onUnhandledRequest: 'bypass',
      serviceWorker: {
        url: '/mockServiceWorker.js',
      },
    });
  }

  const rootElement = document.getElementById('root');
  if (!rootElement) {
    throw new Error('Failed to find root element');
  }

  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <Providers>
        <RouterProvider router={router} />
      </Providers>
    </React.StrictMode>
  );
}
initPwa();
initApp();
