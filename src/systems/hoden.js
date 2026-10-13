// hoden.js — plan-30 TRÙM 4: KẺ NUỐT MAGNITUDE "Hố Đen Địa Tâm" (Vết Nứt Magnitude) — agent trùm 4, 2026-10-13.
//  · Khe nứt (ảnh PixelLab rift_crack dùng chung) ở M4 Mỏ Đá Lở, phía Đông quảng trường (world.js riftCrackM2(m, 'rift4')). Mở khi: đã qua đèo tới M4
//    (save.sys.road.won.road4 / maxZ ≥ 4 / save cũ có huy hiệu M4) + Rocky ≥ cấp 45. Chưa đủ → khe mờ + nhãn điều kiện ✔/✘.
//  · Vào khe → vùng 'rift4' (world.js buildRift4): hang mỏ sâu, 6 KHỐI ĐÁ LỚN (hd_block, PixelLab td8 hướng nam, ảnh hư + đổ nát riêng — chỗ núp tuyệt chiêu,
//    phá được, luôn còn ≥ 3: tự trồi lại), vật viền cột chống / xe goòng / đuốc (ảnh gói m4) bị Trọng Lực kéo đổ bay vào hố. Lối ra Nam LUÔN mở.
//  · NGƯỜI ĐIỀU KHIỂN = "Lão Thợ Mỏ Hư Không" (PixelLab v3 — tools/px-hoden.py): ~1,3× người chơi, 8 HƯỚNG (S, SE, E, NE, N sinh thật; W/SW/NW = lật),
//    clip idle / walk / lift (giơ đèn nâng hố) / throw (quăng đèn) / swing (bổ cuốc) / stun / fall. Vẽ 1:1. Hố đen lơ lửng trên đầu lão (ảnh PixelLab 4 cỡ).
//  · HÚT CHIÊU (khắc chế Rocky — móc ctx.haFilter trong pet.js): Rocky-ha bay gần hố (bắt trong bán kính hút) bị NUỐT: luồng cong xoáy vào tâm, hố to ra
//    (thanh NẠP +1, tối đa 5) → đòn trùm mạnh hơn 12 %/nấc, Nhổ Thiên Thạch nhiều hơn. Lúc LỘ LÕI thì Rocky-ha đi xuyên, gây ×1,4.
//  · CÁCH GIẢI: cho hố ĂN NO bằng đá cứng — cục đá (chunk) đẩy vào hố (đi đẩy / E / click), khối đá vỡ ra cục đá, thiên thạch rơi để lại cục đá, Trọng Lực tự
//    kéo cục đá + vật viền vào. Thanh NO đủ 5 → hố co lại, lão choáng 2,5 s, LÕI LỘ 8 s: kiếm ×1 (bình thường giáp bồi tụ chỉ 25 %), Rocky ×1,4 (bình thường 15 %).
//  · Chiêu (báo trước ≥ 0,5–1 s, nhắm đúng chỗ mục tiêu ở MỌI phía; không vùng chết: đi tới ≤ 28 px, bổ cuốc tầm 34 px):
//    Bổ Cuốc (vòng quanh người), TRỌNG LỰC (vòng hút báo 1 s → kéo người + Rocky + cục đá về tâm 3,2 s, tốc độ kéo < tốc chạy → chạy ngược được; chạm lõi → hất),
//    NHỔ THIÊN THẠCH (vòng báo dưới đất 1,1 s → thiên thạch lửa rơi từ trên cao), Dịch Chuyển (vòng báo ở chỗ tới), Lướt Né (bị đánh liên tiếp).
//    TUYỆT CHIÊU "SỰ KIỆN CHÂN TRỜI" (60 % / 30 % máu): hố ra giữa sân, không gian MÉO XOẮN quanh hố (xử lý ảnh canvas — vòng cắt xoay, không CSS filter),
//    thời gian chậm 0,5× (S.timeScale) 3 s thật, màu dịch đỏ, sao/hạt kéo vệt xoáy vào tâm → SIÊU TÂN TINH vòng sáng loang ra: chỉ an toàn khi đường thẳng
//    từ tâm hố tới mình bị VẬT CỨNG chặn (khối đá / cột / vách).
//  · PHA 2: lão hết máu → hố sụp vào đèn → lão cầm cuốc trọng lực đánh thẳng: bổ cuốc tạo HỐ NHỎ hút 2,2 s, QUĂNG ĐÈN nổ trọng lực, LƯỚT 8 hướng, lướt né.
//    Hạ → ngã (clip fall), đèn vỡ, lão tan vào hư không (mảnh khung hình xoáy vào điểm đèn) → thắng.
//  · Mục tiêu theo THÙ HẬN (như Hắc Rocky). Thưởng lần đầu: sách Rocky bậc 8 (ctx.hrBook), Ngọc Rồng, thành tựu 'hoden', XP + đá; đánh lại giảm. save.sys.hoden.
import { obj as defObj } from '../gfx.js';
import { ART } from '../art.js';
import * as LV from './petlv.js';
import { bossCam, bossCamReset, bossBarBox } from './bosscam.js';
import { beamKey, sheet as bSheet, drawAt as bDraw, frameAt as bFrame } from './beamfx.js';

const TS = 16;
const STR = {
  vi: {
    name: 'Lão Thợ Mỏ Hư Không', sub: 'Kẻ Nuốt Magnitude', enter: 'Vào Khe Nứt Magnitude', ph2name: 'Lão Thợ Mỏ Hư Không', ph2sub: 'cuốc trọng lực',
    locked: (a, b, lv) => `Khe nứt còn khép — cần: ${a ? '✔' : '✘'} qua đèo tới M4 · ${b ? '✔' : '✘'} Rocky cấp 45 (đang ${lv})`, noRocky: 'Khe nứt chỉ mở khi có Rocky đi cùng',
    intro: 'Tiếng cuốc vọng lên từ đáy hư không…', rise: 'LÃO THỢ MỎ HƯ KHÔNG nâng HỐ ĐEN lên!', skip: 'Bỏ qua',
    swallow: 'Hố đen NUỐT Rocky-ha — mạnh lên! Cho hố ăn ĐÁ trước', push: 'Đẩy đá vào hố', smash: n => `Đập khối đá (${n})`,
    fed: (n, m) => `Hố nuốt đá! No ${n}/${m}`, full: 'HỐ ĐEN NO — CO LẠI! LÕI LỘ 8 giây — đánh ngay!', exposedT: s => `LÕI LỘ (${s}s) — Rocky-ha xuyên được, đánh mạnh!`,
    hint: 'Đẩy ĐÁ vào hố cho no → lõi lộ. Hố NUỐT Rocky-ha!', shield: 'Đĩa bồi tụ che chắn — cho hố ăn no đá để lộ lõi!',
    grav: 'TRỌNG LỰC! Chạy ngược ra xa!', meteor: 'NHỔ THIÊN THẠCH! Ra khỏi vòng đỏ', swing: 'Bổ Cuốc!', blink: 'Dịch chuyển!',
    ult: 'TUYỆT CHIÊU — SỰ KIỆN CHÂN TRỜI!', ultHint: 'Núp SAU KHỐI ĐÁ — chỉ đá cứng chặn được siêu tân tinh!', nova: 'SIÊU TÂN TINH!', safe: 'An toàn sau đá!',
    aimYou: 'Lão Thợ Mỏ nhắm vào BẠN!', aimRk: 'Lão Thợ Mỏ quay sang Rocky', rise2: 'Khối đá trồi lên từ đáy mỏ',
    collapse: 'Hố đen sụp vào chiếc đèn…', ph2: 'LÃO CẦM CUỐC TRỌNG LỰC — đánh thẳng!', throwL: 'Quăng đèn!', dash: 'Lướt!', die: 'Đèn vỡ… lão tan vào hư không.',
    phase: n => `Pha ${n}/2`, won: 'HỐ ĐEN ĐÃ TẮT!', again: 'Khe nứt khép lại… (đánh lại được, thưởng giảm)', title: 'Danh hiệu: Kẻ Lấp Hư Không', exit: '← Mỏ Đá Lở',
    meterFed: 'NO', meterCharge: 'NẠP',
  },
  en: {
    name: 'Old Void Miner', sub: 'Magnitude Devourer', enter: 'Enter the Magnitude Rift', ph2name: 'Old Void Miner', ph2sub: 'gravity pick',
    locked: (a, b, lv) => `The rift is sealed — needs: ${a ? '✔' : '✘'} cross the pass to M4 · ${b ? '✔' : '✘'} Rocky Lv 45 (now ${lv})`, noRocky: 'The rift only opens with Rocky at your side',
    intro: 'A pickaxe echoes up from the bottom of the void…', rise: 'THE OLD VOID MINER raises the BLACK HOLE!', skip: 'Skip',
    swallow: 'The hole SWALLOWS Rocky-ha — it grows! Feed it ROCK first', push: 'Push the rock into the hole', smash: n => `Smash the rock block (${n})`,
    fed: (n, m) => `The hole eats rock! Full ${n}/${m}`, full: 'THE HOLE IS FULL — IT SHRINKS! Core exposed 8 s — strike now!', exposedT: s => `CORE EXPOSED (${s}s) — Rocky-ha pierces, hit hard!`,
    hint: 'Push ROCK into the hole until full → core exposed. It SWALLOWS Rocky-ha!', shield: 'The accretion disk shields him — feed the hole rock to expose the core!',
    grav: 'GRAVITY! Run away from it!', meteor: 'METEOR SPIT! Get out of the red rings', swing: 'Pick Slam!', blink: 'Warp!',
    ult: 'ULTIMATE — EVENT HORIZON!', ultHint: 'Hide BEHIND A ROCK BLOCK — only solid rock stops the supernova!', nova: 'SUPERNOVA!', safe: 'Safe behind the rock!',
    aimYou: 'The Miner is targeting YOU!', aimRk: 'The Miner turns on Rocky', rise2: 'A rock block rises from the mine floor',
    collapse: 'The black hole collapses into the lantern…', ph2: 'GRAVITY PICK — he fights head-on!', throwL: 'Lantern throw!', dash: 'Dash!', die: 'The lantern breaks… he fades into the void.',
    phase: n => `Phase ${n}/2`, won: 'THE BLACK HOLE IS OUT!', again: 'The rift closes… (rematch any time, smaller reward)', title: 'Title: Void Filler', exit: '← Rockfall Mine',
    meterFed: 'FULL', meterCharge: 'CHARGE',
  },
};
const L = ctx => STR[ctx.lang() === 'vi' ? 'vi' : 'en'];

/* khối đá lớn (ảnh PixelLab gói rift4 — tools/px-hoden-env.py; vẽ code chỉ dự phòng). Ảnh 64×48 = 32×24 logic, chân 2 ô. */
const px = (g, x, y, c, w = 1, h = 1) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
defObj('hd_block', 32, 24, 2, 1, g => { px(g, 4, 6, '#3a3640', 24, 18); px(g, 6, 8, '#5a5462', 20, 6); px(g, 12, 14, '#8a50c0', 6, 1); });

/* ---------------- số liệu ---------------- */
const FEED_N = 5, CHARGE_MAX = 5, EXPOSE_T = 8, STUN_T = 2.5, RK_MUL = 0.15, RK_EXPOSED = 1.4, P2_RK = 0.8;
const DMG = { swing: 0.09, grav: 0.06, meteor: 0.08, nova: 0.34, p2swing: 0.09, p2throw: 0.1, p2dash: 0.09, mini: 0.04 };   /* × máu tối đa người chơi */
const CD = { grav: 13, meteor: 8.5, swing: 1.4, blink: 9, ult: 45 };
const SPD = [58, 70], SPD2 = [80, 92];
const AG = { rk: 10, hit: 4.5, feed: 5, near: 3, decay: 2.5, back: 6, hold: 4, gap: 3, restless: [9, 13], burst: 12 };
const LIFT = 34;   /* hố đen lơ lửng cao LIFT px trên chân lão */
const GRAV = { warn: 1.0, dur: 3.2, sp: 52, r: 240, core: 16 };   /* tốc kéo tối đa 52 px/s < tốc chạy người 84 px/s */
const HORIZON = { gather: 1.0, real: 3.0, ring: 250, max: 340 };
function bossHp(ctx, k = 1) {
  const h = ctx.hero, per = h ? h.atk + h.weaponBonus(h.swordTier) : 100, pt = rk(ctx), st = pt ? LV.atkOf(LV.levelFromXp(pt.xp || 0).lv) : 40;
  return Math.round((per * 74 + st * 26) * k);
}
const sv = ctx => { const s = ctx.S.save; s.sys ||= {}; const h = (s.sys.hoden ||= {}); h.wins ||= 0; h.tries ||= 0; return h; };
const rk = ctx => (ctx.rocky && ctx.rocky.pet && ctx.rocky.pet()) || (((ctx.S.save.sys || {}).pet || {}).pet) || null;
const rkLv = ctx => { const p = rk(ctx); return p ? LV.levelFromXp(p.xp || 0).lv : 0; };
function roadOk(ctx) { const s = ctx.S.save, r = (s.sys || {}).road || {}; return !!((r.won || {}).road4 || (r.maxZ || 0) >= 4 || (s.badges || []).includes(4)); }   /* save cũ không cờ đèo mà có huy hiệu M4 → coi như đã qua */
const RK_NEED = 45;
const riftOpen = ctx => roadOk(ctx) && rkLv(ctx) >= RK_NEED;
const inHd = ctx => !!(ctx.S.zone && ctx.S.zone.id === 'rift4');
const inM4 = ctx => !!(ctx.S.zone && ctx.S.zone.id === 'm4');
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const DIR8 = ['east', 'south-east', 'south', 'south-west', 'west', 'north-west', 'north', 'north-east'];
const dirOf = (dx, dy) => DIR8[((Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) % 8) + 8) % 8];
const MIRROR = { west: 'east', 'south-west': 'south-east', 'north-west': 'north-east' };

