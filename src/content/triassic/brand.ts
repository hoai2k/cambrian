import type { EraDefinition } from '../era';

/** Brand assets consumed by the Triassic era. Placeholders until the wordmark and key art land (docs/triassic/03-image-and-model-requests.md). */
export const TRIASSIC_BRAND = {
  logo: 'assets/triassic/brand/logo.svg',
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
