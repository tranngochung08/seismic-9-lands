/* p79 (anh 02/11: "Khi 2 chưởng va chạm nhau cần có vfx chỗ đó"): ĐIỂM VA ĐỐI CHƯỞNG vẽ code (skill vfx-code).
   Trước: đĩa sáng r ≈ 4,5 px logic + 6 tia mảnh — chìm giữa 2 luồng dày ~22 px. Nay 3 bản (link &clash79=a|b|c, mặc định CLASH79):
   a · QUẢ CẦU NĂNG LƯỢNG: lõi chia đôi màu 2 hệ (ranh giới gợn sóng), gai năng lượng tua tủa, sóng xung kích lan theo nhịp 0,3 s, tia lửa văng có trọng lực.
   b · TOÉ DỌC: năng lượng bị ép phụt lên / xuống thành vệt sáng dọc hình thoi, tia lửa phun thành vòi trên – dưới rồi rơi xuống đất, lõi nhỏ.
   c · SÉT GIẰNG CO: lõi vừa + 5–8 tia sét răng cưa phóng ra, đổi hình mỗi 0,06 s, nhánh phụ, vòng chớp.
   Không trạng thái: hạt là hàm của t (băm theo chỉ số + chu kỳ) → vẽ mỗi khung ở drawBeams, không cần update; chỉ hiện khi đang giằng co (sự kiện).
   pw (0–1, fxPowerOf của 2 thú — con mạnh hơn) → cỡ lõi, số gai / hạt / sét, tầm sóng. Toạ độ bút: 2 điểm / px logic (RES 2), mờ = dither Bayer. */
