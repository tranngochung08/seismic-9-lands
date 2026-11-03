/* pxfx_full.js — p61 FULL: BẢN SO SÁNH — TOÀN BỘ VFX chiêu Chấn Thú VẼ CODE TỪNG PIXEL (không lớp ảnh PixelLab nào cho hiệu ứng; sprite thú vẫn PixelLab).
   12 hệ x (4 chiêu thường + 1 tuyệt chiêu), bộ chiêu theo SET5 của _wip/p52 linhduel.js / duel-data.js (chỉ đọc).
   Không thay bản chính: chỉ dùng trong _wip/p61/preview_full/ để xuất GIF assets/px/test/p61full/.

   Kỹ thuật theo Sprite Fusion VFX (ice.ts / movement.ts / black-hole.ts / rain.ts):
     MIT License — Copyright (c) 2026 Hugo Duprez. Bộ đệm màu + lớp light, dither Bayer 4x4, Rng, crystal, vật lý hạt lấy qua pxfx.js / pxfx-ult.js
     (chuyển thể từ các file trên; giữ ghi chú bản quyền này khi chép tiếp).
   Quy ước: mỗi chiêu là 1 cảnh toàn khung (hộp vẽ 256 x 132 logic, neo ở chân đối thủ — lớp back vẽ sau thú, front vẽ trước thú, light cộng sáng).
   Toạ độ logic: x, y = điểm trên mặt đất, z = độ cao. c.X(x), c.Y(y, z) đổi sang điểm đệm (RES = 2 điểm / px logic = 1 px canvas 2x).
   o.C = chân thú ra chiêu, o.M = miệng {x, y (chân), z}, neo c.ax, c.ay = chân đối thủ.
   Móc (từ trang xem trước): o.hit(sức) (đối thủ trúng + khựng hitstop + rung), o.shake, o.flash, o.knock (hất bay, tuyệt chiêu),
   o.dash(x1, T, quayVề), o.hide(T), o.warp(x, T), o.cx() (x hiện tại của thú ra chiêu).
   Nhịp mỗi chiêu thường (ô 1,5 s): 0,05–0,3 chuẩn bị (tụ hạt ở miệng / chân) -> 0,3 ra đòn -> trúng (hitstop ngắn) -> dư âm tắt gọn trước 1,45 s.
   Tuyệt chiêu (2,48 s): 0–0,4 tụ lực ở thú ra chiêu -> 0,4 dàn dựng quanh đối thủ (lớp sau cao, lớp trước thấp, che <= 40 %) -> đòn chốt + hất -> dư âm. */
import { addScenes, KIT, PAL } from './pxfx.js';
import { UKIT } from './pxfx-ult.js';
const { Rng, K, part, addLight, crystal, frostPatch, ditherOval, line, mix, scaleC, hex, bayer, hash2, clamp, lerp, smooth, outCubic, outBack, CROSS, DIAG, TAU, RES } = KIT;
const { fx, dSpark, dBit, dLeaf, dDrop, dCrown, dGlyph, dSpot, ellipse, jag, drawPath, pebbleHop, puff, sparks, star, POLLEN, LEAFY, PETAL, PINK, CYAN } = UKIT;

/* ===================== tiện ích ===================== */
const tm = (t, a, b) => clamp((t - a) / (b - a));
const rp = (r, k) => r[Math.min(r.length - 1, Math.max(0, Math.floor((1 - k) * r.length)))];
const H = s => hex(s);
function SC(fn) {
  return c => {
    const fired = new Set(), at = (k, t, t0, f) => { if (t >= t0 && !fired.has(k)) { fired.add(k); f(); } };
    const s = fn(c, at, c.R, c.P, c.o), end = s.end ?? 1.4;
    return { update: s.update || (() => { }), back: s.back || (() => { }), front: s.front || (() => { }), over: s.over || (t => t > end) };
  };
}
function disc(B, X, Y, r, col, a = 1) { for (let y = Math.floor(Y - r); y <= Math.ceil(Y + r); y++) for (let x = Math.floor(X - r); x <= Math.ceil(X + r); x++) { const dx = x + 0.5 - X, dy = y + 0.5 - Y; if (dx * dx + dy * dy <= r * r) B.dot(x, y, col, a); } }
/* quả cầu tô bóng: sáng trên-trái, chuyển bậc bằng dither Bayer; out = viền 1 điểm */
function orb(B, X, Y, r, cols, out = null, a = 1) { if (r < 0.5) return; const rq = q2(r); stamp(B, 'ob|' + rq + '|' + cols.join(',') + '|' + out + '|' + a, X, Y, sb => orbRaw(sb, 0, 0, rq, cols, out, a)); }
function orbRaw(B, X, Y, r, cols, out = null, a = 1) {
  const n = cols.length, R1 = r + (out != null ? 1 : 0);
  for (let y = Math.floor(Y - R1); y <= Math.ceil(Y + R1); y++) for (let x = Math.floor(X - R1); x <= Math.ceil(X + R1); x++) {
    const dx = x + 0.5 - X, dy = y + 0.5 - Y, d = Math.sqrt(dx * dx + dy * dy); if (d > R1) continue;
    if (d > r) { B.dot(x, y, out, a); continue; }
    const l = 0.5 - 0.5 * (dx * 0.6 + dy * 0.8) / Math.max(1, r) - 0.25 * (d / r) * (d / r);
    B.dot(x, y, cols[clamp(Math.floor((1 - l) * n + (bayer(x, y) - 0.5) * 0.9), 0, n - 1)], a);
  }
}
/* ống dày theo đường gấp (điểm đệm): wf(u) = nửa bề rộng; cols = [nóng, lõi, giữa, mép, viền?]. Vẽ 2 lượt (viền trước) để không hở / không đè lõi */
function tube(B, pts, wf, cols, a = 1) {
  let tot = 0; const seg = []; for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(l); tot += l; }
  if (tot < 0.5) return;
  for (let pass = cols[4] == null ? 1 : 0; pass < 2; pass++) {
    let acc = 0;
    for (let i = 1; i < pts.length; i++) {
      const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], l = seg[i - 1] || 0.001, ux = (x1 - x0) / l, uy = (y1 - y0) / l, nx = -uy, ny = ux;
      for (let s = 0; s <= l; s += 0.5) {
        const u = (acc + s) / tot, w = Math.max(0.5, wf(u)), cx = x0 + ux * s, cy = y0 + uy * s;
        if (pass === 0) { for (let q = -w - 1; q <= w + 1; q += 0.5) B.dot(cx + nx * q, cy + ny * q, cols[4], a); }
        else for (let q = -w; q <= w; q += 0.5) { const k = Math.abs(q) / w; B.dot(cx + nx * q, cy + ny * q, k < 0.3 ? cols[0] : k < 0.6 ? cols[1] : k < 0.85 ? cols[2] : cols[3], a); }
      }
      acc += l;
    }
  }
}
/* tia thẳng có sóng: từ (X0,Y0) tới (X1,Y1), thon w0 -> to w1, len = phần đã mọc (0..1), from = phần đã tắt ở gốc */
function beam(B, X0, Y0, X1, Y1, w0, w1, cols, o = {}) {
  const Ln = Math.hypot(X1 - X0, Y1 - Y0) || 1, n = Math.max(2, Math.ceil(Ln / 3)), ux = (X1 - X0) / Ln, uy = (Y1 - Y0) / Ln, T = o.t || 0, pts = [];
  const s0 = (o.from || 0) * Ln, s1 = (o.len ?? 1) * Ln;
  for (let i = 0; i <= n; i++) { const s = lerp(s0, s1, i / n), d = o.wave ? Math.sin(s * (o.wk || 0.15) - T * (o.ww || 30)) * o.wave * Math.min(1, s / 12) : 0; pts.push([X0 + ux * s - uy * d, Y0 + uy * s + ux * d]); }
  const wob = o.wob || 0;
  tube(B, pts, u => { const s = lerp(s0, s1, u); return lerp(w0, w1, s / Ln) * (1 + wob * Math.sin(s * 0.5 - T * 45)); }, cols, o.a ?? 1);
}
function jagPts(R, X0, Y0, X1, Y1, seg = 7, jit = 4) {
  const L = Math.hypot(X1 - X0, Y1 - Y0) || 1, n = Math.max(2, Math.round(L / seg)), nx = -(Y1 - Y0) / L, ny = (X1 - X0) / L, pts = [[X0, Y0]];
  for (let i = 1; i < n; i++) { const u = i / n, j = R.range(-jit, jit) * Math.min(1, i, n - i); pts.push([lerp(X0, X1, u) + nx * j, lerp(Y0, Y1, u) + ny * j]); }
  pts.push([X1, Y1]); return pts;
}
/* tia sét gấp khúc: thon w0 -> to w1, nhánh con */
function zap(B, R, X0, Y0, X1, Y1, w0, w1, P, jit = 4, br = 0.25, a = 1) {
  w0 = Math.max(w0, 1.2); const pts = jagPts(R, X0, Y0, X1, Y1, 7, jit); tube(B, pts, u => lerp(w0, w1, u), [P[0], P[0], P[1], P[3], P[5]], a);
  if (br) for (let i = 1; i < pts.length - 1; i++) if (R.chance(br)) { const [x, y] = pts[i], an = Math.atan2(Y1 - Y0, X1 - X0) + R.sign() * R.range(0.5, 1.2), l = R.range(8, 18); tube(B, jagPts(R, x, y, x + Math.cos(an) * l, y + Math.sin(an) * l, 5, 2), u => lerp(Math.max(1, w0 * 0.7), 0.8, u), [P[0], P[1], P[2], P[3], P[6]], a); }
  return pts;
}
/* vòng trên mặt đất (logic): bán kính r, dày th, half -1 = nửa sau, 1 = nửa trước, 0 = cả vòng; cols từ mép ngoài vào trong */
function gring(B, c, x, y, z, r, th, cols, a = 1, half = 0, sq = 0.45) {
  if (r < 0.5 || a <= 0) return; th = Math.max(th, 2); const n = Math.ceil(r * TAU * RES * 0.85);
  for (let j = 0; j < n; j++) { const an = j / n * TAU, s = Math.sin(an); if (half && (s >= 0) !== (half > 0)) continue;
    for (let q = 0; q < th * RES; q += 0.9) { const rr = r - q / RES; if (rr < 0) break; B.dot(c.X(x + Math.cos(an) * rr), c.Y(y + s * rr * sq, z), cols[Math.min(cols.length - 1, Math.floor(q / (th * RES) * cols.length))], a); } }
}
/* lưỡi trăng khuyết (điểm đệm): mặt lồi hướng ang, dày th ở giữa, nhọn 2 đầu */
function crescent(B, X, Y, r, ang, th, cols, a = 1, span = 1.15) {
  th = Math.max(th, 4);
  for (let s = -span; s <= span; s += 0.5 / Math.max(2, r)) { const k = 1 - Math.abs(s) / span, w = th * Math.sqrt(k);
    for (let q = 0; q <= w; q += 0.5) { const rr = r - q; B.dot(X + Math.cos(ang + s) * rr, Y + Math.sin(ang + s) * rr, q < 1 ? cols[0] : q < w * 0.55 ? cols[1] : cols[2], a); } }
}
/* cột đá (điểm đệm): đáy (X, base), cao h, rộng w, nghiêng lean; mặt trái sáng, phải tối, vân lớp, đỉnh lởm chởm, viền tối */
function pillar(B, P, X, base, h, w, lean = 0, a = 1, white = false) { if (h < 1.5) return; const hq = Math.round(h), lq = Math.round(lean), wq = Math.round(w), ox = Math.round(X) - X;
  stamp(B, 'pl|' + P[0] + '|' + hq + '|' + wq + '|' + lq + '|' + a + '|' + white + '|' + (Math.round(X) & 7), X, base, sb => pillarRaw(sb, P, (Math.round(X) & 7) + 0.0, 0, hq, wq, lq, a, white, -(Math.round(X) & 7))); }
function pillarRaw(B, P, X, base, h, w, lean, a, white, sx = 0) {
  const top = base - h, seed = Math.floor(X) * 7 + w, BH = 8;
  const cxA = py => X + lean * (base - py) / h, hwA = py => (w / 2) * (1 - 0.4 * (base - py) / h) * (0.92 + 0.16 * hash2(Math.floor((py - top) / BH), seed, 2)), jagT = px => top + Math.floor(hash2(px >> 1, seed, 9) * 4 + Math.abs(px + 0.5 - X) * 0.45);
  const inside = (px, py) => py >= jagT(px) && py < base && Math.abs(px + 0.5 - cxA(py)) <= hwA(py);
  for (let py = Math.floor(top) - 1; py <= Math.ceil(base); py++) {
    const cx = cxA(py), hw = hwA(py), r = py - Math.floor(top), b = Math.floor(r / BH), ry = r % BH, joint = 0.3 + 0.4 * hash2(b, seed, 5);
    for (let px = Math.floor(cx - hw - 2); px <= Math.ceil(cx + hw + 2); px++) {
      const X_ = px + sx;
      if (a < 1 && a <= bayer(px, py)) continue;
      if (!inside(px, py)) { if (inside(px - 1, py) || inside(px + 1, py) || inside(px, py + 1) || inside(px, py - 1)) B.set(X_, py, P[7]); continue; }
      if (white) { B.set(X_, py, P[0]); continue; }
      const k = (px + 0.5 - (cx - hw)) / (2 * hw), dt = py - jagT(px);
      let col = k < 0.14 ? P[1] : k < 0.5 ? P[2] : k < 0.8 ? P[4] : P[5];
      if (dt < 2) col = k < 0.6 ? P[0] : P[2];
      else if (ry === 0) col = P[7];
      else if (ry === 1) col = k < 0.5 ? P[0] : P[3];
      else if (ry === BH - 1) col = k < 0.5 ? P[3] : P[6];
      else if (b % 2 === 1 && Math.abs(k - joint) < 0.06) col = P[6];
      else if (b % 2 === 1 && k > joint && k < joint + 0.1) col = P[3];
      if (dt >= 2 && ry > 1 && hash2(px >> 1, py >> 1, seed) < 0.05) col = k < 0.5 ? P[1] : P[6];
      if (base - py < 3) col = scaleC(col, 0.75);
      B.set(X_, py, col);
    }
  }
}
/* nét / vòng dày tối thiểu 2 px logic (4 điểm) cho điện thoại */
function lineT(B, x0, y0, x1, y1, col, a = 1, edge = null) { if (edge != null) for (const [dx, dy] of [[-1, 2], [2, 2], [-1, -1], [2, -1]]) line(B, x0 + dx, y0 + dy, x1 + dx, y1 + dy, edge, a); for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) line(B, x0 + dx, y0 + dy, x1 + dx, y1 + dy, col, a); }
function ellipseT(B, X, Y, rx, ry, col, a = 1, c2 = null) { for (let q = 0; q < 4; q++) ellipse(B, X, Y, rx - q * 0.5, ry - q * 0.5, q < 2 || c2 == null ? col : c2, a); }
/* chữ 3x5 phóng S lần, viền tối */
const G2 = { z: [7, 1, 2, 4, 7], plus: [0, 2, 7, 2, 0], dn: [2, 2, 2, 7, 2], 0: [7, 5, 5, 5, 7], 1: [2, 6, 2, 2, 7], note: [3, 2, 2, 6, 6] };
let GMIR = false;
function glyph(B, X, Y, g, col, edge, a = 1, S = 2) {
  const rows = G2[g], w = 3, on = (i, j) => i >= 0 && j >= 0 && i < w && j < 5 && ((rows[j] >> (GMIR ? i : w - 1 - i)) & 1);   /* p52f: chữ không lật gương */
  X = Math.round(X - w * S / 2); Y = Math.round(Y - 5 * S / 2);
  for (let j = -1; j <= 5; j++) for (let i = -1; i <= w; i++) { const v = on(i, j); if (!v && !(on(i + 1, j) || on(i - 1, j) || on(i, j + 1) || on(i, j - 1))) continue; for (let q = 0; q < S * S; q++) B.dot(X + i * S + (q % S), Y + j * S + ((q / S) | 0), v ? (j === 0 ? scaleC(col, 1.15) : col) : edge, a); }
}
const dG2 = (B, L, c, p, x, y, k) => { if (k < 0.08) return; glyph(B, x, y, p.gl, p.col, p.c2 ?? c.P[7], 1, p.S || 2); };
/* lửa: cục tròn co dần, lõi sáng, đáy tối, màu theo tuổi (ramp sáng -> tối) */
const dFlame = (B, L, c, p, x, y, k) => {
  const r = q2(p.size * RES * (0.3 + 0.7 * Math.pow(k, 0.6))), co = rp(p.ramp, k * 0.85), ci = rp(p.ramp, Math.min(1, k * 1.3)), dk = rp(p.ramp, k * 0.55);
  stamp(B, 'fl|' + r + '|' + co + '|' + ci + '|' + dk, x, y, sb => flameRaw(sb, 0, 0, r, co, ci, dk));
};
function flameRaw(B, x, y, r, co, ci, dk) { const r2 = r * 0.55;
  for (let yy = Math.floor(y - r); yy <= Math.ceil(y + r); yy++) for (let xx = Math.floor(x - r); xx <= Math.ceil(x + r); xx++) { const dx = xx + 0.5 - x, dy = yy + 0.5 - y, d = Math.sqrt(dx * dx + dy * dy); if (d > r) continue; B.set(xx, yy, d < r2 && dy < r * 0.25 ? ci : dy > r * 0.4 && d > r * 0.55 ? dk : co); }
};
/* lá / mảnh có viền tối (đọc được trên cỏ) */
const dLeafO = (B, L, c, p, x, y, k) => { if (k < 0.06) return; leafAt(B, x, y, p.a, p.size * RES, p.col, p.c2, p.c3 ?? c.P[7]); };
function leafAt(B, X, Y, ang, n, col, c2, out) {
  const ca = Math.cos(ang), sa = Math.sin(ang), pts = [];
  for (let d = -n; d <= n; d += 0.5) { const w = (1 - Math.abs(d) / n) * n * 0.45; for (let q = -w; q <= w; q += 0.5) pts.push([X + ca * d - sa * q, Y + sa * d + ca * q, q < 0 ? col : c2]); }
  for (const [x, y] of pts) for (const [dx, dy] of CROSS) B.set(x + dx, y + dy, out);
  for (const [x, y, cc] of pts) B.set(x, y, cc);
}
/* hạt tụ về 1 điểm (chuẩn bị) */
function gather(c, x, y, z, ramp, rate = 1, r = 12) {
  const R = c.R; for (let q = 0; q < rate; q++) { if (!R.chance(Math.min(1, rate - q))) continue; const a = R.range(0, TAU), rr = R.range(r * 0.6, r), dx = Math.cos(a) * rr, dz = Math.sin(a) * rr * 0.7, T = R.range(0.16, 0.24); fx(c, x + dx, y + 0.5, z + dz, -dx / T, 0, -dz / T, T, dSpark, { size: 2, ramp }); }
}
function flame(c, x, y, z, vx, vy, vz, life, size, ramp, o = {}) { return fx(c, x, y, z, vx, vy, vz, life, dFlame, { ramp, size, drag: 2.2, lift: o.lift ?? 30, ...o }); }
const SMK4 = ['#b3a7a1', '#887b76', '#5f5450', '#3b3230'].map(H);
function smokeRaw(B, r, ph, cols) { for (let j = 0; j < 3; j++) { const a = ph + j * 2.1, lx = Math.cos(a) * r * 0.42, ly = Math.sin(a) * r * 0.28 - j * r * 0.18, lr = r * (0.78 - j * 0.1);
    for (let yy = Math.floor(ly - lr - 1); yy <= Math.ceil(ly + lr + 1); yy++) for (let xx = Math.floor(lx - lr - 1); xx <= Math.ceil(lx + lr + 1); xx++) { const dx = xx + 0.5 - lx, dy = yy + 0.5 - ly, d = Math.sqrt(dx * dx + dy * dy); if (d > lr + 1) continue;
      B.set(xx, yy, d > lr ? cols[3] : dy < -lr * 0.3 && dx < lr * 0.35 ? cols[0] : dy > lr * 0.35 || dx > lr * 0.55 ? cols[2] : cols[1]); } } }
const dSmoke = (B, L, c, p, x, y, k) => { if (k < 0.06) return; const u = 1 - k, g = k > 0.3 ? 0.55 + 0.6 * Math.min(1, u / 0.7) : 1.15 * (k / 0.3), r = Math.max(1.5, Math.round(p.size * RES * g)), ph = Math.round((p.seed + u * 2.5) * 4) / 4 % 6.28;
  stamp(B, 'sm|' + r + '|' + ph.toFixed(2) + '|' + p.ramp[0], x, y, sb => smokeRaw(sb, r, ph, p.ramp)); };
function smokeP(c, x, y, z, col, size = 3, life = 0.6, vz = 14) { const R = c.R; fx(c, x, y, z, R.range(-6, 6), 0, vz * 0.9, life * 1.25, dSmoke, { size: size * 0.95, ramp: SMK4, drag: 1.6 }); }
function shot(from, to, t0, v, arc = 0) {   /* đạn: vị trí theo thời gian (logic) */
  const d = Math.hypot(to.x - from.x, to.y - from.y, (to.z || 0) - (from.z || 0)), T = Math.max(0.12, d / v);
  return { T, t1: t0 + T, pos(t) { const u = (t - t0) / T; if (u < 0 || u > 1) return null; return { x: lerp(from.x, to.x, u), y: lerp(from.y, to.y, u), z: lerp(from.z || 0, to.z || 0, u) + 4 * arc * u * (1 - u), u }; } };
}
function starCrack(R, x, y, n, len) { return Array.from({ length: n }, (_, i) => jag(R, x, y, i / n * TAU + R.range(-0.25, 0.25), R.range(len * 0.6, len), 3, 0.5)); }
function drawCracks(B, c, cr, g, core, mid, edge, a = 1) { for (const p of cr) drawPath(B, c, p, g, core, mid, edge, a); }
const SMOKE = ['#8a7d78', '#655a56', '#433b39'].map(H);


/* ===================== MÁY VẼ RIÊNG (r2 — hiệu năng điện thoại) =====================
   Bộ đệm có VÙNG BẨN: chỉ xoá / putImageData / drawImage phần đã vẽ (hợp với vùng khung trước để xoá sạch), lớp light cũng vậy.
   Hình tĩnh (cột đá, tinh thể, quả cầu, lửa, khói, sương giá, vực bóng) vẽ 1 lần vào bộ nhớ đệm rồi ĐÓNG DẤU (chép điểm) mỗi khung.
   stepParts / drawPart chuyển thể từ pxfx.js (gốc: Sprite Fusion VFX, MIT License — Copyright (c) 2026 Hugo Duprez). */
const G = 600, LCAP = 150;
function mkCv(w, h) { if (typeof document !== 'undefined') { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; } return new OffscreenCanvas(w, h); }
class DBuf {
  constructor(w, h) { this.w = w; this.h = h; this.data = new Uint32Array(w * h); this.n = 0; this.bx0 = w; this.by0 = h; this.bx1 = -1; this.by1 = -1; this.p = null; this.cv = null; }
  clear() { if (this.bx1 >= 0) for (let y = this.by0; y <= this.by1; y++) this.data.fill(0, y * this.w + this.bx0, y * this.w + this.bx1 + 1); this.n = 0; this.bx0 = this.w; this.by0 = this.h; this.bx1 = -1; this.by1 = -1; }
  set(x, y, c) { x = Math.floor(x); y = Math.floor(y); if (x < 0 || y < 0 || x >= this.w || y >= this.h) return; this.data[y * this.w + x] = c; this.n++; if (x < this.bx0) this.bx0 = x; if (x > this.bx1) this.bx1 = x; if (y < this.by0) this.by0 = y; if (y > this.by1) this.by1 = y; }
  get(x, y) { x = Math.floor(x); y = Math.floor(y); return x < 0 || y < 0 || x >= this.w || y >= this.h ? 0 : this.data[y * this.w + x]; }
  dot(x, y, c, a = 1) { const X = Math.floor(x), Y = Math.floor(y); if (a >= 1 || a > bayer(X, Y)) this.set(X, Y, c); }
  flush() {   /* đẩy lên canvas hợp vùng bẩn khung này + khung trước; trả về hình chữ nhật cần vẽ hoặc null */
    const cur = this.bx1 >= 0 ? [this.bx0, this.by0, this.bx1, this.by1] : null, p = this.p; if (!cur && !p) return null;
    if (!this.cv) { this.cv = mkCv(this.w, this.h); this.ctx = this.cv.getContext('2d'); this.id = new ImageData(new Uint8ClampedArray(this.data.buffer), this.w, this.h); }
    const u = cur && p ? [Math.min(cur[0], p[0]), Math.min(cur[1], p[1]), Math.max(cur[2], p[2]), Math.max(cur[3], p[3])] : cur || p;
    this.ctx.putImageData(this.id, 0, 0, u[0], u[1], u[2] - u[0] + 1, u[3] - u[1] + 1); this.p = cur; return cur;
  }
}
class DLBuf {
  constructor(w, h) { this.w = w; this.h = h; this.f = new Float32Array(w * h * 3); this.out = new Uint32Array(w * h); this.bx0 = w; this.by0 = h; this.bx1 = -1; this.by1 = -1; this.p = null; this.cv = null; }
  clear() { if (this.bx1 >= 0) for (let y = this.by0; y <= this.by1; y++) this.f.fill(0, (y * this.w + this.bx0) * 3, (y * this.w + this.bx1 + 1) * 3); this.bx0 = this.w; this.by0 = this.h; this.bx1 = -1; this.by1 = -1; }
  glow(cx, cy, r, c, k) {
    if (r < 1 || k <= 0.01) return;
    const x0 = Math.max(0, Math.floor(cx - r)), x1 = Math.min(this.w - 1, Math.ceil(cx + r)), y0 = Math.max(0, Math.floor(cy - r)), y1 = Math.min(this.h - 1, Math.ceil(cy + r)); if (x1 < x0 || y1 < y0) return;
    if (x0 < this.bx0) this.bx0 = x0; if (x1 > this.bx1) this.bx1 = x1; if (y0 < this.by0) this.by0 = y0; if (y1 > this.by1) this.by1 = y1;
    const cr = c & 255, cg = (c >>> 8) & 255, cb = (c >>> 16) & 255, ir = 1 / r;
    for (let y = y0; y <= y1; y++) { const dy = (y + 0.5 - cy) * ir; for (let x = x0; x <= x1; x++) { const dx = (x + 0.5 - cx) * ir, d = dx * dx + dy * dy; if (d >= 1) continue; const f = 1 - Math.sqrt(d), q = f * f * k, i = (y * this.w + x) * 3; this.f[i] += cr * q; this.f[i + 1] += cg * q; this.f[i + 2] += cb * q; } }
  }
  flush() {
    const cur = this.bx1 >= 0 ? [this.bx0, this.by0, this.bx1, this.by1] : null, p = this.p; if (!cur && !p) return null;
    if (!this.cv) { this.cv = mkCv(this.w, this.h); this.ctx = this.cv.getContext('2d'); this.id = new ImageData(new Uint8ClampedArray(this.out.buffer), this.w, this.h); }
    const u = cur && p ? [Math.min(cur[0], p[0]), Math.min(cur[1], p[1]), Math.max(cur[2], p[2]), Math.max(cur[3], p[3])] : cur || p, f = this.f, o = this.out, q = v => (v < 6 ? 0 : Math.min(LCAP, Math.round(v / 25) * 25));
    for (let y = u[1]; y <= u[3]; y++) for (let x = u[0], i = y * this.w + x; x <= u[2]; x++, i++) { const j = i * 3, r = q(f[j]), g = q(f[j + 1]), b = q(f[j + 2]); o[i] = r | g | b ? ((255 << 24) | (b << 16) | (g << 8) | r) >>> 0 : 0; }
    this.ctx.putImageData(this.id, 0, 0, u[0], u[1], u[2] - u[0] + 1, u[3] - u[1] + 1); this.p = cur; return cur;
  }
}
/* đóng dấu hình tĩnh: vẽ 1 lần vào danh sách điểm (gốc 0,0), các lần sau chỉ chép */
const SHAPES = new Map();
class SBuf { constructor() { this.m = new Map(); } set(x, y, c) { this.m.set(((Math.floor(y) + 4096) << 13) | (Math.floor(x) + 4096), c); } dot(x, y, c, a = 1) { const X = Math.floor(x), Y = Math.floor(y); if (a >= 1 || a > bayer(X, Y)) this.set(X, Y, c); } get() { return 0; } }
function stamp(B, key, X, Y, fn) {
  let s = SHAPES.get(key);
  if (!s) { const sb = new SBuf(); fn(sb); const n = sb.m.size, xs = new Int16Array(n), ys = new Int16Array(n), cs = new Uint32Array(n); let i = 0; for (const [k, c] of sb.m) { xs[i] = (k & 8191) - 4096; ys[i] = (k >> 13) - 4096; cs[i] = c; i++; } s = { xs, ys, cs }; SHAPES.set(key, s); if (SHAPES.size > 3000) SHAPES.delete(SHAPES.keys().next().value); }
  X = Math.round(X); Y = Math.round(Y); const { xs, ys, cs } = s; for (let i = 0; i < cs.length; i++) B.set(X + xs[i], Y + ys[i], cs[i]);
}
const q2 = v => Math.round(v * 2) / 2;
function crystalC(B, P, x, base, h, w, lean, a = 1, white = false, glint = -1) { if (h < 1.5) return; const H_ = Math.round(h), L_ = Math.round(lean), gq = glint < 0 ? -1 : Math.round(glint * 10) / 10; stamp(B, 'cr|' + P[0] + '|' + H_ + '|' + Math.round(w) + '|' + L_ + '|' + a + '|' + white + '|' + gq, x, base, sb => crystal(sb, P, 0, 0, H_, Math.round(w), L_, a, white, gq)); }
function frostC(B, c, cx, cy, r, a = 1, fresh = -1) { if (r < 1) return; const rq = q2(r), fq = fresh < 0 ? -1 : 1; stamp(B, 'fr|' + c.P[0] + '|' + rq + '|' + a + '|' + fq, c.X(cx), c.Y(cy), sb => frostPatch(sb, { P: c.P, X: v => v * RES, Y: v => v * RES }, 0, 0, rq, a, fresh)); }

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
    else { p.vx -= p.vx * 7 * dt; p.vy -= p.vy * 7 * dt; }
    p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
    if (p.z < 0 && (p.k === K.SHARD || p.k === K.CHUNK)) { p.z = 0; const sp = -p.vz; if (p.bounce > 0 && sp > 45) { p.vz = sp * p.bounce; p.vx *= 0.65; p.vy *= 0.65; p.va *= 0.6; } else { p.vz = 0; p.rest = true; p.va = 0; } }
    if (p.z < 0 && p.k === K.FLAKE) { p.z = 0; p.vz = 0; p.vx *= 0.3; p.vy *= 0.3; }
    if (p.z < 0) p.z = 0;
  }
}
function drawPart(B, L, c, p) {
  const P = c.P, k = p.life / p.max, x = c.X(p.x), y = c.Y(p.y, p.z), fade = p.qf ? 1 : Math.min(1, p.life / 0.35);
  switch (p.k) {
    case K.FX: p.draw(B, L, c, p, x, y, k); break;
    case K.SHARD: { const ca = Math.cos(p.a), sa = Math.sin(p.a), s = p.size * RES; if (p.z > 2) B.dot(x, c.Y(p.y), P[7], 0.45 * fade); for (let d = -s / 2; d <= s / 2; d += 0.5) B.dot(x + ca * d, y + sa * d, d > s / 2 - 0.8 ? P[0] : p.col, fade); break; }
    case K.CHUNK: { const X = Math.round(x), Y = Math.round(y), ca = Math.cos(p.a), sa = Math.sin(p.a), s = p.size * RES, r = Math.ceil(s) + 1;
      if (p.z > 2) ditherOval(B, X, c.Y(p.y), s * 0.8, s * 0.35, P[7], 0.5 * fade);
      for (let py = -r; py <= r; py++) for (let px = -r; px <= r; px++) { const u = (px + 0.5) * ca + (py + 0.5) * sa, v = -(px + 0.5) * sa + (py + 0.5) * ca, d = Math.abs(u) / s + Math.abs(v) / (s * 0.62); if (d <= 1.3 && (fade >= 1 || fade > bayer(X + px, Y + py))) B.set(X + px, Y + py, d > 1 ? P[7] : v < 0 ? (u < 0 ? P[1] : P[2]) : u < 0 ? P[3] : P[5]); } break; }
    case K.FLAKE: { const a = Math.min(1, k * 3); B.dot(x, y, p.col, a); B.dot(x + 1, y, p.col, a); B.dot(x, y + 1, p.col, a); B.dot(x + 1, y + 1, P[1], a); if (p.size > 1.3) for (const [dx, dy] of CROSS) B.dot(x + dx * 2, y + dy * 2, P[1], a * 0.7); break; }
    case K.MIST: case K.DUST: if (p.hard >= 1) {
        const r = p.size * RES * (0.35 + 0.65 * Math.min(1, k * 1.3)), ry = r * (p.k === K.MIST ? 0.55 : 0.8), hi = scaleC(p.col, 1.18), lo = scaleC(p.col, 0.78);
        for (let yy = Math.floor(y - ry); yy <= Math.ceil(y + ry); yy++) for (let xx = Math.floor(x - r); xx <= Math.ceil(x + r); xx++) { const dx = (xx + 0.5 - x) / r, dy = (yy + 0.5 - y) / ry, d = dx * dx + dy * dy; if (d > 1) continue; B.set(xx, yy, dy < -0.25 && dx < 0.4 ? hi : d > 0.6 && dy > 0.2 ? lo : p.col); }
        break; } else { const r = p.size * RES * (0.6 + (1 - k) * 0.9); ditherOval(B, x, y, r, r * (p.k === K.MIST ? 0.5 : 0.8), p.col, p.hard ? (k > 0.3 ? p.hard : 0) : Math.pow(k, 1.4) * (p.k === K.MIST ? 0.38 : 0.55)); break; }
    case K.STREAK: { const sp = Math.hypot(p.vx, p.vy - p.vz) || 1, Ln = clamp(sp / 25, 3, 14), ux = p.vx / sp, uy = (p.vy - p.vz) / sp;
      for (let d = Ln; d >= 0; d -= 0.5) { const col = d < 1 ? P[0] : d < Ln * 0.5 ? p.col : P[3], a = (d < Ln * 0.5 ? 1 : 1.2 - d / Ln) * fade; B.dot(x - ux * d, y - uy * d, col, a); B.dot(x - ux * d - uy, y - uy * d + ux, col, a); } break; }
    case K.STAR: { const tw = 0.6 + 0.4 * Math.sin(c.t * (8 + (p.seed % 5)) + p.seed), X = Math.floor(x), Y = Math.floor(y);
      if (p.size < 1) { if (tw * k > 0.25) { B.set(X, Y, tw > 0.8 ? P[0] : p.col); B.set(X + 1, Y, p.col); } L.glow(x, y, 3, p.col, 0.35 * k * tw); break; }
      const arm = Math.max(1, Math.round(p.size * tw * Math.min(1, k * 3))), tip = scaleC(p.col, 0.8);
      for (let d = 1; d <= arm; d++) for (const [dx, dy] of CROSS) B.set(X + dx * d, Y + dy * d, d === arm && arm > 1 ? tip : p.col);
      if (arm >= 3) for (const [dx, dy] of DIAG) B.set(X + dx, Y + dy, tip);
      B.set(X, Y, P[0]); L.glow(x, y, 3 + arm * 2, p.col, 0.4 * k * tw); break; }
  }
}
/* tạo cảnh: hộp vẽ = neo +- bw/2, up phía trên; trả về giao diện giống PXFX.create */
export function createFull(kind, o = {}) {
  const S = FS[kind.replace(/^full_/, '')]; if (!S) return null;
  o = { tLock: 5 / 14, tBreak: 10 / 14, type: 'suong', ...o };
  const BW = o.bw ?? 256, BH = o.bh ?? 132, UP = o.up ?? 84;
  const c = { o, R: new Rng(o.seed ?? 1), P: PAL[o.type] || PAL.suong, ax: o.x, ay: o.y, x0: Math.round(o.x - BW / 2), y0: Math.round(o.y - UP), ps: [], lights: [], t: 0 };
  c.X = x => (x - c.x0) * RES; c.Y = (y, z = 0) => (y - z - c.y0) * RES;
  if (o.map) o.map(c);   /* p52e: engine trận cài ánh xạ toạ độ cảnh mẫu -> vị trí thật (x0 / y0 / X / Y) trước khi dựng cảnh */
  const bf = o.bufs || [new DBuf(BW * RES, BH * RES), new DBuf(BW * RES, BH * RES), new DLBuf(BW * RES, BH * RES)], back = bf[0], front = bf[1], light = bf[2], sc = S(c);
  let stale = true;
  const render = () => {
    GMIR = !!c.mir; back.clear(); front.clear(); light.clear();
    sc.back(back, light, c.t); for (const p of c.ps) if (p.y < c.ay) drawPart(back, light, c, p);
    sc.front(front, light, c.t); for (const p of c.ps) if (p.y >= c.ay) drawPart(front, light, c, p);
    for (const l of c.lights) { const k = l.life / l.max; light.glow(c.X(l.x), c.Y(l.y), l.r * RES * (0.55 + 0.45 * k), l.col, l.k * k * k); }
    back.r = back.flush(); front.r = front.flush(); light.r = light.flush(); stale = false;
  };
  const blit = (g, b, cx, cy, add) => { const r = b.r; if (!r) return; if (add) { g.save(); g.globalCompositeOperation = 'lighter'; } const w = r[2] - r[0] + 1, h = r[3] - r[1] + 1; g.drawImage(b.cv, r[0], r[1], w, h, c.x0 - cx + r[0] / RES, c.y0 - cy + r[1] / RES, w / RES, h / RES); if (add) g.restore(); };
  return {
    kind, ky: o.y, c, get t() { return c.t; },
    update(dt) { c.t += dt; sc.update(c.t); stepParts(c, dt); for (let i = c.lights.length - 1; i >= 0; i--) if ((c.lights[i].life -= dt) <= 0) c.lights.splice(i, 1); stale = true; },
    draw(g, layer, cx, cy) { if (stale) render(); if (layer === 'back') blit(g, back, cx, cy); else if (layer === 'front') blit(g, front, cx, cy); else blit(g, light, cx, cy, true); },
    done: () => sc.over(c.t) && c.ps.length === 0,
    stats() { return { parts: c.ps.length, frontBuf: front }; },
    buf(layer) { if (stale) render(); return layer === 'back' ? back : layer === 'front' ? front : light; },   /* p52e: engine trận tự dán (lật khi quay trái) */
  };
}
export const PXFULL = {
  list: [], create: createFull,
  spawn(kind, o) { const e = createFull(kind, o); if (e) this.list.push(e); return e; },
  update(dt) { for (const e of this.list) e.update(dt); this.list = this.list.filter(e => !e.done()); },
  drawables(out, g, cx, cy) { for (const e of this.list) { out.push({ y: e.ky - 0.5, f: () => e.draw(g, 'back', cx, cy) }, { y: e.ky + 0.7, f: () => e.draw(g, 'front', cx, cy) }, { y: e.ky + 0.8, f: () => e.draw(g, 'light', cx, cy) }); } },
  clear() { this.list = []; },
};

/* ===================== CHẤN ===================== */
const FS = {};
FS.chan_sk1 = SC((c, at, R, P, o) => {   /* Nứt Đất: khe nứt chạy từ chân, hàng gai đá trồi lần lượt, gai cuối mọc sau lưng đối thủ */
  const C = o.C, F = { x: c.ax, y: c.ay }, x0 = C.x + 7, crack = jag(R, x0, C.y + 1, 0, F.x + 26 - x0, 4, 0.35);
  const sp = [[74, 2, 10, 7], [92, -1, 14, 8], [109, 2, 18, 9], [F.x + 2, -2, 28, 12]].map(([x, dy, h, w], i) => ({ x, y: C.y + dy, h, w, at: 0.33 + i * 0.07, lean: R.range(-1.5, 1.5), i }));
  const draw = (B, t, fr) => { for (const s of sp) { if ((s.y >= c.ay) !== fr || t < s.at) continue; const g = outBack(tm(t, s.at, s.at + 0.1), 2.2) * (1 - tm(t, s.at + 0.5, s.at + 0.62)); if (g <= 0.03) continue; crystalC(B, P, c.X(s.x), c.Y(s.y), s.h * g * RES, s.w * RES, s.lean * RES, 1, t < s.at + 0.035); } };
  return {
    update(t) {
      if (t > 0.08 && t < 0.3 && R.chance(0.5)) puff(c, C.x + R.range(-6, 9), C.y + R.range(0, 2), P[3], 1.8, 0.3, 6);
      for (const s of sp) {
        at('u' + s.i, t, s.at, () => { o.shake?.(0.06 + s.i * 0.04); for (let k = 0; k < 3 + s.i; k++) pebbleHop(c, s.x + R.range(-3, 3), s.y + R.range(-1, 1.5), 1, [P[1], P[2], P[3], P[4]]); puff(c, s.x - 3, s.y + 1, P[3], 2.6, 0.35, 8); puff(c, s.x + 3, s.y + 1, P[2], 2.2, 0.35, 8); if (s.i === 3) { o.hit?.(1.2); addLight(c, s.x, s.y - 10, 12, P[0], 0.3, 0.1); } });
        at('d' + s.i, t, s.at + 0.5, () => { for (let k = 0; k < 3 + s.i; k++) part(c, K.CHUNK, s.x + R.range(-2, 2), s.y + R.range(-1, 1), R.range(2, s.h * 0.7), R.range(-30, 30), R.range(-8, 10), R.range(10, 50), R.range(0.35, 0.5), P[3], R.range(1, 1.8), { g: 1, bounce: 0.3, drag: 0.5, va: R.range(-12, 12), qf: 1 }); puff(c, s.x, s.y + 1, P[4], 2.6, 0.3, 4); });
      }
    },
    back(B, L, t) { if (t > 0.3) { const fd = 1 - tm(t, 1.0, 1.3); if (fd > 0) drawPath(B, c, crack, tm(t, 0.3, 0.58), P[6], P[4], P[7], fd > 0.5 ? 1 : 0.5); } draw(B, t, false); },
    front(B, L, t) { draw(B, t, true); },
    end: 1.35,
  };
});
FS.chan_sk2 = SC((c, at, R, P, o) => {   /* Ném Tảng Đá: bứt tảng đá lên, ném bổng, vỡ vụn trên đầu đối thủ */
  const C = o.C, F = { x: c.ax, y: c.ay }, sx = C.x + 11, S = shot({ x: sx, y: C.y + 0.5, z: 18 }, { x: F.x, y: F.y + 0.5, z: 8 }, 0.32, 125, 22), cr = starCrack(R, F.x, F.y + 1, 6, 16);
  const rockPos = t => t < 0.32 ? { x: sx, y: C.y + 0.5, z: 18 * outCubic(tm(t, 0.08, 0.3)) } : S.pos(t);
  const rock = (B, p, t) => { const X = c.X(p.x), Y = c.Y(p.y, p.z), r = 6.5 * RES * (t < 0.3 ? 0.6 + 0.4 * tm(t, 0.08, 0.3) : 1); orb(B, X, Y, r, [P[1], P[2], P[3], P[4], P[5]], P[7]); const a = t * 9; for (let d = -r * 0.6; d < r * 0.6; d += 0.7) { B.set(X + Math.cos(a) * d, Y + Math.sin(a) * d * 0.8, P[6]); } B.set(X - r * 0.4, Y - r * 0.45, P[0]); B.set(X - r * 0.4 + 1, Y - r * 0.45, P[0]); };
  let broke = false;
  return {
    update(t) {
      at('rip', t, 0.08, () => { for (let k = 0; k < 6; k++) pebbleHop(c, sx + R.range(-4, 4), C.y + R.range(0, 2), 0.9, [P[2], P[3], P[4]]); puff(c, sx - 4, C.y + 1, P[3], 2.6, 0.4, 6); puff(c, sx + 4, C.y + 1, P[2], 2.4, 0.4, 6); });
      const p = rockPos(t); if (p && t > 0.32 && R.chance(0.5)) puff(c, p.x - 3, p.y, P[3], 1.6, 0.25, 0, { z: p.z });
      at('hit', t, S.t1, () => { broke = true; o.hit?.(1.3); o.shake?.(0.35); for (let k = 0; k < 14; k++) { const a = R.range(0, TAU), v = R.range(40, 100); part(c, K.CHUNK, F.x + Math.cos(a) * 3, F.y + Math.sin(a) * 2, 8 + R.range(0, 6), Math.cos(a) * v, Math.sin(a) * v * 0.45, R.range(40, 110), R.range(0.5, 0.75), P[3], R.range(1.2, 2.6), { g: 1, bounce: 0.35, drag: 0.5, va: R.range(-14, 14), qf: 1 }); }
        for (let k = 0; k < 8; k++) { const a = k / 8 * TAU; puff(c, F.x + Math.cos(a) * 7, F.y + Math.sin(a) * 3, R.pick([P[2], P[3], P[4]]), 3.4, 0.5, 6, { vx: Math.cos(a) * 30, vy: Math.sin(a) * 12 }); } addLight(c, F.x, F.y - 8, 14, P[0], 0.3, 0.1); });
    },
    back(B, L, t) { const p = rockPos(t); if (p && !broke && t > 0.1) ditherOval(B, c.X(p.x), c.Y(p.y + 0.5), 5 * RES * (0.6 + 0.4 * (1 - p.z / 40)), 1.8 * RES, P[7], 0.55); if (broke) { const fd = 1 - tm(t, S.t1 + 0.5, S.t1 + 0.75); if (fd > 0) drawCracks(B, c, cr, tm(t, S.t1, S.t1 + 0.1), P[6], P[4], P[7], fd > 0.5 ? 1 : 0.5); } },
    front(B, L, t) { const p = rockPos(t); if (p && !broke && t > 0.08) rock(B, p, t); },
    end: 1.4,
  };
});
FS.chan_sk3 = SC((c, at, R, P, o) => {   /* Dậm Chấn: dậm, nứt sao dưới chân, sóng chấn bụi lan trên mặt đất tới đối thủ, sỏi nảy theo sóng */
  const C = o.C, T0 = 0.34, cr = starCrack(R, C.x, C.y + 1, 7, 14), RM = 82;
  const rad = t => 4 + (RM - 4) * outCubic(tm(t, T0, T0 + 0.55));
  const ring = (B, t, half) => { if (t < T0 || t > T0 + 0.6) return; const k = tm(t, T0, T0 + 0.6), r = rad(t); gring(B, c, C.x, C.y + 1, 0, r, 2 + 4 * (1 - k), [P[5], P[3], P[2], P[1], P[3]], k < 0.7 ? 1 : 0.5, half); gring(B, c, C.x, C.y + 1, 0, r * 0.82, 1, [P[4]], 0.5, half); };
  return {
    update(t) {
      at('st', t, T0, () => { o.shake?.(0.3); for (let k = 0; k < 6; k++) pebbleHop(c, C.x + R.range(-6, 6), C.y + R.range(-1, 2), 1.2, [P[1], P[2], P[3]]); });
      if (t > T0 && t < T0 + 0.55) { const r = rad(t); for (let q = 0; q < 3; q++) { const a = R.range(0, TAU); puff(c, C.x + Math.cos(a) * r, C.y + 1 + Math.sin(a) * r * 0.45, R.pick([P[2], P[3]]), 2.2 + 1.2 * (1 - r / RM), 0.3, 6); } if (R.chance(0.6)) { const a = R.range(0, TAU); pebbleHop(c, C.x + Math.cos(a) * r, C.y + 1 + Math.sin(a) * r * 0.45, 0.7, [P[2], P[3], P[4]]); } }
      at('hit', t, T0 + 0.33, () => o.hit?.(0.9));
    },
    back(B, L, t) { if (t >= T0) { const fd = 1 - tm(t, 1.0, 1.3); if (fd > 0) drawCracks(B, c, cr, tm(t, T0, T0 + 0.1), P[6], P[4], P[7], fd > 0.5 ? 1 : 0.5); } ring(B, t, -1); },
    front(B, L, t) { ring(B, t, 1); },
    end: 1.35,
  };
});
FS.chan_sk4 = SC((c, at, R, P, o) => {   /* Khoan Đất: chui xuống, gò đất chạy ngầm tới đối thủ, trồi lên hất tung đất đá */
  const C = o.C, F = { x: c.ax, y: c.ay }, T0 = 0.32, T1 = 0.88, path = jag(R, C.x + 4, C.y + 1, 0, F.x - 10 - C.x, 3, 0.25), cr = starCrack(R, F.x - 4, F.y + 1, 7, 18);
  const mx = t => lerp(C.x + 4, F.x - 8, smooth(T0 + 0.05, T1, t));
  return {
    update(t) {
      at('dig', t, T0, () => { o.hide?.(T1 - T0); o.shake?.(0.15); for (let k = 0; k < 8; k++) pebbleHop(c, C.x + R.range(-5, 5), C.y + R.range(-1, 2), 1.1, [P[2], P[3], P[4]]); for (let k = 0; k < 4; k++) puff(c, C.x + R.range(-6, 6), C.y + 1, R.pick([P[2], P[3]]), 3, 0.45, 8); });
      if (t > T0 + 0.05 && t < T1) { const x = mx(t); if (R.chance(0.7)) pebbleHop(c, x + R.range(-2, 3), C.y + R.range(0, 2), 0.6, [P[2], P[3], P[4]]); if (R.chance(0.35)) puff(c, x - 3, C.y + 1, P[3], 1.8, 0.3, 4); }
      at('up', t, T1, () => { o.warp?.(F.x - 16, 0.5); o.hit?.(1.4); o.shake?.(0.4); for (let k = 0; k < 16; k++) { const a = R.range(0, TAU), v = R.range(20, 70); part(c, K.CHUNK, F.x - 4 + Math.cos(a) * 4, F.y + Math.sin(a) * 2, 2, Math.cos(a) * v, Math.sin(a) * v * 0.4, R.range(90, 150), R.range(0.55, 0.8), P[3], R.range(1.1, 2.4), { g: 1, bounce: 0.3, drag: 0.4, va: R.range(-14, 14), qf: 1 }); }
        for (let k = 0; k < 7; k++) { const a = k / 7 * TAU; puff(c, F.x - 4 + Math.cos(a) * 6, F.y + 1 + Math.sin(a) * 3, R.pick([P[2], P[3], P[4]]), 3.6, 0.55, 10, { vx: Math.cos(a) * 28, vy: Math.sin(a) * 10 }); } });
    },
    back(B, L, t) {
      if (t > T0 + 0.05) { const fd = 1 - tm(t, 1.05, 1.3); if (fd > 0) drawPath(B, c, path, tm(t, T0 + 0.05, T1), P[5], P[4], null, fd > 0.5 ? 1 : 0.5); }
      if (t >= T1) { const fd = 1 - tm(t, 1.1, 1.35); if (fd > 0) drawCracks(B, c, cr, tm(t, T1, T1 + 0.1), P[6], P[4], P[7], fd > 0.5 ? 1 : 0.5); }
    },
    front(B, L, t) { if (t > T0 + 0.05 && t < T1) { const X = c.X(mx(t)), Y = c.Y(C.y + 1); for (let y = -8; y <= 0; y++) for (let x = -13; x <= 13; x++) { const d = (x * x) / 169 + (y * y) / 64; if (d > 1) continue; B.set(X + x, Y + y, d > 0.8 ? P[7] : y < -5 && x < 3 ? P[1] : x < -2 ? P[2] : x < 5 ? P[3] : P[5]); } } },
    end: 1.4,
  };
});
FS.chan_ult = SC((c, at, R, P, o) => {   /* Địa Long Trỗi Dậy: khe nứt sáng toả, 6 cột đá trồi vòng quanh (sau cao, trước thấp), đổ sập vào trong */
  const C = o.C, A = { x: c.ax, y: c.ay }, FALL = 1.32, cracks = Array.from({ length: 8 }, (_, i) => jag(R, A.x, A.y + 1, i / 8 * TAU + R.range(-0.2, 0.2), R.range(36, 54), 4, 0.45));
  const pil = Array.from({ length: 6 }, (_, i) => { const a = -Math.PI / 2 - 0.5 + i / 6 * TAU, ca = Math.cos(a), sa = Math.sin(a), back = sa < 0.15; return { x: A.x + ca * 36, y: A.y + sa * 15, h: back ? R.range(26, 32) : R.range(11, 14), w: back ? R.range(10, 12) : 8, at: 0.5 + i * 0.08, back, dir: -Math.sign(ca || 1) }; }).sort((p, q) => p.y - q.y);
  const drawP = (B, t, back) => { for (const p of pil) { if (p.back !== back || t < p.at) continue; const g = outBack(tm(t, p.at, p.at + 0.12), 2), f = tm(t, FALL, FALL + 0.16); if (f >= 1) continue; pillar(B, P, c.X(p.x), c.Y(p.y), p.h * g * (1 - 0.55 * f) * RES, p.w * RES, p.dir * f * 10 * RES, 1, t < p.at + 0.03); } };
  return {
    update(t) {
      if (t < 0.4) { gather(c, C.x + 2, C.y, 10, [P[0], P[1], P[2], P[3]], 1.4, 16); if (R.chance(0.25)) pebbleHop(c, C.x + R.range(-10, 10), C.y + R.range(-3, 3), 0.6, [P[1], P[2], P[3]]); }
      at('crack', t, 0.42, () => { o.shake?.(0.25); o.hit?.(0.6); for (let i = 0; i < 6; i++) puff(c, A.x + R.range(-8, 8), A.y + R.range(-3, 3), R.pick([P[2], P[3]]), 3, 0.4, 10); addLight(c, A.x, A.y, 18, P[0], 0.35, 0.14); });
      for (const p of pil) at('p' + p.at, t, p.at, () => { o.shake?.(0.12); for (let i = 0; i < 4; i++) pebbleHop(c, p.x + R.range(-4, 4), p.y + R.range(-1, 2), 1.1, [P[1], P[2], P[3], P[4]]); puff(c, p.x - 4, p.y + 1, P[3], 3, 0.4, 6); puff(c, p.x + 4, p.y + 1, P[2], 2.8, 0.4, 6); });
      at('tick', t, 0.86, () => o.hit?.(0.6));
      at('fall', t, FALL, () => { o.shake?.(0.5); o.flash?.(0.1, '255,230,190'); o.hit?.(1.6); o.knock?.();
        for (const p of pil) { for (let i = 0; i < (p.back ? 9 : 5); i++) part(c, K.CHUNK, p.x + R.range(-3, 3), p.y + R.range(-1, 1), R.range(2, p.h), (A.x - p.x) * R.range(0.8, 2), (A.y - p.y) * R.range(0.8, 2), R.range(10, 70), R.range(0.6, 0.9), P[3], R.range(1.2, 2.4), { g: 1, bounce: 0.3, drag: 0.6, va: R.range(-14, 14), qf: 1 }); puff(c, p.x, p.y + 1, P[2], 4, 0.6, 6); }
        for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; puff(c, A.x + Math.cos(a) * 20, A.y + Math.sin(a) * 9, R.pick([P[3], P[4], P[5]]), 3, 0.6, 4, { vx: Math.cos(a) * 40, vy: Math.sin(a) * 18 }); } });
    },
    back(B, L, t) {
      if (t >= 0.42) { const g = tm(t, 0.42, 0.62), fd = 1 - tm(t, 1.75, 2.15), hot = t < FALL + 0.1; if (fd > 0) drawCracks(B, c, cracks, g, hot ? P[1] : P[5], P[6], P[7], fd > 0.5 ? 1 : 0.5); if (hot) for (const cr of cracks) { const q = cr[Math.max(1, Math.floor((cr.length - 1) * g * 0.5))]; L.glow(c.X(q[0]), c.Y(q[1]), 7, P[1], 0.14); } }
      drawP(B, t, true);
    },
    front(B, L, t) { drawP(B, t, false); },
    end: 2.2,
  };
});

/* ===================== NHAM ===================== */
FS.nham_sk1 = SC((c, at, R, P, o) => {   /* Phun Than: tụ lửa ở miệng, phun cục than lửa kéo đuôi, nổ bùng */
  const M = o.M, F = { x: c.ax, y: c.ay }, FR = [P[0], P[1], P[2], P[3], P[4], P[5]], S = shot({ x: M.x + 2, y: M.y + 0.5, z: M.z }, { x: F.x - 3, y: F.y + 0.5, z: 9 }, 0.3, 160);
  return {
    update(t) {
      if (t > 0.06 && t < 0.3) gather(c, M.x + 2, M.y, M.z, FR, 1.2, 10);
      at('fire', t, 0.3, () => { for (let k = 0; k < 6; k++) flame(c, M.x + 2, M.y + 0.5, M.z, R.range(20, 70), R.range(-10, 10), R.range(-10, 20), R.range(0.15, 0.25), R.range(1.2, 2), FR); });
      const p = S.pos(t); if (p) { for (let k = 0; k < 2; k++) flame(c, p.x - 2, p.y, p.z + R.range(-1, 1), R.range(-40, -10), R.range(-4, 4), R.range(0, 20), R.range(0.14, 0.24), R.range(1.4, 2.2), FR); if (R.chance(0.6)) fx(c, p.x, p.y, p.z, R.range(-50, 0), R.range(-8, 8), R.range(10, 40), 0.3, dSpark, { size: 2, g: 0.3, ramp: FR }); }
      at('hit', t, S.t1, () => { o.hit?.(1); for (let k = 0; k < 12; k++) { const a = R.range(0, TAU), v = R.range(20, 60); flame(c, F.x - 3, F.y + 0.5, 9, Math.cos(a) * v, Math.sin(a) * v * 0.4, Math.sin(a) * v * 0.5 + 20, R.range(0.25, 0.4), R.range(2.4, 4), FR); }
        sparks(c, 12, F.x - 3, F.y + 0.5, 9, 90, { up: 1.2, g: 0.5, drag: 1.2, ramp: FR, life: 1.3 }); for (let k = 0; k < 3; k++) smokeP(c, F.x - 3 + R.range(-4, 4), F.y - 1, 12, R.pick(SMOKE), 3, 0.6, 18); addLight(c, F.x, F.y - 9, 14, P[2], 0.4, 0.12); });
    },
    front(B, L, t) { const p = S.pos(t); if (t > 0.06 && t < 0.32) { const k = tm(t, 0.06, 0.3); orb(B, c.X(M.x + 2), c.Y(M.y, M.z), 1 + 3 * k, [P[0], P[1], P[2], P[3]], P[5]); L.glow(c.X(M.x + 2), c.Y(M.y, M.z), 6 + 6 * k, P[2], 0.25 * k); }
      if (p) { const X = c.X(p.x), Y = c.Y(p.y, p.z); orb(B, X, Y, 7, [P[0], P[1], P[2], P[3], P[4]], P[6]); L.glow(X, Y, 12, P[2], 0.25); } },
    end: 1.3,
  };
});
FS.nham_sk2 = SC((c, at, R, P, o) => {   /* Cầu Nổ Lửa: cầu lửa lớn rơi xuống chân đối thủ, nổ: vòng lửa lan, cột lửa, khói nấm, vết cháy */
  const M = o.M, F = { x: c.ax, y: c.ay }, FR = [P[0], P[1], P[2], P[3], P[4], P[5]], S = shot({ x: M.x + 3, y: M.y + 0.5, z: M.z }, { x: F.x, y: F.y + 0.5, z: 3 }, 0.32, 190, 10);
  let boom = -1;
  return {
    update(t) {
      if (t > 0.05 && t < 0.32) gather(c, M.x + 3, M.y, M.z, FR, 1.5, 12);
      const p = S.pos(t); if (p) { for (let k = 0; k < 3; k++) flame(c, p.x - 3, p.y, p.z + R.range(-2, 2), R.range(-50, -15), R.range(-5, 5), R.range(0, 25), R.range(0.16, 0.28), R.range(1.8, 2.8), FR); }
      at('hit', t, S.t1, () => { boom = t; o.hit?.(1.4); o.shake?.(0.35); o.flash?.(0.1, '255,200,120');
        for (let k = 0; k < 14; k++) flame(c, F.x + R.range(-5, 5), F.y - 1 + R.range(-2, 1), R.range(0, 6), R.range(-20, 20), R.range(-6, 3), R.range(30, 90), R.range(0.3, 0.5), R.range(2, 3.4), FR);
        for (let k = 0; k < 8; k++) part(c, K.CHUNK, F.x + R.range(-3, 3), F.y + R.range(-1, 2), 3, R.range(-80, 80), R.range(-30, 30), R.range(60, 120), R.range(0.5, 0.7), P[5], R.range(1, 1.8), { g: 1, bounce: 0.3, drag: 0.5, va: R.range(-14, 14), qf: 1 });
        sparks(c, 16, F.x, F.y, 6, 110, { up: 1.4, g: 0.6, drag: 1, ramp: FR, life: 1.5 }); for (let k = 0; k < 5; k++) smokeP(c, F.x + R.range(-6, 6), F.y - 1.5, R.range(10, 20), R.pick(SMOKE), R.range(3, 4.5), R.range(0.6, 0.8), 22); addLight(c, F.x, F.y - 10, 22, P[2], 0.5, 0.16); });
    },
    back(B, L, t) { if (boom >= 0) { const fd = 1 - tm(t, boom + 0.5, boom + 0.85); if (fd > 0) ditherOval(B, c.X(F.x), c.Y(F.y + 1), 12 * RES, 5 * RES, P[7], 1.4 * fd); const k = tm(t, boom, boom + 0.28); if (k < 1) gring(B, c, F.x, F.y + 1, 0, 6 + 26 * outCubic(k), 2.5 * (1 - k) + 1, [P[3], P[2], P[1]], k < 0.7 ? 1 : 0.5, -1); } },
    front(B, L, t) { const p = S.pos(t); if (t > 0.05 && t < 0.34) { const k = tm(t, 0.05, 0.32); orb(B, c.X(M.x + 3), c.Y(M.y, M.z), 1 + 5 * k, [P[0], P[1], P[2], P[3]], P[5]); }
      if (p) { const X = c.X(p.x), Y = c.Y(p.y, p.z); orb(B, X, Y, 7, [P[0], P[1], P[2], P[3], P[4]], P[6]); L.glow(X, Y, 14, P[2], 0.25); }
      if (boom >= 0) { const k = tm(t, boom, boom + 0.28); if (k < 1) gring(B, c, F.x, F.y + 1, 0, 6 + 26 * outCubic(k), 2.5 * (1 - k) + 1, [P[3], P[2], P[1]], k < 0.7 ? 1 : 0.5, 1); } },
    end: 1.4,
  };
});
FS.nham_sk3 = SC((c, at, R, P, o) => {   /* Vực Nham: 3 mạch dung nham phun cột trên đường tới đối thủ, giọt rơi nguội thành đốm */
  const C = o.C, F = { x: c.ax, y: c.ay }, FR = [P[0], P[1], P[2], P[3], P[4], P[5]], V = [[88, 0.38], [F.x, 0.55], [168, 0.72]].map(([x, t0], i) => ({ x, y: C.y + (i === 1 ? -1 : 1), t0, i }));
  const COOL = [P[1], P[2], P[3], P[4], P[5], P[6], P[6], P[7]];
  const col = (B, L, t, v, fr) => { if ((v.y >= c.ay) !== fr || t < v.t0 || t > v.t0 + 0.42) return; const k = tm(t, v.t0, v.t0 + 0.42), h = (k < 0.2 ? k / 0.2 : 1 - Math.pow((k - 0.2) / 0.8, 2)) * 30 * (1 + 0.08 * Math.sin(t * 50)); if (h < 1) return;
    const X = c.X(v.x), Y0 = c.Y(v.y), Y1 = c.Y(v.y, h); beam(B, X, Y0, X + Math.sin(t * 30) * 1.5, Y1, 9, 5, [P[0], P[1], P[2], P[3], P[5]], { t, wob: 0.15 }); orb(B, X, Y1, 6.5, [P[0], P[1], P[2], P[3]], P[5]); L.glow(X, Y0 - h, 10, P[2], 0.2); };
  return {
    update(t) {
      if (t > 0.08 && t < 0.3 && R.chance(0.6)) flame(c, C.x + R.range(-5, 8), C.y + 1, 0, R.range(-5, 5), 0, R.range(10, 25), 0.25, 1.4, FR);
      for (const v of V) {
        if (t > v.t0 - 0.15 && t < v.t0 && R.chance(0.5)) fx(c, v.x + R.range(-3, 3), v.y + 0.3, 0, R.range(-10, 10), 0, R.range(20, 50), 0.3, dSpark, { size: 2, g: 0.4, ramp: FR });
        at('v' + v.i, t, v.t0, () => { o.shake?.(0.15); if (v.i === 1) o.hit?.(1.2); for (let k = 0; k < 4; k++) smokeP(c, v.x + R.range(-4, 4), v.y - 0.5, R.range(4, 12), R.pick(SMOKE), 2.8, 0.6, 20); });
        if (t > v.t0 && t < v.t0 + 0.32) for (let k = 0; k < 2; k++) { const vx = R.range(-35, 35); fx(c, v.x + R.range(-1, 1), v.y + R.range(-0.4, 1.4), R.range(14, 26), vx, R.range(-8, 8), R.range(40, 90), 1.5, dDrop, { g: 1, col: P[2], c2: P[4], onLand: (cc, p) => { fx(cc, p.x, p.y, 0, 0, 0, 0, 0.7, dSpot, { ramp: COOL, size: 1 }); p.life = 0; } }); }
      }
    },
    back(B, L, t) { for (const v of V) { if (t > v.t0 - 0.18) { const fd = 1 - tm(t, v.t0 + 0.5, v.t0 + 0.75); if (fd > 0) { const hot = t < v.t0 + 0.45; ditherOval(B, c.X(v.x), c.Y(v.y + 0.5), 7 * RES, 2.6 * RES, hot ? P[3] : P[6], 1.4 * fd); if (hot) ditherOval(B, c.X(v.x), c.Y(v.y + 0.5), 4 * RES, 1.4 * RES, P[1], 1.4); } } col(B, L, t, v, false); } },
    front(B, L, t) { for (const v of V) col(B, L, t, v, true); },
    end: 1.4,
  };
});
FS.nham_sk4 = SC((c, at, R, P, o) => {   /* Lao Lửa: thú bọc lửa lao tới, để vệt cháy trên đất, va chạm nổ bùng */
  const C = o.C, F = { x: c.ax, y: c.ay }, FR = [P[0], P[1], P[2], P[3], P[4], P[5]], T0 = 0.3, T1 = 0.58; let maxX = C.x;
  return {
    update(t) {
      if (t > 0.05 && t < T0) { gather(c, C.x, C.y, 8, FR, 1.2, 12); if (R.chance(0.5)) flame(c, C.x + R.range(-6, 6), C.y + 1, 0, 0, 0, 20, 0.25, 1.5, FR); }
      at('go', t, T0, () => o.dash?.(F.x - 18, T1 - T0, true));
      if (t > T0 && t < T1 + 0.05) { const x = o.cx ? o.cx() : C.x; maxX = Math.max(maxX, x); for (let k = 0; k < 3; k++) flame(c, x + R.range(-8, 2), C.y + R.range(0, 1.5), R.range(0, 10), R.range(-50, -10), R.range(-4, 4), R.range(10, 40), R.range(0.18, 0.3), R.range(1.6, 2.6), FR); }
      if (t > T0 && t < 1.0 && R.chance(0.6)) { const x = R.range(C.x, maxX); flame(c, x, C.y + 1.2, 0, 0, 0, 18, R.range(0.15, 0.25), R.range(1, 1.6), FR); }
      at('hit', t, T1, () => { o.hit?.(1.1); o.shake?.(0.3); for (let k = 0; k < 12; k++) { const a = R.range(-1.4, 1.4), v = R.range(30, 80); flame(c, F.x - 6, F.y + 0.5, 8, Math.cos(a) * v, Math.sin(a) * v * 0.4, R.range(10, 50), R.range(0.2, 0.35), R.range(1.6, 2.8), FR); } sparks(c, 12, F.x - 6, F.y, 8, 100, { up: 1, g: 0.6, ramp: FR }); smokeP(c, F.x - 4, F.y - 1, 10, SMOKE[1], 3.4, 0.6, 20); addLight(c, F.x - 6, F.y - 8, 14, P[2], 0.4, 0.12); });
    },
    back(B, L, t) { if (t > T0) { const fd = 1 - tm(t, 0.95, 1.25); if (fd > 0) for (let x = C.x; x < maxX; x += 0.5) { const X = c.X(x), Y = c.Y(C.y + 1); B.dot(X, Y, P[6], fd > 0.5 ? 1 : 0.5); B.dot(X, Y + 1, P[7], fd > 0.5 ? 1 : 0.5); if (hash2(X, 1, 5) < 0.18 && t < 0.9) B.set(X, Y, P[3]); } } },
    end: 1.4,
  };
});
FS.nham_ult = SC((c, at, R, P, o) => {   /* Mưa Thiên Thạch: 6 thiên thạch rơi chéo quanh đối thủ, mỗi viên nổ lửa + hố nham nguội dần */
  const C = o.C, A = { x: c.ax, y: c.ay }, FR = [P[0], P[1], P[2], P[3], P[4], P[5]];
  const MS = [[-30, -9, 0.42], [28, -11, 0.56], [-24, 9, 0.7], [31, 8, 0.84], [2, -15, 0.98], [0, -1, 1.2]].map(([dx, dy, t1], i) => ({ x: A.x + dx, y: A.y + dy, t1, t0: t1 - 0.28, i, big: i === 5 }));
  const mpos = (m, t) => { const u = (t - m.t0) / 0.28; if (u < 0 || u > 1) return null; return { x: m.x - 44 * (1 - u), y: m.y, z: 96 * (1 - u) }; };
  const drawM = (B, L, t, fr) => { for (const m of MS) { const p = mpos(m, t); if (!p || (m.y >= c.ay) !== fr) continue; const X = c.X(p.x), Y = c.Y(p.y, p.z), r = (m.big ? 7 : 5) * RES;
      beam(B, X - 0.42 * 40, Y - 0.87 * 40, X, Y, 1, r * 0.8, [P[0], P[1], P[2], P[3]], { t }); orb(B, X, Y, r, [P[3], P[4], P[5], P[6]], P[1]); L.glow(X, Y, r * 2, P[2], 0.25); } };
  const crater = (B, t, m) => { if (t < m.t1) return; const fd = 1 - tm(t, m.t1 + 0.7, m.t1 + 1.0); if (fd <= 0) return; const X = c.X(m.x), Y = c.Y(m.y + 0.5), rx = (m.big ? 13 : 9) * RES, k = tm(t, m.t1, m.t1 + 0.7);
    ditherOval(B, X, Y, rx, rx * 0.42, P[7], 1.5 * fd); ellipseT(B, X, Y, rx * 0.8, rx * 0.34, k < 0.5 ? P[2] : k < 0.85 ? P[4] : P[6], fd > 0.5 ? 1 : 0.5); ditherOval(B, X, Y, rx * 0.45, rx * 0.18, k < 0.4 ? P[1] : P[5], fd > 0.5 ? 1 : 0.5); };
  return {
    update(t) {
      if (t < 0.4) { gather(c, C.x + 2, C.y, 10, FR, 1.6, 16); if (R.chance(0.4)) flame(c, C.x + R.range(-8, 8), C.y + 1, 0, 0, 0, 25, 0.3, 1.4, FR); }
      for (const m of MS) { const p = mpos(m, t); if (p) { flame(c, p.x - 2, p.y - 0.2, p.z + 3, R.range(-20, 0), 0, R.range(10, 30), R.range(0.15, 0.25), m.big ? 3 : 2.2, FR); if (R.chance(0.7)) fx(c, p.x, p.y, p.z, R.range(-30, 10), 0, R.range(10, 40), 0.3, dSpark, { size: 2, g: 0.2, ramp: FR }); }
        at('m' + m.i, t, m.t1, () => { const s = m.big ? 1.5 : 1; o.shake?.(m.big ? 0.5 : 0.22); if (m.big) { o.hit?.(1.7); o.flash?.(0.12, '255,190,110'); o.knock?.(); } else if (m.i % 2 === 0) o.hit?.(0.6);
          for (let k = 0; k < 10 * s; k++) { const a = R.range(Math.PI, TAU), v = R.range(15, 50) * s; flame(c, m.x + Math.cos(a) * 3, m.y - 1 + Math.sin(a) * 2, R.range(0, 4), Math.cos(a) * v, Math.sin(a) * v * 0.4, R.range(30, 80) * s, R.range(0.3, 0.5), R.range(2, 3.2) * Math.sqrt(s), FR); }
          for (let k = 0; k < 4 * s; k++) { const a = R.range(0, Math.PI); flame(c, m.x + Math.cos(a) * 6 * s, m.y + 0.5 + Math.sin(a) * 2, 0, Math.cos(a) * 30, 0, R.range(10, 30), R.range(0.25, 0.4), 1.8, FR); }
          for (let k = 0; k < 6 * s; k++) part(c, K.CHUNK, m.x + R.range(-3, 3), m.y + R.range(-1, 1), 2, R.range(-70, 70), R.range(-25, 25), R.range(50, 120), R.range(0.5, 0.75), P[5], R.range(1, 2), { g: 1, bounce: 0.3, drag: 0.5, va: R.range(-14, 14), qf: 1 });
          sparks(c, 10 * s, m.x, m.y, 4, 100, { up: 1.5, g: 0.6, drag: 1, ramp: FR, life: 1.4 }); for (let k = 0; k < 3 * s; k++) smokeP(c, m.x + R.range(-6, 6), m.y - 1.5, R.range(8, 18), R.pick(SMOKE), R.range(3, 4.4), R.range(0.6, 0.9), 20); addLight(c, m.x, m.y - 6, 16 * s, P[2], 0.45, 0.14); });
      }
      if (t > 1.3 && t < 2.1 && R.chance(0.5)) { const m = R.pick(MS); fx(c, m.x + R.range(-6, 6), m.y + R.range(-1, 1), 0, R.range(-8, 8), 0, R.range(20, 45), 0.4, dSpark, { size: 2, g: 0.2, drag: 1, ramp: FR }); }
    },
    back(B, L, t) { for (const m of MS) crater(B, t, m); drawM(B, L, t, false); },
    front(B, L, t) { drawM(B, L, t, true); },
    end: 2.25,
  };
});

/* ===================== TRIỀU ===================== */
const WCOL = P => [P[0], P[1], P[2], P[4], P[6]];
function splash(c, x, y, z, n, pow = 1) { const R = c.R, P = c.P; for (let k = 0; k < n; k++) { const a = R.range(0, TAU), v = R.range(35, 85) * pow; fx(c, x, y, z, Math.cos(a) * v, Math.sin(a) * v * 0.45, R.range(30, 90) * pow, 2, dDrop, { g: 1, drag: 0.4, col: R.chance(0.4) ? P[0] : P[1], c2: P[4], onLand: (cc, p) => { p.draw = dCrown; p.life = p.max = 0.16; } }); } }
FS.trieu_sk1 = SC((c, at, R, P, o) => {   /* Roi Nước: dòng nước vút ra từ miệng thành roi, quất xuống đối thủ, rút về */
  const M = o.M, F = { x: c.ax, y: c.ay };
  const ctl = t => { const lash = tm(t, 0.4, 0.5); return { x: lerp(M.x, F.x, 0.45), y: M.y, z: lerp(M.z + 26, M.z + 2, lash) }; };
  const ext = t => t < 0.3 ? 0 : t < 0.42 ? outCubic(tm(t, 0.3, 0.42)) : t < 0.72 ? 1 : 1 - tm(t, 0.72, 0.88);
  const ptsAt = t => { const e = ext(t), C2 = ctl(t), tip = { x: F.x - 4, y: F.y, z: lerp(18, 9, tm(t, 0.4, 0.5)) }, pts = []; for (let i = 0; i <= 24; i++) { const u = (i / 24) * e, a = (1 - u) * (1 - u), b = 2 * u * (1 - u), d = u * u; pts.push([c.X(a * M.x + b * C2.x + d * tip.x), c.Y(M.y, a * M.z + b * C2.z + d * tip.z)]); } return pts; };
  return {
    update(t) {
      if (t > 0.06 && t < 0.3) gather(c, M.x + 2, M.y, M.z, [P[0], P[1], P[2], P[4]], 1.1, 10);
      const e = ext(t); if (e > 0.1 && R.chance(0.6)) { const pts = ptsAt(t), q = R.pick(pts); fx(c, c.IX ? c.IX(q[0]) : q[0] / RES + c.x0, M.y + 0.5, c.IZ ? c.IZ(q[1], M.y) : (M.y - c.y0) - q[1] / RES, R.range(-15, 15), 0, R.range(0, 20), 2, dDrop, { g: 1, col: P[1], c2: P[4], onLand: (cc, p) => { p.draw = dCrown; p.life = p.max = 0.16; } }); }
      at('hit', t, 0.5, () => { o.hit?.(1); o.shake?.(0.2); splash(c, F.x - 4, F.y + 0.5, 9, 16, 1); for (let k = 0; k < 4; k++) puff(c, F.x - 4 + R.range(-4, 4), F.y + 1, P[0], 2.4, 0.35, 10); });
    },
    front(B, L, t) { if (t > 0.06 && t < 0.32) orb(B, c.X(M.x + 2), c.Y(M.y, M.z), 1 + 2.5 * tm(t, 0.06, 0.3), [P[0], P[1], P[2], P[4]], P[6]); const e = ext(t); if (e > 0.02) { const pts = ptsAt(t); tube(B, pts, u => lerp(2, 5, Math.sin(Math.PI * Math.min(1, u * 1.15)) * 0.6 + u * 0.4), WCOL(P), 1); const q = pts[pts.length - 1]; orb(B, q[0], q[1], 5, [P[0], P[1], P[2]], P[5]); } },
    end: 1.3,
  };
});
FS.trieu_sk2 = SC((c, at, R, P, o) => {   /* Phi Thuỷ Châm: 3 kim nước xoè quạt, vệt bụi nước, toé khi trúng */
  const M = o.M, F = { x: c.ax, y: c.ay }, N = [-5, 0, 5].map((dy, i) => ({ S: shot({ x: M.x + 2, y: M.y + 0.5, z: M.z }, { x: F.x - 3, y: F.y + 0.5 + dy, z: 9 }, 0.3 + i * 0.04, 270), i }));
  return {
    update(t) {
      if (t > 0.06 && t < 0.3) gather(c, M.x + 2, M.y, M.z, [P[0], P[1], P[2], P[4]], 1.2, 10);
      for (const n of N) { const p = n.S.pos(t); if (p && R.chance(0.7)) fx(c, p.x - 3, p.y, p.z, R.range(-30, -5), R.range(-5, 5), R.range(0, 15), 2, dDrop, { g: 1, col: P[1], c2: P[4], onLand: (cc, q) => { q.draw = dCrown; q.life = q.max = 0.16; } });
        at('h' + n.i, t, n.S.t1, () => { o.hit?.(n.i === 0 ? 0.9 : 0.4); splash(c, F.x - 3, F.y + 0.5, 9, 7, 0.8); }); }
    },
    front(B, L, t) { for (const n of N) { const p = n.S.pos(t); if (!p) continue; const q = n.S.pos(Math.max(n.S.t1 - n.S.T, t - 0.02)) || p, X = c.X(p.x), Y = c.Y(p.y, p.z), dx = X - c.X(q.x) + 0.01, dy = Y - c.Y(q.y, q.z), l = Math.hypot(dx, dy), ux = dx / l, uy = dy / l; beam(B, X - ux * 26, Y - uy * 26, X, Y, 0.8, 3.2, [P[0], P[1], P[2], P[4], P[6]]); orb(B, X, Y, 2.5, [P[0], P[1]], P[4]); } },
    end: 1.2,
  };
});
FS.trieu_sk3 = SC((c, at, R, P, o) => {   /* Sóng Cuộn: con sóng bạc đầu chạy trên mặt đất qua đối thủ, để vệt ướt */
  const C = o.C, F = { x: c.ax, y: c.ay }, T0 = 0.32, T1 = 0.95, x0 = C.x + 8, x1 = 186;
  const xf = t => lerp(x0, x1, smooth(T0, T1, t)), hh = t => 17 * tm(t, T0, T0 + 0.12) * (1 - tm(t, T1 - 0.12, T1));
  const wall = (B, t, y, hs) => { if (t < T0 || t > T1) return; const X1 = Math.round(c.X(xf(t))), Hh = hh(t) * hs * RES, Wd = 36 * RES, Y = Math.round(c.Y(y)), ph = t * 18;
    if (Hh < 2) return;
    for (let X = X1 - Wd; X <= X1; X++) { const p = (X - (X1 - Wd)) / Wd, h = Hh * (p < 0.7 ? Math.pow(Math.sin(p / 0.7 * Math.PI * 0.5), 1.5) : 1 - 0.35 * Math.pow((p - 0.7) / 0.3, 2)), top = Math.round(Y - h); if (h < 1.5) continue;
      for (let yy = top; yy <= Y; yy++) { const d = yy - top, rel = d / Math.max(1, h), sw = Math.abs(rel - 0.35 - 0.06 * Math.sin(X * 0.15 - ph)) < 0.045;
        let col = d < 2 ? (hash2(X >> 1, Math.floor(ph), 3) < 0.6 ? P[0] : P[1]) : d < 4 ? (hash2(X, yy, 5) < 0.35 ? P[0] : P[1]) : rel < 0.5 ? (sw ? P[1] : P[2]) : rel < 0.82 ? P[3] : P[5];
        if (p > 0.9 && d >= 4) col = rel < 0.6 ? P[3] : P[5];
        B.set(X, yy, col); }
      B.set(X, top - 1, P[5]); B.set(X, Y + 1, P[6]); }
    const lipX = X1 - Wd * 0.3 + 2, lipY = Math.round(Y - Hh + 2), lr = Math.max(6, Hh * 0.42);
    crescent(B, lipX + lr * 0.2, lipY + lr * 0.95, lr, -0.35, 6, [P[0], P[1], P[2]], 1, 1.25);
    for (let i = 0; i < 6; i++) { const fx_ = X1 - 4 + i * 2 + Math.round(Math.sin(ph + i) * 1.5), fy = Y - 1 - (i % 2); B.set(fx_, fy, P[0]); B.set(fx_ + 1, fy, P[0]); B.set(fx_, fy - 1, P[1]); } };
  const skirt = (B, t, y) => { if (t < T0 || t > T1) return; const X1 = Math.round(c.X(xf(t))), Hh = hh(t) * 0.3 * RES, Wd = 34 * RES, Y = Math.round(c.Y(y)); if (Hh < 1.5) return;
    for (let X = X1 - Wd; X <= X1 - 4; X++) { const p = (X - (X1 - Wd)) / Wd, h = Math.round(Hh * Math.sin(p * Math.PI)); for (let d = 0; d <= h; d++) B.set(X, Y - h + d, d < 2 ? (hash2(X >> 1, Math.floor(t * 18), 4) < 0.6 ? P[0] : P[1]) : d < h - 1 ? P[2] : P[4]); B.set(X, Y - h - 1, P[5]); } };
  return {
    update(t) {
      if (t > 0.06 && t < T0) gather(c, C.x + 6, C.y, 4, [P[0], P[1], P[2], P[4]], 1, 10);
      if (t > T0 && t < T1) { const x = xf(t), h = hh(t); for (let k = 0; k < 2; k++) fx(c, x + R.range(-2, 3), F.y + R.range(-4, 4), h * R.range(0.6, 1), R.range(10, 50), R.range(-8, 8), R.range(20, 60), 2, dDrop, { g: 1, col: P[0], c2: P[3], onLand: (cc, p) => { p.draw = dCrown; p.life = p.max = 0.16; } }); if (R.chance(0.5)) puff(c, x + 2, F.y + R.range(-4, 4), P[0], 1.8, 0.25, 6, { z: h * 0.8 }); }
      at('hit', t, lerp(T0, T1, 0.5) - 0.03, () => { o.hit?.(1.1); o.shake?.(0.2); splash(c, F.x, F.y, 10, 10, 1); });
    },
    back(B, L, t) { if (t > T0) { const fd = 1 - tm(t, 1.05, 1.35); if (fd > 0) { const xa = x0, xb = Math.min(xf(t) - 6, x1); for (let dy = -4; dy <= 4; dy += 2) { const h = hash2(dy + 9, 3, 1), xs = lerp(xa, xb, 1 - fd) + h * 20, xe = xb - h * 8; for (let x = xs; x < xe; x += 0.5) { const X = c.X(x), Y = c.Y(F.y + dy); if (hash2(X >> 3, dy, 2) < 0.3) continue; B.set(X, Y, P[5]); B.set(X, Y + 1, P[6]); } } } } wall(B, t, F.y - 3, 1); },
    front(B, L, t) { skirt(B, t, F.y + 4); },
    end: 1.38,
  };
});
FS.trieu_sk4 = SC((c, at, R, P, o) => {   /* Bong Bóng Giam: bóng nước bay tới, phồng thành bóng to nhốt đối thủ, bọt nhỏ nổi, rồi vỡ toé */
  const M = o.M, F = { x: c.ax, y: c.ay }, S = shot({ x: M.x + 2, y: M.y + 0.5, z: M.z }, { x: F.x, y: F.y + 0.5, z: 10 }, 0.3, 150), POP = 1.15;
  const bub = (B, X, Y, r, half) => { const n = Math.ceil(r * 7); for (let i = 0; i < n; i++) { const a = i / n * TAU, s = Math.sin(a); if (half && (s >= 0) !== (half > 0)) continue; const col = a > 3.4 && a < 4.9 ? P[0] : s > 0.5 ? P[4] : P[2]; B.set(X + Math.cos(a) * r, Y + s * r, col); B.set(X + Math.cos(a) * (r - 1), Y + s * (r - 1), s > 0.5 ? P[3] : P[1]); } };
  return {
    update(t) {
      if (t > 0.06 && t < 0.3) gather(c, M.x + 2, M.y, M.z, [P[0], P[1], P[2], P[4]], 1, 10);
      at('in', t, S.t1, () => { o.hit?.(0.5); splash(c, F.x, F.y + 0.5, 10, 6, 0.6); });
      if (t > S.t1 && t < POP && R.chance(0.5)) fx(c, F.x + R.range(-9, 9), F.y + 0.6, R.range(2, 8), 0, 0, R.range(12, 22), 0.45, (B, L, cc, p, x, y, k) => { const r = p.size; B.set(x, y - r, P[0]); B.set(x - r, y, P[1]); B.set(x + r, y, P[2]); B.set(x, y + r, P[3]); }, { size: R.chance(0.5) ? 1 : 2 });
      at('pop', t, POP, () => { o.shake?.(0.15); splash(c, F.x, F.y + 0.5, 12, 22, 1.1); for (let k = 0; k < 8; k++) { const a = k / 8 * TAU; puff(c, F.x + Math.cos(a) * 10, F.y + Math.sin(a) * 4, P[0], 2.4, 0.3, 6, { z: 10 + Math.sin(a) * 8 }); } });
    },
    front(B, L, t) { const p = S.pos(t); if (p) { const X = c.X(p.x), Y = c.Y(p.y, p.z); bub(B, X, Y, 6, 0); B.set(X - 2, Y - 2, P[0]); }
      if (t >= S.t1 && t < POP) { const k = outBack(tm(t, S.t1, S.t1 + 0.18), 1.8), r = 13 * k * RES * (1 + 0.04 * Math.sin(t * 22)), X = c.X(F.x), Y = c.Y(F.y, 10);
        for (let y = -r; y <= r; y += 1) for (let x = -r; x <= r; x += 1) { if (x * x + y * y < r * r * 0.9 && bayer(X + x, Y + y) < 0.14) B.set(X + x, Y + y, P[3]); }
        bub(B, X, Y, r, 0); for (let i = 0; i < 4; i++) { B.set(X - r * 0.5 + i, Y - r * 0.62 + i * 0.4, P[0]); } } },
    end: 1.42,
  };
});
FS.trieu_ult = SC((c, at, R, P, o) => {   /* Hải Cầu Vỡ: nước dâng thành vòng, phồng cầu nước bọc đối thủ, xoáy bên trong, vỡ tung thành vòng bọt */
  const C = o.C, A = { x: c.ax, y: c.ay }, Z = 12, RR = 21, T0 = 0.42, FORM = 0.62, POP = 1.36;
  const rad = t => RR * outBack(tm(t, FORM - 0.1, FORM + 0.12), 1.6) * (1 + 0.035 * Math.sin(t * 24));
  const arms = Array.from({ length: 7 }, (_, i) => ({ a0: R.range(0, TAU), r: R.range(0.35, 0.85), w: R.range(5, 8) * R.sign(), len: R.range(0.8, 1.4), z: R.range(-0.6, 0.6) }));
  const swirl = (B, t, fr) => { if (t < FORM || t > POP) return; const r = rad(t) * RES, X = c.X(A.x), Y = c.Y(A.y, Z);
    for (const s of arms) for (let q = 0; q < s.len; q += 0.04) { const a = s.a0 + s.w * (t - FORM) + q, sn = Math.sin(a); if ((sn >= 0) !== fr) continue; const rr = r * s.r; B.dot(X + Math.cos(a) * rr, Y + s.z * r * 0.6 + sn * rr * 0.35, q > s.len - 0.2 ? P[0] : P[1], fr ? 0.5 : 0.8); } };
  const shell = (B, t, fr) => { if (t < FORM - 0.1 || t >= POP) return; const r = rad(t) * RES, X = c.X(A.x), Y = c.Y(A.y, Z), n = Math.ceil(r * 7);
    if (!fr) { for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y < r * r * 0.86 && bayer(X + x, Y + y) < 0.13) B.set(X + x, Y + y, P[3]); }
    for (let i = 0; i < n; i++) { const a = i / n * TAU, s = Math.sin(a); if (fr === (a > Math.PI * 1.05 && a < Math.PI * 1.95)) continue; B.set(X + Math.cos(a) * r, Y + s * r, a > 3.5 && a < 4.6 ? P[0] : s > 0.55 ? P[5] : P[2]); B.set(X + Math.cos(a) * (r - 1), Y + s * (r - 1), s > 0.55 ? P[4] : P[1]); B.set(X + Math.cos(a) * (r + 1), Y + s * (r + 1), P[6]); }
    if (fr) for (let i = 0; i < 5; i++) { B.set(X - r * 0.55 + i, Y - r * 0.6 + i * 0.5, P[0]); B.set(X - r * 0.55 + i, Y - r * 0.6 + i * 0.5 + 1, P[0]); } };
  const rise = (B, t, half) => { if (t < T0 || t > FORM + 0.05) return; const k = tm(t, T0, FORM), r = 26 - 6 * k, h = 4 + 18 * k; for (let j = 0, n = 70; j < n; j++) { const a = j / n * TAU, s = Math.sin(a); if ((s >= 0) !== (half > 0)) continue; const hh = h * (0.7 + 0.3 * Math.sin(a * 5 + t * 20)); beam(B, c.X(A.x + Math.cos(a) * r), c.Y(A.y + s * r * 0.45), c.X(A.x + Math.cos(a) * r * 0.9), c.Y(A.y + s * r * 0.4, hh), 0.8, 0.6, [P[1], P[2], P[3], P[4]]); } };
  return {
    update(t) {
      if (t < 0.4) gather(c, C.x + 2, C.y, 10, [P[0], P[1], P[2], P[4]], 1.5, 16);
      at('rise', t, T0, () => { o.shake?.(0.15); o.hit?.(0.5); });
      if (t > T0 && t < FORM) for (let k = 0; k < 2; k++) { const a = R.range(0, TAU); fx(c, A.x + Math.cos(a) * 24, A.y + Math.sin(a) * 11, 2, -Math.cos(a) * 20, 0, R.range(30, 70), 2, dDrop, { g: 1, col: P[1], c2: P[4], onLand: (cc, p) => { p.draw = dCrown; p.life = p.max = 0.16; } }); }
      at('t1', t, 0.85, () => o.hit?.(0.5)); at('t2', t, 1.1, () => o.hit?.(0.5));
      if (t > FORM && t < POP && R.chance(0.6)) fx(c, A.x + R.range(-14, 14), A.y + R.range(-3, 3), R.range(2, 16), 0, 0, R.range(14, 26), 0.5, (B, L, cc, p, x, y, k) => { const r = p.size; B.set(x, y - r, P[0]); B.set(x - r, y, P[1]); B.set(x + r, y, P[2]); B.set(x, y + r, P[3]); }, { size: R.chance(0.5) ? 1 : 2 });
      at('pop', t, POP, () => { o.shake?.(0.5); o.flash?.(0.1, '200,235,255'); o.hit?.(1.6); o.knock?.(); for (let k = 0; k < 44; k++) { const a = R.range(0, TAU), z = Z + Math.sin(a) * RR * 0.9, v = R.range(60, 130); fx(c, A.x + Math.cos(a) * RR, A.y + R.range(-3, 3), Math.max(1, z), Math.cos(a) * v, R.range(-30, 30), Math.sin(a) * v * 0.6 + 40, 2, dDrop, { g: 1, drag: 0.3, col: R.chance(0.4) ? P[0] : P[1], c2: P[4], onLand: (cc, p) => { p.draw = dCrown; p.life = p.max = 0.16; } }); }
        for (let k = 0; k < 10; k++) { const a = k / 10 * TAU; puff(c, A.x + Math.cos(a) * 16, A.y + Math.sin(a) * 7, P[0], 3, 0.4, 8, { z: 4 }); } });
    },
    back(B, L, t) { if (t > POP) { const k = tm(t, POP, POP + 0.5), fd = 1 - tm(t, POP + 0.5, 2.2); gring(B, c, A.x, A.y + 1, 0, 10 + 44 * outCubic(k), 2.2 * (1 - k) + 1, [P[0], P[1], P[2]], k < 0.75 ? 1 : 0.5, -1); const k2 = tm(t, POP + 0.12, POP + 0.62); if (k2 > 0 && k2 < 1) gring(B, c, A.x, A.y + 1, 0, 8 + 30 * outCubic(k2), 1.5, [P[1], P[2]], k2 < 0.75 ? 1 : 0.5, -1); if (fd > 0 && t < 1.95) ditherOval(B, c.X(A.x), c.Y(A.y + 1), 26 * RES, 10 * RES, P[6], fd > 0.5 ? 0.25 : 0.12); }
      rise(B, t, -1); swirl(B, t, false); shell(B, t, false); },
    front(B, L, t) { rise(B, t, 1); swirl(B, t, true); shell(B, t, true); if (t > POP) { const k = tm(t, POP, POP + 0.5); if (k < 1) gring(B, c, A.x, A.y + 1, 0, 10 + 44 * outCubic(k), 2.2 * (1 - k) + 1, [P[0], P[1], P[2]], k < 0.75 ? 1 : 0.5, 1); const k2 = tm(t, POP + 0.12, POP + 0.62); if (k2 > 0 && k2 < 1) gring(B, c, A.x, A.y + 1, 0, 8 + 30 * outCubic(k2), 1.5, [P[1], P[2]], k2 < 0.75 ? 1 : 0.5, 1); } },
    end: 2.25,
  };
});

/* ===================== LÔI ===================== */
FS.loi_sk1 = SC((c, at, R, P, o) => {   /* Chuỗi Sét: tia điện gấp khúc từ miệng (thon -> to), bò quanh đối thủ rồi nảy sang điểm sau */
  const M = o.M, F = { x: c.ax, y: c.ay }, T0 = 0.3, T1 = 0.66;
  return {
    update(t) {
      if (t > 0.06 && t < T0) gather(c, M.x + 2, M.y, M.z, [P[0], P[1], P[2], P[3]], 1.4, 10);
      at('h1', t, T0 + 0.05, () => { o.hit?.(1); sparks(c, 10, F.x - 4, F.y + 0.5, 9, 110, { up: 0.8, g: 1, bounce: 0.4, ramp: [P[0], P[1], P[2], P[4]] }); });
      at('h2', t, T0 + 0.24, () => { o.hit?.(0.5); sparks(c, 8, F.x - 4, F.y + 0.5, 9, 90, { up: 0.8, g: 1, bounce: 0.4, ramp: [P[0], P[1], P[3], P[4]] }); });
      if (t > T0 && t < T1 && R.chance(0.6)) fx(c, F.x + R.range(-6, 6), F.y + 0.6, R.range(3, 16), R.range(-40, 40), 0, R.range(-20, 30), 0.12, dSpark, { size: 2, ramp: [P[0], P[1], P[3]] });
    },
    front(B, L, t) {
      if (t > 0.06 && t < T0 + 0.02) { const k = tm(t, 0.06, T0), X = c.X(M.x + 2), Y = c.Y(M.y, M.z); orb(B, X, Y, 1 + 2.5 * k, [P[0], P[1], P[3]], P[5]); if (R.chance(0.6)) zap(B, R, X, Y, X + R.range(-8, 8), Y + R.range(-8, 8), 0.5, 0.5, P, 2, 0); }
      if (t >= T0 && t < T1) { const g = tm(t, T0, T0 + 0.05), fl = t > T1 - 0.1 ? (Math.floor(t * 50) % 2 ? 0.5 : 1) : 1, X0 = c.X(M.x + 2), Y0 = c.Y(M.y, M.z), X1 = c.X(F.x - 4), Y1 = c.Y(F.y, 9);
        zap(B, R, X0, Y0, lerp(X0, X1, g), lerp(Y0, Y1, g), 0.7, 2.6, P, 5, 0.2, fl); L.glow(X1, Y1, 12, P[3], 0.3 * fl); L.glow(X0, Y0, 8, P[1], 0.25 * fl);
        if (g >= 1) { for (let i = 0; i < 2; i++) { const a = R.range(0, TAU); zap(B, R, X1, Y1, X1 + Math.cos(a) * 14, Y1 + Math.sin(a) * 16, 1.2, 0.5, P, 3, 0, fl); } if (t > T0 + 0.18) { const k = tm(t, T0 + 0.18, T0 + 0.24); zap(B, R, X1, Y1, lerp(X1, c.X(F.x + 46), k), lerp(Y1, c.Y(F.y - 12, 8), k), 2, 1, P, 4, 0.1, fl); } } }
    },
    end: 1.1,
  };
});
FS.loi_sk2 = SC((c, at, R, P, o) => {   /* Lôi Cầu: cầu điện lách tách bay tới, chạm thì vòng báo rồi sét trời giáng thẳng xuống */
  const M = o.M, F = { x: c.ax, y: c.ay }, S = shot({ x: M.x + 3, y: M.y + 0.5, z: M.z }, { x: F.x - 2, y: F.y + 0.5, z: 9 }, 0.3, 150), TS = S.t1 + 0.12;
  return {
    update(t) {
      if (t > 0.06 && t < 0.3) gather(c, M.x + 3, M.y, M.z, [P[0], P[1], P[3], P[4]], 1.4, 10);
      const p = S.pos(t); if (p && R.chance(0.8)) fx(c, p.x, p.y, p.z, R.range(-50, 10), R.range(-10, 10), R.range(-20, 30), 0.18, dSpark, { size: 2, ramp: [P[0], P[1], P[3], P[4]] });
      at('in', t, S.t1, () => { o.hit?.(0.6); sparks(c, 8, F.x - 2, F.y + 0.5, 9, 80, { up: 0.6, g: 1, bounce: 0.4, ramp: [P[0], P[1], P[3]] }); });
      at('sky', t, TS, () => { o.hit?.(1.3); o.shake?.(0.35); o.flash?.(0.14, '220,240,255'); sparks(c, 18, F.x, F.y + 0.5, 1, 120, { up: 1.2, g: 1, bounce: 0.45, drag: 0.8, ramp: [P[0], P[1], P[2], P[3], P[4]], life: 1.3 }); addLight(c, F.x, F.y - 10, 22, P[3], 0.5, 0.14); });
    },
    back(B, L, t) { if (t > S.t1 - 0.02 && t < TS) { const k = tm(t, S.t1 - 0.02, TS); gring(B, c, F.x, F.y + 1, 0, 16 - 10 * k, 1.2, [P[2], P[3]], 1, 0); } if (t > TS) { const fd = 1 - tm(t, TS + 0.5, TS + 0.8); if (fd > 0) { ditherOval(B, c.X(F.x), c.Y(F.y + 1), 9 * RES, 3.5 * RES, P[7], 1.3 * fd); for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + 0.3; line(B, c.X(F.x), c.Y(F.y + 1), c.X(F.x + Math.cos(a) * 12), c.Y(F.y + 1 + Math.sin(a) * 5), t < TS + 0.3 ? P[3] : P[6], fd > 0.5 ? 1 : 0.5); } } } },
    front(B, L, t) { const p = S.pos(t); if (t > 0.06 && t < 0.32) orb(B, c.X(M.x + 3), c.Y(M.y, M.z), 1 + 3 * tm(t, 0.06, 0.3), [P[0], P[1], P[3], P[4]], P[6]);
      if (p) { const X = c.X(p.x), Y = c.Y(p.y, p.z); orb(B, X, Y, 9, [P[0], P[1], P[3], P[4], P[5]], P[6]); for (let i = 0; i < 3; i++) { const a = R.range(0, TAU); zap(B, R, X + Math.cos(a) * 8, Y + Math.sin(a) * 8, X + Math.cos(a) * 16, Y + Math.sin(a) * 16, 0.6, 0.5, P, 2, 0); } L.glow(X, Y, 12, P[3], 0.3); }
      if (t > TS && t < TS + 0.22) { const fl = t > TS + 0.12 ? 0.5 : 1, X = c.X(F.x), Y = c.Y(F.y + 0.5); zap(B, R, X + R.range(-6, 6), 0, X, Y, 1, 3.5, P, 7, 0.25, fl); L.glow(X, Y - 20, 20, P[3], 0.35 * fl); } },
    end: 1.38,
  };
});
FS.loi_sk3 = SC((c, at, R, P, o) => {   /* Xả Điện: trường điện quanh thân — vòng điện chập chờn, tia nhảy giữa các điểm vòng, 3 xung vòng lan */
  const C = o.C, T0 = 0.3, T1 = 1.3, RG = 24;
  const field = (B, L, t, half) => { if (t < T0 || t > T1) return; const k = outCubic(tm(t, T0, T0 + 0.12)) * (1 - tm(t, T1 - 0.15, T1)), r = RG * k, a = k > 0.5 ? 1 : 0.5;
    const n = Math.ceil(r * TAU * RES); for (let j = 0; j < n; j++) { const an = j / n * TAU, s = Math.sin(an); if ((s >= 0) !== (half > 0)) continue; if (hash2(j >> 2, Math.floor(t * 25), 3) < 0.35) continue; const col = hash2(j, Math.floor(t * 25), 7) < 0.3 ? P[0] : P[3], xx = c.X(C.x + Math.cos(an) * r), yy = c.Y(C.y + 1 + s * r * 0.45); B.dot(xx, yy, col, a); B.dot(xx + 1, yy, col, a); B.dot(xx, yy + 1, P[4], a); B.dot(xx + 1, yy + 1, P[4], a); }
    for (let i = 0; i < 2; i++) { const a1 = R.range(0, TAU), a2 = a1 + R.range(0.6, 1.4), s1 = Math.sin(a1), s2 = Math.sin(a2); if ((s1 + s2 >= 0) !== (half > 0)) continue; zap(B, R, c.X(C.x + Math.cos(a1) * r), c.Y(C.y + 1 + s1 * r * 0.45, R.range(0, 4)), c.X(C.x + Math.cos(a2) * r), c.Y(C.y + 1 + s2 * r * 0.45, R.range(0, 6)), 0.6, 0.9, P, 4, 0, a); }
    for (const p0 of [T0, T0 + 0.33, T0 + 0.66]) { const q = tm(t, p0, p0 + 0.3); if (q > 0 && q < 1) gring(B, c, C.x, C.y + 1, 0, 6 + 36 * outCubic(q), 1, [P[0], P[2]], q < 0.7 ? 1 : 0.5, half); } };
  return {
    update(t) {
      if (t > 0.06 && t < T0) gather(c, C.x + 2, C.y, 8, [P[0], P[1], P[3]], 1.4, 12);
      for (const p0 of [T0, T0 + 0.33, T0 + 0.66]) at('p' + p0, t, p0, () => { o.shake?.(0.08); addLight(c, C.x, C.y - 6, 18, P[3], 0.3, 0.1); });
      if (t > T0 && t < T1 && R.chance(0.7)) { const a = R.range(0, TAU); fx(c, C.x + Math.cos(a) * RG, C.y + 1 + Math.sin(a) * RG * 0.45, R.range(0, 6), Math.cos(a) * 30, 0, R.range(10, 40), 0.18, dSpark, { size: 2, g: 0.5, ramp: [P[0], P[1], P[3], P[4]] }); }
    },
    back(B, L, t) { field(B, L, t, -1); },
    front(B, L, t) { field(B, L, t, 1); },
    end: 1.4,
  };
});
FS.loi_sk4 = SC((c, at, R, P, o) => {   /* Lao Tích Điện: lao xuyên qua đối thủ, để vệt sét gấp khúc trên đường, toé tia lửa điện */
  const C = o.C, F = { x: c.ax, y: c.ay }, T0 = 0.3, TD = 0.25; let xs = [];
  return {
    update(t) {
      if (t > 0.06 && t < T0) gather(c, C.x, C.y, 7, [P[0], P[1], P[3]], 1.4, 12);
      at('go', t, T0, () => o.dash?.(F.x + 22, TD, true));
      if (t > T0 && t < T0 + TD + 0.02) { const x = o.cx ? o.cx() : C.x; xs.push(x); for (let k = 0; k < 2; k++) fx(c, x + R.range(-6, 2), C.y + 0.6, R.range(2, 12), R.range(-60, -10), R.range(-10, 10), R.range(-10, 30), 0.2, dSpark, { size: 2, ramp: [P[0], P[1], P[3], P[4]] }); }
      at('hit', t, T0 + 0.2, () => { o.hit?.(1.1); o.shake?.(0.25); sparks(c, 16, F.x, F.y + 0.5, 9, 120, { up: 0.9, g: 1, bounce: 0.4, ramp: [P[0], P[1], P[2], P[3]] }); addLight(c, F.x, F.y - 9, 14, P[3], 0.4, 0.1); });
    },
    front(B, L, t) { if (t > T0 && xs.length > 1 && t < T0 + TD + 0.3) { const fd = t > T0 + TD + 0.12 ? 0.5 : 1, xa = xs[0], xb = xs[xs.length - 1]; zap(B, R, c.X(xa), c.Y(C.y + 0.6, 7), c.X(xb), c.Y(C.y + 0.6, 7), 0.6, 2.2, P, 4, 0.15, fd); }
      if (t > T0 + 0.2 && t < T0 + 0.42) { const X = c.X(F.x), Y = c.Y(F.y, 9); for (let i = 0; i < 3; i++) { const a = R.range(0, TAU); zap(B, R, X, Y, X + Math.cos(a) * 14, Y + Math.sin(a) * 18, 1.4, 0.5, P, 3, 0); } } },
    end: 1.2,
  };
});
const CLOUD = ['#9aa0bc', '#6d728f', '#4a4e68', '#2c2f44'].map(H);
FS.loi_ult = SC((c, at, R, P, o) => {   /* Sét Trời Giáng: mây bão kéo tới trên đầu, 5 cột sét giáng vòng quanh, lồng điện nối chân cột, cột chốt đánh thẳng */
  const C = o.C, A = { x: c.ax, y: c.ay }, CZ = 60, FIN = 1.38;
  const blobs = Array.from({ length: 16 }, (_, i) => ({ dx: ((i % 8) / 7 - 0.5) * (i < 8 ? 80 : 56) + R.range(-4, 4), dz: i < 8 ? R.range(-3, 2) : R.range(5, 9), r: i < 8 ? R.range(7, 11) : R.range(8, 12) })).sort((p, q) => q.dz - p.dz);
  const nodes = Array.from({ length: 5 }, (_, i) => { const a = -Math.PI / 2 + 0.6 + i / 5 * TAU; return { x: A.x + Math.cos(a) * 40, y: A.y + Math.sin(a) * 14, t: 0.56 + i * 0.12, i }; });
  const cloud = (B, L, t) => { const k = tm(t, 0.3, 0.55) * (1 - tm(t, 1.75, 2.15)); if (k <= 0) return; const a = k > 0.6 ? 1 : 0.5;
    for (const b of blobs) { const X = c.X(A.x + b.dx * (0.6 + 0.4 * k)), Y = c.Y(A.y - 6, CZ + b.dz), r = b.r * RES * (0.6 + 0.4 * k); orb(B, X, Y, r, CLOUD, CLOUD[3], a); }
    if (t > 0.5 && t < FIN + 0.2 && R.chance(0.35)) { const b = R.pick(blobs); disc(B, c.X(A.x + b.dx), c.Y(A.y - 6, CZ + b.dz - 3), b.r * 0.8, P[3], 0.5); } };
  const strike = (B, L, t, n, fr) => { if ((n.y >= c.ay) !== fr || t < n.t || t > n.t + 0.2) return; const fl = t > n.t + 0.12 ? 0.5 : 1, X = c.X(n.x), Y = c.Y(n.y); zap(B, R, X + R.range(-10, 10), c.Y(A.y - 6, CZ - 6), X, Y, 1, 2.8, P, 7, 0.2, fl); L.glow(X, Y, 12, P[3], 0.3 * fl); };
  const cage = (B, L, t, fr) => { if (t < 0.98 || t > FIN + 0.15) return; const a = t > FIN ? 0.5 : 1; for (let i = 0; i < nodes.length; i++) { const p = nodes[i], q = nodes[(i + 1) % nodes.length]; if (((p.y + q.y) / 2 >= c.ay) !== fr) continue; zap(B, R, c.X(p.x), c.Y(p.y, 3), c.X(q.x), c.Y(q.y, 3), 0.7, 0.7, P, 4, 0, a); } };
  const scorch = (B, t) => { for (const n of nodes) { if (t < n.t) continue; const fd = 1 - tm(t, 1.8, 2.15); if (fd <= 0) continue; ditherOval(B, c.X(n.x), c.Y(n.y + 0.5), 5 * RES, 2 * RES, P[7], 1.3 * fd); if (t < 1.6) { B.set(c.X(n.x), c.Y(n.y), P[1]); B.set(c.X(n.x) + 1, c.Y(n.y), P[3]); } } };
  return {
    update(t) {
      if (t < 0.4) { gather(c, C.x + 2, C.y, 10, [P[0], P[1], P[3], P[4]], 1.6, 16); }
      for (const n of nodes) at('n' + n.i, t, n.t, () => { o.shake?.(0.22); if (n.i % 2 === 0) o.hit?.(0.6); sparks(c, 10, n.x, n.y, 1, 100, { up: 1.2, g: 1, bounce: 0.4, ramp: [P[0], P[1], P[3], P[4]] }); puff(c, n.x, n.y, CLOUD[2], 2.6, 0.4, 10); addLight(c, n.x, n.y - 4, 12, P[3], 0.4, 0.1); });
      at('fin', t, FIN, () => { o.hit?.(1.7); o.shake?.(0.55); o.flash?.(0.16, '220,240,255'); o.knock?.(); sparks(c, 24, A.x, A.y + 0.5, 2, 140, { up: 1.4, g: 1, bounce: 0.4, drag: 0.8, ramp: [P[0], P[1], P[2], P[3], P[4]], life: 1.4 }); addLight(c, A.x, A.y - 12, 26, P[3], 0.5, 0.16); });
      if (t > 1.0 && t < FIN && R.chance(0.5)) { const n = R.pick(nodes); fx(c, n.x, n.y + 0.3, 3, R.range(-30, 30), 0, R.range(10, 30), 0.15, dSpark, { size: 2, ramp: [P[0], P[1], P[3]] }); }
    },
    back(B, L, t) { scorch(B, t); cloud(B, L, t); for (const n of nodes) strike(B, L, t, n, false); cage(B, L, t, false); },
    front(B, L, t) { for (const n of nodes) strike(B, L, t, n, true); cage(B, L, t, true);
      if (t > FIN && t < FIN + 0.24) { const fl = t > FIN + 0.13 ? 0.5 : 1, X = c.X(A.x), Y = c.Y(A.y, 16); zap(B, R, X + R.range(-4, 4), c.Y(A.y - 6, CZ - 6), X, Y, 1.4, 3.6, P, 6, 0.3, fl); L.glow(X, Y, 18, P[3], 0.35 * fl); } },
    end: 2.25,
  };
});

/* ===================== PHONG ===================== */
/* nhát chém cong (điểm đệm): đi qua (X, Y) theo hướng ang, dài len, dày th; k = phần đã chém (0..1) */
function slashArc(B, X, Y, len, ang, th, cols, k = 1, a = 1, bend = 1.3) {
  th = Math.max(th, 4); const Rr = len * bend, nx = Math.cos(ang - Math.PI / 2), ny = Math.sin(ang - Math.PI / 2), cx = X - nx * Rr, cy = Y - ny * Rr, span = len / (2 * Rr), base = Math.atan2(ny, nx);
  for (let s = -span; s <= -span + 2 * span * k; s += 0.4 / Rr) { const q = 1 - Math.abs(s) / span, w = th * Math.sqrt(q); for (let d = 0; d <= w; d += 0.5) { const rr = Rr - d; B.dot(cx + Math.cos(base + s) * rr, cy + Math.sin(base + s) * rr, d < 1 ? cols[0] : d < w * 0.6 ? cols[1] : cols[2], a); } }
}
const GUST = P => [P[0], P[2], P[4]];
function windBurst(c, x, y, z, n, sp = 110) { const R = c.R, P = c.P; for (let i = 0; i < n; i++) { const a = i / n * TAU + R.range(-0.2, 0.2); part(c, K.STREAK, x, y, z, Math.cos(a) * sp, Math.sin(a) * sp * 0.45, R.range(-10, 25), R.range(0.16, 0.24), P[1], 1, {}); } }
FS.phong_sk1 = SC((c, at, R, P, o) => {   /* Lưỡi Gió: 3 lưỡi trăng khuyết xoè quạt, vệt gió, chém chéo khi trúng */
  const M = o.M, F = { x: c.ax, y: c.ay }, BL = [-6, 0, 6].map((dy, i) => ({ S: shot({ x: M.x + 2, y: M.y + 0.5, z: M.z }, { x: F.x - 2, y: F.y + 0.5 + dy, z: 9 }, 0.3 + i * 0.06, 250), i }));
  return {
    update(t) {
      if (t > 0.06 && t < 0.3) gather(c, M.x + 2, M.y, M.z, [P[0], P[1], P[2], P[4]], 1.2, 12);
      for (const b of BL) { const p = b.S.pos(t); if (p && R.chance(0.8)) part(c, K.STREAK, p.x - 4, p.y, p.z + R.range(-3, 3), -R.range(30, 60), 0, 0, 0.16, P[1], 1, {});
        at('h' + b.i, t, b.S.t1, () => { o.hit?.(b.i === 1 ? 1 : 0.4); windBurst(c, F.x - 2, F.y + 0.5, 9, 6, 90); }); }
    },
    front(B, L, t) {
      for (const b of BL) { const p = b.S.pos(t); if (p) { crescent(B, c.X(p.x), c.Y(p.y, p.z), 20, 0, 6, GUST(P)); crescent(B, c.X(p.x) - 6, c.Y(p.y, p.z), 16, 0, 2, [P[1], P[2], P[3]], 0.5); } }
      for (const b of BL) { const k = tm(t, b.S.t1, b.S.t1 + 0.14); if (k > 0 && k < 1) slashArc(B, c.X(F.x - 1), c.Y(F.y, 10 + (b.i - 1) * 4), 26, b.i % 2 ? 0.7 : -0.7, 2.5, [P[0], P[1], P[3]], Math.min(1, k * 3), k < 0.6 ? 1 : 0.5); }
    },
    end: 1.2,
  };
});
FS.phong_sk2 = SC((c, at, R, P, o) => {   /* Lốc Xoáy: phễu gió xoay quanh đối thủ (nửa sau sau lưng, nửa trước mỏng), lá cuốn, bụi chân lốc */
  const F = { x: c.ax, y: c.ay }, T0 = 0.3, T1 = 1.22, NJ = 10;
  const funnel = (B, t, fr) => { if (t < T0 || t > T1) return; const g = outCubic(tm(t, T0, T0 + 0.15)) * (1 - tm(t, T1 - 0.12, T1));
    for (let j = 0; j < NJ * g; j++) { const z = j * 3.6, r = 5 + j * 1.7, sp = 11 - j * 0.4;
      for (let d = 0; d < 3; d++) { if (fr && d === 2) continue; const a0 = t * sp + j * 0.7 + d * TAU / 3;
        for (let a = a0; a < a0 + 1.1; a += 0.05) { const sn = Math.sin(a); if ((sn >= 0) !== fr) continue; const X = c.X(F.x + Math.cos(a) * r), Y = c.Y(F.y + sn * r * 0.4, z), col = a > a0 + 0.95 ? P[0] : j > 6 ? P[1] : P[2]; B.set(X, Y - 1, col); B.set(X, Y, col); B.set(X, Y + 1, j > 6 ? P[2] : P[3]); B.set(X + 1, Y, col); } } }
    for (let i = 0; i < 6; i++) { const a = t * 9 + i * 1.3, r = 7 + i * 1.6, z = (i * 5.5 + t * 26) % 34, sn = Math.sin(a); if ((sn >= 0) !== fr) continue; leafAt(B, c.X(F.x + Math.cos(a) * r), c.Y(F.y + sn * r * 0.4, z), a * 2, 2.4, LEAFY[0], LEAFY[1], LEAFY[2]); } };
  return {
    update(t) {
      if (t > 0.06 && t < T0) gather(c, o.C.x + 4, o.C.y, 10, [P[0], P[1], P[2]], 1, 12);
      if (t > T0 && t < T1 && R.chance(0.6)) { const a = R.range(0, TAU); puff(c, F.x + Math.cos(a) * 8, F.y + Math.sin(a) * 3, R.pick([P[3], P[4]]), 2, 0.3, 4, { vx: -Math.sin(a) * 30, vy: Math.cos(a) * 12 }); }
      for (const h of [0.45, 0.75, 1.05]) at('h' + h, t, h, () => o.hit?.(0.5));
      at('end', t, T1 - 0.05, () => { windBurst(c, F.x, F.y + 0.5, 12, 10, 130); for (let i = 0; i < 6; i++) { const a = R.range(0, TAU); fx(c, F.x, F.y + 0.5, R.range(4, 26), Math.cos(a) * 80, Math.sin(a) * 30, R.range(10, 40), 0.55, dLeafO, { g: 0.1, drag: 2, va: R.range(-15, 15), col: LEAFY[0], c2: LEAFY[1], c3: LEAFY[2], size: 1.2 }); } });
    },
    back(B, L, t) { funnel(B, t, false); },
    front(B, L, t) { funnel(B, t, true); },
    end: 1.4,
  };
});
FS.phong_sk3 = SC((c, at, R, P, o) => {   /* Bổ Nhào: lao rẽ gió (nón gió 3 lớp trước mặt, vệt tốc độ dày phía sau), va chạm nổ vòng sóng âm + gió toả + bụi + nhát chém chéo */
  const C = o.C, F = { x: c.ax, y: c.ay }, T0 = 0.3, TD = 0.22, TH = T0 + TD, lines = Array.from({ length: 7 }, (_, i) => ({ z: 2 + i * 2.6 + R.range(-1, 1), l: R.range(26, 46), d: R.range(0, 8) }));
  return {
    update(t) {
      if (t > 0.06 && t < T0) { gather(c, C.x, C.y, 8, [P[0], P[1], P[2]], 1.4, 14); if (R.chance(0.4)) puff(c, C.x - 4 + R.range(-3, 3), C.y + 1, DIRTC[0], 1.8, 0.25, 6); }
      at('go', t, T0, () => { o.dash?.(F.x - 16, TD, true); o.shake?.(0.1); for (let k = 0; k < 4; k++) puff(c, C.x - 4, C.y + 1, R.pick(DIRTC), 2.4, 0.35, 8, { vx: -40 }); });
      if (t > T0 && t < TH) { const x = o.cx ? o.cx() : C.x; for (let k = 0; k < 3; k++) part(c, K.STREAK, x - 4, C.y + 0.6, R.range(2, 16), -R.range(80, 140), 0, 0, 0.18, R.chance(0.5) ? P[0] : P[1], 1, {}); if (R.chance(0.6)) puff(c, x - 6, C.y + 1, DIRTC[1], 1.8, 0.25, 4); }
      at('hit', t, TH, () => { o.hit?.(1.3); o.shake?.(0.35); windBurst(c, F.x - 6, F.y + 0.5, 9, 16, 170); for (let k = 0; k < 6; k++) { const a = k / 6 * TAU; puff(c, F.x - 4 + Math.cos(a) * 6, F.y + 1 + Math.sin(a) * 2.5, R.pick(DIRTC), 2.6, 0.4, 6, { vx: Math.cos(a) * 45, vy: Math.sin(a) * 16 }); } addLight(c, F.x - 6, F.y - 9, 12, P[1], 0.3, 0.1); });
    },
    back(B, L, t) { const k = tm(t, TH, TH + 0.3); if (k > 0 && k < 1) gring(B, c, F.x - 4, F.y + 1, 0, 6 + 30 * outCubic(k), 2.4, [P[0], P[1], P[3]], k < 0.6 ? 1 : 0.5, -1); },
    front(B, L, t) {
      if (t > T0 && t < TH + 0.06) { const x = o.cx ? o.cx() : C.x, X = c.X(x), Y = c.Y(C.y, 8), fd = t > TH ? 0.5 : 1;
        for (const ln of lines) { const y = c.Y(C.y, ln.z), xa = X - 14 - ln.d * 2, xb = xa - ln.l * RES * 0.6; for (let xx = xb; xx <= xa; xx++) { const q = (xx - xb) / (xa - xb); B.dot(xx, y, q > 0.7 ? P[0] : P[1], fd * (q < 0.25 ? 0.5 : 1)); B.dot(xx, y + 1, P[2], fd * (q < 0.25 ? 0.5 : 1)); } }
        crescent(B, X + 24, Y, 24, 0, 8, GUST(P), fd, 1.0); crescent(B, X + 14, Y, 32, 0, 6, GUST(P), fd, 0.9); crescent(B, X + 4, Y, 40, 0, 5, [P[1], P[2], P[3]], 0.5, 0.8); L.glow(X + 18, Y, 10, P[1], 0.2); }
      const k = tm(t, TH, TH + 0.26); if (k > 0 && k < 1) { const X = c.X(F.x - 6 + 8 * k), Y = c.Y(F.y, 9), rx = (4 + 10 * k) * RES, ry = (10 + 18 * k) * RES, a = k < 0.6 ? 1 : 0.5; ellipseT(B, X, Y, rx * 0.5, ry, P[0], a, P[2]); ellipseT(B, X - 6, Y, rx * 0.35, ry * 0.8, P[1], a); }
      const k2 = tm(t, TH, TH + 0.14); if (k2 > 0 && k2 < 1) slashArc(B, c.X(F.x - 2), c.Y(F.y, 10), 30, -0.8, 5, [P[0], P[0], P[2]], Math.min(1, k2 * 3), k2 < 0.6 ? 1 : 0.5);
    },
    end: 1.25,
  };
});
FS.phong_sk4 = SC((c, at, R, P, o) => {   /* Gió Xuôi: 3 dải gió xoắn ốc cuộn lên quanh thân, vòng gió dưới chân, lá bay theo */
  const C = o.C, T0 = 0.3, T1 = 1.3;
  const helix = (B, t, fr) => { if (t < T0 || t > T1) return; const g = tm(t, T0, T0 + 0.1) * (1 - tm(t, T1 - 0.15, T1));
    for (let k = 0; k < 3; k++) { const hd = ((t - T0) * 1.7 + k / 3) % 1;
      for (let u = Math.max(0, hd - 0.3); u < hd; u += 0.008) { const an = u * TAU * 1.6 + k * TAU / 3, sn = Math.sin(an); if ((sn >= 0) !== fr) continue; const r = 11 - u * 4, X = c.X(C.x + Math.cos(an) * r), Y = c.Y(C.y + sn * r * 0.4, u * 28), q = (u - (hd - 0.3)) / 0.3;
        const cc = q > 0.85 ? P[0] : q > 0.4 ? P[1] : P[3], aa = g > 0.5 ? 1 : 0.5; B.dot(X, Y - 1, cc, aa); B.dot(X, Y, cc, aa); B.dot(X + 1, Y, cc, aa); B.dot(X, Y + 1, P[3], g > 0.5 ? (q > 0.3 ? 1 : 0.5) : 0.5); B.dot(X, Y + 2, P[4], 0.5); } }
    gring(B, c, C.x, C.y + 1, 0, 12 + 2 * Math.sin(t * 12), 1, [P[1], P[3]], g > 0.5 ? 1 : 0.5, fr ? 1 : -1); };
  return {
    update(t) { if (t > 0.06 && t < T0) gather(c, C.x, C.y, 8, [P[0], P[1], P[2]], 1, 12); if (t > T0 && t < T1 && R.chance(0.35)) { const a = R.range(0, TAU); fx(c, C.x + Math.cos(a) * 10, C.y + Math.sin(a) * 4, 2, -Math.sin(a) * 25, Math.cos(a) * 10, R.range(25, 45), 0.6, dLeafO, { drag: 1, va: R.range(-12, 12), col: LEAFY[0], c2: LEAFY[1], c3: LEAFY[2], size: 1.1 }); } },
    back(B, L, t) { helix(B, t, false); },
    front(B, L, t) { helix(B, t, true); },
    end: 1.4,
  };
});
FS.phong_ult = SC((c, at, R, P, o) => {   /* Thiên Phong Trảm: 3 đợt nhát chém gió chéo xuyên đối thủ, chốt bằng chữ X, lưỡi gió bay ra */
  const C = o.C, A = { x: c.ax, y: c.ay }, FIN = 1.34;
  const waves = [0.46, 0.74, 1.02].map((t0, w) => Array.from({ length: 4 }, (_, i) => ({ t0: t0 + i * 0.05, ang: R.range(-1.1, 1.1) + (i % 2 ? Math.PI : 0), dz: R.range(4, 16), dx: R.range(-8, 8), w }))).flat();
  const blades = Array.from({ length: 6 }, (_, i) => ({ a: i / 6 * TAU + 0.3 }));
  return {
    update(t) {
      if (t < 0.4) { gather(c, C.x + 2, C.y, 10, [P[0], P[1], P[2], P[3]], 1.4, 16); if (R.chance(0.4)) part(c, K.STREAK, C.x + R.range(-20, -5), C.y + 0.5, R.range(2, 20), 90, 0, 0, 0.18, P[1], 1, {}); }
      for (const s of waves) at('s' + s.t0, t, s.t0, () => { if (s.t0 === 0.46 || s.t0 === 0.74 || s.t0 === 1.02) o.hit?.(0.6); o.shake?.(0.08); for (let k = 0; k < 3; k++) part(c, K.STREAK, A.x + s.dx, A.y + 0.5, s.dz, Math.cos(s.ang) * R.range(80, 140), Math.sin(s.ang) * 30, -Math.sin(s.ang) * R.range(40, 90), 0.2, P[0], 1, {}); });
      at('fin', t, FIN, () => { o.hit?.(1.7); o.shake?.(0.5); o.flash?.(0.12, '230,255,245'); o.knock?.(); windBurst(c, A.x, A.y + 0.5, 10, 14, 160); for (let i = 0; i < 8; i++) { const a = R.range(0, TAU); fx(c, A.x, A.y + 0.5, R.range(4, 20), Math.cos(a) * 90, Math.sin(a) * 30, R.range(10, 40), 0.6, dLeafO, { g: 0.1, drag: 2, va: R.range(-15, 15), col: LEAFY[0], c2: LEAFY[1], c3: LEAFY[2], size: 1.2 }); } });
    },
    front(B, L, t) {
      for (const s of waves) { const k = tm(t, s.t0, s.t0 + 0.16); if (k <= 0 || k >= 1) continue; slashArc(B, c.X(A.x + s.dx), c.Y(A.y, s.dz), 64, s.ang, 3.4, [P[0], P[1], P[3]], Math.min(1, k * 3.5), k < 0.55 ? 1 : 0.5); }
      const k = tm(t, FIN - 0.08, FIN + 0.2); if (k > 0 && k < 1) { for (const an of [0.75, -0.75]) slashArc(B, c.X(A.x), c.Y(A.y, 11), 70, an, 3.6, [P[0], P[0], P[2]], Math.min(1, k * 4), k < 0.6 ? 1 : 0.5, 2.2); }
      const kb = tm(t, FIN, FIN + 0.45); if (kb > 0 && kb < 1) for (const b of blades) { const r = 10 + 70 * kb, X = c.X(A.x + Math.cos(b.a) * r), Y = c.Y(A.y + Math.sin(b.a) * r * 0.45, 10); crescent(B, X, Y, 12, Math.atan2(Math.sin(b.a) * 0.45, Math.cos(b.a)), 3.5, GUST(P), kb < 0.7 ? 1 : 0.5); }
    },
    back(B, L, t) { const k = tm(t, FIN, FIN + 0.3); if (k > 0 && k < 1) gring(B, c, A.x, A.y + 1, 0, 8 + 40 * outCubic(k), 1.4, [P[1], P[3]], k < 0.6 ? 1 : 0.5, -1); },
    end: 2.0,
  };
});

/* ===================== MỘC ===================== */
const BARK = P => [P[1], P[2], P[3], P[5], P[7]];
const bz = (a, b, d, u) => { const v = 1 - u; return [v * v * a[0] + 2 * v * u * b[0] + u * u * d[0], v * v * a[1] + 2 * v * u * b[1] + u * u * d[1]]; };
function vinePts(c, p0, p1, p2, e, n = 24) { const A = [c.X(p0.x), c.Y(p0.y, p0.z)], Bq = [c.X(p1.x), c.Y(p1.y, p1.z)], D = [c.X(p2.x), c.Y(p2.y, p2.z)], pts = []; for (let i = 0; i <= n; i++) pts.push(bz(A, Bq, D, (i / n) * e)); return pts; }
function flower(B, X, Y, r, k, a = 1) { if (k <= 0) return; const rr = r * k; for (let i = 0; i < 5; i++) { const an = i / 5 * TAU - Math.PI / 2; orb(B, X + Math.cos(an) * rr * 0.9, Y + Math.sin(an) * rr * 0.6, rr * 0.62, [PETAL[0], PETAL[1], PETAL[2]], PETAL[3], a); } orb(B, X, Y, rr * 0.42, [POLLEN[0], POLLEN[1], POLLEN[2]], PETAL[3], a); }
FS.moc_sk1 = SC((c, at, R, P, o) => {   /* Roi Rễ: dây leo mọc lá vút từ miệng, quấn 2 vòng quanh đối thủ, siết rồi rút về */
  const M = o.M, F = { x: c.ax, y: c.ay };
  const ext = t => t < 0.3 ? 0 : t < 0.44 ? outCubic(tm(t, 0.3, 0.44)) : t < 0.92 ? 1 : 1 - tm(t, 0.92, 1.08);
  const coil = (B, t, fr) => { const k = tm(t, 0.44, 0.56) * (1 - tm(t, 0.9, 0.98)); if (k <= 0) return; const sq = 1 - 0.18 * Math.sin(Math.PI * tm(t, 0.6, 0.85));
    for (const z of [5, 11]) { const pts = []; let side = null; for (let a = 0; a <= TAU * k; a += 0.08) { const sn = Math.sin(a + Math.PI / 2), f = sn >= 0; if (side !== null && f !== side) { if (side === fr) tube(B, pts, () => 1.8, BARK(P)); pts.length = 0; } side = f; pts.push([c.X(F.x + Math.cos(a + Math.PI / 2) * 9 * sq), c.Y(F.y + sn * 3.5 * sq, z)]); } if (side === fr && pts.length > 1) tube(B, pts, () => 1.8, BARK(P)); } };
  return {
    update(t) {
      if (t > 0.06 && t < 0.3) gather(c, M.x + 2, M.y, M.z, [P[0], P[1], P[2], P[4]], 1, 10);
      at('h1', t, 0.5, () => { o.hit?.(0.8); for (let i = 0; i < 5; i++) fx(c, F.x + R.range(-6, 6), F.y + 0.6, R.range(4, 14), R.range(-30, 30), 0, R.range(10, 30), 0.6, dLeafO, { g: 0.15, drag: 2, sway: 10, va: R.range(-12, 12), col: P[0], c2: P[2], size: 1.2 }); });
      at('h2', t, 0.76, () => { o.hit?.(0.8); o.shake?.(0.15); });
    },
    front(B, L, t) { const e = ext(t); if (e > 0.02) { const pts = vinePts(c, { x: M.x + 1, y: M.y, z: M.z }, { x: lerp(M.x, F.x, 0.5), y: M.y, z: M.z + 18 }, { x: F.x - 8, y: F.y, z: 8 }, e); tube(B, pts, u => lerp(3.4, 2.2, u), BARK(P));
        for (const u of [0.25, 0.5, 0.75]) if (u < e) { const i = Math.floor(u / e * (pts.length - 1)), [X, Y] = pts[i], sd = u === 0.5 ? 1 : -1; leafAt(B, X + 2, Y + sd * 4, sd * 0.6 + 0.3, 4, P[0], P[2], P[7]); } }
      coil(B, t, true); },
    back(B, L, t) { coil(B, t, false); },
    end: 1.3,
  };
});
FS.moc_sk2 = SC((c, at, R, P, o) => {   /* Bào Tử Ngủ: mây bào tử vàng nhạt bốc quanh đối thủ, hạt phấn trôi, chữ z bay lên */
  const F = { x: c.ax, y: c.ay }, T0 = 0.3, T1 = 1.25, SP = [H('#f4f2c0'), H('#dfe39a'), POLLEN[1]];
  return {
    update(t) {
      if (t > 0.06 && t < T0) gather(c, o.C.x + 6, o.C.y, 10, [POLLEN[0], P[0], P[1]], 1, 12);
      if (t > T0 && t < T1 - 0.2) { if (R.chance(0.7)) { const a = R.range(0, TAU); puff(c, F.x + Math.cos(a) * R.range(4, 12), F.y + Math.sin(a) * 4, R.pick(SP), R.range(2.2, 3.4), 0.6, R.range(6, 14), { z: R.range(2, 14), vx: R.range(-6, 6) }); }
        if (R.chance(0.8)) fx(c, F.x + R.range(-14, 14), F.y + R.range(-4, 4), R.range(0, 20), R.range(-6, 6), 0, R.range(4, 12), 0.7, dSpark, { size: 2, sway: 8, ramp: [POLLEN[0], POLLEN[1], P[1], P[2]] }); }
      for (const z of [0.55, 0.8, 1.05]) at('z' + z, t, z, () => fx(c, F.x + 4, F.y + 0.6, 20, 10, 0, 16, 0.6, dG2, { gl: 'z', col: H('#e8f0ff'), c2: H('#3a3f6a') }));
      at('h', t, 0.45, () => o.hit?.(0.3));
    },
    end: 1.4,
  };
});
FS.moc_sk3 = SC((c, at, R, P, o) => {   /* Bão Lá: bầy lá xoay quanh tâm bay tới, va vào thì toả tung */
  const M = o.M, F = { x: c.ax, y: c.ay }, S = shot({ x: M.x + 4, y: M.y + 0.5, z: M.z }, { x: F.x - 3, y: F.y + 0.5, z: 9 }, 0.3, 200), NL = 14;
  const lv = Array.from({ length: NL }, (_, i) => ({ a: i / NL * TAU, r: R.range(3, 8), w: R.range(10, 16), z: R.range(-3, 3), col: i % 3 ? P[0] : LEAFY[0], c2: i % 3 ? P[3] : LEAFY[1] }));
  return {
    update(t) {
      if (t > 0.06 && t < 0.3) gather(c, M.x + 2, M.y, M.z, [P[0], P[1], P[2]], 1, 10);
      at('hit', t, S.t1, () => { o.hit?.(1); for (const l of lv) { const a = l.a + t * l.w; fx(c, F.x - 3 + Math.cos(a) * l.r, F.y + 0.5, 9 + Math.sin(a) * l.r * 0.6, Math.cos(a) * R.range(50, 100), R.range(-20, 20), R.range(10, 50), R.range(0.5, 0.8), dLeafO, { g: 0.25, drag: 1.6, sway: 8, va: R.range(-14, 14), col: l.col, c2: l.c2, size: 1.3 }); } });
    },
    front(B, L, t) { const p = S.pos(t); if (!p) return; for (const l of lv) { const a = l.a + t * l.w, X = c.X(p.x + Math.cos(a) * l.r), Y = c.Y(p.y, p.z + Math.sin(a) * l.r * 0.7 + l.z); leafAt(B, X, Y, a * 1.5, 3, l.col, l.c2, P[7]); } },
    end: 1.3,
  };
});
FS.moc_sk4 = SC((c, at, R, P, o) => {   /* Hút Nhựa: ném hạt, hạt cắm đất nảy mầm quấn đối thủ, hút giọt nhựa xanh về hồi máu */
  const C = o.C, F = { x: c.ax, y: c.ay }, sx = C.x + 8, S = shot({ x: sx, y: C.y + 0.5, z: 14 }, { x: F.x - 6, y: F.y + 1, z: 0 }, 0.32, 140, 24);
  return {
    update(t) {
      if (t > 0.06 && t < 0.32) gather(c, sx, C.y, 14, [P[0], P[1], P[2]], 1, 10);
      at('land', t, S.t1, () => { o.hit?.(0.9); for (let k = 0; k < 4; k++) pebbleHop(c, F.x - 6 + R.range(-2, 2), F.y + 1, 0.6, DIRTC); });
      if (t > S.t1 + 0.2 && t < 1.25) for (let q = 0; q < 2; q++) { const T = R.range(0.35, 0.5), z0 = R.range(6, 14), x0 = F.x + R.range(-4, 4); fx(c, x0, F.y + 0.6, z0, (C.x - x0) / T, (C.y - F.y) / T, (8 - z0) / T + 60 * T, T, (B, L, cc, p, x, y, k) => orb(B, x, y, 2.2, [POLLEN[0], P[0], P[1], P[2]], P[5]), { g: 0.2 }); }
      if (t > S.t1 + 0.55 && t < 1.35 && R.chance(0.4)) star(c, C.x + R.range(-6, 6), C.y + 0.6, R.range(2, 16), R.chance(0.5) ? P[0] : POLLEN[0], 1.6, 0.3);
    },
    front(B, L, t) { const p = S.pos(t); if (p) { orb(B, c.X(p.x), c.Y(p.y, p.z), 5.5, [P[0], P[1], P[2], P[4]], P[7]); L.glow(c.X(p.x), c.Y(p.y, p.z), 8, P[1], 0.2); }
      if (t > S.t1) { const g = outBack(tm(t, S.t1, S.t1 + 0.2), 1.8) * (1 - tm(t, 1.2, 1.38)); if (g > 0.02) { const X = c.X(F.x - 6), Y = c.Y(F.y + 1), h = 13 * g * RES, pts = [[X, Y], [X + 2, Y - h * 0.5], [X - 1, Y - h]]; tube(B, pts, u => lerp(1.6, 0.8, u), BARK(P)); leafAt(B, X - 4, Y - h * 0.6, 2.6, 4 * g, P[0], P[2], P[7]); leafAt(B, X + 4, Y - h * 0.85, 0.4, 4 * g, P[0], P[2], P[7]); } } },
    end: 1.4,
  };
});
const DIRTC = ['#c99b6a', '#a47650', '#7a5238'].map(H);
FS.moc_ult = SC((c, at, R, P, o) => {   /* Lồng Rễ Nở Hoa: 6 rễ khổng lồ trồi quanh, uốn khép vòm (sau cao, trước thấp), đỉnh nở hoa, siết rồi rụng cánh */
  const C = o.C, A = { x: c.ax, y: c.ay }, AP = { x: A.x, y: A.y - 1, z: 38 }, SQ = 1.34;
  const roots = Array.from({ length: 6 }, (_, i) => { const a = -Math.PI / 2 + 0.52 + i / 6 * TAU, ca = Math.cos(a), sa = Math.sin(a), front = sa > 0.3; return { x: A.x + ca * 30, y: A.y + sa * 13, ca, sa, front, at: 0.46 + (i % 3) * 0.07 + (i > 2 ? 0.04 : 0), i }; });
  const drawR = (B, t, fr) => { for (const r of roots) { if (r.front !== fr || t < r.at) continue; const e = outCubic(tm(t, r.at, r.at + 0.28)) * (1 - tm(t, 1.75, 2.05)); if (e <= 0.02) continue; const tip = r.front ? { x: A.x + r.ca * 12, y: A.y + r.sa * 5, z: 16 } : AP;
      const pts = vinePts(c, { x: r.x, y: r.y, z: 0 }, { x: r.x + r.ca * 6, y: r.y, z: r.front ? 14 : 30 }, tip, e, 20); tube(B, pts, u => lerp(r.front ? 3.4 : 5, 1, u), BARK(P));
      for (let j = 4; j < pts.length - 2; j += 5) { const [X, Y] = pts[j]; B.set(X + 3, Y - 1, P[0]); B.set(X + 4, Y - 2, P[1]); } } };
  return {
    update(t) {
      if (t < 0.4) { gather(c, C.x + 2, C.y, 10, [P[0], P[1], P[2], P[3]], 1.4, 16); if (R.chance(0.3)) fx(c, C.x + R.range(-10, 10), C.y + 0.6, R.range(0, 6), 0, 0, R.range(15, 30), 0.5, dLeafO, { sway: 8, va: 5, col: P[0], c2: P[2], size: 1 }); }
      for (const r of roots) at('r' + r.i, t, r.at, () => { o.shake?.(0.1); for (let k = 0; k < 4; k++) pebbleHop(c, r.x + R.range(-3, 3), r.y + R.range(-1, 1), 0.9, DIRTC); puff(c, r.x, r.y + 1, DIRTC[1], 2.6, 0.4, 6); });
      at('t1', t, 0.62, () => o.hit?.(0.6)); at('t2', t, 0.9, () => o.hit?.(0.6));
      if (t > 1.05 && t < 2.0 && R.chance(0.6)) fx(c, A.x + R.range(-10, 10), A.y + R.range(-4, 4), AP.z + R.range(-2, 4), R.range(-15, 15), 0, R.range(-4, 6), 1, dLeafO, { g: 0.05, drag: 1, sway: 14, va: R.range(-6, 6), col: PETAL[1], c2: PETAL[0], c3: PETAL[3], size: 1.1 });
      at('sq', t, SQ, () => { o.hit?.(1.6); o.shake?.(0.4); o.flash?.(0.1, '255,230,240'); o.knock?.(); for (let k = 0; k < 18; k++) { const a = R.range(0, TAU); fx(c, A.x, A.y - 1, AP.z, Math.cos(a) * R.range(30, 70), Math.sin(a) * 25, R.range(10, 40), R.range(0.7, 1.1), dLeafO, { g: 0.12, drag: 1.4, sway: 10, va: R.range(-14, 14), col: PETAL[1], c2: PETAL[0], c3: PETAL[3], size: 1.2 }); } sparks(c, 10, A.x, A.y, 20, 60, { up: 0.6, g: 0, drag: 2, ramp: POLLEN }); });
    },
    back(B, L, t) { if (t > 0.42) { const fd = 1 - tm(t, 1.8, 2.1); if (fd > 0) for (const r of roots) ditherOval(B, c.X(r.x), c.Y(r.y + 0.5), 5 * RES, 2 * RES, DIRTC[2], 1.3 * fd); } drawR(B, t, false); const k = outBack(tm(t, 1.0, 1.2), 2) * (1 - tm(t, 1.8, 2.0)); flower(B, c.X(AP.x), c.Y(AP.y, AP.z + 2), 10 * (t > SQ && t < SQ + 0.1 ? 1.15 : 1), k); },
    front(B, L, t) { drawR(B, t, true); },
    end: 2.25,
  };
});

/* ===================== SƯƠNG ===================== */
const dCloud = (B, L, c, p, x, y, k) => { const r = p.size * RES * (0.45 + 0.75 * (1 - k)), hi = p.c2 ?? c.P[0], lo = p.c3 ?? c.P[3]; if (k < 0.12) return;
  for (let yy = Math.floor(y - r * 0.7); yy <= Math.ceil(y + r * 0.7); yy++) for (let xx = Math.floor(x - r); xx <= Math.ceil(x + r); xx++) { const dx = (xx + 0.5 - x) / r, dy = (yy + 0.5 - y) / (r * 0.7), d = dx * dx + dy * dy; if (d > 1) continue; B.set(xx, yy, dy < -0.3 && dx < 0.3 ? hi : d > 0.62 && dy > 0.15 ? lo : p.col); } };
function icicle(B, P, X, Y0, w, h, white = false) { for (let y = 0; y <= h; y++) { const hw = (w / 2) * (1 - y / h); for (let x = Math.floor(-hw - 1); x <= Math.ceil(hw + 1); x++) { const fx_ = x + 0.5, inn = Math.abs(fx_) <= hw; if (!inn) { if (Math.abs(fx_) <= hw + 1) B.set(X + x, Y0 + y, P[7]); continue; } B.set(X + x, Y0 + y, white ? P[0] : Math.abs(fx_ + hw * 0.2) < 0.8 ? P[0] : fx_ < 0 ? P[1] : fx_ < hw * 0.5 ? P[3] : P[5]); } } for (let x = -w / 2 - 1; x <= w / 2 + 1; x++) B.set(X + x, Y0 - 1, P[7]); }
function iceShards(c, x, y, z, n, pow = 1) { const R = c.R, P = c.P; for (let i = 0; i < n; i++) { const a = R.range(0, TAU), v = R.range(40, 100) * pow; part(c, K.SHARD, x, y, z, Math.cos(a) * v, Math.sin(a) * v * 0.45, R.range(40, 110) * pow, R.range(0.4, 0.6), R.pick([P[1], P[2], P[3]]), R.range(1.6, 2.8), { g: 1, drag: 0.6, bounce: 0.3, va: R.range(-15, 15), qf: 1 }); } }
FS.suong_sk1 = SC((c, at, R, P, o) => {   /* Cơn Gió Tuyết: luồng hơi lạnh hình nón phả từ miệng (mây giá nở to dần + bông tuyết + vệt gió), sương giá loang dưới chân đối thủ */
  const M = o.M, F = { x: c.ax, y: c.ay }, T0 = 0.3, T1 = 0.8;
  return {
    update(t) {
      if (t > 0.06 && t < T0) gather(c, M.x + 2, M.y, M.z, [P[0], P[1], P[2], P[4]], 1.2, 10);
      if (t > T0 && t < T1) for (let q = 0; q < 3; q++) { const sp = R.range(-0.22, 0.22), v = R.range(130, 190), vz = (9 - M.z) / ((F.x - M.x) / v) + sp * 60; const k = R.next();
        if (k < 0.45) fx(c, M.x + 3, M.y + 0.6 + sp * 10, M.z, v, sp * 40, vz, 0.5, dCloud, { size: R.range(3.4, 5.2), col: R.chance(0.5) ? P[1] : P[2], c2: P[0], c3: P[3], drag: 1.2 });
        else if (k < 0.8) part(c, K.FLAKE, M.x + 3, M.y + 0.6, M.z, v * 0.9, sp * 50, vz + R.range(-20, 20), 0.5, R.chance(0.5) ? P[0] : P[1], R.range(1, 1.8));
        else part(c, K.STREAK, M.x + 3, M.y + 0.6, M.z + R.range(-2, 2), v, sp * 40, vz, 0.3, P[0], 1, {}); }
      for (const h of [0.45, 0.66]) at('h' + h, t, h, () => { o.hit?.(h < 0.5 ? 0.9 : 0.5); iceShards(c, F.x - 2, F.y + 0.5, 9, 5, 0.7); });
    },
    back(B, L, t) { if (t > 0.42) { const k = outCubic(tm(t, 0.42, 0.7)) * (1 - tm(t, 1.05, 1.3)); if (k > 0) frostC(B, c, F.x, F.y + 1, 22 * k, 1); } },
    end: 1.35,
  };
});
FS.suong_sk2 = SC((c, at, R, P, o) => {   /* Cột Băng Rơi: bóng tròn báo trên đất, cột băng nhọn rơi thẳng xuống đầu đối thủ, vỡ tung + sương giá */
  const F = { x: c.ax, y: c.ay }, T0 = 0.32, TH = 0.58;
  const z = t => 90 * (1 - Math.pow(tm(t, T0, TH), 2));
  return {
    update(t) {
      if (t > 0.06 && t < T0) gather(c, o.C.x + 4, o.C.y, 16, [P[0], P[1], P[2]], 1, 12);
      at('hit', t, TH, () => { o.hit?.(1.3); o.shake?.(0.3); iceShards(c, F.x, F.y + 0.5, 14, 16, 1); for (let k = 0; k < 8; k++) { const a = k / 8 * TAU; fx(c, F.x + Math.cos(a) * 6, F.y + Math.sin(a) * 3, 2, Math.cos(a) * 40, Math.sin(a) * 16, 6, 0.4, dCloud, { size: 2.6, col: P[1], c2: P[0], c3: P[3], drag: 2.4 }); } star(c, F.x, F.y + 0.6, 16, P[0], 2.6, 0.2); addLight(c, F.x, F.y - 10, 12, P[1], 0.35, 0.1); });
    },
    back(B, L, t) { if (t > T0 - 0.05 && t < TH) { const k = tm(t, T0 - 0.05, TH); ditherOval(B, c.X(F.x), c.Y(F.y + 1), (3 + 6 * k) * RES, (1.3 + 2.4 * k) * RES, P[6], 1.4); } if (t >= TH) { const k = outCubic(tm(t, TH, TH + 0.15)) * (1 - tm(t, 1.05, 1.3)); if (k > 0) frostC(B, c, F.x, F.y + 1, 18 * k, 1); } },
    front(B, L, t) { if (t > T0 && t < TH) { const zz = z(t); icicle(B, P, c.X(F.x), c.Y(F.y, zz + 34), 22, 34 * RES, false); } },
    end: 1.35,
  };
});
FS.suong_sk3 = SC((c, at, R, P, o) => {   /* Xoáy Băng: sàn sương giá lan dưới đối thủ, xoáy tuyết 3 nhánh trên mặt sàn, gai băng nhỏ mọc ở mép */
  const F = { x: c.ax, y: c.ay }, T0 = 0.32, T1 = 1.25, sp = Array.from({ length: 7 }, (_, i) => { const a = i / 7 * TAU + 0.3; return { x: Math.cos(a) * 24, y: Math.sin(a) * 10, h: R.range(5, 8), at: T0 + 0.16 + i * 0.03 }; });
  return {
    update(t) {
      if (t > 0.06 && t < T0) gather(c, o.C.x + 6, o.C.y, 8, [P[0], P[1], P[2]], 1, 12);
      at('h', t, 0.5, () => { o.hit?.(0.6); }); at('h2', t, 0.85, () => o.hit?.(0.4));
      if (t > T0 && t < T1 && R.chance(0.5)) { const a = R.range(0, TAU), r = R.range(4, 22); part(c, K.STAR, F.x + Math.cos(a) * r, F.y + Math.sin(a) * r * 0.42, 1, 0, 0, 3, 0.35, P[0], R.range(0.8, 1.8)); }
      at('end', t, T1 - 0.1, () => { for (const s of sp) iceShards(c, F.x + s.x, F.y + s.y, 3, 3, 0.6); });
    },
    back(B, L, t) { if (t < T0) return; const k = outCubic(tm(t, T0, T0 + 0.25)) * (1 - tm(t, T1 - 0.1, T1 + 0.1)); if (k <= 0) return; frostC(B, c, F.x, F.y + 1, 28 * k, 1, k < 0.98 ? 0.86 : -1);
      for (let arm = 0; arm < 3; arm++) for (let s = 0; s < 1; s += 0.01) { const a = arm * TAU / 3 + s * 4 + t * 5, r = 3 + s * 24 * k; B.dot(c.X(F.x + Math.cos(a) * r), c.Y(F.y + 1 + Math.sin(a) * r * 0.42), s > 0.75 ? P[0] : P[1], 1); B.dot(c.X(F.x + Math.cos(a) * r) + 1, c.Y(F.y + 1 + Math.sin(a) * r * 0.42), P[2], 1); }
      for (const s of sp) if (s.y < 0 && t > s.at && t < T1 - 0.1) crystalC(B, P, c.X(F.x + s.x), c.Y(F.y + s.y), s.h * outBack(tm(t, s.at, s.at + 0.1), 2) * RES, 5 * RES, 0); },
    front(B, L, t) { for (const s of sp) if (s.y >= 0 && t > s.at && t < T1 - 0.1) crystalC(B, P, c.X(F.x + s.x), c.Y(F.y + s.y), s.h * 0.7 * outBack(tm(t, s.at, s.at + 0.1), 2) * RES, 5 * RES, 0); },
    end: 1.4,
  };
});
FS.suong_sk4 = SC((c, at, R, P, o) => {   /* Giáp Giá (Gương Băng): tấm gương băng lục giác trồi lên trước mặt, vệt sáng quét, lấp lánh, rồi vỡ vụn */
  const C = o.C, X0 = C.x + 15, T0 = 0.3, BR = 1.12;
  const panel = (B, t) => { if (t < T0 || t >= BR) return; const g = outBack(tm(t, T0, T0 + 0.14), 1.6), Xc = c.X(X0), Yb = c.Y(C.y + 1), hh = 24 * RES * g, hw = 6 * RES, sw = ((t - T0) * 1.4) % 1;
    for (let y = 0; y < hh; y++) { const v = y / Math.max(1, hh), w = hw * (v < 0.2 ? 0.6 + 2 * v : v > 0.8 ? 0.6 + 2 * (1 - v) : 1);
      for (let x = -w - 1; x <= w + 1; x++) { const X = Xc + x, Y = Yb - y; if (Math.abs(x) > w) { B.set(X, Y, P[6]); continue; } const d = (x / w + 1) / 2, s = Math.abs(d * 0.7 + v * 0.6 - sw * 1.4); B.set(X, Y, s < 0.05 ? P[0] : d < 0.25 ? P[1] : d < 0.6 ? P[2] : P[4]); } }
    for (let x = -hw * 0.6; x <= hw * 0.6; x++) { B.set(Xc + x, Yb - hh, P[6]); B.set(Xc + x, Yb + 1, P[7]); } };
  return {
    update(t) {
      if (t > 0.06 && t < T0) gather(c, X0, C.y, 8, [P[0], P[1], P[2]], 1, 12);
      at('up', t, T0, () => { iceShards(c, X0, C.y + 1, 1, 4, 0.5); });
      if (t > T0 + 0.1 && t < BR && R.chance(0.4)) star(c, X0 + R.range(-5, 5), C.y + 1.2, R.range(3, 22), R.chance(0.5) ? P[0] : P[1], R.range(1, 2), 0.3);
      at('br', t, BR, () => { o.shake?.(0.12); for (let i = 0; i < 14; i++) part(c, K.SHARD, X0 + R.range(-5, 5), C.y + 1.2, R.range(2, 22), R.range(-50, 50), R.range(-10, 20), R.range(20, 70), R.range(0.35, 0.5), R.pick([P[1], P[2], P[3]]), R.range(1.5, 2.6), { g: 1, drag: 0.6, bounce: 0.3, va: R.range(-15, 15), qf: 1 }); });
    },
    front(B, L, t) { panel(B, t); },
    back(B, L, t) { if (t > T0) { const k = outCubic(tm(t, T0, T0 + 0.2)) * (1 - tm(t, BR, BR + 0.25)); if (k > 0) frostC(B, c, X0, C.y + 1, 12 * k, 1); } },
    end: 1.4,
  };
});
FS.suong_ult = SC((c, at, R, P, o) => {   /* Băng Phong: gió tuyết quét qua, gai băng mọc vòng (sau cao, trước thấp), vỏ băng giác cạnh bọc đối thủ rồi vỡ tung */
  const C = o.C, A = { x: c.ax, y: c.ay }, TL = 0.62, BRK = 1.32, Z = 11;
  const cr = Array.from({ length: 9 }, (_, i) => { const a = -Math.PI / 2 + i / 9 * TAU + R.range(-0.12, 0.12), ca = Math.cos(a), sa = Math.sin(a), front = sa > 0.25; const h = front ? R.range(7, 10) : sa < -0.4 ? R.range(22, 30) : R.range(14, 19); return { x: ca * 32, y: sa * 14, h, w: clamp(h * 0.45, 5, 10), lean: ca * R.range(3, 7), at: TL - 0.12 + (i % 3) * 0.05, front }; });
  const HULL = [[-15, 2], [-17, 14], [-9, 25], [4, 27], [15, 19], [16, 6], [9, -2], [-8, -2]];
  const drawC = (B, t, fr) => { if (t >= BRK) return; for (const s of cr) { if (s.front !== fr || t < s.at) continue; const g = outBack(tm(t, s.at, s.at + 0.12), 2.4); crystalC(B, P, c.X(A.x + s.x), c.Y(A.y + s.y), s.h * g * RES, s.w * RES, s.lean * g * RES, 1, t < s.at + 0.03 || t > BRK - 0.04); } };
  const shell = (B, L, t) => { if (t < TL + 0.08 || t >= BRK) return; const k = tm(t, TL + 0.08, TL + 0.3), pts = HULL.map(([x, z]) => [c.X(A.x + x), c.Y(A.y, z)]), n = Math.floor(pts.length * k);
    for (let i = 0; i < n; i++) { const [x0, y0] = pts[i], [x1, y1] = pts[(i + 1) % pts.length]; lineT(B, x0, y0, x1, y1, i < 3 ? P[0] : P[2], 1, P[6]); line(B, x0 + 1, y0 + 1, x1 + 1, y1 + 1, i < 3 ? P[1] : P[3]); }
    if (k >= 1) { for (const [i, j] of [[1, 3], [3, 6], [0, 4]]) lineT(B, pts[i][0], pts[i][1], pts[j][0], pts[j][1], P[1], 0.5); const s = ((t - TL) * 2) % 1; line(B, lerp(pts[1][0], pts[4][0], s) - 6, lerp(pts[1][1], pts[4][1], s) + 6, lerp(pts[1][0], pts[4][0], s) + 6, lerp(pts[1][1], pts[4][1], s) - 6, P[0]); } };
  return {
    update(t) {
      if (t < 0.4) gather(c, C.x + 2, C.y, 10, [P[0], P[1], P[2], P[4]], 1.5, 16);
      if (t > 0.3 && t < 0.8) for (let q = 0; q < 3; q++) { const u = R.next(); if (R.chance(0.6)) part(c, K.FLAKE, A.x - 70 + 40 * u, A.y + R.range(-12, 12), R.range(4, 36), R.range(140, 200), R.range(-8, 8), -10, R.range(0.5, 0.7), R.chance(0.5) ? P[0] : P[1], R.range(1, 1.8)); else part(c, K.STREAK, A.x - 60 + 30 * u, A.y + R.range(-10, 10), R.range(4, 30), R.range(150, 210), 0, 0, 0.3, P[0], 1, {}); }
      at('lock', t, TL, () => { o.hit?.(0.8); o.shake?.(0.2); for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; fx(c, A.x + Math.cos(a) * 18, A.y + Math.sin(a) * 8, 1, Math.cos(a) * 20, Math.sin(a) * 8, 4, 0.4, dCloud, { size: 2.6, col: P[1], c2: P[0], c3: P[3], drag: 2.4 }); } });
      if (t > TL && t < BRK && R.chance(0.4)) { const [x, z] = R.pick(HULL); star(c, A.x + x, A.y + 0.6, z, R.chance(0.5) ? P[0] : P[1], R.range(1, 2), 0.3); }
      at('t2', t, 1.0, () => o.hit?.(0.5));
      at('brk', t, BRK, () => { o.hit?.(1.6); o.shake?.(0.5); o.flash?.(0.14, '214,244,255'); o.knock?.(); for (const s of cr) for (let k = 0; k < 3 + Math.round(s.h / 6); k++) part(c, K.SHARD, A.x + s.x + R.range(-2, 2), A.y + s.y, R.range(1, s.h), (s.x) * R.range(1, 3), s.y * R.range(1, 3), R.range(40, 110), R.range(0.45, 0.65), R.pick([P[1], P[2], P[3]]), R.range(1.8, 3.2), { g: 1, drag: 0.5, bounce: 0.3, va: R.range(-15, 15), qf: 1 });
        iceShards(c, A.x, A.y + 0.5, Z, 18, 1.1); for (let i = 0; i < 10; i++) { const a = i / 10 * TAU; fx(c, A.x + Math.cos(a) * 26, A.y + Math.sin(a) * 11, 1, Math.cos(a) * 40, Math.sin(a) * 16, 4, 0.5, dCloud, { size: 3.4, col: P[1], c2: P[0], c3: P[3], drag: 2.4 }); } addLight(c, A.x, A.y - 14, 26, P[1], 0.4, 0.12); });
    },
    back(B, L, t) { if (t >= TL - 0.12) { const r = 38 * outCubic(tm(t, TL - 0.12, TL + 0.12)) * (1 - outCubic(tm(t, BRK + 0.3, BRK + 0.55))); if (r > 0.5) frostC(B, c, A.x, A.y + 1, r, 1); } drawC(B, t, false); },
    front(B, L, t) { drawC(B, t, true); shell(B, L, t); },
    end: 2.2,
  };
});

/* ===================== TINH ===================== */
const RAIN = [CYAN, POLLEN[1], PINK, H('#9dff8a')];
/* viên đá giác (điểm đệm): hình thoi dài w x h quay theo ang, 4 mặt sáng tối + đường sống giữa + viền */
function gemRh(B, P, X, Y, w, h, ang = 0, a = 1) { const ca = Math.cos(ang), sa = Math.sin(ang), Rr = Math.max(w, h) + 2;
  for (let y = -Rr; y <= Rr; y++) for (let x = -Rr; x <= Rr; x++) { const u = x * ca + y * sa, v = -x * sa + y * ca, d = Math.abs(u) / w + Math.abs(v) / h; if (d > 1 + 1.6 / Math.min(w, h)) continue;
    B.dot(X + x, Y + y, d > 1 ? P[7] : Math.abs(v) < 0.6 ? P[0] : v < 0 ? (u < 0 ? P[1] : P[2]) : u < 0 ? P[3] : P[5], a); } }
/* kim cương lớn cắt giác: mặt trên (crown) + mặt dưới nhọn (pavilion) */
function gemBig(B, P, X, Y, w, h, white = false) { const top = Y - h * 0.32, bot = Y + h * 0.68;
  for (let y = Math.floor(top) - 1; y <= Math.ceil(bot) + 1; y++) { const hw = y < Y ? lerp(w * 0.62, w, (y - top) / (Y - top)) : w * (1 - (y - Y) / (bot - Y));
    for (let x = Math.floor(-hw - 1); x <= Math.ceil(hw + 1); x++) { const inn = Math.abs(x + 0.5) <= hw && y >= top && y <= bot; if (!inn) { if (Math.abs(x + 0.5) <= hw + 1.2 && y >= top - 1 && y <= bot + 1) B.set(X + x, y, P[7]); continue; }
      if (white) { B.set(X + x, y, P[0]); continue; } const k = (x + 0.5) / Math.max(1, hw);
      const col = y < top + 1.5 ? P[0] : y < Y ? (k < -0.55 ? P[1] : k < 0 ? P[0] : k < 0.55 ? P[2] : P[3]) : (Math.abs(k - (y - Y) / (bot - Y) * 0) < 0.12 ? P[1] : k < -0.4 ? P[2] : k < 0.35 ? P[3] : P[5]);
      B.set(X + x, y, Math.abs(y - Y) < 0.6 ? P[1] : col); } } }
FS.tinh_sk1 = SC((c, at, R, P, o) => {   /* Mưa Mảnh: 3 mảnh pha lê nhọn xoè quạt, kéo vệt lấp lánh, vỡ thành sao */
  const M = o.M, F = { x: c.ax, y: c.ay }, SH = [-6, 0, 6].map((dy, i) => ({ S: shot({ x: M.x + 2, y: M.y + 0.5, z: M.z }, { x: F.x - 3, y: F.y + 0.5 + dy, z: 9 }, 0.3 + i * 0.05, 240), i }));
  return {
    update(t) {
      if (t > 0.06 && t < 0.3) gather(c, M.x + 2, M.y, M.z, [P[0], P[1], P[2], P[3]], 1.2, 10);
      for (const s of SH) { const p = s.S.pos(t); if (p && R.chance(0.6)) star(c, p.x - 4, p.y, p.z + R.range(-2, 2), R.pick([P[0], P[1], ...RAIN]), R.range(0.8, 1.6), 0.25);
        at('h' + s.i, t, s.S.t1, () => { o.hit?.(s.i === 1 ? 1 : 0.4); for (let k = 0; k < 6; k++) { const a = R.range(0, TAU), v = R.range(40, 90); part(c, K.CHUNK, F.x - 3, F.y + 0.5, 9, Math.cos(a) * v, Math.sin(a) * v * 0.4, R.range(40, 90), R.range(0.4, 0.55), P[2], R.range(1, 1.5), { g: 1, bounce: 0.35, drag: 0.4, va: R.range(-10, 10), qf: 1 }); } star(c, F.x - 3, F.y + 0.6, 10, P[0], 2.4, 0.2); }); }
    },
    front(B, L, t) { for (const s of SH) { const p = s.S.pos(t); if (p) gemRh(B, P, c.X(p.x), c.Y(p.y, p.z), 9, 3.5, 0); } },
    end: 1.2,
  };
});
FS.tinh_sk2 = SC((c, at, R, P, o) => {   /* Khúc Xạ: tia sáng từ miệng (thon -> to) chạm lăng kính nổi giữa đường, gãy khúc tách 3 màu cầu vồng hội tụ vào đối thủ */
  const M = o.M, F = { x: c.ax, y: c.ay }, PR = { x: lerp(M.x, F.x, 0.48), y: M.y, z: M.z + 14 }, T0 = 0.3, T1 = 0.8;
  return {
    update(t) {
      if (t > 0.06 && t < T0) gather(c, M.x + 2, M.y, M.z, [P[0], P[1], P[2]], 1.2, 10);
      at('h', t, T0 + 0.1, () => { o.hit?.(1); }); at('h2', t, T0 + 0.32, () => o.hit?.(0.5));
      if (t > T0 + 0.1 && t < T1 && R.chance(0.6)) star(c, F.x - 3 + R.range(-3, 3), F.y + 0.6, 9 + R.range(-4, 4), R.pick(RAIN), R.range(1, 2), 0.25);
    },
    front(B, L, t) {
      const prX = c.X(PR.x), prY = c.Y(PR.y, PR.z);
      if (t > 0.1 && t < T1 + 0.12) { const g = outBack(tm(t, 0.1, 0.28), 2), sp = t * 3; gemRh(B, P, prX, prY, 6 * g, 9 * g, sp % 0.6 - 0.3); }
      if (t < T0 || t > T1) return; const g1 = tm(t, T0, T0 + 0.05), g2 = tm(t, T0 + 0.05, T0 + 0.1), fd = t > T1 - 0.1 ? 0.5 : 1, X0 = c.X(M.x + 2), Y0 = c.Y(M.y, M.z), X1 = c.X(F.x - 4), Y1 = c.Y(F.y, 9);
      beam(B, X0, Y0, prX, prY, 1.2, 4, [P[0], P[0], P[1], P[3], P[5]], { len: g1, t, wob: 0.1, a: fd }); L.glow(prX, prY, 12, P[1], 0.3 * fd);
      if (g2 > 0) RAIN.slice(0, 3).forEach((col, i) => { const off = (i - 1) * 6; beam(B, prX, prY + off * 0.3, X1, Y1 + off * 0.4, 1.4, 3.2, [H('#ffffff'), col, col, scaleC(col, 0.7)], { len: g2, t, a: fd }); });
    },
    end: 1.2,
  };
});
FS.tinh_sk3 = SC((c, at, R, P, o) => {   /* Khiên Tinh: 6 tấm pha lê bay vòng quanh thân rồi khoá thành vòm giáp lục giác, lấp lánh, tan */
  const C = o.C, T0 = 0.3, LK = 0.62, T1 = 1.25;
  const plates = (B, t, fr) => { if (t < T0 || t > T1) return; const k = tm(t, T0, LK), sp = (1 - outCubic(k)) * 9;
    for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + t * sp + (1 - k) * 2, sn = Math.sin(a); if ((sn >= 0) !== fr) continue; const r = lerp(22, 12, outCubic(k)), z = lerp(4, 10, k) + (i % 2) * 6; gemRh(B, P, c.X(C.x + Math.cos(a) * r), c.Y(C.y + sn * r * 0.45, z), 4, 7, 0, t > T1 - 0.15 ? 0.5 : 1); } };
  const dome = (B, t) => { if (t < LK || t > T1) return; const X = c.X(C.x), Y = c.Y(C.y, 10), rx = 14 * RES, ry = 15 * RES, a = t > T1 - 0.15 ? 0.5 : 1, n = 6;
    const pts = Array.from({ length: n }, (_, i) => [X + Math.cos(i / n * TAU + 0.5) * rx, Y + Math.sin(i / n * TAU + 0.5) * ry]);
    for (let i = 0; i < n; i++) { const [x0, y0] = pts[i], [x1, y1] = pts[(i + 1) % n]; lineT(B, x0, y0, x1, y1, i < 3 ? P[2] : P[0], a, P[5]); line(B, X, Y, x0, y0, P[2], 0.5); }
    const s = ((t - LK) * 2.2) % 1, sx = X + (s * 2 - 1) * rx * 0.6; lineT(B, sx + 4, Y - ry * 0.7, sx - 4, Y + ry * 0.7, P[0], a); };
  return {
    update(t) { if (t > 0.06 && t < T0) gather(c, C.x, C.y, 10, [P[0], P[1], P[2]], 1.2, 12); at('lk', t, LK, () => { o.shake?.(0.1); star(c, C.x, C.y + 0.6, 12, P[0], 2.6, 0.2); }); if (t > LK && t < T1 && R.chance(0.4)) star(c, C.x + R.range(-12, 12), C.y + 0.6, R.range(2, 22), R.pick([P[0], P[1], ...RAIN]), R.range(1, 1.8), 0.3); },
    back(B, L, t) { plates(B, t, false); },
    front(B, L, t) { plates(B, t, true); dome(B, t); },
    end: 1.4,
  };
});
FS.tinh_sk4 = SC((c, at, R, P, o) => {   /* Trụ Pha Lê: vòng báo dưới chân đối thủ, trụ pha lê lớn phá đất trồi lên sau lưng + 2 trụ nhỏ hai bên, rồi vỡ thành sao */
  const F = { x: c.ax, y: c.ay }, TU = 0.66, TB = 1.08, cr = [[2, -2, 32, 13, 0], [-12, 1, 12, 7, -3], [13, 2, 14, 7, 3]];
  const draw = (B, t, fr) => { if (t < TU || t >= TB) return; for (const [dx, dy, h, w, ln] of cr) { if ((dy >= 0) !== fr) continue; const g = outBack(tm(t, TU, TU + 0.12), 2.2); crystalC(B, P, c.X(F.x + dx), c.Y(F.y + dy), h * g * RES, w * RES, ln * RES, 1, t < TU + 0.04 || t > TB - 0.04); } };
  return {
    update(t) {
      if (t > 0.06 && t < 0.3) gather(c, o.C.x + 4, o.C.y, 10, [P[0], P[1], P[2]], 1, 12);
      at('up', t, TU, () => { o.hit?.(1.3); o.shake?.(0.3); for (let k = 0; k < 6; k++) pebbleHop(c, F.x + R.range(-8, 8), F.y + R.range(-2, 2), 1, DIRTC); });
      at('br', t, TB, () => { o.shake?.(0.15); for (const [dx, dy, h] of cr) for (let k = 0; k < Math.round(h / 3); k++) part(c, K.CHUNK, F.x + dx + R.range(-2, 2), F.y + dy, R.range(2, h), R.range(-60, 60), R.range(-20, 20), R.range(30, 80), R.range(0.4, 0.55), P[2], R.range(1, 1.8), { g: 1, bounce: 0.35, drag: 0.4, va: R.range(-10, 10), qf: 1 }); for (let k = 0; k < 6; k++) star(c, F.x + R.range(-10, 10), F.y + 0.6, R.range(4, 26), R.pick([P[0], ...RAIN]), R.range(1.4, 2.4), 0.35); });
    },
    back(B, L, t) { if (t > 0.3 && t < TU) { const k = tm(t, 0.3, TU); gring(B, c, F.x, F.y + 1, 0, 18 - 4 * k, 1, [Math.floor(t * 12) % 2 ? P[1] : P[3]], 1, 0); if (k > 0.5) ditherOval(B, c.X(F.x), c.Y(F.y + 1), 10 * RES * k, 4 * RES * k, P[3], 0.5); } draw(B, t, false); },
    front(B, L, t) { draw(B, t, true); },
    end: 1.4,
  };
});
FS.tinh_ult = SC((c, at, R, P, o) => {   /* Mưa Kim Cương: kim cương khổng lồ hạ từ trời xuống đối thủ, vỡ toả 8 tia cầu vồng trên đất, mưa kim cương nhỏ */
  const C = o.C, A = { x: c.ax, y: c.ay }, TD0 = 0.42, TD1 = 0.92, FIN = 1.34;
  const zd = t => lerp(96, 40, outCubic(tm(t, TD0, TD1)));
  const minis = Array.from({ length: 10 }, (_, i) => ({ x: A.x + R.range(-40, 40), y: A.y + R.range(-12, 12), t1: 0.98 + i * 0.04 + R.range(0, 0.03), i }));
  const rays = (B, L, t, fr) => { const k = tm(t, TD1, TD1 + 0.22), fd = 1 - tm(t, FIN + 0.1, FIN + 0.4); if (k <= 0 || fd <= 0) return; for (let i = 0; i < 8; i++) { const a = i / 8 * TAU + 0.2, sn = Math.sin(a); if ((sn >= 0) !== fr) continue; const r = 52 * outCubic(k), col = RAIN[i % 4]; beam(B, c.X(A.x + Math.cos(a) * 6), c.Y(A.y + 1 + sn * 2.7), c.X(A.x + Math.cos(a) * r), c.Y(A.y + 1 + sn * r * 0.45), 3, 0.8, [H('#ffffff'), col, col, scaleC(col, 0.7)], { a: fd > 0.5 ? 1 : 0.5 }); } };
  return {
    update(t) {
      if (t < 0.4) gather(c, C.x + 2, C.y, 10, [P[0], P[1], P[2], P[3]], 1.4, 16);
      if (t > TD0 && t < TD1 && R.chance(0.6)) star(c, A.x + R.range(-12, 12), A.y - 1, zd(t) + R.range(-10, 6), R.pick([P[0], P[1], ...RAIN]), R.range(1, 2), 0.3);
      at('imp', t, TD1, () => { o.hit?.(1.2); o.shake?.(0.4); o.flash?.(0.12, '255,235,255'); for (let k = 0; k < 22; k++) { const a = R.range(0, TAU), v = R.range(50, 120); part(c, K.CHUNK, A.x + Math.cos(a) * 6, A.y - 1, 22 + Math.sin(a) * 10, Math.cos(a) * v, Math.sin(a) * v * 0.4, R.range(30, 100), R.range(0.5, 0.75), P[2], R.range(1.2, 2.4), { g: 1, bounce: 0.35, drag: 0.4, va: R.range(-12, 12), qf: 1 }); } for (let k = 0; k < 8; k++) star(c, A.x + R.range(-14, 14), A.y + 0.6, R.range(6, 34), R.pick([P[0], ...RAIN]), R.range(1.6, 2.8), 0.4); addLight(c, A.x, A.y - 18, 24, P[1], 0.4, 0.14); });
      for (const m of minis) at('m' + m.i, t, m.t1, () => { if (m.i % 3 === 0) o.hit?.(0.4); for (let k = 0; k < 3; k++) part(c, K.CHUNK, m.x, m.y, 2, R.range(-40, 40), R.range(-12, 12), R.range(30, 60), 0.4, P[2], 1, { g: 1, bounce: 0.3, drag: 0.4, va: 8, qf: 1 }); star(c, m.x, m.y + 0.6, 3, R.pick(RAIN), 2, 0.25); });
      at('fin', t, FIN, () => { o.hit?.(1.6); o.knock?.(); o.shake?.(0.35); for (let k = 0; k < 10; k++) star(c, A.x + R.range(-20, 20), A.y + 0.6, R.range(4, 30), R.pick([P[0], ...RAIN]), R.range(1.6, 2.6), 0.45); });
    },
    back(B, L, t) { if (t > TD0 && t < TD1) { const k = tm(t, TD0, TD1); ditherOval(B, c.X(A.x), c.Y(A.y + 1), (6 + 12 * k) * RES, (2.5 + 4.5 * k) * RES, P[7], 1.2); } rays(B, L, t, false);
      for (const m of minis) { const u = tm(t, m.t1 - 0.22, m.t1); if (u > 0 && u < 1 && m.y < A.y) gemRh(B, P, c.X(m.x), c.Y(m.y, 70 * (1 - u)), 3, 5, 0); } },
    front(B, L, t) { rays(B, L, t, true); if (t > TD0 && t < TD1 + 0.05) { const X = c.X(A.x), Y = c.Y(A.y, zd(t) + 10); gemBig(B, P, X, Y, 15 * RES, 26 * RES, t > TD1 - 0.04); L.glow(X, Y, 30, P[1], 0.2); }
      for (const m of minis) { const u = tm(t, m.t1 - 0.22, m.t1); if (u > 0 && u < 1 && m.y >= A.y) gemRh(B, P, c.X(m.x), c.Y(m.y, 70 * (1 - u)), 3, 5, 0); } },
    end: 2.2,
  };
});

/* ===================== MÃ ===================== */
/* khối lập phương số (điểm đệm): mặt trước lưới, mặt trên sáng, viền tối; đáy (X, Yb), cạnh s, cao h */
function cube(B, P, X, Yb, s, h, a = 1, hot = false) {
  const d = Math.round(s * 0.5), x0 = Math.round(X - s / 2);
  for (let y = 0; y < h; y++) for (let x = 0; x < s; x++) { const edge = x === 0 || x === s - 1 || y === 0 || y === h - 1; B.dot(x0 + x, Yb - y, edge ? P[7] : hot ? P[1] : (x % 6 === 3 || y % 6 === 3) ? P[3] : y > h - 3 ? P[4] : P[5], a); }
  for (let y = 0; y < d; y++) for (let x = 0; x < s; x++) { const edge = x === 0 || x === s - 1 || y === d - 1; B.dot(x0 + x, Yb - h - y, edge ? P[7] : y === 0 ? P[1] : hot ? P[0] : P[2], a); }
}
function glitchBars(B, R, X, Y, w, h, n, P, a = 1) { for (let i = 0; i < n; i++) { const yy = Y - R.range(0, h), xx = X + R.range(-w / 2, w / 4), l = R.range(w * 0.3, w * 0.8), col = R.pick([P[0], P[1], P[2], PINK]); for (let x = 0; x < l; x++) { B.dot(xx + x, yy, col, a); if (i % 2) B.dot(xx + x, yy + 1, P[5], a); } } }
function bits(c, x, y, z, n, sp = 60, life = 0.5) { const R = c.R, P = c.P; for (let i = 0; i < n; i++) { const a = R.range(0, TAU), v = R.range(0.3, 1) * sp; fx(c, x, y, z, Math.cos(a) * v, Math.sin(a) * v * 0.5, R.range(20, 70), R.range(life * 0.7, life), dBit, { g: 1, bounce: 0.3, drag: 0.5, col: R.pick([P[1], P[2], P[3]]), c2: P[0], size: R.chance(0.3) ? 1.6 : 1.1, qf: 1 }); } }
FS.ma_sk1 = SC((c, at, R, P, o) => {   /* Dịch Chuyển Lỗi: thân vỡ thành khối pixel + vạch nhiễu, biến mất rồi ráp lại sau lưng đối thủ */
  const C = o.C, F = { x: c.ax, y: c.ay }, T0 = 0.32, X2 = F.x + 20;
  return {
    update(t) {
      if (t > 0.06 && t < T0) gather(c, C.x, C.y, 8, [P[0], P[1], P[2], P[3]], 1.2, 12);
      at('out', t, T0, () => { o.shake?.(0.1); bits(c, C.x, C.y + 0.6, 8, 16, 50); });
      at('warp', t, T0 + 0.08, () => o.warp?.(X2, 1.0));
      if (t > T0 - 0.06 && t < T0 + 0.08) for (let i = 0; i < 3; i++) { const a = R.range(0, TAU), r = R.range(10, 16); fx(c, X2 + Math.cos(a) * r, C.y + 0.6, 8 + Math.sin(a) * r, -Math.cos(a) * r / 0.14, 0, -Math.sin(a) * r / 0.14, 0.14, dBit, { col: R.pick([P[1], P[2]]), c2: P[0], size: 1.1, qf: 1 }); }
      at('in', t, T0 + 0.1, () => { bits(c, X2, C.y + 0.6, 8, 8, 30, 0.35); addLight(c, X2, C.y - 8, 10, P[1], 0.3, 0.1); });
    },
    front(B, L, t) { if (t > T0 - 0.04 && t < T0 + 0.1) glitchBars(B, R, c.X(C.x), c.Y(C.y, 0), 30, 34, 6, P); if (t > T0 + 0.06 && t < T0 + 0.22) glitchBars(B, R, c.X(X2), c.Y(C.y, 0), 30, 34, 5, P, t > T0 + 0.16 ? 0.5 : 1); },
    end: 1.0,
  };
});
FS.ma_sk2 = SC((c, at, R, P, o) => {   /* Nhiễu Sóng: gói dữ liệu 3x3 khối giật nhiễu bay tới, rơi số 0/1, trúng thì vỡ khối + vạch nhiễu trên thân */
  const M = o.M, F = { x: c.ax, y: c.ay }, S = shot({ x: M.x + 3, y: M.y + 0.5, z: M.z }, { x: F.x - 3, y: F.y + 0.5, z: 9 }, 0.3, 200);
  return {
    update(t) {
      if (t > 0.06 && t < 0.3) gather(c, M.x + 3, M.y, M.z, [P[0], P[1], P[2]], 1.2, 10);
      const p = S.pos(t); if (p && R.chance(0.5)) fx(c, p.x - 4, p.y, p.z, R.range(-30, -10), 0, R.range(-10, 10), 0.35, dG2, { gl: R.chance(0.5) ? 0 : 1, col: P[1], c2: P[7], drag: 2, S: 1 });
      at('hit', t, S.t1, () => { o.hit?.(1); bits(c, F.x - 3, F.y + 0.6, 9, 14, 80); });
    },
    front(B, L, t) { const p = S.pos(t); if (p) { const X = c.X(p.x), Y = c.Y(p.y, p.z); for (const [gx, a] of [[-26, 0.5], [-13, 0.5]]) for (let i = 0; i < 9; i += 2) cube(B, P, X + gx + (i % 3 - 1) * 10, Y + (Math.floor(i / 3) - 1) * 10 + 4, 10, 6, a); for (let i = 0; i < 9; i++) { const jx = R.chance(0.25) ? R.int(-3, 3) : 0; cube(B, P, X + (i % 3 - 1) * 10 + jx, Y + (Math.floor(i / 3) - 1) * 10 + 4, 10, 6, 1, i === 4); } L.glow(X, Y, 14, P[1], 0.2); }
      if (t > S.t1 && t < S.t1 + 0.2) glitchBars(B, R, c.X(F.x), c.Y(F.y, 0), 34, 36, 5, P, t > S.t1 + 0.12 ? 0.5 : 1); },
    end: 1.2,
  };
});
FS.ma_sk3 = SC((c, at, R, P, o) => {   /* Tường Lửa: hàng khối số trồi lần lượt thành bức tường sau lưng đối thủ, vạch quét chạy lên, bit bốc như lửa, rồi sụp */
  const F = { x: c.ax, y: c.ay }, T0 = 0.32, DN = 1.12, cubes = Array.from({ length: 7 }, (_, i) => ({ x: F.x - 27 + i * 9, at: T0 + i * 0.035, h: 12 + (i % 2) * 4 }));
  const wall = (B, t) => { if (t < T0 || t > DN + 0.12) return; const sk = tm(t, DN, DN + 0.12); for (const q of cubes) { if (t < q.at) continue; const g = outBack(tm(t, q.at, q.at + 0.1), 2) * (1 - sk); if (g < 0.05) continue; cube(B, P, c.X(q.x), c.Y(F.y - 6), 9 * RES, Math.round(q.h * g * RES), 1, t < q.at + 0.03); }
    if (t > T0 + 0.3 && t < DN) { const s = ((t - T0) * 2.5) % 1, Y = c.Y(F.y - 6, 20 * s); for (let x = c.X(F.x - 32); x < c.X(F.x + 32); x++) { B.set(x, Y - 1, P[0]); B.set(x, Y, P[0]); B.set(x, Y + 1, P[1]); B.set(x, Y + 2, P[1]); } } };
  return {
    update(t) {
      if (t > 0.06 && t < T0) gather(c, o.C.x + 4, o.C.y, 8, [P[0], P[1], P[2]], 1, 12);
      at('h', t, T0 + 0.3, () => { o.hit?.(0.9); o.shake?.(0.15); });
      if (t > T0 + 0.25 && t < DN && R.chance(0.8)) { const q = R.pick(cubes); fx(c, q.x + R.range(-3, 3), F.y - 6, q.h + 6, 0, 0, R.range(20, 40), 0.4, dBit, { col: R.pick([P[1], P[2]]), c2: P[0], size: 1, drag: 1 }); }
      at('dn', t, DN, () => { for (const q of cubes) bits(c, q.x, F.y - 6, 6, 4, 50, 0.45); });
    },
    back(B, L, t) { wall(B, t); },
    end: 1.4,
  };
});
FS.ma_sk4 = SC((c, at, R, P, o) => {   /* Mã Hoá (Ngắt Kết Nối): khối khoá bay tới, ổ khoá pixel hiện trên đầu đối thủ, càng khoá sập xuống, vòng bit quay quanh chân */
  const M = o.M, F = { x: c.ax, y: c.ay }, S = shot({ x: M.x + 3, y: M.y + 0.5, z: M.z }, { x: F.x - 2, y: F.y + 0.5, z: 9 }, 0.3, 220), LK = S.t1 + 0.18, OFF = 1.25;
  const lock = (B, X, Y, k, shut) => { const w = 14, h = 11, sy = shut ? 0 : 4; for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const e = x === 0 || y === 0 || x === w - 1 || y === h - 1; B.set(X - w / 2 + x, Y + y, e ? P[7] : y < 2 ? P[1] : x < 3 ? P[2] : P[3]); }
    disc(B, X, Y + 4, 1.6, P[7]); B.set(X, Y + 6, P[7]); B.set(X, Y + 7, P[7]);
    for (let a = Math.PI; a <= TAU; a += 0.06) for (const rr of [4, 5, 6]) B.set(X + Math.cos(a) * rr, Y - sy + Math.sin(a) * 7 * (rr / 6), rr === 6 ? P[7] : rr === 5 ? P[1] : P[2]);
    for (const dx of [-6, 6]) for (let y = -sy; y < 1; y++) { B.set(X + dx, Y + y, P[7]); B.set(X + dx + (dx < 0 ? 1 : -1), Y + y, P[2]); } };
  const ring = (B, t, fr) => { if (t < LK || t > OFF) return; for (let i = 0; i < 8; i++) { const a = i / 8 * TAU + t * 4, sn = Math.sin(a); if ((sn >= 0) !== fr) continue; cube(B, P, c.X(F.x + Math.cos(a) * 13), c.Y(F.y + sn * 5.5, 1), 4, 4, t > OFF - 0.12 ? 0.5 : 1); } };
  return {
    update(t) {
      if (t > 0.06 && t < 0.3) gather(c, M.x + 3, M.y, M.z, [P[0], P[1], P[2]], 1.2, 10);
      at('hit', t, S.t1, () => { o.hit?.(0.6); bits(c, F.x - 2, F.y + 0.6, 9, 8, 50); });
      at('lk', t, LK, () => { o.shake?.(0.15); star(c, F.x, F.y + 0.6, 30, P[0], 2.4, 0.18); addLight(c, F.x, F.y - 30, 10, P[1], 0.3, 0.1); });
      at('off', t, OFF, () => bits(c, F.x, F.y + 0.6, 30, 10, 50, 0.4));
    },
    back(B, L, t) { ring(B, t, false); },
    front(B, L, t) { const p = S.pos(t); if (p) cube(B, P, c.X(p.x), c.Y(p.y, p.z) + 5, 10, 8, 1, true); if (t > S.t1 && t < OFF) lock(B, c.X(F.x), c.Y(F.y, 34) - (t < S.t1 + 0.1 ? 8 * (1 - tm(t, S.t1, S.t1 + 0.1)) : 0), 1, t >= LK); ring(B, t, true); },
    end: 1.45,
  };
});
FS.ma_ult = SC((c, at, R, P, o) => {   /* Sập Hệ Thống: lưới số lan trên sàn, mưa số 0/1, khối lập phương rơi chất thành lồng (sau 2 tầng, trước 1 tầng), nhiễu cắt lát rồi sụp thành điểm ảnh */
  const C = o.C, A = { x: c.ax, y: c.ay }, FIN = 1.36;
  const cg = Array.from({ length: 8 }, (_, i) => { const a = -Math.PI / 2 + (i + 0.5) / 8 * TAU, ca = Math.cos(a), sa = Math.sin(a), back = sa < 0.2; return { x: A.x + ca * 31, y: A.y + sa * 12, n: back ? 2 : 1, at: 0.7 + i * 0.035, s: back ? 10 : 7, i }; }).sort((p, q) => p.y - q.y);
  const grid = (B, t) => { const k = outCubic(tm(t, 0.42, 0.7)) * (1 - tm(t, 1.75, 2.05)); if (k <= 0) return; const rx = 46 * k, ry = 19 * k, a = k > 0.5 ? 1 : 0.5;
    for (let gx = -48; gx <= 48; gx += 8) for (let gy = -20; gy <= 20; gy += 0.5) { const d = (gx * gx) / (rx * rx) + (gy * gy) / (ry * ry); if (d > 1) continue; B.dot(c.X(A.x + gx), c.Y(A.y + gy), d > 0.8 ? P[0] : P[3], a); B.dot(c.X(A.x + gx) + 1, c.Y(A.y + gy), P[4], a); }
    for (let gy = -20; gy <= 20; gy += 4) for (let gx = -48; gx <= 48; gx += 0.5) { const d = (gx * gx) / (rx * rx) + (gy * gy) / (ry * ry); if (d > 1) continue; B.dot(c.X(A.x + gx), c.Y(A.y + gy), d > 0.8 ? P[0] : P[3], a); B.dot(c.X(A.x + gx), c.Y(A.y + gy) + 1, P[4], a); } };
  const cage = (B, t, back) => { if (t > FIN) return; for (const q of cg) { if ((q.y < A.y) !== back || t < q.at) continue; for (let j = 0; j < q.n; j++) { const fall = tm(t, q.at + j * 0.06, q.at + j * 0.06 + 0.14), z = (1 - fall) * 40 + j * q.s * 0.9; if (fall <= 0) continue; cube(B, P, c.X(q.x), c.Y(q.y, z), q.s * RES, Math.round(q.s * 0.9 * RES), 1, fall < 1 && fall > 0.85 || t > FIN - 0.05); } } };
  return {
    update(t) {
      if (t < 0.4) gather(c, C.x + 2, C.y, 10, [P[0], P[1], P[2], P[3]], 1.5, 16);
      at('g', t, 0.42, () => { o.hit?.(0.5); o.shake?.(0.15); });
      if (t > 0.5 && t < 1.25) for (let q = 0; q < 2; q++) fx(c, A.x + R.range(-44, 44), A.y + R.range(-16, 16), R.range(50, 70), 0, 0, -R.range(120, 170), 0.6, dG2, { gl: R.chance(0.5) ? 0 : 1, col: R.chance(0.3) ? P[0] : P[1], c2: P[7], S: 1, onLand: (cc, p) => { p.life = 0; } });
      for (const q of cg) at('c' + q.i, t, q.at + 0.14, () => { o.shake?.(0.06); bits(c, q.x, q.y + 0.3, 1, 3, 40, 0.35); });
      at('t2', t, 1.0, () => o.hit?.(0.6));
      at('fin', t, FIN, () => { o.hit?.(1.7); o.shake?.(0.5); o.flash?.(0.12, '200,255,230'); o.knock?.(); for (const q of cg) bits(c, q.x, q.y + 0.3, 8, 10, 70, 0.6); addLight(c, A.x, A.y - 12, 22, P[1], 0.4, 0.14); });
    },
    back(B, L, t) { grid(B, t); cage(B, t, true); },
    front(B, L, t) { cage(B, t, false); if (t > 1.16 && t < FIN + 0.04) glitchBars(B, R, c.X(A.x), c.Y(A.y, 0), 50, 40, 3, P, 0.5); },
    end: 2.2,
  };
});

/* ===================== ÂM ===================== */
function note(c, x, y, z, P, vx = 0) { const R = c.R; fx(c, x, y, z, vx + R.range(-15, 15), 0, R.range(18, 32), R.range(0.5, 0.7), dGlyph, { drag: 1.2, gl: R.chance(0.5) ? 'note' : 'note2', col: R.chance(0.5) ? P[1] : P[2], c2: P[0], qf: 1 }); }
FS.am_sk1 = SC((c, at, R, P, o) => {   /* Sóng Âm: 4 vòng cung âm thanh nở to dần bay từ miệng tới đối thủ, mỗi vòng nổ khi chạm */
  const M = o.M, F = { x: c.ax, y: c.ay }, W = [0, 1, 2, 3].map(i => ({ S: shot({ x: M.x + 3, y: M.y + 0.5, z: M.z }, { x: F.x - 5, y: F.y + 0.5, z: 9 }, 0.3 + i * 0.08, 210), i }));
  return {
    update(t) {
      if (t > 0.06 && t < 0.3) gather(c, M.x + 2, M.y, M.z, [P[0], P[1], P[2], P[3]], 1.2, 10);
      for (const w of W) at('h' + w.i, t, w.S.t1, () => { o.hit?.(w.i === 0 ? 1 : 0.4); if (w.i % 2 === 0) note(c, F.x, F.y + 0.6, 18, P); sparks(c, 5, F.x - 5, F.y + 0.5, 9, 60, { up: 0.5, g: 0.3, ramp: [P[0], P[1], P[2], P[4]] }); });
    },
    front(B, L, t) { for (const w of W) { const p = w.S.pos(t); if (p) crescent(B, c.X(p.x), c.Y(p.y, p.z), 8 + 10 * p.u, 0, 3, [P[0], P[1], P[3]], 1, 0.9); const k = tm(t, w.S.t1, w.S.t1 + 0.14); if (k > 0 && k < 1) ellipseT(B, c.X(F.x - 4), c.Y(F.y, 9), (4 + 8 * k) * RES, (8 + 12 * k) * RES, P[1], k < 0.6 ? 1 : 0.5); } },
    end: 1.2,
  };
});
FS.am_sk2 = SC((c, at, R, P, o) => {   /* Đập Âm: lao tới đập, vòng cộng hưởng dựng đứng rung quanh thân đối thủ + vòng sóng trên đất, nốt nhạc văng */
  const C = o.C, F = { x: c.ax, y: c.ay }, TS = 0.44;
  const rings = (B, t, fr) => { for (let i = 0; i < 3; i++) { const k = tm(t, TS + i * 0.08, TS + i * 0.08 + 0.3); if (k <= 0 || k >= 1) continue; const X = c.X(F.x), Y = c.Y(F.y, 10), rx = (5 + 14 * k) * RES, ry = (10 + 12 * k) * RES, n = Math.ceil((rx + ry) * 3);
      for (let j = 0; j < n; j++) { const a = j / n * TAU, cs = Math.cos(a); if ((cs > 0) !== fr) continue; const xx = X + cs * rx * 0.45, yy = Y + Math.sin(a) * ry, aa = k < 0.6 ? 1 : 0.5; B.dot(xx, yy, i === 0 ? P[0] : P[1], aa); B.dot(xx + cs, yy, i === 0 ? P[0] : P[1], aa); B.dot(xx + 2 * cs, yy, P[3], aa); B.dot(xx + 3 * cs, yy, P[4], aa); } } };
  return {
    update(t) {
      at('go', t, 0.22, () => o.dash?.(F.x - 26, 0.2, true));
      at('hit', t, TS, () => { o.hit?.(1.1); o.shake?.(0.3); for (let i = 0; i < 4; i++) note(c, F.x + R.range(-6, 6), F.y + 0.6, R.range(10, 22), P, R.range(-30, 30)); sparks(c, 10, F.x, F.y + 0.5, 10, 90, { up: 0.6, g: 0.3, ramp: [P[0], P[1], P[2], P[4]] }); });
    },
    back(B, L, t) { rings(B, t, false); const k = tm(t, TS, TS + 0.35); if (k > 0 && k < 1) gring(B, c, F.x, F.y + 1, 0, 6 + 28 * outCubic(k), 1.5, [P[1], P[3]], k < 0.6 ? 1 : 0.5, 0); },
    front(B, L, t) { rings(B, t, true); },
    end: 1.3,
  };
});
FS.am_sk3 = SC((c, at, R, P, o) => {   /* Gào Quạt (Hú Vang): tiếng gào toả hình quạt từ miệng — vòng cung rộng dần nối tiếp, mũi tên giảm chỉ số rơi trên đầu đối thủ */
  const M = o.M, F = { x: c.ax, y: c.ay }, T0 = 0.3, T1 = 0.82, waves = []; for (let s = T0; s < T1; s += 0.07) waves.push(s);
  return {
    update(t) {
      if (t > 0.06 && t < T0) gather(c, M.x + 2, M.y, M.z, [P[0], P[1], P[2]], 1.2, 10);
      at('dbf', t, 0.62, () => { o.hit?.(0.3); for (let i = 0; i < 3; i++) fx(c, F.x - 6 + i * 6, F.y + 0.6, 30 + i * 2, 0, 0, -16, 0.6, dG2, { gl: 'dn', col: H('#ff7a7a'), c2: H('#4a1020') }); });
      if (t > T0 && t < T1 && R.chance(0.3)) note(c, M.x + 6, M.y + 0.6, M.z, P, 50);
    },
    front(B, L, t) { for (const s of waves) { const k = tm(t, s, s + 0.4); if (k <= 0 || k >= 1) continue; const d = 6 + (F.x - M.x) * k * 1.05; crescent(B, c.X(M.x + d * 0.4), c.Y(M.y, M.z), d * RES * 0.65, 0, 2.5, [P[0], P[1], P[3]], k < 0.65 ? 1 : 0.5, 0.75); } },
    end: 1.3,
  };
});
FS.am_sk4 = SC((c, at, R, P, o) => {   /* Tiếng Vọng: vòng tiếng vọng lan từ thân lặp 3 lần nhỏ dần, nốt nhạc bay lên quanh thân */
  const C = o.C, PS = [0.32, 0.56, 0.8];
  const rings = (B, t, half) => { PS.forEach((p0, i) => { const k = tm(t, p0, p0 + 0.42); if (k > 0 && k < 1) { gring(B, c, C.x, C.y + 1, 0, 6 + (34 - i * 7) * outCubic(k), 1.6, [P[0], P[2]], k < 0.6 ? 1 : 0.5, half); gring(B, c, C.x, C.y + 1, 0, 3 + (24 - i * 5) * outCubic(k), 1, [P[3]], 0.5, half); } }); };
  return {
    update(t) { if (t > 0.06 && t < 0.3) gather(c, C.x + 2, C.y, 8, [P[0], P[1], P[2]], 1, 12); for (const p0 of PS) at('p' + p0, t, p0, () => { note(c, C.x + R.range(-8, 8), C.y + 0.6, R.range(10, 20), P); o.shake?.(0.05); }); },
    back(B, L, t) { rings(B, t, -1); },
    front(B, L, t) { rings(B, t, 1); },
    end: 1.35,
  };
});
function tower(B, P, X, Yb, w, h, pump, a = 1) { const hq = Math.round(h), pq = Math.round(pump * 4) / 4; stamp(B, 'tw|' + P[0] + '|' + w + '|' + hq + '|' + pq + '|' + a, X, Yb, sb => towerRaw(sb, P, 0, 0, w, hq, pq, a)); }
function towerRaw(B, P, X, Yb, w, h, pump, a = 1) {
  const x0 = Math.round(X - w / 2);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const e = x === 0 || x === w - 1 || y === h - 1; B.dot(x0 + x, Yb - y, e ? P[7] : x < 2 ? P[4] : x > w - 3 ? P[6] : P[5], a); }
  for (let x = 0; x < w; x++) { B.dot(x0 + x, Yb - h, P[7], a); B.dot(x0 + x, Yb - h + 1, P[2], a); B.dot(x0 + x, Yb - h + 2, P[3], a); }
  const n = h > w * 1.6 ? 2 : 1; for (let i = 0; i < n; i++) { const cy = Yb - h * (n === 2 ? (i ? 0.72 : 0.32) : 0.5), r = w * 0.34 * (1 + pump * 0.25); disc(B, X, cy, r + 1, P[7], a); disc(B, X, cy, r, P[1], a); disc(B, X, cy, r * 0.62, P[6], a); disc(B, X, cy, r * 0.25, P[2], a); }
}
FS.am_ult = SC((c, at, R, P, o) => {   /* Dàn Loa Tận Thế: 5 tháp loa trồi vòng quanh (sau cao, trước thấp), đập 3 nhịp, mỗi nhịp 1 vòng xung to dần, nốt nhạc bung */
  const C = o.C, A = { x: c.ax, y: c.ay }, BEATS = [0.86, 1.1, 1.36];
  const tw = Array.from({ length: 5 }, (_, i) => { const a = -Math.PI / 2 + i / 5 * TAU, ca = Math.cos(a), sa = Math.sin(a), back = sa < 0.3; return { x: A.x + ca * 36, y: A.y + sa * 14, back, w: back ? 12 : 10, h: back ? 26 : 12, at: 0.44 + i * 0.05, i }; }).sort((p, q) => p.y - q.y);
  const pumpAt = t => { let p = 0; for (const b of BEATS) { const k = (t - b) / 0.16; if (k >= 0 && k < 1) p = Math.max(p, 1 - k); } return p; };
  const drawT = (B, t, back) => { for (const q of tw) { if (q.back !== back || t < q.at) continue; const g = outBack(tm(t, q.at, q.at + 0.14), 2) * (1 - tm(t, 1.75, 2.0)); if (g < 0.05) continue; tower(B, P, c.X(q.x), c.Y(q.y), q.w * RES, Math.round(q.h * g * RES), pumpAt(t)); } };
  const pulse = (B, t, half) => BEATS.forEach((b, i) => { const k = tm(t, b, b + 0.34); if (k > 0 && k < 1) { const r = 8 + (32 + i * 14) * outCubic(k); gring(B, c, A.x, A.y + 1, 0, r, 2.4 - i * 0 + i * 0.6, [P[0], P[1], P[3]], k < 0.65 ? 1 : 0.5, half); gring(B, c, A.x, A.y + 1, 0, r * 0.78, 1, [P[2]], 0.5, half); } });
  return {
    update(t) {
      if (t < 0.4) { gather(c, C.x + 2, C.y, 10, [P[0], P[1], P[2], P[3]], 1.4, 16); if (R.chance(0.2)) note(c, C.x, C.y + 0.6, 14, P); }
      for (const q of tw) at('t' + q.i, t, q.at, () => { o.shake?.(0.08); puff(c, q.x, q.y + 1, DIRTC[1], 2.6, 0.35, 6); for (let k = 0; k < 3; k++) pebbleHop(c, q.x + R.range(-4, 4), q.y + 1, 0.8, DIRTC); });
      BEATS.forEach((b, i) => at('b' + i, t, b, () => { o.shake?.(0.15 + i * 0.12); if (i < 2) o.hit?.(0.6); else { o.hit?.(1.7); o.flash?.(0.1, '235,215,255'); o.knock?.(); } for (const q of tw) note(c, q.x, q.y + 0.6, q.h + 4, P, R.range(-20, 20)); addLight(c, A.x, A.y - 8, 14 + i * 6, P[1], 0.3, 0.1); }));
    },
    back(B, L, t) { pulse(B, t, -1); drawT(B, t, true); },
    front(B, L, t) { drawT(B, t, false); pulse(B, t, 1); },
    end: 2.2,
  };
});

/* ===================== ẢNH ===================== */
const SHADE = P => [P[3], P[5], P[6], P[7], P[7]];
const EYE = ['#ff4040', '#ffb0a0', '#5a0a10'].map(H), TOOTH = ['#fbf6ff', '#c9b6e6', '#e8ddf7'].map(H);
function pool(B, c, x, y, rx, ry, P, k = 1) { if (k <= 0) return; ditherOval(B, c.X(x), c.Y(y), rx * RES * k, ry * RES * k, P[7], 1.7); ellipseT(B, c.X(x), c.Y(y), rx * RES * k, ry * RES * k, P[4], 1, P[5]); ellipse(B, c.X(x), c.Y(y) - 1, rx * RES * k * 0.9, ry * RES * k * 0.85, P[2], 0.5, -1); }
function darkPool(B, c, x, y, rx, ry, P, t) { if (rx < 1) return; const rq = Math.round(rx), yq = Math.round(ry); stamp(B, 'dp|' + P[0] + '|' + rq + '|' + yq, c.X(x), c.Y(y), sb => darkPoolRaw(sb, rq * RES, yq * RES, P)); }
function darkPoolRaw(B, RX, RY, P) {
  for (let yy = Math.floor(-RY * 1.25); yy <= Math.ceil(RY * 1.25); yy++) for (let xx = Math.floor(-RX * 1.25); xx <= Math.ceil(RX * 1.25); xx++) { const dx = (xx + 0.5) / RX, dy = (yy + 0.5) / RY, d = Math.sqrt(dx * dx + dy * dy), th = Math.atan2(dy, dx), rr = 1 + 0.13 * Math.sin(th * 5 + 1) + 0.08 * Math.sin(th * 11 - 2); if (d > rr) continue; B.set(xx, yy, d > rr - 4 / RX ? P[3] : d > rr - 9 / RX ? P[5] : (hash2(xx >> 2, yy >> 1, 7) < 0.04 ? P[6] : P[7])); } }
function wisp(c, x, y, z, P) { const R = c.R; fx(c, x, y, z, R.range(-8, 8), 0, R.range(14, 28), R.range(0.4, 0.6), dSpark, { size: 2, sway: 8, ramp: [P[1], P[2], P[4], P[5]] }); }
FS.anh_sk1 = SC((c, at, R, P, o) => {   /* Hàm Bóng: vũng bóng loang dưới chân đối thủ, 2 hàm răng bóng trồi hai bên đớp 2 lần rồi chìm */
  const F = { x: c.ax, y: c.ay }, T0 = 0.3, BITES = [0.5, 0.8], END = 1.15;
  const gap = t => { let g = 15; for (const b of BITES) { const k = (t - (b - 0.1)) / 0.2; if (k > 0 && k < 1) g = Math.min(g, 15 - 9 * Math.sin(Math.PI * k)); } return g; };
  const jaw = (B, t, side) => { if (t < T0 + 0.08 || t > END) return; const rise = outBack(tm(t, T0 + 0.08, T0 + 0.2), 1.6) * (1 - tm(t, END - 0.12, END)); if (rise < 0.05) return; const X = c.X(F.x + side * gap(t)), Y = c.Y(F.y, 10 * rise), r = 12 * RES * rise, ang = side < 0 ? Math.PI : 0;
    crescent(B, X, Y, r + 1, ang, 10, [P[7], P[7], P[7]], 1, 1.25); crescent(B, X, Y, r, ang, 9, [P[2], P[5], P[6]], 1, 1.2);
    for (let s = -0.84; s <= 0.85; s += 0.42) { const bx = X + Math.cos(ang + s) * (r - 8), by = Y + Math.sin(ang + s) * (r - 8), ux = -Math.cos(ang + s), uy = -Math.sin(ang + s), vx = -uy, vy = ux, TL = 9 * rise, TW = 3.5;
      for (let q = -1; q <= TL + 1; q += 0.5) { const w = TW * (1 - q / TL) + 1; for (let e = -w; e <= w; e += 0.5) { const inT = q >= 0 && q <= TL && Math.abs(e) <= TW * (1 - q / TL); B.set(bx + ux * q + vx * e, by + uy * q + vy * e, inT ? (e < -0.3 * TW * (1 - q / TL) ? TOOTH[0] : q > TL * 0.6 ? TOOTH[1] : TOOTH[0]) : P[7]); } }
      for (let q = 0; q <= TL; q += 0.5) { const w = TW * (1 - q / TL); for (let e = -w; e <= w; e += 0.5) B.set(bx + ux * q + vx * e, by + uy * q + vy * e, e < -0.3 * w ? TOOTH[0] : q > TL * 0.6 ? TOOTH[1] : TOOTH[2]); } }
    B.set(X + Math.cos(ang - 0.6) * (r - 3), Y + Math.sin(ang - 0.6) * (r - 3), EYE[0]); B.set(X + Math.cos(ang - 0.6) * (r - 3) + 1, Y + Math.sin(ang - 0.6) * (r - 3), EYE[0]); };
  return {
    update(t) {
      if (t > 0.06 && t < T0) gather(c, o.C.x + 4, o.C.y, 8, [P[0], P[1], P[2], P[4]], 1, 12);
      for (const b of BITES) at('b' + b, t, b, () => { o.hit?.(0.9); sparks(c, 8, F.x, F.y + 0.5, 10, 80, { up: 0.6, g: 0.3, ramp: [P[0], P[1], P[2], P[4]] }); });
      if (t > T0 && t < END && R.chance(0.4)) wisp(c, F.x + R.range(-14, 14), F.y + 0.6, 1, P);
    },
    back(B, L, t) { const k = outCubic(tm(t, T0, T0 + 0.14)) * (1 - tm(t, END, END + 0.15)); pool(B, c, F.x, F.y + 1, 18, 6, P, k); jaw(B, t, -1); },
    front(B, L, t) { jaw(B, t, 1); },
    end: 1.38,
  };
});
FS.anh_sk2 = SC((c, at, R, P, o) => {   /* Cầu Bóng: cầu đen lõi tối viền tím kéo khói bóng, vỡ toé bụi tím */
  const M = o.M, F = { x: c.ax, y: c.ay }, S = shot({ x: M.x + 3, y: M.y + 0.5, z: M.z }, { x: F.x - 3, y: F.y + 0.5, z: 9 }, 0.3, 190);
  return {
    update(t) {
      if (t > 0.06 && t < 0.3) gather(c, M.x + 3, M.y, M.z, [P[0], P[1], P[2], P[4]], 1.2, 10);
      const p = S.pos(t); if (p) { puff(c, p.x - 3, p.y, R.pick([P[5], P[6]]), 2.4, 0.3, 4, { z: p.z + R.range(-2, 2), vx: -20 }); if (R.chance(0.5)) wisp(c, p.x, p.y, p.z, P); }
      at('hit', t, S.t1, () => { o.hit?.(1.1); sparks(c, 14, F.x - 3, F.y + 0.5, 9, 90, { up: 0.6, g: 0.2, ramp: [P[0], P[1], P[2], P[4]], life: 1.3 }); for (let k = 0; k < 4; k++) puff(c, F.x - 3 + R.range(-5, 5), F.y - 1, R.pick([P[5], P[6]]), 3, 0.4, 12, { z: 9 }); });
    },
    front(B, L, t) { const p = S.pos(t); if (t > 0.06 && t < 0.32) orb(B, c.X(M.x + 3), c.Y(M.y, M.z), 1 + 4 * tm(t, 0.06, 0.3), [P[4], P[6], P[7]], P[1]); if (p) { const X = c.X(p.x), Y = c.Y(p.y, p.z); orb(B, X, Y, 8, [P[4], P[5], P[6], P[7]], P[1]); B.set(X - 3, Y - 3, P[0]); B.set(X - 2, Y - 3, P[1]); } },
    end: 1.3,
  };
});
FS.anh_sk3 = SC((c, at, R, P, o) => {   /* Lẩn Bóng: vũng bóng loang dưới chân, thú chìm vào bóng (đôi mắt còn le lói trong vũng), khói tím bốc, rồi trồi lên */
  const C = o.C, T0 = 0.3, IN = 0.5, OUT = 1.05;
  return {
    update(t) { if (t > 0.06 && t < T0) gather(c, C.x, C.y, 8, [P[0], P[1], P[2]], 1, 12); at('in', t, IN, () => { o.hide?.(OUT - IN); for (let k = 0; k < 6; k++) wisp(c, C.x + R.range(-8, 8), C.y + 0.6, R.range(0, 8), P); }); if (t > T0 && t < OUT + 0.1 && R.chance(0.5)) wisp(c, C.x + R.range(-12, 12), C.y + 0.6, 1, P); at('out', t, OUT, () => { for (let k = 0; k < 6; k++) wisp(c, C.x + R.range(-6, 6), C.y + 0.6, R.range(2, 12), P); }); },
    back(B, L, t) { const k = outCubic(tm(t, T0, T0 + 0.18)) * (1 - tm(t, OUT + 0.05, OUT + 0.25)); pool(B, c, C.x, C.y + 1, 16, 6, P, k); if (t > IN + 0.05 && t < OUT) { const bl = Math.floor(t * 6) % 5 !== 0; if (bl) for (const dx of [-3, 3]) { const X = c.X(C.x + dx), Y = c.Y(C.y + 0.5); B.set(X, Y, EYE[1]); B.set(X + 1, Y, EYE[0]); B.set(X, Y + 1, EYE[0]); B.set(X + 1, Y + 1, EYE[2]); } } },
    end: 1.4,
  };
});
FS.anh_sk4 = SC((c, at, R, P, o) => {   /* Mê Bóng (Đèn Mê): đèn ma tím lượn sóng bay tới, vòng xoắn thôi miên quanh đầu đối thủ, chữ z */
  const M = o.M, F = { x: c.ax, y: c.ay }, S = shot({ x: M.x + 3, y: M.y + 0.5, z: M.z }, { x: F.x - 2, y: F.y + 0.5, z: 14 }, 0.3, 150), END = 1.25;
  const posW = t => { const p = S.pos(t); return p && { ...p, z: p.z + Math.sin(p.u * TAU * 1.5) * 6 }; };
  const spiral = (B, t, fr) => { if (t < S.t1 || t > END) return; const a0 = t * 8, X = c.X(F.x), Y = c.Y(F.y, 24); for (let a = 0; a < TAU * 2; a += 0.08) { const r = (2 + a * 1.4) * RES * 0.6, an = a0 + a, sn = Math.sin(an); if ((sn >= 0) !== fr) continue; const cc = a > TAU * 1.6 ? P[0] : P[2], aa = t > END - 0.12 ? 0.5 : 1, xx = X + Math.cos(an) * r, yy = Y + sn * r * 0.4; B.dot(xx, yy, cc, aa); B.dot(xx + 1, yy, cc, aa); B.dot(xx, yy + 1, P[4], aa); B.dot(xx + 1, yy + 1, P[4], aa); } };
  return {
    update(t) {
      if (t > 0.06 && t < 0.3) gather(c, M.x + 3, M.y, M.z, [P[0], P[1], P[2]], 1, 10);
      const p = posW(t); if (p && R.chance(0.6)) wisp(c, p.x, p.y, p.z, P);
      at('hit', t, S.t1, () => { o.hit?.(0.3); sparks(c, 8, F.x - 2, F.y + 0.5, 14, 50, { up: 0.5, g: 0, drag: 2, ramp: [P[0], P[1], P[2]] }); });
      for (const z of [S.t1 + 0.2, S.t1 + 0.45]) at('z' + z, t, z, () => fx(c, F.x + 5, F.y + 0.6, 30, 10, 0, 14, 0.55, dG2, { gl: 'z', col: P[0], c2: P[7] }));
    },
    back(B, L, t) { spiral(B, t, false); },
    front(B, L, t) { const p = posW(t); if (p) { const X = c.X(p.x), Y = c.Y(p.y, p.z); orb(B, X, Y, 5, [P[0], P[1], P[2], P[3]], P[6]); for (let i = 0; i < 3; i++) { const a = t * 10 + i * TAU / 3; B.set(X + Math.cos(a) * 9, Y + Math.sin(a) * 5, P[0]); B.set(X + Math.cos(a) * 9 + 1, Y + Math.sin(a) * 5, P[1]); } L.glow(X, Y, 10, P[2], 0.25); } spiral(B, t, true); },
    end: 1.4,
  };
});
FS.anh_ult = SC((c, at, R, P, o) => {   /* Đêm Đen: bóng tối loang thành vực dưới đối thủ, mắt đỏ mở trong tối, 4 tay bóng trồi lên chụp, kéo xuống rồi tan thành bụi tím */
  const C = o.C, A = { x: c.ax, y: c.ay }, FIN = 1.38;
  const eyes = [[-36, -8], [32, -10], [-14, -14], [16, -15], [-40, 4], [40, 2], [0, -17]].map(([dx, dy], i) => ({ x: A.x + dx, y: A.y + dy, z: R.range(3, 10), at: 0.58 + i * 0.06, i }));
  const hands = [[-28, -6, 1], [26, -7, 1], [-20, 8, 0], [22, 9, 0]].map(([dx, dy, back], i) => ({ x: A.x + dx, y: A.y + dy, back: !!back, at: 0.78 + i * 0.06, side: Math.sign(dx), i }));
  const hand = (B, t, h) => { const up = outBack(tm(t, h.at, h.at + 0.18), 1.4), grab = tm(t, 1.02, 1.2), down = tm(t, FIN, FIN + 0.18), e = up * (1 - down); if (e < 0.05) return;
    const tip = { x: lerp(h.x, A.x + h.side * (h.back ? 7 : 9), 0.45 + 0.55 * grab), y: A.y, z: (h.back ? 26 : 9) * e }, ctl = { x: h.x, y: h.y, z: (h.back ? 22 : 10) * e }, base = { x: h.x, y: h.y, z: 0 };
    const pts = vinePts(c, base, ctl, tip, 1, 14); tube(B, pts, u => lerp(h.back ? 4 : 3.2, 2, u), SHADE(P));
    const [X, Y] = pts[pts.length - 1], base0 = -Math.PI / 2 - h.side * (0.9 - 0.6 * grab), sz = h.back ? 1 : 0.8;
    for (let f = 0; f < 4; f++) { const an = base0 + (f - 1.5) * 0.42, l = (f === 0 || f === 3 ? 16 : 21) * sz * (1 - 0.25 * grab), bend = h.side * 0.9 * grab, m = [X + Math.cos(an) * l * 0.55, Y + Math.sin(an) * l * 0.55], e = [m[0] + Math.cos(an + bend) * l * 0.5, m[1] + Math.sin(an + bend) * l * 0.5];
      tube(B, [[X, Y], m, e], u => lerp(2.2, 1.4, u), SHADE(P)); B.set(m[0], m[1], P[2]); B.set(m[0] + 1, m[1], P[2]); B.set(e[0], e[1], P[0]); B.set(e[0] + 1, e[1], P[1]); B.set(e[0], e[1] + 1, P[1]); }
    orb(B, X, Y, 4.5 * sz + 1, [P[4], P[5], P[6]], P[7]);
    for (const [x, y] of pts.filter((_, j) => j % 4 === 2)) B.set(x - h.side * 2, y, P[2]); };
  return {
    update(t) {
      if (t < 0.4) { gather(c, C.x + 2, C.y, 10, [P[0], P[1], P[2], P[4]], 1.4, 16); if (R.chance(0.4)) wisp(c, C.x + R.range(-8, 8), C.y + 0.6, 1, P); }
      at('dark', t, 0.42, () => { o.hit?.(0.5); o.shake?.(0.15); });
      for (const h of hands) at('h' + h.i, t, h.at, () => { for (let k = 0; k < 3; k++) wisp(c, h.x, h.y + 0.3, 1, P); });
      at('grab', t, 1.12, () => { o.hit?.(0.8); o.shake?.(0.2); });
      if (t > 0.5 && t < FIN && R.chance(0.6)) wisp(c, A.x + R.range(-40, 40), A.y + R.range(-14, 14), 0, P);
      at('fin', t, FIN, () => { o.hit?.(1.7); o.shake?.(0.5); o.flash?.(0.1, '120,60,160'); o.knock?.(); sparks(c, 26, A.x, A.y + 0.5, 6, 110, { up: 0.9, g: 0.15, drag: 1.4, ramp: [P[0], P[1], P[2], P[4]], life: 1.6 }); for (let k = 0; k < 8; k++) puff(c, A.x + R.range(-20, 20), A.y + R.range(-6, 6), R.pick([P[5], P[6]]), 3.2, 0.5, 14); });
    },
    back(B, L, t) { const k = outCubic(tm(t, 0.42, 0.66)) * (1 - tm(t, FIN + 0.05, FIN + 0.4)); if (k > 0) darkPool(B, c, A.x, A.y + 1, 46 * k, 17 * k, P, t);
      if (t < FIN) for (const e of eyes) { if (t < e.at) continue; const op = Math.min(1, (t - e.at) / 0.08), bl = (Math.floor(t * 7 + e.i) % 9) === 0; if (bl) continue; const X = c.X(e.x), Y = c.Y(e.y, e.z), h = Math.round(1 + 2 * op); for (const dx of [-5, 5]) { for (let y = -1; y <= h; y++) for (let x = -3; x <= 3; x++) { const edge = y === -1 || y === h || Math.abs(x) === 3; if (edge && (Math.abs(x) === 3) && (y === -1 || y === h)) continue; B.set(X + dx + x, Y + y, edge ? EYE[2] : x === 0 && y >= 1 ? EYE[2] : y === 0 && x < 0 ? EYE[1] : EYE[0]); } } }
      for (const h of hands) if (h.back) hand(B, t, h); },
    front(B, L, t) { for (const h of hands) if (!h.back) hand(B, t, h); },
    end: 2.2,
  };
});

/* ===================== QUANG ===================== */
const LIGHT = P => [H('#ffffff'), P[0], P[1], P[3], P[5]];
FS.quang_sk1 = SC((c, at, R, P, o) => {   /* Tia Sáng: tụ cầu sáng ở miệng, tia sáng thon -> to bắn thẳng vào đối thủ, chớp gốc, loé đích, thu nhỏ rồi tắt */
  const M = o.M, F = { x: c.ax, y: c.ay }, T0 = 0.3, T1 = 0.85;
  return {
    update(t) {
      if (t > 0.05 && t < T0) gather(c, M.x + 2, M.y, M.z, [P[0], P[1], P[2], P[3]], 1.6, 12);
      at('h1', t, T0 + 0.06, () => { o.hit?.(1); }); at('h2', t, T0 + 0.3, () => o.hit?.(0.5));
      if (t > T0 && t < T1) { if (R.chance(0.6)) star(c, lerp(M.x, F.x, R.next()), M.y + 0.6, lerp(M.z, 9, R.next()) + R.range(-3, 3), R.chance(0.5) ? P[0] : P[1], R.range(0.8, 1.6), 0.2); if (R.chance(0.5)) fx(c, F.x - 5, F.y + 0.6, 9, R.range(-30, 40), 0, R.range(-30, 40), 0.25, dSpark, { size: 2, ramp: [P[0], P[1], P[2], P[3]] }); }
    },
    front(B, L, t) {
      const X0 = c.X(M.x + 2), Y0 = c.Y(M.y, M.z), X1 = c.X(F.x - 5), Y1 = c.Y(F.y, 9);
      if (t > 0.05 && t < T0 + 0.04) { const k = tm(t, 0.05, T0); orb(B, X0, Y0, 1 + 4 * k, LIGHT(P).slice(0, 4), P[4]); L.glow(X0, Y0, 6 + 8 * k, P[1], 0.3 * k); }
      if (t < T0 || t > T1) return; const g = tm(t, T0, T0 + 0.06), sh = 1 - tm(t, T1 - 0.12, T1), fl = 1 + 0.12 * Math.sin(t * 60);
      beam(B, X0, Y0, X1, Y1, 1.2 * sh, 6 * sh * fl, LIGHT(P), { len: g, t, wob: 0.06 }); orb(B, X0, Y0, 4 * sh, [H('#ffffff'), P[0], P[1]], P[3]);
      if (g >= 1) { const r = 8 * sh * fl; for (let i = 0; i < 4; i++) { const a = i / 4 * TAU + t * 6; lineT(B, X1, Y1, X1 + Math.cos(a) * r * 1.8, Y1 + Math.sin(a) * r * 1.8, P[0]); } orb(B, X1, Y1, r * 0.8, [H('#ffffff'), P[0], P[1]], P[3]); L.glow(X1, Y1, 16, P[1], 0.35); }
      L.glow(X0, Y0, 10, P[1], 0.3 * sh);
    },
    end: 1.2,
  };
});
FS.quang_sk2 = SC((c, at, R, P, o) => {   /* Chớp Loá (Quét Sáng): nổ chớp quanh thân — 10 tia sáng toả, vòng sáng lan, sao loé trên đầu đối thủ */
  const C = o.C, F = { x: c.ax, y: c.ay }, TF = 0.34;
  return {
    update(t) { if (t > 0.05 && t < TF) gather(c, C.x + 2, C.y, 10, [P[0], P[1], P[2]], 1.4, 12); at('f', t, TF, () => { o.flash?.(0.16, '255,245,200'); o.shake?.(0.15); star(c, C.x + 2, C.y + 0.6, 10, H('#ffffff'), 3.4, 0.2); }); at('dz', t, TF + 0.08, () => { o.hit?.(0.3); for (let i = 0; i < 3; i++) star(c, F.x - 6 + i * 6, F.y + 0.6, 26 + (i % 2) * 3, P[0], 2, 0.6); }); },
    front(B, L, t) { const k = tm(t, TF, TF + 0.3); if (k <= 0 || k >= 1) return; const X = c.X(C.x + 2), Y = c.Y(C.y, 10), a = k < 0.6 ? 1 : 0.5;
      for (let i = 0; i < 10; i++) { const an = i / 10 * TAU + 0.15, l0 = 8 + 20 * k, l1 = 14 + 46 * outCubic(k) * (i % 2 ? 0.7 : 1); beam(B, X + Math.cos(an) * l0, Y + Math.sin(an) * l0 * 0.8, X + Math.cos(an) * l1, Y + Math.sin(an) * l1 * 0.8, 2.2 * (1 - k), 0.6, [H('#ffffff'), P[0], P[1], P[2]], { a }); }
      L.glow(X, Y, 20 * (1 - k), P[1], 0.4); },
    back(B, L, t) { const k = tm(t, TF, TF + 0.35); if (k > 0 && k < 1) gring(B, c, C.x, C.y + 1, 0, 6 + 34 * outCubic(k), 1.6, [P[0], P[2]], k < 0.6 ? 1 : 0.5, 0); },
    end: 1.3,
  };
});
FS.quang_sk3 = SC((c, at, R, P, o) => {   /* Tự Lành (Màn Sáng): vòng sáng dưới chân, hạt sáng và dấu cộng bay lên quanh thân, lấp lánh */
  const C = o.C, T0 = 0.3, T1 = 1.15;
  return {
    update(t) {
      if (t > 0.05 && t < T0) gather(c, C.x + 2, C.y, 8, [P[0], P[1], P[2]], 1, 12);
      if (t > T0 && t < T1) { if (R.chance(0.9)) { const a = R.range(0, TAU); fx(c, C.x + Math.cos(a) * 11, C.y + Math.sin(a) * 4.5, 1, 0, 0, R.range(20, 40), 0.55, dSpark, { size: 2, ramp: [P[0], P[1], P[2], P[3]] }); } }
      for (const z of [0.4, 0.62, 0.84]) at('p' + z, t, z, () => fx(c, C.x + R.range(-8, 8), C.y + 0.6, R.range(8, 14), 0, 0, 18, 0.55, dG2, { gl: 'plus', col: H('#9dff8a'), c2: H('#1f5a24') }));
    },
    back(B, L, t) { const k = outCubic(tm(t, T0, T0 + 0.15)) * (1 - tm(t, T1 - 0.12, T1)); if (k > 0) gring(B, c, C.x, C.y + 1, 0, 12 * k, 1.6, [P[0], P[1], P[3]], k > 0.5 ? 1 : 0.5, -1); },
    front(B, L, t) { const k = outCubic(tm(t, T0, T0 + 0.15)) * (1 - tm(t, T1 - 0.12, T1)); if (k > 0) gring(B, c, C.x, C.y + 1, 0, 12 * k, 1.6, [P[0], P[1], P[3]], k > 0.5 ? 1 : 0.5, 1); },
    end: 1.3,
  };
});
FS.quang_sk4 = SC((c, at, R, P, o) => {   /* Cầu Trăng: cầu trăng vàng nhạt có bóng khuyết bay tới, vệt lấp lánh, nổ toả tia + vòng sáng */
  const M = o.M, F = { x: c.ax, y: c.ay }, S = shot({ x: M.x + 3, y: M.y + 0.5, z: M.z }, { x: F.x - 3, y: F.y + 0.5, z: 9 }, 0.32, 190);
  let te = -1;
  return {
    update(t) {
      if (t > 0.05 && t < 0.32) gather(c, M.x + 3, M.y, M.z, [P[0], P[1], P[2]], 1.4, 12);
      const p = S.pos(t); if (p && R.chance(0.7)) star(c, p.x - 4, p.y, p.z + R.range(-3, 3), R.chance(0.5) ? P[0] : P[1], R.range(0.8, 1.8), 0.3);
      at('hit', t, S.t1, () => { te = t; o.hit?.(1.1); o.shake?.(0.2); for (let i = 0; i < 6; i++) star(c, F.x - 3 + R.range(-8, 8), F.y + 0.6, R.range(2, 20), R.chance(0.5) ? P[0] : H('#ffffff'), R.range(1.4, 2.4), 0.35); });
    },
    front(B, L, t) { const p = S.pos(t); if (t > 0.05 && t < 0.34) orb(B, c.X(M.x + 3), c.Y(M.y, M.z), 1 + 4 * tm(t, 0.05, 0.32), [H('#ffffff'), P[0], P[1], P[2]], P[4]);
      if (p) { const X = c.X(p.x), Y = c.Y(p.y, p.z); orb(B, X, Y, 8, [H('#ffffff'), P[0], P[1], P[2]], P[4]); for (let y = -8; y <= 8; y++) for (let x = -8; x <= 8; x++) { if (x * x + y * y > 64) continue; const d2 = (x - 4) * (x - 4) + (y + 2) * (y + 2); if (d2 < 40) B.set(X + x, Y + y, d2 > 30 ? P[3] : P[2]); } L.glow(X, Y, 14, P[1], 0.3); }
      if (te >= 0) { const k = tm(t, te, te + 0.3); if (k < 1) { const X = c.X(F.x - 3), Y = c.Y(F.y, 9); for (let i = 0; i < 8; i++) { const an = i / 8 * TAU; beam(B, X + Math.cos(an) * 5, Y + Math.sin(an) * 5, X + Math.cos(an) * (8 + 26 * k), Y + Math.sin(an) * (8 + 26 * k), 2 * (1 - k), 0.5, [H('#ffffff'), P[0], P[1], P[2]], { a: k < 0.6 ? 1 : 0.5 }); } ellipseT(B, X, Y, (6 + 16 * k) * RES * 0.6, (6 + 16 * k) * RES * 0.6, P[0], k < 0.6 ? 1 : 0.5, P[2]); } } },
    end: 1.25,
  };
});
FS.quang_ult = SC((c, at, R, P, o) => {   /* Phán Quyết: tụ sáng ở miệng, tia sáng lớn thon -> to xuyên vào đối thủ, 3 vòng thánh từ trời hạ xuống quét qua thân, chốt loé + lông vũ rơi */
  const M = o.M, A = { x: c.ax, y: c.ay }, T0 = 0.45, T1 = 1.45, FIN = 1.4, HALOS = [0.52, 0.76, 1.0];
  const halo = (B, t, fr) => HALOS.forEach((h0, i) => { const k = tm(t, h0, h0 + 0.42); if (k <= 0 || k >= 1) return; const z = lerp(64, 2, k * k), r = 15 + 3 * Math.sin(k * 3), a = k > 0.85 ? 0.5 : 1; gring(B, c, A.x, A.y, z, r, 1.2, [P[0], P[1]], a, fr ? 1 : -1, 0.4); gring(B, c, A.x, A.y, z, r + 2, 0.6, [P[3]], a, fr ? 1 : -1, 0.4); });
  return {
    update(t) {
      if (t < T0) gather(c, M.x + 2, M.y, M.z, [P[0], P[1], P[2], P[3]], 2, 16);
      for (const h of HALOS) at('h' + h, t, h + 0.36, () => { o.hit?.(0.6); for (let i = 0; i < 4; i++) star(c, A.x + R.range(-14, 14), A.y + 0.6, R.range(2, 6), P[0], 1.8, 0.3); });
      if (t > T0 && t < T1 && R.chance(0.6)) star(c, lerp(M.x, A.x, R.next()), M.y + 0.6, lerp(M.z, 9, R.next()) + R.range(-5, 5), R.chance(0.5) ? P[0] : H('#ffffff'), R.range(1, 2), 0.25);
      at('fin', t, FIN, () => { o.hit?.(1.7); o.shake?.(0.45); o.flash?.(0.16, '255,245,200'); o.knock?.(); for (let i = 0; i < 14; i++) fx(c, A.x + R.range(-24, 24), A.y + R.range(-8, 8), R.range(30, 60), R.range(-10, 10), 0, R.range(-6, 4), R.range(0.9, 1.1), dLeafO, { g: 0.04, drag: 1.5, sway: 16, va: R.range(-5, 5), col: H('#ffffff'), c2: P[0], c3: P[4], size: 1.3 }); });
    },
    back(B, L, t) { halo(B, t, false); },
    front(B, L, t) {
      const X0 = c.X(M.x + 2), Y0 = c.Y(M.y, M.z), X1 = c.X(A.x - 6), Y1 = c.Y(A.y, 9);
      if (t < T0 + 0.04) { const k = tm(t, 0, T0); orb(B, X0, Y0, 1 + 7 * k, LIGHT(P).slice(0, 4), P[4]); L.glow(X0, Y0, 8 + 12 * k, P[1], 0.35 * k); }
      if (t >= T0 && t < T1) { const g = tm(t, T0, T0 + 0.07), sh = 1 - tm(t, T1 - 0.15, T1), fl = 1 + 0.1 * Math.sin(t * 55), big = t > FIN - 0.05 && t < FIN + 0.12 ? 1.4 : 1;
        beam(B, X0, Y0, X1, Y1, 2 * sh, 9 * sh * fl * big, LIGHT(P), { len: g, t, wob: 0.05 }); orb(B, X0, Y0, 6 * sh, [H('#ffffff'), P[0], P[1]], P[3]);
        if (g >= 1) { orb(B, X1, Y1, 8 * sh * fl * big, [H('#ffffff'), P[0], P[1]], P[3]); for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + t * 5; lineT(B, X1, Y1, X1 + Math.cos(a) * 18 * sh, Y1 + Math.sin(a) * 18 * sh, P[0]); } L.glow(X1, Y1, 18, P[1], 0.4 * sh); }
        L.glow(X0, Y0, 12, P[1], 0.35 * sh); }
      halo(B, t, true);
    },
    end: 2.2,
  };
});

/* p67:scenes:begin */
/* ===================== p67: CHIÊU RIÊNG (signature) — VẼ CODE HOÀN TOÀN =====================
   Mỗi Chấn Thú mới có 1 chiêu đúng bản sắc loài. Khung mẫu như chiêu thường: C = chân thú ra chiêu, M = miệng / sừng / mắt {x, y, z}, F = chân đối thủ.
   Nhịp: gồng 0,05–0,3 (tụ hạt, thân lùi) -> 0,3 tung -> trúng (hitstop theo sức) -> dư âm tắt gọn. Cảnh *2 = cảnh TRÚNG tạo lúc chạm (lao / ôm), giờ 0 = lúc chạm.
   Sát thương do engine tính theo đồng hồ riêng khớp các mốc dưới đây (linhduel.js sigFire). */
/* cắt đường gấp theo tỉ lệ độ dài [a, b] (điểm đệm) */
function polyCut(pts, a, b) {
  const seg = []; let L = 0; for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(l); L += l; }
  const s0 = clamp(a) * L, s1 = clamp(b) * L; if (s1 - s0 < 0.5) return null;
  const pt = s => { let q = 0; for (let i = 0; i < seg.length; i++) { if (q + seg[i] >= s) { const u = (s - q) / (seg[i] || 1); return [lerp(pts[i][0], pts[i + 1][0], u), lerp(pts[i][1], pts[i + 1][1], u)]; } q += seg[i]; } return pts[pts.length - 1]; };
  const out = [pt(s0)]; let acc = 0; for (let i = 1; i < pts.length - 1; i++) { acc += seg[i - 1]; if (acc > s0 && acc < s1) out.push(pts[i]); } out.push(pt(s1)); return out;
}
/* vạch mạch in trên đất (logic): gấp khúc ngang / dọc, đầu có ô hàn vuông */
function traceGen(R, x, y, ang, n) { const pts = [[x, y]]; let a = ang; for (let i = 0; i < n; i++) { const l = R.range(5, 9), [px, py] = pts[pts.length - 1]; pts.push([px + Math.cos(a) * l, py + Math.sin(a) * l * 0.5]); a += R.sign() * Math.PI / 4 * (R.chance(0.6) ? 1 : 0); } return pts; }
function traceDraw(B, c, pts, k, col, edge, pad, a = 1) {
  if (k <= 0) return; const P2 = pts.map(([x, y]) => [c.X(x), c.Y(y)]), cut = polyCut(P2, 0, k); if (!cut) return;
  for (let i = 1; i < cut.length; i++) lineT(B, cut[i - 1][0], cut[i - 1][1], cut[i][0], cut[i][1], col, a, edge);
  if (k >= 0.98 && pad != null) { const [X, Y] = P2[P2.length - 1]; for (let yy = -2; yy <= 2; yy++) for (let xx = -2; xx <= 2; xx++) B.dot(X + xx, Y + yy, Math.abs(xx) === 2 || Math.abs(yy) === 2 ? edge : pad, a); }
}
function padlock(B, X, Y, P, shut, a = 1) {   /* ổ khoá pixel (điểm đệm): thân 14×11, càng hở 4 điểm khi chưa khoá */
  const w = 14, h = 11, sy = shut ? 0 : 4;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const e = x === 0 || y === 0 || x === w - 1 || y === h - 1; B.dot(X - w / 2 + x, Y + y, e ? P[7] : y < 2 ? P[1] : x < 3 ? P[2] : P[3], a); }
  disc(B, X, Y + 4, 1.6, P[7]); B.dot(X, Y + 6, P[7], a); B.dot(X, Y + 7, P[7], a);
  for (let an = Math.PI; an <= TAU; an += 0.06) for (const rr of [4, 5, 6]) B.dot(X + Math.cos(an) * rr, Y - sy + Math.sin(an) * 7 * (rr / 6), rr === 6 ? P[7] : rr === 5 ? P[1] : P[2], a);
  for (const dx of [-6, 6]) for (let y = -sy; y < 1; y++) { B.dot(X + dx, Y + y, P[7], a); B.dot(X + dx + (dx < 0 ? 1 : -1), Y + y, P[2], a); }
}
/* ---------- 1. Bọ Vi Mạch — Ghi Đè (Overwrite) ---------- */
FS.ma_sigbo = SC((c, at, R, P, o) => {   /* mạch trên vỏ sáng dần chạy lên sừng -> tia MẠCH IN gấp vuông góc bắn từ sừng, gói dữ liệu chạy dọc tia -> trúng: khung quét + thanh 'ghi đè' đầy dần trên đầu, ổ khoá sập, mạch in loang trên đất */
  const C = o.C, M = o.M, F = { x: c.ax, y: c.ay }, T0 = 0.3, HIT = 0.4, OFF = 0.64, BAR = 1.05, LK = 1.12, END = 1.5, FZ = 10;
  const rt = (() => { const x0 = M.x + 2, z0 = M.z, x1 = F.x - 5, pts = [[x0, z0]]; const n = 3; let z = z0; for (let i = 1; i <= n; i++) { const xm = lerp(x0, x1, (i - 0.45) / n), zn = i < n ? clamp(lerp(z0, FZ, i / n) + R.range(-5, 5), 3, 30) : FZ; pts.push([xm, z]); pts.push([xm, zn]); z = zn; } pts.push([x1, FZ]); return pts; })();
  const own = Array.from({ length: 6 }, (_, i) => traceGen(R, C.x + R.range(-4, 4), C.y + R.range(-1, 1.5), i / 6 * TAU + R.range(-0.3, 0.3), 3));
  const foeT = Array.from({ length: 8 }, (_, i) => traceGen(R, F.x, F.y + 0.5, i / 8 * TAU + R.range(-0.2, 0.2), 4));
  const bp = () => rt.map(([x, z]) => [c.X(x), c.Y(C.y + 0.5, z)]);
  let dead = false;
  return {
    update(t) {
      if (t > 0.05 && t < T0) gather(c, M.x + 2, M.y, M.z, [P[0], P[1], P[2], P[3]], 1.4, 11);
      at('go', t, T0, () => { o.shake?.(0.08); star(c, M.x + 2, M.y + 0.5, M.z, P[0], 2.6, 0.16); sparks(c, 8, M.x + 2, M.y + 0.5, M.z, 70, { up: 0.5, g: 0.2, ramp: [P[0], P[1], P[2], P[4]] }); addLight(c, M.x + 2, M.y, 10, P[1], 0.35, 0.1); });
      at('hit', t, HIT, () => { o.hit?.(1.3); o.shake?.(0.25); bits(c, F.x - 3, F.y + 0.6, FZ, 16, 90, 0.55); star(c, F.x - 3, F.y + 0.6, FZ, P[0], 3, 0.18); addLight(c, F.x, F.y - FZ, 14, P[1], 0.45, 0.12); });
      at('lk', t, LK, () => { o.shake?.(0.12); star(c, F.x, F.y + 0.6, 34, P[0], 2.2, 0.16); });
      at('off', t, END - 0.2, () => { dead = true; bits(c, F.x, F.y + 0.6, 32, 10, 50, 0.4); });
    },
    back(B, L, t) {
      if (t > 0.05 && t < T0 + 0.25) { const k = tm(t, 0.05, T0), fd = 1 - tm(t, T0 + 0.05, T0 + 0.25); for (const p of own) traceDraw(B, c, p, k, k > 0.9 ? P[1] : P[3], P[7], P[0], fd > 0.5 ? 1 : 0.5); }
      if (t > HIT) { const k = outCubic(tm(t, HIT, HIT + 0.22)), fd = 1 - tm(t, 1.15, 1.45); if (fd > 0) for (const p of foeT) traceDraw(B, c, p, k, t < HIT + 0.3 ? P[1] : P[3], P[7], P[2], fd > 0.5 ? 1 : 0.5); }
    },
    front(B, L, t) {
      if (t > 0.05 && t < T0 + 0.04) { const k = tm(t, 0.05, T0); orb(B, c.X(M.x + 2), c.Y(M.y, M.z), 1 + 3.5 * k, [P[0], P[1], P[2]], P[5]); L.glow(c.X(M.x + 2), c.Y(M.y, M.z), 5 + 6 * k, P[2], 0.25 * k); }
      if (t >= T0 && t < OFF) { const grow = tm(t, T0, T0 + 0.07), from = tm(t, HIT + 0.06, OFF), cut = polyCut(bp(), from, grow);
        if (cut) { tube(B, cut, u => 2.2 + 1.6 * u, [P[0], P[0], P[1], P[3], P[6]]); for (const [x, y] of cut.slice(1, -1)) { disc(B, x, y, 3, P[7]); disc(B, x, y, 2, P[1]); } }
        if (t < HIT + 0.02) for (let i = 0; i < 3; i++) { const u = tm(t, T0 + i * 0.025, HIT), q = u > 0 && u < 1 ? polyCut(bp(), 0, u) : null; if (q) { const [x, y] = q[q.length - 1]; cube(B, P, x, y + 4, 8, 5, 1, true); } }
        const [hx, hy] = bp()[0]; if (t < HIT + 0.1) { orb(B, hx, hy, 4.5, [P[0], P[0], P[1]], P[3]); L.glow(hx, hy, 12, P[1], 0.3); } }
      if (t > HIT && t < LK + 0.1) {   /* khung quét quanh thân: 4 góc + vạch quét chạy xuống (che < 40 %) */
        const X0 = c.X(F.x - 12), X1 = c.X(F.x + 12), Yt = c.Y(F.y, 26), Yb = c.Y(F.y, 0), op = t < HIT + 0.04 ? 0.5 : 1, cl = Math.min(8, 3 + 20 * tm(t, HIT, HIT + 0.12));
        for (const [X, Y, sx, sy] of [[X0, Yt, 1, 1], [X1, Yt, -1, 1], [X0, Yb, 1, -1], [X1, Yb, -1, -1]]) { lineT(B, X, Y, X + sx * cl, Y, P[1], op, P[7]); lineT(B, X, Y, X, Y + sy * cl, P[1], op, P[7]); }
        if (t < BAR) { const s = ((t - HIT) * 2.6) % 1, Y = lerp(Yt, Yb, s); for (let x = X0 + 2; x < X1 - 1; x++) { B.dot(x, Y, P[0]); B.dot(x, Y + 1, P[2], 0.5); } }
        const bx = c.X(F.x), by = c.Y(F.y, 32), fill = tm(t, HIT + 0.05, BAR), W2 = 24;   /* thanh tiến trình 'ghi đè' */
        if (t < LK) { for (let y = -4; y <= 4; y++) for (let x = -W2; x <= W2; x++) { const e = Math.abs(x) === W2 || Math.abs(y) === 4; B.set(bx + x, by + y, e ? P[7] : (x + W2) / (2 * W2) <= fill ? (y < -1 ? P[0] : P[2]) : P[6]); } }
        else if (!dead) padlock(B, bx, by - 6, P, true);
        if (t > LK - 0.12 && t < LK) padlock(B, bx, by - 12 + 6 * tm(t, LK - 0.12, LK), P, false);
      }
      if (t > HIT && t < HIT + 0.2) glitchBars(B, R, c.X(F.x), c.Y(F.y, 0), 30, 34, 4, P, t > HIT + 0.12 ? 0.5 : 1);
    },
    end: END,
  };
});
/* ---------- 2. Cu Li Bóng — Ánh Mắt Đêm (Night Gaze) ---------- */
const EYEG = ['#fffbe0', '#ffef9a', '#ffd64a', '#d79a1e', '#7a4a0c'].map(H);
FS.anh_sigcu = SC((c, at, R, P, o) => {   /* vũng tối loang dưới chân, đôi mắt vàng tụ sáng -> 2 tia nhìn mảnh từ MẮT tới đầu đối thủ -> vòng thôi miên co vào quanh đầu, con mắt bóng mở trên đầu, chữ z khi ngủ */
  const C = o.C, M = o.M, F = { x: c.ax, y: c.ay }, T0 = 0.3, HIT = 0.4, END = 1.6, HZ = 15;
  const eyes = [[M.x + 1, M.z + 1], [M.x + 3.5, M.z + 0.5]];
  return {
    update(t) {
      if (t > 0.05 && t < T0 && R.chance(0.6)) wisp(c, C.x + R.range(-10, 10), C.y + 0.6, 1, P);
      if (t > 0.08 && t < T0) gather(c, M.x + 2, M.y, M.z, [EYEG[0], EYEG[1], EYEG[2]], 0.8, 8);
      at('go', t, T0, () => { for (const [x, z] of eyes) star(c, x, M.y + 0.5, z, EYEG[1], 2.4, 0.18); o.shake?.(0.06); });
      at('hit', t, HIT, () => { o.hit?.(1.0); sparks(c, 10, F.x - 2, F.y + 0.5, HZ, 60, { up: 0.4, g: 0, drag: 2.2, ramp: [EYEG[0], EYEG[1], P[1], P[2]] }); addLight(c, F.x, F.y - HZ, 12, EYEG[2], 0.35, 0.12); });
      for (const z of [1.18, 1.38]) at('z' + z, t, z, () => fx(c, F.x + 6, F.y + 0.6, 30, 10, 0, 14, 0.55, dG2, { gl: 'z', col: P[0], c2: P[7] }));
      if (t > HIT && t < 1.35 && R.chance(0.35)) wisp(c, F.x + R.range(-10, 10), F.y + 0.6, 1, P);
    },
    back(B, L, t) {
      const kp = outCubic(tm(t, 0.05, 0.25)) * (1 - tm(t, 0.55, 0.8)); if (kp > 0) darkPool(B, c, C.x, C.y + 1, 18 * kp, 6.5 * kp, P, t);
      const kf = outCubic(tm(t, HIT, HIT + 0.2)) * (1 - tm(t, 1.3, 1.55)); if (kf > 0) pool(B, c, F.x, F.y + 1, 14, 5, P, kf);
      if (t > HIT && t < 1.4) for (let i = 0; i < 3; i++) { const k = ((t - HIT) * 1.6 + i / 3) % 1, r = (16 - 12 * k) * RES, a = k < 0.15 ? 0.5 : 1; ellipse(B, c.X(F.x), c.Y(F.y, HZ), r, r * 0.42, i % 2 ? EYEG[2] : P[1], a, -1); ellipse(B, c.X(F.x), c.Y(F.y, HZ) + 1, r, r * 0.42, P[6], a, -1); }
    },
    front(B, L, t) {
      if (t > 0.08 && t < HIT + 0.15) { const k = t < T0 ? tm(t, 0.08, T0) : 1 - tm(t, HIT, HIT + 0.15); for (const [x, z] of eyes) { const X = c.X(x), Y = c.Y(M.y, z); disc(B, X, Y, 1 + 2.2 * k, EYEG[3]); disc(B, X, Y, 0.6 + 1.6 * k, EYEG[1]); B.set(X, Y, EYEG[0]); L.glow(X, Y, 4 + 6 * k, EYEG[2], 0.3 * k); } }
      if (t >= T0 && t < HIT + 0.16) { const grow = tm(t, T0, T0 + 0.06), from = tm(t, HIT + 0.02, HIT + 0.16);
        for (const [x, z] of eyes) { const X0 = c.X(x), Y0 = c.Y(M.y, z), X1 = c.X(F.x - 2), Y1 = c.Y(F.y, HZ); beam(B, X0, Y0, X1, Y1, 1, 2, [EYEG[0], EYEG[1], EYEG[2], EYEG[3], P[7]], { len: grow, from }); } }
      if (t > HIT && t < 1.4) { for (let i = 0; i < 3; i++) { const k = ((t - HIT) * 1.6 + i / 3) % 1, r = (16 - 12 * k) * RES, a = k < 0.15 ? 0.5 : 1; ellipse(B, c.X(F.x), c.Y(F.y, HZ), r, r * 0.42, i % 2 ? EYEG[2] : P[1], a, 1); ellipse(B, c.X(F.x), c.Y(F.y, HZ) + 1, r, r * 0.42, P[6], a, 1); }
        const op = tm(t, HIT + 0.05, HIT + 0.2) * (1 - tm(t, 1.25, 1.4)), X = c.X(F.x), Y = c.Y(F.y, 31), w = 9 * RES * 0.5, h = Math.max(1, 3.4 * op * RES * 0.5);   /* con mắt bóng trên đầu */
        if (op > 0.05) { for (let x = -w; x <= w; x++) { const hh = h * Math.sqrt(1 - (x / w) * (x / w)); for (let y = -hh - 1; y <= hh + 1; y++) { const e = Math.abs(y) > hh; B.set(X + x, Y + y, e ? P[7] : Math.abs(x) < 2.6 && Math.abs(y) < 2.6 ? (Math.abs(x) < 1 && Math.abs(y) < 1 ? P[7] : EYEG[2]) : EYEG[0]); } } L.glow(X, Y, 8, EYEG[2], 0.2 * op); } }
    },
    end: END,
  };
});
/* ---------- 3. Mã Cưu — Thả Gói Tin (Packet Drop) ---------- */
function envelope(B, P, X, Y, s, a = 1) {   /* phong bì dữ liệu (điểm đệm): thân trắng, nắp chữ V, dấu niêm xanh, viền tối */
  const w = Math.round(9 * s), h = Math.round(6.5 * s);
  for (let y = -h; y <= h; y++) for (let x = -w; x <= w; x++) { const e = Math.abs(x) === w || Math.abs(y) === h, v = Math.abs(Math.abs(x) * h / w - (y + h)) < 1.1 && y < 1; B.dot(X + x, Y + y, e ? P[7] : v ? P[5] : y > h - 2 ? P[3] : P[0], a); }
  disc(B, X, Y + 1, 2.2 * s, P[7]); disc(B, X, Y + 1, 1.5 * s, P[2]);
}
FS.ma_sigcuu = SC((c, at, R, P, o) => {   /* tụ bit ở mỏ, 3 phong bì dữ liệu hiện trên đầu rồi vút lên trời -> rơi lần lượt xuống đối thủ (vạch ngắm vuông trên đất), mỗi gói nổ khối + nhiễu, gói cuối to nhất */
  const C = o.C, M = o.M, F = { x: c.ax, y: c.ay }, T0 = 0.3, DROPS = [[0.48, -7, 0.9], [0.64, 6, 0.9], [0.82, 0, 1.6]], FALL = 0.16, END = 1.45;
  const pos0 = i => ({ x: M.x - 4 + i * 4, z: M.z + 12 + (i === 1 ? 3 : 0) });
  const fallZ = (t, d) => { const u = tm(t, d[0] - FALL, d[0]); return 80 * (1 - u * u); };
  let boom = [-1, -1, -1];
  return {
    update(t) {
      if (t > 0.05 && t < T0) gather(c, M.x + 2, M.y, M.z, [P[0], P[1], P[2], P[3]], 1.2, 10);
      at('up', t, T0, () => { o.shake?.(0.06); bits(c, M.x, M.y + 0.5, M.z + 12, 10, 60, 0.4); });
      DROPS.forEach((d, i) => at('d' + i, t, d[0], () => { boom[i] = t; const x = F.x + d[1]; o.hit?.(d[2]); o.shake?.(i === 2 ? 0.35 : 0.15); bits(c, x, F.y + 0.6, 4, i === 2 ? 22 : 12, i === 2 ? 110 : 70, 0.55); star(c, x, F.y + 0.6, 6, P[0], i === 2 ? 3.4 : 2.4, 0.16); addLight(c, x, F.y - 6, i === 2 ? 18 : 12, P[1], 0.4, 0.12);
        for (let k = 0; k < (i === 2 ? 8 : 4); k++) { const a = k / (i === 2 ? 8 : 4) * TAU; puff(c, x + Math.cos(a) * 5, F.y + Math.sin(a) * 2, R.pick([P[3], P[4], P[5]]), i === 2 ? 3.2 : 2.4, 0.4, 6, { vx: Math.cos(a) * 26, vy: Math.sin(a) * 10 }); } }));
    },
    back(B, L, t) {
      DROPS.forEach((d, i) => { const x = F.x + d[1]; if (t > d[0] - FALL - 0.06 && t < d[0]) { const k = tm(t, d[0] - FALL - 0.06, d[0]), r = (10 - 4 * k) * RES, X = c.X(x), Y = c.Y(F.y + 0.5); for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { lineT(B, X + sx * r, Y + sy * r * 0.45, X + sx * (r - 5), Y + sy * r * 0.45, P[1], 1, P[7]); lineT(B, X + sx * r, Y + sy * r * 0.45, X + sx * r, Y + sy * (r * 0.45 - 3), P[1], 1, P[7]); } }
        if (boom[i] >= 0) { const k = tm(t, boom[i], boom[i] + 0.26); if (k < 1) gring(B, c, x, F.y + 1, 0, 5 + (i === 2 ? 26 : 15) * outCubic(k), 2.5 * (1 - k) + 1, [P[3], P[2], P[1]], k < 0.7 ? 1 : 0.5, -1); } });
    },
    front(B, L, t) {
      if (t > 0.08 && t < T0 + 0.12) for (let i = 0; i < 3; i++) { const p = pos0(i), k = tm(t, 0.08 + i * 0.04, 0.2 + i * 0.04), up = tm(t, T0, T0 + 0.12); if (k <= 0) continue; envelope(B, P, c.X(p.x), c.Y(M.y, p.z + 70 * up * up), 0.4 + 0.6 * outBack(k, 2), up > 0.6 ? 0.5 : 1); }
      DROPS.forEach((d, i) => { if (t > d[0] - FALL && t < d[0]) { const z = fallZ(t, d), X = c.X(F.x + d[1]), Y = c.Y(F.y + 0.5, z); envelope(B, P, X, Y, i === 2 ? 1.25 : 0.95); for (let q = 1; q <= 3; q++) B.dot(X + R.range(-4, 4), Y - q * 6, P[1], 0.5); L.glow(X, Y, 10, P[2], 0.2); }
        if (boom[i] >= 0) { const k = tm(t, boom[i], boom[i] + 0.26); if (k < 1) gring(B, c, F.x + d[1], F.y + 1, 0, 5 + (i === 2 ? 26 : 15) * outCubic(k), 2.5 * (1 - k) + 1, [P[3], P[2], P[1]], k < 0.7 ? 1 : 0.5, 1); if (t < boom[i] + 0.16) glitchBars(B, R, c.X(F.x), c.Y(F.y, 0), 30, 30, i === 2 ? 5 : 3, P, t > boom[i] + 0.1 ? 0.5 : 1); } });
    },
    end: END,
  };
});
/* ---------- 4. Hắc Giác Thú — Lưỡi Bóng (Shadow Tongue) ---------- */
const TONG = ['#ffd6e6', '#f590b8', '#d2568e', '#8a2e6e'].map(H);
FS.anh_sighac = SC((c, at, R, P, o) => {   /* bóng tụ ở miệng, nước dãi tím nhỏ giọt -> LƯỠI BÓNG phóng từ miệng quấn quanh thân đối thủ -> giật kéo về -> hàm bóng đớp, mũi tên hút sức */
  const C = o.C, M = o.M, F = { x: c.ax, y: c.ay }, T0 = 0.3, HIT = 0.4, PULL = 0.62, BITE = 0.68, END = 1.25, FZ = 9;
  const gap = t => 15 - 10 * outCubic(tm(t, PULL, BITE));
  const jaw = (B, t, side) => { if (t < PULL || t > BITE + 0.22) return; const k = tm(t, PULL, PULL + 0.04) * (1 - tm(t, BITE + 0.12, BITE + 0.22)); if (k < 0.05) return; const X = c.X(F.x + side * gap(t)), Y = c.Y(F.y, 10), r = 11 * RES * k, ang = side < 0 ? Math.PI : 0;
    crescent(B, X, Y, r + 1, ang, 10, [P[7], P[7], P[7]], 1, 1.25); crescent(B, X, Y, r, ang, 9, [P[2], P[5], P[6]], 1, 1.2);
    for (let s = -0.84; s <= 0.85; s += 0.42) { const bx = X + Math.cos(ang + s) * (r - 7), by = Y + Math.sin(ang + s) * (r - 7), ux = -Math.cos(ang + s), uy = -Math.sin(ang + s), vx = -uy, vy = ux, TL = 8 * k, TW = 3;
      for (let q = 0; q <= TL; q += 0.5) { const w = TW * (1 - q / TL); for (let e = -w - 0.5; e <= w + 0.5; e += 0.5) B.set(bx + ux * q + vx * e, by + uy * q + vy * e, Math.abs(e) > w ? P[7] : q > TL * 0.6 ? TOOTH[1] : TOOTH[0]); } } };
  const tipX = () => F.x - 2;
  return {
    update(t) {
      if (t > 0.05 && t < T0) { gather(c, M.x + 2, M.y, M.z, [P[0], P[1], P[2], P[4]], 1.2, 10); if (R.chance(0.25)) fx(c, M.x + 2, M.y + 0.5, M.z - 1, R.range(-4, 4), 0, 0, 0.4, dDrop, { g: 1, col: TONG[1], c2: TONG[3], onLand: (cc, p) => { p.life = 0; } }); }
      at('go', t, T0, () => { o.shake?.(0.06); for (let k = 0; k < 4; k++) wisp(c, M.x + 2, M.y + 0.5, M.z, P); });
      at('hit', t, HIT, () => { o.hit?.(1.2); sparks(c, 10, F.x - 2, F.y + 0.5, FZ, 70, { up: 0.6, g: 0.3, ramp: [TONG[0], TONG[1], P[1], P[2]] }); addLight(c, F.x, F.y - FZ, 10, P[1], 0.3, 0.1); });
      at('bite', t, BITE, () => { o.hit?.(1.4); o.shake?.(0.3); sparks(c, 16, F.x, F.y + 0.5, 10, 100, { up: 0.7, g: 0.3, ramp: [P[0], P[1], P[2], P[4]], life: 1.3 }); for (let k = 0; k < 5; k++) puff(c, F.x + R.range(-6, 6), F.y, R.pick([P[5], P[6]]), 3, 0.45, 12, { z: 8 });
        fx(c, F.x, F.y + 0.6, 26, 0, 0, 18, 0.6, dG2, { gl: 'dn', col: P[1], c2: P[7] }); fx(c, C.x, C.y + 0.6, 26, 0, 0, 18, 0.6, dG2, { gl: 'plus', col: P[0], c2: P[7] }); });
      if (t > BITE && t < 1.0 && R.chance(0.5)) wisp(c, F.x + R.range(-10, 10), F.y + 0.6, 2, P);
    },
    back(B, L, t) {
      if (t > HIT && t < PULL + 0.04) ellipseT(B, c.X(F.x), c.Y(F.y, FZ), 10 * RES, 4 * RES, TONG[2], 1, P[7]);
      const kp = outCubic(tm(t, PULL, BITE)) * (1 - tm(t, BITE + 0.2, BITE + 0.45)); if (kp > 0) pool(B, c, F.x, F.y + 1, 15, 5, P, kp);
      jaw(B, t, -1);
    },
    front(B, L, t) {
      if (t >= T0 && t < PULL + 0.06) { const grow = tm(t, T0, T0 + 0.08), back = tm(t, PULL - 0.02, PULL + 0.06), X0 = c.X(M.x + 1), Y0 = c.Y(M.y, M.z), X1 = c.X(tipX()), Y1 = c.Y(F.y, FZ);
        const len = grow * (1 - back); if (len > 0.02) { beam(B, X0, Y0, X1, Y1, 2.6, 3.4, [TONG[0], TONG[1], TONG[2], TONG[3], P[7]], { len, wave: t < HIT ? 2.2 : 0.8, t, wk: 0.12, ww: 22 }); const Xh = lerp(X0, X1, len), Yh = lerp(Y0, Y1, len); disc(B, Xh, Yh, 4.5, P[7]); disc(B, Xh, Yh, 3.6, TONG[1]); B.set(Xh - 1, Yh - 2, TONG[0]); L.glow(Xh, Yh, 8, P[2], 0.18); } }
      if (t > HIT && t < PULL + 0.04) { const X = c.X(F.x), Y = c.Y(F.y, FZ); for (let i = 0; i < 360; i += 2) { const an = i / 180 * Math.PI, s = Math.sin(an); if (s < 0) continue; for (const [dr, col] of [[0, TONG[1]], [-1, TONG[2]], [1, P[7]]]) B.set(X + Math.cos(an) * (10 * RES + dr), Y + s * (4 * RES + dr * 0.5), col); } }
      jaw(B, t, 1);
    },
    end: END,
  };
});
/* ---------- 5. Hoả Hùng — Ôm Hoả Ngục (Inferno Hug): gồng (vương miện lửa bùng) + cảnh ôm khi chạm ---------- */
FS.nham_sighoa = SC((c, at, R, P, o) => {   /* vương miện lửa trên đầu bùng cao, tàn lửa xoáy vào, hơi nóng dưới chân; lúc tung: lửa đỉnh đầu phụt + tia lửa */
  const C = o.C, M = o.M, FR = [P[0], P[1], P[2], P[3], P[4], P[5]], HZ = M.z + 9, T0 = 0.3;
  return {
    update(t) {
      if (t > 0.04 && t < T0 + 0.1) { const k = tm(t, 0.04, T0); for (let q = 0; q < 2; q++) if (R.chance(0.5 + 0.5 * k)) flame(c, C.x + R.range(-3, 3), C.y + 0.4, HZ + R.range(-1, 2), R.range(-8, 8), 0, R.range(30, 60) * (0.6 + k), R.range(0.18, 0.3), R.range(1.4, 2.4) * (0.7 + 0.6 * k), FR); }
      if (t > 0.06 && t < T0) gather(c, C.x, C.y, HZ - 4, FR, 1.2, 14);
      at('go', t, T0, () => { o.shake?.(0.1); for (let k = 0; k < 8; k++) flame(c, C.x + R.range(-3, 3), C.y + 0.4, HZ, R.range(-30, 30), R.range(-6, 6), R.range(50, 90), R.range(0.2, 0.32), R.range(2, 3), FR); sparks(c, 10, C.x, C.y + 0.4, HZ, 80, { up: 1.2, g: 0.5, ramp: FR }); addLight(c, C.x, C.y - HZ, 14, P[2], 0.45, 0.12); });
    },
    back(B, L, t) { const k = tm(t, 0.05, T0) * (1 - tm(t, T0 + 0.1, T0 + 0.4)); if (k > 0) gring(B, c, C.x, C.y + 1, 0, 9 + 3 * k, 1.5, [P[5], P[4]], k > 0.5 ? 1 : 0.5); },
    front(B, L, t) { const k = tm(t, 0.04, T0) * (1 - tm(t, T0 + 0.05, T0 + 0.25)); if (k > 0) L.glow(c.X(C.x), c.Y(C.y, HZ), 10 + 10 * k, P[2], 0.3 * k); },
    end: 0.9,
  };
});
FS.nham_sighoa2 = SC((c, at, R, P, o) => {   /* chạm: chớp nổ ở ngực -> lốc lửa xoáy bọc 2 thân (lưỡi lửa cao phía SAU, lửa thấp phía trước — đối thủ vẫn rõ), 2 nhịp siết -> nổ tung vòng lửa + khói nấm + vết cháy, hất bay */
  const F = { x: c.ax, y: c.ay }, FR = [P[0], P[1], P[2], P[3], P[4], P[5]], CX = F.x - 5, BEATS = [0.12, 0.42], FIN = 0.78, END = 1.5;
  let fin = -1;
  return {
    update(t) {
      at('c', t, 0.0, () => { star(c, F.x - 3, F.y + 0.5, 10, P[0], 3, 0.14); sparks(c, 12, F.x - 3, F.y + 0.5, 10, 90, { up: 1, g: 0.5, ramp: FR }); addLight(c, F.x, F.y - 10, 14, P[2], 0.45, 0.12); });
      if (t > 0.04 && t < FIN) { const sp = 7; for (let q = 0; q < 3; q++) { const an = t * sp + q * TAU / 3 + R.range(-0.3, 0.3), rx = 15, ry = 6, x = CX + Math.cos(an) * rx, y = F.y + Math.sin(an) * ry; if (Math.sin(an) > 0 && q) continue; flame(c, x, y, R.range(0, 4), -Math.sin(an) * 30, Math.cos(an) * 10, Math.sin(an) < 0 ? R.range(60, 110) : R.range(8, 18), R.range(0.22, 0.34), Math.sin(an) < 0 ? R.range(1.8, 2.8) : R.range(1.2, 1.8), FR); }
        if (R.chance(0.4)) fx(c, CX + R.range(-14, 14), F.y + R.range(-5, 5), 4, R.range(-20, 20), 0, R.range(40, 80), 0.4, dSpark, { size: 2, g: 0.2, ramp: FR }); }
      BEATS.forEach((b, i) => at('b' + i, t, b, () => { o.hit?.(0.8); o.shake?.(0.15); for (let k = 0; k < 6; k++) flame(c, F.x - 3 + R.range(-3, 3), F.y + 0.5, 10, R.range(-40, 40), R.range(-8, 8), R.range(20, 60), R.range(0.18, 0.28), R.range(2, 3), FR); addLight(c, CX, F.y - 12, 18, P[2], 0.35, 0.1); }));
      at('fin', t, FIN, () => { fin = t; o.knock?.(); o.shake?.(0.5);
        for (let k = 0; k < 20; k++) { const a = R.range(0, TAU), v = R.range(40, 110); flame(c, CX + Math.cos(a) * 4, F.y + Math.sin(a) * 2, R.range(2, 10), Math.cos(a) * v, Math.sin(a) * v * 0.45, R.range(30, 90), R.range(0.3, 0.5), R.range(2.4, 3.8), FR); }
        for (let k = 0; k < 8; k++) part(c, K.CHUNK, CX + R.range(-4, 4), F.y + R.range(-1, 2), 4, R.range(-90, 90), R.range(-30, 30), R.range(60, 120), R.range(0.5, 0.7), P[6], R.range(1, 1.8), { g: 1, bounce: 0.3, drag: 0.5, va: R.range(-14, 14), qf: 1 });
        sparks(c, 20, CX, F.y, 8, 130, { up: 1.4, g: 0.6, drag: 1, ramp: FR, life: 1.6 }); for (let k = 0; k < 6; k++) smokeP(c, CX + R.range(-8, 8), F.y - 1.5, R.range(12, 24), R.pick(SMOKE), R.range(3.4, 4.8), R.range(0.6, 0.85), 24); addLight(c, CX, F.y - 12, 26, P[2], 0.55, 0.16); });
    },
    back(B, L, t) {
      if (t > 0.04 && t < FIN + 0.05) { const k = tm(t, 0.04, 0.2); for (let i = 0; i < 9; i++) { const an = t * 7 + i / 9 * TAU, s = Math.sin(an); if (s > 0) continue; const x = CX + Math.cos(an) * 15, y = F.y + s * 6, h = (18 + 10 * Math.sin(t * 13 + i)) * k; pillarFlame(B, c, x, y, h, P); } L.glow(c.X(CX), c.Y(F.y, 14), 22, P[2], 0.25 * k); }
      if (fin >= 0) { const fd = 1 - tm(t, fin + 0.5, fin + 0.75); if (fd > 0) ditherOval(B, c.X(CX), c.Y(F.y + 1), 16 * RES, 6 * RES, P[7], 1.4 * fd); const k = tm(t, fin, fin + 0.3); if (k < 1) gring(B, c, CX, F.y + 1, 0, 8 + 34 * outCubic(k), 3 * (1 - k) + 1, [P[3], P[2], P[1]], k < 0.7 ? 1 : 0.5, -1); }
    },
    front(B, L, t) {
      if (t > 0.04 && t < FIN + 0.05) { const k = tm(t, 0.04, 0.2); for (let i = 0; i < 9; i++) { const an = t * 7 + i / 9 * TAU, s = Math.sin(an); if (s <= 0 || i % 2) continue; const x = CX + Math.cos(an) * 17, y = F.y + s * 6.5, h = (3 + 1.5 * Math.sin(t * 11 + i)) * k; pillarFlame(B, c, x, y, h, P); } }   /* phía trước: lưỡi lửa thấp + thưa (thấy thân gấu đang ôm) */
      if (fin >= 0) { const k = tm(t, fin, fin + 0.3); if (k < 1) gring(B, c, CX, F.y + 1, 0, 8 + 34 * outCubic(k), 3 * (1 - k) + 1, [P[3], P[2], P[1]], k < 0.7 ? 1 : 0.5, 1); }
    },
    end: END,
  };
});
function pillarFlame(B, c, x, y, h, P) {   /* lưỡi lửa đứng (logic): chân rộng, đỉnh nhọn lượn, lõi vàng, viền đỏ sẫm */
  if (h < 1) return; const X = c.X(x), Y0 = c.Y(y), Hh = h * RES, W = 3.2 * RES;
  for (let q = 0; q <= Hh; q += 1) { const u = q / Hh, w = W * (1 - u * 0.85) * (0.8 + 0.2 * Math.sin(u * 9 + x)), cx = X + Math.sin(u * 5 + x * 0.7) * 2 * u; for (let e = -w - 1; e <= w + 1; e += 1) { const ae = Math.abs(e); B.set(cx + e, Y0 - q, ae > w ? P[6] : ae < w * 0.35 && u < 0.7 ? P[1] : ae < w * 0.7 ? P[2] : P[4]); } }
}
/* ---------- 6. Ngưu Sơn — Ngưu Giác Phá Sơn (Mountain Gore): gồng cào móng + bật lao; cảnh trúng khi chạm ---------- */
FS.chan_signs = SC((c, at, R, P, o) => {   /* cúi đầu cào móng: bụi + sỏi văng ra sau, nứt dưới móng, ánh sừng loé -> bật lao: vòng chấn + đá vụn văng ngược + mây bụi sau lưng */
  const C = o.C, M = o.M, T0 = 0.3, cr = starCrack(R, C.x, C.y + 1, 5, 10);
  return {
    update(t) {
      for (const s of [0.08, 0.17, 0.26]) at('s' + s, t, s, () => { o.shake?.(0.04); for (let k = 0; k < 3; k++) pebbleHop(c, C.x - 3 + R.range(-2, 2), C.y + R.range(0, 1.5), 0.8, [P[2], P[3], P[4]]); puff(c, C.x - 6, C.y + 1, R.pick([P[2], P[3]]), 2.4, 0.35, 6, { vx: -40 }); });
      at('glint', t, 0.22, () => star(c, M.x + 1, M.y + 0.5, M.z, P[0], 2.4, 0.16));
      at('go', t, T0, () => { o.shake?.(0.2); for (let k = 0; k < 10; k++) part(c, K.CHUNK, C.x + R.range(-3, 3), C.y + R.range(-1, 1.5), 2, R.range(-110, -30), R.range(-25, 25), R.range(40, 90), R.range(0.45, 0.65), P[3], R.range(1.2, 2.2), { g: 1, bounce: 0.3, drag: 0.5, va: R.range(-14, 14), qf: 1 });
        for (let k = 0; k < 7; k++) puff(c, C.x - 4 + R.range(-4, 2), C.y + R.range(-2, 2), R.pick([P[2], P[3], P[4]]), R.range(3, 4.2), 0.55, 8, { vx: R.range(-70, -20), vy: R.range(-8, 8) }); });
    },
    back(B, L, t) { if (t > 0.08) { const fd = 1 - tm(t, 0.8, 1.05); if (fd > 0) drawCracks(B, c, cr, tm(t, 0.08, T0 + 0.05), P[6], P[4], P[7], fd > 0.5 ? 1 : 0.5); } const k = tm(t, T0, T0 + 0.25); if (k > 0 && k < 1) gring(B, c, C.x, C.y + 1, 0, 6 + 22 * outCubic(k), 2.5 * (1 - k) + 1, [P[4], P[3], P[2]], k < 0.7 ? 1 : 0.5, -1); },
    front(B, L, t) { const k = tm(t, T0, T0 + 0.25); if (k > 0 && k < 1) gring(B, c, C.x, C.y + 1, 0, 6 + 22 * outCubic(k), 2.5 * (1 - k) + 1, [P[4], P[3], P[2]], k < 0.7 ? 1 : 0.5, 1); },
    end: 1.1,
  };
});
FS.chan_signs2 = SC((c, at, R, P, o) => {   /* chạm sừng: chớp + đá vụn -> CỘT ĐÁ trồi dưới chân hất đối thủ lên cao rồi vỡ vụn -> đối thủ rơi đập đất: nứt sao, vòng chấn lớn, đá nảy, mây bụi */
  const F = { x: c.ax, y: c.ay }, LAND = 0.7, END = 1.55, cr = starCrack(R, F.x, F.y + 1, 8, 20);
  let land = -1;
  return {
    update(t) {
      at('c', t, 0.0, () => { o.hit?.(1.2); star(c, F.x - 4, F.y + 0.5, 10, P[0], 3, 0.16); for (let k = 0; k < 8; k++) part(c, K.CHUNK, F.x - 3, F.y + R.range(-1, 1), 8, R.range(-20, 80), R.range(-20, 20), R.range(40, 100), R.range(0.45, 0.6), P[3], R.range(1, 2), { g: 1, bounce: 0.3, drag: 0.5, va: R.range(-14, 14), qf: 1 }); addLight(c, F.x, F.y - 10, 14, P[0], 0.35, 0.1); });
      at('rise', t, 0.05, () => { for (let k = 0; k < 6; k++) pebbleHop(c, F.x + R.range(-6, 6), F.y + R.range(-1, 2), 1.2, [P[1], P[2], P[3], P[4]]); puff(c, F.x - 5, F.y + 1, P[3], 3, 0.4, 8); puff(c, F.x + 5, F.y + 1, P[2], 3, 0.4, 8); });
      at('crum', t, 0.36, () => { for (let k = 0; k < 10; k++) part(c, K.CHUNK, F.x + R.range(-3, 3), F.y + R.range(-1, 1), R.range(4, 16), R.range(-50, 50), R.range(-10, 10), R.range(10, 60), R.range(0.4, 0.55), P[3], R.range(1, 2), { g: 1, bounce: 0.3, drag: 0.5, va: R.range(-14, 14), qf: 1 }); puff(c, F.x, F.y + 1, P[4], 3, 0.35, 6); });
      at('land', t, LAND, () => { land = t; o.knock?.(); o.shake?.(0.5);
        for (let k = 0; k < 16; k++) { const a = R.range(0, TAU), v = R.range(40, 110); part(c, K.CHUNK, F.x + Math.cos(a) * 4, F.y + Math.sin(a) * 2, 3, Math.cos(a) * v, Math.sin(a) * v * 0.45, R.range(50, 120), R.range(0.5, 0.75), P[3], R.range(1.2, 2.6), { g: 1, bounce: 0.35, drag: 0.5, va: R.range(-14, 14), qf: 1 }); }
        for (let k = 0; k < 10; k++) { const a = k / 10 * TAU; puff(c, F.x + Math.cos(a) * 8, F.y + Math.sin(a) * 3, R.pick([P[2], P[3], P[4]]), 3.8, 0.55, 6, { vx: Math.cos(a) * 40, vy: Math.sin(a) * 14 }); } addLight(c, F.x, F.y - 6, 18, P[0], 0.35, 0.12); });
    },
    back(B, L, t) {
      const g = outBack(tm(t, 0.04, 0.16), 2) * (1 - tm(t, 0.34, 0.44)); if (g > 0.03) pillar(B, P, c.X(F.x), c.Y(F.y + 0.5), 20 * g * RES, 11 * RES, 0, 1, t < 0.07);
      if (land >= 0) { const fd = 1 - tm(t, land + 0.55, land + 0.8); if (fd > 0) drawCracks(B, c, cr, tm(t, land, land + 0.1), P[6], P[4], P[7], fd > 0.5 ? 1 : 0.5); const k = tm(t, land, land + 0.32); if (k < 1) gring(B, c, F.x, F.y + 1, 0, 8 + 36 * outCubic(k), 3 * (1 - k) + 1, [P[4], P[3], P[2]], k < 0.7 ? 1 : 0.5, -1); }
    },
    front(B, L, t) { if (land >= 0) { const k = tm(t, land, land + 0.32); if (k < 1) gring(B, c, F.x, F.y + 1, 0, 8 + 36 * outCubic(k), 3 * (1 - k) + 1, [P[4], P[3], P[2]], k < 0.7 ? 1 : 0.5, 1); } },
    end: END,
  };
});
/* p67:scenes:end */
/* p72:scenes:begin */
/* p72 (plan-51): CẢNH VFX CODE cho chiêu linh thú khi đấu như Chấn Thú — cùng khung mẫu pxfx_full (thú 50,84 → đối thủ 128,84), RES 2.
   Mỗi cảnh: gồng 0–0,3 s (tụ hạt ở miệng / thân), tung ở 0,3 s, cú trúng gọi o.hit(p) đúng nhịp; mọi thứ tắt hết khi xong (không lặp quanh thú). */
const SUNC = ['#ffffff', '#fffbe0', '#fff2a0', '#ffd64a', '#f2a52a', '#c9681a', '#7a3a10'].map(H);
function ltFunnel(kind) {   /* phễu xoay quanh đối thủ: 'fire' = Lốc Lửa (Kỳ Lân) · 'sand' = Lốc Cát (Tê Tê). Nửa sau sau lưng, nửa trước mỏng; vòng dưới chân; cuối bung tung */
  return SC((c, at, R, P, o) => {
    const F = { x: c.ax, y: c.ay }, T0 = 0.3, T1 = 1.22, NJ = 10, FR = [P[0], P[1], P[2], P[3], P[4], P[5]], fire = kind === 'fire';
    const funnel = (B, t, fr) => { if (t < T0 || t > T1) return; const g = outCubic(tm(t, T0, T0 + 0.15)) * (1 - tm(t, T1 - 0.12, T1));
      for (let j = 0; j < NJ * g; j++) { const z = j * 3.4, r = 5 + j * 1.6, sp = 12 - j * 0.45;
        for (let d = 0; d < 3; d++) { if (fr && d === 2) continue; const a0 = t * sp + j * 0.7 + d * TAU / 3;
          for (let a = a0; a < a0 + 1.05; a += 0.05) { const sn = Math.sin(a); if ((sn >= 0) !== fr) continue; const X = c.X(F.x + Math.cos(a) * r), Y = c.Y(F.y + sn * r * 0.4, z), hot = a > a0 + 0.9;
            const col = fire ? (hot ? P[0] : j < 3 ? P[1] : j < 7 ? P[2] : P[3]) : (hot ? P[0] : j < 4 ? P[2] : P[1]);
            B.set(X, Y - 1, col); B.set(X, Y, col); B.set(X, Y + 1, fire ? (j > 6 ? P[4] : P[3]) : P[3]); B.set(X + 1, Y, col); if (j > 7) B.set(X, Y + 2, fire ? P[5] : P[4]); } } } };
    return {
      update(t) {
        if (t > 0.06 && t < T0) gather(c, o.C.x + 4, o.C.y, 10, FR.slice(0, 4), 1.2, 12);
        if (t > T0 && t < T1) {
          if (fire) { if (R.chance(0.85)) { const a = R.range(0, TAU), r = R.range(4, 12); flame(c, F.x + Math.cos(a) * r, F.y + Math.sin(a) * r * 0.4, R.range(0, 6), -Math.sin(a) * 40, Math.cos(a) * 14, R.range(30, 60), R.range(0.25, 0.4), R.range(1.2, 2.2), FR, { lift: 40 }); }
            if (R.chance(0.45)) fx(c, F.x + R.range(-10, 10), F.y + R.range(-3, 3), R.range(6, 30), R.range(-30, 30), 0, R.range(30, 60), 0.45, dSpark, { size: 2, g: 0.2, ramp: FR }); }
          else { if (R.chance(0.8)) { const a = R.range(0, TAU); puff(c, F.x + Math.cos(a) * 9, F.y + Math.sin(a) * 3.5, R.pick([P[2], P[3], P[4]]), 2.6, 0.35, 10, { vx: -Math.sin(a) * 36, vy: Math.cos(a) * 14 }); }
            if (R.chance(0.5)) { const a = R.range(0, TAU), r = R.range(6, 14), z = R.range(4, 30); part(c, K.CHUNK, F.x + Math.cos(a) * r, F.y + Math.sin(a) * r * 0.4, z, -Math.sin(a) * 60, Math.cos(a) * 20, R.range(10, 40), R.range(0.3, 0.45), R.pick([P[3], P[4], P[5]]), 1, { g: 0.4 }); } }
        }
        for (const h of [0.45, 0.75, 1.05]) at('h' + h, t, h, () => { o.hit?.(0.5); if (fire) addLight(c, F.x, F.y - 10, 16, P[2], 0.45, 0.12); });
        at('end', t, T1 - 0.05, () => {
          if (fire) { for (let k = 0; k < 14; k++) { const a = R.range(0, TAU), v = R.range(30, 80); flame(c, F.x, F.y + 0.5, R.range(4, 20), Math.cos(a) * v, Math.sin(a) * v * 0.4, R.range(10, 40), R.range(0.3, 0.45), R.range(1.8, 3), FR); }
            sparks(c, 14, F.x, F.y + 0.5, 10, 95, { up: 1.3, g: 0.5, drag: 1.2, ramp: FR, life: 1.2 }); for (let k = 0; k < 4; k++) smokeP(c, F.x + R.range(-8, 8), F.y - 1, R.range(14, 26), R.pick(SMOKE), 3.4, 0.7, 20); }
          else { o.shake?.(0.12); for (let k = 0; k < 10; k++) pebbleHop(c, F.x + R.range(-8, 8), F.y + R.range(-3, 3), 1.2, [P[3], P[4], P[5]]); for (let k = 0; k < 9; k++) { const a = k / 9 * TAU; puff(c, F.x + Math.cos(a) * 6, F.y + Math.sin(a) * 2.5, R.pick([P[1], P[2], P[3]]), 3.4, 0.55, 6, { vx: Math.cos(a) * 55, vy: Math.sin(a) * 22 }); } }
        });
      },
      back(B, L, t) { const k = outCubic(tm(t, T0, T0 + 0.18)) * (1 - tm(t, T1 - 0.1, T1 + 0.15)); if (k > 0) { gring(B, c, F.x, F.y + 1, 0, 13 * k, 2.2, fire ? [P[1], P[3], P[5]] : [P[2], P[3], P[5]], 1, -1); if (fire) L.glow(c.X(F.x), c.Y(F.y, 14), 22, P[2], 0.22 * k); } funnel(B, t, false); },
      front(B, L, t) { const k = outCubic(tm(t, T0, T0 + 0.18)) * (1 - tm(t, T1 - 0.1, T1 + 0.15)); if (k > 0) gring(B, c, F.x, F.y + 1, 0, 13 * k, 2.2, fire ? [P[1], P[3], P[5]] : [P[2], P[3], P[5]], 1, 1); funnel(B, t, true); },
      end: 1.45,
    };
  });
}
FS.nham_loclua = ltFunnel('fire');   /* Lốc Lửa (Kỳ Lân): phễu LỬA, lưỡi lửa cuốn lên, tàn lửa; cuối bung lửa + khói */
FS.chan_loccat = ltFunnel('sand');   /* Lốc Cát (Tê Tê): phễu CÁT, bụi cuộn, sỏi bay vòng; cuối nổ cát + sỏi rơi */
FS.nham_sun = SC((c, at, R, P, o) => {   /* Nắng Gắt (Kỳ Lân): bờm sáng rực tụ lửa → MẶT TRỜI nhỏ bật lên trên đầu, tia nắng xoay toả, vòng nắng loé trên đất lan rộng, hơi nóng bốc lên; tắt hẳn sau ~1,4 s (thời tiết giữ trong engine, không vẽ lặp) */
  const C = o.C, SZ = 44, T0 = 0.3, T1 = 1.35;
  return {
    update(t) {
      if (t > 0.04 && t < T0) gather(c, C.x, C.y, 10, [SUNC[1], SUNC[2], SUNC[3]], 1.4, 14);
      at('pop', t, T0, () => { addLight(c, C.x, C.y - SZ, 26, SUNC[2], 0.7, 0.16); for (let k = 0; k < 16; k++) { const a = k / 16 * TAU; fx(c, C.x + Math.cos(a) * 4, C.y, SZ + Math.sin(a) * 4, Math.cos(a) * 70, 0, Math.sin(a) * 70, 0.32, dSpark, { size: 2, drag: 1.5, ramp: SUNC.slice(0, 5) }); } });
      if (t > T0 && t < T1 && R.chance(0.9)) { const a = R.range(0, TAU), r = R.range(6, 34); fx(c, C.x + Math.cos(a) * r, C.y + Math.sin(a) * r * 0.45, 0, R.range(-4, 4), 0, R.range(16, 34), R.range(0.5, 0.8), dSpark, { size: 2, sway: 6, ramp: [SUNC[2], SUNC[3], SUNC[4], SUNC[5]] }); }
      at('ring2', t, 0.55, () => sparks(c, 10, C.x, C.y + 0.5, 2, 70, { up: 0.6, g: 0.4, drag: 1.6, ramp: SUNC.slice(1, 6), life: 0.9 }));
    },
    back(B, L, t) {
      const k = outCubic(tm(t, T0, T0 + 0.35)), fade = 1 - tm(t, T1 - 0.25, T1); if (t < T0 || fade <= 0) return;
      gring(B, c, C.x, C.y + 1, 0, 5 + 20 * k, 2.4 * fade + 0.5, [SUNC[1], SUNC[3], SUNC[5]], fade > 0.5 ? 1 : 0.55, -1, 0.42);
      L.glow(c.X(C.x), c.Y(C.y, SZ), 30, SUNC[3], 0.3 * fade);
    },
    front(B, L, t) {
      if (t > 0.06 && t < T0 + 0.02) { const k = tm(t, 0.06, T0); orb(B, c.X(C.x), c.Y(C.y, 14), 1 + 3 * k, [SUNC[0], SUNC[2], SUNC[3]], SUNC[5]); }
      const k = outBack(tm(t, T0, T0 + 0.22)), fade = 1 - tm(t, T1 - 0.25, T1); if (t < T0 || fade <= 0) return;
      gring(B, c, C.x, C.y + 1, 0, 5 + 20 * outCubic(tm(t, T0, T0 + 0.35)), 2.4 * fade + 0.5, [SUNC[1], SUNC[3], SUNC[5]], fade > 0.5 ? 1 : 0.55, 1, 0.42);
      const X = c.X(C.x), Y = c.Y(C.y, SZ + 3 * Math.sin(t * 5)), r = 7 * k * (0.6 + 0.4 * fade);
      for (let i = 0; i < 10; i++) { const a = t * 1.6 + i / 10 * TAU, l0 = (r + 3) * RES, l1 = (r + 7 + (i % 2) * 4) * RES * (0.7 + 0.3 * Math.sin(t * 9 + i)); lineT(B, X + Math.cos(a) * l0, Y + Math.sin(a) * l0, X + Math.cos(a) * l1, Y + Math.sin(a) * l1, i % 2 ? SUNC[3] : SUNC[2], fade, SUNC[6]); }
      orb(B, X, Y, Math.max(1, r * RES), [SUNC[0], SUNC[1], SUNC[2], SUNC[3], SUNC[4]], SUNC[6]);
      L.glow(X, Y, (r + 10) * RES, SUNC[2], 0.35 * fade);
    },
    end: 1.5,
  };
});
FS.chan_cuonlan = SC((c, at, R, P, o) => {   /* Cuộn Lăn (Tê Tê): cuộn thành quả cầu vảy lăn tới — vệt bụi + sỏi bắn sau lưng, vạch tốc độ thấp sát đất; va chạm: vòng sóng đất, đá vụn văng, bụi toả, nứt sao */
  const C = o.C, F = { x: c.ax, y: c.ay }, T0 = 0.3, TD = 0.24, TH = T0 + TD, cr = starCrack(R, F.x - 4, F.y + 1, 6, 9);
  return {
    update(t) {
      if (t > 0.06 && t < T0) { if (R.chance(0.6)) puff(c, C.x - 3 + R.range(-3, 3), C.y + 1, R.pick([P[2], P[3]]), 1.8, 0.25, 5); }
      at('go', t, T0, () => { o.shake?.(0.08); for (let k = 0; k < 5; k++) puff(c, C.x - 4, C.y + 1, R.pick([P[2], P[3], P[4]]), 2.6, 0.4, 6, { vx: -50 }); });
      if (t > T0 && t < TH) { const x = o.cx ? o.cx() : C.x; for (let k = 0; k < 2; k++) part(c, K.STREAK, x - 5, C.y + 0.6, R.range(1, 6), -R.range(80, 130), 0, 0, 0.16, R.chance(0.5) ? P[1] : P[2], 1, {});
        if (R.chance(0.8)) puff(c, x - 6, C.y + 1, R.pick([P[2], P[3]]), 2.2, 0.32, 5, { vx: -30 }); if (R.chance(0.5)) pebbleHop(c, x - 4, C.y + 1, 0.7, [P[3], P[4], P[5]]); }
      at('hit', t, TH, () => { o.hit?.(1.3); o.shake?.(0.3); for (let k = 0; k < 10; k++) pebbleHop(c, F.x - 4 + R.range(-4, 4), F.y + R.range(-2, 2), 1.3, [P[3], P[4], P[5]]);
        for (let k = 0; k < 8; k++) { const a = k / 8 * TAU; puff(c, F.x - 4 + Math.cos(a) * 6, F.y + 1 + Math.sin(a) * 2.5, R.pick([P[1], P[2], P[3]]), 3, 0.5, 6, { vx: Math.cos(a) * 55, vy: Math.sin(a) * 20 }); } });
    },
    back(B, L, t) { const k = tm(t, TH, TH + 0.32); if (k > 0 && k < 1) { gring(B, c, F.x - 4, F.y + 1, 0, 6 + 26 * outCubic(k), 2.6, [P[1], P[3], P[5]], k < 0.6 ? 1 : 0.5, -1); drawCracks(B, c, cr, 1, P[6], P[5], P[3], 1 - k * 0.6); } },
    front(B, L, t) {
      if (t > T0 && t < TH + 0.04) { const x = o.cx ? o.cx() : C.x, X = c.X(x), Y = c.Y(C.y, 3); for (let i = 0; i < 4; i++) { const y = Y - i * 3, l = (18 + i * 6) * RES; for (let xx = X - 10 - l; xx <= X - 10; xx++) B.dot(xx, y, i % 2 ? P[1] : P[2], (xx - (X - 10 - l)) / l); } }
      const k = tm(t, TH, TH + 0.32); if (k > 0 && k < 1) gring(B, c, F.x - 4, F.y + 1, 0, 6 + 26 * outCubic(k), 2.6, [P[1], P[3], P[5]], k < 0.6 ? 1 : 0.5, 1);
    },
    end: 1.3,
  };
});
FS.loi_tich = SC((c, at, R, P, o) => {   /* Tích Điện (Hạc): tia lửa điện tụ về thân, 3 cung sét bò quanh mình chập chờn, lông xù sáng, vòng điện loé dưới chân, cuối nổ tia toả (chỉ ~1,2 s) */
  const C = o.C, T0 = 0.3, T1 = 1.15, Z = 9;
  return {
    update(t) {
      if (t > 0.04 && t < T1) gather(c, C.x, C.y, Z, [P[0], P[1], P[2]], t < T0 ? 1.6 : 0.8, 16);
      at('pop', t, T0, () => { o.shake?.(0.06); addLight(c, C.x, C.y - Z, 18, P[1], 0.6, 0.14); });
      for (const h of [0.55, 0.8]) at('b' + h, t, h, () => sparks(c, 6, C.x, C.y, Z, 70, { up: 0.8, g: 0.3, drag: 1.6, ramp: [P[0], P[1], P[2], P[3]], life: 0.8 }));
      at('end', t, T1 - 0.05, () => { sparks(c, 14, C.x, C.y, Z, 110, { up: 1, g: 0.3, drag: 1.4, ramp: [P[0], P[1], P[2], P[3]], life: 1 }); addLight(c, C.x, C.y - Z, 22, P[1], 0.7, 0.14); });
    },
    back(B, L, t) { const k = tm(t, T0, T0 + 0.25), f = 1 - tm(t, T1 - 0.15, T1); if (t < T0 || f <= 0) return; gring(B, c, C.x, C.y + 1, 0, 6 + 10 * outCubic(k), 1.6, [P[0], P[1], P[3]], f, -1); },
    front(B, L, t) {
      const f = 1 - tm(t, T1 - 0.15, T1); if (t < T0 || f <= 0) return; gring(B, c, C.x, C.y + 1, 0, 6 + 10 * outCubic(tm(t, T0, T0 + 0.25)), 1.6, [P[0], P[1], P[3]], f, 1);
      const X = c.X(C.x), Y = c.Y(C.y, Z);
      for (let i = 0; i < 3; i++) { if (R.chance(0.25)) continue; const a0 = t * 7 + i * TAU / 3, a1 = a0 + 1.4, r = 10 * RES; zap(B, R, X + Math.cos(a0) * r, Y + Math.sin(a0) * r * 0.8, X + Math.cos(a1) * r, Y + Math.sin(a1) * r * 0.8, 1.6, 1, P, 3, 0.15, f); }
      L.glow(X, Y, 16 * RES, P[1], 0.28 * f);
    },
    end: 1.3,
  };
});
FS.trieu_tongue = SC((c, at, R, P, o) => {   /* Lưỡi Dính (Cóc): má phồng, LƯỠI hồng vút từ miệng dính chặt đối thủ (giọt nước bắn), giật kéo về rồi thu lưỡi */
  const M = o.M, F = { x: c.ax, y: c.ay }, T0 = 0.3, HIT = 0.42, PULL = 0.62, END = 0.86, FZ = 8;
  const tip = t => { const k = t < HIT ? outCubic(tm(t, T0, HIT)) : t < PULL ? 1 : 1 - outCubic(tm(t, PULL, END)); return { x: lerp(M.x + 2, F.x - 3, k), z: lerp(M.z, FZ, k), k }; };
  return {
    update(t) {
      if (t > 0.06 && t < T0 && R.chance(0.5)) fx(c, M.x + 2, M.y, M.z, R.range(-10, 10), 0, R.range(5, 15), 0.25, dDrop, { size: 1.5, g: 0.6, ramp: [P[0], P[2], P[4]] });
      at('hit', t, HIT, () => { o.hit?.(1); o.shake?.(0.08); splash(c, F.x - 3, F.y, FZ, 10, 0.9); });
      at('pull', t, PULL, () => { o.knock?.(); splash(c, F.x - 3, F.y, FZ, 6, 0.6); });
    },
    front(B, L, t) {
      if (t < T0 || t > END) return; const q = tip(t), x0 = c.X(M.x + 1), y0 = c.Y(M.y, M.z), x1 = c.X(q.x), y1 = c.Y(M.y + (F.y - M.y) * q.k, q.z), n = 10, pts = [];
      for (let i = 0; i <= n; i++) { const u = i / n, sag = Math.sin(u * Math.PI) * (t > HIT && t < PULL ? 3 : 1.5) * RES; pts.push([lerp(x0, x1, u), lerp(y0, y1, u) + sag]); }
      tube(B, pts, u => lerp(2.2, 3.4, u), [TONG[0], TONG[1], TONG[1], TONG[2], TONG[3]], 1); orb(B, x1, y1, 4.5, [TONG[0], TONG[1], TONG[2]], TONG[3]);
    },
    end: 1.1,
  };
});
FS.trieu_rain = SC((c, at, R, P, o) => {   /* Gọi Mưa (Cóc): mây đen tụ trên đầu, MƯA trút xuống cả vùng (vệt mưa xiên, vòng gợn + giọt toé trên đất) ~1,2 s rồi tạnh; thời tiết giữ trong engine 14 s (không vẽ lặp) */
  const C = o.C, CZ = 46, T0 = 0.3, T1 = 1.45, RR = 46;
  const drops = Array.from({ length: 56 }, () => ({ x: R.range(-RR, RR), y: R.range(-RR * 0.45, RR * 0.45), ph: R.range(0, 1), sp: R.range(1.6, 2.4) }));
  return {
    update(t) {
      if (t > 0.04 && t < T0 + 0.2 && R.chance(0.7)) puff(c, C.x + R.range(-20, 20), C.y, R.pick(CLOUD), 4, 0.6, 0, { z: CZ + R.range(-3, 3), vx: R.range(-8, 8), vy: 0, drag: 3 });
      if (t > T0 && t < T1) for (const d of drops) { const u = (t * d.sp + d.ph) % 1; if (u < 0.08 && R.chance(0.5)) splash(c, C.x + d.x, C.y + d.y, 0, 2, 0.35); }
    },
    back(B, L, t) { const k = outCubic(tm(t, 0.05, T0)) * (1 - tm(t, T1 - 0.2, T1)); if (k <= 0) return; for (let i = 0; i < 6; i++) { const X = c.X(C.x - 24 + i * 9.6), Y = c.Y(C.y - 4, CZ + Math.sin(i * 1.7) * 2); orb(B, X, Y, (7 + (i % 3) * 1.5) * RES * k, [CLOUD[0], CLOUD[1], CLOUD[2]], CLOUD[3], 0.92); } },
    front(B, L, t) {
      if (t < T0 || t > T1) return; const f = 1 - tm(t, T1 - 0.2, T1);
      for (const d of drops) { const u = (t * d.sp + d.ph) % 1, z = CZ * (1 - u), X = c.X(C.x + d.x - u * 4), Y = c.Y(C.y + d.y, z); lineT(B, X, Y, X + 2, Y - 9, P[1], 0.9 * f, P[4]);
        if (u > 0.92) gring(B, c, C.x + d.x, C.y + d.y, 0, 1 + 3 * (u - 0.92) / 0.08, 1, [P[0], P[2]], f * 0.8, 0, 0.4); }
    },
    end: 1.6,
  };
});
FS.trieu_phao = SC((c, at, R, P, o) => {   /* Thuỷ Pháo (Cóc, tuyệt chiêu): nước xoáy tụ thành cầu ở miệng → CỘT NƯỚC dày bắn thẳng (lõi trắng, viền sóng, bọt hai mép) 3 nhịp → nổ vương miện nước + mưa giọt */
  const M = o.M, F = { x: c.ax, y: c.ay }, T0 = 0.4, T1 = 1.1, FZ = 9;
  return {
    update(t) {
      if (t > 0.05 && t < T0) gather(c, M.x + 3, M.y, M.z, [P[0], P[1], P[2], P[3]], 1.8, 14);
      for (const h of [0.5, 0.7, 0.9]) at('h' + h, t, h, () => { o.hit?.(h < 0.85 ? 0.45 : 1); o.shake?.(0.15); splash(c, F.x - 3, F.y, FZ, 12, 1.1); });
      at('kn', t, 0.95, () => o.knock?.());
      if (t > T0 && t < T1 && R.chance(0.9)) fx(c, lerp(M.x + 4, F.x - 4, R.range(0, 1)), M.y + R.range(-1, 1), lerp(M.z, FZ, 0.5) + R.range(-4, 4), R.range(-20, 20), R.range(-6, 6), R.range(10, 40), 0.35, dDrop, { size: 1.6, g: 0.8, ramp: [P[0], P[1], P[3]] });
      at('end', t, T1, () => { for (let k = 0; k < 18; k++) { const a = R.range(0, TAU), v = R.range(30, 90); fx(c, F.x - 3, F.y, FZ, Math.cos(a) * v, Math.sin(a) * v * 0.4, R.range(30, 80), 0.6, dDrop, { size: 2, g: 1, ramp: [P[0], P[1], P[3]] }); } });
    },
    back(B, L, t) { const k = tm(t, T0, T0 + 0.1) * (1 - tm(t, T1 - 0.08, T1 + 0.1)); if (k > 0) gring(B, c, F.x - 3, F.y + 1, 0, 8 + 10 * k, 2, [P[0], P[2], P[4]], k, -1); },
    front(B, L, t) {
      if (t > 0.05 && t < T0 + 0.05) { const k = tm(t, 0.05, T0); orb(B, c.X(M.x + 3), c.Y(M.y, M.z), 1 + 5 * k, [P[0], P[1], P[2], P[3]], P[5]); L.glow(c.X(M.x + 3), c.Y(M.y, M.z), 10 * k + 4, P[1], 0.25 * k); }
      const k = tm(t, T0, T0 + 0.1) * (1 - tm(t, T1 - 0.08, T1 + 0.1)); if (k <= 0) return;
      const x0 = c.X(M.x + 3), y0 = c.Y(M.y, M.z), x1 = c.X(F.x - 3), y1 = c.Y(F.y, FZ), w = 3 + 5 * k + Math.sin(t * 40) * 0.6;
      beam(B, x0, y0, x1, y1, w * 0.6, w * RES * 0.9, [H('#ffffff'), P[0], P[1], P[2], P[4]], { a: 1 });
      gring(B, c, F.x - 3, F.y + 1, 0, 8 + 10 * k, 2, [P[0], P[2], P[4]], k, 1); L.glow(x1, y1, 22, P[1], 0.35 * k);
    },
    end: 1.5,
  };
});
/* p72:scenes:end */
/* p96:scenes:begin */
/* p96 — MOLANDAK (mascot Monad, hệ Chấn): cảnh VFX VẼ CODE (skill vfx-code) cho 5 chiêu, 3 dạng (hậu tố '' / 2 / 3 = độ lực Q).
   Bảng màu: gai / ánh sáng = bảng TÍM đo từ sprite Molandak (QP, 8 bậc); đất / bụi / nứt = bảng Chấn của cảnh (P). Mờ bằng dither, tắt gọn, không lặp.
   Mốc: giờ cảnh 0,3 = lúc tung chiêu (khung chạm của clip). Cảnh *b / ult2 tạo lúc chạm (sigScene) — neo ở chân đối thủ. */
const QP = ['#fbf2fb', '#e7b8ee', '#bb54cc', '#a23cba', '#8b17a6', '#6d1a7e', '#4c0d58', '#2a0631'].map(H);
const QLIP = ['#ffd2c2', '#f08a72', '#c8505a', '#8a2a3c'].map(H);
const QQ = { '': 1, '2': 1.35, '3': 1.75 };
/* bản nháp (skill vfx-code): r = Lăn Gai, q = Bắn Gai, u = cú đập tuyệt chiêu — trang so GIF đặt globalThis.__MDKV; game dùng bản em chọn (MDKV0) */
const MDKV0 = { r: 'b', q: 'c', u: 'b' }; const MV96 = k => ((globalThis.__MDKV || {})[k] || MDKV0[k]);
/* gai bay: kim 2 tông (thân tím đậm, đầu trắng) dài L px logic theo hướng (ux, uy) trên mặt phẳng màn (đã tính z) */
function quill(B, X, Y, ux, uy, L, a = 1) { for (let d = 0; d <= L * RES; d += 0.5) { const col = d < 1.5 ? QP[0] : d < L * RES * 0.45 ? QP[4] : QP[5], aa = d > L * RES * 0.7 ? a * (1.25 - d / (L * RES)) : a; B.dot(X - ux * d, Y - uy * d, col, aa); if (d > 1 && d < L * RES * 0.6) { B.dot(X - ux * d - uy, Y - uy * d + ux, QP[6], aa); B.dot(X - ux * d + uy, Y - uy * d - ux, QP[3], aa); } } }
/* chớp gai toả tròn quanh 1 điểm (xù gai): n tia ngắn, dài theo k */
function spikeBurst(B, c, x, y, z, n, r0, r1, k, a = 1, rot = 0) { const X = c.X(x), Y = c.Y(y, z); for (let i = 0; i < n; i++) { const an = rot + i / n * TAU, ux = Math.cos(an), uy = Math.sin(an) * 0.62, ra = r0 * RES, rb = (r0 + (r1 - r0) * k) * RES; for (let d = ra; d <= rb; d += 0.5) B.dot(X + ux * d, Y + uy * d, d > rb - 1.5 ? QP[0] : d > rb - 4 ? QP[2] : QP[4], a); } }
/* dấu tức giận (gân chữ thập 4 góc) màu đỏ trên đầu đối thủ — tĩnh, chỉ nở / co theo k */
function anger(B, X, Y, s, a = 1) { const g = 2 * s, r = 6 * s; for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const ox = X + sx * (g + r), oy = Y + sy * (g + r); for (let an = 0; an <= Math.PI / 2; an += 0.04) { const ux = -sx * Math.cos(an), uy = -sy * Math.sin(an); for (let w = -1.5; w <= 1.5; w += 0.5) B.dot(ox + ux * (r + w), oy + uy * (r + w), w > 0.9 ? QLIP[3] : w < -0.9 ? QLIP[1] : QLIP[2], a); } } return;  const q = Math.max(1, Math.round(3 * s)); for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const cx = X + sx * (q + 1), cy = Y + sy * (q + 1); for (let i = 0; i <= q * 2; i++) { B.dot(cx - sx * i * 0.5, cy, i < 2 ? QLIP[0] : QLIP[2], a); B.dot(cx, cy - sy * i * 0.5, i < 2 ? QLIP[0] : QLIP[2], a); B.dot(cx - sx * i * 0.5 + sx, cy + sy, QLIP[3], a); } } }
function mkMdk(suf) {
  const Q = QQ[suf];
  /* 1. LĂN GAI HÚC — cuộn tròn: bụi xoáy dưới chân + gai loé; lăn: vệt bụi sát đất, sỏi bắn sau lưng, vụn gai tím văng (theo thân đang lăn o.cx()) */
  FS['chan_mdk1' + suf] = SC((c, at, R, P, o) => {
    const C = o.C, T0 = 0.3, END = 1.25;
    return {
      update(t) {
        if (t > 0.08 && t < T0) { if (R.chance(0.7)) puff(c, C.x + R.range(-5, 5), C.y + 1, R.pick([P[2], P[3]]), 1.6, 0.25, 4, { vx: R.range(-20, 20) }); }
        at('glint', t, 0.2, () => star(c, C.x + 2, C.y, 9, QP[1], 2.2, 0.14));
        at('go', t, T0, () => { o.shake?.(0.06 * Q); for (let k = 0; k < 4 + 2 * Q; k++) puff(c, C.x - 4, C.y + 1, R.pick([P[2], P[3], P[4]]), 2.4, 0.4, 6, { vx: -R.range(30, 70) }); });
        if (t > T0 && t < 1.05) { const x = o.cx ? o.cx() : C.x;
          if (R.chance(0.75)) puff(c, x - 6, C.y + 1, R.pick([P[2], P[3]]), 2 + 0.3 * Q, 0.3, 5, { vx: -30 });
          if (R.chance(0.35 * Q)) pebbleHop(c, x - 4, C.y + 1, 0.7, [P[3], P[4], P[5]]);
          if (MV96('r') !== 'c' && R.chance(0.3 * Q)) part(c, K.SHARD, x - 3, C.y + R.range(-1, 1), R.range(4, 9), -R.range(30, 80), R.range(-20, 20), R.range(30, 70), R.range(0.3, 0.45), R.pick([QP[3], QP[4], QP[5]]), R.range(1.5, 2.5), { g: 1, drag: 0.5, bounce: 0.3, va: R.range(-16, 16) });
          for (let k = 0; k < 2; k++) part(c, K.STREAK, x - 6, C.y + 0.5, R.range(1, 5), -R.range(80, 130), 0, 0, 0.14, R.chance(0.5) ? P[2] : P[3], 1, {}); }
      },
      front(B, L, t) { if (MV96('r') === 'b' && t > T0 && t < 1.05) { const x = o.cx ? o.cx() : C.x, X = c.X(x), Y = c.Y(C.y, 6), r = 8 * RES + 2, sp = t * 26; for (let i = 0; i < 2; i++) crescent(B, X, Y, r, sp + i * Math.PI, 3, [QP[0], QP[2], QP[5]], 0.85, 0.9); } },
      over: t => t > END,
    };
  });
  /* 1b. chạm: chớp tím-trắng + vụn gai toả hình quạt về phía trước + vòng sóng đất + nứt sao nhỏ */
  FS['chan_mdk1b' + suf] = SC((c, at, R, P, o) => {
    const F = { x: c.ax, y: c.ay }, cr = starCrack(R, F.x - 3, F.y + 1, 5 + Math.round(Q), 7 + 2 * Q);
    return {
      update(t) {
        at('hit', t, 0, () => { o.hit?.(1.2 + 0.2 * Q); o.shake?.(0.18 * Q); star(c, F.x - 5, F.y, 9, QP[0], 2.6 + Q * 0.4, 0.14); addLight(c, F.x - 4, F.y - 8, 12, QP[1], 0.35, 0.1);
          for (let k = 0; k < 6 + 4 * Q; k++) { const an = R.range(-1.1, 1.1); part(c, K.SHARD, F.x - 4, F.y + R.range(-1, 1), R.range(5, 11), Math.cos(an) * R.range(70, 140), Math.sin(an) * R.range(20, 50), R.range(30, 80), R.range(0.35, 0.55), R.pick([QP[2], QP[3], QP[4], QP[5]]), R.range(1.8, 3), { g: 1, drag: 0.5, bounce: 0.3, va: R.range(-16, 16) }); }
          for (let k = 0; k < 5 + 2 * Q; k++) pebbleHop(c, F.x - 3 + R.range(-3, 3), F.y + R.range(-1.5, 1.5), 1.1, [P[3], P[4], P[5]]);
          for (let k = 0; k < 6; k++) { const a = k / 6 * TAU; puff(c, F.x - 3 + Math.cos(a) * 5, F.y + 1 + Math.sin(a) * 2, R.pick([P[2], P[3]]), 2.6, 0.45, 5, { vx: Math.cos(a) * 45, vy: Math.sin(a) * 16 }); } });
      },
      back(B, L, t) { const k = tm(t, 0, 0.3); if (k > 0 && k < 1) { gring(B, c, F.x - 3, F.y + 1, 0, 5 + (14 + 6 * Q) * outCubic(k), 2.2, [P[1], P[3], P[5]], k < 0.6 ? 1 : 0.5, -1); drawCracks(B, c, cr, 1, P[6], P[5], P[3], 1 - k * 0.7); } },
      front(B, L, t) { const k = tm(t, 0, 0.3); if (k > 0 && k < 1) gring(B, c, F.x - 3, F.y + 1, 0, 5 + (14 + 6 * Q) * outCubic(k), 2.2, [P[1], P[3], P[5]], k < 0.6 ? 1 : 0.5, 1); },
      end: 0.9,
    };
  });
  /* 2. BẮN GAI QUẠT — gồng: gai lưng rung + chấm sáng tụ ở đỉnh lưng (o.M); 0,3: bắn N kim hình quạt từ đỉnh lưng (gốc có chớp), kim giữa cắm vào đối thủ, kim rìa bay qua tắt dần */
  FS['chan_mdk2' + suf] = SC((c, at, R, P, o) => {
    const M = o.M, F = { x: c.ax, y: c.ay }, T0 = 0.3, N = suf === '3' ? 7 : 5, V = 300, Z1 = 7, qs = [];
    for (let i = 0; i < N; i++) { const s = i - (N - 1) / 2, ty = F.y + s * 9, tx = F.x + Math.abs(s) * 6 + (Math.abs(s) >= 2 ? 30 : 0), d = Math.hypot(tx - M.x, ty - M.y) || 1; qs.push({ s, x0: M.x, y0: M.y, z0: M.z, tx, ty, d, T: d / V, hitC: Math.abs(s) < 1.5, d0: MV96('q') === 'c' ? Math.abs(s) * 0.035 : 0 }); }
    const ARC = MV96('q') === 'b' ? 12 : 4, TR = MV96('q') === 'b' ? 22 : 14;
    return {
      update(t) {
        if (t > 0.05 && t < T0 && R.chance(0.5)) part(c, K.STAR, M.x + R.range(-4, 2), M.y + R.range(-1, 1), M.z + R.range(-2, 3), 0, 0, 0, 0.12, QP[1], 0.8);
        at('flash', t, T0, () => { star(c, M.x, M.y, M.z, QP[0], 2.4 + 0.3 * Q, 0.12); addLight(c, M.x, M.y - M.z, 8, QP[1], 0.3, 0.1); o.shake?.(0.05); });
        for (const q of qs) if (q.hitC) at('h' + q.s, t, T0 + q.d0 + q.T, () => { o.hit?.(q.s === 0 ? 1 : 0.4); star(c, F.x - 3, F.y + q.s * 2, 8, QP[0], 1.8, 0.1);
          for (let k = 0; k < 3; k++) part(c, K.SHARD, F.x - 3, F.y + q.s * 2, R.range(5, 10), -R.range(30, 70), R.range(-30, 30), R.range(20, 60), R.range(0.3, 0.45), R.pick([QP[3], QP[4], QP[5]]), R.range(1.5, 2.2), { g: 1, drag: 0.5, bounce: 0.3, va: R.range(-16, 16) }); });
      },
      front(B, L, t) {
        if (t > 0.05 && t < T0 + 0.02) { const k = tm(t, 0.05, T0); spikeBurst(B, c, M.x - 3, M.y, M.z - 3, 7, 4, 4 + 3 * k, k, 0.7 + 0.3 * k, t * 6); }
        for (const q of qs) { const u = (t - T0 - q.d0) / q.T; if (u <= 0) continue; const stopAt = q.hitC ? 1 : 1.25; if (u > stopAt + (q.hitC ? 0.35 : 0)) continue;
          const uu = Math.min(u, stopAt), x = lerp(q.x0, q.tx, uu), y = lerp(q.y0, q.ty, uu), z = lerp(q.z0, Z1, uu) + Math.sin(Math.min(1, uu) * Math.PI) * ARC, X = c.X(x), Y = c.Y(y, z);
          const dx = c.X(q.tx) - c.X(q.x0), dy = c.Y(q.ty, Z1) - c.Y(q.y0, q.z0), dl = Math.hypot(dx, dy) || 1, a = u > 1 ? (q.hitC ? (u < 1.2 ? 1 : 0.5) : Math.max(0, 1 - (u - 1) / 0.25)) : 1;
          quill(B, X, Y, dx / dl, dy / dl, 6 + Q, a);
          if (u < 1) for (let d = 6 + Q; d < TR; d++) B.dot(X - dx / dl * d * RES, Y - dy / dl * d * RES, QP[2], 0.45 * (1 - d / TR)); }
      },
      end: 1.15,
    };
  });
  /* 3. TRỀ MÔI KHINH KHỈNH — 0,3: 2 làn hơi 'hừ' cuộn ra từ môi (o.M), chấm lấp lánh khinh khỉnh ở mắt; đối thủ: dấu tức giận đỏ nở trên đầu 0,6 s rồi co tắt */
  FS['chan_mdk3' + suf] = SC((c, at, R, P, o) => {
    const M = o.M, F = { x: c.ax, y: c.ay }, T0 = 0.3, HZ = 26;
    return {
      update(t) {
        at('puff', t, T0, () => { for (let k = 0; k < 3 + Q; k++) puff(c, M.x + 1 + k * 2, M.y + R.range(-1, 1), R.pick([QP[1], QP[2], QP[1]]), 1.1 + k * 0.3, 0.55, 2, { z: M.z - 1, vx: R.range(30, 55), vy: R.range(-5, 5), drag: 3 });
          star(c, M.x - 3, M.y, M.z + 4, QP[0], 1.6, 0.18); });
        at('mad', t, T0 + 0.18, () => { o.hit?.(0.3); for (let k = 0; k < 4; k++) puff(c, F.x + R.range(-6, 6), F.y + R.range(-1, 1), QLIP[2], 1.4, 0.4, 14, { z: HZ - 6, vx: R.range(-14, 14), drag: 2.5 }); });
      },
      front(B, L, t) { const k = tm(t, T0 + 0.18, T0 + 0.3), e = tm(t, T0 + 0.85, T0 + 1.0); if (k > 0 && e < 1) { const s = (0.5 + 0.7 * outBack(k)) * (1 - e) * (0.9 + 0.15 * Q); if (s > 0.15) anger(B, c.X(F.x + 6), c.Y(F.y, HZ), s, 1); } },
      end: 1.45,
    };
  });
  /* 4. CUỘN GAI THỦ — 0,3: cuộn tròn, gai xù toả ra 1 lần (chớp tím-trắng) + vòng bụi đất; KHÔNG lớp lặp trong lúc thủ */
  FS['chan_mdk4' + suf] = SC((c, at, R, P, o) => {
    const C = o.C, T0 = 0.3, cz = 6;
    return {
      update(t) { at('go', t, T0, () => { o.shake?.(0.05); for (let k = 0; k < 6; k++) { const a = k / 6 * TAU; puff(c, C.x + Math.cos(a) * 6, C.y + 1 + Math.sin(a) * 2, R.pick([P[2], P[3]]), 2.2, 0.4, 4, { vx: Math.cos(a) * 35, vy: Math.sin(a) * 12 }); } addLight(c, C.x, C.y - cz, 10, QP[1], 0.3, 0.12); }); },
      back(B, L, t) { const k = tm(t, T0, T0 + 0.22); if (k > 0 && k < 1) gring(B, c, C.x, C.y + 1, 0, 6 + 12 * outCubic(k), 1.6, [P[2], P[4]], k < 0.6 ? 1 : 0.5, -1); },
      front(B, L, t) { const k = tm(t, T0, T0 + 0.18); if (k > 0 && k < 1) spikeBurst(B, c, C.x, C.y, cz, 10 + 2 * Q, 7, 11 + 2 * Q, outCubic(k), k < 0.6 ? 1 : 1.4 - k, 0.3); const k2 = tm(t, T0, T0 + 0.22); if (k2 > 0 && k2 < 1) gring(B, c, C.x, C.y + 1, 0, 6 + 12 * outCubic(k2), 1.6, [P[2], P[4]], k2 < 0.6 ? 1 : 0.5, 1); },
      end: 0.8,
    };
  });
  /* 4b. phản đòn (đối thủ đánh cận chiến vào cầu gai): kim tím đâm ngược vào kẻ đánh + chớp */
  FS['chan_mdk4b' + suf] = SC((c, at, R, P, o) => {
    const F = { x: c.ax, y: c.ay };
    return {
      update(t) { at('hit', t, 0, () => { o.hit?.(0.6); star(c, F.x - 2, F.y, 8, QP[0], 2.2, 0.12); for (let k = 0; k < 5 + 2 * Q; k++) part(c, K.SHARD, F.x - 6, F.y + R.range(-2, 2), R.range(4, 10), R.range(40, 110), R.range(-30, 30), R.range(20, 60), R.range(0.3, 0.45), R.pick([QP[2], QP[3], QP[4]]), R.range(1.6, 2.4), { g: 1, drag: 0.5, bounce: 0.3, va: R.range(-16, 16) }); }); },
      front(B, L, t) { const k = tm(t, 0, 0.12), e = tm(t, 0.16, 0.3); if (k > 0 && e < 1) for (let i = -1; i <= 1; i++) quill(B, c.X(F.x - 14 + 10 * outCubic(k)), c.Y(F.y + i * 3, 8 + i * 2), 1, 0, 5 + Q, 1 - e); },
      end: 0.6,
    };
  });
  /* 5. TUYỆT CHIÊU — CẦU GAI VƯỢT ẢI: tụ lực (bụi xoáy vào chân, nứt dưới thân, chấm sáng tím quay quanh) → lăn (engine) */
  FS['chan_mdk' + suf + 'ult'] = SC((c, at, R, P, o) => {
    const C = o.C, T0 = 0.4, cr = starCrack(R, C.x, C.y + 1, 5, 8 + 2 * Q);
    return {
      update(t) {
        if (t < T0) { const a = t * 14; if (R.chance(0.8)) puff(c, C.x + Math.cos(a) * 12, C.y + 1 + Math.sin(a) * 4, R.pick([P[2], P[3], P[4]]), 1.8, 0.3, 4, { vx: -Math.cos(a) * 40, vy: -Math.sin(a) * 14 }); if (R.chance(0.5)) part(c, K.STAR, C.x + Math.cos(-a) * 9, C.y + Math.sin(-a) * 3, R.range(3, 9), 0, 0, 0, 0.12, QP[1], 0.8); }
        at('go', t, T0, () => { o.shake?.(0.12 * Q); o.flash?.(0.06); star(c, C.x, C.y, 7, QP[0], 3, 0.14); for (let k = 0; k < 8; k++) pebbleHop(c, C.x + R.range(-4, 4), C.y + R.range(-1, 1.5), 1.2, [P[3], P[4], P[5]]); });
      },
      back(B, L, t) { if (t > 0.1) { const fd = 1 - tm(t, 0.9, 1.3); if (fd > 0) drawCracks(B, c, cr, tm(t, 0.1, T0), P[6], P[4], P[7], fd > 0.5 ? 1 : 0.5); } },
      end: 1.3,
    };
  });
  /* 5b. cú đập kết thúc: nứt sao lớn, 2 vòng sóng đất, VÒNG KIM TÍM toả tròn (12–20 kim) bay ra rồi rơi cắm đất tắt dần, đá vụn nảy, mây bụi, chớp sáng */
  FS['chan_mdk' + suf + 'ult2'] = SC((c, at, R, P, o) => {
    const F = { x: c.ax, y: c.ay }, NQ = Math.round(10 + 4 * Q), cr = starCrack(R, F.x, F.y + 1, 8, 16 + 4 * Q), qs = [];
    const UV = MV96('u'); for (let i = 0; i < NQ; i++) { const an = i / NQ * TAU + R.range(-0.12, 0.12), v = (UV === 'b' ? R.range(25, 55) : R.range(70, 110)) * (0.85 + 0.15 * Q); qs.push({ an, v, z0: R.range(4, 10), vz: UV === 'b' ? R.range(120, 170) : R.range(40, 80), l: UV === 'b' ? R.range(0.8, 1.0) : R.range(0.45, 0.6), r: R.range(12, 22 + 4 * Q) }); }
    return {
      update(t) {
        at('slam', t, 0, () => { o.hit?.(1.6 + 0.2 * Q); o.knock?.(); o.shake?.(0.35 + 0.1 * Q); o.flash?.(0.1); star(c, F.x, F.y, 6, QP[0], 3.4 + 0.4 * Q, 0.16); addLight(c, F.x, F.y - 6, 16 + 4 * Q, QP[1], 0.4, 0.14);
          for (let k = 0; k < 10 + 4 * Q; k++) { const a = R.range(0, TAU), v = R.range(40, 110); part(c, K.CHUNK, F.x + Math.cos(a) * 4, F.y + Math.sin(a) * 2, 3, Math.cos(a) * v, Math.sin(a) * v * 0.45, R.range(50, 120), R.range(0.5, 0.75), P[3], R.range(1.2, 2.4), { g: 1, bounce: 0.35, drag: 0.5, va: R.range(-14, 14), qf: 1 }); }
          for (let k = 0; k < 10; k++) { const a = k / 10 * TAU; puff(c, F.x + Math.cos(a) * 9, F.y + Math.sin(a) * 3.5, R.pick([P[2], P[3], P[4]]), 3.6, 0.55, 6, { vx: Math.cos(a) * 42, vy: Math.sin(a) * 15 }); } });
      },
      back(B, L, t) { const fd = 1 - tm(t, 0.9, 1.3); if (fd > 0) drawCracks(B, c, cr, tm(t, 0, 0.12), P[6], P[4], P[7], fd > 0.5 ? 1 : 0.5);
        for (const [t0, R0, th] of [[0, 24 + 6 * Q, 3], [0.12, 34 + 7 * Q, 2]]) { const k = tm(t, t0, t0 + 0.38); if (k > 0 && k < 1) gring(B, c, F.x, F.y + 1, 0, 6 + R0 * outCubic(k), th, [P[1], P[3], P[5]], k < 0.6 ? 1 : 0.5, -1); } },
      front(B, L, t) {
        for (const [t0, R0, th] of [[0, 24 + 6 * Q, 3], [0.12, 34 + 7 * Q, 2]]) { const k = tm(t, t0, t0 + 0.38); if (k > 0 && k < 1) gring(B, c, F.x, F.y + 1, 0, 6 + R0 * outCubic(k), th, [P[1], P[3], P[5]], k < 0.6 ? 1 : 0.5, 1); }
        if (UV === 'c') { for (const q of qs) { const k = tm(t, 0.02, 0.12), e = tm(t, 0.55, 0.8); if (k <= 0 || e >= 1) continue; const h = (6 + 3 * Q) * outBack(k) * (1 - e), X = c.X(F.x + Math.cos(q.an) * q.r), Y0 = c.Y(F.y + Math.sin(q.an) * q.r * 0.5, 0); if (h > 0.5) quill(B, X, c.Y(F.y + Math.sin(q.an) * q.r * 0.5, h), 0, -1, h, 1); B.dot(X, Y0, P[6]); B.dot(X + 1, Y0, P[6]); } return; }
        for (const q of qs) { const tt = Math.min(t, q.l); if (t > q.l + 0.35) continue; const x = F.x + Math.cos(q.an) * q.v * tt, y = F.y + Math.sin(q.an) * q.v * tt * 0.5, z = Math.max(0, q.z0 + q.vz * tt - 150 * tt * tt);
          const vx = Math.cos(q.an), vy = Math.sin(q.an) * 0.5, vzz = q.vz - 300 * tt, sx = vx * q.v * RES, sy = (vy * q.v - vzz) * RES, sl = Math.hypot(sx, sy) || 1, a = t > q.l ? 1 - (t - q.l) / 0.35 : 1;
          quill(B, c.X(x), c.Y(y, z), sx / sl, sy / sl, 5 + Q, a); }
      },
      end: 1.4,
    };
  });
}
for (const s of ['', '2', '3']) mkMdk(s);
/* p96:scenes:end */
/* p99:scenes:begin */
/* p99 — MOYAKI (mascot Monad, hệ Triều): cảnh VFX VẼ CODE (skill vfx-code) cho 5 chiêu, 3 dạng (hậu tố '' / 2 / 3 = độ lực Q).
   Bảng màu: NƯỚC = bảng Triều của cảnh (P, đo từ ô nước game zones/m1/wang); môi / mồ hôi / lấp lánh = bảng riêng đo từ sprite Moyaki (YP, YLIP).
   Mờ bằng dither, tắt gọn, KHÔNG lớp lặp (luật 22/09, 10/10). Mốc: giờ cảnh 0,3 = lúc tung chiêu (tuyệt chiêu 0,4). Cảnh *b / ult2 tạo lúc chạm (sigScene) — neo ở chân đối thủ. */
const YP = ['#fbf6ff', '#e4d9fb', '#a189e2', '#7a54a6', '#cc62a0', '#943b69', '#26173d'].map(H);
const YQ = { '': 1, '2': 1.3, '3': 1.6 };
/* bản nháp (skill vfx-code): d = vệt trượt Quẫy Vây, b = bong bóng, u = thác tuyệt chiêu — trang so GIF đặt globalThis.__MYKV; game dùng bản em chọn (MYKV0) */
const MYKV0 = { d: 'b', b: 'a', u: 'b' }; const MV99 = k => ((globalThis.__MYKV || {})[k] || MYKV0[k]);
/* bong bóng nước r (điểm đệm): viền 2 tông, chấm sáng góc trên-trái; half = chỉ nửa trên/dưới */
function ybub(B, P, X, Y, r, a = 1) { const n = Math.max(8, Math.ceil(r * 7)); for (let i = 0; i < n; i++) { const an = i / n * TAU, s = Math.sin(an), cx = Math.cos(an); B.dot(X + cx * r, Y + s * r, an > 3.4 && an < 4.9 ? P[0] : s > 0.5 ? P[5] : P[3], a); if (r > 2.5) B.dot(X + cx * (r - 1), Y + s * (r - 1), s > 0.5 ? P[4] : P[1], a * 0.8); }
  if (r > 2.5) for (let y = -r + 1; y < r; y++) for (let x = -r + 1; x < r; x++) if (x * x + y * y < (r - 1.5) * (r - 1.5) && bayer(X + x, Y + y) < 0.12) B.dot(X + x, Y + y, P[2], a); B.dot(X - r * 0.45, Y - r * 0.5, P[0], a); B.dot(X - r * 0.45 + 1, Y - r * 0.5, P[0], a); }
/* giọt mồ hôi (meme) — tĩnh, chỉ nở/co theo s */
function sweat(B, P, X, Y, s, a = 1) { const h = Math.max(3, Math.round(7 * s)), w = Math.max(2, Math.round(4 * s)); for (let y = 0; y <= h; y++) { const hw = y < h * 0.45 ? (y / (h * 0.45)) * w * 0.5 : w * 0.5 * Math.sqrt(Math.max(0, 1 - ((y - h * 0.45) / (h * 0.55)) ** 2)) + (y < h * 0.8 ? 0.5 : 0); for (let x = -Math.ceil(hw) - 1; x <= Math.ceil(hw) + 1; x++) { const inn = Math.abs(x) <= hw; if (!inn) { if (Math.abs(x) <= hw + 1) B.dot(X + x, Y + y, P[6], a); continue; } B.dot(X + x, Y + y, x < -hw * 0.2 && y > h * 0.3 && y < h * 0.7 ? P[0] : x > hw * 0.4 ? P[4] : P[2], a); } } B.dot(X, Y - 1, P[6], a); B.dot(X, Y + h + 1, P[6], a); }
/* lấp lánh 4 cánh (liếc) */
function glint(B, X, Y, n, col, a = 1) { for (let i = -n; i <= n; i++) { B.dot(X + i, Y, Math.abs(i) < 2 ? YP[0] : col, a); B.dot(X, Y + i, Math.abs(i) < 2 ? YP[0] : col, a); } B.dot(X + 1, Y + 1, col, a * 0.6); B.dot(X - 1, Y - 1, col, a * 0.6); }
/* thác nước đứng chảy NGƯỢC (vượt vũ môn): cột rộng w logic, cao h, vạch nước chạy lên theo t */
function upfall(B, P, X, Y0, w, h, t, a = 1, white = false) { const W = Math.round(w * RES), Hh = Math.round(h * RES); if (Hh < 2) return;
  for (let y = 0; y < Hh; y++) { const taper = y > Hh - 6 ? (Hh - y) / 6 : 1, hw = Math.max(1, W * 0.5 * (0.75 + 0.25 * taper) + Math.sin(y * 0.35 - t * 18) * 1.2);
    for (let x = -Math.ceil(hw); x <= Math.ceil(hw); x++) { const u = Math.abs(x) / hw; if (u > 1) continue; const s = ((y + t * 90 + (x & 3) * 3) % 14 + 14) % 14;
      const col = u > 0.86 ? P[5] : white ? P[0] : s < 2 ? P[0] : u < 0.3 ? P[1] : u < 0.62 ? P[2] : P[3]; B.dot(X + x, Y0 - y, col, a); } }
  for (let i = 0; i < 6; i++) { const ox = Math.round((i - 2.5) * W / 5), oy = Math.round(Math.sin(t * 20 + i) * 2); B.dot(X + ox, Y0 - Hh - 1 + oy, P[0], a); B.dot(X + ox + 1, Y0 - Hh + oy, P[1], a); } }
function mkMyk(suf) {
  const Q = YQ[suf];
  /* 1. QUẪY VÂY LƯỚT — 0,3: ngã bụng bắn nước; lướt: nước toé sau đuôi + VỆT NƯỚC trên đất (vũng dither, tắt sau ~1 s) theo thân đang lướt o.cx() */
  FS['trieu_myk1' + suf] = SC((c, at, R, P, o) => {
    const C = o.C, T0 = 0.3, END = 1.9, trail = [];
    return {
      update(t) {
        at('go', t, T0, () => { o.shake?.(0.05 * Q); splash(c, C.x - 3, C.y + 0.5, 3, 8 + Math.round(3 * Q), 0.7); });
        if (t > T0 && t < 1.05) { const x = o.cx ? o.cx() : C.x;
          if (!trail.length || Math.abs(trail[trail.length - 1].x - x) > 5) trail.push({ x, t });
          if (R.chance(0.8)) fx(c, x - 7, C.y + R.range(-1, 1), 2, -R.range(30, 70), R.range(-10, 10), R.range(30, 60), 2, dDrop, { g: 1, drag: 0.4, col: R.chance(0.4) ? P[0] : P[1], c2: P[4], onLand: (cc, p) => { p.draw = dCrown; p.life = p.max = 0.16; } });
          if (MV99('d') !== 'a') for (let k = 0; k < 2; k++) part(c, K.STREAK, x - 6, C.y + 0.5, R.range(1, 4), -R.range(80, 130), 0, 0, 0.14, R.chance(0.5) ? P[0] : P[1], 1, {}); }
      },
      back(B, L, t) { for (const q of trail) { const age = t - q.t; if (age > 1.05) continue; const fd = 1 - tm(age, 0.6, 1.05), X = c.X(q.x), Y = c.Y(C.y + 0.5);
        ditherOval(B, X, Y, 4.5 * RES, 1.6 * RES, P[4], fd > 0.5 ? 0.55 : 0.28); ellipse(B, X, Y - 1, 3.2 * RES, 1 * RES, P[1], fd > 0.5 ? 0.7 : 0.35, -1); } },
      end: END,
    };
  });
  /* 1b. chạm: vương miện nước toé + vòng nước + bọt */
  FS['trieu_myk1b' + suf] = SC((c, at, R, P, o) => {
    const F = { x: c.ax, y: c.ay };
    return {
      update(t) { at('hit', t, 0, () => { o.hit?.(1.1 + 0.2 * Q); o.shake?.(0.16 * Q); star(c, F.x - 5, F.y, 9, P[0], 2.4 + 0.3 * Q, 0.12); splash(c, F.x - 4, F.y + 0.5, 8, 12 + Math.round(5 * Q), 1);
        for (let k = 0; k < 6; k++) { const a = k / 6 * TAU; puff(c, F.x - 3 + Math.cos(a) * 5, F.y + 1 + Math.sin(a) * 2, P[0], 2.2, 0.35, 5, { vx: Math.cos(a) * 40, vy: Math.sin(a) * 14 }); } }); },
      back(B, L, t) { const k = tm(t, 0, 0.32); if (k > 0 && k < 1) gring(B, c, F.x - 3, F.y + 1, 0, 5 + (13 + 5 * Q) * outCubic(k), 2, [P[0], P[2], P[4]], k < 0.6 ? 1 : 0.5, -1); },
      front(B, L, t) { const k = tm(t, 0, 0.32); if (k > 0 && k < 1) gring(B, c, F.x - 3, F.y + 1, 0, 5 + (13 + 5 * Q) * outCubic(k), 2, [P[0], P[2], P[4]], k < 0.6 ? 1 : 0.5, 1); },
      end: 0.8,
    };
  });
  /* 2. BONG BÓNG TRỀ MÔI — gồng: bọt nhỏ tụ ở MÔI (o.M); từ 0,3: N bóng phồng ở môi rồi bay lượn sóng tới đối thủ, tới đúng giờ trúng engine (0,58 + 0,12 i) thì vỡ toé */
  FS['trieu_myk2' + suf] = SC((c, at, R, P, o) => {
    const M = o.M, F = { x: c.ax, y: c.ay }, T0 = 0.3, N = suf === '3' ? 4 : 3, FZ = 8, bs = [];
    for (let i = 0; i < N; i++) bs.push({ i, t0: T0 + 0.07 * i, t1: 0.58 + 0.12 * i, dy: (i - (N - 1) / 2) * 3, r: (i === N - 1 ? 4.5 : 3.5) * (0.9 + 0.1 * Q), w: R.range(5, 9) * (i % 2 ? 1 : -1) });
    return {
      update(t) {
        if (t > 0.05 && t < T0 && R.chance(0.5)) fx(c, M.x + R.range(1, 4), M.y + R.range(-1, 1), M.z + R.range(-1, 2), R.range(-6, 6), 0, R.range(6, 14), 0.3, (B, L, cc, p, x, y, k) => ybub(B, P, x, y, p.size, 1), { size: 1.5 });
        for (const b of bs) at('h' + b.i, t, b.t1, () => { o.hit?.(b.i === N - 1 ? 1 : 0.45); splash(c, F.x - 3, F.y + b.dy * 0.4, FZ, b.i === N - 1 ? 14 : 7, b.i === N - 1 ? 1 : 0.6);
          for (let k = 0; k < 5; k++) { const a = k / 5 * TAU; fx(c, F.x - 3 + Math.cos(a) * 3, F.y + b.dy * 0.4, FZ + Math.sin(a) * 3, Math.cos(a) * 30, 0, Math.sin(a) * 30, 0.25, (B, L, cc, p, x, y, k2) => { B.dot(x, y, P[0]); B.dot(x + 1, y, P[1]); }, {}); } });
      },
      front(B, L, t) {
        for (const b of bs) { if (t < b.t0 || t > b.t1) continue; const u = tm(t, b.t0, b.t1), grow = MV99('b') === 'b' ? 1 : outBack(tm(t, b.t0, b.t0 + 0.08), 1.6),
            x = lerp(M.x + 3, F.x - 4, u), y = lerp(M.y, F.y + b.dy * 0.4, u) + Math.sin(u * Math.PI * 2) * b.w * 0.18, z = lerp(M.z, FZ, u) + Math.sin(u * Math.PI) * 6 + Math.sin(u * 9 + b.i) * 1.5;
          ybub(B, P, c.X(x), c.Y(y, z), b.r * RES * 0.8 * Math.max(0.3, grow), 1); }
      },
      end: 0.58 + 0.12 * (N - 1) + 0.45,
    };
  });
  /* 3. LIẾC KHINH KHỈNH — 0,3: lấp lánh khinh khỉnh ở mắt (trên môi o.M); đối thủ: GIỌT MỒ HÔI to nở cạnh đầu 0,7 s rồi co tắt (tĩnh, không lặp) */
  FS['trieu_myk3' + suf] = SC((c, at, R, P, o) => {
    const M = o.M, F = { x: c.ax, y: c.ay }, T0 = 0.3, HZ = 24;
    return {
      update(t) { at('mad', t, T0 + 0.16, () => { o.hit?.(0.25); }); },
      front(B, L, t) { const g = tm(t, T0 - 0.05, T0 + 0.06), ge = tm(t, T0 + 0.22, T0 + 0.36); if (g > 0 && ge < 1) glint(B, c.X(M.x - 2), c.Y(M.y, M.z + 5), Math.round(2 + 3 * g * (1 - ge)), YP[2], 1);
        const k = tm(t, T0 + 0.16, T0 + 0.28), e = tm(t, T0 + 0.85, T0 + 1.0); if (k > 0 && e < 1) { const s = (0.7 + 0.8 * outBack(k)) * (1 - e) * (0.9 + 0.12 * Q); if (s > 0.15) sweat(B, P, c.X(F.x + 7), c.Y(F.y, HZ), s, 1); } },
      end: 1.45,
    };
  });
  /* 4. BƠI NGƯỢC DÒNG — 0,3: vòng nước dưới chân + giọt nước bắn NGƯỢC lên quanh thân (0,6 s) + chớp hồi máu; không lớp lặp lúc VỮNG */
  FS['trieu_myk4' + suf] = SC((c, at, R, P, o) => {
    const C = o.C, T0 = 0.3, T1 = 0.9;
    return {
      update(t) { at('go', t, T0, () => { o.shake?.(0.04); addLight(c, C.x, C.y - 8, 12, P[1], 0.3, 0.12); });
        if (t > T0 && t < T1 && R.chance(0.85)) { const a = R.range(0, TAU); fx(c, C.x + Math.cos(a) * 9, C.y + Math.sin(a) * 3, 1, -Math.cos(a) * 6, 0, R.range(60, 110), 0.4, dDrop, { g: 0.2, col: R.chance(0.4) ? P[0] : P[1], c2: P[4] }); } },
      back(B, L, t) { const k = tm(t, T0, T0 + 0.3); if (k > 0 && k < 1) gring(B, c, C.x, C.y + 1, 0, 6 + 12 * outCubic(k), 1.8, [P[0], P[2], P[4]], k < 0.6 ? 1 : 0.5, -1); },
      front(B, L, t) { const k = tm(t, T0, T0 + 0.3); if (k > 0 && k < 1) gring(B, c, C.x, C.y + 1, 0, 6 + 12 * outCubic(k), 1.8, [P[0], P[2], P[4]], k < 0.6 ? 1 : 0.5, 1);
        const h = tm(t, T0 + 0.05, T0 + 0.2) * (1 - tm(t, T1 - 0.15, T1)); if (h > 0) for (let i = 0; i < 3; i++) { const X = c.X(C.x + (i - 1) * 7), Y = c.Y(C.y, 6 + 10 * tm(t, T0, T1) + i * 2); for (let d = 0; d < 5; d++) B.dot(X, Y - d, d < 2 ? P[0] : P[2], h); B.dot(X - 1, Y - 3, P[1], h); B.dot(X + 1, Y - 3, P[1], h); } },
      end: 1.1,
    };
  });
  /* 5. TUYỆT CHIÊU — CÁ CHÉP VƯỢT VŨ MÔN: tụ nước dưới chân (0–0,4) → THÁC CHẢY NGƯỢC dâng sau lưng (0,4–0,9) → khi vọt lên thác đổ sập toé (0,9–1,3) */
  FS['trieu_myk' + suf + 'ult'] = SC((c, at, R, P, o) => {
    const C = o.C, T0 = 0.4, UP = 0.9, H0 = 34 + 6 * Q, W0 = 9 + 2 * Q;
    const hgt = t => H0 * (MV99('u') === 'a' ? outCubic(tm(t, T0, UP)) : outBack(tm(t, T0, UP), 1.3)) * (1 - outCubic(tm(t, UP + 0.05, UP + 0.4)));
    return {
      update(t) {
        if (t < T0) { const a = t * 12; if (R.chance(0.8)) fx(c, C.x + Math.cos(a) * 12, C.y + Math.sin(a) * 4, 1, -Math.cos(a) * 30, -Math.sin(a) * 10, R.range(10, 30), 0.35, dDrop, { g: 0.6, col: P[1], c2: P[4] }); }
        at('go', t, T0, () => { o.shake?.(0.1 * Q); splash(c, C.x, C.y + 0.5, 2, 10, 0.8); });
        if (t > T0 && t < UP && R.chance(0.6)) splash(c, C.x + R.range(-W0 / 2, W0 / 2), C.y + 0.5, 1, 1, 0.5);
        at('fall', t, UP + 0.05, () => { o.shake?.(0.08); for (let k = 0; k < 20; k++) { const a = R.range(0, TAU), v = R.range(30, 80); fx(c, C.x + R.range(-W0 / 2, W0 / 2), C.y, R.range(6, H0 * 0.6), Math.cos(a) * v, Math.sin(a) * v * 0.4, R.range(0, 40), 2, dDrop, { g: 1, drag: 0.3, col: R.chance(0.4) ? P[0] : P[1], c2: P[4], onLand: (cc, p) => { p.draw = dCrown; p.life = p.max = 0.16; } }); } });
      },
      back(B, L, t) { const k = tm(t, 0.05, T0); if (t < UP + 0.4) ditherOval(B, c.X(C.x), c.Y(C.y + 1), (6 + 8 * k) * RES, (2 + 3 * k) * RES, P[4], t < UP ? 0.5 : 0.25);
        const h = hgt(t); if (h > 1 && MV99('u') !== 'c') upfall(B, P, c.X(C.x), c.Y(C.y - 1), W0, h, t, 1); },
      front(B, L, t) { const h = hgt(t); if (h > 1 && MV99('u') === 'c') upfall(B, P, c.X(C.x), c.Y(C.y + 1), W0, h, t, 0.85);
        if (t > T0 && t < UP + 0.3) { const k = tm(t, T0, T0 + 0.25); gring(B, c, C.x, C.y + 1, 0, 5 + (W0 + 6) * outCubic(k), 1.6, [P[0], P[2], P[4]], t < UP ? 1 : 0.5, 1); } },
      end: 1.4,
    };
  });
  /* 5b. cú bổ nhào: cột nước dựng + vương miện nước lớn, 2 vòng sóng nước, vũng nước tối tắt dần, chớp sáng */
  FS['trieu_myk' + suf + 'ult2'] = SC((c, at, R, P, o) => {
    const F = { x: c.ax, y: c.ay }, HC = 20 + 6 * Q;
    return {
      update(t) {
        at('slam', t, 0, () => { o.hit?.(1.6 + 0.2 * Q); o.knock?.(); o.shake?.(0.32 + 0.1 * Q); o.flash?.(0.1, '200,235,255'); star(c, F.x, F.y, 6, P[0], 3.2 + 0.4 * Q, 0.16); addLight(c, F.x, F.y - 6, 16 + 4 * Q, P[1], 0.4, 0.14);
          for (let k = 0; k < 36 + 10 * Q; k++) { const a = R.range(0, TAU), v = R.range(40, 120); fx(c, F.x + Math.cos(a) * 5, F.y + Math.sin(a) * 2, R.range(2, 10), Math.cos(a) * v, Math.sin(a) * v * 0.45, R.range(60, 140), 2, dDrop, { g: 1, drag: 0.3, col: R.chance(0.4) ? P[0] : P[1], c2: P[4], onLand: (cc, p) => { p.draw = dCrown; p.life = p.max = 0.16; } }); }
          for (let k = 0; k < 10; k++) { const a = k / 10 * TAU; puff(c, F.x + Math.cos(a) * 10, F.y + Math.sin(a) * 4, P[1], 1.8, 0.4, 4, { vx: Math.cos(a) * 46, vy: Math.sin(a) * 16 }); } });
      },
      back(B, L, t) { const fd = 1 - tm(t, 0.8, 1.3); if (fd > 0) ditherOval(B, c.X(F.x), c.Y(F.y + 1), (16 + 6 * Q) * RES, (6 + 2 * Q) * RES, P[5], fd > 0.5 ? 0.45 : 0.2);
        for (const [t0, R0, th] of [[0, 28 + 8 * Q, 3], [0.12, 44 + 10 * Q, 2]]) { const k = tm(t, t0, t0 + 0.38); if (k > 0 && k < 1) gring(B, c, F.x, F.y + 1, 0, 6 + R0 * outCubic(k), th, [P[0], P[2], P[4]], k < 0.6 ? 1 : 0.5, -1); }
        const kc = tm(t, 0, 0.1) * (1 - tm(t, 0.18, 0.42)); if (kc > 0) upfall(B, P, c.X(F.x), c.Y(F.y), 7 + 2 * Q, HC * kc, t, 1, t < 0.06); },
      front(B, L, t) { for (const [t0, R0, th] of [[0, 28 + 8 * Q, 3], [0.12, 44 + 10 * Q, 2]]) { const k = tm(t, t0, t0 + 0.38); if (k > 0 && k < 1) gring(B, c, F.x, F.y + 1, 0, 6 + R0 * outCubic(k), th, [P[0], P[2], P[4]], k < 0.6 ? 1 : 0.5, 1); } },
      end: 1.35,
    };
  });
}
for (const s of ['', '2', '3']) mkMyk(s);
/* p99:scenes:end */
/* p100:scenes:begin */
/* p100 — CHOG (mascot Monad, hệ Mã): cảnh VFX VẼ CODE (skill vfx-code) cho 5 chiêu, 3 dạng (hậu tố '' / 2 / 3 = độ lực Q).
   Bảng màu: dữ liệu / nhiễu / ánh sáng = bảng Mã của cảnh (P, xanh bạc hà 8 bậc); gai bờm = bảng TÍM đo từ sprite Chog (CP, 8 bậc); tag LIVE = đỏ (CR).
   Mờ bằng dither, tắt gọn, KHÔNG lớp lặp. Mốc: giờ cảnh 0,3 = lúc tung chiêu (tuyệt chiêu 0,4). Cảnh *b tạo lúc chạm (sigScene) — neo ở chân đối thủ. */
const CP = ['#fbf2fb', '#e3c4f2', '#bd7de1', '#9a3fd8', '#7b09c5', '#5c0a95', '#51204b', '#2a0631'].map(H);
const CR = ['#ffd0d0', '#ff5a5a', '#c8202c', '#6a0c14'].map(H);
const CHQ = { '': 1, '2': 1.3, '3': 1.6 };
/* bản nháp (skill vfx-code): d = vệt lao, m = gai bờm, i = phỏng vấn, u = màn bản tin — trang so GIF đặt globalThis.__CHGV; game dùng bản em chọn (CHGV0) */
const CHGV0 = { d: 'b', m: 'a', i: 'c', u: 'a' }; const MV100 = k => ((globalThis.__CHGV || {})[k] || CHGV0[k]);
/* chữ pixel 3×5 (tiếng Anh, không lật gương), viền tối; S = điểm / ô */
const F100 = { L: [4, 4, 4, 4, 7], I: [7, 2, 2, 2, 7], V: [5, 5, 5, 2, 2], E: [7, 4, 6, 4, 7], N: [5, 7, 7, 5, 5], W: [5, 5, 7, 7, 5], S: [7, 4, 7, 1, 7], '?': [7, 1, 3, 0, 2], '!': [2, 2, 2, 0, 2] };
function txt100(B, X, Y, str, col, edge, S = 2, a = 1) {
  const on = (g, i, j) => g && i >= 0 && j >= 0 && i < 3 && j < 5 && ((g[j] >> (2 - i)) & 1); X = Math.round(X); Y = Math.round(Y);
  [...str].forEach((ch, n) => { const g = F100[ch], ox = X + n * 4 * S; if (!g) return;
    for (let j = -1; j <= 5; j++) for (let i = -1; i <= 3; i++) { const v = on(g, i, j); if (!v && !(on(g, i + 1, j) || on(g, i - 1, j) || on(g, i, j + 1) || on(g, i, j - 1))) continue; if (!v && edge == null) continue; for (let q = 0; q < S * S; q++) B.dot(ox + i * S + (q % S), Y + j * S + ((q / S) | 0), v ? col : edge, a); } });
}
/* gai bờm bay: kim tím 2 tông (đầu trắng) dài L px logic theo hướng (ux, uy) trên mặt phẳng màn */
function chq(B, X, Y, ux, uy, L, a = 1) { for (let d = 0; d <= L * RES; d += 0.5) { const col = d < 1.5 ? CP[0] : d < L * RES * 0.4 ? CP[3] : CP[4], aa = d > L * RES * 0.7 ? a * (1.25 - d / (L * RES)) : a; B.dot(X - ux * d, Y - uy * d, col, aa); if (d > 1 && d < L * RES * 0.55) { B.dot(X - ux * d - uy, Y - uy * d + ux, CP[6], aa); B.dot(X - ux * d + uy, Y - uy * d - ux, CP[2], aa); } } }
/* bờm xù: n gai ngắn toả tròn quanh (X, Y) — dài theo k */
function maneBurst(B, X, Y, n, r0, r1, k, a = 1, rot = 0) { for (let i = 0; i < n; i++) { const an = rot + i / n * TAU, ux = Math.cos(an), uy = Math.sin(an) * 0.8, ra = r0 * RES, rb = (r0 + (r1 - r0) * k) * RES; for (let d = ra; d <= rb; d += 0.5) { B.dot(X + ux * d, Y + uy * d, d > rb - 1.5 ? CP[0] : d > rb - 4 ? CP[2] : CP[4], a); B.dot(X + ux * d + uy * 0.6, Y + uy * d - ux * 0.6, CP[6], a * 0.6); } } }
/* khung ngắm máy quay (4 góc chữ L) quanh hộp X0..X1 × Y0..Y1 (điểm đệm) */
function brackets(B, X0, Y0, X1, Y1, col, edge, a = 1) { const l = 8; for (const [x, y, sx, sy] of [[X0, Y0, 1, 1], [X1, Y0, -1, 1], [X0, Y1, 1, -1], [X1, Y1, -1, -1]]) { for (let d = -1; d <= l; d++) for (let w = -1; w <= 2; w++) { B.dot(x + sx * d, y + sy * w, edge, a); B.dot(x + sx * w, y + sy * d, edge, a); } for (let d = 0; d < l; d++) for (let w = 0; w < 2; w++) { B.dot(x + sx * d, y + sy * w, col, a); B.dot(x + sx * w, y + sy * d, col, a); } } }
/* bong bóng thoại (điểm đệm): khung trắng viền tím sẫm + đuôi nhọn xuống-trái, ký tự giữa */
function bubble(B, X, Y, w, h, s, ch, a = 1) { const W = Math.round(w * s), Hh = Math.round(h * s); if (W < 4 || Hh < 4) return; const x0 = Math.round(X - W / 2), y0 = Math.round(Y - Hh);
  for (let y = -1; y <= Hh; y++) for (let x = -1; x <= W; x++) { const cor = (x <= 0 || x >= W - 1) && (y <= 0 || y >= Hh - 1); if (cor && (x < 0 || x > W - 1 || y < 0 || y > Hh - 1)) continue; const e = x < 1 || y < 1 || x > W - 2 || y > Hh - 2; B.dot(x0 + x, y0 + y, e ? CP[6] : y < 3 ? CP[0] : CP[1], a); }
  for (let k = 0; k < 6; k++) for (let x = 0; x < 6 - k; x++) B.dot(x0 + 6 + x, y0 + Hh + k, x === 0 || x === 5 - k ? CP[6] : CP[1], a);
  if (s > 0.7) txt100(B, X - 3 * Math.max(1, Math.round(2 * s)) / 2 - 1, y0 + Hh / 2 - 5 * Math.max(1, Math.round(2 * s)) / 2, ch, CP[5], null, Math.max(1, Math.round(2 * s)), a); }
function mkChg(suf) {
  const Q = CHQ[suf];
  /* 1. TIN NÓNG LƯỚT TỚI — gồng: bit dữ liệu hút vào thân; lao: vệt tốc độ sát đất + (b) dải dữ liệu đứt quãng bám sau lưng, vụn bit rơi */
  FS['ma_chg1' + suf] = SC((c, at, R, P, o) => {
    const C = o.C, T0 = 0.3, S1 = {};
    return {
      update(t) {
        if (t > 0.06 && t < T0) gather(c, C.x, C.y, 12, [P[0], P[1], P[2]], 1.1, 12);
        at('go', t, T0, () => { o.shake?.(0.06 * Q); star(c, C.x + 2, C.y, 14, P[0], 2.2, 0.12); bits(c, C.x - 4, C.y + 0.5, 6, 6 + 2 * Q, 60, 0.4); });
        if (t > T0 && t < 1.05) { const x = o.cx ? o.cx() : C.x;
          for (let k = 0; k < 2; k++) part(c, K.STREAK, x - 6, C.y + 0.5, R.range(2, 20), -R.range(90, 140), 0, 0, 0.14, R.chance(0.5) ? P[1] : P[2], 1, {});
          if (R.chance(0.35 * Q)) fx(c, x - 6, C.y + R.range(-1, 1), R.range(6, 22), -R.range(20, 50), 0, R.range(10, 40), R.range(0.3, 0.45), dBit, { g: 1, bounce: 0.3, drag: 0.6, col: R.pick([P[1], P[2], P[3]]), c2: P[0], size: 1.1, qf: 1 });
          if (MV100('d') === 'c' && R.chance(0.3)) puff(c, x - 5, C.y + 1, R.pick([P[4], P[5]]), 1.8, 0.3, 4, { vx: -30 }); }
      },
      back(B, L, t) { if (MV100('d') !== 'a' && t > T0 && t < 1.05) { const x = o.cx ? o.cx() : C.x, X = c.X(x); if (S1.x0 == null) S1.x0 = x; S1.v = lerp(S1.v || 0, Math.abs(x - (S1.xl ?? x)), 0.5); S1.xl = x; const sp = Math.min(1, S1.v / 4); if (sp < 0.15) return; for (const [z, ln, ph] of [[6, 26, 0], [14, 34, 3], [22, 20, 6]]) { const Y = c.Y(C.y, z); for (let d = 8; d < (ln + 4 * Q) * RES * sp; d += 1) { if (((d + ph + Math.floor(t * 40)) % 9) < 2) continue; const col = d < 14 ? P[0] : d < 30 ? P[1] : P[3], a = d > ln * RES * 0.7 ? 0.5 : 1; B.dot(X - d, Y, col, a); if (z === 14) B.dot(X - d, Y + 1, P[4], a); } } } },
      end: 1.2,
    };
  });
  /* 1b. chạm: chớp trắng + bit vỡ toả quạt phía trước + vạch nhiễu cắt ngang thân đối thủ 0,15 s + vòng sóng bạc hà dưới chân */
  FS['ma_chg1b' + suf] = SC((c, at, R, P, o) => {
    const F = { x: c.ax, y: c.ay };
    return {
      update(t) {
        at('hit', t, 0, () => { o.hit?.(1.2 + 0.2 * Q); o.shake?.(0.16 * Q); star(c, F.x - 5, F.y, 10, P[0], 2.6 + 0.4 * Q, 0.14); addLight(c, F.x - 4, F.y - 10, 12, P[1], 0.35, 0.1);
          for (let k = 0; k < 8 + 5 * Q; k++) { const an = R.range(-1.1, 1.1), v = R.range(60, 130); fx(c, F.x - 4, F.y + R.range(-1, 1), R.range(6, 14), Math.cos(an) * v, Math.sin(an) * v * 0.4, R.range(30, 70), R.range(0.35, 0.55), dBit, { g: 1, bounce: 0.3, drag: 0.5, col: R.pick([P[1], P[2], P[3], CP[3]]), c2: P[0], size: R.chance(0.3) ? 1.6 : 1.1, qf: 1 }); } });
      },
      back(B, L, t) { const k = tm(t, 0, 0.3); if (k > 0 && k < 1) gring(B, c, F.x - 3, F.y + 1, 0, 5 + (13 + 5 * Q) * outCubic(k), 2, [P[0], P[2], P[4]], k < 0.6 ? 1 : 0.5, -1); },
      front(B, L, t) { const k = tm(t, 0, 0.3); if (k > 0 && k < 1) gring(B, c, F.x - 3, F.y + 1, 0, 5 + (13 + 5 * Q) * outCubic(k), 2, [P[0], P[2], P[4]], k < 0.6 ? 1 : 0.5, 1); if (t > 0.02 && t < 0.16) glitchBars(B, R, c.X(F.x), c.Y(F.y, 0), 30, 30, 4, P, t > 0.1 ? 0.5 : 1); },
      end: 0.8,
    };
  });
  /* 2. BỜM GAI NHIỄU SÓNG — gồng: bờm xù dần quanh đầu (o.M), bit tụ; 0,3: N gai tím toả tròn bay ra (gai hướng đối thủ cắm tới chân đối thủ),
        (b) gai đi theo nhịp giật (nhảy 2 khung một, để lại khối bit mờ), (c) thêm vòng quét nhiễu; trúng 0,42: vạch nhiễu + bit vỡ trên đối thủ */
  FS['ma_chg2' + suf] = SC((c, at, R, P, o) => {
    const M = o.M, C = o.C, F = { x: c.ax, y: c.ay }, T0 = 0.3, N = suf === '3' ? 8 : 6, RAD = 40 + 4 * Q, V = 260, qs = [];
    for (let i = 0; i < N; i++) { const an = (i + 0.5) / N * TAU, ux = Math.cos(an), uy = Math.sin(an), right = Math.abs(an) < 0.6 || Math.abs(an - TAU) < 0.6, r = right ? Math.max(RAD, F.x - 6 - C.x) : RAD; qs.push({ ux, uy, r, T: 0.12 * (0.8 + 0.2 * r / RAD) / (0.8 + 0.2 * Math.max(RAD, F.x - 6 - C.x) / RAD) }); }
    if (N === 6) qs.push({ ux: 1, uy: 0, r: Math.max(RAD, F.x - 6 - C.x), T: 0.12 });   /* gai thẳng vào đối thủ */
    return {
      update(t) {
        if (t > 0.05 && t < T0) gather(c, M.x - 2, M.y, M.z, [P[0], P[1], P[2]], 1, 10);
        at('flash', t, T0, () => { o.shake?.(0.08 * Q); star(c, M.x - 2, M.y, M.z, CP[0], 2.6 + 0.3 * Q, 0.12); addLight(c, M.x - 2, M.y - M.z, 10, P[1], 0.3, 0.1); bits(c, M.x - 2, M.y, M.z, 6 + 2 * Q, 70, 0.4); });
        at('hit', t, T0 + 0.12, () => { o.hit?.(1); star(c, F.x - 3, F.y, 10, P[0], 2, 0.12); bits(c, F.x - 3, F.y + 0.5, 10, 10 + 4 * Q, 80, 0.45); });
        if (MV100('m') === 'b' && t > T0 && t < T0 + 0.35) for (const q of qs) { const u = (t - T0) / q.T; if (u > 0 && u < 1 && R.chance(0.25)) fx(c, C.x + q.ux * q.r * u, C.y + q.uy * q.r * u * 0.5, lerp(M.z, 6, u), 0, 0, 0, 0.18, dBit, { col: R.pick([P[1], P[2]]), c2: P[0], size: 1.1, qf: 1 }); }
      },
      back(B, L, t) { if (MV100('m') === 'c') { const k = tm(t, T0, T0 + 0.3); if (k > 0 && k < 1) gring(B, c, C.x, C.y + 1, 0, 8 + RAD * outCubic(k), 1.5, [P[0], P[2]], k < 0.6 ? 1 : 0.5, -1); } },
      front(B, L, t) {
        if (t > 0.05 && t < T0 + 0.06) { const k = tm(t, 0.05, T0); maneBurst(B, c.X(M.x - 2), c.Y(M.y, M.z), 9, 6, 7 + 4 * k, k, 0.75 + 0.25 * k, t * 4); }
        for (const q of qs) { let u = (t - T0) / q.T; if (u <= 0 || u > 1.3) continue; if (MV100('m') === 'b') u = Math.floor(u * 7) / 7 + 0.07;
          const uu = Math.min(1, u), pos = w => [c.X(C.x + q.ux * q.r * w), c.Y(C.y + q.uy * q.r * w * 0.5, lerp(M.z, 6, w))], [X, Y] = pos(uu), [Xb, Yb] = pos(Math.max(0, uu - 0.08)), dx = X - Xb, dy = Y - Yb, dl = Math.hypot(dx, dy) || 1, a = u > 1 ? Math.max(0, 1 - (u - 1) / 0.3) : 1;
          chq(B, X, Y, dx / dl, dy / dl, 9 + Q, a); if (u < 1) for (let d = 9 + Q; d < 22; d++) B.dot(X - dx / dl * d * RES, Y - dy / dl * d * RES, P[2], 0.5 * (1 - d / 22)); }
        if (MV100('m') === 'c') { const k = tm(t, T0, T0 + 0.3); if (k > 0 && k < 1) gring(B, c, C.x, C.y + 1, 0, 8 + RAD * outCubic(k), 1.5, [P[0], P[2]], k < 0.6 ? 1 : 0.5, 1); }
        if (t > T0 + 0.12 && t < T0 + 0.28) glitchBars(B, R, c.X(F.x), c.Y(F.y, 0), 30, 30, 4, P, t > T0 + 0.2 ? 0.5 : 1);
      },
      end: 1.0,
    };
  });
  /* 3. PHỎNG VẤN BẤT NGỜ — 0,3: chớp ở micro (o.M = tay), 2 cung sóng âm bay tới; 0,5: bong bóng '?' bật trên đầu đối thủ + ĐỨNG HÌNH:
        (c) khung ngắm máy quay 4 góc quanh đối thủ, vạch nhiễu giật 3 lần trong 1 s, rồi co tắt */
  FS['ma_chg3' + suf] = SC((c, at, R, P, o) => {
    const M = o.M, F = { x: c.ax, y: c.ay }, T0 = 0.3, TH = 0.5, OFF = 0.5 + 1 + 0.15 * (Q - 1) / 0.3, HZ = 26;
    return {
      update(t) {
        at('flash', t, T0, () => { star(c, M.x, M.y, M.z, P[0], 2, 0.12); addLight(c, M.x, M.y - M.z, 8, P[1], 0.3, 0.1); });
        at('hit', t, TH, () => { o.hit?.(0.4); o.shake?.(0.06); bits(c, F.x, F.y + 0.5, 14, 8, 50, 0.4); });
        at('off', t, OFF, () => bits(c, F.x, F.y + 0.5, 14, 6, 40, 0.35));
      },
      front(B, L, t) {
        if (MV100('i') !== 'b') for (const d0 of [0, 0.07]) { const u = tm(t, T0 + d0, TH + d0); if (u > 0 && u < 1) { const x = lerp(M.x + 2, F.x - 10, u), X = c.X(x), Y = c.Y(lerp(M.y, F.y, u), lerp(M.z, 14, u)); crescent(B, X, Y, (4 + 6 * u) * RES * 0.5 + 2, 0, 2, [P[0], P[1], P[3]], u > 0.8 ? 0.5 : 1, 1.0); } }
        if (MV100('i') === 'b') { const u = tm(t, T0, TH); if (u > 0 && u < 1) bubble(B, c.X(lerp(M.x, F.x, u)), c.Y(lerp(M.y, F.y, u), lerp(M.z + 6, HZ, u)), 13, 13, 0.5 + 0.5 * u, '?'); }
        const k = tm(t, TH, TH + 0.12), e = tm(t, OFF - 0.12, OFF);
        if (k > 0 && e < 1) { const s = outBack(k) * (1 - e); bubble(B, c.X(F.x + 6), c.Y(F.y, HZ + 4), 13, 13, s, '?');
          if (MV100('i') === 'c') { const g = 1 + 0.25 * (1 - k), w = 15 * g, h0 = 2, h1 = HZ * g; brackets(B, c.X(F.x - w), c.Y(F.y, h1), c.X(F.x + w), c.Y(F.y, -h0), P[1], P[6], e > 0 ? 0.5 : 1);
          }
          for (const g0 of [TH, TH + 0.4, TH + 0.8]) if (t > g0 && t < g0 + 0.1) glitchBars(B, R, c.X(F.x), c.Y(F.y, 0), 28, 30, 4, P, 1); }
      },
      end: OFF + 0.4,
    };
  });
  /* 4. CƯỜI TÍT LÁCH MÃ — 0,3: vạch quét bạc hà chạy từ chân lên đầu Chog 1 lần, thân 'tách lớp' (vạch nhiễu ngắn), bit nảy + 2 sao lấp lánh ở mắt; bóng ảo do engine (ghostPush) */
  FS['ma_chg4' + suf] = SC((c, at, R, P, o) => {
    const C = o.C, T0 = 0.3, HB = 19;
    return {
      update(t) { at('go', t, T0, () => { o.shake?.(0.04); bits(c, C.x, C.y + 0.5, 8, 8 + 2 * Q, 55, 0.4); star(c, C.x - 4, C.y, 14, P[0], 1.6, 0.25); star(c, C.x + 4, C.y, 15, CP[1], 1.4, 0.25); addLight(c, C.x, C.y - 10, 9, P[1], 0.25, 0.12); }); },
      front(B, L, t) { const k = tm(t, T0, T0 + 0.22); if (k > 0 && k < 1) { const Y = c.Y(C.y, HB * k), X0 = c.X(C.x - 11), X1 = c.X(C.x + 11); for (let x = X0; x <= X1; x++) { B.dot(x, Y, P[0]); B.dot(x, Y + 1, P[1]); B.dot(x, Y + 2, P[3], 0.5); } }
        if (t > T0 && t < T0 + 0.14) glitchBars(B, R, c.X(C.x), c.Y(C.y, 0), 26, 36, 3, P, t > T0 + 0.08 ? 0.5 : 1); },
      end: 0.9,
    };
  });
  /* 5. TUYỆT CHIÊU — BẢN TIN LỊCH SỬ: tụ (bit hút vào Chog) → 0,45 màn hình bản tin dựng sau lưng đối thủ (khung tím, nền bạc hà có vạch quét, tag LIVE đỏ)
        → 0,8 / 1,05 / 1,3: 3 dải tin chạy quét ngang qua đối thủ ở 3 độ cao → 1,6 màn VỠ thành khối điểm ảnh nổ toả + 2 vòng sóng + chớp. */
  FS['ma_chg' + suf + 'ult'] = SC((c, at, R, P, o) => {
    const C = o.C, A = { x: c.ax, y: c.ay }, SW = Math.round(54 + 8 * Q), SH = Math.round(30 + 4 * Q), SZ = 10, YB = A.y - 7, BRK = 1.6, TK = [[0.8, 7], [1.05, 17], [1.3, 12]];
    const blocks = []; for (let j = 0; j < 5; j++) for (let i = 0; i < 8; i++) blocks.push({ x: A.x - SW / 2 + (i + 0.5) * SW / 8, z: SZ + (j + 0.5) * SH / 5, an: R.range(0, TAU), v: R.range(50, 110) * (0.8 + 0.2 * Q) });
    const scr = (B, t) => { if (t < 0.45 || t > BRK) return; const k = outBack(tm(t, 0.45, 0.6)), h = Math.round(SH * k * RES), w = Math.round(SW * RES), X0 = Math.round(c.X(A.x) - w / 2), Yb = Math.round(c.Y(YB, SZ));
      for (const lx of [-w / 2 + 6, w / 2 - 8]) for (let y = 0; y < SZ * RES; y++) for (let x = 0; x < 3; x++) B.dot(c.X(A.x) + lx + x, c.Y(YB) - y, x === 0 ? CP[6] : CP[5]);   /* 2 chân đế */
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const e = x < 2 || y < 2 || x > w - 3 || y > h - 3, e2 = x < 4 || y < 4 || x > w - 5 || y > h - 5; let col = e ? CP[6] : e2 ? CP[4] : ((y + Math.floor(t * 30)) % 6 < 1 ? P[3] : (y > h - 12 ? P[6] : P[5]));
        if (!e2 && y > h - 12 && y < h - 4 && ((x + Math.floor(t * 60)) % 14) < 8 && (x + Math.floor(t * 60)) % 14 > 1) col = P[1];   /* dải chữ chạy đáy màn */
        B.dot(X0 + x, Yb - h + y, col); }
      if (k > 0.9) { txt100(B, X0 + 8, Yb - h + 8, 'LIVE', CR[0], CR[3], 2); const blink = Math.floor(t * 6) % 2; if (blink) disc(B, X0 + 8 + 32 + 4, Yb - h + 12, 2.2, CR[1]);
        const gx = c.X(A.x) + 4; for (let i = 0; i < 4; i++) { const bh = Math.round((6 + i * 5) * Math.min(1, tm(t, 0.6 + i * 0.08, 0.75 + i * 0.08)) * (1 + 0.15 * (Q - 1))); for (let y = 0; y < bh; y++) for (let x = 0; x < 6; x++) B.dot(gx + i * 9 + x, Yb - 14 - y, y === bh - 1 ? P[0] : x === 0 || x === 5 ? P[6] : P[2]); }   /* biểu đồ cột mọc dần (mưu lược) */
        txt100(B, X0 + 8, Yb - 20, 'NEWS', P[0], P[7], 1); }
      if (t > BRK - 0.04) { const W2 = Math.round(SW * RES), H2 = Math.round(SH * RES); for (let y = 0; y < H2; y++) for (let x = 0; x < W2; x++) if ((x + y) % 2 === 0 || t < BRK - 0.01) B.dot(X0 + x, Yb - H2 + y, P[0]); } };
    const tick = (B, t) => { for (const [t0, z] of TK) { const u = tm(t, t0, t0 + 0.28); if (u <= 0 || u >= 1) continue; const xs = lerp(C.x - 10, A.x + 70, u), X = c.X(xs), Y = c.Y(A.y, z), Ln = 64 * RES, hh = 5 * RES;
        for (let d = 0; d < Ln; d++) for (let y = 0; y < hh; y++) { const x = X - d, edge = y === 0 || y === hh - 1, lead = d < 6, glyphC = !edge && y > 2 && y < hh - 3 && ((d + Math.floor(u * 90)) % 10) < 6 && ((d + Math.floor(u * 90)) % 10) > 1;
          B.dot(x, Y - y, lead ? P[0] : edge ? P[6] : glyphC ? P[7] : P[1], d > Ln * 0.8 ? 0.5 : 1); } } };
    return {
      update(t) {
        if (t < 0.4) gather(c, C.x + 2, C.y, 14, [P[0], P[1], P[2], P[3]], 1.4, 16);
        at('up', t, 0.45, () => { o.shake?.(0.1); for (let k = 0; k < 10; k++) bits(c, A.x + R.range(-SW / 2, SW / 2), YB, SZ, 1, 40, 0.35); addLight(c, A.x, YB - SZ - SH / 2, 22, P[1], 0.3, 0.2); });
        for (const [i, [t0]] of TK.entries()) at('tk' + i, t, t0 + 0.12, () => { o.hit?.(0.5); o.shake?.(0.08); bits(c, A.x, A.y + 0.5, 10, 6, 70, 0.35); });
        at('brk', t, BRK, () => { o.hit?.(1.8 + 0.2 * Q); o.knock?.(); o.shake?.(0.4 + 0.1 * Q); o.flash?.(0.1, '200,255,230'); star(c, A.x, YB, SZ + SH / 2, P[0], 3.6 + 0.4 * Q, 0.16); addLight(c, A.x, YB - SZ - SH / 2, 26 + 4 * Q, P[1], 0.45, 0.16);
          for (const q of blocks) fx(c, q.x, YB, q.z, Math.cos(q.an) * q.v, Math.sin(q.an) * q.v * 0.4, R.range(30, 90), R.range(0.5, 0.8), dBit, { g: 1, bounce: 0.35, drag: 0.5, col: R.pick([P[1], P[2], P[3], P[5], CP[4]]), c2: P[0], size: R.range(1.6, 2.6), qf: 1 });
          bits(c, A.x, A.y + 0.5, 12, 14 + 6 * Q, 110, 0.6); });
      },
      back(B, L, t) { scr(B, t); for (const [t0, R0, th] of [[BRK, 30 + 6 * Q, 3], [BRK + 0.12, 40 + 7 * Q, 2]]) { const k = tm(t, t0, t0 + 0.38); if (k > 0 && k < 1) gring(B, c, A.x, A.y + 1, 0, 6 + R0 * outCubic(k), th, [P[0], P[2], P[4]], k < 0.6 ? 1 : 0.5, -1); } },
      front(B, L, t) { tick(B, t); for (const [t0, R0, th] of [[BRK, 30 + 6 * Q, 3], [BRK + 0.12, 40 + 7 * Q, 2]]) { const k = tm(t, t0, t0 + 0.38); if (k > 0 && k < 1) gring(B, c, A.x, A.y + 1, 0, 6 + R0 * outCubic(k), th, [P[0], P[2], P[4]], k < 0.6 ? 1 : 0.5, 1); }
        if (t > BRK - 0.06 && t < BRK + 0.12) glitchBars(B, R, c.X(A.x), c.Y(YB, SZ), SW * RES, SH * RES, 6, P, t > BRK + 0.06 ? 0.5 : 1); },
      end: 2.4,
    };
  });
}
for (const s of ['', '2', '3']) mkChg(s);
/* p100:scenes:end */
addScenes(Object.fromEntries(Object.entries(FS).map(([k, v]) => ['full_' + k, v])));

/* bảng chiêu (SET5): tên hiển thị + clip của thú ra chiêu */
export const META = {
  chan: { sk: [['chan_sk1', 'Nứt Đất', 'slam'], ['chan_sk2', 'Ném Tảng Đá', 'slam'], ['chan_sk3', 'Dậm Chấn', 'stomp'], ['chan_sk4', 'Khoan Đất', 'stomp']], ult: ['chan_ult', 'Đại Địa Chấn — Địa Long Trỗi Dậy'] },
  nham: { sk: [['nham_sk1', 'Phun Than', 'spit'], ['nham_sk2', 'Cầu Nổ Lửa', 'spit'], ['nham_sk3', 'Vực Nham', 'spit'], ['nham_sk4', 'Lao Lửa', 'dash']], ult: ['nham_ult', 'Núi Lửa Con — Mưa Thiên Thạch'] },
  trieu: { sk: [['trieu_sk1', 'Roi Nước', 'atk'], ['trieu_sk2', 'Phi Thuỷ Châm', 'spout'], ['trieu_sk3', 'Sóng Cuộn', 'wave'], ['trieu_sk4', 'Bong Bóng Giam', 'spout']], ult: ['trieu_ult', 'Thuỷ Triều Dâng — Hải Cầu Vỡ'] },
  loi: { sk: [['loi_sk1', 'Phóng Tia', 'zap'], ['loi_sk2', 'Lôi Cầu', 'zap'], ['loi_sk3', 'Xung Vòng', 'pulse'], ['loi_sk4', 'Lướt Điện', 'atk']], ult: ['loi_ult', 'Sét Trời Giáng'] },
  phong: { sk: [['phong_sk1', 'Lưỡi Gió', 'flap'], ['phong_sk2', 'Lốc Xoáy', 'atk'], ['phong_sk3', 'Bổ Nhào', 'dash'], ['phong_sk4', 'Gió Xuôi', 'flap']], ult: ['phong_ult', 'Bão Lốc — Thiên Phong Trảm'] },
  moc: { sk: [['moc_sk1', 'Roi Rễ', 'cast'], ['moc_sk2', 'Bào Tử Ngủ', 'seal'], ['moc_sk3', 'Bão Lá', 'atk'], ['moc_sk4', 'Hút Nhựa', 'cast']], ult: ['moc_ult', 'Rừng Trồi — Lồng Rễ Nở Hoa'] },
  suong: { sk: [['suong_sk1', 'Hơi Lạnh', 'blow'], ['suong_sk2', 'Gai Băng', 'raise'], ['suong_sk3', 'Sàn Băng', 'atk'], ['suong_sk4', 'Gương Băng', 'raise']], ult: ['suong_ult', 'Bão Tuyết — Băng Phong'] },
  tinh: { sk: [['tinh_sk1', 'Mảnh Pha Lê', 'shine'], ['tinh_sk2', 'Khúc Xạ', 'shine'], ['tinh_sk3', 'Giáp Tinh Thể', 'curl'], ['tinh_sk4', 'Trụ Pha Lê', 'atk']], ult: ['tinh_ult', 'Mưa Kim Cương'] },
  ma: { sk: [['ma_sk1', 'Dịch Chuyển Lỗi', 'atk'], ['ma_sk2', 'Nhiễu Sóng', 'atk'], ['ma_sk3', 'Tường Lửa', 'atk'], ['ma_sk4', 'Mã Hoá', 'atk']], ult: ['ma_ult', 'Sập Hệ Thống'] },
  am: { sk: [['am_sk1', 'Sóng Âm', 'shout'], ['am_sk2', 'Đập Âm', 'stomp'], ['am_sk3', 'Hú Vang', 'shout'], ['am_sk4', 'Tiếng Vọng', 'atk']], ult: ['am_ult', 'Cộng Hưởng — Dàn Loa Tận Thế'] },
  anh: { sk: [['anh_sk1', 'Hàm Bóng', 'atk'], ['anh_sk2', 'Cầu Bóng', 'atk'], ['anh_sk3', 'Lẩn Bóng', 'atk'], ['anh_sk4', 'Đèn Mê', 'atk']], ult: ['anh_ult', 'Đêm Đen'] },
  quang: { sk: [['quang_sk1', 'Tia Sáng', 'beam'], ['quang_sk2', 'Chớp Loá', 'glow'], ['quang_sk3', 'Tự Lành', 'glow'], ['quang_sk4', 'Cầu Trăng', 'atk']], ult: ['quang_ult', 'Phán Quyết'] },
};
export const FULL_KINDS = () => Object.keys(FS);

/* p52e: bộ đệm + nét vẽ cho engine trận (tia đối chưởng / luồng phún / tia xuyên vẽ code) */
export const FKIT = { DBuf, DLBuf, beam, zap, tube, orb, jagPts, Rng, PAL, RES, bayer, ditherOval, H };
