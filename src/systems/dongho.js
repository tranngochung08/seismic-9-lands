// dongho.js — plan-30 TRÙM 5: ĐỒNG HỒ ĐỨT DÂY "Thần Bánh Răng Ngược Thời" (Vết Nứt Magnitude) — agent trùm 5, 2026-10-13.
//  · Khe nứt (ảnh PixelLab rift_crack dùng chung) ở M7 Núi Lửa Ngủ, phía Đông quảng trường (world.js riftCrackM2(m, 'rift5')). Mở khi: đã qua đèo tới M7
//    (save.sys.road.won.road7 / maxZ ≥ 7 / save cũ có huy hiệu M7) + Rocky ≥ cấp 48. Chưa đủ → khe mờ + nhãn điều kiện ✔/✘.
//  · Vào khe → vùng 'rift5' (world.js buildRift5): lò rèn đồng thau ngầm, sàn bánh răng khổng lồ (Wang PixelLab), 6 CỘT BÁNH RĂNG phá được (dh_pillar td8 hướng nam,
//    ảnh hư + đổ nát PixelLab riêng), ống đồng / lò rèn ở viền (cũng phá được). Lối ra Nam LUÔN mở.
//  · TRÙM = người máy đồng thau (PixelLab v3 — tools/px-dongho.py), cao ≈ 1,9× người chơi, 8 HƯỚNG (S, SE, E, NE, N sinh thật; W/SW/NW = lật). Vẽ 1:1.
//    Clip: idle / walk / slash (chém kim) / sweep (xoay kim quét) / rewind (giơ tay tua lại) / stun / break (vỡ).
//  · HỒI CHIÊU RIÊNG + ƯU TIÊN (anh Hùng 2026-10-13): mỗi chiêu một hồi chiêu; chọn chiêu ưu tiên cao nhất ĐÃ HỒI + đủ điều kiện
//    (tuyệt chiêu > Tua Lại > Kim Giây / Khung Băng > Xoay Quét > Ném Bánh Răng / Nhảy Thời Gian > Chém Kim); không ra 1 chiêu quá 2 lần liền.
//  · TUA LẠI (khắc chế cả người lẫn Rocky): mỗi 20 s, báo 1,5 s (đồng hồ trên đầu quay ngược + giơ tay) → 3 s CHẠY NGƯỢC: vị trí người chơi / Rocky / trùm /
//    bánh răng bay / mảnh vỡ phát ngược từ lịch sử từng khung; máu trùm về mức 3 s trước NẾU BÁNH RĂNG LƯNG CÒN. Nhiễu VHS chỉ trong 3 s (sọc, lệch màu RGB, ◀◀).
//    Rocky-ha trúng lúc Tua Lại → HOÀN TÁC (luồng cuộn ngược, không sát thương).
//  · BÁNH RĂNG LƯNG: máu riêng, chỉ trúng khi đánh từ PHÍA SAU lưng (nửa sau theo hướng mặt). Vỡ → Tua Lại không hồi máu ~25 s tới khi tự sửa.
//  · KHUNG BĂNG THỜI GIAN: nhốt Rocky (vắng → người chơi) trong khung hổ phách 4 s; Rocky bị nhốt không đánh; người chơi đập khung (E / click) thả sớm.
//  · KIM GIÂY CHÉM: kim dài (122 px) + kim đỏ ngắn (62 px) quét quanh trùm, 2 tốc độ ngược chiều; chỗ GIAO NHAU = vùng chết (vạch báo 1 s trước).
//    An toàn thật: ngoài tầm kim (> 126 px) hoặc đi theo khe sau kim.
//  · TUYỆT CHIÊU "MƯỜI HAI GIỜ" (60 % / 30 %): nền thành mặt số, 12 kim quanh tâm, đếm XII → I: mỗi nhịp 3 kim (cách nhau 4 giờ) quét 1 múi 30° (múi báo đỏ trước);
//    9/12 múi luôn an toàn, múi kế bên an toàn ≥ 2 nhịp liền. Hết giờ (0): chuông, 12 kim nổ thành bánh răng bay dọc 12 tia — né giữa 2 tia.
//  · PHA 2 "TIM BÁNH RĂNG" (ảnh PixelLab core): nhảy thời gian liên tục, bắn bánh răng cưa, vùng CHẬM THỜI GIAN (người chơi 0,6×, viền báo).
//    Hạ → bánh răng rơi tung, kim dừng → thắng. Thưởng lần đầu: sách Rocky bậc 8 (ctx.hrBook), Ngọc Rồng, thành tựu 'dongho'; đánh lại giảm. save.sys.dongho.
//  · Đòn mạnh hất người chơi bay (ctx.knockPlayer 'fly'); hất dừng ở vật cứng (knock.js). Mục tiêu theo THÙ HẬN (như Hắc Rocky).
import { obj as defObj } from '../gfx.js';
import { ART } from '../art.js';
import * as LV from './petlv.js';
import { bossCam, bossCamReset, bossBarBox } from './bosscam.js';
import { beamKey, sheet as bSheet, drawAt as bDraw, frameAt as bFrame } from './beamfx.js';

const TS = 16;
const STR = {
  vi: {
    name: 'Thần Bánh Răng Ngược Thời', sub: 'Đồng Hồ Đứt Dây', enter: 'Vào Khe Nứt Magnitude', ph2name: 'Tim Bánh Răng', ph2sub: 'lõi thời gian',
    locked: (a, b, lv) => `Khe nứt còn khép — cần: ${a ? '✔' : '✘'} qua đèo tới M7 · ${b ? '✔' : '✘'} Rocky cấp 48 (đang ${lv})`, noRocky: 'Khe nứt chỉ mở khi có Rocky đi cùng',
    intro: 'Tích… tắc… bánh răng tự ráp ngược lại…', rise: 'THẦN BÁNH RĂNG NGƯỢC THỜI thức giấc!', skip: 'Bỏ qua',
    rwWarn: 'Đồng hồ quay NGƯỢC — sắp TUA LẠI!', rw: '◀◀ TUA LẠI', rwHeal: n => `Tua lại: hồi ${n} máu`, rwNo: 'Bánh răng vỡ — tua lại KHÔNG hồi máu!',
    undo: 'Hoàn tác!', gearHit: (n, m) => `Bánh răng ${n}/${m}`, gearBreak: 'BÁNH RĂNG LƯNG VỠ! Tua Lại hết hồi máu', gearFix: 'Bánh răng lưng đã tự sửa…',
    hint: 'Đánh BÁNH RĂNG SAU LƯNG để chặn Tua Lại', back: 'Tua Lại sắp tới — vòng ra SAU LƯNG đánh bánh răng!',
    amber: 'KHUNG BĂNG THỜI GIAN!', amberRk: 'Rocky bị nhốt — đập khung cứu Rocky!', amberMe: 'Bạn bị nhốt — đập khung để thoát!', smashAmber: n => `Đập khung (${n})`, freed: 'Khung vỡ — tự do!',
    sec: 'KIM GIÂY CHÉM! Tránh chỗ hai kim giao nhau', slash: 'Chém Kim!', sweep: 'Xoay Kim!', saw: 'Ném Bánh Răng!', jump: 'Nhảy thời gian!',
    ult: 'TUYỆT CHIÊU — MƯỜI HAI GIỜ!', ultHint: 'Đứng ở múi KHÔNG đỏ — đổi múi khi múi mình sắp đỏ!', bell: 'BOONG! Kim nổ tung — né giữa các tia!',
    aimYou: 'Thần Bánh Răng nhắm vào BẠN!', aimRk: 'Thần Bánh Răng quay sang Rocky', smashPillar: n => `Đập cột (${n})`,
    shatter: 'Vỏ đồng hồ vỡ tung…', ph2: 'TIM BÁNH RĂNG lộ ra — nhanh như thời gian!', slow: 'Vùng CHẬM THỜI GIAN!', volley: 'Bánh răng cưa!',
    die: 'Kim dừng… bánh răng rơi tung.', phase: n => `Pha ${n}/2`, won: 'THỜI GIAN CHẢY LẠI!', again: 'Khe nứt khép lại… (đánh lại được, thưởng giảm)', title: 'Danh hiệu: Kẻ Sửa Thời Gian',
    gear: 'BÁNH RĂNG', gearOff: s => `VỠ ${s}s`, rwIn: s => `Tua lại ${s}s`,
  },
  en: {
    name: 'Rewinding Gear God', sub: 'Broken-Spring Clock', enter: 'Enter the Magnitude Rift', ph2name: 'Gear Heart', ph2sub: 'time core',
    locked: (a, b, lv) => `The rift is sealed — needs: ${a ? '✔' : '✘'} cross the pass to M7 · ${b ? '✔' : '✘'} Rocky Lv 48 (now ${lv})`, noRocky: 'The rift only opens with Rocky at your side',
    intro: 'Tick… tock… the gears assemble backwards…', rise: 'THE REWINDING GEAR GOD awakens!', skip: 'Skip',
    rwWarn: 'The clock spins BACKWARDS — REWIND incoming!', rw: '◀◀ REWIND', rwHeal: n => `Rewind: healed ${n}`, rwNo: 'Back gear broken — rewind heals NOTHING!',
    undo: 'Undone!', gearHit: (n, m) => `Gear ${n}/${m}`, gearBreak: 'BACK GEAR BROKEN! Rewind no longer heals', gearFix: 'The back gear repaired itself…',
    hint: 'Hit the GEAR on his BACK to stop the Rewind', back: 'Rewind incoming — get BEHIND him and hit the gear!',
    amber: 'AMBER TIME FRAME!', amberRk: 'Rocky is trapped — smash the frame!', amberMe: 'You are trapped — smash the frame!', smashAmber: n => `Smash frame (${n})`, freed: 'The frame breaks — free!',
    sec: 'SECOND HANDS! Avoid where the hands cross', slash: 'Hand Slash!', sweep: 'Hand Spin!', saw: 'Gear Throw!', jump: 'Time jump!',
    ult: 'ULTIMATE — TWELVE O’CLOCK!', ultHint: 'Stand in a slice that is NOT red — move when yours turns red!', bell: 'BONG! The hands burst — dodge between the rays!',
    aimYou: 'The Gear God is targeting YOU!', aimRk: 'The Gear God turns on Rocky', smashPillar: n => `Smash pillar (${n})`,
    shatter: 'The clock case shatters…', ph2: 'The GEAR HEART is exposed — fast as time!', slow: 'SLOW-TIME zone!', volley: 'Saw gears!',
    die: 'The hands stop… gears rain down.', phase: n => `Phase ${n}/2`, won: 'TIME FLOWS AGAIN!', again: 'The rift closes… (rematch any time, smaller reward)', title: 'Title: Time Mender',
    gear: 'GEAR', gearOff: s => `BROKEN ${s}s`, rwIn: s => `Rewind in ${s}s`,
  },
};
const L = ctx => STR[ctx.lang() === 'vi' ? 'vi' : 'en'];

/* vật sân (ảnh PixelLab gói rift5 — tools/px-dongho-env.py; vẽ code chỉ dự phòng). Cỡ logic = ½ ảnh. */
const px = (g, x, y, c, w = 1, h = 1) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
defObj('dh_pillar', 16, 32, 1, 1, g => { px(g, 3, 4, '#8a5a20', 10, 28); px(g, 2, 12, '#d8a040', 12, 10); px(g, 6, 15, '#5a3a10', 4, 4); });
defObj('dh_pipe', 32, 24, 2, 1, g => { px(g, 6, 2, '#b07a30', 4, 20); px(g, 12, 2, '#b07a30', 4, 20); px(g, 18, 2, '#b07a30', 4, 20); px(g, 4, 14, '#3a3036', 24, 10); });
defObj('dh_forge', 32, 24, 2, 1, g => { px(g, 4, 6, '#a06a28', 18, 18); px(g, 9, 14, '#ff7a20', 8, 6); px(g, 22, 16, '#3a3a44', 8, 6); });

/* ---------------- số liệu ---------------- */
const RK_MUL = 0.55, P2_RK = 0.75;
const DMG = { slash: 0.09, sweep: 0.1, saw: 0.07, hand: 0.05, cross: 0.15, sector: 0.16, burst: 0.11, volley: 0.07, touch: 0.05 };   /* × máu tối đa người chơi */
const REW = { warn: 1.5, dur: 3.0, keep: 3.4, cap: 0.08 };
const GEAR_HP = 8, GEAR_FIX = 25;
const AMBER = { warn: 0.9, t: 4, hp: 5 };
const SEC = { chest: 16, warn: 1.0, dur: 6.0, LA: 122, LB: 62, wA: 0.95, wB: -0.62, half: 5.5, crossW: 8 };
const ULT = { R: 128, rise: 1.4, tick: 1.0, warn: 0.75, n: 12 };
const SPD = [62, 74];
/* hồi chiêu RIÊNG từng chiêu + mức ưu tiên (cao → dùng trước khi đã hồi) */
const SK1 = { rewind: { cd: 20, pri: 90 }, sec: { cd: 15, pri: 72 }, amber: { cd: 17, pri: 68 }, sweep: { cd: 6, pri: 55 }, saw: { cd: 6.5, pri: 42 }, jump: { cd: 8, pri: 35 }, slash: { cd: 1.3, pri: 10 } };
const SK2 = { slow: { cd: 7, pri: 70 }, jump: { cd: 2.9, pri: 60 }, volley: { cd: 2.2, pri: 50 } };
const AG = { rk: 10, hit: 4.5, near: 3, decay: 2.5, back: 6, hold: 4, gap: 3, restless: [9, 13], burst: 12 };
function bossHp(ctx, k = 1) {
  const h = ctx.hero, per = h ? h.atk + h.weaponBonus(h.swordTier) : 100, pt = rk(ctx), st = pt ? LV.atkOf(LV.levelFromXp(pt.xp || 0).lv) : 40;
  return Math.round((per * 60 + st * 22) * k);
}
const sv = ctx => { const s = ctx.S.save; s.sys ||= {}; const h = (s.sys.dongho ||= {}); h.wins ||= 0; h.tries ||= 0; return h; };
const rk = ctx => (ctx.rocky && ctx.rocky.pet && ctx.rocky.pet()) || (((ctx.S.save.sys || {}).pet || {}).pet) || null;
const rkLv = ctx => { const p = rk(ctx); return p ? LV.levelFromXp(p.xp || 0).lv : 0; };
function roadOk(ctx) { const s = ctx.S.save, r = (s.sys || {}).road || {}; return !!((r.won || {}).road7 || (r.maxZ || 0) >= 7 || (s.badges || []).includes(7)); }   /* save cũ không cờ đèo mà có huy hiệu M7 → coi như đã qua */
const RK_NEED = 48;
const riftOpen = ctx => roadOk(ctx) && rkLv(ctx) >= RK_NEED;
const inDh = ctx => !!(ctx.S.zone && ctx.S.zone.id === 'rift5');
const inM7 = ctx => !!(ctx.S.zone && ctx.S.zone.id === 'm7');
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const DIR8 = ['east', 'south-east', 'south', 'south-west', 'west', 'north-west', 'north', 'north-east'];
const dirOf = (dx, dy) => DIR8[((Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) % 8) + 8) % 8];
const DIRA = d => DIR8.indexOf(d) * Math.PI / 4;
const MIRROR = { west: 'east', 'south-west': 'south-east', 'north-west': 'north-east' };
const angDiff = (a, b) => { let d = a - b; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d; };

