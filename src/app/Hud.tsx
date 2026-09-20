import { assetPaths } from '../content/asset-paths';
import { hideDescription } from '../sim/concealment';
import { useEffect, useId, useRef, useState } from 'react';
import type { HudSnapshot, PlayerHud, RadarBlipHud } from '../render/engine';
import { PLAYER_COLORS } from '../render/engine';
import type { EraHud } from '../sim/era-rules';
import { creature } from '../sim/creatures';
import { BIOME_ART, biomeArtPath, radarGlyphPath } from '../shared/environment-assets';
import { BAND_COLOR, CALM_MARK } from '../sim/types';
import { CreaturePortrait } from './CreaturePortrait';
import { appBase } from '../shared/base';
import { fillControls, key, type Scheme } from '../shared/controls';
import { TEXT } from '../shared/text';

/** Every word this panel says; see `src/content/strings.ts`. */
const COPY = TEXT.hud;

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

/**
 * One player's half of the screen.
 *
 * Sense off is meant to read as the bare simulation: nothing over the sea at all. So it takes down
 * the whole panel — the gauges, the name, the radar, the band marks, the day dial, the biome
 * banner, the hints and warnings, even the red edges of low health — and leaves a single faint mark
 * naming the button that brings it back.
 *
 * The aim reticle goes with the rest, and nothing is lost with it: it is drawn dead centre because
 * `updateAim` picks its target by angular distance from the camera's forward axis, so with it gone
 * the centre of the view is still the aim point — implied rather than drawn.
 *
 * Four things survive it, and they are all the player's own doing rather than a readout of the
 * world: a menu they opened themselves (teleport, change-creature, the held scoreboard), the fade
 * that takes the screen on a respawn, the line that says what killed them — without that last one
 * a death is a fade to black with no account of itself — and the grip, which is the player holding
 * a button down and is the one thing on the screen that says the button is doing anything.
 */
function PlayerPanel({ p }: { p: PlayerHud }) {
  const s = p.scheme;
  return (
    <>
      {p.senseOn && <SensePanel p={p} />}
      {!p.senseOn && <SenseOffMark s={s} />}
      {p.teleport && <TeleportMenu t={p.teleport} s={s} />}
      {p.swap && <SwapMenu swap={p.swap} s={s} />}
      {p.board && <Scoreboard board={p.board} me={p.index} />}
      {p.grip && p.alive && <GripPanel grip={p.grip} s={s} />}
      <div className="fade" style={{ opacity: p.fade }} />
      {p.spectating && !p.alive && (
        <div className="spectating"><b>{COPY.spectating}</b><span style={{ color: p.spectating.color }}>{p.spectating.name} · {creature(p.spectating.creature).name}</span></div>
      )}
      {!p.alive && p.fade < 0.9 && <DeathNote p={p} />}
    </>
  );
}

/**
 * A single faint line saying the readouts are off and which button brings them back. It is bright
 * for a moment as sense goes off — so the player sees what just happened — and then settles to
 * something that barely registers against the water.
 */
function SenseOffMark({ s }: { s: Scheme }) {
  return (
    <div className="sense-off-mark" role="status" aria-label={COPY.senseOffLabel(key('sense', s))}>
      <span className="btn dpad">{key('sense', s)}</span><span>{COPY.senseOff}</span>
    </div>
  );
}

