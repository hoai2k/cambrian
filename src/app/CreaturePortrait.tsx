import { useState, type ImgHTMLAttributes } from 'react';
import { creaturePortrait } from '../shared/creature-images';
import type { PortraitKind } from '../shared/portrait-match';

type Props = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'srcSet' | 'onError'> & {
  creatureId: string;
  kind: PortraitKind;
  assetBase: string;
  schemeId?: string;
};

/** Scheme mismatches and failed requests both return to the preserved authored image. */
export function CreaturePortrait({ creatureId, kind, assetBase, schemeId, ...imageProps }: Props) {
  const { src, fallback } = creaturePortrait(creatureId, kind, schemeId);
  return <PortraitImage key={assetBase + src} src={assetBase + src} fallback={assetBase + fallback} {...imageProps} />;
}
function PortraitImage({ src, fallback, ...props }: ImgHTMLAttributes<HTMLImageElement> & { src: string; fallback: string }) {
  const [failed, setFailed] = useState(false);
  return <img {...props} src={failed ? fallback : src} onError={!failed && src !== fallback ? () => setFailed(true) : undefined} />;
}
