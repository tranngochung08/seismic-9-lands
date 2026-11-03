/* envfx105.js — plan-105 (02/11/2026, anh): MÔI TRƯỜNG PHẢN ỨNG THEO HỆ CHIÊU.
   Chiêu Chấn Thú / linh thú trúng hoa cỏ, bụi, cây, đá trên map → cháy sém, ướt thẫm, đóng băng, nứt, úa… theo hệ; mọi thứ tự hồi về như cũ (chỉ trong phiên, không ghi save).
   API chung: ctx.envfx.hit(x, y, r, he, pw)  (px thế giới, bán kính px, hệ: chan nham trieu loi phong moc suong tinh ma am anh quang, pw 0,4 nhẹ … 1,5 tuyệt chiêu)
              ctx.envfx.hitF(f, x, y, r, pw, o)  — dùng trong linhduel.aoe: tự lấy hệ chiêu đang ra của f (chiêu chung → hệ loài).
              window.__envfx: hit / state / clear / set({var}) / perf.
   Vẽ code hoàn toàn (luật 30/10, skill vfx-code): bảng 8 bậc mỗi hệ, mờ bằng dither Bayer 4×4 (không alpha bán trong suốt), 2 điểm ảnh / px logic.
   · Vết nền = "mảng" nhiễu dựng sẵn vào canvas KHÔNG __hi (luật 25/09), chỉ dựng lại khi đổi bậc mờ (≤ 7 lần / đời); vẽ ở drawGround:
       lớp nhân (multiply: cỏ thật thẫm / sém / xanh lại) + lớp sáng (screen) + lớp trên (than, sương, tinh thể, vết nứt…).
   · Vật (cây, bụi, gốc, đá): ảnh đổi màu cache theo (ảnh nguồn, hệ, bản, bậc) → main.js drawObjItem lấy qua ctx.envfx.img(o, im).
   · Hạt ngắn (lửa, tàn, khói, hơi nước, giọt, sương, tia điện, lá, cánh hoa) chỉ khi có sự kiện, ở drawables theo y. Trần 260 hạt, 28 mảng. */

const TS = 16, RES = 2, MAXP = 28, MAXPART = 260, MAXOBJ = 40;
const BAY = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + 0.5) / 16);
const bay = (x, y) => BAY[(y & 3) * 4 + (x & 3)];
const hx = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
/* bảng 8 bậc (tối → sáng) mỗi hệ — nắn theo TYPE_COLOR (duel-data) và pxfx PAL; nước lấy tông ô nước Làng */
const PALH = {
  nham: ['#120a08', '#2a1610', '#43231a', '#5e3020', '#8c3a1a', '#cc521c', '#f28c2a', '#ffd862'],
  trieu: ['#0d1b2e', '#16304c', '#1e4a6c', '#2a6890', '#3f8fc8', '#6cb2e2', '#a8daf4', '#e6f8ff'],
  suong: ['#22384c', '#335a76', '#4a7e9e', '#6ea4c4', '#98c8e0', '#c2e4f2', '#e2f4fa', '#ffffff'],
  loi: ['#141018', '#272030', '#45384a', '#7a6040', '#c09a30', '#f2c335', '#ffe680', '#fffbe0'],
  moc: ['#16301a', '#244a22', '#30682a', '#3f8a34', '#5aa64a', '#86c95a', '#bde67a', '#f0ffc0'],
  chan: ['#1c120c', '#2e1e14', '#46301e', '#5e4228', '#7a5834', '#a07a4c', '#c4a070', '#e6cca0'],
  phong: ['#1c3a34', '#2c5a4e', '#3e7a6a', '#5a9a88', '#7cbaa8', '#9fd6c8', '#c8ece2', '#f0fff8'],
  am: ['#1a1228', '#2a1e40', '#40305e', '#5c4680', '#7e62a6', '#a284d0', '#c9a2ff', '#ece0ff'],
  anh: ['#08060c', '#120e1a', '#1c1628', '#282038', '#382c4c', '#4a3c62', '#5b4a7a', '#8a78a8'],
  tinh: ['#2a1430', '#4a2050', '#6e3478', '#9a4ea4', '#c070c8', '#d79be8', '#ecc6f6', '#fff0ff'],
  quang: ['#3a2c10', '#5c4818', '#806824', '#a88a34', '#d0b04c', '#ffe9a3', '#fff4cc', '#ffffff'],
  ma: ['#06201a', '#0c3a2c', '#125440', '#1a7058', '#2a9a72', '#46d39a', '#8ef0c4', '#e0fff0'],
};
const PAL = Object.fromEntries(Object.entries(PALH).map(([k, v]) => [k, v.map(hx)]));
const HES = Object.keys(PALH);
const ALIAS = { hoa: 'nham', hoả: 'nham', fire: 'nham', lua: 'nham', bang: 'suong', tuyet: 'suong', ice: 'suong', nuoc: 'trieu', thuy: 'trieu', water: 'trieu', dat: 'chan', earth: 'chan', dien: 'loi', set: 'loi', go: 'moc', cay: 'moc', gio: 'phong', bong: 'anh', toi: 'anh', sang: 'quang', da: 'chan' };
const heOf = h => { h = String(h || 'chan').toLowerCase(); h = ALIAS[h] || h; return PAL[h] ? h : 'chan'; };
/* đời (s), thời gian hiện dần, thời gian cháy */
const CFG = {
  nham: { life: 35, tin: 0.25, burn: 3.4 }, trieu: { life: 25, tin: 0.3 }, suong: { life: 20, tin: 0.45 }, loi: { life: 15, tin: 0.08 },
  moc: { life: 18, tin: 1.2 }, chan: { life: 30, tin: 0.1 }, phong: { life: 6, tin: 0.15 }, am: { life: 15, tin: 0.5 },
  anh: { life: 12, tin: 0.6 }, tinh: { life: 20, tin: 0.6 }, quang: { life: 12, tin: 0.3 }, ma: { life: 10, tin: 0.4 },
};
/* bản nháp (mẫu trước 3 hệ) — chọn được bằng __envfx.set({ var: { nham: 'b' } }) hoặc ?ev105=nham:b,trieu:c */
const VAR = { nham: 'b', trieu: 'a', suong: 'b' };   /* em chọn (02/11): Hoả B than hồng · Triều A thẫm + vũng · Băng B băng mặt */

function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const h2 = (x, y, s) => { let n = (x * 374761393 + y * 668265263 + s * 2246822519) | 0; n = Math.imul(n ^ (n >>> 13), 1274126177); return ((n ^ (n >>> 16)) >>> 0) / 4294967296; };
function vnoise(x, y, sc, s) { const fx = x / sc, fy = y / sc, ix = Math.floor(fx), iy = Math.floor(fy), tx = fx - ix, ty = fy - iy, a = h2(ix, iy, s), b = h2(ix + 1, iy, s), c = h2(ix, iy + 1, s), d = h2(ix + 1, iy + 1, s), u = tx * tx * (3 - 2 * tx), v = ty * ty * (3 - 2 * ty); return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; }
const cl = (v, a = 0, b = 1) => v < a ? a : v > b ? b : v;
const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };

const ST = { ctx: null, P: [], q: [], W: [], FL: [], FLI: new Map(), slide: { vx: 0, vy: 0, lx: 0, ly: 0 }, parts: [], objs: new Map(), seed: 105, n: { hit: 0, patch: 0, spread: 0, douse: 0, melt: 0, obj: 0, built: 0, imgs: 0, evict: 0 }, perf: { ms: 0, n: 0, max: 0 }, log: [], cache: new WeakMap() };
function log(e) { ST.log.push({ t: +(performance.now() / 1000).toFixed(2), ...e }); if (ST.log.length > 60) ST.log.shift(); }

/* ---------- ô nền ---------- */
let TT = null;
function tileCls(ctx, tx, ty) {
  const m = ctx.S.map; if (!m || tx < 0 || ty < 0 || tx >= m.w || ty >= m.h) return 0; const T = ctx.T || {}; if (!TT) TT = T;
  const t = m.ground[ty * m.w + tx];
  if (t === T.WATER || t === T.DEEP || t === T.REEF || t === T.ABYSS) return 3;   /* nước */
  if (t === T.BRIDGE || t === T.DOCK || t === T.CHASM || t === T.LAVA || t === T.NONE) return 0;   /* không vẽ */
  if (t === T.GRASS || t === T.GRASS2 || t === T.MOSS) return 1;   /* cỏ */
  if (t === T.FLOWER) return 4;   /* hoa */
  return 2;   /* đất / đá / cát */
}

/* ---------- mảng nền ---------- */
/* mỗi hàm dựng trả màu cho 1 điểm ảnh (hi-res i, j; px logic lx, ly; khoảng cách chuẩn hoá d; độ đậm m; lớp ô k)
   mul: [r,g,b] nhân (255 = không đổi) · scr: [r,g,b] cộng sáng · top: [r,g,b] đè */
function shapeM(P, lx, ly) {   /* độ đậm 0..1 của mảng tại px logic — mép nhiễu, không tròn đều */
  const dx = lx - P.cxL, dy = (ly - P.cyL) * 1.25, d = Math.hypot(dx, dy) / P.R, n = vnoise(lx, ly, Math.max(4, P.R / 3), P.seed) - 0.5, n2 = vnoise(lx, ly, 3, P.seed + 7) - 0.5;
  return { d, m: cl(1.05 - d - n * 0.5 - n2 * 0.18) };
}
function crackPaths(P, R, nB, depth, seed, jit = 0.5) {   /* nhánh gãy khúc từ tâm (Lichtenberg / vết nứt): mảng đoạn [x0,y0,x1,y1,w] px logic */
  const r = rng(seed), segs = [];
  const walk = (x, y, a, len, w, dep) => { let L = 0; while (L < len) { const st = 2 + r() * 3, nx = x + Math.cos(a) * st, ny = y + Math.sin(a) * st * 0.8; segs.push([x, y, nx, ny, w]); x = nx; y = ny; L += st; a += (r() - 0.5) * jit * 2; if (dep > 0 && r() < 0.18) walk(x, y, a + (r() < 0.5 ? -1 : 1) * (0.5 + r() * 0.6), (len - L) * 0.6, Math.max(0.5, w - 0.5), dep - 1); } };
  for (let b = 0; b < nB; b++) walk(P.cxL, P.cyL, (b / nB) * Math.PI * 2 + r() * 0.8, R * (0.6 + r() * 0.45), 1, depth);
  return segs;
}
function rasterSegs(set, segs, x0, y0) { for (const [ax, ay, bx, by, w] of segs) { const n = Math.ceil(Math.hypot(bx - ax, by - ay) * RES) + 1; for (let k = 0; k <= n; k++) { const u = k / n, x = Math.round((ax + (bx - ax) * u - x0) * RES), y = Math.round((ay + (by - ay) * u - y0) * RES); set(x, y, w); } } }

