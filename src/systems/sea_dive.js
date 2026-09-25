// sea_dive.js — the Sea of Origins: reef diving (oxygen, pearls, shells, sea crystals), one shark patrolling the deep,
// and fishing from the raft (schools, hot spots, the same tug-of-war as the pond). See systems/API.md.
import { mkCanvas, HOOK } from '../gfx.js';
import { canCarry, carryDeny, registerHead } from './animals.js';

// ---------------------------------------------------------------- strings
const STR = {
  en: {
    dive: 'Dive', surface: 'Surface', air: 'Air', pearls: 'pearls',
    needRod: 'Need a fishing rod — buy it at the village trader (🪨 stones)', cast: 'Cast the line',
    full: 'Hands full — sell at the trader',
    got: n => `+ ${n}`, outOfAir: n => n ? `Out of air! Dropped ${n}` : 'Out of air!',
    shark: '🦈 Shark!', sharkHit: n => n ? `The shark got you — lost ${n}, raft −1` : 'The shark got you — raft −1',
    waiting: 'Waiting for a bite…', castHint: 'Esc · reel in', biteHint: 'E · hook it!', bite: '!',
    reelTitle: 'Reel it in!', reelBig: 'A big one — reel!', reelSquid: 'A squid — reel!', reelGold: 'Something glows — reel!',
    reelHint: 'E / Space / Enter · reel   ·   do not mash, the line snaps',
    tension: 'Line tension', gotAway: 'It got away', snapped: 'Line snapped!', ok: 'CAUGHT!', bad: 'MISSED',
    gotFish: 'Caught a fish! 🐟', gotBig: 'A big one! 🐟', gotSquid: 'A squid! 🦑', gotGold: 'A golden fish! 🐠 (rare)'
  },
  vi: {
    dive: 'Lặn', surface: 'Ngoi lên', air: 'Dưỡng khí', pearls: 'ngọc trai',
    needRod: 'Cần cần câu — mua ở Thương nhân Làng (trả bằng 🪨 đá)', cast: 'Thả câu',
    full: 'Đầy tay rồi — đem bán ở Thương nhân',
    got: n => `+ ${n}`, outOfAir: n => n ? `Hết hơi! Rơi mất ${n}` : 'Hết hơi!',
    shark: '🦈 Cá mập!', sharkHit: n => n ? `Cá mập đớp — mất ${n}, bè −1` : 'Cá mập đớp — bè −1',
    waiting: 'Đợi cá cắn câu…', castHint: 'Esc · thu cần', biteHint: 'E · giật cần!', bite: '!',
    reelTitle: 'Thu cần!', reelBig: 'Cá to — thu mạnh!', reelSquid: 'Mực — thu cần!', reelGold: 'Có gì phát sáng — thu cần!',
    reelHint: 'E / Space / Enter · thu   ·   đừng bấm loạn, đứt cước',
    tension: 'Độ căng cước', gotAway: 'Hụt rồi', snapped: 'Đứt cước!', ok: 'ĐƯỢC RỒI!', bad: 'HỤT',
    gotFish: 'Câu được cá! 🐟', gotBig: 'Cá to! 🐟', gotSquid: 'Câu được mực! 🦑', gotGold: 'Cá vàng! 🐠 (hiếm)'
  }
};
const L = ctx => STR[ctx.lang() === 'vi' ? 'vi' : 'en'];

// ---------------------------------------------------------------- sprites (built once)
const px = (g, x, y, c, w = 1, h = 1) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
const OUT = '#1c1a24', TAU = Math.PI * 2, TILE = 16;
function flip(src) { const c = mkCanvas(src.width, src.height), g = c.getContext('2d'); g.translate(src.width, 0); g.scale(-1, 1); g.drawImage(src, 0, 0); return c; }
function one(w, h, fn) { const c = mkCanvas(w, h); fn(c.getContext('2d')); return c; }
function two(w, h, fn) { return [0, 1].map(f => { const c = mkCanvas(w, h); fn(c.getContext('2d'), f); return [c, flip(c)]; }); }

