/* fx97.js — p97 (02/11/2026): VFX VẼ CODE HOÀN TOÀN cho Chấn Thú ếch OA LÌ (Croaksmug, hệ Triều) — plan-93.
   Bọt Ộp · Bụng Phệ Đè · Kính Đen Lì Đòn · Cốc Lũ Vô Đáy (tuyệt chiêu) · Lưỡi Kéo Về (chiêu riêng) · Vòng Khói Tẩu (Lão Oa Đại Ca).
   Skill vfx-code: điểm ảnh 2× (RES 2), nước = bảng 8 bậc đo từ Ô NƯỚC GAME (PAL_SRC.trieu), mờ bằng dither Bayer 4×4 (không alpha), lớp nền (drawGround) + drawables theo y chân,
   hạt có trọng lực / lực cản / nảy; rung / khựng / chớp CHỈ ở khung sự kiện; mọi thứ có hạn rồi tắt (không lặp quanh thú).
   Đồ vật trong chiêu (kính đen, cốc) = ảnh PixelLab (assets/px/linhduel/oali_items.png), vẽ 1:1 (ảnh gói 2× → ½), không phóng.
   Luật lớp vẽ 16/10: lưỡi / đạn / sóng sát người ra chiêu khoá y = y người ra chiêu ∓ 0,5 (bắn lên → sau lưng, bắn xuống → trước mặt).
   Không phụ thuộc linhduel: bên gọi (chieu97.js) giữ vật lý + va chạm, truyền đối tượng sống cho module này vẽ; hooks rung / khựng đặt bằng setHooks. */
import { PAL_SRC } from './pxfx.js';

const W = PAL_SRC.trieu;   /* #eef9ff #b4e1fd #80c9fc #70bcfc #569bf3 #4482dd #3571cd #1d3f7a */
const DIRT = ['#e9cfa0', '#c9a274', '#a07a52', '#7c5a3c', '#5a3f2a', '#3e2a1c', '#2a1a12', '#160c08'];
const TONG = ['#ffd0d8', '#f497a8', '#d8657d', '#a8405a', '#6e2238'];   /* lưỡi hồng: sáng → tối → viền */
const SMOKE = ['#f4f1ea', '#d9d4ca', '#b3ada3', '#8a847c', '#5f5a55'];
const GOLD = ['#ffffff', '#fff6c8', '#ffe27a'];
const S = { parts: [], objs: [], decals: [], n: {} };
let H = { quake: () => { }, stop: () => { } }, IMG = () => null, META = null;
export function setHooks(h) { H = { ...H, ...(h || {}) }; }
export function setImgs(getImg, meta) { IMG = getImg || IMG; META = meta || META; }
const cnt = k => { S.n[k] = (S.n[k] || 0) + 1; };
export function clear() { S.parts = []; S.objs = []; S.decals = []; }
export function stats() { return { n: { ...S.n }, parts: S.parts.length, objs: S.objs.map(o => o.k), decals: S.decals.length }; }
let SEED = 7; const rnd = () => { SEED = (SEED * 16807) % 2147483647; return (SEED - 1) / 2147483646; };
export function seed(s) { SEED = (s | 0) % 2147483646 + 1; }
const TAU = Math.PI * 2;
const BAY = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5], bay = (x, y) => (BAY[((y & 3) << 2) | (x & 3)] + 0.5) / 16;
function dot(g, X, Y, c) { g.fillStyle = c; g.fillRect(X / 2, Y / 2, 0.5, 0.5); }
function disc(g, X, Y, r, c, a = 1) { if (r <= 0) return; g.fillStyle = c; for (let y = Math.floor(Y - r); y <= Math.ceil(Y + r); y++) for (let x = Math.floor(X - r); x <= Math.ceil(X + r); x++) { const dx = x + 0.5 - X, dy = y + 0.5 - Y; if (dx * dx + dy * dy <= r * r && (a >= 1 || a > bay(x, y))) g.fillRect(x / 2, y / 2, 0.5, 0.5); } }
function oval(g, X, Y, rx, ry, c, a = 1) { if (rx <= 0 || ry <= 0) return; g.fillStyle = c; for (let y = Math.floor(Y - ry); y <= Math.ceil(Y + ry); y++) for (let x = Math.floor(X - rx); x <= Math.ceil(X + rx); x++) { const dx = (x + 0.5 - X) / rx, dy = (y + 0.5 - Y) / ry; if (dx * dx + dy * dy <= 1 && (a >= 1 || a > bay(x, y))) g.fillRect(x / 2, y / 2, 0.5, 0.5); } }
function ring(g, X, Y, rx, ry, th, c, a = 1) { if (rx <= 0) return; g.fillStyle = c; const n = Math.max(20, Math.round(rx * 7)); for (let q = 0; q < th; q++) for (let i = 0; i < n; i++) { const t = i / n * TAU, px = Math.round(X + Math.cos(t) * (rx - q)), py = Math.round(Y + Math.sin(t) * (ry - q * ry / rx)); if (a < 1 && a <= bay(px, py)) continue; g.fillRect(px / 2, py / 2, 0.5, 0.5); } }
function line(g, X0, Y0, X1, Y1, c, w = 1) { const n = Math.max(1, Math.round(Math.max(Math.abs(X1 - X0), Math.abs(Y1 - Y0)))); g.fillStyle = c; for (let i = 0; i <= n; i++) { const x = Math.round(X0 + (X1 - X0) * i / n), y = Math.round(Y0 + (Y1 - Y0) * i / n); g.fillRect(x / 2, y / 2, w / 2, w / 2); } }
const SX = (x, cx) => Math.round((x - cx) * 2), SY = (y, cy) => Math.round((y - cy) * 2);

