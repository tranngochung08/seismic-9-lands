// hacrocky.js — plan-30 TRÙM 1: HẮC ROCKY "Kẻ Song Sinh Hư Vô" (Vết Nứt Magnitude).
//  · Khe nứt PixelLab (zones/arena/obj/rift_crack_t8.png, td8 hướng nam) ở vách Bắc Sàn Đấu Ngầm. Mở khi: thắng đèo Làng→M1 (save.sys.road.won.road1,
//    hoặc save cũ đã có huy hiệu / maxZ ≥ 1) + Rocky ≥ cấp 30. Chưa đủ → khe mờ (rift_crack_off) + nhãn điều kiện (rê chuột / đứng gần).
//  · Vào khe → vùng 'rift1' (world.js buildRift1): hang tối tím, vách nứt như Sàn Đấu Ngầm (arena.js), cột pha lê / cột lục giác phá được, lối ra hang Nam LUÔN mở.
//  · Trùm = 1 quái trong ctx.monsters (c.aiFn / drawFn / onDown) để kiếm người chơi + Rocky đánh được như mọi quái. Ảnh: gói village creatures hrsup_* (pha 1, dáng Siêu Cấp tối —
//    2026-10-13 em chốt) và hrsup2_* (pha 2: cùng dáng, PixelLab edit mắt đỏ rực + khăn khói dài; thiếu clip → hrsup_*); hrbig_* để dự phòng — PixelLab edit_image đổi màu toàn bộ clip Rocky (đen-tím, mắt trắng, khăn rách tím như khói), vẽ 1:1.
//  · 2026-10-13 (anh): vào trận ở DÁNG THƯỜNG hrbig_* (+ idle/stun PixelLab animate_image); biến Siêu Cấp CÓ THỜI HẠN như Rocky (SUP: 11 s / pha 2 14 s,
//    hồi 16 s / 12 s, màn gồng hrsup_transform_s 1,1 s), hết giờ tụt về hrbig + khói + hụt hơi 1,5 s (LỘ). Hắc-ha Cong, giằng co, phân thân chỉ khi Siêu Cấp.
//    Nhanh nhẹn: SPD 75/95 px/s (trước 50), lướt áp sát (làn báo 0,35–0,42 s + vệt mờ), đấm liên hoàn 2–3 cú khi Siêu Cấp, lách khi bị chém.
//  · Chiêu: Hắc-ha Cong (đường cong vòng qua vật, báo trước 1 s bằng chấm tím, rồi đuổi theo có giới hạn góc quay) · Siêu Cấp Hư Vô (pha 2: 3 bản thể,
//    bản thật bóng đậm; trúng bản giả → mưa mảnh tím) · Xích Tình Bạn (độ thân < 20: Rocky đổi phe 5 s; ≥ 20: Rocky bị trói chậm 3 s; chém xích 3 nhát
//    hoặc cho Rocky ăn để giải) · TUYỆT CHIÊU Ha Đối Xứng (giằng co: đứng sau Rocky bấm E / Space / A liên tục) · đấm thường + đấm hất.
//  · Khắc chế Rocky: đòn Rocky vào Hắc Rocky chỉ còn 20 % (Hắc Rocky 'nuốt' chiêu của chính mình) — trừ lúc Hắc Rocky LỘ (thắng giằng co / đứt xích /
//    đánh trúng bản thật) thì Rocky gây 150 %. Kiếm người chơi luôn đủ.
//  · VFX PixelLab vfx_workbench (hr_orb, hr_shards, hr_clash, hr_boom, hr_morph — tools/px-hrvfx.py) chỉ bật lúc ra chiêu. Thanh máu khung PixelLab ui/hacrocky/bossbar.png.
//  · Thưởng: thắng lần đầu → sách Rocky bậc 8 (chọn 1 chiêu đang bậc 7 — petlv TIER_MAX 8, quầy Heathcliff vẫn tối đa 7), Ngọc Rồng ngẫu nhiên,
//    thành tựu 'hacrocky' (danh hiệu), XP + đá; đánh lại: thưởng giảm. Lưu save.sys.hacrocky = { wins, book8, tries, best }.
import { obj as defObj } from '../gfx.js';
import { ART } from '../art.js';
import * as LV from './petlv.js';
import { bossCam, bossCamReset, bossBarBox } from './bosscam.js';
import { beamKey, sheet as bSheet, drawAt as bDraw, frameAt as bFrame } from './beamfx.js';   /* 2026-10-13: luồng Rocky-ha / Hắc-ha mới (vfx_workbench PixelLab) */

const TS = 16;
const STR = {
  vi: {
    name: 'Hắc Rocky', ph1: 'Kẻ Song Sinh Hư Vô', ph2: 'Siêu Cấp Hư Vô', enter: 'Vào Khe Nứt Magnitude', crackTag: 'Khe Nứt Magnitude',
    locked: (a, b, lv) => `Khe nứt còn khép — cần: ${a ? '✔' : '✘'} thắng đèo Làng → M1 · ${b ? '✔' : '✘'} Rocky cấp 30 (đang ${lv})`,
    noRocky: 'Khe nứt chỉ mở khi có Rocky đi cùng', rise: 'Hắc Rocky trồi lên từ đáy hang!', curve: 'Hắc-ha Cong!', chain: 'Xích Tình Bạn!',
    turned: 'Rocky bị kéo sang phe địch! Chém xích 3 nhát hoặc cho Rocky ăn', bound: 'Rocky bị xích trói — đi chậm 3 giây', freed: 'Đứt xích! Hắc Rocky choáng — Rocky đánh được!', fedFree: 'Rocky tỉnh lại nhờ được cho ăn!',
    cut: n => `Chém xích (${n}/3)`, feed: 'Cho Rocky ăn (tỉnh lại)', ult: 'TUYỆT CHIÊU — HẮC-HA CỰC ĐẠI!', hha: 'Hắc-ha!', reflex: 'Rocky-ha bắn trả! (E)', rkBack: 'Rocky bắn trả!', hrBack: 'Hắc Rocky bắn trả!', clashGo: 'HAI LUỒNG ĐÂM NHAU — GIẰNG CO!', mash: 'Bấm E / Space / A liên tục để đẩy!',
    mashLbl: 'Đẩy luồng! (bấm liên tục)', win: 'Quả cầu nổ ngược về Hắc Rocky!', lose: 'Bị luồng Hắc-ha đè bẹp!', clones: 'Siêu Cấp Hư Vô — 3 bản thể! Bản thật có bóng đậm hơn',
    real: 'Trúng bản thật! Hắc Rocky lộ diện', morph: 'Hắc Rocky biến hình — Siêu Cấp Hư Vô!', absorb: 'Hắc Rocky nuốt đòn của Rocky — giải chiêu để Rocky đánh được!',
    aimYou: 'Hắc Rocky nhắm vào BẠN!', aimRk: 'Hắc Rocky quay sang đánh Rocky',
    supOn: 'Hắc Rocky hóa SIÊU CẤP!', supOff: 'Hết Siêu Cấp — Hắc Rocky hụt hơi! Đánh ngay!', supLbl: 'Siêu Cấp', supLbl2: 'Siêu Cấp Hư Vô',
    exposed: 'LỘ', phase: n => `Pha ${n}/2`, won: 'HẮC ROCKY BỊ HẠ!', again: 'Hắc Rocky tan vào khe nứt… (đánh lại được, thưởng giảm)',
    book: 'Sách Rocky bậc 8', bookPick: 'Chọn chiêu nâng lên bậc 8 (chỉ chiêu đang bậc 7):', bookKeep: 'Giữ sách, dùng sau (túi đồ)', bookNone: 'Chưa có chiêu nào bậc 7 — sách nằm trong túi đồ, dùng sau.',
    bookDone: (s) => `${s} đạt bậc 8!`, title: 'Danh hiệu: Kẻ Thắng Bóng Mình', exit: '← Sàn Đấu Ngầm',
    sign: 'Khe Nứt · Hắc Rocky.\nĐòn của Rocky vào Hắc Rocky gần như vô dụng — trừ lúc nó LỘ (thắng giằng co, chém đứt xích, đánh trúng bản thật).\nĐộ thân Rocky ≥ 20 thì Xích Tình Bạn không kéo được Rocky sang phe địch.\nHang Nam → Sàn Đấu Ngầm',
  },
  en: {
    name: 'Shadow Rocky', ph1: 'The Void Twin', ph2: 'Void Super Form', enter: 'Enter the Magnitude Rift', crackTag: 'Magnitude Rift',
    locked: (a, b, lv) => `The rift is sealed — needs: ${a ? '✔' : '✘'} win the Village → M1 pass · ${b ? '✔' : '✘'} Rocky Lv 30 (now ${lv})`,
    noRocky: 'The rift only opens with Rocky at your side', rise: 'Shadow Rocky rises from the cave floor!', curve: 'Curving Shadow-ha!', chain: 'Chain of Friendship!',
    turned: 'Rocky is pulled to the enemy side! Cut the chain 3 times or feed Rocky', bound: 'Rocky is chained — slowed for 3 s', freed: 'Chain broken! Shadow Rocky is stunned — Rocky can hurt it!', fedFree: 'Rocky snaps out of it after a snack!',
    cut: n => `Cut the chain (${n}/3)`, feed: 'Feed Rocky (snap out of it)', ult: 'ULTIMATE — MAX SHADOW-HA!', hha: 'Shadow-ha!', reflex: 'Rocky-ha, fire back! (E)', rkBack: 'Rocky fires back!', hrBack: 'Shadow Rocky fires back!', clashGo: 'THE BEAMS COLLIDE — STRUGGLE!', mash: 'Mash E / Space / A to push!',
    mashLbl: 'Push the beam! (mash)', win: 'The orb blows back into Shadow Rocky!', lose: 'Crushed by the Shadow-ha!', clones: 'Void Super Form — 3 copies! The real one casts a darker shadow',
    real: 'You hit the real one! Shadow Rocky is exposed', morph: 'Shadow Rocky transforms — Void Super Form!', absorb: "Shadow Rocky swallows Rocky's attacks — break its tricks so Rocky can hurt it!",
    aimYou: 'Shadow Rocky is targeting YOU!', aimRk: 'Shadow Rocky turns on Rocky',
    supOn: 'Shadow Rocky goes SUPER!', supOff: 'Super form fades — Shadow Rocky is winded! Strike now!', supLbl: 'Super', supLbl2: 'Void Super',
    exposed: 'EXPOSED', phase: n => `Phase ${n}/2`, won: 'SHADOW ROCKY DEFEATED!', again: 'Shadow Rocky melts into the rift… (rematch any time, smaller reward)',
    book: 'Rocky Book tier 8', bookPick: 'Pick a skill to raise to tier 8 (only skills at tier 7):', bookKeep: 'Keep the book for later (bag)', bookNone: 'No skill at tier 7 yet — the book waits in your bag.',
    bookDone: (s) => `${s} reached tier 8!`, title: 'Title: Shadow Twin Slayer', exit: '← Underground Ring',
    sign: "The Rift · Shadow Rocky.\nRocky's attacks barely hurt Shadow Rocky — except while it is EXPOSED (win the beam struggle, cut the chain, hit the real copy).\nWith bond ≥ 20 the Chain of Friendship cannot turn Rocky against you.\nSouth cave → Underground Ring",
  },
};
const L = ctx => STR[ctx.lang() === 'vi' ? 'vi' : 'en'];

/* vật khe nứt: chân 2×1 ô, ảnh 32×32 logic (PixelLab 64×64). Bản vẽ code chỉ dự phòng. */
const px = (g, x, y, c, w = 1, h = 1) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
defObj('rift_crack', 32, 32, 2, 1, g => { px(g, 6, 6, '#2a2430', 20, 26); px(g, 14, 8, '#b040ff', 3, 22); px(g, 15, 10, '#f0d0ff', 1, 16); });
defObj('rift_crack_off', 32, 32, 2, 1, g => { px(g, 6, 6, '#2a2430', 20, 26); px(g, 14, 8, '#4a3a58', 3, 22); });

/* ---------------- số liệu ---------------- */
const FOODS = ['berry', 'egg', 'meat', 'mushroom', 'honey'];
const RK_MUL = 0.2, RK_EXPOSED = 1.5;   /* đòn Rocky vào trùm: thường 20 % · lúc LỘ 150 % */
const DMG = { hha: 0.1, hhaUlt: 0.2, jab: 0.07, heavy: 0.12, curve: 0.12, dash: 0.1, shard: 0.05, ultLose: 0.25, rocky: 0.05, slam: 0.08 };   /* × máu tối đa người chơi */
const CD = { curve: 8, chain: 22, clones: 18, ult: 34, hha: [6.5, 5], heavy: [3.5, 2.5] };   /* hồi chiêu RIÊNG từng chiêu · hha/heavy: [dáng thường, Siêu Cấp] */   /* hha: Hắc-ha thẳng [dáng thường, Siêu Cấp] */
/* 2026-10-13 anh: vào trận ở DÁNG THƯỜNG (hrbig), Siêu Cấp có thời hạn như Rocky; trùm nhanh nhẹn hơn hẳn.
   Tốc độ (px/s) [pha 1, pha 2] — trước: 50 / 62 mọi dáng. Thường ≈1,5× · Siêu Cấp ≈1,9× (pha 2 chặn trần 105 để người chơi 84 px/s còn chạy né được). */
const SPD = { big: [75, 85], sup: [95, 105] };
const SUP = { dur: [11, 14], cd: [16, 12], wind: 1.5, cast: 1.1, first: 5 };   /* giữ Siêu Cấp (s) · hồi chiêu biến hình tính từ lúc hết · hụt hơi · màn biến hình · lần biến đầu sau khi vào trận */
const BIG_MUL = 0.75;   /* dáng thường: đòn yếu hơn */
/* 2026-10-13 anh: trận là Rocky đối đầu bản sao hắc ám — chọn mục tiêu theo THÙ HẬN. Rocky là đối thủ chính (thù nền AG.rk);
   người chơi chém trúng / chém đứt xích / đứng sát lâu → thù người chơi tăng; vượt Rocky → nhắm người chơi ≥ AG.hold s rồi thù giảm dần, quay lại Rocky.
   Đổi mục tiêu cách nhau ≥ AG.gap s. Đứng yên lâu với Rocky thì thỉnh thoảng cũng quay sang người chơi (≈30 % thời gian). */
const AG = { rk: 10, hit: 5.5, cut: 14, near: 3, decay: 2.5, back: 6, hold: 4, gap: 3, restless: [9, 13], burst: 12 };
const RK_TAKE = 0.8;   /* đòn trùm vào Rocky: × (Rocky cấp 30 trụ ~40–60 s khi người chơi không giúp) */
const isSup = mo => !!mo && mo.form !== 'big';
const spd = mo => SPD[isSup(mo) ? 'sup' : 'big'][mo.phase === 2 ? 1 : 0];
function bossHp(ctx) {
  const h = ctx.hero, per = h ? h.atk + h.weaponBonus(h.swordTier) : 100, pt = rk(ctx), st = pt ? LV.atkOf(LV.levelFromXp(pt.xp || 0).lv) : 40;
  return Math.round(per * 150 + st * 60);   /* ≈ 150 nhát kiếm: người cấp 30–50 + Rocky 35–50 mất ~2–3 phút (mô phỏng không né ~75 s) */
}
const sv = ctx => { const s = ctx.S.save; s.sys ||= {}; const h = (s.sys.hacrocky ||= {}); h.wins ||= 0; if (h.book8 > 0) { const inv = (s.inv ||= {}); inv.rkbook8 = (inv.rkbook8 || 0) + h.book8; } delete h.book8; h.tries ||= 0; return h; };   /* 2026-10-13 anh: sách bậc 8 là VẬT PHẨM 'rkbook8' trong túi — save cũ book8 > 0 chuyển vào túi */
const bk8 = ctx => ((ctx.S.save || {}).inv || {}).rkbook8 || 0;
const rk = ctx => (ctx.rocky && ctx.rocky.pet && ctx.rocky.pet()) || (((ctx.S.save.sys || {}).pet || {}).pet) || null;
const rkLv = ctx => { const p = rk(ctx); return p ? LV.levelFromXp(p.xp || 0).lv : 0; };
function roadOk(ctx) { const s = ctx.S.save, r = (s.sys || {}).road || {}; return !!((r.won || {}).road1 || (r.maxZ || 0) >= 1 || (s.badges || []).length); }   /* save cũ không có cờ đèo mà đã có huy hiệu → coi như đã qua */
const riftOpen = ctx => roadOk(ctx) && rkLv(ctx) >= 30;
const inRift = ctx => !!(ctx.S.zone && ctx.S.zone.id === 'rift1');
const inArena = ctx => !!(ctx.S.zone && ctx.S.zone.id === 'arena');
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

/* ---------------- ảnh ---------------- */
const IM = {};
function img(src) { if (!IM[src]) { const i = new Image(); i.src = 'assets/px/' + src; IM[src] = i; } const i = IM[src]; return i.complete && i.naturalWidth ? i : null; }
const cre = name => { const vp = ART.packs && ART.packs.village, c = vp && vp.creatures && vp.creatures[name]; return c && c.length ? c : null; };
const VX = n => ART.vfx && ART.vfx[n];
let PURPLE_HA = null;   /* luồng Hắc-ha khi giằng co = sheet rk_ha_t7 (PixelLab) đổi màu sang tím 1 lần (canvas nguồn 2× vẽ 4 tham số — không qua shim __hi) */
function purpleHa() {
  if (PURPLE_HA) return PURPLE_HA; const s = VX('rk_ha_t7'); if (!s || !s.img) return null;
  const c = document.createElement('canvas'); c.width = s.img.width; c.height = s.img.height; const g = c.getContext('2d');
  g.filter = 'grayscale(1) sepia(1) hue-rotate(230deg) saturate(3.2) brightness(0.8)'; g.drawImage(s.img, 0, 0, s.img.width, s.img.height); c.__hi = s.img.__hi;
  PURPLE_HA = { ...s, img: c }; return PURPLE_HA;
}

