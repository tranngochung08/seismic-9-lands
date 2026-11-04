/* dash107.js — plan-107 (anh 02/11): Chấn Thú LAO NHANH tới (áp sát quái / đuổi kịp người chơi xa) thay vì đi bộ nhanh.
   Thư viện chung (không phải hệ đăng ký trong index.js): comp79.js (mọi Chấn Thú thả đi theo, kể cả Rocky golem) và elyz95.js (Elyziuma) gọi vào.
   Trạng thái mỗi con (E.d107): off → wind (chồm thấp 0,12 s, đứng tại chỗ) → run (lao thẳng, tốc ≈ 2× chạy) → brake (phanh trượt 0,2 s) → off (hồi 0,7 s).
   · Chỉ bật khi xa mục tiêu > ngưỡng (o.trig) — gần thì đi như cũ. Không lặp: hết lao là tắt hết hiệu ứng.
   · Di chuyển luôn qua o.move (va chạm của trận / ô cứng) → không xuyên tường; bị chặn thì phanh ngay.
   · Clip: loài có clip 'dash' (PixelLab) chạy vòng khung o.loop; loài chỉ có 'run' → run nhanh 1,7× + NGHIÊNG người bằng xô lệch hàng pixel (không phóng to).
   · VFX code (skill vfx-code: px 2 điểm / px logic, dither Bayer, không trong suốt mờ):
       bóng mờ (afterimage) 2–3 bóng nhuộm màu hệ phía sau · 3 vệt tốc độ sau lưng (chỉ lúc lao) · bụi tung ở chân lúc bật + lúc phanh + vết trượt (lớp nền, dưới thân).
   Lệnh thử: window.__d107 (on, N, log, st(E), trace). */

import * as FX from './fx78.js';
const B4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const bay = (X, Y) => (B4[(Y & 3) * 4 + (X & 3)] + 0.5) / 16;
function dot(g, X, Y, c) { g.fillStyle = c; g.fillRect(X / 2, Y / 2, 0.5, 0.5); }
export const CFG = { wind: 0.12, brake: 0.2, tmax: 1.1, cool: 0.7, coolBlock: 2.5, vMul: 1.7, vMin: 130, vMax: 205, turn: 7, ghostEvery: 0.075, ghostLife: 0.24, ghostA: 0.85, step: 0.09 };
const DUST = ['#f2e6c8', '#dccaa0', '#bba57a', '#937e58'];
export const N = { start: 0, run: 0, brake: 0, block: 0, stop: 0, arrive: 0, maxRun: 0 };
const LOG = [];
function log(e) { LOG.push({ t: +(performance.now() / 1000).toFixed(2), ...e }); if (LOG.length > 120) LOG.shift(); }
export const API = { on: true, N, log: () => LOG.slice(), trace: null, st: E => (E && E.d107 ? { ph: E.d107.ph, t: +E.d107.t.toFixed(2), v: Math.round(E.d107.v || 0), cool: +Math.max(0, E.d107.cool).toFixed(2), ghosts: E.d107.gh.length, parts: E.d107.pt.length } : null), cfg: CFG };
if (typeof window !== 'undefined') window.__d107 = API;

function S(E) { return E.d107 || (E.d107 = { ph: 'off', t: 0, ux: 1, uy: 0, v: 0, v0: 0, cool: 0, gT: 0, sT: 0, gh: [], pt: [], sk: [], draw: null, io: null, dist: 0 }); }
export const phase = E => (E && E.d107 ? E.d107.ph : 'off');
export const busy = E => phase(E) !== 'off';

/* ---------- hạt bụi / vết trượt (lớp nền) ---------- */
function puff(D, x, y, ux, uy, n, sp, back) {
  for (let i = 0; i < n; i++) {
    const a = Math.atan2(uy, ux) + (back ? Math.PI : 0) + (Math.random() - 0.5) * 1.9, v = sp * (0.5 + Math.random() * 0.6);
    D.pt.push({ x: x + (Math.random() - 0.5) * 4, y: y + (Math.random() - 0.5) * 2, vx: Math.cos(a) * v, vy: Math.sin(a) * v * 0.55, z: 0, vz: 14 + Math.random() * 22, t: 0, T: 0.36 + Math.random() * 0.22, r: 1.7 + Math.random() * 1.9 });
  }
}
function updParts(D, dt) {
  for (const p of D.pt) { p.t += dt; const k = Math.exp(-dt * 6); p.vx *= k; p.vy *= k; p.x += p.vx * dt; p.y += p.vy * dt; p.vz -= 90 * dt; p.z = Math.max(0, p.z + p.vz * dt); p.r += dt * 4; }
  D.pt = D.pt.filter(p => p.t < p.T); for (const s of D.sk) s.t += dt; D.sk = D.sk.filter(s => s.t < s.T);
  for (const q of D.gh) q.t += dt; D.gh = D.gh.filter(q => q.t < CFG.ghostLife);
}

