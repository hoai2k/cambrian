import { useCallback, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import './model-status.css';

/** Roughly the note's rendered box, for keeping it on screen. */
const NOTE_W = 340, NOTE_H = 150, EDGE = 8;

/**
 * A production-status label, never a lock or a change to creature capabilities.
 *
 * A preview model is fully playable; the badge only says its art or animation is still queued for
 * work. `note` is that queue's own sentence about what remains, so a player looking at a creature
 * that seems finished — the model may well be — can find out what is actually outstanding. It
 * opens on hover and on keyboard focus.
 *
 * The note is measured against the viewport and rendered into `document.body`, because every panel
 * this badge sits in is narrow, scrolls, or both: anchored normally it was cut off by the viewer's
 * 260px info column, and `position: fixed` alone does not escape it either — that column declares
 * `container-type`, which makes it the containing block for fixed descendants. A portal does.
 */
export function ModelStatusBadge({ status, note, compact = false }: { status?: 'preview' | 'final'; note?: string; compact?: boolean }) {
  const id = useId();
  const ref = useRef<HTMLSpanElement>(null);
  const [at, setAt] = useState<{ top: number; left: number } | null>(null);
  const show = useCallback(() => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    const below = r.bottom + 6, above = r.top - 6 - NOTE_H;
    setAt({
      // Below the badge normally; above it when there is no room, which is what a badge low on a
      // tall roster grid gets.
      top: below + NOTE_H + EDGE > window.innerHeight && above > EDGE ? above : below,
      left: Math.max(EDGE, Math.min(r.left, window.innerWidth - NOTE_W - EDGE)),
    });
  }, []);
  const hide = useCallback(() => setAt(null), []);

  if (status !== 'preview') return null;
  const label = note ? `Preview model. ${note}` : 'Preview model — refinement in progress';
  const cls = `model-preview${compact ? ' model-preview-compact' : ''}${note ? ' model-preview-asks' : ''}`;
  return (
    <>
      <span ref={ref} className={cls} role="img" aria-label={label}
        aria-describedby={note && at ? id : undefined} tabIndex={note ? 0 : undefined}
        title={note ? undefined : label}
        onMouseEnter={note ? show : undefined} onMouseLeave={note ? hide : undefined}
        onFocus={note ? show : undefined} onBlur={note ? hide : undefined}>
        <span aria-hidden="true">⚠{!compact && ' Preview model'}</span>
      </span>
      {note && at && createPortal(
        <span className="model-preview-note" id={id} role="tooltip" style={{ top: at.top, left: at.left }}>
          <b>Still to come</b>{note}
        </span>, document.body)}
    </>
  );
}
