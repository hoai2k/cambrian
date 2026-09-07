import './model-status.css';

/** A production-status label, never a lock or a change to creature capabilities. */
export function ModelStatusBadge({ status, compact = false }: { status?: 'preview' | 'final'; compact?: boolean }) {
  if (status !== 'preview') return null;
  return <span className={`model-preview${compact ? ' model-preview-compact' : ''}`} role="img"
    aria-label="Preview model — refinement in progress" title="Preview model — refinement in progress">
    <span aria-hidden="true">⚠{!compact && ' Preview model'}</span>
  </span>;
}
