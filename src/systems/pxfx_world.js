/* pxfx_world.js — p69: VFX NGOÀI MAP vẽ CODE HOÀN TOÀN (đòn người chơi, quái trúng / chết, nhặt đồ, lên cấp, bụi / mảnh khai thác, Ki lộn / lướt, lá rơi…).
   Thay các sheet PixelLab nhỏ (slash_t*, monster_poof, item_pickup_pop, level_up, dirt_puff, wood_chips, rock_debris, footstep_dust, ki_dust, ki_wind, leaf_fall…)
   bằng cảnh hạt vẽ từng pixel. Anh cho phép 2026-10-30 ("VFX nào thay được bằng Claude code thì cứ thay").

   Kỹ thuật theo Sprite Fusion VFX (ice.ts / movement.ts / black-hole.ts / rain.ts):
     MIT License — Copyright (c) 2026 Hugo Duprez. Rng, bayer, hash2, easing, mix lấy qua pxfx.js (chuyển thể từ các file trên; giữ ghi chú này khi chép tiếp).
   Khác pxfx.js (cảnh trận đấu to, 1 cảnh / lần): ở thế giới có thể có hàng chục hiệu ứng nhỏ cùng lúc → BỘ ĐỆM DÙNG LẠI (pool theo cỡ),
   chỉ 2 lớp (back sau vật / front trước vật), không lớp cộng sáng (không ám màu cỏ), hạt tự tắt gọn (co lại / đặc rồi tắt — không lưới chấm thưa).
   Toạ độ logic: x, y = điểm trên mặt đất, z = độ cao. Bộ đệm RES = 2 điểm / px logic, canvas thường KHÔNG __hi → vẽ ra game bằng drawImage 9 tham số.

   API:  WFX.spawn(kind, x, y, o) → hiệu ứng | null · WFX.update(dt) · WFX.drawables(out, g, cx, cy, VW, VH) · WFX.clear()
         o: { top (vẽ trên mọi thứ), dir {x,y} (hướng đòn), flip, pow, fin, armor, shell, tier, w, h (cỡ quái), col [màu quái], dur, follow () => {x,y} }
         WFX.hooks = { stop(sec), shake(sec), zoom(k, sec, x, y) } — hệ vfx.js gắn vào ctx (hitstop / rung / zoom-punch theo sức). */
import { PAL, KIT } from './pxfx.js';
const { Rng, bayer, hash2, mix, hex, clamp, lerp, smooth, outCubic, outBack, TAU } = KIT;
const RES = 2;
const P8 = a => a.map(hex);
export const WPAL = {
  steel: P8(['#ffffff', '#f6f2e8', '#ddd6c6', '#bdb3a0', '#968c7a', '#6e665a', '#4a443c', '#2a2622']),
  smoke: P8(['#f4f0f8', '#d8d0e4', '#b8aecb', '#968aab', '#74698a', '#554c6a', '#3a334b', '#221e2e']),
  dirt: PAL.chan,
  rock: P8(['#f0eee8', '#cfcac0', '#aaa498', '#878174', '#666055', '#48433b', '#2f2b26', '#1a1815']),
  wood: P8(['#f6dcaa', '#e0b474', '#c08a50', '#9a683c', '#764b2c', '#56331f', '#3a2116', '#20120c']),
  gold: PAL.quang, leaf: PAL.moc, ice: PAL.suong, am: PAL.am, loi: PAL.loi, nham: PAL.nham, heal: PAL.ma,
};
const TIER = ['steel', 'steel', 'steel', 'ice', 'am', 'loi', 'nham'];   /* màu tia lửa theo cấp kiếm, khớp màu vệt chém slash_t0…t6 cũ */

/* ---------- bộ đệm dùng lại ---------- */
function mkCanvas(w, h) { if (typeof document !== 'undefined') { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; } return new OffscreenCanvas(w, h); }
class Buf {   /* r3 (hiệu năng): chỉ xoá / đẩy / vẽ KHUNG BAO bẩn (điểm vừa vẽ ∪ lần trước) — bản 1 đẩy cả hộp mỗi khung: p95 11,7 ms ở CPU ×4.
     Đẩy hết TRƯỚC khi danh sách vẽ chạy (prep) + mọi bộ đệm chung 1 canvas atlas: putImageData vào nhiều canvas khác nhau xen giữa lệnh vẽ tốn ~0,14 ms / lần ở CPU ×4.
     Đã thử và bỏ: chia ô 16×16, canvas mềm (willReadFrequently). */
  constructor(w, h) { this.w = w; this.h = h; this.data = new Uint32Array(w * h); this.n = 0; this.cv = null; this.id = null; this.dirty = true; this.x0 = this.y0 = 1e9; this.x1 = this.y1 = -1; this.pOn = false; this.p0 = this.p1 = this.p2 = this.p3 = 0; }
  clear() {
    if (this.n) { const w = this.w; for (let y = this.y0; y <= this.y1; y++) this.data.fill(0, y * w + this.x0, y * w + this.x1 + 1); this.n = 0; }
    this.x0 = this.y0 = 1e9; this.x1 = this.y1 = -1; this.dirty = true;
  }
  set(x, y, c) { x |= 0; y |= 0; if (x < 0 || y < 0 || x >= this.w || y >= this.h) return; this.data[y * this.w + x] = c; this.n++; if (x < this.x0) this.x0 = x; if (x > this.x1) this.x1 = x; if (y < this.y0) this.y0 = y; if (y > this.y1) this.y1 = y; }
  dot(x, y, c, a = 1) { const X = Math.floor(x), Y = Math.floor(y); if (a >= 1 || a > bayer(X, Y)) this.set(X, Y, c); }
  canvas() {
    if (!this.cv) { WFX.tm.nn = (WFX.tm.nn || 0) + 1; const a = atlasAlloc(this.w, this.h); this.id = new ImageData(new Uint8ClampedArray(this.data.buffer), this.w, this.h);   /* r3: chung 1 canvas atlas */
      if (a) { this.cv = ATL.cv; this.ctx = ATL.ctx; this.ox = a[0]; this.oy = a[1]; } else { this.cv = mkCanvas(this.w, this.h); this.ctx = this.cv.getContext('2d'); this.ox = this.oy = 0; } }
    if (this.dirty) {
      const has = this.n > 0; let ux0 = has ? this.x0 : 1e9, uy0 = has ? this.y0 : 1e9, ux1 = has ? this.x1 : -1, uy1 = has ? this.y1 : -1;
      if (this.pOn) { ux0 = Math.min(ux0, this.p0); uy0 = Math.min(uy0, this.p1); ux1 = Math.max(ux1, this.p2); uy1 = Math.max(uy1, this.p3); }
      if (ux1 >= ux0) { this.ctx.putImageData(this.id, this.ox, this.oy, ux0, uy0, ux1 - ux0 + 1, uy1 - uy0 + 1); WFX.tm.nc = (WFX.tm.nc || 0) + 1; WFX.tm.np = (WFX.tm.np || 0) + (ux1 - ux0 + 1) * (uy1 - uy0 + 1); }
      this.pOn = has; if (has) { this.p0 = this.x0; this.p1 = this.y0; this.p2 = this.x1; this.p3 = this.y1; } this.dirty = false;
    }
    return this.cv;
  }
}
const ATL = { cv: null, ctx: null, W: +((typeof location !== 'undefined' && (location.search.match(/atlw=(\d+)/) || [])[1]) || 2048), H: +((typeof location !== 'undefined' && (location.search.match(/atlh=(\d+)/) || [])[1]) || 1024), x: 0, y: 0, rh: 0 };
function atlasAlloc(w, h) {   /* xếp kệ: hết hàng thì xuống kệ mới; đầy → null (bộ đệm dùng canvas riêng). Bộ đệm trả về pool giữ nguyên chỗ trong atlas. */
  if (!ATL.cv) { ATL.cv = mkCanvas(ATL.W, ATL.H); ATL.ctx = ATL.cv.getContext('2d'); }
  if (ATL.x + w > ATL.W) { ATL.x = 0; ATL.y += ATL.rh; ATL.rh = 0; }
  if (ATL.y + h > ATL.H || w > ATL.W) return null;
  const r = [ATL.x, ATL.y]; ATL.x += w + 2; ATL.rh = Math.max(ATL.rh, h + 2); return r;
}
const POOL = new Map();
function take(w, h) { const k = w + 'x' + h, a = POOL.get(k); if (a && a.length) { const b = a.pop(); b.clear(); return b; } return new Buf(w, h); }
function give(b) { if (!b) return; const k = b.w + 'x' + b.h; let a = POOL.get(k); if (!a) POOL.set(k, a = []); if (a.length < 12) a.push(b); }

