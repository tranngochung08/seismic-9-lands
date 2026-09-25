import { HOOK } from '../gfx.js';
// sea_raft.js — the Sea of Origins prologue: the raft you wake up on, currents, whirlpools,
// floating planks / crates, raft HP and patching, the shipwreck, the sail, the compass to the dock.
// Shared state: S.sea = { raft:{hp,max,sail}, riding:'raft'|'whale'|null, diving, x, y } (see systems/API.md).
// While S.sea.riding === 'raft' (and not diving) this module re-applies the player's raft defaults every frame.

// ---------------- text ----------------
const STR = {
  en: {
    stepOff: 'Step off', board: 'Board the raft', patch: 'Patch the raft (2 planks)', sail: 'Raise a sail', wreck: 'Search the wreck', escape: 'Escape! (mash E)',
    patched: 'Raft patched ♥', sailUp: 'Sail raised! The raft is faster now', wreckLoot: 'In the wreck: sailcloth + 2 rope',
    sank: 'The raft sank!', ashore: 'Your raft washed ashore (1 ♥)', caught: 'A whirlpool! Mash E to escape', escaped: 'You escaped the whirlpool',
    lostAnimal: 'The whirlpool swallowed one of your animals', lostStones: 'The whirlpool took 2 seismic stones', lostNothing: 'Spat out by the whirlpool',
    plank: '+1 plank', crate: 'Crate: ', noRoom: 'No shore next to the raft', moored: 'moored',
    tut: ['You wake on a raft… adrift on the Sea of Origins', 'Follow the currents (arrows) to the lighthouse', 'Pick up planks to patch the raft']
  },
  vi: {
    stepOff: 'Bước lên bờ', board: 'Lên bè', patch: 'Vá bè (2 ván)', sail: 'Giương buồm', wreck: 'Lục xác tàu', escape: 'Thoát! (bấm E liên tục)',
    patched: 'Đã vá bè ♥', sailUp: 'Đã giương buồm! Bè đi nhanh hơn', wreckLoot: 'Trong xác tàu: vải buồm + 2 dây thừng',
    sank: 'Bè chìm rồi!', ashore: 'Bè của bạn dạt vào bờ (1 ♥)', caught: 'Xoáy nước! Bấm E liên tục để thoát', escaped: 'Đã thoát khỏi xoáy nước',
    lostAnimal: 'Xoáy nước nuốt mất một con vật của bạn', lostStones: 'Xoáy nước cuốn mất 2 đá Seismic', lostNothing: 'Xoáy nước nhả bạn ra',
    plank: '+1 ván gỗ', crate: 'Thùng: ', noRoom: 'Không có bờ cạnh bè', moored: 'đã neo',
    tut: ['Bạn tỉnh dậy trên một chiếc bè… trôi giữa Biển Khởi Nguồn', 'Đi theo dòng chảy (mũi tên) tới hải đăng', 'Nhặt ván gỗ để vá bè']
  }
};
const L = ctx => STR[ctx.lang && ctx.lang() === 'vi' ? 'vi' : 'en'];

// ---------------- tuning ----------------
const SPD = { paddle: 0.8, sail: 1.6 };
const FLOW_PX = 1.2 * 16;             // current push, px/s
const WHIRL_SPOTS = [[24, 20], [58, 12], [30, 50]];
const WHIRL_R = 3 * 16, WHIRL_CATCH = 2.6 * 16, WHIRL_EYE = 7, WHIRL_THROW = 4 * 16, WHIRL_IMMUNE = 5;
const MASH = 0.25, MASH_DECAY = 0.3;
const N_PLANKS = 8, N_CRATES = 3, PLANK_RESPAWN = 22, CRATE_RESPAWN = 45;
const SINK_SECS = 3;
const TAU = Math.PI * 2;

// ---------------- tiny pixel helpers (same style as gfx.js / vehicles.js) ----------------
const C = { out: '#1c1a24', wood: '#8a5a2b', woodD: '#5f3d1c', woodL: '#a8733c', rope: '#d9c283', cloth: '#f2ead6', clothD: '#d8cbb0', red: '#c94b33', water: '#7cc0f2', waterD: '#3f7fcf', crate: '#b07a3c', crateD: '#7a4f22', crateL: '#d29a55' };
const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const px = (g, x, y, c, w = 1, h = 1) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
function ln(g, x0, y0, x1, y1, c, t = 1) {
  const dx = x1 - x0, dy = y1 - y0, n = Math.max(Math.abs(dx), Math.abs(dy), 1); g.fillStyle = c;
  for (let i = 0; i <= n; i++) g.fillRect(Math.round(x0 + dx * i / n) - (t >> 1), Math.round(y0 + dy * i / n) - (t >> 1), t, t);
}
function sheetOf(w, h, fn, flip) { const c = mk(w, h), g = c.getContext('2d'); if (flip) { g.translate(w, 0); g.scale(-1, 1); } fn(g); return c; }

