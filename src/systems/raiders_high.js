// raiders_high.js — legendary raiders of the high lands (see systems/API.md)
//   m7  Fire drake / Hỏa Long — flies out of a lava band, breathes fire cones on a district.
//                               Repel: throw Seismic stones (4 hits) or ram it with Rocky (2 hits).
//   m8  Yeti            — stomps down from the ridge, punches the fence, once per raid it drops
//                               an avalanche on three wall pieces. Repel: offer a fish, or wrestle Rocky (3).
//   m9  Bakunawa        — the moon-eating serpent coils around a yard and swallows its lights.
//                               Repel: the Leaders' ritual drum (6 beats in rhythm) or Rocky (5).
// One raid at a time, 25 s of warning first, damage capped at 40% of a district.
import { mkCanvas, HOOK } from '../gfx.js';
import { faceOfV, dirFrame } from './animals.js';

// ---------------------------------------------------------------- strings
const STR = {
  en: {
    drake: 'Fire drake', yeti: 'Yeti', naga: 'Bakunawa',
    warn: { drake: (n, s) => `🔥 Fire drake stirs in the lava — ${n}'s district, ${s}s`, yeti: (n, s) => `❄ Something huge comes down the ridge — ${n}'s district, ${s}s`, naga: (n, s) => `🌑 The glyphs flicker — Bakunawa hunts ${n}'s lights, ${s}s` },
    cry: { drake: 'A roar rolls across the ash…', yeti: 'The snow hisses on the slope…', naga: 'The core hums a low, hungry note…' },
    npc: { drake: n => `${n}: "Get everyone away from the walls!"`, yeti: n => `${n}: "Hide the food — and find a fish!"`, naga: n => `${n}: "It wants our light. Wake the drum!"` },
    hit: { drake: n => `The fire drake dives on ${n}!`, yeti: n => `The Yeti crashes into ${n}'s yard!`, naga: n => `Bakunawa coils around ${n}'s yard!` },
    stone: 'Throw stone (🪨1)', noStone: 'No stones left — mine rocks with a pickaxe or sell animals at the trader 🪨', stoneHit: (k, n) => `Hit! ${k}/${n}`,
    fish: 'Offer fish (🐟)', fishNeed: 'The Yeti sniffs the air — it wants a fish 🐟 (fish at a shore with the rod)', fishOk: 'The Yeti takes the fish, grunts, and lumbers off.',
    drum: 'Beat the ritual drum', leaders: k => `The Leaders must know you (${k}/15)`,
    drumTitle: 'Ritual drum', drumHint: 'E / Space · keep the beat', drumMiss: 'The beat slipped — start again', drumWin: 'The drum answers — Bakunawa gives the light back!',
    repel: m => `${m} is driven off!`, gone: m => `${m} tires of the raid and leaves.`,
    take: { drake: 'Take fire scale (🪨4)', yeti: 'Take yeti fur (🪨5)', naga: 'Take great crystal (🪨8)' },
    got: { drake: 'Fire scale! +4 🪨', yeti: 'Yeti fur! +5 🪨', naga: 'Great crystal! +8 🪨' },
    rocky: 'Rocky answers the raid!'
  },
  vi: {
    drake: 'Hỏa Long', yeti: 'Người Tuyết', naga: 'Bakunawa',
    warn: { drake: (n, s) => `🔥 Hỏa Long cựa mình trong dung nham — khu ${n}, ${s}s`, yeti: (n, s) => `❄ Có thứ gì to lớn đang xuống núi — khu ${n}, ${s}s`, naga: (n, s) => `🌑 Ký tự lõi nhấp nháy — Bakunawa săn đèn khu ${n}, ${s}s` },
    cry: { drake: 'Tiếng gầm vọng qua tro tàn…', yeti: 'Tuyết rít trên sườn núi…', naga: 'Lõi ngân lên một nốt trầm đói khát…' },
    npc: { drake: n => `${n}: "Tránh xa tường ra!"`, yeti: n => `${n}: "Giấu đồ ăn đi — và kiếm một con cá!"`, naga: n => `${n}: "Nó muốn ánh sáng của ta. Đánh trống lên!"` },
    hit: { drake: n => `Hỏa Long lao xuống khu ${n}!`, yeti: n => `Người Tuyết đạp vào khu ${n}!`, naga: n => `Bakunawa cuộn quanh khu ${n}!` },
    stone: 'Ném đá (🪨1)', noStone: 'Hết đá rồi — đập đá bằng cuốc hoặc bán thú ở Thương nhân 🪨', stoneHit: (k, n) => `Trúng! ${k}/${n}`,
    fish: 'Cho cá (🐟)', fishNeed: 'Người Tuyết hít hà — nó muốn một con cá 🐟 (câu ở bờ nước bằng cần câu)', fishOk: 'Người Tuyết cầm cá, gầm gừ rồi bỏ đi.',
    drum: 'Gõ trống nghi lễ', leaders: k => `Các Leader phải biết bạn (${k}/15)`,
    drumTitle: 'Trống nghi lễ', drumHint: 'E / Space · giữ nhịp', drumMiss: 'Lỡ nhịp — gõ lại từ đầu', drumWin: 'Trống vang lên — Bakunawa trả lại ánh sáng!',
    repel: m => `${m} bị đánh lui!`, gone: m => `${m} chán rồi bỏ đi.`,
    take: { drake: 'Nhặt vảy lửa (🪨4)', yeti: 'Nhặt lông Yeti (🪨5)', naga: 'Nhặt đại tinh thể (🪨8)' },
    got: { drake: 'Vảy lửa! +4 🪨', yeti: 'Lông Yeti! +5 🪨', naga: 'Đại tinh thể! +8 🪨' },
    rocky: 'Rocky nhập cuộc!'
  }
};
const L = ctx => STR[ctx.lang() === 'vi' ? 'vi' : 'en'];

// ---------------------------------------------------------------- sprites (built once, at module load)
const px = (g, x, y, c, w = 1, h = 1) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
const OUT = '#1c1a24';
function tri(g, c, ax, ay, bx, by, cx, cy) {                  // scanline triangle — wings and fins
  const y0 = Math.floor(Math.min(ay, by, cy)), y1 = Math.ceil(Math.max(ay, by, cy));
  g.fillStyle = c;
  for (let y = y0; y <= y1; y++) {
    const xs = [], e = (x1, yy1, x2, yy2) => { if ((y >= yy1 && y < yy2) || (y >= yy2 && y < yy1)) xs.push(x1 + (x2 - x1) * (y - yy1) / (yy2 - yy1)); };
    e(ax, ay, bx, by); e(bx, by, cx, cy); e(cx, cy, ax, ay);
    if (xs.length < 2) continue;
    const a = Math.round(Math.min.apply(null, xs)), b = Math.round(Math.max.apply(null, xs));
    g.fillRect(a, y, Math.max(1, b - a), 1);
  }
}
function line(g, c, x0, y0, x1, y1) {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) | 0; g.fillStyle = c;
  for (let i = 0; i <= n; i++) g.fillRect(Math.round(x0 + (x1 - x0) * i / n), Math.round(y0 + (y1 - y0) * i / n), 1, 1);
}
function flip(src) { const c = mkCanvas(src.width, src.height), g = c.getContext('2d'); g.translate(src.width, 0); g.scale(-1, 1); g.drawImage(src, 0, 0); return c; }
function build(w, h, fn) { return [0, 1].map(f => { const c = mkCanvas(w, h); fn(c.getContext('2d'), f); return [c, flip(c)]; }); } // [frame][0=right,1=left]

