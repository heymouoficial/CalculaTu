// Build Info - Update this on each release
export const BUILD_VERSION = 'v1.0.0-beta';
export const BUILD_DATE = '2025-12-29';

// App Name
export const APP_NAME = 'CalculaTú';

// Feature Flags
export const FEATURES = {
    VOICE_ENABLED: true,
    ONBOARDING_ENABLED: true,
    FEEDBACK_ENABLED: true,
} as const;

export const APP_PUBLIC_KEY = (import.meta.env.VITE_APP_PUBLIC_KEY || '').replace(/\\n/g, '\n');
