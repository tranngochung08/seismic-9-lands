// linhthu.js — plan-39 (2026-10-15 anh duyệt): LINH THÚ — mỗi vùng 1 loài, bắt được, có LINH NĂNG (chiêu thường) + SIÊU NĂNG (chiêu mạnh), loài nào cũng TIẾN HOÁ ở cấp 20.
//
// GẶP: mỗi vùng (Làng, Biển, M1…M9) có 1 Ổ LINH THÚ (ảnh PixelLab tĩnh) — linh thú hoang lảng vảng quanh ổ (chưa bắt thì luôn có). Mỗi ngày game ổ rơi 2 món nó thích.
// BẮT: đánh cho đuối (≤ 30 % máu → nằm thở, không chết được) → cầm món nó thích trong túi, bấm E / A cạnh nó → đứng yên ~2 s (bị đánh / đi xa = hỏng) → thành bạn.
//   Đi xa (> 220 px) khi nó đang đuối → nó hồi đầy máu, về ổ. Không dùng thòng lọng / bẫy (đã bỏ 2026-10-11).
// MANG THEO: Rocky luôn là bạn chính + 1 LINH THÚ đi theo (anh chốt). Đổi ở Túi đồ → thẻ Rocky (mục Linh Thú) hoặc Đền Linh Thú trong Làng.
//   Người chơi bay / đi bè / bơi → linh thú tạm thu vào ấn (dòng HUD), xuống đất lại ra.
// TRẬN: tự đánh quái gần người chơi (cả trùm): linh năng theo hồi chiêu; SIÊU NĂNG cần thanh LINH KHÍ đầy (đánh trúng + thời gian trong trận), mở ở cấp 10.
//   HỆ KHẮC ×1,5 + chữ 'Rất hiệu quả!'. TAM KÍCH: người + Rocky + linh thú cùng trúng 1 mục tiêu trong 0,8 s → đòn thưởng + dừng hình ngắn.
//   Không VFX lặp quanh linh thú; dấu hiệu chỉ là hình tĩnh. Chiêu phủ màn (Thần Lực) ≤ 1 lần / phút. Máy yếu (ctx.gfxLow) bớt hạt.
// ẢNH: tools/px-linhthu.py (PixelLab v3: 4 hướng, clip idle / walk / cast + rest cho dạng gốc; tây = lật đông) → assets/px/linhthu/<form>.png + linhthu.json.
// Thử: window.__lt (state, give, active, wild, den, cast, feed, evolve). Test: tools/qa-tests-linhthu.js.
import { ART } from '../art.js';
import { FPS, WATER, waterDraw } from '../anim.js';   /* 2026-10-15: khung sprite quái (bọc lưỡi theo dáng) */
import { SHADOW, shadowAt, shadowFor } from './shadow.js';   /* plan-66: bóng dưới chân (ảnh PixelLab flyshadow, co + nhạt theo độ cao) */
import { ITEMS } from '../items.js';
import { SPECIES, MOVES, STRONG, TYPE_NAME, RARITY_NAME, LT_READY, LT_UNLOCK, TYPE_EN, SIZE_NAME, MOVE_NAME_EN } from './duel-data.js';   /* p72 (plan-51): linh thú = Chấn Thú — 12 hệ chung, thẻ Chấn Thú */

const TAU = Math.PI * 2, TS = 16;
/* hệ: p72 (plan-51) — 12 HỆ CHUNG với Chấn Thú (duel-data STRONG / TYPE_NAME): nuoc→trieu, lua→nham, moc→moc, dat→chan, set→loi, gio→phong, am→am, anh→quang, tam→tinh, bong→anh (trùm Hắc Rocky) */
const BEATS = STRONG;
const EL_NAME = { vi: TYPE_NAME, en: TYPE_EN };
const EL_COL = { trieu: '#7fd4ff', nham: '#ff9a4a', moc: '#8fe07a', chan: '#e8c07a', loi: '#fff27a', phong: '#d8f4ff', am: '#f0b8ff', quang: '#ffffff', tinh: '#d6a0ff', anh: '#ff9cf0', suong: '#bfefff', ma: '#7ff0c0' };
const ZONE_EL = { village: 'moc', sea: 'trieu', m1: 'chan', m2: 'am', m3: 'moc', m4: 'chan', m5: 'phong', m6: 'quang', m7: 'nham', m8: 'loi', m9: 'tinh' };

/* 11 loài. kind chiêu: proj · pull · dash · cone · rings · rain · burrow · rockrain · grab · clones · flash · peck · bolts · lift · leap · vortex · fire · roots
   move: walk4 / hop / fly / float (vẽ: fly + float lơ lửng 5 px). size = cỡ ô canvas PixelLab dạng gốc (logic = ½). */
const SP = {
  coc: { zone: 'village', el: 'trieu', move: 'hop', hopWalk: true, headY: 10.5, vi: 'Cóc Gọi Mưa', en: 'Rain-Call Toad', evo: { vi: 'Cóc Thần Vũ', en: 'Rain God Toad' }, food: 'Dế', foodEn: 'Cricket',
    s1: { kind: 'pull', vi: 'Lưỡi Dính', en: 'Sticky Tongue', cd: 6, mul: 1.3, range: 80, hit: 'u_puff' },
    sj: { kind: 'splash', vi: 'Nhảy Vũng Dập Nước', en: 'Puddle Slam', cd: 5, mul: 1.1, r: 34, kb: 70, chain: 3 },   /* CHIÊU 2 (linh năng nước): nhảy cong sang vũng gần mục tiêu, DẬP nước — vòng giọt bán kính ~2 ô; nhiều vũng → nhảy nối ≤ 3 lần */
    s2: { kind: 'rain', vi: 'Gọi Mưa', en: 'Rain Call', cd: 25, mul: 0.6, range: 90, dur: 6, r: 64, heal: 0.035, fx: 'dr_rain' },
    s3: { kind: 'cannon', vi: 'Thuỷ Pháo Địa Chấn', en: 'Quake Water Cannon', cd: 60, mul: 4.0, range: 96, len: 96, w: 11, kb: 120, stun: 0.8, windup: 0.6, dur: 0.8, evo: true } },   /* 2026-10-16 TUYỆT CHIÊU (cấp 20 + Cóc Thần Vũ): tia nước ≤ 6 ô */
  cachep: { zone: 'sea', el: 'trieu', move: 'float', headY: 10, sink: 4, mouth: { south: [0, -2.5], east: [5, -3], north: [0, -5] }, vi: 'Cá Chép Vũ Môn', en: 'Dragon-Gate Carp', mouth2: { south: [-2, -5.5], east: [3.5, -5], north: [0, -8] }, evo: { vi: 'Long Ngư', en: 'Dragon Carp', headY: 13, sink: 6 }, food: 'Bánh trôi', foodEn: 'Rice dumpling',
    s1: { kind: 'proj', vi: 'Vòi Nước Xoáy', en: 'Whirl Jet', cd: 5, mul: 1.4, range: 110, trav: 'cp:jet', hit: 'cp:hit', n: 2 },
    s2: { kind: 'leap', vi: 'Vượt Vũ Môn', en: 'Dragon Gate Leap', cd: 22, mul: 2.6, range: 100, r: 48, fx: 'cp:crown', ring: 'cp:ring', spout: 'cp:spout' } },
  tete: { zone: 'm1', el: 'chan', move: 'walk4', headY: 10, shadowW: 5, landOnly: true, vi: 'Tê Tê Cát', en: 'Sand Pangolin', evo: { vi: 'Tê Tê Giáp Đá', en: 'Stone-Plate Pangolin', headY: 13, shadowW: 6 }, food: 'Kiến cát', foodEn: 'Sand ants',
    s1: { kind: 'dash', vi: 'Cuộn Lăn', en: 'Roll Ram', cd: 6, mul: 1.5, range: 100, trail: 'bk_kick_sand', hit: 'rc_hit_earth' },   /* 2026-10-15: bụi cát PIXEL (trước tr_sand_soft mềm) */
    s2: { kind: 'vortex', vi: 'Lốc Cát', en: 'Sand Twister', cd: 24, mul: 0.7, range: 100, dur: 2.4, r: 44, fx: 'lt_sandtwister' } },   /* 2026-10-15: lốc cát PIXEL vfx_workbench (effect 2462a642), thay vệt gió tr_sandwind */
  de: { zone: 'm2', el: 'am', move: 'hop', hopWalk: true, headY: 11, shadowW: 5, mouth: { south: [0, -3], east: [6, -5], north: [0, -7] }, vi: 'Dế Mèn Chấn', en: 'Quake Cricket', evo: { vi: 'Dế Chúa Đồng', en: 'Bronze King Cricket', headY: 14, shadowW: 5 }, mouth2: { south: [0, -3], east: [6, -5], north: [0, -7] }, food: 'Lá non', foodEn: 'Tender leaf',
    s1: { kind: 'cone', vi: 'Gáy Rung', en: 'Shriek Wave', cd: 5, mul: 1.3, range: 70, fx: 'de:wave' },
    s2: { kind: 'rings', vi: 'Hoà Âm Địa Chấn', en: 'Quake Chorus', cd: 22, mul: 1.2, range: 80, fx: 'ult_quakering', fxs: ['de:ring1', 'de:ring2', 'de:ring3'] } },
  saola: { zone: 'm3', el: 'moc', move: 'walk4', horn: [8, 9], vi: 'Sao La Ngọc', en: 'Jade Saola', evo: { vi: 'Sao La Thần Rừng', en: 'Forest God Saola' }, food: 'Lá rừng', foodEn: 'Forest leaves',
    s1: { kind: 'dash', vi: 'Húc Sừng Lá', en: 'Leaf Horn Charge', cd: 6, mul: 1.6, range: 110, trail: 'leaf_fall', hit: 'spar_hornhit' },
    s2: { kind: 'roots', vi: 'Rừng Trỗi', en: 'Rising Roots', cd: 24, mul: 1.4, range: 110, fx: 'knock_erupt' } },
  chuichui: { zone: 'm4', el: 'chan', move: 'walk4', headY: 10, shadowW: 5, vi: 'Chuột Chũi Thạch Anh', en: 'Amethyst Mole', evo: { vi: 'Chũi Vương Pha Lê', en: 'Crystal Mole King', headY: 13, shadowW: 5 }, food: 'Giun đá', foodEn: 'Rock worm',
    s1: { kind: 'burrow', vi: 'Đào Hầm', en: 'Tunnel Strike', cd: 6, mul: 1.7, range: 110, fx: 'chui:burst', trail: 'chui:trail' },   /* 2026-10-16 Chũi cute: đất bung NHỎ (vfx_workbench 96838988) thay bk_erupt_soil 136 px của Rết */
    s2: { kind: 'rockrain', vi: 'Mưa Đá Lở', en: 'Rockslide Rain', cd: 24, mul: 1.1, range: 110, fx: 'rock_debris', land: 'chui:trail', rock: 'linhthu/fx/chui_rock.png' } },   /* đá RƠI thật từ trên xuống (ảnh đá thạch anh M4) rồi vỡ + bụi đất nhỏ (knock_land 28 px phủ kín sân khi 6 hòn cùng rơi → bỏ) */
  daibang: { zone: 'm5', el: 'phong', move: 'fly', flyH: 8, vi: 'Đại Bàng Vực', en: 'Canyon Eagle', evo: { vi: 'Đại Bàng Bão Tố', en: 'Storm Eagle' }, food: 'Cá tươi', foodEn: 'Fresh fish',
    s1: { kind: 'dash', vi: 'Bổ Nhào', en: 'Dive Strike', cd: 5, mul: 1.6, range: 120, trail: 'ki_wind', hit: 'knock_streak' },   /* 2026-10-16: sky_gust 55×29 rải dày thành đám mây trùm cả người chơi → vệt gió nhỏ ki_wind */
    s2: { kind: 'grab', vi: 'Ném Địa Chấn', en: 'Seismic Toss', cd: 22, mul: 3.0, range: 110, fx: 'knock_erupt', ring: 'spar_shock' /* 2026-10-16: bụi cỡ trùm (172×150 + 118×82) che kín người chơi → nứt đất 46×34 + vòng sóng dẹt 47×20 (≈1,5 ô) */ } },
  tacke: { zone: 'm6', el: 'quang', move: 'walk4', headY: 11, shadowW: 5, vi: 'Tắc Kè Gương', en: 'Mirror Gecko', evo: { vi: 'Tắc Kè Lăng Kính', en: 'Prism Gecko', headY: 12, shadowW: 5 }, food: 'Đom đóm', foodEn: 'Firefly',
    s1: { kind: 'clones', vi: 'Phân Thân', en: 'Mirror Decoys', cd: 10, mul: 0.8, range: 110, dur: 4, fx: null },   /* 2026-10-16: bỏ cột gương gm_arrive 30×45 (to, che người) — bóng chỉ hiện mờ dần */
    s2: { kind: 'flash', vi: 'Lăng Kính Chói', en: 'Prism Flash', cd: 24, mul: 1.3, range: 90, fx: 'tk:prism' } },   /* 2026-10-16 Tắc Kè cute: loé 7 màu nhỏ 0,44 s (vfx_workbench 830b59d4) */
  kylan: { zone: 'm7', el: 'nham', move: 'walk4', mouth: { south: [0, -6.5], east: [5.5, -7], north: [0, -10] }, mouth2: { south: [0, -6], east: [6, -6.5], north: [0, -12] }, vi: 'Kỳ Lân Lửa', en: 'Fire Qilin', evo: { vi: 'Lân Hoàng', en: 'Qilin Emperor' }, food: 'Than hồng', foodEn: 'Ember coal',
    s1: { kind: 'proj', vi: 'Phun Lửa', en: 'Fire Breath', cd: 5, mul: 1.6, range: 110, trav: 'arena_flame', hit: 'ult_firehit', n: 1 },
    s2: { kind: 'fire', vi: 'Lốc Lửa', en: 'Fire Tornado', cd: 24, mul: 0.9, range: 100, dur: 2.6, r: 40, fx: 'ult_firehit', ring: 'arena_flame', patch: 'spar_firepatch' }   /* 2026-10-16: ult_firering 166×68 rộng gấp 2 vùng r 40 → vòng ngọn lửa nhỏ arena_flame xếp ĐÚNG mép vùng + bùng ult_firehit 33×33 ở tâm */ },
  hac: { zone: 'm8', el: 'loi', move: 'fly', flyH: 8, mouth: { south: [1.5, -18], east: [6, -18.5], north: [0, -20] }, mouth2: { south: [1, -16.5], east: [4, -17], north: [0, -20] }, vi: 'Hạc Sấm', en: 'Thunder Crane', evo: { vi: 'Hạc Thiên Lôi', en: 'Heaven-Bolt Crane' }, food: 'Lúa tím', foodEn: 'Purple rice',
    s1: { kind: 'peck', vi: 'Mổ Sét', en: 'Thunder Peck', cd: 4, mul: 1.5, range: 70, hit: 'bk_zap' },
    s2: { kind: 'bolts', vi: 'Lôi Giáng', en: 'Heaven Bolts', cd: 22, mul: 2.0, range: 110, warn: 'td_spark', fx: 'td_bolt' } },
  kimquy: { zone: 'm9', el: 'tinh', move: 'float', mouth: { south: [0, -9], east: [6, -11.5], north: [0, -15] }, mouth2: { south: [-2, -10.5], east: [7, -11], north: [0, -15] }, vi: 'Kim Quy', en: 'Golden Turtle', evo: { vi: 'Kim Quy Hộ Quốc', en: 'Guardian Golden Turtle' }, food: 'Ngọc mã hoá', foodEn: 'Data pearl',
    s1: { kind: 'proj', vi: 'Cầu Tâm Lực', en: 'Mind Orb', cd: 5, mul: 1.6, range: 120, trav: 'hr_orb', hit: 'hd_implode', n: 1 },
    s2: { kind: 'lift', vi: 'Thần Lực', en: 'Divine Lift', cd: 60, mul: 2.2, range: 110, r: 110, fx: 'hd_implode', lifted: 'hr_clashorb_s', hit: 'hd_implode' }   /* 2026-10-16: dr_motes 175×141 phủ cả người chơi → hạt tím hút về rùa (hd_implode, thưa) + cầu tím ôm TỪNG quái bị nâng (hr_clashorb_s 40) + hd_implode lúc thả rơi; giữ sân tối nhẹ 2 s */ },
};
const IDS = Object.keys(SP);
export const LT_IDS = IDS;   /* plan-44: tổng số loài cho % bộ sưu tập (menu Hậu truyện) */
export const LT_INFO = id => { const s = SP[id]; return s ? { id, zone: s.zone, vi: s.vi, en: s.en, food: s.food, foodEn: s.foodEn, lv: CATCH_LV[id] } : null; };   /* plan-44 P1: gợi ý 'việc kế tiếp' */
const ENABLED = new Set(IDS);   /* plan-39 theo đợt: loài đã duyệt ảnh + test mới có ổ ngoài đời (đợt 1: Cóc, Cá Chép, Tê Tê · đợt 2–3: đủ 11 loài) */
const ZONE_SP = {}; for (const id of IDS) ZONE_SP[SP[id].zone] = id;
const CATCH_LV = { coc: 3, cachep: 4, tete: 5, de: 7, saola: 9, chuichui: 11, daibang: 13, tacke: 15, kylan: 17, hac: 19, kimquy: 21 };
const FOOD_ID = id => 'lt_food_' + id;
for (const id of IDS) { const s = SP[id]; ITEMS[FOOD_ID(id)] = { icon: '🍃', name: { en: s.foodEn + ` (${s.en}'s favourite)`, vi: s.food + ` (món ${s.vi} thích)` }, w: 0, tags: ['ltfood'] }; }   /* món thích — ảnh PixelLab ui/items/lt_food_<loài>.png (manifest.ui.items) */
const EVO_LV = 20, SUPER_LV = 10, LV_MAX = 30, LK_MAX = 100;
const needXp = lv => 40 + lv * 25;
const atkOf = lv => Math.round(6 + 1.8 * (lv - 1));
const formOf = (id, evo) => id + (evo ? '2' : '');

const STR = {
  vi: { tired: 'Đuối sức!', feedNeed: (f, n) => `Cần ${f} để thu phục ${n}`, feed: (f, n) => `Cho ${n} ăn ${f} (đứng yên)`, feeding: 'Đang cho ăn… đứng yên', feedFail: 'Bị ngắt — nó chưa tin bạn', caught: n => `Đã thu phục ${n}! Bấm “Gọi” để gọi ra`, follow: n => `${n} đi cùng bạn`,
    sealed: n => `🔮 ${n} (trong ấn)`, eff: 'Rất hiệu quả!', tam: 'TAM KÍCH!', lvup: (n, l) => `${n} lên cấp ${l}!`, evo: (a, b) => `${a} HOÁ ${b.toUpperCase()}!`, back: 'Nó hồi sức, chạy về ổ',
    den: 'Ổ linh thú', shrine: 'Đền Linh Thú — đổi linh thú đi cùng', title: 'LINH THÚ', none: 'Chưa có linh thú. Mỗi vùng có 1 ổ linh thú: đánh cho đuối rồi cho ăn món nó thích.',
    active: 'Đang đi cùng', pick: 'Chạm để chọn đi cùng', unknown: (z, f) => `Ổ ở ${z} · thích ${f}`, super: 'Siêu năng', skill: 'Linh năng', lockSuper: l => `mở ở cấp ${l}`, lk: 'Linh khí', newFood: (f, n) => `Ổ ${n}: có ${f} rơi quanh ổ`, cmdNo: n => `${n} chưa sẵn sàng`, needWater: 'Cần có nước gần đây — đào ao hoặc ra chỗ có nước', water: 'cần nước' },
  en: { tired: 'Exhausted!', feedNeed: (f, n) => `Need ${f} to befriend ${n}`, feed: (f, n) => `Feed ${n} the ${f} (stay still)`, feeding: 'Feeding… stay still', feedFail: 'Interrupted — it does not trust you yet', caught: n => `${n} befriended! Tap “Call” to send it out`, follow: n => `${n} is with you`,
    sealed: n => `🔮 ${n} (sealed)`, eff: 'Super effective!', tam: 'TRIPLE STRIKE!', lvup: (n, l) => `${n} reached Lv ${l}!`, evo: (a, b) => `${a} EVOLVED INTO ${b.toUpperCase()}!`, back: 'It recovered and ran back to its nest',
    den: 'Spirit beast nest', shrine: 'Spirit Shrine — choose your companion', title: 'SPIRIT BEASTS', none: 'No spirit beasts yet. Every zone has a nest: weaken one, then feed it its favourite food.',
    active: 'With you', pick: 'Tap to bring along', unknown: (z, f) => `Nest in ${z} · likes ${f}`, super: 'Super', skill: 'Skill', lockSuper: l => `unlocks at Lv ${l}`, lk: 'Spirit', newFood: (f, n) => `${n}'s nest: some ${f} lies around it`, cmdNo: n => `${n} isn't ready`, needWater: 'Needs water nearby — dig a pond or go near water', water: 'needs water' },
};
const ZNAME = { vi: { village: 'Làng', sea: 'Biển', m1: 'M1', m2: 'M2', m3: 'M3', m4: 'M4', m5: 'M5', m6: 'M6', m7: 'M7', m8: 'M8', m9: 'M9' }, en: { village: 'Village', sea: 'Sea', m1: 'M1', m2: 'M2', m3: 'M3', m4: 'M4', m5: 'M5', m6: 'M6', m7: 'M7', m8: 'M8', m9: 'M9' } };
const vi = ctx => ctx.lang() === 'vi';
const L = ctx => STR[vi(ctx) ? 'vi' : 'en'];
Object.assign(STR.vi, { rainOn: 'Đang có mưa rồi', orbLbl: 'Gọi', orbLblOut: 'Thu', orbHintPc: 'Mẹo: bấm U (hoặc ô quả cầu trên thanh công cụ) để gọi linh thú ra', orbHintTap: 'Mẹo: bấm nút Gọi (quả cầu cạnh nút A) để gọi linh thú ra', pCall: 'Gọi ra', pRecall: 'Thu về', pResting: n => `Đang nghỉ · ${n}s`, pNoTeam: 'Chưa có linh thú trong đội', orbNone: 'Chưa có linh thú — chọn ở Đền Linh Thú / thẻ Rocky', orbRest: n => `Linh thú đang nghỉ trong Ấn Linh · ${n}s`, orbCant: 'Không thả linh thú ra được lúc này', orbAfter: 'Thu về sau khi tung xong chiêu', orbKo: 'Linh thú gục — về Ấn Linh nghỉ 60s' });   /* 2026-10-15 Ấn Linh */
Object.assign(STR.en, { rainOn: 'It is already raining', orbLbl: 'Call', orbLblOut: 'Recall', orbHintPc: 'Tip: press U (or the orb slot on the toolbar) to send out your spirit beasts', orbHintTap: 'Tip: tap the Call button (the orb next to A) to send out your spirit beasts', pCall: 'Send out', pRecall: 'Recall', pResting: n => `Resting · ${n}s`, pNoTeam: 'No spirit beast in the team', orbNone: 'No spirit beast yet — pick one at the Shrine / Rocky tab', orbRest: n => `Your spirit beast is resting in the orb · ${n}s`, orbCant: 'Cannot release it here', orbAfter: 'Recalling right after this move', orbKo: 'Spirit beast down — resting in the orb for 60s' });
const nameOf = (ctx, id, evo) => { const s = SP[id]; return evo ? (vi(ctx) ? s.evo.vi : s.evo.en) : (vi(ctx) ? s.vi : s.en); };
const skName = (ctx, sk) => (vi(ctx) ? sk.vi : sk.en);
const dst = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

/* ---------------- ảnh ---------------- */
let META = null, METAP = null; const IMG = {};
function loadMeta() { if (META || METAP || typeof fetch === 'undefined') return; METAP = fetch('assets/px/linhthu/linhthu.json').then(r => r.json()).then(j => { META = j; }).catch(() => { METAP = null; }); }
function sheetImg(form) { if (typeof Image === 'undefined') return null; let im = IMG[form]; if (!im) { im = IMG[form] = new Image(); im.src = `assets/px/linhthu/${form}.png`; if (im.decode) im.decode().catch(() => { }); } return im.complete && im.naturalWidth ? im : null; }
function uiImg(path) { if (typeof Image === 'undefined') return null; let im = IMG[path]; if (!im) { im = IMG[path] = new Image(); im.src = 'assets/px/' + path; } return im.complete && im.naturalWidth ? im : null; }
const ctx0t = () => (ST.ctx ? ST.ctx.S.time : 0);
function wetDraw(g, C, x, y, fn, foam = true, cap = 99) {   /* 2026-10-15 anh: linh thú dưới nước CHÌM NỬA DƯỚI như Rocky / người chơi — dùng chung anim.js waterDraw + WATER.depth; bay / lơ lửng thì không (cá thì có — cá bơi chìm) */
  if ((floaty(C.id) && !fishOnly(C.id)) || !WATER.depth) { fn(); return; }
  const dd = Math.min(WATER.depth(C.x, C.y), cap); if (!dd) { fn(); return; } const line = Math.round(y) + 2 - dd; g.save(); g.beginPath(); g.rect(x - 80, line - 240, 160, 240); g.clip(); fn(); g.restore();
  if (foam) { g.fillStyle = 'rgba(230,246,255,.8)'; const t = ctx0t(); for (let i = -7; i <= 7; i += 3) g.fillRect(x + i, line + Math.round(Math.sin(t * 4 + i)), 2, 1); }   /* mép nước gợn sáng như anim.js waterDraw */
}
function drawForm(g, form, clip, dir, t, x, y, alpha = 1, fps = 8, sink = 0) {   /* sink: phần thân chìm dưới mặt nước (0..1, cắt từ chân lên) */
  const M = META && META[form], im = sheetImg(form); if (!M || !im) return false;
  let d = dir, flip = false; if (d === 'west') { d = 'east'; flip = true; }
  const C = M.clips[clip] || M.clips.idle, r = (C && (C[d] || C.south || Object.values(C)[0])); if (!r) return false;
  const f = Math.floor(t * fps) % r.n, w = M.w / 2, h = M.h / 2, dx = Math.round(x - w / 2), dy = Math.round(y - M.foot / 2);
  g.save(); if (alpha < 1) g.globalAlpha = alpha; g.imageSmoothingEnabled = false; if (sink > 0) { g.beginPath(); g.rect(dx - 2, dy - 2, w + 4, M.foot / 2 * (1 - sink) + 2); g.clip(); }
  if (flip) { g.translate(dx + w, dy); g.scale(-1, 1); g.drawImage(im, f * M.w, r.row * M.h, M.w, M.h, 0, 0, w, h); } else g.drawImage(im, f * M.w, r.row * M.h, M.w, M.h, dx, dy, w, h);
  g.restore(); return true;
}
function drawSheetFrame(g, name, t, x, y, scale = 1, fps = 12, alpha = 1) {   /* sheet VFX PixelLab (manifest vfx) vẽ quanh tâm (đạn đang bay) */
  const s = ART.vfx && ART.vfx[name]; if (!s || !s.img) return false; const f = Math.floor(t * (s.fps || fps)) % s.n, w = s.w * scale, h = s.h * scale;
  g.save(); if (alpha < 1) g.globalAlpha = alpha; g.drawImage(s.img, f * s.w, 0, s.w, s.h, Math.round(x - w / 2), Math.round(y - h / 2), w, h); g.restore(); return true;
}
const dirOf = (vx, vy, prev) => (Math.abs(vx) < 0.01 && Math.abs(vy) < 0.01 ? prev : Math.abs(vx) > Math.abs(vy) ? (vx < 0 ? 'west' : 'east') : (vy < 0 ? 'north' : 'south'));
const floaty = id => SP[id].move === 'fly' || SP[id].move === 'float';
/* ĐIỀU KIỆN MÔI TRƯỜNG (anh 2026-10-15: "Hệ nước thì có nước mới dùng được — nước của map hoặc ao tự đào"): 1 điểm kiểm chung cho mọi hệ, hiện CHỈ áp cho hệ Nước.
   Nước = ô WATER / DEEP / REEF của bản đồ (ao người chơi đào cũng thành ô WATER). Cá Chép / Long Ngư là cá: chỉ bơi ở nước, lên cạn thì thu vào ấn. */
function waterNear(ctx, x, y, R = 4) {
  const m = ctx.S.map, T = ctx.T || {}; if (!m || !ctx.getG) return null; const W = [T.WATER, T.DEEP, T.REEF].filter(v => v != null), tx0 = Math.floor(x / TS), ty0 = Math.floor(y / TS); let best = null, bd = 1e9;
  for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) { const tx = tx0 + dx, ty = ty0 + dy; if (tx < 0 || ty < 0 || tx >= m.w || ty >= m.h || !W.includes(ctx.getG(m, tx, ty))) continue; const dd = dx * dx + dy * dy; if (dd < bd) { bd = dd; best = { tx, ty, x: tx * TS + 8, y: ty * TS + 11 }; } }
  return best;
}
const needsWater = id => SP[id].el === 'trieu';
const fishOnly = id => id === 'cachep';
const landOnly = id => !!(SP[id] && SP[id].landOnly);   /* 2026-10-15 Tê Tê (hệ Đất): không vào ô nước — Cuộn Lăn dừng ở mép bờ, mục tiêu dưới nước chỉ nhắm khi sát bờ (Lốc Cát), bị hất xuống nước thì lên bờ gần nhất */
function dryAt(ctx, x, y) { const m = ctx.S.map; return !!m && !wetAt(ctx, x, y) && !ctx.isSolid(m, Math.floor(x / TS), Math.floor((y - 2) / TS)); }
function nearShore(ctx, x, y) { for (const [a, b] of [[16, 0], [-16, 0], [0, 16], [0, -16], [12, 12], [-12, 12], [12, -12], [-12, -12]]) if (dryAt(ctx, x + a, y + b)) return true; return false; }
function shoreNear(ctx, x, y, R = 6) { const tx0 = Math.floor(x / TS), ty0 = Math.floor(y / TS); let best = null, bd = 1e9; for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) { const px = (tx0 + dx) * TS + 8, py = (ty0 + dy) * TS + 12; if (!dryAt(ctx, px, py)) continue; const d = dx * dx + dy * dy; if (d < bd) { bd = d; best = { x: px, y: py }; } } return best; }
const waterSkill = (id, sk) => needsWater(id) && sk.kind !== 'pull' && sk.kind !== 'rain';   /* 2026-10-15: Gọi Mưa gọi mây từ trời → không cần nước sẵn */
const envOk = (ctx, id, x, y) => !needsWater(id) || !!waterNear(ctx, x, y, 4) || inRain(ctx, x, y) || !!(ctx.S.map && ctx.S.map.under);   /* dưới nước: chiêu nước luôn dùng được */
const amphib = id => id === 'coc';   /* anh 2026-10-15: cóc lưỡng cư — đi / nhảy trên bờ, bơi dưới nước; trong trận NHẢY qua lại giữa các vũng gần mục tiêu rồi mới ra chiêu nước */
const wetAt = (ctx, x, y) => !!waterNear(ctx, x, y, 0);

/* ---------------- trạng thái ---------------- */
const ST = { ctx: null, c: null, cs: [], orbs: [], pending: new Set(), outSet: new Set(), menuSel: null, menuSlot: 0, wild: null, den: null, shrine: null, proj: [], fields: [], timers: [], decoys: null, feed: null, hitP: null, hitR: null, hitC: null, pHitT: -99, tamCd: 0, effT: -9, stopOn: false, stopUntil: 0, log: [], stats: { casts: {}, tam: 0, caught: 0, eff: 0, evo: 0, lv: 0 } };
const log = s => { ST.log.push(`${ST.ctx ? ST.ctx.S.time.toFixed(1) : '?'} ${s}`); if (ST.log.length > 200) ST.log.shift(); };
function sv(ctx) { const s = ctx.S.save; s.sys ||= {}; const k = (s.sys.linhthu ||= {}); if (!(k.v >= 1)) { k.v = 1; k.owned ||= {}; k.active ??= null; k.food ||= {}; } k.owned ||= {}; k.food ||= {}; k.out ??= false; k.restUntil ??= 0;   /* p72: sửa lỗi v !== 1 (save v2 bị ép về 1) */
  if (k.v < 2) { for (const o of Object.values(k.owned)) if (o && typeof o === 'object') { o.duel ??= { w: 0, l: 0 }; o.mv ??= null; } k.v = 2; }   /* p72 save v2: thắng/thua trận Chấn Thú + bộ chiêu (null = mặc định theo cấp) */
  if (!Array.isArray(k.team)) k.team = k.active && k.owned[k.active] ? [k.active] : []; k.orbLv ??= 1;   /* 2026-10-15 Ấn Linh nâng cấp: ĐỘI HÌNH (1–3 ô theo cấp Ấn Linh); save cũ: con đang đi cùng = đội 1 ô */
  if (k.restUntil) { const r0 = k.team[0] && k.owned[k.team[0]]; if (r0) r0.rest = Math.max(r0.rest || 0, k.restUntil); k.restUntil = 0; }   /* nghỉ (gục) giờ tính RIÊNG từng con: owned[id].rest */
  return k; }   /* 2026-10-15 Ấn Linh: out = đang ở NGOÀI (đi theo, đánh); mặc định trong ấn */
