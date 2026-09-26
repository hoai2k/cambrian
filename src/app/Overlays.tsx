import { hasEquivalentSizing, PLAYABLE } from '../sim/creatures';
import { RULES } from '../sim/era-rules';
import { ACTIVE_ERA } from '../content';
import { useEffect, useRef } from 'react';
import type { HudSnapshot } from '../render/engine';
import { Scoreboard } from './Hud';
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
import { TEXT } from '../shared/text';
import type { HelpButtons } from '../content/strings';

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

export function MenuButtons({ items, sel, shown, onHover }: { items: MenuItem[]; sel: number; shown: boolean; onHover: (i: number) => void }) {
  return (
    <div className="menu-buttons">
      <div className="menu-choices" role="menu">
        {items.map((it, i) => (
          <button key={it.label} role="menuitem" aria-current={shown && sel === i}
            className={`${it.primary ? 'start-button' : 'ghost'} ${shown && sel === i ? 'selected' : ''}`}
            onMouseEnter={() => onHover(i)} onFocus={() => onHover(i)} onClick={it.run}>{it.label}</button>
        ))}
      </div>
    </div>
  );
}

export function PauseMenu({ items, sel, shown, onHover, board }: { items: MenuItem[]; sel: number; shown: boolean; onHover: (i: number) => void; board?: NonNullable<HudSnapshot['players'][number]['board']> }) {
  return (
    <div className="overlay">
      <div className="panel pause-panel">
        <p className="eyebrow">{TEXT.pause.eyebrow}</p>
        <h2>{TEXT.pause.heading}</h2>
        <MenuButtons items={items} sel={sel} shown={shown} onHover={onHover} />
        {board && <div className="pause-scoreboard"><Scoreboard board={board} me={0} /></div>}
      </div>
    </div>
  );
}

