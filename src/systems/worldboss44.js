/* worldboss44.js — c44-boss (anh duyệt 05/11): BOSS THẾ GIỚI — Nữ Hoàng Gương hiện ở Quảng Trường Làng cho cả phòng chơi chung hợp sức đánh.
   · LỊCH: theo giờ thật chung (Date.now + lệch giờ máy chủ của đồng hồ c38) — mỗi 30 phút (phút :00 / :30; anh đổi 05/11), báo trước 30 s, ở tối đa 5 phút rồi rút vào gương.
     Chơi MỘT MÌNH vẫn có boss (máu 1 người) để người chơi lẻ cũng đánh được. Mỗi đợt chỉ 1 lần (save.sys.wb44.done).
   · MÁU theo số người trong Làng: max = gốc × (1 + 0,8 × (n − 1)); người vào thêm giữa trận → máu tối đa tăng theo tỉ lệ (máu hiện có giữ % cũ).
   · QUYỀN: chủ phòng (NET.role 'host') hoặc máy chơi một mình chạy AI + máu thật, phát gói 'wb' 10 lần/giây (≈ 300 byte). Khách vẽ theo gói (nội suy),
     gửi sát thương 'wbhit' 5 lần/giây (chủ phòng kiểm khoảng cách + trần sát thương mỗi giây). Đòn boss: gói chứa chiêu đang ra (id, loại, thời điểm, chỗ nhắm)
     → MỌI MÁY tự tính trúng cho người chơi + Chấn Thú của CHÍNH MÌNH (đòn mạnh hất 'fly', đòn nhẹ 'stagger').
   · Chủ phòng rời giữa trận → chủ mới đã có gói 'wb' cuối (máu, chỗ đứng, giờ còn lại, bảng góp sát thương) → chạy tiếp, KHÔNG reset máu.
   · Boss chết → chủ phòng phát 'wbend' (bảng góp) → mỗi máy tự cộng thưởng theo tỉ lệ góp (ctx.give / chanthu.addBall / fieldct.tnAdd — không cộng thẳng inv).
   · Sprite PixelLab của Nữ Hoàng (assets/px/boss/guong, 8 hướng, vẽ 1:1); VFX va chạm dùng sheet gm_* sẵn có; vạch báo đòn / tia vẽ code, chỉ hiện lúc ra chiêu.
   Móc test: window.__wb44. */
import { NET } from './farm106.js';
import { ART } from '../art.js';
import { SHADOW, shadowFor } from './shadow.js';
import { lastBossBar } from './bosscam.js';
import { newbieNow } from './detho121.js';   /* c70-detho (plan-121 A4): người đang Nhập môn KHÔNG gặp boss thế giới */

const TS = 16, ZONE = 'village';
const CF = { period: 30 * 60, warn: 30, life: 300, snapHz: 10, hitHz: 5, lerp: 12, snap: 64, leash: 300, hpK: 0.8, capFrac: 0.05, capMin: 900 };
const STR = {
  vi: { name: 'Nữ Hoàng Gương · Boss Thế Giới', soon: s => `⚠ Boss thế giới Nữ Hoàng Gương sắp xuất hiện ở Quảng Trường Làng (${s} s)`, up: '✦ BOSS THẾ GIỚI: Nữ Hoàng Gương xuất hiện ở Quảng Trường Làng — cùng hợp sức đánh!',
    here: '✦ Nữ Hoàng Gương đang ở Quảng Trường Làng', down: 'Nữ Hoàng Gương vỡ tan!', flee: 'Nữ Hoàng Gương rút vào gương… (hết giờ)', pin: 'Boss thế giới: Nữ Hoàng Gương', pinSoon: s => `Boss thế giới sắp tới (${s} s)`,
    you: 'Bạn', share: (p, n) => `Góp ${p}% · ${n} người`, reward: (p, a) => `Thưởng boss (góp ${p}%): ${a}`, last: 'Đòn kết liễu!', stone: 'đá', soul: 'hồn', ball: 'Ấn Thu', tn: 'Tiềm Năng Quang', xp: 'XP', none: 'Bạn chưa góp sát thương — không có thưởng' },
  en: { name: 'Mirror Queen · World Boss', soon: s => `⚠ World boss Mirror Queen appears in the Village Square soon (${s}s)`, up: '✦ WORLD BOSS: the Mirror Queen appears in the Village Square — team up!',
    here: '✦ The Mirror Queen is in the Village Square', down: 'The Mirror Queen shatters!', flee: 'The Mirror Queen retreats into the glass… (time up)', pin: 'World boss: Mirror Queen', pinSoon: s => `World boss soon (${s}s)`,
    you: 'You', share: (p, n) => `Dealt ${p}% · ${n} players`, reward: (p, a) => `Boss reward (${p}% dealt): ${a}`, last: 'Final blow!', stone: 'stones', soul: 'souls', ball: 'Seal Orb', tn: 'Light Potential', xp: 'XP', none: 'You dealt no damage — no reward' },
};
const L = ctx => STR[ctx.lang && ctx.lang() === 'en' ? 'en' : 'vi'];
/* c70-detho: NB = máy này là người mới → boss ẩn HẲN ở máy này (không vẽ, không tiếng, không trúng đòn, không báo, không ghim, không bị nhắm).
   Một mình / khách: không sinh / bỏ qua gói 'wb'. Chủ phòng chơi chung: vẫn chạy boss 'bóng' (AI + máu + gói 'wb' + nhận 'wbhit') cho người khác, chỉ không có quái trong ctx.monsters ở máy mình. */
const NB = ctx => !!(ctx && ctx.S && newbieNow(ctx.S));
const KINDS = ['sweep', 'bolt', 'lance', 'warp', 'dodge'];
const CLIPS = ['idle', 'walk', 'control', 'cast', 'vanish', 'stun', 'shatter'];
const DMG = { sweep: 0.10, bolt: 0.07, lance: 0.06, warp: 0.10 };   /* × máu tối đa nạn nhân */
const CDS = { sweep: 1.5, bolt: 3.4, lance: 9, warp: 12 };
const SPD = [80, 94];   /* px/s — nhanh hơn người chơi rõ rệt (luật 13/10) */
const R_SWEEP = 44, R_WARP = 42, R_LANCE = 15, BOLT_LEN = 210, BOLT_SPREAD = 0.62, NEAR = 30;
const DIR8 = ['east', 'south-east', 'south', 'south-west', 'west', 'north-west', 'north', 'north-east'];
const dirIx = (dx, dy) => ((Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) % 8) + 8) % 8;
const SPEC = ['#ff4848', '#ff9a30', '#ffe040', '#50e060', '#40b0ff', '#5a64ff', '#b464ff'];
const COLN = ['red', 'orange', 'yellow', 'green', 'blue', 'violet'];