function drakeArt(g, f) {                                    // 32×24 — red-orange dragon, wings up / down
  const O2 = '#2a0e12', R = '#c3301c', RD = '#8e2013', OR = '#f0722a', Y = '#ffbe5c', E = '#ffe9a8';
  const M = f ? '#e2612f' : '#f2803c', MD = '#7d1a10';
  if (f) { tri(g, O2, 16, 13, 2, 23, 15, 23.5); tri(g, M, 15.5, 14, 4.5, 21.6, 14, 21.8); line(g, MD, 15, 14, 6, 21); } // wing sweeping down
  px(g, 2, 14, O2, 9, 5); px(g, 3, 15, RD, 8, 3); px(g, 4, 16, R, 6, 1);           // tail
  px(g, 0, 11, O2, 4, 5); px(g, 1, 12, OR, 2, 3);                                  // tail fin
  px(g, 10, 17, O2, 4, 6); px(g, 11, 18, RD, 2, 4); px(g, 9, 22, O2, 4, 2); px(g, 9, 23, Y, 3, 1);   // hind leg + claws
  px(g, 7, 10, O2, 16, 9); px(g, 8, 11, R, 14, 7); px(g, 9, 15, OR, 12, 3); px(g, 9, 10, RD, 11, 1); // body + belly
  px(g, 18, 16, O2, 4, 6); px(g, 19, 17, RD, 2, 4); px(g, 17, 21, O2, 4, 2); px(g, 17, 22, Y, 3, 1); // front leg + claws
  px(g, 19, 4, O2, 7, 11); px(g, 20, 5, R, 5, 9); px(g, 20, 4, RD, 4, 1);          // neck
  px(g, 22, 1, O2, 10, 8); px(g, 23, 2, R, 8, 5);                                  // head
  px(g, 26, 7, O2, 6, 3); px(g, 27, 7, Y, 5, 2); px(g, 31, 4, Y, 1, 2);            // open jaw + nostril
  px(g, 27, 2, E, 2, 2); px(g, 28, 2, O2, 1, 1);                                   // eye
  px(g, 20, 0, O2, 2, 4); px(g, 24, 0, O2, 2, 2);                                  // horns
  for (let i = 0; i < 4; i++) px(g, 11 + i * 3, 9, O2, 2, 1);                       // back ridge
  if (!f) {                                                                         // wing up
    tri(g, O2, 18, 12, 1, 1, 15, 0); tri(g, M, 16.8, 11, 3.4, 2.8, 13.6, 1.8);
    line(g, MD, 17, 11, 3, 3); line(g, MD, 17, 11, 8, 1); line(g, MD, 17, 11, 13, 1);
  }
}
function yetiArt(g, f) {                                     // 32×40 — shaggy white fur, dark face, big fists
  const O2 = '#20242e', W = '#f3f7fc', S = '#d8e4f0', D = '#b3c6da', F = '#2b2b38', E = '#8fe3ff';
  const la = f ? 12 : 16, ra = f ? 16 : 12;                   // arms swing between frames
  px(g, 7, 35, O2, 9, 5); px(g, 8, 36, F, 7, 3);              // feet
  px(g, 16, 35, O2, 9, 5); px(g, 17, 36, F, 7, 3);
  px(g, 8, 26, O2, 7, 10); px(g, 9, 27, W, 5, 8); px(g, 9, 32, S, 5, 3);   // legs
  px(g, 17, 26, O2, 7, 10); px(g, 18, 27, W, 5, 8); px(g, 18, 32, S, 5, 3);
  px(g, 22, ra, O2, 9, 12); px(g, 23, ra + 1, S, 7, 10); px(g, 24, ra + 3, D, 5, 6);   // far arm (behind the body)
  px(g, 21, ra + 11, O2, 10, 9); px(g, 22, ra + 12, D, 8, 7);
  g.clearRect(30, ra + 11, 1, 1); g.clearRect(30, ra + 19, 1, 1);           // rounded knuckles
  for (let j = 0; j < 18; j++) {                                            // torso: broad shoulders tapering to the waist
    const w = Math.round(23 - 7 * (j / 17)), x = Math.round(16 - w / 2);
    px(g, x, 11 + j, O2, w, 1);
    if (j > 0 && j < 17) px(g, x + 1, 11 + j, j < 9 ? W : S, w - 2, 1);
  }
  for (let j = 0; j < 9; j++) px(g, 11 + (j > 5 ? 1 : 0), 18 + j, j > 5 ? D : S, j > 5 ? 9 : 11, 1);  // chest, softened
  px(g, 12, 26, D, 8, 1);
  for (let j = 12; j < 28; j += 3) {                                        // fur tufts along the sides
    const w = Math.round(23 - 7 * ((j - 11) / 17)), x = Math.round(16 - w / 2);
    px(g, x - 1, j, W, 1, 2); px(g, x + w, j, W, 1, 2);
  }
  px(g, 1, la, O2, 9, 12); px(g, 2, la + 1, W, 7, 10); px(g, 3, la + 3, S, 5, 6);   // near arm
  px(g, 0, la + 11, O2, 10, 9); px(g, 1, la + 12, S, 8, 7); px(g, 2, la + 14, D, 6, 3); // fist
  g.clearRect(0, la + 11, 1, 1); g.clearRect(0, la + 19, 1, 1);             // rounded knuckles
  px(g, 8, 1, O2, 17, 13); px(g, 9, 2, W, 15, 11); px(g, 9, 11, S, 15, 2);  // head
  px(g, 11, 4, F, 11, 8); px(g, 12, 3, O2, 9, 1); px(g, 10, 5, F, 1, 5); px(g, 22, 5, F, 1, 5);
  px(g, 13, 6, E, 3, 2); px(g, 18, 6, E, 3, 2); px(g, 14, 7, '#ffffff', 1, 1); px(g, 19, 7, '#ffffff', 1, 1);
  px(g, 13, 9, '#e8eef6', 7, 2); px(g, 14, 9, F, 1, 1); px(g, 16, 10, F, 1, 1); px(g, 18, 9, F, 1, 1); // fanged grin
  px(g, 8, 0, W, 3, 2); px(g, 12, 0, W, 3, 1); px(g, 17, 0, W, 3, 1); px(g, 22, 0, W, 3, 2);           // fur crown
  px(g, 7, 4, W, 2, 3); px(g, 24, 4, W, 2, 3); px(g, 7, 9, W, 2, 3); px(g, 24, 9, W, 2, 3);            // cheek fur
}
function nagaHeadArt(g, f) {                                  // 24×20 — blue-purple serpent head with a glowing rim
  const RIM = '#9a6bff', O2 = '#1b0f38', B = '#4b2c96', B2 = '#6a3fd0', G = f ? '#9df3ff' : '#6fdcff', P = '#d6b4ff';
  px(g, 7, 11, RIM, 17, 9); px(g, 8, 12, O2, 15, 7); px(g, 9, 13, B, 13, 5);        // lower jaw
  px(g, 2, 1, RIM, 21, 14); px(g, 3, 2, O2, 19, 12); px(g, 4, 3, B2, 17, 10); px(g, 6, 5, B, 12, 6); // skull
  px(g, 19, 4, RIM, 5, 10); px(g, 20, 5, O2, 4, 8); px(g, 21, 6, B2, 3, 6);         // snout
  px(g, 11, 11, '#eaf6ff', 1, 2); px(g, 14, 11, '#eaf6ff', 1, 2); px(g, 18, 11, '#eaf6ff', 1, 2);
  px(g, 14, 3, G, 5, 5); px(g, 15, 4, '#ffffff', 2, 2);                             // glowing eye
  px(g, 1, 0, RIM, 4, 5); px(g, 5, 0, RIM, 4, 4); px(g, 0, 5, RIM, 4, 4); px(g, 1, 6, P, 2, 2);
  px(g, 8, 3, G, 2, 1); px(g, 10, 2, P, 1, 1); px(g, 11, 8, G, 3, 1);               // runes
}
function nagaSegArt(g, f) {                                   // 14×14 — rune segment, bright rim so it reads on dark ground
  const RIM = '#9a6bff', O2 = '#1b0f38', B = '#4b2c96', B2 = '#6a3fd0', G = f ? '#9df3ff' : '#5ec6ef';
  px(g, 4, 0, RIM, 6, 2); px(g, 4, 12, RIM, 6, 2);                                  // spines
  px(g, 0, 0, RIM, 14, 14); px(g, 1, 1, O2, 12, 12); px(g, 2, 2, B2, 10, 10); px(g, 3, 4, B, 8, 7);
  px(g, 6, 4, G, 2, 6); px(g, 4, 6, G, 6, 2); px(g, 3, 3, '#a98cff', 1, 1); px(g, 10, 10, '#a98cff', 1, 1);
}
function scaleArt(g, f) {                                     // 10×8 fire scale — a diamond plate
  const O2 = '#2a0e12';
  for (let y = 0; y < 8; y++) { const w = Math.round(9 - Math.abs(y - 3.5) * 2.2), x = Math.round(5 - w / 2); px(g, x, y, O2, w, 1); }
  for (let y = 1; y < 7; y++) { const w = Math.round(7 - Math.abs(y - 3.5) * 1.8), x = Math.round(5 - w / 2); px(g, x, y, y < 4 ? '#ff9a3c' : '#e8541f', w, 1); }
  px(g, 4, 1, '#ffe08a', 2, 1); px(g, 3, 2, '#ffe08a', 1, 1);
  if (f) { px(g, 0, 3, '#ffd45e', 1, 1); px(g, 9, 4, '#ffd45e', 1, 1); }
}
function furArt(g, f) {                                       // 10×8 yeti fur — a shaggy tuft
  const O2 = '#20242e';
  for (let y = 0; y < 8; y++) { const w = y < 2 ? 4 + y * 2 : 8 - Math.max(0, y - 5) * 2, x = Math.round(5 - w / 2); px(g, x, y, O2, w, 1); }
  px(g, 2, 2, '#f3f7fc', 6, 3); px(g, 3, 5, '#d8e4f0', 4, 1);
  px(g, 1, 1 + (f ? 1 : 0), '#f3f7fc', 1, 2); px(g, 8, 2 - (f ? 1 : 0), '#f3f7fc', 1, 2);
}
function crystalArt(g, f) {                                   // 10×8 great crystal — a pointed shard
  const O2 = '#1b0f38';
  for (let y = 0; y < 8; y++) { const w = y < 3 ? 2 + y * 2 : 7 - Math.max(0, y - 5) * 2, x = Math.round(5 - w / 2); px(g, x, y, O2, w, 1); }
  px(g, 4, 1, '#b08cff', 2, 6); px(g, 3, 3, '#8a5cff', 1, 3); px(g, 6, 3, '#6a3fd0', 1, 3); px(g, 4, 1, '#e6d8ff', 1, 4);
  if (f) { px(g, 0, 3, '#d9c8ff', 1, 1); px(g, 9, 5, '#d9c8ff', 1, 1); }
}
const SPR = {
  drake: HOOK.creature('drake', build(32, 24, drakeArt)), yeti: HOOK.creature('yeti', build(32, 40, yetiArt)),
  head: HOOK.creature('nagaHead', build(24, 20, nagaHeadArt)), seg: HOOK.creature('nagaSeg', build(14, 14, nagaSegArt)),
  itemDrake: HOOK.creature('item_drake', build(10, 8, scaleArt)), itemYeti: HOOK.creature('item_yeti', build(10, 8, furArt)), itemNaga: HOOK.creature('item_naga', build(10, 8, crystalArt))
};
const SIZE = { drake: [32, 24], yeti: [32, 40] };

