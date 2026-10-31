/* pxfx.js — p61: hệ hạt / mảnh vỡ / sương / tia lửa / ánh sáng VẼ CODE TỪNG PIXEL cho VFX chiêu (ngoại lệ luật PixelLab, anh duyệt 2026-10-30).
   Phần chính của chiêu (tia, cột, khối băng, thú trong ult) vẫn là ảnh PixelLab vfx2 — module này chỉ thêm lớp hạt / mảnh / sương / ánh sáng.

   Kỹ thuật lấy theo Sprite Fusion VFX (ice.ts / movement.ts / black-hole.ts / rain.ts):
     MIT License — Copyright (c) 2026 Hugo Duprez. Các hàm crystal / shard / chunk / cracks / Rng / hash / bayer / easing bên dưới
     chuyển thể từ ice.ts (giữ ghi chú bản quyền này khi chép tiếp).
   Đổi cho game này: góc nhìn top-down (mỗi hạt có x, y = điểm trên mặt đất + z = độ cao; trọng lực kéo z, nảy khi chạm đất, trượt có ma sát),
   lớp back / front tách theo y so với chân thú (vẽ trước / sau thú), lớp light cộng sáng ('lighter', có trần để không chói).

   Đơn vị: px LOGIC của game. Bộ đệm vẽ ở RES = 2 điểm / px logic = đúng 1 px canvas 2× (cùng mật độ với ảnh vfx2 và sprite thú vẽ ½ cỡ ảnh).
   Bộ đệm là canvas thường KHÔNG có __hi → vẽ ra game luôn bằng drawImage 9 tham số (luật 25/09).
   Mờ = dither Bayer 4×4 (không dùng globalAlpha). Màu = bảng 8 bậc / hệ (0 sáng nhất … 7 viền tối), đo từ ảnh vfx2 (_wip/p61/tools/pal.py).

   Dùng:
     import { PXFX } from './pxfx.js';
     const e = PXFX.spawn('suong_ult_v1', { x: foe.x, y: foe.y, type: 'suong', seed: 7, shake: k => …, flash: (k, rgb) => …, cue: name => …, sil: () => PXFX.silOf(…) });
     mỗi khung: PXFX.update(dt);  trong drawables: PXFX.drawables(out, g, cx, cy)   (back ở ky = y − 0,5 · front ở y + 0,7 · light ở y + 0,8)
*/

export const RES = 2;
const TAU = Math.PI * 2, G = 600;

/* ---------- màu ---------- */
function rgb(r, g, b, a = 255) { return (((a & 255) << 24) | ((b & 255) << 16) | ((g & 255) << 8) | (r & 255)) >>> 0; }
function hex(h) { const v = parseInt(h.replace('#', ''), 16); return rgb((v >> 16) & 255, (v >> 8) & 255, v & 255); }
function mix(c1, c2, t) { const ch = s => ((c1 >>> s) & 255) * (1 - t) + ((c2 >>> s) & 255) * t; return rgb(ch(0), ch(8), ch(16), 255); }
function scaleC(c, k) { return rgb(Math.min(255, (c & 255) * k), Math.min(255, ((c >>> 8) & 255) * k), Math.min(255, ((c >>> 16) & 255) * k), 255); }

/* Bảng 8 bậc đo từ VFX PixelLab sẵn có (ult_<hệ>_back/front, hit, beam_n, muzzle, wave, ring, proj; trung vị theo độ sáng).
   suong: bậc 0–4 và 7 đo, bậc 5–6 nội suy (ảnh gốc gần như không có tông giữa).
   p61 r3 (sửa bằng mắt trên bảng mẫu): bản đo lần 1 có bậc trùng / nhảy cóc (quang 0≈1; chấn 4–7 gần đen + lệch tím; lôi 5–6 nâu xám; âm 1→2 nhảy; nham 5→6 hụt) → nắn lại
   cho đều độ sáng, giữ đúng sắc của ảnh PixelLab. trieu: lấy từ Ô NƯỚC GAME (zones/m1/wang/c2 + e3: #80c9fc #70bcfc #569bf3 #4482dd #3571cd) + bọt trắng ở bậc 0–1. */
export const PAL_SRC = {
  chan: ['#f6d29a', '#deb47a', '#bf905e', '#9a6c48', '#77503a', '#573a2c', '#3c271f', '#231512'],
  nham: ['#fffbb0', '#ffe55a', '#ffb52e', '#fc7e27', '#e8481f', '#b0301a', '#6e1c10', '#2e0b06'],
  trieu: ['#eef9ff', '#b4e1fd', '#80c9fc', '#70bcfc', '#569bf3', '#4482dd', '#3571cd', '#1d3f7a'],
  loi: ['#ffffff', '#fff9b8', '#ffe766', '#9fe6ff', '#5cb2ff', '#3a6fe0', '#28408f', '#151c40'],
  phong: ['#faffff', '#dcfbf4', '#b8f4dd', '#99dac9', '#6db3a2', '#3f8d88', '#225e5a', '#103b38'],
  moc: ['#d6f29c', '#a3de5f', '#72cb4e', '#4ca249', '#2d843d', '#186331', '#0e4929', '#0a2c12'],
  suong: ['#f3ffff', '#c6e7ff', '#9dcef5', '#7db3e8', '#5c8fce', '#3a6aa6', '#1f4a80', '#10325a'],
  tinh: ['#fbe6fb', '#f3b4ee', '#e683dc', '#cd57c1', '#a43a9e', '#7a2478', '#511656', '#2c0830'],
  ma: ['#d6fff0', '#86ffc8', '#2ee89b', '#0ad17e', '#06a866', '#067f47', '#04552f', '#022a1c'],
  am: ['#f6e8ff', '#ddc0ff', '#bc95f2', '#9a6bd9', '#774bb6', '#58368f', '#3d2468', '#22143e'],
  anh: ['#f2b4ff', '#d27cff', '#aa58ee', '#8238c8', '#5e249c', '#421a70', '#2a1048', '#160624'],
  quang: ['#fffff0', '#fff4b4', '#ffe27a', '#ffc54c', '#eb9d33', '#bd7220', '#874a18', '#4e2a12'],
};
export const PAL = Object.fromEntries(Object.entries(PAL_SRC).map(([k, v]) => [k, v.map(hex)]));

