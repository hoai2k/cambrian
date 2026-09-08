import { ACTIVE_ERA } from '../content';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { HudSnapshot } from '../render/engine';
import { creature, type CreatureId } from '../sim/creatures';
import type { PlayerSetup } from '../sim/types';
import { BIOMES } from '../sim/world';
import { biomeArtPath } from '../shared/environment-assets';
import { appBase } from '../shared/base';
import type { DialogKind, Settings } from './App';
import { MODE_INFO } from './App';
import { CreaturePortrait } from './CreaturePortrait';
import { LANDMARK_BLURBS, LANDMARK_NAMES, loadCodex, mergeCodex, saveCodex, type Codex } from './codex';
import { CloseIcon } from './icons';
import { XboxDiagram } from './XboxDiagram';
import { KeyboardDiagram } from './KeyboardDiagram';
import { btn, key, type Scheme } from '../shared/controls';

const LANDMARK_KINDS = ['arch', 'stack', 'bones'] as const;

export function PauseMenu({ onResume, onChange, onQuit, scheme }: { onResume: () => void; onChange: () => void; onQuit: () => void; scheme: Scheme }) {
  // Only the pad has a shortcut for the two lower buttons; on mouse and keyboard they are simply
  // clicked, and a <kbd> for a key that does nothing would be worse than none at all.
  const pad = scheme === 'pad';
  return (
    <div className="overlay">
      <div className="panel">
        <p className="eyebrow">PAUSED</p>
        <h2>Catch your breath.</h2>
        <div className="menu-buttons">
          <button className="start-button" onClick={onResume}>RESUME <kbd>{key('confirm', scheme)}</kbd></button>
          <button className="ghost" onClick={onChange}>Change creatures {pad && <kbd>X</kbd>}</button>
          <button className="ghost" onClick={onQuit}>Quit to title {pad && <kbd>Y</kbd>}</button>
        </div>
      </div>
    </div>
  );
}

export function Results({ snapshot, players, beaten, onAgain, onContinue, onChange, onTitle, scheme }: { snapshot: HudSnapshot; players: PlayerSetup[]; beaten: CreatureId[]; onAgain: () => void; onContinue: () => void; onChange: () => void; onTitle: () => void; scheme: Scheme }) {
  // The record as it stood before this match, snapshotted once when the screen appears; the merge
  // against it is pure, so re-rendering never eats the "NEW" marks (see codex.ts).
  const [before] = useState(loadCodex);
  const { codex, fresh } = useMemo(() => mergeCodex(before, snapshot.discovery), [before, snapshot.discovery]);
  useEffect(() => { saveCodex(codex); }, [codex]);
  return (
    <div className="overlay">
      <div className="panel results">
        <p className="eyebrow">{MODE_INFO[snapshot.mode].name.toUpperCase()} · {snapshot.status === 'won' ? 'VICTORY' : ACTIVE_ERA.copy.lose}</p>
        <h2>{snapshot.message}</h2>
        <div className="result-grid">
          {snapshot.players.map((p, i) => (
            <div key={i} className="result-card" style={{ ['--player' as string]: p.color }}>
              <span className="player-chip">P{i + 1}</span>
              <b>{creature(players[i]?.creature ?? p.creature).name}</b>
              {creature(players[i]?.creature ?? p.creature).kind && <span className="result-kind">{creature(players[i]?.creature ?? p.creature).kind}</span>}
              <span>{p.tierName}</span>
              <small>{p.eats} eaten · {p.kills} kills · {p.escapes} escapes</small>
              {/* Rise keeps a high-water mark per creature; say so when this match moved one. The
                  shell hands us the list, because the stored record already has this match in it. */}
              {beaten.includes(players[i]?.creature ?? p.creature) && <span className="new-tag best-tag">NEW BEST</span>}
            </div>
          ))}
        </div>
        <Discoveries codex={codex} fresh={fresh} />
        <div className="menu-buttons">
          <button className="start-button" onClick={onAgain}>AGAIN <kbd>{key('confirm', scheme)}</kbd></button>
          {/* Co-op modes are milestones, not verdicts: the sea is still there to swim in. */}
          {snapshot.canContinue && <button className="ghost" onClick={onContinue}>Keep playing {scheme === 'pad' && <kbd>Y</kbd>}</button>}
          <button className="ghost" onClick={onChange}>Change creatures {scheme === 'pad' && <kbd>X</kbd>}</button>
          <button className="ghost" onClick={onTitle}><kbd>{key('back', scheme)}</kbd> Title</button>
        </div>
      </div>
    </div>
  );
}

