/* duelfx.js — p52e: nối bộ VFX CODE HOÀN TOÀN (pxfx_full.js, p61) vào engine trận Chấn Thú (linhduel.js).
   Anh chốt 30/10: VFX chiêu vẽ code hoàn toàn (sprite thú vẫn PixelLab). ?vfx=old = bản PixelLab cũ để so (mặc định = code).
   · Cảnh pxfx_full vẽ ở khung MẪU (thú 50,84 → đối thủ 128,84). Ở đây ánh xạ khung mẫu → vị trí thật mỗi khung:
     x theo 3 đoạn (sau miệng 1:1 · giữa miệng và đối thủ giãn / co theo khoảng cách thật · quanh đối thủ 1:1, vòng quanh đối thủ không méo),
     y lệch dần từ hàng người ra chiêu sang hàng đối thủ; đối thủ ở bên trái thì vẽ vào đệm như bên phải rồi DÁN LẬT (cả hạt / mảnh lật theo).
   · Mốc: cảnh tạo lúc bắt đầu động tác (gồng 0–0,3 s chạy cùng clip), lúc tung chiêu (fire) cảnh ở ~0,3 s; điểm neo bám thú tới cú trúng đầu rồi đứng yên.
   · Trúng: sát thương của engine (cùng luật, cùng phép thử tầm / vùng) được HOÃN tới khung trúng của cảnh (cú mạnh nhất) — hình trúng và số máu khớp nhau;
     cú trúng sau của cơ chế nhiều nhịp rơi vào các nhịp sau của cảnh. Đạn / ném bổng: engine vẫn tính đường bay + va chạm, chỉ chỉnh vận tốc cho tới đúng lúc cảnh nổ.
   · Lực (anh dặn 30/10 'CỰC LỰC'): khựng theo sức (thường 2–4 khung, tuyệt chiêu 8 khung ở cú chốt), chớp trắng ngắn trên thân bị trúng, rung ngắn theo sức,
     sóng xung kích vòng trên đất + vết nứt / cháy ở cú nặng, bụi trượt khi bị hất — mọi thứ chỉ bật theo sự kiện rồi tắt. */
import { createFull, FKIT } from './pxfx_full.js';
import { PAL_SRC } from './pxfx.js';
import { clash79, setClash79, clashVar79 } from './clash79.js';   /* p79 */
if (typeof window !== 'undefined') window.__clash79 = setClash79;
const { DBuf, DLBuf, RES } = FKIT;

export const VFX_OLD = (() => { try { return new URLSearchParams(location.search).get('vfx') === 'old'; } catch (e) { return false; } })();
export const CODE = !VFX_OLD;
const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v), lerp = (a, b, t) => a + (b - a) * t;

/* ---------- bảng chiêu → cảnh ---------- */
const SCN = {}, TYPE = {};
let ENV = null;   /* móc engine: { ST, mouth(f), foeOf(f), hitstop(s), quake(s), flashW(k), ground(x, y, he, pow, big), sfx(n) } */
export function init(SET5, env) { ENV = env; for (const [t, ids] of Object.entries(SET5)) ids.forEach((id, i) => { SCN[id] = t + (i < 4 ? '_sk' + (i + 1) : '_ult'); TYPE[id] = t; }); }
/* p67:addscene:begin */
/* p67: chiêu riêng — gắn id chiêu với cảnh code (kind = <hệ>_sig<loài>) */
export function addScene(id, kind, pal) { SCN[id] = kind; TYPE[id] = pal || kind.split('_')[0]; if (pal) PALO[id] = pal; }   /* p72: pal = bảng màu hệ khác (chiêu A dùng lại cảnh của hệ khác) */
const PALO = {};
/* p67:addscene:end */
export const sceneOf = id => (CODE && SCN[id]) || null;

/* ---------- thông tin mốc của cảnh (chạy khô, chỉ update — ~2 ms / cảnh) ---------- */
const INFO = {};
export function info(kind) {
  if (INFO[kind]) return INFO[kind];
  const he = kind.split('_')[0], ult = kind.endsWith('ult'), C = ult ? { x: 52, y: 84 } : { x: 50, y: 84 }, hits = []; let knock = -1, e = null;
  const nop = () => { };
  e = createFull('full_' + kind, { x: 128, y: ult && he !== 'quang' ? 86 : 84, bw: 8, bh: 8, up: 4, type: he, seed: 11, C, M: { x: C.x + 8, y: C.y, z: 10 },
    hit: p => hits.push({ t: e.t, p: p ?? 1 }), knock: () => { knock = e.t; }, shake: nop, flash: nop, dash: nop, hide: nop, warp: nop, cx: () => C.x });
  let n = 0; while (e && !e.done() && n < 150) { e.update(1 / 30); n++; }
  let main = -1; for (let i = 0; i < hits.length; i++) if (main < 0 || hits[i].p > hits[main].p + 1e-6) main = i;
  return (INFO[kind] = { hits, main, knock, end: n / 30 });
}

