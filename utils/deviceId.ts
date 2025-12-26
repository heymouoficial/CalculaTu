
let cachedUIC: string | null = null;
let uicPromise: Promise<string> | null = null;

// Helper for SHA-256
async function sha256(message: string): Promise<string> {
  if (typeof window === 'undefined' || !window.crypto || !window.crypto.subtle) {
    // Fallback for SSR or environments without crypto
    return 'server-or-no-crypto'; 
  }
  
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(message);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  } catch (e) {
    console.error('Error generating hash:', e);
    return 'hash-error';
  }
}

function fingerprintString(): string {
  if (typeof window === 'undefined') return 'server';
  const nav = window.navigator as any;
  
  let tz = 'UTC';
  try {
    tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch (e) {
    // ignore
  }

  // Required signals: userAgent + screen.width + screen.height + timeZone
  const components = [
    nav.userAgent || '',
    String(window.screen?.width || '0'),
    String(window.screen?.height || '0'),
    tz
  ];
  
  return components.join('|');
}

export async function getOrCreateUIC(): Promise<string> {
  // Always calculate based on hardware/environment signals.
  // This ensures the ID persists across data clears (Anti-Warp).
  const fp = fingerprintString();
  const hash = await sha256(fp);
  
  // Cache it for this session
  cachedUIC = hash;
  return hash;
}

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
