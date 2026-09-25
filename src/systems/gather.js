// gather.js — gathering & planting (see API.md)
//  · Resource nodes: dig sand, mine stone / iron / obsidian / crystal, chip ice, scoop lava,
//    cut palm leaves, tap pine resin, cut hay, pick flowers / berries / mushrooms, rob a beehive.
//    Each one is an `E` prompt with a short progress bar; tools gate what you may take.
//  · Planting: a seed on grass grows through 3 sapling stages (60 s each, ms game = 100 phút game/giai đoạn,
//    persisted) and finally becomes a real tree that trees.js can chop.
import { mkCanvas, rngFrom, hashStr, circle, line, PAL, TS, T } from '../gfx.js';

// ---------- text ----------
const STR = {
  en: {
    digSand: 'Dig sand', mineSeis: 'Mine Seismic stone', mineStone: 'Mine stone', mineOre: 'Mine iron ore', mineObs: 'Cut obsidian',
    chipIce: 'Chip ice', mineCrystal: 'Cut crystal', scoopLava: 'Scoop lava', cutLeaf: 'Cut palm leaves',
    tapResin: 'Tap resin', cutHay: 'Cut hay', pickFlowers: 'Pick flowers', pickBerries: 'Pick berries',
    pickMush: 'Pick mushroom', takeHoney: 'Take honey', plant: 'Plant a seed',
    needPick: 'Needs a pickaxe — craft Pickaxe I at the workbench (6 wood + 2 rock)', needIron: 'Needs Pickaxe II — craft it at the furnace in M4/M5 (3 iron + 2 wood)', needKnife: 'Needs a knife — craft it at the workbench (2 rock + 1 wood)',
    needShovel: 'Needs a shovel — craft it at the workbench (4 wood)', needScythe: 'Needs a scythe — craft it at the workbench (3 wood + 1 rock)', needTorch: 'Bees! Bring a torch — craft it at the workbench (2 wood + 1 resin)',
    bees: 'Bees! Bring a torch — craft it at the workbench (2 wood + 1 resin)', meltBucket: 'The wooden bucket would melt — forge an iron bucket at the furnace in M4/M5 (2 iron bars)',
    planted: 'Seed planted', grown: 'A sapling grew into a tree'
  },
  vi: {
    digSand: 'Đào cát', mineSeis: 'Đào đá Seismic', mineStone: 'Đục đá', mineOre: 'Đào quặng sắt', mineObs: 'Đục obsidian',
    chipIce: 'Đục băng', mineCrystal: 'Đục tinh thể', scoopLava: 'Múc dung nham', cutLeaf: 'Cắt lá cọ',
    tapResin: 'Lấy nhựa thông', cutHay: 'Cắt cỏ khô', pickFlowers: 'Hái hoa', pickBerries: 'Hái quả',
    pickMush: 'Hái nấm', takeHoney: 'Lấy mật ong', plant: 'Trồng hạt',
    needPick: 'Cần cuốc — chế Cuốc I ở Bàn mộc (6 gỗ + 2 đá)', needIron: 'Cần Cuốc II — chế ở Lò nung M4/M5 (3 sắt + 2 gỗ)', needKnife: 'Cần dao — chế ở Bàn mộc (2 đá + 1 gỗ)',
    needShovel: 'Cần xẻng — chế ở Bàn mộc (4 gỗ)', needScythe: 'Cần liềm — chế ở Bàn mộc (3 gỗ + 1 đá)', needTorch: 'Ong! Cần đuốc — chế ở Bàn mộc (2 gỗ + 1 nhựa thông)',
    bees: 'Ong! Cần đuốc — chế ở Bàn mộc (2 gỗ + 1 nhựa thông)', meltBucket: 'Xô gỗ sẽ chảy — rèn Xô sắt ở Lò nung M4/M5 (2 thanh sắt)',
    planted: 'Đã trồng hạt', grown: 'Cây non đã thành cây lớn'
  }
};
const L = ctx => STR[ctx.lang()] || STR.en;

// ---------- node tables ----------
const CRY = { kind: 'cry', label: 'mineCrystal', tool: 'pickaxe', min: 2, need: 'needIron', item: 'crystal', n: 2, hits: 1, dur: 1.2, snd: 'hit', remove: true };
const PINE = { kind: 'resin', label: 'tapResin', tool: 'knife', min: 1, need: 'needKnife', item: 'resin', n: 1, hits: 1, dur: 1.0, snd: 'chop', cd: 90, priority: true };
// object nodes: map object type -> what you get from it
const OBJ = {
  rock: { kind: 'rock', label: 'mineStone', tool: 'pickaxe', min: 1, need: 'needPick', item: 'rock', n: 2, hits: 1, dur: 1.0, snd: 'hit', remove: true },
  rock_s: { kind: 'rock', label: 'mineStone', tool: 'pickaxe', min: 1, need: 'needPick', item: 'rock', n: 1, hits: 1, dur: 0.8, snd: 'hit', remove: true },
  boulder: { kind: 'rock', label: 'mineStone', tool: 'pickaxe', min: 1, need: 'needPick', item: 'rock', n: 5, hits: 3, dur: 0.7, snd: 'hit', remove: true },
  seisvein: { kind: 'seis', label: 'mineSeis', item: 'stone', n: 2, hits: 3, dur: 0.8, snd: 'hit', remove: true },   /* plan-18: mỏ đá Seismic — tay không đào được, ra 2 🪨 */
  orevein: { kind: 'ore', label: 'mineOre', tool: 'pickaxe', min: 1, need: 'needPick', item: 'ore', n: 2, hits: 3, dur: 0.7, snd: 'hit', remove: true, bonus: true },
  obsvein: { kind: 'obs', label: 'mineObs', tool: 'pickaxe', min: 2, need: 'needIron', item: 'obsidian', n: 2, hits: 1, dur: 1.4, snd: 'hit', remove: true },
  crystal_p: CRY, crystal_b: CRY, crystal_r: CRY,
  palm: { kind: 'leaf', label: 'cutLeaf', tool: 'knife', min: 1, need: 'needKnife', item: 'leaf', n: 2, hits: 1, dur: 1.0, snd: 'chop', cd: 60, priority: true },
  pine: PINE, pine_s: PINE,
  bush: { kind: 'berry', label: 'pickBerries', item: 'berry', n: 2, hits: 1, dur: 1.0, snd: 'pickup', cd: 120, seed: true },
  mushroom: { kind: 'mush', label: 'pickMush', item: 'mushroom', n: 1, hits: 1, dur: 0.9, snd: 'pickup', remove: true, seed: true, priority: true },
  beehive: { kind: 'honey', label: 'takeHoney', tool: 'torch', min: 1, need: 'bees', pair: [['honey', 1], ['wax', 1]], hits: 1, dur: 1.4, snd: 'pickup', cd: 180, priority: true }
};
// tile nodes
const CD_SAND = 90, CD_ICE = 120, CD_HAY = 60, CD_LAVA = 20;
const GROW = 60, MAX_PLANTS = 40, STAGES = ['sapling1', 'sapling2', 'sapling3'];
const SEED_CHANCE = 0.25;
const TILE_BIAS = 25;   // a tile action is "worth" 25 px of distance → NPCs / trees / signs still win

