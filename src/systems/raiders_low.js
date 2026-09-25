// raiders_low.js — the low lands fight back: every land below M4 gets its own pest raid.
//   village · field rats   — gnaw the fences, steal what you carry. Shoo them (E) or squash them with Rocky.
//   m1      · monkeys      — climb the fences, grab a flag or a board, pick your pocket. Catch them (E) or pay a fish.
//   m2      · wild boars   — charge the walls and knock you over. Three axe hits (E) or one Rocky.
//   m3      · giant beaver — eats walls and trees, then dams the road. Four axe hits, or bribe it with 5 wood.
// See systems/API.md. Only one raid runs at a time; it damages at most 40% of a district's pieces.

import { mkCanvas, HOOK } from '../gfx.js';
import { faceOfV, dirFrame } from './animals.js';
import { guardedByScarecrow } from './farm.js';   /* F02: bù nhìn Rocky đuổi thú phá trong bán kính 6 ô */

// ---------------------------------------------------------------- strings
const STR = {
  en: {
    alert: {
      rat: n => `🐀 Rats are heading for the ${n} yard!`,
      monkey: n => `🐒 Monkeys are heading for the ${n} yard!`,
      boar: n => `🐗 Wild boars are charging the ${n} yard!`,
      beaver: n => `🦫 A giant beaver is heading for the ${n} yard!`
    },
    help: { rat: 'Help, the rats!', monkey: 'The monkeys are back!', boar: 'Boars! Get the axe!', beaver: 'That beaver will dam our road!' },
    name: { rat: 'Rats', monkey: 'Monkeys', boar: 'Boars', beaver: 'Beaver' },
    shoo: 'Shoo!', catchM: 'Catch monkey', giveFish: 'Give it a fish 🐟', hitAxe: 'Hit with axe', needAxe: 'Needs an axe — craft Axe I at the workbench (5 wood)',
    offerWood: 'Offer 5 🪵 wood', pickWood: n => `+${n} 🪵 wood`,
    shooed: 'The rat runs off!', dropBack: 'It dropped a chicken! 🐔',
    squashed: 'Rocky squashed it!',
    monkeyGone: 'The monkey drops its loot and flees!', fishPaid: 'The troop takes the fish and leaves!',
    boarDown: 'The boar bolts — it dropped wood!', beaverDown: 'The beaver waddles off — wood everywhere!',
    bribed: 'The beaver accepts the wood and leaves.', beaverGift: 'The beaver left 6 🪵 at the map edge.',
    stoleRat: k => `Squeak! A rat stole your ${k}!`, stoleMonkey: k => `The monkey snatched your ${k}!`,
    damBuilt: 'The beaver dammed the road!',
    over: (n, d) => `Raid over · ${n} driven off · ${d} pieces wrecked`,
    chip: (ic, n, s) => `${ic} ${n} · ${s}s`,
    items: { cow: 'cow', chicken: 'chicken', bird: 'bird', fish: 'fish' }
  },
  vi: {
    alert: {
      rat: n => `🐀 Chuột đang kéo tới khu ${n}!`,
      monkey: n => `🐒 Khỉ đang kéo tới khu ${n}!`,
      boar: n => `🐗 Heo rừng đang húc khu ${n}!`,
      beaver: n => `🦫 Hải ly khổng lồ đang tới khu ${n}!`
    },
    help: { rat: 'Cứu với, chuột!', monkey: 'Lũ khỉ lại tới rồi!', boar: 'Heo rừng! Lấy rìu mau!', beaver: 'Con hải ly sắp chặn đường mất!' },
    name: { rat: 'Chuột', monkey: 'Khỉ', boar: 'Heo rừng', beaver: 'Hải ly' },
    shoo: 'Đuổi!', catchM: 'Bắt khỉ', giveFish: 'Cho nó con cá 🐟', hitAxe: 'Chém rìu', needAxe: 'Cần rìu — chế Rìu I ở Bàn mộc (5 gỗ)',
    offerWood: 'Cho 5 🪵 gỗ', pickWood: n => `+${n} 🪵 gỗ`,
    shooed: 'Con chuột chạy mất!', dropBack: 'Nó làm rơi con gà! 🐔',
    squashed: 'Rocky giẫm bẹp nó!',
    monkeyGone: 'Con khỉ buông đồ rồi chạy!', fishPaid: 'Cả bầy nhận cá rồi rút!',
    boarDown: 'Heo rừng bỏ chạy — rơi lại gỗ!', beaverDown: 'Hải ly lạch bạch bỏ đi — gỗ rơi đầy!',
    bribed: 'Hải ly nhận gỗ và bỏ đi.', beaverGift: 'Hải ly để lại 6 🪵 ở bìa bản đồ.',
    stoleRat: k => `Chít chít! Chuột tha mất ${k} của bạn!`, stoleMonkey: k => `Con khỉ giật mất ${k} của bạn!`,
    damBuilt: 'Hải ly đã chặn đập trên đường!',
    over: (n, d) => `Hết đợt · đuổi được ${n} · hỏng ${d} vật`,
    chip: (ic, n, s) => `${ic} ${n} · ${s}s`,
    items: { cow: 'con bò', chicken: 'con gà', bird: 'con chim', fish: 'con cá' }
  }
};
const L = ctx => STR[ctx.lang() === 'vi' ? 'vi' : 'en'];

// ---------------------------------------------------------------- sprites (built once, at module load)
const OUT = '#1c1a24', TAU = Math.PI * 2, TILE = 16;
const px = (g, x, y, c, w = 1, h = 1) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
function flip(src) { const c = mkCanvas(src.width, src.height), g = c.getContext('2d'); g.translate(src.width, 0); g.scale(-1, 1); g.drawImage(src, 0, 0); return c; }
function build(w, h, fn) { return [0, 1].map(f => { const c = mkCanvas(w, h); fn(c.getContext('2d'), f); return [c, flip(c)]; }); } // [frame][0=right,1=left]