// raft: 32×20 logs + rope lashings
const RAFT = HOOK.image('raft', sheetOf(32, 20, g => {
  for (let i = 0; i < 4; i++) {
    const y = 4 + i * 4;
    px(g, 1, y, C.out, 30, 4); px(g, 2, y + 1, i % 2 ? C.wood : C.woodL, 28, 2); px(g, 2, y + 3, C.woodD, 28, 1);
    px(g, 2, y + 1, '#a8733c', 1, 2); px(g, 29, y + 1, '#6f4720', 1, 2);
  }
  for (const x of [7, 23]) { px(g, x, 3, C.out, 3, 18); px(g, x, 4, C.rope, 2, 16); }
  px(g, 12, 2, C.out, 8, 3); px(g, 13, 3, C.rope, 6, 1);
}));
// sail: 30×26, mast at column 12..14 (side views billow to starboard; front/back a triangle both ways)
function mast(g, x) { px(g, x, 0, C.out, 3, 26); px(g, x + 1, 1, C.woodL, 1, 24); }
function sailSide(g, f) {
  mast(g, 12);
  for (let k = 0; k < 20; k++) {
    const w = 2 + Math.round((11 + (f ? 1 : 0)) * Math.sin((k / 19) * Math.PI * 0.95));
    px(g, 15, 2 + k, C.out, w + 1, 1); px(g, 15, 2 + k, (k > 7 && k < 11) ? C.red : (k % 6 === 5 ? C.clothD : C.cloth), w, 1);
  }
  ln(g, 15, 2, 14, 23, C.rope, 1);
}
function sailFront(g, f) {
  mast(g, 14);
  for (let k = 0; k < 16; k++) {
    const w = 3 + Math.round((8 + (f ? 1 : 0)) * Math.sin((k / 15) * Math.PI * 0.9));
    px(g, 15 - w, 2 + k, C.out, 2 * w + 3, 1); px(g, 16 - w, 2 + k, (k > 6 && k < 9) ? C.red : (k % 5 === 4 ? C.clothD : C.cloth), 2 * w + 1, 1);
  }
  px(g, 8, 1, C.out, 16, 2); px(g, 9, 2, C.woodL, 14, 1);
}
const SAIL = [0, 1, 2, 3].map(d => [0, 1].map(f => HOOK.image(`sail_${d}_${f}`, sheetOf(30, 26, g => (d === 0 || d === 3) ? sailFront(g, f) : sailSide(g, f), d === 1)))); // art.js thay bitmap khi có ảnh PixelLab
// floating plank 14×6 and crate 14×13
const PLANK = HOOK.image('plank', sheetOf(14, 6, g => { px(g, 0, 1, C.out, 14, 5); px(g, 1, 2, C.woodL, 12, 2); px(g, 1, 4, C.woodD, 12, 1); px(g, 4, 2, C.wood, 2, 2); px(g, 9, 2, C.wood, 2, 2); }));
const WHIRL = HOOK.creature('whirl', [null]);   /* 1 ảnh xoáy PixelLab (sea.json creatures.whirl), code tự xoay theo thời gian */   /* art.js gắn 4 khung xoáy PixelLab (sea.json creatures.whirl); rỗng = vẽ code */
const CRATE = HOOK.image('crate_float', sheetOf(14, 13, g => {
  px(g, 0, 0, C.out, 14, 13); px(g, 1, 1, C.crate, 12, 11); px(g, 1, 1, C.crateL, 12, 2); px(g, 1, 9, C.crateD, 12, 2);
  px(g, 1, 6, C.crateD, 12, 1); px(g, 6, 1, C.crateD, 2, 11); px(g, 2, 3, C.crateL, 1, 1); px(g, 9, 3, C.crateL, 1, 1);
}));

// ---------------- module state ----------------
const st = {
  ctx: null, t: 0, on: false, parked: null, sinkT: 0, sinkAt: null, planks: [], crates: [], whirls: [], caught: null, immune: 0,
  tut: null, wreck: null, blocked: null, ripples: [], pass: null, lastTile: null
};
const slot = ctx => { const s = ctx.S.save; s.sys = s.sys || {}; return (s.sys.seaRaft = s.sys.seaRaft || {}); };
const tileOf = p => ({ x: Math.floor(p.x / 16), y: Math.floor((p.y - 1) / 16) });
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
function restore(p) { p.speedMul = 1; p.passable = null; p.custom = null; p.ghost = false; p.boxW = 10; p.boxH = 6; }
const sea = ctx => ctx.S.sea;
const riding = ctx => !!(ctx.S.sea && ctx.S.sea.riding === 'raft' && !ctx.S.sea.diving);

