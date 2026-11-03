/* pxfx113.js — p114fx (03/11/2026): LÕI VFX MỚI theo cách pixelfx (bộ đệm màu + bộ đệm sáng, bảng 8 bậc đổi bằng 1 tham số, dither Bayer, khung "move").
   Viết lại theo phong cách game-seismic từ ý tưởng / công thức của:
     pixelfx (https://github.com/patch-gg/pixelfx) — MIT License, Copyright (c) 2026 Patch, Copyright (c) 2026 Hugo Duprez
       (src/core/painter.js, fx.js, sim.js, color.js; sim.js gốc chuyển thể từ Sprite Fusion pixel-art-vfx, MIT, (c) 2026 Hugo Duprez);
     cách diễn đòn wind-up → hit-stop → reaction → recovery theo pixelfx src/core/act.js (gốc Hollow Crown, MIT, (c) 2026 rehan-remade).
   Toàn văn giấy phép MIT: "Permission is hereby granted, free of charge, to any person obtaining a copy of this software ... THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND."
   Không chép nguyên hiệu ứng nào của họ — chỉ kỹ thuật (bộ đệm, hạt, ánh sáng, vòng nghiêng, khung đòn).

   ĐƠN VỊ: painter làm việc theo ĐIỂM (1 điểm = 0,5 px logic, RES 2 như skill vfx-code). Toạ độ thế giới logic (x, y) → điểm = x*2, y*2.
   Mỗi hiệu ứng (Inst) có khung riêng (Frame) bao quanh nó; vẽ xong thì putImageData vùng bẩn rồi drawImage 1 lần (màu) + 1 lần 'lighter' (sáng).
   Màu = số 32 bit kiểu ImageData (R thấp). Bảng màu ramp: TỐI → SÁNG (quy ước pixelfx), 8 bậc; đổi màu: pal(tên | mảng, { hue, sat, val }). */

/* ---------------- toán ---------------- */
export const TAU = Math.PI * 2;
export const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, u) => a + (b - a) * u;
export const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
export const bump = (u) => (u <= 0 || u >= 1 ? 0 : Math.sin(u * Math.PI));
export const ease = { outCubic: u => 1 - (1 - u) ** 3, outQuart: u => 1 - (1 - u) ** 4, outExpo: u => (u >= 1 ? 1 : 1 - 2 ** (-10 * u)), inQuad: u => u * u, inCubic: u => u * u * u, outBack: u => { const c = 1.7; return 1 + (c + 1) * (u - 1) ** 3 + c * (u - 1) ** 2; } };
export class Rng { constructor(s = 1) { this.s = (s * 2654435761) >>> 0 || 1; } next() { let t = (this.s += 0x6d2b79f5); t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
  range(a, b) { return a + (b - a) * this.next(); } int(a, b) { return Math.floor(this.range(a, b + 1)); } sign() { return this.next() < 0.5 ? -1 : 1; } chance(p) { return this.next() < p; } pick(a) { return a[Math.floor(this.next() * a.length)]; } }

/* ---------------- màu ---------------- */
export const rgb = (r, g, b) => ((255 << 24) | ((b & 255) << 16) | ((g & 255) << 8) | (r & 255)) >>> 0;
const R_ = c => c & 255, G_ = c => (c >>> 8) & 255, B_ = c => (c >>> 16) & 255;
export function hex(h) { if (typeof h === 'number') return h; let s = h.replace('#', ''); if (s.length === 3) s = s[0] + s[0] + s[1] + s[1] + s[2] + s[2]; const v = parseInt(s.slice(0, 6), 16); return rgb((v >> 16) & 255, (v >> 8) & 255, v & 255); }
export const css = c => '#' + [R_(c), G_(c), B_(c)].map(v => v.toString(16).padStart(2, '0')).join('');
export const mix = (a, b, t) => { t = clamp(t); return rgb(R_(a) + (R_(b) - R_(a)) * t, G_(a) + (G_(b) - G_(a)) * t, B_(a) + (B_(b) - B_(a)) * t); };
export const scale = (c, k) => rgb(Math.min(255, R_(c) * k), Math.min(255, G_(c) * k), Math.min(255, B_(c) * k));
export const WHITE = hex('#ffffff'), INK = hex('#0b0a10');
export function fit(r, n) { r = r.map(hex); if (r.length === n) return r; return Array.from({ length: n }, (_, i) => r[Math.round((i * (r.length - 1)) / Math.max(1, n - 1))]); }
export const at = (r, t) => r[clamp(Math.floor(t * r.length), 0, r.length - 1)];
function toHsv(c) { const r = R_(c) / 255, g = G_(c) / 255, b = B_(c) / 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn; let h = 0;
  if (d) h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; return [(h * 60 + 360) % 360, mx ? d / mx : 0, mx]; }
function fromHsv(h, s, v) { const c = v * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = v - c; const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return rgb((r + m) * 255, (g + m) * 255, (b + m) * 255); }
/* Bảng màu dùng chung (TỐI → SÁNG, 8 bậc). Đo / nắn từ bảng game (elyz95 PAL, fx78 SKIN.rocky) — cùng tông game, không lè loẹt. */
export const PAL113 = {
  ma: ['#04161c', '#082c38', '#0c4652', '#12636e', '#1f8a86', '#3fb3a3', '#8fd8c4', '#ecfcf3'],      /* Elyziuma: ngọc lam (Mã) */
  dau: ['#24060c', '#4a0f18', '#7a1c26', '#a82c34', '#c53731', '#e5574a', '#ff9a86', '#ffe2d8'],     /* mực đỏ con dấu */
  trieu: ['#081a30', '#0e3254', '#154c7a', '#1d6aa0', '#2f93c4', '#5cc3e0', '#a8e6f4', '#e6fbff'],
  navy: ['#05060e', '#0b0d1e', '#121630', '#1a1f3c', '#262e51', '#3e4680', '#6a74b0', '#9aa4d8'],
  kinh: ['#0c2a30', '#1b4c52', '#3a7a78', '#6fb0a4', '#a8dcc8', '#d8f4e8', '#f4fff8', '#ffffff'],    /* ánh kính: trắng ngọc */
  rocky: ['#15110d', '#2b251f', '#453b32', '#615548', '#847661', '#aa9c88', '#d2c6b2', '#f2ebe0'],
  magma: ['#1c0806', '#4a1410', '#8a2a12', '#c8501a', '#f08a2a', '#ffc85a', '#ffe9a0', '#fff8e0'],   /* vân nứt cam trên đá Rocky */
  dust: ['#1c1610', '#33281c', '#4f3f2c', '#6e5a40', '#8a7258', '#b39a7c', '#d8c4a4', '#efe2c8'],
  gold: ['#1e1206', '#4a2c08', '#86520c', '#c48412', '#f0b424', '#ffe066', '#fff6c4', '#ffffff'],
  fire: ['#1f0b10', '#4a1118', '#8c1d1c', '#cc3a1a', '#f2701f', '#ffae35', '#ffe27a', '#fff8d6'],
  ice: ['#0c1430', '#162c5c', '#1f4f94', '#2f7fcc', '#58b4ec', '#9bdcff', '#d8f4ff', '#ffffff'],
  arcane: ['#140a26', '#2b1252', '#481c88', '#6b2cc0', '#9a48ec', '#c684ff', '#ecc8ff', '#ffffff'],
  shadow: ['#050308', '#0f0a18', '#1c1230', '#2c1a4a', '#432468', '#5e3290', '#8048b8', '#a970e0'],
  leaf: ['#0c1a0e', '#163418', '#225224', '#357530', '#4f9a3a', '#7cc048', '#b4e070', '#e4ffb0'],
  volt: ['#24160a', '#5e3a0c', '#a8680f', '#e8a218', '#ffd23c', '#fff08a', '#fffbd0', '#ffffff'],
};
/* ĐỔI MÀU BẰNG 1 THAM SỐ: pal('ma') | pal(['#..',…]) | pal('ma', { hue: 120 }) (xoay sắc độ, giữ độ sáng từng bậc → ramp vẫn đúng tối→sáng). */
export function pal(p, o = {}) {
  let r = (typeof p === 'string' ? PAL113[p] || PAL113.ma : p || PAL113.ma).map(hex); r = fit(r, 8);
  if (o.hue || o.sat !== undefined || o.val !== undefined) r = r.map(c => { const [h, s, v] = toHsv(c); return fromHsv((h + (o.hue || 0) + 360) % 360, clamp(s * (o.sat ?? 1)), clamp(v * (o.val ?? 1))); });
  return r;
}

/* ---------------- bộ đệm khung + dither ---------------- */
const BAY = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + 0.5) / 16);
export const bayer = (x, y) => BAY[((Math.floor(y) & 3) << 2) | (Math.floor(x) & 3)];
export function createFrame(w, h) { return { w, h, ox: 0, oy: 0, color: new Uint32Array(w * h), light: new Uint32Array(w * h), x0: w, y0: h, x1: -1, y1: -1 }; }
export function clearFrame(f) { if (f.x1 < f.x0) return f; for (let y = f.y0; y <= f.y1; y++) { const i = y * f.w; f.color.fill(0, i + f.x0, i + f.x1 + 1); f.light.fill(0, i + f.x0, i + f.x1 + 1); } f.x0 = f.w; f.y0 = f.h; f.x1 = -1; f.y1 = -1; return f; }
const call = (v, ...a) => (typeof v === 'function' ? v(...a) : v);
const OUT = { c: 0, a: 1, l: 0, k: 0 };

