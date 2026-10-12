// monsters.js — plan-21: mỗi vùng 1 loài quái. Ngày: tranh cướp tài nguyên của người chơi (cây trồng / đồ đang bế / chiếm chỗ tài nguyên).
// Đêm (19:00–6:00): đông gấp đôi, đi săn dân làng (villagers.js). Người chơi đánh quái → kinh nghiệm, đồ rơi (hero.js).
// Giáp: vũ khí cấp thấp hơn giáp chỉ gây 1 sát thương ("Cần ⚔ kiếm cấp N"). Click quái → tự đuổi theo + tự cầm vũ khí + chém.
// Hình: sheet PixelLab qua manifest `monsters.<key>` (4 hàng S W E N); chưa có thì vẽ code (dự phòng).
// plan-26 B0: vùng dưới nước (ZONES.under, vd. u1) có NHIỀU loài (SP[zone].mix) + 1 trùm canh cổng (SP[zone].boss), mỗi con giữ cấu hình riêng ở mo.c;
//   người chơi đang bơi (p.custom = dáng bơi) vẫn bị đuổi / đánh / đánh trả được (cờ uw); sức đánh ×ctx.atkMul() (−50% dưới nước, cả phần cộng của kiếm).
import { getCarry, removeCarry, addCarry, headSprite } from './animals.js';
import { ART } from '../art.js';
import { ROADS } from '../world.js';   /* plan-28: quái đường đèo = loài của vùng dưới, mạnh hơn */
import { FPS, waterDraw, WATER } from '../anim.js';
import { STONE_FILTER } from './petgun.js';   /* petgun.js: bộ lọc tô đá */
import { initKraken, aiKraken as aiKrakenNew, slamAt as krSlamAt, slamTick as krSlamTick, tentDrawable as krTent, drawSlamGround, drawKraken as drawKrakenNew, drawCrack, drawDead, krDrawables, krNearTent, krMash, krHeld, krOnDeath, krStrikeLabel } from './kraken.js';   /* 2026-10-11: Kraken làm lại (hình + kỹ năng 3 pha) */

/* plan-23 B0 (anh duyệt 2026-10-10): đúng cấp vùng → 3–4 nhát hạ 1 con, chịu ~11 đòn mới ngất, ~8 con lên 1 cấp */
const SP = {
  village: { key: 'slime', vi: 'Nhầy Mầm', en: 'Sprout Slime', hp: 35, dmg: 9, armor: 0, sp: 20, xp: 6, drop: 'gel', steal: 'crop', w: 12, h: 12, c: ['#6fbf4a', '#3f7a2a', '#bff28a'], shape: 'blob', day: 6, night: 12 },
  m1: { key: 'crab', vi: 'Cua Trộm', en: 'Thief Crab', hp: 60, dmg: 10, armor: 0, sp: 26, xp: 12, drop: 'claw', steal: 'carry', w: 14, h: 11, c: ['#e0603a', '#8a2e1a', '#ffb08a'], shape: 'crab', aqua: true, day: 6, night: 12 },   /* aqua (2026-10-11 anh): quái nước lội vào nước nông / ao */
  m2: { key: 'crow', vi: 'Quạ Xám', en: 'Grey Crow', hp: 85, dmg: 13, armor: 1, sp: 36, xp: 25, drop: 'feather', steal: 'crop', w: 16, h: 11, c: ['#5a5868', '#2c2a36', '#9a98aa'], shape: 'bird', fly: true, day: 7, night: 14 },
  m3: { key: 'wolf', vi: 'Sói Bóng', en: 'Shadow Wolf', hp: 130, dmg: 16, armor: 1, sp: 40, xp: 37, drop: 'fang', steal: 'carry', w: 12, h: 23, c: ['#4a4560', '#22202e', '#9f8fd0'], shape: 'beast', day: 7, night: 14 },
  m4: { key: 'rockimp', vi: 'Yêu Đá', en: 'Rock Imp', hp: 150, dmg: 19, armor: 2, sp: 24, xp: 50, drop: 'core', steal: 'node', nodes: /ore|rock|boulder|seis/, w: 12, h: 13, c: ['#8a8078', '#4a443e', '#ffb03a'], shape: 'golem', day: 8, night: 16 },
  m5: { key: 'scorpion', vi: 'Bọ Cạp Cát', en: 'Sand Scorpion', hp: 205, dmg: 21, armor: 2, sp: 30, xp: 62, drop: 'stinger', steal: 'carry', w: 12, h: 15, c: ['#d0a050', '#7a5420', '#ffe0a0'], shape: 'crab', day: 8, night: 16 },
  m6: { key: 'inkshade', vi: 'Bóng Mực', en: 'Ink Shade', hp: 230, dmg: 24, armor: 3, sp: 28, xp: 75, drop: 'ink', steal: 'node', nodes: /lantern|board|book|shelf|lamp/, w: 9, h: 16, c: ['#2a2440', '#120f1c', '#8a7aff'], shape: 'ghost', fly: true, day: 8, night: 16 },
  m7: { key: 'imp', vi: 'Imp Lửa', en: 'Fire Imp', hp: 295, dmg: 27, armor: 4, sp: 34, xp: 87, drop: 'ember', steal: 'node', nodes: /obs|lava|ore|crystal/, w: 11, h: 15, c: ['#e8541e', '#7a1e0e', '#ffd45e'], shape: 'golem', day: 9, night: 16 },
  m8: { key: 'snowwolf', vi: 'Sói Tuyết', en: 'Snow Wolf', hp: 315, dmg: 30, armor: 4, sp: 42, xp: 100, drop: 'fur', steal: 'carry', w: 13, h: 20, c: ['#e8eef8', '#8a9ab8', '#bfe3ff'], shape: 'beast', day: 9, night: 16 },
  m9: { key: 'glitch', vi: 'Đốm Mã Hoá', en: 'Glitch Wisp', hp: 390, dmg: 32, armor: 5, sp: 36, xp: 112, drop: 'shard', steal: 'node', nodes: /crystal|seis|ore/, w: 11, h: 12, c: ['#ff1f4b', '#5a0a1e', '#7fe0ff'], shape: 'ghost', fly: true, day: 10, night: 16 },
  sea: { key: 'gull', vi: 'Mòng Biển Cướp', en: 'Raider Gull', hp: 60, dmg: 10, armor: 1, sp: 44, xp: 12, drop: 'feather', steal: 'carry', w: 17, h: 10, c: ['#f2f2f2', '#8a8a96', '#ffd45e'], shape: 'bird', fly: true, day: 6, night: 10 },
};
/* plan-26 B0 — quái dưới nước (giữa quái M1 và M2), mỗi loài một cách đánh riêng (ai): phồng gai đâm vùng / trôi + điện giật tê / trùm vỏ cứng giơ càng đập */
const UW = {
  puffer: { key: 'puffer', vi: 'Cá Nóc Gai', en: 'Spiny Puffer', hp: 70, dmg: 12, armor: 0, sp: 22, xp: 18, drop: 'shell', w: 14, h: 13, c: ['#f0a030', '#a8601a', '#ffe08a'], shape: 'blob', ai: 'puffer' },
  jelly: { key: 'jelly', vi: 'Sứa Điện', en: 'Shock Jelly', hp: 55, dmg: 10, armor: 0, sp: 12, xp: 16, drop: 'gel', w: 12, h: 15, c: ['#b8a8f0', '#6a58b0', '#ffe066'], shape: 'ghost', ai: 'jelly', float: true },
  crabking: { key: 'crabking', vi: 'Cua Hoàng Đế', en: 'Emperor Crab', hp: 240, dmg: 16, armor: 0, sp: 18, xp: 80, drop: 'seagem', w: 26, h: 18, c: ['#b8302a', '#6a1a14', '#ffd45e'], shape: 'crab', ai: 'crabking', boss: true, shell: true, aqua: true,
    openLbl: { vi: 'GIƠ CÀNG!', en: 'CLAWS UP!' } },
  /* plan-26 B1 — tầng 2 (≈ quái M4–M5): núp tảo + lao thẳng hàng / lượn vòng + húc; trùm phóng điện vòng (có khe hở để né) */
  eel: { key: 'eel', vi: 'Lươn Điện', en: 'Shock Eel', hp: 100, dmg: 19, armor: 2, sp: 26, xp: 52, drop: 'gel', w: 16, h: 9, c: ['#2a8a80', '#14403c', '#ffe066'], shape: 'ghost', ai: 'eel', lurk: true },
  swordfish: { key: 'swordfish', vi: 'Cá Kiếm', en: 'Swordfish', hp: 120, dmg: 21, armor: 2, sp: 34, xp: 58, drop: 'fang', w: 16, h: 10, c: ['#5a8ac8', '#2a4a78', '#e8f0ff'], shape: 'bird', ai: 'swordfish', weak: 1.5 },
  momeel: { key: 'momeel', vi: 'Lươn Mẹ', en: 'Mother Eel', hp: 460, dmg: 22, armor: 2, sp: 20, xp: 180, drop: 'seagem', w: 26, h: 20, c: ['#1f6a64', '#0e3430', '#ffe066'], shape: 'blob', ai: 'momeel', boss: true, weak: 1.5,
    openLbl: { vi: 'HẾT ĐIỆN!', en: 'DRAINED!' }, leash: 150, engage: 150 },
  /* tầng 3 (≈ M6–M7): phun mực rồi phụt lùi / lao cắn chảy máu; trùm bọc giáp — húc trúng xác tàu thì hở giáp */
  squid: { key: 'squid', vi: 'Mực Ma', en: 'Ghost Squid', hp: 160, dmg: 24, armor: 3, sp: 28, xp: 80, drop: 'shell', w: 13, h: 14, c: ['#c8b8f0', '#7a68b0', '#7fe8ff'], shape: 'ghost', ai: 'squid', float: true },
  sawshark: { key: 'sawshark', vi: 'Cá Mập Răng Cưa', en: 'Sawtooth Shark', hp: 200, dmg: 27, armor: 3, sp: 40, xp: 92, drop: 'fang', w: 16, h: 9, c: ['#7a8698', '#3a4250', '#e8e0d0'], shape: 'bird', ai: 'sawshark' },
  armorshark: { key: 'armorshark', vi: 'Cá Mập Bọc Giáp', en: 'Armored Shark', hp: 760, dmg: 28, armor: 3, sp: 26, xp: 260, drop: 'seagem', w: 30, h: 18, c: ['#2a3a6a', '#141c34', '#c8642a'], shape: 'beast', ai: 'armorshark', boss: true, shell: true,
    openLbl: { vi: 'HỞ GIÁP!', en: 'ARMOR OPEN!' }, leash: 330, engage: 330, tip: { vi: 'Giáp sắt! Dụ nó húc vào xác tàu, đánh lúc HỞ GIÁP mới đau', en: 'Iron armor! Lure it into a wreck and strike while its ARMOR IS OPEN' } },
  /* tầng 4 (≈ M8–M9): mồi sáng dụ rồi đớp / uốn lượn cắn độc; trùm nhiều đốt — chỉ đầu là điểm yếu */
  angler: { key: 'angler', vi: 'Cá Đèn Lồng', en: 'Lantern Angler', hp: 220, dmg: 30, armor: 4, sp: 22, xp: 105, drop: 'pearl', w: 15, h: 13, c: ['#4a2a6a', '#24123a', '#ffe066'], shape: 'blob', ai: 'angler' },
  seasnake: { key: 'seasnake', vi: 'Rắn Biển', en: 'Sea Krait', hp: 250, dmg: 31, armor: 4, sp: 46, xp: 118, drop: 'fang', w: 16, h: 9, c: ['#bfe8ec', '#24282e', '#7fe8ff'], shape: 'ghost', ai: 'seasnake' },
  serpent: { key: 'serpent', vi: 'Rắn Biển Khổng Lồ', en: 'Giant Sea Serpent', hp: 1000, dmg: 34, armor: 4, sp: 34, xp: 360, drop: 'seagem', w: 22, h: 20, c: ['#1f6a64', '#0e3430', '#7fe8ff'], shape: 'beast', ai: 'serpent', boss: true, weak: 1.5, glowR: 34,
    openLbl: { vi: 'ĐẦU HẠ THẤP!', en: 'HEAD DOWN!' }, leash: 300, engage: 300 },
};
SP.u1 = { ...UW.puffer, mix: [UW.puffer, UW.puffer, UW.jelly], boss: UW.crabking, day: 7, night: 9 };
SP.u2 = { ...UW.eel, mix: [UW.eel, UW.eel, UW.swordfish], boss: UW.momeel, day: 8, night: 10 };
SP.u3 = { ...UW.squid, mix: [UW.squid, UW.sawshark, UW.sawshark], boss: UW.armorshark, day: 8, night: 10 };
SP.u4 = { ...UW.angler, mix: [UW.angler, UW.seasnake, UW.seasnake], boss: UW.serpent, day: 8, night: 10 };
/* plan-26 B2 — Kraken (trùm giữa, máu thật; đầu ở mép trên, xúc tu đập xuống vùng báo trước, phun mực, <50 % gọi 2 cá mập) + Xealist (trùm cuối 3 pha) + Bóng Tối (lính triệu hồi, ảnh inkshade) */
UW.kraken = { key: 'kraken', vi: 'Kraken', en: 'Kraken', hp: 1400, dmg: 36, armor: 4, sp: 22, xp: 520, drop: 'seagem', w: 64, h: 48, c: ['#4a2a6a', '#24123a', '#ffd45e'], shape: 'blob', ai: 'kraken', boss: true, leash: 200, engage: 400, shell: true, weak: 1.5,
  openLbl: { vi: 'NGOI LÊN!', en: 'SURFACED!' }, tip: { vi: 'Đầu Kraken còn chìm sau khe vực — chém xúc tu đang KẸT, hoặc đợi nó ngoi lên!', en: 'The Kraken\'s head is sunk in the abyss — slash a STUCK tentacle, or wait for it to surface!' } };   /* 2026-10-11: đầu chìm = chỉ ăn 25 %, ngoi lên = ×1,5; chém xúc tu đang kẹt = sát thương đủ (kraken.js) */
UW.shade = { key: 'inkshade', vi: 'Bóng Tối', en: 'Shadow', hp: 220, dmg: 26, armor: 3, sp: 36, xp: 60, drop: 'ink', w: 9, h: 16, c: ['#2a2440', '#120f1c', '#ff7ad9'], shape: 'ghost', fly: true, ai: 'shade' };
UW.xealistb = { key: 'xealistboss', vi: 'Xealist', en: 'Xealist', hp: 1800, dmg: 38, armor: 4, sp: 30, xp: 800, drop: 'seagem', w: 20, h: 34, c: ['#f2f2f2', '#24202e', '#ff7ad9'], shape: 'beast', ai: 'xealist', boss: true, leash: 420, engage: 430 };
SP.kraken = { ...UW.sawshark, mix: [UW.sawshark, UW.seasnake], boss: UW.kraken, day: 4, night: 5 };
SP.xfort = { ...UW.shade, mix: [UW.shade], boss: UW.xealistb, day: 0, night: 0, noDark: true };   /* phe Xealist: pháo đài là căn cứ an toàn (không quái) */
/* plan-28: đường đèo — loài quái của VÙNG DƯỚI, máu / sức đánh / kinh nghiệm ×1,2 (đoạn 1) → ×1,5 (đoạn 9); không sinh ngẫu nhiên (day/night 0):
   đứng ở chỗ cố định (map.monSpots), chết thì hồi sinh tại chỗ sau 10 s (người chơi đứng gần thì chờ thêm). */