/* ---------- vẽ cơ bản (toạ độ điểm đệm) ---------- */
/* r3 (hiệu năng): khối tròn / sao chớp dựng 1 lần thành "con dấu" (mảng điểm) theo cỡ + màu, sau đó chỉ chép — bản trước tính hypot / atan2 / pow từng điểm mỗi khung */
/* r4 (GC): khoá con dấu là SỐ (không ghép chuỗi), hàm dựng chỉ tạo khi chưa có (không tạo closure mỗi lần vẽ) */
const STAMP = new Map();
function mixh(h, v) { h ^= v >>> 0; h = Math.imul(h, 16777619); return h ^ (h >>> 13); }
function skey(a, b, c, d, e) { return (mixh(mixh(mixh(mixh(mixh(2166136261, a), b), c), d), e) >>> 0) * 4 + a; }
function stampMake(key, R, fn) {
  const w = 2 * R + 1, px = new Uint32Array(w * w); for (let yy = -R; yy <= R; yy++) for (let xx = -R; xx <= R; xx++) { const c = fn(xx, yy); if (c) px[(yy + R) * w + xx + R] = c; }
  const st = { R, w, px }; if (STAMP.size > 600) STAMP.clear(); STAMP.set(key, st); return st;
}
function blit(B, x, y, st) {
  const R = st.R, w = st.w, px = st.px, bw = B.w, bh = B.h, d = B.data; let n = 0;
  const xa = Math.max(0, x - R), xb = Math.min(bw - 1, x + R), ya = Math.max(0, y - R), yb = Math.min(bh - 1, y + R); if (xa > xb || ya > yb) return;
  for (let yy = ya; yy <= yb; yy++) { const so = (yy - y + R) * w - x + R, row = yy * bw; for (let xx = xa; xx <= xb; xx++) { const c = px[so + xx]; if (c) { d[row + xx] = c; n++; } } }
  if (n) { B.n += n; if (xa < B.x0) B.x0 = xa; if (xb > B.x1) B.x1 = xb; if (ya < B.y0) B.y0 = ya; if (yb > B.y1) B.y1 = yb; }
}
function disc(B, x, y, r, ry, cm, chi, clo) {   /* cục khói / bụi kiểu pixel: tròn đặc, nửa trên sáng, mép dưới tối — không dither */
  if (r < 0.6) { B.set(x, y, cm); return; }
  const rq = Math.round(r * 2) / 2, ryq = Math.round(ry * 2) / 2, key = skey(1, rq * 2 + ryq * 512, cm, chi, clo);
  const st = STAMP.get(key) || stampMake(key, Math.ceil(Math.max(rq, ryq)), (xx, yy) => {
    const dx = (xx + 0.5) / rq, dy = (yy + 0.5) / ryq, d = dx * dx + dy * dy; if (d > 1) return 0;
    return dy < -0.25 && dx < 0.5 && d < 0.75 ? chi : d > 0.62 && dy > 0.45 ? clo : cm;   /* r2: viền tối chỉ mỏng ở mép dưới (bản 1 như hòn sỏi) */
  });
  blit(B, Math.round(x), Math.round(y), st);
}
function burst(B, x, y, r, n, c0, c1, c2, rot) {   /* chớp trúng đòn: ngôi sao nhiều cánh đặc (lõi trắng, mép màu hệ) */
  const rq = Math.round(r * 2) / 2, rt = Math.round(rot * 8) / 8, key = skey(2, rq * 2 + n * 512 + Math.round(rt * 8) * 65536, c0, c1, c2 ^ 0x5bd1e995);
  const st = STAMP.get(key) || stampMake(key, Math.ceil(rq), (xx, yy) => {
    const d = Math.hypot(xx, yy) / rq; if (d > 1) return 0; const a = Math.atan2(yy, xx) + rt, spike = 0.42 + 0.58 * Math.pow(Math.abs(Math.cos(a * n / 2)), 6);
    if (d > spike) return 0; return d < spike * 0.45 ? c0 : d < spike * 0.8 ? c1 : c2;
  });
  blit(B, Math.round(x), Math.round(y), st);
}
function hline(B, xa, xb, y, c) { xa = Math.max(0, Math.round(xa)); xb = Math.min(B.w - 1, Math.round(xb)); y = Math.round(y); if (xa > xb || y < 0 || y >= B.h) return; B.data.fill(c, y * B.w + xa, y * B.w + xb + 1); B.n += xb - xa + 1; if (xa < B.x0) B.x0 = xa; if (xb > B.x1) B.x1 = xb; if (y < B.y0) B.y0 = y; if (y > B.y1) B.y1 = y; }
function seg(B, x0, y0, x1, y1, c) { const n = Math.max(1, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)))); for (let i = 0; i <= n; i++) B.set(Math.round(lerp(x0, x1, i / n)), Math.round(lerp(y0, y1, i / n)), c); }
function ringE(B, x, y, r, sq, c, th, half) {   /* vòng elip trên đất (top-down), half: 1 = nửa trước (dưới), -1 = nửa sau, 0 = cả vòng */
  const n = Math.max(12, Math.ceil(r * TAU * 1.2));
  for (let j = 0; j < n; j++) { const a = j / n * TAU, s = Math.sin(a); if (half > 0 && s < 0) continue; if (half < 0 && s >= 0) continue;
    for (let q = 0; q < th; q++) B.set(Math.round(x + Math.cos(a) * (r - q)), Math.round(y + s * (r - q) * sq), c); }
}
function star4(B, x, y, arm, c0, c1, diag) {   /* sao 4 cánh chớp lúc chạm */
  x = Math.round(x); y = Math.round(y); B.set(x, y, c0);
  for (let d = 1; d <= arm; d++) { const c = d <= arm * 0.45 ? c0 : c1; B.set(x + d, y, c); B.set(x - d, y, c); B.set(x, y + d, c); B.set(x, y - d, c); if (d <= 2) { B.set(x + d, y + 1, c1); B.set(x - d, y - 1, c1); B.set(x + 1, y - d, c1); B.set(x - 1, y + d, c1); } }
  if (diag) for (let d = 1; d <= diag; d++) { const c = d === 1 ? c0 : c1; B.set(x + d, y + d, c); B.set(x - d, y - d, c); B.set(x + d, y - d, c); B.set(x - d, y + d, c); }
}

/* ---------- hạt (đơn vị logic) ---------- */
const G = 520;
const PK = { SPARK: 0, CHIP: 1, PUFF: 2, MOTE: 3, LEAF: 4, STAR: 5, SOUL: 6 };
const PPOOL = [];   /* r4 (GC): hạt dùng lại — bản trước tạo object mới mỗi hạt */
function part(c, k, x, y, z, vx, vy, vz, life, col, size = 1, o) {
  const p = PPOOL.pop() || {};
  p.k = k; p.x = x; p.y = y; p.z = z; p.vx = vx; p.vy = vy; p.vz = vz; p.life = life; p.max = life; p.col = col; p.size = size;
  p.g = 0; p.drag = 0; p.bounce = 0; p.rest = false; p.a = c.R.range(0, TAU); p.va = 0; p.seed = c.R.next() * 100; p.lift = 0; p.sway = 0; p.sw = 0;
  p.pal = null; p.tail = 0; p.grow = undefined; p.sq = 0; p.hard = 0; p.qf = 0;
  if (o) for (const key in o) p[key] = o[key];
  c.ps.push(p); return p;
}
function stepParts(c, dt) {
  for (let i = c.ps.length - 1; i >= 0; i--) {
    const p = c.ps[i]; if ((p.life -= dt) <= 0) { const last = c.ps.pop(); if (last !== p) c.ps[i] = last; if (PPOOL.length < 4000) PPOOL.push(p); continue; }   /* r4: xoá kiểu hoán đổi cuối (không splice) + trả hạt về pool */
    if (!p.rest) {
      p.vz += (p.lift - G * p.g) * dt; const d = p.drag; if (d) { const f = Math.max(0, 1 - d * dt); p.vx *= f; p.vy *= f; p.vz *= f; }
      p.a += p.va * dt; if (p.sway) p.x += Math.sin(c.t * (p.sw || 5) + p.seed) * p.sway * dt;
    } else { const f = Math.max(0, 1 - 9 * dt); p.vx *= f; p.vy *= f; }
    p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
    if (p.z < 0) { p.z = 0; const sp = -p.vz; if (p.bounce > 0 && sp > 40) { p.vz = sp * p.bounce; p.vx *= 0.6; p.vy *= 0.6; p.va *= 0.5; } else { p.vz = 0; if (p.g > 0 && !p.rest) { p.rest = true; p.va = 0; } } }
  }
}
function drawPart(B, c, p) {
  const P = c.P, k = p.life / p.max, x = c.X(p.x), y = c.Y(p.y, p.z);
  switch (p.k) {
    case PK.SPARK: {   /* tia lửa: vệt theo vận tốc, ngắn dần khi chậm; đầu trắng */
      const vy = p.vy - p.vz, sp = Math.hypot(p.vx, vy) || 1, L = clamp(sp / 22, 1, p.size * 5) * RES * Math.min(1, k * 2.2), ux = p.vx / sp, uy = vy / sp, P2 = p.pal || P;
      const thick = p.size > 1.4;
      for (let d = 0; d <= L; d += 0.7) { const X = Math.round(x - ux * d), Y = Math.round(y - uy * d), col = d < 1.2 ? P2[0] : d < L * 0.5 ? P2[1 + (p.col | 0)] : P2[3 + (p.col | 0)]; B.set(X, Y, col); if (thick && d < L * 0.55) B.set(X, Y + 1, d < 1.2 ? P2[1] : P2[2 + (p.col | 0)]); }
      break; }
    case PK.CHIP: {   /* mảnh vụn: khối 1–3 điểm xoay, mặt sáng / tối; bóng nhỏ khi ở cao */
      const s = p.size, ca = Math.cos(p.a), sa = Math.sin(p.a), P2 = p.pal || P, X = Math.round(x), Y = Math.round(y);
      if (p.z > 3 && s >= 1.5) B.set(X, Math.round(c.Y(p.y)), P2[7]);
      if (s < 1.5) { B.set(X, Y, P2[p.col | 0]); if (k > 0.25) B.set(X + (ca > 0 ? 1 : -1), Y, P2[(p.col | 0) + 2]); break; }
      const r = Math.ceil(s);
      for (let py = -r; py <= r; py++) for (let px = -r; px <= r; px++) { const u = px * ca + py * sa, v = -px * sa + py * ca, d = Math.abs(u) / s + Math.abs(v) / (s * 0.65); if (d > 1.05) continue;
        B.set(X + px, Y + py, d > 0.8 ? P2[Math.min(7, (p.col | 0) + 3)] : v < 0 ? P2[p.col | 0] : P2[Math.min(7, (p.col | 0) + 1)]); }
      break; }
    case PK.PUFF: {   /* bụi / khói: cục tròn đặc CO LẠI theo tuổi (tắt gọn) */
      const P2 = p.pal || P, ci = p.col | 0, grow = p.grow ?? 0.5, u = 1 - k, r = p.size * RES * (u < 0.65 ? lerp(1 - grow, 1, outCubic(u / 0.65)) : 1 - Math.pow((u - 0.65) / 0.35, 1.6));   /* r2: nở nhanh → giữ → co về 0 (tắt gọn) */
      if (r < 0.5) break; disc(B, x, y, r, Math.max(0.5, r * (p.sq || 0.8)), P2[ci], P2[Math.max(0, ci - 1)], P2[Math.min(7, ci + 2)]); break; }
    case PK.MOTE: {   /* hạt sáng nhỏ: 1 điểm + đuôi ngắn theo vận tốc, nhấp nháy đều (không ngẫu nhiên) */
      const P2 = p.pal || P, X = Math.round(x), Y = Math.round(y), tw = Math.sin(c.t * 18 + p.seed) > -0.3;
      B.set(X, Y, tw ? P2[0] : P2[1 + (p.col | 0)]);
      if (p.tail) { const vy = p.vy - p.vz, sp = Math.hypot(p.vx, vy) || 1; for (let d = 1; d <= p.tail; d++) B.set(Math.round(X - p.vx / sp * d), Math.round(Y - vy / sp * d), P2[Math.min(7, 1 + (p.col | 0) + d)]); }
      if (p.size > 1 && k > 0.3) { const c1 = P2[2 + (p.col | 0)]; B.set(X + 1, Y, c1); B.set(X - 1, Y, c1); B.set(X, Y + 1, c1); B.set(X, Y - 1, c1); }
      break; }
    case PK.STAR: {   /* sao lấp lánh 4 cánh: cánh dài rồi co (theo tuổi) */
      const P2 = p.pal || P, arm = Math.max(0, Math.round(p.size * Math.sin(Math.PI * clamp(1 - k)) + 0.2));
      star4(B, x, y, arm, P2[0], P2[2 + (p.col | 0)], arm >= 3 ? 1 : 0); break; }
    case PK.LEAF: {   /* lá: 2–3 điểm xoay, lật màu theo góc */
      const P2 = p.pal || P, ca = Math.cos(p.a), sa = Math.sin(p.a), X = Math.round(x), Y = Math.round(y), face = Math.sin(p.a * 1.7 + p.seed) > 0;
      const c1 = face ? P2[0] : P2[2], c2 = face ? P2[1] : P2[4];   /* r2: lá sáng hơn cỏ cho dễ thấy */
      B.set(X, Y, c1); B.set(X + 1, Y, c1); B.set(X, Y + 1, c2); B.set(Math.round(X + ca * 2.2), Math.round(Y + sa * 2.2), c2); if (p.size > 1) { B.set(Math.round(X - ca * 2.2), Math.round(Y - sa * 2.2), c1); B.set(Math.round(X + ca * 2.2) + 1, Math.round(Y + sa * 2.2), c2); }   /* r2: lá ~2 px logic (r1 lẫn vào tán) */
      break; }   /* r2: bỏ chấm bóng lá (thành chấm đen trên cỏ) */
    case PK.SOUL: {   /* linh hồn quái: đốm sáng bay lên, đuôi lượn 3 điểm, co lại cuối đời */
      const P2 = p.pal || P, X = Math.round(x), Y = Math.round(y), big = k > 0.4;
      B.set(X, Y, P2[0]); if (big) { B.set(X + 1, Y, P2[1]); B.set(X, Y + 1, P2[1]); B.set(X + 1, Y + 1, P2[2]); }
      for (let d = 1; d <= 3; d++) B.set(X + Math.round(Math.sin(c.t * 9 + p.seed - d * 0.8) * 1.2), Y + 1 + d + (big ? 1 : 0), P2[Math.min(7, 2 + d)]);
      break; }
  }
}