/* ---------------- trạng thái ---------------- */
const ST = { boss: null, clones: [], fx: [], shots: [], tele: [], rains: [], chain: null, clash: null, petSpot: null, cine: null, neg: 0, banner: null, t: 0, cd: {}, absorbT: -99, won: false, introT: 0, ultAt: [0.7, 0.35], stats: { rkRaw: 0, rkDealt: 0, sword: 0 }, startT: 0, log: [] };
function reset() { Object.assign(ST, { boss: null, clones: [], fx: [], shots: [], tele: [], rains: [], trail: [], chain: null, clash: null, petSpot: null, cine: null, neg: 0, banner: null, t: 0, cd: { curve: 2, chain: 12, clones: 6, ult: 0, sup: SUP.first, dash: 2.5, dodge: 1, hha: 3, heavy: 1.5 }, skillSeq: [], skillN: {}, swingRef: null, lastUse: {}, actRef: null, actAge: 0, actMax: {}, lastHitSeen: null, supN: 0, tgt: 'r', tgtT: 0, agP: 0, nearT: 0, restT: 11, tgtLog: { r: 0, p: 0 }, absorbT: -99, won: false, introT: 0, ultAt: [0.7, 0.35], stats: { rkRaw: 0, rkDealt: 0, sword: 0 }, startT: 0, log: [] }); }
reset();
const log = s => { ST.log.push(Math.round(ST.t * 10) / 10 + ' ' + s); if (ST.log.length > 40) ST.log.shift(); };

/* VFX của trùm: điểm neo riêng (manifest ax/ay) + xoay được */
function fx(name, x, y, opt = {}) { const s = VX(name); if (!s) return false; ST.fx.push({ s, x, y, t: 0, ang: opt.ang || 0, dur: opt.dur || (s.loop ? 1.5 : s.n / (s.fps || 12)), top: !!opt.top, follow: opt.follow || null, alpha: opt.alpha || (name === 'hr_morph' ? 0.75 : 1) }); return true; }
function drawSheet(g, s, f, x, y, ang = 0, alpha = 1) {
  const hi = s.img.__hi ? 1 : 2, ax = s.ax != null ? s.ax : s.w / 2, ay = s.ay != null ? s.ay : s.h;
  g.save(); g.imageSmoothingEnabled = false; g.globalAlpha = alpha; g.translate(Math.round(x), Math.round(y)); if (ang) g.rotate(ang);
  g.drawImage(s.img, f * s.w * hi, 0, s.w * hi, s.h * hi, -Math.round(ax), -Math.round(ay), s.w, s.h); g.restore();
}

/* ---------------- di chuyển / va chạm ---------------- */
const solidAt = (ctx, x, y) => ctx.isSolid(ctx.S.map, Math.floor(x / TS), Math.floor(y / TS));
const free = (ctx, x, y, r = 4) => !solidAt(ctx, x - r, y) && !solidAt(ctx, x + r, y) && !solidAt(ctx, x, y - 2) && !solidAt(ctx, x, y + 1);
function objAhead(ctx, x, y) {   /* vật phá được ngay trước mặt (cột pha lê / cột lục giác) */
  const tx = Math.floor(x / TS), ty = Math.floor(y / TS);
  return ctx.S.map.objects.find(o => !o.ruined && (o.type === 'crystal_p' || o.type === 'hexpillar' || o.type === 'crystal_b') && o.x === tx && o.y === ty) || null;
}
function moveMo(ctx, mo, tx, ty, sp, dt) {
  const dx = tx - mo.x, dy = ty - mo.y, d = Math.hypot(dx, dy); if (d < 1) return true;
  const s = Math.min(d, sp * dt), vx = dx / d * s, vy = dy / d * s; let moved = false;
  if (free(ctx, mo.x + vx, mo.y)) { mo.x += vx; moved = true; } if (free(ctx, mo.x, mo.y + vy)) { mo.y += vy; moved = true; }
  if (!moved || (Math.abs(vx) > 0.2 && !free(ctx, mo.x + vx * 3, mo.y)) || (Math.abs(vy) > 0.2 && !free(ctx, mo.x, mo.y + vy * 3))) {
    mo.blockT = (mo.blockT || 0) + dt;
    if (mo.blockT > 0.6) {   /* bị vật chắn → đấm vỡ (trùm không bao giờ bị nhốt) */
      const o = objAhead(ctx, mo.x + Math.sign(vx) * 12, mo.y) || objAhead(ctx, mo.x, mo.y + Math.sign(vy) * 12) || objAhead(ctx, mo.x + Math.sign(vx) * 12, mo.y + Math.sign(vy) * 12);
      if (o && ctx.arenaImpact) { ctx.arenaImpact(o.x * TS + 8, o.y * TS + 12, 1.3, 'land'); mo.punchT = 0.4; mo.blockT = 0; log('smash ' + o.type); }
      else if (mo.blockT > 1.2) { const s2 = sidestep(ctx, mo, dx, dy); if (s2) { mo.x = s2.x; mo.y = s2.y; } mo.blockT = 0; }
    }
  } else mo.blockT = 0;
  if (Math.abs(dx) > Math.abs(dy) * 1.1) { mo.face = 'side'; mo.dir = dx < 0 ? -1 : 1; } else mo.face = dy < 0 ? 'dn' : 'ds';
  mo.moving = true; return false;
}
function sidestep(ctx, mo, dx, dy) { const d = Math.hypot(dx, dy) || 1, nx = -dy / d, ny = dx / d; for (const k of [10, -10, 18, -18]) { const x = mo.x + nx * k, y = mo.y + ny * k; if (free(ctx, x, y)) return { x, y }; } return null; }
function nearestFree(ctx, x, y) {   /* BFS ô đi được gần nhất nối về lối vào (như road.js unstick) */
  const m = ctx.S.map, reach = m._hrReach || (m._hrReach = ctx.computeReach(m, m.entries.default)), sx = Math.floor(x / TS), sy = Math.floor(y / TS);
  if (!ctx.isSolid(m, sx, sy) && reach[sy * m.w + sx]) return null;
  const seen = new Set([sx + ',' + sy]), q = [[sx, sy]];
  while (q.length) { const [cx, cy] = q.shift(); for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = cx + a, ny = cy + b, k = nx + ',' + ny; if (seen.has(k) || nx < 0 || ny < 0 || nx >= m.w || ny >= m.h) continue; seen.add(k); if (!ctx.isSolid(m, nx, ny) && reach[ny * m.w + nx]) return { x: nx * TS + 8, y: ny * TS + 12 }; q.push([nx, ny]); } }
  return null;
}
function unstick(ctx) {
  const m = ctx.S.map; if (ST.reachDirty) { m._hrReach = null; ST.reachDirty = false; }
  const p = ctx.S.player; if (!(ctx.knocked && ctx.knocked())) { const s = nearestFree(ctx, p.x, p.y); if (s) { p.x = s.x; p.y = s.y; log('unstick player'); } }
  for (const mo of [ST.boss, ...ST.clones]) if (mo) { const s = nearestFree(ctx, mo.x, mo.y); if (s) { mo.x = s.x; mo.y = s.y; } }
}

/* ---------------- sát thương người chơi / Rocky ---------------- */
const phMul = () => (ST.boss && ST.boss.phase === 2 ? 1.2 : 1) * (ST.boss && !isSup(ST.boss) ? BIG_MUL : 1);
function hurtPlayer(ctx, frac, from, react = 'stagger', power = 1) {
  const h = ctx.hero, p = ctx.S.player; if (!h || h.fainted) return false;
  const ok = h.hit(Math.max(1, Math.round(h.max * frac * phMul()))); if (!ok) return false; ST.hitP = (ST.hitP || 0) + 1;
  if (ctx.knockPlayer && react) { const d = Math.hypot(p.x - from.x, p.y - from.y) || 1; ctx.knockPlayer({ type: react, power, dir: { x: (p.x - from.x) / d, y: (p.y - from.y) / d }, src: from, bound: (x, y) => !inRift(ctx) || y < (ctx.S.map.h - 3) * TS }); }   /* bị hất không văng ra cổng hang Nam (mất trận) */
  return true;
}
function hurtRocky(ctx, frac, from, kb = 50, kind) {   /* kind 'fly' / 'launch' (hoặc kb ≥ 60) → Rocky bay vòng cung như người chơi (pet.js rkKnock) */
  const pos = ctx.rocky && ctx.rocky.pos && ctx.rocky.pos(); if (!pos) return; const pt = rk(ctx); if (!pt) return;
  const d = Math.hypot(pos.x - from.x, pos.y - from.y) || 1, raw = Math.round(LV.maxHpOf(rkLv(ctx)) * frac * 1.2 * phMul() * RK_TAKE);
  ctx.rocky.hitBy(raw, ST.boss, (pos.x - from.x) / d, (pos.y - from.y) / d, kb, kind);
}
const rkPos = ctx => (ctx.rocky && ctx.rocky.pos && ctx.rocky.pos()) || null;
const rkEnt = ctx => (ctx.rocky && ctx.rocky.ent && ctx.rocky.ent()) || null;
const rkAway = ctx => { const pt = rk(ctx); return !pt || (pt.koT || 0) > 0 || !rkEnt(ctx); };

/* ---------------- hình vẽ trùm ---------------- */
function frameOf(mo) {
  const form = mo.form === 'big' ? 'hrbig' : 'hrsup', p2 = mo.form === 'sup2', dirK = mo.face === 'side' ? 'e' : mo.face === 'dn' ? 'n' : 's', flip = mo.face === 'side' && mo.dir < 0 ? 1 : 0;
  const cr = n => (p2 && cre(n.replace('hrsup', 'hrsup2'))) || cre(n);   /* pha 2: bộ hrsup2_* (PixelLab edit: mắt đỏ rực + khăn khói dài) — thiếu clip nào thì dùng hrsup_* */
  const clip = (k, prog) => { const c = cr(form + '_' + k + '_' + dirK) || cr(form + '_' + k + '_s'); if (!c) return null; const i = Math.max(0, Math.min(c.length - 1, Math.floor(prog * c.length))); return c[i][flip] || c[i][0]; };
  const loop = (k, fps) => { const c = cr(form + '_' + k + '_' + dirK) || cr(form + '_' + k + '_s'); if (!c) return null; const i = Math.floor((ST.t + (mo.ft || 0)) * fps) % c.length; return c[i][flip] || c[i][0]; };
  const A = mo.act;
  if (A && A.k === 'super') { const c = (mo.phase === 2 && cre('hrsup2_transform_s')) || cre('hrsup_transform_s'); if (c) return c[Math.min(c.length - 1, Math.floor((1 - Math.max(0, A.t) / A.T0) * c.length))][0]; }   /* màn biến Siêu Cấp: clip gồng PixelLab */
  if (mo.cineT != null && mo.form !== 'big') { const c = cr('hrsup_transform_s'); if (c) return c[Math.min(c.length - 1, Math.floor(mo.cineT * c.length))][0]; }
  if (mo.punchT > 0) { const f = clip('punch', 1 - mo.punchT / 0.4); if (f) return f; }
  if (mo.pose === 'ha') { const f = clip('ha', mo.poseP == null ? 0.6 : mo.poseP); if (f) return f; }
  const wk = mo.face === 'side' ? cr(form) : cr(form + (mo.face === 'dn' ? '_dn' : '_ds'));
  if (!mo.moving && (mo.stunT > 0 || mo.windT > 0)) { const f = loop('stun', 7); if (f) return f; }   /* choáng / hụt hơi (dáng thường có clip stun; Siêu Cấp → thở) */
  if (!mo.moving) { const f = loop('idle', 5); if (f) return f; }
  if (!wk) return null; const n = mo.face === 'side' ? 3 : wk.length;
  const i = mo.moving ? (mo.face === 'side' ? 1 + (Math.floor(mo.ft * 8) % 2) : Math.floor(mo.ft * 8) % n) : 0; return wk[Math.min(wk.length - 1, i)][flip] || wk[0][0];
}
function drawBoss(g, mo, x, y, real = true) {
  const im = frameOf(mo), w = im ? im.width : 18, h = im ? im.height : 16;
  g.save();
  g.fillStyle = real ? 'rgba(10,0,20,.55)' : 'rgba(10,0,20,.16)';   /* Siêu Cấp Hư Vô: bản THẬT bóng đậm hơn */
  g.beginPath(); g.ellipse(Math.round(x), Math.round(y), Math.max(6, w * (real ? 0.36 : 0.3)), real ? 3 : 2, 0, 0, 7); g.fill();
  if (!real) g.globalAlpha = 0.9;
  if (mo.flash > 0) g.filter = 'brightness(2.2)'; else if (mo.vuln > 0) g.filter = 'brightness(1.35) saturate(1.3)';
  if (im) g.drawImage(im, Math.round(x - w / 2), Math.round(y - h + 1));
  else { g.fillStyle = '#2a1840'; g.fillRect(Math.round(x - 8), Math.round(y - 15), 16, 15); g.fillStyle = '#fff'; g.fillRect(Math.round(x - 4), Math.round(y - 11), 2, 2); g.fillRect(Math.round(x + 2), Math.round(y - 11), 2, 2); }
  g.restore();
}

/* ---------------- tạo trùm ---------------- */
function bossCfg(ctx, hp) {
  const t = L(ctx);
  return { key: 'hacrocky', vi: STR.vi.name, en: STR.en.name, hp, dmg: 12, armor: 0, sp: 50, xp: 0, w: 24, h: 26, c: ['#1a0830', '#5a1a8a', '#f0d0ff'], hrBoss: true, noXpTag: true,
    aiFn: (c2, mo, dt, p, dp, canHit) => { poise(c2, mo, dt); bossAi(c2, mo, dt, p, dp, canHit); }, drawFn: (g, mo, x, y) => drawBoss(g, mo, x, y, true), onDown: mo => onWin(ctx, mo), tip: { vi: t.absorb, en: STR.en.absorb } };
}
function spawnBoss(ctx) {
  const m = ctx.S.map, b = m.hrBoss || { x: 15, y: 8 }, hp = bossHp(ctx);
  const mo = ctx.monsters.add(bossCfg(ctx, hp), b.x * TS + 8, b.y * TS + 12);
  Object.assign(mo, { form: 'big', phase: 1, face: 'ds', dir: 1, act: null, vuln: 0, angry: true, warned: true, punchT: 0, pose: null, moving: false, cineT: null, intro: 1.6, supT: 0, supMax: 0, windT: 0, ft: 0 });   /* vào trận ở DÁNG THƯỜNG (hrbig) */
  armPoise(ctx, mo); ST.boss = mo; ST.startT = ST.t; log('spawn hp ' + hp);
  fx('hr_morph', mo.x, mo.y + 2, { dur: 1.4 }); ctx.sfx('rumble'); if (ctx.quake) ctx.quake(0.5);
  ST.banner = { txt: L(ctx).rise, t: 2.2 };
  return mo;
}

/* ---------------- giáp trụ (poise) — 2026-10-13 anh: "Rocky đánh đẩy lùi Rocky hắc ám quá nhiều làm hắn rất ít di chuyển" ----------------
   Đòn thường (kiếm, đấm Rocky, Rocky-ha bậc thấp) chỉ xê dịch trùm ≤ 2 px, không ngắt đòn đang ra. Đòn MẠNH (lực hất ≥ 160: cú đấm hất của Rocky,
   Rocky-ha bậc 5+, nổ giằng co) → đẩy lùi thật ~20 px (không ngắt đòn), tối đa 1 lần / 3 s. */
const SHOVE_KB = 160, SHOVE_GAP = 3;
/* monsters.js: quái đang có mo.kb thì BỎ LƯỢT AI suốt 0,12–0,15 s và trôi theo kb → Rocky / kiếm đánh liên tục làm trùm đứng hình + trôi lùi.
   Trùm: mo.kb là thuộc tính chặn (đọc luôn null → monsters.js không bao giờ bỏ lượt AI); mọi lần gán kb (kiếm, đấm Rocky, Rocky-ha) đi qua poiseHit. */