ROADS.forEach((R, i) => { const b = SP[R.lower], k = 1.2 + 0.3 * i / 8; SP[R.id] = { ...b, hp: Math.round(b.hp * k), dmg: Math.round(b.dmg * k), xp: Math.round(b.xp * k), day: 0, night: 0, road: true, steal: null }; });
export const ROAD_RESPAWN = 10, ROAD_NEAR = 80;
const NEED_LV = { village: 1, m1: 2, sea: 2, u1: 3, m2: 3, m3: 5, m4: 7, u2: 8, m5: 9, m6: 11, u3: 12, m7: 13, m8: 15, u4: 16, m9: 17, kraken: 18, xfort: 19, road1: 2, road2: 3, road3: 4, road4: 6, road5: 8, road6: 10, road7: 12, road8: 14, road9: 16 };   /* cấp nhân vật dự kiến của vùng */
/* đi vùng khó khi cấp còn thấp → quái đánh đau hơn, tối đa gấp đôi (nhắc quay lại luyện cấp) */
const hurtMul = ctx => { const need = NEED_LV[ctx.S.zone && ctx.S.zone.id] || 1, lv = ctx.hero ? ctx.hero.lv : need; return lv >= need ? 1 : Math.min(2, 1 + (need - lv) * 0.25); };
const uwOn = ctx => !!(ctx.isUnderwater && ctx.isUnderwater());   /* dưới nước: người chơi vẽ dáng bơi (p.custom) nhưng vẫn đánh nhau bình thường */
/* plan-24 (anh yêu cầu): quái cướp đồ phải NHẶT + GIƠ LÊN — món đồ bay từ chỗ cướp lên đầu quái, giơ cao + dấu ! nhấp nháy;
   đánh trúng quái đang cầm đồ (hoặc hạ nó) → món đồ rơi xuống đất cho người chơi nhặt lại. */
function grab(mo, loot, fx, fy) { mo.loot = loot; mo.lootT = 0; mo.lootFrom = { x: fx, y: fy }; }
function dropLoot(ctx, mo) {
  const l = mo.loot; if (!l) return; mo.loot = null;
  if (l.carry) ctx.give('a_' + l.carry.kind, 1, mo.x, mo.y); else if (l.item) ctx.give(l.item, 1, mo.x, mo.y);
  ctx.toast(T(ctx).back); if (ctx.sfx) ctx.sfx('pickup');
  if (mo.state === 'flee') { mo.state = 'wander'; mo.angry = true; }
}
const LIMG = {};
function lootImg(ctx, l) {
  if (l.carry) { const set = headSprite(l.carry); return set ? set[0][0] : null; }
  const id = l.item, it = ART.man && ART.man.ui && ART.man.ui.items; if (!id || !it || !it[id]) return null;
  if (!LIMG[id]) { LIMG[id] = new Image(); LIMG[id].src = 'assets/px/' + it[id]; } return LIMG[id].complete && LIMG[id].naturalWidth ? LIMG[id] : null;
}
function drawLoot(g, mo, x, top) {   /* top = đỉnh THÂN quái (theo c.h), không phải đỉnh ô ảnh → đồ nằm sát lưng (anh chê xa quá) */
  const im = lootImg(ST.ctx, mo.loot), k = Math.min(1, (mo.lootT || 0) / 0.35), from = mo.lootFrom, cx = ST.cam;
  let lx = x, ly = top + 2 + Math.round(Math.sin(mo.ft * 6) * 1);
  if (k < 1 && from && cx) { const fx = from.x - cx.cx, fy = from.y - cx.cy; lx = fx + (x - fx) * k; ly = fy + (ly - fy) * k - Math.sin(k * Math.PI) * 14; }   /* bay từ chỗ cướp lên đầu */
  if (im && im.naturalWidth) g.drawImage(im, 0, 0, im.naturalWidth, im.naturalHeight, Math.round(lx - 6), Math.round(ly - 12), 12, 12);   /* icon PixelLab */
  else if (im) { const sc = Math.min(1, 12 / Math.max(im.width, im.height)), w = Math.round(im.width * sc), h = Math.round(im.height * sc); g.drawImage(im, Math.round(lx - w / 2), Math.round(ly - h), w, h); }   /* canvas __hi: drawImage 4 tham số (bài học shim); thu ≤12 px */
  else { g.fillStyle = '#ffd45e'; g.fillRect(Math.round(lx) - 2, Math.round(ly) - 4, 4, 3); }
  const al = ART.uiImg && ART.uiImg('alert');
  if (k >= 1 && Math.floor(mo.ft * 4) % 2 === 0) { if (al) g.drawImage(al, Math.round(lx) - 4, Math.round(ly) - 21, 8, 8); else { g.fillStyle = '#e84a3a'; g.fillRect(Math.round(lx) - 1, Math.round(ly) - 20, 2, 5); g.fillRect(Math.round(lx) - 1, Math.round(ly) - 14, 2, 2); } }
}
const MAX_ON = 16, REACH = 28, AGGRO = 44, WEAPONS = ['sword', 'axe'];
const ST = { ctx: null, list: [], cfg: null, spawnT: 0, warnT: 0, needT: 0, shellT: 0, chase: null, hitQ: [], cd: 0, uid: 0, killed: 0, lastHit: null };
const vi = ctx => ctx.lang() === 'vi';
const nm = (ctx, c = ST.cfg) => (vi(ctx) ? c.vi : c.en);
const T = ctx => (vi(ctx) ? {
  hit: (n, h, m) => `⚔ Đánh ${n} (${h}/${m})`, armor: k => `Giáp cứng! Cần ⚔ kiếm cấp ${k} trở lên`, crop: n => `${n} đang tới gặm cây trồng của bạn!`, carry: n => `${n} đang đuổi theo đồ bạn đang bế!`,
  node: n => `${n} chiếm chỗ tài nguyên — đánh đuổi nó!`, stole: n => `${n} cướp mất đồ rồi! Đuổi theo đánh để lấy lại`, kill: (n, x) => `💥 Hạ ${n}! +${x} kinh nghiệm`, back: 'Lấy lại được đồ!', night: n => `🌙 Đêm xuống — ${n} kéo đến săn dân làng!`,
  shell: 'Vỏ cứng! Đánh lúc nó GIƠ CÀNG mới đau', raise: n => `${n} giơ càng — đánh ngay hoặc lùi ra!`, boss: n => `👑 ${n} canh cổng xoáy!`,
  stuck: n => `${n} cắm mỏ vào đá — đánh ngay!`, ring: n => `${n} tích điện — bơi ra xa hoặc chui vào KHE HỞ của vòng điện!`, drained: n => `${n} hết điện — đánh mạnh lúc này!`, summon: n => `${n} gọi Lươn Điện con tới!`,
  aim: n => `${n} nhắm húc — né sang bên, dụ nó đâm vào xác tàu!`, armorOpen: n => `${n} đâm vào xác tàu — HỞ GIÁP, đánh ngay!`, missOpen: n => `${n} húc hụt, khựng lại — giáp hở một chút!`,
  scales: 'Vảy cứng như đá! Đánh vào ĐẦU rắn mới đau', rear: n => `${n} ngóc đầu — sắp lao tới!`, headDown: n => `${n} đập đầu xuống — đánh vào đầu ngay!`,
  lured: 'Ánh sáng lạ đang dụ bạn lại gần… bơi ra xa!', hitBody: (n, h, m) => `⚔ Đánh thân ${n} (vảy cứng) (${h}/${m})`,
} : {
  hit: (n, h, m) => `⚔ Attack ${n} (${h}/${m})`, armor: k => `Tough hide! Needs a ⚔ tier ${k}+ sword`, crop: n => `${n} is heading for your crops!`, carry: n => `${n} is chasing what you carry!`,
  node: n => `${n} took over a resource spot — drive it off!`, stole: n => `${n} stole it! Chase it down to get it back`, kill: (n, x) => `💥 Defeated ${n}! +${x} XP`, back: 'Got it back!', night: n => `🌙 Night falls — ${n} come hunting the villagers!`,
  shell: 'Hard shell! Hit it while its CLAWS ARE RAISED', raise: n => `${n} raises its claws — strike now or back off!`, boss: n => `👑 The ${n} guards the whirl gate!`,
  stuck: n => `The ${n} is stuck in the rock — hit it now!`, ring: n => `The ${n} is charging — swim away or into the GAP in the ring!`, drained: n => `The ${n} is drained — hit it hard now!`, summon: n => `The ${n} calls its young eels!`,
  aim: n => `The ${n} takes aim — dodge aside and make it ram a wreck!`, armorOpen: n => `The ${n} rammed a wreck — ARMOR OPEN, strike now!`, missOpen: n => `The ${n} missed and stalls — its armor gapes a little!`,
  scales: 'Scales hard as stone! Only the HEAD takes real damage', rear: n => `The ${n} rears its head — it is about to lunge!`, headDown: n => `The ${n} slams its head down — hit the head now!`,
  lured: 'A strange light is luring you closer… swim away!', hitBody: (n, h, m) => `⚔ Hit the ${n}'s body (hard scales) (${h}/${m})`,
});
const night = ctx => !!(ctx.clock && ctx.clock.isNight && ctx.clock.isNight());
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const walkable = (ctx, x, y, fly, aq) => { const m = ctx.S.map, tx = Math.floor(x / 16), ty = Math.floor(y / 16); if (tx < 1 || ty < 1 || tx >= m.w - 1 || ty >= m.h - 1) return false; return fly || !ctx.isSolid(m, tx, ty) || (!!aq && wetOk(ctx, m, tx, ty)); };
/* 2026-10-11 anh: quái nước (c.aqua: cua) được lội vào ô nước NÔNG (biển sát bờ, ao người chơi đào) — không có vật thể; nước khơi (bơi) vẫn chặn.
   Quái thường giữ nguyên: nước = vật chắn. */
function wetG(ctx, x, y) { const g0 = ctx.getG(ctx.S.map, Math.floor(x / 16), Math.floor(y / 16)); return g0 === ctx.T.WATER || g0 === ctx.T.DEEP; }
function wetOk(ctx, m, tx, ty) { const g0 = ctx.getG(m, tx, ty); if (g0 !== ctx.T.WATER && g0 !== ctx.T.REEF) return false; if (!(WATER.depth && WATER.depth(tx * 16 + 8, ty * 16 + 12) === 6)) return false; return !(ctx.hasObjectAt && ctx.hasObjectAt(m, tx, ty)); }
const inRect = (r, tx, ty) => !!r && tx >= r.x && ty >= r.y && tx < r.x + r.w && ty < r.y + r.h;

function newMo(c, x, y) { return { id: ++ST.uid, c, x, y, hp: c.hp, max: c.hp, state: 'wander', goal: null, t: Math.random() * 3, cd: 0, kb: null, flash: 0, ft: Math.random() * 4, dir: 1, loot: null, claim: null, warned: false }; }
function spawnOne(ctx, kind) {
  const m = ctx.S.map, p = ctx.S.player, z = ST.cfg, c = kind || (z.mix ? z.mix[(Math.random() * z.mix.length) | 0] : z);
  for (let k = 0; k < 40; k++) {
    const tx = 2 + Math.floor(Math.random() * (m.w - 4)), ty = 2 + Math.floor(Math.random() * (m.h - 4)), x = tx * 16 + 8, y = ty * 16 + 12;
    if (Math.hypot(x - p.x, y - p.y) < 170 || !walkable(ctx, x, y, c.fly)) continue;
    if (c.lurk && m.kelp && k < 30 && !m.kelp[ty * m.w + tx]) continue;   /* plan-26 B1: Lươn Điện sinh trong rừng tảo */
    if (!c.fly && (ctx.getG(m, tx, ty) === ctx.T.WATER || ctx.getG(m, tx, ty) === ctx.T.DEEP)) continue;   /* dưới nước nền là SEABED (đi được) nên quái bơi vẫn sinh bình thường */
    if (z.boss && inRect(m.arena, tx, ty)) continue;   /* đấu trường của trùm để trống */
    ST.list.push(newMo(c, x, y));
    return true;
  }
  return false;
}
function spawnAt(ctx, i) {   /* plan-28: quái đường đèo ở chỗ cố định i */
  const sp = ctx.S.map.monSpots && ctx.S.map.monSpots[i]; if (!sp || !ST.cfg) return null;
  const mo = newMo(ST.cfg, sp.x * 16 + 8, sp.y * 16 + 12); mo.spot = i; mo.home = { x: mo.x, y: mo.y }; ST.list.push(mo); return mo;
}
function spawnBoss(ctx) {   /* trùm canh cổng: 1 con, đứng ở m.boss, không hồi sinh khi cổng đã mở */
  const z = ST.cfg, m = ctx.S.map; if (!z || !z.boss || !m.boss || ST.list.some(o => o.c.boss)) return null;
  if (ctx.uwGateOpen && ctx.uwGateOpen(ctx.S.zone.id)) return null;
  const mo = newMo(z.boss, m.boss.x * 16 + 8, m.boss.y * 16 + 12); mo.home = { x: mo.x, y: mo.y }; mo.dir = -1; mo.face = 0; ST.list.push(mo); return mo;
}
function want(ctx) { return night(ctx) ? ST.cfg.night : ST.cfg.day; }
function bestWeapon(ctx) { return ctx.tool.tier('sword') > 0 ? 'sword' : 'axe'; }
function heldWeapon(ctx) { if (!ctx.holding) return bestWeapon(ctx); return WEAPONS.find(w => ctx.holding(w)) || null; }
function warn(ctx, txt) { if (ctx.S.time - ST.warnT < 8) return; ST.warnT = ctx.S.time; ctx.toast(txt); }

