#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const BOARD_DIR = path.join(ROOT, 'docs/triassic/boards');
const REF_DIR = path.join(ROOT, 'public/assets/triassic/reference');
const REGION_DIR = path.join(REF_DIR, 'regions');
const SCALE_DIR = path.join(REF_DIR, 'scale');
const catalogue = JSON.parse(await readFile(path.join(ROOT, 'docs/research/triassic/viewer/images.json')));
const swimming = JSON.parse(await readFile(path.join(ROOT, 'docs/research/triassic-swimming.json')));
const subjects = catalogue.groups.flatMap((g) => g.subjects);
const swimById = Object.fromEntries(swimming.map((x) => [x.id, x]));

await Promise.all([BOARD_DIR, REGION_DIR, SCALE_DIR].map((d) => mkdir(d, { recursive: true })));

const roster = [
  ['T01','cymbospondylus','Long and low; low tail fin, no dorsal fin; small eye; full tooth row visible at the lip.','Fossil Hill Member, Favret Formation, Nevada; Anisian.'],
  ['T02','shonisaurus','Slim Kosch body; deep chest; toothed jaw.','Luning Formation, Berlin–Ichthyosaur State Park, Nevada; latest Carnian.'],
  ['T03','nothosaurus','Interlocking fangs with mouth shut; wing-shaped humeri; webbed feet with distinct digits.','Upper Muschelkalk of Germany and Besano Formation at Monte San Giorgio; Anisian–Ladinian.'],
  ['T04','dinocephalosaurus','Very long flexible neck; small head; broad trunk; paddle-like limbs.','Upper Guanling Formation, Guizhou and Luoping, Yunnan; late Anisian.'],
  ['T05','helicoprion','Fadenia-type fusiform body; tooth whorl inside lower jaw with only front arc exposed.','The animal is a Permian relict slot; the research file explicitly flags the temporal exception.'],
  ['T06','rhaeticosaurus','Pliosaurid-grade short neck, large head, four hydrofoils, barrel trunk and short tail.','Exter Formation at Bonenburg, Westphalia; Rhaetian.'],
  ['T07','atopodentatus','T-shaped jaw; chisel teeth on the front edge and needle-like mesh behind.','Guanling Formation, Yunnan, China; Middle Triassic.'],
  ['T08','askeptosaurus','Small head, sharp teeth and a laterally compressed tail about two-thirds of body length.','Besano Formation at Monte San Giorgio; late Anisian.'],
  ['T09','placodus','Barrel body; procumbent incisors; crushing palate; gastral basket.','Muschelkalk of central Europe; Anisian–Ladinian.'],
  ['T10','hybodus','Two dorsal fins with leading spines; male cephalic hooks; heterodont dentition.','Muschelkalk sea; the genus spans a much broader interval and geography.'],
  ['T11','birgeria','Scaleless tuna-shaped body, large head, wide gape and deeply forked tail.','Early–Middle Triassic marine deposits including Spitsbergen and Monte San Giorgio.'],
  ['T12','aphaneramma','Extremely narrow gharial-like rostrum, flat skull, far-back eyes, no armour, small limbs and deep tail.','Sticky Keep Formation, Svalbard; Early Triassic.'],
  ['T13','mixosaurus','Dorsal fin, dorsal tail lobe and heterodont teeth.','Besano Formation, Monte San Giorgio and Besano; Anisian–Ladinian boundary.'],
  ['T14','henodus','Square shell of many plates, fringed lip and ventral plastron.','Oberer Gipskeuper at Tübingen-Lustnau; early Carnian.'],
  ['T15','saurichthys','Three scale rows, large eye, and opposed fins set far back on a slender body.','Widespread Triassic; the design draws especially on Muschelkalk and South China occurrences.'],
  ['T16','hupehsuchus','Toothless snout, dorsal plate rows and gastral basket; throat pouch remains a soft-tissue reconstruction.','Jialingjiang Formation, Hubei, China; Spathian.'],
  ['T17','keichousaurus','Tiny head, broad flat ulna; male limbs more robust than female limbs.','Zhuganpo Member, Falang Formation, Xingyi, Guizhou; Ladinian.'],
  ['T18','cartorhynchus','Short snout, thick ribs and flexible flipper wrists.','Nanlinghu Formation at Majiashan, Chaohu, Anhui; Spathian.'],
  ['T19','odontochelys','Teeth, no carapace, broadened ribs, long tail and a ventral plastron.','Xiaowa Formation, Guanling, Guizhou; Carnian.'],
  ['T20','ceratites','Ribbed, noded, evolute shell; ceratitic suture; nautilus-like soft body and aptychus are reconstruction targets.','Muschelkalk sea of central Europe; Middle Triassic.'],
  ['T21','phragmoteuthis','Rigid internal shell, broad pro-ostracum and paired arm hooks.','Polzberg/Lunz, Lower Austria; Carnian.'],
  ['S01','tanystropheus','Rigid elongated neck with cervical-rib struts, high nostrils and fang trap.','Besano Formation at Monte San Giorgio; Anisian–Ladinian.'],
  ['S02','mystriosuchus','Gharial-like snout, nostril crest before the eyes, osteoderm rows and tail about half the body.','Late Triassic European localities; the design uses it as a shore/surface animal.'],
  ['S03','macrocnemus','Long hindlimbs and a light terrestrial runner build.','Besano Formation at Monte San Giorgio; Middle Triassic.'],
  ['S04','coelophysis','Slender theropod proportions and a drinking stance; optional shore visitor only.','Late Triassic North America; explicitly an optional mixed-locality visitor.'],
];

