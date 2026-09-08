import { useCallback, useMemo, useState } from 'react';
import { ACTIVE_ERA } from '../content';
import { PLAYABLE as CREATURES } from '../sim/creatures';
import { fillOf, LADDER_TOP, ladderNames, rungOf } from '../sim/ladder';
import { BIOMES } from '../sim/world';
import { LANDMARK_BLURBS, LANDMARK_NAMES } from './codex';
import './debug-local.css';

/**
 * The local state editor: `?debug=local` on either era's page.
 *
 * Everything the game keeps on this device, in controls that match how it is actually stored — a
 * set of ids is a row of checkboxes, a bounded number is a slider, a number that stands for an
 * option is a dropdown that spells out what each number means. The point is to be able to put the
 * save into any state a bug needs without hand-editing JSON in devtools, so every field also has
 * its raw value on show and every record has a raw JSON escape hatch for anything not modelled
 * here.
 *
 * It is deliberately unadvertised: nothing links to it and it renders only for that parameter.
 * It is also deliberately dumb — it reads and writes localStorage directly rather than going
 * through `loadCodex`, because a debug tool that silently sanitises what you type cannot show you
 * the broken value you are trying to reproduce. The game's own loaders do the sanitising, which is
 * where that belongs.
 */

// ---- what is stored, and how each field should be edited ----

type Field =
  | { kind: 'toggle'; key: string; label: string; note?: string }
  | { kind: 'choice'; key: string; label: string; options: { value: unknown; label: string }[]; note?: string }
  | { kind: 'range'; key: string; label: string; min: number; max: number; step: number; note?: string }
  | { kind: 'set'; key: string; label: string; options: { value: string; label: string; note?: string }[]; note?: string }
  | { kind: 'marks'; key: string; label: string; note?: string };

/**
 * Every value a growth record can hold, spelled out.
 *
 * A mark is a number whose whole part is the rung and whose fraction is how far through it — the
 * one place in the save where a number stands for something a reader cannot guess — so each option
 * carries the number and what it means. The top rung is offered but flagged: the game only ever
 * writes it by finishing a run, and carrying it back in turns the goal off for that player.
 */
const markOptions = () => {
  const names = ladderNames();
  const out: { value: unknown; label: string }[] = [{ value: '', label: '— not recorded' }];
  for (let r = 1; r <= LADDER_TOP; r++) {
    out.push({ value: r, label: `${r} · ${names[r]}` });
    if (r < LADDER_TOP) out.push({ value: r + 0.5, label: `${r + 0.5} · ${names[r]}, part grown (meter half full)` });
  }
  const top = out[out.length - 1];
  top.label += ' — only written by finishing a run; starting here turns the goal off';
  return out;
};

const SETTINGS_FIELDS: Field[] = [
  { kind: 'choice', key: 'quality', label: 'Quality', options: [{ value: 'high', label: 'high' }, { value: 'low', label: 'low' }] },
  { kind: 'range', key: 'lookSpeed', label: 'Look speed', min: 0.2, max: 3, step: 0.1 },
  { kind: 'toggle', key: 'invertY', label: 'Invert Y' },
  { kind: 'range', key: 'volume', label: 'Volume', min: 0, max: 1, step: 0.05 },
  { kind: 'toggle', key: 'muted', label: 'Muted' },
  { kind: 'toggle', key: 'music', label: 'Music' },
];

const codexFields = (): Field[] => [
  {
    kind: 'set', key: 'biomes', label: 'Biomes found',
    note: 'Stored as a list of biome ids. Anything ticked here shows on the results page instead of a silhouette.',
    options: BIOMES.map((b) => ({ value: b, label: `${ACTIVE_ERA.environment.biomeNames[b]}`, note: b })),
  },
  {
    kind: 'set', key: 'landmarks', label: 'Landmarks found',
    note: 'Stored as a list of landmark kinds.',
    options: (['arch', 'stack', 'bones'] as const).map((k) => ({ value: k, label: LANDMARK_NAMES[k], note: LANDMARK_BLURBS[k] })),
  },
  {
    kind: 'set', key: 'apex', label: `Taken to ${ladderNames()[LADDER_TOP]}`,
    note: `Stored as a list of creature ids. Credited for reaching the top rung at all, which is a lower bar than the growth record below — that one needs the run finished.`,
    options: CREATURES.map((c) => ({ value: c.id, label: c.name, note: c.id })),
  },
  {
    kind: 'marks', key: 'best', label: 'Furthest grown, per creature',
    note: 'Stored as creature id → mark. The whole part is the rung, the fraction is how far through it, so 3.5 is one rung below the top with its growth meter half full.',
  },
];

// ---- storage ----

const settingsKey = () => ACTIVE_ERA.copy.settingsKey;
const codexKey = () => `${ACTIVE_ERA.copy.settingsKey}-codex`;
type Bag = Record<string, unknown>;

const read = (key: string): Bag => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return {};
    const v: unknown = JSON.parse(raw);
    return v && typeof v === 'object' && !Array.isArray(v) ? (v as Bag) : {};
  } catch { return {}; }
};