function buildData(P) {   /* tính 1 lần lúc tạo: mảng độ đậm + màu từng lớp (ảnh chưa mờ) */
  const ctx = ST.ctx, R = P.R, W = Math.ceil(R * 2 * RES) + 4, H = Math.ceil(R * 2 * RES / 1.25) + 6, x0 = P.cxL - W / RES / 2, y0 = P.cyL - H / RES / 2;
  P.x0 = x0; P.y0 = y0; P.W = W; P.H = H; const N = W * H, M = new Float32Array(N), K = new Uint8Array(N), MUL = new Uint8ClampedArray(N * 4), SCR = new Uint8ClampedArray(N * 4), TOP = new Uint8ClampedArray(N * 4);
  const pal = PAL[P.he], r = rng(P.seed), tc = new Map(), kAt = (lx, ly) => { const tx = Math.floor(lx / TS), ty = Math.floor(ly / TS), key = tx * 4096 + ty; let v = tc.get(key); if (v === undefined) { v = tileCls(ctx, tx, ty); tc.set(key, v); } return v; };
  let hasMul = false, hasScr = false, hasTop = false;
  const put = (A, i, c, a = 255) => { A[i * 4] = c[0]; A[i * 4 + 1] = c[1]; A[i * 4 + 2] = c[2]; A[i * 4 + 3] = a; };
  const topAt = (x, y, c) => { if (x < 0 || y < 0 || x >= W || y >= H) return; const i = y * W + x; if (!K[i]) return; put(TOP, i, c); hasTop = true; };
  const he = P.he, v = P.v;
  const LX0 = Math.floor(x0), LY0 = Math.floor(y0), LW = Math.ceil(W / RES) + 2, LH = Math.ceil(H / RES) + 2, MD = new Float32Array(LW * LH).fill(-1), MM = new Float32Array(LW * LH);   /* nhớ hình theo px logic: 4 điểm ảnh / 1 lần tính */
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    const lx = x0 + (i + 0.5) / RES, ly = y0 + (j + 0.5) / RES, Lx = Math.floor(lx), Ly = Math.floor(ly), id = j * W + i, k = kAt(lx, ly);
    if (!k || k === 3) continue;   /* nước: không vẽ vết đất — waterHit lo (tóe, gợn, băng trôi…) */
    const li = (Ly - LY0) * LW + (Lx - LX0); if (MD[li] < 0) { const q = shapeM(P, Lx + 0.5, Ly + 0.5); MD[li] = q.d; MM[li] = q.m; }
    const d = MD[li], m = MM[li]; if (m <= 0) continue;
    M[id] = m; K[id] = k; const n1 = h2(Lx, Ly, P.seed), b = bay(Lx, Ly), grass = k === 1 || k === 4;
    if (he === 'nham') {   /* đất cháy: lõi than đặc (đè, không nhân) → vành nâu sẫm dither → viền cỏ khô vàng nâu; nhân nhẹ cho cỏ thật dưới viền */
      const ash = [86, 80, 76];
      if (m > 0.1) { put(MUL, id, m > 0.35 ? [176, 150, 118] : [214, 196, 160]); hasMul = true; }
      if (m > 0.62) { put(TOP, id, n1 < 0.45 ? pal[0] : n1 < 0.8 ? pal[1] : n1 < 0.93 ? pal[2] : ash); hasTop = true; }
      else if (m > 0.36) { if (b < (m - 0.36) / 0.26 + 0.15) { put(TOP, id, n1 < 0.5 ? pal[2] : n1 < 0.85 ? pal[3] : pal[1]); hasTop = true; } }
      else if (m > 0.14 && grass) { if (b < (m - 0.14) * 2.2) { put(TOP, id, n1 < 0.6 ? [134, 116, 58] : [108, 90, 44]); hasTop = true; } }
      if (k === 4 && m > 0.36 && (Lx * 7 + Ly * 3) % 6 === 0) { put(TOP, id, (Ly & 1) ? pal[0] : ash); hasTop = true; }   /* hoa cháy rụi: gốc than + tro lấm tấm */
      if (v === 'b' && m > 0.72 && n1 > 0.86) { put(TOP, id, n1 > 0.95 ? pal[6] : pal[5]); hasTop = true; P.coal = true; }   /* B: than hồng (tắt khi hết cháy) */
    } else if (he === 'trieu') {
      if (v === 'b') {   /* B: loang vệt bắn — đốm ướt rời quanh tâm */
        const sp = vnoise(lx, ly, 3.5, P.seed + 3); if (m > 0.55 || sp > 0.62 - m * 0.4) { put(MUL, id, m > 0.6 ? [96, 124, 162] : [140, 166, 196]); hasMul = true; }
        if (m > 0.4 && sp > 0.82 && n1 < 0.25) { put(TOP, id, pal[6]); hasTop = true; }
      } else {
        const wet = m > 0.25 || b < m * 3; if (!wet) continue;
        put(MUL, id, m > 0.55 ? [104, 132, 170] : [150, 174, 202]); hasMul = true;
        if (v === 'c' && m > 0.35 && n1 > 0.93) { put(TOP, id, n1 > 0.975 ? pal[7] : pal[6]); hasTop = true; }   /* C: ướt bóng — điểm loá rải */
      }
    } else if (he === 'suong') {
      if (v === 'b') {   /* B: băng mặt — tấm băng xanh nhạt, mép sáng */
        if (m < 0.18) continue; put(MUL, id, [200, 222, 240]); hasMul = true; put(SCR, id, [46, 66, 84]); hasScr = true;
        if (m < 0.3) { put(TOP, id, pal[6]); hasTop = true; }
      } else {
        put(MUL, id, m > 0.5 ? [200, 220, 236] : [226, 238, 246]); hasMul = true;
        if (b < m * 0.85) { put(SCR, id, m > 0.6 ? [70, 86, 100] : [40, 52, 62]); hasScr = true; }   /* sương phủ: dither theo độ đậm */
        if (grass && n1 < 0.07 * (0.5 + m)) { put(TOP, id, n1 < 0.025 ? pal[7] : pal[6]); hasTop = true; }   /* ngọn cỏ đóng băng */
        if (k === 3) { put(SCR, id, [60, 80, 96]); hasScr = true; }
      }
    } else if (he === 'loi') { put(MUL, id, m > 0.7 ? [150, 130, 120] : [214, 200, 186]); hasMul = true; }
    else if (he === 'chan') { put(MUL, id, [226, 210, 190]); hasMul = true; if (m > 0.58 || (m > 0.42 && b < (m - 0.42) * 5)) { put(TOP, id, n1 < 0.35 ? pal[3] : n1 < 0.8 ? pal[4] : n1 < 0.93 ? pal[2] : pal[5]); hasTop = true; } }   /* lõi đất lật (không vẽ nứt mảnh: trên cỏ trông như cành củi — anh chê 49a) */
    else if (he === 'moc') { if (!grass) continue; if (b < m * 0.9) { put(SCR, id, m > 0.5 ? [8, 44, 4] : [4, 26, 2]); hasScr = true; } }
    else if (he === 'phong') { /* chỉ lớp trên */ }
    else if (he === 'am') { const ring = (Math.floor(d * P.R / 5) & 1) === 0; put(MUL, id, ring ? [176, 150, 196] : [222, 208, 232]); hasMul = true; }
    else if (he === 'anh') { if (b > m * 1.6) continue; put(MUL, id, m > 0.55 ? [92, 80, 116] : [150, 136, 170]); hasMul = true; }
    else if (he === 'tinh') { put(MUL, id, [236, 214, 236]); hasMul = true; }
    else if (he === 'quang') { if (b < m * 0.9) { put(SCR, id, m > 0.5 ? [64, 52, 14] : [34, 28, 8]); hasScr = true; } }
    else if (he === 'ma') { const bx = Math.floor(Lx / 2), by = Math.floor(Ly / 2), q = h2(bx, by, P.seed + 1); if (q < m * 0.7) { put(MUL, id, [150, 220, 190]); hasMul = true; if (q < m * 0.18) { put(SCR, id, [10, 60, 36]); hasScr = true; } } }
    if (he !== 'nham' && he !== 'trieu' && he !== 'suong' && MUL[id * 4 + 3] && b >= m * 2.2) MUL[id * 4 + 3] = 0;   /* mép lớp nhân: dither theo độ đậm */
  }
  /* chi tiết lớp trên theo hệ */
  if (he === 'loi' || he === 'chan') {
    const segs = he === 'loi' ? crackPaths(P, R * 0.6, 5, 2, P.seed + 11, 0.7) : [];
    if (he === 'loi') rasterSegs((x, y) => { topAt(x, y, PAL.chan[2]); }, segs, x0, y0);   /* nét cháy xém 1 điểm ảnh, nâu (nét đen dày trông như cành củi) */
    else rasterSegs((x, y, w) => { topAt(x, y, pal[0]); topAt(x + 1, y, pal[0]); topAt(x, y + 1, pal[1]); if (w >= 1) { topAt(x, y + 2, pal[6]); topAt(x + 1, y + 2, pal[6]); } }, segs, x0, y0);
    if (he === 'chan') for (let q = 0; q < Math.round(R / 2); q++) {   /* đất lật + cỏ bật gốc */
      const a = r() * 6.283, dd = R * (0.45 + r() * 0.5), cx = Math.round((P.cxL + Math.cos(a) * dd - x0) * RES), cy = Math.round((P.cyL + Math.sin(a) * dd * 0.8 - y0) * RES);
      for (let yy = 0; yy < 3; yy++) for (let xx = 0; xx < 4; xx++) topAt(cx + xx, cy + yy, yy === 0 ? pal[6] : yy === 1 ? pal[4] : pal[2]);
      if (r() < 0.5) { const G = PAL.moc; topAt(cx + 1, cy - 1, G[4]); topAt(cx + 2, cy - 2, G[5]); topAt(cx + 3, cy - 1, G[3]); }
    }
  }
  if (he === 'suong' && v === 'a') for (let q = 0; q < Math.round(R / 4); q++) {   /* A: vài tinh thể sao 5 điểm ảnh */
    const a = r() * 6.283, dd = R * r() * 0.7, cx = Math.round((P.cxL + Math.cos(a) * dd - x0) * RES), cy = Math.round((P.cyL + Math.sin(a) * dd * 0.8 - y0) * RES);
    topAt(cx, cy, PAL.suong[7]); topAt(cx - 1, cy, PAL.suong[5]); topAt(cx + 1, cy, PAL.suong[5]); topAt(cx, cy - 1, PAL.suong[6]); topAt(cx, cy + 1, PAL.suong[4]);
  }
  if (he === 'suong' && v === 'b') { const segs = crackPaths(P, R * 0.8, 4, 1, P.seed + 5, 0.3); rasterSegs((x, y) => topAt(x, y, PAL.suong[7]), segs, x0, y0); }
  if (he === 'suong' && v === 'c') for (let q = 0; q < Math.round(R / 2.2); q++) {   /* C: gai băng nhô lên (mặt trước + đỉnh sáng) */
    const a = r() * 6.283, dd = R * Math.sqrt(r()) * 0.75, cx = Math.round((P.cxL + Math.cos(a) * dd - x0) * RES), cy = Math.round((P.cyL + Math.sin(a) * dd * 0.8 - y0) * RES), h = 3 + Math.floor(r() * 5);
    for (let yy = 0; yy < h; yy++) { const w = yy < 2 ? 1 : 2; for (let xx = 0; xx < w; xx++) topAt(cx + xx, cy - yy, xx === 0 ? (yy > h - 2 ? PAL.suong[7] : PAL.suong[5]) : PAL.suong[3]); }
    topAt(cx - 1, cy + 1, PAL.suong[2]); topAt(cx + 2, cy + 1, PAL.suong[2]);
  }
  if (he === 'trieu' && v !== 'b') for (let q = 0; q < Math.max(1, Math.round(R / 9)); q++) {   /* vũng nhỏ có điểm sáng phản chiếu */
    const a = r() * 6.283, dd = R * r() * 0.5, cx = (P.cxL + Math.cos(a) * dd - x0) * RES, cy = (P.cyL + Math.sin(a) * dd * 0.8 - y0) * RES, rw = (2 + r() * 2.5) * RES, rh = rw * 0.5;
    for (let yy = -Math.ceil(rh); yy <= Math.ceil(rh); yy++) for (let xx = -Math.ceil(rw); xx <= Math.ceil(rw); xx++) { const e = (xx / rw) ** 2 + (yy / rh) ** 2; if (e > 1) continue; const X = Math.round(cx + xx), Y = Math.round(cy + yy);
      topAt(X, Y, e > 0.62 ? PAL.trieu[2] : yy < -rh * 0.2 && xx < 0 && e < 0.4 ? PAL.trieu[6] : PAL.trieu[3]); }
  }
  if (he === 'moc') for (let q = 0; q < Math.round(R * 0.9); q++) {   /* cỏ non + hoa nở thêm */
    const a = r() * 6.283, dd = R * Math.sqrt(r()) * 0.85, cx = Math.round((P.cxL + Math.cos(a) * dd - x0) * RES), cy = Math.round((P.cyL + Math.sin(a) * dd * 0.8 - y0) * RES), G = PAL.moc;
    if (q % 4 === 0) { const FC = [[255, 196, 214], [255, 236, 140], [250, 250, 244], [214, 170, 255]][q % 16 >> 2], FD = FC.map(c => c * 0.7);
      topAt(cx, cy - 1, FC); topAt(cx - 1, cy, FC); topAt(cx + 1, cy, FC); topAt(cx, cy + 1, FC); topAt(cx, cy, [255, 220, 90]); topAt(cx + 1, cy + 1, FD); topAt(cx, cy + 2, G[3]); }
    else { topAt(cx, cy, G[6]); topAt(cx, cy + 1, G[5]); topAt(cx, cy + 2, G[3]); if (q & 1) { topAt(cx + 1, cy, G[5]); topAt(cx + 1, cy + 1, G[4]); } }
  }
  if (he === 'phong') for (let q = 0; q < Math.round(R * 0.7); q++) {   /* cỏ rạp theo xoáy: nét cung tiếp tuyến */
    const a = r() * 6.283, dd = R * (0.2 + r() * 0.7), L = 3 + r() * 4;
    for (let s = 0; s < L * RES; s++) { const aa = a + s / RES / Math.max(4, dd), X = Math.round((P.cxL + Math.cos(aa) * dd - x0) * RES), Y = Math.round((P.cyL + Math.sin(aa) * dd * 0.8 - y0) * RES); topAt(X, Y, s < 2 ? PAL.phong[4] : PAL.phong[6]); }
  }
  if (he === 'am') for (let q = 0; q < Math.round(R * 0.4); q++) { const a = r() * 6.283, dd = R * r() * 0.8, X = Math.round((P.cxL + Math.cos(a) * dd - x0) * RES), Y = Math.round((P.cyL + Math.sin(a) * dd * 0.8 - y0) * RES); topAt(X, Y, PAL.am[3]); topAt(X, Y + 1, PAL.am[2]); }
  if (he === 'anh') for (let q = 0; q < Math.round(R * 0.5); q++) { const a = r() * 6.283, dd = R * r() * 0.6, X = Math.round((P.cxL + Math.cos(a) * dd - x0) * RES), Y = Math.round((P.cyL + Math.sin(a) * dd * 0.8 - y0) * RES); for (let s = 0; s < 4; s++) topAt(X + s, Y - (s >> 1), PAL.anh[s < 2 ? 1 : 2]); }
  if (he === 'tinh') for (let q = 0; q < Math.round(R / 2.4); q++) {   /* tinh thể hồng mọc lấm tấm */
    const a = r() * 6.283, dd = R * Math.sqrt(r()) * 0.75, cx = Math.round((P.cxL + Math.cos(a) * dd - x0) * RES), cy = Math.round((P.cyL + Math.sin(a) * dd * 0.8 - y0) * RES), h = 2 + Math.floor(r() * 4), T = PAL.tinh;
    for (let yy = 0; yy < h; yy++) { topAt(cx, cy - yy, yy === h - 1 ? T[7] : T[5]); if (yy < h - 1) topAt(cx + 1, cy - yy, T[3]); } topAt(cx - 1, cy, T[2]); topAt(cx + 2, cy, T[2]);
  }
  if (he === 'quang') for (let q = 0; q < Math.round(R / 3); q++) { const a = r() * 6.283, dd = R * r() * 0.7, X = Math.round((P.cxL + Math.cos(a) * dd - x0) * RES), Y = Math.round((P.cyL + Math.sin(a) * dd * 0.8 - y0) * RES); topAt(X, Y, PAL.quang[7]); topAt(X, Y + 1, PAL.quang[5]); }
  if (he === 'ma') for (let q = 0; q < Math.round(R / 3); q++) { const a = r() * 6.283, dd = R * r() * 0.7, X = Math.round((P.cxL + Math.cos(a) * dd - x0) * RES) & ~1, Y = Math.round((P.cyL + Math.sin(a) * dd * 0.8 - y0) * RES) & ~1; for (let s = 0; s < 4; s++) topAt(X + (s & 1), Y + (s >> 1), PAL.ma[6]); }
  P.M = M; P.K = K; P.MUL = hasMul ? MUL : null; P.SCR = hasScr ? SCR : null; P.TOP = hasTop ? TOP : null; P.coalI = null;
  if (P.coal && P.TOP) { const ci = []; for (let i = 0; i < N; i++) if (TOP[i * 4 + 3] && ((TOP[i * 4] === PAL.nham[5][0] && TOP[i * 4 + 1] === PAL.nham[5][1]) || (TOP[i * 4] === PAL.nham[6][0] && TOP[i * 4 + 1] === PAL.nham[6][1]))) ci.push(i); P.coalI = ci; }
}
/* dựng canvas cho bậc mờ q (0..6): điểm ảnh hiện nếu độ đậm × q/6 > ngưỡng Bayer (tính theo px logic → mờ thành chấm vuông 1 px, không lưới thưa ở khung cuối: bậc 1 chỉ còn lõi) */
const QN = 6;
function stageCanvas(P, A, q, key) {
  if (!A) return null; const W = P.W, H = P.H; let c = P[key]; if (!c) c = P[key] = mk(W, H);
  const x = c.getContext('2d'), im = x.createImageData(W, H), D = im.data, f = q / QN;
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    const id = j * W + i; if (!A[id * 4 + 3]) continue; const m = P.M[id], Lx = Math.floor(P.x0 + (i + 0.5) / RES), Ly = Math.floor(P.y0 + (j + 0.5) / RES);
    if (q < QN && (m - (1 - f) * 0.95) <= bay(Lx, Ly) * 0.14) continue;   /* mờ = co vào lõi, mép dither mảnh (không để lưới chấm thưa) */
    D[id * 4] = A[id * 4]; D[id * 4 + 1] = A[id * 4 + 1]; D[id * 4 + 2] = A[id * 4 + 2]; D[id * 4 + 3] = 255;
  }
  x.putImageData(im, 0, 0); ST.n.built++; return c;
}
function visOf(t, T, tin) { if (t < tin) return t / tin; const f0 = T * 0.6; return t < f0 ? 1 : cl(1 - (t - f0) / (T - f0)); }
function patchQ(P) { return Math.ceil(visOf(P.t, P.T, P.tin) * QN - 1e-6); }

