import type { EraDefinition } from '../era';

/**
 * Brand assets consumed by the Devonian era. The wordmark is `logo-header.webp`, which
 * `npm run logos` derives from the delivered `logo-engraved.webp` so the three games' marks read
 * alike at interface size; the delivered mark stays beside it untouched.
 */
export const DEVONIAN_BRAND = {
  logo: 'assets/devonian/brand/logo-header.webp',
  illustration: 'assets/devonian/brand/title.webp',
  emblem: 'assets/devonian/brand/emblem.webp',
} as const satisfies Pick<EraDefinition['assets'], 'logo' | 'illustration' | 'emblem'>;

export const DEVONIAN_BRAND_EXTRAS = {
  mobileIllustration: 'assets/devonian/brand/title-mobile.webp',
  favicon: 'assets/devonian/brand/favicon.ico',
  favicon16: 'assets/devonian/brand/favicon-16.png',
  favicon32: 'assets/devonian/brand/favicon-32.png',
  icon192: 'assets/devonian/brand/favicon-192.png',
  icon512: 'assets/devonian/brand/favicon-512.png',
  appleTouchIcon: 'assets/devonian/brand/apple-touch-icon.png',
} as const;
