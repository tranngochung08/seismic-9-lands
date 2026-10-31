/* pxfx-ult.js — p61: 3 bản nháp lớp hạt / mảnh / sương / ánh sáng VẼ CODE cho tuyệt chiêu 11 hệ (Chấn, Nham, Triều, Lôi, Phong, Mộc, Tinh, Mã, Âm, Ảnh, Quang),
   chồng lên 2 lớp PixelLab ult_<hệ>_back / ult_<hệ>_front (14 khung, 14 fps; cú chạm khung 5 = tLock, khung 10 = tBreak; ảnh tắt ở khung 13).
   Kỹ thuật chung chuyển thể từ Sprite Fusion VFX (MIT License — Copyright (c) 2026 Hugo Duprez), qua pxfx.js.
   Luật: thú bị trúng đứng TRONG hiệu ứng, lớp front che ≤ 40 % (thứ ở lớp front để thấp sát đất hoặc ra 2 bên); không chói (ánh cộng nhỏ, ngắn);
   chỉ chạy theo sự kiện rồi tắt GỌN (mờ 3 bậc 1 → ½ → tắt, không thưa dần thành lưới chấm). Màu Triều lấy từ ô nước game. Tia Quang: hạt ở MIỆNG người bắn (o.mx, o.my).
   r2: vị trí / khung sự kiện ĐO từ ảnh PixelLab (cụm điểm mới mỗi khung, toạ độ logic so với chân) — điểm rơi thiên thạch, chân sét, chân cột đá,
   gốc dây leo, hoa, viên ngọc, loa…; hạt tối thiểu 2×2 điểm đệm (= 1 px logic) cho đọc được trên điện thoại (bản r1 hạt 1 điểm trông như nhiễu). */
import { addScenes, KIT } from './pxfx.js';
const { Rng, K, part, addLight, shardsFrom, ditherOval, line, hex, hash2, clamp, lerp, smooth, outCubic, outBack, silPick, CROSS, TAU, RES } = KIT;

const qa = k => (k > 0.55 ? 1 : k > 0.25 ? 0.5 : 0);   /* mờ 3 bậc rồi tắt */
const H = s => hex(s);
const PETAL = ['#ffe0ec', '#f7a8c8', '#dc6f9f', '#8a3560'].map(H), POLLEN = ['#fff6c8', '#ffe27a', '#e8b84a'].map(H), DIRT = ['#c99b6a', '#a47650', '#7a5238', '#4a3022'].map(H);
const LEAF = ['#b6e070', '#7cbf4a', '#4a8a34', '#2c5a24'].map(H), LEAFY = ['#f0f0a8', '#c8a040', '#7a5228'].map(H),   /* lá vàng viền nâu: lá xanh trên cỏ xanh không đọc được (r2) */
  PINK = H('#ff6fd8'), CYAN = H('#6ff6ff');

/* ---------- hạt tự vẽ (K.FX) ---------- */
function fx(c, x, y, z, vx, vy, vz, life, draw, o = {}) { return part(c, K.FX, x, y, z, vx, vy, vz, life, o.col ?? c.P[1], o.size ?? 1, { draw, g: 0, drag: 0, bounce: 0, ...o }); }
function rampAt(r, k) { return r[Math.min(r.length - 1, Math.max(0, Math.floor((1 - k) * r.length)))]; }
const dSpark = (B, L, c, p, x, y, k) => {   /* tàn / tia lửa: khối 2×2 (size ≥ 2) hoặc 1 điểm + đuôi theo vận tốc, màu theo tuổi */
  const r = p.ramp || [c.P[0], c.P[1], c.P[2], c.P[3]], col = rampAt(r, k), c2 = rampAt(r, k * 0.6), sp = Math.hypot(p.vx, p.vy - p.vz) || 1, ux = p.vx / sp, uy = (p.vy - p.vz) / sp, X = Math.floor(x), Y = Math.floor(y);
  if (sp > 15) for (let d = 1; d <= (p.size >= 2 ? 3 : 2); d++) B.set(X - ux * d * 1.2, Y - uy * d * 1.2, c2);
  B.set(X, Y, col); if (p.size >= 2) { B.set(X + 1, Y, col); B.set(X, Y + 1, c2); B.set(X + 1, Y + 1, c2); }
  if (p.glow) L.glow(x, y, 4, p.glow, 0.25 * k);
};
const dBit = (B, L, c, p, x, y, k) => {   /* khối pixel vuông (Mã) — viền sáng trên-trái */
  const s = Math.max(2, Math.round(p.size * RES)), X = Math.round(x - s / 2), Y = Math.round(y - s / 2), a = p.qf ? 1 : qa(k * 2.5); if (!a) return;
  for (let j = 0; j < s; j++) for (let i = 0; i < s; i++) B.dot(X + i, Y + j, i === 0 || j === 0 ? (p.c2 ?? p.col) : i === s - 1 || j === s - 1 ? c.P[5] : p.col, a);
};
const dLeaf = (B, L, c, p, x, y, k) => {   /* lá / cánh hoa / lông vũ: thân 2 điểm dày, 2 màu, xoay theo p.a */
  const a = p.qf ? 1 : qa(k * 3); if (!a) return; const ca = Math.cos(p.a), sa = Math.sin(p.a), n = Math.max(1, Math.round(p.size * RES));
  for (let d = -n; d <= n; d++) { const X = x + ca * d, Y = y + sa * d * 0.7; B.dot(X, Y, d < 0 ? p.col : (p.c2 ?? p.col), a); if (Math.abs(d) < n) B.dot(X - sa, Y + ca * 0.7, p.c2 ?? p.col, a); }
};
const dDrop = (B, L, c, p, x, y, k) => { const sp = Math.hypot(p.vx, p.vy - p.vz) || 1, X = Math.floor(x), Y = Math.floor(y); B.set(X - p.vx / sp * 2, Y - (p.vy - p.vz) / sp * 2, p.c2 ?? c.P[4]); B.set(X, Y, p.col); B.set(X + 1, Y, p.col); B.set(X, Y + 1, c.P[3]); B.set(X + 1, Y + 1, c.P[3]); };
const dCrown = (B, L, c, p, x, y, k) => {   /* toé nước nhỏ khi giọt chạm đất: 3 tia bắn lên, 0,16 s */
  const u = 1 - k, h = Math.sin(Math.PI * u) * 4; for (const dx of [-3, 0, 3]) { const X = Math.floor(x + dx * (0.6 + u)), Y = Math.floor(y - h * (dx ? 0.7 : 1)); B.set(X, Y, dx ? c.P[2] : c.P[0]); B.set(X, Y + 1, c.P[3]); }
};
const dBubble = (B, L, c, p, x, y, k) => {   /* bọt khí: vòng rỗng sáng + chấm loé */
  const r = p.size * RES * 0.5, a = qa(k * 4); if (!a) return; const n = Math.max(8, Math.ceil(r * 7));
  for (let i = 0; i < n; i++) { const t = i / n * TAU; B.dot(x + Math.cos(t) * r, y + Math.sin(t) * r, t > 3.3 && t < 5.6 ? c.P[0] : c.P[1], a); } B.set(x - r * 0.35, y - r * 0.35, c.P[0]);
};
const dArc = (B, L, c, p, x, y, k) => {   /* mảnh màng nước cong (Triều v2) */
  const a = qa(k * 3); if (!a) return; for (let d = -3; d <= 3; d++) { const t = p.a + d * 0.12, X = x + Math.cos(t) * 6 - Math.cos(p.a) * 6, Y = y + Math.sin(t) * 6 - Math.sin(p.a) * 6; B.dot(X, Y, Math.abs(d) < 2 ? c.P[0] : c.P[2], a); B.dot(X + 1, Y, c.P[3], a); }
};
const GLY = { 0: [7, 5, 5, 5, 7], 1: [2, 6, 2, 2, 7], note: [3, 2, 2, 6, 6], note2: [7, 5, 5, 13, 13] };
const dGlyph = (B, L, c, p, x, y, k) => {   /* chữ 3×5 phóng 2× (0/1 của Mã, nốt nhạc của Âm) — viền tối để đọc được trên cỏ */
  const a = p.qf ? (k > 0.12 ? 1 : 0) : qa(k * 3); if (!a) return; const g = GLY[p.gl], w = p.gl === 'note2' ? 4 : 3, S = 2, X = Math.round(x) - w, Y = Math.round(y) - 5;
  const on = (i, j) => i >= 0 && j >= 0 && i < w && j < 5 && (g[j] >> (c.mir ? i : w - 1 - i) & 1);   /* p52f: cảnh dán lật (đối thủ bên trái) → vẽ chữ lật sẵn để ra chữ thuận */
  for (let j = -1; j <= 5; j++) for (let i = -1; i <= w; i++) { if (on(i, j)) continue; if (on(i + 1, j) || on(i - 1, j) || on(i, j + 1) || on(i, j - 1)) for (let q = 0; q < S * S; q++) B.dot(X + i * S + (q % S), Y + j * S + (q >> 1), c.P[7], a); }
  for (let j = 0; j < 5; j++) for (let i = 0; i < w; i++) if (on(i, j)) for (let q = 0; q < S * S; q++) B.dot(X + i * S + (q % S), Y + j * S + (q >> 1), j === 0 ? (p.c2 ?? p.col) : p.col, a);
};
const dSpot = (B, L, c, p, x, y, k) => {   /* đốm trên đất nguội dần theo ramp (dung nham) */
  const col = rampAt(p.ramp, k); if (!col) return; const w = Math.max(1, Math.round(p.size * RES)); for (let i = -w; i <= w; i++) { B.set(x + i, y, col); if (Math.abs(i) < w) B.set(x + i, y - 1, col); }
};

