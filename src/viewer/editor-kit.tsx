import { useCallback, useEffect, useRef, useState } from 'react';
import { History } from './sculpt/history';

/**
 * What the viewer's five editors (sculpt, stretch, bend, mouth, mark) share: an undo history over
 * their document, the keys that walk it, the two buttons that do, the model picker two of them carry,
 * and the download that hands a document off. Each used to spell all of it out for itself.
 */

/**
 * Undo and redo over one editor's document. `publish` is what the editor does with a document that
 * has become the present — draw it, store it, warp the body — and is called after every step, every
 * undo and every redo, and when a drag's gesture ends. The history itself is `historyRef.current`,
 * which the editor seats (`new History(doc)`) when it takes up a body and reads for `canUndo`; a
 * drag's intermediate states go through `historyRef.current.replace` and `endGesture` makes the
 * whole drag one step. Rendering follows the history: every change re-renders the editor, so the
 * Undo and Redo buttons read the right state.
 */
export function useEditorHistory<T>(publish: (doc: T) => void) {
  const historyRef = useRef<History<T> | null>(null);
  const [, setTick] = useState(0);
  const publishRef = useRef(publish);
  publishRef.current = publish;
  const bump = useCallback(() => setTick((t) => t + 1), []);
  const step = useCallback((next: T) => { historyRef.current?.push(next); publishRef.current(next); bump(); }, [bump]);
  const endGesture = useCallback(() => {
    const h = historyRef.current;
    if (h?.inGesture) { h.commit(); publishRef.current(h.present); bump(); }
  }, [bump]);
  const undo = useCallback(() => { const h = historyRef.current; if (!h?.canUndo) return; publishRef.current(h.undo()); bump(); }, [bump]);
  const redo = useCallback(() => { const h = historyRef.current; if (!h?.canRedo) return; publishRef.current(h.redo()); bump(); }, [bump]);
  return { historyRef, step, endGesture, undo, redo };
}

/**
 * The editors' keyboard: ⌘/Ctrl+Z undoes, ⇧⌘/Ctrl+Z and Ctrl+Y redo, and any other key with no
 * modifier goes to `onPlainKey` (the preview toggle, the brush keys). Nothing is taken while the
 * focus is in a field, so typing a note or a number never undoes the edit.
 */
export function useUndoKeys(undo: () => void, redo: () => void, onPlainKey?: (e: KeyboardEvent) => void) {
  const plainRef = useRef(onPlainKey);
  plainRef.current = onPlainKey;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT')) return;
      const mod = e.metaKey || e.ctrlKey;
      if (mod) {
        if (e.key === 'z' || e.key === 'Z') { e.preventDefault(); if (e.shiftKey) redo(); else undo(); }
        else if (e.key === 'y' || e.key === 'Y') { e.preventDefault(); redo(); }
        return;
      }
      plainRef.current?.(e);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo]);
}

/** The Undo and Redo buttons, which every editor draws first in its row of actions. */
export function UndoRedo({ history, undo, redo }: { history: History<unknown> | null; undo(): void; redo(): void }) {
  return <>
    <button className="ghost" onClick={undo} disabled={!history?.canUndo} title="⌘/Ctrl+Z">Undo</button>
    <button className="ghost" onClick={redo} disabled={!history?.canRedo} title="⇧⌘/Ctrl+Z · Ctrl+Y">Redo</button>
  </>;
}

/**
 * The Model control an editor carries in its own panel, because the info card's is off the screen
 * while any editor is open (stretch and bend; see `editableStages` in Viewer.tsx). Drawn only when
 * there is a choice to make.
 */
export function ModelPick({ mode, stages, stageId, onStage }: {
  mode: 'bend' | 'stretch';
  stages: readonly { id: string; label: string }[];
  stageId: string;
  onStage(id: string): void;
}) {
  if (stages.length <= 1) return null;
  return <label className={`scheme-pick editor-model-pick ${mode}-model-pick`}>
    <span>Model</span>
    <select aria-label={`Which model in ${mode} mode`} value={stageId} onChange={(e) => onStage(e.target.value)}>
      {stages.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
    </select>
  </label>;
}

/** Hand a document to the reviewer's machine as `name`, pretty-printed JSON. */
export function downloadJson(name: string, payload: unknown) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
}
