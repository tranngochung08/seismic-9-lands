// thirst.js — 2026-10-11 anh: "gia cầm, gia súc thấy nước chỉ UỐNG, không xuống; uống no rồi đi chỗ khác".
// Dùng chung cho animals.js (bò, gà) và ecology.js (cừu, ngựa, thỏ). Không phải hệ thống riêng (không đăng ký vào main).
//  · Mỗi con có đồng hồ khát a.thirstT; hết → tìm ô ĐẤT trống sát nước (ao, sông, bờ biển) gần nhất trong bán kính R,
//    đi thẳng tới (bước theo walk() của module gọi — vốn coi nước là vật chắn, nên KHÔNG bao giờ bước xuống nước),
//    quay mặt ra nước, cúi đầu uống 2–3 s (tư thế: phần đầu của chính ảnh PixelLab hạ 1–2 px, không VFX lặp), rồi no (lâu mới khát lại)
//    và bỏ đi hướng ngược mặt nước.
//  · Danh sách ô bờ nước: quét cả bản đồ 1 lần, giữ 6 s (ao mới đào sẽ có trong ≤ 6 s) — không tìm đường mỗi khung.
//  · Bị người chơi xua (st 'flee') / kẹt đường → bỏ lượt uống, lát nữa khát lại; ô bờ đã có con khác giữ thì chọn ô khác.
const TILE = 16, TAU = Math.PI * 2;
const C = { map: null, t: -99, list: [], taken: new Map() };
const keyOf = (tx, ty) => tx + ',' + ty;
const isWet = (ctx, g0) => g0 === ctx.T.WATER || g0 === ctx.T.DEEP;
/* 4 hướng tới nước: [dx, dy, face] */
const DIRS = [[1, 0, 'e'], [-1, 0, 'w'], [0, 1, 's'], [0, -1, 'n']];

function shoreList(ctx) {
  const m = ctx.S.map, now = ctx.S.time || 0;
  if (C.map === m && now - C.t < 6 && now >= C.t) return C.list;
  if (C.map !== m) C.taken.clear();
  C.map = m; C.t = now; C.list = [];
  for (let ty = 2; ty < m.h - 2; ty++) for (let tx = 2; tx < m.w - 2; tx++) {
    const g0 = ctx.getG(m, tx, ty); if (g0 === undefined || isWet(ctx, g0) || ctx.isSolid(m, tx, ty)) continue;
    for (const [dx, dy, face] of DIRS) if (isWet(ctx, ctx.getG(m, tx + dx, ty + dy))) { C.list.push({ tx, ty, dx, dy, face, k: keyOf(tx, ty) }); break; }
  }
  return C.list;
}
/* điểm chân con thú đứng uống: trong ô bờ, lệch về phía nước */
function standAt(s) { return { x: s.tx * TILE + 8 + s.dx * 4, y: s.ty * TILE + (s.dy > 0 ? 14 : s.dy < 0 ? 6 : 12) }; }
function free(s, a) { const o = C.taken.get(s.k); return !o || o === a || !o.dr || o.dr.k !== s.k; }
function pick(ctx, a, walk, R) {
  let best = null, bd = R * R;
  for (const s of shoreList(ctx)) {
    const p = standAt(s), d = (p.x - a.x) ** 2 + (p.y - a.y) ** 2; if (d >= bd || s.k === a.badK || !free(s, a)) continue;
    if (!walk(p.x, p.y)) continue;
    bd = d; best = { ...s, x: p.x, y: p.y };
  }
  return best;
}
function cancel(a, wait) { if (a.dr) C.taken.delete(a.dr.k); a.dr = null; a.thirstT = wait + Math.random() * 10; }
const isDrinking = a => !!(a && a.dr && a.dr.ph === 'drink');
export { isDrinking };

/* gọi mỗi khung TRƯỚC wander của module. true = thirst đang điều khiển con này (module bỏ qua wander khung này).
   opt: { walk(x, y) → bool, step(dx, dy) → bool (đã đi được), sp (px/s), R (px, mặc định 170) } */
