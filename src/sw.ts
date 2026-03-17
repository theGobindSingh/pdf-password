/// <reference lib="webworker" />
import { clientsClaim } from 'workbox-core';
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';
import { NetworkFirst, StaleWhileRevalidate } from 'workbox-strategies';

declare let self: ServiceWorkerGlobalScope;

// Take control of all clients immediately on activation
self.skipWaiting();
clientsClaim();

// Precache all Vite-generated assets (manifest injected by vite-plugin-pwa)
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// ── Runtime caching ───────────────────────────────────────────────────────────
// Navigation requests: network-first, falls back to the precached app shell
registerRoute(
  new NavigationRoute(new NetworkFirst({ cacheName: 'navigation' })),
);

// JS/CSS assets: serve from cache immediately, update in the background
registerRoute(
  ({ request }) =>
    request.destination === 'script' || request.destination === 'style',
  new StaleWhileRevalidate({ cacheName: 'assets' }),
);

// ── Share Target handler ──────────────────────────────────────────────────────
// When the user shares a PDF to this app from the Android share sheet, the
// browser POSTs the file to /share-target.  We pluck it out, persist it in
// IndexedDB, then redirect to the main page so the app can pick it up.
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.pathname === '/share-target' && event.request.method === 'POST') {
    event.respondWith(handleShareTarget(event.request));
  }
});

async function handleShareTarget(request: Request): Promise<Response> {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    if (file instanceof File && file.size > 0) {
      await storeSharedFile(file);
    }
  } catch (err) {
    console.error('[SW] Failed to handle share target:', err);
  }
  return new Response(null, {
    status: 303,
    headers: { Location: '/?shared=1' },
  });
}

// ── IndexedDB helpers ─────────────────────────────────────────────────────────
const DB_NAME = 'pdf-unlocker-shared';
const DB_VERSION = 1;
const STORE_NAME = 'files';

function openSharedFilesDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    req.onsuccess = (e) => resolve((e.target as IDBOpenDBRequest).result);
    req.onerror = () => reject(req.error);
  });
}

async function storeSharedFile(file: File): Promise<void> {
  const db = await openSharedFilesDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put({
      id: crypto.randomUUID(),
      file,
      timestamp: Date.now(),
    });
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}
