/* jump46.js — c46-thunhay (anh 05/11): "nếu Chấn Thú di chuyển gặp vật cản thì nó sẽ nhảy qua để đi tiếp".
   Thư viện chung (KHÔNG phải hệ đăng ký trong index.js, như dash107.js): squad104 (Chấn Thú đội ngoài map) + linhduel (trận tại chỗ) gọi vào.
   · ahead(): ngay phía trước theo hướng đi là ô cản (vật cứng / nước khi chủ không bơi) → tìm chỗ đáp đi được bên kia trong ≤ 4 ô.
   · Không nhảy: ra ngoài map, vật RẤT CAO (định nghĩa vật h ≥ 50 px: vách đá, đài…), dải cản dày > 4 ô, chỗ đáp chật.
   · Bay theo cung (f.alt — drawFighter vẽ cao lên, bỏ che nước), giữ 1 khung chạy; bóng dưới chân nhỏ + nhạt dần theo độ cao (shadowFor z).
   · Không lặp hiệu ứng: chỉ 1 nhúm bụi lúc bật + lúc đáp (code vẽ ở fx78 nếu có), tiếng 'whoosh' nhẹ. Thú bay (FLY) / thú bơi riêng không gọi vào đây.
   Móc test: window.__j46 (N, log, on, cfg). */
export const CFG = { maxD: 92, maxSpan: 66, step: 4, look: 13, tall: 50, cool: 0.45, vH: 300 };
export const N = { try: 0, jump: 0, land: 0, noLand: 0, tall: 0 };
const LOG = [];
function log(e) { LOG.push({ t: +(performance.now() / 1000).toFixed(2), ...e }); if (LOG.length > 80) LOG.shift(); }
export const API = { on: true, N, cfg: CFG, log: () => LOG.slice(), st: f => (f && f.j46 ? { t: +f.j46.t.toFixed(2), T: +f.j46.T.toFixed(2), alt: +(f.alt || 0).toFixed(1) } : null) };
if (typeof window !== 'undefined') window.__j46 = API;
API.planAt = (ctx, x, y, ux, uy) => plan(ctx, x, y, ux, uy, { blocked: (a, b) => solid(ctx, a, b) });   /* móc test */

const TG = { m: null, t: 0, g: null };
function tallGrid(ctx, m) {   /* ô có vật rất cao (vách đá, đài…) — dựng lại mỗi 5 s hoặc khi đổi map */
  const t = ctx.S.time || 0; if (TG.m === m && TG.g && t - TG.t < 5) return TG.g;
  const G = new Uint8Array(m.w * m.h), O = ctx.O || {};
  for (const o of m.objects || []) { const d = O[o.type]; if (!d || !(d.h >= CFG.tall)) continue; for (let j = 0; j < (d.fh || 1); j++) for (let i = 0; i < (d.fw || 1); i++) { const x = o.x + i, y = o.y + j; if (x >= 0 && y >= 0 && x < m.w && y < m.h) G[y * m.w + x] = 1; } }
  TG.m = m; TG.t = t; TG.g = G; return G;
}
export function isWater(ctx, x, y) { try { const m = ctx.S.map, T = ctx.T, g = ctx.getG(m, Math.floor(x / 16), Math.floor(y / 16)); return g === T.WATER || g === T.DEEP || g === T.REEF; } catch (e) { return false; } }
export function solid(ctx, x, y) { const m = ctx.S.map; return !!(ctx.isSolid && ctx.isSolid(m, Math.floor(x / 16), Math.floor(y / 16))); }
/* chủ đang bơi / đứng dưới nước → Chấn Thú bơi theo (c10-boi), không coi nước là vật cản */
export function ownerWet(ctx) { const p = ctx.S.player; return !!(p && (ctx.S.swimming || isWater(ctx, p.x, p.y - 4))); }
function inMap(ctx, x, y) { const m = ctx.S.map; return x > 18 && y > 18 && x < m.w * 16 - 18 && y < m.h * 16 - 18; }
/* chỗ đáp: đủ chỗ cho thân (giống nearWalk của linhduel) */
function landOK(ctx, x, y, wetOK) { const W = (a, b) => !solid(ctx, a, b) || (wetOK && isWater(ctx, a, b)); return inMap(ctx, x, y) && W(x, y) && W(x - 6, y) && W(x + 6, y) && W(x, y - 4) && W(x, y + 3) && !isWater(ctx, x, y); }

