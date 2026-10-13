// trongdong.js — plan-30 TRÙM 2: TRỐNG ĐỒNG THIÊN LÔI "Kẻ Gõ Nhịp Địa Chấn" (Vết Nứt Magnitude) — agent trùm 2, 2026-10-13.
//  · Khe nứt (ảnh PixelLab rift_crack dùng chung với trùm 1) ở M2 Làng Rung Khẽ, phía Đông quảng trường (world.js riftCrackM2). Mở khi: đã qua đèo road2
//    (save.sys.road.won.road2 / maxZ ≥ 2 / save cũ có huy hiệu M2) + Rocky ≥ cấp 30. Chưa đủ → khe mờ + nhãn điều kiện.
//  · Vào khe → vùng 'rift2' (world.js buildRift2): sân đá phiến khảm đồng (Wang PixelLab), cột đồng + bệ thu lôi PHÁ ĐƯỢC (arena.js), lối ra Nam LUÔN mở.
//  · Trùm = 1 quái trong ctx.monsters (aiFn / drawFn / onDown). Ảnh PixelLab (assets/px/boss/trongdong): mặt trống Đông Sơn bay (128 px = 64 logic ≈ 4 lần
//    người chơi, 8 khung quay chậm — animate_object), cánh tay sấm cầm dùi (6 khung gõ), chim Lạc lửa (4 khung vỗ cánh), mặt trống in xuống sàn (400 px).
//    Mọi hình vẽ 1:1 (ảnh 2× vẽ kèm cỡ đích ½) — không phóng sprite.
//  · NHỊP: 100 BPM = bài 'rift2' (songs.js). Đồng hồ nhịp đọc audio.musicClock() (đúng nhịp nhạc); nhạc tắt → đồng hồ trong game cùng nhịp.
//    Dấu nhịp ‹•› mỗi 2 phách (1,2 s) trên thanh nhịp (khung PixelLab ui/trongdong/beatbar.png); cửa sổ đúng nhịp ±0,17 s.
//  · Chiêu (đều báo trước ≥ 1 s, nhắm đúng chỗ người đứng ở MỌI phía, không có vùng chết khoảng cách — đánh từ xa bằng sóng / chim / sét):
//    Nhịp Chấn (vòng sóng địa chấn loang theo từng phách, mỗi vòng có 1 KHE — vạch nhịp báo hướng khe trước 1 phách; né = đứng vào khe / ra ngoài tầm),
//    Đàn Chim Lạc (đường số 8 chấm vàng quanh chỗ người đứng 1,3 s rồi đàn chim lửa bay theo), Dùi Sấm (vòng báo 1,2 s rồi sét giáng — phá được cột),
//    Câm Lặng (khắc chế Rocky: 1 tiếng trầm → Rocky câm 6 s, icon tĩnh trên đầu; đánh mép trống ĐÚNG NHỊP 1 lần để phá câm),
//    TUYỆT CHIÊU Trống Đồng Giáng Thế (mặt trống in xuống sàn, 12 vòng hoa văn quay ngược chiều nhau, đổi hướng 3 lần, sét đánh theo cung sáng mỗi phách;
//    ngôi sao ở tâm LUÔN an toàn; ngoài mặt trống có sét nhắm người — báo trước 1 phách).
//  · Khắc chế Rocky: đòn Rocky vào trống chỉ 25 % — trừ lúc trống LỠ NHỊP (người chơi đánh mép đúng nhịp 3 lần liền) → LỘ 5 s, Rocky ×1,5, kiếm ×1,25.
//  · Hiệu ứng chỉ bật khi ra chiêu: hoa văn trống loang trên nền theo phách CHỈ trong lúc Nhịp Chấn / tuyệt chiêu; trúng đòn nặng → nhạc 'lỡ nhịp' (musicHiccup).
//  · Thưởng lần đầu: sách Rocky bậc 8 thứ hai (dùng chung kho sách của hacrocky.js — ctx.hrBook.add), Ngọc Rồng ngẫu nhiên, thành tựu 'trongdong', XP + đá;
//    đánh lại: thưởng giảm. Lưu save.sys.trongdong = { wins, tries, best }.
//  · 2026-10-13 (sửa theo anh Hùng, lần 2): KHÔNG còn cánh tay sấm. Trận 2 PHA:
//    PHA 1 — chỉ có Trống Đồng tự gõ (mặt trống rung + sáng theo nhịp, Dùi Sấm là sét từ trời); mở màn trống giáng từ trời lớn dần qua 4 bậc ảnh PixelLab
//    (drum_s32/48/64/96 → drum_*) kèm sét (E/A bỏ qua). Lúc trống LỘ thấy bóng mờ TĨNH của người ngồi trong trống (gợi ý pha 2).
//    Trống hết máu → nứt, rung, sét đánh, nắp bật ra (drum_lid) → LẠC HẦU GỌI SẤM (kẻ điều khiển trống, nhân vật PixelLab v3 — tools/px-lachau.py,
//    sheet boss/trongdong/lh_<clip>.png + lh.json, 4 hướng, tây = lật đông) văng ra theo vòng cung, nằm, đứng dậy; trống rỗng nằm nghiêng (ảnh hư hỏng
//    PixelLab của chính trống drum_wreck*, edit-images) co nhỏ dần rồi biến mất.
//    PHA 2 — đánh Lạc Hầu (quái thường trong ctx.monsters, Rocky + người chơi đánh bình thường): vung dùi đồng (vòng báo quanh hắn → trúng MỌI phía),
//    giơ dùi gọi sét td_sky nhắm người + Rocky (vòng báo 1 s), lướt né khi bị đánh liên tiếp, gọi 3 chim Lạc lửa đuổi theo. Đuổi tới 18 px < tầm vung 30 px
//    (không vùng chết); kẹt cột > 0,8 s thì đi xuyên. Hết máu → quỵ, tan thành đàn chim Lạc (td_poof), trống nhỏ rơi xuống đất (cảnh) → thắng + thưởng.
//  · Sét từ trời (anh: 'sét phải từ trên thật cao đánh xuống', rồi 'dày và chói hơn'): 4 dạng td_sky0..3 (vfx_workbench, 88×500 px logic, lõi trắng ~7 px + quầng xanh-tím
//    ~16 px, nhánh lớn, quầng sáng tròn r≈40 ở chân, tia chính sáng 0,15 s → tắt 1 khung → sáng lại → tắt dần; vẽ 1:1 + 1 lớp cộng sáng 'lighter'): tia dẫn dò xuống
//    0,2 s → tia chính trắng-xanh có nhánh (đòn trúng đúng lúc này) → tắt dần + vòng tia lửa/bụi ở chân; vết sém td_scorch trên sàn mờ dần 4 s (drawGround).
//    Lóe trắng ≤ 0,1 s chỉ cho Dùi Sấm / bậc cuối màn mở đầu, tối đa 1 lần / 1,5 s (tuyệt chiêu nhiều sét → không lóe).
import { obj as defObj } from '../gfx.js';
import { ART } from '../art.js';
import * as LV from './petlv.js';
import { bossCam, bossCamReset, bossBarBox } from './bosscam.js';
import { musicClock, musicHiccup } from '../audio.js';

const TS = 16, BEAT = 0.6, WIN = 0.17, R_IMP = 100, STAR_R = 14;
const STR = {
  vi: {
    name: 'Trống Đồng Thiên Lôi', ph1: 'Kẻ Gõ Nhịp Địa Chấn', ph2: 'Thiên Lôi Nổi Giận', enter: 'Vào Khe Nứt Magnitude', crackTag: 'Khe Nứt Magnitude',
    locked: (a, b, lv) => `Khe nứt còn khép — cần: ${a ? '✔' : '✘'} qua đèo tới M2 · ${b ? '✔' : '✘'} Rocky cấp 30 (đang ${lv})`, noRocky: 'Khe nứt chỉ mở khi có Rocky đi cùng',
    rise: 'Trống Đồng Thiên Lôi giáng từ trời — nghe nhịp!', waves: 'Nhịp Chấn! Đứng vào KHE của vòng sóng', birds: 'Đàn Chim Lạc! Tránh đường số 8', slam: 'Dùi Sấm!',
    mute: 'Câm Lặng! Rocky bị câm 6 giây', muted: 'Rocky bị CÂM — đánh mép trống ĐÚNG NHỊP ‹•› để phá', unmute: 'Phá câm! Rocky lại dùng chiêu được', muteEnd: 'Rocky hết câm',
    onBeat: n => `Đúng nhịp! (${n}/3)`, offBeat: 'Lạc nhịp — đếm lại', miss: 'TRỐNG LỠ NHỊP! LỘ 5 giây — Rocky đánh ×1,5', absorb: 'Đòn Rocky gần như không làm móp đồng — đánh mép trống đúng nhịp 3 lần để trống lỡ nhịp!',
    ult: 'TUYỆT CHIÊU — TRỐNG ĐỒNG GIÁNG THẾ!', ultHint: 'Chạy vào NGÔI SAO ở tâm!', reverse: 'Vòng hoa văn đổi chiều!', angry: 'Trống đồng nổi giận — nhịp dồn!',
    skip: 'Bỏ qua', lhName: 'Lạc Hầu Gọi Sấm', lhSub: 'Kẻ Điều Khiển Trống Đồng', burst: 'Trống đồng vỡ toang — có kẻ văng ra từ bên trong!', lhFight: 'LẠC HẦU GỌI SẤM — kẻ điều khiển trống đồng!',
    lhCall: 'Gọi sét!', lhBirds: 'Chim Lạc lửa!', lhDie: 'Lạc Hầu tan thành đàn chim Lạc…',
    exposed: 'LỘ', phase: n => `Pha ${n}/2`, won: 'TRỐNG ĐỒNG IM TIẾNG!', again: 'Trống đồng chìm vào khe nứt… (đánh lại được, thưởng giảm)', title: 'Danh hiệu: Người Giữ Nhịp',
    bar: (n, mute) => mute ? `Rocky CÂM ${mute}s — đánh mép trống khi ánh sáng tới ‹•›` : `Đánh mép trống khi ánh sáng tới ‹•› (${n}/3) → trống lỡ nhịp`, exit: '← Làng Rung Khẽ',
  },
  en: {
    name: 'Thunder Bronze Drum', ph1: 'The Quake Drummer', ph2: 'Thunder Unleashed', enter: 'Enter the Magnitude Rift', crackTag: 'Magnitude Rift',
    locked: (a, b, lv) => `The rift is sealed — needs: ${a ? '✔' : '✘'} cross the pass to M2 · ${b ? '✔' : '✘'} Rocky Lv 30 (now ${lv})`, noRocky: 'The rift only opens with Rocky at your side',
    rise: 'The Thunder Bronze Drum falls from the sky — listen to the beat!', waves: 'Quake Beat! Stand in the GAP of each wave', birds: 'Lac Bird Flock! Stay off the figure-8', slam: 'Thunder Mallet!',
    mute: 'Silence! Rocky is muted for 6 s', muted: 'Rocky is MUTED — hit the drum rim ON the beat ‹•› to break it', unmute: 'Silence broken! Rocky can use skills again', muteEnd: 'Rocky can speak again',
    onBeat: n => `On beat! (${n}/3)`, offBeat: 'Off beat — count again', miss: 'THE DRUM MISSES A BEAT! Exposed 5 s — Rocky deals ×1.5', absorb: "Rocky's blows barely dent the bronze — hit the rim on the beat 3 times to make it miss a beat!",
    ult: 'ULTIMATE — THE BRONZE DRUM DESCENDS!', ultHint: 'Run into the STAR at the centre!', reverse: 'The rings reverse!', angry: 'The drum is furious — the beat quickens!',
    skip: 'Skip', lhName: 'Thunder-Calling Lac Hau', lhSub: 'Master of the Bronze Drum', burst: 'The drum bursts open — someone is thrown out!', lhFight: 'THE THUNDER-CALLING LAC HAU — master of the drum!',
    lhCall: 'Calling lightning!', lhBirds: 'Fire Lac birds!', lhDie: 'The Lac Hau scatters into a flock of Lac birds…',
    exposed: 'EXPOSED', phase: n => `Phase ${n}/2`, won: 'THE BRONZE DRUM FALLS SILENT!', again: 'The drum sinks into the rift… (rematch any time, smaller reward)', title: 'Title: Beat Keeper',
    bar: (n, mute) => mute ? `Rocky MUTED ${mute}s — hit the rim when the light reaches ‹•›` : `Hit the rim when the light reaches ‹•› (${n}/3) → the drum misses a beat`, exit: '← Trembling Village',
  },
};
const L = ctx => STR[ctx.lang() === 'vi' ? 'vi' : 'en'];

/* vật cản sân Trống Đồng (ảnh PixelLab trong gói rift2; vẽ code chỉ dự phòng) */
const px = (g, x, y, c, w = 1, h = 1) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
defObj('td_pillar', 16, 32, 1, 1, g => { px(g, 3, 6, '#7a5220', 10, 26); px(g, 4, 8, '#b8843a', 8, 3); px(g, 4, 20, '#3a8a7a', 8, 2); });
defObj('td_stele', 16, 24, 1, 1, g => { px(g, 2, 10, '#4a4448', 12, 14); px(g, 7, 2, '#c0782a', 2, 9); });

/* ---------------- số liệu ---------------- */
const RK_MUL = 0.25, RK_EXPOSED = 1.5, SW_EXPOSED = 1.25;
const DMG = { wave: 0.08, bird: 0.06, slam: 0.09, ult: 0.1, strike: 0.08, lhSwing: 0.1, lhBolt: 0.09, lhBird: 0.06 };   /* × máu tối đa người chơi */
const CD = { waves: 9, birds: 13, mute: 21, slam: 3.6, ult: 38 };
function bossHp(ctx) {
  const h = ctx.hero, per = h ? h.atk + h.weaponBonus(h.swordTier) : 100, pt = rk(ctx), st = pt ? LV.atkOf(LV.levelFromXp(pt.xp || 0).lv) : 40;
  return Math.round(per * 160 + st * 60);
}
const sv = ctx => { const s = ctx.S.save; s.sys ||= {}; const h = (s.sys.trongdong ||= {}); h.wins ||= 0; h.tries ||= 0; return h; };
const rk = ctx => (ctx.rocky && ctx.rocky.pet && ctx.rocky.pet()) || (((ctx.S.save.sys || {}).pet || {}).pet) || null;
const rkLv = ctx => { const p = rk(ctx); return p ? LV.levelFromXp(p.xp || 0).lv : 0; };
function roadOk(ctx) { const s = ctx.S.save, r = (s.sys || {}).road || {}; return !!((r.won || {}).road2 || (r.maxZ || 0) >= 2 || (s.badges || []).includes(2)); }   /* save cũ không có cờ đèo mà đã có huy hiệu M2 → coi như đã qua */
const riftOpen = ctx => roadOk(ctx) && rkLv(ctx) >= 30;
const inTd = ctx => !!(ctx.S.zone && ctx.S.zone.id === 'rift2');
const inM2 = ctx => !!(ctx.S.zone && ctx.S.zone.id === 'm2');
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const angD = (a, b) => { let d = a - b; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d; };

