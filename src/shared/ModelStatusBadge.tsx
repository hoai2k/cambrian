import { useCallback, useId, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import './model-status.css';

/** Roughly the note's rendered box, for keeping it on screen. */
const NOTE_W = 340, NOTE_H = 150, EDGE = 8;

/**
 * A marker that opens a note on hover or keyboard focus.
 *
 * The note is measured against the viewport and rendered into `document.body`, because the panels
 * these markers sit in are narrow, scroll, or both: anchored normally it was cut off by the
 * viewer's 260px info column, and `position: fixed` does not escape that either — the column
 * declares `container-type`, which makes it the containing block for fixed descendants. A portal
 * does.
 */
export function RefinementNote({ note, heading, label, className, children }: {
  note: string; heading: string; label: string; className?: string; children: ReactNode;
}) {
  const id = useId();
  const ref = useRef<HTMLSpanElement>(null);
  const [at, setAt] = useState<{ top: number; left: number } | null>(null);
  const show = useCallback(() => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    const below = r.bottom + 6, above = r.top - 6 - NOTE_H;
    setAt({
      // Below the marker normally; above it when there is no room, which is what a button low on
      // the animation grid gets.
      top: below + NOTE_H + EDGE > window.innerHeight && above > EDGE ? above : below,
      left: Math.max(EDGE, Math.min(r.left, window.innerWidth - NOTE_W - EDGE)),
    });
  }, []);
  const hide = useCallback(() => setAt(null), []);
  return (
    <>
      <span ref={ref} className={className} role="img" aria-label={label} aria-describedby={at ? id : undefined}
        tabIndex={0} onMouseEnter={show} onMouseLeave={hide} onFocus={show} onBlur={hide}>
        {children}
      </span>
      {at && createPortal(
        <span className="model-preview-note" id={id} role="tooltip" style={{ top: at.top, left: at.left }}>
          <b>{heading}</b>{note}
        </span>, document.body)}
    </>
  );
}

/**
 * A production-status label on a creature, never a lock or a change to its capabilities.
 *
 * It means the **3D model** is unfinished — geometry, materials, rig or LOD art. It deliberately
 * does *not* appear for a finished body whose animation clips are queued for rework: flagging the
 * whole animal for that said the wrong thing about a model that is actually done. That warning
 * lives on the clip buttons instead (`ClipQueuedBadge`), where it names what will change.
 */
export function ModelStatusBadge({ status, note, compact = false }: { status?: 'preview' | 'final'; note?: string; compact?: boolean }) {
  if (status !== 'preview') return null;
  const cls = `model-preview${compact ? ' model-preview-compact' : ''}`;
  const mark = <span aria-hidden="true">⚠{!compact && ' Preview model'}</span>;
  if (!note) {
    return <span className={cls} role="img" aria-label="Preview model — refinement in progress" title="Preview model — refinement in progress">{mark}</span>;
  }
  return (
    <RefinementNote note={note} heading="Still to come" label={`Preview model. ${note}`} className={`${cls} model-preview-asks`}>
      {mark}
    </RefinementNote>
  );
}

/** The same warning, on one animation clip whose motion is queued for rework. */
export function ClipQueuedBadge({ name, note }: { name: string; note: string }) {
  return (
    <RefinementNote note={note} heading={`${name} — queued for rework`} label={`${name} is queued for rework. ${note}`} className="clip-queued-mark">
      <span aria-hidden="true">⚠</span>
    </RefinementNote>
  );
}
