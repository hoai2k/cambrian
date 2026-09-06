// Drive the built game through the biomes and report streaming/render stats. Usage: node biomes.mjs <outdir>
import { chromium } from 'playwright-core';
const S = process.argv[2] ?? '/tmp/shots';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(`[${m.type()}] ${m.text().slice(0, 300)}`); });
page.on('pageerror', (e) => errors.push('[pageerror] ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 4).join('\n')));
await page.addInitScript(() => localStorage.setItem('cambrian-settings', JSON.stringify({ quality: 'low', lookSpeed: 1, invertY: false, volume: 0.8, muted: true })));
const shot = (name) => page.screenshot({ path: `${S}/${name}.png`, timeout: 120000 });
await page.goto('http://localhost:4173/', { waitUntil: 'load' });
await page.waitForTimeout(9000);
await shot('title');
await page.keyboard.press('Enter'); await page.waitForTimeout(1200);
await page.keyboard.press('Space'); await page.waitForTimeout(400);
await page.keyboard.press('Enter'); await page.waitForTimeout(4000);
const stats = () => page.evaluate(() => { const e = window.__cambrian; const p = e.game.players[0]; return { ...e.stats(), pos: [Math.round(p.pos.x), Math.round(p.pos.y), Math.round(p.pos.z)], biome: document.querySelector('.radar')?.getAttribute('aria-label') }; });
await page.keyboard.down('KeyW'); await page.waitForTimeout(2000); await page.keyboard.up('KeyW');
console.log('start', JSON.stringify(await stats()));
await shot('nursery');
// teleport menu (hold the key across a frame: headless frames are slow)
await page.keyboard.down('KeyT'); await page.waitForTimeout(250); await page.keyboard.up('KeyT'); await page.waitForTimeout(600); await shot('tele-menu');
console.log('tele:', await page.evaluate(() => document.querySelector('.tele-menu')?.textContent));
await page.keyboard.down('Backspace'); await page.waitForTimeout(250); await page.keyboard.up('Backspace'); await page.waitForTimeout(300);
// jump the creature to points at increasing distance from the shore
// spots are [name, x, distance from shore, yaw]; yaw 0 faces the shore
const spots = [['shore', 0, 30, 0], ['shallows', 40, 60, Math.PI], ['shelf', -120, 250, Math.PI], ['forest', 250, 500, Math.PI], ['channel', 100, 600, Math.PI], ['escarpment', 60, 720, Math.PI], ['basin', 30, 1000, Math.PI], ['deep', 0, 1700, Math.PI]];
for (const [name, x, s, yaw] of spots) {
  await page.evaluate(([x, s, yaw]) => { const g = window.__cambrian.game; const p = g.players[0]; const z = g.world.constructor.length === -1 ? 0 : (window.__shoreZ ??= (xx) => g.radarFor(0, 1).find((b) => b.kind === 'shore').dz + g.players[0].pos.z)(x); void z; }, [x, s, yaw]);
  await page.evaluate(([x, s, yaw]) => { const g = window.__cambrian.game; const p = g.players[0]; p.pos = { x, y: 0, z: 0 }; const shore = g.radarFor(0, 1).find((b) => b.kind === 'shore'); const z = shore.dz - s; g.world.loadAround({ x, y: 0, z }); p.pos = { x, y: 6, z }; p.vel = { x: 0, y: 0, z: 0 }; p.yaw = yaw; }, [x, s, yaw]);
  await page.waitForTimeout(5000);
  await page.keyboard.down('KeyW'); await page.waitForTimeout(1500); await page.keyboard.up('KeyW');
  console.log(name, JSON.stringify(await stats()));
  await shot(`biome-${name}`);
}
// two players, high detail, far apart: the streaming and render budget under the worst case
await page.evaluate(() => localStorage.setItem('cambrian-settings', JSON.stringify({ quality: 'high', lookSpeed: 1, invertY: false, volume: 0.8, muted: true })));
await page.reload({ waitUntil: 'load' }); await page.waitForTimeout(9000);
await page.keyboard.press('Enter'); await page.waitForTimeout(1200);
await page.keyboard.press('Space'); await page.waitForTimeout(300);
await page.keyboard.press('KeyI'); await page.waitForTimeout(600);       // second keyboard joins
await page.keyboard.press('Enter'); await page.waitForTimeout(500);
await page.keyboard.press('Enter'); await page.waitForTimeout(5000);
console.log('two players:', await page.evaluate(() => window.__cambrian.game.players.length));
await page.evaluate(() => { const g = window.__cambrian.game; const b = g.players[1]; if (b) { const shore = g.radarFor(1, 1).find((x) => x.kind === 'shore'); b.pos = { x: 300, y: 6, z: b.pos.z + shore.dz - 900 }; b.vel = { x: 0, y: 0, z: 0 }; g.world.loadAround(b.pos); } });
await page.waitForTimeout(8000);
await page.keyboard.down('KeyW'); await page.keyboard.down('KeyI'); await page.waitForTimeout(2000); await page.keyboard.up('KeyW'); await page.keyboard.up('KeyI');
console.log('split far apart', JSON.stringify(await stats()));
await shot('split-far');
console.log('errors:', errors.length); for (const e of [...new Set(errors)].slice(0, 20)) console.log(e);
await browser.close();