/* ---------- đệm dùng lại (tránh cấp phát canvas giữa trận) ---------- */
const POOL = new Map();
const bucket = (v, s, lo, hi) => Math.max(lo, Math.min(hi, Math.ceil(v / s) * s));
function takeBufs(W, H) { const k = W + 'x' + H, a = POOL.get(k); if (a && a.length) return a.pop(); return [new DBuf(W * RES, H * RES), new DBuf(W * RES, H * RES), new DLBuf(W * RES, H * RES)]; }
function giveBufs(W, H, b) { const k = W + 'x' + H; if (!POOL.has(k)) POOL.set(k, []); const a = POOL.get(k); if (a.length < 4) a.push(b); }

/* ---------- cảnh trong trận ---------- */
const LIST = [];
export const list = () => LIST;
function local(sc, xw) { return sc.dir > 0 ? xw : 2 * sc.P - xw; }
function knots(sc) {
  const f = sc.f, foe = sc.foe;
  if (!sc.fixC && f) { sc.C = { x: local(sc, f.x), y: f.y }; const m = ENV.mouth(f); sc.M = { x: local(sc, m.x), y: f.y }; }
  if (!sc.fixF && foe && !sc.Fpt) sc.F = { x: local(sc, foe.x), y: foe.y };
  if (sc.Fpt) sc.F = { x: local(sc, sc.Fpt.x), y: sc.Fpt.y };
}
function installMap(sc, c) {
  const Cc = sc.Cc, Mc = sc.Mc, Fc = sc.Fc, KC = 22; c.mir = sc.dir < 0;
  let lw = 0;
  const seg = () => { const a0 = Mc.x, a1 = Math.max(a0 + 4, Fc.x - KC), r0 = sc.M.x, r1 = Math.max(r0 + 2, sc.F.x - KC); return [a0, a1, r0, r1]; };
  const X = x => { const [a0, a1, r0, r1] = seg(); lw = clamp((x - a0) / (a1 - a0)); if (x <= a0) return r0 + (x - a0); if (x >= a1) return r1 + (x - a1); return r0 + (x - a0) * (r1 - r0) / (a1 - a0); };
  const off = () => lerp(sc.C.y - Cc.y, sc.F.y - Fc.y, lw);
  c.X = x => (X(x) - sc.bx0) * RES;
  c.Y = (y, z = 0) => (y + off() - z - sc.by0) * RES;
  c.IX = bx => { const r = bx / RES + sc.bx0, [a0, a1, r0, r1] = seg(); const x = r <= r0 ? a0 + (r - r0) : r >= r1 ? a1 + (r - r1) : a0 + (r - r0) * (a1 - a0) / (r1 - r0); lw = clamp((x - a0) / (a1 - a0)); return x; };
  c.IZ = (by, y) => y + off() - sc.by0 - by / RES;
}
/* tạo cảnh cho động tác: f ra chiêu → foe; t0 = giờ cảnh lúc tạo (âm = chờ); o.fixC: đứng yên chân người ra chiêu (lao / dịch chuyển) */
export function spawn(id, f, foe, t0 = 0, o = {}) {
  const kind = o.kind || sceneOf(id); if (!kind || !ENV) return null;
  const he = kind.split('_')[0], ult = kind.endsWith('ult'), I = info(kind), dir = (foe ? foe.x : f.x + 1) >= f.x ? 1 : -1, m = ENV.mouth(f);
  const sc = { id, kind, he, ult, f, foe, dir, P: Math.round(f.x), t: 0, wait: Math.max(0, -t0), I, hi: 0, q: [], act: o.act || null, fired: !o.act, mv: o.noDefer ? null : id, fixC: false, fixF: false, Fpt: null, life: 0, rel: o.rel ?? (kind.endsWith('ult') ? 0.4 : 0.3), hooks: o.hooks || null };
  sc.Cc = ult ? { x: 52, y: 84 } : { x: 50, y: 84 }; sc.Fc = { x: 128, y: ult && he !== 'quang' ? 86 : 84 };
  const mox = Math.max(2, Math.min(16, (m.x - f.x) * dir)), mz = Math.max(2, f.y - m.y);
  sc.Mc = { x: sc.Cc.x + mox, y: 84, z: mz };
  knots(sc); if (o.fixC) sc.fixC = true;
  const span = Math.abs((foe ? foe.x : f.x) - f.x), dy = Math.abs((foe ? foe.y : f.y) - f.y);
  sc.W = bucket(span + 300, 64, 320, 640); sc.H = bucket(dy + 150, 32, 160, 352);
  sc.bx0 = Math.round(Math.min(sc.C.x, sc.F.x) - 100); sc.by0 = Math.round(Math.min(sc.C.y, sc.F.y) - 100);
  sc.bufs = takeBufs(sc.W, sc.H);
  const hk = {
    hit: p => onHit(sc, p ?? 1), knock: () => onKnock(sc), shake: k => { ENV.quake(Math.min(0.5, 0.05 + (k || 0) * 0.9)); }, flash: k => { if (sc.ult) ENV.flashW(Math.min(0.12, k || 0)); },
    dash: () => { }, hide: () => { }, warp: () => { }, cx: () => { const lx = local(sc, sc.f.x); return sc.Cc.x + (lx - sc.C.x); },
  };
  sc.e = createFull('full_' + kind, { x: sc.Fc.x, y: sc.Fc.y, type: PALO[id] || he, seed: 11 + (LIST.length * 7) % 50, C: sc.Cc, M: sc.Mc, bufs: sc.bufs, map: c => installMap(sc, c), ...hk });
  if (!sc.e) { giveBufs(sc.W, sc.H, sc.bufs); return null; }
  if (t0 > 0) { let t = 0; while (t < t0 - 1e-6) { const d = Math.min(1 / 30, t0 - t); sc.e.update(d); t += d; } sc.t = t0; }
  LIST.push(sc); return sc;
}
export const find = (f, id) => LIST.find(s => s.f === f && s.id === id && !s.dead) || null;
/* lúc tung chiêu (fire): neo đối thủ tại 1 điểm (vùng / đạn / ném bổng) hoặc tiếp tục bám */
export function fired(sc, o = {}) { if (!sc) return; sc.fired = true; if (o.at) { sc.Fpt = { x: o.at.x, y: o.at.y }; knots(sc); } if (o.fixC) sc.fixC = true; }
export function sceneTime(sc) { return sc ? sc.t - sc.wait : 0; }
/* thời gian (s, từ bây giờ) tới cú trúng chính của cảnh */
export function untilMain(sc) { if (!sc || sc.I.main < 0) return null; return Math.max(0, sc.I.hits[sc.I.main].t - sc.t) + sc.wait; }