/* ---------- ảnh tạm (canvas KHÔNG __hi, vẽ drawImage 9 tham số) ---------- */
const AX = 50, AY = 66, CW = 200, CH = 148;   /* hộp vẽ 100×74 logic, chân ở (50, 66) — đủ cho Rocky golem ×2 (84×60 logic) */
let SCR = null, SCR2 = null; const PAT = new Map();
function cv(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function render(D, E) {   /* vẽ con thú vào SCR, chân ở (AX, AY) logic */
  if (!D.draw || typeof document === 'undefined') return null;
  SCR = SCR || cv(CW, CH); const x = SCR.getContext('2d'); x.setTransform(1, 0, 0, 1, 0, 0); x.globalAlpha = 1; x.globalCompositeOperation = 'source-over'; x.clearRect(0, 0, CW, CH); x.imageSmoothingEnabled = false;
  x.setTransform(2, 0, 0, 2, 0, 0); try { D.draw(x, E.x - AX, E.y - AY, true); } catch (e) { } x.setTransform(1, 0, 0, 1, 0, 0); return SCR;
}
function lvl(x, a) {   /* mẫu dither Bayer 4×4 mức a (0..1) */
  const k = Math.max(0, Math.min(16, Math.round(a * 16))); let p = PAT.get(k);
  if (!p) { const c = cv(4, 4), q = c.getContext('2d'); for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) if (B4[j * 4 + i] < k) { q.fillStyle = '#000'; q.fillRect(i, j, 1, 1); } p = c; PAT.set(k, p); }
  return x.createPattern(p, 'repeat');
}
function ghostPush(D, E) {
  const src = render(D, E); if (!src) return; const c = (D.gh.length >= 4 ? D.gh.shift().c : null) || cv(CW, CH), x = c.getContext('2d');
  x.setTransform(1, 0, 0, 1, 0, 0); x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1; x.clearRect(0, 0, CW, CH); x.drawImage(src, 0, 0);
  x.globalCompositeOperation = 'source-atop'; x.globalAlpha = 0.5; x.fillStyle = (D.io && D.io.tint) || '#bff3e6'; x.fillRect(0, 0, CW, CH); x.globalAlpha = 1; x.globalCompositeOperation = 'source-over';
  D.gh.push({ c, x: Math.round(E.x + D.ox0), y: Math.round(E.y), t: 0 });
}
function drawGhost(g, q, cx, cy) {
  const a = CFG.ghostA * (1 - q.t / CFG.ghostLife); if (a <= 0.03) return; SCR2 = SCR2 || cv(CW, CH); const x = SCR2.getContext('2d');
  x.setTransform(1, 0, 0, 1, 0, 0); x.globalCompositeOperation = 'source-over'; x.clearRect(0, 0, CW, CH); x.drawImage(q.c, 0, 0);
  x.globalCompositeOperation = 'destination-in'; x.fillStyle = lvl(x, a); x.fillRect(0, 0, CW, CH); x.globalCompositeOperation = 'source-over';
  g.drawImage(SCR2, 0, 0, CW, CH, Math.round(q.x - cx) - AX, Math.round(q.y - cy) - AY, CW / 2, CH / 2);
}