/**
 * The record: every biome in the sea, every kind of landmark, and every species that has been
 * taken to Apex. What the player has found is shown in full; what they have not is a silhouette,
 * so the page is a map of what is left rather than a list of what happened. Anything this match
 * added is called out as new.
 */
function Discoveries({ codex, fresh }: { codex: Codex; fresh: Codex }) {
  const base = appBase();
  const seenBiome = new Set(codex.biomes), newBiome = new Set(fresh.biomes);
  const seenMark = new Set(codex.landmarks), newMark = new Set(fresh.landmarks);
  const newApex = new Set(fresh.apex);
  const roster = ACTIVE_ERA.creatures;
  return (
    <div className="discoveries">
      <div className="discovery-head">
        <p className="eyebrow">DISCOVERED</p>
        <span>{seenBiome.size}/{BIOMES.length} biomes · {seenMark.size}/{LANDMARK_KINDS.length} landmarks · {codex.apex.length}/{roster.length} at Apex</span>
      </div>

      <ul className="biome-strip">
        {BIOMES.map((b) => {
          const seen = seenBiome.has(b);
          return (
            <li key={b} className={`biome-card ${seen ? 'found' : 'unfound'} ${newBiome.has(b) ? 'fresh' : ''}`}>
              {seen && <img src={`${base}${biomeArtPath(b)}`} alt="" loading="lazy" />}
              <b>{seen ? ACTIVE_ERA.environment.biomeNames[b] : '???'}</b>
              {newBiome.has(b) && <span className="new-tag">NEW</span>}
            </li>
          );
        })}
      </ul>

      <ul className="landmark-strip">
        {LANDMARK_KINDS.map((k) => {
          const seen = seenMark.has(k);
          return (
            <li key={k} className={`landmark-card ${seen ? 'found' : 'unfound'} ${newMark.has(k) ? 'fresh' : ''}`}>
              <b>{seen ? LANDMARK_NAMES[k] : 'Not found yet'}</b>
              <small>{seen ? LANDMARK_BLURBS[k] : 'Somewhere out there.'}</small>
              {newMark.has(k) && <span className="new-tag">NEW</span>}
            </li>
          );
        })}
      </ul>

      <ul className="apex-strip">
        {roster.map((c) => {
          const seen = codex.apex.includes(c.id);
          return (
            <li key={c.id} className={`apex-card ${seen ? 'found' : 'unfound'} ${newApex.has(c.id) ? 'fresh' : ''}`} title={seen ? `${c.name} · reached Apex` : `${c.name} · not yet at Apex`}>
              <CreaturePortrait creatureId={c.id} kind="thumb" assetBase={base} alt={c.name} loading="lazy" />
              <span>{c.name}</span>
              {newApex.has(c.id) && <span className="new-tag">NEW</span>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function Dialogs({ kind, onClose, settings, onSettings, scheme }: { kind: DialogKind; onClose: () => void; settings: Settings; onSettings: (s: Settings) => void; scheme: Scheme }) {
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
          {scheme === 'pad' ? <XboxDiagram /> : <KeyboardDiagram />}
          <div className="help-columns">
            <section>
              <h3>Hunting</h3>
              <p>Hold <b>{btn('aim', scheme)}</b> to aim: the view moves over your shoulder and a crosshair sits at the centre of the screen. It snaps to nearby prey as you enter aim; after that, steer it with the {scheme === 'pad' ? 'right stick' : 'mouse'}. <b>{btn('heavy', scheme)}</b> performs your creature’s heavy move: snatch, seize, rake, crush, charge or feeding sweep. Creatures without a special heavy pounce toward aimed prey or lunge forward. <b>{btn('guard', scheme)}</b> blocks with the creature’s natural defense; tap for a parry. Hallucigenia braces, Canadia flares its bristles, Olenoides rolls while blocking, and Wiwaxia releases a shove after holding block. <b>{btn('dash', scheme)}</b> dashes: press it with a direction held to burst that way with a moment of invulnerability, far enough to clear a giant's bite — and it scales with your body, so a grown creature covers real ground. Hold it with no direction and the dash fires the moment you move. <b>{btn('sprint', scheme)}</b> sprints, <b>{btn('rise', scheme)}</b> rises — seafloor creatures hop with it, and holding it paddles them up into open water, where they swim slowly and cannot sprint or dash until they are back on the bottom. <b>{btn('zoom', scheme)}</b> pulls the camera in and out.</p>
              <h3>The sea</h3>
              <p>It has one edge: the shore you hatch beside. Swim along it and the world stays gentle; swim <b>away</b> from it and the biomes change: shelf, sponge forest, boulder fields, the channels, the escarpment, and the deep basin, where the giants live. The <b>radar</b> at the top right shows anything big enough to hurt you, whatever is hunting you, the nearest shoals worth eating, your nursery and the shore. Creatures show only while they are inside its reach; the other players, your nursery and the shore sit hollow on the rim when they are past it, pointing the way. Press <b>{btn('teleport', scheme)}</b> for the teleport menu: back to your nursery, or straight to another player. Hold <b>{btn('view', scheme)}</b> for the scoreboard: everyone in the match, what they have done, and what this mode is asking of them.</p>
              <h3>Fighting</h3>
              <p><b>{btn('light', scheme)}</b> chains three bites, the third hits hard. <b>{btn('heavy', scheme)}</b> is your heavy: the creature’s special if it has one, otherwise a pounce — either way a long committed lunge that carries you onto what you aimed at. The crosshair names it when it will connect. <b>{btn('guard', scheme)}</b> held raises a shield; tapped as a hit lands, it parries and staggers them (Waptia cannot guard, so it dodges instead). Hits from behind or below hurt more. Stamina runs everything: an exhausted creature can't dash. Nothing dies in one bite unless it is far smaller than you: a peer takes a couple of hits, a giant needs about three good bites to kill you, and after six seconds out of the fight your health starts to return. Bite a bigger predator enough and it breaks off and runs.</p>
              </section>
            <section>
              <h3>Giants</h3>
              <p>The big ones cruise high in the light and only dive when they are hungry. When one turns your way an eye fills at the top of your screen: <b>stop moving</b>, or slip under the sponges and <b>hold still</b> until it loses you. They are slow to turn and cannot get their heads into dense cover. Their bite is a slow heavy: dash the moment you see the wind-up. If one does catch you at zero health, it swallows you whole.</p>
              <h3>Growing</h3>
              <p>The ring fills as you eat. Fill it, moult, get bigger. Kills of your own size are worth far more than plankton. Dying drops you a tier but keeps half your progress. <b>{btn('ability', scheme)}</b> hides at every size. Marrella and Ottoia sink and burrow for free; hide or heavy emerges with a free strike. Other creatures gradually copy the nearest plant, rock, seabed or creature colours, spending stamina. Idle camouflage slowly sinks: move in any direction to counter it. Attacking, blocking, sprinting or being hit reveals you.</p>
              {scheme === 'pad'
                ? <>
                    <h3>Keyboard</h3>
                    <p>No controller? The game switches to mouse and keyboard on its own the moment none is connected. Share a screen and the second player gets the right-hand keys.<br /><b>1:</b> WASD swim · arrows look · PgUp/PgDn zoom · Shift sprint · Space rise · C sink · F bite · G heavy · R hide · V dash · Q guard · Tab aim · E sense · T teleport · Z scoreboard · Esc pause.<br /><b>2:</b> IJKL swim · Right Shift sprint · N rise · M sink · ; bite · ' heavy · P hide · / dash · U guard · O aim · Y sense · H teleport · , scoreboard.</p>
                  </>
                : <>
                    <h3>Controller</h3>
                    <p>Plug an Xbox-style pad in and press a button: the game hands it the match and every prompt here changes to read <b>RT</b>, <b>LB</b>, <b>Y</b> instead. Up to four can play at once, and the mouse goes back to being a cursor.</p>
                    <p>Sharing one keyboard? A second player takes the right-hand keys: <b>IJKL</b> swim · Right Shift sprint · N rise · M sink · ; bite · ' heavy · P hide · / dash · U guard · O aim · Y sense · H teleport · , scoreboard. The mouse stays with player one.</p>
                  </>}
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