export function DebugLocal() {
  const [settings, setSettings] = useState<Bag>(() => read(settingsKey()));
  const [codex, setCodex] = useState<Bag>(() => read(codexKey()));
  const [saved, setSaved] = useState('');
  const fields = useMemo(codexFields, []);

  const commit = useCallback((key: string, value: Bag) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      setSaved(`Saved ${key} at ${new Date().toLocaleTimeString()}`);
    } catch (e) { setSaved(`Could not save ${key}: ${String(e)}`); }
  }, []);

  // Every edit writes straight through. A debug tool with an unsaved-changes state is a debug tool
  // that lies to you the moment you forget to press the button.
  const editSettings = (patch: Bag) => { const next = { ...settings, ...patch }; setSettings(next); commit(settingsKey(), next); };
  const editCodex = (patch: Bag) => { const next = { ...codex, ...patch }; setCodex(next); commit(codexKey(), next); };

  const clear = (key: string, set: (b: Bag) => void) => {
    if (!confirm(`Delete ${key} from this browser? This cannot be undone.`)) return;
    try { localStorage.removeItem(key); } catch { /* ignore */ }
    set({}); setSaved(`Cleared ${key}`);
  };

  const back = () => { location.href = location.pathname; };

  return (
    <main className="debug-local">
      <header>
        <div>
          <p className="eyebrow">DEBUG · LOCAL STATE</p>
          <h1>{ACTIVE_ERA.title}</h1>
          <p className="sub">
            Everything this device remembers about this era. Edits save immediately. The other era
            keeps its own copy under its own keys and is not touched from here.
          </p>
        </div>
        <button className="back" onClick={back}>Back to the game →</button>
      </header>

      {saved && <p className="saved" role="status">{saved}</p>}

      <Record
        title="Progress and discoveries" storageKey={codexKey()} bag={codex} fields={fields}
        onEdit={editCodex} onReplace={(b) => { setCodex(b); commit(codexKey(), b); }} onClear={() => clear(codexKey(), setCodex)}
      />
      <Record
        title="Settings" storageKey={settingsKey()} bag={settings} fields={SETTINGS_FIELDS}
        onEdit={editSettings} onReplace={(b) => { setSettings(b); commit(settingsKey(), b); }} onClear={() => clear(settingsKey(), setSettings)}
      />
    </main>
  );
}

function Record({ title, storageKey, bag, fields, onEdit, onReplace, onClear }: {
  title: string; storageKey: string; bag: Bag; fields: Field[];
  onEdit: (patch: Bag) => void; onReplace: (bag: Bag) => void; onClear: () => void;
}) {
  const known = new Set(fields.map((f) => f.key));
  const extra = Object.keys(bag).filter((k) => !known.has(k));
  return (
    <section className="record">
      <div className="record-head">
        <h2>{title}</h2>
        <code>{storageKey}</code>
        <button className="danger" onClick={onClear}>Delete key</button>
      </div>
      {fields.map((f) => <FieldRow key={f.key} field={f} bag={bag} onEdit={onEdit} />)}
      {extra.length > 0 && (
        <p className="note warn">
          Not modelled by a control here, so edit it in the raw JSON below: <b>{extra.join(', ')}</b>
        </p>
      )}
      <RawJson storageKey={storageKey} bag={bag} onReplace={onReplace} />
    </section>
  );
}

function FieldRow({ field, bag, onEdit }: { field: Field; bag: Bag; onEdit: (patch: Bag) => void }) {
  const v = bag[field.key];
  return (
    <div className="field">
      <div className="field-head">
        <label>{field.label}</label>
        <code className="raw">{JSON.stringify(v ?? null)}</code>
      </div>
      {field.note && <p className="note">{field.note}</p>}
      {field.kind === 'toggle' && (
        <label className="check"><input type="checkbox" checked={v === true} onChange={(e) => onEdit({ [field.key]: e.target.checked })} /> {v === true ? 'on' : 'off'}</label>
      )}
      {field.kind === 'choice' && (
        <select value={String(v ?? '')} onChange={(e) => onEdit({ [field.key]: e.target.value })}>
          {field.options.map((o) => <option key={String(o.value)} value={String(o.value)}>{o.label}</option>)}
        </select>
      )}
      {field.kind === 'range' && (
        <div className="row">
          <input type="range" min={field.min} max={field.max} step={field.step}
            value={typeof v === 'number' ? v : field.min}
            onChange={(e) => onEdit({ [field.key]: Number(e.target.value) })} />
          <input type="number" min={field.min} max={field.max} step={field.step}
            value={typeof v === 'number' ? v : field.min}
            onChange={(e) => onEdit({ [field.key]: Number(e.target.value) })} />
        </div>
      )}
      {field.kind === 'set' && <SetField field={field} value={Array.isArray(v) ? (v as string[]) : []} onEdit={onEdit} />}
      {field.kind === 'marks' && <MarksField fieldKey={field.key} value={v && typeof v === 'object' ? (v as Record<string, unknown>) : {}} onEdit={onEdit} />}
    </div>
  );
}