/* ---------- tiện ích (chuyển thể từ ice.ts, MIT © 2026 Hugo Duprez) ---------- */
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
export function bayer(x, y) { return (BAYER[((y & 3) << 2) | (x & 3)] + 0.5) / 16; }
class Rng {
  constructor(seed = 1) { this.s = seed >>> 0 || 1; }
  next() { let t = (this.s = (this.s + 0x6d2b79f5) >>> 0); t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
  range(a, b) { return a + (b - a) * this.next(); }
  int(a, b) { return Math.floor(this.range(a, b + 1)); }
  sign() { return this.next() < 0.5 ? -1 : 1; }
  chance(p) { return this.next() < p; }
  pick(a) { return a[Math.floor(this.next() * a.length)]; }
}
const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
function smooth(a, b, x) { const t = (x - a) / (b - a); return x <= a ? 0 : x >= b ? 1 : t * t * (3 - 2 * t); }
const outCubic = t => 1 - Math.pow(1 - clamp(t), 3);
function outBack(t, s = 1.7) { const u = clamp(t) - 1; return 1 + (s + 1) * u * u * u + s * u * u; }
function hash2(x, y, k = 0) { let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(k | 0, 1442695041)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; }
function hash(n, k = 0) { return ((Math.imul(n + 1 + k * 7919, 2654435761) >>> 0) % 100000) / 100000; }
const CROSS = [[1, 0], [-1, 0], [0, 1], [0, -1]], DIAG = [[1, 1], [1, -1], [-1, 1], [-1, -1]];

/* ---------- bộ đệm màu (Uint32 ABGR) + bộ đệm sáng (float, cộng dồn) ---------- */
class Buf {
  constructor(w, h) { this.w = w; this.h = h; this.data = new Uint32Array(w * h); this.n = 0; this.cv = null; this.id = null; }
  clear() { if (this.n) { this.data.fill(0); this.n = 0; } }
  set(x, y, c) { x = Math.floor(x); y = Math.floor(y); if (x < 0 || y < 0 || x >= this.w || y >= this.h) return; this.data[y * this.w + x] = c; this.n++; }
  get(x, y) { x = Math.floor(x); y = Math.floor(y); return x < 0 || y < 0 || x >= this.w || y >= this.h ? 0 : this.data[y * this.w + x]; }
  dot(x, y, c, a = 1) { const X = Math.floor(x), Y = Math.floor(y); if (a >= 1 || a > bayer(X, Y)) this.set(X, Y, c); }
  canvas() {
    if (!this.cv) { this.cv = mkCanvas(this.w, this.h); this.ctx = this.cv.getContext('2d'); this.id = new ImageData(new Uint8ClampedArray(this.data.buffer), this.w, this.h); }
    this.ctx.putImageData(this.id, 0, 0); return this.cv;
  }
}
const LCAP = 150;   /* trần cộng sáng mỗi kênh (0–255): ánh lạnh, không chói */
class LBuf {
  constructor(w, h) { this.w = w; this.h = h; this.f = new Float32Array(w * h * 3); this.out = new Uint32Array(w * h); this.n = 0; this.cv = null; }
  clear() { if (this.n) { this.f.fill(0); this.n = 0; } }
  glow(cx, cy, r, c, k) {
    if (r < 1 || k <= 0.01) return; this.n++;
    const x0 = Math.max(0, Math.floor(cx - r)), x1 = Math.min(this.w - 1, Math.ceil(cx + r)), y0 = Math.max(0, Math.floor(cy - r)), y1 = Math.min(this.h - 1, Math.ceil(cy + r));
    const cr = c & 255, cg = (c >>> 8) & 255, cb = (c >>> 16) & 255;
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const dx = (x + 0.5 - cx) / r, dy = (y + 0.5 - cy) / r, d = dx * dx + dy * dy; if (d >= 1) continue;
      const f = (1 - Math.sqrt(d)), q = f * f * k, i = (y * this.w + x) * 3; this.f[i] += cr * q; this.f[i + 1] += cg * q; this.f[i + 2] += cb * q;
    }
  }
  canvas() {   /* lượng tử hoá 6 bậc cho ra vệt sáng có bậc kiểu pixel */
    const f = this.f, o = this.out, q = v => (v < 6 ? 0 : Math.min(LCAP, Math.round(v / 25) * 25));
    for (let i = 0, j = 0; i < o.length; i++, j += 3) { const r = q(f[j]), g = q(f[j + 1]), b = q(f[j + 2]); o[i] = r | g | b ? rgb(r, g, b, 255) : 0; }
    if (!this.cv) { this.cv = mkCanvas(this.w, this.h); this.ctx = this.cv.getContext('2d'); this.id = new ImageData(new Uint8ClampedArray(o.buffer), this.w, this.h); }
    this.ctx.putImageData(this.id, 0, 0); return this.cv;
  }
}
function mkCanvas(w, h) { if (typeof document !== 'undefined') { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; } return new OffscreenCanvas(w, h); }

/* ---------- hình vẽ (toạ độ điểm đệm) ---------- */
function line(B, x0, y0, x1, y1, c, a = 1) { const n = Math.max(1, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)))); for (let i = 0; i <= n; i++) B.dot(lerp(x0, x1, i / n), lerp(y0, y1, i / n), c, a); }
function ditherOval(B, cx, cy, rx, ry, c, a) {   /* sương / khói: elip mờ dither, mép thưa hơn lõi */
  if (a <= 0.02 || rx < 0.5) return;
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
    const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry, d = dx * dx + dy * dy; if (d > 1) continue;
    B.dot(x, y, c, a * (1 - 0.55 * d));
  }
}
/* tinh thể nhọn (chuyển thể ice.ts crystal) — x, base, h, w, lean tính bằng điểm đệm */
function crystal(B, P, x, base, h, w, lean, a = 1, white = false, glint = -1) {
  if (h < 1.5) return;
  const TIP = P[0], top = base - h, ridge0 = x - w * 0.14;
  const inside = (px, py) => { const u = (base - (py + 0.5)) / h; return u >= 0 && u <= 1 && Math.abs(px + 0.5 - (x + lean * u)) <= (w / 2) * (1 - u) + 0.35; };
  for (let py = Math.floor(top) - 1; py < Math.ceil(base); py++)
    for (let px = Math.floor(x - w / 2 - Math.abs(lean) - 2); px <= Math.ceil(x + w / 2 + Math.abs(lean) + 2); px++) {
      if (a < 1 && a <= bayer(px, py)) continue;
      if (!inside(px, py)) { if (inside(px - 1, py) || inside(px + 1, py) || inside(px, py + 1) || (inside(px, py - 1) && py < base - 1)) B.set(px, py, P[7]); continue; }
      if (white) { B.set(px, py, P[0]); continue; }
      const u = (base - (py + 0.5)) / h, rx = lerp(ridge0, x + lean, u), c = x + lean * u, hw = (w / 2) * (1 - u) + 0.35, fx = px + 0.5;
      let col = u > 0.9 ? TIP : Math.abs(fx - rx) < 0.55 ? P[1] : fx < rx ? (fx - (c - hw) < 1 ? P[1] : (fx - (c - hw)) / Math.max(1, rx - (c - hw)) > 0.55 ? P[2] : P[3]) : c + hw - fx < 1.2 ? P[6] : (fx - rx) / Math.max(1, c + hw - rx) > 0.5 ? P[5] : P[4];
      if (glint >= 0 && fx <= rx + 0.6) { const gq = Math.abs(u - glint); if (gq < 0.05) col = TIP; else if (gq < 0.1) col = P[1]; }
      B.set(px, py, col !== TIP && hash2(px, py, 1) < 0.05 ? P[1] : col);
    }
}
function frostPatch(B, c, cx, cy, r, a, fresh = -1, sq = 0.5) {   /* sương giá trên mặt đất: elip (top-down) chấm băng ổn định theo hash, mép mới lan ra sáng hơn */
  if (a <= 0.02 || r < 1) return; const P = c.P, X0 = c.X(cx), Y0 = c.Y(cy), R = r * RES, RY = R * sq;
  for (let y = Math.floor(Y0 - RY); y <= Math.ceil(Y0 + RY); y++) for (let x = Math.floor(X0 - R); x <= Math.ceil(X0 + R); x++) {
    const dx = (x + 0.5 - X0) / R, dy = (y + 0.5 - Y0) / RY, d = Math.sqrt(dx * dx + dy * dy); if (d > 1) continue;
    const h = hash2(x >> 1, y >> 1, 3), h2 = hash2(x, y, 5), edge = fresh >= 0 && d > fresh, dens = (edge ? 0.34 : 0.24 - 0.12 * d) * (h2 < 0.5 ? 1.3 : 0.7);   /* r3: thưa hơn, theo cụm 2×2 (bản 2 như muối rắc) */
    if (h > dens) continue;
    const col = edge ? (h < 0.12 ? P[0] : P[1]) : h < 0.03 ? P[0] : h < 0.11 ? P[1] : h < 0.19 ? P[2] : P[3];
    B.dot(x, y, col, a * (d > 0.85 ? (1 - d) / 0.15 + 0.2 : 1));
  }
}