// ---------------- map queries ----------------
function isWaterT(ctx, t) { const T = ctx.T; return t === T.WATER || t === T.DEEP || t === T.REEF; }
function waterAt(ctx, x, y) {
  const m = ctx.S.map; if (x < 0 || y < 0 || x >= m.w || y >= m.h) return false;
  if (st.blocked && st.blocked[y * m.w + x]) return false;
  return isWaterT(ctx, ctx.getG(m, x, y));
}
function landAt(ctx, x, y) { const m = ctx.S.map, t = ctx.getG(m, x, y); return (t === ctx.T.SAND || t === ctx.T.DOCK) && !ctx.isSolid(m, x, y); }
function buildBlocked(ctx) {
  const m = ctx.S.map; st.blocked = new Uint8Array(m.w * m.h);
  for (const o of m.objects) { const d = ctx.O[o.type]; if (!d || !d.solid) continue; for (let j = 0; j < d.fh; j++) for (let i = 0; i < d.fw; i++) { const x = o.x + i, y = o.y + j; if (x >= 0 && y >= 0 && x < m.w && y < m.h) st.blocked[y * m.w + x] = 1; } }
}
// rings outwards from `at`: first tile passing `ok`
function ringFind(at, ok, rmax = 12, r0 = 0) {
  for (let r = r0; r <= rmax; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
    const x = at.x + dx, y = at.y + dy; if (ok(x, y)) return { x, y };
  }
  return null;
}
const nearestWater = (ctx, at, r0 = 0) => ringFind(at, (x, y) => waterAt(ctx, x, y), 14, r0);
const nearestLand = (ctx, at) => ringFind(at, (x, y) => landAt(ctx, x, y), 20);
const DV = [[0, 1], [-1, 0], [1, 0], [0, -1]];   // dir 0 down, 1 left, 2 right, 3 up
// the land tile to step onto: facing direction first, then the other sides, then diagonals
function landBeside(ctx, at, dir) {
  const order = [DV[dir & 3]]; for (const d of DV) if (!order.includes(d)) order.push(d);
  for (const [dx, dy] of order.concat([[1, 1], [-1, 1], [1, -1], [-1, -1]])) if (landAt(ctx, at.x + dx, at.y + dy)) return { x: at.x + dx, y: at.y + dy };
  return null;
}
function randomWater(ctx, avoid, minD) {
  const m = ctx.S.map;
  for (let i = 0; i < 60; i++) {
    const x = 2 + Math.floor(Math.random() * (m.w - 4)), y = 2 + Math.floor(Math.random() * (m.h - 8));
    if (!waterAt(ctx, x, y)) continue;
    if (avoid && Math.hypot(x - avoid.x, y - avoid.y) < minD) continue;
    if (st.whirls.some(w => Math.hypot(w.x - x, w.y - y) < 4)) continue;
    return { x, y };
  }
  return null;
}
function ripple(x, y) { st.ripples.push({ x, y, t: 0 }); if (st.ripples.length > 12) st.ripples.shift(); }

// ---------------- raft: apply / board / step off / sink ----------------
function applyRaft(ctx) {
  const p = ctx.S.player, s = sea(ctx); if (!s) return;
  p.speedMul = s.raft.sail ? SPD.sail : SPD.paddle; p.passable = st.pass; p.custom = drawRaft; p.boxW = 14; p.boxH = 8; p.ghost = false;
}
function board(ctx, tile, quiet) {
  const p = ctx.S.player, s = sea(ctx), sv = slot(ctx);
  p.x = tile.x * 16 + 8; p.y = tile.y * 16 + 14;
  s.riding = 'raft'; s.diving = false; s.x = p.x; s.y = p.y;
  st.parked = null; sv.parked = null; applyRaft(ctx); ctx.persist();
  if (!quiet) { ctx.sfx('splash'); ripple(p.x, p.y); }
}
function stepOff(ctx) {
  const p = ctx.S.player, s = sea(ctx), sv = slot(ctx), at = tileOf(p);
  const out = landBeside(ctx, at, p.dir); if (!out) { ctx.toast(L(ctx).noRoom); return; }
  restore(p); p.x = out.x * 16 + 8; p.y = out.y * 16 + 14;
  s.riding = null; st.parked = { x: at.x, y: at.y }; sv.parked = { x: at.x, y: at.y }; s.x = at.x * 16 + 8; s.y = at.y * 16 + 14;
  ctx.persist(); ctx.sfx('splash'); ripple(s.x, s.y);
}
function sink(ctx) {
  const p = ctx.S.player, s = sea(ctx), sv = slot(ctx); if (!s) return;
  const at = tileOf(p), wasRiding = s.riding === 'raft';
  const land = nearestLand(ctx, at) || { x: ctx.S.map.dock.x, y: ctx.S.map.dock.y };
  s.raft.hp = 0; sv.hp = 0;
  if (wasRiding) { restore(p); }   /* plan-15: không dịch về bờ — người chơi bơi thật (swim.js), kiệt sức thì tàu tới cứu */
  s.riding = null; st.parked = null; sv.parked = null; st.caught = null;
  st.sinkT = SINK_SECS; st.sinkAt = { x: land.x, y: land.y };
  ripple(at.x * 16 + 8, at.y * 16 + 8); ctx.sfx('splash'); ctx.toast(L(ctx).sank, true); ctx.persist();
}
function respawnRaft(ctx) {
  const s = sea(ctx), sv = slot(ctx); if (!s) return;
  const spot = nearestWater(ctx, st.sinkAt, 1) || nearestWater(ctx, { x: ctx.S.map.dock.x, y: ctx.S.map.dock.y - 8 });
  s.raft.hp = 1; sv.hp = 1; st.sinkAt = null;
  if (spot) { st.parked = spot; sv.parked = { ...spot }; s.x = spot.x * 16 + 8; s.y = spot.y * 16 + 14; ripple(s.x, s.y); }
  ctx.toast(L(ctx).ashore); ctx.persist();
}