function ratArt(g, f) {                                   // 10×6 — grey, pink tail
  const B = '#9a9aa4', LT = '#b8b8c2', D = '#6c6c76', P = '#f2a0b8', W = '#ffffff';
  px(g, 0, 2 + (f ? 0 : 1), P, 2, 1); px(g, 1, 3, P, 1, 1);        // tail flicks
  px(g, 2, 1, OUT, 6, 5); px(g, 3, 2, B, 4, 3); px(g, 3, 2, LT, 4, 1); px(g, 3, 4, D, 4, 1);
  px(g, 5, 0, OUT, 2, 2); px(g, 5, 0, P, 1, 1);                    // ear
  px(g, 7, 2, OUT, 3, 4); px(g, 7, 3, B, 2, 2);                    // head
  px(g, 8, 3, W, 1, 1);                                            // eye
  px(g, 9, 4, P, 1, 1);                                            // nose
  px(g, 3 + (f ? 0 : 1), 5, D, 1, 1); px(g, 6 - (f ? 0 : 1), 5, D, 1, 1);
}
function monkeyArt(g, f) {                                // 16×16 — brown, lighter face
  const B = '#7b5334', D = '#573823', F = '#d8a978', N = '#f0c9a0', W = '#ffffff';
  const a = f ? 1 : 0;
  px(g, 0, 8, OUT, 2, 2); px(g, 1, 6, OUT, 2, 3); px(g, 2, 5, OUT, 2, 2);       // tail, curling up behind
  px(g, 1, 7, D, 1, 2); px(g, 2, 6, D, 1, 1);
  px(g, 5 + a, 13, OUT, 3, 3); px(g, 6 + a, 14, D, 1, 2);                        // feet
  px(g, 9 - a, 13, OUT, 3, 3); px(g, 10 - a, 14, D, 1, 2);
  px(g, 4, 8, OUT, 9, 6); px(g, 5, 9, B, 7, 4); px(g, 6, 10, N, 5, 3);           // body + pale belly
  px(g, 2, 8 + a, OUT, 3, 5); px(g, 3, 9 + a, B, 1, 3);                          // arms swing
  px(g, 12, 8 - a, OUT, 3, 5); px(g, 13, 9 - a, B, 1, 3);
  px(g, 1, 3, OUT, 3, 4); px(g, 2, 4, F, 1, 2);                                  // ears
  px(g, 12, 3, OUT, 3, 4); px(g, 13, 4, F, 1, 2);
  px(g, 3, 1, OUT, 10, 8); px(g, 4, 2, B, 8, 6);                                 // head
  g.clearRect(3, 1, 1, 1); g.clearRect(12, 1, 1, 1);
  px(g, 5, 3, F, 6, 5); px(g, 6, 2, F, 4, 1);                                    // face
  px(g, 6, 6, N, 4, 2); px(g, 7, 7 - (f ? 1 : 0), OUT, 2, 1);                    // muzzle + grin
  px(g, 6, 4, OUT, 1, 2); px(g, 9, 4, OUT, 1, 2); px(g, 6, 4, W, 1, 1); px(g, 9, 4, W, 1, 1);
}
function boarArt(g, f) {                                  // 20×14 — dark brown, tusks
  const B = '#4d3727', D = '#33241a', LT = '#634834', TK = '#f3ead6', E = '#ffd45e';
  const a = f ? 1 : 0;
  px(g, 0, 4, OUT, 2, 1); px(g, 0, 3, D, 1, 1);                                 // tail
  px(g, 4 + a, 10, OUT, 3, 4); px(g, 5 + a, 11, D, 1, 3);                        // legs
  px(g, 11 - a, 10, OUT, 3, 4); px(g, 12 - a, 11, D, 1, 3);
  px(g, 2, 3, OUT, 14, 8); px(g, 3, 4, B, 12, 6); px(g, 3, 8, D, 12, 2); px(g, 3, 4, LT, 12, 1);
  for (const bx of [5, 7, 9, 11]) px(g, bx, 1 + (bx === 7 ? 0 : 1), D, 1, 3);    // bristles
  px(g, 13, 3, OUT, 6, 8); px(g, 14, 4, B, 5, 6); px(g, 14, 4, LT, 3, 2);        // head
  px(g, 18, 7, OUT, 2, 3); px(g, 18, 8, '#8a6a55', 2, 1);                        // snout
  px(g, 17, 9, TK, 2, 1); px(g, 18, 8 - (f ? 1 : 0), TK, 1, 1);                  // tusk
  px(g, 16, 5, E, 1, 1);
}
function beaverArt(g, f) {                                // 22×16 — brown, flat tail
  const B = '#7a5230', D = '#563a21', LT = '#996b40', TK = '#ffe08a';
  const a = f ? 1 : 0;
  px(g, 0, 6, OUT, 8, 8); px(g, 1, 7, D, 6, 6);                                  // flat tail
  for (let i = 0; i < 3; i++) px(g, 1, 8 + i * 2, '#422c18', 6, 1);
  px(g, 7, 12, OUT, 3, 4); px(g, 8, 13, D, 1, 3);                                // legs
  px(g, 13 - a, 12, OUT, 3, 4); px(g, 14 - a, 13, D, 1, 3);
  px(g, 6, 3, OUT, 11, 10); px(g, 7, 4, B, 9, 8); px(g, 7, 9, LT, 9, 3);         // body
  g.clearRect(6, 3, 1, 1); g.clearRect(16, 3, 1, 1); g.clearRect(6, 12, 1, 1);
  px(g, 15, 2, OUT, 6, 9); px(g, 16, 3, B, 5, 7); px(g, 16, 3, LT, 3, 2);        // head
  g.clearRect(20, 2, 1, 1);
  px(g, 15, 1, OUT, 2, 2); px(g, 15, 1, D, 1, 1);                                // ear
  px(g, 18, 5, '#ffffff', 1, 1);                                                  // eye
  px(g, 19, 8, OUT, 3, 4); px(g, 19, 9 + (f ? 0 : 1), TK, 2, 2);                 // big teeth
}
function woodArt(g, f) {                                  // 10×8 — a small pile of logs
  const W = '#8a5a2b', D = '#5f3d1c', R = '#c9a86b';
  px(g, 0, 4, OUT, 10, 4); px(g, 1, 5, W, 8, 2); px(g, 1, 5, D, 8, 1); px(g, 7, 5, R, 2, 2);
  px(g, 2, 1 - (f ? 1 : 0), OUT, 7, 4); px(g, 3, 2 - (f ? 1 : 0), W, 5, 2); px(g, 3, 2 - (f ? 1 : 0), D, 5, 1); px(g, 6, 2 - (f ? 1 : 0), R, 2, 2);
}
// tiny icons for what a monkey runs off with
function itemArt(kind) {
  return (g) => {
    if (kind === 'chicken') { px(g, 1, 1, OUT, 6, 6); px(g, 2, 2, '#fbf8f2', 4, 4); px(g, 3, 0, '#e04b4b', 2, 1); px(g, 6, 3, '#ffc93a', 2, 1); }
    else if (kind === 'cow') { px(g, 1, 1, OUT, 6, 6); px(g, 2, 2, '#f5f1ea', 4, 4); px(g, 2, 2, '#2b2733', 2, 2); px(g, 4, 4, '#2b2733', 2, 2); }
    else if (kind === 'bird') { px(g, 1, 2, OUT, 6, 5); px(g, 2, 3, '#3d7fd6', 4, 3); px(g, 5, 2, '#8cc4f7', 2, 2); px(g, 7, 4, '#ff9426', 1, 1); }
    else { px(g, 1, 2, OUT, 7, 5); px(g, 2, 3, '#6fb2e0', 5, 3); px(g, 0, 2, OUT, 2, 5); px(g, 0, 3, '#3d7fd6', 1, 3); px(g, 6, 3, '#ffffff', 1, 1); }
  };
}
const SPR = {
  rat: HOOK.creature('rat', build(10, 6, ratArt)), monkey: HOOK.creature('monkey', build(16, 16, monkeyArt)), boar: HOOK.creature('boar', build(20, 14, boarArt)), beaver: HOOK.creature('beaver', build(22, 16, beaverArt)),
  wood: HOOK.creature('wood', build(10, 8, woodArt))
};
const ICON = {};
for (const k of ['cow', 'chicken', 'bird', 'fish']) { const c = mkCanvas(8, 8); itemArt(k)(c.getContext('2d')); ICON[k] = c; }

// ---------------------------------------------------------------- tuning
const WARN_FULL = 20, WARN_FAST = 2;             // warning phase, seconds (tests: window.__raidLowFast)
const FIRST = [90, 150], NEXT = [360, 720];      // first raid after entering, then every 6–12 min
const RAID_MAX = 90;                             // a raid never lasts longer than this
const DAMAGE_SHARE = 0.4;                        // at most 40% of a district's pieces per raid
const MAX_CARRY = 3;