export function Results({ snapshot, players, record, fresh, items, sel, shown, onHover }: { snapshot: HudSnapshot; players: PlayerSetup[]; record: Codex; fresh: Codex; items: MenuItem[]; sel: number; shown: boolean; onHover: (i: number) => void }) {
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
        <p className="eyebrow">{MODE_INFO[snapshot.mode].name.toUpperCase()} · {snapshot.status === 'won' ? TEXT.results.victory : ACTIVE_ERA.copy.lose}</p>
        <h2>{snapshot.message}</h2>
        <div className="results-scroll">
        <div className="result-grid">
          {snapshot.players.map((p, i) => (
            <div key={i} className="result-card" style={{ ['--player' as string]: p.color }}>
              <span className="player-chip">{TEXT.common.playerChip(i + 1)}</span>
              <b>{creature(players[i]?.creature ?? p.creature).name}</b>
              {creature(players[i]?.creature ?? p.creature).kind && <span className="result-kind">{creature(players[i]?.creature ?? p.creature).kind}</span>}
              <span>{p.tierName}</span>
              <small>{TEXT.results.tally(p.eats, p.kills, p.escapes)}</small>
              {/* Rise keeps a high-water mark per creature; say so when this match moved one. The
                  shell hands us the list, because the stored record already has this match in it. */}
              {fresh.best[players[i]?.creature ?? p.creature] !== undefined && <span className="new-tag best-tag">{TEXT.results.newBest}</span>}
            </div>
          ))}
        </div>
        <Discoveries codex={codex} fresh={fresh} />
        </div>
        <MenuButtons items={items} sel={sel} shown={shown} onHover={onHover} />
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
export function Discoveries({ codex, fresh }: { codex: Codex; fresh: Codex }) {
  const base = appBase();
  const seenBiome = new Set(codex.biomes), newBiome = new Set(fresh.biomes);
  const seenMark = new Set(codex.landmarks), newMark = new Set(fresh.landmarks);
  const newApex = new Set(fresh.apex);
  // The animals a player can take to the top, which is what an apex card records — `PLAYABLE`
  // rather than the whole roster, because a sea also holds animals nobody is offered (`npc`) and
  // an era's entries outlive the game's use of them (`shelved`). A card for one of those would be
  // a square that never fills, and it would be in the denominator of "N of M species" as well.
  const roster = PLAYABLE, d = TEXT.discoveries;
  return (
    <div className="discoveries">
      <div className="discovery-head">
        <p className="eyebrow">{d.eyebrow}</p>
        <span>{d.counts(seenBiome.size, BIOMES.length, seenMark.size, LANDMARK_KINDS.length, codex.apex.length, roster.length)}</span>
      </div>

      <ul className="biome-strip">
        {BIOMES.map((b) => {
          const seen = seenBiome.has(b);
          return (
            <li key={b} className={`biome-card ${seen ? 'found' : 'unfound'} ${newBiome.has(b) ? 'fresh' : ''}`}>
              {seen && <img src={`${base}${biomeArtPath(b)}`} alt="" loading="lazy" />}
              <b>{seen ? ACTIVE_ERA.environment.biomeNames[b] : d.unfoundBiome}</b>
              {newBiome.has(b) && <span className="new-tag">{TEXT.common.newTag}</span>}
            </li>
          );
        })}
      </ul>

      <ul className="landmark-strip">
        {LANDMARK_KINDS.map((k) => {
          const seen = seenMark.has(k);
          return (
            <li key={k} className={`landmark-card ${seen ? 'found' : 'unfound'} ${newMark.has(k) ? 'fresh' : ''}`}>
              <b>{seen ? LANDMARK_NAMES[k] : d.unfoundLandmark}</b>
              <small>{seen ? LANDMARK_BLURBS[k] : d.unfoundLandmarkBlurb}</small>
              {newMark.has(k) && <span className="new-tag">{TEXT.common.newTag}</span>}
            </li>
          );
        })}
      </ul>

      <ul className="apex-strip">
        {roster.map((c) => {
          const seen = codex.apex.includes(c.id);
          return (
            <li key={c.id} className={`apex-card ${seen ? 'found' : 'unfound'} ${newApex.has(c.id) ? 'fresh' : ''}`}
                title={seen ? d.apexReached(c.name) : d.apexNotYet(c.name)}>
              <CreaturePortrait creatureId={c.id} kind="thumb" assetBase={base} alt={c.name} loading="lazy" />
              <span>{c.name}</span>
              {/* Reaching the top here is what admits an animal to the *other* games, so the card
                  that records it says so. The star is the same mark the Visitors button carries on
                  their pick screens, which is where this ends up mattering. Top left, because NEW
                  already owns the other corner and these cards are 54 pixels wide. */}
              {seen && <span className="visitor-tag" aria-hidden="true">★</span>}
              {newApex.has(c.id) && <span className="new-tag">{TEXT.common.newTag}</span>}
            </li>
          );
        })}
      </ul>
      {/* What Apex is *for*, which a player who has just earned one has no reason to know yet.
          Only ever shown to somebody who has one: visitors are a thing you find out you have, not
          a goal the game sets you in advance, and a line promising them to a player with an empty
          strip would give the surprise away for nothing. Same reason the Visitors button is absent
          from the pick grid until there is something behind it.

          The other games are deliberately not named. Which they are, and how many, is a thing that
          changes — the trilogy has already gained one and may gain more, and one of them is not
          released yet — so the line says where rather than which, and stays true through all of it.
          The trilogy's own name is fine; a sibling game's title is what it avoids. A visitor's crew
          card still says "Devonian", which is the *period* the animal is from and is already on
          every creature card as provenance ("Late Devonian · Cleveland Shale"), not a pointer at
          another game. */}
      {codex.apex.length > 0 && (
        <p className="apex-note">
          {d.apexNote.star} <b>{d.apexNote.unlocked}</b> {d.apexNote.body} <b>{d.apexNote.visitorsButton}</b> {d.apexNote.tail}
        </p>
      )}
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
      <button className="tools-close icon-button" aria-label={TEXT.common.close} onClick={onClose}><CloseIcon /></button>
      {kind === 'help' && <HelpPage scheme={scheme} />}
      {kind === 'settings' && <SettingsPage settings={settings} onSettings={onSettings} />}
    </dialog>
  );
}

/**
 * The button names the help prose is written around, in whatever this player is holding. The words
 * themselves are `TEXT.help`, so the page is a layout and the copy is config.
 */
const helpButtons = (scheme: Scheme): HelpButtons => ({
  aim: btn('aim', scheme), heavy: btn('heavy', scheme), guard: btn('guard', scheme),
  dash: btn('dash', scheme), sprint: btn('sprint', scheme), rise: btn('rise', scheme),
  zoom: btn('zoom', scheme), sense: btn('sense', scheme), light: btn('light', scheme),
  teleport: btn('teleport', scheme), view: btn('view', scheme), ability: btn('ability', scheme),
  pad: scheme === 'pad',
});

/**
 * A paragraph of help prose, with `**...**` drawn emphasised. The copy stays one sentence in the
 * text table — which is what a translator needs — while the button names in it still stand out.
 */
function Prose({ text }: { text: string }) {
  return <p>{text.split('**').map((part, i) => (i % 2 ? <b key={i}>{part}</b> : part))}</p>;
}

function HelpPage({ scheme }: { scheme: Scheme }) {
  const t = TEXT.help, b = helpButtons(scheme);
  return (
    <div className="dialog-body">
      <p className="eyebrow">{t.eyebrow}</p>
      <h2>{t.heading}</h2>
      <p>
        {t.bands.lead} <span className="band snack">{t.bands.snack}</span> {t.bands.snackText}{' '}
        <span className="band prey">{t.bands.prey}</span> {t.bands.preyText}{' '}
        <span className="band rival">{t.bands.rival}</span> {t.bands.rivalText}{' '}
        <span className="band threat">{t.bands.threat}</span> {t.bands.threatText}{' '}
        <span className="band giant">{t.bands.giant}</span> {t.bands.giantText} {t.bands.tail}
      </p>
      {scheme === 'pad' ? <XboxDiagram /> : scheme === 'touch' ? <p>{t.touchControls}</p> : <KeyboardDiagram />}
      <div className="help-columns">
        <section>
          <h3>{t.huntingHeading}</h3>
          <Prose text={(scheme === 'touch' ? t.touchHunting : t.hunting(b)) + (t.huntingEraNote ? ` ${t.huntingEraNote}` : '')} />
          <h3>{t.seaHeading}</h3>
          <Prose text={(scheme === 'touch' ? t.touchSea : t.sea(b)) + (t.seaEraNote ? ` ${t.seaEraNote}` : '')} />
          <h3>{t.fightingHeading}</h3>
          <Prose text={t.fighting(b) + (t.fightingEraNote ? ` ${t.fightingEraNote}` : '')} />
        </section>
        <section>
          <h3>{t.giantsHeading}</h3>
          <Prose text={t.giants(b)} />
          {scheme === 'pad' && <>
            <h3>{t.padMenusHeading}</h3>
            <Prose text={t.padMenus} />
          </>}
          <h3>{t.growingHeading}</h3>
          <Prose text={t.growing(b) + (t.growingEraNote ? ` ${t.growingEraNote}` : '')} />
          {scheme === 'touch' ? null : scheme === 'pad'
            ? <>
                <h3>{t.keyboardHeading}</h3>
                <p><b>1:</b> {t.keyboardPlayerOne}<br /><b>2:</b> {t.keyboardPlayerTwo}</p>
              </>
            : <>
                <h3>{t.controllerHeading}</h3>
                <Prose text={t.controller} />
                <p>{t.sharedKeyboard} {t.keyboardPlayerTwo}</p>
              </>}
        </section>
      </div>
    </div>
  );
}

function SettingsPage({ settings, onSettings }: { settings: Settings; onSettings: (s: Settings) => void }) {
  const t = TEXT.settings;
  return (
    <div className="dialog-body settings">
      <p className="eyebrow">{t.eyebrow}</p>
      <h2>{t.heading}</h2>
      <label className="setting-row">
        <span>{t.detail} <small>{t.detailNote}</small></span>
        <div className="seg">
          {(['high', 'low'] as const).map((q) => <button key={q} aria-pressed={settings.quality === q} onClick={() => onSettings({ ...settings, quality: q, qualityExplicit: true })}>{q === 'high' ? t.qualityHigh : t.qualityLow}</button>)}
        </div>
      </label>
      <label className="setting-row" htmlFor="look-speed">
        <span>{t.cameraSpeed} <small>{t.cameraSpeedNote(settings.lookSpeed.toFixed(1))}</small></span>
        <input id="look-speed" type="range" min={0.4} max={2} step={0.1} value={settings.lookSpeed} onChange={(e) => onSettings({ ...settings, lookSpeed: Number(e.target.value) })} />
      </label>
      <label className="setting-row">
        <span>{t.invertY}</span>
        <input type="checkbox" checked={settings.invertY} onChange={(e) => onSettings({ ...settings, invertY: e.target.checked })} />
      </label>
      <label className="setting-row" htmlFor="volume">
        <span>{t.volume} <small>{t.volumeNote(Math.round(settings.volume * 100))}</small></span>
        <input id="volume" type="range" min={0} max={1} step={0.05} value={settings.volume} onChange={(e) => onSettings({ ...settings, volume: Number(e.target.value) })} />
      </label>
      <label className="setting-row">
        {/* The name under the switch is this era's own opening track, read off its soundtrack
            rather than written out: it used to say "Tide of First Bones" in all three games. */}
        <span>{t.music} <small>{OPENING_TRACK}</small></span>
        <input type="checkbox" checked={settings.music} onChange={(e) => onSettings({ ...settings, music: e.target.checked })} />
      </label>
      <label className="setting-row">
        <span>{t.mute}</span>
        <input type="checkbox" checked={settings.muted} onChange={(e) => onSettings({ ...settings, muted: e.target.checked })} />
      </label>
      {hasEquivalentSizing() && (
        <label className="setting-row">
          <span>{t.equivalentSizing} <small>{t.equivalentSizingNote}</small></span>
          <input type="checkbox" checked={settings.equivalentSizing} onChange={(e) => onSettings({ ...settings, equivalentSizing: e.target.checked })} />
        </label>
      )}
      {RULES?.settings?.shoreAnimals && (
        <label className="setting-row">
          <span>{t.shoreAnimals} <small>{t.shoreAnimalsNote}</small></span>
          <input type="checkbox" checked={settings.shoreAnimals} onChange={(e) => onSettings({ ...settings, shoreAnimals: e.target.checked })} />
        </label>
      )}
      <p className="dim">{t.footnote}</p>
    </div>
  );
}

/** The era's opening track, which is what the Music switch is named after. */
const OPENING_TRACK = (ACTIVE_ERA.audio.music.find((m) => m.opening) ?? ACTIVE_ERA.audio.music[0])?.name ?? '';
