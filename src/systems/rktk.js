// rktk.js — plan-90 DẠNG SIÊU MẠNH: Rocky Nguyên Bản (golem khối đá rời) + 6 chiêu riêng. pet.js gọi (không đăng ký ở index.js).
// Cách có: Rocky cấp 50 + Siêu Cấp bậc ≥ 4 → mỗi lần biến Siêu Cấp thì thành Nguyên Bản (cùng đồng hồ superT / superCd, hết giờ về dáng thường).
// Chiêu (chỉ trong dạng này, AI tự dùng, thay Đấm / Rocky-ha): fist Nắm Đấm Đá Bay · quake Địa Chấn Khối · storm Tách Khối Bão Đá ·
// shield Khiên Ngực Seismic · dash Lao Thạch Cự · ult Tái Hợp Nguyên Bản (1 lần / lần biến).
// VFX vẽ code hoàn toàn (skill vfx-code): khối đá pixel theo bảng màu đo từ sprite Rocky, mờ bằng dither Bayer 4×4 (không alpha), vẽ theo lớp chiều sâu.
import * as LV from './petlv.js';
import * as S113 from './scenes113.js'; import { chuong as chuong115 } from './chuong115.js';   /* p115: Chưởng Lửa */ import { inst as inst113, CFG113 } from './pxfx113.js';   /* p114fx: Nắm Đấm Đá Bay cách pixelfx */
try { if (new URLSearchParams(location.search).get('fx113') === '0') CFG113.on = false; } catch (e) { }
const FX113 = [];   /* [{ I, y() }] */
const add113 = (sc, y) => { const I = inst113(sc); FX113.push({ I, y }); return I; };

export const POWER_LV = 50, POWER_TIER = 4;
export const SK = {
  fist: { cd: 2.5, mul: 2.4, range: 150, vi: 'Nắm Đấm Đá Bay', en: 'Flying Rock Fist' },
  quake: { cd: 7, mul: 2.0, r: 68.9, vi: 'Địa Chấn Khối', en: 'Block Quake' },
  storm: { cd: 12, mul: 1.6, tick: 0.5, r: 100, vi: 'Tách Khối Bão Đá', en: 'Rockstorm Split' },
  shield: { cd: 14, dur: 2.5, cut: 0.8, refl: 1.5, vi: 'Khiên Ngực Seismic', en: 'Seismic Chest Shield' },
  dash: { cd: 8, mul: 2.2, len: 120, vi: 'Lao Thạch Cự', en: 'Boulder Charge' },
  ult: { cd: 22, mul: 6, r: 80, vi: 'Nắm Đấm Đá Khổng Lồ', en: 'Giant Stone Fist' },
};
SK.chuong = { cd: 9, mul: 0.35, boom: 1.6, range: 120, vi: 'Chưởng Lửa', en: 'Flame Palm' };   /* p115: chiêu 7 (anh 03/11) — trúng nhiều nhịp theo luồng + nổ ở đích */
export const SK_IDS = ['fist', 'quake', 'storm', 'shield', 'dash', 'ult', 'chuong'];
const TXT = { vi: { on: n => `⚡ ${n.toUpperCase()} NGUYÊN BẢN!`, off: n => `${n} trở lại dạng thường`, form: 'Rocky Nguyên Bản', how: 'Mở ở Rocky cấp 50 + Siêu Cấp bậc 4: biến Siêu Cấp thành Rocky Nguyên Bản, dùng 6 chiêu riêng.' },
  en: { on: n => `⚡ ORIGINAL ${n.toUpperCase()}!`, off: n => `${n} is back to normal`, form: 'Rocky Original', how: 'Unlocks at Rocky Lv 50 + Super tier 4: Super turns into Rocky Original with 6 skills of its own.' } };
export const txt = ctx => TXT[ctx.lang && ctx.lang() === 'vi' ? 'vi' : 'en'];
export const skName = (ctx, id) => SK[id][ctx.lang && ctx.lang() === 'vi' ? 'vi' : 'en'];

const lvOf = pt => LV.levelFromXp(pt.xp || 0).lv;
export const active = pt => !!pt && !!pt.golem && !((pt.koT || 0) > 0);   /* anh 02/11: golem đá = ROCKY thật (Chấn Thú) — luôn dùng 6 chiêu; cách nhận do plan-102 */
export const power = active;
export const ORIGIN = { s: [0, -10.8], e: [14, -22.6], n: [0, -17.2] };   /* plan-90 cỡ = Elyziuma (K 1.077) */   /* gốc chiêu đo ở khung bắn: 2 bàn tay chụm (S), nắm tay vươn (E), trên vai (N) — px logic so với chân */
export function originOf(e, ang) { const c = Math.cos(ang), s = Math.sin(ang), K = Math.abs(c) >= Math.abs(s) * 0.9 ? 'e' : s > 0 ? 's' : 'n', o = ORIGIN[K]; return { x: e.x + o[0] * (K === 'e' && c < 0 ? -1 : 1), y: e.y + o[1] }; }
export const MUL = { atk: 2.0, def: 1.8, spd: 1.3 };   /* chỉ số golem so với Rocky cùng cấp (≈ Siêu Cấp bậc 4) */

/* bảng màu đo từ rockytk_idle_s_0 (nâu 6 bậc + viền) + ánh logo ngực */
const C = { out: '#0c0503', d0: '#2a1c10', d1: '#4c3421', d2: '#573e28', m: '#6b492d', l1: '#7d5e44', l2: '#ab8968', hi: '#cfb08e', glow: '#ffe9b0', glow2: '#f2c86a', dust: '#b39a7c', dust2: '#8a7258' };
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const dith = (x, y, a) => a >= 1 || (a > 0 && (BAYER[((y & 3) << 2) | (x & 3)] + 0.5) / 16 < a);   /* có vẽ ô (x, y) ở độ đậm a không */
function px(g, x, y, w, h, c) { g.fillStyle = c; g.fillRect(Math.round(x * 2) / 2, Math.round(y * 2) / 2, w, h); }
/* một khối đá: s = cạnh (px logic), mặt trên sáng, cạnh dưới tối, viền đen; a = độ đậm (dither theo ô 0,5 px) */
function block(g, x, y, s, a = 1, shade = 0) {
  x = Math.round(x * 2) / 2; y = Math.round(y * 2) / 2; const top = [C.l2, C.l1, C.m][shade] || C.l1, mid = [C.m, C.d2, C.d1][shade] || C.d2, bot = [C.d1, C.d0, C.d0][shade] || C.d0;
  if (a >= 1) { px(g, x - 0.5, y - 0.5, s + 1, s + 1, C.out); px(g, x, y, s, s, mid); px(g, x, y, s, Math.max(1, s * 0.35), top); px(g, x, y + s - Math.max(0.5, s * 0.25), s, Math.max(0.5, s * 0.25), bot); if (s >= 3) px(g, x + 0.5, y + 0.5, 1, 0.5, C.hi); return; }
  for (let i = 0; i < s * 2; i++) for (let j = 0; j < s * 2; j++) if (dith(Math.round(x * 2) + i, Math.round(y * 2) + j, a)) px(g, x + i / 2, y + j / 2, 0.5, 0.5, j < s * 0.7 ? top : mid);
}