const ZKIND = { village: 'rat', m1: 'monkey', m2: 'boar', m3: 'beaver' };
const CONF = {
  rat: { n: [5, 8], sp: 58, gnaw: 2.0, pieces: ['wall', 'corner', 'flag'], hits: 1, reach: 12, icon: '🐀' },
  monkey: { n: [3, 4], sp: 48, gnaw: 3.0, pieces: ['flag', 'board'], hits: 1, reach: 14, icon: '🐒', climb: true },
  boar: { n: [2, 3], sp: 42, gnaw: 1.5, pieces: ['wall', 'corner', 'house'], hits: 3, reach: 16, icon: '🐗' },
  beaver: { n: [1, 1], sp: 28, gnaw: 2.0, pieces: ['wall', 'corner'], hits: 4, reach: 16, icon: '🦫' }
};
const warnDur = () => (typeof window !== 'undefined' && window.__raidLowFast ? WARN_FAST : WARN_FULL);
const rand = (a, b) => a + Math.random() * (b - a);
const ri = (a, b) => a + ((Math.random() * (b - a + 1)) | 0);

// ---------------------------------------------------------------- module state
let CTX = null;              // last ctx seen (for the window test hook)
let kind = null;             // creature of this land, null where there is no raid
let phase = 'idle';          // idle → warn → raid
let timer = 0;               // seconds left of the current phase (idle: until the next raid)
let raidT = 0;               // seconds this raid has been running
let plotIdx = -1;
let mobs = [], loot = [], fx = [], tracks = [];
let climbSet = null;         // tiles monkeys may climb through (fence/wall pieces)
let spawnPt = null, aimPt = null, dustT = 0;
let cap = 0, ruined = 0, repelledN = 0;
let dam = null;              // { tiles:[{x,y,t}] } — the beaver's road dam (t = the ground tile to put back)

// ---------------------------------------------------------------- small helpers
function stats(ctx) {
  const sv = ctx.S.save; sv.sys = sv.sys || {};
  sv.sys.raiders = { raids: 0, repelled: 0, stolen: 0, ...(sv.sys.raiders || {}) };
  return sv.sys.raiders;
}
const CARRIABLE = ['cow', 'chicken', 'bird', 'fish'];
const kindOf = it => (typeof it === 'string' ? it : (it && it.kind) || 'fish');
function carryArr(ctx) {
  const sv = ctx.S.save; sv.sys = sv.sys || {};
  const a = (sv.sys.animals = sv.sys.animals || {});
  if (!Array.isArray(a.carry)) a.carry = [];
  return a.carry;
}
function syncCarry(ctx) {                                  // keep the HUD inventory line honest
  const inv = (ctx.S.save.inv = ctx.S.save.inv || {});
  for (const k of CARRIABLE) inv[k] = 0;
  for (const it of carryArr(ctx)) { const k = kindOf(it); if (CARRIABLE.includes(k)) inv[k]++; }
  ctx.persist();
}
function takeCarry(ctx, kinds) {                           // remove one carried item (last first)
  const c = carryArr(ctx);
  for (let i = c.length - 1; i >= 0; i--) if (!kinds || kinds.includes(kindOf(c[i]))) { const it = c.splice(i, 1)[0]; syncCarry(ctx); return it; }
  return null;
}
function putCarry(ctx, it) {
  const c = carryArr(ctx); if (c.length >= MAX_CARRY) return false;
  c.push(it); syncCarry(ctx); return true;
}
const hasAxe = ctx => { const t = ctx.S.save.tools; return !t || t.axe !== false; };
const woodOf = ctx => { const s = ctx.S.save; s.inv = s.inv || {}; return s.inv.wood || 0; };
function addWood(ctx, n) { const s = ctx.S.save; s.inv = s.inv || {}; s.inv.wood = (s.inv.wood || 0) + n; ctx.persist(); }

const tileOf = v => Math.floor(v / TILE);
function nationName(ctx, key) {
  const g = (ctx.S.nations || []).find(n => n.key === key);
  return g ? `${g.flag} ${g.name}` : key;
}
function objCentre(ctx, o) { const d = ctx.O[o.type]; return { x: (o.x + d.fw / 2) * TILE, y: (o.y + d.fh) * TILE - 4 }; }
// distance from a point to the piece's footprint (0 when you are standing on it) — pieces are solid,
// so a raider can never reach their centre; it has to be enough to stand against them.
function distToObj(ctx, o, x, y) {
  const d = ctx.O[o.type], x0 = o.x * TILE, y0 = o.y * TILE, x1 = x0 + d.fw * TILE, y1 = y0 + d.fh * TILE;
  const dx = x < x0 ? x0 - x : x > x1 ? x - x1 : 0, dy = y < y0 ? y0 - y : y > y1 ? y - y1 : 0;
  return Math.hypot(dx, dy);
}
function inPlotPx(ctx, x, y, m = 0) {
  const p = ctx.S.map.plots[plotIdx]; if (!p) return false;
  const tx = tileOf(x), ty = tileOf(y);
  return tx >= p.x - m && tx < p.x + p.w + m && ty >= p.y - m && ty < p.y + p.h + m;
}

// ---------------------------------------------------------------- particles
function puff(x, y, n = 6, c = 'rgba(210,196,170,.9)') {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * TAU, sp = 8 + Math.random() * 24;
    fx.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 10, gy: 18, t: 0.4 + Math.random() * 0.35, life: 0.75, r: 1.4 + Math.random() * 2, c });
  }
}
function chips(x, y, c = '#c9a86b') {
  for (let i = 0; i < 7; i++) {
    const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.4, sp = 26 + Math.random() * 40;
    fx.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, gy: 150, t: 0.4 + Math.random() * 0.3, life: 0.7, r: 1, c, box: true });
  }
}
function updateFx(dt) {
  for (let i = fx.length - 1; i >= 0; i--) {
    const p = fx[i]; p.t -= dt;
    if (p.t <= 0) { fx.splice(i, 1); continue; }
    p.x += p.vx * dt; p.y += p.vy * dt; if (p.gy) p.vy += p.gy * dt; p.vx *= (1 - dt * 0.9);
  }
  if (fx.length > 150) fx.splice(0, fx.length - 150);
  for (let i = tracks.length - 1; i >= 0; i--) { tracks[i].t -= dt; if (tracks[i].t <= 0) tracks.splice(i, 1); }
}

