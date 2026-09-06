import { useEffect, useRef, useState } from 'react';
import type { HudSnapshot, PlayerHud, RadarBlipHud } from '../render/engine';
import { creature } from '../sim/creatures';
import { BAND_COLOR } from '../sim/types';

export function Hud({ snapshot }: { snapshot: HudSnapshot }) {
  const W = snapshot.rects.reduce((m, r) => Math.max(m, r.x + r.w), 1);
  const H = snapshot.rects.reduce((m, r) => Math.max(m, r.y + r.h), 1);
  return (
    <div className="hud-layer" aria-live="off">
      {snapshot.players.map((p, i) => {
        const r = snapshot.rects[i]; if (!r) return null;
        return (
          <div key={i} className={`hud ${snapshot.players.length > 2 ? 'hud-quarter' : snapshot.players.length === 2 ? 'hud-half' : ''}`} style={{ left: `${(r.x / W) * 100}%`, top: `${(r.y / H) * 100}%`, width: `${(r.w / W) * 100}%`, height: `${(r.h / H) * 100}%`, ['--player' as string]: p.color }}>
            <PlayerPanel p={p} />
          </div>
        );
      })}
    </div>
  );
}

function PlayerPanel({ p }: { p: PlayerHud }) {
  const def = creature(p.creature);
  const R = 30, C = 2 * Math.PI * R;
  return (
    <>
      <div className="hunt-vignette" style={{ opacity: Math.max(0, Math.min(1, (p.hunted - 0.25) * 1.3)) }} />
      {p.bandMarkers.map((m, k) => (
        <span key={k} className={`marker marker-${m.band}`} style={{ left: `${m.x * 100}%`, top: `${m.y * 100}%`, ['--s' as string]: m.size, maskImage: `url(${import.meta.env.BASE_URL}assets/ui/band-${m.band}.svg)`, color: BAND_COLOR[m.band] }} />
      ))}
      {p.hunterAngle != null && (
        <div className="hunter-arrow" style={{ transform: `translate(-50%,-50%) rotate(${-p.hunterAngle}rad) translate(min(38vh, 34%))`, opacity: 0.4 + p.hunted * 0.6 }}>
          <span>▲</span>
        </div>
      )}
      <div className="hud-top">
        <div className="tier-ring">
          <svg viewBox="0 0 72 72">
            <circle cx="36" cy="36" r={R} className="ring-bg" />
            <circle cx="36" cy="36" r={R} className="ring-fg" strokeDasharray={`${C * p.progress} ${C}`} transform="rotate(-90 36 36)" />
          </svg>
          <span className="tier-num" role="img" aria-label={`Tier ${p.tier + 1}: ${p.tierName}`}><i className="tier-glyph" style={{ maskImage: `url(${import.meta.env.BASE_URL}assets/ui/tier-${p.tier + 1}.svg)` }} /></span>
        </div>
        <div className="bars">
          <div className="name-row"><b>{def.name}</b><span className="tier-name">{p.tierName}</span>{p.protect && <span className="protect">PROTECTED</span>}</div>
          <div className="bar hp"><i style={{ width: `${(p.hp / p.hpMax) * 100}%` }} /></div>
          <div className={`bar stamina ${p.exhausted ? 'exhausted' : ''}`}><i style={{ width: `${(p.stamina / p.staminaMax) * 100}%` }} /></div>
        </div>
      </div>
      {p.aim && (
        <div className={`aim ${p.aim.hasTarget ? 'on-target' : ''} ${p.aim.inRange ? 'in-range' : ''} ${p.aim.ready ? '' : 'cooling'}`} style={{ color: p.aim.color }}>
          <i /><i /><i /><i /><b />
          <span className="aim-label">{p.aim.inRange ? (p.aim.ready ? 'RT · POUNCE' : '…') : p.aim.name ?? ''}</span>
        </div>
      )}
      {p.lock && !p.aim && (
        <div className="lock-panel" style={{ color: p.lock.color }}>
          <span className="lock-band">{p.lock.band.toUpperCase()}</span>
          <b>{p.lock.name}</b>
          <div className="bar target"><i style={{ width: `${p.lock.hp * 100}%` }} /></div>
        </div>
      )}
      <BiomeBanner biome={p.biome} alive={p.alive} />
      <Radar radar={p.radar} biome={p.biome} />
      {p.teleport && (
        <div className="tele-menu">
          <p className="eyebrow">TELEPORT</p>
          <ul>
            {p.teleport.options.map((o, k) => (
              <li key={k} className={k === p.teleport!.index ? 'sel' : ''}>
                <b>{o.label}</b>
                <span>{o.detail} · {fmtDist(o.distance)}</span>
              </li>
            ))}
          </ul>
          <small>{p.teleport.cooldown > 0 ? `Ready in ${Math.ceil(p.teleport.cooldown)} s` : <><kbd>A</kbd> go · <kbd>B</kbd> back · D-pad ▼ next</>}</small>
        </div>
      )}
      <div className="hud-bottom">
        <div className={`chip ability ${p.abilityUnlocked ? '' : 'locked'} ${p.abilityActive ? 'active' : ''}`} title={def.abilityDesc}>
          <span className="btn y">Y</span>
          <span className="chip-label">{p.abilityUnlocked ? p.abilityName : 'Ability at Adult'}</span>
          <i className="cool" style={{ transform: `scaleX(${p.abilityUnlocked ? p.abilityReady : 0})` }} />
        </div>
        <div className={`chip sense ${p.senseReady >= 1 ? 'ready' : ''}`}>
          <span className="btn dpad">▲</span><span className="chip-label">Sense</span>
          <i className="cool" style={{ transform: `scaleX(${p.senseReady})` }} />
        </div>
        <div className="tally"><span>{p.eats} eaten</span><span>{p.kills} kills</span><span>{p.escapes} escapes</span></div>
      </div>
      {p.hunterState !== 'none' && (
        <div className={`threat ${p.hunterState}`}>
          <span className="eye"><i style={{ transform: `scaleX(${Math.min(1, p.hunted)})` }} /></span>
          <div>
            <b>{p.hunterState === 'hunting' ? `${p.hunterName ?? 'Something huge'} IS HUNTING YOU` : `${p.hunterName ?? 'Something huge'} is looking your way`}</b>
            <span>{p.hunterState === 'hunting' ? (p.inCover ? (p.still ? 'Hold still. It is losing you.' : 'In cover. Now freeze.') : 'Break line of sight. Get under the sponges.') : (p.still ? 'Stay frozen until it turns away.' : 'Stop moving, or slip into cover.')}</span>
          </div>
        </div>
      )}
      {!p.modelReady && p.alive && <p className="hint">Your creature is taking shape…</p>}
      {p.hint && p.hunterState === 'none' && p.modelReady && <p className="hint">{p.hint}</p>}
      <div className="fade" style={{ opacity: p.fade }} />
      {!p.alive && p.fade < 0.9 && (
        <div className="dead-overlay">
          <b>EATEN</b>
          <span>Back in a moment… you slip down a tier.</span>
        </div>
      )}
    </>
  );
}

