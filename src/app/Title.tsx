import { ACTIVE_ERA } from '../content';
import { appBase } from '../shared/base';

export function TitleScreen({ onStart, loaded, padCount, eraFocused = false }: { onStart: () => void; loaded: boolean; padCount: number; eraFocused?: boolean }) {
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
        <p className={`press-start ${loaded ? '' : 'loading'}`}>{loaded ? 'PRESS START' : copy.loading}</p>
        <p className="title-hint">{padCount > 0 ? `${padCount} controller${padCount > 1 ? 's' : ''} connected · any button · others join on the next screen` : 'Press any key or click to play on mouse and keyboard · or connect a controller'}</p>
      </div>
      {siblings.map((sibling, i) => (
        // The other eras, one click away and only from the title screen. Clicks and keys are kept
        // off the surrounding press-start surface, or following the link would also start a match.
        <a
          key={sibling.path}
          className={`era-switch${eraFocused && i === 0 ? ' pad-focus' : ''}`}
          style={i > 0 ? { marginTop: 8 } : undefined}
          href={`${appBase()}${sibling.path}`}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          <span className="era-switch-eyebrow">ALSO PLAYABLE</span>
          <b>{sibling.title}</b>
          <span className="era-switch-blurb">{sibling.blurb}</span>
        </a>
      ))}
    </section>
  );
}
