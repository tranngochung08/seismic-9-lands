// systems/index.js — gameplay systems plugged into the core loop. Each module exports a system object (see API.md).
import { animals } from './animals.js';
import { nations } from './nations.js';
import { vehicles } from './vehicles.js';
import { trees } from './trees.js';
import { rockyControl } from './rocky.js';
import { market } from './market.js';
import { districts } from './districts.js';
import { raidersLow } from './raiders_low.js';
import { raidersMid } from './raiders_mid.js';
import { raidersHigh } from './raiders_high.js';
import { crafting } from './crafting.js';
import { gather } from './gather.js';
import { ecology } from './ecology.js';
import { quests } from './quests.js';
import { seaRaft } from './sea_raft.js';
import { seaDive } from './sea_dive.js';
import { seaLife } from './sea_life.js';
import { raidersSea } from './raiders_sea.js';
import { photo } from './photo.js';
import { sumo } from './sumo.js';
import { pet } from './pet.js';
import { rubble } from './blast.js';   /* 2026-10-12 tối: đào dọn đổ nát / bứng gốc cây do Rocky phá */
import { storySea } from './story_sea.js';
import { storyLand } from './story_land.js';
import { krstory } from './krstory.js';   /* 2026-10-15: bỏ Vực Kraken cốt truyện (trench.js → _bak/kstory) — lồng Lyron ở Hang Ổ Kraken */
import { swim } from './swim.js';
import { farm } from './farm.js';   /* plan-17 F02 (tác nhân A1) */
import { pens } from './pens.js';   /* plan-17 F03 (tác nhân A2) */
import { vfx } from './vfx.js';   /* plan-19: VFX sheet PixelLab */
import { hero } from './hero.js';   /* plan-21: máu / cấp / kinh nghiệm */
import { villagers } from './villagers.js';   /* plan-21: dân bị tấn công / chết / hồi sinh / Đài Tưởng Niệm */
import { monsters } from './monsters.js';   /* plan-21: quái theo vùng */
import { wreck } from './wreck.js';
import { drops } from './drops.js';
import { land } from './land.js';
import { ponds } from './ponds.js';
import { water } from './water.js';   /* plan-68: VFX nước + cá bơi vẽ code */
import { petgun } from './petgun.js';   /* 2026-10-11: Súng Hóa Đá (phe Xealist) — trước monsters để click khi cầm súng = bắn */
import { knock } from './knock.js';
import { ki } from './ki.js';   /* plan-34: Ki 7 viên ngọc + nhào lộn né / lướt tới đánh tự động; ctx.threat cho trùm khai báo đòn có báo trước */
import { aircombat } from './aircombat.js';   /* 2026-10-14: KHÔNG CHIẾN (sân trời không sàn) + trùm bay ĐUỔI THEO qua tầng / vùng — ĐẦU danh sách: vẽ bầu trời (drawGround) dưới mọi hệ; bọc ctx.knockPlayer lười trong update */   /* 2026-10-11: phản ứng trúng đòn của người chơi (ctx.knockPlayer) */
import { terrain } from './terrain.js';   /* 2026-10-14: gói kỹ năng THEO ĐỊA HÌNH cho trùm bay đuổi theo (biển, dưới nước, rừng, cát, đèo, làng) */
import { spar } from './spar.js';
import { road } from './road.js';   /* plan-28: đường đèo giữa các vùng (bạn tập chắn đường, cổng đèo) */
import { arena } from './arena.js';   /* 2026-10-11: Sàn Đấu Ngầm (vật thể + Rocky chờ ở mép sàn) */   /* 2026-10-11: bạn tập gọi qua Xealist */
import { xealist } from './xealist.js';   /* plan-25 B3: phe Xealist (nhiệm vụ đen, Bóng tối, hóa đá, hối cải) */   /* plan-25: đào ao nuôi cá */   /* plan-25: phe Noxx mua đất từ Leader */   /* plan-24: mọi vật phẩm rơi ra → nhặt → ném vào túi */   /* plan-23: quái phá làng ban đêm, dân tự sửa ban ngày */
import { fortress } from './fortress.js';   /* plan-26 B2: Pháo Đài Xealist (màn thắng trùm cuối / NPC Xealist phe Xealist) — sau underwater: bọc ctx.onBossDown */
import { underwater } from './underwater.js';   /* plan-26 B0: Heathcliff + viên thở + hơi thở + điểm lặn + tầng nước u1 (trước monsters: đặt ctx.uwGateOpen / onBossDown / stunPlayer) */

