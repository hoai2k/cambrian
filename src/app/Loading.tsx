import { ACTIVE_ERA } from '../content';
import { useEffect, useState } from 'react';
import type { AssetProgress } from '../render/assets';
import { creature } from '../sim/creatures';
import { appBase } from '../shared/base';
import { TEXT } from '../shared/text';

/**
 * The lines that rotate under the bar. Per era (`src/content/<era>/strings.ts`): they are about
 * that era's own animals, and one shared list meant the Devonian was loading to Cambrian trivia.
 */
const FACTS = TEXT.loading.facts;

/** Boot screen: shows while the first creatures stream in. Key art slot falls back to the live reef. */
export function LoadingScreen({ progress, fraction }: { progress: AssetProgress | null; fraction: number }) {
  const [fact, setFact] = useState(0);
  useEffect(() => { if (FACTS.length < 2) return; const t = setInterval(() => setFact((f) => (f + 1) % FACTS.length), 3800); return () => clearInterval(t); }, []);
  const pct = Math.round(Math.min(1, fraction) * 100);
  const current = progress?.current ? creature(progress.current as never)?.name : undefined;
  return (
    <section className="loading loading-illustrated" aria-busy="true" aria-live="polite">
      <div className="loading-inner">
        <h1 className="title-logo small">
          <img className="brand-logo illustrated-logo" src={`${appBase()}${ACTIVE_ERA.assets.illustration}`} alt={ACTIVE_ERA.title} />
        </h1>
        <div className="loading-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
          <i style={{ width: `${pct}%` }} />
        </div>
        <p className="loading-status">{current ? TEXT.loading.wakingCreature(current) : TEXT.loading.waking} <b>{pct}%</b></p>
        {FACTS.length > 0 && <p className="loading-fact" key={fact}>{FACTS[fact]}</p>}
      </div>
    </section>
  );
}

/**
 * True once `active` has been true for `ms` without letting up.
 *
 * A loading indicator that appears the instant something is asked for reads as a stutter when the
 * thing was already in cache — switching era on the choice page is usually a warm page load, and a
 * boot screen flashed for two frames is worse than no boot screen at all. So nothing is drawn until
 * the wait is longer than a player would put down to the game being quick.
 */
export const WAIT_HINT = 700;
export function useSlow(active: boolean, ms = WAIT_HINT): boolean {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    if (!active) { setSlow(false); return; }
    const t = setTimeout(() => setSlow(true), ms);
    return () => clearTimeout(t);
  }, [active, ms]);
  return slow;
}