// ---------------- floating items ----------------
function spawnFloat(ctx, kind) {
  const p = ctx.S.player, spot = randomWater(ctx, tileOf(p), 6); if (!spot) return null;
  return { kind, x: spot.x, y: spot.y, ph: Math.random() * TAU, dead: false, t: 0 };
}
function spawnFloats(ctx) {
  st.planks = []; st.crates = [];
  for (let i = 0; i < N_PLANKS; i++) { const f = spawnFloat(ctx, 'plank'); if (f) st.planks.push(f); }
  for (let i = 0; i < N_CRATES; i++) { const f = spawnFloat(ctx, 'crate'); if (f) st.crates.push(f); }
}
function openCrate(ctx) {
  const t = L(ctx), got = [];
  const stones = 3 + Math.floor(Math.random() * 4); ctx.bag.add('stone', stones); got.push(`${ctx.itemIcon('stone')}${stones}`);
  if (ctx.bag.add('rope', 1)) got.push(`${ctx.itemIcon('rope')}1`);
  const pl = ctx.bag.add('plank', 2); if (pl) got.push(`${ctx.itemIcon('plank')}${pl}`);
  if (Math.random() < 0.2 && ctx.bag.add('sailcloth', 1)) got.push(ctx.itemIcon('sailcloth'));
  if (Math.random() < 0.15 && ctx.bag.add('bottle', 1)) got.push(ctx.itemIcon('bottle'));
  ctx.toast(t.crate + got.join(' ')); ctx.sfx('coin');
}
function updateFloats(dt, ctx) {
  const p = ctx.S.player, ride = riding(ctx) && ctx.S.mode === 'play';
  for (const list of [st.planks, st.crates]) for (const f of list) {
    if (f.dead) { f.t -= dt; if (f.t <= 0) { const n = spawnFloat(ctx, f.kind); if (n) Object.assign(f, n); } continue; }
    if (!ride) continue;
    if (Math.hypot(f.x * 16 + 8 - p.x, f.y * 16 + 8 - (p.y - 4)) < 13) {
      f.dead = true; f.t = f.kind === 'plank' ? PLANK_RESPAWN : CRATE_RESPAWN;
      if (f.kind === 'plank') { ctx.bag.add('plank', 1); ctx.toast(L(ctx).plank); ctx.sfx('pickup'); }
      else openCrate(ctx);
    }
  }
}

// ---------------- whirlpools ----------------
function setupWhirls(ctx) {
  st.whirls = [];
  for (const [x, y] of WHIRL_SPOTS) { const spot = waterAt(ctx, x, y) ? { x, y } : nearestWater(ctx, { x, y }); if (spot) st.whirls.push({ x: spot.x, y: spot.y, cool: 0 }); }
}
function throwOut(ctx, w, ok) {
  const p = ctx.S.player, t = L(ctx), wx = w.x * 16 + 8, wy = w.y * 16 + 8;
  let a = Math.atan2(p.y - wy, p.x - wx); if (!isFinite(a)) a = 0;
  let spot = null;
  for (let k = 0; k < 8 && !spot; k++) {                                   // 4 tiles out, turning around the eye until we hit open water
    const aa = a + (k % 2 ? -1 : 1) * Math.ceil(k / 2) * (TAU / 8);
    const tx = Math.round((wx + Math.cos(aa) * WHIRL_THROW) / 16), ty = Math.round((wy + Math.sin(aa) * WHIRL_THROW) / 16);
    if (waterAt(ctx, tx, ty)) spot = { x: tx, y: ty };
  }
  if (!spot) spot = nearestWater(ctx, { x: w.x, y: w.y }, 4) || { x: w.x, y: w.y };
  p.x = spot.x * 16 + 8; p.y = spot.y * 16 + 14;
  st.caught = null; st.immune = WHIRL_IMMUNE; w.cool = WHIRL_IMMUNE;
  ripple(p.x, p.y); ctx.sfx('splash');
  if (ok) { ctx.toast(t.escaped); return; }
  const carried = ctx.carry.get();
  if (carried.length) { ctx.carry.remove(carried.length - 1); ctx.toast(t.lostAnimal, true); }
  else if (ctx.bag.count('stone') > 0) { ctx.bag.remove('stone', 2); ctx.toast(t.lostStones, true); }
  else ctx.toast(t.lostNothing);
}
function updateWhirls(dt, ctx) {
  const p = ctx.S.player;
  for (const w of st.whirls) if (w.cool > 0) w.cool -= dt;
  if (st.immune > 0) st.immune -= dt;
  if (!riding(ctx) || ctx.S.mode !== 'play') { st.caught = null; return; }
  if (!st.caught && st.immune <= 0) {
    for (const w of st.whirls) {
      if (w.cool > 0) continue;
      const d = Math.hypot(w.x * 16 + 8 - p.x, w.y * 16 + 8 - (p.y - 4));
      if (d < WHIRL_CATCH) { st.caught = { w, meter: 0 }; ctx.sfx('alarm'); ctx.toast(L(ctx).caught, true); break; }
    }
  }
  const c = st.caught; if (!c) return;
  const w = c.w, wx = w.x * 16 + 8, wy = w.y * 16 + 8, dx = wx - p.x, dy = wy - (p.y - 4), d = Math.hypot(dx, dy) || 1;
  if (d > WHIRL_R * 1.6) { st.caught = null; return; }                    // warped / carried away: let go
  if (c.meter >= 1) { throwOut(ctx, w, true); return; }
  if (d < WHIRL_EYE) { throwOut(ctx, w, false); return; }
  const pull = 4 + (1 - Math.min(1, d / WHIRL_R)) * 8, spin = 40;        // px/s inwards (slow: ~4 s to the eye) + around
  const ux = dx / d, uy = dy / d;
  p.speedMul = 0.15;                                                     // paddling barely helps: mash E to break free
  p.tryMove((ux * pull + -uy * spin) * dt, (uy * pull + ux * spin) * dt, ctx.S.map, ctx.allNpcs());
  p.dir = Math.floor(st.t * 5) & 3;                                      // the raft spins round
  c.meter = Math.max(0, c.meter - MASH_DECAY * dt);
}
function mash() { if (st.caught) st.caught.meter = Math.min(1, st.caught.meter + MASH); }