/* ---------- hình vẽ ---------- */
function ellipse(B, X, Y, rx, ry, col, a = 1, half = 0) { if (rx < 0.5 || !a) return; const n = Math.max(8, Math.ceil((rx + ry) * 3.2)); for (let i = 0; i < n; i++) { const t = i / n * TAU, s = Math.sin(t); if (half && (s >= 0) !== (half > 0)) continue; B.dot(X + Math.cos(t) * rx, Y + s * ry, col, a); } }
function bolt(B, R, x0, y0, x1, y1, core, edge, jit = 3, br = 0) {   /* tia điện gấp khúc (điểm đệm) lõi 2 điểm + viền, nhánh con */
  const n = Math.max(2, Math.round(Math.hypot(x1 - x0, y1 - y0) / 5)); let px = x0, py = y0;
  for (let i = 1; i <= n; i++) { const u = i / n, nx = lerp(x0, x1, u) + (i < n ? R.range(-jit, jit) : 0), ny = lerp(y0, y1, u) + (i < n ? R.range(-jit, jit) : 0);
    if (edge) { line(B, px - 1, py, nx - 1, ny, edge); line(B, px + 2, py, nx + 2, ny, edge); line(B, px, py + 2, nx, ny + 2, edge); } line(B, px, py, nx, ny, core); line(B, px + 1, py, nx + 1, ny, core);
    if (br && R.chance(br)) { const a = Math.atan2(ny - py, nx - px) + R.sign() * R.range(0.5, 1.1), l = R.range(6, 14); bolt(B, R, nx, ny, nx + Math.cos(a) * l, ny + Math.sin(a) * l, core, edge, jit * 0.6, 0); }
    px = nx; py = ny; }
}
function jag(R, x0, y0, ang, len, step = 4, wob = 0.5) {   /* đường gấp khúc trên đất (logic, y nén ½) */
  const pts = [[x0, y0]]; let x = x0, y = y0, a = ang; for (let d = 0; d < len; d += step) { a += R.range(-wob, wob); x += Math.cos(a) * step; y += Math.sin(a) * step * 0.5; pts.push([x, y]); a = lerp(a, ang, 0.4); } return pts;
}
function drawPath(B, c, pts, upto, core, mid, edge, a = 1) {   /* đường dày (logic): lõi 2 điểm + dải giữa + viền tối dưới */
  const n = Math.max(1, Math.floor((pts.length - 1) * clamp(upto))); for (let i = 0; i < n; i++) { const [x0, y0] = pts[i], [x1, y1] = pts[i + 1], X0 = c.X(x0), Y0 = c.Y(y0), X1 = c.X(x1), Y1 = c.Y(y1);
    if (edge) { line(B, X0, Y0 + 2, X1, Y1 + 2, edge, a); line(B, X0 - 1, Y0 + 1, X1 - 1, Y1 + 1, edge, a); }
    if (mid) { line(B, X0, Y0 - 1, X1, Y1 - 1, mid, a); line(B, X0 + 1, Y0 + 1, X1 + 1, Y1 + 1, mid, a); }
    line(B, X0, Y0, X1, Y1, core, a); line(B, X0 + 1, Y0, X1 + 1, Y1, core, a); }
}
function pebbleHop(c, x, y, power, cols, sz = 1) { const R = c.R; part(c, K.CHUNK, x, y, 0, R.range(-24, 24) * power, R.range(-8, 10) * power, R.range(55, 95) * power, R.range(0.45, 0.7), R.pick(cols), R.range(1, 1.6) * sz, { g: 1, drag: 0.5, bounce: 0.35, va: R.range(-12, 12), qf: 1 }); }
function puff(c, x, y, col, size = 3, life = 0.45, vz = 8, o = {}) { const R = c.R; part(c, K.DUST, x, y, o.z ?? 0, o.vx ?? R.range(-12, 12), o.vy ?? R.range(-4, 4), vz, life, col, size, { hard: o.hard ?? 1, drag: o.drag ?? 2.4 }); }
function sparks(c, n, x, y, z, sp, o = {}) { const R = c.R; for (let i = 0; i < n; i++) { const a = R.range(0, TAU), v = R.range(0.4, 1) * sp; fx(c, x, y, z, Math.cos(a) * v, Math.sin(a) * v * 0.5, R.range(0.3, 1) * sp * (o.up ?? 0.8), R.range(0.22, 0.4) * (o.life ?? 1), dSpark, { g: o.g ?? 0.5, drag: o.drag ?? 2, bounce: o.bounce ?? 0, ramp: o.ramp, size: o.size ?? 2, glow: o.glow }); } }
function star(c, x, y, z, col, size = 1.5, life = 0.4) { part(c, K.STAR, x, y, z, 0, 0, 0, life, col, size); }
function scene(fn) { return c => { const done = new Set(), once = (k, cond, f) => { if (cond && !done.has(k)) { done.add(k); f(); } }; return fn(c, once, c.R, c.P, c.o, c.o.tLock, c.o.tBreak); }; }
const F = n => n / 14;   /* khung ảnh PixelLab → giây */
function dustRing(B, c, r, cols, a, half, z = 0) {   /* vòng bụi dày trên đất: chuỗi elip dither nhỏ */
  const n = Math.ceil(r * 0.9); for (let i = 0; i < n; i++) { const t = i / n * TAU, s = Math.sin(t); if ((s >= 0) !== (half > 0)) continue; const X = c.X(c.ax + Math.cos(t) * r), Y = c.Y(c.ay + 1 + s * r * 0.5, z); ditherOval(B, X, Y, 2.6 * RES, 1.3 * RES, cols[i % 2], a); B.dot(X, Y - 2, cols[2] ?? cols[0], a); }
}

/* sự kiện ĐO từ ảnh PixelLab: [khung, x, y] logic so với chân */
const NHAM_IMP = [[3, -38, -1], [4, 32, -7], [4, -31, -10], [6, -14, -13], [6, 54, -7], [7, 45, 12], [8, -35, -16], [9, -46, 11], [10, 5, -8]];
const LOI_HIT = [[3, -36, -4], [4, -22, -18], [5, 22, -18], [6, 40, -4], [7, -6, 12], [8, 30, 2], [10, 0, -8]];
const CHAN_COL = [[3, -40, -9], [4, -15, -16], [5, 14, -16], [7, 39, -12]];
const MOC_BASE = [[2, -31, -6], [3, -12, -4], [4, 11, -4], [5, 31, -2], [5, -47, -6], [7, 44, -2]], MOC_TOP = [[-36, -4, 60], [-17, -6, 66], [16, -6, 66], [42, -4, 58]], FLOWER = 58;
const TINH_GEM = 60, TINH_RAY = [[-23, 6], [34, -2], [23, 6], [-38, -2]], TINH_GEMS = [[-42, 0], [42, 0], [-32, 9], [32, 9]];
const MA_COL = [[3, -42, -6], [4, -20, -10], [5, 22, -10], [6, 44, -6]];
const AM_SPK = [[-38, -6, 18], [-24, -26, 26], [22, -16, 26], [38, -4, 18]], AM_BEAT = [6, 7, 9, 11];