/* ---------- hỗ trợ cảnh ---------- */
function dirOf(o) { if (o.dir && (o.dir.x || o.dir.y)) { const d = Math.hypot(o.dir.x, o.dir.y); return { x: o.dir.x / d, y: o.dir.y / d }; } return { x: o.flip ? -1 : 1, y: 0 }; }
function puffs(c, n, x, y, z, spd, life, size, col, o = {}) {
  const R = c.R; for (let i = 0; i < n; i++) { const a = o.a != null ? o.a + R.range(-(o.spread ?? 0.6), o.spread ?? 0.6) : R.range(0, TAU), s = R.range(0.5, 1) * spd;
    part(c, PK.PUFF, x + R.range(-1.5, 1.5), y + R.range(-1, 1), z + R.range(0, o.zr || 0), Math.cos(a) * s, Math.sin(a) * s * 0.55, R.range(o.vz0 ?? 4, o.vz1 ?? 14), life * R.range(0.8, 1.15), col + (R.chance(0.4) ? 1 : 0), size * R.range(0.75, 1.15), { drag: o.drag ?? 5, pal: o.pal, grow: o.grow, sq: o.sq }); }
}
function chips(c, n, x, y, z, spd, pal, o = {}) {
  const R = c.R; for (let i = 0; i < n; i++) { const a = o.a != null ? o.a + R.range(-(o.spread ?? 0.9), o.spread ?? 0.9) : R.range(0, TAU), s = R.range(0.45, 1) * spd;
    part(c, PK.CHIP, x + R.range(-2, 2), y + R.range(-1, 1) + (o.fy || 0), z + R.range(0, o.zr || 2), Math.cos(a) * s, Math.sin(a) * s * 0.6, R.range(o.vz0 ?? 50, o.vz1 ?? 120), R.range(o.l0 ?? 0.45, o.l1 ?? 0.7), R.int(o.c0 ?? 1, o.c1 ?? 3), R.range(o.s0 ?? 1, o.s1 ?? 2.2), { g: 1, drag: 0.6, bounce: o.bounce ?? 0.35, va: R.range(-16, 16), pal }); }
}
function sparks(c, n, x, y, z, d, spd, pal, o = {}) {
  const R = c.R, base = Math.atan2(d.y, d.x); for (let i = 0; i < n; i++) { const a = base + R.range(-(o.spread ?? 1), o.spread ?? 1), s = R.range(0.55, 1) * spd;
    part(c, PK.SPARK, x, y + R.range(-1, 1), z + R.range(-3, 3), Math.cos(a) * s, Math.sin(a) * s * 0.7, R.range(o.vz0 ?? 10, o.vz1 ?? 90), R.range(o.l0 ?? 0.14, o.l1 ?? 0.28), R.chance(0.5) ? 0 : 1, o.size ?? 1, { g: o.g ?? 0.35, drag: o.drag ?? 3, pal }); }
}

/* ===================== CẢNH ===================== */
/* mỗi cảnh: { box: [rộng, cao, phía trên chân] logic, end (s), init(c), update(c, t, dt), back(B, c, t), front(B, c, t) } */
const SC = {};

/* ĐÒN KIẾM TRÚNG QUÁI (combo 1–2 nhẹ, đòn 3 chốt) — r2 (tự chê r1: chớp mảnh như sợi chỉ, vòng tròn rỗng như bong bóng, bụi nâu đậm như cục đất):
   khung 0 chớp sao NHIỀU CÁNH ĐẶC (lõi trắng) + vết cắt dày 2 điểm → vạch tốc độ toả ra ngắn dần → tia lửa dày văng theo hướng đòn rồi rơi;
   bụi chân màu đất SÁNG, nhỏ, nằm sau quái. Đòn chốt: hitstop 0,11 s + zoom-punch + sóng đất + nứt + sỏi + vệt bụi trượt theo quái bị hất.
   Giáp / vỏ (sát thương bị chặn): tia lửa kim loại toả rộng + sỏi đá, không vạch tốc độ (cảm giác "keng"). */
SC.hit = {
  box: o => (o.fin ? [100, 74, 54] : [72, 58, 46]), end: o => (o.fin ? 0.95 : 0.5),
  init(c) {
    const o = c.o, d = dirOf(o), pow = o.fin ? 2 : o.pow || (o.step === 1 ? 1.15 : 1), h = o.h || 16, zc = Math.max(6, Math.min(15, h * 0.5)), sh = !!o.shell, R = c.R;
    c.d = d; c.pow = pow; c.zc = zc; c.sh = sh; c.SP = WPAL[sh ? 'steel' : TIER[o.tier | 0] || 'steel']; c.rot = R.range(0, 1);
    c.cut = { a: Math.atan2(d.y, d.x) + Math.PI / 2 + (o.step === 1 ? -0.6 : 0.6), L: 8 + 3 * pow };   /* vết cắt gần vuông góc hướng đòn; đòn 2 nghiêng ngược đòn 1 */
    c.rays = Array.from({ length: o.fin ? 10 : 7 }, (_, i) => ({ a: (i / (o.fin ? 10 : 7)) * TAU + R.range(-0.2, 0.2), L: R.range(3, 6) * (o.fin ? 1.4 : 1), r0: R.range(4, 6) }));
    const hk = c.hooks; if (hk) { hk.stop && hk.stop(o.fin ? 0.11 : sh ? 0.06 : 0.05); if (o.fin) { hk.shake && hk.shake(0.42); hk.zoom && hk.zoom(1.035, 0.1, c.ax, c.ay - zc); } else hk.shake && hk.shake(sh ? 0.16 : 0.12); }
    const hx = c.ax - d.x * 2, hy = c.ay + 0.5, n = Math.round((sh ? 12 : 9) * pow);
    sparks(c, Math.ceil(n * 0.55), hx, hy, zc, d, 170 + 30 * pow, WPAL.gold, { spread: sh ? 1.6 : 0.8, vz1: 80 + 25 * pow, g: 0.7, size: 1.6 });
    sparks(c, Math.floor(n * 0.45), hx, hy, zc, d, 140 + 30 * pow, sh ? WPAL.steel : c.SP, { spread: sh ? 1.6 : 0.95, vz1: 60 + 25 * pow, g: 0.6 });
    if (o.armor || sh) chips(c, 3 + pow * 2, c.ax, c.ay, zc - 2, 75, WPAL.rock, { a: Math.atan2(d.y, d.x), vz0: 40, vz1: 100, s0: 1, s1: 1.7 });
    puffs(c, 2, c.ax - d.x * 3, c.ay - 0.6, 0, 22, 0.34, 1.7, 1, { pal: WPAL.dirt, a: Math.atan2(-d.y, -d.x), spread: 0.9, vz0: 2, vz1: 6, grow: 0.6 });
    if (o.fin) {
      chips(c, 6, c.ax, c.ay - 0.5, 1, 80, WPAL.dirt, { vz0: 70, vz1: 140, s0: 0.9, s1: 1.6, c0: 1, c1: 3, l0: 0.35, l1: 0.5 });
      puffs(c, 6, c.ax, c.ay - 0.5, 0, 70, 0.34, 1.9, 1, { pal: WPAL.dirt, vz0: 3, vz1: 9, grow: 0.6, drag: 6 });   /* r3: bụi đất lan nhanh rồi tắt (r2 nằm ì như cục bánh) */
      c.cracks = Array.from({ length: 5 }, (_, i) => { const a = Math.atan2(d.y, d.x) + Math.PI + (i - 2) * 0.62 + R.range(-0.2, 0.2), pts = [[0, 0]]; let x = 0, y = 0, aa = a; for (let s = 0; s < 4 + (i & 1) * 2; s++) { aa += R.range(-0.5, 0.5); x += Math.cos(aa) * 2.2; y += Math.sin(aa) * 1.1; pts.push([x, y]); } return pts; });
      c.trailT = 0;
    }
  },
  update(c, t, dt) {
    const o = c.o;
    if (o.fin && o.follow && t < 0.34) {   /* vệt bụi trượt theo quái bị hất (sau lưng quái, sát đất) */
      c.trailT -= dt; if (c.trailT <= 0) { c.trailT = 0.035; const m = o.follow(); if (m) { const R = c.R; part(c, PK.PUFF, m.x - c.d.x * 3 + R.range(-1.5, 1.5), m.y - 0.6, 0, -c.d.x * 12, -c.d.y * 6, 5, 0.3, 1 + (R.chance(0.4) ? 1 : 0), R.range(1.3, 2), { drag: 4, pal: WPAL.dirt, grow: 0.5 }); } }
    }
  },
  back(B, c, t) {
    if (!c.o.fin) return; const X = c.X(c.ax), Y = c.Y(c.ay + 1);
    const u = t / 0.24; if (u < 1) ringE(B, X, Y, (5 + 18 * outCubic(u)) * RES, 0.45, u < 0.5 ? WPAL.dirt[0] : WPAL.dirt[1], u < 0.6 ? 2 : 1, -1);
    if (c.cracks && t < 0.9) { const grow = clamp(t / 0.08), shrink = t > 0.55 ? 1 - (t - 0.55) / 0.35 : 1, P = WPAL.dirt;
      for (const pts of c.cracks) { const n = Math.max(0, Math.floor((pts.length - 1) * grow * shrink)); for (let i = 0; i < n; i++) seg(B, X + pts[i][0] * RES, Y + pts[i][1] * RES, X + pts[i + 1][0] * RES, Y + pts[i + 1][1] * RES, i === 0 && t < 0.1 ? P[0] : P[5]); } }
  },
  front(B, c, t) {
    const X = c.X(c.ax), Yc = c.Y(c.ay, c.zc), SP = c.SP, pow = c.pow, G = WPAL.gold;
    if (t < 0.045) burst(B, X, Yc, (4.5 + 2.2 * pow) * RES * 0.5 * (c.sh ? 0.8 : 1), c.o.fin ? 8 : 6, SP[0], G[1], c.sh ? SP[3] : G[3], c.rot);   /* khung đầu: sao đặc */
    else if (t < 0.09) burst(B, X, Yc, (3 + 1.4 * pow) * RES * 0.5, 4, SP[0], SP[1], SP[2], c.rot + 0.4);   /* khung 2: co lại, xoay */
    if (!c.sh && t > 0.02 && t < 0.17) { const u = (t - 0.02) / 0.15;   /* vạch tốc độ toả ra, ngắn dần → tắt */
      for (const r of c.rays) { const r0 = (r.r0 + 9 * pow * outCubic(u)) * RES * 0.5, L = r.L * RES * 0.5 * (1 - u), ca = Math.cos(r.a), sa = Math.sin(r.a) * 0.85;
        if (L >= 1) seg(B, X + ca * r0, Yc + sa * r0, X + ca * (r0 + L), Yc + sa * (r0 + L), u < 0.45 ? SP[0] : SP[2]); } }
    if (t < 0.085) { const cu = c.cut, L = cu.L * RES * 0.5 * (t < 0.045 ? 1 : 1 - (t - 0.045) / 0.04), ca = Math.cos(cu.a), sa = Math.sin(cu.a);   /* vết cắt sáng dày 2 điểm: 2 khung rồi co về tâm */
      if (!c.sh) { seg(B, X - ca * L, Yc - sa * L, X + ca * L, Yc + sa * L, SP[0]); seg(B, X - ca * L * 0.85 + 1, Yc - sa * L * 0.85, X + ca * L * 0.85 + 1, Yc + sa * L * 0.85, SP[0]); seg(B, X - ca * L * 0.6, Yc - sa * L * 0.6 + 2, X + ca * L * 0.6, Yc + sa * L * 0.6 + 2, SP[2]); } }
    if (c.o.fin) { const u = t / 0.24; if (u < 1) ringE(B, c.X(c.ax), c.Y(c.ay + 1), (5 + 18 * outCubic(u)) * RES, 0.45, u < 0.5 ? WPAL.dirt[0] : WPAL.dirt[1], u < 0.6 ? 2 : 1, 1); }
  },
};

