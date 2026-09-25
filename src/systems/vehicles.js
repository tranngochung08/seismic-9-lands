import { HOOK } from '../gfx.js';
// vehicles.js — rideable vehicles, one family per land, plus the crafted upgrades.
//   boat    (m1)          — only floats on WATER, 1.5× (3.0× with a sail)
//   raft    (any land with water, needs `raft`) — 0.9×, carries everything the boat does
//   skis    (m8)          — 2.2× on SNOW/ICE, 0.7× elsewhere (2.8 / 1.0 waxed, jumps small chasms)
//   jeep    (m4/m5/m6/m7) — 2.6× on map.roads, 1.3× off-road (2.0 on obsidian tires), burns charcoal
//   cart    (m4)          — rides the rail line laid at zone enter, 3.2×
//   balloon (m8)          — 20 s flight over everything, needs cloth (sail) + 3 charcoal
// Upgrade flags live in save.sys.vehicles: raft / sail / wax / tires (set by the crafting module).
// Sprites are drawn procedurally at module load (no image files). See systems/API.md.

// ---------------- text ----------------
const STR = {
  en: {
    boatOn: 'Row the boat', boatOff: 'Leave the boat', skiOn: 'Put on skis', skiOff: 'Take off skis', carOn: 'Drive', carOff: 'Get out',
    noLand: 'No shore next to the boat', noWater: 'No open water here',
    raftOn: 'Board the raft', raftOff: 'Leave the raft', sailUp: 'Sail raised!',
    cartOn: 'Ride the cart', cartOff: 'Get off the cart', noSpot: 'No room to step off',
    balloonOn: 'Launch balloon (🔥3)', balloonOff: 'Land',
    needCloth: 'Balloon needs cloth — raise a sail first', needCoal: 'Balloon needs 🔥3 charcoal — burn wood at the furnace in M4/M5 (3 wood → 2 charcoal)',
    fuel: n => `⛽ ${n}`, fuelOut: '⛽ 0 — needs charcoal (furnace M4/M5: 3 wood → 2 charcoal)', dry: 'The jeep sputters — out of charcoal. Burn wood at the furnace in M4/M5 (3 wood → 2 charcoal)',
    fly: s => `🎈 ${s}s`, busy: 'Not while you are piloting something else'
  },
  vi: {
    boatOn: 'Chèo thuyền', boatOff: 'Lên bờ', skiOn: 'Mang ván trượt', skiOff: 'Tháo ván', carOn: 'Lái xe', carOff: 'Xuống xe',
    noLand: 'Không có bờ cạnh thuyền', noWater: 'Chỗ này không có mặt nước',
    raftOn: 'Lên bè', raftOff: 'Rời bè', sailUp: 'Đã giương buồm!',
    cartOn: 'Lên xe goòng', cartOff: 'Xuống xe goòng', noSpot: 'Không có chỗ để bước xuống',
    balloonOn: 'Thả khinh khí cầu (🔥3)', balloonOff: 'Hạ cánh',
    needCloth: 'Khinh khí cầu cần vải — hãy làm buồm trước', needCoal: 'Khinh khí cầu cần 🔥3 than — nung gỗ ở Lò nung M4/M5 (3 gỗ → 2 than)',
    fuel: n => `⛽ ${n}`, fuelOut: '⛽ 0 — cần than (Lò nung M4/M5: 3 gỗ → 2 than)', dry: 'Xe khục khặc — hết than rồi. Nung gỗ ở Lò nung M4/M5 (3 gỗ → 2 than)',
    fly: s => `🎈 ${s}s`, busy: 'Không được khi đang điều khiển thứ khác'
  }
};
const L = ctx => STR[ctx.lang && ctx.lang() === 'vi' ? 'vi' : 'en'];

// which land gets which vehicle
const ZONE_KIND = { m1: 'boat', m8: 'ski', m4: 'jeep', m5: 'jeep', m6: 'jeep', m7: 'jeep' };
// preferred parking tile (before the free-tile search), entrance is (40,59)
const PARK_HINT = { ski: { x: 43, y: 57 }, jeep: { x: 43, y: 59 } };
// mine cart + rail (m4) and balloon (m8)
const RAIL_ZONE = 'm4', RAIL = { vx: 40, vy0: 12, vy1: 55, hy: 28, hx0: 14, hx1: 66 }, CART_HOME = { x: 40, y: 54 };
const BALLOON_ZONE = 'm8', BALLOON_HINT = { x: 36, y: 8 }, BALLOON_OBJ = 'veh_balloon';
// tuning
const SPD = { boat: 1.5, sail: 3.0, raft: 0.9, ski: 2.2, skiWax: 2.8, skiOff: 0.7, skiOffWax: 1.0, road: 2.6, off: 1.3, rough: 1.0, tires: 2.0, dry: 0.5, cart: 3.2, balloon: 1.4 };
const FUEL_PX = 160;              // px driven per charcoal
const FLY_SECS = 20, FLY_ALT = 40;
const BASE_SPEED = 84;            // px/s at speedMul 1 (entities.js)

// ---------------- tiny pixel helpers (same style as gfx.js) ----------------
const C = {
  out: '#1c1a24', wood: '#8a5a2b', woodD: '#5f3d1c', woodL: '#a8733c', rope: '#d9c283',
  jeep: '#6b7f3a', jeepD: '#51632b', jeepK: '#3c4a20', glass: '#8fd3ff', lamp: '#ffd45e',
  tyre: '#26262c', tyreL: '#50505a', metal: '#b9b9c2', metalD: '#74747e',
  ski: '#e04b4b', skiD: '#a83128', pole: '#d0d4dc', snow: '#eaf4ff', water: '#7cc0f2',
  cloth: '#f2ead6', clothD: '#d8cbb0', red: '#c94b33', blue: '#3d6db5', rail: '#9a9aa3', railL: '#c9c9d2'
};
const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const px = (g, x, y, c, w = 1, h = 1) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
function ln(g, x0, y0, x1, y1, c, t = 1) {
  const dx = x1 - x0, dy = y1 - y0, n = Math.max(Math.abs(dx), Math.abs(dy), 1); g.fillStyle = c;
  for (let i = 0; i <= n; i++) g.fillRect(Math.round(x0 + dx * i / n) - (t >> 1), Math.round(y0 + dy * i / n) - (t >> 1), t, t);
}
function circ(g, cx, cy, r, c) { g.fillStyle = c; for (let dy = -r; dy <= r; dy++) { const w = Math.floor(Math.sqrt(r * r - dy * dy)); g.fillRect(cx - w, cy + dy, 2 * w + 1, 1); } }
function sheetOf(w, h, fn, flip) {
  const c = mk(w, h), g = c.getContext('2d');
  if (flip) { g.translate(w, 0); g.scale(-1, 1); }
  fn(g); return c;
}

