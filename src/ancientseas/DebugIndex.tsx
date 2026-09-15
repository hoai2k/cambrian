import { appBase } from '../shared/base';
import { DEBUG_GAMES, DEBUG_PAGES, DEBUG_PARAMS, DEBUG_SELF, modeHref, paramHref } from './debug-index';

/** The page is the app root, so every game folder and sibling page hangs directly off it. */
const url = (path: string) => `${appBase()}${path}`;

/**
 * The index of the site's development tools, opened by a bare `?debug` on the trilogy page.
 *
 * Deliberately plain. The page it replaces is a composition and this is a contents list — it wants
 * to be read, not admired — so it borrows the parchment and the ink and then gets out of the way.
 * It draws no pictures, loads no assets and starts nothing: every row is a link and a sentence
 * saying what is on the other end.
 *
 * It is not linked from anywhere. Reaching it still means typing the parameter; what it removes is
 * the need to already know the name of the tool you are looking for.
 */
export function DebugIndex() {
  return (
    <main className="dbg">
      <header className="dbg-head">
        <a className="dbg-back" href={url('')}>← Ancient Seas Trilogy</a>
        <h1>Debug index</h1>
        <p className="dbg-sub">
          Every viewer, bench and debug parameter the site has. None of it is linked from anywhere a
          visitor goes, and nothing here is part of a game: each tool does nothing at all unless its
          own address or parameter is asked for.
        </p>
      </header>

      <section className="dbg-section" aria-labelledby="dbg-pages">
        <h2 id="dbg-pages">Pages</h2>
        <p className="dbg-note">Standalone entry points, opened by address.</p>
        <ul className="dbg-list">
          {DEBUG_PAGES.map((p) => (
            <li key={p.id} className="dbg-row">
              <a className="dbg-name" href={url(p.path)}>
                <b>{p.name}</b><small>/{p.path}</small>
              </a>
              <p className="dbg-blurb">{p.blurb}</p>
              {p.modes && (
                <ul className="dbg-modes">
                  {p.modes.map((m) => (
                    <li key={m.query}>
                      <a className="dbg-mode" href={url(modeHref(p, m.query))}>
                        <b>{m.name}</b><small>?{m.query}</small>
                      </a>
                      <p className="dbg-blurb">{m.blurb}</p>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section className="dbg-section" aria-labelledby="dbg-params">
        <h2 id="dbg-params">Game parameters</h2>
        <p className="dbg-note">
          Added to a game’s own URL. Each game answers all three the same way, so every row offers
          the same parameter on each — including the Triassic, which is not yet a public link but
          opens by address.
        </p>
        <ul className="dbg-list">
          {DEBUG_PARAMS.map((p) => (
            <li key={p.id} className="dbg-row">
              <div className="dbg-name dbg-name-static">
                <b>{p.name}</b><small>?{p.query}</small>
                {p.replacesGame && <em className="dbg-flag">replaces the game</em>}
              </div>
              <p className="dbg-blurb">{p.blurb}</p>
              <ul className="dbg-games">
                {DEBUG_GAMES.map((g) => (
                  <li key={g.id}>
                    <a className="dbg-game" href={url(paramHref(g, p))}>{g.title}</a>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </section>

      <section className="dbg-section" aria-labelledby="dbg-self">
        <h2 id="dbg-self">This page</h2>
        <ul className="dbg-list">
          {DEBUG_SELF.map((p) => (
            <li key={p.id} className="dbg-row">
              <a className="dbg-name" href={url(`?${p.query}`)}>
                <b>{p.name}</b><small>?{p.query}</small>
              </a>
              <p className="dbg-blurb">{p.blurb}</p>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