const fmtDist = (d: number) => (d < 1000 ? `${Math.round(d)} m` : `${(d / 1000).toFixed(1)} km`);

/**
 * The radar: other players wherever they are, anything big enough to hurt within reach, whatever
 * is hunting you, plus home and the shore as bearings. Up is the way the camera looks. Contacts
 * further than the radar reaches sit on the rim, hollow, pointing the way.
 */
function Radar({ radar, biome }: { radar: PlayerHud['radar']; biome: string }) {
  const R = 44, C = 50;
  const dot = (b: RadarBlipHud, k: number) => {
    const x = C + b.x * R * 0.92, y = C + b.y * R * 0.92;
    const cls = `blip blip-${b.kind} ${b.beyond ? 'beyond' : ''} ${b.hunting ? 'hunting' : ''}`;
    if (b.kind === 'shore') {
      // a short arc of coastline on the rim in the shore's direction (the coast runs across it)
      const a = Math.atan2(b.y, b.x);
      const x1 = C + Math.cos(a - 0.35) * R, y1 = C + Math.sin(a - 0.35) * R, x2 = C + Math.cos(a + 0.35) * R, y2 = C + Math.sin(a + 0.35) * R;
      return <path key={k} className="blip blip-shore" d={`M${x1} ${y1} A${R} ${R} 0 0 1 ${x2} ${y2}`} style={{ stroke: b.color }} />;
    }
    if (b.kind === 'home') return <path key={k} className={cls} d={`M${x} ${y - 4} l3.5 3.5 v3.5 h-7 v-3.5z`} style={{ fill: b.beyond ? 'none' : b.color, stroke: b.color }} />;
    if (b.kind === 'player') return <circle key={k} className={cls} cx={x} cy={y} r={3.6} style={{ fill: b.beyond ? 'none' : b.color, stroke: b.color }} />;
    // threats and giants: a diamond, bigger for giants, blinking when it is after you
    const s = b.kind === 'giant' ? 4.6 : 3.4;
    return <path key={k} className={cls} d={`M${x} ${y - s} L${x + s} ${y} L${x} ${y + s} L${x - s} ${y}z`} style={{ fill: b.beyond ? 'none' : b.color, stroke: b.color }} />;
  };
  // rim contacts last so they draw over the ring
  const inside = radar.blips.filter((b) => !b.beyond), rim = radar.blips.filter((b) => b.beyond);
  return (
    <div className="radar" aria-label={`Radar, ${Math.round(radar.range)} metre reach. ${biome}.`}>
      <svg viewBox="0 0 100 100">
        <circle cx={C} cy={C} r={R} className="radar-bg" />
        <circle cx={C} cy={C} r={R * 0.5} className="radar-ring" />
        <line x1={C} y1={C - R} x2={C} y2={C + R} className="radar-ring" />
        <line x1={C - R} y1={C} x2={C + R} y2={C} className="radar-ring" />
        <path d={`M${C} ${C - 5} L${C + 3.5} ${C + 3} L${C} ${C + 1.5} L${C - 3.5} ${C + 3}z`} className="radar-you" />
        {inside.map(dot)}{rim.map(dot)}
        <circle cx={C} cy={C} r={R} className="radar-rim" />
      </svg>
      <span className="radar-range">{Math.round(radar.range)} m</span>
    </div>
  );
}

/** Announces the biome for a few seconds whenever it changes. */
function BiomeBanner({ biome, alive }: { biome: string; alive: boolean }) {
  const [shown, setShown] = useState<string | null>(null);
  const last = useRef<string | null>(null);
  useEffect(() => {
    if (biome === last.current) return;
    const first = last.current === null;
    last.current = biome;
    if (first || !alive) return;
    setShown(biome);
    const t = setTimeout(() => setShown(null), 3200);
    return () => clearTimeout(t);
  }, [biome, alive]);
  return shown ? <div className="biome-banner" key={shown}><span>ENTERING</span><b>{shown}</b></div> : null;
}