const owned = (ctx, id) => sv(ctx).owned[id];
const SLOTS = [0, 1, 2, 3], ORB_MAX = 3;
const slotsOf = k => SLOTS[Math.max(1, Math.min(ORB_MAX, k.orbLv || 1))];
function teamIds(ctx) { const k = sv(ctx); const T = k.team.filter((id, i) => SP[id] && k.owned[id] && k.team.indexOf(id) === i).slice(0, slotsOf(k)); if (T.join() !== k.team.join()) k.team = T; k.active = T[0] || null; return T; }
const restLeft = (ctx, id) => { const o = owned(ctx, id); return o ? Math.max(0, (o.rest || 0) - nowS()) : 0; };
function activeId(ctx) { return teamIds(ctx)[0] || null; }   /* tương thích: con ĐẦU đội */

/* ---------------- mục tiêu / hệ khắc ---------------- */
const isBoss = mo => !!(mo && mo.c && (mo.c.boss || mo.c.hrBoss || mo.c.tdBoss || mo.c.gmBoss || mo.c.hdBoss || mo.c.dhBoss || mo.c.bkBoss || mo.c.ai === 'kraken'));
function elOf(ctx, mo) { const c = mo.c || {}; if (c.hrBoss) return 'anh'; if (c.tdBoss) return 'am'; if (c.gmBoss) return 'quang'; if (c.hdBoss || c.dhBoss) return 'tinh'; if (c.bkBoss) return 'loi'; if (c.ai === 'kraken') return 'trieu'; if (c.lt) return SP[c.lt].el; return ZONE_EL[ctx.S.zone && ctx.S.zone.id] || null; }
function mons(ctx) { const L0 = ctx.monsters && ctx.monsters.list ? ctx.monsters.list() : []; return L0.filter(mo => mo && mo.hp > 0 && mo.state !== 'dead' && !mo.statue && !(mo.c && mo.c.spar && !(ctx.sparFoe && ctx.sparFoe() === mo)) && !(mo.c && mo.c.lt && mo.tired) && !(mo.c && mo.c.fct && !mo.angry && !(mo.F && mo.F.nt))); }   /* p74: bỏ Chấn Thú hoang trung lập */
function pickTarget(ctx, C) { const p = ctx.S.player; { const lk = ctx.target && ctx.target.get && ctx.target.get(), lm = lk && (lk.kind === 'mon' || lk.kind === 'tent') ? (lk.mo || lk.ref) : null; if (lm && mons(ctx).includes(lm) && dst(lm, p) <= (isBoss(lm) ? 220 : 130)) return lm; }   /* p91 đợt C: linh thú đánh con đang khoá */ let b = null, bd = 1e9; for (const mo of mons(ctx)) { const dp = dst(mo, p), dc = dst(mo, C); if (dp > (isBoss(mo) ? 220 : 130)) continue; if (landOnly(C.id) && wetAt(ctx, mo.x, mo.y) && !nearShore(ctx, mo.x, mo.y)) continue; const sc = dc - (isBoss(mo) ? 30 : 0) - (mo.angry ? 20 : 0); if (sc < bd) { bd = sc; b = mo; } } return b; }

/* ---------------- sát thương ---------------- */
function deal(ctx, mo, mul, kb = 60, opts = {}) {
  const C = ST.c, k = C && owned(ctx, C.id); if (!mo || !ctx.monsters || !ctx.monsters.damage || !k) return 0; mo.__ltHit = ctx.S.time;   /* 2026-10-15 máu linh thú: quái 'dính' với linh thú → đánh trả khi đứng sát */
  let dmg = atkOf(k.lv) * mul * (k.evo ? 1.25 : 1) * (SP[C.id].el === 'trieu' && inRain(ctx, C.x, C.y) ? 1.3 : 1);   /* đứng trong mưa Gọi Mưa: chiêu nước ×1,3 */ const me = SP[C.id].el, te = elOf(ctx, mo);
  if (te && (BEATS[me] || []).includes(te)) { dmg *= 1.5; ST.stats.eff++; if (ctx.S.time - ST.effT > 1.6) { ST.effT = ctx.S.time; if (ctx.pop) ctx.pop(mo.x, mo.y - 26, L(ctx).eff, EL_COL[me]); } }
  dmg = Math.max(1, Math.round(dmg)); const hp0 = mo.hp; ST.selfHit = true;
  try { ctx.monsters.damage(mo, dmg, opts.src || C, 0.3, kb); } finally { ST.selfHit = false; } if (ctx.envfx) { try { ctx.envfx.hit(mo.x, mo.y + 2, 9 + Math.min(3, mul) * 5, SP[C.id].el, Math.min(1.5, 0.4 + mul * 0.3)); } catch (e) { } }   /* p105 */
  ST.hitC = { mo, t: ctx.S.time, C }; tamCheck(ctx, mo);
  k.lk = Math.min(LK_MAX, (k.lk || 0) + 9); gainXp(ctx, k, Math.max(1, dmg * 0.4) + (hp0 > 0 && mo.hp <= 0 && !mo.c.lt ? 20 : 0));
  return dmg;
}
function gainXp(ctx, k, n) {
  if (k.lv >= LV_MAX) return; k.xp = (k.xp || 0) + n; let up = false;
  while (k.lv < LV_MAX && k.xp >= needXp(k.lv)) { k.xp -= needXp(k.lv); k.lv++; up = true; ST.stats.lv++; if (k.hp != null) k.hp += 12; }   /* lên cấp: máu tối đa +12 → máu hiện tại cũng +12 */
  if (up) { const C = ST.c, id = C && C.id; if (id) { const n2 = nameOf(ctx, id, k.evo); if (ctx.pop) ctx.pop(C.x, C.y - headY(C) - 4, L(ctx).lvup(n2, k.lv), '#ffe08a'); if (ctx.vfx) ctx.vfx('level_up', C.x, C.y); if (k.lv >= EVO_LV && !k.evo) evolve(ctx, id); } ctx.persist(); }
}
function evolve(ctx, id) {
  const k = owned(ctx, id); if (!k || k.evo) return; const a = nameOf(ctx, id, 0); k.evo = 1; ST.stats.evo++; const C = ST.cs.find(c => c.id === id);
  if (C && C.id === id) { C.evoT = 1.2; if (ctx.vfx) { ctx.vfx('wf_power_burst_f', C.x, C.y + 2); ctx.vfx('spar_transform', C.x, C.y); } sheetImg(formOf(id, 1)); }
  ctx.toast(L(ctx).evo(a, nameOf(ctx, id, 1)), true); ctx.sfx('win'); log('evolve ' + id); ctx.persist();
}

/* ---------------- dừng hình ngắn (như rockycore — chỉ khi đòn lớn) ---------------- */
function hitStop(ctx, ms) { if (!ctx.S || ctx.S.mode !== 'play') return; if (!ST.stopOn && (ctx.S.timeScale ?? 1) !== 1) return; ST.stopUntil = performance.now() + ms; if (!ST.stopOn) { ST.stopOn = true; ctx.S.timeScale = 0.04; } }
function stopTick(ctx) { if (ST.stopOn && (performance.now() >= ST.stopUntil || ctx.S.mode !== 'play')) { ST.stopOn = false; if (ctx.S.timeScale === 0.04) ctx.S.timeScale = 1; } }

/* ---------------- TAM KÍCH: người + Rocky + linh thú trúng cùng 1 mục tiêu trong 0,8 s ---------------- */
const WR = new WeakSet();
function wrapDamage(ctx) {
  const M = ctx.monsters; if (!M || !M.damage || WR.has(M)) return; WR.add(M); const d0 = M.damage;
  M.damage = function (mo, dmg, src, ...a) { const r = d0.call(this, mo, dmg, src, ...a); try { const re = ctx.rocky && ctx.rocky.ent && ctx.rocky.ent(); if (re && src === re && mo) { ST.hitR = { mo, t: ctx.S.time }; ST.stats.rHit = (ST.stats.rHit || 0) + 1; tamCheck(ctx, mo); } } catch (e) { } return r; };
  M.damage.__lt = true;
}
const WRH = new WeakSet();
function wrapHero(ctx) {   /* Phân Thân (Tắc Kè): đòn trúng người chơi lúc có bóng mờ → giảm 50 % (trùm đánh nhầm bóng) */
  const h = ctx.hero; if (!h || WRH.has(h)) return; WRH.add(h); const h0 = h.hit;
  h.hit = function (d, ...a) { if (ST.parry && ST.ctx && ST.ctx.S.time < ST.parry.until && d > 0) { ST.parry = null; return false; } if (ST.decoys && ST.ctx && ST.ctx.S.time < ST.decoys.until && d > 0) { const D = ST.decoys, q = D.list && D.list.shift(); if (q || !D.list) d = Math.max(1, Math.round(d * 0.5)); if (q && ST.ctx.vfx) ST.ctx.vfx('gm_shatter', q.x, q.y - 4); if (D.list && !D.list.length) ST.decoys = null; }   /* đòn trúng người chơi: 1 bóng Phân Thân vỡ thay (giảm nửa sát thương) */ if (ST.feed) ST.feed.hurt = true; return h0.call(this, d, ...a); };
}
function pollPlayerHit(ctx) {
  const M = ctx.monsters; if (!M || !M.lastHitT) return; const lt = M.lastHitT(); if (!(lt > ST.pHitT)) return; ST.pHitT = lt;
  const p = ctx.S.player; let best = null, bd = 44; for (const mo of mons(ctx)) { const d = dst(mo, p) - (isBoss(mo) ? 60 : 0); if (d < bd) { bd = d; best = mo; } }   /* trùm to: tâm xa chỗ chém */
  if (best) { ST.hitP = { mo: best, t: lt }; ST.stats.pHit = (ST.stats.pHit || 0) + 1; tamCheck(ctx, best); }
}
function tamCheck(ctx, mo) {
  const t = ctx.S.time, ok = h => h && h.mo === mo && t - h.t <= 1.0; if (ST.tamCd > t || ST.inTam || !(ST.hitC && ST.hitC.C) || !ok(ST.hitP) || !ok(ST.hitR) || !ok(ST.hitC)) return;
  ST.inTam = true; ST.tamCd = t + 8; ST.stats.tam++; log('TAM ' + (mo.c && mo.c.key));
  try { const k = owned(ctx, ST.hitC.C.id), bonus = (ctx.hero ? ctx.hero.atk : 10) * 1.5 + atkOf(k ? k.lv : 1) * 1.5; if (ctx.vfx) { ctx.vfx('rc_combo', mo.x, mo.y + 2); ctx.vfx('hr_boom', mo.x, mo.y); } ctx.monsters.damage(mo, Math.round(bonus), ctx.S.player, 0.3, isBoss(mo) ? 0 : 140);
    if (ctx.pop) ctx.pop(mo.x, mo.y - 32, L(ctx).tam, '#ffd45e'); hitStop(ctx, 90); if (ctx.quake) ctx.quake(0.2); ctx.sfx('smash'); }
  finally { ST.inTam = false; ST.hitP = ST.hitR = ST.hitC = null; }
}

/* ---------------- ổ + linh thú hoang ---------------- */
function denSpot(ctx) {
  const m = ctx.S.map, z = ctx.S.zone.id; if (!m || !ctx.freeTiles || !ctx.rngFrom) return null;
  const rng = ctx.rngFrom((ctx.hashStr ? ctx.hashStr('ltden:' + z) : 7) >>> 0), ent = Object.values(m.entries || {}).filter(Boolean);
  const covered = q => (m.objects || []).some(o => /tree|pine|palm|bamboo/.test(o.type) && o.y > q.y - 1 && o.y <= q.y + 3 && Math.abs(o.x - q.x) <= 2);   /* 2026-10-15: ổ dưới tán cây (Sao La M3 giữa rừng rậm) → người chơi không thấy để bắt; ứng viên đầu trùng cách chọn cũ nên vùng khác giữ nguyên chỗ */
  let r = null; for (const md of [14, 8, 4, 2]) { const L = ctx.freeTiles(m, rng, { x: 3, y: 3, w: m.w - 6, h: m.h - 6 }, 40, ent, md, 2); const yard = q => (m.plots || []).some(P => q.x >= P.x - 2 && q.x < P.x + P.w + 2 && q.y >= P.y - 2 && q.y < P.y + P.h + 2); r = L.find(q => !covered(q) && !yard(q)) || L.find(q => !covered(q)) || L[0];   /* cũng tránh sân quốc gia (plot) — ổ thú hoang không nằm giữa sân Leader */ if (r) break; }   /* Biển: đảo nhỏ sát bến → nới khoảng cách tới lối vào */
  if (!r) {   /* Biển: lối vào nằm trên bè giữa nước → tầm đi bộ rỗng; chọn ô đất / cát sát nước bất kỳ (cố định theo vùng) */
    const T = ctx.T || {}, W = [T.WATER, T.DEEP, T.REEF], C2 = [];
    for (let y = 3; y < m.h - 3; y++) for (let x = 3; x < m.w - 3; x++) { if (ctx.isSolid(m, x, y) || (ctx.hasObjectAt && ctx.hasObjectAt(m, x, y))) continue; if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => W.includes(ctx.getG(m, x + a, y + b)))) C2.push({ x, y }); }
    if (C2.length) r = C2[Math.floor(rng() * C2.length)];
  }
  return r ? { tx: r.x, ty: r.y, x: r.x * TS + 8, y: r.y * TS + 12 } : null;
}
function spawnWild(ctx) {
  const id = ZONE_SP[ctx.S.zone.id]; if (!id || !ENABLED.has(id) || owned(ctx, id) || !ST.den || !ctx.monsters || !ctx.monsters.add) return null;
  const lv = CATCH_LV[id], hp = 40 + lv * 14, s = SP[id];
  const c = { key: 'lt_' + id, lt: id, vi: s.vi + ' (hoang)', en: 'Wild ' + s.en, hp, sp: 30, dmg: 4 + Math.round(lv * 0.9), xp: 0, fly: s.move === 'fly', float: s.move === 'float', aiFn: wildAi, drawFn: wildDraw,
    onFall: mo => { mo.hp = Math.max(1, Math.round(mo.max * 0.05)); tire(ctx, mo); return true; } };
  const w0 = fishOnly(id) ? waterNear(ctx, ST.den.x, ST.den.y, 8) : null, hx = w0 ? w0.x : ST.den.x + 14, hy = w0 ? w0.y : ST.den.y + 6;   /* cá: bơi ở ô nước gần ổ */
  const mo = ctx.monsters.add(c, hx, hy); mo.lt = { dir: 'south', t: 0, wT: 0, gx: hx, gy: hy, hx, hy, cd: 2 + Math.random() * 2, cast: 0 }; ST.wild = mo; log('wild ' + id); return mo;
}
function tire(ctx, mo) { if (mo.tired) return; mo.tired = true; mo.angry = false; mo.lt.cast = 0; if (ctx.pop) ctx.pop(mo.x, mo.y - 24, L(ctx).tired, '#ffe08a'); log('tired'); }
function wildAi(ctx, mo, dt, p, dp, canHit) {
  const W = mo.lt, s = SP[mo.c.lt]; W.t += dt; if (W.cast > 0) W.cast -= dt;
  if (mo.tired) { if (dp > 220 && !ST.feed) { mo.tired = false; mo.hp = mo.max; mo.x = W.hx; mo.y = W.hy; if (ctx.toast) ctx.toast(L(ctx).back); } return; }
  if (mo.hp <= mo.max * 0.3) { tire(ctx, mo); return; }
  const aggro = canHit && (mo.angry || dp < 70) && dp < 200;
  let tx = W.gx, ty = W.gy, sp = 22;
  if (aggro) { const d = dp || 1; if (dp < 42) { tx = mo.x + (mo.x - p.x) / d * 30; ty = mo.y + (mo.y - p.y) / d * 30; } else if (dp > 90) { tx = p.x; ty = p.y; } else { tx = mo.x; ty = mo.y; } sp = 34;
    W.dir = dirOf(p.x - mo.x, p.y - mo.y, W.dir); W.cd -= dt;
    if (W.cd <= 0 && dp < 140) { W.cd = (s.s1.cd || 6) * 0.9 + 1; W.cast = 0.6; wildCast(ctx, mo, p); } }
  else { W.wT -= dt; if (W.wT <= 0 && ST.den) { W.wT = 2 + Math.random() * 2.5; const a = Math.random() * TAU, r = 10 + Math.random() * 34; W.gx = W.hx + Math.cos(a) * r; W.gy = W.hy + Math.sin(a) * r * 0.7; } }
  const dx = tx - mo.x, dy = ty - mo.y, dd = Math.hypot(dx, dy);
  if (dd > 3 && !(W.cast > 0)) { const st = Math.min(dd, sp * dt), nx = mo.x + dx / dd * st, ny = mo.y + dy / dd * st, m = ctx.S.map; const wOk = !fishOnly(mo.c.lt) || waterNear(ctx, nx, ny, 0); if (wOk && (s.move === 'fly' || s.move === 'float' || !ctx.isSolid(m, Math.floor(nx / TS), Math.floor((ny - 2) / TS)))) { mo.x = nx; mo.y = ny; } if (!aggro) W.dir = dirOf(dx, dy, W.dir); W.moving = true; } else W.moving = false;
}
function wildCast(ctx, mo, p) {   /* linh thú hoang tự vệ bằng linh năng (bản nhẹ: lao / bắn) — khai báo cho Ki để người chơi né được */
  const s = SP[mo.c.lt], sk = s.s1, ang = Math.atan2(p.y - 6 - mo.y, p.x - mo.x), melee = sk.kind === 'dash' || sk.kind === 'peck' || sk.kind === 'burrow' || !envOk(ctx, mo.c.lt, mo.x, mo.y);
  if (melee) { const tx = p.x, ty = p.y; const id = ctx.threat && ctx.threat.add ? ctx.threat.add({ kind: 'lunge', from: { x: mo.x, y: mo.y }, to: { x: tx, y: ty - 6 }, in: 0.55, dur: 0.2, width: 18 }) : null;
    ST.timers.push({ t: 0.55, fn: () => { if (!ST.ctx) return; mo.x += (tx - mo.x) * 0.7; mo.y += (ty - mo.y) * 0.7; if (sk.hit && ctx.vfx) ctx.vfx(sk.hit, tx, ty); if (Math.hypot(p.x - tx, p.y - ty) < 18 && ctx.hero) ctx.hero.hit(mo.c.dmg); if (id && ctx.threat) ctx.threat.remove(id); } }); }
  else { const sp = 150, life = 1.1, b = { x: mo.x, y: mo.y - 6, h: 6, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, life, t: 0, wild: mo, fx: sk.trav || 'dr_ballglow', hit: sk.hit || sk.fx || 'td_spark', dmg: mo.c.dmg };
    if (ctx.threat && ctx.threat.add) b.tid = ctx.threat.add({ kind: 'projectile', from: { x: b.x, y: b.y }, to: { x: b.x + b.vx * life, y: b.y + b.vy * life }, speed: sp, t0: ctx.S.time, width: 10 });
    ST.proj.push(b); }
  ctx.sfx('squeak');
}
function wildDraw(g, mo, x, y) {
  const id = mo.c.lt, W = mo.lt || { dir: 'south', t: 0 }, lift = floaty(id) && !mo.tired ? (SP[id].flyH || 5) : 0;
  if (SHADOW.on) shadowFor(g, mo.x, mo.y, x, y, 12, lift); else { g.save(); g.globalAlpha = 0.25; g.fillStyle = '#000'; g.beginPath(); g.ellipse(x, y, 6, 2, 0, 0, TAU); g.fill(); g.restore(); }   /* plan-66 */
  const clip = mo.tired ? 'rest' : W.cast > 0 ? 'cast' : W.moving ? 'walk' : 'idle', dir = mo.tired ? 'south' : W.dir;
  if (!drawForm(g, formOf(id, 0), clip, dir, W.t, x, y - lift, mo.flash > 0 ? 0.6 : 1, clip === 'rest' ? 4 : 8)) { g.fillStyle = EL_COL[SP[id].el]; g.fillRect(x - 5, y - 10 - lift, 10, 10); }
}

/* ---------------- linh thú đi cùng ---------------- */
function hiddenNow(ctx, ok = {}) {   /* 2026-10-15: người chơi bị hất bay không còn làm linh thú chớp tắt (trước đây cóc biến mất mỗi lần người chơi bị đánh bay) */ const S = ctx.S, p = S.player; return !!((ctx.alt && ctx.alt.h && ctx.alt.h() > 2) || (S.sea && S.sea.riding) || (S.swimming && !ok.swim) || (S.map && S.map.under && !ok.under) || (S.map && S.map.sky && !(S.zone && S.zone.id === 'sky_bakunawa')) || (S.zone && /^(mind_|sky_lyron)/.test(S.zone.id)) || (p && p.custom && !(ctx.air && ctx.air.on && ctx.air.on()) && !(ctx.knocked && ctx.knocked()) && !(ok.swim && (S.swimming || (S.map && S.map.under) || (WATER.depth && p && WATER.depth(p.x, p.y) > 0)))) || S.mode === 'bkcarry'); }
const swimmer = id => amphib(id) || fishOnly(id);   /* 2026-10-15 anh 'cóc có thể bơi dưới nước': Cóc / Cóc Thần Vũ (lưỡng cư), Cá Chép / Long Ngư (cá) bơi theo người chơi */
function hiddenFor(ctx, C) { return swimmer(C.id) ? hiddenNow(ctx, { swim: true, under: true }) : hiddenNow(ctx); }   /* lặn: cá + cóc theo */   /* lặn khu dưới nước (u1–u4, Hang Ổ): chỉ CÁ theo — cóc nước ngọt không lặn biển sâu, tự về ấn */
const canOut = (ctx, id) => !mustRecallFor(ctx, { id }) && (!hiddenFor(ctx, { id }) || (fishOnly(id) && !!(ctx.S.sea && ctx.S.sea.riding)));   /* con nào ném ra được lúc này */
function mustRecallFor(ctx, C) { const S = ctx.S; if (fishOnly(C.id)) return !!(ctx.alt && ctx.alt.h && ctx.alt.h() > 2); return !!((ctx.alt && ctx.alt.h && ctx.alt.h() > 2) || (S.sea && S.sea.riding) || (S.swimming && !swimmer(C.id)) || (S.map && S.map.under && !swimmer(C.id))); }   /* đi bè / ván / cá voi: vẫn về ấn (cá thì bơi cạnh bè như cũ) */
function mustRecall(ctx) { const S = ctx.S; return !!((ctx.alt && ctx.alt.h && ctx.alt.h() > 2) || (S.sea && S.sea.riding) || S.swimming || (S.map && S.map.under)); }   /* 2026-10-15: các chỗ BẮT BUỘC về ấn (anh: chỉ khi kỹ thuật buộc) */
function mkC(ctx, id, p, i) { const C = { id, x: p.x - 18 + i * 14, y: p.y + 4 + i * 4, dir: 'south', t: 0, cast: null, cd1: 2 + i * 0.5, cd2: 6 + i, stuck: 0, evoT: 0, moving: false, lift: 0, slot: i }; if (!floaty(id) && !hopFree(ctx, C, C.x, C.y)) teleport(ctx, C, p, true); loadMeta();   /* 2026-10-16: chỗ đặt lệch cố định có thể nằm trong đá (hang M4) → tìm chỗ đi được cạnh người */ const k = owned(ctx, id); sheetImg(formOf(id, k.evo)); log('companion ' + id); return C; }
function spawnCompanion(ctx) {   /* dựng lại CẢ ĐỘI đang ở ngoài (giữ con đã có, thêm con mới, bỏ con đang nghỉ / đang bay trong quả cầu) */
  const k = sv(ctx), T = teamIds(ctx), p = ctx.S.player; if (!k.out || !T.length) { ST.cs = []; ST.c = null; return; } if (!p) return;
  const want = T.filter(id => ST.outSet.has(id) && !(restLeft(ctx, id) > 0) && !ST.pending.has(id)), old = ST.cs || [];   /* chỉ những con ĐÃ ném ra lượt này (con vừa dậy sau nghỉ / vừa thêm vào đội chờ lần Gọi sau) */
  ST.cs = want.map((id, i) => { const c = old.find(q => q.id === id) || mkC(ctx, id, p, i); c.slot = i; return c; }); ST.c = ST.cs[0] || null;
}
function follow(ctx, C, dt) {
  const p = ctx.S.player, re = ctx.rocky && ctx.rocky.pos ? ctx.rocky.pos() : null, side = re ? (re.x < p.x ? 1 : -1) : -1;
  const fv = { south: [0, 1], north: [0, -1], east: [1, 0], west: [-1, 0] }[['south', 'west', 'east', 'north'][p.dir] || 'south'] || [0, 1];
  const sl = C.slot || 0; let gx = p.x - fv[0] * (16 + sl * 6) + side * (16 + sl * 13), gy = p.y - fv[1] * (12 + sl * 5) + 4 + (sl === 2 ? -10 : 0); if (fishOnly(C.id) && C.water && !wetAt(ctx, gx, gy)) { const w2 = waterNear(ctx, gx, gy, 5) || C.water; gx = w2.x; gy = w2.y; }   /* đội 2–3 con: mỗi con một chỗ quanh người chơi */   /* 2026-10-15 cá: chỗ cạnh người chơi nếu là nước (người đang bơi → cá bơi BÊN CẠNH, không chui dưới mặt), không thì ô nước gần chỗ đó nhất */
  const dx = gx - C.x, dy = gy - C.y, d = Math.hypot(dx, dy), far = dst(C, p);
  if (far > 130) { teleport(ctx, C, p); return; }
  if (hopMove(ctx, C, gx, gy, dt, far, 'follow')) { if (!C.moving && !C.hw) C.dir = ['south', 'west', 'east', 'north'][p.dir] || C.dir; return; }   /* Cóc: nhảy cóc */
  if (d > 6) { const sp = (far > 60 ? 135 : 86) * dt, st = Math.min(d, sp), nx = C.x + dx / d * st, ny = C.y + dy / d * st, m = ctx.S.map;
    const free = (x, y) => floaty(C.id) || (amphib(C.id) && ctx.S.map && ctx.S.map.under) || !ctx.isSolid(m, Math.floor(x / TS), Math.floor((y - 2) / TS)) || (amphib(C.id) && wetAt(ctx, x, y - 2));
    if (free(nx, ny)) { C.x = nx; C.y = ny; C.stuck = 0; } else if (free(nx, C.y)) { C.x = nx; C.stuck += dt * 0.5; } else if (free(C.x, ny)) { C.y = ny; C.stuck += dt * 0.5; } else C.stuck += dt;
    if (C.stuck > 0.9) teleport(ctx, C, p); C.dir = dirOf(dx, dy, C.dir); C.moving = true; }
  else { C.moving = false; C.dir = ['south', 'west', 'east', 'north'][p.dir] || C.dir; }
}
function hunt(ctx, C, dt) {
  if (landOnly(C.id) && wetAt(ctx, C.x, C.y) && !C.kfly) { const sh = shoreNear(ctx, C.x, C.y); if (sh) { C.x = sh.x; C.y = sh.y; if (ctx.vfx) ctx.vfx('dirt_puff', C.x, C.y + 1); } }   /* 2026-10-15 (anh: 'ném cóc ra thì nó cực kỳ háo chiến'): không đứng chơi — lao tới quái / trùm gần nhất (trong dây 170 px quanh người chơi) */
  const p = ctx.S.player, tg = pickTarget(ctx, C), s = SP[C.id];
  if (!tg || dst(tg, p) > 170 || fishOnly(C.id)) { follow(ctx, C, dt); if (!C.moving && !C.cast && !tg) { if ((C.fidT = (C.fidT ?? 0.6) - dt) <= 0) { C.fidT = 0.8 + Math.random() * 0.7; if (SP[C.id].move !== 'walk4') C.hop = { t: 0, T: 0.32 };   /* 2026-10-16: loài đi bộ không nhún khi đứng yên (chỉ quay hướng) */ if (Math.random() < 0.5) C.dir = ['south', 'east', 'west', 'north'][(Math.random() * 3) | 0]; } } return; }   /* hết quái: nhảy tại chỗ sốt ruột (clip jump có sẵn, không VFX) */
  const want = Math.max(18, Math.min(64, (s.s1.range || 60) * 0.65)), dx = tg.x - C.x, dy = tg.y - C.y, d = Math.hypot(dx, dy) || 1;
  if (d > want && hopper(C.id) && hopMove(ctx, C, C.x + dx / d * (d - want), C.y + dy / d * (d - want), dt, dst(C, p), 'hunt')) { C.dir = dirOf(dx, dy, C.dir); return; }   /* lao tới quái: nhảy */
  if (d > want) { const st = Math.min(d - want, 120 * dt), nx = C.x + dx / d * st, ny = C.y + dy / d * st, m = ctx.S.map, free = (x, y) => floaty(C.id) || (amphib(C.id) && ctx.S.map && ctx.S.map.under) || !ctx.isSolid(m, Math.floor(x / TS), Math.floor((y - 2) / TS)) || (amphib(C.id) && wetAt(ctx, x, y - 2));
    if (free(nx, ny)) { C.x = nx; C.y = ny; C.stuck = 0; } else if (free(nx, C.y)) C.x = nx; else if (free(C.x, ny)) C.y = ny; else { C.stuck += dt; if (C.stuck > 1.2) teleport(ctx, C, p); } C.moving = true; } else C.moving = false;
  C.dir = dirOf(dx, dy, C.dir);
}
function teleport(ctx, C, p, quiet) { if (ctx.vfx && !quiet) ctx.vfx('monster_poof', C.x, C.y); if (fishOnly(C.id) && C.water) { C.x = C.water.x; C.y = C.water.y; if (ctx.vfx) ctx.vfx('bk_kick_water', C.x, C.y); C.stuck = 0; return; } const sd = Math.random() < 0.5 ? -1 : 1; let sp = null; for (const [ox, oy] of [[16 * sd, 6], [-16 * sd, 6], [0, 14], [10 * sd, -6], [-10 * sd, -6], [24 * sd, 6], [-24 * sd, 6], [0, -10]]) { const x = p.x + ox, y = p.y + oy; if (floaty(C.id) || (hopFree(ctx, C, x, y) && !(landOnly(C.id) && wetAt(ctx, x, y)))) { sp = { x, y }; break; } } if (!sp) sp = { x: p.x, y: p.y + 2 }; C.x = sp.x; C.y = sp.y; C.stuck = 0; if (ctx.vfx && !quiet) ctx.vfx('dirt_puff', C.x, C.y); }   /* 2026-10-16: chỗ về cạnh người phải ĐI ĐƯỢC (trước đây ±16 px cố định → ở hang M4 Chũi bị đặt vào đá) */

/* ---------------- NHẢY CÓC khi di chuyển (2026-10-15 anh: 'cóc di chuyển là nhảy theo anh') ----------------
   Loài có cờ hopWalk (chỉ Cóc / Cóc Thần Vũ): trên cạn mỗi bước là 1 cú nhảy cong (clip jump PixelLab, bóng nằm yên dưới đất, thân nâng theo parabol);
   gần người chơi thì đứng yên; người chơi xa → nhảy dài + dồn dập hơn (có trần); lao tới quái cũng nhảy. Trong nước (cả chỗ đi lẫn chỗ tới) thì bơi như cũ.
   Đáp: búi đất pixel nhỏ (footstep_dust) cách 1 cú; qua mép nước: tia nước pixel nhỏ (water_splash). Đường nhảy dừng ở vật cứng đầu tiên. */