/* ---------- vật ---------- */
const PLANT = /tree|bush|palm|flower|shrub|hedge|grass|reed|fern|cactus|vine|lotus|sapling|stump|log|plant|crop|mushroom/i, STONE = /rock|stone|boulder|pebble/i;
function objKind(ctx, o) { if (!o || o.ruined || o.ghost) return null; const t = o.type || ''; if (/^(tree|palm|deadtree)/i.test(t) || /tree/i.test(t)) return 'tree'; if (PLANT.test(t)) return 'plant'; if (STONE.test(t)) return 'stone'; return null; }
function objRect(ctx, o) { const d = ctx.O[o.type]; if (!d) return null; return { x: o.x * TS + (d.ox || 0), y: (o.y + d.fh) * TS - d.h + (d.oy || 0), w: d.w, h: d.h, by: (o.y + d.fh) * TS, cx: (o.x + d.fw / 2) * TS, fw: d.fw }; }
function lum(r, g, b) { return (r * 0.3 + g * 0.59 + b * 0.11) / 255; }
const palAt = (pal, L) => pal[Math.max(0, Math.min(7, Math.round(L * 7)))];
function tintPixels(D, W, H, he, v, st, seed) {   /* đổi màu ảnh vật theo hệ (D = ImageData.data) — trả mảng mới */
  const O = new Uint8ClampedArray(D), pal = PAL[he], r = rng(seed), op = (x, y) => x >= 0 && y >= 0 && x < W && y < H && D[(y * W + x) * 4 + 3] > 40;
  const cut = st.cut ? Math.floor(H * 0.58) : -1, burn = st.burnLook;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4; if (D[i + 3] < 8) continue; const R = D[i], G = D[i + 1], B = D[i + 2], L = lum(R, G, B), leaf = G > R * 1.05 && G > B, edgeUp = !op(x, y - 2);
    let c = null;
    if (he === 'nham') {
      if (st.kind === 'stone') c = [R * 0.62, G * 0.58, B * 0.56];
      else { c = leaf ? palAt(pal, 0.08 + L * 0.62) : [R * 0.5, G * 0.4, B * 0.36]; if (burn && edgeUp && r() < 0.35) c = r() < 0.5 ? pal[6] : pal[5]; }
      if (cut >= 0 && y < cut) { if (!(x % 3 === 0 && y > cut - 5 && r() < 0.7)) { O[i + 3] = 0; continue; } c = pal[1]; }   /* bụi / cỏ cao cháy rụi: còn gốc than */
    } else if (he === 'trieu') { c = [R * 0.56, G * 0.66, B * 0.78 + 18]; if (edgeUp && r() < 0.12) c = PAL.trieu[6]; }
    else if (he === 'suong') { c = palAt(pal, 0.35 + L * 0.75); if (edgeUp) c = r() < 0.6 ? pal[7] : pal[6]; else if (v === 'b' && L < 0.25) c = pal[2]; }
    else if (he === 'loi') { c = leaf ? [L * 150 + 30, L * 138 + 24, L * 110 + 20] : [R * 0.7, G * 0.66, B * 0.64]; if (edgeUp && r() < 0.08) c = pal[6]; }
    else if (he === 'moc') { c = leaf ? [R * 0.9, Math.min(255, G * 1.07 + 6), B * 0.86] : [R, G, B]; if (leaf && edgeUp && r() < 0.15) c = PAL.moc[6]; }
    else if (he === 'chan') { c = [R * 0.85 + 20, G * 0.8 + 14, B * 0.72 + 6]; }
    else if (he === 'phong') { c = [R, G, B]; }
    else if (he === 'am') { const k = leaf ? 0.6 : 0.8; c = [R * k + 40 * (1 - k) + 20, G * k * 0.85, B * k + 70 * (1 - k) + 30]; }
    else if (he === 'anh') { c = palAt(pal, L * 0.9 + 0.1); }
    else if (he === 'tinh') { const t = palAt(pal, 0.35 + L * 0.6); c = [(R + t[0]) / 2, (G + t[1]) / 2, (B + t[2]) / 2]; if (edgeUp && r() < 0.2) c = pal[7]; }
    else if (he === 'quang') { c = [R * 0.75 + 70, G * 0.75 + 60, B * 0.6 + 30]; }
    else if (he === 'ma') { c = palAt(pal, L * 0.9 + 0.1); if ((y & 7) === 0) c = pal[3]; }
    if (!c) continue;
    if (st.q < 4 && vnoise(x, y, 5, 99) * 0.8 + bay(x >> 1, y >> 1) * 0.2 >= st.q / 4) continue;   /* bậc mờ: loang theo mảng nhiễu (không ô cờ) giữa ảnh gốc và ảnh đổi màu */
    O[i] = c[0]; O[i + 1] = c[1]; O[i + 2] = c[2];
  }
  return O;
}
function tinted(o, im, st) {
  let M = ST.cache.get(im); if (!M) { M = new Map(); ST.cache.set(im, M); }
  const key = st.he + st.v + st.q + (st.cut ? 'c' : '') + (st.burnLook ? 'b' : ''); let c = M.get(key); if (c) return c;
  const W = im.__w || im.width, H = im.__h || im.height; if (!W || !H) return im;
  try {
    const s = mk(W, H), x = s.getContext('2d'); x.drawImage(im, 0, 0, W, H);   /* 5 tham số: shim không nhân toạ độ */
    const D = x.getImageData(0, 0, W, H); D.data.set(tintPixels(D.data, W, H, st.he, st.v, st, 1234)); x.putImageData(D, 0, 0);
    if (im.__hi) s.__hi = im.__hi;
    if (im.__w) { s.__w = W; s.__h = H; Object.defineProperty(s, 'width', { value: im.width }); Object.defineProperty(s, 'height', { value: im.height }); }   /* giống logicalCanvas của art.js */
    c = s; ST.n.imgs++;
  } catch (e) { c = im; }
  M.set(key, c); return c;
}

