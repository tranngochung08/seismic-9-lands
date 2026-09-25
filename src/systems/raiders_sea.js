// raiders_sea.js — the Sea of Origins fights back (tier 0 of the "higher land = scarier" raider ladder).
//   · the Kraken — rises out of the deep trenches while you drift on the raft, far from shore. Four tentacles
//                  surface around the raft and take turns slamming the water; a slam within a tile costs the
//                  raft one plank of hp. Strike a tentacle (E, two hits each), throw the head a fish, outrun
//                  it (10 tiles) or ride a current for 3 s. Kill all four → Kraken ink + 6 stones.
//   · the ghost ship — a pale pirate wreck that sails a loop at night. Pulls alongside the raft and takes
//                  3 seismic stones. Carry rope and grapple it first (E): pick one of three chests in its hold.
// See systems/API.md ("The Sea of Origins"). Reads S.sea (owned by sea_raft.js) and only ever lowers
// S.sea.raft.hp — the raft system handles sinking. No screen shake, no flashes; warnings are the red HUD line.
import { mkCanvas, HOOK } from '../gfx.js';

// ---------------------------------------------------------------- strings
const STR = {
  en: {
    stir: '🦑 The Kraken stirs…', rise: 'Tentacles break the surface around the raft!',
    strike: 'Strike', feed: 'Throw a fish 🐟', grapple: 'Grapple the ship (🪢1)',
    slam: 'The raft takes a hit!', tentDown: n => n ? `A tentacle sinks — ${n} left` : 'The last tentacle sinks!',
    win: 'The Kraken retreats! 🦑 Kraken ink +1 · 🪨 +6', fed: 'The Kraken takes the fish and sinks away, content.',
    fled: 'You outran the Kraken.', current: 'The current carries you out of its reach.', tired: 'The Kraken sinks back into the deep.',
    hud: (n, s) => `🦑 ${n} tentacle${n === 1 ? '' : 's'} · ${s}s`,
    shipNear: '👻 A ghost ship pulls alongside…', boarded: n => `Ghost pirates boarded you — 🪨 −${n}!`, boardedNone: 'Ghost pirates boarded you — found nothing to take.',
    shipGone: 'The ghost ship fades into the mist.',
    holdTitle: 'Ghost ship hold', holdHint: 'Grapple set. Pick one covered chest — the ship vanishes after.', chest: 'Chest', close: 'Close',
    prizeCard: n => `A rare art card: ${n}!`, prizePearl: '3 pearls 🫧', prizeStone: '10 seismic stones 🪨',
    cardLabel: 'Rare card', pearlLabel: 'Pearls ×3', stoneLabel: 'Stones ×10'
  },
  vi: {
    stir: '🦑 Kraken đang trỗi dậy…', rise: 'Xúc tu trồi lên quanh bè!',
    strike: 'Đánh', feed: 'Ném cá 🐟', grapple: 'Móc tàu (🪢1)',
    slam: 'Bè trúng đòn!', tentDown: n => n ? `Một xúc tu chìm — còn ${n}` : 'Xúc tu cuối cùng chìm!',
    win: 'Kraken rút lui! 🦑 Mực Kraken +1 · 🪨 +6', fed: 'Kraken đớp cá rồi lặn mất, no nê.',
    fled: 'Bạn đã bỏ xa Kraken.', current: 'Dòng chảy đưa bạn thoát khỏi tầm với của nó.', tired: 'Kraken chìm lại xuống vực sâu.',
    hud: (n, s) => `🦑 ${n} xúc tu · ${s}s`,
    shipNear: '👻 Tàu ma đang áp sát…', boarded: n => `Cướp biển ma nhảy lên bè — 🪨 −${n}!`, boardedNone: 'Cướp biển ma nhảy lên bè — chẳng có gì để lấy.',
    shipGone: 'Tàu ma tan vào sương.',
    holdTitle: 'Khoang tàu ma', holdHint: 'Đã móc được tàu. Chọn một rương — sau đó tàu biến mất.', chest: 'Rương', close: 'Đóng',
    prizeCard: n => `Thẻ tranh hiếm: ${n}!`, prizePearl: '3 ngọc trai 🫧', prizeStone: '10 đá Seismic 🪨',
    cardLabel: 'Thẻ hiếm', pearlLabel: 'Ngọc trai ×3', stoneLabel: 'Đá ×10'
  }
};
const L = ctx => STR[ctx.lang() === 'vi' ? 'vi' : 'en'];

// ---------------------------------------------------------------- sprites (built once, at module load)
const TILE = 16, TAU = Math.PI * 2, OUT = '#1c1a24';
const px = (g, x, y, c, w = 1, h = 1) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
function flip(src) { const c = mkCanvas(src.width, src.height), g = c.getContext('2d'); g.translate(src.width, 0); g.scale(-1, 1); g.drawImage(src, 0, 0); return c; }
function build(w, h, fn, frames) { return frames.map(f => { const c = mkCanvas(w, h); fn(c.getContext('2d'), f); return [c, flip(c)]; }); } // [frame][0=right,1=left]