function armPoise(ctx, mo) { Object.defineProperty(mo, 'kb', { configurable: true, get: () => null, set: v => { if (v) poiseHit(ctx, mo, v); } }); }
function poiseHit(ctx, mo, v) {
  const sp = Math.hypot(v.vx || 0, v.vy || 0); if (!sp) return; const ux = v.vx / sp, uy = v.vy / sp;
  if (sp >= SHOVE_KB && ST.t - (ST.shoveT ?? -99) >= SHOVE_GAP && !ST.clash && !ST.cine && !(mo.act && mo.act.k === 'super') && !(mo.intro > 0)) { shove(ctx, mo, ux, uy, 150); return; }
  const k = Math.min(1.5, sp / 80), nx = mo.x + ux * k, ny = mo.y + uy * k; if (free(ctx, nx, ny, 5)) { mo.x = nx; mo.y = ny; }   /* đòn thường: chỉ xê dịch ≤ 1,5 px, không ngắt đòn */
  ST.weakKb = (ST.weakKb || 0) + 1;
}
function poise(ctx, mo, dt) {
  if (mo.shove) { const S = mo.shove; S.t -= dt; const nx = mo.x + S.vx * dt, ny = mo.y + S.vy * dt; if (free(ctx, nx, ny, 5)) { mo.x = nx; mo.y = ny; } else S.t = 0; if (ST.t - (S.dustT || 0) > 0.06) { S.dustT = ST.t; if (ctx.vfx) ctx.vfx('footstep_dust', mo.x, mo.y + 1); } if (S.t <= 0) mo.shove = null; }
}
function shove(ctx, mo, ux, uy, sp) {
  ST.shoveT = ST.t; mo.shove = { vx: ux * sp, vy: uy * sp, t: 0.17 }; ST.shoves = (ST.shoves || 0) + 1;   /* chỉ đẩy lùi (~20 px), không ngắt đòn — trùm vẫn áp sát liên tục */
  log('shoved');
}

/* ---------------- AI trùm ---------------- */
function bossAi(ctx, mo, dt, p, dp, canHit) {
  mo.kb = null; mo.moving = false; mo.angry = true; mo.warned = true;
  if (ST.clones.length && mo.lastHp != null && mo.hp < mo.lastHp && ST.t >= (ST.clones[0].armT || 0)) revealReal(ctx, mo);   /* kiếm người chơi trúng bản thật (không qua monsters.damage) */
  { const lh = ctx.monsters.lastHitT ? ctx.monsters.lastHitT() : -99; if (lh !== ST.lastHitSeen) { if (ST.lastHitSeen != null && lh > 0 && !(mo.intro > 0)) ST.agP += AG.hit; ST.lastHitSeen = lh; } }   /* mỗi nhát kiếm người chơi trúng (monsters.js strike) → thù người chơi tăng */
  mo.lastHp = mo.hp;
  if (mo.punchT > 0) mo.punchT -= dt; if (mo.vuln > 0) mo.vuln -= dt;
  if (mo.intro > 0) { mo.intro -= dt; mo.face = 'ds'; if (mo.intro <= 0 && !mo.sized) { const k = mo.hp / mo.max, nh = bossHp(ctx); mo.max = nh; mo.hp = Math.max(1, Math.round(nh * k)); mo.sized = true; log('hp ' + nh); } return; }   /* máu tính lại khi trồi lên xong (điểm lưu cấp kiếm sau khi vào vùng) */
  if (ST.cine) return cineTick(ctx, mo, dt);
  if (mo.lockHp != null && !(mo.act && mo.act.k === 'super')) mo.lockHp = null;   /* màn biến Siêu Cấp bị cắt ngang (đứt xích / thử nghiệm) → không kẹt bất tử */
  if (mo.lockHp != null && mo.hp < mo.lockHp) { mo.hp = mo.lockHp; mo.lastHp = mo.hp; }   /* đang biến hình: không mất máu */
  if (mo.phase === 1 && mo.hp <= mo.max * 0.5 && !(mo.act && mo.act.k === 'super')) return startMorph(ctx, mo);
  /* đồng hồ Siêu Cấp: không trôi lúc giằng co; hết giờ thì chờ xong đòn đang ra rồi mới tụt về dáng thường */
  if (isSup(mo) && mo.supT > 0 && !ST.clash) mo.supT = Math.max(0, mo.supT - dt);
  if (isSup(mo) && mo.supT <= 0 && !mo.act && !ST.clash) return endSuper(ctx, mo);
  if (mo.stunT > 0) { mo.stunT -= dt; mo.pose = null; return; }
  if (mo.windT > 0) { mo.windT -= dt; mo.pose = null; return; }   /* hụt hơi sau Siêu Cấp: cửa sổ phản công */
  for (const k in ST.cd) if (ST.cd[k] > 0) ST.cd[k] -= dt;
  if (!canHit || ST.clash) return;
  const A = mo.act, sup = isSup(mo);
  /* lách sang bên khi người chơi vừa vung kiếm ở gần (mỗi nhát chỉ thử 1 lần) — được cả lúc đang lấy đà / thu đấm (bỏ cú đó, xoá vòng báo) */
  const sw = p.action && (p.action.name === 'attack' || p.action.name === 'chop') && p.action.t < 0.12 ? p.action : null;
  if (sw && sw !== ST.swingRef && dp < 44 && (!A || A.k === 'jab' || A.k === 'heavy')) { ST.swingRef = sw; if (ST.cd.dodge <= 0 && Math.random() < (sup ? 0.55 : 0.35)) { if (A) { ST.tele = ST.tele.filter(t => t.act !== A); mo.pose = null; } return startDodge(ctx, mo, p); } }
  aggroTick(ctx, mo, dt);
  if (A) { if (ST.actRef === A) ST.actAge += dt; else { ST.actRef = A; ST.actAge = 0; } ST.actMax[A.k] = Math.max(ST.actMax[A.k] || 0, ST.actAge); }   /* QA: đo chiêu nào kéo dài bất thường (kẹt) */
  if (A) return actTick(ctx, mo, A, dt, p);
  /* chọn chiêu — nhắm MỤC TIÊU hiện tại (Rocky / người chơi) đúng chỗ đang đứng (trước / sau lưng / hai bên / góc sân) */
  const tp = tgPos(ctx, ST.tgt) || p, dtp = dist(mo, tp);
  const frac = mo.hp / mo.max, rkOk = !rkAway(ctx) && LV.tierOf(rk(ctx), 'ha') > 0 && !ST.chain;
  if (!sup && ST.cd.sup <= 0) return startSuper(ctx, mo);
  if (!sup && ST.ultAt.length && frac <= ST.ultAt[0] && ST.cd.sup > 1.5) ST.cd.sup = 1.5;   /* tới mốc tuyệt chiêu mà đang dáng thường → biến Siêu Cấp sớm */
  /* 2026-10-13 anh: mỗi chiêu một hồi chiêu riêng; chọn chiêu MẠNH NHẤT đã hồi xong + đủ điều kiện (Siêu Cấp mới có chiêu Siêu Cấp); không lặp 1 chiêu quá 2 lần liền */
  const sk = pickSkill(ctx, mo, tp, dtp, sup, frac);
  if (sk) return useSkill(ctx, mo, sk, tp, sup);
  /* chưa có chiêu nào dùng được → áp sát (≤ 26 px); ngưỡng đánh 34 px > ngưỡng đi 26 px → không có vùng chết khoảng cách */
  if (dtp > 26) moveMo(ctx, mo, tp.x, tp.y, spd(mo), dt);
}

/* ---------------- bảng chiêu: ưu tiên (tier) + điều kiện + hồi chiêu riêng ---------------- */
const SKILLS = [   /* tier: 4 tuyệt chiêu · 3 chiêu mạnh · 2 chiêu vừa · 1 đấm thường */
  { k: 'ult', tier: 4, ok: (c, mo, d, sup, fr) => sup && ST.cd.ult <= 0 && ((ST.ultAt.length && fr <= ST.ultAt[0]) || (ST.ultAt.length === 0 && ST.t - (ST.lastUlt || 0) > CD.ult)) },
  { k: 'clones', tier: 3, ok: (c, mo, d, sup) => sup && mo.phase === 2 && ST.cd.clones <= 0 && !ST.clones.length },
  { k: 'curve', tier: 3, ok: (c, mo, d, sup) => sup && ST.cd.curve <= 0 && d > 40 },
  { k: 'chain', tier: 3, ok: c => ST.cd.chain <= 0 && !ST.chain && !rkAway(c) && !!rkPos(c) },
  { k: 'hha', tier: 2, ok: (c, mo, d, sup) => ST.cd.hha <= 0 && d > 30 && d < (sup ? 165 : 110) + 8 },
  { k: 'dash', tier: 2, ok: (c, mo, d) => ST.cd.dash <= 0 && d > 46 && d < 150 && (mo.cd || 0) <= 0 },
  { k: 'heavy', tier: 2, ok: (c, mo, d) => ST.cd.heavy <= 0 && d <= 34 && (mo.cd || 0) <= 0 },
  { k: 'jab', tier: 1, ok: (c, mo, d) => d <= 34 && (mo.cd || 0) <= 0 },
];
function pickSkill(ctx, mo, tp, dtp, sup, frac) {
  const ready = SKILLS.filter(S => S.ok(ctx, mo, dtp, sup, frac)); if (!ready.length) return null;
  const q = ST.skillSeq, l1 = q[q.length - 1], l2 = q[q.length - 2];
  const fresh = ready.filter(S => !(S.k === l1 && S.k === l2));   /* không lặp 1 chiêu quá 2 lần liền (trừ khi chỉ còn đúng chiêu đó) */
  const pool = fresh.length ? fresh : ready, top = Math.max(...pool.map(S => S.tier));
  const best = pool.filter(S => S.tier === top).sort((a, b) => (ST.lastUse[a.k] ?? -99) - (ST.lastUse[b.k] ?? -99));   /* cùng bậc: chiêu lâu chưa dùng nhất trước */
  return best[0].k;
}
function useSkill(ctx, mo, k, tp, sup) {
  ST.skillSeq.push(k); if (ST.skillSeq.length > 400) ST.skillSeq.shift(); ST.skillN[k] = (ST.skillN[k] || 0) + 1; ST.lastUse[k] = ST.t;
  if (k === 'ult') { if (ST.ultAt.length && mo.hp / mo.max <= ST.ultAt[0]) ST.ultAt.shift(); return startHha(ctx, mo, tp, true); }
  if (k === 'clones') return startClones(ctx, mo);
  if (k === 'curve') { ST.lastRanged = 'curve'; return startCurve(ctx, mo, tp); }
  if (k === 'chain') return startChain(ctx, mo);
  if (k === 'hha') return startHha(ctx, mo, tp, false);
  if (k === 'dash') return startDash(ctx, mo, tp);
  if (k === 'heavy') { ST.cd.heavy = CD.heavy[sup ? 1 : 0]; return startMelee(ctx, mo, tp, 'heavy'); }
  return startMelee(ctx, mo, tp, 'jab', sup ? 1 + ((Math.random() * 2) | 0) : 0);   /* Siêu Cấp: chuỗi 2–3 cú liên hoàn */
}

/* ---------------- thù hận: chọn mục tiêu Rocky / người chơi ---------------- */
function tgPos(ctx, w) { if (w === 'r') { const e = rkEnt(ctx); return rkAway(ctx) ? null : (e || rkPos(ctx)); } return ctx.S.player; }
function aggroTick(ctx, mo, dt) {
  const p = ctx.S.player, gone = rkAway(ctx) || !!(ST.chain && ST.chain.mode === 'turn');   /* Rocky gục / vắng / bị kéo sang phe địch → chỉ còn người chơi */
  ST.tgtT += dt; ST.tgtLog[ST.tgt] = (ST.tgtLog[ST.tgt] || 0) + dt;
  if (dist(mo, p) < 30) { ST.nearT += dt; if (ST.nearT > 2) ST.agP += AG.near * dt; } else ST.nearT = 0;   /* đứng sát trùm lâu */
  if (ST.tgt === 'r' && !gone) { ST.restT -= dt; if (ST.restT <= 0) { ST.agP = Math.max(ST.agP, AG.burst); ST.restT = 99; } }   /* đánh Rocky lâu → thỉnh thoảng quay sang người chơi */
  ST.agP = Math.max(0, ST.agP - AG.decay * dt * (ST.tgt === 'p' ? 1 : 0.6));
  let want = ST.tgt;
  if (gone) want = 'p';
  else if (ST.tgt === 'r' && ST.agP > AG.rk) want = 'p';
  else if (ST.tgt === 'p' && ST.agP < AG.back && ST.tgtT >= AG.hold) want = 'r';
  if (want !== ST.tgt && (ST.tgtT >= AG.gap || gone)) setTgt(ctx, want, !gone);
}
function setTgt(ctx, w, say = true) {
  ST.tgt = w; ST.tgtT = 0; if (w === 'p') ST.agP = Math.max(ST.agP, AG.burst); else ST.restT = AG.restless[0] + Math.random() * (AG.restless[1] - AG.restless[0]);
  if (say) ctx.toast(w === 'p' ? L(ctx).aimYou : L(ctx).aimRk); log('aim ' + w);
}

/* ---------------- Siêu Cấp có thời hạn (như Rocky) ---------------- */
function startSuper(ctx, mo) {
  mo.act = { k: 'super', t: SUP.cast, T0: SUP.cast }; mo.pose = null; mo.lockHp = mo.hp; mo.face = 'ds'; ST.supN++;
  ST.banner = { txt: L(ctx).supOn, t: 1.6 }; ctx.sfx('spar_roar'); if (ctx.quake) ctx.quake(0.25); fx('hr_morph', mo.x, mo.y + 2, { dur: 1.0 }); log('super start');
}
function superTick(ctx, mo, A) {
  if (A.t > 0) return;
  const ph = mo.phase === 2 ? 1 : 0; mo.act = null; mo.lockHp = null; mo.form = ph ? 'sup2' : 'sup'; mo.supT = mo.supMax = SUP.dur[ph]; mo.cd = 0.3;
  if (ctx.vfx) ctx.vfx('rk_shock', mo.x, mo.y + 4); if (ctx.quake) ctx.quake(0.2); log('super on ' + mo.supT);
}
function endSuper(ctx, mo) {   /* hết giờ: tụt về dáng thường + khói ngắn + hụt hơi 1,5 s (cửa sổ phản công) */
  const ph = mo.phase === 2 ? 1 : 0; mo.form = 'big'; mo.supT = 0; mo.windT = SUP.wind; mo.vuln = Math.max(mo.vuln || 0, SUP.wind); mo.pose = null; mo.punchT = 0;
  ST.cd.sup = SUP.cd[ph]; clearClones(ctx);
  fx('hr_morph', mo.x, mo.y + 2, { dur: 0.55, alpha: 0.6 }); if (ctx.vfx && !ctx.vfx('monster_poof', mo.x, mo.y + 2, 0, true)) ctx.vfx('dirt_puff', mo.x, mo.y + 2);
  ctx.sfx('poof'); ctx.toast(L(ctx).supOff); log('super end');
}

/* ---------------- lướt áp sát + lách ---------------- */
function startDash(ctx, mo, p) {
  faceTo(mo, p.x, p.y); const d = dist(mo, p) || 1, a = Math.atan2(p.y - mo.y, p.x - mo.x), len = Math.min(170, d + 22), T = isSup(mo) ? 0.35 : 0.42;
  mo.act = { k: 'dash', ph: 'wind', t: T, T0: T, a, len, sp: 380 }; mo.pose = 'ha'; mo.poseP = 0.15;
  ST.tele.push({ type: 'l', x: mo.x, y: mo.y - 2, a, len, w: 16, t: T, T0: T, act: mo.act }); ctx.sfx('spar_charge'); log('dash');
}
function dashTick(ctx, mo, A, dt, p) {
  if (A.ph === 'wind') { faceTo(mo, mo.x + Math.cos(A.a), mo.y + Math.sin(A.a)); if (A.t <= 0) { A.ph = 'go'; A.t = A.len / A.sp; A.hitP = false; A.hitR = false; mo.pose = null; ctx.sfx('whoosh_big'); } return; }
  if (A.ph === 'go') {
    const s = A.sp * dt, nx = mo.x + Math.cos(A.a) * s, ny = mo.y + Math.sin(A.a) * s; mo.punchT = 0.25; mo.moving = true;
    if (free(ctx, nx, ny, 5)) { mo.x = nx; mo.y = ny; } else { const o = objAhead(ctx, nx + Math.cos(A.a) * 6, ny + Math.sin(A.a) * 6); if (o && ctx.arenaImpact) ctx.arenaImpact(o.x * TS + 8, o.y * TS + 12, 1.3, 'land'); A.t = 0; }   /* đâm vật → phá, dừng ở vật cứng */
    trailPush(mo, 0.03);
    if (!A.hitP && Math.hypot(p.x - mo.x, p.y - mo.y) < 13) A.hitP = hurtPlayer(ctx, DMG.dash, mo, 'fly', 0.9);
    const rp = rkPos(ctx); if (!A.hitR && rp && Math.hypot(rp.x - mo.x, rp.y - mo.y) < 12) { A.hitR = true; hurtRocky(ctx, DMG.dash, mo, 65, 'fly'); }
    if (A.t <= 0) { A.ph = 'rec'; A.t = 0.22; mo.punchT = 0; }
    return;
  }
  if (A.t <= 0) { mo.act = null; mo.cd = isSup(mo) ? 0.15 : 0.35; ST.cd.dash = isSup(mo) ? 2.6 : 4.2; }
}
function startDodge(ctx, mo, p) {
  const dx = mo.x - p.x, dy = mo.y - p.y, d = Math.hypot(dx, dy) || 1, ux = dx / d, uy = dy / d;
  let best = null; for (const sgn of Math.random() < 0.5 ? [1, -1] : [-1, 1]) { const vx = -uy * sgn * 0.8 + ux * 0.6, vy = ux * sgn * 0.8 + uy * 0.6, ex = mo.x + vx * 30, ey = mo.y + vy * 30; if (free(ctx, ex, ey, 5)) { best = { vx, vy }; break; } }
  if (!best) { ST.cd.dodge = 0.6; return; }
  mo.act = { k: 'dodge', t: 0.18, vx: best.vx * 165, vy: best.vy * 165 }; ST.cd.dodge = isSup(mo) ? 2.2 : 3.2; ctx.sfx('spar_whoosh'); log('dodge');
}
function dodgeTick(ctx, mo, A, dt, p) {
  const nx = mo.x + A.vx * dt, ny = mo.y + A.vy * dt; if (free(ctx, nx, ny, 5)) { mo.x = nx; mo.y = ny; } mo.moving = true; faceTo(mo, p.x, p.y); trailPush(mo, 0.04);
  if (A.t <= 0) { mo.act = null; mo.cd = Math.min(mo.cd || 0, 0.2); }   /* lách xong phản đòn nhanh */
}
function trailPush(mo, gap) {   /* vệt mờ ngắn: chính khung ảnh PixelLab của trùm, mờ dần 0,22 s */
  if (ST.t - (mo.trailT || -9) < gap) return; mo.trailT = ST.t; const im = frameOf(mo); if (im) ST.trail.push({ im, x: mo.x, y: mo.y, t: 0.22 });
}
function faceTo(mo, x, y) { const dx = x - mo.x, dy = y - mo.y; if (Math.abs(dx) > Math.abs(dy) * 1.1) { mo.face = 'side'; mo.dir = dx < 0 ? -1 : 1; } else mo.face = dy < 0 ? 'dn' : 'ds'; }

