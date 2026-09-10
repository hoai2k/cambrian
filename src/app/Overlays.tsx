import { hasEquivalentSizing } from '../sim/creatures';
import { ACTIVE_ERA } from '../content';
import { useEffect, useRef } from 'react';
import type { HudSnapshot } from '../render/engine';
import { creature } from '../sim/creatures';
import type { PlayerSetup } from '../sim/types';
import { BIOMES } from '../sim/world';
import { biomeArtPath } from '../shared/environment-assets';
import { appBase } from '../shared/base';
import type { DialogKind, Settings } from './App';
import { MODE_INFO } from './App';
import { CreaturePortrait } from './CreaturePortrait';
import { LANDMARK_BLURBS, LANDMARK_NAMES, type Codex } from './codex';
import { CloseIcon } from './icons';
import { XboxDiagram } from './XboxDiagram';
import { KeyboardDiagram } from './KeyboardDiagram';
import { btn, type Scheme } from '../shared/controls';

const LANDMARK_KINDS = ['arch', 'stack', 'bones'] as const;

/**
 * One choice on an in-game menu.
 *
 * Both menus used to give every choice its own button — A resumed, RT went back to select, Y quit
 * — which meant three live shortcuts on a screen that appears the instant a match ends, while the
 * player is still holding whatever they were fighting with. A pad has no idea it has stopped being
 * a fight. So the menus are navigated and confirmed instead: one cursor, one button that acts, and
 * the cursor starts on the choice that costs least if it is hit by accident.
 */
export interface MenuItem { label: string; run: () => void; primary?: boolean }

export function MenuButtons({ items, sel, shown, onHover, scheme }: { items: MenuItem[]; sel: number; shown: boolean; onHover: (i: number) => void; scheme: Scheme }) {
  return (
    <div className="menu-buttons">
      <div className="menu-choices" role="menu">
        {items.map((it, i) => (
          <button key={it.label} role="menuitem" aria-current={shown && sel === i}
            className={`${it.primary ? 'start-button' : 'ghost'} ${shown && sel === i ? 'selected' : ''}`}
            onMouseEnter={() => onHover(i)} onFocus={() => onHover(i)} onClick={it.run}>{it.label}</button>
        ))}
      </div>
      <p className="menu-hint">{btn('pick', scheme)} chooses · {btn('confirm', scheme)} confirms</p>
    </div>
  );
}

export function PauseMenu({ items, sel, shown, onHover, scheme }: { items: MenuItem[]; sel: number; shown: boolean; onHover: (i: number) => void; scheme: Scheme }) {
  return (
    <div className="overlay">
      <div className="panel">
        <p className="eyebrow">PAUSED</p>
        <h2>Catch your breath.</h2>
        <MenuButtons items={items} sel={sel} shown={shown} onHover={onHover} scheme={scheme} />
      </div>
    </div>
  );
}