/* ---------- cập nhật mỗi khung (gọi ở đầu tick của con thú, kể cả khi đứng yên / ra chiêu) ---------- */
export function tick(E, dt) { const D = S(E); D.cool -= dt; updParts(D, dt); if (D.ph !== 'off' && !D.called) { D.ph = 'off'; D.t = 0; D.cool = CFG.cool; N.stop++; log({ ev: 'stop', why: 'idle' }); } D.called = false; }   /* hệ gọi ngừng gọi go() (đứng chờ / đổi việc) → tắt lao, không treo pha */
export function stop(E, why) {   /* huỷ lao ngay (bắt đầu ra đòn / chiêu, dịch chuyển, đổi vùng) — hiệu ứng đang bay tự tắt */
  const D = E && E.d107; if (!D || D.ph === 'off') return; if (D.ph === 'run' && why !== 'tele' && D.io && !(D.io.water && D.io.water(E.x, E.y))) puff(D, E.x + D.ux * 3, E.y + 1, D.ux, D.uy, 3, 40, false);
  D.ph = 'off'; D.t = 0; D.cool = CFG.cool * 0.6; N.stop++; log({ ev: 'stop', why: why || '' });
}

/* ---------- điều khiển di chuyển ----------
   o = { gx, gy, sp, dt, near, trig, move(dx,dy)→bool, info(clip)→{n}|null, frame(clip, fr), face(ux,uy), dash:'dash'|null, loop:[a,b], wind:fr, brakeClip, tint, water(x,y), draw(g,cx,cy) }
   Trả: null = không lao (con thú đi như cũ) · 'move' = lao đã lo di chuyển khung này · 'arrive' = vừa phanh xong tới nơi. */
export function go(E, o) {
  const D = S(E); D.io = o; D.called = true; if (o.draw) D.draw = o.draw;
  if (o.ctx) { const G = clear(o.ctx, E, o.gx, o.gy, o.r || 9); o.gx = G.x; o.gy = G.y; }   /* đích không chồng lên người chơi / Rocky / Chấn Thú khác */
  const dx = o.gx - E.x, dy = o.gy - E.y, d = Math.hypot(dx, dy), dt = o.dt;
  if (D.ph === 'off') {
    if (!API.on || D.cool > 0 || d < (o.trig || 60) || !(o.sp > 40)) return null;
    D.ph = 'wind'; D.t = 0; D.ux = dx / d; D.uy = dy / d; D.v0 = D.v = Math.max(CFG.vMin, Math.min(CFG.vMax, o.sp * CFG.vMul)); D.gT = 0; D.sT = 0; D.dist = 0; D.ox0 = 0; N.start++; log({ ev: 'start', d: Math.round(d), v: Math.round(D.v) });
  }
  const water = o.water ? o.water(E.x, E.y) : false, hasDash = !!(o.dash && o.info && o.info(o.dash));
  if (o.face) o.face(D.ux, D.uy);
  if (D.ph === 'wind') {
    D.t += dt; pose(o, hasDash ? o.dash : 'run', hasDash ? (o.wind ?? 1) : 0);
    if (D.t >= CFG.wind) { D.ph = 'run'; D.t = 0; N.run++; if (!water) puff(D, E.x - D.ux * 4, E.y + 1, D.ux, D.uy, 9, 68, true); try { if (!(globalThis.__sfx108 && globalThis.__sfx108.at(null, 'dash_fast', E.x, E.y, { vol: 0.65 }))) { if (o.sfx) o.sfx(); } } catch (e) { } }
    return 'move';
  }
  if (D.ph === 'run') {
    D.t += dt; N.maxRun = Math.max(N.maxRun, +D.t.toFixed(2));
    if (d > 0.5) { const a0 = Math.atan2(D.uy, D.ux), a1 = Math.atan2(dy, dx); let da = a1 - a0; while (da > Math.PI) da -= Math.PI * 2; while (da < -Math.PI) da += Math.PI * 2; const a = a0 + Math.max(-CFG.turn * dt, Math.min(CFG.turn * dt, da)); D.ux = Math.cos(a); D.uy = Math.sin(a); }
    D.v = D.v0 * Math.min(1, 0.55 + D.t / 0.12);
    const slide = D.v0 * CFG.brake * 0.5 + (o.near || 3);
    if (d <= slide || D.t > CFG.tmax) { brakeIn(D, E, water, d <= slide ? 'near' : 'tmax'); return 'move'; }
    const st = Math.min(D.v * dt, d), ok = o.move(D.ux * st, D.uy * st); D.dist += st;
    if (API.trace) API.trace.push({ x: +E.x.toFixed(1), y: +E.y.toFixed(1), ph: 'run' });
    if (!ok) { N.block++; brakeIn(D, E, water, 'block'); return 'move'; }
    if (hasDash) { const L0 = o.loop || [1, (o.info(o.dash).n || 2) - 1], n = L0[1] - L0[0] + 1; pose(o, o.dash, L0[0] + (Math.floor(D.t * (o.fps || 14)) % n)); }
    else { const n = (o.info && o.info('run') && o.info('run').n) || 8; pose(o, 'run', Math.floor(D.t * 14 * 1.7) % n); }
    if ((D.gT -= dt) <= 0 && D.t > 0.04) { D.gT = CFG.ghostEvery; ghostPush(D, E); }
    if ((D.sT -= dt) <= 0) { D.sT = CFG.step; if (!water && D.t > 0.1) puff(D, E.x - D.ux * 3, E.y + 1, D.ux, D.uy, 1, 30, true); }
    return 'move';
  }
  if (D.ph === 'brake') {
    D.t += dt; const k = Math.max(0, 1 - D.t / CFG.brake), v = D.v0 * k * 0.9, st = Math.min(v * dt, Math.max(0, d - 0.5));
    if (st > 0.01) { const ok = o.move(D.ux * st, D.uy * st); if (!ok) D.t = CFG.brake; }
    if (API.trace) API.trace.push({ x: +E.x.toFixed(1), y: +E.y.toFixed(1), ph: 'brake' });
    pose(o, o.brakeClip || 'idle', 0);
    if (D.t >= CFG.brake) { D.ph = 'off'; D.t = 0; D.cool = D.blk ? CFG.coolBlock : CFG.cool; N.arrive++;   /* bị chặn: nghỉ lâu để đi thường + gỡ kẹt (unstuck) của con thú làm việc */ log({ ev: 'arrive', d: Math.round(d), dist: Math.round(D.dist) }); return 'arrive'; }
    return 'move';
  }
  return null;
}
function brakeIn(D, E, water, why) {
  D.ph = 'brake'; D.t = 0; D.v0 = Math.max(60, D.v); D.blk = why === 'block'; N.brake++; log({ ev: 'brake', why });
  if (!water) { puff(D, E.x + D.ux * 4, E.y + 1, D.ux, D.uy, 8, 58, false); const px = -D.uy, py = D.ux; for (const s of [-1, 1]) D.sk.push({ x: E.x + px * s * 2.5, y: E.y + py * s * 1.2 + 0.5, ux: D.ux, uy: D.uy, L: 5 + D.v0 / 60, t: 0, T: 0.55 }); }
}
function pose(o, clip, fr) { if (o.frame) o.frame(clip, fr); }