// a tentacle is a tapering spine: 16×32, dark purple, pale suckers down one side
//   frame 0/1 sway · 2 wind-up (tip curls back) · 3 lash (leaning, shorter — it is in the water)
function tentacleArt(g, f) {
  const B = '#4a2a6a', LT = '#6e44a0', D = '#33184d', SK = '#e6b8ef', SD = '#a06fc0';
  const curve = s => {
    if (f === 2) return { x: 8 + s * 4 - (s > 0.7 ? (s - 0.7) * 30 : 0), y: 31 - s * 28 + (s > 0.7 ? (s - 0.7) * 12 : 0) };
    if (f === 3) return { x: 8 - s * 6, y: 31 - s * 20 };
    return { x: 8 + Math.sin(s * 4.5 + (f ? Math.PI : 0)) * 2.2 * (0.3 + s), y: 31 - s * 29 };
  };
  const wOf = s => 7 - s * 5;
  const N = 48;
  for (let i = 0; i <= N; i++) { const s = i / N, p = curve(s), w = wOf(s) + 2; g.fillStyle = OUT; g.fillRect(Math.round(p.x - w / 2), Math.round(p.y - 1), Math.round(w), 3); }
  for (let i = 0; i <= N; i++) { const s = i / N, p = curve(s), w = wOf(s); g.fillStyle = s > 0.85 ? D : B; g.fillRect(Math.round(p.x - w / 2), Math.round(p.y), Math.round(w), 1); }
  for (let i = 0; i <= N; i++) { const s = i / N, p = curve(s), w = wOf(s); if (w > 3) px(g, Math.round(p.x + w / 2 - 2), Math.round(p.y), LT, 1, 1); } // highlight edge
  for (let i = 2; i < N; i += 5) { const s = i / N, p = curve(s), w = wOf(s); if (w < 3) continue; const sx = Math.round(p.x - w / 2 + 1), sy = Math.round(p.y); px(g, sx, sy, SD, 2, 1); px(g, sx, sy - 1, SK, 1, 1); }
}
// the Kraken's head: 32×24 — a dark dome, two slit yellow eyes, froth where it breaks the surface
function headArt(g) {
  const TOP = '#5a3488', MID = '#43266f', LOW = '#341c58', E = '#ffd45e', F = '#dff3ff';
  for (let y = 0; y < 17; y++) {
    const k = (y - 11) / 12, hw = Math.sqrt(Math.max(0, 1 - k * k)) * 14;
    const x0 = Math.round(16 - hw), w = Math.round(hw * 2); if (w <= 0) continue;
    px(g, x0 - 1, y, OUT, w + 2, 1); if (y > 0) px(g, x0, y, y < 6 ? TOP : y < 12 ? MID : LOW, w, 1);
  }
  px(g, 12, 2, '#7d55b0', 6, 1); px(g, 10, 3, '#7d55b0', 3, 1);                          // sheen
  px(g, 7, 8, OUT, 7, 6); px(g, 8, 9, E, 5, 4); px(g, 10, 9, OUT, 1, 4);                  // eyes
  px(g, 18, 8, OUT, 7, 6); px(g, 19, 9, E, 5, 4); px(g, 21, 9, OUT, 1, 4);
  px(g, 8, 9, '#fff2b0', 1, 1); px(g, 19, 9, '#fff2b0', 1, 1);
  px(g, 14, 14, OUT, 4, 2); px(g, 15, 14, '#1a0b2c', 2, 1);                               // beak
  for (const [x, w] of [[3, 5], [10, 4], [18, 5], [25, 4]]) { px(g, x, 17, LOW, w, 3); px(g, x, 17, OUT, 1, 3); px(g, x + w - 1, 17, OUT, 1, 3); px(g, x, 20, OUT, w, 1); }
  for (let x = 0; x < 32; x += 3) px(g, x, 16 + ((x / 3) | 0) % 2, F, 2, 1);               // froth line
  px(g, 1, 21, F, 3, 1); px(g, 27, 22, F, 4, 1); px(g, 12, 22, F, 2, 1);
}
// the ghost ship: 64×40, pale hull, ragged sails, skull flag, a lantern on the stern (drawn semi-transparent)
function shipArt(g) {
  const H = '#c9d3e6', HD = '#a9b6cf', HL = '#e6ecf7', M = '#8a96ad', SL = '#eef2fa', SD = '#d4dcea', LN = '#ffd45e';
  for (let y = 26; y <= 36; y++) { const x0 = 3 + ((y - 26) * 0.9) | 0, x1 = 61 - (((y - 26) * 0.5) | 0); px(g, x0 - 1, y, OUT, x1 - x0 + 2, 1); px(g, x0, y, (y - 26) % 3 === 2 ? HD : H, x1 - x0, 1); }
  px(g, 2, 26, OUT, 60, 1); px(g, 3, 25, HL, 58, 1); px(g, 2, 24, OUT, 60, 1);          // deck + rail
  for (let i = 0; i < 7; i++) { px(g, 56 + i, 19 + i, OUT, 2, 1); px(g, 57 + i, 20 + i, H, 1, 1); } // rising bow
  px(g, 61, 18, OUT, 3, 2); px(g, 62, 16, HL, 1, 3);                                     // bowsprit tip
  px(g, 5, 17, OUT, 13, 8); px(g, 6, 18, HD, 11, 6); px(g, 8, 20, LN, 2, 2); px(g, 13, 20, LN, 2, 2); // stern cabin, lit windows
  px(g, 20, 30, OUT, 3, 2); px(g, 36, 30, OUT, 3, 2); px(g, 48, 30, OUT, 3, 2);          // gun ports
  px(g, 22, 1, OUT, 4, 24); px(g, 23, 2, M, 2, 22); px(g, 42, 5, OUT, 4, 20); px(g, 43, 6, M, 2, 18); // masts
  px(g, 12, 5, OUT, 22, 15); px(g, 13, 6, SL, 20, 13); px(g, 13, 14, SD, 20, 5);        // main sail
  px(g, 34, 9, OUT, 16, 11); px(g, 35, 10, SL, 14, 9); px(g, 35, 15, SD, 14, 4);         // fore sail
  for (const [x, y, w, h] of [[15, 16, 3, 3], [27, 17, 4, 2], [19, 9, 2, 2], [40, 17, 3, 2], [45, 12, 2, 2], [30, 12, 2, 1]]) g.clearRect(x, y, w, h); // rags and holes
  for (const [x, y] of [[14, 18], [22, 18], [31, 18], [37, 18], [47, 18]]) { g.clearRect(x, y, 2, 2); }
  px(g, 26, 0, OUT, 10, 6); px(g, 27, 1, '#2b2735', 8, 4); px(g, 29, 1, '#f4f1ff', 3, 3); px(g, 30, 2, OUT, 1, 1); px(g, 29, 4, '#f4f1ff', 1, 1); px(g, 31, 4, '#f4f1ff', 1, 1); // skull flag
  for (let i = 0; i < 36; i++) px(g, 25 + i, 2 + ((i * 22 / 36) | 0), '#dfe6f2', 1, 1);   // forestay to the bow
  px(g, 3, 12, OUT, 3, 12); px(g, 4, 13, M, 1, 10);                                      // lantern post
  px(g, 1, 9, OUT, 6, 5); px(g, 2, 10, LN, 4, 3); px(g, 3, 10, '#fff2b0', 2, 1);          // the lantern
}
const SPR = {
  tent: HOOK.creature('kraken_tent', build(16, 32, tentacleArt, [0, 1, 2, 3])),   // art.js thay ảnh PixelLab tại chỗ
  head: HOOK.image('kraken_head', (() => { const c = mkCanvas(32, 24); headArt(c.getContext('2d')); return c; })()),
  ship: HOOK.creature('ghost_ship', [(() => { const c = mkCanvas(64, 40); shipArt(c.getContext('2d')); return [c, flip(c)]; })()])[0]
};