/* ---------------- ảnh ---------------- */
const IM = {};
function img(src) { if (!IM[src]) { const i = new Image(); i.src = 'assets/px/' + src; IM[src] = i; } const i = IM[src]; return i.complete && i.naturalWidth ? i : null; }
const IMG = { core: 'boss/dongho/core_s21.png', hand: 'boss/dongho/hand_s22.png', second: 'boss/dongho/second_s23.png', long: 'boss/dongho/longhand_s32.png', saw: 'boss/dongho/saw_s24.png',
  cog: 'boss/dongho/cog_s31.png', amber: 'boss/dongho/amberblk_b.png', amber1: 'boss/dongho/amberblk_crack1.png', amber2: 'boss/dongho/amberblk_crack2.png', bit: 'boss/dongho/cogbit.png', bitL: 'boss/dongho/cogdark.png', floorL: 'zones/rift5/floor/gearfloor_s42.png', floorM: 'zones/rift5/floor/gearfloor_m_s43.png', hourglass: 'boss/dongho/hourglass_s27.png',
  watch: 'boss/dongho/watch_s28.png', face: 'boss/dongho/clockface_s29.png', bar: 'ui/dongho/bossbar.png', target: 'ui/hacrocky/target.png' };
const VX = n => ART.vfx && ART.vfx[n];
let MM = null;
if (typeof fetch !== 'undefined') fetch('assets/px/boss/dongho/m.json').then(r => r.json()).then(j => { MM = j; for (const c of Object.values(j.clips)) img(c.file); for (const f of Object.values(IMG)) img(f); }).catch(() => {});
const M_FPS = { idle: 6, walk: 10, slash: 12, sweep: 14, rewind: 8, stun: 6, break: 9 };
const M_LOOP = { idle: 1, walk: 1, stun: 1 };
function mFrame(Q) { const c = MM && MM.clips[Q.clip]; if (!c) return 0; const f = Math.floor(Math.max(0, Q.t) * M_FPS[Q.clip]); return M_LOOP[Q.clip] ? f % c.n : Math.min(c.n - 1, f); }
function mCell(Q) {   /* ô hình: 8 hướng (W/SW/NW = lật E/SE/NE); clip ít hướng → hướng gần nhất có sẵn */
  if (!MM) return null; let c = MM.clips[Q.clip] || MM.clips.idle, im = c && img(c.file); if (!im) { c = MM.clips.idle; im = c && img(c.file); if (!im) return null; }
  let dir = Q.dir || 'south', flip = false; if (MIRROR[dir]) { dir = MIRROR[dir]; flip = true; }
  if (!c.rows.includes(dir)) { const pick = { 'south-east': 'east', 'north-east': 'east', north: 'east', east: 'south' }[dir]; dir = c.rows.includes(pick) ? pick : c.rows[0]; }
  const row = Math.max(0, c.rows.indexOf(dir)); return { im, sx: (mFrame(Q) % c.n) * MM.cw, sy: row * MM.ch, sw: MM.cw, sh: MM.ch, flip };
}
function drawCell(g, C, x, y, alpha = 1, flash = 0) {
  if (!C) return false; const dw = C.sw / 2, dh = C.sh / 2, X = Math.round(x), Y = Math.round(y);
  g.save(); g.imageSmoothingEnabled = false; if (alpha < 1) g.globalAlpha = Math.max(0, alpha);
  const one = () => { if (C.flip) g.drawImage(C.im, C.sx, C.sy, C.sw, C.sh, -dw / 2, Y - dh + 1, dw, dh); else g.drawImage(C.im, C.sx, C.sy, C.sw, C.sh, X - dw / 2, Y - dh + 1, dw, dh); };
  if (C.flip) { g.translate(X, 0); g.scale(-1, 1); } one();
  if (flash > 0) { g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.45 * Math.max(0.2, alpha); one(); }   /* chớp trắng khi trúng (cộng sáng, không filter) */
  g.restore(); return true;
}
const drawM = (g, Q, x, y) => drawCell(g, mCell(Q), x, y, Q.alpha ?? 1, Q.flash || 0);
/* ảnh 2× (PixelLab) vẽ 1:1 = cỡ đích ½, tâm tại (x, y) */
function blitC(g, im, x, y, alpha = 1, rot = 0) { const w = im.naturalWidth / 2, h = im.naturalHeight / 2; g.save(); g.imageSmoothingEnabled = false; if (alpha < 1) g.globalAlpha = Math.max(0, alpha); if (rot) { g.translate(Math.round(x), Math.round(y)); g.rotate(rot); g.drawImage(im, -w / 2, -h / 2, w, h); } else g.drawImage(im, Math.round(x - w / 2), Math.round(y - h / 2), w, h); g.restore(); }
/* kim đồng hồ: ảnh nằm ngang chỉ sang phải, trục (hub) ở mép trái — xoay quanh trục tại (x, y), 1:1 */
function drawHand(g, im, x, y, a, alpha = 1, hub = 6) { if (!im) return; const w = im.naturalWidth / 2, h = im.naturalHeight / 2; g.save(); g.imageSmoothingEnabled = false; if (alpha < 1) g.globalAlpha = Math.max(0, alpha); g.translate(Math.round(x), Math.round(y)); g.rotate(a); g.drawImage(im, -hub, -h / 2, w, h); g.restore(); }
function drawSheet(g, s, f, x, y, alpha = 1) {
  const hi = s.img.__hi ? 1 : 2, ax = s.ax != null ? s.ax : s.w / 2, ay = s.ay != null ? s.ay : s.h;
  g.save(); g.imageSmoothingEnabled = false; g.globalAlpha = alpha; g.drawImage(s.img, f * s.w * hi, 0, s.w * hi, s.h * hi, Math.round(x - ax), Math.round(y - ay), s.w, s.h); g.restore();
}

/* ---------------- trạng thái ---------------- */
const ST = {};
function reset() {
  Object.assign(ST, { boss: null, mo2: null, t: 0, cd: {}, cd2: {}, picks: [], seq: [], hist: [], rw: null, gear: { hp: GEAR_HP, off: 0 }, amber: null, sec: null, ult: null, saws: [], bits: [], ghosts: [], undo: [],
    slows: [], tele: [], fx: [], banner: null, won: false, ultAt: [0.6, 0.3], log: [], startT: 0, hold: false, introDone: false, recent: [], q: null, shatter: null, death: null,
    tgt: 'r', tgtT: 0, agP: 0, restT: 10, nearT: 0, tgtLog: {}, behindT: 0, kickCd: 0, hitCd: {}, spd: null, lastHitSeen: null, nid: 1,
    stats: { rkRaw: 0, rkDealt: 0, gearHits: 0, gearBreaks: 0, rewinds: 0, healed: 0, noHeal: 0, undo: 0, ambers: 0, amberBroken: 0, secCross: 0, hits: {}, ultN: 0, sectorHit: 0, sectorSafe: 0, pillarsBroken: 0, p2: 0, skills: {} } });
  for (const k in SK1) ST.cd[k] = { rewind: 14, sec: 8, amber: 11, sweep: 3, saw: 4, jump: 5, slash: 0 }[k];
  for (const k in SK2) ST.cd2[k] = { slow: 3, jump: 1.5, volley: 1 }[k];
}
reset();
const log = s => { ST.log.push(Math.round(ST.t * 10) / 10 + ' ' + s); if (ST.log.length > 120) ST.log.shift(); };
function fx(name, x, y, opt = {}) { const s = VX(name); if (!s) return false; ST.fx.push({ s, x, y, t: 0, dur: opt.dur || s.n / (s.fps || 12), top: !!opt.top, ground: !!opt.ground, alpha: opt.alpha || 1 }); return true; }
const boss = () => ST.boss || ST.mo2;
const rkPos = ctx => (ctx.rocky && ctx.rocky.pos && ctx.rocky.pos()) || null;
const rkEnt = ctx => (ctx.rocky && ctx.rocky.ent && ctx.rocky.ent()) || null;
const rkAway = ctx => { const pt = rk(ctx); return !pt || (pt.koT || 0) > 0 || !rkPos(ctx); };
const rwOn = () => !!(ST.rw && ST.rw.ph === 'rw');

/* ---------------- sát thương ---------------- */
function hurtPlayer(ctx, frac, from, react = 'stagger', power = 1, key = '') {
  const h = ctx.hero, p = ctx.S.player; if (!h || h.fainted) return false;
  if (ST.hitCd[key] > ST.t) return false;
  const ok = h.hit(Math.max(1, Math.round(h.max * frac))); if (!ok) return false;
  ST.stats.hits[key] = (ST.stats.hits[key] || 0) + 1; log('hit ' + key);
  if (ctx.knockPlayer && react) { const d = Math.hypot(p.x - from.x, p.y - from.y) || 1; ctx.knockPlayer({ type: react, power, dir: { x: (p.x - from.x) / d, y: (p.y - from.y) / d }, src: from, bound: (x, y) => !inDh(ctx) || y < (ctx.S.map.h - 3) * TS }); }
  return true;
}
function hurtRocky(ctx, frac, from, kb = 50) {
  const pos = rkPos(ctx); if (!pos) return false; const pt = rk(ctx); if (!pt || !ctx.rocky.hitBy) return false;
  if (ST.amber && ST.amber.who === 'r') return false;   /* trong khung hổ phách: thời gian đứng yên */
  const d = Math.hypot(pos.x - from.x, pos.y - from.y) || 1, raw = Math.round(LV.maxHpOf(rkLv(ctx)) * frac * 1.1);
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
  const m = ctx.S.map, reach = m._dhReach || (m._dhReach = ctx.computeReach(m, m.entries.default)), sx = Math.floor(x / TS), sy = Math.floor(y / TS);
  if (!ctx.isSolid(m, sx, sy) && reach[sy * m.w + sx]) return null;
  const seen = new Set([sx + ',' + sy]), q = [[sx, sy]];
  while (q.length) { const [cx, cy] = q.shift(); for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = cx + a, ny = cy + b, k = nx + ',' + ny; if (seen.has(k) || nx < 0 || ny < 0 || nx >= m.w || ny >= m.h) continue; seen.add(k); if (!ctx.isSolid(m, nx, ny) && reach[ny * m.w + nx]) return { x: nx * TS + 8, y: ny * TS + 12 }; q.push([nx, ny]); } }
  return null;
}
function unstick(ctx) { const p = ctx.S.player; if (ctx.knocked && ctx.knocked()) return; if (rwOn()) return; const s = nearestFree(ctx, p.x, p.y); if (s) { p.x = s.x; p.y = s.y; log('unstick player'); } }
function moveMo(ctx, mo, dx, dy, sp, dt) {   /* đi có va chạm; kẹt > 0,6 s → đi xuyên (không đứng kẹt sau cột) */
  const d = Math.hypot(dx, dy) || 1, s = sp * dt, q = clampIn(ctx, mo.x + dx / d * s, mo.y + dy / d * s);
  if ((mo.stuckT || 0) > 0.6 || !solidAt(ctx, q.x, q.y)) { mo.x = q.x; mo.y = q.y; if (!solidAt(ctx, q.x, q.y)) mo.stuckT = 0; }
  else if (!solidAt(ctx, q.x, mo.y)) mo.x = q.x; else if (!solidAt(ctx, mo.x, q.y)) mo.y = q.y; else mo.stuckT = (mo.stuckT || 0) + dt;
}
function freeSpot(ctx, cx, cy, r, avoid, tries = 16) {
  for (let i = 0; i < tries; i++) { const a = Math.random() * Math.PI * 2, rr = r * (0.75 + Math.random() * 0.5), q = clampIn(ctx, cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * 0.8); if (!solidAt(ctx, q.x, q.y) && !solidAt(ctx, q.x, q.y - 10) && !solidAt(ctx, q.x - 8, q.y) && !solidAt(ctx, q.x + 8, q.y) && (!avoid || dist(q, avoid) > 30)) return q; }
  return null;
}

/* ---------------- cột bánh răng / vật viền (phá được) ---------------- */
const pillars = ctx => ctx.S.map.objects.filter(o => o.dhPillar || o.dhEdge);
const livePillars = ctx => pillars(ctx).filter(o => !o.ruined && !o.ghost);
function setSolid2(ctx, o, v) { const d = ctx.O[o.type] || { fw: 1, fh: 1 }; for (let j = 0; j < d.fh; j++) for (let i = 0; i < d.fw; i++) ctx.setSolid(ctx.S.map, o.x + i, o.y + j, v); }
const oCenter = (ctx, o) => { const d = ctx.O[o.orig || o.type] || { fw: 1, fh: 1 }; return { x: o.x * TS + d.fw * 8, y: (o.y + d.fh) * TS - 6 }; };
function hitPillar(ctx, o, n = 1, why = '') {
  if (!o || o.ruined || o.ghost) return false; o.hpMax = o.hpMax || 4; o.hp = (o.hp ?? o.hpMax) - n; const c = oCenter(ctx, o);
  if (o.hp > 0) { if (ctx.vfx) ctx.vfx('rock_debris', c.x, c.y - 6); ctx.sfx('knock_wall'); return false; }
  o.orig = o.type; o.ruined = true; o.hp = 0; setSolid2(ctx, o, 0); ST.stats.pillarsBroken++;
  if (ctx.vfx) { ctx.vfx('rock_debris', c.x - 5, c.y - 4); ctx.vfx('dirt_puff', c.x, c.y); } ctx.sfx('smash'); if (ctx.quake) ctx.quake(0.15);
  for (let i = 0; i < 3; i++) spawnBit(ctx, c.x, c.y - 12, 'cog');
  log('pillar broken ' + why); return true;
}
function pillarsNear(ctx, x, y, r, n, why) { for (const o of livePillars(ctx)) { const c = oCenter(ctx, o); if (Math.hypot(c.x - x, c.y - y) < r) hitPillar(ctx, o, n, why); } }

/* ---------------- mảnh bay (bánh răng nhỏ) — có trong lịch sử Tua Lại ---------------- */
function spawnBit(ctx, x, y, kind = 'cog', o = {}) {
  if (ST.bits.length > 40) ST.bits.shift(); const a = o.a ?? Math.random() * Math.PI * 2, sp = o.sp ?? 40 + Math.random() * 60;
  const b = { id: ST.nid++, kind, x, y, z: o.z ?? 8, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.7, vz: o.vz ?? 70 + Math.random() * 60, rot: 0, vr: (Math.random() - 0.5) * 12, t: 0, life: o.life ?? 2.2 }; ST.bits.push(b); return b;
}
function bitsTick(ctx, dt) {
  for (const b of ST.bits) { b.t += dt; if (b.z > 0 || b.vz > 0) { b.vz -= 300 * dt; b.z += b.vz * dt; if (b.z <= 0) { b.z = 0; b.vz = Math.abs(b.vz) > 50 ? -b.vz * 0.35 : 0; b.vx *= 0.5; b.vy *= 0.5; } b.rot += b.vr * dt; }
    const nx = b.x + b.vx * dt, ny = b.y + b.vy * dt; if (!solidAt(ctx, nx, ny)) { b.x = nx; b.y = ny; } else { b.vx *= -0.3; b.vy *= -0.3; } if (b.z <= 0) { b.vx *= Math.max(0, 1 - 4 * dt); b.vy *= Math.max(0, 1 - 4 * dt); } }
  ST.bits = ST.bits.filter(b => b.t < b.life);
}