/* ---------- ảnh ---------- */
const IM = {};
function img(src) { if (!IM[src]) { const i = new Image(); i.src = 'assets/px/' + src; IM[src] = i; } const i = IM[src]; return i.complete && i.naturalWidth ? i : null; }
let QM = null, QM_T = 0;
function loadQM() { if (QM || typeof fetch === 'undefined' || Date.now() - QM_T < 5000) return; QM_T = Date.now(); fetch('assets/px/boss/guong/q.json').then(r => r.json()).then(j => { QM = j; for (const c of Object.values(j.clips)) img(c.file); for (const c of COLN) img(`boss/guong/shards/small/shard_${c}.png`); }).catch(() => { }); }
const Q_FPS = { idle: 6, walk: 10, control: 12, cast: 12, vanish: 12, stun: 6, shatter: 10 };
const Q_LOOP = { idle: 1, walk: 1, stun: 1 };
function rowOf(c, d) { if (c.rows.length === 1) return { row: 0, flip: false }; const flip = /west/.test(d), m = d.replace('west', 'east'); let r = c.rows.indexOf(m); if (r < 0) r = 0; return { row: r, flip }; }
function drawQ(g, Q, x, y) {   /* ảnh 2× PixelLab → ô cw/2 × ch/2 logic (1:1 với người chơi), chân ở đáy ô − 1 */
  if (!QM) return false; let c = QM.clips[Q.clip] || QM.clips.idle, im = c && img(c.file); if (!im) { c = QM.clips.idle; im = c && img(c.file); if (!im) return false; }
  const n = Q.clip === 'vanish' ? Math.max(1, c.n - 1) : c.n, fr = Math.floor(Q.t * (Q_FPS[Q.clip] || 8)), f = (Q_LOOP[Q.clip] ? fr % n : Math.min(n - 1, fr)) % c.n;
  const RF = rowOf(c, DIR8[Q.dir | 0] || 'south'), cw = QM.cw, ch = QM.ch, dw = cw / 2, dh = ch / 2, X = Math.round(x), Y = Math.round(y);
  g.save(); g.imageSmoothingEnabled = false; if (Q.alpha != null && Q.alpha < 1) g.globalAlpha = Math.max(0, Q.alpha);
  if (RF.flip) { g.translate(X, 0); g.scale(-1, 1); g.drawImage(im, f * cw, RF.row * ch, cw, ch, -dw / 2, Y - dh + 1, dw, dh); }
  else g.drawImage(im, f * cw, RF.row * ch, cw, ch, X - dw / 2, Y - dh + 1, dw, dh);
  g.restore(); return true;
}
const VX = n => ART.vfx && ART.vfx[n];
function drawSheet(g, s, f, x, y, alpha = 1) {
  const hi = s.img.__hi ? 1 : 2, ax = s.ax != null ? s.ax : s.w / 2, ay = s.ay != null ? s.ay : s.h;
  g.save(); g.imageSmoothingEnabled = false; g.globalAlpha = alpha; g.drawImage(s.img, f * s.w * hi, 0, s.w * hi, s.h * hi, Math.round(x - ax), Math.round(y - ay), s.w, s.h); g.restore();
}

/* ---------- trạng thái ---------- */
const B0 = () => ({ id: null, mo: null, x: 0, y: 0, hp: 0, mx: 0, base: 0, n: 1, end: 0, home: null, q: { clip: 'idle', t: 0, dir: 2, alpha: 1 }, act: null, cd: { sweep: 0.5, bolt: 1.5, lance: 5, warp: 8 },
  dmg: {}, last: null, tg: null, tgT: 0, recent: [], skills: [], shown: 0, pend: 0, sent: 0, ack: 0, tx: null, ty: null, lastSnap: 0, enr: false, stuckT: 0, sideT: 0, side: 1, dodgeCd: 0 });
const ST = { B: null, ctx: null, fx: [], rays: [], tele: [], corpse: null, warned: null, upSaid: null, snapT: 0, hitT: 0, srvT: 0, srvOff: 0, seenAct: new Set(), log: [], n: { tx: 0, rx: 0, hitTx: 0, hitRx: 0, rej: 0, acts: {}, hitsMe: {}, hitsU: 0, ends: 0 }, tok: new Map(), rew: null, forced: null, aid: 0, simT: 0 };
const lg = e => { ST.log.push({ t: +(((ST.ctx && ST.ctx.S.time) || 0)).toFixed(2), ...e }); if (ST.log.length > 200) ST.log.shift(); };
const inZone = ctx => !!(ctx.S.zone && ctx.S.zone.id === ZONE && ctx.S.player && ctx.S.map);
const api = () => NET.pkApi || null;
const online = () => { const a = api(); return !!(a && a.on && a.on()); };
const myId = () => { const a = api(); return (online() && a.id && a.id()) || 'me'; };
const auth = () => NET.role !== 'guest' || !online();   /* chủ phòng / một mình → máu + AI thật */
function send(o) { const a = api(); if (!a || !online()) return false; const ok = a.send(o); if (ok) ST.n.tx++; return ok; }
function sv(ctx) { const s = ctx.S.save; s.sys ||= {}; const w = (s.sys.wb44 ||= {}); w.done ||= []; w.wins ||= 0; return w; }
function nowMs(ctx) {   /* giờ thật chung (lệch giờ máy chủ của c38) — đọc lệch 1 lần / 5 s */
  const t = Date.now(); if (t - ST.srvT > 5000) { ST.srvT = t; try { const w = ctx.clock && ctx.clock.world ? ctx.clock.world() : null; ST.srvOff = (w && +w.srvOffsetMs) || 0; } catch (e) { ST.srvOff = 0; } }
  return t + ST.srvOff;
}
function nxOf(ctx) { const w = sv(ctx); if (!(w.nx > 0)) { const P = CF.period * 1000; w.nx = Math.ceil(nowMs(ctx) / P) * P; } return w.nx; }   /* anh 05/11: boss hiện lại 30 phút SAU khi kết thúc (hạ / rút); chủ phòng phát mốc 'wbn' cho cả phòng */
function slotInfo(ctx) { const nx = nxOf(ctx), now = nowMs(ctx); return { k: nx, ph: (now - nx) / 1000, id: 'N' + nx, toNext: (nx - now) / 1000 }; }

/* ---------- vị trí ---------- */
const solid = (ctx, x, y) => { const m = ctx.S.map; return ctx.isSolid(m, Math.floor(x / TS), Math.floor(y / TS)); };
function spawnPoint(ctx) {   /* quảng trường (world.js plaza88) → ô trống có khoảng 3×3 đi được gần nhất, lệch Nam tượng đài */
  const m = ctx.S.map, P = m.plaza88 || (m.v88 && m.v88.plaza) || { x: Math.floor(m.w / 2), y: Math.floor(m.h / 2) };
  const sx = P.x, sy = P.y + 4, ok = (x, y) => { for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) if (ctx.isSolid(m, x + a, y + b)) return false; return true; };
  for (let r = 0; r < 14; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue; const x = sx + dx, y = sy + dy; if (x > 1 && y > 1 && x < m.w - 2 && y < m.h - 2 && ok(x, y)) return { x: x * TS + 8, y: y * TS + 12 }; }
  return { x: sx * TS + 8, y: sy * TS + 12 };
}
function moveB(ctx, B, dx, dy, sp, dt) {   /* lướt có va chạm; kẹt > 0,6 s → đi xuyên (không đứng kẹt sau vật) */
  const d = Math.hypot(dx, dy) || 1, s = sp * dt, nx = B.x + dx / d * s, ny = B.y + dy / d * s;
  if (B.stuckT > 0.6 || !solid(ctx, nx, ny)) { B.x = nx; B.y = ny; if (!solid(ctx, nx, ny)) B.stuckT = 0; }
  else if (!solid(ctx, nx, B.y)) B.x = nx; else if (!solid(ctx, B.x, ny)) B.y = ny; else B.stuckT += dt;
}

