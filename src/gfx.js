// gfx.js — procedural pixel art: tiles, objects, character sprites. No image files needed.
export const TS = 16;
export const HOOK = { charSheet: null, rocky: null, creatures: {} }; // art.js (?art=px) gắn hàm vào đây để thay sheet nhân vật / tượng Rocky / sinh vật
// Module gameplay đăng ký sprite sinh vật vẽ code: HOOK.creature('cow', build(16,14,cowArt)) → trả về chính mảng [frame][0=phải,1=trái].
// art.js khi vào vùng thay nội dung mảng tại chỗ bằng ảnh PixelLab (nếu gói có), không thì trả lại bản code.
HOOK.creature = (kind, fb) => { HOOK.creatures[kind] = { arr: fb, fb: fb.map(f => Array.isArray(f) ? f.slice() : f) }; return fb; };
// Canvas đơn vẽ code (bè, ván, buồm…): HOOK.image('raft', canvas) → art.js thay bitmap TẠI CHỖ (đổi kích thước + đánh dấu __hi) nếu gói có
HOOK.images = {}; HOOK.image = (kind, cv) => { HOOK.images[kind] = cv; return cv; };
HOOK.petFrames = null;   // art.js: (scarf) => [[c, flip] ×4] hoặc null

export const PAL = {
  out:'#1c1a24', grass:'#5fae4a', grass2:'#52a040', grassD:'#3f8a33',
  flowerA:'#f7dc5c', flowerB:'#f27a95', flowerC:'#ffffff',
  dirt:'#c9a86b', dirtD:'#ad8d55', sand:'#ecd9a0', sandD:'#d9c283',
  water:'#3f8fd6', waterL:'#7cc0f2', waterD:'#2e6fb0', foam:'#dff3ff',
  stone:'#9a9aa3', stoneD:'#74747e', stoneL:'#b9b9c2',
  wood:'#8a5a2b', woodD:'#5f3d1c', wall:'#efe4cf', wallD:'#cdbb98',
  roofR:'#c94b33', roofB:'#3d6db5', roofG:'#5a9c58', roofY:'#d9a23a',
  leaf:'#2f7d3a', leafL:'#4caa4f', trunk:'#6b4423',
  glass:'#8fd3ff', gold:'#ffd45e', gem:'#ff1f4b', dark:'#2a2438', shell:'#f4c6c0'
};

