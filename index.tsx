import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { Portality } from './components/Portality';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// PWA: register service worker in production builds
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  // Vite replaces import.meta.env.PROD at build time
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  if (import.meta?.env?.PROD) {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // ignore
    });
  }
}

const root = ReactDOM.createRoot(rootElement);
const pathname = typeof window !== 'undefined' ? window.location.pathname : '/';
const isPortality = pathname === '/portality' || pathname.startsWith('/portality/');
root.render(
  <React.StrictMode>
    {isPortality ? <Portality /> : <App />}
  </React.StrictMode>
);