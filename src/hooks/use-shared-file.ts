import { useEffect, useState } from 'react';

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

async function consumeSharedFile(): Promise<File | null> {
  const db = await openSharedFilesDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const getReq = store.get('pending');
    getReq.onsuccess = () => {
      const record = getReq.result as { id: string; file: File } | undefined;
      if (record?.file) {
        store.delete('pending');
        resolve(record.file);
      } else {
        resolve(null);
      }
    };
    getReq.onerror = () => reject(getReq.error);
  });
}

/**
 * On mount, checks IndexedDB for a PDF that was shared into the app via the
 * Web Share Target API.  Returns the File once and removes it from the store
 * so subsequent renders don't re-trigger the check.
 */
export function useSharedFile(): File | null {
  const [sharedFile, setSharedFile] = useState<File | null>(null);

  useEffect(() => {
    // Only check when the service worker set ?shared=1 in the URL
    const urlHasShared =
      typeof window !== 'undefined' &&
      new URLSearchParams(window.location.search).has('shared');

    if (!urlHasShared) return;

    consumeSharedFile()
      .then((file) => {
        if (file) {
          setSharedFile(file);
          // Remove the query param without a full navigation
          const url = new URL(window.location.href);
          url.searchParams.delete('shared');
          window.history.replaceState({}, '', url.toString());
        }
      })
      .catch(() => {
        // IndexedDB unavailable — silently ignore
      });
  }, []);

  return sharedFile;
}