// ---------------------------------------------------------------- map / steering
function borderBand(map, tx, ty) { return tx < 3 || ty < 3 || tx > map.w - 4 || ty > map.h - 4; }
function canGo(ctx, m, x, y) {
  const map = ctx.S.map, tx = tileOf(x), ty = tileOf(y);
  if (m.st === 'flee' || m.squeeze > 0) return true;                            // panicking (or wedged) animals scramble over anything
  if (tx < 0 || ty < 0 || tx >= map.w || ty >= map.h) return false;
  if (borderBand(map, tx, ty)) return true;                                     // they slip through the border trees
  if (!ctx.isSolid(map, tx, ty)) return true;
  if (m.climb && climbSet && climbSet.has(ty * map.w + tx)) return true;         // monkeys go over fences
  return ctx.isSolid(map, tileOf(m.x), tileOf(m.y));                             // standing in the surf / a bush: let it climb out
}
function moveBy(ctx, m, dx, dy) {                                               // axis-separated step, returns how far it got
  const ox = m.x, oy = m.y;
  if (Math.abs(dx) > 1e-4 && canGo(ctx, m, m.x + dx, m.y)) m.x += dx;
  if (Math.abs(dy) > 1e-4 && canGo(ctx, m, m.x, m.y + dy)) m.y += dy;
  return Math.hypot(m.x - ox, m.y - oy);
}
// steer straight at the goal; when something is in the way, probe sideways and commit to a detour
// for a moment (a one-pixel slide test just makes them jitter in dense woods)
function stepTo(ctx, m, gx, gy, dt) {
  const sp = m.sp * dt, dx = gx - m.x, dy = gy - m.y, d = Math.hypot(dx, dy) || 1;
  if (m.det > 0) {
    m.det -= dt;
    if (moveBy(ctx, m, Math.cos(m.detA) * sp, Math.sin(m.detA) * sp) < sp * 0.5) m.det = 0;
    m.prog = sp;
  } else {
    m.prog = moveBy(ctx, m, dx / d * sp, dy / d * sp);
    if (m.prog < sp * 0.5 && d > 8) {
      m.blockT = (m.blockT || 0) + dt;
      if (m.blockT > 0.3) {
        m.blockT = 0;
        const base = Math.atan2(dy, dx), s = m.slide || (m.slide = Math.random() < 0.5 ? 1 : -1);
        let found = false;
        for (const off of [1.4, -1.4, 2.2, -2.2, 3.0]) {
          const a = base + off * s;
          if (canGo(ctx, m, m.x + Math.cos(a) * 6, m.y + Math.sin(a) * 6) && canGo(ctx, m, m.x + Math.cos(a) * 13, m.y + Math.sin(a) * 13)) {
            m.detA = a; m.det = 0.4 + Math.random() * 0.5; found = true; break;
          }
        }
        if (!found) { m.slide = -s; m.fails = (m.fails || 0) + 1; } else m.fails = 0;
        if (m.fails >= 2) { m.fails = 0; m.squeeze = 0.9; }                     // boxed in by trees: squeeze through
      }
    } else m.blockT = 0;
  }
  // anti-stall: if it has not got any closer in three seconds, let it barge through for a moment
  m.chk = (m.chk || 0) + dt;
  if (m.chk > 3) { m.chk = 0; if (m.lastD !== undefined && d > m.lastD - 8) m.squeeze = 1.2; m.lastD = d; }
  const vx = m.det > 0 ? Math.cos(m.detA) : dx;
  if (Math.abs(vx) > 0.02) m.dir = vx >= 0 ? 1 : -1;
  m.ft += dt * (m.kind === 'rat' ? 11 : m.kind === 'beaver' ? 4 : 7);
  m.fr = (m.ft | 0) % 2;
  { const mx = m.x - (m.px ?? m.x), my = m.y - (m.py ?? m.y); if (Math.hypot(mx, my) > 0.05) m.face = faceOfV(mx, my); m.px = m.x; m.py = m.y; }   /* plan-11: hướng đi 4 phía */
  if (Math.random() < dt * 2.2) footprint(m);
  return d;
}
function footprint(m) { tracks.push({ x: m.x + (Math.random() - 0.5) * 4, y: m.y - 1, t: 4, life: 4, s: m.kind === 'rat' ? 1 : 2 }); }

// the four entrance gaps of a district (middle of each side, 2 tiles wide)
function gatesOf(p) {
  return [
    { x: p.x * TILE + 80, y: p.y * TILE + 10, dx: 0, dy: -1 },
    { x: p.x * TILE + 80, y: (p.y + p.h - 1) * TILE + 10, dx: 0, dy: 1 },
    { x: p.x * TILE + 8, y: (p.y + 3) * TILE + 16, dx: -1, dy: 0 },
    { x: (p.x + p.w - 1) * TILE + 8, y: (p.y + 3) * TILE + 16, dx: 1, dy: 0 }
  ];
}
// walk in through the n-th nearest gap: one point outside it, one inside
function gateWaypoints(p, from, n = 0) {
  const gates = gatesOf(p).sort((a, b) => Math.hypot(a.x - from.x, a.y - from.y) - Math.hypot(b.x - from.x, b.y - from.y));
  const gt = gates[n % gates.length];
  return [{ x: gt.x + gt.dx * 20, y: gt.y + gt.dy * 20 }, { x: gt.x - gt.dx * 16, y: gt.y - gt.dy * 16 }];
}
// is this piece inside the fence (a flag, a board, the house) rather than part of the fence itself?
function pieceInside(ctx, o) {
  const p = ctx.S.map.plots[plotIdx]; if (!p || !o) return false;
  const d = ctx.O[o.type], cx = o.x + d.fw / 2, cy = o.y + d.fh / 2;
  return cx > p.x + 0.9 && cx < p.x + p.w - 0.9 && cy > p.y + 0.9 && cy < p.y + p.h - 0.9;
}
// where the pack comes from: the nearest map edge — or the sea, on M1
function edgeSpawn(ctx, p) {
  const map = ctx.S.map, cx = (p.x + p.w / 2) * TILE, cy = (p.y + p.h / 2) * TILE;
  if (ctx.S.zone.id === 'm1') {                                   // the troop comes in out of the sea
    const ty = Math.max(2, Math.min(map.h - 3, tileOf(cy)));
    if (ctx.getG(map, map.w - 2, ty) === ctx.T.WATER) {
      let tx = map.w - 2;
      while (tx > 4 && ctx.getG(map, tx, ty) === ctx.T.WATER) tx--;   // walk back to the beach
      return { x: (tx + 1) * TILE + 8, y: ty * TILE + 12 };
    }
  }
  const cand = [
    { x: 2 * TILE + 8, y: cy, d: cx },
    { x: (map.w - 3) * TILE + 8, y: cy, d: map.w * TILE - cx },
    { x: cx, y: 2 * TILE + 12, d: cy },
    { x: cx, y: (map.h - 3) * TILE + 12, d: map.h * TILE - cy }
  ];
  cand.sort((a, b) => a.d - b.d);
  return { x: cand[0].x, y: cand[0].y };
}

// ---------------------------------------------------------------- targets
function livePieces(ctx) {
  if (plotIdx < 0) return [];
  const want = CONF[kind].pieces;
  return ctx.piecesOf(plotIdx).filter(o => !o.ruined && want.includes(o.piece));
}
/* ô (px) có bù nhìn canh (đọc save.sys.farm[zone].scarecrows, bán kính 6 ô) */
function scared(ctx, x, y) { const z = ctx.S.zone; return !!z && guardedByScarecrow(ctx.S.save, z.id, Math.floor(x / TILE), Math.floor(y / TILE)); }
function pickTarget(ctx, m) {
  const list = livePieces(ctx).filter(o => !guardedByScarecrow(ctx.S.save, ctx.S.zone.id, o.x, o.y));   /* mảnh gần bù nhìn: không dám phá */
  if (!list.length) return null;
  list.sort((a, b) => { const A = objCentre(ctx, a), B = objCentre(ctx, b); return Math.hypot(A.x - m.x, A.y - m.y) - Math.hypot(B.x - m.x, B.y - m.y); });
  return list[Math.min(list.length - 1, (m.slot || 0) % Math.min(3, list.length))];
}
function gnaw(ctx, m) {
  const o = m.target; if (!o || o.ruined) { m.target = null; return; }
  const c = objCentre(ctx, o);
  chips(c.x + (Math.random() - 0.5) * 10, c.y - 6);
  if (ruined >= cap) return;                                   // damage cap for this raid reached
  if (ctx.damage(o, 1)) { ruined++; puff(c.x, c.y - 8, 10, 'rgba(160,150,140,.9)'); m.target = null; }
}