function steer(ctx, mo, tx, ty, speed, dt) {
  const dx = tx - mo.x, dy = ty - mo.y, d = Math.hypot(dx, dy); if (d < 1) return true;
  const fly = mo.c.fly, vx = dx / d * speed * dt, vy = dy / d * speed * dt; mo.dir = vx >= 0 ? 1 : -1; mo.face = Math.abs(dx) >= Math.abs(dy) ? (dx >= 0 ? 2 : 1) : (dy >= 0 ? 0 : 3);
  const dryLead = fly || mo.c.aqua || !wetG(ctx, mo.x + vx + Math.sign(vx) * 5, mo.y);   /* quái cạn: mép thân (±5 px) không lấn ra mặt nước khi đi ngang */
  if (dryLead && walkable(ctx, mo.x + vx, mo.y, fly, mo.c.aqua)) mo.x += vx; else if (!fly) mo.side = (mo.side || 1);
  if (walkable(ctx, mo.x, mo.y + vy, fly, mo.c.aqua)) mo.y += vy;   /* aqua: cua lội nước */
  return d < 8;
}
function wander(ctx, mo, dt, speedK = 0.5) {
  mo.t -= dt; if (!mo.goal || mo.goal.kind !== 'wander' || mo.t <= 0) { mo.t = 2 + Math.random() * 2; mo.goal = { kind: 'wander', x: mo.x + (Math.random() - 0.5) * 120, y: mo.y + (Math.random() - 0.5) * 120 }; }
  if (steer(ctx, mo, mo.goal.x, mo.goal.y, mo.c.sp * speedK, dt)) mo.goal = null;
}
function pickTarget(ctx, mo) {
  const c = mo.c, p = ctx.S.player;
  if (night(ctx) && ctx.wreck && mo.id % 3 === 0 && ctx.wreck.can()) {   /* plan-23: đêm, 1/3 quái đi phá công trình / đồ người chơi / giẫm ruộng */
    const o = ctx.wreck.pick(mo); if (o) return { kind: 'wreck', o };
    if (ctx.farmCrops) { const cr = ctx.farmCrops(); if (cr.length) { const t = cr[(Math.random() * cr.length) | 0]; return { kind: 'trample', tx: t.tx, ty: t.ty }; } }
  }
  if (night(ctx) && ctx.villagers) {   /* đêm: săn dân gần nhất */
    let best = null, bd = 420; for (const n of ctx.villagers.alive()) { if (n.hurtSit) continue; const d = dist(mo, n); if (d < bd) { bd = d; best = n; } }
    if (best) return { kind: 'npc', n: best };
  }
  if (c.steal === 'crop' && ctx.farmCrops) {
    const cr = ctx.farmCrops().filter(t => !ST.list.some(o => o !== mo && o.goal && o.goal.kind === 'crop' && o.goal.tx === t.tx && o.goal.ty === t.ty));
    let best = null, bd = 520; for (const t of cr) { const d = Math.hypot(t.tx * 16 + 8 - mo.x, t.ty * 16 + 10 - mo.y); if (d < bd) { bd = d; best = t; } }
    if (best) return { kind: 'crop', tx: best.tx, ty: best.ty };
  }
  if (c.steal === 'carry' && getCarry(ctx).length && dist(mo, p) < 260) return { kind: 'carry' };
  if (c.steal === 'node' && c.nodes) {
    let best = null, bd = 300; for (const o of ctx.S.map.objects) { if (!c.nodes.test(o.type) || o.claimed) continue; const d = Math.hypot(o.x * 16 + 8 - mo.x, o.y * 16 + 12 - mo.y); if (d < bd) { bd = d; best = o; } }
    if (best) return { kind: 'node', o: best };
  }
  return null;
}
function release(mo) { if (mo.claim) { mo.claim.claimed = null; mo.claim = null; } }
function killMonster(ctx, mo, xpMul = 1) {
  if (mo.c.onFall && mo.c.onFall(mo)) return;   /* spar.js: bị hạ mà còn dạng kế → biến hình, chưa chết */
  const c = mo.c, t = T(ctx); mo.state = 'dead'; release(mo);
  if (c.onDown) { ST.list = ST.list.filter(o => o !== mo); c.onDown(mo); return; }   /* spar.js: bạn tập thua → không rơi đồ, hệ spar tự thưởng */
  const got = []; const add = (id, n) => { ctx.give(id, n, mo.x, mo.y); };   /* plan-24: đồ rơi ra chỗ quái ngã, nhặt rồi mới vào túi */
  if (c.boss) { add(c.drop, 2); add('stone', 10 + ((Math.random() * 6) | 0)); add('pearl', 1); add('soul', 1); }   /* plan-26: trùm canh cổng rơi nhiều */
  else { if (Math.random() < 0.7) add(c.drop, 1); if (Math.random() < 0.3) add('soul', 1); if (Math.random() < 0.35) add('stone', 1 + ((Math.random() * 2) | 0)); }
  if (mo.loot) dropLoot(ctx, mo);   /* plan-24: đồ cướp rơi xuống đất */
  if (ctx.pop && got.length) ctx.pop(mo.x, mo.y - 16, got.join(' '));
  if (ctx.vfx && !ctx.vfx('monster_poof', mo.x, mo.y + 4, 0, true)) ctx.vfx('dirt_puff', mo.x, mo.y + 2);
  if (mo.spot != null) (ST.rq ||= []).push({ spot: mo.spot, t: ROAD_RESPAWN });   /* plan-28: hồi sinh tại chỗ sau 10 s */
  const xp = Math.max(1, Math.round(c.xp * xpMul)); ST.killed++; if (!c.boss) ST.respawnT = 20; if (ctx.hero) ctx.hero.gainXp(xp); ctx.toast(t.kill(nm(ctx, c), xp)); ctx.sfx('coin');
  if (ctx.villagers) ctx.villagers.rescued(mo);
  if (ctx.onMonsterDown) { try { ctx.onMonsterDown(mo, c.xp); } catch (e) { console.error('onMonsterDown', e); } }   /* plan-27: Rocky nhận kinh nghiệm khi cùng hạ quái (pet.js) */
  if (c.ai === 'kraken') krOnDeath(mo);   /* đầu Kraken chìm hẳn xuống khe vực */
  ST.list = ST.list.filter(o => o !== mo);
  if (c.boss && ctx.onBossDown) { try { ctx.onBossDown(c.key, mo); } catch (e) { console.error('onBossDown', e); } }   /* plan-26: underwater.js mở cổng xoáy */
}
/* đòn của người chơi — gọi khi tới khung va chạm của clip chém */
function strike(ctx, mo, seg = -1, tent = null) {
  if (!ST.list.includes(mo) || (tent && tent.st !== 'stuck')) return;   /* xúc tu Kraken đã rút → hụt */
  const p = ctx.S.player, body = seg >= 0 && mo.segs && mo.segs[seg], tgt = tent || body || mo;   /* plan-26 B1: rắn khổng lồ — đánh vào đốt thân (vảy cứng) hay vào đầu */
  if (dist(tgt, p) > REACH + 10 + (mo.c.boss && !body && !tent ? 10 : 0)) return;
  const c = mo.c, w = heldWeapon(ctx), wt = w === 'sword' ? ctx.tool.tier('sword') : 0;
  const raw = ctx.hero ? ctx.hero.atk + ctx.hero.weaponBonus(wt) : 10, mul = ctx.atkMul ? ctx.atkMul() : 1;
  let dmg = mul === 1 ? raw : Math.max(1, Math.round(raw * mul));   /* plan-26: dưới nước ×0,5 — áp lên tổng (sức cơ bản + phần cộng của kiếm) */
  if (wt < c.armor) { dmg = 1; if (ctx.S.time - ST.needT > 3) { ST.needT = ctx.S.time; ctx.toast(T(ctx).armor(c.armor)); } }
  const shut = !tent && ((c.shell && !mo.open) || !!body); if (tent) tent.flash = 0.18; else if (c.shell && !mo.open) { dmg = Math.max(1, Math.round(dmg * 0.25)); if (ctx.S.time - ST.shellT > 4) { ST.shellT = ctx.S.time; ctx.toast(c.tip ? (vi(ctx) ? c.tip.vi : c.tip.en) : T(ctx).shell); } }   /* vỏ cứng: chỉ 25 % — trừ lúc đang giơ càng / hở giáp */
  else if (body) { dmg = Math.max(1, Math.round(dmg * 0.1)); if (ctx.S.time - ST.shellT > 4) { ST.shellT = ctx.S.time; ctx.toast(T(ctx).scales); } }   /* thân rắn: vảy cứng, chỉ 10 % */
  else if (mo.open && c.weak) dmg = Math.round(dmg * c.weak);   /* lúc hở (kẹt mỏ / hết điện / đầu hạ thấp) đánh đau hơn */
  ST.lastHit = { key: c.key, raw, mul, dmg, shut, body: !!body, tent: !!tent, open: !!mo.open, zone: ctx.S.zone && ctx.S.zone.id, t: ctx.S.time };
  mo.hp -= dmg; mo.flash = 0.18; mo.angry = true; mo.justHit = true; if (mo.loot && mo.hp > 0) dropLoot(ctx, mo);   /* plan-24: trúng đòn → đánh rơi đồ cướp */
  const d = dist(mo, p) || 1, kbk = c.boss ? (c.ai === 'serpent' || c.ai === 'armorshark' || c.ai === 'kraken' || c.ai === 'xealist' ? 0 : 0.25) : 1; if (kbk) mo.kb = { vx: (mo.x - p.x) / d * 110 * kbk, vy: (mo.y - p.y) / d * 110 * kbk, t: 0.14 };
  if (ctx.pop) ctx.pop(tgt.x, tgt.y - 14, `-${dmg}`, wt >= c.armor && !shut ? '#fff6c8' : '#a79a86');
  if (ctx.vfx) {   /* vệt chém theo cấp vũ khí (t0 rìu … t6 kiếm Seismic) — càng cao càng nhiều chi tiết; quái giáp dày → đá vụn */
    const sl = `slash_t${wt}`, left = tgt.x < p.x;
    if (!ctx.vfx(sl, (p.x + tgt.x) / 2 + (left ? -4 : 4), tgt.y + 4, 0, true, left)) ctx.vfx(c.armor >= 2 ? 'rock_debris' : 'wood_chips', tgt.x, tgt.y + 2);
    if (wt >= 6 && ctx.quake) ctx.quake(0.2);   /* kiếm Seismic: rung rất ngắn đúng lúc chém (không định kỳ) */
  }
  ctx.sfx('hit');
  if (mo.hp <= 0) killMonster(ctx, mo);
}
function attack(ctx, mo, seg = -1, tent = null) {
  if (mo.c.ai === 'kraken' && krHeld(mo)) { krMash(ctx, mo); return; }   /* đang bị xúc tu túm: mỗi lần bấm = 1 lần vùng */
  const p = ctx.S.player; if (ST.cd > 0) return; ST.cd = 0.45;
  if (ctx.hold && heldWeapon(ctx) && heldWeapon(ctx) !== bestWeapon(ctx)) ctx.hold(bestWeapon(ctx));   /* đang cầm rìu mà có kiếm → đổi sang kiếm */
  const tg = tent || seg >= 0 && mo.segs && mo.segs[seg] || mo; if (p.faceTo) p.faceTo(tg.x, tg.y);
  const clip = p.hasAct && p.hasAct('attack') ? 'attack' : p.hasAct && p.hasAct('chop') ? 'chop' : null;
  if (clip && (!p.custom || uwOn(ctx))) p.act(clip, 0);   /* plan-26: dưới nước dáng bơi tự vẽ clip chém (underwater.drawSwim) */
  const sh = clip && p.sheet.actions[clip], at = sh && sh.impact != null ? sh.impact / (sh.fps || 12) : 0.18;
  ST.hitQ.push({ mo, t: at, seg, tent });
}

/* ---------------- plan-26 B0: AI dưới nước ---------------- */
const PUFF_R = 34, PUFF_WIND = 0.55, PUFF_HOLD = 1.6, PUFF_OFF = 0.4, PUFF_CD = 2.6;
function aiPuffer(ctx, mo, dt, p, dp, canHit) {   /* lại gần → phồng gai (báo trước 0,55 s) → gai đâm cả vùng quanh nó; phồng 1,6 s (chạm gai cũng đau) rồi xẹp */
  const c = mo.c, hm = hurtMul(ctx);
  if (mo.st2 === 'wind') { mo.t2 -= dt; if (mo.t2 <= 0) { mo.st2 = 'puffed'; mo.t2 = PUFF_HOLD; if (!(ctx.vfx && ctx.vfx('u_puff', mo.x, mo.y + 10, 0, true))) ctx.vfx && ctx.vfx('rock_debris', mo.x, mo.y + 2); ctx.sfx('hit'); if (canHit && dp < PUFF_R && ctx.hero) ctx.hero.hit(Math.round(c.dmg * hm)); } return; }
  if (mo.st2 === 'puffed') { mo.t2 -= dt; if (canHit && dp < 15 && mo.cd <= 0 && ctx.hero) { mo.cd = 1; ctx.hero.hit(Math.round(c.dmg * 0.5 * hm)); } if (mo.t2 <= 0) { mo.st2 = 'off'; mo.t2 = PUFF_OFF; } return; }
  if (mo.st2 === 'off') { mo.t2 -= dt; if (mo.t2 <= 0) { mo.st2 = null; mo.cd = PUFF_CD; } return; }
  if (canHit && (mo.angry || dp < AGGRO + 16)) {
    if (dp < PUFF_R - 8 && mo.cd <= 0) { mo.st2 = 'wind'; mo.t2 = PUFF_WIND; return; }
    if (dp > 18) steer(ctx, mo, p.x, p.y, c.sp, dt); else mo.face = Math.abs(p.x - mo.x) >= Math.abs(p.y - mo.y) ? (p.x >= mo.x ? 2 : 1) : (p.y >= mo.y ? 0 : 3);
    if (dp > 220) mo.angry = false; return;
  }
  wander(ctx, mo, dt, 0.4);
}
function aiJelly(ctx, mo, dt, p, dp, canHit) {   /* trôi lững lờ, không lao; chạm vào (hoặc nó trôi trúng người) → điện giật + tê ~1 s */
  const c = mo.c;
  if (mo.zap > 0) mo.zap -= dt;
  if (canHit && dp < 13 && mo.cd <= 0) {
    mo.cd = 2.4; mo.zap = 0.35; if (ctx.hero) ctx.hero.hit(Math.round(c.dmg * hurtMul(ctx)));
    if (ctx.stunPlayer) ctx.stunPlayer(1.0);
    if (!(ctx.vfx && ctx.vfx('u_shock', p.x, p.y + 2, 0, true))) ctx.vfx && ctx.vfx('stone_free', p.x, p.y + 2, 0, true);
    ctx.sfx('alarm');
  }
  if (canHit && (mo.angry || dp < AGGRO + 30)) { steer(ctx, mo, p.x + Math.sin(mo.ft * 0.9) * 10, p.y - 2, c.sp, dt); if (dp > 220) mo.angry = false; return; }
  wander(ctx, mo, dt, 0.6);
}
const CRAB_RAISE = 1.0, CRAB_SLAM = 0.7, CRAB_CD = 1.7, CRAB_SLAM_R = 38, LEASH = 8 * 16, ENGAGE = 7.5 * 16;   /* LEASH: cua không rời chỗ canh quá 8 ô; ENGAGE: người chơi vào trong ~7 ô quanh nó (trong đấu trường) mới giao chiến */
function aiCrab(ctx, mo, dt, p, dp, canHit) {   /* trùm vỏ cứng: tới gần → GIƠ CÀNG 1 s (lúc này mới đánh đau) → đập xuống quanh nó → hồi 0,7 s; không rời đấu trường */
  const c = mo.c, home = mo.home || mo;
  if (mo.st2 === 'raise') { mo.t2 -= dt; mo.open = true; if (mo.t2 <= 0) {
    mo.st2 = 'slam'; mo.t2 = CRAB_SLAM; ctx.quake && ctx.quake(0.25); ctx.sfx('build');
    if (!(ctx.vfx && ctx.vfx('rock_debris', mo.x + (mo.face === 1 ? -10 : mo.face === 2 ? 10 : 0), mo.y + 4))) ctx.vfx && ctx.vfx('dirt_puff', mo.x, mo.y + 4);
    if (canHit && dp < CRAB_SLAM_R && ctx.hero) { ctx.hero.hit(Math.round(c.dmg * hurtMul(ctx))); const d = dp || 1; p.tryMove((p.x - mo.x) / d * 14, (p.y - mo.y) / d * 14, ctx.S.map, ctx.allNpcs()); }
  } return; }
  if (mo.st2 === 'slam') { mo.t2 -= dt; mo.open = true; if (mo.t2 <= 0) { mo.st2 = null; mo.open = false; mo.cd = CRAB_CD; } return; }
  mo.open = false;
  const dh = dist(mo, home);
  if (!canHit || dh > LEASH || dist(p, home) > ENGAGE) {   /* người chơi rời đấu trường → về chỗ canh cổng, hồi máu chậm */
    if (dh > 6) steer(ctx, mo, home.x, home.y, c.sp, dt); else { mo.face = 0; if (mo.hp < mo.max) mo.hp = Math.min(mo.max, mo.hp + mo.max * 0.03 * dt); }
    mo.angry = false; return;
  }
  if (!mo.warned) { mo.warned = true; ctx.toast(T(ctx).boss(nm(ctx, c)), true); }
  if (dp < CRAB_SLAM_R - 6 && mo.cd <= 0) { mo.st2 = 'raise'; mo.t2 = CRAB_RAISE; mo.face = Math.abs(p.x - mo.x) >= Math.abs(p.y - mo.y) ? (p.x >= mo.x ? 2 : 1) : (p.y >= mo.y ? 0 : 3); if (ctx.S.time - (ST.raiseT || -9) > 6) { ST.raiseT = ctx.S.time; ctx.toast(T(ctx).raise(nm(ctx, c))); } return; }
  if (dp > 22) steer(ctx, mo, p.x, p.y, c.sp, dt);
}