// ---------------------------------------------------------------- tuning
const ZKIND = { m7: 'drake', m8: 'yeti', m9: 'naga' };
const HP = { drake: 4, yeti: 3, naga: 5 };
const ROCKY_DMG = { drake: 2, yeti: 1, naga: 1 };
const LOOT_STONE = { drake: 4, yeti: 5, naga: 8 };
const LOOT_FLAG = { drake: 'fireScale', yeti: 'yetiFur', naga: 'greatCrystal' };
const DRAKE_PIECES = ['house', 'light', 'flag', 'wall'];
const YETI_PIECES = ['corner', 'wall', 'house'];
const BEATS = 6, BEAT_WINDOW = 0.4, RITUAL_IDLE = 3, RITUAL_MAX = 14;
const LEADERS_NEEDED = 8, LEADERS_TOTAL = 15;
const fast = () => !!(typeof window !== 'undefined' && window.__raidHighFast);
const WARN_T = () => fast() ? 2 : 25;
const RAID_T = () => fast() ? 12 : 100;
const FIRST_T = () => fast() ? 5 : 120 + Math.random() * 60;
const NEXT_T = () => fast() ? 40 : 480 + Math.random() * 240;

// ---------------------------------------------------------------- module state
let raid = null;      // the running raid, or null
let loot = null;      // { kind, x, y, t }
let ritual = null;    // the drum mini-game
let timer = 0;        // seconds to the next raid
let fx = [];          // particles
let burns = [];       // small fires left on damaged pieces
let shots = [];       // thrown stones in flight
let cue = 0;          // warning-cue spawn accumulator

const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const rnd = (a, b) => a + Math.random() * (b - a);
function sysR(ctx) {                                          // shared with the other raider modules — merge, never replace
  const sv = ctx.S.save; sv.sys = sv.sys || {};
  const r = (sv.sys.raiders = sv.sys.raiders || {});
  r.highRaids = r.highRaids || 0; r.highRepelled = r.highRepelled || 0;
  return r;
}
const pieceD = (ctx, o) => ctx.O[o.type] || ctx.O[o.orig] || { fw: 1, fh: 1, w: 16, h: 16 };
function pieceC(ctx, o) { const d = pieceD(ctx, o); return { x: (o.x + d.fw / 2) * ctx.TS, y: (o.y + d.fh) * ctx.TS - Math.min(10, d.h / 2) }; }
function nationName(ctx, key) { const n = (ctx.S.nations || []).find(g => g.key === key); return n ? `${n.flag} ${n.name}` : key; }
function statueDist(ctx) {
  const p = ctx.S.player; let d = 1e9;
  for (const o of ctx.S.map.objects) { if (!o.rocky) continue; const dd = pieceD(ctx, o); d = Math.min(d, Math.hypot((o.x + dd.fw / 2) * 16 - p.x, (o.y + dd.fh) * 16 - p.y)); }
  return d;
}
// our prompt takes priority over NPCs/objects, except right at the foot of a Rocky statue
// (Rocky is one of the repel paths — piloting it must never be blocked) or while already piloting one.
function claimOK(ctx, x, y) {
  if (ctx.isRocky()) return false;
  const p = ctx.S.player, dm = Math.hypot(x - p.x, y - p.y), ds = statueDist(ctx);
  return !(ds < 26 && ds < dm);
}
function metLeaders(ctx) { const met = ctx.metIds(); return ctx.S.npcs.filter(n => ctx.isLeader(n.m) && met.has(n.m.id)).length; }

// ---------------------------------------------------------------- particles
function part(x, y, vx, vy, t, c, s = 1, g = 0, drag = 1) { fx.push({ x, y, vx, vy, t, life: t, c, s, g, drag }); }
function burst(ctx, o, kind) {
  const c = pieceC(ctx, o);
  for (let i = 0; i < 12; i++) {
    const a = Math.random() * 6.283, sp = rnd(18, 62);
    if (kind === 'fire') part(c.x, c.y, Math.cos(a) * sp, Math.sin(a) * sp - 30, rnd(.4, .9), ['#ffd45e', '#ff8c1a', '#e8541f'][i % 3], Math.random() < .5 ? 2 : 1, 60, .95);
    else if (kind === 'snow') part(c.x, c.y, Math.cos(a) * sp, Math.sin(a) * sp - 40, rnd(.5, 1.1), ['#ffffff', '#dceaf7', '#b8cde0'][i % 3], Math.random() < .5 ? 2 : 1, 90, .94);
    else part(c.x, c.y, Math.cos(a) * sp * .6, Math.sin(a) * sp * .6 - 14, rnd(.5, 1), ['#8a5cff', '#c58cff', '#63d0f5'][i % 3], 1, -10, .96);
  }
}