// ---------------------------------------------------------------- loot on the ground
function dropWood(x, y, n) { loot.push({ x, y, n, ft: Math.random() * 2, t: 0 }); }
function updateLoot(dt, ctx) {
  const p = ctx.S.player;
  for (let i = loot.length - 1; i >= 0; i--) {
    const l = loot[i]; l.ft += dt * 3; l.t += dt;
    if (Math.hypot(l.x - p.x, l.y - p.y) < 13) {
      addWood(ctx, l.n); ctx.toast(L(ctx).pickWood(l.n)); puff(l.x, l.y - 4, 5, 'rgba(255,212,94,.8)');
      loot.splice(i, 1);
    }
  }
}

// ---------------------------------------------------------------- the beaver's dam
function buildDam(ctx, m) {
  const map = ctx.S.map, p = map.plots[plotIdx]; if (!p || dam) return;
  const site = damSite(ctx, m);
  if (!site) { m.job = 'linger'; return; }
  const tiles = [];
  for (const t of site) tiles.push({ x: t.x, y: t.y, t: ctx.getG(map, t.x, t.y) });
  for (const t of tiles) ctx.setG(map, t.x, t.y, t.t, true);
  dam = { tiles };
  puff(m.x, m.y - 6, 12, 'rgba(120,90,60,.9)');
  ctx.toast(L(ctx).damBuilt);
}
function damSite(ctx, m) {
  const map = ctx.S.map, p = map.plots[plotIdx], pc = { x: (p.x + p.w / 2) * TILE, y: (p.y + p.h / 2) * TILE };
  const pl = ctx.S.player;
  let best = null, bd = Infinity;
  for (let ty = Math.max(2, p.y - 10); ty < Math.min(map.h - 2, p.y + p.h + 10); ty++)
    for (let tx = Math.max(2, p.x - 12); tx < Math.min(map.w - 2, p.x + p.w + 12); tx++) {
      if (map.roads[ty * map.w + tx] !== 1 || ctx.isSolid(map, tx, ty)) continue;
      if (Math.hypot(tx * TILE + 8 - pl.x, ty * TILE + 8 - pl.y) < 40) continue;   // never wall the player in
      const d = Math.hypot(tx * TILE + 8 - pc.x, ty * TILE + 8 - pc.y);
      if (d < bd) { bd = d; best = { x: tx, y: ty }; }
    }
  if (!best) return null;
  const runLen = (dx, dy) => { let n = 0, x = best.x + dx, y = best.y + dy; while (n < 6 && map.roads[y * map.w + x] === 1) { n++; x += dx; y += dy; } return n; };
  const horiz = 1 + runLen(1, 0) + runLen(-1, 0), vert = 1 + runLen(0, 1) + runLen(0, -1);
  const across = horiz <= vert ? [1, 0] : [0, 1];              // cut the road across its narrow side
  const along = across[0] ? [0, 1] : [1, 0];
  const out = [];
  for (let a = -3; a <= 3; a++) {
    const x = best.x + across[0] * a, y = best.y + across[1] * a;
    if (map.roads[y * map.w + x] !== 1 || ctx.isSolid(map, x, y)) continue;
    out.push({ x, y });
    out.push({ x: x + along[0], y: y + along[1] });
  }
  return out.filter((t, i, arr) => !ctx.isSolid(ctx.S.map, t.x, t.y) && arr.findIndex(q => q.x === t.x && q.y === t.y) === i).slice(0, 10);
}
function clearDam(ctx) {
  if (!dam) return;
  const map = ctx.S.map;
  if (map) for (const t of dam.tiles) ctx.setG(map, t.x, t.y, t.t, false);
  dam = null;
}

// ---------------------------------------------------------------- raid lifecycle
function schedule(first) { phase = 'idle'; timer = first ? rand(FIRST[0], FIRST[1]) : rand(NEXT[0], NEXT[1]); }

function startRaidNow(ctx, want = -1) {
  if (!ctx || !kind) return 'no raiders in this land';
  if (phase !== 'idle') return 'raid already running (' + phase + ')';
  const plots = ctx.S.map.plots || [];
  if (!plots.length) return 'no districts here';
  let pool = plots.map((p, i) => i).filter(i => ctx.districtState(i).condition >= 1);
  if (!pool.length) pool = plots.map((p, i) => i);
  plotIdx = (want >= 0 && want < plots.length) ? want : pool[(Math.random() * pool.length) | 0];
  const p = plots[plotIdx];
  spawnPt = edgeSpawn(ctx, p);
  aimPt = { x: (p.x + p.w / 2) * TILE, y: (p.y + p.h / 2) * TILE };
  cap = Math.max(1, Math.round(DAMAGE_SHARE * ctx.piecesOf(plotIdx).length));
  ruined = 0; repelledN = 0; raidT = 0; mobs = []; dustT = 0;
  phase = 'warn'; timer = warnDur();
  const st = stats(ctx); st.raids++; ctx.persist();
  const nat = nationName(ctx, p.nation), S = L(ctx);
  ctx.alert(S.alert[kind](nat), warnDur() + 12);
  ctx.quake(0.2);
  const npc = ctx.S.npcs.find(n => n.m && !n.m.guide && ctx.nationOf(n.m) && ctx.nationOf(n.m).key === p.nation);
  ctx.toast(`${npc ? npc.m.n : nat}: “${S.help[kind]}”`);
  return `warning · ${kind} · plot ${plotIdx} (${p.nation})`;
}

function spawnPack(ctx) {
  const p = ctx.S.map.plots[plotIdx]; if (!p) { endRaid(ctx); return; }
  const c = CONF[kind], n = ri(c.n[0], c.n[1]);
  const map = ctx.S.map;
  climbSet = null;
  if (c.climb) {
    climbSet = new Set();
    for (const o of map.objects) {
      if (o.plot === undefined || (o.piece !== 'wall' && o.piece !== 'corner')) continue;
      const d = ctx.O[o.type];
      for (let j = 0; j < d.fh; j++) for (let i = 0; i < d.fw; i++) climbSet.add((o.y + j) * map.w + (o.x + i));
    }
  }
  for (let i = 0; i < n; i++) {
    const m = {
      kind, sp: c.sp * (0.88 + Math.random() * 0.24), slot: i,
      x: spawnPt.x + (Math.random() - 0.5) * 26, y: spawnPt.y + (Math.random() - 0.5) * 26,
      dir: 1, fr: 0, ft: Math.random() * 2, st: 'travel', wp: c.climb ? [] : gateWaypoints(p, spawnPt),
      target: null, gt: Math.random() * 0.8, hits: 0, held: null, stuck: 0, bump: 0, job: 'gnaw', jobT: 0, done: 0
    };
    mobs.push(m);
  }
  phase = 'raid'; raidT = 0;
}

function endRaid(ctx) {
  const S = L(ctx);
  clearDam(ctx);
  if (phase === 'raid') ctx.toast(S.over(repelledN, ruined));
  mobs = []; climbSet = null; plotIdx = -1;
  ctx.alert('');
  schedule(false);
  ctx.persist();
}