/* ---------------- ảnh ---------------- */
const IM = {};
function img(src) { if (!IM[src]) { const i = new Image(); i.src = 'assets/px/' + src; IM[src] = i; } const i = IM[src]; return i.complete && i.naturalWidth ? i : null; }
const HOLE = ['boss/hoden/hole48_s11.png', 'boss/hoden/hole_s11.png', 'boss/hoden/hole80_s11.png', 'boss/hoden/hole96_s11.png'];
const IMG = { chunk: 'boss/hoden/chunk_s5.png', lantern: 'boss/hoden/lantern_s7.png', meteor: 'boss/hoden/meteor_s9.png', debris: 'boss/hoden/debris_s13.png', bar: 'ui/hoden/bossbar.png', target: 'ui/hacrocky/target.png' };
const VX = n => ART.vfx && ART.vfx[n];
let MM = null;
if (typeof fetch !== 'undefined') fetch('assets/px/boss/hoden/m.json').then(r => r.json()).then(j => { MM = j; for (const c of Object.values(j.clips)) img(c.file); for (const f of HOLE) img(f); for (const f of Object.values(IMG)) img(f); }).catch(() => {});
const M_FPS = { idle: 6, walk: 10, lift: 9, throw: 12, swing: 12, stun: 6, fall: 10 };
const M_LOOP = { idle: 1, walk: 1, stun: 1 };
function mFrame(Q) { const c = MM && MM.clips[Q.clip]; if (!c) return 0; const f = Math.floor(Q.t * M_FPS[Q.clip]); return M_LOOP[Q.clip] ? f % c.n : Math.min(c.n - 1, f); }
function mCell(Q) {   /* ô hình hiện tại: ảnh + ô nguồn + lật (8 hướng: W/SW/NW = lật E/SE/NE; clip ít hướng → hướng gần nhất có sẵn) */
  if (!MM) return null; let c = MM.clips[Q.clip] || MM.clips.idle, im = c && img(c.file); if (!im) { c = MM.clips.idle; im = c && img(c.file); if (!im) return null; }
  let dir = Q.dir || 'south', flip = false; if (MIRROR[dir]) { dir = MIRROR[dir]; flip = true; }
  if (!c.rows.includes(dir)) { const pick = { 'south-east': 'east', 'north-east': 'east', north: 'east', east: 'south' }[dir]; dir = c.rows.includes(pick) ? pick : c.rows[0]; }
  const row = Math.max(0, c.rows.indexOf(dir)); return { im, sx: (mFrame(Q) % c.n) * MM.cw, sy: row * MM.ch, sw: MM.cw, sh: MM.ch, flip };
}
function drawM(g, Q, x, y) {
  const C = mCell(Q); if (!C) return false; const dw = C.sw / 2, dh = C.sh / 2, X = Math.round(x), Y = Math.round(y);
  g.save(); g.imageSmoothingEnabled = false; if (Q.alpha != null && Q.alpha < 1) g.globalAlpha = Math.max(0, Q.alpha);
  if (C.flip) { g.translate(X, 0); g.scale(-1, 1); g.drawImage(C.im, C.sx, C.sy, C.sw, C.sh, -dw / 2, Y - dh + 1, dw, dh); }
  else g.drawImage(C.im, C.sx, C.sy, C.sw, C.sh, X - dw / 2, Y - dh + 1, dw, dh);
  if (Q.flash > 0) { g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.45; if (C.flip) g.drawImage(C.im, C.sx, C.sy, C.sw, C.sh, -dw / 2, Y - dh + 1, dw, dh); else g.drawImage(C.im, C.sx, C.sy, C.sw, C.sh, X - dw / 2, Y - dh + 1, dw, dh); }   /* chớp trắng khi trúng (cộng sáng, không filter) */
  g.restore(); return true;
}
/* ảnh 2× (PixelLab) vẽ 1:1 = cỡ đích ½, tâm tại (x, y) */
function blitC(g, im, x, y, alpha = 1, rot = 0) { const w = im.naturalWidth / 2, h = im.naturalHeight / 2; g.save(); g.imageSmoothingEnabled = false; if (alpha < 1) g.globalAlpha = Math.max(0, alpha); if (rot) { g.translate(Math.round(x), Math.round(y)); g.rotate(rot); g.drawImage(im, -w / 2, -h / 2, w, h); } else g.drawImage(im, Math.round(x - w / 2), Math.round(y - h / 2), w, h); g.restore(); }
function drawSheet(g, s, f, x, y, alpha = 1) {
  const hi = s.img.__hi ? 1 : 2, ax = s.ax != null ? s.ax : s.w / 2, ay = s.ay != null ? s.ay : s.h;
  g.save(); g.imageSmoothingEnabled = false; g.globalAlpha = alpha; g.drawImage(s.img, f * s.w * hi, 0, s.w * hi, s.h * hi, Math.round(x - ax), Math.round(y - ay), s.w, s.h); g.restore();
}
function drawSeg(g, s, f, x0, y0, x1, y1, alpha = 1) {
  if (!s) return; const a = Math.atan2(y1 - y0, x1 - x0), len = Math.hypot(x1 - x0, y1 - y0), ax = s.ax != null ? s.ax : s.w / 2, step = Math.max(20, s.w - ax - 8);
  for (let o = 0; o < len; o += step) bDraw(g, s, f, x0 + Math.cos(a) * o, y0 + Math.sin(a) * o, a, Math.min(step + 2, len - o), alpha);
}

/* ---------------- trạng thái ---------------- */
const ST = {};
function reset() {
  Object.assign(ST, { boss: null, mo2: null, t: 0, cd: { grav: 6, meteor: 3, swing: 0, blink: 6, ult: 0 }, fed: 0, charge: 0, exposed: 0, holeK: 1, holeShow: 1,
    chunks: [], meteors: [], tele: [], fx: [], flying: [], swallow: [], grav: null, ult: null, minis: [], proj: null, collapse: null, death: null, frags: [], streaks: [],
    banner: null, won: false, ultAt: [0.6, 0.3], log: [], startT: 0, seq: [], readyAt: {}, pvel: { x: 0, y: 0 }, pprev: null, hold: false, introDone: false, recent: [], q: null, orbA: 0, blockT: 0, lastHitSeen: null,
    tgt: 'r', tgtT: 0, agP: 0, restT: 10, nearT: 0, tgtLog: {}, kickCd: 0, hitCd: 0, warpS: 0, lastFire: null,
    stats: { seq: [], delay: {}, rkRaw: 0, rkDealt: 0, swallowed: 0, fedBy: {}, exposes: 0, hits: {}, novaHit: 0, novaSafe: 0, ultN: 0, meteors: 0, gravPulls: 0, edgePulled: 0, blocksBroken: 0, blocksRisen: 0, p2: 0 } });
}
reset();
const log = s => { ST.log.push(Math.round(ST.t * 10) / 10 + ' ' + s); if (ST.log.length > 80) ST.log.shift(); };
function fx(name, x, y, opt = {}) { const s = VX(name); if (!s) return false; ST.fx.push({ s, x, y, t: 0, dur: opt.dur || s.n / (s.fps || 12), top: !!opt.top, ground: !!opt.ground, alpha: opt.alpha || 1 }); return true; }
const boss = () => ST.boss || ST.mo2;
const HOLE_PX = [80, 112, 136, 160];   /* 2026-10-13 v2 (anh): hố HOÀNH TRÁNG — ảnh PixelLab thật từng bậc (tools/px-hoden-hole.py), vẽ 1:1 */
const holeLift = (k = ST.holeK) => 14 + HOLE_PX[Math.max(0, Math.min(3, k))] / 4;   /* tâm hố cao hơn chân lão: đỉnh đầu (~22) + bán kính ảnh */
const holePos = () => { const b = ST.boss; return b ? { x: b.x, y: b.y - holeLift() } : null; };   /* tâm hố (toạ độ vẽ) */
const holeR = () => [10, 14, 17, 20][Math.max(0, Math.min(3, ST.holeK))];   /* bán kính lõi theo cỡ ảnh */
const dmgMul = () => 1 + 0.12 * ST.charge;

/* ---------------- sát thương ---------------- */
function hurtPlayer(ctx, frac, from, react = 'stagger', power = 1, key = '') {
  const h = ctx.hero, p = ctx.S.player; if (!h || h.fainted) return false;
  const ok = h.hit(Math.max(1, Math.round(h.max * frac * dmgMul()))); if (!ok) return false;
  ST.stats.hits[key] = (ST.stats.hits[key] || 0) + 1; log('hit ' + key);
  if (ctx.knockPlayer && react) { const d = Math.hypot(p.x - from.x, p.y - from.y) || 1; ctx.knockPlayer({ type: react, power, dir: { x: (p.x - from.x) / d, y: (p.y - from.y) / d }, src: from, bound: (x, y) => !inHd(ctx) || y < (ctx.S.map.h - 3) * TS }); }
  return true;
}
const rkPos = ctx => (ctx.rocky && ctx.rocky.pos && ctx.rocky.pos()) || null;
const rkEnt = ctx => (ctx.rocky && ctx.rocky.ent && ctx.rocky.ent()) || null;
const rkAway = ctx => { const pt = rk(ctx); return !pt || (pt.koT || 0) > 0 || !rkPos(ctx); };
function hurtRocky(ctx, frac, from, kb = 50) {
  const pos = rkPos(ctx); if (!pos) return false; const pt = rk(ctx); if (!pt || !ctx.rocky.hitBy) return false;
  const d = Math.hypot(pos.x - from.x, pos.y - from.y) || 1, raw = Math.round(LV.maxHpOf(rkLv(ctx)) * frac * 1.1 * dmgMul());
  ctx.rocky.hitBy(raw, boss(), (pos.x - from.x) / d, (pos.y - from.y) / d, kb); return true;
}
function areaHit(ctx, x, y, r, frac, key, react = 'stagger', pw = 1) {
  const p = ctx.S.player; let n = 0;
  if (Math.hypot(p.x - x, p.y - y) < r) n += hurtPlayer(ctx, frac, { x, y }, react, pw, key) ? 1 : 0;
  const rp = rkPos(ctx); if (rp && Math.hypot(rp.x - x, rp.y - y) < r) n += hurtRocky(ctx, frac, { x, y }, react === 'fly' ? 60 : 45) ? 1 : 0;
  return n;
}

/* ---------------- va chạm / kẹt ---------------- */
const solidAt = (ctx, x, y) => ctx.isSolid(ctx.S.map, Math.floor(x / TS), Math.floor(y / TS));
const interior = ctx => { const m = ctx.S.map; return { x0: 3 * TS, y0: 3 * TS, x1: (m.w - 3) * TS, y1: (m.h - 4) * TS }; };
function clampIn(ctx, x, y) { const I = interior(ctx); return { x: Math.max(I.x0 + 6, Math.min(I.x1 - 6, x)), y: Math.max(I.y0 + 8, Math.min(I.y1 + 8, y)) }; }
function nearestFree(ctx, x, y) {
  const m = ctx.S.map, reach = m._hdReach || (m._hdReach = ctx.computeReach(m, m.entries.default)), sx = Math.floor(x / TS), sy = Math.floor(y / TS);
  if (!ctx.isSolid(m, sx, sy) && reach[sy * m.w + sx]) return null;
  const seen = new Set([sx + ',' + sy]), q = [[sx, sy]];
  while (q.length) { const [cx, cy] = q.shift(); for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = cx + a, ny = cy + b, k = nx + ',' + ny; if (seen.has(k) || nx < 0 || ny < 0 || nx >= m.w || ny >= m.h) continue; seen.add(k); if (!ctx.isSolid(m, nx, ny) && reach[ny * m.w + nx]) return { x: nx * TS + 8, y: ny * TS + 12 }; q.push([nx, ny]); } }
  return null;
}
function unstick(ctx) { const p = ctx.S.player; if (ctx.knocked && ctx.knocked()) return; const s = nearestFree(ctx, p.x, p.y); if (s) { p.x = s.x; p.y = s.y; log('unstick player'); } }
function moveMo(ctx, mo, dx, dy, sp, dt) {   /* đi có va chạm; kẹt > 0,6 s → đi xuyên (không đứng kẹt sau khối đá) */
  const d = Math.hypot(dx, dy) || 1, s = sp * dt, q = clampIn(ctx, mo.x + dx / d * s, mo.y + dy / d * s);
  if ((mo.stuckT || 0) > 0.6 || !solidAt(ctx, q.x, q.y)) { mo.x = q.x; mo.y = q.y; if (!solidAt(ctx, q.x, q.y)) mo.stuckT = 0; }
  else if (!solidAt(ctx, q.x, mo.y)) mo.x = q.x; else if (!solidAt(ctx, mo.x, q.y)) mo.y = q.y; else mo.stuckT = (mo.stuckT || 0) + dt;
}
/* kéo 1 thực thể (người / Rocky) về (cx, cy) có va chạm ô cứng (dừng ở vật cứng, không xuyên) */
function pullEnt(ctx, e, cx, cy, sp, dt) {
  const d = Math.hypot(cx - e.x, cy - e.y); if (d < 2) return; const s = Math.min(d, sp * dt), nx = e.x + (cx - e.x) / d * s, ny = e.y + (cy - e.y) / d * s;
  if (!solidAt(ctx, nx, ny)) { e.x = nx; e.y = ny; } else if (!solidAt(ctx, nx, e.y)) e.x = nx; else if (!solidAt(ctx, e.x, ny)) e.y = ny;
}

/* ---------------- khối đá (chỗ núp) + vật viền ---------------- */
const blocks = ctx => ctx.S.map.objects.filter(o => o.hdBlock);
const liveBlocks = ctx => blocks(ctx).filter(o => !o.ruined && !o.ghost);
function setSolid2(ctx, o, v) { const d = ctx.O[o.type] || { fw: 1, fh: 1 }; for (let j = 0; j < d.fh; j++) for (let i = 0; i < d.fw; i++) ctx.setSolid(ctx.S.map, o.x + i, o.y + j, v); }
const oCenter = (ctx, o) => { const d = ctx.O[o.orig || o.type] || { fw: 1, fh: 1 }; return { x: o.x * TS + d.fw * 8, y: (o.y + d.fh) * TS - 6 }; };
function hitBlock(ctx, o, n = 1, why = '') {
  if (!o || o.ruined || o.ghost) return false; o.hpMax = 4; o.hp = (o.hp ?? 4) - n; const c = oCenter(ctx, o);
  if (o.hp > 0) { if (ctx.vfx) ctx.vfx('rock_debris', c.x, c.y); ctx.sfx('knock_wall'); return false; }
  o.orig = o.type; o.ruined = true; o.hp = 0; setSolid2(ctx, o, 0); ST.stats.blocksBroken++;
  if (ctx.vfx) { ctx.vfx('rock_debris', c.x - 6, c.y); ctx.vfx('rock_debris', c.x + 6, c.y); ctx.vfx('dirt_puff', c.x, c.y + 2); } ctx.sfx('smash'); if (ctx.quake) ctx.quake(0.15);
  spawnChunk(ctx, c.x - 9, c.y + 8, { vx: -40, vy: 30 }); spawnChunk(ctx, c.x + 9, c.y + 8, { vx: 40, vy: 30 }); log('block broken ' + why);
  return true;
}
function riseBlock(ctx, o) {   /* dựng lại khối đá đã vỡ (không trồi lên đầu người / Rocky / trùm) */
  const d = ctx.O.hd_block, x0 = o.x * TS, x1 = (o.x + d.fw) * TS, y0 = o.y * TS, y1 = (o.y + d.fh) * TS, inside = e => e && e.x > x0 - 6 && e.x < x1 + 6 && e.y > y0 - 2 && e.y < y1 + 8;
  if (inside(ctx.S.player) || inside(rkPos(ctx)) || inside(boss())) return false;
  o.ruined = false; o.orig = null; o.hp = 4; o.hpMax = 4; o.dig = 0; setSolid2(ctx, o, 1); ST.stats.blocksRisen++;
  const c = oCenter(ctx, o); if (ctx.vfx) { ctx.vfx('rock_debris', c.x, c.y); ctx.vfx('dirt_puff', c.x - 8, c.y + 2); ctx.vfx('dirt_puff', c.x + 8, c.y + 2); } ctx.sfx('rock_break'); if (ctx.quake) ctx.quake(0.1);
  log('block risen'); return true;
}
function ensureBlocks(ctx, n, force = false) {   /* luôn còn ≥ n khối đá đứng (sinh lại nếu bị phá hết) */
  let live = liveBlocks(ctx).length; if (live >= n) return 0; let k = 0;
  const dead = blocks(ctx).filter(o => o.ruined).sort(() => Math.random() - 0.5);
  for (const o of dead) { if (live >= n) break; if (riseBlock(ctx, o)) { live++; k++; } }
  if (k && !force) ctx.toast(L(ctx).rise2);
  return k;
}
const EDGE_T = /^(beam|cart|torch)$/;
const edgeObjs = ctx => ctx.S.map.objects.filter(o => o.hdEdge && !o.ruined && !o.ghost && EDGE_T.test(o.type));