/* ---------- hoãn sát thương tới khung trúng ---------- */
let RUN = 0;   /* > 0: đang chạy hàng đợi (hit chạy thẳng) */
export function pending(att, mvId) { if (!CODE || RUN) return null; for (const s of LIST) if (!s.dead && s.f === att && s.mv === mvId && s.fired && s.I.main >= 0 && s.hi < s.I.hits.length) return s; return null; }
export function defer(sc, fn) { sc.q.push(fn); }
function runOne(sc) { const fn = sc.q.shift(); if (!fn) return false; const ST = ENV.ST, n0 = ST.hitTry || 0, T0 = ST.timers.length; RUN++; ST.noVfx = (ST.noVfx || 0) + 1;
  try { fn(); } catch (e) { console.error('duelfx q', e); } finally { RUN--; ST.noVfx--; }
  const nw = ST.timers.splice(T0); if (nw.length) sc.q.unshift(...nw.map(t => t.fn));   /* hẹn giờ con (nhịp 2, nảy…) → nhịp sau của cảnh */
  return (ST.hitTry || 0) !== n0; }
function drain(sc, all) { let guard = 0; while (sc.q.length && guard++ < 40) { if (runOne(sc) && !all) break; } }
function feelHit(sc, p, final, noStop) {
  const foe = sc.foe, ST = ENV.ST; if (!foe || foe.dead) return;
  const near = Math.hypot(foe.x - (sc.dir > 0 ? sc.F.x : 2 * sc.P - sc.F.x), foe.y - sc.F.y) < 34; if (!near && !final) return;
  const fr = final ? 7 : p >= 1.2 ? 4 : p >= 0.7 ? 3 : 2; if (!noStop) ENV.hitstop(fr / 60);
  if (!(foe.flash > 0)) foe.tint = Math.max(foe.tint || 0, 0.12);
  ENV.quake(final ? 0.6 : Math.min(0.4, 0.08 + 0.14 * p));
  if (p >= 1.2 || final) { ring(foe.x, foe.y + 1, sc.he, final ? 46 : 32); ENV.ground(foe.x, foe.y + 1, sc.he, p, final); }
}
function onHit(sc, p) {
  const i = sc.hi++, I = sc.I, last = sc.hi >= I.hits.length;
  if (sc.hooks && sc.hooks.hit) { sc.hooks.hit(i, p, i === I.main, last); feelHit(sc, p, false, true); if (i === 0) { sc.fixF = true; sc.fixC = true; } return; }   /* tuyệt chiêu: nhịp giữa không khựng thêm (khựng dồn vào cú chốt) */
  if (i >= I.main && I.main >= 0) { drain(sc, last); }
  if (i === 0 || i === I.main) { sc.fixC = true; }   /* p52f: điểm neo đối thủ tiếp tục bám khi bị hất (hiệu ứng / tia đi theo, không kéo tới chỗ cũ) */
  feelHit(sc, p, false);
}
function onKnock(sc) { if (sc.hooks && sc.hooks.knock) sc.hooks.knock(); feelHit(sc, 1.7, true); }
function kill(sc) { if (sc.dead) return; sc.dead = true; if (sc.q.length) drain(sc, true); giveBufs(sc.W, sc.H, sc.bufs); }