// ---------------- boat: 32×20, 2 oar frames × 4 dirs ----------------
function boatHullSide(g) {
  px(g, 1, 8, C.out, 30, 2); px(g, 2, 8, C.woodL, 28, 1);              // gunwale
  for (let k = 0; k < 10; k++) px(g, 2 + k, 9 + k, C.out, 28 - 2 * k, 1);  // outline of the hull
  for (let k = 0; k < 8; k++) px(g, 3 + k, 10 + k, k % 3 === 0 ? C.woodD : C.wood, 26 - 2 * k, 1);
  px(g, 27, 4, C.out, 3, 6); px(g, 28, 5, C.woodL, 2, 5);              // bow post (points right)
  px(g, 3, 6, C.out, 3, 4); px(g, 4, 7, C.woodD, 1, 3);                // stern post
  px(g, 10, 10, C.out, 12, 3); px(g, 11, 11, C.woodD, 10, 1);          // bench
  px(g, 6, 11, C.rope, 3, 1);
}
function boatSide(g, f) {
  ln(g, 17, 10, 27, f ? 3 : 13, C.out, 3); ln(g, 17, 10, 27, f ? 3 : 13, C.woodL, 1);   // far oar
  boatHullSide(g);
  ln(g, 13, 11, 3, f ? 16 : 4, C.out, 3); ln(g, 13, 11, 3, f ? 16 : 4, C.wood, 1);      // near oar
  px(g, f ? 3 : 2, f ? 16 : 4, C.woodD, 3, 2);
}
function boatFront(g, f, back) {
  ln(g, 10, 10, 1, f ? 16 : 4, C.out, 3); ln(g, 10, 10, 1, f ? 16 : 4, C.wood, 1);
  ln(g, 22, 10, 31, f ? 16 : 4, C.out, 3); ln(g, 22, 10, 31, f ? 16 : 4, C.wood, 1);
  px(g, 7, 8, C.out, 18, 2); px(g, 8, 8, C.woodL, 16, 1);
  for (let k = 0; k < 9; k++) px(g, 8 + k, 9 + k, C.out, 16 - 2 * k, 1);
  for (let k = 0; k < 7; k++) px(g, 9 + k, 10 + k, k % 3 === 0 ? C.woodD : C.wood, 14 - 2 * k, 1);
  if (!back) { px(g, 14, 3, C.out, 4, 6); px(g, 15, 4, C.woodL, 2, 5); }   // bow post towards the camera
  px(g, 11, 11, C.out, 10, 2); px(g, 12, 12, C.woodD, 8, 1);
}
const BOAT = [0, 1, 2, 3].map(d => [0, 1].map(f =>
  HOOK.image(`boat_${d}_${f}`, sheetOf(32, 20, g => d === 0 ? boatFront(g, f, false) : d === 3 ? boatFront(g, f, true) : boatSide(g, f), d === 1))));   // art.js thay ảnh PixelLab
// moored: oars stowed across the gunwale
const BOAT_PARK = HOOK.image('boat_park', sheetOf(32, 20, g => { boatHullSide(g); ln(g, 7, 9, 25, 6, C.out, 3); ln(g, 7, 9, 25, 6, C.woodL, 1); }));

// ---------------- sail (upgrade): 30×26, drawn above the hull ----------------
function mast(g, x) { px(g, x, 0, C.out, 3, 26); px(g, x + 1, 1, C.woodL, 1, 24); }
function sailSide(g, f) {
  mast(g, 12);
  for (let k = 0; k < 20; k++) {                                        // billowing triangle to starboard
    const w = 2 + Math.round((11 + (f ? 1 : 0)) * Math.sin((k / 19) * Math.PI * 0.95));
    px(g, 15, 2 + k, C.out, w + 1, 1);
    px(g, 15, 2 + k, (k > 7 && k < 11) ? C.red : (k % 6 === 5 ? C.clothD : C.cloth), w, 1);
  }
  ln(g, 15, 2, 14, 23, C.rope, 1);
}
function sailFront(g, f) {
  mast(g, 14);                                                          // the mast shows below the cloth
  for (let k = 0; k < 16; k++) {
    const w = 3 + Math.round((8 + (f ? 1 : 0)) * Math.sin((k / 15) * Math.PI * 0.9));
    px(g, 15 - w, 2 + k, C.out, 2 * w + 3, 1);
    px(g, 16 - w, 2 + k, (k > 6 && k < 9) ? C.red : (k % 5 === 4 ? C.clothD : C.cloth), 2 * w + 1, 1);
  }
  px(g, 8, 1, C.out, 16, 2); px(g, 9, 2, C.woodL, 14, 1);               // yard
}
const SAIL = [0, 1, 2, 3].map(d => [0, 1].map(f =>
  sheetOf(30, 26, g => (d === 0 || d === 3) ? sailFront(g, f) : sailSide(g, f), d === 1)));

// ---------------- raft (upgrade): 32×20 logs + rope ----------------
function raftTop(g) {
  for (let i = 0; i < 4; i++) {
    const y = 4 + i * 4;
    px(g, 1, y, C.out, 30, 4);
    px(g, 2, y + 1, i % 2 ? C.wood : C.woodL, 28, 2);
    px(g, 2, y + 3, C.woodD, 28, 1);
    px(g, 2, y + 1, '#a8733c', 1, 2); px(g, 29, y + 1, '#6f4720', 1, 2);   // log ends
  }
  for (const x of [7, 23]) { px(g, x, 3, C.out, 3, 18); px(g, x, 4, C.rope, 2, 16); }  // lashings
  px(g, 12, 2, C.out, 8, 3); px(g, 13, 3, C.rope, 6, 1);                                // bow rope loop
}
const RAFT = sheetOf(32, 20, raftTop);

// ---------------- ski rack: 20×28 ----------------
const RACK = HOOK.image('rack', sheetOf(20, 28, g => {
  px(g, 1, 24, C.snow, 18, 3); px(g, 2, 27, '#c8dcee', 16, 1);           // snow at the foot
  px(g, 2, 8, C.out, 3, 18); px(g, 3, 9, C.woodD, 1, 16);
  px(g, 15, 8, C.out, 3, 18); px(g, 16, 9, C.woodD, 1, 16);
  px(g, 1, 10, C.out, 18, 3); px(g, 2, 11, C.wood, 16, 1);
  ln(g, 6, 26, 9, 1, C.out, 3); ln(g, 6, 26, 9, 1, C.ski, 1); px(g, 8, 1, C.ski, 2, 2);
  ln(g, 9, 26, 12, 1, C.out, 3); ln(g, 9, 26, 12, 1, C.skiD, 1);
  ln(g, 13, 26, 15, 4, C.out, 3); ln(g, 13, 26, 15, 4, C.pole, 1);
  px(g, 13, 8, C.metalD, 3, 1);
}));

// ---------------- jeep: 24×16, 2 wheel frames × 4 dirs ----------------
function wheel(g, x, y, f) { circ(g, x, y, 3, C.out); circ(g, x, y, 2, C.tyre); px(g, x + (f ? -1 : 0), y + (f ? -1 : 1), C.tyreL, 1, 1); px(g, x - 1, y + 3, C.out, 3, 1); }
function jeepSide(g, f) {
  wheel(g, 5, 12, f); wheel(g, 18, 12, f);
  px(g, 1, 6, C.out, 22, 7); px(g, 2, 7, C.jeep, 20, 5); px(g, 2, 10, C.jeepD, 20, 2); px(g, 2, 7, C.jeepK, 20, 1);
  px(g, 14, 2, C.out, 8, 5); px(g, 15, 3, C.glass, 6, 3);               // windshield / hood
  px(g, 4, 3, C.out, 2, 4); px(g, 4, 2, C.out, 10, 2); px(g, 5, 3, C.metal, 8, 1);  // roll bar
  px(g, 22, 8, C.lamp, 2, 2); px(g, 1, 8, '#c94b33', 1, 2);
  px(g, 8, 12, C.jeepK, 8, 1);
}
function jeepFace(g, f, back) {
  wheel(g, 4, 12, f); wheel(g, 19, 12, f);
  px(g, 2, 3, C.out, 20, 10); px(g, 3, 4, C.jeep, 18, 8); px(g, 3, 10, C.jeepD, 18, 2);
  px(g, 5, 4, C.out, 14, 5); px(g, 6, 5, back ? C.jeepK : C.glass, 12, 3);
  if (back) { px(g, 4, 11, '#c94b33', 3, 2); px(g, 17, 11, '#c94b33', 3, 2); }
  else { px(g, 4, 11, C.lamp, 3, 2); px(g, 17, 11, C.lamp, 3, 2); for (let i = 0; i < 5; i++) px(g, 8 + i * 2, 11, C.jeepK, 1, 2); }
  px(g, 2, 2, C.out, 20, 1);
}
const JEEP = [0, 1, 2, 3].map(d => [0, 1].map(f =>
  HOOK.image(`jeep_${d}_${f}`, sheetOf(24, 16, g => d === 0 ? jeepFace(g, f, false) : d === 3 ? jeepFace(g, f, true) : jeepSide(g, f), d === 1))));