/* ---------- hạt ---------- */
function part(o) { if (ST.parts.length >= MAXPART) return null; const p = { t: 0, z: 0, vz: 0, vx: 0, vy: 0, g: 0, drag: 0, s: 1, ...o }; p.dr = { y: p.y, f: () => drawPart(p) }; ST.parts.push(p); return p; }
const FLAME = [PAL.nham[7], PAL.nham[6], PAL.nham[5], PAL.nham[4], PAL.nham[2]];
function drawPart(p) {
  const g = ST.ctx.g, c = ST.cam, k = p.t / p.life; if (k >= 1) return; const X = p.x - c.cx, Y = p.y - p.z - c.cy;
  if (k > 0.65 && bay(Math.floor(p.x), Math.floor(p.y - p.z)) < (k - 0.65) / 0.35) return;   /* mờ dither */
  let col = p.c;
  if (p.kind === 'flame') col = FLAME[Math.min(4, Math.floor(k * 5))];
  else if (p.kind === 'ember') col = k < 0.5 ? PAL.nham[7] : PAL.nham[5];
  else if (p.kind === 'spark') col = k < 0.4 ? PAL.loi[7] : PAL.loi[5];
  if (!col) return; g.fillStyle = typeof col === 'string' ? col : (col.css || (col.css = `rgb(${col[0]},${col[1]},${col[2]})`));
  const s = p.kind === 'flame' ? (k < 0.5 ? 1 : 0.5) : p.s; g.fillRect(Math.round(X * 2) / 2, Math.round(Y * 2) / 2, s, p.kind === 'flame' && k < 0.3 ? s * 1.5 : s);
}
function updParts(dt) {
  for (const p of ST.parts) { p.t += dt; p.vx *= 1 - p.drag * dt; p.vy *= 1 - p.drag * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vz -= p.g * dt; p.z += p.vz * dt; if (p.z < 0 && p.kind === 'drop') { p.t = p.life; continue; } if (p.z < 0 && p.g > 0) { p.z = 0; p.vz *= -0.3; p.vx *= 0.5; p.vy *= 0.5; } }
  ST.parts = ST.parts.filter(p => p.t < p.life);
}
const R0 = rng(77), rr = (a, b) => a + R0() * (b - a);
function burst(he, x, y, R, pw, n0) {   /* hạt lúc trúng theo hệ */
  const n = Math.round(Math.min(26, (n0 || 6) + R * 0.35 * pw));
  for (let i = 0; i < n; i++) { const a = rr(0, 6.283), d = rr(0, R * 0.7), px = x + Math.cos(a) * d, py = y + Math.sin(a) * d * 0.8;
    if (he === 'nham') part({ kind: i % 3 ? 'flame' : 'ember', x: px, y: py, z: rr(0, 3), vz: rr(10, 26), vx: rr(-4, 4), life: rr(0.35, 0.8), drag: 1 });
    else if (he === 'trieu') part({ x: px, y: py, z: rr(1, 4), vz: rr(18, 40), vx: Math.cos(a) * rr(10, 30), vy: Math.sin(a) * rr(6, 18), g: 160, life: rr(0.35, 0.6), c: PAL.trieu[i % 2 ? 5 : 6], s: 0.5 });
    else if (he === 'suong') part({ x: px, y: py, z: rr(0, 6), vz: rr(-2, 8), vx: rr(-6, 6), life: rr(0.5, 1.1), drag: 2, c: PAL.suong[i % 3 ? 7 : 5], s: 0.5 });
    else if (he === 'loi') { if (i < 8) part({ kind: 'spark', x: px, y: py, z: rr(0, 4), vz: rr(20, 50), vx: Math.cos(a) * rr(20, 50), vy: Math.sin(a) * rr(10, 30), g: 200, life: rr(0.2, 0.4), s: 0.5 }); }
    else if (he === 'moc') part({ x: px, y: py, z: rr(6, 14), vz: rr(-4, 4), vx: rr(-8, 8), g: 12, life: rr(0.8, 1.4), drag: 1.5, c: [[255, 196, 214], [189, 230, 122], [255, 236, 140]][i % 3], s: 0.5 });
    else if (he === 'chan') part({ x: px, y: py, z: rr(0, 2), vz: rr(20, 45), vx: Math.cos(a) * rr(10, 30), vy: Math.sin(a) * rr(5, 15), g: 180, life: rr(0.4, 0.7), c: PAL.chan[i % 2 ? 4 : 2], s: 1 });
    else if (he === 'phong') part({ x: px, y: py, z: rr(2, 10), vz: rr(4, 14), vx: -Math.sin(a) * rr(30, 60), vy: Math.cos(a) * rr(15, 30), g: 20, life: rr(0.6, 1.0), drag: 1.2, c: PAL.moc[i % 2 ? 4 : 5], s: 0.5 });
    else if (he === 'tinh' || he === 'quang' || he === 'ma' || he === 'am' || he === 'anh') { if (i < 6) part({ x: px, y: py, z: rr(2, 10), vz: rr(6, 16), life: rr(0.4, 0.8), drag: 1, c: PAL[he][he === 'anh' ? 2 : 6], s: 0.5 }); }
  }
}
function steam(x, y, R) { for (let i = 0; i < Math.min(16, 5 + R * 0.4); i++) part({ x: x + rr(-R, R) * 0.6, y: y + rr(-R, R) * 0.4, z: rr(0, 4), vz: rr(10, 22), vx: rr(-5, 5), life: rr(0.6, 1.2), drag: 1.5, c: i % 2 ? [236, 244, 250] : [200, 214, 226], s: i % 3 ? 0.5 : 1 }); }

/* ---------- NƯỚC (anh 02/11: "Thêm VFX khi skill đánh xuống NƯỚC") ----------
   Chiêu trúng ô nước (suối / ao / biển — mặt nạ điểm ảnh ctx.waterAt của water.js) → thay vết đất bằng:
   chung: cột nước + giọt văng (trọng lực, màu bảng 8 bậc của chính loại nước: nông / sâu / ao), vòng gợn lan CHỈ trên điểm ảnh nước, bọt trắng tan dần; to nhỏ theo sức.
   theo hệ: Nham hơi nước trắng bốc + gợn tối · Sương mảng băng trôi rồi tan · Lôi tia điện bò trên mặt nước vài khung · Chấn sóng tròn mạnh + cột cao
            Triều xoáy nhỏ · Mộc lá / bèo nổi · khác: chung. Cá (water.js) giật tản ra (ctx.waterScare). Không lặp — mỗi sự kiện tắt sau vài giây.
   Bản nháp chung: VAR.nuoc 'a' cột bọt giữa + giọt toả · 'b' vương miện (giọt bắn vòng quanh mép) · 'c' bụi nước bè rộng thấp. */
