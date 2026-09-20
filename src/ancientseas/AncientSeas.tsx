import { useCallback, useEffect, useRef, useState } from 'react';
import { appBase } from '../shared/base';
import { ANIMAL_ERA, BIG_ANIMAL, COMING_SOON, GAMES, OPEN_GAMES, SLOTS, TRILOGY_LOGO, isDelivered, parseVersion, sourceFor, type EraId, type Slot } from './page';
import { poll, step, type Dir } from './picker';
import { PAGE_TEXT } from './strings';

/** The page is the app root, so `assets/...` and each game's folder hang directly off it. */
const url = (path: string) => `${appBase()}${path}`;

/**
 * "Ancient Seas Trilogy" until the wordmark is delivered: typeset, in the engraved lettering's
 * spirit (a serif in small capitals), coloured for whichever ground it stands on. The requested
 * logo replaces it in place — same element, same size — so the layout does not move when it lands.
 */
function TrilogyTitle({ ground }: { ground: 'dark' | 'parchment' }) {
  if (ground === 'dark' && isDelivered(TRILOGY_LOGO)) {
    return <h1 className="as-title as-title-art"><img src={url(TRILOGY_LOGO)} alt={PAGE_TEXT.title.alt} width={1536} height={512} /></h1>;
  }
  return (
    <h1 className={`as-title as-title-text as-title-${ground}`}>
      <span className="as-title-line">{PAGE_TEXT.title.line}</span>
      <span className="as-title-line as-title-sub">{PAGE_TEXT.title.sub}</span>
    </h1>
  );
}

/**
 * Three layers. The paper covers the window whatever shape it is; the seabed spans the window's
 * width but sits at the plate's own height, so the animals standing on it line up; everything else
 * is placed on the plate.
 */
const PAPER = SLOTS.filter((s) => s.kind === 'ground' && s.fill);
const GROUND = SLOTS.filter((s) => s.kind === 'ground' && !s.fill);
const PIECES = SLOTS.filter((s) => s.kind !== 'ground');

/** Version 1: the three paintings whole, each fading into the dark the page is made of. */
function VersionOne() {
  return (
    <main className="as as-v1">
      <header className="as-head">
        <p className="as-eyebrow">{PAGE_TEXT.head.eyebrow}</p>
        <TrilogyTitle ground="dark" />
        <p className="as-rule" aria-hidden="true">{PAGE_TEXT.head.rule}</p>
      </header>
      <nav className="as-games" aria-label={PAGE_TEXT.plate.gamesLabel}>
        {GAMES.map((g) => {
          const inside = (
            <>
              <img className="as-art" src={url(g.art)} width={g.artWidth} height={g.artHeight} alt="" decoding="async" />
              <span className="as-caption">
                <b>{g.title}</b>
                <small>{g.comingSoon ? COMING_SOON : g.when}</small>
                <em>{g.tagline}</em>
              </span>
            </>
          );
          const cls = `as-game as-game-${g.id}${g.comingSoon ? ' as-soon' : ''}`;
          return g.comingSoon
            ? <div key={g.id} className={cls} aria-label={PAGE_TEXT.badge.label(g.title, COMING_SOON)}>{inside}</div>
            : <a key={g.id} className={cls} href={url(g.path)}>{inside}</a>;
        })}
      </nav>
    </main>
  );
}

/**
 * One piece of the version-2 composition, at its place on the stage.
 *
 * `active` is the game the pointer is on: its title and the animal arching over that title light
 * together, because between them they are the link.
 */