// ---------------------------------------------------------------- damage
function hurtPiece(ctx, o, amt, kind) {
  if (!raid || !o || o.ruined) return false;
  if (raid.ruined >= raid.cap) return false;                  // 40% cap — a raid never levels a district
  const gone = ctx.damage(o, amt);
  if (gone) raid.ruined++;
  burst(ctx, o, kind);
  if (kind === 'fire') { const c = pieceC(ctx, o); burns.push({ x: c.x, y: c.y - 2, t: 7 }); }
  return gone;
}
function livePieces(ctx, idx, kinds) { return ctx.piecesOf(idx).filter(o => !o.ruined && kinds.includes(o.piece)); }
function nearestPiece(ctx, idx, kinds, x, y) {
  let best = null, bd = 1e9;
  for (const o of livePieces(ctx, idx, kinds)) { const c = pieceC(ctx, o); const d = Math.hypot(c.x - x, c.y - y); if (d < bd) { bd = d; best = o; } }
  return best;
}
// one of the n closest pieces — raiders spread the pain around instead of chewing one wall forever
function pickPiece(ctx, idx, kinds, x, y, n = 3) {
  const list = livePieces(ctx, idx, kinds);
  if (!list.length) return null;
  list.sort((a, b) => { const ca = pieceC(ctx, a), cb = pieceC(ctx, b); return Math.hypot(ca.x - x, ca.y - y) - Math.hypot(cb.x - x, cb.y - y); });
  return list[(Math.random() * Math.min(n, list.length)) | 0];
}

// ---------------------------------------------------------------- raid lifecycle
function pickPlot(ctx) {
  const plots = ctx.S.map.plots || []; if (!plots.length) return -1;
  const idx = plots.map((p, i) => i).filter(i => ctx.piecesOf(i).length);
  if (!idx.length) return -1;
  const fresh = idx.filter(i => ctx.districtState(i).condition === 1);
  const pool = fresh.length ? fresh : idx;
  return pool[(Math.random() * pool.length) | 0];
}
function startWarn(ctx) {
  const kind = ZKIND[ctx.S.zone.id]; if (!kind || raid) return;
  const idx = pickPlot(ctx); if (idx < 0) { timer = NEXT_T(); return; }
  const p = ctx.S.map.plots[idx], pcs = ctx.piecesOf(idx);
  raid = {
    kind, idx, p, phase: 'warn', t: 0, total: 0, warn: WARN_T(), lastSec: -1,
    hp: HP[kind], max: HP[kind], ruined: 0, cap: Math.max(1, Math.floor(pcs.length * 0.4)),
    x: 0, y: 0, face: 0, anim: 0, alt: 0, atk: 2.2, cone: null, inv: 0, flash: 0,
    s: 0, beam: null, ava: null, avaDone: false, hint: 8, target: null,
    cx: (p.x + p.w / 2) * ctx.TS, cy: (p.y + p.h / 2) * ctx.TS
  };
  const nat = nationName(ctx, p.nation), S = L(ctx);
  ctx.alert(S.warn[kind](nat, Math.ceil(raid.warn)), 4);
  ctx.toast(S.cry[kind], true);
  const crowd = ctx.S.npcs.filter(n => ctx.nationOf(n.m)?.key === p.nation);
  const who = crowd.length ? crowd[(Math.random() * crowd.length) | 0] : ctx.S.npcs[0];
  if (who) setTimeout(() => { if (raid && raid.phase === 'warn') ctx.toast(S.npc[kind](who.m.n)); }, 1800);
  sysR(ctx).highRaids++; ctx.persist();
}
function arrive(ctx) {
  const p = raid.p, TS = ctx.TS, cxp = (p.x + p.w / 2) * TS, cyp = (p.y + p.h / 2) * TS;
  raid.cx = cxp; raid.cy = cyp;
  if (raid.kind === 'drake') {
    const bands = [18.5, 38.5].map(r => r * TS);              // m7 lava bands
    const by = bands.reduce((a, b) => Math.abs(b - cyp) < Math.abs(a - cyp) ? b : a);
    raid.x = cxp + rnd(-60, 60); raid.y = by; raid.alt = 44;
    for (let i = 0; i < 22; i++) part(raid.x + rnd(-40, 40), by + rnd(-8, 8), rnd(-6, 6), rnd(-40, -14), rnd(.7, 1.4), ['#ffd45e', '#ff8c1a'][i % 2], 1, -6, .98);
  } else if (raid.kind === 'yeti') {
    raid.x = cxp; raid.y = Math.max(28, (p.y - 6) * TS); raid.alt = 0;
  } else {
    raid.s = 0; raid.alt = 0; const q = ringAt(raid, 0); raid.x = q.x; raid.y = q.y;
  }
  raid.phase = 'in'; raid.t = 0;
  ctx.alert(L(ctx).hit[raid.kind](nationName(ctx, p.nation)), 8);
  ctx.quake(0.3);
}
function endRaid(ctx, repelled) {
  if (!ctx || !raid) return;
  const S = L(ctx), name = S[raid.kind];
  if (repelled) {
    const r = sysR(ctx); r.highRepelled++; r[raid.kind + 'Repelled'] = (r[raid.kind + 'Repelled'] || 0) + 1; ctx.persist();
    loot = { kind: raid.kind, x: raid.x, y: raid.y + (raid.kind === 'drake' ? 6 : 2), t: 0 };
    raid.lootAt = { x: loot.x, y: loot.y };
    ctx.toast(S.repel(name), true);
  } else ctx.toast(S.gone(name));
  ctx.alert('');
  raid.phase = 'flee'; raid.t = 0; raid.cone = null; raid.beam = null; raid.ava = null;
  if (ritual) closeRitual(ctx);
  timer = NEXT_T();
}
function reset(ctx) {
  if (ritual && ctx) closeRitual(ctx);
  raid = null; loot = null; ritual = null; fx = []; burns = []; shots = []; cue = 0;
  if (ctx) ctx.alert('');
}

// ---------------------------------------------------------------- bakunawa ring path
function ringAt(r, s) {                                       // walk the fence ring of the target yard
  const p = r.p, TS = 16, x0 = (p.x - 1) * TS + 8, y0 = (p.y - 1) * TS + 8, w = (p.w + 1) * TS, h = (p.h + 1) * TS;
  const per = 2 * (w + h); s = ((s % per) + per) % per;
  if (s < w) return { x: x0 + s, y: y0, a: 0 };
  if (s < w + h) return { x: x0 + w, y: y0 + (s - w), a: 1 };
  if (s < 2 * w + h) return { x: x0 + w - (s - w - h), y: y0 + h, a: 2 };
  return { x: x0, y: y0 + h - (s - 2 * w - h), a: 3 };
}