// ---------------- drawing ----------------
function drawRaft(g, ent) {
  const x = Math.round(ent.x), y = Math.round(ent.y), d = ent.dir & 3, ctx = st.ctx, s = ctx && ctx.S.sea;
  const hp = s ? s.raft.hp : 6, max = s ? s.raft.max : 6, sail = !!(s && s.raft.sail);
  const bob = Math.round(Math.sin(st.t * 2.6)), sw = ent.moving ? Math.round(Math.sin(st.t * 6) * 2) : 0, f = Math.floor(st.t * 3) & 1;
  g.fillStyle = 'rgba(20,60,110,.28)'; g.beginPath(); g.ellipse(x, y + 3, 16, 5, 0, 0, 7); g.fill();
  g.drawImage(RAFT, x - 16, y - 13 + bob);
  const broken = Math.round((1 - clamp(hp, 0, max) / max) * 3);            // damage: logs gone, water shows through
  for (let i = 0; i < broken; i++) { const ly = y - 13 + bob + 4 + (3 - i) * 4; px(g, x - 14 + i * 3, ly, C.waterD, 9 - i * 2, 3); px(g, x + 3 + i * 2, ly, C.waterD, 8 - i * 2, 3); px(g, x - 14 + i * 3, ly + 1, C.water, 3, 1); }
  const sx = (d === 0 || d === 3) ? x - 5 : x - 9, sy = y - 39 + bob;      // mast foot on the raft, cloth beside the head
  if (sail && d === 3) g.drawImage(SAIL[d][f], sx, sy);
  const pad = !sail && ent.sheet.actions && ent.sheet.actions.paddle;   // clip chèo PixelLab: khung theo thời gian khi đang đi, khung 0 khi đứng
  if (pad) { const s0 = Math.max(0, pad.n - 4), pf = ent.moving ? s0 + Math.floor(st.t * 7) % (pad.n - s0) : s0, ch = pad.ch || 20, cw = pad.cw || 16;   /* 3 khung đầu clip AI = đứng chưa cầm chèo → chỉ dùng 4 khung cuối; đứng yên = cầm chèo */ g.drawImage(pad.img, pf * cw, d * ch, cw, ch, x - (cw >> 1), y - 26 + bob - (ch - 20), cw, ch); }
  else g.drawImage(ent.sheet, (ent.frame || 0) * 16, d * 20, 16, 20, x - 8, y - 26 + bob, 16, 20);
  if (!sail && !pad) { ln(g, x + 7, y - 20 + bob, x + 12 + sw, y - 2 + bob, C.out, 2); ln(g, x + 7, y - 20 + bob, x + 12 + sw, y - 2 + bob, C.woodL, 1); }   // paddle pole (code, khi không có clip)
  if (sail && d !== 3) g.drawImage(SAIL[d][f], sx, sy);
}
function drawWhirl(g, w, cx, cy) {
  const x = w.x * 16 + 8 - cx, y = w.y * 16 + 8 - cy, active = st.caught && st.caught.w === w, t = st.t * (active ? 3.2 : 1.8);
  if (WHIRL[0]) {   /* ảnh PixelLab xoay tròn theo thời gian (AI không sinh được vòng xoay mượt), ép dẹt 0,7 cho hợp góc nhìn; xoáy đang hút quay nhanh hơn */
    const fr = WHIRL[0], im = Array.isArray(fr) ? fr[0] : fr;
    g.save(); g.translate(x, y); g.scale(1, 0.7); g.rotate(-t); g.drawImage(im, -(im.width >> 1), -(im.height >> 1)); g.restore(); return;
  }
  g.fillStyle = 'rgba(14,44,92,.55)'; g.beginPath(); g.ellipse(x, y, 20, 12, 0, 0, 7); g.fill();
  g.fillStyle = 'rgba(8,30,70,.85)'; g.beginPath(); g.ellipse(x, y, 6, 4, 0, 0, 7); g.fill();
  for (let arm = 0; arm < 3; arm++) for (let s = 0; s < 22; s++) {
    const a = -t + arm * (TAU / 3) + s * 0.3, r = 3 + s * 0.95;
    const qx = Math.round(x + Math.cos(a) * r), qy = Math.round(y + Math.sin(a) * r * 0.62);
    g.fillStyle = s % 4 === 0 ? '#ffffff' : s % 2 ? '#dff3ff' : '#8fd3ff'; g.fillRect(qx, qy, s > 12 ? 2 : 1, 1);
  }
}
function drawParked(g, x, y, sail) {
  const bob = Math.round(Math.sin(st.t * 2.6)), f = Math.floor(st.t * 3) & 1;
  g.fillStyle = 'rgba(20,60,110,.28)'; g.beginPath(); g.ellipse(x, y + 3, 16, 5, 0, 0, 7); g.fill();
  g.drawImage(RAFT, x - 16, y - 13 + bob);
  if (sail) g.drawImage(SAIL[2][f], x - 9, y - 39 + bob);
}