export function update(dt) {
  for (const sc of LIST) {
    if (sc.dead) continue; sc.life += dt;
    if (!sc.fired && sc.act && sc.f.act !== sc.act) { sc.q.length = 0; kill(sc); continue; }   /* động tác bị ngắt trước khi tung chiêu */
    knots(sc);
    if (sc.wait > 0) { sc.wait -= dt; if (sc.wait > 0) continue; dt = -sc.wait; sc.wait = 0; }
    if (!sc.fired && sc.act && sc.t >= sc.rel - 0.02) { sc.held = (sc.held || 0) + dt; continue; }   /* chưa tung chiêu (clip chậm / bị khựng): giữ cảnh ở khung gồng, không để cú trúng của cảnh đi trước */
    sc.e.update(dt); sc.t += dt;
    if (sc.e.done() || sc.life > 5) kill(sc);
  }
  for (let i = LIST.length - 1; i >= 0; i--) if (LIST[i].dead) LIST.splice(i, 1);
  updMini(dt);
}
export function clear() { for (const sc of LIST) { sc.q.length = 0; kill(sc); } LIST.length = 0; MINI.length = 0; RINGS.length = 0; ZONES.length = 0; }
function blit(g, sc, b, cx, cy, add) {
  const r = b.r; if (!r) return; const w = r[2] - r[0] + 1, h = r[3] - r[1] + 1, lx = sc.bx0 + r[0] / RES, ly = Math.round(sc.by0 - cy) + r[1] / RES;
  if (add) { g.save(); g.globalCompositeOperation = 'lighter'; }
  if (sc.dir > 0) g.drawImage(b.cv, r[0], r[1], w, h, Math.round(sc.bx0 - cx) + r[0] / RES, ly, w / RES, h / RES);
  else { if (!add) g.save(); g.translate(Math.round(2 * sc.P - cx), 0); g.scale(-1, 1); g.drawImage(b.cv, r[0], r[1], w, h, lx, ly, w / RES, h / RES); if (!add) g.restore(); }
  if (add) g.restore();
}
/* lớp sau vẽ trước đối thủ (y đối thủ − 0,5), lớp trước sau đối thủ — luật lớp vẽ chiêu 16/10 (đối thủ ở trên → chiêu sau lưng người ra chiêu) */
export function drawables(out, g, cx, cy) {
  for (const sc of LIST) { if (sc.dead || sc.wait > 0) continue; const ky = sc.F.y;
    out.push({ y: ky - 0.5, f: () => blit(g, sc, sc.e.buf('back'), cx, cy) }, { y: ky + 0.7, f: () => blit(g, sc, sc.e.buf('front'), cx, cy) }, { y: ky + 0.8, f: () => blit(g, sc, sc.e.buf('light'), cx, cy, true) }); }
  for (const m of MINI) out.push({ y: m.ky, f: () => drawMini(g, m, cx, cy) });
  for (const z of ZONES) out.push({ y: z.y + (z.wall ? 0.6 : 0.3), f: () => drawZoneUp(g, z, cx, cy) });
}
export function active() { return LIST.filter(s => !s.dead).map(s => ({ id: s.id, kind: s.kind, t: +s.t.toFixed(2), hi: s.hi, n: s.I.hits.length, q: s.q.length, held: +(s.held || 0).toFixed(2), wait: +s.wait.toFixed(2), dir: s.dir, F: [Math.round(s.F.x), Math.round(s.F.y)] })); }

