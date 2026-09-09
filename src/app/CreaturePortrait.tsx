import { useEffect, useRef, useState, type ImgHTMLAttributes } from 'react';
import { creaturePortrait } from '../shared/creature-images';
import type { PortraitKind } from '../shared/portrait-match';
import { useSlow } from './Loading';

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
  const url = failed ? fallback : src;
  const img = useRef<HTMLImageElement>(null);
  const [done, setDone] = useState(false);
  // A portrait already in cache decodes before React can attach the handler, so `complete` — not the
  // load event — is what says a fresh `src` has nothing to wait for.
  useEffect(() => { setDone(!!img.current?.complete); }, [url]);
  const waiting = useSlow(!done);
  return (
    <>
      <img {...props} ref={img} src={url} onLoad={() => setDone(true)}
        onError={!failed && src !== fallback ? () => setFailed(true) : () => setDone(true)} />
      {waiting && <span className="portrait-wait" aria-hidden="true" />}
    </>
  );
}
