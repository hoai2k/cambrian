import { ExpandIcon, GearIcon, HelpIcon, ShrinkIcon, SoundOffIcon, SoundOnIcon } from './icons';
import type { ToolbarPlace } from './toolbar-place';

/**
 * The icon buttons. `place` is worked out from who is looking at which corner (`toolbarPlace`): a
 * player who has turned sense off asked for nothing over the sea, and these are over their sea.
 */
export function Toolbar({ isFs, muted, place = 'right', onHelp, onSettings, onMute, onFullscreen }: {
  isFs: boolean; muted: boolean; place?: ToolbarPlace;
  onHelp: () => void; onSettings: () => void; onMute: () => void; onFullscreen: () => void;
}) {
  if (place === 'hidden') return null;
  return (
    <nav className={`toolbar toolbar-${place}`} aria-label="Game tools">
      <button className="icon-button" title="How to play" aria-label="How to play" onClick={(e) => { e.stopPropagation(); onHelp(); }}><HelpIcon /></button>
      {/* Sound off is the one setting worth reaching without opening the panel. */}
      <button className={`icon-button ${muted ? 'off' : ''}`} title={muted ? 'Sound on' : 'Sound off'} aria-label={muted ? 'Sound on' : 'Sound off'} aria-pressed={muted} onClick={(e) => { e.stopPropagation(); onMute(); }}>{muted ? <SoundOffIcon /> : <SoundOnIcon />}</button>
      <button className="icon-button" title="Settings" aria-label="Settings" onClick={(e) => { e.stopPropagation(); onSettings(); }}><GearIcon /></button>
      <button className="icon-button" title={isFs ? 'Exit fullscreen' : 'Fullscreen'} aria-label={isFs ? 'Exit fullscreen' : 'Fullscreen'} onClick={(e) => { e.stopPropagation(); onFullscreen(); }}>{isFs ? <ShrinkIcon /> : <ExpandIcon />}</button>
    </nav>
  );
}