// ---------- module state ----------
const ST = {
  zone: null, sprites: false,
  grid: new Map(),   // tileKey -> { o, def }
  nodes: [],         // unique { o, def } for this zone (overlay drawing)
  plants: [],        // { rec, o, st }
  act: null,         // running gather action
  parts: [],         // particles
  prune: 0
};
const tkey = (x, y) => x * 4096 + y;
const okey = (def, o) => `${def.kind}:${o.x},${o.y}`;
/* F01: 'ms' theo đồng hồ game (600 ms / phút game → GROW 60 s = 100 phút game ≈ 1 giai đoạn); chưa có clock → giờ máy như cũ */
let clockRef = null;
const nowMs = () => clockRef ? clockRef.ms() : Date.now();

// ---------- save helpers ----------
function root(ctx) { const s = ctx.S.save; s.sys = s.sys || {}; return (s.sys.gather = s.sys.gather || {}); }
function zb(ctx) {
  const g = root(ctx), id = ctx.S.zone ? ctx.S.zone.id : 'village';
  const b = (g[id] = g[id] || {}); b.t = b.t || {}; b.o = b.o || {}; return b;
}
function plantsOf(ctx) {
  const g = root(ctx), id = ctx.S.zone ? ctx.S.zone.id : 'village';
  g.plants = g.plants || {}; return (g.plants[id] = g.plants[id] || []);
}
const cdLeft = (bucket, k) => { const t = bucket[k]; return t ? Math.max(0, (t - nowMs()) / 1000) : 0; };
const setCd = (bucket, k, secs) => { bucket[k] = nowMs() + secs * 1000; };
function pruneCd(ctx) {
  const b = zb(ctx), t = nowMs();
  for (const bucket of [b.t, b.o]) for (const k of Object.keys(bucket)) {
    /* save cũ: cooldown lưu theo Date.now() thật (~1,8e12) trong khi nowMs() nay là ms game (~0) → quy đổi giữ phần còn lại, không thì không bao giờ hết hạn */
    if (clockRef && bucket[k] > 1e11) bucket[k] = t + Math.max(0, bucket[k] - Date.now());
    if (bucket[k] <= t) delete bucket[k];
  }
}
/* F02: cắt cỏ rơi 10 % một hạt cây đúng mùa (nguồn hạt tạm ngoài Thương nhân) */
const CROP_SEEDS = ['turnip', 'strawberry', 'tomato', 'corn', 'pumpkin', 'yam', 'starmush', 'quakeflower'];
const CROP_SEED_CHANCE = 0.10;
function dropCropSeed(ctx) {
  if (!ctx.ITEMS || !ctx.season || Math.random() >= CROP_SEED_CHANCE) return;
  const season = ctx.season();
  const ok = CROP_SEEDS.filter(c => { const it = ctx.ITEMS[c]; return it && (it.tags.includes('any') || it.tags.includes(season)); });
  if (!ok.length) return;
  const id = 'seed_' + ok[(Math.random() * ok.length) | 0];
  if (ctx.ITEMS[id] && ctx.bag.add(id, 1) > 0) ctx.toast(`+1 ${ctx.itemIcon(id)} ${ctx.itemName(id)}`);
}

// ---------- map helpers ----------
const isRoad = (m, x, y) => !!(m.roads && x >= 0 && y >= 0 && x < m.w && y < m.h && m.roads[y * m.w + x] === 1);
const inPlot = (m, x, y, mg = 1) => (m.plots || []).some(p => x >= p.x - mg && x < p.x + p.w + mg && y >= p.y - mg && y < p.y + p.h + mg);
const nearReserved = (m, x, y) => (m.reserved || []).some(r => Math.abs(r.x - x) <= 1 && Math.abs(r.y - y) <= 1);
function reachOf(ctx, m) { return m._reach || (m._reach = ctx.computeReach(m, m.entries.default)); }
function okSpot(ctx, m, x, y, reach) {
  if (x < 3 || y < 3 || x >= m.w - 3 || y >= m.h - 3) return false;
  if (x >= 39 && x <= 41) return false;                                  // reserved gate lane / avenue
  if (ctx.isSolid(m, x, y)) return false;
  if (isRoad(m, x, y) || inPlot(m, x, y, 1) || nearReserved(m, x, y)) return false;
  if (reach && !reach[y * m.w + x]) return false;
  return !ctx.hasObjectAt(m, x, y);                                      // last: it scans every object
}
const walkSide = (ctx, m, x, y, reach) => [[1, 0], [-1, 0], [0, 1], [0, -1]]
  .some(([dx, dy]) => !ctx.isSolid(m, x + dx, y + dy) && reach[(y + dy) * m.w + (x + dx)]);