/* Painter: cùng API rút gọn như pixelfx (px dot blend disc line beam circle ellipse ring arc poly shade glow glowLine glowRing), đơn vị = ĐIỂM. */
export class Painter {
  constructor(f) { this.f = f; this.reset(); }
  reset() { const f = this.f; this.w = f.w; this.h = f.h; this.ox = f.ox | 0; this.oy = f.oy | 0; this.C = f.color; this.L = f.light; this.tx = 0; this.ty = 0; this.fx = 1; this.cs = 1; this.sn = 0; this.fade = 1; this.lightK = 1; return this; }
  place(x, y, flip = false, ang = 0) { this.tx = x; this.ty = y; this.fx = flip ? -1 : 1; this.cs = Math.cos(ang); this.sn = Math.sin(ang); return this; }
  toX(x, y) { return this.tx + x * this.fx * this.cs - y * this.sn; } toY(x, y) { return this.ty + x * this.fx * this.sn + y * this.cs; }
  fromX(sx, sy) { const dx = sx - this.tx, dy = sy - this.ty; return (dx * this.cs + dy * this.sn) * this.fx; } fromY(sx, sy) { const dx = sx - this.tx, dy = sy - this.ty; return -dx * this.sn + dy * this.cs; }
  cellX(x, y) { return Math.floor(this.toX(Math.floor(x) + 0.5, Math.floor(y) + 0.5)); } cellY(x, y) { return Math.floor(this.toY(Math.floor(x) + 0.5, Math.floor(y) + 0.5)); }
  _d(x, y) { const f = this.f; if (x < f.x0) f.x0 = x; if (x > f.x1) f.x1 = x; if (y < f.y0) f.y0 = y; if (y > f.y1) f.y1 = y; }
  put(sx, sy, c, a = 1) { if (!c) return; a *= this.fade; if (a < 1 && a <= BAY[((sy & 3) << 2) | (sx & 3)]) return; const x = sx - this.ox, y = sy - this.oy; if (x < 0 || y < 0 || x >= this.w || y >= this.h) return; this.C[y * this.w + x] = c; this._d(x, y); }
  add(sx, sy, c, k = 1) { k *= this.fade * this.lightK; if (k <= 0.004) return; const x = sx - this.ox, y = sy - this.oy; if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const i = y * this.w + x, d = this.L[i], r = Math.min(255, (d & 255) + (c & 255) * k) | 0, g = Math.min(255, ((d >>> 8) & 255) + ((c >>> 8) & 255) * k) | 0, b = Math.min(255, ((d >>> 16) & 255) + ((c >>> 16) & 255) * k) | 0;
    this.L[i] = ((255 << 24) | (b << 16) | (g << 8) | r) >>> 0; this._d(x, y); }
  blendPx(sx, sy, c, a) { a *= this.fade; if (!c || a <= 0.004) return; const x = sx - this.ox, y = sy - this.oy; if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const i = y * this.w + x, d = this.C[i], da = (d >>> 24) / 255, oa = a + da * (1 - a), k = a / oa, ch = s => ((((c >>> s) & 255) * k + ((d >>> s) & 255) * (1 - k)) & 255);
    this.C[i] = ((((oa * 255) & 255) << 24) | (ch(16) << 16) | (ch(8) << 8) | ch(0)) >>> 0; this._d(x, y); }
  px(x, y, c) { this.put(this.cellX(x, y), this.cellY(x, y), c, 1); }
  dot(x, y, c, a = 1) { if (a > 0) this.put(this.cellX(x, y), this.cellY(x, y), c, a); }
  blend(x, y, c, a) { this.blendPx(this.cellX(x, y), this.cellY(x, y), c, a); }
  light(x, y, c, k = 1) { this.add(this.cellX(x, y), this.cellY(x, y), c, k); }
  each(x0, y0, x1, y1, fn) { let ax = 1e9, bx = -1e9, ay = 1e9, by = -1e9;
    for (let k = 0; k < 4; k++) { const x = k & 1 ? x1 : x0, y = k & 2 ? y1 : y0, sx = this.toX(x, y), sy = this.toY(x, y); if (sx < ax) ax = sx; if (sx > bx) bx = sx; if (sy < ay) ay = sy; if (sy > by) by = sy; }
    const sx0 = Math.max(Math.floor(ax), this.ox), sx1 = Math.min(Math.ceil(bx), this.ox + this.w - 1), sy0 = Math.max(Math.floor(ay), this.oy), sy1 = Math.min(Math.ceil(by), this.oy + this.h - 1);
    for (let sy = sy0; sy <= sy1; sy++) for (let sx = sx0; sx <= sx1; sx++) { const cx = sx + 0.5, cy = sy + 0.5; fn(this.fromX(cx, cy), this.fromY(cx, cy), sx, sy); } }
  shade(x0, y0, x1, y1, fn) { const o = OUT; this.each(x0, y0, x1, y1, (lx, ly, sx, sy) => { o.c = 0; o.a = 1; o.l = 0; o.k = 0; const c = fn(lx, ly, o) || o.c; if (c) this.put(sx, sy, c, o.a); if (o.k > 0) this.add(sx, sy, o.l || c, o.k); }); }
  disc(cx, cy, r, c, a) { if (r < 0.5) return this.blend(cx, cy, call(c, 0, 0), call(a, 0, 0)); this.each(cx - r, cy - r, cx + r, cy + r, (x, y, sx, sy) => { const dx = x - cx, dy = y - cy, d2 = dx * dx + dy * dy; if (d2 > r * r) return; const d = Math.sqrt(d2) / r, an = Math.atan2(dy, dx); this.blendPx(sx, sy, call(c, d, an), call(a, d, an)); }); }
  line(x0, y0, x1, y1, c, a = 1) { let sx = this.cellX(x0, y0), sy = this.cellY(x0, y0); const ex = this.cellX(x1, y1), ey = this.cellY(x1, y1), dx = Math.abs(ex - sx), dy = -Math.abs(ey - sy), stx = sx < ex ? 1 : -1, sty = sy < ey ? 1 : -1, n = Math.max(dx, -dy) || 1, fc = typeof c === 'function', fa = typeof a === 'function'; let err = dx + dy, i = 0;
    for (let g = 0; g < 4096; g++) { const u = i++ / n; this.put(sx, sy, fc ? c(u) : c, fa ? a(u) : a); if (sx === ex && sy === ey) break; const e2 = 2 * err; if (e2 >= dy) { err += dy; sx += stx; } if (e2 <= dx) { err += dx; sy += sty; } } }
  beam(x0, y0, x1, y1, w, c, a = 1) { const r = w / 2, dx = x1 - x0, dy = y1 - y0, L2 = dx * dx + dy * dy || 1e-9; this.shade(Math.min(x0, x1) - r, Math.min(y0, y1) - r, Math.max(x0, x1) + r, Math.max(y0, y1) + r, (x, y, o) => { const u = clamp(((x - x0) * dx + (y - y0) * dy) / L2), px = x0 + dx * u - x, py = y0 + dy * u - y, d2 = px * px + py * py; if (d2 > r * r) return; const v = Math.sqrt(d2) / r; o.c = call(c, u, v); o.a = call(a, u, v); }); }
  circle(cx, cy, r, c, a = 1) { if (r < 0.6) return this.dot(cx, cy, call(c, 0, 0), call(a, 0, 0)); this.shade(cx - r, cy - r, cx + r, cy + r, (x, y, o) => { const dx = x - cx, dy = y - cy, d2 = dx * dx + dy * dy; if (d2 > r * r) return; const d = Math.sqrt(d2) / r; o.c = call(c, d, Math.atan2(dy, dx)); o.a = call(a, d, 0); }); }
  ellipse(cx, cy, rx, ry, c, a = 1) { if (rx <= 0 || ry <= 0) return; this.shade(cx - rx, cy - ry, cx + rx, cy + ry, (x, y, o) => { const dx = (x - cx) / rx, dy = (y - cy) / ry, d2 = dx * dx + dy * dy; if (d2 > 1) return; const d = Math.sqrt(d2), an = Math.atan2(dy, dx); o.c = call(c, d, an); o.a = call(a, d, an); }); }
  ring(cx, cy, r, w, c, a = 1) { const r0 = Math.max(0, r - w); this.shade(cx - r, cy - r, cx + r, cy + r, (x, y, o) => { const dx = x - cx, dy = y - cy, d2 = dx * dx + dy * dy; if (d2 > r * r || d2 < r0 * r0) return; const v = w > 0 ? (Math.sqrt(d2) - r0) / (r - r0 || 1) : 1, an = Math.atan2(dy, dx); o.c = call(c, v, an); o.a = call(a, v, an); }); }
  arc(cx, cy, r, w, a0, a1, c, a = 1) { const span = a1 - a0, wf = typeof w === 'function'; this.shade(cx - r, cy - r, cx + r, cy + r, (x, y, o) => { const dx = x - cx, dy = y - cy, d = Math.sqrt(dx * dx + dy * dy); if (d > r) return; let an = Math.atan2(dy, dx) - a0; an -= Math.floor(an / TAU) * TAU; if (an > span) return; const u = an / span, ww = wf ? w(u) : w; if (ww <= 0 || d < r - ww) return; o.c = call(c, u, (d - (r - ww)) / ww); o.a = call(a, u, (d - (r - ww)) / ww); }); }
  poly(pts, c, a = 1) { let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const [x, y] of pts) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; } const n = pts.length;
    this.shade(x0, y0, x1, y1, (x, y, o) => { let ins = false; for (let i = 0, j = n - 1; i < n; j = i++) { const [xi, yi] = pts[i], [xj, yj] = pts[j]; if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) ins = !ins; } if (!ins) return; o.c = call(c, x, y); o.a = call(a, x, y); }); }
  glow(x, y, r, c, k = 0.5) { if (r < 1 || k <= 0.004) return; const cx = this.toX(x, y), cy = this.toY(x, y), x0 = Math.floor(cx - r), x1 = Math.ceil(cx + r), y0 = Math.floor(cy - r), y1 = Math.ceil(cy + r);
    for (let sy = y0; sy <= y1; sy++) { const dy = (sy + 0.5 - cy) / r; for (let sx = x0; sx <= x1; sx++) { const dx = (sx + 0.5 - cx) / r, d = dx * dx + dy * dy; if (d >= 1) continue; const f = 1 - Math.sqrt(d); this.add(sx, sy, c, f * f * k); } } }
  glowLine(x0, y0, x1, y1, r, c, k = 0.5) { if (r < 1 || k <= 0.004) return; const ax = this.toX(x0, y0), ay = this.toY(x0, y0), bx = this.toX(x1, y1), by = this.toY(x1, y1), dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy || 1e-9;
    for (let sy = Math.floor(Math.min(ay, by) - r); sy <= Math.ceil(Math.max(ay, by) + r); sy++) for (let sx = Math.floor(Math.min(ax, bx) - r); sx <= Math.ceil(Math.max(ax, bx) + r); sx++) { const px = sx + 0.5, py = sy + 0.5, u = clamp(((px - ax) * dx + (py - ay) * dy) / L2), ex = ax + dx * u - px, ey = ay + dy * u - py, d = Math.sqrt(ex * ex + ey * ey) / r; if (d >= 1) continue; const f = 1 - d; this.add(sx, sy, c, f * f * k); } }
  glowRing(x, y, R, r, c, k = 0.5, sy0 = 1) { if (r < 1 || k <= 0.004) return; const cx = this.toX(x, y), cy = this.toY(x, y), E = R + r;
    for (let sy = Math.floor(cy - E * sy0); sy <= Math.ceil(cy + E * sy0); sy++) for (let sx = Math.floor(cx - E); sx <= Math.ceil(cx + E); sx++) { const d = Math.abs(Math.hypot(sx + 0.5 - cx, (sy + 0.5 - cy) / sy0) - R) / r; if (d >= 1) continue; const f = 1 - d; this.add(sx, sy, c, f * f * k); } }
}