/* ---------- hạt ---------- */
function part(o) { const p = Object.assign({ x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, g: 0, drag: 0, t: 0, T: 0.4, k: 'drop', ky: null, r: 1.5, bounce: 0 }, o); if (p.ky == null) p.ky = p.y + 0.3; S.parts.push(p); if (S.parts.length > 900) S.parts.shift(); return p; }
function drops(x, y, z, n, sp = 60, up = 60, T = 0.5, ang = null, spread = TAU, ky = null) {
  for (let i = 0; i < n; i++) { const a = ang == null ? rnd() * TAU : ang + (rnd() - 0.5) * spread, v = sp * (0.35 + rnd() * 0.9); part({ k: 'drop', x, y, z, vx: Math.cos(a) * v, vy: Math.sin(a) * v * 0.5, vz: up * (0.3 + rnd()), g: 320, drag: 0.6, T: T * (0.7 + rnd() * 0.6), splat: rnd() < 0.35, ky: ky ?? y + 0.4 }); }
}
function dust(x, y, n, dir = 0, sp = 40) { for (let i = 0; i < n; i++) { const a = dir ? (dir > 0 ? 0 : Math.PI) + (rnd() - 0.5) * 1.6 : rnd() * TAU, v = sp * (0.4 + rnd()); part({ k: 'dust', x: x + (rnd() - 0.5) * 6, y: y + (rnd() - 0.5) * 2, z: rnd() * 2, vx: Math.cos(a) * v, vy: Math.sin(a) * v * 0.35, vz: 8 + rnd() * 14, g: 10, drag: 3.2, r: 1.2 + rnd() * 1.4, T: 0.35 + rnd() * 0.3, ky: y - 0.6 }); } }
function glint(x, y, z, n = 5, cols = GOLD, ky = null) { for (let i = 0; i < n; i++) { const a = rnd() * TAU; part({ k: 'glint', x: x + Math.cos(a) * 4, y: y + Math.sin(a) * 1.5, z: z + rnd() * 6, vx: Math.cos(a) * 18, vz: 12 + rnd() * 18, g: -4, drag: 2, T: 0.3 + rnd() * 0.25, cols, ky: ky ?? y + 0.6 }); } }
function updParts(dt) {
  for (const p of S.parts) { p.t += dt; const dr = Math.max(0, 1 - p.drag * dt); p.vx *= dr; p.vy *= dr; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; p.vz -= p.g * dt;
    if (p.z < 0) { p.z = 0; if (p.k === 'drop') { if (p.splat) decal({ k: 'spl', x: p.x, y: p.y, T: 0.6, r: 1.6 }); p.t = p.T; } else if (p.bounce && Math.abs(p.vz) > 20) { p.vz = -p.vz * p.bounce; } else { p.vz = 0; p.vx *= 0.7; p.vy *= 0.7; } } }
  S.parts = S.parts.filter(p => p.t < p.T);
}
function drawPart(g, p, cx, cy) {
  const k = p.t / p.T, X = SX(p.x, cx), Y = SY(p.y - p.z, cy);
  if (p.k === 'drop') { if (k > 0.75 && (k - 0.75) * 4 > bay(X, Y)) return; dot(g, X, Y, W[0]); dot(g, X, Y + 1, W[2]); if (p.vz < -30) dot(g, X, Y + 2, W[4]); return; }
  if (p.k === 'dust') { const a = 1 - k, r = p.r * 2 * (1 + k * 0.8); disc(g, X, Y, r, DIRT[1], a); disc(g, X - 1, Y - 1, r * 0.55, DIRT[0], a); return; }
  if (p.k === 'glint') { if (1 - k * k < bay(X, Y)) return; const C = p.cols; dot(g, X, Y, C[0]); if (k < 0.5) { dot(g, X - 1, Y, C[1]); dot(g, X + 1, Y, C[1]); dot(g, X, Y - 1, C[1]); dot(g, X, Y + 1, C[1]); } return; }
  if (p.k === 'foam') { const a = 1 - k * k, r = p.r * 2; disc(g, X, Y, r + 1, W[2], a); disc(g, X - r * 0.25, Y - r * 0.25, r * 0.7, W[0], a); return; }
  if (p.k === 'mini') { const r = Math.max(1.5, p.r * 2); ring(g, X, Y, r, r, 1, k < 0.5 ? W[1] : W[3], 1 - k * 0.6); dot(g, X - 1, Y - 1, W[0]); return; }
}