/* ---------------- cục đá (thức ăn của hố) ---------------- */
function spawnChunk(ctx, x, y, o = {}) {
  if (ST.chunks.length >= 9) return null; const q = clampIn(ctx, x, y); if (solidAt(ctx, q.x, q.y)) { const f = nearestFree(ctx, q.x, q.y); if (f) { q.x = f.x; q.y = f.y; } }
  const c = { id: Math.random().toString(36).slice(2, 7), x: q.x, y: q.y, vx: o.vx || 0, vy: o.vy || 0, z: o.z || 0, vz: o.vz || 0, t: 0, eat: null }; ST.chunks.push(c); return c;
}
function kickChunk(ctx, c, from) {
  const H = ST.boss ? { x: ST.boss.x, y: ST.boss.y } : null, ax = c.x - from.x, ay = c.y - from.y, a0 = Math.atan2(ay, ax);
  let a = a0; if (H) { const ah = Math.atan2(H.y - c.y, H.x - c.x); let d = ah - a0; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; if (Math.abs(d) < 1.25) a = ah; }   /* đẩy gần đúng hướng hố → tự nhắm vào hố */
  c.vx = Math.cos(a) * 190; c.vy = Math.sin(a) * 190; c.kicked = 1.2; ctx.sfx('knock_wall'); if (ctx.vfx) ctx.vfx('dirt_puff', c.x, c.y + 2); log('kick chunk');
}
function chunksTick(ctx, dt) {
  const b = ST.boss, p = ctx.S.player;
  for (const c of ST.chunks) {
    c.t += dt; if (c.kicked > 0) c.kicked -= dt;
    if (c.eat) { c.eat.t += dt; continue; }
    if (c.z > 0 || c.vz) { c.vz -= 260 * dt; c.z = Math.max(0, c.z + c.vz * dt); if (c.z <= 0) { if (Math.abs(c.vz) > 60 && ctx.vfx) ctx.vfx('dirt_puff', c.x, c.y + 2); c.vz = 0; } }
    /* người đi đẩy (đâm vào cục đá → đá lăn theo hướng đi) */
    if (p.moving && Math.hypot(p.x - c.x, p.y - c.y) < 10 && !(c.kicked > 0)) { const d = Math.hypot(c.x - p.x, c.y - p.y) || 1; c.vx = (c.x - p.x) / d * 95; c.vy = (c.y - p.y) / d * 95; }
    /* trọng lực / hố hút gần */
    if (b && !ST.collapse && !(ST.exposed > 0)) {
      const dx = b.x - c.x, dy = b.y - c.y, d = Math.hypot(dx, dy) || 1, g = ST.grav && ST.grav.ph === 'pull' ? 260 : d < 46 ? 120 : 0;
      if (g) { c.vx += dx / d * g * dt; c.vy += dy / d * g * dt; }
      if (d < 18 + holeR()) { c.eat = { t: 0, x0: c.x, y0: c.y }; ctx.sfx('whirl'); continue; }
    }
    const k = Math.max(0, 1 - 2.2 * dt); c.vx *= k; c.vy *= k;
    const nx = c.x + c.vx * dt, ny = c.y + c.vy * dt, q = clampIn(ctx, nx, ny);
    if (!solidAt(ctx, q.x, q.y)) { c.x = q.x; c.y = q.y; } else { if (Math.hypot(c.vx, c.vy) > 120) { const o = objAtPx(ctx, q.x, q.y); if (o && o.hdBlock) hitBlock(ctx, o, 1, 'chunk'); } c.vx *= -0.4; c.vy *= -0.4; }
  }
  for (const c of ST.chunks) if (c.eat && c.eat.t >= 0.45 && !c.eat.done) { c.eat.done = true; feed(ctx, 'chunk'); }
  ST.chunks = ST.chunks.filter(c => !(c.eat && c.eat.done));
}
function objAtPx(ctx, x, y) { const tx = Math.floor(x / TS), ty = Math.floor(y / TS); for (const o of ctx.S.map.objects) { if (o.ghost || o.ruined) continue; const d = ctx.O[o.type]; if (d && tx >= o.x && tx < o.x + d.fw && ty >= o.y && ty < o.y + d.fh) return o; } return null; }
function feed(ctx, why) {
  if (!ST.boss || ST.exposed > 0 || ST.collapse) return;
  ST.fed = Math.min(FEED_N, ST.fed + 1); ST.stats.fedBy[why] = (ST.stats.fedBy[why] || 0) + 1; ST.agP += AG.feed;
  const H = holePos(); fx('hd_implode', H.x, H.y, { top: true }); ctx.sfx('rock_break'); if (ctx.pop) ctx.pop(H.x, H.y - 12, L(ctx).fed(ST.fed, FEED_N), '#ffd6a0'); log('fed ' + why + ' ' + ST.fed);
  if (ST.fed >= FEED_N) expose(ctx);
}
function expose(ctx) {
  const b = ST.boss; if (!b) return; ST.exposed = EXPOSE_T; ST.stats.exposes++; b.act = null; b.stunT = STUN_T; b.open = true; ST.grav = null; ST.tele = ST.tele.filter(q => q.keep);
  ST.charge = 0; ST.banner = { txt: L(ctx).full, t: 2.4 }; const H = holePos(); fx('hd_implode', H.x, H.y, { top: true }); fx('hd_implode', b.x, b.y - 12, {}); ctx.sfx('gate_open'); if (ctx.quake) ctx.quake(0.25); log('EXPOSED');
}

/* ---------------- HÚT CHIÊU: hố nuốt Rocky-ha (ctx.haFilter ← pet.js) ---------------- */
function haFilter(ctx, ox, oy, ang, len, w, tier) {
  const b = ST.boss; if (!inHd(ctx) || ST.won || !b || b.intro > 0) return null;
  ST.lastFire = { ox: Math.round(ox), oy: Math.round(oy), ang: +ang.toFixed(3), len: Math.round(len), swallowed: false };
  if (ST.exposed > 0 || ST.collapse) return null;   /* lõi lộ: luồng đi thẳng, trúng lão */
  const H = holePos(), dx = Math.cos(ang), dy = Math.sin(ang), cap = holeR() + 26 + ST.charge * 2;
  const tH = (H.x - ox) * dx + (H.y - oy) * dy, dH = Math.abs((H.x - ox) * dy - (H.y - oy) * dx);   /* điểm gần hố nhất trên đường luồng + khoảng cách */
  const tB = (b.x - ox) * dx + (b.y - 10 - oy) * dy, dB = Math.abs((b.x - ox) * dy - (b.y - 10 - oy) * dx);
  let t = null; if (tH > 0 && tH < len + cap && dH < cap) t = tH; else if (tB > 0 && tB < len + 20 && dB < 22) t = tB;
  if (t == null) return null;
  const cut = Math.max(6, Math.min(t - 18, tB - 22)), sx = ox + dx * cut, sy = oy + dy * cut;
  ST.swallow.push({ t: 0, life: 0.7, x0: sx, y0: sy, a: ang, tier: tier || 4, side: ((H.x - sx) * dy - (H.y - sy) * dx) > 0 ? 1 : -1 });
  ST.charge = Math.min(CHARGE_MAX, ST.charge + 1); ST.stats.swallowed++; ST.lastFire.swallowed = true; ST.holePulse = 0.4;
  ctx.sfx('whirl'); if (ctx.quake) ctx.quake(0.12);
  if (ST.t - (ST.swT || -99) > 6) { ST.swT = ST.t; ctx.toast(L(ctx).swallow); }
  log('swallow ha → charge ' + ST.charge);
  return cut;
}

/* ---------------- tạo trùm ---------------- */
const INTRO = 2.8;
function spawnBoss(ctx) {
  const m = ctx.S.map, s = m.hdBoss || { x: 15, y: 7 }, hp = bossHp(ctx), t = L(ctx);
  const cfg = { key: 'hoden', vi: STR.vi.name, en: STR.en.name, hp, dmg: 12, armor: 0, sp: 58, xp: 0, w: 18, h: 26, c: ['#3a3640', '#8a50c0', '#ffffff'], hdBoss: true, noXpTag: true, shell: true, weak: 1,
    aiFn: (c2, mo, dt, p, dp, canHit) => bossAi(c2, mo, dt, p, dp, canHit), drawFn: (g, mo, x, y) => drawBoss(g, mo, x, y), onDown: mo => minerDown(ctx, mo), tip: { vi: STR.vi.shield, en: STR.en.shield } };
  const mo = ctx.monsters.add(cfg, s.x * TS + 8, s.y * TS + 10);
  Object.assign(mo, { phase: 1, angry: true, warned: true, intro: INTRO, act: null, stunT: 0, open: false });
  ST.boss = mo; ST.q = { clip: 'swing', t: 0, dir: 'south', alpha: 1 }; ST.holeShow = 0; ST.startT = ST.t;
  ST.banner = { txt: t.intro, t: 1.6 }; ctx.sfx('dig'); log('spawn hp ' + hp);
  for (const [x, y] of [[8, 10], [21, 10], [11, 15], [18, 15]]) spawnChunk(ctx, x * TS + 8, y * TS + 8);
  return mo;
}
function skipIntro(ctx) { const mo = ST.boss; if (!mo || !(mo.intro > 0)) return; mo.intro = 0.001; log('intro skip'); }
function introTick(ctx, mo, dt) {   /* 0–1,2 s lão bổ cuốc xuống nền (nứt) · 1,2 s hố đen trồi từ đèn lên · 2 s giơ đèn nâng hố */
  const it = INTRO - mo.intro, Q = ST.q;
  if (it < 1.2) { if (Q.clip !== 'swing') { Q.clip = 'swing'; Q.t = 0; } if (!ST.introCrack && it > 0.5) { ST.introCrack = true; fx('knock_erupt', mo.x, mo.y + 8, {}); ctx.sfx('smash'); if (ctx.quake) ctx.quake(0.2); } }
  else { if (Q.clip !== 'lift') { Q.clip = 'lift'; Q.t = 0; ST.banner = { txt: L(ctx).rise, t: 2 }; ctx.sfx('whirl'); } ST.holeShow = Math.min(1, (it - 1.2) / 1.1); }
}

/* ---------------- AI pha 1 ---------------- */
function tgPos(ctx, w) { if (w === 'r') { if (rkAway(ctx)) return null; return rkPos(ctx); } return ctx.S.player; }
function aggroTick(ctx, mo, dt) {
  const p = ctx.S.player, gone = rkAway(ctx); ST.tgtT += dt; ST.tgtLog[ST.tgt] = (ST.tgtLog[ST.tgt] || 0) + dt;
  if (dist(mo, p) < 34) { ST.nearT += dt; if (ST.nearT > 2) ST.agP += AG.near * dt; } else ST.nearT = 0;
  if (ST.tgt === 'r' && !gone) { ST.restT -= dt; if (ST.restT <= 0) { ST.agP = Math.max(ST.agP, AG.burst); ST.restT = 99; } }
  ST.agP = Math.max(0, ST.agP - AG.decay * dt * (ST.tgt === 'p' ? 1 : 0.6));
  let want = ST.tgt;
  if (gone) want = 'p'; else if (ST.tgt === 'r' && ST.agP > AG.rk) want = 'p'; else if (ST.tgt === 'p' && ST.agP < AG.back && ST.tgtT >= AG.hold) want = 'r';
  if (want !== ST.tgt && (ST.tgtT >= AG.gap || gone)) { ST.tgt = want; ST.tgtT = 0; if (want === 'p') ST.agP = Math.max(ST.agP, AG.burst); else ST.restT = AG.restless[0] + Math.random() * (AG.restless[1] - AG.restless[0]); if (!gone) ctx.toast(want === 'p' ? L(ctx).aimYou : L(ctx).aimRk); log('aim ' + want); }
}
function qClip(clip) { const Q = ST.q; if (Q && Q.clip !== clip) { Q.clip = clip; Q.t = 0; } }
function qPlay(clip) { const Q = ST.q; if (Q) { Q.clip = clip; Q.t = 0; } }
function seenHit(ctx, mo) { const lh = ctx.monsters.lastHitT ? ctx.monsters.lastHitT() : -99; if (lh !== ST.lastHitSeen) { if (ST.lastHitSeen != null && lh > 0 && !(mo.intro > 0)) { ST.agP += AG.hit; ST.recent.push(ST.t); } ST.lastHitSeen = lh; } }
function bossAi(ctx, mo, dt, p, dp, canHit) {
  mo.kb = null; mo.angry = true; mo.warned = true; const Q = ST.q; if (!Q) return;
  seenHit(ctx, mo);
  if (mo.intro > 0) { mo.intro -= dt; introTick(ctx, mo, dt); if (mo.intro <= 0) { const k = mo.hp / mo.max, nh = bossHp(ctx); mo.max = nh; mo.hp = Math.max(1, Math.round(nh * k)); ST.holeShow = 1; qClip('idle'); ST.introDone = true; log('fight hp ' + nh); } return; }
  if (ST.ult) { mo.hp = Math.max(mo.hp, ST.ult.hp0); return; }
  if (mo.phase === 1 && mo.hp <= mo.max * 0.5) { mo.phase = 2; ctx.sfx('roar_big'); log('angry'); }
  for (const k in ST.cd) if (ST.cd[k] > 0) { ST.cd[k] -= dt; if (ST.cd[k] <= 0) ST.readyAt[k] = ST.t; }
  if (mo.stunT > 0) { mo.stunT -= dt; qClip('stun'); return; }
  if (!ST.hold) aggroTick(ctx, mo, dt);
  if (mo.act) return actTick(ctx, mo, mo.act, dt, p);
  if (!canHit || ST.hold) { qClip('idle'); return; }
  ST.recent = ST.recent.filter(t => ST.t - t < 1.6);
  const tp = tgPos(ctx, ST.tgt) || p, d = dist(mo, tp), frac = mo.hp / mo.max, fast = mo.phase === 2;
  if (ST.recent.length >= 3 && !(mo.dodgeCd > ST.t)) return startBlink(ctx, mo, tp, true);
  /* 2026-10-13 v2 (anh): mỗi chiêu hồi chiêu riêng; chọn chiêu MẠNH NHẤT đã hồi + đủ điều kiện: tuyệt chiêu > Trọng Lực > Thiên Thạch > Dịch Chuyển > Bổ Cuốc; không 1 chiêu quá 2 lần liền */
  const ok = k => ST.cd[k] <= 0 && !rep2(k);
  if (!(ST.exposed > 0) && ((ST.ultAt.length && frac <= ST.ultAt[0]) || (!ST.ultAt.length && frac < 0.6 && ST.cd.ult <= 0))) { if (ST.ultAt.length) ST.ultAt.shift(); used('ult'); return startUlt(ctx, mo); }
  if (ok('grav') && !(ST.exposed > 0)) { used('grav'); return startGrav(ctx, mo); }
  if (ok('meteor')) { used('meteor'); return startMeteor(ctx, mo, tp); }
  if (ok('blink') && d > 110) { used('blink'); return startBlink(ctx, mo, tp, false); }
  if (d < 34 && ok('swing')) { used('swing'); return startSwing(ctx, mo, tp); }
  if (d < 34 && ST.cd.swing <= 0 && rep2('swing') && !(mo.dodgeCd > ST.t)) { used('step'); return startBlink(ctx, mo, tp, true); }   /* đã bổ 2 lần liền: lách sang chỗ khác rồi mới đánh tiếp */
  if (d > 28) { moveMo(ctx, mo, tp.x - mo.x, tp.y - mo.y, SPD[fast ? 1 : 0] * (ST.exposed > 0 ? 0.6 : 1), dt); qClip('walk'); Q.dir = dirOf(tp.x - mo.x, tp.y - mo.y); }   /* đi tới ≤ 28 px < tầm bổ cuốc 34 px → không vùng chết */
  else { qClip('idle'); Q.dir = dirOf(tp.x - mo.x, tp.y - mo.y); }
}
const rep2 = k => { const q = ST.seq; return q.length >= 2 && q[q.length - 1] === k && q[q.length - 2] === k; };
function used(k, cdObj) {   /* ghi chuỗi chiêu + độ trễ từ lúc hồi xong tới lúc dùng (kiểm "chiêu mạnh dùng ngay khi hồi") */
  ST.seq.push(k); if (ST.seq.length > 30) ST.seq.shift(); ST.stats.seq.push(k + '@' + Math.round(ST.t)); if (ST.stats.seq.length > 120) ST.stats.seq.shift();
  const r = ST.readyAt[k]; if (r != null) { (ST.stats.delay[k] ||= []).push(+(ST.t - r).toFixed(2)); ST.readyAt[k] = null; }
}
function startSwing(ctx, mo, tp) {
  const T = mo.phase === 2 ? 0.5 : 0.6; ST.q.dir = dirOf(tp.x - mo.x, tp.y - mo.y);
  mo.act = { k: 'swing', t: 0, T }; ST.tele.push({ type: 'c', x: mo.x, y: mo.y, r: 34, t: T, T0: T, col: '#c890ff', follow: mo }); qPlay('swing'); ctx.sfx('spar_charge'); log('act swing');
}
function startGrav(ctx, mo) {
  mo.act = { k: 'grav', t: 0 }; ST.grav = { ph: 'warn', t: 0, x: mo.x, y: mo.y, pulled: [], picks: [] }; qPlay('lift'); ctx.sfx('whirl');
  ST.tele.push({ type: 'grav', x: mo.x, y: mo.y, r: GRAV.r * 0.55, t: GRAV.warn, T0: GRAV.warn });
  if (ctx.pop) ctx.pop(mo.x, mo.y - 54, L(ctx).grav, '#d8b0ff'); ctx.toast(L(ctx).grav); ST.stats.gravPulls++; log('act grav');
}
function startMeteor(ctx, mo, tp) {
  mo.act = { k: 'meteor', t: 0, T: 0.55 }; qPlay('lift'); ST.q.dir = dirOf(tp.x - mo.x, tp.y - mo.y); ctx.sfx('spar_charge');
  const n = 3 + Math.min(4, ST.charge) + (mo.phase === 2 ? 1 : 0), H = holePos(), pts = [{ x: tp.x, y: tp.y }];
  const rp = rkPos(ctx), pp = ctx.S.player; if (rp && tp !== rp) pts.push({ x: rp.x, y: rp.y }); if (tp !== pp) pts.push({ x: pp.x, y: pp.y });
  while (pts.length < n) { const a = Math.random() * Math.PI * 2, r = 18 + Math.random() * 46; pts.push({ x: tp.x + Math.cos(a) * r, y: tp.y + Math.sin(a) * r * 0.8 }); }
  pts.forEach((q, i) => { const c = clampIn(ctx, q.x, q.y), T = 1.1 + i * 0.16; ST.meteors.push({ x: c.x, y: c.y, t: 0, T, sx: H.x, sy: H.y, r: 15 }); ST.tele.push({ type: 'met', x: c.x, y: c.y, r: 15, t: T, T0: T }); });
  if (ctx.pop) ctx.pop(mo.x, mo.y - 54, L(ctx).meteor, '#ffb070'); ST.stats.meteors += n; log('act meteor ' + n);
}
function startBlink(ctx, mo, tp, dodge) {   /* dịch chuyển: vòng báo ở chỗ tới 0,6 s (né: 0,3 s, lùi xa) */
  const d = dist(mo, tp) || 1; let best = null;
  for (let i = 0; i < 12; i++) { const a = Math.random() * Math.PI * 2, r = dodge ? 70 : 52, q = clampIn(ctx, (dodge ? mo.x : tp.x) + Math.cos(a) * r, (dodge ? mo.y : tp.y) + Math.sin(a) * r * 0.8); if (!solidAt(ctx, q.x, q.y) && !solidAt(ctx, q.x, q.y - 8) && (!dodge || Math.hypot(q.x - tp.x, q.y - tp.y) > d)) { best = q; break; } }
  if (dodge) mo.dodgeCd = ST.t + 3.4; else ST.cd.blink = CD.blink;
  if (!best) return; const T = dodge ? 0.3 : 0.6;
  mo.act = { k: 'blink', t: 0, T, x1: best.x, y1: best.y }; ST.tele.push({ type: 'c', x: best.x, y: best.y, r: 14, t: T, T0: T, col: '#b070ff' }); fx('hd_implode', mo.x, mo.y - 12, {}); ctx.sfx('whoosh_big'); log(dodge ? 'dodge' : 'blink');
}
function actTick(ctx, mo, A, dt, p) {
  A.t += dt; const Q = ST.q;
  if (A.k === 'swing') {
    if (A.t < A.T) { const tp = tgPos(ctx, ST.tgt) || p; Q.dir = dirOf(tp.x - mo.x, tp.y - mo.y); }
    if (!A.hit && A.t >= A.T) { A.hit = true; ctx.sfx('smash'); fx('knock_erupt', mo.x, mo.y + 6, {}); if (ctx.quake) ctx.quake(0.12); areaHit(ctx, mo.x, mo.y, 36, DMG.swing, 'swing', 'fly', 1.0);   /* đòn mạnh: hất người chơi bay như Rocky */ for (const o of liveBlocks(ctx)) { const c = oCenter(ctx, o); if (Math.hypot(c.x - mo.x, c.y - mo.y) < 36) hitBlock(ctx, o, 1, 'swing'); } }
    if (A.t >= A.T + 0.3) { mo.act = null; ST.cd.swing = mo.phase === 2 ? 1.1 : CD.swing; }
    return;
  }
  if (A.k === 'grav') { qClip('lift'); if (!ST.grav) { mo.act = null; ST.cd.grav = CD.grav; } return; }
  if (A.k === 'meteor') { if (A.t >= A.T + 0.35) { mo.act = null; ST.cd.meteor = CD.meteor * (mo.phase === 2 ? 0.8 : 1); } return; }
  if (A.k === 'blink') {
    if (A.t >= A.T && !A.done) { A.done = true; mo.x = A.x1; mo.y = A.y1; fx('hd_implode', mo.x, mo.y - 12, {}); ctx.sfx('whoosh_big'); ST.recent = []; }
    Q.alpha = A.t < A.T ? Math.max(0.15, 1 - A.t / A.T) : Math.min(1, (A.t - A.T) / 0.2);
    if (A.t >= A.T + 0.2) { Q.alpha = 1; mo.act = null; }
    return;
  }
}

