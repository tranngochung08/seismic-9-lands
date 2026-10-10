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
import { xealist } from './xealist.js';   /* plan-25 B3: phe Xealist (nhiệm vụ đen, Bóng tối, hóa đá, hối cải) */   /* plan-25: đào ao nuôi cá */   /* plan-25: phe Noxx mua đất từ Leader */   /* plan-24: mọi vật phẩm rơi ra → nhặt → ném vào túi */   /* plan-23: quái phá làng ban đêm, dân tự sửa ban ngày */
import { underwater } from './underwater.js';   /* plan-26 B0: Heathcliff + viên thở + hơi thở + điểm lặn + tầng nước u1 (trước monsters: đặt ctx.uwGateOpen / onBossDown / stunPlayer) */

export const SYSTEMS = [nations, seaRaft, swim, vehicles, animals, trees, market, rockyControl, districts, raidersLow, raidersMid, raidersHigh, crafting, gather, farm, pens, ecology, quests, seaDive, seaLife, raidersSea, photo, sumo, pet, storySea, storyLand, trench, hero, underwater, villagers, monsters, wreck, drops, land, ponds, xealist, vfx].filter(Boolean);