// fat obsidian tyres: a darker, wider wheel pasted over the stock ones
function tyre(g, x, y, f) { circ(g, x, y, 4, C.out); circ(g, x, y, 3, '#1b1b22'); px(g, x + (f ? -2 : 1), y + (f ? -2 : 2), '#6a5f7a', 2, 1); px(g, x - 2, y + 4, C.out, 5, 1); }
const JEEP_T = [0, 1, 2, 3].map(d => [0, 1].map(f => HOOK.image(`jeept_${d}_${f}`, sheetOf(24, 16, g => {
  if (d === 1 || d === 2) { tyre(g, 5, 12, f); tyre(g, 18, 12, f); jeepSide(g, f); tyre(g, 5, 13, f); tyre(g, 18, 13, f); }
  else { tyre(g, 4, 12, f); tyre(g, 19, 12, f); jeepFace(g, f, d === 3); tyre(g, 4, 13, f); tyre(g, 19, 13, f); }
}, d === 1))));

// ---------------- rail overlay (m4): 16×16 ground decals ----------------
function railV(g) {
  for (let y = 1; y < 16; y += 5) { px(g, 2, y, C.out, 12, 3); px(g, 3, y + 1, C.woodD, 10, 1); }
  for (const x of [4, 10]) { px(g, x, 0, C.out, 2, 16); px(g, x, 0, C.rail, 1, 16); px(g, x + 1, 0, C.railL, 1, 16); }
}
function railH(g) {
  for (let x = 1; x < 16; x += 5) { px(g, x, 2, C.out, 3, 12); px(g, x + 1, 3, C.woodD, 1, 10); }
  for (const y of [4, 10]) { px(g, 0, y, C.out, 16, 2); px(g, 0, y, C.rail, 16, 1); px(g, 0, y + 1, C.railL, 16, 1); }
}
const RAIL_V = HOOK.image('rail_v', sheetOf(16, 16, railV)), RAIL_H = HOOK.image('rail_h', sheetOf(16, 16, railH));
const RAIL_X = HOOK.image('rail_x', sheetOf(16, 16, g => { railH(g); railV(g); px(g, 4, 4, C.railL, 8, 8); px(g, 5, 5, C.rail, 6, 6); }));

// ---------------- mine cart: 24×16 ----------------
function cartTub(g, side, f) {
  if (side) { wheel(g, 6, 13, f); wheel(g, 17, 13, f); } else { wheel(g, 5, 13, f); wheel(g, 18, 13, f); }
  px(g, 2, 3, C.out, 20, 10); px(g, 3, 4, C.wood, 18, 8); px(g, 3, 9, C.woodD, 18, 3);
  px(g, 3, 4, '#3a3a44', 18, 1);                                        // rim
  for (const x of [5, 11, 17]) { px(g, x, 4, C.metalD, 1, 8); px(g, x + 1, 4, C.metal, 1, 8); }
  if (!side) {                                                        // looking into the tub: ore load
    px(g, 4, 5, '#2b231b', 16, 4);
    for (const [ox, oy] of [[5, 5], [9, 6], [14, 5], [17, 6]]) { px(g, ox, oy, C.out, 4, 3); px(g, ox + 1, oy, '#9a9aa3', 2, 2); px(g, ox + 1, oy, '#c9c9d2', 1, 1); }
  }
  px(g, 2, 12, C.out, 20, 1);
  px(g, 11, 13, C.metalD, 2, 3);                                        // coupling
}
const CART = [0, 1, 2, 3].map(d => [0, 1].map(f => HOOK.image(`cart_${d}_${f}`, sheetOf(24, 16, g => cartTub(g, d === 1 || d === 2, f), d === 1))));

// ---------------- hot-air balloon: 32×48, basket flush with the canvas bottom ----------------
const BALLOON = HOOK.image('balloon', sheetOf(32, 48, g => {
  for (let dy = -11; dy <= 11; dy++) {                                   // envelope outline
    const w = Math.floor(Math.sqrt(Math.max(0, 121 - dy * dy)));
    px(g, 16 - w - 1, 12 + dy, C.out, 2 * w + 3, 1);
  }
  for (let dy = -11; dy <= 11; dy++) {                                   // striped cloth
    const w = Math.floor(Math.sqrt(Math.max(0, 121 - dy * dy)));
    for (let x = 16 - w; x <= 16 + w; x++) {
      const band = Math.floor(((x - 16) / 11 + 1) * 3.5);
      px(g, x, 12 + dy, band % 2 ? C.cloth : C.red, 1, 1);
    }
  }
  for (let dy = -11; dy <= 11; dy++) { const w = Math.floor(Math.sqrt(Math.max(0, 121 - dy * dy))); px(g, 16 - w, 12 + dy, 'rgba(255,255,255,.18)', Math.max(1, (w / 2) | 0), 1); }
  px(g, 12, 22, C.out, 9, 3); px(g, 13, 23, C.clothD, 7, 1);             // neck
  for (const x of [11, 20]) { ln(g, x, 23, x + (x < 16 ? 1 : -1), 35, C.out, 1); }
  px(g, 14, 27, C.metalD, 5, 2); px(g, 15, 29, '#5a4a3a', 3, 2);         // burner
  px(g, 8, 33, C.out, 16, 15); px(g, 9, 34, C.wood, 14, 13);             // basket
  for (let y = 35; y < 47; y += 3) px(g, 9, y, C.woodD, 14, 1);
  for (let x = 11; x < 23; x += 3) px(g, x, 34, C.woodD, 1, 13);
  px(g, 8, 33, C.woodL, 16, 1); px(g, 9, 46, C.out, 14, 2);
}));

// ---------------- module state ----------------
const st = {
  ctx: null, parked: null, raft: null, cart: null, balloon: null, balloonObj: null, rail: null,
  mounted: null, trail: [], dust: [], t: 0, dustT: 0, reach: null, water: false,
  fuelD: 0, fuelWarn: false, lastX: 0, lastY: 0, ride: null, jump: null, fly: null, checkT: 0
};

const slot = ctx => { const s = ctx.S.save; s.sys = s.sys || {}; return (s.sys.vehicles = s.sys.vehicles || {}); };
const flags = ctx => { const s = slot(ctx); return { raft: !!s.raft, sail: !!s.sail, wax: !!s.wax, tires: !!s.tires }; };
const tileOf = p => ({ x: Math.floor(p.x / 16), y: Math.floor((p.y - 1) / 16) });
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
function restore(p) { p.speedMul = 1; p.passable = null; p.custom = null; p.ghost = false; p.boxW = 10; p.boxH = 6; }
function savePos(ctx, kind, t) {
  const sv = slot(ctx), z = ctx.S.zone.id;
  if (kind === 'raft') (sv.raftPos = sv.raftPos || {})[z] = t;
  else if (kind === 'cart') (sv.cartPos = sv.cartPos || {})[z] = t;
  else if (kind === 'balloon') (sv.balloonPos = sv.balloonPos || {})[z] = t;
  else sv[z] = t;
}
const savedPos = (ctx, key) => (slot(ctx)[key] || {})[ctx.S.zone.id];