/* ---------------- TRỌNG LỰC ---------------- */
function gravTick(ctx, dt) {
  const G = ST.grav, b = ST.boss; if (!G || !b) { ST.grav = null; return; } G.t += dt; G.x = b.x; G.y = b.y;
  if (G.ph === 'warn') { if (G.t >= GRAV.warn) { G.ph = 'pull'; G.t = 0; ctx.sfx('whoosh_big'); if (ctx.quake) ctx.quake(0.15);
      const E = edgeObjs(ctx).map(o => ({ o, d: dist(oCenter(ctx, o), b) })).filter(q => q.d < 300).sort((a, c) => a.d - c.d).slice(0, 2);
      if (liveBlocks(ctx).length > 4) { const bl = liveBlocks(ctx).map(o => ({ o, d: dist(oCenter(ctx, o), b) })).sort((a, c) => a.d - c.d)[0]; if (bl && bl.d < 130) E.push(bl); }
      G.picks = E.map((q, i) => ({ o: q.o, at: 0.35 + i * 0.7 })); }
    return; }
  if (G.ph === 'pull') {
    const p = ctx.S.player, h = ctx.hero, knocked = ctx.knocked && ctx.knocked();
    if (!(h && h.fainted) && !knocked && !(ST.ult)) {
      const d = Math.hypot(p.x - b.x, p.y - b.y), sp = GRAV.sp * Math.max(0.3, Math.min(1, 1.15 - d / GRAV.r));
      if (d < GRAV.r) pullEnt(ctx, p, b.x, b.y, sp, dt);
      if (d < GRAV.core && !(ST.hitCd > ST.t)) { ST.hitCd = ST.t + 0.9; hurtPlayer(ctx, DMG.grav, { x: b.x, y: b.y - 4 }, 'fly', 1.0, 'grav_core'); }
    }
    const e = rkEnt(ctx), rp = rkPos(ctx); if (e && rp && !e.kfly) { const d = Math.hypot(rp.x - b.x, rp.y - b.y); if (d < GRAV.r) pullEnt(ctx, e, b.x, b.y, GRAV.sp * 0.9 * Math.max(0.3, Math.min(1, 1.15 - d / GRAV.r)), dt); if (d < GRAV.core && !(ST.rkHitCd > ST.t)) { ST.rkHitCd = ST.t + 0.9; hurtRocky(ctx, DMG.grav, { x: b.x, y: b.y - 4 }, 60); } }
    for (const k of G.picks) if (!k.done && G.t >= k.at) { k.done = true; pullObj(ctx, k.o); }
    if (Math.random() < dt * 22) { const a = Math.random() * Math.PI * 2, r = 90 + Math.random() * 120; ST.streaks.push({ a, r, t: 0, life: 0.55 + Math.random() * 0.3, sp: 160 + Math.random() * 80, cx: b.x, cy: b.y - holeLift() * 0.5 }); }   /* hạt bụi kéo vệt xoáy vào tâm — CHỈ lúc kéo */
    if (G.t >= GRAV.dur) { ST.grav = null; log('grav end'); }
  }
}
function pullObj(ctx, o) {   /* vật viền ĐỔ thật (ảnh đổ nát PixelLab của chính nó) + 1 bản ảnh vật bay xoáy vào hố → hố ăn */
  if (!o || o.ruined) return; const d = ctx.O[o.type] || { fw: 1, fh: 1, w: 16, h: 16 }, c = oCenter(ctx, o), im = d.img;
  ST.flying.push({ im, w: d.w, h: d.h, x: c.x, y: c.y - d.h / 2 + 4, x0: c.x, y0: c.y - d.h / 2 + 4, t: 0, T: 0.75, spin: (Math.random() < 0.5 ? -1 : 1) * (5 + Math.random() * 4) });
  if (o.hdBlock) { o.orig = o.type; o.ruined = true; o.hp = 0; setSolid2(ctx, o, 0); ST.stats.blocksBroken++; }
  else { o.orig = o.type; o.ruined = true; o.hp = 0; setSolid2(ctx, o, 0); }
  ST.stats.edgePulled++; if (ctx.vfx) { ctx.vfx('rock_debris', c.x, c.y); ctx.vfx('dirt_puff', c.x, c.y + 2); } ctx.sfx('smash'); log('pull obj ' + o.type);
}
function flyingTick(ctx, dt) {
  const H = holePos();
  for (const f of ST.flying) { f.t += dt; const u = Math.min(1, f.t / f.T), k = u * u; if (H) { f.x = f.x0 + (H.x - f.x0) * k + Math.sin(u * Math.PI) * 18 * Math.sign(f.spin); f.y = f.y0 + (H.y - f.y0) * k - Math.sin(u * Math.PI) * 26; } f.rot = f.spin * f.t; f.sc = 1 - 0.75 * k;
    if (u >= 1 && !f.done) { f.done = true; feed(ctx, 'edge'); } }
  ST.flying = ST.flying.filter(f => !f.done);
}

/* ---------------- THIÊN THẠCH ---------------- */
function meteorTick(ctx, dt) {
  for (const M of ST.meteors) {
    M.t += dt;
    if (!M.hit && M.t >= M.T) { M.hit = true; ctx.sfx('smash'); if (ctx.quake) ctx.quake(0.1); fx('ult_magmahit', M.x, M.y + 4, {}) || (ctx.vfx && ctx.vfx('rock_debris', M.x, M.y));
      areaHit(ctx, M.x, M.y, M.r, DMG.meteor, 'meteor', 'fly', 0.85);
      for (const o of liveBlocks(ctx)) { const c = oCenter(ctx, o); if (Math.abs(c.x - M.x) < 20 && Math.abs(c.y - M.y) < 16) hitBlock(ctx, o, 1, 'meteor'); }
      if (Math.random() < 0.45 && !solidAt(ctx, M.x, M.y)) spawnChunk(ctx, M.x, M.y, { z: 6, vz: 40 });   /* thiên thạch nguội thành cục đá — thức ăn cho hố */
    }
  }
  ST.meteors = ST.meteors.filter(M => M.t < M.T + 0.05);
}

/* ---------------- TUYỆT CHIÊU: Sự Kiện Chân Trời ---------------- */
function startUlt(ctx, mo) {
  const m = ctx.S.map, C = m.hdCenter || { x: mo.x, y: mo.y };
  ST.ult = { ph: 'gather', t: 0, real: 0, hp0: mo.hp, x: C.x, y: C.y + 10, r: 0, hitP: false, hitR: false, ts: false };
  mo.act = null; ST.grav = null; ST.tele = []; ST.meteors = [];
  fx('hd_implode', mo.x, mo.y - 12, {}); mo.x = C.x; mo.y = C.y + 10; fx('hd_implode', mo.x, mo.y - 12, {}); qPlay('lift'); ST.q.dir = 'south';
  ensureBlocks(ctx, 3, true);   /* luôn có ≥ 3 khối đá để núp */
  ST.banner = { txt: L(ctx).ult, t: 2.6 }; setTimeout(() => { if (ST.ult) ctx.toast(L(ctx).ultHint, true); }, 400);
  ctx.sfx('roar_big'); if (ctx.quake) ctx.quake(0.3); ST.stats.ultN++; ST.cd.ult = CD.ult; log('ULT start');
}
/* có vật cứng chặn đường thẳng từ tâm hố tới điểm (x, y)? (dò 3 px; bỏ 18 px đầu quanh lõi và 6 px cuối dưới chân) */
function shielded(ctx, cx, cy, x, y) {
  const d = Math.hypot(x - cx, y - cy), ux = (x - cx) / (d || 1), uy = (y - cy) / (d || 1);
  for (let s = 18; s < d - 6; s += 3) if (solidAt(ctx, cx + ux * s, cy + uy * s)) return true;
  return false;
}
function ultTick(ctx, mo, dt) {
  const U = ST.ult, S = ctx.S, real = dt / (S.timeScale || 1); U.t += dt; U.real += real; qClip('lift');
  if (U.ph === 'gather' && U.real >= HORIZON.gather) { U.ph = 'horizon'; U.real = 0; if ((S.timeScale ?? 1) === 1) { S.timeScale = 0.5; U.ts = true; } ctx.sfx('whirl'); log('horizon'); }
  else if (U.ph === 'horizon') {
    if (Math.random() < real * 40) { const a = Math.random() * Math.PI * 2, r = 80 + Math.random() * 150; ST.streaks.push({ a, r, t: 0, life: 0.7 + Math.random() * 0.4, sp: 120 + Math.random() * 90, cx: mo.x, cy: mo.y - holeLift() }); }
    const p = S.player; if (!(ctx.hero && ctx.hero.fainted)) pullEnt(ctx, p, mo.x, mo.y, 14, dt);   /* kéo nhẹ — căng thẳng, vẫn chạy ra núp được */
    if (U.real >= HORIZON.real) { U.ph = 'nova'; U.t = 0; if (U.ts && S.timeScale === 0.5) S.timeScale = 1; U.ts = false; ctx.sfx('boss_win'); if (ctx.quake) ctx.quake(0.5); fx('hd_nova', mo.x, mo.y - holeLift(), { top: true }); fx('ult_firering', mo.x, mo.y, {}); ST.banner = { txt: L(ctx).nova, t: 1.4 }; log('NOVA'); }
  }
  else if (U.ph === 'nova') {
    U.r = U.t * HORIZON.ring; const cx = mo.x, cy = mo.y - 8, p = S.player;
    if (!U.hitP && Math.hypot(p.x - cx, p.y - cy) <= U.r) { U.hitP = true;
      if (shielded(ctx, cx, cy, p.x, p.y - 4)) { ST.stats.novaSafe++; if (ctx.pop) ctx.pop(p.x, p.y - 26, L(ctx).safe, '#a0ffb0'); log('nova SAFE'); }
      else { ST.stats.novaHit++; hurtPlayer(ctx, DMG.nova, { x: cx, y: cy }, 'fly', 1.3, 'nova'); log('nova HIT'); } }
    const rp = rkPos(ctx); if (!U.hitR && rp && Math.hypot(rp.x - cx, rp.y - cy) <= U.r) { U.hitR = true; if (!shielded(ctx, cx, cy, rp.x, rp.y - 4)) hurtRocky(ctx, DMG.nova, { x: cx, y: cy }, 70); }
    for (const o of liveBlocks(ctx)) { if (o.novaHit === U) continue; const c = oCenter(ctx, o); if (Math.hypot(c.x - cx, c.y - cy) <= U.r) { o.novaHit = U; o.hpMax = 4; o.hp = Math.max(1, (o.hp ?? 4) - 1); if (ctx.vfx) ctx.vfx('rock_debris', c.x, c.y - 4); } }   /* đá chịu được siêu tân tinh (nứt, không vỡ) */
    if (U.r >= HORIZON.max) { U.ph = 'after'; U.t = 0; }
  }
  else if (U.ph === 'after' && U.t >= 0.6) { ST.ult = null; mo.act = null; ST.cd.grav = Math.max(ST.cd.grav, 4); ST.cd.meteor = Math.max(ST.cd.meteor, 2.5); log('ULT end'); }
}