/* ---------- mục tiêu (chủ phòng): mình, người khác, Chấn Thú của mình + của người khác ---------- */
function targets(ctx) {
  const B = ST.B, out = [], p = ctx.S.player, H = B.home, inL = o => Math.hypot(o.x - H.x, o.y - H.y) < CF.leash;
  const nb = NB(ctx); if (!nb && !(ctx.hero && ctx.hero.fainted) && inL(p)) out.push({ k: 'pl', id: 'me', o: p });
  const q = ctx.squad104; if (!nb && q && q.units) { try { for (const u of q.units()) { if (!u.onField || !u.onField() || u.ko) continue; const o = u.pos && u.pos(); if (o && inL(o)) out.push({ k: 'u', id: 'u' + u.id, o }); } } catch (e) { } }
  const A = api(); if (A && online() && A.peers) { for (const P of A.peers()) { if (!P.ko && P.ent && inL(P.ent)) out.push({ k: 'pp', id: 'p' + P.id, o: P.ent }); if (P.units) for (const [k, u] of P.units) if (u.e && inL(u.e)) out.push({ k: 'pu', id: 'pu' + P.id + k, o: u.e }); } }
  return out;
}
function players(ctx) { let n = 1; const A = api(); if (A && online() && A.peers) n += A.peers().length; return n; }

/* ---------- hiệu ứng (chỉ khi có sự kiện) ---------- */
function fx(name, x, y, top = true) { const s = VX(name); if (!s) return; ST.fx.push({ s, x, y, t: 0, dur: s.n / (s.fps || 12), top }); }
function tele(o) { ST.tele.push({ t: 0, ...o }); }

/* ---------- chiêu ---------- */
function newAct(ctx, B, k, extra) {
  const T = { sweep: B.enr ? 0.5 : 0.62, bolt: B.enr ? 0.6 : 0.78, lance: 1.0, warp: 1.1, dodge: 0.26 }[k];
  const A = { id: (++ST.aid) * 7 + (Math.random() * 7 | 0), k, t: 0, T, ...extra }; B.act = A; B.skills.push(k); if (B.skills.length > 60) B.skills.shift(); ST.n.acts[k] = (ST.n.acts[k] || 0) + 1; lg({ ev: 'act', k });
  beginAct(ctx, B, A); return A;
}
const fresh = (B, k) => { const s = B.skills, n = s.length; return !(n >= 2 && s[n - 1] === k && s[n - 2] === k); };
function beginAct(ctx, B, A) {   /* mọi máy: vạch báo + clip */
  ST.seenAct.add(A.id); if (ST.seenAct.size > 50) ST.seenAct.delete(ST.seenAct.values().next().value);
  const Q = B.q; const play = c => { Q.clip = c; Q.t = 0; };
  if (A.k === 'sweep') { play('control'); tele({ type: 'ring', x: A.x, y: A.y, r: R_SWEEP, T: A.T - A.t }); sfx(ctx, 'spar_charge'); }
  else if (A.k === 'bolt') { play('cast'); Q.dir = dirIx(Math.cos(A.a), Math.sin(A.a)); tele({ type: 'fan', x: A.x, y: A.y, a: A.a, T: A.T - A.t }); sfx(ctx, 'spar_charge'); }
  else if (A.k === 'lance') { play('control'); for (const [x, y] of A.pts) tele({ type: 'mark', x, y, r: R_LANCE, T: A.T - A.t }); sfx(ctx, 'whirl'); }
  else if (A.k === 'warp') { play('vanish'); tele({ type: 'ring', x: A.wx, y: A.wy, r: R_WARP, T: A.T - A.t, col: '#d6c2ff' }); fx('gm_glint', B.x, B.y - 30); sfx(ctx, 'whoosh_big'); }
  else if (A.k === 'dodge') { play('walk'); fx('gm_glint', B.x, B.y - 20); }
}
function sfx(ctx, n) { if (NB(ctx)) return; try { ctx.sfx(n); } catch (e) { } }
function segD(px, py, x0, y0, x1, y1) { const dx = x1 - x0, dy = y1 - y0, l2 = dx * dx + dy * dy || 1, u = Math.max(0, Math.min(1, ((px - x0) * dx + (py - y0) * dy) / l2)); return Math.hypot(px - x0 - dx * u, py - y0 - dy * u); }
const inEll = (o, x, y, r) => Math.hypot(o.x - x, (o.y - y) / 0.7) < r;   /* vùng tròn trên mặt đất (vẽ elip ry = 0,7 r) */
function boltRays(ctx, A) {   /* 7 tia phổ từ tay Nữ Hoàng — dừng ở vật cứng (mọi máy tính giống nhau) */
  const out = []; for (let i = 0; i < 7; i++) { const a = A.a + (i - 3) * BOLT_SPREAD / 6, ux = Math.cos(a), uy = Math.sin(a); let len = BOLT_LEN; for (let s = 8; s < BOLT_LEN; s += 4) if (solid(ctx, A.x + ux * s, A.y + uy * s)) { len = s; break; } out.push({ x0: A.x, y0: A.y, x1: A.x + ux * len, y1: A.y + uy * len, col: i }); } return out;
}
/* đòn trúng — MỖI MÁY tính cho người chơi + Chấn Thú của CHÍNH MÌNH */
function hitMine(ctx, A, test, frac, react, from, power = 1) {
  if (NB(ctx)) return 0;   /* c70-detho */
  const p = ctx.S.player, h = ctx.hero; let n = 0;
  if (h && !h.fainted && test(p)) { const ok = h.hit(Math.max(1, Math.round(h.max * frac))); if (!ok) lg({ ev: 'blocked', k: A.k, knocked: !!(ctx.knocked && ctx.knocked()), ki: typeof window !== 'undefined' && window.__ki ? (s => ({ ifr: s.ifr, mv: s.mv && s.mv.kind, auto: s.auto }))(window.__ki.state()) : null }); if (ok) { n++; ST.n.hitsMe[A.k] = (ST.n.hitsMe[A.k] || 0) + 1; lg({ ev: 'hitMe', k: A.k, react }); if (ctx.knockPlayer && react) { const d = Math.hypot(p.x - from.x, p.y - from.y) || 1; ctx.knockPlayer({ type: react, power, dir: { x: (p.x - from.x) / d, y: (p.y - from.y) / d }, src: from }); } } }
  const q = ctx.squad104; if (q && q.units && q.hurt) { try { for (const u of q.units()) { if (!u.onField || !u.onField() || u.ko) continue; const o = u.pos && u.pos(); if (o && test(o)) { q.hurt(u, Math.max(1, Math.round((u.max || 100) * frac * 1.1)), from); n++; ST.n.hitsU++; } } } catch (e) { } }
  return n;
}
function impact(ctx, B, A) {
  if (A.k === 'sweep') { fx('gm_prism', A.x, A.y - 16); sfx(ctx, 'whoosh_big'); hitMine(ctx, A, o => inEll(o, A.x, A.y, R_SWEEP), DMG.sweep, 'fly', { x: A.x, y: A.y }, 1); }
  else if (A.k === 'bolt') { const R = boltRays(ctx, A); for (const r of R) ST.rays.push({ ...r, t: 0, life: 0.45, by: B.y }); fx('gm_glint', A.x, A.y - 4); sfx(ctx, 'hit'); let done = false;
    hitMine(ctx, A, o => { if (done && o === ctx.S.player) return false; const ok = R.some(r => segD(o.x, o.y - 6, r.x0, r.y0, r.x1, r.y1) < 8); return ok; }, DMG.bolt, 'stagger', { x: A.x, y: A.y }, 0.9); }
  else if (A.k === 'lance') { for (const [x, y] of A.pts) fx('gm_shatter', x, y - 6); sfx(ctx, 'smash'); hitMine(ctx, A, o => A.pts.some(([x, y]) => inEll(o, x, y, R_LANCE)), DMG.lance, 'stagger', { x: A.pts[0][0], y: A.pts[0][1] - 20 }, 0.8);
    if (ctx.quake && !NB(ctx)) ctx.quake(0.12); }
  else if (A.k === 'warp') { fx('gm_arrive', A.wx, A.wy); fx('gm_ripple', A.wx, A.wy, false); sfx(ctx, 'smash'); hitMine(ctx, A, o => inEll(o, A.wx, A.wy, R_WARP), DMG.warp, 'fly', { x: A.wx, y: A.wy }, 1.1); if (ctx.quake && !NB(ctx)) ctx.quake(0.18); }
}
function actTick(ctx, B, A, dt) {   /* mọi máy chạy (khách theo đồng hồ riêng từ lúc nhận) */
  const t0 = A.t; A.t += dt; const Q = B.q;
  if (A.k === 'warp' && t0 < 0.45 && A.t >= 0.45 && auth()) { B.x = A.wx; B.y = A.wy; }
  if (A.k === 'warp') { Q.alpha = A.t < 0.45 ? 1 - A.t / 0.45 : A.t < A.T ? 0 : Math.min(1, (A.t - A.T) / 0.2); if (A.t >= A.T && Q.clip === 'vanish' && !A.rev) { A.rev = true; Q.clip = 'cast'; Q.t = 0; } }
  if (A.k === 'dodge' && auth()) { const u = Math.min(1, A.t / A.T); B.x = A.x0 + (A.wx - A.x0) * u; B.y = A.y0 + (A.wy - A.y0) * u; }
  if (!A.hit && A.t >= A.T && A.k !== 'dodge') { A.hit = true; impact(ctx, B, A); }
  const dur = A.T + (A.k === 'warp' ? 0.4 : A.k === 'lance' ? 0.35 : A.k === 'dodge' ? 0 : 0.4);
  if (A.t >= dur) { B.act = null; Q.alpha = 1; if (auth() && A.k !== 'dodge') B.cd[A.k] = CDS[A.k] * (B.enr ? 0.72 : 1); if (A.k === 'dodge') B.recent = []; }
}