/* ---------------- bánh răng cưa bay (đạn) ---------------- */
function spawnSaw(ctx, x, y, a, sp = 150, o = {}) { const s = { id: ST.nid++, x, y, z: o.z ?? 12, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, t: 0, life: o.life || 2.2, key: o.key || 'saw', dmg: o.dmg || DMG.saw, rot: 0 }; ST.saws.push(s); return s; }
function sawsTick(ctx, dt) {
  const p = ctx.S.player;
  for (const s of ST.saws) {
    s.t += dt; s.rot += dt * 14; const nx = s.x + s.vx * dt, ny = s.y + s.vy * dt;
    if (solidAt(ctx, nx, ny)) { s.dead = true; const o = objAt(ctx, nx, ny); if (o && (o.dhPillar || o.dhEdge)) hitPillar(ctx, o, 1, 'saw'); if (ctx.vfx) ctx.vfx('rock_debris', s.x, s.y); spawnBit(ctx, s.x, s.y, 'saw', { sp: 30, life: 1.2 }); continue; }   /* dừng ở vật cứng đầu tiên */
    s.x = nx; s.y = ny;
    if (Math.hypot(p.x - s.x, p.y - s.y) < 9 && hurtPlayer(ctx, s.dmg, { x: s.x - s.vx * 0.05, y: s.y - s.vy * 0.05 }, s.key === 'burst' ? 'fly' : 'stagger', 1, s.key)) { s.dead = true; ST.hitCd[s.key] = ST.t + 0.35; }
    const rp = rkPos(ctx); if (!s.dead && rp && Math.hypot(rp.x - s.x, rp.y - s.y) < 9 && !s.hitR) { s.hitR = hurtRocky(ctx, s.dmg, s, 40); if (s.hitR) s.dead = true; }
  }
  ST.saws = ST.saws.filter(s => !s.dead && s.t < s.life);
}
function objAt(ctx, x, y) { const tx = Math.floor(x / TS), ty = Math.floor(y / TS); for (const o of ctx.S.map.objects) { if (o.ghost || o.ruined) continue; const d = ctx.O[o.type]; if (d && tx >= o.x && tx < o.x + d.fw && ty >= o.y && ty < o.y + d.fh) return o; } return null; }

/* ---------------- TUA LẠI: lịch sử từng khung + phát ngược ---------------- */
function snap(ctx) {
  const b = ST.boss, p = ctx.S.player, e = rkEnt(ctx), h = ctx.hero;
  ST.hist.push({ t: ST.t, hp: b ? b.hp : 0, b: b && { x: b.x, y: b.y }, q: ST.q && { clip: ST.q.clip, t: ST.q.t, dir: ST.q.dir }, p: (h && h.fainted) || (ctx.knocked && ctx.knocked()) ? null : { x: p.x, y: p.y, dir: p.dir },
    r: e && !e.kfly ? { x: e.x, y: e.y } : null, saws: ST.saws.map(s => [s, s.x, s.y]), bits: ST.bits.map(q => [q, q.x, q.y, q.z, q.rot]) });
  while (ST.hist.length && ST.t - ST.hist[0].t > REW.keep) ST.hist.shift();
}
function startRewind(ctx, mo) {
  mo.act = { k: 'rewind', t: 0 }; ST.rw = { ph: 'warn', t: 0 }; qPlay('rewind'); ST.cd.rewind = SK1.rewind.cd;
  ST.banner = { txt: L(ctx).rwWarn, t: 1.4 }; ctx.sfx('whirl'); log('rewind warn');
}
function rewindTick(ctx, dt) {
  const R = ST.rw, b = ST.boss; R.t += dt;
  if (R.ph === 'warn') {
    if (!b) { ST.rw = null; return; }
    if (R.t >= REW.warn) { R.ph = 'rw'; R.t = 0; R.t0 = ST.t; R.hist = ST.hist.slice(); R.hp0 = b.hp; R.hpMin = b.hp; R.gearOk = ST.gear.off <= 0; R.saw0 = new Set(R.hist.length ? R.hist[0].saws.map(a => a[0]) : []);
      ST.stats.rewinds++; ctx.sfx('gate_open'); if (ctx.quake) ctx.quake(0.12); log('REWIND gear ' + (R.gearOk ? 'ok' : 'broken')); }
    return;
  }
  /* phát ngược: lấy ảnh chụp ở thời điểm (t0 − R.t) */
  const H = R.hist; if (!H.length) { endRewind(ctx); return; }
  const want = R.t0 - R.t * (Math.min(REW.dur, R.t0 - H[0].t) / REW.dur); let s = H[0];
  for (let i = H.length - 1; i >= 0; i--) if (H[i].t <= want) { s = H[i]; break; }
  const p = ctx.S.player, h = ctx.hero, e = rkEnt(ctx), knocked = ctx.knocked && ctx.knocked();
  if (s.p && !(h && h.fainted) && !knocked) { p.x = s.p.x; p.y = s.p.y; p.moving = false; }
  if (s.r && e && !e.kfly && !(ST.amber && ST.amber.who === 'r')) { e.x = s.r.x; e.y = s.r.y; }
  if (b && s.b) { b.x = s.b.x; b.y = s.b.y; if (s.q && ST.q) { ST.q.clip = s.q.clip; ST.q.t = s.q.t; ST.q.dir = s.q.dir; } if (R.gearOk) b.hp = Math.max(b.hp, Math.min(b.max, s.hp, R.hp0 + REW.cap * b.max)); }   /* hồi tối đa 8 % máu mỗi lần (v2) */
  const inS = new Set(); for (const [o, x, y] of s.saws) { o.x = x; o.y = y; inS.add(o); } for (const o of ST.saws) o.rwHide = !inS.has(o);
  const inB = new Set(); for (const [o, x, y, z, r] of s.bits) { o.x = x; o.y = y; o.z = z; o.rot = r; inB.add(o); } for (const o of ST.bits) o.rwHide = !inB.has(o);
  if (R.t >= REW.dur) endRewind(ctx);
}
function endRewind(ctx) {
  const R = ST.rw, b = ST.boss, t = L(ctx); ST.rw = null; ST.hist = [];
  ST.saws = ST.saws.filter(s => R.saw0 && R.saw0.has(s)); for (const s of ST.saws) s.rwHide = false; for (const q of ST.bits) q.rwHide = false;   /* đạn ném trong 3 s cuối = "chưa từng ném" */
  if (b) { b.act = null; qClip('idle'); const n = Math.round(b.hp - R.hp0); if (R.gearOk && n > 0) { ST.stats.healed += n; if (ctx.pop) ctx.pop(b.x, b.y - 44, t.rwHeal(n), '#a0ffd0'); } else if (!R.gearOk) { ST.stats.noHeal++; if (ctx.pop) ctx.pop(b.x, b.y - 44, t.rwNo, '#ffd0a0'); } }
  ctx.sfx('coin'); log('rewind end');
}

/* ---------------- BÁNH RĂNG LƯNG ---------------- */
function faceVec(Q) { const a = DIRA(Q && Q.dir || 'south'); return { x: Math.cos(a), y: Math.sin(a) }; }
function isBehind(mo, pos) { if (!pos || !ST.q) return false; const f = faceVec(ST.q), dx = pos.x - mo.x, dy = pos.y - mo.y, d = Math.hypot(dx, dy) || 1; return (f.x * dx + f.y * dy) / d < -0.3; }
function gearHit(ctx, n, who) {
  const G = ST.gear, b = ST.boss; if (!b || G.off > 0) return false; G.hp = Math.max(0, G.hp - n); ST.stats.gearHits++; log('gear hit ' + who + ' ' + G.hp);
  const t = L(ctx), f = faceVec(ST.q), gx = b.x - f.x * 8, gy = b.y - 26 - f.y * 4;
  for (let i = 0; i < 2; i++) spawnBit(ctx, gx, gy + 20, 'cog', { z: 22, sp: 50 }); ctx.sfx('knock_wall');
  if (G.hp <= 0) { G.off = GEAR_FIX; ST.stats.gearBreaks++; ST.banner = { txt: t.gearBreak, t: 2 }; ctx.sfx('smash'); if (ctx.quake) ctx.quake(0.2); fx('rock_debris', gx, gy + 10) || (ctx.vfx && ctx.vfx('rock_debris', gx, gy)); for (let i = 0; i < 6; i++) spawnBit(ctx, gx, gy + 20, 'cog', { z: 24 }); b.stunT = 1.2; b.act = null; log('GEAR BROKEN'); }
  else if (ctx.pop) ctx.pop(gx, gy - 6, t.gearHit(G.hp, GEAR_HP), '#ffe0a0');
  return true;
}

/* ---------------- tạo trùm ---------------- */
const INTRO = 2.8;
function spawnBoss(ctx) {
  const m = ctx.S.map, s = m.dhBoss || { x: 15, y: 8 }, hp = bossHp(ctx), t = L(ctx);
  const cfg = { key: 'dongho', vi: STR.vi.name, en: STR.en.name, hp, dmg: 12, armor: 0, sp: 62, xp: 0, w: 22, h: 34, c: ['#a06a28', '#e0b050', '#ffffff'], dhBoss: true, noXpTag: true,
    aiFn: (c2, mo, dt, p, dp, canHit) => bossAi(c2, mo, dt, p, dp, canHit), drawFn: (g, mo, x, y) => drawBoss(g, mo, x, y), onDown: mo => shellDown(ctx, mo), tip: { vi: STR.vi.hint, en: STR.en.hint } };
  const mo = ctx.monsters.add(cfg, s.x * TS + 8, s.y * TS + 10);
  Object.assign(mo, { phase: 1, angry: true, warned: true, intro: INTRO, act: null, stunT: 0 });
  ST.boss = mo; ST.q = { clip: 'rewind', t: 0, dir: 'south', alpha: 1 }; ST.startT = ST.t;
  ST.banner = { txt: t.intro, t: 1.6 }; ctx.sfx('whirl'); log('spawn hp ' + hp);
  for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2; ST.ghosts.push({ cog: true, a, r: 90, t: 0, life: 1.2, x: mo.x, y: mo.y - 20 }); }   /* bánh răng bay NGƯỢC vào ráp thành thân */
  return mo;
}
function skipIntro(ctx) { const mo = ST.boss; if (!mo || !(mo.intro > 0)) return; mo.intro = 0.001; log('intro skip'); }
function introTick(ctx, mo) { const it = INTRO - mo.intro; if (it > 1.2 && !ST.introRise) { ST.introRise = true; qPlay('rewind'); ST.banner = { txt: L(ctx).rise, t: 2 }; ctx.sfx('roar_big'); if (ctx.quake) ctx.quake(0.2); } if (it < 1.2) ST.q.alpha = Math.min(1, it / 1.1); else ST.q.alpha = 1; }