const ART = {
  shell: HOOK.image('dive_shell', one(10, 8, g => { px(g, 1, 2, OUT, 8, 6); px(g, 2, 3, '#f4c6c0', 6, 4); px(g, 4, 3, '#e29aa0', 1, 4); px(g, 6, 3, '#e29aa0', 1, 3); px(g, 2, 6, '#c47a86', 6, 1); px(g, 3, 1, OUT, 4, 1); px(g, 3, 2, '#fff1ee', 2, 1); })),
  pearl: HOOK.image('dive_pearl', one(8, 8, g => { px(g, 2, 1, OUT, 4, 6); px(g, 1, 2, OUT, 6, 4); px(g, 2, 2, '#e9e4ff', 4, 4); px(g, 3, 1, '#e9e4ff', 2, 1); px(g, 3, 6, '#c9c0f0', 2, 1); px(g, 2, 4, '#c9c0f0', 1, 2); px(g, 3, 2, '#ffffff', 2, 1); px(g, 3, 3, '#ffffff', 1, 1); })),
  seagem: HOOK.image('dive_seagem', one(8, 10, g => { px(g, 3, 0, OUT, 2, 1); px(g, 2, 1, OUT, 4, 1); px(g, 1, 2, OUT, 6, 4); px(g, 2, 6, OUT, 4, 2); px(g, 3, 8, OUT, 2, 1); px(g, 3, 1, '#8fe3ff', 2, 1); px(g, 2, 2, '#5cc9ee', 4, 4); px(g, 3, 6, '#3aa8d8', 2, 2); px(g, 3, 2, '#ffffff', 1, 2); px(g, 4, 3, '#c9f3ff', 1, 1); })),
  stone: HOOK.image('dive_stone', one(10, 8, g => { px(g, 1, 2, OUT, 8, 5); px(g, 2, 1, OUT, 6, 1); px(g, 2, 2, '#b9b9c2', 6, 4); px(g, 3, 2, '#d6d6de', 3, 1); px(g, 2, 5, '#8d8d98', 6, 1); })),
  sparkle: one(5, 5, g => { px(g, 2, 0, '#ffffff', 1, 5); px(g, 0, 2, '#ffffff', 5, 1); px(g, 1, 1, '#dff6ff', 1, 1); px(g, 3, 3, '#dff6ff', 1, 1); }),
  // the shark: fin on the surface + a long shadow under it
  fin: HOOK.creature('shark_fin', two(14, 9, (g, f) => { const D = '#3a4453', Lt = '#5b6878'; for (let y = 0; y < 8; y++) { const w = 2 + y; px(g, 7 - (y >> 1), y, y === 0 ? OUT : D, w, 1); } px(g, 6, 2, Lt, 1, 4); px(g, 1, 8, OUT, 12, 1); px(g, 2 + f, 7, 'rgba(230,248,255,.7)', 4, 1); px(g, 9 - f, 7, 'rgba(230,248,255,.7)', 3, 1); })),
  fishSh: two(12, 6, (g, f) => { const D = 'rgba(10,38,68,.6)', H = 'rgba(190,228,255,.45)'; px(g, 0, 1 + f, D, 2, 2); px(g, 0, 3 - f, D, 2, 2); px(g, 2, 2, D, 2, 2); px(g, 3, 1, D, 7, 4); px(g, 10, 2, D, 2, 2); px(g, 5, 1, H, 3, 1); })
};
// what rides on your head after a catch
function heldFishArt(big) {
  const W2 = big ? 18 : 14, H2 = big ? 11 : 9, bx0 = big ? 6 : 5;
  return (g, f) => {
    const B = big ? '#4a8fd0' : '#6fb2e0', BL = big ? '#8fc8ef' : '#a8d8f5', D = big ? '#2c5f95' : '#3d7fd6', O2 = '#123049';
    const cx = (bx0 + W2 - 1) / 2, cy = (H2 - 1) / 2, rx = (W2 - bx0) / 2 + 0.4, ry = H2 / 2 - (big ? 1.4 : 1.1);
    for (let y = 0; y < H2; y++) for (let x = bx0; x < W2; x++) { const k = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2; if (k > 1) continue; px(g, x, y, k > 0.68 ? O2 : y < cy ? B : BL); }
    const tc = cy + (f ? 0.6 : -0.6);
    for (let x = 0; x < bx0; x++) { const hh = 0.5 + (bx0 - x) * 0.85; for (let y = 0; y < H2; y++) { const d = Math.abs(y - tc); if (d <= hh) px(g, x, y, d > hh - 1 || x === 0 ? O2 : D); } }
    px(g, ((cx - 1) | 0), 0, O2, 3, 1); px(g, ((cx - 1) | 0), 1, D, 3, 1); px(g, ((cx - 1) | 0), H2 - 1, D, 3, 1);
    px(g, W2 - 4, ((cy - 1) | 0), '#ffffff', 2, 2); px(g, W2 - 3, ((cy - 1) | 0), O2, 1, 1); px(g, W2 - 1, (cy | 0) + (f ? 1 : 0), O2, 1, 1);
  };
}
function squidArt(g, f) {
  const P = '#e58fb5', PL = '#f6c1d6', PD = '#b8607f';
  px(g, 3, 0, OUT, 6, 8); px(g, 4, 1, P, 4, 6); px(g, 4, 1, PL, 2, 2); px(g, 2, 3, OUT, 8, 3); px(g, 3, 4, P, 6, 1);   // mantle + side fins
  px(g, 4, 5, '#ffffff', 1, 1); px(g, 7, 5, '#ffffff', 1, 1); px(g, 4, 5, OUT, 1, 1); px(g, 7, 5, OUT, 1, 1);         // eyes
  for (let i = 0; i < 5; i++) { const x = 2 + i * 2, wig = ((i + f) % 2); px(g, x, 8, PD, 1, 4 + wig); px(g, x, 12 + wig, OUT, 1, 1); }  // tentacles
}
function goldfishArt(g, f) {
  const G = '#ffb63a', GL = '#ffe08a', GD = '#e07a1c';
  px(g, 3, 1, OUT, 9, 7); px(g, 4, 2, G, 7, 5); px(g, 4, 2, GL, 5, 2); px(g, 5, 6, GD, 5, 1);                       // body
  px(g, 0, 1 + f, OUT, 4, 3); px(g, 1, 2 + f, GD, 2, 1); px(g, 0, 5 - f, OUT, 4, 3); px(g, 1, 5 - f, GD, 2, 1);      // fan tail (flicks)
  px(g, 6, 0, GD, 3, 1); px(g, 9, 3, '#ffffff', 2, 2); px(g, 10, 3, OUT, 1, 1); px(g, 11, 5, OUT, 1, 1);             // fin, eye, mouth
}
const HELD = { fish: two(14, 9, heldFishArt(false)), fishBig: two(18, 11, heldFishArt(true)), squid: two(12, 14, squidArt), goldfish: two(13, 9, goldfishArt) };
const heldOf = it => { const k = typeof it === 'string' ? it : (it && it.kind); return k === 'fish' ? HELD[it && it.big ? 'fishBig' : 'fish'] : HELD[k] || null; };
for (const [k, v] of Object.entries(HELD)) registerHead(k, v);   /* plan-9: animals.js vẽ tập trung (ghi đè cá của animals bằng bản biển) */

// ---------------------------------------------------------------- state
const O2_MAX = 12, RESPAWN = 90, BASE = 0.15, MAX_CARRY = 3;
let patches = [], items = [], shark = null, schools = [], deepTiles = [];
let dive = null, fishing = null, fx = [], splashT = 0, testSea = false, now = 0;

const tileOf = v => Math.floor(v / TILE);
const tileAt = (ctx, x, y) => ctx.getG(ctx.S.map, tileOf(x), tileOf(y));
const isWaterT = (ctx, tx, ty) => { const g = ctx.getG(ctx.S.map, tx, ty), T = ctx.T; return g === T.WATER || g === T.DEEP || g === T.REEF; };
const isSwimT = (ctx, tx, ty) => { const g = ctx.getG(ctx.S.map, tx, ty), T = ctx.T; return g === T.WATER || g === T.REEF; };
const hasRod = ctx => ctx.tool.tier('rod') > 0;
const seaOK = ctx => !!(ctx.S.map && ctx.S.map.sea && ctx.S.sea);
const onRaft = ctx => seaOK(ctx) && ctx.S.sea.riding === 'raft' && !ctx.S.sea.diving;

// ---------------------------------------------------------------- carry stack (shared with animals.js via ctx.carry)
function carryArr(ctx) { const sv = ctx.S.save; sv.sys = sv.sys || {}; return ctx.carry.get(); }
function syncCarryInv(ctx) {
  const c = carryArr(ctx), inv = (ctx.S.save.inv = ctx.S.save.inv || {});
  for (const k of Object.keys(ctx.ITEMS)) if (ctx.ITEMS[k].tags.includes('carry')) inv[k] = c.filter(x => (typeof x === 'string' ? x : x.kind) === k).length;
}
function addCarry(ctx, it) { const c = carryArr(ctx); if (!canCarry(ctx, typeof it === 'string' ? it : it.kind)) return false; c.push(it); syncCarryInv(ctx); ctx.persist(); return true; }
const carryFull = (ctx, kind = 'fish') => !canCarry(ctx, kind);   /* plan-9: theo loại + đồ đựng */