const WBASE = { 1: [86, 155, 243], 2: [52, 112, 205], 3: [118, 190, 253] };
const wmix = (a, b, k) => [Math.round(a[0] + (b[0] - a[0]) * k), Math.round(a[1] + (b[1] - a[1]) * k), Math.round(a[2] + (b[2] - a[2]) * k)];
function wpal8(b) { const N = [14, 30, 70], W = [236, 250, 255]; return [wmix(b, N, 0.62), wmix(b, N, 0.45), wmix(b, N, 0.28), wmix(b, N, 0.12), b, wmix(b, W, 0.2), wmix(b, W, 0.45), wmix(b, W, 0.78)]; }
const WPAL = { 1: wpal8(WBASE[1]), 2: wpal8(WBASE[2]), 3: wpal8(WBASE[3]) };
VAR.nuoc = VAR.nuoc || 'a';
function wetK(x, y) {   /* 0 khô · 1 nông · 2 sâu · 3 ao (mặt nạ điểm ảnh water.js; không có thì theo ô) */
  const ctx = ST.ctx; try { if (ctx.waterAt) return ctx.waterAt(x, y) | 0; } catch (e) { }
  return tileCls(ctx, Math.floor(x / TS), Math.floor(y / TS)) === 3 ? 1 : 0;
}
function wetSpot(x, y, r) {   /* tâm trúng ướt? / điểm ướt gần nhất trong vùng trúng (chiêu trúng mép bờ) */
  if (wetK(x, y)) return { x, y, k: wetK(x, y), all: true };
  let best = null, bd = 1e9; for (let i = 0; i < 12; i++) { const a = i / 12 * 6.283; for (const f of [0.35, 0.7]) { const px = x + Math.cos(a) * r * f, py = y + Math.sin(a) * r * f * 0.8, k = wetK(px, py); if (k) { const d = f; if (d < bd) { bd = d; best = { x: px, y: py, k, all: false }; } } } }
  return best;
}
function wMask(E) {   /* mặt nạ ướt theo px logic quanh sự kiện — tính 1 lần lúc trúng (vòng gợn / băng / bèo cắt theo nước) */
  const R = E.RM, x0 = Math.floor(E.x - R), y0 = Math.floor(E.y - R), w = Math.ceil(R * 2) + 1, h = w, M = new Uint8Array(w * h);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) M[j * w + i] = wetK(x0 + i + 0.5, y0 + j + 0.5);
  E.mx0 = x0; E.my0 = y0; E.mw = w; E.mh = h; E.M = M;
}
const wAt = (E, x, y) => { const i = Math.floor(x) - E.mx0, j = Math.floor(y) - E.my0; return i >= 0 && j >= 0 && i < E.mw && j < E.mh ? E.M[j * E.mw + i] : 0; };
function waterHit(he, x, y, r, pw, src) {
  const sp = wetSpot(x, y, r); if (!sp) return null;
  x = sp.x; y = sp.y; const tn = performance.now() / 1000;
  for (const E of ST.W) if (Math.hypot(E.x - x, E.y - y) < 10 && tn - E.born < 0.3) return E;   /* cùng chỗ trong 0,3 s: 1 lần tóe */
  if (ST.W.length >= 10) ST.W.shift();
  const k = sp.k || 1, P8 = WPAL[k] || WPAL[1], s = cl(pw, 0.3, 1.6), Rr = cl(r, 8, 40) * (0.7 + 0.3 * s), seed = (ST.seed = (ST.seed * 1103515245 + 12345) >>> 0) & 0xffff;
  const E = { he, x, y, k, P8, s, Rr, RM: Rr * 1.6 + 6, t: 0, T: 2.2, born: tn, seed, rings: [], floes: [], leaves: [], arcT: 0, whirl: null, foam: { r: 4 + s * 6, T: 1.1 + s * 0.6 }, dark: he === 'nham' };
  wMask(E);
  const big = he === 'chan' ? 1.6 : he === 'nham' ? 0.55 : 1, v = VAR.nuoc;
  /* vòng gợn: lan ra, mảnh, chỉ trên nước */
  const nR = he === 'chan' ? 3 : 2; for (let i = 0; i < nR; i++) E.rings.push({ t0: i * 0.18, dur: 1.1 + s * 0.5 + i * 0.2, r1: Rr * (0.8 + i * 0.35) * (he === 'chan' ? 1.3 : 1), th: he === 'chan' && i === 0 ? 2 : 1, c: E.dark ? P8[1] : P8[7] });
  /* giọt / cột */
  const nD = Math.round((16 + s * 18) * big);
  for (let i = 0; i < nD; i++) {
    const a = rr(0, 6.283), col = R0() < 0.5 ? P8[7] : P8[6];
    if (v === 'b') { const rr0 = 2 + s * 2; part({ kind: 'drop', x: x + Math.cos(a) * rr0, y: y + Math.sin(a) * rr0 * 0.6, z: 1, vz: rr(40, 80) * (0.7 + s * 0.4) * big, vx: Math.cos(a) * rr(18, 34), vy: Math.sin(a) * rr(8, 16), g: 240, life: 1.4, c: col, s: R0() < 0.4 ? 1 : 0.5 }); }
    else if (v === 'c') part({ kind: 'drop', x: x + rr(-3, 3), y: y + rr(-2, 2), z: 1, vz: rr(25, 55) * (0.7 + s * 0.3) * big, vx: Math.cos(a) * rr(25, 55), vy: Math.sin(a) * rr(10, 24), g: 220, life: 1.2, c: col, s: 0.5 });
    else part({ kind: 'drop', x: x + Math.cos(a) * 2, y: y + Math.sin(a) * 1.2, z: 1, vz: rr(45, 110) * (0.6 + s * 0.45) * big, vx: Math.cos(a) * rr(8, 26), vy: Math.sin(a) * rr(4, 12), g: 250, life: 1.6, c: col, s: R0() < 0.7 ? 1 : 0.5 });
  }
  if (v !== 'c') for (let i = 0; i < Math.round((6 + s * 8) * big); i++) part({ kind: 'drop', x: x + rr(-2, 2), y: y + 0.5, z: 2, vz: rr(100, 160) * (0.7 + s * 0.35) * big, vx: rr(-4, 4), g: 260, life: 1.8, c: P8[7], s: 1 });   /* cột giữa */
  /* theo hệ */
  if (he === 'nham') { for (let i = 0; i < Math.round(10 + s * 10); i++) part({ kind: 'steam', x: x + rr(-Rr, Rr) * 0.5, y: y + rr(-Rr, Rr) * 0.3, z: rr(0, 3), vz: rr(10, 20), vx: rr(-4, 4), life: rr(1.0, 1.8), drag: 1.2, c: i % 3 ? [236, 242, 246] : [196, 206, 214], s: 1 }); E.T = 2.6; }
  if (he === 'suong') { const n = Math.round(3 + s * 3), r = rng(seed); for (let i = 0; i < n; i++) { const a = r() * 6.283, d = Rr * (0.15 + r() * 0.55), sz = 2 + r() * 3 * s, pts = []; for (let yy = -4; yy <= 4; yy++) for (let xx = -6; xx <= 6; xx++) { const e = (xx / (sz * 1.3)) ** 2 + (yy / (sz * 0.7)) ** 2 + (h2(xx, yy, seed + i) - 0.5) * 0.5; if (e < 1) pts.push(xx, yy, e); }
      E.floes.push({ x: x + Math.cos(a) * d, y: y + Math.sin(a) * d * 0.7, vx: Math.cos(a) * rr(1.5, 4), vy: Math.sin(a) * rr(0.8, 2), pts }); } E.T = 7.5; }
  if (he === 'loi') { E.arcT = 0.55; E.T = 2.4; }
  if (he === 'trieu') { E.whirl = { T: 2.6, r: Rr * 0.7 }; E.T = 3; }
  if (he === 'moc') { const r = rng(seed + 3), n = Math.round(9 + s * 8); for (let i = 0; i < n; i++) { const a = r() * 6.283, d = Rr * r() * 0.6; E.leaves.push({ x: x + Math.cos(a) * d, y: y + Math.sin(a) * d * 0.7, vx: Math.cos(a) * rr(2, 6), vy: Math.sin(a) * rr(1, 3), duck: r() < 0.5, rot: r() < 0.5 }); } E.T = 8; }
  try { if (ST.ctx.waterScare) ST.ctx.waterScare(x, y, Rr * (he === 'loi' ? 2.6 : 1.8), he === 'loi' ? 2.5 : 1.6); } catch (e) { }   /* cá giật tản ra */
  ST.W.push(E); ST.n.water = (ST.n.water || 0) + 1; log({ ev: 'water', he, x: Math.round(x), y: Math.round(y), k, src: src || 'hit' }); return E;
}
function updWater(dt) {
  for (const E of ST.W) {
    E.t += dt;
    for (const f of E.floes) { const nx = f.x + f.vx * dt, ny = f.y + f.vy * dt; if (wAt(E, nx, ny)) { f.x = nx; f.y = ny; } else { f.vx *= -0.5; f.vy *= -0.5; } f.vx *= 1 - 0.25 * dt; f.vy *= 1 - 0.25 * dt; }
    for (const l of E.leaves) { const nx = l.x + l.vx * dt, ny = l.y + l.vy * dt; if (wAt(E, nx, ny)) { l.x = nx; l.y = ny; } l.vx *= 1 - 0.6 * dt; l.vy *= 1 - 0.6 * dt; }
  }
  ST.W = ST.W.filter(E => E.t < E.T);
}
function px1(g, E, x, y, c, cx, cy) { if (!wAt(E, x, y)) return; g.fillStyle = c.css || (c.css = `rgb(${c[0]},${c[1]},${c[2]})`); g.fillRect(Math.round(x * 2) / 2 - cx, Math.round(y * 2) / 2 - cy, 0.5, 0.5); }
function drawWater(g, cx, cy) {
  for (const E of ST.W) {
    const P8 = E.P8, t = E.t;
    /* bọt trắng: đĩa dither co lại */
    if (t < E.foam.T) { const k = t / E.foam.T, r = E.foam.r * (0.6 + 0.6 * Math.min(1, t * 5)) * (1 - k * 0.5); for (let yy = -r; yy <= r; yy += 0.5) for (let xx = -r * 1.4; xx <= r * 1.4; xx += 0.5) { const e = (xx / (r * 1.4)) ** 2 + (yy / r) ** 2; if (e > 1) continue; const X = E.x + xx, Y = E.y + yy * 0.7; if (bay(Math.floor(X * 2), Math.floor(Y * 2)) > (1 - k) * (1.25 - e)) continue; px1(g, E, X, Y, e > 0.6 ? P8[6] : P8[7], cx, cy); } }
    /* vòng gợn */
    for (const R of E.rings) { const u = (t - R.t0) / R.dur; if (u <= 0 || u >= 1) continue; const r = 2 + (R.r1 - 2) * (1 - (1 - u) * (1 - u)), n = Math.ceil(r * 2 * 6.283);
      for (let i = 0; i < n; i++) { const a = i / n * 6.283, X = E.x + Math.cos(a) * r, Y = E.y + Math.sin(a) * r * 0.6; if (bay(i, Math.floor(u * 8)) > (1 - u) * 1.4) continue; px1(g, E, X, Y, R.c, cx, cy); px1(g, E, X + 0.5, Y, R.c, cx, cy); if (R.th > 1) px1(g, E, X, Y + 0.5, P8[7], cx, cy); } }
    /* xoáy nhỏ (Triều) */
    if (E.whirl && t < E.whirl.T) { const k = t / E.whirl.T, N = 44; for (let i = 0; i < N; i++) { const f = i / N, a = f * 9 + t * 7, r = E.whirl.r * (1 - f) * (1 - k * 0.6) + 1; if (bay(i, 3) > 1.2 - k) continue; px1(g, E, E.x + Math.cos(a) * r, E.y + Math.sin(a) * r * 0.6, f < 0.3 ? P8[7] : f < 0.7 ? P8[6] : P8[2], cx, cy); } }
    /* mảng băng trôi rồi tan (co từ mép) */
    if (E.floes.length) { const melt = cl((t - E.T * 0.45) / (E.T * 0.55)); const S = PAL.suong;
      for (const f of E.floes) for (let i = 0; i < f.pts.length; i += 3) { const e = f.pts[i + 2]; if (e > 1 - melt) continue; const X = f.x + f.pts[i] * 0.5, Y = f.y + f.pts[i + 1] * 0.5, edge = e > 0.62 - melt * 0.6; px1(g, E, X, Y, edge ? S[7] : (f.pts[i + 1] > 1 ? S[4] : S[5]), cx, cy); if (f.pts[i + 1] >= 0 && e > 0.5 - melt) px1(g, E, X, Y + 1, P8[1], cx, cy); } }
    /* lá / bèo nổi (Mộc) */
    if (E.leaves.length) { const k = t / E.T, G = PAL.moc; for (const l of E.leaves) { if (k > 0.7 && bay(Math.floor(l.x), Math.floor(l.y)) < (k - 0.7) / 0.3) continue; if (l.duck) { for (let a = 0; a < 2; a += 0.5) for (let b = 0; b < 1.5; b += 0.5) px1(g, E, l.x + a, l.y + b, b > 0.9 ? G[3] : (a + b) < 0.6 ? G[6] : G[5], cx, cy); } else { px1(g, E, l.x, l.y, G[4], cx, cy); px1(g, E, l.x + 0.5, l.y - (l.rot ? 0.5 : 0), G[5], cx, cy); px1(g, E, l.x + 1, l.y - (l.rot ? 1 : 0), G[6], cx, cy); px1(g, E, l.x + 0.5, l.y + 0.5, G[2], cx, cy); } } }
    /* tia điện bò trên mặt nước (Lôi): vài khung, đổi hình ~15 lần / s */
    if (t < E.arcT) { const r = rng(E.seed + Math.floor(t * 15)), C = PAL.loi; for (let b = 0; b < 5; b++) { let X = E.x, Y = E.y, a = r() * 6.283; const L = E.Rr * (0.6 + r() * 0.8) * (1 - t / E.arcT * 0.4); for (let s = 0; s < L; s += 0.5) { a += (r() - 0.5) * 0.9; X += Math.cos(a) * 0.5; Y += Math.sin(a) * 0.35; if (!wAt(E, X, Y)) break; px1(g, E, X, Y, s < L * 0.3 ? C[7] : C[6], cx, cy); if (r() < 0.25) px1(g, E, X, Y + 0.5, C[5], cx, cy); } } }
  }
}

/* ---------- NGẬP (anh 02/11: "Chấn Thú mạnh dưới nước thì skill có thể THAY ĐỔI MAP — mặt đất, mặt cỏ thành MẶT NƯỚC") ----------
   envfx.flood(x, y, r, dur, src): ô cỏ / hoa / rêu trong bán kính (2–6 ô) đổi THẬT sang nước nông (ctx.setG, giữ cờ cứng gốc của ô) — water.js tự vẽ nước thật
   (dò ô đổi như thuỷ triều) + gợn / cá; nước tràn từ tâm ra (mép bọt), rút từ mép vào sau ~dur s, để vết ướt thẫm (hệ Triều) rồi khô. Không ghi save.
   AN TOÀN: chỉ ô KHÔNG cứng thành nước KHÔNG cứng (lội được, không nhốt ai — luật 22/09, 12/10); bỏ đường đất / đá / cầu / lối ra / mép bản đồ / chân nhà, quầy.
   Cây / bụi / đá trong vùng ngập: chìm chân (main.js drawObjItem → envfx.sink). Trần 3 vùng.
   Tương tác: Nham → hơi nước, rút nhanh · Sương → mặt ngập đóng băng (8 s) rồi tan · Lôi → điện lan khắp vùng ngập, trúng mọi quái đang đứng trong nước.
   Tự kích: chiêu hệ Triều sức ≥ 1,3 (tuyệt chiêu) và bán kính ≥ 36 px gọi envfx.hit → ngập theo vùng chiêu. */