import { hacrocky } from './hacrocky.js';
import { trongdong } from './trongdong.js';   /* plan-30 trùm 2: Trống Đồng Thiên Lôi (khe nứt M2 → vùng rift2) — sau hacrocky (dùng ctx.hrBook) */   /* plan-30 trùm 1: Hắc Rocky (khe nứt Sàn Đấu Ngầm → vùng rift1) — sau arena (bọc ctx.petWait) và monsters/pet (bọc monsters.damage) */
import { guong } from './guong.js';
import { hoden } from './hoden.js';   /* plan-30 trùm 4: Hố Đen Địa Tâm (khe nứt M4 → vùng rift4) — sau guong */   /* plan-30 trùm 3: Gương Địa Chấn (khe nứt M6 → vùng rift3) — sau trongdong */
import { dongho } from './dongho.js';   /* plan-30 trùm 5: Đồng Hồ Đứt Dây (khe nứt M7 → vùng rift5) — sau hoden */
import { bakunawa } from './bakunawa.js';   /* plan-30 trùm 6: Bakunawa Nuốt Nhật (Cổng Trời M9 → vùng sky_bakunawa) — sau dongho */
import { lyronFinale } from './lyron_finale.js';   /* plan-33 mục 9: PLOT TWIST LYRON — sau bakunawa (bọc ctx.enterBakunawa), móc ctx.lyronFinale.start */
import { sky } from './sky.js';   /* plan-31: Quần Đảo Mây + Rocky Phản Lực (always: bến khí cầu ở Làng, cất cánh X ở vùng đất) */
import { cloudshade } from './cloudshade.js';
import { worldmosaic } from './worldmosaic.js';   /* 2026-10-14 plan-33 mục 13: chụp vùng đang chơi cho khảm thế giới (vẽ thì sky.js gọi drawMosaic) */   /* 2026-10-13 anh: bóng mây trôi trên mặt đất ban ngày (vùng ngoài trời) */
import { linhthu } from './linhthu.js';   /* plan-39: linh thú — mỗi vùng 1 loài, bắt bằng đánh đuối + cho ăn, 1 con đi cùng (trước monsters) */
import { rockycore } from './rockycore.js';   /* plan-38: Rocky ăn mảnh lõi trùm → 6 chiêu (mang 2), tự dùng + VFX va chạm (dừng hình, đấu chưởng, Hợp Kích) — sau pet / ki / các trùm (bọc hero.hit, monsters.damage) */
import { stats } from './stats.js';   /* plan-44 P2: thống kê chơi (giây chơi, số lần ngất, quãng đường) — save.stats */
import { dragon } from './dragon.js';   /* plan-29: 7 Ngọc Rồng → Rồng Thần, 5 điều ước, ngoại hình Chad, chiêu Rồng Thần Giáng (cuối danh sách: vẽ trên cùng, bắt clip động tác sau mọi hệ) */
import { diff } from './diff.js';
import { hopthe } from './hopthe.js';   /* plan-50: Hợp Thể người + Rocky (always) */   /* plan-44 C2: Độ khó Dễ / Thường (always) — dấu 'Dễ' cạnh thanh máu trùm + gợi ý sau 2 lần thua liền */
import { odo } from './odo.js';   /* plan-57: Ở Dơ — kẻ rình hút 20 % KN khi người chơi hạ quái (always; chỉ hiện ở vùng có quái, cấp ≥ 5) */
import { chanthu } from './chanthu.js';   /* plan-58 C.2: con khởi đầu + Chấn Thú hoang + Ấn Thu (always) */
import { linhduel } from './linhduel.js';   /* plan-48 Đ1: đấu linh thú tại chỗ (always) — cuối danh sách: HUD trên cùng */
import { shadow } from './shadow.js';   /* plan-66: bóng dưới chân người chơi + dân (lớp nền); hệ khác gọi shadowAt trong hàm vẽ */
export const SYSTEMS = [aircombat, terrain, nations, seaRaft, swim, vehicles, animals, trees, market, rockyControl, districts, raidersLow, raidersMid, raidersHigh, crafting, gather, farm, pens, ecology, quests, seaDive, seaLife, raidersSea, photo, pet, hopthe, rubble, storySea, storyLand, krstory, hero, underwater, fortress, villagers, petgun, linhthu, monsters, odo, spar, road, arena, hacrocky, trongdong, guong, hoden, dongho, bakunawa, lyronFinale, knock, ki, wreck, drops, land, ponds, water, xealist, cloudshade, worldmosaic, rockycore, vfx, sky, stats, dragon, diff, chanthu, linhduel, shadow].filter(Boolean);