// ---------- procedural sprites (registered once) ----------
function ensureSprites(ctx) {
  if (ST.sprites) return; ST.sprites = true;
  const d = (n, w, h, fw, fh, fn, opts) => ctx.defineObject(n, w, h, fw, fh, fn, opts);
  const shadow = (g, cx, cy, rx, ry) => { g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(cx, cy, rx, ry, 0, 0, 7); g.fill(); };

  d('seisvein', 16, 16, 1, 1, g => {   /* plan-18: tinh thể Seismic (ảnh gói: zones/village/obj/seisvein_t8.png) — bản code: khối tím nhiều mặt */
    shadow(g, 8, 14, 6, 2);
    g.fillStyle = '#3b2a36'; g.beginPath(); g.moveTo(6, 2); g.lineTo(11, 3); g.lineTo(13, 9); g.lineTo(9, 15); g.lineTo(4, 13); g.lineTo(3, 7); g.closePath(); g.fill();
    g.fillStyle = '#5a3a4a'; g.fillRect(5, 6, 4, 6); g.fillStyle = '#7a5a6a'; g.fillRect(9, 4, 3, 5); g.fillStyle = '#e6dde2'; g.fillRect(8, 5, 1, 7);
  }, { solid: true });
  d('orevein', 16, 16, 1, 1, (g, r) => {                                  // dark rock, orange specks
    shadow(g, 8, 14, 6, 2);
    circle(g, 8, 9, 6, PAL.out); circle(g, 8, 9, 5, '#4b4652'); circle(g, 6, 7, 2, '#5f5a68');
    g.fillStyle = '#3a3642'; g.fillRect(3, 12, 10, 2);
    for (let i = 0; i < 7; i++) {
      const x = 3 + ((r() * 9) | 0), y = 4 + ((r() * 8) | 0);
      g.fillStyle = '#c96a16'; g.fillRect(x, y, 2, 1);
      g.fillStyle = '#ffb03a'; g.fillRect(x, y, 1, 1);
    }
  }, { solid: true });

  d('obsvein', 16, 16, 1, 1, (g, r) => {                                  // black glossy shards
    shadow(g, 8, 14, 6, 2);
    circle(g, 8, 9, 6, PAL.out); circle(g, 8, 9, 5, '#191525');
    line(g, 5, 13, 7, 3, '#2c2440', 3); line(g, 11, 13, 10, 5, '#241d36', 3);
    g.fillStyle = '#8a5cff'; g.fillRect(6, 6, 1, 3); g.fillRect(10, 8, 1, 2);
    g.fillStyle = '#ffffff'; g.fillRect(6, 5, 1, 1); g.fillRect(10, 7, 1, 1);
    for (let i = 0; i < 2; i++) { g.fillStyle = '#4a3f68'; g.fillRect(4 + ((r() * 8) | 0), 9 + ((r() * 3) | 0), 2, 1); }
  }, { solid: true });

  d('mushroom', 16, 16, 1, 1, g => {                                      // small cluster, non-solid
    shadow(g, 8, 14, 5, 2);
    g.fillStyle = PAL.out; g.fillRect(11, 9, 3, 5); g.fillStyle = '#e8dcc2'; g.fillRect(11, 10, 2, 4);
    circle(g, 12, 9, 3, PAL.out); circle(g, 12, 9, 2, '#d0523a'); g.fillStyle = '#ffe9d0'; g.fillRect(11, 8, 1, 1);
    g.fillStyle = PAL.out; g.fillRect(5, 8, 4, 6); g.fillStyle = '#efe6d2'; g.fillRect(6, 9, 2, 5);
    circle(g, 7, 7, 5, PAL.out); circle(g, 7, 7, 4, '#c9342f');
    g.fillStyle = '#ffffff'; g.fillRect(4, 6, 2, 1); g.fillRect(9, 7, 1, 1); g.fillRect(7, 4, 1, 1); g.fillRect(6, 8, 1, 1);
  }, { solid: false });

  d('beehive', 16, 32, 1, 1, g => {                                       // hangs in the canopy, non-solid
    g.fillStyle = PAL.out; g.fillRect(7, 0, 2, 5);
    circle(g, 8, 11, 6, PAL.out); circle(g, 8, 11, 5, '#e0a544');
    g.fillStyle = '#c98a2e'; g.fillRect(3, 9, 11, 1); g.fillRect(3, 13, 11, 1);
    g.fillStyle = '#f2c86e'; g.fillRect(5, 7, 5, 1);
    g.fillStyle = PAL.out; g.fillRect(7, 13, 3, 3); g.fillStyle = '#2a1a06'; g.fillRect(7, 13, 2, 2);
    g.fillStyle = '#ffd45e'; g.fillRect(1, 6, 2, 1); g.fillRect(14, 10, 2, 1); g.fillRect(3, 17, 2, 1);
    g.fillStyle = PAL.out; g.fillRect(2, 6, 1, 1); g.fillRect(15, 10, 1, 1); g.fillRect(4, 17, 1, 1);
  }, { solid: false });

  d('sapling1', 16, 16, 1, 1, g => {
    shadow(g, 8, 15, 3, 1);
    g.fillStyle = PAL.out; g.fillRect(7, 9, 2, 6); g.fillStyle = PAL.trunk; g.fillRect(7, 10, 1, 5);
    g.fillStyle = PAL.out; g.fillRect(3, 8, 5, 3); g.fillRect(8, 6, 5, 3);
    g.fillStyle = PAL.leafL; g.fillRect(3, 8, 4, 2); g.fillStyle = PAL.leaf; g.fillRect(9, 6, 4, 2);
  }, { solid: false });

  d('sapling2', 16, 24, 1, 1, g => {
    shadow(g, 8, 23, 4, 1.5);
    g.fillStyle = PAL.out; g.fillRect(7, 12, 3, 11); g.fillStyle = PAL.trunk; g.fillRect(8, 13, 1, 10);
    circle(g, 8, 10, 6, PAL.out); circle(g, 8, 10, 5, PAL.leaf); circle(g, 6, 8, 2, PAL.leafL);
    g.fillStyle = PAL.out; g.fillRect(2, 15, 5, 3); g.fillStyle = PAL.leafL; g.fillRect(2, 15, 4, 2);
  }, { solid: false });

  d('sapling3', 16, 32, 1, 1, g => {
    shadow(g, 8, 31, 5, 2);
    g.fillStyle = PAL.out; g.fillRect(6, 17, 4, 14); g.fillStyle = PAL.trunk; g.fillRect(7, 18, 2, 13);
    g.fillStyle = '#54351b'; g.fillRect(7, 24, 2, 2);
    circle(g, 8, 12, 8, PAL.out); circle(g, 8, 12, 7, PAL.leaf);
    circle(g, 5, 9, 3, PAL.leafL); circle(g, 11, 13, 2, PAL.leafL);
  }, { solid: false });
}