/* QUÁI BỊ HẠ — r2 (r1: khói như đống sỏi xám): lõi trắng 1 khung → vòng loé → MÂY KHÓI sáng to dần, bốc lên rồi co về 0 + mảnh màu thân quái văng nảy
   + 3 linh hồn nhỏ bay lên lượn; bóng xám dưới chỗ ngã co lại. Cỡ theo quái (≤ ~2,4 × bề ngang thân). */
SC.kill = {
  box: o => [Math.max(60, (o.w || 16) * 3) | 0, 64, 50], end: () => 0.95,
  init(c) {
    const o = c.o, w = Math.max(10, Math.min(30, o.w || 16)), h = Math.max(10, Math.min(30, o.h || 16)), zc = h * 0.45, R = c.R, k = w / 14;
    const fix = s => (s && s.length === 4 ? '#' + s[1] + s[1] + s[2] + s[2] + s[3] + s[3] : s);
    c.w = w; c.zc = zc; const cols = (o.col && o.col.length ? o.col : ['#8a7a9a', '#5a4d6a', '#c9b8d8']).map(s => hex(fix(s))), BP = [cols[2] || cols[0], cols[2] || cols[0], cols[0], cols[0], cols[1] || cols[0], cols[1] || cols[0], 0xff2a1e22, 0xff1a1215];
    c.hooks && c.hooks.stop && c.hooks.stop(0.06); c.hooks && c.hooks.shake && c.hooks.shake(0.22);
    for (let i = 0; i < 7; i++) { const a = (i / 7) * TAU + R.range(-0.3, 0.3), s = R.range(16, 26) * k; part(c, PK.PUFF, c.ax + Math.cos(a) * 3 * k, c.ay + Math.sin(a) * 1.5, zc + R.range(-2, 4), Math.cos(a) * s * 1.25, Math.sin(a) * s * 0.6, R.range(3, 12), R.range(0.5, 0.66), R.int(1, 2), R.range(3.2, 4.4) * k, { drag: 3.6, pal: WPAL.smoke, grow: 0.7, sq: 0.85 }); }
    part(c, PK.PUFF, c.ax, c.ay + 0.2, zc + 2, 0, 0, 7, 0.56, 1, 4.8 * k, { drag: 2, pal: WPAL.smoke, grow: 0.75, sq: 0.85 });
    chips(c, 6 + (w > 20 ? 3 : 0), c.ax, c.ay, zc, 80, BP, { vz0: 70, vz1: 150, s0: 1.2, s1: 2.2, c0: 1, c1: 3, l0: 0.5, l1: 0.8 });
    for (let i = 0; i < 3; i++) part(c, PK.SOUL, c.ax + (i - 1) * 5 + R.range(-1, 1), c.ay + R.range(-1, 1), zc + 4 + R.range(0, 4), (i - 1) * 6, 0, R.range(24, 34), R.range(0.62, 0.85), 0, 1, { drag: 0.6, pal: WPAL.ice, sway: 9, sw: 6 });
    sparks(c, 8, c.ax, c.ay, zc, { x: 1, y: 0 }, 130, WPAL.gold, { spread: Math.PI, vz0: -20, vz1: 70, l0: 0.12, l1: 0.22, size: 1.6 });
  },
  back(B, c, t) {   /* bóng xám dưới chỗ quái ngã: đặc rồi co lại */
    const k = t < 0.5 ? 1 : 1 - (t - 0.5) / 0.4; if (k <= 0) return; const r = c.w * 0.5 * RES * k;
    disc(B, c.X(c.ax), c.Y(c.ay + 0.5), r, r * 0.35, WPAL.smoke[5], WPAL.smoke[4], WPAL.smoke[6]);
  },
  front(B, c, t) {
    const X = c.X(c.ax), Y = c.Y(c.ay, c.zc), P = WPAL.steel;
    if (t < 0.045) burst(B, X, Y, c.w * 0.55 * RES, 8, P[0], P[0], WPAL.gold[1], 0.2);   /* lõi trắng nhiều cánh 1 khung */
    else if (t < 0.15) { const u = (t - 0.045) / 0.105; ringE(B, X, Y, c.w * (0.5 + 0.55 * outCubic(u)) * RES, 0.85, u < 0.5 ? P[0] : P[2], u < 0.5 ? 2 : 1, 0); }
  },
};

/* NHẶT ĐỒ — r2 (r1: vòng tròn đứng như bong bóng, hạt quá nhỏ): chớp sao 1 khung → vòng nằm trên đất lan ra + 4–5 sao lấp lánh vọt lên theo hình quạt rồi co (≤ 16 px) */
SC.pickup = {
  box: o => (o.big ? [48, 52, 42] : [32, 36, 30]), end: o => (o.big ? 0.75 : 0.55),
  init(c) { const R = c.R, big = c.o.big ? 1.35 : 1, n = c.o.big ? 8 : 5, P = WPAL.gold;
    for (let i = 0; i < n; i++) { const a = -Math.PI / 2 + (i - (n - 1) / 2) * 0.55 + R.range(-0.12, 0.12), s = R.range(36, 52) * big; part(c, i % 2 ? PK.MOTE : PK.STAR, c.ax, c.ay, 5, Math.cos(a) * s * 0.75, 0, -Math.sin(a) * s, R.range(0.34, 0.48) * big, R.int(0, 1), i % 2 ? 2 : 2.6 * big, { drag: 3.4, tail: 2, pal: P }); }
  },
  back(B, c, t) { this.ring(B, c, t, -1); },
  front(B, c, t) { const P = WPAL.gold, big = c.o.big ? 1.6 : 1; this.ring(B, c, t, 1);
    if (t < 0.05) burst(B, c.X(c.ax), c.Y(c.ay, 5), 5 * big * RES * 0.5 + 2, 4, P[0], P[1], P[3], 0);
    else if (t < 0.1) star4(B, c.X(c.ax), c.Y(c.ay, 5), Math.round(4 * big), P[0], P[2], 1); },
  ring(B, c, t, half) { const u = t / 0.22; if (u < 1) ringE(B, c.X(c.ax), c.Y(c.ay + 0.5), (2 + 6 * (c.o.big ? 1.6 : 1) * outCubic(u)) * RES, 0.45, u < 0.5 ? WPAL.gold[1] : WPAL.gold[3], 1, half); },
};

/* LÊN CẤP / HỒI SINH: vòng vàng ở chân lan ra → cột sáng mảnh co lại → hạt vàng bay lên quanh thân + sao trên đầu; ~1 s, không lặp */
SC.levelup = {
  box: () => [56, 64, 56], end: () => 1.05,
  init(c) { c.hooks && c.hooks.shake && c.hooks.shake(0.18); c.burst = false; c.ring2 = false; },
  update(c, t) {
    const R = c.R, P = c.o.heal ? WPAL.heal : WPAL.gold;
    if (t < 0.55 && R.chance(0.9)) for (let i = 0; i < 2; i++) { const a = R.range(0, TAU), r = R.range(4, 10); part(c, PK.MOTE, c.ax + Math.cos(a) * r, c.ay + Math.sin(a) * r * 0.45, R.range(0, 6), 0, 0, R.range(38, 66), R.range(0.45, 0.7), R.int(0, 1), R.chance(0.3) ? 2 : 1, { drag: 0.8, tail: 2, pal: P, sway: 6 }); }
    if (!c.burst && t >= 0.16) { c.burst = true; for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; part(c, PK.SPARK, c.ax, c.ay, 26, Math.cos(a) * 80, 0, Math.sin(a) * 80, 0.2, 0, 1, { drag: 5, pal: P }); } part(c, PK.STAR, c.ax, c.ay, 27, 0, 0, 0, 0.45, 0, 4.2, { pal: P }); }
  },
  back(B, c, t) {   /* r2: cột sáng vẽ SAU người (r1 che kín thân) — rộng hơn thân để thấy 2 bên, thu hẹp rồi tắt */
    this.ring(B, c, t, -1); const P = c.o.heal ? WPAL.heal : WPAL.gold;
    if (t > 0.04 && t < 0.4) { const u = (t - 0.04) / 0.36, hw = Math.max(0, Math.round(4.5 * (1 - u * u) * RES)), X = c.X(c.ax), top = c.Y(c.ay, 6 + 36 * outCubic(clamp(u * 3))), bot = c.Y(c.ay, 0);
      const a0 = Math.round(hw * 0.3), a1 = Math.round(hw * 0.7), a2 = Math.round(hw * 0.92);   /* r3: tô theo hàng (fill) */
      for (let y = Math.round(top); y <= bot; y++) { hline(B, X - hw, X + hw, y, P[4]); if (a2 > 0) hline(B, X - a2, X + a2, y, P[2]); if (a1 > 0) hline(B, X - a1, X + a1, y, P[1]); hline(B, X - a0, X + a0, y, P[0]); } }
  },
  front(B, c, t) { this.ring(B, c, t, 1); },
  ring(B, c, t, half) { const P = c.o.heal ? WPAL.heal : WPAL.gold, X = c.X(c.ax), Y = c.Y(c.ay + 0.5);
    let u = t / 0.32; if (u < 1) ringE(B, X, Y, (3 + 13 * outCubic(u)) * RES, 0.42, u < 0.5 ? P[1] : P[3], u < 0.55 ? 2 : 1, half);
    u = (t - 0.3) / 0.3; if (u > 0 && u < 1) ringE(B, X, Y, (3 + 9 * outCubic(u)) * RES, 0.42, P[2], 1, half); },
};