/* ---------------- plan-26 B1: AI tầng 2–4 (mỗi loài một kiểu đánh; báo trước bằng sáng + rung nhẹ, chỉ trong lúc báo) ---------------- */
const faceTo = (mo, x, y) => { const dx = x - mo.x, dy = y - mo.y; mo.face = Math.abs(dx) >= Math.abs(dy) ? (dx >= 0 ? 2 : 1) : (dy >= 0 ? 0 : 3); mo.dir = dx >= 0 ? 1 : -1; };
function glide(ctx, mo, vx, vy, dt) {   /* lướt thẳng (lao / húc); false = đâm vào vật chắn */
  let ok = true, hit = null; const nx = mo.x + vx * dt, ny = mo.y + vy * dt;
  if (walkable(ctx, nx, mo.y, mo.c.fly, mo.c.aqua)) mo.x = nx; else { ok = false; hit = [Math.floor(nx / 16), Math.floor(mo.y / 16)]; }
  if (walkable(ctx, mo.x, ny, mo.c.fly, mo.c.aqua)) mo.y = ny; else { ok = false; hit = hit || [Math.floor(mo.x / 16), Math.floor(ny / 16)]; }
  if (hit && mo.c.ai !== 'armorshark') ramWreck(ctx, mo, hit, 2);   /* quái nhỏ lao vào xác tàu: 3 lần mới vỡ (trùm to tự xử lý: 1 lần) */
  return ok;
}
const hitP = (ctx, mo, mul = 1) => (ctx.hero ? ctx.hero.hit(Math.round(mo.c.dmg * mul * hurtMul(ctx))) : false);
const shove = (ctx, p, ux, uy, d) => { const l = Math.hypot(ux, uy) || 1; p.tryMove(ux / l * d, uy / l * d, ctx.S.map, ctx.allNpcs()); };
const zap = (ctx, p) => { if (!(ctx.vfx && ctx.vfx('u_shock', p.x, p.y + 2, 0, true))) ctx.vfx && ctx.vfx('stone_free', p.x, p.y + 2, 0, true); };
const say = (ctx, key, txt, big, gap = 8) => { if (ctx.uwSay) ctx.uwSay(key, txt, big, gap); else warn(ctx, txt); };
function bossLeash(ctx, mo, dt, p, canHit) {   /* trùm không rời chỗ canh cổng; người chơi ra khỏi đấu trường → về chỗ, hồi máu chậm. true = đang rút về */
  const home = mo.home || mo, dh = dist(mo, home), lsh = mo.c.leash || LEASH * 1.5, eng = mo.c.engage || ENGAGE * 1.15;
  if (canHit && dh <= lsh && dist(p, home) <= eng) return false;
  if (dh > 6) steer(ctx, mo, home.x, home.y, mo.c.sp * 1.2, dt); else { mo.face = 0; if (mo.hp < mo.max) mo.hp = Math.min(mo.max, mo.hp + mo.max * 0.03 * dt); }
  mo.angry = false; mo.st2 = null; mo.open = false; mo.glow = 0; mo.shake = 0; mo.ringR = 0; return true;
}

const EEL_AIM = 0.55, EEL_DASH = 0.5, EEL_SP = 170, EEL_TIRED = 1.1, EEL_CD = 2.2;
function aiEel(ctx, mo, dt, p, dp, canHit) {   /* núp trong tảo; THẲNG HÀNG với người chơi (cùng cột / cùng hàng) → tích điện 0,55 s (sáng + rung) → lao thẳng; trúng: điện giật tê 0,5 s; lao xong mệt 1,1 s */
  const c = mo.c;
  if (mo.st2 === 'aim') { mo.t2 -= dt; mo.glow = 1; mo.shake = 1; if (mo.t2 <= 0) { mo.st2 = 'dash'; mo.t2 = EEL_DASH; mo.hitOnce = false; mo.shake = 0; ctx.sfx('alarm'); } return; }
  if (mo.st2 === 'dash') {
    mo.t2 -= dt; const ok = glide(ctx, mo, mo.vx * EEL_SP, mo.vy * EEL_SP, dt);
    if (canHit && !mo.hitOnce && dist(mo, p) < 13) { mo.hitOnce = true; hitP(ctx, mo); if (ctx.stunPlayer) ctx.stunPlayer(0.5); zap(ctx, p); }
    if (mo.t2 <= 0 || !ok) { mo.st2 = 'tired'; mo.t2 = EEL_TIRED; mo.glow = 0; } return;
  }
  if (mo.st2 === 'tired') { mo.t2 -= dt; if (mo.t2 <= 0) { mo.st2 = null; mo.cd = EEL_CD; } return; }
  mo.glow = 0; mo.shake = 0;
  if (!(canHit && (mo.angry || dp < 120))) { wander(ctx, mo, dt, 0.3); return; }
  const dx = p.x - mo.x, dy = p.y - mo.y;
  if (mo.cd <= 0 && dp < 130 && dp > 20 && (Math.abs(dx) < 8 || Math.abs(dy) < 8)) {
    mo.st2 = 'aim'; mo.t2 = EEL_AIM; if (Math.abs(dx) < 8) { mo.vx = 0; mo.vy = Math.sign(dy) || 1; } else { mo.vx = Math.sign(dx) || 1; mo.vy = 0; }
    faceTo(mo, mo.x + mo.vx, mo.y + mo.vy); return;
  }
  if (dp < 34) steer(ctx, mo, mo.x - dx, mo.y - dy, c.sp, dt);   /* quá gần → lùi lại lấy tầm lao */
  else if (Math.abs(dx) < Math.abs(dy)) steer(ctx, mo, p.x, mo.y, c.sp, dt); else steer(ctx, mo, mo.x, p.y, c.sp, dt);   /* bơi dọc trục còn lệch ít hơn để xếp thẳng hàng */
  faceTo(mo, p.x, p.y); if (dp > 240) mo.angry = false;
}
const SF_ORBIT = 62, SF_WIND = 0.6, SF_CHARGE = 0.65, SF_SP = 185, SF_STUCK = 1.6, SF_CD = 2.4;
function aiSwordfish(ctx, mo, dt, p, dp, canHit) {   /* lượn vòng quanh người chơi; lùi lấy đà 0,6 s → HÚC thẳng; trúng: đau + hất văng; húc trượt vào san hô/đá → cắm mỏ kẹt 1,6 s (bị đánh ×1,5) */
  const c = mo.c;
  if (mo.st2 === 'wind') { mo.t2 -= dt; mo.glow = 1; const d = dp || 1; mo.vx = (p.x - mo.x) / d; mo.vy = (p.y - mo.y) / d; faceTo(mo, p.x, p.y); glide(ctx, mo, -mo.vx * 18, -mo.vy * 18, dt);
    if (mo.t2 <= 0) { mo.st2 = 'charge'; mo.t2 = SF_CHARGE; mo.hitOnce = false; mo.glow = 0; ctx.sfx('splash'); } return; }
  if (mo.st2 === 'charge') {
    mo.t2 -= dt; const ok = glide(ctx, mo, mo.vx * SF_SP, mo.vy * SF_SP, dt);
    if (canHit && !mo.hitOnce && dist(mo, p) < 14) { mo.hitOnce = true; hitP(ctx, mo, 1.2); shove(ctx, p, mo.vx, mo.vy, 22); if (ctx.quake) ctx.quake(0.15); mo.st2 = 'recover'; mo.t2 = 0.6; return; }
    if (!ok) { mo.st2 = 'stuck'; mo.t2 = SF_STUCK; mo.open = true; if (ctx.vfx) ctx.vfx('rock_debris', mo.x + mo.vx * 8, mo.y + 2); ctx.sfx('build'); if (dist(mo, p) < 170) say(ctx, 'sfstuck', T(ctx).stuck(nm(ctx, c))); return; }
    if (mo.t2 <= 0) { mo.st2 = 'recover'; mo.t2 = 0.6; } return;
  }
  if (mo.st2 === 'stuck') { mo.t2 -= dt; mo.shake = 0.6; if (mo.t2 <= 0) { mo.st2 = null; mo.open = false; mo.shake = 0; mo.cd = SF_CD; } return; }
  if (mo.st2 === 'recover') { mo.t2 -= dt; if (mo.t2 <= 0) { mo.st2 = null; mo.cd = SF_CD; } return; }
  mo.glow = 0;
  if (!(canHit && (mo.angry || dp < 130))) { wander(ctx, mo, dt, 0.5); return; }
  mo.orb = (mo.orb ?? Math.atan2(mo.y - p.y, mo.x - p.x)) + dt * 0.9;
  steer(ctx, mo, p.x + Math.cos(mo.orb) * SF_ORBIT, p.y + Math.sin(mo.orb) * SF_ORBIT * 0.8, c.sp, dt);
  if (mo.cd <= 0 && dp < 110 && dp > 36) { mo.st2 = 'wind'; mo.t2 = SF_WIND; }
  if (dp > 240) mo.angry = false;
}
const ME_CHARGE = 1.1, ME_RING = 0.75, ME_R0 = 14, ME_R1 = 100, ME_BAND = 9, ME_GAPW = 0.62, ME_DRAIN = 1.6, ME_CD = 1.8;
const inGap = (mo, p) => { let a = Math.atan2(p.y - mo.y, p.x - mo.x) - mo.gap; a = Math.atan2(Math.sin(a), Math.cos(a)); return Math.abs(a) < ME_GAPW; };
function aiMomEel(ctx, mo, dt, p, dp, canHit) {   /* trùm: TÍCH ĐIỆN 1,1 s (vòng tia điện quanh nó, chừa 1 KHE HỞ) → vòng điện nở ra 100 px; né = bơi ra xa hoặc đứng trong khe; xả xong HẾT ĐIỆN 1,6 s (đánh ×1,5); dưới nửa máu gọi 2 Lươn Điện */
  const c = mo.c;
  if (mo.st2 === 'charge') { mo.t2 -= dt; mo.glow = 1; mo.shake = 0.5; mo.ringR = ME_R0 + (1 - mo.t2 / ME_CHARGE) * 6; if (mo.t2 <= 0) { mo.st2 = 'ring'; mo.t2 = ME_RING; mo.hitOnce = false; mo.shake = 0; ctx.sfx('alarm'); if (ctx.quake) ctx.quake(0.2); } return; }
  if (mo.st2 === 'ring') {
    mo.t2 -= dt; mo.ringR = ME_R0 + (ME_R1 - ME_R0) * (1 - mo.t2 / ME_RING);
    if (canHit && !mo.hitOnce && Math.abs(dp - mo.ringR) < ME_BAND && !inGap(mo, p)) { mo.hitOnce = true; hitP(ctx, mo, 1.1); if (ctx.stunPlayer) ctx.stunPlayer(0.6); zap(ctx, p); }
    if (mo.t2 <= 0) { mo.st2 = 'drained'; mo.t2 = ME_DRAIN; mo.open = true; mo.ringR = 0; mo.glow = 0; if (dp < 160) say(ctx, 'medrain', T(ctx).drained(nm(ctx, c))); } return;
  }
  if (mo.st2 === 'drained') { mo.t2 -= dt; if (mo.t2 <= 0) { mo.st2 = null; mo.open = false; mo.cd = ME_CD; } return; }
  mo.open = false; mo.glow = 0; mo.shake = 0; mo.ringR = 0;
  if (bossLeash(ctx, mo, dt, p, canHit)) return;
  if (!mo.warned) { mo.warned = true; ctx.toast(T(ctx).boss(nm(ctx, c)), true); }
  if (!mo.summoned && mo.hp < mo.max * 0.5) { mo.summoned = true; for (const k of [-1, 1]) { const e = newMo(UW.eel, mo.x + k * 30, mo.y + 10); if (walkable(ctx, e.x, e.y)) { e.angry = true; ST.list.push(e); } } say(ctx, 'mesum', T(ctx).summon(nm(ctx, c)), true); }
  if (mo.cd <= 0 && dp < 84) { mo.st2 = 'charge'; mo.t2 = ME_CHARGE; mo.gap = Math.atan2(p.y - mo.y, p.x - mo.x) + (Math.random() - 0.5) * 2; faceTo(mo, p.x, p.y); say(ctx, 'mering', T(ctx).ring(nm(ctx, c)), false, 10); return; }
  if (dp < 18 && (mo.cd2 = (mo.cd2 || 0) - dt) <= 0) { mo.cd2 = 1.4; hitP(ctx, mo, 0.8); }
  if (dp > 26) steer(ctx, mo, p.x, p.y, c.sp, dt); else faceTo(mo, p.x, p.y);
}
const SQ_INK_CD = 7, SQ_SLAP_CD = 1.4;
function aiSquid(ctx, mo, dt, p, dp, canHit) {   /* bơi giật cục (bơm thân) tới quất xúc tu; bị đánh / bị áp sát lâu → PHUN MỰC (tối nhẹ ~2,4 s, một lần) rồi phụt lùi ra xa */
  const c = mo.c; if (mo.inkCd > 0) mo.inkCd -= dt;
  if (mo.st2 === 'jet') { mo.t2 -= dt; glide(ctx, mo, mo.vx * 150, mo.vy * 150, dt); if (mo.t2 <= 0) mo.st2 = null; return; }
  if (!(canHit && (mo.angry || dp < 110))) { wander(ctx, mo, dt, 0.5); mo.justHit = false; return; }
  mo.close = dp < 28 ? (mo.close || 0) + dt : 0;
  if ((mo.justHit || mo.close > 1.2) && !(mo.inkCd > 0)) {
    mo.justHit = false; mo.close = 0; mo.inkCd = SQ_INK_CD;
    if (!(ctx.vfx && ctx.vfx('u_ink', mo.x, mo.y + 14, 0, true))) ctx.vfx && ctx.vfx('dirt_puff', mo.x, mo.y + 4);
    if (dp < 150 && ctx.uwInk) ctx.uwInk(2.4);
    const d = dp || 1; mo.vx = (mo.x - p.x) / d; mo.vy = (mo.y - p.y) / d; mo.st2 = 'jet'; mo.t2 = 0.45; faceTo(mo, mo.x + mo.vx, mo.y + mo.vy); ctx.sfx('splash'); return;
  }
  mo.justHit = false;
  const pump = 0.5 + 0.8 * Math.max(0, Math.sin(mo.ft * 5));
  if (dp > 14) steer(ctx, mo, p.x, p.y, c.sp * pump, dt); else if (mo.cd <= 0) { mo.cd = SQ_SLAP_CD; hitP(ctx, mo); }
  faceTo(mo, p.x, p.y); if (dp > 240) mo.angry = false;
}
const SS_AIM = 0.35, SS_DASH = 0.55, SS_SP = 205, SS_CD = 1.6;
function aiSawshark(ctx, mo, dt, p, dp, canHit) {   /* lượn nhanh vòng ngoài; quay đầu 0,35 s → lao THẲNG (không bám theo) cắn: đau + CHẢY MÁU 3 nhịp; lao vượt qua rồi vòng lại */
  const c = mo.c;
  if (mo.st2 === 'aim') { mo.t2 -= dt; mo.glow = 1; faceTo(mo, p.x, p.y); const d = dp || 1; mo.vx = (p.x - mo.x) / d; mo.vy = (p.y - mo.y) / d; if (mo.t2 <= 0) { mo.st2 = 'dash'; mo.t2 = SS_DASH; mo.hitOnce = false; mo.glow = 0; } return; }
  if (mo.st2 === 'dash') {
    mo.t2 -= dt; const ok = glide(ctx, mo, mo.vx * SS_SP, mo.vy * SS_SP, dt);
    if (canHit && !mo.hitOnce && dist(mo, p) < 13) { mo.hitOnce = true; if (hitP(ctx, mo) && ctx.uwDot) ctx.uwDot('bleed', c.dmg * 0.18, 3); }
    if (mo.t2 <= 0 || !ok) { mo.st2 = null; mo.cd = SS_CD; } return;
  }
  if (!(canHit && (mo.angry || dp < 130))) { wander(ctx, mo, dt, 0.8); return; }
  if (mo.cd <= 0 && dp < 120 && dp > 24) { mo.st2 = 'aim'; mo.t2 = SS_AIM; return; }
  mo.orb = (mo.orb ?? Math.atan2(mo.y - p.y, mo.x - p.x)) - dt * 1.4;
  steer(ctx, mo, p.x + Math.cos(mo.orb) * 80, p.y + Math.sin(mo.orb) * 60, c.sp, dt);
  if (dp > 260) mo.angry = false;
}
const AS_AIM = 1.0, AS_CHARGE = 1.3, AS_SP = 215, AS_STUN = 2.4, AS_TIRED = 1.0, AS_CD = 1.4;
/* anh 2026-10-11: xác tàu (wreckwall*) bị húc / đánh thì VỠ — 'máu' 6: Cá Mập Bọc Giáp húc 1 lần là san phẳng; quái nhỏ húc 3 lần; người chơi đánh 6 lần.
   Đang sứt → ảnh NỨT PixelLab (manifest.ruins dmg), vỡ hẳn → ảnh ĐỐNG VÁN VỤN (ruin) của chính mẫu tường, hết chắn đường. Chừa viền bản đồ. */