const esc = (s) => String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const fmtM = (n) => n < 1 ? `${Math.round(n * 100)} cm` : `${Number(n.toFixed(2))} m`;
const targetImage = (s) => s.images.find((im) => /skelet|fossil|holotype|specimen|skull/i.test(`${im.title} ${im.description || ''}`));

for (const [code,id,anatomy,locality] of roster) {
  const s = subjects.find((x) => x.id === id);
  const sw = swimById[id];
  if (!s || !sw) throw new Error(`Missing source data for ${id}`);
  const evidence = targetImage(s);
  const canonicalPanel = id === 'keichousaurus'
    ? `![Current canonical male pose](../canonical/keichousaurus-male.png)\n\n![Current canonical female pose](../canonical/keichousaurus-female.png)\n\nThe two schemes preserve the fossil-recorded limb dimorphism.`
    : `![Current canonical pose](../canonical/${id}.png)`;
  const evidenceBlock = evidence
    ? `![Catalogue evidence thumbnail](${evidence.thumb})\n\n**Catalogue evidence:** [${evidence.title}](${evidence.page}) — ${evidence.artist || 'creator not recorded'}, ${evidence.licence || 'licence not recorded'}. ${evidence.description || ''}\n\nThis linked image is selected from the existing repository catalogue by a filename/description match for skeletal, fossil, holotype, specimen, or skull evidence. Check whether it depicts the target species or a comparative taxon before modelling.`
    : `**No skeletal/specimen image is identified in the existing repository catalogue for this subject.** Do not claim that this board supplies new skeletal research. Use the research notes and credited comparison images conservatively, and obtain a specialist-reviewed target-species skeletal reference before treating proportions as measured.`;
  const md = `# ${code} · *${s.name}* — reference board\n\n> **Scope:** modelling and art-direction board assembled only from existing repository research and canonical/reference catalogues. It is not a new anatomical study.\n\n| Field | Working value |\n| --- | --- |\n| Representative length | **${fmtM(sw.lengthM)}** (maximum recorded in the swimming dataset: ${fmtM(sw.maxLengthM)}) |\n| Existing catalogue range | ${s.len} |\n| Age / locality context | ${locality} |\n| Canonical status | See the canonical manifest; approval state can change independently of this board. |\n\n## Panel A · Current canonical life reconstruction\n\n${canonicalPanel}\n\nThe canonical pose is an internal visual contract, not fossil evidence. Colour, pattern, soft-tissue volume and pose remain **inferred** or **speculative** unless the cited research says otherwise.\n\n## Panel B · Existing skeletal or specimen evidence\n\n${evidenceBlock}\n\n## Panel C · Anatomy that must read\n\n- **Model target:** ${anatomy}\n- Preserve the full silhouette, tail and every limb or fin in modelling inputs.\n- Treat hard-part anatomy described from specimens as **supported**; treat soft-tissue completion and locomotor posture as **inferred** unless the research notes explicitly raise or lower confidence.\n\n## Panel D · Scale and uncertainty\n\nThe production representative is **${fmtM(sw.lengthM)}**, from [the repository swimming dataset](../../research/triassic-swimming.json); that dataset records the movement confidence as **${sw.confidence}** and cites its rationale in the note. The broader displayed range is retained above so the single game representative is not mistaken for a species maximum.\n\nUncertainty vocabulary follows [research.md](../research.md): **supported** = direct fossil evidence or published functional analysis; **inferred** = reasoned from anatomy or analogues in the cited literature; **speculative** = plausible but untested. The swimming note is not a skeletal source.\n\n## Sources and handling\n\n- [Triassic research notes](../research.md) — age, locality, anatomy, length discussion and claim-level confidence.\n- [Reference viewer catalogue](../../research/triassic/viewer/images.json) — external image metadata, creator, licence and source page.\n- [Canonical pose documentation](../canonical/README.md) — what the internal image does and does not establish.\n- [Image/model request anatomy brief](../03-image-and-model-requests.md) — production-critical silhouette checklist.\n- [Swimming dataset](../../research/triassic-swimming.json) — representative production length and movement estimate.\n\nDo not redistribute an external image without following its source-page licence. The remotely linked catalogue image is a reference thumbnail and is not copied into runtime assets.\n`;
  await writeFile(path.join(BOARD_DIR, `${id}.md`), md);
}

