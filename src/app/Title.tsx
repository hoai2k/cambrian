import { Emblem } from './icons';

export function TitleScreen({ onStart, loaded, padCount }: { onStart: () => void; loaded: boolean; padCount: number }) {
  return (
    <section className="title" onClick={onStart} role="button" tabIndex={0} aria-label="Press start">
      <picture><source media="(orientation: portrait)" srcSet={`${import.meta.env.BASE_URL}assets/brand/keyart-mobile.webp`} /><img className="title-art" src={`${import.meta.env.BASE_URL}assets/brand/keyart.webp`} alt="" /></picture>
      <div className="title-inner">
        <div className="title-mark"><Emblem size={92} /></div>
        <h1 className="title-logo">
          <img className="brand-logo" src={`${import.meta.env.BASE_URL}assets/brand/logo.svg`} alt="Cambrian Explosion" />
        </h1>
        <p className="title-tag">Eat. Grow. Fight. Run. <em>508 million years ago, everything was hungry.</em></p>
        <p className={`press-start ${loaded ? '' : 'loading'}`}>{loaded ? 'PRESS START' : 'WAKING THE REEF…'}</p>
        <p className="title-hint">{padCount > 0 ? `${padCount} controller${padCount > 1 ? 's' : ''} connected · any button` : 'Connect an Xbox controller, press any key, or click'}</p>
      </div>
    </section>
  );
}