const hopper = id => !!(SP[id] && SP[id].hopWalk);
function hopFree(ctx, C, x, y) { const m = ctx.S.map; return !ctx.isSolid(m, Math.floor(x / TS), Math.floor((y - 2) / TS)) || (amphib(C.id) && wetAt(ctx, x, y - 2)); }
function hopMove(ctx, C, gx, gy, dt, far, mode) {   /* → true nếu đã xử lý (nhảy / nghỉ giữa 2 cú / đứng yên) */
  const dx = gx - C.x, dy = gy - C.y, d = Math.hypot(dx, dy); if (!hopper(C.id) || (ctx.S.map && ctx.S.map.under)) return false;   /* dưới nước: bơi, không nhảy */
  const ux = dx / (d || 1), uy = dy / (d || 1); if (wetAt(ctx, C.x, C.y) && wetAt(ctx, C.x + ux * 12, C.y + uy * 12)) return false;   /* đang ở nước và đi tiếp trong nước → bơi */
  if ((C.hwRest = (C.hwRest || 0) - dt) > 0) { C.moving = false; return true; }
  if (d < (mode === 'hunt' ? 4 : 11)) { C.moving = false; return mode !== 'hunt'; }   /* gần chỗ cần đứng: không nhảy */
  const Lmax = mode === 'hunt' ? 28 : far > 90 ? 38 : far > 60 ? 32 : far > 36 ? 24 : 17, L = Math.min(d, Lmax); let s = 0;
  for (let q = 2; q <= L; q += 2) { if (!hopFree(ctx, C, C.x + ux * q, C.y + uy * q)) break; s = q; }   /* dừng ở vật cứng đầu tiên */
  if (s < 4) { C.stuck = (C.stuck || 0) + 0.35; if (C.stuck > 1.2) teleport(ctx, C, ctx.S.player); C.hwRest = 0.2; return true; }
  const T = 0.24 + s / 320, wet0 = wetAt(ctx, C.x, C.y), x1 = C.x + ux * s, y1 = C.y + uy * s;
  C.hw = { x0: C.x, y0: C.y, x1, y1, t: 0, T, H: 2.5 + s * 0.09, wet0, rest: mode === 'hunt' ? 0.08 : far > 90 ? 0.03 : far > 60 ? 0.07 : far > 36 ? 0.12 : 0.2 };
  C.dir = dirOf(dx, dy, C.dir); C.moving = true; C.stuck = 0; ST.stats.hops = (ST.stats.hops || 0) + 1;
  if (wet0 && !wetAt(ctx, x1, y1) && ctx.vfx) ctx.vfx('water_splash', C.x, C.y + 1);   /* nhảy từ nước lên bờ */
  return true;
}
function hwTick(ctx, C, dt) {
  const H = C.hw; H.t += dt; const u = Math.min(1, H.t / H.T), nx = H.x0 + (H.x1 - H.x0) * u, ny = H.y0 + (H.y1 - H.y0) * u;
  if (hopFree(ctx, C, nx, ny)) { C.x = nx; C.y = ny; } else H.t = H.T;   /* vật cứng mọc ra giữa đường (cửa / NPC): đáp ngay */
  C.lift = Math.sin(u * Math.PI) * H.H;
  if (H.t >= H.T) { C.hw = null; C.lift = 0; C.hwRest = H.rest; const wet1 = wetAt(ctx, C.x, C.y);
    if (wet1 && !H.wet0) { if (ctx.vfx) ctx.vfx('water_splash', C.x, C.y + 1); }   /* nhảy ùm xuống nước: tia nước pixel nhỏ */
    else if (!wet1 && (C.hwN = (C.hwN || 0) + 1) % 2 === 0) ((ST.ctx && ST.ctx.wfx && ST.ctx.wfx('step', C.x, C.y + 1, {})) || (ST.hdust ||= []).push({ x: C.x, y: C.y + 1, t: 0 }));   /* plan-69 */   /* búi bụi PixelLab NHỎ (Coc hop dust mini, 12×10 logic) */   /* bụi đất pixel nhỏ, cách 1 cú */
    ST.stats.hopLand = (ST.stats.hopLand || 0) + 1; }
}

/* ---------------- chiêu ---------------- */
function readyS2(ctx, k) { return k.lv >= SUPER_LV && (k.lk || 0) >= LK_MAX; }
function think(ctx, C, dt) {
  const k = owned(ctx, C.id); if (!k) return; C.cd1 -= dt; C.cd2 -= dt;
  const tg = pickTarget(ctx, C); if (tg) k.lk = Math.min(LK_MAX, (k.lk || 0) + dt * 1.2);
  if (C.jump || C.hw) return;   /* đang nhảy (chiêu 2 / nhảy cóc): chờ đáp mới ra chiêu */
  if (tg && !C.cast) { const s0 = SP[C.id], d0 = dst(tg, C), wet0 = envOk(ctx, C.id, C.x, C.y);   /* 2026-10-15 HÁO CHIẾN: chiêu MẠNH trước — (tuyệt chiêu khi có) > siêu năng > nhảy vũng > linh năng */
    if (s0.s3 && k.lv >= EVO_LV && (k.evo || !s0.s3.evo) && (k.lk || 0) >= LK_MAX && (C.cd3 = (C.cd3 ?? 0) - dt) <= 0 && (wet0 || !waterSkill(C.id, s0.s3)) && d0 <= s0.s3.range) { cast(ctx, C, 3, tg); return; }
    if (readyS2(ctx, k) && C.cd2 <= 0 && !(SP[C.id].s2.kind === 'rain' && rainOn()) && !(ctx.S.map && ctx.S.map.under && SP[C.id].s2.kind === 'rain') && (wet0 || !waterSkill(C.id, s0.s2)) && d0 <= s0.s2.range + (isBoss(tg) ? 30 : 0)) { cast(ctx, C, 2, tg); return; } }
  if (amphib(C.id) && tg && !C.cast) { const SJ = SP[C.id].sj; C.cdJ = (C.cdJ ?? 0) - dt;
    if (SJ && C.cdJ <= 0) { const w = slamSpot(ctx, C, tg, SJ); if (w) { C.chainN = 0; startJump(ctx, C, w, SJ); return; } }   /* CHIÊU 2 Nhảy Vũng Dập Nước */
    if ((C.jumpCd = (C.jumpCd || 0) - dt) <= 0) { const w = waterNear(ctx, tg.x, tg.y, 5); if (w && Math.hypot(w.x - C.x, w.y - C.y) > 14 && Math.hypot(w.x - C.x, w.y - C.y) < 170) { startJump(ctx, C, w); return; } } }
  if (C.cast || !tg) return; const s = SP[C.id], d = dst(tg, C), wet = envOk(ctx, C.id, C.x, C.y), okSk = sk => wet || !waterSkill(C.id, sk);   /* Lưỡi Dính không phải phép nước (plan-39 'Cóc — bộ chiêu chốt') */
  if (readyS2(ctx, k) && C.cd2 <= 0 && !(SP[C.id].s2.kind === 'rain' && rainOn()) && !(ctx.S.map && ctx.S.map.under && SP[C.id].s2.kind === 'rain') && okSk(s.s2) && d <= s.s2.range + (isBoss(tg) ? 30 : 0)) { cast(ctx, C, 2, tg); return; }
  if (C.cd1 <= 0 && okSk(s.s1) && d <= s.s1.range + (isBoss(tg) ? 30 : 0)) cast(ctx, C, 1, tg);
}
function startJump(ctx, C, w, sk) { C.hw = null;   /* cú nhảy cong sang vũng nước (ô nước của map / ao tự đào) gần mục tiêu; sk = chiêu 2 → đáp xuống DẬP nước */
  const d = Math.hypot(w.x - C.x, w.y - C.y); C.jump = { x0: C.x, y0: C.y, x1: w.x, y1: w.y, t: 0, T: sk ? Math.min(0.7, 0.42 + d / 450) : Math.min(0.75, 0.35 + d / 400), w, sk, H: sk ? 13 : 11 }; C.dir = dirOf(w.x - C.x, w.y - C.y, C.dir); ctx.sfx('squeak'); log('jump ' + Math.round(C.x) + ',' + Math.round(C.y) + ' → ' + w.tx + ',' + w.ty);
}
function jumpTick(ctx, C, dt) {
  const J = C.jump; if (!J) return; J.t += dt; const u = Math.min(1, J.t / J.T); C.x = J.x0 + (J.x1 - J.x0) * u; C.y = J.y0 + (J.y1 - J.y0) * u; C.lift = Math.sin(u * Math.PI) * (J.H || 14);
  if (u >= 1 && J.sk) { C.jump = null; C.lift = 0; slamLand(ctx, C, J); return; }
  if (u >= 1) { C.jump = null; C.lift = 0; C.jumpCd = 1.4; C.holdT = 2.2; C.cd1 = Math.min(C.cd1, 0.2); if (ctx.vfx && !ctx.vfx('water_splash', C.x, C.y + 2)) ctx.vfx('bk_kick_water', C.x, C.y + 2);   /* tia nước pixel NHỎ (16 px) khi cóc tiếp nước */ ST.stats.jumps = (ST.stats.jumps || 0) + 1; (ST.pools ||= []).push(J.w.tx + ',' + J.w.ty); log('land pool ' + J.w.tx + ',' + J.w.ty); }
}
function cast(ctx, C, slot, tg) {
  const s = SP[C.id], sk = slot === 3 ? s.s3 : slot === 2 ? s.s2 : s.s1, k = owned(ctx, C.id); if (!sk || !k) return false;   /* slot 3 = tuyệt chiêu (khi loài có s3) */
  if (slot === 3) { k.lk = 0; C.cd3 = sk.cd; } else if (slot === 2) { k.lk = 0; C.cd2 = sk.cd; } else C.cd1 = sk.cd * (ctx.gfxLow && ctx.gfxLow() ? 1.15 : 1);
  C.cast = { slot, sk, tg, t: 0, T: sk.kind === 'cannon' ? (sk.windup || 0.6) + (sk.dur || 0.8) + 0.15 : sk.kind === 'rain' ? 1.0 : sk.kind === 'burrow' ? 1.0 : sk.kind === 'dash' || sk.kind === 'leap' || sk.kind === 'grab' || sk.kind === 'pull' ? 0.9 : 0.6, fired: false };   /* pull 0,9 s: há → lưỡi 0,36 s → khép miệng */ C.dir = dirOf(tg.x - C.x, tg.y - C.y, C.dir);
  ST.stats.casts[sk.kind + slot] = (ST.stats.casts[sk.kind + slot] || 0) + 1; log('cast ' + C.id + ' ' + slot + ' ' + sk.kind + ' @' + Math.floor(C.x / TS) + ',' + Math.floor(C.y / TS) + (wetAt(ctx, C.x, C.y) ? ' wet' : '') + ' → ' + (tg.c && tg.c.key)); if (amphib(C.id)) (ST.castAt ||= []).push(Math.floor(C.x / TS) + ',' + Math.floor(C.y / TS));
  if (slot >= 2 && ctx.pop) ctx.pop(C.x, C.y - headY(C) - 4, skName(ctx, sk) + '!', EL_COL[s.el]); ctx.sfx(slot >= 2 ? 'roar' : 'squeak'); return true;
}
function burrowSpot(ctx, C, tx, ty, A) {   /* chỗ trồi: sát mục tiêu, trên ô KHÔ đi được (không trồi vào nước / tường); không có thì trồi lại chỗ cũ */
  const side = C.x < tx ? -1 : 1; for (const [ox, oy] of [[6 * side, 4], [-6 * side, 4], [0, 9], [0, -5], [12 * side, 4], [-12 * side, 4], [0, 15]]) if (dryAt(ctx, tx + ox, ty + oy)) return { x: tx + ox, y: ty + oy };
  return { x: A && A.x0 != null ? A.x0 : C.x, y: A && A.y0 != null ? A.y0 : C.y };
}
function burrowTick(ctx, C, A, alive) {   /* 2026-10-16 Chũi cute — ĐÀO HẦM: đào bằng vuốt (clip dig) 0–0,3 s, đất bung lúc chui (0,22 s); chạy NGẦM 0,3–0,62 s (bụi đất nhỏ nổi dọc đường hầm); 0,62 s trồi dưới chân địch (đất bung + sát thương); nảy nhẹ tới 0,9 s */
  const tg = A.tg; if (A.x0 == null) { A.x0 = C.x; A.y0 = C.y; }
  if (!A.dug && A.t >= 0.22) { A.dug = true; fxAt(ctx, A.sk.fx, C.x, C.y + 1); }
  if (A.t < 0.62 && alive && tg) A.bp = burrowSpot(ctx, C, tg.x, tg.y, A);
  C.hide = A.t > 0.3 && A.t < 0.62;
  if (C.hide && A.bp && (A.tr == null || A.t - A.tr > 0.09)) { A.tr = A.t; const u = Math.min(1, (A.t - 0.3) / 0.32); fxAt(ctx, A.sk.trail, A.x0 + (A.bp.x - A.x0) * u, A.y0 + (A.bp.y - A.y0) * u + 1); }
  C.lift = A.t >= 0.62 && A.t < 0.9 ? Math.sin((A.t - 0.62) / 0.28 * Math.PI) * 7 : 0;
}
function castTick(ctx, C, dt) {
  const A = C.cast; if (!A) return; A.t += dt; const sk = A.sk, tg = A.tg, alive = tg && tg.hp > 0 && mons(ctx).includes(tg);
  if (sk.kind === 'dash' && A.t > 0.15 && A.t < 0.55 && alive) { const dx = tg.x - C.x, dy = tg.y - C.y, d = Math.hypot(dx, dy) || 1; if (d > 12 && !A.shore) { const st = Math.min(d - 10, 300 * dt), nx = C.x + dx / d * st, ny = C.y + dy / d * st; if (landOnly(C.id) && !dryAt(ctx, nx, ny)) A.shore = true; else { C.x = nx; C.y = ny; } const fl = SP[C.id].move === 'fly', pq = ctx.S.player; if (sk.trail && ctx.vfx && Math.random() < (lowFx(ctx) ? 0.12 : 0.25) && !(fl && pq && Math.hypot(C.x - pq.x, C.y - pq.y) < 20)) (!OLD69() && fx69(ctx, sk.trail, C.x, C.y + 1)) || ctx.vfx(sk.trail, C.x + (Math.random() - 0.5) * 6, C.y + 1 - (fl ? Math.round(((SP[C.id].flyH || 5) + (C.lift || 0)) * 0.8) : 0));   /* vệt bụi pixel thưa; máy yếu giảm nửa; loài bay: vệt gió ngang thân, không rải sát người chơi */ } }
  if (sk.kind === 'leap') { C.lift = A.t < 0.7 ? Math.sin(Math.min(1, A.t / 0.7) * Math.PI) * 26 : 0; if (fishOnly(C.id)) leapGlide(ctx, C, A); }
  if (sk.kind === 'burrow') burrowTick(ctx, C, A, alive);
  if (!A.fired && A.t >= (sk.kind === 'cannon' ? (sk.windup || 0.6) : sk.kind === 'rain' ? 0.55 : sk.kind === 'dash' ? 0.5 : sk.kind === 'leap' ? 0.68 : sk.kind === 'burrow' ? 0.62 : 0.35)) { A.fired = true; try { fire(ctx, C, A, alive); } catch (e) { console.error('lt fire', e); } }
  if (SP[C.id].move === 'fly' && (sk.kind === 'dash' || sk.kind === 'grab')) { const a = A.t;   /* 2026-10-16 loài to bay (Đại Bàng): độ cao theo động tác */
    C.lift = sk.kind === 'dash' ? (a < 0.2 ? a / 0.2 * 10 : a < 0.55 ? 10 - (a - 0.2) / 0.35 * 14 : -4 + Math.min(1, (a - 0.55) / Math.max(0.05, A.T - 0.55)) * 4) : (a < 0.15 ? 0 : a < 0.45 ? (a - 0.15) / 0.3 * 16 : a < 0.6 ? 16 - (a - 0.45) / 0.15 * 19 : -3 + Math.min(1, (a - 0.6) / Math.max(0.05, A.T - 0.6)) * 3);
    if (sk.kind === 'grab' && alive && a > 0.08 && a < 0.45) { const dx = tg.x - C.x, dy = tg.y - C.y, d = Math.hypot(dx, dy) || 1; if (d > 10) { const st = Math.min(d - 8, 260 * dt); C.x += dx / d * st; C.y += dy / d * st; } } }
  if (sk.kind === 'peck' && SP[C.id].move === 'fly' && alive && A.t > 0.04 && A.t < 0.32) { const dx = tg.x - C.x, dy = tg.y - C.y, d = Math.hypot(dx, dy) || 1; if (d > 14) { const st = Math.min(d - 12, 280 * dt); C.x += dx / d * st; C.y += dy / d * st; } C.dir = dirOf(dx, dy, C.dir); }   /* Hạc sà tới mổ */
  if (A.t >= A.T) { C.cast = null; C.lift = 0; C.hide = false; }
}
const near = (ctx, x, y, r) => mons(ctx).filter(mo => Math.hypot(mo.x - x, mo.y - y) <= r + (isBoss(mo) ? 20 : 0));
const lowFx = ctx => !!(ctx.gfxLow && ctx.gfxLow());
function fire(ctx, C, A, alive) {
  const sk = A.sk, tg = A.tg, V = (n, x, y, dur) => fxAt(ctx, n, x, y, dur), tx = tg.x, ty = tg.y;
  switch (sk.kind) {
    case 'proj': { const n = lowFx(ctx) ? 1 : (sk.n || 1), M0 = mouthAt(ctx, C); for (let i = 0; i < n; i++) { const a = Math.atan2(ty - 6 - M0.y, tx - M0.x) + (n > 1 ? (i - (n - 1) / 2) * 0.22 : 0), sp = 190; ST.proj.push({ C, h: C.y - M0.y, x: M0.x, y: M0.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: (sk.range + 40) / sp, t: 0, fx: sk.trav, hit: sk.hit, mul: sk.mul, own: true, scale: sk.trav === 'arena_flame' ? 1.4 : 1 }); } break; }
    case 'pull': if (alive) { ST.tongue = { C, mo: tg, up: tg.y < C.y - 0.5 || C.dir === 'north', t: 0, T: 0.36, ext: 0.12, hold: 0.06, hit: false, sk }; } break;   /* LƯỠI DÍNH (plan-39 chiêu 1): duỗi 0,12 s → dính 0,06 s → cuộn về 0,18 s kéo quái nhỏ theo; trùm khựng 0,5 s */
    case 'dash': { const hn = SP[C.id].horn, ud = Math.hypot(tx - C.x, ty - C.y) || 1, hx = hn ? C.x + (tx - C.x) / ud * hn[0] : 0, hy = hn ? C.y + (ty - C.y) / ud * hn[0] * 0.5 - hn[1] : 0; for (const mo of near(ctx, C.x, C.y, 20)) { deal(ctx, mo, sk.mul, 120); if (hn) V(sk.hit, (hx + mo.x) / 2, (hy + mo.y - 6) / 2); else V(sk.hit, mo.x, mo.y); } } break;   /* 2026-10-15 loài to: tia trúng Húc Sừng ra ở mũi sừng (SP.horn = [tầm trước, độ cao] px logic) */
    case 'peck': if (alive) { deal(ctx, tg, sk.mul, 40); if (SP[C.id].mouth) { const M0 = mouthAt(ctx, C); V('td_spark', M0.x, M0.y); } V(sk.hit, tg.x, tg.y - 4);   /* 2026-10-16 Hạc: tia lửa điện ở mỏ */ ST.timers.push({ C, t: 0.18, fn: () => { if (tg.hp > 0) { deal(ctx, tg, sk.mul * 0.6, 30); V(sk.hit, tg.x + 3, tg.y - 6); } } }); } break;
    case 'cone': { const a0 = Math.atan2(ty - C.y, tx - C.x), M0 = mouthAt(ctx, C); if (CPFX[sk.fx]) fxAt(ctx, sk.fx, M0.x, M0.y, 0, Math.atan2(ty - 6 - M0.y, tx - M0.x), C.y, C); else V(sk.fx, C.x + Math.cos(a0) * 26, C.y + Math.sin(a0) * 26); for (const mo of near(ctx, C.x, C.y, sk.range)) { let da = Math.atan2(mo.y - C.y, mo.x - C.x) - a0; da = Math.atan2(Math.sin(da), Math.cos(da)); if (Math.abs(da) < 0.75 || isBoss(mo)) { deal(ctx, mo, sk.mul, 90); if (!isBoss(mo)) mo.stoneT = Math.max(mo.stoneT || 0, ctx.S.time + 0.5); } } break; }
    case 'rings': for (let i = 0; i < 3; i++) ST.timers.push({ C, t: i * 0.28, fn: () => { const c = C, r = 34 + i * 18; V((sk.fxs && sk.fxs[i]) || sk.fx, c.x, c.y); if (ctx.quake && i === 2) ctx.quake(0.12); for (const mo of near(ctx, c.x, c.y, r)) deal(ctx, mo, sk.mul, 70); } }); break;
    case 'rain': ST.fields = ST.fields.filter(f => f.kind !== 'rain'); { const c0 = rainCtr(ctx, tx, ty, sk.r); ST.fields.push({ C, kind: 'rain', x: c0.x, y: c0.y, r: sk.r, t: 0, dur: sk.dur, tick: 0, sk, nP: 0, code: !!(ctx.wfx && ctx.wfx('raincloud', c0.x, c0.y, { r: sk.r, dur: sk.dur })) });   /* plan-69: mây mưa code */ } ST.stats.rains = (ST.stats.rains || 0) + 1; { const f0 = ST.fields[ST.fields.length - 1]; log('rain @' + Math.round(f0.x) + ',' + Math.round(f0.y)); } ctx.sfx('water'); break;   /* 2026-10-15 Gọi Mưa v2: mây mưa PIXEL PixelLab (vẽ ở draw), 1 vùng mưa mỗi lúc */
    case 'vortex': ST.fields.push({ C, kind: 'vortex', x: tx, y: ty, r: sk.r, t: 0, dur: sk.dur, tick: 0, sk }); if (!V(sk.fx, tx, ty, sk.dur)) V('tr_sandwind', tx, ty, sk.dur); break;   /* LỐC CÁT: phễu lốc cát pixel thưa (bụi văng ở fieldTick); thiếu sheet thì về vệt gió cũ */
    case 'fire': ST.fields.push({ C, kind: 'fire', x: tx, y: ty, r: sk.r, t: 0, dur: sk.dur, tick: 0, sk }); V(sk.fx, tx, ty); V('arena_flame', tx, ty, sk.dur); if (sk.ring) { const nr = lowFx(ctx) ? 6 : 10; for (let i = 0; i < nr; i++) { const a = i / nr * TAU; ST.timers.push({ C, t: i * 0.03, fn: () => V(sk.ring, tx + Math.cos(a) * sk.r * 0.92, ty + Math.sin(a) * sk.r * 0.55, sk.dur) }); } }   /* vòng lửa theo sự kiện, tự tắt sau dur */ for (let i = 0; i < (lowFx(ctx) ? 2 : 4); i++) { const a = i / 4 * TAU; V(sk.patch, tx + Math.cos(a) * 22, ty + Math.sin(a) * 14, 5); } break;
    case 'leap': V(sk.fx, tx, ty); V(sk.ring, tx, ty); if (!fishOnly(C.id)) { C.x = tx + (C.x < tx ? -10 : 10); C.y = ty + 2; } if (ctx.quake) ctx.quake(0.15); for (const mo of near(ctx, tx, ty, sk.r)) deal(ctx, mo, sk.mul, 130); hitStop(ctx, 60); break;
    case 'burrow': { const bp = A.bp || burrowSpot(ctx, C, tx, ty, A); C.x = bp.x; C.y = bp.y; if (!dryAt(ctx, C.x, C.y)) ST.stats.emergeBad = (ST.stats.emergeBad || 0) + 1; V(sk.fx, C.x, C.y + 1); if (ctx.quake) ctx.quake(0.06); for (const mo of near(ctx, C.x, C.y, 20)) deal(ctx, mo, sk.mul, 110); break; }   /* trồi lên dưới chân địch (ô khô đi được gần nhất) */
    case 'rockrain': { const n = lowFx(ctx) ? 3 : 6; for (let i = 0; i < n; i++) ST.timers.push({ C, t: 0.15 + i * 0.18, fn: () => { const x = tx + (Math.random() - 0.5) * 60, y = ty + (Math.random() - 0.5) * 40; if (sk.rock) { (ST.rocks ||= []).push({ C, x, y, t: 0, T: 0.34, sk }); return; } V(sk.fx, x, y); V(sk.land, x, y); for (const mo of near(ctx, x, y, 18)) deal(ctx, mo, sk.mul, 60); } }); break; }
    case 'cannon': startCannon(ctx, C, sk, tg); break;
    case 'grab': if (alive) { V('sky_gust', tx, ty); if (!isBoss(tg)) tg.stoneT = Math.max(tg.stoneT || 0, ctx.S.time + 0.8); ST.timers.push({ C, t: 0.6, fn: () => { const x = tg.x, y = tg.y; V(sk.fx, x, y); V(sk.ring, x, y); if (ctx.pop) ctx.pop(x, y - 30, 'BOOM!', '#ffffff'); if (ctx.quake) ctx.quake(0.25); for (const mo of near(ctx, x, y, 26)) deal(ctx, mo, mo === tg ? sk.mul : sk.mul * 0.4, 150); hitStop(ctx, 80); } }); } break;
    case 'clones': { const p = ctx.S.player, a0 = Math.random() * TAU, dirs = ['south', 'east', 'west']; ST.decoys = { until: ctx.S.time + sk.dur, t0: ctx.S.time, n: 3, x: p.x, y: p.y, list: [0, 1, 2].map(i => { const a = a0 + i / 3 * TAU; return { x: p.x + Math.cos(a) * 22, y: p.y + Math.sin(a) * 13, dir: dirs[i], C }; }) }; for (const d of ST.decoys.list) V(sk.fx, d.x, d.y); if (alive) deal(ctx, tg, sk.mul, 30); break; }   /* 2026-10-16 Tắc Kè cute: 3 bóng ánh bạc ĐỨNG YÊN quanh người chơi (không xoay vòng), mỗi đòn đỡ làm vỡ 1 bóng, hết giờ thì tan */
    case 'flash': V(sk.fx, C.x, C.y + 2); for (const mo of near(ctx, C.x, C.y, sk.range)) { deal(ctx, mo, sk.mul, 40); if (!isBoss(mo)) mo.stoneT = Math.max(mo.stoneT || 0, ctx.S.time + 1.4); } break;
    case 'roots': { const n = 5; for (let i = 1; i <= n; i++) ST.timers.push({ C, t: i * 0.12, fn: () => { const u = i / n, x = C.x + (tx - C.x) * u, y = C.y + (ty - C.y) * u; V(sk.fx, x, y); for (const mo of near(ctx, x, y, 16)) { deal(ctx, mo, sk.mul / 2, 20); if (!isBoss(mo)) mo.stoneT = Math.max(mo.stoneT || 0, ctx.S.time + 1.5); } } }); break; }
    case 'bolts': { const n = 3; for (let i = 0; i < n; i++) { const x = tx + (i ? (Math.random() - 0.5) * 50 : 0), y = ty + (i ? (Math.random() - 0.5) * 34 : 0); ST.timers.push({ C, t: i * 0.25, fn: () => { const t0 = ctx.S.time || 0; (ST.warns ||= []).push({ x, y, r: 18, t0, t1: t0 + 0.6 + 0.02 }); } });   /* 2026-10-16: báo trước = vòng nét đứt dưới đất (như chiêu trùm), không dùng tia lửa */ ST.timers.push({ C, t: 0.6 + i * 0.25, fn: () => { V(sk.fx, x, y); for (const mo of near(ctx, x, y, 20)) deal(ctx, mo, sk.mul, 50); if (i === n - 1) hitStop(ctx, 60); } }); } break; }
    case 'lift': { ST.dark = { t: 0, dur: 2 }; V(sk.fx, C.x, C.y, 2); const L2 = near(ctx, C.x, C.y, sk.r); for (const mo of L2) { if (!isBoss(mo)) mo.stoneT = Math.max(mo.stoneT || 0, ctx.S.time + 1.6); if (sk.lifted) V(sk.lifted, mo.x, mo.y - 8); ST.timers.push({ C, t: 1.4, fn: () => { if (mo.hp > 0) { V(sk.hit, mo.x, mo.y); deal(ctx, mo, sk.mul, 90); } } }); } ST.timers.push({ C, t: 1.45, fn: () => { if (ctx.quake) ctx.quake(0.25); hitStop(ctx, 70); } }); break; }
  }
}
function rocksTick(ctx, dt) {   /* Mưa Đá Lở: đá rơi 0,34 s (nhanh dần) → chạm đất: vỡ (rock_debris) + bụi (knock_land) + sát thương r 18 */
  const R = ST.rocks; if (!R || !R.length) return;
  for (let i = R.length - 1; i >= 0; i--) { const r = R[i]; r.t += dt; if (r.t < r.T) continue; R.splice(i, 1); if (r.C) ST.c = r.C; fxAt(ctx, r.sk.fx, r.x, r.y); fxAt(ctx, r.sk.land, r.x, r.y); for (const mo of near(ctx, r.x, r.y, 18)) deal(ctx, mo, r.sk.mul, 60); }
}
function drawRock(g, r, cx, cy) {   /* đá rơi: bóng dưới đất to dần + ảnh đá (ảnh gói M4 2× → vẽ ½) rơi từ ~64 px */
  const im = uiImg(r.sk.rock), u = Math.min(1, r.t / r.T), h = 64 * (1 - u * u), x = (globalThis.__R89||Math.round)(r.x - cx), y = (globalThis.__R89||Math.round)(r.y - cy);
  g.save(); g.globalAlpha = 0.18 + 0.3 * u; g.fillStyle = '#1a0f0a'; g.beginPath(); g.ellipse(x, y, 3 + 4 * u, 1.5 + 1.5 * u, 0, 0, TAU); g.fill(); g.restore();
  if (im) g.drawImage(im, x - Math.round(im.width / 4), Math.round(y - h - im.height / 2), Math.round(im.width / 2), Math.round(im.height / 2));
}
function fieldTick(ctx, dt) {
  for (let i = ST.fields.length - 1; i >= 0; i--) {
    const F = ST.fields[i]; if (F.C) ST.c = F.C; F.t += dt; F.tick -= dt; if (F.t >= F.dur) { ST.fields.splice(i, 1); continue; } if (F.tick > 0) continue; F.tick = F.kind === 'rain' ? 1 : 0.5;
    const L2 = near(ctx, F.x, F.y, F.r);
    if (F.kind === 'rain') { L2.forEach((mo, i) => ST.timers.push({ t: (i % 5) * 0.17, fn: () => { if (!(mo.hp > 0) || !mons(ctx).includes(mo) || !inRain(ctx, mo.x, mo.y)) return; const c0 = ST.c; ST.c = F.C || c0; try { deal(ctx, mo, F.sk.mul, 0); } finally { ST.c = c0; } } }));   /* rải pha từng con */ const p = ctx.S.player; if (Math.hypot(p.x - F.x, p.y - F.y) < F.r + 10 && ctx.hero && ctx.hero.heal) { ctx.hero.heal(Math.max(1, Math.round(ctx.hero.max * F.sk.heal))); ST.stats.rhP = (ST.stats.rhP || 0) + 1; }
      { const rp = ctx.rocky && ctx.rocky.pos && ctx.rocky.pos(), pt = ctx.rocky && ctx.rocky.pet && ctx.rocky.pet(), st = ctx.rocky && ctx.rocky.stats && ctx.rocky.stats(); if (rp && pt && st && Math.hypot(rp.x - F.x, rp.y - F.y) < F.r + 10) { pt.hp = Math.min(st.max, (pt.hp ?? st.max) + Math.max(1, Math.round(st.max * F.sk.heal))); ST.stats.rhR = (ST.stats.rhR || 0) + 1; } }   /* Rocky */
      for (const C2 of ST.cs) { const k2 = owned(ctx, C2.id); if (k2 && Math.hypot(C2.x - F.x, C2.y - F.y) < F.r + 10) { k2.hp = Math.min(ltMax(k2), hpOf(k2) + ltMax(k2) * F.sk.heal); ST.stats.rhL = (ST.stats.rhL || 0) + 1; } }   /* linh thú */
      if (F.t > 1.2 && F.nP < 2) { if (rainPuddle(ctx, F)) F.nP++; } }   /* vũng tạm */
    else { for (const mo of L2) { if (F.kind === 'vortex' && !isBoss(mo)) { mo.x += (F.x - mo.x) * 0.35; mo.y += (F.y - mo.y) * 0.35; } deal(ctx, mo, F.sk.mul, 0); } if (F.kind === 'vortex' && ctx.vfx) for (let q = 0; q < (lowFx(ctx) ? 1 : 2); q++) { const a = Math.random() * TAU, rr = F.r * (0.55 + Math.random() * 0.35); ((!OLD69() && fx69(ctx, 'bk_kick_sand', F.x + Math.cos(a) * rr, F.y + Math.sin(a) * rr * 0.55)) || ctx.vfx('bk_kick_sand', F.x + Math.cos(a) * rr, F.y + Math.sin(a) * rr * 0.55)); } }   /* cát pixel văng quanh vành lốc, thưa (2 / nhịp 0,5 s; máy yếu 1) */
  }
}
function projTick(ctx, dt) {
  const p = ctx.S.player;
  for (let i = ST.proj.length - 1; i >= 0; i--) {
    const b = ST.proj[i]; if (b.C) ST.c = b.C; b.t += dt; b.x += b.vx * dt; b.y += b.vy * dt; (b.tr ||= []).push(b.x, b.y); if (b.tr.length > 12) b.tr.splice(0, 2);   /* plan-69: vệt đuôi đạn */ let done = b.t >= b.life;
    if (b.own && !done && clashCheck(ctx, b)) done = true;
    if (b.own && !done) { for (const mo of mons(ctx)) { if (Math.hypot(mo.x - b.x, mo.y - 6 - b.y) < (isBoss(mo) ? 22 : 11)) { deal(ctx, mo, b.mul, 70); fxAt(ctx, b.hit, mo.x, mo.y); done = true; break; } } }
    else if (!b.own && Math.hypot(p.x - b.x, p.y - 6 - b.y) < 9) { if (ctx.hero && !(ctx.ki && ctx.ki.iframes && ctx.ki.iframes())) ctx.hero.hit(b.dmg); if (!(!OLD69() && fx69(ctx, b.hit, p.x, p.y)) && ctx.vfx) ctx.vfx(b.hit, p.x, p.y); done = true; }
    if (!done) { const m = ctx.S.map; if (m && ctx.isSolid(m, Math.floor(b.x / TS), Math.floor((b.y + 6) / TS)) && !(m.sea)) { fxAt(ctx, b.hit, b.x, b.y + 6); done = true; } }
    if (done) { if (b.tid && ctx.threat) ctx.threat.remove(b.tid); ST.proj.splice(i, 1); }
  }
}