function SlotView({ slot, active, onActive }: { slot: Slot; active: EraId | null; onActive: (era: EraId | null) => void }) {
  const { desktop: d, mobile: m } = slot;
  const style = (slot.fill
    ? { '--z': slot.z } as Record<string, string | number>
    : {
      '--dx': `${d.x}%`, '--dy': `${d.y}%`, '--dw': `${d.w}%`, '--dr': `${d.rot ?? 0}deg`, '--df': d.flip ? -1 : 1,
      '--mx': `${m.x}%`, '--my': `${m.y}%`, '--mw': `${m.w}%`, '--mr': `${m.rot ?? 0}deg`, '--mf': m.flip ? -1 : 1,
      '--z': slot.z, aspectRatio: `${slot.width} / ${slot.height}`,
    }) as React.CSSProperties;
  const source = sourceFor(slot);
  const era = slot.game ?? ANIMAL_ERA[slot.id];
  /**
   * A game's title and the animal arching over it are one link between them, so the animal is
   * clickable too rather than being a picture next to the thing you have to hit. It is the same
   * link twice, so the picture is taken out of the keyboard's and the screen reader's way: the
   * title is the one that carries the game's name.
   */
  const partOfLink = era !== undefined && (slot.kind === 'title' || BIG_ANIMAL[era] === slot.id);
  const game = partOfLink ? GAMES.find((g) => g.id === era) : undefined;
  /**
   * A game that is not out yet keeps its place on the plate and loses everything that makes it a
   * way in: the title and the animal over it stop being a link, stop lighting, and go quiet in the
   * paper, with the badge saying why. It is still drawn, because the plate is the trilogy and a
   * gap where the third game goes says less than the third game does.
   */
  const soon = !!game?.comingSoon;
  const lit = partOfLink && !soon && era === active;
  const cls = `as-slot as-slot-${slot.kind} as-src-${source.kind}${slot.fill ? ' as-slot-fill' : ''}${lit ? ' as-lit' : ''}${soon ? ' as-soon' : ''}`;

  if (slot.id === 'trilogy') {
    // The trilogy title is the one slot whose stand-in is typeset rather than drawn.
    return (
      <div className={cls} style={style} data-slot={slot.id}>
        {source.kind === 'placeholder' ? <TrilogyTitle ground="parchment" /> : <h1 className="as-title as-title-art"><img src={url(source.src)} alt={slot.label} width={slot.width} height={slot.height} /></h1>}
      </div>
    );
  }
  const body = source.kind === 'placeholder'
    ? (slot.kind === 'ground' ? null : <span className="as-placeholder"><i>{slot.label}</i></span>)
    : <img src={url(source.src)} alt={game && slot.kind === 'title' ? game.title : ''} width={slot.width} height={slot.height} decoding="async" />;
  if (game) {
    const isTitle = slot.kind === 'title';
    const badge = isTitle && soon ? <span className="as-badge">{COMING_SOON}</span> : null;
    if (soon) {
      return (
        <div className={cls} style={style} data-slot={slot.id} aria-hidden={isTitle ? undefined : true} aria-label={isTitle ? `${game.title} — ${COMING_SOON}` : undefined}>
          {body}{badge}
        </div>
      );
    }
    return (
      <a
        className={cls} style={style} data-slot={slot.id} href={url(game.path)}
        aria-label={isTitle ? `${game.title} — ${game.when}` : undefined}
        aria-hidden={isTitle ? undefined : true} tabIndex={isTitle ? undefined : -1}
        onMouseEnter={() => onActive(game.id)} onMouseLeave={() => onActive(null)}
        onFocus={() => onActive(game.id)} onBlur={() => onActive(null)}
      >
        {body}
      </a>
    );
  }
  return <div className={cls} style={style} data-slot={slot.id} aria-hidden="true">{body}</div>;
}

/**
 * Version 2, the page itself: one painting in the three title paintings' style, filling the
 * viewport with nothing round it — what a visitor sees is the finished plate, not a draft with a
 * switch under it. `?version=1` still reaches the earlier draft, but neither version offers a link
 * to the other.
 */
/**
 * A pad steers the same choice the pointer does.
 *
 * Polling only starts when a pad is actually there, and stops when the last one goes: this page is
 * three pictures and two links, and a frame loop running on it forever to watch buttons nobody is
 * pressing would be the busiest thing about it. `chosen` is what is lit; `open` is called with the
 * game to go to.
 */