/* ---------------- ảnh ---------------- */
const IM = {};
function img(src) { if (!IM[src]) { const i = new Image(); i.src = 'assets/px/' + src; IM[src] = i; } const i = IM[src]; return i.complete && i.naturalWidth ? i : null; }
const DRUM = n => img(`boss/trongdong/drum_${n}.png`), BIRD = n => img(`boss/trongdong/bird_${n}.png`);
const DSTEP = ['s32', 's48', 's64', 's96', null];   /* bậc trống nhỏ → to (ảnh PixelLab riêng từng cỡ, vẽ 1:1); null = trống thật (drum_0..7) */
const drumStep = k => DSTEP[k] ? img(`boss/trongdong/drum_${DSTEP[k]}.png`) : (DRUM(Math.floor(ST.t * 6) % 8) || DRUM(0));
const VX = n => ART.vfx && ART.vfx[n];
/* Lạc Hầu: sheet PixelLab (ảnh 2×), hàng = hướng trong lh.json (south/east/north; tây = lật đông) */
let LHM = null;
if (typeof fetch !== 'undefined') fetch('assets/px/boss/trongdong/lh.json').then(r => r.json()).then(j => { LHM = j; for (const c of Object.values(j.clips)) img(c.file); for (const k of DSTEP) if (k) img(`boss/trongdong/drum_${k}.png`); for (const k of ['s32', 's48', 's64', 's96']) img(`boss/trongdong/drum_wreck_${k}.png`); img('boss/trongdong/drum_wreck.png'); img('boss/trongdong/drum_lid.png'); }).catch(() => {});   /* nạp sẵn mọi sheet (tránh khung trống lúc đổi clip) */
const LH_FPS = { idle: 6, walk: 10, strike: 14, call: 10, raise: 10, stun: 6, fall: 9 };
const LH_LOOP = { idle: 1, walk: 1, stun: 1 };
const LH_IMPACT = 5;   /* khung dùi chạm mặt trống trong clip strike (xem sheet lh_strike) */
const LH_LEAD = () => LH_IMPACT / LH_FPS.strike;   /* bắt đầu vung trước phách bấy nhiêu giây → dùi chạm đúng phách */
function lhFrame(L) { const c = LHM && LHM.clips[L.clip]; if (!c) return 0; const f = Math.floor(L.t * LH_FPS[L.clip]); return LH_LOOP[L.clip] ? f % c.n : Math.min(c.n - 1, f); }
function drawLH(g, L, x, y) {
  if (!LHM) return false; let c = LHM.clips[L.clip] || LHM.clips.idle; if (!c) return false; let im = img(c.file); if (!im) { c = LHM.clips.idle; im = c && img(c.file); if (!im) return false; }
  const dir = c.rows.length === 1 ? c.rows[0] : (L.dir === 'west' ? 'east' : L.dir), row = Math.max(0, c.rows.indexOf(dir)), flip = L.dir === 'west' && c.rows.length > 1, f = lhFrame(L) % c.n;
  const cw = LHM.cw, ch = LHM.ch, dw = cw / 2, dh = ch / 2, X = Math.round(x), Y = Math.round(y);
  g.save(); g.imageSmoothingEnabled = false; if (L.alpha != null) g.globalAlpha = L.alpha; if (L.flash > 0) g.filter = 'brightness(2)'; else if (L.dark) g.filter = 'brightness(0.12)';
  if (flip) { g.translate(X, 0); g.scale(-1, 1); g.drawImage(im, f * cw, row * ch, cw, ch, -dw / 2, Y - dh + 1, dw, dh); }
  else g.drawImage(im, f * cw, row * ch, cw, ch, X - dw / 2, Y - dh + 1, dw, dh);
  g.restore(); return true;
}
let SIL = null;   /* bóng TĨNH của Lạc Hầu (khung đứng hướng nam tô đặc màu tối) — hiện mờ trong trống lúc LỘ */
function lhSil() {
  if (SIL) return SIL; const c = LHM && LHM.clips.idle, im = c && img(c.file); if (!im || typeof document === 'undefined') return null;
  const cv = document.createElement('canvas'); cv.width = LHM.cw; cv.height = LHM.ch; const q = cv.getContext('2d'); q.drawImage(im, 0, 0, LHM.cw, LHM.ch, 0, 0, LHM.cw, LHM.ch);
  q.globalCompositeOperation = 'source-in'; q.fillStyle = '#140a04'; q.fillRect(0, 0, cv.width, cv.height); SIL = cv; return SIL;
}
const faceOf = (dx, dy) => Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'east' : 'west') : (dy > 0 ? 'south' : 'north');
/* ảnh 2× (PixelLab) vẽ 1:1 = cỡ đích ½ */
function blit(g, im, x, y, flip = false) { const w = im.naturalWidth / 2, h = im.naturalHeight / 2; if (!flip) { g.drawImage(im, Math.round(x), Math.round(y), w, h); return; } g.save(); g.translate(Math.round(x + w), Math.round(y)); g.scale(-1, 1); g.drawImage(im, 0, 0, w, h); g.restore(); }
function drawSheet(g, s, f, x, y, alpha = 1) {
  const hi = s.img.__hi ? 1 : 2, ax = s.ax != null ? s.ax : s.w / 2, ay = s.ay != null ? s.ay : s.h;
  g.save(); g.imageSmoothingEnabled = false; g.globalAlpha = alpha; g.drawImage(s.img, f * s.w * hi, 0, s.w * hi, s.h * hi, Math.round(x - ax), Math.round(y - ay), s.w, s.h); g.restore();
}

/* ---------------- trạng thái ---------------- */
const ST = {};
function reset() { Object.assign(ST, { skillSeq: [], skillN: {}, boss: null, t: 0, beatF: 0, lastBeat: -1, cd: { waves: 3, birds: 7, mute: 10, slam: 1.2, ult: 0 }, act: null, waves: [], birds: [], strikes: [], fx: [], tele: [], mute: null, combo: 0, comboAcc: -99, ult: null, glow: [], banner: null, won: false, ultAt: [0.6, 0.25], log: [], startT: 0, stats: { onBeat: 0, offBeat: 0, misses: 0, rkRaw: 0, rkDealt: 0, hits: {}, lhHits: 0, lhSwing: [] }, absorbT: -99, angry: false,
  lh: null, lhQ: [], skyQ: [], skyLast: -1, scorch: [], flashT: -99, preB: -1, flock: [], introStep: -1, lhMo: null, burst: null, death: null, lid: null, loot: null, hbirds: [], hold: false }); }
reset();
const log = s => { ST.log.push(Math.round(ST.t * 10) / 10 + ' ' + s); if (ST.log.length > 50) ST.log.shift(); };
function fx(name, x, y, opt = {}) { const s = VX(name); if (!s) return false; const f = { s, x, y, t: opt.t0 || 0, dur: opt.dur || s.n / (s.fps || 12), top: !!opt.top, alpha: opt.alpha || 1, sky: !!opt.sky, flash: !!opt.flash, struck: (opt.t0 || 0) >= SKY_HIT }; ST.fx.push(f); return f; }

/* ---------------- sét từ trời (td_sky0..3, vfx_workbench) ---------------- */
const SKY_HIT = 0.2;   /* giây từ lúc tia dẫn xuất hiện tới tia chính chạm đất (khung 5 của 9) */
function sky(x, y, opt = {}) {
  let k = Math.floor(Math.random() * 4); if (k === ST.skyLast) k = (k + 1 + Math.floor(Math.random() * 3)) % 4; ST.skyLast = k;   /* 4 dạng, không lặp liền nhau */
  const f = fx('td_sky' + k, x, y, { sky: true, flash: !!opt.flash, t0: opt.now ? SKY_HIT : 0 });
  if (!f) fx('td_bolt', x, y);   /* dự phòng khi manifest chưa có td_sky */
  else if (opt.now) skyHit(f);
  return f;
}
function skyHit(f) {   /* tia chính chạm đất: vết sém + (nếu được phép) lóe trắng rất ngắn */
  f.struck = true; ST.scorch.push({ x: f.x, y: f.y, t: 0, life: 4 }); if (ST.scorch.length > 24) ST.scorch.shift();
  if (f.flash && ST.t - ST.flashT > 1.5 && ST.ctx) { ST.flashT = ST.t; ST.ctx.S.flash = Math.max(ST.ctx.S.flash || 0, 0.32); }   /* lóe ≈0,1 s (tắt 2,5/s), tối đa 1 lần / 1,5 s; tuyệt chiêu không lóe toàn màn — quầng sáng ở chân mỗi tia nằm sẵn trong ảnh */
}
const skyNear = (x, y) => ST.fx.some(f => f.sky && f.t < SKY_HIT + 0.05 && Math.hypot(f.x - x, f.y - y) < 14);

/* ---------------- nhịp ---------------- */
function beatTick(ctx, dt) {
  const mc = musicClock(); let nb = ST.beatF + dt / BEAT;
  if (mc && mc.id === 'rift2') { const tgt = (mc.now - mc.t0) / (mc.step * 2); if (tgt > nb - 0.3 && tgt < nb + 1.5) nb = Math.max(ST.beatF, tgt); ST.sync = true; } else ST.sync = false;   /* bám nhịp bài nhạc đang phát (không lùi) */
  ST.beatF = nb; const bi = Math.floor(nb);
  if (bi > ST.lastBeat) { ST.lastBeat = bi; onBeat(ctx, bi); }
}
const accIdx = () => Math.round(ST.beatF / 2);   /* dấu ‹•› gần nhất (mỗi 2 phách) */
const toAcc = () => { const ph = ST.beatF / 2 - Math.floor(ST.beatF / 2); return Math.min(ph, 1 - ph) * 2 * BEAT; };   /* giây tới / từ dấu gần nhất */
const nextAccIn = () => { const ph = ST.beatF / 2 - Math.floor(ST.beatF / 2); return (1 - ph) * 2 * BEAT; };
const onBeatNow = () => toAcc() <= WIN;
/* chấm nhịp theo LÚC BẤM (không phải lúc nhát kiếm chạm — clip chém có độ trễ 0,2–0,4 s): update() ghi ST.pressBF khi người chơi bắt đầu động tác chém */
const distAt = bf => { const ph = bf / 2 - Math.floor(bf / 2); return Math.min(ph, 1 - ph) * 2 * BEAT; };
const idxAt = bf => Math.round(bf / 2);

/* ---------------- sát thương ---------------- */
function hurtPlayer(ctx, frac, from, react = 'stagger', power = 1, key = '') {
  const h = ctx.hero, p = ctx.S.player; if (!h || h.fainted) return false;
  const ok = h.hit(Math.max(1, Math.round(h.max * frac * (ST.angry ? 1.15 : 1)))); if (!ok) return false;
  ST.stats.hits[key] = (ST.stats.hits[key] || 0) + 1; log('hit ' + key);
  if (frac >= 0.08) musicHiccup();   /* trúng đòn nặng → nhạc 'lỡ nhịp' */
  if (ctx.knockPlayer && react) { const d = Math.hypot(p.x - from.x, p.y - from.y) || 1; ctx.knockPlayer({ type: react, power, dir: { x: (p.x - from.x) / d, y: (p.y - from.y) / d }, src: from, bound: (x, y) => !inTd(ctx) || y < (ctx.S.map.h - 3) * TS }); }
  return true;
}
const rkPos = ctx => (ctx.rocky && ctx.rocky.pos && ctx.rocky.pos()) || null;
const rkEnt = ctx => (ctx.rocky && ctx.rocky.ent && ctx.rocky.ent()) || null;
const rkAway = ctx => { const pt = rk(ctx); return !pt || (pt.koT || 0) > 0 || !rkEnt(ctx); };
function hurtRocky(ctx, frac, from, kb = 50) {
  const pos = rkPos(ctx); if (!pos) return; const pt = rk(ctx); if (!pt || !ctx.rocky.hitBy) return;
  const d = Math.hypot(pos.x - from.x, pos.y - from.y) || 1, raw = Math.round(LV.maxHpOf(rkLv(ctx)) * frac * 1.2);
  ctx.rocky.hitBy(raw, ST.boss || ST.lhMo, (pos.x - from.x) / d, (pos.y - from.y) / d, kb);
}

/* ---------------- va chạm / kẹt ---------------- */
const solidAt = (ctx, x, y) => ctx.isSolid(ctx.S.map, Math.floor(x / TS), Math.floor(y / TS));
function nearestFree(ctx, x, y) {
  const m = ctx.S.map, reach = m._tdReach || (m._tdReach = ctx.computeReach(m, m.entries.default)), sx = Math.floor(x / TS), sy = Math.floor(y / TS);
  if (!ctx.isSolid(m, sx, sy) && reach[sy * m.w + sx]) return null;
  const seen = new Set([sx + ',' + sy]), q = [[sx, sy]];
  while (q.length) { const [cx, cy] = q.shift(); for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = cx + a, ny = cy + b, k = nx + ',' + ny; if (seen.has(k) || nx < 0 || ny < 0 || nx >= m.w || ny >= m.h) continue; seen.add(k); if (!ctx.isSolid(m, nx, ny) && reach[ny * m.w + nx]) return { x: nx * TS + 8, y: ny * TS + 12 }; q.push([nx, ny]); } }
  return null;
}
function unstick(ctx) {
  const m = ctx.S.map; if (ST.reachDirty) { m._tdReach = null; ST.reachDirty = false; }
  const p = ctx.S.player; if (!(ctx.knocked && ctx.knocked())) { const s = nearestFree(ctx, p.x, p.y); if (s) { p.x = s.x; p.y = s.y; log('unstick player'); } }
}
const interior = ctx => { const m = ctx.S.map; return { x0: 3 * TS, y0: 3 * TS, x1: (m.w - 3) * TS, y1: (m.h - 4) * TS }; };

