import { useState } from 'react';
import { appBase } from '../shared/base';
import { ANIMAL_ERA, BIG_ANIMAL, GAMES, SLOTS, TRILOGY_LOGO, isDelivered, parseVersion, sourceFor, type EraId, type Slot } from './page';

/** The page is the app root, so `assets/...` and each game's folder hang directly off it. */
const url = (path: string) => `${appBase()}${path}`;

/**
 * "Ancient Seas Trilogy" until the wordmark is delivered: typeset, in the engraved lettering's
 * spirit (a serif in small capitals), coloured for whichever ground it stands on. The requested
 * logo replaces it in place — same element, same size — so the layout does not move when it lands.
 */
function TrilogyTitle({ ground }: { ground: 'dark' | 'parchment' }) {
  if (ground === 'dark' && isDelivered(TRILOGY_LOGO)) {
    return <h1 className="as-title as-title-art"><img src={url(TRILOGY_LOGO)} alt="Ancient Seas Trilogy" width={1536} height={512} /></h1>;
  }
  return (
    <h1 className={`as-title as-title-text as-title-${ground}`}>
      <span className="as-title-line">Ancient Seas</span>
      <span className="as-title-line as-title-sub">Trilogy</span>
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
        <p className="as-eyebrow">Three games · one sea · five hundred million years</p>
        <TrilogyTitle ground="dark" />
        <p className="as-rule" aria-hidden="true">— ❧ —</p>
      </header>
      <nav className="as-games" aria-label="The three games">
        {GAMES.map((g) => (
          <a key={g.id} className={`as-game as-game-${g.id}`} href={url(g.path)}>
            <img className="as-art" src={url(g.art)} width={g.artWidth} height={g.artHeight} alt="" decoding="async" />
            <span className="as-caption">
              <b>{g.title}</b>
              <small>{g.when}</small>
              <em>{g.tagline}</em>
            </span>
          </a>
        ))}
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
  const lit = partOfLink && era === active;
  const cls = `as-slot as-slot-${slot.kind} as-src-${source.kind}${slot.fill ? ' as-slot-fill' : ''}${lit ? ' as-lit' : ''}`;

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
function VersionTwo() {
  const [active, setActive] = useState<EraId | null>(null);
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
      <div className="as-stage" role="navigation" aria-label="The three games">
        {PIECES.map((slot) => <SlotView key={slot.id} slot={slot} active={active} onActive={setActive} />)}
      </div>
    </main>
  );
}

export function AncientSeas() {
  const version = parseVersion(typeof location === 'undefined' ? '' : location.search);
  return version === 2 ? <VersionTwo /> : <VersionOne />;
}
