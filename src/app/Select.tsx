import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ModelStatusBadge } from '../shared/ModelStatusBadge';
import { ACTIVE_ERA } from '../content';
import { assetPaths } from '../content/asset-paths';
import { hideLabel, hideDescription, HEAVY_SPECIALS, DEFENSIVE_SPECIALS } from '../sim/concealment';
import { RULES } from '../sim/era-rules';
import { CreaturePortrait } from './CreaturePortrait';
import { FeedbackButton } from './Feedback';
import { PLAYER_COLORS } from '../render/engine';
import { PLAYABLE as CREATURES, creature, type CreatureId } from '../sim/creatures';
import type { Mode, PlayerSetup } from '../sim/types';
import { CheckIcon, ChevronDown, Emblem, KeyboardIcon, PadIcon } from './icons';
import { appBase } from '../shared/base';
import { btn, fillControls, key, type Scheme } from '../shared/controls';
import { fillOf, ladderName, rungOf } from '../sim/ladder';

interface Props {
  players: PlayerSetup[]; mode: Mode; modes: Mode[]; modeInfo: Record<Mode, { name: string; blurb: string; players: string }>;
  allReady: boolean; padIndices: number[];
  /** Whatever everyone at this screen is holding: pad if any is connected, mouse and keyboard if not. */
  scheme: Scheme;
  /** Furthest mark on the growth ladder each creature has reached in Rise on this device. */
  best: Partial<Record<CreatureId, number>>;
  /** Per seat: whether that player has asked to carry on from their record rather than hatch. */
  carry: boolean[];
  onPick: (i: number, c: CreatureId) => void; onReady: (i: number) => void; onRemove: (i: number) => void;
  onAddKeyboard: () => void; onMode: (m: Mode) => void; onStart: () => void; onBack: () => void;
  onCarry: (i: number) => void;
}

/**
 * The mark in the corner: the emblem goes back, the title opens the other game.
 *
 * The *emblem* is the way home. A mark in the corner of a screen you arrived at from the title is
 * the affordance every site has taught, so it needs no arrow and no label of its own — the
 * accessible name carries what a sighted player reads from the position, and Escape does the same
 * on a keyboard. That is why there is no longer a "Title" button in the footer.
 *
 * The *title* beside it is the era picker — one button, wordmark and chevron together. Open, the
 * other game's wordmark drops in directly under this one, aligned to it and the same width: one
 * list of engraved titles with the one you are playing at the top of it, rather than a panel that
 * repeats itself. Switching is a page load and not a state change, deliberately — a live match's
 * simulation, queues and caches are built for one era and there is no runtime swap (see
 * src/content/index.ts) — so what drops down is a link, and it shows the game rather than naming
 * it. It lands on the other roster rather than the other title screen: this is a picker, and
 * arriving at PRESS START would undo the choice the player just made.
 */
function BrandHeader({ onBack }: { onBack: () => void }) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const sibling = ACTIVE_ERA.copy.sibling;
  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => { if (!wrap.current?.contains(e.target as Node)) setOpen(false); };
    // Escape closes the list and stops there: on this screen the app's own Escape goes back to the
    // title, and shutting a menu should never also leave the screen it was opened on.
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); setOpen(false); } };
    document.addEventListener('pointerdown', away);
    document.addEventListener('keydown', key, true);
    return () => { document.removeEventListener('pointerdown', away); document.removeEventListener('keydown', key, true); };
  }, [open]);
  const toggle = () => setOpen((o) => !o);
  return (
    <div className="brand">
      <button className="brand-home" onClick={onBack} aria-label={`Back to the ${ACTIVE_ERA.title} title screen`}>
        <Emblem size={34} />
      </button>
      {/* Title and chevron are one control, so they light up together: the chevron is a mark on the
          button saying it opens, not a button of its own beside it. The list hangs off that button,
          so what drops down starts on the same left edge and comes out the same width — both
          wordmarks are `.header-logo`, sized by one rule. */}
      <div className={`brand-titles ${open ? 'open' : ''}`} ref={wrap}>
        <button className="brand-title" onClick={sibling ? toggle : undefined} disabled={!sibling}
          aria-expanded={sibling ? open : undefined} aria-haspopup={sibling ? 'true' : undefined}
          aria-label={sibling ? `${ACTIVE_ERA.title} — choose which game to play` : ACTIVE_ERA.title}>
          <img className="header-logo" src={`${ASSETS}${ACTIVE_ERA.assets.logo}`} alt="" />
          {sibling && <ChevronDown width={18} height={18} aria-hidden="true" />}
        </button>
        {open && sibling && (
          <nav className="era-menu" aria-label="Choose a game">
            {/* Straight to the other game's roster, not its title screen: this is a picker, and
                landing back on PRESS START would undo the choice the player just made. */}
            <a className="era-item" href={`${ASSETS}${sibling.path}?screen=select`}>
              <img className="header-logo" src={`${ASSETS}${sibling.logo}`} alt={sibling.title} />
            </a>
          </nav>
        )}
      </div>
    </div>
  );
}

