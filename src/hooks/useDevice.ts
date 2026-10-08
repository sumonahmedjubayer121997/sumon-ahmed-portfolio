import { getQualityTier, supportsWebGL, type QualityTier } from '@/lib/device';
import { useClientValue } from '@/lib/hydration';

/**
 * Device capabilities, hydration-safe: prerendered HTML assumes a capable
 * mid-tier device with WebGL; the real values apply right after hydration.
 */
export const useWebGL = () => useClientValue(supportsWebGL, true);

export const useQualityTier = () => useClientValue<QualityTier>(getQualityTier, 'mid');

/** Pick a value for the current quality tier. */
export function useBudget<T>(values: Record<QualityTier, T>): T {
  return values[useQualityTier()];
}