/* ---------- vết trên nền ---------- */
function decal(o) { S.decals.push(Object.assign({ t: 0, T: 2 }, o)); if (S.decals.length > 80) S.decals.shift(); }
function drawDecal(g, d, cx, cy) {
  const k = d.t / d.T, X = SX(d.x, cx), Y = SY(d.y, cy), a = k < 0.6 ? 1 : 1 - (k - 0.6) / 0.4;
  if (d.k === 'spl') { oval(g, X, Y, d.r * 2, d.r, W[3], a * 0.9); return; }
  if (d.k === 'puddle') { const r = d.r * 2 * (d.t < 0.15 ? d.t / 0.15 : 1); oval(g, X, Y, r, r * 0.45, W[5], a); oval(g, X - r * 0.15, Y - r * 0.06, r * 0.82, r * 0.34, W[3], a); oval(g, X - r * 0.35, Y - r * 0.12, r * 0.3, r * 0.1, W[1], a); return; }
  if (d.k === 'skid') { const L = d.L * 2, ux = d.ux, uy = d.uy * 0.5; for (let i = 0; i < L; i++) { const px = Math.round(X - ux * i), py = Math.round(Y - uy * i), aa = a * (1 - i / L); dot(g, px, py - 1, DIRT[3]); if (aa > bay(px, py + 1)) dot(g, px, py + 1, DIRT[4]); } return; }
  if (d.k === 'crater') { const r = d.r * 2; oval(g, X, Y, r, r * 0.42, DIRT[4], a); oval(g, X, Y - 1, r * 0.75, r * 0.3, DIRT[3], a); ring(g, X, Y, r + 1, (r + 1) * 0.42, 1, DIRT[1], a); return; }
}