/* ---------------- trạng thái ---------------- */
const T = { cd: {}, cast: null, proj: [], orbit: null, shield: null, parts: [], cracks: [], rings: [], ult: null, ultUsed: false, formT: 0, stopUntil: 0, stopOn: false, log: [], stats: {} };
let rng = 1; const R = () => ((rng = (rng * 16807) % 2147483647) / 2147483647);
export function begin(pt) { T.ultUsed = false; T.formT = 0; for (const k of SK_IDS) T.cd[k] = k === 'ult' ? 0 : 0.6 + SK_IDS.indexOf(k) * 0.4; rng = 7; }
export function end(e) { T.cast = null; T.orbit = null; T.shield = null; if (e) e.tkPose = null; }
export function reset() { T.cast = null; T.proj.length = 0; T.orbit = null; T.shield = null; T.parts.length = 0; T.cracks.length = 0; T.rings.length = 0; T.ult = null; }
export function debug() { return { cd: { ...T.cd }, cast: T.cast && T.cast.id, proj: T.proj.length, orbit: !!T.orbit, shield: !!T.shield, ult: T.ult && T.ult.ph, ultUsed: T.ultUsed, formT: +T.formT.toFixed(1), log: T.log.slice(-40), stats: { ...T.stats } }; }
const mark = id => { T.stats[id] = (T.stats[id] || 0) + 1; T.log.push(id); if (T.log.length > 80) T.log.shift(); };

function hitStop(ctx, ms) {   /* dừng hình theo sức: chỉ khi không có cảnh chậm khác */
  if (!ctx.S || ctx.S.mode !== 'play' || (ctx.S.timeScale ?? 1) !== 1) return; T.stopUntil = performance.now() + ms; T.stopOn = true; ctx.S.timeScale = 0.05;
  setTimeout(() => { if (T.stopOn && performance.now() >= T.stopUntil - 5) { T.stopOn = false; if (ctx.S && ctx.S.timeScale === 0.05) ctx.S.timeScale = 1; } }, ms + 30);   /* c2-raloi hitStop: tự trả 1 kể cả khi update không còn chạy */
}
const dst = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const isBoss = mo => !!(mo.c && mo.c.boss);
/* hất: quái thường bay theo hướng (vx, vy) — dùng mo.kb của monsters.js (dừng ở vật cứng do monsters.js kiểm walkable); trùm không hất */
function fling(mo, vx, vy, sp, t = 0.28) { if (isBoss(mo)) return; const l = Math.hypot(vx, vy) || 1; mo.kb = { vx: vx / l * sp, vy: vy / l * sp, t }; }
function chips(x, y, n, sp = 60, up = 50, big = 0) { for (let i = 0; i < n; i++) { const a = R() * Math.PI * 2, v = sp * (0.4 + R() * 0.8); T.parts.push({ k: 'chip', x, y, z: 2 + R() * 4, vx: Math.cos(a) * v, vy: Math.sin(a) * v * 0.6, vz: up * (0.6 + R() * 0.8), s: big ? 2 + (R() * 2 | 0) : 1 + (R() < 0.4 ? 0.5 : 0), t: 0, life: 0.7 + R() * 0.5, sh: R() * 3 | 0 }); } }
function puff(x, y, n, r = 6) { for (let i = 0; i < n; i++) { const a = R() * Math.PI * 2; T.parts.push({ k: 'dust', x: x + Math.cos(a) * r * R(), y: y + Math.sin(a) * r * 0.5 * R(), vx: Math.cos(a) * 18, vy: Math.sin(a) * 8, t: 0, life: 0.45 + R() * 0.35, s: 2 + R() * 2 }); } }
function crack(x, y, r, life = 2.2) { const arms = []; const n = 6 + (r > 40 ? 4 : 0); for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2 + R() * 0.4; let px0 = 0, py0 = 0; const seg = []; const L = r * (0.3 + R() * 0.35); let da = 0; for (let k = 0; k < L; k += 0.5) { if (k % 4 < 0.5) da = (R() - 0.5) * 0.9; px0 += Math.cos(a + da) * 0.5; py0 += Math.sin(a + da) * 0.3; seg.push([px0, py0]); }   /* nét nứt liền (bước 0,5 px), ngắn, gấp khúc mỗi 4 px */ arms.push(seg); } T.cracks.push({ x, y, arms, t: 0, life }); }