// ---------------------------------------------------------------- repelling
function fleeOff(ctx, m) {
  m.st = 'flee'; m.target = null;
  const map = ctx.S.map;
  const ex = [{ x: -30, y: m.y }, { x: map.w * TILE + 30, y: m.y }, { x: m.x, y: -30 }, { x: m.x, y: map.h * TILE + 30 }];
  ex.sort((a, b) => Math.hypot(a.x - m.x, a.y - m.y) - Math.hypot(b.x - m.x, b.y - m.y));
  m.exit = ex[0]; m.sp *= 1.7;
}
function repel(ctx, m, squash) {
  if (m.gone || (m.st === 'flee' && !m.held)) return;             // a thief can still be chased down
  const S = L(ctx), st = stats(ctx);
  st.repelled++; repelledN++;
  if (m.kind === 'rat') {
    puff(m.x, m.y - 3, squash ? 12 : 6, squash ? 'rgba(200,120,140,.9)' : undefined);
    if (squash) { m.gone = true; ctx.toast(S.squashed); } else { fleeOff(ctx, m); ctx.toast(S.shooed); }
    if (Math.random() < 0.3 && putCarry(ctx, 'chicken')) ctx.toast(S.dropBack);
  } else if (m.kind === 'monkey') {
    if (m.held) { putCarry(ctx, m.held); m.held = null; }
    puff(m.x, m.y - 8, 8); fleeOff(ctx, m); ctx.toast(S.monkeyGone);
  } else if (m.kind === 'boar') {
    puff(m.x, m.y - 6, 10); dropWood(m.x - 6, m.y, 1); dropWood(m.x + 6, m.y + 2, 1);
    fleeOff(ctx, m); ctx.toast(S.boarDown);
  } else {
    puff(m.x, m.y - 6, 12); dropWood(m.x - 8, m.y, 1); dropWood(m.x + 2, m.y + 2, 1); dropWood(m.x + 10, m.y - 2, 1);
    fleeOff(ctx, m); ctx.toast(S.beaverDown);
  }
  ctx.persist();
}
function hitMob(ctx, m) {                                      // one axe swing
  if (m.hitCd > 0) return;
  m.hitCd = 0.35; m.hits++;
  chips(m.x, m.y - 6, '#ffd45e');
  ctx.S.player.faceTo(m.x, m.y);
  if (m.hits >= CONF[m.kind].hits) repel(ctx, m, false);
}

// ---------------------------------------------------------------- per-creature behaviour
function updateMob(dt, ctx, m) {
  const p = ctx.S.player, c = CONF[m.kind];
  if (m.hitCd > 0) m.hitCd -= dt;
  if (m.bump > 0) m.bump -= dt;
  if (m.squeeze > 0) m.squeeze -= dt;

  // Rocky flattens whatever it walks into
  if (m.st !== 'flee' && ctx.isRocky() && Math.hypot(m.x - p.x, m.y - p.y) < 18) { m.hits = c.hits; repel(ctx, m, m.kind === 'rat'); return; }

  if (m.st === 'flee') {
    stepTo(ctx, m, m.exit.x, m.exit.y, dt);
    const map = ctx.S.map;
    if (m.x < -20 || m.y < -20 || m.x > map.w * TILE + 20 || m.y > map.h * TILE + 20) {
      m.gone = true;
      if (m.gift) {                                            // the bribed beaver pays back at its lair edge
        const bx = Math.max(40, Math.min(map.w * TILE - 40, m.x)), by = Math.max(40, Math.min(map.h * TILE - 40, m.y));
        for (let i = 0; i < 3; i++) dropWood(bx + (i - 1) * 12, by + (i % 2) * 8, 2);
        ctx.toast(L(ctx).beaverGift);
      }
    }
    return;
  }
  if (m.st === 'travel') {
    if (m.wp.length) {
      const w = m.wp[0];
      if (stepTo(ctx, m, w.x, w.y, dt) < 12) { m.wp.shift(); m.stuck = 0; return; }
      m.stuck = m.prog < m.sp * dt * 0.4 ? m.stuck + dt : 0;
      if (m.stuck > 2.5) {                                                      // that gap is blocked — try the next one round
        m.stuck = 0; m.gateTry = (m.gateTry || 0) + 1;
        const plot = ctx.S.map.plots[plotIdx];
        if (plot && m.gateTry < 4) m.wp = gateWaypoints(plot, m, m.gateTry);
        else { m.wp.length = 0; m.noRoute = true; }                             // give up: wreck it from the outside
      }
      return;
    }
    m.st = 'raid';
  }

  // --- raiding ---
  if (scared(ctx, m.x, m.y)) { puff(m.x, m.y - 4, 4); fleeOff(ctx, m); return; }   /* lọt vào tầm bù nhìn → bỏ chạy */
  if (m.kind === 'rat' && !m.stole && carryArr(ctx).length && inPlotPx(ctx, p.x, p.y, 0) && Math.hypot(m.x - p.x, m.y - p.y) < 12) {
    const it = takeCarry(ctx, ['chicken', 'fish']);
    if (it) {
      m.stole = true; stats(ctx).stolen++; ctx.persist();
      ctx.toast(L(ctx).stoleRat(L(ctx).items[kindOf(it)] || kindOf(it)));
      puff(m.x, m.y - 4, 5); fleeOff(ctx, m); return;
    }
  }
  if (m.kind === 'monkey' && !m.held && carryArr(ctx).length && Math.hypot(m.x - p.x, m.y - p.y) < 14) {
    const c2 = carryArr(ctx), it = c2.pop(); syncCarry(ctx);
    m.held = it; stats(ctx).stolen++; ctx.persist();
    ctx.toast(L(ctx).stoleMonkey(L(ctx).items[kindOf(it)] || kindOf(it)));
    fleeOff(ctx, m); return;
  }
  if (m.kind === 'boar' && m.bump <= 0 && Math.hypot(m.x - p.x, m.y - p.y) < 13) {
    const dx = Math.sign(p.x - m.x) || 1, dy = Math.sign(p.y - m.y) || 1;
    p.tryMove(dx * 8, dy * 8, ctx.S.map, ctx.allNpcs()); p.tryMove(dx * 6, dy * 6, ctx.S.map, ctx.allNpcs());
    ctx.quake(0.2); m.bump = 1.4; puff(p.x, p.y - 6, 6);
  }

  if (m.kind === 'beaver') { beaverJob(dt, ctx, m); return; }

  if (!m.target || m.target.ruined || ruined >= cap) {
    m.target = ruined >= cap ? null : pickTarget(ctx, m);
    // a flag or a board sits inside the fence: walk in through a gap first
    if (m.target && !c.climb && !m.noRoute && !inPlotPx(ctx, m.x, m.y, 0) && pieceInside(ctx, m.target)) {
      const plot = ctx.S.map.plots[plotIdx];
      if (plot) { m.wp = gateWaypoints(plot, m, m.gateTry || 0); m.st = 'travel'; return; }
    }
  }
  if (!m.target) { fleeOff(ctx, m); return; }
  const t = objCentre(ctx, m.target);
  const d = distToObj(ctx, m.target, m.x, m.y);
  if (d > c.reach) {
    const before = { x: m.x, y: m.y };
    stepTo(ctx, m, t.x, t.y, dt);
    m.stuck = Math.hypot(m.x - before.x, m.y - before.y) < m.sp * dt * 0.25 ? m.stuck + dt : 0;
    if (m.stuck > 2.5) { m.stuck = 0; m.slot = (m.slot || 0) + 1; m.target = null; }
    return;
  }
  m.dir = t.x >= m.x ? 1 : -1;
  m.ft += dt * 6; m.fr = (m.ft | 0) % 2;
  m.gt += dt;
  if (m.gt >= c.gnaw) { m.gt = 0; gnaw(ctx, m); }
}

