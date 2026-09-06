import { PLAYER_COLORS } from '../render/engine';
import { CREATURES, creature, type CreatureId } from '../sim/creatures';
import type { Mode, PlayerSetup } from '../sim/types';
import { CheckIcon, Emblem, KeyboardIcon, PadIcon } from './icons';

interface Props {
  players: PlayerSetup[]; mode: Mode; modes: Mode[]; modeInfo: Record<Mode, { name: string; blurb: string; players: string }>;
  allReady: boolean; padCount: number;
  onPick: (i: number, c: CreatureId) => void; onReady: (i: number) => void; onRemove: (i: number) => void;
  onAddKeyboard: () => void; onMode: (m: Mode) => void; onStart: () => void; onBack: () => void;
}

const stat = (v: number, max: number) => Math.round((v / max) * 5);
const ASSETS = import.meta.env.BASE_URL;

/** Grid columns: three rows at most, so 21 creatures sit in 7 x 3 and 8 sit in 4 x 2. */
export const gridColumns = (n: number) => Math.max(4, Math.ceil(n / 3));

export function SelectScreen(p: Props) {
  const cols = gridColumns(CREATURES.length);
  const compact = p.players.length >= 3;
  return (
    <section className="select" aria-label="Choose your creature">
      <header className="select-header">
        <div className="brand"><Emblem size={34} /><img className="header-logo" src={`${ASSETS}assets/brand/logo.svg`} alt="Cambrian Explosion" /></div>
        <div className="mode-picker" role="tablist" aria-label="Game mode">
          {p.modes.map((m) => (
            <button key={m} role="tab" aria-selected={p.mode === m} className={`mode-chip ${p.mode === m ? 'active' : ''}`} onClick={() => p.onMode(m)}>
              <img className="mode-art" src={`${ASSETS}assets/ui/mode-${m}.webp`} alt="" />
              <span>{p.modeInfo[m].name}</span><small>{p.modeInfo[m].players}</small>
            </button>
          ))}
        </div>
        <p className="mode-blurb">{p.modeInfo[p.mode].blurb} <span className="dim">LT / RT switch modes.</span></p>
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
                title={`${c.name} · ${c.role}`}>
                <img src={`${ASSETS}assets/creatures/${c.id}.select.png`} alt="" draggable={false} loading="eager" />
                <span className="cell-name">{c.name}</span>
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
                  <span className="device">{pl.device === 'keyboard' ? <><KeyboardIcon width={16} height={16} /> Keyboard 1</> : pl.device === 'keyboard2' ? <><KeyboardIcon width={16} height={16} /> Keyboard 2</> : <><PadIcon width={16} height={16} /> Controller {(pl.device as number) + 1}</>}</span>
                  <button className="remove" aria-label={`Remove player ${i + 1}`} onClick={() => p.onRemove(i)}>×</button>
                </div>
                <div className="hero">
                  <img key={def.id} src={`${ASSETS}assets/creatures/${def.id}.select.png`} alt={`${def.name} reconstruction`} draggable={false} />
                </div>
                <div className="creature-copy">
                  <span className="role">{def.ground ? 'SEAFLOOR' : 'SWIMMER'} · {def.role}</span>
                  <h2>{def.name}</h2>
                  <p className="tagline">{def.tagline}</p>
                  {!compact && (
                    <>
                      <div className="stats">
                        <Stat label="Speed" v={stat(def.speed * def.burst, 14.6)} />
                        <Stat label="Power" v={stat(def.heavy.damage, 26)} />
                        <Stat label="Armor" v={stat(def.hp * (1 + def.defense), 233)} />
                        <Stat label="Agility" v={stat(def.agility + def.turnRate, 8.6)} />
                      </div>
                      <dl className="kit">
                        <div><dt>Y</dt><dd><b>{def.abilityName}.</b> {def.abilityDesc}</dd></div>
                        <div><dt>+</dt><dd>{def.passive}</dd></div>
                        <div><dt>−</dt><dd>{def.weakness}</dd></div>
                      </dl>
                    </>
                  )}
                </div>
                <button className="ready-button" aria-pressed={pl.ready} onClick={() => p.onReady(i)}>
                  {pl.ready ? <><CheckIcon width={18} height={18} /> LOCKED IN · A DIVES</> : 'LOCK IN  ·  A'}
                </button>
              </article>
            );
          })}
          {p.players.length < 4 && (
            <div className="join-card">
              <PadIcon width={32} height={32} />
              <p><b>Press A</b> on another controller to join.</p>
              <button className="ghost" onClick={p.onAddKeyboard}>Add a keyboard player</button>
              <small>{p.padCount} controller{p.padCount === 1 ? '' : 's'} connected</small>
            </div>
          )}
        </div>
      </div>

      <footer className="select-footer">
        <button className="ghost" onClick={p.onBack}>← Title</button>
        <div className="start-wrap">
          {!p.allReady && <span className="dim">Move on the grid, <b>A</b> locks in, <b>A</b> again dives.</span>}
          <button className={`start-button ${p.allReady ? 'focused' : ''}`} disabled={!p.allReady} onClick={p.onStart}>DIVE IN  ·  A</button>
        </div>
      </footer>
    </section>
  );
}

function Stat({ label, v }: { label: string; v: number }) {
  return (
    <span className="stat"><small>{label}</small><i>{Array.from({ length: 5 }, (_, k) => <b key={k} className={k < v ? 'on' : ''} />)}</i></span>
  );
}