/* ---------- hạt (đơn vị logic; x, y trên mặt đất, z độ cao) ---------- */
const K = { SHARD: 0, CHUNK: 1, FLAKE: 2, STAR: 3, MIST: 4, STREAK: 5, DUST: 6, FX: 7 };   /* FX: hạt tự vẽ (p.draw) + vật lý chung (g, drag, lift, sway, bounce, onLand) — dùng cho pxfx-ult.js */
function part(c, k, x, y, z, vx, vy, vz, life, col, size = 1, o = {}) {
  const p = { k, x, y, z, vx, vy, vz, life, max: life, col, size, seed: c.R.next() * 100, a: c.R.range(0, TAU), va: 0, g: 0, drag: 0, bounce: 0, rest: false, ...o };
  c.ps.push(p); return p;
}
function stepParts(c, dt) {
  const T = c.t;
  for (let i = c.ps.length - 1; i >= 0; i--) {
    const p = c.ps[i]; if ((p.life -= dt) <= 0) { c.ps.splice(i, 1); continue; }
    if (p.k === K.FX) {
      if (!p.rest) { p.vz += (p.lift || 0) * dt - G * p.g * dt; const d = p.drag || 0; p.vx -= p.vx * d * dt; p.vy -= p.vy * d * dt; p.vz -= p.vz * d * dt; p.a += p.va * dt; if (p.sway) p.x += Math.sin(T * (p.sw || 5) + p.seed) * p.sway * dt; }
      else { p.vx -= p.vx * 8 * dt; p.vy -= p.vy * 8 * dt; }
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; p.age = (p.age || 0) + dt;
      if (p.z < 0) { p.z = 0; const sp = -p.vz; if (p.bounce > 0 && sp > 40) { p.vz = sp * p.bounce; p.vx *= 0.6; p.vy *= 0.6; } else { p.vz = 0; if (!p.rest) { p.rest = true; p.onLand && p.onLand(c, p); } } }
      continue;
    }
    if (p.k === K.FLAKE) { p.vx -= p.vx * 2.2 * dt; p.vy -= p.vy * 2.2 * dt; p.vz -= p.vz * 2.2 * dt + 26 * dt; p.x += Math.sin(T * 2.5 + p.seed) * 6 * dt; }
    else if (p.k === K.MIST || p.k === K.DUST) { const d = p.drag || 2.6; p.vx -= p.vx * d * dt; p.vy -= p.vy * d * dt; p.vz -= p.vz * d * dt; }
    else if (p.k === K.STREAK) { p.vx += p.vx * 2 * dt; p.vy += p.vy * 2 * dt; }
    else if (p.k === K.STAR) { p.vx -= p.vx * 3 * dt; p.vy -= p.vy * 3 * dt; p.vz -= p.vz * 3 * dt; }
    else if (!p.rest) { p.vz -= G * p.g * dt; p.vx -= p.vx * p.drag * dt; p.vy -= p.vy * p.drag * dt; p.a += p.va * dt; }
    else { p.vx -= p.vx * 7 * dt; p.vy -= p.vy * 7 * dt; }   /* đang trượt trên đất */
    p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
    if (p.z < 0 && (p.k === K.SHARD || p.k === K.CHUNK)) {
      p.z = 0; const sp = -p.vz;
      if (p.bounce > 0 && sp > 45) { p.vz = sp * p.bounce; p.vx *= 0.65; p.vy *= 0.65; p.va *= 0.6; }
      else { p.vz = 0; p.rest = true; p.va = 0; }
    }
    if (p.z < 0 && p.k === K.FLAKE) { p.z = 0; p.vz = 0; p.vx *= 0.3; p.vy *= 0.3; }
    if (p.z < 0) p.z = 0;
  }
}
function drawPart(B, L, c, p) {
  const P = c.P, k = p.life / p.max, x = c.X(p.x), y = c.Y(p.y, p.z), fade = p.qf ? 1 : Math.min(1, p.life / 0.35);   /* qf: tắt gọn khi hết đời (không mờ dần) */
  switch (p.k) {
    case K.FX: p.draw(B, L, c, p, x, y, k); break;
    case K.SHARD: { const ca = Math.cos(p.a), sa = Math.sin(p.a), s = p.size * RES;
      if (p.z > 2) B.dot(x, c.Y(p.y), P[7], 0.45 * fade);   /* bóng nhỏ trên đất cho thấy độ cao */
      for (let d = -s / 2; d <= s / 2; d += 0.5) B.dot(x + ca * d, y + sa * d, d > s / 2 - 0.8 ? P[0] : p.col, fade); break; }
    case K.CHUNK: { const X = Math.round(x), Y = Math.round(y), ca = Math.cos(p.a), sa = Math.sin(p.a), s = p.size * RES, r = Math.ceil(s) + 1;
      if (p.z > 2) ditherOval(B, X, c.Y(p.y), s * 0.8, s * 0.35, P[7], 0.5 * fade);
      for (let py = -r; py <= r; py++) for (let px = -r; px <= r; px++) {
        const u = (px + 0.5) * ca + (py + 0.5) * sa, v = -(px + 0.5) * sa + (py + 0.5) * ca, d = Math.abs(u) / s + Math.abs(v) / (s * 0.62);
        if (d <= 1.3 && (fade >= 1 || fade > bayer(X + px, Y + py))) B.set(X + px, Y + py, d > 1 ? P[7] : v < 0 ? (u < 0 ? P[1] : P[2]) : u < 0 ? P[3] : P[5]);
      } break; }
    case K.FLAKE: { const a = Math.min(1, k * 3); B.dot(x, y, p.col, a); if (p.size > 1.3) for (const [dx, dy] of CROSS) B.dot(x + dx, y + dy, P[1], a * 0.7); break; }
    case K.MIST: case K.DUST: if (p.hard >= 1) {   /* p61 r3: bụi / khói kiểu pixel — cục tròn đặc CO LẠI theo tuổi, nửa trên sáng hơn, viền dưới tối; không dither (dither ½ = lưới chấm, anh chê) */
        const r = p.size * RES * (0.35 + 0.65 * Math.min(1, k * 1.3)), ry = r * (p.k === K.MIST ? 0.55 : 0.8), hi = scaleC(p.col, 1.18), lo = scaleC(p.col, 0.78);
        for (let yy = Math.floor(y - ry); yy <= Math.ceil(y + ry); yy++) for (let xx = Math.floor(x - r); xx <= Math.ceil(x + r); xx++) { const dx = (xx + 0.5 - x) / r, dy = (yy + 0.5 - y) / ry, d = dx * dx + dy * dy; if (d > 1) continue; B.set(xx, yy, dy < -0.25 && dx < 0.4 ? hi : d > 0.6 && dy > 0.2 ? lo : p.col); }
        break; } else { const r = p.size * RES * (0.6 + (1 - k) * 0.9); ditherOval(B, x, y, r, r * (p.k === K.MIST ? 0.5 : 0.8), p.col, p.hard ? (k > 0.3 ? (p.hard >= 1 ? 1.7 : p.hard) : 0) : Math.pow(k, 1.4) * (p.k === K.MIST ? 0.38 : 0.55));   /* hard: mờ cố định rồi TẮT (không thưa dần thành lưới chấm) */ if (p.k === K.MIST && !p.hard) L.glow(x, y, r * 1.6, P[2], 0.12 * k); break; }
    case K.STREAK: { const sp = Math.hypot(p.vx, p.vy - p.vz) || 1, Ln = clamp(sp / 25, 2, 12), ux = p.vx / sp, uy = (p.vy - p.vz) / sp;
      for (let d = Ln; d >= 0; d -= 0.5) B.dot(x - ux * d, y - uy * d, d < 1 ? P[0] : d < Ln * 0.5 ? p.col : P[3], (d < Ln * 0.5 ? 1 : 1.2 - d / Ln) * fade); break; }
    case K.STAR: { const tw = 0.6 + 0.4 * Math.sin(c.t * (8 + (p.seed % 5)) + p.seed), X = Math.floor(x), Y = Math.floor(y);
      if (p.size < 1) { if (tw * k > 0.25) B.set(X, Y, tw > 0.8 ? P[0] : p.col); L.glow(x, y, 3, p.col, 0.35 * k * tw); break; }
      const arm = Math.max(1, Math.round(p.size * tw * Math.min(1, k * 3))), tip = scaleC(p.col, 0.8);
      for (let d = 1; d <= arm; d++) for (const [dx, dy] of CROSS) B.set(X + dx * d, Y + dy * d, d === arm && arm > 1 ? tip : p.col);
      if (arm >= 3) for (const [dx, dy] of DIAG) B.set(X + dx, Y + dy, tip);
      B.set(X, Y, P[0]); L.glow(x, y, 3 + arm * 2, p.col, 0.4 * k * tw); break; }
  }
}
function addLight(c, x, y, r, col, k, life) { life = Math.min(life, 0.16); c.lights.push({ x, y, r: r * 0.45, col, k: k * 0.7, life, max: life }); }   /* p61 r2: ánh sáng gọn + ngắn (bản 1 thành khối xanh to trên cỏ) */

