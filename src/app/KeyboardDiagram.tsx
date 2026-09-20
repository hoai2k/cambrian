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
  { cap: 'A', x: 61, y: 132 }, { cap: 'S', x: 103, y: 132 }, { cap: 'D', x: 145, y: 132 }, { cap: 'F', x: 187, y: 132 }, { cap: 'G', x: 229, y: 132 },
  { cap: 'Z', x: 82, y: 174 }, { cap: 'X', x: 124, y: 174 }, { cap: 'C', x: 166, y: 174 }, { cap: 'V', x: 208, y: 174 },
  { cap: 'Shift', x: 40, y: 216, w: 96 }, { cap: 'Space', x: 142, y: 216, w: 150 },
  { cap: 'I', x: 330, y: 90 }, { cap: 'J', x: 320, y: 132 }, { cap: 'K', x: 362, y: 132 },
];

/** The legend: every control, and what it does. */
const ROWS: [string, string][] = [
  [btn('swim', 'kbm'), 'Swim'],
  [btn('look', 'kbm'), 'Look around'],
  [btn('zoom', 'kbm'), 'Zoom the camera'],
  [btn('light', 'kbm'), 'Bite — click, on the release'],
  [btn('heavy', 'kbm'), 'Heavy attack / pounce — hold'],
  [btn('sprint', 'kbm'), 'Sprint (hold)'],
  [btn('dash', 'kbm'), 'Dash · right click dashes at the cursor'],
  [`${btn('aim', 'kbm')} / Tab`, 'Aim (hold) · crosshair'],
  [btn('guard', 'kbm'), 'Shield (tap = parry)'],
  [btn('ability', 'kbm'), 'Hide / camouflage'],
  [btn('sense', 'kbm'), 'Sense: marks and radar on/off'],
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
        Mouse and keyboard layout: W swims forward and X backwards, A and D turn, the camera
        follows the creature and dragging the mouse turns it, the wheel zooms. A left click bites
        and holding it is the heavy attack, both aimed at whatever the cursor is over; the right
        button dashes at the cursor and the middle button aims. Space dashes, Shift sprints, E or Q
        rise, S or C sink, R shields, Z is camouflage, I is the sense pulse, J or F bite, G or K is
        the heavy, T opens the teleport menu, V holds the scoreboard open and Escape pauses.
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