const FLMAX = 3, FLOK = () => { const T = ST.ctx.T; return new Set([T.GRASS, T.GRASS2, T.FLOWER, T.MOSS]); };
function floodBlock(ctx) {   /* ô cấm ngập: chân vật không phải cây cỏ / đá (nhà, quầy, biển, cổng…) + viền 1 ô, quanh lối vào / cổng 3 ô, mép bản đồ 3 ô */
  const m = ctx.S.map, B = new Set(), add = (x, y, r = 0) => { for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) B.add((x + i) + ',' + (y + j)); };
  for (const o of m.objects) { if (objKind(ctx, o)) continue; const d = ctx.O[o.type]; if (!d) continue; for (let j = 0; j < (d.fh || 1); j++) for (let i = 0; i < (d.fw || 1); i++) add(o.x + i, o.y + j, 1); if (o.exit) add(o.x, o.y, 3); }
  try { const E = m.entries || {}; for (const k in E) { const e = E[k]; if (e && e.x != null) add(Math.floor(e.x), Math.floor(e.y), 3); } } catch (e) { }
  try { for (const gt of m.gates || []) for (let j = 0; j < (gt.h || 1); j++) for (let i = 0; i < (gt.w || 1); i++) add(gt.x + i, gt.y + j, 2); } catch (e) { }
  return B;
}
function flood(x, y, r = 64, dur = 24, src = 'api') {
  const ctx = ST.ctx; if (!ctx || !ctx.S.map || !ctx.setG) return null; const m = ctx.S.map, T = ctx.T, ok = FLOK();
  for (const F of ST.FL) if (Math.hypot(F.x - x, F.y - y) < F.R * 16 * 0.6 && F.t < F.T - 3.5) { F.T = Math.max(F.T, F.t + dur); return F; }   /* cùng chỗ: kéo dài */
  if (ST.FL.length >= FLMAX) { const o = ST.FL[0]; o.T = Math.min(o.T, o.t + 3); }
  const R = Math.round(cl(r / 16, 2, 6)), tx0 = Math.floor(x / TS), ty0 = Math.floor(y / TS), B = floodBlock(ctx), cells = [], W = m.w, H = m.h, taken = new Set();
  for (const F of ST.FL) for (const c of F.cells) taken.add(c.i);
  for (let j = -R; j <= R; j++) for (let i = -R; i <= R; i++) {
    const tx = tx0 + i, ty = ty0 + j; if (tx < 3 || ty < 3 || tx >= W - 3 || ty >= H - 3) continue;
    const dn = Math.hypot(i, j * 1.15) / (R + 0.5) + (h2(tx, ty, 105) - 0.5) * 0.25; if (dn > 1) continue;
    const id = ty * W + tx, t0 = m.ground[id], s0 = m.solid[id]; if (!ok.has(t0) || s0 || B.has(tx + ',' + ty) || taken.has(id)) continue;
    cells.push({ i: id, tx, ty, t0, s0, d: cl(dn), on: false, chT: -9 });
  }
  if (cells.length < 8 && !flood.retry) {   /* tâm chiêu nằm trên nước (thú nước đứng giữa suối) → dời tâm sang bờ cỏ gần nhất rồi ngập bờ */
    let best = null, bd = 1e9; for (let j = -8; j <= 8; j++) for (let i = -8; i <= 8; i++) { const tx = tx0 + i, ty = ty0 + j; if (tx < 3 || ty < 3 || tx >= W - 3 || ty >= H - 3) continue; const id = ty * W + tx; if (!ok.has(m.ground[id]) || m.solid[id] || B.has(tx + ',' + ty)) continue; const d = Math.hypot(i, j); if (d < bd) { bd = d; best = [tx, ty]; } }
    if (best) { const dx = best[0] - tx0, dy = best[1] - ty0, dl = Math.hypot(dx, dy) || 1; flood.retry = true; try { const F2 = flood((best[0] + dx / dl * R * 0.7) * TS + 8, (best[1] + dy / dl * R * 0.7) * TS + 8, r, dur, src + ':bờ'); if (F2) return F2; } finally { flood.retry = false; } }
  }
  if (cells.length < 3) { log({ ev: 'flood-skip', n: cells.length, src }); return null; }
  const F = { x, y, R, cells, t: 0, T: Math.max(8, dur), ice: 0, zap: 0, src, seed: (ST.seed = (ST.seed * 1103515245 + 12345) >>> 0) & 0xffff, objs: [], m };
  const set = new Set(cells.map(c => c.i));
  for (const o of m.objects) { if (!objKind(ctx, o)) continue; if (set.has(o.y * W + o.x)) F.objs.push(o); }
  ST.FL.push(F); ST.n.flood = (ST.n.flood || 0) + 1; log({ ev: 'flood', x: Math.round(x), y: Math.round(y), R, n: cells.length, src });
  waterHit('trieu', x, y, R * 16 * 0.6, 1.2, 'flood'); return F;
}
function cellSet(F, c, on) {
  const ctx = ST.ctx, m = F.m; c.on = on; c.chT = F.t; if (on) ST.FLI.set(c.i, F); else if (ST.FLI.get(c.i) === F) ST.FLI.delete(c.i);
  if (on) ctx.setG(m, c.tx, c.ty, ctx.T.WATER, !!c.s0); else ctx.setG(m, c.tx, c.ty, c.t0, !!c.s0);
  for (const o of F.objs) if (o.x === c.tx && o.y === c.ty) { if (on) o.fl105 = (o.fl105 || 0) + 1; else if (o.fl105 && --o.fl105 <= 0) delete o.fl105; }
}
function floodEnd(F, wet) { for (const c of F.cells) if (c.on) cellSet(F, c, false); for (const o of F.objs) delete o.fl105; if (wet) addPatch('trieu', F.x, F.y, F.R * 16, 0.9, { life: 22, tin: 0.4 }); }
const RECEDE = 3;
function updFlood(dt) {
  for (const F of ST.FL) {
    F.t += dt; if (F.ice > 0) F.ice -= dt; if (F.zap > 0) F.zap -= dt;
    const rec = F.t > F.T - RECEDE, p = rec ? cl((F.t - (F.T - RECEDE)) / RECEDE) : 0;
    for (const c of F.cells) {
      if (!rec && !c.on && F.t >= c.d * 0.9) cellSet(F, c, true);   /* tràn từ tâm ra */
      else if (rec && c.on && c.d >= 1 - p - 0.02) cellSet(F, c, false);   /* rút từ mép vào */
    }
    if (F.t >= F.T) { F.done = true; floodEnd(F, true); log({ ev: 'flood-end', src: F.src }); }
  }
  if (ST.FL.some(F => F.done)) ST.FL = ST.FL.filter(F => !F.done);
  /* mặt ngập đóng băng: trơn trượt nhẹ — thả phím vẫn trượt thêm theo đà (giảm dần), dừng ở ô cứng */
  const ctx = ST.ctx, p = ctx.S.player, S0 = ST.slide, F = inFlood(p.x, p.y), vx = (p.x - S0.lx) / Math.max(dt, 1e-3), vy = (p.y - S0.ly) / Math.max(dt, 1e-3);
  if (F && F.ice > 0 && Math.hypot(vx, vy) < 400) {
    if (p.moving) { S0.vx = vx * 0.55; S0.vy = vy * 0.55; }
    else if (Math.hypot(S0.vx, S0.vy) > 4) { const nx = p.x + S0.vx * dt, ny = p.y + S0.vy * dt; if (!ctx.isSolid(ctx.S.map, Math.floor(nx / TS), Math.floor(ny / TS))) { p.x = nx; p.y = ny; } else { S0.vx = 0; S0.vy = 0; } S0.vx *= 1 - 2.2 * dt; S0.vy *= 1 - 2.2 * dt; ST.n.slide = (ST.n.slide || 0) + 1; }
  } else { S0.vx = 0; S0.vy = 0; }
  S0.lx = p.x; S0.ly = p.y;
}
function inFlood(x, y) { const ctx = ST.ctx; if (!ctx || !ST.FLI.size) return null; const F = ST.FLI.get(Math.floor(y / TS) * ctx.S.map.w + Math.floor(x / TS)); return F && F.m === ctx.S.map ? F : null; }
function floodReact(he, x, y, R) {   /* hệ đánh vào vùng ngập */
  const F = inFlood(x, y) || ST.FL.find(F => Math.hypot(F.x - x, F.y - y) < F.R * 16 + R); if (!F) return false;
  if (he === 'nham') { F.T = Math.max(F.t + RECEDE + 0.5, F.T - 7); for (let i = 0; i < 18; i++) { const c = F.cells[Math.floor(R0() * F.cells.length)]; if (c.on) part({ kind: 'steam', x: c.tx * TS + rr(2, 14), y: c.ty * TS + rr(4, 14), vz: rr(10, 20), vx: rr(-4, 4), life: rr(1, 1.8), drag: 1.2, c: i % 3 ? [236, 242, 246] : [196, 206, 214], s: 1 }); } log({ ev: 'flood-steam' }); return true; }
  if (he === 'suong') { F.ice = 8; F.T = Math.max(F.T, F.t + 9.5); log({ ev: 'flood-ice' }); return true; }
  if (he === 'loi') { F.zap = 0.7; let n = 0; const ctx = ST.ctx;
    try { for (const mo of ctx.monsters.list().slice()) { if (!(mo.hp > 0) || mo.dead || (mo.c && mo.c.boss)) continue; if (inFlood(mo.x, mo.y) === F) { ctx.monsters.damage(mo, Math.max(1, Math.round((mo.max || 10) * 0.12)), { x: F.x, y: F.y }, 0.4, 20); n++; } } } catch (e) { }
    try { if (ctx.waterScare) ctx.waterScare(F.x, F.y, F.R * 16 * 1.5, 2.5); } catch (e) { }
    F.zapN = n; ST.n.zap = (ST.n.zap || 0) + n; log({ ev: 'flood-zap', n }); return true; }
  return false;
}
let ICE = null;
function iceTile() { if (ICE) return ICE; const c = mk(32, 32), x = c.getContext('2d'), im = x.createImageData(32, 32), D = im.data, S = PAL.suong;
  for (let j = 0; j < 32; j++) for (let i = 0; i < 32; i++) { const k = (j * 32 + i) * 4, n = h2(i >> 1, j >> 1, 7); if (bay(i >> 1, j >> 1) > 0.6 && n > 0.2) continue; const col = n > 0.97 ? S[7] : n > 0.6 ? S[6] : S[5]; D[k] = col[0]; D[k + 1] = col[1]; D[k + 2] = col[2]; D[k + 3] = 255; }
  x.putImageData(im, 0, 0); return (ICE = c); }
function drawFlood(g, cx, cy) {
  const VW = ST.ctx.VW || 400, VH = ST.ctx.VH || 300, Wt = ST.ctx.S.map.w;
  for (const F of ST.FL) {
    const on = new Set(); for (const c of F.cells) if (c.on) on.add(c.i);
    const P8 = WPAL[1];
    for (const c of F.cells) {
      if (!c.on) continue; const X = c.tx * TS - cx, Y = c.ty * TS - cy; if (X < -16 || Y < -16 || X > VW || Y > VH) continue;
      if (F.ice > 0) { const k = F.ice < 1.5 ? F.ice / 1.5 : 1; if (bay(c.tx, c.ty) < k) g.drawImage(iceTile(), 0, 0, 32, 32, X, Y, 16, 16); }
      if (F.t - c.chT < 0.9) {   /* mép bọt khi tràn / rút: viền ô kề đất */
        g.fillStyle = (P8[7].css || (P8[7].css = `rgb(${P8[7][0]},${P8[7][1]},${P8[7][2]})`));
        const nb = [[0, -1, 0, 0, 16, 1], [0, 1, 0, 15, 16, 1], [-1, 0, 0, 0, 1, 16], [1, 0, 15, 0, 1, 16]];
        for (const [dx, dy, ox, oy, w, h] of nb) { if (on.has(c.i + dy * Wt + dx)) continue; for (let s = 0; s < Math.max(w, h); s += 1) { if (bay(c.tx * 16 + s, Math.floor(F.t * 10)) > 0.6) continue; g.fillRect(X + ox + (w > 1 ? s : 0), Y + oy + (h > 1 ? s : 0), 1, 1); } }
      }
    }
    if (F.zap > 0) {   /* điện lan khắp mặt ngập */
      const r = rng(F.seed + Math.floor(F.t * 15)), C = PAL.loi, L = F.cells.filter(c => c.on); if (L.length) for (let b = 0; b < 8; b++) { const c0 = L[Math.floor(r() * L.length)]; let X = c0.tx * TS + 8, Y = c0.ty * TS + 8, a = r() * 6.283;
        for (let s = 0; s < 40; s += 0.5) { a += (r() - 0.5) * 0.9; X += Math.cos(a) * 0.5; Y += Math.sin(a) * 0.4; if (!on.has(Math.floor(Y / TS) * Wt + Math.floor(X / TS))) break; g.fillStyle = s < 10 ? `rgb(${C[7]})` : `rgb(${C[6]})`; g.fillRect(Math.round(X * 2) / 2 - cx, Math.round(Y * 2) / 2 - cy, 0.5, 0.5); } } }
  }
}
function sink(g, o, byS, fn) {   /* vật trong vùng ngập: che chân 3 px + mép nước */
  const ctx = ST.ctx, d = ctx.O[o.type], cx = ST.cam ? ST.cam.cx : 0, line = Math.round(byS) - 3, x0 = o.x * TS - cx + (d && d.ox || 0), w = d ? d.w : 16;
  g.save(); g.beginPath(); g.rect(x0 - 40, line - 400, w + 80, 400); g.clip(); fn(); g.restore();
  const P8 = WPAL[1]; g.fillStyle = `rgb(${P8[7]})`; for (let i = 2; i < w - 2; i += 3) g.fillRect(Math.round(x0 + i), line + ((i >> 1) & 1 ? 0 : 0.5), 2, 0.5);
}