// ---------------------------------------------------------------- tuning
const K_NEXT = [70, 110], K_RETRY = 10, K_MAX = 30;    // seconds between attacks · retry when not far enough out · attack cap
const K_RISE = 1.6, SLAM_EVERY = 2.5, WIND = 0.7, LASH = 0.45, TENT_HP = 2;
const RING_R = 40, FOLLOW = 14, HEAD_D = 60, FLEE_D = 10 * TILE, CUR_T = 3, SLAM_HIT = TILE, SLAM_JIT = 0.9 * TILE;
const SHORE_ROW = 50, SHORE_D = 12, DOCK_D = 6;         // the Kraken wants you ≥12 tiles from the shore rows, away from the dock
const SHIP_SP = 1.5 * TILE, CHASE_R = 12 * TILE, BOARD_R = 2 * TILE, BOARD_T = 2, GRAPPLE_R = 2.5 * TILE, LEAVE = 60, LEAVE_GRAPPLE = 120, NIGHT = 0.08;
const LOOP = [[24, 9], [48, 7], [60, 17], [54, 32], [48, 46], [30, 50], [16, 44], [22, 30], [8, 16]];  // patrol loop, open water only (checked at zone enter)
const rand = (a, b) => a + Math.random() * (b - a);
const testOn = () => typeof window !== 'undefined' && !!window.__seaRaidTest;

// ---------------------------------------------------------------- module state
let CTX = null, live = false;     // live: we are in the sea zone
let K = null;                     // the Kraken attack: { phase, t, tents[], head, slamT, turn, curT, sinkT, forced }
let ship = null;                  // { x, y, wp, dir, fade, st:'hidden'|'sail'|'leave', leaveT, boardT, bob, force, alertT, loop[] }
let kTimer = 0;                   // seconds until the next Kraken attack
let fx = [], rings = [];
let hold = null;                  // grapple panel state { el, picked }
let testPassable = false;         // we set player.passable ourselves (test mode only) → restore on leave

// ---------------------------------------------------------------- helpers
function stats(ctx) {
  const sv = ctx.S.save; sv.sys = sv.sys || {};
  sv.sys.raidersSea = { attacks: 0, kills: 0, fed: 0, fled: 0, boarded: 0, grappled: 0, ...(sv.sys.raidersSea || {}) };
  return sv.sys.raidersSea;
}
const tileOf = v => Math.floor(v / TILE);
function isWater(ctx, tx, ty) { const t = ctx.getG(ctx.S.map, tx, ty), T = ctx.T; return t === T.WATER || t === T.DEEP || t === T.REEF; }
function onRaft(ctx) {
  const S = ctx.S, p = S.player;
  return !!(S.map && S.map.sea && S.sea && S.sea.riding === 'raft' && !S.sea.diving && isWater(ctx, tileOf(p.x), tileOf(p.y)));
}
function farOut(ctx) {                                        // far enough from the shore and the dock for the Kraken
  const p = ctx.S.player, ty = tileOf(p.y), d = ctx.S.map.dock;
  if (ty > SHORE_ROW - SHORE_D) return false;
  if (d && Math.hypot(tileOf(p.x) - d.x, ty - d.y) < DOCK_D) return false;
  return true;
}
function flowAt(ctx, x, y) { const m = ctx.S.map, tx = tileOf(x), ty = tileOf(y); if (!m.flow || tx < 0 || ty < 0 || tx >= m.w || ty >= m.h) return 0; return m.flow[ty * m.w + tx]; }
function nearestDeep(ctx, x, y, r = 14) {
  const m = ctx.S.map, tx = tileOf(x), ty = tileOf(y); let best = null, bd = Infinity;
  for (let j = Math.max(0, ty - r); j <= Math.min(m.h - 1, ty + r); j++) for (let i = Math.max(0, tx - r); i <= Math.min(m.w - 1, tx + r); i++) {
    if (ctx.getG(m, i, j) !== ctx.T.DEEP) continue;
    const d = Math.hypot(i - tx, j - ty); if (d < bd) { bd = d; best = { x: i * TILE + 8, y: j * TILE + 8 }; }
  }
  return best;
}
const fishIndex = ctx => ctx.carry.get().findIndex(it => (typeof it === 'string' ? it : it && it.kind) === 'fish');
// test mode only: the raft system may still be a stub, so give ourselves a raft and a way to move on water
function ensureTestSea(ctx) {
  if (!testOn() || !ctx.S.map || !ctx.S.map.sea || ctx.S.sea) return;      // a real raft system owns S.sea → never touch the player
  ctx.S.sea = { raft: { hp: 6, max: 6, sail: false }, riding: 'raft', diving: false };
  const T = ctx.T; ctx.S.player.passable = (m, tx, ty) => [T.WATER, T.DEEP, T.REEF, T.SAND, T.DOCK].includes(ctx.getG(m, tx, ty)); testPassable = true;
}