// the beaver works through a list: chew the wall, eat the trees, dam the road, then hang around
function beaverJob(dt, ctx, m) {
  const c = CONF.beaver;
  m.jobT += dt;
  if (m.job === 'gnaw') {
    if (!m.target || m.target.ruined || ruined >= cap) m.target = ruined >= cap ? null : pickTarget(ctx, m);
    if (!m.target || m.jobT > 20) { m.job = 'trees'; m.jobT = 0; m.target = null; return; }
    const t = objCentre(ctx, m.target), d = distToObj(ctx, m.target, m.x, m.y);
    if (d > c.reach) { stepTo(ctx, m, t.x, t.y, dt); return; }
    m.dir = t.x >= m.x ? 1 : -1; m.gt += dt;
    if (m.gt >= c.gnaw) { m.gt = 0; gnaw(ctx, m); }
    return;
  }
  if (m.job === 'trees') {
    if (m.done >= 3 || m.jobT > 22) { m.job = 'dam'; m.jobT = 0; m.tree = null; return; }
    if (!m.tree || ctx.S.map.objects.indexOf(m.tree) < 0) m.tree = nearestTree(ctx, m);
    if (!m.tree) { m.job = 'dam'; m.jobT = 0; return; }
    const d2 = ctx.O[m.tree.type], t = { x: (m.tree.x + d2.fw / 2) * TILE, y: (m.tree.y + d2.fh) * TILE - 2 };
    const d = distToObj(ctx, m.tree, m.x, m.y);
    if (d > 16) { stepTo(ctx, m, t.x, t.y, dt); return; }
    m.gt += dt; chips(t.x + (Math.random() - 0.5) * 8, t.y - 10, '#4caa4f');
    if (m.gt >= 2.2) { m.gt = 0; puff(t.x, t.y - 14, 12, 'rgba(76,170,79,.9)'); ctx.removeObject(ctx.S.map, m.tree); m.tree = null; m.done++; }
    return;
  }
  if (m.job === 'dam') {
    if (!dam) {
      if (!m.damPt) { const s = damSite(ctx, m); m.damPt = s && s.length ? { x: s[0].x * TILE + 8, y: s[0].y * TILE + 12 } : null; }
      if (!m.damPt) { m.job = 'linger'; m.jobT = 0; return; }
      const d = Math.hypot(m.damPt.x - m.x, m.damPt.y - m.y);
      if (d > 14 && m.jobT < 25) { stepTo(ctx, m, m.damPt.x, m.damPt.y, dt); return; }
      buildDam(ctx, m);
    }
    m.job = 'linger'; m.jobT = 0; return;
  }
  // linger: guard the dam for a while, then waddle off
  if (m.jobT > 14) { fleeOff(ctx, m); return; }
  if (dam && dam.tiles.length) {
    const t = dam.tiles[0], gx = t.x * TILE + 8, gy = (t.y + 1) * TILE + 6;
    if (Math.hypot(gx - m.x, gy - m.y) > 20) stepTo(ctx, m, gx, gy, dt);
  }
}
function nearestTree(ctx, m) {
  const map = ctx.S.map, p = map.plots[plotIdx]; if (!p) return null;
  const pc = { x: (p.x + p.w / 2) * TILE, y: (p.y + p.h / 2) * TILE };
  let best = null, bd = 13 * TILE;
  for (const o of map.objects) {
    if (o.plot !== undefined) continue;
    if (o.type !== 'tree' && o.type !== 'pine' && o.type !== 'pine_s' && o.type !== 'deadtree') continue;
    const d2 = ctx.O[o.type], x = (o.x + d2.fw / 2) * TILE, y = (o.y + d2.fh) * TILE;
    if (x < 3 * TILE || y < 3 * TILE || x > (map.w - 3) * TILE || y > (map.h - 3) * TILE) continue;   // leave the border wall alone
    const d = Math.hypot(x - pc.x, y - pc.y);
    if (d < bd) { bd = d; best = o; }
  }
  return best;
}