/* ---------- AI (chủ phòng / một mình) ---------- */
function ai(ctx, B, dt) {
  const Q = B.q; for (const k in B.cd) if (B.cd[k] > 0) B.cd[k] -= dt;
  if (!B.enr && B.hp <= B.mx * 0.5) { B.enr = true; sfx(ctx, 'roar_big'); lg({ ev: 'enrage' }); }
  if (B.act) return actTick(ctx, B, B.act, dt);
  const T = targets(ctx);
  if (!T.length) { const H = B.home, d = Math.hypot(H.x - B.x, H.y - B.y); if (d > 6) { moveB(ctx, B, H.x - B.x, H.y - B.y, SPD[0], dt); Q.clip !== 'walk' && (Q.clip = 'walk', Q.t = 0); Q.dir = dirIx(H.x - B.x, H.y - B.y); } else if (Q.clip !== 'idle') { Q.clip = 'idle'; Q.t = 0; } B.tg = null; return; }
  B.tgT -= dt; let tg = B.tg && T.find(c => c.id === B.tg); if (!tg || B.tgT <= 0) {   /* đổi mục tiêu 3–5 s: 60 % gần nhất, 40 % ngẫu nhiên (ai cũng có thể bị nhắm) */
    const near = T.slice().sort((a, b) => Math.hypot(a.o.x - B.x, a.o.y - B.y) - Math.hypot(b.o.x - B.x, b.o.y - B.y));
    tg = Math.random() < 0.6 ? near[0] : T[(Math.random() * T.length) | 0]; B.tg = tg.id; B.tgT = 3 + Math.random() * 2;
  }
  const o = tg.o, dx = o.x - B.x, dy = o.y - B.y, d = Math.hypot(dx, dy) || 1;
  B.recent = B.recent.filter(t => ctx.S.time - t < 1.6);
  if (B.recent.length >= 3 && B.dodgeCd <= ctx.S.time) {   /* bị chém liên tiếp → lướt né */
    B.dodgeCd = ctx.S.time + 3.5; const s = Math.random() < 0.5 ? 1 : -1;
    for (const [ax, ay] of [[-dy / d * s, dx / d * s], [dy / d * s, -dx / d * s], [-dx / d, -dy / d]]) { const wx = B.x + ax * 56, wy = B.y + ay * 56; if (!solid(ctx, wx, wy) && !solid(ctx, (wx + B.x) / 2, (wy + B.y) / 2)) return newAct(ctx, B, 'dodge', { x0: B.x, y0: B.y, wx, wy }); }
  }
  const close = T.filter(c => inEll(c.o, B.x, B.y, R_SWEEP - 2));
  if (close.length && B.cd.sweep <= 0 && fresh(B, 'sweep')) return newAct(ctx, B, 'sweep', { x: B.x, y: B.y });
  if (B.cd.lance <= 0 && fresh(B, 'lance')) { const pts = T.filter(c => Math.hypot(c.o.x - B.x, c.o.y - B.y) < 230).slice(0, 6).map(c => [Math.round(c.o.x), Math.round(c.o.y)]); if (pts.length) return newAct(ctx, B, 'lance', { pts }); }
  if (B.cd.warp <= 0 && d > 70 && fresh(B, 'warp')) {   /* hiện ra SAU LƯNG mục tiêu (phía bên kia so với boss) */
    let wx = o.x + dx / d * 26, wy = o.y + dy / d * 18; if (solid(ctx, wx, wy)) { wx = o.x; wy = o.y + 20; } if (!solid(ctx, wx, wy)) return newAct(ctx, B, 'warp', { wx: Math.round(wx), wy: Math.round(wy) });
  }
  if (B.cd.bolt <= 0 && d > 36 && d < BOLT_LEN - 10 && fresh(B, 'bolt')) { const a = Math.atan2(dy, dx); return newAct(ctx, B, 'bolt', { a: +a.toFixed(3), x: Math.round(B.x + Math.cos(a) * 10), y: Math.round(B.y - 22 + Math.sin(a) * 4) }); }
  if (d > NEAR) {   /* đi tới ≤ 30 px (trong tầm quét 44 → không vùng chết khoảng cách); lượn vòng nhẹ → đi chéo mượt 8 hướng */
    if (B.sideT <= ctx.S.time) { B.side = Math.random() < 0.5 ? -1 : 1; B.sideT = ctx.S.time + 2 + Math.random(); }
    const ux = dx / d, uy = dy / d, k = d > 90 ? 0.3 : 0.6, vx = ux - uy * k * B.side, vy = uy + ux * k * B.side;
    moveB(ctx, B, vx, vy, SPD[B.enr ? 1 : 0], dt); if (Q.clip !== 'walk') { Q.clip = 'walk'; Q.t = 0; } Q.dir = dirIx(vx, vy);
  } else { if (Q.clip !== 'idle') { Q.clip = 'idle'; Q.t = 0; } Q.dir = dirIx(dx, dy); }
}