// ---------------- map queries ----------------
function occupied(ctx, x, y) {
  for (const o of ctx.S.map.objects) { const d = ctx.O[o.type]; if (!d) continue; if (x >= o.x && x < o.x + d.fw && y >= o.y && y < o.y + d.fh) return true; }
  return false;
}
function inPlot(ctx, x, y, m = 1) { return (ctx.S.map.plots || []).some(p => x >= p.x - m && x < p.x + p.w + m && y >= p.y - m && y < p.y + p.h + m); }
function reachable(ctx, x, y) { const m = ctx.S.map; return st.reach ? !!st.reach[y * m.w + x] : !ctx.isSolid(m, x, y); }
function isWater(ctx, x, y) { return ctx.getG(ctx.S.map, x, y) === ctx.T.WATER; }
function hasWater(ctx) { const m = ctx.S.map; for (let i = 0; i < m.ground.length; i++) if (m.ground[i] === ctx.T.WATER) return true; return false; }
const N4 = [[0, -1], [1, 0], [0, 1], [-1, 0]];
function waterNeighbour(ctx, x, y) { for (const [dx, dy] of N4) if (isWater(ctx, x + dx, y + dy)) return { x: x + dx, y: y + dy }; return null; }
// a tile a vehicle (not a boat) may sit on. needReach=false for the balloon: it may land where no path goes.
function landSpot(ctx, x, y, needReach = true) {
  const m = ctx.S.map, T = ctx.T;
  if (x < 1 || y < 1 || x >= m.w - 1 || y >= m.h - 1) return false;
  const gt = ctx.getG(m, x, y);
  if (gt === T.WATER || gt === T.LAVA || gt === T.CHASM || gt === T.NONE) return false;
  return !ctx.isSolid(m, x, y) && !occupied(ctx, x, y) && (!needReach || reachable(ctx, x, y));
}

function objNear(ctx, x, y) { for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if ((dx || dy) && occupied(ctx, x + dx, y + dy)) return true; return false; }

// land tile touching the sea — the boat's first berth (prefer the middle of the shore, y 20..40, and elbow room)
function findBoatBerth(ctx, away) {
  const m = ctx.S.map; let best = null, bs = 1e9;
  for (let y = 3; y < m.h - 3; y++) for (let x = 2; x < m.w - 1; x++) {
    if (isWater(ctx, x, y) || !landSpot(ctx, x, y)) continue;
    if (!waterNeighbour(ctx, x, y)) continue;
    let s = Math.abs(y - 30) + (y >= 20 && y <= 40 ? 0 : 20) + (objNear(ctx, x, y) ? 14 : 0);
    if (away && Math.abs(away.x - x) <= 4 && Math.abs(away.y - y) <= 4) s += 60;   // keep the raft off the boat's berth
    if (s < bs) { bs = s; best = { x, y }; }
  }
  return best;
}
// free tile near a hint (rings outwards): keep off the plots, the central lane and other props when possible
function findPark(ctx, hint) {
  const pick = level => {
    for (let r = 0; r <= 9; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
      const x = hint.x + dx, y = hint.y + dy;
      if (!landSpot(ctx, x, y)) continue;
      if (level > 0 && (inPlot(ctx, x, y) || (x >= 39 && x <= 41))) continue;
      if (level > 1 && objNear(ctx, x, y)) continue;
      return { x, y };
    }
    return null;
  };
  return pick(2) || pick(1) || pick(0);
}
// nearest tile around `at` the player may stand on (rings outwards)
function nearestFree(ctx, at, needReach = false, skip = null, r0 = 0, offRail = false) {
  for (let r = r0; r <= 10; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
    const x = at.x + dx, y = at.y + dy;
    if (skip && skip.x === x && skip.y === y) continue;
    if (offRail && isRail(x, y)) continue;
    if (landSpot(ctx, x, y, needReach)) return { x, y };
  }
  return null;
}
// a 2×2 patch for the balloon, never covering `keep` (where the player stands)
function find2x2(ctx, at, keep) {
  for (let r = 0; r <= 12; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
    const x = at.x + dx, y = at.y + dy;
    let ok = true;
    for (let j = 0; j < 2 && ok; j++) for (let i = 0; i < 2 && ok; i++) {
      if (!landSpot(ctx, x + i, y + j, false)) ok = false;
      if (keep && keep.x === x + i && keep.y === y + j) ok = false;
      if (x + i >= 39 && x + i <= 41) ok = false;              // never block the central lane
    }
    if (ok) return { x, y };
  }
  return null;
}
function spotOk(ctx, kind, p) {
  const m = ctx.S.map;
  if (!p || p.x < 1 || p.y < 1 || p.x >= m.w - 1 || p.y >= m.h - 1) return false;
  if (kind === 'boat' || kind === 'raft') return isWater(ctx, p.x, p.y) || (!ctx.isSolid(m, p.x, p.y) && !occupied(ctx, p.x, p.y) && !!waterNeighbour(ctx, p.x, p.y));
  return !ctx.isSolid(m, p.x, p.y) && !occupied(ctx, p.x, p.y);
}
// rail: bit 1 = vertical line, bit 2 = horizontal line
function railKind(tx, ty) {
  const r = st.rail; if (!r) return 0;
  let k = 0;
  if (tx === r.vx && ty >= r.vy0 && ty <= r.vy1) k |= 1;
  if (ty === r.hy && tx >= r.hx0 && tx <= r.hx1) k |= 2;
  return k;
}
const isRail = (tx, ty) => railKind(tx, ty) !== 0;

