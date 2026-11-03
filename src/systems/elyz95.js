/* p95t: giới hạn VFX khi đánh đông (2026-11-02) */
/* p95p: Elyziuma THẬT LỰC (anh 2026-11-02) */
/* p95a: Elyziuma chủ động (anh 2026-11-02) */
/* p95s: cỡ 1,5× người (anh 2026-11-02) */
/* elyz95.js — plan-95: ELYZIUMA, Chấn Thú Huyền Thoại (hệ Mã + Triều) ĐI THEO người chơi ngoài map và BẢO VỆ người chơi.
   · Bật khi con đầu đội Chấn Thú là 'elyziuma' và đang thả (phím J / ô Ấn Chấn của comp79 — comp79 nhường phần đi theo cho hệ này).
   · Tự lao vào đánh quái / thú hoang / Chấn Thú đối thủ ĐANG NHẮM người chơi hoặc ở gần người chơi; ưu tiên con đang đánh người chơi; đánh NHIỀU con cùng lúc.
   · 5 chiêu (VFX vẽ code, theo skill vfx-code: px 2 điểm / px logic, dither Bayer, chỉ bật theo sự kiện, không lặp):
       Ký Duyệt (3 con dấu, đánh dấu 5 s) · Họp Khẩn (xoáy nước kéo gom + khựng) · Kính Lóe (nón sáng từ kính, choáng) ·
       Sa Thải (LAO TỚI con yếu máu nhất, kết liễu < 30 % máu) · Tái Cấu Trúc (tuyệt chiêu: lưới sơ đồ + sóng quét cả vùng).
   · Kéo nhắm: con bị Họp Khẩn / Sa Thải thì quay sang đánh Elyziuma vài giây (Elyziuma có máu riêng, kiệt sức thì về Ấn Chấn 15 s).
   · Lệnh thử: window.__ely (gang, cast, state, log, foes). Sprite: _wip/p95/assets/px/chanthu/elyziuma/ (PixelLab, ely.json). */
import * as FX from './fx78.js';
import { WATER as WATER105, waterDraw as waterDraw105 } from '../anim.js';   /* p105w: Elyziuma lội nước chìm nửa người */
import { SHADOW, shadowFor } from './shadow.js';
import * as D107 from './dash107.js';
import * as S113 from './scenes113.js'; import { inst as inst113, CFG113 } from './pxfx113.js';   /* p114fx: VFX cách pixelfx (lõi pxfx113) — ?fx113=0 về bản cũ */   /* plan-107: LAO NHANH tới (clip PixelLab 'dash' + VFX code) */

const vi = ctx => ctx.lang() !== 'en';
const TAU = Math.PI * 2;
const duelOn = ctx => !!(ctx.duel && ctx.duel.active && ctx.duel.active());
const T = {
  vi: { stamp: 'Ký Duyệt', meet: 'Họp Khẩn', flare: 'Kính Lóe', fire: 'Sa Thải', ult: 'Tái Cấu Trúc', fired: 'SA THẢI!', ko: 'Elyziuma kiệt sức — về Ấn Chấn nghỉ 15 giây', back: 'Elyziuma đã hồi sức', gang: n => `${n} Chấn Thú côn đồ lao tới!`, approved: 'ĐÃ DUYỆT',
    gname: { hacgiac: 'Hắc Giác côn đồ', hoahung: 'Hoả Hùng côn đồ', loiho: 'Lôi Hồ côn đồ', nguuson: 'Ngưu Sơn côn đồ', golem: 'Thạch Chấn côn đồ', vitbao: 'Vịt Bão côn đồ' } },
  en: { stamp: 'Stamp of Approval', meet: 'Emergency Meeting', flare: 'Lens Flare', fire: "You're Fired", ult: 'Restructure', fired: 'FIRED!', ko: 'Elyziuma is exhausted — resting in the Quake Seal for 15 s', back: 'Elyziuma is back on duty', gang: n => `${n} rogue Quake Beasts charge in!`, approved: 'APPROVED',
    gname: { hacgiac: 'Rogue Darkhorn', hoahung: 'Rogue Blaze Bear', loiho: 'Rogue Volt Fox', nguuson: 'Rogue Mountain Ox', golem: 'Rogue Quake Golem', vitbao: 'Rogue Storm Duck' } },
};
const L = ctx => (vi(ctx) ? T.vi : T.en);

/* ---------- số liệu (plan-95 §4) ---------- */
const CFG = { hp: 600, regen: 8, spd: 78, run: 118, dashV: 270, reach: 36, guard: 150, seek: 130,
  punch: { dmg: 18, cd: 0.8 }, shot: { dmg: 15, cd: 1.1, r: 150 }, stamp: { dmg: 14, cd: 2.5, r: 135, n: 3 }, meet: { dmg: 10, cd: 4, r: 110, stun: 0.8 }, flare: { dmg: 16, cd: 3.5, r: 92, half: 0.6, stun: 1.1 },
  fire: { dmg: 24, cd: 3, r: 150, low: 0.3 }, ult: { dmg: 42, cd: 6, r: 165, need: 1 }, aggro: 128, mark: 5, markMul: 1.2, taunt: 3, koT: 15 };
const ORDER = ['stamp', 'meet', 'flare', 'fire', 'ult'];

/* ---------- bảng màu (đo từ ảnh mẫu + Bayer) ---------- */
const PAL = { glow: '#ecfcf3', halo: '#8fd8c4', teal: ['#bff3e6', '#7fdcc8', '#3fb3a3', '#1f8a86', '#12636e', '#0c4652', '#082c38', '#04161c'],
  water: ['#e6fbff', '#a8e6f4', '#5cc3e0', '#2f93c4', '#1d6aa0', '#154c7a', '#0e3254', '#081a30'], red: ['#ffd9cf', '#ff9a86', '#e5574a', '#c53731', '#a82c34', '#7a1c26', '#4a0f18', '#24060c'],
  navy: ['#9aa4d8', '#6a74b0', '#3e4680', '#262e51', '#1a1f3c', '#121630', '#0b0d1e', '#05060e'] };
const SKIN = { pal: PAL.teal, glow: ['#ffffff', PAL.glow, PAL.halo], shape: 'rock', name: 'ma' };
const SKIN_R = { pal: PAL.red, glow: ['#ffffff', '#ffd9cf', '#ff9a86'], shape: 'rock', name: 'nham' };
const SKIN_W = { pal: PAL.water, glow: ['#ffffff', '#e6fbff', '#a8e6f4'], shape: 'sand', name: 'trieu' };
const B4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const bay = (X, Y) => (B4[(Y & 3) * 4 + (X & 3)] + 0.5) / 16;
function dot(g, X, Y, c) { if (g.fillStyle !== c) g.fillStyle = c; g.fillRect(X / 2, Y / 2, 0.5, 0.5); }   /* p95t */

/* ---------- p114fx: cầu nối Inst pxfx113 → ST.fx (mỗi lớp 1 mục; mục đầu cập nhật) ---------- */
try { if (new URLSearchParams(location.search).get('fx113') === '0') CFG113.on = false; } catch (e) { }
const ON113 = id => CFG113.on && (id === 'stamp' || id === 'flare' || id === 'ult' || id === 'shot');
function push113(sc, yfn) { const I = inst113(sc), L0 = sc.layers || ['body']; const upd = (dt, f) => { if (f.main) I.update(dt); f.t = I.done ? 1 : 0; };
  L0.forEach((ly, k) => ST.fx.push({ t: 0, T: 1, main: k === 0, ground: ly === 'ground', y: yfn, upd, dr(g, cx, cy) { I.blit(g, cx, cy, ly); } })); return I; }
if (typeof window !== 'undefined') window.__fx113 = { on: v => { if (v !== undefined) CFG113.on = !!+v; return CFG113.on; }, v: (k, v) => { if (v) S113.VAR113[k] = v; return { ...S113.VAR113 }; }, light: v => { if (v !== undefined) CFG113.light = +v; return CFG113.light; }, stat: () => ({ ...CFG113.stat }), reset: () => { CFG113.stat = { inst: 0, ms: 0, px: 0 }; } };
/* ---------- trạng thái ---------- */
const ST = { ctx: null, E: null, img: {}, meta: null, loading: false, fx: [], foes: [], log: [], n: { cast: { punch: 0, shot: 0, stamp: 0, meet: 0, flare: 0, fire: 0, ult: 0 }, hit: 0, kill: 0, multi: 0, maxMulti: 0, tele: 0, ko: 0, foeHitP: 0, foeHitE: 0, gang: 0 }, koT: 0, ver: 'p95a', force: null };
const sv = ctx => { const s = ctx.S.save; s.sys = s.sys || {}; return (s.sys.p79 = s.sys.p79 || { out: false }); };
const team0 = ctx => { try { const d = ctx.S.save.sys.chanthu; return (d && d.team && d.team[0]) || null; } catch (e) { return null; } };
const active = ctx => { if (ctx.squad104) return ctx.squad104.isOut('elyziuma'); const m = team0(ctx); return !!(m && m.sp === 'elyziuma' && sv(ctx).out); };
const hyp = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
function log(e) { ST.log.push({ t: +(performance.now() / 1000).toFixed(2), ...e }); if (ST.log.length > 200) ST.log.shift(); }
const now = () => (ST.ctx ? ST.ctx.S.time : 0);