export function mkCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
export function rngFrom(seed) { // mulberry32
  let a = seed >>> 0;
  return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
export function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

const px = (g, x, y, c, w = 1, h = 1) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
export function circle(g, cx, cy, r, c) { g.fillStyle = c; for (let dy = -r; dy <= r; dy++) { const w = Math.floor(Math.sqrt(r * r - dy * dy)); g.fillRect(cx - w, cy + dy, 2 * w + 1, 1); } }
export function line(g, x0, y0, x1, y1, c, t = 1) {
  const dx = x1 - x0, dy = y1 - y0, n = Math.max(Math.abs(dx), Math.abs(dy), 1); g.fillStyle = c;
  for (let i = 0; i <= n; i++) g.fillRect(Math.round(x0 + dx * i / n) - (t >> 1), Math.round(y0 + dy * i / n) - (t >> 1), t, t);
}

// ---------- ground tiles ----------
export const T = {
  NONE: 0, GRASS: 1, GRASS2: 2, FLOWER: 3, DIRT: 4, SAND: 5, WATER: 6, STONE: 7, SAND2: 8, GRAVEL: 9, DARK: 10,
  LAVA: 11, ASH: 12, SNOW: 13, ROCK: 14, CRACKG: 15, CRACKD: 16, MOSS: 17, COBBLE: 18, HEX: 19, CHASM: 20, BRIDGE: 21, ICE: 22, MARBLE: 23, HEXLIT: 24,
  REEF: 25, DEEP: 26, DOCK: 27, SEABED: 28, ABYSS: 29,
  TILLED: 30, TILLED_WET: 31   /* F02: đất cày khô / đã tưới (không solid; ảnh px qua manifest 'tiles' TILLED / TILLED_WET) */
};
export const tiles = []; // id -> [frame canvases]
function tile(id, frames, fn) {
  const arr = [];
  for (let f = 0; f < frames; f++) { const c = mkCanvas(TS, TS); fn(c.getContext('2d'), rngFrom(id * 97 + f * 13 + 1), f); arr.push(c); }
  tiles[id] = arr;
}
const speck = (g, r, n, cols) => { for (let i = 0; i < n; i++) px(g, (r() * 16) | 0, (r() * 16) | 0, cols[(r() * cols.length) | 0]); };

export function buildTiles() {
  tile(T.GRASS, 1, (g, r) => { px(g, 0, 0, PAL.grass, 16, 16); speck(g, r, 10, [PAL.grass2, PAL.grassD]); });
  tile(T.GRASS2, 1, (g, r) => { px(g, 0, 0, PAL.grass2, 16, 16); speck(g, r, 8, [PAL.grassD]); for (let i = 0; i < 4; i++) px(g, (r() * 15) | 0, (r() * 14) | 0, PAL.grassD, 1, 2); });
  tile(T.FLOWER, 1, (g, r) => {
    px(g, 0, 0, PAL.grass, 16, 16); speck(g, r, 6, [PAL.grass2]);
    for (let i = 0; i < 3; i++) { const x = 1 + ((r() * 13) | 0), y = 1 + ((r() * 13) | 0), c = [PAL.flowerA, PAL.flowerB, PAL.flowerC][(r() * 3) | 0]; px(g, x, y, c); px(g, x - 1, y + 1, c); px(g, x + 1, y + 1, c); px(g, x, y + 2, c); px(g, x, y + 1, PAL.gold); }
  });
  tile(T.DIRT, 1, (g, r) => { px(g, 0, 0, PAL.dirt, 16, 16); speck(g, r, 9, [PAL.dirtD]); px(g, (r() * 14) | 0, (r() * 14) | 0, PAL.stoneL, 2, 1); });
  tile(T.SAND, 1, (g, r) => { px(g, 0, 0, PAL.sand, 16, 16); speck(g, r, 7, [PAL.sandD]); });
  tile(T.SAND2, 1, (g, r) => { px(g, 0, 0, PAL.sand, 16, 16); speck(g, r, 5, [PAL.sandD]); px(g, (r() * 12) | 0, (r() * 12) | 0, PAL.sandD, 3, 1); px(g, (r() * 12) | 0, (r() * 12) | 0, PAL.sandD, 2, 1); });
  tile(T.WATER, 2, (g, r, f) => {
    px(g, 0, 0, PAL.water, 16, 16);
    for (let i = 0; i < 3; i++) { const y = (2 + i * 5 + f * 2) % 16, x = ((i * 7 + f * 4) % 12); px(g, x, y, PAL.waterL, 4, 1); px(g, (x + 8) % 14, (y + 3) % 16, PAL.waterD, 3, 1); }
  });
  tile(T.STONE, 1, (g, r) => { px(g, 0, 0, PAL.stone, 16, 16); px(g, 0, 0, PAL.stoneD, 16, 1); px(g, 0, 8, PAL.stoneD, 16, 1); px(g, 0, 0, PAL.stoneD, 1, 8); px(g, 8, 8, PAL.stoneD, 1, 8); speck(g, r, 4, [PAL.stoneL]); });
  tile(T.GRAVEL, 1, (g, r) => { px(g, 0, 0, PAL.dirtD, 16, 16); speck(g, r, 14, [PAL.stone, PAL.stoneD, PAL.dirt]); });
  tile(T.DARK, 1, (g, r) => { px(g, 0, 0, PAL.dark, 16, 16); speck(g, r, 5, ['#352d48']); });
  const crack = (g, r) => { let x = 3 + ((r() * 10) | 0), y = 0; while (y < 16) { const nx = Math.max(0, Math.min(15, x + ((r() * 3) | 0) - 1)); line(g, x, y, nx, y + 2, '#2b2b2b', 1); x = nx; y += 2; } };
  tile(T.LAVA, 2, (g, r, f) => { px(g, 0, 0, '#e8541e', 16, 16); for (let i = 0; i < 4; i++) { const x = (i * 5 + f * 3) % 14, y = (i * 7 + f * 5) % 14; px(g, x, y, '#ffb03a', 3, 2); px(g, (x + 7) % 14, (y + 6) % 14, '#a8300e', 3, 1); } });
  tile(T.ASH, 1, (g, r) => { px(g, 0, 0, '#5e5a60', 16, 16); speck(g, r, 10, ['#4a464c', '#736f75']); });
  tile(T.SNOW, 1, (g, r) => { px(g, 0, 0, '#e9f1f7', 16, 16); speck(g, r, 6, ['#cfdde8', '#ffffff']); });
  tile(T.ROCK, 1, (g, r) => { px(g, 0, 0, '#6f6a72', 16, 16); speck(g, r, 9, ['#5a555e', '#847f88']); });
  tile(T.CRACKG, 1, (g, r) => { px(g, 0, 0, PAL.grass, 16, 16); speck(g, r, 6, [PAL.grass2]); crack(g, r); });
  tile(T.CRACKD, 1, (g, r) => { px(g, 0, 0, PAL.dirt, 16, 16); speck(g, r, 6, [PAL.dirtD]); crack(g, r); });
  tile(T.MOSS, 1, (g, r) => { px(g, 0, 0, '#3f6f3a', 16, 16); speck(g, r, 8, ['#356030', '#4d804a']); });
  /* F02: đất cày — nâu sẫm có luống ngang; ướt = nâu đen bóng nhẹ */
  tile(T.TILLED, 1, (g, r) => { px(g, 0, 0, '#8a6238', 16, 16); for (let y = 1; y < 16; y += 4) { px(g, 0, y, '#6b4826', 16, 1); px(g, 0, y + 2, '#a3784a', 16, 1); } speck(g, r, 5, ['#6b4826', '#a3784a']); });
  tile(T.TILLED_WET, 1, (g, r) => { px(g, 0, 0, '#5a3d22', 16, 16); for (let y = 1; y < 16; y += 4) { px(g, 0, y, '#3f2a15', 16, 1); px(g, 0, y + 2, '#6e4c2c', 16, 1); } speck(g, r, 4, ['#7a5a3a', '#3f2a15']); });
  tile(T.COBBLE, 1, (g, r) => { px(g, 0, 0, '#5f5a64', 16, 16); for (const [x, y, w, h] of [[1, 1, 6, 6], [9, 1, 6, 6], [1, 9, 6, 6], [9, 9, 6, 6]]) px(g, x, y, r() < .2 ? '#7f8a78' : '#8c8790', w, h); speck(g, r, 3, ['#a09ba5']); });
  tile(T.HEX, 2, (g, r, f) => { px(g, 0, 0, '#1a1430', 16, 16); speck(g, r, 4, ['#241c44']); const x = 2 + ((r() * 8) | 0), y = 2 + ((r() * 8) | 0), c = f ? '#5a3fa8' : '#3d2a80'; px(g, x + 1, y, c, 4, 1); px(g, x, y + 1, c, 1, 3); px(g, x + 5, y + 1, c, 1, 3); px(g, x + 1, y + 4, c, 4, 1); });
  tile(T.CHASM, 1, (g, r) => { px(g, 0, 0, '#120e18', 16, 16); speck(g, r, 3, ['#221a2c']); });
  tile(T.BRIDGE, 1, (g, r) => { px(g, 0, 0, PAL.woodD, 16, 16); for (let y = 0; y < 16; y += 4) px(g, 0, y, PAL.wood, 16, 3); px(g, 0, 0, '#c9a86b', 1, 16); px(g, 15, 0, '#c9a86b', 1, 16); });
  tile(T.ICE, 1, (g, r) => { px(g, 0, 0, '#bfe3ff', 16, 16); for (let i = 0; i < 3; i++) px(g, (r() * 12) | 0, (r() * 16) | 0, '#ffffff', 4, 1); });
  tile(T.MARBLE, 1, (g, r) => { px(g, 0, 0, '#d9d4e2', 16, 16); px(g, 0, 0, '#c3bccf', 16, 1); px(g, 0, 0, '#c3bccf', 1, 16); px(g, 8, 8, '#c3bccf', 8, 1); px(g, 8, 8, '#c3bccf', 1, 8); speck(g, r, 3, ['#ece8f2']); });
  tile(T.REEF, 2, (g, r, f) => { px(g, 0, 0, '#6ccfe0', 16, 16); speck(g, r, 6, ['#8fe0ec', '#4fb8cc']); for (let i = 0; i < 3; i++) { const x = (r() * 13) | 0, y = (r() * 13) | 0; px(g, x, y, i % 2 ? '#f27a95' : '#f7dc5c', 2, 2); px(g, x + 1, y - 1 + f, '#fff', 1, 1); } });
  tile(T.DEEP, 2, (g, r, f) => { px(g, 0, 0, '#2a63b0', 16, 16); for (let i = 0; i < 2; i++) { const y = (4 + i * 7 + f * 2) % 16, x = (i * 5 + f * 3) % 12; px(g, x, y, '#3f7fcf', 4, 1); } speck(g, r, 2, ['#1f4f8f']); });
  // the Kraken Trench: dark sandy seabed you walk on (floor) and the black abyss you cannot (solid)
  tile(T.SEABED, 2, (g, r, f) => { px(g, 0, 0, '#1d3a66', 16, 16); speck(g, r, 7, ['#24477a', '#16305a']); if (f) px(g, (r() * 14) | 0, (r() * 14) | 0, '#4fa0c8', 1, 1); });
  tile(T.ABYSS, 1, (g, r) => { px(g, 0, 0, '#070a18', 16, 16); speck(g, r, 3, ['#0c1226']); });
  tile(T.DOCK, 2, (g, r, f) => { px(g, 0, 0, PAL.woodD, 16, 16); for (let y = 0; y < 16; y += 4) { px(g, 0, y, PAL.wood, 16, 3); px(g, (3 + f * 7 + y) % 14, y, '#9a6a3c', 2, 3); } px(g, 0, 0, '#5a3a1e', 16, 1); });
  tile(T.HEXLIT, 2, (g, r, f) => { px(g, 0, 0, '#2a2050', 16, 16); speck(g, r, 4, ['#352a60']); const x = 2 + ((r() * 8) | 0), y = 2 + ((r() * 8) | 0), c = f ? '#a78bff' : '#7a5cd0'; px(g, x + 1, y, c, 4, 1); px(g, x, y + 1, c, 1, 3); px(g, x + 5, y + 1, c, 1, 3); px(g, x + 1, y + 4, c, 4, 1); });
}

// ---------- objects (decor / buildings) ----------
// fw,fh = solid footprint in tiles, anchored at the image bottom. Draw pos: (x*16, (y+fh)*16 - h)
export const O = {};
export function obj(name, w, h, fw, fh, fn, opts = {}) {
  const c = mkCanvas(w, h); fn(c.getContext('2d'), rngFrom(hashStr(name)));
  O[name] = { name, w, h, fw, fh, img: c, solid: opts.solid !== false, ...opts };
  if (HOOK.objDefined) HOOK.objDefined(name);   // art.js: vật thể module định nghĩa muộn (sau khi vào vùng) vẫn nhận ảnh gói
}
function house(name, roof) {
  obj(name, 48, 48, 3, 3, g => {
    px(g, 2, 20, PAL.out, 44, 28); px(g, 3, 21, PAL.wall, 42, 26); px(g, 3, 44, PAL.wallD, 42, 3);
    for (let y = 0; y <= 20; y++) { const half = 3 + y * 1.05; px(g, Math.round(24 - half) - 1, 2 + y, PAL.out, Math.round(half * 2) + 2, 1); }
    for (let y = 1; y <= 19; y++) { const half = 3 + y * 1.05 - 1; px(g, Math.round(24 - half), 2 + y, roof, Math.round(half * 2), 1); }
    px(g, 0, 22, PAL.out, 48, 2);
    px(g, 20, 32, PAL.out, 8, 14); px(g, 21, 33, PAL.wood, 6, 13); px(g, 25, 39, PAL.gold, 1, 1);
    for (const wx of [8, 32]) { px(g, wx, 28, PAL.out, 8, 8); px(g, wx + 1, 29, PAL.glass, 6, 6); px(g, wx + 4, 29, PAL.out, 1, 6); px(g, wx + 1, 32, PAL.out, 6, 1); }
  });
}
export function buildObjects() {
  obj('tree', 16, 32, 1, 1, g => {
    px(g, 6, 18, PAL.trunk, 4, 14); px(g, 6, 18, PAL.woodD, 1, 14);
    circle(g, 8, 11, 7, PAL.out); circle(g, 8, 11, 6, PAL.leaf); circle(g, 6, 9, 3, PAL.leafL); px(g, 10, 13, PAL.leafL, 2, 1);
  });
  obj('palm', 16, 32, 1, 1, g => {
    for (let y = 13; y < 32; y++) { const x = 6 + Math.round((31 - y) / 9); px(g, x, y, PAL.trunk, 3, 1); px(g, x, y, PAL.woodD, 1, 1); }
    for (const [x1, y1] of [[1, 6], [15, 6], [2, 15], [14, 15], [8, 3], [5, 12], [12, 12]]) line(g, 8, 11, x1, y1, PAL.leafL, 2);
    circle(g, 8, 11, 2, PAL.leaf);
  });
  house('house_r', PAL.roofR); house('house_b', PAL.roofB); house('house_g', PAL.roofG); house('house_y', PAL.roofY);
  obj('fence_h', 16, 16, 1, 1, g => { px(g, 0, 6, PAL.woodD, 16, 2); px(g, 0, 10, PAL.woodD, 16, 2); px(g, 1, 3, PAL.wood, 3, 11); px(g, 12, 3, PAL.wood, 3, 11); px(g, 1, 3, PAL.out, 3, 1); px(g, 12, 3, PAL.out, 3, 1); });
  obj('fence_v', 16, 16, 1, 1, g => { px(g, 6, 0, PAL.woodD, 2, 16); px(g, 8, 0, PAL.wood, 2, 16); px(g, 5, 3, PAL.wood, 6, 2); px(g, 5, 11, PAL.wood, 6, 2); });
  obj('rock', 16, 16, 1, 1, g => { circle(g, 8, 10, 6, PAL.out); circle(g, 8, 10, 5, PAL.stone); circle(g, 6, 8, 2, PAL.stoneL); px(g, 4, 13, PAL.stoneD, 8, 1); });
  obj('rock_s', 16, 16, 1, 1, g => { circle(g, 8, 11, 4, PAL.out); circle(g, 8, 11, 3, PAL.stone); px(g, 7, 9, PAL.stoneL, 2, 1); }, { solid: false });
  obj('bush', 16, 16, 1, 1, g => { circle(g, 8, 10, 7, PAL.out); circle(g, 8, 10, 6, PAL.leaf); circle(g, 6, 8, 3, PAL.leafL); px(g, 10, 11, PAL.flowerB); });
  obj('shell', 16, 16, 1, 1, g => { px(g, 5, 8, PAL.out, 7, 6); px(g, 6, 9, PAL.shell, 5, 4); px(g, 8, 9, PAL.out, 1, 4); px(g, 6, 11, PAL.out, 5, 1); }, { solid: false });
  /* F01: giường ngủ cạnh đình mỗi vùng (E → hết ngày) — chăn đỏ, gối trắng, khung gỗ */
  obj('bed', 16, 16, 1, 1, g => { px(g, 1, 2, PAL.out, 14, 13); px(g, 2, 3, PAL.wood, 12, 11); px(g, 3, 4, '#c94b33', 10, 8); px(g, 4, 5, '#e8e0d0', 4, 3); px(g, 3, 12, PAL.woodD, 10, 1); px(g, 2, 14, PAL.out, 2, 1); px(g, 12, 14, PAL.out, 2, 1); });
  obj('sign', 16, 16, 1, 1, g => { px(g, 7, 8, PAL.woodD, 2, 8); px(g, 2, 1, PAL.out, 12, 9); px(g, 3, 2, PAL.wood, 10, 7); px(g, 5, 4, PAL.woodD, 6, 1); px(g, 5, 6, PAL.woodD, 4, 1); });
  obj('monument', 32, 48, 2, 2, g => {
    px(g, 2, 36, PAL.out, 28, 12); px(g, 3, 37, PAL.stone, 26, 10); px(g, 3, 44, PAL.stoneD, 26, 3);
    px(g, 11, 8, PAL.out, 10, 30); px(g, 12, 9, PAL.stoneL, 8, 28); px(g, 12, 9, PAL.stone, 3, 28);
    circle(g, 16, 20, 3, PAL.out); circle(g, 16, 20, 2, PAL.gem); px(g, 15, 19, '#fff');
    px(g, 13, 3, PAL.out, 6, 6); px(g, 14, 4, PAL.gold, 4, 4);
    for (let i = 0; i < 4; i++) px(g, 13, 26 + i * 2, PAL.stoneD, 6, 1);
  });
  const gateObj = (name, col1, col2, pillar = PAL.stone, pillarL = PAL.stoneL) => obj(name, 48, 48, 3, 1, g => {
    px(g, 0, 10, PAL.out, 10, 38); px(g, 1, 11, pillar, 8, 36); px(g, 1, 11, pillarL, 2, 36);
    px(g, 38, 10, PAL.out, 10, 38); px(g, 39, 11, pillar, 8, 36); px(g, 39, 11, pillarL, 2, 36);
    px(g, 0, 6, PAL.out, 48, 8); px(g, 1, 7, PAL.stoneD, 46, 6); px(g, 1, 7, pillar, 46, 2);
    px(g, 20, 0, PAL.out, 8, 8); px(g, 21, 1, col1, 6, 6); px(g, 23, 3, col2, 2, 2);
  }, { solid: false });
  gateObj('gate', PAL.gold, PAL.gem);
  gateObj('core_gate', '#8a5cff', '#ffffff', '#241a44', '#5a3fa8');
  obj('lock', 16, 16, 1, 1, g => { px(g, 5, 2, PAL.out, 6, 6); px(g, 6, 3, PAL.stoneL, 4, 4); px(g, 7, 4, PAL.out, 2, 3); px(g, 3, 7, PAL.out, 10, 8); px(g, 4, 8, PAL.gold, 8, 6); px(g, 7, 10, PAL.out, 2, 3); }, { solid: false });
  obj('boat', 48, 32, 3, 2, g => {
    for (let y = 18; y < 31; y++) { const k = y - 18; px(g, 2 + k, y, PAL.out, 44 - 2 * k, 1); }
    for (let y = 19; y < 30; y++) { const k = y - 18; px(g, 3 + k, y, k % 3 === 0 ? PAL.woodD : PAL.wood, 42 - 2 * k, 1); }
    px(g, 23, 2, PAL.woodD, 2, 18); px(g, 25, 4, PAL.out, 15, 11); px(g, 26, 5, '#fff', 13, 9); px(g, 26, 9, PAL.gem, 13, 2);
  });
  obj('lantern', 16, 32, 1, 1, g => { px(g, 7, 12, PAL.woodD, 2, 20); px(g, 4, 3, PAL.out, 8, 11); px(g, 5, 4, PAL.gold, 6, 9); px(g, 7, 6, '#fff', 2, 3); px(g, 7, 1, PAL.out, 2, 2); });
  obj('well', 32, 32, 2, 2, g => {
    px(g, 4, 12, PAL.woodD, 2, 10); px(g, 26, 12, PAL.woodD, 2, 10);
    px(g, 0, 4, PAL.out, 32, 8); px(g, 1, 5, PAL.roofR, 30, 6);
    px(g, 2, 18, PAL.out, 28, 14); px(g, 3, 19, PAL.stone, 26, 12); px(g, 8, 21, PAL.dark, 16, 6); px(g, 8, 27, PAL.stoneD, 16, 3);
  });
  obj('crate', 16, 16, 1, 1, g => { px(g, 2, 2, PAL.out, 12, 12); px(g, 3, 3, PAL.wood, 10, 10); line(g, 3, 3, 12, 12, PAL.woodD); line(g, 12, 3, 3, 12, PAL.woodD); });
  // --- zone-specific decor (M2..M9) ---
  const tri = (g, cy, h, w, c) => { for (let r = 0; r < h; r++) { const half = Math.round(w * r / h / 2); px(g, 8 - half, cy + r, c, half * 2 + 1, 1); } };
  const pine = (snow) => g => {
    px(g, 6, 24, PAL.trunk, 4, 8);
    for (let t = 0; t < 3; t++) { tri(g, 1 + t * 7, 10, 14, PAL.out); tri(g, 2 + t * 7, 8, 11, '#2a5f3a'); tri(g, 2 + t * 7, 5, 6, '#3f7f4a'); if (snow) tri(g, 2 + t * 7, 3, 5, '#e9f1f7'); }
  };
  obj('pine', 16, 32, 1, 1, pine(false)); obj('pine_s', 16, 32, 1, 1, pine(true));
  obj('deadtree', 16, 32, 1, 1, g => { px(g, 7, 12, PAL.out, 3, 20); px(g, 8, 13, '#5a4a3a', 1, 19); for (const [x1, y1] of [[2, 5], [14, 4], [4, 16], [13, 11]]) { line(g, 8, 14, x1, y1, PAL.out, 3); line(g, 8, 14, x1, y1, '#5a4a3a', 1); } });
  obj('torch', 16, 32, 1, 1, g => { px(g, 7, 14, PAL.woodD, 2, 18); px(g, 5, 10, PAL.out, 6, 5); px(g, 6, 11, PAL.wood, 4, 3); circle(g, 8, 7, 3, '#ff8c1a'); circle(g, 8, 6, 2, PAL.gold); px(g, 8, 4, '#fff'); });
  obj('ore', 16, 16, 1, 1, g => { circle(g, 8, 10, 6, PAL.out); circle(g, 8, 10, 5, '#5a555e'); px(g, 6, 8, PAL.gold, 2, 2); px(g, 10, 11, PAL.gold, 2, 1); px(g, 8, 12, '#8fd3ff', 1, 1); });
  obj('cart', 32, 32, 2, 2, g => { circle(g, 8, 26, 4, PAL.out); circle(g, 8, 26, 3, '#4a4a4a'); circle(g, 24, 26, 4, PAL.out); circle(g, 24, 26, 3, '#4a4a4a'); px(g, 2, 10, PAL.out, 28, 14); px(g, 3, 11, PAL.wood, 26, 12); px(g, 3, 16, PAL.woodD, 26, 1); circle(g, 16, 9, 5, '#6f6a72'); px(g, 13, 7, PAL.gold, 2, 2); px(g, 18, 9, PAL.gold, 2, 1); });
  obj('beam', 16, 32, 1, 1, g => { px(g, 5, 0, PAL.out, 6, 32); px(g, 6, 1, PAL.woodD, 4, 30); px(g, 0, 2, PAL.out, 16, 5); px(g, 1, 3, PAL.wood, 14, 3); });
  obj('pillar', 16, 32, 1, 1, g => { px(g, 4, 2, PAL.out, 8, 30); px(g, 5, 3, PAL.stoneL, 6, 28); px(g, 5, 3, PAL.stone, 2, 28); px(g, 2, 0, PAL.out, 12, 4); px(g, 3, 1, PAL.stoneL, 10, 2); px(g, 2, 28, PAL.out, 12, 4); px(g, 3, 29, PAL.stone, 10, 2); });
  obj('pillar_broken', 16, 16, 1, 1, g => { for (let x = 4; x < 12; x++) { const h = 6 + ((x * 7) % 5); px(g, x, 15 - h, PAL.out, 1, h + 1); px(g, x, 16 - h, x < 6 ? PAL.stone : PAL.stoneL, 1, h - 1); } px(g, 2, 13, PAL.out, 12, 3); px(g, 3, 14, PAL.stone, 10, 1); });
  obj('statue', 16, 32, 1, 1, g => { px(g, 2, 24, PAL.out, 12, 8); px(g, 3, 25, PAL.stoneD, 10, 6); circle(g, 8, 6, 4, PAL.out); circle(g, 8, 6, 3, PAL.stoneL); px(g, 4, 10, PAL.out, 8, 14); px(g, 5, 11, PAL.stone, 6, 12); px(g, 2, 12, PAL.stone, 2, 6); px(g, 12, 12, PAL.stone, 2, 6); });
  obj('tower', 48, 80, 3, 2, g => {
    for (let y = 4; y < 80; y++) { const s = Math.round((79 - y) / 10); px(g, 7 + s, y, PAL.out, 34, 1); px(g, 8 + s, y, y % 12 < 6 ? PAL.stone : PAL.stoneD, 32, 1); px(g, 8 + s, y, PAL.stoneL, 3, 1); if (y % 16 === 8) { px(g, 20 + s, y, PAL.out, 8, 6); px(g, 21 + s, y + 1, PAL.dark, 6, 4); } }
    for (let i = 0; i < 4; i++) px(g, 9 + i * 9 + 7, 0, PAL.out, 6, 5), px(g, 10 + i * 9 + 7, 1, PAL.stoneL, 4, 3);
  });
  obj('boulder', 32, 32, 2, 2, g => { circle(g, 16, 18, 13, PAL.out); circle(g, 16, 18, 12, PAL.stone); circle(g, 12, 14, 5, PAL.stoneL); px(g, 8, 26, PAL.stoneD, 16, 2); });
  const crystal = (name, c1, c2) => obj(name, 16, 32, 1, 1, g => { for (const [x1, y1] of [[3, 10], [8, 3], [13, 12]]) { line(g, 8, 30, x1, y1, PAL.out, 5); line(g, 8, 30, x1, y1, c1, 3); line(g, 8, 30, x1, y1, c2, 1); } px(g, 8, 6, '#fff'); px(g, 3, 13, '#fff'); });
  crystal('crystal_p', '#8a5cff', '#d9c8ff'); crystal('crystal_b', '#3fbfe6', '#c8f4ff'); crystal('crystal_r', '#ff1f4b', '#ffc0cc');
  obj('hexpillar', 16, 48, 1, 1, g => { px(g, 3, 4, PAL.out, 10, 44); px(g, 4, 5, '#241a44', 8, 42); for (let i = 0; i < 6; i++) px(g, 6, 9 + i * 6, i % 2 ? '#8a5cff' : '#5a3fa8', 4, 2); px(g, 2, 0, PAL.out, 12, 5); px(g, 3, 1, '#3d2a80', 10, 3); });
  obj('campfire', 16, 16, 1, 1, g => { px(g, 2, 11, PAL.out, 12, 4); px(g, 3, 12, PAL.woodD, 10, 2); circle(g, 8, 8, 3, '#ff8c1a'); circle(g, 8, 7, 2, PAL.gold); px(g, 8, 4, '#fff'); }, { solid: false });
  obj('campfire_off', 16, 16, 1, 1, g => { px(g, 2, 11, PAL.out, 12, 4); px(g, 3, 12, PAL.woodD, 10, 2); px(g, 5, 8, PAL.out, 6, 3); px(g, 6, 9, '#4a4a4a', 4, 1); }, { solid: false });
  obj('lever_off', 16, 16, 1, 1, g => { px(g, 2, 10, PAL.out, 12, 6); px(g, 3, 11, PAL.stone, 10, 4); line(g, 8, 12, 3, 4, PAL.out, 3); line(g, 8, 12, 3, 4, PAL.wood, 1); circle(g, 3, 4, 2, PAL.gem); });
  obj('lever_on', 16, 16, 1, 1, g => { px(g, 2, 10, PAL.out, 12, 6); px(g, 3, 11, PAL.stone, 10, 4); line(g, 8, 12, 13, 4, PAL.out, 3); line(g, 8, 12, 13, 4, PAL.wood, 1); circle(g, 13, 4, 2, '#4caa4f'); });
  obj('library', 32, 32, 2, 1, g => { px(g, 1, 2, PAL.out, 30, 30); px(g, 2, 3, PAL.woodD, 28, 28); for (let s = 0; s < 3; s++) { px(g, 3, 5 + s * 9, PAL.wood, 26, 1); for (let b = 0; b < 8; b++) px(g, 4 + b * 3, 6 + s * 9, ['#e04b4b', '#3d6db5', '#5a9c58', '#ffd45e', '#8a5cff', '#ff9426'][(b + s) % 6], 2, 6); } });
  obj('obsidian', 16, 16, 1, 1, g => { line(g, 8, 14, 5, 4, PAL.out, 5); line(g, 8, 14, 11, 6, PAL.out, 5); line(g, 8, 14, 5, 4, '#2a2438', 3); line(g, 8, 14, 11, 6, '#2a2438', 3); px(g, 6, 6, '#8a5cff'); px(g, 10, 8, '#fff'); }, { solid: false });
  obj('elder_mark', 16, 8, 1, 1, g => { px(g, 5, 1, PAL.out, 6, 6); px(g, 6, 2, '#8a5cff', 4, 4); px(g, 7, 3, '#fff', 2, 2); }, { solid: false });
  obj('stall', 32, 32, 2, 1, g => { px(g, 2, 10, PAL.woodD, 2, 20); px(g, 28, 10, PAL.woodD, 2, 20); px(g, 2, 20, PAL.out, 28, 12); px(g, 3, 21, PAL.wood, 26, 10); for (let x = 0; x < 32; x += 4) px(g, x, 4, (x / 4) % 2 ? '#e04b4b' : '#fff', 4, 6); px(g, 0, 3, PAL.out, 32, 1); px(g, 0, 10, PAL.out, 32, 1); px(g, 6, 16, PAL.gem, 4, 4); px(g, 13, 16, PAL.gold, 4, 4); px(g, 20, 16, '#3fbfe6', 4, 4); });
  // district architecture, by tier: post → fence → low wall → wall+pillars → battlements+turrets → hex walls
  obj('post', 16, 16, 1, 1, g => { px(g, 6, 3, PAL.out, 4, 13); px(g, 7, 4, PAL.wood, 2, 11); px(g, 5, 2, PAL.out, 6, 2); px(g, 6, 2, PAL.woodD, 4, 1); });
  obj('wall_s', 16, 16, 1, 1, g => { px(g, 0, 5, PAL.out, 16, 11); px(g, 1, 6, PAL.stone, 14, 9); px(g, 0, 4, PAL.stoneL, 16, 2); px(g, 1, 10, PAL.stoneD, 14, 1); px(g, 5, 6, PAL.stoneD, 1, 4); px(g, 10, 11, PAL.stoneD, 1, 4); });
  obj('wall_h', 16, 24, 1, 1, g => { for (const bx of [0, 6, 12]) { px(g, bx, 0, PAL.out, 4, 5); px(g, bx + 1, 1, PAL.stoneL, 2, 3); } px(g, 0, 4, PAL.out, 16, 20); px(g, 1, 5, PAL.stone, 14, 18); px(g, 1, 5, PAL.stoneL, 14, 1); px(g, 1, 12, PAL.stoneD, 14, 1); px(g, 1, 19, PAL.stoneD, 14, 1); px(g, 6, 6, PAL.stoneD, 1, 6); px(g, 11, 13, PAL.stoneD, 1, 6); px(g, 3, 13, PAL.stoneD, 1, 6); });
  obj('turret', 16, 32, 1, 1, g => { px(g, 7, 0, PAL.woodD, 1, 6); px(g, 8, 0, PAL.gem, 5, 3); for (const bx of [1, 6, 11]) { px(g, bx, 4, PAL.out, 4, 5); px(g, bx + 1, 5, PAL.stoneL, 2, 3); } px(g, 2, 8, PAL.out, 12, 24); px(g, 3, 9, PAL.stone, 10, 22); px(g, 3, 9, PAL.stoneL, 2, 22); px(g, 7, 17, PAL.dark, 2, 4); px(g, 3, 24, PAL.stoneD, 10, 1); });
  obj('hexwall', 16, 16, 1, 1, g => { px(g, 0, 4, PAL.out, 16, 12); px(g, 1, 5, '#241a44', 14, 10); px(g, 0, 3, '#5a3fa8', 16, 2); px(g, 4, 8, '#8a5cff', 3, 2); px(g, 9, 8, '#5a3fa8', 3, 2); px(g, 6, 12, '#8a5cff', 4, 1); });
  obj('pavilion', 48, 48, 3, 2, g => {
    for (let y = 0; y < 14; y++) { const half = 6 + y * 1.4; px(g, Math.round(24 - half) - 1, 4 + y, PAL.out, Math.round(half * 2) + 2, 1); px(g, Math.round(24 - half), 4 + y, y % 4 < 2 ? PAL.roofR : '#a83a27', Math.round(half * 2), 1); }
    px(g, 2, 17, PAL.out, 44, 3); px(g, 3, 18, PAL.gold, 42, 1); px(g, 22, 0, PAL.out, 4, 5); px(g, 23, 1, PAL.gold, 2, 3);
    for (const x of [4, 22, 40]) { px(g, x, 20, PAL.out, 4, 26); px(g, x + 1, 21, PAL.wood, 2, 24); }
    px(g, 2, 44, PAL.out, 44, 4); px(g, 3, 45, PAL.stoneL, 42, 2);
  });
  obj('fountain', 32, 32, 2, 2, g => { circle(g, 16, 22, 13, PAL.out); circle(g, 16, 22, 12, PAL.stone); circle(g, 16, 22, 9, PAL.out); circle(g, 16, 22, 8, PAL.waterL); circle(g, 16, 21, 3, PAL.water); px(g, 14, 6, PAL.out, 4, 15); px(g, 15, 7, PAL.stoneL, 2, 13); px(g, 12, 4, PAL.out, 8, 3); px(g, 13, 5, PAL.stone, 6, 1); px(g, 11, 10, '#fff'); px(g, 20, 12, '#fff'); px(g, 9, 16, '#fff'); px(g, 22, 17, '#fff'); });
  obj('altar', 32, 32, 2, 2, g => { px(g, 2, 18, PAL.out, 28, 14); px(g, 3, 19, '#241a44', 26, 12); px(g, 3, 19, '#5a3fa8', 26, 1); for (let i = 0; i < 4; i++) px(g, 6 + i * 6, 24, i % 2 ? '#8a5cff' : '#5a3fa8', 3, 2); px(g, 12, 10, PAL.out, 8, 9); px(g, 13, 11, '#3d2a80', 6, 7); circle(g, 16, 6, 4, PAL.out); circle(g, 16, 6, 3, '#b48cff'); px(g, 15, 5, '#fff', 2, 1); px(g, 8, 2, '#d9c8ff'); px(g, 24, 4, '#d9c8ff'); });
  // ruins: what a district piece becomes when a raider wrecks it (one variant per footprint size)
  for (const [fw, fh] of [[1, 1], [2, 1], [2, 2], [3, 2], [3, 3]]) obj(`rubble_${fw}x${fh}`, fw * 16, fh * 16, fw, fh, (g, r) => {
    for (let i = 0; i < fw * fh * 5; i++) { const x = 1 + ((r() * (fw * 16 - 6)) | 0), y = 2 + ((r() * (fh * 16 - 6)) | 0), s = 2 + ((r() * 3) | 0); px(g, x, y, PAL.out, s + 2, s + 2); px(g, x + 1, y + 1, r() < .5 ? PAL.stone : PAL.woodD, s, s); }
    for (let i = 0; i < fw * 3; i++) px(g, (r() * fw * 16) | 0, fh * 16 - 1 - ((r() * 3) | 0), PAL.stoneD, 2, 1);
  }, { solid: false });
  obj('scaffold', 16, 32, 1, 1, g => { px(g, 2, 0, PAL.woodD, 2, 32); px(g, 12, 0, PAL.woodD, 2, 32); for (let y = 4; y < 32; y += 8) px(g, 0, y, PAL.wood, 16, 2); line(g, 2, 8, 14, 16, PAL.wood, 1); line(g, 2, 24, 14, 32, PAL.wood, 1); }, { solid: false });
  // the sea: lighthouse, shipwreck, buoys, hermit hut
  obj('lighthouse', 32, 64, 2, 2, g => {
    for (let y = 14; y < 64; y++) { const half = 6 + (y - 14) * 0.16; px(g, Math.round(16 - half) - 1, y, PAL.out, Math.round(half * 2) + 2, 1); px(g, Math.round(16 - half), y, (y >> 3) % 2 ? '#e04b4b' : '#f4f0e8', Math.round(half * 2), 1); }
    px(g, 8, 6, PAL.out, 16, 9); px(g, 9, 7, '#8fd3ff', 14, 7); px(g, 13, 9, PAL.gold, 6, 3); px(g, 6, 3, PAL.out, 20, 4); px(g, 7, 4, '#3d3d3d', 18, 2); px(g, 15, 0, PAL.out, 2, 4);
    px(g, 12, 50, PAL.out, 8, 14); px(g, 13, 51, PAL.wood, 6, 13); px(g, 2, 62, PAL.stoneD, 28, 2);
  });
  obj('wreck', 48, 32, 3, 2, g => {
    for (let y = 12; y < 30; y++) { const k = y - 12; px(g, 4 + (k >> 1), y, PAL.out, 40 - k, 1); px(g, 5 + (k >> 1), y, k % 4 < 2 ? PAL.woodD : '#4a3018', 38 - k, 1); }
    px(g, 20, 0, PAL.out, 3, 14); px(g, 21, 1, PAL.woodD, 1, 12); line(g, 22, 2, 34, 9, PAL.wallD, 2); px(g, 10, 16, PAL.dark, 6, 5); px(g, 30, 18, PAL.dark, 5, 4); px(g, 6, 28, PAL.waterL, 36, 2);
  });
  obj('buoy', 16, 24, 1, 1, g => { px(g, 5, 8, PAL.out, 6, 12); px(g, 6, 9, '#e04b4b', 4, 5); px(g, 6, 14, '#f4f0e8', 4, 5); px(g, 7, 2, PAL.out, 2, 7); px(g, 6, 0, PAL.gold, 4, 3); px(g, 4, 20, PAL.waterL, 8, 2); }, { solid: false });
  obj('debris', 16, 16, 1, 1, g => { px(g, 1, 6, PAL.out, 14, 5); px(g, 2, 7, PAL.woodD, 12, 3); px(g, 4, 3, PAL.out, 6, 4); px(g, 5, 4, PAL.wood, 4, 2); px(g, 0, 11, PAL.waterL, 16, 1); }, { solid: false });
  // the Kraken Trench (underwater maze): coral walls, kelp, oxygen vents, the bubble cage, the great crystal's pedestal
  obj('coral', 16, 20, 1, 1, (g, r) => {
    px(g, 1, 6, PAL.out, 14, 14); px(g, 2, 7, '#a83d7a', 12, 12); px(g, 2, 7, '#d4599e', 12, 2); px(g, 2, 17, '#6f2450', 12, 2);
    for (let i = 0; i < 3; i++) { const x = 3 + i * 4, h = 3 + ((r() * 4) | 0); px(g, x, 6 - h, PAL.out, 4, h + 1); px(g, x + 1, 7 - h, i % 2 ? '#f27a95' : '#ff9ec9', 2, h); }
    px(g, 5, 10, '#f7dc5c', 1, 1); px(g, 10, 13, '#f7dc5c', 1, 1);
  });
  obj('coral_t', 16, 36, 1, 2, (g, r) => {
    px(g, 1, 6, PAL.out, 14, 30); px(g, 2, 7, '#7a3aa0', 12, 28); px(g, 2, 7, '#a25cd0', 12, 2); px(g, 2, 33, '#4a2260', 12, 2);
    for (let i = 0; i < 3; i++) { const x = 3 + i * 4, h = 3 + ((r() * 4) | 0); px(g, x, 6 - h, PAL.out, 4, h + 1); px(g, x + 1, 7 - h, i % 2 ? '#c98aff' : '#e7b8ff', 2, h); }
    px(g, 4, 14, '#8fd3ff', 1, 1); px(g, 10, 22, '#8fd3ff', 1, 1); px(g, 6, 28, '#8fd3ff', 1, 1);
  });
  obj('kelp', 16, 28, 1, 1, (g, r) => { for (let i = 0; i < 3; i++) { const x = 3 + i * 5; for (let y = 4 + ((r() * 6) | 0); y < 28; y++) px(g, x + Math.round(Math.sin(y / 3 + i) * 1.5), y, i % 2 ? '#2f7d3a' : '#4caa4f', 2, 1); } px(g, 0, 26, PAL.out, 16, 1); }, { solid: false });
  obj('vent', 16, 16, 1, 1, g => { px(g, 2, 8, PAL.out, 12, 8); px(g, 3, 9, PAL.stoneD, 10, 6); px(g, 6, 6, PAL.out, 4, 3); px(g, 7, 7, '#4a4a55', 2, 2); px(g, 5, 2, '#dff3ff', 2, 2); px(g, 9, 0, '#dff3ff', 2, 2); px(g, 7, 4, '#8fd3ff', 1, 1); }, { solid: false });
  obj('cage', 32, 40, 2, 2, g => {
    circle(g, 16, 20, 15, 'rgba(143,211,255,.35)'); circle(g, 16, 20, 15, PAL.out); circle(g, 16, 20, 14, '#8fd3ff'); circle(g, 16, 20, 12, '#3f8fd6');
    for (let a = 0; a < 6; a++) { const ang = a * Math.PI / 3; line(g, 16, 20, Math.round(16 + Math.cos(ang) * 13), Math.round(20 + Math.sin(ang) * 13), '#a06fc0', 2); }
    circle(g, 16, 20, 4, '#dff3ff'); px(g, 12, 16, '#fff', 2, 2); px(g, 4, 36, PAL.out, 24, 3); px(g, 5, 37, PAL.stoneD, 22, 1);
  });
  obj('gcrystal', 32, 40, 2, 2, g => {
    px(g, 4, 30, PAL.out, 24, 10); px(g, 5, 31, PAL.stoneD, 22, 8); px(g, 5, 31, PAL.stoneL, 22, 1);
    for (let y = 0; y < 30; y++) { const w = y < 8 ? y + 1 : y < 22 ? 9 : 30 - y; px(g, 16 - w, y + 2, PAL.out, w * 2 + 1, 1); px(g, 17 - w, y + 2, y % 5 === 0 ? '#e7b8ff' : '#b48cff', w * 2 - 1, 1); }
    px(g, 12, 8, '#fff', 2, 6); px(g, 15, 14, '#fff', 1, 3);
  });
  // nation notice board (opens the nation's achievements)
  obj('board', 32, 32, 2, 1, g => {
    px(g, 6, 18, PAL.woodD, 3, 14); px(g, 23, 18, PAL.woodD, 3, 14);
    px(g, 1, 2, PAL.out, 30, 18); px(g, 2, 3, PAL.wood, 28, 16); px(g, 2, 3, PAL.woodD, 28, 1);
    px(g, 4, 5, '#efe4cf', 24, 12); px(g, 6, 7, PAL.stoneD, 14, 1); px(g, 6, 9, PAL.stoneD, 18, 1); px(g, 6, 11, PAL.stoneD, 10, 1); px(g, 6, 13, PAL.gold, 6, 2);
    px(g, 22, 12, PAL.gem, 4, 4); px(g, 0, 20, PAL.out, 32, 1);
  });
  const medal = (name, c1, c2) => obj(name, 16, 16, 1, 1, g => { px(g, 5, 0, PAL.gem, 2, 6); px(g, 9, 0, PAL.roofB, 2, 6); circle(g, 8, 10, 5, PAL.out); circle(g, 8, 10, 4, c1); circle(g, 8, 10, 2, c2); px(g, 7, 9, '#fff', 1, 1); }, { solid: false });
  medal('medal_1', PAL.gold, '#e0a020'); medal('medal_2', '#d0d4dc', '#9aa0aa'); medal('medal_3', '#c8823c', '#8a5a2b');
  // nationality camp flags: pole + striped banner
  for (const [key, cols] of Object.entries(FLAG_COLORS)) obj(flagName(key), 16, 32, 1, 1, g => {
    px(g, 2, 2, PAL.out, 3, 30); px(g, 3, 3, PAL.stoneL, 1, 28);
    px(g, 4, 3, PAL.out, 12, 10); const h = 8 / cols.length; cols.forEach((c, i) => px(g, 5, 4 + Math.round(i * h), c, 10, Math.ceil(h)));
    px(g, 1, 0, PAL.gold, 5, 2);
  });
}
export const FLAG_COLORS = {
  Indonesian: ['#e04b4b', '#ffffff'], Vietnamese: ['#e04b4b', '#ffd45e', '#e04b4b'], Russian: ['#ffffff', '#3d6db5', '#e04b4b'], Indian: ['#ff9426', '#ffffff', '#5a9c58'],
  Nigerian: ['#2e8b57', '#ffffff', '#2e8b57'], Ukrainian: ['#3d6db5', '#ffd45e'], chinese: ['#e04b4b', '#ffd45e', '#e04b4b'], Pakistan: ['#1f6b3a', '#ffffff'],
  Iranian: ['#5a9c58', '#ffffff', '#e04b4b'], Turkish: ['#e04b4b', '#ffffff', '#e04b4b'], Bangladeshi: ['#1f6b3a', '#e04b4b', '#1f6b3a'], Thai: ['#e04b4b', '#ffffff', '#3d6db5', '#ffffff', '#e04b4b'],
  Korean: ['#ffffff', '#e04b4b', '#3d6db5', '#ffffff'], philippines: ['#3d6db5', '#e04b4b'], French: ['#3d6db5', '#ffffff', '#e04b4b'], japanese: ['#ffffff', '#e04b4b', '#ffffff'],
  Egyptian: ['#e04b4b', '#ffffff', '#1f1f1f'], Brazilian: ['#5a9c58', '#ffd45e', '#5a9c58'], 'Singapore/Malaysia': ['#e04b4b', '#ffffff'], Moroccan: ['#e04b4b', '#5a9c58', '#e04b4b'],
  Arabic: ['#1f6b3a', '#ffffff'], Portugal: ['#5a9c58', '#e04b4b'], Italian: ['#5a9c58', '#ffffff', '#e04b4b'], Polish: ['#ffffff', '#e04b4b']
};
export function flagName(key) { return 'flag_' + key.replace(/[^a-z0-9]/gi, '_'); }

// ---------- Rocky, the Seismic mascot: one statue per nation, bigger and grander with every tier ----------
const ROCKY_SPEC = [[16, 20, 1, 1], [16, 26, 1, 1], [32, 40, 2, 1], [32, 52, 2, 2], [48, 72, 3, 2], [48, 88, 3, 2]]; // [w, h, footprint w, footprint h]
export function rockyObj(key, tier) {
  const name = `rocky_${key.replace(/[^a-z0-9]/gi, '_')}_${tier}`;
  if (!O[name]) { const [w, h, fw, fh] = ROCKY_SPEC[tier] || ROCKY_SPEC[0]; obj(name, w, h, fw, fh, g => drawRocky(g, w, h, FLAG_COLORS[key] || ['#888', '#ccc'], tier, hashStr(key) % 4));
    const hi = HOOK.rocky && HOOK.rocky(key, tier); if (hi) O[name].img = hi; }
  return name;
}
function drawRocky(g, w, h, cols, tier, variant) {
  // Rocky: a blocky rock golem — square rounded head, two slit eyes, no mouth, huge stone fists (from the community's mascot art)
  const PALS = [
    { body: '#f2a081', shade: '#d97c5c', light: '#f8bfa6', out: '#5a3222' }, { body: '#f2a081', shade: '#d97c5c', light: '#f8bfa6', out: '#5a3222' },
    { body: '#d6a06e', shade: '#ad764c', light: '#ecc79a', out: '#4a2a1a' }, { body: '#d19a6a', shade: '#a9724a', light: '#e8c090', out: '#4a2a1a' },
    { body: '#c48a5c', shade: '#95623c', light: '#e2b686', out: '#3d2214' }, { body: '#a88a9c', shade: '#7a5a78', light: '#d0b8cc', out: '#2a1830' }
  ];
  const P = PALS[tier] || PALS[0], gem = '#ff5aa5', gemL = '#ffd6ea';
  const ped = tier >= 2 ? Math.round(h * 0.16) : tier === 1 ? 3 : 0;
  const u = Math.min(w / 16, (h - ped) / 20), ox = (w - 16 * u) / 2, oy = h - ped - 20 * u;
  const X = v => Math.round(ox + v * u), Y = v => Math.round(oy + v * u), S = v => Math.max(1, Math.round(v * u));
  const box = (x, y, bw, bh, c = P.body) => { px(g, X(x) - 1, Y(y) - 1, P.out, S(bw) + 2, S(bh) + 2); px(g, X(x), Y(y), c, S(bw), S(bh)); };
  const stripes = (x, y, bw, bh) => { px(g, X(x) - 1, Y(y) - 1, P.out, S(bw) + 2, S(bh) + 2); const sh = Math.max(1, Math.floor(S(bh) / cols.length)); cols.forEach((c, i) => px(g, X(x), Y(y) + i * sh, c, S(bw), i === cols.length - 1 ? S(bh) - i * sh : sh)); };
  // pedestal engraved with the nation's colours
  if (ped) {
    const top = h - ped; px(g, 0, top, P.out, w, ped); px(g, 1, top + 1, tier >= 5 ? '#241a44' : PAL.stoneL, w - 2, ped - 2); px(g, 1, top + 1, tier >= 5 ? '#5a3fa8' : '#fff', w - 2, 1);
    const sh = Math.max(1, Math.floor((ped - 4) / cols.length)); cols.forEach((c, i) => px(g, 2, top + 2 + i * sh, c, w - 4, sh));
  }
  // cape behind (variant 2, or every citadel/sanctum statue)
  if (variant === 2 || tier >= 4) { px(g, X(1.5) - 1, Y(9) - 1, P.out, S(13) + 2, S(10) + 2); px(g, X(1.5), Y(9), cols[0], S(13), S(10)); if (cols[1]) px(g, X(1.5), Y(17.5), cols[1], S(13), S(1.5)); }
  // legs, body, fists
  box(4.5, 15.5, 2.5, 3); box(9, 15.5, 2.5, 3); px(g, X(4.5), Y(17.5), P.shade, S(2.5), S(1)); px(g, X(9), Y(17.5), P.shade, S(2.5), S(1));
  box(4, 10.5, 8, 5); px(g, X(4), Y(10.5), P.shade, S(8), S(0.8));
  const fw = tier >= 4 ? 3.5 : 3; box(0.5, tier >= 4 ? 9.5 : 10, fw, tier >= 4 ? 5.5 : 5); box(15.5 - fw, tier >= 4 ? 9.5 : 10, fw, tier >= 4 ? 5.5 : 5);
  px(g, X(0.5), Y(12), P.shade, S(fw), S(0.7)); px(g, X(15.5 - fw), Y(12), P.shade, S(fw), S(0.7)); px(g, X(1), Y(10.5), P.light, S(1), S(1)); px(g, X(16 - fw), Y(10.5), P.light, S(1), S(1));
  // head: rounded square with a dark brow line
  box(3, 1.5, 10, 9); const cc = Math.max(1, Math.round(u * 0.7)); for (const [cx, cy] of [[X(3) - 1, Y(1.5) - 1], [X(3) + S(10) + 1 - cc, Y(1.5) - 1], [X(3) - 1, Y(1.5) + S(9) + 1 - cc], [X(3) + S(10) + 1 - cc, Y(1.5) + S(9) + 1 - cc]]) g.clearRect(cx, cy, cc, cc);
  px(g, X(3.5), Y(2), P.shade, S(9), S(0.9)); px(g, X(3.5), Y(3), P.light, S(2), S(1));
  if (tier >= 2) { line(g, X(11), Y(3.5), X(12), Y(6), P.shade, S(0.5)); line(g, X(5), Y(12), X(6.5), Y(14), P.shade, S(0.5)); }
  // eyes: slits; glowing from the estate tier up
  const ec = tier >= 5 ? gem : tier >= 3 ? '#ffffff' : P.out;
  for (const ex of [6, 9]) { if (tier >= 3) px(g, X(ex) - 1, Y(5.5) - 1, tier >= 5 ? '#b0308a' : '#c0a0c0', S(1) + 2, S(2) + 2); px(g, X(ex), Y(5.5), ec, S(1), S(2)); }
  // nation style: headband (0), scarf (1), cape (2 — drawn already), hat (3)
  if (variant === 0) stripes(3.5, 4.2, 9, 1.4);
  if (variant === 1) stripes(4, 10.2, 8, 1.6);
  if (variant === 3) { stripes(4.5, -0.8, 7, 2.2); px(g, X(3.5), Y(1.2), P.out, S(9), S(0.8)); }
  // chest rune: the glowing pink gem (court tier and up)
  if (tier >= 2) { const gx = X(8), gy = Y(13); const r = S(1.4); px(g, gx - r - 1, gy - 1, P.out, 2 * r + 2, 2 * r + 2); px(g, gx - r, gy, gem, 2 * r, 2 * r); px(g, gx - Math.round(r / 2), gy + Math.round(r / 2), gemL, Math.max(1, r), Math.max(1, r)); }
  // grander with every tier: crown, gems, crystals
  if (tier >= 3) { const y = Y(-1.2); px(g, X(5) - 1, y - 1, P.out, S(6) + 2, S(1.6) + 2); px(g, X(5), y, PAL.gold, S(6), S(1.6)); for (const dx of [5, 7.5, 10]) px(g, X(dx), y - S(1.2), PAL.gold, S(1), S(1.3)); if (tier >= 4) px(g, X(7.5), y + 1, gem, S(1), S(1)); }
  if (tier >= 5) { for (const [x0, x1] of [[2, 0.5], [14, 15.5]]) { line(g, X(x0), Y(9.5), X(x1), Y(4), P.out, S(1.8)); line(g, X(x0), Y(9.5), X(x1), Y(4), '#8a5cff', S(1)); px(g, X(x1), Y(4), '#d9c8ff', S(0.6), S(0.6)); } }
}

// ---------- characters ----------
export const SKINS = ['#f6d3b5', '#e8b48e', '#c98b5f', '#8d5a3b'];
export const HAIRS = ['#2b1d14', '#5a3a1e', '#c98b2e', '#e8e8e8', '#b23a3a', '#3a4fb2', '#1f1f1f', '#8a5ab2'];
export const PANTS = ['#2f3b5e', '#3b2f2f', '#3d3d3d', '#4a3a6a'];
const sheetCache = new Map();
// sheet: 3 frames (cols) × 4 dirs (rows: 0 down, 1 left, 2 right, 3 up), cell 16×20
export function charSheet(c) {
  if (HOOK.charSheet) { const hs = HOOK.charSheet(c); if (hs) return hs; }   // art.js tự cache theo vùng
  const key = `${c.skin}|${c.hair}|${c.shirt}|${c.pants}`;
  if (sheetCache.has(key)) return sheetCache.get(key);
  const sheet = mkCanvas(48, 80), g = sheet.getContext('2d');
  for (let d = 0; d < 4; d++) for (let f = 0; f < 3; f++) {
    g.save(); g.translate(f * 16, d * 20);
    if (d === 1) { g.translate(16, 0); g.scale(-1, 1); }
    drawChar(g, d === 1 ? 2 : d, f, c); g.restore();
  }
  sheetCache.set(key, sheet); return sheet;
}
function leg(g, x, lifted, c) { const h = lifted ? 3 : 4; px(g, x - 1, 15, PAL.out, 4, h); px(g, x, 15, c.pants, 2, h - 1); }
function drawChar(g, dir, f, c) {
  const b = f === 0 ? 0 : -1, O_ = PAL.out;
  g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(4, 18, 8, 2);
  leg(g, 5, f === 1, c); leg(g, 9, f === 2, c);
  px(g, 2, 9 + b, O_, 12, 6); px(g, 4, 10 + b, c.shirt, 8, 4);
  px(g, 3, 10 + b, c.shirt, 1, 3); px(g, 12, 10 + b, c.shirt, 1, 3); px(g, 3, 13 + b, c.skin); px(g, 12, 13 + b, c.skin);
  px(g, 3, 1 + b, O_, 10, 9); px(g, 4, 2 + b, c.skin, 8, 7);
  if (dir === 3) { px(g, 4, 2 + b, c.hair, 8, 6); }
  else {
    px(g, 4, 2 + b, c.hair, 8, 2); px(g, 4, 4 + b, c.hair, 1, 2); px(g, 11, 4 + b, c.hair, 1, 2);
    if (dir === 0) { px(g, 6, 6 + b, O_); px(g, 9, 6 + b, O_); }
    else { px(g, 8, 6 + b, O_); px(g, 11, 6 + b, O_); px(g, 11, 4 + b, c.skin, 1, 2); }
  }
}

// deterministic look for a member (shirt = level color)
export function lookFor(id, shirt) {
  const h = hashStr(String(id));
  return { skin: SKINS[h % SKINS.length], hair: HAIRS[(h >>> 4) % HAIRS.length], shirt, pants: PANTS[(h >>> 9) % PANTS.length] };
}