/** Everything sense draws over the sea. */
function SensePanel({ p }: { p: PlayerHud }) {
  const def = creature(p.creature);
  // Every prompt on this half of the screen is written in whatever this player is holding.
  const s = p.scheme;
  const R = 30, C = 2 * Math.PI * R;
  // Red edges indicate low health only; predator awareness has its own text and arrow.
  const healthWarning = p.alive && p.hpMax > 0
    ? Math.max(0, Math.min(1, (0.3 - p.hp / p.hpMax) / 0.3))
    : 0;
  return (
    <>
      <div className="health-vignette" aria-hidden="true" style={{ opacity: healthWarning }} />
      {p.bandMarkers.map((m, k) => (
        <span key={k} className={`marker marker-${m.band}${m.hot ? ' hot' : ''}`} style={{ left: `${m.x * 100}%`, top: `${m.y * 100}%`, ['--s' as string]: m.size, maskImage: `url(${appBase()}${assetPaths.ui(`band-${m.band}.svg`)})`, color: m.hot ? BAND_COLOR.giant : CALM_MARK }} />
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
            ? <span className="tier-num rung-num" role="img" aria-label={COPY.rungAria(p.era.rung, p.era.rungName, p.era.stage, moultLabel(p.progress))}><small>{COPY.rungLabel}</small>{RUNG_NUMERALS[p.era.rung] ?? p.era.rung}</span>
            : <span className="tier-num" role="img" aria-label={COPY.tierAria(p.tier + 1, p.tierName, moultLabel(p.progress))}><i className="tier-glyph" style={{ maskImage: `url(${appBase()}${assetPaths.ui(`tier-${p.tier + 1}.svg`)})` }} /></span>}
        </div>
        <div className="bars">
          <div className="name-row"><b>{def.name}</b><span className="tier-name">{p.tierName}</span>{p.protect && <span className="protect">{COPY.protected}</span>}</div>
          <div className="bar hp"><i style={{ width: `${(p.hp / p.hpMax) * 100}%` }} /></div>
          <div className={`bar stamina ${p.exhausted ? 'exhausted' : ''}`}>
            <i style={{ width: `${(p.stamina / p.staminaMax) * 100}%` }} />
            {/* The era's one new rule, on the bar it is about. An air-breather's stamina does not
                come back under water and fills at the surface, and the bar said nothing about
                either — so the game said it in a sentence, twice, and then in a sound once a
                second. A mark on the bar says it continuously and silently: barred while the
                recovery is off, an arrow up once the bar is spent and the fix is the surface. */}
            {/* The mark is now about the breath being *gone*, which is the only state that stops
                recovery. While there is air in the chest a lung is simply a lung. */}
            {p.era?.air && !p.era.atSurface && (p.era.airLeft ?? 1) <= 0
              && <i className={`air-mark ${p.stamina < p.staminaMax * 0.25 ? 'urgent' : ''}`}
                   role="img"
                   aria-label={p.stamina < p.staminaMax * 0.25 ? COPY.airSurfaceNow : COPY.airRecoveryOff}
                   style={{ maskImage: `url(${appBase()}${assetPaths.ui(p.stamina < p.staminaMax * 0.25 ? 'air-surface.svg' : 'air-recovery-off.svg')})` }} />}
          </div>
          {/* The breath being held, under the bar it governs. It is a clock on a dive rather than a
              second health bar, so it is thin and quiet until its last minute, when it flashes. */}
          {p.era?.airLeft != null && (
            <div className={`bar air ${p.era.airLow ? 'low' : ''}`}
                 role="img"
                 aria-label={COPY.airBarAria(Math.round(p.era.airLeft * 100), !!p.era.airLow)}>
              <i style={{ width: `${p.era.airLeft * 100}%` }} />
            </div>
          )}
          {/* A water-breather's minute on the sand: the same thin bar, drawn only while it is out of
              the water, because under water a gill has nothing to count (src/sim/beach.ts). */}
          {p.strandLeft != null && (
            <div className={`bar air strand ${p.strandLow ? 'low' : ''}`}
                 role="img"
                 aria-label={COPY.strandBarAria(Math.round(p.strandLeft * 100), !!p.strandLow)}>
              <i style={{ width: `${p.strandLeft * 100}%` }} />
            </div>
          )}
        </div>
      </div>
      {p.ashore && p.alive && <ShoreStatus stranded={p.strandLeft != null} low={!!p.strandLow} />}
      {p.era && <EraStatus era={p.era} alive={p.alive} ashore={p.ashore} />}
      {p.aim && (
        <div className={`aim ${p.aim.hasTarget ? 'on-target' : ''} ${p.aim.inRange ? 'in-range' : ''} ${p.aim.ready ? '' : 'cooling'}`} style={{ color: p.aim.color }}>
          <i /><i /><i /><i /><b />
          <span className="aim-label">{p.aim.inRange ? (p.aim.ready ? `${key('heavy', s)} · ${p.aim.action}` : COPY.aimCooling) : p.aim.name ?? ''}</span>
        </div>
      )}
      {p.lock && !p.aim && (
        <div className="lock-panel" style={{ color: p.lock.color }}>
          <span className="lock-band">{p.lock.band.toUpperCase()}</span>
          <b>{p.lock.name}</b>
          {p.lock.kind && <span className="lock-kind">{p.lock.kind}</span>}
          <div className="bar target"><i style={{ width: `${p.lock.hp * 100}%` }} /></div>
        </div>
      )}
      {p.notice && !p.board && <p className="notice">{p.notice}</p>}
      <BiomeBanner biome={p.biome} alive={p.alive} />
      <DayPhase day={p.day} />
      <Radar radar={p.radar} biome={p.biome} />
      <div className="hud-bottom">
        <div className={`chip ability ${p.abilityUnlocked ? '' : 'locked'} ${p.abilityActive ? 'active' : ''}`} title={fillControls(hideDescription(def.id), s)}>
          <span className="btn y">{key('ability', s)}</span>
          <span className="chip-label">{p.abilityUnlocked ? p.abilityName : COPY.hideChip}</span>
          <i className="cool" style={{ transform: `scaleX(${p.abilityUnlocked ? p.abilityReady : 0})` }} />
        </div>
        {/* Only ever drawn with sense on, so the chip is only ever the way out of it. */}
        <div className="chip sense ready active" title={COPY.senseChipTitle}>
          <span className="btn dpad">{key('sense', s)}</span><span className="chip-label">{COPY.senseChip}</span>
          <i className="cool" style={{ transform: 'scaleX(1)' }} />
        </div>
        <div className="tally"><span>{COPY.tallyEaten(p.eats)}</span><span>{COPY.tallyKills(p.kills)}</span><span>{COPY.tallyEscapes(p.escapes)}</span></div>
      </div>
      {p.hunterState !== 'none' && (
        <div className={`threat-alert ${p.hunterState}`}>
          <span className="eye"><i style={{ transform: `scaleX(${Math.min(1, p.hunted)})` }} /></span>
          <div>
            <b>{p.hunterState === 'hunting' ? COPY.threat.hunting(p.hunterName ?? COPY.threat.unknown) : COPY.threat.noticed(p.hunterName ?? COPY.threat.unknown)}</b>
            <span>{p.hunterState === 'hunting' ? (p.inCover ? (p.still ? COPY.threat.huntingInCoverStill : COPY.threat.huntingInCover) : COPY.threat.huntingOpen) : (p.still ? COPY.threat.noticedStill : COPY.threat.noticedMoving)}</span>
          </div>
        </div>
      )}
      {!p.modelReady && p.alive && <p className="hint">{COPY.modelLoading}</p>}
      {p.hint && p.hunterState === 'none' && p.modelReady && <p className="hint">{fillControls(p.hint, s)}</p>}
      {/* Co-op: where a team-mate went down, and how long is left to reach them. */}
      {p.downedAllies.map((d) => (
        <div key={d.index} className="downed-arrow" style={{ color: d.color, transform: `rotate(${Math.atan2(d.x, -d.y) * 180 / Math.PI}deg)` }} aria-hidden>
          <svg viewBox="0 0 24 24"><path d="M12 3 L18 15 L12 12 L6 15 Z" fill="currentColor" /></svg>
        </div>
      ))}
      {p.downedAllies.length > 0 && (
        <div className="downed-call">
          {p.downedAllies.map((d) => (
            <p key={d.index} style={{ ['--player' as string]: d.color }}>
              <b>{COPY.downed.heading(d.index + 1)}</b>
              <span>{d.progress > 0 ? COPY.downed.reviving : COPY.downed.distance(fmtDist(d.distance), Math.ceil(d.seconds))}</span>
              <i className="revive-bar" style={{ transform: `scaleX(${d.progress})` }} />
            </p>
          ))}
        </div>
      )}
    </>
  );
}

/**
 * What you have hold of, while you have hold of it.
 *
 * The grip used to happen entirely in silence: a recording of a player trying to grab a giant had
 * the grip closing three separate times and carrying them thirteen seconds, while the player — who
 * could see none of that — reported that grabbing did not work. Every part of it was already
 * knowable, so this says all of it: what is in the grip, what letting go would do to it, and how
 * long that stays true. Without the last line a ride is a thing that happens *to* you.
 *
 * A settled ride shows no clock, because there is nothing timing it: holding on costs nothing and
 * ends when the player lets go. What the bar counts, when there is one, is a window that is about
 * to change what the button means.
 */
function GripPanel({ grip, s }: { grip: NonNullable<PlayerHud['grip']>; s: Scheme }) {
  if (grip.kind === 'spent') {
    return (
      <div className="grip-panel spent">
        <b>{COPY.grip.spent}</b>
        <span>{COPY.grip.spentNote}</span>
      </div>
    );
  }
  if (grip.kind === 'held') {
    return (
      <div className="grip-panel lost" style={{ color: BAND_COLOR[grip.band] }}>
        <b>{COPY.grip.heldBy(grip.name)}</b>
        <div className="bar grip"><i style={{ width: `${(grip.left ?? 1) * 100}%` }} /></div>
        <span>{COPY.grip.breakFree(key('dash', s))}</span>
      </div>
    );
  }
  const ride = grip.kind === 'ride';
  // What letting go would do, in the player's own words. The two windows both run from contact and
  // both change what the button means, so the line changes with them rather than describing a grip
  // in general.
  const say = {
    strike: COPY.grip.releaseToStrike,
    eat: COPY.grip.releaseToEat,
    escape: COPY.grip.workingLoose,
    nothing: COPY.grip.biteOrLetGo(key('light', s)),
  }[grip.release];
  return (
    <div className={`grip-panel ${grip.release === 'strike' ? 'strike' : ''} ${grip.release === 'escape' ? 'lost' : ''}`} style={{ color: BAND_COLOR[grip.band] }}>
      <b>{ride ? COPY.grip.holdingOn : COPY.grip.inYourJaws} · {grip.name}</b>
      {/* A bar only while something is actually running down — the strike window on a ride, the
          meal window on a mouthful. A settled ride has no clock, so it is given nothing that looks
          like one. */}
      {grip.left !== undefined && <div className="bar grip"><i style={{ width: `${grip.left * 100}%` }} /></div>}
      <span>{say}</span>
    </div>
  );
}

/**
 * A line of menu footer, with `**...**` drawn as a key cap. The copy stays one string in the text
 * table — which is what a translator needs — while the buttons in it still read as buttons.
 */
function Keys({ text }: { text: string }) {
  return <>{text.split('**').map((part, i) => (i % 2 ? <kbd key={i}>{part}</kbd> : part))}</>;
}

/** Where else you could be, and how far. Opened with the teleport button, so sense never hides it. */
function TeleportMenu({ t, s }: { t: NonNullable<PlayerHud['teleport']>; s: Scheme }) {
  return (
    <div className="tele-menu">
      <p className="eyebrow">{COPY.teleport.eyebrow}</p>
      <ul>
        {t.options.map((o, k) => (
          <li key={k} className={k === t.index ? 'sel' : ''}>
            <b>{o.label}</b>
            <span>{o.detail} · {fmtDist(o.distance)}</span>
          </li>
        ))}
      </ul>
      <small>{t.cooldown > 0 ? COPY.teleport.cooling(Math.ceil(t.cooldown)) : <Keys text={COPY.teleport.ready(key('confirm', s), key('back', s), key('teleport', s))} />}</small>
    </div>
  );
}

/** The change-creature page of the same menu. */
function SwapMenu({ swap, s }: { swap: NonNullable<PlayerHud['swap']>; s: Scheme }) {
  return (
    <div className="tele-menu swap-menu">
      <p className="eyebrow">{COPY.swap.eyebrow}</p>
      <div className="swap-body">
        <CreaturePortrait creatureId={swap.creature} kind="thumb" assetBase={appBase()} alt="" draggable={false} loading="eager" />
        <div>
          <b>{swap.name}</b>
          {swap.kind && <span className="swap-kind">{swap.kind}</span>}
          <span className="swap-rung">{swap.rung}{swap.kept ? COPY.swap.keptProgress : swap.grown ? COPY.swap.fullyGrown : COPY.swap.hatchling}</span>
          <i className="swap-fill"><b style={{ transform: `scaleX(${swap.fill})` }} /></i>
        </div>
      </div>
      <small><kbd>◀▶</kbd> <Keys text={COPY.swap.footer(key('ability', s), swap.grown, swap.index + 1, swap.count, key('confirm', s), key('back', s))} /></small>
    </div>
  );
}

/**
 * What happened to you, while you watch it happen. Deliberately not a dialog: death used to put a
 * red panel over the middle of the screen the instant you died, which hid the one thing worth
 * seeing — the animal that got you, finishing the job. This is a line of text low on the viewport,
 * over an unobstructed view, until the screen fades out for the respawn.
 *
 * A downed team-mate is the exception that still needs a meter, because their seconds are a race
 * somebody else is running; it gets the same low, quiet treatment with the rescue bar under it.
 */
function DeathNote({ p }: { p: PlayerHud }) {
  const downed = p.downedFor > 0;
  return (
    <div className={`death-note ${downed ? 'downed' : ''} ${p.spectating ? 'spectating-too' : ''}`}>
      <b>{downed ? COPY.death.down : p.death?.eaten ? COPY.death.eaten : COPY.death.killed}
        {!downed && p.death?.by && <i>{COPY.death.by(p.death.by)}</i>}</b>
      <span>{downed
        ? (p.reviveProgress > 0 ? COPY.death.beingRevived : COPY.death.reviveWindow(Math.ceil(p.downedFor)))
        : COPY.death.demoted}</span>
      {downed && <i className="revive-bar wide" style={{ transform: `scaleX(${p.reviveProgress})` }} />}
    </div>
  );
}

/**
 * The scoreboard, held open with the View button. Everyone in the running, sorted by whatever the
 * mode is actually about, with the viewer's own row marked. Bots are on it too: in a mode where
 * they fill the empty seats they are as much of a rival as anyone.
 */
function Scoreboard({ board, me }: { board: NonNullable<PlayerHud['board']>; me: number }) {
  const { header, rows } = board;
  return (
    <div className="scoreboard">
      <div className="board-head">
        <p className="eyebrow">{header.title}</p>
        {header.clock != null && <b className="board-clock">{fmtClock(header.clock)}</b>}
      </div>
      <p className="board-detail">{header.detail}</p>
      <ol>
        {rows.map((r, k) => (
          <li key={k} className={`board-row ${r.player === me ? 'you' : ''} ${r.hunting ? 'hunting' : ''} ${r.alive ? '' : 'down'}`}
            style={{ ['--player' as string]: r.player >= 0 ? PLAYER_COLORS[r.player % 4] : '#8fa3a8' }}>
            <span className="board-who">{r.player >= 0 ? TEXT.common.playerChip(r.player + 1) : COPY.scoreboard.bot}</span>
            <span className="board-name">
              <b>{r.name}</b>
              <small>{r.rank}{r.hunting ? COPY.scoreboard.hunting : ''}{r.alive ? '' : COPY.scoreboard.down}</small>
              <i className="board-bar" style={{ transform: `scaleX(${r.progress})` }} />
            </span>
            {r.score != null && <span className="board-score" title={COPY.scoreboard.caught}>{r.score}</span>}
            <span className="board-tally">
              <small>{COPY.scoreboard.tally(r.kills, r.eats)}</small>
              <small>{r.player === me ? r.biome : fmtDist(r.distance)}</small>
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

/**
 * The ring reads the same in both eras: how close the next moult is. Full means the body grows —
 * a tier in the Cambrian, a life stage in the Devonian — so it is spoken as one thing.
 */
const moultLabel = (progress: number) => progress >= 1 ? COPY.fullyGrown : COPY.toNextMoult(Math.round(progress * 100));
const fmtClock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

const fmtDist = (d: number) => (d < 1000 ? TEXT.common.metres(Math.round(d)) : TEXT.common.kilometres((d / 1000).toFixed(1)));

/**
 * The radar: the nearest thing big enough to hurt, whatever is hunting you, the nearest shoal
 * worth eating, plus home and the shore as bearings. Up is the way the camera looks. Only the other
 * players — and the two bearings — carry off the edge, hollow on the rim pointing the way; a
 * creature outside the reach is simply not on the dial. Reach itself is the player's own size
 * (`radarRange` in `src/sim/game.ts`), so a hatchling reads its own thicket and a giant reads the
 * water it can actually cross.
 */
/** Spoken form of the food contacts, including whether they are over your head. */
function foodLabel(blips: readonly RadarBlipHud[]): string {
  const food = blips.filter((b) => b.kind === 'food');
  if (!food.length) return COPY.radar.noFood;
  const l = food[0].level;
  return l === 'above' ? COPY.radar.foodAbove : l === 'below' ? COPY.radar.foodBelow : COPY.radar.foodNear;
}

function Radar({ radar, biome }: { radar: PlayerHud['radar']; biome: string }) {
  const R = 44, C = 50;
  const outline = useId().replaceAll(':', '');
  /**
   * A dial drawn from overhead cannot show depth, so a contact that is well above or below carries a
   * chevron: pointing up for water above you, down for the floor below. Shoals also change colour
   * (see `FOOD_ABOVE`), because whether the food is over your head decides what you do about it.
   */
  const chevron = (b: RadarBlipHud, x: number, y: number, off: number) => b.level && (
    b.level === 'above'
      ? <path d={`M ${x - 2.6} ${y - off} L ${x} ${y - off - 2.4} L ${x + 2.6} ${y - off}`} fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
      : <path d={`M ${x - 2.6} ${y + off} L ${x} ${y + off + 2.4} L ${x + 2.6} ${y + off}`} fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
  );
  const dot = (b: RadarBlipHud, k: number) => {
    const x = C + b.x * R * 0.92, y = C + b.y * R * 0.92;
    const cls = `blip blip-${b.kind} ${b.beyond ? 'beyond' : ''} ${b.hunting ? 'hunting' : ''} ${b.level ? `blip-${b.level}` : ''}`;
    if (b.kind === 'deadzone') {
      // an area, not a contact: a ring the size of the zone, or a dashed marker on the rim when out of reach
      const rr = Math.max(3, Math.min(R, (b.r ?? 0.1) * R));
      return <g key={k} className={cls} style={{ color: b.color }}>
        {b.beyond ? <circle cx={C + b.x * R} cy={C + b.y * R} r={3.5} fill="none" stroke="currentColor" strokeWidth="1.2" strokeDasharray="2 1.5" />
          : <circle cx={x} cy={y} r={rr} fill="currentColor" fillOpacity=".18" stroke="currentColor" strokeWidth=".9" strokeDasharray="2 1.5" />}
      </g>;
    }
    if (b.kind === 'territory') {
      // Held ground: a ring you can see the edge of, so entering it is a choice rather than a
      // surprise. Drawn under everything else — it is a place, not a contact.
      const rr = Math.max(4, Math.min(R * 1.4, (b.r ?? 0.1) * R));
      return <g key={k} className={cls} style={{ color: b.color }}>
        {b.beyond
          ? <circle cx={C + b.x * R} cy={C + b.y * R} r={3} fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="1.5 2" />
          : <circle cx={x} cy={y} r={rr} fill="currentColor" fillOpacity=".07" stroke="currentColor" strokeWidth=".9" strokeDasharray="3 2.5" />}
      </g>;
    }
    if (b.kind === 'landmark') {
      // A small hollow diamond: a place, not a creature. Drawn inline rather than as a glyph
      // asset so an era that has no landmark artwork still gets the mark.
      return <g key={k} className={cls} style={{ color: b.color }}>
        <path d={`M ${x} ${y - 3.6} L ${x + 3.2} ${y} L ${x} ${y + 3.6} L ${x - 3.2} ${y} Z`} fill="none" stroke="currentColor" strokeWidth="1.3" />
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
        {chevron(b, x, y, rr + 1.6)}
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
      {chevron(b, x, y, size / 2 + 1)}
    </g>;
  };
  // rim contacts last so they draw over the ring
  const rank = (b: RadarBlipHud) => (b.kind === 'territory' || b.kind === 'deadzone' ? 0 : 1);
  const inside = radar.blips.filter((b) => !b.beyond).sort((a2, b2) => rank(a2) - rank(b2));
  const rim = radar.blips.filter((b) => b.beyond);
  return (
    <div className="radar" aria-label={COPY.radar.label(Math.round(radar.range), biome, foodLabel(radar.blips))}>
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
      <span className="radar-range">{COPY.radar.range(Math.round(radar.range))}</span>
    </div>
  );
}

const RUNG_NUMERALS = ['', 'I', 'II', 'III', 'IV'];

/** Every era's shore, said the same way: what the sand is doing to this body and the way off it. */
function ShoreStatus({ stranded, low }: { stranded: boolean; low: boolean }) {
  const warn = stranded ? (low ? COPY.ashoreStrandedNow : COPY.ashoreStranded) : COPY.ashore;
  return <div className="era-status"><div className={`era-warn ${stranded ? 'danger' : ''}`}>{warn}</div></div>;
}

/**
 * The era's own standing readouts: the Dominant countdown, dead-zone and beaching warnings, and
 * the last few standing sources as a fading ticker under the ring.
 */
function EraStatus({ era, alive, ashore }: { era: EraHud; alive: boolean; ashore: boolean }) {
  if (!alive) return null;
  const W = COPY.warnings;
  const warn = era.inDeadZone ? (era.bimodal ? W.deadWaterBimodal : W.deadWater)
    : era.beached && !ashore ? W.beached
    : era.heldUnder ? W.heldUnder
    : (era.shoreWarn ?? 0) > 0 ? W.shoreReaching
    : era.drowning ? W.drowning
    : era.air && !era.atSurface && (era.airLeft ?? 1) <= 0 ? W.outOfAir
    : era.airLow ? W.airRunningOut : '';
  const danger = (era.inDeadZone && !era.bimodal) || era.heldUnder || (era.shoreWarn ?? 0) > 0 || !!era.drowning || !!era.airLow;
  return (
    <div className="era-status">
      {era.primeT > 0 && <div className="dominant"><span>{W.primeCountdown}</span><b>{Math.max(0, Math.ceil(90 - era.primeT))}</b></div>}
      {warn && <div className={`era-warn ${danger ? 'danger' : ''}`}>{warn}</div>}
    </div>
  );
}

/** Announces the biome for a few seconds whenever it changes. */
/**
 * The hour, above the radar. A dial that fills as the phase runs out, and the phase's name.
 *
 * Dusk and dawn are when the reef hunts, so they are called out plainly and the ring goes warm:
 * the player needs to be able to see the dangerous part of the day coming and decide whether to
 * be out in the open for it.
 */
function DayPhase({ day }: { day: PlayerHud['day'] }) {
  const hot = day.phase === 'dusk' || day.phase === 'dawn';
  return (
    <div className={`day-phase ${day.phase} ${hot ? 'hunting' : ''}`} aria-label={COPY.day.label(day.phase, Math.ceil(day.until))}>
      <span className="day-mark" aria-hidden>{day.phase === 'night' ? '☾' : day.phase === 'day' ? '☀' : '◐'}</span>
      <span className="day-text">
        <b>{day.phase.toUpperCase()}</b>
        <small>{hot ? COPY.day.hunting : COPY.day.seconds(Math.ceil(day.until))}</small>
      </span>
    </div>
  );
}

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
    <span>{COPY.biomeBanner}</span><b>{shown}</b></div> : null;
}