export const WRECK_HP = 6;
export const BREAKABLE = /^(wreckwall\d?|wreck|coral|coral_t|caverock\d?|xwall\d?)$/;   /* anh 2026-10-11: mọi vật cản đường dưới nước phá được (san hô, xác tàu, đá hang, tường pháo đài); cổng/rương/bảng/pha lê/ngai thì không */
const fp = (ctx, o) => { const d = ctx.O && ctx.O[o.type]; return { w: (d && d.fw) || 1, h: (d && d.fh) || 1 }; };
export function isWreck(m, o) { return !!o && !o.ruined && !!m.under && BREAKABLE.test(o.type) && o.x > 1 && o.y > 1 && o.x < m.w - 2 && o.y < m.h - 2; }
export function hitWreck(ctx, o, power) {   /* true = vỡ hẳn */
  const m = ctx.S.map; o.hpMax = WRECK_HP; o.hp = Math.max(0, (o.hp ?? WRECK_HP) - power);
  if (ctx.vfx) ctx.vfx('wood_chips', o.x * 16 + 8, o.y * 16 + 10);
  if (o.hp > 0) return false;
  const f = fp(ctx, o); o.ruined = true; for (let j = 0; j < f.h; j++) for (let i = 0; i < f.w; i++) if (o.x + i < m.w && o.y + j < m.h) m.solid[(o.y + j) * m.w + o.x + i] = 0; return true;
}
function ramWreck(ctx, mo, tile, power) {   /* tile: ô bị đâm (quái nhỏ) · null = cả vùng trước mũi (trùm to, rộng ~3 ô) */
  const m = ctx.S.map, now = ctx.S.time; if ((mo.ramT || 0) > now) return 0; mo.ramT = now + 0.35;
  const fx = mo.x + mo.vx * 16, fy = mo.y + mo.vy * 12; let n = 0, broke = 0;
  for (const o of m.objects) {
    if (!isWreck(m, o)) continue;
    const f = fp(ctx, o);
    if (tile ? (tile[0] < o.x || tile[0] >= o.x + f.w || tile[1] < o.y || tile[1] >= o.y + f.h) : (Math.abs(o.x * 16 + f.w * 8 - fx) > 14 + f.w * 8 || Math.abs(o.y * 16 + f.h * 8 - fy) > 12 + f.h * 8)) continue;
    n++; if (hitWreck(ctx, o, power)) broke++;
  }
  if (n) ctx.sfx(broke ? 'collapse' : 'build');
  return n;
}
function aiArmorShark(ctx, mo, dt, p, dp, canHit) {   /* trùm bọc giáp (chỉ ăn 25 %): nhắm 1 s → húc thẳng; đâm trúng xác tàu → choáng 2,4 s, HỞ GIÁP; húc hụt → khựng 1 s (cũng hở); trúng người → rất đau + hất văng */
  const c = mo.c, home = mo.home || mo;
  if (mo.st2 === 'aim') { mo.t2 -= dt; mo.glow = 1; mo.shake = 0.7; faceTo(mo, p.x, p.y); const d = dp || 1; mo.vx = (p.x - mo.x) / d; mo.vy = (p.y - mo.y) / d; if (mo.t2 <= 0) { mo.st2 = 'charge'; mo.t2 = AS_CHARGE; mo.hitOnce = false; mo.shake = 0; mo.glow = 0; ctx.sfx('alarm'); } return; }
  if (mo.st2 === 'charge') {
    mo.t2 -= dt; const ok = glide(ctx, mo, mo.vx * AS_SP, mo.vy * AS_SP, dt);
    if (canHit && !mo.hitOnce && dist(mo, p) < 20) { mo.hitOnce = true; hitP(ctx, mo, 1.3); shove(ctx, p, mo.vx, mo.vy, 30); if (ctx.quake) ctx.quake(0.3); }
    if (!ok) { mo.st2 = 'stun'; mo.t2 = AS_STUN; mo.open = true; if (ctx.quake) ctx.quake(0.45); if (!ramWreck(ctx, mo, null, WRECK_HP)) ctx.sfx('build'); if (ctx.vfx) ctx.vfx('rock_debris', mo.x + mo.vx * 14, mo.y + 2); ctx.toast(T(ctx).armorOpen(nm(ctx, c)), true); return; }
    if (mo.t2 <= 0 || dist(mo, home) > (c.leash || LEASH * 1.6)) { mo.st2 = 'tired'; mo.t2 = AS_TIRED; mo.open = true; say(ctx, 'asmiss', T(ctx).missOpen(nm(ctx, c))); } return;
  }
  if (mo.st2 === 'stun' || mo.st2 === 'tired') { mo.t2 -= dt; mo.open = true; mo.shake = mo.st2 === 'stun' ? 0.4 : 0; if (mo.t2 <= 0) { mo.st2 = null; mo.open = false; mo.shake = 0; mo.cd = AS_CD; } return; }
  mo.open = false; mo.glow = 0; mo.shake = 0;
  if (bossLeash(ctx, mo, dt, p, canHit)) return;
  if (!mo.warned) { mo.warned = true; ctx.toast(T(ctx).boss(nm(ctx, c)), true); }
  if (dp < 20 && (mo.cd2 = (mo.cd2 || 0) - dt) <= 0) { mo.cd2 = 1.4; hitP(ctx, mo, 0.8); }
  if (mo.cd <= 0 && dp < 160 && dp > 30) { mo.st2 = 'aim'; mo.t2 = AS_AIM; say(ctx, 'asaim', T(ctx).aim(nm(ctx, c)), false, 10); return; }
  if (dp > 16) steer(ctx, mo, p.x, p.y, c.sp, dt); else faceTo(mo, p.x, p.y);   /* 2026-10-11: trước đây chỉ bơi lại khi > 40 px mà cắn khi < 20 px → đứng im khựng ở 20–40 px (anh thấy 'bị kẹt') */
}
const AN_LURE_R = 84, AN_PULL = 15, AN_GAPE = 0.45, AN_SNAP = 0.2, AN_SNAP_SP = 210, AN_REST = 3.0;
function aiAngler(ctx, mo, dt, p, dp, canHit) {   /* nằm im trong tối, chỉ mồi sáng lắc lư; người lại gần ≤ 84 px → ánh sáng DỤ (kéo nhẹ về phía mồi); ≤ 30 px → há miệng 0,45 s → ĐỚP lao tới; xong lùi về chỗ tối, tắt mồi 3 s */
  const c = mo.c; mo.home ||= { x: mo.x, y: mo.y };
  if (mo.lureOff > 0) mo.lureOff -= dt;
  const fx = mo.face === 1 ? -1 : mo.face === 2 ? 1 : 0;
  mo.lure = mo.lureOff > 0 ? null : { x: mo.x + fx * 7, y: mo.y - 15 + Math.sin(mo.ft * 2.2) * 1.5, r: 26 };
  if (mo.st2 === 'gape') { mo.t2 -= dt; mo.glow = 1; mo.shake = 0.6; if (mo.t2 <= 0) { mo.st2 = 'snap'; mo.t2 = AN_SNAP; const d = dp || 1; mo.vx = (p.x - mo.x) / d; mo.vy = (p.y - mo.y) / d; mo.hitOnce = false; mo.shake = 0; ctx.sfx('hit'); } return; }
  if (mo.st2 === 'snap') { mo.t2 -= dt; glide(ctx, mo, mo.vx * AN_SNAP_SP, mo.vy * AN_SNAP_SP, dt); if (canHit && !mo.hitOnce && dist(mo, p) < 14) { mo.hitOnce = true; hitP(ctx, mo, 1.4); } if (mo.t2 <= 0) { mo.st2 = 'back'; mo.t2 = 1.6; mo.lureOff = AN_REST; mo.glow = 0; } return; }
  if (mo.st2 === 'back') { mo.t2 -= dt; steer(ctx, mo, mo.home.x, mo.home.y, c.sp, dt); if (mo.t2 <= 0) mo.st2 = null; return; }
  mo.glow = 0; mo.shake = 0; if (!canHit) return;
  if (mo.angry && dp > 30) { steer(ctx, mo, p.x, p.y, c.sp, dt); if (dp > 200) mo.angry = false; }
  else if (!mo.angry && mo.lure && dp < AN_LURE_R && dp > 22) {
    const lx = mo.lure.x, ly = mo.lure.y + 14, d = Math.hypot(lx - p.x, ly - p.y) || 1;
    p.tryMove((lx - p.x) / d * AN_PULL * dt, (ly - p.y) / d * AN_PULL * dt, ctx.S.map, ctx.allNpcs());
    say(ctx, 'lure', T(ctx).lured, false, 14);
  }
  if (dp < AN_LURE_R) faceTo(mo, p.x, p.y);
  if (dp < 30 && mo.cd <= 0) { mo.st2 = 'gape'; mo.t2 = AN_GAPE; mo.cd = 2.2; }
}
const SN_BITE_CD = 1.6;
function aiSeaSnake(ctx, mo, dt, p, dp, canHit) {   /* uốn lượn hình sin lao tới rất nhanh; cắn → TRÚNG ĐỘC (mất máu 4 nhịp); cắn xong cuộn lùi 0,6 s */
  const c = mo.c;
  if (mo.st2 === 'coil') { mo.t2 -= dt; glide(ctx, mo, -mo.vx * 70, -mo.vy * 70, dt); if (mo.t2 <= 0) mo.st2 = null; return; }
  if (!(canHit && (mo.angry || dp < 120))) { wander(ctx, mo, dt, 0.6); return; }
  const d = dp || 1, ux = (p.x - mo.x) / d, uy = (p.y - mo.y) / d, s = Math.sin(mo.ft * 7) * 0.9;
  if (dp > 12) steer(ctx, mo, mo.x + (ux - uy * s) * 20, mo.y + (uy + ux * s) * 20, c.sp, dt);
  faceTo(mo, p.x, p.y);
  if (dp < 14 && mo.cd <= 0) { mo.cd = SN_BITE_CD; if (hitP(ctx, mo) && ctx.uwDot) ctx.uwDot('poison', c.dmg * 0.15, 4); mo.st2 = 'coil'; mo.t2 = 0.6; mo.vx = ux; mo.vy = uy; }
  if (dp > 240) mo.angry = false;
}
const SE_SEGS = 9, SE_GAP = 8, SE_REAR = 0.9, SE_LUNGE = 0.5, SE_LSP = 175, SE_REST = 1.4, SE_CD = 2.0;
function serpentBody(mo) {   /* các đốt thân bám theo vệt đường đầu rắn đã đi (cách nhau SE_GAP px) */
  if (!mo.trail) { mo.trail = []; for (let i = 0; i <= SE_SEGS * SE_GAP; i += 2) mo.trail.push({ x: mo.x + i, y: mo.y - Math.sin(i / 14) * 6 }); }
  const t = mo.trail, h = t[0]; if (Math.hypot(h.x - mo.x, h.y - mo.y) >= 2) { t.unshift({ x: mo.x, y: mo.y }); if (t.length > SE_SEGS * SE_GAP / 2 + 6) t.pop(); }
  const segs = []; let acc = 0, k = 0, prev = { x: mo.x, y: mo.y };
  for (let i = 1; i <= SE_SEGS; i++) {
    const want = i * SE_GAP;
    while (k < t.length && acc + Math.hypot(t[k].x - prev.x, t[k].y - prev.y) < want) { acc += Math.hypot(t[k].x - prev.x, t[k].y - prev.y); prev = t[k]; k++; }
    const nx = t[Math.min(k, t.length - 1)], L = Math.hypot(nx.x - prev.x, nx.y - prev.y) || 1, f = Math.min(1, (want - acc) / L);
    segs.push({ x: prev.x + (nx.x - prev.x) * f, y: prev.y + (nx.y - prev.y) * f });
  }
  mo.segs = segs;
}
function aiSerpent(ctx, mo, dt, p, dp, canHit) {   /* trùm nhiều đốt: lượn vòng quanh chỗ canh; NGÓC ĐẦU 0,9 s → lao đầu tới 0,5 s → ĐẦU HẠ THẤP 1,4 s (đánh ×1,5); thân vảy cứng (10 %), chạm thân cũng đau nhẹ */
  const c = mo.c, home = mo.home || mo;
  serpentBody(mo);
  if (canHit && (mo.cd3 = (mo.cd3 || 0) - dt) <= 0) for (const s of mo.segs) if (dist(s, p) < 9) { mo.cd3 = 1; hitP(ctx, mo, 0.45); break; }
  if (mo.st2 === 'rear') { mo.t2 -= dt; mo.glow = 1; mo.lift = Math.min(6, (mo.lift || 0) + dt * 14); faceTo(mo, p.x, p.y); const d = dp || 1; mo.vx = (p.x - mo.x) / d; mo.vy = (p.y - mo.y) / d; if (mo.t2 <= 0) { mo.st2 = 'lunge'; mo.t2 = SE_LUNGE; mo.hitOnce = false; mo.glow = 0; ctx.sfx('alarm'); } return; }
  if (mo.st2 === 'lunge') {
    mo.t2 -= dt; mo.lift = Math.max(0, (mo.lift || 0) - dt * 20); const ok = glide(ctx, mo, mo.vx * SE_LSP, mo.vy * SE_LSP, dt);
    if (canHit && !mo.hitOnce && dist(mo, p) < 16) { mo.hitOnce = true; hitP(ctx, mo, 1.3); shove(ctx, p, mo.vx, mo.vy, 20); }
    if (mo.t2 <= 0 || !ok || dist(mo, home) > (c.leash || LEASH * 1.6)) { mo.st2 = 'rest'; mo.t2 = SE_REST; mo.open = true; if (ctx.quake) ctx.quake(0.25); if (ctx.vfx) ctx.vfx('dirt_puff', mo.x, mo.y + 4); if (dp < 170) say(ctx, 'sedown', T(ctx).headDown(nm(ctx, c))); } return;
  }
  if (mo.st2 === 'rest') { mo.t2 -= dt; mo.open = true; if (mo.t2 <= 0) { mo.st2 = null; mo.open = false; mo.cd = SE_CD; } return; }
  mo.open = false; mo.glow = 0; mo.lift = 0;
  if (bossLeash(ctx, mo, dt, p, canHit)) { mo.orb = (mo.orb || 0) + dt * 0.5; return; }
  if (!mo.warned) { mo.warned = true; ctx.toast(T(ctx).boss(nm(ctx, c)), true); }
  if (mo.cd <= 0 && dp < 110 && dp > 28) { mo.st2 = 'rear'; mo.t2 = SE_REAR; say(ctx, 'serear', T(ctx).rear(nm(ctx, c)), false, 10); return; }
  mo.orb = (mo.orb ?? Math.atan2(mo.y - p.y, mo.x - p.x)) + dt * 0.8;   /* lượn vòng quanh người chơi, thân quấn theo */
  steer(ctx, mo, p.x + Math.cos(mo.orb) * 64, p.y + Math.sin(mo.orb) * 46, c.sp, dt);
}