/* ---------------- PHA 2 ---------------- */
function minerDown(ctx, mo) {
  ST.boss = null; ST.grav = null; ST.ult = null; ST.meteors = []; ST.tele = []; ST.exposed = 0; ST.flying = [];
  for (const c of ST.chunks) c.vx = c.vy = 0;
  if (ctx.S.timeScale === 0.5) ctx.S.timeScale = 1;
  ST.collapse = { t: 0, x: mo.x, y: mo.y, k0: ST.holeK }; ST.q = { clip: 'lift', t: 0, dir: 'south', alpha: 1 };
  ST.banner = { txt: L(ctx).collapse, t: 2.2 }; ctx.sfx('whirl'); if (ctx.quake) ctx.quake(0.3); log('miner down → collapse');
}
function collapseTick(ctx, dt) {
  const C = ST.collapse; C.t += dt; ST.q.t += dt;
  if (C.t > 1.0 && !C.boom) { C.boom = true; fx('hr_boom', C.x - 6, C.y - 16, { top: true }); ctx.sfx('smash'); if (ctx.quake) ctx.quake(0.3); }
  if (C.t > 1.7 && !ST.mo2 && !ST.won) spawnP2(ctx, C.x, C.y);
  if (C.t > 1.8) ST.collapse = null;
}
function spawnP2(ctx, x, y) {
  const t = L(ctx), cfg = { key: 'hoden2', vi: STR.vi.ph2name, en: STR.en.ph2name, hp: bossHp(ctx, 0.66), dmg: 0, armor: 0, sp: 80, xp: 0, w: 18, h: 26, noXpTag: true, hdP2: true, c: ['#3a3640', '#8a50c0', '#ffffff'],
    aiFn: (c2, mo, dt, p, dp, canHit) => p2Ai(c2, mo, dt, p, dp, canHit), drawFn: (g, mo, X, Y) => drawP2(g, mo, X, Y), onDown: mo => p2Down(ctx, mo) };
  const mo = ctx.monsters.add(cfg, x, y); Object.assign(mo, { angry: true, warned: true, act: null, cd: { swing: 0.6, throw: 2.5, dash: 1.5, dodge: 0 }, recent: [], Q: { clip: 'idle', t: 0, dir: 'south', alpha: 1 } });
  ST.mo2 = mo; ST.p2Start = ST.t; ST.stats.p2 = 1; fx('hd_implode', x, y - 12, {}); ST.banner = { txt: t.ph2, t: 2.2 }; ctx.sfx('roar_big'); log('p2 spawn hp ' + mo.max);
}
function p2Ai(ctx, mo, dt, p, dp, canHit) {
  const Q = mo.Q; mo.kb = null; Q.t += dt; Q.flash = mo.flash || 0; for (const k in mo.cd) if (mo.cd[k] > 0) { mo.cd[k] -= dt; if (mo.cd[k] <= 0 && k !== 'dodge') ST.readyAt['p2' + k] = ST.t; }
  if (mo.justHit) { mo.justHit = false; mo.recent.push(ST.t); } mo.recent = mo.recent.filter(t => ST.t - t < 1.2);
  { const lh = ctx.monsters.lastHitT ? ctx.monsters.lastHitT() : -99; if (lh !== ST.lastHitSeen) { if (ST.lastHitSeen != null && lh > 0) ST.agP += AG.hit; ST.lastHitSeen = lh; } }
  if (!ST.hold) aggroTick(ctx, mo, dt);
  const tp = tgPos(ctx, ST.tgt) || p, d = dist(mo, tp), fast = mo.hp < mo.max * 0.5, A = mo.act;
  const setClip = c => { if (Q.clip !== c) { Q.clip = c; Q.t = 0; } };
  if (A) { A.t += dt;
    if (A.k === 'swing') { if (A.t < A.T) Q.dir = dirOf(tp.x - mo.x, tp.y - mo.y); if (!A.hit && A.t >= A.T) { A.hit = true; ctx.sfx('smash'); if (ctx.quake) ctx.quake(0.12); areaHit(ctx, mo.x, mo.y, 34, DMG.p2swing, 'p2swing', 'fly', 1.0); fx('knock_erupt', mo.x + Math.cos(A.a) * 14, mo.y + Math.sin(A.a) * 10 + 4, {}); addMini(ctx, mo, false); for (const o of liveBlocks(ctx)) { const c = oCenter(ctx, o); if (Math.hypot(c.x - mo.x, c.y - mo.y) < 36) hitBlock(ctx, o, 1, 'p2swing'); } } if (A.t >= A.T + 0.3) { mo.act = null; mo.cd.swing = fast ? 0.9 : 1.1; } return; }
    if (A.k === 'throw') { if (!A.fired && A.t >= 0.35) { A.fired = true; ST.proj = { x0: mo.x, y0: mo.y - 18, x1: A.x, y1: A.y, t: 0, T: 0.6 }; ctx.sfx('whoosh_big'); } if (A.t >= 0.75) { mo.act = null; mo.cd.throw = fast ? 3.6 : 4.5; } return; }
    if (A.k === 'dash') { if (A.t < A.T) { Q.dir = A.dir; return; } const u = Math.min(1, (A.t - A.T) / 0.22); mo.x = A.x0 + (A.x1 - A.x0) * u; mo.y = A.y0 + (A.y1 - A.y0) * u; setClip('walk');
      if (!A.hit) { const pp = ctx.S.player; if (Math.hypot(pp.x - mo.x, pp.y - mo.y) < 13) { A.hit = true; hurtPlayer(ctx, DMG.p2dash, mo, 'fly', 0.9, 'p2dash'); } const rp = rkPos(ctx); if (!A.hitR && rp && Math.hypot(rp.x - mo.x, rp.y - mo.y) < 13) { A.hitR = true; hurtRocky(ctx, DMG.p2dash, mo, 60); } }
      if (u >= 1) { mo.act = null; mo.cd.dash = fast ? 2.4 : 3.0; } return; }
    if (A.k === 'dodge') { const u = Math.min(1, A.t / A.T); mo.x = A.x0 + (A.x1 - A.x0) * u; mo.y = A.y0 + (A.y1 - A.y0) * u; setClip('walk'); if (u >= 1) { mo.act = null; mo.recent = []; } return; }
  }
  if (!canHit || ST.hold) { setClip('idle'); return; }
  const a = Math.atan2(tp.y - mo.y, tp.x - mo.x);
  if (mo.recent.length >= 3 && mo.cd.dodge <= 0) { mo.cd.dodge = 2.6; const s = Math.random() < 0.5 ? 1 : -1, q = clampIn(ctx, mo.x - Math.sin(a) * 44 * s, mo.y + Math.cos(a) * 44 * s); if (!solidAt(ctx, q.x, q.y)) { mo.act = { k: 'dodge', t: 0, T: 0.2, x0: mo.x, y0: mo.y, x1: q.x, y1: q.y }; fx('hd_implode', mo.x, mo.y - 12, {}); ctx.sfx('whoosh_big'); log('p2 dodge'); return; } }
  /* v2: ưu tiên chiêu mạnh đã hồi (quăng đèn / lướt) rồi mới tới bổ cuốc; không 1 chiêu quá 2 lần liền */
  if (d > 60 && d < 170 && mo.cd.throw <= 0 && !rep2('p2throw')) { used('p2throw'); const c = clampIn(ctx, tp.x, tp.y); mo.act = { k: 'throw', t: 0, x: c.x, y: c.y }; Q.dir = dirOf(tp.x - mo.x, tp.y - mo.y); setClip('throw'); Q.t = 0; ST.tele.push({ type: 'met', x: c.x, y: c.y, r: 26, t: 0.95, T0: 0.95, col: '#b070ff' }); if (ctx.pop) ctx.pop(mo.x, mo.y - 34, L(ctx).throwL, '#d8b0ff'); log('p2 throw'); return; }
  if (d > 40 && d < 160 && mo.cd.dash <= 0 && !rep2('p2dash')) {   /* lướt theo 8 hướng: góc làm tròn về bội 45° */
    const k = Math.round(a / (Math.PI / 4)), aa = k * Math.PI / 4; let len = Math.min(d + 18, 150); for (let s = 8; s < len; s += 4) if (solidAt(ctx, mo.x + Math.cos(aa) * s, mo.y + Math.sin(aa) * s)) { len = s - 6; break; }
    if (len > 24) { const q = clampIn(ctx, mo.x + Math.cos(aa) * len, mo.y + Math.sin(aa) * len); mo.act = { k: 'dash', t: 0, T: 0.36, dir: DIR8[((k % 8) + 8) % 8], x0: mo.x, y0: mo.y, x1: q.x, y1: q.y }; ST.tele.push({ type: 'l', x: mo.x, y: mo.y, a: aa, len, t: 0.36, T0: 0.36, col: '#c890ff' }); used('p2dash'); ctx.sfx('spar_charge'); log('p2 dash ' + mo.act.dir); return; }
  }
  if (d < 34 && mo.cd.swing <= 0 && rep2('p2swing')) { const s2 = Math.random() < 0.5 ? 1 : -1, q = clampIn(ctx, mo.x - Math.sin(a) * 40 * s2, mo.y + Math.cos(a) * 40 * s2); if (!solidAt(ctx, q.x, q.y)) { used('p2step'); mo.act = { k: 'dodge', t: 0, T: 0.22, x0: mo.x, y0: mo.y, x1: q.x, y1: q.y }; ctx.sfx('whoosh_big'); return; } }   /* đã bổ 2 lần liền: lách ngang */
  if (d < 34 && mo.cd.swing <= 0 && !rep2('p2swing')) { used('p2swing'); mo.act = { k: 'swing', t: 0, T: fast ? 0.42 : 0.5, a }; Q.dir = dirOf(tp.x - mo.x, tp.y - mo.y); setClip('swing'); Q.t = 0; ST.tele.push({ type: 'c', x: mo.x, y: mo.y, r: 34, t: mo.act.T, T0: mo.act.T, col: '#c890ff', follow: mo }); ctx.sfx('spar_charge'); log('p2 swing'); return; }
  if (d > 26) { moveMo(ctx, mo, tp.x - mo.x, tp.y - mo.y, SPD2[fast ? 1 : 0], dt); setClip('walk'); Q.dir = dirOf(tp.x - mo.x, tp.y - mo.y); }   /* đuổi tới 26 px < tầm bổ 34 px */
  else { setClip('idle'); Q.dir = dirOf(tp.x - mo.x, tp.y - mo.y); }
}
function projTick(ctx, dt) {
  const P = ST.proj; if (!P) return; P.t += dt;
  if (P.t >= P.T) { ST.proj = null; fx('hd_nova', P.x1, P.y1 - 8, { top: true }); fx('ult_firering', P.x1, P.y1, {}); ctx.sfx('smash'); if (ctx.quake) ctx.quake(0.18); areaHit(ctx, P.x1, P.y1, 26, DMG.p2throw, 'p2throw', 'fly', 1.1); }
}
/* hố nhỏ (pha 2) — v2 anh duyệt: vòng báo 0,8 s (chưa hút), tối đa 2 hố cùng lúc, hồi chiêu 3,5 s; đặt ĐÓN ĐẦU hướng người đang chạy,
   người đứng yên thì LỆCH sang bên (không rơi đúng dưới chân); vùng ngoài chỉ KÉO, chỉ bị hút vào LÕI (≤ 6 px) mới mất máu */
const MINI = { warn: 0.8, life: 1.9, max: 2, cd: 3.5, core: 6, r: 56 };
function addMini(ctx, mo, strong) {
  if (ST.minis.length >= MINI.max || (ST.miniMakeCd || 0) > ST.t) return false;
  const p = ctx.S.player, pv = ST.pvel || { x: 0, y: 0 }, sp = Math.hypot(pv.x, pv.y); let x, y;
  if (sp > 20) { x = p.x + pv.x * 0.9; y = p.y + pv.y * 0.9; }   /* đón đầu */
  else { ST.miniSide = -(ST.miniSide || 1); const a = Math.atan2(p.y - mo.y, p.x - mo.x) + ST.miniSide * Math.PI / 2; x = p.x + Math.cos(a) * 30; y = p.y + Math.sin(a) * 22; }   /* đứng yên → lệch sang bên, luân phiên */
  const q = clampIn(ctx, x, y); if (solidAt(ctx, q.x, q.y)) return false;
  ST.minis.push({ x: q.x, y: q.y, t: 0, T: MINI.warn + MINI.life, strong: !!strong }); ST.tele.push({ type: 'c', x: q.x, y: q.y, r: 22, t: MINI.warn, T0: MINI.warn, col: '#b070ff' }); ST.miniMakeCd = ST.t + MINI.cd; ST.stats.minis = (ST.stats.minis || 0) + 1; log('mini'); return true;
}
function minisTick(ctx, dt) {
  const p = ctx.S.player, h = ctx.hero, knocked = ctx.knocked && ctx.knocked();
  for (const M of ST.minis) { M.t += dt; if (M.t < MINI.warn || (h && h.fainted) || knocked) continue;
    const d = Math.hypot(p.x - M.x, p.y - M.y); if (d < MINI.r) pullEnt(ctx, p, M.x, M.y, (M.strong ? 44 : 34) * (1 - d / (MINI.r + 10)), dt);
    if (d < MINI.core && !(ST.miniCd > ST.t)) { ST.miniCd = ST.t + 1.0; hurtPlayer(ctx, DMG.mini, M, 'stagger', 0.6, 'mini'); }
    const e = rkEnt(ctx), rp = rkPos(ctx); if (e && rp && !e.kfly) { const dr = Math.hypot(rp.x - M.x, rp.y - M.y); if (dr < MINI.r) pullEnt(ctx, e, M.x, M.y, 28 * (1 - dr / (MINI.r + 10)), dt); } }
  ST.minis = ST.minis.filter(M => M.t < M.T);
}
function p2Down(ctx, mo) {
  ST.mo2 = null; ST.tele = []; ST.minis = []; ST.proj = null;
  ST.death = { t: 0, x: mo.x, y: mo.y, Q: { clip: 'fall', t: 0, dir: mo.Q.dir && /west/.test(mo.Q.dir) ? 'west' : 'south', alpha: 1 } };
  ST.banner = { txt: L(ctx).die, t: 2.6 }; ctx.sfx('roar_big'); if (ctx.quake) ctx.quake(0.25); log('p2 down');
}
function deathTick(ctx, dt) {
  const D = ST.death; D.t += dt; D.Q.t += dt;
  if (D.t > 0.9 && !D.lamp) { D.lamp = true; fx('gm_shatter', D.x + 8, D.y - 6, { top: true }) || fx('hr_boom', D.x + 8, D.y - 6, { top: true }); ctx.sfx('smash'); }
  if (D.t > 1.1 && !D.void) { D.void = true; makeFrags(mCell(D.Q), D.x, D.y, { x: D.x + 6, y: D.y - 8 }); fx('hd_implode', D.x + 6, D.y - 8, {}); ctx.sfx('whirl'); }
  if (D.t >= 1.6 && !D.won) { D.won = true; onWin(ctx, D); }
  if (D.t > 3.2) ST.death = null;
}
/* tan vào hư không: CHÍNH khung hình PixelLab đang hiện cắt thành tam giác → xoáy hút vào điểm đèn vỡ */
function makeFrags(cell, x, y, T) {
  if (!cell) return; const dw = cell.sw / 2, dh = cell.sh / 2, G = 6, out = [];
  for (let gy = 0; gy < dh; gy += G) for (let gx = 0; gx < dw; gx += G) for (let tri = 0; tri < 2; tri++) {
    const cxL = gx + (tri ? G * 0.66 : G * 0.33), cyL = gy + (tri ? G * 0.66 : G * 0.33), hx = x - dw / 2 + (cell.flip ? dw - cxL : cxL), hy = y - dh + 1 + cyL;
    out.push({ gx, gy, tri, ang: Math.atan2(hy - T.y, hx - T.x), r0: Math.hypot(hx - T.x, hy - T.y), spin: (Math.random() - 0.5) * 6, delay: Math.random() * 0.25 });
  }
  ST.frags.push({ cell, T, t: 0, dur: 1.1, pieces: out, G, dw, dh });
}
function drawFrags(g, F, cx, cy) {
  const c = F.cell, G = F.G;
  for (const P of F.pieces) {
    const u = Math.max(0, Math.min(1, (F.t - P.delay) / (F.dur - 0.25))), w = u * u, r = P.r0 * (1 - w), ang = P.ang + w * 5, a = w > 0.9 ? (1 - w) / 0.1 : 1; if (a <= 0.02) continue;
    g.save(); g.imageSmoothingEnabled = false; g.globalAlpha = Math.min(1, a); g.translate(Math.round(F.T.x + Math.cos(ang) * r - cx), Math.round(F.T.y + Math.sin(ang) * r - cy)); g.rotate(P.spin * w);
    const ox = P.tri ? G * 0.66 : G * 0.33, oy = ox; g.beginPath(); if (P.tri) { g.moveTo(G - ox, -oy); g.lineTo(G - ox, G - oy); g.lineTo(-ox, G - oy); } else { g.moveTo(-ox, -oy); g.lineTo(G - ox, -oy); g.lineTo(-ox, G - oy); } g.closePath(); g.clip();
    if (c.flip) g.scale(-1, 1); g.drawImage(c.im, c.sx, c.sy, c.sw, c.sh, -P.gx - ox, -P.gy - oy, F.dw, F.dh); g.restore();
  }
}

