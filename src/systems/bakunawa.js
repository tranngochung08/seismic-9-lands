// bakunawa.js — plan-30 TRÙM 6: BAKUNAWA NUỐT NHẬT "Long Mạch Thức Tỉnh" (trùm cuối Vết Nứt Magnitude) — agent trùm 6, 2026-10-13.
//  · Vào: Cổng Trời phía Bắc trời M9 (sky.js gọi ctx.enterBakunawa khi cổng đủ điều kiện: huy hiệu M9 + hạ đủ 5 trùm) → vùng 'sky_bakunawa'
//    (world.js buildSkyBakunawa): ĐÀI ĐÁ TRỜI tròn giữa biển mây bão (ô CHASM cứng = mây; hệ này vẽ biển mây). Lối Nam (bậc mây) LUÔN mở → trời M9 lối 'gate'.
//  · RẮN = đầu + 12 đốt + đuôi, mỗi thứ là ảnh PixelLab 8 hướng (tools/px-bakunawa.py), vẽ 1:1. Thân đi theo VỆT ĐẦU (follow-the-leader), lượn mượt,
//    lặn vào / trồi ra biển mây (z < 0 = dưới mây: ẩn). Đốt chọn ảnh theo TRỤC tiếp tuyến (ảnh gốc hoặc xoay đúng 90° — không xoay góc lẻ).
//  · Trùm = 1 quái trong ctx.monsters; vị trí quái = điểm thân / đầu GẦN NGƯỜI CHƠI NHẤT (chém trúng thân nào cũng tính), drawFn rỗng — hệ này tự vẽ rắn.
//  · HỒI CHIÊU RIÊNG + ƯU TIÊN (như trùm 5): Nhật Thực > Long Mạch > Vảy Trăng > Sét Bão > Quật Đuôi > Đớp; không 1 chiêu quá 2 lần liền.
//  · NHẬT THỰC (khắc chế Rocky): rắn vút lên nuốt mặt trời → sân TỐI (lớp tối canvas: lỗ sáng lớn quanh Rocky, mờ quanh người chơi, vòng báo đòn phát sáng
//    trên lớp tối); Rocky bị ép ĐI THEO người chơi (ctx.petWait) soi đường, không đánh. Cách giải: gõ 3 TRỐNG NGHI LỄ (ảnh trống đồng PixelLab của trùm 2)
//    ĐÚNG NHỊP (thanh nhịp như trùm 2, 120 BPM, ±0,17 s) → nhả mặt trời, sân sáng bừng từ tâm theo vòng, rắn CHOÁNG 10 s, ĐỐT SÁNG lộ (×2,2; mọi đòn ×1,6).
//    Không giải trong 28 s → tự nhả (không choáng).
//  · LONG MẠCH: lặn xuống mây → vạch xoáy mây + sét băng qua đài (qua chỗ mục tiêu) báo 1,2 s → trồi lên dọc vạch, hất TUNG (launch) người + Rocky.
//  · VẢY TRĂNG: 3 vảy trăng khuyết bay ra rồi QUAY VỀ đốt đã rụng (boomerang); vạch báo đường đi 0,8 s. · SÉT BÃO: vòng báo 1,1 s rồi sét trời (td_sky).
//  · ĐỚP: đầu ghìm 0,55 s (vạch báo bám mục tiêu) rồi lao tới — trúng mọi phía, hất bay. · QUẬT ĐUÔI: người núp cạnh thân sau (xa đầu) → đuôi quật vòng.
//  · TUYỆT CHIÊU "THIÊN CẨU THỰC NGUYỆT" (60 % / 30 %): trăng máu; thân quấn VÒNG quanh đài và SIẾT dần (vòng = tường gây sát thương + đẩy vào);
//    đầu đớp từ 4 phía (vạch báo 1 s); 2 ĐỐT SÁNG đối nhau: người chơi đánh đốt gần mình (E / chém), Rocky tự tới bắn Rocky-ha đốt còn lại (HUD chỉ).
//    Phá đủ 2 đốt trước khi siết hết → vòng bung, rắn choáng 6 s; không kịp → siết nát (đòn nặng) rồi thả.
//  · PHA 2 "ĐẦU RỒNG BÃO": thân rơi rụng vào mây, đầu tách ra đánh trực tiếp (lao thẳng để vệt sét, phun sét hình nón, vảy trăng đôi, sét bão).
//    Hạ → nhả cả mặt trời lẫn trăng, tan thành mây sáng → thắng. Thưởng lần đầu: sách Rocky bậc 8 (ctx.hrBook), Ngọc Rồng, thành tựu 'bakunawa',
//    danh hiệu 'Người Giữ Mặt Trời', Mảnh Sao + Sét đóng chai; đánh lại giảm. save.sys.bakunawa.
//  · 2026-10-14 KHÔNG CHIẾN (aircombat.js): sân là TRỜI MỞ không sàn; rắn ĐUỔI THEO người chơi qua tầng (trời ↔ trung ↔ đất) và qua vùng (ctx.chase),
//    máu / pha giữ nguyên; tầng thấp đánh từ trên cao xuống (đầu bay cao, bóng in dưới đất); Long Mạch trồi từ biển mây / lòng đất; đòn trúng cả dân / thú / quái / vật.
//    Mặt trời là VẬT trên bầu trời (ảnh PixelLab skysun / skyeclipse) — rắn bay lên nuốt, nhả; 3 trống nổi trên mây (drumcloud).
//  · Hiệu ứng chỉ theo sự kiện (lớp tối chỉ trong Nhật Thực, trăng máu chỉ trong tuyệt chiêu, loé sáng khi nhả mặt trời 0,9 s). Không CSS filter.
import { easyHp } from './diff.js';   /* plan-44 C2: Độ khó Dễ — máu ×0,6 */
import { ART } from '../art.js';
import * as LV from './petlv.js';
import { SHADOW, shadowAt as pxShadow } from './shadow.js';   /* plan-66: bóng chung (tên shadowAt cũ của file giữ nguyên) */
import { bossCam, bossCamReset, bossBarBox } from './bosscam.js';
import { musicClock } from '../audio.js';
import { fogTint, fogLayer, mixHex, drawCopter } from './sky.js';
import { drawFlyPose } from './flyposes.js';
import { T as TT } from '../gfx.js';
import { ZONES } from '../world.js';

const TS = 16, TAU = Math.PI * 2;
const STR = {
  vi: {
    name: 'Ngô Công Lôi Thần', sub: 'Vua Rết Sấm Sét', ph2name: 'Đầu Rồng Bão', ph2sub: 'đầu tách thân', skip: 'Bỏ qua', phase: n => `Pha ${n}/2`,
    intro: 'Biển mây cuộn lên… có thứ gì rất dài đang lượn vòng.', rise: 'VUA RẾT THỨC TỈNH!',
    eat: 'NHẬT THỰC! Bakunawa nuốt mặt trời!', dark: 'Trời tối — Rocky soi đường cho bạn. Gõ 3 TRỐNG ĐÚNG NHỊP ‹•›!', drumOk: n => `Trống vang! (${n}/3)`, drumOff: 'Lệch nhịp — chờ ánh sáng tới ‹•›', drumIdle: 'Trống nghi lễ chỉ vang khi Nhật Thực',
    spit: 'MẶT TRỜI ĐƯỢC NHẢ RA! Bakunawa choáng — đánh ĐỐT SÁNG!', spitSelf: 'Bakunawa nhả mặt trời…', drumTag: 'Gõ trống (đúng nhịp ‹•›)',
    mach: 'LONG MẠCH! Tránh vạch xoáy mây!', moon: 'Nọc Lôi! Mảnh nọc bay ra rồi quay về', bolts: 'Sét Bão!', bite: 'Kìm Cắn!', tail: 'Quật Đuôi Gai!',
    ult: 'TUYỆT CHIÊU — THIÊN CẨU THỰC NGUYỆT!', ultHint: 'Đánh ĐỐT SÁNG gần bạn — Rocky lo đốt bên kia!', burst: 'Vòng rắn BUNG! Bakunawa choáng!', crush: 'Rắn siết nát…',
    glowTag: n => `Đánh đốt sáng (${n})`, you: 'BẠN', rk: 'ROCKY',
    ultHud: (a, b, s) => `Đốt của bạn: ${a} · Đốt của Rocky: ${b} · siết hết sau ${s}s`, darkHud: (n, s) => `NHẬT THỰC — gõ 3 trống đúng nhịp (${n}/3) · ${s}s`, stunHud: s => `CHOÁNG ${s}s — đánh ĐỐT SÁNG (×2,2)`,
    hint: 'Né vạch báo · Giáp nứt: đánh các khớp sáng', shed: 'Thân rắn rơi rụng — ĐẦU RỒNG BÃO lao ra!', dash: 'Lao Sét!', breath: 'Phun Nọc Sét!',
    die: 'Vua Rết gục xuống, thân sụp từng đốt…', won: 'VUA RẾT ĐÃ GỤC!', title: 'Danh hiệu: Kẻ Diệt Ngô Công', again: 'Bakunawa lặn vào biển mây… (đánh lại được, thưởng giảm)',
    aimYou: 'Bakunawa nhắm vào BẠN!', aimRk: 'Bakunawa quay sang Rocky', exit: 'Bậc mây ↓ Trời M9', enter: 'Vào sân Bakunawa',
    rageTag: 'NỔI GIẬN', crack: 'GIÁP NỨT! Đánh các khớp sáng — Rocky lo khớp xa', crackDone: 'Vỡ hết khớp giáp! Vua Rết CHOÁNG!', crackHud: (a, b, s) => `GIÁP NỨT — khớp vỡ ${a}/${b} · ${s}s`,
    rage: 'VUA RẾT NỔI GIẬN!', hood: 'Mũ trùm nứt toác… có NGƯỜI bên trong!',
    follow: 'VUA RẾT ĐUỔI THEO!', waitOut: 'Bakunawa lượn vòng chờ ngay bên ngoài…', tierDown: 'Bakunawa lao xuống theo bạn!', tierUp: 'Bakunawa vút lên theo bạn!', fled: 'Bakunawa lặn về biển mây Cổng Trời…',
  },
  en: {
    name: 'Thunder Centipede God', sub: 'The Storm Centipede King', ph2name: 'Storm Dragon Head', ph2sub: 'head unbound', skip: 'Skip', phase: n => `Phase ${n}/2`,
    intro: 'The cloud sea churns… something very long is circling.', rise: 'THE CENTIPEDE KING AWAKENS!',
    eat: 'ECLIPSE! Bakunawa swallows the sun!', dark: 'Darkness — Rocky lights your way. Strike the 3 DRUMS ON THE BEAT ‹•›!', drumOk: n => `The drum sounds! (${n}/3)`, drumOff: 'Off beat — wait for the light to reach ‹•›', drumIdle: 'The ritual drums only sound during the Eclipse',
    spit: 'THE SUN IS SPAT OUT! Bakunawa is stunned — hit the GLOWING SEGMENT!', spitSelf: 'Bakunawa spits the sun out…', drumTag: 'Strike drum (on the beat ‹•›)',
    mach: 'DRAGON VEIN! Avoid the swirling line!', moon: 'Thunder Venom! Shards fly out and return', bolts: 'Storm Bolts!', bite: 'Mandible Snap!', tail: 'Spiked Tail Lash!',
    ult: 'ULTIMATE — THE SKY HOUND DEVOURS THE MOON!', ultHint: 'Hit the GLOWING SEGMENT near you — Rocky takes the other one!', burst: 'The coil BURSTS! Bakunawa is stunned!', crush: 'The serpent crushes…',
    glowTag: n => `Hit glowing segment (${n})`, you: 'YOU', rk: 'ROCKY',
    ultHud: (a, b, s) => `Your segment: ${a} · Rocky's: ${b} · fully coiled in ${s}s`, darkHud: (n, s) => `ECLIPSE — strike 3 drums on the beat (${n}/3) · ${s}s`, stunHud: s => `STUNNED ${s}s — hit the GLOWING SEGMENT (×2.2)`,
    hint: 'Dodge the warnings · Cracked armor: hit the glowing joints', shed: 'The body falls away — the STORM DRAGON HEAD strikes!', dash: 'Lightning Dash!', breath: 'Venom-Lightning Spit!',
    die: 'The Centipede King collapses, segment by segment…', won: 'THE CENTIPEDE KING HAS FALLEN!', title: 'Title: Centipede Slayer', again: 'Bakunawa sinks into the clouds… (rematch any time, smaller reward)',
    aimYou: 'Bakunawa is targeting YOU!', aimRk: 'Bakunawa turns on Rocky', exit: 'Cloud steps ↓ M9 sky', enter: 'Enter Bakunawa’s arena',
    rageTag: 'ENRAGED', crack: 'ARMOR CRACKS! Hit the glowing joints — Rocky takes the far ones', crackDone: 'All joints shattered! The Centipede King is STUNNED!', crackHud: (a, b, s) => `CRACKED ARMOR — joints broken ${a}/${b} · ${s}s`,
    rage: 'THE CENTIPEDE KING IS ENRAGED!', hood: 'The hood cracks open… someone is INSIDE!',
    follow: 'THE CENTIPEDE KING GIVES CHASE!', waitOut: 'Bakunawa circles right outside, waiting…', tierDown: 'Bakunawa dives after you!', tierUp: 'Bakunawa soars up after you!', fled: 'Bakunawa sinks back into the Sky Gate clouds…',
  },
};
/* 2026-10-14 làm lại (plan-33 mục 20): bỏ hết tên mặt trời / trăng / Bakunawa trong chữ hiện ra; dòng trạng thái NGẮN; thêm chữ NGOẠM THA */
Object.assign(STR.vi, { ult: 'TUYỆT CHIÊU — VÒNG SIẾT VẠN TÚC!', ultHint: 'Đánh khớp sáng gần bạn — Rocky lo khớp bên kia', ultHud: (a, b, s) => `Vòng siết · ${s}s`, crackHud: (a, b, s) => `Giáp nứt ${a}/${b} · ${s}s`, stunHud: s => `Vua Rết choáng · ${s}s`,
  hint: 'Né vạch báo · đánh khớp giáp sáng', aimYou: 'Vua Rết nhắm vào bạn', aimRk: 'Vua Rết quay sang Rocky', again: 'Vua Rết rút vào biển mây… (đánh lại được, thưởng giảm)', waitOut: 'Vua Rết lượn chờ bên ngoài…', fled: 'Vua Rết rút về Cổng Trời…', exit: 'Bậc mây ↓ Trời M9', enter: 'Vào sân Vua Rết',
  tierDown: 'Vua Rết lao xuống theo!', tierUp: 'Vua Rết vút lên theo!', follow: 'Vua Rết chui lên cạnh bạn!',
  grabTele: 'Vua Rết há kìm — sắp NGOẠM bạn!', grabbed: 'BỊ NGOẠM! Bấm A / E liên tục để giãy!', mash: 'Giãy! A / E', grabMiss: 'Đớp hụt!', rkBite: 'Rocky cắn đầu rết!', free: 'Thoát! Chong chóng tre bung ra',
  slam: 'Cắn Đập Đất!', cons: 'SIẾT KÉO HẤT — sắp quấn bạn!', consGrab: 'BỊ QUẤN! Bấm A / E liên tục để giãy!', consFree: 'Giãy thoát vòng quấn! Vua Rết choáng', consHint: 'Rocky đang đánh vòng quấn giúp bạn',
  dropTo: n => `Bị quăng xuống ${n}!`, freeTo: n => `Rơi về ${n} — Vua Rết đuổi theo!`, carryTo: n => `Đang bị tha tới ${n}…` });
Object.assign(STR.en, { ult: 'ULTIMATE — THOUSAND-LEG COIL!', ultHint: 'Hit the glowing joint near you — Rocky takes the other', ultHud: (a, b, s) => `Coil · ${s}s`, crackHud: (a, b, s) => `Cracked armor ${a}/${b} · ${s}s`, stunHud: s => `Stunned · ${s}s`,
  hint: 'Dodge the warnings · hit the glowing joints', aimYou: 'The Centipede King targets you', aimRk: 'The Centipede King turns on Rocky', again: 'The Centipede King sinks into the clouds… (rematch any time, smaller reward)', waitOut: 'The Centipede King circles outside…', fled: 'The Centipede King retreats to the Sky Gate…', exit: 'Cloud steps ↓ M9 sky', enter: 'Enter the Centipede King’s arena',
  tierDown: 'It dives after you!', tierUp: 'It soars after you!', follow: 'The Centipede King bursts out beside you!',
  grabTele: 'Mandibles open — it is about to GRAB you!', grabbed: 'GRABBED! Mash A / E to struggle!', mash: 'Struggle! A / E', grabMiss: 'It missed!', rkBite: 'Rocky bites its head!', free: 'Free! The bamboo-copter pops open',
  slam: 'Ground Slam Bite!', cons: 'CONSTRICT & HURL — it is about to coil you!', consGrab: 'COILED! Mash A / E to struggle!', consFree: 'Broke free of the coil! The Centipede King is stunned', consHint: 'Rocky is attacking the coil to help',
  dropTo: n => `Flung down into ${n}!`, freeTo: n => `Dropping into ${n} — it gives chase!`, carryTo: n => `Carried off to ${n}…` });
const L = ctx => STR[ctx.lang() === 'vi' ? 'vi' : 'en'];

/* ---------------- số liệu ---------------- */
/* 2026-10-14 ĐỔI HÌNH (anh chốt): VUA RẾT 'Ngô Công Lôi Thần' — đầu trùm mũ (mặt Lyron ẩn trong mũ) + RẤT NHIỀU đốt, MỖI ĐỐT 1 cặp chân (chân gợn sóng lệch pha dọc thân) + đốt đuôi có gai.
   Ảnh theo SKIN (đổi bộ ảnh = đổi bảng này): mỗi phần 8 hướng, cỡ lấy từ ảnh, vẽ 1:1. Đốt chọn ảnh theo hướng tiếp tuyến (đốt 'nhìn' về phía đầu). */
const SKIN = { dir: 'boss/bakunawa/c9s/', head: 'khead', seg: ['tseg', 'tsegb'], tail: 'ttail', legHz: 7, legLag: 0.55, rotN: 64, plateOff: 7.25 };   /* 2026-10-15: 48 → 64 góc (5,6°/bậc) — khúc cua không nhảy bậc thấy được */   /* 2026-10-14 anh: nhỏ lại (đầu ≈ 2,4× người), đốt XOAY theo hướng thân (đệm 48 góc) */
const BEND = 0.31;   /* 2026-10-15: khớp lệch tối đa ~18° / đốt (bán kính cong ≥ ~21 px) */
const SEG_N = 50, SP = 6.5,   /* 2026-10-14 anh: đốt ngắn hơn, nhiều hơn → cong mượt. 2026-10-15 anh: 'dài hơn' 34 → 50 đốt */ LIFT = 6, REAR_Z = 30, REAR_N = 8;   /* đốt sát nhau (giáp chồng lên che khớp) */   /* REAR: dựng phần thân trước lên cao (đầu lừng lững trên đầu người chơi) */
/* QUY ƯỚC TOẠ ĐỘ (2026-10-16, anh: 'rết bò xéo, đất xới không trùng thân'): điểm thân / đầu (x, y, z) vẽ ở màn (x, y − GY − z), GY = LIFT + 8.
   MẶT ĐẤT ngay dưới điểm thân = (x, y − GY) (chỗ thân nằm khi z = 0). Dấu trên đất của rết (dải đất xới STRIP, hố / rãnh GC, đất bung ST.erupts, bóng mềm,
   bụi chạm đất fx {body: true}) LƯU theo điểm thân (x, y) — so hố cũ / bẫy kẹt đầu / gộp dấu đều trên toạ độ này — và chỉ dời −gyOf(ctx) lúc VẼ
   (+ lúc hỏi ô đất / cỏ dưới thân). gyOf = GY trên bản đồ đất; = 0 ở sân trời / bản đồ trời (bóng trên mây giữ như cũ). Hiệu ứng mới gắn vào groundTick dùng cùng quy ước. */
const GY = LIFT + 8, gyOf = ctx => { const m = ctx && ctx.S && ctx.S.map; return m && !m.air && !m.sky && !inBk(ctx) ? GY : 0; };
const CARRY_AT = [0.8, 0.52, 0.22];   /* NGOẠM THA ở 80 / 52 / 22 % máu (bắt buộc, không né được) */
const RK_MUL = 0.55, P2_RK = 0.75, STUN_MUL = 1.6, GLOW_MUL = 2.2;
const DMG = { bite: 0.1, mach: 0.12, moon: 0.06, bolt: 0.08, tail: 0.09, wall: 0.05, ubite: 0.1, crush: 0.3, dash: 0.09, breath: 0.08, touch: 0.04 };   /* × máu tối đa người chơi */
const BEAT = 0.5, WIN = 0.17, ONE_K = 2.0;   /* 1 dạng duy nhất (không còn pha 'đầu tách') → máu ×1,45 để trận dài như cũ. 2026-10-15: thân 50 đốt dễ trúng hơn (bot thắng 84–93 s thay vì 107 s) → 1,7 → 2,0 */
const ECL = { rise: 1.3, eat: 0.9, fall: 0.8, dark: 28, stun: 10 };
const ULT = { rise: 1.6, dur: 18, rMin: 50, rot: 0.18, glowHp: 4, biteEvery: 2.5, warn: 1.0 };
const SK1 = { grab: { cd: 30, pri: 90 }, slam: { cd: 14, pri: 76 }, terrain: { cd: 6.5, pri: 78 }, dash: { cd: 4.5, pri: 66 }, breath: { cd: 6, pri: 64 }, mach: { cd: 14, pri: 70 }, moon: { cd: 8, pri: 55 }, bolts: { cd: 9, pri: 45 }, tail: { cd: 4.5, pri: 60 }, bite: { cd: 1.8, pri: 10 } };
const SK2 = { breath: { cd: 5, pri: 70 }, dash: { cd: 3, pri: 60 }, bolts: { cd: 7, pri: 55 }, moon: { cd: 6, pri: 50 } };
const CD0 = { grab: 40, slam: 8, terrain: 4, dash: 0, breath: 0, crack: 14, mach: 5, moon: 3, bolts: 6.5, tail: 3, bite: 0.5 }, CD20 = { breath: 2.5, dash: 1.2, bolts: 4, moon: 3 };
const PACE = { chain: [2, 3], gap: [1.5, 2.5], gap2: [1.2, 1.8], gcd: [0.9, 1.3], gapMul: 1.2, finalAt: 0.2, finalGap: 3 };   /* plan-40 (anh 2026-10-15): đợt 2–3 chiêu → khoảng hở phản công (đòn ×1,2); ≤ 20 % máu: gồng cuối */
const MOVE = { passMin: 140, passMax: 200, spread: 1.05, rad: 55, edgeP: 0.3, coilDeg: 270, coilT: 1.0, crMax: 3 };   /* plan-40: quét chữ S qua người / bò vành / chống cuộn; tối đa 3 hố */
const COMBO = { bite: 'tail', moon: 'dash', bolts: 'mach', slam: 'bolts' };   /* plan-40: chiêu nối trong đợt (nếu sẵn) · 2026-10-16: Cắn Đập Đất → Sét Bão (đòn cận chiến mở đợt không ăn mất suất Sét Bão) */
const MELEE = { lead: 1.0, wait: 2.6, cone: 1.2, rBite: 125, rSlam: 125, aim: 60, skip: 5, reach: 260, side: 1.6, slowK: 0.75, amb0: 1.0, amb1: 2.0, ambR: 135 };   /* 2026-10-16 (bk_sim trên sống: Kìm Cắn 0 lần, Cắn Đập 0 lần — người hay đứng cạnh THÂN, ở xa / bên / sau đầu, mà đòn cận chiến chỉ ra khi người ở nón trước mặt): đợt chiêu XEN KẼ mở bằng đòn cận chiến (Kìm Cắn ↔ Cắn Đập luân phiên) khi người trong reach px → ~lead s trước lượt rết VÒNG ĐẦU LẠI (chốt 1 phía rẽ, ngoảnh lại thì chậm ×slowK), giữ lượt ≤ wait s chờ người vào nón trước mặt (≤ cone rad, tầm rBite / rSlam) rồi mới cắn (vẫn báo trước như cũ); quá giờ → chiêu khác, skip s không vòng lại. Vòng đầu không tới (giữ lượt ≥ amb0 s mà đầu chưa hướng vào người, hoặc ≥ amb1 s) → LẶN PHỤC KÍCH: chui xuống, trồi cách người ambR px mặt hướng vào người rồi mới cắn / đập */
const AG = { rk: 10, hit: 4.5, near: 3, decay: 2.5, back: 6, hold: 4, gap: 3, restless: [9, 13], burst: 12 };
function bossHp(ctx, k = 1) {
  const h = ctx.hero, per = h ? h.atk + h.weaponBonus(h.swordTier) : 100, pt = rk(ctx), st = pt ? LV.atkOf(LV.levelFromXp(pt.xp || 0).lv) : 40;
  return easyHp(Math.round((per * 72 + st * 26) * k));
}
const sv = ctx => { const s = ctx.S.save; s.sys ||= {}; const h = (s.sys.bakunawa ||= {}); h.wins ||= 0; h.tries ||= 0; return h; };
const rk = ctx => (ctx.rocky && ctx.rocky.pet && ctx.rocky.pet()) || (((ctx.S.save.sys || {}).pet || {}).pet) || null;
const rkLv = ctx => { const p = rk(ctx); return p ? LV.levelFromXp(p.xp || 0).lv : 0; };
const BOSSES = ['hacrocky', 'trongdong', 'guong', 'hoden', 'dongho'];
const gateOk = ctx => { const s = ctx.S.save; return (s.badges || []).includes(9) && BOSSES.every(b => (s.achievements || []).includes(b)); };
const inBk = ctx => !!(ctx.S.zone && ctx.S.zone.id === 'sky_bakunawa');
const zidOf = ctx => (ctx.S.zone && ctx.S.zone.id) || '';
const on = ctx => inBk(ctx) || (!!ST.zone && ST.zone === zidOf(ctx));   /* trận đang ở vùng này (sân trời hoặc vùng rắn đuổi tới) */
const tierNow = ctx => (ctx.chase ? ctx.chase.tier() : 'air');
const TIERZ = { air: 2, sky: 4, high: 4, mid: 16, ground: 3, under: 6 };   /* 2026-10-14 anh: trên mặt đất rết BÒ sát đất (xới đất theo đường đi), chỉ phần đầu dựng lên */   /* độ cao đầu rắn so với mặt phẳng logic: tầng thấp → rắn bay CAO hơn người (đánh từ trên xuống), bóng in dưới đất */
const BZ = ctx => TIERZ[tierNow(ctx)] ?? 2;
const lowTier = ctx => { const t = tierNow(ctx); return t === 'ground' || t === 'mid'; };
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const DIR8 = ['east', 'south-east', 'south', 'south-west', 'west', 'north-west', 'north', 'north-east'];
const dirOf = (dx, dy) => DIR8[((Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) % 8) + 8) % 8];
const angDiff = (a, b) => { let d = a - b; while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU; return d; };
const ease = u => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u));

/* ---------------- ảnh ---------------- */
const IM = {};
function img(src) { if (!IM[src]) { const i = new Image(); i.src = 'assets/px/' + src; IM[src] = i; } const i = IM[src]; return i.complete && i.naturalWidth ? i : null; }
const B = n => img('boss/bakunawa/' + n + '.png');
const IMGS = { sun: 'sun', eclipse: 'eclipse', blood: 'bloodmoon', scale: 'moonscale', bar: 'bossbar' };
const RKV = {};   /* 2026-10-16: VFX bụi đá xám đổi màu từ VFX đất (rockVfx) */
const VX = n => ART.vfx && (ART.vfx[n] || (/_rock$/.test(n) ? rockVfx(n) : undefined));
Object.assign(STR.vi, { stuck: 'KẸT ĐẦU! Vua Rết cắm vào hố cũ — đánh mau!', stuckTip: 'Hố sâu! Dụ Vua Rết đập trúng hố → nó KẸT ĐẦU' }); Object.assign(STR.en, { stuck: 'HEAD STUCK! It slammed into an old crater — hit it now!', stuckTip: 'Deep crater! Lure its slam into it → its head gets STUCK' });   /* 2026-10-15 anh: công dụng của hố = BẪY KẸT ĐẦU */
Object.assign(STR.vi, { hoodEmpty: 'Mũ trùm nứt toác… bên trong TRỐNG RỖNG.', silk: 'Sợi lụa đỏ', silkSay: 'Sợi lụa đỏ… sao giống khăn của Lyron thế này?', silkRk: 'Rocky dí mũi đánh hơi sợi lụa… gầm gừ khe khẽ.' }); Object.assign(STR.en, { hoodEmpty: 'The hood cracks open… it is EMPTY inside.', silk: 'Red silk', silkSay: "A strand of red silk… why does it look like Lyron's scarf?", silkRk: 'Rocky sniffs the silk… and growls softly.' });   /* 2026-10-15 anh: hạ Rết → ở lại sân, mũ RỖNG + sợi lụa đỏ; gặp Lyron riêng ở cầu tàu (lyron_finale.meet) */
const TRAP = { r: 24, stun: 3.2 };   /* cú Cắn Đập Đất trúng hố cũ (tâm hố trong 24 px) → kẹt đầu 3,2 s (choáng: đòn người ×1,6) */
Object.assign(STR.vi, { finalCall: 'GỒNG CUỐI — Long Mạch liên hoàn!' }); Object.assign(STR.en, { finalCall: 'LAST STAND — chained Earth Dragon!' });   /* plan-40 */
/* đốt thân: ảnh 8 hướng + bản xoay ĐÚNG 90° (không răng cưa) → bảng {ảnh, góc trục}; chọn theo trục tiếp tuyến */
const AX = {};
function axisOf(c) {   /* góc trục chính (mod π) của mảng có alpha — mô-men bậc 2 */
  const w = c.width, h = c.height, d = c.getContext('2d').getImageData(0, 0, w, h).data; let n = 0, sx = 0, sy = 0, xx = 0, yy = 0, xy = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (d[(y * w + x) * 4 + 3] > 80) { n++; sx += x; sy += y; xx += x * x; yy += y * y; xy += x * y; }
  if (!n) return 0; const mx = sx / n, my = sy / n, a = xx / n - mx * mx, b = yy / n - my * my, c2 = xy / n - mx * my; return 0.5 * Math.atan2(2 * c2, a - b);
}
function toCanvas(im, rot) { const c = document.createElement('canvas'); c.width = rot ? im.naturalHeight : im.naturalWidth; c.height = rot ? im.naturalWidth : im.naturalHeight; const g = c.getContext('2d'); g.imageSmoothingEnabled = false; if (rot) { g.translate(c.width, 0); g.rotate(Math.PI / 2); } g.drawImage(im, 0, 0); return c; }
function segSet(kind) {
  if (AX[kind]) return AX[kind]; if (typeof document === 'undefined') return null;
  const ims = DIR8.map(d => img(`boss/bakunawa/${kind}_${d}.png`)); if (ims.some(i => !i)) return null;
  const out = []; for (const d of ['north', 'north-east', 'north-west', 'south', 'east']) { const im = ims[DIR8.indexOf(d)]; for (const rot of [0, 1]) { const c = toCanvas(im, rot); out.push({ c, a: axisOf(c), rot, d }); } }
  return (AX[kind] = out);
}
function segPick(kind, ang) { const S = segSet(kind); if (!S) return null; let best = null, bd = 9; for (const s of S) { let d = Math.abs(angDiff(ang, s.a)); d = Math.min(d, Math.PI - d) + (s.d === 'south' || s.d === 'east' ? 0.25 : 0) + s.rot * 0.02; if (d < bd) { bd = d; best = s; } } return best && best.c; }
function blit(g, c, x, y, alpha = 1) { if (!c) return; const w = (c.naturalWidth || c.width) / 2, h = (c.naturalHeight || c.height) / 2, sm = g.imageSmoothingEnabled, a0 = g.globalAlpha; if (sm) g.imageSmoothingEnabled = false; if (alpha < 1) g.globalAlpha = Math.max(0, alpha); g.drawImage(c, Math.round(x - w / 2), Math.round(y - h / 2), w, h); if (alpha < 1) g.globalAlpha = a0; if (sm) g.imageSmoothingEnabled = true; }   /* perf 2026-10-14: không save/restore (~100 lần / khung) */
function blitRot(g, c, x, y, rot, alpha = 1) { if (!c) return; const w = c.naturalWidth / 2, h = c.naturalHeight / 2; g.save(); g.imageSmoothingEnabled = false; if (alpha < 1) g.globalAlpha = Math.max(0, alpha); g.translate(Math.round(x), Math.round(y)); g.rotate(rot); g.drawImage(c, -w / 2, -h / 2, w, h); g.restore(); }
function drawSheet(g, s, f, x, y, alpha = 1) { const hi = s.img.__hi ? 1 : 2, ax = s.ax != null ? s.ax : s.w / 2, ay = s.ay != null ? s.ay : s.h; g.save(); g.imageSmoothingEnabled = false; g.globalAlpha = alpha; g.drawImage(s.img, f * s.w * hi, 0, s.w * hi, s.h * hi, Math.round(x - ax), Math.round(y - ay), s.w, s.h); g.restore(); }
/* biển mây bão (ảnh mây PixelLab của trời, phủ màu tối 1 lần) */
const CLOUD = {};
function darkCloud(src, col) { const k = src + col; if (CLOUD[k]) return CLOUD[k]; const im = img(src); if (!im || typeof document === 'undefined') return null; const c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight; const g = c.getContext('2d'); g.drawImage(im, 0, 0); g.globalCompositeOperation = 'source-atop'; g.fillStyle = col; g.fillRect(0, 0, c.width, c.height); return (CLOUD[k] = c); }

/* ---------------- trạng thái ---------------- */
const ST = {};
function reset() {
  Object.assign(ST, { boss: null, mo2: null, t: 0, cd: {}, cd2: {}, picks: [], seq: [], H: null, trail: [], body: [], act: null, ecl: null, bloom: null, drums: [], ult: null, ultAt: [0.65, 0.36], erupts: [], carryAt: CARRY_AT.slice(), grab: null, travel: null, landing: null, visited: [], lastGrab: -99, callT: 0, shots: [], tele: [], fx: [], fall: [], banner: null, stuck: null, mv: null, waitT: 0, lastUse: {}, gapT: 0, gapPend: false, gapFinal: false, gcd: 0, chainN: 0, chainLen: 3, combo: null, final: 0, forceQ: [], mDue: null, mWait: 0, mSkipT: 0, mSlot: -1, mTurn: false, mNext: 'bite', mPlan: null, coilT: 0, coilChk: 0, turn: 0, keepCorpse: null, meetTwist: false,
    won: false, log: [], startT: 0, hold: false, introDone: false, recent: [], death: null, shed: null, orb: 0, orbDir: 1, beatF: 0, lastBeat: -1, kickCd: 0, hitCd: {}, lastHitSeen: null, nid: 1, tailT: 0,
    tgt: 'r', tgtT: 0, agP: 0, restT: 10, nearT: 0, tgtLog: {}, rkHaT: 0, spd: null, zone: null, carry: null, arrive: null, tcine: null, fc: null, waiting: false, follows: [], rage: null, flare: 0, rear: 0, lyronHook: null, tPick: null, tad: null, hitN: 0,
    stats: { rkRaw: 0, rkDealt: 0, hits: {}, skills: {}, eclipses: 0, solved: 0, selfSpit: 0, drumOk: 0, drumOff: 0, ultN: 0, ultBurst: 0, ultCrush: 0, glowP: 0, glowR: 0, mach: 0, machHit: 0, moonOut: 0, moonBack: 0, p2: 0, stunHits: 0, glowHits: 0 } });
  Object.assign(ST.cd, CD0); Object.assign(ST.cd2, CD20);
}
reset();
const log = s => { ST.log.push(Math.round(ST.t * 10) / 10 + ' ' + s); if (ST.log.length > 160) ST.log.shift(); };
function fx(name, x, y, opt = {}) { const s = VX(rockFx(name, x, y)); if (!s) return false; ST.fx.push({ s, x, y, t: opt.t0 || 0, dur: opt.dur || s.n / (s.fps || 12), top: !!opt.top, ground: !!opt.ground, body: !!opt.body, alpha: opt.alpha || 1, light: !!opt.light, glowT: opt.glowT || 0 }); return true; }
const boss = () => ST.boss || ST.mo2;
const rkPos = ctx => (ctx.rocky && ctx.rocky.pos && ctx.rocky.pos()) || null;
const rkEnt = ctx => (ctx.rocky && ctx.rocky.ent && ctx.rocky.ent()) || null;
const rkAway = ctx => { const pt = rk(ctx); return !pt || (pt.koT || 0) > 0 || !rkPos(ctx); };
const dark = () => !!(ST.ecl && (ST.ecl.ph === 'dark' || ST.ecl.ph === 'fall' || ST.ecl.ph === 'eat'));
const C0 = ctx => (ST.ult && ST.ult.c) || (inBk(ctx) ? ctx.S.map.bkCenter : null) || ST.fc || { x: ctx.S.player.x, y: ctx.S.player.y };   /* ngoài sân: tâm trận = theo người chơi (mượt) */
const RR = ctx => (inBk(ctx) ? ctx.S.map.bkR : null) || { x: 170, y: 130 };
const onPlat = (ctx, x, y, pad = 0) => { const c = C0(ctx), r = RR(ctx); return Math.hypot((x - c.x) / (r.x - pad), (y - c.y) / (r.y - pad)) < 1; };

/* ---------------- sát thương ---------------- */
/* plan-33 mục 11: phương ĐỨNG của từng đòn (ctx.alt.knockV qua aircombat): up = hất lên · down = đập xuống · slam = đập thẳng xuống đất · side = văng ngang (đang bay thấp + cú mạnh vẫn có thể đập xuống) */
const VERT = { mach: 'up', burrow: 'up', ult: 'up', tail: 'slam', crush: 'slam', ubite: 'down', plunge: 'down', tree: 'down', rock: 'down', bite: 'side', dash: 'side', cannon: 'side', hurl: 'side', arrive: 'down', wave: 'none', breath: 'none', bolt: 'none', moon: 'none', touch: 'none', wall: 'none', shock: 'none', glass: 'none', fire: 'none', whirl: 'none', ball: 'none', bubbles: 'none' };
function hurtPlayer(ctx, frac, from, react = 'stagger', power = 1, key = '') {
  const h = ctx.hero, p = ctx.S.player; if (!h || h.fainted) return false;
  if (ST.hitCd[key] > ST.t) return false;
  const ok = h.hit(Math.max(1, Math.round(h.max * frac))); if (!ok) return false;
  ST.stats.hits[key] = (ST.stats.hits[key] || 0) + 1; log('hit ' + key);
  if (ctx.knockPlayer && react) { const d = Math.hypot(p.x - from.x, p.y - from.y) || 1; ctx.knockPlayer({ type: react, power, vert: VERT[key], dir: { x: (p.x - from.x) / d, y: (p.y - from.y) / d }, src: from, bound: (x, y) => !(ctx.air && ctx.air.on()) || ctx.air.bound(x, y) }); }
  return true;
}
/* 2026-10-15 máu linh thú: đòn trúng chỗ linh thú đang ra trận (mọi con trong đội) → trừ máu (frac như Rocky; kind 'fly' = hất bay) */
function ltHitAt(ctx, test, frac, from, kind) { let n = 0; for (const q of (ctx.ltPets ? ctx.ltPets() : [])) if (test(q) && ctx.ltHit(frac * 1.1, from, kind, q.id)) n++; return n > 0; }
function hurtRocky(ctx, frac, from, kb = 50, kind) {
  const pos = rkPos(ctx); if (!pos) return false; const pt = rk(ctx); if (!pt || !ctx.rocky.hitBy) return false;
  const mx = LV.maxHpOf(rkLv(ctx)), d = Math.hypot(pos.x - from.x, pos.y - from.y) || 1, raw = Math.max(0, Math.min(Math.round(mx * frac * 1.1), Math.round((pt.hp ?? mx) - mx * 0.12)));   /* 2026-10-14: trận trùm không đánh gục Rocky (giữ ≥ 12 % máu) */
  const ux = (pos.x - from.x) / d, uy = (pos.y - from.y) / d; ctx.rocky.hitBy(raw, boss(), ux, uy, kb, kind);
  const sr = ctx.skyRk && ctx.skyRk(); if (sr && sr.with && (kind === 'fly' || kind === 'launch') && ctx.skyRkFling) { if (ctx.skyRkFling(ux, uy, 1)) ST.stats.rkFling = (ST.stats.rkFling || 0) + 1; }   /* trời / tầng Trung: Rocky (bay giả của sky.js) cũng lộn nhào */
  if (kind === 'fly' || kind === 'launch') ST.stats.rkFly = (ST.stats.rkFly || 0) + 1; return true;
}
function areaHit(ctx, x, y, r, frac, key, react = 'stagger', pw = 1, smash = 2) {
  const p = ctx.S.player; let n = 0; if (ctx.chase && smash) ctx.chase.impact(x, y, r, { pw: smash, src: { x, y } });   /* không vùng an toàn: dân / thú / quái / vật cũng trúng */
  if (Math.hypot(p.x - x, p.y - y) < r) n += hurtPlayer(ctx, frac, { x, y }, react, pw, key) ? 1 : 0;
  const rp = rkPos(ctx); if (rp && Math.hypot(rp.x - x, rp.y - y) < r) n += hurtRocky(ctx, frac, { x, y }, react === 'stagger' ? 40 : 62, react === 'launch' ? 'launch' : react === 'fly' ? 'fly' : undefined) ? 1 : 0; ltHitAt(ctx, q => Math.hypot(q.x - x, q.y - y) < r, frac, { x, y }, react === 'stagger' ? 'hit' : 'fly');
  return n;
}

/* ---------------- kẹt ---------------- */
function nearestFree(ctx, x, y) {
  const m = ctx.S.map, reach = m._bkReach || (m._bkReach = (ctx.computeReach && m.entries.default ? ctx.computeReach(m, m.entries.default) : null) || { length: 0, all: true }), sx = Math.floor(x / TS), sy = Math.floor(y / TS);
  const R = (i) => reach.all || reach[i];
  if (!ctx.isSolid(m, sx, sy) && R(sy * m.w + sx)) return null;
  const seen = new Set([sx + ',' + sy]), q = [[sx, sy]];
  while (q.length) { const [cx, cy] = q.shift(); for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = cx + a, ny = cy + b, k = nx + ',' + ny; if (seen.has(k) || nx < 0 || ny < 0 || nx >= m.w || ny >= m.h) continue; seen.add(k); if (!ctx.isSolid(m, nx, ny) && R(ny * m.w + nx)) return { x: nx * TS + 8, y: ny * TS + 12 }; q.push([nx, ny]); } }
  return null;
}
function unstick(ctx) { const p = ctx.S.player; if (ctx.knocked && ctx.knocked()) return; if (inBk(ctx) || tierNow(ctx) !== 'ground') return;   /* trời mở: không có gì để kẹt */
  const m = ctx.S.map; if (!ctx.isSolid(m, Math.floor(p.x / TS), Math.floor((p.y - 2) / TS))) return; const s = nearestFree(ctx, p.x, p.y); if (s) { p.x = s.x; p.y = s.y; log('unstick player'); } }

/* ---------------- VIỀN MAP (anh 2026-10-16: 'các game asset ở viền map cũng bị tác động khi rết càn quét qua') ----------------
   Trước: vành 2 ô sát mép bản đồ đất (cây / cọ / thông / đá / cột viền — world.js districtZone) KHÔNG phá được (blast.kindOf chặn 'vành mép bản đồ'),
   đầu rết bị kẹp cách mép ≥ 20 px (mép dưới ≥ 34 px theo mặt đất) và đường bò né ô cứng → dải rừng viền luôn nguyên. Nay (chỉ vùng đất thường):
   · đầu / thân đang bò (z −4…12) chạm vành → vật viền trong RIM.reach px quanh điểm chạm đất (y − GY) ĐỔ, bằng ảnh HƯ / ĐỔ NÁT PixelLab của chính vật
     (manifest.ruins). Cây: ảnh hư ngã xoay quanh gốc như cây đổ ở trees.js; HÀNG NGOÀI CÙNG ngã NẰM LẠI (ảnh hư xoay đúng 90°, nét pixel giữ nguyên;
     mép trên / dưới rạp theo hướng rết bò, mép trái / phải ngã ra ngoài); hàng trong còn GỐC GÃY (ảnh đổ nát) xen chỗ trống (cây văng mất) — không thành
     hàng rào gốc đều tăm tắp. Đá / cột: hàng ngoài NỨT đứng nguyên (ảnh hư), hàng trong rung rồi còn đống đá vụn. Dăm gỗ / lá / đá vụn / bụi = VFX
     PixelLab sẵn có. Âm 0,2 s / lần, rung NGẮN tối đa 1 lần / 1,5 s (luật 2026-09-22).
   · AN TOÀN: KHÔNG đổi ô cứng nào (vành vẫn là tường mép) → không mở lối ra mép / vòng qua vực, sông dung nham ở hàng viền, không ai bị hất / đi vào trong;
     không đào dọn được (không đặt o.rkRuin), tạm không chặt / đập (o.claimed). Không ghi save. Hết trận (ctx.chase thôi 'bakunawa') 3 s → tự dựng lại
     (trả hp / orig / ghost / claimed cũ); rời vùng = bản đồ dựng mới nên lành sẵn.
   · Đầu được lấn vào vành (điểm chạm đất cách mép trái / phải ≥ 10 px, dưới ≥ 16 px; trên giữ 6 px như cũ) + đường bò 'rim' 2 chặng: người đứng
     gần mép (≤ RIM.near) → thỉnh thoảng (RIM.p, hồi RIM.cd s, chỉ khi đoạn vành đó còn ≥ RIM.minObj vật) rết vào vành rồi bò DỌC vành ngang trước mặt người. */
const RIM = { near: 200, p: 0.5, cd: 7, lane: 14, reach: 18, edge: 10, lead: [50, 90], far: [150, 230], minObj: 3, tick: 0.1, fall: 0.7, stumpP: 0.55, back: 3, lastT: -99, acc: 0, sfxT: 0, qT: 0, endT: 0, ghosts: [], live: [], poll: null, stats: { hits: 0, moves: 0, legs: 0, restored: 0 } };
const RIM_T = /^(tree|palm|pine|pine_s|deadtree|rock|rock_s|boulder|pillar_broken|pillar|hexpillar)$/, RIM_W = /^(tree|palm|pine|pine_s|deadtree)$/;
const rimH = (x, y) => { const v = Math.sin(x * 91.7 + y * 47.3) * 43758.5453; return v - Math.floor(v); };   /* chọn gốc / trống theo ô (cố định) */
const rimMap = ctx => { const m = ctx.S.map; return m && !m.air && !m.sky && !m.road && !(ctx.S.zone && ctx.S.zone.systems) && !inBk(ctx) && m.w >= 20 && m.h >= 20 ? m : null; };   /* vùng đất thường (không đèo / trời / dưới nước / Sàn Đấu) */
function rimOf(ctx, m) {   /* vật cứng ở vành 2 ô (cùng luật vành của blast.js), loại vật viền; dựng lại khi số vật bản đồ đổi (chặt cây…) */
  if (m._bkRim && m._bkRimN === m.objects.length) return m._bkRim; const L0 = [];
  for (const o of m.objects) { const d = ctx.O[o.type]; if (!d || d.solid === false || !RIM_T.test(o.type) || (o.ghost && !o.bkRim)) continue; if (!(o.x < 2 || o.y < 2 || o.x + d.fw > m.w - 2 || o.y + d.fh > m.h - 2)) continue;
    if (o.exit || o.passGate || o.lock || o.seal || o.requires || o.hall || o.door || o.story || o.plot !== undefined) continue;
    let sol = true; for (let j = 0; j < d.fh && sol; j++) for (let i = 0; i < d.fw; i++) if (!m.solid[(o.y + j) * m.w + o.x + i]) { sol = false; break; } if (sol) L0.push(o); }   /* chỉ vật viền đang CỨNG (bỏ cây trang trí đi xuyên được, vd 2 cây cuối đường Sàn Đấu ở Làng) */
  m._bkRimN = m.objects.length; return (m._bkRim = L0); }
function rimRestore(ctx) {   /* dựng lại vật viền của bản đồ đang đứng (trả đúng trạng thái cũ, ô cứng không đổi suốt từ đầu) */
  const m = ctx.S.map, VW = ctx.VW || 480, VH = ctx.VH || 270, cam = ctx.cam || { cx: ctx.S.player.x - VW / 2, cy: ctx.S.player.y - VH / 2 }; let k = 0, puff = 0;
  for (const e of RIM.live) { if (e.m !== m) continue; const o = e.o; o.ruined = false; o.hp = e.hp; if (e.hpMax === undefined) delete o.hpMax; else o.hpMax = e.hpMax; if (e.orig === undefined) delete o.orig; else o.orig = e.orig; if (e.gh === undefined) delete o.ghost; else o.ghost = e.gh;
    if (e.cl === undefined) delete o.claimed; else o.claimed = e.cl; delete o.bkRim; k++; const d = ctx.O[o.type] || { fw: 1, fh: 1 }, x = (o.x + d.fw / 2) * TS, y = (o.y + d.fh) * TS;
    if (ctx.vfx && puff < 14 && x > cam.cx - 20 && x < cam.cx + VW + 20 && y > cam.cy - 20 && y < cam.cy + VH + 40) { ctx.vfx('dirt_puff', x, y); puff++; } }
  RIM.live = []; RIM.ghosts = []; RIM.endT = 0; RIM.stats.restored += k; if (k) log('rim restore ' + k); return k; }
function rimPoll(ctx) {   /* hết trận (chase thôi 'bakunawa') 3 s → dựng lại; rời vùng (bản đồ dựng mới) → bỏ entry cũ. Chạy độc lập vòng update (trận xong update thôi gọi) */
  if (RIM.poll || typeof setInterval === 'undefined') return;
  RIM.poll = setInterval(() => { const m = ctx.S.map; RIM.live = RIM.live.filter(e => e.m === m); RIM.ghosts = RIM.ghosts.filter(G => G.m === m);
    const fight = !!(ctx.chase && ctx.chase.is && ctx.chase.is('bakunawa')) && !ST.won, now = Date.now();
    if (fight || !RIM.live.length) RIM.endT = 0; else if (!RIM.endT) RIM.endT = now; else if (now - RIM.endT >= RIM.back * 1000) rimRestore(ctx);
    if (!RIM.live.length) { clearInterval(RIM.poll); RIM.poll = null; RIM.endT = 0; } }, 250); }
function rimHit(ctx, o, face) {   /* 1 vật viền đổ (KHÔNG đổi ô cứng) */
  const m = ctx.S.map, t = o.type, dm = ART.ruinOf ? ART.ruinOf(t, 'dmg') : null, ru = ART.ruinOf ? ART.ruinOf(t, 'ruin') : null; if (!dm || !ru || o.ruined || o.ghost || o.bkRim) return false;   /* chưa có ảnh hư + đổ nát riêng → để nguyên */
  const d = ctx.O[t] || { fw: 1, fh: 1 }, wood = RIM_W.test(t), x = o.x * TS + d.fw * 8, y = (o.y + d.fh) * TS - 4;
  const outer = o.x === 0 || o.y === 0 || o.x + d.fw === m.w || o.y + d.fh === m.h, lie = wood && outer, gone = wood && !outer && rimH(o.x, o.y) >= RIM.stumpP;   /* hàng ngoài: cây nằm · hàng trong: ~45 % văng mất (còn lại gốc gãy) */
  const crack = !wood && outer;   /* đá / cột HÀNG NGOÀI: chỉ NỨT (ảnh hư đứng nguyên, main.js ruinStage 'dmg') → mép vẫn có dáng tường; hàng trong: đống đá vụn */
  RIM.live.push({ o, m, hp: o.hp, hpMax: o.hpMax, orig: o.orig, gh: o.ghost, cl: o.claimed }); o.bkRim = true; o.claimed = true; if (crack) { o.hpMax = 2; o.hp = 1; } else { o.orig = t; o.ruined = true; o.hp = 0; } if (lie || gone) o.ghost = true;
  if (!crack) RIM.ghosts.push({ o, m, img: dm, t: 0, face: face || 1, wood, lie }); RIM.stats.hits++; ST.stats.rimHits = (ST.stats.rimHits || 0) + 1;
  if (ctx.vfx) { ctx.vfx(wood ? 'wood_chips' : 'rock_debris', x, y); ctx.vfx(wood ? 'wood_chips' : 'rock_debris', x - 6 * (face || 1), y - 6); if (wood && t !== 'deadtree') ctx.vfx('leaf_fall', x, y - 18); ctx.vfx('dirt_puff', x, y + 2); }
  if (RIM.sfxT <= 0) { RIM.sfxT = 0.2; ctx.sfx(wood ? 'smash' : 'rock_break'); } if (RIM.qT <= 0 && ctx.quake) { RIM.qT = 1.5; ctx.quake(0.1); }
  rimPoll(ctx); return true; }
function rimTick(ctx, dt) {
  if (RIM.sfxT > 0) RIM.sfxT -= dt; if (RIM.qT > 0) RIM.qT -= dt;
  for (const G of RIM.ghosts) G.t += dt; RIM.ghosts = RIM.ghosts.filter(G => G.m === ctx.S.map && (G.lie ? G.o.ruined : G.t < (G.wood ? RIM.fall : RIM.fall * 0.6)));   /* cây nằm: tới khi dựng lại */
  const m = rimMap(ctx), H = ST.H; if (!m || !H || ST.ult || ST.death || ST.won || !(ST.boss || ST.mo2) || !lowTier(ctx)) return;
  if ((RIM.acc += dt) < RIM.tick) return; RIM.acc = 0;
  const G0 = gyOf(ctx), mw = m.w * TS, mh = m.h * TS, pad = 32 + RIM.reach; let L0 = null;
  for (let i = -1; i < ST.body.length; i += 3) { const q = i < 0 ? H : ST.body[i]; if (!q || q.z > 12 || q.z < -4) continue; const gx = q.x, gy = q.y - G0;   /* điểm chạm đất (như dải đất xới) */
    if (gx > pad && gy > pad && gx < mw - pad && gy < mh - pad) continue; L0 = L0 || rimOf(ctx, m); const fx0 = Math.cos(q === H ? H.a : (q.a ?? H.a));
    for (const o of L0) { if (o.ruined || o.ghost || o.bkRim) continue; const d = ctx.O[o.type], nx = Math.max(o.x * TS, Math.min((o.x + d.fw) * TS, gx)), ny = Math.max(o.y * TS, Math.min((o.y + d.fh) * TS, gy)); if (Math.hypot(nx - gx, ny - gy) > RIM.reach) continue;
      rimHit(ctx, o, o.x < 2 ? -1 : o.x + d.fw > m.w - 2 ? 1 : Math.abs(fx0) > 0.2 ? Math.sign(fx0) : (o.x * TS + 8 >= gx ? 1 : -1)); } }
}
function rimMove(ctx) {   /* đường bò 'rim' 2 chặng: vào vành (A, phía đầu đang ở) rồi bò DỌC vành ngang qua trước mặt người (B) — null = không */
  const M0 = ST.mv, H = ST.H; if (M0 && M0.k === 'rim' && M0.leg === 1) { RIM.stats.legs++; return { k: 'rim', leg: 2, x: M0.bx, y: M0.by, t: 0, T: 4.5, ph: M0.ph, e: M0.e }; }
  const m = rimMap(ctx); if (!m || !H || !lowTier(ctx) || Math.abs(ST.t - RIM.lastT) < RIM.cd || Math.random() >= RIM.p) return null;
  const p = ctx.S.player, G0 = gyOf(ctx), mw = m.w * TS, mh = m.h * TS, rr = a => a[0] + Math.random() * (a[1] - a[0]);
  for (const [e, dd] of [['n', p.y], ['s', mh - p.y], ['w', p.x], ['e', mw - p.x]].sort((a, b) => a[1] - b[1])) { if (dd > RIM.near) break;
    const hor = e === 'n' || e === 's', len = hor ? mw : mh, pr = hor ? p.x : p.y, dir = (hor ? H.x : H.y) <= pr ? 1 : -1;
    const a0 = Math.max(24, Math.min(len - 24, pr - dir * rr(RIM.lead))), b0 = Math.max(24, Math.min(len - 24, pr + dir * rr(RIM.far))); if (Math.abs(b0 - a0) < 120) continue;
    const lo = Math.min(a0, b0), hi = Math.max(a0, b0); let n = 0;
    for (const o of rimOf(ctx, m)) { if (o.ruined || o.ghost || o.bkRim) continue; const d = ctx.O[o.type], ou = hor ? o.x * TS + 8 : o.y * TS + 8, on2 = e === 'n' ? o.y < 2 : e === 's' ? o.y + d.fh > m.h - 2 : e === 'w' ? o.x < 2 : o.x + d.fw > m.w - 2; if (on2 && ou >= lo && ou <= hi) n++; }
    if (n < RIM.minObj) continue;
    const pt = u => hor ? { x: u, y: e === 'n' ? RIM.lane + G0 : Math.min(mh - 2, mh - RIM.lane - 2 + G0) } : { x: e === 'w' ? RIM.lane - 2 : mw - RIM.lane + 2, y: u + G0 }, A = pt(a0), B = pt(b0);
    RIM.lastT = ST.t; RIM.stats.moves++; ST.stats.mvRim = (ST.stats.mvRim || 0) + 1; log('rim ' + e + ' ' + n);
    return { k: 'rim', leg: 1, x: A.x, y: A.y, bx: B.x, by: B.y, t: 0, T: 4, ph: Math.random() * TAU, e }; }
  return null; }
function rimDraws(ctx, cx, cy, out) {   /* vật viền đang ĐỔ: ảnh hư PixelLab xoay quanh gốc (cây; nằm lại = đúng 90°) / rung rồi mờ (đá), như cây đổ ở trees.js */
  const g = ctx.g, m = ctx.S.map; if (!g) return;
  for (const G of RIM.ghosts) { if (G.m !== m || (G.lie && !G.o.ruined)) continue; const o = G.o, d = ctx.O[o.orig || o.type] || { fw: 1, fh: 1 }, im = G.img, hi = im.__hi || 1, w = (im.__w || im.width) / hi, h = (im.__h || im.height) / hi;
    const T0 = G.wood ? RIM.fall : RIM.fall * 0.6, k = Math.min(1, G.t / T0), bx = o.x * TS + (d.ox || 0) + w / 2, by = (o.y + d.fh) * TS + (d.oy || 0);
    if (bx - cx < -70 || bx - cx > (ctx.VW || 480) + 70 || by - cy < -70 || by - cy > (ctx.VH || 270) + 70) continue;
    out.push({ y: by + 0.6, f: () => { g.save(); g.imageSmoothingEnabled = false; g.globalAlpha = G.lie ? 1 : G.wood ? (k > 0.8 ? (1 - k) * 5 : 1) : (k > 0.45 ? Math.max(0, (1 - k) / 0.55) : 1); g.translate(Math.round(bx - cx), Math.round(by - cy));
      if (G.lie) g.rotate(G.face * (k < 1 ? k * k : 1) * Math.PI / 2); else if (G.wood) g.rotate(G.face * k * k * 1.45); else g.translate(Math.round(Math.sin(G.t * 70) * 1.5 * (1 - k)), 0); g.drawImage(im, -w / 2, -h, w, h); g.restore(); } }); }
}
/* ---------------- THÂN RẮN: vệt đầu → đốt ---------------- */
function headInit(ctx, x, y, a = 0, z = 0) { ST.H = { x, y, z, a, sp: 0, open: 0 }; ST.trail = []; for (let i = 300; i >= 0; i--) ST.trail.push({ x: x - Math.cos(a) * i * 2.5, y: y - Math.sin(a) * i * 2.5, z }); bodyCalc(); }
function trailPush() {   /* 2026-10-15 (anh: 'rết uốn cong không mượt' — khối đốt phồng / gãy khúc): đo cả trận thấy khớp lệch tới 180° (thân GẬP ĐÔI) khi đầu LÙI ngược vệt (rút đầu khỏi hố, giật lùi) và khi đầu lên / xuống tại chỗ (điểm vệt chồng theo phương đứng → góc đốt loạn) */
  const H = ST.H, T = ST.trail;
  while (T.length > 2) { const a = T[T.length - 1], b = T[T.length - 2], ux = a.x - b.x, uy = a.y - b.y, L = Math.hypot(ux, uy); if (L < 1e-3) { T.pop(); continue; } if (((H.x - b.x) * ux + (H.y - b.y) * uy) / L < L - 0.25) T.pop(); else break; }   /* đầu lùi qua điểm vệt cuối → bỏ điểm đó: thân trượt lùi theo, không gập */
  const l = T[T.length - 1]; if (!l || Math.hypot(H.x - l.x, H.y - l.y) >= 2) { T.push({ x: H.x, y: H.y, z: H.z }); if (T.length > 420) T.shift(); } else if (Math.abs(H.z - l.z) > 0.5) l.z = H.z;   /* chỉ lên / xuống tại chỗ: đổi độ cao điểm vệt cuối (cổ dựng nhờ chainFix 3D), không chồng điểm */
}
function bodyCalc() {
  const H = ST.H, T = ST.trail, out = []; if (!H) { ST.body = out; return out; }
  let px = H.x, py = H.y, pz = H.z, acc = 0, i = T.length - 1, k = 1;
  while (k <= SEG_N + 1) {
    const want = k * SP; const q = i >= 0 ? T[i] : null;
    if (!q) { const a = out.length ? out[out.length - 1].a : H.a; px -= Math.cos(a) * (want - acc); py -= Math.sin(a) * (want - acc); acc = want; out.push({ x: px, y: py, z: pz, a, i: k }); k++; continue; }
    const d = Math.hypot(q.x - px, q.y - py, (q.z - pz) * 0.8);   /* 2026-10-14: tính cả chênh độ cao — đầu lao xuống / trồi lên tại chỗ thì cổ dựng theo, không tách khỏi thân */
    if (acc + d >= want && d > 0) { const u = (want - acc) / d, nx = px + (q.x - px) * u, ny = py + (q.y - py) * u, nz = pz + (q.z - pz) * u, prev = out.length ? out[out.length - 1] : H; out.push({ x: nx, y: ny, z: nz, a: Math.atan2(prev.y - ny, prev.x - nx), i: k }); px = nx; py = ny; pz = nz; acc = want; k++; }
    else { acc += d; px = q.x; py = q.y; pz = q.z; i--; }
  }
  for (let pass = 0; pass < 3; pass++) for (let j = 0; j < out.length - 1; j++) { const a0 = j === 0 ? H : out[j - 1], b0 = out[j + 1], q = out[j]; q.x += ((a0.x + b0.x) / 2 - q.x) * 0.5; q.y += ((a0.y + b0.y) / 2 - q.y) * 0.5; }   /* làm trơn đường thân: góc gắt của vệt đầu không thành khúc gãy */
  { let px0 = H.x, py0 = H.y, pz0 = H.z, dir = H.a + Math.PI; { const f = out[0]; if (f && Math.hypot(f.x - H.x, f.y - H.y) > 2) { const fa = Math.atan2(f.y - H.y, f.x - H.x); if (Math.abs(angDiff(fa, dir)) > 1.9) dir = fa; } }   /* plan-40: đầu lệch vệt > 110° → bám vệt */ for (let j = 0; j < out.length; j++) { const q = out[j], dx = q.x - px0, dy = q.y - py0, dz = (q.z - pz0) * 0.8, minL = Math.sqrt(Math.max(0, (SP * 0.78) ** 2 - dz * dz)); let L = Math.hypot(dx, dy); let a = L > 0.3 ? Math.atan2(dy, dx) : dir; const dd = angDiff(a, dir); if (Math.abs(dd) > BEND) a = dir + Math.sign(dd) * BEND; if (L < minL) L = minL; q.x = px0 + Math.cos(a) * L; q.y = py0 + Math.sin(a) * L; if (L > 0.3) dir = a; px0 = q.x; py0 = q.y; pz0 = q.z; } }   /* 2026-10-15: GIỚI HẠN ĐỘ CONG — mỗi khớp lệch ≤ BEND so với khớp trước, đốt 1 nằm sau lưng đầu: thân uốn thành cung tròn, không bẻ chữ V / gập đôi */
  bodyTangents(H, out);
  ST.body = out; return out;
}
function bodyTangents(H, out) {   /* hướng đốt = tiếp tuyến trơn (trung bình 2 đốt kề); 2 đốt kề gần như trùng (cổ dựng đứng) → giữ hướng khung trước, không xoay loạn (2026-10-15) */
  const PA = ST.pa || (ST.pa = []); for (let j = 0; j < out.length; j++) { const a0 = j === 0 ? H : out[j - 1], b0 = out[Math.min(out.length - 1, j + 1)], dx = a0.x - b0.x, dy = a0.y - b0.y; out[j].a = Math.hypot(dx, dy) > 1.2 ? Math.atan2(dy, dx) : PA[j] != null ? PA[j] : j ? out[j - 1].a : H.a; PA[j] = out[j].a; }
}
function chainFix() {   /* BẤT BIẾN (anh: 'đầu rết với thân bị tách ra'): đốt i luôn bám đốt i−1 (đốt 1 bám ĐẦU) trong 1,25 × khoảng đốt, tính cả độ cao */
  const H = ST.H, B = ST.body; if (!H || !B.length) return 0; let fixes = 0, prev = H; const lim = SP * 1.25;
  for (let i = 0; i < B.length; i++) { const q = B[i], dx = q.x - prev.x, dy = q.y - prev.y, dz = (q.z - prev.z) * 0.8, d = Math.hypot(dx, dy, dz);
    if (d > lim) { const u = lim / d; q.x = prev.x + dx * u; q.y = prev.y + dy * u; q.z = prev.z + dz / 0.8 * u; q.a = Math.atan2(prev.y - q.y, prev.x - q.x); fixes++; } prev = q; }
  if (fixes && !(ST.cons && (ST.cons.ph === 'wrap' || ST.cons.ph === 'squeeze'))) bodyTangents(H, B);   /* 2026-10-15: sau khi kéo đốt về, tính lại hướng theo tiếp tuyến trơn (không để hướng dây cung gắt) */
  if (fixes) { ST.stats.chainFix = (ST.stats.chainFix || 0) + 1; const stt = ST.grab ? 'grab:' + ST.grab.ph : ST.cons ? 'cons:' + ST.cons.ph : ST.act ? 'act:' + ST.act.k + (ST.act.ph ? ':' + ST.act.ph : '') : ST.arrive ? 'arrive' : ST.tcine ? 'tcine' : ST.death ? 'death' : 'roam'; (ST.chainLog ||= {})[stt] = (ST.chainLog[stt] || 0) + 1; } return fixes; }   /* ghi trạng thái nào phải sửa (báo cáo) */
const GOV = 3.3;   /* plan-40 chống cuộn: dải hướng tiếp tuyến dọc phần thân đang nổi tối đa ~190° (gập chữ U được, cuộn vòng / tự cắt thân thì không) */
function turnRoom() {   /* phần còn được rẽ thêm về mỗi phía (rad) để dải hướng dọc thân ≤ GOV */
  const B = ST.body, H = ST.H; let a = H.a, u = 0, lo = 0, hi = 0, px = H.x, py = H.y;
  for (let i = 0; i < B.length; i++) { const q = B[i]; if (q.z < -3) break; const dx = px - q.x, dy = py - q.y; if (dx * dx + dy * dy < 4) continue; const t = Math.atan2(dy, dx); u += angDiff(t, a); a = t; if (u < lo) lo = u; if (u > hi) hi = u; px = q.x; py = q.y; }
  return { pos: GOV + lo, neg: GOV - hi };
}
function steer(ctx, dt, tx, ty, sp, turn, free) {
  const H = ST.H, c = C0(ctx), r = RR(ctx), k0 = Math.hypot((H.x - c.x) / (r.x + 70), (H.y - c.y) / (r.y + 60)), out = k0 > 1.03; if (out) { tx = c.x; ty = c.y; turn = Math.max(turn, 2); free = true; }   /* plan-40: ngoài sân → quay về từ từ */
  const want = Math.atan2(ty - H.y, tx - H.x), d = angDiff(want, H.a); let st = Math.max(-turn * dt, Math.min(turn * dt, d));
  if (!free && ST.body.length > 8 && st) { const R = turnRoom(), lim = Math.max(0, st > 0 ? R.pos : R.neg);   /* plan-40: rẽ tiếp sẽ cuộn → đi thẳng chờ thân duỗi; kẹt lâu → rẽ phía kia / thả */
    if (Math.abs(st) > lim) { ST.govT = (ST.govT || 0) + dt; ST.stats.gov = (ST.stats.gov || 0) + dt; if (ST.govT > 0.9) { const alt = Math.max(0, st > 0 ? R.neg : R.pos); if (alt > 0.02) st = -Math.sign(st) * Math.min(turn * dt, alt); } else st = Math.sign(st) * lim; } else ST.govT = Math.max(0, (ST.govT || 0) - dt); }
  H.a += st; H.sp = sp; const x0 = H.x, y0 = H.y; H.x += Math.cos(H.a) * sp * dt; H.y += Math.sin(H.a) * sp * dt;
  const k = Math.hypot((H.x - c.x) / (r.x + 70), (H.y - c.y) / (r.y + 60)); if (k > 1 && !out) { H.x = c.x + (H.x - c.x) / k; H.y = c.y + (H.y - c.y) / k; }
  const m = ctx.S.map; if (m) { const rm = !!rimMap(ctx) && lowTier(ctx), e = rm ? RIM.edge : 20; H.x = Math.max(e, Math.min(m.w * TS - e, H.x)); H.y = Math.max(20, Math.min(m.h * TS - (rm ? 2 : 20), H.y)); }   /* 2026-10-16 viền map: vùng đất được lấn vào vành 2 ô (trái / phải 10 px, dưới: chạm đất y − GY cách mép 16 px) */
  { const mx = H.x - x0, my = H.y - y0, ml = Math.hypot(mx, my); if (ml > 0.2 && ml < sp * dt * 0.97) H.a = Math.atan2(my, mx); }   /* plan-40: bị chặn → đầu quay theo hướng trượt thật (không để đầu chĩa một đằng, thân đi một nẻo) */
}
function trailLine(H, z) { ST.trail = []; for (let i = 170; i >= 1; i--) ST.trail.push({ x: H.x - Math.cos(H.a) * i * 2.2, y: H.y - Math.sin(H.a) * i * 2.2, z }); ST.trail.push({ x: H.x, y: H.y, z: H.z }); }   /* plan-40: đầu đổi chỗ dưới mặt → thân nằm THẲNG sau đầu (trồi lên theo đường thẳng, không búi vòng) */
function inArena(ctx, x, y, f = 1) { const c = C0(ctx), r = RR(ctx), k = Math.hypot((x - c.x) / (r.x + 70), (y - c.y) / (r.y + 60)) / f; return k > 1 ? { x: c.x + (x - c.x) / k, y: c.y + (y - c.y) / k } : { x, y }; }
function zTo(dt, z, rate = 60) { const H = ST.H; H.z += Math.sign(z - H.z) * Math.min(Math.abs(z - H.z), rate * dt); }
/* điểm trúng đòn = đầu / đốt NỔI (z > −2) gần người chơi nhất */
function hitPoint(ctx) {
  const p = ctx.S.player, H = ST.H; let best = null, bd = 1e9;
  const pts = [H, ...ST.body]; for (const q of pts) { if (!q || q.z < -2) continue; const d = Math.hypot(q.x - p.x, q.y - p.y); if (d < bd) { bd = d; best = q; } }
  return best;
}
const submerged = () => !ST.H || (ST.H.z < -2 && ST.body.every(q => q.z < -2));

/* ---------------- đạn: Vảy Trăng (boomerang) ---------------- */
function spawnMoon(ctx, segI, tx, ty, o = {}) {
  const s0 = segI >= 0 ? ST.body[segI] : ST.H; if (!s0) return; const a = Math.atan2(ty - s0.y, tx - s0.x), L0 = Math.min(190, Math.hypot(tx - s0.x, ty - s0.y) + 40);
  ST.shots.push({ id: ST.nid++, kind: 'moon', segI, x0: s0.x, y0: s0.y, a, L: L0, t: -(o.warn ?? 0.8), out: o.out || 0.9, back: o.back || 0.9, side: o.side || 1, x: s0.x, y: s0.y, rot: 0, hitP: 0, hitR: 0 });
}
function moonPos(ctx, s) {
  if (s.t <= 0) return { x: s.x0, y: s.y0 };
  if (s.t < s.out) { const u = 1 - (1 - s.t / s.out) * (1 - s.t / s.out), bend = 0; return { x: s.x0 + Math.cos(s.a) * s.L * u - Math.sin(s.a) * bend, y: s.y0 + Math.sin(s.a) * s.L * u + Math.cos(s.a) * bend }; }
  const u = ease((s.t - s.out) / s.back), ox = s.x0 + Math.cos(s.a) * s.L, oy = s.y0 + Math.sin(s.a) * s.L, home = s.segI >= 0 && ST.body[s.segI] ? ST.body[s.segI] : ST.H || { x: s.x0, y: s.y0 }, bend = Math.sin(u * Math.PI) * 26 * s.side;
  return { x: ox + (home.x - ox) * u + Math.sin(s.a) * bend, y: oy + (home.y - oy) * u - Math.cos(s.a) * bend };
}
function shotsTick(ctx, dt) {
  const p = ctx.S.player;
  for (const s of ST.shots) {
    s.t += dt; if (s.kind !== 'moon') continue; if (s.t <= 0) continue; const q = moonPos(ctx, s), vx = (q.x - s.x) / Math.max(1e-3, dt), vy = (q.y - s.y) / Math.max(1e-3, dt), sp = Math.hypot(vx, vy); if (Math.hypot(q.x - s.x, q.y - s.y) > 0.3) s.va = Math.atan2(q.y - s.y, q.x - s.x); s.x = q.x; s.y = q.y; if (sp > 20) threat(ctx, { id: 'bk_moon' + s.id, kind: 'projectile', from: { x: s.x, y: s.y }, to: { x: s.x + vx / sp * 70, y: s.y + vy / sp * 70 }, speed: sp, width: 8 });   /* Nọc Lôi: đạn bay (mỗi khung) */
    const back = s.t >= s.out; if (back && !s.counted) { s.counted = true; ST.stats.moonBack++; }
    if (Math.hypot(p.x - s.x, p.y - 6 - s.y) < 10 && ST.t - s.hitP > 0.5 && hurtPlayer(ctx, DMG.moon, { x: s.x, y: s.y }, 'stagger', 0.9, 'moon')) { s.hitP = ST.t; if (!back) ST.stats.moonOut++; }
    const rp = rkPos(ctx); if (rp && Math.hypot(rp.x - s.x, rp.y - 6 - s.y) < 10 && ST.t - s.hitR > 0.6) { s.hitR = ST.t; hurtRocky(ctx, DMG.moon, s, 36); } if (ST.t - (s.hitL ?? -99) > 0.6 && ltHitAt(ctx, q => Math.hypot(q.x - s.x, q.y - 6 - s.y) < 10, DMG.moon, s, 'hit')) s.hitL = ST.t;
  }
  for (const s of ST.shots) if (!(s.t < s.out + s.back)) threatOff(ctx, 'bk_moon' + s.id); ST.shots = ST.shots.filter(s => s.t < s.out + s.back);
}

/* ---------------- tạo trùm ---------------- */
const INTRO = 3.0;
function cfgP1(ctx, hp) {
  return { key: 'bakunawa', vi: STR.vi.name, en: STR.en.name, hp, dmg: 12, armor: 0, sp: 100, xp: 0, w: 24, h: 24, c: ['#2a6a7a', '#9adfe0', '#ffffff'], bkBoss: true, noXpTag: true, fly: true, chaseBoss: true,
    aiFn: (c2, mo, dt, p, dp, canHit) => { bossAi(c2, mo, dt, p, dp, canHit); if (ST.H && !ST.ult && ST.body.length) chainFix(); },   /* plan-40: đầu vừa đi → nối cổ ngay trong khung */ drawFn: () => {}, onDown: mo => dieCenti(ctx, mo), tip: { vi: STR.vi.hint, en: STR.en.hint } };
}
function spawnBoss(ctx) {
  const c = C0(ctx), hp = bossHp(ctx, ONE_K), t = L(ctx);
  const mo = ctx.monsters.add(cfgP1(ctx, hp), c.x, c.y + 40); Object.assign(mo, { phase: 1, angry: true, warned: true, intro: INTRO, stunT: 0 });
  ST.boss = mo; ST.startT = ST.t; headInit(ctx, c.x - 230, c.y + 120, -0.4, -30);
  callout(ctx, t.intro, 1.8); ctx.sfx('whoosh_big'); log('spawn hp ' + hp); beginChase(ctx);
  return mo;
}
function skipIntro(ctx) { const mo = ST.boss; if (!mo || !(mo.intro > 0)) return; mo.intro = 0.001; log('intro skip'); }
function introTick(ctx, mo, dt) {   /* trồi khỏi biển mây, lượn 1 vòng quanh đài */
  const it = INTRO - mo.intro, c = C0(ctx), r = RR(ctx), a = -2.2 + it * 1.25;
  steer(ctx, dt, c.x + Math.cos(a) * (r.x + 20), c.y + Math.sin(a) * (r.y + 18), 150, 4); zTo(dt, it > 0.5 ? 2 : -30, 70);
  if (it > 1.5 && !ST.introRise) { ST.introRise = true; callout(ctx, L(ctx).rise, 2); ctx.sfx('roar_big'); if (ctx.quake) ctx.quake(0.25); ST.H.open = 0.8; }
}

/* ---------------- thù hận (như các trùm trước) ---------------- */
function tgPos(ctx, w) { if (w === 'r') { if (rkAway(ctx) || dark()) return null; return rkPos(ctx); } return ctx.S.player; }
function aggroTick(ctx, mo, dt) {
  const p = ctx.S.player, gone = rkAway(ctx) || dark(), H = ST.H; ST.tgtT += dt; ST.tgtLog[ST.tgt] = (ST.tgtLog[ST.tgt] || 0) + dt;
  if (dist(H, p) < 50) { ST.nearT += dt; if (ST.nearT > 2) ST.agP += AG.near * dt; } else ST.nearT = 0;
  if (ST.tgt === 'r' && !gone) { ST.restT -= dt; if (ST.restT <= 0) { ST.agP = Math.max(ST.agP, AG.burst); ST.restT = 99; } }
  ST.agP = Math.max(0, ST.agP - AG.decay * dt * (ST.tgt === 'p' ? 1 : 0.6));
  let want = ST.tgt;
  if (gone) want = 'p'; else if (ST.tgt === 'r' && ST.agP > AG.rk) want = 'p'; else if (ST.tgt === 'p' && ST.agP < AG.back && ST.tgtT >= AG.hold) want = 'r';
  if (want !== ST.tgt && (ST.tgtT >= AG.gap || gone)) { ST.tgt = want; ST.tgtT = 0; if (want === 'p') ST.agP = Math.max(ST.agP, AG.burst); else ST.restT = AG.restless[0] + Math.random() * (AG.restless[1] - AG.restless[0]); log('aim ' + want); }
}
function pickSkill(table, cds, ok) {
  const last2 = ST.picks.slice(-2), ban = last2.length === 2 && last2[0] === last2[1] ? last2[0] : null;
  const rec = k => (ST.picks.slice(-2).includes(k) ? 0.6 : 1) * (1 + Math.min(1, (ST.t - ((ST.lastUse || {})[k] ?? (ST.t - 15))) / 30)), list = Object.keys(table).filter(k => cds[k] <= 0 && k !== ban && ok(k)).sort((a, b) => table[b].pri * rec(b) - table[a].pri * rec(a));   /* plan-40: vừa dùng → hạ ưu tiên ×0,6; lâu chưa dùng → tăng dần tới ×2 sau 30 s (đổi món, Sét Bão / Đớp không bị bỏ đói) */
  return list[0] || null;
}
function used(k) { ST.lastSkillT = ST.t; (ST.lastUse ||= {})[k] = ST.t; ST.picks.push(k); if (ST.picks.length > 6) ST.picks.shift(); ST.seq.push(k); ST.stats.skills[k] = (ST.stats.skills[k] || 0) + 1; log('skill ' + k); }
/* kiếm người chơi trúng (monsters.strike không qua ctx.monsters.damage) → bắt qua lastHitT */
function seenHit(ctx) {
  const lh = ctx.monsters.lastHitT ? ctx.monsters.lastHitT() : -99; if (lh === ST.lastHitSeen) return; const first = ST.lastHitSeen == null; ST.lastHitSeen = lh; if (first || lh <= 0) return;
  const mo = boss(); if (!mo || (mo.intro > 0)) return; ST.agP += AG.hit; ST.recent.push(ST.t); ST.hitN = (ST.hitN || 0) + 1;
  const p = ctx.S.player;
  if (ST.ult && ST.ult.ph === 'coil') { const G = myGlow(ctx); if (G && dist(glowPos(ctx, G), p) < 30) glowHit(ctx, G, 1, 'p'); return; }
  if (ST.crack) { let best = null, bd = 34; for (const c of ST.crack.segs) { if (c.dead) continue; const q = crackPos(c); if (q && dist(q, p) < bd) { bd = dist(q, p); best = c; } } if (best) crackHit(ctx, best, 1, 'p'); }
  if (mo === ST.boss && !(mo.stunT > 0) && ST.gapT > 0) { const h0 = ctx.hero, per0 = h0 ? h0.atk + h0.weaponBonus(h0.swordTier) : 10, ex = Math.round(per0 * (PACE.gapMul - 1)); mo.hp = Math.max(ST.ultAt.length ? 1 : -99, mo.hp - ex); ST.stats.gapHits = (ST.stats.gapHits || 0) + 1; if (mo.hp <= 0) ctx.monsters.kill(mo); }   /* plan-40: chém trong khoảng hở ×1,2 */
  if (mo === ST.boss && mo.stunT > 0) { const h = ctx.hero, per = h ? h.atk + h.weaponBonus(h.swordTier) : 10, onG = false, gp = null, extra = Math.round(per * ((onG ? GLOW_MUL : STUN_MUL) - 1)); mo.hp -= extra; ST.stats.stunHits++; if (onG) { ST.stats.glowHits++; fx('td_spark', gp.x, gp.y - 10); } if (mo.hp <= 0 && !ST.ultAt.length) ctx.monsters.kill(mo); }
}

/* ---------------- AI pha 1 ---------------- */
function bossAi(ctx, mo, dt, p, dp, canHit0) { if (ST.drive) return;
  const canHit = !(ctx.hero && ctx.hero.fainted) && !ST.tcine && !(ctx.chase && ctx.chase.cineOn()) && !(ctx.alt && ctx.alt.hidden());   /* trốn trong tầng mây: rết mất dấu */ void canHit0;
  mo.kb = null; mo.angry = true; mo.warned = true; const H = ST.H; if (!H) return;
  seenHit(ctx);
  if (mo.intro > 0) { mo.intro -= dt; introTick(ctx, mo, dt); if (mo.intro <= 0) { const k = mo.hp / mo.max, nh = bossHp(ctx, ONE_K); mo.max = nh; mo.hp = Math.max(1, Math.round(nh * k)); ST.introDone = true; log('fight hp ' + nh); } return; }
  if (ST.ult) { mo.hp = Math.max(mo.hp, ST.ult.hp0); return; }
  if (mo.phase === 1 && mo.hp <= mo.max * 0.5) { mo.phase = 2; enrage(ctx, mo); if (!ST.hold) { ST.forceQ = ['dash', 'breath']; ST.chainN = 0; } }   /* plan-40: gầm xong → mở đợt bằng Lao Sét + Phun Nọc Sét (dấu hiệu nổi giận) */
  const slow = dark() ? 0.75 : 1; for (const k in ST.cd) if (ST.cd[k] > 0) ST.cd[k] -= dt * slow * (mo.phase === 2 && k !== 'eclipse' ? 1.15 : 1);
  if (mo.stunT > 0 || ST.stuck) { mo.stunT -= dt; if (ST.stuck) trapTick(ctx, mo, dt); else if (H.z < -2) { steer(ctx, dt, H.x + Math.cos(H.a) * 60, H.y + Math.sin(H.a) * 60, 70, 0); zTo(dt, Math.max(0, BZ(ctx) - 4), 60); trailPush(); } else { zTo(dt, Math.max(0, BZ(ctx) - 4), 40); H.sp = 0; } return; }   /* plan-40: choáng khi còn dưới mặt → trồi thẳng */   /* 2026-10-15: kẹt đầu trong hố = choáng có hình riêng */
  if (ST.ecl && (ST.ecl.ph === 'rise' || ST.ecl.ph === 'eat' || ST.ecl.ph === 'fall' || ST.ecl.ph === 'spit')) return;   /* eclTick điều khiển */
  if (!ST.hold) aggroTick(ctx, mo, dt);
  const tp = tgPos(ctx, ST.tgt) || p, d = dist(H, tp), frac = mo.hp / mo.max;
  /* người núp cạnh THÂN SAU (xa đầu) bao lâu → Quật Đuôi */
  const nb = nearBody(ctx, p); if (nb && nb.d < 46 && dist(H, p) > 44) ST.tailT += dt; else ST.tailT = Math.max(0, ST.tailT - dt * 1.5);   /* người núp cạnh THÂN (xa đầu) → Quật Đuôi (2026-10-14: ra thường hơn — 0,6 s núp là quật) */
  if (ST.act) return actTick(ctx, mo, ST.act, dt, p);
  if (ST.tcine) return;   /* đang đổi tầng theo người: tcineTick lái đầu, chưa đánh */
  if (ST.rage && ST.rage.t < 1.5) { ST.rage.t += dt; H.open = 1; ST.rear = Math.min(1, (ST.rear || 0) + dt * 3); return; }   /* cảnh nổi giận: dựng thân, gầm */
  if (ST.grab || ST.cons) return;
  if (ST.carryAt.length && frac <= ST.carryAt[0] && canGrab(ctx)) { ST.carryAt.shift(); used('grab'); ST.gapPend = true; ST.chainN = 0; return void startGrab(ctx, true); }   /* mốc máu → NGOẠM THA sang vùng đất khác */
  if (ST.ultAt.length && frac <= ST.ultAt[0] && !ST.ecl) { const at = ST.ultAt.shift(); used('ult'); ST.gapPend = true; ST.chainN = 0; return startCons(ctx, mo, at); }   /* 2026-10-14 anh: Vòng Siết → SIẾT KÉO HẤT */
  if (ST.gapPend) { ST.gapPend = false; const G = ST.gapFinal ? [PACE.finalGap, PACE.finalGap] : mo.phase === 2 ? PACE.gap2 : PACE.gap; ST.gapT = G[0] + Math.random() * (G[1] - G[0]); ST.gapFinal = false; ST.lastSkillT = ST.t; ST.stats.gaps = (ST.stats.gaps || 0) + 1; }   /* plan-40: hết đợt → KHOẢNG HỞ */
  if (!ST.final && frac <= PACE.finalAt && !ST.ecl && !ST.ultAt.length) { ST.final = 1; ST.forceQ = ['bolts', 'mach', 'mach']; ST.gapT = 0; callout(ctx, L(ctx).finalCall, 2.2); log('FINAL'); }   /* ≤ 20 %: gồng cuối */
  coilWatch(ctx, dt);
  const fa = Math.abs(angDiff(Math.atan2(tp.y - H.y, tp.x - H.x), H.a));
  const dP = dist(H, p), fP = Math.abs(angDiff(Math.atan2(p.y - H.y, p.x - H.x), H.a)), oBite = canHit && dP < 110 && fP < 1.2, oSlam = canHit && dP < 100 && fP < 1.2, oDash = canHit && mo.phase === 2 && dP < 170 && fP < 1.6;   /* plan-40: người chơi ngay trước / cạnh đầu */   /* plan-40: góc người so với hướng đầu */
  const okSk = s => s === 'grab' ? false /* plan-40: bỏ Ngoạm Tha ngẫu nhiên — chỉ theo mốc máu 80 / 52 / 22 % */ : s === 'slam' ? ((d < 100 && fa < 1.2) || oSlam) && !ST.cons : s === 'eclipse' ? !ST.ecl : s === 'mach' ? true : s === 'moon' ? d > 40 : s === 'bolts' ? true : s === 'tail' ? ST.tailT > 0.6 : s === 'bite' ? (d < 110 && fa < 1.2) || oBite : s === 'terrain' ? !!(ST.tPick = (!inBk(ctx) && ctx.terrain) ? ctx.terrain.pick(TAD(ctx)) : null) : s === 'dash' ? (mo.phase === 2 && d < 170 && fa < 1.6) || oDash : s === 'breath' ? mo.phase === 2 && ((d < 90 && fa < 1.2) || (oBite && fP < 1.2)) : false; const T1 = (d < 80 && fa < 1.2) || oBite ? { ...SK1, bite: { cd: SK1.bite.cd, pri: 74 }, breath: { cd: SK1.breath.cd, pri: 80 }, ...(oDash ? { dash: { cd: SK1.dash.cd, pri: 78 } } : {}) } : oDash ? { ...SK1, dash: { cd: SK1.dash.cd, pri: 78 } } : SK1;   /* nổi giận: Lao Sét khi người ở trước mặt */   /* plan-40: quét sát mặt người → Đớp / Phun Nọc */
  { const cbOk = ST.combo && SK1[ST.combo] && (ST.cd[ST.combo] || 0) <= 0 && okSk(ST.combo);   /* 2026-10-16: Ý ĐỊNH chiêu cận chiến — mỗi lượt xét 1 lần, ~lead s trước lượt (meleeIntent: chiêu đầu đợt xen kẽ, Kìm Cắn ↔ Cắn Đập) → kế hoạch 'hook' (roam vòng đầu lại) hoặc 'amb' (lặn phục kích) */
    if (!canHit || ST.hold || ST.cons || ST.grab || (ST.forceQ && ST.forceQ.length) || cbOk) ST.mDue = null;
    else if (!ST.mDue && ST.mSlot !== ST.seq.length && (ST.gapT || 0) < MELEE.lead && (ST.gcd || 0) < MELEE.lead) { ST.mSlot = ST.seq.length; ST.mWait = 0; ST.mAmb = false; ST.mDue = meleeIntent(ctx, p, tp); if (ST.mDue) { const qd = dist(H, tp), qf = Math.abs(angDiff(Math.atan2(tp.y - H.y, tp.x - H.x), H.a)); ST.mPlan = (qf > 1.6 && qd < 200) || (qf > 1.2 && (ST.turn || 0) > 150) ? 'amb' : 'hook'; log('intent ' + ST.mDue + ' ' + ST.mPlan); } } }   /* người SAU đầu / thân đang cong → lặn phục kích luôn (không quay chữ U quanh người) */
  roam(ctx, dt, tp, mo.phase === 2 ? 135 : 108);
  if (!canHit || ST.hold) return;
  if (ST.gapT > 0) { ST.gapT -= dt; return; }
  if (ST.gcd > 0) { ST.gcd -= dt; return; }
  if (ST.forceQ && ST.forceQ.length && (ST.forceQ[0] === 'dash' || ST.forceQ[0] === 'breath')) { const f0 = Math.abs(angDiff(Math.atan2(p.y - H.y, p.x - H.x), H.a)); if (f0 > 1.5 && (ST.waitT || 0) >= 2.5) { ST.forceQ.shift(); ST.waitT = 0; if (!ST.forceQ.length) ST.gapPend = true; return; } if (f0 > 1.5) { if (!ST.waitT) { const ux = p.x - H.x, uy = p.y - H.y, ul = Math.hypot(ux, uy) || 1; ST.mv = { k: 'pass', x: p.x + ux / ul * 150, y: p.y + uy / ul * 150, t: 0, T: 2.6, ph: 0 }; } ST.waitT = (ST.waitT || 0) + dt; return; } ST.waitT = 0; }   /* đòn lao / phun: quay đầu về phía người trước (không vặn cổ 180°) */
  if (ST.forceQ && ST.forceQ.length) { const fk = ST.forceQ.shift(); used(fk); ST.cd[fk] = SK1[fk].cd; if (!ST.forceQ.length) { ST.gapPend = true; ST.gapFinal = !!ST.final; } else ST.gcd = 0.5; if (fk === 'mach') return startMach(ctx, mo, tp); if (fk === 'bolts') return startBolts(ctx, mo); if (fk === 'dash') return startDash(ctx, p, dist(H, p)); if (fk === 'breath') return startBreath(ctx, p); }
  const cb = ST.combo && SK1[ST.combo] && (ST.cd[ST.combo] || 0) <= 0 && okSk(ST.combo) ? ST.combo : null; let mk = null;
  if (!cb && ST.mDue) { mk = meleeNow(p, tp); if (!mk) { ST.mWait = (ST.mWait || 0) + dt;
    { const qd = dist(H, tp), qf = Math.abs(angDiff(Math.atan2(tp.y - H.y, tp.x - H.x), H.a)); if (ST.mPlan === 'amb' && (ST.cd.sub || 0) > 0) ST.mPlan = 'hook'; if (!ST.mAmb && (ST.cd.sub || 0) <= 0 && (ST.mPlan === 'amb' || (ST.mWait >= MELEE.amb0 && (ST.mWait >= MELEE.amb1 || qf >= 0.9 || qd > 220)))) { ST.mAmb = true; ST.mWait = 0; ST.cd.sub = 6; ST.stats.amb = (ST.stats.amb || 0) + 1; ST.act = { k: 'sub', ph: 'down', t: 0, amb: true }; log('ambush ' + ST.mDue + ' d' + Math.round(qd) + ' f' + qf.toFixed(1)); return; } }   /* 2026-10-16: vòng đầu không tới → LẶN PHỤC KÍCH (trồi trước mặt người) */
    if (ST.mWait < MELEE.wait) return; ST.mWait = 0; ST.mSkipT = ST.t + MELEE.skip; ST.mNext = ST.mDue === 'bite' ? 'slam' : 'bite'; ST.mDue = null; ST.stats.hookMiss = (ST.stats.hookMiss || 0) + 1; log('hook miss'); } else { ST.stats.hookHit = (ST.stats.hookHit || 0) + 1; log('hook ' + mk + ' ' + ST.mWait.toFixed(1)); ST.mWait = 0; } }   /* 2026-10-16: có ý định cận chiến → giữ lượt (đầu đang vòng lại / lặn phục kích) tới khi người vào nón trước mặt */
  let k = mk || cb || pickSkill(T1, ST.cd, okSk);   /* plan-40: ưu tiên chiêu nối */
  if (k && (ST.chainN || 0) === 0) { if (k === 'bite' || k === 'slam') { ST.mTurn = false; ST.mNext = k === 'bite' ? 'slam' : 'bite'; } else ST.mTurn = true; }   /* 2026-10-16: đợt mở bằng đòn cận chiến → đợt sau mở bình thường → đợt sau nữa lại cận chiến (Kìm Cắn ↔ Cắn Đập luân phiên); hụt thì đợt sau thử lại */
  ST.waitT = 0; ST.combo = null; if (k) ST.mDue = null;
  if (k) {
    used(k); ST.cd[k] = SK1[k].cd; ST.chainN = (ST.chainN || 0) + 1; if (ST.chainN >= (ST.chainLen || 3)) { ST.chainN = 0; ST.chainLen = PACE.chain[Math.random() < 0.6 ? 0 : 1]; ST.gapPend = true; } else { ST.gcd = PACE.gcd[0] + Math.random() * (PACE.gcd[1] - PACE.gcd[0]); ST.combo = COMBO[k] || null; }   /* plan-40: đợt 2–3 chiêu rồi hở */
    if (k === 'grab') return void startGrab(ctx, false);
    if (k === 'slam') return startSlam(ctx, (d < (mk ? MELEE.rSlam : 100) && fa < 1.2) ? tp : p);
    if (k === 'mach') return startMach(ctx, mo, tp);
    if (k === 'moon') return startMoon(ctx, mo, tp);
    if (k === 'bolts') return startBolts(ctx, mo);
    if (k === 'tail') return startTail(ctx, mo);
    if (k === 'bite') return startBite(ctx, mo, (d < (mk ? MELEE.rBite : 110) && fa < 1.2) ? tp : p);
    if (k === 'dash') return (d < 170 && fa < 1.6) ? startDash(ctx, tp, d) : startDash(ctx, p, dP);
    if (k === 'terrain') return startTerrain(ctx);
    if (k === 'breath') return startBreath(ctx, (d < 90 && fa < 1.2) ? tp : p);
  }
}
/* NỔI GIẬN (< 50 %): không đổi hình — gầm dựng thân, mắt loé (cộng sáng ngắn), giáp nứt sáng; nhanh hơn + thêm Lao Sét / Phun Nọc Sét */
/* GÓI ĐỊA HÌNH (terrain.js): adapter cho trùm này */
function TAD(ctx) { return ST.tad || (ST.tad = { name: 'bakunawa', head: () => ST.H, body: () => ST.body, hurtP: (f, src, react, pw, key) => hurtPlayer(ctx, f, src, react, pw, key), hurtR: (f, src, kb, kind) => hurtRocky(ctx, f, src, kb, kind),
  stun: sec => { const b = ST.boss; if (b) { b.stunT = Math.max(b.stunT || 0, sec); ST.act = null; } }, dmg: f => { const b = boss(); if (b) { const fl = ST.ultAt.length ? Math.round(b.max * ST.ultAt[0] * 0.97) : 1; b.hp = Math.max(fl, b.hp - Math.round(b.max * f)); } }, hitN: () => ST.hitN || 0, banner: txt => callout(ctx, txt, 1.6),
  boltFx: (x, y) => { let n = (Math.random() * 4) | 0; if (n === ST.boltLast) n = (n + 1) % 4; ST.boltLast = n; if (ctx.air && ctx.air.flash) ctx.air.flash(); return fx('td_sky' + n, x, y, { top: true, t0: 0.2, glowT: 0.35 }) || fx('dr_bolt', x, y, { top: true }); } }); }   /* sét CHÓI của Sét Bão (Trống Đồng: lõi rộng, nhánh, loé chạm) — bỏ 0,2 s tia dẫn mảnh */
function startTerrain(ctx) { const nm = ST.tPick; if (!nm || !ctx.terrain || !ctx.terrain.start(nm, TAD(ctx))) return; ST.act = { k: 'terrain', t: 0, nm }; ST.seq[ST.seq.length - 1] = 't_' + nm; ST.stats.skills['t_' + nm] = (ST.stats.skills['t_' + nm] || 0) + 1; log('terrain ' + nm); }
function enrage(ctx, mo) { ST.rage = { t: 0 }; ST.act = null; ST.tele = []; ctx.sfx('roar_big'); if (ST.H) fx('bk_roarwave', ST.H.x, ST.H.y + 30, { top: true }); if (ctx.quake) ctx.quake(0.3); callout(ctx, L(ctx).rage, 2.2); ST.flare = 1.2;
  if (ctx.chase && ST.H) ctx.chase.cine('tier', { x: ST.H.x, y: ST.H.y, hitAt: 0.9, dur: 1.5, from: 'above', ground: lowTier(ctx), name: L(ctx).rage }); log('ENRAGE'); ST.stats.rage = 1; }
/* Ki (ki.js): khai báo đòn CÓ BÁO TRƯỚC để người chơi tự nhào lộn né — điểm so của Ki = (p.x, p.y − 6) */
function threat(ctx, o) { if (ctx.threat && ctx.threat.add) { try { return ctx.threat.add(o); } catch (e) { /* bỏ qua */ } } return null; }
function threatOff(ctx, id) { if (ctx.threat && ctx.threat.remove) { try { ctx.threat.remove(id); } catch (e) { /* bỏ qua */ } } }
function startDash(ctx, tp, d) { const H = ST.H, a = H.a + Math.max(-1, Math.min(1, angDiff(Math.atan2(tp.y - H.y, tp.x - H.x), H.a))), len = Math.min(200, d + 30);   /* plan-40: lệch ≤ 1 rad */ ST.act = { k: 'dash', t: 0, T: 0.55, a, left: len }; threat(ctx, { id: 'bk_dash', kind: 'lunge', from: { x: H.x, y: H.y }, to: { x: H.x + Math.cos(a) * len, y: H.y + Math.sin(a) * len }, in: 0.55, dur: len / 380, width: 22 });   /* Lao Sét: trúng khi |(p.x, p.y−6) − đầu| < 17 */ ST.tele.push({ type: 'l', x: H.x, y: H.y, a, len, w: 8, t: 0.55, T0: 0.55, col: '#a8c8ff' }); callout(ctx, L(ctx).dash); ctx.sfx('spar_charge'); }
function startBreath(ctx, tp) { const H = ST.H, a = H.a + Math.max(-0.8, Math.min(0.8, angDiff(Math.atan2(tp.y - H.y, tp.x - H.x), H.a)));   /* plan-40: lệch ≤ 0,8 rad */ ST.act = { k: 'breath', t: 0, T: 0.8, a }; threat(ctx, { id: 'bk_breath', kind: 'beam', from: { x: H.x, y: H.y - 6 }, to: { x: H.x + Math.cos(a) * 74, y: H.y - 6 + Math.sin(a) * 74 }, in: 0.8, dur: 0.35, width: 60 }); ST.tele.push({ type: 'cone', x: H.x, y: H.y, a, r: 74, w: 1.0, t: 0.8, T0: 0.8, col: '#a8c8ff' }); callout(ctx, L(ctx).breath); ctx.sfx('spar_charge'); }
function rageAct(ctx, A, H, p, dt) {
  if (A.k === 'dash') { if (A.t < A.T) { H.a += angDiff(A.a, H.a) * Math.min(1, dt * 10); H.open = 1; return; } const s2 = Math.min(A.left, 380 * dt); A.left -= s2; H.x += Math.cos(A.a) * s2; H.y += Math.sin(A.a) * s2; H.a = A.a; H.open = 1; trailPush();
    if ((A.fxT = (A.fxT || 0) - dt) <= 0) { A.fxT = 0.14; const bx = H.x - Math.cos(H.a) * 14, by = H.y - Math.sin(H.a) * 14; if (Math.hypot(bx - p.x, by - p.y) > 24) fx('td_spark', bx, by - 6); }   /* tia lửa ÍT, sau đầu, không chụm lên người */ pathImpact(ctx, A, H, 14, 3);
    if (!A.hitP && Math.hypot(p.x - H.x, p.y - 6 - H.y) < 17) A.hitP = hurtPlayer(ctx, DMG.dash, H, 'fly', 1.1, 'dash'); const rp = rkPos(ctx); if (!A.hitR && rp && Math.hypot(rp.x - H.x, rp.y - 6 - H.y) < 17) A.hitR = hurtRocky(ctx, DMG.dash, H, 62, 'fly'); if (!A.hitL && ltHitAt(ctx, q => Math.hypot(q.x - H.x, q.y - 6 - H.y) < 17, DMG.dash, H, 'fly')) A.hitL = true;
    if (A.left <= 0) ST.act = null; return; }
  if (A.k === 'breath') { H.open = 1; if (A.t < A.T) H.a += angDiff(A.a, H.a) * Math.min(1, dt * 8); if (!A.hit && A.t >= A.T) { A.hit = true; ctx.sfx('smash'); const inCone = e => e && Math.hypot(e.x - H.x, e.y - H.y) < 74 && Math.abs(angDiff(Math.atan2(e.y - H.y, e.x - H.x), A.a)) < 0.5;
      for (let i = 1; i <= 4; i++) { const bx = H.x + Math.cos(A.a) * i * 16, by = H.y + Math.sin(A.a) * i * 16; fx('dr_bolt', bx, by, { top: true }); if (ctx.chase) ctx.chase.impact(bx, by, 12, { pw: 2, src: H }); } if (inCone(p)) hurtPlayer(ctx, DMG.breath, H, 'stagger', 1, 'breath'); if (inCone(rkPos(ctx))) hurtRocky(ctx, DMG.breath, H, 45); ltHitAt(ctx, inCone, DMG.breath, H, 'hit'); }
    if (A.t >= A.T + 0.35) ST.act = null; }
}
function roam(ctx, dt, tp, sp) {   /* plan-40 (anh 2026-10-15 'rết cuộn tròn quá nhiều'): BỎ lượn quỹ đạo quanh người (đầu đuổi điểm chạy nhanh hơn mình → xoắn ốc) → QUÉT CHỮ S lướt qua người / BÒ VÀNH sân / DUỖI khi thân cuộn */
  const H = ST.H; let M = ST.mv;
  const hk = !!ST.mDue && ST.mPlan !== 'amb' && (ST.gapT || 0) < MELEE.lead && (ST.gcd || 0) < MELEE.lead;   /* 2026-10-16: có ý định cận chiến (kế hoạch 'hook') → VÒNG ĐẦU LẠI: đích = điểm ngay sau lưng người theo hướng đầu→người (cập nhật 0,25 s) — đầu rẽ theo đường cong rộng (bán kính ~MOVE.rad, bộ chống cuộn vẫn bật) rồi chĩa thẳng vào người */
  if (hk && (!M || (M.k !== 'hook' && M.k !== 'uncoil'))) { M = ST.mv = { k: 'hook', x: tp.x, y: tp.y, t: 0, T: MELEE.wait + MELEE.lead + 0.5, ph: 0, re: 0 }; ST.stats.mvHook = (ST.stats.mvHook || 0) + 1; }
  else if (!hk && M && M.k === 'hook') M = ST.mv = pickMove(ctx, tp);
  if (M && M.k === 'hook' && (M.re -= dt) <= 0) { M.re = 0.25; const ux = tp.x - H.x, uy = tp.y - H.y, ul = Math.hypot(ux, uy) || 1; M.x = tp.x + ux / ul * MELEE.aim; M.y = tp.y + uy / ul * MELEE.aim; }
  const dm = M ? Math.hypot(M.x - H.x, M.y - H.y) : 0; if (!M || M.t > M.T || (M.k !== 'hook' && (dm < 26 || (dm < 90 && Math.abs(angDiff(Math.atan2(M.y - H.y, M.x - H.x), H.a)) > 1.7)))) M = ST.mv = pickMove(ctx, tp);   /* tới nơi / đích đã ở sau lưng → đi tiếp đích mới (không quay vòng quanh đích) */
  M.t += dt; const w = M.k === 'uncoil' || M.k === 'hook' ? 0 : Math.sin(M.t * 2.4 + M.ph) * 14, nx = -Math.sin(H.a), ny = Math.cos(H.a);   /* uốn nhẹ 2 bên đường đi → thân chữ S */
  const spd = sp * (ST.crack ? 0.55 : ST.gapT > 0 ? 0.72 : 1);   /* plan-40: lộ giáp → bò chậm cho người / Rocky chém khớp */ let tx = M.x + nx * w, ty = M.y + ny * w, sp2 = spd;
  if (M.k === 'hook') { const dd = angDiff(Math.atan2(M.y - H.y, M.x - H.x), H.a); if (Math.abs(dd) > MELEE.side) { if (!M.side) { const c = C0(ctx), r = RR(ctx), kr = Math.hypot((H.x - c.x) / r.x, (H.y - c.y) / r.y), cd = angDiff(Math.atan2(c.y - H.y, c.x - H.x), H.a); M.side = kr > 0.7 ? (cd >= 0 ? 1 : -1) : (dd >= 0 ? 1 : -1); } const a2 = H.a + M.side * 1.5; tx = H.x + Math.cos(a2) * 80; ty = H.y + Math.sin(a2) * 80; } else M.side = 0; if (Math.abs(dd) > 0.9) sp2 = spd * MELEE.slowK; }   /* 2026-10-16 vòng đầu: người ngay sau lưng → CHỐT 1 phía rẽ (không lắc trái / phải), gần vành sân thì rẽ vào trong; đang ngoảnh lại thì chậm lại → vòng gắt hơn (bán kính ~41 px thay 55) để đầu chĩa được vào người cạnh thân */
  steer(ctx, dt, tx, ty, sp2, M.k === 'uncoil' ? 1.6 : spd / MOVE.rad); zTo(dt, BZ(ctx) - (ST.gapT > 0 ? 1 : 0), 50); H.open = Math.max(0, H.open - dt);
}
function meleeIntent(ctx, p, tp) {   /* 2026-10-16: chiêu ĐẦU của đợt (xen kẽ, ST.mTurn) = đòn cận chiến, Kìm Cắn ↔ Cắn Đập luân phiên (ST.mNext); người phải trong MELEE.reach px → 'bite' / 'slam' (roam vòng đầu lại) · null */
  if ((ST.chainN || 0) !== 0 || !ST.mTurn || (ST.mSkipT || 0) > ST.t) return null; if (!inBk(ctx) && ctx.terrain && (ST.cd.terrain || 0) <= 0 && ctx.terrain.pick(TAD(ctx))) return null;   /* vùng đất: có chiêu ĐỊA HÌNH dùng được thì nó mở đợt (đặc trưng vùng), đòn cận chiến chờ đợt sau */ const H = ST.H; if (Math.min(dist(H, tp), dist(H, p)) > MELEE.reach) return null;
  const sOk = (ST.cd.slam || 0) <= 0, bOk = (ST.cd.bite || 0) <= 0;
  return ST.mNext === 'slam' ? (sOk ? 'slam' : bOk ? 'bite' : null) : (bOk ? 'bite' : sOk ? 'slam' : null);
}
function meleeNow(p, tp) {   /* người (hoặc mục tiêu thù) đã ở NÓN TRƯỚC MẶT đầu (≤ MELEE.cone rad) và trong tầm → chiêu cận chiến ra ngay */
  const H = ST.H; let r = null;
  for (const q of tp === p ? [p] : [tp, p]) { if (!q) continue; const d = dist(H, q), f = Math.abs(angDiff(Math.atan2(q.y - H.y, q.x - H.x), H.a)); if (f > MELEE.cone) continue; if (ST.mDue === 'slam') { if (d < MELEE.rSlam) return 'slam'; continue; } if ((ST.cd.bite || 0) <= 0 && d < MELEE.rBite) r = r || 'bite'; }   /* đang chờ Cắn Đập → chỉ Cắn Đập (Kìm Cắn tầm xa hơn không cướp lượt) */
  return r;
}
function pickMove(ctx, tp) {
  { const rm = rimMove(ctx); if (rm) return rm; }   /* 2026-10-16: người gần mép → thỉnh thoảng bò dọc vành (phá dải viền) */
  const H = ST.H, c = C0(ctx), r = RR(ctx), low = lowTier(ctx);
  if (!low && Math.random() < MOVE.edgeP) { const a0 = Math.atan2((H.y - c.y) / r.y, (H.x - c.x) / r.x), dir = Math.random() < 0.5 ? 1 : -1, a = a0 + dir * (0.7 + Math.random() * 0.5); ST.stats.mvEdge = (ST.stats.mvEdge || 0) + 1; return { k: 'edge', x: c.x + Math.cos(a) * r.x * 0.8, y: c.y + Math.sin(a) * r.y * 0.8, t: 0, T: 3.5, ph: Math.random() * TAU }; }   /* bò dọc vành sân ~¼ vòng (đường cong lớn) */
  const base = Math.atan2(tp.y - H.y, tp.x - H.x); let best = null;
  for (let k = 0; k < 8; k++) { const a = base + (Math.random() * 2 - 1) * MOVE.spread, L0 = MOVE.passMin + Math.random() * (MOVE.passMax - MOVE.passMin), x = tp.x + Math.cos(a) * L0, y = tp.y + Math.sin(a) * L0 * 0.9, s = moveScore(ctx, H, x, y); if (!best || s > best.s) best = { x, y, s }; if (s >= 0.99) break; }   /* đích ở PHÍA BÊN KIA người chơi → lướt ngang qua cạnh người rồi đi tiếp */
  ST.stats.mvPass = (ST.stats.mvPass || 0) + 1; return { k: 'pass', x: best.x, y: best.y, t: 0, T: 4, ph: Math.random() * TAU };
}
function moveScore(ctx, H, x, y) {   /* 1 = đường thẳng thông + trong sân; thấp = vướng vách / ra ngoài */
  if (inBk(ctx)) { const c = C0(ctx), r = RR(ctx); return Math.hypot((x - c.x) / (r.x + 30), (y - c.y) / (r.y + 24)) > 1 ? 0.2 : 1; }
  if (!lowTier(ctx)) return 1; const m = ctx.S.map; if (!m) return 1; let ok = 0; const n = 12;
  for (let i = 1; i <= n; i++) { const px = H.x + (x - H.x) * i / n, py = H.y + (y - H.y) * i / n; if (px > 16 && py > 16 && px < m.w * TS - 16 && py < m.h * TS - 16 && !ctx.isSolid(m, Math.floor(px / TS), Math.floor(py / TS))) ok++; }
  return ok / n;
}
function castStand(ctx, dt, tp) {   /* plan-40: Sét Bão / Nọc Lôi — DỪNG, dựng đầu gồng gọi chiêu (trước: vừa bắn vừa lượn → xoắn ốc) */
  const H = ST.H, A = ST.act; H.sp = 0; if (A && A.a0 == null) A.a0 = H.a; const a0 = A ? A.a0 : H.a, w = a0 + Math.max(-0.6, Math.min(0.6, angDiff(Math.atan2(tp.y - H.y, tp.x - H.x), a0))); H.a += angDiff(w, H.a) * Math.min(1, dt * 3);   /* ngoảnh đầu ±0,6 rad, không vặn cổ */ zTo(dt, BZ(ctx) + 10, 60); H.open = 1;
}
function bodyTurn() {   /* tổng góc xoay dọc phần thân đang nổi (độ) */
  const B = ST.body, H = ST.H; if (!H || B.length < 3) return 0; let s = 0, pa = Math.atan2(H.y - B[0].y, H.x - B[0].x);
  for (let i = 1; i < B.length; i++) { if (B[i].z < -3) break; const a = Math.atan2(B[i - 1].y - B[i].y, B[i - 1].x - B[i].x); s += angDiff(a, pa); pa = a; }
  return Math.abs(s) * 180 / Math.PI;
}
function coilWatch(ctx, dt) {   /* plan-40 CHỐNG CUỘN: thân xoay > 270° quá 1 s (ngoài Siết / Tha) → duỗi: đi thẳng ra chỗ trống; cuộn quá nặng thì lặn duỗi */
  if ((ST.coilChk = (ST.coilChk || 0) - dt) <= 0) { ST.coilChk = 0.2; ST.turn = bodyTurn(); }
  if ((ST.turn || 0) > MOVE.coilDeg) ST.coilT = (ST.coilT || 0) + dt; else ST.coilT = 0;
  if (ST.postCons) { ST.postCons = false; ST.turn = bodyTurn(); if (ST.turn > 300) ST.coilT = MOVE.coilT; }   /* plan-40: vừa thoát Siết (hết choáng) mà thân còn quấn → duỗi / lặn NGAY, không chờ 1 s */
  if (ST.coilT < MOVE.coilT) return; ST.coilT = 0; const H = ST.H;
  if (ST.turn > 420 && (ST.cd.sub || 0) <= 0) { ST.cd.sub = 6; ST.stats.subs = (ST.stats.subs || 0) + 1; ST.act = { k: 'sub', ph: 'down', t: 0 }; log('uncoil sub'); return; }
  const c = C0(ctx), a = H.a; let x = H.x + Math.cos(a) * 170, y = H.y + Math.sin(a) * 170; if (moveScore(ctx, H, x, y) < 0.5) { x = c.x + (c.x - H.x) * 0.3; y = c.y + (c.y - H.y) * 0.3; }
  ST.mv = { k: 'uncoil', x, y, t: 0, T: 1.5, ph: 0 }; ST.stats.uncoils = (ST.stats.uncoils || 0) + 1; log('uncoil');
}
function subTick(ctx, A, H, p, dt) {   /* plan-40: LẶN NGẮN để duỗi thân (không gây sát thương): chìm ≤ 1 s → trồi chỗ khác xa người */
  if (A.ph === 'down') { steer(ctx, dt, H.x + Math.cos(H.a) * 60, H.y + Math.sin(H.a) * 60, 270, 0.8); zTo(dt, -34, 110);
    if ((H.z <= -30 && ST.body.every(q => q.z < -2)) || A.t > 1.4) { const tp = tgPos(ctx, ST.tgt) || p, R0 = A.amb ? MELEE.ambR : 165; let best = null;
      for (let k = 0; k < 8; k++) { const a = Math.random() * TAU, x = tp.x + Math.cos(a) * R0, y = tp.y + Math.sin(a) * R0 * 0.91, s = moveScore(ctx, { x: tp.x, y: tp.y }, x, y); if (!best || s > best.s) best = { x, y, s }; }
      H.x = best.x; H.y = best.y; H.a = Math.atan2(tp.y - H.y, tp.x - H.x) + (A.amb ? 0 : (Math.random() - 0.5) * 1.4); H.z = -34; trailLine(H, -34); A.ph = 'up'; A.t = 0; }   /* phục kích: trồi MẶT HƯỚNG VÀO NGƯỜI, gần hơn */
    return; }
  { const tq = A.amb ? (tgPos(ctx, ST.tgt) || p) : null; steer(ctx, dt, tq ? tq.x : H.x + Math.cos(H.a) * 60, tq ? tq.y : H.y + Math.sin(H.a) * 60, 125, 1.5); } zTo(dt, BZ(ctx), 110); trailPush();
  if ((A.fxT = (A.fxT || 0) - dt) <= 0) { A.fxT = 0.12; if (lowTier(ctx)) fx('knock_erupt', H.x, H.y + 4, { body: true }); else fx('bk_kick_cloud', H.x, H.y, { ground: true }); }
  if (A.t > (A.amb ? 0.5 : 1.0)) ST.act = null;
}
function startBite(ctx, mo, tp) { const H = ST.H, a = Math.atan2(tp.y - H.y, tp.x - H.x); ST.act = { k: 'bite', t: 0, T: 0.55, a, lim: Math.min(1.25, Math.max(0.8, Math.abs(angDiff(a, H.a)) + 0.15)) };   /* 2026-10-16: người hơi lệch (vòng đầu lại tới nơi) → ngoảnh tới ≤ 1,25 rad, không chỉ 0,8 */ { const L2 = Math.min(140, Math.hypot(tp.x - H.x, tp.y - H.y) + 14); threat(ctx, { id: 'bk_bite', kind: 'lunge', from: { x: H.x, y: H.y }, to: { x: H.x + Math.cos(a) * L2, y: H.y + Math.sin(a) * L2 }, in: 0.55, dur: L2 / 320, width: 22 }); } ST.tele.push({ type: 'l', x: H.x, y: H.y, a, len: 90, w: 7, t: 0.55, T0: 0.55, col: '#ffd070', follow: 'head' }); ctx.sfx('spar_charge'); }
function nearBody(ctx, p) { let b = null; for (let i = 3; i < ST.body.length; i++) { const q = ST.body[i]; if (q.z < -2) continue; const d = Math.hypot(q.x - p.x, q.y - p.y); if (!b || d < b.d) b = { d, q, i }; } return b; }
function startTail(ctx, mo) { const p = ctx.S.player, nb = nearBody(ctx, p), q0 = (nb && nb.q) || ST.body[SEG_N], q = { x: (q0.x + p.x) / 2, y: (q0.y + p.y) / 2 }; ST.act = { k: 'tail', t: 0, T: 0.7, x: q.x, y: q.y }; ST.tele.push({ type: 'c', x: q.x, y: q.y, r: 40, t: 0.7, T0: 0.7, col: '#ffb040' }); callout(ctx, L(ctx).tail); ctx.sfx('spar_charge'); ST.tailT = 0; }
function startMoon(ctx, mo, tp) {
  const p = ctx.S.player, rp = rkPos(ctx), tg = [tp, tp, (!rkAway(ctx) && !dark() && rp) ? rp : p];
  [4, 8, 12].forEach((i, n) => spawnMoon(ctx, i, tg[n].x + (n === 1 ? 14 : 0), tg[n].y + (n === 1 ? -10 : 0), { side: n % 2 ? -1 : 1 }));
  ST.act = { k: 'moon', t: 0, T: 0.9 }; callout(ctx, L(ctx).moon); ctx.sfx('spar_charge');
}
function startBolts(ctx, mo) {
  const p = ctx.S.player, rp = rkPos(ctx), c = C0(ctx), pts = [{ x: p.x, y: p.y }];
  if (rp && !rkAway(ctx)) pts.push({ x: rp.x, y: rp.y }); else pts.push({ x: p.x + (Math.random() - 0.5) * 70, y: p.y + (Math.random() - 0.5) * 60 });
  pts.push({ x: c.x + (Math.random() - 0.5) * 220, y: c.y + (Math.random() - 0.5) * 180 }); if (ctx.terrain && ctx.terrain.night()) pts.push({ x: p.x + (Math.random() - 0.5) * 50, y: p.y + (Math.random() - 0.5) * 40 });   /* ban đêm: thêm 1 tia */
  pts.forEach((q, i) => { ST.tele.push({ type: 'bolt', x: q.x, y: q.y, r: 16, t: 1.1, T0: 1.1, col: '#a8c8ff' }); threat(ctx, { id: 'bk_bolt' + i + '_' + (ST.nid++), kind: 'bolt', from: { x: q.x, y: q.y - 80 }, to: { x: q.x, y: q.y - 6 }, in: 1.1, radius: 16 }); });   /* Sét Bão: vòng trúng 16 quanh chân */
  ST.act = { k: 'bolts', t: 0, T: 1.1, pts }; callout(ctx, L(ctx).bolts); ctx.sfx('spar_charge');
}
function startCrack(ctx) {   /* GIÁP NỨT: sau đòn sét lớn, 4 khớp giáp dọc thân nứt sáng 9 s — phá đủ 4 khớp (người chém / Rocky bắn khớp xa) → choáng + mất máu lớn */
  if (ST.crack || !ST.boss || ST.ult) return; ST.gapT = Math.max(ST.gapT || 0, 3);   /* plan-40: lộ khớp giáp = khoảng phản công */ const idx = [6, 14, 22, 30].filter(i => i <= SEG_N); ST.crack = { t: 0, dur: 9, segs: idx.map(i => ({ i, hp: 3, dead: false })), rkT: 1.2 }; ST.cd.crack = 22;
  callout(ctx, L(ctx).crack, 2.2); ctx.sfx('smash'); if (ctx.quake) ctx.quake(0.15); ST.stats.cracks = (ST.stats.cracks || 0) + 1; log('CRACK');
}
function crackPos(c) { const q = ST.body.find(b => b.i === c.i); return q ? { x: q.x, y: q.y - Math.max(0, q.z) * 0.3 } : null; }
function crackHit(ctx, c, n, who) { if (!c || c.dead) return; c.hp -= n; const q = crackPos(c); if (q) fx('td_spark', q.x, q.y - 10, { top: true }); ctx.sfx('knock_wall'); log('crack hit ' + c.i + ' ' + c.hp + ' by ' + who); ST.stats['crack_' + who] = (ST.stats['crack_' + who] || 0) + 1;
  if (c.hp <= 0) { c.dead = true; if (q && !fx('bk_crackbreak', q.x, q.y - LIFT - 8 + 41, { top: true })) fx('gm_shatter', q.x, q.y - 10, { top: true });   /* vỡ khớp: loé vàng + mảnh giáp tím (vfx_workbench) */ ctx.sfx('smash');
    if (ST.crack.segs.every(z => z.dead)) { const b = ST.boss; ST.crack = null; if (b) { b.stunT = 6; const fl = ST.ultAt.length ? Math.round(b.max * ST.ultAt[0] * 0.97) : 1; b.hp = Math.max(fl, b.hp - Math.round(b.max * 0.08)); } ST.act = null; ST.tele = []; callout(ctx, L(ctx).crackDone, 2.4); if (ctx.quake) ctx.quake(0.3); ctx.sfx('boss_win'); ST.stats.crackDone = (ST.stats.crackDone || 0) + 1; log('CRACK DONE'); } } }
function crackTick(ctx, dt) { const C = ST.crack; if (!C) return; C.t += dt; if (C.t >= C.dur) { ST.crack = null; log('crack healed'); return; }
  const e = rkEnt(ctx), p = ctx.S.player; C.rkT -= dt; if (e && !rkAway(ctx) && C.rkT <= 0) { const alive = C.segs.filter(z => !z.dead).map(z => ({ z, q: crackPos(z) })).filter(o => o.q).sort((a, b) => Math.hypot(b.q.x - p.x, b.q.y - p.y) - Math.hypot(a.q.x - p.x, a.q.y - p.y)); const o = alive[0];   /* Rocky lo khớp XA người chơi */
    if (o) { C.rkT = 2.2; const ang = Math.atan2(o.q.y - 8 - (e.y - 8), o.q.x - e.x), ok2 = ctx.rocky.haFire && ctx.rocky.haFire(ang, true); C.rkShot = { t: ok2 ? 0.85 : 0.4, z: o.z }; if (!ok2) fx('rk_punch_t4', o.q.x, o.q.y - 8, { top: true }); } }
  if (C.rkShot) { C.rkShot.t -= dt; if (C.rkShot.t <= 0) { const z = C.rkShot.z; C.rkShot = null; crackHit(ctx, z, 2, 'r'); } } }
function boltAt(ctx, x, y) { if (ctx.air && ctx.air.flash) ctx.air.flash();   /* chớp trong mây bão (sự kiện) */ let n = (Math.random() * 4) | 0; if (n === ST.boltLast) n = (n + 1) % 4; ST.boltLast = n; if (!fx('td_sky' + n, x, y, { top: true, t0: 0.2, glowT: 0.35 })) fx('dr_bolt', x, y, { top: true }); if (lowTier(ctx)) fx('td_scorch', x, y, { ground: true }); else if (!fx('bk_kick_cloud', x, y, { ground: true }) && ctx.air && ctx.air.fogBurst) ctx.air.fogBurst(x, y - 6, { s: 0.5, n: 5, dur: 1.0, col: '#dfe4ff' });   /* 2026-10-15 anh: mây văng PIXEL thay sương mềm */   /* sét to từ trên cao (bỏ khung tia dẫn lấm chấm); giữa trời: tan thành sương, không vết cháy */ areaHit(ctx, x, y, 16, DMG.bolt, 'bolt', 'stagger', 1, 2); ctx.sfx('smash'); }
/* LONG MẠCH: lặn → vạch xoáy mây qua mục tiêu → trồi dọc vạch */
function startMach(ctx, mo, tp) {
  const H = ST.H, c = C0(ctx); ST.act = { k: 'mach', ph: 'dive', t: 0, tx: tp.x, ty: tp.y }; callout(ctx, L(ctx).mach, 1.4); ctx.sfx('whoosh_big'); ST.stats.mach++;
  ST.act.dx = H.x + (H.x - c.x) * 0.2; ST.act.dy = H.y + (H.y - c.y) * 0.2;
}
function machLine(ctx, A) { return { x1: A.x1, y1: A.y1, x2: A.x2, y2: A.y2 }; }
function pathImpact(ctx, A, H, r, pw) { if (!ctx.chase) return; if ((A.impT = (A.impT || 0) - 1) > 0) return; A.impT = 3; ctx.chase.impact(H.x, H.y, r, { pw, src: { x: H.x - Math.cos(H.a) * 10, y: H.y - Math.sin(H.a) * 10 } }); }   /* mỗi 3 khung: phá vật / hất dân trên đường lao */
const segDist = (px, py, x1, y1, x2, y2) => { const dx = x2 - x1, dy = y2 - y1, l = dx * dx + dy * dy || 1, u = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / l)); return Math.hypot(px - x1 - dx * u, py - y1 - dy * u); };
function actTick(ctx, mo, A, dt, p) {
  A.t += dt; const H = ST.H; if (A.k === 'sub') return subTick(ctx, A, H, p, dt);   /* plan-40: lặn duỗi */
  if (A.k === 'dash' || A.k === 'breath') return rageAct(ctx, A, H, p, dt);
  if (A.k === 'slam') return slamTick(ctx, A, H, p, dt);
  if (A.k === 'terrain') { if (!ctx.terrain) { ST.act = null; return; } const r = ctx.terrain.tick(dt, TAD(ctx)); if (r.head) { const hx = r.head.x, hy = r.head.y; if (Math.hypot(hx - H.x, hy - H.y) > 4) steer(ctx, dt, hx, hy, 170, 5); else { H.sp = 0; trailPush(); } zTo(dt, r.head.z, 140); H.open = 1; } if (r.done) ST.act = null; return; }
  if (A.k === 'bite') {
    if (A.t < A.T) { const tp = tgPos(ctx, ST.tgt) || p; if (A.h0 == null) A.h0 = H.a; if (A.t < A.T * 0.7) A.a = A.h0 + Math.max(-(A.lim || 0.8), Math.min(A.lim || 0.8, angDiff(Math.atan2(tp.y - H.y, tp.x - H.x), A.h0)));   /* plan-40: ngoảnh ≤ 0,8 rad (2026-10-16: ≤ A.lim) */ H.a += angDiff(A.a, H.a) * Math.min(1, dt * 10); H.x += Math.cos(H.a) * 25 * dt; H.y += Math.sin(H.a) * 25 * dt; H.open = 1; trailPush(); const tl = ST.tele.find(q => q.follow === 'head'); if (tl) tl.a = A.a; A.len = Math.min(140, Math.hypot(tp.x - H.x, tp.y - H.y) + 14); return; }
    if (!A.go) { A.go = true; A.left = A.len || 100; ctx.sfx('whoosh_big'); fx('bk_snap', H.x + Math.cos(A.a) * 26, H.y + Math.sin(A.a) * 26 - LIFT + 23, { top: true }); }   /* Kìm Cắn: vệt càng tím (vfx_workbench) */
    const s = Math.min(A.left, 320 * dt); A.left -= s; H.x += Math.cos(A.a) * s; H.y += Math.sin(A.a) * s; H.a = A.a; H.open = 1; trailPush(); pathImpact(ctx, A, H, 16, 3);
    if (!A.hitP && Math.hypot(p.x - H.x, p.y - 6 - H.y) < 17) A.hitP = hurtPlayer(ctx, DMG.bite, { x: H.x - Math.cos(A.a) * 10, y: H.y - Math.sin(A.a) * 10 }, 'fly', 1.05, 'bite');
    const rp = rkPos(ctx); if (!A.hitR && rp && Math.hypot(rp.x - H.x, rp.y - 6 - H.y) < 17) A.hitR = hurtRocky(ctx, DMG.bite, H, 62, 'fly'); if (!A.hitL && ltHitAt(ctx, q => Math.hypot(q.x - H.x, q.y - 6 - H.y) < 17, DMG.bite, H, 'fly')) A.hitL = true;
    if (A.left <= 0) { ST.act = null; fx('knock_heavy', H.x, H.y, { top: true }); }
    return;
  }
  if (A.k === 'tail') { if (!A.hit && A.t >= A.T) { A.hit = true; ctx.sfx('whoosh_big'); if (ctx.quake) ctx.quake(0.12); areaHit(ctx, A.x, A.y, 40, DMG.tail, 'tail', 'fly', 1, 4); if (!fx('bk_kick_cloud', A.x, A.y, { ground: true }) && ctx.air && ctx.air.fogBurst) ctx.air.fogBurst(A.x, A.y - 8, { s: 0.4, n: 4, dur: 0.9, col: '#d8d2ff' }); } if (A.t >= A.T + 0.35) ST.act = null; return; }
  if (A.k === 'moon') { castStand(ctx, dt, tgPos(ctx, ST.tgt) || p); if (A.t >= A.T) ST.act = null; return; }
  if (A.k === 'bolts') { castStand(ctx, dt, tgPos(ctx, ST.tgt) || p); if (!A.hit && A.t >= A.T) { A.hit = true; for (const q of A.pts) boltAt(ctx, q.x, q.y); if ((ST.cd.crack || 0) <= 0) startCrack(ctx); } if (A.t >= A.T + 0.3) ST.act = null; return; }
  if (A.k === 'mach') {
    if (A.ph === 'dive') { steer(ctx, dt, H.x + Math.cos(H.a) * 80, H.y + Math.sin(H.a) * 80, 270, 0.8); zTo(dt, -34, 110); if (H.z <= -30 && ST.body.every(q => q.z < -2) || A.t > 1.4) {
      const tp = tgPos(ctx, ST.tgt) || p, th = Math.random() * TAU, L0 = 230; A.tx = tp.x; A.ty = tp.y;
      const e1 = inArena(ctx, tp.x - Math.cos(th) * L0, tp.y - Math.sin(th) * L0 * 0.9), e2 = inArena(ctx, tp.x + Math.cos(th) * L0, tp.y + Math.sin(th) * L0 * 0.9); Object.assign(A, { ph: 'warn', t: 0, x1: e1.x, y1: e1.y, x2: e2.x, y2: e2.y });   /* plan-40: vạch trồi trong sân */
      H.x = A.x1; H.y = A.y1; H.a = Math.atan2(A.y2 - A.y1, A.x2 - A.x1); H.z = -34; threat(ctx, { id: 'bk_mach', kind: 'lunge', from: { x: A.x1, y: A.y1 - 6 }, to: { x: A.x2, y: A.y2 - 6 }, in: 1.0, dur: Math.hypot(A.x2 - A.x1, A.y2 - A.y1) / 340, width: 24 });   /* Long Mạch trồi dọc vạch */ trailLine(H, -34); ST.tele.push({ type: 'mach', x1: A.x1, y1: A.y1, x2: A.x2, y2: A.y2, w: 15, t: 1.0, T0: 1.0, col: '#b8a8ff' }); ctx.sfx('spar_charge'); log('mach warn'); } return; }
    if (A.ph === 'warn') { if (A.t >= 1.0) { A.ph = 'erupt'; A.t = 0; ctx.sfx('roar_big'); if (ctx.quake) ctx.quake(0.3); } return; }
    if (A.ph === 'erupt') {
      const s = 340 * dt; H.x += Math.cos(H.a) * s; H.y += Math.sin(H.a) * s; H.z = Math.min(BZ(ctx) + 4, H.z + 170 * dt); H.open = 1;   /* trồi DẦN (cổ đốt nối liền đầu, không đầu lơ lửng một mình) */ trailPush(); pathImpact(ctx, A, H, 18, 4);
      if ((A.fxT = (A.fxT || 0) - dt) <= 0) { A.fxT = 0.06; if (lowTier(ctx)) fx('knock_erupt', H.x, H.y + 4); else if (!fx('bk_kick_cloud', H.x, H.y, { ground: true }) && ctx.air && ctx.air.fogBurst) ctx.air.fogBurst(H.x, H.y - 6, { s: 0.35, n: 2, dur: 0.9, col: '#cfc8ff', top: false });   /* tầng thấp: trồi từ LÒNG ĐẤT · trời: từ biển mây */ }
      if (!A.hitP && Math.hypot(p.x - H.x, p.y - H.y) < 18) { A.hitP = hurtPlayer(ctx, DMG.mach, { x: H.x, y: H.y + 6 }, 'launch', 1.2, 'mach'); if (A.hitP) ST.stats.machHit++; }
      const rp = rkPos(ctx); if (!A.hitR && rp && Math.hypot(rp.x - H.x, rp.y - H.y) < 18) A.hitR = hurtRocky(ctx, DMG.mach, H, 64, 'launch'); if (!A.hitL && ltHitAt(ctx, q => Math.hypot(q.x - H.x, q.y - H.y) < 18, DMG.mach, H, 'fly')) A.hitL = true;
      if (Math.hypot(H.x - A.x1, H.y - A.y1) >= Math.hypot(A.x2 - A.x1, A.y2 - A.y1)) { ST.act = null; log('mach end'); }
    }
    return;
  }
}

/* ---------------- NHẬT THỰC + 3 TRỐNG ---------------- */
function drumSpots(ctx) {   /* sân trời: 3 trống cố định; vùng khác: 3 trống nổi quanh tâm trận, đặt trên ô đi được (tầng thấp) */
  if (inBk(ctx) && ctx.S.map.bkDrums) return ctx.S.map.bkDrums; const c = C0(ctx), m = ctx.S.map, low = lowTier(ctx), out = [], a0 = Math.random() * TAU;
  for (let i = 0; i < 3; i++) { let best = null; for (let k = 0; k < 24 && !best; k++) { const a = a0 + i * TAU / 3 + (k % 6 - 2.5) * 0.18, r = 92 + Math.floor(k / 6) * 16, x = Math.round(c.x + Math.cos(a) * r), y = Math.round(c.y + Math.sin(a) * r * 0.85);
    if (x < 30 || y < 30 || x > m.w * TS - 30 || y > m.h * TS - 30) continue; if (low && (ctx.isSolid(m, Math.floor(x / TS), Math.floor(y / TS)) || ctx.isSolid(m, Math.floor(x / TS), Math.floor((y + 10) / TS)))) continue; best = { x, y }; }
    out.push(best || { x: Math.round(c.x + Math.cos(a0 + i * TAU / 3) * 60), y: Math.round(c.y + Math.sin(a0 + i * TAU / 3) * 50) }); }
  return out;
}
function startEclipse(ctx, mo) { ST.ecl = { ph: 'rise', t: 0, sunK: 1, darkK: 0 }; ST.drums = drumSpots(ctx).map(q => ({ ...q, lit: false, flash: 0 })); ST.stats.eclipses++; ctx.sfx('roar_big'); log('eclipse start'); }
function eclTick(ctx, dt) {
  const E = ST.ecl, H = ST.H, mo = ST.boss, p = ctx.S.player; E.t += dt; if (!H) return;
  if (E.ph === 'rise') {   /* vút lên tới MẶT TRỜI trên bầu trời (vật thật, góc trên phải khung nhìn) */
    const sw = sunWorld(ctx); steer(ctx, dt, sw.x, sw.y, 210, 4); const zt = Math.max(BZ(ctx), sw.z); H.z += Math.sign(zt - H.z) * Math.min(Math.abs(zt - H.z), 240 * dt); H.open = 1; trailPush();
    if (E.t >= ECL.rise) { E.ph = 'eat'; E.t = 0; callout(ctx, L(ctx).eat, 2); ctx.sfx('gate_open'); } return; }
  if (E.ph === 'eat') { const sw = sunWorld(ctx); H.x += (sw.x - H.x) * Math.min(1, dt * 6); H.y += (sw.y - H.y) * Math.min(1, dt * 6); H.z += (sw.z - H.z) * Math.min(1, dt * 6); H.open = E.t < ECL.eat * 0.6 ? 1 : 0; trailPush(); }
  if (E.ph === 'eat') { if (!E.gulp && E.t > ECL.eat * 0.55) { E.gulp = true; ctx.sfx('smash'); if (ctx.quake) ctx.quake(0.15); } E.sunK = 1 - ease(E.t / ECL.eat); E.darkK = ease(E.t / ECL.eat); if (E.t >= ECL.eat) { E.ph = 'fall'; E.t = 0; const tp = p; H.x = tp.x + (Math.random() < 0.5 ? -90 : 90); H.y = tp.y - 70; } return; }
  if (E.ph === 'fall') { H.z = Math.max(BZ(ctx), H.z - 200 * dt); steer(ctx, dt, p.x, p.y, 90, 3); trailPush(); if (E.t >= ECL.fall) { E.ph = 'dark'; E.t = 0; E.left = ECL.dark * (ctx.terrain && ctx.terrain.night() ? 1.35 : 1);   /* ban đêm: tối lâu hơn */ ctx.toast(L(ctx).dark, true); log('dark'); } return; }
  if (E.ph === 'dark') { E.darkK = 1; E.left -= dt; if (E.left <= 0) spit(ctx, false); return; }
  if (E.ph === 'spit' && E.t < 0.3) { const sw = sunWorld(ctx); H.open = 1; steer(ctx, dt, sw.x, sw.y + 40, 120, 3); }
  if (E.ph === 'spit') { E.sunK = ease(E.t / 0.6); E.darkK = 0; if (E.t >= 0.6) { ST.ecl = null; log('eclipse end'); } }
}
/* MẶT TRỜI = vật trên bầu trời: cố định theo khung nhìn (rất xa → không thị sai), góc trên phải; toạ độ thế giới + độ cao z để đầu rắn bay tới đúng chỗ đó */
const SUN = { fx: 0.84, y: 64, fy: 0.42 };   /* y thật = max(y, fy × VH): nằm dưới cụm HUD góc phải */
const sunY = ctx => Math.max(SUN.y, Math.round((ctx.VH || 270) * SUN.fy));
function sunWorld(ctx) { const cam = ctx.cam || { cx: ctx.S.player.x - 240, cy: ctx.S.player.y - 135 }, VW = ctx.VW || 480, H = ST.H, wy = (H ? H.y : ctx.S.player.y) ; return { x: cam.cx + VW * SUN.fx, y: wy, z: Math.max(40, wy - cam.cy - LIFT - sunY(ctx) + 18) }; }
function spit(ctx, solved) {
  const E = ST.ecl; if (!E) return; E.ph = 'spit'; E.t = 0; ST.bloom = { t: 0, x: C0(ctx).x, y: C0(ctx).y }; ST.drums.forEach(d => { d.lit = false; });
  const mo = ST.boss; ctx.sfx('boss_win'); if (ctx.quake) ctx.quake(0.25);
  if (solved && mo) { mo.stunT = ECL.stun; ST.act = null; ST.tele = []; ST.stats.solved++; callout(ctx, L(ctx).spit, 2.6); fx('knock_dizzy', ST.H.x, ST.H.y - 14, { top: true }); log('SOLVED stun'); }
  else { ST.stats.selfSpit++; callout(ctx, L(ctx).spitSelf, 1.6); log('self spit'); }
}
function beatTick(ctx, dt) {
  const mc = musicClock(); let nb = ST.beatF + dt / BEAT;
  if (mc && /^sky_bakunawa/.test(mc.id || '')) { const tgt = (mc.now - mc.t0) / (mc.step * 2); if (tgt > nb - 0.3 && tgt < nb + 1.5) nb = Math.max(ST.beatF, tgt); ST.sync = true; } else ST.sync = false;
  ST.beatF = nb; const bi = Math.floor(nb); if (bi > ST.lastBeat) { ST.lastBeat = bi; if (dark() && bi % 2 === 0) for (const d of ST.drums) if (!d.lit) d.pulse = 0.15; }
}
const toAcc = () => { const ph = ST.beatF / 2 - Math.floor(ST.beatF / 2); return Math.min(ph, 1 - ph) * 2 * BEAT; };
const onBeatNow = () => toAcc() <= WIN;
function hitDrum(ctx, i) {
  const d = ST.drums[i], t = L(ctx), p = ctx.S.player; if (p.hasAct && p.hasAct('attack')) { if (p.faceTo) p.faceTo(d.x, d.y); p.act('attack', 0); }
  if (!(ST.ecl && ST.ecl.ph === 'dark')) { ctx.toast(t.drumIdle); ctx.sfx('knock_wall'); return; }
  if (d.lit) return;
  if (onBeatNow()) { d.lit = true; d.flash = 0.4; ST.stats.drumOk++; fx('td_spark', d.x, d.y - 10, { top: true }); ctx.sfx('spar_bell'); const n = ST.drums.filter(q => q.lit).length; if (ctx.pop) ctx.pop(d.x, d.y - 24, t.drumOk(n), '#ffe27a'); log('drum ok ' + i + ' ' + n);
    if (n >= 3) spit(ctx, true); }
  else { ST.stats.drumOff++; ctx.sfx('fail'); if (ctx.pop) ctx.pop(d.x, d.y - 24, t.drumOff, '#ff9a8a'); log('drum off ' + toAcc().toFixed(2)); }
}

/* ---------------- TUYỆT CHIÊU: Thiên Cẩu Thực Nguyệt ---------------- */
function ringR(ctx, U) { const r = RR(ctx), R0 = Math.min(r.x, r.y) - 40;   /* vòng bắt đầu ~128 px: lọt khung nhìn (VH ~270) */ if (U.ph === 'rise') return R0 + 30 * (1 - ease(U.t / ULT.rise)); if (U.ph !== 'coil') return U.R ?? R0; return R0 - (R0 - ULT.rMin) * Math.min(1, U.t / ULT.dur); }
const RY = 0.9;
function glowPos(ctx, G) { const U = ST.ult, c = C0(ctx), R = ringR(ctx, U), a = G.a + U.rot; return { x: c.x + Math.cos(a) * R, y: c.y + Math.sin(a) * R * RY }; }
function startUlt(ctx, mo, at) {
  const p = ctx.S.player, c = { ...C0(ctx) }, a0 = Math.atan2((p.y - c.y) / RY, p.x - c.x);
  ST.ult = { ph: 'rise', t: 0, hp0: mo.hp, rot: 0, glow: [{ a: a0, hp: ULT.glowHp, who: 'p' }, { a: a0 + Math.PI, hp: ULT.glowHp, who: 'r' }], biteT: 1.6, lastSide: -1, bite: null, c, at: at ?? 0.6 };
  ST.act = null; ST.tele = []; ST.shots = []; callout(ctx, L(ctx).ult, 2.4); setTimeout(() => { if (ST.ult) callout(ctx, L(ctx).ultHint, 2.4); }, 2200);
  ctx.sfx('roar_big'); if (ctx.quake) ctx.quake(0.3); ST.stats.ultN++; log('ULT start');
}
function myGlow(ctx) { const U = ST.ult, p = ctx.S.player; if (!U) return null; const L2 = U.glow.filter(g => !g.dead && (g.who === 'p' || rkAway(ctx))); let b = null, bd = 1e9; for (const g of L2) { const q = glowPos(ctx, g), d = Math.hypot(q.x - p.x, q.y - p.y) + (g.who === 'p' ? 0 : 20); if (d < bd) { bd = d; b = g; } } return b; }   /* Rocky gục / vắng → người chơi đánh được cả đốt của Rocky */
function glowHit(ctx, G, n, who) {
  if (!G || G.dead) return; G.hp -= n; const q = glowPos(ctx, G); fx('td_spark', q.x, q.y - 10, { top: true }); ctx.sfx('knock_wall');
  if (who === 'p') ST.stats.glowP++; else ST.stats.glowR++; log('glow ' + G.who + ' ' + G.hp + ' by ' + who);
  if (G.hp <= 0) { G.dead = true; fx('gm_shatter', q.x, q.y - 10, { top: true }); ctx.sfx('smash'); if (ST.ult.glow.every(g => g.dead)) ultEnd(ctx, true); }
}
function ultTick(ctx, mo, dt) {
  const U = ST.ult, p = ctx.S.player, c = C0(ctx); U.t += dt;
  if (U.ph === 'rise') { if (U.t >= ULT.rise) { U.ph = 'coil'; U.t = 0; } return; }
  if (U.ph === 'burst' || U.ph === 'crushed') { if (U.t >= 1.2) { ST.ult = null; const a = Math.random() * TAU; headInit(ctx, c.x + Math.cos(a) * 60, c.y + Math.sin(a) * 50, a + Math.PI / 2, BZ(ctx)); ST.cd.mach = Math.max(ST.cd.mach, 3); ST.cd.eclipse = Math.max(ST.cd.eclipse, 8); log('ULT end'); } return; }
  U.rot += ULT.rot * dt; const R = ringR(ctx, U); U.R = R;
  /* vòng thân = tường: ra ngoài vòng → trúng + đẩy vào */
  const wall = (x, y) => Math.hypot(x - c.x, (y - c.y) / RY) > R - 9;
  const free = (x, y) => !lowTier(ctx) || !ctx.isSolid(ctx.S.map, Math.floor(x / TS), Math.floor((y - 2) / TS));
  if (wall(p.x, p.y)) { const a = Math.atan2((p.y - c.y) / RY, p.x - c.x), nx = c.x + Math.cos(a) * (R - 13), ny = c.y + Math.sin(a) * (R - 13) * RY; if (!(ctx.knocked && ctx.knocked()) && free(nx, ny)) { p.x = nx; p.y = ny; } if (hurtPlayer(ctx, DMG.wall, { x: c.x + Math.cos(a) * (R + 10), y: c.y + Math.sin(a) * (R + 10) * RY }, 'stagger', 0.7, 'wall')) ST.hitCd.wall = ST.t + 0.8; }
  const e = rkEnt(ctx); if (e && !e.kfly && wall(e.x, e.y)) { const a = Math.atan2((e.y - c.y) / RY, e.x - c.x), ex = c.x + Math.cos(a) * (R - 13), ey = c.y + Math.sin(a) * (R - 13) * RY; if (free(ex, ey)) { e.x = ex; e.y = ey; } if (!(ST.rkWallCd > ST.t)) { ST.rkWallCd = ST.t + 1; hurtRocky(ctx, DMG.wall, c, 0); } } if (!(ST.ltWallCd > ST.t) && ltHitAt(ctx, q => wall(q.x, q.y), DMG.wall, c, 'hit')) ST.ltWallCd = ST.t + 1;
  /* Rocky tự tới đốt của mình, bắn Rocky-ha (hoặc đấm nếu chưa có ha) */
  const G = U.glow.find(g => g.who === 'r' && !g.dead);
  if (G && e && !rkAway(ctx)) { const q = glowPos(ctx, G), dr = Math.hypot(e.x - q.x, e.y - q.y); ST.rkHaT -= dt;
    if (dr < 64 && ST.rkHaT <= 0) { const ang = Math.atan2(q.y - 8 - (e.y - 8), q.x - e.x); ST.rkHaT = 2.1; const ok = ctx.rocky.haFire && ctx.rocky.haFire(ang, true); U.rkShot = { t: ok ? 0.85 : 0.35, G }; if (!ok) fx('rk_punch_t4', q.x, q.y - 8, { top: true }); log('rocky ' + (ok ? 'ha' : 'punch')); }
    if (U.rkShot) { U.rkShot.t -= dt; if (U.rkShot.t <= 0) { glowHit(ctx, U.rkShot.G, 2, 'r'); U.rkShot = null; } } }
  /* đầu đớp từ 4 phía */
  if (U.bite) { const B2 = U.bite; B2.t += dt; if (B2.t >= ULT.warn) { const u = Math.min(1, (B2.t - ULT.warn) / 0.45); B2.x = B2.x1 + (B2.x2 - B2.x1) * u; B2.y = B2.y1 + (B2.y2 - B2.y1) * u;
      if (!B2.hitP && Math.hypot(p.x - B2.x, p.y - 6 - B2.y) < 17) B2.hitP = hurtPlayer(ctx, DMG.ubite, { x: B2.x - Math.cos(B2.a) * 10, y: B2.y - Math.sin(B2.a) * 10 }, 'fly', 1, 'ubite');
      const rp = rkPos(ctx); if (!B2.hitR && rp && Math.hypot(rp.x - B2.x, rp.y - 6 - B2.y) < 17) B2.hitR = hurtRocky(ctx, DMG.ubite, B2, 60, 'fly'); if (!B2.hitL && ltHitAt(ctx, q => Math.hypot(q.x - B2.x, q.y - 6 - B2.y) < 17, DMG.ubite, B2, 'fly')) B2.hitL = true;
      if (u >= 1) { if (B2.t >= ULT.warn + 0.7) U.bite = null; } } }
  else if ((U.biteT -= dt) <= 0 && U.t < ULT.dur - 1.2) { let side; do side = (Math.random() * 4) | 0; while (side === U.lastSide); U.lastSide = side; U.biteT = ULT.biteEvery;
    const a = [-Math.PI / 2, 0, Math.PI / 2, Math.PI][side], x1 = c.x + Math.cos(a) * (R + 14), y1 = c.y + Math.sin(a) * (R + 14) * RY, L0 = Math.min(R * 1.25, 150), x2 = x1 - Math.cos(a) * L0, y2 = y1 - Math.sin(a) * L0 * RY;
    U.bite = { t: 0, x1, y1, x2, y2, x: x1, y: y1, a: a + Math.PI }; ST.tele.push({ type: 'l', x: x1, y: y1, a: Math.atan2(y2 - y1, x2 - x1), len: Math.hypot(x2 - x1, y2 - y1), w: 8, t: ULT.warn, T0: ULT.warn, col: '#ff5040' }); ctx.sfx('spar_charge'); log('ult bite ' + side); }
  if (U.t >= ULT.dur) ultEnd(ctx, false);
}
function ultEnd(ctx, burst) {
  const U = ST.ult, mo = ST.boss, c = C0(ctx); if (!U) return; U.ph = burst ? 'burst' : 'crushed'; U.t = 0; U.bite = null; ST.tele = [];
  if (burst) { ST.stats.ultBurst++; callout(ctx, L(ctx).burst, 2.2); if (mo) { mo.stunT = 4.5; mo.hp = Math.max(1, U.hp0 - Math.round(mo.max * 0.06)); } ctx.sfx('boss_win'); if (ctx.quake) ctx.quake(0.35); fx('bk_burst', c.x, c.y, { top: true }); log('ULT burst'); }
  else { ST.stats.ultCrush++; callout(ctx, L(ctx).crush, 1.8); areaHit(ctx, c.x, c.y, 400, DMG.crush, 'crush', 'fly', 1.3, 0); if (ctx.chase) ctx.chase.impact(c.x, c.y, 70, { pw: 5 }); ctx.sfx('smash'); if (ctx.quake) ctx.quake(0.4); log('ULT crush'); }
}

/* ---------------- PHA 2: Đầu Rồng Bão ---------------- */
function shed(ctx, mo) {
  ST.boss = null; ST.ult = null; ST.act = null; ST.tele = []; ST.shots = []; if (ST.ecl) { ST.ecl = null; ST.bloom = { t: 0, x: C0(ctx).x, y: C0(ctx).y }; }
  ST.fall = ST.body.map(q => ({ x: q.x, y: q.y, z: Math.max(0, q.z), vz: 30 + Math.random() * 40, vx: (Math.random() - 0.5) * 40, a: q.a, kind: q.i === SEG_N + 1 ? 'tail' : 'seg', t: 0 }));
  ST.shed = { t: 0 }; callout(ctx, L(ctx).shed, 2.2); ctx.sfx('smash'); if (ctx.quake) ctx.quake(0.3); log('shed');
}
function shedTick(ctx, dt) { const S = ST.shed; S.t += dt; ST.H.open = 1; zTo(dt, BZ(ctx) + 8, 30); if (S.t > 1.3 && !ST.mo2 && !ST.won) spawnP2(ctx); if (S.t > 1.6) ST.shed = null; }
function spawnP2(ctx) {
  const H = ST.H, cfg = { key: 'bakunawa2', vi: STR.vi.ph2name, en: STR.en.ph2name, hp: bossHp(ctx, 0.55), dmg: 0, armor: 0, sp: 120, xp: 0, w: 22, h: 22, noXpTag: true, bkP2: true, fly: true, chaseBoss: true, c: ['#2a6a7a', '#c0e0ff', '#ffffff'],
    aiFn: (c2, mo, dt, p, dp, canHit) => p2Ai(c2, mo, dt, p, dp, canHit), drawFn: () => {}, onDown: mo => p2Down(ctx, mo) };
  const mo = ctx.monsters.add(cfg, H.x, H.y); Object.assign(mo, { angry: true, warned: true }); ST.mo2 = mo; ST.picks = []; ST.stats.p2 = 1; ST.act = null; fx('ult_thunderring', H.x, H.y, { top: true }); ctx.sfx('roar_big'); log('p2 spawn hp ' + mo.max);
}
function p2Ai(ctx, mo, dt, p, dp, canHit0) {
  const canHit = !(ctx.hero && ctx.hero.fainted) && !ST.tcine && !(ctx.chase && ctx.chase.cineOn()) && !(ctx.alt && ctx.alt.hidden());   /* trốn trong tầng mây: rết mất dấu */ void canHit0;
  mo.kb = null; seenHit(ctx); if (ST.tcine) return; for (const k in ST.cd2) if (ST.cd2[k] > 0) ST.cd2[k] -= dt * (mo.hp < mo.max * 0.5 ? 1.2 : 1);
  ST.recent = ST.recent.filter(t => ST.t - t < 1.4); if (!ST.hold) aggroTick(ctx, mo, dt);
  const H = ST.H, tp = tgPos(ctx, ST.tgt) || p, d = dist(H, tp), A = ST.act;
  if (Math.hypot(p.x - H.x, p.y - 6 - H.y) < 12 && hurtPlayer(ctx, DMG.touch, H, 'stagger', 0.7, 'touch')) ST.hitCd.touch = ST.t + 1;
  if (A) { A.t += dt;
    if (A.k === 'dash') { if (A.t < A.T) { H.a += angDiff(A.a, H.a) * Math.min(1, dt * 10); H.open = 1; return; } const s = Math.min(A.left, 380 * dt); A.left -= s; H.x += Math.cos(A.a) * s; H.y += Math.sin(A.a) * s; H.open = 1;
      if ((A.fxT = (A.fxT || 0) - dt) <= 0) { A.fxT = 0.14; const bx = H.x - Math.cos(H.a) * 14, by = H.y - Math.sin(H.a) * 14; if (Math.hypot(bx - p.x, by - p.y) > 24) fx('td_spark', bx, by - 6); }   /* tia lửa ÍT, sau đầu, không chụm lên người */ pathImpact(ctx, A, H, 14, 3);
      if (!A.hitP && Math.hypot(p.x - H.x, p.y - 6 - H.y) < 15) A.hitP = hurtPlayer(ctx, DMG.dash, H, 'fly', 1.1, 'dash'); const rp = rkPos(ctx); if (!A.hitR && rp && Math.hypot(rp.x - H.x, rp.y - 6 - H.y) < 15) A.hitR = hurtRocky(ctx, DMG.dash, H, 62, 'fly'); if (!A.hitL && ltHitAt(ctx, q => Math.hypot(q.x - H.x, q.y - 6 - H.y) < 15, DMG.dash, H, 'fly')) A.hitL = true;
      if (A.left <= 0) ST.act = null; return; }
    if (A.k === 'breath') { H.open = 1; if (!A.hit && A.t >= A.T) { A.hit = true; ctx.sfx('smash'); const inCone = e => e && Math.hypot(e.x - H.x, e.y - H.y) < 74 && Math.abs(angDiff(Math.atan2(e.y - H.y, e.x - H.x), A.a)) < 0.5;
        for (let i = 1; i <= 4; i++) { const bx = H.x + Math.cos(A.a) * i * 16, by = H.y + Math.sin(A.a) * i * 16; fx('dr_bolt', bx, by, { top: true }); if (ctx.chase) ctx.chase.impact(bx, by, 12, { pw: 2, src: H }); } if (inCone(p)) hurtPlayer(ctx, DMG.breath, H, 'stagger', 1, 'breath'); if (inCone(rkPos(ctx))) hurtRocky(ctx, DMG.breath, H, 45); ltHitAt(ctx, inCone, DMG.breath, H, 'hit'); }
      if (A.t >= A.T + 0.35) ST.act = null; return; }
    if (A.k === 'moon' || A.k === 'bolts') { if (A.k === 'bolts' && !A.hit && A.t >= A.T) { A.hit = true; for (const q of A.pts) boltAt(ctx, q.x, q.y); } if (A.t >= A.T + 0.3) ST.act = null; }
  }
  H.open = Math.max(0, H.open - dt);
  /* bay giữ tầm 50–90 px quanh mục tiêu (vòng quỹ đạo) — đòn đều có tầm xa, chạm đầu sát người cũng trúng → không vùng chết */
  ST.orb += dt * 1.8 * ST.orbDir; const r = 70, tx = tp.x + Math.cos(ST.orb) * r, ty = tp.y + Math.sin(ST.orb) * r * 0.8; steer(ctx, dt, tx, ty, 125, 4); zTo(dt, BZ(ctx) + 8, 40); trailPush();
  if (!canHit || ST.hold || ST.act) return;
  const k = pickSkill(SK2, ST.cd2, s => s === 'breath' ? d < 80 : s === 'dash' ? d < 170 : true);
  if (k) { used('p2' + k); ST.cd2[k] = SK2[k].cd; const a = Math.atan2(tp.y - H.y, tp.x - H.x);
    if (k === 'dash') { ST.act = { k, t: 0, T: 0.55, a, left: Math.min(200, d + 30) }; ST.tele.push({ type: 'l', x: H.x, y: H.y, a, len: Math.min(200, d + 30), w: 8, t: 0.55, T0: 0.55, col: '#a8c8ff' }); callout(ctx, L(ctx).dash); ctx.sfx('spar_charge'); }
    if (k === 'breath') { ST.act = { k, t: 0, T: 0.8, a }; ST.tele.push({ type: 'cone', x: H.x, y: H.y, a, r: 74, w: 1.0, t: 0.8, T0: 0.8, col: '#a8c8ff' }); callout(ctx, L(ctx).breath); ctx.sfx('spar_charge'); }
    if (k === 'moon') { spawnMoon(ctx, -1, tp.x, tp.y, { side: 1 }); spawnMoon(ctx, -1, tp.x + 20, tp.y - 12, { side: -1 }); ST.act = { k, t: 0, T: 0.8 }; }
    if (k === 'bolts') startBolts(ctx, mo);
  }
}
function p2Down(ctx, mo) { ST.mo2 = null; ST.tele = []; ST.shots = []; ST.act = null; ST.death = { t: 0, x: ST.H.x, y: ST.H.y }; callout(ctx, L(ctx).die, 2.6); ctx.sfx('roar_big'); if (ctx.quake) ctx.quake(0.25); log('p2 down'); }
function dieCenti(ctx, mo) {   /* vua rết gục: thân sụp từng đốt, mũ trùm nứt, LYRON bước ra (hook ctx.lyronFinale — thưởng lần đầu chờ hook đó) */
  ST.boss = null; ST.ult = null; ST.act = null; ST.tele = []; ST.shots = []; if (ST.ecl) { ST.ecl = null; ST.bloom = { t: 0, x: C0(ctx).x, y: C0(ctx).y }; }
  const H = ST.H; ST.fall = ST.body.map(q => ({ x: q.x, y: q.y, z: Math.max(0, q.z) + rearZ(q.i), vz: 6 + Math.random() * 6, vx: (Math.random() - 0.5) * 3, a: q.a, kind: q.i === SEG_N + 1 ? 'tail' : 'seg', t: -q.i * 0.03, li: q.i }));   /* sụp tại chỗ — giữ dáng chuỗi, không tách khỏi đầu */
  ST.rear = 0; ST.death = { t: 0, x: H.x, y: H.y }; callout(ctx, L(ctx).die, 2.6); ctx.sfx('roar_big'); if (ctx.quake) ctx.quake(0.3); log('DOWN');
}
function deathTick(ctx, dt) {
  const D = ST.death; if (D.twist == null) D.twist = sv(ctx).wins === 0 && !!(ctx.lyronFinale && ctx.lyronFinale.meet); D.t += dt; if (ST.H) { ST.H.open = 1; zTo(dt, Math.max(0, BZ(ctx) - 6), 30); }
  if (D.t >= 1.0 && !D.bloom) { D.bloom = true; ST.bloom = { t: 0, x: D.x, y: D.y }; }
  if (D.t >= 1.7 && !D.crack) { D.crack = true; fx('gm_shatter', D.x, D.y - 30, { top: true }); ctx.sfx('smash'); if (ctx.quake) ctx.quake(0.2); callout(ctx, D.twist ? L(ctx).hoodEmpty : L(ctx).hood, 2.4); log('hood cracks' + (D.twist ? ' (empty)' : '')); }
  if (D.t >= 2.1 && !D.lyron && !D.twist) { D.lyron = { t: 0 }; ST.stats.lyron = 1; log('LYRON emerges'); }   /* 2026-10-15: lần đầu (twist) mũ rỗng — Lyron đợi ở cầu tàu */
  if (D.lyron) D.lyron.t += dt;
  if (D.t >= 3.6 && !D.won) { D.won = true; onWin(ctx, { x: D.x, y: D.y + 18 }); }   /* onWin: lần đầu → ctx.lyronFinale.start (delegate) / lần sau → thưởng giảm */
  if (D.t > 5.5 && !D.keep) ST.death = null;
}
function firstReward(ctx) {   /* MỘT chỗ duy nhất: sách Rocky bậc 8 + thành tựu + danh hiệu (lyron_finale gọi qua ctx.bkFirstReward sau khi hạ Lyron) */
  const h = sv(ctx), t = L(ctx); if (h.book) return false; if (ctx.hrBook && ctx.hrBook.add) ctx.hrBook.add(1); h.book = 1; h.title = true; if (ctx.achieve) ctx.achieve('bakunawa'); setTimeout(() => ctx.toast(t.title, true), 1200); setTimeout(() => { if (ctx.hrBook && ctx.hrBook.open) ctx.hrBook.open(); }, 2200); ctx.persist(); log('first reward'); return true;
}
function onWin(ctx, mo) {
  const h = sv(ctx), first = h.wins === 0, t = L(ctx), secs = Math.round(ST.t - ST.startT);
  h.wins++; h.best = h.best ? Math.min(h.best, secs) : secs; ST.won = true; ST.tele = []; if (ctx.chase && ctx.chase.is('bakunawa')) ctx.chase.end('win');
  if (ctx.quake) ctx.quake(0.3); ctx.sfx('boss_win'); callout(ctx, t.won, 3.5);
  const xp = first ? 2000 : 450; if (ctx.hero) ctx.hero.gainXp(xp); if (ctx.onMonsterDown) { try { ctx.onMonsterDown(mo, first ? 1200 : 280); } catch (e) { /* bỏ qua */ } }
  ST.gave = ['stone', 'soul', 'starshard'].concat(first ? ['boltjar'] : []); ctx.give('stone', first ? 600 : 120, mo.x, mo.y); ctx.give('soul', first ? 3 : 1, mo.x + 8, mo.y); ctx.give('starshard', first ? 3 : 1, mo.x - 8, mo.y + 4); if (first) ctx.give('boltjar', 2, mo.x + 4, mo.y + 8);
  const r = ((ctx.S.save.sys ||= {}).road ||= {}); r.balls ||= []; const miss = [1, 2, 3, 4, 5, 6, 7].filter(n => !r.balls.includes(n));
  if (miss.length && (first || Math.random() < 0.2)) { const n = miss[(Math.random() * miss.length) | 0]; r.balls.push(n); ctx.give('dball' + n, 1, mo.x - 10, mo.y, { beam: true }); setTimeout(() => ctx.toast(ctx.lang() === 'vi' ? `🐉 NGỌC RỒNG ${n} SAO rơi ra!` : `🐉 The ${n}-STAR DRAGON BALL dropped!`, true), 1800); }
  /* plan-33 mục 9: lần đầu hạ → PLOT TWIST Lyron (lyron_finale.js) lo tiếp; thưởng lần đầu (sách bậc 8, thành tựu, danh hiệu) chờ hạ Lyron → ctx.bkFirstReward */
  const meet = first && ctx.lyronFinale && ctx.lyronFinale.meet ? (() => { try { return ctx.lyronFinale.meet(ctx, { zone: zidOf(ctx) }); } catch (e) { console.error('lyronMeet', e); return false; } })() : false;   /* 2026-10-15 anh: ở lại sân, gặp Lyron riêng ở cầu tàu đêm lồng đèn */
  if (meet) { ST.keepCorpse = { x: ST.death ? ST.death.x : mo.x, y: ST.death ? ST.death.y : mo.y - 18, z: zidOf(ctx) }; if (ST.death) ST.death.keep = false; firstReward(ctx); log('→ lyron meet (cầu tàu) — thưởng trao ngay'); }
  const fin = !meet && first && ctx.lyronFinale && ctx.lyronFinale.start ? (() => { try { return ctx.lyronFinale.start(ctx, { x: mo.x, y: mo.y, first: true, delegate: true }); } catch (e) { console.error('lyronFinale', e); return false; } })() : false;
  if (fin) { ST.lyronHook = 'lyron_reveal'; log('→ lyronFinale.start (thưởng lần đầu chờ)'); }
  else if (first && !meet) firstReward(ctx);
  else if (!meet) setTimeout(() => ctx.toast(t.again, true), 2400);
  ctx.persist(); log('WIN ' + secs + 's first ' + first); setTimeout(() => { try { groundRestore(ctx); } catch (e) { /* bỏ qua */ } }, 3000);   /* hết trận: đất xới / cỏ bẹp lành lại (cùng luật đổ nát aircombat) */
}

/* ---------------- CALLOUT: 1 ô chữ duy nhất cho mọi câu báo trong trận (mới đè cũ, không chồng) ---------------- */
function callout(ctx, txt, t = 1.6) { if (!txt) return; if (ST.banner && ST.banner.lock > ST.t && !(ST.banner.txt === txt)) { ST.queue = { txt, t }; return; } ST.banner = { txt, t, lock: ST.t + 0.9 }; }

/* ---------------- NGOẠM THA (2026-10-14 anh: "trọng tâm là NGƯỜI CHƠI — để trùm NGOẠM tôi THA đi qua vùng đất khác") ----------------
   · Mốc máu 80 / 52 / 22 % (bắt buộc) + thỉnh thoảng làm chiêu (né được, hồi 30 s, cách lần trước ≥ 40 s).
   · tele 1,1 s: sương tối tụ dưới chân người + gầm + đầu dựng lên, há kìm · lunge: lao tới cắn (mốc máu: bám theo, chắc chắn trúng) ·
     carry ~5,2 s: chế độ 'bkcarry' (người đứng yên), cảnh bay: đất các vùng (worldmosaic) trôi bên dưới, sương lao qua, vệt tốc độ;
     sát thương nhẹ đều (giãy tốt → ít hơn); bấm A / E / chạm = GIÃY (đủ GRAB.need → THOÁT sớm). 2026-10-16 anh: BỎ Rocky bay theo cắn đầu (nhẹ máy) → need 9 → 7; Rocky vẫn đáp xuống vùng đích cùng người (altPend rk).
   · Hết giờ → QUĂNG xuống vùng đích (độ cao 40 m rồi đập xuống đất = ctx.alt.knockV slam) — rết hạ xuống ngay; THOÁT → bung chong chóng
     ở 120 m trên vùng đích, tự hạ dần (vẫn điều khiển được) — rết chui lên sau 2,4 s. Vùng đích chọn để KHÁC địa hình (biển / rừng / cát / làng / núi lửa). */
const LANDS = [{ z: 'sea', entry: 'back', want: 'beach', isle: { x: 40, y: 26, rx: 7, ry: 4 } }, { z: 'm3', want: 'forest' }, { z: 'm1', want: 'sand' }, { z: 'village', want: 'village' }, { z: 'm7', want: 'rock' }];
const GRAB = { tele: 1.1, lunge: 0.42, carry: 5.2, need: 7, esc: 0.7, dmgEvery: 0.9, dmg: 0.022 };
const canGrab = ctx => !!ST.H && !ST.ult && !ST.cons && !ST.death && !ST.grab && !ST.arrive && !ST.tcine && !(ctx.hero && ctx.hero.fainted) && !(ctx.chase && ctx.chase.cineOn()) && ctx.S.mode === 'play' && !!pickDest(ctx, true);
function zname(ctx, z) { const Z = ZONES[z]; return Z ? (ctx.lang() === 'vi' ? Z.name.vi : Z.name.en) : z; }
function pickDest(ctx, peek) {
  const here = zidOf(ctx); if (ST.forceDest && ST.forceDest !== here) { const f = LANDS.find(o => o.z === ST.forceDest) || { z: ST.forceDest }; if (!peek) ST.forceDest = null; return f; }
  let pool = LANDS.filter(o => ZONES[o.z] && o.z !== here && !ST.visited.includes(o.z)); if (!pool.length) pool = LANDS.filter(o => ZONES[o.z] && o.z !== here);
  if (!pool.length) return null; return peek ? pool[0] : pool[(Math.random() * pool.length) | 0];
}
function startGrab(ctx, forced) {
  if (!canGrab(ctx)) return false; const dest = pickDest(ctx); if (!dest) return false; const p = ctx.S.player;
  ST.act = null; ST.tele = []; ST.shots = []; ST.crack = null; if (ctx.terrain) ctx.terrain.cancel();
  ST.grab = { ph: 'tele', t: 0, forced: !!forced, dest, mash: 0, dmgT: GRAB.dmgEvery, rk: null, tx: p.x, ty: p.y, shake: 0, hurt: 0 };
  if (!forced && ST.H) threat(ctx, { id: 'bk_grab', kind: 'lunge', from: { x: ST.H.x, y: ST.H.y }, to: { x: p.x, y: p.y - 6 }, in: GRAB.tele + 0.3, dur: GRAB.lunge, width: 20 });   /* chỉ cú ngoạm TUỲ CHỌN né được (mốc máu = bắt buộc, không khai báo) */
  ST.lastGrab = ST.t; callout(ctx, L(ctx).grabTele, 1.4); ctx.sfx('roar_big'); if (ctx.quake) ctx.quake(0.12); ST.stats.grabs = (ST.stats.grabs || 0) + 1; log('GRAB tele ' + (forced ? 'forced' : 'skill') + ' → ' + dest.z);
  if (MOS.mod && MOS.mod.mosaicPrewarm) { try { MOS.mod.mosaicPrewarm(ctx, dest.z, 2); } catch (e) { /* bỏ qua */ } }
  return true;
}
function struggle(ctx) {
  const G = ST.grab; if (!G || G.ph !== 'carry') return; G.mash += 1; G.shake = 0.18; G.taps = (G.taps || 0) + 1; ctx.sfx('knock_wall');
  if (G.mash >= GRAB.need) { G.ph = 'escape'; G.t = 0; ST.stats.escapes = (ST.stats.escapes || 0) + 1; callout(ctx, L(ctx).free, 1.6); ctx.sfx('whoosh_big'); fx('bk_snap', ctx.S.player.x, ctx.S.player.y - 20, { top: true }); log('ESCAPE taps ' + G.taps); }
}
function grabTick(ctx, dt) {
  const G = ST.grab, H = ST.H, p = ctx.S.player; if (!G || !H) return; G.t += dt; if (G.shake > 0) G.shake -= dt; if (G.hurt > 0) G.hurt -= dt;
  if (G.ph === 'tele') {   /* dựng thân, há kìm, lượn tới điểm đứng đối diện người chơi */
    const a = Math.atan2(H.y - p.y, H.x - p.x); steer(ctx, dt, p.x + Math.cos(a) * 72, p.y + Math.sin(a) * 60, 160, 5); zTo(dt, BZ(ctx) + 6, 60); H.open = 1; trailPush();
    if (G.t >= GRAB.tele) { G.ph = 'lunge'; G.t = 0; G.tx = p.x; G.ty = p.y; ctx.sfx('whoosh_big'); } return; }
  if (G.ph === 'lunge') {
    const tx = G.forced ? p.x : G.tx, ty = (G.forced ? p.y : G.ty) - 8, dx = tx - H.x, dy = ty - H.y, d = Math.hypot(dx, dy) || 1, st = Math.min(d, 480 * dt);
    H.a = Math.atan2(dy, dx); H.x += dx / d * st; H.y += dy / d * st; H.open = 1; zTo(dt, BZ(ctx), 120); trailPush();
    const dp = Math.hypot(p.x - H.x, p.y - 8 - H.y);
    if (dp < 16 || (G.forced && G.t > GRAB.lunge)) return bite(ctx);
    if (!G.forced && (d < 3 || G.t > GRAB.lunge + 0.2)) { ST.grab = null; ST.cd.grab = 20; callout(ctx, L(ctx).grabMiss, 1.0); fx('bk_snap', H.x, H.y - 20, { top: true }); log('grab miss'); }
    return; }
  if (G.ph === 'carry') {
    if (ctx.S.mode !== 'bkcarry') ctx.setMode('bkcarry');
    G.dmgT -= dt; if (G.dmgT <= 0) { G.dmgT = GRAB.dmgEvery; const h = ctx.hero, k = 1 - Math.min(0.6, G.mash / GRAB.need * 0.6);   /* sát thương nhẹ đều; giãy tốt → nhẹ hơn; KHÔNG làm ngất giữa không trung */
      if (h && !h.fainted && h.hp > h.max * 0.15) { h.hit(Math.max(1, Math.round(h.max * GRAB.dmg * k))); G.hurt = 0.22; ST.stats.carryHits = (ST.stats.carryHits || 0) + 1; } }
    G.mash = Math.max(0, G.mash - dt * 0.7);
    /* 2026-10-16 anh: bỏ Rocky bay theo cắn đầu trong cảnh tha (trước: +3 giãy, rết mất 2 % máu) */
    if (G.t >= GRAB.carry) land(ctx, 'drop'); return; }
  if (G.ph === 'escape') { if (G.t >= GRAB.esc) land(ctx, 'escape'); }
}
function bite(ctx) {
  const G = ST.grab, p = ctx.S.player, h = ctx.hero; G.ph = 'carry'; G.t = 0; G.src = zidOf(ctx); G.dirA = null;
  ctx.sfx('smash'); if (ctx.quake) ctx.quake(0.25); fx('bk_snap', p.x, p.y - 20, { top: true });
  if (h && !h.fainted && h.hp > h.max * 0.2) h.hit(Math.max(1, Math.round(h.max * 0.04)));
  if (p.endAct) p.endAct(); p.autoPath = null; p.moving = false;
  ctx.setMode('bkcarry'); ctx.onAction('bkcarry', () => struggle(ctx)); ctx.registerCloser('bkcarry', () => struggle(ctx));
  callout(ctx, L(ctx).grabbed, 2.6); ST.stats.carries = (ST.stats.carries || 0) + 1; log('BITE carry ' + G.src + ' → ' + G.dest.z);
}
function land(ctx, how) {
  const G = ST.grab; if (!G) return; ST.grab = null; ST.travel = { dest: G.dest, how, from: G.src }; ST.visited.push(G.dest.z);
  ST.carryLog = (ST.carryLog || []).concat([{ from: G.src, to: G.dest.z, how, taps: G.taps || 0, rk: !!(G.rk && G.rk.bit), t: +ST.t.toFixed(1) }]);
  ctx.setMode('play'); ctx.S.altPend = { x: ctx.S.player.x, y: ctx.S.player.y, h: how === 'escape' ? 120 : 40, rk: true };   /* toạ độ thật đặt lại trong onZoneEnter (sau khi bản đồ dựng) */
  log('LAND ' + how + ' → ' + G.dest.z);
  try { if (typeof window !== 'undefined' && window.__enterZone) window.__enterZone(G.dest.z, G.dest.entry || 'default'); else ctx.travel(G.dest.z, G.dest.entry || 'default'); } catch (e) { console.error('bk land', e); }
}
/* chỗ đáp ở vùng đích: ô đi được, thoáng 5×5, hợp địa hình mong muốn (biển: bãi cát sát nước — KHÔNG trên bè / giữa nước) */
function landSpot(ctx, dest) {
  const m = ctx.S.map, p = ctx.S.player, e0 = m.entries[dest.entry || 'default'] || m.entries.default, reach = ctx.computeReach ? ctx.computeReach(m, e0) : null, sx = e0.x, sy = e0.y;
  const wet = (tx, ty) => { const t = m.ground[ty * m.w + tx]; return t === TT.WATER || t === TT.DEEP || t === TT.REEF; };
  let best = null, bs = -1e9;
  for (let k = 0; k < 2400 && !(k >= 1600 && best); k++) { const relax = k >= 1600, mg = relax ? 2 : 6, tx = mg + Math.floor(Math.random() * (m.w - mg * 2)), ty = mg + 1 + Math.floor(Math.random() * (m.h - mg * 2 - 3));   /* xa mép bản đồ (không có thì nới) */ if (ctx.isSolid(m, tx, ty) || wet(tx, ty) || ctx.isSolid(m, tx, ty + 1) || wet(tx, ty + 1)) continue;   /* ô dưới cũng phải đi được (đáp / bị đập lệch vài px không rơi xuống nước) */ const isl = dest.isle && !relax; if (isl && Math.hypot((tx - dest.isle.x) / dest.isle.rx, (ty - dest.isle.y) / dest.isle.ry) > 1) continue; if (!isl && reach && !reach.all && !reach[ty * m.w + tx]) continue;   /* Biển: thả lên ĐẢO cát giữa biển (bờ bến cảng chỉ 2 hàng ô sát mép bản đồ) — rời đảo bằng chong chóng / bơi */
    let open = 0, water = 0; for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { if (!ctx.isSolid(m, tx + dx, ty + dy)) open++; } for (let dy = -5; dy <= 5; dy += 1) for (let dx = -5; dx <= 5; dx += 1) { const ax = tx + dx, ay = ty + dy; if (ax >= 0 && ay >= 0 && ax < m.w && ay < m.h && wet(ax, ay)) water++; }
    if (open < (relax ? 12 : dest.isle ? 14 : 21)) continue; const x = tx * TS + 8, y = ty * TS + 10, ter = ctx.terrain ? ctx.terrain.at(x, y) : 'plain';
    let sc = open - Math.hypot(tx - sx, ty - sy) * 0.12; for (const n of ctx.S.npcs || []) if (Math.hypot(n.x - x, n.y - y) < 40) sc -= 12;   /* tránh đáp lên đầu dân */
    if (dest.want === 'beach') sc += (ter === 'sand' ? 18 : -10) + (water > 6 ? 22 : water > 0 ? 8 : -20);
    else if (dest.want && ter === dest.want) sc += 25;
    if (sc > bs) { bs = sc; best = { x, y, ter }; } }
  void p; return best;
}
function overWater(ctx, x, y) { const m = ctx.S.map; if (!m || !m.ground || m.air || m.sky) return false; const tx = Math.floor(x / TS), ty = Math.floor(y / TS); if (tx < 0 || ty < 0 || tx >= m.w || ty >= m.h) return false; const t = m.ground[ty * m.w + tx]; return t === TT.WATER || t === TT.DEEP || t === TT.REEF; }
function landingTick(ctx, dt) { const Lg = ST.landing; if (!Lg || Lg.zone !== zidOf(ctx)) { ST.landing = null; return; } Lg.t += dt;
  if (!Lg.done && Lg.t > 0.05 && ctx.S.mode === 'play') { Lg.done = true; const t = L(ctx), nm = zname(ctx, Lg.zone);
    if (Lg.how === 'drop') { if (ctx.alt && ctx.alt.knockV && ctx.alt.h() > 1) ctx.alt.knockV(-ctx.alt.h(), { slam: true }); callout(ctx, t.dropTo(nm), 2.2); }
    else { if (ctx.alt && ctx.alt.set) ctx.alt.set(0); callout(ctx, t.freeTo(nm), 2.2); }
    log('landing ' + Lg.how + ' h ' + (ctx.alt ? Math.round(ctx.alt.h()) : '-')); }
  if (Lg.t > 8) ST.landing = null; }
let CSSON = null;
function fightCss(on2) {   /* trong trận: ẩn các dòng nhiệm vụ / hướng dẫn góc trái (gặp nghệ sĩ, đốt lửa, mục tiêu, cốt truyện) — chỉ 1 lớp CSS, không sửa HUD */
  if (typeof document === 'undefined' || CSSON === on2) return; CSSON = on2;
  if (!document.getElementById('bk-fight-css')) { const st = document.createElement('style'); st.id = 'bk-fight-css'; st.textContent = 'body.bk-fight #h-quest, body.bk-fight #h-task, body.bk-fight #h-target, body.bk-fight #h-story { display: none !important; } body.bk-fight #px-label { display: none !important; } body.bk-fight #faint-ui .fa-cd { background: rgba(18,10,30,.82); padding: 2px 9px 4px; border-radius: 4px; box-shadow: 0 0 0 2px #352022; }';   /* đếm ngược ngất nổi rõ trên đầu rết */ document.head.appendChild(st); }
  document.body.classList.toggle('bk-fight', !!on2); }
function markQuiet(ctx) { const s = ctx.S.save; s.sys ||= {}; (s.sys.seaRaft ||= {}).seen = true; }   /* trận cuối: không hiện hướng dẫn bè của Biển */

/* ---- THÂN GHÉP TỪ NHIỀU BỘ PHẬN (anh 2026-10-14: 'di chuyển mượt nhất có thể') ----
   · CHÂN RỜI: mỗi đốt 1 cặp chân (ảnh tách từ chính đốt PixelLab tseg / tsegb = 2 dáng: chống · nhấc), gắn ở mép giáp, XOAY theo tiếp tuyến thân
     + vung trước / sau theo SÓNG LỆCH PHA dọc thân (metachronal), tốc độ theo tốc độ bò; đứng yên = rung nhẹ. Ảnh xoay đệm 48 góc (như đốt).
   · ĐẦU NHÌN TỪ TRÊN (PixelLab, xoay mượt 360° — đệm 48 góc) + 2 RÂU đung đưa + 2 KÌM mở / khép theo H.open; dựng lên (rear) → hoà dần sang đầu 8 hướng cũ (có mặt + kìm to).
   · Đốt ngắn hơn (SP 6,5 · 34 đốt) → cong mượt, giáp chồng kín. */
const PART = { leg: null, rot: {} };
function partImg(n) { return img('boss/bakunawa/parts/' + n + '.png'); }
function legParts() {   /* tách chân phải từ ảnh đốt (đốt − giáp) → canvas chân + điểm gắn (logic, so với tâm ảnh) */
  if (PART.leg) return PART.leg; if (typeof document === 'undefined') return null;
  const out = [];
  for (const nm of ['tseg', 'tsegb']) { const s = SK(nm), pl = SK(SKIN.seg[0] + '_plate'); if (!s || !pl) return null; const W = s.naturalWidth, Hh = s.naturalHeight;
    const c = document.createElement('canvas'); c.width = W; c.height = Hh; const x = c.getContext('2d'); x.drawImage(s, 0, 0); const d = x.getImageData(0, 0, W, Hh);
    const c2 = document.createElement('canvas'); c2.width = W; c2.height = Hh; const x2 = c2.getContext('2d'); x2.drawImage(pl, 0, 0); const dp = x2.getImageData(0, 0, W, Hh).data;
    let ax = 1e9, ay = 0, n = 0; for (let y = 0; y < Hh; y++) for (let xx = 0; xx < W; xx++) { const i = (y * W + xx) * 4; if (dp[i + 3] > 20 || xx < W / 2) { d.data[i + 3] = 0; continue; } if (d.data[i + 3] > 20) { n++; if (xx < ax) { ax = xx; ay = y; } } }   /* chỉ giữ chân PHẢI (ngoài giáp) */
    { const a0 = new Uint8ClampedArray(d.data); for (let y = 1; y < Hh - 1; y++) for (let xx = 1; xx < W - 1; xx++) { const i = (y * W + xx) * 4; if (a0[i + 3] > 20) continue; let nb = false; for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (a0[((y + oy) * W + xx + ox) * 4 + 3] > 20) nb = true; if (nb) { d.data[i] = 42; d.data[i + 1] = 22; d.data[i + 2] = 64; d.data[i + 3] = 255; } }   /* viền tím sẫm 1 điểm → chân DÀY + rõ khớp (anh: chân như lông tua) */
      for (let y = 0; y < Hh - 1; y++) for (let xx = 0; xx < W; xx++) { const i = (y * W + xx) * 4; if (a0[i + 3] > 20 && a0[((y + 1) * W + xx) * 4 + 3] <= 20) { d.data[i] = Math.min(255, d.data[i] + 40); d.data[i + 1] = Math.min(255, d.data[i + 1] + 30); d.data[i + 2] = Math.min(255, d.data[i + 2] + 40); } } }   /* mép trên sáng = điểm nhấn */
    x.putImageData(d, 0, 0); out.push({ c, ax, ay, W, H: Hh }); }
  return (PART.leg = out);
}
function legRot(v, k, mir) {   /* ảnh chân v (0 chống / 1 nhấc), xoay k/48 vòng quanh điểm gắn, mir = chân trái (lật) → { c, ox, oy } */
  const key = v + ':' + k + ':' + mir; if (PART.rot[key]) return PART.rot[key]; const L = legParts(); if (!L) return null; const P = L[v], N = 48;
  const D = Math.ceil(Math.hypot(P.W, P.H)) * 2, c = document.createElement('canvas'); c.width = D; c.height = D; const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
  g.translate(D / 2, D / 2); g.rotate(k / N * TAU); if (mir) g.scale(-1, 1); g.drawImage(P.c, -P.ax, -P.ay); return (PART.rot[key] = { c, o: D / 2 });
}
function legAttach() { const L = legParts(); if (!L) return null; const P = L[0]; return { dx: (P.ax - P.W / 2) / 2, dy: (P.ay - P.H / 2) / 2 }; }   /* logic, ảnh hướng Bắc */
const LR2 = [1, -1];   /* plan-42 A9: cặp chân trái / phải (hằng, khai trước mọi lời gọi) */
function drawLegs(g, x, y, z, a, li, alpha) {   /* x, y = điểm thân (màn hình); a = hướng tiếp tuyến (về phía đầu) */
  const at = legAttach(); if (!at) return false; if (li > SEG_N || (ST.low && li % 2)) return true;   /* 2026-10-15 anh: 'nhiều chân' → 1 cặp chân MỖI đốt (trước 1 cặp / 2 đốt); đuôi không chân rời; máy yếu (gfxLow) về 1 cặp / 2 đốt */ const H = ST.H, sp = H ? Math.min(1, (H.sp || 0) / 120) : 0, moving = sp > 0.05 || !!ST.act;
  const ph = ST.t * (moving ? 6 + 9 * sp : 1.2) * TAU / 4 - li * 0.62, sw = moving ? Math.sin(ph) * (ST.low ? 0.5 : 0.28) : Math.sin(ST.t * 3 + li) * 0.05, lift = moving && Math.cos(ph) < 0 ? 1 : 0;   /* sóng lệch pha dọc thân: vung trước (chống) → nhấc kéo về. 2026-10-15: chân mỗi đốt → biên độ vung 0,5 → 0,28 để chân kề không bắt chéo thành lông tua */
  const rot = a + Math.PI / 2, cosr = Math.cos(rot), sinr = Math.sin(rot), px = x - Math.cos(a) * SKIN.plateOff, py = y - Math.sin(a) * SKIN.plateOff - LIFT - z - 8;
  const ga0 = g.globalAlpha, sm0 = g.imageSmoothingEnabled; if (alpha < 1) g.globalAlpha = Math.max(0, alpha); g.imageSmoothingEnabled = false;   /* plan-42 A9: trả lại 2 thuộc tính thay save/restore; mảng [1, -1] hằng */
  for (const s of LR2) { const ang = rot + s * sw, k = ((Math.round(ang / TAU * 48) % 48) + 48) % 48, R = legRot(lift, k, s < 0); if (!R) continue;
    const lx = s * at.dx, ly = at.dy, wx = px + lx * cosr - ly * sinr, wy = py + lx * sinr + ly * cosr;
    g.drawImage(R.c, Math.round(wx - R.o / 2), Math.round(wy - R.o / 2), R.c.width / 2, R.c.height / 2); }
  g.globalAlpha = ga0; g.imageSmoothingEnabled = sm0; return true;
}
function drawSegFull(g, kind, x, y, z, a, alpha = 1, li = 0) { if (!drawLegs(g, x, y, z, a, li, alpha)) return drawSeg(g, kind, x, y, z, a, alpha, li); drawSeg(g, kind, x, y, z, a + (kind === 'tail' ? Math.sin(ST.t * 5) * 0.18 : 0), alpha, li, true); }   /* đốt = chân rời + giáp; đuôi: kìm đuôi co duỗi nhẹ */
/* ĐẦU nhìn từ trên: ảnh hướng Nam (mặt ở dưới) xoay đệm 48 góc; râu + kìm rời */
const HROT = {};
function headTopRot(k) { if (HROT[k]) return HROT[k]; const im = partImg('head_top'); if (!im || typeof document === 'undefined') return null; const w = im.naturalWidth, h = im.naturalHeight, D = Math.ceil(Math.hypot(w, h)) + 2, c = document.createElement('canvas'); c.width = D; c.height = D; const g = c.getContext('2d'); g.imageSmoothingEnabled = false; g.translate(D / 2, D / 2); g.rotate(k / 48 * TAU); g.drawImage(im, -w / 2, -h / 2); return (HROT[k] = c); }
function rotDraw(g, im, x, y, ang, pvx, pvy, alpha = 1, mir = false) { if (!im) return; g.save(); if (alpha < 1) g.globalAlpha = alpha; g.imageSmoothingEnabled = false; g.translate(Math.round(x), Math.round(y)); g.rotate(ang); if (mir) g.scale(-1, 1); g.drawImage(im, -pvx / 2, -pvy / 2, im.naturalWidth / 2, im.naturalHeight / 2); g.restore(); }
const HEADTOP_MAND = false;   /* 2026-10-14: đầu nhìn-từ-trên mới (PixelLab, px-bkhead.py top2 v5) đã vẽ sẵn kìm → không chồng kìm rời */
function drawHeadTop(g, x, y, z, a, open, alpha) {   /* a = hướng đầu; ảnh gốc mặt hướng Nam (π/2) */
  const k = ((Math.round((a - Math.PI / 2) / TAU * 48) % 48) + 48) % 48, c = headTopRot(k); if (!c) return false; const cy = y - LIFT - z - 6;
  const fx0 = Math.cos(a), fy0 = Math.sin(a), nx = -fy0, ny = fx0, t = ST.t;
  const ant = partImg('antenna'), mand = partImg('mandible');
  if (ant) for (const s of [1, -1]) { const sway = Math.sin(t * 2.6 + s) * 0.22; rotDraw(g, ant, x + fx0 * 10 + nx * s * 5, cy + fy0 * 10 + ny * s * 5, a + Math.PI / 2 + s * 0.45 + sway, ant.naturalWidth / 2, ant.naturalHeight, alpha, s < 0); }   /* râu (gốc ở đáy ảnh) đung đưa */
  g.save(); if (alpha < 1) g.globalAlpha = alpha; g.imageSmoothingEnabled = false; g.drawImage(c, Math.round(x - c.width / 4), Math.round(cy - c.height / 4), c.width / 2, c.height / 2); g.restore();
  if (mand && HEADTOP_MAND) for (const s of [1, -1]) { const op = 0.25 + Math.min(1, open) * 0.55; rotDraw(g, mand, x + fx0 * 14 + nx * s * 7, cy + fy0 * 14 + ny * s * 7, a + Math.PI / 2 + s * op, mand.naturalWidth / 2, mand.naturalHeight, alpha, s < 0); }   /* 2 kìm mở / khép */
  return true;
}
/* ---- CẮN ĐẬP ĐẤT (anh 2026-10-14): dựng thân → lao cắn → CẮM ĐẦU XUỐNG ĐẤT cùng người → nổ đất, hố to, người văng xa; rút đầu lên rơi đất ----
   Theo nền: đất (bk_slam_soil) · cát (bk_slam_sand) · nước (bk_bigsplash) · trời (bung sương lớn). Rung màn chỉ lúc va. Ki khai báo lunge. */
function groundKind(ctx, x, y) { const m = ctx.S.map; if (!m || m.air || m.sky) return 'sky'; if (overWater(ctx, x, y)) return 'water'; const tx = Math.floor(x / TS), ty = Math.floor(y / TS), gt = m.ground[ty * m.w + tx]; return (gt === TT.SAND || gt === TT.SAND2 || /^(m1|sea)$/.test(zidOf(ctx))) ? 'sand' : 'soil'; }
/* 2026-10-16 (anh duyệt gờ chui đất): CHẤT LIỆU mặt đất theo VÙNG (khỏi lốm đốm khi nền rải lẫn ô) — cho dải đất xới (bò TRÊN mặt) + gờ nhô (chui DƯỚI đất).
   đất: village / m2 / m3 / m5 (ô cát lẻ → cát) · cát: m1 / sea · đá vụn: m4 / m6 / m7 / m9 · tuyết: m8; vùng khác (đường nối…) theo ô. x, y = Ô ĐẤT (đã trừ gyOf).
   VFX đất bung / bụi / vành vẫn theo groundKind (chưa có bản đá riêng); tuyết dùng bụi / vành MÂY trắng (surfVfx). */
const SURF_Z = { village: 'soil', m2: 'soil', m3: 'soil', m5: 'soil', m1: 'sand', sea: 'sand', m4: 'rock', m6: 'rock', m7: 'rock', m9: 'rock', m8: 'snow' };
const ROCKY_T = [TT.ROCK, TT.COBBLE, TT.STONE, TT.GRAVEL, TT.ASH, TT.HEX, TT.DARK, TT.MARBLE, TT.HEXLIT, TT.CRACKD];
function surfOf(ctx, x, y) { const m = ctx.S.map; if (!m || !m.ground) return 'soil'; const tx = Math.floor(x / TS), ty = Math.floor(y / TS), gt = m.ground[ty * m.w + tx], z = SURF_Z[zidOf(ctx)];
  if (z && z !== 'soil') return z; if (gt === TT.SAND || gt === TT.SAND2 || (ctx.terrain && ctx.terrain.at && ctx.terrain.at(x, y) === 'sand')) return 'sand'; if (z) return z;
  if (gt === TT.SNOW || gt === TT.ICE) return 'snow'; return ROCKY_T.includes(gt) ? 'rock' : 'soil'; }
const surfVfx = (ctx, x, y, k) => { if (k !== 'soil') return k; const sf = surfOf(ctx, x, y - gyOf(ctx)); return sf === 'snow' ? 'cloud' : sf === 'rock' ? 'rock' : k; };   /* tuyết: bụi / vành pixel MÂY trắng thay đất nâu · 2026-10-16 đá: bụi / vành xám đá (rockVfx) */
/* 2026-10-16 (điều phối): VÙNG ĐÁ (surfOf 'rock': m4 / m6 / m7 / m9, ô đá ở đường nối) — bụi / vành / đất bung / đập đất chỗ rết chui xuống / trồi lên
   dùng CHÍNH ảnh VFX đất PixelLab (bk_erupt_soil, bk_slam_soil, bk_dustring, bk_kick_soil, bk_collar_soil) đổi màu SỐ HỌC sang xám đá lúc chạy
   (độ sáng giữ khối, tông xám hơi lạnh như soil_rock / crater_big_rock của gờ) — không tốn credit, không sửa manifest. x, y = điểm thân (trừ gyOf). */
const ROCK_FX = /^(bk_erupt_soil|bk_slam_soil|bk_dustring|bk_kick_soil|bk_collar_soil)$/;
function rockFx(n, x, y) { const c = ST.ctx; if (!c || !ROCK_FX.test(n) || surfOf(c, x, y - gyOf(c)) !== 'rock') return n; return n === 'bk_dustring' ? 'bk_dustring_rock' : n.replace(/_soil$/, '_rock'); }
function rockVfx(n) {   /* bản xám đá của 1 VFX đất (cache; ảnh nguồn chưa nạp → thử lại lần sau) */
  if (RKV[n]) return RKV[n]; const base = n === 'bk_dustring_rock' ? 'bk_dustring' : n.replace(/_rock$/, '_soil'), b = ART.vfx && ART.vfx[base]; if (!b || !b.img || typeof document === 'undefined') return undefined;
  const im = b.img, W = im.__w || im.width, Hh = im.__h || im.height; let d = null; try { d = im.getContext('2d').getImageData(0, 0, W, Hh); } catch (e) { return (RKV[n] = b); }
  const a = d.data; for (let i = 0; i < a.length; i += 4) { if (!a[i + 3]) continue; const v = Math.min(255, (0.299 * a[i] + 0.587 * a[i + 1] + 0.114 * a[i + 2]) * 1.22 + 8); a[i] = Math.min(255, v * 0.99); a[i + 1] = Math.min(255, v * 0.97); a[i + 2] = Math.min(255, v * 1.04); }
  const cv = document.createElement('canvas'); cv.width = W; cv.height = Hh; cv.getContext('2d').putImageData(d, 0, 0); if (im.__hi) cv.__hi = im.__hi;   /* đánh dấu __hi SAU khi ghi điểm ảnh */
  if (im.__w) { cv.__w = W; cv.__h = Hh; Object.defineProperty(cv, 'width', { value: im.width }); Object.defineProperty(cv, 'height', { value: im.height }); }
  return (RKV[n] = { ...b, img: cv }); }
function impactFx(ctx, x, y, big = 1) {   /* nổ theo nền + hố to (đất / cát) */
  const k = groundKind(ctx, x, y);
  if (k === 'water') fx('bk_bigsplash', x, y);
  else if (k === 'sky') { if (fx('bk_burst_cloud', x, y, { ground: true })) fx('bk_collar_cloud', x, y, { ground: true, dur: 0.9 }); else if (ctx.air && ctx.air.fogBurst) { ctx.air.fogBurst(x, y - 6, { s: 1.2 * big, n: 14, dur: 1.8, col: '#eef0ff', top: false }); ctx.air.fogBurst(x, y - 14, { s: 0.7, n: 6, dur: 1.2, col: '#ffffff' }); } }   /* 2026-10-15 anh: đập xuống mặt mây = mây BUNG pixel (như cát văng) thay 20 khối sương mềm */
  else { const sn = k === 'sand' ? 'bk_slam_sand' : 'bk_slam_soil', s0 = VX(sn); fx(sn, x, y, { alpha: 0.78, dur: s0 ? s0.n / (s0.fps || 12) * 1.35 : 0, body: true }); fx('bk_dustring', x, y, { ground: true, alpha: 0.85, body: true });   /* 2026-10-14: bụi đập đất MỀM hơn (mờ hơn, chậm hơn) + vòng bụi lan sát đất */ if (groundOk(ctx, x, y - gyOf(ctx)) && !nearDecal(ctx, x, y, 40, true)) { addDecal(ctx, 'crater', x, y); if (!ST.tipCr && ST.boss) { ST.tipCr = true; setTimeout(() => { if (ST.boss && !ST.stuck) callout(ctx, L(ctx).stuckTip, 3); }, 1600); } } }   /* 2026-10-15: lần đầu có hố trong phiên chơi → nhắc mẹo bẫy kẹt đầu */
  return k;
}
function startSlam(ctx, tp) { const H = ST.H; ST.act = { k: 'slam', ph: 'rear', t: 0, tx: tp.x, ty: tp.y }; callout(ctx, L(ctx).slam, 1.2); ctx.sfx('spar_charge'); threat(ctx, { id: 'bk_slam', kind: 'lunge', from: { x: H.x, y: H.y }, to: { x: tp.x, y: tp.y - 6 }, in: 0.75, dur: 0.25, width: 26 }); }
function slamTick(ctx, A, H, p, dt) {
  if (A.ph === 'rear') { H.open = 1; ST.rear = 1; zTo(dt, BZ(ctx) + 18, 80); if (A.h0 == null) A.h0 = H.a; const a = A.h0 + Math.max(-1, Math.min(1, angDiff(Math.atan2(p.y - H.y, p.x - H.x), A.h0)));   /* plan-40: dựng thân ngoảnh ≤ 1 rad */ H.a += angDiff(a, H.a) * Math.min(1, dt * 6); A.tx = p.x; A.ty = p.y; trailPush(); if (A.t >= 0.75) { A.ph = 'lunge'; A.t = 0; ctx.sfx('whoosh_big'); } return; }
  if (A.ph === 'lunge') { const dx = A.tx - H.x, dy = A.ty - H.y, d = Math.hypot(dx, dy) || 1, st = Math.min(d, 520 * dt); H.a = Math.atan2(dy, dx); H.x += dx / d * st; H.y += dy / d * st; zTo(dt, 0, 260); trailPush();
    if (d < 6 || A.t > 0.3) { A.ph = 'dig'; A.t = 0; const hit = Math.hypot(p.x - H.x, p.y - 6 - H.y) < 22, trap = !!ST.boss && groundOk(ctx, H.x, H.y) && craterAt(ctx, H.x, H.y, TRAP.r); const k = impactFx(ctx, H.x, H.y, 1.3); if (ctx.quake) ctx.quake(0.3); ctx.sfx('smash'); if (ctx.chase) ctx.chase.impact(H.x, H.y, 34, { pw: 5, src: H });
      if (hit) { hurtPlayer(ctx, DMG.bite * 1.3, { x: H.x - Math.cos(H.a) * 20, y: H.y - Math.sin(H.a) * 20 }, 'fly', 1.6, 'slam'); ST.stats.slamHit = (ST.stats.slamHit || 0) + 1; }
      const rp = rkPos(ctx); if (rp && Math.hypot(rp.x - H.x, rp.y - H.y) < 30) hurtRocky(ctx, DMG.bite, H, 70, 'fly'); ltHitAt(ctx, q => Math.hypot(q.x - H.x, q.y - H.y) < 30, DMG.bite, H, 'fly'); ST.stats.slams = (ST.stats.slams || 0) + 1; log('SLAM ' + k + (hit ? ' hit' : '') + (trap ? ' TRAP' : '')); if (trap) trapHead(ctx, trap); } return; }
  if (A.ph === 'dig') { H.z = Math.max(-12, H.z - 120 * dt); H.open = 1; trailPush(); if (A.t >= 0.6) { A.ph = 'pull'; A.t = 0; } return; }   /* đầu cắm sâu */
  if (A.ph === 'pull') { zTo(dt, BZ(ctx), 90); H.x -= Math.cos(H.a) * 30 * dt; H.y -= Math.sin(H.a) * 30 * dt; trailPush(); if (!A.dropFx && A.t > 0.15) { A.dropFx = true; const k = groundKind(ctx, H.x, H.y); if (k === 'soil' || k === 'sand') ST.erupts.push({ n: k === 'sand' ? 'bk_erupt_sand' : 'bk_erupt_soil', x: H.x, y: H.y, t: 0 }); } if (A.t >= 0.55) { ST.act = null; if (bodyTurn() > 150) { const c = C0(ctx); let x = H.x + Math.cos(H.a) * 170, y = H.y + Math.sin(H.a) * 170; if (moveScore(ctx, H, x, y) < 0.5) { x = c.x + (c.x - H.x) * 0.3; y = c.y + (c.y - H.y) * 0.3; } ST.mv = { k: 'uncoil', x, y, t: 0, T: 1.5, ph: 0 }; ST.gcd = Math.max(ST.gcd || 0, 1.6); ST.stats.slamOut = (ST.stats.slamOut || 0) + 1; } } }   /* rút đầu lên, đất rơi khỏi đầu */   /* 2026-10-16: thân đang cong (vừa vòng đầu + lao) → bò thẳng ra trước 1,5 s cho thân duỗi, không quay ngược tìm người ngay; chiêu nối (Sét Bão) chờ ≥ 1,6 s cho duỗi xong */
}

function trapHead(ctx, d) {   /* 2026-10-15 anh (công dụng hố): Cắn Đập Đất trúng HỐ CŨ → đầu cắm kẹt dưới hố, choáng TRAP.stun s; rút ra thì hố bị LẤP (không lợi dụng mãi) */
  const b = ST.boss; if (!b || ST.stuck) return; ST.act = null; ST.tele = []; b.stunT = Math.max(b.stunT || 0, TRAP.stun); ST.stuck = { x: d.x, y: d.y, d, t: 0, puffT: 0.5 };
  const H = ST.H; H.x = d.x; H.y = d.y; callout(ctx, L(ctx).stuck, 2.4); fx('knock_dizzy', d.x, d.y - 22, { top: true }); ctx.sfx('knock_wall'); ST.stats.stuck = (ST.stats.stuck || 0) + 1; log('TRAP stuck @' + Math.round(d.x) + ',' + Math.round(d.y));
}
function trapTick(ctx, mo, dt) {   /* đang kẹt: đầu chìm dưới hố, cổ giật giằng (mạnh dần lúc sắp thoát), bụi phụt ngắn mỗi giây; hết choáng → giật đầu lên, đất bung, lấp hố */
  const S2 = ST.stuck, H = ST.H; S2.t += dt; H.z = Math.max(-9, H.z - 70 * dt); H.sp = 0; H.open = 1; H.x = S2.x + Math.sin(S2.t * 34) * (mo.stunT > 0.5 ? 1.2 : 2.6); H.y = S2.y;
  if ((S2.puffT -= dt) <= 0) { S2.puffT = 1.0; const k = groundKind(ctx, S2.x, S2.y); if (k === 'soil' || k === 'sand') fx('bk_dustring', S2.x, S2.y, { ground: true, alpha: 0.55, body: true }); }
  if (mo.stunT <= 0) { const k = groundKind(ctx, S2.x, S2.y); if (k === 'soil' || k === 'sand') ST.erupts.push({ n: k === 'sand' ? 'bk_erupt_sand' : 'bk_erupt_soil', x: S2.x, y: S2.y, t: 0 }); const L2 = GC.by[zidOf(ctx)] || [], i = L2.indexOf(S2.d); if (i >= 0) L2.splice(i, 1); ST.stuck = null; ctx.sfx('smash'); log('TRAP free'); }
}

/* ---- SIẾT KÉO HẤT (thay Vòng Siết — anh 2026-10-14) ----
   tele (sương tối + gầm) → lao ngoạm → QUẤN CHẶT quanh người (vòng xoắn ~8–10 đốt, đầu dựng trên nhìn xuống) → siết 1,6 s (giãy A / E, Rocky đánh vòng quấn giúp; giãy đủ → thoát, trùm choáng)
   → KÉO XUỐNG (đất / nước / biển mây; màn tối nhẹ, nổ theo nền) → trồi lên chỗ khác HẤT người lên cao ('launch' mạnh) → Giáp Nứt lộ ra ngay sau đó. */
const CONS = { tele: 1.0, lunge: 0.3, squeeze: 1.6, drag: 0.9, need: 8 };
function startCons(ctx, mo, at) { const p = ctx.S.player; ST.act = null; ST.tele = []; ST.shots = []; if (ctx.terrain) ctx.terrain.cancel(); ST.cons = { ph: 'tele', t: 0, at: at ?? 0.6, mash: 0, hp0: mo ? mo.hp : 0, rkT: 0.8, dmgT: 0.5, x: p.x, y: p.y };
  callout(ctx, L(ctx).cons, 1.6); ctx.sfx('roar_big'); if (ctx.quake) ctx.quake(0.15); ST.stats.ultN++; log('CONS start'); }
function consStruggle(ctx) { const C = ST.cons; if (!C || C.ph !== 'squeeze') return; C.mash += 1; C.shake = 0.18; ctx.sfx('knock_wall'); if (C.mash >= CONS.need) consFree(ctx, 'mash'); }
function consFree(ctx, why) { const C = ST.cons; if (!C) return; C.ph = 'free'; ST.postCons = true; C.t = 0; const b = ST.boss; if (b) b.stunT = Math.max(b.stunT || 0, 2.5); if (ctx.S.mode === 'bkcarry') ctx.setMode('play'); const p = ctx.S.player; if (C.hidP) { p.custom = C.prevCustom || null; C.hidP = false; } callout(ctx, L(ctx).consFree, 1.6); ctx.sfx('whoosh_big'); ST.stats.ultBurst++; fx('bk_burst', p.x, p.y - 10, { top: true }); log('CONS free ' + why); }
function consTick(ctx, dt) {
  const C = ST.cons, H = ST.H, p = ctx.S.player; if (!C || !H) return; C.t += dt; if (C.shake > 0) C.shake -= dt;
  if (C.ph === 'tele') { const a = Math.atan2(H.y - p.y, H.x - p.x); steer(ctx, dt, p.x + Math.cos(a) * 60, p.y + Math.sin(a) * 50, 170, 5, true); H.open = 1; zTo(dt, BZ(ctx) + 10, 60); trailPush(); C.x = p.x; C.y = p.y; if (C.t >= CONS.tele) { C.ph = 'lunge'; C.t = 0; ctx.sfx('whoosh_big'); } return; }
  if (C.ph === 'lunge') { const dx = p.x - H.x, dy = p.y - 8 - H.y, d = Math.hypot(dx, dy) || 1, st = Math.min(d, 480 * dt); H.a = Math.atan2(dy, dx); H.x += dx / d * st; H.y += dy / d * st; trailPush();
    if (d < 14 || C.t > CONS.lunge) { C.ph = 'wrap'; C.t = 0; C.ang = Math.atan2(H.y - p.y, H.x - p.x); C.x = p.x; C.y = p.y; if (p.endAct) p.endAct(); p.autoPath = null; ctx.setMode('bkcarry'); ctx.onAction('bkcarry', () => consStruggle(ctx)); ctx.registerCloser('bkcarry', () => consStruggle(ctx)); ctx.sfx('smash'); fx('bk_snap', p.x, p.y - 20, { top: true }); callout(ctx, L(ctx).consGrab, 2); log('CONS wrap'); } return; }
  if (C.ph === 'wrap' || C.ph === 'squeeze') {   /* đầu chạy vòng xoắn quanh người (thân theo vệt → quấn chặt), vòng nhỏ dần + nâng dần (xoắn ốc) rồi đầu dựng trên nhìn xuống */
    if (ctx.S.mode !== 'bkcarry') ctx.setMode('bkcarry');
    const k = Math.min(1, C.t / 0.7), R = 15 - 4 * k; C.ang += dt * (C.ph === 'wrap' ? 9 : 2.2) * (1 + (C.shake > 0 ? 0.5 : 0));
    if (C.ph === 'wrap' || C.t < 0.2) { H.x = C.x + Math.cos(C.ang) * R; H.y = C.y + Math.sin(C.ang) * R * 0.55; H.z = 2 + 18 * k; H.a = C.ang + Math.PI / 2; trailPush(); }
    if (C.ph === 'wrap' && C.t >= 0.75) { C.ph = 'squeeze'; C.t = 0; }   /* đầu dựng lên trên người, nhìn xuống */
    if (C.ph === 'squeeze') { const ah = C.ang + 0.3; H.x = C.x + Math.cos(ah) * 12; H.y = C.y - 2 + Math.sin(ah) * 7; H.z = 22; H.a = Math.atan2(C.y - H.y, C.x - H.x); H.open = 0.6 + 0.4 * Math.sin(C.t * 10); ST.rear = 1;   /* đầu DỰNG (ảnh 8 hướng có kìm) sát trên vòng quấn, nhìn xuống người */
      C.dmgT -= dt; if (C.dmgT <= 0) { C.dmgT = 0.5; const h = ctx.hero; if (h && !h.fainted && h.hp > h.max * 0.12) h.hit(Math.max(1, Math.round(h.max * 0.03 * (1 - Math.min(0.6, C.mash / CONS.need))))); }
      C.rkT -= dt; if (C.rkT <= 0 && !rkAway(ctx)) { C.rkT = 0.7; C.mash += 1; ST.stats.rkCons = (ST.stats.rkCons || 0) + 1; const e = rkEnt(ctx); if (e && ctx.rocky.haFire) ctx.rocky.haFire(Math.atan2(C.y - 10 - (e.y - 8), C.x - e.x), true); if (C.mash >= CONS.need) return consFree(ctx, 'rocky'); }   /* Rocky đánh vòng quấn */
      if (C.t >= CONS.squeeze) { C.ph = 'drag'; C.t = 0; C.prevCustom = p.custom; p.custom = () => {}; C.hidP = true; const k2 = impactFx(ctx, C.x, C.y, 1); if (ctx.quake) ctx.quake(0.25); ctx.sfx('smash'); C.kind = k2; log('CONS drag ' + k2); } }
    return; }
  if (C.ph === 'drag') { H.z = Math.max(-40, H.z - 90 * dt); trailPush(); if (C.t >= CONS.drag) {   /* trồi lên chỗ khác, HẤT người lên cao */
      let sp = null; for (let i = 0; i < 12 && !sp; i++) { const a = Math.random() * TAU, r = 70 + Math.random() * 40, x = C.x + Math.cos(a) * r, y = C.y + Math.sin(a) * r * 0.8; if (!lowTier(ctx) || groundOk(ctx, x, y) || overWater(ctx, x, y)) sp = { x, y }; }
      sp = sp || { x: C.x, y: C.y }; p.x = sp.x; p.y = sp.y; if (C.hidP) { p.custom = C.prevCustom || null; C.hidP = false; } ctx.setMode('play');
      headInit(ctx, sp.x - 6, sp.y + 4, -Math.PI / 2, -30); ST.H.z = -6; impactFx(ctx, sp.x, sp.y, 1.4); if (ctx.quake) ctx.quake(0.35); ctx.sfx('roar_big');
      hurtPlayer(ctx, 0.08, { x: sp.x, y: sp.y + 12 }, 'launch', 1.7, 'cons'); const b = ST.boss; if (b) b.hp = Math.min(b.hp, C.hp0);
      C.ph = 'out'; C.t = 0; ST.stats.ultCrush++; log('CONS launch'); ST.cd.crack = 0; setTimeout(() => { try { if (ST.boss && !ST.crack) startCrack(ctx); } catch (e) { /* bỏ qua */ } }, 900); } return; }   /* trồi lên = lộ khớp giáp (Giáp Nứt) */
  if (C.ph === 'out') { zTo(dt, BZ(ctx) + 8, 160); H.x += Math.cos(H.a) * 40 * dt; H.y += Math.sin(H.a) * 40 * dt; trailPush(); }   /* trồi dần: cổ và thân ló theo đầu */
  if (C.ph === 'out' || C.ph === 'free') { if (C.t >= 0.6) { ST.cons = null; ST.postCons = true; ST.cd.bite = Math.max(ST.cd.bite || 0, 1.5); } }
}
/* vẽ: vòng quấn quanh người — đốt phía SAU người vẽ trước, phía TRƯỚC vẽ sau + bán trong suốt (người vẫn đọc được) */
const CONS_YC = 7;
function consBody() {   /* vòng quấn dựng THẲNG từ hình xoắn quanh người (không qua vệt — vệt bị làm trơn sẽ bung vòng) */
  const C = ST.cons; if (!C || !(C.ph === 'wrap' || C.ph === 'squeeze') || !ST.body.length) return; const NC = 12, k = C.ph === 'wrap' ? Math.min(1, C.t / 0.6) : 1, n = Math.round(NC * k), R = 17, a0 = C.ang || 0;
  for (let i = 0; i < n && i < ST.body.length; i++) { const a = a0 - (i + 1) * 0.62, q = ST.body[i]; q.x = C.x + Math.cos(a) * R; q.y = C.y + CONS_YC + Math.sin(a) * R * 0.58; q.z = Math.max(2, 7 - i * 0.5);   /* 2026-10-14: tâm vòng (như vẽ) ngang thân người, không ngang đầu */ q.a = a - Math.PI / 2; }
  if (n < ST.body.length) { const last = ST.body[Math.max(0, n - 1)]; for (let i = n; i < ST.body.length; i++) { const q = ST.body[i], d = Math.hypot(q.x - last.x, q.y - last.y); if (i === n && d > SP * 1.6) { const u = SP / d; q.x = last.x + (q.x - last.x) * u; q.y = last.y + (q.y - last.y) * u; } } } }
function consFrontAlpha() { return 0.5; }
/* ---- XỚI ĐẤT (anh 2026-10-14: 'rết chui xuống đất thì đất bị xới lên; càn quét qua đâu cây cối đất đai chỗ đó bị xới') ----
   · Chui / trồi khỏi đất: VFX PixelLab bk_erupt_soil / bk_erupt_sand (đất cục + bụi) + HỐ (decal PixelLab hố đất viền cỏ rách / hố cát) nằm lại.
   · Thân bò qua: rãnh đất xới (decal PixelLab, xoay theo đường đi 16 góc) — vẽ ở drawGround (người / vật luôn ở trên); cỏ / bụi / hoa trên đường bị ĐÈ BẸP (ẩn tới hết trận);
     cây / rào / đá / quầy trúng đầu / thân → blast.smashObj (ảnh hư / đổ nát của CHÍNH vật) qua ctx.chase.impact. Tối đa 220 decal / vùng; hết trận 3 s sau → lành. */
const GC = { by: {}, flat: [], impT: 0, last: null, clearAt: 0 };
const DEC = { crater: ['crater_big_soil'], crater_sand: ['crater_big_sand'], crater_snow: ['crater_big_snow'], crater_rock: ['crater_big_rock'],   /* 2026-10-16: tuyết / đá */   /* 2026-10-14 anh: hố TO cỡ thân (ảnh 128×112 → 64×56 logic) */ furrow: ['furrow_w1', 'furrow_w2'], furrow_sand: ['furrow_wsand'] };   /* 2026-10-14 anh: rãnh RỘNG bằng thân rết (ảnh 64×48 → 32×24 logic) */
const decImg = n => img('boss/bakunawa/decal/' + n + '.png');
const DROT = {};
function decRot(n, k) { const key = n + k; if (DROT[key]) return DROT[key]; const im = decImg(n); if (!im || typeof document === 'undefined') return null; const w = im.naturalWidth, h = im.naturalHeight, D = Math.ceil(Math.hypot(w, h)) + 2, c = document.createElement('canvas'); c.width = D; c.height = D; const x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.translate(D / 2, D / 2); x.rotate(k / 16 * TAU); x.drawImage(im, -w / 2, -h / 2); return (DROT[key] = c); }
function gcList(ctx) { const z = zidOf(ctx); return (GC.by[z] ||= []); }
function addDecal(ctx, kind, x, y, a = 0) { const L2 = gcList(ctx), sf = surfOf(ctx, x, y - gyOf(ctx)), set = DEC[kind + (sf !== 'soil' ? '_' + sf : '')] || DEC[kind];   /* 2026-10-16: theo chất liệu vùng (cát / tuyết / đá) */ if (kind === 'crater') { let cr = L2.filter(q => q.crater); while (cr.length >= MOVE.crMax) { const old = cr.find(q => !(ST.stuck && ST.stuck.d === q)); if (!old) break; L2.splice(L2.indexOf(old), 1); cr = L2.filter(q => q.crater); } }   /* plan-40: tối đa 3 hố cùng lúc — hố cũ nhất lấp */ L2.push({ n: set[(Math.random() * set.length) | 0], x, y, k: ((Math.round(a / TAU * 16) % 16) + 16) % 16, crater: kind === 'crater' });
  if (L2.length > 100) { const i = L2.findIndex(d => !d.crater); L2.splice(i >= 0 ? i : 0, 1); } }
const craterAt = (ctx, x, y, r) => (GC.by[zidOf(ctx)] || []).find(d => d.crater && Math.hypot(d.x - x, d.y - y) < r);   /* 2026-10-15: hố cũ gần điểm đập (bẫy kẹt đầu) */
const nearDecal = (ctx, x, y, r, crater) => (GC.by[zidOf(ctx)] || []).some(d => !!d.crater === !!crater && Math.hypot(d.x - x, d.y - y) < r);   /* gộp: chỗ đã xới / đã có hố thì không đóng thêm (hết rối như mì) */
const FLAT = /^(bush|flower|grass|tallgrass|weed|fern|tuft|mushroom|reed|shrub)/;
function groundOk(ctx, x, y) { const m = ctx.S.map; if (!m || m.air || m.sky) return false; const tx = Math.floor(x / TS), ty = Math.floor(y / TS); if (tx < 0 || ty < 0 || tx >= m.w || ty >= m.h) return false; const gt = m.ground[ty * m.w + tx]; if (gt === TT.DOCK || gt === TT.BRIDGE || (TT.FLOOR != null && gt === TT.FLOOR)) return false;   /* cầu tàu / cầu gỗ / sàn: không xới */
  return !overWater(ctx, x, y) && !ctx.isSolid(m, tx, ty); }
function flatten(ctx, x, y, r) { const m = ctx.S.map; for (const o of m.objects) { if (o.ghost || !FLAT.test(o.type)) continue; const ox = o.x * TS + 8, oy = o.y * TS + 8; if (Math.hypot(ox - x, oy - y) > r) continue; o.ghost = true; o.bkFlat = true; GC.flat.push(o); fx('wood_chips', ox, oy); ST.stats.flat = (ST.stats.flat || 0) + 1; } }
/* ---- DẢI ĐẤT XỚI LIỀN (anh 2026-10-14: 'chỗ nó đi qua phải NỐI thành một vùng đất xới liền, KHÔNG còn cỏ bên trong') ----
   Vẽ DỒN vào canvas đệm theo ô 256×256 logic (ảnh 2× → giữ độ nét như ô nền), tạo dần khi cần:
   · lớp MÉP: kết cấu đất (PixelLab, lặp liền) tô tối hơn, bán kính R + 3 có gợn — chỉ lộ ở VIỀN ngoài dải;
   · lớp LÒNG: kết cấu đất xới / cát xới tô tròn liền dọc đường thân (bán kính R ≈ nửa bề ngang thân) → các lượt chồng nhau HỢP thành 1 vùng, không chồng con dấu.
   Mỗi khung chỉ vẽ thêm đoạn mới (rẻ); vẽ ra màn = 2 drawImage / ô đang thấy. Bay cao ẩn; hết trận xoá. */
const STRIP = { R: 12, CH: 256, by: {}, pat: {}, last: null };
const SM = {   /* 2026-10-16: kết cấu + màu theo chất liệu (soil_snow / soil_rock / clods_snow / clods_rock = đổi màu số học từ soil_dirt / clods_* PixelLab) */
  soil: { tex: 'soil_dirt', lip: 'rgba(34,20,10,.5)', dk: 'rgba(30,18,8,.55)', dk2: 'rgba(30,18,8,.5)', lt: 'rgba(150,108,70,.4)', cl: 'clods_dirt' },
  sand: { tex: 'soil_sand', lip: 'rgba(120,88,46,.24)', dk: 'rgba(150,112,62,.4)', dk2: 'rgba(150,112,62,.35)', lt: 'rgba(255,248,226,.45)', cl: 'clods_sand' },
  snow: { tex: 'soil_snow', lip: 'rgba(240,246,255,.72)', dk: 'rgba(70,86,122,.45)', dk2: 'rgba(70,86,122,.4)', lt: 'rgba(255,255,255,.55)', cl: 'clods_snow' },
  rock: { tex: 'soil_rock', lip: 'rgba(28,26,32,.45)', dk: 'rgba(26,24,30,.55)', dk2: 'rgba(26,24,30,.5)', lt: 'rgba(196,192,186,.45)', cl: 'clods_rock' } };
const texImg = n => img('boss/bakunawa/decal/' + n + '.png');
function stripLayer(ctx) { const z = zidOf(ctx); return (STRIP.by[z] ||= { ch: new Map() }); }
function stripChunk(Ly, cx0, cy0) { const k = cx0 + ',' + cy0; let c = Ly.ch.get(k); if (!c && typeof document !== 'undefined') { const mk = () => { const v = document.createElement('canvas'); v.width = STRIP.CH * 2; v.height = STRIP.CH * 2; const x = v.getContext('2d'); x.imageSmoothingEnabled = false; return v; }; c = { lip: mk(), fill: mk(), x: cx0 * STRIP.CH, y: cy0 * STRIP.CH }; Ly.ch.set(k, c); } return c; }
function stripPat(g, name, tint) {   /* kết cấu lặp neo theo toạ độ thế giới (liền giữa các ô đệm); tint = màu phủ (mép) */
  const key = name + (tint || ''); let P = STRIP.pat[key]; if (P) return P; const im = texImg(name); if (!im || typeof document === 'undefined') return null;
  let src = im; if (tint) { const c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight; const x = c.getContext('2d'); x.drawImage(im, 0, 0); x.globalCompositeOperation = 'source-atop'; x.fillStyle = tint; x.fillRect(0, 0, c.width, c.height); src = c; }
  P = g.createPattern(src, 'repeat'); return (STRIP.pat[key] = P); }
const jit = (x, y) => { const h = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453; return h - Math.floor(h); };
function stripStroke(ctx, x0, y0, x1, y1) {   /* đoạn thân mới → NÉT LIỀN (đầu tròn) vào các ô đệm nó chạm: mép (rộng hơn, tối) · lòng (rộng = thân) · rãnh cày dọc hướng bò · cục đất */
  const Ly = stripLayer(ctx), R = STRIP.R, sm = SM[surfOf(ctx, x1, y1 - gyOf(ctx))] || SM.soil;   /* 2026-10-16: chất liệu theo vùng (ô đất dưới thân) */
  const tex = sm.tex, lipTint = sm.lip, CH = STRIP.CH, len = Math.hypot(x1 - x0, y1 - y0) || 1, ux = (x1 - x0) / len, uy = (y1 - y0) / len, nx = -uy, ny = ux;
  const minx = Math.min(x0, x1) - R - 8, maxx = Math.max(x0, x1) + R + 8, miny = Math.min(y0, y1) - R - 8, maxy = Math.max(y0, y1) + R + 8, wj = 0.92 + 0.16 * jit(Math.round(x1 / 4), Math.round(y1 / 4));
  STRIP.acc = (STRIP.acc || 0) + len; const clods = []; while (STRIP.acc > 7) { STRIP.acc -= 7; const r0 = Math.random(); clods.push({ o: (Math.random() * 2 - 1) * (r0 < 0.35 ? R + 1.5 : R * 0.7), u: Math.random(), sx: (Math.random() * 3) | 0, sy: (Math.random() * 3) | 0 }); }   /* cục đất: rải trong lòng + lật lên ở mép */
  for (let cy0 = Math.floor(miny / CH); cy0 <= Math.floor(maxy / CH); cy0++) for (let cx0 = Math.floor(minx / CH); cx0 <= Math.floor(maxx / CH); cx0++) {
    const c = stripChunk(Ly, cx0, cy0); if (!c) continue;
    for (const [cv, tint, w] of [[c.lip, lipTint, 2 * R + 7], [c.fill, null, 2 * R]]) {
      const g = cv.getContext('2d'), P = stripPat(g, tex, tint); if (!P) continue; g.save(); g.imageSmoothingEnabled = false; g.setTransform(2, 0, 0, 2, -c.x * 2, -c.y * 2);
      if (P.setTransform && typeof DOMMatrix !== 'undefined') P.setTransform(new DOMMatrix([0.5, 0, 0, 0.5, 0, 0]));
      g.strokeStyle = P; g.lineCap = 'round'; g.lineJoin = 'round'; g.lineWidth = w * wj; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
      if (!tint) {   /* rãnh cày chạy DỌC hướng bò: 3 vệt tối + 2 gờ sáng */
        g.lineCap = 'butt'; g.lineWidth = 1;
        for (const [o, col] of [[-0.55, sm.dk], [0, sm.dk2], [0.55, sm.dk], [-0.28, sm.lt], [0.28, sm.lt]]) {
          g.strokeStyle = col; g.beginPath(); g.moveTo(x0 + nx * o * R - ux, y0 + ny * o * R - uy); g.lineTo(x1 + nx * o * R + ux, y1 + ny * o * R + uy); g.stroke(); }
        const cl = texImg(sm.cl); if (cl) for (const k of clods) { const x = x0 + (x1 - x0) * k.u + nx * k.o, y = y0 + (y1 - y0) * k.u + ny * k.o; g.drawImage(cl, k.sx * 20, k.sy * 20, 20, 20, Math.round(x - 5), Math.round(y - 5), 10, 10); }
      }
      g.restore(); }
  }
}
function drawStrip(g, ctx, cx, cy) { const Ly = STRIP.by[zidOf(ctx)]; if (!Ly || !Ly.ch.size || (ctx.altView && ctx.altView())) return; const VW = ctx.VW || 480, VH = ctx.VH || 270, CH = STRIP.CH; cy += gyOf(ctx);   /* mặt đất dưới thân = y − GY */ g.save(); g.imageSmoothingEnabled = false;
  for (const pass of ['lip', 'fill']) for (const c of Ly.ch.values()) { const X = c.x - cx, Y = c.y - cy; if (X > VW || Y > VH || X + CH < 0 || Y + CH < 0) continue; g.drawImage(c[pass], Math.round(X), Math.round(Y), CH, CH); }
  g.restore(); }
/* ---- GỜ NHÔ khi rết CHUI DƯỚI ĐẤT (anh 2026-10-16: 'bò trên mặt khác đùn xuống đất — đùn xuống thì có gợn cát nhô lên'; duyệt mẫu _wip/bkridge) ----
   Bò TRÊN mặt = dải đất xới lõm (STRIP). Đầu DƯỚI đất (H.z < −2, ô đất hợp lệ) = không thấy thân; Ụ ĐẦU 'đất nứt bung' (vfx_workbench 6 khung 10 fps, lưới 3×2 ô 104×92,
   tâm (52,46)) đi theo đầu, đứng yên thì RUNG ±1 px (pha báo Long Mạch / khoá Độn Thổ) + phía sau GỜ NHÔ: 'viên gờ' PixelLab 48×40 (→ 24×20 logic) mỗi 4 px, KHÔNG xoay
   (ánh sáng trên-trái luôn đúng); vẽ: bóng gộp 1 canvas (alpha .28) → vệt tơi (đang lún) → viền → lòng (_in) → nứt đỉnh (đất / tuyết, xoay 16 góc) → cục vụn 2 bên → ụ đầu.
   Gờ TƯƠI tới khi đầu đã đi xa 200 px (thân còn ngầm bên dưới) hoặc đầu trồi lên; rồi lún 1,2 s (vệt tơi hiện) và MỜ HẾT 1,6 s (anh chốt: không để vệt).
   Chất liệu surfOf: đất (ụ CỎ rách viền nếu ô dưới đầu là cỏ, không thì ụ ĐẤT) / cát / tuyết / đá vụn. Lưu theo điểm thân, vẽ dời −gyOf. Máy yếu: bỏ bóng gộp, thưa nứt / vụn. */
const RIDGE = { by: {}, STEP: 4, REL: 200, SINK: 1.2, FADE: 1.6, MAX: 420, off: null, cache: {} };
const rgImg = n => img('boss/bakunawa/ridge/' + n + '.png');
const RGK = {};
function rgKit(m) { if (RGK[m]) return RGK[m]; const k = { rim: [rgImg('stamp_' + m + '_a'), rgImg('stamp_' + m + '_b')], core: [rgImg('stamp_' + m + '_a_in'), rgImg('stamp_' + m + '_b_in')], flat: rgImg('stamp_' + m + '_flat'),
    crack: (m === 'soil' || m === 'snow') ? rgImg('crack_' + m) : null, clods: m === 'soil' ? texImg('clods_dirt') : m === 'sand' ? texImg('clods_sand') : rgImg('clods_' + m),
    hump: rgImg('fx/bk-ridge-heave-' + (m === 'soil' ? 'dirt' : m)), humpG: m === 'soil' ? rgImg('fx/bk-ridge-heave-grass') : null };
  return [...k.rim, ...k.core, k.flat, k.hump].every(Boolean) ? (RGK[m] = k) : k; }   /* ảnh chưa nạp xong → thử lại khung sau */
function rgLayer(ctx) { const z = zidOf(ctx); return (RIDGE.by[z] ||= { pts: [], hump: null, last: null, dist: 0 }); }
const rgH = (i, s) => { const v = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return v - Math.floor(v); };
const grassAt = (ctx, x, y) => { const m = ctx.S.map, tx = Math.floor(x / TS), ty = Math.floor(y / TS); if (!m || tx < 0 || ty < 0 || tx >= m.w || ty >= m.h) return false; const t = m.ground[ty * m.w + tx]; return t === TT.GRASS || t === TT.GRASS2 || t === TT.FLOWER; };
function ridgeHead(ctx, x, y, a) {   /* gọi mỗi khung khi đầu đang NGẦM trên ô đất hợp lệ — x, y = điểm thân (chưa trừ GY) */
  const Ly = rgLayer(ctx), G0 = gyOf(ctx), m = surfOf(ctx, x, y - G0), hp = Ly.hump, still = !!(hp && Math.hypot(x - hp.x, y - hp.y) < 0.6);
  Ly.hump = { x, y, m, grass: m === 'soil' && grassAt(ctx, x, y - G0), still, t: ST.t };
  const L0 = Ly.last, d = L0 ? Math.hypot(x - L0.x, y - L0.y) : 0;
  if (!L0 || d > 40) { Ly.last = { x, y }; if (L0) for (const p of Ly.pts) if (p.rel == null) p.rel = ST.t; return; }   /* lần đầu / dịch chuyển (Long Mạch, lặn phục kích): bắt đầu đoạn mới, đoạn cũ thả lún */
  let n = Math.floor(d / RIDGE.STEP); if (!n) return;
  for (let k = 1; k <= n; k++) { const u = k * RIDGE.STEP / d, px = L0.x + (x - L0.x) * u, py = L0.y + (y - L0.y) * u; Ly.dist += RIDGE.STEP; const i = (Ly.seq = (Ly.seq || 0) + 1), o = (rgH(i, 2) - 0.5) * 5, w = (rgH(i, 3) - 0.5) * 1.5;
    Ly.pts.push({ x: px, y: py, s: Ly.dist, a, v: (rgH(i, 1) * 2) | 0, i, m: surfOf(ctx, px, py - G0), jx: -Math.sin(a) * o + Math.cos(a) * w, jy: Math.cos(a) * o + Math.sin(a) * w, rel: null }); }   /* lệch NGANG ±2,5 → mép gồ ghề */
  Ly.last = { x: L0.x + (x - L0.x) * n * RIDGE.STEP / d, y: L0.y + (y - L0.y) * n * RIDGE.STEP / d }; ST.stats.ridge = (ST.stats.ridge || 0) + n;
  if (Ly.pts.length > RIDGE.MAX) Ly.pts.splice(0, Ly.pts.length - RIDGE.MAX);
}
function ridgeTick(ctx) {
  const Ly = RIDGE.by[zidOf(ctx)]; if (!Ly) return; const t = ST.t;
  if (Ly.hump && t - Ly.hump.t > 0.25) { Ly.hump = null; Ly.last = null; for (const p of Ly.pts) if (p.rel == null) p.rel = t; }   /* đầu đã trồi / rời đất: thả lún cả gờ */
  for (const p of Ly.pts) if (p.rel == null && Ly.dist - p.s >= RIDGE.REL) p.rel = t;   /* thân đã đi qua hết → bắt đầu lún */
  if (Ly.pts.length && Ly.pts[0].rel != null && t - Ly.pts[0].rel > RIDGE.SINK + RIDGE.FADE) Ly.pts = Ly.pts.filter(p => p.rel == null || t - p.rel <= RIDGE.SINK + RIDGE.FADE);
}
function rgSil(im) { const key = im.src; let c = RIDGE.cache[key]; if (c) return c; c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight; const x = c.getContext('2d'); x.drawImage(im, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = '#24170c'; x.fillRect(0, 0, c.width, c.height); return (RIDGE.cache[key] = c); }
function rgRot(im, k) { const key = im.src + '#' + k; let c = RIDGE.cache[key]; if (c) return c; const w = im.naturalWidth, h = im.naturalHeight, D = Math.ceil(Math.hypot(w, h)) + 2; c = document.createElement('canvas'); c.width = D; c.height = D; const x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.translate(D / 2, D / 2); x.rotate(k / 16 * TAU); x.drawImage(im, -w / 2, -h / 2); return (RIDGE.cache[key] = c); }
function drawRidge(g, ctx, cx, cy) {
  const Ly = RIDGE.by[zidOf(ctx)]; if (!Ly || (!Ly.pts.length && !Ly.hump) || (ctx.altView && ctx.altView()) || typeof document === 'undefined') return; cy += gyOf(ctx);   /* mặt đất dưới thân = y − GY */
  const VW = ctx.VW || 480, VH = ctx.VH || 270, t = ST.t, SK = RIDGE.SINK, F = RIDGE.FADE, low = ST.low, hp = Ly.hump;
  const live = Ly.pts.filter(p => (p.rel == null || t - p.rel < SK + F) && p.x - cx > -30 && p.y - cy > -30 && p.x - cx < VW + 30 && p.y - cy < VH + 30).sort((a, b) => a.y - b.y);
  const ag = p => (p.rel == null ? 0 : t - p.rel), fr = Math.floor(t * 10) % 6, tx = hp && hp.still ? [0, 1, 0, -1, 1, 0][fr] : 0;
  const hk = hp ? rgKit(hp.m) : null, him = hk ? ((hp.grass && hk.humpG) || hk.hump) : null;
  g.save(); g.imageSmoothingEnabled = false;
  if (!low) {   /* 1) bóng đổ gộp */
    const o = RIDGE.off || (RIDGE.off = document.createElement('canvas')); if (o.width !== VW * 2 || o.height !== VH * 2) { o.width = VW * 2; o.height = VH * 2; }
    const x = o.getContext('2d'); x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, o.width, o.height); x.setTransform(2, 0, 0, 2, 0, 0); x.imageSmoothingEnabled = false; let any = false;
    for (const p of live) { const a = ag(p); if (a >= SK) continue; const K = rgKit(p.m), im = K.rim[p.v]; if (!im) continue; const k = 1 - a / SK; x.globalAlpha = k; x.drawImage(rgSil(im), Math.round(p.x - cx + p.jx - 12 + 2 * k), Math.round(p.y - cy + p.jy - 10 + 3 * k), 24, 20); any = true; }
    if (him) { x.globalAlpha = 1; x.drawImage(rgSil(him), (fr % 3) * 104, ((fr / 3) | 0) * 92, 104, 92, Math.round(hp.x - cx - 26 + 3 + tx), Math.round(hp.y - cy - 23 + 4), 52, 46); any = true; }
    if (any) { g.globalAlpha = 0.28; g.drawImage(o, 0, 0, VW, VH); } }
  for (const p of live) { const a = ag(p); if (a <= 0) continue; const K = rgKit(p.m); if (!K.flat) continue; const al = a < SK ? a / SK : 1 - (a - SK) / F; if (al <= 0.02) continue; g.globalAlpha = Math.min(1, al) * 0.9; g.drawImage(K.flat, Math.round(p.x - cx + p.jx - 12), Math.round(p.y - cy + p.jy - 10), 24, 20); }   /* 2) vệt tơi */
  for (const pass of ['rim', 'core']) for (const p of live) { const a = ag(p); if (a >= SK) continue; const im = rgKit(p.m)[pass][p.v]; if (!im) continue; g.globalAlpha = 1 - a / SK; g.drawImage(im, Math.round(p.x - cx + p.jx - 12), Math.round(p.y - cy + p.jy - 10), 24, 20); }   /* 3) viền → 4) lòng */
  const ck = low ? 10 : 6, vk = low ? 6 : 3;
  for (const p of live) { const a = ag(p); if (p.i % ck || a >= SK * 0.6) continue; const K = rgKit(p.m); if (!K.crack) continue; const c = rgRot(K.crack, ((Math.round(p.a / TAU * 16) % 16) + 16) % 16); g.globalAlpha = 0.95 * (1 - a / (SK * 0.6)); g.drawImage(c, Math.round(p.x - cx - c.width / 4), Math.round(p.y - cy - c.height / 4 - 1), c.width / 2, c.height / 2); }   /* 5) nứt đỉnh */
  for (const p of live) { const a = ag(p); if (p.i % vk || a >= SK * 0.5) continue; const K = rgKit(p.m); if (!K.clods) continue; const nx = -Math.sin(p.a), ny = Math.cos(p.a);   /* 6) cục vụn 2 bên */
    for (const sd of [-1, 1]) { if (rgH(p.i, sd + 5) < 0.4) continue; const off = sd * (10 + rgH(p.i, sd + 7) * 3.5), sx = (rgH(p.i, sd + 9) * 3) | 0, sy = (rgH(p.i, sd + 11) * 3) | 0; g.globalAlpha = 1 - a / (SK * 0.5); g.drawImage(K.clods, sx * 20, sy * 20, 20, 20, Math.round(p.x - cx + nx * off - 5), Math.round(p.y - cy + ny * off - 5), 10, 10); } }
  g.globalAlpha = 1; if (him) g.drawImage(him, (fr % 3) * 104, ((fr / 3) | 0) * 92, 104, 92, Math.round(hp.x - cx - 26 + tx), Math.round(hp.y - cy - 23), 52, 46);   /* 7) ụ đầu */
  g.restore(); }
function groundTick(ctx, dt) {
  if (GC.clearAt && ST.t >= GC.clearAt) groundRestore(ctx);
  const H = ST.H; if (!H || inBk(ctx) || ST.ult || ST.death || ST.won || !(ST.boss || ST.mo2) || (tierNow(ctx) !== 'ground' && tierNow(ctx) !== 'mid')) { ridgeTick(ctx); return; }
  const s = ST.body[3] || H, G0 = gyOf(ctx); if (H.z < -2 && groundOk(ctx, H.x, H.y - G0)) ridgeHead(ctx, H.x, H.y, H.a); ridgeTick(ctx);   /* 2026-10-16: đầu NGẦM → gờ nhô + ụ đầu (không rãnh lõm) */
  if (s.z < 8 && s.z >= -2 && groundOk(ctx, s.x, s.y - G0)) {   /* rãnh lõm chỉ khi thân BÒ TRÊN MẶT (trước: cả lúc ngầm → giống hệt) */   /* nét LƯU theo điểm thân, VẼ dời −GY (drawStrip) */ const L0 = STRIP.last; if (L0 && L0.z === zidOf(ctx) && Math.hypot(s.x - L0.x, s.y - L0.y) < 40) { if (Math.hypot(s.x - L0.x, s.y - L0.y) >= 3) { stripStroke(ctx, L0.x, L0.y, s.x, s.y); STRIP.last = { x: s.x, y: s.y, z: zidOf(ctx) }; ST.stats.furrows = (ST.stats.furrows || 0) + 1; } } else STRIP.last = { x: s.x, y: s.y, z: zidOf(ctx) }; } else STRIP.last = null;   /* dải đất xới LIỀN theo đường thân (bỏ con dấu rời) */
  GC.impT -= dt; if (GC.impT <= 0 && (H.sp || 0) > 20) { GC.impT = 0.22; for (const q of [H, ST.body[3], ST.body[5], ST.body[8], ST.body[11], ST.body[14], ST.body[17]]) { if (!q || q.z > 12 || q.z < -4) continue; flatten(ctx, q.x, q.y - G0, STRIP.R + 6);   /* cỏ dưới thân đang thấy */ if (ctx.chase) ctx.chase.impact(q.x, q.y, 11, { pw: q === H ? 4 : 3, src: { x: q.x - Math.cos(q.a || 0) * 8, y: q.y - Math.sin(q.a || 0) * 8 }, dmg: 6 }); } }   /* đầu / thân quét qua: cây, rào, đá… vỡ theo ảnh của chính vật */
}
function groundRestore(ctx) { GC.clearAt = 0; for (const o of GC.flat) { o.ghost = false; delete o.bkFlat; } GC.flat = []; GC.by = {}; GC.last = null; STRIP.by = {}; STRIP.last = null; RIDGE.by = {}; log('ground restored'); void ctx; }
function drawDecals(g, ctx, cx, cy) { const L2 = GC.by[zidOf(ctx)]; if (!L2 || !L2.length) return; if (ctx.altView && ctx.altView()) return; cy += gyOf(ctx);   /* hố / rãnh: mặt đất dưới thân = y − GY */   /* bay cao (≥ 60 m, main.js vẽ đất thu nhỏ): ẩn lớp đất xới — không lệch tỉ lệ / bật lại khi đáp */ const VW = ctx.VW || 480, VH = ctx.VH || 270; g.save(); g.imageSmoothingEnabled = false;
  for (const pass of [0, 1]) for (const d of L2) { if (d.crater) continue; const X = d.x - cx, Y = d.y - cy; if (X < -40 || Y < -40 || X > VW + 40 || Y > VH + 40) continue; const c = d.crater ? decImg(d.n) : decRot(pass ? d.n + '_in' : d.n, d.k); if (!c) continue; const w = (c.naturalWidth || c.width) / 2, h = (c.naturalHeight || c.height) / 2; g.globalAlpha = L2.length - L2.indexOf(d) > 45 ? 0.62 : 1; g.drawImage(c, Math.round(X - w / 2), Math.round(Y - h / 2 + (d.crater ? 2 : 0)), w, h); }   /* 2 lượt: viền rãnh rồi lòng rãnh (bản co viền) phủ lên → rãnh liền một dải, không thành chuỗi khoanh */
  for (const d of L2) if (d.crater) { const X = d.x - cx, Y = d.y - cy; if (X < -40 || Y < -40 || X > VW + 40 || Y > VH + 40) continue; const c = decImg(d.n); if (c) g.drawImage(c, Math.round(X - c.naturalWidth / 4), Math.round(Y - c.naturalHeight / 4 + 2), c.naturalWidth / 2, c.naturalHeight / 2); }   /* hố nằm trên rãnh */
  g.globalAlpha = 1; g.restore(); }
function drawErupts(g, cx, cy, G = 6) { for (const e of ST.erupts) { const s = VX(rockFx(e.n, e.x, e.y)); if (!s || !s.img) continue; const f = Math.min(s.n - 1, Math.floor(e.t * (s.fps || 14))), hi = s.img.__hi ? 1 : 2; g.save(); g.imageSmoothingEnabled = false; g.drawImage(s.img, f * s.w * hi, 0, s.w * hi, s.h * hi, Math.round(e.x - cx - 68), Math.round(e.y - cy - 32 - G), s.w, s.h); g.restore(); } }   /* gốc VFX ở (68, 32); G = độ dời mặt đất (trước: 6; đất: GY) */
/* ---- XUYÊN MẶT MÂY / ĐẤT / NƯỚC (anh 2026-10-14: 'chui vào mây chưa hợp lý — phải có mây sương') ----
   Chỗ thân cắt mặt phẳng z = 0: CỔ SƯƠNG dày (khối fogTint) cuộn quanh điểm giao, phồng lên khi thân lao nhanh; hố sương tối hơn phía dưới;
   sợi sương bong ra trôi 1–2 s (aircombat fogBurst); trồi lên = bung sương toả ra (+ bụi đất / nước bắn tuỳ nền). Đốt mờ dần qua ~3 đốt. */
const sinkA = z => (z >= 2 ? 1 : Math.max(0, Math.min(1, (z + 10) / 12)));
const CK = { sky: { puff: '#f1f3ff', rim: '#6f74a6', wisp: '#e6eaff' }, ground: { puff: '#b39472', rim: '#4a3523', wisp: '#a0835f' }, water: { puff: '#eef8ff', rim: '#2f5f86', wisp: '#dff2ff' } };
function crossKind(ctx, x, y) { const m = ctx.S.map; if (!m || m.air || m.sky || !lowTier(ctx) && tierNow(ctx) !== 'mid') return 'sky'; return overWater(ctx, x, y) ? 'water' : 'ground'; }
function crossings() {   /* điểm giao của thân với mặt z = 0 (nội suy giữa 2 điểm thân kề nhau) */
  const H = ST.H; if (!H) return []; const pts = [H, ...ST.body], out = [];
  for (let i = 0; i < pts.length - 1; i++) { const a = pts[i], b = pts[i + 1]; if ((a.z >= 0) === (b.z >= 0)) continue; const u = a.z / ((a.z - b.z) || 1); out.push({ x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u, i, up: a.z >= 0 }); }
  if (!out.length && H.z < 3 && H.z > -10 && ST.body.length && ST.body[0].z < 0) out.push({ x: H.x, y: H.y, i: 0, up: false });
  return out;
}
function crossTick(ctx, dt) {
  const H = ST.H; if (!H || ST.ult || (ST.grab && (ST.grab.ph === 'carry' || ST.grab.ph === 'escape'))) { ST.cross = []; return; }
  const cs = crossings(), sp = Math.min(400, H.sp || 0), A = ctx.air; ST.cross = cs; ST.crossK = Math.max(0, (ST.crossK || 0) - dt * 1.5);
  const under = H.z < 0; if (ST.headUnder != null && under !== ST.headUnder && A && A.fogBurst) {   /* đầu vừa CHUI xuống / TRỒI lên */
    const k = crossKind(ctx, H.x, H.y), C = CK[k], up = !under; ST.crossK = 1;
    if (k === 'sky' && !fx('bk_burst_cloud', H.x, H.y, { ground: true })) { A.fogBurst(H.x, H.y - 4, { s: up ? 1.1 : 0.8, n: up ? 14 + Math.round(sp / 40) : 9, dur: 2.0, col: C.wisp, top: false }); A.fogBurst(H.x, H.y - 10, { s: 0.6, n: 6, dur: 1.4, col: '#ffffff', top: true }); }   /* 2026-10-15: mặt mây cũng bung PIXEL; còn sương mềm chỉ khi thiếu ảnh */   /* bung sương TO (+ lớp sáng phía trên) — CHỈ trên trời; 2026-10-15 anh ('bụi dày, làm VFX pixel'): đất / cát / nước dùng VFX pixel bên dưới */
    if (k === 'water') { fx('tr_splash_px', H.x, H.y, { ground: false }); fx('bk_kick_water', H.x, H.y + 2, { ground: true }); } else if (k === 'ground') { const sandy = groundKind(ctx, H.x, H.y) === 'sand' || (ctx.terrain && ctx.terrain.at(H.x, H.y) === 'sand'); const snowy = surfVfx(ctx, H.x, H.y, 'soil') === 'cloud'; if (!snowy) fx('bk_dustring', H.x, H.y, { ground: true, alpha: 0.8, body: true }); if (snowy) fx('bk_burst_cloud', H.x, H.y, { ground: true, body: true }); else ST.erupts.push({ n: sandy ? 'bk_erupt_sand' : 'bk_erupt_soil', x: H.x, y: H.y, t: 0 });   /* tuyết: bung pixel mây trắng */ if (groundOk(ctx, H.x, H.y - gyOf(ctx)) && !nearDecal(ctx, H.x, H.y, 40, true)) addDecal(ctx, 'crater', H.x, H.y); if (ctx.quake && up) ctx.quake(0.12); ST.stats.craters = (ST.stats.craters || 0) + 1; } 
    ST.stats.crossFx = (ST.stats.crossFx || 0) + 1; log((up ? 'emerge ' : 'dive ') + k); }
  ST.headUnder = under;
  const kCap = ST.low ? 4 : 8; let kN = 0; for (const f of ST.fx) if (/^bk_kick_/.test(f.n || '')) kN++;   /* 2026-10-15: bụi / giọt pixel có TRẦN (máy yếu ½) */
  for (const c of cs) { const k = crossKind(ctx, c.x, c.y);
    if (k === 'sky' && !VX('bk_kick_cloud')) { if (A && A.fogBurst && Math.random() < dt * (4 + sp / 25)) A.fogBurst(c.x + (Math.random() - 0.5) * 14, c.y - 2, { s: 0.45 + Math.random() * 0.25, n: 2 + (sp > 150 ? 2 : 0), dur: 1.2 + Math.random() * 0.8, col: CK[k].wisp, top: false }); continue; }   /* 2026-10-15: mây cũng búi PIXEL (sương mềm chỉ khi thiếu ảnh) */   /* sợi sương bong ra (trên trời), nhanh → nhiều hơn */
    if (kN >= kCap || Math.random() >= dt * (1.2 + sp / 120)) continue; const gk = k === 'water' ? 'water' : k === 'sky' ? 'cloud' : surfVfx(ctx, c.x, c.y, groundKind(ctx, c.x, c.y) === 'sand' ? 'sand' : 'soil'); if (fx('bk_kick_' + gk, c.x + (Math.random() - 0.5) * 16, c.y + 1, { ground: true, body: true })) { ST.fx[ST.fx.length - 1].n = 'bk_kick_' + gk; kN++; } }   /* đất / cát / nước: cục đất / giọt nước PIXEL bắn nhỏ thay sợi sương mềm */
}
function drawCollars(g, ctx, cx, cy) {
  const cs = ST.cross || []; if (!cs.length) return; const t = ST.t, sp = Math.min(400, (ST.H && ST.H.sp) || 0), swell = 1 + sp / 400 * 0.6 + (ST.crossK || 0) * 0.5, sm = g.imageSmoothingEnabled; g.save(); g.imageSmoothingEnabled = true;
  let nPix = 0; const pCap = ST.low ? 1 : 2;
  for (const c of cs) { const k = crossKind(ctx, c.x, c.y), C = CK[k], X = c.x - cx, Y = c.y - cy - LIFT + 2;
    if (k !== 'sky' || VX('bk_collar_cloud')) { if (nPix >= pCap) continue; const s = VX('bk_collar_' + (k === 'sky' ? 'cloud' : k === 'water' ? 'water' : surfVfx(ctx, c.x, c.y, groundKind(ctx, c.x, c.y) === 'sand' ? 'sand' : 'soil'))); if (!s || !s.img) continue; nPix++; drawSheet(g, s, Math.floor(t * (s.fps || 12) + c.i) % s.n, Math.round(X), Math.round(Y + 3), 1); continue; }   /* 2026-10-15 anh: vành đất / cát / nước PIXEL (PixelLab bk_collar_*), không còn 12 khối sương mềm che người */
    const hole = fogTint(c.i & 3, C.rim); if (hole) { g.globalAlpha = 0.6; const w = 64 * swell, h = 24 * swell; g.drawImage(hole, X - w / 2, Y - h / 2 + 3, w, h); }   /* hố tối phía dưới chỗ chui */
    for (let j = 0; j < 12; j++) { const im = fogTint((j + c.i) & 3, C.puff); if (!im) continue; const ring2 = j >= 7, a = j / (ring2 ? 5 : 7) * TAU + t * (0.6 + (j % 2) * 0.5) + c.i, r = (ring2 ? 26 : 15) * swell * (0.8 + 0.25 * Math.sin(t * 2.3 + j)), w = (ring2 ? 46 : 34 + (j % 3) * 10) * swell, h = w * 0.62;   /* 2 vòng khối sương: trong dày + ngoài loang rộng */
      g.globalAlpha = 0.78 + 0.12 * Math.sin(t * 1.7 + j * 1.3); g.drawImage(im, X + Math.cos(a) * r - w / 2, Y + Math.sin(a) * r * 0.45 - h / 2 - 2, w, h); }
    const top = fogTint((c.i + 2) & 3, '#ffffff'); if (top && k !== 'ground') { g.globalAlpha = 0.6; const w = 40 * swell; g.drawImage(top, X - w / 2, Y - w * 0.3 - 4, w, w * 0.55); } }
  g.globalAlpha = 1; g.imageSmoothingEnabled = sm; g.restore();
}
/* ---- cảnh bay (vẽ toàn màn trong draw): đất các vùng trôi bên dưới + rết tha người ---- */
const MOS = { mod: null, tried: false };
let PRE = false;
function preloadArt() {   /* perf: nạp + decode trước ảnh của trận khi vào trận (trước: tải lười → giật lần vẽ đầu) */
  if (PRE || typeof document === 'undefined') return; PRE = true;
  const L = []; for (const d of ['south', 'south-east', 'east', 'north-east', 'north', 'north-west', 'west', 'south-west']) L.push(SK(SKIN.head + '_' + d) || IM['boss/bakunawa/c9s/' + SKIN.head + '_' + d + '.png']);
  for (const n of [SKIN.seg[0], SKIN.seg[1], SKIN.tail, SKIN.seg[0] + '_plate', SKIN.tail + '_plate', 'crackglow']) { SK(n); L.push(IM[SKIN.dir + n + '.png']); }
  for (const n of ['head_top', 'antenna', 'mandible']) { partImg(n); L.push(IM['boss/bakunawa/parts/' + n + '.png']); }
  for (const k in DEC) for (const n of DEC[k]) { decImg(n); }
  for (const k in (ART.vfx || {})) if (/^(bk_|td_spark|knock_dizzy|gm_shatter)/.test(k)) { const im = ART.vfx[k] && ART.vfx[k].img; if (im && im.decode) L.push(im); }   /* 2026-10-15: cả sheet VFX bụi / đất / nước của trận (lag lúc đập đất trên iPhone) */
  for (const im of L) if (im && im.decode) im.decode().catch(() => { });
}
function mosLoad() { if (MOS.tried) return; MOS.tried = true; import('./worldmosaic.js').then(m => { MOS.mod = m; }).catch(() => { MOS.mod = null; }); }
function worldPt(z, fx = 0.5, fy = 0.5) { const M = MOS.mod; if (!M || !M.worldLayout) return null; const Lz = M.worldLayout(), zz = /^sky_/.test(z) ? (Lz.zones[z.slice(4)] ? z.slice(4) : 'm9') : z, r = Lz && Lz.zones && Lz.zones[zz]; return r ? { x: r.x + r.w * fx, y: r.y + r.h * fy, z: zz, r } : null; }
function drawCarry(g, ctx) {
  const G = ST.grab; if (!G || (G.ph !== 'carry' && G.ph !== 'escape')) return; mosLoad();
  const VW = ctx.VW || 480, VH = ctx.VH || 270, t = ST.t, u = G.ph === 'carry' ? Math.min(1, G.t / GRAB.carry) : 1, e = ease(u);
  const A = worldPt(G.src), B = worldPt(G.dest.z); let dir = Math.PI / 2;
  if (A && B && Math.hypot(B.x - A.x, B.y - A.y) > 50) dir = Math.atan2(B.y - A.y, B.x - A.x); if (G.dirA == null) G.dirA = dir; dir = G.dirA;
  const ux = Math.cos(dir), uy = Math.sin(dir);
  let drawn = false;
  if (A && B && MOS.mod && MOS.mod.drawMosaic) { const D0 = Math.hypot(B.x - A.x, B.y - A.y) || 1, D = Math.min(D0, B.r.h * 1.6), sx = B.x - (B.x - A.x) / D0 * D, sy = B.y - (B.y - A.y) / D0 * D, cxw = sx + (B.x - sx) * e, cyw = sy + (B.y - sy) * e, sc = 0.1 + 0.12 * e * e;   /* chỉ quãng cuối (≤ 1,6 vùng trước đích) — ảnh vùng kề đã nạp sẵn */
    try { drawn = !!MOS.mod.drawMosaic(g, ctx, { centerZone: B.z, camWorldX: cxw - B.r.x, camWorldY: cyw - B.r.y, scale: sc, VW, VH, time: t, haze: 0.35 }); } catch (err) { drawn = false; } }
  if (!drawn) { const gr = g.createLinearGradient(0, 0, 0, VH); gr.addColorStop(0, '#6f93d0'); gr.addColorStop(1, '#c8d8ef'); g.fillStyle = gr; g.fillRect(0, 0, VW, VH); }
  { g.save(); g.globalAlpha = 0.28; g.fillStyle = '#c6d6f2'; g.fillRect(0, 0, VW, VH); g.restore(); }   /* mù xanh độ cao */
  /* sương lao NGƯỢC hướng bay (nhiều lớp, nhanh) */
  { const sm = g.imageSmoothingEnabled; g.imageSmoothingEnabled = true; const sp = 520;
    const nF = ctx.gfxLow && ctx.gfxLow() ? 4 : 7;   /* perf: 9 → 7 khối (máy yếu 4) */
    for (let i = 0; i < nF; i++) { const im = fogTint(i % 4, i % 3 ? '#f2f5ff' : '#dfe6f8'); if (!im) continue; const sc = 0.9 + (i % 3) * 0.45, w = im.width * sc, h = im.height * sc, W2 = VW + w * 2, H2 = VH + h * 2;
      const ox = ((i * 977) % W2) - ux * sp * t * (0.6 + (i % 3) * 0.35), oy = ((i * 613) % H2) - uy * sp * t * (0.6 + (i % 3) * 0.35), x = ((ox % W2) + W2) % W2 - w, y = ((oy % H2) + H2) % H2 - h;
      g.globalAlpha = i % 3 === 2 ? 0.55 : 0.32; g.drawImage(im, x, y, w, h); }
    g.globalAlpha = 1; g.imageSmoothingEnabled = sm; }
  /* rết: đầu giữa màn hơi trên, thân lượn sóng phía sau (ngược hướng bay), người chơi trong kìm */
  const hx = Math.round(VW / 2 - ux * 6), hy = Math.round(VH * 0.46 - uy * 10), wob = Math.sin(t * 9) * 1.5;
  const segs = []; for (let i = 1; i <= SEG_N + 1; i++) { const d = i * SP, w = Math.sin(t * 7 - i * 0.55) * Math.min(10, i * 1.2); segs.push({ x: hx - ux * d - uy * w, y: hy - uy * d + ux * w + wob, i }); }
  for (let j = segs.length - 1; j >= 0; j--) { const q = segs[j], pr = j ? segs[j - 1] : { x: hx, y: hy }, a = Math.atan2(pr.y - q.y, pr.x - q.x); const kind = q.i === SEG_N + 1 ? 'tail' : 'seg'; if (q.x < -40 || q.y < -50 || q.x > VW + 40 || q.y > VH + 50) continue; drawSegFull(g, kind, q.x, q.y, 0, a, 1, q.i); }   /* perf: bỏ đốt ngoài màn */
  if (!drawHeadTop(g, hx, hy + wob, 0, dir, 1, 1)) drawHead(g, hx, hy + wob, 0, dir, 1, 1);
  /* người chơi ngậm trong kìm (vẽ SAU đầu → không bị che) — dáng bị hất, lắc khi giãy, đỏ chớp khi mất máu */
  const p = ctx.S.player, sh = G.shake > 0 ? Math.round(Math.sin(t * 70) * 2) : 0, px = Math.round(hx + ux * 8 + sh), py = Math.round(hy + uy * 6 + 8 + wob), esc = G.ph === 'escape' ? ease(G.t / GRAB.esc) : 0;
  const acts = p.sheet && p.sheet.actions, c = acts && (acts.knockfly || acts.hurt), row = uy > 0.5 ? 0 : uy < -0.5 ? 3 : ux > 0 ? 2 : 1;
  const yy = py - esc * 40;
  if (c) { const ch = c.ch || 20, cw = c.cw || 16, f = Math.min(c.n - 1, 1 + Math.floor(t * 8) % Math.max(1, c.n - 1)); g.save(); g.imageSmoothingEnabled = false; g.drawImage(c.img, f * cw, row * ch, cw, ch, px - (cw >> 1), yy - 18 - (ch - 20), cw, ch); if (G.hurt > 0) { g.globalCompositeOperation = 'source-atop'; } g.restore(); if (esc > 0) drawCopter(g, px, yy - 18 - (ch - 20) + 2, t, 26); }
  else { const cc = p.custom, ox = p.x, oy = p.y; p.custom = null; p.x = px; p.y = yy; try { p.draw(g); } finally { p.custom = cc; p.x = ox; p.y = oy; } }
  /* 2026-10-16 anh: bỏ Rocky bay theo cắn đầu (nhẹ máy) */
  /* vệt tốc độ (VFX PixelLab ac_speedlines) xoay theo hướng bay */
  { const s = VX('ac_speedlines'); if (s && s.img) { const f = Math.floor(t * (s.fps || 12)) % s.n, hi = s.img.__hi ? 1 : 2; g.save(); g.imageSmoothingEnabled = false; g.globalAlpha = 0.55; g.translate(VW / 2, VH / 2); g.rotate(dir + Math.PI / 2); for (let i = -1; i <= 1; i++) g.drawImage(s.img, f * s.w * hi, 0, s.w * hi, s.h * hi, -s.w / 2 + i * s.w * 0.9, -s.h / 2, s.w, s.h); g.restore(); } }
}

/* ---------------- vẽ ---------------- */
const AIRD = ctx => !!(ctx.air && ctx.air.on());
const SK = n => img(SKIN.dir + n + '.png');
function headImg(open, dir) { return SK(SKIN.head + '_' + dir) || B('headopen_' + dir) || B('head_' + dir); }   /* đầu ngậm (head_*) PixelLab sinh ra nhỏ hơn hẳn đầu há → dùng đầu há cho mọi lúc (cùng cỡ) */
function drawHead(g, x, y, z, a, open, alpha = 1) { const im = headImg(open > 0.2, dirOf(Math.cos(a), Math.sin(a))); if (!im) { g.fillStyle = '#3a8a9a'; g.fillRect(Math.round(x - 8), Math.round(y - LIFT - z - 12), 16, 12); return; } blit(g, im, x, y - LIFT - z - 12, alpha); }
/* đốt: 1 ảnh (hướng Bắc = đầu ở trên) xoay sẵn 48 góc, vẽ 1:1 — không nhảy giữa 8 hướng khi lượn */
const ROT = {};
function rotSet(name) { if (ROT[name]) return ROT[name]; const dk = /_dk$/.test(name), im0 = SK(name.replace(/_dk$/, '')); if (!im0 || typeof document === 'undefined') return null; let im = im0; const N = SKIN.rotN, w = im0.naturalWidth, h = im0.naturalHeight, D = Math.ceil(Math.hypot(w, h)) + 2, out = [];
  if (dk) { const c0 = document.createElement('canvas'); c0.width = w; c0.height = h; const x0 = c0.getContext('2d'); x0.drawImage(im0, 0, 0); const d = x0.getImageData(0, 0, w, h); for (let i = 0; i < d.data.length; i += 4) { d.data[i] *= 0.84; d.data[i + 1] *= 0.84; d.data[i + 2] *= 0.88; } x0.putImageData(d, 0, 0); im = c0; }   /* bản tối hơn chút: đốt chẵn / lẻ xen kẽ → thân có nhịp sáng tối */
  for (let k = 0; k < N; k++) { const c = document.createElement('canvas'); c.width = D; c.height = D; const g = c.getContext('2d'); g.imageSmoothingEnabled = false; g.translate(D / 2, D / 2); g.rotate(k / N * TAU); g.drawImage(im, -w / 2, -h / 2); out.push(c); }
  return (ROT[name] = out); }
function rotPick(name, a) { const S = rotSet(name); if (!S) return null; const r = a + Math.PI / 2, N = SKIN.rotN; return S[((Math.round(r / TAU * N) % N) + N) % N]; }   /* a = hướng tiếp tuyến (về phía đầu) */
function legFrame(i) { const H = ST.H, mv = H && (H.sp > 5 || ST.act); return mv ? ((Math.floor(ST.t * SKIN.legHz - i * SKIN.legLag) % 2) + 2) % 2 : 0; }   /* chân gợn sóng: lệch pha theo số đốt */
function rearZ(i) { const r = ST.rear || 0; if (r <= 0.01 || (ST.cons && (ST.cons.ph === 'wrap' || ST.cons.ph === 'squeeze') && i > 0)) return 0;   /* vòng quấn: đốt nằm đúng vòng xoắn, chỉ đầu dựng */ const u = Math.max(0, 1 - i / REAR_N); return REAR_Z * r * u * u; }
function drawSeg(g, kind, x, y, z, a, alpha = 1, li = 0, plate = false) { x -= Math.cos(a) * SKIN.plateOff; y -= Math.sin(a) * SKIN.plateOff; const dk = li % 2 ? '_dk' : '', sk = kind === 'tail' ? rotPick(SKIN.tail + (plate ? '_plate' : '') + dk, a) : plate ? rotPick(SKIN.seg[0] + '_plate' + dk, a) : (rotPick(SKIN.seg[legFrame(li)], a) || rotPick(SKIN.seg[0], a));   /* ảnh đốt: giáp nằm phía đầu của ảnh → lùi ảnh để tâm giáp trùng điểm thân */
  const c = sk || (kind === 'tail' ? B('tail_' + dirOf(-Math.cos(a), -Math.sin(a))) : segPick(kind, a)); if (!c) { g.fillStyle = kind === 'segglow' ? '#ffe070' : '#2f7a88'; g.fillRect(Math.round(x - 6), Math.round(y - LIFT - z - 10), 12, 10); return; } blit(g, c, x, y - LIFT - z - 8, alpha); if (kind === 'segglow' && plate) { const cg = rotPick('crackglow', a); if (cg) { blit(g, cg, x + Math.cos(a) * SKIN.plateOff, y - LIFT - z - 8 + Math.sin(a) * SKIN.plateOff, alpha); const pu = ST.crack && ST.crack.t < 0.7 ? 1 - ST.crack.t / 0.7 : 0; g.save(); g.globalCompositeOperation = 'lighter'; blit(g, cg, x + Math.cos(a) * SKIN.plateOff, y - LIFT - z - 8 + Math.sin(a) * SKIN.plateOff, Math.min(1, (0.6 + 0.9 * pu) * alpha)); g.restore();   /* lúc vừa nứt: loé sáng 0,7 s rồi giữ sáng đều */ } } }   /* GIÁP NỨT: vết nứt sáng PixelLab (crackglow) xoay theo đốt — TĨNH */   /* đốt sáng: cộng sáng TĨNH (không nhấp nháy) */
function shadowAt(g, x, y, k = 1, z = 0) { if (SHADOW.on) { pxShadow(g, x, y, Math.round(20 * k), z, Math.min(1, k)); return; } g.fillStyle = `rgba(10,8,30,${(0.28 * k).toFixed(3)})`; g.beginPath(); g.ellipse(Math.round(x), Math.round(y), 9 * k, 3 * k, 0, 0, TAU); g.fill(); }
let DK = null;
function darkLayer(g, ctx, cx, cy, k, holeR) {   /* lớp tối Nhật Thực: lỗ sáng quanh Rocky (lớn) + người chơi (mờ) + trống; holeR: loé sáng loang từ tâm khi nhả mặt trời */
  if (typeof document === 'undefined' || k <= 0) return; const cv = g.canvas, W = cv.width, Hh = cv.height, hi = W / (ctx.VW || W);
  DK = DK || document.createElement('canvas'); if (DK.width !== W || DK.height !== Hh) { DK.width = W; DK.height = Hh; } const q = DK.getContext('2d');
  q.globalCompositeOperation = 'source-over'; q.clearRect(0, 0, W, Hh); q.fillStyle = `rgba(4,3,14,${(0.94 * k).toFixed(3)})`; q.fillRect(0, 0, W, Hh); q.globalCompositeOperation = 'destination-out';
  const hole = (wx, wy, r, a) => { const X = (wx - cx) * hi, Y = (wy - cy) * hi, R = r * hi, gr = q.createRadialGradient(X, Y, R * 0.25, X, Y, R); gr.addColorStop(0, `rgba(0,0,0,${a})`); gr.addColorStop(1, 'rgba(0,0,0,0)'); q.fillStyle = gr; q.beginPath(); q.arc(X, Y, R, 0, TAU); q.fill(); };
  const rp = rkPos(ctx), p = ctx.S.player; if (rp) hole(rp.x, rp.y - 8, 78, 1); hole(p.x, p.y - 8, 30, 0.55); for (const d of ST.drums) hole(d.x, d.y - 6, d.lit ? 26 : 13, d.lit ? 0.9 : 0.5);
  if (holeR != null) { const X = (holeR.x - cx) * hi, Y = (holeR.y - cy) * hi; q.fillStyle = '#000'; q.beginPath(); q.arc(X, Y, holeR.r * hi, 0, TAU); q.fill(); }
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(DK, 0, 0); g.restore();
}
function drawTele(g, cx, cy, glow = false) {
  for (const t of ST.tele) {
    const k = 1 - t.t / t.T0; g.save(); if (glow) g.globalCompositeOperation = 'lighter';
    if (t.type === 'bolt') { const X = Math.round(t.x - cx), Y = Math.round(t.y - cy), fg = fogTint(((t.x | 0) & 3), '#d6d0ff'); if (fg) { const w = t.r * (3.2 - k), sm = g.imageSmoothingEnabled; g.imageSmoothingEnabled = true; g.globalAlpha = 0.25 + 0.5 * k; g.drawImage(fg, X - w, Y - w * 0.55, w * 2, w * 1.1); g.imageSmoothingEnabled = sm; } }   /* báo sét: sương sáng tụ dần về điểm sắp đánh */
    if (t.type === 'c') { const X = Math.round(t.x - cx), Y = Math.round(t.y - cy), im = fogTint(2, t.col === '#ffb040' ? '#d08020' : '#8a6ad8'), sm = g.imageSmoothingEnabled; if (im) { g.imageSmoothingEnabled = true; const w = t.r * (2.6 - 0.5 * k); g.globalAlpha = 0.3 + 0.45 * k; g.drawImage(im, X - w / 2, Y - w * 0.36, w, w * 0.72); g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.2 * k; const w2 = w * 0.5 * k + 4; g.drawImage(im, X - w2 / 2, Y - w2 * 0.36, w2, w2 * 0.72); g.imageSmoothingEnabled = sm; } }   /* vùng Quật Đuôi: sương màu tụ dần (bỏ vòng vẽ code) */
    else if (t.type === 'cone') { const X = Math.round(t.x - cx), Y = Math.round(t.y - cy); g.globalAlpha = 0.15 + 0.35 * k; g.fillStyle = t.col; g.beginPath(); g.moveTo(X, Y); g.arc(X, Y, t.r, t.a - t.w / 2, t.a + t.w / 2); g.closePath(); g.fill(); }
    else if (t.type === 'l') {   /* 2026-10-14 anh: Đớp / Lao Sét = VỆT SƯƠNG dọc đường lao, sáng dần tới lúc đánh (bỏ dải tô + viền vẽ code); Lao Sét thêm tia điện tím chập chờn (VFX PixelLab bk_crackle) */
      const sm = g.imageSmoothingEnabled; g.imageSmoothingEnabled = true; const w0 = (t.w || 6) * 5.2, n = Math.max(3, Math.ceil(t.len / 7)), fogC = t.col === '#ff5040' ? '#c8402c' : t.col === '#ffd070' ? '#c88a28' : '#6a4ad8';   /* màu đậm để nổi trên trời sáng / đất */
      for (let s2 = 0; s2 <= n; s2++) { const u = s2 / n, im = fogTint(s2 & 3, fogC); if (!im) continue; const x = t.x + Math.cos(t.a) * t.len * u - cx, y = t.y + Math.sin(t.a) * t.len * u - cy, w = w0 * (1.1 - 0.35 * u) * (0.85 + 0.3 * k); g.globalAlpha = (0.32 + 0.5 * k) * (1 - 0.3 * u); g.drawImage(im, x - w / 2, y - w * 0.32, w, w * 0.64); }
      g.globalCompositeOperation = 'lighter'; { const im = fogTint(1, '#ffffff'); if (im) for (let s2 = 0; s2 <= n; s2 += 2) { const u = s2 / n, x = t.x + Math.cos(t.a) * t.len * u - cx, y = t.y + Math.sin(t.a) * t.len * u - cy, w = w0 * 0.5 * k + 3; g.globalAlpha = 0.35 * k * k; g.drawImage(im, x - w / 2, y - w * 0.3, w, w * 0.6); } }
      g.imageSmoothingEnabled = sm; g.globalCompositeOperation = 'source-over';
      const cr = t.col === '#a8c8ff' ? VX('bk_crackle') : null; if (cr && cr.img) { const hi = cr.img.__hi ? 1 : 2; g.imageSmoothingEnabled = false; for (let s2 = 1; s2 < n; s2 += 2) { const u = s2 / n, x = t.x + Math.cos(t.a) * t.len * u - cx, y = t.y + Math.sin(t.a) * t.len * u - cy, f = (Math.floor(ST.t * 12) + s2 * 5) % cr.n; g.globalAlpha = 0.5 + 0.5 * k; g.drawImage(cr.img, f * cr.w * hi, 0, cr.w * hi, cr.h * hi, Math.round(x - 16), Math.round(y - 19), cr.w, cr.h); } }
    }
    else if (t.type === 'mach') {   /* 2026-10-14: vạch Long Mạch = DẢI SƯƠNG mềm tụ dần dọc đường trồi (bỏ dải tô + vòng tròn + đường dích dắc vẽ code) */
      const dx = t.x2 - t.x1, dy = t.y2 - t.y1, l = Math.hypot(dx, dy) || 1, sm = g.imageSmoothingEnabled; g.imageSmoothingEnabled = true;
      for (let s2 = 0; s2 <= l; s2 += 14) { const im = fogTint(((s2 / 14) | 0) & 3, '#d8ccff'); if (!im) continue; const x = t.x1 + dx / l * s2 - cx, y = t.y1 + dy / l * s2 - cy, w = t.w * (2.2 + 0.8 * k); g.globalAlpha = 0.18 + 0.45 * k; g.drawImage(im, x - w / 2, y - w * 0.3, w, w * 0.6); }
      g.globalCompositeOperation = 'lighter'; for (let s2 = 7; s2 <= l; s2 += 28) { const im = fogTint(1, '#fff2c8'); if (!im) continue; const x = t.x1 + dx / l * s2 - cx, y = t.y1 + dy / l * s2 - cy, w = t.w * 1.2 * k + 4; g.globalAlpha = 0.25 * k; g.drawImage(im, x - w / 2, y - w * 0.3, w, w * 0.6); }
      g.imageSmoothingEnabled = sm; }
    g.restore();
  }
  for (const s of ST.shots) if (s.kind === 'moon' && s.t < 0) {   /* báo Nọc Lôi: vệt sương tím dọc đường bay ra (bỏ đường nét đứt hình móc câu) */
    const k = 1 + s.t / 0.8, n = Math.max(3, Math.ceil(s.L / 9)), sm = g.imageSmoothingEnabled; g.save(); g.imageSmoothingEnabled = true;
    for (let q = 0; q <= n; q++) { const u = q / n, im = fogTint(q & 3, '#8a5ae0'); if (!im) continue; const x = s.x0 + Math.cos(s.a) * s.L * u - cx, y = s.y0 + Math.sin(s.a) * s.L * u - cy, w = 16 * (1 - 0.4 * u) * (0.8 + 0.4 * k); g.globalAlpha = (0.2 + 0.45 * k) * (1 - 0.4 * u); g.drawImage(im, x - w / 2, y - w * 0.32, w, w * 0.64); }
    g.imageSmoothingEnabled = sm; g.restore(); }
}
const skyTier = ctx => { const t = tierNow(ctx); return t === 'air' || t === 'sky'; };
function drawSun(g, ctx, ringOnly) {   /* ảnh PixelLab skysun / skyeclipse (128 → 64 px logic, vẽ 1:1), cố định theo khung nhìn */
  const VW = ctx.VW || 480, E = ST.ecl, x = Math.round(VW * SUN.fx), y = sunY(ctx), sun = B('skysun') || B('sun'), ecl = B('skyeclipse') || B('eclipse');
  let ks = 1, ke = 0; if (E) { if (E.ph === 'eat') { ks = E.sunK; ke = 1 - E.sunK; } else if (E.ph === 'fall' || E.ph === 'dark') { ks = 0; ke = 1; } else if (E.ph === 'spit') { ks = E.sunK; ke = 1 - E.sunK; } }
  if (!E && ST.won) ks = 1; if (ringOnly) ks = 0;
  if (sun && ks > 0) blit(g, sun, x, y, ks); if (ecl && ke > 0) blit(g, ecl, x, y, ke);
}
function drawStormSea(g, ctx, cx, cy) {   /* biển mây bão quanh đài (chỉ phần NGOÀI đài) — ảnh mây PixelLab phủ tối, trôi rất chậm */
  const c = C0(ctx), r = RR(ctx), VW = ctx.VW || 480, VH = ctx.VH || 270, t = ST.t;
  g.save(); g.beginPath(); g.rect(-4, -4, VW + 8, VH + 8); g.ellipse(Math.round(c.x - cx), Math.round(c.y - cy), r.x + 2, r.y + 2, 0, 0, TAU); g.clip('evenodd');
  g.fillStyle = ST.ult ? '#2a0f22' : '#1b1736'; g.fillRect(-4, -4, VW + 8, VH + 8);
  const L1 = darkCloud('zones/sky/bg/cloud_l_s13.png', ST.ult ? 'rgba(90,30,50,.78)' : 'rgba(46,40,86,.72)'), L2 = darkCloud('zones/sky/scout/storm.png', 'rgba(30,26,60,.35)'), L3 = darkCloud('zones/sky/bg/cloud_m_s12.png', 'rgba(70,62,120,.6)');
  const layer = (im, step, sp, off, a) => { if (!im) return; const w = im.width / 2, h = im.height / 2; g.globalAlpha = a; for (let y = Math.floor((cy - 40) / step) * step - 40; y < cy + VH + 40; y += step) for (let x = Math.floor((cx - 80) / step) * step - 80; x < cx + VW + 80; x += step) { const j = ((x * 13 + y * 7) % 37) - 18, dx = (t * sp + off + j * 3) % step; g.drawImage(im, Math.round(x + dx - cx - w / 2), Math.round(y + j - cy - h / 2), w, h); } };
  layer(L1, 56, 4, 0, 0.9); layer(L2, 88, 7, 30, 0.85); layer(L3, 72, 10, 50, 0.7);
  g.restore();
  g.save(); g.strokeStyle = 'rgba(200,190,255,.35)'; g.lineWidth = 1; g.beginPath(); g.ellipse(Math.round(c.x - cx), Math.round(c.y - cy), r.x - 1, r.y - 1, 0, 0, TAU); g.stroke(); g.restore();   /* mép đài sáng nhẹ */
}


/* ---------------- ĐUỔI THEO (aircombat ctx.chase): qua tầng + qua vùng, máu / pha giữ nguyên ---------------- */
function beginChase(ctx) { if (ctx.chase && !ctx.chase.is('bakunawa')) ctx.chase.begin('bakunawa', { tier: (tr, prev) => tierFollow(ctx, tr, prev), end: r => chaseEnded(ctx, r) }); ST.zone = zidOf(ctx); }
function carryOut(ctx) {   /* rời vùng giữa trận → mang trận theo (bộ nhớ, không ghi save) */
  const b = ST.mo2 || ST.boss; if (ST.won || ST.death) return false; if (!b && !ST.shed && !ST.carry) return false;
  if (ST.ult) { ST.ultAt.unshift(ST.ult.at ?? 0.6); ST.ult = null; }
  if (ST.ecl) { ST.ecl = null; ST.cd.eclipse = Math.max(ST.cd.eclipse, 10); }
  if (ctx.terrain) ctx.terrain.cancel();
  if (!ST.carry) ST.carry = b ? { p2: b === ST.mo2, hp: b.hp, max: b.max, phase: b.phase || 1 } : { p2: true, hp: bossHp(ctx, 0.55), max: bossHp(ctx, 0.55), phase: 2 };
  if (ST.cons) { if (ST.cons.hidP) ctx.S.player.custom = ST.cons.prevCustom || null; if (ctx.S.mode === 'bkcarry') ctx.setMode('play'); ST.cons = null; }
  ST.boss = null; ST.mo2 = null; ST.act = null; ST.shots = []; ST.tele = []; ST.drums = []; ST.shed = null; ST.tcine = null; ST.arrive = null; ST.zone = null; ST.fall = []; ST.bloom = null;
  log('carry ' + JSON.stringify({ p2: ST.carry.p2, hp: Math.round(ST.carry.hp), max: ST.carry.max })); return true;
}
function arrivePoint(ctx) {
  const p = ctx.S.player, m = ctx.S.map; let best = null;
  for (let k = 0; k < 16 && !best; k++) { const a = Math.random() * TAU, r = 64 + (k % 4) * 10, x = p.x + Math.cos(a) * r, y = p.y + Math.sin(a) * r * 0.8;
    if (x < 30 || y < 30 || x > m.w * TS - 30 || y > m.h * TS - 30) continue; if (ctx.air && ctx.air.on() && !ctx.air.bound(x, y)) continue; best = { x, y, a }; }
  return best || { x: p.x + 60, y: p.y, a: 0 };
}
function arriveTick(ctx, dt) {
  const A = ST.arrive, t = L(ctx); if (!A) return;
  if (!A.cine) {   /* đợi cảnh cất / hạ cánh / chuyển vùng của người chơi xong rồi mới lao tới */
    if (ctx.S.mode !== 'play' || (ctx.chase && ctx.chase.cineOn()) || (ctx.skyCut && ctx.skyCut())) return;
    A.t += dt; if (A.t < A.delay) return;
    const q = arrivePoint(ctx), below = A.how !== 'drop'; A.x = q.x; A.y = q.y; A.from = below ? 'below' : 'above'; A.z0 = below ? -60 : 230;   /* tự rời sân / thoát: CHUI LÊN cạnh người · bị quăng: rết hạ xuống theo */
    headInit(ctx, q.x, q.y, q.a + Math.PI, A.z0); A.k = 0;
    A.cine = ctx.chase.cine('boss', { x: q.x, y: q.y, hitAt: 1.15, dur: 1.75, from: A.from, name: '', bars: false, onHit: () => spawnCarried(ctx) }); callout(ctx, A.how === 'drop' ? null : t.follow, 1.4);
    ST.follows.push({ zone: zidOf(ctx), tier: tierNow(ctx), t: +ST.t.toFixed(1) }); log('arrive ' + zidOf(ctx) + ' ' + A.from); return;
  }
  const H = ST.H; if (!H || ST.boss || ST.mo2) return; A.k += dt; const u = Math.min(1, A.k / 1.15), z = A.z0 + (BZ(ctx) - A.z0) * (u * u); H.z = z; H.open = 1;
  const p = ctx.S.player; H.a += angDiff(Math.atan2(p.y - H.y, p.x - H.x), H.a) * Math.min(1, dt * 4); trailPush();
}
function spawnCarried(ctx) {
  const c = ST.carry, A = ST.arrive, H = ST.H; if (!c || !H) return; ST.carry = null; ST.arrive = null; ST.zone = zidOf(ctx);
  if (c.p2) { spawnP2(ctx); if (ST.mo2) { ST.mo2.max = c.max; ST.mo2.hp = Math.max(1, Math.round(c.hp)); } }
  else { const mo = ctx.monsters.add(cfgP1(ctx, c.max), H.x, H.y); Object.assign(mo, { phase: c.phase, angry: true, warned: true, intro: 0, stunT: 0, max: c.max, hp: Math.max(1, Math.round(c.hp)) }); ST.boss = mo; ST.introDone = true; }
  H.z = BZ(ctx); ST.cd.bite = Math.max(ST.cd.bite, 0.6); ctx.chase.impact(H.x, H.y, 42, { pw: 4 });
  const p = ctx.S.player; if (Math.hypot(p.x - H.x, p.y - H.y) < 34) hurtPlayer(ctx, DMG.bite, H, 'stagger', 0.8, 'arrive');
  if (ctx.terrain && !inBk(ctx)) ctx.terrain.flee(H.x, H.y); ST.stats.follows = (ST.stats.follows || 0) + 1; log('arrived hp ' + Math.round(c.hp) + '/' + c.max + (c.p2 ? ' p2' : '')); void A;
}
function tierFollow(ctx, tr, prev) {   /* cùng vùng, người đổi tầng (đất ↔ trung) → rắn theo sau cảnh ngắn */
  if (!on(ctx) || !(ST.boss || ST.mo2) || ST.won || ST.death || !ST.H) return;
  if ((tr === 'mid' || tr === 'high') && (prev === 'mid' || prev === 'high')) { log('band ' + prev + '→' + tr); return; }   /* độ cao liền mạch: đổi dải trên không — rết bay theo êm, không cảnh */
  if (ST.ult) { ST.ultAt.unshift(ST.ult.at ?? 0.6); ST.ult = null; } if (ST.ecl) { ST.ecl = null; ST.cd.eclipse = Math.max(ST.cd.eclipse, 8); }
  const down = (TIERZ[tr] ?? 2) > (TIERZ[prev] ?? 2), q = arrivePoint(ctx), t = L(ctx);
  ST.act = null; ST.tele = []; ST.shots = []; if (ctx.terrain) ctx.terrain.cancel();
  ST.tcine = { t: 0, dur: 1.45, down, x: q.x, y: q.y, z0: down ? 150 : ST.H.z };
  if (down) headInit(ctx, q.x, q.y, q.a + Math.PI, 150);
  void t;   /* 2026-10-14: đổi tầng không còn cảnh khung phim (trọng tâm là người chơi) — rết chỉ bay theo êm */
  ST.follows.push({ zone: zidOf(ctx), tier: tr, from: prev, t: +ST.t.toFixed(1) }); ST.stats.tierFollows = (ST.stats.tierFollows || 0) + 1; log('tier ' + prev + '→' + tr);
}
function tcineTick(ctx, dt) {
  const C = ST.tcine, H = ST.H; if (!C || !H) { ST.tcine = null; return; } C.t += dt; const u = Math.min(1, C.t / 1.0);
  H.z = C.z0 + (BZ(ctx) - C.z0) * (C.down ? u * u : ease(u)); const p = ctx.S.player; steer(ctx, dt, p.x + (C.x - p.x) * 0.5, p.y + (C.y - p.y) * 0.5, 60, 3); H.open = 1; trailPush();
  if (C.t >= C.dur) { ST.tcine = null; ST.cd.bite = Math.max(ST.cd.bite, 0.5); }
}
function chaseEnded(ctx, reason) {
  setTimeout(() => { try { groundRestore(ctx); } catch (e) { /* bỏ qua */ } }, 3000);
  if (reason === 'faint') { for (const b of [ST.boss, ST.mo2]) if (b && ctx.monsters) ctx.monsters.remove(b); const fled = !!(ST.boss || ST.mo2 || ST.carry || ST.arrive); reset(); if (fled) setTimeout(() => { try { ctx.toast(L(ctx).fled, true); } catch (e) { /* bỏ qua */ } }, 1400); log('chase end faint'); }
}
function installHooks(ctx) {   /* bọc hàm chung (mỗi vùng) — tự xét on(ctx) bên trong */
  if (!(ctx.toast && ctx.toast.__bk)) { const t0 = ctx.toast, w = (txt, big) => { if (ctx.S.bossFight && on(ctx)) { if (big) callout(ctx, txt, 1.6); ST.mutedToasts = (ST.mutedToasts || 0) + 1; return; } return t0(txt, big); }; w.__bk = true; ctx.toast = w; }   /* trong trận: câu báo LỚN của hệ khác → ô callout; câu nhỏ (+kinh nghiệm, nhặt đồ, cột khí nóng…) tắt — không chồng chữ */
  if (!(ctx.petHush && ctx.petHush.__bk)) { const prevHush = ctx.petHush, w = () => (on(ctx) && !!boss()) || (prevHush ? prevHush() : false); w.__bk = true; ctx.petHush = w; }
  if (!(ctx.petWait && ctx.petWait.__bk)) { const prevWait = ctx.petWait, w = () => { if (on(ctx)) { const p = ctx.S.player;
      if (ST.ecl && ST.ecl.ph !== 'spit' && ST.ecl.ph !== 'rise') return { x: p.x + (p.dir === 2 ? -14 : 14), y: p.y + 5 };   /* Nhật Thực: Rocky đi sát người chơi soi đường */
      if (ST.ult && ST.ult.ph === 'coil') { const G = ST.ult.glow.find(g => g.who === 'r' && !g.dead); if (G) { const q = glowPos(ctx, G), c = C0(ctx), a = Math.atan2(q.y - c.y, q.x - c.x); return { x: q.x - Math.cos(a) * 34, y: q.y - Math.sin(a) * 30 }; } } }
      return prevWait ? prevWait() : null; }; w.__bk = true; ctx.petWait = w; }
  const M = ctx.monsters; if (M && M.damage && !M.damage.__bk) { const dmg0 = M.damage, w = (mo, d, src, ...rest) => {
      if (mo && mo.c && (mo.c.bkBoss || mo.c.bkP2) && on(ctx)) {
        if (mo.intro > 0 || ST.ult || ST.shed || ST.death || ST.tcine || (mo.c.bkBoss && submerged())) return false;
        const sr = ctx.skyRk && ctx.skyRk(), fromRk = src && (src === rkEnt(ctx) || (sr && src === sr)); let mul = 1;
        if (mo.c.bkBoss) mul = (mo.stunT > 0 ? (fromRk ? 0.8 : STUN_MUL) : fromRk ? RK_MUL : 1) * (!(mo.stunT > 0) && ST.gapT > 0 ? PACE.gapMul : 1);   /* plan-40: khoảng hở ×1,2 */   /* choáng: Rocky ×0,8, đòn khác ×1,6 */ else mul = fromRk ? P2_RK : 1;
        const dd = Math.max(1, Math.round(d * mul)); if (fromRk) { ST.stats.rkRaw += d; ST.stats.rkDealt += dd; ST.hitN = (ST.hitN || 0) + 1; }
        rest[1] = 0; return dmg0(mo, dd, src, ...rest);
      }
      return dmg0(mo, d, src, ...rest); }; w.__bk = true; M.damage = w; }
}

/* 2026-10-14 perf: hộp các nút DOM đo 1 lần / 0,5 s (trước: querySelectorAll + getBoundingClientRect ~20 nút × tới 40 lần MỖI KHUNG) */
const HUD_IDS = ['btn-menu', 'btn-photo', 'btn-chat', 'px-clock', 'px-status', 'px-money', 'btn-tgt', 'btn-skyfly', 'btn-copter', 'herobar', 'btn-a', 'btn-b', 'mslots'];
let HR = null;
function hudRects(ug) {
  const W = ug.canvas.width, Hc = ug.canvas.height, now = performance.now(); if (HR && now - HR.t < 500 && HR.W === W && HR.H === Hc) return HR;
  const R = { t: now, W, H: Hc, hit: [], band: [], ok: false }; HR = R; if (typeof document === 'undefined') return R; const cr = ug.canvas.getBoundingClientRect(); if (!cr.width) return R; const k = W / cr.width; R.ok = true;
  const cv = r => ({ x0: (r.left - cr.left) * k, x1: (r.right - cr.left) * k, y0: (r.top - cr.top) * k, y1: (r.bottom - cr.top) * k });
  for (const e of document.querySelectorAll('[id^="px-"], [id^="btn-"], .sky-btn, #herobar, #mslots > *, #altw, .hud-tr > *')) { if (e.hidden || e.offsetParent === null) continue; const r = e.getBoundingClientRect(); if (!r.width || !r.height || (r.height > cr.height * 0.4 && e.id !== 'altw')) continue; R.hit.push(cv(r)); }   /* thước độ cao (bố cục 2026-10-15) dài ~45 % màn vẫn phải tránh */
  for (const id of HUD_IDS) { const el = document.getElementById(id); if (!el || el.hidden) continue; const r = el.getBoundingClientRect(); if (r.width) R.band.push(cv(r)); }
  document.querySelectorAll('.sky-btn').forEach(el => { if (!el.hidden) { const r = el.getBoundingClientRect(); if (r.width) R.band.push(cv(r)); } });
  return R; }
function hudHit(ug, x, y, w, h) { const R = hudRects(ug); if (!R.ok) return false; for (const r of R.hit) if (r.x0 < x + w && r.x1 > x && r.y0 < y + h && r.y1 > y) return true; return false; }
/* khoảng ngang trống trên canvas UI ở dải [y, y+h] — tránh các nút DOM (HUD phải / trái) */
function freeBand(ug, y, h) {
  const W = ug.canvas.width, out = { x0: 0, x1: W }, R = hudRects(ug); if (!R.ok) return out;
  for (const r of R.band) { if (r.y1 < y || r.y0 > y + h) continue; if (r.x0 > W / 2) out.x1 = Math.min(out.x1, r.x0 - 4); else if (r.x1 < W / 2) out.x0 = Math.max(out.x0, r.x1 + 4); }
  if (out.x1 - out.x0 < 120) return { x0: 0, x1: W }; return out;
}
/* ---------------- hệ thống ---------------- */
export const bakunawa = {
  id: 'bakunawa', always: true,   /* cổng ở trời M9 (sky.js); trận ở 'sky_bakunawa' */
  onZoneEnter(ctx) {
    ctx.enterBakunawa = () => { if (!gateOk(ctx)) return false; if (!rk(ctx)) { ctx.toast(ctx.lang() === 'vi' ? 'Cổng Trời chỉ mở khi có Rocky đi cùng' : 'The Sky Gate only opens with Rocky at your side'); return true; } ctx.sfx('whirl'); ctx.travel('sky_bakunawa', 'default'); return true; };
    mosLoad(); ST.ctx = ctx; installHooks(ctx); ctx.bkFirstReward = () => firstReward(ctx); ctx.bkCallout = txt => { if (ctx.S.bossFight && on(ctx)) callout(ctx, txt, 1.4); else ctx.toast(txt); };
    if (!(ctx.faintTravel && ctx.faintTravel.__bkF)) { const prevFaint = ctx.faintTravel, w = () => { if (inBk(ctx)) return ctx.travel('sky_m9', 'gate'); return prevFaint ? prevFaint() : false; }; w.__bkF = true; ctx.faintTravel = w; }
    if (typeof window !== 'undefined') window.__bk = hooks(ctx);
    const chasing = !!(ST.carry && ctx.chase && ctx.chase.is('bakunawa'));
    if (chasing) {   /* trận đang đuổi theo người chơi sang vùng này */
      const p = ctx.S.player; if (ctx.chase.hostable()) { const wasWait = ST.waiting, TR = ST.travel; ST.travel = null; ST.zone = zidOf(ctx); ST.waiting = false; ST.H = null; ST.body = []; ST.trail = []; markQuiet(ctx);
        if (TR && TR.dest.z === zidOf(ctx)) {   /* tới nơi sau NGOẠM THA: đặt người ở chỗ thoáng hợp địa hình (sky.js đọc altPend sau hệ này) */
          const s0 = landSpot(ctx, TR.dest); if (s0) { p.x = s0.x; p.y = s0.y; if (ctx.S.altPend) { ctx.S.altPend.x = s0.x; ctx.S.altPend.y = s0.y; } }
          ST.landing = { how: TR.how, t: 0, zone: zidOf(ctx), spot: s0 }; ST.arrive = { t: 0, delay: TR.how === 'drop' ? 0.9 : 2.4, how: TR.how }; ST.stats.lands = (ST.stats.lands || 0) + 1; log('landed ' + TR.how + ' ' + zidOf(ctx) + ' ' + (s0 ? s0.ter : '?'));
        } else ST.arrive = { t: 0, delay: wasWait ? 0.6 : 2.5, how: 'follow' };
        ST.fc = { x: p.x, y: p.y }; log('enter chase ' + zidOf(ctx)); }
      else { ST.waiting = true; ST.zone = null; setTimeout(() => { try { ctx.toast(L(ctx).waitOut, true); } catch (e) { /* bỏ qua */ } }, 600); log('wait outside ' + zidOf(ctx)); }
      return;
    }
    if (!inBk(ctx)) { if (!(ctx.chase && ctx.chase.is('bakunawa'))) reset(); return; }
    if (ctx.lyronFinale && ctx.lyronFinale.pending && ctx.lyronFinale.pending()) { reset(); log('lyron pending — no centipede'); return; }   /* rết đã chết trong cốt truyện, đang ở màn Lyron */
    reset(); ST.ctx = ctx; const h = sv(ctx); h.tries++; ctx.persist(); ST.flash = 0.9; ST.zone = zidOf(ctx);
    spawnBoss(ctx);
  },
  onZoneLeave(ctx) { if (ctx.setZoomOut) ctx.setZoomOut(0); if (on(ctx) && ST.death && !ST.death.won) { ST.death.won = true; log('leave during death → win now'); onWin(ctx, { x: ST.death.x, y: ST.death.y + 18 }); }   /* rời vùng lúc rết đang gục: vẫn tính thắng, hết đuổi (trước: trận treo mãi) */
    if (on(ctx)) { bossCamReset(ctx); const carried = ctx.chase && ctx.chase.is('bakunawa') ? carryOut(ctx) : false; if (!carried) { ST.boss = null; ST.mo2 = null; ST.ult = null; ST.ecl = null; ST.act = null; ST.shots = []; ST.tele = []; ST.death = null; ST.shed = null; ST.zone = null; ST.arrive = null; } } },
  update(dt, ctx) {
    if (!on(ctx)) { if (ctx.S.bossFight && !ST.carry && !ST.grab) { ctx.S.bossFight = false; fightCss(false); } return; } ST.t += dt; ST.ctx = ctx; ST.low = !!(ctx.gfxLow && ctx.gfxLow()); if (ST.flash > 0) ST.flash -= dt; installHooks(ctx); preloadArt(); ctx.fsCover = () => !!(ST.grab && (ST.grab.ph === 'carry' || ST.grab.ph === 'escape') && on(ctx));   /* plan-37: cảnh tha bay phủ kín màn → main.js bỏ vẽ nền + vật bên dưới */
    if (!inBk(ctx)) { const p0 = ctx.S.player, k0 = Math.min(1, dt * 0.8); ST.fc = ST.fc ? { x: ST.fc.x + (p0.x - ST.fc.x) * k0, y: ST.fc.y + (p0.y - ST.fc.y) * k0 } : { x: p0.x, y: p0.y }; }
    if (ST.arrive) arriveTick(ctx, dt);
    if (ST.grab) grabTick(ctx, dt);
    if (ST.cons) consTick(ctx, dt);
    if (ST.banner) { ST.banner.t -= dt; if (ST.banner.t <= 0) { ST.banner = ST.queue ? { ...ST.queue, lock: ST.t + 0.9 } : null; ST.queue = null; } }
    ctx.S.bossFight = !!(boss() || ST.carry || ST.grab || ST.cons || ST.arrive) && !ST.won;   /* main.js ẩn dòng nhiệm vụ cốt truyện trong trận */
    fightCss(ctx.S.bossFight);
    if (ctx.S.bossFight) { const pt = rk(ctx); if (pt && (pt.koT || 0) > 4) pt.koT = 4; }   /* trận trùm: Rocky gục chỉ choáng ≤ 4 s rồi quay lại (không 'nghỉ ở tổ' 30 s) */
    if (ST.landing) landingTick(ctx, dt);
    if (ctx.S.bossFight && ctx.S.mode === 'dialog' && ctx.S.talking && ctx.closeDialog) { try { ctx.closeDialog(); } catch (e) { /* bỏ qua */ } if (ctx.S.mode === 'dialog') ctx.setMode('play'); ctx.S.talking = null; callout(ctx, ctx.lang() === 'vi' ? 'Đang đánh trùm — dân làng đang chạy trốn!' : 'Boss fight — the villagers are fleeing!', 1.2); ST.stats.talkBlocked = (ST.stats.talkBlocked || 0) + 1; }   /* trong trận: bấm A cạnh dân không mở hội thoại (trận không bị đứng hình) */
    if (ctx.S.mode !== 'play' && ctx.S.mode !== 'faint') { if (ST.H && !ST.ult) { trailPush(); bodyCalc(); consBody(); chainFix(); } return; }   /* chế độ khác (cảnh cất / hạ cánh, bị quấn…): đầu vẫn có thể di chuyển → thân vẫn phải bám theo (trước: thân đứng yên, đầu đi mất) */
    if (!ctx.monsters) return; if (ST.tcine) tcineTick(ctx, dt);
    const list = ctx.monsters.list(); if (ST.boss && !list.includes(ST.boss)) ST.boss = null; if (ST.mo2 && !list.includes(ST.mo2)) ST.mo2 = null;
    for (const b of [ST.boss, ST.mo2]) if (b && b.kb) b.kb = null;
    if (ST.boss && ST.ultAt.length && !ST.ult && !ST.cons) { const fl = Math.round(ST.boss.max * ST.ultAt[0] * 0.97); if (ST.boss.hp < fl) ST.boss.hp = fl; }
    if (ST.boss && ST.carryAt.length && !ST.grab) { const fl = Math.round(ST.boss.max * ST.carryAt[0] * 0.97); if (ST.boss.hp < fl) ST.boss.hp = fl; }   /* mốc NGOẠM THA không bị bỏ qua */   /* tuyệt chiêu (60 % / 30 %) không bị bỏ qua dù dồn sát thương lúc choáng */
    crackTick(ctx, dt); if (ctx.terrain) { ctx.terrain.cdTick(dt); ctx.terrain.env(dt, TAD(ctx)); if (ctx.terrain.busy() && !(ST.act && ST.act.k === 'terrain') && boss()) ctx.terrain.tick(dt, TAD(ctx)); }   /* trùm choáng / bị ngắt: chiêu địa hình vẫn diễn nốt (không kẹt) */
    if (ST.ecl) eclTick(ctx, dt);
    if (ST.boss && ST.ult) ultTick(ctx, ST.boss, dt);
    if (ST.shed) shedTick(ctx, dt); if (ST.death) deathTick(ctx, dt);
    if (ST.drive && ST.H) { const D = ST.drive; D.t += dt * D.slow; const u = D.t * D.w, H = ST.H, nx = D.cx + Math.sin(u) * D.r, ny = D.cy + Math.sin(u * 2) * D.r * 0.55; H.a = Math.atan2(ny - H.y, nx - H.x); H.sp = Math.hypot(nx - H.x, ny - H.y) / Math.max(1e-3, dt); H.x = nx; H.y = ny; H.z = Math.max(H.z, 6); }   /* test: lái đầu theo hình số 8 gắt */
    if (ST.freeze && ST.H) { const F = ST.freeze; ST.H.x = F.x; ST.H.y = F.y; ST.H.sp = 0; if (F.a != null) ST.H.a = F.a; ST.H.z = 2; }   /* móc test: giữ đầu tại chỗ (quay 360°) */
    if (ST.H && !ST.ult) { trailPush(); bodyCalc(); consBody(); chainFix(); }
    { const b0 = ST.boss; if (b0 && !(b0.intro > 0) && !ST.ult && !ST.grab && !ST.arrive && !ST.death && !ST.hold && ctx.S.mode === 'play' && !(ctx.hero && ctx.hero.fainted)) { if (ST.lastSkillT == null) ST.lastSkillT = ST.t; if (ST.t - ST.lastSkillT > 14) {   /* GÁC CỔNG: 14 s không ra chiêu → ghi lý do + gỡ trạng thái kẹt */
        log('WATCHDOG ' + JSON.stringify({ act: ST.act && ST.act.k, ph: ST.act && ST.act.ph, tcine: !!ST.tcine, cine: !!(ctx.chase && ctx.chase.cineOn()), hid: !!(ctx.alt && ctx.alt.hidden()), h: ctx.alt ? Math.round(ctx.alt.h()) : null, stun: +(b0.stunT || 0).toFixed(1), rage: !!(ST.rage && ST.rage.t < 1.5), d: ST.H ? Math.round(dist(ST.H, ctx.S.player)) : null, tb: ctx.terrain && ctx.terrain.busy() }));
        ST.act = null; ST.tcine = null; if (ctx.terrain && ctx.terrain.busy()) ctx.terrain.cancel(); for (const k of ['bite', 'tail', 'moon']) ST.cd[k] = Math.min(ST.cd[k], 0.2); ST.lastSkillT = ST.t; ST.stats.watchdog = (ST.stats.watchdog || 0) + 1; } } else ST.lastSkillT = ST.t; }
    crossTick(ctx, dt); groundTick(ctx, dt); for (const e of ST.erupts) e.t += dt; ST.erupts = ST.erupts.filter(e => e.t < 0.9);
    /* vị trí quái = điểm thân gần người chơi (chém thân nào cũng trúng) · tuyệt chiêu: = đốt sáng của người chơi */
    const b = boss();
    if (b && ST.H) { let q = null; if (ST.ult && ST.ult.ph === 'coil') { const G = myGlow(ctx) || ST.ult.glow[0]; q = glowPos(ctx, G); } else if (b === ST.mo2) q = ST.H; else q = hitPoint(ctx) || ST.H; b.x = q.x; b.y = q.y; }
    shotsTick(ctx, dt);
    rimTick(ctx, dt);   /* 2026-10-16: vật viền map đổ khi rết bò qua */
    for (const f of ST.fall) { f.t += dt; if (f.t < 0) continue; f.vz -= 220 * dt; f.z = Math.max(0, f.z + f.vz * dt); f.x += f.vx * dt; f.vx *= 0.96; } ST.fall = ST.fall.filter(f => f.t < (ST.keepCorpse ? 1e9 : ST.death ? 9 : 2.4));   /* thân sụp đổ dần từ đầu → đuôi, nằm lại (mờ) */
    for (const f of ST.fx) f.t += dt; ST.fx = ST.fx.filter(f => f.t < f.dur);
    for (const t of ST.tele) { t.t -= dt; if (t.follow === 'head' && ST.H) { t.x = ST.H.x; t.y = ST.H.y; } } ST.tele = ST.tele.filter(t => t.t > 0);
    for (const d of ST.drums) { if (d.flash > 0) d.flash -= dt; if (d.pulse > 0) d.pulse -= dt; }
    if (ST.bloom) { ST.bloom.t += dt; if (ST.bloom.t > 0.9) ST.bloom = null; }
    if (ST.kickCd > 0) ST.kickCd -= dt; if (ST.flare > 0) ST.flare -= dt;
    { const A = ST.act, near = ST.H && dist(ST.H, ctx.S.player) < 110, want = (ST.cons && ST.cons.ph === 'squeeze') || (A && A.k === 'slam' && A.ph === 'rear') ? 1 : ST.ult || ST.tcine || ST.arrive || ST.death ? 0 : A && A.k === 'bite' && A.t < A.T ? 1 : A && A.k === 'tail' ? 0.1 : A ? 0.25 : near ? 0.8 : 0.4; ST.rear = (ST.rear || 0) + (want - (ST.rear || 0)) * Math.min(1, dt * 3); }   /* dựng phần thân trước khi áp sát / sắp cắn */
    const p = ctx.S.player, H = ST.H;
    { const S = ctx.S, k = Math.min(1, dt * 4); S.camDX = (S.camDX || 0) * (1 - k); S.camDY = (S.camDY || 0) * (1 - k); void p; void H; }   /* 2026-10-14 anh: camera LUÔN giữa người chơi (bỏ khung theo trùm) */
    unstick(ctx);
    if (ctx.setZoomOut) ctx.setZoomOut(0);   /* rết đã nhỏ lại: không cần khung nhìn rộng */
    if (ctx.alt) ctx.alt.enemy(boss() && ST.H ? (ST.H.z < -2 ? 0 : ctx.alt.h()) : null);   /* thước độ cao: vạch đỏ = độ cao rết */   /* trùm khổng lồ: khung nhìn rộng suốt trận */
  },
  near(ctx) {
    const p = ctx.S.player, t = L(ctx); if (!on(ctx)) return null;
    if (ST.boss && ST.boss.intro > 0 && INTRO - ST.boss.intro > 0.25) return { label: t.skip, x: p.x, y: p.y - 20, limit: 999, priority: 9, mouse: false, data: { bkSkip: true } };
    if (ST.ult && ST.ult.ph === 'coil') { const G = myGlow(ctx); if (G) { const q = glowPos(ctx, G); if (Math.hypot(q.x - p.x, q.y - p.y) < 30) return { label: t.glowTag(`${ULT.glowHp - G.hp + 1}/${ULT.glowHp}`), x: q.x, y: q.y - 22, limit: 40, priority: 8, cursor: 'tool', data: { bkGlow: true, fight: true } }; } }
    if (ST.keepCorpse && ST.keepCorpse.z === zidOf(ctx)) { const K = ST.keepCorpse, sx = K.x + 26, sy = K.y + 18; if (Math.hypot(sx - p.x, sy - p.y) < 30) return { label: '🧵 ' + t.silk, x: sx, y: sy - 12, limit: 30, priority: 4, data: { bkSilk: true } }; }   /* 2026-10-15: manh mối Lyron */
    if (ST.ecl && ST.ecl.ph === 'dark') for (let i = 0; i < ST.drums.length; i++) { const d = ST.drums[i];   /* trống chỉ hiện nhãn trong Nhật Thực */ if (Math.hypot(d.x - p.x, d.y + 4 - p.y) < 24) return { label: '🥁 ' + t.drumTag, x: d.x, y: d.y - 20, limit: 30, priority: 7, cursor: 'tool', data: { bkDrum: i, fight: true } }; }
    return null;
  },
  interact(ctx, cand) {
    const d = cand && cand.data; if (!d || !on(ctx)) return;
    if (d.bkSkip) { skipIntro(ctx); return; }
    if (d.bkSilk) { const t = L(ctx); callout(ctx, t.silkSay, 3); ctx.sfx('pickup'); setTimeout(() => { if (ST.keepCorpse) { callout(ctx, t.silkRk, 2.6); ctx.sfx('roar'); } }, 2600); sv(ctx).silk = true; ctx.persist(); log('silk clue'); return; }
    if (d.bkGlow) { if (ST.kickCd > 0) return; ST.kickCd = 0.3; const p = ctx.S.player, G = myGlow(ctx); if (!G) return; const q = glowPos(ctx, G); if (p.faceTo) p.faceTo(q.x, q.y); if (p.hasAct && p.hasAct('attack')) p.act('attack', 0); glowHit(ctx, G, 1, 'p'); return; }
    if (d.bkDrum != null) { if (ST.kickCd > 0) return; ST.kickCd = 0.25; if (!ST.drums.length) ST.drums = (ctx.S.map.bkDrums || []).map(q => ({ ...q, lit: false, flash: 0 })); hitDrum(ctx, d.bkDrum); }
  },
  drawGround(g, ctx, cx, cy) {
    if (!on(ctx)) return;
    if (!AIRD(ctx) && inBk(ctx)) drawStormSea(g, ctx, cx, cy);   /* sân trời không sàn: aircombat vẽ trời */
    drawStrip(g, ctx, cx, cy);   /* dải đất xới liền (lớp nền) */
    drawRidge(g, ctx, cx, cy);   /* 2026-10-16: gờ nhô + ụ đầu khi chui dưới đất (dưới hố / người / vật) */
    drawDecals(g, ctx, cx, cy);   /* hố (lớp nền: người / vật luôn ở trên) */
    const G = gyOf(ctx); drawErupts(g, cx, cy, G || 6);   /* đất bung ở lớp nền (sau thân) — không dính lên giáp */

    if (ST.H && !ST.ult && !(ST.grab && (ST.grab.ph === 'carry' || ST.grab.ph === 'escape')) && !(ST.mo2 || ST.shed)) {   /* bóng MỀM nhỏ dưới thân (không trên mặt nước) — nhạt dần theo độ cao */
      g.save(); for (const q of [ST.H, ...ST.body.filter((q2, k) => k % 2 === 0)]) { if (!q || q.z < 0 || overWater(ctx, q.x, q.y)) continue; const k = Math.max(0.25, 1 - Math.max(0, q.z) / 60), w = (q === ST.H ? 16 : 9) * (1.3 - k * 0.3); if (SHADOW.on) pxShadow(g, q.x - cx, q.y - cy - G, q === ST.H ? 32 : 18, Math.max(0, q.z), 0.45); else { g.fillStyle = `rgba(16,10,36,${(0.13 * k).toFixed(3)})`; g.beginPath(); g.ellipse(Math.round(q.x - cx), Math.round(q.y - cy - G), w, w * 0.32, 0, 0, TAU); g.fill(); } }   /* plan-66: ảnh bóng chung theo cụm đốt (đầu + đốt chẵn, theo z — giữ cách cũ) */ g.restore(); }
    for (const f of ST.fx) if (f.ground) drawSheet(g, f.s, Math.min(f.s.n - 1, Math.floor(f.t * (f.s.fps || 12))), f.x - cx, f.y - cy - (f.body ? G : 0), f.alpha * Math.min(1, (f.dur - f.t) * 2));
    drawTele(g, cx, cy);
  },
  drawables(ctx, cx, cy) {
    if (!on(ctx)) return []; const out = [], g = ctx.g, H = ST.H;
    /* trống nghi lễ (ảnh trống đồng PixelLab của trùm 2, 1:1) */
    const dr = B('drumcloud_south') || img('boss/trongdong/drum_s48.png'), dl = AIRD(ctx) ? 10 : 22; for (const d of []) out.push({ y: d.y, f: () => { if (dr) { shadowAt(g, d.x - cx, d.y - cy + 2, 0.9); blit(g, dr, d.x - cx, d.y - cy - 8 - dl, 1); if (d.lit || d.flash > 0 || d.pulse > 0) { g.save(); g.globalCompositeOperation = 'lighter'; blit(g, dr, d.x - cx, d.y - cy - 8 - dl, d.flash > 0 ? 0.8 : d.lit ? 0.45 : 0.3); g.restore(); } } } });
    const carrying = !!(ST.grab && (ST.grab.ph === 'carry' || ST.grab.ph === 'escape'));
    if (H && !ST.ult && !carrying) {
      const bd = ST.body, hide = ST.mo2 || ST.death || ST.shed || (ST.arrive && ST.carry && ST.carry.p2), p = ctx.S.player, dead = ST.death, ha = dead ? Math.max(0.35, 1 - Math.max(0, dead.t - 2.0) / 1.5) : 1, foam = VX('bk_foam');
      /* 2026-10-14 (anh: rết vẽ đè / lộn lớp, che người): CẢ con rết = 1 lượt vẽ đuôi → đầu, ĐẦU LUÔN TRÊN thân; sắp ngay TRƯỚC người chơi → không bao giờ che người.
         Đốt chìm dưới mặt nước (z < 0) mờ dần rồi ẩn; chỗ thân chạm / xuyên mặt nước có bọt (VFX PixelLab bk_foam). Bỏ bóng đen từng đốt (bóng mềm ở drawGround). */
      /* 2026-10-14 (anh: cây vẽ đè đầu rết; người nằm ngất bị thân đè): sắp lớp THEO TỪNG CỤM 6 đốt với cây / vật (theo y chân), NHƯNG cụm nào chồng lên người chơi
         (kể cả lúc nằm) thì xếp ngay DƯỚI người → người luôn hiện rõ. Đầu luôn trên cụm cổ (khoá thứ tự đầu ≥ cụm đầu tiên). */
      const pb = { x0: p.x - 12, x1: p.x + 12, y0: p.y - 28, y1: p.y + 10 }, over = (x0, x1, y0, y1) => x0 < pb.x1 && x1 > pb.x0 && y0 < pb.y1 && y1 > pb.y0, PK = p.y - 30;   /* cụm chồng lên người: xếp hẳn dưới người + bè / cầu tàu người đang đứng */
      let firstKey = -1e9; const consOn = !!(ST.cons && (ST.cons.ph === 'wrap' || ST.cons.ph === 'squeeze')), npcB = (ctx.S.npcs || []).filter(n => Math.abs(n.x - p.x) < 260 && Math.abs(n.y - p.y) < 200);
      if (!hide) { const VWc = ctx.VW || 480, VHc = ctx.VH || 270, vis = bd.filter(q => q.z >= -10 && q.x - cx > -70 && q.x - cx < VWc + 70 && q.y - cy > -60 && q.y - cy < VHc + 80).map(q => ({ q, kind: q.i === SEG_N + 1 ? 'tail' : (ST.crack && ST.crack.segs.some(c => c.i === q.i && !c.dead)) ? 'segglow' : 'seg', a: sinkA(q.z), z: Math.max(0, q.z) + rearZ(q.i) }));   /* chìm vào mây / đất / nước: mờ dần qua ~3 đốt, KHÔNG cắt cứng */
        const CHK = consOn ? 1 : 6; for (let k = 0; k < vis.length; k += CHK) { const grp = vis.slice(k, k + CHK); let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9, ky = -1e9; for (const o of grp) { x0 = Math.min(x0, o.q.x - 14); x1 = Math.max(x1, o.q.x + 14); y0 = Math.min(y0, o.q.y - LIFT - o.z - 16); y1 = Math.max(y1, o.q.y + 4); ky = Math.max(ky, o.q.y); }
          let key = over(x0, x1, y0, y1) ? PK - 0.01 * (k + 1) : ky; for (const n of npcB) if (x0 < n.x + 12 && x1 > n.x - 12 && y0 < n.y + 6 && y1 > n.y - 34) key = Math.min(key, n.y - 30);   /* dân / NPC (cả bảng tên) không bị thân che */
          if (consOn) { const fr = grp.reduce((m2, o) => m2 + o.q.y, 0) / grp.length > ST.cons.y + CONS_YC + 1 && Math.hypot(grp[0].q.x - ST.cons.x, grp[0].q.y - ST.cons.y - CONS_YC) < 40; key = fr ? p.y + 0.5 : PK; if (fr) grp.forEach(o => { o.a = Math.min(o.a, 0.55); }); }   /* vòng quấn: đốt TRƯỚC người vẽ sau + bán trong suốt */ if (k === 0) firstKey = key; const rg = grp.slice().reverse();
          out.push({ y: key, f: () => { for (const o of rg) { if (!drawLegs(g, o.q.x - cx, o.q.y - cy, o.z, o.q.a, o.q.i, o.a)) drawSeg(g, o.kind, o.q.x - cx, o.q.y - cy, o.z, o.q.a, o.a, o.q.i); } for (const o of rg) drawSeg(g, o.kind, o.q.x - cx, o.q.y - cy, o.z, o.q.a + (o.kind === 'tail' ? Math.sin(ST.t * 5) * 0.18 : 0), o.a, o.q.i, true);
            if (foam) for (const o of rg) { const q = o.q; if (q.z < 3 && q.z > -6 && overWater(ctx, q.x, q.y) && (q.i % 2 === 0)) drawSheet(g, foam, Math.floor(ST.t * (foam.fps || 8) + q.i) % foam.n, q.x - cx, q.y - cy - LIFT + foam.h / 2 - 2, 0.9); } } }); } }
      const hzv = ST.body.length ? Math.min(H.z, ST.body[0].z) : H.z;   /* đầu hiện theo cổ: đốt 1 còn chìm thì đầu cũng mờ / ẩn */
        if (hzv > -10 && ha > 0) { const hz = Math.max(0, H.z) + rearZ(0), hk0 = over(H.x - 30, H.x + 30, H.y - LIFT - hz - 50, H.y + 8) ? PK - 0.001 : H.y + 12, hk = hk0 === PK - 0.001 ? hk0 : Math.max(hk0, firstKey + 0.001);
        out.push({ y: hk, f: () => { const rk2 = Math.max(0, Math.min(1, ((ST.rear || 0) - 0.86) / 0.12)),   /* đầu nhìn từ trên gần như suốt trận; chỉ lúc DỰNG LÊN sắp cắn mới hoà sang đầu 8 hướng */ al0 = sinkA(hzv) * ha;   /* bò thấp: ĐẦU NHÌN TỪ TRÊN xoay mượt 360° · dựng lên áp sát: hoà sang đầu 8 hướng (mặt + kìm to) */
          const topOk = rk2 < 0.5 && drawHeadTop(g, H.x - cx, H.y - cy, hz, H.a, H.open, al0); if (!topOk) drawHead(g, H.x - cx, H.y - cy, hz, H.a, H.open, al0);   /* 2026-10-14 (anh: 'đầu 3 nấc'): luôn đúng MỘT đầu — đổi gọn ở ngưỡng dựng, không vẽ chồng 2 đầu mờ */
          if (ST.flare > 0) { g.save(); g.globalCompositeOperation = 'lighter'; drawHead(g, H.x - cx, H.y - cy, hz, H.a, H.open, Math.min(0.5, ST.flare * 0.5)); g.restore(); } } }); }
      ST.drawKeys = { first: firstKey, p: PK };
      out.push({ y: p.y - 0.4, f: () => drawCollars(g, ctx, cx, cy) });
      /* đất bung vẽ ở lớp nền (drawGround) */   /* cổ sương chỗ thân xuyên mặt mây / đất / nước — trên thân, dưới người */
    }
    if (ST.ult) {   /* vòng thân quấn quanh đài + 2 đốt sáng + đầu đớp */
      const U = ST.ult, c = C0(ctx), R = ringR(ctx, U), n = Math.max(24, Math.round(TAU * R / 12)), al = U.ph === 'rise' ? ease(U.t / ULT.rise) : U.ph === 'burst' || U.ph === 'crushed' ? Math.max(0, 1 - U.t / 0.8) : 1;
      for (let i = 0; i < n; i++) { const a = U.rot + i / n * TAU, x = c.x + Math.cos(a) * R, y = c.y + Math.sin(a) * R * RY, ta = a + Math.PI / 2; let kind = 'seg';
        for (const G of U.glow) if (!G.dead && Math.abs(angDiff(a, G.a + U.rot)) < Math.PI / n) kind = 'segglow';
        const bx = U.ph === 'burst' ? Math.cos(a) * U.t * 90 : 0, by = U.ph === 'burst' ? Math.sin(a) * U.t * 80 : 0;
        out.push({ y: y + by, f: () => { drawSegFull(g, kind, x + bx - cx, y + by - cy, 0, ta, al, i); } }); }
      /* nhãn 'BẠN ◆◆◆' bỏ (anh: chữ đè) — khớp sáng tự nói */
      { const B2 = U.bite && U.bite.t >= ULT.warn * 0.6 ? U.bite : null, fa = B2 ? Math.atan2((B2.y1 - c.y) / RY, B2.x1 - c.x) : U.rot, rx = c.x + Math.cos(fa) * R, ry = c.y + Math.sin(fa) * R * RY;   /* ĐẦU LUÔN NỐI THÂN: đầu ở mũi vòng (dựng lên nhìn vào trong) hoặc vươn vào đớp — cổ đốt nối từ vòng tới đầu */
        const hx = B2 ? B2.x : c.x + Math.cos(fa) * (R - 8), hy = B2 ? B2.y : c.y + Math.sin(fa) * (R - 8) * RY, ha = B2 ? B2.a : fa + Math.PI, d = Math.hypot(hx - rx, hy - ry), nn = Math.max(1, Math.ceil(d / SP)), neck = [];
        for (let k = 1; k < nn; k++) { const u = k / nn, bend = Math.sin(u * Math.PI) * Math.min(14, d * 0.12); neck.push({ x: rx + (hx - rx) * u - Math.sin(ha) * bend, y: ry + (hy - ry) * u + Math.cos(ha) * bend, z: 4 + 10 * u }); }
        U.neck = { hx, hy, rx, ry, n: neck.length, gap: neck.length ? Math.hypot(hx - neck[neck.length - 1].x, hy - neck[neck.length - 1].y) : d };
        out.push({ y: Math.max(hy, ry) + 1, f: () => { let px0 = rx, py0 = ry; let ni = 0; for (const q of neck) { const a2 = Math.atan2(q.y - py0, q.x - px0); drawSegFull(g, 'seg', q.x - cx, q.y - cy, q.z, a2, al, ni++); px0 = q.x; py0 = q.y; } if (!drawHeadTop(g, hx - cx, hy - cy, 14, ha, B2 ? 1 : 0.4, al)) drawHead(g, hx - cx, hy - cy, 14, ha, B2 ? 1 : 0.4, al); } }); }
    }
    if (ST.mo2 || (ST.death && H) || ST.shed) { if (H) { const D = ST.death, al = D ? Math.max(0, 1 - Math.max(0, D.t - 1.0) / 1.4) : 1; out.push({ y: H.y + 1, f: () => { shadowAt(g, H.x - cx, H.y - cy, 1.6, Math.max(0, H.z || 0)); drawHead(g, H.x - cx, H.y - cy, Math.max(0, H.z), H.a, ST.death ? 1 : H.open, al); } }); } }
    /* 2026-10-14: bỏ chấm số trên khớp (anh tưởng đồng xu '3') — chỉ còn vết nứt sáng trên giáp */
    if (ST.keepCorpse && ST.keepCorpse.z === zidOf(ctx)) { const K = ST.keepCorpse, hd = img('boss/lyron/corpse/deadhead_s_south-east.png'), sk = img('boss/bakunawa/silk_clue.png');   /* mũ trùm nứt RỖNG (PixelLab, ảnh xác của lyron_finale) + sợi lụa đỏ (PixelLab) — hình tĩnh */
      if (hd) out.push({ y: K.y + 14, f: () => { const w = hd.naturalWidth / 2, h = hd.naturalHeight / 2; g.save(); g.imageSmoothingEnabled = false; g.drawImage(hd, 0, 0, hd.naturalWidth, hd.naturalHeight, Math.round(K.x - cx - w / 2), Math.round(K.y - cy - h + 16), w, h); g.restore(); } });
      if (sk) out.push({ y: K.y + 18, f: () => { const w = sk.naturalWidth / 2, h = sk.naturalHeight / 2; g.save(); g.imageSmoothingEnabled = false; g.drawImage(sk, 0, 0, sk.naturalWidth, sk.naturalHeight, Math.round(K.x + 26 - cx - w / 2), Math.round(K.y + 18 - cy - h / 2), w, h); g.restore(); } }); }
    for (const f of ST.fall) { if (f.t < 0) { out.push({ y: f.y, f: () => drawSegFull(g, f.kind, f.x - cx, f.y - cy, f.z, f.a, 1, f.li || 0) }); continue; } const a = ST.keepCorpse ? Math.max(0.8, 1 - f.t / 2.4) : Math.max(0.25, 1 - f.t / 2.4); out.push({ y: f.y, f: () => { drawSegFull(g, f.kind, f.x - cx, f.y - cy, Math.max(0, f.z), f.a, a, f.li || 0); } }); }
    if (ST.death && ST.death.lyron) { const D = ST.death, u = Math.min(1, D.lyron.t / 1.1), ly = img('chars/lyron2.png'); if (ly) out.push({ y: D.y + 20, f: () => {   /* LYRON bước ra từ mũ trùm vỡ, đứng trên xác */
      const x = D.x, y0 = D.y - 30, y1 = D.y + 18, y = y0 + (y1 - y0) * ease(u), fr = u < 1 ? 1 + (Math.floor(D.lyron.t * 8) % 2) : 0; shadowAt(g, x - cx, y1 - cy, u);
      g.save(); g.globalAlpha = Math.min(1, D.lyron.t * 2.5); g.drawImage(ly, fr * 32, 0, 32, 40, Math.round(x - 8 - cx), Math.round(y - 18 - cy), 16, 20); g.restore(); } }); }   /* thân rơi rụng vào mây */
    if (ST.death && H && false) { const D = ST.death, u = Math.min(1, D.t / 1.4), sun = B('sun'), moon = B('bloodmoon'), pe = B('pearl'); void pe;   /* nhả mặt trời + trăng bay vút lên */
      out.push({ y: 1e8, f: () => { if (D.t > 0.4) { if (sun) blit(g, sun, H.x - 18 * u - cx, H.y - 20 - 70 * u - cy, Math.min(1, (D.t - 0.4) * 3)); const mn = B('moonscale'); if (mn) blit(g, mn, H.x + 22 * u - cx, H.y - 16 - 60 * u - cy, Math.min(1, (D.t - 0.4) * 3)); } } }); }
    for (const s of ST.shots) if (s.kind === 'moon' && s.t > 0) { const im = B('venomshard') || B('moonscale'), va = s.va ?? s.a, fade = Math.min(1, (s.out + s.back - s.t) / 0.25); out.push({ y: s.y, f: () => {   /* Nọc Lôi: mảnh nọc LAO theo hướng bay (không xoay tròn như boomerang), vệt sương tím phía sau, mờ khi về */
      const sm = g.imageSmoothingEnabled; g.imageSmoothingEnabled = true; for (let j = 1; j <= 4; j++) { const fi = fogTint(j & 3, '#9a6ae8'); if (!fi) continue; const x = s.x - Math.cos(va) * j * 6 - cx, y = s.y - 6 - Math.sin(va) * j * 6 - cy, w = 18 - j * 2.5; g.globalAlpha = 0.4 * (1 - j / 5) * fade; g.drawImage(fi, x - w / 2, y - w * 0.32, w, w * 0.64); } g.globalAlpha = 1; g.imageSmoothingEnabled = sm;
      if (im) blitRot(g, im, s.x - cx, s.y - cy - 6, va + Math.PI / 4, fade); } }); }
    for (const f of ST.fx) if (!f.ground) out.push({ y: f.top ? 1e9 : f.y + 6, f: () => { const fr = Math.min(f.s.n - 1, Math.floor(f.t * (f.s.fps || 12))); drawSheet(g, f.s, fr, f.x - cx, f.y - cy - (f.body ? gyOf(ctx) : 0), f.alpha); if (f.glowT && f.t < 0.2 + f.glowT) { g.save(); g.globalCompositeOperation = 'lighter'; drawSheet(g, f.s, fr, f.x - cx, f.y - cy, 0.55); g.restore(); } } });   /* tia chính CHÓI: cộng sáng thêm 1 lớp */
    rimDraws(ctx, cx, cy, out);   /* 2026-10-16: vật viền map đang đổ */
    return out;
  },
  draw(g, ctx, cx, cy) {
    if (!on(ctx)) return; const VW = ctx.VW || 480, VH = ctx.VH || 270;
    if (ST.ult) { const a = ST.ult.ph === 'rise' ? ease(ST.ult.t / ULT.rise) : ST.ult.ph === 'coil' ? 1 : Math.max(0, 1 - ST.ult.t / 1); g.save(); g.globalAlpha = 0.22 * a; g.fillStyle = '#a01020'; g.fillRect(0, 0, VW, VH); g.restore(); }   /* trăng máu: sân nhuốm đỏ (chỉ trong tuyệt chiêu) */
    const E = ST.ecl, Bl = ST.bloom;
    if (false) { }   /* Nhật Thực đã bỏ (anh 2026-10-14) */   /* vành nhật thực vẫn sáng trên nền tối */   /* vòng báo PHÁT SÁNG trên lớp tối */
    else if (Bl && false) { const u = Bl.t / 0.9, R = 20 + 640 * ease(u); if (!ST.death) darkLayer(g, ctx, cx, cy, Math.max(0, 1 - u * 0.6), { x: Bl.x, y: Bl.y, r: R }); g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.6 * (1 - u); g.strokeStyle = '#fff2c0'; g.lineWidth = 6; g.beginPath(); g.arc(Math.round(Bl.x - cx), Math.round(Bl.y - cy), R, 0, TAU); g.stroke(); g.globalAlpha = 0.25 * (1 - u); g.fillStyle = '#fff6d8'; g.beginPath(); g.arc(Math.round(Bl.x - cx), Math.round(Bl.y - cy), R, 0, TAU); g.fill(); g.restore(); }   /* nhả mặt trời: sân sáng bừng từ tâm theo vòng */
    if (ST.flash > 0) { g.save(); g.globalAlpha = Math.min(1, ST.flash); g.fillStyle = '#ffffff'; g.fillRect(0, 0, VW, VH); g.restore(); }   /* vừa xuyên Cổng Trời: trắng xoá tan dần */
    drawCarry(g, ctx);   /* NGOẠM THA: cảnh bay phủ toàn màn */
  },
  drawUI(ug, ctx, cx, cy, scale) {
    if (!on(ctx) || (ctx.S.mode !== 'play' && ctx.S.mode !== 'faint' && ctx.S.mode !== 'bkcarry')) return; const W = ug.canvas.width, Hh = ug.canvas.height, t = L(ctx), b = boss(), isP2 = !!b && b === ST.mo2;
    const font = px2 => `${Math.round(px2)}px VT323, monospace`; let yb = 60;
    if (b && !(ST.boss && ST.boss.intro > 0)) {
      const fr = img('ui/bakunawa/bossbar.png'), narrow = W < 560, low = Hh < 460, bw0 = narrow ? W * 0.92 : Math.min(low ? W * 0.44 : W * 0.9, 430, Math.max(300, W * 0.4)), BB = bossBarBox(ug, bw0, bw0 * 48 / 256 + 26), bw = BB.w, bh = bw * 48 / 256, bx = BB.x, by = BB.y, tcx = BB.cx;
      const ix = bx + bw * 27 / 256, iy = by + bh * 18 / 48, iw = bw * (226 - 27) / 256, ih = bh * 15 / 48, k = Math.max(0, b.hp / b.max);
      ug.save(); ug.imageSmoothingEnabled = false; ug.fillStyle = '#0a0a1a'; ug.fillRect(ix, iy, iw, ih);
      const gr = ug.createLinearGradient(0, iy, 0, iy + ih); gr.addColorStop(0, ST.rage ? '#ffc0a8' : '#d8a8ff'); gr.addColorStop(0.45, ST.rage ? '#c03050' : '#7a34b8'); gr.addColorStop(1, ST.rage ? '#5a1020' : '#2e0c4a');   /* thanh máu tím (nổi giận: đỏ) — khung PixelLab đầu rết */ ug.fillStyle = gr; ug.fillRect(ix, iy, iw * k, ih);
      if (fr) ug.drawImage(fr, bx, by, bw, bh);
      const fs = Math.max(14, bh * 0.36); ug.font = font(fs); ug.textAlign = 'center'; ug.textBaseline = 'top';
      const nm = isP2 ? (narrow ? `${t.ph2name} · ${t.phase(2)}` : `${t.ph2name} · ${t.ph2sub} · ${t.phase(2)}`) : (narrow ? `${t.name}${ST.rage ? ' · ' + t.rageTag : ''}` : `${t.name} · ${t.sub}${ST.rage ? ' · ' + t.rageTag : ''}`);
      ug.fillStyle = '#000'; ug.fillText(nm, tcx + 1, by + bh + 1, bw); ug.fillStyle = '#e8f4ff'; ug.fillText(nm, tcx, by + bh, bw); yb = by + bh + fs + 6;
      /* hàng trạng thái: mặt trời / nhật thực / trăng máu (ảnh PixelLab, 1:1 theo scale) + chữ */
      const E = ST.ecl, U = ST.ult, st = ST.boss && ST.boss.stunT > 0;
      const cel = null, cs = 0, fs2 = Math.max(13, bh * 0.3), CR = ST.crack;
      const txt = U && U.ph === 'coil' ? t.ultHud((U.glow[0].dead ? '✔' : '◆'.repeat(U.glow[0].hp)), (U.glow[1].dead ? '✔' : '◆'.repeat(U.glow[1].hp)), Math.max(0, Math.ceil(ULT.dur - U.t))) : CR ? t.crackHud(CR.segs.filter(z => z.dead).length, CR.segs.length, Math.ceil(CR.dur - CR.t)) : st ? t.stunHud(Math.ceil(ST.boss.stunT)) : '';   /* không có sự kiện → không dòng phụ */
      if (txt) { void cel; void cs; ug.font = font(fs2); const rh2 = Math.round(fs2 * 1.25), tw = Math.min(bw - 8, ug.measureText(txt).width), x0 = Math.round(tcx - tw / 2);   /* 1 dòng trạng thái ngắn, hộp đủ cao (trước: hộp 4 px → chữ tràn đè băng chữ) */
        ug.fillStyle = 'rgba(16,8,30,.78)'; ug.fillRect(x0 - 6, yb, tw + 12, rh2); ug.textAlign = 'left'; ug.textBaseline = 'middle'; ug.fillStyle = '#000'; ug.fillText(txt, x0 + 1, yb + rh2 / 2 + 1, bw - 8); ug.fillStyle = U ? '#ffb0a8' : CR ? '#ffe27a' : '#a0ffd8'; ug.fillText(txt, x0, yb + rh2 / 2, bw - 8);
        yb += rh2 + 4; }
      if (E && E.ph === 'dark') {   /* thanh nhịp (khung PixelLab của trùm 2): ánh sáng chạy tới dấu ‹•› giữa thanh */
        const fb = img('ui/trongdong/beatbar.png'), ob = img('ui/trongdong/beat_orb.png'), band = freeBand(ug, yb, Math.min(bw * 0.9, 300) * 48 / 256), rw = Math.min(bw * 0.9, 300, band.x1 - band.x0 - 8), rh = rw * 48 / 256, rx = Math.round(Math.max(band.x0 + 4, Math.min(band.x1 - 4 - rw, tcx - rw / 2))), ry = Math.round(yb);   /* 2026-10-14: điện thoại dọc — không đè nút HUD phải */
        ST.beatBox = { x: rx, y: ry, w: Math.round(rw), h: Math.round(rh) };
        const tx0 = rx + rw * 12 / 256, tx1 = rx + rw * 244 / 256, tm = (tx0 + tx1) / 2, ty = ry + rh / 2, span = 3 * 2 * BEAT, half = tx1 - tm;
        ug.fillStyle = 'rgba(10,6,2,.85)'; ug.fillRect(tx0, ry + rh * 9 / 48, tx1 - tx0, rh * 31 / 48);
        if (onBeatNow()) { ug.fillStyle = 'rgba(255,226,122,.35)'; ug.fillRect(tm - rh * 0.6, ry + rh * 9 / 48, rh * 1.2, rh * 31 / 48); }
        if (ob) { const os = rh * 0.62, ph = ST.beatF / 2 - Math.floor(ST.beatF / 2), past = ph * 2 * BEAT; for (let i = 0; i < 4; i++) { const tt = (i === 0 ? -past : (1 - ph) * 2 * BEAT + (i - 1) * 2 * BEAT); if (tt < -WIN * 1.5 || tt > span) continue; const ox = tm + tt / span * half; if (ox < tx0 || ox > tx1) continue; ug.globalAlpha = tt < 0 ? 0.4 : 1; ug.drawImage(ob, Math.round(ox - os / 2), Math.round(ty - os / 2), Math.round(os), Math.round(os)); ug.globalAlpha = 1; } }
        if (fb) ug.drawImage(fb, rx, ry, rw, rh); yb = ry + rh + 4;
      }
      ST.uiTop = yb; ST.uiTopL = yb / Math.max(1, (globalThis.__u89?globalThis.__u89(scale):scale)); ug.restore();
    }
    if (ST.banner) {
      const a = Math.min(1, ST.banner.t * 3), fs = Math.max(17, Math.min(W / 22, (globalThis.__u89?globalThis.__u89(scale):scale) * 7)); ug.save(); ug.globalAlpha = a; ug.font = font(fs); ug.textAlign = 'center'; ug.textBaseline = 'middle';
      let y = Math.max(Hh * 0.2, yb + fs * 0.9); const pb = typeof document !== 'undefined' && document.getElementById('px-banner'); if (pb && !pb.hidden) { const r = pb.getBoundingClientRect(); if (r.height > 0) y = Math.max(y, r.bottom * (W / innerWidth) + fs * 0.75); }   /* không đè dải đỏ thông báo lớn (Siêu Cấp Rocky…) — xếp xuống dưới */
      /* 2026-10-15 (bố cục HUD mới: cột phải đồng hồ → máu/Ki → thước độ cao kéo gần hết chiều cao điện thoại dọc): dải tên chiêu thu HẸP vào khoảng trống giữa các ô HUD 2 bên, chữ dài thì xuống 2 dòng — không còn chạy dưới thanh máu */
      const R = hudRects(ug); let x0 = 0, x1 = W; if (R.ok) for (const r of R.hit) { if (r.y1 < y - fs * 0.8 || r.y0 > y + fs * 1.9) continue; if ((r.x0 + r.x1) / 2 > W / 2) x1 = Math.min(x1, r.x0 - 6); else x0 = Math.max(x0, r.x1 + 6); }
      if (x1 - x0 < 160) { x0 = 0; x1 = W; } const maxW = x1 - x0 - 24, txt = ST.banner.txt; let lines = [txt];
      if (ug.measureText(txt).width > maxW) { const ws = txt.split(' '); let best = null; for (let i = 1; i < ws.length; i++) { const l1 = ws.slice(0, i).join(' '), l2 = ws.slice(i).join(' '), m = Math.max(ug.measureText(l1).width, ug.measureText(l2).width); if (!best || m < best.m) best = { m, l: [l1, l2] }; } if (best) lines = best.l; }
      const lw = Math.min(maxW, Math.max(...lines.map(l => ug.measureText(l).width))), tw = lw + 24, cx = Math.round((x0 + x1) / 2), lh = fs * 1.15, th = lh * lines.length + fs * 0.1; ug.fillStyle = 'rgba(14,10,34,.74)'; ug.fillRect(cx - tw / 2, y - fs * 0.6, tw, th);
      lines.forEach((l, i) => { const ly = y + i * lh; ug.fillStyle = '#000'; ug.fillText(l, cx + 2, ly + 2, maxW); ug.fillStyle = '#f0f4ff'; ug.fillText(l, cx, ly, maxW); }); ug.restore();
    }
    const G = ST.grab && ST.grab.ph === 'carry' ? ST.grab : (ST.cons && ST.cons.ph === 'squeeze') ? { mash: ST.cons.mash, shake: ST.cons.shake, cons: true, dest: { z: zidOf(ctx) } } : null; if (G) {   /* GIÃY: chữ nhắc + thanh giãy (khung PixelLab ui/bakunawa/mashbar) — ở 2/3 dưới màn, trên cần điều khiển */
      const fr = img('ui/bakunawa/mashbar.png'), bw = Math.min(W * 0.62, 340), bh = fr ? bw * fr.naturalHeight / fr.naturalWidth : bw * 0.16, bx = Math.round((W - bw) / 2), by = Math.round(Hh * 0.66), k = Math.min(1, G.mash / (G.cons ? CONS.need : GRAB.need)), pulse = G.shake > 0 ? 1 : 0;
      ug.save(); ug.imageSmoothingEnabled = false; const ix = bx + bw * 19 / 256, iy = by + bh * 17 / 64, iw = bw * 216 / 256, ih = bh * 30 / 64;   /* khe trong của khung PixelLab */ ug.fillStyle = '#1a0c22'; ug.fillRect(ix, iy, iw, ih);
      const gr = ug.createLinearGradient(0, iy, 0, iy + ih); gr.addColorStop(0, '#ffe8a0'); gr.addColorStop(1, '#d08a20'); ug.fillStyle = gr; ug.fillRect(ix, iy, iw * k, ih); if (fr) ug.drawImage(fr, bx, by, bw, bh); else { ug.strokeStyle = '#ffd860'; ug.lineWidth = 2; ug.strokeRect(ix - 2, iy - 2, iw + 4, ih + 4); }
      const fs = Math.max(18, Math.min(W / 16, (globalThis.__u89?globalThis.__u89(scale):scale) * 8)) * (1 + pulse * 0.08); ug.font = font(fs); ug.textAlign = 'center'; ug.textBaseline = 'bottom'; ug.fillStyle = '#000'; ug.fillText(t.mash, W / 2 + 2, by - 2); ug.fillStyle = '#fff0b0'; ug.fillText(t.mash, W / 2, by - 4);
      ug.font = font(Math.max(13, fs * 0.6)); ug.textBaseline = 'top'; ug.fillStyle = '#e8eeff'; ug.fillText(G.cons ? t.consHint : t.carryTo(zname(ctx, G.dest.z)), W / 2, by + bh + 4); ug.restore(); }
  },
};

/* móc test (QA) */
function hooks(ctx) {
  return {
    st: () => { const b = ST.boss, m2 = ST.mo2, H = ST.H; return { pace: { gapT: +(ST.gapT || 0).toFixed(2), chainN: ST.chainN || 0, chainLen: ST.chainLen || 0, final: ST.final || 0, mv: ST.mv ? ST.mv.k : null, turn: Math.round(ST.turn || 0), gov: +(ST.stats.gov || 0).toFixed(1), act: ST.act ? ST.act.k : null }, corpse: ST.keepCorpse ? { x: Math.round(ST.keepCorpse.x), y: Math.round(ST.keepCorpse.y), z: ST.keepCorpse.z, fall: ST.fall.length } : null, stuck: ST.stuck ? { x: Math.round(ST.stuck.x), y: Math.round(ST.stuck.y), t: +ST.stuck.t.toFixed(1) } : null, stuckN: ST.stats.stuck || 0, craterN: (GC.by[zidOf(ctx)] || []).filter(q => q.crater).length, craterXY: (GC.by[zidOf(ctx)] || []).filter(q => q.crater).map(q => [Math.round(q.x), Math.round(q.y)]), stun: ST.boss ? +(ST.boss.stunT || 0).toFixed(1) : 0, phase: ST.won ? 'won' : ST.death ? 'death' : m2 ? 'p2' : ST.shed ? 'shed' : b ? 'p1' : '-', inBk: inBk(ctx), gate: gateOk(ctx),
      boss: b ? { x: Math.round(b.x), y: Math.round(b.y), hp: Math.round(b.hp), max: b.max, phase: b.phase, intro: b.intro > 0, stun: +(b.stunT || 0).toFixed(2) } : null,
      p2: m2 ? { hp: Math.round(m2.hp), max: m2.max } : null, H: H && { x: Math.round(H.x), y: Math.round(H.y), z: Math.round(H.z), a: +H.a.toFixed(2), dir: dirOf(Math.cos(H.a), Math.sin(H.a)), open: H.open > 0.2 },
      body: ST.body.map(q => ({ x: Math.round(q.x), y: Math.round(q.y), z: Math.round(q.z) })), act: ST.act && { k: ST.act.k, ph: ST.act.ph, x1: ST.act.x1, y1: ST.act.y1, x2: ST.act.x2, y2: ST.act.y2 }, ecl: ST.ecl && { ph: ST.ecl.ph, left: ST.ecl.left != null ? +ST.ecl.left.toFixed(1) : null, darkK: ST.ecl.darkK },
      drums: ST.drums.map(d => ({ x: d.x, y: d.y, lit: d.lit })), ult: ST.ult && { ph: ST.ult.ph, t: +ST.ult.t.toFixed(1), R: Math.round(ST.ult.R || 0), glow: ST.ult.glow.map(g => ({ who: g.who, hp: g.hp, dead: !!g.dead, ...(() => { const q = glowPos(ctx, g); return { x: Math.round(q.x), y: Math.round(q.y) }; })() })) },
      shots: ST.shots.map(s => ({ t: +s.t.toFixed(2), x: Math.round(s.x), y: Math.round(s.y), out: s.t < s.out })), tele: ST.tele.map(q => q.type), cd: Object.fromEntries(Object.entries(ST.cd).map(([k, v]) => [k, +v.toFixed(1)])), seq: ST.seq.slice(),
      tgt: ST.tgt, tgtLog: { ...ST.tgtLog }, zone: ST.zone, on: on(ctx), carry: ST.carry ? { p2: ST.carry.p2, hp: Math.round(ST.carry.hp), max: ST.carry.max } : null, arrive: !!ST.arrive, tcine: !!ST.tcine, waiting: ST.waiting, follows: ST.follows.slice(), tier: tierNow(ctx), bz: BZ(ctx), beatBox: ST.beatBox || null, chase: !!(ctx.chase && ctx.chase.is('bakunawa')), won: ST.won, gave: ST.gave || [], onBeat: onBeatNow(), toAcc: +toAcc().toFixed(3), beatF: +ST.beatF.toFixed(2), sync: !!ST.sync, stats: JSON.parse(JSON.stringify(ST.stats)), save: { ...sv(ctx) }, log: ST.log.slice(-120), t: +ST.t.toFixed(1), uiTopL: ST.uiTopL, segReady: !!segSet('seg') }; },
    drive: (on, r = 60, w = 1.6, slow = 1) => { const c = ctx.S.map.bkCenter || ctx.S.player; ST.drive = on ? { t: 0, cx: c.x, cy: c.y, r, w, slow } : null; },
    crack: () => { ST.cd.crack = 0; startCrack(ctx); }, crackHit: (k, who) => { const c = ST.crack && ST.crack.segs.find(z => !z.dead); if (c) crackHit(ctx, c, k || 1, who || 'p'); }, crackSt: () => ST.crack ? { t: +ST.crack.t.toFixed(1), segs: ST.crack.segs.map(z => ({ i: z.i, hp: z.hp, dead: z.dead, ...(crackPos(z) || {}) })) } : null,
    addHits: n => { ST.hitN = (ST.hitN || 0) + n; },
    rim: () => { const m = ctx.S.map, L0 = m && rimMap(ctx) ? rimOf(ctx, m) : []; return { on: !!rimMap(ctx), n: L0.length, ruined: L0.filter(o => o.ruined || o.bkRim).length, live: RIM.live.length, ghosts: RIM.ghosts.length, stats: { ...RIM.stats }, mv: ST.mv ? ST.mv.k + (ST.mv.leg || '') : null, cfg: { near: RIM.near, p: RIM.p, cd: RIM.cd } }; },   /* 2026-10-16 viền map */
    rimGo: () => { RIM.lastT = -99; const p0 = RIM.p; RIM.p = 1; const mv = rimMove(ctx); RIM.p = p0; if (mv) ST.mv = mv; return mv; }, rimCfg: o => Object.assign(RIM, o || {}), rockFx: (n, x, y) => rockFx(n, x, y), vxStat: n => { const s = VX(n); if (!s || !s.img || !s.img.getContext) return null; const im = s.img, d = im.getContext('2d').getImageData(0, 0, im.__w || im.width, im.__h || im.height).data; let k = 0, r = 0, g = 0, b = 0; for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 40) { k++; r += d[i]; g += d[i + 1]; b += d[i + 2]; } return { n: k, r: Math.round(r / k), g: Math.round(g / k), b: Math.round(b / k), hi: im.__hi || 0, w: s.w, h: s.h, frames: s.n }; },
    terrain: k => { ST.act = null; ST.tPick = k; if (ctx.terrain && ST.H && ctx.terrain.start(k, TAD(ctx))) { ST.act = { k: 'terrain', t: 0, nm: k }; ST.seq.push('t_' + k); return true; } return false; },
    hold: v => { const b = ST.boss; if (b && b.intro > 0) b.intro = 0.001; ST.hold = !!v; if (v) { ST.act = null; ST.final = 1; ST.forceQ = []; ST.gapT = 0; ST.gcd = 0; ST.gapPend = false; ST.chainN = 0; ST.mDue = null; ST.mSlot = -1; ST.mSkipT = 0; ST.mWait = 0; ST.mTurn = true; for (const k in ST.cd) ST.cd[k] = 999; for (const k in ST.cd2) ST.cd2[k] = 999; ST.ultAt = []; ST.carryAt = []; } },
    free: () => { ST.hold = false; for (const k in ST.cd) ST.cd[k] = 999; for (const k in ST.cd2) ST.cd2[k] = 999; ST.ultAt = []; ST.carryAt = []; },
    live: () => { ST.hold = false; ST.final = 0; ST.forceQ = []; Object.assign(ST.cd, CD0); Object.assign(ST.cd2, CD20); ST.ultAt = [0.65, 0.36]; ST.carryAt = CARRY_AT.slice(); },
    cd: o => { Object.assign(ST.cd, o); if (Object.values(o).some(v => v <= 0)) { ST.gapT = 0; ST.gcd = 0; ST.gapPend = false; ST.forceQ = []; ST.waitT = 0; } },   /* plan-40: test ép chiêu → bỏ khoảng hở */ cd2: o => Object.assign(ST.cd2, o), skip: () => skipIntro(ctx), tgt: w => { ST.tgt = w; ST.tgtT = 0; },
    head: (x, y, a = 0, z = 2) => headInit(ctx, x, y, a, z), setHeadA: a => { if (ST.H) ST.H.a = a; },
    bite: () => { ST.act = null; startBite(ctx, ST.boss, ctx.S.player); }, tail: () => { ST.act = null; startTail(ctx, ST.boss); }, moon: () => { ST.act = null; startMoon(ctx, ST.boss, ctx.S.player); },
    bolts: () => { ST.act = null; ST.cd.crack = 0; startBolts(ctx, ST.boss); }, mach: () => { ST.act = null; startMach(ctx, ST.boss, ctx.S.player); }, sub: amb => { ST.act = { k: 'sub', ph: 'down', t: 0, amb: !!amb }; ST.stats.subs = (ST.stats.subs || 0) + 1; },   /* 2026-10-16 test gờ: lặn duỗi / phục kích */ eclipse: () => { ST.act = null; startEclipse(ctx, ST.boss); }, ult: () => { ST.act = null; startCons(ctx, ST.boss); }, slam: () => { ST.act = null; startSlam(ctx, ctx.S.player); }, consSt: () => ST.cons ? { ph: ST.cons.ph, t: +ST.cons.t.toFixed(2), mash: ST.cons.mash } : null, consMash: () => consStruggle(ctx),
    drum: i => hitDrum(ctx, i), waitBeat: () => new Promise(r => { const f = () => { if (onBeatNow() && toAcc() < 0.05) r(true); else setTimeout(f, 8); }; f(); }), offBeat: () => new Promise(r => { const f = () => { if (toAcc() > 0.35) r(true); else setTimeout(f, 8); }; f(); }),
    glowHit: (who, n) => { const G = ST.ult && ST.ult.glow.find(g => g.who === who && !g.dead); if (G) glowHit(ctx, G, n || 1, who); }, ultT: v => { if (ST.ult) ST.ult.t = v; },
    setHp: f => { const b = boss(); if (b) b.hp = Math.max(1, Math.round(b.max * f)); }, kill: () => { const b = boss(); if (b) ctx.monsters.kill(b); }, boss: () => ST.boss, p2: () => ST.mo2, p2Do: k => { ST.hold = false; for (const q in ST.cd2) ST.cd2[q] = 99; ST.cd2[k] = 0; ST.act = null; },
    link: () => { const H = ST.H, b0 = ST.body[0], U = ST.ult; return { ult: U ? (U.neck ? { n: U.neck.n, gap: +U.neck.gap.toFixed(1) } : null) : null, headSeg: H && b0 ? +Math.hypot(H.x - b0.x, H.y - b0.y).toFixed(1) : null, headZ: H ? Math.round(H.z) : null, segZ: b0 ? Math.round(b0.z) : null, sp: SP }; },
    ridge: () => { const Ly = RIDGE.by[zidOf(ctx)]; return { pts: Ly ? Ly.pts.length : 0, fresh: Ly ? Ly.pts.filter(p => p.rel == null).length : 0, hump: Ly && Ly.hump ? { x: Math.round(Ly.hump.x), y: Math.round(Ly.hump.y), m: Ly.hump.m, grass: Ly.hump.grass, still: Ly.hump.still } : null, total: ST.stats.ridge || 0, surf: ST.H ? surfOf(ctx, ST.H.x, ST.H.y - gyOf(ctx)) : null }; },
    ground: () => ({ chunks: STRIP.by[zidOf(ctx)] ? STRIP.by[zidOf(ctx)].ch.size : 0, decals: (GC.by[zidOf(ctx)] || []).length, craters: (GC.by[zidOf(ctx)] || []).filter(d => d.crater).length, flat: GC.flat.length, stats: { furrows: ST.stats.furrows || 0, craters: ST.stats.craters || 0, flat: ST.stats.flat || 0 } }), groundRestore: () => groundRestore(ctx),
    dash: () => { ST.act = null; const p = ctx.S.player; startDash(ctx, p, Math.hypot(p.x - ST.H.x, p.y - ST.H.y)); },
    bend: () => { const H = ST.H, B = ST.body; if (!H || !B.length) return null; const L = [H, ...B], da = []; let mx = 0, mi = -1; for (let i = 1; i < L.length - 1; i++) { let x = L[i].a - L[i + 1].a; while (x > Math.PI) x -= TAU; while (x < -Math.PI) x += TAU; x = Math.abs(x) * 180 / Math.PI; da.push(+x.toFixed(1)); if (x > mx && L[i + 1].z > -6) { mx = x; mi = i; } } return { mx: +mx.toFixed(1), mi, rear: +(ST.rear || 0).toFixed(2), act: ST.act ? ST.act.k + ':' + (ST.act.ph || '') : null, hz: Math.round(H.z), segs: B.map(q => [Math.round(q.x), Math.round(q.y), Math.round(q.z), +q.a.toFixed(3), Math.round(rearZ(q.i))]), da }; }, chain: () => { const H = ST.H, b = ST.body[0]; if (!H || !b) return null; return { d: +Math.hypot(H.x - b.x, H.y - b.y, (H.z - b.z) * 0.8).toFixed(1), hz: Math.round(H.z), bz: Math.round(b.z), sp: SP, log: { ...(ST.chainLog || {}) }, state: ST.grab ? 'grab:' + ST.grab.ph : ST.cons ? 'cons:' + ST.cons.ph : ST.act ? 'act:' + ST.act.k + (ST.act.ph ? ':' + ST.act.ph : '') : ST.arrive ? 'arrive' : ST.tcine ? 'tcine' : ST.death ? 'death' : (ST.boss && ST.boss.stunT > 0) ? 'stun' : 'roam', fixes: ST.stats.chainFix || 0 }; },
    coilC: () => { const C = ST.cons, p = ctx.S.player; if (!C) return null; const B = ST.body.slice(0, 12); let sx = 0, sy = 0; for (const q of B) { sx += q.x - Math.cos(q.a) * SKIN.plateOff; sy += q.y - Math.sin(q.a) * SKIN.plateOff - LIFT - Math.max(0, q.z) - 8; } return { dx: +(sx / B.length - p.x).toFixed(1), dy: +(sy / B.length - (p.y - 12)).toFixed(1), ph: C.ph }; },   /* tâm vòng quấn (như vẽ) so với thân người */
    freeze: (x, y, a) => { ST.freeze = x == null ? null : { x, y, a }; },
    noCarry: () => { ST.carryAt = []; ST.cd.grab = 999; },
    grab: (forced = true, dest) => { if (dest) ST.forceDest = dest; ST.act = null; return startGrab(ctx, forced); }, struggle: () => struggle(ctx), dest: z => { ST.forceDest = z; },
    grabSt: () => ({ grab: ST.grab ? { ph: ST.grab.ph, t: +ST.grab.t.toFixed(2), mash: +ST.grab.mash.toFixed(1), dest: ST.grab.dest.z, rk: ST.grab.rk ? { t: +ST.grab.rk.t.toFixed(1), bit: ST.grab.rk.bit } : null } : null, carryAt: ST.carryAt.slice(), visited: ST.visited.slice(), carryLog: (ST.carryLog || []).slice(), landing: ST.landing ? { how: ST.landing.how, t: +ST.landing.t.toFixed(1), spot: ST.landing.spot } : null, travel: !!ST.travel, banner: ST.banner ? ST.banner.txt : null, mode: ctx.S.mode, bossFight: !!ctx.S.bossFight }),
    dirs: () => DIR8.map(d => !!B('head_' + d)), segAxis: () => (segSet('seg') || []).map(s => ({ d: s.d, rot: s.rot, a: +s.a.toFixed(2) })),
  };
}