/* ---------------- plan-26 B2: Kraken + Xealist ---------------- */
const T2 = ctx => (vi(ctx) ? {
  krSlam: 'Bóng tối loang dưới đáy — xúc tu sắp đập xuống, tránh ra!', krSum: 'Kraken gọi cá mập tới!', krInk: 'Kraken phun mực!',
  xeBoss: '👑 Xealist chặn đường — kẻ đã biến Lyron thành đá!', xeP2: 'Xealist gọi Bóng Tối và xúc tu Kraken!', xeP3: 'Pha lê hồng bừng sáng — Xealist mạnh lên, tia hóa đá bắn tứ phía!', xeBeam: 'Xealist nhắm tia hóa đá — tránh khỏi đường ngắm!',
} : {
  krSlam: 'A shadow spreads on the seabed — a tentacle is about to slam, move!', krSum: 'The Kraken calls in the sharks!', krInk: 'The Kraken sprays ink!',
  xeBoss: '👑 Xealist blocks the way — the one who turned Lyron to stone!', xeP2: 'Xealist summons Shadows and the Kraken\'s tentacles!', xeP3: 'The pink crystals flare — Xealist powers up, petrify beams in every direction!', xeBeam: 'Xealist aims a petrify beam — get out of its line!',
});
const KR_WARN = 0.8, KR_LASH = 0.55, KR_R = 20, KR_CD = 1.4, KR_INK_EVERY = 4;
const XE_AIM = 0.85, XE_FIRE = 0.35, XE_LEN = 240, XE_W = 9, XE_PETRI = 2;
initKraken({ ST, UW, hitP, shove, say, newMo, walkable, nm, vi });
const slamAt = krSlamAt, slamTick = krSlamTick;   /* xúc tu dùng chung (Kraken: kẹt 2 s · Xealist: 0,6 s) — kraken.js */
function aiKraken(ctx, mo, dt, p, dp, canHit) { aiKrakenNew(ctx, mo, dt, p, dp, canHit, bossLeash); }   /* 2026-10-11: 3 pha — kraken.js */
function aiShade(ctx, mo, dt, p, dp, canHit) {   /* Bóng Tối (lính của Xealist): bay xuyên vật cản, áp sát cào */
  if (!canHit) { wander(ctx, mo, dt, 0.4); return; }
  if (dp > 12) steer(ctx, mo, p.x, p.y, mo.c.sp, dt); else if (mo.cd <= 0) { mo.cd = 1.3; hitP(ctx, mo); }
  faceTo(mo, p.x, p.y);
}
const segDist = (px_, py_, x0, y0, a, len) => { const ux = Math.cos(a), uy = Math.sin(a), t = Math.max(0, Math.min(len, (px_ - x0) * ux + (py_ - y0) * uy)); return Math.hypot(px_ - (x0 + ux * t), py_ - (y0 + uy * t)); };
function beamTick(ctx, mo, dt, p, canHit) {   /* tia hóa đá: nhắm 0,85 s (vạch tĩnh) → bắn; trúng: hóa đá 2 s (underwater.js ctx.petrifyPlayer) */
  if (!mo.beams || !mo.beams.length) return;
  for (const b of mo.beams) {
    b.t -= dt; if (b.st !== 'aim' || b.t > 0) continue;
    b.st = 'fire'; b.t = XE_FIRE; ctx.sfx('zap');
    if (ctx.vfx) for (const k of [0.35, 0.7]) ctx.vfx('petrify', b.x + Math.cos(b.a) * XE_LEN * k, b.y + Math.sin(b.a) * XE_LEN * k + 8, 0, true);
    if (canHit && !b.hit && segDist(p.x, p.y - 6, b.x, b.y, b.a, XE_LEN) < XE_W) { b.hit = true; hitP(ctx, mo, 0.6); if (ctx.petrifyPlayer) ctx.petrifyPlayer(XE_PETRI); }
  }
  mo.beams = mo.beams.filter(b => b.st === 'aim' || b.t > 0);
}
function aiXealist(ctx, mo, dt, p, dp, canHit) {   /* trùm cuối (phe Noxx): pha 1 tia hóa đá · pha 2 (< 66 %) + Bóng Tối + xúc tu Kraken · pha 3 (< 30 %) pha lê hồng: nhanh hơn, tia bắn vòng tròn */
  const c = mo.c, k = mo.hp / mo.max, ph = k > 0.66 ? 1 : k > 0.3 ? 2 : 3;
  slamTick(ctx, mo, dt, p, canHit, 1.0); beamTick(ctx, mo, dt, p, canHit);
  if (mo.ph && ph > mo.ph) {
    if (ph === 2) { say(ctx, 'xep2', T2(ctx).xeP2, true, 4); mo.sumT = 0; }
    if (ph === 3) { say(ctx, 'xep3', T2(ctx).xeP3, true, 4); mo.pink = true; if (ctx.quake) ctx.quake(0.35); if (ctx.vfx) ctx.vfx('dark_aura', mo.x, mo.y, 0, true); ctx.sfx('xealist'); }
  }
  mo.ph = ph;
  if (bossLeash(ctx, mo, dt, p, canHit)) { mo.beams = null; mo.slams = null; return; }
  if (!mo.warned) { mo.warned = true; ctx.toast(T2(ctx).xeBoss, true); ctx.sfx('xealist'); }
  const sp = c.sp * (ph === 3 ? 1.6 : 1), aiming = mo.beams && mo.beams.some(b => b.st === 'aim');
  mo.orb = (mo.orb ?? Math.atan2(mo.y - p.y, mo.x - p.x)) + dt * (ph === 3 ? 0.9 : 0.5);
  if (!aiming) steer(ctx, mo, p.x + Math.cos(mo.orb) * 90, p.y + Math.sin(mo.orb) * 70, sp, dt);
  faceTo(mo, p.x, p.y);
  if (canHit && dp < 18 && (mo.cd3 = (mo.cd3 || 0) - dt) <= 0) { mo.cd3 = 1.2; hitP(ctx, mo, 0.5); }
  if (ph >= 2 && (mo.sumT = (mo.sumT ?? 0) - dt) <= 0) {
    mo.sumT = 20; const have = ST.list.filter(o => o.c.ai === 'shade').length, n = Math.max(0, (ph === 3 ? 3 : 2) - have);
    for (let i = 0; i < n; i++) { const a = TAU_M * i / Math.max(1, n), e = newMo(UW.shade, mo.x + Math.cos(a) * 40, mo.y + Math.sin(a) * 30); e.angry = true; ST.list.push(e); if (ctx.vfx) ctx.vfx('monster_poof', e.x, e.y + 4, 0, true); }
  }
  if (mo.cd > 0 || aiming || (mo.slams && mo.slams.length)) return;
  mo.n = (mo.n || 0) + 1;
  if (ph >= 2 && mo.n % 3 === 0) { const a = Math.random() * TAU_M; slamAt(mo, [[p.x, p.y], [p.x + Math.cos(a) * 44, p.y + Math.sin(a) * 44]]); mo.cd = 1.4 + KR_WARN; return; }
  const ox = mo.x, oy = mo.y - 16;
  if (ph === 3) { const a0 = Math.atan2(p.y - 6 - oy, p.x - ox); mo.beams = Array.from({ length: 8 }, (_, i) => ({ x: ox, y: oy, a: a0 + TAU_M * i / 8, t: XE_AIM, st: 'aim' })); mo.cd = 1.5 + XE_AIM; }
  else { mo.beams = [{ x: ox, y: oy, a: Math.atan2(p.y - 6 - oy, p.x - ox), t: XE_AIM, st: 'aim' }]; mo.cd = (ph === 1 ? 1.2 : 1.6) + XE_AIM; }
  say(ctx, 'xebeam', T2(ctx).xeBeam, false, 14);
}
/* vạch báo trước (tĩnh) trên đáy: bóng xúc tu sắp đập + đường ngắm tia hóa đá — lớp nền (drawGround) */
function drawWarnGround(g, mo, cx, cy) {
  drawSlamGround(g, mo, cx, cy);   /* vết nứt báo xúc tu / vệt quét / bóng đá rơi (kraken.js) */
  if (mo.beams) for (const b of mo.beams) { if (b.st !== 'aim') continue; g.strokeStyle = 'rgba(255,122,217,.55)'; g.lineWidth = 2; g.beginPath(); g.moveTo(Math.round(b.x - cx), Math.round(b.y + 8 - cy)); g.lineTo(Math.round(b.x + Math.cos(b.a) * XE_LEN - cx), Math.round(b.y + 8 + Math.sin(b.a) * XE_LEN - cy)); g.stroke(); }
}
const tentDrawable = krTent;
function beamDrawable(g, b, cx, cy) {   /* tia đang bắn: dải hồng nhạt ngắn (0,35 s, một lần) — hiệu ứng chính là sheet PixelLab 'petrify' dọc tia */
  return { y: b.y + 999, f: () => { g.save(); g.globalAlpha = Math.max(0, b.t / XE_FIRE) * 0.8; g.strokeStyle = '#ffd0f0'; g.lineWidth = 3; g.beginPath(); g.moveTo(Math.round(b.x - cx), Math.round(b.y - cy)); g.lineTo(Math.round(b.x + Math.cos(b.a) * XE_LEN - cx), Math.round(b.y + Math.sin(b.a) * XE_LEN - cy)); g.stroke(); g.restore(); } };
}
function drawKraken(g, mo, x, y) { drawKrakenNew(g, mo, x, y); }   /* đầu Kraken PixelLab 80×64 trồi từ khe vực (kraken.js) */
let XSHEET = null;
function drawXealist(g, mo, x, y) {   /* sheet nhân vật PixelLab của Xealist (chars.fixed.xealist) vẽ to ×2; pha 3: ánh hồng tĩnh */
  if (!XSHEET && ST.ctx && ST.ctx.charSheetOf) { try { XSHEET = ST.ctx.charSheetOf({ hero: 'xealist' }); } catch (e) { XSHEET = null; } }
  g.fillStyle = 'rgba(0,0,0,.3)'; g.beginPath(); g.ellipse(x, y + 1, 11, 3, 0, 0, TAU_M); g.fill();
  if (mo.flash > 0) g.filter = 'brightness(2.2)'; else if (mo.pink) g.filter = 'drop-shadow(0 0 3px #ff7ad9) saturate(1.3)';
  const row = [0, 2, 1, 3][mo.face ?? 0], fr = mo.moving ? Math.floor(mo.ft * 6) % 4 : 0;
  if (XSHEET) g.drawImage(XSHEET, fr * 16, row * 20, 16, 20, x - 16, y - 38, 32, 40);
  else { g.fillStyle = '#f2f2f2'; g.fillRect(x - 8, y - 34, 16, 30); }
  g.filter = 'none';
}

const AI = { eel: aiEel, swordfish: aiSwordfish, momeel: aiMomEel, squid: aiSquid, sawshark: aiSawshark, armorshark: aiArmorShark, angler: aiAngler, seasnake: aiSeaSnake, serpent: aiSerpent, kraken: aiKraken, shade: aiShade, xealist: aiXealist };