/* ĐẤU CHƯỞNG linh thú (học V1 64–70 s / V3 33–35 s): đạn của linh thú gặp đạn có báo trước của trùm / quái → nổ giữa đường + hơi nước bốc, đòn đó không trúng người chơi */
function clashCheck(ctx, b) {
  if (!ctx.threat || !ctx.threat.list) return false; const now = ctx.S.time;
  for (const t of ctx.threat.list()) { if (!t || t.done || t.kind !== 'projectile' || t.speed == null || !t.from || !t.to) continue; if (ST.proj.some(q => q.tid === t.id)) continue;
    const L0 = Math.hypot(t.to.x - t.from.x, t.to.y - t.from.y) || 1, u = Math.min(1, Math.max(0, (now - (t.t0 || now)) * t.speed / L0)), x = t.from.x + (t.to.x - t.from.x) * u, y = t.from.y + (t.to.y - t.from.y) * u;
    if (u <= 0 || u >= 1 || Math.hypot(x - b.x, y - b.y) > 14) continue;
    const mx = (x + b.x) / 2, my = (y + b.y) / 2; if (ctx.vfx) { ctx.vfx('hr_clash', mx, my + 8); ctx.vfx('tr_splash_px', mx, my + 10); }   /* đấu chưởng: nước bung PIXEL (trước tr_spout_soft mềm) */ ctx.sfx('smash'); hitStop(ctx, 60);
    ST.parry = { until: now + Math.max(0.2, (L0 * (1 - u)) / t.speed + 0.25) }; if (t.id != null) ctx.threat.remove(t.id); ST.stats.clash = (ST.stats.clash || 0) + 1; log('clash ' + t.kind); return true; }
  return false;
}

/* ---- LƯỠI DÍNH (2026-10-15 anh: 'lưỡi đâu phải đường thẳng; đầu lưỡi to, thân nhỏ hơn'): lưỡi = chuỗi ĐĨA PixelLab (fx/tg_*.png, vẽ bằng pixelart_workbench)
   đặt dọc đường cong bezier bậc 3 đổi theo thời gian (phóng ra quất như roi, dính thì võng nhẹ theo trọng lực, kéo về cong theo đà).
   Vẽ 2 lượt: viền tg_o* (#301007) rồi ruột tg_f* → dải liền, không vạch ngăn giữa các mảnh; thân thon dần 3 → 2 px logic, đầu dính tròn 6 px (tg_f12, bóng ướt) vẽ sau cùng. ---- */
/* 2026-10-15 (anh: 'lưỡi phải xuất phát từ miệng phóng ra, miệng to hay nhỏ thì lưỡi cũng như vậy'): MIỆNG đo bằng số trên pixel từng khung clip lick (tools/lt-mouth.py):
   [x, y, w] = tâm miệng + bề ngang miệng (px ảnh trong ô 36×36, chân ở 29) — nam: dải ruột miệng đỏ giữa 2 môi; đông: khe miệng ở mép trước mặt (w = chiều cao khe);
   bắc (nhìn từ sau, clip lick bắc sinh lại 2026-10-15 — bản cũ PixelLab vẽ MẶT lên lưng): giữa đỉnh đầu, w = ½ bề ngang đầu (lưỡi vẽ SAU thân). */
const LICK_M = {south: [[12.5, 14.5, 10], [12.5, 14.5, 10], [12.6, 15.0, 8], [12.6, 15.0, 8], [12.6, 15.0, 8], [12.6, 15.0, 8], [12.6, 15.0, 8]], east: [[18, 15.5, 4], [18, 16.5, 4], [18, 16.0, 5], [18, 16.0, 5], [18, 16.0, 5], [18, 14.0, 2], [18, 14.0, 2]], north: [[12.5, 7, 6], [12.5, 7, 6], [12.5, 7, 6], [12.5, 7, 6], [12.5, 7, 6], [12.5, 7, 6], [12.5, 7, 6]]};   /* LICK_M v2 (Cóc nhỏ, ô 26×28): [x, y, bề ngang miệng] px ảnh trong ô, đo bằng màu ruột miệng #4e071d / #95101e từng khung lick */
const LICK_M_EVO = { south: [12.5, 11, 8], east: [18, 12, 4], north: [12.5, 6, 6] };   /* 2026-10-16 Cóc Thần Vũ (coc2, ô 27×29 chân 27): [x, y, bề ngang miệng] px ảnh — đo màu ruột miệng khung idle (dạng tiến hoá không có clip lick: dùng khung idle mồm há) */
const LICK_OPEN = 3;   /* khung miệng há rộng nhất (giữ trong lúc lưỡi duỗi / dính) */
function lickFrame(C) {   /* khung clip lick theo PHA LƯỠI (không theo đồng hồ cast) → lưỡi ra lúc miệng đang há */
  const T = ST.tongue, A = C.cast; if (T && (T.C || ST.c) === C) { if (T.t < T.ext + T.hold) return LICK_OPEN; const u = (T.t - T.ext - T.hold) / Math.max(0.01, T.T - T.ext - T.hold); return u < 0.6 ? LICK_OPEN : LICK_OPEN + 1; }
  if (A && A.sk.kind === 'pull') { if (!A.fired) return Math.min(2, Math.floor(A.t / 0.35 * 3)); return Math.min(6, 5 + Math.floor(Math.max(0, A.t - 0.71) / 0.09)); }
  return LICK_OPEN;
}
function mouthOf(C) {   /* → { x, y, w } toạ độ thế giới (logic) + bề ngang miệng (px ảnh) theo khung lick đang vẽ */
  const d = C.dir === 'west' ? 'east' : C.dir, ko = ST.ctx && owned(ST.ctx, C.id), FE = ko && ko.evo && META && META[formOf(C.id, ko.evo)], T = LICK_M[d] || LICK_M.south, f = FE ? (LICK_M_EVO[d] || LICK_M_EVO.south) : T[Math.max(0, Math.min(T.length - 1, lickFrame(C)))], s = C.dir === 'west' ? -1 : 1;   /* 2026-10-16: dạng tiến hoá có miệng riêng */
  const MM = FE || (META && META.coc) || { w: 36, foot: 29 }, mx = (d === 'east' ? f[0] - 2 : f[0]) / 2 - MM.w / 4;   /* đông: gốc lùi vào TRONG khe miệng 1 px logic; ô sheet lấy từ linhthu.json (Cóc nhỏ 26×28) */
  return { x: C.x + s * mx, y: C.y + f[1] / 2 - MM.foot / 2 - (C.lift || 0) - (floaty(C.id) ? (SP[C.id].flyH || 5) : 0) + (C._dy || 0), w: f[2] };
}
function tongueTick(ctx, dt) {
  const T = ST.tongue, C = (T && T.C) || ST.c; if (!C || !ST.cs.includes(C)) { ST.tongue = null; return; } T.t += dt; const mo = T.mo, m = mouthOf(C);
  if (!T.hit && T.t >= T.ext) { T.hit = true; if (mo && mo.hp > 0) { ST.splat = { x: mo.x, y: mo.y - 6, t: 0.24, code: !!(ctx.wfx && ctx.wfx('tonguehit', mo.x, mo.y + 0.5, { z: 6 })) };   /* plan-69 */ deal(ctx, mo, T.sk.mul, 0); if (isBoss(mo)) mo.stoneT = Math.max(mo.stoneT || 0, ctx.S.time + 0.15); else mo.stoneT = Math.max(mo.stoneT || 0, ctx.S.time + (T.T - T.t) + 0.02);   /* 2026-10-15: quái nhỏ khựng ĐÚNG lúc bị lưỡi bọc (lớp bọc phủ lên) — trước 0,5 s nên còn xám 'hoá đá' sau khi lưỡi rút */ ctx.sfx('squeak'); } }
  if (T.hit && T.t > T.ext + T.hold && mo && mo.hp > 0 && !isBoss(mo)) { const k = Math.min(1, dt * 9); mo.x += (m.x - mo.x) * k * 0.6; mo.y += (C.y + 4 - mo.y) * k * 0.6; }   /* cuộn về: kéo quái nhỏ sát cóc */
  if (T.t >= T.T) { ST.tongue = null; if (mo && mo.hp > 0 && !isBoss(mo) && Math.hypot(mo.x - C.x, mo.y - C.y) < 22) { deal(ctx, mo, T.sk.mul * 0.5, 40); if (!(ctx.wfx && ctx.wfx('jab', mo.x, mo.y, {})) && ctx.vfx) ctx.vfx('knock_jab', mo.x, mo.y); } }   /* táp (plan-69: code) */
}
function tgDisc(g, n, x, y) { const im = uiImg('linhthu/fx/' + n + '.png'); if (!im) return; const w = im.naturalWidth, h = im.naturalHeight; g.drawImage(im, 0, 0, w, h, Math.round((x - w / 4) * 2) / 2, Math.round((y - h / 4) * 2) / 2, w / 2, h / 2); }
const TGD = s => Math.max(4, Math.min(16, Math.round(s)));
const headY = C => { const k = ST.ctx && owned(ST.ctx, C.id), evo = k ? k.evo : 0, MF = META && META[formOf(C.id, evo)]; if (!evo && SP[C.id] && SP[C.id].headY) return SP[C.id].headY; if (evo && SP[C.id] && SP[C.id].evo && SP[C.id].evo.headY) return SP[C.id].evo.headY;   /* 2026-10-16: dạng tiến hoá cute có headY riêng */ return MF ? MF.foot / 2 + 1 : 18; };   /* 2026-10-15 Cóc nhỏ: chữ / số nổi theo đỉnh đầu từng dạng */   /* đĩa PixelLab tgd_f4…f16 (ruột) / tgd_o6…o18 (viền) — cỡ px ảnh */
function contactOf(T, m) {   /* điểm lưỡi chạm mục tiêu: mép thân phía cóc (không phải tâm) */
  const mo = T.mo, F = sprOf(mo), cyc = F ? mo.y - F.ch / 2 + 2 - F.lift : mo.y - 6, dx = mo.x - m.x, dy = cyc - m.y, L = Math.hypot(dx, dy) || 1, r = F ? Math.min(F.cw, F.ch) * 0.32 : 4;
  return [mo.x - dx / L * r, cyc - dy / L * r];
}
function tonguePts(T, C) {   /* → { pts: [[x, y, cỡ px ảnh]], tip, m } theo toạ độ thế giới (logic), hoặc null khi lưỡi còn quá ngắn */
  const m = mouthOf(C), cp = contactOf(T, m), tx = cp[0], ty = cp[1], ext = T.t < T.ext, hold = !ext && T.t < T.ext + T.hold;
  const u = ext ? T.t / T.ext : hold ? 1 : Math.max(0, 1 - (T.t - T.ext - T.hold) / Math.max(0.01, T.T - T.ext - T.hold)), e = ext ? 1 - (1 - u) * (1 - u) : u;
  const wrapped = T.hit && T.mo && T.mo.hp > 0 && !(isBoss(T.mo) && !hold), px = wrapped ? tx : m.x + (tx - m.x) * e, py = wrapped ? ty : m.y + (ty - m.y) * e;   /* đã bọc: đầu lưỡi bám theo vật bị kéo */
  const dx = px - m.x, dy = py - m.y, L = Math.hypot(dx, dy); if (L < 2) return null;
  let nx = -dy / L, ny = dx / L; if (ny < 0 || (Math.abs(ny) < 0.25 && nx < 0)) { nx = -nx; ny = -ny; }   /* pháp tuyến hướng XUỐNG → võng theo trọng lực */
  const A = Math.min(9, L * 0.3);
  const s1 = ext ? A * (0.25 + 0.9 * Math.sin(Math.PI * u)) : hold ? A * 0.3 : A * (0.2 + 0.6 * (1 - u));
  const s2 = ext ? -A * 0.6 * Math.sin(Math.PI * 2 * u) : hold ? A * 0.12 : -A * 0.4 * (1 - u);
  const P1x = m.x + dx * 0.33 + nx * s1, P1y = m.y + dy * 0.33 + ny * s1, P2x = m.x + dx * 0.66 + nx * s2, P2y = m.y + dy * 0.66 + ny * s2;
  const n = Math.max(4, Math.ceil(L / 1.0)), pts = [], w0 = TGD(m.w);
  for (let i = 0; i <= n; i++) { const t = i / n, a = (1 - t) * (1 - t) * (1 - t), b = 3 * (1 - t) * (1 - t) * t, c = 3 * (1 - t) * t * t, q = t * t * t;
    const mid = Math.max(3, Math.round(w0 * 0.6)), end = Math.max(3, Math.round(w0 * 0.45)), sz = t < 0.22 ? w0 + (mid - w0) * (t / 0.22) : t < 0.6 ? mid - (mid - end) * ((t - 0.22) / 0.38) : end;   /* gốc = bề ngang miệng → thân ~60 % → ~45 % (Cóc nhỏ: miệng 8–10 px ảnh) */
    pts.push([a * m.x + b * P1x + c * P2x + q * px, a * m.y + b * P1y + c * P2y + q * py, TGD(sz)]); }
  return { pts, tip: [px, py], m, wrapped, ts: Math.max(6, Math.min(12, Math.round(w0 + 1))) };   /* đầu lưỡi: to hơn thân, theo miệng */
}
function drawTongue(g, cx, cy) {
  const T = ST.tongue, C = (T && T.C) || ST.c; if (!T || !C || !T.mo) return; const R = tonguePts(T, C); if (!R) return;
  g.save(); g.imageSmoothingEnabled = false; const tip = !R.wrapped;   /* đầu dính tròn chỉ lúc đang bay tới; chạm rồi thì lớp BỌC thay đầu lưỡi */
  for (const q of R.pts) tgDisc(g, 'tgd_o' + (q[2] + 2), q[0] - cx, q[1] - cy); if (tip) tgDisc(g, R.ts >= 12 ? 'tg_o14' : 'tgd_o' + (R.ts + 2), R.tip[0] - cx, R.tip[1] - cy);   /* lượt 1: viền */
  for (const q of R.pts) tgDisc(g, 'tgd_f' + q[2], q[0] - cx, q[1] - cy); if (tip) tgDisc(g, R.ts >= 12 ? 'tg_f12' : 'tgd_f' + R.ts, R.tip[0] - cx, R.tip[1] - cy);   /* lượt 2: ruột + đầu dính */
  g.restore();
}
/* ---- BỌC MỤC TIÊU (anh 2026-10-15: 'khi lưỡi chạm vật cần bắt thì nó ôm trọn toàn thể vật đó, ôm theo hình dáng vật đó') ----
   Lớp bọc = mặt nạ alpha của ĐÚNG khung sprite quái đang vẽ (sheet ART.monsters, hàng = hướng mặt) nới ra 3 px ảnh, tô hồng 3 nấc cùng màu đĩa lưỡi PixelLab
   (sáng trên-trái), vài điểm bóng ướt, viền 1 px #301007; ruột hơi trong (0,8) để thấy lờ mờ vật bên trong. Dựng 1 lần / (sheet + khung + hàng), canvas nháp willReadFrequently.
   Loang từ điểm chạm ra quanh thân trong ~0,1 s; trùm to: chỉ bọc 1 mảng quanh điểm chạm rồi tuột ra. Quái không có sheet: cục bọc nhỏ quanh điểm chạm. */
const WRAPC = new Map();
function sprOf(mo) {   /* khung sheet quái đúng như monsters.js drawMonster: { sh, fr, row, cw, ch, lift } hoặc null (quái tự vẽ / không có sheet) */
  const c = mo && mo.c; if (!c || c.drawFn || c.ai === 'kraken' || c.ai === 'xealist' || mo.st2) return null; const sh = ART.monsters && ART.monsters[c.key]; if (!sh || !sh.img) return null;
  const fr = Math.floor((mo.ft || 0) * FPS.creature) % sh.n, row = mo.face ?? 0, lift = (c.fly ? 6 + Math.round(Math.sin(mo.ft * 4) * 2) : c.float ? 5 + Math.round(Math.sin(mo.ft * 2) * 2) : 0) + Math.round(mo.lift || 0);
  return { sh, fr, row, cw: sh.cw, ch: sh.ch, lift };
}
const WRAP_COL = { l: [255, 148, 166], m: [230, 90, 116], d: [179, 52, 79], o: [48, 16, 7], w: [255, 241, 244] };   /* = màu đĩa lưỡi PixelLab (tgd_*) */
function wrapCanvas(F) {   /* 2026-10-15 (anh: 'chạm vào đâu thì đối tượng đó hoá HỒNG, màu giống lưỡi'): CHÍNH sprite đổi sang dải hồng của đĩa lưỡi theo độ sáng từng pixel (giữ dáng / mặt), vành hồng nới 2 px ảnh + viền #301007 + chấm bóng ướt; ĐẶC (không trong suốt) */
  const key = F.sh.key || F.sh.img.src || (F.sh.__wid ||= Math.random().toString(36).slice(2)), k = key + ':' + F.fr + ':' + F.row; let W0 = WRAPC.get(k); if (W0) return W0;
  if (typeof document === 'undefined') return null; const P = 3, Wd = F.cw * 2 + P * 2, Hd = F.ch * 2 + P * 2, c = document.createElement('canvas'); c.width = Wd; c.height = Hd;
  const x = c.getContext('2d', { willReadFrequently: true }); x.imageSmoothingEnabled = false; x.drawImage(F.sh.img, F.fr * F.cw, F.row * F.ch, F.cw, F.ch, P, P, F.cw * 2, F.ch * 2);
  const src = x.getImageData(0, 0, Wd, Hd).data, N = Wd * Hd, A = new Uint8Array(N), Lu = new Float32Array(N); for (let i = 0; i < N; i++) { A[i] = src[i * 4 + 3] > 40 ? 1 : 0; Lu[i] = 0.3 * src[i * 4] + 0.59 * src[i * 4 + 1] + 0.11 * src[i * 4 + 2]; }
  const R = 2, D = new Uint8Array(N); let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
  for (let y = 0; y < Hd; y++) for (let xx = 0; xx < Wd; xx++) { let on = 0; for (let oy = -R; oy <= R && !on; oy++) for (let ox = -R; ox <= R; ox++) { if (ox * ox + oy * oy > R * R + 1) continue; const X = xx + ox, Y = y + oy; if (X >= 0 && Y >= 0 && X < Wd && Y < Hd && A[Y * Wd + X]) { on = 1; break; } }
    if (on) { D[y * Wd + xx] = 1; if (xx < x0) x0 = xx; if (xx > x1) x1 = xx; if (y < y0) y0 = y; if (y > y1) y1 = y; } }
  if (x1 < 0) { WRAPC.set(k, null); return null; }
  const vals = []; for (let i = 0; i < N; i++) if (A[i]) vals.push(Lu[i]); vals.sort((a, b) => a - b); const q = f => vals[Math.min(vals.length - 1, Math.floor(vals.length * f))] ?? 0, T1 = q(0.08), T2 = q(0.38), T3 = q(0.74);   /* ngưỡng theo PHÂN VỊ độ sáng của chính sprite → quái tối (sói xám) hay sáng (slime) đều ra đủ 4 nấc hồng */
  const out = x.createImageData(Wd, Hd), o = out.data, bw = Math.max(1, x1 - x0), bh = Math.max(1, y1 - y0), put = (i, col) => { o[i * 4] = col[0]; o[i * 4 + 1] = col[1]; o[i * 4 + 2] = col[2]; o[i * 4 + 3] = 255; };
  for (let y = y0; y <= y1; y++) for (let xx = x0; xx <= x1; xx++) { const i = y * Wd + xx; if (!D[i]) continue;
    const edge = xx === 0 || y === 0 || xx === Wd - 1 || y === Hd - 1 || !D[i - 1] || !D[i + 1] || !D[i - Wd] || !D[i + Wd]; if (edge) { put(i, WRAP_COL.o); continue; }
    if (!A[i]) { const t = (xx - x0) / bw + (y - y0) / bh - 1; put(i, t < -0.3 ? WRAP_COL.l : WRAP_COL.m); continue; }   /* vành lưỡi nới quanh thân: sáng phía trên-trái */
    const v = Lu[i]; put(i, v < T1 ? WRAP_COL.o : v < T2 ? WRAP_COL.d : v < T3 ? WRAP_COL.m : WRAP_COL.l); }   /* chi tiết sprite (mắt, nét, khối) giữ bằng sáng tối hồng */
  const gx = Math.round(x0 + bw * 0.3), gy = Math.round(y0 + bh * 0.24); for (const [ox, oy] of [[0, 0], [1, 0], [0, 1], [Math.round(bw * 0.32), Math.round(bh * 0.1)], [Math.round(bw * 0.1), Math.round(bh * 0.46)], [Math.round(bw * 0.5), Math.round(bh * 0.4)]]) { const X = gx + ox, Y = gy + oy, i = Y * Wd + X; if (X > 0 && Y > 0 && X < Wd - 1 && Y < Hd - 1 && D[i] && D[i - 1] && D[i + 1] && D[i - Wd] && D[i + Wd]) put(i, WRAP_COL.w); }   /* chấm bóng ướt */
  const cv = document.createElement('canvas'); cv.width = Wd; cv.height = Hd; cv.getContext('2d').putImageData(out, 0, 0); W0 = { c: cv, P }; WRAPC.set(k, W0); if (WRAPC.size > 120) WRAPC.delete(WRAPC.keys().next().value); return W0;
}
function drawWrap(g, cx, cy) {
  const T = ST.tongue, C = (T && T.C) || ST.c, mo = T && T.mo; if (!T || !T.hit || !C || !mo || !(mo.hp > 0)) return; const boss = isBoss(mo), m = mouthOf(C), cp = contactOf(T, m), th = T.t - T.ext;
  let a = 1; if (boss && T.t > T.ext + T.hold) a = Math.max(0, 1 - (T.t - T.ext - T.hold) / 0.08); if (a <= 0) return;   /* trùm: tuột ra ngay khi lưỡi rút */
  const R = boss ? 3 + Math.min(1, th / 0.13) * 7 : 2 + Math.min(1, th / 0.13) * 40;   /* hồng lan từ điểm chạm ra khắp thân trong ~0,13 s; trùm: chỉ 1 mảng */ g.save(); g.imageSmoothingEnabled = false; if (a < 1) g.globalAlpha = a;
  g.beginPath(); g.arc(cp[0] - cx, cp[1] - cy, R, 0, Math.PI * 2); g.clip();   /* loang từ điểm chạm ra quanh thân */
  const F = sprOf(mo), W0 = F && wrapCanvas(F);
  if (W0) { const dx = (globalThis.__R89||Math.round)(mo.x - cx) - (F.cw >> 1) - W0.P / 2, dy = (globalThis.__R89||Math.round)(mo.y - cy) - F.ch + 2 - F.lift - W0.P / 2; g.drawImage(W0.c, 0, 0, W0.c.width, W0.c.height, dx, dy, W0.c.width / 2, W0.c.height / 2); }
  else { const X = cp[0] - cx, Y = cp[1] - cy; for (const [ox, oy, s] of [[0, 0, 12], [-3, 2, 9], [3, 2, 9], [0, -3, 8]]) tgDisc(g, 'tgd_o' + (s + 2), X + ox, Y + oy); for (const [ox, oy, s] of [[0, 0, 12], [-3, 2, 9], [3, 2, 9], [0, -3, 8]]) tgDisc(g, 'tgd_f' + s, X + ox, Y + oy); }
  g.restore();
}

/* ================= ẤN LINH (2026-10-15 anh: "gọi cóc ra bằng cách nhấn vào một ô giống như quả cầu, khi muốn thu về thì nhấn lại; ném cóc ra thì nó cực kỳ háo chiến") =================
   Ô tròn (điện thoại: cạnh cụm A / Ăn / Túi · máy tính: phím U + icon bấm được cạnh thanh máu — phím Q đã là bảng Nhiệm vụ). Ảnh vỏ ấn PixelLab (fx/orb_full|out|rest,
   ngọc bích viền đồng — KHÔNG chép Poké Ball), linh thú thu nhỏ bên trong = icon linh thú. Ném: quả cầu nhỏ (fx/orb_small) bay vòng cung về phía quái gần nhất (không có thì ra
   trước mặt) ~0,45 s → ánh bung (fx/orb_burst, vfx_workbench) → linh thú nảy ra. Thu: tia chấm sáng từ tay tới linh thú, linh thú tan thành chấm sáng (fx/orb_dot*) bay về tay.
   Tự về ấn chỉ khi: đổi vùng · cất cánh / đi bè / lặn / cảnh riêng (không theo được) · gục (nghỉ 60 s, ô xám + vòng hồi). */
/* ================= ẤN LINH (2026-10-15) — gọi / thu CẢ ĐỘI + NÂNG CẤP =================
   anh: "thêm mục [quả cầu Ấn Linh] cho túi đồ … nơi show các thú linh, và cơ chế nâng cấp mục đó để có thể gọi nhiều thú linh hơn".
   Cấp 1 = 1 ô · cấp 2 = 2 ô · cấp 3 = 3 ô (tối đa 3: hiệu năng iPhone). Nút "Gọi" ném cả đội (quả cầu lệch nhau 0,15 s, toả về các quái gần),
   nút "Thu" thu cả đội. Mỗi con máu / nghỉ / hồi riêng (owned[id].rest); con đang nghỉ không ném được. Vòng máu trên nút chia đoạn theo số con.
   Nâng cấp: đá Seismic + NGỌC LINH (rơi ở ổ linh thú mỗi ngày, +2 khi thu phục) + số loài đã bắt. */