/* ---------- quái trong ctx.monsters (để kiếm / đấm / Chấn Thú / bấm chuột đánh được như trùm khác) ---------- */
function mkMo(ctx, B) {
  const t = STR, cfg = { key: 'wb44', vi: t.vi.name, en: t.en.name, hp: Math.max(1, Math.round(B.hp)), dmg: 0, armor: 0, sp: 0, xp: 0, w: 26, h: 41, c: ['#7a6aa0', '#cfe6ff', '#ffffff'], boss: true, wb44: true, noXpTag: true, shortHit: true,
    aiFn: (c2, mo, dt) => moTick(c2, mo, dt), drawFn: (g, mo, x, y) => drawBoss(g, mo, x, y), onFall: mo => onFall(ctx, mo), onDown: mo => onDown(ctx, mo) };
  const mo = ctx.monsters.add(cfg, B.x, B.y); mo.max = Math.max(1, Math.round(B.mx)); mo.hp = Math.max(1, Math.round(dispHp(B))); mo.angry = true; mo.warned = true; B.mo = mo; B.shown = mo.hp; return mo;
}
const dispHp = B => auth() ? B.hp : Math.max(1, B.hp - Math.max(0, B.sent + B.pend - B.ack));
function credit(B, who, d) { if (!(d > 0)) return; B.dmg[who] = (B.dmg[who] || 0) + d; B.last = who; }
function takeLost(ctx, B, mo) {   /* máu mất từ lần trước (kiếm / đấm / Chấn Thú / Rocky…) = công của MÁY NÀY */
  const lost = Math.min(B.shown, B.shown - mo.hp); if (!(lost > 0.5)) return 0;
  B.recent.push(ctx.S.time);
  if (auth()) { B.hp = Math.max(0, B.hp - lost); credit(B, myId(), lost); } else B.pend += lost;
  return lost;
}
function moTick(ctx, mo, dt) {
  const B = ST.B; if (!B || B.mo !== mo) return;
  takeLost(ctx, B, mo);
  const p = ctx.S.player; mo.angry = Math.hypot(p.x - B.x, p.y - B.y) < 260; mo.kb = null;   /* thanh máu trên đầu màn khi ở gần */
  mo.x = B.x; mo.y = B.y; mo.max = Math.max(1, Math.round(B.mx)); mo.hp = Math.max(1, Math.round(dispHp(B))); B.shown = mo.hp;
}
function onFall(ctx, mo) {   /* trúng đòn chí mạng: chủ phòng / một mình → chết thật; khách → giữ 1 máu, chờ 'wbend' */
  const B = ST.B; if (!B || B.mo !== mo) return false;
  takeLost(ctx, B, mo);
  if (auth()) { B.hp = 0; return false; }
  mo.hp = 1; B.shown = 1; return true;
}
function onDown(ctx, mo) { const B = ST.B; if (!B || B.mo !== mo) return; B.mo = null; finish(ctx, true); }

/* ---------- vòng đời ---------- */
function spawn(ctx, id, tl) {
  loadQM(); const P = spawnPoint(ctx), B = B0(), h = ctx.hero, per = h ? (h.atk || 10) + (h.weaponBonus ? h.weaponBonus(h.swordTier) || 0 : 0) : 20;
  B.id = id; B.home = { x: P.x, y: P.y }; B.x = P.x; B.y = P.y; B.base = Math.max(2400, Math.round(per * 60)); B.n = players(ctx); B.mx = Math.round(B.base * (1 + CF.hpK * (B.n - 1))); B.hp = B.mx; B.end = nowMs(ctx) + tl * 1000;
  ST.B = B; if (!NB(ctx)) mkMo(ctx, B); fx('gm_arrive', B.x, B.y); fx('gm_ripple', B.x, B.y, false); B.q.clip = 'cast'; B.q.t = 0; sfx(ctx, 'roar_big');
  if (ST.upSaid !== id && !NB(ctx)) { ST.upSaid = id; try { ctx.toast(L(ctx).up); } catch (e) { } }
  lg({ ev: 'spawn', id, mx: B.mx, n: B.n, tl }); return B;
}
function finish(ctx, win, fromNet) {   /* chủ phòng / một mình: kết thúc → phát 'wbend' + thưởng ở máy mình */
  const B = ST.B; if (!B) return; const g = Object.entries(B.dmg).map(([k, v]) => [k, Math.round(v)]);
  if (auth() && !fromNet) { const me = myId(); const nx = Math.round(nowMs(ctx) + CF.period * 1000); send({ t: 'wbend', id: B.id, win: win ? 1 : 0, g, last: B.last, mx: Math.round(B.mx), nx }); end(ctx, { id: B.id, win, g, last: B.last, nx }, me); }
}
function end(ctx, E, me) {
  const B = ST.B; ST.n.ends++;
  if (B) { if (B.mo) { try { ctx.monsters.remove(B.mo); } catch (e) { } } ST.corpse = { x: B.x, y: B.y, t: 0, win: !!E.win, dir: B.q.dir }; if (E.win) { fx('gm_shatter', B.x, B.y - 20); sfx(ctx, 'smash'); if (ctx.quake && !NB(ctx)) ctx.quake(0.25); } }
  ST.B = null; ST.tele = []; const w = sv(ctx); w.nx = E.nx > 0 ? E.nx : Math.round(nowMs(ctx) + CF.period * 1000); if (!w.done.includes(E.id)) { w.done.push(E.id); if (w.done.length > 8) w.done.shift(); }
  if (!NB(ctx)) { try { ctx.toast(E.win ? L(ctx).down : L(ctx).flee); } catch (e) { } }
  lg({ ev: 'end', id: E.id, win: !!E.win, g: E.g, last: E.last });
  if (E.win && !NB(ctx)) reward(ctx, E, me);
}
function reward(ctx, E, me) {   /* chia theo tỉ lệ góp: phần đều = 1/n người góp; tỉ lệ = góp / phần đều (0,3–2); ai góp ≥ 3 % luôn có ít nhất 1 phần */
  const w = sv(ctx); if (w.rew === E.id) return; const G = new Map(E.g || []), tot = [...G.values()].reduce((a, b) => a + b, 0), mine = G.get(me) || (me !== 'me' ? G.get('me') || 0 : 0);
  if (!(mine > 0) || !(tot > 0)) { ST.rew = { id: E.id, mine: 0 }; try { ctx.toast(L(ctx).none); } catch (e) { } return; }
  const n = [...G.values()].filter(v => v > 0).length, s = mine / tot, ratio = Math.max(s >= 0.03 ? 0.5 : 0.3, Math.min(2, s * n)), last = E.last === me;
  const stone = Math.round(14 * ratio) + (last ? 5 : 0), soul = ratio >= 1 ? 2 : 1, ball = (ratio >= 1.2 ? 2 : 1) + (last ? 1 : 0), tn = Math.max(1, Math.round(4 * ratio)), xp = Math.round(120 * ratio) + (last ? 40 : 0);
  const p = ctx.S.player, t = L(ctx); w.rew = E.id; w.wins++; w.best = Math.max(w.best || 0, Math.round(s * 100));
  try { ctx.give('stone', stone, p.x, p.y); ctx.give('soul', soul, p.x + 6, p.y); } catch (e) { console.error('wb44 give', e); }
  try { if (ctx.chanthu && ctx.chanthu.addBall) ctx.chanthu.addBall(ball); } catch (e) { }
  try { if (ctx.fieldct && ctx.fieldct.tnAdd) ctx.fieldct.tnAdd('quang', tn, { x: p.x, y: p.y }); } catch (e) { }
  try { if (ctx.hero && ctx.hero.gainXp) ctx.hero.gainXp(xp); (ctx.S.pops ||= []).push({ x: p.x, y: p.y - 34, text: `+${xp} XP`, color: '#c8ff9a', t: 0 }); } catch (e) { }
  const pc = Math.round(s * 100), txt = `${stone} ${t.stone} · ${soul} ${t.soul} · ${ball} ${t.ball} · ${tn} ${t.tn} · ${xp} ${t.xp}`;
  ST.rew = { id: E.id, mine: Math.round(mine), tot: Math.round(tot), pc, ratio: +ratio.toFixed(2), stone, soul, ball, tn, xp, last };
  try { ctx.toast(t.reward(pc, txt) + (last ? ' · ' + t.last : '')); ctx.persist && ctx.persist(); } catch (e) { }
  lg({ ev: 'reward', ...ST.rew });
}