/* ---------- mảnh / sương dùng chung ---------- */
function shardsFrom(c, n, box, power = 1, cols = null) {   /* box: {x0,x1, z0,z1, y0,y1} logic quanh neo — mảnh văng ra từ tâm khối */
  const R = c.R, P = c.P, mx = (box.x0 + box.x1) / 2, mz = (box.z0 + box.z1) / 2;
  for (let i = 0; i < n; i++) {
    const x = R.range(box.x0, box.x1), z = R.range(box.z0, box.z1), y = R.range(box.y0, box.y1), dx = x - mx, dz = z - mz, d = Math.hypot(dx, dz) || 1, sp = R.range(50, 130) * power;
    const chunk = R.chance(0.22);
    part(c, chunk ? K.CHUNK : K.SHARD, c.ax + x, c.ay + y, z, dx / d * sp + R.range(-15, 15), R.range(-25, 45) * power, Math.max(30, dz / d * sp * 0.7 + R.range(60, 150) * power), R.range(0.7, 1.15), cols ? R.pick(cols) : R.pick([P[1], P[2], P[3], P[4]]), chunk ? R.range(1.6, 2.8) : R.range(2, 4), { g: 1, drag: 0.5, bounce: 0.3, va: R.range(-14, 14) });
  }
}
function mistRing(c, n, rx, speed = 1, life = 1.1, size = 5) {   /* sương bò sát đất từ chân khối ra ngoài */
  const R = c.R, P = c.P;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU + R.range(-0.2, 0.2), ca = Math.cos(a), sa = Math.sin(a);
    part(c, K.MIST, c.ax + ca * rx, c.ay + sa * rx * 0.5 + 1, R.range(0, 2), ca * R.range(30, 60) * speed, sa * R.range(14, 28) * speed, R.range(0, 4), R.range(0.8, 1.2) * life, R.chance(0.6) ? P[1] : P[2], R.range(0.8, 1.2) * size, { drag: 2.2 });
  }
}
function glints(c, n, pts, col) { const R = c.R; for (let i = 0; i < n; i++) { const [x, y] = R.pick(pts); part(c, K.STAR, c.ax + x + R.range(-2, 2), c.ay, y + R.range(-2, 2), 0, 0, 4, R.range(0.3, 0.55), col ?? (R.chance(0.6) ? c.P[1] : c.P[0]), R.range(0.6, 2.2)); } }
/* góc / mép khối băng PixelLab (đo từ ult_suong_front khung 7–9: x −28…27,5 · y −53,5…4,5 so với chân) — z = độ cao trên chân */
const BLOCK = { x0: -26, x1: 26, z0: 2, z1: 50, y0: -6, y1: 4 };
const BLOCK_EDGE = [[-28, 40], [-14, 47], [0, 53], [14, 47], [27, 40], [27, 26], [27, 10], [0, -3], [-28, 10], [-28, 26], [-14, 3], [14, 3]];

/* ===================== CẢNH (mỗi bản nháp) =====================
   Mốc khớp ảnh PixelLab ult_suong (14 khung, 14 fps): TL = khung 5 (khối băng đóng, cú chạm 1) · TB = khung 10 (khối vỡ, cú chạm 2). */
