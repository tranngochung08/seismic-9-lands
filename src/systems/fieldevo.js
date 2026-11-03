/* fieldevo.js — p74 (plan-74 đợt 0): CẢNH TIẾN HOÁ Chấn Thú vẽ code hoàn toàn (skill vfx-code: RES 2, bảng màu 8 bậc theo hệ, dither Bayer, lớp back / front / light,
   vật lý hạt: trọng lực, lực cản, nảy; mọi rung / chớp / khựng chỉ theo SỰ KIỆN). Sprite thú vẫn là ảnh PixelLab (dạng gốc → dạng tiến hoá).
   Nhịp ~3,4 s: GỒNG (hạt xoáy hút vào thân, vòng đất co lại, thân sáng dần, rung nhẹ tăng dần) → VỎ (Chấn: vỏ pha lê mọc quanh thân rồi nứt · Triều: mưa xoáy + cột nước cuộn lên)
   → BÙNG (khựng 0,12 s, chớp trắng 1 khung, rung mạnh, sóng xung kích trên đất, mảnh vỡ / giọt nước văng có trọng lực + nảy) → HIỆN dạng mới (bóng trắng tan dần) + tia sáng.
   Anh chốt 01/11: bản v1 (tia sáng toả tròn) — v2 (cột sáng) / v3 (nén – nổ) đã bỏ khỏi engine, chỉ còn GIF so trong assets/px/test/p74. */
import { PAL_SRC } from './pxfx.js';
import { awaken, skinOf } from './fx78.js';   /* p78: Saiyan A — tối cảnh + sét + hào quang + chớp vàng + tên dạng mới + nứt đất + đá bay + cột sáng */
export const AWAKEN_MIN = 0.2;   /* độ lực < 0,2 (thú Thường bậc Tí) → chỉ cảnh v1 */

export const EVO_T = { charge: 1.25, shell: 0.75, hold: 0.12, reveal: 1.3 };
/* ĐỘ LỰC theo sức mạnh thú (anh Hùng: "con càng mạnh thì hiệu ứng càng lực") — dùng chung cho cảnh tiến hoá (sau này cả chiêu):
   p = 0..1 từ bậc cỡ (Tí 0 · Nhỏ .2 · Vừa .45 · To .7), độ hiếm (Thường 0 · Hiếm .3 · Rất Hiếm .6 · Huyền Thoại .9), cấp (/100). */
const SZ = { xs: 0, s: 0.2, m: 0.45, l: 0.7 }, RR = { thuong: 0, hiem: 0.3, rathiem: 0.6, huyen: 0.9 };
export function fxPowerOf(s, lv = 20) { if (!s) return 0.3; return Math.max(0, Math.min(1, 0.75 * (RR[s.rarity] ?? 0.2) / 0.9 + 0.15 * (SZ[s.size] ?? 0.45) / 0.7 + 0.1 * Math.min(1, (lv | 0) / 100))); }
export function fxPower(p) { p = Math.max(0, Math.min(1, p)); return { p, rays: Math.round(8 + 22 * p), ring: 40 + 50 * p, particles: 0.6 + 1.6 * p, hitstop: 0.07 + 0.16 * p, shake: 0.25 + 0.55 * p, zoom: 0.06 + 0.3 * p, shards: Math.round(12 + 30 * p), cracks: p >= 0.45 ? Math.round(3 + 7 * p) : 0 }; }
const BAY = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5], bay = (x, y) => (BAY[((y & 3) << 2) | (x & 3)] + 0.5) / 16;
const WHITE = ['#ffffff', '#fffbe8', '#fff1c0'];
let SEED = 7; const rnd = () => { SEED = (SEED * 16807) % 2147483647; return (SEED - 1) / 2147483646; };
const dot = (g, X, Y, c) => { g.fillStyle = c; g.fillRect(X / 2, Y / 2, 0.5, 0.5); };
function disc(g, X, Y, r, c, a = 1) { g.fillStyle = c; for (let y = Math.floor(Y - r); y <= Math.ceil(Y + r); y++) for (let x = Math.floor(X - r); x <= Math.ceil(X + r); x++) { const dx = x + 0.5 - X, dy = y + 0.5 - Y; if (dx * dx + dy * dy <= r * r && (a >= 1 || a > bay(x, y))) g.fillRect(x / 2, y / 2, 0.5, 0.5); } }