/* ---------------- hạt (rút gọn từ pixelfx sim.js / Sprite Fusion; đơn vị ĐIỂM, giây) ---------------- */
export const GRAVITY = 950;
export const P = { SPARK: 0, MOTE: 1, STREAK: 2, FLAKE: 3, VAPOUR: 4, DUST: 5, STAR: 6, EMBER: 7, SMOKE: 8, GRIT: 11, GLYPH: 12 };
export const PF = { BACK: 4 };
const SOFT = new Set([P.VAPOUR, P.DUST, P.SMOKE]);
const CROSS = [[1, 0], [-1, 0], [0, 1], [0, -1]], DIAG = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
export const SMOKE_RAMP = ['#7b6f72', '#5d5660', '#433d48', '#2b2630', '#1a171e'].map(hex);
const G01 = { 0: [[0, 0], [1, 0], [2, 0], [0, 1], [2, 1], [0, 2], [2, 2], [0, 3], [2, 3], [0, 4], [1, 4], [2, 4]], 1: [[1, 0], [0, 1], [1, 1], [1, 2], [1, 3], [0, 4], [1, 4], [2, 4]] };   /* chữ 0 / 1 cỡ 3×5 điểm */
export class Particles {
  constructor(o = {}) { this.R = o.rng || new Rng(o.seed || 1); this.list = []; this.t = 0; this.ground = o.ground || (() => Infinity); this.sparks = (o.sparks || ['#fff3a6', '#ffe26b', '#ff8a2a', '#f2561d']).map(hex); this.haze = o.haze ? hex(o.haze) : 0; }
  spawn(k, x, y, vx, vy, life, col = WHITE, size = 1, delay = 0, flag = 0) { this.list.push({ k, x, y, vx, vy, life, max: life, col: col ? hex(col) : 0, size, seed: this.R.next() * 100, delay, flag, g: this.R.next() < 0.5 ? 0 : 1 }); }
  get count() { return this.list.length; }
  update(dt) { this.t += dt; const t = this.t;
    for (let i = this.list.length - 1; i >= 0; i--) { const p = this.list[i]; if (p.delay > 0) { p.delay -= dt; continue; } if ((p.life -= dt) <= 0) { this.list.splice(i, 1); continue; }
      switch (p.k) {
        case P.GRIT: case P.GLYPH: { p.vy += GRAVITY * (p.k === P.GLYPH ? 0.55 : 1) * dt; p.vx -= p.vx * 0.8 * dt; const g = this.ground(p.x), ny = p.y + p.vy * dt; p.x += p.vx * dt;
          if (p.vy > 0 && p.y <= g && ny >= g) { p.y = g - 0.25; if (p.vy > 130 && this.R.chance(0.5)) { p.vy = -p.vy * 0.3; p.vx = p.vx * 0.5; } else { p.vx = p.vy = 0; p.life = Math.min(p.life, 0.45); } } else p.y = ny; continue; }
        case P.SPARK: { p.vy += GRAVITY * 0.45 * dt; p.vx -= p.vx * 2.2 * dt; p.vy -= p.vy * 2.2 * dt; const g = this.ground(p.x), ny = p.y + p.vy * dt; p.x += p.vx * dt; if (p.vy > 0 && p.y <= g && ny >= g) { p.vy = -p.vy * 0.45; p.vx *= 0.7; p.y = g - 0.25; } else p.y = ny; continue; }
        case P.STREAK: p.vx += p.vx * 3 * dt; p.vy += p.vy * 3 * dt; break;
        case P.FLAKE: p.vx -= p.vx * 2.2 * dt; p.vy -= p.vy * 2.2 * dt - 35 * dt; p.x += Math.sin(t * 2.5 + p.seed) * 7 * dt; break;
        case P.EMBER: p.vy += (-30 + Math.sin(t * 3 + p.seed) * 20) * dt; p.vx += Math.cos(t * 2.3 + p.seed) * 45 * dt; p.vx -= p.vx * 1.6 * dt; p.vy -= p.vy * 1.6 * dt; break;
        case P.SMOKE: p.vy -= 16 * dt; p.vx += Math.sin(t * 1.3 + p.seed) * 8 * dt; p.vx -= p.vx * 1.6 * dt; p.vy -= p.vy * 1.2 * dt; break;
        case P.MOTE: p.vx -= p.vx * 0.6 * dt; p.vy -= p.vy * 0.6 * dt; break;
        default: { const dr = SOFT.has(p.k) ? 4 : 1.6; p.vx -= p.vx * dr * dt; p.vy -= p.vy * dr * dt + 5 * dt; }
      }
      p.x += p.vx * dt; p.y += p.vy * dt; } }
  draw(p, layer) {
    for (const q of this.list) { if (q.delay > 0) continue; if (layer && ((SOFT.has(q.k) || q.flag & PF.BACK) ? 'back' : 'front') !== layer) continue;
      const k = q.life / q.max, x = q.x, y = q.y, sp = Math.hypot(q.vx, q.vy) || 1, ux = q.vx / sp, uy = q.vy / sp;
      switch (q.k) {
        case P.SPARK: { const S = q.col && q.col !== WHITE ? [WHITE, q.col, scale(q.col, 0.7), scale(q.col, 0.45)] : this.sparks, head = k > 0.6 ? S[0] : k > 0.3 ? S[1] : S[2], len = Math.min(9, 1 + sp * 0.022) * q.size;
          p.line(x - ux * len, y - uy * len, x - ux * len * 0.4, y - uy * len * 0.4, k > 0.5 ? head : S[S.length - 1]); p.line(x - ux * len * 0.45, y - uy * len * 0.45, x, y, head); p.glow(x, y, 3, head, 0.45 * k); break; }
        case P.MOTE: { const len = Math.min(16, 0.5 + sp * 0.026) * q.size, a = k < 0.35 ? k / 0.35 : 1; p.line(x - ux * len, y - uy * len, x - ux * len * 0.35, y - uy * len * 0.35, scale(q.col, 0.55), a); p.line(x - ux * len * 0.4, y - uy * len * 0.4, x, y, q.col, a); p.glow(x, y, 2.5 + q.size, q.col, 0.4 * k); break; }
        case P.STREAK: { const L = clamp(sp / 30, 1, 7); for (let d = L; d >= 0; d -= 0.5) p.dot(x - ux * d, y - uy * d, d < 1 ? WHITE : d < L * 0.5 ? q.col : scale(q.col, 0.6), d < L * 0.5 ? 1 : 1.2 - d / L); p.glow(x, y, 4, q.col, 0.35); break; }
        case P.FLAKE: { const a = Math.min(1, k * 3); p.dot(x, y, q.col, a); if (q.size > 1.3) for (const [dx, dy] of CROSS) p.dot(x + dx, y + dy, scale(q.col, 0.8), a * 0.8); break; }
        case P.VAPOUR: { const r = q.size * (0.6 + (1 - k) * 0.9); p.disc(x, y, r, q.col, Math.pow(k, 1.3) * 0.45); if (this.haze) p.glow(x, y, r * 1.8, this.haze, 0.16 * k); break; }
        case P.DUST: { const r = q.size * (0.6 + (1 - k) * 0.9), a = Math.pow(k, 1.3) * 0.62; p.disc(x, y, r, q.col, d => a * (1 - d * d * 0.7)); p.disc(x - r * 0.22, y - r * 0.32, r * 0.55, mix(q.col, WHITE, 0.35), d => a * 0.7 * (1 - d * d)); break; }
        case P.SMOKE: { const age = 1 - k, r = q.size * (0.65 + Math.min(1, age * 2.5) * 0.45 + age * 0.4), a = Math.min(1, age * 12) * Math.min(1, k * 2.4) * 0.58, c = q.col ? mix(q.col, at(SMOKE_RAMP, age), age) : at(SMOKE_RAMP, age);
          p.disc(x, y, r, c, a * 0.45); p.disc(x + r * 0.05, y + r * 0.06, r * 0.74, c, a * 0.62); if (age < 0.5) p.disc(x - r * 0.22, y - r * 0.3, r * 0.5, mix(c, WHITE, 0.12), a * 0.4 * (1 - age * 2)); break; }
        case P.GRIT: if (k > 0.12) { p.px(x, y, q.col); if (q.size >= 2) { p.px(x + 1, y, q.col); p.px(x, y + 1, scale(q.col, 0.8)); p.px(x + 1, y + 1, scale(q.col, 0.65)); } } break;
        case P.GLYPH: { const a = k < 0.3 ? k / 0.3 : 1; for (const [gx, gy] of G01[q.g]) p.dot(x + gx, y + gy, q.col, a); p.glow(x + 1, y + 2, 4, q.col, 0.25 * k); break; }
        case P.EMBER: { const c = k > 0.6 ? this.sparks[0] : k > 0.3 ? this.sparks[1] : this.sparks[2]; if (k < 0.25 && Math.sin(this.t * 40 + q.seed) < 0) break; p.px(x, y, q.col && q.col !== WHITE ? (k > 0.5 ? WHITE : q.col) : c); p.glow(x, y, 3 + q.size, q.col || c, 0.35 * k); break; }
        default: { const tw = 0.6 + 0.4 * Math.sin(this.t * (8 + (q.seed % 5)) + q.seed); if (q.size < 1) { if (tw * k > 0.25) p.px(x, y, tw > 0.8 ? WHITE : q.col); p.glow(x, y, 3, q.col, 0.4 * k * tw); break; } sparkle(p, x, y, q.size * tw * Math.min(1, k * 3), q.col, scale(q.col, 0.75), 0.5 * k * tw); }
      } } }
}
/* mảnh rắn lăn / nảy / nằm yên (pixelfx Bits) */
export const B = { SHARD: 0, CHUNK: 1 };
export class Bits {
  constructor(o = {}) { this.list = []; this.ground = o.ground || (() => Infinity); }
  add(b) { const life = b.life ?? 1; this.list.push({ kind: B.SHARD, vx: 0, vy: 0, a: 0, va: 0, s: 1, c: WHITE, g: 1, drag: 0, bounce: 0, rest: false, ...b, life, max: life }); }
  update(dt) { for (let i = this.list.length - 1; i >= 0; i--) { const b = this.list[i]; if ((b.life -= dt) <= 0) { this.list.splice(i, 1); continue; } if (b.rest) continue;
    b.vy += GRAVITY * b.g * dt; b.vx -= b.vx * b.drag * dt; b.vy -= b.vy * b.drag * dt; b.x += b.vx * dt; b.y += b.vy * dt; b.a += b.va * dt; const fl = this.ground(b.x), sp = b.vy;
    if (b.g <= 0 || b.y < fl || sp <= 0) continue; b.y = fl - 0.01; if (b.bounce > 0 && sp > 70) { b.vy = -sp * b.bounce; b.vx *= 0.7; b.va *= 0.6; } else { b.rest = true; b.vx = b.vy = 0; } } }
  draw(p) { for (const b of this.list) { const a = Math.min(1, b.life / 0.4), ca = Math.cos(b.a), sa = Math.sin(b.a);
    if (b.kind === B.SHARD) { for (let d = -b.s / 2; d <= b.s / 2; d += 0.5) p.dot(b.x + ca * d, b.y + sa * d, d > b.s / 2 - 0.6 ? WHITE : hex(b.c), a); continue; }
    const R = (b.ramp || PAL113.rocky).map(hex), n = R.length, x = Math.round(b.x), y = Math.round(b.y), r = Math.ceil(b.s) + 1;
    for (let py = -r; py <= r; py++) for (let px = -r; px <= r; px++) { const u = (px + 0.5) * ca + (py + 0.5) * sa, v = -(px + 0.5) * sa + (py + 0.5) * ca, d = Math.abs(u) / b.s + Math.abs(v) / (b.s * 0.62); if (d > 1.3) continue;
      p.dot(x + px, y + py, d > 1 ? R[0] : v < 0 ? (u < 0 ? R[n - 2] : R[n - 3]) : u < 0 ? R[n - 4] : R[Math.max(1, n - 6)], a); } } }
}
/* ánh sáng loé rồi tắt (k giảm theo life²) */
export class Lights {
  constructor() { this.list = []; }
  add(x, y, r, c, k, life) { this.list.push({ x, y, r, c: hex(c), k, life, max: life }); }
  update(dt) { for (let i = this.list.length - 1; i >= 0; i--) if ((this.list[i].life -= dt) <= 0) this.list.splice(i, 1); }
  draw(p) { for (const l of this.list) { const k = l.life / l.max; p.glow(l.x, l.y, l.r * (0.55 + 0.45 * k), l.c, l.k * k * k); } }
}
export function sparkle(p, x, y, arm, c, tip = c, k = 0.6) { const n = Math.round(arm); if (n < 1) return; const X = Math.floor(x), Y = Math.floor(y);
  for (let d = 1; d <= n; d++) { const cc = d > n * 0.6 ? tip : c; for (const [dx, dy] of CROSS) p.px(X + dx * d, Y + dy * d, cc); } if (n >= 3) for (const [dx, dy] of DIAG) p.px(X + dx, Y + dy, c); if (n >= 6) for (const [dx, dy] of DIAG) p.px(X + dx * 2, Y + dy * 2, tip); p.px(X, Y, WHITE); p.glow(x, y, 4 + n * 2, c, k); }
