import { ACTIVE_ERA } from '../content';
import { appBase } from '../shared/base';

export function TitleScreen({ onStart, loaded, padCount }: { onStart: () => void; loaded: boolean; padCount: number }) {
  return (
    <section className="title title-illustrated" onClick={onStart} role="button" tabIndex={0} aria-label="Press start">
      <img className="title-illustration" src={`${appBase()}${ACTIVE_ERA.assets.illustration}`} alt="" />
      <h1 className="sr-only">Cambrian Explosion</h1>
      <div className="title-inner">
        <p className="title-tag">Eat. Grow. Fight. Run. <em>508 million years ago, everything was hungry.</em></p>
        <p className={`press-start ${loaded ? '' : 'loading'}`}>{loaded ? 'PRESS START' : 'WAKING THE REEF…'}</p>
        <p className="title-hint">{padCount > 0 ? `${padCount} controller${padCount > 1 ? 's' : ''} connected · any button · others join on the next screen` : 'Connect an Xbox controller, press any key, or click'}</p>
      </div>
    </section>
  );
}