// ---------------------------------------------------------------- per-creature update
function stepDrake(dt, ctx) {
  const r = raid, t = ctx.S.time;
  // hover over the open half of the yard, clear of the Rocky statue that stands at its centre
  const hx = r.cx + Math.cos(t * 0.5) * 34, hy = r.cy + 26 + Math.sin(t * 0.8) * 11;
  const dx = hx - r.x, dy = hy - r.y, d = Math.hypot(dx, dy) || 1;
  const sp = (r.phase === 'in' ? 74 : 34) * dt;
  if (d > 2) { r.x += dx / d * Math.min(sp, d); r.y += dy / d * Math.min(sp, d); }
  r.alt = 34 + Math.sin(t * 2.2) * 4 + (r.phase === 'in' ? Math.max(0, 10 * (1 - r.t)) : 0);
  if (Math.abs(dx) > 3) r.face = dx < 0 ? 1 : 0;
  if (d > 2) { r.face4 = faceOfV(dx, dy); r.moving = true; }
  if (r.phase === 'in') { if (d < 26 || r.t > 4) { r.phase = 'fight'; r.t = 0; } return; }
  // fire breath
  if (r.cone) { r.cone.t -= dt; if (r.cone.t <= 0) r.cone = null; }
  r.atk -= dt;
  if (r.atk <= 0 && !r.cone) {
    const o = pickPiece(ctx, r.idx, DRAKE_PIECES, r.x, r.y);
    if (o) {
      const c = pieceC(ctx, o), tough = (r.p.tier || 0) >= 4 && (o.piece === 'wall' || o.piece === 'corner');
      r.face = c.x < r.x ? 1 : 0;
      r.cone = { x: c.x, y: c.y, t: 0.9, life: 0.9 };
      hurtPiece(ctx, o, 1, 'fire');
      r.atk = tough ? 6 : 2;                                   // obsidian-tier walls barely scorch
    } else r.atk = 2;
  }
  if (r.cone) {                                                // embers falling out of the cone
    const mx = r.x + (r.face ? -13 : 13), my = r.y - r.alt - 2;
    const k = Math.random(), ex = mx + (r.cone.x - mx) * k, ey = my + (r.cone.y - my) * k;
    part(ex + rnd(-3, 3), ey + rnd(-3, 3), rnd(-8, 8), rnd(-26, -6), rnd(.3, .7), Math.random() < .5 ? '#ffd45e' : '#ff8c1a', 1, 20, .96);
  }
}
function stepYeti(dt, ctx) {
  const r = raid;
  if (r.phase === 'in') {
    const ty = (r.p.y - 1) * 16;
    r.y += Math.min(58 * dt, Math.max(0, ty - r.y));
    r.anim += dt * 6;
    if (r.y >= ty - 1 || r.t > 5) { r.phase = 'fight'; r.t = 0; }
    return;
  }
  // walk to the next fence piece and punch it
  if (!r.target || r.target.ruined) r.target = nearestPiece(ctx, r.idx, YETI_PIECES, r.x, r.y);
  const o = r.target;
  if (o) {
    const c = pieceC(ctx, o), dx = c.x - r.x, dy = c.y - 14 - r.y, d = Math.hypot(dx, dy) || 1;
    if (d > 20) { const sp = 30 * dt; r.x += dx / d * Math.min(sp, d); r.y += dy / d * Math.min(sp, d); r.anim += dt * 5; r.face = dx < 0 ? 1 : 0; r.face4 = faceOfV(dx, dy); r.moving = true; r.atk = Math.max(r.atk, 0.7); }
    else {
      r.anim += dt * 2.5; r.atk -= dt;
      if (r.atk <= 0) { hurtPiece(ctx, o, 2, 'snow'); r.atk = 2; r.punch = 0.35; }
    }
  }
  if (r.punch > 0) r.punch -= dt;
  // one avalanche per raid
  if (!r.avaDone && r.total > (fast() ? 4 : 18)) {
    r.avaDone = true;
    const p = r.p, walls = livePieces(ctx, r.idx, ['wall']);
    const sideOf = o => o.y === p.y ? 0 : o.y === p.y + p.h - 1 ? 2 : o.x === p.x ? 3 : 1;
    const best = walls.length ? sideOf(walls.reduce((a, b) => { const ca = pieceC(ctx, a), cb = pieceC(ctx, b); return Math.hypot(ca.x - r.x, ca.y - r.y) < Math.hypot(cb.x - r.x, cb.y - r.y) ? a : b; })) : 0;
    const row = walls.filter(o => sideOf(o) === best).sort((a, b) => Math.hypot(pieceC(ctx, a).x - r.x, pieceC(ctx, a).y - r.y) - Math.hypot(pieceC(ctx, b).x - r.x, pieceC(ctx, b).y - r.y)).slice(0, 3);
    if (row.length) {
      const cs = row.map(o => pieceC(ctx, o));
      r.ava = { list: row, x: cs[0].x, y: cs[0].y, x1: cs[cs.length - 1].x, y1: cs[cs.length - 1].y, t: 0, life: 1.0, hit: false, vert: best === 1 || best === 3 };
    }
  }
  if (r.ava) {
    const a = r.ava; a.t += dt;
    const k = clamp(a.t / a.life, 0, 1);
    a.px = a.x + (a.x1 - a.x) * k; a.py = a.y + (a.y1 - a.y) * k;
    for (let i = 0; i < 2; i++) part(a.px + rnd(-14, 14), a.py + rnd(-8, 4), rnd(-30, 30), rnd(-30, 8), rnd(.4, .9), '#ffffff', Math.random() < .4 ? 2 : 1, 70, .93);
    if (!a.hit && k >= 1) { a.hit = true; for (const o of a.list) hurtPiece(ctx, o, 2, 'snow'); ctx.quake(0.25); }  // one shove per raid
    if (a.t > a.life + 0.6) r.ava = null;
  }
}
function stepNaga(dt, ctx) {
  const r = raid;
  if (r.phase === 'in') { r.fade = clamp(r.t / 1.0, 0, 1); if (r.t >= 1) { r.phase = 'fight'; r.t = 0; r.fade = 1; } }
  else r.fade = 1;
  r.s += 30 * dt;
  const h = ringAt(r, r.s); r.x = h.x; r.y = h.y;
  r.face = h.a === 3 ? 1 : h.a === 1 ? 0 : (h.a === 2 ? 1 : 0);
  if (r.phase !== 'fight') return;
  if (r.beam) { r.beam.t -= dt; if (r.beam.t <= 0) r.beam = null; }
  r.atk -= dt;
  if (r.atk <= 0) {
    const o = pickPiece(ctx, r.idx, ['light'], r.x, r.y, 2) || pickPiece(ctx, r.idx, ['wall'], r.x, r.y);
    if (o) { const c = pieceC(ctx, o); r.beam = { x: c.x, y: c.y, t: .7, life: .7 }; hurtPiece(ctx, o, 1, 'rune'); }
    r.atk = 2;
  }
  if (r.beam) {                                                 // light being drawn into the maw
    const k = Math.random();
    part(r.beam.x + (r.x - r.beam.x) * k, r.beam.y + (r.y - r.beam.y) * k, rnd(-6, 6), rnd(-10, 2), rnd(.25, .5), Math.random() < .5 ? '#8ef0ff' : '#c58cff', 1, 0, .95);
  }
}

// ---------------------------------------------------------------- repel paths
function damageRaider(ctx, amt) {
  if (!raid || raid.phase === 'warn' || raid.phase === 'flee') return;
  raid.hp -= amt; raid.flash = 0.25;
  if (raid.hp <= 0) endRaid(ctx, true);
}
function rockyHits(dt, ctx) {
  const r = raid; if (!r || r.phase === 'warn' || r.phase === 'flee') return;
  r.inv = Math.max(0, r.inv - dt);
  if (!ctx.isRocky() || r.inv > 0) return;
  const p = ctx.S.player;
  let hit = Math.hypot(p.x - r.x, p.y - r.y) < (r.kind === 'naga' ? 18 : 24);
  if (!hit && r.kind === 'naga') for (let i = 1; i <= 12 && !hit; i++) { const q = ringAt(r, r.s - i * 12); hit = Math.hypot(p.x - q.x, p.y - q.y) < 14; }
  if (!hit) return;
  r.inv = 0.7;
  for (let i = 0; i < 10; i++) { const a = Math.random() * 6.283; part(r.x, r.y - 8, Math.cos(a) * rnd(20, 60), Math.sin(a) * rnd(20, 60) - 20, rnd(.3, .7), '#ffd45e', 2, 80, .94); }
  if (r.hp === r.max) ctx.toast(L(ctx).rocky);
  damageRaider(ctx, ROCKY_DMG[r.kind]);
}
function throwStone(ctx) {
  const S = L(ctx), have = ctx.S.save.inv.stone || 0;
  if (have < 1) { ctx.toast(S.noStone); return; }
  ctx.S.save.inv.stone = have - 1; ctx.persist();
  const p = ctx.S.player;
  shots.push({ x0: p.x, y0: p.y - 10, x1: raid.x, y1: raid.y - raid.alt - 4, t: 0, life: 0.26 });
  setTimeout(() => {
    if (!raid || raid.phase === 'flee') return;
    const left = raid.hp - 1;
    if (left > 0) ctx.toast(S.stoneHit(raid.max - left, raid.max));
    damageRaider(ctx, 1);
  }, 260);
}
function giveFish(ctx) {
  const s = ctx.S.save.sys && ctx.S.save.sys.animals, c = s && Array.isArray(s.carry) ? s.carry : null;
  if (!c) return false;
  const i = c.findIndex(it => (typeof it === 'string' ? it === 'fish' : it && it.kind === 'fish'));
  if (i < 0) return false;
  c.splice(i, 1);
  const inv = (ctx.S.save.inv = ctx.S.save.inv || {});        // keep the HUD mirror honest
  for (const k of ['cow', 'chicken', 'bird', 'fish']) inv[k] = 0;
  for (const it of c) { const k = typeof it === 'string' ? it : (it && it.kind); if (k in inv) inv[k]++; }
  ctx.persist();
  return true;
}
// ---- the Leaders' ritual drum
function openRitual(ctx) {
  ritual = { hits: 0, since: 0, t: 0, miss: 0, flash: 0 };
  ctx.setMode('ritual');
  ctx.onAction('ritual', () => beat(ctx));
  ctx.registerCloser('ritual', () => closeRitual(ctx));
}
function closeRitual(ctx) { ritual = null; if (ctx.S.mode === 'ritual') ctx.setMode('play'); }
function beat(ctx) {
  if (!ritual) return;
  if (ritual.hits > 0 && ritual.since > BEAT_WINDOW) { ritual.hits = 1; ritual.miss = 0.5; ctx.toast(L(ctx).drumMiss); }
  else ritual.hits++;
  ritual.since = 0; ritual.flash = 0.18;
  const r = raid;
  if (r) for (let i = 0; i < 8; i++) { const a = Math.random() * 6.283; part(r.x, r.y - 10, Math.cos(a) * rnd(20, 70), Math.sin(a) * rnd(20, 70), rnd(.3, .6), '#ffd45e', 1, 0, .95); }
  if (ritual.hits >= BEATS) { ctx.toast(L(ctx).drumWin, true); closeRitual(ctx); if (raid) damageRaider(ctx, raid.hp); }
}