export const monsters = {
  id: 'monsters',
  onZoneEnter(ctx) {
    ST.ctx = ctx; ST.list = []; ST.chase = null; ST.hitQ = []; ST.cfg = ctx.noMonsters ? null : SP[ctx.S.zone.id] || null; if (ST.cfg && ST.cfg.noDark && ((ctx.story && ctx.story()) || {}).path === 'xealist') ST.cfg = null; ST.spawnT = 1.5; ST.respawnT = 0; ST.wasNight = night(ctx); ST.lastHit = null; ST.krDead = null; ST.chaseTent = null;
    ST.rq = [];
    if (ST.cfg) { for (let i = 0; i < Math.min(MAX_ON, want(ctx)); i++) spawnOne(ctx); spawnBoss(ctx); }
    if (ST.cfg && ST.cfg.road && ctx.S.map.monSpots) ctx.S.map.monSpots.forEach((sp, i) => spawnAt(ctx, i));   /* plan-28 */
    /* dân có đá Seismic đánh trả (villagers.js): đòn của dân — hạ quái thì người chơi được nửa kinh nghiệm */
    ctx.monsters = { list: () => ST.list, lastHitT: () => (ST.lastHit ? ST.lastHit.t : -99),   /* main.js: đang đánh → A không mở bảng/nói chuyện */ add: (c, x, y) => { if (!ST.cfg) ST.cfg = { key: '_spar', vi: '', en: '', day: 0, night: 0, mix: [] }; const mo = newMo(c, x, y); ST.list.push(mo); return mo; }, remove: mo => { ST.list = ST.list.filter(o => o !== mo); if (ST.chase === mo) ST.chase = null; },   /* spar.js: bạn tập (c.aiFn / c.drawFn / c.onDown) */ kill: mo => { if (ST.list.includes(mo)) killMonster(ctx, mo); },   /* petgun.js: tượng đá vỡ → đồ rơi + kinh nghiệm */ damage: (mo, dmg, src, xpMul = 0.5, kbPow = 80, noFx = false) => { if (!ST.list.includes(mo) || (mo.c.spar && !(ctx.sparFoe && ctx.sparFoe() === mo))) return; mo.hp -= dmg; mo.flash = 0.18; if (mo.loot && mo.hp > 0) dropLoot(ctx, mo); const d = Math.hypot(mo.x - src.x, mo.y - src.y) || 1; if (kbPow) mo.kb = { vx: (mo.x - src.x) / d * kbPow, vy: (mo.y - src.y) / d * kbPow, t: 0.12 }; if (ctx.pop) ctx.pop(mo.x, mo.y - 14, `-${dmg}`, '#8fd3ff'); if (ctx.vfx && !noFx) ctx.vfx('wood_chips', mo.x, mo.y + 2); if (mo.hp <= 0) killMonster(ctx, mo, xpMul); } };   /* plan-27: Rocky đánh → xpMul 1, lực hất (0 = không hất), tắt VFX gỗ vụn (Rocky có VFX riêng) */
    if (typeof window !== 'undefined') window.__monsters = {
      list: () => ST.list.map(m => ({ id: m.id, key: m.c.key, x: Math.round(m.x), y: Math.round(m.y), hp: m.hp, max: m.max, state: m.state, st2: m.st2 || null, open: !!m.open, goal: m.goal && m.goal.kind, loot: !!m.loot, boss: !!m.c.boss })),
      cfg: () => ST.cfg && { ...ST.cfg, nodes: undefined, mix: ST.cfg.mix ? ST.cfg.mix.map(c => c.key) : undefined, boss: ST.cfg.boss ? ST.cfg.boss.key : undefined },
      spawnNear: (n = 1) => { const p = ctx.S.player; for (let i = 0; i < n; i++) { if (!spawnOne(ctx)) break; const m = ST.list[ST.list.length - 1]; m.x = p.x + 30 + i * 10; m.y = p.y; } return ST.list.length; },
      spawnKind: (key, dx = 26, dy = 0) => { const c = UW[key] || Object.values(SP).find(s => s.key === key); if (!c) return null; const p = ctx.S.player, mo = newMo(c, p.x + dx, p.y + dy); if (c.boss) mo.home = { x: mo.x, y: mo.y }; ST.list.push(mo); return mo.id; },
      boss: () => { const b = ST.list.find(m => m.c.boss); return b ? { x: Math.round(b.x), y: Math.round(b.y), hp: b.hp, max: b.max, st2: b.st2 || null, open: !!b.open, key: b.c.key, ph: b.ph || null, slams: (b.slams || []).map(s => ({ x: Math.round(s.x), y: Math.round(s.y), st: s.st })), beams: (b.beams || []).map(s => ({ st: s.st, a: +s.a.toFixed(2) })), summoned: !!b.summoned, kr: b.kr ? { surf: +b.kr.surf.toFixed(2), sink: +b.kr.sink.toFixed(1), sweeps: b.kr.sweeps.map(w => w.st), rocks: b.kr.rocks.length, grab: b.kr.grab && { st: b.kr.grab.st, n: b.kr.grab.n }, anim: b.kr.anim && b.kr.anim.k } : null } : null; },
      lastHit: () => ST.lastHit, killed: () => ST.killed, rq: () => (ST.rq || []).map(q => ({ ...q })), spots: () => ST.list.filter(m => m.spot != null).map(m => ({ spot: m.spot, x: Math.round(m.x), y: Math.round(m.y), hp: m.hp, max: m.max, key: m.c.key })),
      killSpot: i => { const mo = ST.list.find(m => m.spot === i); if (mo) killMonster(ctx, mo); return !!mo; }, clear: () => { ST.list.forEach(release); ST.list = []; },
    };
  },
  onZoneLeave() { ST.list.forEach(release); ST.list = []; ST.chase = null; ST.hitQ = []; ST.cfg = null; },
  onClick(ctx, mt) {   /* click trúng quái → tự đuổi theo + chém */
    if (!ST.cfg || !mt) return false;
    for (const o of ST.list) if (o.c.ai === 'kraken') { if (krHeld(o)) { krMash(ctx, o); return true; } const k = krNearTent(o, ctx.S.player, mt); if (k && k.under) { ST.chase = o; ST.chaseTent = k.s; return true; } }   /* click xúc tu đang kẹt → đuổi chém xúc tu */
    ST.chaseTent = null;
    const mo = ST.list.find(o => Math.abs(mt.wx - o.x) < o.c.w * 0.7 + 3 && mt.wy > o.y - o.c.h - 8 && mt.wy < o.y + 5); if (!mo) return false;
    ST.chase = mo; if (ctx.hold && heldWeapon(ctx) !== bestWeapon(ctx)) ctx.hold(bestWeapon(ctx));   /* luôn dùng vũ khí tốt nhất */ return true;
  },
  update(dt, ctx) {
    const z = ST.cfg; if (!z || ctx.S.mode !== 'play') return;
    const p = ctx.S.player, t = T(ctx), uw = uwOn(ctx); if (ST.cd > 0) ST.cd -= dt;
    const nt = night(ctx); if (nt && !ST.wasNight && !z.mix && !z.road) ctx.toast(t.night(nm(ctx)), true); ST.wasNight = nt;
    if (ST.rq && ST.rq.length) for (const q of ST.rq.slice()) { q.t -= dt; if (q.t > 0) continue; const sp = ctx.S.map.monSpots && ctx.S.map.monSpots[q.spot];
      if (sp && Math.hypot(sp.x * 16 + 8 - p.x, sp.y * 16 + 12 - p.y) < ROAD_NEAR) { q.t = 1; q.waited = (q.waited || 0) + 1; continue; }   /* người chơi đứng gần chỗ đó → chờ thêm */
      ST.rq.splice(ST.rq.indexOf(q), 1); const mo = spawnAt(ctx, q.spot); if (mo && ctx.vfx) ctx.vfx('dirt_puff', mo.x, mo.y + 2); }
    if (ST.respawnT > 0) ST.respawnT -= dt;   /* vừa hạ 1 con → 20 s sau mới có con mới (không diệt xong lại đầy ngay) */
    ST.spawnT -= dt; if (ST.spawnT <= 0 && !(ST.respawnT > 0)) { ST.spawnT = 4; if (ST.list.length < Math.min(MAX_ON, want(ctx))) spawnOne(ctx); }
    for (let i = ST.hitQ.length - 1; i >= 0; i--) { const h = ST.hitQ[i]; h.t -= dt; if (h.t <= 0) { ST.hitQ.splice(i, 1); strike(ctx, h.mo, h.seg ?? -1, h.tent || null); } }
    if (ST.chase) {   /* đuổi theo quái đã click */
      const mo = ST.chase, ct = ST.chaseTent, tg = ct || mo; if (!ST.list.includes(mo) || (ctx.S.player.custom && !uw) || (ct && ct.st !== 'stuck')) { ST.chase = null; ST.chaseTent = null; }
      else if (dist(tg, p) <= REACH + (mo.c.boss && !ct ? 8 : 0)) { p.autoPath = null; if (ST.cd <= 0) { if (ctx.hold && heldWeapon(ctx) !== bestWeapon(ctx)) ctx.hold(bestWeapon(ctx));   /* luôn dùng vũ khí tốt nhất */ attack(ctx, mo, -1, ct); } }
      else if (!p.autoPath || (ST.chaseT = (ST.chaseT || 0) - dt) <= 0) { ST.chaseT = 0.3; p.autoPath = [{ x: tg.x, y: tg.y }]; }
    }
    const canHit = !(ctx.hero && ctx.hero.fainted) && (!p.custom || uw) && !(ctx.isDarkRevealed && ctx.isDarkRevealed());   /* plan-25 B4: lộ mặt → quái là 'người của ta'; plan-26: đang bơi dưới nước vẫn bị đánh */
    for (const mo of ST.list.slice()) {
      const c = mo.c;
      if (mo.statue || mo.stoneT > ctx.S.time) { if (mo.flash > 0) mo.flash -= dt; continue; }   /* petgun.js: hóa đá (tượng / đứng hình) → không AI, không gây sát thương; người chơi vẫn đánh được */
      mo.ft += dt; if (mo.flash > 0) mo.flash -= dt; if (mo.cd > 0) mo.cd -= dt; if (mo.loot) mo.lootT = (mo.lootT || 0) + dt;
      if (mo.kb) { mo.kb.t -= dt; if (walkable(ctx, mo.x + mo.kb.vx * dt, mo.y + mo.kb.vy * dt, c.fly, c.aqua)) { mo.x += mo.kb.vx * dt; mo.y += mo.kb.vy * dt; } else if (!mo.kb.hit && !c.fly && ctx.S.map.road && ctx.arenaImpact && Math.hypot(mo.kb.vx, mo.kb.vy) > 60) { mo.kb.hit = true; const l = Math.hypot(mo.kb.vx, mo.kb.vy); ctx.arenaImpact(mo.x + mo.kb.vx / l * 10, mo.y + mo.kb.vy / l * 6, 1, 'wall'); }   /* plan-28: quái / bạn tập bị đánh văng vào vách → vật viền đèo hư rồi đổ nát (road.js) */ if (mo.kb.t <= 0) mo.kb = null; continue; }
      const dp = dist(mo, p);
      if (c.ai === 'puffer') { aiPuffer(ctx, mo, dt, p, dp, canHit); continue; }
      if (c.ai === 'jelly') { aiJelly(ctx, mo, dt, p, dp, canHit); continue; }
      if (c.ai === 'crabking') { aiCrab(ctx, mo, dt, p, dp, canHit); continue; }
      const ai = AI[c.ai] || c.aiFn; if (ai) { ai(ctx, mo, dt, p, dp, canHit); continue; }   /* plan-26 B1 */
      if (mo.state === 'flee') {   /* ôm đồ bỏ chạy, ra xa rồi biến mất */
        const d = dp || 1; steer(ctx, mo, mo.x + (mo.x - p.x) / d * 40, mo.y + (mo.y - p.y) / d * 40, c.sp * 1.15, dt);
        mo.t -= dt; if (mo.t <= 0 && d > 160) { release(mo); ST.list = ST.list.filter(o => o !== mo); } continue;
      }
      if (canHit && (mo.angry || dp < AGGRO)) {   /* đánh người chơi */
        if (dp > 12) steer(ctx, mo, p.x, p.y, c.sp, dt);
        else if (mo.cd <= 0) { mo.cd = 1.3; if (ctx.hero) ctx.hero.hit(Math.round(c.dmg * hurtMul(ctx)));
          if (c.steal === 'carry' && getCarry(ctx).length && !mo.loot) { const it = removeCarry(ctx, getCarry(ctx).length - 1); grab(mo, { carry: it }, p.x, p.y - 22); mo.state = 'flee'; mo.t = 5; mo.angry = false; ctx.toast(t.stole(nm(ctx, c))); } }
        if (dp > 200) mo.angry = false; continue;
      }
      mo.t -= dt; if (!mo.goal || mo.t <= 0) { mo.t = 2 + Math.random() * 2; const g = pickTarget(ctx, mo); if (g) { mo.goal = g; if (!mo.warned && g.kind !== 'npc') { mo.warned = true; warn(ctx, g.kind === 'crop' ? t.crop(nm(ctx, c)) : g.kind === 'carry' ? t.carry(nm(ctx, c)) : t.node(nm(ctx, c))); } } else mo.goal = { kind: 'wander', x: mo.x + (Math.random() - 0.5) * 120, y: mo.y + (Math.random() - 0.5) * 120 }; }
      const g = mo.goal;
      if (g.kind === 'npc') {
        if (!ctx.S.npcs.includes(g.n) || g.n.hurtSit) { mo.goal = null; continue; }
        if (dist(mo, g.n) > 12) steer(ctx, mo, g.n.x, g.n.y, c.sp, dt);
        else if (mo.cd <= 0) { mo.cd = 1.5; if (ctx.villagers) ctx.villagers.hurt(g.n, Math.max(1, Math.round(c.dmg * 0.25)), mo); }   /* plan-23: dân trụ ~30 s trước 1 quái → kịp chạy tới cứu */
      } else if (g.kind === 'crop') {
        const x = g.tx * 16 + 8, y = g.ty * 16 + 12;
        if (!steer(ctx, mo, x, y, c.sp, dt)) { mo.eat = 0; continue; }
        mo.eat = (mo.eat || 0) + dt; if (mo.eat > 3 && ctx.farmSteal) { const crop = ctx.farmSteal(g.tx, g.ty); if (crop) { grab(mo, { item: crop }, g.tx * 16 + 8, g.ty * 16 + 10); mo.state = 'flee'; mo.t = 5; ctx.toast(t.stole(nm(ctx, c))); } mo.goal = null; }
      } else if (g.kind === 'carry') {
        if (!getCarry(ctx).length) { mo.goal = null; continue; } steer(ctx, mo, p.x, p.y, c.sp, dt); if (dp < AGGRO) mo.angry = true;
      } else if (g.kind === 'node') {
        const o = g.o; if (!ctx.S.map.objects.includes(o) || (o.claimed && o.claimed !== mo)) { mo.goal = null; continue; }
        if (steer(ctx, mo, o.x * 16 + 8, o.y * 16 + 22, c.sp, dt)) { o.claimed = mo; mo.claim = o; mo.t = 99; }
      } else if (g.kind === 'wreck') {   /* plan-23: đập công trình — mỗi 1,5 s 1 đòn */
        const o = g.o; if (o.ruined || !ctx.S.map.objects.includes(o)) { mo.goal = null; continue; }
        const cc = ctx.wreck.center(o); if (!steer(ctx, mo, cc.x, cc.y + 10, c.sp, dt) && dist(mo, { x: cc.x, y: cc.y + 10 }) > 14) continue;
        if (mo.cd <= 0) { mo.cd = 1.5; if (ctx.wreck.hit(o, mo)) mo.goal = null; }
      } else if (g.kind === 'trample') {   /* giẫm nát cây trồng (không lấy đồ) */
        const x = g.tx * 16 + 8, y = g.ty * 16 + 12; if (!steer(ctx, mo, x, y, c.sp, dt)) { mo.eat = 0; continue; }
        mo.eat = (mo.eat || 0) + dt; if (mo.eat > 2 && ctx.farmSteal) { if (ctx.farmSteal(g.tx, g.ty) && ctx.vfx) ctx.vfx('dirt_puff', x, y); mo.goal = null; mo.eat = 0; }
      } else if (g.kind === 'wander') { if (steer(ctx, mo, g.x, g.y, c.sp * 0.5, dt)) mo.goal = null; }
    }
  },
  near(ctx) {
    if (!ST.cfg || !ST.list.length) return null;
    const p = ctx.S.player, t = T(ctx), mt = ctx.mouseTile && ctx.mouseTile(); let best = null, bd = REACH;
    const kb = ST.list.find(o => o.c.ai === 'kraken'); if (kb && krHeld(kb)) return { label: krStrikeLabel(ctx).held(kb.kr.grab.n), x: p.x, y: p.y - 6, limit: 999, priority: 5, mouse: false, data: { grab: kb } };   /* bị xúc tu túm: E = vùng */
    if (ctx.holding && ctx.holding('petgun')) return null;   /* cầm súng: petgun.js lo quái (không hiện gợi ý cầm kiếm khi trỏ quái) */
    const lk = ctx.target && ctx.target.mon();   /* 2026-10-11 khóa mục tiêu (target.js): quái / xúc tu đã khóa → E đánh ĐÚNG nó (xa thì tự đuổi tới) */
    if (lk && ST.list.includes(lk.mo || lk.ref) && dist(lk.kind === 'tent' ? lk.ref : (lk.mo || lk.ref), p) <= REACH * 1.6 + ((lk.mo || lk.ref).c.boss ? 10 : 0)) {   /* trong tầm mới nhận; xa → main báo 'xa quá' (không tự đuổi) */
      const mo = lk.mo || lk.ref, c = mo.c, tent = lk.kind === 'tent' ? lk.ref : null, tg = tent || mo, hp = Math.max(0, Math.ceil(mo.hp));
      const label = tent ? krStrikeLabel(ctx).tent(hp, mo.max) : t.hit(nm(ctx, c), hp, mo.max);
      if (heldWeapon(ctx)) return { label: `🎯 ${label}`, x: tg.x, y: tg.y - 4, limit: 999, priority: 3.9, cursor: 'tool', mouse: false, isLock: true, data: { mo, seg: -1, tent, lock: true } };
      return { label: `${ctx.needHold(bestWeapon(ctx))} → ${ctx.target.nameOf(lk)}`, x: tg.x, y: tg.y - 4, limit: 999, priority: 3.9, need: true, urgent: true, needId: bestWeapon(ctx), cursor: 'tool', mouse: false, isLock: true, data: { need: true } };
    }
    for (const mo of ST.list) {
      const c = mo.c; let seg = -1, d = dist(mo, p) - (c.boss ? 8 : 0), tx = mo.x, ty = mo.y;
      if (mo.segs) mo.segs.forEach((sg, i) => { const ds = dist(sg, p); if (ds < d) { d = ds; seg = i; tx = sg.x; ty = sg.y; } });   /* rắn khổng lồ: đốt thân gần hơn đầu → nhắm vào thân */
      const under = mt && Math.abs(mt.wx - mo.x) < c.w * 0.7 + 3 && mt.wy > mo.y - c.h - 8 && mt.wy < mo.y + 5;
      if (under) { seg = -1; tx = mo.x; ty = mo.y; }
      let tent = null, tdd = 0; if (c.ai === 'kraken') { const k = krNearTent(mo, p, mt); if (k && (k.under || k.d < d)) { tent = k.s; tdd = k.under ? -1 : k.d; } }   /* xúc tu đang kẹt gần hơn đầu → nhắm xúc tu */
      const dd = tent ? tdd : under && d < REACH * 1.6 ? -1 : d; if (dd >= bd) continue; bd = dd;
      const label = seg >= 0 ? t.hitBody(nm(ctx, c), Math.max(0, Math.ceil(mo.hp)), mo.max) : t.hit(nm(ctx, c), Math.max(0, Math.ceil(mo.hp)), mo.max);
      best = heldWeapon(ctx) ? { label, x: under ? mt.wx : tx, y: under ? mt.wy : ty - 4, limit: REACH * 1.6 + (c.boss ? 10 : 0), priority: 0.8, cursor: 'tool', data: { mo, seg } }
        : { label: ctx.needHold(bestWeapon(ctx)), x: under ? mt.wx : mo.x, y: under ? mt.wy : mo.y - 4, limit: REACH * 1.6, priority: 0.8, need: true, needId: bestWeapon(ctx), urgent: !!(mo.angry && dist(mo, p) < 24), cursor: 'tool', data: { need: true } };   /* urgent: quái đang đánh sát → gợi ý cầm kiếm được thắng việc khác */
      if (tent) { best.x = tent.x; best.y = tent.y - 10; if (best.data.mo) { best.data.tent = tent; best.label = krStrikeLabel(ctx).tent(Math.max(0, Math.ceil(mo.hp)), mo.max); } }
    }
    return best;
  },
  interact(ctx, cand) { const d = cand && cand.data; if (d && d.grab) { krMash(ctx, d.grab); return; }
    if (d && d.lock && d.mo) { const tg = d.tent || d.mo, p = ctx.S.player; if (dist(tg, p) > REACH + (d.mo.c.boss && !d.tent ? 8 : 0)) { if (ctx.target.sayFar) ctx.target.sayFar(); return; } }   /* khóa mà còn xa → KHÔNG tự đuổi (anh chốt): chỉ báo xa quá */
    if (d && d.mo) attack(ctx, d.mo, d.seg ?? -1, d.tent || null); },
  drawables(ctx, cx, cy) {
    if (!ST.cfg) return [];
    const g = ctx.g; ST.cam = { cx, cy };
    const out = [];
    for (const mo of ST.list) {
      const a = ctx.uwHide ? ctx.uwHide(mo) : 1;   /* plan-26 B1: núp trong tảo → gần như vô hình */
      out.push({ y: mo.y, f: () => { if (a < 1) g.globalAlpha = a; const stn = mo.statue || mo.stoneT > ctx.S.time; if (stn) g.filter = STONE_FILTER;   /* petgun.js: tô đá chính ảnh PixelLab của quái */ if (mo.c.fly || mo.c.float || mo.c.boss) drawMonster(g, mo.c, mo, Math.round(mo.x - cx), Math.round(mo.y - cy)); else waterDraw(g, mo.x, mo.y, Math.round(mo.x - cx), Math.round(mo.y - cy), () => drawMonster(g, mo.c, mo, Math.round(mo.x - cx), Math.round(mo.y - cy)));   /* 2026-10-11 anh: quái lội nước như người chơi */ g.globalAlpha = 1; g.filter = 'none'; } });
      if (mo.segs) mo.segs.forEach((sg, i) => out.push({ y: sg.y - 0.1, f: () => drawSeg(g, mo, sg, i, Math.round(sg.x - cx), Math.round(sg.y - cy)) }));
      if (mo.slams) for (const s of mo.slams) out.push(tentDrawable(g, s, cx, cy));   /* plan-26 B2: xúc tu Kraken */
      if (mo.kr) krDrawables(g, mo, cx, cy, ctx, out);   /* quét ngang · đá rơi · xúc tu túm */
      if (mo.beams) for (const b of mo.beams) if (b.st === 'fire') out.push(beamDrawable(g, b, cx, cy));
    }
    if (ST.krDead) { const d = ST.krDead, now = ctx.S.time; out.push({ y: d.y, f: () => drawDead(g, cx, cy, now) }); }
    return out;
  },
  drawGround(g, ctx, cx, cy) {   /* plan-26 B2: vạch báo trước tĩnh trên đáy (bóng xúc tu, đường ngắm tia) */
    drawCrack(g, ctx.S.map, cx, cy);   /* khe vực Kraken (world.js m.krCrack) */
    if (!ST.cfg) return;
    for (const mo of ST.list) if (mo.slams || mo.beams || mo.kr) drawWarnGround(g, mo, cx, cy);
  },
  draw(g, ctx, cx, cy) {   /* plan-26 B1: hiệu ứng nổi trên mọi thứ — vòng điện của Lươn Mẹ */
    for (const mo of ST.list) if (mo.ringR > 0 && mo.gap != null) drawRing(g, mo, cx, cy);
  },
  drawUI(ug, ctx, cx, cy, scale) {   /* plan-26: thanh máu trùm canh cổng (khi đang giao chiến / ở gần) */
    const b = ST.list.find(m => m.c.boss); if (!b || ctx.S.mode !== 'play') return;
    const p = ctx.S.player; if (!b.angry && !b.st2 && !((b.c.ai === 'kraken' || b.c.ai === 'xealist') && b.warned && Math.hypot(b.x - p.x, b.y - p.y) < 420) && Math.hypot(b.x - p.x, b.y - p.y) > 150) return;
    const W = ug.canvas.width, H = ug.canvas.height, fs = Math.max(12, Math.round(scale * 3.6)), bw = Math.min(W * 0.5, 420), bh = Math.max(8, Math.round(scale * 2.6)), bx = Math.round((W - bw) / 2), by = H - Math.max(118, Math.round(scale * 40));
    ug.save(); ug.fillStyle = 'rgba(13,11,20,.78)'; ug.beginPath(); ug.roundRect(bx - 10, by - fs - 8, bw + 20, bh + fs + 16, 7); ug.fill();
    const ol = b.c.openLbl ? (vi(ctx) ? b.c.openLbl.vi : b.c.openLbl.en) : (vi(ctx) ? 'GIƠ CÀNG!' : 'CLAWS UP!');
    ug.font = `bold ${fs}px VT323, monospace`; ug.textAlign = 'center'; ug.textBaseline = 'middle'; ug.fillStyle = '#ffd45e'; ug.fillText(`${nm(ctx, b.c)}${b.open ? ' · ' + ol : ''}${b.ph ? ` · ${vi(ctx) ? 'Pha' : 'Phase'} ${b.ph}/3` : ''}`, W / 2, by - fs / 2 - 2);
    ug.fillStyle = '#352022'; ug.fillRect(bx, by, bw, bh); ug.fillStyle = b.open ? '#ff6b3a' : '#e84a3a'; ug.fillRect(bx, by, Math.max(1, Math.round(bw * Math.max(0, b.hp) / b.max)), bh);
    ug.restore();
  },
};