// ---------------- mounted sprites (drawn in world coords by Entity.draw) ----------------
function drawBoat(g, ent) {
  const x = Math.round(ent.x), y = Math.round(ent.y), d = ent.dir & 3;
  const f = ent.moving ? (Math.floor(st.t * 5) & 1) : 0;
  const bob = Math.round(Math.sin(st.t * 2.2) * 1);
  const sail = st.ctx && flags(st.ctx).sail;
  g.fillStyle = 'rgba(20,60,110,.28)'; g.beginPath(); g.ellipse(x, y + 2, 15, 5, 0, 0, 7); g.fill();
  if (sail && d === 3) g.drawImage(SAIL[d][Math.floor(st.t * 3) & 1], x - 15, y - 44 + bob);   // sailing away: cloth behind the rower
  g.drawImage(BOAT[d][f], x - 16, y - 16 + bob);
  // rower: head + torso only, sitting on the bench — clip chèo PixelLab nếu có (khung theo thời gian khi đang đi)
  const pad = !sail && ent.sheet.actions && ent.sheet.actions.paddle;
  if (pad) { const s0 = Math.max(0, pad.n - 4), pf = ent.moving ? s0 + Math.floor(st.t * 7) % (pad.n - s0) : s0, ch = pad.ch || 20, cw = pad.cw || 16, ex = ch - 20; g.drawImage(pad.img, pf * cw, d * ch, cw, 13 + ex, x - (cw >> 1), y - 22 + bob - ex, cw, 13 + ex); }
  else g.drawImage(ent.sheet, (ent.frame || 0) * 16, d * 20, 16, 13, x - 8, y - 22 + bob, 16, 13);
  px(g, x - 5, y - 10 + bob, C.out, 10, 2); px(g, x - 4, y - 9 + bob, C.woodD, 8, 1);   // bench in front of the rower
  if (sail && d !== 3) g.drawImage(SAIL[d][Math.floor(st.t * 3) & 1], x - 15, y - 44 + bob);
}
function drawRaft(g, ent) {
  const x = Math.round(ent.x), y = Math.round(ent.y), d = ent.dir & 3;
  const bob = Math.round(Math.sin(st.t * 2.6) * 1);
  const sw = ent.moving ? Math.round(Math.sin(st.t * 6) * 2) : 0;
  g.fillStyle = 'rgba(20,60,110,.28)'; g.beginPath(); g.ellipse(x, y + 3, 16, 5, 0, 0, 7); g.fill();
  g.drawImage(RAFT, x - 16, y - 13 + bob);
  g.drawImage(ent.sheet, (ent.frame || 0) * 16, d * 20, 16, 20, x - 8, y - 26 + bob, 16, 20);
  ln(g, x + 7, y - 20 + bob, x + 12 + sw, y - 2 + bob, C.out, 2);            // punt pole
  ln(g, x + 7, y - 20 + bob, x + 12 + sw, y - 2 + bob, C.woodL, 1);
}
function drawSkier(g, ent) {
  const x = Math.round(ent.x), y = Math.round(ent.y) - (st.jump ? st.jump.h : 0), d = ent.dir & 3, side = d === 1 || d === 2;
  g.fillStyle = 'rgba(0,0,0,.18)'; g.beginPath(); g.ellipse(x, Math.round(ent.y), st.jump ? 7 : 10, 3, 0, 0, 7); g.fill();
  if (side) { px(g, x - 11, y - 4, C.out, 22, 2); px(g, x - 11, y - 4, C.ski, 21, 1); px(g, x - 9, y - 1, C.out, 22, 2); px(g, x - 9, y - 1, C.skiD, 21, 1); }
  else for (const [sx, col] of [[-6, C.ski], [4, C.skiD]]) { px(g, x + sx, y - 9, C.out, 2, 15); px(g, x + sx, y - 8, col, 2, 13); px(g, x + sx, d === 3 ? y - 9 : y + 4, C.pole, 2, 1); }
  g.drawImage(ent.sheet, (ent.frame || 0) * 16, d * 20, 16, 20, x - 8, y - 18, 16, 20);
  const sw = ent.moving ? Math.round(Math.sin(st.t * 11) * 2) : 0;
  ln(g, x - 8, y - 12, x - 11, y - 1 + sw, C.out, 2); ln(g, x - 8, y - 12, x - 11, y - 1 + sw, C.pole, 1);
  ln(g, x + 8, y - 12, x + 11, y - 1 - sw, C.out, 2); ln(g, x + 8, y - 12, x + 11, y - 1 - sw, C.pole, 1);
}
function drawJeep(g, ent) {
  const x = Math.round(ent.x), y = Math.round(ent.y), d = ent.dir & 3;
  const f = ent.moving ? (Math.floor(st.t * 14) & 1) : 0;
  const jolt = ent.moving ? (Math.floor(st.t * 18) & 1) : 0;
  const sheets = (st.ctx && flags(st.ctx).tires) ? JEEP_T : JEEP;
  g.fillStyle = 'rgba(0,0,0,.22)'; g.beginPath(); g.ellipse(x, y, 12, 4, 0, 0, 7); g.fill();
  const oy = y - 14 - jolt;
  // sides/back: head + shoulders behind the body; front view: the head shows over the windshield
  if (d !== 0) g.drawImage(ent.sheet, 0, d * 20, 16, 10, x - 8, oy - 4, 16, 10);
  g.drawImage(sheets[d][f], x - 12, oy);
  if (d === 0) g.drawImage(ent.sheet, 0, 0, 16, 10, x - 8, oy - 4, 16, 10);
}
function drawCart(g, ent) {
  const x = Math.round(ent.x), y = Math.round(ent.y), d = ent.dir & 3;
  const f = Math.floor(st.t * 16) & 1;
  g.fillStyle = 'rgba(0,0,0,.22)'; g.beginPath(); g.ellipse(x, y, 11, 4, 0, 0, 7); g.fill();
  const oy = y - 15;
  if (d !== 0) g.drawImage(ent.sheet, (ent.frame || 0) * 16, d * 20, 16, 12, x - 8, oy - 6, 16, 12);
  g.drawImage(CART[d][f], x - 12, oy);
  if (d === 0) g.drawImage(ent.sheet, (ent.frame || 0) * 16, 0, 16, 12, x - 8, oy - 8, 16, 12);
}
function drawBalloonFly(g, ent) {
  const x = Math.round(ent.x), y = Math.round(ent.y), alt = st.fly ? Math.round(st.fly.alt) : FLY_ALT;
  const k = 1 - Math.min(1, alt / FLY_ALT) * 0.5;
  g.fillStyle = `rgba(0,0,0,${(0.3 * k).toFixed(3)})`; g.beginPath(); g.ellipse(x, y, 9 * k + 3, 4 * k + 1, 0, 0, 7); g.fill();
  const sway = Math.round(Math.sin(st.t * 1.5) * (alt > 6 ? 1 : 0));
  const top = y - alt - 48;
  g.drawImage(ent.sheet, (ent.frame || 0) * 16, (ent.dir & 3) * 20, 16, 11, x - 8 + sway, top + 24, 16, 11);
  g.drawImage(BALLOON, x - 16 + sway, top);
  if ((Math.floor(st.t * 10) & 1) === 0) { px(g, x - 2 + sway, top + 29, '#ffd45e', 4, 3); px(g, x - 1 + sway, top + 28, '#ff8c1a', 2, 2); }
}

// ---------------- mount / dismount ----------------
function mount(ctx, kind) {
  const p = ctx.S.player, t = L(ctx);
  if (p.custom) { ctx.toast(t.busy); return; }                 // Rocky / another system is driving the player
  const k = kind || (st.parked && st.parked.kind); if (!k) return;
  const src = k === 'raft' ? st.raft : st.parked; if (!src) return;
  const fl = flags(ctx);
  if (k === 'boat' || k === 'raft') {
    const w = isWater(ctx, src.x, src.y) ? src : waterNeighbour(ctx, src.x, src.y);
    if (!w) { ctx.toast(t.noWater); return; }
    p.x = w.x * 16 + 8; p.y = w.y * 16 + 14;
    p.speedMul = k === 'raft' ? SPD.raft : (fl.sail ? SPD.sail : SPD.boat); p.boxW = 14; p.boxH = 8;
    p.passable = (map, tx, ty) => ctx.getG(map, tx, ty) === ctx.T.WATER;
    p.custom = k === 'raft' ? drawRaft : drawBoat;
    if (k === 'boat' && fl.sail) { const sv = slot(ctx); if (!sv.sailToast) { sv.sailToast = true; ctx.toast(t.sailUp); ctx.sfx('build'); } }
  } else if (k === 'ski') { p.speedMul = fl.wax ? SPD.skiWax : SPD.ski; p.custom = drawSkier; st.trail.length = 0; }
  else { p.speedMul = SPD.off; p.custom = drawJeep; st.dust.length = 0; st.fuelD = 0; st.fuelWarn = false; st.lastX = p.x; st.lastY = p.y; }
  st.mounted = k;
  if (k === 'raft') st.raft = null; else st.parked = null;
  const sv = slot(ctx); sv.mounted = k; savePos(ctx, k, tileOf(p)); ctx.persist();
}
function dismount(ctx) {
  const p = ctx.S.player, k = st.mounted; if (!k) return;
  const at = tileOf(p);
  if (k === 'boat' || k === 'raft') {
    const out = stepOff(ctx, at, p.dir, t => !isWater(ctx, t.x, t.y) && !ctx.isSolid(ctx.S.map, t.x, t.y));
    if (!out) { ctx.toast(L(ctx).noLand); return; }
    restore(p); p.x = out.x * 16 + 8; p.y = out.y * 16 + 14;
  } else {
    restore(p);
    const out = stepOff(ctx, at, (p.dir + 2) % 4, t => !ctx.isSolid(ctx.S.map, t.x, t.y));
    if (out) { p.x = out.x * 16 + 8; p.y = out.y * 16 + 14; }
  }
  st.mounted = null;
  if (k === 'raft') st.raft = { x: at.x, y: at.y }; else st.parked = { kind: k, x: at.x, y: at.y };
  const sv = slot(ctx); sv.mounted = null; savePos(ctx, k, { x: at.x, y: at.y }); ctx.persist();
}
// first free neighbour, trying `dir` first then clockwise, then the diagonals
function stepOff(ctx, at, dir, ok) {
  const order = [N4[[2, 3, 1, 0][dir & 3]]];   // dir 0 down, 1 left, 2 right, 3 up → N4 index
  for (const n of N4) if (!order.includes(n)) order.push(n);
  const diag = [[1, 1], [-1, 1], [1, -1], [-1, -1]];
  for (const [dx, dy] of order.concat(diag)) { const t = { x: at.x + dx, y: at.y + dy }; if (ok(t)) return t; }
  return null;
}
function forceDismount(ctx) {
  restore(ctx.S.player);
  st.mounted = null; st.trail.length = 0; st.dust.length = 0;
  st.ride = null; st.jump = null; st.fly = null; st.fuelD = 0; st.fuelWarn = false;
  const sv = slot(ctx); if (sv.mounted) { sv.mounted = null; }
}