/* ---------------- AI pha 1 ---------------- */
function tgPos(ctx, w) { if (w === 'r') { if (rkAway(ctx) || (ST.amber && ST.amber.who === 'r')) return null; return rkPos(ctx); } return ctx.S.player; }
function aggroTick(ctx, mo, dt) {
  const p = ctx.S.player, gone = rkAway(ctx) || !!(ST.amber && ST.amber.who === 'r'); ST.tgtT += dt; ST.tgtLog[ST.tgt] = (ST.tgtLog[ST.tgt] || 0) + dt;
  if (dist(mo, p) < 40) { ST.nearT += dt; if (ST.nearT > 2) ST.agP += AG.near * dt; } else ST.nearT = 0;
  if (ST.tgt === 'r' && !gone) { ST.restT -= dt; if (ST.restT <= 0) { ST.agP = Math.max(ST.agP, AG.burst); ST.restT = 99; } }
  ST.agP = Math.max(0, ST.agP - AG.decay * dt * (ST.tgt === 'p' ? 1 : 0.6));
  let want = ST.tgt;
  if (gone) want = 'p'; else if (ST.tgt === 'r' && ST.agP > AG.rk) want = 'p'; else if (ST.tgt === 'p' && ST.agP < AG.back && ST.tgtT >= AG.hold) want = 'r';
  if (want !== ST.tgt && (ST.tgtT >= AG.gap || gone)) { ST.tgt = want; ST.tgtT = 0; if (want === 'p') ST.agP = Math.max(ST.agP, AG.burst); else ST.restT = AG.restless[0] + Math.random() * (AG.restless[1] - AG.restless[0]); if (!gone) ctx.toast(want === 'p' ? L(ctx).aimYou : L(ctx).aimRk); log('aim ' + want); }
}
function qClip(clip) { const Q = ST.q; if (Q && Q.clip !== clip) { Q.clip = clip; Q.t = 0; } }
function qPlay(clip) { const Q = ST.q; if (Q) { Q.clip = clip; Q.t = 0; } }
function seenHit(ctx, mo) { const lh = ctx.monsters.lastHitT ? ctx.monsters.lastHitT() : -99; if (lh !== ST.lastHitSeen) { if (ST.lastHitSeen != null && lh > 0 && !(mo.intro > 0)) { ST.agP += AG.hit; ST.recent.push(ST.t); if (isBehind(mo, ctx.S.player) && ST.gear.off <= 0 && !ST.ult) gearHit(ctx, 1, 'p'); } ST.lastHitSeen = lh; } }   /* kiếm người chơi trúng từ SAU LƯNG → trúng bánh răng */
/* chọn chiêu: ưu tiên cao nhất ĐÃ HỒI + đủ điều kiện; không quá 2 lần liền cùng 1 chiêu */
function pickSkill(table, cds, ok) {
  const last2 = ST.picks.slice(-2), ban = last2.length === 2 && last2[0] === last2[1] ? last2[0] : null;
  const list = Object.keys(table).filter(k => cds[k] <= 0 && k !== ban && ok(k)).sort((a, b) => table[b].pri - table[a].pri);
  return list[0] || null;
}
function used(k, mo) { ST.picks.push(k); if (ST.picks.length > 6) ST.picks.shift(); ST.seq.push(k); ST.stats.skills[k] = (ST.stats.skills[k] || 0) + 1; log('skill ' + k); }
function bossAi(ctx, mo, dt, p, dp, canHit) {
  mo.kb = null; mo.angry = true; mo.warned = true; const Q = ST.q; if (!Q) return;
  seenHit(ctx, mo);
  if (mo.intro > 0) { mo.intro -= dt; introTick(ctx, mo); if (mo.intro <= 0) { const k = mo.hp / mo.max, nh = bossHp(ctx); mo.max = nh; mo.hp = Math.max(1, Math.round(nh * k)); Q.alpha = 1; qClip('idle'); ST.introDone = true; log('fight hp ' + nh); } return; }
  if (ST.ult) { mo.hp = Math.max(mo.hp, ST.ult.hp0); return; }
  if (ST.rw) return;   /* đang báo / tua lại: rewindTick điều khiển */
  if (mo.phase === 1 && mo.hp <= mo.max * 0.5) { mo.phase = 2; ctx.sfx('roar_big'); log('angry'); }
  for (const k in ST.cd) if (ST.cd[k] > 0) ST.cd[k] -= dt * (mo.phase === 2 && k !== 'rewind' ? 1.15 : 1);
  if (mo.stunT > 0) { mo.stunT -= dt; qClip('stun'); return; }
  if (!ST.hold) aggroTick(ctx, mo, dt);
  /* người chơi núp sau lưng bao lâu (chống đứng sau đánh mãi: Xoay Kim) */
  if (isBehind(mo, p) && dist(mo, p) < 48) ST.behindT += dt; else ST.behindT = Math.max(0, ST.behindT - dt * 2);
  if (mo.act) return actTick(ctx, mo, mo.act, dt, p);
  if (!canHit || ST.hold) { qClip('idle'); return; }
  ST.recent = ST.recent.filter(t => ST.t - t < 1.6);
  const tp = tgPos(ctx, ST.tgt) || p, d = dist(mo, tp), frac = mo.hp / mo.max;
  if (ST.recent.length >= 3 && !(mo.dodgeCd > ST.t)) { mo.dodgeCd = ST.t + 3.4; if (startJump(ctx, mo, tp, true)) return; }
  if (ST.ultAt.length && frac <= ST.ultAt[0]) { ST.ultAt.shift(); used('ult'); return startUlt(ctx, mo); }
  const rp = rkPos(ctx), both = rp && !rkAway(ctx) && dist(mo, rp) < 46 && dist(mo, p) < 46;
  const k = pickSkill(SK1, ST.cd, s => s === 'rewind' ? true : s === 'sec' ? d < 140 : s === 'amber' ? true : s === 'sweep' ? (ST.behindT > 1.6 || both) && d < 50 : s === 'saw' ? d > 90 : s === 'jump' ? true : s === 'slash' ? d < 40 : false);
  if (k) {
    used(k); ST.cd[k] = SK1[k].cd;
    if (k === 'rewind') return startRewind(ctx, mo);
    if (k === 'sec') return startSec(ctx, mo, tp);
    if (k === 'amber') return startAmber(ctx, mo);
    if (k === 'sweep') return startSweep(ctx, mo);
    if (k === 'saw') return startSaw(ctx, mo, tp);
    if (k === 'jump') return startJump(ctx, mo, tp, false);
    if (k === 'slash') return startSlash(ctx, mo, tp);
  }
  if (d > 32) { moveMo(ctx, mo, tp.x - mo.x, tp.y - mo.y, SPD[mo.phase === 2 ? 1 : 0], dt); qClip('walk'); Q.dir = dirOf(tp.x - mo.x, tp.y - mo.y); }   /* đi tới ≤ 32 px < tầm chém 40 px → không vùng chết */
  else { qClip('idle'); Q.dir = dirOf(tp.x - mo.x, tp.y - mo.y); }
}
function startSlash(ctx, mo, tp) {
  const T = mo.phase === 2 ? 0.42 : 0.52, a = Math.atan2(tp.y - mo.y, tp.x - mo.x); ST.q.dir = dirOf(tp.x - mo.x, tp.y - mo.y);
  mo.act = { k: 'slash', t: 0, T, a }; ST.tele.push({ type: 'cone', x: mo.x, y: mo.y, r: 44, a, w: 1.0, t: T, T0: T, col: '#ffd070', follow: mo }); qPlay('slash'); ctx.sfx('spar_charge');
}
function startSweep(ctx, mo) { const T = 0.62; mo.act = { k: 'sweep', t: 0, T, a0: DIRA(ST.q.dir || 'south') }; ST.tele.push({ type: 'c', x: mo.x, y: mo.y, r: 58, t: T, T0: T, col: '#ffb040', follow: mo }); qPlay('sweep'); ST.q.t = -T; ctx.sfx('spar_charge'); if (ctx.pop) ctx.pop(mo.x, mo.y - 50, L(ctx).sweep, '#ffd070'); }
function startSaw(ctx, mo, tp) {
  const a = Math.atan2(tp.y - mo.y, tp.x - mo.x); ST.q.dir = dirOf(tp.x - mo.x, tp.y - mo.y); mo.act = { k: 'saw', t: 0, T: 0.5, a }; qPlay('slash');
  for (const da of [-0.24, 0, 0.24]) ST.tele.push({ type: 'l', x: mo.x, y: mo.y, a: a + da, len: 150, t: 0.5, T0: 0.5, col: '#ffcf60' });
  ctx.sfx('spar_charge'); if (ctx.pop) ctx.pop(mo.x, mo.y - 50, L(ctx).saw, '#ffd070');
}
function startJump(ctx, mo, tp, dodge) {   /* nhảy thời gian: vòng báo chỗ tới 0,35 s → biến mất 1 khung → hiện ra, dư ảnh dọc đường */
  const q = dodge ? freeSpot(ctx, mo.x, mo.y, 72, tp) : freeSpot(ctx, tp.x, tp.y, 46, null); if (!q) return false;
  const T = dodge ? 0.28 : 0.38; mo.act = { k: 'jump', t: 0, T, x1: q.x, y1: q.y }; ST.tele.push({ type: 'c', x: q.x, y: q.y, r: 14, t: T, T0: T, col: '#80fff0' });
  ctx.sfx('whoosh_big'); if (!dodge && ctx.pop) ctx.pop(mo.x, mo.y - 50, L(ctx).jump, '#a0fff0'); log(dodge ? 'dodge jump' : 'jump'); return true;
}
function actTick(ctx, mo, A, dt, p) {
  A.t += dt; const Q = ST.q;
  if (A.k === 'slash') {
    if (A.t < A.T * 0.7) { const tp = tgPos(ctx, ST.tgt) || p; A.a = Math.atan2(tp.y - mo.y, tp.x - mo.x); Q.dir = dirOf(tp.x - mo.x, tp.y - mo.y); const tl = ST.tele.find(q => q.follow === mo && q.type === 'cone'); if (tl) tl.a = A.a; }
    if (!A.hit && A.t >= A.T) { A.hit = true; ctx.sfx('smash'); fx('knock_erupt', mo.x + Math.cos(A.a) * 18, mo.y + Math.sin(A.a) * 12, {});
      const inCone = e => e && Math.hypot(e.x - mo.x, e.y - mo.y) < 46 && Math.abs(angDiff(Math.atan2(e.y - mo.y, e.x - mo.x), A.a)) < 0.62;
      if (inCone(p)) hurtPlayer(ctx, DMG.slash, mo, 'stagger', 1, 'slash'); const rp = rkPos(ctx); if (inCone(rp)) hurtRocky(ctx, DMG.slash, mo, 45);
      pillarsNear(ctx, mo.x + Math.cos(A.a) * 22, mo.y + Math.sin(A.a) * 16, 22, 1, 'slash'); }
    if (A.t >= A.T + 0.3) mo.act = null; return;
  }
  if (A.k === 'sweep') {
    if (!A.hit && A.t >= A.T) { A.hit = true; ctx.sfx('whoosh_big'); if (ctx.quake) ctx.quake(0.12); areaHit(ctx, mo.x, mo.y, 58, DMG.sweep, 'sweep', 'fly', 1.0); pillarsNear(ctx, mo.x, mo.y, 54, 1, 'sweep');   /* tầm = chiều dài kim đỏ vẽ ra (v2) */ ST.behindT = 0; }   /* đòn mạnh: hất bay */
    if (A.t >= A.T + 0.45) mo.act = null; return;
  }
  if (A.k === 'saw') {
    if (!A.fired && A.t >= A.T) { A.fired = true; for (const da of [-0.24, 0, 0.24]) spawnSaw(ctx, mo.x + Math.cos(A.a) * 10, mo.y, A.a + da, 160, { z: 14 }); ctx.sfx('whoosh_big'); }
    if (A.t >= A.T + 0.3) mo.act = null; return;
  }
  if (A.k === 'jump') {
    Q.alpha = A.t < A.T ? 1 - 0.4 * (A.t / A.T) : 1;
    if (A.t >= A.T && !A.done) { A.done = true; const x0 = mo.x, y0 = mo.y, C = mCell(Q); for (let i = 1; i <= 3; i++) ST.ghosts.push({ cell: C, x: x0 + (A.x1 - x0) * i / 4, y: y0 + (A.y1 - y0) * i / 4, t: 0, life: 0.5, a0: 0.5 - i * 0.1 }); ST.ghosts.push({ cell: C, x: x0, y: y0, t: 0, life: 0.45, a0: 0.55 });
      mo.x = A.x1; mo.y = A.y1; Q.alpha = 0; A.blink = 0.05; ST.recent = []; ctx.sfx('whoosh_big'); }
    if (A.done) { A.blink -= dt; if (A.blink <= 0) Q.alpha = 1; }
    if (A.t >= A.T + 0.15) { Q.alpha = 1; mo.act = null; } return;
  }
  if (A.k === 'rewind') { qClip('rewind'); return; }
  if (A.k === 'sec') { if (!ST.sec) mo.act = null; return; }
  if (A.k === 'amber') { if (A.t >= 0.6) mo.act = null; return; }
}

/* ---------------- KIM GIÂY CHÉM ---------------- */
function startSec(ctx, mo, tp) {
  const a0 = Math.atan2(tp.y - mo.y, tp.x - mo.x) + Math.PI / 2, dw = SEC.wA - SEC.wB, firstCross = 2.2;
  const b0 = a0 + dw * firstCross;   /* hai kim gặp nhau lần đầu sau 2,2 s quét */
  ST.sec = { t: 0, x: mo.x, y: mo.y - SEC.chest, by: mo.y, a0, b0, crossed: new Set() };   /* tâm kim = ngực trùm (v2) */ mo.act = { k: 'sec', t: 0 }; qPlay('sweep');
  ST.banner = { txt: L(ctx).sec, t: 1.6 }; ctx.sfx('spar_charge'); log('sec start');
}
const secAng = (S, tt) => ({ a: S.a0 + SEC.wA * tt, b: S.b0 + SEC.wB * tt });
/* thời điểm giao nhau (trong khoảng quét) — kim A, B trùng góc */
function secCrosses(S) { const out = [], dw = SEC.wA - SEC.wB; for (let k = -3; k <= 6; k++) { const tt = (2 * Math.PI * k - (S.a0 - S.b0)) / dw; if (tt > 0.05 && tt < SEC.dur) out.push({ tt, a: S.a0 + SEC.wA * tt }); } return out; }
/* điểm (x, y) có bị kim / vùng giao nhau trúng ở thời điểm quét tt? (dùng cho cả game lẫn test số) */
function secHitAt(S, tt, x, y) {
  const dx = x - S.x, dy = y - S.y, r = Math.hypot(dx, dy), ph = Math.atan2(dy, dx), A = secAng(S, tt), out = [];
  const on = (ang, Lh, w) => r > 8 && r < Lh && Math.cos(ph - ang) > 0 && Math.abs(Math.sin(ph - ang)) * r < w;
  if (on(A.a, SEC.LA, SEC.half)) out.push('hand'); if (on(A.b, SEC.LB, SEC.half)) out.push('hand');
  for (const c of secCrosses(S)) if (Math.abs(tt - c.tt) < 0.12 && on(c.a, SEC.LB + 10, SEC.crossW)) out.push('cross');
  return out;
}
function secTick(ctx, dt) {
  const S = ST.sec, b = ST.boss; if (!S || !b) { ST.sec = null; return; } S.t += dt; b.x = S.x; b.y = S.by; if (S.t > 0.5) qClip('idle');
  const tt = S.t - SEC.warn; if (tt < 0) return;
  for (const c of secCrosses(S)) if (!S.crossed.has(c.tt) && tt >= c.tt) { S.crossed.add(c.tt); ST.stats.secCross++; ctx.sfx('smash'); if (ctx.quake) ctx.quake(0.15); const ex = S.x + Math.cos(c.a) * 36, ey = S.y + Math.sin(c.a) * 36; fx('knock_erupt', ex, ey + 4, {}); pillarsNear(ctx, ex, ey, 30, 2, 'cross'); }
  const p = ctx.S.player, hp = secHitAt(S, tt, p.x, p.y - 8);
  if (hp.includes('cross')) hurtPlayer(ctx, DMG.cross, { x: S.x, y: S.y }, 'fly', 1.2, 'cross'); else if (hp.includes('hand') && hurtPlayer(ctx, DMG.hand, { x: S.x, y: S.y }, 'stagger', 0.8, 'hand')) ST.hitCd.hand = ST.t + 0.8;
  const rp = rkPos(ctx); if (rp && !(ST.rkSecCd > ST.t)) { const hr = secHitAt(S, tt, rp.x, rp.y - 8); if (hr.length && hurtRocky(ctx, hr.includes('cross') ? DMG.cross : DMG.hand, { x: S.x, y: S.y }, hr.includes('cross') ? 60 : 35)) ST.rkSecCd = ST.t + 0.8; }
  if (tt >= SEC.dur) { ST.sec = null; if (b.act && b.act.k === 'sec') b.act = null; log('sec end'); }
}

/* ---------------- KHUNG BĂNG THỜI GIAN ---------------- */
function startAmber(ctx, mo) {
  const who = rkAway(ctx) ? 'p' : 'r', e = who === 'r' ? rkEnt(ctx) : null, p = ctx.S.player, x = who === 'r' ? e.x : p.x, y = who === 'r' ? e.y : p.y;
  mo.act = { k: 'amber', t: 0 }; qPlay('rewind'); ST.amberQ = { who, t: 0, x, y };
  ST.tele.push({ type: 'amber', x, y, r: 14, t: AMBER.warn, T0: AMBER.warn, col: '#ffb030', follow: who === 'r' ? e : null });   /* Rocky: vòng bám theo; người chơi: vòng tại chỗ → né được */
  if (ctx.pop) ctx.pop(mo.x, mo.y - 50, L(ctx).amber, '#ffc860'); ctx.sfx('spar_charge'); log('amber warn ' + who);
}
function amberTick(ctx, dt) {
  const Q = ST.amberQ; if (Q) { Q.t += dt; if (Q.t >= AMBER.warn) { ST.amberQ = null; const p = ctx.S.player, e = rkEnt(ctx), t = L(ctx);
    if (Q.who === 'r' && e && !rkAway(ctx)) { ST.amber = { who: 'r', x: e.x, y: e.y, hp: AMBER.hp, t: AMBER.t }; ctx.toast(t.amberRk); }
    else if (Q.who === 'p' && Math.hypot(p.x - Q.x, p.y - Q.y) < 16 && !(ctx.hero && ctx.hero.fainted)) { ST.amber = { who: 'p', x: p.x, y: p.y, hp: AMBER.hp, t: AMBER.t }; ctx.toast(t.amberMe); }
    if (ST.amber) { ST.stats.ambers++; ctx.sfx('gate_open'); log('amber on ' + ST.amber.who); } else log('amber dodged'); } }
  const A = ST.amber; if (!A) return; A.t -= dt;
  if (A.who === 'r') { const e = rkEnt(ctx); if (!e || rkAway(ctx)) { endAmber(ctx, false); return; } if (!e.kfly) { e.x = A.x; e.y = A.y; e.moving = false; } }
  else { const p = ctx.S.player; if (!(ctx.knocked && ctx.knocked())) { p.x = A.x; p.y = A.y; p.moving = false; } if (ctx.hero && ctx.hero.fainted) { endAmber(ctx, false); return; } }
  if (A.t <= 0) endAmber(ctx, false);
}
function hitAmber(ctx, n = 1) {
  const A = ST.amber; if (!A) return false; A.hp -= n; ctx.sfx('knock_wall'); if (ctx.vfx) ctx.vfx('rock_debris', A.x, A.y - 12); log('amber hit ' + A.hp);
  if (A.hp <= 0) { ST.stats.amberBroken++; endAmber(ctx, true); } return true;
}
function endAmber(ctx, broken) { const A = ST.amber; if (!A) return; ST.amber = null; fx('gm_shatter', A.x, A.y - 10, { top: true }); ctx.sfx(broken ? 'smash' : 'rock_break'); if (broken) ctx.toast(L(ctx).freed); log(broken ? 'amber broken' : 'amber end'); }