// ---------- node bookkeeping ----------
function addNode(ctx, o) {
  const def = OBJ[o.type]; if (!def) return;
  const d = ctx.O[o.type]; if (!d) return;
  const e = { o, def };
  for (let j = 0; j < d.fh; j++) for (let i = 0; i < d.fw; i++) ST.grid.set(tkey(o.x + i, o.y + j), e);
  ST.nodes.push(e);
}
function dropNode(ctx, o) {
  const d = ctx.O[o.type];
  if (d) for (let j = 0; j < d.fh; j++) for (let i = 0; i < d.fw; i++) { const e = ST.grid.get(tkey(o.x + i, o.y + j)); if (e && e.o === o) ST.grid.delete(tkey(o.x + i, o.y + j)); }
  const i = ST.nodes.findIndex(e => e.o === o); if (i >= 0) ST.nodes.splice(i, 1);
}
// objects other systems may have removed (a chopped palm) must not linger in our grid
function pruneNodes(ctx) {
  const map = ctx.S.map; if (!map) return;
  const live = new Set(map.objects);
  for (const e of ST.nodes.slice()) if (!live.has(e.o)) dropNode(ctx, e.o);
  for (const p of ST.plants.slice()) if (p.o && !live.has(p.o)) p.o = null;
}

// ---------- spawning ----------
function spotsFor(ctx, map, rng, n, reach, test, solidNode) {
  const out = []; let tries = 0;
  while (out.length < n && tries++ < 4000) {
    const x = 3 + ((rng() * (map.w - 6)) | 0), y = 3 + ((rng() * (map.h - 6)) | 0);
    if (!okSpot(ctx, map, x, y, reach)) continue;
    if (solidNode && !walkSide(ctx, map, x, y, reach)) continue;
    if (test && !test(x, y)) continue;
    if (out.some(p => Math.abs(p.x - x) < 3 && Math.abs(p.y - y) < 3)) continue;
    out.push({ x, y });
  }
  return out;
}
function spawnZone(ctx) {
  const map = ctx.S.map, id = ctx.S.zone.id;
  const rng = rngFrom((hashStr(id) ^ ((Math.random() * 0x7fffffff) | 0)) >>> 0);
  const reach = reachOf(ctx, map);
  const npcTiles = ctx.allNpcs().map(n => ({ x: Math.floor(n.x / TS), y: Math.floor(n.y / TS) }));
  const clearOfNpc = (x, y) => !npcTiles.some(p => Math.abs(p.x - x) <= 1 && Math.abs(p.y - y) <= 1);
  const count = (a, b) => a + ((rng() * (b - a + 1)) | 0);

  if (!ctx.S.map.sea && id !== 'trench') {   /* plan-18: mỏ đá Seismic ở mọi vùng đất (ngoài khu quốc gia), 3–5 mỏ */
    for (const s of spotsFor(ctx, map, rng, count(3, 5), reach, clearOfNpc, true)) if (!ctx.plotOf(s.x, s.y)) addNode(ctx, ctx.place(map, 'seisvein', s.x, s.y, { node: 'seisvein' }));
  }
  if (id === 'm4' || id === 'm5') {
    const n = id === 'm4' ? count(10, 14) : count(4, 6);
    for (const s of spotsFor(ctx, map, rng, n, reach, clearOfNpc, true)) addNode(ctx, ctx.place(map, 'orevein', s.x, s.y, { node: 'orevein' }));
  }
  if (id === 'm7') {
    for (const s of spotsFor(ctx, map, rng, count(6, 8), reach, clearOfNpc, true)) addNode(ctx, ctx.place(map, 'obsvein', s.x, s.y, { node: 'obsvein' }));
  }
  if (id === 'm3') {
    const trees = map.objects.filter(o => o.type === 'tree' && o.plot === undefined && o.x > 2 && o.y > 2 && o.x < map.w - 3 && o.y < map.h - 3);
    const nearTree = (x, y) => trees.some(o => Math.abs(o.x - x) <= 2 && Math.abs(o.y - y) <= 2);
    for (const s of spotsFor(ctx, map, rng, count(6, 10), reach, (x, y) => clearOfNpc(x, y) && nearTree(x, y), false)) addNode(ctx, ctx.place(map, 'mushroom', s.x, s.y, { node: 'mushroom' }));
    // beehives hang on 3–4 trees the player can actually walk up to
    const hosts = trees.filter(o => !isRoad(map, o.x, o.y) && !inPlot(map, o.x, o.y, 1) && walkSide(ctx, map, o.x, o.y, reach) && !(o.x >= 39 && o.x <= 41));
    const want = count(3, 4);
    for (let k = 0; k < want && hosts.length; k++) {
      const h = hosts.splice((rng() * hosts.length) | 0, 1)[0];
      if (map.objects.some(o => o.type === 'beehive' && o.x === h.x && o.y === h.y)) continue;
      addNode(ctx, ctx.place(map, 'beehive', h.x, h.y, { node: 'beehive', host: h }));
    }
  }
  // map objects that are already gatherable (rocks, bushes, palms, pines, crystals)
  for (const o of map.objects) {
    if (!OBJ[o.type] || o.node) continue;
    if (o.plot !== undefined || o.ore || o.item) continue;                       // district pieces & quest objects are off-limits
    if (o.x < 2 || o.y < 2 || o.x >= map.w - 2 || o.y >= map.h - 2) continue;    // keep the border frame intact
    addNode(ctx, o);
  }
}

