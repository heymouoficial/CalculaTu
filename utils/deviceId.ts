const MACHINE_ID_STORAGE_KEY = 'calculatu_machine_id_v1';

function safeGetLocalStorageItem(key: string): string | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage.getItem(key) : null;
  } catch {
    return null;
  }
}

function safeSetLocalStorageItem(key: string, value: string) {
  try {
    if (typeof window !== 'undefined') window.localStorage.setItem(key, value);
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

  return [
    nav.userAgent || '',
    nav.language || '',
    (nav.languages || []).join(','),
    tz,
    nav.platform || '',
    String(nav.hardwareConcurrency || ''),
    String(nav.deviceMemory || ''),
    `${window.screen?.width || ''}x${window.screen?.height || ''}x${window.screen?.colorDepth || ''}`,
  ].join('|');
}

export function getOrCreateMachineId(): string {
  const existing = safeGetLocalStorageItem(MACHINE_ID_STORAGE_KEY);
  if (existing) return existing;

  const fp = fingerprintString();
  const hash = fnv1a64(fp);
  const base36 = hash.toString(36).toUpperCase();
  const id = `M-${base36.slice(0, 10).padEnd(10, '0')}`;
  safeSetLocalStorageItem(MACHINE_ID_STORAGE_KEY, id);
  return id;
}