const ORB = { throwT: 0.45, recallT: 0.5, restS: 60, stagger: 0.15 };
const nowS = () => Date.now() / 1000;
const NGOC = 'ngoc_linh';
ITEMS[NGOC] = { icon: '💠', name: { en: 'Spirit Jade', vi: 'Ngọc Linh' }, w: 0, tags: ['ltjade'] };   /* ảnh PixelLab linhthu/fx/ngoc_linh.png (gắn vào ART.man.ui.items lúc chạy) */
const ngocName = ctx => (vi(ctx) ? 'Ngọc Linh' : 'Spirit Jade');
const ORB_UP = { 2: { stone: 300, jade: 3, species: 3 }, 3: { stone: 900, jade: 8, species: 6 } };   /* nâng cấp Ấn Linh (cân bằng: plan-39 mục "Ấn Linh") */
Object.assign(STR.vi, { orbUpOk: n => `Ấn Linh lên cấp ${n} — mang được ${n} linh thú!`, orbUpNo: 'Chưa đủ điều kiện nâng cấp', orbTeamN: n => `Gọi cả đội (${n})`, orbNoneReady: 'Cả đội đang nghỉ trong Ấn Linh', jadeDrop: 'Ngọc Linh' });
Object.assign(STR.en, { orbUpOk: n => `Spirit Seal is now level ${n} — carry ${n} spirit beasts!`, orbUpNo: 'Upgrade requirements not met', orbTeamN: n => `Call the team (${n})`, orbNoneReady: 'The whole team is resting in the Seal', jadeDrop: 'Spirit Jade' });
function readyIds(ctx) { return teamIds(ctx).filter(id => !(restLeft(ctx, id) > 0)); }
function orbState(ctx) { const k = sv(ctx), T = teamIds(ctx); if (!T.length) return 'none'; if (k.out) return 'out'; if (!readyIds(ctx).length) return 'rest'; return 'in'; }
function orbPress(ctx) {
  if (!ctx || ctx.S.mode !== 'play' || ST.orbs.some(o => o.ph === 'throw')) return; const st = orbState(ctx), t = L(ctx);
  if (st === 'none') { ctx.toast(t.orbNone); ctx.sfx('fail'); return; }
  if (st === 'rest') { const T = teamIds(ctx); ctx.toast(T.length > 1 ? t.orbNoneReady : t.orbRest(Math.ceil(Math.min(...T.map(id => restLeft(ctx, id)))))); ctx.sfx('fail'); return; }
  if (st === 'in') { if (!readyIds(ctx).some(id => canOut(ctx, id))) { ctx.toast(t.orbCant); ctx.sfx('fail'); return; } throwOrb(ctx); return; }   /* đang bơi: ném những con biết bơi */
  if (ST.cs.some(c => c.cast && c.cast.slot >= 2)) { ST.recallQ = true; ctx.toast(t.orbAfter); return; }   /* siêu năng / tuyệt chiêu đang tung: thu SAU khi dứt; chiêu thường: cắt ngay */
  recallOrb(ctx, false);
}
function throwOrb(ctx) {   /* ném CẢ ĐỘI: mỗi con một quả cầu, lệch nhau 0,15 s, toả về các quái gần nhất (không có quái: toả quanh phía trước mặt) */
  const p = ctx.S.player, m = ctx.S.map, ids = readyIds(ctx).filter(id => canOut(ctx, id)); if (!ids.length) return;
  const tgs = mons(ctx).map(mo => ({ mo, d: dst(mo, p) })).filter(q => q.d < 150).sort((a, b) => a.d - b.d).map(q => q.mo);
  const fv = [[0, 1], [-1, 0], [1, 0], [0, -1]][p.dir] || [0, 1], base = Math.atan2(fv[1], fv[0]);
  const k = sv(ctx); k.out = true; ST.pending = new Set(ids); ST.outSet = new Set(ids); ST.cs = []; ST.c = null;
  ids.forEach((id, i) => { const tg = tgs.length ? tgs[i % tgs.length] : null; let ux, uy, L0;
    if (tg) { const dx = tg.x - p.x, dy = tg.y - p.y, d = Math.hypot(dx, dy) || 1, a = Math.atan2(dy, dx) + (tgs.length < ids.length ? (i - (ids.length - 1) / 2) * 0.35 : 0); ux = Math.cos(a); uy = Math.sin(a); L0 = Math.max(18, Math.min(70, d - 20)); }
    else { const a = base + (i - (ids.length - 1) / 2) * 0.7; ux = Math.cos(a); uy = Math.sin(a); L0 = 30; }
    let x1 = p.x + ux * L0, y1 = p.y + uy * L0; for (let j = 0; j < 8 && ctx.isSolid(m, Math.floor(x1 / TS), Math.floor((y1 - 2) / TS)); j++) { x1 -= ux * 5; y1 -= uy * 5; } if (ctx.isSolid(m, Math.floor(x1 / TS), Math.floor((y1 - 2) / TS))) { x1 = p.x; y1 = p.y + 2; }   /* 2026-10-16: lùi 8 bước vẫn vướng đá (hang M4) → đáp ngay chân người chơi */
    ST.orbs.push({ ph: 'throw', id, t: -i * ORB.stagger, T: ORB.throwT, x0: p.x + (p.dir === 1 ? -4 : 4), y0: p.y - 9, x1, y1 }); });
  ctx.sfx('whoosh'); ST.stats.orbThrow = (ST.stats.orbThrow || 0) + 1; log('orb throw ×' + ids.length + ' ' + ids.join(','));
}
function recallOrb(ctx, auto, why, onlyId) {   /* thu CẢ ĐỘI (hoặc 1 con: onlyId — gục / con cá lên cạn …) */
  const k = sv(ctx); ST.recallQ = false; const list = onlyId ? ST.cs.filter(c => c.id === onlyId) : ST.cs.slice();
  for (const C of list) { if (ST.tongue && ST.tongue.C === C) ST.tongue = null; if (!C.hidden) { const kk = owned(ctx, C.id); ST.orbs.push({ ph: 'recall', id: C.id, t: 0, T: auto ? 0.32 : ORB.recallT, gx: C.x, gy: C.y - (C.lift || 0), form: formOf(C.id, kk ? kk.evo : 0), dir: C.dir }); } }
  if (onlyId) { ST.cs = ST.cs.filter(c => c.id !== onlyId); ST.pending.delete(onlyId); ST.outSet.delete(onlyId); ST.orbs = ST.orbs.filter(o => !(o.ph === 'throw' && o.id === onlyId)); }
  else { ST.cs = []; ST.pending = new Set(); ST.outSet = new Set(); ST.orbs = ST.orbs.filter(o => o.ph !== 'throw'); }
  if (!ST.cs.length && !ST.pending.size) k.out = false; ST.c = ST.cs[0] || null;
  if (list.length) ctx.sfx('pickup'); ST.stats.orbRecall = (ST.stats.orbRecall || 0) + 1; log('orb recall' + (onlyId ? ' ' + onlyId : ' all') + (auto ? ' auto ' + why : '')); ctx.persist();
}
function koToOrb(ctx, C) { const id = C ? C.id : null, o = id && owned(ctx, id); if (!o) return; o.rest = nowS() + ORB.restS; recallOrb(ctx, true, 'ko', id); ctx.toast(L(ctx).orbKo); }   /* con này gục → về ấn nghỉ 60 s (các con khác vẫn đánh) */
function orbTick(ctx, dt) {
  const B = (ST.bursts ||= []); for (let i = B.length - 1; i >= 0; i--) if ((B[i].t += dt) > (B[i].small ? 0.16 : 0.26)) B.splice(i, 1);
  for (let i = ST.orbs.length - 1; i >= 0; i--) { const O = ST.orbs[i]; O.t += dt; if (O.t < O.T) continue; ST.orbs.splice(i, 1);
    if (O.ph === 'throw') { B.push({ x: O.x1, y: O.y1, t: 0 }); ST.pending.delete(O.id); if (!sv(ctx).out) continue; spawnCompanion(ctx); const C = ST.cs.find(c => c.id === O.id); if (C) { C.x = O.x1; C.y = O.y1; C.popT = 0.3; C.cd1 = Math.min(C.cd1, 0.4); C.cd2 = Math.min(C.cd2, 0.4); } ctx.sfx('pickup'); ctx.persist(); }
    else { const p = ctx.S.player; B.push({ x: p.x, y: p.y - 9, t: 0, small: true }); } }
}
function fxSprite(g, n, x, y, a = 1) { const im = uiImg('linhthu/fx/' + n + '.png'); if (!im) return; const w = im.naturalWidth, h = im.naturalHeight; if (a < 1) { g.save(); g.globalAlpha = a; } g.drawImage(im, 0, 0, w, h, Math.round((x - w / 4) * 2) / 2, Math.round((y - h / 4) * 2) / 2, w / 2, h / 2); if (a < 1) g.restore(); }
function drawOrbAnim(g, ctx, cx, cy, O) {
  if (!O || O.t < 0) return; const u = Math.min(1, O.t / O.T), p = ctx.S.player; g.save(); g.imageSmoothingEnabled = false;
  if (O.ph === 'throw') { const x = O.x0 + (O.x1 - O.x0) * u, gy = O.y0 + 9 + (O.y1 - O.y0 - 9) * u, lift = Math.sin(u * Math.PI) * 24 + (1 - u) * 9;
    g.globalAlpha = 0.25; g.fillStyle = '#000'; g.beginPath(); g.ellipse(x - cx, gy - cy, 3, 1.2, 0, 0, TAU); g.fill(); g.globalAlpha = 1;
    fxSprite(g, 'orb_small', x - cx, gy - lift - cy); }
  else { const hx = p.x + (p.dir === 1 ? -4 : 4), hy = p.y - 9, a0 = 0.32;
    if (u < a0) { const k = u / a0; drawForm(g, O.form, 'idle', O.dir, ctx.S.time, (globalThis.__R89||Math.round)(O.gx - cx), (globalThis.__R89||Math.round)(O.gy - cy), 1 - k);   /* linh thú mờ dần, tia chấm sáng từ tay tới */
      const L0 = Math.hypot(O.gx - hx, O.gy - 6 - hy), n = Math.max(2, Math.floor(L0 / 4)), vis = Math.min(n, Math.ceil(n * Math.min(1, k * 2.5)));
      for (let i = 0; i <= vis; i++) { const t = i / n; fxSprite(g, 'orb_dot3', hx + (O.gx - hx) * t - cx, hy + (O.gy - 6 - hy) * t - cy, 0.9); }
      fxSprite(g, k < 0.5 ? 'orb_dot6' : 'orb_dot10', O.gx - cx, O.gy - 6 - cy); }
    else { const k = (u - a0) / (1 - a0), x = O.gx + (hx - O.gx) * k, y = O.gy - 6 + (hy - O.gy + 6) * k - Math.sin(k * Math.PI) * 10;   /* chấm sáng bay về tay theo vòng cung, vệt 2 chấm nhỏ */
      for (let j = 2; j >= 1; j--) { const kk = Math.max(0, k - j * 0.08), xx = O.gx + (hx - O.gx) * kk, yy = O.gy - 6 + (hy - O.gy + 6) * kk - Math.sin(kk * Math.PI) * 10; fxSprite(g, 'orb_dot3', xx - cx, yy - cy, 0.8 - j * 0.2); }
      fxSprite(g, 'orb_dot10', x - cx, y - cy); } }
  g.restore();
}
function drawBurst(g, b, cx, cy) {
  if (b.small) { fxSprite(g, b.t < 0.08 ? 'orb_dot10' : 'orb_dot6', b.x - cx, b.y - cy); return; }
  const im = uiImg('linhthu/fx/orb_burst.png'); if (!im) return; const f = Math.min(3, Math.floor(b.t * 16)), S = im.naturalHeight;
  g.save(); g.imageSmoothingEnabled = false; g.drawImage(im, f * S, 0, S, S, (globalThis.__R89||Math.round)(b.x - cx - S / 4), (globalThis.__R89||Math.round)(b.y - cy - 6 - S / 4), S / 2, S / 2); g.restore();
}
const shellOf = (st, lv) => 'orb_' + (st === 'rest' ? 'rest' : st === 'out' ? 'out' : 'full') + (st !== 'rest' && lv > 1 ? '_l' + lv : '');   /* vỏ quả cầu theo cấp: đồng → bạc (ngọc lam) → vàng (hồng ngọc) — PixelLab */
const ORB_CSS = `.lt-orb{position:fixed;z-index:7;width:52px;height:52px;padding:0;margin:0;border:none;border-radius:50%;background:url(assets/px/ui/mslots/ring.png) no-repeat center/100% 100%;image-rendering:pixelated;pointer-events:auto;touch-action:none;-webkit-touch-callout:none;user-select:none;-webkit-user-select:none;cursor:pointer}
.lt-orb img{position:absolute;image-rendering:pixelated;pointer-events:none}.lt-orb img.sh{width:34px;height:34px;left:9px;top:6px}.lt-orb img.pe{width:20px;height:20px;left:16px;top:13px}
.lt-orb i{position:absolute;left:0;right:0;bottom:-7px;font:15px/1 VT323,monospace;color:#fff6c8;font-style:normal;text-align:center;pointer-events:none;text-shadow:1px 1px 0 #352022,-1px 0 0 #352022,0 -1px 0 #352022,1px 0 0 #352022}
.lt-orb u{position:absolute;right:-2px;top:-4px;font:13px/1 VT323,monospace;color:#fff6c8;text-decoration:none;text-shadow:1px 1px 0 #352022,-1px 0 0 #352022;pointer-events:none}
.lt-orb s{position:absolute;left:-3px;top:-4px;min-width:14px;height:14px;padding:0 2px;font:13px/14px VT323,monospace;color:#2a1608;background:#ffd45e;border:1px solid #301007;text-decoration:none;text-align:center;pointer-events:none}.lt-orb s:empty{display:none}
.lt-orb b.cd{position:absolute;display:block;left:6px;top:6px;width:40px;height:40px;clip-path:circle(50% at 50% 50%);overflow:hidden;pointer-events:none;background:conic-gradient(rgba(20,12,10,.62) calc(var(--cd,0) * 360deg),transparent 0)}
.lt-orb b.hp{position:absolute;display:block;left:1px;top:1px;width:50px;height:50px;border-radius:50%;pointer-events:none;background:var(--hpg,conic-gradient(#7bd04a 360deg,rgba(40,20,12,.55) 0));-webkit-mask:radial-gradient(circle,transparent 21px,#000 22px,#000 24px,transparent 25px);mask:radial-gradient(circle,transparent 21px,#000 22px,#000 24px,transparent 25px)}.lt-orb.out img.pe{display:none}.lt-orb.rest img.pe{filter:grayscale(1);opacity:.6}.lt-orb.rest i{color:#a39d94}
.lt-orb.up{animation:ltOrbUp .7s ease-out 1}@keyframes ltOrbUp{0%{transform:scale(1)}35%{transform:scale(1.28)}100%{transform:scale(1)}}
#menu .mframe{width:min(880px,100%)}`;   /* 2026-10-15: khung menu rộng 880 px cho 7 thẻ một hàng (thêm thẻ Ấn Linh) */
function hpGrad(ctx) {   /* vòng máu chia đoạn theo số con trong đội (khe 6° giữa các đoạn) */
  const T = teamIds(ctx); if (!T.length) return ''; const n = T.length, seg = 360 / n, gap = n > 1 ? 6 : 0, bg = 'rgba(40,20,12,.55)', parts = [];
  T.forEach((id, i) => { const k = owned(ctx, id), q = k ? Math.max(0, Math.min(1, hpOf(k) / ltMax(k))) : 0, col = restLeft(ctx, id) > 0 ? '#8a8279' : q > 0.5 ? '#7bd04a' : q > 0.25 ? '#ffd45e' : '#ff5a5a', a = i * seg + gap / 2, b = a + (seg - gap) * q, e = (i + 1) * seg - gap / 2;
    parts.push(`transparent ${(i * seg).toFixed(1)}deg ${a.toFixed(1)}deg`, `${col} ${a.toFixed(1)}deg ${b.toFixed(1)}deg`, `${bg} ${b.toFixed(1)}deg ${e.toFixed(1)}deg`, `transparent ${e.toFixed(1)}deg ${((i + 1) * seg).toFixed(1)}deg`); });
  return `conic-gradient(${parts.join(',')})`;
}
function orbUi(ctx) {
  if (typeof document === 'undefined') return;
  if (ART.man && ART.man.ui) { const U = ART.man.ui; (U.items ||= {})[NGOC] ||= 'linhthu/fx/ngoc_linh.png'; (U.tabs ||= {}).anlinh = 'linhthu/fx/orb_full' + (sv(ctx).orbLv > 1 ? '_l' + sv(ctx).orbLv : '') + '.png'; }   /* ảnh PixelLab cho ô túi + thẻ menu (không sửa manifest chung) */
  if (!ST.orbEl) {
    if (!document.getElementById('lt-orb-css')) { const s = document.createElement('style'); s.id = 'lt-orb-css'; s.textContent = ORB_CSS + PANEL_CSS; document.head.appendChild(s); }
    const b = document.createElement('button'); b.id = 'lt-orb'; b.className = 'lt-orb'; b.innerHTML = '<b class="hp"></b><img class="sh" alt=""><img class="pe" alt=""><b class="cd"></b><i></i><u></u><s></s>'; b.style.display = 'none';
    b.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); orbPress(ST.ctx); }); document.body.appendChild(b); ST.orbEl = b;
    if (!ST.orbKey) { ST.orbKey = true; addEventListener('keydown', e => { if (e.code !== 'KeyU' || e.repeat || e.ctrlKey || e.metaKey || e.altKey) return; const a = document.activeElement; if (a && /^(INPUT|TEXTAREA)$/.test(a.tagName)) return; orbPress(ST.ctx); }); }
  }
  { const k0 = sv(ctx); if (!k0.hintU && ctx.S.mode === 'play' && orbState(ctx) === 'in') { if ((ST.hintT = (ST.hintT || 0) + 1) > 90) { k0.hintU = 1; ST.stats.hint = (ST.stats.hint || 0) + 1; ctx.toast(matchMedia('(pointer: coarse)').matches ? L(ctx).orbHintTap : L(ctx).orbHintPc); ctx.persist(); } } }   /* 2026-10-15 anh: lần đầu có linh thú trong cầu → nhắc 1 dòng, một lần (save.sys.linhthu.hintU) */
  const b = ST.orbEl, st = orbState(ctx), hs = document.querySelector('#hotbar .hb-lt'), show = st !== 'none' && ctx.S.mode === 'play' && !(hs && hs.getClientRects().length);   /* 2026-10-15 anh: máy tính dùng ô Ấn Linh trên thanh công cụ (hotbar.js) → ẩn nút tròn; điện thoại / thanh ẩn vẫn dùng nút tròn */
  if (!show) { if (b.style.display !== 'none') b.style.display = 'none'; return; }
  if (b.style.display === 'none') { b.style.display = ''; ST.orbLayT = 0; }
  const k = sv(ctx), T = teamIds(ctx), first = readyIds(ctx)[0] || T[0], kk = owned(ctx, first), form = formOf(first, kk ? kk.evo : 0), lv = k.orbLv || 1, sig = st + ':' + form + ':' + vi(ctx) + ':' + lv + ':' + T.join();
  if (ST.orbSig !== sig) { ST.orbSig = sig; b.className = 'lt-orb ' + st + (ST.orbUpT > performance.now() ? ' up' : ''); b.querySelector('img.sh').src = 'assets/px/linhthu/fx/' + shellOf(st, lv) + '.png'; b.querySelector('img.pe').src = 'assets/px/linhthu/' + form + '_icon.png'; b.querySelector('i').textContent = st === 'out' ? L(ctx).orbLblOut : L(ctx).orbLbl;   /* anh 2026-10-15: trong cầu 'Gọi', đang ở ngoài 'Thu', nghỉ 'Gọi' xám */ b.querySelector('u').textContent = matchMedia('(pointer: coarse)').matches ? '' : 'U'; b.querySelector('s').textContent = T.length > 1 ? String(T.length) : ''; }
  const cd = st === 'rest' ? Math.max(0, Math.min(1, Math.min(...T.map(id => restLeft(ctx, id))) / ORB.restS)) : 0; b.style.setProperty('--cd', cd.toFixed(3));
  { const gq = hpGrad(ctx); if (b.__hpg !== gq) { b.__hpg = gq; b.style.setProperty('--hpg', gq); } }   /* vòng máu cả đội */
  if ((ST.orbLayT = (ST.orbLayT || 0) - 1) > 0) return; ST.orbLayT = 15;   /* đặt chỗ ~4 lần / giây */
  const W = 52, coarse = matchMedia('(pointer: coarse)').matches, vis = e => e && !e.hidden && !e.closest('[hidden]') && getComputedStyle(e).display !== 'none' && getComputedStyle(e).visibility !== 'hidden';
  const taken = []; for (const e of document.querySelectorAll('#touch button, #mslots > *, #joy, .dpad, #altw, #herobar, #herobar .hb-num, #herobar .hb-lv, #hotbar, #btn-chat, .sky-btn, #btn-copter, #px-clock, #px-status, #px-money, #btn-menu, #btn-photo, #btn-tgt')) { if (e === b || !vis(e)) continue; const q = e.getBoundingClientRect(); if (q.width && q.height) taken.push(q); }
  const free = (x, y) => x >= 4 && y >= 4 && x + W <= innerWidth - 4 && y + W <= innerHeight - 4 && !taken.some(q => !(x + W <= q.left - 3 || x >= q.right + 3 || y + W <= q.top - 3 || y >= q.bottom + 3));
  const cands = [];
  if (coarse) { const a = document.getElementById('btn-a'), r = a && vis(a) && a.getBoundingClientRect(); if (r && r.width) { const step = W + 6; for (let col = 1; col <= 6; col++) cands.push([r.left - col * step, r.top + (r.height - W) / 2]); for (let row = 1; row <= 6; row++) for (let col = 0; col <= 5; col++) cands.push([r.right - W - col * step, r.top - row * step]); } }
  else { const hb = document.getElementById('herobar'), aw = document.getElementById('altw'), r = hb && vis(hb) && hb.getBoundingClientRect(), ra = aw && vis(aw) ? aw.getBoundingClientRect() : null; if (r && r.width) { const L0 = Math.min(r.left, ra ? ra.left : r.left); for (let col = 0; col <= 6; col++) for (let row = 0; row <= 3; row++) cands.push([L0 - W - 8 - col * (W + 6), r.bottom - W - row * (W + 6)]); } }
  const at = cands.find(([x, y]) => free(x, y)) || cands[0] || [innerWidth - W - 12, innerHeight - W - 140];
  b.style.left = Math.round(at[0]) + 'px'; b.style.top = Math.round(at[1]) + 'px';
}
function slotInfo(ctx) {   /* 2026-10-15 anh: trạng thái cho ô Ấn Linh trên thanh công cụ máy tính (hotbar.js đọc qua ctx.linhthu.slot) */
  const k = sv(ctx), T = teamIds(ctx), st = orbState(ctx), lv = k.orbLv || 1, first = readyIds(ctx)[0] || T[0], kk = first ? owned(ctx, first) : null;
  return { st, lv, has: Object.keys(k.owned).length, n: T.length, out: ST.cs.length, shell: 'assets/px/linhthu/fx/' + shellOf(st, lv) + '.png', pet: first ? 'assets/px/linhthu/' + formOf(first, kk ? kk.evo : 0) + '_icon.png' : '',
    rest: st === 'rest' ? Math.ceil(Math.min(...T.map(id => restLeft(ctx, id)))) : 0, names: T.map(id => nameOf(ctx, id, owned(ctx, id).evo)),
    hp: T.map(id => { const o = owned(ctx, id); return { q: Math.max(0, Math.min(1, hpOf(o) / ltMax(o))), rest: restLeft(ctx, id) > 0 }; }), hpg: hpGrad(ctx) };
}
function orbCost(ctx) {   /* → { lv, next, need: { stone, jade, species }, have: {…}, ok } — next null = cấp tối đa */
  const k = sv(ctx), lv = k.orbLv || 1, next = lv < ORB_MAX ? lv + 1 : null; if (!next) return { lv, next: null, ok: false };
  const need = ORB_UP[next], have = { stone: ctx.bag.count('stone'), jade: ctx.bag.count(NGOC), species: Object.keys(k.owned).length };
  return { lv, next, need, have, ok: have.stone >= need.stone && have.jade >= need.jade && have.species >= need.species };
}
function upgradeOrb(ctx) {
  const c = orbCost(ctx); if (!c.next) return false; if (!c.ok) { ctx.toast(L(ctx).orbUpNo); ctx.sfx('fail'); return false; }
  ctx.bag.remove('stone', c.need.stone); ctx.bag.remove(NGOC, c.need.jade); const k = sv(ctx); k.orbLv = c.next; teamIds(ctx);
  ST.orbUpT = performance.now() + 700; ST.orbSig = null; const p = ctx.S.player; if (ctx.vfx && p) ctx.vfx('level_up', p.x, p.y); ctx.sfx('win'); ctx.toast(L(ctx).orbUpOk(c.next), true); ST.stats.orbUp = (ST.stats.orbUp || 0) + 1; log('orb up ' + c.next); ctx.persist(); return true;
}

/* ================= MÁU LINH THÚ (2026-10-15 anh: "làm máu cho cóc luôn") — chung mọi loài =================
   Máu theo cấp (thấp hơn Rocky một chút: Rocky 60 + 14/cấp), thủ nhẹ. Lưu owned[id].hp. Bị trúng: quái thường đánh trả khi linh thú vừa đánh nó và đứng sát (như Rocky) ·
   đòn có báo trước của trùm (ctx.threat: vùng / tia / đạn) trúng chỗ linh thú lúc chạm · hook chung ctx.ltHurt(x, y, r, dmg, kind) cho trùm gọi (dmg ≤ 1 = phần máu tối đa).
   Đòn mạnh (kind 'fly' / vùng to / lao) → hất bay. Số sát thương nổi đỏ như Rocky. Thanh máu nhỏ trên đầu (kiểu Rocky) + vòng cung máu trên ô Ấn Linh.
   Hồi: trong Ấn Linh hồi 3 %/s; ngoài không tự hồi; 0 máu → tự về ấn nghỉ 60 s → dậy với 50 % máu. (Chưa cho ăn để hồi: món thích dùng để BẮT, giữ đơn giản.) */
const ltMax = k => Math.round(48 + 12 * (((k && k.lv) || 1) - 1)), ltDef = k => Math.floor(0.4 * (((k && k.lv) || 1) - 1));
const LT_REGEN = 0.03, LT_WAKE = 0.5, MON_CD = 1.4;
function hpOf(k) { if (k.hp == null || !(k.hp <= ltMax(k))) k.hp = Math.min(k.hp ?? ltMax(k), ltMax(k)); return k.hp; }
function ltHurt(ctx, raw, src, kind, C = ST.c) {   /* → máu đã trừ (C: con bị trúng; mặc định con đầu đội) */
  const k = C && owned(ctx, C.id); if (!C || !k || C.hidden || ST.orbs.some(o => o.id === C.id) || (C.iT || 0) > ctx.S.time || !ST.cs.includes(C)) return 0;
  const d = Math.max(1, Math.round(raw) - ltDef(k)); k.hp = Math.max(0, hpOf(k) - d); C.hurtT = 0.25; C.iT = ctx.S.time + (kind === 'fly' ? 1 : kind === 'bite' ? 0.3 : 0.5); C.barT = ctx.S.time + 4;
  if (ctx.pop) ctx.pop(C.x, C.y - headY(C) - 1, '-' + d, '#ff8a8a'); ST.stats.ltHits = (ST.stats.ltHits || 0) + 1; ST.stats.ltDmg = (ST.stats.ltDmg || 0) + d; log('hurt ' + C.id + ' -' + d + ' ' + (kind || '') + ' hp ' + k.hp + '/' + ltMax(k));
  if (kind === 'fly' && src) knockFly(ctx, C, src);
  if (k.hp <= 0) { k.hp = 0; C.kfly = null; koToOrb(ctx, C); }
  return d;
}
function knockFly(ctx, C, src) {   /* đòn mạnh hất bay linh thú (như Rocky / người chơi) */
  const dx = C.x - src.x, dy = C.y - src.y, L0 = Math.hypot(dx, dy) || 1; C.cast = null; C.jump = null; C.hop = null; C.hw = null; if (ST.tongue && ST.tongue.C === C) ST.tongue = null;
  C.kfly = { vx: dx / L0 * 150, vy: dy / L0 * 150, t: 0, T: 0.55 }; ST.stats.ltFly = (ST.stats.ltFly || 0) + 1; log('knock fly');
}
function kflyTick(ctx, C, dt) {
  const K = C.kfly; K.t += dt; const u = Math.min(1, K.t / K.T), m = ctx.S.map, nx = C.x + K.vx * dt * (1 - u * 0.6), ny = C.y + K.vy * dt * (1 - u * 0.6);
  if (floaty(C.id) || !ctx.isSolid(m, Math.floor(nx / TS), Math.floor((ny - 2) / TS))) { C.x = nx; C.y = ny; } else { K.vx *= -0.3; K.vy *= -0.3; }   /* chạm vật cứng: dừng / dội nhẹ, không xuyên */
  C.lift = Math.sin(u * Math.PI) * 18; if (u >= 1) { C.kfly = null; C.lift = 0; if (ctx.vfx) ctx.vfx('dirt_puff', C.x, C.y + 1); }
}
const THRH = new Map();
function thrHits(t, x, y) { if (t.radius != null) return Math.hypot(x - t.to.x, y - t.to.y) <= t.radius + 5; const ax = t.from.x, ay = t.from.y, dx = t.to.x - ax, dy = t.to.y - ay, L2 = dx * dx + dy * dy || 1, u = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / L2)); return Math.hypot(x - (ax + dx * u), y - (ay + dy * u)) <= (t.width || 12) / 2 + 5; }
function thrAt(t, x, y) { if (t.speed == null) return t.at; const ax = t.from.x, ay = t.from.y, dx = t.to.x - ax, dy = t.to.y - ay, L2 = dx * dx + dy * dy || 1, u = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / L2)); return (t.t0 || 0) + u * Math.sqrt(L2) / Math.max(1, t.speed); }
function hpTick(ctx, dt) {   /* máu từng con: dậy sau nghỉ, hồi khi nằm trong Ấn Linh, quái đánh trả / đòn báo trước trúng chỗ con đang ở ngoài */
  const k0 = sv(ctx), now = ctx.S.time, outIds = new Set(ST.cs.map(c => c.id));
  for (const [id, k] of Object.entries(k0.owned || {})) { if (!k) continue; hpOf(k);
    if ((k.rest || 0) > 0 && nowS() >= k.rest) { k.rest = 0; k.hp = Math.max(k.hp, Math.round(ltMax(k) * LT_WAKE)); log('wake ' + id + ' hp ' + k.hp); }
    if (!outIds.has(id) && !((k.rest || 0) > nowS()) && k.hp < ltMax(k)) k.hp = Math.min(ltMax(k), k.hp + ltMax(k) * LT_REGEN * dt); }   /* trong Ấn Linh / trong kho: hồi dần */
  const TL = ctx.threat && ctx.threat.list && !ST.thrOff ? ctx.threat.list() : [];   /* thrOff: chỉ để test móc đòn trùm riêng */
  for (const C of ST.cs.slice()) { if (!ST.cs.includes(C) || C.hidden || ST.orbs.some(o => o.id === C.id)) continue; const k = owned(ctx, C.id); if (!k) continue;
    for (const mo of mons(ctx)) { const key = '__ltCd_' + C.id; if (mo[key] > 0) mo[key] -= dt; if (now - (mo.__ltHit ?? -99) < 5 && dst(mo, C) < 24 + (isBoss(mo) ? 16 : 0) && !(mo[key] > 0)) { mo[key] = MON_CD; ltHurt(ctx, (mo.c.dmg || 8) * (isBoss(mo) ? 1 : 0.8), mo, 'bite', C); if (!ST.cs.includes(C)) break; } }
    if (!ST.cs.includes(C)) continue;
    for (const t of TL) { if (!t || !t.from || !t.to || now - (THRH.get(t.id + ':' + C.id) ?? -99) < 1) continue; const at = thrAt(t, C.x, C.y - 6); if (now < at || now > at + (t.dur || 0) + 0.12) continue; if (!thrHits(t, C.x, C.y - 6)) continue;
      THRH.set(t.id + ':' + C.id, now); const mo = t.id && t.id.c ? t.id : null, small = mo && !isBoss(mo), big = !small && (t.kind === 'lunge' || (t.radius || 0) >= 28 || (t.width || 0) >= 24);
      ltHurt(ctx, small ? (mo.c.dmg || 8) * 0.8 : ltMax(k) * (big ? 0.24 : 0.14) + ltDef(k), mo || t.from, big ? 'fly' : 'hit', C); if (!ST.cs.includes(C)) break; } }
  if (THRH.size > 60) for (const [i, tt] of THRH) if (now - tt > 4) THRH.delete(i);
}
function drawHpBar(ug, ctx, cx, cy, scale) {   /* thanh máu nhỏ trên đầu (cùng kiểu Rocky) khi đang đánh / bị thương — mỗi con một thanh */
  for (const C of ST.cs) { const k = owned(ctx, C.id); if (!k || C.hidden || C.hide || ST.orbs.some(o => o.id === C.id)) continue; const max = ltMax(k), hp = hpOf(k);   /* C.hide: đang chui ngầm (Chũi) → ẩn cả thanh máu */
    if (!(hp < max * 0.999 || (C.barT || 0) > ctx.S.time || C.cast)) continue;
    const w = Math.round(14 * scale), x = (globalThis.__R89||Math.round)((C.x - cx) * scale - w / 2), y = (globalThis.__R89||Math.round)((C.y - headY(C) - (C.lift || 0) - (floaty(C.id) ? (SP[C.id].flyH || 5) : 0) - cy) * scale), h = Math.max(4, (globalThis.__u89?globalThis.__u89(scale):scale)), q = Math.max(0, Math.min(1, hp / max));
    ug.fillStyle = '#3a1c0c'; ug.fillRect(x - 1, y - 1, w + 2, h + 2); ug.fillStyle = '#5a2a2a'; ug.fillRect(x, y, w, h); ug.fillStyle = q > 0.5 ? '#7bd04a' : q > 0.25 ? '#ffd45e' : '#ff5a5a'; ug.fillRect(x, y, Math.round(w * q), h); }
}

/* ---------------- CHIÊU 2: NHẢY VŨNG DẬP NƯỚC (2026-10-15) ----------------
   Cần nước: vũng / ô nước của map / ao tự đào trong ~2,5 ô quanh mục tiêu, HOẶC mưa của Gọi Mưa đang phủ chỗ mục tiêu (mưa tính là nguồn nước).
   Nhảy cong (clip nhảy) → đáp: VFX PixelLab vfx_workbench 'Coc Nhay Vung Dap Nuoc' (vòng giọt + gợn + cột nước, 9 khung 71 ms), sát thương vòng r 34 + đẩy lùi quái nhỏ;
   còn vũng khác gần mục tiêu → nhảy nối (≤ 3 lần), rồi hồi 5 s. */
const CPFX = {   /* 2026-10-15 Cá Chép cute: VFX PixelLab vfx_workbench (bảng màu nước ao #3f78b8…#d6f1ff), ax / ay = gốc (px ảnh), vẽ ½ (1 px ảnh = ½ px logic như sprite) */
  'cp:jet': { img: 'linhthu/fx/cp_jet.png', fw: 29, fh: 17, n: 8, ms: 83, ax: 20, ay: 8, loop: true },
  'cp:hit': { img: 'linhthu/fx/cp_hit.png', fw: 40, fh: 33, n: 9, ms: 71, ax: 20, ay: 17 },
  'cp:spout': { img: 'linhthu/fx/cp_spout.png', fw: 77, fh: 85, n: 9, ms: 71, ax: 39, ay: 55 },
  'cp:crown': { img: 'linhthu/fx/cp_crown.png', fw: 114, fh: 89, n: 9, ms: 71, ax: 58, ay: 45, free: true },   /* cú đập Vượt Vũ Môn: chỉ cột + giọt bắn (không gợn) → vẽ được cả trên cạn */
  'de:wave': { img: 'linhthu/fx/de_wave.png', fw: 146, fh: 150, n: 8, ms: 71, ax: 4, ay: 75, rot: true, free: true },   /* Dế Gáy Rung (điều phối 2026-10-15: spar_crow trắng to như vết chém → bỏ): nón 3 cung hổ phách mảnh vfx_workbench, cung đầu sát miệng, lan tới ~tầm đánh, xoay theo hướng gáy */
  'de:ring1': { img: 'linhthu/fx/de_ring1.png', fw: 144, fh: 60, n: 7, ms: 71, ax: 72, ay: 30, free: true, ground: 15 },   /* Hoà Âm Địa Chấn: vòng 1 r ≈ 34 */
  'de:ring2': { img: 'linhthu/fx/de_ring2.png', fw: 202, fh: 82, n: 7, ms: 71, ax: 101, ay: 41, free: true, ground: 21 },   /* vòng 2 r ≈ 52 */
  'de:ring3': { img: 'linhthu/fx/de_ring3.png', fw: 270, fh: 108, n: 7, ms: 71, ax: 135, ay: 54, free: true, ground: 27 },   /* vòng 3 r ≈ 70 */
  'chui:burst': { img: 'linhthu/fx/chui_burst.png', fw: 62, fh: 47, n: 8, ms: 71, ax: 31, ay: 14, free: true },   /* Chũi Đào Hầm: cục đất nâu + bụi + vài lấp lánh thạch anh, ~31×23 px logic */
  'chui:trail': { img: 'linhthu/fx/chui_trail.png', fw: 22, fh: 24, n: 9, ms: 83, ax: 11, ay: 18, free: true },   /* bụi đất NHỎ (~11×12 px logic, vfx_workbench 7cae16a2) nổi dọc đường hầm khi Chũi chạy ngầm */
  'tk:prism': { img: 'linhthu/fx/tk_prism.png', fw: 47, fh: 53, n: 7, ms: 62, ax: 19, ay: 43, free: true },   /* ay +16: gốc đặt ở CHÂN (vẽ trước thân tắc kè), tâm loé ở ngực */   /* Tắc Kè Lăng Kính Chói: loé trắng → cầu 7 màu → lấp lánh 7 màu toả ra, ~23×26 px logic, 0,44 s */
  'cn:jet': { img: 'linhthu/fx/cn_jet.png', fw: 171, fh: 65, n: 8, ms: 100, ax: 11, ay: 38, rot: true, flipY: true, free: true },   /* 2026-10-16 Thuỷ Pháo Địa Chấn: tia nước PixelLab vfx_workbench (bảng màu nước ao), gốc ở miệng, xoay theo hướng bắn, ~0,8 s */
  'cn:ring1': { img: 'linhthu/fx/cn_ring1.png', fw: 116, fh: 50, n: 8, ms: 71, ax: 58, ay: 25, free: true, ground: 13 },   /* vòng sóng bùn nước r ≈ 29 */
  'cn:ring2': { img: 'linhthu/fx/cn_ring2.png', fw: 160, fh: 66, n: 8, ms: 71, ax: 80, ay: 33, free: true, ground: 17 },   /* vòng 2 r ≈ 40 */
  'cp:ring': { img: 'linhthu/fx/cp_ring.png', fw: 130, fh: 89, n: 10, ms: 71, ax: 65, ay: 45, waterOnly: true } };   /* sóng tròn lan ra: CHỈ trên ô nước (luật anh 2026-10-15: gợn nước không tràn ra cát) */
/* plan-69 đợt 5: VFX linh thú vẽ code — tên hiệu ứng (CPFX / sheet) → cảnh code (pxfx_world.js) qua ctx.wfx; ?vfx=old → đường cũ.
   Không đổi: cp:ring (gợn chỉ trên ô nước — p68), vũng / splash3, tr_sandwind, sky_gust, hr_clashorb_s, đá rơi chui_rock (vật thể). */