/* ---------------- TUYỆT CHIÊU: Mười Hai Giờ ---------------- */
const hourA = h => -Math.PI / 2 + ((h % 12) + 12) % 12 * Math.PI / 6;   /* giờ h (0 = XII) → góc; múi h = từ giờ h tới h+1 */
const ultDeadly = k => { const c = ((12 - k) % 12 + 12) % 12; return [c, (c + 4) % 12, (c + 8) % 12]; };   /* nhịp k (0 = XII): 3 múi bị quét */
function sectorOf(cx, cy, x, y) { const a = Math.atan2(y - cy, x - cx); let u = (a + Math.PI / 2) / (Math.PI / 6); u = ((u % 12) + 12) % 12; return Math.floor(u); }
function startUlt(ctx, mo) {
  const m = ctx.S.map, C = m.dhCenter || { x: mo.x, y: mo.y };
  ST.ult = { ph: 'rise', t: 0, hp0: mo.hp, x: C.x, y: C.y, k: -1, struck: [], burst: false };
  mo.act = null; ST.sec = null; ST.tele = []; ST.amberQ = null;
  const C0 = mCell(ST.q); ST.ghosts.push({ cell: C0, x: mo.x, y: mo.y, t: 0, life: 0.5, a0: 0.6 }); mo.x = C.x; mo.y = C.y + 6; qPlay('rewind'); ST.q.dir = 'south';
  ST.banner = { txt: L(ctx).ult, t: 2.4 }; setTimeout(() => { if (ST.ult) ctx.toast(L(ctx).ultHint, true); }, 400);
  ctx.sfx('roar_big'); if (ctx.quake) ctx.quake(0.3); ST.stats.ultN++; log('ULT start');
}
function ultTick(ctx, mo, dt) {
  const U = ST.ult; U.t += dt; mo.x = U.x; mo.y = U.y + 6; if (ST.q.clip !== 'rewind') qPlay('rewind');
  if (U.ph === 'rise') { if (U.t >= ULT.rise) { U.ph = 'count'; U.t = 0; } return; }
  if (U.ph === 'count') {
    const k = Math.floor(U.t / ULT.tick); if (k !== U.k && k < ULT.n) { U.k = k; U.dead = ultDeadly(k); U.hit = false; ctx.sfx('knock_wall'); log('ult tick ' + (12 - k) + ' deadly ' + U.dead.join(',')); }
    const u = U.t - U.k * ULT.tick;
    if (!U.hit && u >= ULT.warn) { U.hit = true; ctx.sfx('whoosh_big'); U.struck.push({ k: U.k, t: 0 });
      const p = ctx.S.player, inS = (x, y) => { const r = Math.hypot(x - U.x, y - U.y); return r > 14 && r < ULT.R + 4 && U.dead.includes(sectorOf(U.x, U.y, x, y)); };
      if (inS(p.x, p.y - 4)) { ST.stats.sectorHit++; hurtPlayer(ctx, DMG.sector, { x: U.x, y: U.y }, 'fly', 1.1, 'sector'); } else ST.stats.sectorSafe++;
      const rp = rkPos(ctx); if (rp && inS(rp.x, rp.y - 4)) hurtRocky(ctx, DMG.sector, { x: U.x, y: U.y }, 60);
      for (const h of U.dead) { const a = hourA(h) + Math.PI / 12; pillarsNear(ctx, U.x + Math.cos(a) * 80, U.y + Math.sin(a) * 80, 34, 1, 'sector'); } }
    if (U.t >= ULT.n * ULT.tick) { U.ph = 'bell'; U.t = 0; ST.banner = { txt: L(ctx).bell, t: 1.6 }; ctx.sfx('boss_win'); if (ctx.quake) ctx.quake(0.4); log('ULT bell');
      for (let h = 0; h < 12; h++) { const a = hourA(h); spawnSaw(ctx, U.x + Math.cos(a) * 16, U.y + Math.sin(a) * 16, a, 170, { key: 'burst', dmg: DMG.burst, life: 1.6, z: 8 }); } }
    return;
  }
  if (U.ph === 'bell' && U.t >= 1.4) { ST.ult = null; mo.act = null; ST.cd.sec = Math.max(ST.cd.sec, 4); ST.cd.amber = Math.max(ST.cd.amber, 3); log('ULT end'); }
}

/* ---------------- PHA 2: Tim Bánh Răng ---------------- */
function shellDown(ctx, mo) {
  ST.boss = null; ST.sec = null; ST.ult = null; ST.rw = null; ST.hist = []; ST.tele = []; ST.amberQ = null; if (ST.amber) endAmber(ctx, false);
  ST.shatter = { t: 0, x: mo.x, y: mo.y, Q: { clip: 'break', t: 0, dir: ST.q && /west/.test(ST.q.dir) ? 'west' : ST.q && /east/.test(ST.q.dir) ? 'east' : 'south', alpha: 1 } };
  ST.banner = { txt: L(ctx).shatter, t: 2.2 }; ctx.sfx('smash'); if (ctx.quake) ctx.quake(0.3); log('shell down');
}
function shatterTick(ctx, dt) {
  const S = ST.shatter; S.t += dt; S.Q.t += dt;
  if (S.t > 0.9 && !S.boom) { S.boom = true; fx('gm_shatter', S.x, S.y - 20, { top: true }) || fx('hr_boom', S.x, S.y - 20, { top: true }); ctx.sfx('smash'); for (let i = 0; i < 12; i++) spawnBit(ctx, S.x, S.y - 10, 'cog', { z: 20, sp: 60 + Math.random() * 80 }); }
  if (S.t > 1.7 && !ST.mo2 && !ST.won) spawnP2(ctx, S.x, S.y);
  if (S.t > 2.3) ST.shatter = null;
}
function spawnP2(ctx, x, y) {
  const t = L(ctx), cfg = { key: 'dongho2', vi: STR.vi.ph2name, en: STR.en.ph2name, hp: bossHp(ctx, 0.5), dmg: 0, armor: 0, sp: 70, xp: 0, w: 22, h: 30, noXpTag: true, dhP2: true, c: ['#a06a28', '#40e0c0', '#ffffff'],
    aiFn: (c2, mo, dt, p, dp, canHit) => p2Ai(c2, mo, dt, p, dp, canHit), drawFn: (g, mo, X, Y) => drawP2(g, mo, X, Y), onDown: mo => p2Down(ctx, mo) };
  const mo = ctx.monsters.add(cfg, x, y); Object.assign(mo, { angry: true, warned: true, act: null, recent: [], spin: 0, bob: 0, alpha: 1 });
  ST.mo2 = mo; ST.picks = []; ST.stats.p2 = 1; fx('hd_implode', x, y - 20, {}); ST.banner = { txt: t.ph2, t: 2.2 }; ctx.sfx('roar_big'); log('p2 spawn hp ' + mo.max);
}
function p2Ai(ctx, mo, dt, p, dp, canHit) {
  mo.kb = null; mo.spin += dt * 2.2; mo.bob += dt; for (const k in ST.cd2) if (ST.cd2[k] > 0) ST.cd2[k] -= dt * (mo.hp < mo.max * 0.5 ? 1.2 : 1);
  { const lh = ctx.monsters.lastHitT ? ctx.monsters.lastHitT() : -99; if (lh !== ST.lastHitSeen) { if (ST.lastHitSeen != null && lh > 0) { ST.agP += AG.hit; mo.recent.push(ST.t); } ST.lastHitSeen = lh; } }
  mo.recent = mo.recent.filter(t => ST.t - t < 1.4);
  if (!ST.hold) aggroTick(ctx, mo, dt);
  const tp = tgPos(ctx, ST.tgt) || p, d = dist(mo, tp), A = mo.act;
  if (Math.hypot(p.x - mo.x, p.y - mo.y) < 12) hurtPlayer(ctx, DMG.touch, mo, 'stagger', 0.7, 'touch') && (ST.hitCd.touch = ST.t + 1);
  if (A) { A.t += dt;
    if (A.k === 'jump') { mo.alpha = A.t < A.T ? 1 - 0.5 * A.t / A.T : 1; if (A.t >= A.T && !A.done) { A.done = true; ST.ghosts.push({ core: true, x: mo.x, y: mo.y, t: 0, life: 0.5, a0: 0.55 }); ST.ghosts.push({ core: true, x: (mo.x + A.x1) / 2, y: (mo.y + A.y1) / 2, t: 0, life: 0.4, a0: 0.35 }); mo.x = A.x1; mo.y = A.y1; mo.alpha = 0; A.bl = 0.05; ctx.sfx('whoosh_big'); mo.recent = []; }
      if (A.done) { A.bl -= dt; if (A.bl <= 0) mo.alpha = 1; } if (A.t >= A.T + 0.12) { mo.alpha = 1; mo.act = null; } return; }
    if (A.k === 'volley') { if (!A.fired && A.t >= A.T) { A.fired = true; for (const da of A.spread) spawnSaw(ctx, mo.x, mo.y, A.a + da, 140, { key: 'volley', dmg: DMG.volley, z: 22 }); ctx.sfx('whoosh_big'); } if (A.t >= A.T + 0.2) mo.act = null; return; }
    if (A.k === 'slow') { if (!A.made && A.t >= A.T) { A.made = true; ST.slows.push({ x: A.x, y: A.y, r: 44, t: 0, life: 5 }); ctx.sfx('gate_open'); } if (A.t >= A.T + 0.1) mo.act = null; return; }
  }
  if (!canHit || ST.hold) return;
  if (mo.recent.length >= 3) { const q = freeSpot(ctx, mo.x, mo.y, 80, tp); if (q) { mo.act = { k: 'jump', t: 0, T: 0.22, x1: q.x, y1: q.y }; ST.tele.push({ type: 'c', x: q.x, y: q.y, r: 14, t: 0.22, T0: 0.22, col: '#80fff0' }); used('p2dodge'); return; } }
  const k = pickSkill(SK2, ST.cd2, s => s === 'slow' ? ST.slows.length < 2 : s === 'jump' ? true : s === 'volley' ? d < 240 : false);
  if (k) { used('p2' + k); ST.cd2[k] = SK2[k].cd;
    if (k === 'jump') { const q = freeSpot(ctx, tp.x, tp.y, 80 + Math.random() * 30, tp); if (q) { mo.act = { k: 'jump', t: 0, T: 0.35, x1: q.x, y1: q.y }; ST.tele.push({ type: 'c', x: q.x, y: q.y, r: 14, t: 0.35, T0: 0.35, col: '#80fff0' }); return; } }
    if (k === 'volley') { const a = Math.atan2(tp.y - mo.y, tp.x - mo.x), spread = mo.hp < mo.max * 0.5 ? [-0.32, -0.11, 0.11, 0.32] : [-0.28, 0, 0.28]; mo.act = { k: 'volley', t: 0, T: 0.42, a, spread }; for (const da of spread) ST.tele.push({ type: 'l', x: mo.x, y: mo.y, a: a + da, len: 120, t: 0.42, T0: 0.42, col: '#80fff0' }); if (ctx.pop) ctx.pop(mo.x, mo.y - 44, L(ctx).volley, '#a0fff0'); return; }
    if (k === 'slow') { const c = clampIn(ctx, tp.x, tp.y); mo.act = { k: 'slow', t: 0, T: 0.8, x: c.x, y: c.y }; ST.tele.push({ type: 'slow', x: c.x, y: c.y, r: 44, t: 0.8, T0: 0.8, col: '#60e0ff' }); if (ctx.pop) ctx.pop(mo.x, mo.y - 44, L(ctx).slow, '#a0e8ff'); return; }
  }
  /* lơ lửng giữ tầm 60–100 px (đạn trúng ở mọi tầm; sát người thì chạm lõi gây sát thương — không vùng chết) */
  if (d > 100) moveMo(ctx, mo, tp.x - mo.x, tp.y - mo.y, 70, dt); else if (d < 50) moveMo(ctx, mo, mo.x - tp.x, mo.y - tp.y, 50, dt);
}
function slowTick(ctx, dt) { for (const z of ST.slows) z.t += dt; ST.slows = ST.slows.filter(z => z.t < z.life); }
const inSlow = (x, y) => ST.slows.some(z => z.t > 0 && Math.hypot(x - z.x, (y - z.y) / 0.8) < z.r);
/* tốc độ người chơi: khung hổ phách / tua lại → đứng yên · vùng chậm → 0,6× · trả lại khi hết (knock.js tự lo lúc bị hất) */
function speedTick(ctx) {
  const p = ctx.S.player; if (ctx.knocked && ctx.knocked()) return;
  const want = (ST.amber && ST.amber.who === 'p') || rwOn() ? 0 : inSlow(p.x, p.y) ? 0.6 : null;
  if (want != null) { if (p.speedMul !== want) p.speedMul = want; ST.spd = want; } else if (ST.spd != null) { p.speedMul = 1; ST.spd = null; }
}
function p2Down(ctx, mo) {
  ST.mo2 = null; ST.tele = []; ST.slows = []; speedTick(ctx);
  ST.death = { t: 0, x: mo.x, y: mo.y, spin: mo.spin };
  for (let i = 0; i < 16; i++) spawnBit(ctx, mo.x, mo.y - 16, i % 3 ? 'cog' : 'saw', { z: 22, sp: 50 + Math.random() * 90, life: 3 });
  ST.banner = { txt: L(ctx).die, t: 2.6 }; ctx.sfx('smash'); if (ctx.quake) ctx.quake(0.25); log('p2 down');
}
function deathTick(ctx, dt) { const D = ST.death; D.t += dt; if (D.t >= 1.4 && !D.won) { D.won = true; onWin(ctx, D); } if (D.t > 3) ST.death = null; }

/* ---------------- thắng ---------------- */
function onWin(ctx, mo) {
  const h = sv(ctx), first = h.wins === 0, t = L(ctx), secs = Math.round(ST.t - ST.startT);
  h.wins++; h.best = h.best ? Math.min(h.best, secs) : secs; ST.won = true; ST.tele = [];
  if (ctx.quake) ctx.quake(0.3); ctx.sfx('boss_win'); ST.banner = { txt: t.won, t: 3.5 };
  const xp = first ? 1700 : 380; if (ctx.hero) ctx.hero.gainXp(xp); if (ctx.onMonsterDown) { try { ctx.onMonsterDown(mo, first ? 1000 : 240); } catch (e) { /* bỏ qua */ } }
  ctx.give('stone', first ? 450 : 100, mo.x, mo.y); ctx.give('soul', first ? 3 : 1, mo.x + 8, mo.y);
  const r = ((ctx.S.save.sys ||= {}).road ||= {}); r.balls ||= []; const miss = [1, 2, 3, 4, 5, 6, 7].filter(n => !r.balls.includes(n));
  if (miss.length && (first || Math.random() < 0.2)) { const n = miss[(Math.random() * miss.length) | 0]; r.balls.push(n); ctx.give('dball' + n, 1, mo.x - 10, mo.y, { beam: true }); setTimeout(() => ctx.toast(ctx.lang() === 'vi' ? `🐉 NGỌC RỒNG ${n} SAO rơi ra!` : `🐉 The ${n}-STAR DRAGON BALL dropped!`, true), 1800); }
  if (first) { if (ctx.hrBook && ctx.hrBook.add) ctx.hrBook.add(1); h.book = 1; if (ctx.achieve) ctx.achieve('dongho'); setTimeout(() => ctx.toast(t.title, true), 3200); setTimeout(() => { if (ctx.hrBook && ctx.hrBook.open) ctx.hrBook.open(); }, 4200); }
  else setTimeout(() => ctx.toast(t.again, true), 2400);
  ctx.persist(); log('WIN ' + secs + 's first ' + first);
}

