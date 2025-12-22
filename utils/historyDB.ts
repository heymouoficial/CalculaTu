const DB_NAME = 'calculatu_db';
const DB_VERSION = 2;
const HISTORY_STORE = 'history';

export interface HistoryEntry {
  id: string;
  date: string;
  time: string;
  totalBs: number;
  totalUsd: number;
  totalEur: number;
  itemCount: number;
  items: Array<{
    id: string;
    name: string;
    price: number;
    currency: 'USD' | 'EUR' | 'VES';
    quantity: number;
  }>;
  createdAt: string;
}

async function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not available'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(HISTORY_STORE)) {
        const store = db.createObjectStore(HISTORY_STORE, { keyPath: 'id' });
        store.createIndex('date', 'date', { unique: false });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };
  });
}

export async function saveHistoryEntry(entry: Omit<HistoryEntry, 'createdAt'>): Promise<void> {
  try {
    if (typeof window === 'undefined' || !window.indexedDB) return;
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(HISTORY_STORE, 'readwrite');
      const store = tx.objectStore(HISTORY_STORE);
      const record: HistoryEntry = {
        ...entry,
        createdAt: new Date().toISOString(),
      };
      const req = store.put(record);
      req.onerror = () => reject(req.error);
      req.onsuccess = () => resolve();
    });
  } catch (err) {
    console.error('Error saving history entry:', err);
  }
}

export async function getAllHistoryEntries(): Promise<HistoryEntry[]> {
  try {
    if (typeof window === 'undefined' || !window.indexedDB) return [];
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(HISTORY_STORE, 'readonly');
      const store = tx.objectStore(HISTORY_STORE);
      const index = store.index('createdAt');
      const req = index.openCursor(null, 'prev'); // Reverse order (newest first)
      const entries: HistoryEntry[] = [];

      req.onerror = () => reject(req.error);
      req.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          entries.push(cursor.value);
          cursor.continue();
        } else {
          resolve(entries);
        }
      };
    });
  } catch (err) {
    console.error('Error reading history entries:', err);
    return [];
  }
}

export async function deleteHistoryEntry(id: string): Promise<void> {
  try {
    if (typeof window === 'undefined' || !window.indexedDB) return;
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(HISTORY_STORE, 'readwrite');
      const store = tx.objectStore(HISTORY_STORE);
      const req = store.delete(id);
      req.onerror = () => reject(req.error);
      req.onsuccess = () => resolve();
    });
  } catch (err) {
    console.error('Error deleting history entry:', err);
  }
}