// ---------- planting ----------
function restorePlants(ctx) {
  const map = ctx.S.map, list = plantsOf(ctx); if (ctx.clock) clockRef = ctx.clock;
  for (const rec of list) {
    if (clockRef && rec.t0 > 1e11) rec.t0 = clockRef.fromRealMs(rec.t0);   /* save cũ: t0 = Date.now() thật → đổi sang ms game, giữ thời gian đã lớn, cây không chết */
    const st = Math.max(0, Math.min(3, Math.floor((nowMs() - rec.t0) / 1000 / GROW)));
    if (ctx.isSolid(map, rec.x, rec.y) || ctx.hasObjectAt(map, rec.x, rec.y)) { ST.plants.push({ rec, o: null, st }); continue; }
    const o = st >= 3 ? ctx.place(map, 'tree', rec.x, rec.y, { planted: true }) : ctx.place(map, STAGES[st], rec.x, rec.y, { node: 'sapling' });
    ST.plants.push({ rec, o, st });
  }
}
function plantable(ctx, tx, ty) {
  const map = ctx.S.map, g0 = ctx.getG(map, tx, ty);
  if (g0 !== T.GRASS && g0 !== T.GRASS2 && g0 !== T.FLOWER) return false;
  if (isRoad(map, tx, ty) || ctx.plotAt(tx, ty) >= 0 || inPlot(map, tx, ty, 0)) return false;
  return !ctx.hasObjectAt(map, tx, ty) && !ctx.isSolid(map, tx, ty);
}
function doPlant(ctx, tx, ty) {
  const t = L(ctx), map = ctx.S.map;
  if (!ctx.bag.has('seed', 1)) return;
  ctx.bag.remove('seed', 1);
  const list = plantsOf(ctx);
  while (list.length >= MAX_PLANTS) list.shift();
  const rec = { x: tx, y: ty, t0: nowMs() };
  list.push(rec);
  const o = ctx.place(map, 'sapling1', tx, ty, { node: 'sapling' });
  ST.plants.push({ rec, o, st: 0 });
  ctx.sfx('build'); ctx.toast(t.planted); ctx.persist();
  burst(ctx, tx * TS + 8, ty * TS + 12, 6, [PAL.leafL, PAL.leaf, PAL.dirt]);
}
function growPlants(ctx) {
  const map = ctx.S.map; if (!map) return;
  const t = L(ctx);
  for (const p of ST.plants) {
    const st = Math.max(0, Math.min(3, Math.floor((nowMs() - p.rec.t0) / 1000 / GROW)));
    if (st === p.st && p.o) continue;
    p.st = st;
    if (!p.o) continue;                                                   // spot was blocked on entry
    if (st >= 3) {
      if (p.o.type === 'tree') continue;
      const x = p.o.x, y = p.o.y;
      ctx.removeObject(map, p.o);
      p.o = ctx.place(map, 'tree', x, y, { planted: true });
      burst(ctx, x * TS + 8, y * TS + 4, 10, [PAL.leafL, PAL.leaf, '#ffd45e']);
      ctx.sfx('craft'); ctx.toast(t.grown);
    } else if (p.o.type !== STAGES[st]) {
      p.o.type = STAGES[st];
      burst(ctx, p.o.x * TS + 8, p.o.y * TS + 8, 5, [PAL.leafL, PAL.leaf]);
    }
  }
}

// ---------- particles ----------
function burst(ctx, wx, wy, n, cols) {
  const R = Math.random;
  for (let i = 0; i < n; i++) ST.parts.push({
    x: wx + (R() - 0.5) * 8, y: wy - R() * 5,
    vx: (R() - 0.5) * 60, vy: -22 - R() * 34, g: 130,
    t: 0.3 + R() * 0.35, s: 2, c: cols[(R() * cols.length) | 0]
  });
}

// ---------- gathering ----------
function toolOk(ctx, def) { return !def.tool || ctx.tool.tier(def.tool) >= (def.min || 1); }
function giveOut(ctx, def) {
  const list = def.pair ? def.pair.map(p => [p[0], p[1]])
    : [[def.item, def.n + (def.bonus && ctx.tool.tier(def.tool) >= 2 ? 1 : 0)]];
  let any = 0; const parts = [];
  for (const [id, n] of list) { const got = ctx.bag.add(id, n); if (got > 0) { any += got; parts.push(`+${got} ${ctx.itemIcon(id)} ${ctx.itemName(id)}`); } }
  if (any && def.seed && Math.random() < SEED_CHANCE && ctx.bag.add('seed', 1) > 0) parts.push(`+1 ${ctx.itemIcon('seed')} ${ctx.itemName('seed')}`);
  if (parts.length) { ctx.toast(parts.join('  ')); if (ctx.pop) ctx.pop(ctx.S.player.x, ctx.S.player.y - 18, parts.map(s => s.split(' ').slice(0, 2).join(' ')).join('  ')); }
  return any;
}
function startAct(ctx, label, dur, wx, wy, run, by) {
  const p = ctx.S.player;
  ST.act = { label, t: 0, dur, wx, wy, by: by === undefined ? wy - 16 : by, px: p.x, py: p.y, run };
  if (p.act && p.faceTo) { p.faceTo(wx, wy); const clip = /mine|ore|obs|crystal|stone|đào|quặng|đá|khoáng/i.test(label) ? 'mine' : 'chop'; /* nhãn đã dịch EN/VI */ if (p.hasAct(clip)) p.act(clip, dur, true); }   // clip PixelLab (lặp tới khi xong)
}
function finishAct(ctx) {
  const a = ST.act; ST.act = null; if (ctx.S.player.endAct) ctx.S.player.endAct(); if (!a) return;
  try { a.run(); } catch (e) { console.error('gather', e); }
}