function SetField({ field, value, onEdit }: { field: Field & { kind: 'set' }; value: string[]; onEdit: (patch: Bag) => void }) {
  const has = new Set(value);
  const set = (next: string[]) => onEdit({ [field.key]: next });
  return (
    <>
      <div className="bulk">
        <button onClick={() => set(field.options.map((o) => o.value))}>All</button>
        <button onClick={() => set([])}>None</button>
        <span className="count">{has.size} of {field.options.length}</span>
      </div>
      <ul className="checks">
        {field.options.map((o) => (
          <li key={o.value}>
            <label className="check">
              <input type="checkbox" checked={has.has(o.value)}
                onChange={(e) => set(e.target.checked ? [...value.filter((x) => x !== o.value), o.value] : value.filter((x) => x !== o.value))} />
              <span>{o.label}</span>
              {o.note && <small>{o.note}</small>}
            </label>
          </li>
        ))}
      </ul>
      {/* Anything stored that the roster no longer has is still shown, because a stale id is
          exactly the kind of thing you come to a page like this to find. */}
      {value.filter((x) => !field.options.some((o) => o.value === x)).map((x) => (
        <p key={x} className="note warn">
          Stored but unknown to this era: <b>{x}</b>
          <button className="link" onClick={() => set(value.filter((y) => y !== x))}>remove</button>
        </p>
      ))}
    </>
  );
}

function MarksField({ fieldKey, value, onEdit }: { fieldKey: string; value: Record<string, unknown>; onEdit: (patch: Bag) => void }) {
  const options = useMemo(markOptions, []);
  const setOne = (id: string, raw: string) => {
    const next = { ...value };
    if (raw === '') delete next[id]; else next[id] = Number(raw);
    onEdit({ [fieldKey]: next });
  };
  const setAll = (raw: string) => {
    const next: Record<string, unknown> = {};
    if (raw !== '') for (const c of CREATURES) next[c.id] = Number(raw);
    onEdit({ [fieldKey]: next });
  };
  const stale = Object.keys(value).filter((id) => !CREATURES.some((c) => c.id === id));
  return (
    <>
      <div className="bulk">
        <span>Set every creature to</span>
        <select defaultValue="" onChange={(e) => { setAll(e.target.value); e.currentTarget.value = ''; }}>
          <option value="">choose…</option>
          {options.map((o) => <option key={String(o.value)} value={String(o.value)}>{o.label}</option>)}
        </select>
      </div>
      <ul className="marks">
        {CREATURES.map((c) => {
          const raw = value[c.id];
          const n = typeof raw === 'number' ? raw : undefined;
          return (
            <li key={c.id}>
              <span className="mark-name">{c.name}<small>{c.id}</small></span>
              <select value={n === undefined ? '' : String(n)} onChange={(e) => setOne(c.id, e.target.value)}>
                {options.map((o) => <option key={String(o.value)} value={String(o.value)}>{o.label}</option>)}
                {/* A stored value that is not one of the offered marks still has to be selectable,
                    or opening this page would silently rewrite it the first time you touched
                    anything else on the row. */}
                {n !== undefined && !options.some((o) => o.value === n) && <option value={String(n)}>{n} · not a mark this page offers</option>}
              </select>
              {n !== undefined && (
                <small className="mark-note">
                  rung {rungOf(n)} ({ladderNames()[rungOf(n)]}){fillOf(n) > 0 ? `, meter ${Math.round(fillOf(n) * 100)}% full` : ''}
                </small>
              )}
            </li>
          );
        })}
      </ul>
      {stale.map((id) => (
        <p key={id} className="note warn">
          Stored but unknown to this era: <b>{id}</b> = {String(value[id])}
          <button className="link" onClick={() => setOne(id, '')}>remove</button>
        </p>
      ))}
    </>
  );
}

function RawJson({ storageKey, bag, onReplace }: { storageKey: string; bag: Bag; onReplace: (bag: Bag) => void }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const start = () => { setText(JSON.stringify(bag, null, 2)); setError(''); setOpen(true); };
  const apply = () => {
    try {
      const v: unknown = JSON.parse(text);
      if (!v || typeof v !== 'object' || Array.isArray(v)) { setError('Needs to be a JSON object.'); return; }
      onReplace(v as Bag); setError(''); setOpen(false);
    } catch (e) { setError(String(e)); }
  };
  return (
    <div className="raw-json">
      {!open ? <button className="link" onClick={start}>Edit {storageKey} as raw JSON</button> : (
        <>
          <textarea value={text} spellCheck={false} rows={12} onChange={(e) => setText(e.target.value)} />
          {error && <p className="note warn">{error}</p>}
          <div className="bulk">
            <button onClick={apply}>Apply</button>
            <button onClick={() => setOpen(false)}>Cancel</button>
          </div>
        </>
      )}
    </div>
  );
}