/* tìm chỗ đáp theo hướng (ux, uy) từ (x, y): phải gặp vật cản trước, dải cản ≤ maxSpan, chỗ đáp ≤ maxD. o.blocked(x, y) = điểm đó có cản không */
export function plan(ctx, x, y, ux, uy, o = {}) {
  const m = ctx.S.map, G = tallGrid(ctx, m), maxD = o.maxD || CFG.maxD; let b0 = -1;
  for (let s = CFG.step; s <= maxD; s += CFG.step) {
    const px = x + ux * s, py = y + uy * s; if (!inMap(ctx, px, py)) return { why: 'edge' };
    const tx = Math.floor(px / 16), ty = Math.floor(py / 16);
    if (o.blocked(px, py)) { if (G[ty * m.w + tx]) return { why: 'tall' }; if (b0 < 0) b0 = s; else if (s - b0 > CFG.maxSpan) return { why: 'span' }; continue; }
    if (b0 < 0) { if (s > (o.look || CFG.look) + 4) return { why: 'free' }; continue; }   /* chưa gặp cản ngay trước mặt → không nhảy */
    for (const e of [6, 10]) { const lx = px + ux * e, ly = py + uy * e; if (s + e <= maxD + 10 && landOK(ctx, lx, ly, false)) return { x: lx, y: ly, d: Math.hypot(lx - x, ly - y) }; }
  }
  return { why: b0 < 0 ? 'free' : 'noland' };
}
/* bắt đầu nhảy (f: chiến binh ldKit có x, y, alt, clip, ct) */
export function start(ctx, f, q, why) {
  const d = q.d || Math.hypot(q.x - f.x, q.y - f.y), T = Math.max(0.34, Math.min(0.62, 0.22 + d / CFG.vH));
  f.j46 = { x0: f.x, y0: f.y, x1: q.x, y1: q.y, t: 0, T, H: Math.round(9 + d * 0.16), ux: (q.x - f.x) / (d || 1), uy: (q.y - f.y) / (d || 1), alt0: f.alt || 0 };
  f.fx = f.j46.ux; f.fy = f.j46.uy; N.jump++; log({ ev: 'jump', why: why || '', d: Math.round(d), x0: Math.round(f.x), y0: Math.round(f.y), x1: Math.round(q.x), y1: Math.round(q.y) });
  dust(ctx, f, f.j46.ux, f.j46.uy);
  try { if (!(globalThis.__sfx108 && globalThis.__sfx108.at(ctx, 'dash_fast', f.x, f.y, { vol: 0.4 }))) ctx.sfx && ctx.sfx('whoosh'); } catch (e) { }
}
/* gọi đầu mỗi khung; trả true khi đang bay (hệ gọi bỏ qua AI / đi bộ khung đó) */
export function tick(ctx, f, dt, clips) {
  const J = f && f.j46; if (!J) { if (f && f.j46cd > 0) f.j46cd -= dt; return false; }
  J.t += dt; const k = Math.min(1, J.t / J.T);
  f.x = J.x0 + (J.x1 - J.x0) * k; f.y = J.y0 + (J.y1 - J.y0) * k; f.alt = J.alt0 + Math.sin(Math.PI * k) * J.H;
  const has = c => !clips || clips(c); f.clip = has('run') ? 'run' : 'idle'; f.ct = 0.21;   /* giữ 1 khung chân duỗi khi bay */
  if (k >= 1) { f.alt = J.alt0; f.j46 = null; f.j46cd = CFG.cool; N.land++; log({ ev: 'land', x: Math.round(f.x), y: Math.round(f.y) }); dust(ctx, f, J.ux, J.uy, true); }
  return true;
}
export const busy = f => !!(f && f.j46);
export function cancel(f) { if (f && f.j46) { f.x = f.j46.x1; f.y = f.j46.y1; f.alt = f.j46.alt0; f.j46 = null; } }
/* thử nhảy khi đi bộ từ f tới (gx, gy): o.blocked(x, y); trả true nếu đã bật nhảy */
export function ahead(ctx, f, gx, gy, o) {
  if (!API.on || f.j46 || f.j46cd > 0) return false; const dx = gx - f.x, dy = gy - f.y, d = Math.hypot(dx, dy); if (d < (o.minD || 18)) return false;
  const ux = dx / d, uy = dy / d; let hit = false; for (const s of [6, 10, o.look || CFG.look]) if (o.blocked(f.x + ux * s, f.y + uy * s)) { hit = true; break; } if (!hit) return false;
  N.try++; const q = plan(ctx, f.x, f.y, ux, uy, { blocked: o.blocked, look: o.look, maxD: Math.min(CFG.maxD, d + 22) });
  if (q.x == null) { if (q.why === 'noland' || q.why === 'span') N.noLand++; if (q.why === 'tall') N.tall++; f.j46cd = 0.3; log({ ev: 'no', why: q.why, x: Math.round(f.x), y: Math.round(f.y), ux: +ux.toFixed(2), uy: +uy.toFixed(2), d: Math.round(d) }); return false; }
  start(ctx, f, q, o.why); return true;
}
function dust(ctx, f, ux, uy, land) {   /* 1 nhúm bụi nhỏ lúc bật / đáp (không trên nước): hạt của dash107 (f.d107.pt, vẽ ở lớp nền bằng D107.ground) */
  try { if (isWater(ctx, f.x, f.y)) return; const D = f.d107; if (!D || !D.pt) return; const n = land ? 6 : 4;
    for (let i = 0; i < n; i++) { const a = Math.atan2(uy, ux) + (land ? 0 : Math.PI) + (Math.random() - 0.5) * (land ? 3.2 : 1.6), v = (land ? 46 : 34) * (0.5 + Math.random() * 0.6);
      D.pt.push({ x: f.x + (Math.random() - 0.5) * 6, y: f.y + (Math.random() - 0.5) * 2, vx: Math.cos(a) * v, vy: Math.sin(a) * v * 0.5, z: 0, vz: 10 + Math.random() * 16, t: 0, T: 0.3 + Math.random() * 0.18, r: 1.4 + Math.random() * 1.4 }); } } catch (e) { }
}
