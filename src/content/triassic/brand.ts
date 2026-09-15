import type { EraDefinition } from '../era';

/**
 * Brand assets consumed by the Triassic era. The wordmark and the composed title art are the
 * delivered engraved set (public/assets/triassic/brand/manifest.json), with the
 * full-body plesiosaur emblem and its derived icons.
 */
export const TRIASSIC_BRAND = {
  logo: 'assets/triassic/brand/logo-header.webp',
  illustration: 'assets/triassic/brand/title.webp',
  emblem: 'assets/triassic/brand/emblem.webp',
} as const satisfies Pick<EraDefinition['assets'], 'logo' | 'illustration' | 'emblem'>;

export const TRIASSIC_BRAND_EXTRAS = {
  mobileIllustration: 'assets/triassic/brand/title-mobile.webp',
  favicon: 'assets/triassic/brand/favicon.ico',
  favicon16: 'assets/triassic/brand/favicon-16.png',
  favicon32: 'assets/triassic/brand/favicon-32.png',
  icon192: 'assets/triassic/brand/favicon-192.png',
  icon512: 'assets/triassic/brand/favicon-512.png',
  appleTouchIcon: 'assets/triassic/brand/apple-touch-icon.png',
} as const;
