import { useEffect, useRef } from 'react';
import type { HudSnapshot } from '../render/engine';
import { creature } from '../sim/creatures';
import type { PlayerSetup } from '../sim/types';
import type { DialogKind, Settings } from './App';
import { MODE_INFO } from './App';
import { CloseIcon } from './icons';
import { XboxDiagram } from './XboxDiagram';

export function PauseMenu({ onResume, onChange, onQuit }: { onResume: () => void; onChange: () => void; onQuit: () => void }) {
  return (
    <div className="overlay">
      <div className="panel">
        <p className="eyebrow">PAUSED</p>
        <h2>Catch your breath.</h2>
        <div className="menu-buttons">
          <button className="start-button" onClick={onResume}>RESUME <kbd>A</kbd></button>
          <button className="ghost" onClick={onChange}>Change creatures <kbd>X</kbd></button>
          <button className="ghost" onClick={onQuit}>Quit to title <kbd>Y</kbd></button>
        </div>
      </div>
    </div>
  );
}

export function Results({ snapshot, players, onAgain, onChange, onTitle }: { snapshot: HudSnapshot; players: PlayerSetup[]; onAgain: () => void; onChange: () => void; onTitle: () => void }) {
  return (
    <div className="overlay">
      <div className="panel results">
        <p className="eyebrow">{MODE_INFO[snapshot.mode].name.toUpperCase()} · {snapshot.status === 'won' ? 'VICTORY' : 'THE REEF WINS'}</p>
        <h2>{snapshot.message}</h2>
        <div className="result-grid">
          {snapshot.players.map((p, i) => (
            <div key={i} className="result-card" style={{ ['--player' as string]: p.color }}>
              <span className="player-chip">P{i + 1}</span>
              <b>{creature(players[i]?.creature ?? p.creature).name}</b>
              <span>{p.tierName}</span>
              <small>{p.eats} eaten · {p.kills} kills · {p.escapes} escapes</small>
            </div>
          ))}
        </div>
        <div className="menu-buttons">
          <button className="start-button" onClick={onAgain}>AGAIN <kbd>A</kbd></button>
          <button className="ghost" onClick={onChange}>Change creatures <kbd>X</kbd></button>
          <button className="ghost" onClick={onTitle}>Title <kbd>B</kbd></button>
        </div>
      </div>
    </div>
  );
}