// ---------------------------------------------------------------- particles
function splash(x, y, big) {
  rings.push({ x, y, r: big ? 6 : 3, r1: big ? 30 : 16, t: 0, life: big ? 0.9 : 0.6, c: '223,243,255' });
  if (big) rings.push({ x, y, r: 2, r1: 18, t: -0.15, life: 0.7, c: '255,255,255' });
  const n = big ? 14 : 6;
  for (let i = 0; i < n; i++) { const a = Math.random() * TAU, sp = 20 + Math.random() * (big ? 50 : 25); fx.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.5 - (big ? 60 : 30), gy: 160, t: 0, life: 0.45 + Math.random() * 0.3, c: '#dff3ff', r: 1 }); }
}
function ink(x, y, n = 12) {
  for (let i = 0; i < n; i++) { const a = Math.random() * TAU, sp = 6 + Math.random() * 18; fx.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.6, gy: 0, t: 0, life: 0.9 + Math.random() * 0.6, c: 'rgba(30,16,50,.85)', r: 2 + Math.random() * 2.5, blob: true }); }
}
function updateFx(dt) {
  for (let i = fx.length - 1; i >= 0; i--) { const p = fx[i]; p.t += dt; if (p.t >= p.life) { fx.splice(i, 1); continue; } p.x += p.vx * dt; p.y += p.vy * dt; p.vy += p.gy * dt; p.vx *= 1 - dt * 1.5; }
  for (let i = rings.length - 1; i >= 0; i--) { rings[i].t += dt; if (rings[i].t >= rings[i].life) rings.splice(i, 1); }
  if (fx.length > 160) fx.splice(0, fx.length - 160);
}

