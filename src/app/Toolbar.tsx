import { ExpandIcon, GearIcon, HelpIcon, ShrinkIcon, SoundOffIcon, SoundOnIcon } from './icons';
import type { ToolbarPlace } from './toolbar-place';
import { TEXT } from '../shared/text';

/**
 * The icon buttons. `place` is worked out from who is looking at which corner (`toolbarPlace`): a
 * player who has turned sense off asked for nothing over the sea, and these are over their sea.
 */
export function Toolbar({ isFs, muted, place = 'right', focus = -1, onHelp, onSettings, onMute, onFullscreen }: {
  isFs: boolean; muted: boolean; place?: ToolbarPlace;
  /** Which icon the pad is pointing at, or -1 when the shoulder ring is elsewhere. */
  focus?: number;
  onHelp: () => void; onSettings: () => void; onMute: () => void; onFullscreen: () => void;
}) {
  if (place === 'hidden') return null;
  const t = TEXT.toolbar;
  const lit = (i: number) => (i === focus ? ' pad-focus' : '');
  return (
    <nav className={`toolbar toolbar-${place}`} aria-label={t.label}>
      <button className={`icon-button${lit(0)}`} title={t.help} aria-label={t.help} onClick={(e) => { e.stopPropagation(); onHelp(); }}><HelpIcon /></button>
      {/* Sound off is the one setting worth reaching without opening the panel. */}
      <button className={`icon-button ${muted ? 'off' : ''}${lit(1)}`} title={muted ? t.soundOn : t.soundOff} aria-label={muted ? t.soundOn : t.soundOff} aria-pressed={muted} onClick={(e) => { e.stopPropagation(); onMute(); }}>{muted ? <SoundOffIcon /> : <SoundOnIcon />}</button>
      <button className={`icon-button${lit(2)}`} title={t.settings} aria-label={t.settings} onClick={(e) => { e.stopPropagation(); onSettings(); }}><GearIcon /></button>
      <button className={`icon-button${lit(3)}`} title={isFs ? t.exitFullscreen : t.fullscreen} aria-label={isFs ? t.exitFullscreen : t.fullscreen} onClick={(e) => { e.stopPropagation(); onFullscreen(); }}>{isFs ? <ShrinkIcon /> : <ExpandIcon />}</button>
    </nav>
  );
}
