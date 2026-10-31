/**
 * Audio Cache Service
 * IndexedDB offline storage for song snippets + CORS bypass proxy
 */

const DB_NAME = 'clipforge_offline_audio';
const STORE_NAME = 'cached_tracks';
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

function getDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB not supported'));
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'url' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return dbPromise;
}

export async function cacheAudioBlob(url: string, blob: Blob, metadata?: any): Promise<void> {
  try {
    const db = await getDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put({
      url,
      blob,
      metadata: metadata || {},
      cachedAt: Date.now()
    });
  } catch (err) {
    console.warn('[AudioCache] IndexedDB store failed:', err);
  }
}

export async function getCachedAudioBlob(url: string): Promise<Blob | null> {
  try {
    const db = await getDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(url);
      req.onsuccess = () => {
        if (req.result && req.result.blob) {
          resolve(req.result.blob);
        } else {
          resolve(null);
        }
      };
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

/**
 * Returns a fast local blob: URL if already in IndexedDB, or downloads via proxy,
 * caches it into IndexedDB, and returns the object URL.
 */
export async function getCachedOrFetchAudioUrl(url: string, metadata?: any): Promise<string> {
  if (!url) return '';
  if (url.startsWith('blob:') || url.startsWith('data:')) return url;

  // 1. Try local IndexedDB
  const cachedBlob = await getCachedAudioBlob(url);
  if (cachedBlob) {
    return URL.createObjectURL(cachedBlob);
  }

  // 2. Fetch from proxy to avoid CORS and store in IndexedDB
  const proxyUrl = `/api/music/proxy-audio?url=${encodeURIComponent(url)}`;
  try {
    const res = await fetch(proxyUrl);
    if (res.ok) {
      const blob = await res.blob();
      await cacheAudioBlob(url, blob, metadata);
      return URL.createObjectURL(blob);
    }
  } catch (err) {
    console.warn('[AudioCache] Proxy fetch failed, using direct url:', err);
  }

  return url;
}