const SCENES = {
  /* v1 — Vỡ tung + sương bò: tuyết lất phất theo gió, đóng khối thì sương giá loang dưới chân; vỡ thì mảnh băng văng–nảy–trượt, sương bò sát đất ra ngoài */
  suong_ult_v1(c) {
    const { R, P, o } = c, TL = o.tLock, TB = o.tBreak; let locked = false, broke = false;
    return {
      update(t) {
        if (t < TL && R.chance(0.7)) { const u = R.next(); part(c, K.FLAKE, c.ax - 60 + 120 * u, c.ay - 6 + 12 * u, 30 - 22 * u + R.range(-6, 6), R.range(70, 110), 20, -10, R.range(0.5, 0.8), R.chance(0.5) ? P[0] : P[1], R.range(0.6, 1.6)); }
        if (!locked && t >= TL) { locked = true; o.shake?.(0.15); mistRing(c, 8, 24, 0.5, 0.8, 4); addLight(c, c.ax, c.ay - 24, 46, P[2], 0.35, 0.3); }
        if (locked && !broke && R.chance(0.35)) glints(c, 1, BLOCK_EDGE);
        if (!broke && t >= TB) {
          broke = true; o.shake?.(0.4); o.flash?.(0.16, '214,244,255'); o.cue?.('shatter');
          shardsFrom(c, 34, BLOCK, 1); mistRing(c, 14, 22, 1, 1.2, 6);
          addLight(c, c.ax, c.ay - 24, 60, P[2], 0.5, 0.4); addLight(c, c.ax, c.ay - 24, 28, P[0], 0.5, 0.12);
        }
      },
      back(B, L, t) { const k = outCubic((t - TL) / 0.18) * (1 - smooth(TB + 0.3, TB + 1.1, t)); if (t >= TL) frostPatch(B, c, c.ax, c.ay + 1, 34 * k, 1, k < 0.98 ? 0.86 : -1); },
      front() { },
      over: t => t > TB + 1.3,
    };
  },
  /* v2 — Tinh thể mọc vòng rồi vỡ: 9 gai băng trồi lần lượt quanh khối (sau lưng cao, trước mặt thấp để thấy thú), chớp trắng 1 khung rồi vỡ vụn */
  suong_ult_v2(c) {
    const { R, P, o } = c, TL = o.tLock, TB = o.tBreak, N = 9;
    const cr = Array.from({ length: N }, (_, i) => {
      const a = -Math.PI / 2 + (i / N) * TAU + R.range(-0.12, 0.12), ca = Math.cos(a), sa = Math.sin(a), front = sa > 0.25;
      const h = front ? R.range(7, 10) : sa < -0.4 ? R.range(20, 28) : R.range(13, 18);
      return { x: ca * 34, y: sa * 15, h, w: clamp(h * 0.45, 5, 10), lean: ca * R.range(3, 7), at: TL - 0.1 + (i % 3) * 0.05 + R.range(0, 0.03), front, ph: R.next(), up: false };
    });
    let broke = false;
    return {
      update(t) {
        for (const s of cr) if (!s.up && t >= s.at) { s.up = true; o.shake?.(0.06); part(c, K.DUST, c.ax + s.x, c.ay + s.y, 0, 0, 0, 6, 0.5, P[2], 3); for (let i = 0; i < 4; i++) part(c, K.SHARD, c.ax + s.x, c.ay + s.y, 1, R.range(-40, 40), R.range(-15, 20), R.range(60, 120), R.range(0.4, 0.6), P[1], R.range(1, 2), { g: 1, drag: 0.6, bounce: 0.25, va: R.range(-15, 15) }); }
        if (!broke && t > TL && t < TB && R.chance(0.25)) { const s = R.pick(cr); part(c, K.STAR, c.ax + s.x + R.range(-2, 2), c.ay + s.y, R.range(3, s.h * 0.9), 0, 0, 3, R.range(0.3, 0.5), P[1], R.range(0.8, 2)); }
        if (!broke && t >= TB) {
          broke = true; o.shake?.(0.4); o.flash?.(0.16, '214,244,255'); o.cue?.('shatter');
          for (const s of cr) shardsFrom(c, 4 + Math.round(s.h / 5), { x0: s.x - s.w / 3, x1: s.x + s.w / 3, z0: 1, z1: s.h, y0: s.y - 1, y1: s.y + 1 }, 0.9);
          shardsFrom(c, 14, BLOCK, 0.9); mistRing(c, 10, 30, 0.8, 1, 5);
          addLight(c, c.ax, c.ay - 20, 64, P[2], 0.45, 0.35);
        }
      },
      back(B, L, t) { if (t >= TL - 0.1) frostPatch(B, c, c.ax, c.ay + 1, 40 * outCubic((t - TL + 0.1) / 0.25), 1 - smooth(TB + 0.3, TB + 1, t)); if (!broke) this.cr(B, L, t, false); },
      front(B, L, t) { if (!broke) this.cr(B, L, t, true); },
      cr(B, L, t, fr) {
        for (const s of cr) { if (s.front !== fr || t < s.at) continue; const g = outBack((t - s.at) / 0.12, 2.4), white = t > TB - 0.05 || t < s.at + 0.03, sw = (((t - s.at) * 0.8 + s.ph) % 1.4) / 0.5;
          crystal(B, P, c.X(c.ax + s.x), c.Y(c.ay + s.y), s.h * g * RES, s.w * RES, s.lean * g * RES, 1, white, sw <= 1 ? sw : -1);
          L.glow(c.X(c.ax + s.x), c.Y(c.ay + s.y, s.h * 0.5), s.h * RES, P[3], 0.12); }
      },
      over: t => t > TB + 1.25,
    };
  },
  /* FINAL (anh chọn v2, mài r3): bỏ ánh cộng to quanh từng gai (làm cỏ ám xanh) — chỉ còn chớp trắng nhỏ ở đỉnh gai lúc mọc và 1 đốm sáng gọn quanh khối lúc vỡ;
     sương giá dưới chân không mờ dither thưa dần mà CO VÀO tâm trong 0,22 s (đặc tới khung cuối); sương vỡ mờ cố định rồi tắt; mảnh băng tắt gọn. */
  suong_ult_final(c) {
    const { R, P, o } = c, TL = o.tLock, TB = o.tBreak, N = 9, END = TB + 0.3;
    const cr = Array.from({ length: N }, (_, i) => {
      const a = -Math.PI / 2 + (i / N) * TAU + R.range(-0.12, 0.12), ca = Math.cos(a), sa = Math.sin(a), front = sa > 0.25;
      const h = front ? R.range(7, 10) : sa < -0.4 ? R.range(20, 28) : R.range(13, 18);
      return { x: ca * 34, y: sa * 15, h, w: clamp(h * 0.45, 5, 10), lean: ca * R.range(3, 7), at: TL - 0.1 + (i % 3) * 0.05 + R.range(0, 0.03), front, ph: R.next(), up: false };
    });
    let broke = false;
    return {
      update(t) {
        for (const s of cr) if (!s.up && t >= s.at) { s.up = true; o.shake?.(0.06); part(c, K.DUST, c.ax + s.x, c.ay + s.y, 0, 0, 0, 6, 0.35, P[2], 2.4, { hard: 1 }); for (let i = 0; i < 4; i++) part(c, K.SHARD, c.ax + s.x, c.ay + s.y, 1, R.range(-40, 40), R.range(-15, 20), R.range(60, 120), R.range(0.35, 0.5), P[1], R.range(1, 2), { g: 1, drag: 0.6, bounce: 0.25, va: R.range(-15, 15), qf: 1 }); }
        if (!broke && t > TL && t < TB && R.chance(0.25)) { const s = R.pick(cr); part(c, K.STAR, c.ax + s.x + R.range(-2, 2), c.ay + s.y, R.range(3, s.h * 0.9), 0, 0, 3, R.range(0.3, 0.45), P[1], R.range(0.8, 2)); }
        if (!broke && t >= TB) {
          broke = true; o.shake?.(0.4); o.flash?.(0.12, '214,244,255'); o.cue?.('shatter');
          for (const s of cr) shardsFrom(c, 4 + Math.round(s.h / 5), { x0: s.x - s.w / 3, x1: s.x + s.w / 3, z0: 1, z1: s.h, y0: s.y - 1, y1: s.y + 1 }, 0.9);
          shardsFrom(c, 14, BLOCK, 0.9);
          for (const p of c.ps) { if (p.k === K.SHARD || p.k === K.CHUNK) { p.qf = 1; p.life = p.max = Math.min(p.life, R.range(0.4, 0.6)); } }
          for (let i = 0; i < 10; i++) { const a = (i / 10) * TAU + R.range(-0.2, 0.2), ca = Math.cos(a), sa = Math.sin(a); part(c, K.MIST, c.ax + ca * 30, c.ay + sa * 15 + 1, 1, ca * 40, sa * 18, 2, R.range(0.5, 0.65), R.chance(0.6) ? P[1] : P[2], R.range(4, 5.5), { drag: 2.4, hard: 1 }); }
          addLight(c, c.ax, c.ay - 18, 30, P[1], 0.4, 0.12);
        }
      },
      back(B, L, t) {
        if (t >= TL - 0.1 && t < END + 0.22) { const r = 40 * outCubic((t - TL + 0.1) / 0.25) * (1 - outCubic((t - END) / 0.22)); frostPatch(B, c, c.ax, c.ay + 1, r, 1); }
        if (!broke) this.cr(B, L, t, false);
      },
      front(B, L, t) { if (!broke) this.cr(B, L, t, true); },
      cr(B, L, t, fr) {
        for (const s of cr) { if (s.front !== fr || t < s.at) continue; const g = outBack((t - s.at) / 0.12, 2.4), white = t > TB - 0.05 || t < s.at + 0.03, sw = (((t - s.at) * 0.8 + s.ph) % 1.4) / 0.5;
          crystal(B, P, c.X(c.ax + s.x), c.Y(c.ay + s.y), s.h * g * RES, s.w * RES, s.lean * g * RES, 1, white, sw <= 1 ? sw : -1);
          if (white) L.glow(c.X(c.ax + s.x + s.lean), c.Y(c.ay + s.y, s.h), 5, P[1], 0.3); }
      },
      over: t => t > END + 0.25,
    };
  },
  /* v3 — Bão tuyết xoáy: bông tuyết + vệt gió quay elip quanh thú, siết dần tới lúc đóng khối; vỡ thì cả xoáy bung ra ngoài */
  suong_ult_v3(c) {
    const { R, P, o } = c, TL = o.tLock, TB = o.tBreak;
    const fl = Array.from({ length: 64 }, (_, i) => ({ a0: R.range(0, TAU), w: R.range(4.5, 7), r0: R.range(30, 46), z0: R.range(2, 36), t0: R.range(0, 0.3), col: R.chance(0.35) ? P[0] : R.chance(0.5) ? P[1] : P[2], big: R.chance(0.25), streak: i % 3 === 0 }));
    const pos = (f, t) => { const a = f.a0 + f.w * t, r = f.r0 * (1 - 0.4 * smooth(0, TL + 0.1, t)); return [Math.cos(a) * r, Math.sin(a) * r * 0.45, f.z0 + 4 * Math.sin(t * 5 + f.a0), a, r]; };
    let broke = false;
    return {
      update(t) {
        if (!broke && t >= TB) {
          broke = true; o.shake?.(0.35); o.flash?.(0.14, '214,244,255'); o.cue?.('shatter');
          for (const f of fl) { if (t < f.t0) continue; const [x, y, z, a, r] = pos(f, t), tx = -Math.sin(a), ty = Math.cos(a) * 0.45, out = R.range(50, 100);
            part(c, f.streak ? K.STREAK : K.FLAKE, c.ax + x, c.ay + y, z, tx * f.w * r * 0.5 + Math.cos(a) * out, ty * f.w * r * 0.5 + Math.sin(a) * out * 0.5, R.range(-10, 30), R.range(0.45, 0.8), f.col, f.big ? 1.6 : 0.8); }
          shardsFrom(c, 16, BLOCK, 0.8); mistRing(c, 8, 24, 1, 0.9, 5); addLight(c, c.ax, c.ay - 24, 56, P[2], 0.45, 0.3);
        }
      },
      back(B, L, t) {
        if (t > 0.05) {   /* xoáy sương giá trên đất: 3 nhánh xoắn quay */
          const k = smooth(0.05, 0.35, t) * (1 - smooth(TB + 0.2, TB + 0.9, t));
          for (let arm = 0; arm < 3; arm++) for (let s = 0; s < 1; s += 0.012) { const a = arm * TAU / 3 + s * 4.2 + t * 3, r = 6 + s * 38, x = c.ax + Math.cos(a) * r, y = c.ay + 1 + Math.sin(a) * r * 0.45;
            B.dot(c.X(x), c.Y(y), s > 0.8 ? P[0] : s > 0.4 ? P[1] : P[2], k * (1 - s * 0.6)); B.dot(c.X(x) + 1, c.Y(y), P[2], k * (0.7 - s * 0.6)); }
        }
        if (!broke) this.ring(B, L, t, false);
      },
      front(B, L, t) { if (!broke) this.ring(B, L, t, true); },
      ring(B, L, t, fr) {
        for (const f of fl) { if (t < f.t0) continue; const a0 = Math.min(1, (t - f.t0) / 0.15), [, , , a] = pos(f, t); if ((Math.sin(a) >= 0) !== fr) continue;
          const n = f.streak ? 4 : 1;
          for (let j = n - 1; j >= 0; j--) { const [x, y, z] = pos(f, t - j * 0.012), X = c.X(c.ax + x), Y = c.Y(c.ay + y, z); B.dot(X, Y, j ? P[3 - Math.min(1, j >> 1)] : f.col, a0 * (1 - j * 0.2)); if (!j && f.big) for (const [dx, dy] of CROSS) B.dot(X + dx, Y + dy, P[1], a0 * 0.7); }
        }
        if (fr) L.glow(c.X(c.ax), c.Y(c.ay, 18), 50, P[2], 0.12 * smooth(0, 0.3, t));
      },
      over: t => t > TB + 1,
    };
  },
  /* v4 — Đóng băng thân rồi nứt: lớp băng phủ màu lên đúng hình thú (dâng từ chân lên), gai băng nhỏ ở chân, vết nứt lan rồi vỡ theo hình thân */
  suong_ult_v4(c) {
    const { R, P, o } = c, TL = o.tLock, TB = o.tBreak, LOCK = 0.2, CRACK = TB - 0.2;
    const spires = [[-12, 0, -4], [-6, 3, -2], [7, 3, 2], [13, 0, 4]].map(([x, y, lean]) => ({ x, y, lean, h: R.range(6, 10), w: R.range(4, 6), at: TL + R.range(0, 0.08) }));
    let shell = null, cracks = [], broke = false, cracked = false;
    const level = t => clamp((t - TL) / LOCK);
    return {
      update(t) {
        if (t >= TL && !shell) { o.shake?.(0.15); o.cue?.('freeze'); addLight(c, c.ax, c.ay - 12, 40, P[2], 0.4, 0.25); mistRing(c, 6, 14, 0.5, 0.7, 3); }
        if (t >= TL) { const s = o.sil && o.sil(); if (s) shell = s; else if (!shell) shell = fakeSil(c); }
        if (shell && !cracked && t >= CRACK) { cracked = true; cracks = cracksOf(R, shell, Math.round(shell.w * R.range(0.4, 0.6)), Math.round(shell.h * R.range(0.35, 0.5)), 7); o.shake?.(0.08); }
        if (shell && t > TL + LOCK && !broke && R.chance(0.2)) { const [x, y] = silPick(R, shell); part(c, K.STAR, shell.lx + x / RES, c.ay, c.ay - (shell.ly + y / RES), 0, 0, 3, R.range(0.3, 0.5), P[0], R.range(0.6, 1.8)); }
        if (!broke && t >= TB) {
          broke = true; o.shake?.(0.4); o.flash?.(0.16, '214,244,255'); o.cue?.('shatter');
          if (shell) for (let i = 0; i < 40; i++) { const [x, y] = silPick(R, shell), lx = shell.lx + x / RES - c.ax, z = c.ay - (shell.ly + y / RES), ch = R.chance(0.2), sp = R.range(50, 120);
            part(c, ch ? K.CHUNK : K.SHARD, c.ax + lx, c.ay + R.range(-2, 3), z, Math.sign(lx || R.sign()) * sp * R.range(0.4, 1) + R.range(-20, 20), R.range(-20, 40), R.range(40, 130), R.range(0.7, 1.1), mix(shell.data[y * shell.w + x] || P[2], P[2], 0.6), ch ? R.range(1.2, 2) : R.range(1.2, 2.8), { g: 1, drag: 0.5, bounce: 0.3, va: R.range(-15, 15) }); }
          shardsFrom(c, 10, BLOCK, 0.8); mistRing(c, 12, 18, 1, 1.1, 5); addLight(c, c.ax, c.ay - 14, 50, P[2], 0.5, 0.35); addLight(c, c.ax, c.ay - 14, 22, P[0], 0.45, 0.1);
        }
      },
      back(B, L, t) { if (t >= TL) frostPatch(B, c, c.ax, c.ay + 1, 22 * outCubic((t - TL) / 0.15), 1 - smooth(TB + 0.3, TB + 1, t)); },
      front(B, L, t) {
        if (broke || !shell || t < TL) return; const lv = level(t), s = shell, X0 = c.X(s.lx), Y0 = c.Y(s.ly), cut = s.h * (1 - lv);
        for (let y = 0; y < s.h; y++) { if (y < cut) continue; for (let x = 0; x < s.w; x++) { const col = s.data[y * s.w + x]; if (!(col >>> 24)) continue;
          const top = y === 0 || !(s.data[(y - 1) * s.w + x] >>> 24), lit = top || !(s.data[y * s.w + x - 1] >>> 24);
          B.set(X0 + x, Y0 + y, lit ? P[0] : mix(col, (x + y) & 4 ? P[2] : P[3], 0.42)); } }
        if (lv < 1) for (let x = 0; x < s.w; x++) if (s.data[Math.floor(cut) * s.w + x] >>> 24) B.dot(X0 + x, Y0 + Math.floor(cut), hash(x, 5) < 0.6 ? P[0] : P[1]);
        for (const p of spires) { const g = outBack(clamp((t - p.at) / 0.12), 2.4); if (g > 0) crystal(B, P, c.X(c.ax + p.x), c.Y(c.ay + p.y), p.h * g * RES, p.w * RES, p.lean * g * RES, 1, t < p.at + 0.04 || t > TB - 0.05); }
        if (cracked) drawCracks(B, P, X0, Y0, cracks, clamp((t - CRACK) / 0.18), t - CRACK);
        L.glow(c.X(c.ax), c.Y(c.ay, 12), 34, P[3], 0.18 * lv);
      },
      over: t => t > TB + 1.2,
    };
  },
  /* v5 — Bụi kim cương (nhẹ): chỉ lấp lánh ở mép khối + bụi băng li ti bay lên, vỡ thì sao băng nhỏ toả ra + ít mảnh; tôn khối PixelLab, gần như không che */
  suong_ult_v5(c) {
    const { R, P, o } = c, TL = o.tLock, TB = o.tBreak; let broke = false, locked = false;
    return {
      update(t) {
        if (t < TL && R.chance(0.45)) { const u = R.next(); part(c, K.STREAK, c.ax - 58 + 110 * u, c.ay - 4 + 10 * u, 30 - 22 * u, R.range(60, 90), 14, -6, R.range(0.25, 0.4), P[1], 1); }
        if (!locked && t >= TL) { locked = true; o.shake?.(0.12); glints(c, 6, BLOCK_EDGE); addLight(c, c.ax, c.ay - 24, 40, P[2], 0.3, 0.3); }
        if (locked && !broke) { if (R.chance(0.45)) glints(c, 1, BLOCK_EDGE); if (R.chance(0.6)) part(c, K.STAR, c.ax + R.range(-26, 26), c.ay + R.range(-4, 4), R.range(0, 40), 0, 0, R.range(8, 16), R.range(0.4, 0.7), R.chance(0.5) ? P[0] : P[1], 0.5); }
        if (!broke && t >= TB) {
          broke = true; o.shake?.(0.3); o.flash?.(0.12, '214,244,255'); o.cue?.('shatter');
          for (let i = 0; i < 18; i++) { const a = R.range(0, TAU), sp = R.range(60, 130); part(c, K.STAR, c.ax + Math.cos(a) * 8, c.ay + Math.sin(a) * 4, 24 + Math.sin(a) * 12, Math.cos(a) * sp, Math.sin(a) * sp * 0.5, Math.sin(a) * sp * 0.5, R.range(0.35, 0.6), R.chance(0.5) ? P[0] : P[1], R.range(1, 2.4)); }
          shardsFrom(c, 8, BLOCK, 0.7); mistRing(c, 6, 20, 0.6, 0.8, 4); addLight(c, c.ax, c.ay - 24, 44, P[2], 0.4, 0.25);
        }
      },
      back() { }, front() { },
      over: t => t > TB + 1,
    };
  },
  /* v6 — Vòng sương giá lan (nova): đóng khối thì vòng băng giá lan nhanh trên đất kèm sương ở mép; vỡ thì vòng xung sáng mỏng + mảnh văng thấp toả tròn */
  suong_ult_v6(c) {
    const { R, P, o } = c, TL = o.tLock, TB = o.tBreak, REACH = 40, SPREAD = 0.3; let locked = false, broke = false;
    const fr = t => (t < TL ? 0 : REACH * outCubic((t - TL) / SPREAD));
    return {
      update(t) {
        if (!locked && t >= TL) { locked = true; o.shake?.(0.2); addLight(c, c.ax, c.ay, 50, P[2], 0.35, 0.3); }
        if (locked && t < TL + SPREAD) for (let i = 0; i < 2; i++) { const a = R.range(0, TAU), r = fr(t); part(c, K.MIST, c.ax + Math.cos(a) * r, c.ay + Math.sin(a) * r * 0.5, 0, Math.cos(a) * 30, Math.sin(a) * 15, 4, R.range(0.5, 0.8), R.chance(0.6) ? P[1] : P[2], R.range(3, 5)); }
        if (locked && !broke && R.chance(0.3)) { const a = R.range(0, TAU), r = R.range(8, fr(t)); part(c, K.STAR, c.ax + Math.cos(a) * r, c.ay + Math.sin(a) * r * 0.5, 1, 0, 0, 3, R.range(0.3, 0.5), P[1], R.range(0.6, 1.6)); }
        if (!broke && t >= TB) {
          broke = true; o.shake?.(0.4); o.flash?.(0.14, '214,244,255'); o.cue?.('shatter');
          for (let i = 0; i < 26; i++) { const a = (i / 26) * TAU + R.range(-0.1, 0.1), sp = R.range(80, 150), ch = R.chance(0.2);
            part(c, ch ? K.CHUNK : K.SHARD, c.ax + Math.cos(a) * 14, c.ay + Math.sin(a) * 6, R.range(4, 30), Math.cos(a) * sp, Math.sin(a) * sp * 0.5, R.range(20, 70), R.range(0.6, 1), R.pick([P[1], P[2], P[3]]), ch ? R.range(1.2, 2) : R.range(1.5, 3), { g: 1, drag: 0.6, bounce: 0.25, va: R.range(-12, 12) }); }
          addLight(c, c.ax, c.ay - 20, 60, P[2], 0.45, 0.3);
        }
      },
      back(B, L, t) {
        if (t >= TL) { const r = fr(t), out = 1 - smooth(TB + 0.2, TB + 1, t); frostPatch(B, c, c.ax, c.ay + 1, r, out, t < TL + SPREAD ? 0.88 : -1);
          if (t < TL + SPREAD + 0.1) { const k = 1 - clamp((t - TL) / (SPREAD + 0.1)); for (let j = 0, n = Math.ceil(r * RES * 7); j < n; j++) { const a = j / n * TAU; L.glow(c.X(c.ax + Math.cos(a) * r), c.Y(c.ay + 1 + Math.sin(a) * r * 0.5), 5, P[2], 0.05 * k); } } }
        if (broke) this.wave(B, t, false);
      },
      front(B, L, t) { if (broke) this.wave(B, t, true); },
      wave(B, t, frontHalf) {   /* vòng xung sáng mỏng trên đất, nửa sau vẽ ở back, nửa trước ở front */
        const u = clamp((t - TB) / 0.28); if (u >= 1) return; const r = 12 + 44 * outCubic(u), th = Math.max(1, 3 * (1 - u)) * RES, k = (u < 0.6 ? 0.85 : 0.85 * (1 - u) / 0.4);
        for (let j = 0, n = Math.ceil(r * TAU * RES * 0.8); j < n; j++) { const a = (j / n) * TAU; if ((Math.sin(a) >= 0) !== frontHalf) continue;
          for (let q = 0; q < th; q += 0.7) { const rr = r - q / RES; B.dot(c.X(c.ax + Math.cos(a) * rr), c.Y(c.ay + 1 + Math.sin(a) * rr * 0.5), q < 1 ? P[1] : q < th * 0.5 ? P[2] : P[3], k * (1.1 - q / th)); } }
      },
      over: t => t > TB + 1.1,
    };
  },
};

