import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { jwtVerify } from 'jose';

export type LicenseTier = 'trial' | 'pro' | 'lifetime';

interface LicenseState {
  isPremium: boolean;
  tier: LicenseTier;
  expirationDate: string | null;
  userEmail: string | null;
  licenseToken: string | null;
  machineId: string | null;
  
  // Actions
  setLicense: (token: string, machineId: string, publicKey: string) => Promise<{ success: boolean; error?: string }>;
  checkStatus: () => void;
  clearLicense: () => void;
}

export const useLicenseStore = create<LicenseState>()(
  persist(
    (set, get) => ({
      isPremium: false,
      tier: 'trial',
      expirationDate: null,
      userEmail: null,
      licenseToken: null,
      machineId: null,

      setLicense: async (token, currentMachineId, secret) => {
        // 0. Priority: Temporary Free Pass 2026
        if (token === 'TEMP_FREE_PASS_2026') {
          const expiry = '2026-01-01T00:00:00Z';
          if (new Date() < new Date(expiry)) {
            set({
              isPremium: true,
              tier: 'trial',
              expirationDate: expiry,
              licenseToken: token,
              machineId: currentMachineId,
              userEmail: 'free@calculatu.com'
            });
            return { success: true };
          }
        }

        try {
          // Validation logic (Anti-Warp)
          const encoder = new TextEncoder();
          const { payload } = await jwtVerify(token, encoder.encode(secret));

          if (payload.sub !== currentMachineId) {
            return { success: false, error: 'Este token no pertenece a este dispositivo.' };
          }

          const expirationDate = payload.exp ? new Date(payload.exp * 1000).toISOString() : null;
          const tier = (payload.plan as LicenseTier) || 'pro';

          set({
            isPremium: true,
            tier,
            expirationDate,
            licenseToken: token,
            machineId: currentMachineId,
            userEmail: (payload.email as string) || null
          });

          return { success: true };
        } catch (err: any) {
          return { success: false, error: 'Token inválido o expirado.' };
        }
      },

      checkStatus: () => {
        const { expirationDate, isPremium } = get();
        if (isPremium && expirationDate) {
          if (new Date() > new Date(expirationDate)) {
            set({ isPremium: false });
          }
        }
      },

      clearLicense: () => set({ 
        isPremium: false, 
        tier: 'trial', 
        expirationDate: null, 
        userEmail: null, 
        licenseToken: null 
      }),
    }),
    {
      name: 'calculatu-license-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