// ---------------------------------------------------------------- the Kraken
function startKraken(ctx, forced) {
  if (K || !live || !ctx.S.sea) return 'no sea state';
  const p = ctx.S.player, S = L(ctx);
  const deep = nearestDeep(ctx, p.x, p.y) || { x: p.x, y: p.y - HEAD_D };
  const ha = Math.atan2(deep.y - p.y, deep.x - p.x);
  K = {
    phase: 'rise', t: 0, slamT: 1.2, turn: 0, curT: 0, sinkT: 0, forced: !!forced,
    head: { x: p.x + Math.cos(ha) * HEAD_D, y: p.y + Math.sin(ha) * HEAD_D, rise: 0 },
    tents: [0, 1, 2, 3].map(i => { const a = ha + Math.PI / 4 + i * Math.PI / 2; return { ang: a, x: p.x + Math.cos(a) * RING_R, y: p.y + Math.sin(a) * RING_R, hp: TENT_HP, rise: 0, st: 'rise', a: 0, ft: Math.random() * 3, hitCd: 0, sx: 0, sy: 0 }; })
  };
  ctx.alert(S.stir, 3); ctx.sfx('roar');
  const st = stats(ctx); st.attacks++; ctx.persist();
  return 'kraken rising';
}
function liveTents() { return K ? K.tents.filter(t => t.st !== 'dead') : []; }
function endKraken(ctx, why) {
  if (!K) return;
  const S = L(ctx), st = stats(ctx);
  if (why === 'win') { ctx.bag.add('ink', 1); ctx.bag.add('stone', 6); st.kills++; ctx.toast(S.win, true); ctx.sfx('win'); }
  else if (why === 'fed') { st.fed++; ctx.toast(S.fed, true); ctx.sfx('splash'); }
  else if (why === 'fled') { st.fled++; ctx.toast(S.fled); }
  else if (why === 'current') { st.fled++; ctx.toast(S.current); }
  else if (why === 'tired') ctx.toast(S.tired);
  ctx.persist(); ctx.alert('');
  K.phase = 'sink'; K.sinkT = 0; K.why = why;
  for (const t of K.tents) if (t.st !== 'dead') { t.st = 'sway'; }
  kTimer = rand(K_NEXT[0], K_NEXT[1]);
}
function damageRaft(ctx) {
  const sea = ctx.S.sea; if (!sea || !sea.raft) return;
  sea.raft.hp = Math.max(0, (sea.raft.hp || 0) - 1);
  ctx.sfx('hit'); ctx.toast(L(ctx).slam);
}
function updateKraken(dt, ctx) {
  const p = ctx.S.player, sea = ctx.S.sea;
  if (K.phase === 'sink') {                                            // tentacles slide back under
    K.sinkT += dt;
    for (const t of K.tents) t.rise = Math.max(0, t.rise - dt * 1.4);
    K.head.rise = Math.max(0, K.head.rise - dt * 1.4);
    if (K.sinkT > 0.9) K = null;
    return;
  }
  if (!sea || (sea.raft && sea.raft.hp <= 0)) { endKraken(ctx, 'sunk'); return; }    // the raft system takes over from here
  K.t += dt;
  for (const t of K.tents) { t.ft += dt; if (t.hitCd > 0) t.hitCd -= dt; }
  if (K.phase === 'rise') {
    const k = Math.min(1, K.t / K_RISE);
    for (const t of K.tents) { t.rise = Math.min(1, k * 1.15); if (t.rise >= 1) t.st = 'sway'; }
    K.head.rise = Math.min(1, Math.max(0, (K.t - 0.4) / 1.2));
    if (K.t >= K_RISE) { K.phase = 'attack'; K.t = 0; ctx.toast(L(ctx).rise); for (const t of K.tents) t.st = 'sway'; }
    return;
  }
  // --- attack ---
  if (K.t > K_MAX) { endKraken(ctx, 'tired'); return; }
  const alive = liveTents();
  // the arms drift after the raft, slowly — the raft can outrun them
  for (const t of alive) {
    if (t.st !== 'sway') continue;
    const gx = p.x + Math.cos(t.ang) * RING_R, gy = p.y + Math.sin(t.ang) * RING_R, dx = gx - t.x, dy = gy - t.y, d = Math.hypot(dx, dy);
    if (d > 2) { const s = Math.min(d, FOLLOW * dt); t.x += dx / d * s; t.y += dy / d * s; }
  }
  { const h = K.head, dx = h.x - p.x, dy = h.y - p.y, d = Math.hypot(dx, dy) || 1; const gx = p.x + dx / d * HEAD_D, gy = p.y + dy / d * HEAD_D; const ex = gx - h.x, ey = gy - h.y, e = Math.hypot(ex, ey); if (e > 1) { const s = Math.min(e, 10 * dt); h.x += ex / e * s; h.y += ey / e * s; } }
  // escape: distance, or a current stream for 3 s
  const cx = alive.length ? alive.reduce((a, t) => a + t.x, 0) / alive.length : K.head.x, cy = alive.length ? alive.reduce((a, t) => a + t.y, 0) / alive.length : K.head.y;
  if (Math.hypot(p.x - cx, p.y - cy) >= FLEE_D) { endKraken(ctx, 'fled'); return; }
  if (flowAt(ctx, p.x, p.y)) { K.curT += dt; if (K.curT >= CUR_T) { endKraken(ctx, 'current'); return; } } else K.curT = Math.max(0, K.curT - dt);
  // one tentacle at a time winds up and lashes the water beside the raft
  const busy = alive.find(t => t.st === 'wind' || t.st === 'lash');
  if (busy) {
    busy.a += dt;
    if (busy.st === 'wind' && busy.a >= WIND) {
      busy.st = 'lash'; busy.a = 0;
      const hit = onRaft(ctx) && Math.hypot(p.x - busy.sx, p.y - busy.sy) <= SLAM_HIT;
      splash(busy.sx, busy.sy, true); ctx.sfx('splash');
      if (hit) damageRaft(ctx);
      K.slamT = SLAM_EVERY;
    } else if (busy.st === 'lash' && busy.a >= LASH) { busy.st = 'sway'; busy.a = 0; }
  } else if (alive.length) {
    K.slamT -= dt;
    if (K.slamT <= 0) {
      const t = alive[K.turn++ % alive.length];
      t.st = 'wind'; t.a = 0;
      const ja = Math.random() * TAU, jr = Math.random() * SLAM_JIT;                    // aimed at the raft as it is now — move and it misses
      t.sx = p.x + Math.cos(ja) * jr; t.sy = p.y + Math.sin(ja) * jr;
    }
  }
}
function strike(ctx, t) {
  if (!K || K.phase !== 'attack' || t.st === 'dead' || t.hitCd > 0) return;
  t.hitCd = 0.35; t.hp--; ctx.sfx('hit'); ctx.S.player.faceTo(t.x, t.y);
  ink(t.x, t.y - 10, 5); splash(t.x, t.y, false);
  if (t.hp <= 0) {
    t.st = 'dead'; ink(t.x, t.y - 6, 16);
    const left = liveTents().length; ctx.toast(L(ctx).tentDown(left));
    if (!left) endKraken(ctx, 'win');
  }
}