function objInteract(ctx, o, def, wx, wy) {
  const t = L(ctx), map = ctx.S.map;
  if (!toolOk(ctx, def)) { ctx.toast(t[def.need] || t.needPick); ctx.sfx('fail'); return; }
  const hits = def.hits || 1, d0 = ctx.O[o.type];
  const bar = (o.y + d0.fh) * TS - d0.h - 14;                            // just above the sprite, clear of the hit pips
  startAct(ctx, t[def.label], def.dur || 1, wx, wy, () => {
    if (!map.objects.includes(o)) return;
    ctx.sfx(def.snd || 'hit');
    burst(ctx, wx, wy - 4, hits > 1 ? 6 : 8, def.kind === 'ore' ? ['#ffb03a', '#c96a16', '#5f5a68']
      : def.kind === 'obs' ? ['#8a5cff', '#2c2440', '#ffffff']
        : def.kind === 'cry' ? ['#d9c8ff', '#3fbfe6', '#ffffff']
          : def.kind === 'rock' ? [PAL.stone, PAL.stoneD, PAL.stoneL]
            : [PAL.leafL, PAL.leaf, PAL.gold]);
    o.gh = (o.gh || 0) + 1;
    if (o.gh < hits) return;
    if (!giveOut(ctx, def)) { o.gh = hits - 1; return; }                 // bag full → leave the node standing
    ctx.sfx('pickup');
    if (def.remove) { dropNode(ctx, o); ctx.removeObject(map, o); }
    else { o.gh = 0; setCd(zb(ctx).o, okey(def, o), def.cd || 60); }
    ctx.persist();
  }, bar);
}

function tileNode(ctx, tx, ty) {
  const t = L(ctx), map = ctx.S.map, id = ctx.S.zone.id, b = zb(ctx);
  const g0 = ctx.getG(map, tx, ty);
  if (id === 'm1' && (g0 === T.SAND || g0 === T.SAND2) && ctx.tool.tier('shovel') >= 1 && !cdLeft(b.t, 'sand:' + tx + ',' + ty))
    return { kind: 'sand', label: t.digSand, tx, ty, dur: 1.2 };
  if (id === 'm8' && g0 === T.ICE && ctx.tool.tier('pickaxe') >= 1 && !cdLeft(b.t, 'ice:' + tx + ',' + ty))
    return { kind: 'ice', label: t.chipIce, tx, ty, dur: 1.2 };
  if (id === 'm7' && ctx.tool.tier('bucket') >= 1 && !cdLeft(b.t, 'lava') && nextToLava(ctx, tx, ty))
    return { kind: 'lava', label: t.scoopLava, tx, ty, dur: 1.4 };
  if (g0 === T.FLOWER)
    return { kind: 'flower', label: t.pickFlowers, tx, ty, dur: 0.9 };
  if ((g0 === T.GRASS || g0 === T.GRASS2) && ctx.tool.tier('scythe') >= 1 && !cdLeft(b.t, 'hay:' + tx + ',' + ty))
    return { kind: 'hay', label: t.cutHay, tx, ty, dur: 1.0 };
  if (ctx.bag.has('seed', 1) && plantable(ctx, tx, ty))
    return { kind: 'plant', label: t.plant, tx, ty, dur: 0.8 };
  return null;
}
function nextToLava(ctx, tx, ty) {
  const m = ctx.S.map;
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (ctx.getG(m, tx + dx, ty + dy) === T.LAVA) return true;
  return false;
}
function tileInteract(ctx, n) {
  const t = L(ctx), map = ctx.S.map, b = zb(ctx);
  const wx = n.tx * TS + 8, wy = n.ty * TS + 10, bar = n.ty * TS - 6;
  if (n.kind === 'lava' && ctx.tool.tier('bucket') < 2) { ctx.toast(t.meltBucket); ctx.sfx('fail'); return; }
  if (n.kind === 'plant') { if (ctx.trespass && !ctx.trespass(n.tx, n.ty, 'plant')) return; startAct(ctx, n.label, n.dur, wx, wy, () => doPlant(ctx, n.tx, n.ty), bar); return; }   /* plan-18: trồng cây khu nước khác */
  startAct(ctx, n.label, n.dur, wx, wy, () => {
    if (n.kind === 'sand') {
      if (!giveOut(ctx, { item: 'sand', n: 2 })) return;
      setCd(b.t, 'sand:' + n.tx + ',' + n.ty, CD_SAND); ctx.sfx('pickup');
      burst(ctx, wx, wy, 7, [PAL.sand, PAL.sandD, '#fff3d0']);
    } else if (n.kind === 'ice') {
      if (!giveOut(ctx, { item: 'ice', n: 1 })) return;
      setCd(b.t, 'ice:' + n.tx + ',' + n.ty, CD_ICE); ctx.sfx('hit');
      burst(ctx, wx, wy, 7, ['#bfe3ff', '#ffffff', '#8fd3ff']);
    } else if (n.kind === 'hay') {
      if (!giveOut(ctx, { item: 'hay', n: 2 })) return;
      setCd(b.t, 'hay:' + n.tx + ',' + n.ty, CD_HAY); ctx.sfx('chop'); dropCropSeed(ctx);
      burst(ctx, wx, wy, 7, ['#d9c07a', PAL.grassD, PAL.grass2]);
    } else if (n.kind === 'flower') {
      if (!giveOut(ctx, { item: 'flower', n: 1 })) return;
      ctx.setG(map, n.tx, n.ty, T.GRASS, false); ctx.sfx('pickup');
      burst(ctx, wx, wy, 7, [PAL.flowerA, PAL.flowerB, PAL.flowerC]);
    } else if (n.kind === 'lava') {
      if (!giveOut(ctx, { item: 'lava', n: 1 })) return;
      setCd(b.t, 'lava', CD_LAVA); ctx.sfx('splash');
      burst(ctx, wx, wy, 8, ['#ffb03a', '#e8541e', '#a8300e']);
    }
    ctx.persist();
  }, bar);
}