/* ---------------- AI: chọn chiêu ---------------- */
const air = mo => !!(mo && mo.c && mo.c.fly), wet = mo => !!(mo && mo.c && mo.c.aqua);   /* quái bay / dưới nước: chỉ Nắm Đấm Bay, Bão Đá, Tái Hợp với tới; Địa Chấn chỉ trúng quái trên đất */
export function tick(ctx, pt, e, tg, pool, dt, H) {
  if (!active(pt)) return false;
  if (T.cast) { castTick(ctx, pt, e, dt, H); return true; }
  if (!tg || !pool.length) return false;
  const st = H.stats(pt), d = dst(tg, e), near = r => pool.filter(mo => dst(mo, e) < r + (isBoss(mo) ? 16 : 0)), boss = pool.some(isBoss);
  const ready = id => !(T.cd[id] > 0);
  let pick = null;
  if (ready('ult') && T.formT > 3 && (boss || near(90).length >= 4)) pick = 'ult';
  else if (ready('shield') && !T.shield && ((pt.hp / st.max < 0.6 && near(60).length) || (boss && d < 80) || near(48).length >= 2)) pick = 'shield';
  else if (ready('storm') && !T.orbit && near(SK.storm.r).length >= 3) pick = 'storm';
  else if (ready('quake') && !air(tg) && (near(56).filter(g => !air(g)).length >= 2 || d <= 30)) pick = 'quake';
  else if (ready('dash') && !air(tg) && !wet(tg) && d > 50 && d < SK.dash.len) pick = 'dash';
  else if (ready('chuong') && !air(tg) && d > 26 && d < SK.chuong.range) pick = 'chuong';   /* p115 */
  else if (ready('fist') && (d > 40 || air(tg) || wet(tg)) && d < SK.fist.range && !T.proj.some(q => q.k === 'fist')) pick = 'fist';
  if (!pick) return false;
  start(ctx, pt, e, pick, tg, H); return true;
}
export function force(ctx, pt, e, id, tg, H) { if (!active(pt) || !tg) return false; if (T.cast) { T.cast = null; } T.cd[id] = 0; if (id === 'ult') T.ultUsed = false; start(ctx, pt, e, id, tg, H); return true; }   /* test: ép 1 chiêu */
const CAST = { fist: 0.42, quake: 0.8, storm: 0.45, shield: 0.4, dash: 0.62, ult: 2.3, chuong: 1.35 };
function start(ctx, pt, e, id, tg, H) {
  e.moving = false; e.sit = false; H.face8(e, tg.x - e.x, tg.y - e.y, false);
  T.cast = { id, t: 0, tg, ang: Math.atan2((tg.y - 4) - (e.y - 12.9), tg.x - e.x), fired: false, hit: new Set(), x0: e.x, y0: e.y };
  T.cd[id] = SK[id].cd;
  mark(id); if (ctx.pop) ctx.pop(e.x, e.y - 36.6, skName(ctx, id), '#ffd45e');
  if (id === 'fist' && CFG113.on) add113(S113.fistWind(() => H.origin(pt, e, T.cast ? T.cast.ang : 0)), () => e.y + 0.6);   /* p114fx: gồng ở nắm tay */
  if (id === 'ult') { const t0 = tg; T.ult = { ph: 'gather', t: 0, x: t0.x, y: t0.y, blocks: [] }; for (let i = 0; i < 22; i++) { const a = R() * Math.PI * 2, rr = 120 + R() * 80; T.ult.blocks.push({ sx: t0.x + Math.cos(a) * rr, sy: t0.y + Math.sin(a) * rr * 0.6 - 20, d: R() * 0.35, s: 2 + (R() * 3 | 0), ox: 0, oy: 0, sh: R() * 3 | 0 }); } fistShape(T.ult); }
  if (!(globalThis.__sfx108 && globalThis.__sfx108.at(ctx, id === 'chuong' ? 'beam_fire' : 'rk_' + id + '_cast', e.x, e.y))) ctx.sfx && ctx.sfx(id === 'ult' ? 'win' : 'rocky_happy');   /* p108 */
}
function castTick(ctx, pt, e, dt, H) {
  const c = T.cast, a = H.atk(pt), S = SK[c.id]; c.t += dt; const tg = c.tg, mons = H.mons();
  const pose = (clip, prog) => { e.tkPose = { clip, fb: clip === 'ha' ? 'ha' : 'punch', prog: Math.max(0, Math.min(1, prog)) }; };
  if (c.id === 'fist') {
    pose('punch', c.t / 0.3);
    if (!c.fired && c.t >= 0.16) { c.fired = true; const o = H.origin(pt, e, c.ang); T.proj.push({ k: 'fist', x: o.x, y: o.y, ox: o.x - e.x, oy: o.y - e.y, ang: c.ang, d: 0, back: false, hits: new Set(), n: 0 }); if (CFG113.on) { const q = T.proj[T.proj.length - 1]; add113(S113.fistTrail(q, () => T.proj.includes(q)), () => q.y + 9.5); } else H.dust(o.x, o.y + 6, 3); if (!globalThis.__sfx108) ctx.sfx && ctx.sfx('hit'); }
  } else if (c.id === 'quake') {
    pose('stomp', c.t / 0.65);   /* p115: nhảy dậm 2 tay — khung chạm 5 ≈ 0,36 s */ if (c.t < 0.3) e.hop = 0.45;
    if (!c.fired && c.t >= 0.36) { c.fired = true; T.rings.push({ x: e.x, y: e.y + 1, r: 4, max: S.r, t: 0, hit: new Set(), a }); crack(e.x, e.y + 1, S.r * 0.8); chips(e.x, e.y, 14, 70, 70, 1); puff(e.x, e.y, 10, 10); H.quake(0.3); hitStop(ctx, 60); if (!(globalThis.__sfx108 && globalThis.__sfx108.at(ctx, 'rk_quake_hit', e.x, e.y))) ctx.sfx && ctx.sfx('smash'); }
  } else if (c.id === 'storm') {
    pose('raise', c.t / 0.45);   /* p115: giơ 2 tay triệu đá */
    if (!c.fired && c.t >= 0.3) { c.fired = true; T.orbit = { t: 0, dur: 2.0, n: 6, tickT: 0, fired: false, a }; chips(e.x, e.y - 15.1, 6, 40, 30); if (!globalThis.__sfx108) ctx.sfx && ctx.sfx('boom'); }
  } else if (c.id === 'shield') {
    pose('guard', Math.min(1, c.t / 0.3));   /* p115: khoanh tay chắn ngực */
    if (!c.fired && c.t >= 0.25) { c.fired = true; T.shield = { t: 0, dur: S.dur, flash: 0.12, hits: 0 }; ctx.sfx && ctx.sfx('rocky_happy');   /* khiên bật: sóng đẩy quái sát người ra (×1,0) */
      for (const mo of mons) if (dst(mo, e) < 47.4 + (isBoss(mo) ? 12 : 0)) { H.deal(mo, a * 1.0, 0); fling(mo, mo.x - e.x, mo.y - e.y, 190, 0.22); chips(mo.x, mo.y - 6, 4, 50, 30); } T.rings.push({ x: e.x, y: e.y - 2, r: 4, max: 40, t: 0, hit: null, small: true }); }
  } else if (c.id === 'dash') {
    if (c.t < 0.22) { pose('punch', 0.15); e.lean = -1; }
    else if (c.t < 0.52) {   /* lao 120 px trong 0,3 s, dừng ở vật cứng đầu tiên */
      pose('punch', 0.75); const sp = S.len / 0.3, vx = Math.cos(c.ang), vy = Math.sin(c.ang); if (!c.stop) { const n = 4; for (let i = 0; i < n; i++) { const nx = e.x + vx * sp * dt / n, ny = e.y + vy * sp * dt / n; if (!H.passable(nx, ny)) { c.stop = true; H.quake(0.18); chips(e.x + vx * 8, e.y - 6, 8, 60, 40, 1); break; } e.x = nx; e.y = ny; } }
      if (R() < 0.8) T.parts.push({ k: 'dust', x: e.x - vx * 8 + (R() - 0.5) * 8, y: e.y + 1, vx: -vx * 20, vy: -vy * 8, t: 0, life: 0.5, s: 3 + R() * 2 });
      for (const mo of mons) { if (c.hit.has(mo)) continue; const dx = mo.x - e.x, dy = mo.y - e.y; if (Math.hypot(dx, dy) < 17.2 + (isBoss(mo) ? 14 : 0)) { c.hit.add(mo); H.deal(mo, a * S.mul, 0); (globalThis.__sfx108 && globalThis.__sfx108.at(ctx, 'rk_dash_hit', mo.x, mo.y)); const side = (dx * vy - dy * vx) >= 0 ? 1 : -1; fling(mo, vx * 1.0 + -vy * side * 0.8, vy * 1.0 + vx * side * 0.8, 260, 0.32); chips(mo.x, mo.y - 6, 8, 70, 50); hitStop(ctx, 45); H.quake(0.15); } }
    } else { pose('punch', 1); e.lean = 0; if (!c.fired) { c.fired = true; puff(e.x, e.y, 8, 8); } }
  } else if (c.id === 'chuong') {   /* p115: kéo tay về (khung 0–5) → đẩy 2 tay giữ (6–8) lúc phun → thu về */
    const W0 = 0.26, E0 = W0 + 0.95; pose('palm', c.t < W0 ? c.t / W0 * 0.62 : c.t < E0 ? 0.67 + 0.3 * ((c.t * 8) % 1) : Math.max(0, 0.62 - (c.t - E0) * 4));
    if (!c.fired) { c.fired = true; startChuong(ctx, pt, e, c, H); }
  } else if (c.id === 'ult') { const t = c.t; pose('smash', t < 1.25 ? 0.15 + 0.3 * t / 1.25 : t < 1.75 ? 0.45 + 0.15 * (t - 1.25) / 0.5 : 0.62 + 0.36 * Math.min(1, (t - 1.75) / 0.5)); }   /* p115: giơ nắm đấm khi gom khối → đập trúng ở 1,75 s */
  if (c.t >= CAST[c.id]) { T.cast = null; e.tkPose = null; e.lean = 0; }
}

