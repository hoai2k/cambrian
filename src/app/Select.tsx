import { ModelStatusBadge } from '../shared/ModelStatusBadge';
import { ACTIVE_ERA } from '../content';
import { assetPaths } from '../content/asset-paths';
import { hideLabel, hideDescription, HEAVY_SPECIALS, DEFENSIVE_SPECIALS } from '../sim/concealment';
import { RULES } from '../sim/era-rules';
import { CreaturePortrait } from './CreaturePortrait';
import { PLAYER_COLORS } from '../render/engine';
import { PLAYABLE as CREATURES, creature, type CreatureId } from '../sim/creatures';
import type { Mode, PlayerSetup } from '../sim/types';
import { CheckIcon, Emblem, KeyboardIcon, PadIcon } from './icons';
import { appBase } from '../shared/base';
import { btn, fillControls, key, type Scheme } from '../shared/controls';
import { fillOf, ladderName, rungOf } from '../sim/ladder';

interface Props {
  players: PlayerSetup[]; mode: Mode; modes: Mode[]; modeInfo: Record<Mode, { name: string; blurb: string; players: string }>;
  allReady: boolean; padIndices: number[];
  /** Whatever everyone at this screen is holding: pad if any is connected, mouse and keyboard if not. */
  scheme: Scheme;
  /** Furthest mark on the growth ladder each creature has reached in Rise on this device. */
  best: Partial<Record<CreatureId, number>>;
  /** Per seat: whether that player has asked to carry on from their record rather than hatch. */
  carry: boolean[];
  onPick: (i: number, c: CreatureId) => void; onReady: (i: number) => void; onRemove: (i: number) => void;
  onAddKeyboard: () => void; onMode: (m: Mode) => void; onStart: () => void; onBack: () => void;
  onCarry: (i: number) => void;
}

const stat = (v: number, max: number) => Math.round((v / max) * 5);
const ASSETS = appBase();

/** Grid columns: three rows at most, so 21 creatures sit in 7 x 3 and 8 sit in 4 x 2. */
export const gridColumns = (n: number) => Math.max(4, Math.ceil(n / 3));

