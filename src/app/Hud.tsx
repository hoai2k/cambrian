import type { HudSnapshot, PlayerHud } from '../render/engine';
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
  // Red edges indicate low health only; predator awareness has its own text and arrow.
  const healthWarning = p.alive && p.hpMax > 0
    ? Math.max(0, Math.min(1, (0.3 - p.hp / p.hpMax) / 0.3))
    : 0;
  return (
    <>
      <div className="health-vignette" aria-hidden="true" style={{ opacity: healthWarning }} />
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