// ---------------------------------------------------------------- the system
export const raidersLow = {
  id: 'raidersLow',

  onZoneEnter(ctx) {
    CTX = ctx;
    clearDam(ctx);
    mobs = []; loot = []; fx = []; tracks = []; climbSet = null; dam = null;
    plotIdx = -1; ruined = 0; cap = 0; repelledN = 0; raidT = 0;
    kind = ZKIND[ctx.S.zone.id] || null;
    stats(ctx);
    schedule(true);
    if (typeof window !== 'undefined') {
      window.__raidLow = (i) => startRaidNow(CTX, typeof i === 'number' ? i : -1);
      window.__raidLowSpr = SPR;
      window.__raidLowState = () => ({
        kind, phase, timer: Math.round(timer), raidT: Math.round(raidT), plot: plotIdx, mobs: mobs.filter(m => !m.gone).length, ruined, cap, loot: loot.length, dam: !!dam,
        lootAt: loot.map(l => ({ x: Math.round(l.x), y: Math.round(l.y), n: l.n })),
        damAt: dam ? dam.tiles.map(t => [t.x, t.y]) : null,
        m: mobs.slice(0, 4).map(m => ({ st: m.st, job: m.job, x: Math.round(m.x), y: Math.round(m.y), wp: m.wp.length, t: m.target ? m.target.piece + '@' + m.target.x + ',' + m.target.y + ':' + (m.target.hp ?? '-') : null, h: m.hits, held: m.held || null }))
      });
    }
  },

  onZoneLeave(ctx) {
    clearDam(ctx);
    mobs = []; loot = []; fx = []; tracks = []; climbSet = null;
    phase = 'idle'; plotIdx = -1; kind = null;
  },

  update(dt, ctx) {
    CTX = ctx;
    updateFx(dt);
    if (!kind || ctx.S.mode !== 'play') return;
    updateLoot(dt, ctx);

    if (phase === 'idle') {
      timer -= dt;
      if (timer <= 0) { startRaidNow(ctx); if (phase === 'idle') schedule(false); }   // nothing to raid here — try again later
      return;
    }

    if (phase === 'warn') {
      timer -= dt;
      dustT -= dt;                                                   // dust and tracks along the way in
      if (dustT <= 0 && spawnPt && aimPt) {
        dustT = 0.22;
        const k = Math.max(0, Math.min(1, 1 - timer / warnDur()));
        const x = spawnPt.x + (aimPt.x - spawnPt.x) * k + (Math.random() - 0.5) * 12;
        const y = spawnPt.y + (aimPt.y - spawnPt.y) * k + (Math.random() - 0.5) * 12;
        puff(x, y, 3); tracks.push({ x, y, t: 6, life: 6, s: 2 });
      }
      if (timer <= 0) spawnPack(ctx);
      return;
    }

    // phase === 'raid'
    raidT += dt;
    for (const m of mobs) { if (!m.gone) { try { updateMob(dt, ctx, m); } catch (e) { console.error('raidersLow mob', e); m.gone = true; } } }
    mobs = mobs.filter(m => !m.gone);
    if (raidT > RAID_MAX) for (const m of mobs) if (m.st !== 'flee') fleeOff(ctx, m);
    if (!mobs.length || raidT > RAID_MAX + 25) endRaid(ctx);
  },

  near(ctx) {
    if (phase !== 'raid' || !mobs.length) return null;
    const p = ctx.S.player, S = L(ctx);
    let best = null, bd = Infinity;
    for (const m of mobs) {
      if (m.gone || m.st === 'travel' || (m.st === 'flee' && !m.held)) continue;
      const d = Math.hypot(m.x - p.x, m.y - p.y);
      if (d < 24 && d < bd) { bd = d; best = m; }
    }
    if (!best) return null;
    let label = S.shoo;
    if (best.kind === 'monkey') label = carryArr(ctx).some(it => kindOf(it) === 'fish') ? S.giveFish : S.catchM;
    else if (best.kind === 'boar') label = hasAxe(ctx) ? S.hitAxe : S.needAxe;
    else if (best.kind === 'beaver') label = (!carryArr(ctx).length && woodOf(ctx) >= 5) ? S.offerWood : (hasAxe(ctx) ? S.hitAxe : S.needAxe);
    return { label, x: best.x, y: best.y - 6, limit: 24, priority: true, data: { mob: best } };
  },

  interact(ctx, cand) {
    const m = cand && cand.data && cand.data.mob;
    if (!m || m.gone || (m.st === 'flee' && !m.held)) return;
    const S = L(ctx);
    if (m.kind === 'rat') { repel(ctx, m, false); return; }
    if (m.kind === 'monkey') {
      const c = carryArr(ctx), i = c.findIndex(it => kindOf(it) === 'fish');
      if (i >= 0) {                                                    // pay the troop off with a fish
        c.splice(i, 1); syncCarry(ctx);
        ctx.toast(S.fishPaid, true);
        for (const q of mobs) if (!q.gone && q.st !== 'flee') { if (q.held) { putCarry(ctx, q.held); q.held = null; } fleeOff(ctx, q); }
        return;
      }
      repel(ctx, m, false); return;
    }
    if (m.kind === 'beaver' && !carryArr(ctx).length && woodOf(ctx) >= 5) {
      addWood(ctx, -5); ctx.toast(S.bribed, true);
      m.gift = true; fleeOff(ctx, m); return;
    }
    if (!hasAxe(ctx)) { ctx.toast(S.needAxe); return; }
    hitMob(ctx, m);
  },

  drawables(ctx, cx, cy) {
    const out = [], g = ctx.g, VW = ctx.VW, VH = ctx.VH;
    if (dam) for (const t of dam.tiles) {                          // one drawable per tile so it sorts row by row
      const x = t.x * TILE - cx, y = t.y * TILE - cy;
      out.push({
        y: (t.y + 1) * TILE, f: () => {
          g.fillStyle = OUT; g.fillRect(x, y + 1, TILE, 14);
          g.fillStyle = '#5f3d1c'; g.fillRect(x + 1, y + 2, 14, 12);
          g.fillStyle = '#8a5a2b'; for (let i = 0; i < 3; i++) g.fillRect(x + 1, y + 3 + i * 4, 14, 2);
          g.fillStyle = '#c9a86b'; g.fillRect(x + 3, y + 2, 2, 12); g.fillRect(x + 10, y + 2, 2, 12);
        }
      });
    }
    for (const l of loot) {
      const sx = l.x - cx, sy = l.y - cy;
      if (sx < -30 || sy < -30 || sx > VW + 30 || sy > VH + 30) continue;
      const img = SPR.wood[(l.ft | 0) % 2][0], bob = Math.sin(l.ft) * 1.2;
      const dx = Math.round(l.x) - (img.width >> 1) - cx, dy = Math.round(l.y + bob) - img.height - cy;
      out.push({
        y: l.y, f: () => {
          g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(Math.round(l.x) - cx, Math.round(l.y) - cy, 5, 2, 0, 0, TAU); g.fill();
          g.drawImage(img, dx, dy);
        }
      });
    }
    for (const m of mobs) {
      if (m.gone) continue;
      const sx = m.x - cx, sy = m.y - cy;
      if (sx < -40 || sy < -60 || sx > VW + 40 || sy > VH + 40) continue;
      const img = dirFrame(SPR[m.kind], m.face, m.ft, true) || SPR[m.kind][m.fr][m.dir < 0 ? 1 : 0];   /* plan-11 */
      const dx = Math.round(m.x) - (img.width >> 1) - cx, dy = Math.round(m.y) - img.height - cy;
      const held = m.held ? ICON[kindOf(m.held)] : null;
      const hy = dy - 10 + Math.round(Math.sin(m.ft * 2) * 1);
      out.push({
        y: m.y, f: () => {
          g.fillStyle = 'rgba(0,0,0,.22)';
          g.beginPath(); g.ellipse(Math.round(m.x) - cx, Math.round(m.y) - cy, img.width * 0.35, img.width * 0.14, 0, 0, TAU); g.fill();
          g.drawImage(img, dx, dy);
          if (held) g.drawImage(held, Math.round(m.x) - 4 - cx, hy);
        }
      });
    }
    return out;
  },

  draw(g, ctx, cx, cy) {
    for (const t of tracks) {                                        // paw prints fading on the ground
      g.globalAlpha = Math.max(0, t.t / t.life) * 0.4;
      g.fillStyle = '#2a2016';
      g.fillRect(Math.round(t.x) - cx, Math.round(t.y) - cy, t.s, Math.max(1, t.s - 1));
    }
    for (const p of fx) {
      const k = Math.max(0, p.t / p.life), x = Math.round(p.x) - cx, y = Math.round(p.y) - cy;
      g.globalAlpha = Math.min(1, k * 1.2);
      if (p.box) { g.fillStyle = OUT; g.fillRect(x - 1, y - 1, 3, 3); g.fillStyle = p.c; g.fillRect(x, y, 2, 2); }
      else { g.fillStyle = p.c || 'rgba(210,196,170,.9)'; g.beginPath(); g.arc(x, y, p.r * (0.6 + (1 - k) * 0.8), 0, TAU); g.fill(); }
    }
    g.globalAlpha = 1;
  },

  drawUI(ug, ctx, cx, cy, scale) {
    if (!kind || (phase !== 'raid' && phase !== 'warn')) return;
    const S = L(ctx), W = ug.canvas.width;
    ug.save();
    ug.textAlign = 'center'; ug.textBaseline = 'middle';
    // hit pips over the tough ones
    for (const m of mobs) {
      if (m.gone || m.st === 'flee') continue;
      const total = CONF[m.kind].hits; if (total < 2) continue;
      const left = Math.max(0, total - m.hits);
      const bx = Math.round((m.x - cx) * scale), by = Math.round((m.y - (m.kind === 'beaver' ? 22 : 20) - cy) * scale);
      if (bx < -60 || bx > W + 60) continue;
      const r = Math.max(2, Math.round(scale * 1.1)), gap = r * 3;
      const x0 = bx - ((total - 1) * gap) / 2;
      for (let i = 0; i < total; i++) {
        ug.beginPath(); ug.arc(x0 + i * gap, by, r, 0, TAU);
        ug.fillStyle = i < left ? '#ff6b6b' : 'rgba(30,26,40,.55)'; ug.fill();
        ug.strokeStyle = 'rgba(13,11,20,.75)'; ug.lineWidth = 1; ug.stroke();
      }
    }
    // a small chip: what is out there and how long it stays
    const alive = mobs.filter(m => !m.gone && m.st !== 'flee').length;
    if (phase === 'raid' && alive) {
      const fs = Math.max(11, Math.round(scale * 3.4));
      ug.font = `bold ${fs}px "Segoe UI",system-ui,sans-serif`;
      const txt = S.chip(CONF[kind].icon, `${S.name[kind]} ×${alive}`, Math.max(0, Math.ceil(RAID_MAX - raidT)));
      // sits between the toast (top: 60) and Rocky's timer bar (y: 122)
      const w = ug.measureText(txt).width + fs * 1.4, h = fs * 1.8, x = Math.round((W - w) / 2), y = Math.round(Math.max(96, scale * 24));
      ug.fillStyle = 'rgba(13,11,20,.78)'; ug.beginPath(); ug.roundRect(x, y, w, h, 6); ug.fill();
      ug.strokeStyle = 'rgba(255,107,107,.5)'; ug.lineWidth = 1; ug.stroke();
      ug.fillStyle = '#f2ebe0'; ug.fillText(txt, x + w / 2, y + h / 2 + 1);
    }
    ug.restore();
  }
};