/* ---------- vẽ sẵn: chạy khô + vẽ từng khung để đóng dấu hình tĩnh trước trận (bỏ đỉnh khung đầu) ---------- */
const WARM = []; const warmed = new Set();
export function prewarm(kinds) { for (const k of kinds) if (k && !warmed.has(k) && !WARM.find(w => w.kind === k)) WARM.push({ kind: k, e: null, n: 0 }); }
export function warmTick(budgetMs = 3) {
  const t0 = performance.now(); let did = 0;
  while (WARM.length && performance.now() - t0 < budgetMs) {
    const w = WARM[0];
    if (!INFO[w.kind]) { info(w.kind); did++; continue; }
    if (!w.e) { const he = w.kind.split('_')[0], ult = w.kind.endsWith('ult'), C = ult ? { x: 52, y: 84 } : { x: 50, y: 84 }, nop = () => { }; w.bufs = takeBufs(320, 160);
      w.e = createFull('full_' + w.kind, { x: 128, y: 84, bw: 320, bh: 160, up: 100, type: he, seed: 11, C, M: { x: C.x + 8, y: C.y, z: 10 }, bufs: w.bufs, hit: nop, knock: nop, shake: nop, flash: nop, dash: nop, hide: nop, warp: nop, cx: () => C.x }); }
    w.e.update(1 / 30); w.e.buf('back'); w.n++; did++;
    if (w.e.done() || w.n > 120) { giveBufs(320, 160, w.bufs); warmed.add(w.kind); WARM.shift(); }
  }
  return did;
}
export const warmLeft = () => WARM.length;

/* ---------- hiệu ứng nhỏ vẽ code: bụi trượt, sóng xung kích trên đất, nổ (đối chưởng / trồi bóng) ---------- */
const MINI = [], RINGS = [];
const BAY = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5], bay = (x, y) => (BAY[((y & 3) << 2) | (x & 3)] + 0.5) / 16;
const DUST = ['#e8dcc0', '#c9b48f', '#9c8565', '#6e5a44'];
let SEED = 1; const rnd = () => { SEED = (SEED * 16807) % 2147483647; return (SEED - 1) / 2147483646; };
export function dust(x, y, n = 4, dirx = 0) { if (!CODE) return; for (let i = 0; i < n; i++) MINI.push({ k: 'dust', x: x + (rnd() - 0.5) * 8, y: y + (rnd() - 0.5) * 3, z: rnd() * 2, vx: dirx * 20 + (rnd() - 0.5) * 30, vz: 8 + rnd() * 14, r: 1.5 + rnd() * 1.5, t: 0, T: 0.35 + rnd() * 0.2, ky: y + 0.4, col: DUST }); }
export function boom(x, y, he, big = 1) { if (!CODE) return; const P = PAL_SRC[he] || PAL_SRC.chan;
  MINI.push({ k: 'orb', x, y, z: 8 * big, r: 9 * big, t: 0, T: 0.32, ky: y + 0.6, col: P });
  for (let i = 0; i < 14 * big; i++) { const a = rnd() * Math.PI * 2, v = (50 + rnd() * 70) * big; MINI.push({ k: 'spark', x, y, z: 8 * big, vx: Math.cos(a) * v, vy: Math.sin(a) * v * 0.45, vz: 30 + rnd() * 60, t: 0, T: 0.3 + rnd() * 0.25, ky: y + 0.6, col: P }); }
  ring(x, y + 1, he, 40 * big); }
export function burst(x, y, he, k = 0.5, ky = null, kind) { if (!CODE) return; const P = PAL_SRC[he] || PAL_SRC.chan;   /* chớp trúng nhỏ: lõi sáng nở-co + tia lửa văng (đánh thường, tê, bỏng, khiên, phản đòn) */
  MINI.push({ k: kind === 'shield' ? 'hex' : 'orb', x, y, z: 0, r: 5 * k + 2, t: 0, T: 0.2, ky: ky ?? y + 6, col: P });
  for (let i = 0; i < Math.round(10 * k); i++) { const a = rnd() * Math.PI * 2, v = 40 + rnd() * 60 * k; MINI.push({ k: 'spark', x, y, z: 0, vx: Math.cos(a) * v, vy: Math.sin(a) * v * 0.6, vz: 10 + rnd() * 30, t: 0, T: 0.18 + rnd() * 0.15, ky: ky ?? y + 6, col: P }); } }