/* ---------- mạng ---------- */
function snapMsg(B) {
  const A = B.act, a = A ? [A.id, KINDS.indexOf(A.k), +A.t.toFixed(2), A.T, A.x | 0, A.y | 0, A.a || 0, A.wx | 0, A.wy | 0, ...(A.pts ? A.pts.flat() : [])] : 0;
  return { t: 'wb', id: B.id, x: Math.round(B.x), y: Math.round(B.y), hp: Math.round(B.hp), mx: Math.round(B.mx), b: B.base, n: B.n, d: B.q.dir | 0, c: CLIPS.indexOf(B.q.clip), tl: Math.max(0, Math.round((B.end - nowMs(ST.ctx)) / 100) / 10), e: B.enr ? 1 : 0, a, g: Object.entries(B.dmg).map(([k, v]) => [k, Math.round(v)]), l: B.last, hx: Math.round(B.home.x), hy: Math.round(B.home.y) };
}
function onSnap(ctx, m) {
  if (!inZone(ctx) || NB(ctx)) return; ST.n.rx++;   /* c70-detho: khách là người mới → không dựng boss */
  if (sv(ctx).done.includes(m.id) && !(ST.B && ST.B.id === m.id)) return;
  let B = ST.B; if (!B || B.id !== m.id) { if (B && B.mo) { try { ctx.monsters.remove(B.mo); } catch (e) { } } B = B0(); B.id = m.id; B.x = m.x; B.y = m.y; ST.B = B; loadQM(); if (ST.upSaid !== m.id) { ST.upSaid = m.id; try { ctx.toast(L(ctx).here); } catch (e) { } } lg({ ev: 'join', id: m.id }); }
  B.tx = m.x; B.ty = m.y; B.hp = m.hp; B.mx = m.mx; B.base = m.b || B.base; B.n = m.n || 1; B.enr = !!m.e; B.end = nowMs(ctx) + (m.tl || 0) * 1000; B.home = { x: m.hx, y: m.hy }; B.lastSnap = ctx.S.time; B.last = m.l || null;
  B.dmg = {}; for (const [k, v] of m.g || []) B.dmg[k] = v; const me = myId(); B.ack = B.dmg[me] || 0;
  { const H = (B.sh ||= []), now = ctx.S.time; H.push([now, B.sent]); while (H.length && now - H[0][0] > 1.2) H.shift(); const recent = B.sent - H[0][1];   /* phần đã gửi > 1 s mà chủ phòng chưa ghi (vượt trần / quá xa) → bỏ, máu hiện về đúng máu chủ phòng */
    if (B.sent - B.ack > recent) B.sent = B.ack + recent; }
  if (Math.hypot(m.x - B.x, m.y - B.y) > CF.snap) { B.x = m.x; B.y = m.y; }
  if (!B.act || B.act.k !== 'warp') { B.q.dir = m.d | 0; const c = CLIPS[m.c] || 'idle'; if (B.q.clip !== c && !B.act) { B.q.clip = c; B.q.t = 0; } }
  const a = m.a; if (Array.isArray(a) && !ST.seenAct.has(a[0])) { const k = KINDS[a[1]], A = { id: a[0], k, t: Math.min(a[3], (+a[2] || 0) + 0.05), T: a[3], x: a[4], y: a[5], a: a[6], wx: a[7], wy: a[8] }; if (k === 'lance') { A.pts = []; for (let i = 9; i + 1 < a.length; i += 2) A.pts.push([a[i], a[i + 1]]); } if (k === 'dodge') { A.x0 = B.x; A.y0 = B.y; } if (k) { B.act = A; beginAct(ctx, B, A); } }
  if (!B.mo || !ctx.monsters.list().some(o => o.id === B.mo.id)) mkMo(ctx, B);
}
function onHit(ctx, m) {   /* chủ phòng: sát thương của khách — kiểm khoảng cách + trần mỗi giây (chống gian lận) */
  const B = ST.B; if (!B || m.id !== B.id || !auth() || !(B.mo || NB(ctx))) return; const A = api(), P = A && A.peers ? A.peers().find(q => q.id === m.f) : null;
  if (!P || Math.hypot(P.ent.x - B.x, P.ent.y - B.y) > 200) { ST.n.rej++; return; }
  const now = ctx.S.time, cap = Math.max(CF.capMin, B.mx * CF.capFrac); let tk = ST.tok.get(m.f); if (!tk) { tk = { n: cap, t: now }; ST.tok.set(m.f, tk); } tk.n = Math.min(cap * 2, tk.n + (now - tk.t) * cap); tk.t = now;
  const d = Math.max(0, Math.min(+m.d || 0, tk.n)); if (!(d > 0)) { ST.n.rej++; return; } tk.n -= d; ST.n.hitRx++;
  B.hp = Math.max(0, B.hp - d); credit(B, m.f, d); const mo = B.mo; if (mo) { mo.hp = Math.max(0, Math.round(B.hp)); B.shown = mo.hp; mo.flash = 0.12; }
  if (B.hp <= 0) { if (mo) { try { ctx.monsters.kill(mo); } catch (e) { } } if (ST.B === B) { B.mo = null; finish(ctx, true); } }
}

/* ---------- vẽ ---------- */
function drawBoss(g, mo, x, y) {
  const B = ST.B; if (!B) return; const Q = B.q; if (Q.alpha <= 0.02) return;
  if (!drawQ(g, Q, x, y)) { g.fillStyle = '#7a6aa0'; g.fillRect(Math.round(x) - 8, Math.round(y) - 38, 16, 38); g.fillStyle = '#cfe6ff'; g.fillRect(Math.round(x) - 5, Math.round(y) - 34, 10, 14); }
  if (mo.flash > 0 && QM) { g.save(); g.globalAlpha = 0.35; g.globalCompositeOperation = 'lighter'; drawQ(g, Q, x, y); g.restore(); }   /* chớp trúng đòn: phủ sáng, không CSS filter */
}
function drawTele(g, T, cx, cy) {
  const k = Math.min(1, T.t / Math.max(0.05, T.T)), x = Math.round(T.x - cx), y = Math.round(T.y - cy); g.save();
  if (T.type === 'ring' || T.type === 'mark') { const r = T.r, col = T.col || (T.type === 'mark' ? '#ffd0f0' : '#e8dcff');
    g.globalAlpha = 0.18 + 0.2 * k; g.fillStyle = col; g.beginPath(); g.ellipse(x, y, r * k, r * 0.7 * k, 0, 0, 7); g.fill();
    g.globalAlpha = 0.85; g.strokeStyle = col; g.lineWidth = 1; g.beginPath(); g.ellipse(x, y, r, r * 0.7, 0, 0, 7); g.stroke(); }
  else if (T.type === 'fan') { g.globalAlpha = 0.25 + 0.35 * k; for (let i = 0; i < 7; i++) { const a = T.a + (i - 3) * BOLT_SPREAD / 6; g.strokeStyle = SPEC[i]; g.lineWidth = 1; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * BOLT_LEN * k, y + Math.sin(a) * BOLT_LEN * k); g.stroke(); } }
  g.restore();
}
function drawRay(g, r, cx, cy) {   /* tia mọc từ tay (0,1 s) → giữ → tắt dần; lõi trắng + viền màu phổ */
  const grow = Math.min(1, r.t / 0.1), fade = r.t > r.life - 0.15 ? Math.max(0, (r.life - r.t) / 0.15) : 1, x0 = r.x0 - cx, y0 = r.y0 - cy, x1 = x0 + (r.x1 - r.x0) * grow, y1 = y0 + (r.y1 - r.y0) * grow;
  g.save(); g.globalAlpha = 0.9 * fade; g.lineCap = 'butt'; g.strokeStyle = SPEC[r.col]; g.lineWidth = 3; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
  g.strokeStyle = '#ffffff'; g.lineWidth = 1; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); g.fillStyle = '#ffffff'; g.fillRect(Math.round(x1) - 1, Math.round(y1) - 1, 3, 3); g.restore();
}
function drawLanceShard(g, T, cx, cy) {   /* mảnh gương rơi xuống chấm báo trong 0,3 s cuối */
  const left = T.T - T.t; if (left > 0.3 || left < 0) return; const i = Math.abs(Math.round(T.x + T.y)) % 6, im = img(`boss/guong/shards/small/shard_${COLN[i]}.png`), h = 60 * (left / 0.3), x = Math.round(T.x - cx), y = Math.round(T.y - cy - h);
  if (im) { const w = im.naturalWidth / 2, hh = im.naturalHeight / 2; g.save(); g.imageSmoothingEnabled = false; g.drawImage(im, x - w / 2, y - hh, w, hh); g.restore(); } else { g.fillStyle = SPEC[i]; g.fillRect(x - 2, y - 6, 4, 6); }
}