export function flare(p, x, y, L, k, R) { if (L < 1) return; const n = R.length; for (let i = 0; i < 8; i++) { const an = i * Math.PI / 4, len = i % 4 === 0 ? L : i % 2 === 0 ? L * 0.6 : L * 0.3, ca = Math.cos(an), sa = Math.sin(an);
  for (let d = 0; d <= len; d += 0.5) { const u = d / len; p.dot(x + ca * d, y + sa * d, u < 0.35 ? WHITE : u < 0.7 ? R[n - 2] : R[n - 3], u < 0.6 ? 1 : k * 1.5 * (1 - u) + 0.2); } } }
/* vòng trên mặt phẳng nghiêng (sy 0,5 = nằm trên đất theo góc nhìn game); keep(góc) chọn nửa xa / gần để chia lớp sau / trước thân */
export function band(p, cx, cy, r, sy, th, k, R, keep = () => true, hot = false) { if (r <= 0 || k <= 0) return; const n = R.length;
  for (let j = 0, m = Math.ceil(r * TAU * 1.2); j < m; j++) { const an = (j / m) * TAU; if (!keep(an)) continue; const ca = Math.cos(an), sa = Math.sin(an);
    for (let o = th; o >= 0; o -= 0.5) { const u = o / th, c = u < 0.15 ? (hot ? WHITE : R[n - 1]) : u < 0.4 ? R[n - 2] : u < 0.7 ? R[n - 3] : R[n - 4]; p.dot(cx + ca * (r - o), cy + sa * (r - o) * sy, c, k * (u < 0.4 ? 1.2 : 1.15 - u)); } } }