export function Dialogs({ kind, onClose, settings, onSettings }: { kind: DialogKind; onClose: () => void; settings: Settings; onSettings: (s: Settings) => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current; if (!d) return;
    if (kind && !d.open) d.showModal();
    if (!kind && d.open) d.close();
  }, [kind]);
  return (
    <dialog ref={ref} className="tools-dialog" onCancel={(e) => { e.preventDefault(); onClose(); }} onClick={(e) => { if (e.target === ref.current) onClose(); }}>
      <button className="tools-close icon-button" aria-label="Close" onClick={onClose}><CloseIcon /></button>
      {kind === 'help' && (
        <div className="dialog-body">
          <p className="eyebrow">HOW TO PLAY</p>
          <h2>One rule: size.</h2>
          <p>Everything is colour-coded by how big it is next to you. <span className="band snack">Green</span> you swim through and eat. <span className="band prey">Teal</span> runs; chase it and bite. <span className="band rival">Amber</span> can fight back: circle, bait, parry, punish. <span className="band threat">Orange</span> will hurt you. <span className="band giant">Red</span> ends you. Break line of sight, get into sponges, hold still.</p>
          <XboxDiagram />
          <div className="help-columns">
            <section>
              <h3>Hunting</h3>
              <p>Hold <b>LT</b> to aim: the view moves over your shoulder and a crosshair sits at the centre of the screen. It snaps to nearby prey as you enter aim; after that, steer it with the right stick. <b>RT</b> performs your creature’s heavy move: snatch, seize, rake, crush, charge or feeding sweep. Creatures without a special heavy pounce toward aimed prey or lunge forward. <b>B</b> blocks with the creature’s natural defense; tap for a parry. Hallucigenia braces, Canadia flares its bristles, Olenoides rolls while blocking, and Wiwaxia releases a shove after holding block. <b>LB</b> dashes: press it with a stick direction to burst that way with a moment of invulnerability, far enough to clear a giant's bite, or hold it with the stick centred and the dash fires the moment you move. <b>A</b> sprints, <b>RB</b> rises. Press the <b>right stick</b> in and push up or down to zoom the camera.</p>
              <h3>The sea</h3>
              <p>It has one edge: the shore you hatch beside. Swim along it and the world stays gentle; swim <b>away</b> from it and the biomes change: shelf, sponge forest, boulder fields, the channels, the escarpment, and the deep basin, where the giants live. The <b>radar</b> in the corner shows other players, anything big enough to hurt you, whatever is hunting you, your nursery and the shore; contacts past its reach sit hollow on the rim. Press <b>D-pad down</b> for the teleport menu: back to your nursery, or straight to another player.</p>
              <h3>Fighting</h3>
              <p><b>X</b> chains three bites, the third hits hard. <b>RT</b> is the pounce: a long committed lunge that breaks guard. <b>B</b> held raises a shield; tapped as a hit lands, it parries and staggers them (Waptia cannot guard, so B dodges). Hits from behind or below hurt more. Stamina runs everything: an exhausted creature can't dash. Nothing dies in one bite unless it is far smaller than you: a peer takes a couple of hits, a giant needs about three good bites to kill you, and after six seconds out of the fight your health starts to return. Bite a bigger predator enough and it breaks off and runs.</p>
              </section>
            <section>
              <h3>Giants</h3>
              <p>The big ones cruise high in the light and only dive when they are hungry. When one turns your way an eye fills at the top of your screen: <b>stop moving</b>, or slip under the sponges and <b>hold still</b> until it loses you. They are slow to turn and cannot get their heads into dense cover. Their bite is a slow heavy: dash the moment you see the wind-up. If one does catch you at zero health, it swallows you whole.</p>
              <h3>Growing</h3>
              <p>The ring fills as you eat. Fill it, moult, get bigger. Kills of your own size are worth far more than plankton. Dying drops you a tier but keeps half your progress. <b>Y</b> hides at every size. Marrella and Ottoia sink and burrow for free; Y or heavy emerges with a free strike. Other creatures gradually copy the nearest plant, rock, seabed or creature colours, spending stamina. Idle camouflage slowly sinks: move in any direction to counter it. Attacking, blocking, sprinting or being hit reveals you.</p>
              <h3>Keyboard</h3>
              <p><b>1:</b> WASD swim · arrows look · PgUp/PgDn zoom · Shift sprint · Space rise · C sink · F bite · G heavy · R hide · V dash · Q guard · Tab aim · E sense · Esc pause.<br /><b>2:</b> IJKL swim · Right Shift sprint · N rise · M sink · ; bite · ' heavy · P hide · / dash · U guard · O aim · Y sense.</p>
            </section>
          </div>
        </div>
      )}
      {kind === 'settings' && (
        <div className="dialog-body settings">
          <p className="eyebrow">SETTINGS</p>
          <h2>Tune the sea.</h2>
          <label className="setting-row">
            <span>Detail <small>Shadows, density, resolution</small></span>
            <div className="seg">
              {(['high', 'low'] as const).map((q) => <button key={q} aria-pressed={settings.quality === q} onClick={() => onSettings({ ...settings, quality: q })}>{q === 'high' ? 'High' : 'Performance'}</button>)}
            </div>
          </label>
          <label className="setting-row" htmlFor="look-speed">
            <span>Camera speed <small>{settings.lookSpeed.toFixed(1)}×</small></span>
            <input id="look-speed" type="range" min={0.4} max={2} step={0.1} value={settings.lookSpeed} onChange={(e) => onSettings({ ...settings, lookSpeed: Number(e.target.value) })} />
          </label>
          <label className="setting-row">
            <span>Invert camera Y</span>
            <input type="checkbox" checked={settings.invertY} onChange={(e) => onSettings({ ...settings, invertY: e.target.checked })} />
          </label>
          <label className="setting-row" htmlFor="volume">
            <span>Volume <small>{Math.round(settings.volume * 100)}%</small></span>
            <input id="volume" type="range" min={0} max={1} step={0.05} value={settings.volume} onChange={(e) => onSettings({ ...settings, volume: Number(e.target.value) })} />
          </label>
          <label className="setting-row">
            <span>Music <small>Tide of First Bones</small></span>
            <input type="checkbox" checked={settings.music} onChange={(e) => onSettings({ ...settings, music: e.target.checked })} />
          </label>
          <label className="setting-row">
            <span>Mute</span>
            <input type="checkbox" checked={settings.muted} onChange={(e) => onSettings({ ...settings, muted: e.target.checked })} />
          </label>
          <p className="dim">Settings apply to every local player and are remembered on this device.</p>
        </div>
      )}
    </dialog>
  );
}