/* ---------------- hình vẽ trùm ---------------- */
function hover(mo) { if (mo.vuln > 0) return 3; if (mo.intro > 0) return 14; return 14 + (ST.ult ? ST.ult.lift || 0 : 0) + Math.sin(ST.t * 2.1) * 2; }
/* màn mở đầu (~3,3 s, E / A bỏ qua): trống đồng giáng từ trời — lớn dần qua 4 bậc ảnh PixelLab (vẽ 1:1, không phóng) vừa rơi vừa bị sét đánh, đáp xuống lơ lửng */
const INTRO = 3.3, I_FALL = 2.5;
const ease = u => u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
function introDrum(mo) { const it = INTRO - mo.intro; if (it >= I_FALL) return null; const u0 = Math.max(0, it / I_FALL), u = ease(u0); return { k: Math.min(4, Math.floor(u0 * 5)), x: mo.x, y: mo.y - 40 - 150 * (1 - u) }; }   /* → bậc ảnh + TÂM trống */
function drawDrumAt(g, k, x, y, alpha = 1) { const im = drumStep(k); if (!im) return; const w = im.naturalWidth / 2, h = im.naturalHeight / 2; g.save(); g.imageSmoothingEnabled = false; g.globalAlpha = alpha; g.drawImage(im, Math.round(x - w / 2), Math.round(y - h / 2), w, h); g.restore(); }
function drawBoss(g, mo, x, y) {
  const fr = Math.floor(ST.t * 6) % 8, im = DRUM(fr) || DRUM(0), hv = hover(mo);
  if (mo.intro > 0) { const D = introDrum(mo); if (D) { const k = (D.k + 1) / 5; g.fillStyle = `rgba(10,6,0,${(0.12 + 0.3 * k).toFixed(2)})`; g.beginPath(); g.ellipse(Math.round(x), Math.round(y), 8 + 22 * k, (8 + 22 * k) * 0.32, 0, 0, 7); g.fill(); drawDrumAt(g, D.k, x, D.y - mo.y + y); return; } }   /* đang rơi: bóng lớn dần */
  g.save();
  const sw = 26 + Math.max(0, 10 - hv / 3); g.fillStyle = 'rgba(10,6,0,.42)'; g.beginPath(); g.ellipse(Math.round(x), Math.round(y), sw, sw * 0.32, 0, 0, 7); g.fill();   /* bóng dưới đất (to dần khi trống hạ thấp) */
  if (mo.flash > 0) g.filter = 'brightness(1.9)'; else if (mo.vuln > 0) g.filter = 'brightness(1.3) saturate(1.3)'; else if (ST.act && ST.act.k === 'mute' && ST.act.ph === 'tele') g.filter = 'brightness(0.6) saturate(0.7)'; else if (mo.pulse > 0) g.filter = 'brightness(1.4)';
  const py = mo.pulse > 0.08 ? 1 : 0;   /* trống tự gõ: mặt trống sáng + dội xuống 1 px đúng phách (chỉ lúc ra đòn) */
  if (im) blit(g, im, x - 32, y - 58 - hv + py); else { g.fillStyle = '#8a6a2a'; g.fillRect(Math.round(x - 26), Math.round(y - 50 - hv), 52, 36); }
  g.filter = 'none';
  g.restore();
}

/* ---------------- tạo trùm ---------------- */
function spawnBoss(ctx) {
  const m = ctx.S.map, b = m.tdBoss || { x: 15, y: 10 }, hp = bossHp(ctx), t = L(ctx);
  const cfg = { key: 'trongdong', vi: STR.vi.name, en: STR.en.name, hp, dmg: 10, armor: 0, sp: 30, xp: 0, w: 48, h: 44, fly: true, c: ['#5a3a12', '#b8843a', '#ffe27a'], tdBoss: true, noXpTag: true,
    aiFn: (c2, mo, dt, p, dp, canHit) => bossAi(c2, mo, dt, p, dp, canHit), drawFn: (g, mo, x, y) => drawBoss(g, mo, x, y), onDown: mo => drumDown(ctx, mo), tip: { vi: STR.vi.absorb, en: STR.en.absorb } };
  const mo = ctx.monsters.add(cfg, b.x * TS + 8, b.y * TS + 8);
  Object.assign(mo, { phase: 1, vuln: 0, angry: true, warned: true, intro: INTRO, pulse: 0 });
  ST.boss = mo; ST.startT = ST.t; log('spawn hp ' + hp);
  ctx.sfx('rumble'); ST.banner = { txt: t.rise, t: 2.4 };
  return mo;
}
function lhPlay(clip, hold = 0) { const L = ST.lh; if (!L) return; const c = LHM && LHM.clips[clip]; L.clip = clip; L.t = 0; L.busy = (c ? c.n : 7) / LH_FPS[clip] + hold; }
/* màn mở đầu (chạy trong update): mỗi lần trống đổi bậc = 1 tia sét đánh vào trống; bậc cuối lóe trắng ngắn */
function introTick(ctx, mo) {
  const D = introDrum(mo); if (!D || D.k === ST.introStep) return;
  ST.introStep = D.k; const last = D.k === 4; sky(mo.x, D.y + 8 + 6 * D.k, { now: true, flash: last }); ctx.sfx('thunder'); if (ctx.quake) ctx.quake(last ? 0.2 : 0.06); log('intro step ' + D.k);
}
function skipIntro(ctx) { const mo = ST.boss; if (!mo || !(mo.intro > 0)) return; mo.intro = 0.001; log('intro skip'); }

/* ---------------- AI (mỗi khung) ---------------- */
function bossAi(ctx, mo, dt, p, dp, canHit) {
  mo.kb = null; mo.angry = true; mo.warned = true; ST.player = p;
  if (mo.justHit) { mo.justHit = false; rimHit(ctx, mo); }
  if (mo.intro > 0) { mo.intro -= dt; if (mo.intro <= 0) { if (ST.lh) { ST.lh.mode = 'fight'; ST.lh.clip = 'idle'; ST.lh.busy = 0; } const k = mo.hp / mo.max, nh = bossHp(ctx); mo.max = nh; mo.hp = Math.max(1, Math.round(nh * k)); fx('td_cracks', mo.x, mo.y); ctx.sfx('slam'); if (ctx.quake) ctx.quake(0.35); log('landed hp ' + nh); } return; }
  if (mo.vuln > 0) { mo.vuln -= dt; if (mo.vuln <= 0) { log('vuln end'); ST.cd.slam = Math.max(ST.cd.slam, 0.6); } return; }
  for (const k in ST.cd) if (ST.cd[k] > 0) ST.cd[k] -= dt;
  if (mo.phase === 1 && mo.hp <= mo.max * 0.5) { mo.phase = 2; ST.angry = true; ST.banner = { txt: L(ctx).angry, t: 2 }; ctx.sfx('roar_big'); if (ctx.quake) ctx.quake(0.4); log('phase 2'); }
  if (!canHit || ST.hold) return;
  /* lơ lửng: trôi chậm quanh tâm sân, lệch về phía người chơi (bay — không vướng vật) */
  if (!ST.ult && !(ST.act && ST.act.k === 'mute')) {
    const c = ctx.S.map.tdCenter || { x: 248, y: 168 }, I = interior(ctx), tx = Math.max(I.x0 + 40, Math.min(I.x1 - 40, c.x + (p.x - c.x) * 0.35)), ty = Math.max(I.y0 + 50, Math.min(I.y1 - 30, c.y + (p.y - c.y) * 0.3));
    const d = Math.hypot(tx - mo.x, ty - mo.y), near = dp < 48;   /* người đang đứng sát mép trống (canh nhịp) → trống đứng yên cho dễ đánh */
    if (d > 1 && !near) { const s = Math.min(d, 18 * dt); mo.x += (tx - mo.x) / d * s; mo.y += (ty - mo.y) / d * s; }
  }
}
/* người chơi chém trúng trống (monsters.strike đặt mo.justHit) → chấm nhịp */
function rimHit(ctx, mo) {
  const t = L(ctx);
  if (mo.vuln > 0) { const extra = Math.round((ctx.monsters.lastHit && ctx.monsters.lastHit() ? ctx.monsters.lastHit().dmg : 0) * (SW_EXPOSED - 1)); if (extra > 0) mo.hp -= extra; return; }
  const bf = ST.pressBF != null && ST.beatF - ST.pressBF < 1.2 ? ST.pressBF : ST.beatF - 0.18 / BEAT, ai = idxAt(bf), dd = distAt(bf); ST.pressBF = null;
  if (ai - ST.comboAcc > 2) ST.combo = 0;   /* bỏ qua 2 dấu nhịp không đánh → đếm lại */
  const p = ctx.S.player, d = dist(mo, p) || 1, rx = mo.x + (p.x - mo.x) / d * 22, ry = mo.y + (p.y - mo.y) / d * 8 - 18;
  if (dd <= WIN && ai !== ST.comboAcc) {
    ST.combo++; ST.comboAcc = ai; ST.stats.onBeat++; fx('td_spark', rx, ry); ctx.sfx('b'); ctx.sfx('spar_bell');
    if (ST.mute) { endMute(ctx, true); }
    if (ST.combo >= 3) return missBeat(ctx, mo);
    if (ctx.pop) ctx.pop(rx, ry - 8, t.onBeat(ST.combo), '#ffe27a');
    log('on beat ' + ST.combo);
  } else if (dd <= WIN) { /* cùng 1 dấu nhịp đánh 2 lần — không tính, không phạt */ }
  else { if (ST.combo > 0 && ctx.pop) ctx.pop(rx, ry - 8, t.offBeat, '#ff9a8a'); ST.combo = 0; ST.stats.offBeat++; ctx.sfx('fail'); log('off beat ' + dd.toFixed(2)); }
}
function missBeat(ctx, mo) {
  ST.combo = 0; ST.comboAcc = -99; ST.stats.misses++; mo.vuln = 5; ST.act = null; ST.tele = ST.tele.filter(q => q.keep);
  ST.banner = { txt: L(ctx).miss, t: 2.4 }; fx('td_cracks', mo.x, mo.y); fx('td_spark', mo.x, mo.y - 20); ctx.sfx('smash'); ctx.sfx('b'); if (ctx.quake) ctx.quake(0.3); musicHiccup(); log('MISS BEAT');
}

/* ---------------- lịch đòn theo phách ---------------- */
function onBeat(ctx, bi) {
  const mo = ST.boss; if (!mo || mo.intro > 0 || ST.won || ctx.S.mode !== 'play') return;
  for (const g of ST.glow) g.done = g.done || false;
  if (ST.ult) return ultBeat(ctx, mo, bi);
  if (mo.vuln > 0) return;
  const A = ST.act;
  if (A) return actBeat(ctx, mo, A, bi);
  if (bi % 2) return;   /* đòn mới bắt đầu ở dấu nhịp (phách chẵn) */
  const p = ctx.S.player, frac = mo.hp / mo.max;
  /* 2026-10-13 anh: mỗi chiêu một hồi chiêu riêng (CD); chọn chiêu MẠNH NHẤT đã hồi xong (tuyệt chiêu > Câm Lặng > Chim Lạc > Nhịp Chấn > Dùi Sấm);
     không lặp 1 chiêu quá 2 lần liền khi còn chiêu khác dùng được */
  const ready = [
    ['ult', ST.cd.ult <= 0 && ((ST.ultAt.length && frac <= ST.ultAt[0]) || (!ST.ultAt.length && ST.t - (ST.lastUlt || 0) > CD.ult))],
    ['mute', ST.cd.mute <= 0 && !ST.mute && !rkAway(ctx) && !!rkPos(ctx)],
    ['birds', ST.cd.birds <= 0], ['waves', ST.cd.waves <= 0], ['slam', ST.cd.slam <= 0],
  ].filter(x => x[1]).map(x => x[0]);
  if (!ready.length) return;
  const q = ST.skillSeq, rep = k => q.length >= 2 && q[q.length - 1] === k && q[q.length - 2] === k;
  const k = ready.find(x => !rep(x)) || ready[0];
  q.push(k); if (q.length > 400) q.shift(); ST.skillN[k] = (ST.skillN[k] || 0) + 1;
  if (k === 'ult') { if (ST.ultAt.length && frac <= ST.ultAt[0]) ST.ultAt.shift(); return startUlt(ctx, mo); }
  if (k === 'mute') return startMute(ctx, mo, bi);
  if (k === 'birds') return startBirds(ctx, mo, p, bi);
  if (k === 'waves') return startWaves(ctx, mo, p, bi);
  return startSlam(ctx, mo, p, bi);
}
function actBeat(ctx, mo, A, bi) {
  if (A.k === 'waves') {
    if (bi >= A.b0 && A.fired < A.n) {
      const gA = A.gaps[A.fired]; A.fired++;
      ST.waves.push({ x: mo.x, y: mo.y, r: 18, a: gA, gw: A.gw, hitP: false, hitR: false, t: 0 });
      lhSync(bi); ctx.sfx('b'); ctx.sfx('pound'); if (ctx.quake) ctx.quake(0.08); glowPulse(mo.x, mo.y);
      if (A.fired < A.n) ST.tele.push({ type: 'gap', x: mo.x, y: mo.y, a: A.gaps[A.fired], gw: A.gw, t: BEAT, T0: BEAT });   /* vạch nhịp: hướng khe của vòng kế tiếp, báo trước 1 phách */
    }
    if (A.fired >= A.n && bi >= A.b0 + A.n + 1) { ST.act = null; ST.cd.waves = CD.waves * (mo.phase === 2 ? 0.8 : 1); }
    return;
  }
  if (A.k === 'slam') {
    if (bi >= A.b1 && !A.done) { A.done = true; lhSync(bi); for (const s of A.spots) bolt(ctx, s.x, s.y, 20, DMG.slam, 'slam'); }
    if (A.done && bi >= A.b1 + 1) { ST.act = null; ST.cd.slam = CD.slam * (mo.phase === 2 ? 0.75 : 1); }
    return;
  }
  if (A.k === 'mute') {
    if (A.ph === 'tele' && bi >= A.b1) {
      A.ph = 'boom'; lhSync(bi); ctx.sfx('b'); ctx.sfx('rumble'); ctx.sfx('slam'); if (ctx.quake) ctx.quake(0.35); fx('td_cracks', mo.x, mo.y);
      if (!rkAway(ctx)) { ST.mute = { t: 6 }; const e = rkEnt(ctx); if (e) fx('td_spark', e.x, e.y - 14); ctx.toast(L(ctx).muted); log('mute on');   /* thông báo nhỏ (không che thanh nhịp) — chữ hướng dẫn đã ở dưới thanh nhịp */ }
    } else if (A.ph === 'boom') { ST.act = null; ST.cd.mute = CD.mute; }
    return;
  }
  if (A.k === 'birds') { if (A.ph === 'fly' && !ST.birds.some(b => !b.gone)) { ST.act = null; ST.cd.birds = CD.birds; } return; }
}