export function thirst(dt, ctx, a, opt) {
  if (a.st === 'flee') { if (a.dr) cancel(a, 12); return false; }
  if (!a.dr) {
    if (a.thirstT === undefined) a.thirstT = 12 + Math.random() * 40;
    a.thirstT -= dt; if (a.thirstT > 0) return false;
    const s = pick(ctx, a, opt.walk, opt.R || 170);
    if (!s) { a.thirstT = 25 + Math.random() * 30; return false; }
    a.dr = { ...s, ph: 'go', t: 0, chk: 0, last: Math.hypot(s.x - a.x, s.y - a.y) }; C.taken.set(s.k, a);
  }
  const d = a.dr;
  if (d.ph === 'go') {
    d.t += dt; const vx = d.x - a.x, vy = d.y - a.y, dist = Math.hypot(vx, vy);
    if (dist < 1.5) {   /* tới mép nước: đứng sát, quay mặt ra nước, cúi uống */
      a.x = d.x; a.y = d.y; d.ph = 'drink'; d.t = 0; d.T = 2 + Math.random(); a.st = 'idle'; a.fr = 0;
      a.face = d.face; if (d.dx) a.dir = d.dx; a.ang = Math.atan2(d.dy, d.dx);
      return true;
    }
    const k = Math.min(dist, opt.sp * dt) / dist;
    opt.step(vx * k, vy * k);
    a.st = 'walk'; a.ang = Math.atan2(vy, vx); a.dir = vx >= 0 ? 1 : -1;
    a.face = Math.abs(vx) >= Math.abs(vy) ? (vx >= 0 ? 'e' : 'w') : (vy >= 0 ? 's' : 'n');
    d.chk += dt; if (d.chk >= 1) { d.chk = 0; if (d.last - dist < 2) d.stuck = (d.stuck || 0) + 1; else d.stuck = 0; d.last = dist; }
    if (d.stuck >= 2 || d.t > 14) { a.badK = d.k; cancel(a, 15); a.st = 'idle'; a.t = 0.5; }   /* kẹt (vật chắn) → thôi, lát chọn ô khác */
    return true;
  }
  /* đang uống */
  d.t += dt; a.st = 'idle'; a.fr = 0;
  const T = d.T, t = d.t, mid = Math.abs(t - T / 2) < 0.15;
  d.dip = t < 0.2 || t > T - 0.2 || mid ? 1 : 2;   /* hạ đầu → uống → ngẩng nhẹ 1 nhịp → uống → ngẩng */
  if (t >= T) {   /* no rồi: lâu mới khát lại, quay lưng bỏ đi */
    C.taken.delete(d.k); a.dr = null; a.badK = null; a.drinkN = (a.drinkN || 0) + 1; a.thirstT = 70 + Math.random() * 70;
    a.st = 'walk'; a.ang = Math.atan2(-d.dy, -d.dx) + (Math.random() - 0.5) * 1.0; a.t = 1.6 + Math.random() * 1.2;
    a.dir = Math.cos(a.ang) >= 0 ? 1 : -1; a.face = Math.abs(Math.cos(a.ang)) >= Math.abs(Math.sin(a.ang)) ? (Math.cos(a.ang) >= 0 ? 'e' : 'w') : (Math.sin(a.ang) >= 0 ? 's' : 'n');
    return false;
  }
  return true;
}

/* vẽ ảnh thú (đúng ảnh PixelLab đang dùng); đang uống → phần ĐẦU hạ dip px (nhìn ngang: nửa phía nước; nhìn dọc: nửa trên).
   img có thể là canvas __hi (shim drawImage nhân toạ độ nguồn) → dùng toạ độ logic, drawImage 9 tham số. */
export function drawThirsty(g, img, dx, dy, a) {
  const dip = isDrinking(a) ? a.dr.dip || 0 : 0;
  if (!dip) { g.drawImage(img, dx, dy); return; }
  const w = img.width, h = img.height, d = a.dr, top = Math.round(h * 0.62);
  if (d.dx) {   /* nhìn ngang: đầu ở nửa phía nước */
    const sw = Math.round(w * 0.5), fx = d.dx > 0 ? sw : 0, fw = d.dx > 0 ? w - sw : sw, rx = d.dx > 0 ? 0 : sw, rw = w - fw;
    g.drawImage(img, rx, 0, rw, h, dx + rx, dy, rw, h);                          /* thân sau giữ nguyên */
    g.drawImage(img, fx, top, fw, h - top, dx + fx, dy + top, fw, h - top);      /* chân trước giữ nguyên */
    g.drawImage(img, fx, 0, fw, top, dx + fx, dy + dip, fw, top);                /* đầu + cổ hạ xuống */
  } else {      /* nhìn dọc (ra nước phía nam / bắc): nửa trên hạ */
    g.drawImage(img, 0, top, w, h - top, dx, dy + top, w, h - top);
    g.drawImage(img, 0, 0, w, top, dx, dy + Math.min(dip, 1), w, top);
  }
}
export function thirstReset() { C.map = null; C.list = []; C.taken.clear(); C.t = -99; }
export function shoreCount(ctx) { return shoreList(ctx).length; }
if (typeof window !== 'undefined') window.__thirst = { reset: thirstReset, n: () => C.list.length };   /* test: quét lại bờ nước ngay (ao vừa đào) */