/* ---------- vẽ ---------- */
export function offset(E) {   /* lệch thân: chồm lùi khi lấy đà, nghiêng tới khi lao, ngả lùi khi phanh */
  const D = E && E.d107; if (!D || D.ph === 'off') return { ox: 0, oy: 0 };
  const k = D.ph === 'wind' ? -1 : D.ph === 'run' ? 1 : -1 * Math.max(0, 1 - D.t / CFG.brake);
  return { ox: Math.round(D.ux * k), oy: D.ph === 'wind' ? 0 : Math.round(D.uy * k * 0.5) };
}
export function draw(E, g, cx, cy, fn) {   /* vẽ con thú (thay lời gọi vẽ gốc): lệch theo pha; loài không có clip lao thì xô nghiêng hàng pixel */
  const D = S(E); D.draw = fn; const o = offset(E); D.ox0 = o.ox;
  const io = D.io || {}, amt = io.lean != null ? io.lean : (io.dash && io.info && io.info(io.dash)) ? 0 : 2, lean = D.ph === 'run' && amt > 0 && Math.abs(D.ux) > 0.35 && typeof document !== 'undefined';
  if (!lean) { E.x += o.ox; E.y += o.oy; try { fn(g, cx, cy); } finally { E.x -= o.ox; E.y -= o.oy; } return; }
  const src = render(D, E); if (!src) { fn(g, cx, cy); return; }
  const X = Math.round(E.x - cx) + o.ox, Y = Math.round(E.y - cy) + o.oy, sx = D.ux > 0 ? 1 : -1, H = 2 * 26;   /* xô: đỉnh đầu lệch tới 2 px logic, chân 0 — khối 2 hàng ảnh (1 px logic) */
  for (let r = 0; r < CH; r += 2) { const h = Math.max(0, Math.min(1, (AY * 2 - r) / H)), dx = Math.round(h * amt * 2) / 2 * sx; g.drawImage(src, 0, r, CW, 2, X - AX + dx, Y - AY + r / 2, CW / 2, 1); }
}
export function ground(g, E, cx, cy) {   /* bụi + vết trượt: lớp nền (drawGround), dưới mọi thân */
  const D = E && E.d107; if (!D) return;
  for (const s of D.sk) { const a = 0.7 * (1 - s.t / s.T); for (let j = 0; j < s.L * 2; j++) { const X = Math.round((s.x - s.ux * j / 2 - cx) * 2), Y = Math.round((s.y - s.uy * j / 2 - cy) * 2); if (a * (1 - j / (s.L * 2)) < bay(X, Y)) continue; dot(g, X, Y, DUST[3]); } }
  for (const p of D.pt) { const k = p.t / p.T, R = p.r * 2, X0 = Math.round((p.x - cx) * 2), Y0 = Math.round((p.y - p.z - cy) * 2);
    for (let yy = -R; yy <= R; yy++) for (let xx = -R; xx <= R; xx++) { const q = Math.hypot(xx, yy * 1.3) / R; if (q > 1) continue; const dens = (1 - q) * 1.4 * (1 - k); if (dens < bay(X0 + xx, Y0 + yy)) continue; dot(g, X0 + xx, Y0 + yy, DUST[Math.min(3, (q > 0.6 ? 2 : yy < 0 ? 0 : 1) + (k > 0.6 ? 1 : 0))]); } }
}
export function drawables(out, E, g, cx, cy) {   /* bóng mờ + vệt tốc độ: luôn vẽ TRƯỚC (sau lưng) con thú */
  const D = E && E.d107; if (!D) return;
  for (const q of D.gh) out.push({ y: Math.min(q.y, E.y) - 0.6, f: () => drawGhost(g, q, cx, cy) });
  if (D.ph === 'run' && D.t > 0.05) out.push({ y: E.y - 0.5, f: () => lines(g, E, D, cx, cy) });
}
function lines(g, E, D, cx, cy) {
  const k = Math.min(1, D.v / D.v0), tint = (D.io && D.io.tint) || '#ffffff', hh = (D.io && D.io.h) || 14;
  for (let i = 0; i < 3; i++) {
    const hy = [0.35, 0.6, 0.85][i] * hh, px = -D.uy, py = D.ux, off = (i - 1) * 3.5, L0 = (7 + i * 2 + ((D.t * 30 + i * 7) % 4)) * k * 2;
    const bx = E.x - D.ux * 7 + px * off, by = E.y - hy - D.uy * 5 + py * off * 0.5, X0 = (bx - cx) * 2, Y0 = (by - cy) * 2;
    for (let j = 0; j < L0; j++) { const X = Math.round(X0 - D.ux * j), Y = Math.round(Y0 - D.uy * j); if ((1 - j / L0) * 0.9 < bay(X, Y)) continue; dot(g, X, Y, j < 3 ? '#ffffff' : tint); }
  }
}