/* Nhịp Chấn: 4 (pha 2: 5) vòng sóng, mỗi vòng 1 khe; khe xoay dần quanh trống — người phải đổi chỗ theo từng phách */
function startWaves(ctx, mo, p, bi) {
  const n = mo.phase === 2 ? 5 : 4, gw = mo.phase === 2 ? 1.05 : 1.25, dir = Math.random() < 0.5 ? 1 : -1, a0 = Math.atan2(p.y - mo.y, p.x - mo.x) + dir * 0.95, gaps = [];
  for (let i = 0; i < n; i++) gaps.push(a0 + dir * i * 0.75);
  ST.act = { k: 'waves', n, gw, gaps, fired: 0, b0: bi + 2 }; ST.banner = { txt: L(ctx).waves, t: 1.6 }; ctx.sfx('spar_charge');
  ST.tele.push({ type: 'gap', x: mo.x, y: mo.y, a: gaps[0], gw, t: 2 * BEAT, T0: 2 * BEAT }); glowPulse(mo.x, mo.y); log('waves');
  for (let i = 0; i < n; i++) ST.lhQ.push({ b: bi + 2 + i, clip: 'strike' });   /* mỗi vòng sóng = 1 nhát dùi của Lạc Hầu, chạm mặt trống đúng phách */
}
function wavesTick(ctx, dt) {
  const p = ctx.S.player, rp = rkPos(ctx), I = interior(ctx);
  for (const w of ST.waves) {
    w.t += dt; w.r += 112 * dt; if (w.r > 250) { w.done = true; continue; }
    const test = (q, kind) => { const d = Math.hypot(q.x - w.x, q.y - w.y); if (Math.abs(d - w.r) > 7) return false; const a = Math.atan2(q.y - w.y, q.x - w.x); return Math.abs(angD(a, w.a)) > w.gw / 2; };
    if (!w.hitP && test(p)) { w.hitP = true; hurtPlayer(ctx, DMG.wave, { x: w.x, y: w.y }, 'stagger', 0.7, 'wave'); }
    if (!w.hitR && rp && test(rp)) { w.hitR = true; hurtRocky(ctx, DMG.wave, { x: w.x, y: w.y }, 40); }
    void I;
  }
  ST.waves = ST.waves.filter(w => !w.done);
}

/* Đàn Chim Lạc: đường số 8 quanh chỗ người đứng (báo trước 1,3 s) rồi đàn chim lửa bay theo 1 vòng */
function startBirds(ctx, mo, p, bi) {
  const I = interior(ctx), a = 92, rot = Math.random() * Math.PI, pts = [], N = 72;
  for (let i = 0; i <= N; i++) { const u = i / N * Math.PI * 2, s = Math.sin(u), c = Math.cos(u), k = 1 + s * s, lx = a * c / k, ly = a * s * c / k * 1.25;
    const x = p.x + lx * Math.cos(rot) - ly * Math.sin(rot), y = p.y - 6 + lx * Math.sin(rot) + ly * Math.cos(rot); pts.push({ x: Math.max(I.x0, Math.min(I.x1, x)), y: Math.max(I.y0, Math.min(I.y1 + 16, y)) }); }
  ST.act = { k: 'birds', ph: 'tele', t: 1.3, pts }; ST.tele.push({ type: 'path', pts, t: 1.3, T0: 1.3 });
  ST.banner = { txt: L(ctx).birds, t: 1.5 }; ctx.sfx('warn'); log('birds'); lhPlay('call', 0.5);   /* Lạc Hầu giơ dùi gọi đàn chim */
}
function birdsTick(ctx, dt) {
  const A = ST.act, mo = ST.boss, p = ctx.S.player, rp = rkPos(ctx);
  if (A && A.k === 'birds' && A.ph === 'tele') { A.t -= dt; if (A.t <= 0) { A.ph = 'fly'; const n = mo && mo.phase === 2 ? 8 : 6; for (let i = 0; i < n; i++) ST.birds.push({ x: mo.x, y: mo.y - 40, delay: i * 0.2, st: 'out', i: 0, pts: A.pts, hitP: false, hitR: false, vx: 1, t: 0 }); ctx.sfx('whoosh_big'); lhPlay('strike'); } }
  for (const b of ST.birds) {
    if (b.gone) continue; b.t += dt; if (b.delay > 0) { b.delay -= dt; continue; }
    const sp = 140 * dt; let tgt;
    if (b.st === 'out') tgt = b.pts[0]; else if (b.st === 'loop') tgt = b.pts[b.i]; else tgt = mo ? { x: mo.x, y: mo.y - 40 } : b;
    const dx = tgt.x - b.x, dy = tgt.y - b.y, d = Math.hypot(dx, dy);
    if (d <= sp) { b.x = tgt.x; b.y = tgt.y; if (b.st === 'out') b.st = 'loop'; else if (b.st === 'loop') { b.i++; if (b.i >= b.pts.length) b.st = 'home'; } else b.gone = true; }
    else { b.x += dx / d * sp; b.y += dy / d * sp; if (Math.abs(dx) > 0.5) b.vx = dx; }
    if (b.st === 'loop') {
      if (!b.hitP && Math.hypot(p.x - b.x, p.y - 6 - b.y) < 10) { b.hitP = hurtPlayer(ctx, DMG.bird, { x: b.x - (b.vx > 0 ? 6 : -6), y: b.y + 6 }, 'stagger', 0.7, 'bird'); }
      if (!b.hitR && rp && Math.hypot(rp.x - b.x, rp.y - 6 - b.y) < 10) { b.hitR = true; hurtRocky(ctx, DMG.bird, b, 30); }
    }
  }
  ST.birds = ST.birds.filter(b => !b.gone);
}

/* Dùi Sấm: vòng báo trước ở chỗ người đứng (2 phách = 1,2 s) rồi sét giáng; pha 2 thêm 1 vòng ở chỗ người đang đi tới */
function startSlam(ctx, mo, p, bi) {
  const spots = [{ x: p.x, y: p.y }];
  const v = ST.pv || { x: 0, y: 0 }, sp = Math.hypot(v.x, v.y);
  if (mo.phase === 2 && sp > 15) { const k = Math.min(40, sp * 1.2) / sp, I = interior(ctx); spots.push({ x: Math.max(I.x0, Math.min(I.x1, p.x + v.x * k)), y: Math.max(I.y0, Math.min(I.y1 + 16, p.y + v.y * k)) }); }   /* pha 2: thêm 1 vòng ở chỗ người đang chạy tới */
  ST.act = { k: 'slam', b1: bi + 2, spots, done: false };
  for (const s of spots) ST.tele.push({ type: 'c', x: s.x, y: s.y, r: 20, t: 2 * BEAT, T0: 2 * BEAT, col: '#8fd0ff' });
  ctx.sfx('spar_charge'); log('slam');
  lhPlay('call', Math.max(0, 2 * BEAT + 0.3 - 7 / LH_FPS.call));   /* giơ dùi gọi sét suốt lúc báo trước, hạ xuống sau khi sét giáng */
  for (const s of spots) ST.skyQ.push({ b: bi + 2, x: s.x, y: s.y, flash: true });   /* tia dẫn thả trước 0,2 s */
}
function bolt(ctx, x, y, r, frac, key) {
  if (!skyNear(x, y)) sky(x, y, { now: true, flash: key === 'slam' }); ctx.sfx('thunder'); if (ctx.quake) ctx.quake(0.12);   /* sét từ trời: tia dẫn đã được thả trước 0,2 s (preTick) — đòn trúng đúng lúc tia chính chạm đất */
  const p = ctx.S.player; if (Math.hypot(p.x - x, p.y - y) < r + 4) hurtPlayer(ctx, frac, { x, y: y - 2 }, 'fly', 0.9, key);
  const rp = rkPos(ctx); if (rp && Math.hypot(rp.x - x, rp.y - y) < r + 4) hurtRocky(ctx, frac, { x, y }, 50);
  if (ctx.arenaImpact) ctx.arenaImpact(x, y, 1.3, 'land');   /* sét đánh trúng cột đồng / bệ đá → nứt rồi đổ (vật cản không nhốt ai) */
}

/* Câm Lặng (khắc chế Rocky) */
function startMute(ctx, mo, bi) { ST.act = { k: 'mute', ph: 'tele', b1: bi + 2 }; ST.lhQ.push({ b: bi + 2, clip: 'strike' }); ST.banner = { txt: L(ctx).mute, t: 1.6 }; ctx.sfx('warn'); log('mute tele'); }
function endMute(ctx, broken) { if (!ST.mute) return; ST.mute = null; const e = rkEnt(ctx); if (e) fx('td_spark', e.x, e.y - 14); ctx.toast(broken ? L(ctx).unmute : L(ctx).muteEnd, !!broken); if (broken) ctx.sfx('gate_open'); log(broken ? 'mute broken' : 'mute end'); }

/* hoa văn trống loang trên nền theo phách — CHỈ trong lúc ra chiêu */
function glowPulse(x, y) { ST.glow.push({ x, y, t: 0 }); if (ST.glow.length > 4) ST.glow.shift(); }

/* ---------------- TUYỆT CHIÊU: Trống Đồng Giáng Thế ---------------- */
function startUlt(ctx, mo) {
  const c = ctx.S.map.tdCenter || { x: mo.x, y: mo.y };
  ST.ult = { ph: 'rise', t: 0, cx: c.x, cy: c.y, lift: 0, dir: Math.random() < 0.5 ? 1 : -1, ang: new Array(12).fill(0), seg: 0, segBeats: 0, beats: 0, lit: [], alpha: 0 };
  for (let k = 0; k < 12; k++) ST.ult.lit.push(Math.random() * Math.PI * 2);
  ST.act = null; ST.lastUlt = ST.t; ST.cd.ult = 12; ST.banner = { txt: L(ctx).ult + ' ' + L(ctx).ultHint, t: 3 }; ctx.sfx('spar_roar'); if (ctx.quake) ctx.quake(0.3); log('ult');
  ST.lhQ = []; lhPlay('call', 0.6);
}
const ringR = k => STAR_R + (R_IMP - STAR_R) * (k + 1) / 12;   /* bán kính ngoài vòng k (0..11) */
function ultTick(ctx, mo, dt) {
  const U = ST.ult; U.t += dt;
  if (U.ph === 'rise') {   /* 1,4 s: trống bay lên tâm sân, mặt trống hiện mờ dưới sàn (báo trước) */
    U.lift = Math.min(46, U.lift + 50 * dt); U.alpha = Math.min(0.45, U.t * 0.4);
    const d = Math.hypot(U.cx - mo.x, U.cy - mo.y); if (d > 1) { const s = Math.min(d, 120 * dt); mo.x += (U.cx - mo.x) / d * s; mo.y += (U.cy - mo.y) / d * s; }
    if (U.t >= 1.4) { U.ph = 'slam'; U.t = 0; lhPlay('strike'); }
  } else if (U.ph === 'slam') {
    U.lift = Math.max(-6, U.lift - 300 * dt); if (U.t >= 0.25) { U.ph = 'spin'; U.t = 0; U.alpha = 1; ctx.sfx('slam'); ctx.sfx('b'); if (ctx.quake) ctx.quake(0.6); fx('td_cracks', U.cx, U.cy); ST.banner = { txt: L(ctx).ultHint, t: 2 }; log('ult slam'); }
  } else if (U.ph === 'spin') {
    U.lift = Math.min(10, U.lift + 30 * dt);
    for (let k = 0; k < 12; k++) U.ang[k] += (k % 2 ? 1 : -1) * U.dir * (0.55 + 0.04 * k) * dt;
  } else if (U.ph === 'end') { U.alpha = Math.max(0, U.alpha - dt * 1.6); U.lift = Math.max(0, U.lift - 30 * dt); if (U.alpha <= 0) { ST.ult = null; ST.cd.ult = CD.ult; mo.cd = 1; log('ult end'); } }
}
function ultBeat(ctx, mo, bi) {
  const U = ST.ult; if (U.ph !== 'spin') return;
  U.beats++; lhSync(bi); ST.lhQ.push({ b: bi + 1, clip: 'strike' });   /* Lạc Hầu gõ mỗi phách của tuyệt chiêu */
  if (U.beats > 1 && (U.beats - 1) % 3 === 0) { U.seg++; if (U.seg >= 4) { U.ph = 'end'; ST.strikes = []; return; } U.dir *= -1; ST.banner = { txt: L(ctx).reverse, t: 1 }; log('ult reverse ' + U.seg); }   /* 4 đoạn × 3 phách — đổi chiều 3 lần */
  if (U.beats === 1) { ST.strikes.push(...outerAim(ctx)); return; }   /* phách đầu: chỉ báo — sét bắt đầu từ phách sau (≥ 1 s sau khi in mặt trống) */
  /* sét đánh theo cung sáng của mọi vòng */
  const p = ctx.S.player, rp = rkPos(ctx), arcW = 1.6;
  const inLit = q => { const d = Math.hypot(q.x - U.cx, q.y - U.cy); if (d < STAR_R || d > R_IMP) return false; const k = Math.min(11, Math.max(0, Math.floor((d - STAR_R) / ((R_IMP - STAR_R) / 12)))); const a = Math.atan2(q.y - U.cy, q.x - U.cx), base = U.lit[k] + U.ang[k]; return Math.abs(angD(a, base)) < arcW / 2 || Math.abs(angD(a, base + Math.PI)) < arcW / 2; };
  if (inLit(p)) hurtPlayer(ctx, DMG.ult, { x: U.cx, y: U.cy }, 'fly', 1, 'ult');   /* 2026-10-13: tuyệt chiêu = đòn nặng → hất bay người chơi (như Rocky) */
  if (rp && inLit(rp)) hurtRocky(ctx, DMG.ult, { x: U.cx, y: U.cy }, 60);   /* lực ≥ 50 → Rocky bay (pet.js rkKnock) */
  if (ST.preB !== bi) for (const q of ultSpots(U, bi, 0)) sky(q.x, q.y, { now: true });   /* thường đã thả trước 0,2 s ở preTick (ultPre) */
  ctx.sfx('thunder'); ctx.sfx('b'); if (ctx.quake) ctx.quake(0.1); glowPulse(U.cx, U.cy);
  /* ngoài mặt trống: sét nhắm người (vòng báo 1 phách) */
  for (const s of ST.strikes) { s.b--; if (s.b <= 0) { bolt(ctx, s.x, s.y, 18, DMG.strike, 'strike'); s.done = true; } }
  ST.strikes = ST.strikes.filter(s => !s.done); ST.strikes.push(...outerAim(ctx));
}
function outerAim(ctx) {
  const U = ST.ult, out = [], p = ctx.S.player; if (!U) return out;
  if (Math.hypot(p.x - U.cx, p.y - U.cy) > R_IMP - 6) { out.push({ x: p.x, y: p.y, b: 1 }); ST.tele.push({ type: 'c', x: p.x, y: p.y, r: 18, t: BEAT, T0: BEAT, col: '#8fd0ff' }); }
  return out;
}
/* vị trí 6 tia sét của tuyệt chiêu ở phách bi; ahead = đoán trước bao nhiêu giây (vòng đang quay) */
function ultSpots(U, bi, ahead) {
  const out = [];
  for (let k = 1; k < 12; k += 2) { const rate = (k % 2 ? 1 : -1) * U.dir * (0.55 + 0.04 * k), base = U.lit[k] + U.ang[k] + rate * ahead + (bi % 2 ? Math.PI : 0), r = (ringR(k) + ringR(k - 1)) / 2; out.push({ x: U.cx + Math.cos(base) * r, y: U.cy + Math.sin(base) * r }); }
  return out;
}
/* chạy mỗi khung, TRƯỚC phách: Lạc Hầu bắt đầu vung dùi sớm LH_LEAD s (dùi chạm đúng phách); tia dẫn của sét thả sớm SKY_HIT s (tia chính chạm đúng phách) */
function preTick(ctx) {
  const now = ST.beatF;
  for (const q of ST.lhQ) if (!q.done && (q.b - now) * BEAT <= (q.clip === 'strike' ? LH_LEAD() : 0)) { q.done = true; if (!(ST.boss && ST.boss.vuln > 0)) lhPlay(q.clip, q.hold || 0); }
  ST.lhQ = ST.lhQ.filter(q => !q.done);
  for (const q of ST.skyQ) if (!q.done && (q.b - now) * BEAT <= SKY_HIT) { q.done = true; sky(q.x, q.y, { flash: q.flash }); }
  ST.skyQ = ST.skyQ.filter(q => !q.done);
  const U = ST.ult;
  if (U && U.ph === 'spin') {
    const nb = Math.floor(now) + 1, nBeats = U.beats + 1, ending = nBeats > 1 && (nBeats - 1) % 3 === 0 && U.seg + 1 >= 4;
    if (ST.preB < nb && (nb - now) * BEAT <= SKY_HIT) {
      ST.preB = nb;
      if (nBeats > 1 && !ending) for (const q of ultSpots(U, nb, (nb - now) * BEAT)) sky(q.x, q.y);
      for (const s of ST.strikes) if (s.b === 1 && !ending) sky(s.x, s.y);
    }
  }
}
/* ghi lại Lạc Hầu đang ở khung nào lúc trống phát nhịp (QA kiểm đồng bộ) */
function lhSync(bi) { const mo = ST.boss; if (mo) mo.pulse = 0.18; ST.stats.pulses = (ST.stats.pulses || 0) + 1; }   /* trống tự gõ: mặt trống sáng + dội đúng phách ra đòn */

