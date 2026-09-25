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

export const SYSTEMS = [nations, seaRaft, swim, vehicles, animals, trees, market, rockyControl, districts, raidersLow, raidersMid, raidersHigh, crafting, gather, farm, pens, ecology, quests, seaDive, seaLife, raidersSea, photo, sumo, pet, storySea, storyLand, trench].filter(Boolean);