/* p115: Chưởng Lửa — luồng lưỡi lửa pixel phun từ 2 lòng bàn tay (chuong115 bản a). Gồng: tụ trước ngực; phun: lòng bàn tay.
   Lớp vẽ theo luật chiêu: bắn LÊN → chiêu sau người ra chiêu (y + 0,5); bắn XUỐNG → chiêu trước (y − 0,5). */
function startChuong(ctx, pt, e, c, H) {
  const a = H.atk(pt), tg = c.tg, ca0 = Math.cos(c.ang), sa0 = Math.sin(c.ang); let last = { x: tg.x, y: tg.y - 8 };
  const PALM = { s: [0, -10], se: [16, -16], e: [17, -23], ne: [15, -25], n: [0, -25] }, sec = Math.round(Math.atan2(sa0, ca0) / (Math.PI / 4)), K8 = ['e', 'se', 's', 'se', 'e', 'ne', 'n', 'ne'][(sec + 8) % 8], mx = ca0 < -0.01 ? -1 : 1;   /* p115b: gốc = bàn tay khung đẩy theo 8 hướng (W lật gương; đo clip push_mm khung 7 × K) */
  const org = () => { const P = PALM[K8], w = T.cast === c && c.t < 0.26; return w ? { x: e.x + P[0] * mx * 0.5, y: e.y + P[1] * 0.85 + 2 } : { x: e.x + P[0] * mx + ca0 * 2, y: e.y + P[1] + sa0 * 2 }; };
  const aim = () => { if (tg && H.mons().includes(tg)) last = { x: tg.x, y: tg.y - 8 }; return last; };
  const onHit = h => { const o = org(), q = aim(), A = Math.atan2(q.y - o.y, q.x - o.x), ca = Math.cos(A), sa = Math.sin(A);
    for (const mo of H.mons()) { const dx = mo.x - o.x, dy = mo.y - 6 - o.y, al = dx * ca + dy * sa, pe = Math.abs(-dx * sa + dy * ca);
      const hit = h.k === 'tick' ? (al > 0 && al < SK.chuong.range + 10 && pe < 8 + al * 0.2 + (isBoss(mo) ? 10 : 0)) : Math.hypot(mo.x - q.x, mo.y - 8 - q.y) < 22 + (isBoss(mo) ? 12 : 0);
      if (!hit) continue; H.deal(mo, a * (h.k === 'tick' ? SK.chuong.mul : SK.chuong.boom), 0); fling(mo, ca, sa, h.push * 2, 0.15); }
    if (h.stop) hitStop(ctx, h.stop * 1000); if (h.shake) H.quake(0.04 * h.shake); if (h.k === 'boom') chips(q.x, q.y + 6, 6, 60, 40); };
  add113(chuong115(org, aim, { v: 'a', gy: e.y, onHit }), () => e.y + (sa0 < -0.05 ? -0.5 : 0.5));   /* p115b: bắn LÊN → chưởng sau lưng; ngang / XUỐNG → chưởng đè lên golem */
}
/* nắm đấm khổng lồ ghép từ khối (toạ độ khối so với tâm nắm đấm) */
function fistShape(U) {
  const cells = []; const W = 9, H = 7;   /* lưới 9×7 ô 3 px: 4 ngón trên, mu bàn tay, ngón cái bên trái */
  const M = ['.XXXXXXX.', 'XXXXXXXXX', 'XXXXXXXXX', 'XXXXXXXXX', 'TXXXXXXXX', 'TTXXXXXX.', '.TXXXXX..'];
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) if (M[j][i] !== '.') cells.push({ ox: (i - W / 2) * 3.2, oy: (j - H / 2) * 3.2, sh: M[j][i] === 'T' ? 1 : j === 0 ? 0 : (i + j) % 3 === 0 ? 1 : 0, knuckle: j === 0 || (j === 1 && i % 2 === 1) });
  U.cells = cells; U.blocks.forEach((b, i) => { const cl = cells[i % cells.length]; b.ox = cl.ox; b.oy = cl.oy; });
}