/* ---------- hình thú (silhouette) cho cảnh đóng băng ---------- */
const SILC = new Map();
/* silOf(img, sx, sy, sw, sh, lx, ly, lw, lh, flip): cắt khung sprite → {lx, ly (logic, góc trái trên), w, h (điểm đệm), data Uint32} — canvas tạm KHÔNG __hi */
export function silOf(img, sx, sy, sw, sh, lx, ly, lw, lh, flip = false) {
  const key = (img.src || img.__id || 'x') + '|' + sx + '|' + sy + '|' + (flip ? 1 : 0) + '|' + lw;
  let s = SILC.get(key);
  if (!s) { const w = Math.round(lw * RES), h = Math.round(lh * RES), cv = mkCanvas(w, h), g = cv.getContext('2d'); g.imageSmoothingEnabled = false;
    if (flip) { g.translate(w, 0); g.scale(-1, 1); } g.drawImage(img, sx, sy, sw, sh, 0, 0, w, h);
    s = { w, h, data: new Uint32Array(g.getImageData(0, 0, w, h).data.buffer.slice(0)) }; for (let i = 0; i < s.data.length; i++) if ((s.data[i] >>> 24) < 128) s.data[i] = 0; SILC.set(key, s); if (SILC.size > 64) SILC.delete(SILC.keys().next().value); }
  return { lx, ly, w: s.w, h: s.h, data: s.data };
}
function fakeSil(c) { const w = 24 * RES, h = 22 * RES, data = new Uint32Array(w * h); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const dx = (x - w / 2) / (w / 2), dy = (y - h * 0.55) / (h * 0.5); if (dx * dx + dy * dy < 1) data[y * w + x] = c.P[3]; } return { lx: c.ax - 12, ly: c.ay - 22, w, h, data }; }
function silPick(R, s) { for (let k = 0; k < 30; k++) { const x = R.int(0, s.w - 1), y = R.int(0, s.h - 1); if (s.data[y * s.w + x] >>> 24) return [x, y]; } return [s.w >> 1, s.h >> 1]; }
function cracksOf(R, s, ix, iy, n) {   /* chuyển thể ice.ts cracksOf */
  const out = [], inside = (x, y) => x >= 0 && y >= 0 && x < s.w && y < s.h && (s.data[Math.floor(y) * s.w + Math.floor(x)] >>> 24) > 0;
  const walk = (x, y, a, len) => { const pts = [[x, y]]; for (let i = 0; i < len; i++) { a += R.range(-0.55, 0.55); x += Math.cos(a) * R.range(1.5, 2.6); y += Math.sin(a) * R.range(1.5, 2.6); if (!inside(x, y)) break; pts.push([x, y]); if (pts.length > 3 && out.length < n * 2 && R.chance(0.12)) walk(x, y, a + R.sign() * R.range(0.6, 1.2), len / 2); } out.push(pts); };
  for (let i = 0; i < n; i++) walk(ix, iy, (i / n) * TAU + R.range(-0.3, 0.3), 30);
  return out;
}
function drawCracks(B, P, X0, Y0, cracks, k, age) {
  for (const pts of cracks) for (let i = 0, n = Math.floor(pts.length * k); i < n; i++) { const [x, y] = pts[i], px = Math.floor(X0 + x), py = Math.floor(Y0 + y), fresh = i > n - 3 && age < 0.2; B.set(px, py, fresh ? P[0] : P[6]); if (!fresh) B.set(px, py - 1, P[0]); }
}