/**
 * The smallest a name may be squeezed, as a share of the size the tile would otherwise give it.
 * Below this it stops being a label, so anything still too long past here is cut off as before —
 * nothing on either roster reaches that, but a future twenty-letter genus would.
 */
const MIN_NAME_FIT = 0.68;

/**
 * A specimen's name, shrunk to fit rather than cut off.
 *
 * The tiles size their type off their own width already, but that sets one size for the whole
 * roster, and a roster is not one length of word: "Ctenorhabdotus" is twice "Ottoia" and used to
 * come out as "Ctenorhabdo…", which tells the player less than the animal's actual name does. So
 * the type scale stays as it is — it is what keeps the grid looking like a grid — and the few names
 * that overrun it are scaled down by exactly the amount they overrun by.
 *
 * `--fit` is a plain multiplier on the CSS font size, so the tile keeps ownership of what the name
 * is *normally* worth and this only ever takes away. The measurement is one pass: letter-spacing is
 * in em and so scales with the type, which makes text width very nearly linear in font size. It
 * re-runs when the tile changes width, and once more when the display face has finished loading,
 * because a name measured in the fallback face is measured against the wrong letters.
 */
function FitName({ name }: { name: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    let lastWidth = -1;
    const fit = () => {
      lastWidth = el.clientWidth;
      el.style.setProperty('--fit', '1');
      const room = el.clientWidth, wanted = el.scrollWidth;
      if (!room || !wanted || wanted <= room) return;
      // A pixel in hand. Both measurements are integers while the text itself is not, so a name
      // scaled to exactly the room it has can still round a hair over and get an ellipsis for it —
      // which is the whole thing this is here to prevent.
      el.style.setProperty('--fit', String(Math.max(MIN_NAME_FIT, (room - 1) / wanted)));
    };
    fit();
    // Shrinking the name changes its height, which the observer also reports: only a change of
    // width is a reason to measure again, or the correction feeds itself.
    const ro = new ResizeObserver(() => { if (el.clientWidth !== lastWidth) fit(); });
    ro.observe(el);
    document.fonts?.ready.then(fit).catch(() => undefined);
    return () => ro.disconnect();
  }, [name]);
  return <span className="cell-name" ref={ref}>{name}</span>;
}

const stat = (v: number, max: number) => Math.round((v / max) * 5);
const ASSETS = appBase();

/** Grid columns: three rows at most, so 21 creatures sit in 7 x 3 and 8 sit in 4 x 2. */
export const gridColumns = (n: number) => Math.max(4, Math.ceil(n / 3));