/* đấm thường (0,6 s báo trước) / đấm hất (1,0 s): vòng tròn nhắm vào chỗ người đứng lúc ra đòn */
function startMelee(ctx, mo, p, k, more = 0, next = false) {   /* more: số cú nối tiếp (chuỗi liên hoàn Siêu Cấp) · next: cú nối → báo trước ngắn hơn (0,38 s) */
  faceTo(mo, p.x, p.y); const d = dist(mo, p) || 1, reach = Math.min(22, d), ax = mo.x + (p.x - mo.x) / d * reach, ay = mo.y + (p.y - mo.y) / d * reach;
  const T0 = k === 'heavy' ? (isSup(mo) ? 0.8 : 0.9) : next ? 0.38 : isSup(mo) ? 0.5 : 0.55, r = k === 'heavy' ? 20 : 15;
  mo.act = { k, t: T0, T0, ph: 'wind', x: ax, y: ay, ox: ax - mo.x, oy: ay - mo.y, r, more, tg: ST.tgt }; mo.act.tl = { type: 'c', x: ax, y: ay, r, t: T0, T0, col: k === 'heavy' ? '#ff4ad8' : '#b040ff', act: mo.act }; ST.tele.push(mo.act.tl);   /* vòng báo gắn THEO trùm (ox/oy): trùm bị đẩy lùi thì vòng dời theo */
  if (k === 'heavy') ctx.sfx('spar_charge');
}
function actTick(ctx, mo, A, dt, p) {
  A.t -= dt;
  if (A.k === 'super') return superTick(ctx, mo, A);
  if (A.k === 'dash') return dashTick(ctx, mo, A, dt, p);
  if (A.k === 'dodge') return dodgeTick(ctx, mo, A, dt, p);
  if (A.k === 'jab' || A.k === 'heavy') {
    if (A.ph === 'wind') { A.x = mo.x + A.ox; A.y = mo.y + A.oy; if (A.tl) { A.tl.x = A.x; A.tl.y = A.y; }   /* đòn cận chiến đánh ở chỗ trùm ĐANG đứng */
      mo.pose = A.k === 'heavy' ? 'ha' : null; mo.poseP = 0.2; if (A.t <= 0) {
      A.ph = 'rec'; A.t = A.more > 0 ? 0.2 : 0.3; mo.pose = null; mo.punchT = 0.4; ctx.sfx(A.k === 'heavy' ? 'punch_heavy' : 'punch_light');
      const q = tgPos(ctx, A.tg) || p;
      if (A.more > 0) { const d = dist(mo, q); if (d > 14 && d < 60) { const k2 = Math.min(10, d - 12) / d, nx = mo.x + (q.x - mo.x) * k2, ny = mo.y + (q.y - mo.y) * k2; if (free(ctx, nx, ny, 5)) { mo.x = nx; mo.y = ny; } } }   /* liên hoàn: nhích tới theo người */
      if (Math.hypot(p.x - A.x, p.y - A.y) < A.r + 4) hurtPlayer(ctx, A.k === 'heavy' ? DMG.heavy : DMG.jab, mo, A.k === 'heavy' ? 'fly' : 'stagger', A.k === 'heavy' ? 1.1 : 0.6);
      const rp = rkPos(ctx); if (rp && Math.hypot(rp.x - A.x, rp.y - A.y) < A.r + 6) hurtRocky(ctx, A.k === 'heavy' ? DMG.heavy : DMG.jab, mo, A.k === 'heavy' ? 70 : 30, A.k === 'heavy' ? 'fly' : null);
      if (A.k === 'heavy') { if (ctx.vfx) ctx.vfx('rk_shock', A.x, A.y + 4); if (ctx.arenaImpact) ctx.arenaImpact(A.x, A.y, 1.3, 'land'); if (ctx.quake) ctx.quake(0.15); }
      else if (ctx.vfx) ctx.vfx('rk_punch_t4', A.x, A.y + 6);
    } }
    else if (A.t <= 0) {
      const q = tgPos(ctx, A.tg) || p;
      if (A.more > 0 && dist(mo, q) < 60) { startMelee(ctx, mo, q, 'jab', A.more - 1, true); ST.chainN = (ST.chainN || 0) + 1; return; }   /* cú nối tiếp: vòng báo mới nhắm lại chỗ mục tiêu đứng */
      mo.act = null; const s = isSup(mo); mo.cd = A.k === 'heavy' ? (s ? 0.5 : 0.7) : (s ? 0.25 : 0.4);   /* trước: 1,1 / 0,55 */
    }
    return;
  }
  if (A.k === 'curve') return curveTick(ctx, mo, A, dt, p);
  if (A.k === 'chain') return chainCast(ctx, mo, A, dt);
  if (A.k === 'clones') return clonesCast(ctx, mo, A, dt, p);
  if (A.k === 'hha') return hhaTick(ctx, mo, A, dt, p);
  if (A.k === 'clashHold') return;   /* đang giằng co: clashTick lo */
  if (A.k === 'ultTele') return ultTele(ctx, mo, A, dt, p);
  if (A.k === 'beam') return beamFallback(ctx, mo, A, dt, p);
  mo.act = null;
}

/* ---------------- Hắc-ha Cong ---------------- */
function curvePath(ctx, a, b) {
  const m = ctx.S.map, ax = Math.floor(a.x / TS), ay = Math.floor(a.y / TS), bx = Math.floor(b.x / TS), by = Math.floor(b.y / TS);
  let pts = null; try { pts = ctx.pathTo(ax, ay, bx, by, 10); } catch (e) { pts = null; }
  let poly = pts && pts.length ? [{ x: a.x, y: a.y - 8 }, ...pts.map(q => ({ x: q.x, y: q.y - 4 })), { x: b.x, y: b.y - 6 }] : null;
  if (!poly) { const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2, d = dist(a, b) || 1, s = (Math.random() < 0.5 ? 1 : -1) * Math.min(60, d * 0.5); poly = [{ x: a.x, y: a.y - 8 }, { x: mx - (b.y - a.y) / d * s, y: my + (b.x - a.x) / d * s }, { x: b.x, y: b.y - 6 }]; }
  else if (poly.length <= 4) {   /* đường thẳng (không vật chắn) → vẫn cho uốn cong vòng ra một bên cho đúng 'Ha Cong' */
    const d = dist(a, b) || 1, s = (Math.random() < 0.5 ? 1 : -1) * Math.min(48, d * 0.45), mx = (a.x + b.x) / 2 - (b.y - a.y) / d * s, my = (a.y + b.y) / 2 + (b.x - a.x) / d * s;
    if (!solidAt(ctx, mx, my)) poly = [{ x: a.x, y: a.y - 8 }, { x: mx, y: my }, { x: b.x, y: b.y - 6 }];
  }
  for (let k = 0; k < 3; k++) { const o = [poly[0]]; for (let i = 0; i < poly.length - 1; i++) { const p0 = poly[i], p1 = poly[i + 1]; o.push({ x: p0.x * 0.75 + p1.x * 0.25, y: p0.y * 0.75 + p1.y * 0.25 }, { x: p0.x * 0.25 + p1.x * 0.75, y: p0.y * 0.25 + p1.y * 0.75 }); } o.push(poly[poly.length - 1]); poly = o; }   /* Chaikin: làm mượt thành đường cong */
  return poly;
}
function startCurve(ctx, mo, p) {
  faceTo(mo, p.x, p.y); const n = mo.phase === 2 ? 2 : 1, paths = [];
  for (let i = 0; i < n; i++) paths.push(curvePath(ctx, mo, p));
  mo.act = { k: 'curve', t: 1.05, T0: 1.05, paths, fired: 0, tg: ST.tgt }; mo.pose = 'ha'; mo.poseP = 0.3;
  for (const pa of paths) ST.tele.push({ type: 'path', pts: pa, t: 1.05, T0: 1.05 });
  ST.banner = { txt: L(ctx).curve, t: 1.2 }; ctx.sfx('spar_charge'); log('curve');
}
function curveTick(ctx, mo, A, dt) {
  mo.poseP = Math.min(0.99, 0.3 + (1 - A.t / A.T0) * 0.5);
  if (A.t <= 0 && A.fired < A.paths.length) {
    const pa = A.paths[A.fired]; ST.shots.push({ pts: pa, i: 0, x: pa[0].x, y: pa[0].y, vx: 0, vy: 0, sp: 175, home: 1.3, life: 6, hit: false, t: 0, tg: A.tg || 'p' });
    A.fired++; A.t = 0.45; ctx.sfx('whoosh_big'); if (ctx.quake) ctx.quake(0.08);
  } else if (A.t <= 0) { mo.act = null; mo.pose = null; ST.cd.curve = CD.curve * (mo.phase === 2 ? 0.8 : 1); mo.cd = 0.35; }
}
function shotsTick(ctx, dt) {
  const p = ctx.S.player;
  for (const s of ST.shots) {
    s.t += dt; s.life -= dt;
    if (s.i < s.pts.length - 1) {   /* bay dọc đường cong đã báo trước */
      let left = s.sp * dt;
      while (left > 0 && s.i < s.pts.length - 1) { const q = s.pts[s.i + 1], d = Math.hypot(q.x - s.x, q.y - s.y); if (d <= left) { s.x = q.x; s.y = q.y; s.i++; left -= d; } else { s.vx = (q.x - s.x) / d * s.sp; s.vy = (q.y - s.y) / d * s.sp; s.x += (q.x - s.x) / d * left; s.y += (q.y - s.y) / d * left; left = 0; } }
    } else if (s.home > 0) {   /* hết đường → đuổi theo, góc quay giới hạn (né ngang được) */
      s.home -= dt; const hq = tgPos(ctx, s.tg) || p, tx = hq.x - s.x, ty = hq.y - 8 - s.y, ca = Math.atan2(s.vy, s.vx), ta = Math.atan2(ty, tx); let da = ta - ca; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI;
      const na = ca + Math.max(-2.4 * dt, Math.min(2.4 * dt, da)), sp = 150; s.vx = Math.cos(na) * sp; s.vy = Math.sin(na) * sp; s.x += s.vx * dt; s.y += s.vy * dt;
    } else { s.x += s.vx * dt; s.y += s.vy * dt; }
    if (s.i >= s.pts.length - 1 && solidAt(ctx, s.x, s.y + 6)) {   /* đâm vách / vật → nổ, vật vỡ */
      if (ctx.arenaImpact) ctx.arenaImpact(s.x, s.y + 6, 1.3, 'land'); fx('hr_shards', s.x, s.y, {}); s.life = 0; ctx.sfx('smash'); continue;
    }
    if (Math.hypot(p.x - s.x, p.y - 8 - s.y) < 10) { hurtPlayer(ctx, DMG.curve, { x: s.x - s.vx * 0.05, y: s.y - s.vy * 0.05 + 8 }, 'fly', 0.9); fx('hr_shards', s.x, s.y, {}); s.life = 0; log('curve hit player'); continue; }
    const rp = rkPos(ctx); if (rp && Math.hypot(rp.x - s.x, rp.y - 8 - s.y) < 10 && !ST.clash) { hurtRocky(ctx, DMG.curve, { x: s.x, y: s.y + 8 }, 60, 'fly'); fx('hr_shards', s.x, s.y, {}); s.life = 0; continue; }
  }
  ST.shots = ST.shots.filter(s => s.life > 0);
}

/* ---------------- Xích Tình Bạn ---------------- */
function startChain(ctx, mo) {
  mo.act = { k: 'chain', t: 1.1, T0: 1.1 }; mo.pose = 'ha'; mo.poseP = 0.2; ST.banner = { txt: L(ctx).chain, t: 1.4 }; ctx.sfx('warn'); log('chain cast');
}
function chainCast(ctx, mo, A) {
  const rp = rkPos(ctx); if (rp) faceTo(mo, rp.x, rp.y);
  if (A.t > 0) return;
  mo.act = null; mo.pose = null; ST.cd.chain = CD.chain; mo.cd = 0.8;
  if (!rp || rkAway(ctx)) return;
  const pt = rk(ctx), turn = (pt.bond || 0) < 20;
  ST.chain = { mode: turn ? 'turn' : 'bind', t: turn ? 5 : 3, hits: 0, atkCd: 0.6, slow: rp ? { x: rp.x, y: rp.y } : null };
  ctx.sfx('bubble_trap'); fx('hr_shards', rp.x, rp.y - 6, {}); if (turn) fx('hr_morph', rp.x, rp.y + 2, { dur: 0.6 });   /* đổi phe: 1 VFX ngắn (không hào quang lặp) */ ctx.toast(turn ? L(ctx).turned : L(ctx).bound, true); log('chain ' + ST.chain.mode);
}
function chainTick(ctx, dt) {
  const C = ST.chain; if (!C) return; C.t -= dt; const e = rkEnt(ctx), p = ctx.S.player, b = ST.boss;
  if (!b || rkAway(ctx) || !e) { endChain(ctx, null); return; }
  if (C.mode === 'turn') {   /* Rocky đổi phe 5 s: chạy tới đấm người chơi */
    const d = Math.hypot(e.x - p.x, e.y - p.y) || 1; ST.petSpot = { x: p.x + (e.x - p.x) / d * 12, y: p.y + (e.y - p.y) / d * 6 };
    C.atkCd -= dt; if (e.punchT > 0) e.punchT -= dt;
    if (d < 24 && C.atkCd <= 0) { C.atkCd = 1.1; e.punchT = 0.26; e.sit = false; e.dir = p.x < e.x ? -1 : 1; e.face = Math.abs(p.x - e.x) > Math.abs(p.y - e.y) ? 'side' : p.y < e.y ? 'dn' : 'ds';
      hurtPlayer(ctx, DMG.rocky, e, 'stagger', 0.6); if (ctx.vfx) ctx.vfx('rk_punch_t1', p.x, p.y - 2); }
  } else {   /* độ thân ≥ 20: chỉ bị trói, đi chậm theo người (30 % tốc độ) */
    const tgt = { x: p.x - 18, y: p.y + 4 }, s = C.slow || { x: e.x, y: e.y }, d = Math.hypot(tgt.x - s.x, tgt.y - s.y);
    if (d > 2) { s.x += (tgt.x - s.x) / d * Math.min(d, 28 * dt); s.y += (tgt.y - s.y) / d * Math.min(d, 28 * dt); } C.slow = s; ST.petSpot = { x: s.x, y: s.y };
  }
  if (C.t <= 0) endChain(ctx, null);
}
function endChain(ctx, how) {
  const C = ST.chain; if (!C) return; ST.chain = null; ST.petSpot = null; const e = rkEnt(ctx); if (e) e.punchT = 0;
  if (C.mode === 'turn' && e) fx('hr_morph', e.x, e.y + 2, { dur: 0.6 });   /* Rocky tỉnh: 1 VFX ngắn */
  if (how === 'cut' || how === 'fed') {
    const b = ST.boss; if (b) { b.vuln = 3; b.stunT = 2.2; b.act = null; b.pose = null; ST.tele = ST.tele.filter(t => t.type === 'path' ? false : true); }
    if (e) fx('hr_shards', (e.x + (b ? b.x : e.x)) / 2, (e.y + (b ? b.y : e.y)) / 2 - 6, {});
    ctx.toast(how === 'fed' ? L(ctx).fedFree : L(ctx).freed, true); ctx.sfx('gate_open'); log('chain ' + how);
    if (how === 'cut') ST.agP += AG.cut;   /* chém đứt xích → trùm thù người chơi */
  }
}
function chainEnds(ctx) { const e = rkEnt(ctx), b = ST.boss; if (!e || !b) return null; return { a: { x: b.x, y: b.y - (b.form !== 'big' ? 14 : 9) }, b: { x: e.x, y: e.y - 7 } }; }
function segDist(p, a, b) { const dx = b.x - a.x, dy = b.y - a.y, l2 = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2)); return Math.hypot(p.x - (a.x + dx * t), p.y - (a.y + dy * t)); }

