import { create } from 'zustand';
import { RATES } from '../constants';
import { getOrCreateMachineId } from '../utils/deviceId';

export type LicensePlan = 'monthly' | 'lifetime';

export type LicenseState = {
  active: boolean;
  plan?: LicensePlan;
  expiresAt?: string | null;
  token?: string | null;
};

type AppState = {
  machineId: string;
  baseRates: typeof RATES;
  rates: typeof RATES; // effective rates (baseRates unless user override is active)
  ratesOverrideExpiresAt?: string | null;
  license: LicenseState;

  setBaseRates: (rates: typeof RATES) => void;
  setRatesTemporarily: (rates: typeof RATES) => void; // 24h cache
  clearTemporaryRates: () => void;
  setLicense: (license: LicenseState) => void;
  clearLicense: () => void;
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
    if (!raw) return { active: false, expiresAt: null, token: null };
    const parsed = JSON.parse(raw) as LicenseState;
    if (parsed?.expiresAt) {
      const exp = Date.parse(parsed.expiresAt);
      if (Number.isFinite(exp) && Date.now() > exp) return { active: false, expiresAt: parsed.expiresAt, token: parsed.token ?? null };
    }
    return { ...parsed, active: !!parsed.active };
  } catch {
    return { active: false, expiresAt: null, token: null };
  }
}

function persistLicense(license: LicenseState) {
  try {
    if (typeof window !== 'undefined') window.localStorage.setItem(LICENSE_STORAGE_KEY, JSON.stringify(license));
  } catch {
    // ignore
  }
}

export const useAppStore = create<AppState>((set) => ({
  machineId: getOrCreateMachineId(),
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
  license: readStoredLicense(),

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

  setLicense: (license) =>
    set(() => {
      persistLicense(license);
      return { license };
    }),
  clearLicense: () =>
    set(() => {
      const license: LicenseState = { active: false, expiresAt: null, token: null };
      persistLicense(license);
      return { license };
    }),
}));