/* BỤI ĐẤT (cuốc, đáp, va chạm nhẹ): 3–4 cục bụi đặc co lại + 4 hòn đất nảy */
SC.dirt = { box: () => [36, 30, 22], end: () => 0.55,
  init(c) { puffs(c, 4, c.ax, c.ay, 0, 30, 0.4, 2.2, 1, { pal: c.o.sand ? WPAL.gold : WPAL.dirt, vz0: 6, vz1: 18 }); chips(c, 4, c.ax, c.ay, 1, 45, WPAL.dirt, { vz0: 50, vz1: 95, s0: 0.8, s1: 1.6, c0: 2, c1: 4, l0: 0.35, l1: 0.5 }); } };
/* GỖ VỤN (chặt cây / đánh quái gỗ): thanh gỗ xoay văng nảy + 1 cục bụi nhỏ */
SC.wood = { box: () => [40, 34, 26], end: () => 0.65,
  init(c) { const d = dirOf(c.o); chips(c, 8, c.ax, c.ay, 7, 75, WPAL.wood, { a: c.o.dir ? Math.atan2(-d.y, -d.x) : null, spread: 1.2, fy: 3, vz0: 60, vz1: 125, s0: 1.5, s1: 2.6, c0: 0, c1: 2, l0: 0.5, l1: 0.7 }); puffs(c, 2, c.ax, c.ay + 2, 2, 18, 0.3, 1.6, 1, { pal: WPAL.wood }); } };   /* r2: mảnh to hơn, bắn về phía người chặt + nằm TRƯỚC gốc cây (r1 bị thân cây che) */
/* ĐÁ VỤN (đập đá / đánh quái giáp): khối đá có mặt sáng xoay nảy + chớp tia lửa trắng + bụi xám */
SC.rock = { box: () => [40, 34, 26], end: () => 0.65,
  init(c) { const d = dirOf(c.o); chips(c, 8, c.ax, c.ay, 6, 75, WPAL.rock, { a: c.o.dir ? Math.atan2(-d.y, -d.x) : null, spread: 1.2, fy: 3, vz0: 60, vz1: 130, s0: 1.5, s1: 2.8, c0: 0, c1: 2, l0: 0.5, l1: 0.68 });   /* r2: như gỗ */ sparks(c, 4, c.ax, c.ay, 7, { x: 0, y: -1 }, 110, WPAL.steel, { spread: Math.PI, l0: 0.1, l1: 0.18 }); puffs(c, 3, c.ax, c.ay + 2, 1, 24, 0.36, 2, 1, { pal: WPAL.rock }); },
  front(B, c, t) { if (t < 0.05) star4(B, c.X(c.ax), c.Y(c.ay, 7), 4, WPAL.steel[0], WPAL.steel[2], 1); } };
/* BỤI BƯỚC CHÂN: 2 cục bụi rất nhỏ, sát đất, tắt gọn */
SC.step = { box: () => [20, 12, 8], end: () => 0.32,
  init(c) { puffs(c, 2, c.ax, c.ay, 0, 12, 0.24, 1.2, 1, { pal: c.o.snow ? WPAL.ice : WPAL.dirt, vz0: 2, vz1: 6, grow: 0.3 }); } };
/* KI LỘN — ĐÁP: bụi toả 2 bên sát đất + sỏi nhỏ */
SC.kidust = { box: () => [44, 22, 14], end: () => 0.5,
  init(c) { puffs(c, 3, c.ax - 2, c.ay, 0, 36, 0.32, 1.8, 1, { pal: WPAL.dirt, a: Math.PI, spread: 0.5, vz0: 2, vz1: 8 }); puffs(c, 3, c.ax + 2, c.ay, 0, 36, 0.32, 1.8, 1, { pal: WPAL.dirt, a: 0, spread: 0.5, vz0: 2, vz1: 8 }); chips(c, 3, c.ax, c.ay, 1, 40, WPAL.dirt, { vz0: 40, vz1: 70, s0: 0.8, s1: 1.3, c0: 2, c1: 4, l0: 0.3, l1: 0.42 }); } };
/* KI LƯỚT — BẬT ĐI: vạch gió ngang sau lưng (theo hướng lướt) + bụi đạp chân bắn ngược */
SC.kiwind = { box: () => [64, 30, 24], end: () => 0.34,
  init(c) { const s = c.o.flip ? 1 : -1, R = c.R; c.lines = Array.from({ length: 6 }, (_, i) => ({ z: 3 + i * 2.4 + R.range(-0.6, 0.6), x0: R.range(2, 7), L: R.range(9, 17), d: R.range(0, 0.05) })); c.s = s;
    puffs(c, 3, c.ax + s * 3, c.ay, 0, 40, 0.3, 1.8, 1, { pal: WPAL.dirt, a: s > 0 ? 0 : Math.PI, spread: 0.45, vz0: 3, vz1: 10 }); },
  front(B, c, t) { const P = WPAL.ice, s = c.s;
    for (const l of c.lines) { const u = (t - l.d) / 0.26; if (u < 0 || u >= 1) continue; const x0 = c.ax + s * (l.x0 + 14 * outCubic(u)), L = l.L * (1 - u), y = c.Y(c.ay, l.z);
      for (let d = 0; d <= L * RES; d++) B.set(Math.round(c.X(x0 + s * d / RES)), Math.round(y), d < 2 ? P[0] : d < L * RES * 0.6 ? P[1] : P[3]); } } };
/* LÁ RƠI (cây bị chặt / rung): lá rơi lắc lư từ tán, chạm đất nằm 1 lúc rồi tắt; dur = thời gian rắc lá */
SC.leaves = { kyOff: 10, box: () => [48, 52, 44],   /* lớp trước xếp sau gốc cây (y + 10): lá rơi nằm TRƯỚC tán / thân */ end: o => (o.dur || 1.2) + 1.3,
  init(c) { c.next = 0; c.dur = c.o.dur || 1.2; },
  update(c, t, dt) { if (t > c.dur) return; c.next -= dt; if (c.next > 0) return; c.next = 0.11 + c.R.range(0, 0.1); const R = c.R;
    part(c, PK.LEAF, c.ax + R.range(-11, 11), c.ay + R.range(1, 6), R.range(18, 30), R.range(-6, 6), 0, R.range(-4, 2), R.range(1.6, 2.2), 0, 2, { g: 0.075, drag: 1.6, va: R.range(-5, 5), sway: 14, sw: R.range(3, 5), pal: WPAL.leaf }); } };
/* LẤP LÁNH THU HOẠCH: hạt xanh / vàng bay lên, nhỏ */
SC.crop = { box: () => [24, 30, 24], end: () => 0.6,
  init(c) { const R = c.R; for (let i = 0; i < 5; i++) part(c, PK.MOTE, c.ax + R.range(-5, 5), c.ay + R.range(-1, 1), R.range(1, 5), R.range(-5, 5), 0, R.range(26, 44), R.range(0.35, 0.55), 0, i === 0 ? 2 : 1, { drag: 1.5, tail: 1, pal: i % 2 ? WPAL.leaf : WPAL.gold }); } };

/* ===== đợt 2b: người chơi bị đánh / hất (knock.js), giải hoá đá, né hoàn hảo (Ki) ===== */
/* TRÚNG NHẸ (bị đẩy lùi): chớp nhỏ trắng-đỏ 1 khung + 3 vạch ngắn toả + 2 tia lửa, ≤ 16 px */
SC.jab = { box: () => [36, 34, 26], end: () => 0.3,
  init(c) { const R = c.R; c.rot = R.range(0, 1); sparks(c, 3, c.ax, c.ay, 7, { x: c.o.flip ? -1 : 1, y: 0 }, 110, WPAL.gold, { spread: 1.4, l0: 0.1, l1: 0.18 }); },
  front(B, c, t) { const X = c.X(c.ax), Y = c.Y(c.ay, 7), P = WPAL.steel, Q = PAL.nham;
    if (t < 0.045) burst(B, X, Y, 5, 4, P[0], Q[1], Q[3], c.rot);
    else if (t < 0.12) { const u = (t - 0.045) / 0.075; for (let i = 0; i < 4; i++) { const a = c.rot * 6.28 + i * TAU / 4 + 0.4, r0 = (3 + 6 * u) * RES * 0.5, L = 3 * (1 - u) * RES * 0.5; if (L >= 1) seg(B, X + Math.cos(a) * r0, Y + Math.sin(a) * r0, X + Math.cos(a) * (r0 + L), Y + Math.sin(a) * (r0 + L), P[1]); } } } };
/* TRÚNG MẠNH (bị hất bay): sao nổ trắng → cam 2 khung + vạch tốc độ + tia lửa + bụi chân; rung ngắn, hitstop rất ngắn */
SC.heavy = { box: () => [56, 50, 38], end: () => 0.45,
  init(c) { const R = c.R; c.rot = R.range(0, 1); c.rays = Array.from({ length: 8 }, (_, i) => ({ a: i / 8 * TAU + R.range(-0.2, 0.2), L: R.range(3, 6) }));
    c.hooks && c.hooks.stop && c.hooks.stop(0.05); c.hooks && c.hooks.shake && c.hooks.shake(0.22);
    sparks(c, 9, c.ax, c.ay, 9, { x: c.o.flip ? -1 : 1, y: 0 }, 160, WPAL.gold, { spread: 1.6, size: 1.6, g: 0.6 }); puffs(c, 3, c.ax, c.ay - 0.6, 0, 26, 0.32, 1.8, 1, { pal: WPAL.dirt, vz0: 2, vz1: 6 }); },
  front(B, c, t) { const X = c.X(c.ax), Y = c.Y(c.ay, 9), P = WPAL.steel, Q = PAL.nham;
    if (t < 0.045) burst(B, X, Y, 9, 6, P[0], P[0], Q[2], c.rot); else if (t < 0.09) burst(B, X, Y, 6, 6, P[0], Q[1], Q[3], c.rot + 0.3);
    if (t > 0.02 && t < 0.18) { const u = (t - 0.02) / 0.16; for (const r of c.rays) { const r0 = (5 + 12 * outCubic(u)) * RES * 0.5, L = r.L * (1 - u) * RES * 0.5, ca = Math.cos(r.a), sa = Math.sin(r.a) * 0.85; if (L >= 1) seg(B, X + ca * r0, Y + sa * r0, X + ca * (r0 + L), Y + sa * (r0 + L), u < 0.45 ? P[0] : Q[1]); } } } };
/* NGÃ ĐÁP ĐẤT: vòng bụi nằm trên đất lan ra (nửa sau / nửa trước) + bụi toả 2 bên + sỏi nảy */
SC.land = { box: () => [56, 30, 18], end: () => 0.55,
  init(c) { puffs(c, 3, c.ax - 3, c.ay, 0, 34, 0.38, 2, 1, { pal: WPAL.dirt, a: Math.PI, spread: 0.5, vz0: 2, vz1: 7 }); puffs(c, 3, c.ax + 3, c.ay, 0, 34, 0.38, 2, 1, { pal: WPAL.dirt, a: 0, spread: 0.5, vz0: 2, vz1: 7 }); chips(c, 4, c.ax, c.ay, 1, 50, WPAL.dirt, { vz0: 40, vz1: 80, s0: 0.8, s1: 1.4, c0: 1, c1: 3, l0: 0.3, l1: 0.45 }); },
  back(B, c, t) { const u = t / 0.26; if (u < 1) ringE(B, c.X(c.ax), c.Y(c.ay + 0.5), (4 + 13 * outCubic(u)) * RES, 0.4, u < 0.5 ? WPAL.dirt[0] : WPAL.dirt[1], u < 0.5 ? 2 : 1, -1); },
  front(B, c, t) { const u = t / 0.26; if (u < 1) ringE(B, c.X(c.ax), c.Y(c.ay + 0.5), (4 + 13 * outCubic(u)) * RES, 0.4, u < 0.5 ? WPAL.dirt[0] : WPAL.dirt[1], u < 0.5 ? 2 : 1, 1); } };