const regions = [
  ['gypsum-flats','Gypsum Flats','Gipskeuper lagoons · Late Triassic Germany','10','0.08','#5fbfb0','0.70','2.6','4.0','#e9e2cf','Hypersaline, hot and blinding · salt crusts and microbial domes'],
  ['conifer-shore','Conifer Shore','Grès à Voltzia + Muschelkalk margins · Middle Triassic','13','0.05','#6a7f55','1.20','1.5','2.6','#a8785a','Brackish estuary cover · Voltzia and horsetail stands'],
  ['dasyclad-lagoon','Dasyclad Lagoon','Wetterstein / Latemar platform interior · Middle Triassic Dolomites','30','0.35','#3aa39a','0.85','2.2','3.6','#dcd3b3','Milk-turquoise platform water · Diplopora meadow and shell sand'],
  ['sea-lily-garden','Sea-Lily Garden','Trochitenkalk · Muschelkalk sea','32','0.42','#2d8a86','0.95','1.9','3.2','#c9bfa2','Encrinus meadows · columnals carpet the floor'],
  ['sponge-coral-reef','Sponge-Coral Reef','Wetterstein + Dachstein reefs · Middle–Late Triassic Alps','24; crests 17','0.50','#2b7f8e','0.90','2.0','3.4','#cfc4a8','Thecosmilia, calcisponges and Tubiphytes · chambers and overhangs'],
  ['shell-pavement','Shell Pavement','Daonella / Halobia beds + Muschelkalk Placunopsis mounds','34','0.30','#46a8a0','0.80','2.3','3.8','#e0d9c0','Bright exposed shell floor · crushing-feeder territory'],
  ['margin-channels','Margin Channels','Latemar / Marmolada platform margin · tidal passes','46','0.70','#124a5a','1.15','1.3','2.3','#8b8f86','Current-swept cuts, breccia blocks and dark water'],
  ['reef-front','Reef Front','Dachstein reef slope + Guanling basin margin','52','0.80','#0d3b4c','1.25','1.1','1.9','#6f7570','Talus wall into darkness · log rafts overhead'],
  ['black-basin','Black Basin','Besano / Monte San Giorgio + Fossil Hill, Nevada','88','0.92','#04121c','1.60','0.6','1.1','#2b3136','Stratified basin · anoxic laminated floor · life in the water column'],
];