const STEAM = ['#ffffff', '#e4eef2', '#c4d2d8', '#9aa8ae'];
export function steam(x, y) { if (!CODE) return; for (let i = 0; i < 5; i++) MINI.push({ k: 'dust', x: x + (rnd() - 0.5) * 10, y: y + (rnd() - 0.5) * 3, z: 4 + rnd() * 6, vx: (rnd() - 0.5) * 10, vz: 18 + rnd() * 12, r: 1.6 + rnd() * 1.2, t: 0, T: 0.5 + rnd() * 0.25, ky: y + 0.6, col: STEAM }); }
export function glint(x, y, he) { if (!CODE) return; const P = PAL_SRC[he] || PAL_SRC.quang; MINI.push({ k: 'orb', x, y: y + 4, z: 4, r: 3, t: 0, T: 0.16, ky: y + 12, col: P }); }   /* tụ sáng nhỏ ở miệng lúc gồng tia xuyên */
export function ring(x, y, he, R = 34) { if (!CODE) return; RINGS.push({ x, y, R, t: 0, T: 0.32, col: PAL_SRC[he] || DUST }); }
/* p52f: VÙNG BỀN vẽ code — kéo dài đúng thời gian gây sát thương (điện trường, phấn ngủ, sàn băng, tường lửa): nền dither thưa + viền đứt quay chậm + hạt bốc lên;
   hiện dần 0,2 s, mờ dần 0,4 s cuối (không chớp, không rung). Tường lửa: dãy cột lửa pixel thấp. */