// ---------------------------------------------------------------- particles
function ring(x, y, s = 1) { fx.push({ k: 'ring', x, y, t: 0.55 * s, life: 0.55 * s, r0: 2 * s, r1: 11 * s }); }
function splash(x, y, s = 1) {
  ring(x, y, s); fx.push({ k: 'ring', x, y, t: 0.8, life: 0.8, r0: 4 * s, r1: 17 * s });
  for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.2; fx.push({ k: 'drop', x, y, vx: Math.cos(a) * (16 + Math.random() * 22) * s, vy: Math.sin(a) * (26 + Math.random() * 26) * s, gy: 120, t: 0.5, life: 0.5, r: 1 + Math.random() }); }
}
function bubble(x, y) { fx.push({ k: 'bub', x, y, vx: (Math.random() - 0.5) * 6, vy: -14 - Math.random() * 10, gy: 0, t: 0.9 + Math.random() * 0.5, life: 1.4, r: 1 + Math.random() * 1.5 }); }
function updateFx(dt) {
  for (let i = fx.length - 1; i >= 0; i--) {
    const p = fx[i]; p.t -= dt;
    if (p.t <= 0) { fx.splice(i, 1); continue; }
    if (p.vx !== undefined) { p.x += p.vx * dt; p.y += p.vy * dt; if (p.gy) p.vy += p.gy * dt; }
  }
  if (fx.length > 140) fx.splice(0, fx.length - 140);
}
function drawFx(g, cx, cy) {
  for (const p of fx) {
    const k = Math.max(0, p.t / p.life), x = Math.round(p.x) - cx, y = Math.round(p.y) - cy;
    if (p.k === 'ring') { g.globalAlpha = k * 0.75; g.strokeStyle = '#dff0ff'; g.lineWidth = 1; g.beginPath(); const r = p.r0 + (p.r1 - p.r0) * (1 - k); g.ellipse(x, y, r, r * 0.45, 0, 0, TAU); g.stroke(); }
    else if (p.k === 'drop') { g.globalAlpha = k; g.fillStyle = 'rgba(214,240,255,.9)'; g.fillRect(x, y, 1 + (p.r | 0), 1 + (p.r | 0)); }
    else if (p.k === 'bub') { g.globalAlpha = Math.min(1, k * 1.5) * 0.8; g.strokeStyle = '#e8fbff'; g.lineWidth = 1; g.beginPath(); g.arc(x, y, p.r, 0, TAU); g.stroke(); }
  }
  g.globalAlpha = 1;
}

// ---------------------------------------------------------------- reef patches + collectibles
function buildPatches(ctx) {
  patches = []; items = [];
  const m = ctx.S.map, W = m.w, H = m.h, T = ctx.T, seen = new Uint8Array(W * H);
  const rng = ctx.rngFrom(ctx.hashStr('seadive:' + Math.floor(Date.now() / 86400000)) ^ 0x5ea);
  for (let ty = 1; ty < H - 1; ty++) for (let tx = 1; tx < W - 1; tx++) {
    const i = ty * W + tx; if (seen[i] || ctx.getG(m, tx, ty) !== T.REEF) continue;
    const tiles = [], q = [i]; seen[i] = 1;
    while (q.length) {
      const c = q.pop(), x = c % W, y = (c / W) | 0; tiles.push({ x, y });
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const nx = x + dx, ny = y + dy; if ((!dx && !dy) || nx < 0 || ny < 0 || nx >= W || ny >= H) continue; const j = ny * W + nx; if (seen[j] || ctx.getG(m, nx, ny) !== T.REEF) continue; seen[j] = 1; q.push(j); }
    }
    if (tiles.length < 4) continue;
    const p = { id: patches.length, cx: 0, cy: 0, tiles, items: [] };
    for (const t of tiles) { p.cx += t.x; p.cy += t.y; } p.cx = Math.round(p.cx / tiles.length); p.cy = Math.round(p.cy / tiles.length);
    patches.push(p);
    // the 5 open reefs hide 3–6 things; the thin rings hugging an islet (sand next to them) only 1–2
    const ring = tiles.some(t => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => ctx.getG(m, t.x + dx, t.y + dy) === T.SAND));
    const n = ring ? 1 + ((rng() * 2) | 0) : 3 + ((rng() * 4) | 0), used = new Set();
    for (let k = 0, guard = 0; k < n && guard < 40; guard++) {
      const t = tiles[(rng() * tiles.length) | 0], key = t.x + ',' + t.y; if (used.has(key)) continue; used.add(key);
      const r = rng(); const id = r < 0.15 ? 'pearl' : r < 0.25 ? 'seagem' : r < 0.4 ? 'stone' : 'shell';
      const it = { id, n: id === 'stone' ? 2 : 1, tx: t.x, ty: t.y, x: t.x * TILE + 8, y: t.y * TILE + 10, taken: false, rt: 0, patch: p.id, ph: rng() * TAU };
      items.push(it); p.items.push(it); k++;
    }
  }
}
function pickUp(ctx, it) {
  const S = L(ctx);
  const got = ctx.bag.add(it.id, it.n);
  if (got <= 0) return;                                         // bag full: leave it on the sea floor
  it.taken = true; it.rt = RESPAWN;
  ctx.sfx(it.id === 'pearl' || it.id === 'seagem' ? 'coin' : 'pickup');
  bubble(it.x, it.y - 4); bubble(it.x + 3, it.y - 2);
  ctx.toast(S.got(`${ctx.itemIcon(it.id)} ${ctx.itemName(it.id)}${it.n > 1 ? ' ×' + it.n : ''}`));
}
function dropSeaItem(ctx) {
  const have = ['pearl', 'shell', 'seagem'].filter(id => ctx.bag.count(id) > 0);
  if (!have.length) return null;
  const id = have[(Math.random() * have.length) | 0]; ctx.bag.remove(id, 1);
  return `${ctx.itemIcon(id)} ${ctx.itemName(id)}`;
}