/* ---------------- thắng ---------------- */
function onWin(ctx, mo) {
  const h = sv(ctx), first = h.wins === 0, t = L(ctx), secs = Math.round(ST.t - ST.startT);
  h.wins++; h.best = h.best ? Math.min(h.best, secs) : secs; ST.won = true; ST.tele = [];
  if (ctx.quake) ctx.quake(0.3); ctx.sfx('boss_win'); ST.banner = { txt: t.won, t: 3.5 };
  const xp = first ? 1500 : 350; if (ctx.hero) ctx.hero.gainXp(xp); if (ctx.onMonsterDown) { try { ctx.onMonsterDown(mo, first ? 900 : 220); } catch (e) { /* bỏ qua */ } }
  ctx.give('stone', first ? 400 : 90, mo.x, mo.y); ctx.give('soul', first ? 3 : 1, mo.x + 8, mo.y);
  const r = ((ctx.S.save.sys ||= {}).road ||= {}); r.balls ||= []; const miss = [1, 2, 3, 4, 5, 6, 7].filter(n => !r.balls.includes(n));
  if (miss.length && (first || Math.random() < 0.2)) { const n = miss[(Math.random() * miss.length) | 0]; r.balls.push(n); ctx.give('dball' + n, 1, mo.x - 10, mo.y, { beam: true }); setTimeout(() => ctx.toast(ctx.lang() === 'vi' ? `🐉 NGỌC RỒNG ${n} SAO rơi ra!` : `🐉 The ${n}-STAR DRAGON BALL dropped!`, true), 1800); }
  if (first) { if (ctx.hrBook && ctx.hrBook.add) ctx.hrBook.add(1); h.book = 1; if (ctx.achieve) ctx.achieve('hoden'); setTimeout(() => ctx.toast(t.title, true), 3200); setTimeout(() => { if (ctx.hrBook && ctx.hrBook.open) ctx.hrBook.open(); }, 4200); }
  else setTimeout(() => ctx.toast(t.again, true), 2400);
  ctx.persist(); log('WIN ' + secs + 's first ' + first);
}

/* ---------------- hình vẽ ---------------- */
function drawBoss(g, mo, x, y) {
  const Q = ST.q; if (!Q) return; Q.flash = mo.flash || 0;
  g.fillStyle = 'rgba(10,4,24,.35)'; g.beginPath(); g.ellipse(Math.round(x), Math.round(y), 9, 3, 0, 0, 7); g.fill();
  drawM(g, Q, x, y);
}
function drawP2(g, mo, x, y) { g.fillStyle = 'rgba(10,4,24,.35)'; g.beginPath(); g.ellipse(Math.round(x), Math.round(y), 9, 3, 0, 0, 7); g.fill(); drawM(g, mo.Q, x, y); }
function holeImg(k) { for (let i = Math.max(0, Math.min(3, k)); i >= 0; i--) { const im = img(HOLE[i]); if (im) return im; } return null; }
let H2 = null;
if (typeof fetch !== 'undefined') fetch('assets/px/boss/hoden/hole2/hole2.json').then(r => r.json()).then(j => { H2 = j; for (const v of Object.values(j)) img(v.file); }).catch(() => {});
function holeFrame(S2) { const n = S2.n, f0 = Math.floor(ST.t * 6); if (!S2.pingpong || n < 2) return f0 % n; const m = f0 % (2 * n - 2); return m < n ? m : 2 * n - 2 - m; }   /* tới-lui cho liền mạch */
function drawHole(g, x, y, k, alpha = 1) {
  k = Math.max(0, Math.min(3, k)); const S2 = H2 && H2[HOLE_PX[k]], sh = S2 && img(S2.file);
  if (sh) {   /* clip đĩa bồi tụ quay (PixelLab animate); ảnh 2× vẽ ½ = 1:1 logic */
    const f = holeFrame(S2), w = S2.w, h = S2.h;
    g.save(); g.imageSmoothingEnabled = false; if (alpha < 1) g.globalAlpha = Math.max(0, alpha); g.drawImage(sh, f * w, 0, w, h, Math.round(x - w / 4), Math.round(y - h / 4), w / 2, h / 2); g.restore();
  } else { const im = holeImg(k); if (!im) return; blitC(g, im, x, y, alpha); }
  const R = HOLE_PX[k] / 4, db = img(IMG.debris);
  if (db && alpha > 0.5) for (let i = 0; i < 6; i++) { const ph = (ST.t * (0.22 + i * 0.03) + i / 6) % 1, a = ST.orbA * (1 + i * 0.13) + i * 1.05, r = R * (1.05 - 0.75 * ph); blitC(g, db, x + Math.cos(a) * r, y + Math.sin(a) * r * 0.42, alpha * Math.min(1, (1 - ph) * 3), a * 2); }   /* đá vụn xoắn ốc rơi vào tâm */
  if (alpha > 0.5) { g.save(); for (let i = 0; i < 10; i++) { const ph = (ST.t * (0.35 + (i % 4) * 0.06) + i * 0.137) % 1, a = -ST.t * (1.6 + (i % 3) * 0.4) + i * 0.63, r = R * 1.15 * (1 - ph); g.globalAlpha = alpha * 0.85 * (1 - ph * 0.6); g.fillStyle = i % 3 ? '#ffd8a0' : '#e0b0ff'; g.fillRect(Math.round(x + Math.cos(a) * r), Math.round(y + Math.sin(a) * r * 0.42), 1, 1); } g.restore(); }   /* hạt sáng xoáy vào tâm (thân hố, 1 px) */
}

/* ---------------- méo không gian (tuyệt chiêu) — xử lý ảnh trên chính canvas: các vành tròn đồng tâm xoay lệch nhau ---------------- */
let WARP = null;
function warpSpace(g, sx, sy, R, k) {   /* sx, sy: tâm (logic, toạ độ màn) · R bán kính · k độ xoắn 0..1 */
  if (typeof document === 'undefined' || k <= 0.01) return; const cv = g.canvas, hi = cv.width / ((ST.ctx && ST.ctx.VW) || cv.width);
  const X = Math.round((sx - R) * hi), Y = Math.round((sy - R) * hi), S = Math.round(R * 2 * hi); if (S < 8) return;
  if (!WARP) WARP = document.createElement('canvas'); if (WARP.width !== S) { WARP.width = S; WARP.height = S; }
  const w = WARP.getContext('2d'); w.clearRect(0, 0, S, S); w.drawImage(cv, X, Y, S, S, 0, 0, S, S);
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.imageSmoothingEnabled = false;
  const n = 7, c = S / 2;
  for (let i = n - 1; i >= 0; i--) {   /* vành ngoài xoay ít, vành trong xoay nhiều + co về tâm (hút) */
    const r0 = c * (i + 1) / n, f = 1 - (i + 0.5) / n, rot = k * Math.pow(f, 1.4) * (0.9 + 1.6 * k) * (1 + 0.3 * Math.sin(ST.t * 2.4)), sc = 1 - k * f * 0.3;   /* vòng trong xoắn mạnh + co về tâm */
    g.save(); g.beginPath(); g.arc(X + c, Y + c, r0, 0, Math.PI * 2); g.clip(); g.translate(X + c, Y + c); g.rotate(rot); g.scale(sc, sc); g.drawImage(WARP, -c, -c); g.restore();
  }
  g.restore();
}