/* ================= PHA 2: trống vỡ → LẠC HẦU GỌI SẤM văng ra ================= */
const B_SHAKE = 0.9, B_FLY = 0.7, B_LIE = 0.5, B_UP = 0.6, B_END = B_SHAKE + B_FLY + B_LIE + B_UP;   /* rung + sét → bật nắp, văng ra (vòng cung) → nằm → đứng dậy */
const WRECK = ['s32', 's48', 's64', 's96', null];
const wreckImg = k => img(WRECK[k] ? `boss/trongdong/drum_wreck_${WRECK[k]}.png` : 'boss/trongdong/drum_wreck.png');
function clampIn(ctx, x, y) { const I = interior(ctx); return { x: Math.max(I.x0 + 8, Math.min(I.x1 - 8, x)), y: Math.max(I.y0 + 10, Math.min(I.y1 + 8, y)) }; }
function drumDown(ctx, mo) {
  ST.boss = null; ST.act = null; ST.ult = null; ST.waves = []; ST.birds = []; ST.strikes = []; ST.tele = []; ST.lhQ = []; ST.skyQ = []; if (ST.mute) endMute(ctx, false);
  const p = ctx.S.player, s0 = Math.abs(mo.x - p.x) > 6 ? Math.sign(mo.x - p.x) : (Math.random() < 0.5 ? 1 : -1);   /* văng sang NGANG (phía xa người chơi), hơi xuống — luôn trong khung hình */
  let q = null; for (const sd of [s0, -s0]) { const c = clampIn(ctx, mo.x + sd * 66, mo.y + 18); if (!solidAt(ctx, c.x, c.y)) { q = c; break; } }
  if (!q) q = clampIn(ctx, mo.x + s0 * 66, mo.y + 18); const f = nearestFree(ctx, q.x, q.y); if (f) q = f;
  ST.burst = { t: 0, x: mo.x, y: mo.y, lx: q.x, ly: q.y, shook: 0 };
  ST.lh = { x: mo.x, y: mo.y - 30, z: 0, clip: 'fall', t: 0, dir: 'south', flash: 0, self: true, hidden: true };
  ST.banner = { txt: L(ctx).burst, t: 2.4 }; ctx.sfx('smash'); musicHiccup(); if (ctx.quake) ctx.quake(0.4); fx('td_cracks', mo.x, mo.y); log('drum down');
}
function burstTick(ctx, dt) {
  const B = ST.burst, Lh = ST.lh; B.t += dt; const t = B.t;
  if (t < B_SHAKE) { if (B.shook < 2 && t > [0.05, 0.5][B.shook]) { B.shook++; sky(B.x + (B.shook === 1 ? -6 : 8), B.y + 2, { now: true, flash: B.shook === 2 }); ctx.sfx('thunder'); if (ctx.quake) ctx.quake(0.15); } return; }
  if (!B.popped) { B.popped = true; Lh.hidden = false; ST.lid = { x: B.x, gy: B.y + 10, z: 50, vz: 120, vx: (B.lx > B.x ? -1 : 1) * 45, t: 0 }; fx('td_spark', B.x, B.y - 44); fx('td_cracks', B.x, B.y); ctx.sfx('smash'); ctx.sfx('whoosh_big'); if (ctx.quake) ctx.quake(0.3); log('lid pop, lh out'); }
  const tf = t - B_SHAKE;
  if (B.spawned) { if (burstWreckK(B) < 0 && !B.gone) { B.gone = true; fx('td_spark', B.x, B.y - 6); } if (t > B_SHAKE + 3) ST.burst = null; return; }   /* Lạc Hầu đã vào trận: chỉ còn vỏ trống co dần (không đụng vị trí hắn nữa) */
  if (tf < B_FLY) { const u = tf / B_FLY; Lh.x = B.x + (B.lx - B.x) * u; Lh.y = (B.y - 30) + (B.ly - (B.y - 30)) * u; Lh.z = 46 * Math.sin(Math.PI * u) + 24 * (1 - u); Lh.clip = 'fall'; Lh.t = Math.min(4, u * 5) / LH_FPS.fall; return; }   /* bay vòng cung, lộn nhào (khung ngã 0..4) */
  Lh.x = B.lx; Lh.y = B.ly; Lh.z = 0;
  if (!B.landed) { B.landed = true; fx('td_cracks', Lh.x, Lh.y); ctx.sfx('slam'); if (ctx.quake) ctx.quake(0.2); log('lh landed'); }
  const tl = tf - B_FLY;
  if (tl < B_LIE) { Lh.clip = 'fall'; Lh.t = 8.5 / LH_FPS.fall; return; }   /* nằm sóng soài (khung cuối) */
  if (tl - B_LIE < B_UP) { Lh.clip = 'fall'; Lh.t = Math.max(0, 8 * (1 - (tl - B_LIE) / B_UP)) / LH_FPS.fall; return; }   /* đứng dậy = clip ngã chạy ngược */
  if (!ST.lhMo && !ST.death && !ST.won) spawnLh(ctx); B.spawned = true;
}
function burstWreckK(B) { const tw = B.t - B_SHAKE - 0.9; return tw < 0 ? 4 : 4 - Math.floor(tw / 0.3); }   /* 4 → 0 (mỗi 0,3 s nhỏ một bậc), < 0 = biến mất */
function drawBurst(g, B, cx, cy) {
  const x = Math.round(B.x - cx), y = Math.round(B.y - cy);
  if (B.t < B_SHAKE) {   /* trống nứt, rung (chỉ trong 0,9 s) */
    const im = DRUM(Math.floor(B.t * 10) % 8) || DRUM(0), j = Math.floor(B.t * 30) % 2 ? 1 : -1, a = B.t > 0.45 ? 2 : 1; if (!im) return;
    g.save(); g.fillStyle = 'rgba(10,6,0,.42)'; g.beginPath(); g.ellipse(x, y, 30, 10, 0, 0, 7); g.fill(); if (Math.floor(B.t * 12) % 4 === 0) g.filter = 'brightness(1.6)'; blit(g, im, x - 32 + j * a, y - 72); g.restore(); return;
  }
  const k = burstWreckK(B); if (k < 0) return; const im = wreckImg(k); if (!im) return;   /* vỏ trống rỗng nằm nghiêng (ảnh hư hỏng PixelLab) */
  const w = im.naturalWidth / 2, h = im.naturalHeight / 2; g.save(); g.imageSmoothingEnabled = false; g.drawImage(im, Math.round(x - w / 2), Math.round(y + 6 - h), w, h); g.restore();
}
function lhHp(ctx) { const h = ctx.hero, per = h ? h.atk + h.weaponBonus(h.swordTier) : 100, pt = rk(ctx), st = pt ? LV.atkOf(LV.levelFromXp(pt.xp || 0).lv) : 40; return Math.round(per * 34 + st * 20); }   /* mô phỏng áp sát không né: ~20 s → chơi thật (né đòn) ~35–45 s */
function spawnLh(ctx) {
  const Lh = ST.lh, hp = lhHp(ctx), t = L(ctx);
  const cfg = { key: 'lachau', vi: STR.vi.lhName, en: STR.en.lhName, hp, dmg: 0, armor: 0, sp: 54, xp: 0, w: 16, h: 28, noXpTag: true, lhBoss: true,   /* không đặt boss: true — thanh máu đã vẽ ở drawUI (tránh thanh máu đôi của monsters) */
    c: ['#5a2a12', '#a0522d', '#ffe27a'],
    aiFn: (c2, mo, dt, p, dp, canHit) => lhAi(c2, mo, dt, p, dp, canHit), drawFn: (g, mo, x, y) => drawLhMo(g, mo, x, y), onDown: mo => lhDown(ctx, mo) };
  const mo = ctx.monsters.add(cfg, Lh.x, Lh.y);
  Object.assign(mo, { angry: true, warned: true, cd: { swing: 0.5, call: 1.4, birds: 4.5, dash: 0 }, act: null, recent: [], stuckT: 0 });
  ST.lhMo = mo; Lh.self = false; Lh.clip = 'idle'; Lh.t = 0; ST.lhStart = ST.t; ST.banner = { txt: t.lhFight, t: 2.2 }; ctx.sfx('roar_big'); log('lh spawn hp ' + hp);
}
function drawLhMo(g, mo, x, y) { const Lh = ST.lh; if (!Lh) return; Lh.flash = mo.flash || 0; g.fillStyle = 'rgba(0,0,0,.28)'; g.beginPath(); g.ellipse(Math.round(x), Math.round(y), 7, 2.5, 0, 0, 7); g.fill(); drawLH(g, Lh, x, y); }
function lhClip(clip) { const Lh = ST.lh; if (Lh.clip !== clip) { Lh.clip = clip; Lh.t = 0; } }
function lhMove(ctx, mo, dx, dy, sp, dt) {   /* đi có va chạm; kẹt quá 0,8 s → đi xuyên (không bao giờ đứng kẹt) */
  const d = Math.hypot(dx, dy) || 1, s = sp * dt, nx = mo.x + dx / d * s, ny = mo.y + dy / d * s, q = clampIn(ctx, nx, ny);
  if (mo.stuckT > 0.8 || !solidAt(ctx, q.x, q.y)) { mo.x = q.x; mo.y = q.y; if (!solidAt(ctx, q.x, q.y)) mo.stuckT = 0; }
  else if (!solidAt(ctx, q.x, mo.y)) mo.x = q.x; else if (!solidAt(ctx, mo.x, q.y)) mo.y = q.y; else mo.stuckT += dt;
  lhClip('walk'); ST.lh.dir = faceOf(dx, dy);
}
function lhAi(ctx, mo, dt, p, dp, canHit) {
  const Lh = ST.lh; if (!Lh) return; ST.player = p; mo.angry = true; mo.warned = true;
  if (mo.justHit) { mo.justHit = false; mo.recent.push(ST.t); }
  mo.recent = mo.recent.filter(t => ST.t - t < 1.6);
  for (const k in mo.cd) if (mo.cd[k] > 0) mo.cd[k] -= dt;
  Lh.x = mo.x; Lh.y = mo.y;
  if (mo.act) return lhAct(ctx, mo, mo.act, dt, p);
  if (!canHit || ST.hold) { lhClip('idle'); Lh.dir = faceOf(p.x - mo.x, p.y - mo.y); return; }
  if (mo.recent.length >= 2 && mo.cd.dash <= 0) return lhStart(ctx, mo, 'dash');
  if (dp < 30 && mo.cd.swing <= 0) return lhStart(ctx, mo, 'swing');
  if (mo.cd.call <= 0 && dp > 26) return lhStart(ctx, mo, 'call');
  if (mo.cd.birds <= 0) return lhStart(ctx, mo, 'birds');
  if (dp > 18) lhMove(ctx, mo, p.x - mo.x, p.y - mo.y, mo.c.sp * (mo.hp < mo.max * 0.5 ? 1.15 : 1), dt);   /* đuổi tới 18 px — trong tầm vung 30 px: không có vùng chết */
  else { lhClip('idle'); Lh.dir = faceOf(p.x - mo.x, p.y - mo.y); }
}
function lhStart(ctx, mo, k) {
  const p = ctx.S.player, Lh = ST.lh, rp = rkPos(ctx), t = L(ctx), mad = mo.hp < mo.max * 0.5; Lh.dir = faceOf(p.x - mo.x, p.y - mo.y);
  if (k === 'swing') { const T = mad ? 0.55 : 0.65; mo.act = { k, t: 0, T }; ST.tele.push({ type: 'c', x: mo.x, y: mo.y, r: 30, t: T, T0: T, col: '#ffb060' }); lhClip('idle'); ctx.sfx('spar_charge'); }   /* vòng báo QUANH hắn → trúng mọi phía */
  else if (k === 'call') { const spots = [{ x: p.x, y: p.y }]; if (rp && !rkAway(ctx)) spots.push({ x: rp.x, y: rp.y }); mo.act = { k, t: 0, T: 1.0, spots }; for (const s of spots) ST.tele.push({ type: 'c', x: s.x, y: s.y, r: 18, t: 1.0, T0: 1.0, col: '#8fd0ff' }); lhPlay('call', 0.5); ctx.sfx('spar_charge'); if (ctx.pop) ctx.pop(mo.x, mo.y - 34, t.lhCall, '#8fd0ff'); }
  else if (k === 'birds') { mo.act = { k, t: 0, T: 0.7 }; lhPlay('call', 0.1); ctx.sfx('warn'); if (ctx.pop) ctx.pop(mo.x, mo.y - 34, t.lhBirds, '#ffb040'); }
  else if (k === 'dash') { const d = dist(mo, p) || 1, s = Math.random() < 0.5 ? 1 : -1; let best = null;   /* lướt ngang / lùi 54 px tới chỗ trống */
    for (const [ax, ay] of [[-(p.y - mo.y) / d * s, (p.x - mo.x) / d * s], [(p.y - mo.y) / d * s, -(p.x - mo.x) / d * s], [(mo.x - p.x) / d, (mo.y - p.y) / d]]) { const q = clampIn(ctx, mo.x + ax * 54, mo.y + ay * 54); if (!solidAt(ctx, q.x, q.y) && !solidAt(ctx, (q.x + mo.x) / 2, (q.y + mo.y) / 2)) { best = q; break; } }
    if (!best) { mo.cd.dash = 1; return; } mo.act = { k, t: 0, T: 0.28, x0: mo.x, y0: mo.y, x1: best.x, y1: best.y }; mo.recent = []; ctx.sfx('whoosh_big'); }
  log('lh ' + k);
}
function lhAct(ctx, mo, A, dt, p) {
  const Lh = ST.lh, mad = mo.hp < mo.max * 0.5; A.t += dt;
  if (A.k === 'swing') {
    Lh.dir = faceOf(p.x - mo.x, p.y - mo.y);
    if (!A.sw && A.t >= A.T - LH_LEAD()) { A.sw = true; lhPlay('strike'); }   /* dùi chạm đất đúng lúc vòng báo đầy */
    if (!A.hit && A.t >= A.T) { A.hit = true; ctx.sfx('smash'); fx('td_spark', mo.x + (p.x - mo.x) * 0.3, mo.y - 8); if (ctx.quake) ctx.quake(0.1);
      if (dist(mo, p) < 32) hurtPlayer(ctx, DMG.lhSwing, { x: mo.x, y: mo.y }, 'fly', 0.9, 'lh_swing');   /* 2026-10-13: đòn mạnh hất người bay như Rocky (Rocky cũng bay ở lực 50) */
      const rp = rkPos(ctx); if (rp && dist(mo, rp) < 32) hurtRocky(ctx, DMG.lhSwing, mo, 50); }
    if (A.t >= A.T + 0.35) { mo.act = null; mo.cd.swing = mad ? 1.2 : 1.6; }
    return;
  }
  if (A.k === 'call') {
    if (!A.pre && A.t >= A.T - SKY_HIT) { A.pre = true; A.spots.forEach((s, i) => sky(s.x, s.y, { flash: i === 0 })); }
    if (!A.hit && A.t >= A.T) { A.hit = true; for (const s of A.spots) bolt(ctx, s.x, s.y, 18, DMG.lhBolt, 'lh_bolt'); }
    if (A.t >= A.T + 0.3) { mo.act = null; mo.cd.call = mad ? 3.4 : 4.2; }
    return;
  }
  if (A.k === 'birds') {
    if (!A.out && A.t >= 0.4) { A.out = true; ctx.sfx('whoosh_big'); const n = mad ? 3 : 2;
      for (let i = 0; i < n + 1; i++) { const a = -Math.PI / 2 + (i - n / 2) * 0.7; ST.hbirds.push({ x: mo.x, y: mo.y - 20, vx: Math.cos(a) * 60, vy: Math.sin(a) * 60, t: 0, life: 3.2, rk: i === n && !!rkPos(ctx) }); } }
    if (A.t >= A.T) { mo.act = null; mo.cd.birds = mad ? 7 : 9; }
    return;
  }
  if (A.k === 'dash') { const u = Math.min(1, A.t / A.T); mo.x = A.x0 + (A.x1 - A.x0) * u; mo.y = A.y0 + (A.y1 - A.y0) * u; lhClip('walk'); Lh.dir = faceOf(A.x1 - A.x0, A.y1 - A.y0); if (u >= 1) { mo.act = null; mo.cd.dash = 3.5; } return; }
}
/* chim Lạc lửa đuổi theo (rẽ tối đa 2,6 rad/s → chạy vòng là né được) */
function hbirdsTick(ctx, dt) {
  const p = ctx.S.player, rp = rkPos(ctx);
  for (const b of ST.hbirds) {
    b.t += dt; if (b.t > b.life) { b.gone = true; continue; }
    const tg = b.rk && rp ? rp : p, dx = tg.x - b.x, dy = tg.y - 8 - b.y, want = Math.atan2(dy, dx), cur = Math.atan2(b.vy, b.vx), da = Math.max(-2.6 * dt, Math.min(2.6 * dt, angD(want, cur))), sp = 82;
    b.vx = Math.cos(cur + da) * sp; b.vy = Math.sin(cur + da) * sp; b.x += b.vx * dt; b.y += b.vy * dt;
    if (b.t > 0.3 && Math.hypot(p.x - b.x, p.y - 8 - b.y) < 9) { b.gone = true; fx('td_spark', b.x, b.y); hurtPlayer(ctx, DMG.lhBird, { x: b.x - b.vx * 0.1, y: b.y }, 'stagger', 0.6, 'lh_bird'); }
    else if (b.t > 0.3 && rp && Math.hypot(rp.x - b.x, rp.y - 8 - b.y) < 9) { b.gone = true; fx('td_spark', b.x, b.y); hurtRocky(ctx, DMG.lhBird, b, 30); }
  }
  ST.hbirds = ST.hbirds.filter(b => !b.gone);
}
/* Lạc Hầu hết máu: quỵ xuống → tan thành đàn chim Lạc; trống nhỏ rơi xuống đất (cảnh) → thắng */
function lhDown(ctx, mo) {
  const Lh = ST.lh; ST.lhMo = null; ST.hbirds = []; ST.tele = []; ST.death = { t: 0, x: mo.x, y: mo.y };
  if (Lh) { Lh.self = true; Lh.hidden = false; Lh.x = mo.x; Lh.y = mo.y; Lh.z = 0; Lh.clip = 'fall'; Lh.t = 0; Lh.dir = 'south'; Lh.flash = 0; }
  ST.banner = { txt: L(ctx).lhDie, t: 2.4 }; ctx.sfx('fail'); if (ctx.quake) ctx.quake(0.2); log('lh fall');
}
function deathTick(ctx, dt) {
  const D = ST.death, Lh = ST.lh; D.t += dt;
  if (D.t >= 1.0 && !D.poof) { D.poof = true; if (Lh) Lh.hidden = true; fx('td_poof', D.x, D.y - 12, { top: true }); ctx.sfx('whoosh_big'); log('lh birds');
    for (let i = 0; i < 7; i++) { const a = -Math.PI / 2 + (i - 3) * 0.32 + (Math.random() - 0.5) * 0.15, v = 55 + Math.random() * 30; ST.flock.push({ x: D.x + (i - 3) * 2, y: D.y - 14, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: Math.random() * 0.3 }); }
    ST.loot = { x: D.x + 4, y: D.y + 2, z: 20, vz: 0 }; onWin(ctx, { x: D.x, y: D.y }); }
  if (D.t > 3.6) { ST.death = null; ST.flock = []; log('outro end'); }
}
function propsTick(dt) {
  const O = ST.lid; if (O) { O.t += dt; O.x += O.vx * dt; O.z += O.vz * dt; O.vz -= 300 * dt; if (O.z <= 0) { O.z = 0; O.vz = O.bounced ? 0 : -O.vz * 0.3; O.bounced = true; O.vx *= 0.5; } if (O.t > 3.5) ST.lid = null; }
  const T = ST.loot; if (T) { T.vz -= 260 * dt; T.z += T.vz * dt; if (T.z <= 0) { T.z = 0; T.vz = T.bounced ? 0 : -T.vz * 0.35; T.bounced = true; } }
}