/* ---------------- cập nhật mỗi khung (kể cả lúc không đánh) ---------------- */
export function update(ctx, dt, H) {
  for (let i = FX113.length - 1; i >= 0; i--) { FX113[i].I.update(dt); if (FX113[i].I.done) FX113.splice(i, 1); }   /* p114fx */
  T.ref = { ctx, H };
  if (T.stopOn && performance.now() >= T.stopUntil) { T.stopOn = false; if (ctx.S.timeScale === 0.05) ctx.S.timeScale = 1; }
  const pt = H.pet(), e = H.ent(); if (!e || !pt) { reset(); return; }
  if (active(pt)) { if (!T.began) { begin(pt); T.began = true; } T.formT += dt; } else T.began = false;
  for (const k of SK_IDS) if (T.cd[k] > 0) T.cd[k] -= dt;
  if (!active(pt) && (T.cast || T.orbit || T.shield)) end(e);
  if (T.cast && !active(pt)) T.cast = null;
  if (T.cast) { T.cast.age = (T.cast.age || 0) + dt; if (T.cast.age > CAST[T.cast.id] + 0.6) { T.cast = null; e.tkPose = null; e.lean = 0; } }   /* không kẹt dáng nếu combatTick ngừng gọi */
  const a = active(pt) ? H.atk(pt) : 0, mons = H.mons();
  /* nắm đấm bay */
  for (let i = T.proj.length - 1; i >= 0; i--) { const q = T.proj[i];
    if (q.k === 'fist') {
      if (!q.back) { const sp = 300 * dt; q.d += sp; q.x += Math.cos(q.ang) * sp; q.y += Math.sin(q.ang) * sp;
        if (!H.passable(q.x, q.y + 10)) { q.back = true; chips(q.x, q.y, 6, 50, 40); H.quake(0.08); }
        for (const mo of mons) { if (q.hits.has(mo)) continue; if (Math.hypot(mo.x - q.x, mo.y - 6 - q.y) < 10 + (isBoss(mo) ? 12 : 0)) { q.hits.add(mo); q.n++; H.deal(mo, a * SK.fist.mul, 0); (globalThis.__sfx108 && globalThis.__sfx108.at(ctx, 'rk_fist_hit', q.x, q.y)); fling(mo, Math.cos(q.ang), Math.sin(q.ang), 150, 0.18); if (CFG113.on) { const my = mo.y; add113(S113.fistImpact(q.x, q.y, my, q.ang), () => my + 1); hitStop(ctx, 60); } else { chips(q.x, q.y, 8, 70, 40); T.rings.push({ x: q.x, y: q.y + 4, r: 2, max: 12, t: 0, hit: null, small: true }); hitStop(ctx, 35); } ctx.sfx && ctx.sfx('hit'); if (q.n >= 2) q.back = true; } }
        if (q.d >= SK.fist.range) q.back = true;
      } else { const hx = e.x + q.ox * (e.dir < 0 && Math.abs(q.ox) > 2 ? -1 : 1), hy = e.y + q.oy, dx = hx - q.x, dy = hy - q.y, l = Math.hypot(dx, dy); if (l < 8) { T.proj.splice(i, 1); continue; } q.ang = Math.atan2(-dy, -dx); const sp = Math.min(l, 340 * dt); q.x += dx / l * sp; q.y += dy / l * sp; }
      if (R() < 0.6) T.parts.push({ k: 'chip', x: q.x - Math.cos(q.ang) * 4, y: q.y, z: 0, vx: -Math.cos(q.ang) * 20, vy: 0, vz: 10, s: 0.5, t: 0, life: 0.35, sh: 1 });
    } else if (q.k === 'shard') {   /* khối bão đá bắn ra */
      q.t += dt; const tx = q.tg.x, ty = q.tg.y - 6, dx = tx - q.x, dy = ty - q.y, l = Math.hypot(dx, dy); const sp = 320 * dt;
      if (l < 6 || q.t > 0.8) { if (mons.includes(q.tg)) { H.deal(q.tg, q.a * SK.storm.mul, 0); (globalThis.__sfx108 && globalThis.__sfx108.at(ctx, 'rk_storm_hit', q.x, q.y)); fling(q.tg, dx, dy, 170, 0.22); } chips(q.x, q.y, 9, 70, 50, 1); hitStop(ctx, 25); T.proj.splice(i, 1); continue; }
      q.x += dx / l * sp; q.y += dy / l * sp; q.ang = Math.atan2(dy, dx);
    }
  }
  /* khối quay quanh */
  if (T.orbit) { const O = T.orbit; O.t += dt; O.tickT -= dt;
    if (O.t < O.dur && O.tickT <= 0) { O.tickT = 0.3; for (let i = 0; i < O.n; i++) { const p = orbitPos(e, O, i); for (const mo of mons) if (Math.hypot(mo.x - p.x, mo.y - 6 - p.y) < 9) { H.deal(mo, O.a * SK.storm.tick, 0); fling(mo, mo.x - e.x, mo.y - e.y, 90, 0.12); chips(p.x, p.y, 3, 40, 30); } } }
    if (O.t >= O.dur && !O.fired) { O.fired = true; const ts = mons.slice().sort((m1, m2) => dst(m1, e) - dst(m2, e)).filter(mo => dst(mo, e) < 130);
      for (let i = 0; i < O.n; i++) { const p = orbitPos(e, O, i), tg = ts[i % Math.max(1, ts.length)]; if (tg) T.proj.push({ k: 'shard', x: p.x, y: p.y, tg, a: O.a, t: 0, s: 3 + (i % 2), ang: 0 }); else chips(p.x, p.y, 4, 40, 40); }
      T.orbit = null; if (!(globalThis.__sfx108 && globalThis.__sfx108.at(ctx, 'rk_storm_fire', e.x, e.y))) ctx.sfx && ctx.sfx('boom'); H.quake(0.12); }
  }
  if (T.shield) { T.shield.t += dt; if (T.shield.flash > 0) T.shield.flash -= dt; if (T.shield.t >= T.shield.dur) { chips(e.x + (e.dir || 1) * 8.6, e.y - 15.1, 8, 40, 30); T.shield = null; } }
  /* vòng địa chấn */
  for (let i = T.rings.length - 1; i >= 0; i--) { const r = T.rings[i]; r.t += dt; r.r = r.small ? 2 + r.t * 60 : 4 + (r.max - 4) * Math.min(1, r.t / 0.5);
    if (r.hit) { for (const mo of mons) if (!r.hit.has(mo) && !air(mo) && Math.hypot((mo.x - r.x), (mo.y - r.y) * 1.6) < r.r + 4 + (isBoss(mo) ? 14 : 0)) { r.hit.add(mo); if (r.a) H.deal(mo, r.a * SK.quake.mul, 0); fling(mo, mo.x - r.x, mo.y - r.y, 240, 0.3); chips(mo.x, mo.y, 6, 60, 60); }
      if (r.t < 0.5 && R() < 0.9) { const an = R() * Math.PI * 2; T.parts.push({ k: 'spike', x: r.x + Math.cos(an) * r.r, y: r.y + Math.sin(an) * r.r * 0.55, t: 0, life: 0.5, s: 2 + (R() * 2 | 0), sh: R() * 3 | 0 }); } }
    if (r.t > (r.small ? 0.2 : 0.65)) T.rings.splice(i, 1); }
  /* tuyệt chiêu */
  if (T.ult) { const U = T.ult; U.t += dt; const tg = T.cast && T.cast.id === 'ult' ? T.cast.tg : null; if (tg && mons.includes(tg)) { U.x += (tg.x - U.x) * Math.min(1, dt * 3); U.y += (tg.y - U.y) * Math.min(1, dt * 3); }
    if (U.ph === 'gather' && U.t >= 1.25) { U.ph = 'raise'; U.t2 = 0; ctx.sfx && ctx.sfx('boom'); }
    if (U.ph === 'raise') { U.t2 += dt; if (U.t2 >= 0.3) { U.ph = 'slam'; U.t3 = 0; } }
    if (U.ph === 'slam') { U.t3 += dt; if (U.t3 >= 0.2) { U.ph = 'crumble'; U.t4 = 0;
      for (const mo of mons) { const dd = Math.hypot(mo.x - U.x, (mo.y - U.y) * 1.4); if (dd < SK.ult.r + (isBoss(mo) ? 18 : 0)) { H.deal(mo, a * SK.ult.mul, 0); fling(mo, mo.x - U.x, mo.y - U.y, 300, 0.4); } }
      crack(U.x, U.y, SK.ult.r, 3.2); T.rings.push({ x: U.x, y: U.y, r: 6, max: SK.ult.r, t: 0, hit: new Set(), a: 0 }); chips(U.x, U.y - 4, 30, 110, 90, 1); puff(U.x, U.y, 18, 22); H.quake(0.5); hitStop(ctx, 120); if (!(globalThis.__sfx108 && globalThis.__sfx108.at(ctx, 'rk_ult_hit', U.x, U.y))) ctx.sfx && ctx.sfx('smash'); } }
    if (U.ph === 'crumble') { U.t4 += dt; if (U.t4 > 0.7) T.ult = null; }
  }
  /* hạt */
  for (let i = T.parts.length - 1; i >= 0; i--) { const p = T.parts[i]; p.t += dt; if (p.t >= p.life) { T.parts.splice(i, 1); continue; }
    if (p.k === 'chip') { p.x += p.vx * dt; p.y += p.vy * dt; p.vz -= 260 * dt; p.z += p.vz * dt; if (p.z < 0) { p.z = 0; p.vz = -p.vz * 0.35; p.vx *= 0.6; p.vy *= 0.6; } }
    else if (p.k === 'dust') { p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.92; p.vy *= 0.92; } }
  for (let i = T.cracks.length - 1; i >= 0; i--) { const k = T.cracks[i]; k.t += dt; if (k.t >= k.life) T.cracks.splice(i, 1); }
}
function orbitPos(e, O, i) { const a = O.t * 6.5 + i / O.n * Math.PI * 2, r = 23.7 + Math.min(1, O.t / 0.25) * 2; return { x: e.x + Math.cos(a) * r, y: e.y - 12.9 + Math.sin(a) * r * 0.5, front: Math.sin(a) > 0 }; }