/* ---------- đối tượng sống (chieu97 cập nhật toạ độ, module này chỉ vẽ) ---------- */
export function track(o) { o.t = o.t || 0; o.alive = o.alive !== false; S.objs.push(o); cnt('obj_' + o.k); return o; }
function itemImg(name) { const im = IMG('linhduel/oali_items.png'); const r = META && META[name]; return im && r ? { im, r } : null; }
function blitItem(g, name, x, y, cx, cy, flip = false, ax = 0.5, ay = 1) {   /* x, y = điểm neo (giữa, đáy) toạ độ thế giới; ảnh gói 2× → vẽ ½ */
  const it = itemImg(name); if (!it) return false; const [sx, sy, sw, sh] = it.r, w = sw / 2, h = sh / 2, X = Math.round((x - cx) * 2) / 2, Y = Math.round((y - cy) * 2) / 2;
  if (flip) { g.save(); g.translate(X, Y); g.scale(-1, 1); g.drawImage(it.im, sx, sy, sw, sh, -w * ax, -h * ay, w, h); g.restore(); }
  else g.drawImage(it.im, sx, sy, sw, sh, X - w * ax, Y - h * ay, w, h);
  return true;
}
function drawObj(g, o, cx, cy) {
  if (o.k === 'bub') {   /* bong bóng nước: tròn, viền sáng trên-trái, lõi trong suốt (dither), chấm bóng loáng */
    const r = Math.round(o.r * 2 * (1 + Math.sin(o.t * 22) * 0.08)), ry = Math.round(o.r * 2 * (1 - Math.sin(o.t * 22) * 0.08)), X = SX(o.x, cx), Y = SY(o.y - o.z, cy);
    oval(g, X, Y, r, ry, W[3], 0.28); ring(g, X, Y, r, ry, 1, W[4]);
    for (let i = 0; i < 14; i++) { const q = Math.PI * 1.05 + i / 14 * Math.PI * 0.8; dot(g, Math.round(X + Math.cos(q) * (r - 1)), Math.round(Y + Math.sin(q) * (ry - 1)), W[1]); }
    dot(g, X - Math.round(r * 0.4), Y - Math.round(ry * 0.45), W[0]); dot(g, X - Math.round(r * 0.4) + 1, Y - Math.round(ry * 0.45), W[0]); dot(g, X - Math.round(r * 0.4), Y - Math.round(ry * 0.45) + 1, W[0]);
    if (o.charge != null && o.charge < 1) { /* đang phồng ở miệng: chỉ viền mờ */ }
    return;
  }
  if (o.k === 'smoke') {   /* vòng khói tẩu: vòng dày xám trắng, xoay nhẹ, to dần */
    const k = o.t / (o.T || 1.2), r = Math.round((o.r + k * 3) * 2), X = SX(o.x, cx), Y = SY(o.y - o.z, cy), a = k > 0.8 ? 1 - (k - 0.8) * 5 : 1;
    ring(g, X, Y, r, r * 0.55, 2, SMOKE[2], a); ring(g, X, Y - 1, r - 1, (r - 1) * 0.55, 1, SMOKE[0], a); dot(g, X - r + 1, Y, SMOKE[3]); return;
  }
  if (o.k === 'tongue') {   /* lưỡi: thân thon (gốc 2 px → 3 px ở đầu), đầu lưỡi tròn dẫn, chớp ở gốc khi phóng */
    const X0 = SX(o.x0, cx), Y0 = SY(o.y0 - o.z0, cy), X1 = SX(o.x1, cx), Y1 = SY(o.y1 - o.z1, cy), L = Math.hypot(X1 - X0, Y1 - Y0), n = Math.max(1, Math.round(L));
    for (let i = 0; i <= n; i++) { const u = i / n, x = Math.round(X0 + (X1 - X0) * u), y = Math.round(Y0 + (Y1 - Y0) * u + Math.sin(u * Math.PI) * (o.sag || 0) * 2), w = u < 0.12 ? 2 : 3;
      dot(g, x, y - 1, TONG[4]); dot(g, x, y + w, TONG[4]); for (let j = 0; j < w; j++) dot(g, x, y + j, j === 0 ? TONG[1] : j === w - 1 ? TONG[3] : TONG[2]); }
    disc(g, X1, Y1 + 1, 4.6, TONG[4]); disc(g, X1, Y1 + 1, 3.6, TONG[2]); disc(g, X1 - 0.6, Y1 - 0.4, 1.6, TONG[1]); dot(g, X1 - 1, Y1 - 1, TONG[0]);
    if (o.flash > 0) { disc(g, X0, Y0, 3, '#ffffff'); } if (o.stick > 0) { for (let i = 0; i < 6; i++) { const q = i / 6 * TAU + 0.3, d = 4 + (1 - o.stick) * 6; dot(g, Math.round(X1 + Math.cos(q) * d), Math.round(Y1 + Math.sin(q) * d * 0.7), i % 2 ? TONG[0] : '#ffffff'); } }
    return;
  }
  if (o.k === 'mug') {   /* cốc to (PixelLab) nổi trên đầu ếch, nghiêng dần để đổ */
    const s = o.pop != null ? o.pop : 1, X = o.x, Y = o.y - o.z; if (s <= 0) return; const ang = o.ang || 0, nm = 'mug_b' + (ang >= 105 ? 120 : ang >= 75 ? 90 : ang >= 45 ? 60 : ang >= 15 ? 30 : 0);
    if (s < 1) { disc(g, SX(X, cx), SY(Y - 5, cy), 14 * s, W[0], s); disc(g, SX(X, cx), SY(Y - 5, cy), 10 * s, '#ffffff'); return; }
    blitItem(g, nm, X, Y, cx, cy, !!o.flip); return;
  }
  if (o.k === 'shades') {   /* kính đen: rơi từ trên xuống rồi gắn vào mắt; ánh loé 1 lần */
    const p = o.get && o.get(); if (!p) return; const y = p.y - (o.drop || 0); if (p.back) return;
    blitItem(g, 'shades', p.x, y + 1.5, cx, cy, !!p.flip, 0.5, 0.5);
    if (o.shine > 0) { const X = SX(p.x + (p.flip ? -2 : 2), cx), Y = SY(y, cy), r = Math.round(6 * o.shine); for (let i = -r; i <= r; i++) { dot(g, X + i, Y, '#ffffff'); dot(g, X, Y + Math.round(i * 0.6), '#ffffff'); } dot(g, X, Y, GOLD[2]); }
    return;
  }
  if (o.k === 'wave') { drawWave(g, o, cx, cy); return; }
  if (o.k === 'pour') {   /* dòng nước đổ từ miệng cốc xuống mặt sóng */
    const X0 = SX(o.x0, cx), Y0 = SY(o.y0 - o.z0, cy), X1 = SX(o.x1, cx), Y1 = SY(o.y1, cy), n = Math.max(2, Math.round(Math.abs(Y1 - Y0)));
    for (let i = 0; i <= n; i++) { const u = i / n, x = Math.round(X0 + (X1 - X0) * u * u), y = Math.round(Y0 + (Y1 - Y0) * u), w = 3 + Math.round(u * 5);
      for (let j = -w; j <= w; j++) { const e = Math.abs(j) / w; dot(g, x + j, y, e > 0.75 ? W[4] : e > 0.4 ? W[2] : (i + j + Math.round(o.t * 30)) % 5 ? W[1] : W[0]); } }
    return;
  }
}
/* tường sóng (bản 2): khối nêm 2.5D — dày T theo hướng chạy, mặt trước dốc đứng có bọt cuộn, lưng thoải; mỗi cột vẽ bằng 7 dải màu (ít lệnh vẽ),
   cột xa (đáy cao hơn trên màn) vẽ trước, cột gần vẽ sau → che đúng. Bề ngang W vuông góc hướng chạy. */