addScenes({
  /* ===================== CHẤN — cột đá trồi từ vết nứt sao rồi đổ (cột: khung 3 x−40 · 4 x−15 · 5 x14 · 7 x39; đổ 9–10) ===================== */
  /* v1 Đá vụn bật + bụi cuộn: mỗi cột trồi bật đá vụn + bụi ở chân cột; khung 10 cột đổ: đá vụn văng–nảy, vòng bụi thấp toả ra rồi tắt gọn */
  chan_ult_v1: scene((c, once, R, P, o, TL, TB) => {
    const cols = [P[1], P[2], P[3], P[4]];
    return {
      update(t) {
        CHAN_COL.forEach(([f, x, y], i) => once('p' + i, t >= F(f), () => { o.shake?.(0.1); for (let j = 0; j < 6; j++) pebbleHop(c, c.ax + x + R.range(-4, 4), c.ay + y + R.range(-2, 2), 1.2, cols); puff(c, c.ax + x - 3, c.ay + y, P[2], 4); puff(c, c.ax + x + 3, c.ay + y, P[3], 3.5); }));
        once('b', t >= TB, () => { o.shake?.(0.4); o.cue?.('crumble'); shardsFrom(c, 26, { x0: -46, x1: 46, z0: 6, z1: 46, y0: -16, y1: -6 }, 0.85, cols); for (const p of c.ps) if (p.k === K.SHARD || p.k === K.CHUNK) { p.qf = 1; p.k = K.CHUNK; p.size = R.range(1.2, 2.4); p.life = p.max = Math.min(p.life, R.range(0.55, 0.8)); }
          for (let i = 0; i < 14; i++) { const a = i / 14 * TAU, ca = Math.cos(a), sa = Math.sin(a); puff(c, c.ax + ca * 22, c.ay + sa * 10, R.chance(0.5) ? P[2] : P[3], R.range(4, 5.5), R.range(0.45, 0.6), 3, { vx: ca * 50, vy: sa * 22, drag: 2.6 }); } });
      },
      back() { }, front() { }, over: t => t > TB + 0.9,
    };
  }),
  /* v2 Nứt đất phát sáng lan: 7 vết nứt dày lõi sáng lan xa hơn vết nứt PixelLab; khung 10 vết nứt loé trắng, bụi + sỏi phụt dọc vết nứt, rồi rút từ ngọn về tâm */
  chan_ult_v2: scene((c, once, R, P, o, TL, TB) => {
    const cr = Array.from({ length: 7 }, (_, i) => jag(R, c.ax, c.ay + 1, i / 7 * TAU + R.range(-0.2, 0.2), R.range(46, 60), 4, 0.55));
    return {
      update(t) { once('b', t >= TB, () => { o.shake?.(0.35); for (const p of cr) for (let i = 3; i < p.length; i += 3) { pebbleHop(c, p[i][0], p[i][1], 0.8, [P[2], P[3], P[4]]); puff(c, p[i][0], p[i][1], P[2], 3, 0.35, 10); } addLight(c, c.ax, c.ay, 26, P[0], 0.35, 0.1); }); },
      back(B, L, t) {
        if (t < F(1)) return; const grow = outCubic((t - F(1)) / 0.35), shrink = 1 - outCubic((t - TB - 0.08) / 0.3); if (shrink <= 0) return;
        const flash = t >= TB && t < TB + 0.08; for (const p of cr) drawPath(B, c, p, grow * shrink, flash ? P[0] : t > TB ? P[2] : P[0], flash ? P[0] : t > TB ? P[4] : P[2], P[7]);
      },
      front() { }, over: t => t > TB + 0.9,
    };
  }),
  /* v3 Sóng chấn bụi nảy sỏi: 3 vòng bụi dày chạy trên đất (cột đầu trồi, cú chạm 1, cú đổ); vòng đi qua đâu sỏi ở đó bật lên rồi rơi */
  chan_ult_v3: scene((c, once, R, P, o, TL, TB) => {
    const W = [F(3), TL, TB], peb = Array.from({ length: 40 }, () => { const a = R.range(0, TAU), r = R.range(10, 50); return { x: Math.cos(a) * r, y: Math.sin(a) * r * 0.5, r, hit: [0, 0, 0] }; });
    const rr = (t, w) => 8 + 46 * outCubic((t - w) / 0.4);
    const draw = (B, t, half) => W.forEach((w, i) => { const u = (t - w) / 0.4; if (u < 0 || u >= 1) return; dustRing(B, c, rr(t, w), [P[2], P[3], P[1]], qa(1 - u) * (i === 2 ? 1 : 0.75), half); });
    return {
      update(t) { W.forEach((w, i) => { if (t < w || t > w + 0.4) return; once('s' + i, true, () => o.shake?.(i === 2 ? 0.35 : 0.15)); const r = rr(t, w); for (const p of peb) if (!p.hit[i] && p.r < r) { p.hit[i] = 1; if (R.chance(i === 2 ? 0.9 : 0.5)) pebbleHop(c, c.ax + p.x, c.ay + p.y, i === 2 ? 1 : 0.6, [P[2], P[3], P[4]]); } }); },
      back(B, L, t) { draw(B, t, -1); }, front(B, L, t) { draw(B, t, 1); }, over: t => t > TB + 0.9,
    };
  }),

  /* ===================== NHAM — thiên thạch rơi xuống 9 điểm lửa (khung 3–10, đo từ ảnh) ===================== */
  /* v1 Tàn lửa + khói: mỗi điểm rơi bắn tàn lửa bay lên + cụm khói tối bốc; khung 10 (lửa to giữa) bung tàn quanh thân */
  nham_ult_v1: scene((c, once, R, P, o, TL, TB) => ({
    update(t) {
      NHAM_IMP.forEach(([f, x, y], i) => once('i' + i, t >= F(f), () => { const big = f === 10; o.shake?.(big ? 0.3 : 0.08); sparks(c, big ? 22 : 11, c.ax + x, c.ay + y, 3, big ? 100 : 75, { up: 1.5, g: 0.08, drag: 1.5, life: 2, ramp: [P[0], P[1], P[2], P[3], P[5]] }); puff(c, c.ax + x, c.ay + y - 1, P[6], big ? 4.5 : 3.4, 0.5, 26, { z: 6, hard: 1 }); if (!big) puff(c, c.ax + x + 3, c.ay + y, P[5], 2.8, 0.4, 20, { z: 4, hard: 1 }); addLight(c, c.ax + x, c.ay + y, big ? 20 : 12, P[2], 0.35, 0.12); }));
    },
    back() { }, front() { }, over: t => t > TB + 1,
  })),
  /* v2 Giọt dung nham văng + nguội: mỗi điểm rơi văng 7 giọt bổng, chạm đất thành vệt đỏ nguội dần (vàng → cam → nâu → tắt) */
  nham_ult_v2: scene((c, once, R, P, o, TL, TB) => {
    const land = (c, p) => { p.life = p.max = R.range(0.5, 0.75); p.draw = dSpot; p.ramp = [P[0], P[1], P[2], P[3], P[5], P[6]]; p.size = 1; p.vx = p.vy = 0; };
    return {
      update(t) {
        NHAM_IMP.forEach(([f, x, y], i) => once('i' + i, t >= F(f), () => { const big = f === 10; o.shake?.(big ? 0.3 : 0.08); for (let j = 0; j < (big ? 14 : 7); j++) { const a = R.range(0, TAU), v = R.range(40, big ? 95 : 75); fx(c, c.ax + x, c.ay + y, 3, Math.cos(a) * v, Math.sin(a) * v * 0.5, R.range(80, 130), 2, dDrop, { g: 1, drag: 0.3, col: P[1], c2: P[3], onLand: land }); } addLight(c, c.ax + x, c.ay + y, 12, P[2], 0.35, 0.12); }));
      },
      back() { }, front() { }, over: t => t > TB + 1.1,
    };
  }),
  /* v3 Mạch nóng chảy dưới đất: mỗi điểm rơi nối 1 mạch dung nham dày về chân đối thủ, hơi nóng lăn tăn bốc lên dọc mạch; sau khung 10 mạch nguội (vàng → đỏ → nâu) rồi tắt */
  nham_ult_v3: scene((c, once, R, P, o, TL, TB) => {
    const V = NHAM_IMP.filter(v => v[0] < 10).map(([f, x, y]) => { const d = Math.hypot(x, y * 2) || 1; return { at: F(f), pts: jag(R, c.ax + x, c.ay + y, Math.atan2(-y * 2, -x), Math.max(8, d - 10), 4, 0.6) }; });
    return {
      update(t) { V.forEach((v, i) => once('i' + i, t >= v.at, () => o.shake?.(0.06)));
        if (t > F(3) && t < TB + 0.3) for (let q = 0; q < 2; q++) { const av = V.filter(v => t >= v.at); if (av.length) { const p = R.pick(R.pick(av).pts); fx(c, p[0], p[1], 1, R.range(-4, 4), 0, R.range(16, 28), R.range(0.3, 0.45), dSpark, { size: 2, ramp: [P[1], P[2], P[3], P[5]] }); } }
        once('b', t >= TB, () => { o.shake?.(0.3); sparks(c, 16, c.ax, c.ay, 3, 85, { up: 1.2, g: 0.1, life: 1.6, ramp: [P[0], P[1], P[2], P[3]] }); }); },
      back(B, L, t) { for (const v of V) { if (t < v.at) continue; const g = outCubic((t - v.at) / 0.14), cool = clamp((t - TB - 0.1) / 0.45); if (cool >= 1) continue;
        drawPath(B, c, v.pts, g, cool < 0.35 ? P[0] : cool < 0.7 ? P[3] : P[5], cool < 0.35 ? P[2] : cool < 0.7 ? P[4] : P[6], P[7]); } },
      front() { }, over: t => t > TB + 0.9,
    };
  }),

  /* ===================== TRIỀU — bong bóng nước nhốt đối thủ (tâm cao 28, bán kính 30), vỡ khung 10 (màu = ô nước game) ===================== */
  /* v1 Bọt nổi + vỡ toé: bọt khí sáng nổi từ đáy lên trong bóng; khung 10 bóng vỡ: 40 giọt nước văng tròn, chạm đất toé nhỏ (không vẽ gợn vòng trên cỏ) */
  trieu_ult_v1: scene((c, once, R, P, o, TL, TB) => {
    const crown = (c, p) => { p.draw = dCrown; p.life = p.max = 0.16; };
    return {
      update(t) {
        if (t > F(3) && t < TB - 0.04 && R.chance(0.75)) { const x = R.range(-20, 20); fx(c, c.ax + x, c.ay + R.range(-5, 5), R.range(2, 10), 0, 0, R.range(55, 80), R.range(0.35, 0.55), dBubble, { sway: 10, size: R.range(2.5, 4.5) }); }
        once('b', t >= TB, () => { o.shake?.(0.35); o.cue?.('splash'); for (const p of c.ps) if (p.draw === dBubble) p.life = 0.01;
          for (let i = 0; i < 40; i++) { const a = R.range(0, TAU), v = R.range(60, 120), ca = Math.cos(a), sa = Math.sin(a); fx(c, c.ax + ca * 28, c.ay + R.range(-4, 4), 28 + sa * 26, ca * v, R.range(-20, 25), sa * v * 0.6 + R.range(30, 70), 2, dDrop, { g: 1, drag: 0.4, col: R.chance(0.4) ? P[0] : P[1], c2: P[4], onLand: crown }); }
          addLight(c, c.ax, c.ay - 26, 26, P[1], 0.3, 0.1); });
      },
      back() { }, front() { }, over: t => t > TB + 1,
    };
  }),
  /* v2 Màng nước vỡ mảnh: khung 10 viền bóng loé trắng 1 khung rồi màng nước vỡ thành 26 mảnh cong văng ra, rơi xuống đất toé nhỏ */
  trieu_ult_v2: scene((c, once, R, P, o, TL, TB) => {
    const crown = (c, p) => { p.draw = dCrown; p.life = p.max = 0.16; };
    return {
      update(t) { once('b', t >= TB, () => { o.shake?.(0.35); for (let i = 0; i < 26; i++) { const a = i / 26 * TAU + R.range(-0.1, 0.1), ca = Math.cos(a), sa = Math.sin(a), v = R.range(50, 90); fx(c, c.ax + ca * 30, c.ay + (sa > 0 ? 3 : -3), 28 - sa * 28, ca * v, R.range(-15, 15), -sa * v * 0.5 + R.range(30, 60), 2, dArc, { g: 1, drag: 0.6, va: R.range(-6, 6), a: a + Math.PI / 2, onLand: crown }); } }); },
      back(B, L, t) { if (t >= TB && t < TB + 0.05) ellipse(B, c.X(c.ax), c.Y(c.ay, 28), 30 * RES, 29 * RES, P[0], 1, -1); },
      front(B, L, t) { if (t >= TB && t < TB + 0.05) ellipse(B, c.X(c.ax), c.Y(c.ay, 28), 30 * RES, 29 * RES, P[0], 1, 1); },
      over: t => t > TB + 1,
    };
  }),
  /* v3 Dòng xoáy quanh bóng: 2 dải nước sáng quay quanh mặt ngoài bóng (nửa sau ở back, nửa trước ở front), siết dần; khung 10 văng ra thành giọt */
  trieu_ult_v3: scene((c, once, R, P, o, TL, TB) => {
    const pos = (s, t) => { const a = s * Math.PI + t * 8, r = 38 - 6 * smooth(F(3), TB, t); return [Math.cos(a) * r, Math.sin(a) * r * 0.45, 22 + Math.sin(a * 0.5 + s * 2) * 14, a]; };
    const crown = (c, p) => { p.draw = dCrown; p.life = p.max = 0.16; };
    const band = (B, t, fr) => { if (t < F(3) || t >= TB) return; const k = smooth(F(3), F(5), t) > 0.5 ? 1 : 0.5; for (let s = 0; s < 2; s++) for (let j = 0; j < 22; j++) { const [x, y, z, a] = pos(s, t - j * 0.01); if ((Math.sin(a) >= 0) !== fr) continue; const X = c.X(c.ax + x), Y = c.Y(c.ay + y, z), col = j < 3 ? P[0] : j < 10 ? P[1] : P[3];
      B.dot(X, Y, col, k); B.dot(X + 1, Y, col, k); if (j < 16) { B.dot(X, Y + 1, P[4], k); B.dot(X + 1, Y + 1, P[5], k); } } };
    return {
      update(t) { if (t > F(4) && t < TB && R.chance(0.3)) { const s = R.int(0, 1), [x, y, z, a] = pos(s, t); fx(c, c.ax + x, c.ay + y, z, -Math.sin(a) * 40, Math.cos(a) * 18, 10, 2, dDrop, { g: 1, col: P[1], onLand: crown }); }
        once('b', t >= TB, () => { o.shake?.(0.35); for (let s = 0; s < 2; s++) for (let j = 0; j < 14; j++) { const [x, y, z, a] = pos(s, t - j * 0.02), v = R.range(60, 100); fx(c, c.ax + x, c.ay + y, z, -Math.sin(a) * v + Math.cos(a) * 30, Math.cos(a) * v * 0.45, R.range(20, 60), 2, dDrop, { g: 1, drag: 0.4, col: j < 4 ? P[0] : P[1], c2: P[4], onLand: crown }); } }); },
      back(B, L, t) { band(B, t, false); }, front(B, L, t) { band(B, t, true); }, over: t => t > TB + 1,
    };
  }),

  /* ===================== LÔI — mây đen, 7 cú sét chạm đất (khung 3–10, đo từ ảnh), vòng điện dưới chân (7–10) ===================== */
  /* v1 Tia lửa điện văng: mỗi cú sét chạm đất bắn tia lửa 2×2 trắng–vàng–xanh nảy trên đất + chớp sao ở chân sét */
  loi_ult_v1: scene((c, once, R, P, o, TL, TB) => ({
    update(t) { LOI_HIT.forEach(([f, x, y], i) => once('s' + i, t >= F(f), () => { o.shake?.(0.1); sparks(c, 12, c.ax + x, c.ay + y, 1, 120, { up: 0.9, g: 1, drag: 1, bounce: 0.4, ramp: [P[0], P[1], P[2], P[3], P[4]], life: 1.3 }); star(c, c.ax + x, c.ay + y, 2, P[0], 2.4, 0.16); addLight(c, c.ax + x, c.ay + y, 10, P[3], 0.4, 0.08); })); },
    back() { }, front() { }, over: t => t > TB + 0.8,
  })),
  /* v2 Điện bò thân: mỗi cú sét có 2 cung điện ngắn chạy trên viền thân đối thủ (0,12 s); cung điện nối các chân sét dưới đất */
  loi_ult_v2: scene((c, once, R, P, o, TL, TB) => {
    let last = -1; const R2 = new Rng(77);
    return {
      update(t) { LOI_HIT.forEach(([f, x, y], i) => once('s' + i, t >= F(f), () => { last = t; o.shake?.(0.08); sparks(c, 5, c.ax + x, c.ay + y, 1, 80, { ramp: [P[0], P[1], P[3]], g: 0.8 }); })); },
      back(B, L, t) { if (t < F(3) || t > TB + 0.1) return; const pts = LOI_HIT.filter(s => t >= F(s[0])).map(([, x, y]) => [c.X(c.ax + x), c.Y(c.ay + y)]); for (let i = 1; i < pts.length; i++) if (R2.chance(0.6)) bolt(B, R2, pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], P[1], P[5], 3); },
      front(B, L, t) {
        if (last < 0 || t - last > 0.12) return; const s = o.sil && o.sil(); if (!s) return; const X0 = c.X(s.lx), Y0 = c.Y(s.ly);
        for (let k = 0; k < 2; k++) { const [x0, y0] = silPick(R2, s), [x1, y1] = silPick(R2, s); if (Math.hypot(x1 - x0, y1 - y0) > 30) continue; bolt(B, R2, X0 + x0, Y0 + y0, X0 + x1, Y0 + y1, P[0], P[4], 2); }
      },
      over: t => t > TB + 0.8,
    };
  }),
  /* v3 Mạng sét lan đất: từ mỗi chân sét, 3 sét con gấp khúc bò trên đất 18–28 px (lõi trắng, viền xanh), loé 3 khung rồi tắt */
  loi_ult_v3: scene((c, once, R, P, o, TL, TB) => {
    const R2 = new Rng(91);
    return {
      update(t) { LOI_HIT.forEach(([f, x, y], i) => once('s' + i, t >= F(f), () => { o.shake?.(0.1); addLight(c, c.ax + x, c.ay + y, 10, P[3], 0.4, 0.08); })); },
      back(B, L, t) { for (const [f, x, y] of LOI_HIT) { const u = (t - F(f)) / 0.12; if (u < 0 || u >= 1) continue; const X = c.X(c.ax + x), Y = c.Y(c.ay + y); for (let k = 0; k < 3; k++) { const a = R2.range(0, TAU), l = R2.range(18, 28) * RES * (0.6 + u * 0.6); bolt(B, R2, X, Y, X + Math.cos(a) * l, Y + Math.sin(a) * l * 0.5, u < 0.5 ? P[0] : P[2], P[5], 3, 0.3); } } },
      front() { }, over: t => t > TB + 0.6,
    };
  }),

  /* ===================== PHONG — vết chém gió (khung 2–3, 5–6, 8–9), chữ X khung 10 ===================== */
  /* v1 Lá + bụi theo gió: mỗi cặp nhát chém quất lá xanh + bụi bay theo hướng chém; khung 10 lá và bụi bung tròn ra ngoài */
  phong_ult_v1: scene((c, once, R, P, o, TL, TB) => ({
    update(t) {
      [2, 5, 8].forEach((f, i) => once('w' + i, t >= F(f), () => { const d = i % 2 ? -1 : 1; for (let j = 0; j < 7; j++) fx(c, c.ax - d * R.range(20, 44), c.ay + R.range(-10, 10), R.range(4, 30), d * R.range(110, 160), R.range(-10, 10), R.range(10, 40), R.range(0.4, 0.55), dLeaf, { drag: 2, g: 0.1, va: R.range(10, 20), col: LEAFY[0], c2: LEAFY[2], size: 1.5 }); for (let j = 0; j < 3; j++) puff(c, c.ax - d * R.range(10, 30), c.ay + R.range(-8, 8), DIRT[0], 2.6, 0.3, 6, { vx: d * 70, hard: 1 }); }));
      once('b', t >= TB, () => { o.shake?.(0.3); for (let j = 0; j < 16; j++) { const a = j / 16 * TAU, v = R.range(70, 110); fx(c, c.ax, c.ay, 14, Math.cos(a) * v, Math.sin(a) * v * 0.5, R.range(-10, 30), R.range(0.5, 0.7), dLeaf, { drag: 2, g: 0.1, va: R.range(-20, 20), col: LEAFY[0], c2: LEAFY[1], size: 1.5 }); } for (let j = 0; j < 10; j++) { const a = j / 10 * TAU; puff(c, c.ax + Math.cos(a) * 10, c.ay + Math.sin(a) * 5, R.chance(0.5) ? DIRT[0] : P[1], 3.2, 0.4, 2, { vx: Math.cos(a) * 55, vy: Math.sin(a) * 24, drag: 2.5, hard: 1 }); } });
    },
    back() { }, front() { }, over: t => t > TB + 0.8,
  })),
  /* v2 Lưỡi gió lưu ảnh: mỗi nhát chém để lại 1 lưỡi gió trăng khuyết DÀY quanh thân, mờ 3 bậc trong 5 khung; khung 10: 2 lưỡi to bắt chéo + sao nhỏ */
  phong_ult_v2: scene((c, once, R, P, o, TL, TB) => {
    const BL = [[2, -0.5, 24], [3, 2.4, 26], [5, 0.9, 22], [6, 3.6, 24], [8, -1.2, 26], [9, 1.8, 24]].map(([f, a, r]) => ({ at: F(f), a, r }));
    const blade = (B, b, u, fr) => { const k = qa(1 - u); if (!k) return; for (let s = 0; s < 1; s += 0.012) { const a = b.a + (s - 0.5) * 2.0 + u * 0.7, sa = Math.sin(a); if ((sa >= 0) !== fr) continue; const w = Math.sin(Math.PI * s) * 4;
      for (let q = 0; q <= w; q += 0.5) B.dot(c.X(c.ax + Math.cos(a) * (b.r + q)), c.Y(c.ay + sa * (b.r + q) * 0.45, 14 + Math.cos(a) * 6), q < 1 ? P[0] : q < 2.5 ? P[1] : P[4], k); } };
    return {
      update(t) { once('b', t >= TB, () => { o.shake?.(0.3); for (let i = 0; i < 6; i++) star(c, c.ax + R.range(-8, 8), c.ay + 1, R.range(10, 22), R.chance(0.5) ? P[0] : P[1], R.range(1.4, 2.6), R.range(0.25, 0.4)); BL.push({ at: TB, a: 0.8, r: 32 }, { at: TB, a: 2.4, r: 32 }); }); },
      back(B, L, t) { for (const b of BL) { const u = (t - b.at) / 0.2; if (u >= 0 && u < 1) blade(B, b, u, false); } },
      front(B, L, t) { for (const b of BL) { const u = (t - b.at) / 0.2; if (u >= 0 && u < 1) blade(B, b, u, true); } },
      over: t => t > TB + 0.6,
    };
  }),
  /* v3 Lốc bụi cuộn chân: 3 nhánh bụi đất xoắn quay trên đất dưới chân + vệt gió xoắn bốc lên mép; khung 10 bụi bung ra ngoài */
  phong_ult_v3: scene((c, once, R, P, o, TL, TB) => ({
    update(t) { if (t > F(2) && t < TB && R.chance(0.6)) { const a = R.range(0, TAU); part(c, K.STREAK, c.ax + Math.cos(a) * 32, c.ay + Math.sin(a) * 14, 2, -Math.sin(a) * 100, Math.cos(a) * 44, 50, 0.25, P[1], 1, {}); }
      if (t > F(3) && t < TB && R.chance(0.4)) { const a = R.range(0, TAU), r = R.range(14, 34); puff(c, c.ax + Math.cos(a) * r, c.ay + Math.sin(a) * r * 0.45, DIRT[0], 2.8, 0.3, 14, { vx: -Math.sin(a) * 40, vy: Math.cos(a) * 18 }); }
      once('b', t >= TB, () => { o.shake?.(0.3); for (let i = 0; i < 14; i++) { const a = i / 14 * TAU; puff(c, c.ax + Math.cos(a) * 18, c.ay + Math.sin(a) * 8, R.chance(0.5) ? DIRT[0] : DIRT[1], 4.2, 0.45, 3, { vx: Math.cos(a) * 60, vy: Math.sin(a) * 26, drag: 2.6 }); } }); },
    back(B, L, t) { if (t < F(1) || t > TB + 0.05) return; const k = smooth(F(1), F(3), t) > 0.5 ? 1 : 0.5;
      for (let arm = 0; arm < 3; arm++) for (let s = 0; s < 1; s += 0.01) { const a = arm * TAU / 3 + s * 4 + t * 7, r = 8 + s * 36, X = c.X(c.ax + Math.cos(a) * r), Y = c.Y(c.ay + 1 + Math.sin(a) * r * 0.45), col = s > 0.7 ? P[4] : s > 0.35 ? P[2] : P[0];
        B.dot(X, Y, col, k); B.dot(X + 1, Y, col, k); if (s < 0.75) B.dot(X, Y + 1, P[5], k); } },
    front() { }, over: t => t > TB + 0.7,
  })),

  /* ===================== MỘC — dây leo trồi (gốc khung 2–7), ngọn cao ~60, hoa nở giữa cao 58 (khung 8–11) ===================== */
  /* v1 Lá rơi + phấn hoa: lá rụng lả tả từ ngọn dây leo; hoa nở thì phấn vàng bay lên quanh hoa */
  moc_ult_v1: scene((c, once, R, P, o, TL, TB) => ({
    update(t) {
      if (t > F(4) && t < TB + 0.15 && R.chance(0.6)) { const [x, y, z] = R.pick(MOC_TOP); fx(c, c.ax + x + R.range(-4, 4), c.ay + y, z - R.range(0, 10), R.range(-12, 12), 0, 0, 0.8, dLeaf, { g: 0.07, drag: 2, sway: 16, va: R.range(4, 9), col: LEAFY[0], c2: LEAFY[2], size: 1.5 }); }
      if (t > F(8) && t < TB + 0.25) for (let q = 0; q < 2; q++) fx(c, c.ax + R.range(-14, 14), c.ay + R.range(-4, 4), FLOWER + R.range(-8, 4), R.range(-20, 20), 0, R.range(-5, 20), 0.5, dSpark, { sway: 10, size: 2, ramp: POLLEN });
    },
    back() { }, front() { }, over: t => t > TB + 0.9,
  })),
  /* v2 Rễ trồi + đất bung: ở gốc mỗi dây leo có rễ con dày cong trồi khỏi đất + cục đất bật; khung 10 đất bung lần 2 rồi rễ rút xuống */
  moc_ult_v2: scene((c, once, R, P, o, TL, TB) => {
    const SP = MOC_BASE.map(([f, x, y]) => ({ x, y, at: F(f), r: Array.from({ length: 3 }, () => ({ a: R.range(-2.7, -0.4), h: R.range(8, 13), bend: R.range(-0.6, 0.6) })) }));
    return {
      update(t) { SP.forEach((s, i) => once('s' + i, t >= s.at, () => { o.shake?.(0.05); for (let j = 0; j < 4; j++) pebbleHop(c, c.ax + s.x, c.ay + s.y, 0.9, DIRT); }));
        once('b', t >= TB, () => { o.shake?.(0.25); for (const s of SP) { for (let j = 0; j < 3; j++) pebbleHop(c, c.ax + s.x, c.ay + s.y, 1, DIRT); puff(c, c.ax + s.x, c.ay + s.y, DIRT[1], 3.5, 0.35, 10); } }); },
      back(B, L, t) { for (const s of SP) { if (t < s.at) continue; const g = outBack((t - s.at) / 0.15) * (1 - outCubic((t - TB - 0.1) / 0.25)); if (g <= 0) continue;
        ditherOval(B, c.X(c.ax + s.x), c.Y(c.ay + s.y), 5 * RES * Math.min(1, g), 2.2 * RES, DIRT[2], 1);
        for (const r of s.r) { let x = c.X(c.ax + s.x), y = c.Y(c.ay + s.y), a = r.a; const n = r.h * g * RES; for (let d = 0; d < n; d++) { a += r.bend * 0.06; x += Math.cos(a); y += Math.sin(a) * 0.9; const tip = d > n - 3; B.set(x - 1, y, P[7]); B.set(x, y, tip ? P[0] : P[3]); B.set(x + 1, y, tip ? P[1] : P[5]); B.set(x + 2, y, P[7]); } } } },
      front() { }, over: t => t > TB + 0.9,
    };
  }),
  /* v3 Cánh hoa toả: khung 10 hoa (cao 58) bung 26 cánh hồng xoay tròn ra ngoài rồi rơi lả tả, kèm lá nhỏ */
  moc_ult_v3: scene((c, once, R, P, o, TL, TB) => ({
    update(t) {
      once('bl', t >= F(8), () => { for (let i = 0; i < 6; i++) star(c, c.ax + R.range(-10, 10), c.ay + 2, FLOWER + R.range(-8, 6), POLLEN[0], 1.6, 0.3); });
      once('b', t >= TB, () => { o.shake?.(0.25); for (let i = 0; i < 26; i++) { const a = i / 26 * TAU + R.range(-0.1, 0.1), v = R.range(50, 90); fx(c, c.ax + Math.cos(a) * 6, c.ay + Math.sin(a) * 3 + 3, FLOWER + Math.sin(a) * 6, Math.cos(a) * v, Math.sin(a) * v * 0.4, R.range(0, 25), R.range(0.75, 1), dLeaf, { g: 0.1, drag: 2, sway: 12, va: R.range(8, 16), col: PETAL[1], c2: PETAL[2], size: 1.5 }); }
        for (let i = 0; i < 8; i++) { const a = R.range(0, TAU), v = R.range(40, 70); fx(c, c.ax, c.ay + 3, FLOWER - 6, Math.cos(a) * v, Math.sin(a) * v * 0.4, 20, 0.75, dLeaf, { g: 0.1, drag: 2, sway: 10, va: 10, col: LEAF[0], c2: LEAF[2], size: 1.5 }); } });
    },
    back() { }, front() { }, over: t => t > TB + 1.1,
  })),

  /* ===================== TINH — viên ngọc cao 60 (0–9), tia cầu vồng xuống 4 điểm đất (7–9), ngọc nhỏ rơi (11) ===================== */
  /* v1 Lấp lánh lăng kính: sao lấp lánh trên mặt ngọc; tia chạm đất loé sao nhiều màu; ngọc nhỏ rơi xuống loé sao */
  tinh_ult_v1: scene((c, once, R, P, o, TL, TB) => ({
    update(t) {
      if (t > F(2) && t < F(10) && R.chance(0.45)) star(c, c.ax + R.range(-16, 16), c.ay - 1, TINH_GEM + R.range(-8, 10), R.chance(0.6) ? P[0] : P[1], R.range(1.4, 2.6), 0.3);
      TINH_RAY.forEach(([x, y], i) => once('r' + i, t >= F(7) + i * 0.03, () => { for (let j = 0; j < 3; j++) star(c, c.ax + x + R.range(-3, 3), c.ay + y, R.range(0, 5), R.pick([P[0], P[1], CYAN, POLLEN[0]]), R.range(1.6, 2.6), R.range(0.3, 0.5)); }));
      TINH_GEMS.forEach(([x, y], i) => once('g' + i, t >= F(11), () => star(c, c.ax + x, c.ay + y, 3, P[0], 2.4, 0.3)));
    },
    back() { }, front() { }, over: t => t > TB + 0.7,
  })),
  /* v2 Mảnh pha lê rơi nảy: khung 10 ngọc vỡ, 20 mảnh pha lê hồng rơi xuống quanh thân, nảy 1 lần, loé sao rồi tắt */
  tinh_ult_v2: scene((c, once, R, P, o, TL, TB) => ({
    update(t) { once('b', t >= TB, () => { o.shake?.(0.2); for (let i = 0; i < 20; i++) { const a = R.range(0, TAU), r = R.range(12, 40); part(c, K.CHUNK, c.ax + Math.cos(a) * 6, c.ay + Math.sin(a) * 3, TINH_GEM, Math.cos(a) * r * 1.4, Math.sin(a) * r * 0.5, R.range(-10, 30), R.range(0.8, 1), R.pick([P[1], P[2], P[3]]), R.range(1.4, 2.2), { g: 1, bounce: 0.35, drag: 0.3, va: R.range(-10, 10), qf: 1 }); } });
      for (const p of c.ps) if (p.k === K.CHUNK && p.rest && !p.st) { p.st = 1; star(c, p.x, p.y, 1, P[0], 1.8, 0.25); } },
    back() { }, front() { }, over: t => t > TB + 1,
  })),
  /* v3 Hạt cầu vồng chạy dọc tia: lúc tia chiếu (khung 7–9) hạt sáng nhiều màu chạy từ ngọc xuống 4 điểm đất, chạm đất loé sao */
  tinh_ult_v3: scene((c, once, R, P, o, TL, TB) => {
    const COLS = [P[0], P[1], CYAN, POLLEN[0], PINK];
    return {
      update(t) { if (t > F(6.5) && t < F(9.5)) for (let q = 0; q < 3; q++) { const [x, y] = R.pick(TINH_RAY), T = 0.22; fx(c, c.ax + R.range(-3, 3), c.ay + y * 0.2, TINH_GEM - 12, x / T, y * 0.8 / T, -(TINH_GEM - 12) / T, T, dSpark, { size: 2, ramp: [R.pick(COLS), P[1], P[2]], onLand: (c, p) => { p.life = 0.01; } }); }
        for (const p of c.ps) if (p.k === K.FX && p.life < 0.02 && !p.st) { p.st = 1; star(c, p.x, p.y, 1, R.pick(COLS), 1.8, 0.22); }
        once('b', t >= TB, () => o.shake?.(0.2)); },
      back() { }, front() { }, over: t => t > TB + 0.5,
    };
  }),

  /* ===================== MÃ — lưới số (0–2), cột dữ liệu x −42 −20 22 44 (khung 3–6) + khối lập phương, sập (9–10) ===================== */
  /* v1 Khối pixel vỡ: cột trồi thì rắc vài pixel; khung 9–10 cột + khối sập thành pixel vuông rơi nảy trên lưới rồi tắt gọn */
  ma_ult_v1: scene((c, once, R, P, o, TL, TB) => {
    const bit = (x, y, z, v, sz) => { const a = R.range(0, TAU); fx(c, x, y, z, Math.cos(a) * v, Math.sin(a) * v * 0.5, R.range(20, 60), R.range(0.5, 0.75), dBit, { g: 1, bounce: 0.3, drag: 0.5, col: R.pick([P[1], P[2], P[3]]), c2: P[0], size: sz, qf: 1 }); };
    return {
      update(t) { MA_COL.forEach(([f, x, y], i) => once('c' + i, t >= F(f), () => { for (let j = 0; j < 4; j++) bit(c.ax + x, c.ay + y, R.range(4, 20), 30, 1); }));
        once('b', t >= F(9), () => { o.shake?.(0.3); o.cue?.('glitch'); for (const [, x, y] of MA_COL) for (let j = 0; j < 9; j++) bit(c.ax + x + R.range(-6, 6), c.ay + y + R.range(-3, 3), R.range(8, 40), R.range(30, 70), R.chance(0.3) ? 2 : 1.3); }); },
      back() { }, front() { }, over: t => t > TB + 0.9,
    };
  }),
  /* v2 Nhiễu sọc: lúc chạm 1 và lúc sập có 3 khung sọc ngang lệch màu (xanh / hồng / lục) chạy trên mặt lưới — chỉ dưới đất — + pixel rơi */
  ma_ult_v2: scene((c, once, R, P, o, TL, TB) => {
    const R2 = new Rng(5);
    const glitch = (B, t, w) => { const u = (t - w) / 0.12; if (u < 0 || u >= 1) return; for (let k = 0; k < 7; k++) { const y = c.Y(c.ay + R2.range(-14, 14)), x0 = c.X(c.ax + R2.range(-50, 20)), len = R2.range(16, 44) * RES, col = R2.pick([P[0], P[1], PINK, CYAN]);
      for (let x = 0; x < len; x++) if (hash2(x >> 2, k, Math.floor(t * 50)) < 0.8) { B.set(x0 + x, y, col); B.set(x0 + x, y + 1, col); B.set(x0 + x + 3, y + 2, P[6]); } } };
    return {
      update(t) { for (const [w, n] of [[TL, 8], [F(9), 14]]) once('g' + w, t >= w, () => { o.shake?.(0.15); for (let j = 0; j < n; j++) fx(c, c.ax + R.range(-40, 40), c.ay + R.range(-12, 12), R.range(10, 40), 0, 0, 0, R.range(0.35, 0.55), dBit, { g: 1, bounce: 0.2, col: R.pick([P[1], P[2]]), c2: P[0], size: 1.3, qf: 1 }); }); },
      back(B, L, t) { glitch(B, t, TL); glitch(B, t, F(9)); glitch(B, t, F(9) + 0.16); }, front() { }, over: t => t > TB + 0.7,
    };
  }),
  /* v3 Mưa mã 0/1: chữ số 0 và 1 (3×5 px logic, viền tối) rơi theo cột hai bên thân, chạm lưới thì nháy rồi tắt; lúc sập bung 1 loạt */
  ma_ult_v3: scene((c, once, R, P, o, TL, TB) => {
    const drop = (x, y, z) => fx(c, x, y, z, 0, 0, -R.range(50, 80), 0.9, dGlyph, { g: 0.15, gl: R.chance(0.5) ? 0 : 1, col: R.chance(0.3) ? P[0] : P[2], c2: P[0], qf: 1, onLand: (c, p) => { p.life = Math.min(p.life, 0.12); } });
    return {
      update(t) { if (t > F(3) && t < F(9) && R.chance(0.6)) { const s = R.sign(); drop(c.ax + s * R.range(16, 46), c.ay + R.range(-10, 10), R.range(34, 56)); }
        once('b', t >= F(9), () => { o.shake?.(0.25); for (let i = 0; i < 12; i++) { const s = R.sign(); drop(c.ax + s * R.range(12, 46), c.ay + R.range(-12, 12), R.range(14, 44)); } }); },
      back() { }, front() { }, over: t => t > TB + 1,
    };
  }),

  /* ===================== ÂM — 4 loa trồi (khung 1–5), đĩa sóng tím đập dưới chân khung 6, 7, 9, 11 ===================== */
  /* v1 Sóng âm từ loa: mỗi nhịp mỗi loa bắn 2 cung sóng )) dày về phía đối thủ, nở ra rồi tắt */
  am_ult_v1: scene((c, once, R, P, o, TL, TB) => {
    const BEAT = AM_BEAT.map(F);
    const arcs = (B, t, front) => { for (const b of BEAT) { const u = (t - b) / 0.22; if (u < 0 || u >= 1) continue; for (const [x, y, z] of AM_SPK) { if ((y > -8) !== front) continue; const dir = Math.atan2(-y * 2, -x);
      for (let j = 0; j < 2; j++) { const r = 5 + 16 * u + j * 5; for (let s = -0.7; s <= 0.7; s += 0.05) { const a = dir + s, X = c.X(c.ax + x + Math.cos(a) * r), Y = c.Y(c.ay + y + Math.sin(a) * r * 0.5, z); B.dot(X, Y, j ? P[2] : P[1], qa(1 - u)); B.dot(X, Y + 1, P[4], qa(1 - u)); } } } } };
    return { update(t) { BEAT.forEach((b, i) => once('b' + i, t >= b, () => o.shake?.(i === 3 ? 0.3 : 0.08))); }, back(B, L, t) { arcs(B, t, false); }, front(B, L, t) { arcs(B, t, true); }, over: t => t > F(11) + 0.3 };
  }),
  /* v2 Nốt nhạc bay: mỗi nhịp các loa bật nốt nhạc pixel to (viền tối) bay lên chéo ra ngoài rồi tắt */
  am_ult_v2: scene((c, once, R, P, o, TL, TB) => {
    const BEAT = AM_BEAT.map(F);
    return {
      update(t) { BEAT.forEach((b, i) => once('b' + i, t >= b, () => { o.shake?.(i === 3 ? 0.3 : 0.06); for (const [x, y, z] of AM_SPK) if (R.chance(0.75)) fx(c, c.ax + x, c.ay + y, z + R.range(4, 12), Math.sign(x) * R.range(10, 25), 0, R.range(25, 40), 0.6, dGlyph, { drag: 1.5, sway: 10, gl: R.chance(0.5) ? 'note' : 'note2', col: R.chance(0.5) ? P[1] : P[2], c2: P[0], qf: 1 }); })); },
      back() { }, front() { }, over: t => t > TB + 0.9,
    };
  }),
  /* v3 Đất rung nảy sỏi: mỗi nhịp đá sỏi quanh chân nảy theo, bụi tím phụt ở chân loa; nhịp cuối (khung 11) nảy cao nhất */
  am_ult_v3: scene((c, once, R, P, o, TL, TB) => {
    const BEAT = AM_BEAT.map(F), PEB = Array.from({ length: 18 }, () => { const a = R.range(0, TAU), r = R.range(12, 42); return [Math.cos(a) * r, Math.sin(a) * r * 0.5]; });
    return {
      update(t) { BEAT.forEach((b, i) => once('b' + i, t >= b, () => { const big = i === 3; o.shake?.(big ? 0.3 : 0.08); for (const [x, y] of PEB) if (R.chance(big ? 0.9 : 0.4)) pebbleHop(c, c.ax + x, c.ay + y, big ? 0.9 : 0.55, [DIRT[1], DIRT[2], P[4]]); for (const [x, y] of AM_SPK) puff(c, c.ax + x, c.ay + y, P[3], 3.4, 0.35, 8); })); },
      back() { }, front() { }, over: t => t > TB + 1,
    };
  }),

  /* ===================== ẢNH — hố bóng tím dưới chân (0–3), tay bóng trồi quanh (5–9), mắt đỏ (đã có trong ảnh PixelLab) ===================== */
  /* v1 Khói đen bốc: khói tím đen dày bốc lên từ mép hố (không trùm thân), khung 10 xoáy tung ra rồi tắt */
  anh_ult_v1: scene((c, once, R, P, o, TL, TB) => ({
    update(t) {
      if (t > F(2) && t < TB) for (let q = 0; q < 2; q++) { const a = R.range(0, TAU), r = R.range(22, 32); puff(c, c.ax + Math.cos(a) * r, c.ay + Math.sin(a) * r * 0.45, R.chance(0.5) ? P[6] : P[5], R.range(2.6, 3.6), R.range(0.4, 0.55), R.range(18, 30), { vx: -Math.sin(a) * 12, vy: 0, drag: 1.2, z: 1, hard: 1 }); }
      once('b', t >= TB, () => { o.shake?.(0.3); for (let i = 0; i < 14; i++) { const a = i / 14 * TAU; puff(c, c.ax + Math.cos(a) * 18, c.ay + Math.sin(a) * 8, R.chance(0.5) ? P[6] : P[4], 3.6, 0.4, 6, { z: 4, vx: Math.cos(a) * 55 - Math.sin(a) * 30, vy: Math.sin(a) * 24, hard: 1 }); } });
    },
    back() { }, front() { }, over: t => t > TB + 0.8,
  })),
  /* v2 Xúc tu bóng: 9 xúc tu dày uốn sóng mọc từ mép hố (sau lưng cao, trước mặt thấp), quẫy rồi rút xuống sau khung 10 */
  anh_ult_v2: scene((c, once, R, P, o, TL, TB) => {
    const T = Array.from({ length: 9 }, (_, i) => { const a = i / 9 * TAU + R.range(-0.2, 0.2), sa = Math.sin(a); return { x: Math.cos(a) * 32, y: sa * 14, h: sa > 0.3 ? R.range(9, 13) : R.range(18, 28), ph: R.range(0, TAU), at: F(3) + R.range(0, 0.15), front: sa > 0.3 }; });
    const draw = (B, t, fr) => { for (const s of T) { if (s.front !== fr || t < s.at) continue; const g = outCubic((t - s.at) / 0.2) * (1 - outCubic((t - TB - 0.05) / 0.22)); if (g <= 0) continue; const n = Math.round(s.h * g * RES);
      for (let d = 0; d < n; d++) { const u = d / Math.max(1, s.h * RES), x = Math.round(c.X(c.ax + s.x) + Math.sin(u * 5 + t * 9 + s.ph) * 3 * u * RES), y = c.Y(c.ay + s.y) - d, w = u < 0.4 ? 2 : u < 0.8 ? 1 : 0;
        B.set(x - 1, y, P[7]); B.set(x + 1 + w, y, P[7]); for (let q = 0; q <= w; q++) B.set(x + q, y, q === 0 && u > 0.2 ? P[3] : P[5]); if (d === n - 1) B.set(x, y - 1, P[2]); } } };
    return { update(t) { once('b', t >= TB, () => o.shake?.(0.3)); }, back(B, L, t) { draw(B, t, false); }, front(B, L, t) { draw(B, t, true); }, over: t => t > TB + 0.4 };
  }),
  /* v3 Đom tím hút vào hố: đốm tím 2×2 xoáy vào tâm hố trong lúc giữ; khung 10 bung ngược ra ngoài thành tia đốm */
  anh_ult_v3: scene((c, once, R, P, o, TL, TB) => ({
    update(t) {
      if (t > F(2) && t < TB) for (let q = 0; q < 2; q++) { const a = R.range(0, TAU), r = R.range(36, 48); const p = fx(c, c.ax + Math.cos(a) * r, c.ay + Math.sin(a) * r * 0.45, R.range(2, 16), 0, 0, 0, 0.4, dSpark, { size: 2, ramp: [P[0], P[1], P[2], P[3]] }); p.vx = (c.ax - p.x) / 0.4 - Math.sin(a) * 50; p.vy = (c.ay - p.y) / 0.4 + Math.cos(a) * 20; p.vz = -p.z / 0.4; }
      once('b', t >= TB, () => { o.shake?.(0.3); sparks(c, 26, c.ax, c.ay, 3, 120, { up: 0.6, g: 0.2, ramp: [P[0], P[1], P[2], P[4]], life: 1.6 }); });
    },
    back() { }, front() { }, over: t => t > TB + 0.7,
  })),

  /* ===================== QUANG — tia xuyên từ miệng (o.mx, o.my) + hào quang rơi (0–6), nổ sáng dưới chân (7–8), lông vũ trôi (8–13) ===================== */
  /* v1 Lông vũ + bụi vàng: chớp sao ở MIỆNG lúc bắn; trong cột hào quang bụi vàng rơi chậm, khung 8 thêm lông vũ trắng rơi lả tả */
  quang_ult_v1: scene((c, once, R, P, o, TL, TB) => ({
    update(t) {
      once('m', t >= 0, () => { if (o.mx != null) { for (let i = 0; i < 6; i++) star(c, o.mx + R.range(-1, 3), o.my + 6, 6 + R.range(-3, 3), R.chance(0.5) ? P[0] : P[1], R.range(1.4, 2.4), R.range(0.2, 0.35)); addLight(c, o.mx, o.my, 10, P[2], 0.4, 0.1); } });
      if (t > F(1) && t < TB + 0.2) for (let q = 0; q < 2; q++) fx(c, c.ax + R.range(-26, 26), c.ay + R.range(-6, 8), R.range(26, 56), 0, 0, -R.range(14, 26), 0.6, dSpark, { sway: 8, size: 2, ramp: [P[0], P[1], P[2], P[3]] });
      once('f', t >= F(8), () => { for (let i = 0; i < 8; i++) fx(c, c.ax + R.range(-28, 28), c.ay + R.range(-6, 8), R.range(28, 46), R.range(-10, 10), 0, 0, R.range(0.7, 0.9), dLeaf, { g: 0.05, drag: 2, sway: 16, va: R.range(3, 7), col: P[0], c2: P[2], size: 2 }); });
    },
    back() { }, front() { }, over: t => t > TB + 0.9,
  })),
  /* v2 Tia sáng toả: miệng loé chữ thập lúc bắn; khung 7 (nổ sáng) 10 tia dày toả ra từ chân đối thủ, mọc–thu trong 4 khung, chừa thân ở giữa */
  quang_ult_v2: scene((c, once, R, P, o, TL, TB) => {
    const RAY = Array.from({ length: 10 }, (_, i) => ({ a: i / 10 * TAU + 0.15, l: i % 2 ? 16 : 28 }));
    const rays = (B, t, fr) => { const u = (t - F(7)) / 0.18; if (u < 0 || u >= 1) return; const r0 = 16 + 6 * u, k = qa(1 - u * 0.8);
      for (const r of RAY) { const ca = Math.cos(r.a), sa = Math.sin(r.a); if ((sa >= 0) !== fr) continue; const L1 = r0 + r.l * Math.sin(Math.PI * Math.min(1, u * 1.4)); for (let d = r0; d < L1; d += 0.5) { const X = c.X(c.ax + ca * d), Y = c.Y(c.ay + 2 + sa * d * 0.5, 4); B.dot(X, Y, d > L1 - 3 ? P[2] : P[0], k); B.dot(X, Y + 1, P[2], k); B.dot(X + 1, Y, P[1], k); } } };
    return {
      update(t) { once('m', t >= 0, () => { if (o.mx != null) addLight(c, o.mx, o.my, 10, P[2], 0.4, 0.1); }); once('b', t >= F(7), () => { o.shake?.(0.3); }); },
      back(B, L, t) { if (o.mx != null) { const u = t / 0.2; if (u >= 0 && u < 1) { const X = c.X(o.mx), Y = c.Y(o.my), n = Math.round(Math.sin(Math.PI * u) * 8); for (let d = 1; d <= n; d++) for (const [dx, dy] of CROSS) { B.set(X + dx * d, Y + dy * d, d > n - 2 ? P[2] : P[0]); B.set(X + dx * d + dy, Y + dy * d + dx, P[1]); } } } rays(B, t, false); },
      front(B, L, t) { rays(B, t, true); },
      over: t => t > TB + 0.4,
    };
  }),
  /* v3 Vòng thánh trên đất: vòng chấm vàng (2×2, có dấu chữ thập) nở dưới chân theo nhịp hào quang rơi, đốm sáng bốc lên từ vòng; tắt gọn sau khung 10 */
  quang_ult_v3: scene((c, once, R, P, o, TL, TB) => {
    const rr = t => 16 + 22 * outCubic((t - F(1)) / 0.5);
    const dots = (B, t, half) => { if (t < F(1) || t > TB + 0.2) return; const r = rr(t), a = t > TB + 0.1 ? 0.5 : 1, n = 24;
      for (let i = 0; i < n; i++) { const th = i / n * TAU + t * 0.8, s = Math.sin(th); if ((s >= 0) !== (half > 0)) continue; const X = Math.round(c.X(c.ax + Math.cos(th) * r)), Y = Math.round(c.Y(c.ay + 1 + s * r * 0.5));
        B.dot(X, Y, P[0], a); B.dot(X + 1, Y, P[1], a); B.dot(X, Y + 1, P[2], a); B.dot(X + 1, Y + 1, P[3], a); if (i % 3 === 0) for (const [dx, dy] of CROSS) { B.dot(X + dx * 2, Y + dy * 2, P[2], a); B.dot(X + dx * 3, Y + dy * 3, P[4], a); } } };
    return {
      update(t) { once('m', t >= 0, () => { if (o.mx != null) for (let i = 0; i < 5; i++) star(c, o.mx + R.range(0, 3), o.my + 6, 6, P[1], 1.6, 0.25); });
        if (t > F(3) && t < TB && R.chance(0.7)) { const th = R.range(0, TAU), r = rr(t); fx(c, c.ax + Math.cos(th) * r, c.ay + 1 + Math.sin(th) * r * 0.5, 1, 0, 0, R.range(24, 38), 0.4, dSpark, { size: 2, ramp: [P[0], P[1], P[2], P[3]] }); }
        once('b', t >= TB, () => o.shake?.(0.25)); },
      back(B, L, t) { dots(B, t, -1); }, front(B, L, t) { dots(B, t, 1); }, over: t => t > TB + 0.7,
    };
  }),
});
/* bộ vẽ dùng chung cho pxfx-sk.js (kỹ năng thường) */
export const UKIT = { fx, dSpark, dBit, dLeaf, dDrop, dCrown, dBubble, dGlyph, dSpot, ellipse, bolt, jag, drawPath, pebbleHop, puff, sparks, star, scene, qa, PETAL, POLLEN, DIRT, LEAF, LEAFY, PINK, CYAN };