// ---------------------------------------------------------------- diving
function divePass(ctx) { return (m, tx, ty) => { const g = ctx.getG(m, tx, ty); return g === ctx.T.WATER || g === ctx.T.REEF; }; }
function restorePlayer(p) { p.speedMul = 1; p.passable = null; p.custom = null; p.ghost = false; p.boxW = 10; p.boxH = 6; }
function drawSwimmer(g, ent) {
  const x = Math.round(ent.x), y = Math.round(ent.y), bob = Math.round(Math.sin(now * 3.5) * 1), st = ((now * 5) | 0) % 2;
  g.fillStyle = 'rgba(0,0,0,.18)'; g.beginPath(); g.ellipse(x, y + 1, 8, 3, 0, 0, TAU); g.fill();               // shadow on the sea floor
  g.fillStyle = '#2f3b5e'; g.fillRect(x - 3, y - 6 + bob, 6, 6);                                                  // trunks
  g.fillStyle = '#2b2733'; g.fillRect(x - 3 + (st ? 0 : 1), y - 1 + bob, 2, 3); g.fillRect(x + 1 + (st ? 1 : 0), y - 1 + bob, 2, 3); // kicking legs
  g.drawImage(ent.sheet, ent.frame * 16, ent.dir * 20, 16, 12, x - 8, y - 16 + bob, 16, 12);                     // head + shoulders from the player's own sheet
  g.fillStyle = '#e8b892'; g.fillRect(x - 9, y - 6 + bob + (st ? 0 : 2), 3, 2); g.fillRect(x + 6, y - 6 + bob + (st ? 2 : 0), 3, 2);  // arms stroking
  g.strokeStyle = 'rgba(225,248,255,.55)'; g.lineWidth = 1; g.beginPath(); g.ellipse(x, y - 8 + bob, 10, 3, 0, 0, TAU); g.stroke();   // water line
}
function startDive(ctx) {
  const p = ctx.S.player, sea = ctx.S.sea;
  sea.diving = true; sea.riding = null; sea.x = p.x; sea.y = p.y;
  p.passable = divePass(ctx); p.speedMul = 0.7; p.custom = drawSwimmer; p.ghost = true;
  dive = { t: O2_MAX, bubT: 0, x0: p.x, y0: p.y };
  splash(p.x, p.y - 4, 1.2); ctx.sfx('splash');
}
function surface(ctx, why) {
  if (!dive) return;
  const S = L(ctx), p = ctx.S.player, sea = ctx.S.sea;
  restorePlayer(p);
  sea.diving = false; sea.riding = 'raft';
  dive = null;
  splash(p.x, p.y - 4, 1.0); ctx.sfx('splash');
  if (why === 'air') { const lost = dropSeaItem(ctx); ctx.toast(S.outOfAir(lost)); ctx.sfx('fail'); }
  else if (why === 'shark') {
    const lost = dropSeaItem(ctx);
    if (sea.raft) sea.raft.hp = Math.max(0, (sea.raft.hp || 0) - 1);
    ctx.sfx('roar'); ctx.alert(S.shark, 3, 1); ctx.toast(S.sharkHit(lost));
  }
  if (shark && shark.st === 'hunt') { shark.st = 'flee'; shark.t = 5; sharkGoal(ctx, true); }
  ctx.persist();
}
function updateDive(dt, ctx) {
  const p = ctx.S.player;
  dive.t -= dt; dive.bubT -= dt;
  if (dive.bubT <= 0) { dive.bubT = 0.25 + Math.random() * 0.3; bubble(p.x + (Math.random() - 0.5) * 6, p.y - 10); }
  for (const it of items) { if (it.taken) continue; if (Math.hypot(it.x - p.x, it.y - (p.y - 2)) < 12) pickUp(ctx, it); }
  if (dive.t <= 0) surface(ctx, 'air');
}

// ---------------------------------------------------------------- the shark
function sharkGoal(ctx, far = false) {
  if (!deepTiles.length) return;
  const sx = tileOf(shark.x), sy = tileOf(shark.y);
  let pool = deepTiles.filter(t => { const d = Math.hypot(t.x - sx, t.y - sy); return far ? d > 4 : d < 12; });
  if (!pool.length) pool = deepTiles;
  const t = pool[(Math.random() * pool.length) | 0];
  shark.gx = t.x * TILE + 8; shark.gy = t.y * TILE + 8; shark.t = 4 + Math.random() * 6;
}
function spawnShark(ctx) {
  const m = ctx.S.map, T = ctx.T; deepTiles = [];
  for (let ty = 1; ty < m.h - 1; ty++) for (let tx = 1; tx < m.w - 1; tx++) if (ctx.getG(m, tx, ty) === T.DEEP) deepTiles.push({ x: tx, y: ty });
  if (!deepTiles.length) { shark = null; return; }
  const p = ctx.S.player;
  const farPool = deepTiles.filter(t => Math.hypot(t.x * TILE - p.x, t.y * TILE - p.y) > 15 * TILE);
  const t = (farPool.length ? farPool : deepTiles)[(Math.random() * (farPool.length ? farPool : deepTiles).length) | 0];
  shark = { x: t.x * TILE + 8, y: t.y * TILE + 8, dir: 1, st: 'patrol', t: 0, gx: 0, gy: 0, ang: 0 };
  sharkGoal(ctx);
}
function updateShark(dt, ctx) {
  const s = shark, p = ctx.S.player, T = ctx.T;
  const dp = Math.hypot(p.x - s.x, p.y - s.y);
  if (s.st === 'patrol' && dive && dp < 5 * TILE) { s.st = 'hunt'; }
  if (s.st === 'hunt' && !dive) { s.st = 'patrol'; sharkGoal(ctx); }
  let tx, ty, sp;
  if (s.st === 'hunt') { tx = p.x; ty = p.y - 2; sp = 1.4 * TILE; }
  else { tx = s.gx; ty = s.gy; sp = (s.st === 'flee' ? 1.6 : 0.9) * TILE; s.t -= dt; }
  const dx = tx - s.x, dy = ty - s.y, d = Math.hypot(dx, dy);
  if (s.st !== 'hunt' && (d < 6 || s.t <= 0)) { if (s.st === 'flee' && s.t > 0) { /* wait out the flee timer at the goal */ } else { s.st = 'patrol'; sharkGoal(ctx); } }
  else if (d > 0.5) {
    s.ang = Math.atan2(dy, dx);
    const nx = s.x + Math.cos(s.ang) * sp * dt, ny = s.y + Math.sin(s.ang) * sp * dt;
    const g = ctx.getG(ctx.S.map, tileOf(nx), tileOf(ny));
    const okTile = s.st === 'patrol' ? g === T.DEEP : (g === T.DEEP || g === T.WATER || g === T.REEF);
    if (okTile) { s.x = nx; s.y = ny; } else if (s.st !== 'hunt') sharkGoal(ctx); else { s.x += Math.cos(s.ang) * sp * dt * 0.3; }
    s.dir = Math.cos(s.ang) >= 0 ? 1 : -1;
  }
  if (s.st === 'hunt' && dp < 11) surface(ctx, 'shark');
  if (Math.random() < dt * 1.5) ring(s.x - s.dir * 6, s.y + 2, 0.5);                            // wake
}

