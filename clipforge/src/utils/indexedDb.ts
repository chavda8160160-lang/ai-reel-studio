/**
 * IndexedDB persistence layer for ClipForge Studio projects
 * Provides non-blocking offline auto-save and project recovery
 */

const DB_NAME = 'ClipForgeStudioDB';
const DB_VERSION = 1;
const STORE_NAME = 'projects';
const ACTIVE_PROJECT_KEY = 'active_project';

export interface SavedProjectData {
  projectName: string;
  tracks: any[];
  aspectRatio: string;
  totalDuration: number;
  lastSavedAt: number;
}

const openDatabase = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

/**
 * Save current project state to IndexedDB
 */
export const saveProjectToDB = async (data: Omit<SavedProjectData, 'lastSavedAt'>): Promise<void> => {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const record: SavedProjectData = {
        ...data,
        lastSavedAt: Date.now(),
      };
      const req = store.put(record, ACTIVE_PROJECT_KEY);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Failed to auto-save project to IndexedDB:', err);
  }
};

/**
 * Load saved project state from IndexedDB
 */
export const loadProjectFromDB = async (): Promise<SavedProjectData | null> => {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(ACTIVE_PROJECT_KEY);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Failed to load project from IndexedDB:', err);
    return null;
  }
};

// Debounced auto-save utility (waits 600ms of inactivity before committing to IndexedDB)
let autoSaveTimer: ReturnType<typeof setTimeout> | null = null;

export const scheduleAutoSave = (data: Omit<SavedProjectData, 'lastSavedAt'>, delayMs = 600) => {
  if (autoSaveTimer) clearTimeout(autoSaveTimer);
  autoSaveTimer = setTimeout(() => {
    saveProjectToDB(data);
  }, delayMs);
};