const WBAND = [[0.1, 6], [0.25, 5], [0.42, 4], [0.6, 3], [0.78, 2], [0.9, 1], [1.01, 0]];
function drawWave(g, o, cx, cy) {
  const ux = o.ux, uy = o.uy, px = -uy, py = ux, HW = o.W, Hh = o.H * (o.grow == null ? 1 : o.grow), k = o.fade == null ? 1 : o.fade; if (Hh < 1) return;
  const T = Math.min(o.front + 4, o.T2 || 44), cols = [];
  const NA = Math.max(8, Math.round(HW * 2 * (Math.abs(px) * 1 + Math.abs(py) * 0.6) * 2.2)), NQ = Math.max(4, Math.round(T * (Math.abs(ux) + Math.abs(uy) * 0.6) * 2.2));
  for (let a = 0; a <= NA; a++) { const s = a / NA * 2 - 1, edge = 1 - Math.abs(s) ** 2.2, wob = 0.78 + 0.22 * Math.sin(s * 5.5 + o.t * 9) + 0.08 * Math.sin(s * 13 - o.t * 17);
    for (let b = 0; b <= NQ; b++) { const v = b / NQ, q = v * T, prof = v < 0.1 ? Math.sqrt(v / 0.1) : Math.max(0.08, 1 - Math.pow((v - 0.1) / 0.9, 0.7) * 0.92), hh = Hh * prof * (0.5 + 0.5 * edge) * wob;
      const bx = o.x + ux * (o.front - q) + px * s * HW, by = o.y + uy * (o.front - q) + py * s * HW * 0.6; cols.push({ X: SX(bx, cx), Y: SY(by, cy), top: Math.round(hh * 2), v, crest: v < 0.2, s }); } }
  cols.sort((p, q) => p.Y - q.Y || q.v - p.v);
  const HB = [[0.14, 6], [0.3, 5], [0.48, 4], [0.66, 3], [0.82, 2], [9, 1]], H2 = Hh * 2;
  for (const c of cols) { if (c.top < 1) continue; if (k < 1 && k <= bay(c.X, c.Y)) continue; if (c.v > 0.5 && (c.v - 0.5) / 0.5 * 1.1 > bay(c.X >> 1, c.Y >> 1)) continue; let z0 = 0; const lift = c.v < 0.08 ? 1 : 0;
    for (const [f, ci] of HB) { const z1 = Math.min(c.top, Math.round(H2 * f)); if (z1 > z0) { g.fillStyle = W[Math.max(1, ci - lift)]; g.fillRect(c.X / 2, (c.Y - z1) / 2, 1, (z1 - z0) / 2); } z0 = Math.max(z0, z1); if (z0 >= c.top) break; }
    if (c.crest) { g.fillStyle = W[0]; g.fillRect(c.X / 2, (c.Y - c.top) / 2, 1, 1.5); if (((c.X + c.Y + Math.round(o.t * 30)) & 3) === 0) dot(g, c.X + 1, c.Y - c.top - 1, W[0]); }
    { const hsh = ((c.X * 73856093) ^ (c.Y * 19349663) ^ Math.round(o.t * 20)) >>> 0; if ((hsh & 15) < 2 && c.top > 6) dot(g, c.X, c.Y - 2 - (hsh >> 4) % Math.max(1, c.top - 4), (hsh & 1) ? W[0] : W[1]); }   /* vệt bọt trên mặt sóng */
    if (c.v < 0.05) dot(g, c.X, c.Y + 1, W[0]); }
  /* mép cuộn: bọt trắng chồm ra phía trước ở đỉnh các cột đầu sóng */
  for (const c of cols) { if (c.v > 0.04 || c.top < 8 || (k < 1 && k <= bay(c.X, c.Y))) continue; const fx2 = c.X + Math.round(ux * 5), fy2 = c.Y - c.top + Math.round(uy * 2) + 1, r = 2 + (c.top > Hh * 1.6 ? 1.5 : 0);
    disc(g, fx2, fy2, r + 1, W[2]); disc(g, fx2 - ux, fy2 - 1, r, W[0]); }
}