/* ---------------- hệ thống ---------------- */
export const hoden = {
  id: 'hoden', always: true,   /* khe nứt ở 'm4'; trận ở 'rift4' */
  onZoneEnter(ctx) {
    if (inM4(ctx)) { const o = ctx.S.map.objects.find(q => q.rift === 'rift4'); if (o) o.type = riftOpen(ctx) ? 'rift_crack' : 'rift_crack_off'; }
    if (!inHd(ctx)) { reset(); return; }
    reset(); ST.ctx = ctx; const h = sv(ctx); h.tries++; ctx.persist();
    ctx.haFilter = (ox, oy, ang, len, w, tier) => haFilter(ctx, ox, oy, ang, len, w, tier);
    const prevHush = ctx.petHush; ctx.petHush = () => (inHd(ctx) && !!(ST.boss || ST.mo2)) || (prevHush ? prevHush() : false);
    const M = ctx.monsters, dmg0 = M.damage;
    M.damage = (mo, d, src, ...rest) => {
      if (mo && mo.c && (mo.c.hdBoss || mo.c.hdP2) && inHd(ctx)) {
        if (mo.intro > 0 || ST.ult || ST.collapse) return false;
        const fromRk = src && src === rkEnt(ctx), mul = mo.c.hdP2 ? (fromRk ? P2_RK : 1) : fromRk ? (ST.exposed > 0 ? RK_EXPOSED : RK_MUL) : (ST.exposed > 0 ? 1 : 0.25), dd = Math.max(1, Math.round(d * mul));
        if (fromRk) { ST.stats.rkRaw += d; ST.stats.rkDealt += dd; }
        rest[1] = 0; return dmg0(mo, dd, src, ...rest);
      }
      return dmg0(mo, d, src, ...rest);
    };
    const prevFaint = ctx.faintTravel; ctx.faintTravel = () => { if (inHd(ctx)) return ctx.travel('m4', 'rift'); return prevFaint ? prevFaint() : false; };
    for (const o of blocks(ctx)) { o.hp = 4; o.hpMax = 4; }
    spawnBoss(ctx);
    if (typeof window !== 'undefined') window.__hd = hooks(ctx);
  },
  onZoneLeave(ctx) { if (inHd(ctx)) { bossCamReset(ctx); ctx.haFilter = null; if (ctx.S.timeScale === 0.5) ctx.S.timeScale = 1; ST.boss = null; ST.mo2 = null; ST.ult = null; ST.grav = null; ST.collapse = null; ST.death = null; ST.meteors = []; ST.minis = []; ST.proj = null; } },
  update(dt, ctx) {
    if (typeof window !== 'undefined' && inM4(ctx)) window.__hd = hooks(ctx);
    if (!inHd(ctx)) return; ST.t += dt; ST.ctx = ctx;
    if (ctx.S.mode !== 'play') return;
    const list = ctx.monsters.list(); if (ST.boss && !list.includes(ST.boss)) ST.boss = null; if (ST.mo2 && !list.includes(ST.mo2)) ST.mo2 = null;
    if (ST.q) ST.q.t += dt;
    ST.orbA += dt * (1.6 + ST.charge * 0.25);
    if (ST.holePulse > 0) ST.holePulse -= dt;
    ST.holeK = ST.exposed > 0 ? 0 : ST.charge >= 4 ? 3 : ST.charge >= 2 ? 2 : 1;   /* bình thường 64 · nạp 3–4 → 80 · nạp 5 → 96 · lộ lõi co lại 48 */
    if (ST.exposed > 0) { ST.exposed -= dt; if (ST.exposed <= 0) { ST.exposed = 0; ST.fed = 0; if (ST.boss) { ST.boss.open = false; fx('hd_implode', ST.boss.x, ST.boss.y - holeLift(), {}); } log('cover back'); } }
    if (ST.boss && ST.ult) ultTick(ctx, ST.boss, dt);
    if (ST.grav) gravTick(ctx, dt);
    meteorTick(ctx, dt); chunksTick(ctx, dt); flyingTick(ctx, dt); projTick(ctx, dt); minisTick(ctx, dt);
    if (ST.collapse) collapseTick(ctx, dt); if (ST.death) deathTick(ctx, dt);
    for (const F of ST.frags) F.t += dt; ST.frags = ST.frags.filter(F => F.t < F.dur + 0.05);
    for (const s of ST.swallow) s.t += dt; ST.swallow = ST.swallow.filter(s => s.t < s.life);
    for (const s of ST.streaks) s.t += dt; ST.streaks = ST.streaks.filter(s => s.t < s.life);
    for (const f of ST.fx) f.t += dt; ST.fx = ST.fx.filter(f => f.t < f.dur);
    for (const t of ST.tele) { t.t -= dt; if (t.follow) { t.x = t.follow.x; t.y = t.follow.y; } } ST.tele = ST.tele.filter(t => t.t > 0);
    if (ST.banner) { ST.banner.t -= dt; if (ST.banner.t <= 0) ST.banner = null; }
    /* khối đá: luôn còn ≥ 3 (dựng lại sau 6 s) + luôn có ≥ 3 cục đá cho hố ăn */
    if (ST.boss && liveBlocks(ctx).length < 3) { ST.blockT += dt; if (ST.blockT > 6) { ST.blockT = 0; ensureBlocks(ctx, 3); } } else ST.blockT = 0;
    if (ST.boss && ST.introDone && !ST.ult && ST.chunks.length < 3) { ST.chunkT = (ST.chunkT || 0) + dt; if (ST.chunkT > 4) { ST.chunkT = 0; const I = interior(ctx); for (let i = 0; i < 8; i++) { const x = I.x0 + 16 + Math.random() * (I.x1 - I.x0 - 32), y = I.y0 + 16 + Math.random() * (I.y1 - I.y0 - 24); if (!solidAt(ctx, x, y) && dist({ x, y }, ST.boss) > 70) { spawnChunk(ctx, x, y, { z: 110, vz: 0 }); ST.tele.push({ type: 'c', x, y, r: 6, t: 0.5, T0: 0.5, col: '#a09080' }); break; } } } }   /* đá lở từ trần mỏ */
    const p = ctx.S.player; if (ST.kickCd > 0) ST.kickCd -= dt;
    if (p && dt > 0) { if (ST.pprev) { const k = Math.min(1, dt * 6); ST.pvel.x += ((p.x - ST.pprev.x) / dt - ST.pvel.x) * k; ST.pvel.y += ((p.y - ST.pprev.y) / dt - ST.pvel.y) * k; } ST.pprev = { x: p.x, y: p.y }; }
    if (ST.boss && ST.boss.intro > 0 && p) { const S = ctx.S, k = Math.min(1, dt * 4), tx = ST.boss.x, ty = ST.boss.y - 20; S.camDX = (S.camDX || 0) + (tx - p.x - (S.camDX || 0)) * k; S.camDY = (S.camDY || 0) + (ty - (p.y - 8) - (S.camDY || 0)) * k; }
    else { const bb = boss() || ST.collapse || ST.death; bossCam(ctx, bb ? { x: bb.x, y: bb.y } : null, dt, { h: ST.boss ? 26 + holeLift() + HOLE_PX[ST.holeK] / 4 : 30, top: Math.max(40, (ST.uiTopL || 60) * 0.85) }); }
    unstick(ctx);
  },
  near(ctx) {
    const p = ctx.S.player, t = L(ctx);
    if (inM4(ctx)) {
      const o = ctx.S.map.objects.find(q => q.rift === 'rift4'); if (!o) return null; const x = o.x * TS + 16, y = o.y * TS + 10;
      if (Math.hypot(p.x - x, p.y - y) > 48) return null;
      const ok = riftOpen(ctx); return { label: ok ? t.enter : t.locked(roadOk(ctx), rkLv(ctx) >= RK_NEED, rkLv(ctx)), x, y, limit: 48, priority: 5, data: { rift4: true, ok } };
    }
    if (!inHd(ctx)) return null;
    if (ST.boss && ST.boss.intro > 0 && INTRO - ST.boss.intro > 0.25) return { label: t.skip, x: p.x, y: p.y - 20, limit: 999, priority: 9, mouse: false, data: { hdSkip: true } };
    let best = null, bd = 24; for (const c of ST.chunks) { if (c.eat || c.z > 2) continue; const d = Math.hypot(c.x - p.x, c.y - p.y); if (d < bd) { bd = d; best = c; } }
    if (best && boss()) return { label: t.push, x: best.x, y: best.y - 8, limit: 30, priority: 4, cursor: 'tool', data: { hdChunk: best.id, fight: true } };
    if (ST.boss && !ST.ult) for (const o of liveBlocks(ctx)) { const d = ctx.O.hd_block, cx = Math.max(o.x * TS, Math.min((o.x + d.fw) * TS, p.x)), cy = Math.max(o.y * TS, Math.min((o.y + 1) * TS, p.y - 4)); if (Math.hypot(cx - p.x, cy - (p.y - 4)) < 14) return { label: t.smash(`${4 - (o.hp ?? 4) + 1}/4`), x: o.x * TS + 16, y: o.y * TS - 4, limit: 30, priority: 2, cursor: 'tool', data: { hdBlock: o, fight: true } }; }
    return null;
  },
  interact(ctx, cand) {
    const d = cand && cand.data; if (!d) return;
    if (d.hdSkip) { skipIntro(ctx); return; }
    if (d.hdChunk) { const c = ST.chunks.find(q => q.id === d.hdChunk); if (c && !(ST.kickCd > 0)) { ST.kickCd = 0.3; const p = ctx.S.player; if (p.faceTo) p.faceTo(c.x, c.y); if (p.hasAct && p.hasAct('attack')) p.act('attack', 0); kickChunk(ctx, c, p); } return; }
    if (d.hdBlock) { if (ST.kickCd > 0) return; ST.kickCd = 0.4; const p = ctx.S.player; if (p.faceTo) p.faceTo(d.hdBlock.x * TS + 16, d.hdBlock.y * TS + 8); if (p.hasAct && p.hasAct('mine')) p.act('mine', 0); else if (p.hasAct && p.hasAct('attack')) p.act('attack', 0); hitBlock(ctx, d.hdBlock, 1, 'player'); return; }
    if (!d.rift4) return;
    if (!rk(ctx)) { ctx.toast(L(ctx).noRocky); return; }
    if (!d.ok) { ctx.toast(L(ctx).locked(roadOk(ctx), rkLv(ctx) >= RK_NEED, rkLv(ctx)), true); ctx.sfx('fail'); return; }
    ctx.sfx('whirl'); ctx.travel('rift4', 'default');
  },
  onClick(ctx, mt) {   /* click trúng cục đá trong tầm → đẩy */
    if (!inHd(ctx) || !mt || !boss()) return false; const p = ctx.S.player;
    for (const c of ST.chunks) { if (c.eat) continue; if (Math.hypot(mt.wx - c.x, mt.wy - (c.y - 4)) < 9 && Math.hypot(c.x - p.x, c.y - p.y) < 30) { if (!(ST.kickCd > 0)) { ST.kickCd = 0.3; if (p.faceTo) p.faceTo(c.x, c.y); kickChunk(ctx, c, p); } return true; } }
    return false;
  },
  drawGround(g, ctx, cx, cy) {
    if (!inHd(ctx)) return;
    { const U = ST.ult, b = ST.boss; if (U && b && (U.ph === 'gather' || U.ph === 'horizon' || (U.ph === 'nova' && U.t < 0.25))) { const k = U.ph === 'gather' ? Math.min(1, U.real / HORIZON.gather) * 0.5 : U.ph === 'horizon' ? 0.5 + 0.5 * Math.min(1, U.real / 1.2) : 1 - U.t / 0.25; warpSpace(g, b.x - cx, b.y - holeLift() - cy, 100 + 24 * k, k); }
      else if (ST.grav && b && ST.grav.ph !== 'warn') { const G = ST.grav, k = 0.55 * Math.min(1, G.t / 0.4, (GRAV.dur - G.t) / 0.4); warpSpace(g, b.x - cx, b.y - holeLift() * 0.5 - cy, 110, Math.max(0, k)); }
      else if (ST.grav && b) { warpSpace(g, b.x - cx, b.y - holeLift() * 0.5 - cy, 90, 0.25 * Math.min(1, ST.grav.t / GRAV.warn)); } }   /* Trọng Lực: méo nền quanh hố (báo trước nhẹ → kéo mạnh) */   /* méo xoắn NỀN quanh hố (lớp nền: nhân vật / hố vẽ sau, không bị cuốn mất) */
    for (const f of ST.fx) if (f.ground) drawSheet(g, f.s, Math.min(f.s.n - 1, Math.floor(f.t * (f.s.fps || 12))), f.x - cx, f.y - cy, f.alpha);
    for (const t of ST.tele) {   /* báo trước: sáng dần tới lúc ra đòn (không nhấp nháy lặp) */
      const k = 1 - t.t / t.T0, X = Math.round(t.x - cx), Y = Math.round(t.y - cy); g.save();
      if (t.type === 'c') { g.strokeStyle = t.col; g.globalAlpha = 0.4 + 0.5 * k; g.lineWidth = 1; g.beginPath(); g.arc(X, Y, t.r, 0, 7); g.stroke(); g.globalAlpha = 0.1 + 0.25 * k; g.fillStyle = t.col; g.beginPath(); g.arc(X, Y, t.r * k, 0, 7); g.fill(); }
      else if (t.type === 'met') { g.strokeStyle = t.col || '#ff7040'; g.globalAlpha = 0.5 + 0.45 * k; g.lineWidth = 1; g.beginPath(); g.ellipse(X, Y, t.r, t.r * 0.6, 0, 0, 7); g.stroke(); g.globalAlpha = 0.12 + 0.35 * k; g.fillStyle = t.col || '#ff5030'; g.beginPath(); g.ellipse(X, Y, t.r * k, t.r * 0.6 * k, 0, 0, 7); g.fill(); }
      else if (t.type === 'l') { g.globalAlpha = 0.25 + 0.5 * k; g.strokeStyle = t.col; g.lineWidth = 1 + Math.round(2 * k); g.beginPath(); g.moveTo(X, Y); g.lineTo(Math.round(t.x + Math.cos(t.a) * t.len - cx), Math.round(t.y + Math.sin(t.a) * t.len - cy)); g.stroke(); }
      else if (t.type === 'grav') { g.strokeStyle = '#b070ff'; g.lineWidth = 1; for (let i = 0; i < 3; i++) { const r = t.r * (1 - ((k + i / 3) % 1)); g.globalAlpha = 0.25 + 0.45 * k; g.beginPath(); g.ellipse(X, Y, r, r * 0.62, 0, 0, 7); g.stroke(); } }   /* vòng co dần về tâm: báo Trọng Lực */
      g.restore();
    }
    if (ST.grav && ST.grav.ph === 'pull') { const G = ST.grav, X = Math.round(G.x - cx), Y = Math.round(G.y - cy); g.save(); g.strokeStyle = '#7a40c0'; g.lineWidth = 1; for (let i = 0; i < 4; i++) { const r = 20 + ((i * 30 - ST.t * 60) % 120 + 120) % 120; g.globalAlpha = 0.35 * (1 - r / 140); g.beginPath(); g.ellipse(X, Y, r, r * 0.62, 0, 0, 7); g.stroke(); } g.restore(); }   /* sóng hút trên nền CHỈ lúc kéo */
    for (const M of ST.minis) { if (M.t < MINI.warn) continue; const im = holeImg(0); if (im) { const a = Math.min(1, (M.t - MINI.warn) / 0.15, (M.T - M.t) / 0.3); blitC(g, im, M.x - cx, M.y - cy - 2, a * 0.95); } }   /* hố nhỏ pha 2 nằm trên nền */
    for (const c of ST.chunks) { if (c.eat || c.z <= 0) continue; g.save(); g.fillStyle = 'rgba(0,0,0,.3)'; g.beginPath(); g.ellipse(Math.round(c.x - cx), Math.round(c.y - cy + 2), 5, 2, 0, 0, 7); g.fill(); g.restore(); }   /* bóng cục đá đang rơi */
  },
  drawables(ctx, cx, cy) {
    if (!inHd(ctx)) return []; const out = [], g = ctx.g, b = ST.boss;
    for (const f of ST.fx) if (!f.ground) out.push({ y: f.top ? 1e9 : f.y + 6, f: () => drawSheet(g, f.s, Math.min(f.s.n - 1, Math.floor(f.t * (f.s.fps || 12))), f.x - cx, f.y - cy, f.alpha) });
    /* hố đen trên đầu lão (sau lão về chiều sâu → luôn ở trên đầu) */
    if (b && ST.holeShow > 0 && !(ST.q && ST.q.alpha < 0.3)) { const H = holePos(), pulse = ST.holePulse > 0 ? 1 : 0; out.push({ y: b.y + 1, f: () => drawHole(g, H.x - cx, H.y - cy - pulse, ST.holeK + pulse, ST.holeShow * (ST.q ? ST.q.alpha ?? 1 : 1)) }); }
    if (ST.collapse) { const C = ST.collapse, u = Math.min(1, C.t / 1.0), k = Math.round((1 - u) * Math.max(1, C.k0)); out.push({ y: C.y, f: () => { drawM(g, ST.q, C.x - cx, C.y - cy); if (u < 1) drawHole(g, C.x + 6 * u - cx, C.y - holeLift(k) + (holeLift(k) - 14) * u * u - cy, k, 1 - u * 0.3); } }); }   /* hố co dần, rơi vào đèn */
    for (const c of ST.chunks) { const im = img(IMG.chunk); if (!im) continue;
      if (c.eat) { const H = holePos() || { x: c.x, y: c.y }, u = Math.min(1, c.eat.t / 0.45), x = c.eat.x0 + (H.x - c.eat.x0) * u, y = c.eat.y0 - 6 + (H.y - c.eat.y0 + 6) * u * u; out.push({ y: 1e8, f: () => blitC(g, im, x - cx, y - cy, 1 - u * 0.5, u * 6) }); continue; }
      out.push({ y: c.y, f: () => blitC(g, im, c.x - cx, c.y - cy - 5 - c.z, 1) }); }
    for (const f of ST.flying) if (f.im) out.push({ y: 1e8, f: () => { g.save(); g.imageSmoothingEnabled = false; g.translate(Math.round(f.x - cx), Math.round(f.y - cy)); g.rotate(f.rot); const w = Math.max(2, Math.round(f.w * f.sc)), h = Math.max(2, Math.round(f.h * f.sc)); g.drawImage(f.im, -w / 2, -h / 2, w, h); g.restore(); } });   /* vật viền bay xoáy vào hố, thu nhỏ dần khi bị nuốt */
    const mt = img(IMG.meteor); for (const M of ST.meteors) { if (M.hit || !mt) continue; const fall = 0.5, u = Math.max(0, 1 - (M.T - M.t) / fall); if (M.t < M.T - fall) continue; const h = 150 * (1 - u); out.push({ y: 1e8, f: () => blitC(g, mt, M.x - cx, M.y - cy - 10 - h, 1) }); }
    if (ST.proj) { const P = ST.proj, u = Math.min(1, P.t / P.T), x = P.x0 + (P.x1 - P.x0) * u, y = P.y0 + (P.y1 - P.y0) * u - Math.sin(u * Math.PI) * 40, im = img(IMG.lantern); if (im) out.push({ y: 1e8, f: () => blitC(g, im, x - cx, y - cy, 1, u * 9) }); }
    /* Rocky-ha bị nuốt: luồng cong xoáy vào hố (chính sheet Rocky-ha PixelLab, nhiều khúc ngắn trên đường xoắn) */
    for (const s of ST.swallow) { const sh = bSheet(beamKey(s.tier)), H = holePos(); if (!sh || !H) continue; out.push({ y: 1e8, f: () => {
      const n = 7, fr = bFrame(sh, Math.min(s.t, 0.3)), al = Math.max(0, 1 - s.t / s.life); let px0 = s.x0, py0 = s.y0;
      for (let i = 1; i <= n; i++) { const u = i / n, d0 = Math.hypot(H.x - s.x0, H.y - s.y0), a0 = Math.atan2(s.y0 - H.y, s.x0 - H.x) + s.side * u * 2.2, r = d0 * (1 - u); const x = H.x + Math.cos(a0) * r, y = H.y + Math.sin(a0) * r; drawSeg(g, sh, fr, px0 - cx, py0 - cy, x - cx, y - cy, al); px0 = x; py0 = y; } } }); }
    for (const F of ST.frags) out.push({ y: 1e8, f: () => drawFrags(g, F, cx, cy) });
    if (ST.death && ST.death.t < 1.15) { const D = ST.death; out.push({ y: D.y, f: () => drawM(g, D.Q, D.x - cx, D.y - cy) }); }
    return out;
  },
  draw(g, ctx, cx, cy) {
    if (!inHd(ctx)) return;
    const U = ST.ult, b = ST.boss;
    if (U && b && (U.ph === 'gather' || U.ph === 'horizon' || (U.ph === 'nova' && U.t < 0.25))) {   /* méo xoắn + dịch đỏ CHỈ trong tuyệt chiêu */
      const k = U.ph === 'gather' ? Math.min(1, U.real / HORIZON.gather) * 0.5 : U.ph === 'horizon' ? 0.5 + 0.5 * Math.min(1, U.real / 1.2) : 1 - U.t / 0.25;
      g.save(); g.globalCompositeOperation = 'overlay'; g.globalAlpha = 0.55 * k; g.fillStyle = '#ff3a20'; g.fillRect(0, 0, ctx.VW, ctx.VH); g.globalCompositeOperation = 'source-over'; g.globalAlpha = 0.12 * k; g.fillRect(0, 0, ctx.VW, ctx.VH); g.restore();   /* dịch đỏ (không làm tối cảnh) */
    }
    if (ST.streaks.length) { g.save(); for (const s of ST.streaks) { const u = s.t / s.life, r = Math.max(4, s.r - s.sp * s.t), a = s.a + s.t * 2.2, x = s.cx + Math.cos(a) * r - cx, y = s.cy + Math.sin(a) * r * 0.7 - cy, x2 = s.cx + Math.cos(a - 0.22) * (r + 14) - cx, y2 = s.cy + Math.sin(a - 0.22) * (r + 14) * 0.7 - cy; g.globalAlpha = 0.75 * (1 - u); g.strokeStyle = u < 0.5 ? '#ffffff' : '#d0a0ff'; g.lineWidth = 1; g.beginPath(); g.moveTo(Math.round(x2), Math.round(y2)); g.lineTo(Math.round(x), Math.round(y)); g.stroke(); } g.restore(); }   /* sao / hạt kéo thành vệt xoáy vào tâm */
    if (U && U.ph === 'nova' && b) { const X = Math.round(b.x - cx), Y = Math.round(b.y - 8 - cy), r = U.r; g.save(); for (const [dr, col, w, a] of [[0, '#ffffff', 3, 0.95], [-5, '#ffe080', 2, 0.8], [-11, '#ff7040', 2, 0.6], [-19, '#b050ff', 1, 0.4]]) { if (r + dr <= 0) continue; g.globalAlpha = a * Math.max(0, 1 - r / HORIZON.max); g.strokeStyle = col; g.lineWidth = w; g.beginPath(); g.ellipse(X, Y, r + dr, (r + dr) * 0.7, 0, 0, 7); g.stroke(); } g.restore(); }   /* vòng siêu tân tinh loang ra */
    const mk = img(IMG.target), bb = boss();
    if (bb && mk && ST.introDone && !ST.ult && !ST.won && !ST.collapse) { const q = tgPos(ctx, ST.tgt) || ctx.S.player, isR = ST.tgt === 'r' && q !== ctx.S.player, pt = rk(ctx), hh = isR ? (pt && pt.superT > 0 ? 28 : 18) : 28, w = mk.naturalWidth / 2, h = mk.naturalHeight / 2; g.save(); g.imageSmoothingEnabled = false; g.drawImage(mk, Math.round(q.x - cx - w / 2), Math.round(q.y - cy - hh - h), w, h); g.restore(); }   /* dấu mục tiêu TĨNH */
  },
  drawUI(ug, ctx, cx, cy, scale) {
    if (!inHd(ctx) || ctx.S.mode !== 'play') return; const W = ug.canvas.width, H = ug.canvas.height, t = L(ctx), b = boss(), isP2 = !!b && b === ST.mo2;
    const font = px2 => `${Math.round(px2)}px VT323, monospace`;
    let yb = 60;
    if (b && !(ST.boss && ST.boss.intro > 0)) {
      const fr = img(IMG.bar) || img('ui/guong/bossbar.png'), narrow = W < 560, low = H < 460, bw0 = narrow ? W * 0.92 : Math.min(low ? W * 0.44 : W * 0.9, 430, Math.max(300, W * 0.4)), BB = bossBarBox(ug, bw0, bw0 * 94 / 648 + 26), bw = BB.w, bh = bw * 94 / 648, bx = BB.x, by = BB.y, tcx = BB.cx;   /* tránh nút HUD */
      const ix = bx + bw * 137 / 648, iy = by + bh * 26 / 94, iw = bw * (565 - 137) / 648, ih = bh * 34 / 94, k = Math.max(0, b.hp / b.max);
      ug.save(); ug.imageSmoothingEnabled = false; if (fr) ug.drawImage(fr, bx, by, bw, bh); else { ug.fillStyle = '#140a24'; ug.fillRect(ix, iy, iw, ih); }
      const gr = ug.createLinearGradient(0, iy, 0, iy + ih); gr.addColorStop(0, ST.exposed > 0 ? '#fff0c0' : '#d8b0ff'); gr.addColorStop(1, ST.exposed > 0 ? '#ff9040' : '#5a2a9a'); ug.fillStyle = gr; ug.fillRect(ix, iy, iw * k, ih);
      ug.fillStyle = 'rgba(255,255,255,.2)'; ug.fillRect(ix, iy, iw * k, Math.max(1, ih * 0.22));
      const fs = Math.max(14, bh * 0.32); ug.font = font(fs); ug.textAlign = 'center'; ug.textBaseline = 'top';
      const nm = isP2 ? (narrow ? `${t.ph2name} · ${t.phase(2)}` : `${t.ph2name} · ${t.ph2sub} · ${t.phase(2)}`) : (narrow ? `${t.name} · ${t.phase(1)}` : `${t.name} · ${t.sub} · ${t.phase(1)}`);
      ug.fillStyle = '#000'; ug.fillText(nm, tcx + 1, by + bh + 1, bw); ug.fillStyle = ST.exposed > 0 ? '#ffffff' : '#e8dcff'; ug.fillText(nm, tcx, by + bh, bw);
      yb = by + bh + fs + 6;
      if (!isP2 && ST.boss) {   /* thanh NO (cục đá PixelLab, sáng = đã nuốt) · thanh NẠP (hố nhỏ PixelLab) */
        const sz = Math.round(Math.max(10, Math.min(26, (bw - 20) / 15))), gap = Math.max(1, Math.round(sz * 0.2)), ch = img(IMG.chunk), ho = holeImg(0), fs3 = Math.max(11, sz * 0.7);   /* vừa bề rộng thanh máu (điện thoại dọc) */
        ug.font = font(fs3); const lw = Math.max(ug.measureText(t.meterFed).width, ug.measureText(t.meterCharge).width) + 6, tw = 5 * sz + 4 * gap, mid = Math.max(8, Math.round(sz * 0.6)), all = 2 * (lw + tw) + mid;
        const x0 = Math.round(tcx - all / 2 + lw), x1 = Math.round(tcx + mid / 2);
        ug.fillStyle = 'rgba(10,6,22,.72)'; ug.fillRect(Math.round(tcx - all / 2) - 3, yb - 3, all + 6, sz + 6);   /* nền tối cho 2 thanh dễ đọc */
        ug.font = font(fs3); ug.textAlign = 'right'; ug.fillStyle = '#000'; ug.fillText(t.meterFed, x0 - 5, yb + sz * 0.12 + 1); ug.fillStyle = '#ffd6a0'; ug.fillText(t.meterFed, x0 - 6, yb + sz * 0.12);
        for (let i = 0; i < FEED_N; i++) { const x = x0 + i * (sz + gap), on = ST.exposed > 0 || i < ST.fed; if (ch) { ug.globalAlpha = on ? 1 : 0.28; ug.drawImage(ch, x, yb, sz, sz); ug.globalAlpha = 1; } }
        ug.textAlign = 'left'; ug.fillStyle = '#000'; ug.fillText(t.meterCharge, x1 + tw + 7, yb + sz * 0.12 + 1); ug.fillStyle = '#d8b0ff'; ug.fillText(t.meterCharge, x1 + tw + 6, yb + sz * 0.12);
        for (let i = 0; i < CHARGE_MAX; i++) { const x = x1 + i * (sz + gap), on = i < ST.charge; if (ho) { ug.globalAlpha = on ? 1 : 0.25; ug.drawImage(ho, x, yb, sz, sz); ug.globalAlpha = 1; } }
        yb += sz + 4; const fs2 = Math.max(13, bh * 0.28); ug.font = font(fs2); ug.textAlign = 'center';
        const tip = ST.exposed > 0 ? t.exposedT(Math.ceil(ST.exposed)) : t.hint;
        ug.fillStyle = '#000'; ug.fillText(tip, tcx + 1, yb + 1, bw); ug.fillStyle = ST.exposed > 0 ? '#fff6c8' : '#e8dcff'; ug.fillText(tip, tcx, yb, bw); yb += fs2 + 4;
      }
      ST.uiTop = yb; ST.uiTopL = yb / Math.max(1, scale); ug.restore();
    }
    if (ST.ult && ST.ult.ph === 'horizon') {   /* đếm ngược siêu tân tinh */
      const n = Math.max(1, Math.ceil(HORIZON.real - ST.ult.real)), fs = Math.max(26, Math.min(W / 10, scale * 14)); ug.save(); ug.font = font(fs); ug.textAlign = 'center'; ug.textBaseline = 'middle'; ug.fillStyle = '#000'; ug.fillText(String(n), W / 2 + 2, H * 0.62 + 2); ug.fillStyle = '#ffd0b0'; ug.fillText(String(n), W / 2, H * 0.62); ug.restore();
    }
    if (ST.banner) {
      const a = Math.min(1, ST.banner.t * 2), fs = Math.max(20, Math.min(W / 18, scale * 8.5)); ug.save(); ug.globalAlpha = a; ug.font = font(fs); ug.textAlign = 'center'; ug.textBaseline = 'middle';
      const y = Math.max(H * 0.24, yb + fs * 0.8); const tw = Math.min(W - 10, ug.measureText(ST.banner.txt).width + 24); ug.fillStyle = 'rgba(14,8,30,.7)'; ug.fillRect((W - tw) / 2, y - fs * 0.6, tw, fs * 1.2);
      ug.fillStyle = '#000'; ug.fillText(ST.banner.txt, W / 2 + 2, y + 2, W - 16); ug.fillStyle = '#efe6ff'; ug.fillText(ST.banner.txt, W / 2, y, W - 16); ug.restore();
    }
  },
};