const LT69 = {
  'cp:hit': ['ltsplash', {}], 'cp:crown': ['ltspout', { h: 26 }], 'cp:spout': ['ltspout', { h: 18 }],
  bk_kick_sand: ['dirt', {}], rc_hit_earth: ['earthhit', {}], lt_sandtwister: ['sandtwister', { r: 44 }],
  'de:wave': ['cone', {}], ult_quakering: ['quakering', { r: 34 }], 'de:ring1': ['quakering', { r: 34 }], 'de:ring2': ['quakering', { r: 52 }], 'de:ring3': ['quakering', { r: 70 }],
  leaf_fall: ['leaves', {}], spar_hornhit: ['hornhit', {}], knock_erupt: ['erupt', {}],
  'chui:burst': ['chuiburst', {}], 'chui:trail': ['dirt', {}], rock_debris: ['rock', {}],
  ki_wind: ['kiwind', {}], knock_streak: ['heavy', {}], spar_shock: ['quakering', { r: 30, pal: 'dirt' }],
  'tk:prism': ['prism', {}], ult_firehit: ['firehit', {}], arena_flame: ['flames', {}], spar_firepatch: ['flames', { small: 1 }],
  bk_zap: ['zap', {}], td_spark: ['zap', { small: 1 }], td_bolt: ['bolt', {}], hd_implode: ['implode', {}],
  knock_jab: ['jab', {}], u_puff: ['tonguehit', {}],
};
const OLD69 = () => typeof window !== 'undefined' && window.__wfx && window.__wfx.old && window.__wfx.old();
function fx69(ctx, n, x, y, dur, ang, k0) {
  const m = n && LT69[n]; if (!m || !ctx || !ctx.wfx) return false;
  const o = Object.assign({}, m[1]); if (dur) o.dur = dur; if (ang != null) o.ang = ang; if (k0 != null && ang != null) o.ky = k0 + (Math.sin(ang) < 0 ? -0.5 : 0.5);   /* chiêu phóng từ thân: luật lớp vẽ chiêu */
  return ctx.wfx(m[0], x, y, o);
}
/* đạn linh thú vẽ code (½ px logic): đầu + vệt đuôi nhỏ dần; màu theo hệ */
const PJ69 = {
  'cp:jet': { c: ['#ffffff', '#eef9ff', '#b4e1fd', '#80c9fc', '#569bf3', '#3571cd', '#1d3f7a'], r: 3, tail: 2.2 },
  arena_flame: { c: ['#fffbb0', '#ffe55a', '#ffb52e', '#fc7e27', '#e8481f', '#b0301a', '#6e1c10'], r: 3.5, tail: 2.6, smoke: true },
  hr_orb: { c: ['#ffffff', '#f6e8ff', '#ddc0ff', '#bc95f2', '#9a6bd9', '#58368f', '#22143e'], r: 3.2, tail: 2.2 },
};
function pxh(g, x, y, c) { g.fillStyle = c; g.fillRect(Math.round(x * 2) / 2, Math.round(y * 2) / 2, 0.5, 0.5); }
function drawProj69(g, b, cx, cy) {
  const P = PJ69[b.fx], C = P.c, tr = b.tr || [], n = tr.length >> 1;
  for (let i = 0; i < n; i++) { const k = (i + 1) / n, r = 0.5 + k * P.tail, x = tr[i * 2] - cx, y = tr[i * 2 + 1] - cy, c = P.smoke && k < 0.35 ? '#8a7f86' : C[Math.min(6, 2 + Math.round((1 - k) * 4))];
    for (let yy = -r; yy <= r; yy += 0.5) for (let xx = -r; xx <= r; xx += 0.5) if (xx * xx + yy * yy <= r * r) pxh(g, x + xx, y + yy, c); }
  const x = b.x - cx, y = b.y - cy, R = P.r, a = Math.atan2(b.vy, b.vx), ca = Math.cos(a), sa = Math.sin(a);
  for (let yy = -R; yy <= R; yy += 0.5) for (let xx = -R * 1.3; xx <= R * 1.3; xx += 0.5) { const u = (xx * ca + yy * sa) / 1.3, v = -xx * sa + yy * ca, d = Math.sqrt(u * u + v * v) / R; if (d > 1) continue;
    pxh(g, x + xx, y + yy, d > 0.85 ? C[5] : d > 0.6 ? C[3] : d > 0.32 ? C[2] : (u > 0 ? C[0] : C[1])); }
}
function fxAt(ctx, n, x, y, dur, ang, k0, C, cut) { if (!n) return; if (!OLD69() && fx69(ctx, n, x, y, dur, ang, k0)) return true; if (CPFX[n]) { const F = CPFX[n], wet = wetAt(ctx, x, y); if (F.waterOnly && !wet) return true; (ST.cpfx ||= []).push({ n, x, y, a: ang || 0, k0, C, cut, t0: ctx.S.time || 0, wet, wt: F.free ? null : waterTilesNear(ctx, x, y, 5) }); return true; } return ctx.vfx && ctx.vfx(n, x, y, dur); }
function cpLen(F) { if (!F.art) return F.n * F.ms; const s = ART.vfx && ART.vfx[F.art]; return s ? s.n * 1000 / (s.fps || 12) : 600; }
function drawCpFx(g, e, cx, cy, t) { const F = CPFX[e.n];
  if (F.art) { const s = ART.vfx && ART.vfx[F.art]; if (!s || !s.img) return; const f = Math.min(s.n - 1, Math.floor(Math.max(0, t - e.t0) * (s.fps || 12))), hi = s.img.__hi ? 1 : 2; g.save(); g.translate((globalThis.__R89||Math.round)(e.x - cx), (globalThis.__R89||Math.round)(e.y - cy)); g.rotate(e.a || 0); if (Math.cos(e.a || 0) < -0.01) g.scale(1, -1); g.drawImage(s.img, f * s.w * hi, 0, s.w * hi, s.h * hi, -2, -Math.round(s.h / 2), s.w, s.h); g.restore(); return; }   /* sheet PixelLab chung (manifest vfx) vẽ xoay quanh gốc = miệng, như spar.js */
  const im = uiImg(F.img); if (!im) return;
  if (F.rot) { const f = Math.min(F.n - 1, Math.floor(Math.max(0, t - e.t0) * 1000 / F.ms)); g.save(); g.translate((globalThis.__R89||Math.round)(e.x - cx), (globalThis.__R89||Math.round)(e.y - cy)); g.rotate(e.a || 0); if (F.flipY && Math.cos(e.a || 0) < -0.01) g.scale(1, -1); g.drawImage(im, f * F.fw, 0, F.fw, F.fh, -F.ax / 2, -F.ay / 2, F.fw / 2, F.fh / 2); g.restore(); return; }   /* ảnh riêng xoay quanh gốc (miệng) */ const f = Math.min(F.n - 1, Math.floor(Math.max(0, t - e.t0) * 1000 / F.ms));
  let clip = false; if (!F.free) { g.save(); g.beginPath(); clip = true; if (e.wet || F.waterOnly) { for (const w of e.wt || []) { const rx = w.tx * TS - cx, ry = w.ty * TS - cy, up = w.top ? 48 : 0; g.rect(rx, ry - up, TS, TS + up); } } else g.rect(e.x - cx - 80, e.y - cy - 120, 160, 117); g.clip(); }   /* trên nước: cắt theo ô nước (+ khoảng trời trên mép trên cho cột / giọt); trên cạn: bỏ phần gợn sát đất, giữ tia nước phía trên */
  g.drawImage(im, f * F.fw, 0, F.fw, F.fh, (globalThis.__R89||Math.round)(e.x - cx - F.ax / 2), (globalThis.__R89||Math.round)(e.y - cy - F.ay / 2), F.fw / 2, F.fh / 2); if (clip) g.restore(); }
function drawCpProj(g, b, cx, cy) { const F = CPFX[b.fx], im = uiImg(F.img); if (!im) return false; const f = Math.floor(b.t * 1000 / F.ms) % F.n; g.save(); g.translate((globalThis.__R89||Math.round)(b.x - cx), (globalThis.__R89||Math.round)(b.y - cy)); g.rotate(Math.atan2(b.vy, b.vx)); g.drawImage(im, f * F.fw, 0, F.fw, F.fh, -F.ax / 2, -F.ay / 2, F.fw / 2, F.fh / 2); g.restore(); return true; }   /* đạn nước xoay theo hướng bay (ảnh gốc bay sang phải) */
function mouthAt(ctx, C) { const k = owned(ctx, C.id), M = (k && k.evo) ? SP[C.id].mouth2 : SP[C.id].mouth;   /* 2026-10-16: dạng tiến hoá có mỏ / miệng riêng (mouth2), không có thì giữa thân như cũ */ if (!M) return { x: C.x, y: C.y - 6 }; const d0 = C.dir === 'west' ? 'east' : C.dir, o = M[d0] || M.south; return { x: C.x + (C.dir === 'west' ? -o[0] : o[0]), y: C.y + o[1] - (C.lift || 0) }; }
function leapGlide(ctx, C, A) {   /* Vượt Vũ Môn của cá: vọt lên khỏi CỘT NƯỚC tại chỗ → bay cung tới mục tiêu → (sau cú đập) về ô nước gần nhất; không có nước gần thì về chỗ cũ (cá chỉ ở nước) */
  const tg = A.tg; if (A.x0 == null) { A.x0 = C.x; A.y0 = C.y; A.tx = tg ? tg.x + (C.x < tg.x ? -10 : 10) : C.x; A.ty = tg ? tg.y + 2 : C.y; fxAt(ctx, A.sk.spout, C.x, C.y + 1); }
  if (A.t < 0.68) { const u = Math.min(1, A.t / 0.68), e = u * u * (3 - 2 * u); C.x = A.x0 + (A.tx - A.x0) * e; C.y = A.y0 + (A.ty - A.y0) * e; return; }
  if (A.lx == null) { const w = waterNear(ctx, A.tx, A.ty, 4); A.lx = w ? w.x : A.x0; A.ly = w ? w.y : A.y0; A.sx = C.x; A.sy = C.y; }
  const v = Math.min(1, (A.t - 0.68) / 0.2); C.x = A.sx + (A.lx - A.sx) * v; C.y = A.sy + (A.ly - A.sy) * v; C.lift = Math.sin(v * Math.PI) * 8; if (v >= 1 && !A.splash2) { A.splash2 = true; fxAt(ctx, 'cp:hit', C.x, C.y + 1); }
}
function startCannon(ctx, C, sk, tg) {   /* tia nước từ miệng theo hướng mục tiêu, dài tới vật cứng đầu tiên (≤ sk.len) */
  if (!(tg && tg.hp > 0)) tg = pickTarget(ctx, C) || { x: C.x + (C.dir === 'west' ? -48 : C.dir === 'east' ? 48 : 0), y: C.y + (C.dir === 'south' ? 48 : C.dir === 'north' ? -48 : 0) };   /* mục tiêu chết trong lúc tụ nước: nhắm con gần nhất, không có thì bắn thẳng hướng mặt */
  const M0 = C.id === 'coc' ? mouthOf(C) : mouthAt(ctx, C), dx = tg.x - M0.x, dy = (tg.y - 4) - M0.y, dd = Math.hypot(dx, dy) || 1, ux = dx / dd, uy = dy / dd, m = ctx.S.map; let L = 0;
  for (let q = 4; q <= sk.len; q += 4) { const x = M0.x + ux * q, y = M0.y + uy * q + 4; if (m && ctx.isSolid(m, Math.floor(x / TS), Math.floor(y / TS)) && !wetAt(ctx, x, y)) break; L = q; }
  ST.cannon = { C, x0: M0.x, y0: M0.y, ux, uy, L, t: 0, sk, hit: new Set(), r1: false, r2: false }; { const sh = uy >= 0 ? 7.5 : 0; ST.cannon.code = !!(ctx.wfx && ctx.wfx('cocjet', M0.x + ux * L / 2, M0.y + uy * L / 2, { x0: M0.x + ux * sh * 0.4, y0: M0.y + uy * sh * 0.4, ux, uy, L, w: sk.w, dur: sk.dur || 0.8, ky: C.y + (uy < 0 ? -0.5 : 0.5) })); if (!ST.cannon.code) fxAt(ctx, 'cn:jet', M0.x + ux * sh, M0.y + uy * sh, 0, Math.atan2(uy, ux), C.y, C, M0.y + 2); }   /* plan-69: tia nước code */   /* 2026-10-16 anh duyệt: bắn xuống / ngang (tia vẽ TRƯỚC Cóc) → dời GỐC TIA (chỉ hình vẽ) ra mép dưới miệng: đuôi ảnh (ax/2 = 5,5 px) + 2 px môi dưới — gốc tia không phủ thân Cóc; vùng trúng giữ nguyên (ST.cannon) */
  ST.stats.cannons = (ST.stats.cannons || 0) + 1; ctx.sfx('water'); if (ctx.quake) ctx.quake(0.12); log('cannon L ' + L + ' → ' + (tg.c && tg.c.key));
}
function cannonTick(ctx, dt) {
  const K = ST.cannon; if (!K) return; K.t += dt; const C = K.C, sk = K.sk, c0 = ST.c; ST.c = C; const ex = K.x0 + K.ux * K.L, ey = K.y0 + K.uy * K.L + 4;
  if (K.t < 0.5) for (const mo of mons(ctx)) { if (K.hit.has(mo)) continue; const vx = mo.x - K.x0, vy = (mo.y - 4) - K.y0, a = vx * K.ux + vy * K.uy, pd = Math.abs(vx * K.uy - vy * K.ux); if (a < -4 || a > K.L + 8 || pd > sk.w + (isBoss(mo) ? 10 : 3)) continue;
    K.hit.add(mo); deal(ctx, mo, sk.mul, isBoss(mo) ? 0 : sk.kb); if (K.hit.size === 1) hitStop(ctx, 90); }   /* trúng dọc tia: sát thương lớn + đẩy lùi (trùm không bị đẩy) */
  if (!K.r1 && K.t >= 0.1) { K.r1 = true; if (!(K.code && ctx.wfx && ctx.wfx('cocsplash', ex, ey, {}))) { fxAt(ctx, 'cp:crown', ex, ey); fxAt(ctx, 'cn:ring1', ex, ey); } stunRing(ctx, ex, ey, 29, sk, 0.4); if (ctx.quake) ctx.quake(0.25); }
  if (!K.r2 && K.t >= 0.3) { K.r2 = true; if (!lowFx(ctx) && !K.code) fxAt(ctx, 'cn:ring2', ex, ey); stunRing(ctx, ex, ey, 40, sk, 0.2); }   /* máy yếu: 1 vòng sóng */
  ST.c = c0 || C; if (K.t >= (sk.dur || 0.8)) ST.cannon = null;
}
function stunRing(ctx, x, y, r, sk, mul) { for (const mo of mons(ctx)) { if (Math.hypot(mo.x - x, (mo.y - y) * 1.25) > r + (isBoss(mo) ? 14 : 0)) continue; deal(ctx, mo, mul, 0); mo.stoneT = Math.max(mo.stoneT || 0, ctx.S.time + (isBoss(mo) ? 0.25 : sk.stun)); } }   /* vòng sóng bùn nước: khựng quái 0,8 s (trùm 0,25 s) */
const HDUST = { img: 'linhthu/fx/hop_dust.png', fw: 25, fh: 20, cols: 3, n: 8, ms: 83, ox: 13, oy: 12 };
const SPL = { img: 'linhthu/fx/splash3.png', fw: 68, fh: 47, cols: 4, n: 10, ms: 71, ox: 34, oy: 26 };   /* v2 (anh 2026-10-15): tông nước ao đo từ ô nước, cột thấp, gợn vừa 1 vũng 2×2 */
function waterTilesNear(ctx, x, y, R = 3) {   /* ô nước quanh chỗ dập → vùng cắt VFX (gợn chỉ nằm trên mặt nước) */
  const m = ctx.S.map, T = ctx.T || {}, out = []; if (!m || !ctx.getG) return out; const W = [T.WATER, T.DEEP, T.REEF].filter(v => v != null), tx0 = Math.floor(x / TS), ty0 = Math.floor(y / TS);
  for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) { const tx = tx0 + dx, ty = ty0 + dy; if (tx < 0 || ty < 0 || tx >= m.w || ty >= m.h || !W.includes(ctx.getG(m, tx, ty))) continue; out.push({ tx, ty, top: !W.includes(ctx.getG(m, tx, ty - 1)) }); }
  return out;
}
function slamSpot(ctx, C, tg, SJ, not) {   /* chỗ đáp: ô nước gần mục tiêu nhất (đủ gần để vòng dập trúng), khác vũng đang đứng khi nhảy nối (vũng tạm Gọi Mưa cũng là ô nước) */
  const m = ctx.S.map, T = ctx.T || {}; if (m && ctx.getG) { const W = [T.WATER, T.DEEP, T.REEF].filter(v => v != null), R = 3, tx0 = Math.floor(tg.x / TS), ty0 = Math.floor(tg.y / TS); let best = null, bd = 1e9;
    for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) { const tx = tx0 + dx, ty = ty0 + dy; if (tx < 0 || ty < 0 || tx >= m.w || ty >= m.h || !W.includes(ctx.getG(m, tx, ty))) continue;
      const x = tx * TS + 8, y = ty * TS + 11, dt0 = Math.hypot(x - tg.x, y - tg.y), dc = Math.hypot(x - C.x, y - C.y); if (dt0 > SJ.r + 10 || dc > 170) continue; if (not && Math.hypot(x - not.x, y - not.y) < 30) continue;
      const sc = dt0 + dc * 0.15; if (sc < bd) { bd = sc; best = { tx, ty, x, y }; } }
    if (best) return best; }
  /* 2026-10-15 Gọi Mưa v2: bỏ chỗ đáp 'cạnh mục tiêu khi đang mưa' — mưa tạo vũng tạm thật, dập chỉ vào ô nước để VFX nằm trên nước */
  return null;
}
function slamLand(ctx, C, J) {
  const sk = J.sk, c0 = ST.c; ST.c = C; (ST.splash ||= []).push({ x: C.x, y: C.y + 1, t: 0, wt: waterTilesNear(ctx, C.x, C.y + 1) }); ctx.sfx('splash_small'); let n = 0;   /* deal() tính theo ST.c = con vừa dập */
  for (const mo of mons(ctx)) { const big = isBoss(mo), dd = Math.hypot(mo.x - C.x, (mo.y - C.y) * 1.2); if (dd > sk.r + (big ? 14 : 0)) continue; deal(ctx, mo, sk.mul, big ? 0 : sk.kb); n++; } ST.c = c0 || C;
  ST.stats.slams = (ST.stats.slams || 0) + 1; ST.stats.slamHits = (ST.stats.slamHits || 0) + n; ST.stats.jumps = (ST.stats.jumps || 0) + 1; if (J.w && J.w.tx >= 0) (ST.pools ||= []).push(J.w.tx + ',' + J.w.ty);
  if (!C.chainN && ctx.pop) ctx.pop(C.x, C.y - headY(C) - 6, skName(ctx, sk) + '!', EL_COL[SP[C.id].el]);   /* tên chiêu 1 lần / chuỗi, lúc DẬP */
  C.chainN = (C.chainN || 0) + 1; C.cdJ = sk.cd; C.jumpCd = 1.4; C.holdT = 1.2; log('slam ' + C.chainN + ' @' + Math.round(C.x) + ',' + Math.round(C.y) + ' hit ' + n + (J.w && J.w.rain ? ' rain' : ''));
  if (C.chainN < sk.chain) { const tg = pickTarget(ctx, C), w2 = tg && slamSpot(ctx, C, tg, sk, { x: C.x, y: C.y }); if (w2) C.chainQ = { w: w2, t: 0.18 }; else C.chainN = 0; } else C.chainN = 0;
}
function splashTick(ctx, dt) {   /* mỗi con trong đội tự nhảy nối vũng của nó (C.chainQ / C.cdJ riêng) */
  const L0 = ST.splash || []; for (let i = L0.length - 1; i >= 0; i--) { L0[i].t += dt; if (L0[i].t * 1000 >= SPL.n * SPL.ms) L0.splice(i, 1); }
  const L1 = ST.hdust || []; for (let i = L1.length - 1; i >= 0; i--) { L1[i].t += dt; if (L1[i].t * 1000 >= HDUST.n * HDUST.ms) L1.splice(i, 1); }
  for (const C of ST.cs || []) if (C.chainQ && !C.jump && !C.cast && !C.kfly && !C.hidden) { C.chainQ.t -= dt; if (C.chainQ.t <= 0) { const w = C.chainQ.w; C.chainQ = null; startJump(ctx, C, w, SP[C.id].sj); } }
}
function drawHopDust(g, s, cx, cy) { const im = uiImg(HDUST.img); if (!im) return; const f = Math.min(HDUST.n - 1, Math.floor(s.t * 1000 / HDUST.ms)); g.drawImage(im, (f % HDUST.cols) * HDUST.fw, Math.floor(f / HDUST.cols) * HDUST.fh, HDUST.fw, HDUST.fh, (globalThis.__R89||Math.round)(s.x - cx - HDUST.ox / 2), (globalThis.__R89||Math.round)(s.y - cy - HDUST.oy / 2), HDUST.fw / 2, HDUST.fh / 2); }
function drawSplash(g, s, cx, cy) {
  const im = uiImg(SPL.img); if (!im) { if (ST.ctx && ST.ctx.vfx) ST.ctx.vfx('water_splash', s.x, s.y); s.t = 99; return; } const f = Math.min(SPL.n - 1, Math.floor(s.t * 1000 / SPL.ms)), sx = (f % SPL.cols) * SPL.fw, sy = Math.floor(f / SPL.cols) * SPL.fh;
  const clip = s.wt && s.wt.length; if (clip) { g.save(); g.beginPath(); for (const w of s.wt) { const rx = w.tx * TS - cx, ry = w.ty * TS - cy; g.rect(rx, ry - (w.top ? 14 : 0), TS, TS + (w.top ? 14 : 0)); } g.clip(); }   /* chỉ trên ô nước (+ khoảng trời trên mép trên cho cột nước / giọt bắn); giọt rơi ra cát thì tắt */
  g.drawImage(im, sx, sy, SPL.fw, SPL.fh, (globalThis.__R89||Math.round)(s.x - cx - SPL.ox / 2), (globalThis.__R89||Math.round)(s.y - cy - SPL.oy / 2), SPL.fw / 2, SPL.fh / 2);   /* ảnh 2×: vẽ kèm cỡ đích ½ */
  if (clip) g.restore();
}

/* ---------------- CHIÊU 3 GỌI MƯA v2 (2026-10-15) ----------------
   Mây mưa PIXEL PixelLab vfx_workbench 'Coc Goi Mua rain cloud' (260×200, 12 khung lặp, mưa thưa rơi xéo, gợn nhỏ khi chạm đất; bản 'low' nửa hạt cho máy yếu) vẽ trên cùng (draw),
   vào / ra mờ dần 0,5 / 0,6 s — KHÔNG phủ màn, KHÔNG phủ tối. Vũng tạm: ô WATER 2×2 (cứng với người như ao đào; linh thú lưỡng cư vào được) + ảnh PixelLab 'Coc rain puddle', khô sau 12 s. */
const RAIN = { img: 'linhthu/fx/rain_cloud.png', low: 'linhthu/fx/rain_cloud_low.png', fw: 260, fh: 200, cols: 4, n: 12, fps: 12, ox: 130, oy: 150 };
const PUD = { img: 'linhthu/fx/rain_puddle.png', fw: 64, fh: 44, cols: 3, n: 8, fps: 8, life: 12, max: 4 };
const RAIN_SYS = { id: 'linhthuRain', draw: (g, ctx, cx, cy) => drawRain(g, ctx, cx, cy) };   /* lớp vẽ mây mưa ở CUỐI S.sys (sau bóng mây trôi cloudshade) */
const rainOn = () => (ST.fields || []).some(f => f.kind === 'rain');
function inRain(ctx, x, y) { return (ST.fields || []).some(f => f.kind === 'rain' && f.t > 0.4 && Math.hypot(x - f.x, (y - f.y) * 1.3) < f.r + 6); }
function rainCtr(ctx, tx, ty, r) {   /* tâm mây: từ mục tiêu lùi về phía người chơi (tối đa nửa đường, mục tiêu vẫn trong vùng) */
  const p = ctx.S.player, dx = p.x - tx, dy = p.y - ty, d = Math.hypot(dx, dy) || 1, s = Math.min(d / 2, r - 16); return { x: tx + dx / d * s, y: ty + dy / d * s };
}
function rainPuddle(ctx, F) {   /* vũng tạm 2×2 trên đất trống trong vùng mưa: không đè lên người / quái / linh thú, ưu tiên cách MỤC TIÊU của Cóc ~30 px (Cóc nhảy dập trúng; không có thì quái gần nhất) */
  const m = ctx.S.map, T = ctx.T || {}; if (!m || !ctx.getG || !ctx.setG || T.WATER == null) return false; ST.puddles ||= []; if (ST.puddles.length >= PUD.max) return false;
  const W = [T.WATER, T.DEEP, T.REEF], MS = mons(ctx), tg0 = F.C && ST.cs.includes(F.C) ? (ST.c = F.C, pickTarget(ctx, F.C)) : null, busy = [ctx.S.player, ...ST.cs, ...MS, ...((ctx.S.npcs || []))]; let best = null, bs = 1e9;
  for (let k = 0; k < 40; k++) {
    const a = Math.random() * Math.PI * 2, rr = F.r * (0.2 + Math.random() * 0.6), tx = Math.floor((F.x + Math.cos(a) * rr) / TS), ty = Math.floor((F.y + Math.sin(a) * rr * 0.75) / TS); let ok = true; const cells = [];
    for (let dy = 0; dy < 2 && ok; dy++) for (let dx = 0; dx < 2 && ok; dx++) { const x = tx + dx, y = ty + dy; if (x < 1 || y < 1 || x >= m.w - 1 || y >= m.h - 1) { ok = false; break; } const g = ctx.getG(m, x, y);
      if (W.includes(g) || ctx.isSolid(m, x, y) || (ctx.hasObjectAt && ctx.hasObjectAt(m, x, y)) || ST.puddles.some(P => P.cells.some(c => Math.abs(c.x - x) <= 1 && Math.abs(c.y - y) <= 1))) ok = false; else cells.push({ x, y, g }); }
    if (!ok) continue; const cx = (tx + 1) * TS, cy = (ty + 1) * TS; if (busy.some(e => e && Math.hypot(e.x - cx, e.y - cy) < 24)) continue;
    const dm = tg0 && tg0.hp > 0 ? Math.hypot(tg0.x - cx, tg0.y - cy) : MS.reduce((b, q) => Math.min(b, Math.hypot(q.x - cx, q.y - cy)), 1e9), sc = Math.abs(dm - 30) + Math.random() * 4; if (sc < bs) { bs = sc; best = { tx, ty, cx, cy, cells }; }
  }
  if (!best) return false;
  for (const c of best.cells) ctx.setG(m, c.x, c.y, T.WATER, true);
  ST.puddles.push({ cells: best.cells, x: best.cx, y: best.cy, t: 0, life: PUD.life }); ST.stats.puddles = (ST.stats.puddles || 0) + 1; log('puddle @' + best.tx + ',' + best.ty); return true;   /* vũng tự mờ vào 0,4 s (ảnh PixelLab), không thêm bọt trắng trên đất khô */
}
function douseTick(ctx) {   /* lửa (Lốc Lửa Kỳ Lân: vùng 'fire' + ảnh arena_flame / spar_firepatch / ult_firering) trong vùng mưa → tắt */
  if (!rainOn() || !(ST.fields || []).length) return; const fz = ST.fields.filter(f => f.kind === 'fire' && inRain(ctx, f.x, f.y)); if (!fz.length) return;
  ST.fields = ST.fields.filter(f => !fz.includes(f)); ST.stats.doused = (ST.stats.doused || 0) + fz.length; log('douse fire ×' + fz.length);
  if (ctx.vfxKill) ctx.vfxKill((n, x, y) => /arena_flame|spar_firepatch|ult_firering/.test(n) && fz.some(f => Math.hypot(x - f.x, y - f.y) < (f.r || 30) + 30));
}
function puddleTick(ctx, dt) {
  const L0 = ST.puddles || []; for (let i = L0.length - 1; i >= 0; i--) { const P = L0[i]; P.t += dt; if (P.t >= P.life) { dryPuddle(ctx, P); L0.splice(i, 1); } }
}
function dryPuddle(ctx, P) { const m = ctx.S.map; if (m && ctx.setG) for (const c of P.cells) ctx.setG(m, c.x, c.y, c.g, false); log('puddle dry'); }
function drawRain(g, ctx, cx, cy) {
  for (const F of ST.fields || []) { if (F.kind !== 'rain' || F.code) continue; const im = uiImg(lowFx(ctx) ? RAIN.low : RAIN.img); if (!im) continue;
    const a = Math.max(0, Math.min(1, F.t / 0.5, (F.dur - F.t) / 0.6)); if (a <= 0) continue; const f = Math.floor(ctx.S.time * RAIN.fps) % RAIN.n;
    g.save(); g.globalAlpha = a; g.drawImage(im, (f % RAIN.cols) * RAIN.fw, Math.floor(f / RAIN.cols) * RAIN.fh, RAIN.fw, RAIN.fh, (globalThis.__R89||Math.round)(F.x - cx - RAIN.ox / 2), (globalThis.__R89||Math.round)(F.y - cy - RAIN.oy / 2), RAIN.fw / 2, RAIN.fh / 2); g.restore(); }   /* ảnh 2×: vẽ kèm cỡ đích ½ */
}
function drawPuddles(g, ctx, cx, cy) {
  const im = uiImg(PUD.img); if (!im) return;
  for (const P of ST.puddles || []) { const f = Math.floor(ctx.S.time * PUD.fps) % PUD.n, a = Math.min(1, P.t / 0.4, (P.life - P.t) / 1.0);
    g.save(); g.globalAlpha = Math.max(0, a); g.drawImage(im, (f % PUD.cols) * PUD.fw, Math.floor(f / PUD.cols) * PUD.fh, PUD.fw, PUD.fh, (globalThis.__R89||Math.round)(P.x - cx - PUD.fw / 4), (globalThis.__R89||Math.round)(P.y - cy - PUD.fh / 4), PUD.fw / 2, PUD.fh / 2); g.restore(); }
}

/* ---------------- bắt: cho ăn ---------------- */
function feedTick(ctx, dt) {
  const F = ST.feed; if (!F) return; const p = ctx.S.player, mo = F.mo;
  if (!mo || !mo.tired || dst(mo, p) > 44 || F.hurt || ctx.S.mode !== 'play') { ST.feed = null; ctx.toast(L(ctx).feedFail); log('feed fail'); return; }
  F.t += dt; if (F.t >= 2) { ST.feed = null; catchIt(ctx, mo); }
}
function catchIt(ctx, mo) {
  const id = mo.c.lt, k = sv(ctx); if (!ctx.bag.has(FOOD_ID(id), 1)) return; ctx.bag.remove(FOOD_ID(id), 1);
  k.owned[id] = { lv: CATCH_LV[id], xp: 0, evo: 0, lk: 0, at: Date.now() }; teamIds(ctx); if (k.team.length < slotsOf(k)) k.team.push(id); k.active = k.team[0] || null; ctx.bag.add(NGOC, 2); if (ctx.pop) ctx.pop(mo.x, mo.y - 30, '+2 ' + ngocName(ctx), '#8fe07a');   /* thu phục: +2 Ngọc Linh (nâng cấp Ấn Linh) */
  if (ctx.vfx) { ctx.vfx('wf_collect', mo.x, mo.y); ctx.vfx('level_up', mo.x, mo.y); } ctx.monsters.remove(mo); ST.wild = null; ST.stats.caught++;
  ctx.toast(L(ctx).caught(nameOf(ctx, id, 0)), true); ctx.sfx('win'); log('caught ' + id); ctx.persist();
  if (k.out && k.team.includes(id)) { spawnCompanion(ctx); const c = ST.cs.find(q => q.id === id); if (c) { c.x = mo.x; c.y = mo.y; } }
}