// ---------------- system ----------------
export const seaRaft = {
  id: 'seaRaft',

  onZoneEnter(ctx) {
    st.ctx = ctx; st.on = false; st.parked = null; st.sinkT = 0; st.sinkAt = null; st.planks = []; st.crates = []; st.whirls = []; st.caught = null; st.immune = 0; st.tut = null; st.wreck = null; st.ripples = []; st.blocked = null;
    if (!ctx.S.map.sea) { ctx.S.sea = null; return; }
    st.on = true;
    const sv = slot(ctx), m = ctx.S.map, p = ctx.S.player;
    if (typeof sv.hp !== 'number') sv.hp = 3; if (typeof sv.max !== 'number') sv.max = 6; if (sv.hp < 1) sv.hp = 1;
    ctx.S.sea = { raft: { hp: sv.hp, max: sv.max, sail: !!sv.sail }, riding: null, diving: false, x: p.x, y: p.y };
    st.pass = (map, tx, ty) => waterAt(ctx, tx, ty);
    buildBlocked(ctx); setupWhirls(ctx); spawnFloats(ctx);
    st.wreck = m.objects.find(o => o.wreck) || null;
    const at = tileOf(p);
    if (waterAt(ctx, at.x, at.y)) board(ctx, at, true);              // adrift: wake up on the raft
    else {                                                            // on foot (arrived at the dock): the raft is moored nearby
      let park = sv.parked && waterAt(ctx, sv.parked.x, sv.parked.y) ? { ...sv.parked } : null;
      if (!park || Math.hypot(park.x - at.x, park.y - at.y) > 6) park = nearestWater(ctx, { x: m.dock.x, y: m.dock.y - 7 }, 0);
      if (park && Math.hypot(park.x - at.x, park.y - at.y) > 8) park = nearestWater(ctx, at, 1) || park;
      st.parked = park; sv.parked = park ? { ...park } : null;
      if (park) { ctx.S.sea.x = park.x * 16 + 8; ctx.S.sea.y = park.y * 16 + 14; }
    }
    if (!sv.seen) st.tut = { i: 0, t: 0.6 };                          // `seen` is set when the first message actually shows
    ctx.persist();
  },

  onZoneLeave(ctx) {
    if (ctx.S.sea && ctx.S.sea.riding === 'raft') restore(ctx.S.player);
    ctx.S.sea = null; st.on = false; st.caught = null; st.parked = null; st.planks = []; st.crates = []; st.whirls = []; st.ripples = []; st.tut = null;
  },

  update(dt, ctx) {
    st.t += dt; st.ctx = ctx;
    if (!st.on || !ctx.S.sea) return;
    const s = ctx.S.sea, p = ctx.S.player, sv = slot(ctx);
    if (st.tut) { st.tut.t -= dt; if (st.tut.t <= 0) { const t = L(ctx).tut; ctx.toast(t[st.tut.i], true); if (!sv.seen) { sv.seen = true; ctx.persist(); } st.tut.i++; st.tut.t = 3.6; if (st.tut.i >= t.length) st.tut = null; } }
    // keep the persisted copy in sync (other systems may change hp / sail on S.sea)
    s.raft.hp = clamp(s.raft.hp, 0, s.raft.max);
    if (sv.hp !== s.raft.hp || sv.max !== s.raft.max || !!sv.sail !== !!s.raft.sail) { sv.hp = s.raft.hp; sv.max = s.raft.max; sv.sail = !!s.raft.sail; ctx.persist(); }
    if (st.sinkT > 0) { st.sinkT -= dt; if (st.sinkT <= 0) respawnRaft(ctx); }
    if (riding(ctx)) {
      if (s.raft.hp <= 0) { sink(ctx); return; }
      applyRaft(ctx); s.x = p.x; s.y = p.y;
      if (ctx.S.mode === 'play' && !st.caught) {                          // currents push the raft along the arrows (a whirlpool owns the raft while it holds it)
        const t = tileOf(p), m = ctx.S.map, f = m.flow ? m.flow[t.y * m.w + t.x] : 0, F = ctx.FLOW;
        if (f) { const vx = f === F.R ? 1 : f === F.L ? -1 : 0, vy = f === F.D ? 1 : f === F.U ? -1 : 0; p.tryMove(vx * FLOW_PX * dt, vy * FLOW_PX * dt, m, ctx.allNpcs()); }
      }
    } else if (s.riding === null && s.raft.hp <= 0 && st.sinkT <= 0 && !st.sinkAt) { s.raft.hp = 1; }
    if (st.parked) { s.x = st.parked.x * 16 + 8; s.y = st.parked.y * 16 + 14; }
    updateWhirls(dt, ctx);
    updateFloats(dt, ctx);
    for (let i = st.ripples.length - 1; i >= 0; i--) { st.ripples[i].t += dt; if (st.ripples[i].t > 0.7) st.ripples.splice(i, 1); }
  },

  key(code, ctx) {
    if (st.caught && ctx.S.mode === 'play' && (code === 'KeyE' || code === 'Space' || code === 'Enter')) { mash(); return true; }
    return false;
  },

  near(ctx) {
    if (!st.on || !ctx.S.sea) return null;
    const t = L(ctx), p = ctx.S.player, s = ctx.S.sea;
    if (st.caught) return { label: t.escape, x: p.x, y: p.y, limit: 40, priority: true, data: { escape: true } };
    if (riding(ctx)) {
      const at = tileOf(p);
      if (landBeside(ctx, at, p.dir)) return { label: t.stepOff, x: p.x, y: p.y, limit: 20, priority: true, data: { off: true } };
      if (!s.raft.sail && ctx.bag.has('sailcloth', 1) && ctx.bag.has('rope', 1)) return { label: t.sail, x: p.x, y: p.y, limit: 20, data: { sail: true } };
      if (s.raft.hp < s.raft.max && ctx.bag.has('plank', 2)) return { label: t.patch, x: p.x, y: p.y, limit: 20, data: { patch: true } };
    }
    if (st.wreck && !slot(ctx).wreck) {                                 // the wreck (once) wins over the moored raft beside it
      const d = ctx.O[st.wreck.type], wx = st.wreck.x * 16 + d.fw * 8, wy = (st.wreck.y + d.fh) * 16 - 4;
      if (Math.hypot(wx - p.x, wy - p.y) < 52) return { label: t.wreck, x: wx, y: wy, limit: 52, priority: true, data: { wreck: true } };
    }
    if (st.parked && s.riding === null && !p.custom) { const bx = st.parked.x * 16 + 8, by = st.parked.y * 16 + 10; if (Math.hypot(bx - p.x, by - p.y) < 30) return { label: t.board, x: bx, y: by, limit: 30, data: { board: true } }; }
    return null;
  },

  interact(ctx, cand) {
    const d = (cand && cand.data) || {}, t = L(ctx), s = ctx.S.sea; if (!s) return;
    if (d.escape) { mash(); return; }
    if (d.off) { stepOff(ctx); return; }
    if (d.board) { if (st.parked) board(ctx, st.parked); return; }
    if (d.patch) {
      if (!ctx.bag.has('plank', 2) || s.raft.hp >= s.raft.max) return;
      ctx.bag.remove('plank', 2); s.raft.hp = Math.min(s.raft.max, s.raft.hp + 1); slot(ctx).hp = s.raft.hp; ctx.persist();
      ctx.toast(t.patched); ctx.sfx('build'); return;
    }
    if (d.sail) {
      if (s.raft.sail || !ctx.bag.has('sailcloth', 1) || !ctx.bag.has('rope', 1)) return;
      ctx.bag.remove('sailcloth', 1); ctx.bag.remove('rope', 1); s.raft.sail = true; slot(ctx).sail = true; ctx.persist();
      applyRaft(ctx); ctx.toast(t.sailUp, true); ctx.sfx('win'); return;
    }
    if (d.wreck) {
      const sv = slot(ctx); if (sv.wreck) return;
      sv.wreck = true; ctx.bag.add('sailcloth', 1); ctx.bag.add('rope', 2); ctx.persist();
      ctx.toast(t.wreckLoot, true); ctx.sfx('pickup');
    }
  },

  drawables(ctx, cx, cy) {
    if (!st.on || !ctx.S.sea) return [];
    const out = [], g = ctx.g, s = ctx.S.sea;
    for (const w of st.whirls) out.push({ y: -1e4, f: () => drawWhirl(g, w, cx, cy) });      // surface decal, under everything
    for (const list of [st.planks, st.crates]) for (const it of list) {
      if (it.dead) continue;
      const wx = it.x * 16 + 8, wy = it.y * 16 + 12, bob = Math.round(Math.sin(st.t * 2.2 + it.ph) * 1.5), dx = Math.round(Math.sin(st.t * 0.7 + it.ph) * 2);
      if (it.kind === 'plank') out.push({ y: wy, f: () => { g.fillStyle = 'rgba(20,60,110,.25)'; g.beginPath(); g.ellipse(wx + dx - cx, wy - cy, 8, 3, 0, 0, 7); g.fill(); g.drawImage(PLANK, wx - 7 + dx - cx, wy - 6 + bob - cy); } });
      else out.push({ y: wy, f: () => { g.fillStyle = 'rgba(20,60,110,.3)'; g.beginPath(); g.ellipse(wx + dx - cx, wy - cy, 9, 4, 0, 0, 7); g.fill(); g.drawImage(CRATE, wx - 7 + dx - cx, wy - 12 + bob - cy); } });
    }
    if (st.parked && s.riding !== 'raft') { const wx = st.parked.x * 16 + 8, wy = st.parked.y * 16 + 14; out.push({ y: wy + 2, f: () => drawParked(g, wx - cx, wy - cy, s.raft.sail) }); }
    return out;
  },

  draw(g, ctx, cx, cy) {
    if (!st.on) return;
    for (const r of st.ripples) {
      const k = r.t / 0.7, a = (1 - k) * 0.7; g.strokeStyle = `rgba(223,243,255,${a.toFixed(3)})`; g.lineWidth = 1;
      g.beginPath(); g.ellipse(Math.round(r.x) - cx, Math.round(r.y) - cy, 4 + k * 22, 2 + k * 9, 0, 0, 7); g.stroke();
    }
  },

  drawUI(ug, ctx, cx, cy, scale) {
    if (!st.on || !ctx.S.sea) return;
    const p = ctx.S.player, m = ctx.S.map, W = ug.canvas.width;
    // compass to the dock, top-right below the HUD buttons
    const r = Math.round(scale * 9), ox = W - 12 - r, oy = 64 + r;
    const dx = m.dock.x * 16 + 8 - p.x, dy = m.dock.y * 16 + 8 - p.y, dist = Math.hypot(dx, dy), a = Math.atan2(dy, dx);
    ug.save();
    ug.fillStyle = 'rgba(13,11,20,.6)'; ug.beginPath(); ug.arc(ox, oy, r, 0, TAU); ug.fill();
    ug.strokeStyle = '#a79a86'; ug.lineWidth = 1.5; ug.beginPath(); ug.arc(ox, oy, r, 0, TAU); ug.stroke();
    ug.fillStyle = '#5a5060'; for (let k = 0; k < 8; k++) { const t = k * TAU / 8; ug.fillRect(ox + Math.cos(t) * (r - 4) - 1, oy + Math.sin(t) * (r - 4) - 1, 2, 2); }
    if (dist > 3 * 16) {                                                  // needle: a long triangle from the centre to the rim, pointing at the dock
      ug.fillStyle = '#ffd45e'; ug.beginPath();
      ug.moveTo(ox + Math.cos(a) * (r - 5), oy + Math.sin(a) * (r - 5));
      ug.lineTo(ox + Math.cos(a + Math.PI / 2) * 4, oy + Math.sin(a + Math.PI / 2) * 4);
      ug.lineTo(ox + Math.cos(a - Math.PI / 2) * 4, oy + Math.sin(a - Math.PI / 2) * 4);
      ug.closePath(); ug.fill();
      ug.fillStyle = '#7a6a50'; ug.beginPath();                            // tail
      ug.moveTo(ox - Math.cos(a) * (r * 0.5), oy - Math.sin(a) * (r * 0.5));
      ug.lineTo(ox + Math.cos(a + Math.PI / 2) * 3, oy + Math.sin(a + Math.PI / 2) * 3);
      ug.lineTo(ox + Math.cos(a - Math.PI / 2) * 3, oy + Math.sin(a - Math.PI / 2) * 3);
      ug.closePath(); ug.fill();
      ug.fillStyle = '#f2ebe0'; ug.beginPath(); ug.arc(ox, oy, 2.5, 0, TAU); ug.fill();
    } else { ug.font = `bold ${Math.max(12, Math.round(scale * 4))}px "Segoe UI",system-ui,sans-serif`; ug.textAlign = 'center'; ug.textBaseline = 'middle'; ug.fillStyle = '#ffd45e'; ug.fillText('⌂', ox, oy + 1); }
    ug.font = `bold ${Math.max(10, Math.round(scale * 2.8))}px "Segoe UI",system-ui,sans-serif`; ug.textAlign = 'center'; ug.textBaseline = 'top'; ug.fillStyle = '#f2ebe0';
    ug.fillText(`⌂ ${Math.round(dist / 16)}`, ox, oy + r + 3);
    // whirlpool escape bar above the player
    const c = st.caught;
    if (c) {
      const sx = Math.round((p.x - cx) * scale), sy = Math.round((p.y - 46 - cy) * scale), bw = Math.round(scale * 30), bh = Math.round(scale * 2.2);
      ug.font = `bold ${Math.max(11, Math.round(scale * 3.4))}px "Segoe UI",system-ui,sans-serif`; ug.textAlign = 'center'; ug.textBaseline = 'bottom';
      const label = L(ctx).escape, tw = ug.measureText(label).width + 10;
      ug.fillStyle = 'rgba(13,11,20,.7)'; ug.beginPath(); ug.roundRect(sx - tw / 2, sy - bh - 8 - Math.round(scale * 4) - 4, tw, Math.round(scale * 4) + 4, 4); ug.fill();
      ug.fillStyle = '#ff6b6b'; ug.fillText(label, sx, sy - bh - 8);
      ug.fillStyle = 'rgba(13,11,20,.8)'; ug.fillRect(sx - bw / 2 - 1, sy - bh - 1, bw + 2, bh + 2);
      ug.fillStyle = '#3a2a2a'; ug.fillRect(sx - bw / 2, sy - bh, bw, bh);
      ug.fillStyle = c.meter > 0.66 ? '#7fd14b' : '#ffd45e'; ug.fillRect(sx - bw / 2, sy - bh, Math.round(bw * c.meter), bh);
    }
    ug.restore();
  },

  hudLines(ctx) {
    if (!st.on || !ctx.S.sea) return [];
    const s = ctx.S.sea, t = L(ctx), hp = clamp(s.raft.hp, 0, s.raft.max);
    let line = (s.raft.sail ? '⛵ ' : '🛶 ') + '♥'.repeat(hp) + '♡'.repeat(Math.max(0, s.raft.max - hp));
    if (s.riding !== 'raft' && st.parked) line += ` (${t.moored})`;
    return [line];
  }
};

