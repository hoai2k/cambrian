export function XboxDiagram() {
  const label = (x: number, y: number, text: string, anchor: 'start' | 'end' | 'middle' = 'start') => (
    <text x={x} y={y} textAnchor={anchor} className="pad-label">{text}</text>
  );
  const line = (x1: number, y1: number, x2: number, y2: number) => <line x1={x1} y1={y1} x2={x2} y2={y2} className="pad-line" />;
  return (
    <svg className="xbox-diagram" viewBox="0 0 860 400" role="img" aria-labelledby="xbox-title">
      <title id="xbox-title">Xbox controller layout: left stick swims, right stick looks and click-plus-up-or-down zooms, RT pounces, LB dashes, LT aims, RB rises, X bites, Y ability, B guards, A sprints, D-pad up senses, Menu pauses.</title>
      <defs>
        <linearGradient id="pad-shell" x2="0" y2="1"><stop stopColor="#2f4d58" /><stop offset="1" stopColor="#13262f" /></linearGradient>
      </defs>
      <path d="M325 110 Q300 104 284 146 L246 296 Q240 338 274 339 Q293 339 330 289 L530 289 Q567 339 587 339 Q620 337 612 296 L576 146 Q559 104 536 110 Z" fill="url(#pad-shell)" stroke="#6f8f9a" strokeWidth="3" />
      <rect x="300" y="88" width="80" height="22" rx="9" fill="#5e7a84" />
      <rect x="480" y="88" width="80" height="22" rx="9" fill="#5e7a84" />
      <rect x="312" y="62" width="56" height="26" rx="8" fill="#7ea4ae" />
      <rect x="492" y="62" width="56" height="26" rx="8" fill="#7ea4ae" />
      <circle cx="346" cy="180" r="26" fill="#0d1c22" stroke="#7ea4ae" strokeWidth="3" />
      <circle cx="486" cy="236" r="24" fill="#0d1c22" stroke="#7ea4ae" strokeWidth="3" />
      <circle cx="514" cy="180" r="40" fill="#0d1c22" opacity=".5" />
      <circle cx="514" cy="150" r="12" fill="#f2c94c" />
      <circle cx="544" cy="180" r="12" fill="#eb5757" />
      <circle cx="484" cy="180" r="12" fill="#2f80ed" />
      <circle cx="514" cy="210" r="12" fill="#27ae60" />
      <path d="M362 236 h16 v-16 h16 v16 h16 v16 h-16 v16 h-16 v-16 h-16z" fill="#0d1c22" stroke="#7ea4ae" strokeWidth="3" />
      <circle cx="430" cy="178" r="9" fill="#7ea4ae" />
      <circle cx="430" cy="215" r="14" fill="#17313a" stroke="#7ea4ae" strokeWidth="3" />
      {line(340, 62, 200, 40)}{label(194, 44, 'LT · Aim (hold) · crosshair', 'end')}
      {line(340, 92, 200, 90)}{label(194, 94, 'LB · Dash (with stick)', 'end')}
      {label(194, 114, 'neutral hold · dash on move', 'end')}
      {line(320, 180, 200, 170)}{label(194, 174, 'Left stick · Swim', 'end')}
      {label(194, 194, 'click · Sink', 'end')}
      {line(378, 236, 200, 250)}{label(194, 254, 'D-pad ▲ · Sense pulse', 'end')}
      {label(194, 274, 'D-pad ◀▶ · Pick creature', 'end')}
      {line(520, 62, 660, 40)}{label(666, 44, 'RT · Pounce / lunge')}
      {line(520, 92, 660, 90)}{label(666, 94, 'RB · Rise / hop')}
      {line(514, 138, 660, 130)}{label(666, 134, 'Y · Signature ability')}
      {line(556, 180, 660, 170)}{label(666, 174, 'B · Shield (tap = parry)')}
      {line(472, 180, 472, 120)}{line(472, 120, 660, 108)}
      {label(666, 210, 'X · Bite (chain ×3)')}{line(514, 222, 660, 206)}
      {label(666, 250, 'A · Sprint (hold) · Join')}{line(526, 218, 660, 246)}
      {line(510, 236, 660, 290)}{label(666, 294, 'Right stick · Camera')}
      {label(666, 314, 'click + up/down · Zoom')}
      {line(430, 215, 430, 372)}{label(430, 390, 'Menu · Pause / start', 'middle')}
    </svg>
  );
}