// ---------------- mine cart ----------------
function mountCart(ctx) {
  const p = ctx.S.player, t = L(ctx);
  if (p.custom) { ctx.toast(t.busy); return; }
  if (!st.cart) return;
  const c = st.cart;
  p.x = c.x * 16 + 8; p.y = c.y * 16 + 14;
  p.speedMul = 0;                                    // the rail drives, not the legs
  p.boxW = 12; p.boxH = 6;
  p.passable = (map, tx, ty) => isRail(tx, ty);
  p.custom = drawCart;
  const k = railKind(c.x, c.y);
  st.ride = { axis: (k & 1) ? 'v' : 'h', dir: (k & 1) ? -1 : 1 };
  st.mounted = 'cart'; st.cart = null;
  const sv = slot(ctx); sv.mounted = 'cart'; savePos(ctx, 'cart', { x: c.x, y: c.y }); ctx.persist();
  ctx.sfx('squeak');
}
function cartOff(ctx) {
  const p = ctx.S.player, at = tileOf(p);
  const out = nearestFree(ctx, at, false, null, 1, true) || nearestFree(ctx, at, false, null, 1);
  if (!out) { ctx.toast(L(ctx).noSpot); return; }
  restore(p); p.x = out.x * 16 + 8; p.y = out.y * 16 + 14;
  st.mounted = null; st.ride = null; st.cart = { x: at.x, y: at.y };
  const sv = slot(ctx); sv.mounted = null; savePos(ctx, 'cart', { x: at.x, y: at.y }); ctx.persist();
}
function rideCart(dt, ctx) {
  const p = ctx.S.player, r = st.rail, ride = st.ride; if (!r || !ride) return;
  const jx = r.vx * 16 + 8, jy = r.hy * 16 + 14, i = ctx.input;
  // the pushed direction picks where the cart rolls — and which branch it takes at the junction
  if (ride.axis === 'v') {
    if (i.up) ride.dir = -1; else if (i.down) ride.dir = 1;
    if ((i.left || i.right) && Math.abs(p.y - jy) <= 7) { ride.axis = 'h'; ride.dir = i.right ? 1 : -1; p.y = jy; }
  } else {
    if (i.left) ride.dir = -1; else if (i.right) ride.dir = 1;
    if ((i.up || i.down) && Math.abs(p.x - jx) <= 7) { ride.axis = 'v'; ride.dir = i.down ? 1 : -1; p.x = jx; }
  }
  const v = BASE_SPEED * SPD.cart * dt;
  if (ride.axis === 'v') { p.x = jx; p.y = clamp(p.y + ride.dir * v, r.vy0 * 16 + 14, r.vy1 * 16 + 14); p.dir = ride.dir > 0 ? 0 : 3; }
  else { p.y = jy; p.x = clamp(p.x + ride.dir * v, r.hx0 * 16 + 8, r.hx1 * 16 + 8); p.dir = ride.dir > 0 ? 2 : 1; }
  p.moving = true;
}

// ---------------- hot-air balloon ----------------
function balloonBlock(ctx) {            // what is missing, or null when it may launch
  const fl = flags(ctx), t = L(ctx);
  if (!fl.sail) return t.needCloth;
  if (ctx.bag.count('charcoal') < 3) return t.needCoal;
  return null;
}
function placeBalloon(ctx, at) {
  const m = ctx.S.map;
  ctx.defineObject(BALLOON_OBJ, 32, 48, 2, 2, g => g.drawImage(BALLOON, 0, 0), { solid: true });
  if (st.balloonObj) { ctx.removeObject(m, st.balloonObj); st.balloonObj = null; }
  st.balloonObj = ctx.place(m, BALLOON_OBJ, at.x, at.y);
  st.balloon = { x: at.x, y: at.y };
  savePos(ctx, 'balloon', { x: at.x, y: at.y });
}
function launchBalloon(ctx) {
  const p = ctx.S.player, t = L(ctx);
  if (p.custom) { ctx.toast(t.busy); return; }
  if (!st.balloon) return;
  const miss = balloonBlock(ctx);
  if (miss) { ctx.toast(miss); ctx.sfx('fail'); return; }
  ctx.bag.remove('charcoal', 3);
  if (st.balloonObj) { ctx.removeObject(ctx.S.map, st.balloonObj); st.balloonObj = null; }
  p.x = st.balloon.x * 16 + 16; p.y = st.balloon.y * 16 + 30;
  st.balloon = null;
  p.speedMul = 0; p.ghost = true; p.boxW = 8; p.boxH = 4;
  p.passable = () => true;
  p.custom = drawBalloonFly;
  st.fly = { phase: 'up', t: FLY_SECS, alt: 0, to: null };
  st.mounted = 'balloon';
  const sv = slot(ctx); sv.mounted = 'balloon'; ctx.persist();
  ctx.sfx('roar');
}
function startLanding(ctx) {
  if (!st.fly || st.fly.phase === 'down') return;
  const p = ctx.S.player, at = tileOf(p);
  const spot = landSpot(ctx, at.x, at.y, false) ? at : (nearestFree(ctx, at, false) || at);
  st.fly.phase = 'down'; st.fly.to = spot;
  p.speedMul = 0;
}
function finishLanding(ctx) {
  const p = ctx.S.player, spot = (st.fly && st.fly.to) || tileOf(p);
  restore(p);
  p.x = spot.x * 16 + 8; p.y = spot.y * 16 + 14;
  st.mounted = null; st.fly = null;
  const park = find2x2(ctx, spot, spot);
  if (park) placeBalloon(ctx, park);
  else {                                     // nowhere beside: park on the spot and step the player aside
    const out = nearestFree(ctx, spot, false, spot);
    if (out) { p.x = out.x * 16 + 8; p.y = out.y * 16 + 14; }
    placeBalloon(ctx, spot);
  }
  const sv = slot(ctx); sv.mounted = null; ctx.persist();
  ctx.sfx('build');
}

// ---------------- ski jump over a small chasm ----------------
const DV = [[0, 1], [-1, 0], [1, 0], [0, -1]];   // dir 0 down, 1 left, 2 right, 3 up
function tryJump(ctx) {
  const p = ctx.S.player, i = ctx.input;
  let dx = (i.right ? 1 : 0) - (i.left ? 1 : 0), dy = (i.down ? 1 : 0) - (i.up ? 1 : 0);
  if (!dx && !dy) return false;
  if (Math.abs(dx) >= Math.abs(dy)) dy = 0; else dx = 0;                 // one axis at a time
  // probe 6 px beyond the collision box: the skier stops a few px short of the tile border
  const fx = p.x + (dx > 0 ? 10 : dx < 0 ? -11 : 0), fy = dy > 0 ? p.y + 5 : dy < 0 ? p.y - 12 : p.y - 3;
  const ft = { x: Math.floor(fx / 16), y: Math.floor(fy / 16) };
  if (ctx.getG(ctx.S.map, ft.x, ft.y) !== ctx.T.CHASM) return false;
  const lx = ft.x + dx, ly = ft.y + dy;                                   // the tile beyond the gap
  if (ctx.getG(ctx.S.map, lx, ly) === ctx.T.CHASM || ctx.isSolid(ctx.S.map, lx, ly)) return false;
  st.jump = { t: 0, dur: 0.42, h: 0, x0: p.x, y0: p.y, x1: lx * 16 + 8, y1: ly * 16 + 14 };
  p.speedMul = 0; p.passable = () => true;
  ctx.sfx('squeak');
  return true;
}
function stepJump(dt, ctx) {
  const p = ctx.S.player, j = st.jump;
  j.t += dt;
  const k = Math.min(1, j.t / j.dur);
  p.x = j.x0 + (j.x1 - j.x0) * k; p.y = j.y0 + (j.y1 - j.y0) * k;
  j.h = Math.round(Math.sin(Math.PI * k) * 15);
  p.moving = true;
  if (k >= 1) { st.jump = null; p.passable = null; ctx.sfx('hit'); }
}