/* cục va chạm méo trắng nóng (1–2 khung "hero frame") */
export const lump = (r, a, ph) => r * (1 + 0.15 * Math.sin(5 * a + ph) + 0.08 * Math.sin(9 * a + ph * 2.3));
export function blob(p, X, Y, R0, f, C, ph, sy = 1) { p.shade(X - R0 * 1.4, Y - R0 * 1.4, X + R0 * 1.4, Y + R0 * 1.4, (x, y) => { const dx = x - X, dy = (y - Y) / sy, d = Math.hypot(dx, dy), ro = lump(R0, Math.atan2(dy, dx), ph + f * 0.6); if (d > ro) return; const q = d / ro;
  return f === 0 ? (q < 0.55 ? WHITE : q < 0.86 ? C[6] : C[5]) : q < 0.3 ? WHITE : q < 0.72 ? C[6] : q < 0.9 ? C[5] : C[4]; }); }
/* nêm mực đâm ra rồi giật về (blunt-hit) */
export function wedges(R, n, r0, len) { return Array.from({ length: n }, (_, i) => ({ a: (i / n) * TAU + R.range(-0.2, 0.2), len: len * R.range(0.6, 1.2), w: R.range(3.2, 5.5), r0: r0 * R.range(0.9, 1.1), t0: R.range(0.0, 0.03), out: R.range(0.04, 0.06), back: R.range(0.09, 0.14) })); }
export function drawWedges(p, W, X, Y, t, ink, hot, mid, sy = 1) { for (const w of W) { const u = t - w.t0; if (u < 0 || u > w.out + w.back) continue; const s = u < w.out ? ease.outCubic(u / w.out) : 1 - ease.inQuad((u - w.out) / w.back), L = w.len * s; if (L < 1.5) continue;
  const ca = Math.cos(w.a), sa = Math.sin(w.a) * sy, r0 = w.r0 + 2 * s, hw = (w.w * (0.6 + 0.4 * s)) / 2, tip = [X + ca * r0, Y + sa * r0], end = [X + ca * (r0 + L), Y + sa * (r0 + L)], nn = [-sa * hw, ca * hw];
  const wg = g => [[tip[0] - ca * g, tip[1] - sa * g], [end[0] + nn[0] * (1 + g * 0.45) + ca * g, end[1] + nn[1] * (1 + g * 0.45) + sa * g], [end[0] - nn[0] * (1 + g * 0.45) + ca * g, end[1] - nn[1] * (1 + g * 0.45) + sa * g]];
  p.poly(wg(1), ink); p.poly(wg(0), u < w.out + 0.02 ? hot : mid); } }

