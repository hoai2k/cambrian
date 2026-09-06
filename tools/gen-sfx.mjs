// Generates the game's sound effects with the ElevenLabs sound-generation API.
// Usage: ELEVENLABS_API_KEY=... node tools/gen-sfx.mjs [only-name]
import fs from 'node:fs';
const KEY = process.env.ELEVENLABS_API_KEY;
if (!KEY) { console.error('ELEVENLABS_API_KEY not set'); process.exit(1); }
const OUT = 'public/assets/sfx';
const only = process.argv[2];

/** name, prompt, seconds, variants, loop */
export const MANIFEST = [
  ['bite', 'quick wet crunchy bite underwater, a small armored sea creature snapping its mouthparts shut, short punchy impact with a tiny bubble burst, no music', 0.6, 3],
  ['crunch', 'chewing crunch of a shell being eaten underwater, wet cracking chitin, muffled, short', 0.9, 2],
  ['hit-light', 'dull soft underwater body impact, a slap of flesh against carapace, thud with a short bubble fizz, no music', 0.5, 2],
  ['hit-heavy', 'heavy underwater impact, a large creature slamming into another, deep muffled boom with cracking shell and a bubble burst, no music', 0.8, 2],
  ['parry', 'sharp bright chitinous clank underwater, two hard shells striking and deflecting, metallic ring quickly dampened by water', 0.7, 1],
  ['guard-break', 'armor shell cracking and giving way underwater, splintering crunch followed by a low thud and bubbles', 0.9, 1],
  ['stagger', 'muffled underwater tumble, a creature reeling and thrashing briefly, sand kicked up, short', 0.7, 1],
  ['dodge', 'quick sharp swish of water, a fast creature darting sideways, brief whoosh with tiny bubbles, no music', 0.6, 2],
  ['burst', 'accelerating rush of water, a swimming creature surging forward at speed, whoosh building then trailing off, bubbles streaming', 1.2, 1],
  ['silt', 'soft puff of sediment billowing into water, a muffled sandy whump with a hiss of fine particles settling', 1.5, 1],
  ['grab', 'clamping squeeze of armored appendages seizing prey underwater, tight creak of chitin and a struggling splash', 0.9, 1],
  ['kill', 'decisive heavy crunch of a shell being crushed underwater, final wet snap with a large burst of bubbles, no music', 1.4, 1],
  ['death', 'low slow groaning sink underwater, a creature going limp and drifting down, deep muffled tone fading with faint bubbles', 1.6, 1],
  ['tier-up', 'a creature moulting and growing underwater: a shell cracks open in a rising swell, deep whoomp then bright shimmering resonance, triumphant, short', 2.5, 1],
  ['hunted', 'ominous low cinematic sting underwater, a huge predator has noticed you, deep rumbling drone hit with a slow menacing swell, dark', 2.0, 1],
  ['escape', 'relieved gentle shimmer, tension releasing, soft warm underwater chime fading into calm, short', 1.8, 1],
  ['sense', 'sonar pulse underwater, a clean resonant ping that expands outward and fades, slightly organic', 1.2, 1],
  ['ability', 'powerful magical whoosh underwater with a tonal shimmer, a creature unleashing a special move, water rush and bright sparkle, short', 1.2, 1],
  ['heartbeat', 'single deep muffled heartbeat, close and heavy, lub-dub, as heard underwater, short', 1.0, 1],
  ['ui-move', 'tiny clean click, soft aquatic UI tick, very short', 0.5, 1],
  ['ui-confirm', 'short bright aquatic UI confirm blip, two-note rising, clean', 0.5, 1],
  ['ui-back', 'short soft aquatic UI cancel blip, two-note falling, clean', 0.5, 1],
  ['ui-join', 'cheerful short aquatic chime, a player joins, bright bubbly pop then a rising note', 0.8, 1],
  ['ui-start', 'energetic short underwater game-start stinger, a deep whoomp then a bright rising three-note flourish, punchy', 1.8, 1],
  ['won', 'triumphant short victory fanfare with an underwater ambience, warm resonant swell and shimmering high tones, concise', 3.5, 1],
  ['ambient-reef', 'calm underwater ambience on a shallow prehistoric reef: soft water movement, distant bubbles, gentle current wash, faint clicks of small creatures, no music, seamless loop', 22, 1, true],
  ['giant-drone', 'menacing low underwater drone, the presence of a huge predator nearby, deep slow pulsing rumble with sub bass, dark and tense, seamless loop', 12, 1, true],
];

async function gen(text, seconds, loop) {
  const body = { text, duration_seconds: seconds, prompt_influence: 0.45 };
  if (loop) body.loop = true;
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch('https://api.elevenlabs.io/v1/sound-generation?output_format=mp3_44100_96', {
      method: 'POST', headers: { 'xi-api-key': KEY, 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    if (res.ok) return Buffer.from(await res.arrayBuffer());
    const msg = await res.text();
    if (res.status === 422 && body.loop) { delete body.loop; continue; } // older API without loop support
    console.error(`  ${res.status} ${msg.slice(0, 200)}`);
    if (res.status === 429) await new Promise((r) => setTimeout(r, 4000)); else break;
  }
  return null;
}

for (const [name, prompt, seconds, variants = 1, loop = false] of MANIFEST) {
  if (only && name !== only) continue;
  for (let v = 0; v < variants; v++) {
    const file = `${OUT}/${name}${variants > 1 ? `-${v + 1}` : ''}.mp3`;
    if (fs.existsSync(file) && !only) { console.log('skip', file); continue; }
    const buf = await gen(prompt, seconds, loop);
    if (!buf) { console.error('FAILED', file); continue; }
    fs.writeFileSync(file, buf);
    console.log('ok', file, buf.length);
  }
}