/* ---------------- thẻ ẤN LINH trong Túi đồ (2026-10-15 — thay mục Linh Thú trong thẻ Rocky): quả cầu + cấp + nâng cấp · đội hình · bộ sưu tập 11 loài · khung mô tả ---------------- */
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const PANEL_CSS = `
.ltp{display:flex;flex-direction:column;gap:8px}.ltp .ltp-top{display:flex;gap:12px;align-items:center;flex-wrap:wrap}
.ltp .ltp-orbc{display:flex;flex-direction:column;align-items:center;gap:4px;flex:0 0 auto}.ltp .ltp-call{min-width:96px;margin:0;padding:2px 10px;white-space:nowrap}.ltp .ltp-call.off{font-size:12px;color:#a39d94;text-align:center;max-width:120px;white-space:normal}
.ltp .ltp-orb{position:relative;width:72px;height:72px;flex:0 0 72px}.ltp .ltp-orb img{position:absolute;image-rendering:pixelated}.ltp .ltp-orb .sh{width:72px;height:72px;left:0;top:0}.ltp .ltp-orb .pe{width:40px;height:40px;left:16px;top:16px}
.ltp .ltp-lv{flex:1 1 220px;min-width:200px}.ltp .ltp-lv b{font-family:'VT323',var(--font);font-size:22px;color:var(--gold)}
.ltp .ltp-up{flex:1 1 260px;border:2px solid var(--line);padding:6px 8px;background:#1d182b}.ltp .ltp-up .req{display:flex;gap:10px;flex-wrap:wrap;margin:4px 0}.ltp .ltp-up .req span{display:inline-flex;align-items:center;gap:3px}.ltp .ltp-up .req .no{color:#ff8a8a}.ltp .ltp-up .req .ok{color:#8fe07a}
.ltp .ltp-up .req img{width:20px;height:20px;image-rendering:pixelated}
.ltp .ltp-team{display:flex;gap:8px;flex-wrap:wrap}.ltp .ltp-slot{width:84px;height:92px;border:2px solid var(--line);background:#241e34;display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:pointer;position:relative;font-size:11px;text-align:center;line-height:1.15}
.ltp .ltp-slot.sel{border-color:var(--gold);box-shadow:0 0 0 2px #6b4a2e inset}.ltp .ltp-slot.lock{opacity:.45;cursor:default}.ltp .ltp-slot img{width:48px;height:48px;image-rendering:pixelated}.ltp .ltp-slot .n{position:absolute;left:3px;top:2px;font-size:11px;color:var(--dim)}
.ltp .ltp-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(68px,1fr));gap:5px}.ltp .ltp-cell{height:84px;border:2px solid var(--line);background:#241e34;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;cursor:pointer;position:relative;font-size:10px;text-align:center;line-height:1.1;padding-bottom:2px}
.ltp .ltp-cell.off{opacity:.5;justify-content:center;font-size:22px}.ltp .ltp-cell.off span{font-size:10px}.ltp .ltp-cell.team{border-color:#8fe07a}.ltp .ltp-cell.sel{outline:3px solid var(--gold);outline-offset:-3px}.ltp .ltp-cell img{max-width:44px;max-height:44px;image-rendering:pixelated}
.ltp .ltp-cell .evo{position:absolute;right:3px;top:2px;color:var(--gold)}.ltp .ltp-cell .tm{position:absolute;left:3px;top:2px;color:#8fe07a}
.ltp .hpb{display:block;width:44px;height:4px;background:#5a2a2a;border:1px solid #3a1c0c;margin:2px auto 0}.ltp .hpb i{display:block;height:100%}
.ltp .ltp-info{border:2px solid var(--line);background:#15111f;padding:6px 8px;min-height:64px;font-size:13px;line-height:1.35}.ltp .ltp-info .row{display:flex;gap:10px;align-items:flex-start}.ltp .ltp-info img{width:56px;height:56px;image-rendering:pixelated;flex:0 0 56px}
.ltp .ltp-info .btns{display:flex;gap:6px;margin-top:4px;flex-wrap:wrap}
@media (max-width:520px){.ltp .ltp-slot{width:72px;height:86px}.ltp .ltp-grid{grid-template-columns:repeat(auto-fill,minmax(58px,1fr))}.ltp .ltp-cell{height:78px}}`;
Object.assign(STR.vi, { pTitle: 'ẤN LINH', pLv: (l, n) => `Cấp ${l} · mang được ${n} linh thú`, pTeam: (a, b) => `ĐỘI HÌNH (${a}/${b})`, pCol: (a, b) => `BỘ SƯU TẬP (${a}/${b})`, pUp: n => `Nâng lên cấp ${n}`, pMax: 'Ấn Linh đã cấp tối đa', pSpecies: n => `${n} loài đã bắt`, pStone: 'đá',
  pEmpty: 'Ô trống — chạm một linh thú bên dưới để mang theo', pLocked: n => `Mở ở Ấn Linh cấp ${n}`, pPickHint: 'Chạm ô đội hình để chọn, chạm linh thú để xem / mang theo. Gọi cả đội bằng nút “Gọi”.', pAdd: 'Mang theo', pRemove: 'Bỏ khỏi đội', pSwap: 'Đổi vào ô đang chọn', pNone: 'Chưa có linh thú. Mỗi vùng có 1 ổ: đánh cho đuối rồi cho ăn món nó thích để thu phục.',
  pHp: 'Máu', pRest: s => `đang nghỉ ${s} s`, pEl: 'Hệ', pS1: 'Linh năng', pS2: 'Siêu năng', pS3: 'Tuyệt chiêu', pEvo: 'Tiến hoá', pEvoAt: (n, l) => `→ ${n} ở cấp ${l}`, pEvoDone: n => `đã hoá ${n}`, pWater: 'cần nước', pAtk: 'Công', pLvL: 'Cấp', pJadeHint: 'Ngọc Linh: rơi ở ổ linh thú mỗi ngày, +2 khi thu phục' });
Object.assign(STR.en, { pTitle: 'SPIRIT SEAL', pLv: (l, n) => `Level ${l} · carries ${n} spirit beast${n > 1 ? 's' : ''}`, pTeam: (a, b) => `TEAM (${a}/${b})`, pCol: (a, b) => `COLLECTION (${a}/${b})`, pUp: n => `Upgrade to level ${n}`, pMax: 'The Spirit Seal is at max level', pSpecies: n => `${n} species caught`, pStone: 'stones',
  pEmpty: 'Empty — tap a spirit beast below to bring it', pLocked: n => `Unlocks at Seal level ${n}`, pPickHint: 'Tap a team slot to select it, tap a beast to view / bring it. Call the whole team with “Call”.', pAdd: 'Bring along', pRemove: 'Remove from team', pSwap: 'Put in selected slot', pNone: 'No spirit beasts yet. Every zone has a nest: weaken one, then feed it its favourite food.',
  pHp: 'HP', pRest: s => `resting ${s}s`, pEl: 'Element', pS1: 'Skill', pS2: 'Super', pS3: 'Ultimate', pEvo: 'Evolution', pEvoAt: (n, l) => `→ ${n} at Lv ${l}`, pEvoDone: n => `evolved into ${n}`, pWater: 'needs water', pAtk: 'Attack', pLvL: 'Lv', pJadeHint: 'Spirit Jade: drops at spirit beast nests daily, +2 when you befriend one' });
function hpBar(ctx, id) { const k = owned(ctx, id); if (!k) return ''; const q = Math.max(0, Math.min(1, hpOf(k) / ltMax(k))), col = restLeft(ctx, id) > 0 ? '#8a8279' : q > 0.5 ? '#7bd04a' : q > 0.25 ? '#ffd45e' : '#ff5a5a'; return `<span class="hpb"><i style="width:${Math.round(q * 100)}%;background:${col}"></i></span>`; }
function howTo(ctx, id) {   /* plan-44 R5: cách thu phục (dữ liệu thật: SP.zone / food, CATCH_LV, denSpot) */
  const s = SP[id], en = !vi(ctx), Z = ZNAME[en ? 'en' : 'vi'][s.zone], f = en ? s.foodEn : s.food, here = ctx.S.zone && ctx.S.zone.id === s.zone, p = ctx.S.player;
  let dir = '';
  if (here && ST.den && p) { const dx = ST.den.x - p.x, dy = ST.den.y - p.y, d = Math.round(Math.hypot(dx, dy) / 16), a = Math.atan2(dy, dx), i = (Math.round(a / (Math.PI / 4)) + 8) % 8;
    const N = en ? ['east', 'south-east', 'south', 'south-west', 'west', 'north-west', 'north', 'north-east'] : ['Đông', 'Đông Nam', 'Nam', 'Tây Nam', 'Tây', 'Tây Bắc', 'Bắc', 'Đông Bắc'];
    dir = d <= 2 ? (en ? ' The nest is right here.' : ' Ổ ở ngay đây.') : (en ? ` You are in ${Z}: the nest is ~${d} tiles to the ${N[i]}.` : ` Bạn đang ở ${Z}: ổ cách ~${d} ô về phía ${N[i]}.`); }
  return (en ? `Go to its nest in ${Z}, wear it out in a fight, then press E to feed it ${f} (some ${f} drops around the nest every day).` : `Tới ổ của nó ở ${Z}, đánh cho đuối rồi bấm E cho ăn ${f} (mỗi ngày có ${f} rơi quanh ổ).`) + dir;
}
function infoBox(ctx, id) {
  const t = L(ctx), k = sv(ctx), en = !vi(ctx), E = EL_NAME[en ? 'en' : 'vi'], Z = ZNAME[en ? 'en' : 'vi'];
  if (!id) return `<div class="ltp-info dim">${Object.keys(k.owned).length ? t.pPickHint : t.pNone}</div>`;
  const s = SP[id], o = k.owned[id];
  if (!o) return `<div class="ltp-info"><b>?</b> · ${esc(t.unknown(Z[s.zone], en ? s.foodEn : s.food))} · ${esc(en ? `wild Lv ${CATCH_LV[id]}` : `cấp hoang ${CATCH_LV[id]}`)}<br><span class="dim">${esc(howTo(ctx, id))}</span></div>`;   /* plan-44 R5: gợi ý cách thu phục + hướng tới ổ khi đang ở đúng vùng */
  const T = teamIds(ctx), inT = T.includes(id), full = T.length >= slotsOf(k), w = sk => sk && waterSkill(id, sk) ? ` <span class="dim">(💧 ${t.pWater})</span>` : '', r = restLeft(ctx, id);
  const sk3 = s.s3 ? `<br>${t.pS3}: <b>${esc(skName(ctx, s.s3))}</b>${w(s.s3)}${o.lv < EVO_LV ? ' <span class="dim">(' + esc(t.lockSuper(EVO_LV)) + ')</span>' : ''}` : '';
  const btn = inT ? `<button class="btn" data-ltdel="${id}">✕ ${t.pRemove}</button>` : full ? `<button class="btn primary" data-ltadd="${id}">⇄ ${t.pSwap}</button>` : `<button class="btn primary" data-ltadd="${id}">＋ ${t.pAdd}</button>`;
  return `<div class="ltp-info"><div class="row"><img src="assets/px/linhthu/${formOf(id, o.evo)}_icon.png" alt="" onerror="this.style.display='none'"><div>
    <b style="color:var(--gold)">${esc(nameOf(ctx, id, o.evo))}</b> · ${t.pEl}: <b style="color:${EL_COL[s.el]}">${esc(E[s.el])}</b> · ${t.pLvL} ${o.lv} · ${t.pAtk} ${atkOf(o.lv)}${o.evo ? ' ×1,25' : ''}<br>
    ${t.pHp}: ${Math.round(hpOf(o))}/${ltMax(o)}${r > 0 ? ' · <span style="color:#ff8a8a">' + esc(t.pRest(Math.ceil(r))) + '</span>' : ''} · ${t.lk}: ${Math.round(o.lk || 0)}/100<br>
    ${t.pS1}: <b>${esc(skName(ctx, s.s1))}</b>${w(s.s1)}<br>${t.pS2}: <b>${esc(skName(ctx, s.s2))}</b>${w(s.s2)}${o.lv < SUPER_LV ? ' <span class="dim">(' + esc(t.lockSuper(SUPER_LV)) + ')</span>' : ''}${sk3}<br>
    ${t.pEvo}: ${o.evo ? esc(t.pEvoDone(nameOf(ctx, id, 1))) : esc(t.pEvoAt(nameOf(ctx, id, 1), EVO_LV))}
    ${duelCard(ctx, id, o)}<div class="btns">${btn}</div></div></div></div>`;
}
function panel(ctx) {
  const t = L(ctx), k = sv(ctx), en = !vi(ctx), Z = ZNAME[en ? 'en' : 'vi'], lv = k.orbLv || 1, slots = slotsOf(k), T = teamIds(ctx), first = T[0], fk = first && owned(ctx, first), c = orbCost(ctx);
  if (ST.menuSlot >= slots) ST.menuSlot = 0;
  const shell = `assets/px/linhthu/fx/orb_full${lv > 1 ? '_l' + lv : ''}.png`;
  const req = (ok, txt, ico) => `<span class="${ok ? 'ok' : 'no'}">${ico ? `<img src="${ico}" alt="">` : ''}${esc(txt)}</span>`;
  const up = c.next ? `<div class="ltp-up"><b>${esc(t.pUp(c.next))}</b> — ${esc(t.pLv(c.next, SLOTS[c.next]))}<div class="req">${req(c.have.stone >= c.need.stone, `${c.have.stone}/${c.need.stone} ${t.pStone}`, 'assets/px/' + (((ART.man || {}).ui || {}).items || {}).stone)}${req(c.have.jade >= c.need.jade, `${c.have.jade}/${c.need.jade} ${ngocName(ctx)}`, 'assets/px/linhthu/fx/ngoc_linh.png')}${req(c.have.species >= c.need.species, `${t.pSpecies(c.have.species)} / ${c.need.species}`, '')}</div>
    <button class="btn ${c.ok ? 'primary' : ''}" data-ltup="1"${c.ok ? '' : ' style="opacity:.6"'}>⬆ ${esc(t.pUp(c.next))}</button><div class="dim" style="font-size:11px;margin-top:3px">${esc(t.pJadeHint)}</div></div>` : `<div class="ltp-up"><b>${esc(t.pMax)}</b><div class="dim" style="font-size:11px;margin-top:3px">${esc(t.pJadeHint)}</div></div>`;
  const slotsH = [0, 1, 2].map(i => { const id = T[i], sel = i === ST.menuSlot && i < slots ? ' sel' : '';
    if (i >= slots) return `<div class="ltp-slot lock"><span class="n">${i + 1}</span>🔒<span>${esc(t.pLocked(i + 1))}</span></div>`;
    if (!id) return `<div class="ltp-slot${sel}" data-ltsel="${i}"><span class="n">${i + 1}</span><span class="dim">${esc(t.pEmpty)}</span></div>`;
    const o = owned(ctx, id); return `<div class="ltp-slot${sel}" data-ltsel="${i}"><span class="n">${i + 1}</span><img src="assets/px/linhthu/${formOf(id, o.evo)}_icon.png" alt="" onerror="this.style.display='none'"><span>${esc(nameOf(ctx, id, o.evo))}<br>${t.pLvL} ${o.lv}</span>${hpBar(ctx, id)}</div>`; }).join('');
  const cells = IDS.map(id => { const o = k.owned[id], s = SP[id], sel = ST.menuSel === id ? ' sel' : '';
    if (!o) return `<div class="ltp-cell off${sel}" data-ltinfo="${id}" title="${esc(howTo(ctx, id))}">?<span>${Z[s.zone]} · ♥ ${esc(en ? s.foodEn : s.food)}</span></div>`;   /* plan-44 R5: ô '?' ghi vùng + món thích */
    const inT = T.includes(id); return `<div class="ltp-cell${inT ? ' team' : ''}${sel}" data-ltinfo="${id}">${inT ? `<span class="tm">${T.indexOf(id) + 1}</span>` : ''}${o.evo ? '<span class="evo">★</span>' : ''}<img src="assets/px/linhthu/${formOf(id, o.evo)}_icon.png" alt="" onerror="this.style.display='none'"><span>${esc(nameOf(ctx, id, o.evo))}<br>${t.pLvL} ${o.lv}</span>${hpBar(ctx, id)}</div>`; }).join('');
  const n = Object.keys(k.owned).length;
  const ost = orbState(ctx), coarse = matchMedia('(pointer: coarse)').matches, rs = ost === 'rest' ? Math.ceil(Math.min(...T.map(id => restLeft(ctx, id)))) : 0;   /* 2026-10-15 anh: nút Gọi ra / Thu về cạnh quả cầu (bấm xong tự đóng menu) */
  const call = ost === 'in' || ost === 'out' ? `<button class="btn primary ltp-call" data-ltorb="1">${ost === 'out' ? '⤺ ' + esc(t.pRecall) : '✦ ' + esc(t.pCall)}${coarse ? '' : ' (U)'}</button>` : `<span class="ltp-call off">${esc(ost === 'rest' ? t.pResting(rs) : t.pNoTeam)}</span>`;
  return `<div class="ltp"><div class="ltp-top"><div class="ltp-orbc"><div class="ltp-orb"><img class="sh" src="${shell}" alt="">${fk ? `<img class="pe" src="assets/px/linhthu/${formOf(first, fk.evo)}_icon.png" alt="" onerror="this.style.display='none'">` : ''}</div>${call}</div>
    <div class="ltp-lv"><b>${t.pTitle} · ${t.pLvL} ${lv}</b><br>${esc(t.pLv(lv, slots))}</div>${up}</div>
    <h3>${t.pTeam(T.length, slots)}</h3><div class="ltp-team">${slotsH}</div>
    <h3>${t.pCol(n, IDS.length)}</h3><div class="ltp-grid">${cells}</div>${infoBox(ctx, ST.menuSel || (T[ST.menuSlot] || null))}</div>`;
}
function setTeam(ctx, T) { const k = sv(ctx); k.team = T.filter((id, i) => id && k.owned[id] && T.indexOf(id) === i).slice(0, slotsOf(k)); k.active = k.team[0] || null; if (k.out) spawnCompanion(ctx); ctx.persist(); }
function menuAct(ctx, kind, v) {   /* menu.js gọi khi chạm trong thẻ Ấn Linh */
  const k = sv(ctx), T = teamIds(ctx).slice(), slots = slotsOf(k);
  if (kind === 'sel') { const i = +v; if (i < slots) { ST.menuSlot = i; ST.menuSel = T[i] || null; } return true; }
  if (kind === 'info') { ST.menuSel = v; return true; }
  if (kind === 'add') { if (!k.owned[v] || T.includes(v)) return false; if (T.length < slots && !T[ST.menuSlot]) T[ST.menuSlot] = v; else if (T.length < slots) T.push(v); else T[Math.min(ST.menuSlot, slots - 1)] = v; setTeam(ctx, T.filter(Boolean)); ST.menuSel = v; ctx.toast(L(ctx).follow(nameOf(ctx, v, k.owned[v].evo))); return true; }
  if (kind === 'del') { setTeam(ctx, T.filter(id => id !== v)); if (k.out) { const C = ST.cs.find(c => c.id === v); if (C) recallOrb(ctx, true, 'team', v); } return true; }
  if (kind === 'up') return upgradeOrb(ctx);
  if (kind === 'orb') { orbPress(ctx); return true; }   /* nút Gọi ra / Thu về (menu.js đóng menu trước rồi mới gọi) */
  return false;
}
function pick(ctx, id) {   /* tương thích (menu cũ / thử): chưa trong đội → thêm (đầy: thay ô đang chọn); trong đội → bỏ */
  const k = sv(ctx); if (!k.owned[id]) return false; const T = teamIds(ctx).slice();
  if (T.includes(id)) return menuAct(ctx, 'del', id); return menuAct(ctx, 'add', id);
}

/* p72:duel:begin */
/* ---------------- p72 (plan-51 S3): LINH THÚ ĐẤU NHƯ CHẤN THÚ ----------------
   · Thẻ "Ấn Linh · Chấn Thú" (infoBox): hệ (12 hệ chung), bậc cỡ Tí, độ hiếm, 5 chiêu (mở theo cấp), thắng / thua; loài chưa có ảnh đấu ghi 'Chưa đấu được'.
   · Thách đấu (linhduel startDuel → duelBegin): thu thú đang đi cùng vào Ấn Linh → đội trận = linh thú đội hình (dạng tiến hoá nếu đã hoá) + Chấn Thú bệ Làng
     (linh thú đang đi cùng hoặc chưa có Chấn Thú thì linh thú ra trước) → đấu lần lượt → về bản đồ (duelEnd): + kinh nghiệm, tiến hoá nếu đủ cấp, thắng / thua → thả thú ra lại.
   · Máu trận tính riêng (statsOf × HP_MUL của engine) — máu ngoài bản đồ (owned.hp) và thời gian nghỉ không đổi; con đang nghỉ vẫn đấu được (anh chốt §8); thua không mất gì. */
Object.assign(STR.vi, { dTitle: 'Chấn Thú', dEl: 'Hệ', dSize: 'Bậc', dRare: 'Độ hiếm', dWL: (w, l) => `Thắng ${w} · Thua ${l}`, dMoves: 'Chiêu trận', dLock: l => `mở ở Lv${l}`, dUlt: 'tuyệt chiêu', dNo: 'Chưa đấu được (đang làm ảnh trận)',
  dLead: 'Đang đi cùng bạn → ra trận trước Chấn Thú', dXp: (n, x) => `${n} +${x} KN trận`, dWin: 'thắng', dLose: 'thua' });
Object.assign(STR.en, { dTitle: 'Beast Battle', dEl: 'Type', dSize: 'Size', dRare: 'Rarity', dWL: (w, l) => `Won ${w} · Lost ${l}`, dMoves: 'Battle moves', dLock: l => `unlocks Lv${l}`, dUlt: 'ultimate', dNo: 'Cannot battle yet (battle art in progress)',
  dLead: 'Following you → fights before your beasts', dXp: (n, x) => `${n} +${x} battle XP`, dWin: 'won', dLose: 'lost' });
const DUEL_LV = [0, 0, 10, 15, 20];   /* chiêu thứ i mở ở cấp */
function duelTeam(ctx) {   /* đội Ấn Linh dạng đấu: [{ sp: dạng (coc / coc2…), lv, name, lt: id }] — cả con đang nghỉ */
  const k = sv(ctx); return teamIds(ctx).map(id => { const o = k.owned[id]; return o ? { sp: formOf(id, o.evo), lv: Math.max(1, o.lv | 0), name: nameOf(ctx, id, o.evo), lt: id } : null; }).filter(Boolean);
}
function duelBegin(ctx) { const k = sv(ctx); if (k.out || ST.cs.length) { ST.duelOut = true; recallOrb(ctx, true, 'duel'); } ST.reOut = false; log('duel begin out=' + !!ST.duelOut); }
function duelEnd(ctx, res) {   /* res: [{ lt, win, fought, ko }] → cộng KN (thắng 35 % / thua 12 % mốc cấp), thắng / thua, tiến hoá; xong thả ra lại */
  const out = [], t = L(ctx);
  for (const r of res || []) { const o = owned(ctx, r.lt); if (!o || !r.fought) continue; o.duel ||= { w: 0, l: 0 }; if (r.win) o.duel.w++; else o.duel.l++;
    const lv0 = o.lv, xp = Math.max(8, Math.round(needXp(o.lv) * (r.win ? 0.35 : 0.12))); o.xp = (o.xp || 0) + xp;
    while (o.lv < LV_MAX && o.xp >= needXp(o.lv)) { o.xp -= needXp(o.lv); o.lv++; if (o.hp != null) o.hp += 12; ST.stats.lv++; }
    const evo = o.lv >= EVO_LV && !o.evo; if (evo) evolve(ctx, r.lt);
    out.push({ id: r.lt, xp, lv0, lv: o.lv, evo, win: !!r.win });
    try { ctx.toast(t.dXp(nameOf(ctx, r.lt, o.evo), xp) + (o.lv > lv0 ? ' · ' + t.lvup(nameOf(ctx, r.lt, o.evo), o.lv) : ''), true); } catch (e) { } }
  ST.reOut = !!ST.duelOut; ST.duelOut = false; ST.duelRes = out; log('duel end ' + JSON.stringify(out)); ctx.persist(); return out;
}
function reOutTick(ctx) { if (!ST.reOut || (ctx.duel && ctx.duel.active && ctx.duel.active()) || (ctx.S.zone && ctx.S.zone.id === 'duel_field')) return; ST.reOut = false; if (orbState(ctx) === 'in') { throwOrb(ctx); log('duel re-out'); } }
function duelCard(ctx, id, o) {   /* thẻ Ấn Linh · Chấn Thú */
  const t = L(ctx), en = !vi(ctx), form = formOf(id, o.evo), s = SPECIES[form]; if (!s) return '';
  const he = s.types[0], R = RARITY_NAME[s.rarity] || {}, Z = SIZE_NAME[s.size] || {}, n = LT_UNLOCK(o.lv | 0), d = o.duel || { w: 0, l: 0 }, ready = LT_READY.has(form);
  const mv = s.moves.map((m, i) => { const M0 = MOVES[m], on = i < n, nm = en && MOVE_NAME_EN[m] ? MOVE_NAME_EN[m] : M0 ? M0.name : m; return `<span style="opacity:${on ? 1 : 0.5}">${i === 4 ? '★' : i + 1} ${esc(nm)}${M0 && M0.ult ? ' (' + esc(t.dUlt) + ')' : ''}${on ? '' : ' · ' + esc(t.dLock(DUEL_LV[i]))}</span>`; }).join('<br>');
  const lead = (sv(ctx).out || ST.cs.length) && teamIds(ctx).includes(id) ? `<br><span class="dim">${esc(t.dLead)}</span>` : '';
  return `<div class="ltp-duel" style="margin-top:6px;padding:5px 7px;border:1px solid rgba(255,214,120,.35);border-radius:6px;background:rgba(0,0,0,.18)"><b style="color:var(--gold)">⚔ ${esc(t.pTitle)} · ${esc(t.dTitle)}</b>
    · ${esc(t.dEl)} <b style="color:${EL_COL[he] || '#fff'}">${esc((en ? TYPE_EN : TYPE_NAME)[he] || he)}</b> · ${esc(t.dSize)} ${esc(Z[en ? 'en' : 'vi'] || s.size)} · ${esc(t.dRare)} ${esc(R[en ? 'en' : 'vi'] || s.rarity)} · ${esc(t.dWL(d.w | 0, d.l | 0))}${lead}
    <div style="margin-top:3px"><span class="dim">${esc(t.dMoves)}:</span><br>${mv}</div>${ready ? '' : `<div style="color:#ffb37a;margin-top:3px">${esc(t.dNo)}</div>`}</div>`;
}
/* p72:duel:end */
/* ---------------- lệnh chat: tên chiêu (có / không dấu) ---------------- */
const fold = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
function chatHook(s) {
  const ctx = ST.ctx; if (!ctx || !ST.cs.length) return false; const f = ' ' + fold(s) + ' ';
  for (const C of ST.cs) { const sp = SP[C.id];
    for (const slot of [1, 2, 3]) { const sk = slot === 3 ? sp.s3 : slot === 2 ? sp.s2 : sp.s1; if (!sk) continue; if (!f.includes(' ' + fold(sk.vi) + ' ') && !f.includes(' ' + fold(sk.en) + ' ')) continue;
      ST.c = C; if (waterSkill(C.id, sk) && !envOk(ctx, C.id, C.x, C.y)) { ctx.toast(L(ctx).needWater); return true; }
      const k = owned(ctx, C.id), tg = pickTarget(ctx, C); if (!tg || C.cast || (slot === 2 && k.lv < SUPER_LV) || (slot === 3 && (k.lv < EVO_LV || (sk.evo && !k.evo)))) { ctx.toast(L(ctx).cmdNo(nameOf(ctx, C.id, k.evo))); return true; }
      if (slot === 2 && sk.kind === 'rain' && rainOn()) { ctx.toast(L(ctx).rainOn); return true; }
      if (slot >= 2) k.lk = LK_MAX; cast(ctx, C, slot, tg); return true; } }
  return false;
}

