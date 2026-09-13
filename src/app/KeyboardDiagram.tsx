import { btn } from '../shared/controls';

/**
 * The mouse-and-keyboard half of the help page: what `XboxDiagram` is for a pad.
 *
 * Shown whenever no controller is connected. The keys drawn here and the labels beside them both
 * come from the same table the game binds against (`src/shared/controls.ts`), so a rebinding
 * cannot leave the picture lying.
 */

/** Keys that carry an action, laid out the way they sit under a left hand resting on WASD. */
const KEYS: { cap: string; x: number; y: number; w?: number }[] = [
  { cap: 'Q', x: 40, y: 90 }, { cap: 'W', x: 82, y: 90 }, { cap: 'E', x: 124, y: 90 }, { cap: 'R', x: 166, y: 90 }, { cap: 'T', x: 208, y: 90 },
  { cap: 'A', x: 61, y: 132 }, { cap: 'S', x: 103, y: 132 }, { cap: 'D', x: 145, y: 132 }, { cap: 'F', x: 187, y: 132 },
  { cap: 'Z', x: 82, y: 174 }, { cap: 'C', x: 124, y: 174 },
  { cap: 'Shift', x: 40, y: 216, w: 96 }, { cap: 'Space', x: 142, y: 216, w: 108 },
];

/** The legend: every control, and what it does. */
const ROWS: [string, string][] = [
  [btn('swim', 'kbm'), 'Swim'],
  [btn('look', 'kbm'), 'Look around'],
  [btn('zoom', 'kbm'), 'Zoom the camera'],
  [btn('heavy', 'kbm'), 'Heavy attack / pounce'],
  [btn('dash', 'kbm'), 'Dash, with a direction held'],
  [`${btn('aim', 'kbm')} / Tab`, 'Aim (hold) · crosshair'],
  [btn('light', 'kbm'), 'Bite (chain ×3)'],
  [btn('guard', 'kbm'), 'Shield (tap = parry)'],
  [btn('ability', 'kbm'), 'Hide / camouflage'],
  [btn('sense', 'kbm'), 'Sense: marks and radar on/off'],
  [btn('sprint', 'kbm'), 'Sprint (hold)'],
  [btn('rise', 'kbm'), 'Rise / hop'],
  [btn('sink', 'kbm'), 'Sink'],
  [btn('teleport', 'kbm'), 'Teleport menu'],
  [btn('view', 'kbm'), 'Scoreboard (hold)'],
  [btn('menu', 'kbm'), 'Pause'],
];

export function KeyboardDiagram() {
  return (
    <svg className="xbox-diagram kbm-diagram" viewBox="0 0 860 400" role="img" aria-labelledby="kbm-title">
      <title id="kbm-title">
        Mouse and keyboard layout: WASD swims, the mouse looks and the wheel zooms, left click is
        the heavy attack, right click dashes, the middle button aims, F bites, Q shields, R hides,
        E is the sense pulse, Shift sprints, Space rises, C sinks, T opens the teleport menu, Z
        holds the scoreboard open and Escape pauses.
      </title>
      <defs>
        <linearGradient id="key-cap" x2="0" y2="1"><stop stopColor="#2f4d58" /><stop offset="1" stopColor="#162b34" /></linearGradient>
        <linearGradient id="mouse-shell" x2="0" y2="1"><stop stopColor="#2f4d58" /><stop offset="1" stopColor="#13262f" /></linearGradient>
      </defs>

      {KEYS.map((k) => (
        <g key={k.cap}>
          <rect x={k.x} y={k.y} width={k.w ?? 38} height={38} rx={8} fill="url(#key-cap)" stroke="#7ea4ae" strokeWidth="2" />
          <text x={k.x + (k.w ?? 38) / 2} y={k.y + 25} textAnchor="middle" className="key-cap">{k.cap}</text>
        </g>
      ))}
      <text x={145} y={286} textAnchor="middle" className="pad-label dim-label">left hand · Esc pauses</text>

      {/* The mouse. Its buttons are named in the legend rather than lettered on the shell. */}
      <g>
        <path d="M300 118 q0-34 30-34 h15 q30 0 30 34 v70 q0 40-37.5 40 t-37.5-40 z" fill="url(#mouse-shell)" stroke="#7ea4ae" strokeWidth="2.5" />
        <path d="M300 118 q0-34 30-34 h7.5 v50 h-37.5 z" fill="#0d1c22" opacity=".55" />
        <path d="M375 118 q0-34-30-34 h-7.5 v50 h37.5 z" fill="#0d1c22" opacity=".3" />
        <rect x="332" y="96" width="11" height="24" rx="5.5" fill="#7ea4ae" />
        <line x1="300" y1="134" x2="375" y2="134" stroke="#7ea4ae" strokeWidth="1.5" />
      </g>
      <line x1="310" y1="98" x2="300" y2="70" className="pad-line" />
      <text x={296} y={64} textAnchor="end" className="pad-label">Left · Heavy</text>
      <line x1="365" y1="98" x2="375" y2="70" className="pad-line" />
      <text x={379} y={64} className="pad-label">Right · Dash</text>
      <text x={337} y={254} textAnchor="middle" className="pad-label dim-label">wheel zooms · press to aim</text>

      {ROWS.map(([control, what], i) => {
        const y = 46 + i * 21.5;
        return (
          <g key={control + what}>
            <text x={460} y={y} className="pad-label key-name">{control}</text>
            <text x={620} y={y} className="pad-label">{what}</text>
          </g>
        );
      })}
    </svg>
  );
}
