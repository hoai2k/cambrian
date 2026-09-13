import { nestedBase } from '../shared/base';
import { GAMES, SLOTS, TRILOGY_LOGO, VERSIONS, isDelivered, parseVersion, sourceFor, type PageVersion, type Slot } from './page';

/** The page sits one level below the app root, so `assets/...` is reached the way /devonian/ reaches it. */
const url = (path: string) => `${nestedBase()}${path}`;

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

function VersionSwitch({ version }: { version: PageVersion }) {
  return (
    <footer className="as-foot">
      <span className="as-foot-label">Compare</span>
      {VERSIONS.map((v) => (
        <a key={v} className={`as-foot-link${v === version ? ' current' : ''}`} href={`?version=${v}`} aria-current={v === version ? 'page' : undefined}>
          Version {v}
        </a>
      ))}
    </footer>
  );
}

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
      <VersionSwitch version={1} />
    </main>
  );
}

/** One piece of the version-2 composition, at its place on the stage. */
function SlotView({ slot }: { slot: Slot }) {
  const { desktop: d, mobile: m } = slot;
  const style = {
    '--dx': `${d.x}%`, '--dy': `${d.y}%`, '--dw': `${d.w}%`, '--dr': `${d.rot ?? 0}deg`, '--df': d.flip ? -1 : 1,
    '--mx': `${m.x}%`, '--my': `${m.y}%`, '--mw': `${m.w}%`, '--mr': `${m.rot ?? 0}deg`, '--mf': m.flip ? -1 : 1,
    '--z': slot.z, aspectRatio: `${slot.width} / ${slot.height}`,
  } as React.CSSProperties;
  const source = sourceFor(slot);
  const game = slot.game ? GAMES.find((g) => g.id === slot.game) : undefined;
  const cls = `as-slot as-slot-${slot.kind} as-src-${source.kind}`;

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
    : <img src={url(source.src)} alt={game ? game.title : ''} width={slot.width} height={slot.height} decoding="async" />;
  if (game) {
    return (
      <a className={cls} style={style} data-slot={slot.id} href={url(game.path)} aria-label={`${game.title} — ${game.when}`}>
        {body}
      </a>
    );
  }
  return <div className={cls} style={style} data-slot={slot.id} aria-hidden="true">{body}</div>;
}

/** Version 2: the page is itself a painting in the three title paintings' style. */
function VersionTwo() {
  return (
    <main className="as as-v2">
      <h1 className="sr-only">Ancient Seas Trilogy</h1>
      <div className="as-stage" role="navigation" aria-label="The three games">
        {SLOTS.map((slot) => <SlotView key={slot.id} slot={slot} />)}
      </div>
      <VersionSwitch version={2} />
    </main>
  );
}

export function AncientSeas() {
  const version = parseVersion(typeof location === 'undefined' ? '' : location.search);
  return version === 2 ? <VersionTwo /> : <VersionOne />;
}