/* ---------------- hệ ---------------- */
export const linhthu = {
  id: 'linhthu', always: true,   /* chạy cả ở vùng có danh sách hệ riêng (khe nứt trùm, sân trùm) — như rockycore / ki */
  onZoneEnter(ctx) {
    if (ctx.S && Array.isArray(ctx.S.sys) && !ctx.S.sys.includes(RAIN_SYS)) ctx.S.sys = [...ctx.S.sys, RAIN_SYS];   /* mảng mới, không sửa SYSTEMS */
    ST.ctx = ctx; ST.proj = []; ST.fields = []; ST.puddles = []; ST.cannon = null; ST.timers = []; ST.rocks = []; ST.feed = null; ST.wild = null; ST.den = null; ST.shrine = null; ST.decoys = null; ST.dark = null; loadMeta();
    wrapDamage(ctx); wrapHero(ctx); (ctx.chatHooks ||= []); if (!ctx.chatHooks.includes(chatHook)) ctx.chatHooks.push(chatHook);
    ctx.linhthu = { duelTeam: () => duelTeam(ctx), duelBegin: () => duelBegin(ctx), duelEnd: r => duelEnd(ctx, r), isOut: () => !!sv(ctx).out || ST.cs.length > 0, html: () => '', panel: () => panel(ctx), act: (kind, v) => menuAct(ctx, kind, v), pick: id => pick(ctx, id), active: () => activeId(ctx), team: () => teamIds(ctx).slice(), orbLv: () => sv(ctx).orbLv, press: () => orbPress(ctx), slot: () => slotInfo(ctx) };   /* press / slot: ô Ấn Linh trên thanh công cụ máy tính */   /* 2026-10-15: mục Linh Thú dời sang thẻ Ấn Linh */
    ctx.ltHurt = (x, y, r, dmg, kind) => { let tot = 0; for (const C of ST.cs.slice()) { if (C.hidden || Math.hypot(C.x - x, C.y - y) > r) continue; const k = owned(ctx, C.id); if (k) tot += ltHurt(ctx, dmg <= 1 ? ltMax(k) * dmg : dmg, { x, y }, kind, C); } return tot; };   /* đòn diện rộng của trùm: trúng mọi con trong vùng */   /* 2026-10-15: trùm gọi cho đòn diện rộng (dmg ≤ 1 = phần máu tối đa) */
    ctx.rainAt = (x, y) => inRain(ctx, x, y);   /* 2026-10-15 Gọi Mưa: hệ khác (lửa terrain …) hỏi chỗ này có mưa không */
    ctx.ltPets = () => ST.cs.filter(C => !C.hidden && !C.kfly && !ST.orbs.some(o => o.id === C.id)).map(C => ({ x: C.x, y: C.y, id: C.id }));   /* 2026-10-15: trùm thử đòn trúng chỗ từng linh thú (như rkPos) */
    ctx.ltHit = (dmg, from, kind, id) => { const C = ST.cs.find(c => c.id === id); const k = C && owned(ctx, C.id); if (!k) return 0; const d = ltHurt(ctx, dmg <= 1 ? ltMax(k) * dmg : dmg, from || ctx.S.player, kind, C); if (d) { ST.stats.ltBoss = (ST.stats.ltBoss || 0) + 1; log('boss hit ' + C.id + ' ' + (kind || '')); } return d; };   /* dmg ≤ 1 = phần máu tối đa; kind 'fly' = hất bay */
    const z = ctx.S.zone && ctx.S.zone.id, id = ZONE_SP[z];
    if (id && ENABLED.has(id)) { ST.den = denSpot(ctx); ST.needWild = !!ST.den; }   /* sinh linh thú hoang + món thích ở khung update đầu tiên: monsters / drops dựng lại danh sách trong onZoneEnter SAU hệ này */
    if (z === 'village' && ST.den) { const m = ctx.S.map, cx0 = (m.w >> 1), r = ctx.freeTiles(m, ctx.rngFrom(91731), { x: cx0 - 10, y: 20, w: 20, h: 18 }, 1, Object.values(m.entries || {}).filter(Boolean), 6, 2)[0]; if (r) ST.shrine = { x: r.x * TS + 8, y: r.y * TS + 14 }; }
    { const k0 = sv(ctx), uz = q => /^u[1-4]$/.test(q || ''), keepF = k0.out && (uz(z) || uz(ST.zoneId)) ? [...ST.outSet].filter(q => swimmer(q) && !(restLeft(ctx, q) > 0)) : [];   /* lặn / nổi: cá + cóc (anh 2026-10-15 'cóc lặn theo luôn') theo */
    if (k0.out) { k0.out = false; log('orb auto zone'); } ST.orbs = []; ST.pending = new Set(); ST.outSet = new Set(); ST.bursts = []; ST.recallQ = false; ST.cs = []; ST.c = null; ST.zoneId = z;
    if (keepF.length) { k0.out = true; ST.outSet = new Set(keepF); spawnCompanion(ctx); log('swimmers follow dive ' + keepF.join(',') + ' → ' + z); } }   /* đổi vùng: linh thú TỰ về Ấn Linh */
    spawnCompanion(ctx);
    if (typeof window !== 'undefined') window.__lt = {
      state: () => ({ owned: JSON.parse(JSON.stringify(sv(ctx).owned)), active: activeId(ctx), c: ST.c ? { id: ST.c.id, x: Math.round(ST.c.x), y: Math.round(ST.c.y), cast: ST.c.cast ? ST.c.cast.sk.kind + ST.c.cast.slot : null, hidden: hiddenNow(ctx) } : null,
        wild: ST.wild ? { id: ST.wild.c.lt, hp: Math.round(ST.wild.hp), max: ST.wild.max, tired: !!ST.wild.tired, x: Math.round(ST.wild.x), y: Math.round(ST.wild.y) } : null, den: ST.den, shrine: ST.shrine, feed: ST.feed ? +ST.feed.t.toFixed(2) : null, stats: JSON.parse(JSON.stringify(ST.stats)), meta: !!META }),
      give: (id, lv = 20, evo = 0) => { const k = sv(ctx); k.owned[id] = { lv, xp: 0, evo, lk: 0 }; teamIds(ctx); if (!k.team.includes(id)) { if (k.team.length < slotsOf(k)) k.team.push(id); else k.team[0] = id; } k.out = true; ST.outSet = new Set(teamIds(ctx)); spawnCompanion(ctx); return true; },   /* thử: cho ra ngay (bỏ qua ném) */
      active: id => { const k = sv(ctx); if (!k.owned[id]) return null; teamIds(ctx); k.team = [id, ...k.team.filter(q => q !== id)].slice(0, slotsOf(k)); k.out = true; ST.outSet = new Set(teamIds(ctx)); spawnCompanion(ctx); return activeId(ctx); },   /* đưa lên ĐẦU đội */
      orbLv: n => { const k = sv(ctx); if (n) { k.orbLv = Math.max(1, Math.min(ORB_MAX, n)); teamIds(ctx); } return k.orbLv; }, team: ids => { const k = sv(ctx); if (ids) { k.team = ids.filter(q => k.owned[q]); teamIds(ctx); if (k.out) ST.outSet = new Set(teamIds(ctx)); spawnCompanion(ctx); } return teamIds(ctx).slice(); }, outIds: () => ST.cs.map(c => c.id), orbs: () => ST.orbs.map(o => ({ ph: o.ph, id: o.id, t: +o.t.toFixed(2) })), upgrade: () => upgradeOrb(ctx), upCost: () => orbCost(ctx), menuAct: (kind, v) => menuAct(ctx, kind, v), each: () => ST.cs.map(c => { const k = owned(ctx, c.id); return { id: c.id, x: Math.round(c.x), y: Math.round(c.y), hp: Math.round(hpOf(k)), max: ltMax(k), cast: c.cast ? c.cast.sk.kind + c.cast.slot : null }; }),   /* 2026-10-15 Ấn Linh nâng cấp (thử) */ lk: (n = LK_MAX) => { const C = ST.c, k = C && owned(ctx, C.id); if (k) k.lk = n; return !!k; },
      decoys: () => ST.decoys && ST.decoys.list ? { n: ST.decoys.list.length, pos: ST.decoys.list.map(q => [Math.round(q.x), Math.round(q.y)]), left: +(ST.decoys.until - ctx.S.time).toFixed(2) } : null,   /* test Phân Thân */
      holdCd: sec => { for (const C of ST.cs) { C.cd1 = Math.max(C.cd1 || 0, sec); C.cd2 = Math.max(C.cd2 || 0, sec); C.cdJ = Math.max(C.cdJ || 0, sec); C.jumpCd = Math.max(C.jumpCd || 0, sec); } return ST.cs.length; },   /* test: giữ linh thú không tự ra chiêu (chụp dáng đứng) */
      cast: slot => { const C = ST.c; if (!C) return 'no'; const tg = pickTarget(ctx, C); if (!tg) return 'notg'; if (slot === 2) owned(ctx, C.id).lk = LK_MAX; return cast(ctx, C, slot, tg); },
      wild: () => ST.wild, den: () => ST.den, feedNow: () => { if (ST.wild && ST.wild.tired) { ST.feed = { mo: ST.wild, t: 0 }; return true; } return false; }, tire: () => { if (ST.wild) { ST.wild.hp = Math.round(ST.wild.max * 0.25); tire(ctx, ST.wild); } return !!ST.wild; },
      evolve: () => { const C = ST.c; if (C) evolve(ctx, C.id); return !!C; }, xp: n => { const C = ST.c, k = C && owned(ctx, C.id); if (k) gainXp(ctx, k, n); return k && k.lv; }, log: () => ST.log.slice(),
      none: () => { const k = sv(ctx); k.active = null; k.team = []; ST.cs = []; ST.c = null; return true; },
      pools: () => ({ jumps: ST.stats.jumps || 0, landed: (ST.pools || []).slice(), castAt: (ST.castAt || []).slice() }),
      env: () => { const C = ST.c; return C ? { ok: envOk(ctx, C.id, C.x, C.y), hidden: !!C.hidden, water: waterNear(ctx, C.x, C.y, 4), pw: waterNear(ctx, ctx.S.player.x, ctx.S.player.y, 4) } : null; },
      tongue: () => { const T = ST.tongue, C = ST.c; return T && C ? { t: +T.t.toFixed(3), hit: T.hit, dir: C.dir, up: !!T.up, cx: Math.round(C.x), cy: Math.round(C.y), mx: T.mo ? Math.round(T.mo.x) : null, my: T.mo ? Math.round(T.mo.y) : null } : null; },   /* 2026-10-15 test Lưỡi Dính */
      orb: () => ({ st: orbState(ctx), out: !!sv(ctx).out, anim: ST.orbs.length ? ST.orbs[0].ph : null, rest: Math.max(0, Math.round(Math.max(0, ...teamIds(ctx).map(id => restLeft(ctx, id))))), team: teamIds(ctx).slice(), outN: ST.cs.length, lv: sv(ctx).orbLv, btn: (() => { const b = ST.orbEl; if (!b || b.style.display === 'none') return null; const q = b.getBoundingClientRect(); return { x: Math.round(q.x), y: Math.round(q.y), w: Math.round(q.width), h: Math.round(q.height), cls: b.className }; })() }), orbPress: () => orbPress(ctx), orbIn: () => { const k = sv(ctx); k.out = false; ST.cs = []; ST.c = null; ST.orbs = []; ST.pending = new Set(); ST.outSet = new Set(); return true; }, ko: () => { if (ST.c) koToOrb(ctx, ST.c); else { const id = activeId(ctx); if (id) owned(ctx, id).rest = nowS() + ORB.restS; } return true; }, unrest: () => { for (const id of Object.keys(sv(ctx).owned)) sv(ctx).owned[id].rest = 0; return true; },   /* 2026-10-15 Ấn Linh */
      hp: () => { const id = activeId(ctx), k = id && owned(ctx, id); return k ? { hp: Math.round(hpOf(k)), max: ltMax(k), fly: !!(ST.c && ST.c.kfly), lift: ST.c ? Math.round(ST.c.lift || 0) : 0, boss: ST.stats.ltBoss || 0, flies: ST.stats.ltFly || 0, hits: ST.stats.ltHits || 0, dmg: ST.stats.ltDmg || 0 } : null; }, setHp: n => { const id = activeId(ctx), k = id && owned(ctx, id); if (k) k.hp = n; return !!k; }, hurt: (raw, kind) => ltHurt(ctx, raw, ctx.S.player, kind), restLeft: () => { const id = activeId(ctx); return id ? restLeft(ctx, id) : 0; }, restIn: s => { const id = activeId(ctx); if (id) owned(ctx, id).rest = nowS() + s; return !!id; }, slamNow: () => { const C = ST.c, tg = C && pickTarget(ctx, C), SJ = C && SP[C.id].sj; if (!tg || !SJ) return null; const w = slamSpot(ctx, C, tg, SJ); if (!w) return 'nowater'; C.cdJ = 0; C.chainN = 0; startJump(ctx, C, w, SJ); return w; }, splashN: () => (ST.splash || []).length, rainAt: (x, y) => { const s2 = SP.coc.s2; ST.fields = (ST.fields || []).filter(f => f.kind !== 'rain'); ST.fields.push({ C: ST.c, kind: 'rain', x, y, r: s2.r, t: 0, dur: s2.dur, tick: 0, sk: s2, nP: 0 }); return true; }, hops: () => ({ hops: ST.stats.hops || 0, land: ST.stats.hopLand || 0, hw: !!(ST.c && ST.c.hw), lift: ST.c ? +(ST.c.lift || 0).toFixed(1) : 0 }), cs: () => ST.cs.map(C => ({ id: C.id, x: Math.round(C.x), y: Math.round(C.y), hidden: !!C.hidden, wet: wetAt(ctx, C.x, C.y), hw: !!C.hw })), cannon: () => (ST.cannon ? { L: ST.cannon.L, t: +ST.cannon.t.toFixed(2), hit: ST.cannon.hit.size, x0: Math.round(ST.cannon.x0), y0: Math.round(ST.cannon.y0), ux: +ST.cannon.ux.toFixed(2), uy: +ST.cannon.uy.toFixed(2) } : null), rain: () => ({ on: rainOn(), fields: (ST.fields || []).filter(f => f.kind === 'rain').map(f => ({ x: Math.round(f.x), y: Math.round(f.y), t: +f.t.toFixed(1) })), puddles: (ST.puddles || []).map(P => ({ x: P.x, y: P.y, t: +P.t.toFixed(1) })), rains: ST.stats.rains || 0, nP: ST.stats.puddles || 0, rh: { p: ST.stats.rhP || 0, r: ST.stats.rhR || 0, l: ST.stats.rhL || 0 }, doused: ST.stats.doused || 0, fires: (ST.fields || []).filter(f => f.kind === 'fire').length }), inRain: (x, y) => inRain(ctx, x, y), thrOff: v => { ST.thrOff = !!v; return ST.thrOff; }, put: (x, y) => { if (ST.c) { ST.c.x = x; ST.c.y = y; ST.c.holdT = 1.5; } return !!ST.c; }, warns: () => (ST.warns || []).map(w => ({ x: Math.round(w.x), y: Math.round(w.y) })),   /* 2026-10-15 máu linh thú (thử) */
      ids: () => IDS.slice(), sp: id => SP[id] && { zone: SP[id].zone, el: SP[id].el, s1: SP[id].s1.kind, s2: SP[id].s2.kind },
    };
  },
  onZoneLeave(ctx) { if (ST.wild && ctx.monsters && ctx.monsters.remove) ctx.monsters.remove(ST.wild); ST.wild = null; ST.proj = []; ST.fields = []; ST.puddles = []; ST.cannon = null; ST.timers = []; ST.rocks = []; ST.feed = null; },   /* trước monsters (index.js): linh thú hoang không lọt vào bảng quái lưu khi bay */
  update(dt, ctx) {
    ST.ctx = ctx; stopTick(ctx); if (ctx.S.mode !== 'play') return; reOutTick(ctx);   /* p72: hết trận → thả linh thú ra lại */ wrapDamage(ctx); wrapHero(ctx); pollPlayerHit(ctx);   /* bọc lại mỗi khung (WeakSet → rẻ): monsters dựng ctx.monsters mới trong onZoneEnter SAU hệ này */
    rocksTick(ctx, dt);
    for (let i = ST.timers.length - 1; i >= 0; i--) { const T = ST.timers[i]; T.t -= dt; if (T.t <= 0) { ST.timers.splice(i, 1); if (T.C) ST.c = T.C; try { T.fn(); } catch (e) { console.error('lt timer', e); } } }
    projTick(ctx, dt); fieldTick(ctx, dt); feedTick(ctx, dt); if (ST.tongue) tongueTick(ctx, dt); if (ST.splat) { ST.splat.t -= dt; if (ST.splat.t <= 0) ST.splat = null; } if (ST.dark) { ST.dark.t += dt; if (ST.dark.t >= ST.dark.dur) ST.dark = null; }
    if (ST.decoys && ctx.S.time > ST.decoys.until) ST.decoys = null;
    if (ST.needWild && ctx.monsters && ctx.monsters.add) { ST.needWild = false; const z = ctx.S.zone.id, id = ZONE_SP[z], k = sv(ctx), day = ctx.clock ? ctx.clock.dayIndex : 0; if (id && !owned(ctx, id)) spawnWild(ctx); if (id && k.food[z] !== day) { k.food[z] = day; ctx.give(FOOD_ID(id), 2, ST.den.x - 10, ST.den.y + 4); ctx.give(NGOC, 1, ST.den.x + 10, ST.den.y + 4); log('food ' + z);   /* + 1 Ngọc Linh / ngày / ổ (nâng cấp Ấn Linh) */ } }
    orbTick(ctx, dt); hpTick(ctx, dt); splashTick(ctx, dt); puddleTick(ctx, dt); cannonTick(ctx, dt); douseTick(ctx); orbUi(ctx); if (ST.recallQ && !ST.cs.some(c => c.cast && c.cast.slot >= 2)) recallOrb(ctx, false);
    if (!sv(ctx).out) { if (ST.cs.length) { ST.cs = []; ST.c = null; } return; }
    { const want = teamIds(ctx).filter(id => ST.outSet.has(id) && !(restLeft(ctx, id) > 0) && !ST.pending.has(id)).join(); if (want !== ST.cs.map(c => c.id).join()) spawnCompanion(ctx); }   /* đội đổi / con gục / con vừa đáp từ quả cầu */
    if (!ST.cs.length && !ST.pending.size && !ST.orbs.length) { sv(ctx).out = false; return; }
    for (const C of ST.cs.slice()) { if (!ST.cs.includes(C)) continue; ST.c = C;
      C.t += dt; if (C.evoT > 0) C.evoT -= dt; if (C.hurtT > 0) C.hurtT -= dt; const pz = ctx.S.player, fish = fishOnly(C.id); C.water = fish ? (ctx.S.map && ctx.S.map.under ? { x: pz.x - 14 + (C.slot || 0) * 9, y: pz.y + 6 } : waterNear(ctx, pz.x, pz.y, 5)) : null;   /* khu dưới nước: cá bơi tự do cạnh người chơi */
      C.hidden = fish ? !C.water || (hiddenFor(ctx, C) && !(ctx.S.sea && ctx.S.sea.riding)) : hiddenFor(ctx, C);   /* cá: chỉ hiện khi có nước gần người chơi; theo bè thì bơi cạnh bè */
      if (fish && !C.hidden && C.wasHidden) { C.x = C.water.x; C.y = C.water.y; if (ctx.vfx) ctx.vfx('bk_kick_water', C.x, C.y); } C.wasHidden = C.hidden;
      if (!fish && mustRecallFor(ctx, C)) { recallOrb(ctx, true, 'travel', C.id); continue; }   /* cất cánh / đi bè / lặn: linh thú không theo được → TỰ về Ấn Linh (cảnh riêng của trùm chỉ ẩn tạm như cũ) */
      if (C.hidden) { const p = ctx.S.player; C.x = p.x; C.y = p.y; C.cast = null; continue; }
      if (C.popT > 0) { C.popT -= dt; C.lift = C.popT > 0 ? Math.sin((1 - C.popT / 0.3) * Math.PI) * 8 : 0; } else if (C.hop) { C.hop.t += dt; C.lift = Math.sin(Math.min(1, C.hop.t / C.hop.T) * Math.PI) * 4; if (C.hop.t >= C.hop.T) { C.hop = null; C.lift = 0; } }
      if (C.kfly) { kflyTick(ctx, C, dt); continue; }   /* đang bị hất bay: không AI */
      if (C.jump) jumpTick(ctx, C, dt); else if (C.hw) hwTick(ctx, C, dt); else if (!C.cast && !(amphib(C.id) && C.holdT > 0)) hunt(ctx, C, dt); if (C.holdT > 0) C.holdT -= dt; castTick(ctx, C, dt); think(ctx, C, dt);
    }
    ST.c = ST.cs[0] || null;
    if ((ST.saveT = (ST.saveT || 0) + dt) > 20) { ST.saveT = 0; ctx.persist(); }
  },
  near(ctx) {
    const p = ctx.S.player, t = L(ctx), mo = ST.wild;
    if (mo && mo.tired && dst(mo, p) < 40 && !ST.feed) { const id = mo.c.lt, f = vi(ctx) ? SP[id].food : SP[id].foodEn, has = ctx.bag.has(FOOD_ID(id), 1); return { label: has ? t.feed(f, nameOf(ctx, id, 0)) : t.feedNeed(f, nameOf(ctx, id, 0)), x: p.x, y: p.y, limit: 40, priority: 5, data: { kind: 'feed', has } }; }   /* toạ độ = người chơi (khoảng cách 0): thắng 'Bước lên bờ' của bè khi cá đuối nằm sát bờ */
    if (ST.shrine && dst(ST.shrine, p) < 30) return { label: t.shrine, x: ST.shrine.x, y: ST.shrine.y, limit: 30, data: { kind: 'shrine' } };
    return null;
  },
  interact(ctx, cand) {
    const d = cand && cand.data; if (!d) return;
    if (d.kind === 'feed') { if (!d.has || !ST.wild) { ctx.sfx('fail'); return; } ST.feed = { mo: ST.wild, t: 0 }; ctx.toast(L(ctx).feeding); ctx.sfx('pickup'); log('feed start'); }
    if (d.kind === 'shrine') import('../menu.js').then(m => m.openMenu && m.openMenu('anlinh')).catch(() => { });   /* Đền Linh Thú → thẻ Ấn Linh */
  },
  drawables(ctx, cx, cy) {
    const g = ctx.g, out = [], VW = ctx.VW || 480, VH = ctx.VH || 270, on = (x, y) => x - cx > -60 && x - cx < VW + 60 && y - cy > -60 && y - cy < VH + 80;
    if (ST.den && on(ST.den.x, ST.den.y)) { const im = uiImg('linhthu/den.png'); if (im) out.push({ y: ST.den.y - 6, f: () => g.drawImage(im, 0, 0, im.naturalWidth, im.naturalHeight, (globalThis.__R89||Math.round)(ST.den.x - cx - im.naturalWidth / 4), (globalThis.__R89||Math.round)(ST.den.y - cy - im.naturalHeight / 2 + 2), im.naturalWidth / 2, im.naturalHeight / 2) }); }
    if (ST.shrine && on(ST.shrine.x, ST.shrine.y)) { const im = uiImg('linhthu/shrine.png'); if (im) out.push({ y: ST.shrine.y, f: () => g.drawImage(im, 0, 0, im.naturalWidth, im.naturalHeight, (globalThis.__R89||Math.round)(ST.shrine.x - cx - im.naturalWidth / 4), (globalThis.__R89||Math.round)(ST.shrine.y - cy - im.naturalHeight / 2), im.naturalWidth / 2, im.naturalHeight / 2) }); }
    for (const C of ST.cs) { const k = owned(ctx, C.id); C._head = null;
    const pp = ctx.S.player, behind = SP[C.id].move === 'fly' && pp && Math.abs(C.x - pp.x) < 16 && C.y > pp.y - 4 && C.y < pp.y + 18;   /* 2026-10-16 loài bay lượn / lao ngang người chơi: vẽ SAU người, không che mặt */
    if (k && !C.hidden && !C.hide && on(C.x, C.y)) out.push({ y: behind ? pp.y - 0.5 : C.y, f: () => { ST.c = C;
      const x = (globalThis.__R89||Math.round)(C.x - cx) + (C.cast && C.cast.sk.kind === 'cannon' && C.cast.t < (C.cast.sk.windup || 0.6) ? (((C.cast.t * 28) | 0) % 2 ? 1 : -1) : 0), y = (globalThis.__R89||Math.round)(C.y - cy), lift = (floaty(C.id) && !fishOnly(C.id) ? (SP[C.id].flyH || 5) : 0) + Math.round(C.lift || 0) + (amphib(C.id) && ctx.S.map && ctx.S.map.under && !C.jump ? 2 + Math.round(Math.sin(C.t * 2.2) * 1.5) : 0);   /* cóc bơi dưới nước: nổi khỏi đáy, nhấp nhô nhẹ */   /* cá: không nâng — bơi chìm nửa dưới */
      const wetD = (!floaty(C.id) || fishOnly(C.id)) && WATER.depth ? WATER.depth(C.x, C.y) : 0; const MF0 = META && META[formOf(C.id, k.evo)], shW = (!k.evo && SP[C.id].shadowW) || (k.evo && SP[C.id].evo && SP[C.id].evo.shadowW) || (MF0 ? Math.max(4, Math.round(MF0.w / 6)) : 6); if (!wetD && !(ctx.S.map && ctx.S.map.under && swimmer(C.id))) { if (SHADOW.on) shadowFor(g, C.x, C.y, x, y, Math.max(8, shW * 2), lift); else { const shLift = Math.max(0, C.lift || 0), shK = Math.max(0.5, 1 - shLift / 14); g.save(); g.globalAlpha = 0.25 * Math.max(0.45, 1 - shLift / 12); g.fillStyle = '#000'; g.beginPath(); g.ellipse(x, y, shW * shK, (shW > 4 ? 2 : 1.5) * shK, 0, 0, TAU); g.fill(); g.restore(); }   /* 2026-10-16: bóng co + nhạt theo độ nâng TẠM (nhảy / nhún / hất) → đọc ra 'nhảy', không 'lơ lửng' */ }   /* dưới nước: không bóng đổ */
      const UWm = !!(ctx.S.map && ctx.S.map.under), swim = amphib(C.id) && !C.jump && (wetAt(ctx, C.x, C.y) || UWm);   /* dưới nước: clip swim (đạp chân bơi) */ C._dy = 0; const M0 = META && META[formOf(C.id, k.evo)], lick = C.cast && C.cast.sk.kind === 'pull' && M0 && M0.clips.lick, clip = C.jump || C.hop || C.hw || C.kfly || C.popT > 0 ? 'jump' : lick ? (C.dir === 'north' ? 'idle' : 'lick') : C.cast ? (C.cast.sk.kind === 'burrow' && M0 && M0.clips.dig ? (C.cast.t < 0.32 ? 'dig' : 'idle') : C.cast.sk.kind === 'leap' && M0 && M0.clips.jump ? 'jump' : C.cast.sk.kind === 'dash' && M0 && M0.clips.roll ? 'roll' : C.cast.sk.kind === 'rain' && M0 && M0.clips.croak ? 'croak' : 'cast') : swim ? 'swim' : C.moving ? 'walk' : 'idle';
      const jn = (M0 && M0.clips.jump && (M0.clips.jump[C.dir === 'west' ? 'east' : C.dir] || M0.clips.jump.south) || {}).n || 6;
      const lt = clip === 'lick' ? (lickFrame(C) + 0.5) / 10 : C.hw ? Math.min(0.999, C.hw.t / C.hw.T) * jn / 8 : C.jump ? C.jump.t * 1.4 : C.hop ? C.hop.t * 2.4 : C.popT > 0 ? (0.3 - C.popT) * 2 : C.cast ? C.cast.t * (clip === 'dig' ? 2 : 1) : C.t, pa = (C.popT > 0 ? Math.min(1, 0.35 + (1 - C.popT / 0.3) * 0.65) : 1) * (C.hurtT > 0 && ((C.hurtT * 20) | 0) % 2 ? 0.45 : 1);   /* nháy ngắn khi bị trúng */   /* pa: mờ dần hiện lúc vừa nảy khỏi Ấn Linh */   /* lick: khung theo pha lưỡi */
      if (ST.tongue && ST.tongue.C === C && (ST.tongue.up ?? C.dir === 'north')) drawTongue(g, cx, cy);   /* 2026-10-16 (QUY TẮC LỚP VẼ CHIÊU): lưỡi nhắm lên → vẽ SAU thân */   /* hướng bắc: miệng ở phía khuất → lưỡi vẽ SAU thân cóc */
      const capW = (!k.evo && SP[C.id].sink) || (k.evo && SP[C.id].evo && SP[C.id].evo.sink) || (M0 ? Math.round(M0.foot / 2 * 0.4) : 9); wetDraw(g, C, x, y, () => { if (!drawForm(g, formOf(C.id, k.evo), clip, C.dir, lt, x, y - lift, pa, C.cast ? 10 : 8)) drawForm(g, formOf(C.id, 0), clip, C.dir, C.t, x, y - lift); }, true, capW);   /* chìm nửa dưới khi ở ô nước (mép nước gợn sáng như Rocky) */
      C._head = cutY => { const top = y - lift - 64, hh = (globalThis.__R89||Math.round)(cutY - cy) - top; if (hh <= 0) return; g.save(); g.beginPath(); g.rect(x - 48, top, 96, hh); g.clip(); wetDraw(g, C, x, y, () => drawForm(g, formOf(C.id, k.evo), clip, C.dir, lt, x, y - lift, pa, C.cast ? 10 : 8), false, capW); g.restore(); };   /* 2026-10-16 (QUY TẮC LỚP VẼ CHIÊU): phần thân TRÊN miệng vẽ lại phủ gốc tia phun xuống */
      if (ST.tongue && ST.tongue.C === C && !(ST.tongue.up ?? C.dir === 'north')) { drawTongue(g, cx, cy); if (clip === 'lick') { const mm = mouthOf(C), top = y - lift - 30; g.save(); g.beginPath(); g.rect(x - 24, top, 48, (globalThis.__R89||Math.round)(mm.y - cy) - top); g.clip(); wetDraw(g, C, x, y, () => drawForm(g, formOf(C.id, k.evo), clip, C.dir, lt, x, y - lift, 1, 10), false, capW); g.restore(); } }   /* hàm / môi trên vẽ lại PHỦ gốc lưỡi → lưỡi thè ra từ trong miệng */
      if (ST.splat && !ST.splat.code && C.id === 'coc') { const im = uiImg('linhthu/fx/tongue_hit.png'); if (im) g.drawImage(im, 0, 0, im.naturalWidth, im.naturalHeight, (globalThis.__R89||Math.round)(ST.splat.x - cx - im.naturalWidth / 4), (globalThis.__R89||Math.round)(ST.splat.y - cy - im.naturalHeight / 4), im.naturalWidth / 2, im.naturalHeight / 2); }
    } }); }
    const C = ST.cs.find(c => c.id === 'tacke') || ST.cs[0] || null, k = C && owned(ctx, C.id);   /* bóng phân thân: của Tắc Kè */
    if (ST.tongue && ST.tongue.hit && ST.tongue.mo && on(ST.tongue.mo.x, ST.tongue.mo.y)) { const mo = ST.tongue.mo; out.push({ y: mo.y + 0.05, f: () => drawWrap(g, cx, cy) }); }   /* lớp bọc vẽ NGAY SAU quái → phủ lên quái */
    for (const O of ST.orbs) { if (O.t < 0) continue; const oy = O.ph === 'throw' ? O.y0 + 9 + (O.y1 - O.y0 - 9) * Math.min(1, O.t / O.T) + (O.y1 < O.y0 + 9 ? -0.5 : 0.5) : O.gy + 0.2; out.push({ y: oy, skill: O.ph === 'throw' ? 'lt_orb' : undefined, f: () => drawOrbAnim(g, ctx, cx, cy, O) }); }   /* 2026-10-16 (QUY TẮC LỚP VẼ CHIÊU) */
    for (const b of ST.bursts || []) out.push({ y: b.y + 0.3, f: () => drawBurst(g, b, cx, cy) });
    for (const s of ST.splash || []) if (on(s.x, s.y)) out.push({ y: s.y - 1.5, f: () => drawSplash(g, s, cx, cy) });
    for (const s of ST.hdust || []) if (on(s.x, s.y)) out.push({ y: s.y - 0.5, f: () => drawHopDust(g, s, cx, cy) });   /* dập nước: vẽ SAU lưng cóc (cóc đứng giữa vũng) */
    if (ST.decoys && ST.decoys.list) { const D = ST.decoys, tt = ctx.S.time, fa = Math.min(1, (tt - D.t0) / 0.2) * Math.min(1, Math.max(0, (D.until - tt) / 0.4)); for (const q of D.list) { const C2 = q.C, k2 = C2 && owned(ctx, C2.id); if (!C2 || !k2 || !on(q.x, q.y)) continue; const fm = formOf(C2.id, k2.evo); out.push({ y: q.y, f: () => { drawForm(g, fm, 'idle', q.dir, 0, (globalThis.__R89||Math.round)(q.x - cx), (globalThis.__R89||Math.round)(q.y - cy), 0.42 * fa); g.save(); g.globalCompositeOperation = 'lighter'; drawForm(g, fm, 'idle', q.dir, 0, (globalThis.__R89||Math.round)(q.x - cx), (globalThis.__R89||Math.round)(q.y - cy), 0.3 * fa); g.restore(); } }); } }   /* bóng ánh bạc: sprite mờ + lớp cộng sáng, ĐỨNG YÊN (khung 0), mờ dần 0,4 s cuối */
    if (ST.cpfx) { const tt = ctx.S.time || 0; ST.cpfx = ST.cpfx.filter(e => (tt - e.t0) * 1000 < cpLen(CPFX[e.n]) && tt >= e.t0 - 1); for (const e of ST.cpfx) if (on(e.x, e.y)) out.push({ y: e.k0 != null && CPFX[e.n].rot ? e.k0 + (Math.sin(e.a || 0) < 0 ? -0.5 : 0.5) : CPFX[e.n].ground ? e.y - CPFX[e.n].ground : e.y - (e.n === 'cp:spout' ? 0.6 : CPFX[e.n].rot ? -4 : 1.5), skill: e.n, f: () => { drawCpFx(g, e, cx, cy, ctx.S.time || 0); if (e.C && e.C._head && CPFX[e.n].rot && Math.sin(e.a || 0) >= 0) e.C._head(e.cut ?? e.y); } }); }   /* vòng trên đất: xếp dưới mọi thứ đứng trong vòng; sóng âm: trên thân dế */
    for (const r of ST.rocks || []) if (on(r.x, r.y)) out.push({ y: r.y + 1, f: () => drawRock(g, r, cx, cy) });
    for (const b of ST.proj) out.push({ y: b.y + (b.h ?? 6) + (b.vy < 0 ? -0.5 : 0.5), skill: 'lt_proj', f: () => {   /* 2026-10-16 (QUY TẮC LỚP VẼ CHIÊU): khoá = chân điểm đang bay; lúc rời miệng = chân linh thú ∓ 0,5 → bắn lên nằm sau thân, bắn xuống nằm trước */ if (PJ69[b.fx] && !OLD69()) drawProj69(g, b, cx, cy); else if (CPFX[b.fx] ? !drawCpProj(g, b, cx, cy) : !drawSheetFrame(g, b.fx, b.t, (globalThis.__R89||Math.round)(b.x - cx), (globalThis.__R89||Math.round)(b.y - cy), b.scale || 1)) { g.fillStyle = '#ffffff'; g.fillRect((globalThis.__R89||Math.round)(b.x - cx) - 2, (globalThis.__R89||Math.round)(b.y - cy) - 2, 4, 4); } } });
    return out;
  },
  drawGround(g, ctx, cx, cy) { drawPuddles(g, ctx, cx, cy);   /* 2026-10-16 vũng tạm Gọi Mưa (lớp nền) — gộp vào drawGround có sẵn (vòng báo Lôi Giáng của Hạc) */ const W = ST.warns; if (!W || !W.length) return; const now = ctx.S.time || 0; ST.warns = W.filter(w => now < w.t1); for (const w of ST.warns) { const u = Math.max(0, Math.min(1, (now - w.t0) / (w.t1 - w.t0))), X = (globalThis.__R89||Math.round)(w.x - cx), Y = (globalThis.__R89||Math.round)(w.y - cy); g.save(); g.globalAlpha = 0.16 + 0.14 * u; g.fillStyle = '#7fd8ff'; g.beginPath(); g.ellipse(X, Y, w.r, w.r * 0.6, 0, 0, TAU); g.fill(); g.globalAlpha = 0.85; g.strokeStyle = u > 0.7 ? '#ffffff' : '#a8ecff'; g.lineWidth = 1; g.setLineDash([3, 3]); g.lineDashOffset = -now * 12; g.beginPath(); g.ellipse(X, Y, w.r, w.r * 0.6, 0, 0, TAU); g.stroke(); g.restore(); } },   /* 2026-10-16 Lôi Giáng: vòng nét đứt báo trước 0,6 s (theo sự kiện, tự tắt) */
  draw(g, ctx, cx, cy) { if (ST.dark) { const a = Math.sin(Math.min(1, ST.dark.t / ST.dark.dur) * Math.PI) * 0.28; g.save(); g.fillStyle = `rgba(40,10,60,${a.toFixed(3)})`; g.fillRect(0, 0, ctx.VW || 480, ctx.VH || 270); g.restore(); } },
  drawUI(ug, ctx, cx, cy, scale) {
    drawHpBar(ug, ctx, cx, cy, scale);
    const F = ST.feed; if (!F || !F.mo) return; const x = (F.mo.x - cx) * scale, y = (F.mo.y - 28 - cy) * scale, w = 30 * scale, h = 4 * scale;
    ug.save(); ug.fillStyle = 'rgba(20,12,8,.8)'; ug.fillRect(x - w / 2 - 2, y - 2, w + 4, h + 4); ug.fillStyle = '#8fe07a'; ug.fillRect(x - w / 2, y, w * Math.min(1, F.t / 2), h); ug.restore();
  },
  hudLines(ctx) { const out = []; for (const C of ST.cs) { const k = owned(ctx, C.id); if (k && C.hidden) out.push(L(ctx).sealed(nameOf(ctx, C.id, k.evo))); } return out.slice(0, 2); },
};

/* p98:scale:begin — plan-98: ảnh linh thú TRÊN MAP của Kỳ Lân / Hạc / Sao La / Đại Bàng thu nhỏ (assets linhthu/<dạng>.png + linhthu.json w/h/foot mới)
   → số đo tay theo px logic nhân cùng tỉ lệ: [k dạng gốc, k dạng tiến hoá]. */
const P98LT = {"kylan": [0.7931, 0.8485], "hac": [0.7667, 0.9333], "saola": [0.6765, 0.8235], "daibang": [0.7667, 0.9333]};
for (const [id, [k0, k1]] of Object.entries(P98LT)) { const s = SP[id]; if (!s) continue;
  const r = (v, k) => Math.round(v * k * 10) / 10, arr = (a, k) => (Array.isArray(a) ? a.map(v => (typeof v === 'number' ? r(v, k) : v)) : a);
  const mo = (o, k) => { if (o) for (const d of Object.keys(o)) o[d] = arr(o[d], k); };
  mo(s.mouth, k0); mo(s.mouth2, k1); if (s.horn) s.horn = arr(s.horn, k0);
  for (const key of ['headY', 'shadowW', 'flyH', 'sink']) if (typeof s[key] === 'number') s[key] = r(s[key], k0);
  if (s.evo) for (const key of ['headY', 'shadowW', 'flyH', 'sink']) if (typeof s.evo[key] === 'number') s.evo[key] = r(s.evo[key], k1);
}
/* p98:scale:end */