export const worldboss44 = {
  id: 'worldboss44',
  always: true,
  onZoneEnter(ctx) {
    ST.ctx = ctx; loadQM();
    ctx.wb44 = { onMsg: (m, fromHost) => { try { if (m.t === 'wb') { if (fromHost && NET.role === 'guest') onSnap(ctx, m); } else if (m.t === 'wbhit') onHit(ctx, m); else if (m.t === 'wbn') { if (fromHost && NET.role === 'guest' && m.nx > 0 && !ST.B) sv(ctx).nx = m.nx; } else if (m.t === 'wbend' && fromHost && ST.B && ST.B.id === m.id) { ST.B.dmg = Object.fromEntries(m.g || []); end(ctx, { id: m.id, win: !!m.win, g: m.g, last: m.last, nx: m.nx }, myId()); } } catch (e) { console.error('wb44 msg', e); } } };
    if (ctx.chanthu && ctx.chanthu.pins && !ctx.chanthu.pins.__wb44) {   /* ghim bản đồ M + bản đồ nhỏ c23 */
      const o = ctx.chanthu.pins, w = () => { const out = o(); try { const q = pins(ctx); if (q) out.push(q); } catch (e) { } return out; }; w.__wb44 = true; ctx.chanthu.pins = w;
    }
    if (!inZone(ctx)) { if (ST.B) { ST.B = null; ST.tele = []; ST.rays = []; } return; }
    if (typeof window !== 'undefined') window.__wb44 = {
      state: () => { const B = ST.B; return { role: NET.role, on: online(), me: myId(), slot: slotInfo(ctx), B: B && { id: B.id, x: Math.round(B.x), y: Math.round(B.y), hp: Math.round(B.hp), mx: Math.round(B.mx), n: B.n, disp: B.mo ? Math.round(B.mo.hp) : null, act: B.act && B.act.k, clip: B.q.clip, dir: B.q.dir, enr: B.enr, dmg: { ...B.dmg }, pend: Math.round(B.pend), sent: Math.round(B.sent), ack: Math.round(B.ack), tl: Math.round((B.end - nowMs(ctx)) / 1000), skills: B.skills.slice(), snapLen: JSON.stringify(snapMsg(B)).length, inList: !!(B.mo && ctx.monsters.list().some(o => o.id === B.mo.id)) }, n: JSON.parse(JSON.stringify(ST.n)), rew: ST.rew, save: { ...sv(ctx) } }; },
      spawn: (tl = 300) => { if (!auth()) return false; if (ST.B) return ST.B.id; ST.forced = 'F' + Date.now().toString(36); spawn(ctx, ST.forced, tl); return ST.forced; },
      warnTest: () => { ST.warned = null; ST.fakeWarn = 3; },
      hurt: f => { const B = ST.B; if (B && B.mo) { B.mo.hp -= Math.round(B.mx * f); return true; } return false; },
      force: k => { const B = ST.B; if (!B || !auth()) return false; B.act = null; const p = ctx.S.player, a = Math.atan2(p.y - B.y, p.x - B.x); B.cd[k] = 0; if (k === 'sweep') newAct(ctx, B, 'sweep', { x: B.x, y: B.y }); else if (k === 'bolt') newAct(ctx, B, 'bolt', { a, x: Math.round(B.x + Math.cos(a) * 10), y: Math.round(B.y - 22 + Math.sin(a) * 4) }); else if (k === 'lance') newAct(ctx, B, 'lance', { pts: targets(ctx).slice(0, 6).map(c => [Math.round(c.o.x), Math.round(c.o.y)]) }); else if (k === 'warp') newAct(ctx, B, 'warp', { wx: Math.round(p.x + 20), wy: Math.round(p.y) }); return true; },
      place: (x, y) => { const B = ST.B; if (!B) return false; B.x = x; B.y = y; return true; },
      hold: v => { ST.hold = !!v; }, noAuto: v => { ST.noAuto = !!v; }, clear: () => { const B = ST.B; if (B && B.mo) { try { ctx.monsters.remove(B.mo); } catch (e) { } } ST.B = null; ST.tele = []; return true; }, log: () => ST.log.slice(), reset: () => { const w = sv(ctx); w.done = []; w.rew = null; ST.rew = null; },
    };
  },
  onZoneLeave(ctx) { const B = ST.B; if (B && B.mo) { try { ctx.monsters.remove(B.mo); } catch (e) { } } ST.B = null; ST.tele = []; ST.rays = []; ST.corpse = null; },
  update(dt, ctx) {
    ST.ctx = ctx; if (!inZone(ctx)) return;
    const live = ctx.S.mode === 'play';
    for (const f of ST.fx) f.t += dt; ST.fx = ST.fx.filter(f => f.t < f.dur);
    for (const r of ST.rays) r.t += dt; ST.rays = ST.rays.filter(r => r.t < r.life);
    for (const T of ST.tele) T.t += dt; ST.tele = ST.tele.filter(T => T.t < T.T + 0.05);
    if (ST.corpse) { ST.corpse.t += dt; if (ST.corpse.t > 1.4) ST.corpse = null; }
    const S = slotInfo(ctx), w = sv(ctx), t = L(ctx);
    if (ST.fakeWarn > 0) { ST.fakeWarn -= dt; }
    /* báo trước 30 s (mọi máy, 1 lần / đợt) */
    const nextId = S.id;
    const nb = NB(ctx);
    if (live && !nb && (S.toNext <= CF.warn || ST.fakeWarn > 0) && ST.warned !== nextId && !w.done.includes(nextId)) { ST.warned = nextId; try { ctx.toast(t.soon(Math.ceil(ST.fakeWarn > 0 ? CF.warn : S.toNext))); } catch (e) { } lg({ ev: 'warn', id: nextId }); }
    const B = ST.B;
    if (!B) {
      if (nb && !(auth() && online())) { if (S.toNext <= CF.warn + 2) { const P = CF.period * 1000; w.nx = Math.ceil((nowMs(ctx) + (CF.warn + 3) * 1000) / P) * P; } return; }   /* c70-detho: người mới chơi một mình / khách → không sinh; đẩy mốc sang đợt sau (xong Nhập môn mới gặp, có báo trước 30 s) */
      if (live && auth() && !ST.noAuto && S.ph >= 0 && !w.done.includes(S.id) && !(ctx.S.mode !== 'play')) spawn(ctx, S.id, CF.life);
      if (auth() && online() && (ST.nxT = (ST.nxT || 0) - dt) <= 0) { ST.nxT = 5; send({ t: 'wbn', nx: nxOf(ctx) }); }
      return;
    }
    if (nb) { if (B.mo) { try { ctx.monsters.remove(B.mo); } catch (e) { } B.mo = null; } if (!auth()) { ST.B = null; ST.tele = []; ST.rays = []; return; } if (B.hp <= 0) { finish(ctx, true); return; } }   /* c70-detho: chủ phòng người mới chạy boss 'bóng' */
    else if (!B.mo || !ctx.monsters.list().some(o => o === B.mo || o.id === B.mo.id)) { if (B.mo && B.mo.state === 'dead') return; mkMo(ctx, B); }
    B.q.t += dt;
    if (auth()) {
      if (B.tx != null) { B.tx = null; lg({ ev: 'takeover', hp: Math.round(B.hp), mx: Math.round(B.mx) }); if (B.pend > 0) { credit(B, myId(), B.pend); B.hp = Math.max(1, B.hp - B.pend); B.pend = 0; } if (B.dmg.me && myId() !== 'me') { credit(B, myId(), B.dmg.me); delete B.dmg.me; } if (!B.home) B.home = { x: B.x, y: B.y }; }
      if (B.dmg.me && myId() !== 'me') { B.dmg[myId()] = (B.dmg[myId()] || 0) + B.dmg.me; delete B.dmg.me; }
      const n = players(ctx); if (n > B.n) { const k = B.hp / B.mx; B.n = n; B.mx = Math.round(B.base * (1 + CF.hpK * (n - 1))); B.hp = Math.round(B.mx * k); lg({ ev: 'scale', n, mx: B.mx }); }
      if (nowMs(ctx) >= B.end && !B.act) { finish(ctx, false); return; }
      if (live) { if (!ST.hold) ai(ctx, B, dt); else if (B.act) actTick(ctx, B, B.act, dt); }   /* hold (móc test): AI đứng yên nhưng chiêu ép vẫn chạy */
      if (B.mo && B.hp <= 0 && B.mo.state !== 'dead') { try { ctx.monsters.kill(B.mo); } catch (e) { } return; }
      ST.snapT -= dt; if (online() && ST.snapT <= 0) { ST.snapT = 1 / CF.snapHz; send(snapMsg(B)); }
    } else {
      if (B.tx != null) { const k = Math.min(1, dt * CF.lerp); B.x += (B.tx - B.x) * k; B.y += (B.ty - B.y) * k; }
      if (B.act) actTick(ctx, B, B.act, dt);
      ST.hitT -= dt; if (ST.hitT <= 0 && B.pend >= 1) { ST.hitT = 1 / CF.hitHz; const d = Math.round(B.pend); if (send({ t: 'wbhit', host: 1, id: B.id, d })) { B.sent += d; B.pend -= d; ST.n.hitTx++; } }
      if (ctx.S.time - B.lastSnap > 6) { if (B.mo) { try { ctx.monsters.remove(B.mo); } catch (e) { } } ST.B = null; lg({ ev: 'lost' }); }   /* chủ phòng im 6 s (không còn boss bên đó) → bỏ bóng */
    }
  },
  drawGround(g, ctx, cx, cy) {
    if (!inZone(ctx) || NB(ctx)) return;
    for (const T of ST.tele) drawTele(g, T, cx, cy);
    for (const f of ST.fx) if (!f.top) drawSheet(g, f.s, Math.min(f.s.n - 1, Math.floor(f.t * (f.s.fps || 12))), f.x - cx, f.y - cy);
    const B = ST.B; if (B && SHADOW.on && B.q.alpha > 0.1) shadowFor(g, B.x, B.y, Math.round(B.x - cx), Math.round(B.y - cy) + 1, 24, 0, B.q.alpha);
  },
  drawables(ctx, cx, cy) {
    if (!inZone(ctx) || NB(ctx)) return []; const g = ctx.g, out = [], B = ST.B;
    for (const r of ST.rays) { const up = Math.sin(Math.atan2(r.y1 - r.y0, r.x1 - r.x0)) < 0; out.push({ y: (r.by || r.y0) + (up ? -0.5 : 0.5), f: () => drawRay(g, r, cx, cy) }); }   /* luật lớp vẽ chiêu 16/10 */
    for (const T of ST.tele) if (T.type === 'mark') out.push({ y: T.y + 0.4, f: () => drawLanceShard(g, T, cx, cy) });
    for (const f of ST.fx) if (f.top) out.push({ y: f.y + 30, f: () => drawSheet(g, f.s, Math.min(f.s.n - 1, Math.floor(f.t * (f.s.fps || 12))), f.x - cx, f.y - cy) });
    const C = ST.corpse; if (C && QM) out.push({ y: C.y, f: () => drawQ(g, { clip: C.win ? 'shatter' : 'vanish', t: C.t, dir: C.dir, alpha: Math.max(0, 1 - Math.max(0, C.t - 0.8) / 0.6) }, C.x - cx, C.y - cy) });
    void B; return out;
  },
  drawUI(ug, ctx, cx, cy, scale) {   /* 1 dòng nhỏ dưới thanh máu trùm sẵn có: % mình góp + số người — chỉ khi chỗ đó trống (không đè HUD) */
    const B = ST.B; if (!B || !inZone(ctx) || NB(ctx) || ctx.S.mode !== 'play' || !B.mo || !B.mo.angry) return;
    const LB = lastBossBar(); if (!LB || !LB.box || performance.now() - LB.t > 300) return; const bb = LB.box, fs = Math.max(11, Math.round((globalThis.__u89?globalThis.__u89((globalThis.__u89?globalThis.__u89(scale):scale)):(globalThis.__u89?globalThis.__u89(scale):scale)) * 3)), y = bb.y + bb.h + 2, h = fs + 4;
    const R = (typeof window !== 'undefined' && window.__bossBar && window.__bossBar.rects) || []; if (R.some(r => r.y0 < y + h && r.y1 > y && r.x0 < bb.x + bb.w && r.x1 > bb.x)) return;
    const tot = Object.values(B.dmg).reduce((a, b) => a + b, 0) + (auth() ? 0 : B.pend + Math.max(0, B.sent - B.ack)), mine = (B.dmg[myId()] || 0) + (B.dmg.me && myId() !== 'me' ? B.dmg.me : 0) + (auth() ? 0 : B.pend + Math.max(0, B.sent - B.ack));
    const pc = tot > 0 ? Math.round(mine / tot * 100) : 0, n = Math.max(B.n, Object.keys(B.dmg).length), txt = L(ctx).share(pc, n);
    ug.save(); ug.font = `bold ${fs}px VT323, monospace`; const tw = ug.measureText(txt).width + 12, x = Math.round(bb.x + bb.w / 2 - tw / 2);
    ug.fillStyle = 'rgba(13,11,20,.72)'; ug.beginPath(); if (ug.roundRect) ug.roundRect(x, y, tw, h, 4); else ug.rect(x, y, tw, h); ug.fill();
    ug.fillStyle = '#e8dcff'; ug.textAlign = 'center'; ug.textBaseline = 'middle'; ug.fillText(txt, x + tw / 2, y + h / 2 + 1); ug.restore();
  },
};
function pins(ctx) {   /* ghim 'rare' (tím) trên bản đồ M + bản đồ nhỏ: boss đang ở đâu / sắp tới */
  if (!inZone(ctx) || NB(ctx)) return null; const B = ST.B, t = L(ctx);
  if (B) return { x: B.x, y: B.y - 10, kind: 'rare', label: t.pin };
  const S = slotInfo(ctx); if (S.toNext <= CF.warn) { const P = spawnPoint(ctx); return { x: P.x, y: P.y - 10, kind: 'rare', label: t.pinSoon(Math.ceil(S.toNext)) }; }
  return null;
}
