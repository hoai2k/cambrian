import { ACTIVE_ERA } from '../content';
import { appBase } from '../shared/base';

export function TitleScreen({ onStart, loaded, padCount }: { onStart: () => void; loaded: boolean; padCount: number }) {
  const copy = ACTIVE_ERA.copy;
  const sibling = copy.sibling;
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
      {sibling && (
        // The other era, one click away and only from the title screen. Clicks and keys are kept
        // off the surrounding press-start surface, or following the link would also start a match.
        <a
          className="era-switch"
          href={`${appBase()}${sibling.path}`}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          <span className="era-switch-eyebrow">ALSO PLAYABLE</span>
          <b>{sibling.title}</b>
          <span className="era-switch-blurb">{sibling.blurb}</span>
        </a>
      )}
    </section>
  );
}