let CLASH79 = 'a';
try { const q = new URLSearchParams(location.search).get('clash79'); if (/^[abco]$/.test(q || '')) CLASH79 = q; } catch (e) { }
export function setClash79(v) { if (/^[abco]$/.test(v)) CLASH79 = v; return CLASH79; }
const H = n => { const s = Math.sin(n * 12.9898 + 78.233) * 43758.5453; return s - Math.floor(s); };
const px = (g, X, Y, c) => { g.fillStyle = c; g.fillRect(Math.round(X) / 2, Math.round(Y) / 2, 0.5, 0.5); };
const blk = (g, X, Y, c, s = 2) => { g.fillStyle = c; g.fillRect(Math.round(X) / 2, Math.round(Y) / 2, s / 2, s / 2); };
function oval(g, X, Y, rx, ry, c, a = 1) { g.fillStyle = c; for (let y = Math.floor(Y - ry); y <= Math.ceil(Y + ry); y++) for (let x = Math.floor(X - rx); x <= Math.ceil(X + rx); x++) { const dx = (x + 0.5 - X) / rx, dy = (y + 0.5 - Y) / ry; if (dx * dx + dy * dy <= 1 && (a >= 1 || a > bay(x, y))) g.fillRect(x / 2, y / 2, 0.5, 0.5); } }
function ring(g, X, Y, r, ry, th, c, a) { g.fillStyle = c; const n = Math.max(24, Math.round(r * 6.5)); for (let q = 0; q < th; q++) { const rr = r - q; for (let i = 0; i < n; i++) { const an = i / n * Math.PI * 2, x = Math.round(X + Math.cos(an) * rr), y = Math.round(Y + Math.sin(an) * rr * ry); if (a < 1 && a <= bay(x, y)) continue; g.fillRect(x / 2, y / 2, 0.5, 0.5); } } }
function seg(g, X0, Y0, X1, Y1, c, w = 1) { const n = Math.max(1, Math.ceil(Math.max(Math.abs(X1 - X0), Math.abs(Y1 - Y0)))); g.fillStyle = c; for (let i = 0; i <= n; i++) { const x = Math.round(X0 + (X1 - X0) * i / n), y = Math.round(Y0 + (Y1 - Y0) * i / n); g.fillRect(x / 2, y / 2, w / 2, w / 2); } }
let bay = () => 0.5;
/* lõi chia đôi: trái màu hệ bên trái (A), phải màu hệ bên phải (B); ranh giới gợn theo t; vòng ngoài tối, giữa trắng */
function core(g, X, Y, R, A, B, t, ry = 0.9) {
  for (let y = Math.floor(Y - R - 3); y <= Math.ceil(Y + R + 3); y++) for (let x = Math.floor(X - R - 3); x <= Math.ceil(X + R + 3); x++) {
    const dx = x + 0.5 - X, dy = (y + 0.5 - Y) / ry, d = Math.hypot(dx, dy) / R; if (d > 1.14) continue;
    const P = dx + Math.sin(dy * 0.45 + t * 22) * R * 0.18 < 0 ? A : B;
    let c; if (d > 1) { if (0.55 <= bay(x, y)) continue; c = P[4]; } else c = d < 0.32 ? '#ffffff' : d < 0.55 ? P[0] : d < 0.8 ? P[1] : P[2];
    g.fillStyle = c; g.fillRect(x / 2, y / 2, 0.5, 0.5); }
}
/* hạt không trạng thái: mỗi hạt k sống L giây, sinh lại theo chu kỳ (lệch pha vàng); hướng / tốc lấy từ băm (k, chu kỳ) */
function sparks(g, X, Y, n, L, t, angOf, spd, grav, A, B, sz = 1) {
  for (let k = 0; k < n; k++) { const u = t / L + k * 0.618, cyc = Math.floor(u), ph = u - cyc, h1 = H(k * 7.1 + cyc * 13.3), h2 = H(k * 3.7 + cyc * 5.9), h3 = H(k * 1.3 + cyc * 2.1);
    const an = angOf(h1, k), v = spd * (0.45 + 0.8 * h2), x = X + Math.cos(an) * v * ph * L, y = Y + Math.sin(an) * v * ph * L + grav * ph * ph * L * L, P = h3 < 0.5 ? A : B;
    const c = ph < 0.25 ? '#ffffff' : ph < 0.55 ? P[0] : ph < 0.8 ? P[1] : P[3]; if (ph > 0.8 && 0.5 <= bay(Math.round(x), Math.round(y))) continue;
    blk(g, x, y, c, sz); if (ph < 0.7) { const vx = Math.cos(an) * v, vy = Math.sin(an) * v + grav * ph * L * 2, vl = Math.hypot(vx, vy) || 1; for (let q = 1; q <= 3; q++) px(g, x - vx / vl * q * 2, y - vy / vl * q * 2, q === 1 ? P[0] : P[2]); } }   /* mài: hạt 1 px logic + đuôi theo vận tốc (trước: 0,5 px — gần như vô hình) */
}
function bolt(g, X, Y, an, len, seed, c1, c2, seg0 = 7) {   /* sét răng cưa + 1 nhánh */
  let x = X, y = Y; const n = seg0; for (let i = 1; i <= n; i++) { const k = i / n, j = (H(seed + i * 3.3) - 0.5) * len * 0.32 * (1 - k * 0.4), nx = X + Math.cos(an) * len * k - Math.sin(an) * j, ny = Y + Math.sin(an) * len * k * 0.8 + Math.cos(an) * j * 0.8;
    seg(g, x, y, nx, ny, i < n * 0.6 ? c1 : c2, i < n * 0.7 ? 3 : 2); if (i === 3 && H(seed + 9.1) < 0.7) { const b2 = an + (H(seed + 4.4) < 0.5 ? -0.7 : 0.7); seg(g, nx, ny, nx + Math.cos(b2) * len * 0.3, ny + Math.sin(b2) * len * 0.24, c2, 2); } x = nx; y = ny; }
}
export function clash79(g, A, B, x, y, cx, cy, t, pw = 0.5, BAYf) {
  if (BAYf) bay = BAYf; const X = Math.round((x - cx) * 2), Y = Math.round((y - cy) * 2), p = Math.max(0, Math.min(1, pw)), V = CLASH79;
  if (V === 'a') {
    const R = (18 + 8 * p) + 3 * Math.sin(t * 37) + 1.5 * Math.sin(t * 23);
    for (let w = 0; w < 2; w++) { const T0 = 0.3, ph = ((t + w * T0 / 2) % T0) / T0, rr = R * (1.1 + 1.9 * ph) * (1 + 0.4 * p); ring(g, X, Y, rr, 0.62, 2, ph < 0.4 ? '#ffffff' : (w ? B : A)[1], 1 - ph); }   /* sóng xung kích lan theo nhịp */
    const nr = Math.round(8 + 8 * p); for (let i = 0; i < nr; i++) { const an = i / nr * Math.PI * 2 + t * 4 + (i % 2) * 0.2, fl = 0.75 + 0.5 * H(i * 5.1 + Math.floor(t * 18)), l = R * (1.5 + 0.9 * p) * fl, P = Math.cos(an) < 0 ? A : B;
      for (let s = R * 0.7; s < l; s += 1) { const k = (s - R * 0.7) / (l - R * 0.7), x2 = X + Math.cos(an) * s, y2 = Y + Math.sin(an) * s * 0.75; if (k > 0.7 && 0.5 <= bay(Math.round(x2), Math.round(y2))) continue; px(g, x2, y2, k < 0.35 ? '#ffffff' : k < 0.7 ? P[0] : P[2]); } }   /* gai năng lượng */
    core(g, X, Y, R, A, B, t);
    sparks(g, X, Y, Math.round(22 + 26 * p), 0.5, t, (h, k) => (k % 2 ? Math.PI : 0) + (h - 0.5) * 2.4, 150 + 90 * p, 260, A, B, 2);
  } else if (V === 'b') {
    const R = (15 + 6 * p) + 2 * Math.sin(t * 41), Hh = (60 + 30 * p) * (0.85 + 0.15 * Math.sin(t * 29)), Ww = 15 + 5 * p;   /* mài: vệt dọc dày + cao hơn */
    for (let y2 = -Hh; y2 <= Hh; y2++) { const k = Math.abs(y2) / Hh, w2 = Ww * (1 - k) * (1 - k * 0.3); for (let x2 = -w2; x2 <= w2; x2++) { const q = Math.abs(x2) / Math.max(1, w2), P = x2 + Math.sin(y2 * 0.3 + t * 25) * 2 < 0 ? A : B, xx = X + x2, yy = Y + y2; if (k > 0.75 && 0.5 <= bay(Math.round(xx), Math.round(yy))) continue; px(g, xx, yy, q < 0.35 && k < 0.6 ? '#ffffff' : q < 0.7 ? P[0] : P[2]); } }   /* vệt sáng dọc hình thoi */
    oval(g, X, Y, R * 1.9, R * 0.5, '#ffffff', 0.55); core(g, X, Y, R, A, B, t, 1);
    sparks(g, X, Y, Math.round(30 + 34 * p), 0.6, t, (h, k) => (k % 2 ? -Math.PI / 2 : Math.PI / 2) + (h - 0.5) * 1.1, 170 + 90 * p, 420, A, B, 2);   /* vòi trên – dưới, rơi về đất */
  } else {
    const R = (15 + 6 * p) + 2 * Math.sin(t * 33), fr = Math.floor(t / 0.06), nb = Math.round(6 + 3 * p);
    oval(g, X, Y, R * 2.2, R * 1.5, A[3], 0.35); oval(g, X, Y, R * 1.6, R * 1.1, B[2], 0.45);   /* mài: quầng sáng để sét nổi trên cỏ */
    for (let i = 0; i < nb; i++) { const an = i / nb * Math.PI * 2 + H(fr * 1.7 + i) * 0.9, P = Math.cos(an) < 0 ? A : B; bolt(g, X, Y, an, R * (2.4 + 1.6 * H(fr + i * 2.2)) * (1 + 0.4 * p), fr * 31 + i * 7, '#ffffff', P[0]); }
    const ph = (t % 0.24) / 0.24; ring(g, X, Y, R * (1.2 + 1.3 * ph), 0.7, 2, ph < 0.35 ? '#ffffff' : A[1], 1 - ph);
    core(g, X, Y, R, A, B, t);
    sparks(g, X, Y, Math.round(14 + 14 * p), 0.35, t, h => h * Math.PI * 2, 120 + 60 * p, 120, A, B, 1);
  }
}

export const clashVar79 = () => CLASH79;