const ZONES = [];
export function zone(o) { if (!CODE) return null; const z = { t: -(o.delay || 0), T: o.T - (o.delay || 0), x: o.x, y: o.y, r: o.r || 30, he: o.he, follow: o.follow || null, wall: o.wall || 0, col: PAL_SRC[o.he] || PAL_SRC.chan, acc: 0, motes: [] }; ZONES.push(z); return z; }
function zA(z) { return z.t < 0 ? 0 : Math.min(1, z.t / 0.2) * Math.min(1, (z.T - z.t) / 0.4); }
function updZoneFx(dt) {
  for (const z of ZONES) { z.t += dt; if (z.follow) { z.x = z.follow.x; z.y = z.follow.y; } if (z.t < 0) continue;
    z.acc += dt * (z.wall ? 18 : 10); while (z.acc >= 1) { z.acc -= 1; const a = rnd() * Math.PI * 2, d = Math.sqrt(rnd()); z.motes.push({ x: z.wall ? z.x + (rnd() - 0.5) * z.wall : z.x + Math.cos(a) * z.r * d, y: z.wall ? z.y + (rnd() - 0.5) * 3 : z.y + Math.sin(a) * z.r * 0.5 * d, h: 0, v: 14 + rnd() * 16, t: 0, T: 0.5 + rnd() * 0.4 }); }
    for (const m of z.motes) { m.t += dt; m.h += m.v * dt; } z.motes = z.motes.filter(m => m.t < m.T); }
  for (let i = ZONES.length - 1; i >= 0; i--) if (ZONES[i].t >= ZONES[i].T) ZONES.splice(i, 1);
}
function drawZoneFloor(g, z, cx, cy) { const a = zA(z); if (a <= 0.02) return; const P = z.col, X = (z.x - cx) * 2, Y = (z.y - cy) * 2;
  if (z.wall) { const W = z.wall * 2; for (let i = 0; i < W; i += 2) { const px = Math.round(X - W / 2 + i), py = Math.round(Y); if (0.35 * a > bay(px, py)) dot(g, px, py + 1, P[5]); } return; }
  const R = z.r * 2, RY = R * 0.5; g.fillStyle = P[4];
  for (let y = Math.floor(-RY); y <= RY; y++) for (let x = Math.floor(-R); x <= R; x++) { const d = (x * x) / (R * R) + (y * y) / (RY * RY); if (d > 1) continue; const px = Math.round(X + x), py = Math.round(Y + y); if (d > 0.86) { const an = Math.atan2(y / RY, x / R), on = ((an + z.t * 0.8) * 6 / Math.PI % 2 + 2) % 2 < 1.2; if (on && a > bay(px, py) * 0.6) dot(g, px, py, P[2]); } else if (0.16 * a > bay(px, py)) g.fillRect(px / 2, py / 2, 0.5, 0.5); }
}
function drawZoneUp(g, z, cx, cy) { const a = zA(z); if (a <= 0.02) return; const P = z.col;
  for (const m of z.motes) { const k = m.t / m.T, X = Math.round((m.x - cx) * 2), Y = Math.round((m.y - m.h - cy) * 2); if (1 - k < bay(X, Y) * 0.7 || a < bay(X + 1, Y) * 0.5) continue; const c = k < 0.3 ? P[0] : k < 0.7 ? P[1] : P[3];
    if (z.wall) { const hgt = Math.round(4 + 6 * (1 - k)); for (let q = 0; q < hgt; q++) dot(g, X, Y + q, q < 2 ? P[0] : q < 4 ? P[2] : P[4]); dot(g, X + 1, Y + 2, P[3]); } else { dot(g, X, Y, c); dot(g, X + 1, Y, c); } }
}
export const zonesNow = () => ZONES.map(z => ({ he: z.he, t: +z.t.toFixed(2), T: z.T, wall: z.wall }));
function updMini(dt) {
  for (const m of MINI) { m.t += dt; if (m.vx != null) { m.x += m.vx * dt; m.y += (m.vy || 0) * dt; m.z = Math.max(0, m.z + m.vz * dt); m.vz -= (m.k === 'spark' ? 260 : 30) * dt; m.vx *= 1 - Math.min(1, 3 * dt); } }
  for (let i = MINI.length - 1; i >= 0; i--) if (MINI[i].t >= MINI[i].T) MINI.splice(i, 1);
  updZoneFx(dt);
  for (const r of RINGS) r.t += dt; for (let i = RINGS.length - 1; i >= 0; i--) if (RINGS[i].t >= RINGS[i].T) RINGS.splice(i, 1);
}
function dot(g, X, Y, c) { g.fillStyle = c; g.fillRect(X / 2, Y / 2, 0.5, 0.5); }
function discD(g, X, Y, r, c, a = 1) { g.fillStyle = c; for (let y = Math.floor(Y - r); y <= Math.ceil(Y + r); y++) for (let x = Math.floor(X - r); x <= Math.ceil(X + r); x++) { const dx = x + 0.5 - X, dy = y + 0.5 - Y; if (dx * dx + dy * dy <= r * r && (a >= 1 || a > bay(x, y))) g.fillRect(x / 2, y / 2, 0.5, 0.5); } }
function drawMini(g, m, cx, cy) {
  const k = m.t / m.T, X = Math.round((m.x - cx) * 2), Y = Math.round((m.y - (m.z || 0) - cy) * 2);
  if (m.k === 'dust') { const r = m.r * 2 * (0.6 + k * 0.8); discD(g, X, Y, r, m.col[k < 0.4 ? 1 : 2], 1 - k * 0.9); if (k < 0.5) discD(g, X - r * 0.3, Y - r * 0.3, r * 0.5, m.col[0], 1 - k * 1.6); return; }
  if (m.k === 'orb') { const r = m.r * 2 * (k < 0.25 ? 0.5 + k * 2 : 1 - (k - 0.25) * 1.2); if (r < 1) return; discD(g, X, Y, r + 2, m.col[4], 1); discD(g, X, Y, r, m.col[2], 1); discD(g, X - r * 0.15, Y - r * 0.2, r * 0.6, m.col[0], 1); return; }
  if (m.k === 'hex') { const r = m.r * 2 * (0.6 + k * 0.8); for (let i = 0; i < 6; i++) { const a0 = i / 6 * Math.PI * 2, a1 = (i + 1) / 6 * Math.PI * 2; for (let s = 0; s <= 1; s += 0.08) { const px = Math.round(X + Math.cos(a0 + (a1 - a0) * s) * r), py = Math.round(Y + Math.sin(a0 + (a1 - a0) * s) * r); if (1 - k > bay(px, py)) dot(g, px, py, s < 0.5 ? m.col[1] : m.col[3]); } } return; }   /* khiên: lục giác sáng nở rồi tan */
  if (m.k === 'spark') { const c = k < 0.3 ? m.col[0] : k < 0.65 ? m.col[2] : m.col[4]; dot(g, X, Y, c); dot(g, X + 1, Y, c); if (k < 0.5) { dot(g, X - Math.sign(m.vx || 1), Y + 1, m.col[3]); } }
}
export function drawGround(g, cx, cy) {   /* sóng xung kích trên đất: vòng dither nở nhanh, mảnh dần rồi tắt (vẽ dưới mọi thứ) */
  for (const z of ZONES) drawZoneFloor(g, z, cx, cy);
  for (const r of RINGS) { const k = r.t / r.T, R = (6 + r.R * (1 - Math.pow(1 - k, 3))) * 2, th = Math.max(1, 4 * (1 - k)), X = (r.x - cx) * 2, Y = (r.y - cy) * 2, n = Math.max(24, Math.round(R * 1.6));
    for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a) * 0.42; for (let q = 0; q < th; q++) { const px = Math.round(X + ca * (R - q)), py = Math.round(Y + sa * (R - q)); if (1 - k * 0.8 > bay(px, py)) dot(g, px, py, q === 0 ? r.col[3] || r.col[1] : r.col[1] || r.col[0]); } } }
}