/* ---------- hiệu ứng + quản lý ---------- */
export function create(kind, o = {}) {
  const S = SCENES[kind]; if (!S) return null;
  o = { tLock: 5 / 14, tBreak: 10 / 14, type: 'suong', ...o };
  const BW = o.bw ?? 160, BH = o.bh ?? 120, UP = o.up ?? 80;   /* hộp vẽ logic quanh chân: rộng BW, cao BH, UP px phía trên chân */
  const c = { o, R: new Rng(o.seed ?? 1), P: PAL[o.type] || PAL.suong, ax: o.x, ay: o.y, x0: Math.round(o.x - BW / 2), y0: Math.round(o.y - UP), ps: [], lights: [], t: 0 };
  c.X = x => (x - c.x0) * RES; c.Y = (y, z = 0) => (y - z - c.y0) * RES;
  const back = new Buf(BW * RES, BH * RES), front = new Buf(BW * RES, BH * RES), light = new LBuf(BW * RES, BH * RES), sc = S(c);
  let stale = true;
  const render = () => {
    back.clear(); front.clear(); light.clear();
    sc.back(back, light, c.t);
    for (const p of c.ps) if (p.y < c.ay) drawPart(back, light, c, p);
    sc.front(front, light, c.t);
    for (const p of c.ps) if (p.y >= c.ay) drawPart(front, light, c, p);
    for (const l of c.lights) { const k = l.life / l.max; light.glow(c.X(l.x), c.Y(l.y), l.r * RES * (0.55 + 0.45 * k), l.col, l.k * k * k); }
    stale = false;
  };
  const blit = (g, b, cx, cy, add) => { if (!b.n) return; const cv = b.canvas(); if (add) { g.save(); g.globalCompositeOperation = 'lighter'; } g.drawImage(cv, 0, 0, b.w, b.h, c.x0 - cx, c.y0 - cy, BW, BH); if (add) g.restore(); };
  return {
    kind, ky: o.y, c,
    get t() { return c.t; },
    update(dt) { c.t += dt; sc.update(c.t); stepParts(c, dt); for (let i = c.lights.length - 1; i >= 0; i--) if ((c.lights[i].life -= dt) <= 0) c.lights.splice(i, 1); stale = true; },
    draw(g, layer, cx, cy) { if (stale) render(); if (layer === 'back') blit(g, back, cx, cy); else if (layer === 'front') blit(g, front, cx, cy); else blit(g, light, cx, cy, true); },
    done: () => sc.over(c.t) && c.ps.length === 0,
    stats() { let nb = 0, nf = 0; for (const v of back.data) if (v) nb++; for (const v of front.data) if (v) nf++; return { parts: c.ps.length, back: nb, front: nf, frontBuf: front }; },
  };
}
export function addScenes(o) { Object.assign(SCENES, o); }   /* pxfx-ult.js đăng ký cảnh tuyệt chiêu 11 hệ */
export const KIT = { Rng, K, part, addLight, shardsFrom, crystal, frostPatch, ditherOval, line, mix, scaleC, hex, rgb, bayer, hash, hash2, clamp, lerp, smooth, outCubic, outBack, silPick, CROSS, DIAG, TAU, RES };
export const KINDS = () => Object.keys(SCENES);
export const PXFX = {
  list: [], PAL, RES, KINDS, silOf, create, addScenes,
  spawn(kind, o) { const e = create(kind, o); if (e) this.list.push(e); return e; },
  update(dt) { for (const e of this.list) e.update(dt); this.list = this.list.filter(e => !e.done()); },
  drawables(out, g, cx, cy) { for (const e of this.list) { out.push({ y: e.ky - 0.5, f: () => e.draw(g, 'back', cx, cy) }); out.push({ y: e.ky + 0.7, f: () => e.draw(g, 'front', cx, cy) }); out.push({ y: e.ky + 0.8, f: () => e.draw(g, 'light', cx, cy) }); } },
  clear() { this.list = []; },
};
export default PXFX;