/* ---------------- Siêu Cấp Hư Vô (3 bản thể) ---------------- */
function startClones(ctx, mo) {
  mo.act = { k: 'clones', t: 1.0, ph: 'tele', tg: ST.tgt }; ST.banner = { txt: L(ctx).clones, t: 2.2 }; fx('hr_morph', mo.x, mo.y + 2, { dur: 1.0 }); ctx.sfx('poof'); log('clones');
}
function spots3(ctx, p) {
  const out = [], a0 = Math.random() * Math.PI * 2;
  for (let k = 0; k < 3; k++) { let ok = null; for (let r = 64; r >= 28 && !ok; r -= 12) for (let da = 0; da < 6 && !ok; da++) { const a = a0 + k * 2.094 + da * 0.25, x = p.x + Math.cos(a) * r, y = p.y + Math.sin(a) * r * 0.8; if (free(ctx, x, y, 6) && !nearestFree(ctx, x, y)) ok = { x, y }; } out.push(ok || { x: p.x + (k - 1) * 30, y: p.y - 40 }); }
  return out;
}
function clonesCast(ctx, mo, A, dt, p) {
  if (A.ph === 'tele') {
    if (A.t > 0) return;
    const p0 = p; p = tgPos(ctx, A.tg) || p0;   /* bản thể vây quanh MỤC TIÊU (Rocky hoặc người chơi) */
    const sp = spots3(ctx, p), real = (Math.random() * 3) | 0;
    sp.forEach((s, i) => {
      if (i === real) { mo.x = s.x; mo.y = s.y; fx('hr_morph', s.x, s.y + 2, { dur: 0.5 }); return; }
      const c = { key: 'hacrocky_fake', vi: STR.vi.name, en: STR.en.name, hp: 99999, dmg: 0, armor: 0, sp: 50, xp: 0, w: 18, h: 18, c: ['#1a0830', '#5a1a8a', '#f0d0ff'], hrFake: true,
        aiFn: (c2, f) => { f.kb = null; f.moving = false; if (f.hp < f.max) { if (ST.t >= (f.armT || 0)) { ctx.monsters.remove(f); fakePop(ctx, f); } else f.hp = f.max; } },   /* bản giả: trúng đòn (kiếm / Rocky đấm / Rocky-ha) sau khi lao xong → nổ; trước đó miễn nhiễm */
        drawFn: (g, f, x, y) => drawBoss(g, f, x, y, false), onDown: f => fakePop(ctx, f) };
      const f = ctx.monsters.add(c, s.x, s.y); Object.assign(f, { armT: ST.t + 2.4, form: mo.form, phase: mo.phase, face: 'ds', dir: 1, punchT: 0, pose: null, warned: true, angry: true, ft: Math.random() }); ST.clones.push(f); fx('hr_morph', s.x, s.y + 2, { dur: 0.5 });
    });
    A.ph = 'aim'; A.t = 1.15; A.lanes = [mo, ...ST.clones].map(o => { faceTo(o, p.x, p.y); const d = dist(o, p) || 1, len = Math.min(140, d + 24); const l = { type: 'l', x: o.x, y: o.y, a: Math.atan2(p.y - o.y, p.x - o.x), len, w: 14, t: 1.15, T0: 1.15, who: o }; ST.tele.push(l); return l; });
    ST.clonesT = 9; return;
  }
  if (A.ph === 'aim') { if (A.t > 0) return; A.ph = 'dash'; A.t = 0.3; A.hitP = false; A.hitR = false; ctx.sfx('whoosh_big'); return; }
  if (A.ph === 'dash') {   /* cả 3 lao theo làn đã báo; bản thật trúng = đủ đau, bản giả = một nửa */
    for (const l of A.lanes) { const o = l.who; if (!o || (o !== mo && !ST.clones.includes(o))) continue; const sp = l.len / 0.3, nx = o.x + Math.cos(l.a) * sp * dt, ny = o.y + Math.sin(l.a) * sp * dt; if (free(ctx, nx, ny, 5)) { o.x = nx; o.y = ny; } o.punchT = 0.4;
      if (!A.hitP && Math.hypot(p.x - o.x, p.y - o.y) < 12) { A.hitP = hurtPlayer(ctx, DMG.dash * (o === mo ? 1 : 0.5), o, 'fly', o === mo ? 1 : 0.6); }
      const rp = rkPos(ctx); if (!A.hitR && rp && Math.hypot(rp.x - o.x, rp.y - o.y) < 12) { A.hitR = true; hurtRocky(ctx, DMG.dash, o, 50); } }
    if (A.t <= 0) { mo.act = null; mo.cd = 0.8; ST.cd.clones = CD.clones; }
  }
}
function fakePop(ctx, f) {   /* trúng bản giả → nổ mưa mảnh tím (vùng rơi 0,4 s sau — né được) */
  ST.clones = ST.clones.filter(o => o !== f); fx('hr_shards', f.x, f.y - 8, {}); ctx.sfx('stone_crumble');
  ST.rains.push({ x: f.x, y: f.y, r: 26, t: 0.45, T0: 0.45 }); ST.tele.push({ type: 'c', x: f.x, y: f.y, r: 26, t: 0.45, T0: 0.45, col: '#c060ff' }); log('fake pop');
}
function revealReal(ctx, mo) { clearClones(ctx); mo.vuln = Math.max(mo.vuln || 0, 3); mo.stunT = 1.2; mo.act = null; mo.pose = null; ctx.toast(L(ctx).real, true); log('real hit'); }
function clearClones(ctx, poof = true) { for (const f of ST.clones) { if (poof) fx('hr_morph', f.x, f.y + 2, { dur: 0.4 }); if (ctx.monsters) ctx.monsters.remove(f); } ST.clones = []; }

/* ---------------- biến hình pha 2 (sân đảo màu âm bản CHỈ lúc biến hình) ---------------- */
function startMorph(ctx, mo) {
  ST.cine = { t: 0 }; ST.ph2At = ST.t; mo.act = null; mo.pose = null; mo.form = 'sup2'; mo.windT = 0; mo.stunT = 0; mo.phase = 2; mo.cineT = 0; mo.lockHp = mo.hp; mo.face = 'ds';
  ST.tele = []; ST.shots = []; clearClones(ctx); if (ST.chain) endChain(ctx, null);
  ST.banner = { txt: L(ctx).morph, t: 2.4 }; ctx.sfx('roar_big'); if (ctx.quake) ctx.quake(0.6); fx('hr_morph', mo.x, mo.y + 2, { dur: 2.2 }); log('morph');
}
function cineTick(ctx, mo, dt) {
  const C = ST.cine; C.t += dt; mo.cineT = Math.min(0.999, C.t / 1.9); ST.neg = C.t < 1.9 ? (C.t < 0.15 || (C.t > 0.9 && C.t < 1.05) ? 1 : 0.85) : 0;
  if (C.t >= 2.1) { ST.cine = null; mo.cineT = null; mo.lockHp = null; ST.neg = 0; ST.cd.clones = 4; mo.cd = 0.5; mo.supT = mo.supMax = SUP.dur[1]; mo.windT = 0; /* sau màn biến pha: Siêu Cấp pha 2 có thời hạn */ if (ctx.vfx) ctx.vfx('rk_shock', mo.x, mo.y + 4); }
}

/* ---------------- Hắc-ha thẳng (2026-10-13 anh: "Rocky hắc ám cũng thêm chiêu Rocky-ha") ----------------
   Tụ năng ở tay (rk_hacharge bản tím) + vạch báo trước 0,8–0,9 s nhắm mục tiêu hiện tại (Rocky / người chơi theo thù hận), né sang bên được.
   Dáng thường: luồng nhỏ, ngắn (110). Siêu Cấp: to, dài (165); pha 2 mạnh hơn (phMul). Trúng → hất bay (knock).
   TUYỆT CHIÊU = Hắc-ha cực đại: tụ 1,4 s, luồng to bắn QUÉT ±30°.
   GIẰNG CO chỉ xảy ra khi Rocky-ha của Rocky và Hắc-ha ĐANG BẮN CÙNG LÚC và hai luồng gần đối đầu (mỗi luồng lệch ≤ 35° so với hướng về bên kia, đủ tầm)
   hoặc đầu hai luồng gặp nhau. Rocky phản xạ: trùm bắt đầu tụ mà Rocky-ha sẵn sàng + lệnh Tấn công/Bảo vệ → 55 % tự bắn trả đúng lúc;
   người chơi cũng bấm E được (nhãn 'Rocky-ha bắn trả!' lúc trùm đang tụ). */
const HHA_T = [0.9, 0.8], HHA_REFLEX = 0.55;
const hhaOrigin = mo => ({ x: mo.x, y: mo.y - (mo.form !== 'big' ? 14 : 8) });
function startHha(ctx, mo, tp, ult, opt = {}) {   /* opt.duel: trùm bắn TRẢ Rocky (khớp nhịp, nhắm thẳng Rocky) · opt.T: thời gian tụ riêng */
  const sup = isSup(mo), T = opt.T != null ? opt.T : ult ? 1.4 : HHA_T[sup ? 1 : 0], len = ult ? 175 : sup ? 165 : 110, w = ult ? 24 : sup ? 18 : 12;
  faceTo(mo, tp.x, tp.y); const o = hhaOrigin(mo), a = Math.atan2(tp.y - 6 - o.y, tp.x - o.x);
  mo.act = { k: 'hha', ph: 'wind', t: T, T0: T, a, a0: a, len, w, ult: !!ult, tg: ST.tgt, hitP: false, hitR: false, duel: !!opt.duel, sheet: ult || sup ? 'rk_ha2_l' : 'rk_ha2_s' };
  mo.pose = 'ha'; mo.poseP = 0.1; ST.lastRanged = 'hha';
  if (!ult) { mo.act.tl = { type: 'l', x: o.x, y: o.y + 6, a, len, w, t: T, T0: T, act: mo.act }; ST.tele.push(mo.act.tl); }
  else {
    ST.cd.ult = 12; ST.lastUlt = ST.t; ST.banner = { txt: L(ctx).ult, t: 2.4 }; ctx.sfx('spar_roar'); if (ctx.quake) ctx.quake(0.3); if (ST.chain) endChain(ctx, null); clearClones(ctx);
    for (const da of [-0.52, 0, 0.52]) ST.tele.push({ type: 'l', x: o.x, y: o.y + 6, a: a + da, len, w: 16, t: T, T0: T, act: mo.act });   /* quét: báo cả quạt ±30° */
  }
  ctx.sfx('spar_charge'); log(ult ? 'hha ult' : 'hha');
  ST.reflex = null;
  /* 2026-10-13 anh: phản xạ 100 % — trùm khởi xướng, Rocky-ha của Rocky sẵn sàng (mọi lệnh trừ 'Về nhà') → Rocky TỤ NGAY nhắm thẳng trùm, tụ đúng bằng thời gian
     trùm tụ để hai luồng nhả cùng lúc; trùm xoay nhắm Rocky → chắc chắn đối đầu → giằng co. Rocky đang hồi chiêu → bắn bình thường (có thể đi qua nhau). */
  if (!opt.duel && !ST.noReflex && !ST.noReflexAll && ctx.rocky && ctx.rocky.haReady && (ST.forceReflex ? !rkAway(ctx) : ctx.rocky.haReady())) {
    if (rkFireAtBoss(ctx, ST.forceReflex ? 'player' : 'auto', T)) { mo.act.duel = true; ST.banner = { txt: L(ctx).rkBack, t: 1.2 }; }
  }
  if (!mo.act.duel && ctx.rocky && ctx.rocky.haWhy) { const w = ctx.rocky.haWhy().replace(/cd[0-9.]+/, 'cd'); (ST.whyN ||= {})[w] = (ST.whyN[w] || 0) + 1; }   /* QA: vì sao Rocky không bắn trả */
  ST.forceReflex = false; ST.noReflex = false;
}
/* Rocky khởi xướng (tự AI / người chơi ra lệnh): Hắc-ha của trùm sẵn sàng → trùm bắn trả nhắm Rocky, khớp nhịp; Rocky xoay nhắm trùm */
function bossCounter(ctx) {
  const rb = ctx.rocky && ctx.rocky.beamInfo && ctx.rocky.beamInfo(), b = ST.boss; if (!rb || rb.fired || !b || rb.ref === ST.seenBeam) return;
  ST.seenBeam = rb.ref; const e = rkEnt(ctx); if (!e || ST.clash || ST.cine || ST.noReflexAll) return;
  const A = b.act, toB = Math.atan2(b.y - 10 - (e.y - 8), b.x - e.x);
  if (A && A.k === 'hha' && A.ph === 'wind') {   /* trùm đang tụ sẵn (Rocky bắn sau) → thành đấu chưởng luôn */
    A.duel = true; ctx.rocky.beamAim(toB); ctx.rocky.beamCharge(rb.t + Math.max(0, A.t)); ST.counterN = (ST.counterN || 0) + 1; log('boss counter (wind)'); return;
  }
  const busy = A && !(A.k === 'jab' || A.k === 'heavy' || A.k === 'dodge' || (A.k === 'dash' && A.ph === 'wind'));
  if (b.intro > 0 || b.stunT > 0 || b.windT > 0 || busy || ST.cd.hha > 0 || ST.chain) return;   /* trùm choáng / hụt hơi / đang ra chiêu khác / Hắc-ha đang hồi → không bắn trả */
  if (A) { ST.tele = ST.tele.filter(t => t.act !== A); b.act = null; b.pose = null; }
  const T = Math.max(0.35, (rb.charge || 0.8) - rb.t);
  startHha(ctx, b, e, false, { duel: true, T }); ctx.rocky.beamAim(toB); ctx.rocky.beamCharge(rb.t + T);
  ST.banner = { txt: L(ctx).hrBack, t: 1.2 }; ST.counterN = (ST.counterN || 0) + 1; log('boss counter');
}
function rkFireAtBoss(ctx, why, charge) {
  const b = ST.boss, e = rkEnt(ctx); if (!b || !e || !ctx.rocky || !ctx.rocky.haFire) return false;
  const ang = Math.atan2(b.y - 10 - (e.y - 8), b.x - e.x); ST.seenBeam = null; const ok = ctx.rocky.haFire(ang, why === 'player', charge); if (ok && ctx.rocky.beamInfo) { const rb = ctx.rocky.beamInfo(); if (rb) ST.seenBeam = rb.ref; } if (ok) { log('reflex ' + why); ST.reflexN = (ST.reflexN || 0) + 1; } return ok;
}
function hhaTick(ctx, mo, A, dt, p) {
  const o = hhaOrigin(mo);
  if (A.ph === 'wind') {
    mo.poseP = 0.1 + (1 - A.t / A.T0) * 0.5;
    if (A.duel) { const rb = ctx.rocky && ctx.rocky.beamInfo && ctx.rocky.beamInfo(); if (rb) { A.a = A.a0 = Math.atan2(rb.y - o.y, rb.x - o.x); faceTo(mo, rb.x, rb.y); if (A.tl) A.tl.a = A.a; } }   /* đấu chưởng: luôn xoay nhắm thẳng tay Rocky */
    if (ST.reflex) { ST.reflex.t -= dt; if (ST.reflex.t <= 0) { const fz = ST.reflex.force; ST.reflex = null; rkFireAtBoss(ctx, fz ? 'player' : 'auto'); } }
    if (A.t <= 0) { A.ph = 'fire'; A.ft = 0; A.t = A.ult ? 1.2 : 0.62; mo.poseP = 0.95; ctx.sfx('whoosh_big'); if (ctx.quake) ctx.quake(A.ult ? 0.35 : 0.15); }
    return;
  }
  A.ft += dt;
  if (beamMeet(ctx)) return;   /* hai luồng gặp nhau ngay khung này → giằng co (trước khi xét trúng Rocky) */
  if (A.ult) A.a = A.a0 + Math.sin(Math.min(1, A.ft / 1.2) * Math.PI * 2) * 0.52;   /* quét qua lại ±30° */
  const ux = Math.cos(A.a), uy = Math.sin(A.a); A.cut = A.len;
  for (let s = 12; s < A.len; s += 6) { if (solidAt(ctx, o.x + ux * s, o.y + 6 + uy * s)) { A.cut = s; if (!A.walled) { A.walled = true; if (ctx.arenaImpact) ctx.arenaImpact(o.x + ux * s, o.y + 6 + uy * s, 1.2, 'land'); } break; } }   /* dừng ở vật cứng đầu tiên */
  const onLine = q => { const rx = q.x - o.x, ry = q.y - 6 - o.y, al = rx * ux + ry * uy, pe = Math.abs(rx * -uy + ry * ux); return al > -4 && al < A.cut + 4 && pe < A.w / 2 + 5; };
  if (A.ft < 0.4 || A.ult) {
    if (!A.hitP && onLine(p)) A.hitP = hurtPlayer(ctx, A.ult ? DMG.hhaUlt : DMG.hha, o, 'fly', A.ult ? 1.3 : 1);
    const rb = ctx.rocky && ctx.rocky.beamInfo && ctx.rocky.beamInfo(), rkShooting = rb && (!rb.fired || rb.ft < 0.25);   /* Rocky đang tụ / vừa bắn trả → để beamMeet quyết (không hất Rocky trước) */
    const rp = rkPos(ctx); if (!A.hitR && rp && onLine(rp) && !ST.clash && !(rkShooting && A.ft < 0.3)) { A.hitR = true; hurtRocky(ctx, A.ult ? DMG.hhaUlt : DMG.hha, o, A.ult ? 90 : 70, A.ult ? 'launch' : 'fly'); }
  }
  if (A.t <= 0) { mo.act = null; mo.pose = null; mo.cd = 0.4; ST.cd.hha = CD.hha[isSup(mo) ? 1 : 0]; ST.cd.curve = Math.max(ST.cd.curve, 2.5); }
}
/* hai luồng cùng lúc → giằng co (mỗi khung, từ update) */
const angDif = (x, y) => Math.abs(Math.atan2(Math.sin(x - y), Math.cos(x - y)));
function beamMeet(ctx) {
  const b = ST.boss, A = b && b.act; if (!A || A.k !== 'hha' || A.ph !== 'fire' || ST.clash) return false;
  const rb = ctx.rocky && ctx.rocky.beamInfo && ctx.rocky.beamInfo(); if (!rb || !rb.fired || rb.ft > (A.duel ? 0.65 : 0.5)) return false;
  if (A.duel) { startClash(ctx, b, A.ult); return true; }   /* đấu chưởng (phản xạ): hai luồng nhắm thẳng nhau → giằng co, không xét góc */
  const o = hhaOrigin(b), dRB = Math.hypot(o.x - rb.x, o.y - rb.y), toB = Math.atan2(o.y - rb.y, o.x - rb.x), toR = toB + Math.PI, lB = A.cut || A.len;
  const facing = angDif(rb.ang, toB) <= 0.61 && angDif(A.a, toR) <= 0.61, reach = dRB <= (rb.len || 0) + lB + 6;
  const hR = { x: rb.x + Math.cos(rb.ang) * rb.len, y: rb.y + Math.sin(rb.ang) * rb.len }, hB = { x: o.x + Math.cos(A.a) * lB, y: o.y + Math.sin(A.a) * lB };
  const heads = Math.hypot(hR.x - hB.x, hR.y - hB.y) < 14;   /* đầu hai luồng chạm nhau */
  ST.meetDbg = { facing, reach, heads, dRB: Math.round(dRB), aR: Math.round(rb.ang * 57.3), aB: Math.round(A.a * 57.3) };
  if (!((facing && reach) || heads)) return false;
  startClash(ctx, b, A.ult); return true;
}
function startClash(ctx, mo, big) {
  const pt = rk(ctx); if (ctx.rocky && ctx.rocky.beamStop) ctx.rocky.beamStop();
  mo.act = { k: 'clashHold' }; ST.tele = ST.tele.filter(t => !t.act || t.act.k !== 'hha');
  ST.clash = { b: 0, t: 0, max: 10, presses: 0, wrong: 0, res: null, endT: 0, big: !!big, push: 0.085 + 0.006 * Math.min(8, LV.tierOf(pt, 'ha')), pull: (mo.phase === 2 ? 0.4 : 0.33) * (big ? 1.15 : 1) };
  ST.clashN = (ST.clashN || 0) + 1; ST.banner = { txt: L(ctx).clashGo, t: 1.6 }; ctx.sfx('spar_whipcrack'); if (ctx.quake) ctx.quake(0.25); log('clash start push ' + ST.clash.push.toFixed(3) + (big ? ' big' : ''));
}

