/* weather69.js — p69 đợt 3: THỜI TIẾT / MÔI TRƯỜNG vẽ code kiểu pixel (thay main.js drawWeather: ô vuông 1–2 px một màu, trôi đều).
   Êm: không nháy, không rung, không lóe; độ sáng chỉ đổi chậm (≥ 3 s / nhịp) và theo bậc màu (không alpha mịn).
   Hạt KHÔNG có trạng thái: vị trí tính từ thời gian + hash (không tạo object mỗi khung, không GC).
   2 lớp sâu: xa (1 điểm = ½ px logic, chậm, tối) + gần (2×2 điểm, nhanh hơn, sáng) → có chiều sâu thay vì giấy dán tường.
   Toạ độ màn hình logic (VW × VH); đom đóm neo theo thế giới (cx, cy). Điểm vẽ ½ px logic (= 1 px canvas 2×).
   Gọi: drawWeather69(g, S, cx, cy, VW, VH) → true nếu vùng có thời tiết code (main.js bỏ vẽ cũ). ?vfx=old → false. */
const H = (i, k) => { let h = Math.imul(i + 1, 2654435761) ^ Math.imul(k + 7, 1597334677); h = Math.imul(h ^ (h >>> 15), 2246822519); h ^= h >>> 13; return (h >>> 0) / 4294967296; };
const OLD = typeof location !== 'undefined' && /[?&]vfx=old\b/.test(location.search);
const P = 1;   /* r2: 1 điểm = 1 px logic (r1 dùng ½ px: trên điện thoại gần như không thấy) */
function dot(g, x, y, c) { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), P, P); }
function blk(g, x, y, w, h, c) { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), w * P, h * P); }
const wrap = (v, m) => ((v % m) + m) % m;

/* mỗi vùng: danh sách lớp { n, vx, vy, sway, swf, kind, cols } — vx / vy px logic / s */
const Z = {
  m3: [   /* Rừng Nứt: lá xanh rơi chao (gần) + bào tử nhỏ (xa) */
    { n: 16, vx: 5, vy: 9, sway: 5, swf: 0.6, kind: 'spec', cols: ['#4f8f3a', '#6fae46'] },
    { n: 9, vx: 10, vy: 16, sway: 10, swf: 0.9, kind: 'leaf', cols: ['#bff28a', '#8fd05a', '#5f9a3a'] },
  ],
  m4: [   /* bụi cát lơ lửng bay lên chậm */
    { n: 16, vx: 3, vy: -4, sway: 4, swf: 0.4, kind: 'spec', cols: ['#bfb39a', '#a89c84'] },
    { n: 6, vx: 5, vy: -7, sway: 6, swf: 0.5, kind: 'mote', cols: ['#efe3c4', '#d8c9a4'] },
  ],
  m7: [   /* tro xám rơi + vài tàn lửa bay lên */
    { n: 26, vx: -6, vy: 12, sway: 5, swf: 0.7, kind: 'spec', cols: ['#7a7078', '#948a92'] },
    { n: 12, vx: -10, vy: 18, sway: 8, swf: 0.8, kind: 'flake', cols: ['#b8aeb6', '#8a8088'] },
    { n: 5, vx: 4, vy: -14, sway: 7, swf: 1.1, kind: 'ember', cols: ['#ffd27a', '#ff8a3a', '#b8401a'] },
  ],
  m8: [   /* tuyết: xa nhỏ chậm, gần to nhanh, chao theo gió */
    { n: 34, vx: 10, vy: 16, sway: 6, swf: 0.7, kind: 'spec', cols: ['#d8e8f8', '#b8cce4'] },
    { n: 16, vx: 18, vy: 28, sway: 9, swf: 0.9, kind: 'snow', cols: ['#ffffff', '#dfeeff', '#a9c1dc'] },
  ],
  m9: [   /* hạt tím linh khí bay lên */
    { n: 18, vx: 2, vy: -8, sway: 5, swf: 0.5, kind: 'spec', cols: ['#9a78d8', '#b48cff'] },
    { n: 7, vx: 3, vy: -12, sway: 7, swf: 0.6, kind: 'mote', cols: ['#e4d4ff', '#b48cff'] },
  ],
};
const FIREFLY_ZONES = new Set(['village', 'm1', 'm2', 'm3', 'm5']);