// ---------------------------------------------------------------- loot
function takeLoot(ctx) {
  if (!loot) return;
  const S = L(ctx), n = LOOT_STONE[loot.kind];
  ctx.S.save.inv.stone = (ctx.S.save.inv.stone || 0) + n;
  const r = sysR(ctx); r[LOOT_FLAG[loot.kind]] = true;
  ctx.persist(); ctx.toast(S.got[loot.kind], true);
  for (let i = 0; i < 10; i++) { const a = Math.random() * 6.283; part(loot.x, loot.y - 4, Math.cos(a) * rnd(10, 40), Math.sin(a) * rnd(10, 40) - 20, rnd(.3, .7), '#ffd45e', 1, 60, .95); }
  loot = null;
}

// ---------------------------------------------------------------- warning cues (subtle: no shake, no flash)
function warnCue(dt, ctx) {
  cue += dt; if (cue < 0.12) return; cue = 0;
  const r = raid, T = ctx.T, map = ctx.S.map;
  if (r.kind === 'drake') {                                    // embers rising off the lava bands
    for (const row of [18.5, 38.5]) for (let i = 0; i < 2; i++) {
      const x = rnd(r.cx - 170, r.cx + 170);
      const tx = Math.floor(x / 16), ty = Math.floor(row);
      if (tx < 0 || tx >= map.w || ctx.getG(map, tx, ty) !== T.LAVA) continue;
      part(x, row * 16 + rnd(-4, 4), rnd(-5, 5), rnd(-34, -14), rnd(1.1, 2.0), Math.random() < .5 ? '#ff8c1a' : '#ffd45e', Math.random() < .3 ? 2 : 1, -8, .99);
    }
  } else if (r.kind === 'yeti') {                              // snow gusts blowing down the yard
    part(r.cx + rnd(-140, 140), r.cy + rnd(-90, 90), rnd(30, 70), rnd(6, 20), rnd(.8, 1.5), '#ffffff', 1, 0, 1);
  } else {                                                     // core glyphs flickering over the district
    const p = r.p;
    part((p.x + Math.random() * p.w) * 16, (p.y + Math.random() * p.h) * 16, 0, rnd(-8, -2), rnd(.5, 1.1), Math.random() < .5 ? '#8a5cff' : '#63d0f5', Math.random() < .4 ? 2 : 1, 0, 1);
  }
}