/* ---------------- (cũ) TUYỆT CHIÊU Ha Đối Xứng theo lịch — KHÔNG còn tự kích hoạt (giữ cho móc test cũ) ---------------- */
function startUlt(ctx, mo) {
  const p = ctx.S.player; mo.act = { k: 'ultTele', t: 1.5, T0: 1.5 }; mo.pose = 'ha'; mo.poseP = 0.1; faceTo(mo, p.x, p.y);
  ST.cd.ult = 12; ST.lastUlt = ST.t; ST.banner = { txt: L(ctx).ult, t: 2.4 }; ctx.sfx('spar_roar'); if (ctx.quake) ctx.quake(0.3); log('ult tele');
  if (ST.chain) endChain(ctx, null); clearClones(ctx);
}
function ultTele(ctx, mo, A, dt, p) {
  const d = dist(mo, p); if (d > 120) moveMo(ctx, mo, p.x, p.y, 90, dt); else if (d < 70) { const k = 70 / (d || 1); const tx = p.x + (mo.x - p.x) * k, ty = p.y + (mo.y - p.y) * k; moveMo(ctx, mo, tx, ty, 80, dt); }
  faceTo(mo, p.x, p.y); mo.poseP = 0.1 + (1 - A.t / A.T0) * 0.4;
  const ux = (mo.x - p.x) / (d || 1), uy = (mo.y - p.y) / (d || 1); ST.petSpot = { x: p.x + ux * 26, y: p.y + uy * 22 };   /* Rocky ra đứng trước mặt người chơi, đối diện Hắc Rocky */
  if (A.t > 0) return;
  mo.act = null; const e = rkEnt(ctx);
  if (!e || rkAway(ctx)) { ST.petSpot = null; return startBeamFallback(ctx, mo, p); }
  ST.clash = { b: 0, t: 0, max: 10, presses: 0, wrong: 0, res: null, endT: 0, push: 0.085 + 0.006 * Math.min(8, LV.tierOf(rk(ctx), 'ha')), pull: mo.phase === 2 ? 0.4 : 0.33 };
  ctx.sfx('spar_whipcrack'); if (ctx.quake) ctx.quake(0.25); log('clash start push ' + ST.clash.push.toFixed(3));
}
function clashEnds(ctx) {
  const e = rkEnt(ctx), b = ST.boss; if (!e || !b) return null; const pt = rk(ctx), h = pt && pt.superT > 0 ? 26 : 16;
  const dx = b.x - e.x, dy = b.y - e.y, d = Math.hypot(dx, dy) || 1, ux = dx / d, uy = dy / d;
  const R = { x: e.x + ux * 8, y: e.y - h * 0.5 }, B = { x: b.x - ux * 9, y: b.y - (b.form !== 'big' ? 14 : 9) }, k = (ST.clash.b + 1) / 2;
  return { R, B, O: { x: R.x + (B.x - R.x) * (0.08 + 0.84 * k), y: R.y + (B.y - R.y) * (0.08 + 0.84 * k) }, ux, uy };
}
function clashTick(ctx, dt) {
  const C = ST.clash; if (!C) return; const b = ST.boss, e = rkEnt(ctx), p = ctx.S.player;
  if (C.res) {   /* quả cầu bay về bên thua rồi nổ */
    C.endT += dt; if (C.endT >= 0.35 && !C.boomed) { C.boomed = true; const E = clashEnds(ctx); const tgt = C.res === 'win' ? (E ? E.B : b) : (E ? E.R : p);
      fx('hr_boom', tgt.x, tgt.y + 6, { top: true }); ctx.sfx('smash'); if (ctx.quake) ctx.quake(0.45); if (ctx.arenaImpact) ctx.arenaImpact(tgt.x, tgt.y + 8, 1.4, 'land');
      if (C.res === 'win') { ctx.S.flash = 0.75; if (b) { const dmg = Math.round(b.max * 0.1); b.hp = Math.max(1, b.hp - dmg); b.flash = 0.3; if (E) { ST.shoveT = -99; shove(ctx, b, E.ux, E.uy, 150); } b.vuln = 5.5; b.stunT = 4.5; if (ctx.pop) ctx.pop(b.x, b.y - 26, '-' + dmg, '#ffd45e'); } ctx.toast(L(ctx).win, true); }   /* nổ giằng co = đòn mạnh: hất trùm lùi thật */
      else { ctx.S.flash = Math.max(ctx.S.flash || 0, 0.4); hurtRocky(ctx, 0.25, tgt, 90, 'launch'); const d = Math.hypot(p.x - tgt.x, p.y - tgt.y); if (d < 70) hurtPlayer(ctx, DMG.ultLose, b || tgt, 'fly', 1.4); ctx.toast(L(ctx).lose, true); }
    }
    if (C.endT >= 0.8) { ST.clash = null; ST.petSpot = null; ST.cd.ult = CD.ult; ST.cd.hha = CD.hha[1]; if (b) { b.pose = null; b.cd = 1; if (b.act && b.act.k === 'clashHold') b.act = null; } }
    return;
  }
  C.t += dt; if (!b || !e || rkAway(ctx)) { C.res = 'lose'; return; }
  const E = clashEnds(ctx); ST.petSpot = { x: e.x, y: e.y };   /* Rocky giữ thế, không chạy */
  if (!C.cracked) { C.cracked = true; fx('hr_clashcrack', E.O.x, E.O.y + 10, {}); }   /* đất dưới điểm va nứt + đá vụn bay lên (lúc hai luồng chạm nhau) */
  if (C.pulse > 0) C.pulse -= dt;
  e.sit = false; e.dir = b.x < e.x ? -1 : 1; e.face = Math.abs(E.ux) > Math.abs(E.uy) ? 'side' : E.uy < 0 ? 'dn' : 'ds'; if (e.punchT > 0) e.punchT -= dt;
  b.pose = 'ha'; b.poseP = 0.75; faceTo(b, e.x, e.y);
  C.b -= C.pull * dt * (1 + 0.15 * Math.sin(C.t * 3));
  { /* hai bên lùi chân trượt theo lực đẩy (vệt bụi dưới chân): bên đang bị đẩy lùi xê dịch theo trục giằng co */
    const db = C.b - (C.prevB ?? C.b); C.prevB = C.b; const ux = E.ux, uy = E.uy, k = 9 * Math.abs(db);
    if (db > 0) { const nx = b.x + ux * k, ny = b.y + uy * k; if (free(ctx, nx, ny, 5)) { b.x = nx; b.y = ny; } if (ST.t - (C.dustB || 0) > 0.12) { C.dustB = ST.t; if (ctx.vfx) ctx.vfx('footstep_dust', b.x, b.y + 1); } }
    else if (db < 0) { const nx = e.x - ux * k, ny = e.y - uy * k; if (ST.petSpot && free(ctx, nx, ny, 4)) { e.x = nx; e.y = ny; } if (ST.t - (C.dustR || 0) > 0.18) { C.dustR = ST.t; if (ctx.vfx) ctx.vfx('footstep_dust', e.x, e.y + 1); } }
  }
  if (C.b >= 1) { C.res = 'win'; log('clash win t ' + C.t.toFixed(1) + ' presses ' + C.presses); }
  else if (C.b <= -1) { C.res = 'lose'; log('clash lose t ' + C.t.toFixed(1) + ' presses ' + C.presses); }
  else if (C.t >= C.max) { C.res = C.b > 0 ? 'win' : 'lose'; log('clash timeout ' + C.res); }
  if (C.res) { b.pose = null; }
}
function behindRocky(ctx) {   /* người chơi đứng SAU Rocky (phía đối diện Hắc Rocky) và đủ gần */
  const e = rkEnt(ctx), b = ST.boss, p = ctx.S.player; if (!e || !b) return false;
  const vx = p.x - e.x, vy = p.y - e.y, d = Math.hypot(vx, vy); if (d > 56) return false; if (d < 6) return true;
  return vx * (b.x - e.x) + vy * (b.y - e.y) < 0;
}
function mashPress(ctx) {
  const C = ST.clash; if (!C || C.res) return; const e = rkEnt(ctx);
  /* 2026-10-13: không bắt đứng sau Rocky nữa — bấm ở đâu cũng đẩy được */
  C.presses++; C.b = Math.min(1, C.b + C.push); C.pulse = 0.12;   /* quả cầu lóe theo nhịp bấm */
  { const E = clashEnds(ctx); if (E && ctx.vfx) { ctx.vfx('knock_jab', E.O.x + (Math.random() - 0.5) * 8, E.O.y + 4 + (Math.random() - 0.5) * 6, 0, true); if (C.presses % 6 === 0) fx('hr_clashcrack', E.O.x, E.O.y + 10, {}); } }   /* tia lửa bắn tung mỗi cú đẩy; mỗi 6 cú đất nứt thêm */ if (C.b >= 1) { C.res = 'win'; log('clash win t ' + C.t.toFixed(1) + ' presses ' + C.presses); if (ST.boss) ST.boss.pose = null; } if (e) e.punchT = 0.26; ctx.sfx('punch_light'); if (ctx.quake) ctx.quake(0.04);
}
/* không có Rocky (gục / đổi phe) → tuyệt chiêu thành luồng Hắc-ha thẳng có báo trước, né sang bên được */
function startBeamFallback(ctx, mo, p) {
  const a = Math.atan2(p.y - mo.y, p.x - mo.x); mo.act = { k: 'beam', t: 1.0, ph: 'wind', a }; mo.pose = 'ha';
  ST.tele.push({ type: 'l', x: mo.x, y: mo.y - 6, a, len: 165, w: 20, t: 1.0, T0: 1.0 });
}
function beamFallback(ctx, mo, A, dt, p) {
  if (A.ph === 'wind') { if (A.t <= 0) { A.ph = 'fire'; A.t = 0.45; ctx.sfx('whoosh_big'); if (ctx.quake) ctx.quake(0.2);
    const ux = Math.cos(A.a), uy = Math.sin(A.a), rx = p.x - mo.x, ry = p.y - 6 - (mo.y - 6), along = rx * ux + ry * uy, perp = Math.abs(rx * -uy + ry * ux);
    if (along > -6 && along < 170 && perp < 13) hurtPlayer(ctx, DMG.ultLose * 0.8, mo, 'fly', 1.2);
    A.len = 165; for (let s = 16; s < 165; s += 12) { const x = mo.x + ux * s, y = mo.y + uy * s; if (solidAt(ctx, x, y)) { A.len = s; if (ctx.arenaImpact) ctx.arenaImpact(x, y, 1.3, 'land'); break; } }   /* luồng vẽ tới vật chắn đầu tiên */
  } return; }
  mo.poseP = 0.95; if (A.t <= 0) { mo.act = null; mo.pose = null; mo.cd = 1; ST.cd.ult = CD.ult; }
}

/* ---------------- thắng ---------------- */
function onWin(ctx, mo) {
  const h = sv(ctx), first = h.wins === 0, t = L(ctx), secs = Math.round(ST.t - ST.startT);
  h.wins++; h.best = h.best ? Math.min(h.best, secs) : secs; ST.won = true; ST.boss = null; clearClones(ctx); ST.chain = null; ST.clash = null; ST.petSpot = null; ST.shots = []; ST.tele = [];
  fx('hr_boom', mo.x, mo.y - 6, { top: true }); fx('hr_shards', mo.x, mo.y - 10, {}); ctx.S.flash = 0.6; if (ctx.quake) ctx.quake(0.6); ctx.sfx('boss_win');
  ST.banner = { txt: t.won, t: 3.5 };
  const xp = first ? 900 : 220; if (ctx.hero) ctx.hero.gainXp(xp); if (ctx.onMonsterDown) { try { ctx.onMonsterDown(mo, first ? 600 : 160); } catch (e) { /* bỏ qua */ } }
  ctx.give('stone', first ? 250 : 60, mo.x, mo.y); ctx.give('soul', first ? 3 : 1, mo.x + 8, mo.y);
  const r = ((ctx.S.save.sys ||= {}).road ||= {}); r.balls ||= []; const miss = [1, 2, 3, 4, 5, 6, 7].filter(n => !r.balls.includes(n));
  if (miss.length && (first || Math.random() < 0.2)) { const n = miss[(Math.random() * miss.length) | 0]; r.balls.push(n); ctx.give('dball' + n, 1, mo.x - 10, mo.y, { beam: true }); setTimeout(() => ctx.toast(ctx.lang() === 'vi' ? `🐉 NGỌC RỒNG ${n} SAO rơi ra!` : `🐉 The ${n}-STAR DRAGON BALL dropped!`, true), 1800); }
  if (first) { ctx.bag.add('rkbook8', 1); if (ctx.achieve) ctx.achieve('hacrocky'); setTimeout(() => { ctx.toast(t.title, true); }, 3200); setTimeout(() => openBook(ctx), 4200); }
  else setTimeout(() => ctx.toast(t.again, true), 2400);
  ctx.persist(); log('WIN ' + secs + 's first ' + first);
}
/* sách bậc 8: chọn 1 chiêu đang bậc 7 */
function openBook(ctx) {
  const h = sv(ctx), t = L(ctx), pt = rk(ctx); if (!bk8(ctx) || !pt || !ctx.panel) return;
  const vi = ctx.lang() === 'vi', can = LV.SKILL_IDS.filter(id => LV.tierOf(pt, id) === LV.TIER_SHOP);
  const el = ctx.panel('hrbook', ''), btn = id => `<button class="btn ${can.includes(id) ? 'primary' : ''}" data-hrsk="${id}" ${can.includes(id) ? '' : 'disabled'} style="margin:4px">${LV.SKILLS[id].icon} ${vi ? LV.SKILLS[id].vi : LV.SKILLS[id].en} · ${LV.tierOf(pt, id)}/${LV.TIER_MAX}</button>`;
  el.panel.innerHTML = `<h2>📕 ${t.book} ×${bk8(ctx)}</h2><p class="dim">${can.length ? t.bookPick : t.bookNone}</p><div style="display:flex;flex-wrap:wrap;justify-content:center">${LV.SKILL_IDS.map(btn).join('')}</div><div style="text-align:center;margin-top:8px"><button class="btn" data-hrsk="keep">${t.bookKeep}</button></div>`;
  el.hidden = false; const prev = ctx.S.mode; ctx.setMode('hrbook');
  const close = () => { el.hidden = true; el.onclick = null; ctx.setMode(prev === 'hrbook' ? 'play' : (prev || 'play')); };
  ctx.registerCloser('hrbook', close);
  el.onclick = ev => { const b = ev.target.closest('[data-hrsk]'); if (!b) return; const id = b.dataset.hrsk; if (id !== 'keep' && can.includes(id)) { const r = ctx.rocky.readBook(id, LV.TIER_MAX, true); if (r && r.ok !== false) { ctx.bag.remove('rkbook8', 1); ctx.toast(t.bookDone(vi ? LV.SKILLS[id].vi : LV.SKILLS[id].en), true); ctx.persist(); } } close(); };
}
function useBook8(ctx, id) {   /* móc test + thẻ Rocky: dùng sách bậc 8 cho chiêu id */
  const h = sv(ctx), pt = rk(ctx); if (!bk8(ctx) || !pt || LV.tierOf(pt, id) !== LV.TIER_SHOP) return false;
  const r = ctx.rocky.readBook(id, LV.TIER_MAX, true); if (r && r.ok === false) return false; ctx.bag.remove('rkbook8', 1); ctx.persist(); return true;
}