export function drawWeather69(g, S, cx, cy, VW, VH) {
  if (OLD || (typeof window !== 'undefined' && window.__wfx && window.__wfx.old && window.__wfx.old())) return false;
  const z = S.zone && S.zone.id, L = Z[z], t = S.time || 0;
  if (!L) return false;
  if (L) for (let li = 0; li < L.length; li++) {
    const l = L[li], N = Math.round(l.n * 1.5), W = VW + 24, Hh = VH + 24, par = li === 0 ? 0.35 : 0.7;   /* thị sai: lớp xa trôi theo camera ít hơn */
    for (let i = 0; i < N; i++) {
      const a = H(i, li * 31 + 1), b = H(i, li * 31 + 2), c = H(i, li * 31 + 3), sp = 0.75 + 0.5 * c;
      const x = wrap(a * W + t * l.vx * sp - cx * par + Math.sin(t * l.swf + c * 6.28) * l.sway, W) - 12;
      const y = wrap(b * Hh + t * l.vy * sp - cy * par, Hh) - 12;
      const col = l.cols, k = l.kind;
      if (k === 'spec') dot(g, x, y, col[i & 1]);
      else if (k === 'mote') { blk(g, x, y, 2, 2, col[1]); dot(g, x, y, col[0]); }
      else if (k === 'flake') { blk(g, x, y, 2, 1, col[0]); dot(g, x + 1, y + 1, col[1]); }
      else if (k === 'snow') { blk(g, x, y, 2, 2, col[1]); dot(g, x, y, col[0]); dot(g, x + 1, y + 1, col[2]); }
      else if (k === 'leaf') {   /* lá 3 điểm xoay chậm; mặt / lưng lá đổi bậc màu */
        const ang = t * (0.8 + c) + a * 6.28, ca = Math.cos(ang), sa = Math.sin(ang), face = Math.sin(ang * 0.7 + b * 6) > 0;
        dot(g, x, y, face ? col[0] : col[1]); dot(g, x + ca, y + sa, col[1]); dot(g, x - ca, y - sa, face ? col[1] : col[2]); dot(g, x + ca * 2, y + sa * 2, col[2]);
      } else if (k === 'ember') {   /* tàn lửa: 1 điểm sáng + đuôi 2 điểm tối hơn phía dưới */
        dot(g, x, y, col[0]); dot(g, x, y + 1, col[1]); dot(g, x - Math.round(Math.sin(t * l.swf + c * 6.28)), y + 2, col[2]);
      }
    }
  }
  return true;
}
/* gọi SAU lớp tối ban đêm (main.js) — đom đóm phát sáng không bị phủ tối */
export function drawFireflies69(g, S, cx, cy, VW, VH) {
  if (OLD || (typeof window !== 'undefined' && window.__wfx && window.__wfx.old && window.__wfx.old())) return;
  const z = S.zone && S.zone.id; if (!FIREFLY_ZONES.has(z) || (S.dark || 0) <= 0.2) return;
  fireflies(g, S, cx, cy, VW, VH, S.time || 0, Math.min(1, ((S.dark || 0) - 0.2) / 0.25));
}
/* đom đóm: neo thế giới theo ô 160 px (mỗi ô 2 con), lượn chậm; sáng dần / tối dần theo nhịp ≥ 3 s, đổi theo 3 bậc màu — không chớp tắt */
function fireflies(g, S, cx, cy, VW, VH, t, k) {
  const C = 112, x0 = Math.floor(cx / C) - 1, x1 = Math.floor((cx + VW) / C) + 1, y0 = Math.floor(cy / C) - 1, y1 = Math.floor((cy + VH) / C) + 1;
  for (let gy = y0; gy <= y1; gy++) for (let gx = x0; gx <= x1; gx++) for (let j = 0; j < 3; j++) {
    const s = (gx * 73856093) ^ (gy * 19349663) ^ (j * 83492791), a = H(s, 1), b = H(s, 2), c = H(s, 3);
    if (c > 0.8) continue;
    const wx = gx * C + a * C + Math.sin(t * (0.3 + c * 0.3) + b * 6.28) * 14, wy = gy * C + b * C + Math.sin(t * (0.25 + a * 0.3) + c * 6.28) * 9 - 6;
    const x = wx - cx, y = wy - cy; if (x < -4 || y < -4 || x > VW + 4 || y > VH + 4) continue;
    const pulse = (0.5 + 0.5 * Math.sin(t * (1.6 + c) + a * 6.28)) * k;   /* nhịp ~3–4 s */
    if (pulse < 0.15) continue;
    const lv = pulse > 0.7 ? 2 : pulse > 0.4 ? 1 : 0;
    if (lv >= 1) { const hc = lv === 2 ? '#a8d84a' : '#6f9a34'; dot(g, x - 1, y, hc); dot(g, x + 1, y, hc); dot(g, x, y - 1, hc); dot(g, x, y + 1, hc); }
    dot(g, x, y, lv === 2 ? '#fbffd0' : lv === 1 ? '#e6f68a' : '#9fbe4a');
  }
}
