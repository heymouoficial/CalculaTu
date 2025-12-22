import { useAppStore, FeatureToken } from '../store/useAppStore';

/**
 * Check if a specific feature is enabled for the current device
 */
export function hasFeature(feature: string): boolean {
  const state = useAppStore.getState();
  if (!state.license.active || !state.license.featureToken) return false;
  return state.license.featureToken.features.includes(feature);
}

/**
 * Get the feature token if available
 */
export function getFeatureToken(): FeatureToken | null {
  const state = useAppStore.getState();
  return state.license.featureToken ?? null;
}