/* ---------------- Rocky-ha lúc Tua Lại → HOÀN TÁC ---------------- */
function haFilter(ctx, ox, oy, ang, len, w, tier) {
  const b = ST.boss; if (!inDh(ctx) || !b || !rwOn()) return null;
  const dx = Math.cos(ang), dy = Math.sin(ang), tB = (b.x - ox) * dx + (b.y - 16 - oy) * dy, dB = Math.abs((b.x - ox) * dy - (b.y - 16 - oy) * dx);
  if (!(tB > 0 && tB < len + 20 && dB < 22)) return null;
  const cut = Math.max(6, tB - 12); ST.undo.push({ x: ox, y: oy, a: ang, len: cut, t: 0, life: 0.6, tier: tier || 4 }); ST.stats.undo++;
  if (ctx.pop) ctx.pop(b.x, b.y - 46, L(ctx).undo, '#a0fff0'); ctx.sfx('whirl'); log('ha undone'); return cut;
}

/* ---------------- hình vẽ ---------------- */
function drawBoss(g, mo, x, y) {
  const Q = ST.q; if (!Q) return; Q.flash = mo.flash || 0;
  g.fillStyle = 'rgba(20,10,0,.35)'; g.beginPath(); g.ellipse(Math.round(x), Math.round(y), 12, 4, 0, 0, 7); g.fill();
  drawM(g, Q, x, y);
}
function coreAt(mo) { return { x: mo.x, y: mo.y - 22 + Math.round(Math.sin(mo.bob * 2.4) * 2) }; }
function drawP2(g, mo, x, y) {
  if (mo.hp <= 0 || ST.death) return;   /* đã hạ: ST.death tự vẽ lõi rơi (monsters còn giữ xác vài khung) */
  const c = img(IMG.core), hd = img(IMG.hand), cg = img(IMG.bitL), cy = y - 22 + Math.round(Math.sin(mo.bob * 2.4) * 2), al = mo.alpha ?? 1;
  g.fillStyle = 'rgba(20,10,0,.3)'; g.beginPath(); g.ellipse(Math.round(x), Math.round(y), 10, 3, 0, 0, 7); g.fill();
  if (hd) { drawHand(g, hd, x, cy, mo.spin, al * 0.95, 3); drawHand(g, hd, x, cy, -mo.spin * 1.6 + 2, al * 0.95, 3); }   /* 2 kim xoáy quanh lõi (ảnh PixelLab) */
  if (c) { blitC(g, c, x, cy, al); if ((mo.flash || 0) > 0) { g.save(); g.globalCompositeOperation = 'lighter'; blitC(g, c, x, cy, 0.4); g.restore(); } }
  if (cg) for (let i = 0; i < 3; i++) { const a = mo.spin * 0.8 + i * 2.09; blitC(g, cg, x + Math.cos(a) * 20, cy + Math.sin(a) * 9, al, mo.spin * 3); }
}
/* nhiễu VHS (CHỈ lúc tua lại 3 s): lệch màu R/C, sọc ngang, dải xé ngang — xử lý trên chính canvas, không CSS filter */
let VB = null, VC = null;
function vhs(g, ctx, k) {
  if (typeof document === 'undefined') return; const cv = g.canvas, W = cv.width, H = cv.height, hi = W / ((ctx && ctx.VW) || W);
  VB = VB || document.createElement('canvas'); VC = VC || document.createElement('canvas'); for (const c of [VB, VC]) if (c.width !== W || c.height !== H) { c.width = W; c.height = H; }
  const tint = (c, col) => { const q = c.getContext('2d'); q.globalCompositeOperation = 'source-over'; q.clearRect(0, 0, W, H); q.drawImage(cv, 0, 0); q.globalCompositeOperation = 'multiply'; q.fillStyle = col; q.fillRect(0, 0, W, H); q.globalCompositeOperation = 'source-over'; };
  tint(VB, '#ff2020'); tint(VC, '#20ffff');
  const sh = Math.max(1, Math.round(1.5 * hi));
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.imageSmoothingEnabled = false; g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.22 * k; g.drawImage(VB, sh, 0); g.drawImage(VC, -sh, 0); g.globalCompositeOperation = 'source-over';
  const tt = ST.t; for (let i = 0; i < 3; i++) { const y = Math.round(((tt * (60 + i * 35) + i * H / 3) % H)), h = Math.round((2 + i) * hi); g.globalAlpha = 0.5; g.drawImage(cv, 0, y, W, h, Math.round((4 + i * 3) * hi * (i % 2 ? -1 : 1)), y, W, h); }   /* dải xé ngang */
  g.globalAlpha = 0.07 * k; g.fillStyle = '#ffffff'; for (let y = Math.round((tt * 30 * hi) % (4 * hi)); y < H; y += Math.round(4 * hi)) g.fillRect(0, y, W, Math.max(1, Math.round(hi * 0.6)));   /* sọc quét */
  g.restore();
}