// ---------- the system ----------
export const gather = {
  id: 'gather',

  onZoneEnter(ctx) {
    ensureSprites(ctx);
    ST.grid.clear(); ST.nodes.length = 0; ST.plants.length = 0; ST.parts.length = 0;
    ST.act = null; ST.prune = 0;
    const map = ctx.S.map; if (!map || !ctx.S.zone) return;
    ST.zone = ctx.S.zone.id; if (ctx.clock) clockRef = ctx.clock;   /* đặt clockRef TRƯỚC pruneCd để quy đổi cooldown save cũ */
    pruneCd(ctx);
    try { spawnZone(ctx); } catch (e) { console.error('gather spawn', e); }
    try { restorePlants(ctx); } catch (e) { console.error('gather plants', e); }
    ctx.persist();
  },

  onZoneLeave() { ST.act = null; ST.grid.clear(); ST.nodes.length = 0; ST.plants.length = 0; ST.parts.length = 0; },

  update(dt, ctx) {
    for (let i = ST.parts.length - 1; i >= 0; i--) {
      const p = ST.parts[i]; p.t -= dt;
      if (p.t <= 0) { ST.parts.splice(i, 1); continue; }
      p.x += p.vx * dt; p.y += p.vy * dt; p.vy += p.g * dt;
    }
    if (!ctx.S.map || !ctx.S.zone) return;
    if (ST.act) {
      const p = ctx.S.player;
      if (ctx.S.mode !== 'play' || Math.hypot(p.x - ST.act.px, p.y - ST.act.py) > 8) { ST.act = null; if (p.endAct) p.endAct(); }
      else { ST.act.t += dt; if (ST.act.t >= ST.act.dur) finishAct(ctx); }
    }
    growPlants(ctx);
    ST.prune -= dt;
    if (ST.prune <= 0) {
      ST.prune = 1.5;
      pruneNodes(ctx);
      pruneCd(ctx);
      // a hive whose tree was chopped down goes with it
      for (const e of ST.nodes.slice()) {
        if (e.o.type !== 'beehive') continue;
        if (!ctx.S.map.objects.includes(e.o.host)) { dropNode(ctx, e.o); ctx.removeObject(ctx.S.map, e.o); }
      }
    }
  },

  near(ctx) {
    if (ctx.S.mode !== 'play') return null;
    const p = ctx.S.player, map = ctx.S.map; if (!p || !map || !ctx.S.zone) return null;
    const t = L(ctx);
    if (ST.act) return { label: ST.act.label, x: ST.act.wx, y: ST.act.wy, limit: 96, priority: true, data: { busy: true } };

    // 1) object nodes around the player
    const tx = Math.floor(p.x / TS), ty = Math.floor(p.y / TS);
    let best = null, bd = Infinity;
    const b = zb(ctx);
    for (let y = ty - 2; y <= ty + 2; y++) for (let x = tx - 2; x <= tx + 2; x++) {
      const e = ST.grid.get(tkey(x, y)); if (!e) continue;
      const o = e.o, def = e.def, d = ctx.O[o.type]; if (!d) continue;
      if (def.cd && cdLeft(b.o, okey(def, o)) > 0) continue;            // cooling → leave it to trees.js / nobody
      const wx = o.x * TS + d.fw * 8, wy = (o.y + d.fh) * TS - (d.fh > 1 ? 8 : 4);
      const dist = Math.hypot(wx - p.x, wy - p.y), lim = 22 + d.fw * 4;
      if (dist < lim && dist < bd) { bd = dist; best = { o, def, wx, wy, lim }; }
    }
    if (best && !map.objects.includes(best.o)) { dropNode(ctx, best.o); best = null; }
    if (best) return {
      label: t[best.def.label], x: best.wx, y: best.wy, limit: best.lim,
      priority: !!best.def.priority, data: { o: best.o, def: best.def, wx: best.wx, wy: best.wy }
    };

    // 2) tile nodes — reported 25 px "away" so NPCs, signs and trees keep winning
    const n = tileNode(ctx, tx, ty);
    if (n) return { label: n.label, x: p.x + TILE_BIAS, y: p.y, limit: TILE_BIAS + 15, data: { tile: n } };
    return null;
  },

  interact(ctx, cand) {
    const d = cand && cand.data; if (!d || d.busy || ST.act) return;
    if (d.tile) { tileInteract(ctx, d.tile); return; }
    if (d.o) objInteract(ctx, d.o, d.def, d.wx, d.wy);
  },

  draw(g, ctx, cx, cy) {
    const map = ctx.S.map; if (!map) return;
    const b = zb(ctx), t = nowMs();
    const x0 = cx - 24, y0 = cy - 24, x1 = cx + ctx.VW + 24, y1 = cy + ctx.VH + 24;

    // tile marks left by harvesting: stubble on mown grass, a hollow in dug sand, a chip in the ice
    for (const k in b.t) {
      if (b.t[k] <= t) continue;
      const c = k.indexOf(':'); if (c < 0) continue;
      const kind = k.slice(0, c), pos = k.slice(c + 1).split(',');
      const tx = +pos[0], ty = +pos[1]; if (!isFinite(tx) || !isFinite(ty)) continue;
      const sx = tx * TS - cx, sy = ty * TS - cy;
      if (tx * TS < x0 || tx * TS > x1 || ty * TS < y0 || ty * TS > y1) continue;
      if (kind === 'hay') {
        g.fillStyle = '#b9a35e';
        for (const [ox, oy] of [[3, 11], [6, 13], [9, 10], [12, 12], [5, 8]]) g.fillRect(sx + ox, sy + oy, 1, 3);
        g.fillStyle = 'rgba(120,100,50,.25)'; g.fillRect(sx + 2, sy + 12, 12, 2);
      } else if (kind === 'sand') {
        g.fillStyle = 'rgba(120,96,50,.35)'; g.beginPath(); g.ellipse(sx + 8, sy + 9, 5, 3, 0, 0, 7); g.fill();
        g.fillStyle = PAL.sandD; g.fillRect(sx + 3, sy + 11, 10, 1);
      } else if (kind === 'ice') {
        g.fillStyle = 'rgba(255,255,255,.75)'; g.fillRect(sx + 4, sy + 6, 7, 1); g.fillRect(sx + 6, sy + 7, 1, 4);
        g.fillStyle = 'rgba(80,140,190,.35)'; g.fillRect(sx + 4, sy + 10, 8, 2);
      }
    }

    // object marks: ripe berries, fresh cuts on palms / pines, a quiet hive
    for (const e of ST.nodes) {
      const o = e.o, def = e.def, d = ctx.O[o.type]; if (!d) continue;
      const ox = o.x * TS, oy = (o.y + d.fh) * TS - d.h;
      if (ox < x0 || ox > x1 || oy < y0 - 32 || oy > y1) continue;
      const sx = ox - cx, sy = oy - cy;
      const cooling = def.cd ? cdLeft(b.o, okey(def, o)) : 0;
      if (def.kind === 'berry' && !cooling) {
        g.fillStyle = '#b3123a';
        for (const [px, py] of [[4, 7], [10, 6], [7, 11], [11, 10]]) { g.fillRect(sx + px, sy + py, 2, 2); }
        g.fillStyle = '#ff5a7a'; g.fillRect(sx + 4, sy + 7, 1, 1); g.fillRect(sx + 10, sy + 6, 1, 1);
      } else if ((def.kind === 'leaf' || def.kind === 'resin') && cooling) {
        const cy2 = sy + d.h - 10;                                       // a notch on the trunk while it heals
        g.fillStyle = PAL.out; g.fillRect(sx + 6, cy2, 5, 3);
        g.fillStyle = '#d8b57c'; g.fillRect(sx + 6, cy2, 4, 2);
        if (def.kind === 'resin') { g.fillStyle = '#e8a33a'; g.fillRect(sx + 8, cy2 + 3, 1, 3); }
      } else if (def.kind === 'honey' && !cooling) {
        g.fillStyle = 'rgba(255,212,94,.5)';
        g.fillRect(sx + 2 + ((ctx.S.time * 6) % 3 | 0), sy + 4, 1, 1);
        g.fillRect(sx + 13 - ((ctx.S.time * 5) % 3 | 0), sy + 9, 1, 1);
      }
    }

    for (const p of ST.parts) { g.fillStyle = p.c; g.fillRect(Math.round(p.x - cx), Math.round(p.y - cy), p.s, p.s); }
  },

  drawUI(ug, ctx, cx, cy, scale) {
    const a = ST.act;
    ug.save();
    // hit pips on multi-hit nodes
    const near = ctx.S.near;
    const pips = ST.nodes.filter(e => (e.o.gh || 0) > 0 && (e.def.hits || 1) > 1).map(e => e);
    if (near && near.kind === 'sys' && near.sys === gather && near.cand && near.cand.data && near.cand.data.o) {
      const d0 = near.cand.data;
      if ((d0.def.hits || 1) > 1 && !pips.some(e => e.o === d0.o)) pips.push({ o: d0.o, def: d0.def });
    }
    const r = Math.max(2, scale * 1.0), gap = r * 3;
    for (const e of pips) {
      const d = ctx.O[e.o.type]; if (!d) continue;
      const wx = e.o.x * TS + d.fw * 8, wy = (e.o.y + d.fh) * TS - d.h - 8;
      const sx = Math.round((wx - cx) * scale), sy = Math.round((wy - cy) * scale);
      if (sx < -60 || sx > ug.canvas.width + 60 || sy < -30 || sy > ug.canvas.height + 30) continue;
      const hits = e.def.hits || 1;
      for (let i = 0; i < hits; i++) {
        const x = sx + (i - (hits - 1) / 2) * gap;
        ug.beginPath(); ug.arc(x, sy, r, 0, 7);
        ug.fillStyle = i < (e.o.gh || 0) ? '#ffd45e' : 'rgba(13,11,20,.65)'; ug.fill();
        ug.strokeStyle = 'rgba(13,11,20,.85)'; ug.lineWidth = Math.max(1, scale / 3); ug.stroke();
      }
    }
    // progress bar for the running action
    if (a) {
      const sx = Math.round((a.wx - cx) * scale), sy = Math.round((a.by - cy) * scale);
      const w = Math.round(13 * scale), h = Math.max(4, Math.round(2.4 * scale));
      const k = Math.max(0, Math.min(1, a.t / a.dur));
      ug.fillStyle = 'rgba(13,11,20,.78)';
      ug.beginPath(); ug.roundRect(sx - w / 2 - 2, sy - 2, w + 4, h + 4, 3); ug.fill();
      ug.strokeStyle = 'rgba(255,212,94,.55)'; ug.lineWidth = 1; ug.stroke();
      ug.fillStyle = '#3a3346'; ug.fillRect(sx - w / 2, sy, w, h);
      ug.fillStyle = '#ffd45e'; ug.fillRect(sx - w / 2, sy, Math.round(w * k), h);
      ug.fillStyle = 'rgba(255,255,255,.5)'; ug.fillRect(sx - w / 2, sy, Math.round(w * k), 1);
      const fs = Math.max(11, Math.round(scale * 3.2));
      ug.font = `bold ${fs}px "Segoe UI",system-ui,sans-serif`; ug.textAlign = 'center'; ug.textBaseline = 'bottom';
      ug.lineWidth = Math.max(2, scale); ug.strokeStyle = 'rgba(13,11,20,.85)'; ug.lineJoin = 'round';
      ug.strokeText(a.label, sx, sy - 5); ug.fillStyle = '#f2ebe0'; ug.fillText(a.label, sx, sy - 5);
    }
    ug.restore();
  }
};