/* Rocky bị đánh: khiên giảm 80 % + phản ×1,5 cho kẻ đánh. Trả sát thương còn lại (null = không đổi). */
export function onHurt(ctx, pt, raw, mo, H) {
  if (!T.shield || !active(pt)) return null; const S = T.shield; S.flash = 0.15; S.hits++;
  if (mo && mo.hp > 0 && H.mons().includes(mo)) { H.deal(mo, raw * SK.shield.refl, 0); const e = H.ent(); if (e) { fling(mo, mo.x - e.x, mo.y - e.y, 150, 0.2); chips(e.x + (e.dir || 1) * 9.7, e.y - 15.1, 5, 50, 30); } }
  mark('shield_block'); return raw * (1 - SK.shield.cut);
}

/* ---------------- vẽ ---------------- */
export function drawables(ctx, out, cx, cy, H) {
  const g = ctx.g, e = H.ent(); if (!e) return;
  for (const F of FX113) { const L0 = F.I.sc.layers || ['body']; if (L0.includes('ground')) out.push({ y: -1e9, f: () => F.I.blit(g, cx, cy, 'ground') }); if (L0.includes('body')) out.push({ y: F.y(), f: () => F.I.blit(g, cx, cy, 'body') }); }   /* p114fx */
  if (T.cracks.length) out.push({ y: -1e9, f: () => { for (const k of T.cracks) { const a = Math.min(1, (k.life - k.t) / 0.8); for (const arm of k.arms) arm.forEach(([dx, dy], j) => { const X = Math.round((k.x + dx - cx) * 2), Y = Math.round((k.y + dy - cy) * 2); if (dith(X, Y, a)) { px(g, X / 2, Y / 2, 1, 0.5, C.d0); if (j % 6 === 3 && dith(X + 1, Y + 1, a)) px(g, X / 2, Y / 2 + 0.5, 0.5, 0.5, C.l1); } }); } } });
  for (const r of T.rings) out.push({ y: r.y - 0.4, f: () => { const k = r.t / (r.small ? 0.2 : 0.65), a = 1 - k, n = Math.max(16, Math.round(r.r * 1.6)); for (let i = 0; i < n; i++) { const an = i / n * Math.PI * 2, X = r.x + Math.cos(an) * r.r - cx, Y = r.y + Math.sin(an) * r.r * 0.55 - cy; if (dith(Math.round(X * 2), Math.round(Y * 2), a)) { px(g, X, Y, 1, 0.5, r.small ? C.glow : C.dust); if (!r.small) px(g, X, Y + 0.5, 1, 0.5, C.dust2); } } } });
  for (const p of T.parts) {
    if (p.k === 'chip') out.push({ y: p.y, f: () => { const a = p.t > p.life * 0.6 ? 1 - (p.t - p.life * 0.6) / (p.life * 0.4) : 1; block(g, p.x - cx, p.y - p.z - cy, p.s, a, p.sh); } });
    else if (p.k === 'dust') out.push({ y: p.y - 0.3, f: () => { const a = 0.75 * (1 - p.t / p.life), s = p.s * (1 + p.t / p.life); for (let i = 0; i < s * 2; i++) for (let j = 0; j < s; j++) { const X = Math.round((p.x - cx) * 2) + i - Math.round(s), Y = Math.round((p.y - cy) * 2) + j - Math.round(s / 2); if ((i - s) ** 2 / (s * s) + (j - s / 2) ** 2 / (s * s / 4) < 1 && dith(X, Y, a)) px(g, X / 2, Y / 2, 0.5, 0.5, j < s / 2 ? C.dust : C.dust2); } } });
    else if (p.k === 'spike') out.push({ y: p.y, f: () => { const k = p.t / p.life, h = k < 0.3 ? k / 0.3 : 1 - (k - 0.3) / 0.7; const hh = Math.max(0.5, Math.round(p.s * 2 * h * 2) / 2); block(g, p.x - cx - p.s / 2, p.y - cy - hh, p.s, h > 0.25 ? 1 : h * 4, p.sh); } });
  }
  for (const q of T.proj) {
    if (q.k === 'fist') out.push({ y: Math.max(e.y, q.y + 10) + (Math.sin(q.ang) < 0 && !q.back ? -0.5 : 0.5), f: () => drawFist(g, q.x - cx, q.y - cy, q.ang, q.back) });
    else out.push({ y: q.y + 8, f: () => { block(g, q.x - cx - q.s / 2, q.y - cy - q.s / 2, q.s, 1, 0); px(g, q.x - cx - Math.cos(q.ang) * 4, q.y - cy, 1, 0.5, C.l2); } });
  }
  if (T.orbit) { const O = T.orbit; for (let i = 0; i < O.n; i++) { const p = orbitPos(e, O, i), s = i % 2 ? 4 : 3; out.push({ y: e.y + (p.front ? 0.6 : -0.6), f: () => { const sp = Math.min(1, O.t / 0.25); block(g, p.x - cx - s / 2, p.y - cy - s / 2 - (1 - sp) * 4, s, 1, i % 3); } }); } }
  if (T.shield) { const S = T.shield, dir = e.face === 'side' ? (e.dir || 1) : 0, up = e.face === 'dn'; out.push({ y: e.y + (up ? -0.6 : 0.6), f: () => drawShield(g, e.x - cx + dir * 11.8, e.y - cy - 16.2 + (e.face === 'ds' ? 3.2 : 0), S, dir) }); }
  if (T.ult) drawUlt(ctx, g, out, cx, cy, T.ult, e);
}
/* nắm đấm đá: bitmap sinh code ở mật độ 2 điểm / px logic (vfx-code RES = 2). W×H px logic; đốt ngón quay về phía +x (knuck: 'x') hoặc phía dưới (knuck: 'y'). */
const FIST_CACHE = {};
function fistBmp(W, H, knuck) {
  const key = W + 'x' + H + knuck; if (FIST_CACHE[key]) return FIST_CACHE[key];
  if (typeof document === 'undefined') return null;
  const w = W * 2, h = H * 2, cv = document.createElement('canvas'); cv.width = w; cv.height = h; const g = cv.getContext('2d'), M = [];
  const inRR = (x, y, x0, y0, x1, y1, r) => { if (x < x0 || x > x1 || y < y0 || y > y1) return false; const cx = Math.max(x0 + r, Math.min(x1 - r, x)), cy = Math.max(y0 + r, Math.min(y1 - r, y)); return (x - cx) ** 2 + (y - cy) ** 2 <= r * r; };
  /* hệ toạ độ chuẩn: đốt ngón ở DƯỚI (knuck 'y'); 'x' = xoay 90° (đốt ngón bên phải) */
  const U = knuck === 'y' ? [w, h] : [h, w], uw = U[0], uh = U[1];
  const part = (x, y) => {   /* 0 trống · 1 mu bàn tay · 2..5 ngón · 6 ngón cái */
    if (inRR(x, y, uw * 0.06, uh * 0.02, uw * 0.94, uh * 0.66, uw * 0.14)) return 1;
    for (let i = 0; i < 4; i++) { const fx0 = uw * (0.08 + i * 0.215), fx1 = fx0 + uw * 0.2; if (inRR(x, y, fx0, uh * 0.5, fx1, uh * 0.97, uw * 0.08)) return 2 + i; }
    if (inRR(x, y, -1, uh * 0.3, uw * 0.2, uh * 0.78, uw * 0.08)) return 6;
    return 0;
  };
  for (let y = 0; y < uh; y++) { M[y] = []; for (let x = 0; x < uw; x++) M[y][x] = part(x, y); }
  const at = (x, y) => (y >= 0 && y < uh && x >= 0 && x < uw ? M[y][x] : 0);
  const put = (x, y, c) => { g.fillStyle = c; if (knuck === 'y') g.fillRect(x, y, 1, 1); else g.fillRect(h - 1 - y, x, 1, 1); };   /* 'x': xoay 90° theo chiều kim đồng hồ → đốt ngón sang phải */
  let seed = W * 31 + H; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let y = 0; y < uh; y++) for (let x = 0; x < uw; x++) {
    const v = M[y][x]; if (!v) { if (at(x - 1, y) || at(x + 1, y) || at(x, y - 1) || at(x, y + 1)) put(x, y, C.out); continue; }
    const edgeT = !at(x, y - 2) || (v >= 2 && v <= 5 && at(x, y - 2) !== v && at(x, y - 2) !== 1) ;   /* mặt trên sáng */
    const edgeB = !at(x, y + 2) || !at(x, y + 3), seam = (at(x + 1, y) && at(x + 1, y) !== v) || (v === 1 && y > uh * 0.5 && at(x, y + 1) > 1);
    let c = v === 6 ? C.d2 : v === 1 ? C.m : C.l1;
    if (edgeT) c = v === 1 ? C.l2 : C.l2; if (edgeB) c = C.d1; if (seam) c = C.out;
    if (v >= 2 && v <= 5 && y > uh * 0.88) c = C.d0;
    if (v >= 2 && v <= 5 && y > uh * 0.58 && y < uh * 0.64 && (x % 7) < 4) c = C.hi;   /* ánh đốt ngón */
    put(x, y, c);
  }
  /* vài khe nứt khối đá trên mu bàn tay */
  for (let k = 0; k < 3; k++) { let x = Math.round(uw * (0.25 + rnd() * 0.5)), y = Math.round(uh * (0.12 + rnd() * 0.3)); for (let i = 0; i < uw * 0.18; i++) { if (at(x, y) === 1) put(x, y, C.d0); x += rnd() < 0.6 ? 1 : 0; y += rnd() < 0.5 ? 1 : 0; } }
  return (FIST_CACHE[key] = cv);
}
function drawFist(g, x, y, ang, back) {   /* nắm đấm bay 10×8 px logic: đốt ngón hướng bay (trái = lật) */
  const right = Math.cos(ang) >= 0, bm = fistBmp(9, 12, 'x'); if (!bm) return;
  const X = Math.round(x * 2) / 2 - 6, Y = Math.round(y * 2) / 2 - 4.5;
  if (right) g.drawImage(bm, X, Y, 12, 9); else { g.save(); g.translate(X + 12, Y); g.scale(-1, 1); g.drawImage(bm, 0, 0, 12, 9); g.restore(); }   /* nắm đấm bay = cỡ nắm tay Rocky (cỡ Elyziuma) */
  if (!back) { const tx = right ? X - 2.5 : X + 12.5; px(g, tx, Y + 3, 2, 2, C.dust); px(g, tx + (right ? -2 : 2), Y + 3.5, 1, 1, C.dust2); }
}
function drawShield(g, x, y, S, dir) {   /* khiên lục giác trước ngực: viền vàng nhạt + logo ")(" — mở 0,15 s, giữ, tắt 0,25 s (dither), chớp khi đỡ */
  const open = Math.min(1, S.t / 0.15), close = S.t > S.dur - 0.25 ? (S.dur - S.t) / 0.25 : 1, a = Math.min(open, close), w = dir ? 5.4 : 11.8, h = 14;
  const col = S.flash > 0 ? '#ffffff' : C.glow, col2 = S.flash > 0 ? C.glow : C.glow2;
  for (let j = 0; j < h * 2; j++) { const yy = j / 2, k = 1 - Math.abs(yy - h / 2) / (h / 2), half = w / 2 * (0.55 + 0.45 * Math.min(1, k * 2)); for (let i = -Math.round(half * 2); i <= Math.round(half * 2); i++) { const X = Math.round(x * 2) + i, Y = Math.round((y - h / 2) * 2) + j, edge = Math.abs(i) >= Math.round(half * 2) - 1 || j < 2 || j >= h * 2 - 2; if (edge ? dith(X, Y, a) : dith(X, Y, a * 0.28)) px(g, X / 2, Y / 2, 0.5, 0.5, edge ? col : col2); } }
  if (a > 0.5) { const lx = Math.round(x * 2) / 2; px(g, lx - 2.5, y - 2, 0.5, 4, col); px(g, lx - 2, y - 2.5, 0.5, 0.5, col); px(g, lx - 2, y + 2, 0.5, 0.5, col); px(g, lx + 2, y - 2, 0.5, 4, col); px(g, lx + 1.5, y - 2.5, 0.5, 0.5, col); px(g, lx + 1.5, y + 2, 0.5, 0.5, col); }
}
function drawUlt(ctx, g, out, cx, cy, U, e) {
  const ease = t => 1 - (1 - t) ** 3;
  const fx = U.x, fy0 = U.y - 52;   /* nắm đấm ghép ở trên đầu mục tiêu */
  let fy = fy0, gather = 1;
  if (U.ph === 'gather') gather = 0;
  if (U.ph === 'raise') fy = fy0 - 10 * ease(Math.min(1, U.t2 / 0.3));
  if (U.ph === 'slam') fy = fy0 - 10 + 62 * Math.min(1, (U.t3 / 0.2) ** 2);
  /* bóng nắm đấm trên đất: to dần khi sắp đập */
  if (U.ph !== 'crumble') out.push({ y: -1e8, f: () => { const k = U.ph === 'gather' ? Math.min(1, U.t / 1.25) * 0.5 : U.ph === 'raise' ? 0.6 : 0.6 + 0.4 * Math.min(1, U.t3 / 0.2), rw = 14 + 12 * k; for (let i = -rw * 2; i <= rw * 2; i++) for (let j = -rw * 0.8; j <= rw * 0.8; j++) { if ((i / (rw * 2)) ** 2 + (j / (rw * 0.8)) ** 2 > 1) continue; const X = Math.round((fx - cx) * 2) + i, Y = Math.round((U.y - cy) * 2) + Math.round(j); if (dith(X, Y, 0.55 * k)) px(g, X / 2, Y / 2, 0.5, 0.5, 'rgba(10,5,3,1)'); } } });
  U.blocks.forEach((b, i) => {
    let x, y, a = 1;
    if (U.ph === 'gather') { const k = Math.max(0, Math.min(1, (U.t - b.d) / (1.25 - b.d))), kk = ease(k); x = b.sx + (fx + b.ox - b.sx) * kk; y = b.sy + (fy + b.oy - b.sy) * kk - Math.sin(k * Math.PI) * 18; a = k > 0 ? 1 : 0; }
    else if (U.ph === 'crumble') { const k = Math.min(1, U.t4 / 0.7), an = Math.atan2(b.oy, b.ox || 0.1); x = fx + b.ox + Math.cos(an) * 30 * k; y = U.y - 6 + b.oy * 0.3 + Math.sin(an) * 12 * k - Math.sin(k * Math.PI) * 14; a = 1 - k; }
    else { x = fx + b.ox; y = fy + b.oy; }
    if (a <= 0 || U.ph === 'raise' || U.ph === 'slam') return;
    out.push({ y: U.y + 2 + (U.ph === 'crumble' ? 0 : 20), f: () => block(g, x - cx - b.s / 2, y - cy - b.s / 2, b.s, a, b.sh) });
  });
  if (U.ph !== 'gather' && U.ph !== 'crumble') out.push({ y: U.y + 22, f: () => { const bm = fistBmp(40, 33, 'y'); if (bm) g.drawImage(bm, Math.round((fx - cx - 20) * 2) / 2, Math.round((fy - cy - 16.5) * 2) / 2, 40, 33); } });   /* nắm đấm khổng lồ (bitmap code, đốt ngón hướng xuống) */
  /* ánh logo ngực Rocky lúc gọi khối về (ngắn, chỉ trong pha gom) */
  if (U.ph === 'gather' && U.t > 0.1) out.push({ y: e.y + 0.7, f: () => { const k = Math.min(1, U.t / 0.4) * (U.t > 1.0 ? Math.max(0, (1.25 - U.t) / 0.25) : 1), X = Math.round((e.x - cx) * 2) / 2, Y = Math.round((e.y - 22.6 - cy) * 2) / 2; for (let i = -3; i <= 3; i++) for (let j = -2; j <= 2; j++) if (dith(Math.round(X * 2) + i, Math.round(Y * 2) + j, k * (1 - (Math.abs(i) + Math.abs(j)) / 6))) px(g, X + i / 2, Y + j / 2, 0.5, 0.5, C.glow); } });
}
/* test (QA): window.__rktk.debug() / cast(id) — ép 1 chiêu vào quái gần nhất */
export function castNow(id) { const R0 = T.ref; if (!R0) return false; const H = R0.H, e = H.ent(), pt = H.pet(); if (!e || !pt) return false; const L0 = H.mons().slice().sort((a, b) => dst(a, e) - dst(b, e)); return force(R0.ctx, pt, e, id, L0[0], H); }
if (typeof window !== 'undefined') window.__rktk = { debug, cast: castNow };
