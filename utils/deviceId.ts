const DB_NAME = 'calculatu_db';
const DB_VERSION = 1;
const UIC_STORE = 'identity';

interface UICRecord {
  uic: string;
  createdAt: string;
  updatedAt: string;
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
      if (!db.objectStoreNames.contains(UIC_STORE)) {
        db.createObjectStore(UIC_STORE, { keyPath: 'id' });
      }
    };
  });
}

async function getUICFromIndexedDB(): Promise<string | null> {
  try {
    if (typeof window === 'undefined' || !window.indexedDB) return null;
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(UIC_STORE, 'readonly');
      const store = tx.objectStore(UIC_STORE);
      const req = store.get('uic');
      req.onerror = () => reject(req.error);
      req.onsuccess = () => {
        const data = req.result;
        resolve(data?.uic || null);
      };
    });
  } catch {
    return null;
  }
}

async function saveUICToIndexedDB(uic: string): Promise<void> {
  try {
    if (typeof window === 'undefined' || !window.indexedDB) return;
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(UIC_STORE, 'readwrite');
      const store = tx.objectStore(UIC_STORE);
      const now = new Date().toISOString();
      const record: UICRecord & { id: string } = {
        id: 'uic',
        uic,
        createdAt: now,
        updatedAt: now,
      };
      const req = store.put(record);
      req.onerror = () => reject(req.error);
      req.onsuccess = () => resolve();
    });
  } catch {
    // ignore
  }
}

function fnv1a64(input: string): bigint {
  // 64-bit FNV-1a
  let hash = 0xcbf29ce484222325n;
  const prime = 0x100000001b3n;
  for (let i = 0; i < input.length; i++) {
    hash ^= BigInt(input.charCodeAt(i));
    hash = (hash * prime) & 0xffffffffffffffffn;
  }
  return hash;
}

function fingerprintString(): string {
  if (typeof window === 'undefined') return 'server';
  const nav = window.navigator as any;
  const tz = (() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    } catch {
      return '';
    }
  })();

  // Canvas Fingerprinting
  const canvasHash = (() => {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return '';
      canvas.width = 200;
      canvas.height = 50;
      ctx.textBaseline = 'top';
      ctx.font = '16px "Arial"';
      ctx.fillStyle = '#f60';
      ctx.fillRect(125, 1, 62, 20);
      ctx.fillStyle = '#069';
      ctx.fillText('Multiversa Fingerprint v1', 2, 15);
      ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
      ctx.fillText('Multiversa Fingerprint v1', 4, 17);
      return canvas.toDataURL();
    } catch {
      return 'canvas-error';
    }
  })();

  return [
    nav.userAgent || '',
    nav.language || '',
    (nav.languages || []).join(','),
    tz,
    nav.platform || '',
    String(nav.hardwareConcurrency || ''),
    String(nav.deviceMemory || ''),
    `${window.screen?.width || ''}x${window.screen?.height || ''}x${window.screen?.colorDepth || ''}`,
    canvasHash
  ].join('|');
}

// Legacy fallback: check localStorage for migration
const MACHINE_ID_STORAGE_KEY = 'calculatu_machine_id_v1';

function safeGetLocalStorageItem(key: string): string | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage.getItem(key) : null;
  } catch {
    return null;
  }
}

function safeRemoveLocalStorageItem(key: string) {
  try {
    if (typeof window !== 'undefined') window.localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

export async function getOrCreateUIC(): Promise<string> {
  // 1. Try IndexedDB first (primary source)
  const existingFromIDB = await getUICFromIndexedDB();
  if (existingFromIDB) return existingFromIDB;

  // 2. Legacy migration: check localStorage and migrate
  const legacyId = safeGetLocalStorageItem(MACHINE_ID_STORAGE_KEY);
  if (legacyId) {
    await saveUICToIndexedDB(legacyId);
    safeRemoveLocalStorageItem(MACHINE_ID_STORAGE_KEY); // Cleanup
    return legacyId;
  }

  // 3. Generate new UIC
  const fp = fingerprintString();
  const hash = fnv1a64(fp);
  const base36 = hash.toString(36).toUpperCase();
  const uic = `M-${base36.slice(0, 10).padEnd(10, '0')}`;
  await saveUICToIndexedDB(uic);
  return uic;
}

// Synchronous fallback for Zustand initialization (returns promise-wrapped value)
let cachedUIC: string | null = null;
let uicPromise: Promise<string> | null = null;

export function getOrCreateMachineId(): string {
  // For Zustand store init, we need synchronous value
  // Cache will be populated async on first call
  if (cachedUIC) return cachedUIC;
  
  if (!uicPromise) {
    uicPromise = getOrCreateUIC().then((uic) => {
      cachedUIC = uic;
      return uic;
    });
  }
  
  // Return placeholder that will be updated when promise resolves
  // Store will re-render when UIC is available
  return cachedUIC || 'M-LOADING...';
}

// Initialize UIC cache on module load
if (typeof window !== 'undefined') {
  getOrCreateUIC().then((uic) => {
    cachedUIC = uic;
  });
}