export function SelectScreen(p: Props) {
  const s = p.scheme;
  const cols = gridColumns(CREATURES.length);
  const compact = p.players.length >= 3;
  // Controllers the game can see that have not joined yet, and joined players whose controller
  // has since gone away (an Xbox pad that went to sleep looks exactly like an unplugged one).
  const joined = new Set(p.players.map((pl) => pl.device));
  const waiting = p.padIndices.filter((i) => !joined.has(i));
  return (
    <section className="select" aria-label="Choose your creature">
      <header className="select-header">
        <BrandHeader onBack={p.onBack} />
        <div className="mode-picker" role="tablist" aria-label="Game mode">
          {p.modes.map((m) => (
            <button key={m} role="tab" aria-selected={p.mode === m} className={`mode-chip ${p.mode === m ? 'active' : ''}`} onClick={() => p.onMode(m)}>
              <img className="mode-art" src={`${ASSETS}${assetPaths.ui(`mode-${m}.webp`)}`} alt="" />
              <span>{p.modeInfo[m].name}</span><small>{p.modeInfo[m].players}</small>
            </button>
          ))}
        </div>
        <p className="mode-blurb">{p.modeInfo[p.mode].blurb} <span className="dim">{btn('modePrev', s)} / {btn('modeNext', s)} switch modes.</span></p>
      </header>

      <div className="pick-layout">
        {/* ---- roster grid ---- */}
        <div className={`roster-grid ${cols >= 6 ? 'dense' : ''}`} role="listbox" aria-label="Creatures" style={{ ['--cols' as string]: cols }}>
          {CREATURES.map((c) => {
            const hovering = p.players.map((pl, i) => ({ pl, i })).filter(({ pl }) => pl.creature === c.id);
            const lockedBy = hovering.filter(({ pl }) => pl.ready);
            const cls = ['cell', hovering.length ? 'hover' : '', lockedBy.length ? 'locked' : ''].join(' ');
            return (
              <button key={c.id} role="option" aria-selected={hovering.length > 0} className={cls}
                style={{ ['--c' as string]: hovering.length ? PLAYER_COLORS[hovering[0].i] : c.color }}
                onClick={() => { const i = p.players.findIndex((pl) => !pl.ready && typeof pl.device === 'string'); p.onPick(i >= 0 ? i : 0, c.id); }}
                title={`${c.name}${c.kind ? ` · ${c.kind}` : ''} · ${c.role}`} aria-label={c.kind ? `${c.name}, ${c.kind}` : c.name}>
                <CreaturePortrait creatureId={c.id} kind="thumb" assetBase={ASSETS} alt="" draggable={false} loading="eager" />
                <FitName name={c.name} />
                {c.kind && <span className="cell-kind">{c.kind}</span>}
                <ModelStatusBadge status={ACTIVE_ERA.assets.modelStatus?.[c.id]} note={ACTIVE_ERA.assets.modelNotes?.[c.id]} compact />
                <span className="cell-rings">
                  {hovering.map(({ i, pl }) => <i key={i} style={{ ['--c' as string]: PLAYER_COLORS[i], ['--k' as string]: i }} className={pl.ready ? 'ring locked' : 'ring'} />)}
                </span>
                {lockedBy.map(({ i }) => <span key={'b' + i} className="lock-badge" style={{ background: PLAYER_COLORS[i] }}>P{i + 1}</span>)}
              </button>
            );
          })}
        </div>

        {/* ---- player cards ---- */}
        <div className={`crew crew-${p.players.length} ${compact ? 'compact' : ''}`}>
          {p.players.map((pl, i) => {
            const def = creature(pl.creature);
            return (
              <article key={i} className={`crew-card ${pl.ready ? 'ready' : ''}`} style={{ ['--player' as string]: PLAYER_COLORS[i] }}>
                {pl.ready && <span key={'fx' + pl.creature} className="lock-fx" aria-hidden="true" />}
                <div className="crew-top">
                  <span className="player-chip">P{i + 1}</span>
                  <span className="device">{pl.device === 'keyboard' ? <><KeyboardIcon width={16} height={16} /> Keyboard 1</> : pl.device === 'keyboard2' ? <><KeyboardIcon width={16} height={16} /> Keyboard 2</> : <><PadIcon width={16} height={16} /> Controller {(pl.device as number) + 1}{!p.padIndices.includes(pl.device as number) && <em className="gone"> · disconnected</em>}</>}</span>
                  <button className="remove" aria-label={`Remove player ${i + 1}`} onClick={() => p.onRemove(i)}>×</button>
                </div>
                <div className="hero">
                  <ModelStatusBadge status={ACTIVE_ERA.assets.modelStatus?.[def.id]} note={ACTIVE_ERA.assets.modelNotes?.[def.id]} />
                  <CreaturePortrait key={def.id} creatureId={def.id} kind="select" assetBase={ASSETS} alt={`${def.name} reconstruction`} draggable={false} />
                </div>
                <div className="creature-copy">
                  <span className="role">{def.ground ? 'SEAFLOOR' : 'SWIMMER'} · {def.role}</span>
                  <h2>{def.name}</h2>
                  <small className="provenance">{def.kind && <b className="kind">{def.kind}</b>}{def.species} · {def.provenance ?? def.locality ?? 'Burgess Shale'}</small>
                  <p className="tagline">{def.tagline}</p>
                  <BestRun mark={p.best[def.id]} carrying={!!p.carry[i]} rise={p.mode === 'rise'} scheme={s} onToggle={() => p.onCarry(i)} />
                  {!compact && (
                    <>
                      <div className="stats">
                        <Stat label="Speed" v={stat(def.speed * def.burst, 14.6)} />
                        <Stat label="Power" v={stat(def.heavy.damage, 26)} />
                        <Stat label="Armor" v={stat(def.hp * (1 + def.defense), 233)} />
                        <Stat label="Agility" v={stat(def.agility + def.turnRate, 8.6)} />
                      </div>
                      {def.kindNote && <p className="kind-note">{def.kindNote}</p>}
                      <dl className="kit">
                        <div><dt>{key('heavy', s)}</dt><dd>{HEAVY_SPECIALS.has(def.ability) ? def.abilityName : def.heavy.name}</dd></div>
                        <div><dt>{key('guard', s)}</dt><dd>{DEFENSIVE_SPECIALS.has(def.ability) ? def.abilityName : def.canGuard ? 'Block / parry' : 'Evade'}</dd></div>
                        <div><dt>{key('ability', s)}</dt><dd><b>{RULES?.ySpecial(def.id)?.name ?? hideLabel(def.id)}.</b> {fillControls(RULES?.ySpecial(def.id)?.desc ?? hideDescription(def.id), s)}</dd></div>
                        <div><dt>+</dt><dd>{def.passive}</dd></div>
                        <div><dt>−</dt><dd>{def.weakness}</dd></div>
                      </dl>
                    </>
                  )}
                </div>
                <button className="ready-button" aria-pressed={pl.ready} onClick={() => p.onReady(i)}>
                  {pl.ready ? <><CheckIcon width={18} height={18} /> LOCKED IN · {key('confirm', s).toUpperCase()} DIVES</> : `LOCK IN  ·  ${key('confirm', s).toUpperCase()}`}
                </button>
              </article>
            );
          })}
          {p.players.length < 4 && (
            <div className={`join-card ${waiting.length ? 'waiting' : ''}`}>
              {/* With no pad in the room the card leads with the thing that actually works here —
                  a second player on the same keyboard — and mentions controllers second. */}
              {p.padIndices.length > 0 ? <PadIcon width={32} height={32} /> : <KeyboardIcon width={32} height={32} />}
              {p.padIndices.length > 0
                ? <p><b>Press any button</b> on another controller to join.</p>
                : <p><b>Plug in a controller</b> and press any button to join — or share this keyboard.</p>}
              <button className="ghost" onClick={p.onAddKeyboard}>Add a keyboard player</button>
              <small>
                {p.padIndices.length} controller{p.padIndices.length === 1 ? '' : 's'} connected
                {waiting.length > 0 && <> · <b>{waiting.map((i) => `Controller ${i + 1}`).join(', ')}</b> {waiting.length === 1 ? 'has' : 'have'} not joined</>}
              </small>
              {p.padIndices.length <= p.players.length && (
                <small className="dim">A controller only shows up here once you press a button on it.</small>
              )}
            </div>
          )}
        </div>
      </div>

      <footer className="select-footer">
        {/* Bottom left, opposite the dive button: the quiet corner of the screen, where something
            worth offering but never worth pressing by accident belongs. Renders nothing at all
            unless a feedback endpoint was compiled in — see src/shared/feedback.ts. */}
        <FeedbackButton />
        <div className="start-wrap">
          {!p.allReady && <span className="dim">Move on the grid with {btn('pick', s)}, <b>{key('confirm', s)}</b> locks in, <b>{key('confirm', s)}</b> again dives.</span>}
          <button className={`start-button ${p.allReady ? 'focused' : ''}`} disabled={!p.allReady} onClick={p.onStart}>DIVE IN  ·  {key('confirm', s).toUpperCase()}</button>
        </div>
      </footer>
    </section>
  );
}