/* ---------- tia vẽ code (đối chưởng / tia xuyên / luồng phun): cột 0,5 px, dải màu theo bề dày, thon từ miệng, chớp gốc, đầu dẫn sáng ---------- */
export function codeBeam(g, he, x0, y0, x1, y1, w0, w1, cx, cy, t, o = {}) {
  const P = PAL_SRC[he] || PAL_SRC.quang, cols = he === 'nham' ? ['#fffbb0', P[1], P[2], P[4], P[6]] : ['#ffffff', P[0], P[1], P[3], P[5]];
  const L = Math.hypot(x1 - x0, y1 - y0); if (L < 1) return; const ux = (x1 - x0) / L, uy = (y1 - y0) / L, n = Math.ceil(L * 2), wave = o.wave || 0, len = o.len ?? 1;
  const bands = [[1.0, 4], [0.85, 3], [0.6, 2], [0.3, 1], [0.12, 0]];
  for (const [kb, ci] of bands) { g.fillStyle = cols[ci];
    for (let i = 0; i <= n * len; i++) { const s = i / 2, u = s / L, w = (w0 + (w1 - w0) * u) * (1 + (o.wob || 0.08) * Math.sin(s * 0.5 - t * 45)) * kb, d = wave ? Math.sin(s * 0.15 - t * 30) * wave * Math.min(1, s / 12) : 0;
      const X = x0 + ux * s - uy * d - cx, Y = y0 + uy * s + ux * d - cy, hw = Math.max(0.5, Math.round(w) / 2);
      g.fillRect(Math.round(X * 2) / 2, Math.round((Y - hw) * 2) / 2, 0.5, hw * 2); } }
  if (o.mouth !== false) { const r = Math.max(2, w0 * 2.2 + 1.5 * Math.sin(t * 40)); discD(g, Math.round((x0 - cx) * 2), Math.round((y0 - cy) * 2), r + 1.5, cols[3]); discD(g, Math.round((x0 - cx) * 2), Math.round((y0 - cy) * 2), r, cols[1]); discD(g, Math.round((x0 - cx) * 2), Math.round((y0 - cy) * 2), r * 0.55, cols[0]); }
  if (o.head) { const hx = x0 + ux * L * len, hy = y0 + uy * L * len, r = w1 * 1.3 + 1.5 * Math.sin(t * 50); discD(g, Math.round((hx - cx) * 2), Math.round((hy - cy) * 2), r + 1.5, cols[3]); discD(g, Math.round((hx - cx) * 2), Math.round((hy - cy) * 2), r, cols[1]); discD(g, Math.round((hx - cx) * 2), Math.round((hy - cy) * 2), r * 0.55, cols[0]); }
}
/* nổ ở điểm va đối chưởng: lõi sáng phập phồng + tia toả (chỉ trong lúc giằng co) */
export function clashBurst(g, he1, he2, x, y, cx, cy, t, pw = 0.5) {   /* p79: điểm va mới (clash79.js) — &clash79=o giữ bản cũ để so */
  if (clashVar79() !== 'o') return clash79(g, PAL_SRC[he1] || PAL_SRC.quang, PAL_SRC[he2] || PAL_SRC.nham, x, y, cx, cy, t, pw, bay);
  const A = PAL_SRC[he1] || PAL_SRC.quang, B = PAL_SRC[he2] || PAL_SRC.nham, X = Math.round((x - cx) * 2), Y = Math.round((y - cy) * 2), r = 9 + 2 * Math.sin(t * 37) + Math.sin(t * 23);
  for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2 + t * 5, l = r * (1.8 + 0.5 * Math.sin(t * 30 + i)); g.fillStyle = (i % 2 ? A : B)[1]; for (let s = r * 0.6; s < l; s += 1) g.fillRect(Math.round(X + Math.cos(a) * s) / 2, Math.round(Y + Math.sin(a) * s * 0.7) / 2, 0.5, 0.5); }
  discD(g, X, Y, r + 2, B[4]); discD(g, X, Y, r, A[2]); discD(g, X, Y, r * 0.6, A[0]); discD(g, X, Y, r * 0.3, '#ffffff');
}
export const _dbg = { INFO, POOL, LIST };