/* ---------- cầu nối CHUNG cho chiến binh ldKit (sprite trận duel_sprites.json) — comp79 / squad104 (p104) / thú hoang + thủ lĩnh p106 dùng chung ----------
   Gắn vào 1 hệ di chuyển bất kỳ (3 dòng):
     1) đầu tick con thú:   D107.tick(holder, dt)
     2) ngay trước bước đi: const r = D107.goFighter(ctx, f, gx, gy, sp, dt, near, { trig, holder }); if (r) return;   (r = 'move' | 'arrive')
        f = chiến binh ldKit (có sp, clip, ct, fx, fy); holder = vật giữ toạ độ (mặc định f; quái p106 / côn đồ: holder = mo, f = mo.e…)
     3) vẽ: thay lời vẽ thân bằng D107.draw(holder, g, cx, cy, (gg, a, c) => <vẽ cũ với gg, a, c>); drawGround: D107.ground(g, holder, cx, cy); drawables: D107.drawables(out, holder, g, cx, cy)
   Bắt đầu đòn / chiêu / dịch chuyển: D107.stop(holder, 'lý do'). Tắt toàn bộ: __d107.on = false. */
const DS = { m: null, busy: false };
export function sprites() { if (!DS.m && !DS.busy && typeof fetch !== 'undefined') { DS.busy = true; fetch('assets/px/linhduel/duel_sprites.json').then(r => r.json()).then(j => { DS.m = j; }, () => { DS.busy = false; }); } return DS.m; }
export const LOOP = { rocky: [3, 8, 2], hoahung: [3, 5, 1], vitbao: [3, 5, 2], thanhong: [2, 6, 1], rongdo: [3, 5, 2] };   /* loài có clip 'dash': [khung đầu, khung cuối vòng lao, khung lấy đà] */
const FPSD = { idle: 8, run: 14, dash: 14 };
export function fighterIO(ctx, f, gx, gy, sp, dt, near, opt = {}) {
  const M = sprites(), S0 = M && M[f.sp], L = LOOP[f.sp], sk = FX.skinOf(f.sp, f.types && f.types[0]), H = S0 && S0.idle ? Math.round(S0.idle.ch / 2 * 0.7) : 14, hold = opt.holder || f;
  return { ctx, r: opt.r || 9, gx, gy, sp, dt, near, trig: opt.trig || 60,
    move: (a, b) => { if (hold === f) return ctx.ldKit.move(f, a, b); const o = { sp: f.sp, x: hold.x, y: hold.y }; let ok = true; try { ok = ctx.ldKit.move(o, a, b); } catch (e) { o.x += a; o.y += b; } hold.x = o.x; hold.y = o.y; return ok; },
    info: c => (S0 && S0[c]) || null,
    frame: (c, fr) => { const cc = S0 && S0[c] ? c : 'idle', q = S0 && S0[cc]; f.clip = cc; f.ct = (fr + 0.5) / ((q && q.fps) || FPSD[cc] || 10); },
    face: (ux, uy) => { f.fx = ux; f.fy = uy; if (opt.face) opt.face(ux, uy); },
    dash: L && S0 && S0.dash ? 'dash' : null, loop: L ? [L[0], L[1]] : null, wind: L ? L[2] : 1, lean: opt.lean, tint: opt.tint || (sk && sk.pal && sk.pal[1]) || '#ffffff', h: H,
    water: (x, y) => { try { const m = ctx.S.map, g = ctx.getG(m, Math.floor(x / 16), Math.floor(y / 16)); return g === ctx.T.WATER || g === ctx.T.DEEP; } catch (e) { return false; } },   /* c2-raloi water */ sfx: opt.quiet ? null : () => { try { ctx.sfx('whoosh'); } catch (e) { } } };
}
/* đẩy điểm đích ra khỏi thân người chơi, Rocky (pet), Elyziuma, Chấn Thú thả (comp79) — giữ cách ≥ 1 thân, dùng cho cả lao lẫn đi thường */
export function clear(ctx, self, gx, gy, r = 9) {
  const L = [];
  try { const p = ctx.S.player; L.push([p.x, p.y, 7]); } catch (e) { }
  for (const f of [() => ctx.rocky && ctx.rocky.pos && ctx.rocky.pos(), () => ctx.elyz95 && ctx.elyz95.pos && ctx.elyz95.pos(), () => ctx.comp79 && ctx.comp79.pos && ctx.comp79.pos()]) { try { const q = f(); if (q) L.push([q.x, q.y, 9]); } catch (e) { } }
  let x = gx, y = gy;
  for (let k = 0; k < 3; k++) for (const [qx, qy, qr] of L) {
    if (self && Math.hypot(qx - self.x, qy - self.y) < 0.5) continue;
    const dx = x - qx, dy = (y - qy) * 1.4, d = Math.hypot(dx, dy), need = r + qr;
    if (d >= need) continue;
    let ux = dx, uy = dy; if (d < 0.5) { ux = self ? self.x - qx : -1; uy = self ? (self.y - qy) * 1.4 : 0; }
    const m = Math.hypot(ux, uy) || 1; x = qx + ux / m * need; y = qy + uy / m * need / 1.4;
  }
  return { x, y };
}
export function goFighter(ctx, f, gx, gy, sp, dt, near, opt = {}) { return go(opt.holder || f, fighterIO(ctx, f, gx, gy, sp, dt, near, opt)); }
