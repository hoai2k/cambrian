import { useEffect, useLayoutEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import { ACTIVE_ERA } from '../content';
import { assetPaths } from '../content/asset-paths';
import { hideLabel, hideDescription, HEAVY_SPECIALS, DEFENSIVE_SPECIALS } from '../sim/concealment';
import { RULES } from '../sim/era-rules';
import { CreaturePortrait } from './CreaturePortrait';
import { FeedbackButton } from './Feedback';
import { PLAYER_COLORS } from '../shared/hud-types';
import { PLAYABLE as CREATURES, authoredCreature, creature, naturalSizing, realCm, type CreatureId } from '../sim/creatures';
import type { Mode, PlayerSetup } from '../sim/types';
import { CheckIcon, ChevronDown, Emblem, KeyboardIcon, PadIcon, TouchIcon } from './icons';
import { roman } from './roman';
import { appBase } from '../shared/base';
import { btn, fillControls, key, type Scheme } from '../shared/controls';
import { fillOf, ladderName, rungOf } from '../sim/ladder';
import { gridColumns, rosterGrid, sameSlot, type ExtraId, type Slot } from './roster-grid';
import { ERA_NAME, type EraId } from '../content/visitors';
import { carouselView, gridFits, pickerSideBySide, rosterArea, type Box, type Layout } from '../shared/small-screen';
import { TEXT } from '../shared/text';
import { modeArtFile } from '../shared/mode-art';
import { depthLayout, habitatBand, type DepthItem, type DepthLayout } from './depth-layout';
import './plate.css';

export type RosterView = 'list' | 'size';
const VIEWS: RosterView[] = ['list', 'size'];

interface Props {
  players: PlayerSetup[]; mode: Mode; modes: Mode[]; modeInfo: Record<Mode, { name: string; blurb: string; players: string }>;
  allReady: boolean; padIndices: number[];
  /** Whatever everyone at this screen is holding: pad if any is connected, mouse and keyboard if not. */
  scheme: Scheme;
  /** Furthest mark on the growth ladder each creature has reached in Rise on this device. */
  best: Partial<Record<CreatureId, number>>;
  /** Per seat: whether that player has asked to carry on from their record rather than hatch. */
  carry: boolean[];
  /** Which mode chip the pad is pointing at, or -1 when the shoulder ring is elsewhere. */
  modeFocus?: number;
  /** Which of the List and Size tabs the pad is pointing at, or -1. */
  viewFocus?: number;
  /** How the roster is drawn on a desktop: the list, or the animals at size where they live. */
  rosterView: RosterView;
  onRosterView: (v: RosterView) => void;
  /** The Size view's layout while it is drawn (null otherwise), so the cursor walks what is on screen. */
  onDepth: (layout: DepthLayout | null) => void;
  onPick: (i: number, c: CreatureId) => void; onReady: (i: number) => void; onRemove: (i: number) => void;
  onMode: (m: Mode) => void; onStart: () => void; onBack: () => void;
  onCarry: (i: number) => void;
  /** The buttons in the grid beside the creatures, in the order they stand. */
  extras: ExtraId[];
  /** Press one of them, for the seat that is on it. */
  onExtra: (i: number, id: ExtraId) => void;
  /**
   * The most columns this window has room for (`rosterCap`). `Infinity` on anything roomy, so the
   * grid lays out exactly as it always did; on a phone it turns the overflow into scrollable rows
   * rather than into tiles too small to read.
   */
  maxCols: number;
  /** How much room the window has: the carousel is only ever a compact window's answer. */
  layout: Layout;
  /** Step a seat's cursor through the roster in reading order — the carousel's arrows and swipes. */
  onStep: (i: number, dir: 1 | -1) => void;
  /** Tell the shell which view is on screen, so the arrow keys and the sticks walk it the same way. */
  onView: (carousel: boolean) => void;
  /** How many animals this device has earned from the other games. */
  visitorCount: number;
  /**
   * Where a visitor is from, in words, for the crew card. Not the era it is *filed* under: a
   * standing guest's files live in the Triassic's folder and it is Late Cretaceous, so the card
   * reads the visitor's own `origin` rather than looking its era's name up.
   */
  visitorOrigin?: (id: CreatureId) => string | undefined;
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
  const siblings = [...(sibling ? [sibling] : []), ...(ACTIVE_ERA.copy.siblings ?? [])];
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
      <button className="brand-home" onClick={onBack} aria-label={T.backToTitle(ACTIVE_ERA.title)}>
        <Emblem size={34} />
      </button>
      {/* Title and chevron are one control, so they light up together: the chevron is a mark on the
          button saying it opens, not a button of its own beside it. The list hangs off that button,
          so what drops down starts on the same left edge and comes out the same width — both
          wordmarks are `.header-logo`, sized by one rule. */}
      <div className={`brand-titles ${open ? 'open' : ''}`} ref={wrap}>
        <button className="brand-title" onClick={sibling ? toggle : undefined} disabled={!sibling}
          aria-expanded={sibling ? open : undefined} aria-haspopup={sibling ? 'true' : undefined}
          aria-label={sibling ? T.chooseGame(ACTIVE_ERA.title) : ACTIVE_ERA.title}>
          <img className="header-logo" src={`${ASSETS}${ACTIVE_ERA.assets.logo}`} alt="" />
          {sibling && <ChevronDown width={18} height={18} aria-hidden="true" />}
        </button>
        {open && sibling && (
          <nav className="era-menu" aria-label={T.gameMenuLabel}>
            {/* Straight to the other game's roster, not its title screen: this is a picker, and
                landing back on PRESS START would undo the choice the player just made. */}
            {siblings.map((s) => (
              <a key={s.path} className="era-item" href={`${ASSETS}${s.path}?screen=select`}>
                <img className="header-logo" src={`${ASSETS}${s.logo}`} alt={s.title} />
              </a>
            ))}
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
/**
 * The creature copy, with a fade at its foot while there is more of it below the fold.
 *
 * The box scrolls when the window is too short to hold everything (see `.creature-copy`), and a
 * scrollbar is not an affordance you can count on — overlay scrollbars are invisible until touched,
 * so a description that runs past the bottom edge reads as text sliced off rather than text to
 * scroll to. The fade says which it is, and goes away once you reach the end.
 */
function CopyBox({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [more, setMore] = useState(false);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const check = () => setMore(el.scrollHeight - el.clientHeight - el.scrollTop > 2);
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    for (const kid of el.children) ro.observe(kid);
    el.addEventListener('scroll', check, { passive: true });
    return () => { ro.disconnect(); el.removeEventListener('scroll', check); };
  });
  return <div className="creature-copy" data-more={more || undefined} ref={ref}>{children}</div>;
}

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
export { gridColumns };
const ASSETS = appBase();
const T = TEXT.select, C = TEXT.select.crew, B = TEXT.select.best;

/** What each of the grid's buttons says. Short, because the tile is smaller than a card. */
const EXTRA_LABEL: Record<ExtraId, { name: string; glyph: string; title: string }> = {
  random: { name: T.randomName, glyph: '?', title: T.randomTitle },
  visitors: { name: T.visitorsName, glyph: '★', title: T.visitorsTitle },
};

/**
 * The engraved plate: the choice screen drawn in the title's own style, parchment and ink, with each
 * animal a numbered figure and the chosen one a plate. `?plate=0` still reaches the old dark panel so
 * the two can be compared; nothing on the page offers it.
 */
const PLATE = typeof location === 'undefined' || !/[?&]plate=0(?:&|$)/.test(location.search);

export function SelectScreen(p: Props) {
  const s = p.scheme;
  const grid = rosterGrid(CREATURES.map((c) => c.id), p.extras, p.maxCols);
  const cols = grid.cols;
  const compact = p.players.length >= 3;
  /*
   * Whether the grid fits, asked of the space it would actually be given. `.pick-layout` is sized by
   * the screen's own grid rows rather than by what is inside it, so measuring it is the same answer
   * in either view and switching cannot change the question that caused the switch.
   */
  const pickRef = useRef<HTMLDivElement>(null);
  const [picker, setPicker] = useState<Box | null>(null);
  useLayoutEffect(() => {
    const el = pickRef.current; if (!el) return;
    const read = () => { const r = el.getBoundingClientRect(); setPicker((was) => (was && was.w === r.width && was.h === r.height ? was : { w: r.width, h: r.height })); };
    read();
    const ro = new ResizeObserver(read); ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const fits = !picker || gridFits(grid.cells.length, rosterArea(picker, pickerSideBySide(window.innerWidth, window.innerHeight)), p.maxCols);
  const carousel = carouselView(p.layout, p.players.length, fits);
  const onView = p.onView;
  useEffect(() => { onView(carousel); }, [carousel, onView]);
  /*
   * The List and Size tabs are a desktop's: a compact window has no room for a sea of animals drawn
   * to scale (the smallest would be smaller than a fingertip), and on a phone the carousel is the
   * whole roster anyway. There the list is simply what is drawn.
   */
  const tabs = !carousel && p.layout !== 'compact';
  const view: RosterView = tabs ? p.rosterView : 'list';
  const onDepth = p.onDepth;
  useEffect(() => { if (view !== 'size') onDepth(null); }, [view, onDepth]);
  /** Which seats are on an animal, and which of those have locked it in. */
  const seatsOn = (id: string) => {
    const hovering = p.players.map((pl, i) => ({ pl, i })).filter(({ pl }) => !pl.cursor && pl.creature === id);
    return { hovering, lockedBy: hovering.filter(({ pl }) => pl.ready) };
  };
  /** A click on an animal, from the list or the Size view alike. */
  const clickCreature = (id: CreatureId) => {
    // A click on the animal you are already on is the second half of choosing it:
    // once to move here, again to lock in, again to change your mind. The seat that
    // answers is the one *on this tile* when there is one — otherwise a locked-in
    // player could never be unlocked, because the search below skips ready seats.
    const here = p.players.findIndex((pl) => !pl.cursor && pl.creature === id && typeof pl.device === 'string');
    if (here >= 0) { p.onReady(here); return; }
    const i = p.players.findIndex((pl) => !pl.ready && typeof pl.device === 'string');
    p.onPick(i >= 0 ? i : 0, id);
  };
  const clickExtra = (id: ExtraId) => { const i = p.players.findIndex((pl) => !pl.ready && typeof pl.device === 'string'); p.onExtra(i >= 0 ? i : 0, id); };
  // Controllers the game can see that have not joined yet, and joined players whose controller
  // has since gone away (an Xbox pad that went to sleep looks exactly like an unplugged one).
  const joined = new Set(p.players.map((pl) => pl.device));
  const waiting = p.padIndices.filter((i) => !joined.has(i));
  /** Nobody is on the keyboard yet, so it is still a way in. Only ever one player deep. */
  const keyboardFree = !p.players.some((pl) => typeof pl.device === 'string');
  /** One seat's card. Drawn beside the grid, or as the carousel's whole stage. */
  const renderCard = (pl: PlayerSetup, i: number, phantom = false) => {
            const def = creature(pl.creature);
            // The bars describe the fighter and must not move with the sizing option; the length
            // beside the locality is what the sizing actually changes, so that is where it shows —
            // and only while the roster is at those lengths.
            const bars = authoredCreature(pl.creature);
            const cm = naturalSizing() ? realCm(pl.creature) : undefined;
            return (
              <article key={i} className={`crew-card ${pl.ready ? 'ready' : ''}`} style={{ ['--player' as string]: PLAYER_COLORS[i] }}>
                {pl.ready && <span key={'fx' + pl.creature} className="lock-fx" aria-hidden="true" />}
                <div className="crew-top">
                  <span className="plate-no" aria-hidden="true">{T.plate.plate(roman(CREATURES.findIndex((c) => c.id === pl.creature) + 1 || 1))}</span>
                  <span className="player-chip">{TEXT.common.playerChip(i + 1)}</span>
                  {/* Which thing this seat is steered by. The touch seat has to be named as itself:
                      it used to fall through to the controller branch, which drew a pad icon, called
                      it "Controller touch1" and — since `padIndices` never contains a string — marked
                      it *disconnected*, on the one device that cannot be. */}
                  <span className="device">{
                    pl.device === 'keyboard' ? <><KeyboardIcon width={16} height={16} /> {C.keyboard1}</>
                      : pl.device === 'keyboard2' ? <><KeyboardIcon width={16} height={16} /> {C.keyboard2}</>
                      : pl.device === 'touch' ? <><TouchIcon width={16} height={16} /> {C.touch}</>
                      : <><PadIcon width={16} height={16} /> {C.controller((pl.device as number) + 1)}{!p.padIndices.includes(pl.device as number) && <em className="gone">{C.disconnected}</em>}</>
                  }</span>
                  {!phantom && <button className="remove" aria-label={C.removePlayer(i + 1)} onClick={() => p.onRemove(i)}>×</button>}
                </div>
                <div className="hero">
                  {/* A seat drawn in another palette because it is the second on this creature shows
                      that palette here, so a player knows which animal in the water is theirs before
                      the match starts. Falls back to the authored render where no portrait has been
                      baked for the scheme, which is most of them. */}
                  <CreaturePortrait key={`${def.id}:${pl.scheme ?? ''}`} creatureId={def.id} kind="select" schemeId={pl.scheme} assetBase={ASSETS} alt={C.portraitAlt(def.name)} draggable={false} />
                </div>
                <CopyBox>
                  <span className="role">{def.ground ? TEXT.common.seafloor : TEXT.common.swimmer} · {def.role}</span>
                  <h2>{def.name}</h2>
                  <small className="provenance">{def.kind && <b className="kind">{def.kind}</b>}{def.species} · {def.provenance ?? def.locality ?? C.defaultLocality}{cm != null && <> · <b className="real-size">{C.realSize(cm)}</b></>}</small>
                  <p className="tagline">{def.tagline}</p>
                  {/* A visitor is not this game's animal and does not carry this game's record, so
                      the growth badge has nothing to say about it. What it says instead is where the
                      animal is from and how to look through the others you have earned. */}
                  {pl.visitorScale
                    ? <p className="visitor-note">{C.visitorNote(p.visitorOrigin?.(pl.creature) ?? ERA_NAME.devonian)}</p>
                    : <BestRun mark={p.best[def.id]} carrying={!!p.carry[i]} rise={p.mode === 'rise' || p.mode === 'survival'} scheme={s} onToggle={() => p.onCarry(i)} />}
                  {!compact && (
                    <>
                      <div className="stats">
                        <Stat label={C.statSpeed} v={stat(bars.speed * bars.burst, 14.6)} />
                        <Stat label={C.statPower} v={stat(bars.heavy.damage, 26)} />
                        <Stat label={C.statArmor} v={stat(bars.hp * (1 + bars.defense), 233)} />
                        <Stat label={C.statAgility} v={stat(bars.agility + bars.turnRate, 8.6)} />
                      </div>
                      {def.kindNote && <p className="kind-note">{def.kindNote}</p>}
                      <dl className="kit">
                        <div><dt>{key('heavy', s)}</dt><dd>{HEAVY_SPECIALS.has(def.ability) ? def.abilityName : def.heavy.name}</dd></div>
                        <div><dt>{key('guard', s)}</dt><dd>{DEFENSIVE_SPECIALS.has(def.ability) ? def.abilityName : def.canGuard ? C.blockParry : C.evade}</dd></div>
                        <div><dt>{key('ability', s)}</dt><dd><b>{RULES?.ySpecial(def.id)?.name ?? hideLabel(def.id)}.</b> {fillControls(RULES?.ySpecial(def.id)?.desc ?? hideDescription(def.id), s)}</dd></div>
                        <div><dt>{C.passiveMark}</dt><dd>{def.passive}</dd></div>
                        <div><dt>{C.weaknessMark}</dt><dd>{def.weakness}</dd></div>
                      </dl>
                    </>
                  )}
                </CopyBox>
                {/* A phantom card is the carousel's, shown before anybody has a seat (arriving from
                    another game's picker): locking it in is the gesture that takes the seat, on the
                    animal on the card, exactly as a tap on a grid tile would. */}
                <button className="ready-button" aria-pressed={pl.ready} onClick={() => { if (phantom) p.onPick(i, pl.creature); p.onReady(i); }}>
                  {pl.ready ? <><CheckIcon width={18} height={18} /> {C.lockedIn(key('confirm', s).toUpperCase())}</> : C.lockIn(key('confirm', s).toUpperCase())}
                </button>
              </article>
            );
  };

  const rosterList = (
<div className={`roster-grid ${cols >= 6 ? 'dense' : ''}`} role="listbox" aria-label={T.rosterLabel} style={{ ['--cols' as string]: cols }}>
          {CREATURES.map((c, n) => {
            const { hovering, lockedBy } = seatsOn(c.id);
            const cls = ['cell', hovering.length ? 'hover' : '', lockedBy.length ? 'locked' : ''].join(' ');
            return (
              <button key={c.id} role="option" aria-selected={hovering.length > 0} className={cls}
                style={{ ['--c' as string]: hovering.length ? PLAYER_COLORS[hovering[0].i] : c.color }}
                onClick={() => clickCreature(c.id)}
                title={`${c.name}${c.kind ? ` · ${c.kind}` : ''} · ${c.role}`} aria-label={c.kind ? `${c.name}, ${c.kind}` : c.name}>
                <CreaturePortrait creatureId={c.id} kind="thumb" assetBase={ASSETS} alt="" draggable={false} loading="eager" />
                <span className="cell-fig" aria-hidden="true">{T.plate.fig(n + 1)}</span>
                <FitName name={c.name} />
                {c.kind && <span className="cell-kind">{c.kind}</span>}
                <span className="cell-rings">
                  {hovering.map(({ i, pl }) => <i key={i} style={{ ['--c' as string]: PLAYER_COLORS[i], ['--k' as string]: i }} className={pl.ready ? 'ring locked' : 'ring'} />)}
                </span>
                {lockedBy.map(({ i }) => <span key={'b' + i} className="lock-badge" style={{ background: PLAYER_COLORS[i] }}>{TEXT.common.playerChip(i + 1)}</span>)}
              </button>
            );
          })}
          {/* The grid's buttons. Placed from the same model the cursor walks, at the column that
              model puts them in — right-aligned under the last card column, on the final row where
              it has room and on a row of their own where it has not, so the roster's own alignment
              never moves. Smaller than a card, because they are not animals. */}
          {grid.cells.filter((c) => c.slot.kind === 'extra').map(({ slot, row, col }) => {
            const id = slot.id as ExtraId;
            const on = p.players.map((pl, i) => ({ pl, i })).filter(({ pl }) => pl.cursor === id);
            const label = EXTRA_LABEL[id];
            return (
              <button key={id} role="option" aria-selected={on.length > 0}
                className={`cell extra extra-${id} ${on.length ? 'hover' : ''}`}
                style={{ gridColumn: col + 1, gridRow: `span 3`, ['--c' as string]: on.length ? PLAYER_COLORS[on[0].i] : 'var(--foam)', ['--extra-row' as string]: row }}
                onClick={() => clickExtra(id)}
                title={label.title} aria-label={label.title}>
                <span className="extra-glyph" aria-hidden="true">{label.glyph}</span>
                <span className="extra-name">{label.name}</span>
                {id === 'visitors' && p.visitorCount > 0 && <span className="extra-count">{p.visitorCount}</span>}
                <span className="cell-rings">
                  {on.map(({ i }) => <i key={i} style={{ ['--c' as string]: PLAYER_COLORS[i], ['--k' as string]: i }} className="ring" />)}
                </span>
              </button>
            );
          })}
        </div>
  );

  return (
    <section className={`select ${carousel ? 'select-carousel' : ''} ${PLATE ? 'plate' : ''}`} data-era={ACTIVE_ERA.id} aria-label={T.screenLabel}>
      <header className="select-header">
        <BrandHeader onBack={p.onBack} />
        <div className="mode-picker" role="tablist" aria-label={T.modePickerLabel}>
          {p.modes.map((m, i) => (
            <button key={m} role="tab" aria-selected={p.mode === m} className={`mode-chip ${p.mode === m ? 'active' : ''}${i === p.modeFocus ? ' pad-focus' : ''}`} onClick={() => p.onMode(m)}>
              <img className="mode-art" src={`${ASSETS}${assetPaths.ui(modeArtFile(m))}`} alt="" onError={(e) => { e.currentTarget.dataset.missing = ''; }} />
              <span>{p.modeInfo[m].name}</span><small>{p.modeInfo[m].players}</small>
            </button>
          ))}
        </div>
        <p className="mode-blurb">{p.modeInfo[p.mode].blurb} <span className="dim">{T.modeSwitchHint(btn('modePrev', s), btn('modeNext', s))}</span></p>
      </header>

      <div className="pick-layout" ref={pickRef}>
        {carousel ? <RosterCarousel p={p} grid={grid} renderCard={renderCard} /> : <>
        {/* ---- the roster: the list, or on a desktop the Size view, under their tabs ---- */}
        {tabs && <div className="roster-pane">
          <div className="roster-tabs" role="tablist" aria-label={T.views.label}>
            {VIEWS.map((v, k) => (
              <button key={v} role="tab" aria-selected={view === v} className={`roster-tab${view === v ? ' active' : ''}${p.viewFocus === k ? ' pad-focus' : ''}`} onClick={() => p.onRosterView(v)}>{T.views[v]}</button>
            ))}
          </div>
          {view === 'size' ? <DepthView p={p} seatsOn={seatsOn} onCreature={clickCreature} onExtra={clickExtra} onLayout={onDepth} /> : rosterList}
        </div>}
        {!tabs && rosterList}

        {/* ---- player cards ---- */}
        <div className={`crew crew-${p.players.length} ${compact ? 'compact' : ''}`}>
          {p.players.map((pl, i) => renderCard(pl, i))}
          {p.players.length < 4 && (
            /*
             * One line, and only the line that is true. There is never more than one keyboard
             * player, so the keyboard is only an offer while nobody has taken it — which is the
             * case where the first player came in on a pad.
             */
            <div className={`join-card ${waiting.length ? 'waiting' : ''}`}>
              <PadIcon width={32} height={32} />
              <p>{keyboardFree ? T.joinPadOrKeyboard(btn('confirm', 'pad'), btn('confirm', 'kbm')) : T.joinPad(btn('confirm', 'pad'))}</p>
            </div>
          )}
        </div>
        </>}
      </div>

      <footer className="select-footer">
        {/* Bottom left, opposite the dive button: the quiet corner of the screen, where something
            worth offering but never worth pressing by accident belongs. Renders nothing at all
            unless a feedback endpoint was compiled in — see src/shared/feedback.ts. */}
        <FeedbackButton />
        <div className="start-wrap">
          <button className={`start-button ${p.allReady ? 'focused' : ''}`} disabled={!p.allReady} onClick={p.onStart}>{T.dive(key('confirm', s).toUpperCase())}</button>
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
  const badge = part > 0 ? B.partGrown(name) : B.whole(name);
  const title = part > 0 ? B.partTitle(MODE_NAME, next, name, Math.round(part * 100)) : B.title(MODE_NAME, name);
  return (
    <div className={`best-run ${carrying ? 'carrying' : ''}`}>
      <span className="best-badge" title={title}><b>{B.badge}</b> {badge}</span>
      {rise && (
        <button className="carry-toggle" aria-pressed={carrying} onClick={onToggle} title={title}>
          {carrying ? B.continuing(name, part > 0) : B.starting(ladderName(0))}
          <kbd>{scheme === 'pad' ? key('light', scheme) : 'C'}</kbd>
        </button>
      )}
    </div>
  );
}
/** The mode the record belongs to, in the era's own words. */
const MODE_NAME = ACTIVE_ERA.modes.find((m) => m.id === 'rise')?.name ?? TEXT.sim.board.riseTitle;

function Stat({ label, v }: { label: string; v: number }) {
  return (
    <span className="stat"><small>{label}</small><i>{Array.from({ length: 5 }, (_, k) => <b key={k} className={k < v ? 'on' : ''} />)}</i></span>
  );
}

/**
 * The roster one hero card at a time, for a screen too small to hold the grid.
 *
 * It is the grid laid end to end, not a second roster: the order is the grid model's own reading
 * order (`grid.cells`, creatures and then the Random and Visitors buttons where they stand), the
 * card on stage is wherever the seat's cursor already is, and every step goes through the same
 * `moveCursor` the grid's arrow keys use — so a pad, the arrow keys, the arrows on screen and a swipe
 * all walk one list and cannot disagree about what comes next. The card is the crew card the grid
 * draws beside itself, portrait, copy, Lock In and all, because on a phone the grid's tiles and the
 * card beside them were two views of one choice and there is room for exactly one.
 *
 * One seat: a phone is played by one person, and `carouselView` hands the screen back to the grid
 * the moment a second player joins.
 */
/** The space between the card on stage and its neighbours, in the track and in the CSS (`--slide-gap`). */
const SLIDE_GAP = 12;

function RosterCarousel({ p, grid, renderCard }: {
  p: Props;
  grid: ReturnType<typeof rosterGrid>;
  renderCard: (pl: PlayerSetup, i: number, phantom?: boolean) => ReactNode;
}) {
  const K = T.carousel;
  const seat = p.players[0];
  const order = grid.cells.map((c) => c.slot);
  // Where the card is: the seat's cursor, or — with nobody seated yet — the era's default animal.
  const here: Slot = seat?.cursor ? { kind: 'extra', id: seat.cursor } : { kind: 'creature', id: seat?.creature ?? ACTIVE_ERA.defaults.player };
  const at = Math.max(0, order.findIndex((s) => sameSlot(s, here)));
  const slot = order[at] ?? here;
  const step = (dir: 1 | -1) => {
    if (seat) { p.onStep(0, dir); return; }
    // Nobody seated: walking the roster is how the seat is taken, on the animal walked to. The
    // buttons need a seat to press them for, so they are stepped over until there is one.
    for (let k = 1; k <= order.length; k++) {
      const next = order[(at + dir * k + order.length * k) % order.length];
      if (next.kind === 'creature') { p.onPick(0, next.id as CreatureId); return; }
    }
  };
  /*
   * The cards follow the finger. Three are laid side by side — the one on stage and its neighbours
   * either side, which are also what peeks in at the edges when the phone is upright — and the row
   * moves with the finger as it travels. On the lift the motion completes: past `COMMIT` of the card's
   * width, or flicked faster than `FLICK`, the row slides on to the neighbour and the cursor steps
   * there; short of both it springs back. A drag is only claimed once it is going sideways
   * (`touch-action: pan-y` leaves an upward drag to scroll the card's copy), and the click it would
   * otherwise end in — on whatever button the finger started over — is swallowed, so a swipe that
   * began on Lock In is a swipe, not a lock-in.
   */
  const COMMIT = 0.22, FLICK = 0.45, SLIDE_MS = 260;
  const stageRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const press = useRef<{ x: number; y: number; t: number; axis: 'x' | 'y' | null; id: number } | null>(null);
  const swiped = useRef(false);
  /** A slide under way: set from the lift until the row is re-seated under the card it went to. */
  const busy = useRef(false);
  /** The card the row is waiting to see arrive before it re-seats itself (the slot's key). */
  const awaiting = useRef<string | null>(null);
  const width = () => stageRef.current?.clientWidth ?? 1;
  /*
   * The row is moved by writing its transform directly, never through React state: a finger drag
   * re-rendering three whole cards on every move is what makes a card trail the finger on a phone.
   * `animate` eases from wherever the row is now — the point the finger let go — to `x`.
   */
  const place = (x: number, animate: boolean) => {
    const el = trackRef.current; if (!el) return;
    el.style.transition = animate ? `transform ${SLIDE_MS}ms cubic-bezier(.2, .8, .25, 1)` : 'none';
    el.style.transform = `translateX(${x}px)`;
    el.dataset.moving = animate ? 'slide' : x ? 'drag' : '';
  };
  /**
   * When the slide the row just started has actually finished. Asked of the animation itself — its
   * `finished` promise runs on the animation's own clock, so it cannot resolve early the way a timer
   * started before the first frame did (a slow frame on a phone cut the slide short into a snap), and
   * it cannot be lost the way `transitionend` can. A generous timer stands behind it, because a
   * transition that never started (nothing to move) has no animation to wait for.
   */
  const settled = () => new Promise<void>((done) => {
    const el = trackRef.current;
    const fallback = window.setTimeout(done, SLIDE_MS + 700);
    requestAnimationFrame(() => {
      const runs = el?.getAnimations() ?? [];
      if (!runs.length) { window.clearTimeout(fallback); done(); return; }
      Promise.all(runs.map((r) => r.finished)).then(() => { window.clearTimeout(fallback); done(); }, () => { window.clearTimeout(fallback); done(); });
    });
  });
  const slotKey = (o: Slot) => `${o.kind}:${o.id}`;
  /** Slide the row a whole card over, then step the cursor; the row is re-seated when the new card lands. */
  const go = (dir: 1 | -1) => {
    if (busy.current) return;
    busy.current = true;
    place(-dir * (width() + SLIDE_GAP), true);
    void settled().then(() => {
      const target = order[(at + dir + order.length) % order.length];
      awaiting.current = target ? slotKey(target) : null;
      step(dir);
      // A step the roster refuses (a locked seat) never brings a new card: spring back instead.
      window.setTimeout(() => { if (awaiting.current) { awaiting.current = null; place(0, true); void settled().then(() => { place(0, false); busy.current = false; }); } }, 400);
    });
  };
  // Re-seat the row in the same commit that puts the new card on stage, so the card the finger sent
  // there is already in the middle when the row jumps back under it and nothing is seen to move.
  useLayoutEffect(() => {
    if (awaiting.current && awaiting.current === slotKey(slot)) { awaiting.current = null; place(0, false); busy.current = false; }
  });
  const release = (e: ReactPointerEvent) => {
    const d = press.current; press.current = null;
    if (!d || d.axis !== 'x') return;
    const moved = e.clientX - d.x, speed = Math.abs(moved) / Math.max(1, e.timeStamp - d.t);
    swiped.current = true;
    if (Math.abs(moved) > width() * COMMIT || (speed > FLICK && Math.abs(moved) > 20)) go(moved < 0 ? 1 : -1);
    else springBack();
  };
  const springBack = () => { busy.current = true; place(0, true); void settled().then(() => { place(0, false); busy.current = false; }); };
  // A locked visitor is an animal on stage whatever the cursor says: its arrows walk the visitors.
  const showCard = slot.kind === 'creature' || (seat?.cursor === 'visitors' && seat.ready);
  const cardPl: PlayerSetup = seat ?? { creature: (slot.kind === 'creature' ? slot.id : ACTIVE_ERA.defaults.player) as CreatureId, device: 'touch', ready: false };
  /** A neighbour's card: the same card, drawn for an animal nobody is on yet. */
  const neighbour = (o: Slot | undefined) => {
    if (!o) return null;
    if (o.kind === 'extra') return <ExtraCard id={o.id as ExtraId} count={p.visitorCount} onTake={() => {}} />;
    return renderCard({ creature: o.id as CreatureId, device: seat?.device ?? 'touch', ready: false }, 0, true);
  };
  const prevSlot = order[(at - 1 + order.length) % order.length], nextSlot = order[(at + 1) % order.length];
  return (
    <div className="carousel" role="group" aria-roledescription="carousel" aria-label={K.label}>
      <button className="carousel-step prev" aria-label={K.prev} onClick={() => go(-1)}><span aria-hidden="true">‹</span></button>
      <div
        className="carousel-stage" ref={stageRef}
        onPointerDown={(e) => {
          // A new press is never the tail of the last swipe, even mid-slide: clear that first, or a
          // swipe (which ends in no click at all) leaves the next real tap — Lock In — swallowed.
          swiped.current = false;
          if (busy.current) return;
          press.current = { x: e.clientX, y: e.clientY, t: e.timeStamp, axis: null, id: e.pointerId };
        }}
        onPointerMove={(e) => {
          const d = press.current; if (!d) return;
          const mx = e.clientX - d.x, my = e.clientY - d.y;
          if (!d.axis && Math.hypot(mx, my) > 8) {
            d.axis = Math.abs(mx) > Math.abs(my) ? 'x' : 'y';
            if (d.axis === 'x') { try { (e.currentTarget as HTMLElement).setPointerCapture(d.id); } catch { /* */ } }
          }
          if (d.axis === 'x') place(mx, false);
        }}
        onPointerUp={release}
        onPointerCancel={() => { if (press.current?.axis === 'x') springBack(); press.current = null; }}
        onClickCapture={(e) => { if (swiped.current) { e.stopPropagation(); e.preventDefault(); swiped.current = false; } }}
      >
        <div className="carousel-track" ref={trackRef}>
          <div className="carousel-slide prev" aria-hidden="true" onClickCapture={(e) => { e.stopPropagation(); e.preventDefault(); go(-1); }}>{neighbour(prevSlot)}</div>
          <div className="carousel-slide current">
            {showCard
              ? renderCard(cardPl, 0, !seat)
              : <ExtraCard id={slot.id as ExtraId} count={p.visitorCount} onTake={() => p.onExtra(0, slot.id as ExtraId)} />}
          </div>
          <div className="carousel-slide next" aria-hidden="true" onClickCapture={(e) => { e.stopPropagation(); e.preventDefault(); go(1); }}>{neighbour(nextSlot)}</div>
        </div>
      </div>
      <button className="carousel-step next" aria-label={K.next} onClick={() => go(1)}><span aria-hidden="true">›</span></button>
      <div className="carousel-foot" aria-live="polite">
        <span className="carousel-dots" aria-hidden="true">{order.map((o, k) => <i key={k} className={`${k === at ? 'on' : ''} ${o.kind === 'extra' ? 'extra' : ''}`} />)}</span>
        <span className="carousel-count">{K.count(at + 1, order.length)}</span>
      </div>
    </div>
  );
}

/**
 * The Size view: the roster as a slice of sea, each animal at its size where it lives
 * (`depth-layout.ts`). It measures its own box, lays the roster out in it and tells the shell the
 * layout it drew, so the stick walks the same rectangles the eye sees. Everything else about the
 * screen — the crew cards, Lock In, the seats' rings — is the list's, unchanged.
 */
function DepthView({ p, seatsOn, onCreature, onExtra, onLayout }: {
  p: Props;
  seatsOn: (id: string) => { hovering: { pl: PlayerSetup; i: number }[]; lockedBy: { pl: PlayerSetup; i: number }[] };
  onCreature: (id: CreatureId) => void;
  onExtra: (id: ExtraId) => void;
  onLayout: (layout: DepthLayout | null) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState<Box | null>(null);
  useLayoutEffect(() => {
    const el = ref.current; if (!el) return;
    const read = () => setBox((was) => (was && was.w === el.clientWidth && was.h === el.clientHeight ? was : { w: el.clientWidth, h: el.clientHeight }));
    read();
    const ro = new ResizeObserver(read); ro.observe(el);
    return () => ro.disconnect();
  }, []);
  // Real length where the era records one (the Cambrian's `realCm`), the adult length otherwise:
  // this view is about how big the animals *are*, whatever the Equivalent sizing option says.
  const items = useMemo<DepthItem[]>(() => CREATURES.map((c) => ({ id: c.id, band: habitatBand(c), length: realCm(c.id) ?? creature(c.id).adultLength })), []);
  const extrasKey = p.extras.join(',');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const layout = useMemo(() => (box && box.w > 0 && box.h > 0 ? depthLayout(items, p.extras, box) : null), [box, items, extrasKey]);
  useEffect(() => { onLayout(layout); }, [layout, onLayout]);
  useEffect(() => () => onLayout(null), [onLayout]);
  const V = T.views;
  return (
    <div className="depth-view" ref={ref} role="listbox" aria-label={T.rosterLabel}>
      {layout && <>
        {layout.bands.map((b) => (
          <div key={b.band} className={`depth-band depth-band-${b.band}`} style={{ top: b.top, height: b.bottom - b.top }}>
            <span className="depth-label">{V.bands[b.band]}</span>
          </div>
        ))}
        <div className="depth-surface" style={{ top: layout.surfaceY }} aria-hidden="true" />
        <div className="depth-floor" style={{ top: layout.floorY }} aria-hidden="true" />
        {layout.spots.map(({ slot, x, y, w, h }) => {
          const place = { left: x, top: y, width: w, height: h };
          if (slot.kind === 'extra') {
            const id = slot.id as ExtraId;
            const on = p.players.map((pl, i) => ({ pl, i })).filter(({ pl }) => pl.cursor === id);
            const label = EXTRA_LABEL[id];
            return (
              <button key={'x' + id} role="option" aria-selected={on.length > 0} className={`depth-spot extra extra-${id} ${on.length ? 'hover' : ''}`}
                style={{ ...place, ['--c' as string]: on.length ? PLAYER_COLORS[on[0].i] : 'var(--foam)' }}
                onClick={() => onExtra(id)} title={label.title} aria-label={label.title}>
                <span className="extra-glyph" aria-hidden="true">{label.glyph}</span>
                <span className="depth-name">{label.name}</span>
                <span className="cell-rings">{on.map(({ i }) => <i key={i} style={{ ['--c' as string]: PLAYER_COLORS[i], ['--k' as string]: i }} className="ring" />)}</span>
              </button>
            );
          }
          const c = creature(slot.id as CreatureId);
          const { hovering, lockedBy } = seatsOn(c.id);
          return (
            <button key={c.id} role="option" aria-selected={hovering.length > 0}
              className={`depth-spot ${hovering.length ? 'hover' : ''} ${lockedBy.length ? 'locked' : ''}`}
              style={{ ...place, ['--c' as string]: hovering.length ? PLAYER_COLORS[hovering[0].i] : c.color }}
              onClick={() => onCreature(c.id)} title={`${c.name}${c.kind ? ` · ${c.kind}` : ''} · ${c.role}`} aria-label={c.kind ? `${c.name}, ${c.kind}` : c.name}>
              <CreaturePortrait creatureId={c.id} kind="thumb" assetBase={ASSETS} alt="" draggable={false} loading="eager" />
              <span className="depth-name">{c.name}</span>
              <span className="cell-rings">
                {hovering.map(({ i, pl }) => <i key={i} style={{ ['--c' as string]: PLAYER_COLORS[i], ['--k' as string]: i }} className={pl.ready ? 'ring locked' : 'ring'} />)}
              </span>
              {lockedBy.map(({ i }) => <span key={'b' + i} className="lock-badge" style={{ background: PLAYER_COLORS[i] }}>{TEXT.common.playerChip(i + 1)}</span>)}
            </button>
          );
        })}
      </>}
    </div>
  );
}

/** Random or Visitors, as a whole card: there is no animal on it, so its one action is to take it. */
function ExtraCard({ id, count, onTake }: { id: ExtraId; count: number; onTake: () => void }) {
  const label = EXTRA_LABEL[id];
  return (
    <article className={`carousel-extra extra-${id}`}>
      <span className="extra-glyph" aria-hidden="true">{label.glyph}</span>
      <h2>{label.name}{id === 'visitors' && count > 0 && <span className="extra-count">{count}</span>}</h2>
      <p>{label.title}</p>
      <button className="ready-button" onClick={onTake}>{T.carousel.take}</button>
    </article>
  );
}