export function Results({ snapshot, players, record, fresh, items, sel, shown, onHover, scheme }: { snapshot: HudSnapshot; players: PlayerSetup[]; record: Codex; fresh: Codex; items: MenuItem[]; sel: number; shown: boolean; onHover: (i: number) => void; scheme: Scheme }) {
  // Both come from the shell, which writes finds to the record as the match makes them and keeps a
  // running list of what this one added. This screen no longer works out what is new by comparing
  // the store against the match: the store already contains the match by the time it gets here.
  const codex = record;
  return (
    <div className="overlay">
      {/* A column, not a scrolling block: the header and the choices are pinned and only the middle
          scrolls, so the buttons are on screen whatever the window is doing. They used to be the
          last thing inside one tall scroller and simply fell off the bottom of a short screen. */}
      <div className="panel results">
        <p className="eyebrow">{MODE_INFO[snapshot.mode].name.toUpperCase()} · {snapshot.status === 'won' ? 'VICTORY' : ACTIVE_ERA.copy.lose}</p>
        <h2>{snapshot.message}</h2>
        <div className="results-scroll">
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
              {fresh.best[players[i]?.creature ?? p.creature] !== undefined && <span className="new-tag best-tag">NEW BEST</span>}
            </div>
          ))}
        </div>
        <Discoveries codex={codex} fresh={fresh} />
        </div>
        <MenuButtons items={items} sel={sel} shown={shown} onHover={onHover} scheme={scheme} />
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
              <p>Hold <b>{btn('aim', scheme)}</b> to aim: the view moves over your shoulder and a crosshair sits at the centre of the screen. It snaps to nearby prey as you enter aim; after that, steer it with the {scheme === 'pad' ? 'right stick' : 'mouse'}. <b>{btn('heavy', scheme)}</b> performs your creature’s heavy move: snatch, seize, rake, crush, charge or feeding sweep. Creatures without a special heavy pounce toward aimed prey or lunge forward. <b>{btn('guard', scheme)}</b> blocks with the creature’s natural defense; tap for a parry. Hallucigenia braces, Canadia flares its bristles, Olenoides rolls while blocking, and Wiwaxia releases a shove after holding block. <b>{btn('dash', scheme)}</b> dashes: press it with a direction held to burst that way with a moment of invulnerability, far enough to clear a giant's bite — and it scales with your body, so a grown creature covers real ground. Press it with no direction and you dash along your own axis: ahead for most animals, and out behind for a shelled jetter, which is how it escapes. <b>{btn('sprint', scheme)}</b> sprints, <b>{btn('rise', scheme)}</b> rises — seafloor creatures hop with it, and holding it paddles them up into open water, where they swim slowly and cannot sprint or dash until they are back on the bottom. <b>{btn('zoom', scheme)}</b> pulls the camera in and out. <b>{btn('sense', scheme)}</b> turns Sense on and off: on, the size-band marks over creatures and the radar are drawn; off, nothing is drawn over the sea but the bar at the bottom. It is on to begin with, costs nothing and never runs out — turning it off is for the look of the thing.</p>
              <h3>The sea</h3>
              <p>It has one edge: the shore you hatch beside. Swim along it and the world stays gentle; swim <b>away</b> from it and the biomes change: shelf, sponge forest, boulder fields, the channels, the escarpment, and the deep basin, where the giants live. The <b>radar</b> at the top right shows anything big enough to hurt you, whatever is hunting you, the nearest shoals worth eating, your nursery and the shore. Creatures show only while they are inside its reach; the other players, your nursery and the shore sit hollow on the rim when they are past it, pointing the way. Press <b>{btn('teleport', scheme)}</b> for the teleport menu: back to your nursery, or straight to another player. Hold <b>{btn('view', scheme)}</b> for the scoreboard: everyone in the match, what they have done, and what this mode is asking of them.</p>
              <h3>Fighting</h3>
              <p><b>{btn('light', scheme)}</b> chains three bites, the third hits hard. <b>{btn('heavy', scheme)}</b> is your heavy: the creature’s special if it has one, otherwise a pounce — either way a long committed lunge that carries you onto what you aimed at. The crosshair names it when it will connect. Press it while sprinting or mid-dash and it becomes a charge: it takes whatever is nearest the line you are travelling along, for extra stamina. <b>{btn('guard', scheme)}</b> held raises a shield; tapped as a hit lands, it parries and staggers them (Waptia cannot guard, so it dodges instead). Hits from behind or below hurt more. Stamina runs everything: an exhausted creature can't dash. Nothing dies in one bite unless it is far smaller than you: a peer takes a couple of hits, a giant needs about three good bites to kill you, and after six seconds out of the fight your health starts to return. Bite a bigger predator enough and it breaks off and runs.</p>
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
          {hasEquivalentSizing() && (
            <label className="setting-row">
              <span>Equivalent sizing <small>Every animal at its real size beside the others. Takes effect next match.</small></span>
              <input type="checkbox" checked={settings.equivalentSizing} onChange={(e) => onSettings({ ...settings, equivalentSizing: e.target.checked })} />
            </label>
          )}
          <p className="dim">Settings apply to every local player and are remembered on this device.</p>
        </div>
      )}
    </dialog>
  );
}
