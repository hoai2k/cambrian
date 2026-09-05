import { ExpandIcon, GearIcon, HelpIcon, ShrinkIcon } from './icons';

export function Toolbar({ isFs, onHelp, onSettings, onFullscreen }: { isFs: boolean; onHelp: () => void; onSettings: () => void; onFullscreen: () => void }) {
  return (
    <nav className="toolbar" aria-label="Game tools">
      <button className="icon-button" title="How to play" aria-label="How to play" onClick={(e) => { e.stopPropagation(); onHelp(); }}><HelpIcon /></button>
      <button className="icon-button" title="Settings" aria-label="Settings" onClick={(e) => { e.stopPropagation(); onSettings(); }}><GearIcon /></button>
      <button className="icon-button" title={isFs ? 'Exit fullscreen' : 'Fullscreen'} aria-label={isFs ? 'Exit fullscreen' : 'Fullscreen'} onClick={(e) => { e.stopPropagation(); onFullscreen(); }}>{isFs ? <ShrinkIcon /> : <ExpandIcon />}</button>
    </nav>
  );
}