/* plan-26 B1: đốt thân Rắn Biển Khổng Lồ — ảnh PixelLab monsters.serpent_seg (cắt từ cổ rắn hướng bắc), nhỏ dần về đuôi; chưa có thì vẽ đốt tròn */
function drawSeg(g, mo, sg, i, x, y) {
  const k = 1 - i * 0.045, sh = ART.monsters && ART.monsters.serpent_seg, c = mo.c;
  g.fillStyle = 'rgba(0,0,0,.22)'; g.beginPath(); g.ellipse(x, y + 1, 6 * k, 2, 0, 0, 7); g.fill();
  if (mo.flash > 0) g.filter = 'brightness(2)'; else if (mo.glow > 0) g.filter = 'brightness(1.3)';
  if (sh) { const w = Math.round(sh.cw * k), h = Math.round(sh.ch * k); g.drawImage(sh.img, 0, 0, sh.cw, sh.ch, x - (w >> 1), y - h + 3, w, h); }
  else { const r = Math.round(6 * k); g.fillStyle = '#352022'; g.beginPath(); g.arc(x, y - r + 2, r + 1, 0, 7); g.fill(); g.fillStyle = c.c[0]; g.beginPath(); g.arc(x, y - r + 2, r, 0, 7); g.fill(); }
  g.filter = 'none';
}
/* vòng điện của Lươn Mẹ: tia điện PixelLab (u_shock) xếp quanh vòng, chừa KHE HỞ; lúc tích điện vòng nhỏ quanh nó, lúc xả nở ra */
function drawRing(g, mo, cx, cy) {
  const sh = ART.vfx && ART.vfx.u_shock, R = mo.ringR, n = Math.max(14, Math.round(R * 0.42)), charging = mo.st2 === 'charge';
  g.save(); g.globalAlpha = charging ? 0.7 : 0.95;
  g.strokeStyle = charging ? 'rgba(255,224,102,.55)' : 'rgba(255,232,120,.85)'; g.lineWidth = charging ? 1 : 1.5;
  for (let i = 0; i < n; i++) {
    const a = mo.gap + ME_GAPW + (TAU_M - 2 * ME_GAPW) * (i + 0.5) / n, x = mo.x + Math.cos(a) * R - cx, y = mo.y - 6 + Math.sin(a) * R * 0.72 - cy;
    if (sh) { const hi = sh.img.__hi ? 1 : 2, fr = (Math.floor(mo.ft * 14) + i * 3) % sh.n, w = sh.w * 0.85, h = sh.h * 0.85; g.drawImage(sh.img, fr * sh.w * hi, 0, sh.w * hi, sh.h * hi, Math.round(x - w / 2), Math.round(y - h / 2), w, h); }
    else { g.fillStyle = '#ffe066'; g.fillRect(Math.round(x) - 1, Math.round(y) - 1, 3, 3); }
  }
  g.beginPath(); g.ellipse(mo.x - cx, mo.y - 6 - cy, R, R * 0.72, 0, mo.gap + ME_GAPW, mo.gap + TAU_M - ME_GAPW); g.stroke();
  g.restore();
}
const TAU_M = Math.PI * 2;

/* ---- hình: sheet PixelLab (manifest monsters.<key>), chưa có thì vẽ code ---- */
function drawMonster(g, c, mo, x, y) {
  if (c.ai === 'kraken') return drawKraken(g, mo, x, y);   /* plan-26 B2 */
  if (c.ai === 'xealist') return drawXealist(g, mo, x, y);
  if (c.drawFn) return c.drawFn(g, mo, x, y);   /* spar.js */
  let sh = ART.monsters && ART.monsters[c.key], f = null, scale = 1;
  if (mo.st2 && c.ai === 'puffer' && ART.monsters && ART.monsters.puffer_puff) {   /* phồng gai: clip 'puff' (nam) — phồng dần · giữ khung gai nhất (to ra) · xẹp */
    sh = ART.monsters.puffer_puff; const n = sh.n;
    if (mo.st2 === 'wind') f = Math.min(3, Math.floor((1 - mo.t2 / PUFF_WIND) * 4)); else if (mo.st2 === 'puffed') { f = 3; scale = 1.3; } else f = Math.min(n - 1, 4 + Math.floor((1 - mo.t2 / PUFF_OFF) * (n - 4)));
  }
  if (mo.st2 && c.ai === 'crabking' && ART.monsters && ART.monsters.crabking_atk) {   /* trùm: giơ càng (khung 0→3, giữ 3–4) · đập xuống (5–6) */
    sh = ART.monsters.crabking_atk; const n = sh.n;
    f = mo.st2 === 'raise' ? (mo.t2 > CRAB_RAISE * 0.45 ? Math.min(3, Math.floor((1 - mo.t2 / CRAB_RAISE) / 0.55 * 4)) : 3 + (Math.floor(mo.ft * 6) % 2)) : Math.min(n - 1, 5 + Math.floor((1 - mo.t2 / CRAB_SLAM) * 2));
  }
  if (sh) {   /* sheet PixelLab: 4 hàng S W E N, 8 FPS; trúng đòn → sáng loá; bay/trôi → bóng tách khỏi thân */
    const cw = sh.cw, ch = sh.ch, fr = f != null ? f : Math.floor(mo.ft * FPS.creature) % sh.n, row = mo.face ?? 0, lift = (c.fly ? 6 + Math.round(Math.sin(mo.ft * 4) * 2) : c.float ? 5 + Math.round(Math.sin(mo.ft * 2) * 2) : 0) + Math.round(mo.lift || 0);
    if (mo.shake) x += Math.round(Math.sin(mo.ft * 45) * mo.shake);   /* plan-26 B1: rung nhẹ CHỈ lúc báo trước đòn (tích điện / nhắm húc / há miệng) */
    g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(x, y + 1, c.w * 0.45, 2.5, 0, 0, 7); g.fill();
    if (mo.lure) { g.save(); g.globalCompositeOperation = 'lighter'; const lx = Math.round(mo.lure.x - ST.cam.cx), ly = Math.round(mo.lure.y - ST.cam.cy), gr = g.createRadialGradient(lx, ly, 1, lx, ly, 12); gr.addColorStop(0, 'rgba(255,230,120,.55)'); gr.addColorStop(1, 'rgba(255,230,120,0)'); g.fillStyle = gr; g.fillRect(lx - 12, ly - 12, 24, 24); g.restore(); }   /* mồi Cá Đèn Lồng: quầng sáng tĩnh quanh đốm sáng của ảnh */
    if (mo.flash > 0) g.filter = 'brightness(2.6)'; else if (mo.zap > 0) g.filter = 'brightness(1.8) saturate(1.6)'; else if (mo.glow > 0) g.filter = 'brightness(1.45) saturate(1.5)'; else if (mo.open && c.boss && c.ai !== 'crabking') g.filter = 'brightness(1.15)';
    const dw = Math.round(cw * scale), dh = Math.round(ch * scale);
    g.drawImage(sh.img, fr * cw, row * ch, cw, ch, x - (dw >> 1), y - dh + 2 - lift, dw, dh); g.filter = 'none';
    const top = y - dh + 4 - lift, l = x - (c.w >> 1);
    if (mo.loot) drawLoot(g, mo, x, y - c.h - lift);
    if (mo.hp < mo.max && !c.boss) { g.fillStyle = '#352022'; g.fillRect(l - 1, top - 4, c.w + 2, 3); g.fillStyle = '#e84a3a'; g.fillRect(l, top - 3, Math.max(1, Math.round(c.w * mo.hp / mo.max)), 1); }
    return;
  }
  const [a, b, hi] = c.c, w = c.w, h = c.h, bob = Math.floor(mo.ft * 8) % 2, fl = mo.flash > 0;
  const px = (X, Y, W, H, col) => { g.fillStyle = fl ? '#ffffff' : col; g.fillRect(X, Y, W, H); };
  const lift = c.fly ? 6 + Math.round(Math.sin(mo.ft * 4) * 2) : c.float ? 5 + Math.round(Math.sin(mo.ft * 2) * 2) : 0;
  g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(x, y + 1, w * 0.45, 2.5, 0, 0, 7); g.fill();
  const top = y - h - lift + (c.shape === 'blob' ? bob : 0), l = x - (w >> 1);
  px(l - 1, top - 1, w + 2, h + 2, '#352022');
  px(l, top, w, h, a); px(l, top + h - 3, w, 3, b); px(l + 2, top + 1, w - 4, 2, hi);
  if (c.shape === 'crab') { px(l - 3, top + 2 + bob, 3, 3, b); px(l + w, top + 2 + bob, 3, 3, b); }
  if (c.shape === 'bird') { const f2 = bob ? -3 : 1; px(l - 4, top + 3 + f2, 4, 2, b); px(l + w, top + 3 + f2, 4, 2, b); px(mo.dir > 0 ? l + w - 1 : l - 2, top + 3, 3, 2, '#ffd45e'); }
  if (c.shape === 'beast') { px(l + 1, y - lift - 3, 2, 3 - bob, b); px(l + w - 3, y - lift - 3, 2, 2 + bob, b); px(mo.dir > 0 ? l + w - 2 : l - 2, top - 3, 4, 4, a); }
  if (c.shape === 'ghost') { for (let i = 0; i < w; i += 3) px(l + i, top + h, 2, 2 + ((i + bob) % 2), a); }
  const ex = mo.dir > 0 ? l + w - 6 : l + 2; px(ex, top + 3, 2, 2, '#fff6c8'); px(ex + 3, top + 3, 2, 2, '#fff6c8'); px(ex + (mo.dir > 0 ? 1 : 0), top + 4, 1, 1, '#352022'); px(ex + 3 + (mo.dir > 0 ? 1 : 0), top + 4, 1, 1, '#352022');
  if (mo.loot) drawLoot(g, mo, x, y - h - lift);
  if (mo.hp < mo.max && !c.boss) { g.fillStyle = '#352022'; g.fillRect(l - 1, top - 4 - (mo.loot ? 4 : 0), w + 2, 3); g.fillStyle = '#e84a3a'; g.fillRect(l, top - 3 - (mo.loot ? 4 : 0), Math.max(1, Math.round(w * mo.hp / mo.max)), 1); }
}