// ---------------- spawning ----------------
function spawnRaft(ctx) {
  if (st.raft || st.mounted === 'raft' || !st.water || !flags(ctx).raft) return;
  let spot = savedPos(ctx, 'raftPos');
  if (!spotOk(ctx, 'raft', spot)) spot = findBoatBerth(ctx, st.parked);
  if (!spot) return;
  st.raft = { x: spot.x, y: spot.y }; savePos(ctx, 'raft', { x: spot.x, y: spot.y }); ctx.persist();
}
function spawnCart(ctx) {
  st.rail = { ...RAIL };
  let spot = savedPos(ctx, 'cartPos');
  if (!spot || !isRail(spot.x, spot.y)) spot = { ...CART_HOME };
  st.cart = { x: spot.x, y: spot.y }; savePos(ctx, 'cart', { x: spot.x, y: spot.y });
}
function spawnBalloon(ctx) {
  let spot = savedPos(ctx, 'balloonPos');
  const ok = spot && [0, 1].every(j => [0, 1].every(i => landSpot(ctx, spot.x + i, spot.y + j, false)));
  if (!ok) spot = find2x2(ctx, BALLOON_HINT, null);
  if (!spot) return;
  placeBalloon(ctx, spot);
}

// ---------------- system ----------------
export const vehicles = {
  id: 'vehicles',

  onZoneEnter(ctx) {
    st.ctx = ctx;
    if (ctx.S.map.sea) { st.parked = null; st.raft = null; st.cart = null; st.balloon = null; st.balloonObj = null; st.rail = null; st.water = false; return; }   // the Sea of Origins: sea_raft.js owns the raft there
    forceDismount(ctx);
    st.parked = null; st.raft = null; st.cart = null; st.balloon = null; st.balloonObj = null; st.rail = null; st.reach = null;
    const zid = ctx.S.zone.id, kind = ZONE_KIND[zid], m = ctx.S.map;
    st.reach = ctx.computeReach(m, m.entries.default);
    st.water = hasWater(ctx);
    const sv = slot(ctx);
    if (kind) {
      let spot = sv[zid];
      if (!spotOk(ctx, kind, spot)) spot = kind === 'boat' ? findBoatBerth(ctx) : findPark(ctx, PARK_HINT[kind] || m.entries.default);
      if (spot) { st.parked = { kind, x: spot.x, y: spot.y }; sv[zid] = { x: spot.x, y: spot.y }; }
      else delete sv[zid];
    }
    spawnRaft(ctx);
    if (zid === RAIL_ZONE) spawnCart(ctx);
    if (zid === BALLOON_ZONE) spawnBalloon(ctx);
    ctx.persist();
  },

  onZoneLeave(ctx) { forceDismount(ctx); st.balloonObj = null; st.rail = null; },

  update(dt, ctx) {
    st.t += dt; st.ctx = ctx;
    const p = ctx.S.player, m = ctx.S.map, fl = flags(ctx);
    // a flag crafted while standing in the land: bring the raft in without a zone reload
    st.checkT -= dt;
    if (st.checkT <= 0) { st.checkT = 0.5; if (fl.raft && !st.raft && st.mounted !== 'raft') spawnRaft(ctx); }

    if (st.jump) stepJump(dt, ctx);
    else if (st.mounted === 'ski') {
      const t = tileOf(p), gt = ctx.getG(m, t.x, t.y), snow = gt === ctx.T.SNOW || gt === ctx.T.ICE;
      p.speedMul = snow ? (fl.wax ? SPD.skiWax : SPD.ski) : (fl.wax ? SPD.skiOffWax : SPD.skiOff);
      if (fl.wax && p.moving) tryJump(ctx);
      if (p.moving) {
        const l = st.trail[st.trail.length - 1];
        if (!l || Math.hypot(p.x - l.x, p.y - l.y) > 3.5) { st.trail.push({ x: p.x, y: p.y, dir: p.dir, t: 0 }); if (st.trail.length > 40) st.trail.shift(); }
      }
    } else if (st.mounted === 'jeep') {
      const t = tileOf(p), gt = ctx.getG(m, t.x, t.y);
      const onRoad = m.roads && t.x >= 0 && t.y >= 0 && t.x < m.w && t.y < m.h && m.roads[t.y * m.w + t.x] === 1;
      const rough = gt === ctx.T.GRAVEL || gt === ctx.T.ASH;
      // charcoal burns per 160 px driven; empty tank = the jeep sputters everywhere
      let moved = Math.hypot(p.x - st.lastX, p.y - st.lastY); st.lastX = p.x; st.lastY = p.y;
      if (moved > 32) moved = 0;                                     // a teleport (debug / respawn) is not driving
      let coal = ctx.bag.count('charcoal');
      if (coal > 0) {
        st.fuelD += moved;
        while (st.fuelD >= FUEL_PX && coal > 0) { ctx.bag.remove('charcoal', 1); st.fuelD -= FUEL_PX; coal = ctx.bag.count('charcoal'); }
        if (coal > 0) st.fuelWarn = false;
      }
      if (coal <= 0) {
        p.speedMul = SPD.dry;
        if (!st.fuelWarn) { st.fuelWarn = true; ctx.toast(L(ctx).dry); ctx.sfx('fail'); }
      } else p.speedMul = onRoad ? SPD.road : (fl.tires ? SPD.tires : (rough ? SPD.rough : SPD.off));
      if (p.moving) {
        st.dustT -= dt;
        if (st.dustT <= 0) { st.dustT = coal > 0 ? 0.05 : 0.12; st.dust.push({ x: p.x + (Math.random() * 12 - 6), y: p.y + (Math.random() * 3 - 1), t: 0, r: 1.8 + Math.random() * 2, dark: coal <= 0 }); if (st.dust.length > 40) st.dust.shift(); }
      }
    } else if (st.mounted === 'boat') p.speedMul = fl.sail ? SPD.sail : SPD.boat;
    else if (st.mounted === 'raft') p.speedMul = SPD.raft;
    else if (st.mounted === 'cart') rideCart(dt, ctx);
    else if (st.mounted === 'balloon' && st.fly) {
      const f = st.fly;
      if (f.phase === 'up') {
        f.alt = Math.min(FLY_ALT, f.alt + dt * 46);
        if (f.alt >= FLY_ALT) { f.phase = 'fly'; p.speedMul = SPD.balloon; }
      } else if (f.phase === 'fly') {
        p.speedMul = SPD.balloon;
        f.t -= dt;
        if (f.t <= 0) { f.t = 0; startLanding(ctx); }
      } else {
        const tx = f.to.x * 16 + 8, ty = f.to.y * 16 + 14;
        p.x += (tx - p.x) * Math.min(1, dt * 4); p.y += (ty - p.y) * Math.min(1, dt * 4);
        f.alt = Math.max(0, f.alt - dt * 34);
        if (f.alt <= 0) finishLanding(ctx);
      }
    }
    // remember where the vehicle is, so a reload or a walk through a gate leaves it behind (never on a border/gate tile)
    if (st.mounted) {
      const sv = slot(ctx), t = tileOf(p); sv.mounted = st.mounted;
      if (t.x > 1 && t.y > 1 && t.x < m.w - 2 && t.y < m.h - 2) savePos(ctx, st.mounted, { x: t.x, y: t.y });
    }
    for (let i = st.trail.length - 1; i >= 0; i--) { st.trail[i].t += dt; if (st.trail[i].t > 1.8) st.trail.splice(i, 1); }
    for (let i = st.dust.length - 1; i >= 0; i--) { const d = st.dust[i]; d.t += dt; d.y -= dt * 5; d.r += dt * 3.5; if (d.t > 0.6) st.dust.splice(i, 1); }
  },

  drawables(ctx, cx, cy) {
    const out = [], g = ctx.g;
    if (st.rail) out.push({
      y: -1e5, f: () => {                                     // ground decal: under every object and entity
        const m = ctx.S.map;
        const x0 = Math.max(0, Math.floor(cx / 16)), x1 = Math.min(m.w - 1, Math.ceil((cx + ctx.VW) / 16));
        const y0 = Math.max(0, Math.floor(cy / 16)), y1 = Math.min(m.h - 1, Math.ceil((cy + ctx.VH) / 16));
        for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
          const k = railKind(tx, ty); if (!k || ctx.isSolid(m, tx, ty)) continue;
          g.drawImage(k === 3 ? RAIL_X : k === 2 ? RAIL_H : RAIL_V, tx * 16 - cx, ty * 16 - cy);
        }
      }
    });
    if (st.raft) {
      const wx = st.raft.x * 16 + 8, wy = st.raft.y * 16 + 16, afloat = isWater(ctx, st.raft.x, st.raft.y), bob = afloat ? Math.round(Math.sin(st.t * 2.6)) : 0;
      out.push({ y: wy, f: () => { if (afloat) { g.fillStyle = 'rgba(20,60,110,.28)'; g.beginPath(); g.ellipse(wx - cx, wy - 2 - cy, 16, 5, 0, 0, 7); g.fill(); } g.drawImage(RAFT, wx - 16 - cx, wy - 17 + bob - cy); } });
    }
    if (st.cart) {
      const wx = st.cart.x * 16 + 8, wy = st.cart.y * 16 + 16;
      out.push({ y: wy, f: () => { g.fillStyle = 'rgba(0,0,0,.22)'; g.beginPath(); g.ellipse(wx - cx, wy - 2 - cy, 11, 4, 0, 0, 7); g.fill(); g.drawImage(CART[2][0], wx - 12 - cx, wy - 16 - cy); } });
    }
    if (st.parked && !st.mounted) {
      const { kind, x, y } = st.parked, wx = x * 16 + 8, wy = y * 16 + 16;
      if (kind === 'boat') {
        const afloat = isWater(ctx, x, y), bob = afloat ? Math.round(Math.sin(st.t * 2.2)) : 0, sail = flags(ctx).sail;
        out.push({ y: wy, f: () => { if (afloat) { g.fillStyle = 'rgba(20,60,110,.28)'; g.beginPath(); g.ellipse(wx - cx, wy - 2 - cy, 15, 5, 0, 0, 7); g.fill(); } g.drawImage(BOAT_PARK, wx - 16 - cx, wy - 19 + bob - cy); if (sail) g.drawImage(SAIL[2][0], wx - 15 - cx, wy - 47 + bob - cy); } });
      }
      else if (kind === 'ski') out.push({ y: wy, f: () => g.drawImage(RACK, wx - 10 - cx, wy - 26 - cy) });
      else out.push({ y: wy, f: () => { g.fillStyle = 'rgba(0,0,0,.22)'; g.beginPath(); g.ellipse(wx - cx, wy - 2 - cy, 12, 4, 0, 0, 7); g.fill(); g.drawImage((flags(ctx).tires ? JEEP_T : JEEP)[0][0], wx - 12 - cx, wy - 16 - cy); } });
    }
    return out;
  },

  draw(g, ctx, cx, cy) {
    for (const s of st.trail) {
      const a = Math.max(0, 1 - s.t / 1.8) * 0.55; if (a <= 0) continue;
      g.fillStyle = `rgba(122,158,196,${a.toFixed(3)})`;
      const x = Math.round(s.x) - cx, y = Math.round(s.y) - cy;
      if (s.dir === 1 || s.dir === 2) { g.fillRect(x - 2, y - 4, 5, 1); g.fillRect(x - 2, y - 1, 5, 1); }
      else { g.fillRect(x - 7, y - 3, 1, 5); g.fillRect(x + 5, y - 3, 1, 5); }
    }
    for (const d of st.dust) {
      const a = Math.max(0, 1 - d.t / 0.6) * 0.7; if (a <= 0) continue;
      g.fillStyle = d.dark ? `rgba(70,66,74,${a.toFixed(3)})` : `rgba(224,212,182,${a.toFixed(3)})`;
      g.beginPath(); g.arc(Math.round(d.x) - cx, Math.round(d.y) - cy, d.r, 0, 7); g.fill();
    }
  },

  hudLines(ctx) {
    const t = L(ctx), out = [];
    if (st.mounted === 'jeep') { const n = ctx.bag.count('charcoal'); out.push(n > 0 ? t.fuel(n) : t.fuelOut); }
    if (st.mounted === 'balloon' && st.fly) out.push(t.fly(Math.ceil(st.fly.t)));
    return out;
  },

  near(ctx) {
    if (ctx.S.map.sea) return null;
    const t = L(ctx), p = ctx.S.player;
    if (st.mounted) {
      if (st.jump) return null;
      const label = st.mounted === 'boat' ? t.boatOff : st.mounted === 'raft' ? t.raftOff : st.mounted === 'ski' ? t.skiOff
        : st.mounted === 'cart' ? t.cartOff : st.mounted === 'balloon' ? t.balloonOff : t.carOff;
      const big = st.mounted === 'cart' || st.mounted === 'balloon';
      if (st.mounted === 'balloon' && st.fly && st.fly.phase !== 'fly') return null;
      return { label, x: p.x, y: p.y, limit: big ? 24 : 14, priority: big, data: { off: true } };
    }
    let best = null, bd = 1e9;
    const consider = (cand, limit) => { const d = Math.hypot(cand.x - p.x, cand.y - p.y); if (d < limit && d < bd) { bd = d; best = { ...cand, limit }; } };
    if (st.parked) {
      const k = st.parked.kind;
      consider({ label: k === 'boat' ? t.boatOn : k === 'ski' ? t.skiOn : t.carOn, x: st.parked.x * 16 + 8, y: st.parked.y * 16 + 12, data: { kind: k } }, 30);
    }
    if (st.raft) consider({ label: t.raftOn, x: st.raft.x * 16 + 8, y: st.raft.y * 16 + 12, data: { kind: 'raft' } }, 30);
    if (st.cart) consider({ label: t.cartOn, x: st.cart.x * 16 + 8, y: st.cart.y * 16 + 12, data: { kind: 'cart' } }, 28);
    if (st.balloon) {
      const miss = balloonBlock(ctx);
      consider({ label: miss || t.balloonOn, x: st.balloon.x * 16 + 16, y: st.balloon.y * 16 + 28, data: { kind: 'balloon' } }, 34);
    }
    return best;
  },

  interact(ctx, cand) {
    const d = (cand && cand.data) || {};
    if (d.off) {
      if (st.mounted === 'balloon') startLanding(ctx);
      else if (st.mounted === 'cart') cartOff(ctx);
      else dismount(ctx);
      return;
    }
    if (d.kind === 'cart') mountCart(ctx);
    else if (d.kind === 'balloon') launchBalloon(ctx);
    else mount(ctx, d.kind);
  }
};

// ---------------- test hooks ----------------
if (typeof window !== 'undefined') {
  window.__veh = {
    // __veh.setFlags({sail:true, raft:true, wax:true, tires:true}) — crafting normally sets these
    setFlags(o) {
      if (!st.ctx) return null;
      const sv = slot(st.ctx); Object.assign(sv, o || {}); st.ctx.persist();
      if (sv.raft) spawnRaft(st.ctx);
      return { raft: !!sv.raft, sail: !!sv.sail, wax: !!sv.wax, tires: !!sv.tires };
    },
    info() {
      const p = st.ctx ? st.ctx.S.player : null;
      return {
        mounted: st.mounted, speedMul: p ? p.speedMul : null, parked: st.parked, raft: st.raft, cart: st.cart, balloon: st.balloon,
        ride: st.ride, jump: !!st.jump, fly: st.fly ? { phase: st.fly.phase, t: +st.fly.t.toFixed(1), alt: +st.fly.alt.toFixed(1) } : null,
        fuelD: +st.fuelD.toFixed(1), flags: st.ctx ? flags(st.ctx) : null
      };
    }
  };
}
