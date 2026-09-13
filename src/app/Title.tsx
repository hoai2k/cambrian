import { ACTIVE_ERA } from '../content';
import { appBase } from '../shared/base';

/**
 * The title screen, drawn from the first frame — before the creatures have streamed in, and
 * whether the player arrived cold or followed a link.
 *
 * While the assets are still coming it says so where PRESS START goes, and if the wait outlasts
 * `WAIT_HINT` it grows a progress bar under that line (`progress`, null until then). A bar that
 * appears the instant something is asked for reads as a stutter on a warm load, which is the same
 * reason the boot screen waits; and a boot screen over a title screen that is already showing the
 * same painting is one screen too many, so on the title it is this bar rather than that screen.
 */
export function TitleScreen({ onStart, loaded, padCount, eraFocused = false, progress = null, status }: { onStart: () => void; loaded: boolean; padCount: number; eraFocused?: boolean; progress?: number | null; status?: string }) {
  const copy = ACTIVE_ERA.copy;
  // Every other era in the build: `sibling` first (the one the copy was written around), then the rest.
  const siblings = [...(copy.sibling ? [copy.sibling] : []), ...(copy.siblings ?? [])];
  return (
    <section className="title title-illustrated" onClick={onStart} role="button" tabIndex={0} aria-label="Press start">
      <picture>
        {copy.mobileIllustration && <source media="(orientation: portrait)" srcSet={`${appBase()}${copy.mobileIllustration}`} />}
        <img className="title-illustration" src={`${appBase()}${ACTIVE_ERA.assets.illustration}`} alt="" />
      </picture>
      <h1 className="sr-only">{ACTIVE_ERA.title}</h1>
      <div className="title-inner">
        <p className="title-tag">{copy.tagline} <em>{copy.taglineEm}</em></p>
        {/*
          * `waiting`, not `loading`: `.loading` is the boot screen's own class — position absolute,
          * inset 0, its own background — and this line was quietly picking all of that up and
          * drawing itself as a full-screen panel over the title. It only showed while the assets
          * were still coming, which until now was a moment nobody saw.
          */}
        <p className={`press-start ${loaded ? '' : 'waiting'}`}>{loaded ? 'PRESS START' : copy.loading}</p>
        {!loaded && progress !== null && (
          <div className="title-progress">
            <div className="loading-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)} aria-label={copy.loading}>
              <i style={{ width: `${Math.round(progress * 100)}%` }} />
            </div>
            {status && <p className="title-progress-status">{status}</p>}
          </div>
        )}
        <p className="title-hint">{padCount > 0 ? `${padCount} controller${padCount > 1 ? 's' : ''} connected · any button · others join on the next screen` : 'Press any key or click to play on mouse and keyboard · or connect a controller'}</p>
      </div>
      {/*
        * The other eras, one click away and only from the title screen. Clicks and keys are kept
        * off the surrounding press-start surface, or following the link would also start a match.
        * They are in a column: each link used to place itself in the corner, so with two of them
        * (which is every era now there are three games) the second sat on top of the first.
        */}
      <nav className="era-switches" aria-label="The other games">
      {siblings.map((sibling, i) => (
        <a
          key={sibling.path}
          className={`era-switch${eraFocused && i === 0 ? ' pad-focus' : ''}`}
          href={`${appBase()}${sibling.path}`}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          <span className="era-switch-eyebrow">ALSO PLAYABLE</span>
          <b>{sibling.title}</b>
          <span className="era-switch-blurb">{sibling.blurb}</span>
        </a>
      ))}
      </nav>
    </section>
  );
}