function drawImprint(g, U, cx, cy) {
  const im = img('boss/trongdong/imprint.png'); if (!im || U.alpha <= 0) return;
  const x = Math.round(U.cx - cx), y = Math.round(U.cy - cy), W = im.naturalWidth / 2;
  g.save(); g.imageSmoothingEnabled = false; g.globalAlpha = U.alpha;
  if (U.ph === 'rise') { g.drawImage(im, x - W / 2, y - W / 2, W, W); g.restore(); return; }
  for (let k = 11; k >= -1; k--) {   /* mỗi vòng hoa văn xoay riêng (cắt hình khuyên của ảnh PixelLab), vòng lẻ / chẵn ngược chiều nhau */
    const r1 = k < 0 ? STAR_R : ringR(k), r0 = k <= 0 ? 0 : ringR(k - 1);
    g.save(); g.beginPath(); g.arc(x, y, r1, 0, 7); if (r0 > 0) g.arc(x, y, r0, 0, 7, true); g.clip();
    g.translate(x, y); if (k >= 0) g.rotate(U.ang[k]); g.drawImage(im, -W / 2, -W / 2, W, W); g.restore();
  }
  if (U.ph === 'spin') {   /* cung sáng (nơi sét đánh) — sáng lên bằng chính hoa văn, chỉ trong tuyệt chiêu */
    g.globalCompositeOperation = 'lighter';
    for (let k = 0; k < 12; k++) for (const off of [0, Math.PI]) {
      const base = U.lit[k] + U.ang[k] + off; g.save(); g.beginPath(); g.arc(x, y, ringR(k), base - 0.8, base + 0.8); g.arc(x, y, k ? ringR(k - 1) : STAR_R, base + 0.8, base - 0.8, true); g.closePath(); g.clip();
      g.globalAlpha = 0.5; g.translate(x, y); g.rotate(U.ang[k]); g.drawImage(im, -W / 2, -W / 2, W, W); g.globalAlpha = 0.16; g.fillStyle = '#ffe9a0'; g.fillRect(-W / 2, -W / 2, W, W); g.restore();   /* cung sáng: hoa văn sáng lên + ánh vàng nhạt (đều màu, dễ đọc chỗ nguy hiểm) */
    }
    g.globalCompositeOperation = 'source-over';
    g.globalAlpha = 0.5 + 0.2 * Math.sin(ST.t * 6); g.strokeStyle = '#fff6c8'; g.lineWidth = 1; g.beginPath(); g.arc(x, y, STAR_R, 0, 7); g.stroke();   /* viền ngôi sao an toàn */
  }
  g.restore();
}

/* ---------------- thắng ---------------- */
function onWin(ctx, mo) {
  const h = sv(ctx), first = h.wins === 0, t = L(ctx), secs = Math.round(ST.t - ST.startT);
  h.wins++; h.best = h.best ? Math.min(h.best, secs) : secs; ST.won = true; ST.boss = null; ST.act = null; ST.ult = null; ST.waves = []; ST.birds = []; ST.strikes = []; ST.tele = []; if (ST.mute) endMute(ctx, false);
  fx('td_spark', mo.x, mo.y - 24); if (ctx.quake) ctx.quake(0.3); ctx.sfx('boss_win');
  ST.banner = { txt: t.won, t: 3.5 };
  const xp = first ? 1100 : 260; if (ctx.hero) ctx.hero.gainXp(xp); if (ctx.onMonsterDown) { try { ctx.onMonsterDown(mo, first ? 700 : 180); } catch (e) { /* bỏ qua */ } }
  ctx.give('stone', first ? 300 : 70, mo.x, mo.y); ctx.give('soul', first ? 3 : 1, mo.x + 8, mo.y);
  const r = ((ctx.S.save.sys ||= {}).road ||= {}); r.balls ||= []; const miss = [1, 2, 3, 4, 5, 6, 7].filter(n => !r.balls.includes(n));
  if (miss.length && (first || Math.random() < 0.2)) { const n = miss[(Math.random() * miss.length) | 0]; r.balls.push(n); ctx.give('dball' + n, 1, mo.x - 10, mo.y, { beam: true }); setTimeout(() => ctx.toast(ctx.lang() === 'vi' ? `🐉 NGỌC RỒNG ${n} SAO rơi ra!` : `🐉 The ${n}-STAR DRAGON BALL dropped!`, true), 1800); }
  if (first) { if (ctx.hrBook && ctx.hrBook.add) ctx.hrBook.add(1); h.book = 1; if (ctx.achieve) ctx.achieve('trongdong'); setTimeout(() => ctx.toast(t.title, true), 3200); setTimeout(() => { if (ctx.hrBook) ctx.hrBook.open(); }, 4200);   /* sau cảnh chim Lạc bay đi */ }
  else setTimeout(() => ctx.toast(t.again, true), 2400);
  ctx.persist(); log('WIN ' + secs + 's first ' + first);
}