/* ================= hiệu ứng sự kiện ================= */
export function charge(x, y, z, pw = 0.5, n = 8) {   /* gồng: giọt nước nhỏ hút về miệng */
  for (let i = 0; i < n; i++) { const a = rnd() * TAU, d = 10 + rnd() * 8; part({ k: 'drop', x: x + Math.cos(a) * d, y: y + Math.sin(a) * d * 0.4, z: z + Math.sin(a) * 4, vx: -Math.cos(a) * d * 3.2, vy: -Math.sin(a) * d * 1.3, vz: 0, g: 0, drag: 0, T: 0.3, ky: y + 0.5 }); }
  cnt('charge');
}
export function pop(x, y, z, pw = 0.5, big = 1) {   /* bong bóng nổ: vòng 4 tia trắng + giọt văng + vệt ướt */
  drops(x, y, z, Math.round((8 + 8 * pw) * big), 70 * big, 50, 0.45);
  for (let i = 0; i < 5 * big; i++) part({ k: 'mini', x: x + (rnd() - 0.5) * 6, y, z: z + (rnd() - 0.5) * 6, vx: (rnd() - 0.5) * 30, vy: 0, vz: 10 + rnd() * 20, g: 0, drag: 2, r: 1 + rnd(), T: 0.35, ky: y + 0.6 });
  S.objs.push({ k: 'popring', x, y, z, t: 0, T: 0.16, r: 3 * big, alive: true, ky: y + 0.7 }); decal({ k: 'spl', x, y, T: 0.8, r: 2.5 * big }); H.stop(0.03); cnt('pop');
}
export function landSplash(x, y, pw = 0.6, hit = true) {   /* bụng đè đáp đất: vòng nước thấp sát đất + giọt toé + bụi + hố nông */
  S.objs.push({ k: 'groundring', x, y, t: 0, T: 0.42, R: 22 + 10 * pw, alive: true, ky: y - 2 }); S.objs.push({ k: 'groundring', x, y, t: -0.06, T: 0.36, R: 14 + 6 * pw, alive: true, ky: y - 2 });
  drops(x, y, 1, 14 + Math.round(14 * pw), 110, 40, 0.5); dust(x, y, 8, 0, 60); decal({ k: 'crater', x, y, r: 7, T: 2.4 }); decal({ k: 'puddle', x, y: y + 1, r: 9, T: 2.2 });
  H.quake(hit ? 0.22 + 0.15 * pw : 0.12); H.stop(hit ? 0.09 : 0.04); cnt('land');
}
export function slap(x, y, z, pw = 0.6, dir = 1) {   /* cú tát: sao trắng 1 khung + 6 tia + giọt nước má */
  S.objs.push({ k: 'star', x, y, z, t: 0, T: 0.2, dir, alive: true, ky: y + 0.8 }); drops(x, y, z, 10, 90, 30, 0.4, dir > 0 ? 0 : Math.PI, 1.6); H.quake(0.2 + 0.12 * pw); H.stop(0.08); cnt('slap');
}
export function skid(x, y, ux, uy, L = 14) { decal({ k: 'skid', x, y, ux, uy, L, T: 1.6 }); dust(x, y, 5, ux > 0 ? -1 : 1, 50); }
export function shine(x, y, z, ky) { glint(x, y, z, 6, GOLD, ky); cnt('shine'); }
export function reflectSpark(x, y, z, ky) { glint(x, y, z, 10, ['#ffffff', '#b4e1fd', '#70bcfc'], ky); S.objs.push({ k: 'star', x, y, z, t: 0, T: 0.14, dir: 1, alive: true, ky }); H.stop(0.04); H.quake(0.08); cnt('refl'); }
export function puddle(x, y, r = 8, T = 2) { decal({ k: 'puddle', x, y, r, T }); }
export function foam(x, y, z, n = 6) { for (let i = 0; i < n; i++) part({ k: 'foam', x: x + (rnd() - 0.5) * 10, y: y + (rnd() - 0.5) * 3, z: z + rnd() * 3, vx: (rnd() - 0.5) * 30, vy: (rnd() - 0.5) * 8, vz: 10 + rnd() * 20, g: 30, drag: 3, r: 1 + rnd() * 1.2, T: 0.45, ky: y + 0.4 }); }
export function waveCrash(x, y, pw = 1) { drops(x, y, 6, 30 + Math.round(20 * pw), 140, 80, 0.7); foam(x, y, 8, 10); H.quake(0.35 + 0.2 * pw); H.stop(0.12); cnt('crash'); }
export function drip(x, y, z) { drops(x, y, z, 3, 20, 10, 0.35); }
export function smokePuff(x, y, z) { for (let i = 0; i < 4; i++) part({ k: 'dust', x, y, z, vx: (rnd() - 0.5) * 16, vy: 0, vz: 10 + rnd() * 10, g: -6, drag: 2, r: 1, T: 0.4, ky: y + 0.5 }); }