/* ĐẬP TƯỜNG / VẬT: sao dẹt + mảnh đá bắn ngược + bụi xám */
SC.wall = { box: () => [44, 40, 30], end: () => 0.55,
  init(c) { const d = c.o.flip ? 1 : -1; c.hooks && c.hooks.shake && c.hooks.shake(0.16); chips(c, 6, c.ax, c.ay, 8, 70, WPAL.rock, { a: d > 0 ? 0 : Math.PI, spread: 1, vz0: 40, vz1: 110, s0: 1.2, s1: 2.2, c0: 0, c1: 2, l0: 0.4, l1: 0.55 }); puffs(c, 3, c.ax, c.ay, 6, 22, 0.36, 2, 1, { pal: WPAL.rock, vz0: 4, vz1: 12 }); },
  front(B, c, t) { if (t < 0.05) burst(B, c.X(c.ax), c.Y(c.ay, 8), 7, 4, WPAL.steel[0], WPAL.steel[1], WPAL.rock[3], 0); else if (t < 0.1) star4(B, c.X(c.ax), c.Y(c.ay, 8), 4, WPAL.steel[0], WPAL.rock[2], 1); } };
/* BỊ HẤT TUNG: đất nứt hình sao dưới chân + đá bắn lên + vòng bụi */
SC.erupt = { box: () => [64, 56, 40], end: () => 0.8,
  init(c) { const R = c.R; c.hooks && c.hooks.shake && c.hooks.shake(0.25);
    c.cracks = Array.from({ length: 6 }, (_, i) => { const pts = [[0, 0]]; let x = 0, y = 0, a = i / 6 * TAU + R.range(-0.3, 0.3); for (let s = 0; s < 4; s++) { a += R.range(-0.5, 0.5); x += Math.cos(a) * 2.4; y += Math.sin(a) * 1.2; pts.push([x, y]); } return pts; });
    chips(c, 8, c.ax, c.ay - 0.5, 1, 60, WPAL.rock, { vz0: 110, vz1: 180, s0: 2, s1: 3, c0: 0, c1: 1, l0: 0.55, l1: 0.75 }); puffs(c, 4, c.ax, c.ay - 0.5, 0, 70, 0.3, 1.6, 1, { pal: WPAL.dirt, vz0: 3, vz1: 8, drag: 6 }); },
  back(B, c, t) { const X = c.X(c.ax), Y = c.Y(c.ay + 0.5); if (t < 0.75) { const grow = clamp(t / 0.06), shrink = t > 0.45 ? 1 - (t - 0.45) / 0.3 : 1; for (const pts of c.cracks) { const n = Math.max(0, Math.floor((pts.length - 1) * grow * shrink)); for (let i = 0; i < n; i++) seg(B, X + pts[i][0] * RES, Y + pts[i][1] * RES, X + pts[i + 1][0] * RES, Y + pts[i + 1][1] * RES, WPAL.dirt[5]); } }
    const u = t / 0.25; if (u < 1) ringE(B, X, Y, (5 + 16 * outCubic(u)) * RES, 0.42, WPAL.dirt[u < 0.5 ? 0 : 1], u < 0.5 ? 2 : 1, -1); },
  front(B, c, t) { const u = t / 0.25; if (u < 1) ringE(B, c.X(c.ax), c.Y(c.ay + 0.5), (5 + 16 * outCubic(u)) * RES, 0.42, WPAL.dirt[u < 0.5 ? 0 : 1], u < 0.5 ? 2 : 1, 1); } };
/* GIẢI HOÁ ĐÁ (NPC / Rocky / người chơi thoát vỏ đá): lõi sáng 1 khung → vỏ đá vỡ thành mảnh văng nảy + bụi xám + hạt vàng bay lên lấp lánh */
SC.stonefree = { box: () => [64, 64, 50], end: () => 1.0,
  init(c) { const R = c.R; c.hooks && c.hooks.shake && c.hooks.shake(0.2);
    for (let i = 0; i < 12; i++) { const a = i / 12 * TAU + R.range(-0.2, 0.2), z = R.range(3, 20), sp = R.range(50, 90); part(c, PK.CHIP, c.ax + Math.cos(a) * 4, c.ay + Math.sin(a) * 2, z, Math.cos(a) * sp, Math.sin(a) * sp * 0.55, R.range(40, 100), R.range(0.55, 0.8), R.int(0, 1), R.range(2.2, 3.4), { g: 1, drag: 0.5, bounce: 0.3, va: R.range(-14, 14), pal: WPAL.rock }); }
    puffs(c, 5, c.ax, c.ay - 0.6, 0, 40, 0.42, 2, 1, { pal: WPAL.rock, vz0: 2, vz1: 6, grow: 0.6 });   /* r2: bụi sát đất, sau người (r1 che thân) */
    for (let i = 0; i < 9; i++) { const a = R.range(0, TAU), r = R.range(2, 8); part(c, PK.MOTE, c.ax + Math.cos(a) * r, c.ay + Math.sin(a) * r * 0.45, R.range(2, 14), 0, 0, R.range(28, 48), R.range(0.5, 0.8), R.int(0, 1), i % 3 ? 1 : 2, { drag: 0.9, tail: 2, pal: WPAL.gold, sway: 5 }); } },
  front(B, c, t) { const X = c.X(c.ax), Y = c.Y(c.ay, 10); if (t < 0.05) burst(B, X, Y, 14, 8, WPAL.steel[0], WPAL.gold[1], WPAL.gold[3], 0.2); else if (t < 0.16) { const u = (t - 0.05) / 0.11; ringE(B, X, Y, (8 + 10 * outCubic(u)) * RES * 0.5, 0.9, u < 0.5 ? WPAL.gold[0] : WPAL.gold[2], 1, 0); } } };
/* NÉ HOÀN HẢO (Ki): vòng mảnh xanh-trắng nằm trên đất lan nhanh quanh người + 6 hạt sáng bay lên — thay vầng gradient mờ toàn thân */
SC.perfect = { box: () => [64, 52, 40], end: () => 0.7,
  init(c) { const R = c.R; for (let i = 0; i < 7; i++) { const a = i / 7 * TAU + R.range(-0.2, 0.2); part(c, PK.MOTE, c.ax + Math.cos(a) * 7, c.ay + Math.sin(a) * 3, R.range(2, 12), Math.cos(a) * 14, Math.sin(a) * 6, R.range(24, 40), R.range(0.4, 0.6), 0, i % 2 ? 2 : 1, { drag: 1.5, tail: 2, pal: PAL.ma }); } },
  back(B, c, t) { this.r(B, c, t, -1); }, front(B, c, t) { this.r(B, c, t, 1); },
  r(B, c, t, half) { const X = c.X(c.ax), Y = c.Y(c.ay + 0.5), P = PAL.ma; let u = t / 0.3; if (u < 1) ringE(B, X, Y, (6 + 16 * outCubic(u)) * RES, 0.42, u < 0.5 ? P[0] : P[2], u < 0.5 ? 2 : 1, half); u = (t - 0.12) / 0.3; if (u > 0 && u < 1) ringE(B, X, Y, (5 + 11 * outCubic(u)) * RES, 0.42, P[1], 1, half); } };

/* ===== p69 đợt 4: HỢP THỂ + LINH THÚ MẪU (Cóc) ===== */
const WATER = PAL.trieu, PINK = PAL.tinh, SHADOW = PAL.anh;   /* nước: đo từ ô nước game (pxfx.js); tím Hắc-ha */
const CLOUD = P8(['#eef2f8', '#cdd6e4', '#aab6ca', '#8894ab', '#68748e', '#4c5770', '#353e54', '#20273a']);
/* HỢP THỂ / TÁCH: lõi sáng vàng-tím 1 khung → vòng vàng nằm đất lan ra + vòng tím co vào thân + đá giáp Rocky văng + hạt vàng / tím bay lên */
SC.fuse = { box: () => [80, 76, 58], end: () => 0.8,
  init(c) { const R = c.R; c.hooks && c.hooks.shake && c.hooks.shake(0.2);
    for (let i = 0; i < 10; i++) { const a = i / 10 * TAU + R.range(-0.2, 0.2), sp = R.range(50, 85); part(c, PK.CHIP, c.ax + Math.cos(a) * 5, c.ay + Math.sin(a) * 2, R.range(6, 18), Math.cos(a) * sp, Math.sin(a) * sp * 0.55, R.range(40, 90), R.range(0.5, 0.7), R.int(0, 2), R.range(1.6, 2.6), { g: 1, drag: 0.6, bounce: 0.3, va: R.range(-14, 14), pal: PAL.chan }); }
    for (let i = 0; i < 12; i++) { const a = R.range(0, TAU), r = R.range(3, 9); part(c, PK.MOTE, c.ax + Math.cos(a) * r, c.ay + Math.sin(a) * r * 0.45, R.range(2, 20), 0, 0, R.range(30, 50), R.range(0.45, 0.7), 0, i % 3 ? 1 : 2, { drag: 1, tail: 2, pal: i % 2 ? WPAL.gold : SHADOW, sway: 5 }); } },
  back(B, c, t) { this.ring(B, c, t, -1); },
  front(B, c, t) { this.ring(B, c, t, 1); const X = c.X(c.ax), Y = c.Y(c.ay, 14);
    if (t < 0.05) burst(B, X, Y, 16, 8, WPAL.steel[0], WPAL.gold[1], SHADOW[2], 0.1);
    else if (t < 0.22) { const u = (t - 0.05) / 0.17; ringE(B, X, Y, (16 - 12 * outCubic(u)) * RES * 0.5 + 2, 1.1, u < 0.5 ? SHADOW[1] : SHADOW[3], 2, 0); } },
  ring(B, c, t, half) { const u = t / 0.3; if (u < 1) ringE(B, c.X(c.ax), c.Y(c.ay + 0.5), (5 + 20 * outCubic(u)) * RES, 0.42, u < 0.5 ? WPAL.gold[0] : WPAL.gold[2], u < 0.5 ? 2 : 1, half); } };