export function SelectScreen(p: Props) {
  const s = p.scheme;
  const cols = gridColumns(CREATURES.length);
  const compact = p.players.length >= 3;
  // Controllers the game can see that have not joined yet, and joined players whose controller
  // has since gone away (an Xbox pad that went to sleep looks exactly like an unplugged one).
  const joined = new Set(p.players.map((pl) => pl.device));
  const waiting = p.padIndices.filter((i) => !joined.has(i));
  return (
    <section className="select" aria-label="Choose your creature">
      <header className="select-header">
        <div className="brand"><Emblem size={34} /><img className="header-logo" src={`${ASSETS}${ACTIVE_ERA.assets.logo}`} alt={ACTIVE_ERA.title} /></div>
        <div className="mode-picker" role="tablist" aria-label="Game mode">
          {p.modes.map((m) => (
            <button key={m} role="tab" aria-selected={p.mode === m} className={`mode-chip ${p.mode === m ? 'active' : ''}`} onClick={() => p.onMode(m)}>
              <img className="mode-art" src={`${ASSETS}${assetPaths.ui(`mode-${m}.webp`)}`} alt="" />
              <span>{p.modeInfo[m].name}</span><small>{p.modeInfo[m].players}</small>
            </button>
          ))}
        </div>
        <p className="mode-blurb">{p.modeInfo[p.mode].blurb} <span className="dim">{btn('modePrev', s)} / {btn('modeNext', s)} switch modes.</span></p>
      </header>

      <div className="pick-layout">
        {/* ---- roster grid ---- */}
        <div className={`roster-grid ${cols >= 6 ? 'dense' : ''}`} role="listbox" aria-label="Creatures" style={{ ['--cols' as string]: cols }}>
          {CREATURES.map((c) => {
            const hovering = p.players.map((pl, i) => ({ pl, i })).filter(({ pl }) => pl.creature === c.id);
            const lockedBy = hovering.filter(({ pl }) => pl.ready);
            const cls = ['cell', hovering.length ? 'hover' : '', lockedBy.length ? 'locked' : ''].join(' ');
            return (
              <button key={c.id} role="option" aria-selected={hovering.length > 0} className={cls}
                style={{ ['--c' as string]: hovering.length ? PLAYER_COLORS[hovering[0].i] : c.color }}
                onClick={() => { const i = p.players.findIndex((pl) => !pl.ready && typeof pl.device === 'string'); p.onPick(i >= 0 ? i : 0, c.id); }}
                title={`${c.name}${c.kind ? ` · ${c.kind}` : ''} · ${c.role}`} aria-label={c.kind ? `${c.name}, ${c.kind}` : c.name}>
                <CreaturePortrait creatureId={c.id} kind="thumb" assetBase={ASSETS} alt="" draggable={false} loading="eager" />
                <span className="cell-name">{c.name}</span>
                {c.kind && <span className="cell-kind">{c.kind}</span>}
                <ModelStatusBadge status={ACTIVE_ERA.assets.modelStatus?.[c.id]} compact />
                <span className="cell-rings">
                  {hovering.map(({ i, pl }) => <i key={i} style={{ ['--c' as string]: PLAYER_COLORS[i], ['--k' as string]: i }} className={pl.ready ? 'ring locked' : 'ring'} />)}
                </span>
                {lockedBy.map(({ i }) => <span key={'b' + i} className="lock-badge" style={{ background: PLAYER_COLORS[i] }}>P{i + 1}</span>)}
              </button>
            );
          })}
        </div>

        {/* ---- player cards ---- */}
        <div className={`crew crew-${p.players.length} ${compact ? 'compact' : ''}`}>
          {p.players.map((pl, i) => {
            const def = creature(pl.creature);
            return (
              <article key={i} className={`crew-card ${pl.ready ? 'ready' : ''}`} style={{ ['--player' as string]: PLAYER_COLORS[i] }}>
                {pl.ready && <span key={'fx' + pl.creature} className="lock-fx" aria-hidden="true" />}
                <div className="crew-top">
                  <span className="player-chip">P{i + 1}</span>
                  <span className="device">{pl.device === 'keyboard' ? <><KeyboardIcon width={16} height={16} /> Keyboard 1</> : pl.device === 'keyboard2' ? <><KeyboardIcon width={16} height={16} /> Keyboard 2</> : <><PadIcon width={16} height={16} /> Controller {(pl.device as number) + 1}{!p.padIndices.includes(pl.device as number) && <em className="gone"> · disconnected</em>}</>}</span>
                  <button className="remove" aria-label={`Remove player ${i + 1}`} onClick={() => p.onRemove(i)}>×</button>
                </div>
                <div className="hero">
                  <ModelStatusBadge status={ACTIVE_ERA.assets.modelStatus?.[def.id]} />
                  <CreaturePortrait key={def.id} creatureId={def.id} kind="select" assetBase={ASSETS} alt={`${def.name} reconstruction`} draggable={false} />
                </div>
                <div className="creature-copy">
                  <span className="role">{def.ground ? 'SEAFLOOR' : 'SWIMMER'} · {def.role}</span>
                  <h2>{def.name}</h2>
                  <small className="provenance">{def.kind && <b className="kind">{def.kind}</b>}{def.species} · {def.provenance ?? def.locality ?? 'Burgess Shale'}</small>
                  <p className="tagline">{def.tagline}</p>
                  <BestRun mark={p.best[def.id]} carrying={!!p.carry[i]} rise={p.mode === 'rise'} scheme={s} onToggle={() => p.onCarry(i)} />
                  {!compact && (
                    <>
                      <div className="stats">
                        <Stat label="Speed" v={stat(def.speed * def.burst, 14.6)} />
                        <Stat label="Power" v={stat(def.heavy.damage, 26)} />
                        <Stat label="Armor" v={stat(def.hp * (1 + def.defense), 233)} />
                        <Stat label="Agility" v={stat(def.agility + def.turnRate, 8.6)} />
                      </div>
                      {def.kindNote && <p className="kind-note">{def.kindNote}</p>}
                      <dl className="kit">
                        <div><dt>{key('heavy', s)}</dt><dd>{HEAVY_SPECIALS.has(def.ability) ? def.abilityName : def.heavy.name}</dd></div>
                        <div><dt>{key('guard', s)}</dt><dd>{DEFENSIVE_SPECIALS.has(def.ability) ? def.abilityName : def.canGuard ? 'Block / parry' : 'Evade'}</dd></div>
                        <div><dt>{key('ability', s)}</dt><dd><b>{RULES?.ySpecial(def.id)?.name ?? hideLabel(def.id)}.</b> {fillControls(RULES?.ySpecial(def.id)?.desc ?? hideDescription(def.id), s)}</dd></div>
                        <div><dt>+</dt><dd>{def.passive}</dd></div>
                        <div><dt>−</dt><dd>{def.weakness}</dd></div>
                      </dl>
                    </>
                  )}
                </div>
                <button className="ready-button" aria-pressed={pl.ready} onClick={() => p.onReady(i)}>
                  {pl.ready ? <><CheckIcon width={18} height={18} /> LOCKED IN · {key('confirm', s).toUpperCase()} DIVES</> : `LOCK IN  ·  ${key('confirm', s).toUpperCase()}`}
                </button>
              </article>
            );
          })}
          {p.players.length < 4 && (
            <div className={`join-card ${waiting.length ? 'waiting' : ''}`}>
              {/* With no pad in the room the card leads with the thing that actually works here —
                  a second player on the same keyboard — and mentions controllers second. */}
              {p.padIndices.length > 0 ? <PadIcon width={32} height={32} /> : <KeyboardIcon width={32} height={32} />}
              {p.padIndices.length > 0
                ? <p><b>Press any button</b> on another controller to join.</p>
                : <p><b>Plug in a controller</b> and press any button to join — or share this keyboard.</p>}
              <button className="ghost" onClick={p.onAddKeyboard}>Add a keyboard player</button>
              <small>
                {p.padIndices.length} controller{p.padIndices.length === 1 ? '' : 's'} connected
                {waiting.length > 0 && <> · <b>{waiting.map((i) => `Controller ${i + 1}`).join(', ')}</b> {waiting.length === 1 ? 'has' : 'have'} not joined</>}
              </small>
              {p.padIndices.length <= p.players.length && (
                <small className="dim">A controller only shows up here once you press a button on it.</small>
              )}
            </div>
          )}
        </div>
      </div>

      <footer className="select-footer">
        <button className="ghost" onClick={p.onBack}>← Title</button>
        <div className="start-wrap">
          {!p.allReady && <span className="dim">Move on the grid with {btn('pick', s)}, <b>{key('confirm', s)}</b> locks in, <b>{key('confirm', s)}</b> again dives.</span>}
          <button className={`start-button ${p.allReady ? 'focused' : ''}`} disabled={!p.allReady} onClick={p.onStart}>DIVE IN  ·  {key('confirm', s).toUpperCase()}</button>
        </div>
      </footer>
    </section>
  );
}