// ---------------------------------------------------------------- the ghost ship
function makeShip(ctx) {
  const m = ctx.S.map;
  const loop = LOOP.map(([x, y]) => { let tx = x, ty = y;                                // nudge onto water if the map put an islet here
    for (let r = 0; r < 6 && !isWater(ctx, tx, ty); r++) { tx = x + ((Math.random() * (2 * r + 1)) | 0) - r; ty = y + ((Math.random() * (2 * r + 1)) | 0) - r; }
    return { x: Math.max(1, Math.min(m.w - 2, tx)) * TILE + 8, y: Math.max(1, Math.min(m.h - 2, ty)) * TILE + 8 }; });
  const i = (Math.random() * loop.length) | 0;
  ship = { x: loop[i].x, y: loop[i].y, wp: (i + 1) % loop.length, dir: 1, fade: 0, st: 'hidden', leaveT: 0, boardT: 0, bob: Math.random() * TAU, force: false, alertT: 0, loop };
}
const shipVisibleWanted = ctx => testOn() || (ship && ship.force) || ctx.darkness() > NIGHT;
function shipAppear(ctx) {                                                                  // come in from the far side of the loop
  const p = ctx.S.player; let best = 0, bd = -1;
  ship.loop.forEach((w, i) => { const d = Math.hypot(w.x - p.x, w.y - p.y); if (d > bd) { bd = d; best = i; } });
  ship.x = ship.loop[best].x; ship.y = ship.loop[best].y; ship.wp = (best + 1) % ship.loop.length;
  ship.st = 'sail'; ship.fade = 0; ship.boardT = 0;
}
function shipLeave(ctx, secs, quiet) {
  ship.st = 'leave'; ship.leaveT = secs; ship.boardT = 0; ship.force = false;
  if (!quiet) ctx.toast(L(ctx).shipGone);
}
function boardRaft(ctx) {
  const S = L(ctx), st = stats(ctx);
  const n = ctx.bag.remove('stone', 3);
  ctx.toast(n > 0 ? S.boarded(n) : S.boardedNone, true); ctx.sfx('alarm');
  st.boarded++; ctx.persist(); ctx.alert('');
  shipLeave(ctx, LEAVE, true);
}
function updateShip(dt, ctx) {
  const p = ctx.S.player;
  ship.bob += dt * 1.6;
  if (ship.st === 'hidden') {
    if (ship.leaveT > 0) { ship.leaveT -= dt; return; }
    if (shipVisibleWanted(ctx)) shipAppear(ctx);
    return;
  }
  if (ship.st === 'leave') {
    ship.fade = Math.max(0, ship.fade - dt * 0.8);
    if (ship.fade <= 0) ship.st = 'hidden';
    return;
  }
  // st === 'sail'
  ship.fade = Math.min(1, ship.fade + dt * 0.6);
  if (!shipVisibleWanted(ctx)) { shipLeave(ctx, 0, true); return; }
  const raft = onRaft(ctx) && !(K && K.phase !== 'sink');
  const dp = Math.hypot(p.x - ship.x, p.y - ship.y);
  let gx, gy;
  if (raft && dp <= CHASE_R && ship.fade > 0.5) { gx = p.x; gy = p.y; }
  else { const w = ship.loop[ship.wp]; gx = w.x; gy = w.y; if (Math.hypot(w.x - ship.x, w.y - ship.y) < 6) ship.wp = (ship.wp + 1) % ship.loop.length; }
  const dx = gx - ship.x, dy = gy - ship.y, d = Math.hypot(dx, dy);
  if (d > BOARD_R - 4 || !raft) { const s = Math.min(d, SHIP_SP * dt); if (d > 0.01) { ship.x += dx / d * s; ship.y += dy / d * s; } }   // pulls up beside the raft, not on top of it
  if (Math.abs(dx) > 4) ship.dir = dx >= 0 ? 1 : -1;
  // alongside the raft for 2 s → boarded (grapple it before that)
  if (raft && dp <= BOARD_R && ship.fade >= 0.9) {
    ship.boardT += dt; ship.alertT -= dt;
    if (ship.alertT <= 0) { ctx.alert(L(ctx).shipNear, 2.5); ship.alertT = 1; }
    if (ship.boardT >= BOARD_T) boardRaft(ctx);
  } else ship.boardT = Math.max(0, ship.boardT - dt * 2);
}
// --- the treasure hold (grapple) ---
function openHold(ctx) {
  const S = L(ctx), st = stats(ctx);
  ctx.bag.remove('rope', 1); st.grappled++; ctx.persist(); ctx.sfx('build');
  const kinds = ['card', 'pearl', 'stone'].sort(() => Math.random() - 0.5);
  const html = `<h2>👻 ${S.holdTitle}</h2><p class="dim">${S.holdHint}</p>
    <div id="gs-chests" style="display:flex;gap:12px;justify-content:center;margin:12px 0">${kinds.map((k, i) => `<button class="btn" data-c="${i}" style="min-width:110px;font-size:26px;line-height:1.2">📦<div style="font-size:12px">${S.chest} ${i + 1}</div></button>`).join('')}</div>
    <p id="gs-res" style="min-height:1.4em;text-align:center"></p><button class="btn" id="gs-close">${S.close}</button>`;
  const el = ctx.panel('seaGrapple', html);
  hold = { el, picked: false };
  const close = () => { if (hold) { hold.el.hidden = true; hold = null; } if (ship) shipLeave(ctx, LEAVE_GRAPPLE, false); if (ctx.S.mode === 'grapple') ctx.setMode('play'); };
  el.querySelector('#gs-close').onclick = close;
  el.querySelector('#gs-chests').onclick = e => {
    const b = e.target.closest('[data-c]'); if (!b || !hold || hold.picked) return;
    hold.picked = true;
    const i = +b.getAttribute('data-c'); let k = kinds[i], text = '';
    if (k === 'card') {
      const cards = (ctx.S.save.cards ||= []);
      const pool = ctx.membersOfLevel(9).filter(m => !cards.includes(m.id));
      if (pool.length) { const m = pool[(Math.random() * pool.length) | 0]; cards.push(m.id); text = S.prizeCard(m.k || m.n); }
      else { k = 'stone'; kinds[i] = 'stone'; }
    }
    if (k === 'pearl') { ctx.bag.add('pearl', 3); text = S.prizePearl; }
    else if (k === 'stone') { ctx.bag.add('stone', 10); text = S.prizeStone; }
    ctx.persist(); ctx.toast(text, true); ctx.sfx('coin');
    const icon = { card: '🖼', pearl: '🫧', stone: '🪨' }, label = { card: S.cardLabel, pearl: S.pearlLabel, stone: S.stoneLabel };
    for (const bb of el.querySelectorAll('[data-c]')) { const j = +bb.getAttribute('data-c'); bb.innerHTML = `${icon[kinds[j]]}<div style="font-size:12px">${label[kinds[j]]}</div>`; bb.disabled = true; bb.style.opacity = j === i ? '1' : '.45'; if (j === i) bb.classList.add('primary'); }
    el.querySelector('#gs-res').textContent = text;
  };
  el.hidden = false;
  ctx.setMode('grapple');
  ctx.registerCloser('grapple', close);
}

// ---------------------------------------------------------------- drawing helpers
function drawTent(g, t, sx, sy) {
  const fr = t.st === 'wind' ? 2 : t.st === 'lash' ? 3 : (Math.floor(t.ft * 2.5) % 2);
  const img = SPR.tent[fr][t.x < (K ? K.head.x : t.x) ? 0 : 1];
  const sh = Math.max(1, Math.round(32 * t.rise));
  g.fillStyle = 'rgba(20,30,80,.35)'; g.beginPath(); g.ellipse(sx, sy, 7, 3, 0, 0, TAU); g.fill();
  g.drawImage(img, 0, 32 - sh, 16, sh, sx - 8, sy - sh + 2, 16, sh);
  g.fillStyle = 'rgba(223,243,255,.7)'; g.fillRect(sx - 6, sy + 1, 3, 1); g.fillRect(sx + 3, sy, 3, 1);       // froth at the waterline
}