/* ---------- trúng ---------- */
function overlaps(P, x, y, R, k = 0.7) { return Math.hypot(P.cx - x, P.cy - y) < P.R * k + R * k; }
function addPatch(he, x, y, R, pw, o = {}) {
  const ctx = ST.ctx; if (!ctx || !ctx.S.map) return null;
  for (const P of ST.P) if (P.he === he && !P.dead && Math.hypot(P.cx - x, P.cy - y) < Math.max(6, Math.min(P.R, R) * 0.55)) { if (P.t > P.tin) P.t = Math.min(P.t, P.T * 0.3); P.pw = Math.max(P.pw, pw); if (he === 'nham' && P.burn < 1) P.burn = Math.max(P.burn, CFG.nham.burn * 0.6); return P; }   /* trùng chỗ cùng hệ: làm mới */
  const cf = CFG[he], P = { he, v: VAR[he] || 'a', cx: x, cy: y, cxL: Math.round(x), cyL: Math.round(y), R: Math.round(cl(R, 7, 44)), pw, t: 0, T: (o.life || cf.life) * (0.7 + 0.3 * Math.min(1.5, pw)), tin: o.tin || cf.tin, seed: (ST.seed = (ST.seed * 1103515245 + 12345) >>> 0) & 0xffff, q: -1, gen: o.gen || 0, burn: he === 'nham' && !o.noBurn ? cf.burn * (o.gen ? 0.75 : 1) : 0, spreadAt: 1.0, melt: he === 'suong' };
  try { buildData(P); } catch (e) { console.error('envfx build', e); return null; }
  if (!P.MUL && !P.SCR && !P.TOP) return null;
  if (ST.P.length >= MAXP) { let lo = null; for (const q of ST.P) if (!q.dead && (!lo || q.t / q.T > lo.t / lo.T)) lo = q; if (lo) { lo.t = Math.max(lo.t, lo.T * 0.9); ST.n.evict++; } if (ST.P.length >= MAXP + 6) ST.P.shift(); }   /* đầy: cái già nhất mờ nhanh */
  ST.P.push(P); ST.n.patch++; return P;
}
function douse(x, y, R, by) {   /* nước / băng dập lửa */
  let n = 0;
  for (const P of ST.P) if (P.he === 'nham' && P.burn > 0 && overlaps(P, x, y, R)) { P.burn = 0; n++; steam(P.cx, P.cy, P.R * 0.6); }
  for (const [o, st] of ST.objs) if (st.burn > 0) { const rc = objRect(ST.ctx, o); if (rc && Math.hypot(rc.cx - x, rc.by - 4 - y) < R + 10) { st.burn = 0; st.burnLook = false; n++; steam(rc.cx, rc.by - rc.h * 0.4, 8); } }
  if (n) { ST.n.douse += n; log({ ev: 'douse', by, n }); }
  return n;
}
function hitObjs(he, x, y, R, pw, gen) {
  const ctx = ST.ctx, m = ctx.S.map; let n = 0;
  for (const o of m.objects) {
    if (n >= (pw >= 1.2 ? 8 : 4)) break; const kd = objKind(ctx, o); if (!kd) continue; const rc = objRect(ctx, o); if (!rc) continue;
    if (Math.hypot(rc.cx - x, rc.by - 4 - y) > R + 6 + rc.fw * 4) continue;
    let st = ST.objs.get(o); const wasWet = st && (st.he === 'trieu' || st.he === 'suong') && st.t < st.T * 0.8;
    if (he === 'nham' && wasWet) { st.t = Math.max(st.t, st.T * 0.75); if (st.he === 'suong') { st.he = 'trieu'; st.t = 0; st.T = 8; st.tin = 0.5; ST.n.melt++; } steam(rc.cx, rc.by - rc.h * 0.4, 8); n++; continue; }   /* đang ướt / băng: không cháy, bốc hơi */
    if (kd === 'tree' && (he === 'phong' || he === 'chan') && ctx.treeShake) { try { ctx.treeShake(o); } catch (e) { } }
    if (he === 'phong') { n++; continue; }
    if (ST.objs.size >= MAXOBJ && !st) continue;
    const cf = CFG[he]; st = { he, v: VAR[he] || 'a', kind: kd, t: 0, T: cf.life * (kd === 'tree' ? 1 : 0.9), tin: cf.tin, q: 0, burn: 0, burnLook: false, cut: false };
    if (he === 'nham' && kd !== 'stone') { st.burn = cf.burn * (gen ? 0.7 : 1) * (kd === 'tree' ? 1.2 : 1); st.burnLook = true; st.cut = kd === 'plant' && pw >= 0.6 && /bush|grass|flower|fern|reed/i.test(o.type); }
    ST.objs.set(o, st); o.env105 = st; n++; ST.n.obj++;
  }
  return n;
}
function hit(x, y, r, he0, pw = 0.8, o = {}) {
  const ctx = ST.ctx; if (!ctx || !ctx.S || !ctx.S.map || !isFinite(x) || !isFinite(y)) return null; const t0 = performance.now();
  const he = heOf(he0); r = Math.max(6, r || 12); ST.n.hit++;
  const R = r > 52 ? 40 : r;   /* tuyệt chiêu vùng rộng: lõi + vòng mảng con */
  if (ST.FL.length) floodReact(he, x, y, R);   /* đánh vào vùng ngập: hơi nước / đóng băng / điện lan */
  if (he === 'trieu' || he === 'suong') douse(x, y, R, he);
  const WH = o.noWater ? null : waterHit(he, x, y, R, pw), onWater = !!(WH && wetK(x, y));   /* trúng mặt nước: tóe / gợn / theo hệ thay vết đất */
  let blocked = false;
  if (he === 'nham') {   /* Hoả gặp Ướt / Băng → dập (không sém), hơi nước; băng tan thành ướt */
    for (const P of ST.P) if ((P.he === 'trieu' || P.he === 'suong') && !P.dead && overlaps(P, x, y, R, 0.6) && (P.t < P.tin || visOf(P.t, P.T, P.tin) > 0.3)) {
      blocked = true; steam(x, y, R * 0.7);
      if (P.he === 'suong') { P.melt = false; P.t = Math.max(P.t, P.T * 0.85); addPatch('trieu', P.cx, P.cy, P.R, 0.6, { life: 9, tin: 0.5 }); ST.n.melt++; }
      else P.t = Math.max(P.t, P.T * 0.6);
    }
    if (blocked) { ST.n.douse++; log({ ev: 'blocked', x: Math.round(x), y: Math.round(y) }); }
  }
  if (he === 'suong') for (const P of ST.P) if (P.he === 'trieu' && !P.dead && overlaps(P, x, y, R)) P.t = Math.max(P.t, P.T * 0.8);   /* băng lên chỗ ướt: thành băng (vết ướt nhường chỗ) */
  const FLd = o.flood ? flood(x, y, Math.max(r, 64), 24, o.flood) : null;   /* ngập CHỈ khi chiêu nằm trong FLOOD_MV (anh chốt 02/11) — hitF / floodMv quyết định */
  if (!blocked && !onWater && !FLd && !o.noPatch) {
    addPatch(he, x, y, R, pw, { noBurn: o.noBurn });
    if (r > 52) { const k = Math.min(4, Math.round(r / 22)); for (let i = 0; i < k; i++) { const a = i / k * 6.283 + 0.4, d = r * 0.62; ST.q.push({ at: 0.07 * (i + 1), he, x: x + Math.cos(a) * d, y: y + Math.sin(a) * d * 0.8, R: r * 0.4, pw: pw * 0.8, o: { gen: 1, noBurn: o.noBurn } }); } }   /* vòng ngoài dựng dần từng khung: lan ra + không giật khung */
    burst(he, x, y, R, pw);
  }
  if (!o.noObj) hitObjs(he, x, y, r, pw, 0);
  log({ ev: 'hit', he, x: Math.round(x), y: Math.round(y), r: Math.round(r), pw: +pw.toFixed(2), blocked });
  const ms = performance.now() - t0; ST.perf.hitMs = Math.max(ST.perf.hitMs || 0, ms);
  return { he, blocked };
}
/* ANH CHỐT (02/11): ngập chỉ khi Chấn Thú HỆ NƯỚC (hệ chính Triều) dùng chiêu tạo LƯỢNG NƯỚC LỚN — danh sách id chiêu (plan-105 §Anh chốt) */
const FLOOD_MV = { trieu_dang: 'Thuỷ Triều Dâng', coc_lu: 'Cốc Lũ Vô Đáy (Oa Lì)', vu_mon: 'Vượt Vũ Môn (Moyaki)' };
function floodMv(mvId, heMain, x, y, r = 80, dur = 24, src) { if (!FLOOD_MV[mvId] || heOf(heMain) !== 'trieu') return null; return flood(x, y, Math.max(r, 64), dur, src || ('mv:' + mvId)); }
function hitF(f, x, y, r, pw, o = {}) {   /* từ linhduel.aoe: hệ của chiêu đang ra (chiêu chung → hệ loài) */
  const mv0 = f && f.act && f.act.mv; if (mv0 && FLOOD_MV[mv0.id] && f.types && f.types[0] === 'trieu' && !o.noObj) { if (floodMv(mv0.id, 'trieu', x, y, Math.max(r, 70), 24, 'ld:' + mv0.id)) o = { ...o, flood105: 1 }; }
  let he = o.he || (o.fire ? 'nham' : null);
  if (!he && f) { const mv = f.act && f.act.mv; he = (mv && !mv.common && mv.type) || f._mvT105 || (f.types && f.types[0]) || null; }
  return hit(x, y, r, he || 'chan', pw, { noObj: o.noObj, noPatch: !!o.flood105 });
}

/* ---------- cập nhật ---------- */
function update(dt) {
  const t0 = performance.now(); updParts(dt); if (ST.W.length) updWater(dt); if (ST.FL.length) updFlood(dt);
  if (ST.q.length) { for (const e of ST.q) e.at -= dt; const e = ST.q[0]; if (e.at <= 0) { ST.q.shift(); addPatch(e.he, e.x, e.y, e.R, e.pw, e.o); burst(e.he, e.x, e.y, e.R * 0.6, e.pw, 2); } }
  for (const P of ST.P) {
    P.t += dt; if (P.t >= P.T) { P.dead = true; continue; }
    if (P.burn > 0) {   /* đang cháy: lửa liếm + tàn + khói, rồi tắt; lan tối đa 2 mảng con (1 đời) */
      P.burn -= dt; const k = cl(P.burn / CFG.nham.burn), rate = (P.v === 'b' ? 0.6 : 1.4) * P.R * k;
      P.acc = (P.acc || 0) + rate * dt;
      while (P.acc > 1) { P.acc -= 1; const a = rr(0, 6.283), d = Math.sqrt(R0()) * P.R * 0.75, px = P.cx + Math.cos(a) * d, py = P.cy + Math.sin(a) * d * 0.8;
        if (R0() < 0.72) part({ kind: 'flame', x: px, y: py, vz: rr(12, 26), vx: rr(-3, 3), life: rr(0.3, 0.6), drag: 1 }); else if (R0() < 0.6) part({ kind: 'ember', x: px, y: py, z: 2, vz: rr(18, 32), vx: rr(-6, 6), life: rr(0.5, 0.9), drag: 0.8, s: 0.5 }); else part({ x: px, y: py, z: 4, vz: rr(8, 14), vx: rr(-3, 3), life: rr(0.8, 1.3), drag: 1, c: [74, 68, 66], s: 1 }); }
      if (!P.gen && !P.spread && P.t > P.spreadAt) { P.spread = true; spread(P); }
      if (P.burn <= 0 && P.coalI) P.q = -1;   /* than hồng tắt → dựng lại */
    }
    const q = patchQ(P); if (q !== P.q) { P.q = q; P.dirty = true; }
    if (P.melt && P.t > P.T * 0.85) { P.melt = false; addPatch('trieu', P.cx, P.cy, P.R, 0.5, { life: 8, tin: 1.5 }); ST.n.melt++; }   /* băng tan → ướt */
  }
  if (ST.P.some(P => P.dead)) ST.P = ST.P.filter(P => !P.dead);
  for (const [o, st] of ST.objs) {
    st.t += dt; if (st.t >= st.T || !ST.ctx.S.map.objects.includes(o) || o.ruined) { delete o.env105; ST.objs.delete(o); continue; }
    if (st.burn > 0) { st.burn -= dt; const rc = objRect(ST.ctx, o); if (rc) { st.acc = (st.acc || 0) + dt * (st.kind === 'tree' ? 22 : 12) * cl(st.burn / 2);
        while (st.acc > 1) { st.acc -= 1; const px = rc.x + rc.w * rr(0.2, 0.8), py = rc.y + rc.h * (st.cut ? rr(0.6, 0.9) : rr(0.15, 0.6)); const p = part({ kind: R0() < 0.75 ? 'flame' : 'ember', x: px, y: rc.by + 0.6, z: rc.by - py, vz: rr(10, 22), vx: rr(-3, 3), life: rr(0.3, 0.6), drag: 1 }); if (p) p.dr.y = rc.by + 0.6; } }
      if (st.burn <= 0) { st.burnLook = false; } }
    const v = visOf(st.t, st.T, st.tin); st.q = Math.ceil(v * 4 - 1e-6);
  }
  ST.perf.upd = performance.now() - t0;
}
function spread(P) {   /* lửa lan sang tối đa 2 chỗ cỏ kề (không vào chỗ ướt / băng / nước / đất trơ) */
  const ctx = ST.ctx; let made = 0;
  for (let k = 0; k < 6 && made < 2; k++) {
    const a = rr(0, 6.283), d = P.R * rr(0.8, 1.05), x = P.cx + Math.cos(a) * d, y = P.cy + Math.sin(a) * d * 0.8, cls = tileCls(ctx, Math.floor(x / TS), Math.floor(y / TS));
    if (cls !== 1 && cls !== 4) continue;
    if (ST.P.some(q => (q.he === 'trieu' || q.he === 'suong') && overlaps(q, x, y, P.R * 0.6))) continue;
    if (ST.P.some(q => q.he === 'nham' && q !== P && Math.hypot(q.cx - x, q.cy - y) < P.R * 0.6)) continue;
    const c = addPatch('nham', x, y, P.R * 0.6, P.pw * 0.7, { gen: 1 }); if (c) { made++; ST.n.spread++; hitObjs('nham', x, y, P.R * 0.5, 0.5, 1); }
  }
}