/* móc test (QA) */
function hooks(ctx) {
  return {
    st: () => { const b = ST.boss, m2 = ST.mo2; return { phase: ST.won ? 'won' : ST.death ? 'death' : m2 ? 'p2' : ST.collapse ? 'collapse' : b ? 'p1' : '-', inHd: inHd(ctx), open: riftOpen(ctx), road: roadOk(ctx), rkLv: rkLv(ctx),
      boss: b ? { x: Math.round(b.x), y: Math.round(b.y), hp: Math.round(b.hp), max: b.max, phase: b.phase, intro: b.intro > 0, act: b.act && b.act.k, stun: +(b.stunT || 0).toFixed(2), open: !!b.open } : null,
      p2: m2 ? { x: Math.round(m2.x), y: Math.round(m2.y), hp: Math.round(m2.hp), max: m2.max, act: m2.act && m2.act.k, dir: m2.Q.dir, clip: m2.Q.clip } : null,
      fed: ST.fed, charge: ST.charge, holeK: ST.holeK, exposed: +ST.exposed.toFixed(2), grav: ST.grav && ST.grav.ph, ult: ST.ult && { ph: ST.ult.ph, r: Math.round(ST.ult.r), hitP: ST.ult.hitP, real: +ST.ult.real.toFixed(2) }, timeScale: ctx.S.timeScale ?? 1,
      chunks: ST.chunks.map(c => ({ id: c.id, x: Math.round(c.x), y: Math.round(c.y), eat: !!c.eat })), meteors: ST.meteors.length, minis: ST.minis.length, proj: !!ST.proj, flying: ST.flying.length,
      blocks: blocks(ctx).map(o => ({ x: o.x, y: o.y, hp: o.hp ?? 4, ruined: !!o.ruined, solid: ctx.isSolid(ctx.S.map, o.x, o.y) })), edges: ctx.S.map.objects.filter(o => o.hdEdge).map(o => ({ type: o.orig || o.type, ruined: !!o.ruined })),
      tgt: ST.tgt, tgtLog: { ...ST.tgtLog }, won: ST.won, stats: JSON.parse(JSON.stringify(ST.stats)), save: { ...sv(ctx) }, log: ST.log.slice(-24), t: +ST.t.toFixed(1), tele: ST.tele.map(q => q.type), mmeta: !!MM, uiTopL: ST.uiTopL, lastFire: ST.lastFire,
      q: ST.q && { clip: ST.q.clip, dir: ST.q.dir, alpha: ST.q.alpha } }; },
    hold: v => { const b = ST.boss; if (b && b.intro > 0) b.intro = 0.001; ST.hold = !!v; if (b) b.act = null; if (ST.mo2) ST.mo2.act = null; if (v) { ST.cd = { grav: 999, meteor: 999, swing: 999, blink: 999, ult: 999 }; ST.ultAt = []; } },
    free: () => { ST.hold = false; ST.cd = { grav: 999, meteor: 999, swing: 999, blink: 999, ult: 999 }; ST.ultAt = []; },
    live: () => { ST.hold = false; ST.cd = { grav: 6, meteor: 3, swing: 0, blink: 6, ult: 0 }; ST.ultAt = [0.6, 0.3]; },
    cd: o => Object.assign(ST.cd, o), place: (x, y) => { const b = boss(); if (b) { b.x = x; b.y = y; } }, skip: () => skipIntro(ctx),
    swing: () => { const b = ST.boss; if (b) { b.act = null; startSwing(ctx, b, ctx.S.player); } }, grav: () => { const b = ST.boss; if (b) { b.act = null; startGrav(ctx, b); } },
    meteor: () => { const b = ST.boss; if (b) { b.act = null; startMeteor(ctx, b, ctx.S.player); } }, blink: () => { const b = ST.boss; if (b) { b.act = null; startBlink(ctx, b, ctx.S.player, false); } },
    ult: () => { const b = ST.boss; if (b) { b.act = null; startUlt(ctx, b); } }, feed: n => { for (let i = 0; i < (n || 1); i++) feed(ctx, 'test'); }, charge: n => { ST.charge = n; },
    filter: (ox, oy, deg, len) => haFilter(ctx, ox, oy, deg * Math.PI / 180, len || 160, 10, 5),
    chunk: (x, y) => { const c = spawnChunk(ctx, x, y); return c && c.id; }, kick: id => { const c = ST.chunks.find(q => q.id === id); if (c) kickChunk(ctx, c, ctx.S.player); return !!c; }, clearChunks: () => { ST.chunks = []; },
    hitBlock: (i, n) => hitBlock(ctx, blocks(ctx)[i], n || 1, 'test'), ensure: n => ensureBlocks(ctx, n || 3, true), shielded: (x, y) => { const b = ST.boss; return b ? shielded(ctx, b.x, b.y - 8, x, y - 4) : null; },
    setHp: f => { const b = boss(); if (b) b.hp = Math.max(1, Math.round(b.max * f)); }, kill: () => { const b = boss(); if (b) ctx.monsters.kill(b); },
    p2Do: k => { const m = ST.mo2; if (!m) return; m.act = null; ST.seq = [];   /* test ép chiêu: xoá chuỗi (luật không lặp > 2 lần) */ m.cd = { swing: 99, throw: 99, dash: 99, dodge: 99 }; m.cd[k] = 0; }, p2Hold: v => { ST.hold = !!v; },
    minisAt: () => ST.minis.map(M => ({ x: Math.round(M.x), y: Math.round(M.y), t: +M.t.toFixed(2) })),
    seq: () => ({ seq: ST.stats.seq.slice(), delay: JSON.parse(JSON.stringify(ST.stats.delay)), minis: ST.stats.minis || 0 }),
    boss: () => ST.boss, p2: () => ST.mo2, tgt: w => { ST.tgt = w; ST.tgtT = 0; },
  };
}