function drawMisc(g, o, cx, cy) {
  const k = o.t / o.T;
  if (o.k === 'popring') { const X = SX(o.x, cx), Y = SY(o.y - o.z, cy), r = Math.round((o.r + k * 4) * 2); for (const [ux, uy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [0.7, 0.7], [-0.7, 0.7], [0.7, -0.7], [-0.7, -0.7]]) { dot(g, Math.round(X + ux * r), Math.round(Y + uy * r), W[0]); dot(g, Math.round(X + ux * (r - 2)), Math.round(Y + uy * (r - 2)), W[2]); } return true; }
  if (o.k === 'star') { const X = SX(o.x, cx), Y = SY(o.y - o.z, cy), L = Math.round((k < 0.3 ? 6 + k * 30 : 15 * (1 - k)) ); if (k < 0.15) disc(g, X, Y, 5, '#ffffff');
    for (let i = 0; i < 8; i++) { const a = i / 8 * TAU + 0.2, l = i % 2 ? L * 0.6 : L; line(g, Math.round(X + Math.cos(a) * 3), Math.round(Y + Math.sin(a) * 3), Math.round(X + Math.cos(a) * l), Math.round(Y + Math.sin(a) * l * 0.8), i % 2 ? W[1] : '#ffffff'); } return true; }
  return false;
}
function drawGroundObj(g, o, cx, cy) {
  if (o.k === 'groundring') { if (o.t < 0) return true; const k = o.t / o.T, R = o.R * (0.25 + 0.75 * Math.sqrt(k)), X = SX(o.x, cx), Y = SY(o.y, cy), a = 1 - k;
    ring(g, X, Y, R * 2, R * 0.9, 2, W[1], a); ring(g, X, Y + 1, R * 2 - 2, R * 0.9 - 1, 1, W[4], a); return true; }
  if (o.k === 'jshadow') { const p = o.get && o.get(); if (!p) return true; const X = SX(p.x, cx), Y = SY(p.y, cy), s = p.s; oval(g, X, Y, 4 + s * 9, 1.5 + s * 3.5, '#1d2a1a', 0.35 + s * 0.4); return true; }
  return false;
}

/* ================= vòng đời ================= */
export function update(dt) {
  if (!(dt > 0)) return; updParts(dt);
  for (const o of S.objs) { o.t += dt; if (o.upd) o.upd(dt, o); if (o.T != null && o.t >= o.T) o.alive = false; }
  S.objs = S.objs.filter(o => o.alive);
  for (const d of S.decals) d.t += dt; S.decals = S.decals.filter(d => d.t < d.T);
}
export function drawGround(g, cx, cy) {
  for (const d of S.decals) drawDecal(g, d, cx, cy);
  for (const o of S.objs) if (o.k === 'groundring' || o.k === 'jshadow') drawGroundObj(g, o, cx, cy);
}
export function drawables(out, g, cx, cy) {
  for (const o of S.objs) { if (o.k === 'groundring' || o.k === 'jshadow') continue; const ky = o.kyF ? o.kyF() : (o.ky ?? (o.y + 0.5));
    out.push({ y: ky, f: () => { if (!drawMisc(g, o, cx, cy)) drawObj(g, o, cx, cy); } }); }
  for (const p of S.parts) out.push({ y: p.ky, f: () => drawPart(g, p, cx, cy) });
}
