import { useEffect, useState } from 'react';
import type { AssetProgress } from '../render/assets';
import { creature } from '../sim/creatures';

const FACTS = [
  'Anomalocaris was the largest animal of its time. About a metre. Terrifying, then.',
  'Opabinia had five eyes and a claw on a hose. Nobody has explained it since.',
  'Hallucigenia was reconstructed upside down for decades. The spines go on top.',
  'Trilobites could roll into a ball. Olenoides does it on Y.',
  'The Burgess Shale preserved soft bodies for 508 million years. Be grateful.',
  'Wiwaxia grazed microbial mats. Slow food, literally.',
  'Waptia looked like a shrimp and swam like one: fast, and gone.',
  'Everything here is smaller than your hand. Everything here is hungry.',
];

/** Boot screen: shows while the first creatures stream in. Key art slot falls back to the live reef. */
export function LoadingScreen({ progress, fraction }: { progress: AssetProgress | null; fraction: number }) {
  const [fact, setFact] = useState(0);
  useEffect(() => { const t = setInterval(() => setFact((f) => (f + 1) % FACTS.length), 3800); return () => clearInterval(t); }, []);
  const pct = Math.round(Math.min(1, fraction) * 100);
  const current = progress?.current ? creature(progress.current as never)?.name : undefined;
  return (
    <section className="loading loading-illustrated" aria-busy="true" aria-live="polite">
      <div className="loading-inner">
        <h1 className="title-logo small">
          <img className="brand-logo illustrated-logo" src={`${import.meta.env.BASE_URL}assets/brand/logo-illustrated.webp`} alt="Cambrian Explosion" />
        </h1>
        <div className="loading-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
          <i style={{ width: `${pct}%` }} />
        </div>
        <p className="loading-status">{current ? `Waking ${current}…` : 'Waking the reef…'} <b>{pct}%</b></p>
        <p className="loading-fact" key={fact}>{FACTS[fact]}</p>
      </div>
    </section>
  );
}
