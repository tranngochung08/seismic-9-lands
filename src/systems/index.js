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
import { trench } from './trench.js';
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
import { petgun } from './petgun.js';   /* 2026-10-11: Súng Hóa Đá (phe Xealist) — trước monsters để click khi cầm súng = bắn */
import { knock } from './knock.js';   /* 2026-10-11: phản ứng trúng đòn của người chơi (ctx.knockPlayer) */
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
import { sky } from './sky.js';   /* plan-31: Quần Đảo Mây + Rocky Phản Lực (always: bến khí cầu ở Làng, cất cánh X ở vùng đất) */
import { cloudshade } from './cloudshade.js';   /* 2026-10-13 anh: bóng mây trôi trên mặt đất ban ngày (vùng ngoài trời) */
import { dragon } from './dragon.js';   /* plan-29: 7 Ngọc Rồng → Rồng Thần, 5 điều ước, ngoại hình Chad, chiêu Rồng Thần Giáng (cuối danh sách: vẽ trên cùng, bắt clip động tác sau mọi hệ) */
export const SYSTEMS = [nations, seaRaft, swim, vehicles, animals, trees, market, rockyControl, districts, raidersLow, raidersMid, raidersHigh, crafting, gather, farm, pens, ecology, quests, seaDive, seaLife, raidersSea, photo, pet, rubble, storySea, storyLand, trench, hero, underwater, fortress, villagers, petgun, monsters, spar, road, arena, hacrocky, trongdong, guong, hoden, dongho, knock, wreck, drops, land, ponds, xealist, cloudshade, vfx, sky, dragon].filter(Boolean);
