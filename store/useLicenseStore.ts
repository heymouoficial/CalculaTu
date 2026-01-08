import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { jwtVerify, importSPKI } from 'jose';

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

      setLicense: async (token, currentMachineId, publicKey) => {
        try {
          // Validation logic (Anti-Warp)
          // Import the Public Key for ES256 verification
          const key = await importSPKI(publicKey, 'ES256');
          const { payload } = await jwtVerify(token, key);

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
          console.error("License Verification Error:", err);
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