/* ---------------- KHUNG "MOVE": wind-up → release → hit-stop → reaction → recovery ----------------
   def = { wind, hits: [{ t, stop, shake, flash, push, zoom }], rec }  — t tính từ lúc tung (0 = khung release), wind > 0 là gồng trước đó.
   mv = move(def); mv.phase(t) → 'wind' | 'release' | 'hold' | 'rec' | 'done'; mv.cross(t0, t1, fn) gọi fn(hit) cho mỗi cú trúng nằm trong (t0, t1].
   Bên game đọc đúng số này để: chạy clip gồng trước 'wind' giây, khựng mọi thứ 'stop' giây, rung 'shake', chớp trắng thân trúng 'flash', hất 'push'. */
export function move(def) { const d = { wind: 0, rec: 0.3, hits: [], ...def }; const last = d.hits.reduce((m, h) => Math.max(m, h.t), 0);
  return { def: d, len: d.wind + last + d.rec, phase(t) { t -= d.wind; if (t < 0) return 'wind'; if (t < 0.06) return 'release'; if (t <= last + 0.02) return 'hold'; if (t <= last + d.rec) return 'rec'; return 'done'; },
    cross(t0, t1, fn) { for (const h of d.hits) { const T = d.wind + h.t; if (T > t0 && T <= t1) fn(h); } } }; }