// ---------------- test hooks ----------------
if (typeof window !== 'undefined') {
  window.__raft = {
    state: () => (st.ctx ? st.ctx.S.sea : null),
    info: () => ({ on: st.on, parked: st.parked, caught: st.caught ? { w: { x: st.caught.w.x, y: st.caught.w.y }, meter: +st.caught.meter.toFixed(2) } : null, immune: +st.immune.toFixed(1), sinkT: +st.sinkT.toFixed(1), whirls: st.whirls.map(w => ({ x: w.x, y: w.y })), planks: st.planks.filter(f => !f.dead).map(f => ({ x: f.x, y: f.y })), crates: st.crates.filter(f => !f.dead).map(f => ({ x: f.x, y: f.y })), tut: st.tut }),
    warp(tx, ty) { const p = st.ctx.S.player; p.x = tx * 16 + 8; p.y = ty * 16 + 14; return { x: p.x, y: p.y }; },
    sink() { if (st.ctx && st.ctx.S.sea) sink(st.ctx); },
    give() { const b = st.ctx.bag; b.add('plank', 4); b.add('sailcloth', 1); b.add('rope', 2); return { plank: b.count('plank'), sailcloth: b.count('sailcloth'), rope: b.count('rope') }; },
    damage(n = 1) { const s = st.ctx.S.sea; if (s) s.raft.hp -= n; return s ? s.raft.hp : null; },
    mash() { mash(); return st.caught ? st.caught.meter : null; }
  };
}
