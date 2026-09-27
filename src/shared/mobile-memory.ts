import { ACTIVE_ERA } from '../content';

/** Browser hints are approximate and optional; unknown hardware keeps the normal default. */
export interface DeviceHints {
  touch: boolean;
  memoryGB?: number;
  logicalCores?: number;
}

/** A cautious default for touch hardware likely to struggle with the large 3D scenes. */
export function constrainedTouch(h: DeviceHints): boolean {
  if (!h.touch) return false;
  if (h.memoryGB !== undefined && h.memoryGB <= 4) return true;
  if (h.logicalCores !== undefined && h.logicalCores <= 4) return true;
  // Browsers without a memory hint still expose useful CPU capacity on most devices.
  return h.memoryGB === undefined && h.logicalCores !== undefined && h.logicalCores <= 6;
}

export function currentDeviceHints(): DeviceHints {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return { touch: false };
  let touch = false;
  try { touch = window.matchMedia('(pointer: coarse) and (hover: none)').matches; } catch { /* unavailable */ }
  const memoryGB = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  const logicalCores = navigator.hardwareConcurrency;
  return {
    touch,
    memoryGB: Number.isFinite(memoryGB) && memoryGB! > 0 ? memoryGB : undefined,
    logicalCores: Number.isFinite(logicalCores) && logicalCores > 0 ? logicalCores : undefined,
  };
}

/** Old stored defaults are re-evaluated; a Settings choice always wins. */
export function qualityForDevice(
  saved: { quality?: 'high' | 'low'; qualityExplicit?: boolean } | undefined,
  hints = currentDeviceHints(),
): 'high' | 'low' {
  if (saved?.qualityExplicit && (saved.quality === 'high' || saved.quality === 'low')) return saved.quality;
  return constrainedTouch(hints) ? 'low' : 'high';
}

/** Only the two large-model eras use the memory-saving NPC and preload policy. */
export const conserveCreatureMemory = (quality: 'high' | 'low', hints = currentDeviceHints(), era = ACTIVE_ERA.id): boolean =>
  quality === 'low' && hints.touch && (era === 'devonian' || era === 'triassic');
