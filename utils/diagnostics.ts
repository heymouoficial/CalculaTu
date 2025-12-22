import { useAppStore } from '../store/useAppStore';

export interface DiagnosticReport {
  timestamp: string;
  uic: string;
  license: {
    active: boolean;
    plan?: string;
    features?: string[];
  };
  capabilities: {
    indexedDB: boolean;
    serviceWorker: boolean;
    microphone: Promise<boolean>;
    audioContext: boolean;
  };
  network: {
    online: boolean;
  };
  errors: string[];
}

export async function generateDiagnosticReport(): Promise<DiagnosticReport> {
  const state = useAppStore.getState();
  
  const micCheck = navigator.mediaDevices
    ? navigator.mediaDevices.getUserMedia({ audio: true })
        .then(() => true)
        .catch(() => false)
    : Promise.resolve(false);

  return {
    timestamp: new Date().toISOString(),
    uic: state.machineId,
    license: {
      active: state.license.active,
      plan: state.license.plan,
      features: state.license.featureToken?.features || [],
    },
    capabilities: {
      indexedDB: typeof window !== 'undefined' && !!window.indexedDB,
      serviceWorker: 'serviceWorker' in navigator,
      microphone: await micCheck,
      audioContext: typeof window !== 'undefined' && !!(window.AudioContext || (window as any).webkitAudioContext),
    },
    network: {
      online: typeof navigator !== 'undefined' && navigator.onLine,
    },
    errors: [],
  };
}

export function formatDiagnosticReport(report: DiagnosticReport): string {
  return JSON.stringify(report, null, 2);
}