/* HẮC-HA CONG trúng: sao tím-trắng 1 khung + mảnh bóng tím văng + tia lửa tím + vòng tím; hitstop ngắn */
SC.hachahit = { box: () => [60, 56, 44], end: () => 0.55,
  init(c) { const R = c.R; c.hooks && c.hooks.stop && c.hooks.stop(0.05); c.hooks && c.hooks.shake && c.hooks.shake(0.16); c.z = c.o.z ?? 8;
    sparks(c, 10, c.ax, c.ay, c.z, { x: 1, y: 0 }, 150, SHADOW, { spread: Math.PI, size: 1.6, g: 0.5 });
    for (let i = 0; i < 7; i++) { const a = i / 7 * TAU + R.range(-0.3, 0.3), sp = R.range(50, 90); part(c, PK.CHIP, c.ax, c.ay, c.z, Math.cos(a) * sp, Math.sin(a) * sp * 0.6, R.range(30, 90), R.range(0.4, 0.6), R.int(1, 3), R.range(1.4, 2.4), { g: 1, drag: 0.6, bounce: 0.25, va: R.range(-16, 16), pal: SHADOW }); } },
  front(B, c, t) { const X = c.X(c.ax), Y = c.Y(c.ay, c.z);
    if (t < 0.045) burst(B, X, Y, 12, 6, WPAL.steel[0], SHADOW[0], SHADOW[2], 0.2); else if (t < 0.09) burst(B, X, Y, 8, 6, SHADOW[0], SHADOW[1], SHADOW[3], 0.6);
    else if (t < 0.22) { const u = (t - 0.09) / 0.13; ringE(B, X, Y, (6 + 9 * outCubic(u)) * RES * 0.5, 1, u < 0.5 ? SHADOW[1] : SHADOW[3], 1, 0); } } };
/* HẮC-HA CONG phóng: 6 hạt tím bị hút vào ngực rồi chớp bung (0,25 s) */
SC.hachacast = { box: () => [44, 44, 34], end: () => 0.3,
  init(c) { c.z = c.o.z ?? 12; for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; part(c, PK.MOTE, c.ax + Math.cos(a) * 9, c.ay + Math.sin(a) * 4, c.z + Math.sin(a) * 6, -Math.cos(a) * 60, -Math.sin(a) * 25, -Math.sin(a) * 30, 0.16, 0, 1, { drag: 2, tail: 2, pal: SHADOW }); } },
  front(B, c, t) { const X = c.X(c.ax), Y = c.Y(c.ay, c.z); if (t > 0.1 && t < 0.15) burst(B, X, Y, 7, 4, WPAL.steel[0], SHADOW[1], SHADOW[3], 0.4); else if (t >= 0.15 && t < 0.24) star4(B, X, Y, 4, SHADOW[0], SHADOW[2], 1); } };

/* CÓC — LƯỠI DÍNH trúng: bắn nhầy hồng-trắng 1 khung + giọt nhầy văng rơi + vòng nhầy nhỏ (≤ 16 px) */
SC.tonguehit = { box: () => [40, 36, 28], end: () => 0.45,
  init(c) { const R = c.R; c.z = c.o.z ?? 6; for (let i = 0; i < 7; i++) { const a = R.range(0, TAU), sp = R.range(35, 70); part(c, PK.CHIP, c.ax, c.ay, c.z, Math.cos(a) * sp, Math.sin(a) * sp * 0.5, R.range(30, 80), R.range(0.3, 0.45), R.int(0, 2), R.range(1, 1.8), { g: 1, drag: 0.8, bounce: 0.1, pal: PINK }); } },
  front(B, c, t) { const X = c.X(c.ax), Y = c.Y(c.ay, c.z); if (t < 0.05) burst(B, X, Y, 7, 5, PINK[0], PINK[1], PINK[3], 0.3); else if (t < 0.16) { const u = (t - 0.05) / 0.11; ringE(B, X, Y, (4 + 6 * outCubic(u)) * RES * 0.5, 0.9, u < 0.5 ? PINK[1] : PINK[3], 1, 0); } } };
/* CÓC — THUỶ PHÁO ĐỊA CHẤN: tia nước vẽ code từ miệng (thon ở gốc → to dần), mép gợn, vệt sáng chạy dọc, đầu tia bọt trắng, giọt bắn 2 bên;
   chớp ở gốc khung đầu; thu nhỏ rồi tắt cuối. Toạ độ màn (y đã gồm độ cao miệng, z = 0). Lớp: o.ky = y Cóc ∓ 0,5 (luật lớp vẽ chiêu). */
SC.cocjet = {
  box: o => { const L = o.L || 60; return [Math.ceil(Math.abs(o.ux || 1) * L + 56), Math.ceil(Math.abs(o.uy || 0) * L + 56), Math.ceil(Math.abs(o.uy || 0) * L / 2 + 28)]; },
  end: o => o.dur || 0.8,
  init(c) { c.dropT = 0; },
  update(c, t, dt) { const o = c.o, R = c.R; c.dropT -= dt; if (t < (o.dur || 0.8) - 0.15 && c.dropT <= 0) { c.dropT = 0.03; const s = R.range(6, Math.max(7, o.L)), px = -o.uy, py = o.ux, side = R.sign(), x = o.x0 + o.ux * s, y = o.y0 + o.uy * s;
      part(c, PK.MOTE, x + px * side * 3, y + py * side * 3, 0, px * side * R.range(20, 45) + o.ux * 30, py * side * R.range(20, 45) + o.uy * 30, R.range(-10, 20), R.range(0.18, 0.3), R.int(0, 1), R.chance(0.3) ? 2 : 1, { drag: 2.5, tail: 1, pal: WATER }); } },
  front(B, c, t) {
    const o = c.o, P = WATER, D = o.dur || 0.8, W = (o.w || 11) * 0.5;
    const k = t < 0.08 ? t / 0.08 : t > D - 0.2 ? Math.max(0, (D - t) / 0.2) : 1; if (k <= 0) return;
    const px = -o.uy, py = o.ux, L = o.L * (t < 0.1 ? outCubic(t / 0.1) : 1);
    for (let s = 0; s <= L; s += 0.5) {
      const taper = Math.min(1, 0.35 + s / 16), hw = Math.max(0.6, W * k * taper + Math.sin(s * 0.45 - t * 38) * 0.6), cxs = o.x0 + o.ux * s, cys = o.y0 + o.uy * s;
      const run = ((s - t * 190) % 12 + 12) % 12 < 2.5;   /* vệt sáng chạy dọc tia */
      for (let d = -hw; d <= hw; d += 0.5) { const e = Math.abs(d) / hw, col = e > 0.85 ? P[5] : e > 0.6 ? P[3] : e > 0.28 ? (run ? P[1] : P[2]) : (run ? P[0] : P[1]);
        B.set(Math.round(c.X(cxs + px * d)), Math.round(c.Y(cys + py * d)), col); }
    }
    const hx = c.X(o.x0 + o.ux * L), hy = c.Y(o.y0 + o.uy * L);   /* đầu tia: bọt trắng */
    disc(B, hx, hy, (W + 1.5) * k * RES * 0.9, (W + 1.5) * k * RES * 0.75, P[1], P[0], P[3]);
    if (t < 0.06) burst(B, c.X(o.x0), c.Y(o.y0), 6, 6, P[0], P[1], P[3], 0.2);   /* chớp ở miệng */
  } };
/* CÓC — đầu Thuỷ Pháo chạm đất: cột nước thấp + giọt bắn + 2 vòng sóng bùn nước nằm trên đất (r 29 → 40), nửa sau / nửa trước */
SC.cocsplash = { box: () => [100, 70, 44], end: () => 0.9,
  init(c) { const R = c.R; c.hooks && c.hooks.shake && c.hooks.shake(0.25);
    for (let i = 0; i < 16; i++) { const a = R.range(0, TAU), sp = R.range(20, 60); part(c, PK.MOTE, c.ax + Math.cos(a) * 3, c.ay + Math.sin(a) * 1.5, R.range(0, 6), Math.cos(a) * sp, Math.sin(a) * sp * 0.5, R.range(80, 150), R.range(0.45, 0.65), R.int(0, 1), R.chance(0.4) ? 2 : 1, { g: 0.9, drag: 0.8, tail: 2, pal: WATER }); }
    puffs(c, 4, c.ax, c.ay - 0.6, 0, 40, 0.35, 1.8, 1, { pal: WPAL.dirt, vz0: 2, vz1: 6 }); },
  back(B, c, t) { this.r(B, c, t, -1); },
  front(B, c, t) { this.r(B, c, t, 1);
    if (t < 0.3) { const u = t / 0.3, h = 16 * Math.sin(Math.PI * Math.min(1, u * 1.4)), X = c.X(c.ax);   /* cột nước thấp */
      for (let z = 0; z < h; z += 0.5) { const w = (3.5 - z * 0.12) * RES * 0.5 * (1 - u * 0.5); hline(B, X - w, X + w, c.Y(c.ay, z), z > h - 2 ? WATER[0] : WATER[2]); hline(B, X - w * 0.4, X + w * 0.4, c.Y(c.ay, z), WATER[1]); } } },
  r(B, c, t, half) { const X = c.X(c.ax), Y = c.Y(c.ay + 0.5), M = WPAL.dirt; let u = t / 0.3; if (u < 1) { ringE(B, X, Y, (6 + 23 * outCubic(u)) * RES, 0.42, u < 0.5 ? WATER[1] : WATER[3], 2, half); ringE(B, X, Y, (5 + 23 * outCubic(u)) * RES, 0.42, M[3], 1, half); }
    u = (t - 0.2) / 0.35; if (u > 0 && u < 1) ringE(B, X, Y, (8 + 32 * outCubic(u)) * RES, 0.42, u < 0.5 ? WATER[2] : WATER[4], 1, half); } };
/* CÓC — GỌI MƯA: mây xám-xanh (cụm khói pixel, cuộn chậm) + hạt mưa xiên rơi trong vùng r + gợn nhỏ chỗ hạt chạm đất; mọc 0,4 s, tan 0,6 s cuối. Êm: không chớp, không sét. */
SC.raincloud = { box: o => { const r = o.r || 64; return [r * 2 + 30, Math.round(r + 76), 66]; }, end: o => (o.dur || 6),
  init(c) { const R = c.R, r = c.o.r || 64; c.r = r; c.blobs = Array.from({ length: 18 }, (_, i) => { const u = (i + 0.5) / 18 * 2 - 1; return { x: u * r * 0.62 + R.range(-4, 4), y: R.range(-r * 0.1, r * 0.1), z: 46 + (1 - u * u) * 6 + R.range(-2, 2), s: (1 - u * u * 0.5) * R.range(8, 12), ph: R.range(0, TAU), col: R.int(1, 3) }; })   /* r2: mây liền khối (r1 rời rạc như sỏi xám) */.sort((a, b) => a.y - b.y); c.drops = []; c.rings = []; c.acc = 0; },
  update(c, t, dt) { const R = c.R, D = c.o.dur || 6, r = c.r, k = Math.min(1, t / 0.4, (D - t) / 0.6);
    c.acc += dt * 70 * Math.max(0, k); while (c.acc >= 1 && c.drops.length < 70) { c.acc -= 1; const a = R.range(0, TAU), q = Math.sqrt(R.next()) * r * 0.9; c.drops.push({ x: c.ax + Math.cos(a) * q, y: c.ay + Math.sin(a) * q * 0.5, z: R.range(36, 46), v: R.range(170, 220) }); }
    for (let i = c.drops.length - 1; i >= 0; i--) { const d = c.drops[i]; d.z -= d.v * dt; d.x -= 18 * dt; if (d.z <= 0) { if (c.rings.length < 30) c.rings.push({ x: d.x, y: d.y, t: 0 }); c.drops[i] = c.drops[c.drops.length - 1]; c.drops.pop(); } }
    for (let i = c.rings.length - 1; i >= 0; i--) { const g = c.rings[i]; g.t += dt; if (g.t > 0.22) { c.rings[i] = c.rings[c.rings.length - 1]; c.rings.pop(); } } },
  back(B, c, t) { for (const g of c.rings) { const u = g.t / 0.22, X = c.X(g.x), Y = c.Y(g.y); if (u < 0.3) { B.set(X, Y, WATER[0]); B.set(X, Y - 1, WATER[1]); } else ringE(B, X, Y, 1 + u * 4, 0.45, u < 0.65 ? WATER[1] : WATER[3], 1, 0); } },
  front(B, c, t) { const D = c.o.dur || 6, k = Math.min(1, t / 0.4, (D - t) / 0.6); if (k <= 0) return;
    for (const d of c.drops) { const X = c.X(d.x), Y = c.Y(d.y, d.z); B.set(X, Y, WATER[0]); B.set(X + 1, Y - 2, WATER[1]); B.set(X + 1, Y - 3, WATER[2]); B.set(X + 2, Y - 5, WATER[3]); }
    for (const b of c.blobs) { const s = b.s * k * (1 + 0.06 * Math.sin(t * 1.3 + b.ph)), X = c.X(c.ax + b.x + Math.sin(t * 0.7 + b.ph) * 1.5), Y = c.Y(c.ay + b.y, b.z);   /* mây cuộn chậm */
      disc(B, X, Y, s * RES, s * RES * 0.62, CLOUD[b.col], CLOUD[b.col - 1], CLOUD[Math.min(7, b.col + 2)]); } } };