/**
 * What this creature has grown into before, and the offer to pick up there.
 *
 * The record is kept for Rise alone, because Rise is the mode that grows you: the others hand out
 * a body at a fixed size, so how far you got in one says nothing. The badge shows in every mode —
 * it is a fact about the creature and worth seeing while you choose — but the offer only appears
 * where it can be taken, and only once there is something to carry on from.
 */
function BestRun({ mark, carrying, rise, scheme, onToggle }: { mark: number | undefined; carrying: boolean; rise: boolean; scheme: Scheme; onToggle: () => void }) {
  if (!mark) return null;
  const part = fillOf(mark), name = ladderName(mark);
  const next = ladderName(rungOf(mark) + 1);
  // A part-grown mark is worth saying out loud: it is the difference between starting over and
  // starting a short swim from where you stopped.
  const badge = part > 0 ? `${name.toUpperCase()} · PART GROWN` : name.toUpperCase();
  const title = part > 0
    ? `Furthest grown in ${MODE_NAME}: reached ${next}, but did not hold it. You start as a ${name} already ${Math.round(part * 100)}% of the way back.`
    : `Furthest grown in ${MODE_NAME}: ${name}.`;
  return (
    <div className={`best-run ${carrying ? 'carrying' : ''}`}>
      <span className="best-badge" title={title}><b>BEST</b> {badge}</span>
      {rise && (
        <button className="carry-toggle" aria-pressed={carrying} onClick={onToggle} title={title}>
          {carrying ? `Continuing as ${name}${part > 0 ? ', part grown' : ''}` : `Starting as ${ladderName(0)}`}
          <kbd>{scheme === 'pad' ? key('light', scheme) : 'C'}</kbd>
        </button>
      )}
    </div>
  );
}
/** The mode the record belongs to, in the era's own words. */
const MODE_NAME = ACTIVE_ERA.modes.find((m) => m.id === 'rise')?.name ?? 'Rise';

function Stat({ label, v }: { label: string; v: number }) {
  return (
    <span className="stat"><small>{label}</small><i>{Array.from({ length: 5 }, (_, k) => <b key={k} className={k < v ? 'on' : ''} />)}</i></span>
  );
}
