import { useEffect, useState } from 'react';
import { ASSET_BASE } from './scene';

/**
 * The sha256 of the file on stage, measured rather than trusted.
 *
 * Every editor that exports a decision about a mesh names the exact file it was made on, so a
 * consumer can refuse a region or a cut aimed at a mesh that has since changed. The manifest's hash
 * covers only the bodies it lists — a raw generation in `preview-bodies.json` — and a shipped body
 * is in no manifest at all, which is how a region marked on Mosasaurus went out with `sha256: null`.
 * The file is in the browser's cache by the time an editor opens, so hashing it costs one read.
 * `crypto.subtle` needs a secure context, which a plain http deployment is not; there the answer
 * is `null` and the caller falls back to whatever manifest hash it was handed.
 *
 * `undefined` while the read is in flight, `null` when it cannot be measured.
 */
export function useMeasuredHash(model: string): string | null | undefined {
  const [measured, setMeasured] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    let cancelled = false;
    setMeasured(undefined);
    (async () => {
      try {
        if (!globalThis.crypto?.subtle) { if (!cancelled) setMeasured(null); return; }
        const bytes = await (await fetch(`${ASSET_BASE}${model}`)).arrayBuffer();
        const digest = await crypto.subtle.digest('SHA-256', bytes);
        const hex = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
        if (!cancelled) setMeasured(hex);
      } catch { if (!cancelled) setMeasured(null); }
    })();
    return () => { cancelled = true; };
  }, [model]);
  return measured;
}
