import { PLAYER_COLORS } from '../render/engine';
import { CREATURES, creature, type CreatureId } from '../sim/creatures';
import type { Mode, PlayerSetup } from '../sim/types';
import { CheckIcon, ChevronLeft, ChevronRight, Emblem, KeyboardIcon, PadIcon } from './icons';

interface Props {
  players: PlayerSetup[]; mode: Mode; modes: Mode[]; modeInfo: Record<Mode, { name: string; blurb: string; players: string }>;
  loaded: boolean; allReady: boolean; padCount: number;
  onCycle: (i: number, d: number) => void; onPick: (i: number, c: CreatureId) => void; onReady: (i: number) => void; onRemove: (i: number) => void;
  onAddKeyboard: () => void; onMode: (m: Mode) => void; onStart: () => void; onBack: () => void;
}

const stat = (v: number, max: number) => Math.round((v / max) * 5);

export function SelectScreen(p: Props) {
  const assetBase = import.meta.env.BASE_URL;
  return (
    <section className="select" aria-label="Choose your creature">
      <header className="select-header">
        <div className="brand"><Emblem size={34} /><span className="brand-name">CAMBRIAN <b>EXPLOSION</b></span></div>
        <div className="mode-picker" role="tablist" aria-label="Game mode">
          {p.modes.map((m) => (
            <button key={m} role="tab" aria-selected={p.mode === m} className={`mode-chip ${p.mode === m ? 'active' : ''}`} onClick={() => p.onMode(m)}>
              <span>{p.modeInfo[m].name}</span><small>{p.modeInfo[m].players}</small>
            </button>
          ))}
        </div>
        <p className="mode-blurb">{p.modeInfo[p.mode].blurb} <span className="dim">LT / RT switch modes.</span></p>
      </header>

      <div className={`crew crew-${p.players.length}`}>
        {p.players.map((pl, i) => {
          const def = creature(pl.creature);
          return (
            <article key={i} className={`crew-card ${pl.ready ? 'ready' : ''}`} style={{ ['--player' as string]: PLAYER_COLORS[i] }}>
              <div className="crew-top">
                <span className="player-chip">P{i + 1}</span>
                <span className="device">{pl.device === 'keyboard' ? <><KeyboardIcon width={16} height={16} /> Keyboard 1</> : pl.device === 'keyboard2' ? <><KeyboardIcon width={16} height={16} /> Keyboard 2</> : <><PadIcon width={16} height={16} /> Controller {(pl.device as number) + 1}</>}</span>
                <button className="remove" aria-label={`Remove player ${i + 1}`} onClick={() => p.onRemove(i)}>×</button>
              </div>
              <div className="creature-stage">
                <button className="arrow" aria-label="Previous creature" onClick={() => p.onCycle(i, -1)}><ChevronLeft width={28} height={28} /></button>
                <img src={`${assetBase}assets/creatures/${def.id}.card.png`} alt={`${def.name} reconstruction`} draggable={false} />
                <button className="arrow" aria-label="Next creature" onClick={() => p.onCycle(i, 1)}><ChevronRight width={28} height={28} /></button>
              </div>
              <div className="creature-copy">
                <span className="role">{def.ground ? 'SEAFLOOR' : 'SWIMMER'} · {def.role}</span>
                <h2>{def.name}</h2>
                <p className="tagline">{def.tagline}</p>
                <div className="stats">
                  <Stat label="Speed" v={stat(def.speed * def.burst, 14.6)} />
                  <Stat label="Power" v={stat(def.heavy.damage, 26)} />
                  <Stat label="Armor" v={stat(def.hp * (1 + def.defense), 233)} />
                  <Stat label="Agility" v={stat(def.agility + def.turnRate, 8.6)} />
                </div>
                <dl className="kit">
                  <div><dt>Y</dt><dd><b>{def.abilityName}.</b> {def.abilityDesc}</dd></div>
                  <div><dt>X</dt><dd><b>{def.heavy.name}.</b> Heavy.</dd></div>
                  <div><dt>+</dt><dd>{def.passive}</dd></div>
                  <div><dt>−</dt><dd>{def.weakness}</dd></div>
                </dl>
              </div>
              <div className="roster" role="listbox" aria-label={`Creature roster for player ${i + 1}`}>
                {CREATURES.map((c) => (
                  <button key={c.id} role="option" aria-selected={c.id === def.id} className={`roster-dot ${c.id === def.id ? 'active' : ''}`} style={{ ['--c' as string]: c.color }} title={c.name} onClick={() => p.onPick(i, c.id)} />
                ))}
              </div>
              <button className="ready-button" aria-pressed={pl.ready} onClick={() => p.onReady(i)}>
                {pl.ready ? <><CheckIcon width={18} height={18} /> LOCKED IN</> : 'LOCK IN  ·  A'}
              </button>
            </article>
          );
        })}
        {p.players.length < 4 && (
          <div className="join-card">
            <PadIcon width={40} height={40} />
            <p><b>Press A</b> on another controller to join.</p>
            <button className="ghost" onClick={p.onAddKeyboard}>Add a keyboard player</button>
            <small>{p.padCount} controller{p.padCount === 1 ? '' : 's'} connected</small>
          </div>
        )}
      </div>

      <footer className="select-footer">
        <button className="ghost" onClick={p.onBack}>← Title</button>
        <div className="start-wrap">
          {!p.allReady && <span className="dim">Everyone locks in, then <b>Menu</b> starts.</span>}
          <button className="start-button" disabled={!p.allReady || !p.loaded} onClick={p.onStart}>{p.loaded ? 'DIVE IN' : 'LOADING…'}</button>
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