/* ---------------- hệ thống ---------------- */
export const trongdong = {
  id: 'trongdong', always: true,   /* khe nứt ở 'm2'; trận ở 'rift2' */
  onZoneEnter(ctx) {
    if (inM2(ctx)) { const o = ctx.S.map.objects.find(q => q.rift === 'rift2'); if (o) o.type = riftOpen(ctx) ? 'rift_crack' : 'rift_crack_off'; }
    if (!inTd(ctx)) { reset(); return; }
    reset(); const h = sv(ctx); h.tries++; ctx.persist(); ST.reachDirty = true;
    ctx.rkMute = () => inTd(ctx) && !!ST.mute;
    const prevWait = ctx.petWait; ctx.petWait = () => (inTd(ctx) && ST.ult && ST.ult.ph !== 'end') ? { x: ST.ult.cx, y: ST.ult.cy + 4 } : (prevWait ? prevWait() : null);   /* tuyệt chiêu: Rocky chạy vào ngôi sao */
    const prevHush = ctx.petHush; ctx.petHush = () => (inTd(ctx) && !!(ST.boss || ST.lhMo)) || (prevHush ? prevHush() : false);
    const M = ctx.monsters, dmg0 = M.damage;
    M.damage = (mo, d, src, ...rest) => {
      if (mo && mo.c && mo.c.tdBoss && inTd(ctx)) {
        const fromRk = src && src === rkEnt(ctx), mul = fromRk ? (mo.vuln > 0 ? RK_EXPOSED : RK_MUL) : 1, dd = Math.max(1, Math.round(d * mul));
        if (mo.intro > 0) return false;   /* màn mở đầu: trống chưa vào trận */
        if (fromRk) { ST.stats.rkRaw += d; ST.stats.rkDealt += dd; if (mo.vuln <= 0 && ST.t - ST.absorbT > 7) { ST.absorbT = ST.t; ctx.toast(L(ctx).absorb); } }
        rest[1] = 0;   /* trống không bị đánh văng (kbPow = 0) */
        return dmg0(mo, dd, src, ...rest);
      }
      return dmg0(mo, d, src, ...rest);
    };
    const prevFaint = ctx.faintTravel; ctx.faintTravel = () => { if (inTd(ctx)) return ctx.travel('m2', 'rift'); return prevFaint ? prevFaint() : false; };
    spawnBoss(ctx);
    if (typeof window !== 'undefined') window.__td = hooks(ctx);
  },
  onZoneLeave(ctx) { if (inTd(ctx)) { bossCamReset(ctx); ST.boss = null; ST.lhMo = null; ST.burst = null; ST.death = null; ST.mute = null; ST.ult = null; ST.act = null; ST.hbirds = []; } },
  update(dt, ctx) {
    if (typeof window !== 'undefined' && inM2(ctx)) window.__td = hooks(ctx);
    if (!inTd(ctx)) return; ST.t += dt; ST.ctx = ctx;
    if (ctx.S.mode !== 'play') return;
    const b = ST.boss; if (b && !ctx.monsters.list().includes(b)) ST.boss = null; if (ST.lhMo && !ctx.monsters.list().includes(ST.lhMo)) ST.lhMo = null;
    if (ST.lhMo && ST.lhMo.kb && !ST.lhMo.kb.td) { ST.lhMo.kb.vx *= 0.35; ST.lhMo.kb.vy *= 0.35; ST.lhMo.kb.td = 1; }   /* trúng đòn chỉ lùi nửa bước (không văng xa khỏi tầm) */
    if (ST.boss && ST.boss.kb) ST.boss.kb = null;   /* nhát kiếm (monsters.strike) không đẩy trống đi */
    { const p = ctx.S.player, q = ST.pPrev; if (q && dt > 0) ST.pv = { x: (p.x - q.x) / dt * 0.2 + (ST.pv ? ST.pv.x * 0.8 : 0), y: (p.y - q.y) / dt * 0.2 + (ST.pv ? ST.pv.y * 0.8 : 0) }; ST.pPrev = { x: p.x, y: p.y }; }   /* vận tốc người chơi (làm mượt) */
    beatTick(ctx, dt); preTick(ctx);
    if (ST.boss) { if (ST.boss.intro > 0) introTick(ctx, ST.boss); if (ST.boss.pulse > 0) ST.boss.pulse -= dt; }
    if (ST.lh) { ST.lh.t += dt; }
    if (ST.burst) burstTick(ctx, dt); if (ST.death) deathTick(ctx, dt); propsTick(dt); hbirdsTick(ctx, dt);
    for (const s of ST.scorch) s.t += dt; ST.scorch = ST.scorch.filter(s => s.t < s.life);
    for (const b of ST.flock) { b.t += dt; b.x += b.vx * dt; b.y += b.vy * dt; b.vy -= 10 * dt; }
    { const a = ctx.S.player.action; if (a && (a.name === 'attack' || a.name === 'chop') && a !== ST.lastAct) { ST.lastAct = a; ST.pressBF = ST.beatF - (a.t || 0) / BEAT; } if (!a) ST.lastAct = null; }   /* lúc bấm chém */
    for (const f of ST.fx) { f.t += dt; if (f.sky && !f.struck && f.t >= SKY_HIT) skyHit(f); } ST.fx = ST.fx.filter(f => f.t < f.dur);
    for (const t of ST.tele) t.t -= dt; ST.tele = ST.tele.filter(t => t.t > 0);
    for (const g of ST.glow) g.t += dt; ST.glow = ST.glow.filter(g => g.t < 0.9);
    if (ST.banner) { ST.banner.t -= dt; if (ST.banner.t <= 0) ST.banner = null; }
    if (ST.mute) { ST.mute.t -= dt; if (ST.mute.t <= 0 || rkAway(ctx)) endMute(ctx, false); }
    if (ST.boss && ST.ult) ultTick(ctx, ST.boss, dt);
    wavesTick(ctx, dt); birdsTick(ctx, dt);
    unstick(ctx);
    const bb = ST.boss || ST.lhMo || ST.burst || ST.death;
    if (ST.boss && ST.boss.intro > 0) { const p = ctx.S.player, k = Math.min(1, dt * 4), S = ctx.S; S.camDX = (S.camDX || 0) + (ST.boss.x - p.x - (S.camDX || 0)) * k; S.camDY = (S.camDY || 0) + (ST.boss.y - 40 - (p.y - 8) - (S.camDY || 0)) * k; }   /* màn mở đầu: camera nhìn thẳng trống đang giáng xuống (người chơi chưa bị đánh) */
    else bossCam(ctx, bb ? { x: bb.x, y: bb.y } : null, dt, { h: 60, top: Math.max(40, (ST.uiTopL || 60) * 0.85) });   /* lề trên = hết thanh máu + thanh nhịp */
  },
  near(ctx) {
    const p = ctx.S.player, t = L(ctx);
    if (inM2(ctx)) {
      const o = ctx.S.map.objects.find(q => q.rift === 'rift2'); if (!o) return null; const x = o.x * TS + 16, y = o.y * TS + 10;
      if (Math.hypot(p.x - x, p.y - y) > 48) return null;
      const ok = riftOpen(ctx); return { label: ok ? t.enter : t.locked(roadOk(ctx), rkLv(ctx) >= 30, rkLv(ctx)), x, y, limit: 48, priority: 5, data: { rift2: true, ok } };
    }
    if (inTd(ctx) && ST.boss && ST.boss.intro > 0 && INTRO - ST.boss.intro > 0.25) return { label: t.skip, x: p.x, y: p.y - 20, limit: 999, priority: 9, mouse: false, data: { tdSkip: true } };   /* màn mở đầu: E / A = bỏ qua */
    return null;
  },
  interact(ctx, cand) {
    const d = cand && cand.data; if (d && d.tdSkip) { skipIntro(ctx); return; }
    if (!d || !d.rift2) return;
    if (!rk(ctx)) { ctx.toast(L(ctx).noRocky); return; }
    if (!d.ok) { ctx.toast(L(ctx).locked(roadOk(ctx), rkLv(ctx) >= 30, rkLv(ctx)), true); ctx.sfx('fail'); return; }
    ctx.sfx('whirl'); ctx.travel('rift2', 'default');
  },
  drawGround(g, ctx, cx, cy) {
    if (!inTd(ctx)) return;
    if (ST.ult) drawImprint(g, ST.ult, cx, cy);
    { const sc = VX('td_scorch'); if (sc) for (const q of ST.scorch) drawSheet(g, sc, 0, q.x - cx, q.y - cy, Math.min(0.85, (q.life - q.t) / 1.5)); }   /* vết sém sét trên sàn, mờ dần */
    const im = img('boss/trongdong/imprint.png');
    if (im && !ST.ult) for (const q of ST.glow) {   /* hoa văn loang ra theo phách (chỉ khi đang ra chiêu): hình tròn mở dần, mờ dần */
      const k = q.t / 0.9, R = 30 + 70 * Math.min(1, k * 1.6), W = im.naturalWidth / 2, x = Math.round(q.x - cx), y = Math.round(q.y - cy);
      g.save(); g.globalAlpha = 0.32 * (1 - k); g.beginPath(); g.arc(x, y, R, 0, 7); g.clip(); g.imageSmoothingEnabled = false; g.drawImage(im, x - W / 2, y - W / 2, W, W); g.restore();
    }
    for (const t of ST.tele) {   /* báo trước trên mặt đất: sáng dần tới lúc ra đòn (không nhấp nháy lặp) */
      const k = 1 - t.t / t.T0; g.save();
      if (t.type === 'c') { g.strokeStyle = t.col || '#ffd45e'; g.globalAlpha = 0.4 + 0.5 * k; g.lineWidth = 1; g.beginPath(); g.arc(Math.round(t.x - cx), Math.round(t.y - cy), t.r, 0, 7); g.stroke(); g.globalAlpha = 0.12 + 0.28 * k; g.fillStyle = t.col || '#ffd45e'; g.beginPath(); g.arc(Math.round(t.x - cx), Math.round(t.y - cy), t.r * k, 0, 7); g.fill(); }
      else if (t.type === 'gap') {   /* vạch nhịp: 2 tia vàng chỉ hai mép khe của vòng sóng sắp tới */
        g.globalAlpha = 0.35 + 0.5 * k; g.strokeStyle = '#ffe27a'; g.lineWidth = 2; const x = Math.round(t.x - cx), y = Math.round(t.y - cy);
        for (const s of [-1, 1]) { const a = t.a + s * t.gw / 2; g.beginPath(); g.moveTo(x + Math.cos(a) * 24, y + Math.sin(a) * 24); g.lineTo(x + Math.cos(a) * 150, y + Math.sin(a) * 150); g.stroke(); }
        g.globalAlpha = 0.1 + 0.15 * k; g.fillStyle = '#ffe27a'; g.beginPath(); g.moveTo(x, y); g.arc(x, y, 150, t.a - t.gw / 2, t.a + t.gw / 2); g.closePath(); g.fill();
      } else if (t.type === 'path') {   /* đường số 8: chấm vàng hiện dần */
        const n = t.pts.length, upto = Math.floor(n * Math.min(1, k * 1.8)); g.fillStyle = '#ffb040';
        for (let i = 0; i < upto; i += 2) { const q = t.pts[i]; g.globalAlpha = 0.45 + 0.45 * k; g.fillRect(Math.round(q.x - cx) - 1, Math.round(q.y - cy) + 5, 2, 2); }
      }
      g.restore();
    }
    /* vòng sóng địa chấn: bụi vàng (VFX PixelLab td_wave) xếp dọc vòng, chừa KHE */
    const wv = VX('td_wave');
    for (const w of ST.waves) {
      const n = Math.max(10, Math.floor(w.r * 2 * Math.PI / 12)), fr = wv ? Math.min(wv.n - 1, 2 + Math.floor(w.t * 6) % 3) : 0, al = Math.min(1, (250 - w.r) / 50);
      for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; if (Math.abs(angD(a, w.a)) < w.gw / 2) continue; const x = w.x + Math.cos(a) * w.r - cx, y = w.y + Math.sin(a) * w.r - cy;
        if (x < -20 || y < -20 || x > ctx.VW + 20 || y > ctx.VH + 20) continue; if (wv) drawSheet(g, wv, fr, x, y + 4, al); else { g.fillStyle = '#e8b84a'; g.fillRect(Math.round(x) - 2, Math.round(y) - 2, 4, 4); } }
    }
  },
  drawables(ctx, cx, cy) {
    if (!inTd(ctx)) return []; const out = [], g = ctx.g;
    for (const f of ST.fx) out.push({ y: f.top ? 1e9 : f.y + 6, f: () => { const fr = Math.min(f.s.n - 1, Math.floor(f.t * (f.s.fps || 12))); drawSheet(g, f.s, fr, f.x - cx, f.y - cy, f.alpha);
      if (f.sky && f.t >= SKY_HIT && f.t < SKY_HIT + 0.35) { g.save(); g.globalCompositeOperation = 'lighter'; drawSheet(g, f.s, fr, f.x - cx, f.y - cy, 0.45); g.restore(); }   /* tia chính CHÓI: cộng sáng thêm 1 lớp (chỉ lúc tia chính sáng) */
    } });
    for (const b of ST.birds) { if (b.delay > 0) continue; out.push({ y: b.y + 30, f: () => { const im = BIRD(Math.floor(b.t * 10) % 4); if (im) blit(g, im, b.x - cx - 12, b.y - cy - 12, b.vx < 0); else { g.fillStyle = '#ff7a20'; g.fillRect(Math.round(b.x - cx) - 4, Math.round(b.y - cy) - 2, 8, 4); } } }); }
    const Lh = ST.lh;
    if (Lh && Lh.self && !Lh.hidden) out.push({ y: Lh.y, f: () => {   /* Lạc Hầu lúc văng ra / lúc chết (ngoài 2 lúc đó do monsters vẽ qua drawFn) */
      const k = Math.max(0.3, 1 - (Lh.z || 0) / 60); g.fillStyle = `rgba(0,0,0,${(0.28 * k).toFixed(2)})`; g.beginPath(); g.ellipse(Math.round(Lh.x - cx), Math.round(Lh.y - cy), 7 * k, 2.5 * k, 0, 0, 7); g.fill();
      drawLH(g, Lh, Lh.x - cx, Lh.y - cy - (Lh.z || 0));
    } });
    if (ST.boss && ST.boss.vuln > 0) { const mo = ST.boss, sc = lhSil(); ST.sil = !!sc; if (sc) out.push({ y: mo.y + 0.5, f: () => { g.save(); g.globalAlpha = 0.7; g.drawImage(sc, 0, 0, sc.width, sc.height, Math.round(mo.x - cx - sc.width / 4), Math.round(mo.y - cy - 13 - sc.height / 2 + 1), sc.width / 2, sc.height / 2); g.restore(); } }); }   /* trống LỘ: bóng TĨNH của kẻ ngồi bên trong (gợi ý pha 2) */
    if (ST.burst) { const B = ST.burst; out.push({ y: B.y, f: () => drawBurst(g, B, cx, cy) }); }
    if (ST.lid) { const O = ST.lid, im = img('boss/trongdong/drum_lid.png'); if (im) out.push({ y: O.gy, f: () => { g.save(); g.globalAlpha = Math.max(0, Math.min(1, (3.5 - O.t) / 0.8)); blit(g, im, O.x - cx - im.naturalWidth / 4, O.gy - cy - O.z - im.naturalHeight / 4); g.restore(); } }); }   /* nắp trống bật ra */
    if (ST.loot) { const T = ST.loot, im = img('boss/trongdong/drum_s32.png'); if (im) out.push({ y: T.y, f: () => blit(g, im, T.x - cx - im.naturalWidth / 4, T.y - cy - im.naturalHeight / 2 + 2 - T.z) }); }   /* trống đồng nhỏ rơi lại (chiến lợi phẩm — cảnh) */
    for (const b of ST.hbirds) out.push({ y: b.y + 30, f: () => { const im = BIRD(Math.floor(b.t * 10) % 4); g.save(); g.globalAlpha = Math.min(1, (b.life - b.t) / 0.4); if (im) blit(g, im, b.x - cx - 12, b.y - cy - 12, b.vx < 0); g.restore(); } });
    for (const b of ST.flock) { const a = Math.max(0, Math.min(1, (2.4 - b.t) / 0.6)); if (a <= 0) continue; out.push({ y: 1e9, f: () => { const im = BIRD(Math.floor(b.t * 10) % 4); if (!im) return; g.save(); g.globalAlpha = a; blit(g, im, b.x - cx - 12, b.y - cy - 12, b.vx < 0); g.restore(); } }); }   /* Lạc Hầu tan thành đàn chim Lạc (ảnh chim PixelLab) */
    if (ST.mute) { const e = rkEnt(ctx); if (e) out.push({ y: e.y + 0.7, f: () => { const im = img('ui/trongdong/mute.png'), pt = rk(ctx), h = pt && pt.superT > 0 ? 34 : 24; if (im) blit(g, im, e.x - cx - 8, e.y - cy - h - 14); } }); }   /* icon TĨNH trên đầu Rocky */
    return out;
  },
  drawUI(ug, ctx, cx, cy, scale) {
    if (!inTd(ctx) || ctx.S.mode !== 'play') return; const W = ug.canvas.width, H = ug.canvas.height, t = L(ctx), b = ST.boss || ST.lhMo, isLh = !!b && b === ST.lhMo;
    const font = px2 => `${Math.round(px2)}px VT323, monospace`;
    let yb = 60;
    if (b) {   /* thanh máu (khung đồng PixelLab) */
      const fr = img('ui/trongdong/bossbar.png'), narrow = W < 560, low = H < 460, bw0 = narrow ? W * 0.92 : Math.min(low ? W * 0.44 : W * 0.9, 430, Math.max(300, W * 0.4)), BB = bossBarBox(ug, bw0, bw0 * 64 / 400 + 26), bw = BB.w, bh = bw * 64 / 400, bx = BB.x, by = BB.y, tcx = BB.cx;   /* 2026-10-13: tránh nút HUD */
      const ix = bx + bw * 58 / 400, iy = by + bh * 20 / 64, iw = bw * (382 - 58) / 400, ih = bh * 24 / 64, k = Math.max(0, b.hp / b.max);
      ug.save(); ug.imageSmoothingEnabled = false; if (fr) ug.drawImage(fr, bx, by, bw, bh); else { ug.fillStyle = '#0a0602'; ug.fillRect(ix, iy, iw, ih); }   /* khung có lòng tối đặc → vẽ khung trước, máu đè lên lòng */
      const gr = ug.createLinearGradient(0, iy, 0, iy + ih); gr.addColorStop(0, b.vuln > 0 ? '#fff6c8' : '#ffd45e'); gr.addColorStop(1, b.vuln > 0 ? '#e0a020' : '#a8641e'); ug.fillStyle = gr; ug.fillRect(ix, iy, iw * k, ih);
      ug.fillStyle = 'rgba(255,255,255,.18)'; ug.fillRect(ix, iy, iw * k, Math.max(1, ih * 0.22));
      if (!isLh && b.phase === 1) { ug.fillStyle = 'rgba(255,255,255,.55)'; ug.fillRect(Math.round(ix + iw * 0.5), iy, Math.max(1, scale * 0.4), ih); }
      const fs = Math.max(14, bh * 0.36); ug.font = font(fs); ug.textAlign = 'center'; ug.textBaseline = 'top';
      const nm = isLh ? (narrow ? `${t.lhName} · ${t.phase(2)}` : `${t.lhName} · ${t.lhSub} · ${t.phase(2)}`) : narrow ? `${t.name} · ${t.phase(1)}${b.vuln > 0 ? ' · ' + t.exposed : ''}` : `${t.name} · ${b.phase === 2 ? t.ph2 : t.ph1} · ${t.phase(1)}${b.vuln > 0 ? ' · ' + t.exposed : ''}`;   /* pha 1 = trống, pha 2 = Lạc Hầu */   /* điện thoại dọc: tên ngắn cho khỏi tràn */
      ug.fillStyle = '#000'; ug.fillText(nm, tcx + 1, by + bh + 1, bw); ug.fillStyle = b.vuln > 0 ? '#fff6c8' : '#ffe27a'; ug.fillText(nm, tcx, by + bh, bw);
      yb = by + bh + fs + 6;
      if (isLh) { ST.uiTop = yb; ST.uiTopL = yb / Math.max(1, scale); ug.restore(); }
      else {
      /* thanh nhịp (khung PixelLab): ánh sáng chạy từ phải vào dấu ‹•› giữa thanh; tới dấu đúng lúc = đúng nhịp */
      const fb = img('ui/trongdong/beatbar.png'), ob = img('ui/trongdong/beat_orb.png'), rw = Math.min(bw * 0.9, 300), rh = rw * 48 / 256, rx = Math.round(tcx - rw / 2), ry = Math.round(yb);
      const tx0 = rx + rw * 12 / 256, tx1 = rx + rw * 244 / 256, tm = (tx0 + tx1) / 2, ty = ry + rh / 2, span = 3 * 2 * BEAT, half = tx1 - tm;
      ug.fillStyle = 'rgba(10,6,2,.85)'; ug.fillRect(tx0, ry + rh * 9 / 48, tx1 - tx0, rh * 31 / 48);
      if (onBeatNow() && !(b.vuln > 0)) { ug.fillStyle = 'rgba(255,226,122,.35)'; ug.fillRect(tm - rh * 0.6, ry + rh * 9 / 48, rh * 1.2, rh * 31 / 48); }
      if (ob && !(b.vuln > 0)) { const os = rh * 0.62, ph = ST.beatF / 2 - Math.floor(ST.beatF / 2), past = ph * 2 * BEAT;
        for (let i = 0; i < 4; i++) { const tt = (i === 0 ? -past : (1 - ph) * 2 * BEAT + (i - 1) * 2 * BEAT); if (tt < -WIN * 1.5 || tt > span) continue; const ox = tm + tt / span * half; if (ox < tx0 || ox > tx1) continue; ug.globalAlpha = tt < 0 ? 0.4 : 1; ug.drawImage(ob, Math.round(ox - os / 2), Math.round(ty - os / 2), Math.round(os), Math.round(os)); ug.globalAlpha = 1; } }
      if (fb) ug.drawImage(fb, rx, ry, rw, rh);
      const fs2 = Math.max(13, rh * 0.42); ug.font = font(fs2); ug.textBaseline = 'top'; const tip = b.vuln > 0 ? t.miss : t.bar(ST.combo, ST.mute ? Math.ceil(ST.mute.t) : 0);
      ug.fillStyle = '#000'; ug.fillText(tip, tcx + 1, ry + rh + 1, bw); ug.fillStyle = ST.mute ? '#ffb0b0' : '#f0e0b0'; ug.fillText(tip, tcx, ry + rh, bw);
      yb = ry + rh + fs2 + 4; ST.uiTop = yb; ST.uiTopL = yb / Math.max(1, scale);
      ug.restore();
      }
    }
    if (ST.banner) {
      const a = Math.min(1, ST.banner.t * 2), fs = Math.max(20, Math.min(W / 18, scale * 8.5)); ug.save(); ug.globalAlpha = a; ug.font = font(fs); ug.textAlign = 'center'; ug.textBaseline = 'middle';
      const y = Math.max(H * 0.24, yb + fs * 0.8); const tw = Math.min(W - 10, ug.measureText(ST.banner.txt).width + 24); ug.fillStyle = 'rgba(18,10,2,.68)'; ug.fillRect((W - tw) / 2, y - fs * 0.6, tw, fs * 1.2);
      ug.fillStyle = '#000'; ug.fillText(ST.banner.txt, W / 2 + 2, y + 2, W - 16); ug.fillStyle = '#ffe9a8'; ug.fillText(ST.banner.txt, W / 2, y, W - 16); ug.restore();
    }
  },
};