/* ---------- vẽ ---------- */
function ensureCanvas(P) {
  if (!P.dirty && P.cMul !== undefined) return;
  if (ST.budget <= 0 && P.cMul !== undefined) return; ST.budget--;   /* tối đa 3 mảng dựng lại / khung (mảng chưa tới lượt vẽ bản cũ) */
  P.dirty = false; const q = P.q;
  P.cMul = q > 0 ? stageCanvas(P, P.MUL, q, '_mul') : null; P.cScr = q > 0 ? stageCanvas(P, P.SCR, q, '_scr') : null;
  if (P.TOP && P.coalI && P.burn <= 0 && !P.coalOff) { P.coalOff = true; for (const i of P.coalI) { P.TOP[i * 4] = PAL.nham[1][0]; P.TOP[i * 4 + 1] = PAL.nham[1][1]; P.TOP[i * 4 + 2] = PAL.nham[1][2]; } }
  P.cTop = q > 0 ? stageCanvas(P, P.TOP, q, '_top') : null;
}
function drawGround(g, ctx, cx, cy) {
  if (ST.FL.length) { ST.cam = { cx, cy }; try { drawFlood(g, cx, cy); } catch (e) { console.error('envfx flood', e); } }
  if (ST.W.length) { ST.cam = { cx, cy }; try { drawWater(g, cx, cy); } catch (e) { console.error('envfx water', e); } }
  if (!ST.P.length) return; const t0 = performance.now(), VW = ctx.VW || 400, VH = ctx.VH || 300; ST.cam = { cx, cy };
  ST.budget = 3; const vis = []; for (const P of ST.P) { const X = P.x0 - cx, Y = P.y0 - cy, w = P.W / RES, h = P.H / RES; if (X > VW || Y > VH || X + w < 0 || Y + h < 0 || P.q <= 0) continue; ensureCanvas(P); if (P.cMul !== undefined) vis.push(P); }
  if (!vis.length) return; const X = P => Math.round((P.x0 - cx) * RES) / RES, Y = P => Math.round((P.y0 - cy) * RES) / RES;
  g.save(); g.imageSmoothingEnabled = false;
  g.globalCompositeOperation = 'multiply'; for (const P of vis) if (P.cMul) g.drawImage(P.cMul, 0, 0, P.W, P.H, X(P), Y(P), P.W / RES, P.H / RES);
  g.globalCompositeOperation = 'screen'; for (const P of vis) if (P.cScr) g.drawImage(P.cScr, 0, 0, P.W, P.H, X(P), Y(P), P.W / RES, P.H / RES);
  g.globalCompositeOperation = 'source-over'; for (const P of vis) if (P.cTop) g.drawImage(P.cTop, 0, 0, P.W, P.H, X(P), Y(P), P.W / RES, P.H / RES);
  g.restore();
  const ms = performance.now() - t0; ST.perf.ms += ms; ST.perf.n++; ST.perf.max = Math.max(ST.perf.max, ms);
}
const flMul = he => { he = heOf(he); return he === 'trieu' ? 1.25 : he === 'nham' ? 0.75 : 1; };
function monWrap(ctx) {   /* quái thường dưới nước bị đánh (cá, lươn, cua…) → tóe nước ở chỗ trúng (bọc ctx.monsters.damage 1 lần / vùng) */
  const M = ctx.monsters; if (!M || !M.damage || M.__e105w) return; M.__e105w = true; const f0 = M.damage;   /* cờ trên đối tượng (không trên hàm): hệ khác bọc lại sau thì không bọc chồng mãi */
  const w = function (mo) { const hn0 = globalThis.__env105he || null; if (hn0 && mo && typeof arguments[1] === 'number' && inFlood(mo.x, mo.y)) { const k = flMul(hn0); if (k !== 1) { arguments[1] = Math.max(1, Math.round(arguments[1] * k)); ST.n.flMul = (ST.n.flMul || 0) + 1; } }   /* trong vùng ngập: Triều ×1,25, Hoả ×0,75 */
    const r = f0.apply(this, arguments);
    try { const hn = globalThis.__env105he || null;   /* gợi ý hệ của đòn (squad104 / elyz95 / farm106 đặt quanh lời gọi — bản vá post-p105w.py) */
      if (mo && !(mo.__e105T > performance.now() - 300)) { if (wetK(mo.x, mo.y)) { mo.__e105T = performance.now(); waterHit(hn ? heOf(hn) : 'chung', mo.x, mo.y, 10, 0.5, 'mon'); } else if (hn) { mo.__e105T = performance.now(); hit(mo.x, mo.y + 2, 10, hn, 0.5, { noWater: true }); } } } catch (e) { } return r; };
  w.__e105 = 1; M.damage = w;
}
const EXT = [], EXS = new Set();
function extraEnts(ctx) {   /* Chấn Thú đang ở ngoài map cho water.js (gợn mỗi bước, rẽ nước, tóe khi vào nước / đáp) */
  EXT.length = 0; EXS.clear(); const add = f => { if (f && f.x != null && !f.dead && !f.hide && !EXS.has(f)) { EXS.add(f); EXT.push(f); } }, W0 = typeof window !== 'undefined' ? window : {};
  try { if (W0.__c79 && W0.__c79.f) add(W0.__c79.f()); } catch (e) { }
  try { if (W0.__sq && W0.__sq.fighters) for (const u of W0.__sq.fighters()) add(u.f); } catch (e) { }
  try { if (ctx.elyz95 && ctx.elyz95.E) add(ctx.elyz95.E()); } catch (e) { }
  try { if (ctx.duel && ctx.duel.active && ctx.duel.active() && W0.__duel && W0.__duel.fighters) for (const f of W0.__duel.fighters()) add(f); } catch (e) { }
  return EXT;
}
function clear() { for (const F of ST.FL) floodEnd(F, false); ST.FL = []; ST.FLI.clear(); for (const [o] of ST.objs) delete o.env105; ST.objs.clear(); ST.P = []; ST.q = []; ST.W = []; ST.parts = []; }
function setVar(o) { if (o && o.var) for (const k in o.var) if (PAL[k]) VAR[k] = o.var[k]; return { ...VAR }; }
try { const q = typeof location !== 'undefined' && new URLSearchParams(location.search).get('ev105'); if (q) for (const kv of q.split(',')) { const [k, v] = kv.split(':'); if (PAL[k] && /^[abc]$/.test(v)) VAR[k] = v; } } catch (e) { }

const API = {
  splash: (x, y, pw = 0.6, he = null, r = 12) => waterHit(he ? heOf(he) : 'chung', x, y, r, pw, 'api'),   /* quái / trùm dưới nước bị đánh (Bạch Kình p103/p106…) gọi thẳng */
  spotG: () => {   /* bãi cỏ rộng (7×7 ô cỏ / hoa không cứng) gần người chơi, ưu tiên có cây / bụi quanh — bài test ngập */
    const ctx = ST.ctx, m = ctx.S.map, p = ctx.S.player, px = Math.floor(p.x / TS), py = Math.floor(p.y / TS); let best = null, bd = 1e9;
    for (let ty = 6; ty < m.h - 6; ty++) for (let tx = 6; tx < m.w - 6; tx++) { const c0 = tileCls(ctx, tx, ty); if (c0 !== 1 && c0 !== 4) continue; let ok = true;
      for (let j = -3; j <= 3 && ok; j++) for (let i = -3; i <= 3 && ok; i++) { const c = tileCls(ctx, tx + i, ty + j); if ((c !== 1 && c !== 4) || m.solid[(ty + j) * m.w + tx + i]) ok = false; } if (!ok) continue;
      const pl = m.objects.filter(o => objKind(ctx, o) && Math.abs(o.x - tx) <= 5 && Math.abs(o.y - ty) <= 4).length, d = Math.hypot(tx - px, ty - py) - pl * 6; if (d < bd) { bd = d; best = { x: tx * TS + 8, y: ty * TS + 8, pl }; } }
    return best;
  },
  spotW: () => {   /* chỗ nước rộng gần người chơi (bài test) */
    const ctx = ST.ctx, m = ctx.S.map, p = ctx.S.player; let best = null, bd = 1e9;
    for (let ty = 2; ty < m.h - 2; ty++) for (let tx = 2; tx < m.w - 2; tx++) { if (tileCls(ctx, tx, ty) !== 3) continue; const x = tx * TS + 8, y = ty * TS + 8; let n = 0; for (let j = -2; j <= 2; j++) for (let i = -2; i <= 2; i++) if (wetK(x + i * 8, y + j * 6)) n++; if (n < 23) continue; const d = Math.hypot(x - p.x, y - p.y); if (d < bd) { bd = d; best = { x, y, n }; } }
    return best;
  },
  flood, floodMv, FLOOD_MV, inFlood: (x, y) => !!inFlood(x, y), flMul: (he, x, y) => (inFlood(x, y) ? flMul(he) : 1), sink,
  hit, hitF, img: (o, im) => { const st = o.env105; return st && st.q > 0 && im ? tinted(o, im, st) : im; }, clear, set: setVar, HES, PALH,
  state: () => ({ P: ST.P.map(P => ({ he: P.he, v: P.v, x: Math.round(P.cx), y: Math.round(P.cy), R: P.R, t: +P.t.toFixed(1), T: +P.T.toFixed(1), q: P.q, burn: +Math.max(0, P.burn).toFixed(1), gen: P.gen })), objs: [...ST.objs].map(([o, s]) => ({ type: o.type, x: o.x, y: o.y, he: s.he, q: s.q, burn: +Math.max(0, s.burn).toFixed(1), cut: s.cut, t: +s.t.toFixed(1) })), parts: ST.parts.length, FL: ST.FL.map(F => ({ x: Math.round(F.x), y: Math.round(F.y), R: F.R, n: F.cells.length, on: F.cells.filter(c => c.on).length, t: +F.t.toFixed(1), T: F.T, ice: +Math.max(0, F.ice).toFixed(1), zapN: F.zapN || 0, objs: F.objs.length, src: F.src })), W: ST.W.map(E => ({ he: E.he, x: Math.round(E.x), y: Math.round(E.y), k: E.k, t: +E.t.toFixed(1), T: E.T, floes: E.floes.length, leaves: E.leaves.length })), n: { ...ST.n }, var: { ...VAR } }),
  perf: () => ({ drawAvg: ST.perf.n ? +(ST.perf.ms / ST.perf.n).toFixed(3) : 0, drawMax: +ST.perf.max.toFixed(2), upd: +(ST.perf.upd || 0).toFixed(3), hitMax: +(ST.perf.hitMs || 0).toFixed(2), n: ST.perf.n }),
  spot: (i = 0) => {   /* chỗ thử: cây lẻ có ô hoa + bụi gần (bài test / preset) — trả px thế giới */
    const ctx = ST.ctx, m = ctx.S.map, out = [];
    for (const o of m.objects) { if (o.type !== 'tree' || o.forest) continue; let fl = 0, sx = 0, sy = 0;
      for (let y = o.y - 4; y <= o.y + 4; y++) for (let x = o.x - 5; x <= o.x + 5; x++) if (tileCls(ctx, x, y) === 4) { fl++; sx += x; sy += y; }
      const bush = m.objects.filter(b => /bush/.test(b.type) && Math.abs(b.x - o.x) <= 6 && Math.abs(b.y - o.y) <= 5).length;
      if (fl >= 3) out.push({ tree: { x: o.x, y: o.y }, fx: (sx / fl) * TS + 8, fy: (sy / fl) * TS + 8, tx: o.x * TS + 8, ty: (o.y + 1) * TS - 4, fl, bush, sc: fl + bush * 4 }); }
    out.sort((a, b) => b.sc - a.sc); return out[i] || out[0] || null;
  },
  perfReset: () => { ST.perf = { ms: 0, n: 0, max: 0 }; }, log: () => ST.log.slice(), ff: (s) => { for (let i = 0; i < s * 20; i++) update(0.05); },
};
export const envfx105 = {
  id: 'envfx105', always: true,
  onZoneEnter(ctx) { ST.ctx = ctx; clear(); ctx.envfx = API; ctx.waterExtra = () => extraEnts(ctx); if (typeof window !== 'undefined') window.__envfx = API; },
  onZoneLeave() { clear(); },
  update(dt, ctx) { ST.ctx = ctx; if (!ctx.envfx) ctx.envfx = API; monWrap(ctx); if (!ST.P.length && !ST.objs.size && !ST.parts.length && !ST.q.length && !ST.W.length && !ST.FL.length) return; update(Math.min(dt, 0.05)); },
  drawGround(g, ctx, cx, cy) { ST.ctx = ctx; drawGround(g, ctx, cx, cy); },
  drawables(ctx, cx, cy) { if (!ST.parts.length) return []; ST.cam = { cx, cy }; const out = []; for (const p of ST.parts) out.push(p.dr); return out; },
};