/* ---------------- hệ thống ---------------- */
export const hacrocky = {
  id: 'hacrocky', always: true,   /* chạy mọi vùng: ctx.hrBook cho thẻ Rocky; khe nứt ở 'arena'; trận ở 'rift1' */
  onZoneEnter(ctx) {
    ctx.hrBook = { open: () => openBook(ctx), use: id => useBook8(ctx, id), count: () => (sv(ctx), bk8(ctx)), add: (n = 1) => { sv(ctx); ctx.bag.add('rkbook8', n); ctx.persist(); } }; sv(ctx);   /* add: thưởng sách bậc 8 của trùm khác (trongdong.js) — dùng chung kho sách */
    if (inArena(ctx)) {   /* khe nứt: mờ khi chưa đủ điều kiện */
      const o = ctx.S.map.objects.find(q => q.rift); if (o) o.type = riftOpen(ctx) ? 'rift_crack' : 'rift_crack_off';
    }
    if (!inRift(ctx)) { reset(); return; }
    reset(); const h = sv(ctx); h.tries++; ctx.persist();
    ST.reachDirty = true;
    /* Rocky đổi phe / bị trói / giữ thế khi giằng co → điểm đứng riêng (bọc móc của arena.js, không đè) */
    const prevWait = ctx.petWait; ctx.petWait = () => (inRift(ctx) && ST.petSpot) ? ST.petSpot : (prevWait ? prevWait() : null);
    ctx.rkEvil = () => inRift(ctx) && !!(ST.chain && ST.chain.mode === 'turn');
    /* 2026-10-13 anh muốn thấy giằng co thường xuyên: Rocky GIỮ Rocky-ha tới khi Hắc-ha của trùm sắp hồi xong → Rocky bắn là trùm bắn trả ngay → đấu chưởng */
    const prevHold = ctx.rkHaHold; ctx.rkHaHold = () => (inRift(ctx) && !!ST.boss && !ST.clash && !ST.noReflexAll && ST.cd.hha > 0.3) || (prevHold ? prevHold() : false);
    const prevHush = ctx.petHush; ctx.petHush = () => (inRift(ctx) && !!ST.boss) || (prevHush ? prevHush() : false);   /* đang đánh trùm: Rocky không mời 'Vuốt ve' */
    /* khắc chế Rocky: đòn Rocky vào trùm chỉ 20 % (trừ lúc LỘ). Bọc ctx.monsters.damage (monsters.js tạo mới mỗi lần vào vùng). */
    const M = ctx.monsters, dmg0 = M.damage;
    M.damage = (mo, d, src, ...rest) => {
      if (mo && mo.c && mo.c.hrBoss && inRift(ctx)) {
        const fromRk = src && src === rkEnt(ctx), mul = fromRk ? (mo.vuln > 0 ? RK_EXPOSED : RK_MUL) : 1, dd = Math.max(1, Math.round(d * mul));
        if (fromRk) { ST.stats.rkRaw += d; ST.stats.rkDealt += dd; if (mo.vuln <= 0 && ST.t - ST.absorbT > 6) { ST.absorbT = ST.t; ctx.toast(L(ctx).absorb); } }
        const r = dmg0(mo, dd, src, ...rest); if (ST.clones.length && mo === ST.boss && ST.t >= (ST.clones[0].armT || 0)) revealReal(ctx, mo); mo.lastHp = mo.hp; return r;
      }
      return dmg0(mo, d, src, ...rest);
    };
    const prevFaint = ctx.faintTravel; ctx.faintTravel = () => { if (inRift(ctx)) return ctx.travel('arena', 'rift'); return prevFaint ? prevFaint() : false; };   /* ngất trong khe → về Sàn Đấu Ngầm, đầy máu, không mất đồ */
    spawnBoss(ctx);
    if (typeof window !== 'undefined') window.__hr = hooks(ctx);
  },
  onZoneLeave(ctx) { if (inRift(ctx)) { bossCamReset(ctx); clearClones(ctx, false); ST.boss = null; ST.petSpot = null; ST.chain = null; ST.clash = null; ST.neg = 0; } },
  update(dt, ctx) {
    if (typeof window !== 'undefined' && inArena(ctx)) window.__hr = hooks(ctx);
    if (!inRift(ctx)) return; ST.t += dt;
    if (ctx.S.mode !== 'play') return;
    for (const f of ST.fx) { f.t += dt; if (f.follow) { f.x = f.follow.x; f.y = f.follow.y; } } ST.fx = ST.fx.filter(f => f.t < f.dur);
    for (const t of ST.tele) t.t -= dt; ST.tele = ST.tele.filter(t => t.t > 0);
    for (const t of ST.trail) t.t -= dt; ST.trail = ST.trail.filter(t => t.t > 0);
    if (ST.banner) { ST.banner.t -= dt; if (ST.banner.t <= 0) ST.banner = null; }
    const b = ST.boss; if (b && !ctx.monsters.list().includes(b)) ST.boss = null;
    ST.clones = ST.clones.filter(f => ctx.monsters.list().includes(f));
    if (ST.clonesT > 0) { ST.clonesT -= dt; if (ST.clonesT <= 0) clearClones(ctx); }
    for (const r of ST.rains) { r.t -= dt; if (r.t <= 0 && !r.done) { r.done = true; const p = ctx.S.player; if (Math.hypot(p.x - r.x, p.y - r.y) < r.r) hurtPlayer(ctx, DMG.shard, r, 'stagger', 0.5); fx('hr_shards', r.x, r.y - 4, {}); } }
    ST.rains = ST.rains.filter(r => !r.done);
    shotsTick(ctx, dt); chainTick(ctx, dt); bossCounter(ctx); beamMeet(ctx); clashTick(ctx, dt);
    if (b && ST.clones.length) for (const f of ST.clones) { f.form = b.form; f.ft += dt; if (!(b.act && b.act.k === 'clones')) { faceTo(f, ctx.S.player.x, ctx.S.player.y); } if (f.punchT > 0) f.punchT -= dt; }
    unstick(ctx);
    /* camera trận trùm (bosscam.js, dùng chung): giữ cả người lẫn Hắc Rocky trong khung — dịch ngang + dọc; trả 0 khi rời khe */
    const bb = ST.boss; bossCam(ctx, bb ? { x: bb.x, y: bb.y } : null, dt, { h: bb && bb.form !== 'big' ? 28 : 18 });
  },
  near(ctx) {
    const p = ctx.S.player, t = L(ctx);
    if (inArena(ctx)) {
      const o = ctx.S.map.objects.find(q => q.rift); if (!o) return null; const x = o.x * TS + 16, y = o.y * TS + 10;
      if (Math.hypot(p.x - x, p.y - y) > 48) return null;
      const ok = riftOpen(ctx); return { label: ok ? t.enter : t.locked(roadOk(ctx), rkLv(ctx) >= 30, rkLv(ctx)), x, y, limit: 48, priority: 5, data: { rift: true, ok } };
    }
    if (!inRift(ctx)) return null;
    { const b = ST.boss, A = b && b.act; if (A && A.k === 'hha' && A.ph === 'wind' && !ST.reflex && ctx.rocky && ctx.rocky.haReady && ctx.rocky.haReady()) return { label: t.reflex, x: p.x, y: p.y - 30, limit: 999, priority: 5, mouse: false, data: { hrReflex: true, grab: true } }; }   /* người chơi ra lệnh Rocky bắn trả */
    if (ST.clash && !ST.clash.res) return { label: t.mashLbl, x: p.x, y: p.y - 30, limit: 999, priority: 5, mouse: false, data: { hrMash: true, grab: true } };
    if (ST.chain) {
      const E = chainEnds(ctx);
      const sd = E ? segDist({ x: p.x, y: p.y - 6 }, E.a, E.b) : 999, e = rkEnt(ctx), de = e ? Math.hypot(p.x - e.x, p.y - e.y) : 999;
      if (ST.chain.mode === 'turn') { const food = FOODS.find(f => ctx.bag.has(f, 1)); if (e && food && de < 30 && !(sd < 12 && de > 14)) return { label: t.feed, x: e.x, y: e.y - 18, limit: 40, priority: 5, data: { hrFeed: food, grab: true } }; }   /* đứng sát xích (xa Rocky) → ưu tiên chém xích */
      if (E && sd < 20) { const m = { x: (E.a.x + E.b.x) / 2, y: (E.a.y + E.b.y) / 2 }; return { label: t.cut(ST.chain.hits), x: m.x, y: m.y - 8, limit: 999, priority: 5, data: { hrCut: true, grab: true } }; }
    }
    return null;
  },
  interact(ctx, cand) {
    const d = cand && cand.data; if (!d) return;
    if (d.rift) {
      if (!rk(ctx)) { ctx.toast(L(ctx).noRocky); return; }
      if (!d.ok) { ctx.toast(L(ctx).locked(roadOk(ctx), rkLv(ctx) >= 30, rkLv(ctx)), true); ctx.sfx('fail'); return; }
      ctx.sfx('whirl'); ctx.travel('rift1', 'default'); return;
    }
    if (d.hrMash) { mashPress(ctx); return; }
    if (d.hrReflex) { rkFireAtBoss(ctx, 'player'); return; }
    if (d.hrFeed && ST.chain) { ctx.bag.remove(d.hrFeed, 1); const pt = rk(ctx); if (pt) { pt.hunger = Math.min(100, (pt.hunger || 0) + 40); pt.bond = (pt.bond || 0) + 1; } ctx.sfx('eat'); endChain(ctx, 'fed'); ctx.persist(); return; }
    if (d.hrCut && ST.chain) {
      const p = ctx.S.player, E = chainEnds(ctx); if (p.act && p.hasAct && p.hasAct('attack')) p.act('attack', 0);
      ST.chain.hits++; ctx.sfx('sword_hit'); if (E && ctx.vfx) { const wt = ctx.tool ? ctx.tool.tier('sword') : 1; ctx.vfx('slash_t' + wt, (E.a.x + E.b.x) / 2, (E.a.y + E.b.y) / 2 + 6, 0, true); }
      if (ST.chain.hits >= 3) endChain(ctx, 'cut');
    }
  },
  drawGround(g, ctx, cx, cy) {
    if (!inRift(ctx)) return;
    for (const t of ST.tele) {   /* đòn báo trước: vết trên mặt đất, sáng dần tới lúc ra đòn (không nhấp nháy lặp) */
      const k = 1 - t.t / t.T0; g.save();
      if (t.type === 'c') { g.strokeStyle = t.col || '#b040ff'; g.globalAlpha = 0.35 + 0.5 * k; g.lineWidth = 1; g.beginPath(); g.ellipse(Math.round(t.x - cx), Math.round(t.y - cy), t.r, t.r * 0.62, 0, 0, 7); g.stroke(); g.globalAlpha = 0.12 + 0.25 * k; g.fillStyle = t.col || '#b040ff'; g.beginPath(); g.ellipse(Math.round(t.x - cx), Math.round(t.y - cy), t.r * k, t.r * 0.62 * k, 0, 0, 7); g.fill(); }
      else if (t.type === 'l') { g.translate(Math.round(t.x - cx), Math.round(t.y - cy)); g.rotate(t.a); g.globalAlpha = 0.18 + 0.3 * k; g.fillStyle = '#9a3aff'; g.fillRect(0, -t.w / 2, t.len, t.w); g.globalAlpha = 0.6; g.fillStyle = '#e0b0ff'; g.fillRect(0, -t.w / 2, t.len * k, 1); g.fillRect(0, t.w / 2 - 1, t.len * k, 1); }
      else if (t.type === 'path') {   /* Hắc-ha Cong: chấm tím dọc đường bay — hiện dần từ trùm ra */
        const n = t.pts.length, upto = Math.floor(n * Math.min(1, k * 1.6)); g.fillStyle = '#d070ff';
        for (let i = 0; i < upto; i += 2) { const q = t.pts[i]; g.globalAlpha = 0.45 + 0.4 * k; g.fillRect(Math.round(q.x - cx) - 1, Math.round(q.y - cy) + 5, 2, 2); }
        const q = t.pts[n - 1]; g.globalAlpha = 0.3 + 0.5 * k; g.strokeStyle = '#ff7af0'; g.beginPath(); g.ellipse(Math.round(q.x - cx), Math.round(q.y - cy) + 6, 8, 5, 0, 0, 7); g.stroke();
      }
      g.restore();
    }
  },
  drawables(ctx, cx, cy) {
    if (!inRift(ctx)) return []; const out = [], g = ctx.g;
    for (const f of ST.fx) out.push({ y: f.top ? 1e9 : f.y + (f.s === VX('hr_morph') ? -8 : 4), f: () => { const n = f.s.n, fr = f.s.loop ? Math.floor(f.t * (f.s.fps || 12)) % n : Math.min(n - 1, Math.floor(f.t * (f.s.fps || 12))); drawSheet(g, f.s, fr, f.x - cx, f.y - cy, f.ang, f.alpha); } });
    for (const tr of ST.trail) out.push({ y: tr.y - 1, f: () => { g.save(); g.globalAlpha = 0.45 * tr.t / 0.22; g.filter = 'brightness(0.6) sepia(1) hue-rotate(230deg) saturate(3)'; g.drawImage(tr.im, Math.round(tr.x - cx - tr.im.width / 2), Math.round(tr.y - cy - tr.im.height + 1)); g.restore(); } });   /* vệt mờ lướt: khung PixelLab của trùm, tím mờ dần */
    const orb = VX('hr_orb');
    for (const s of ST.shots) out.push({ y: s.y + 10, f: () => {
      const a = Math.atan2(s.vy, s.vx) || 0, fr = Math.floor(s.t * 12) % (orb ? orb.n : 1);
      if (orb) drawSheet(g, orb, fr, s.x - cx, s.y - cy, a); else { g.fillStyle = '#c050ff'; g.fillRect(Math.round(s.x - cx) - 3, Math.round(s.y - cy) - 3, 6, 6); }
    } });
    if (ST.chain) { const E = chainEnds(ctx), ch = img('ui/hacrocky/chain.png'); if (E) out.push({ y: Math.max(E.a.y, E.b.y) + 12, f: () => {   /* xích tím PixelLab, lặp theo chiều dài, xoay theo hướng */
      const dx = E.b.x - E.a.x, dy = E.b.y - E.a.y, len = Math.hypot(dx, dy), a = Math.atan2(dy, dx); g.save(); g.imageSmoothingEnabled = false; g.translate(Math.round(E.a.x - cx), Math.round(E.a.y - cy)); g.rotate(a);
      if (ch) { const w = ch.naturalWidth / 2, h = ch.naturalHeight / 2, shake = ST.chain.mode === 'turn' ? Math.round(Math.sin(ST.t * 30) * 0.6) : 0; for (let x = 0; x < len; x += w) { const seg = Math.min(w, len - x); g.drawImage(ch, 0, 0, seg * 2, ch.naturalHeight, Math.round(x), -Math.round(h / 2) + shake, Math.round(seg), Math.round(h)); } }
      else { g.fillStyle = '#b040ff'; g.fillRect(0, -1, len, 2); }
      g.restore();
    } }); }
    if (ST.clash) { const E = clashEnds(ctx); if (E) out.push({ y: Math.min(E.R.y, E.B.y) - 4, f: () => {   /* giằng co (2026-10-13 làm lại): luồng Rocky-ha xanh · Hắc-ha tím-đen lõi đỏ (cùng sheet vfx_workbench) đâm nhau thành quả cầu năng lượng */
      const C = ST.clash, pt = rk(ctx), tier = pt ? Math.max(1, LV.tierOf(pt, 'ha')) : 7, blue = bSheet(beamKey(Math.max(4, tier))), dark = bSheet('rk_ha2_l', true);
      const sus = 3 + Math.floor(ST.t * 14) % 5;   /* khung giữa sheet = luồng đang duy trì, mép gợn sóng chạy */
      let O = E.O, loseThin = null;
      if (C.res) { if (C.endT >= 0.35) O = null; else { const k = C.endT / 0.35, T = C.res === 'win' ? E.B : E.R; O = { x: E.O.x + (T.x - E.O.x) * k, y: E.O.y + (T.y - E.O.y) * k }; loseThin = C.res; } }   /* phân thắng bại: quả cầu bị đẩy ập vào bên thua, luồng bên thắng nuốt dần luồng kia */
      if (!O) return;
      const aR = Math.atan2(O.y - E.R.y, O.x - E.R.x), aB = Math.atan2(O.y - E.B.y, O.x - E.B.x), lR = Math.hypot(O.x - E.R.x, O.y - E.R.y), lB = Math.hypot(O.x - E.B.x, O.y - E.B.y);
      bDraw(g, blue, loseThin === 'lose' ? 9 : sus, E.R.x - cx, E.R.y - cy, aR, lR);
      bDraw(g, dark, loseThin === 'win' ? 9 : sus, E.B.x - cx, E.B.y - cy, aB, lB);
      const big = C.t > 2.5 || Math.abs(C.b) > 0.45 || C.res, orb = VX(big ? 'hr_clashorb_l' : 'hr_clashorb_s') || VX('hr_clash');
      if (orb) { const fr = Math.floor(ST.t * (orb.fps || 14)) % orb.n; g.save(); if (C.pulse > 0) g.filter = 'brightness(1.7)'; drawSheet(g, orb, fr, O.x - cx, O.y - cy); g.restore(); }
    } }); }
    { const b = ST.boss, A = b && b.act; if (A && A.k === 'hha') {   /* Hắc-ha: tụ năng tím ở tay (lớn dần) → luồng tím-đen lõi đỏ, cắt tới vật chắn, xoay theo góc (quét khi tuyệt chiêu) */
      const o = hhaOrigin(b);
      if (A.ph === 'wind') { const cs = bSheet(A.ult ? 'rk_hacharge_x' : isSup(b) ? 'rk_hacharge' : 'rk_hacharge_m', true); if (cs) out.push({ y: b.y + 20, f: () => bDraw(g, cs, Math.min(cs.n - 1, Math.floor((1 - Math.max(0, A.t) / A.T0) * cs.n)), o.x - cx, o.y - cy) }); }
      else { const s2 = bSheet(A.sheet, true); if (s2) out.push({ y: b.y + 20, f: () => bDraw(g, s2, A.ult ? 3 + Math.floor(A.ft * 14) % 5 : bFrame(s2, A.ft), o.x - cx, o.y - cy, A.a, A.cut || A.len) }); }
    } }
    { const b = ST.boss, A = b && b.act; if (A && A.k === 'beam' && A.ph === 'fire') { const s2 = bSheet('rk_ha2_l', true); if (s2) out.push({ y: b.y + 20, f: () => bDraw(g, s2, bFrame(s2, 0.12 + (0.45 - Math.max(0, A.t)) * 1.3), b.x - cx, b.y - 8 - cy, A.a, A.len || 165) }); } }   /* tuyệt chiêu khi không có Rocky: luồng Hắc-ha tím-đen lõi đỏ */
    return out;
  },
  draw(g, ctx, cx, cy) {
    if (!inRift(ctx)) return;
    const b = ST.boss, mk = img('ui/hacrocky/target.png');   /* dấu mục tiêu TĨNH (PixelLab) trên đầu kẻ đang bị nhắm — không nhấp nháy, không lặp */
    if (b && mk && !(b.intro > 0) && !ST.cine && !ST.clash && !ST.won) {
      const q = tgPos(ctx, ST.tgt) || ctx.S.player, isR = ST.tgt === 'r' && q !== ctx.S.player, pt = rk(ctx), hh = isR ? (pt && pt.superT > 0 ? 28 : 18) : 28, w = mk.naturalWidth / 2, h = mk.naturalHeight / 2;
      g.save(); g.imageSmoothingEnabled = false; g.drawImage(mk, Math.round(q.x - cx - w / 2), Math.round(q.y - cy - hh - h), w, h); g.restore();
    }
    if (ST.neg > 0) { g.save(); g.globalCompositeOperation = 'difference'; g.globalAlpha = ST.neg; g.fillStyle = '#fff'; g.fillRect(0, 0, ctx.VW, ctx.VH); g.restore(); }   /* âm bản CHỈ lúc biến hình */
  },
  drawUI(ug, ctx, cx, cy, scale) {
    if (!inRift(ctx) || ctx.S.mode !== 'play') return; const W = ug.canvas.width, H = ug.canvas.height, t = L(ctx), b = ST.boss;
    const font = px => `${Math.round(px)}px VT323, monospace`;
    if (b) {   /* thanh máu trùm trên đầu màn hình — khung PixelLab */
      const fr = img('ui/hacrocky/bossbar.png'), narrow = W < 560, low = H < 460, bw0 = narrow ? W * 0.92 : Math.min(low ? W * 0.44 : W * 0.9, 430, Math.max(300, W * 0.4)), BB = bossBarBox(ug, bw0, bw0 * 74 / 481 + 26), bw = BB.w, bh = bw * 74 / 481, bx = BB.x, by = BB.y, tcx = BB.cx;   /* 2026-10-13: tránh nút HUD (bosscam.js bossBarBox) */   /* điện thoại dọc: dưới cụm đồng hồ / tên vùng; ngang: hẹp lại tránh nút */
      const ix = bx + bw * 72 / 481, iy = by + bh * 24 / 74, iw = bw * (440 - 72) / 481, ih = bh * 28 / 74, k = Math.max(0, b.hp / b.max);
      ug.save(); ug.imageSmoothingEnabled = false;
      if (fr) ug.drawImage(fr, bx, by, bw, bh); else { ug.fillStyle = '#12061c'; ug.fillRect(ix, iy, iw, ih); }
      const gr = ug.createLinearGradient(0, iy, 0, iy + ih); gr.addColorStop(0, b.vuln > 0 ? '#ffe27a' : '#d070ff'); gr.addColorStop(1, b.vuln > 0 ? '#c08a20' : '#5a1a9a'); ug.fillStyle = gr; ug.fillRect(ix, iy, iw * k, ih);
      ug.fillStyle = 'rgba(255,255,255,.18)'; ug.fillRect(ix, iy, iw * k, Math.max(1, ih * 0.22));
      if (b.phase === 1) { ug.fillStyle = 'rgba(255,255,255,.55)'; ug.fillRect(Math.round(ix + iw * 0.5), iy, Math.max(1, scale * 0.4), ih); }   /* mốc biến hình 50 % */
      const fs = Math.max(14, bh * 0.36); ug.font = font(fs); ug.textAlign = 'center'; ug.textBaseline = 'top';
      const nm = `${t.name} · ${isSup(b) ? (b.phase === 2 ? t.supLbl2 : t.supLbl) : t.ph1} · ${t.phase(b.phase)}${b.vuln > 0 ? ' · ' + t.exposed : ''}`;
      ST.uiTop = by + bh + fs + 4;
      if (isSup(b) && b.supMax > 0 && !ST.cine) {   /* đồng hồ Siêu Cấp: vạch nhỏ ngay dưới thanh máu + số giây */
        const k2 = Math.max(0, b.supT / b.supMax), tw = iw * 0.5, tx = Math.round(ix + (iw - tw) / 2), ty = Math.round(iy + ih + Math.max(2, bh * 0.1)), th = Math.max(2, Math.round(bh * 0.07));
        ug.fillStyle = 'rgba(10,4,18,.85)'; ug.fillRect(tx - 1, ty - 1, tw + 2, th + 2); ug.fillStyle = k2 < 0.25 ? '#ff7a7a' : '#ffd45e'; ug.fillRect(tx, ty, Math.round(tw * k2), th);
        const f2 = Math.max(12, fs * 0.72); ug.font = font(f2); ug.textAlign = 'left'; ug.textBaseline = 'middle'; const lab = `${Math.ceil(b.supT)}s`; ug.fillStyle = '#000'; ug.fillText(lab, tx + tw + 5, ty + th / 2 + 1); ug.fillStyle = '#ffe9a0'; ug.fillText(lab, tx + tw + 4, ty + th / 2); ug.textAlign = 'center'; ug.textBaseline = 'top'; ug.font = font(fs);
      } ug.fillStyle = '#000'; ug.fillText(nm, tcx + 1, by + bh + 1, bw); ug.fillStyle = b.vuln > 0 ? '#ffd45e' : '#f0d0ff'; ug.fillText(nm, tcx, by + bh, bw);
      ug.restore();
    }
    if (ST.clash && !ST.clash.res) {   /* thanh lực hai màu (vàng Rocky · tím Hắc Rocky) trên đầu chỗ giằng co */
      const E = clashEnds(ctx); if (E) {
        const sx = (E.O.x - cx) * scale, sy = (Math.min(E.R.y, E.B.y) - cy) * scale - scale * 22, bw = Math.min(W * 0.7, scale * 90), bh = Math.max(10, scale * 3.2), bx = Math.max(6, Math.min(W - bw - 6, sx - bw / 2)), by2 = Math.min(H * 0.8, Math.max((ST.banner ? ST.bannerBot || 0 : ST.uiTop || 60) + Math.max(22, scale * 8), sy));   /* dưới thanh máu trùm */
        const k = (ST.clash.b + 1) / 2; ug.save(); ug.fillStyle = 'rgba(10,4,18,.8)'; ug.fillRect(bx - 3, by2 - 3, bw + 6, bh + 6);
        ug.fillStyle = '#ffcf40'; ug.fillRect(bx, by2, bw * k, bh); ug.fillStyle = '#9a30ff'; ug.fillRect(bx + bw * k, by2, bw * (1 - k), bh);
        ug.fillStyle = '#fff'; ug.fillRect(bx + bw * k - Math.max(1, scale * 0.5), by2 - 3, Math.max(2, scale), bh + 6);
        ug.font = font(Math.max(16, scale * 6)); ug.textAlign = 'center'; ug.textBaseline = 'bottom'; const tx = t.mash;
        ug.fillStyle = '#000'; ug.fillText(tx, bx + bw / 2 + 1, by2 - 5); ug.fillStyle = '#ffe27a'; ug.fillText(tx, bx + bw / 2, by2 - 6); ug.restore();
      }
    }
    if (ST.banner) {   /* tên chiêu ở giữa-trên màn */
      const a = Math.min(1, ST.banner.t * 2), fs = Math.max(20, Math.min(W / 16, scale * 9)); ug.save(); ug.globalAlpha = a; ug.font = font(fs); ug.textAlign = 'center'; ug.textBaseline = 'middle';
      const y = Math.max(H * 0.2, (ST.uiTop || 60) + fs * 0.8); ST.bannerBot = y + fs * 0.7; ug.fillStyle = 'rgba(10,4,18,.65)'; const tw = Math.min(W - 10, ug.measureText(ST.banner.txt).width + 24); ug.fillRect((W - tw) / 2, y - fs * 0.6, tw, fs * 1.2);
      ug.fillStyle = '#000'; ug.fillText(ST.banner.txt, W / 2 + 2, y + 2); ug.fillStyle = '#f0c8ff'; ug.fillText(ST.banner.txt, W / 2, y); ug.restore();
    }
  },
};
const by0 = (H, scale) => Math.max(60, scale * 22);