/* ---------- ảnh ---------- */
function loadArt() {
  if (ST.meta || ST.loading) return; ST.loading = true;
  fetch('assets/px/chanthu/elyziuma/ely.json', { cache: 'no-store' }).then(r => r.json()).then(m => {
    ST.meta = m; for (const k of Object.keys(m)) { if (!m[k] || !m[k].file) continue; const im = new Image(); im.src = 'assets/px/' + m[k].file; ST.img[k] = im; } }).catch(e => { console.error('elyz95 art', e); ST.loading = false; });
}
const ROWS = { S: [0, false], SE: [1, false], E: [2, false], NE: [3, false], N: [4, false], SW: [1, true], W: [2, true], NW: [3, true] };
function dirOf(fx, fy) { const a = Math.atan2(fy, fx), k = Math.round(a / (Math.PI / 4)); return ['E', 'SE', 'S', 'SW', 'W', 'NW', 'N', 'NE'][(k + 8) % 8]; }
function keyOf(E) { const m = ST.meta; if (!m) return null; return m[E.clip] ? E.clip : m.idle ? 'idle' : m.rot ? 'rot' : null; }   /* thiếu clip → dáng đứng 8 hướng (rot) */
function clipOf(E) { const k = keyOf(E); return k ? ST.meta[k] : null; }
const FPS = { idle: 3, walk: 11, atk: 13, cast: 12, dash: 14 };
function drawEly(g, E, cx, cy) { if (!((E.alt || 0) > 1) && WATER105.depth && WATER105.depth(E.x, E.y)) { waterDraw105(g, E.x, E.y, (globalThis.__R89||Math.round)(E.x - cx), (globalThis.__R89||Math.round)(E.y - cy), () => drawEly0(g, E, cx, cy)); return; } drawEly0(g, E, cx, cy); }   /* p105w */
function drawEly0(g, E, cx, cy) {
  const c = clipOf(E); if (!c) { g.fillStyle = '#12636e'; g.fillRect((globalThis.__R89||Math.round)(E.x - cx) - 6, (globalThis.__R89||Math.round)(E.y - cy) - 13, 12, 13); return; }
  const key = keyOf(E), im = ST.img[key]; if (!im || !im.complete || !im.naturalWidth) return;
  const [r, flip] = ROWS[dirOf(E.fx, E.fy)], loop = E.clip === 'idle' || E.clip === 'walk' || E.clip === 'dash';
  let fr = Math.floor(E.ct * (FPS[E.clip] || 10)); fr = loop ? fr % c.n : Math.min(c.n - 1, fr);
  const sw = c.cw, sh = c.ch, w = sw / 2, h = sh / 2, ax = c.ax / 2, ay = (Array.isArray(c.ay) ? c.ay[r] : c.ay) / 2;
  const st = key !== E.clip, bob = st && E.clip === 'walk' ? Math.floor(E.ct * 9) % 2 : 0, lean = (E.clip === 'atk' && E.ct > 0.15 && E.ct < 0.45) ? 2 : st && E.clip === 'cast' && E.ct < 0.35 ? 1 : 0;   /* chưa có clip: nhún khi đi, chồm 1 px khi ra đòn */
  const x = (globalThis.__R89||Math.round)(E.x - cx + E.fx * lean) + (E.shk > 0 ? Math.round(Math.sin(E.shk * 90)) : 0), y = (globalThis.__R89||Math.round)(E.y - cy - (E.z || 0) + E.fy * lean * 0.5) - bob;
  const src = E.flash > 0 ? whiteOf(im) : im;
  if (flip) { g.save(); g.translate(x, y); g.scale(-1, 1); g.drawImage(src, fr * sw, r * sh, sw, sh, -ax, -ay, w, h); g.restore(); }
  else g.drawImage(src, fr * sw, r * sh, sw, sh, x - ax, y - ay, w, h);
  if (E.glint > 0) glint(g, E, x, y, h, ay);   /* Kính Lóe: 1 tia lóe trên kính (theo sự kiện) */
  if (E.hp < E.max - 0.5 && !E.ko && !(ST.ctx && ST.ctx.squad104 && globalThis.__ob91)) {   /* p104: thanh XANH phe mình vẽ bằng hàm chung target91 (squad104.drawUI) */ const bw = 16, k = Math.max(0, E.hp / E.max); g.fillStyle = '#0b0d1e'; g.fillRect(x - bw / 2 - 0.5, y - ay - 3.5, bw + 1, 2); g.fillStyle = k > 0.5 ? '#3fb3a3' : k > 0.25 ? '#e8c050' : '#e5574a'; g.fillRect(x - bw / 2, y - ay - 3, bw * k, 1); }
}
const WH = new Map();
function whiteOf(im) { let c = WH.get(im); if (c) return c; c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight; const x = c.getContext('2d'); x.drawImage(im, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = '#ffffff'; x.fillRect(0, 0, c.width, c.height); WH.set(im, c); return c; }
function eyePos(E) {   /* vị trí kính (logic) so với chân, theo hướng — đo trên sprite (ely.json eye: [dx, dy] logic, đo vạch sáng ở khung đứng 0) */
  const d = dirOf(E.fx, E.fy), m = ST.meta && ST.meta.eye, k = { S: 'S', SE: 'SE', E: 'E', NE: 'NE', N: 'N', SW: 'SE', W: 'E', NW: 'NE' }[d], fl = d === 'SW' || d === 'W' || d === 'NW';
  const o = (m && m[k]) || [0, -21];
  return { x: E.x + (fl ? -o[0] : o[0]), y: E.y + o[1], back: d === 'N' || d === 'NE' || d === 'NW' };
}
function glint(g, E, x, y) {
  const e = eyePos(E); if (e.back) return; const X = Math.round((e.x - E.x + x) * 2), Y = Math.round((e.y - E.y + y) * 2), k = E.glint / 0.16, L0 = Math.round(3 + 5 * k);
  for (let i = -L0; i <= L0; i++) { const c = Math.abs(i) < 2 ? '#ffffff' : PAL.glow; dot(g, X + i, Y, c); if (Math.abs(i) <= L0 / 2) dot(g, X, Y + i, c); }
}

/* ---------- mục tiêu ---------- */
function monList(ctx) { try { return ctx.monsters && ctx.monsters.list ? ctx.monsters.list() : []; } catch (e) { return []; } }
function valid(mo) { return mo && mo.hp > 0 && !mo.dead && mo.state !== 'dead' && !mo.hide && !mo.statue && !(mo.c && mo.c.spar) && (!(mo.c && mo.c.boss) || (ST.ctx && ST.ctx.squad104 && ST.ctx.squad104.focusOf('elyziuma') === mo)); }   /* p104: trùm chỉ khi ra lệnh G */
function threatOf(ctx, mo, E) {   /* điểm đe doạ: đang đánh / nhắm người chơi cao nhất */
  const p = ctx.S.player, dp = hyp(mo, p), de = hyp(mo, E);
  const SQ = ctx.squad104; if (SQ) { if (SQ.focusOf('elyziuma') === mo) return 99; const md = SQ.modeOf('elyziuma'); if (md === 'follow') return 0; if (SQ.rally() && dp > 70) return 0; }   /* p104: lệnh G / Theo sau / quây về */
  if (mo.c && mo.c.fct && !mo.angry && !(dp < (PW.on ? PW.k.aggro : CFG.aggro) || de < (PW.on ? PW.k.aggro : CFG.aggro))) return 0;   /* p95a: thú hoang hiền chỉ bỏ qua khi xa > 8 ô */   /* Chũi / Cóc hoang hiền: để bắt */
  if (dp > CFG.guard + 30 && de > CFG.seek) return 0;
  let s = 1; if (mo.c && mo.c.gang95) s += 2; if (mo.angry) s += 2; if (dp < 70) s += 2; if (dp < 24) s += 3; if (mo.tgt95 === 'E') s += 1;
  return s + Math.max(0, (CFG.guard - dp) / CFG.guard);
}
function threats(ctx, E) { const out = []; for (const mo of monList(ctx)) { if (!valid(mo)) continue; const s = threatOf(ctx, mo, E); if (s > 0) out.push({ mo, s }); } out.sort((a, b) => b.s - a.s); return out; }
const within = (list, o, r) => list.filter(t => hyp(t.mo, o) <= r);
function hit(ctx, mo, dmg, src, kb = 70, tag = '') {
  if (!valid(mo)) return false;
  dmg *= PW.on && tag && tag !== 'punch' && tag !== 'shot' ? (tag === 'ult' ? PW.k.ult : PW.k.dmg) : 1;   /* p95p: chế độ video */
  let d = dmg * ((mo.mark95 || 0) > now() ? CFG.markMul : 1); d = Math.max(1, Math.round(d * (0.9 + Math.random() * 0.2)));
  globalThis.__env105he = tag === 'meet' ? 'trieu' : null;   /* p95p: chỉ Họp Khẩn để nước */ try { mo.__by = 'ely'; ctx.monsters.damage(mo, d, src, 0.6, kb, true); } catch (e) { } globalThis.__env105he = null;   /* p105w */   /* p106: ghi công đòn Elyziuma (farm106) */
  if (mo.c && mo.c.gang95) { mo.tgt95 = 'E'; mo.taunt95 = Math.max(mo.taunt95 || 0, now() + 2.5); }   /* bị Elyziuma đánh → quay sang Elyziuma (kéo nhắm, bảo vệ người chơi) */
  try { if (globalThis.__sfx108) globalThis.__sfx108.at(ctx, tag === 'punch' ? 'hit' : 'ely_' + tag + '_hit', mo.x, mo.y, { vol: tag === 'punch' ? 0.5 : 0.8 }); } catch (e) { }   /* p108: tiếng trúng theo chiêu (stamp / meet / flare / fire / ult) */
  hitFx95p(ctx, mo, d, tag);   /* p95p: va chạm khủng */
  ST.n.hit++; if (!(mo.hp > 0)) { ST.n.kill++; log({ ev: 'kill', tag, key: mo.c && mo.c.key }); } else mo.flash = 0.18;
  return true;
}

/* ---------- Elyziuma ---------- */
function mkE(ctx, pop) {
  const p = ctx.S.player, q = near(ctx, p.x - 30, p.y + 4);
  const E = { x: q.x, y: q.y, fx: 0.01, fy: 1, clip: 'idle', ct: 0, hp: CFG.hp, max: CFG.hp, act: null, cd: { punch: 0, shot: 0, stamp: 1, meet: 2, flare: 2, fire: 1.5, ult: 4 }, flash: 0, glint: 0, shk: 0, stop: 0, stuck: 0, ko: false, think: 0 };
  ST.E = E; if (pop) FX.erupt(q.x, q.y, SKIN, FX.power(0.6), 'b'); log({ ev: 'spawn', x: Math.round(q.x), y: Math.round(q.y) }); return E;
}
function near(ctx, x, y) { try { if (ctx.ldKit && ctx.ldKit.near) return ctx.ldKit.near(x, y); } catch (e) { } return { x, y }; }
function moveE(ctx, E, dx, dy) {
  const k = ctx.ldKit; if (k && k.move && k.ready && k.ready()) { const o = { sp: 'elyziuma', x: E.x, y: E.y }; const ok = k.move(o, dx, dy); E.x = o.x; E.y = o.y; return ok; }
  E.x += dx; E.y += dy; return true;
}
function face(E, x, y) { const dx = x - E.x, dy = y - E.y, d = Math.hypot(dx, dy); if (d > 0.5) { E.fx = dx / d; E.fy = dy / d; } }
function setClip(E, c) { if (E.clip !== c) { E.clip = c; E.ct = 0; } }
function io107(ctx, E, x, y, sp, dt, near0) {   /* plan-107: cầu nối dash107 (clip ely_dash: lấy đà khung 1, vòng lao 2–8, phanh = dáng đứng) */
  const m = ST.meta; return { ctx, r: 10, gx: x, gy: y, sp, dt, near: near0, trig: sp >= CFG.run ? 60 : 1e9, move: (a, b) => moveE(ctx, E, a, b), info: c => (m && m[c]) || null,
    frame: (c, fr) => { E.clip = m && m[c] ? c : 'idle'; E.ct = (fr + 0.5) / (FPS[E.clip] || 10); }, face: (ux, uy) => { E.fx = ux; E.fy = uy; },
    dash: 'dash', loop: [2, 8], wind: 1, lean: 1.5, tint: PAL.teal[1], h: 28, water: (a, b) => !!(ctx.isWater && ctx.isWater(a, b)), sfx: () => { try { ctx.sfx('whoosh'); } catch (e) { } } };
}
function drawEly107(g, E, cx, cy, ghost) {   /* bóng mờ: không thanh máu / tia kính / chớp trắng */
  if (!ghost) return drawEly(g, E, cx, cy); const h = E.hp, gl = E.glint, fl = E.flash; E.hp = E.max; E.glint = 0; E.flash = 0;
  try { drawEly(g, E, cx, cy); } finally { E.hp = h; E.glint = gl; E.flash = fl; }
}
function goTo(ctx, E, x, y, sp, dt, near0 = 2) {
  const dx = x - E.x, dy = y - E.y, d = Math.hypot(dx, dy);
  { const r = D107.go(E, io107(ctx, E, x, y, sp, dt, near0)); if (r) { E.stuck = 0; return r === 'arrive'; } }   /* plan-107: xa + đang chạy → lấy đà, lao, phanh trượt */
  if (d <= near0) return true;
  const st = Math.min(d, sp * dt), ok = moveE(ctx, E, dx / d * st, dy / d * st); face(E, x, y); setClip(E, 'walk');
  E.stuck = ok ? 0 : E.stuck + dt; if (E.stuck > 1.2) { const p = ctx.S.player, q = near(ctx, p.x - 14, p.y + 4); E.x = q.x; E.y = q.y; E.stuck = 0; ST.n.tele++; log({ ev: 'unstuck' }); }
  return false;
}

/* ---------- chiêu ---------- */
function start(ctx, E, id, o) {
  const clip = id === 'punch' || id === 'fire' ? 'atk' : 'cast', len = id === 'ult' ? 1.5 : id === 'fire' ? 0.9 : id === 'punch' || id === 'shot' ? 0.62 : 0.75;
  D107.stop(E, id); E.act = { id, t: 0, T: len, done: false, ...o }; setClip(E, clip); E.cd[id] = PW.nocd ? 0.05 : CFG[id].cd * (PW.on ? PW.k.cd : 1); ST.n.cast[id]++; if (ON113(id)) { if (id === 'stamp') push113(S113.stampWind(E), () => E.y + 0.6); else if (id === 'flare') push113(S113.flareCast(E, () => eyePos(E), CFG.flare.r, CFG.flare.half), () => E.y + (E.fy < 0 ? -0.5 : 0.5)); }   /* p114fx: gồng + chiêu theo nhịp move */
  else if (id !== 'punch' && id !== 'shot' && ST.fx.filter(f => f.chg && f.t < f.T).length < 2) { const cf = chargeFx(E, id === 'ult' ? 0.9 : 0.3); cf.chg = 1; ST.fx.push(cf); } E.lu = E.lu || {}; E.lu[id] = now(); E.en = id === 'ult' ? 0 : Math.min(100, (E.en || 0) + (id === 'punch' || id === 'shot' ? 6 : 20) * (PW.on ? PW.k.en : 1));   /* p95a */
  if (id !== 'punch' && id !== 'shot') { FX.shout(E.x, E.y - 50, (L(ctx)[id] || id).replace(/'/g, '').toUpperCase(), id === 'ult' ? '#ffe9a0' : '#bff3e6', 1, 0.9); try { if (!(globalThis.__sfx108 && globalThis.__sfx108.at(ctx, 'ely_' + id + '_cast', E.x, E.y))) ctx.sfx(id === 'ult' ? 'boom' : 'whoosh'); } catch (e) { } }
  log({ ev: 'cast', id, n: o && o.tg ? o.tg.length : 0 });
}
function choose(ctx, E, TH) {
  const p = ctx.S.player, c = E.cd, R = id => c[id] <= 0;
  if (ST.force && R(ST.force) !== undefined) { const f = ST.force; ST.force = null; return f; }
  if (ctx.squad104 && ctx.squad104.danger()) { const at = TH.filter(t => hyp(t.mo, p) < 60);   /* p104 chiêu BẢO VỆ: người chơi đang bị đánh → khống chế kẻ đánh trước */
    if (at.length && R('flare')) { face(E, at[0].mo.x, at[0].mo.y); if (cone(E, at).length) return 'flare'; }
    if (at.length && R('meet') && within(at, E, CFG.meet.r).length) return 'meet'; }
  /* p95a: LUÂN PHIÊN — mọi chiêu sẵn sàng có ≥ 1 mục tiêu hợp lệ; chọn chiêu lâu chưa dùng nhất; tuyệt chiêu theo năng lượng */
  const lu = E.lu || {}, cand = [];
  if (R('ult') && (E.en || 0) >= 100 && within(TH, E, CFG.ult.r).length >= CFG.ult.need) return 'ult';
  if (R('meet') && within(TH, E, CFG.meet.r).length >= 1) cand.push('meet');
  if (R('flare')) { const tg = TH[0].mo; if (hyp(tg, E) <= CFG.flare.r) { face(E, tg.x, tg.y); if (cone(E, TH).length >= 1) cand.push('flare'); } }
  if (R('fire') && TH.some(t => hyp(t.mo, E) <= CFG.fire.r && !far(t.mo))) cand.push('fire');
  if (R('stamp') && within(TH, E, CFG.stamp.r).length >= 1) cand.push('stamp');
  if (cand.length) { cand.sort((a, b) => (lu[a] || 0) - (lu[b] || 0)); return cand[0]; }
  return 'punch';
}
function cone(E, TH) { return TH.filter(t => { const dx = t.mo.x - E.x, dy = t.mo.y - E.y, d = Math.hypot(dx, dy); if (d > CFG.flare.r || d < 1) return false; return Math.acos(Math.max(-1, Math.min(1, (dx * E.fx + dy * E.fy) / d))) <= CFG.flare.half; }); }
function stun(mo, s) { mo.stun95 = now() + s; if (!(mo.c && mo.c.gang95)) mo.cd = Math.max(mo.cd || 0, s); }   /* quái thường: không đánh trong lúc choáng */
function far(mo) { return !!(mo && mo.c && (mo.c.fly || mo.c.float || mo.c.aqua || mo.c.swim)) || !!(mo && ST.ctx && ST.ctx.isWater && ST.ctx.isWater(mo.x, mo.y)); }   /* quái bay / dưới nước: đánh tầm xa */
function multi(n) { if (n >= 2) ST.n.multi++; ST.n.maxMulti = Math.max(ST.n.maxMulti, n); }
function runAct(ctx, E, dt) {
  const A = E.act, id = A.id, TH = threats(ctx, E); A.t += dt;
  if (id === 'punch') {
    const tg = A.tg; if (tg && valid(tg)) face(E, tg.x, tg.y);
    if (!A.done && A.t >= 0.3) { A.done = true; if (tg && valid(tg) && hyp(tg, E) < CFG.reach + 6) { hit(ctx, tg, CFG.punch.dmg, E, 90, 'punch'); FX.impact(tg.x, tg.y, 9, SKIN, FX.power(0.55)); E.stop = 0.05; } }
  } else if (id === 'shot') {   /* đòn thường TẦM XA: 1 con dấu bay tới quái bay / dưới nước / chỗ không tới được */
    const tg = A.tg; if (tg && valid(tg)) face(E, tg.x, tg.y);
    if (!A.done && A.t >= 0.28) { A.done = true; if (tg && valid(tg)) ST.fx.push(stampFx(ctx, E, tg, 0, CFG.shot.dmg, true)); }
  } else if (id === 'stamp') {
    if (!A.done && A.t >= 0.32) { A.done = true; const tg = within(TH, E, CFG.stamp.r).slice(0, CFG.stamp.n).map(t => t.mo); multi(tg.length);
      const list = tg.length === 1 ? [tg[0], tg[0], tg[0]] : tg;   /* 1 mục tiêu: 3 dấu cùng đáp, mỗi dấu 1/3 sức */
      list.forEach((mo, i) => ST.fx.push(stampFx(ctx, E, mo, i, tg.length === 1 ? CFG.stamp.dmg / 3 * 1.4 : CFG.stamp.dmg))); E.glint = 0.12; }
  } else if (id === 'meet') {
    if (!A.done && A.t >= 0.35) { A.done = true; const P = { x: E.x + E.fx * 14, y: E.y + E.fy * 10 }, tg = within(TH, E, CFG.meet.r).map(t => t.mo); multi(tg.length);
      ST.fx.push(whirlFx(P, CFG.meet.r));
      for (const mo of tg) { const d = hyp(mo, P) || 1, v = Math.min(240, d * 3.2); mo.kb = { vx: (P.x - mo.x) / d * v, vy: (P.y - mo.y) / d * v, t: 0.26 }; stun(mo, CFG.meet.stun + 0.26); mo.tgt95 = 'E'; mo.taunt95 = now() + CFG.taunt; hit(ctx, mo, CFG.meet.dmg, P, 0, 'meet'); }
      E.stop = 0.06; FX.shockRing(P.x, P.y, 22, SKIN_W, 0.3, 2); }
  } else if (id === 'flare') {
    if (!A.done && A.t >= 0.28) { A.done = true; E.glint = 0.16; const tg = cone(E, TH).map(t => t.mo); multi(tg.length); if (!ON113('flare')) ST.fx.push(flareFx(E));
      for (const mo of tg) { hit(ctx, mo, CFG.flare.dmg, E, 40, 'flare'); stun(mo, CFG.flare.stun); mo.dazed95 = now() + CFG.flare.stun; } E.stop = 0.04; }
  } else if (id === 'fire') {
    const tg = A.tg; if (!A.dash && !A.done) { A.dash = true; A.t = 0; }
    if (!A.done) {
      if (!tg || !valid(tg)) { A.done = true; A.t = A.T - 0.2; }
      else { face(E, tg.x, tg.y); const d = hyp(tg, E); ST.fx.push(dashFx(E));
        if (d > 26 && A.t < 0.55) { const st = Math.min(d - 24, CFG.dashV * dt); moveE(ctx, E, E.fx * st, E.fy * st); E.clip = 'atk'; E.ct = Math.min(E.ct, 0.18); }
        else { A.done = true; A.t = 0.4; const low = tg.hp / tg.max < CFG.fire.low, dmg = CFG.fire.dmg * (low ? 2 : 1);
          hit(ctx, tg, dmg, E, low ? 260 : 160, 'fire');
          { A.hops = (A.hops || 0) + 1; const nx = threats(ctx, E).map(t => t.mo).filter(m => m !== tg && valid(m) && !far(m) && hyp(m, E) < 150).sort((a, b) => a.hp / a.max - b.hp / b.max)[0];   /* p95p: LAO NỐI */
            if (nx && A.hops <= (PW.on ? PW.k.hops : 1)) { PW.n.hop++; A.tg = nx; A.done = false; A.t = 0; A.T = 0.9; E.stop = Math.max(E.stop, 0.06); } } tg.tgt95 = 'E'; tg.taunt95 = now() + CFG.taunt; stun(tg, 0.4);
          FX.impact(tg.x, tg.y, 9, SKIN_R, FX.power(low ? 0.95 : 0.7), { big: low, ring: true, q: 0.6 }); if (low) { FX.shout(tg.x, tg.y - 40, L(ctx).fired, '#ff9a86', 2, 0.9); flashG(ctx, 0.22); } E.stop = Math.max(E.stop, low ? 0.12 : 0.06); } }
    }
  } else if (id === 'ult') {
    if (!A.g) { A.g = true; const ws = within(TH, E, CFG.ult.r), Rh = ws.length ? Math.max(...ws.map(t => hyp(t.mo, E))) + 12 : 60; if (ON113('ult')) { const tgl = () => within(threats(ctx, E), E, CFG.ult.r).map(t => t.mo), H0 = () => { const c = ST.ctx, o = []; if (c && c.S && c.S.player) o.push(c.S.player); return o; }; push113(S113.ultCast(E, tgl, Rh, H0), () => Math.max(E.y, ...tgl().map(m => m.y)) + 1); PW.darkT = performance.now() + 1000; }
      else { ST.fx.push(PW.ultv === 'b' ? ultFxB(E, Rh) : ultFx(E, Rh)); PW.darkT = performance.now() + 1400; } }
    if (!A.done && A.t >= 0.95) { A.done = true; const tg = within(TH, E, CFG.ult.r).map(t => t.mo); multi(tg.length);
      for (const mo of tg) { const mk = (mo.mark95 || 0) > now(); hit(ctx, mo, CFG.ult.dmg, E, mk ? 230 : 120, 'ult'); stun(mo, 0.6); if (!ON113('ult')) FX.impact(mo.x, mo.y, 8, SKIN, FX.power(0.8), { noCrater: true }); }
      E.stop = 0.14; rq(ctx, 0.35); flashG(ctx, 0.3); slowmo(ctx, 0.3); if (!ON113('ult')) { FX.shockRing(E.x, E.y, 70, SKIN_E, 0.5, 4); FX.shockRing(E.x, E.y, 40, SKIN_V, 0.35, 3); ST.fx.push(ultShow(ctx, E, tg)); ST.fx.push(dataBurst(E.x, E.y - 10, 30, 1.4)); } }
  }
  if (A.t >= A.T) { E.act = null; setClip(E, 'idle'); }
}

/* ---------- VFX vẽ code (sự kiện, tự tắt) ---------- */
function stampFx(ctx, E, mo, i, dmg, noMark) {   /* con dấu đỏ xoay bay vồng tới đầu mục tiêu rồi đóng ẤN tròn */
  const sx = E.x + E.fx * 11, sy = E.y - 25, T0 = 0.34 + i * 0.07, V113 = ON113('stamp') ? push113(S113.stampFly(E, mo, i), () => mo.y + 1) : null;   /* p114fx */
  return { t: -i * 0.07, T: T0 + 0.5, hit: false, upd(dt, f) { f.t += dt; if (!f.hit && f.t >= T0 - i * 0.07 && f.t > 0) { f.hit = true; f.tx = mo.x; f.ty = mo.y;
      if (valid(mo)) { if (!noMark) mo.mark95 = now() + CFG.mark; hit(ctx, mo, dmg, { x: sx, y: sy }, 30, 'stamp'); } if (!V113) FX.impact(mo.x, mo.y, 14, SKIN_R, FX.power(0.35), { noCrater: true }); } },
    y: () => mo.y + 1, dr(g, cx, cy, f) {
      if (f.t < 0 || V113) return; const k = Math.min(1, f.t / (T0 - i * 0.07)), tx = f.hit ? f.tx : mo.x, ty = f.hit ? f.ty : mo.y;
      if (!f.hit) { const x = sx + (tx - sx) * k, y = sy + (ty - 16 - sy) * k - Math.sin(k * Math.PI) * 16, a = k * TAU * 1.5; stampPix(g, x - cx, y - cy, a, 1); }
      else { const q = (f.t - (T0 - i * 0.07)) / 0.5, X = Math.round((tx - cx) * 2), Y = Math.round((ty - 16 - cy) * 2), R = Math.round(5 + 3 * Math.min(1, q * 4));
        for (let yy = -R; yy <= R; yy++) for (let xx = -R; xx <= R; xx++) { const d = Math.hypot(xx, yy); if (d > R || d < R - 1.6) continue; if (q > 0.6 && bay(X + xx, Y + yy) < (q - 0.6) / 0.4) continue; dot(g, X + xx, Y + yy, q < 0.12 ? '#ffffff' : PAL.red[3]); }
        if (q < 0.7) for (let xx = -2; xx <= 2; xx++) { dot(g, X + xx, Y, PAL.red[2]); dot(g, X, Y + xx, PAL.red[2]); } } } };
}
function stampPix(g, x, y, a) {   /* dấu mộc: thân gỗ đỏ sẫm + mặt đỏ, xoay theo a */
  const X = Math.round(x * 2), Y = Math.round(y * 2), ca = Math.cos(a), sa = Math.sin(a);
  for (let v = -4; v <= 4; v++) for (let u = -3; u <= 3; u++) { const px = Math.round(X + u * ca - v * sa), py = Math.round(Y + u * sa + v * ca), edge = Math.abs(u) === 3 || Math.abs(v) === 4;
    dot(g, px, py, edge ? PAL.red[6] : v > 1 ? PAL.red[2] : PAL.red[4]); }
}
function whirlFx(P, R) {   /* Họp Khẩn: xoáy nước thấp sát đất co về tâm (màu nước), tắt gọn vào tâm */
  return { t: 0, T: 0.7, ground: true, upd(dt, f) { f.t += dt; }, dr(g, cx, cy, f) {
    const k = f.t / f.T, X = Math.round((P.x - cx) * 2), Y = Math.round((P.y - cy) * 2), r0 = R * 2 * (1 - k) + 4, arms = 4;
    for (let j = 0; j < 3; j++) { const r = r0 * (1 - j * 0.28); if (r < 2) continue; const n = Math.round(r * 5);
      for (let i = 0; i < n; i++) { const a = i / n * TAU + k * 9 + j, px = Math.round(X + Math.cos(a) * r), py = Math.round(Y + Math.sin(a) * r * 0.42), arm = (Math.sin(a * arms - k * 12) + 1) / 2;
        const dens = arm * (1 - k * 0.8) * (1 - j * 0.2); if (dens < bay(px, py)) continue; dot(g, px, py, PAL.water[1 + j + (arm < 0.5 ? 1 : 0)]); } } } };
}
function flareFx(E) {   /* Kính Lóe: nón sáng trắng-xanh xuất phát từ kính, mờ dither ra ngoài, tắt co về gốc */
  const e = eyePos(E), fx = E.fx, fy = E.fy, R = CFG.flare.r, H0 = CFG.flare.half;
  return { t: 0, T: 0.42, upd(dt, f) { f.t += dt; }, y: () => E.y + (fy < 0 ? -0.5 : 0.5), dr(g, cx, cy, f) {
    const k = f.t / f.T, L0 = R * (k < 0.25 ? k / 0.25 : 1) * 2, X0 = (e.x - cx) * 2, Y0 = (e.y - cy) * 2, a0 = Math.atan2(fy, fx), fade = k < 0.5 ? 0 : (k - 0.5) / 0.5;
    for (let r = 3; r < L0; r += 1) { const w = Math.tan(H0) * r, n = Math.max(2, Math.round(w * 2));
      for (let i = -n; i <= n; i++) { const b = a0 + (i / n) * H0, px = Math.round(X0 + Math.cos(b) * r), py = Math.round(Y0 + Math.sin(b) * r * 0.85), q = r / (R * 2), edge = Math.abs(i) / n;
        const dens = (1 - q * 0.75) * (1 - edge * 0.6) - fade - (r < L0 * fade ? 1 : 0); if (dens < bay(px, py)) continue; dot(g, px, py, q < 0.18 ? '#ffffff' : q < 0.5 ? PAL.glow : PAL.halo); } } } };
}
function dashFx(E) {   /* Sa Thải: vệt lướt navy sau lưng (vài hạt, tự tắt) */
  const x = E.x - E.fx * 6, y = E.y - 6, fx = E.fx, fy = E.fy;
  return { t: 0, T: 0.22, upd(dt, f) { f.t += dt; }, y: () => y + 5, dr(g, cx, cy, f) { const k = f.t / f.T; for (let i = 0; i < 6; i++) { const L0 = 6 + i * 2, X = Math.round((x - cx - fx * i * 2) * 2), Y = Math.round((y - cy - fy * i * 2 + (i % 3 - 1) * 3) * 2);
    for (let j = 0; j < L0; j++) { if ((1 - k) * (1 - j / L0) < bay(X - fx * j, Y)) continue; dot(g, Math.round(X - fx * j), Math.round(Y - fy * j), j < 2 ? PAL.navy[1] : PAL.navy[3]); } } } };
}
function ultFx(E, Rhit) {   /* Tái Cấu Trúc (bản 2, điều phối chê lưới bàn cờ): chỉ trong vùng đánh thật (Rhit = xa nhất tới mục tiêu + 12), nét dither MẢNH:
     8 tia "sơ đồ tổ chức" từ chân Elyziuma + 2 vòng elip; bật ≤ 0,35 s rồi tắt dần (tới 0,8 s); chừa lỗ quanh người chơi / đồng hành; sóng quét mảnh 1 lần. */
  const X0 = E.x, Y0 = E.y, R = Math.max(40, Math.min(CFG.ult.r, Rhit || CFG.ult.r)), T0 = 0.85;
  const holes = () => { const c = ST.ctx, out = [{ x: X0, y: Y0 }]; if (c && c.S && c.S.player) out.push(c.S.player); try { const r = typeof window !== 'undefined' && window.__pet && window.__pet.rk && window.__pet.rk(); if (r && r.ent) out.push(r.ent); } catch (e) { }   /* Rocky */ return out; };
  return { t: 0, T: 1.5, ground: true, upd(dt, f) { f.t += dt; if (f.t < T0) E.glint = Math.max(E.glint, 0.06); }, dr(g, cx, cy, f) {
    const t = f.t - T0 + 0.35; if (t < 0) return;   /* lưới chỉ bật 0,35 s trước cú chốt */
    const X = (X0 - cx) * 2, Y = (Y0 - cy) * 2, grow = Math.min(1, t / 0.3), fade = t < 0.45 ? 0 : Math.min(1, (t - 0.45) / 0.35), RR = R * 2 * grow;
    if (fade >= 1 && t > 1.2) return;
    const H = holes().map(h => ({ x: (h.x - cx) * 2, y: (h.y - cy) * 2 }));
    const skip = (px, py) => H.some(h => { const dx = px - h.x, dy = (py - h.y) * 2; return dx * dx + dy * dy < 30 * 30; });
    const put = (px, py, dens, col) => { px = Math.round(px); py = Math.round(py); if (dens - fade < bay(px, py) || skip(px, py)) return; dot(g, px, py, col); };
    for (let k = 0; k < 8; k++) { const a = k / 8 * TAU + 0.2, ca = Math.cos(a), sa = Math.sin(a) * 0.5;
      for (let r = 18; r < RR; r += 1) { const q = r / (R * 2); put(X + ca * r, Y + sa * r, 0.75 - q * 0.45, q < 0.5 ? PAL.teal[1] : PAL.teal[2]); }
      const nx = X + ca * RR * 0.55, ny = Y + sa * RR * 0.55; for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) put(nx + i, ny + j, 0.9, PAL.glow); }   /* nút 'phòng ban' 3×3 giữa tia */
    for (const kr of [0.55, 1]) { const r = RR * kr, n = Math.round(r * 6); for (let i = 0; i < n; i++) { const a = i / n * TAU; put(X + Math.cos(a) * r, Y + Math.sin(a) * r * 0.5, 0.55, PAL.teal[2]); } }
    if (t > 0.3 && t < 0.75) { const k = (t - 0.3) / 0.45, r = R * 2 * (0.2 + 0.85 * k), n = Math.round(r * 6.5);   /* sóng quét mảnh 2 hàng, đúng lúc trúng */
      for (let q = 0; q < 2; q++) for (let i = 0; i < n; i++) { const a = i / n * TAU; put(X + Math.cos(a) * (r - q), Y + Math.sin(a) * (r - q) * 0.5, 0.9 - k * 0.5, q ? PAL.water[2] : '#ffffff'); } } } };
}
function updFx(dt) { for (const f of ST.fx) f.upd(dt, f); ST.fx = ST.fx.filter(f => f.t < f.T); }

/* ---------- Chấn Thú côn đồ (để thử, lệnh __ely.gang) ---------- */
const GANG = ['hacgiac', 'hoahung', 'loiho', 'nguuson', 'golem', 'vitbao'];
function gang(ctx, n = 4) {
  const kit = ctx.ldKit; if (kit && !kit.ready()) kit.load(); const p = ctx.S.player, out = [];
  for (let i = 0; i < n; i++) {
    const sp = GANG[(ST.n.gang + i) % GANG.length], a = (i / n) * TAU + 0.4, q = near(ctx, p.x + Math.cos(a) * 95, p.y + Math.sin(a) * 60);
    const nm = { vi: T.vi.gname[sp], en: T.en.gname[sp] };
    const c = { key: 'gang95_' + sp, vi: nm.vi, en: nm.en, hp: sp === 'nguuson' || sp === 'golem' ? 190 : 150, w: 16, h: 18, dmg: sp === 'nguuson' ? 9 : 7, sp: 42, xp: 20, drop: 'stone', c: '#5a4a7a', gang95: sp, shortHit: false,
      aiFn: gangAI, drawFn: (g, mo, x, y) => gangDraw(ctx, g, mo, x, y) };
    const mo = ctx.monsters.add(c, q.x, q.y); mo.angry = true; out.push(mo); FX.erupt(q.x, q.y, FX.skinOf(sp), FX.power(0.3), 'b');
  }
  ST.n.gang += n; ST.foes.push(...out); try { ctx.toast(L(ctx).gang(n)); } catch (e) { } log({ ev: 'gang', n }); return out.length;
}
function gangE(ctx, mo) { const kit = ctx.ldKit; if (!mo.e95 && kit && kit.ready()) { mo.e95 = kit.mk(mo.c.gang95, 30, null, mo.x, mo.y); mo.e95.clip = 'idle'; mo.e95.ct = 0; } return mo.e95; }
function gangAI(ctx, mo, dt, p, dp, canHit) {
  const e = gangE(ctx, mo), E = ST.E, t = now(); if (e) { e.ct += dt; if (e.atkT > 0) { e.atkT -= dt; if (e.atkT <= 0) { e.clip = 'idle'; e.ct = 0; } } }
  if ((mo.stun95 || 0) > t) { if (e && !(e.atkT > 0)) e.clip = 'idle'; return; }
  const sqU = ctx.squad104 ? ctx.squad104.tauntOf(mo) : null, onE = !sqU && E && active(ctx) && !E.ko && (mo.taunt95 || 0) > t && hyp(mo, E) < 90, tg = sqU ? sqU.pos() : onE ? E : p;   /* p104: bị Chấn Thú khác đánh → quay sang nó */
  if (!onE && !sqU) mo.tgt95 = 'P';
  if (!canHit && !onE && !sqU) { return; }
  const d = hyp(mo, tg), dazed = (mo.dazed95 || 0) > t;
  const rr = onE || sqU ? 26 : 14; if (d > rr) { const dx = tg.x - mo.x, dy = tg.y - mo.y, st = Math.min(d - rr + 2, mo.c.sp * (dazed ? 0.4 : 1) * dt);
    if (e) { const o = { sp: mo.c.gang95, x: mo.x, y: mo.y }; try { ctx.ldKit.move(o, dx / d * st, dy / d * st); } catch (er) { o.x += dx / d * st; o.y += dy / d * st; } mo.x = o.x; mo.y = o.y; e.fx = dx / d; e.fy = dy / d; if (!(e.atkT > 0) && e.clip !== 'run') { e.clip = ctx.ldKit.has(e, 'run') ? 'run' : 'idle'; e.ct = 0; } }
    else { mo.x += dx / d * st; mo.y += dy / d * st; }
    mo.dir = dx < 0 ? -1 : 1; return; }
  if (e && e.clip === 'run') { e.clip = 'idle'; e.ct = 0; }
  if (mo.cd <= 0) { mo.cd = dazed ? 2.2 : 1.25; if (e) { e.fx = (tg.x - mo.x) / (d || 1); e.fy = (tg.y - mo.y) / (d || 1); e.clip = ctx.ldKit.has(e, 'atk') ? 'atk' : 'idle'; e.ct = 0; e.atkT = 0.45; }
    if (sqU) ctx.squad104.hurt(sqU, mo.c.dmg, mo);
    else if (onE) { E.hp -= mo.c.dmg; E.flash = 0.12; ST.n.foeHitE++; if (E.hp <= 0) koE(ctx, E); }
    else { if (ctx.hero) ctx.hero.hit(mo.c.dmg); ST.n.foeHitP++; }
    FX.bite(tg.x, tg.y, 8, FX.skinOf(mo.c.gang95), FX.power(0.3)); }
}
function gangDraw(ctx, g, mo, x, y) {
  const e = gangE(ctx, mo); if (!e) { g.fillStyle = '#3a2f4a'; g.fillRect(x - 6, y - 12, 12, 12); return; }
  e.x = mo.x; e.y = mo.y; e.flash = mo.flash > 0 ? mo.flash : 0; ctx.ldKit.draw(g, e, mo.x - x, mo.y - y);
  if ((mo.mark95 || 0) > now()) { const X = Math.round(x * 2), Y = Math.round((y - 22) * 2); for (let yy = -3; yy <= 3; yy++) for (let xx = -3; xx <= 3; xx++) { const dd = Math.hypot(xx, yy); if (dd <= 3.2 && dd >= 2) dot(g, X + xx, Y + yy, PAL.red[3]); } dot(g, X, Y, PAL.red[3]); }   /* dấu ĐÃ DUYỆT tĩnh trên đầu */
  if ((mo.stun95 || 0) > now()) { const k = ST.ctx.S.time * 6, X = Math.round(x * 2), Y = Math.round((y - 20) * 2); for (let i = 0; i < 3; i++) { const a = k + i * TAU / 3; dot(g, Math.round(X + Math.cos(a) * 6), Math.round(Y + Math.sin(a) * 2), '#ffe9a0'); } }   /* choáng: 3 sao nhỏ chỉ khi đang choáng */
}
function koE(ctx, E) { E.ko = true; E.act = null; ST.koT = CFG.koT; ST.n.ko++; FX.sink(E.x, E.y, SKIN, FX.power(0.4)); try { ctx.toast(L(ctx).ko); } catch (e) { } log({ ev: 'ko' }); }

/* ---------- vòng chạy ---------- */
function idle95a(ctx, E, p, dt) {   /* p95a: rảnh. Người đi → theo sau (trễ dừng / đi lại, không giật). Người đứng > 1,2 s → đi lững thững quanh 2–3 ô, nghỉ, nhìn quanh, thỉnh thoảng đẩy kính. */
  const W = E.w95 || (E.w95 = { px: p.x, py: p.y, still: 0, goal: null, rest: 0, emote: 6 + Math.random() * 4, folStop: false });
  const pm = Math.hypot(p.x - W.px, p.y - W.py); W.px = p.x; W.py = p.y; W.still = pm > 0.2 ? 0 : W.still + dt;
  if (W.emT > 0) { W.emT -= dt; if (W.emT <= 0) setClip(E, 'idle'); return; }
  const dv = [[0, 1], [-1, 0], [1, 0], [0, -1]][p.dir] || [0, 1], dP = hyp(E, p);
  if (W.still < 1.2 || dP > 70) {   /* theo sau: điểm sau lưng người, dừng khi gần (≤ 8), đi lại khi lệch > 20 */
    W.goal = null; const G = D107.clear(ctx, E, p.x - dv[0] * 36 + (dv[1] ? 26 : 0), p.y - dv[1] * 24 + 3, 10), d = hyp(E, G);
    if (W.folStop && d < 20 && dP < 64) { setClip(E, 'idle'); if (Math.random() < dt * 0.5) face(E, p.x + (Math.random() - 0.5) * 80, p.y + 30); return; }
    W.folStop = d < 8; if (W.folStop) { setClip(E, 'idle'); return; }
    goTo(ctx, E, G.x, G.y, dP > 90 ? CFG.run : Math.min(CFG.spd, 30 + d * 1.6), dt, 3); return;
  }
  if (W.rest > 0) { W.rest -= dt; setClip(E, 'idle'); W.emote -= dt;
    if (W.emote <= 0 && ST.meta && ST.meta.cast) { W.emote = 7 + Math.random() * 5; W.emT = 0.7; setClip(E, 'cast'); }   /* đẩy kính: chỉ clip, không hiệu ứng */
    return; }
  if (!W.goal) {   /* chọn điểm quanh người 2–3 ô, tránh phía trước mặt người */
    for (let k = 0; k < 8 && !W.goal; k++) { const a = Math.random() * Math.PI * 2, r = 34 + Math.random() * 16, gx = p.x + Math.cos(a) * r, gy = p.y + Math.sin(a) * r * 0.7;
      if ((gx - p.x) * dv[0] + (gy - p.y) * dv[1] > 12) continue; const G = D107.clear(ctx, E, gx, gy, 10); W.goal = { x: G.x, y: G.y }; }
    if (!W.goal) W.goal = { x: p.x - dv[0] * 36, y: p.y - dv[1] * 24 + 3 }; }
  if (goTo(ctx, E, W.goal.x, W.goal.y, CFG.spd * 0.55, dt, 3) || E.stuck > 0.6) { W.goal = null; W.rest = 1.4 + Math.random() * 2.2; E.stuck = 0; setClip(E, 'idle');
    const a = Math.floor(Math.random() * 8) * Math.PI / 4; face(E, E.x + Math.cos(a) * 10, E.y + Math.sin(a) * 10); }
}
function tick(ctx, E, dt) {
  const p = ctx.S.player; E.ct += dt; D107.tick(E, dt); if (E.flash > 0) E.flash -= dt; if (E.glint > 0) E.glint -= dt; if (E.shk > 0) E.shk -= dt;
  for (const k in E.cd) E.cd[k] -= dt;
  if (E.stop > 0) { E.stop -= dt; return; }   /* hitstop ngắn của chính Elyziuma */
  const TH = threats(ctx, E);
  if (!TH.length && E.hp < E.max) E.hp = Math.min(E.max, E.hp + CFG.regen * dt);
  if (E.act) { runAct(ctx, E, dt); return; }
  if (hyp(E, p) > 260) { D107.stop(E, 'tele'); const q = near(ctx, p.x - 14, p.y + 4); E.x = q.x; E.y = q.y; ST.n.tele++; log({ ev: 'tele' }); return; }
  if (!TH.length) { idle95a(ctx, E, p, dt); return; }   /* p95a: rảnh — theo mượt / đi lững thững quanh người */

  { const fo = ctx.squad104 && ctx.squad104.focusOf('elyziuma'); if (fo && TH[0].mo === fo && !far(fo) && hyp(E, fo) > 50 && E.stuck < 0.5) { goTo(ctx, E, fo.x - (fo.x > E.x ? 24 : -24), fo.y + 1, CFG.run, dt, 3); return; } }   /* p104rk: lệnh G → Elyziuma áp sát ≤ 50 px rồi mới ra chiêu (trừ mục tiêu bay / dưới nước) */
  if (TH.filter(t => hyp(t.mo, E) <= 34).length >= 3 && E.cd.meet > 0 && E.cd.flare > 0 && !(E.cd.ult <= 0 && (E.en || 0) >= 100) && performance.now() > PW.brkT) { E.cd.meet = 0; PW.brkT = performance.now() + 4000; PW.n.brk++; }   /* p95p: phá vây */
  const id = choose(ctx, E, TH), tg = TH[0].mo;
  if (id === 'punch' && (far(tg) || E.stuck > 0.5) && hyp(E, tg) <= CFG.shot.r) {   /* quái bay / dưới nước / không lại gần được → bắn dấu từ bờ */
    if (E.cd.shot <= 0) { E.cd.punch = 0.4; start(ctx, E, 'shot', { tg }); } else { setClip(E, 'idle'); face(E, tg.x, tg.y); }
    return;
  }
  if (id === 'punch') {
    if (hyp(E, tg) <= CFG.reach) { if (E.cd.punch <= 0) start(ctx, E, 'punch', { tg }); else { setClip(E, 'idle'); face(E, tg.x, tg.y); } }
    else goTo(ctx, E, tg.x - (tg.x > E.x ? 24 : -24), tg.y + 1, CFG.run, dt, 3);
    return;
  }
  if (id === 'fire') { const w = TH.filter(t => hyp(t.mo, E) <= CFG.fire.r && !far(t.mo)).sort((a, b) => a.mo.hp / a.mo.max - b.mo.hp / b.mo.max)[0]; start(ctx, E, 'fire', { tg: w ? w.mo : tg }); return; }
  if (id === 'meet' || id === 'ult') { const ws = within(TH, E, id === 'ult' ? CFG.ult.r : CFG.meet.r); const mx = ws.reduce((s, t) => s + t.mo.x, 0) / ws.length, my = ws.reduce((s, t) => s + t.mo.y, 0) / ws.length; face(E, mx, my); }
  else face(E, tg.x, tg.y);
  if (id === 'flare') { const c = cone(E, TH); if (c.length) { const mx = c.reduce((s, t) => s + t.mo.x, 0) / c.length, my = c.reduce((s, t) => s + t.mo.y, 0) / c.length; face(E, mx, my); } }
  start(ctx, E, id, {});
}


/* ===== p95p: LỰC + VFX khủng (skill vfx-code) ===== */
const PW = { on: false, nocd: false, ultv: 'b', k: { cd: 0.45, dmg: 1.6, ult: 2.4, en: 2, hops: 3, aggro: 220 }, qT: 0, brkT: 0, slowT: 0, darkT: 0, n: { charge: 0, impact: 0, slow: 0, hop: 0, brk: 0 } };
try { const q = new URLSearchParams(location.search); if (q.get('elyzpower') === '1') PW.on = true; } catch (e) { }
const EPAL = { k: ['#ffffff', '#ecfcf3', '#bff3e6', '#8fd8c4', '#3fb3a3', '#1f8a86', '#12636e', '#0b0d1e'], vest: ['#3e4680', '#262e51', '#1a1f3c', '#0b0d1e'], red: ['#ffd9cf', '#ff9a86', '#e5574a', '#a82c34'] };
const SKIN_E = { pal: EPAL.k, glow: ['#ffffff', '#ecfcf3', '#8fd8c4'], shape: 'rock', name: 'ma' };
const SKIN_V = { pal: ['#9aa4d8', '#6a74b0', '#3e4680', '#262e51', '#1a1f3c', '#121630', '#0b0d1e', '#05060e'], glow: ['#ffffff', '#ecfcf3', '#bff3e6'], shape: 'slab', name: 'ma' };
function rq(ctx, s) { const t = performance.now(); if (t < PW.qT) return; PW.qT = t + (PW.on ? 150 : 350); try { if (ctx.quake) ctx.quake(s); } catch (e) { } }   /* rung màn: chỉ lúc trúng, tối đa 1 lần / 0,15 s */
function flashG(ctx, k) { try { ctx.S.flash = Math.max(ctx.S.flash || 0, k); } catch (e) { } }
function slowmo(ctx, sec) { try { ctx.S.timeScale = 0.3; PW.slowT = performance.now() + sec * 1000; PW.n.slow++; setTimeout(() => { if (performance.now() >= PW.slowT - 5 && ctx.S.timeScale === 0.3) ctx.S.timeScale = 1; }, sec * 1000 + 20); } catch (e) { } }
function chargeFx(E, T) {   /* TỤ LỰC: hạt dữ liệu xoáy hút vào kính, kính rực (chỉ trong lúc gồng) */
  PW.n.charge++; const P = []; for (let i = 0; i < 16; i++) P.push({ a: Math.random() * TAU, r: 26 + Math.random() * 14, s: 0.6 + Math.random() * 0.8, c: EPAL.k[Math.floor(Math.random() * 4)] });
  return { t: 0, T, upd(dt, f) { f.t += dt; E.glint = Math.max(E.glint, 0.05); }, y: () => E.y + 0.6, dr(g, cx, cy, f) {
    const e = eyePos(E), k = Math.min(1, f.t / f.T), X = (e.x - cx) * 2, Y = (e.y - cy) * 2;
    for (const q of P) { const r = q.r * 2 * (1 - k * q.s) , a = q.a + k * 5; if (r < 2) continue; const px = Math.round(X + Math.cos(a) * r), py = Math.round(Y + Math.sin(a) * r * 0.6); dot(g, px, py, q.c); if (r > 10) dot(g, px + 1, py, q.c); }
    const R = Math.round(2 + 4 * k); for (let i = -R; i <= R; i++) { dot(g, Math.round(X) + i, Math.round(Y), Math.abs(i) < 2 ? '#ffffff' : EPAL.k[2]); } } };
}
function liveParts() { let k = 0; for (const f of ST.fx) if (f.np && f.t < f.T) k += f.np; return k; }   /* p95t: ngân sách hạt */
function numOK() { const t = performance.now(); PW.nums = (PW.nums || []).filter(x => t - x < 600); if (PW.nums.length >= 6) return false; PW.nums.push(t); return true; }
function dataBurst(x, y, n, pw = 1) {
  n = Math.max(0, Math.min(n, (PW.on ? 200 : 120) - liveParts())); PW.n.parts = (PW.n.parts || 0) + n;   /* mảnh dữ liệu: ô vuông + chữ 0/1 văng theo trọng lực, nảy nhẹ, tắt bằng dither */
  const P = []; for (let i = 0; i < n; i++) { const a = Math.random() * TAU, v = (40 + Math.random() * 70) * pw; P.push({ x, y, z: 6 + Math.random() * 8, vx: Math.cos(a) * v, vy: Math.sin(a) * v * 0.5, vz: 40 + Math.random() * 60 * pw, g: Math.random() < 0.4 ? (Math.random() < 0.5 ? '0' : '1') : '', c: EPAL.k[Math.floor(Math.random() * 5)], s: Math.random() < 0.3 ? 2 : 1 }); }
  return { np: n, t: 0, T: 0.9, upd(dt, f) { f.t += dt; for (const q of P) { q.vz -= 260 * dt; q.z += q.vz * dt; if (q.z < 0) { q.z = 0; q.vz = -q.vz * 0.35; q.vx *= 0.6; q.vy *= 0.6; } q.x += q.vx * dt; q.y += q.vy * dt; q.vx *= 0.97; q.vy *= 0.97; } }, y: () => y + 2, dr(g, cx, cy, f) {
    const fade = f.t < 0.5 ? 0 : (f.t - 0.5) / 0.4;
    for (const q of P) { const X = Math.round((q.x - cx) * 2), Y = Math.round((q.y - q.z - cy) * 2); if (fade > bay(X, Y)) continue;
      if (q.g) { const G = q.g === '0' ? [[0, 0], [1, 0], [0, 1], [1, 1], [0, 2], [1, 2]] : [[1, 0], [1, 1], [1, 2]]; for (const [u, v] of G) dot(g, X + u, Y + v, q.c); }
      else for (let u = 0; u < q.s; u++) for (let v = 0; v < q.s; v++) dot(g, X + u, Y + v, q.c); } } };
}
function hitFx95p(ctx, mo, d, tag) {   /* VA CHẠM chiêu đặc biệt */
  if (!tag || tag === 'punch' || tag === 'shot') return; PW.n.impact++;
  const big = tag === 'ult' || tag === 'fire', E = ST.E, pw = PW.on ? 1.3 : 1;
  if (E) E.stop = Math.max(E.stop || 0, 0.07); mo.stun95 = Math.max(mo.stun95 || 0, now() + 0.07);
  rq(ctx, big ? 0.22 : 0.1); if (big) flashG(ctx, 0.18);
  if (!ON113(tag)) { ST.fx.push(dataBurst(mo.x, mo.y - 6, big ? 18 : 10, pw));
  FX.shockRing(mo.x, mo.y + 1, (big ? 26 : 16) * pw, SKIN_E, 0.32, 3); FX.shockRing(mo.x, mo.y + 1, (big ? 14 : 9) * pw, SKIN_V, 0.22, 2); }
  if (big && (tag === 'ult' || !(mo.hp > 0))) FX.crack(mo.x, mo.y + 1, SKIN_V, 7, false, 5, 1.2);   /* nứt đất nhỏ, chỉ cú chốt (bản 1 vết đen loang nhiều quá) */
  if (numOK()) FX.shout(mo.x, mo.y - 30, '-' + d, big ? '#ffffff' : '#bff3e6', big ? 2 : 1, 0.75); else PW.n.numSkip = (PW.n.numSkip || 0) + 1;
}
function ultFxB(E, Rhit) {   /* bản b: vòng xoáy dữ liệu quét + mưa mảnh — giữ để so */
  const X0 = E.x, Y0 = E.y, R = Math.max(50, Math.min(CFG.ult.r, Rhit || CFG.ult.r)), T0 = 0.85;
  return { t: 0, T: 1.6, ground: true, upd(dt, f) { f.t += dt; if (f.t < T0) E.glint = Math.max(E.glint, 0.06); }, dr(g, cx, cy, f) {
    const t = f.t, X = (X0 - cx) * 2, Y = (Y0 - cy) * 2, grow = Math.min(1, t / T0), fade = t < 1.1 ? 0 : (t - 1.1) / 0.5;
    for (let arm = 0; arm < 3; arm++) for (let r = 8; r < R * 2 * grow; r += 1) { const a = arm * TAU / 3 + r / 22 - t * 6, px = Math.round(X + Math.cos(a) * r), py = Math.round(Y + Math.sin(a) * r * 0.5); if (0.8 - r / (R * 2) * 0.4 - fade < bay(px, py)) continue; dot(g, px, py, r < R ? EPAL.k[1] : EPAL.k[3]); }
    if (t > T0 && t < T0 + 0.4) { const k = (t - T0) / 0.4, r = R * 2 * (0.3 + 0.8 * k), n = Math.round(r * 6.5); for (let q = 0; q < 4; q++) for (let i = 0; i < n; i++) { const a = i / n * TAU, px = Math.round(X + Math.cos(a) * (r - q)), py = Math.round(Y + Math.sin(a) * (r - q) * 0.5); if (1 - k * 0.6 - q * 0.15 < bay(px, py)) continue; dot(g, px, py, q ? EPAL.k[2] : '#ffffff'); } } } };
}
function ultShow(ctx, E, targets) {   /* màn lớn: nền tối nhẹ 0,5 s + vòng sơ đồ khổng lồ + cột sáng từng mục tiêu */
  PW.darkT = performance.now() + 500; const L = targets.map(mo => ({ x: mo.x, y: mo.y }));
  return { t: 0, T: 0.75, upd(dt, f) { f.t += dt; }, y: () => E.y + 200, dr(g, cx, cy, f) {   /* cột sáng: vẽ ở drawables (trên thân, y lớn) — ngắn 0,45 s */
    const k = f.t / 0.45; if (k > 1) return;
    for (const P0 of L) { const X = Math.round((P0.x - cx) * 2), Y = Math.round((P0.y - cy) * 2), H = Math.round(110 * Math.min(1, k * 3)), w = k < 0.3 ? 5 : Math.round(5 * (1 - (k - 0.3) / 0.7)) + 1;
      for (let yy = 0; yy < H; yy++) for (let xx = -w; xx <= w; xx++) { const e = Math.abs(xx) / (w + 1), dens = (1 - e) * (1 - yy / H * 0.6) - k * 0.3; if (dens < bay(X + xx, Y - yy)) continue; dot(g, X + xx, Y - yy, Math.abs(xx) < 2 ? '#ffffff' : EPAL.k[2]); } } } };
}
function darkGround(g, ctx) {   /* nền tối nhẹ trong lúc tuyệt chiêu (chỉ lớp nền — nhân vật vẽ sau vẫn sáng) */
  const t = PW.darkT - performance.now(); if (t <= 0) return; const a = Math.min(1, t / 150) * 0.32; g.save(); g.globalAlpha = a; g.fillStyle = '#0b0d1e'; g.fillRect(-4, -4, (ctx.VW || 400) + 8, (ctx.VH || 300) + 8); g.restore();
}

export const elyz95 = {
  id: 'elyz95',
  always: true,
  onZoneEnter(ctx) {
    ST.ctx = ctx; ST.fx = []; ST.foes = []; if (ST.E) { const p = ctx.S.player; ST.E.x = p.x - 14; ST.E.y = p.y + 4; ST.E.act = null; }
    loadArt();
    ctx.elyz95 = { E: () => ST.E, on: () => active(ctx) && !(ST.koT > 0),   /* p106 */ pop: () => { if (active(ctx) || team0(ctx)) { ST.E = null; ST.popNext = true; } }, recall: () => { if (ST.E) FX.sink(ST.E.x, ST.E.y, SKIN, FX.power(0.3)); ST.E = null; }, pos: () => ST.E && { x: ST.E.x, y: ST.E.y },
      E: () => ST.E, koT: () => ST.koT, hurt: d => { const E = ST.E; if (E && !E.ko) { E.hp -= d; E.flash = 0.12; ST.n.foeHitE++; if (E.hp <= 0) koE(ctx, E); } },   /* p104: squad104 đỡ đòn / bị đánh thay */
      cast: id => { const E = ST.E; if (!E || E.ko) return false; const k = id || ['fire', 'flare', 'stamp', 'meet', 'ult'].find(q => E.cd[q] <= 0); if (!k) return false; E.cd[k] = 0; ST.force = k; return k; },
      drawAt: (g, x, y) => ST.meta && drawEly(g, { x, y, fx: 0.01, fy: 1, clip: (ST.meta && ST.meta.idle_s) ? 'idle_s' : 'idle', ct: 0, hp: 1, max: 1, flash: 0, glint: 0, shk: 0 }, 0, 0) };
    if (typeof window !== 'undefined') window.__elyz = { power: v => { PW.on = !!+v; return PW.on; }, nocd: v => { PW.nocd = !!+v; return PW.nocd; }, novfx: v => { PW.novfx = !!+v; return PW.novfx; },   /* p95t: tắt vẽ VFX riêng của Elyziuma (chỉ để đo fps) */ ultv: v => { if (v === 'a' || v === 'b') PW.ultv = v; return PW.ultv; }, state: () => ({ power: PW.on, nocd: PW.nocd, ultv: PW.ultv, en: ST.E ? Math.round(ST.E.en || 0) : 0, n: { ...PW.n } }) };   /* p95p: công tắc video / đạo diễn */
    if (typeof window !== 'undefined') window.__ely = {
      gang: (n = 4) => gang(ctx, n), cast: id => { if (ORDER.includes(id) && ST.E) { ST.E.cd[id] = 0; ST.force = id; return true; } return false; },
      state: () => { const E = ST.E; return { on: active(ctx), ver: ST.ver, art: !!ST.meta, E: E && { x: Math.round(E.x), y: Math.round(E.y), hp: Math.round(E.hp), max: E.max, clip: E.clip, act: E.act && E.act.id, ko: E.ko, dir: dirOf(E.fx, E.fy), cd: Object.fromEntries(Object.entries(E.cd).map(([k, v]) => [k, +Math.max(0, v).toFixed(1)])) },
        n: JSON.parse(JSON.stringify(ST.n)), foes: ST.foes.filter(valid).map(mo => ({ sp: mo.c.gang95, hp: Math.round(mo.hp), max: mo.max, x: Math.round(mo.x), y: Math.round(mo.y), tgt: mo.tgt95 || 'P', mark: (mo.mark95 || 0) > now(), stun: (mo.stun95 || 0) > now() })),
        fx: ST.fx.length, koT: +ST.koT.toFixed(1), player: { x: Math.round(ctx.S.player.x), y: Math.round(ctx.S.player.y), hp: ctx.hero ? Math.round(typeof ctx.hero.hp === 'function' ? ctx.hero.hp() : ctx.hero.hp) : null, max: ctx.hero ? (typeof ctx.hero.max === 'function' ? ctx.hero.max() : ctx.hero.max) : null } }; },
      log: () => ST.log.slice(), cfg: CFG, E: () => ST.E, clearGang: () => { for (const mo of monList(ctx).filter(m => m.c && m.c.gang95)) try { ctx.monsters.remove(mo); } catch (e) { } ST.foes = []; }, setHp: v => { if (ST.E) ST.E.hp = v; } };
  },
  onZoneLeave() { ST.fx = []; ST.foes = []; },
  update(dt, ctx) {
    if (PW.slowT && performance.now() > PW.slowT && ctx.S.timeScale === 0.3) { ctx.S.timeScale = 1; PW.slowT = 0; }   /* p95p: hết chậm */
    ST.ctx = ctx; dt = Math.min(dt, 0.05);
    if (duelOn(ctx) || ctx.S.mode !== 'play') return;
    updFx(dt);
    if (!active(ctx)) { ST.E = null; return; }
    if (!ST.meta) loadArt();
    if (ST.koT > 0) { ST.koT -= dt; if (ST.koT <= 0) { ST.E = null; ST.popNext = true; try { ctx.toast(L(ctx).back); } catch (e) { } } return; }
    if (!ST.E || ST.E.ko) { if (ST.E && ST.E.ko) return; mkE(ctx, !!ST.popNext); ST.popNext = false; }
    tick(ctx, ST.E, dt);
  },
  drawGround(g, ctx, cx, cy) {
    darkGround(g, ctx);
    if (duelOn(ctx)) return; for (const f of ST.fx) if (f.ground && !PW.novfx) f.dr(g, cx, cy, f);
    const E = ST.E; if (!E || E.ko || !active(ctx) || ST.koT > 0) return; D107.ground(g, E, cx, cy); if (SHADOW.on) shadowFor(g, E.x, E.y, (globalThis.__R89||Math.round)(E.x - cx), (globalThis.__R89||Math.round)(E.y - cy) + 1, (globalThis.__fw110 ? globalThis.__fw110('elyziuma', 25) : 25), E.z || 0);
  },
  drawables(ctx, cx, cy) {
    if (duelOn(ctx)) return []; const out = [], g = ctx.g;
    for (const f of ST.fx) if (!f.ground && !PW.novfx) out.push({ y: f.y ? f.y() : 1e9, f: () => f.dr(g, cx, cy, f) });
    const E = ST.E; if (E && !E.ko && active(ctx) && !(ST.koT > 0)) { out.push({ y: E.y, f: () => D107.draw(E, g, cx, cy, (gg, a, c, gh) => drawEly107(gg, E, a, c, gh)) }); D107.drawables(out, E, g, cx, cy); }
    return out;
  },
};