function usePad(chosen: EraId | null, onMove: (era: EraId) => void, onOpen: () => void) {
  const state = useRef({ chosen, onMove, onOpen });
  state.current = { chosen, onMove, onOpen };
  const [pads, setPads] = useState(() => (typeof navigator === 'undefined' ? 0 : (navigator.getGamepads?.() ?? []).filter(Boolean).length));
  useEffect(() => {
    const count = () => setPads((navigator.getGamepads?.() ?? []).filter(Boolean).length);
    addEventListener('gamepadconnected', count);
    addEventListener('gamepaddisconnected', count);
    return () => { removeEventListener('gamepadconnected', count); removeEventListener('gamepaddisconnected', count); };
  }, []);
  useEffect(() => {
    if (pads === 0) return;
    const held = new Map<number, { dir: Dir | null; confirm: boolean }>();
    let raf = 0;
    const frame = () => {
      const { dir, confirm } = poll(held);
      const { chosen: at, onMove: move, onOpen: open } = state.current;
      if (dir) move(step(at, dir, OPEN_GAMES.map((g) => g.id)));
      // Nothing chosen yet and a button pressed: take the first game rather than doing nothing.
      else if (confirm) { if (at === null) move(OPEN_GAMES[0].id); else open(); }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [pads]);
}

function VersionTwo() {
  const [active, setActive] = useState<EraId | null>(null);
  const go = useCallback((era: EraId) => {
    // Only a game that is open: nothing should be able to steer into one that is not a link.
    const game = OPEN_GAMES.find((g) => g.id === era);
    if (game) location.href = url(game.path);
  }, []);
  usePad(active, setActive, () => active && go(active));
  /**
   * On a phone the plate is taller than the screen, so a choice made without a pointer has to be
   * brought into view — a pad that lights a game three screens down has not shown the player
   * anything. A choice made *with* a pointer is under the pointer already, so this never fires.
   */
  useEffect(() => {
    if (!active) return;
    const el = document.querySelector(`a[data-slot="${active}"]`);
    const box = el?.getBoundingClientRect();
    if (box && (box.top < 0 || box.bottom > innerHeight)) el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [active]);
  // The arrow keys answer too, for a keyboard that has not reached for Tab: same choice, same
  // lighting, Enter to take it.
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const dir: Dir | null = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 'right'
        : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? 'left' : null;
      if (dir) { e.preventDefault(); setActive((at) => step(at, dir, OPEN_GAMES.map((g) => g.id))); return; }
      if ((e.key === 'Enter' || e.key === ' ') && active && !(e.target as HTMLElement | null)?.closest?.('a')) { e.preventDefault(); go(active); }
    };
    addEventListener('keydown', key);
    return () => removeEventListener('keydown', key);
  }, [active, go]);
  return (
    <main className="as as-v2">
      <h1 className="sr-only">Ancient Seas Trilogy</h1>
      {/*
        * The paper is the window, the arrangement is a 16:10 plate inside it. Keeping the two apart
        * is what lets the parchment and the seabed run edge to edge on a screen wider than the
        * composition without the composition stretching to match.
        */}
      <div className="as-paper" aria-hidden="true">
        {PAPER.map((slot) => <SlotView key={slot.id} slot={slot} active={null} onActive={() => {}} />)}
        <div className="as-ground">
          {GROUND.map((slot) => <SlotView key={slot.id} slot={slot} active={null} onActive={() => {}} />)}
        </div>
      </div>
      <div className="as-stage" role="navigation" aria-label={PAGE_TEXT.plate.gamesLabel}>
        {PIECES.map((slot) => <SlotView key={slot.id} slot={slot} active={active} onActive={setActive} />)}
      </div>
    </main>
  );
}

export function AncientSeas() {
  const version = parseVersion(typeof location === 'undefined' ? '' : location.search);
  return version === 2 ? <VersionTwo /> : <VersionOne />;
}