/* ---------------- Inst: 1 hiệu ứng sống, khung riêng, cập nhật bước 120 Hz, tự khựng (hit-stop) ---------------- */
const POOL = [];
function getCanvas(w, h) { if (typeof document === 'undefined') return null; for (let i = 0; i < POOL.length; i++) { const c = POOL[i]; if (!c.busy && c.cv.width >= w && c.cv.height >= h && c.cv.width <= w * 1.6 + 32 && c.cv.height <= h * 1.6 + 32) { c.busy = true; return c; } }
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h; const c = { cv, g: cv.getContext('2d'), busy: true, img: null }; POOL.push(c); return c; }
export const CFG113 = { light: 0.75, on: true, stat: { inst: 0, ms: 0, px: 0 } };   /* light: hệ số sáng chung (ngày trên cỏ thấp hơn đêm / nền tối) */
/* scene = { T, box(t) → [x0, y0, x1, y1] thế giới logic, update(dt), draw(p, layer) } ; layers: 'ground' (dưới mọi nhân vật) | 'body' (sắp theo y) */
export function inst(scene, o = {}) {
  const I = { t: 0, T: scene.T || 1, frz: 0, sc: scene, y: o.y || (() => 0), layers: o.layers || ['body'], done: false, fr: {},
    freeze(s) { I.frz = Math.max(I.frz, s); },
    update(dt) { if (I.done) return; if (I.frz > 0) { I.frz -= dt; return; } I.t += dt; const n = Math.max(1, Math.ceil(dt * 120 - 1e-9)); for (let i = 0; i < n; i++) scene.update && scene.update(dt / n, I); if (I.t >= I.T) I.done = true; },
    blit(g, cx, cy, layer) {   /* vẽ 1 lớp vào khung riêng rồi dán lên canvas game */
      if (I.done) return; const t0 = typeof performance !== 'undefined' ? performance.now() : 0, bx = scene.box(I.t, I);
      const X0 = Math.floor(bx[0] * 2), Y0 = Math.floor(bx[1] * 2), W = Math.max(2, Math.ceil(bx[2] * 2) - X0), H = Math.max(2, Math.ceil(bx[3] * 2) - Y0);
      let F = I.fr[layer]; if (!F || F.w !== W || F.h !== H) { F = I.fr[layer] = createFrame(W, H); F.cvs = null; } F.ox = X0; F.oy = Y0; clearFrame(F);
      const p = new Painter(F); p.lightK = CFG113.light * (o.light ?? 1); scene.draw(p, layer, I.t, I);
      if (F.x1 >= F.x0) blitFrame(g, F, cx, cy);
      CFG113.stat.ms += (typeof performance !== 'undefined' ? performance.now() : 0) - t0; CFG113.stat.px += W * H; },
  };
  CFG113.stat.inst++; return I;
}
/* dán khung: màu (alpha nguyên / bán trong suốt) + sáng cộng ('lighter'). Chỉ vùng bẩn. */
function blitFrame(g, F, cx, cy) {
  const dw = F.x1 - F.x0 + 1, dh = F.y1 - F.y0 + 1, c = getCanvas(dw, dh); if (!c) return;
  try {
    if (!c.img || c.img.width !== c.cv.width || c.img.height !== c.cv.height) { c.img = c.g.createImageData(c.cv.width, c.cv.height); c.u32 = new Uint32Array(c.img.data.buffer); c.u32L = new Uint32Array(c.cv.width * c.cv.height); }
    const W = c.cv.width, U = c.u32, UL = c.u32L; let anyL = false;
    for (let y = 0; y < dh; y++) { const si = (F.y0 + y) * F.w + F.x0, di = y * W; for (let x = 0; x < dw; x++) { U[di + x] = F.color[si + x]; const l = F.light[si + x]; UL[di + x] = l; if (l) anyL = true; } }
    c.g.putImageData(c.img, 0, 0, 0, 0, dw, dh);
    const X = (F.ox + F.x0) / 2 - cx, Y = (F.oy + F.y0) / 2 - cy;
    g.drawImage(c.cv, 0, 0, dw, dh, X, Y, dw / 2, dh / 2);
    if (anyL) { U.set(UL.subarray(0, W * dh)); for (let i = 0; i < W * dh; i++) if (!U[i]) U[i] = 0; c.g.putImageData(c.img, 0, 0, 0, 0, dw, dh);
      const op = g.globalCompositeOperation; g.globalCompositeOperation = 'lighter'; g.drawImage(c.cv, 0, 0, dw, dh, X, Y, dw / 2, dh / 2); g.globalCompositeOperation = op; }
  } finally { c.busy = false; }
}
/* chạy KHÔNG trình duyệt (node, ảnh xem trước nền tối): ghép khung vào bộ đệm RGBA cỡ màn — composite màu rồi cộng sáng (kẹp 255) */
export function compositeInto(F, out, OW, OH, offX, offY) {
  for (let y = F.y0; y <= F.y1; y++) { const oy = F.oy + y - offY; if (oy < 0 || oy >= OH) continue;
    for (let x = F.x0; x <= F.x1; x++) { const ox = F.ox + x - offX; if (ox < 0 || ox >= OW) continue; const i = y * F.w + x, c = F.color[i], l = F.light[i], j = (oy * OW + ox) * 4;
      if (c) { const a = (c >>> 24) / 255; out[j] = out[j] * (1 - a) + (c & 255) * a; out[j + 1] = out[j + 1] * (1 - a) + ((c >>> 8) & 255) * a; out[j + 2] = out[j + 2] * (1 - a) + ((c >>> 16) & 255) * a; }
      if (l) { out[j] = Math.min(255, out[j] + (l & 255)); out[j + 1] = Math.min(255, out[j + 1] + ((l >>> 8) & 255)); out[j + 2] = Math.min(255, out[j + 2] + ((l >>> 16) & 255)); } } }
}
export function renderInto(I, layer, out, OW, OH, offX, offY) {   /* node: vẽ 1 lớp của Inst vào bộ đệm RGBA (toạ độ điểm thế giới; offX/offY = góc trên-trái màn tính bằng điểm) */
  if (I.done) return; const sc = I.sc, bx = sc.box(I.t, I), X0 = Math.floor(bx[0] * 2), Y0 = Math.floor(bx[1] * 2), W = Math.max(2, Math.ceil(bx[2] * 2) - X0), H = Math.max(2, Math.ceil(bx[3] * 2) - Y0);
  const F = createFrame(W, H); F.ox = X0; F.oy = Y0; const p = new Painter(F); p.lightK = CFG113.light; sc.draw(p, layer, I.t, I); if (F.x1 >= F.x0) compositeInto(F, out, OW, OH, offX, offY);
}