/* E: { he, x, y, v, t, ph, parts[], shards[], rays[], rings[], shell, swapped } */
export function evoStart(o) {
  SEED = 7 + ((o.x | 0) % 97);
  const P0 = fxPower(o.power ?? 0.3), E = { P: P0, he: o.he || 'chan', x: o.x, y: o.y, h: o.h || 18, t: 0, ph: 'charge', parts: [], shards: [], drops: [], rings: [], rays: [], swapped: false, flash: 0, hit: false, done: false, ctx: o.ctx, onSwap: o.onSwap || null, log: [] };
  for (let i = 0; i < P0.rays; i++) E.rays.push({ a: i / P0.rays * Math.PI * 2 + rnd() * 0.15, L: (22 + rnd() * 22) * (0.8 + P0.p * 0.7), w: rnd() < 0.2 + 0.4 * P0.p ? 2 : 1 });
  if (P0.p >= AWAKEN_MIN && o.name) E.A = awaken({ get: () => (E.done ? null : { x: E.x, y: E.y, h: E.h }), sk: skinOf(o.sp, E.he), p: P0.p, name: String(o.name).toUpperCase(), T: TE(E) + 0.2, tBurst: T2() });   /* p78 */
  E.cracks = []; for (let i = 0; i < P0.cracks; i++) { const a = i / P0.cracks * Math.PI * 2 + rnd() * 0.5, pts = [[0, 0]]; let x = 0, y = 0; for (let k = 0; k < 5; k++) { x += Math.cos(a + (rnd() - 0.5) * 0.9) * (4 + rnd() * 5); y += Math.sin(a + (rnd() - 0.5) * 0.9) * (2 + rnd() * 2.5); pts.push([x, y]); } E.cracks.push(pts); }
  return E;
}
const T1 = () => EVO_T.charge, T2 = () => EVO_T.charge + EVO_T.shell, T3 = E => T2() + E.P.hitstop, TE = E => T3(E) + EVO_T.reveal;
export function evoUpdate(E, dt) {
  if (E.done) return; const ctx = E.ctx, P = PAL_SRC[E.he] || PAL_SRC.chan, cy = E.y - E.h * 0.5;
  /* khựng: dừng mọi hạt 0,12 s ngay lúc bùng */
  if (E.t >= T2() && E.t < T3(E)) { E.t += dt; if (!E.hit) { E.hit = true; burst(E); } return; }
  E.t += dt;
  if (E.zp && E.ctx && E.ctx.S) { const S = E.ctx.S; E.zp.t += dt; const k = E.zp.t / 0.32; if (k >= 1) { S.camZoom = E.zp.z0; S.camFocus = E.zp.f0; E.zp = null; } else { S.camZoom = E.zp.z0 * (1 + E.P.zoom * Math.sin(Math.PI * k)); S.camFocus = { x: E.x, y: E.y - E.h * 0.5 }; } }   /* zoom-punch ngắn lúc bùng */
  if (E.t < T2()) {   /* GỒNG + VỎ: hạt xoáy hút vào thân */
    const k = Math.min(1, E.t / T1()), rate = (40 + 120 * k) * E.P.particles;
    for (let n = rate * dt; n > 0; n--) { if (rnd() > n) break; const a = rnd() * Math.PI * 2, R = 34 + rnd() * 26; E.parts.push({ a, R, z: 4 + rnd() * 16, t: 0, T: 0.55 + rnd() * 0.35, spin: (rnd() < 0.5 ? -1 : 1) * (2 + rnd() * 2), c: rnd() < 0.3 ? WHITE[0] : P[(rnd() * 3) | 0] }); }
    if (ctx && ctx.quake && E.t > 0.6 && ((E.t * 6) | 0) !== ((E.t - dt) * 6 | 0)) ctx.quake(0.03 + 0.06 * k);   /* rung nhẹ tăng dần theo nhịp gồng (6 lần / s) */
    if (E.he === 'trieu' && E.t > T1() * 0.6) for (let n = 70 * dt; n > 0; n--) { if (rnd() > n) break; E.drops.push({ x: E.x + (rnd() - 0.5) * 70, y: E.y + (rnd() - 0.5) * 22, z: 60 + rnd() * 30, vx: -18, vz: -150, t: 0, T: 2, rain: true }); }
  }
  for (const q of E.parts) { q.t += dt; const k = q.t / q.T; q.R *= Math.pow(0.08, dt / q.T); q.a += q.spin * dt * (1 + k * 2); }
  E.parts = E.parts.filter(q => q.t < q.T);
  for (const s of E.shards) { s.t += dt; s.vz -= 260 * dt; s.x += s.vx * dt; s.y += s.vy * dt; s.z += s.vz * dt; s.vx *= 1 - 1.5 * dt; s.vy *= 1 - 1.5 * dt; s.rot += s.vr * dt; if (s.z < 0) { s.z = 0; if (s.vz < -40) { s.vz = -s.vz * 0.35; s.vr *= 0.5; } else { s.vz = 0; s.vx *= 0.6; s.vy *= 0.6; } } }
  E.shards = E.shards.filter(s => s.t < s.T);
  for (const d of E.drops) { d.t += dt; d.x += d.vx * dt; d.z += d.vz * dt; if (!d.rain) { d.vz -= 300 * dt; d.y += (d.vy || 0) * dt; } if (d.z <= 0) { d.dead = true; if (d.rain && rnd() < 0.4) E.rings.push({ x: d.x, y: d.y, R: 4, t: 0, T: 0.25, small: true }); } }
  E.drops = E.drops.filter(d => !d.dead && d.t < d.T);
  for (const r of E.rings) r.t += dt; E.rings = E.rings.filter(r => r.t < r.T);
  if (E.t >= TE(E)) E.done = true;
}
function burst(E) {
  const ctx = E.ctx, P = PAL_SRC[E.he] || PAL_SRC.chan;
  if (ctx) { if (ctx.quake) ctx.quake(E.P.shake); if (ctx.S && E.P.zoom > 0.05) { E.zp = { z0: ctx.S.camZoom || 1, f0: ctx.S.camFocus || null, t: 0 }; } if (ctx.S) ctx.S.flash = Math.max(ctx.S.flash || 0, 0.12); if (ctx.duelSfx) try { ctx.duelSfx('hit_big', { type: E.he }); } catch (e) { } }
  E.rings.push({ x: E.x, y: E.y, R: E.P.ring, t: 0, T: 0.42 + 0.25 * E.P.p }); if (E.P.p >= 0.5) E.rings.push({ x: E.x, y: E.y, R: E.P.ring * 1.35, t: -0.1, T: 0.6 });
  const N = E.he === 'chan' ? E.P.shards : Math.round(E.P.shards * 0.4);
  for (let i = 0; i < N; i++) { const a = rnd() * Math.PI * 2, v = 60 + rnd() * 90; E.shards.push({ x: E.x, y: E.y, z: E.h * 0.5, vx: Math.cos(a) * v, vy: Math.sin(a) * v * 0.5, vz: 80 + rnd() * 120, rot: rnd() * 6, vr: (rnd() - 0.5) * 18, sz: 1 + ((rnd() * 3) | 0), t: 0, T: 1.1 + rnd() * 0.5, c: P[(rnd() * 4) | 0] }); }
  if (E.he === 'trieu') for (let i = 0; i < 40; i++) { const a = rnd() * Math.PI * 2, v = 50 + rnd() * 100; E.drops.push({ x: E.x, y: E.y, z: 10 + rnd() * 20, vx: Math.cos(a) * v, vy: Math.sin(a) * v * 0.5, vz: 90 + rnd() * 140, t: 0, T: 1.4 }); }
  if (!E.swapped) { E.swapped = true; if (E.onSwap) try { E.onSwap(); } catch (e) { } }
  E.log.push('burst');
}
/* thân thú: trả { white: 0..1 } để bên vẽ sprite phủ trắng (gồng sáng dần · hiện dạng mới trắng tan dần) */
export function evoBody(E) {
  if (E.t < T1()) return { white: 0.15 + 0.55 * (E.t / T1()), shake: E.t > 0.6 ? 1 : 0 };
  if (E.t < T3(E)) return { white: 1, shake: 1 };
  const k = (E.t - T3(E)) / EVO_T.reveal; return { white: Math.max(0, 1 - k * 1.6), shake: 0 };
}
export function evoGround(g, E, cx, cy) {   /* lớp nền: vòng đất co lại khi gồng · sóng xung kích · gợn mưa · vết nứt nền (con mạnh) */
  const P = PAL_SRC[E.he] || PAL_SRC.chan, X = (E.x - cx) * 2, Y = (E.y - cy) * 2;
  if (E.hit && E.cracks.length) { const a = Math.max(0, 1 - Math.max(0, E.t - T3(E) - 0.6) / 0.8); for (const c of E.cracks) for (let i = 1; i < c.length; i++) { const [x0, y0] = c[i - 1], [x1, y1] = c[i], n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2); for (let k = 0; k <= n; k++) { const px = Math.round(X + (x0 + (x1 - x0) * k / n) * 2), py = Math.round(Y + (y0 + (y1 - y0) * k / n) * 2); if (a > bay(px, py)) { dot(g, px, py, P[6]); if (i < 3) dot(g, px + 1, py, P[7]); } } } }
  if (E.t < T2()) { const k = Math.min(1, E.t / T2()), R = (46 - 30 * k) * 2, n = Math.round(R * 1.4); for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2 + E.t * 2, px = Math.round(X + Math.cos(a) * R), py = Math.round(Y + Math.sin(a) * R * 0.45); if (0.3 + 0.6 * k > bay(px, py)) dot(g, px, py, i % 3 ? P[3] : P[1]); } }
  for (const r of E.rings) { if (r.t < 0) continue; const k = r.t / r.T, R = (r.small ? r.R * (0.5 + k) : 6 + r.R * (1 - Math.pow(1 - k, 3))) * 2, th = r.small ? 1 : Math.max(1, 5 * (1 - k)), n = Math.max(16, Math.round(R * 1.6)), rx = (r.x - cx) * 2, ry = (r.y - cy) * 2;
    for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a) * 0.42; for (let q = 0; q < th; q++) { const px = Math.round(rx + ca * (R - q)), py = Math.round(ry + sa * (R - q)); if (1 - k * 0.85 > bay(px, py)) dot(g, px, py, q === 0 ? P[1] : P[3]); } } }
}
export function evoDrawables(out, g, E, cx, cy) {
  const P = PAL_SRC[E.he] || PAL_SRC.chan, by = E.y, top = E.y - E.h * 0.5;
  /* hạt xoáy: nửa sau (sin < 0) sau lưng thú, nửa trước trước thú */
  out.push({ y: by - 0.6, f: () => { for (const q of E.parts) if (Math.sin(q.a) < 0) part(g, E, q, cx, cy); } });
  out.push({ y: by + 0.6, f: () => { for (const q of E.parts) if (Math.sin(q.a) >= 0) part(g, E, q, cx, cy); } });
  /* vỏ: Chấn = pha lê mọc + nứt · Triều = cột nước xoắn */
  if (E.t >= T1() * 0.7 && E.t < T3(E)) out.push({ y: by + 0.55, f: () => (E.he === 'trieu' ? waterColumn(g, E, cx, cy) : crystalShell(g, E, cx, cy)) });
  if (E.t >= T3(E) && E.t < T3(E) + 0.9) out.push({ y: by + 0.7, f: () => rays(g, E, cx, cy) });
  for (const s of E.shards) out.push({ y: s.y + 0.3, f: () => shard(g, s, cx, cy) });
  for (const d of E.drops) out.push({ y: d.y + 0.3, f: () => drop(g, d, cx, cy) });
  if (E.t >= T3(E) && E.t < T3(E) + 0.16) out.push({ y: by + 0.8, f: () => { const k = (E.t - T3(E)) / 0.16; disc(g, (E.x - cx) * 2, (top - cy) * 2, 14 * (1 - k) + 3, WHITE[0], 1); disc(g, (E.x - cx) * 2, (top - cy) * 2, 8 * (1 - k) + 2, WHITE[2], 1); } });   /* lõi sáng ngay lúc bùng */
}
function part(g, E, q, cx, cy) { const k = q.t / q.T, X = Math.round((E.x + Math.cos(q.a) * q.R - cx) * 2), Y = Math.round((E.y - E.h * 0.5 + Math.sin(q.a) * q.R * 0.45 - q.z * (1 - k) - cy) * 2); dot(g, X, Y, q.c); if (k > 0.4) dot(g, X - Math.round(Math.sin(q.a) * 2), Y + Math.round(Math.cos(q.a)), q.c); }
function crystalShell(g, E, cx, cy) {   /* vỏ mọc quanh thân rồi nứt trước lúc vỡ: Chấn = pha lê tím · hệ khác = vỏ năng lượng màu hệ (Nham: lưỡi lửa) */
  const P = E.he === 'chan' ? PAL_SRC.tinh : (PAL_SRC[E.he] || PAL_SRC.tinh), k = Math.min(1, (E.t - T1() * 0.7) / (EVO_T.shell + T1() * 0.3)), X = (E.x - cx) * 2, Y = (E.y - cy) * 2, H = E.h * 2 + 8, W = 22;
  for (let i = 0; i < 9; i++) { const u = i / 8 - 0.5, h = H * (0.55 + 0.45 * Math.cos(u * 2.4)) * Math.min(1, k * 1.6 - Math.abs(u) * 0.6); if (h <= 0) continue; const x0 = Math.round(X + u * W * 2), w = 4 + (i % 2) * 2;
    for (let y = 0; y < h; y++) { const ww = Math.max(1, Math.round(w * (1 - y / h))); for (let x = -ww; x <= ww; x++) dot(g, x0 + x, Math.round(Y - y), x < -ww / 2 ? P[1] : x > ww / 2 ? P[4] : y > h - 3 ? P[0] : P[2]); } }
  if (k > 0.55) { g.fillStyle = WHITE[0]; const n = Math.round((k - 0.55) * 30); for (let i = 0; i < n; i++) { const a = i * 2.39, r = (i % 7) * 3; g.fillRect(Math.round(X + Math.cos(a) * r) / 2, Math.round(Y - H * 0.5 + Math.sin(a) * r * 1.3) / 2, 0.5, 0.5); } }   /* vết nứt sáng lan */
}
function waterColumn(g, E, cx, cy) {   /* cột nước xoắn 2 dải cuộn quanh thân, cao dần */
  const P = PAL_SRC.trieu, k = Math.min(1, (E.t - T1() * 0.7) / (EVO_T.shell + T1() * 0.3)), X = (E.x - cx) * 2, Y = (E.y - cy) * 2, H = (E.h * 2 + 46) * k, R = 20;
  for (let y = 0; y < H; y += 1) for (let s = 0; s < 3; s++) { const a = y * 0.16 - E.t * 10 + s * 2.094, x = Math.cos(a) * R * (1 - y / (H + 40) * 0.4), front = Math.sin(a) > 0, px = Math.round(X + x), py = Math.round(Y - y);
    if (front) { dot(g, px - 1, py, P[3]); dot(g, px, py, P[1]); dot(g, px + 1, py, P[0]); dot(g, px + 2, py, P[2]); } else { dot(g, px, py, P[5]); dot(g, px + 1, py, P[4]); } }
  for (let i = 0; i < 10; i++) { const a = i * 0.63 + E.t * 7, px = Math.round(X + Math.cos(a) * (R + 6)), py = Math.round(Y - H + Math.sin(a) * 5); dot(g, px, py, P[0]); }   /* bọt đỉnh cột */
}
function rays(g, E, cx, cy) { const k = (E.t - T3(E)) / 0.9, X = (E.x - cx) * 2, Y = (E.y - E.h * 0.5 - cy) * 2; for (const r of E.rays) { const L = r.L * 2 * (0.3 + k), a0 = r.a + k * 0.4; for (let s = 6; s < L; s += 1) { const px = Math.round(X + Math.cos(a0) * s), py = Math.round(Y + Math.sin(a0) * s * 0.8); if ((1 - k) * (1 - s / L * 0.5) > bay(px, py)) { dot(g, px, py, s < L * 0.4 ? WHITE[0] : WHITE[2]); if (r.w > 1) dot(g, px + 1, py, WHITE[1]); } } } }
function shard(g, s, cx, cy) { const k = s.t / s.T; if (k > 0.85 && bay((s.x * 2) | 0, (s.y * 2) | 0) < (k - 0.85) * 6) return; const X = Math.round((s.x - cx) * 2), Y = Math.round((s.y - s.z - cy) * 2), c = Math.cos(s.rot), d = Math.sin(s.rot); for (let i = -s.sz; i <= s.sz; i++) { dot(g, X + Math.round(c * i), Y + Math.round(d * i), i === 0 ? '#fff4ff' : s.c); dot(g, X + Math.round(-d * i * 0.5), Y + Math.round(c * i * 0.5), s.c); } if (s.z > 0.5) { g.fillStyle = 'rgba(30,20,30,.35)'; g.fillRect(Math.round((s.x - cx) * 2) / 2, Math.round((s.y - cy) * 2) / 2, 1, 0.5); } }
function drop(g, d, cx, cy) { const P = PAL_SRC.trieu, X = Math.round((d.x - cx) * 2), Y = Math.round((d.y - d.z - cy) * 2); if (d.rain) { for (let i = 0; i < 4; i++) dot(g, X + Math.round(i * 0.4), Y - i * 2, i ? P[2] : P[0]); return; } dot(g, X, Y, P[0]); dot(g, X + 1, Y, P[2]); dot(g, X, Y + 1, P[3]); }