// ---------------------------------------------------------------- the system
export const raidersSea = {
  id: 'raidersSea',

  onZoneEnter(ctx) {
    CTX = ctx; K = null; ship = null; fx = []; rings = []; hold = null; testPassable = false;
    live = !!(ctx.S.map && ctx.S.map.sea);
    stats(ctx);
    if (!live) return;
    ensureTestSea(ctx);
    kTimer = rand(K_NEXT[0], K_NEXT[1]);
    makeShip(ctx);
    if (typeof window !== 'undefined') {
      window.__seaRaid = {
        kraken: () => { ensureTestSea(CTX); if (K) return 'already running (' + K.phase + ')'; return startKraken(CTX, true); },
        ship: () => {
          ensureTestSea(CTX); if (!ship) return 'no ship';
          const p = CTX.S.player; ship.st = 'sail'; ship.fade = 1; ship.force = true; ship.leaveT = 0; ship.boardT = 0;
          ship.x = p.x + (isWater(CTX, tileOf(p.x) + 7, tileOf(p.y)) ? 7 : -7) * TILE; ship.y = p.y; return 'ship placed';
        },
        state: () => ({
          live, kTimer: Math.round(kTimer), onRaft: onRaft(CTX), farOut: farOut(CTX), sea: CTX.S.sea ? { hp: CTX.S.sea.raft && CTX.S.sea.raft.hp, riding: CTX.S.sea.riding, diving: CTX.S.sea.diving } : null,
          kraken: K ? { phase: K.phase, t: +K.t.toFixed(1), left: liveTents().length, curT: +K.curT.toFixed(1), head: [Math.round(K.head.x), Math.round(K.head.y)], tents: K.tents.map(t => ({ st: t.st, hp: t.hp, x: Math.round(t.x), y: Math.round(t.y), rise: +t.rise.toFixed(2) })) } : null,
          ship: ship ? { st: ship.st, x: Math.round(ship.x), y: Math.round(ship.y), tx: tileOf(ship.x), ty: tileOf(ship.y), fade: +ship.fade.toFixed(2), boardT: +ship.boardT.toFixed(2), leaveT: Math.round(ship.leaveT), wp: ship.wp, loop: ship.loop.map(w => [tileOf(w.x), tileOf(w.y)]) } : null,
          hold: !!hold, stats: stats(CTX), fx: fx.length, rings: rings.length
        })
      };
    }
  },

  onZoneLeave(ctx) {
    if (hold) { hold.el.hidden = true; hold = null; if (ctx.S.mode === 'grapple') ctx.setMode('play'); }
    if (K) ctx.alert('');
    if (testPassable) { ctx.S.player.passable = null; testPassable = false; }
    K = null; ship = null; fx = []; rings = []; live = false;
  },

  update(dt, ctx) {
    CTX = ctx;
    updateFx(dt);
    if (!live || ctx.S.mode !== 'play') return;
    ensureTestSea(ctx);
    if (!ctx.S.sea) return;
    if (K) updateKraken(dt, ctx);
    else if (onRaft(ctx)) {                                          // the clock only runs while you are out on the raft
      kTimer -= dt;
      if (kTimer <= 0) { if (farOut(ctx)) startKraken(ctx, false); else kTimer = K_RETRY; }
    }
    if (ship) updateShip(dt, ctx);
  },

  near(ctx) {
    if (!live || !ctx.S.sea) return null;
    const p = ctx.S.player, S = L(ctx);
    if (K && K.phase === 'attack') {
      // numeric priorities: the raft/dive systems put "priority: true" prompts right at the player's feet, so ours must outrank them
      if (fishIndex(ctx) >= 0 && Math.hypot(K.head.x - p.x, K.head.y - p.y) <= 2.5 * TILE) return { label: S.feed, x: K.head.x, y: K.head.y, limit: 2.5 * TILE, priority: 3, data: { feed: true } };
      let best = null, bd = Infinity;
      for (const t of K.tents) { if (t.st === 'dead' || t.rise < 0.8) continue; const d = Math.hypot(t.x - p.x, t.y - p.y); if (d <= 1.5 * TILE && d < bd) { bd = d; best = t; } }
      if (best) return { label: S.strike, x: best.x, y: best.y - 8, limit: 1.5 * TILE, priority: 2, data: { tent: best } };
    }
    if (ship && ship.st === 'sail' && ship.fade > 0.5 && ctx.bag.has('rope', 1) && onRaft(ctx)) {
      const d = Math.hypot(ship.x - p.x, ship.y - p.y);
      if (d <= GRAPPLE_R) return { label: S.grapple, x: ship.x, y: ship.y, limit: GRAPPLE_R, priority: 2, data: { ship: true } };
    }
    return null;
  },

  interact(ctx, cand) {
    const d = cand && cand.data; if (!d) return;
    if (d.feed && K && K.phase === 'attack') { const i = fishIndex(ctx); if (i < 0) return; ctx.carry.remove(i); ctx.S.player.faceTo(K.head.x, K.head.y); splash(K.head.x, K.head.y + 6, false); endKraken(ctx, 'fed'); return; }
    if (d.tent) { strike(ctx, d.tent); return; }
    if (d.ship && ship && ship.st === 'sail' && ctx.bag.has('rope', 1)) openHold(ctx);
  },

  drawables(ctx, cx, cy) {
    if (!live) return [];
    const out = [], g = ctx.g, VW = ctx.VW, VH = ctx.VH;
    if (K) {
      for (const t of K.tents) {
        if (t.rise <= 0 || (t.st === 'dead')) continue;
        const sx = Math.round(t.x) - cx, sy = Math.round(t.y) - cy;
        if (sx < -30 || sy < -50 || sx > VW + 30 || sy > VH + 30) continue;
        out.push({ y: t.y, f: () => drawTent(g, t, sx, sy) });
      }
      const h = K.head;
      if (h.rise > 0) {
        const sx = Math.round(h.x) - cx, sy = Math.round(h.y) - cy, sh = Math.max(1, Math.round(24 * h.rise));
        out.push({ y: h.y + 6, f: () => { g.fillStyle = 'rgba(20,30,80,.35)'; g.beginPath(); g.ellipse(sx, sy + 4, 16, 5, 0, 0, TAU); g.fill(); g.drawImage(SPR.head, 0, 24 - sh, 32, sh, sx - 16, sy + 6 - sh, 32, sh); } });
      }
    }
    if (ship && ship.fade > 0 && ship.st !== 'hidden') {
      const bob = Math.round(Math.sin(ship.bob) * 1.5), sx = Math.round(ship.x) - cx, sy = Math.round(ship.y) - cy + bob;
      if (sx > -80 && sy > -60 && sx < VW + 80 && sy < VH + 60) {
        const img = SPR.ship[ship.dir < 0 ? 1 : 0];
        out.push({ y: ship.y + 12, f: () => {
          g.globalAlpha = 0.28 * ship.fade; g.fillStyle = '#0d1a3a'; g.beginPath(); g.ellipse(sx, sy + 12, 30, 6, 0, 0, TAU); g.fill();
          g.globalAlpha = 0.72 * ship.fade; g.drawImage(img, sx - 32, sy - 26);
          g.globalAlpha = 1;
        } });
      }
    }
    return out;
  },

  draw(g, ctx, cx, cy) {
    if (!live) return;
    if (K && K.phase === 'attack') {                                   // the arm of the lashing tentacle, under the surface
      for (const t of K.tents) if (t.st === 'lash') {
        const n = 6; g.fillStyle = 'rgba(74,42,106,.75)';
        for (let i = 1; i <= n; i++) { const k = i / n, x = t.x + (t.sx - t.x) * k - cx, y = t.y + (t.sy - t.y) * k - cy; g.beginPath(); g.ellipse(x, y, 3.5 - k * 1.5, 2 - k * 0.6, 0, 0, TAU); g.fill(); }
      }
      for (const t of K.tents) if (t.st === 'wind') {                  // a ripple where it is about to land
        const k = Math.min(1, t.a / WIND); g.strokeStyle = `rgba(223,243,255,${0.25 + k * 0.45})`; g.lineWidth = 1;
        g.beginPath(); g.ellipse(t.sx - cx, t.sy - cy, 6 + k * 6, 3 + k * 3, 0, 0, TAU); g.stroke();
      }
    }
    for (const r of rings) {
      if (r.t < 0) continue;
      const k = r.t / r.life, rr = r.r + (r.r1 - r.r) * k;
      g.strokeStyle = `rgba(${r.c},${(1 - k) * 0.85})`; g.lineWidth = k < 0.3 ? 2 : 1;
      g.beginPath(); g.ellipse(Math.round(r.x) - cx, Math.round(r.y) - cy, rr, rr * 0.5, 0, 0, TAU); g.stroke();
    }
    for (const p of fx) {
      const k = 1 - p.t / p.life, x = Math.round(p.x) - cx, y = Math.round(p.y) - cy;
      g.globalAlpha = Math.min(1, k * 1.3); g.fillStyle = p.c;
      if (p.blob) { g.beginPath(); g.arc(x, y, p.r * (0.7 + (1 - k) * 0.8), 0, TAU); g.fill(); } else g.fillRect(x, y, 1, 1);
    }
    g.globalAlpha = 1;
    if (ship && ship.fade > 0 && ship.st !== 'hidden') {              // the lantern's steady glow
      const lx = ship.x + (ship.dir < 0 ? 28 : -28) - cx, ly = ship.y - 15 + Math.round(Math.sin(ship.bob) * 1.5) - cy;
      if (!Number.isFinite(lx) || !Number.isFinite(ly)) return;
      const gr = g.createRadialGradient(lx, ly, 1, lx, ly, 22);
      gr.addColorStop(0, `rgba(255,212,94,${0.35 * ship.fade})`); gr.addColorStop(1, 'rgba(255,212,94,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(lx, ly, 22, 0, TAU); g.fill();
    }
  },

  drawUI(ug, ctx, cx, cy, scale) {
    if (!live || !K || K.phase !== 'attack') return;
    ug.save();
    for (const t of K.tents) {                                       // two hit pips over each tentacle
      if (t.st === 'dead') continue;
      const bx = Math.round((t.x - cx) * scale), by = Math.round((t.y - 36 - cy) * scale);
      if (bx < -40 || bx > ug.canvas.width + 40 || by < -20) continue;
      const r = Math.max(2, Math.round(scale * 1.1)), gap = r * 3, x0 = bx - gap / 2;
      for (let i = 0; i < TENT_HP; i++) { ug.beginPath(); ug.arc(x0 + i * gap, by, r, 0, TAU); ug.fillStyle = i < t.hp ? '#ff6b6b' : 'rgba(30,26,40,.55)'; ug.fill(); ug.strokeStyle = 'rgba(13,11,20,.75)'; ug.lineWidth = 1; ug.stroke(); }
    }
    ug.restore();
  },

  hudLines(ctx) {
    if (!live || !K || K.phase === 'sink') return [];
    return [L(ctx).hud(liveTents().length, Math.max(0, Math.ceil(K_MAX - (K.phase === 'attack' ? K.t : 0))))];
  }
};