// ---------------------------------------------------------------- system
export const raidersHigh = {
  id: 'raidersHigh',

  onZoneEnter(ctx) {
    reset(ctx);
    // test hooks: __raidHigh() starts a raid at once (returns the live raid object), __raidHighFast shortens it
    if (typeof window !== 'undefined') {
      window.__raidHigh = () => { if (ZKIND[ctx.S.zone.id] && !raid) startWarn(ctx); return raid; };
      if (window.__raidHighFast === undefined) window.__raidHighFast = false;   // set true → 2 s warning, short raid
    }
    timer = ZKIND[ctx.S.zone.id] ? FIRST_T() : 1e9;
  },

  onZoneLeave(ctx) { reset(ctx); },

  update(dt, ctx) {
    for (let i = fx.length - 1; i >= 0; i--) { const q = fx[i]; q.t -= dt; if (q.t <= 0) { fx.splice(i, 1); continue; } q.x += q.vx * dt; q.y += q.vy * dt; q.vy += q.g * dt; q.vx *= q.drag; }
    for (let i = burns.length - 1; i >= 0; i--) { burns[i].t -= dt; if (burns[i].t <= 0) burns.splice(i, 1); }
    for (let i = shots.length - 1; i >= 0; i--) { shots[i].t += dt; if (shots[i].t >= shots[i].life) shots.splice(i, 1); }
    if (loot) { loot.t += dt; if (Math.random() < dt * 5) part(loot.x + rnd(-6, 6), loot.y - rnd(0, 9), 0, rnd(-14, -4), rnd(.4, .8), '#ffd45e', 1, 0, 1); } // sparkle so the trophy is easy to spot
    if (!ZKIND[ctx.S.zone && ctx.S.zone.id]) return;
    const mode = ctx.S.mode;
    if (mode !== 'play' && mode !== 'ritual') return;

    if (!raid) { timer -= dt; if (timer <= 0) startWarn(ctx); return; }
    raid.t += dt; raid.flash = Math.max(0, raid.flash - dt);

    if (raid.phase === 'warn') {
      warnCue(dt, ctx);
      const left = Math.ceil(raid.warn - raid.t);
      if (left !== raid.lastSec && left > 0) { raid.lastSec = left; ctx.alert(L(ctx).warn[raid.kind](nationName(ctx, raid.p.nation), left), 3); }
      if (raid.t >= raid.warn) arrive(ctx);
      return;
    }
    if (raid.phase === 'flee') {
      const sp = 70 * dt;
      if (raid.kind === 'drake') { raid.alt += 40 * dt; raid.y -= sp * .4; }
      else if (raid.kind === 'yeti') raid.y -= sp;
      else { raid.s += 120 * dt; const q = ringAt(raid, raid.s); raid.x = q.x; raid.y = q.y; raid.fade = clamp(1 - raid.t / 2, 0, 1); }
      raid.anim += dt * 6;
      if (raid.t > 2) { raid = null; }
      return;
    }
    // ---- live raid
    raid.total += dt;
    if (raid.kind === 'drake') stepDrake(dt, ctx);
    else if (raid.kind === 'yeti') stepYeti(dt, ctx);
    else stepNaga(dt, ctx);
    rockyHits(dt, ctx);
    for (const b of burns) if (Math.random() < 0.5) part(b.x + rnd(-4, 4), b.y, rnd(-4, 4), rnd(-18, -8), rnd(.25, .5), Math.random() < .5 ? '#ffd45e' : '#ff8c1a', 1, 0, .96);
    // a quiet reminder of how to fight back
    raid.hint -= dt;
    if (raid.hint <= 0) {
      raid.hint = 12;
      const S = L(ctx);
      if (raid.kind === 'drake') ctx.alert(`${S.drake} — ${S.stone}`, 6);
      else if (raid.kind === 'yeti') ctx.alert(`${S.yeti} — ${S.fish}`, 6);
      else ctx.alert(`${S.naga} — ${metLeaders(ctx) >= LEADERS_NEEDED ? S.drum : S.leaders(metLeaders(ctx))}`, 6);
    }
    if (ritual) {
      ritual.t += dt; ritual.since += dt; ritual.miss = Math.max(0, ritual.miss - dt); ritual.flash = Math.max(0, ritual.flash - dt);
      if (ritual.t > RITUAL_MAX || ritual.since > RITUAL_IDLE) closeRitual(ctx);   // never trap the player in the drum
    }
    if (raid.total >= RAID_T()) endRaid(ctx, false);
  },

  near(ctx) {
    const p = ctx.S.player, S = L(ctx);
    if (loot) {                                                // dropped trophy — always worth picking up
      const d = Math.hypot(loot.x - p.x, loot.y - p.y);
      if (d < 22) return { label: S.take[loot.kind], x: loot.x, y: loot.y, limit: 22, priority: !ctx.isRocky(), data: { loot: true } };
    }
    if (!raid || raid.phase === 'warn' || raid.phase === 'flee' || ritual) return null;
    if (raid.kind === 'drake') {
      const d = Math.hypot(raid.x - p.x, raid.y - p.y);
      if (d < 40) return { label: S.stone, x: raid.x, y: raid.y, limit: 40, priority: claimOK(ctx, raid.x, raid.y), data: { stone: true } };
      return null;
    }
    if (raid.kind === 'yeti') {
      const d = Math.hypot(raid.x - p.x, raid.y - p.y);
      if (d < 30) { const has = hasFish(ctx); return { label: has ? S.fish : S.fishNeed, x: raid.x, y: raid.y, limit: 30, priority: claimOK(ctx, raid.x, raid.y), data: { fish: has } }; }
      return null;
    }
    // bakunawa: the ritual works at the statue or anywhere inside the yard
    const pl = raid.p, inYard = p.x > (pl.x - 1) * 16 && p.x < (pl.x + pl.w + 1) * 16 && p.y > (pl.y - 1) * 16 && p.y < (pl.y + pl.h + 1) * 16;
    if (!inYard) return null;
    const k = metLeaders(ctx), ok = k >= LEADERS_NEEDED;
    return { label: ok ? S.drum : S.leaders(k), x: raid.cx, y: raid.cy, limit: 120, priority: claimOK(ctx, raid.cx, raid.cy), data: { ritual: ok, k } };
  },

  interact(ctx, cand) {
    const d = cand && cand.data; if (!d) return;
    const S = L(ctx);
    if (d.loot) { takeLoot(ctx); return; }
    if (!raid) return;
    if (d.stone) { throwStone(ctx); return; }
    if (d.fish !== undefined) {
      if (!d.fish) { ctx.toast(S.fishNeed); return; }
      if (!giveFish(ctx)) { ctx.toast(S.fishNeed); return; }
      ctx.toast(S.fishOk, true);
      for (let i = 0; i < 12; i++) { const a = Math.random() * 6.283; part(raid.x, raid.y - 16, Math.cos(a) * rnd(15, 45), Math.sin(a) * rnd(15, 45) - 15, rnd(.4, .9), '#bfe9ff', 1, 40, .95); }
      endRaid(ctx, true);
      return;
    }
    if (d.ritual === true) { openRitual(ctx); return; }
    if (d.ritual === false) { ctx.toast(S.leaders(d.k)); return; }
  },

  drawables(ctx, cx, cy) {
    const out = [], g = ctx.g;
    if (loot) {
      const img = SPR['item' + loot.kind[0].toUpperCase() + loot.kind.slice(1)][(Math.floor(loot.t * 4) % 2)][0];
      const bob = Math.round(Math.sin(loot.t * 3) * 2);
      out.push({ y: loot.y, f: () => { g.globalAlpha = .35; g.fillStyle = '#000'; g.beginPath(); g.ellipse(Math.round(loot.x - cx), Math.round(loot.y - cy), 6, 2.5, 0, 0, 7); g.fill(); g.globalAlpha = 1; g.drawImage(img, Math.round(loot.x - cx) - 5, Math.round(loot.y - cy) - 9 + bob); } });
    }
    if (!raid || raid.phase === 'warn') return out;
    const r = raid, fade = r.kind === 'naga' ? (r.fade ?? 1) : 1;
    if (r.kind === 'naga') {
      for (let i = 12; i >= 1; i--) {
        const q = ringAt(r, r.s - i * 12), img = SPR.seg[(Math.floor(ctx.S.time * 6) + i) % 2][0];
        const sz = Math.round(Math.max(8, 15 - i * 0.55));                     // the body tapers toward the tail
        out.push({ y: q.y + 6, f: () => { g.globalAlpha = fade * (1 - i * 0.02); g.drawImage(img, Math.round(q.x - cx - sz / 2), Math.round(q.y - cy - sz / 2), sz, sz); g.globalAlpha = 1; } });
      }
      const hi = SPR.head[Math.floor(ctx.S.time * 6) % 2][r.face];
      out.push({ y: r.y + 8, f: () => { g.globalAlpha = fade; g.drawImage(hi, Math.round(r.x - cx) - 12, Math.round(r.y - cy) - 12); g.globalAlpha = 1; if (r.flash > 0) { g.globalAlpha = r.flash * 3; g.fillStyle = '#fff'; g.fillRect(Math.round(r.x - cx) - 12, Math.round(r.y - cy) - 12, 24, 20); g.globalAlpha = 1; } } });
      return out;
    }
    const [w, h] = SIZE[r.kind];
    const frame = r.kind === 'drake' ? Math.floor(ctx.S.time * 5) % 2 : (Math.floor(r.anim) % 2);
    const img = dirFrame(SPR[r.kind], r.face4, r.kind === 'drake' ? ctx.S.time * 2.5 : r.anim / 2, r.moving !== false) || SPR[r.kind][frame][r.face];   /* plan-11 */
    const sx = () => Math.round(r.x - cx) - (w >> 1), sy = () => Math.round(r.y - r.alt - cy) - h + 4;
    if (r.alt > 4) out.push({ y: r.y - 1, f: () => { g.globalAlpha = clamp(.38 - r.alt / 160, .1, .4); g.fillStyle = '#000'; g.beginPath(); g.ellipse(Math.round(r.x - cx), Math.round(r.y - cy), 13, 5, 0, 0, 7); g.fill(); g.globalAlpha = 1; } });
    out.push({
      y: r.y + (r.kind === 'drake' ? 26 : 0), f: () => {        // the drake flies: it sorts in front of the walls it circles
        if (r.kind === 'drake') { const gr = g.createRadialGradient(Math.round(r.x - cx), sy() + h * .6, 2, Math.round(r.x - cx), sy() + h * .6, 26); gr.addColorStop(0, 'rgba(255,120,30,.16)'); gr.addColorStop(1, 'rgba(255,120,30,0)'); g.fillStyle = gr; g.fillRect(sx() - 20, sy() - 14, w + 40, h + 28); }
        g.drawImage(img, sx(), sy());
        if (r.flash > 0) { g.globalAlpha = r.flash * 3; g.fillStyle = '#fff'; g.fillRect(sx(), sy(), w, h); g.globalAlpha = 1; }
      }
    });
    return out;
  },

  draw(g, ctx, cx, cy) {
    const r = raid;
    // the serpent drinks the yard's glow
    if (r && r.kind === 'naga' && r.phase !== 'warn') {
      // the glow dies inside the fence only — the serpent itself stays readable on the ring
      const p = r.p, x = (p.x + p.w / 2) * 16 - cx, y = (p.y + p.h / 2) * 16 - cy, rx = p.w * 8, ry = p.h * 8;
      const k = (r.phase === 'flee' ? Math.max(0, 1 - r.t / 2) : (r.fade ?? 1));
      const gr = g.createRadialGradient(x, y, 4, x, y, rx);
      gr.addColorStop(0, `rgba(6,2,18,${(.52 * k).toFixed(3)})`); gr.addColorStop(.72, `rgba(8,2,22,${(.34 * k).toFixed(3)})`); gr.addColorStop(1, 'rgba(8,2,22,0)');
      g.save(); g.translate(x, y); g.scale(1, ry / rx); g.fillStyle = gr; g.beginPath(); g.arc(0, 0, rx, 0, 7); g.fill(); g.restore();
    }
    // fire cone
    if (r && r.cone) {
      const c = r.cone, k = clamp(1 - c.t / c.life, 0, 1);
      const mx = r.x - cx + (r.face ? -13 : 13), my = r.y - r.alt - cy - 2;
      const tx = c.x - cx, ty = c.y - cy;
      const dx = tx - mx, dy = ty - my, len = Math.hypot(dx, dy) || 1, ux = dx / len, uy = dy / len;
      const reach = len * clamp(k * 2.2, 0, 1) + 4, spread = reach * 0.42;
      const nx = -uy, ny = ux, fl = Math.sin(ctx.S.time * 34) * 1.6;
      const layers = [['rgba(226,60,20,.45)', 1.15], ['rgba(255,140,26,.62)', .78], ['rgba(255,212,94,.85)', .42]];
      for (const [col, sc] of layers) {
        g.fillStyle = col; g.beginPath(); g.moveTo(mx, my);
        g.lineTo(mx + ux * reach + nx * (spread * sc + fl), my + uy * reach + ny * (spread * sc + fl));
        g.lineTo(mx + ux * (reach + 3), my + uy * (reach + 3));
        g.lineTo(mx + ux * reach - nx * (spread * sc + fl), my + uy * reach - ny * (spread * sc + fl));
        g.closePath(); g.fill();
      }
      g.fillStyle = 'rgba(255,240,180,.9)'; g.fillRect(mx - 2, my - 2, 4, 4);
    }
    // bakunawa swallow beam
    if (r && r.beam) {
      const b = r.beam, k = clamp(b.t / b.life, 0, 1);
      const hx = r.x - cx, hy = r.y - cy - 4, tx = b.x - cx, ty = b.y - cy;
      const dx = tx - hx, dy = ty - hy, len = Math.hypot(dx, dy) || 1, nx = -dy / len, ny = dx / len;
      g.fillStyle = `rgba(158,110,255,${(.5 * k).toFixed(3)})`;
      g.beginPath(); g.moveTo(hx + nx * 6, hy + ny * 6); g.lineTo(tx + nx * 2.5, ty + ny * 2.5); g.lineTo(tx - nx * 2.5, ty - ny * 2.5); g.lineTo(hx - nx * 6, hy - ny * 6); g.closePath(); g.fill();
      g.fillStyle = `rgba(190,240,255,${(.55 * k).toFixed(3)})`;
      g.beginPath(); g.moveTo(hx + nx * 2, hy + ny * 2); g.lineTo(tx, ty); g.lineTo(hx - nx * 2, hy - ny * 2); g.closePath(); g.fill();
    }
    // avalanche patch
    if (r && r.ava && r.ava.px !== undefined) {
      const a = r.ava, x = a.px - cx, y = a.py - cy, k = clamp(a.t / a.life, 0, 1);
      g.fillStyle = 'rgba(255,255,255,.82)'; g.beginPath(); g.ellipse(x, y, 16 + k * 6, 9, 0, 0, 7); g.fill();
      g.fillStyle = 'rgba(206,226,243,.9)'; g.beginPath(); g.ellipse(x - (a.vert ? 0 : 6), y + 3, 10, 5, 0, 0, 7); g.fill();
    }
    // stones in flight
    for (const s of shots) {
      const k = clamp(s.t / s.life, 0, 1);
      const x = s.x0 + (s.x1 - s.x0) * k - cx, y = s.y0 + (s.y1 - s.y0) * k - cy - Math.sin(k * Math.PI) * 14;
      g.fillStyle = OUT; g.fillRect(Math.round(x) - 2, Math.round(y) - 2, 5, 5);
      g.fillStyle = '#c8c8d2'; g.fillRect(Math.round(x) - 1, Math.round(y) - 1, 3, 3);
    }
    // particles
    for (const q of fx) {
      g.globalAlpha = clamp(q.t / q.life, 0, 1);
      g.fillStyle = q.c; g.fillRect(Math.round(q.x - cx), Math.round(q.y - cy), q.s, q.s);
    }
    g.globalAlpha = 1;
  },

  drawUI(ug, ctx, cx, cy, scale) {
    const W = ug.canvas.width, H = ug.canvas.height, S = L(ctx);
    if (raid && raid.phase !== 'warn' && raid.phase !== 'flee') {
      const r = raid, top = r.kind === 'naga' ? r.y - 16 : r.y - r.alt - (SIZE[r.kind] ? SIZE[r.kind][1] : 24) - 2;
      const sx = Math.round((r.x - cx) * scale), sy = Math.round((top - cy) * scale);
      if (sx > -80 && sx < W + 80 && sy > -40 && sy < H + 40) {
        ug.save();
        ug.textAlign = 'center'; ug.textBaseline = 'alphabetic';
        ug.font = `bold ${Math.max(11, Math.round(scale * 3.4))}px "Segoe UI",system-ui,sans-serif`;
        ug.fillStyle = 'rgba(13,11,20,.6)'; ug.fillText(S[r.kind], sx + 1, sy - Math.round(scale * 3) + 1);
        ug.fillStyle = '#ffd45e'; ug.fillText(S[r.kind], sx, sy - Math.round(scale * 3));
        const pw = Math.max(5, Math.round(scale * 2.2)), gap = Math.round(pw * 0.5), tot = r.max * pw + (r.max - 1) * gap;
        for (let i = 0; i < r.max; i++) {
          const x = sx - tot / 2 + i * (pw + gap), y = sy - Math.round(scale * 1.2);
          ug.fillStyle = 'rgba(13,11,20,.75)'; ug.fillRect(x - 1, y - 1, pw + 2, pw + 2);
          ug.fillStyle = i < r.hp ? (r.hp <= 1 ? '#ff1f4b' : '#ff5a3c') : 'rgba(255,255,255,.18)';
          ug.fillRect(x, y, pw, pw);
        }
        ug.restore();
      }
    }
    if (!ritual) return;
    // ---- ritual drum: beat bar
    const bw = Math.max(220, Math.min(430, Math.round(W * 0.42))), bh = Math.max(56, Math.round(scale * 19));
    const bx = Math.round((W - bw) / 2), by = Math.round(Math.min(H * 0.62, H - bh - 70));
    ug.save();
    ug.fillStyle = 'rgba(13,11,20,.86)'; ug.beginPath(); ug.roundRect(bx, by, bw, bh, 7); ug.fill();
    ug.strokeStyle = ritual.miss > 0 ? '#ff1f4b' : '#ffd45e'; ug.lineWidth = 2; ug.beginPath(); ug.roundRect(bx + 1, by + 1, bw - 2, bh - 2, 7); ug.stroke();
    ug.textAlign = 'center'; ug.textBaseline = 'middle';
    ug.font = `bold ${Math.max(12, Math.round(scale * 3.6))}px "Segoe UI",system-ui,sans-serif`;
    ug.fillStyle = '#fff'; ug.fillText(`🥁 ${S.drumTitle} ${ritual.hits}/${BEATS}`, bx + bw / 2, by + Math.round(bh * 0.28));
    // pips
    const n = BEATS, pw = Math.max(10, Math.round(scale * 4)), gap = Math.round(pw * 0.6), tot = n * pw + (n - 1) * gap;
    for (let i = 0; i < n; i++) {
      const x = bx + (bw - tot) / 2 + i * (pw + gap), y = by + Math.round(bh * 0.52);
      ug.fillStyle = i < ritual.hits ? (ritual.flash > 0 && i === ritual.hits - 1 ? '#ffffff' : '#ffd45e') : 'rgba(255,255,255,.16)';
      ug.beginPath(); ug.roundRect(x, y, pw, pw, 3); ug.fill();
    }
    // the shrinking window you must hit inside
    const k = ritual.hits > 0 ? clamp(1 - ritual.since / BEAT_WINDOW, 0, 1) : 1;
    const wx = bx + 12, ww = bw - 24, wy = by + bh - Math.max(9, Math.round(scale * 2.6)) - 5, wh = Math.max(5, Math.round(scale * 1.7));
    ug.fillStyle = 'rgba(255,255,255,.12)'; ug.fillRect(wx, wy, ww, wh);
    ug.fillStyle = k > .35 ? '#4fc7a8' : '#ff1f4b'; ug.fillRect(wx, wy, Math.round(ww * k), wh);
    ug.font = `${Math.max(10, Math.round(scale * 2.8))}px "Segoe UI",system-ui,sans-serif`;
    ug.fillStyle = 'rgba(255,255,255,.75)'; ug.textAlign = 'right';
    ug.fillText(S.drumHint, bx + bw - 12, by + Math.round(bh * 0.28));
    ug.restore();
  },

  hudLines(ctx) {
    if (!raid || raid.phase === 'warn' || raid.phase === 'flee') return [];
    return [`⚔ ${L(ctx)[raid.kind]} ${raid.hp}/${raid.max}`];
  }
};

function hasFish(ctx) {
  const s = ctx.S.save.sys && ctx.S.save.sys.animals, c = s && Array.isArray(s.carry) ? s.carry : null;
  return !!c && c.some(it => (typeof it === 'string' ? it === 'fish' : it && it.kind === 'fish'));
}
