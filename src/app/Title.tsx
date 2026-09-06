import { Emblem } from './icons';

export function TitleScreen({ onStart, loaded, padCount }: { onStart: () => void; loaded: boolean; padCount: number }) {
  return (
    <section className="title" onClick={onStart} role="button" tabIndex={0} aria-label="Press start">
      <div className="title-inner">
        <div className="title-mark"><Emblem size={92} /></div>
        <h1 className="title-logo">
          <span className="logo-line-1">CAMBRIAN</span>
          <span className="logo-line-2">EXPLOSION</span>
        </h1>
        <p className="title-tag">Eat. Grow. Fight. Run. <em>508 million years ago, everything was hungry.</em></p>
        <p className={`press-start ${loaded ? '' : 'loading'}`}>{loaded ? 'PRESS START' : 'WAKING THE REEF…'}</p>
        <p className="title-hint">{padCount > 0 ? `${padCount} controller${padCount > 1 ? 's' : ''} connected · any button` : 'Connect an Xbox controller, press any key, or click'}</p>
      </div>
    </section>
  );
}