/* KHÓI LỬA TRẠI (môi trường, êm): 1 cụm khói nhỏ bốc lên, nở chậm rồi co về 0, trôi nhẹ theo gió; thỉnh thoảng 1 tàn lửa bay lên lượn. Không chớp, không nháy. */
SC.smoke = { kyOff: 3, box: () => [36, 60, 56], end: () => 2.3,
  init(c) { const R = c.R;
    part(c, PK.PUFF, c.ax + R.range(-1, 1), c.ay, 9, R.range(2, 5), 0, R.range(7, 10), R.range(1.8, 2.2), R.int(2, 3), R.range(2.4, 3.4), { drag: 0.2, pal: WPAL.smoke, grow: 0.8, sq: 0.8, sway: 4, sw: 1 });   /* r2: cụm to hơn, xám hơn, chồng lên nhau thành dải (r1 như chuỗi hạt trắng) */
    if (R.chance(0.35)) part(c, PK.MOTE, c.ax + R.range(-2, 2), c.ay, 7, R.range(-3, 3), 0, R.range(16, 24), R.range(0.7, 1.0), 1, 1, { drag: 0.6, pal: WPAL.nham, sway: 6, sw: 4 });
  } };

/* ---------- hiệu ứng + quản lý ---------- */
function create(kind, x, y, o = {}) {
  const S = SC[kind]; if (!S) return null;
  const [BW, BH, UP] = S.box(o), c = { o, kind, R: new Rng((o.seed ?? ((x * 31 + y * 17) | 0)) || 1), P: WPAL.steel, ax: x, ay: y, x0: Math.round(x - BW / 2), y0: Math.round(y - UP), ps: [], t: 0, hooks: WFX.hooks };
  c.X = xx => (xx - c.x0) * RES; c.Y = (yy, z = 0) => (yy - z - c.y0) * RES;
  S.init && S.init(c);
  const W = BW * RES, H = BH * RES, END = S.end(o);
  let back = null, front = null, stale = true, drawn = false; const idx = WFX.seq++;
  const E = {
    kind, ky: o.ky != null ? o.ky : o.top ? 1e9 : y + (S.kyOff || 0), kb: o.ky != null ? o.ky + 3.5 : y,   /* o.ky: khoá lớp theo người ra chiêu (luật lớp vẽ chiêu) */ c, x, y, BW, BH,
    update(dt) { c.t += dt; S.update && S.update(c, c.t, dt); stepParts(c, dt); if (dt > 1e-4) stale = true; },   /* hitstop (dt rất nhỏ): giữ hình, không vẽ lại */
    render() {   /* r3: cảnh đông → mỗi hiệu ứng vẽ lại cách 1 khung (> 6 hiệu ứng: 30 Hz) hoặc 2 khung (> 12: 20 Hz), so le để tải đều; hạt vẫn tính mỗi khung */
      const L = WFX.list.length, k = L > 8 ? 3 : L > 3 ? 2 : 1; if (!stale || (drawn && ((WFX.fno + idx) % k || WFX._d > WFX.budget))) return; drawn = true;   /* + ngân sách: khung này đã tốn > budget ms thì hiệu ứng đã có hình giữ hình cũ, vẽ lại ở khung sau */ stale = false; const T0 = performance.now();
      let anyB = !!S.back; if (!anyB) for (let i = 0; i < c.ps.length; i++) if (c.ps[i].y < c.ay) { anyB = true; break; }
      if (anyB) { if (!back) back = take(W, H); else back.clear(); if (S.back) S.back(B0(back), c, c.t); for (const p of c.ps) if (p.y < c.ay) drawPart(back, c, p); }
      if (!front) front = take(W, H); else front.clear(); if (S.front) S.front(front, c, c.t); for (const p of c.ps) if (p.y >= c.ay) drawPart(front, c, p);
      WFX.tm.r += performance.now() - T0;
    },
    prep() { this.render(); if (back && back.n) back.canvas(); if (front && front.n) front.canvas(); },
    draw(g, layer, cx, cy) { const T0 = performance.now(); this.drawI(g, layer, cx, cy); WFX._d += performance.now() - T0; },
    drawI(g, layer, cx, cy) { this.render(); const b = layer === 'back' ? back : front; if (!b || !b.n) return; const T1 = performance.now(), cvv = b.canvas(), T2 = performance.now(), x0 = b.x0 & ~1, y0 = b.y0 & ~1, w = ((b.x1 + 2) & ~1) - x0, h = ((b.y1 + 2) & ~1) - y0;   /* chỉ vẽ khung bao (canh chẵn → khớp lưới px logic) */
      g.drawImage(cvv, b.ox + x0, b.oy + y0, w, h, c.x0 - cx + x0 / RES, c.y0 - cy + y0 / RES, w / RES, h / RES); WFX.tm.c += T2 - T1; WFX.tm.g += performance.now() - T2; },
    done: () => c.t >= END && !c.ps.length,
    free() { give(back); give(front); back = front = null; for (const p of c.ps) if (PPOOL.length < 4000) PPOOL.push(p); c.ps.length = 0; },
    stats() { let n = 0; if (front) for (const v of front.data) if (v) n++; return { parts: c.ps.length, front: n }; },
  };
  E.dB = { y: E.kb - 4, f: () => E.draw(WFX.g, 'back', WFX.cx, WFX.cy) }; E.dF = { y: E.ky + 0.7, f: () => E.draw(WFX.g, 'front', WFX.cx, WFX.cy) };
  return E;
}
const B0 = b => b;
export const KINDS = () => Object.keys(SC);
export const WFX = {
  list: [], mi: 0, budget: 2, tm: { r: 0, c: 0, g: 0, p: 0, u: 0 }, g: null, cx: 0, cy: 0, seq: 0, fno: 0, hooks: null, cap: 40, perfOn: true, ms: [], maxLive: 0, _d: 0, _u: null,
  spawn(kind, x, y, o) { const e = create(kind, x, y, o || {}); if (!e) return null; this.list.push(e); if (this.list.length > this.cap) { const old = this.list.shift(); old.free(); } if (this.list.length > this.maxLive) this.maxLive = this.list.length; return e; },
  update(dt) { const t0 = performance.now(); this.fno++; for (const e of this.list) e.update(dt); for (let i = this.list.length - 1; i >= 0; i--) if (this.list[i].done()) { this.list[i].free(); this.list.splice(i, 1); } this._u = performance.now() - t0; this.tm.u = (this.tm.u || 0) + this._u; },
  drawables(out, g, cx, cy, VW = 480, VH = 270) {
    for (const e of this.list) {
      const sx = e.c.x0 - cx, sy = e.c.y0 - cy; if (sx > VW || sy > VH || sx + e.BW < 0 || sy + e.BH < 0) continue;
      { const t0 = performance.now(); e.prep(); const dt0 = performance.now() - t0; this._d += dt0; this.tm.p += dt0; if (dt0 > 1.5 && this.spk.length < 40) this.spk.push([e.kind, +dt0.toFixed(2), e.c.ps.length, +e.c.t.toFixed(2)]); }   /* r3: vẽ điểm + đẩy lên canvas TRƯỚC khi danh sách vẽ chạy (không xen giữa các lệnh vẽ) */
      this.g = g; this.cx = cx; this.cy = cy; out.push(e.dB, e.dF);   /* r3: mục vẽ dựng 1 lần / hiệu ứng (không tạo closure mỗi khung → bớt GC) */
    }
  },
  frame() { if (this._u == null) return; const tot = (this._u || 0) + (this._d || 0); this.ms[this.mi++ % 600] = tot; if (tot > 4 && this.spk.length < 40) this.spk.push([+this._u.toFixed(2), +(this.tm.p - this._p0).toFixed(2), +this._d.toFixed(2), this.list.length]); this._p0 = this.tm.p; this._d = 0; },
  spk: [], _p0: 0,
  p95() { const a = this.ms.slice().sort((x, y) => x - y); return a.length ? +a[Math.floor(a.length * 0.95)].toFixed(2) : 0; },
  clear() { for (const e of this.list) e.free(); this.list = []; },
  warm() {   /* dựng sẵn bộ đệm (pool + chỗ trong atlas) cho các cỡ hay dùng — tránh giật lần đầu đánh nhau (cấp phát mảng + canvas) */
    if (this._warm) return; this._warm = true;
    for (const [k, o, n] of [['hit', {}, 4], ['hit', { fin: 1 }, 2], ['kill', {}, 3], ['dirt', {}, 3], ['wood', {}, 2], ['rock', {}, 2], ['step', {}, 4], ['pickup', {}, 2], ['levelup', {}, 1], ['kidust', {}, 1], ['kiwind', {}, 1], ['leaves', {}, 2]]) {
      const [BW, BH] = SC[k].box(o), W = BW * RES, H = BH * RES, got = []; for (let i = 0; i < n * 2; i++) { const b = take(W, H); b.canvas(); got.push(b); } for (const b of got) give(b); }
    const hk = this.hooks; this.hooks = null;   /* chạy thử từng cảnh vài khung (dựng con dấu + JIT) — không rung / hitstop */
    for (const [k, o] of [['hit', { tier: 3 }], ['hit', { fin: 1, tier: 5 }], ['kill', { w: 14, h: 14 }], ['levelup', {}], ['pickup', {}], ['dirt', {}], ['rock', {}], ['wood', {}], ['step', {}]]) { const e = create(k, 0, 0, o); for (let f = 0; f < 10; f++) { e.update(0.033); e.render(); } e.free(); }
    this.hooks = hk;
  },
};
export default WFX;