for (const [id,name,locality,depth,danger,fog,density,sky,sun,sand,character] of regions) {
  const W=1600,H=1000, heroH=610;
  const painting = (await readFile(path.join(ROOT, 'public/assets/triassic/biomes', `${id}.webp`))).toString('base64');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect y="${heroH}" width="${W}" height="${H-heroH}" fill="#10191b"/><image href="data:image/webp;base64,${painting}" x="0" y="0" width="${W}" height="${heroH}" preserveAspectRatio="xMidYMid slice"/>
  <rect x="0" y="0" width="${W}" height="${heroH}" fill="url(#shade)"/><defs><linearGradient id="shade" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#061013" stop-opacity=".12"/><stop offset="1" stop-color="#061013" stop-opacity=".74"/></linearGradient></defs>
  <text x="72" y="84" fill="#e8d8a7" font-family="Arial" font-size="24" font-weight="700" letter-spacing="5">TRIASSIC · REGIONAL ART DIRECTION</text><text x="72" y="158" fill="#fff" font-family="Arial" font-size="62" font-weight="700">${esc(name)}</text><text x="72" y="202" fill="#e7efea" font-family="Arial" font-size="27">${esc(locality)}</text>
  <rect x="72" y="510" width="1456" height="68" rx="8" fill="#071013" fill-opacity=".82"/><text x="100" y="553" fill="#f3f1e8" font-family="Arial" font-size="25">${esc(character)}</text>
  <text x="72" y="662" fill="#e8d8a7" font-family="Arial" font-size="22" font-weight="700">ATMOSPHERE / GAME VALUES</text>
  <rect x="72" y="696" width="210" height="92" rx="8" fill="${fog}"/><text x="92" y="730" fill="#fff" font-family="Arial" font-size="20" font-weight="700">FOG</text><text x="92" y="765" fill="#fff" font-family="monospace" font-size="22">${fog}</text>
  <rect x="300" y="696" width="210" height="92" rx="8" fill="${sand}"/><text x="320" y="730" fill="#152124" font-family="Arial" font-size="20" font-weight="700">SAND</text><text x="320" y="765" fill="#152124" font-family="monospace" font-size="22">${sand}</text>
  ${[['DEPTH',depth],['DANGER',danger],['FOG DENSITY',density],['SKY',sky],['SUN',sun]].map(([k,v],i)=>`<rect x="${532+i*195}" y="696" width="178" height="92" rx="8" fill="#203034"/><text x="${552+i*195}" y="730" fill="#9eb5b1" font-family="Arial" font-size="17" font-weight="700">${k}</text><text x="${552+i*195}" y="766" fill="#fff" font-family="Arial" font-size="25">${esc(v)}</text>`).join('')}
  <text x="72" y="848" fill="#e8d8a7" font-family="Arial" font-size="22" font-weight="700">CONTEXT RULE</text><text x="72" y="890" fill="#d6dfdc" font-family="Arial" font-size="24">Localities and ages are mixed across the game world. This board directs atmosphere and layout.</text><text x="72" y="929" fill="#d6dfdc" font-family="Arial" font-size="24">It does not assert that every illustrated animal coexisted in one community.</text><text x="1528" y="956" text-anchor="end" fill="#81938f" font-family="Arial" font-size="17">Source: docs/triassic/02-biomes-and-depth.md · painting reused without redraw</text></svg>`;
  const svgPath = path.join(REGION_DIR, `${id}.svg`);
  await writeFile(svgPath, svg);
  const overlay = svg.replace(/<image href="data:image\/webp;base64,[^"]+"[^>]+\/>/, '');
  const base = await sharp(Buffer.from(painting, 'base64')).resize(W,heroH,{fit:'cover'}).extend({bottom:H-heroH,background:'#10191b'}).png().toBuffer();
  await sharp(base).composite([{input:Buffer.from(overlay),top:0,left:0}]).png().toFile(path.join(REGION_DIR, `${id}.png`));
}

function scaleSvg(mode) {
  const game = mode === 'game';
  const rows = roster.map(([code,id]) => ({code,id,s:subjects.find(x=>x.id===id),m:swimById[id].lengthM})).sort((a,b)=>b.m-a.m);
  const vals=rows.map(r=>game?4*Math.pow(r.m,.55):r.m), max=Math.max(...vals), W=2400, H=2100, x=720, span=1530, top=330, rowH=66;
  const ticks=game?[0,2,4,6,8,10,12,14,16,18,20]:[0,2,4,6,8,10,12,14,16,18];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><rect width="${W}" height="${H}" fill="#122126"/><text x="90" y="90" fill="#e8d8a7" font-family="Arial" font-size="27" font-weight="700" letter-spacing="5">TRIASSIC · NUMERICAL SCALE PLATE</text><text x="90" y="172" fill="#fff" font-family="Arial" font-size="64" font-weight="700">${game?'Game lengths · 4 × m^0.55':'Representative lengths · metres'}</text><text x="90" y="224" fill="#b9cac6" font-family="Arial" font-size="25">Linear shared ruler · bars encode length only · no animal imagery</text><text x="90" y="266" fill="#b9cac6" font-family="Arial" font-size="23">Mixed ages and localities: this comparison is not a co-occurrence reconstruction.</text>
  ${ticks.map(t=>{const xx=x+t/Math.max(...ticks)*span;return `<line x1="${xx}" y1="305" x2="${xx}" y2="1990" stroke="#365057" stroke-width="2"/><text x="${xx}" y="295" text-anchor="middle" fill="#d9c791" font-family="Arial" font-size="20">${t} ${t===ticks.at(-1)?(game?'units':'m'):''}</text>`}).join('')}
  ${rows.map((r,i)=>{const v=game?4*Math.pow(r.m,.55):r.m,y=top+i*rowH,w=v/Math.max(...ticks)*span;return `<text x="90" y="${y+31}" fill="#d9e2df" font-family="Arial" font-size="22"><tspan font-weight="700">${r.code}</tspan>  ${esc(r.s.name)}</text><rect x="${x}" y="${y+8}" width="${Math.max(3,w)}" height="30" rx="5" fill="${i<2?'#d8bd78':'#4fa39b'}"/><text x="${Math.min(x+w+15,2260)}" y="${y+31}" fill="#fff" font-family="Arial" font-size="20">${Number(v.toFixed(2))} ${game?'u': 'm'}</text>`}).join('')}
  <text x="90" y="2050" fill="#81938f" font-family="Arial" font-size="18">Source values: docs/research/triassic-swimming.json · representative values, not maxima</text></svg>`;
}
for (const [id,mode] of [['representative-lengths','true'],['game-lengths','game']]) {
  const svg=scaleSvg(mode); await writeFile(path.join(SCALE_DIR,`${id}.svg`),svg); await sharp(Buffer.from(svg),{density:144}).resize(2400,2100).png().toFile(path.join(SCALE_DIR,`${id}.png`));
}

console.log(`Wrote ${roster.length} markdown boards, ${regions.length} regional SVG/PNG pairs and 2 scale SVG/PNG pairs.`);