/* móc test (QA) */
function hooks(ctx) {
  const stop = () => { const b = ST.boss; if (b) { b.intro = 0; } ST.act = null; };
  return {
    skills: () => ({ seq: ST.skillSeq.slice(), n: { ...ST.skillN }, cd: { ...ST.cd } }),
    st: () => { const b = ST.boss, lm = ST.lhMo; return { phase: ST.won ? 'won' : ST.death ? 'death' : lm ? 'lh' : ST.burst ? 'burst' : b ? 'drum' : '-', lhb: lm ? { x: Math.round(lm.x), y: Math.round(lm.y), hp: Math.round(lm.hp), max: lm.max, act: lm.act && lm.act.k } : null, burstT: ST.burst && +ST.burst.t.toFixed(2), loot: !!ST.loot, hbirds: ST.hbirds.length, sil: ST.sil, uiTopL: ST.uiTopL, inTd: inTd(ctx), open: riftOpen(ctx), road: roadOk(ctx), rkLv: rkLv(ctx), boss: b ? { x: Math.round(b.x), y: Math.round(b.y), hp: Math.round(b.hp), max: b.max, phase: b.phase, vuln: +(b.vuln || 0).toFixed(2), intro: b.intro > 0 } : null,
      act: ST.act && { k: ST.act.k, ph: ST.act.ph || null }, waves: ST.waves.length, birds: ST.birds.length, mute: ST.mute && +ST.mute.t.toFixed(2), combo: ST.combo, ult: ST.ult && { ph: ST.ult.ph, seg: ST.ult.seg, beats: ST.ult.beats, dir: ST.ult.dir },
      beat: +ST.beatF.toFixed(2), sync: !!ST.sync, toAcc: +toAcc().toFixed(3), nextAcc: +nextAccIn().toFixed(3), cd: { ...ST.cd }, won: ST.won, stats: JSON.parse(JSON.stringify(ST.stats)), save: { ...sv(ctx) }, log: ST.log.slice(-18), t: +ST.t.toFixed(1), tele: ST.tele.map(q => q.type),
      lh: ST.lh && { x: Math.round(ST.lh.x), y: Math.round(ST.lh.y), z: Math.round(ST.lh.z || 0), clip: ST.lh.clip, dir: ST.lh.dir, hidden: !!ST.lh.hidden, self: !!ST.lh.self, f: lhFrame(ST.lh) }, sky: ST.fx.filter(f => f.sky).length, scorch: ST.scorch.length, flock: ST.flock.length, lhMeta: !!LHM }; },
    hold: v => { const b = ST.boss; if (b) b.intro = 0; ST.hold = !!v; ST.act = null; if (v) ST.cd = { waves: 999, birds: 999, mute: 999, slam: 999, ult: 999 }; },   /* đứng yên: không trôi, không ra đòn tự động */
    free: () => { const b = ST.boss; if (b) b.intro = 0; ST.hold = false; ST.cd = { waves: 999, birds: 999, mute: 999, slam: 999, ult: 999 }; ST.ultAt = []; ST.lastUlt = 1e9; },
    cd: o => Object.assign(ST.cd, o), noUlt: () => { ST.ultAt = []; ST.lastUlt = 1e9; },
    place: (x, y) => { const b = ST.boss; if (b) { b.x = x; b.y = y; } },
    waves: () => { stop(); startWaves(ctx, ST.boss, ctx.S.player, ST.lastBeat); },
    birds: () => { stop(); startBirds(ctx, ST.boss, ctx.S.player, ST.lastBeat); },
    slam: () => { stop(); startSlam(ctx, ST.boss, ctx.S.player, ST.lastBeat); },
    mute: () => { stop(); startMute(ctx, ST.boss, ST.lastBeat); },
    ult: () => { stop(); startUlt(ctx, ST.boss); },
    gaps: () => ST.waves.map(w => ({ a: +w.a.toFixed(3), gw: w.gw, r: Math.round(w.r), x: Math.round(w.x), y: Math.round(w.y) })),
    pending: () => ST.act && ST.act.k === 'waves' ? { gaps: ST.act.gaps.map(a => +a.toFixed(3)), fired: ST.act.fired, gw: ST.act.gw } : null,
    path: () => ST.act && ST.act.pts ? ST.act.pts.filter((q, i) => i % 6 === 0).map(q => ({ x: Math.round(q.x), y: Math.round(q.y) })) : null,
    ultInfo: () => ST.ult && { cx: ST.ult.cx, cy: ST.ult.cy, R: R_IMP, star: STAR_R, ph: ST.ult.ph },
    setHp: f => { const b = ST.boss || ST.lhMo; if (b) b.hp = Math.max(1, Math.round(b.max * f)); },
    kill: () => { const b = ST.boss || ST.lhMo; if (b) ctx.monsters.kill(b); },   /* trống → pha 2; Lạc Hầu → thắng */
    skip: () => skipIntro(ctx), silInfo: () => { const c = lhSil(); if (!c) return null; const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i]) n++; return { w: c.width, h: c.height, n }; },
    lhDo: k => { const m = ST.lhMo; if (m) { m.act = null; lhStart(ctx, m, k); } }, lhPlace: (x, y) => { const m = ST.lhMo; if (m) { m.x = x; m.y = y; m.act = null; } }, lhCd: o => { const m = ST.lhMo; if (m) Object.assign(m.cd, o); }, lhBoss: () => ST.lhMo,
    expose: () => { const b = ST.boss; if (b) missBeat(ctx, b); },
  };
}
