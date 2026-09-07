import { ACTIVE_ERA } from '../content';
import { appBase } from '../shared/base';

export function TitleScreen({ onStart, loaded, padCount }: { onStart: () => void; loaded: boolean; padCount: number }) {
  const copy = ACTIVE_ERA.copy;
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
        <p className="title-hint">{padCount > 0 ? `${padCount} controller${padCount > 1 ? 's' : ''} connected · any button · others join on the next screen` : 'Connect an Xbox controller, press any key, or click'}</p>
      </div>
    </section>
  );
}