/* móc test (QA) */
function hooks(ctx) {
  return {
    st: () => { const b = ST.boss; return { inRift: inRift(ctx), open: riftOpen(ctx), road: roadOk(ctx), rkLv: rkLv(ctx), boss: b ? { x: Math.round(b.x), y: Math.round(b.y), hp: Math.round(b.hp), max: b.max, phase: b.phase, form: b.form, act: b.act && b.act.k, ph: b.act && b.act.ph, vuln: +(b.vuln || 0).toFixed(2), stun: +(b.stunT || 0).toFixed(2), intro: b.intro > 0, supT: +(b.supT || 0).toFixed(2), wind: +(b.windT || 0).toFixed(2), spd: spd(b) } : null, supN: ST.supN, chainN: ST.chainN || 0, hitP: ST.hitP || 0, shoves: ST.shoves || 0,
      clones: ST.clones.map(f => ({ x: Math.round(f.x), y: Math.round(f.y) })), shots: ST.shots.length, tele: ST.tele.map(t => t.type), chain: ST.chain && { mode: ST.chain.mode, t: +ST.chain.t.toFixed(2), hits: ST.chain.hits }, clash: ST.clash && { b: +ST.clash.b.toFixed(3), t: +ST.clash.t.toFixed(2), presses: ST.clash.presses, wrong: ST.clash.wrong, res: ST.clash.res }, petSpot: ST.petSpot, neg: ST.neg, tgt: ST.tgt, agP: +ST.agP.toFixed(1), tgtT: +ST.tgtT.toFixed(1), tgtLog: { r: +(ST.tgtLog.r || 0).toFixed(1), p: +(ST.tgtLog.p || 0).toFixed(1) }, won: ST.won, cd: { ...ST.cd }, stats: { ...ST.stats }, save: { ...sv(ctx) }, log: ST.log.slice(-15), t: +ST.t.toFixed(1) }; },
    curve: () => { const b = ST.boss; if (b) { b.act = null; b.intro = 0; startCurve(ctx, b, ctx.S.player); } },
    chain: () => { const b = ST.boss; if (b) { b.act = null; b.intro = 0; ST.cd.chain = 0; startChain(ctx, b); } },
    clones: () => { const b = ST.boss; if (b) { b.act = null; b.intro = 0; if (b.phase !== 2) b.phase = 2; b.form = 'sup2'; b.supT = b.supMax = 12; startClones(ctx, b); } },
    super: () => { const b = ST.boss; if (b && !isSup(b)) { b.act = null; b.intro = 0; b.windT = 0; startSuper(ctx, b); } },   /* ép biến Siêu Cấp ngay */
    supLeft: v => { const b = ST.boss; if (b && isSup(b)) b.supT = v; },
    dash: () => { const b = ST.boss; if (b) { b.act = null; b.intro = 0; startDash(ctx, b, ctx.S.player); } },
    ult: (reflex = true) => { const b = ST.boss; if (b) { b.act = null; b.intro = 0; if (ST.cd.ult > 900) ST.cd.ult = 0; ST.tgt = rkAway(ctx) ? 'p' : 'r'; ST.forceReflex = !!reflex; startHha(ctx, b, tgPos(ctx, ST.tgt) || ctx.S.player, true); } },   /* tuyệt chiêu mới: Hắc-ha cực đại nhắm Rocky, Rocky bắn trả (mặc định) → giằng co lớn */
    hha: (w, reflex) => { const b = ST.boss; if (b) { b.act = null; b.intro = 0; if (w) ST.tgt = w; ST.forceReflex = reflex === true; ST.noReflex = reflex === false; startHha(ctx, b, tgPos(ctx, ST.tgt) || ctx.S.player, false); } },   /* reflex: true ép · false cấm · bỏ trống = theo luật (100 % nếu Rocky sẵn sàng) */
    noCounter: v => { ST.noReflexAll = !!v; },
    fresh: () => { const b = ST.boss; if (b) { b.stunT = 0; b.windT = 0; b.vuln = 0; b.hp = b.max; b.shove = null; b.act = null; } ST.cd.hha = 0; },   /* test: trùm tỉnh táo, đầy máu (không choáng sau giằng co, không biến pha) */
    rkHa: (offDeg = 0) => { const b = ST.boss, e = rkEnt(ctx); if (!b || !e) return false; const a = Math.atan2(b.y - 10 - (e.y - 8), b.x - e.x) + offDeg * Math.PI / 180; return ctx.rocky.haFire(a, true); },
    skills: () => ({ ph2Secs: ST.ph2At != null ? +(ST.t - ST.ph2At).toFixed(1) : 0, seq: ST.skillSeq.slice(), n: { ...ST.skillN }, cd: { ...ST.cd }, actMax: Object.fromEntries(Object.entries(ST.actMax).map(([k, v]) => [k, +v.toFixed(1)])) }),
    meet: () => ({ whyN: ST.whyN || {}, dbg: ST.meetDbg || null, reflexN: ST.reflexN || 0, counterN: ST.counterN || 0, clashN: ST.clashN || 0, reflex: !!ST.reflex }),
    melee: k => { const b = ST.boss; if (b) { b.act = null; b.intro = 0; startMelee(ctx, b, ctx.S.player, k || 'heavy'); } },
    morph: () => { const b = ST.boss; if (b) { b.intro = 0; b.hp = Math.floor(b.max * 0.5); } },
    mash: () => mashPress(ctx), behind: () => behindRocky(ctx),
    setHp: f => { const b = ST.boss; if (b) b.hp = Math.max(1, Math.round(b.max * f)); },
    hold: v => { const b = ST.boss; if (b) { b.act = null; b.intro = v ? 9999 : 0; } },   /* đứng yên (chụp ảnh / thử đòn) */
    place: (x, y) => { const b = ST.boss; if (b) { b.x = x; b.y = y; } },
    cd: o => Object.assign(ST.cd, o), noUlt: () => { ST.ultAt = []; ST.lastUlt = 1e9; },
    cut: () => { if (ST.chain) { ST.chain.hits = 3; endChain(ctx, 'cut'); } },
    book: id => useBook8(ctx, id), openBook: () => openBook(ctx),
    kill: () => { const b = ST.boss; if (b) ctx.monsters.kill(b); },
    aim: (w, ag) => { if (w) setTgt(ctx, w, false); if (ag != null) ST.agP = ag; ST.tgtT = 99; },   /* ép mục tiêu (test) */
    aimReset: () => { ST.tgtLog = { r: 0, p: 0 }; },
    meleeRk: k => { const b = ST.boss, q = tgPos(ctx, 'r'); if (b && q) { b.act = null; b.intro = 0; ST.tgt = 'r'; startMelee(ctx, b, q, k || 'heavy'); } },   /* đấm vào chỗ Rocky đứng */
    pin: (x, y) => { ST.petSpot = x == null ? null : { x, y }; },   /* giữ Rocky đứng yên 1 chỗ (test) */
  };
}
