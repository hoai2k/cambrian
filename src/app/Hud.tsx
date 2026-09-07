import { assetPaths } from '../content/asset-paths';
import { hideDescription } from '../sim/concealment';
import { useEffect, useId, useRef, useState } from 'react';
import type { HudSnapshot, PlayerHud, RadarBlipHud } from '../render/engine';
import type { EraHud } from '../sim/era-rules';
import { creature } from '../sim/creatures';
import { BIOME_ART, biomeArtPath, radarGlyphPath } from '../shared/environment-assets';
import { BAND_COLOR } from '../sim/types';
import { appBase } from '../shared/base';

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
  // Red edges indicate low health only; predator awareness has its own text and arrow.
  const healthWarning = p.alive && p.hpMax > 0
    ? Math.max(0, Math.min(1, (0.3 - p.hp / p.hpMax) / 0.3))
    : 0;
  return (
    <>
      <div className="health-vignette" aria-hidden="true" style={{ opacity: healthWarning }} />
      {p.bandMarkers.map((m, k) => (
        <span key={k} className={`marker marker-${m.band}`} style={{ left: `${m.x * 100}%`, top: `${m.y * 100}%`, ['--s' as string]: m.size, maskImage: `url(${appBase()}${assetPaths.ui(`band-${m.band}.svg`)})`, color: BAND_COLOR[m.band] }} />
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
          {p.era
            ? <span className="tier-num rung-num" role="img" aria-label={`Rung ${p.era.rung}, ${p.era.rungName}. Standing ${Math.round(p.era.standing)}`}><small>RUNG</small>{RUNG_NUMERALS[p.era.rung] ?? p.era.rung}</span>
            : <span className="tier-num" role="img" aria-label={`Tier ${p.tier + 1}: ${p.tierName}`}><i className="tier-glyph" style={{ maskImage: `url(${appBase()}${assetPaths.ui(`tier-${p.tier + 1}.svg`)})` }} /></span>}
        </div>
        <div className="bars">
          <div className="name-row"><b>{def.name}</b><span className="tier-name">{p.tierName}</span>{p.protect && <span className="protect">PROTECTED</span>}{p.era?.inRange && <span className="range-chip">RANGE</span>}</div>
          <div className="bar hp"><i style={{ width: `${(p.hp / p.hpMax) * 100}%` }} /></div>
          <div className={`bar stamina ${p.exhausted ? 'exhausted' : ''}`}><i style={{ width: `${(p.stamina / p.staminaMax) * 100}%` }} /></div>
          {p.era?.air != null && <div className={`bar air ${p.era.air < 0.25 ? 'low' : ''}`} aria-label={`Air ${Math.round(p.era.air * 100)}%`}><i style={{ width: `${p.era.air * 100}%` }} /></div>}
        </div>
      </div>
      {p.era && <EraStatus era={p.era} alive={p.alive} />}
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
        <div className={`chip ability ${p.abilityUnlocked ? '' : 'locked'} ${p.abilityActive ? 'active' : ''}`} title={hideDescription(def.id)}>
          <span className="btn y">Y</span>
          <span className="chip-label">{p.abilityUnlocked ? p.abilityName : 'Hide'}</span>
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
 * The radar: anything big enough to hurt within reach, whatever is hunting you, the nearest shoals
 * worth eating, plus home and the shore as bearings. Up is the way the camera looks. Only the other
 * players — and the two bearings — carry off the edge, hollow on the rim pointing the way; a
 * creature outside the reach is simply not on the dial.
 */
function Radar({ radar, biome }: { radar: PlayerHud['radar']; biome: string }) {
  const R = 44, C = 50;
  const outline = useId().replaceAll(':', '');
  const dot = (b: RadarBlipHud, k: number) => {
    const x = C + b.x * R * 0.92, y = C + b.y * R * 0.92;
    const cls = `blip blip-${b.kind} ${b.beyond ? 'beyond' : ''} ${b.hunting ? 'hunting' : ''}`;
    if (b.kind === 'deadzone') {
      // an area, not a contact: a ring the size of the zone, or a dashed marker on the rim when out of reach
      const rr = Math.max(3, Math.min(R, (b.r ?? 0.1) * R));
      return <g key={k} className={cls} style={{ color: b.color }}>
        {b.beyond ? <circle cx={C + b.x * R} cy={C + b.y * R} r={3.5} fill="none" stroke="currentColor" strokeWidth="1.2" strokeDasharray="2 1.5" />
          : <circle cx={x} cy={y} r={rr} fill="currentColor" fillOpacity=".18" stroke="currentColor" strokeWidth=".9" strokeDasharray="2 1.5" />}
      </g>;
    }
    if (b.kind === 'food') {
      // A shoal is a patch, not a pip: a soft disc the size of the school with a few bodies in it.
      const rr = Math.max(2.5, Math.min(R * 0.5, (b.r ?? 0.05) * R));
      return <g key={k} className={cls} style={{ color: b.color }}>
        <circle cx={x} cy={y} r={rr} fill="currentColor" fillOpacity=".16" stroke="currentColor" strokeWidth=".7" strokeOpacity=".7" />
        <circle cx={x} cy={y} r={1.3} fill="currentColor" />
        <circle cx={x - rr * .45} cy={y + rr * .35} r={1} fill="currentColor" />
        <circle cx={x + rr * .4} cy={y - rr * .4} r={1} fill="currentColor" />
      </g>;
    }
    if (b.kind === 'shore') {
      const sx = C + b.x * R, sy = C + b.y * R;
      const angle = Math.atan2(b.y, b.x) * 180 / Math.PI + 90;
      return <g key={k} className={cls} style={{ color: b.color }} transform={`rotate(${angle} ${sx} ${sy})`}>
        <use href={`${appBase()}${radarGlyphPath('shore')}#glyph`} x={sx - 10} y={sy - 5} width="20" height="10" />
      </g>;
    }
    const size = b.kind === 'giant' ? 11 : 9;
    return <g key={k} className={cls} style={{ color: b.color }}>
      <g filter={b.beyond ? `url(#${outline})` : undefined}>
        <use href={`${appBase()}${radarGlyphPath(b.kind)}#glyph`} x={x - size / 2} y={y - size / 2} width={size} height={size}/>
      </g>
    </g>;
  };
  // rim contacts last so they draw over the ring
  const inside = radar.blips.filter((b) => !b.beyond), rim = radar.blips.filter((b) => b.beyond);
  return (
    <div className="radar" aria-label={`Radar, ${Math.round(radar.range)} metre reach. ${biome}. ${radar.blips.filter((b) => b.kind === 'food').length} food shoals nearby.`}>
      <svg viewBox="0 0 100 100">
        <defs><filter id={outline} colorInterpolationFilters="sRGB">
          <feMorphology in="SourceAlpha" operator="erode" radius=".7" result="inside"/>
          <feComposite in="SourceGraphic" in2="inside" operator="out"/>
        </filter></defs>
        <circle cx={C} cy={C} r={R} className="radar-bg" />
        <circle cx={C} cy={C} r={R * 0.5} className="radar-ring" />
        <line x1={C} y1={C - R} x2={C} y2={C + R} className="radar-ring" />
        <line x1={C - R} y1={C} x2={C + R} y2={C} className="radar-ring" />
        <use href={`${appBase()}${radarGlyphPath('player')}#glyph`} x={C - 5} y={C - 5} width="10" height="10" className="radar-you" />
        {inside.map(dot)}{rim.map(dot)}
        <circle cx={C} cy={C} r={R} className="radar-rim" />
      </svg>
      <span className="radar-range">{Math.round(radar.range)} m</span>
    </div>
  );
}

const RUNG_NUMERALS = ['', 'I', 'II', 'III', 'IV'];

/**
 * The era's own standing readouts: the Dominant countdown, dead-zone and beaching warnings, and
 * the last few standing sources as a fading ticker under the ring.
 */
function EraStatus({ era, alive }: { era: EraHud; alive: boolean }) {
  if (!alive) return null;
  const warn = era.inDeadZone ? (era.air != null ? 'DEAD WATER · your gills are fine, theirs are not' : 'DEAD WATER · no oxygen, get out') : era.beached ? 'ON THE SAND · nothing with gills can follow' : era.air != null && era.air < 0.25 ? 'AIR LOW · surface and gulp' : '';
  return (
    <div className="era-status">
      {era.dominantT > 0 && <div className="dominant"><span>DOMINANT</span><b>{Math.max(0, Math.ceil(90 - era.dominantT))}</b></div>}
      {warn && <div className={`era-warn ${era.inDeadZone && era.air == null ? 'danger' : ''}`}>{warn}</div>}
      {era.recent.length > 0 && <div className="standing-ticker">{era.recent.slice(-3).map((r, k) => <span key={`${r}-${k}`}>{r}</span>)}</div>}
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
  const art = BIOME_ART.find(b => b.name === shown);
  return shown ? <div className="biome-banner" key={shown}>
    {art && <img src={`${appBase()}${biomeArtPath(art.id)}`} alt="" aria-hidden="true" />}
    <span>ENTERING</span><b>{shown}</b></div> : null;
}