/* ---------------- hệ thống ---------------- */
export const dongho = {
  id: 'dongho', always: true,   /* khe nứt ở 'm7'; trận ở 'rift5' */
  onZoneEnter(ctx) {
    if (inM7(ctx)) { const o = ctx.S.map.objects.find(q => q.rift === 'rift5'); if (o) o.type = riftOpen(ctx) ? 'rift_crack' : 'rift_crack_off'; }
    if (!inDh(ctx)) { reset(); return; }
    reset(); ST.ctx = ctx; const h = sv(ctx); h.tries++; ctx.persist();
    ctx.haFilter = (ox, oy, ang, len, w, tier) => haFilter(ctx, ox, oy, ang, len, w, tier);
    const prevHush = ctx.petHush; ctx.petHush = () => (inDh(ctx) && !!(ST.boss || ST.mo2)) || (prevHush ? prevHush() : false);
    const prevMute = ctx.rkMute; ctx.rkMute = () => (inDh(ctx) && !!(ST.amber && ST.amber.who === 'r')) || (prevMute ? prevMute() : false);   /* Rocky trong khung hổ phách: không chiêu */
    const prevWait = ctx.petWait; ctx.petWait = () => { if (inDh(ctx)) { if (ST.amber && ST.amber.who === 'r') return { x: ST.amber.x, y: ST.amber.y }; if (ST.ult && ST.ult.ph === 'count') return ultSafe(); } return prevWait ? prevWait() : null; };
    const prevImp = ctx.arenaImpact; ctx.arenaImpact = (x, y, power = 1, kind = 'land') => { let n = prevImp ? prevImp(x, y, power, kind) : 0; if (inDh(ctx)) for (const o of livePillars(ctx)) { const c = oCenter(ctx, o); if (Math.hypot(c.x - x, c.y - 8 - y) < (kind === 'land' ? 12 : 16)) { hitPillar(ctx, o, power >= 1.2 ? 2 : 1, 'impact'); n++; } } return n; };   /* bị hất đập vào cột → cột hư / vỡ */
    const M = ctx.monsters, dmg0 = M.damage;
    M.damage = (mo, d, src, ...rest) => {
      if (mo && mo.c && (mo.c.dhBoss || mo.c.dhP2) && inDh(ctx)) {
        if (mo.intro > 0 || ST.ult || ST.shatter) return false;
        const fromRk = src && src === rkEnt(ctx);
        if (rwOn()) { if (!(ST.undoPop > ST.t)) { ST.undoPop = ST.t + 0.6; if (ctx.pop) ctx.pop(mo.x, mo.y - 46, L(ctx).undo, '#a0fff0'); } ST.stats.undo++; return false; }   /* trúng lúc Tua Lại → hoàn tác */
        let mul = 1;
        if (mo.c.dhBoss) { const pos = fromRk ? rkPos(ctx) : ctx.S.player; if (fromRk && isBehind(mo, pos) && ST.gear.off <= 0) gearHit(ctx, 1, 'r');   /* chém kiếm của người chơi đi thẳng monsters.strike → bắt ở seenHit */ mul *= fromRk ? RK_MUL : 1; }
        else mul = fromRk ? P2_RK : 1;
        const dd = Math.max(1, Math.round(d * mul)); if (fromRk) { ST.stats.rkRaw += d; ST.stats.rkDealt += dd; }
        rest[1] = 0; return dmg0(mo, dd, src, ...rest);
      }
      return dmg0(mo, d, src, ...rest);
    };
    const prevFaint = ctx.faintTravel; ctx.faintTravel = () => { if (inDh(ctx)) return ctx.travel('m7', 'rift'); return prevFaint ? prevFaint() : false; };
    for (const o of pillars(ctx)) { o.hpMax = o.dhPillar ? 4 : 5; o.hp = o.hpMax; }
    spawnBoss(ctx);
    if (typeof window !== 'undefined') window.__dh = hooks(ctx);
  },
  onZoneLeave(ctx) { if (inDh(ctx)) { bossCamReset(ctx); ctx.haFilter = null; const p = ctx.S.player; if (ST.spd != null && p) p.speedMul = 1; ST.spd = null; ST.boss = null; ST.mo2 = null; ST.ult = null; ST.sec = null; ST.rw = null; ST.amber = null; ST.amberQ = null; ST.shatter = null; ST.death = null; ST.saws = []; ST.slows = []; } },
  update(dt, ctx) {
    if (typeof window !== 'undefined' && inM7(ctx)) window.__dh = hooks(ctx);
    if (!inDh(ctx)) return; ST.t += dt; ST.ctx = ctx;
    if (ctx.S.mode !== 'play' && ctx.S.mode !== 'faint') return;
    const list = ctx.monsters.list(); if (ST.boss && !list.includes(ST.boss)) ST.boss = null; if (ST.mo2 && !list.includes(ST.mo2)) ST.mo2 = null;
    if (ST.q && !rwOn()) ST.q.t += dt;
    for (const b of [ST.boss, ST.mo2]) if (b && b.kb) b.kb = null;   /* trùm nặng: không bị đánh lùi (monsters.strike đặt kb) */
    if (rwOn() && ST.boss && ST.rw.hpMin != null && ST.boss.hp < ST.rw.hpMin) ST.boss.hp = ST.rw.hpMin;   /* chém trúng lúc tua → hoàn tác */
    if (ST.gear.off > 0) { ST.gear.off -= dt; if (ST.gear.off <= 0) { ST.gear.off = 0; ST.gear.hp = GEAR_HP; if (ST.boss) ctx.toast(L(ctx).gearFix); log('gear fixed'); } }
    if (!rwOn() && ST.boss && ST.introDone && !ST.ult) snap(ctx);   /* ghi cả lúc báo (1,5 s) để tua ngược liền mạch từ vị trí hiện tại */
    if (ST.rw) rewindTick(ctx, dt);
    if (!rwOn()) {
      if (ST.boss && ST.ult) ultTick(ctx, ST.boss, dt);
      if (ST.sec) secTick(ctx, dt);
      sawsTick(ctx, dt); bitsTick(ctx, dt);
    }
    amberTick(ctx, dt); slowTick(ctx, dt); speedTick(ctx);
    if (ST.shatter) shatterTick(ctx, dt); if (ST.death) deathTick(ctx, dt);
    for (const q of ST.ghosts) q.t += dt; ST.ghosts = ST.ghosts.filter(q => q.t < q.life);
    for (const u of ST.undo) u.t += dt; ST.undo = ST.undo.filter(u => u.t < u.life);
    for (const f of ST.fx) f.t += dt; ST.fx = ST.fx.filter(f => f.t < f.dur);
    for (const t of ST.tele) { t.t -= dt; if (t.follow) { t.x = t.follow.x; t.y = t.follow.y; } } ST.tele = ST.tele.filter(t => t.t > 0);
    if (ST.ult && ST.ult.struck) { for (const s of ST.ult.struck) s.t += dt; ST.ult.struck = ST.ult.struck.filter(s => s.t < 0.5); }
    if (ST.banner) { ST.banner.t -= dt; if (ST.banner.t <= 0) ST.banner = null; }
    if (ST.kickCd > 0) ST.kickCd -= dt;
    const p = ctx.S.player;
    if (ST.boss && ST.boss.intro > 0 && p) { const S = ctx.S, k = Math.min(1, dt * 4), tx = ST.boss.x, ty = ST.boss.y - 24; S.camDX = (S.camDX || 0) + (tx - p.x - (S.camDX || 0)) * k; S.camDY = (S.camDY || 0) + (ty - (p.y - 8) - (S.camDY || 0)) * k; }
    else { const bb = boss() || ST.shatter || ST.death; bossCam(ctx, bb ? { x: bb.x, y: bb.y } : null, dt, { h: 40, top: Math.max(40, (ST.uiTopL || 60) * 0.85) }); }
    unstick(ctx);
  },
  near(ctx) {
    const p = ctx.S.player, t = L(ctx);
    if (inM7(ctx)) {
      const o = ctx.S.map.objects.find(q => q.rift === 'rift5'); if (!o) return null; const x = o.x * TS + 16, y = o.y * TS + 10;
      if (Math.hypot(p.x - x, p.y - y) > 48) return null;
      const ok = riftOpen(ctx); return { label: ok ? t.enter : t.locked(roadOk(ctx), rkLv(ctx) >= RK_NEED, rkLv(ctx)), x, y, limit: 48, priority: 5, data: { rift5: true, ok } };
    }
    if (!inDh(ctx)) return null;
    if (ST.boss && ST.boss.intro > 0 && INTRO - ST.boss.intro > 0.25) return { label: t.skip, x: p.x, y: p.y - 20, limit: 999, priority: 9, mouse: false, data: { dhSkip: true } };
    const A = ST.amber; if (A && (A.who === 'p' || Math.hypot(A.x - p.x, A.y - p.y) < 30)) return { label: t.smashAmber(`${AMBER.hp - A.hp + 1}/${AMBER.hp}`), x: A.x, y: A.y - 24, limit: 999, priority: 8, cursor: 'tool', data: { dhAmber: true, fight: true } };
    if (boss()) for (const o of livePillars(ctx)) { const d = ctx.O[o.type], cx = Math.max(o.x * TS, Math.min((o.x + d.fw) * TS, p.x)), cy = Math.max(o.y * TS, Math.min((o.y + 1) * TS, p.y - 4)); if (Math.hypot(cx - p.x, cy - (p.y - 4)) < 12) return { label: t.smashPillar(`${(o.hpMax || 4) - (o.hp ?? 4) + 1}/${o.hpMax || 4}`), x: o.x * TS + d.fw * 8, y: (o.y + 1) * TS - 4, limit: 30, priority: 2, cursor: 'tool', data: { dhPillar: o, fight: true } }; }
    return null;
  },
  interact(ctx, cand) {
    const d = cand && cand.data; if (!d) return;
    if (d.dhSkip) { skipIntro(ctx); return; }
    if (d.dhAmber) { if (ST.kickCd > 0) return; ST.kickCd = 0.28; const p = ctx.S.player; if (p.hasAct && p.hasAct('attack')) p.act('attack', 0); hitAmber(ctx, 1); return; }
    if (d.dhPillar) { if (ST.kickCd > 0) return; ST.kickCd = 0.4; const p = ctx.S.player; if (p.faceTo) p.faceTo(d.dhPillar.x * TS + 8, d.dhPillar.y * TS + 8); if (p.hasAct && p.hasAct('attack')) p.act('attack', 0); hitPillar(ctx, d.dhPillar, 1, 'player'); return; }
    if (!d.rift5) return;
    if (!rk(ctx)) { ctx.toast(L(ctx).noRocky); return; }
    if (!d.ok) { ctx.toast(L(ctx).locked(roadOk(ctx), rkLv(ctx) >= RK_NEED, rkLv(ctx)), true); ctx.sfx('fail'); return; }
    ctx.sfx('whirl'); ctx.travel('rift5', 'default');
  },
  onClick(ctx, mt) {   /* click trúng khung hổ phách → đập */
    if (!inDh(ctx) || !mt || !ST.amber) return false; const A = ST.amber, p = ctx.S.player;
    if (Math.abs(mt.wx - A.x) < 13 && mt.wy > A.y - 34 && mt.wy < A.y + 4 && (A.who === 'p' || Math.hypot(A.x - p.x, A.y - p.y) < 34)) { if (!(ST.kickCd > 0)) { ST.kickCd = 0.28; hitAmber(ctx, 1); } return true; }
    return false;
  },
  drawGround(g, ctx, cx, cy) {
    if (!inDh(ctx)) return;
    for (const F of ctx.S.map.dhFloor || []) { const im = img(F.big ? IMG.floorL : IMG.floorM); if (im) blitC(g, im, F.x - cx, F.y - cy, 1); }   /* v2: sàn BÁNH RĂNG tròn PixelLab (nhìn từ trên, nằm phẳng trên nền) */
    const U = ST.ult;
    if (U) {   /* nền sân thành MẶT SỐ: vòng đồng thau + 12 vạch + chữ La Mã + ảnh mặt số PixelLab ở tâm; múi sắp bị quét tô đỏ */
      const X = Math.round(U.x - cx), Y = Math.round(U.y - cy), a0 = Math.min(1, U.ph === 'rise' ? U.t / ULT.rise : 1), R = ULT.R;
      g.save(); g.globalAlpha = 0.85 * a0;
      if (U.ph === 'count' && U.dead) { const u = U.t - U.k * ULT.tick, k = Math.min(1, u / ULT.warn); for (const h of U.dead) { g.globalAlpha = (0.12 + 0.3 * k) * a0; g.fillStyle = u < ULT.warn ? '#ff4030' : '#ffffff'; g.beginPath(); g.moveTo(X, Y); g.arc(X, Y, R, hourA(h), hourA(h + 1)); g.closePath(); g.fill(); } }
      g.globalAlpha = 0.85 * a0; g.strokeStyle = '#e0b050'; g.lineWidth = 2; g.beginPath(); g.arc(X, Y, R, 0, 7); g.stroke(); g.strokeStyle = '#7a5020'; g.lineWidth = 1; g.beginPath(); g.arc(X, Y, R - 3, 0, 7); g.stroke();
      for (let h = 0; h < 12; h++) { const a = hourA(h); g.strokeStyle = '#f0d080'; g.beginPath(); g.moveTo(Math.round(X + Math.cos(a) * (R - 8)), Math.round(Y + Math.sin(a) * (R - 8))); g.lineTo(Math.round(X + Math.cos(a) * R), Math.round(Y + Math.sin(a) * R)); g.stroke(); }
      const face = img(IMG.face); if (face) blitC(g, face, X, Y, 0.9 * a0);
      g.font = '10px VT323, monospace'; g.textAlign = 'center'; g.textBaseline = 'middle'; const NUM = ['XII', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'], cur = U.ph === 'count' ? ((12 - U.k) % 12) : -1;
      for (let h = 0; h < 12; h++) { const a = hourA(h), x = Math.round(X + Math.cos(a) * (R - 16)), y = Math.round(Y + Math.sin(a) * (R - 16)); g.globalAlpha = a0; g.fillStyle = '#000'; g.fillText(NUM[h], x + 1, y + 1); g.fillStyle = h === cur ? '#fff6a0' : '#d8b060'; if (h === cur) { g.shadowColor = '#ffd040'; g.shadowBlur = 6; } g.fillText(NUM[h], x, y); g.shadowBlur = 0; }
      g.restore();
    }
    for (const f of ST.fx) if (f.ground) drawSheet(g, f.s, Math.min(f.s.n - 1, Math.floor(f.t * (f.s.fps || 12))), f.x - cx, f.y - cy, f.alpha);
    for (const z of ST.slows) { const X = Math.round(z.x - cx), Y = Math.round(z.y - cy), a = Math.min(1, z.t / 0.3, (z.life - z.t) / 0.5); g.save(); g.globalAlpha = 0.18 * a; g.fillStyle = '#50c8ff'; g.beginPath(); g.ellipse(X, Y, z.r, z.r * 0.8, 0, 0, 7); g.fill(); g.globalAlpha = 0.75 * a; g.strokeStyle = '#a0f0ff'; g.lineWidth = 1; g.setLineDash([4, 3]); g.beginPath(); g.ellipse(X, Y, z.r, z.r * 0.8, 0, 0, 7); g.stroke(); g.restore(); const hg = img(IMG.hourglass); if (hg) blitC(g, hg, X, Y - 2, 0.85 * a); }   /* vùng chậm: viền nét đứt + đồng hồ cát PixelLab (tĩnh) */
    for (const t of ST.tele) {   /* báo trước: sáng dần tới lúc ra đòn (không nhấp nháy lặp) */
      const k = 1 - t.t / t.T0, X = Math.round(t.x - cx), Y = Math.round(t.y - cy); g.save();
      if (t.type === 'c' || t.type === 'amber' || t.type === 'slow') { g.strokeStyle = t.col; g.globalAlpha = 0.4 + 0.5 * k; g.lineWidth = 1; g.beginPath(); g.ellipse(X, Y, t.r, t.r * (t.type === 'c' ? 1 : 0.8), 0, 0, 7); g.stroke(); g.globalAlpha = 0.1 + 0.25 * k; g.fillStyle = t.col; g.beginPath(); g.ellipse(X, Y, t.r * k, t.r * k * (t.type === 'c' ? 1 : 0.8), 0, 0, 7); g.fill(); }
      else if (t.type === 'cone') { g.globalAlpha = 0.15 + 0.35 * k; g.fillStyle = t.col; g.beginPath(); g.moveTo(X, Y); g.arc(X, Y, t.r, t.a - t.w / 2 - 0.12, t.a + t.w / 2 + 0.12); g.closePath(); g.fill(); }
      else if (t.type === 'l') { g.globalAlpha = 0.25 + 0.5 * k; g.strokeStyle = t.col; g.lineWidth = 1 + Math.round(2 * k); g.beginPath(); g.moveTo(X, Y); g.lineTo(Math.round(t.x + Math.cos(t.a) * t.len - cx), Math.round(t.y + Math.sin(t.a) * t.len - cy)); g.stroke(); }
      g.restore();
    }
    const S = ST.sec;
    if (S) {   /* Kim Giây: tầm quét (vòng mờ) + vạch báo chỗ hai kim sẽ GIAO NHAU (1 s trước) */
      const X = Math.round(S.x - cx), Y = Math.round(S.y - cy), tt = S.t - SEC.warn; g.save();
      g.globalAlpha = 0.3; g.strokeStyle = '#ffb040'; g.setLineDash([3, 4]); g.beginPath(); g.ellipse(X, Y, SEC.LA, SEC.LA * 0.9, 0, 0, 7); g.stroke(); g.setLineDash([]);
      for (const c of secCrosses(S)) { const dtc = c.tt - tt; if (dtc > 1.0 || dtc < -0.15) continue; const k = 1 - Math.max(0, dtc) / 1.0; g.globalAlpha = 0.25 + 0.6 * k; g.strokeStyle = '#ff3020'; g.lineWidth = 1 + Math.round(3 * k); g.beginPath(); g.moveTo(X, Y); g.lineTo(Math.round(X + Math.cos(c.a) * (SEC.LB + 10)), Math.round(Y + Math.sin(c.a) * (SEC.LB + 10))); g.stroke(); }
      g.restore();
    }
  },
  drawables(ctx, cx, cy) {
    if (!inDh(ctx)) return []; const out = [], g = ctx.g, b = ST.boss;
    for (const f of ST.fx) if (!f.ground) out.push({ y: f.top ? 1e9 : f.y + 6, f: () => drawSheet(g, f.s, Math.min(f.s.n - 1, Math.floor(f.t * (f.s.fps || 12))), f.x - cx, f.y - cy, f.alpha) });
    for (const q of ST.ghosts) {
      const u = q.t / q.life;
      if (q.cog) { const cg = img(IMG.bitL); if (!cg) continue; const r = q.r * (1 - u), x = q.x + Math.cos(q.a - u * 3) * r, y = q.y + Math.sin(q.a - u * 3) * r * 0.7; out.push({ y: 1e8, f: () => blitC(g, cg, x - cx, y - cy, 1 - u * 0.3, u * 9) }); }   /* màn mở đầu: bánh răng bay ngược vào ráp thân */
      else if (q.core) { const c = img(IMG.core); if (c) out.push({ y: q.y, f: () => blitC(g, c, q.x - cx, q.y - 22 - cy, q.a0 * (1 - u)) }); }
      else if (q.cell) out.push({ y: q.y - 0.5, f: () => drawCell(g, q.cell, q.x - cx, q.y - cy, q.a0 * (1 - u)) });   /* dư ảnh nhảy thời gian */
    }
    /* đồng hồ trên đầu khi sắp tua lại (kim quay NGƯỢC) — tĩnh ngoài lúc báo */
    if (b && ST.rw) { const w = img(IMG.watch); if (w) { const x = b.x - cx, y = b.y - 50 - cy, a = -ST.t * 9; out.push({ y: b.y + 1, f: () => { blitC(g, w, x, y, 1); g.save(); g.strokeStyle = '#201008'; g.lineWidth = 1; g.beginPath(); g.moveTo(Math.round(x), Math.round(y + 1)); g.lineTo(Math.round(x + Math.cos(a) * 5), Math.round(y + 1 + Math.sin(a) * 5)); g.moveTo(Math.round(x), Math.round(y + 1)); g.lineTo(Math.round(x + Math.cos(a / 12) * 3), Math.round(y + 1 + Math.sin(a / 12) * 3)); g.stroke(); g.restore(); } }); } }
    if (b && ST.gear.off <= 0 && !(b.intro > 0) && !ST.ult && (ST.rw || ST.cd.rewind < 5)) { const mk = img(IMG.target); if (mk) { const f = faceVec(ST.q), gx = b.x - f.x * 16, gy = b.y - 30 - f.y * 6; const cg = img(IMG.cog); out.push({ y: 1e8, f: () => { if (cg) blitC(g, cg, gx - cx, gy - cy, 1); const w = mk.naturalWidth / 2, h = mk.naturalHeight / 2; g.save(); g.imageSmoothingEnabled = false; g.drawImage(mk, Math.round(gx - cx - w / 2), Math.round(gy - cy - h - 8), w, h); g.restore(); } }); } }   /* v2: chỉ chỗ BÁNH RĂNG (sau lưng) khi Tua Lại sắp tới — dấu tĩnh */
    /* bánh răng lưng vỡ: dấu tĩnh (bánh răng PixelLab mờ) sau lưng */
    if (b && ST.gear.off > 0 && !(b.intro > 0)) { const cg = img(IMG.cog); if (cg) { const f = faceVec(ST.q); out.push({ y: b.y - 1, f: () => blitC(g, cg, b.x - f.x * 10 - cx, b.y - 40 - cy, 0.45, 0.4) }); } }
    if (b && b.act && b.act.k === 'sweep' && b.act.t >= b.act.T) { const A = b.act, u = Math.min(1, (A.t - A.T) / 0.4), lh = img(IMG.second); if (lh && u < 1) { const a = (A.a0 || 0) + u * Math.PI * 2; out.push({ y: b.y + 2, f: () => { drawHand(g, lh, b.x - cx, b.y - SEC.chest - cy, a, 1, 7); drawHand(g, lh, b.x - cx, b.y - SEC.chest - cy, a + Math.PI, 1, 7); } }); } }   /* v2: Xoay Kim quét đủ 360° (kim đỏ PixelLab xoay theo góc) */
    if (ST.sec && b) { const S = ST.sec, tt = Math.max(0, S.t - SEC.warn), A = secAng(S, tt), al = Math.min(1, S.t / SEC.warn), lh = img(IMG.long), sc = img(IMG.second); out.push({ y: b.y + 2, f: () => { drawHand(g, lh, S.x - cx, S.y - cy, A.a, al, 6); drawHand(g, sc, S.x - cx, S.y - cy, A.b, al, 7); } }); }
    if (ST.ult) { const U = ST.ult, lh = img(IMG.long), a0 = U.ph === 'rise' ? Math.min(1, U.t / ULT.rise) : U.ph === 'bell' ? Math.max(0, 1 - U.t / 0.2) : 1;
      if (lh && a0 > 0) out.push({ y: U.y + 3, f: () => { for (let h = 0; h < 12; h++) { let a = hourA(h), on = false; if (U.ph === 'count' && U.dead && U.dead.includes(h)) { const u = U.t - U.k * ULT.tick; if (u >= ULT.warn) { const v = Math.min(1, (u - ULT.warn) / 0.12), back = Math.max(0, (u - ULT.warn - 0.12) / 0.13); a += Math.PI / 6 * v * (1 - Math.min(1, back)); on = true; } } drawHand(g, lh, U.x - cx, U.y - cy, a, a0 * (on ? 1 : 0.8), 6); } } }); }   /* 12 kim mọc quanh tâm (ảnh PixelLab) — kim nhịp này quét 30° rồi bật về */
    for (const s of ST.saws) { const im = img(IMG.saw); if (!im || s.rwHide) continue; out.push({ y: s.y, f: () => { g.save(); g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(Math.round(s.x - cx - 3), Math.round(s.y - cy), 6, 2); g.restore(); blitC(g, im, s.x - cx, s.y - s.z - cy, 1, s.rot); } });   /* bánh răng bay: vị trí = bóng dưới đất (va chạm theo ô đất), vẽ cao z */ }
    for (const q of ST.bits) { if (q.rwHide) continue; const im = img(q.kind === 'saw' ? IMG.bitL : IMG.bit);   /* bánh răng văng: nhỏ đúng cỡ thật, đồng tối (v2) */ if (!im) continue; out.push({ y: q.y, f: () => { if (q.z > 1) { g.save(); g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(Math.round(q.x - cx - 3), Math.round(q.y - cy), 6, 2); g.restore(); } blitC(g, im, q.x - cx, q.y - q.z - cy, Math.min(1, (q.life - q.t) / 0.4), q.rot); } }); }
    if (ST.amber) { const A = ST.amber, im = img(A.hp <= 1 ? IMG.amber2 : A.hp <= 3 ? IMG.amber1 : IMG.amber) || img(IMG.amber); if (im) out.push({ y: A.y + 1.5, f: () => blitC(g, im, A.x - cx, A.y - 14 - cy, 0.66) }); }   /* khối hổ phách trong mờ (v2): thấy người bị nhốt bên trong */   /* khung hổ phách (PixelLab, ảnh nứt theo máu) đè lên người bị nhốt */
    for (const u of ST.undo) { const sh = bSheet(beamKey(u.tier)); if (!sh) continue; out.push({ y: 1e8, f: () => { const k = 1 - u.t / u.life; bDraw(g, sh, bFrame(sh, 0.15), u.x - cx, u.y - cy, u.a, Math.max(4, u.len * k), 0.9 * k); } }); }   /* Rocky-ha CUỘN NGƯỢC về tay Rocky (hoàn tác) */
    if (ST.shatter) { const S = ST.shatter; out.push({ y: S.y, f: () => drawCell(g, mCell(S.Q), S.x - cx, S.y - cy, S.t < 1.6 ? 1 : Math.max(0, 1 - (S.t - 1.6) / 0.6)) }); }
    if (ST.death) { const D = ST.death, c = img(IMG.core); if (c && D.t < 1.2) out.push({ y: D.y, f: () => blitC(g, c, D.x - cx, D.y - 22 + D.t * 18 - cy, 1 - D.t / 1.2) }); }
    return out;
  },
  draw(g, ctx, cx, cy) {
    if (!inDh(ctx)) return;
    if (rwOn()) vhs(g, ctx, Math.min(1, ST.rw.t / 0.2, (REW.dur - ST.rw.t) / 0.25));
    const mk = img(IMG.target), bb = boss();
    if (bb && mk && ST.introDone && !ST.ult && !ST.won && !ST.shatter) { const q = tgPos(ctx, ST.tgt) || ctx.S.player, isR = ST.tgt === 'r' && q !== ctx.S.player, pt = rk(ctx), hh = isR ? (pt && pt.superT > 0 ? 28 : 18) : 28, w = mk.naturalWidth / 2, h = mk.naturalHeight / 2; g.save(); g.imageSmoothingEnabled = false; g.drawImage(mk, Math.round(q.x - cx - w / 2), Math.round(q.y - cy - hh - h), w, h); g.restore(); }   /* dấu mục tiêu TĨNH */
  },
  drawUI(ug, ctx, cx, cy, scale) {
    if (!inDh(ctx) || (ctx.S.mode !== 'play' && ctx.S.mode !== 'faint')) return; const W = ug.canvas.width, H = ug.canvas.height, t = L(ctx), b = boss(), isP2 = !!b && b === ST.mo2;
    const font = px2 => `${Math.round(px2)}px VT323, monospace`;
    let yb = 60;
    if (b && !(ST.boss && ST.boss.intro > 0)) {
      const fr = img(IMG.bar) || img('ui/guong/bossbar.png'), narrow = W < 560, low = H < 460, bw0 = narrow ? W * 0.92 : Math.min(low ? W * 0.44 : W * 0.9, 430, Math.max(300, W * 0.4)), BB = bossBarBox(ug, bw0, bw0 * 94 / 648 + 26), bw = BB.w, bh = bw * 94 / 648, bx = BB.x, by = BB.y, tcx = BB.cx;
      const ix = bx + bw * 137 / 648, iy = by + bh * 26 / 94, iw = bw * (565 - 137) / 648, ih = bh * 34 / 94, k = Math.max(0, b.hp / b.max);
      ug.save(); ug.imageSmoothingEnabled = false; if (fr) ug.drawImage(fr, bx, by, bw, bh); else { ug.fillStyle = '#1a1006'; ug.fillRect(ix, iy, iw, ih); }
      const gr = ug.createLinearGradient(0, iy, 0, iy + ih); gr.addColorStop(0, isP2 ? '#c0fff0' : '#ffe8a0'); gr.addColorStop(1, isP2 ? '#20a090' : '#b06a18'); ug.fillStyle = gr; ug.fillRect(ix, iy, iw * k, ih);
      ug.fillStyle = 'rgba(255,255,255,.2)'; ug.fillRect(ix, iy, iw * k, Math.max(1, ih * 0.22));
      const fs = Math.max(14, bh * 0.32); ug.font = font(fs); ug.textAlign = 'center'; ug.textBaseline = 'top';
      const nm = isP2 ? (narrow ? `${t.ph2name} · ${t.phase(2)}` : `${t.ph2name} · ${t.ph2sub} · ${t.phase(2)}`) : (narrow ? `${t.name} · ${t.phase(1)}` : `${t.name} · ${t.sub} · ${t.phase(1)}`);
      ug.fillStyle = '#000'; ug.fillText(nm, tcx + 1, by + bh + 1, bw); ug.fillStyle = '#fff0d0'; ug.fillText(nm, tcx, by + bh, bw);
      yb = by + bh + fs + 6;
      if (!isP2 && ST.boss) {   /* hàng: BÁNH RĂNG (8 ô bánh răng PixelLab) · đồng hồ bỏ túi + giây tới lần Tua Lại */
        const cg = img(IMG.cog), wt = img(IMG.watch), rwTxt = ST.rw ? t.rw : t.rwIn(Math.max(0, Math.ceil(ST.cd.rewind)));
        let sz = Math.round(Math.max(10, Math.min(24, (bw - 40) / 14))), gap, fs3, lw, tw, rw, all;
        for (;;) { gap = Math.max(1, Math.round(sz * 0.15)); fs3 = Math.max(10, sz * 0.75); ug.font = font(fs3); lw = ug.measureText(t.gear).width + 6; tw = GEAR_HP * (sz + gap); rw = sz + 4 + ug.measureText(rwTxt).width; all = lw + tw + 14 + rw; if (all <= bw || sz <= 8) break; sz--; }   /* vừa bề rộng thanh máu (điện thoại dọc) */
        const x0 = Math.round(tcx - all / 2);
        ug.fillStyle = 'rgba(20,12,4,.72)'; ug.fillRect(x0 - 3, yb - 3, all + 6, sz + 6);
        ug.textAlign = 'left'; ug.fillStyle = '#000'; ug.fillText(t.gear, x0 + 1, yb + sz * 0.1 + 1); ug.fillStyle = ST.gear.off > 0 ? '#ff9a70' : '#ffd890'; ug.fillText(t.gear, x0, yb + sz * 0.1);
        if (ST.gear.off > 0) { const s2 = t.gearOff(Math.ceil(ST.gear.off)); ug.fillStyle = '#000'; ug.fillText(s2, x0 + lw + 1, yb + sz * 0.1 + 1); ug.fillStyle = '#ff9a70'; ug.fillText(s2, x0 + lw, yb + sz * 0.1); }
        else for (let i = 0; i < GEAR_HP; i++) { if (cg) { ug.globalAlpha = i < ST.gear.hp ? 1 : 0.25; ug.drawImage(cg, x0 + lw + i * (sz + gap), yb, sz, sz); ug.globalAlpha = 1; } }
        const x2 = x0 + lw + tw + 14; if (wt) ug.drawImage(wt, x2, yb, sz, sz); ug.fillStyle = '#000'; ug.fillText(rwTxt, x2 + sz + 5, yb + sz * 0.1 + 1); ug.fillStyle = ST.rw ? '#a0fff0' : '#e8dcc0'; ug.fillText(rwTxt, x2 + sz + 4, yb + sz * 0.1);
        yb += sz + 4; const fs2 = Math.max(13, bh * 0.28); ug.font = font(fs2); ug.textAlign = 'center';
        const soon = ST.gear.off <= 0 && (ST.rw || ST.cd.rewind < 5), tip = ST.gear.off > 0 ? t.rwNo : soon ? t.back : t.hint; ug.fillStyle = '#000'; ug.fillText(tip, tcx + 1, yb + 1, bw); ug.fillStyle = soon ? '#ffe070' : '#f0e6d0'; ug.fillText(tip, tcx, yb, bw); yb += fs2 + 4;
      }
      ST.uiTop = yb; ST.uiTopL = yb / Math.max(1, scale); ug.restore();
    }
    if (rwOn()) {   /* ◀◀ TUA LẠI (chỉ trong 3 s) */
      const fs = Math.max(20, Math.min(W / 14, scale * 10)), s = `${t.rw} ${(REW.dur - ST.rw.t).toFixed(1)}s`; ug.save(); ug.font = font(fs); ug.textAlign = 'left'; ug.textBaseline = 'top';
      const x = Math.max(10, W * 0.04), y = Math.max(yb + 4, H * 0.2); ug.fillStyle = '#000'; ug.fillText(s, x + 2, y + 2); ug.fillStyle = '#e8fff8'; ug.fillText(s, x, y); ug.restore();
    }
    if (ST.ult && ST.ult.ph === 'count') {   /* chữ La Mã đếm ngược phát sáng */
      const NUM = ['XII', 'XI', 'X', 'IX', 'VIII', 'VII', 'VI', 'V', 'IV', 'III', 'II', 'I'], s = NUM[Math.max(0, Math.min(11, ST.ult.k))], fs = Math.max(26, Math.min(W / 9, scale * 14));
      ug.save(); ug.font = font(fs); ug.textAlign = 'center'; ug.textBaseline = 'middle'; ug.shadowColor = '#ffc040'; ug.shadowBlur = 12; ug.fillStyle = '#fff2b0'; ug.fillText(s, W / 2, H * 0.72); ug.restore();
    }
    if (ST.banner) {
      const a = Math.min(1, ST.banner.t * 2), fs = Math.max(20, Math.min(W / 18, scale * 8.5)); ug.save(); ug.globalAlpha = a; ug.font = font(fs); ug.textAlign = 'center'; ug.textBaseline = 'middle';
      const y = Math.max(H * 0.24, yb + fs * 0.8); const tw = Math.min(W - 10, ug.measureText(ST.banner.txt).width + 24); ug.fillStyle = 'rgba(30,18,6,.72)'; ug.fillRect((W - tw) / 2, y - fs * 0.6, tw, fs * 1.2);
      ug.fillStyle = '#000'; ug.fillText(ST.banner.txt, W / 2 + 2, y + 2, W - 16); ug.fillStyle = '#fff2d8'; ug.fillText(ST.banner.txt, W / 2, y, W - 16); ug.restore();
    }
  },
};
/* chỗ an toàn cho Rocky trong tuyệt chiêu: giữa múi không bị quét ở nhịp này và nhịp sau, r 70 */
function ultSafe() {
  const U = ST.ult; if (!U || U.k < 0) return null; const now = ultDeadly(U.k), nx = ultDeadly(U.k + 1);
  for (let h = 0; h < 12; h++) if (!now.includes(h) && !nx.includes(h)) { const a = hourA(h) + Math.PI / 12; return { x: U.x + Math.cos(a) * 70, y: U.y + Math.sin(a) * 70 }; }
  return null;
}

/* móc test (QA) */
function hooks(ctx) {
  return {
    st: () => { const b = ST.boss, m2 = ST.mo2; return { phase: ST.won ? 'won' : ST.death ? 'death' : m2 ? 'p2' : ST.shatter ? 'shatter' : b ? 'p1' : '-', inDh: inDh(ctx), open: riftOpen(ctx), road: roadOk(ctx), rkLv: rkLv(ctx),
      boss: b ? { x: Math.round(b.x), y: Math.round(b.y), hp: Math.round(b.hp), max: b.max, phase: b.phase, intro: b.intro > 0, act: b.act && b.act.k, stun: +(b.stunT || 0).toFixed(2) } : null,
      p2: m2 ? { x: Math.round(m2.x), y: Math.round(m2.y), hp: Math.round(m2.hp), max: m2.max, act: m2.act && m2.act.k } : null,
      rw: ST.rw && { ph: ST.rw.ph, t: +ST.rw.t.toFixed(2), gearOk: ST.rw.gearOk }, gear: { ...ST.gear }, amber: ST.amber && { who: ST.amber.who, hp: ST.amber.hp, t: +ST.amber.t.toFixed(2) }, amberQ: !!ST.amberQ,
      sec: ST.sec && { t: +ST.sec.t.toFixed(2) }, ult: ST.ult && { ph: ST.ult.ph, k: ST.ult.k, dead: ST.ult.dead }, saws: ST.saws.length, bits: ST.bits.length, slows: ST.slows.map(z => ({ x: Math.round(z.x), y: Math.round(z.y), r: z.r })), spd: ctx.S.player.speedMul,
      hist: ST.hist.length, cd: Object.fromEntries(Object.entries(ST.cd).map(([k, v]) => [k, +v.toFixed(1)])), seq: ST.seq.slice(), q: ST.q && { clip: ST.q.clip, dir: ST.q.dir, alpha: ST.q.alpha },
      pillars: pillars(ctx).map(o => ({ x: o.x, y: o.y, type: o.orig || o.type, hp: o.hp, ruined: !!o.ruined, solid: ctx.isSolid(ctx.S.map, o.x, o.y) })),
      tgt: ST.tgt, tgtLog: { ...ST.tgtLog }, won: ST.won, stats: JSON.parse(JSON.stringify(ST.stats)), save: { ...sv(ctx) }, log: ST.log.slice(-30), t: +ST.t.toFixed(1), tele: ST.tele.map(q => q.type), mmeta: !!MM, uiTopL: ST.uiTopL }; },
    hold: v => { const b = ST.boss; if (b && b.intro > 0) b.intro = 0.001; ST.hold = !!v; if (b) b.act = null; if (ST.mo2) ST.mo2.act = null; if (v) { for (const k in ST.cd) ST.cd[k] = 999; for (const k in ST.cd2) ST.cd2[k] = 999; ST.ultAt = []; } },
    free: () => { ST.hold = false; for (const k in ST.cd) ST.cd[k] = 999; for (const k in ST.cd2) ST.cd2[k] = 999; ST.ultAt = []; },
    live: () => { ST.hold = false; reset2(); },
    cd: o => Object.assign(ST.cd, o), cd2: o => Object.assign(ST.cd2, o), place: (x, y) => { const b = boss(); if (b) { b.x = x; b.y = y; } }, face: d => { if (ST.q) ST.q.dir = d; }, skip: () => skipIntro(ctx),
    slash: () => { const b = ST.boss; if (b) { b.act = null; startSlash(ctx, b, ctx.S.player); } }, sweep: () => { const b = ST.boss; if (b) { b.act = null; startSweep(ctx, b); } },
    saw: () => { const b = ST.boss; if (b) { b.act = null; startSaw(ctx, b, ctx.S.player); } }, jump: () => { const b = ST.boss; if (b) { b.act = null; startJump(ctx, b, ctx.S.player, false); } },
    sec: () => { const b = ST.boss; if (b) { b.act = null; startSec(ctx, b, ctx.S.player); } }, amber: () => { const b = ST.boss; if (b) { b.act = null; startAmber(ctx, b); } },
    rewind: () => { const b = ST.boss; if (b) { b.act = null; startRewind(ctx, b); } }, ult: () => { const b = ST.boss; if (b) { b.act = null; startUlt(ctx, b); } },
    gearHit: n => gearHit(ctx, n || 1, 'test'), hitAmber: n => hitAmber(ctx, n || 1), behind: (x, y) => ST.boss ? isBehind(ST.boss, { x, y }) : null,
    secHit: (tt, x, y) => ST.sec ? secHitAt(ST.sec, tt, x, y) : null, secCross: () => ST.sec ? secCrosses(ST.sec) : null, secMock: (bx, by, a0) => { const S = { x: bx, y: by, a0, b0: a0 + (SEC.wA - SEC.wB) * 2.2 }; return { hits: (tt, x, y) => secHitAt(S, tt, x, y), crosses: secCrosses(S), SEC }; },
    ultDeadly: k => ultDeadly(k), sectorOf: (x, y) => ST.ult ? sectorOf(ST.ult.x, ST.ult.y, x, y) : null, ULT,
    hitPillar: (i, n) => hitPillar(ctx, pillars(ctx)[i], n || 1, 'test'), filter: (ox, oy, deg, len) => haFilter(ctx, ox, oy, deg * Math.PI / 180, len || 160, 10, 5),
    setHp: f => { const b = boss(); if (b) b.hp = Math.max(1, Math.round(b.max * f)); }, kill: () => { const b = boss(); if (b) ctx.monsters.kill(b); },
    boss: () => ST.boss, p2: () => ST.mo2, tgt: w => { ST.tgt = w; ST.tgtT = 0; }, p2Do: k => { ST.hold = false; for (const q in ST.cd2) ST.cd2[q] = 99; ST.cd2[k] = 0; if (ST.mo2) ST.mo2.act = null; },
  };
}
function reset2() { for (const k in SK1) ST.cd[k] = { rewind: 14, sec: 8, amber: 11, sweep: 3, saw: 4, jump: 5, slash: 0 }[k]; for (const k in SK2) ST.cd2[k] = { slow: 3, jump: 1.5, volley: 1 }[k]; ST.ultAt = [0.6, 0.3]; }