// ---------------------------------------------------------------- schools of fish (shadows under the water)
function buildSchools(ctx) {
  schools = [];
  const m = ctx.S.map, T = ctx.T, water = [];
  for (let ty = 2; ty < m.h - 8; ty++) for (let tx = 2; tx < m.w - 2; tx++) { const g = ctx.getG(m, tx, ty); if (g === T.WATER || g === T.DEEP) water.push({ x: tx, y: ty }); }
  if (!water.length) return;
  const rng = ctx.rngFrom((ctx.hashStr('seaschool') + Math.floor(Date.now() / 86400000) * 7919) >>> 0);
  for (let i = 0; i < 8; i++) {
    const hot = i < 2, t = water[(rng() * water.length) | 0], n = hot ? 9 : 4, r = hot ? 26 : 15;
    const a = rng() * TAU, sp = 4 + rng() * 5;
    const sc = { x: t.x * TILE + 8, y: t.y * TILE + 8, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r, hot, t: 3 + rng() * 4, fish: [] };
    for (let k = 0; k < n; k++) sc.fish.push({ ox: (rng() - 0.5) * r * 1.6, oy: (rng() - 0.5) * r * 1.2, ph: rng() * TAU, dir: sc.vx >= 0 ? 1 : -1 });
    schools.push(sc);
  }
}
function updateSchools(dt, ctx) {
  const T = ctx.T;
  for (const s of schools) {
    s.t -= dt;
    if (s.t <= 0) { const a = Math.random() * TAU, sp = 4 + Math.random() * 5; s.vx = Math.cos(a) * sp; s.vy = Math.sin(a) * sp; s.t = 3 + Math.random() * 4; }
    const nx = s.x + s.vx * dt, ny = s.y + s.vy * dt;
    const ok = (x, y) => { const g = tileAt(ctx, x, y); return g === T.WATER || g === T.DEEP; };
    if (ok(nx, s.y)) s.x = nx; else s.vx = -s.vx;
    if (ok(s.x, ny)) s.y = ny; else s.vy = -s.vy;
    for (const f of s.fish) f.dir = s.vx >= 0 ? 1 : -1;
  }
}
function densityAt(tx, ty) {
  let d = BASE;
  for (const s of schools) { const k = 1 - Math.hypot(tx - s.x / TILE, ty - s.y / TILE) / (s.r / TILE + 2); if (k > 0) d = Math.max(d, BASE + (1 - BASE) * k * (s.hot ? 1 : 0.6)); }
  return d;
}
function hotSplashes(dt, ctx) {
  splashT -= dt; if (splashT > 0) return;
  splashT = 0.5 + Math.random() * 0.9;
  const hot = schools.filter(s => s.hot); if (!hot.length) return;
  const s = hot[(Math.random() * hot.length) | 0], p = ctx.S.player;
  const x = s.x + (Math.random() - 0.5) * s.r, y = s.y + (Math.random() - 0.5) * s.r * 0.7;
  if (Math.hypot(x - p.x, y - p.y) > 320 || !isWaterT(ctx, tileOf(x), tileOf(y))) return;
  splash(x, y, 0.6 + Math.random() * 0.5);
}

// ---------------------------------------------------------------- fishing from the raft
const DIRV = [[0, 1], [-1, 0], [1, 0], [0, -1]];
function castTarget(ctx) {
  const p = ctx.S.player, ptx = tileOf(p.x), pty = tileOf(p.y);
  if (!isWaterT(ctx, ptx, pty)) return null;
  const [dx, dy] = DIRV[p.dir & 3];
  let bx = ptx + dx, by = pty + dy;
  if (!isWaterT(ctx, bx, by)) return null;
  if (isWaterT(ctx, bx + dx, by + dy)) { bx += dx; by += dy; }
  return { bx, by, x: bx * TILE + 8, y: by * TILE + 8 };
}
function startCast(ctx, t) {
  const S = L(ctx);
  if (carryFull(ctx, 'fish')) { ctx.toast(carryDeny(ctx, 'fish')); return; }
  const d = densityAt(t.bx, t.by), luck = 0.7 + Math.random() * 0.6;
  const wait = Math.min(20, Math.max(2, (7 / d) * luck));
  fishing = { phase: 'wait', t: wait, wob: 0, bx: t.bx * TILE + 8, by: t.by * TILE + 9, dens: d, prog: 0, tens: 0, presses: [], pull: 0, kind: 'fish', big: false, yank: 0, life: 0 };
  splash(fishing.bx, fishing.by, 0.8); ctx.sfx('splash');
  { const pl = ctx.S.player; if (pl.act && pl.hasAct('fish') && !pl.custom) { pl.faceTo(fishing.bx, fishing.by); pl.act('fish', 1.0, true); } }
  ctx.setMode('seafish');
}
function startReel(ctx) {
  const f = fishing, d = f.dens, r = Math.random();
  if (r < 0.05) { f.kind = 'goldfish'; f.pull = 0.075 + Math.random() * 0.02; }
  else if (r < 0.2) { f.kind = 'squid'; f.pull = 0.06 + Math.random() * 0.02; }
  else { f.kind = 'fish'; f.big = Math.random() < 0.15 + d * 0.45; f.pull = f.big ? 0.085 + Math.random() * 0.025 : 0.05 + Math.random() * 0.03; }
  f.phase = 'reel'; f.prog = 0.28; f.tens = 0; f.presses = []; f.life = 30;
  splash(f.bx, f.by, 0.9);
}
function endFish(ctx) { fishing = null; if (ctx.S.player.endAct) ctx.S.player.endAct('fish'); if (ctx.S.mode === 'seafish') ctx.setMode('play'); }
function failFish(ctx, msg) {
  const S = L(ctx);
  if (fishing) splash(fishing.bx, fishing.by, 1.0);
  ctx.toast(msg || S.gotAway); ctx.sfx('fail');
  fishing = { ...fishing, phase: 'done', ok: false, t: 0.9, text: msg === S.snapped ? S.snapped : S.bad };
}
function succeedFish(ctx) {
  const S = L(ctx), f = fishing;
  splash(f.bx, f.by, 1.4);
  const item = f.kind === 'fish' ? { kind: 'fish', big: !!f.big } : f.kind;
  const ok = addCarry(ctx, item);
  if (ok && ctx.pop) ctx.pop(ctx.S.player.x, ctx.S.player.y - 18, '+1 ' + ctx.itemIcon(f.kind === 'fish' ? 'fish' : f.kind));
  ctx.toast(!ok ? carryDeny(ctx, f.kind) : f.kind === 'goldfish' ? S.gotGold : f.kind === 'squid' ? S.gotSquid : f.big ? S.gotBig : S.gotFish);
  ctx.sfx(f.kind === 'goldfish' ? 'win' : 'pickup');
  fishing = { ...fishing, phase: 'done', ok: true, t: 0.9, text: S.ok };
}
function fishAction(ctx) {                                        // E / Space / Enter / touch A while S.mode === 'seafish'
  if (!fishing) return;
  const S = L(ctx), f = fishing;
  if (f.phase === 'bite') { if (Math.random() < 0.12) { failFish(ctx, S.gotAway); return; } startReel(ctx); return; }
  if (f.phase === 'reel') {
    const last = f.presses.length ? f.presses[f.presses.length - 1] : -9, inst = 1 / Math.max(0.02, now - last);
    if (now - last < 1 && inst > 6) f.tens += (inst - 6) * 0.028;   // mashing puts the line under strain
    f.presses.push(now); f.yank = 0.16;
    if (f.tens >= 1) { failFish(ctx, S.snapped); return; }
    f.prog = Math.min(1, f.prog + 0.09);
    if (f.prog >= 1) succeedFish(ctx);
    return;
  }
  if (f.phase === 'done') endFish(ctx);
}
function updateFishing(dt, ctx) {
  const S = L(ctx), f = fishing;
  f.wob += dt * (f.phase === 'bite' ? 7 : 2);
  if (f.yank) f.yank = Math.max(0, f.yank - dt);
  if (f.phase === 'wait') { f.t -= dt; if (Math.random() < dt * 0.7) splash(f.bx + (Math.random() - 0.5) * 10, f.by + (Math.random() - 0.5) * 6, 0.35); if (f.t <= 0) { f.phase = 'bite'; f.t = 1.2; splash(f.bx, f.by, 0.6); ctx.sfx('splash'); } }
  else if (f.phase === 'bite') { f.t -= dt; if (f.t <= 0) failFish(ctx, S.gotAway); }
  else if (f.phase === 'reel') {
    f.presses = f.presses.filter(t => t > now - 1.5);
    const rate = f.presses.filter(t => t > now - 1).length;
    if (rate > 6) f.tens = Math.min(1, f.tens + (rate - 6) * 0.08 * dt); else f.tens = Math.max(0, f.tens - 0.5 * dt);
    if (f.tens >= 1) { failFish(ctx, S.snapped); return; }
    f.prog -= f.pull * (1 + 0.35 * Math.sin(now * 2.6)) * dt; f.life -= dt;
    if (f.prog <= 0 || f.life <= 0) { f.prog = 0; failFish(ctx, S.gotAway); }
  } else if (f.phase === 'done') { f.t -= dt; if (f.t <= 0) endFish(ctx); }
}

