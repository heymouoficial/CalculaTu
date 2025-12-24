import { create } from 'zustand';
import { RATES } from '../constants';
import { getOrCreateMachineId, getOrCreateUIC } from '../utils/deviceId';
import { ShoppingItem } from '../types';

export type LicensePlan = 'monthly' | 'lifetime';

export type FeatureToken = {
  uic: string;
  features: string[]; // e.g., ['voice']
  expiresAt: string | null;
  token: string;
};

export type LicenseState = {
  active: boolean;
  plan?: LicensePlan;
  expiresAt?: string | null;
  token?: string | null;
  featureToken?: FeatureToken | null; // Feature token with specific features
};

type AppState = {
  machineId: string;
  userName: string | null;
  hasGreeted: boolean;
  baseRates: typeof RATES;
  rates: typeof RATES; // effective rates (baseRates unless user override is active)
  ratesOverrideExpiresAt?: string | null;
  budgetLimit: number; // in USD
  license: LicenseState;
  items: ShoppingItem[];

  setUserName: (name: string | null) => void;
  setHasGreeted: (hasGreeted: boolean) => void;
  setBaseRates: (rates: typeof RATES) => void;
  setRatesTemporarily: (rates: typeof RATES) => void; // 24h cache
  clearTemporaryRates: () => void;
  setBudgetLimit: (limit: number) => void;
  setLicense: (license: LicenseState) => void;
  clearLicense: () => void;
  addItem: (item: ShoppingItem) => void;
  removeItem: (id: string) => void;
  clearItems: () => void;
};

const LICENSE_STORAGE_KEY = 'calculatu_license_v1';
const RATES_OVERRIDE_KEY_PREFIX = 'calculatu_rates_override_v1_';
const RATES_OVERRIDE_TTL_MS = 24 * 60 * 60 * 1000;

type RatesOverride = {
  USD: number;
  EUR: number;
  expiresAt: string;
};

function ratesOverrideKey(machineId: string) {
  return `${RATES_OVERRIDE_KEY_PREFIX}${machineId}`;
}

function readRatesOverride(machineId: string): RatesOverride | null {
  try {
    const key = ratesOverrideKey(machineId);
    const raw = typeof window !== 'undefined' ? window.localStorage.getItem(key) : null;
    if (!raw) return null;
    const parsed = JSON.parse(raw) as RatesOverride;
    if (!parsed?.expiresAt) return null;
    const exp = Date.parse(parsed.expiresAt);
    if (!Number.isFinite(exp) || Date.now() > exp) return null;
    if (!Number.isFinite(parsed.USD) || !Number.isFinite(parsed.EUR)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function persistRatesOverride(machineId: string, override: RatesOverride | null) {
  try {
    if (typeof window === 'undefined') return;
    const key = ratesOverrideKey(machineId);
    if (!override) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, JSON.stringify(override));
  } catch {
    // ignore
  }
}

function readStoredLicense(): LicenseState {
  try {
    const raw = typeof window !== 'undefined' ? window.localStorage.getItem(LICENSE_STORAGE_KEY) : null;
    if (!raw) return { active: false, expiresAt: null, token: null, featureToken: null };
    const parsed = JSON.parse(raw) as LicenseState;
    if (parsed?.expiresAt) {
      const exp = Date.parse(parsed.expiresAt);
      if (Number.isFinite(exp) && Date.now() > exp) {
        return { active: false, expiresAt: parsed.expiresAt, token: parsed.token ?? null, featureToken: null };
      }
    }
    return { ...parsed, active: !!parsed.active, featureToken: parsed.featureToken ?? null };
  } catch {
    return { active: false, expiresAt: null, token: null, featureToken: null };
  }
}

function persistLicense(license: LicenseState) {
  try {
    if (typeof window !== 'undefined') window.localStorage.setItem(LICENSE_STORAGE_KEY, JSON.stringify(license));
  } catch {
    // ignore
  }
}

const BUDGET_STORAGE_KEY = 'calculatu_budget_v1';

function readStoredBudget(): number {
  try {
    const raw = typeof window !== 'undefined' ? window.localStorage.getItem(BUDGET_STORAGE_KEY) : null;
    return raw ? parseFloat(raw) : 0;
  } catch {
    return 0;
  }
}

function persistBudget(limit: number) {
  try {
    if (typeof window !== 'undefined') window.localStorage.setItem(BUDGET_STORAGE_KEY, limit.toString());
  } catch {
    // ignore
  }
}

const USER_NAME_STORAGE_KEY = 'calculatu_username_v1';

function readStoredUserName(): string | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage.getItem(USER_NAME_STORAGE_KEY) : null;
  } catch {
    return null;
  }
}

function persistUserName(name: string | null) {
  try {
    if (typeof window === 'undefined') return;
    if (name) window.localStorage.setItem(USER_NAME_STORAGE_KEY, name);
    else window.localStorage.removeItem(USER_NAME_STORAGE_KEY);
  } catch {
    // ignore
  }
}

export const useAppStore = create<AppState>((set) => {
  // Initialize UIC async and update store when ready
  getOrCreateUIC().then((uic) => {
    set({ machineId: uic });
  });
  
  return {
    machineId: getOrCreateMachineId(), // Sync fallback (will update when async completes)
  userName: readStoredUserName(),
  hasGreeted: false,
  baseRates: RATES,
  rates: (() => {
    const id = getOrCreateMachineId();
    const o = readRatesOverride(id);
    return o ? { USD: o.USD, EUR: o.EUR } : RATES;
  })(),
  ratesOverrideExpiresAt: (() => {
    const id = getOrCreateMachineId();
    const o = readRatesOverride(id);
    return o?.expiresAt ?? null;
  })(),
  budgetLimit: readStoredBudget(),
  license: readStoredLicense(),
  items: [],

  setUserName: (name) =>
    set(() => {
      persistUserName(name);
      return { userName: name };
    }),

  setHasGreeted: (hasGreeted) => set({ hasGreeted }),

  setBaseRates: (baseRates) =>
    set((state) => {
      const override = readRatesOverride(state.machineId);
      // If user override is active, keep effective rates; otherwise follow baseRates
      return {
        baseRates,
        rates: override ? state.rates : baseRates,
      };
    }),

  setRatesTemporarily: (rates) =>
    set((state) => {
      const expiresAt = new Date(Date.now() + RATES_OVERRIDE_TTL_MS).toISOString();
      persistRatesOverride(state.machineId, { USD: rates.USD, EUR: rates.EUR, expiresAt });
      return { rates, ratesOverrideExpiresAt: expiresAt };
    }),

  clearTemporaryRates: () =>
    set((state) => {
      persistRatesOverride(state.machineId, null);
      return { rates: state.baseRates, ratesOverrideExpiresAt: null };
    }),

  setBudgetLimit: (limit) =>
    set(() => {
      persistBudget(limit);
      return { budgetLimit: limit };
    }),

  setLicense: (license) =>
    set(() => {
      persistLicense(license);
      return { license };
    }),
  clearLicense: () =>
    set(() => {
      const license: LicenseState = { active: false, expiresAt: null, token: null, featureToken: null };
      persistLicense(license);
      return { license };
    }),

  addItem: (item) => set((state) => ({ items: [item, ...state.items] })),
  removeItem: (id) => set((state) => ({ items: state.items.filter((i) => i.id !== id) })),
  clearItems: () => set({ items: [] }),

  };
});