/**
 * What this creature has grown into before, and the offer to pick up there.
 *
 * The record is kept for Rise alone, because Rise is the mode that grows you: the others hand out
 * a body at a fixed size, so how far you got in one says nothing. The badge shows in every mode —
 * it is a fact about the creature and worth seeing while you choose — but the offer only appears
 * where it can be taken, and only once there is something to carry on from.
 */
function BestRun({ mark, carrying, rise, scheme, onToggle }: { mark: number | undefined; carrying: boolean; rise: boolean; scheme: Scheme; onToggle: () => void }) {
  if (!mark) return null;
  const part = fillOf(mark), name = ladderName(mark);
  const next = ladderName(rungOf(mark) + 1);
  // A part-grown mark is worth saying out loud: it is the difference between starting over and
  // starting a short swim from where you stopped.
  const badge = part > 0 ? `${name.toUpperCase()} · PART GROWN` : name.toUpperCase();
  const title = part > 0
    ? `Furthest grown in ${MODE_NAME}: reached ${next}, but did not hold it. You start as a ${name} already ${Math.round(part * 100)}% of the way back.`
    : `Furthest grown in ${MODE_NAME}: ${name}.`;
  return (
    <div className={`best-run ${carrying ? 'carrying' : ''}`}>
      <span className="best-badge" title={title}><b>BEST</b> {badge}</span>
      {rise && (
        <button className="carry-toggle" aria-pressed={carrying} onClick={onToggle} title={title}>
          {carrying ? `Continuing as ${name}${part > 0 ? ', part grown' : ''}` : `Starting as ${ladderName(0)}`}
          <kbd>{scheme === 'pad' ? key('light', scheme) : 'C'}</kbd>
        </button>
      )}
    </div>
  );
}
/** The mode the record belongs to, in the era's own words. */
const MODE_NAME = ACTIVE_ERA.modes.find((m) => m.id === 'rise')?.name ?? 'Rise';

function Stat({ label, v }: { label: string; v: number }) {
  return (
    <span className="stat"><small>{label}</small><i>{Array.from({ length: 5 }, (_, k) => <b key={k} className={k < v ? 'on' : ''} />)}</i></span>
  );
}