// ---------------------------------------------------------------- system
export const seaDive = {
  id: 'seaDive',

  onZoneEnter(ctx) {
    patches = []; items = []; shark = null; schools = []; deepTiles = []; dive = null; fishing = null; fx = []; splashT = 0.6; testSea = false;
    if (ctx.S.mode === 'seafish') ctx.setMode('play');
    ctx.onAction('seafish', () => fishAction(ctx));
    ctx.registerCloser('seafish', () => { fishing = null; ctx.setMode('play'); });
    if (!ctx.S.map.sea) return;
    buildPatches(ctx); spawnShark(ctx); buildSchools(ctx);
    if (typeof window !== 'undefined') window.__dive = {
      spots: () => patches.map(p => ({ id: p.id, cx: p.cx, cy: p.cy, tiles: p.tiles.length, items: p.items.map(i => ({ id: i.id, tx: i.tx, ty: i.ty, taken: i.taken })) })),
      items: () => items.map(i => ({ id: i.id, n: i.n, tx: i.tx, ty: i.ty, taken: i.taken, rt: Math.round(i.rt) })),
      shark: () => shark && { tx: +(shark.x / TILE).toFixed(1), ty: +(shark.y / TILE).toFixed(1), st: shark.st, dir: shark.dir },
      warpShark: (tx, ty) => { if (!shark) return null; shark.x = tx * TILE + 8; shark.y = ty * TILE + 8; return window.__dive.shark(); },
      schools: () => schools.map(s => ({ tx: +(s.x / TILE).toFixed(1), ty: +(s.y / TILE).toFixed(1), hot: s.hot, n: s.fish.length })),
      dive: () => dive && { o2: +dive.t.toFixed(1) }, fishing: () => fishing && { phase: fishing.phase, kind: fishing.kind, big: fishing.big, prog: fishing.prog, tens: fishing.tens, t: fishing.t },
      density: (tx, ty) => densityAt(tx, ty)
    };
  },

  onZoneLeave(ctx) {
    if (dive) { restorePlayer(ctx.S.player); if (ctx.S.sea) { ctx.S.sea.diving = false; ctx.S.sea.riding = 'raft'; } dive = null; }
    if (fishing) { fishing = null; if (ctx.S.mode === 'seafish') ctx.setMode('play'); }
    if (testSea) { restorePlayer(ctx.S.player); testSea = false; }
    patches = []; items = []; shark = null; schools = []; deepTiles = []; fx = [];
  },

  update(dt, ctx) {
    now = ctx.S.time;
    if (!ctx.S.map || !ctx.S.map.sea) return;
    if (!ctx.S.sea) {
      if (typeof window === 'undefined' || !window.__diveTest) return;
      ctx.S.sea = { raft: { hp: 3, max: 6, sail: false }, riding: 'raft', diving: false, x: ctx.S.player.x, y: ctx.S.player.y }; testSea = true;
    }
    const p = ctx.S.player, T = ctx.T;
    if (testSea && !dive && ctx.S.sea.riding === 'raft') p.passable = (m, tx, ty) => [T.WATER, T.DEEP, T.REEF, T.SAND, T.DOCK].includes(ctx.getG(m, tx, ty));
    if (dive) updateDive(dt, ctx);
    if (shark) updateShark(dt, ctx);
    updateSchools(dt, ctx); hotSplashes(dt, ctx); updateFx(dt);
    for (const it of items) if (it.taken) { it.rt -= dt; if (it.rt <= 0) it.taken = false; }
    if (fishing) updateFishing(dt, ctx);
  },

  drawables(ctx, cx, cy) {
    if (!seaOK(ctx)) return [];
    const out = [], g = ctx.g, VW = ctx.VW, VH = ctx.VH;
    const onScreen = (x, y, m = 40) => x - cx > -m && y - cy > -m && x - cx < VW + m && y - cy < VH + m;
    // fish schools: shadows under the surface (drawn beneath everything)
    for (const s of schools) {
      if (!onScreen(s.x, s.y, 60)) continue;
      for (const f of s.fish) {
        const wx = s.x + f.ox + Math.sin(now * 1.3 + f.ph) * 3, wy = s.y + f.oy + Math.cos(now * 1.1 + f.ph) * 2;
        if (!isWaterT(ctx, tileOf(wx), tileOf(wy))) continue;
        const img = ART.fishSh[((now * 4 + f.ph) | 0) % 2][f.dir < 0 ? 1 : 0];
        out.push({ y: wy - 200, f: () => g.drawImage(img, Math.round(wx) - 6 - cx, Math.round(wy) - 3 - cy) });
      }
    }
    // reef collectibles: a sparkle from the surface, the real thing once you are under
    for (const it of items) {
      if (it.taken || !onScreen(it.x, it.y)) continue;
      const img = ART[it.id], x = Math.round(it.x) - cx, y = Math.round(it.y) - cy;
      if (dive) out.push({ y: it.y - 190, f: () => { g.drawImage(img, x - (img.width >> 1), y - img.height); if (it.id === 'pearl' || it.id === 'seagem') { g.globalAlpha = 0.5 + 0.5 * Math.sin(now * 4 + it.ph); g.drawImage(ART.sparkle, x + 2, y - img.height - 4); g.globalAlpha = 1; } } });
      else out.push({ y: it.y - 190, f: () => { const k = (Math.sin(now * 2.2 + it.ph) + 1) / 2; if (k < 0.35) return; g.globalAlpha = (k - 0.35) * 0.9; g.drawImage(ART.sparkle, x - 2, y - 6); g.globalAlpha = 1; } });
    }
    // the shark: shadow under the water + the fin on the surface
    if (shark && onScreen(shark.x, shark.y, 60)) {
      const sx = Math.round(shark.x) - cx, sy = Math.round(shark.y) - cy, fin = ART.fin[((now * 3) | 0) % 2][shark.dir < 0 ? 1 : 0];
      out.push({ y: shark.y - 180, f: () => { g.fillStyle = 'rgba(8,30,60,.45)'; g.beginPath(); g.ellipse(sx, sy + 2, 15, 4.5, 0, 0, TAU); g.fill(); g.fillStyle = 'rgba(8,30,60,.35)'; g.beginPath(); g.ellipse(sx - shark.dir * 15, sy + 2, 5, 3, 0, 0, TAU); g.fill(); } });
      out.push({ y: shark.y, f: () => g.drawImage(fin, sx - 7, sy - 8 + Math.round(Math.sin(now * 3) * 0.5)) });
    }
    /* plan-9: đồ mang theo do animals.js vẽ tập trung (sprite đã đăng ký qua registerHead) */
    return out;
  },

  draw(g, ctx, cx, cy) {
    if (!seaOK(ctx)) return;
    drawFx(g, cx, cy);
    if (dive) {                                                   // under water: blue-green wash + slow light rays
      const VW = ctx.VW, VH = ctx.VH;
      g.fillStyle = 'rgba(16,110,130,.30)'; g.fillRect(0, 0, VW, VH);
      g.fillStyle = 'rgba(200,255,255,.05)';
      for (let i = 0; i < 4; i++) { const x = ((now * 6 + i * 97) % (VW + 80)) - 40; g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 26, 0); g.lineTo(x - 10, VH); g.lineTo(x - 36, VH); g.closePath(); g.fill(); }
      const k = dive.t / O2_MAX; if (k < 0.25) { g.fillStyle = `rgba(20,20,60,${((0.25 - k) * 1.2).toFixed(2)})`; g.fillRect(0, 0, VW, VH); }   // the view dims as the air runs out
    }
    if (!fishing || fishing.phase === 'done') return;
    const x = Math.round(fishing.bx) - cx, y = Math.round(fishing.by) - cy;
    const pull = fishing.phase === 'reel' ? (fishing.yank ? -2 : 1) : 0;
    const bob = fishing.phase === 'bite' ? Math.round(Math.sin(fishing.wob) * 2) : Math.round(Math.sin(fishing.wob) * 1) + pull;
    g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 1; g.beginPath(); g.ellipse(x, y + 2, 6, 2.5, 0, 0, TAU); g.stroke();
    g.strokeStyle = 'rgba(255,255,255,.25)'; g.beginPath(); g.ellipse(x, y + 2, 10, 4, 0, 0, TAU); g.stroke();
    const p = ctx.S.player;
    g.strokeStyle = fishing.phase === 'reel' ? `rgba(255,${Math.round(240 - fishing.tens * 180)},${Math.round(255 - fishing.tens * 210)},.75)` : 'rgba(240,240,255,.45)';
    g.beginPath(); g.moveTo(Math.round(p.x) - cx + (p.dir === 1 ? -5 : 5), Math.round(p.y) - 13 - cy); g.lineTo(x, y + bob); g.stroke();
    g.fillStyle = '#1c1a24'; g.fillRect(x - 3, y - 4 + bob, 6, 7); g.fillStyle = '#e04b4b'; g.fillRect(x - 2, y - 3 + bob, 4, 3); g.fillStyle = '#ffffff'; g.fillRect(x - 2, y + bob, 4, 2);
  },

  drawUI(ug, ctx, cx, cy, scale) {
    if (!seaOK(ctx)) return;
    const S = L(ctx), W = ug.canvas.width, H = ug.canvas.height, fs = Math.max(12, scale * 4), small = `${Math.max(10, scale * 3)}px "Segoe UI",system-ui,sans-serif`;
    ug.save(); ug.textAlign = 'center'; ug.textBaseline = 'middle';
    if (dive) {                                                   // oxygen bar, top centre
      const bw = Math.min(W * 0.4, 320), bh = Math.max(10, scale * 3.2), bx = (W - bw) / 2, by = Math.max(54, scale * 18), k = Math.max(0, dive.t / O2_MAX);
      ug.fillStyle = 'rgba(13,11,20,.75)'; ug.beginPath(); ug.roundRect(bx - 10, by - fs * 1.4, bw + 20, bh + fs * 1.9, 8); ug.fill();
      ug.font = `bold ${fs * 0.9}px "Segoe UI",system-ui,sans-serif`; ug.fillStyle = '#dff6ff'; ug.fillText(`${S.air} · ${Math.ceil(dive.t)}s`, W / 2, by - fs * 0.6);
      ug.fillStyle = '#2b2440'; ug.beginPath(); ug.roundRect(bx, by, bw, bh, bh / 2); ug.fill();
      ug.fillStyle = k > 0.5 ? '#5cd6ff' : k > 0.25 ? '#ffb347' : '#ff4d4d'; ug.beginPath(); ug.roundRect(bx, by, Math.max(bh, bw * k), bh, bh / 2); ug.fill();
    }
    if (fishing) {
      const f = fishing;
      if (f.phase === 'wait' || f.phase === 'bite') {
        const bx = Math.round((f.bx - cx) * scale), by = Math.round((f.by - 22 - cy) * scale), bite = f.phase === 'bite';
        ug.font = `bold ${fs * (bite ? 2 : 1.3)}px "Segoe UI",system-ui,sans-serif`;
        ug.fillStyle = 'rgba(13,11,20,.65)'; ug.beginPath(); ug.arc(bx, by, fs * (bite ? 1.1 : 0.9), 0, TAU); ug.fill();
        ug.fillStyle = bite ? '#ffd45e' : '#cfd8e6'; ug.fillText(bite ? S.bite : '…', bx, by + 2);
      }
      const bw = Math.min(W * 0.62, 460), bh = Math.max(18, scale * 7), bx = (W - bw) / 2, th = Math.max(6, scale * 2.2);
      const extra = f.phase === 'reel' ? th + 6 + fs : 0, by = H - Math.max(96, scale * 34) - extra, pad = Math.max(8, scale * 3);
      ug.fillStyle = 'rgba(13,11,20,.82)'; ug.beginPath(); ug.roundRect(bx - pad, by - fs * 2.2 - pad, bw + pad * 2, bh + fs * 3.4 + pad * 2 + extra, 10); ug.fill();
      ug.strokeStyle = 'rgba(255,212,94,.35)'; ug.lineWidth = 2; ug.stroke();
      ug.font = `bold ${fs}px "Segoe UI",system-ui,sans-serif`;
      if (f.phase === 'done') { ug.fillStyle = f.ok ? '#8fe08a' : '#ff8c8c'; ug.font = `bold ${fs * 1.5}px "Segoe UI",system-ui,sans-serif`; ug.fillText(f.text, W / 2, by + bh / 2); }
      else if (f.phase === 'reel') {
        ug.fillStyle = '#f2ebe0'; ug.fillText(f.kind === 'goldfish' ? S.reelGold : f.kind === 'squid' ? S.reelSquid : f.big ? S.reelBig : S.reelTitle, W / 2, by - fs * 0.6);
        ug.fillStyle = '#2b2440'; ug.beginPath(); ug.roundRect(bx, by, bw, bh, bh / 2); ug.fill();
        const pw = bw * Math.max(0, Math.min(1, f.prog));
        ug.fillStyle = f.kind === 'goldfish' ? '#ffd45e' : f.kind === 'squid' ? '#e58fb5' : f.big ? '#ffb347' : '#4caa4f'; ug.beginPath(); ug.roundRect(bx, by, Math.max(bh, pw), bh, bh / 2); ug.fill();
        const mx = bx + pw; ug.fillStyle = '#1c1a24'; ug.fillRect(mx - 3, by - 5, 6, bh + 10); ug.fillStyle = '#ffd45e'; ug.fillRect(mx - 2, by - 4, 4, bh + 8);
        const ty = by + bh + 5;
        ug.fillStyle = '#2b2440'; ug.beginPath(); ug.roundRect(bx, ty, bw, th, th / 2); ug.fill();
        ug.fillStyle = f.tens > 0.66 ? '#ff4d4d' : f.tens > 0.33 ? '#ffb347' : '#6fb2e0'; ug.beginPath(); ug.roundRect(bx, ty, Math.max(2, bw * f.tens), th, th / 2); ug.fill();
        ug.font = small; ug.fillStyle = '#a79a86'; ug.textAlign = 'left'; ug.fillText(S.tension, bx, ty + th + fs * 0.7);
        ug.textAlign = 'right'; ug.fillText(S.reelHint, bx + bw, ty + th + fs * 0.7); ug.textAlign = 'center';
      } else {
        ug.fillStyle = '#f2ebe0'; ug.fillText(f.phase === 'bite' ? S.biteHint : S.waiting, W / 2, by - fs * 0.6);
        ug.font = small; ug.fillStyle = '#a79a86'; ug.fillText(S.castHint, W / 2, by + bh + fs * 0.9);
        ug.fillStyle = '#2b2440'; ug.beginPath(); ug.roundRect(bx, by, bw, bh, bh / 2); ug.fill();
        if (f.phase === 'bite') { ug.fillStyle = '#ffd45e'; ug.beginPath(); ug.roundRect(bx, by, Math.max(bh, bw * Math.max(0, f.t / 1.2)), bh, bh / 2); ug.fill(); }
        else { const k = (Math.sin(f.wob * 2) + 1) / 2; ug.fillStyle = '#3d6db5'; ug.beginPath(); ug.roundRect(bx + bw * 0.5 - bh, by, bh * 2 + bw * 0.06 * k, bh, bh / 2); ug.fill(); }
      }
    }
    ug.restore();
  },

  near(ctx) {
    if (!seaOK(ctx) || fishing) return null;
    const S = L(ctx), p = ctx.S.player;
    if (dive) return { label: S.surface, x: p.x, y: p.y, limit: 40, priority: true, data: { surface: true } };
    if (!onRaft(ctx)) return null;
    const here = tileAt(ctx, p.x, p.y - 2);
    // priority 0.5: beats the raft's own "patch/sail" prompts (same spot, no priority) but still loses to its "Step off" (priority 1)
    if (here === ctx.T.REEF) return { label: S.dive, x: p.x, y: p.y, limit: 40, priority: 0.5, data: { dive: true } };
    const t = castTarget(ctx); if (!t) return null;
    if (!hasRod(ctx)) return { label: S.needRod, x: t.x, y: t.y, limit: 44, data: { hint: true } };
    return { label: S.cast, x: t.x, y: t.y, limit: 44, data: { cast: t } };
  },

  interact(ctx, cand) {
    const d = cand && cand.data; if (!d || !seaOK(ctx)) return;
    if (d.surface) { surface(ctx, 'ok'); return; }
    if (d.dive) { if (onRaft(ctx)) startDive(ctx); return; }
    if (d.hint) { ctx.toast(L(ctx).needRod); return; }
    if (d.cast) { if (onRaft(ctx)) startCast(ctx, d.cast); }
  },

  hudLines(ctx) {
    if (!seaOK(ctx)) return [];
    const S = L(ctx), out = [];
    if (dive) out.push(`${S.air} ${Math.ceil(dive.t)}s`);
    const n = ctx.bag.count('pearl'); if (n > 0) out.push(`${ctx.itemIcon('pearl')} ${n} ${S.pearls}`);
    return out;
  }
};
