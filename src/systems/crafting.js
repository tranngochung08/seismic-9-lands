// crafting.js — crafting stations, recipes and the bag panel (see API.md)
//  · Five procedural stations are parked beside the plaza of the lands that need them:
//    workbench (village/M2/M3), furnace (M4/M5), loom (M2/M6), forge (M7/M8), crystal altar (M9).
//  · E at a station opens its recipe list: inputs are bag items, outputs are bag items,
//    tool tiers (ctx.tool.set) or progress flags other systems read (save.sys.*).
//  · B anywhere opens the bag: every item with its weight, owned tools with tiers, and the flags.
import { PAL, TS, circle } from '../gfx.js';

// ---------- text ----------
const ROMAN = ['', 'I', 'II', 'III'];
const STR = {
  en: {
    st: { bench: 'Workbench', furnace: 'Furnace', loom: 'Loom', forge: 'Forge', altar: 'Crystal altar' },
    craft: 'Craft', close: 'Close', owned: 'Owned ✓', needPrev: t => `Needs ${t}`, short: 'Not enough',
    made: 'Made', have: 'have', bag: 'Bag', items: 'Items', tools: 'Tools', flags: 'Progress',
    empty: 'Your bag is empty.', noTools: 'No tools yet — craft one at a workbench.',
    weight: 'weight', cap: 'Bag load', hint: 'B · bag',
    names: {
      axe1: 'Axe I', pick1: 'Pickaxe I', shovel: 'Shovel', scythe: 'Scythe', knife: 'Knife', torch: 'Torch',
      bucket1: 'Bucket', rope: 'Rope', lasso: 'Lasso', trap: 'Trap', saddle: 'Saddle', raft: 'Raft', wax: 'Ski wax',
      cage1: 'Cage I', cart1: 'Livestock cart I', cage2: 'Iron cage II', cart2: 'Iron-wheel cart II', bucket3: 'Crystal bucket III', cage3: 'Obsidian cage III', cart3: 'Obsidian cart III',
      charcoal: 'Charcoal', iron: 'Iron bar', glass: 'Glass', axe2: 'Axe II', pick2: 'Pickaxe II', rod2: 'Fishing rod II', bucket2: 'Iron bucket',
      sail: 'Sail', cape: 'Rocky cape', coat: 'Warm coat',
      axe3: 'Axe III', pick3: 'Pickaxe III', tires: 'Obsidian tires', armor: 'Rocky armour', lavaglass: 'Lava glass',
      lamp: 'Crystal lamp', charge: 'Rocky charge', rod3: 'Fishing rod III',
      pen1: 'Wooden pen', pen2: 'Stone pen', scarecrow: 'Rocky scarecrow'
    },
    notes: {
      rope: 'Braided palm leaves', lasso: 'Catch big animals', trap: 'Set it for small game', saddle: 'Ride a horse',
      raft: 'Cross open water', wax: 'Ski down the snow', charcoal: 'Furnace fuel', bucket1: 'Holds 3 fish', bucket2: 'Holds 5 fish · lava-proof', bucket3: 'Holds 8 fish',
      cage1: 'Holds 3 small animals', cage2: 'Holds 5 small animals', cage3: 'Holds 8 small animals', cart1: 'Hauls 2 cows/sheep', cart2: 'Hauls 4 cows/sheep', cart3: 'Hauls 6 cows/sheep',
      sail: 'Faster raft', cape: 'Rocky glides', coat: 'Survive the cold', tires: 'Drive over lava rock',
      armor: 'Rocky takes hits', lavaglass: 'Melted with lava', lamp: 'Lights the core', charge: 'Wakes a Rocky',
      pen1: 'Place it in your nation\'s plot · 4 small / 2 big animals', pen2: 'Twice the room', scarecrow: 'Keeps birds off the crops'
    },
    fl: { raft: 'Raft', sail: 'Sail', wax: 'Ski wax', tires: 'Obsidian tires', cape: 'Rocky cape', armor: 'Rocky armour', coat: 'Warm coat', lamps: 'Crystal lamps', charged: 'Rocky charges' }
  },
  vi: {
    st: { bench: 'Bàn mộc', furnace: 'Lò nung', loom: 'Khung dệt', forge: 'Lò rèn', altar: 'Bàn thờ tinh thể' },
    craft: 'Chế tạo', close: 'Đóng', owned: 'Đã có ✓', needPrev: t => `Cần ${t}`, short: 'Không đủ',
    made: 'Đã làm', have: 'có', bag: 'Túi đồ', items: 'Vật phẩm', tools: 'Dụng cụ', flags: 'Tiến độ',
    empty: 'Túi đang trống.', noTools: 'Chưa có dụng cụ — chế ở bàn mộc.',
    weight: 'nặng', cap: 'Tải túi', hint: 'B · túi đồ',
    names: {
      axe1: 'Rìu I', pick1: 'Cuốc I', shovel: 'Xẻng', scythe: 'Liềm', knife: 'Dao', torch: 'Đuốc',
      bucket1: 'Xô', rope: 'Dây thừng', lasso: 'Thòng lọng', trap: 'Bẫy', saddle: 'Yên ngựa', raft: 'Bè', wax: 'Sáp trượt',
      cage1: 'Lồng I', cart1: 'Xe chở vật nuôi I', cage2: 'Lồng sắt II', cart2: 'Xe bánh sắt II', bucket3: 'Xô tinh thể III', cage3: 'Lồng obsidian III', cart3: 'Xe obsidian III',
      charcoal: 'Than', iron: 'Thanh sắt', glass: 'Kính', axe2: 'Rìu II', pick2: 'Cuốc II', rod2: 'Cần câu II', bucket2: 'Xô sắt',
      sail: 'Buồm', cape: 'Áo choàng Rocky', coat: 'Áo ấm',
      axe3: 'Rìu III', pick3: 'Cuốc III', tires: 'Lốp obsidian', armor: 'Giáp Rocky', lavaglass: 'Kính dung nham',
      lamp: 'Đèn tinh thể', charge: 'Pin Rocky', rod3: 'Cần câu III',
      pen1: 'Chuồng gỗ', pen2: 'Chuồng đá', scarecrow: 'Bù nhìn Rocky'
    },
    notes: {
      rope: 'Bện từ lá cọ', lasso: 'Bắt thú lớn', trap: 'Đặt bẫy thú nhỏ', saddle: 'Cưỡi ngựa',
      raft: 'Vượt mặt nước', wax: 'Trượt trên tuyết', charcoal: 'Nhiên liệu lò', bucket1: 'Đựng 3 cá', bucket2: 'Đựng 5 cá · chịu dung nham', bucket3: 'Đựng 8 cá',
      cage1: 'Nhốt 3 thú nhỏ', cage2: 'Nhốt 5 thú nhỏ', cage3: 'Nhốt 8 thú nhỏ', cart1: 'Chở 2 bò/cừu', cart2: 'Chở 4 bò/cừu', cart3: 'Chở 6 bò/cừu',
      sail: 'Bè chạy nhanh hơn', cape: 'Rocky lượn được', coat: 'Chịu lạnh', tires: 'Chạy trên đá lửa',
      armor: 'Rocky chịu đòn', lavaglass: 'Nấu bằng dung nham', lamp: 'Thắp sáng lõi', charge: 'Đánh thức Rocky',
      pen1: 'Đặt trong plot nước mình · 4 thú nhỏ / 2 gia súc', pen2: 'Chứa gấp đôi', scarecrow: 'Đuổi chim khỏi ruộng'
    },
    fl: { raft: 'Bè', sail: 'Buồm', wax: 'Sáp trượt', tires: 'Lốp obsidian', cape: 'Áo choàng Rocky', armor: 'Giáp Rocky', coat: 'Áo ấm', lamps: 'Đèn tinh thể', charged: 'Pin Rocky' }
  }
};
const L = ctx => STR[ctx.lang() === 'vi' ? 'vi' : 'en'];
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const nw = n => (Math.round(n * 10) / 10).toString();

// ---------- stations ----------
const STATIONS = {
  bench: { obj: 'craft_bench', icon: '🛠', zones: ['village', 'm2', 'm3'] },
  furnace: { obj: 'craft_furnace', icon: '🔥', zones: ['m4', 'm5'] },
  loom: { obj: 'craft_loom', icon: '🧵', zones: ['m2', 'm6'] },
  forge: { obj: 'craft_forge', icon: '⚒', zones: ['m7', 'm8'] },
  altar: { obj: 'craft_altar', icon: '🔮', zones: ['m9'] }
};

// ---------- recipes ----------
// in: bag items · tool/tier: ctx.tool.set · flag: save.sys[a][b] = true · count: save.sys[a][b]++
const RECIPES = [
  // --- workbench ---
  { id: 'axe1', st: 'bench', icon: '🪓', tool: 'axe', tier: 1, in: { wood: 5 } },
  { id: 'pick1', st: 'bench', icon: '⛏', tool: 'pickaxe', tier: 1, in: { wood: 6, rock: 2 } },
  { id: 'shovel', st: 'bench', icon: '🥄', tool: 'shovel', tier: 1, in: { wood: 4 } },
  { id: 'scythe', st: 'bench', icon: '🌾', tool: 'scythe', tier: 1, in: { wood: 3, rock: 1 } },
  { id: 'knife', st: 'bench', icon: '🔪', tool: 'knife', tier: 1, in: { rock: 2, wood: 1 } },
  { id: 'torch', st: 'bench', icon: '🔦', tool: 'torch', tier: 1, in: { wood: 2, resin: 1 } },
  { id: 'bucket1', st: 'bench', icon: '🪣', tool: 'bucket', tier: 1, in: { wood: 3, resin: 1 } },
  { id: 'rope', st: 'bench', icon: '🪢', item: 'rope', n: 1, in: { leaf: 3 } },
  { id: 'lasso', st: 'bench', icon: '🪢', tool: 'lasso', tier: 1, in: { rope: 3 } },
  { id: 'trap', st: 'bench', icon: '🪤', tool: 'trap', tier: 1, in: { wood: 4, rope: 2 } },
  { id: 'saddle', st: 'bench', icon: '🐎', tool: 'saddle', tier: 1, in: { fur: 2, rope: 2, wood: 1 } },
  { id: 'cage1', st: 'bench', icon: '🧺', tool: 'cage', tier: 1, in: { wood: 4, rope: 2 } },
  { id: 'cart1', st: 'bench', icon: '🛒', tool: 'cart', tier: 1, in: { wood: 8, rope: 3 } },
  { id: 'raft', st: 'bench', icon: '🛶', flag: ['vehicles', 'raft'], in: { wood: 6, rope: 2 } },
  { id: 'wax', st: 'bench', icon: '🎿', flag: ['vehicles', 'wax'], in: { wax: 2 } },
  /* F03 (plan-17): chuồng & bù nhìn là VẬT PHẨM đặt được (tag placeable trong items.js) — pens.js / farm.js xử lý đặt xuống */
  { id: 'pen1', st: 'bench', icon: '🏚', item: 'pen1', n: 1, in: { wood: 12, rope: 4, rock: 2 } },
  { id: 'scarecrow', st: 'bench', icon: '🧍', item: 'scarecrow', n: 1, in: { wood: 10, hay: 5 } },
  // --- furnace ---
  { id: 'charcoal', st: 'furnace', icon: '🔥', item: 'charcoal', n: 2, in: { wood: 3 } },
  { id: 'iron', st: 'furnace', icon: '🔩', item: 'iron', n: 1, in: { ore: 2, charcoal: 1 } },
  { id: 'glass', st: 'furnace', icon: '🪟', item: 'glass', n: 1, in: { sand: 2, charcoal: 1 } },
  { id: 'axe2', st: 'furnace', icon: '🪓', tool: 'axe', tier: 2, in: { iron: 3, wood: 2 } },
  { id: 'pick2', st: 'furnace', icon: '⛏', tool: 'pickaxe', tier: 2, in: { iron: 3, wood: 2 } },
  { id: 'rod2', st: 'furnace', icon: '🎣', tool: 'rod', tier: 2, in: { iron: 1, rope: 2, wood: 2 } },
  { id: 'bucket2', st: 'furnace', icon: '🪣', tool: 'bucket', tier: 2, in: { iron: 2 } },
  { id: 'cage2', st: 'furnace', icon: '🧺', tool: 'cage', tier: 2, in: { iron: 3, rope: 2 } },
  { id: 'cart2', st: 'furnace', icon: '🛒', tool: 'cart', tier: 2, in: { iron: 3, wood: 4 } },
  { id: 'pen2', st: 'furnace', icon: '🏛', item: 'pen2', n: 1, in: { rock: 8, iron: 4 } },   /* F03: chuồng đá, sức chứa gấp đôi */
  // --- loom ---
  { id: 'sail', st: 'loom', icon: '⛵', flag: ['vehicles', 'sail'], in: { wool: 6, rope: 2 } },
  { id: 'cape', st: 'loom', icon: '🧣', flag: ['rocky', 'cape'], in: { wool: 5, flower: 3 } },
  { id: 'coat', st: 'loom', icon: '🧥', flag: ['ecology', 'coat'], in: { yetifur: 1, wool: 4 } },
  // --- forge ---
  { id: 'axe3', st: 'forge', icon: '🪓', tool: 'axe', tier: 3, in: { obsidian: 4, iron: 2 } },
  { id: 'pick3', st: 'forge', icon: '⛏', tool: 'pickaxe', tier: 3, in: { obsidian: 4, iron: 2 } },
  { id: 'tires', st: 'forge', icon: '🛞', flag: ['vehicles', 'tires'], in: { obsidian: 3, rope: 2 } },
  { id: 'armor', st: 'forge', icon: '🛡', flag: ['rocky', 'armor'], in: { wormhide: 1, obsidian: 4 } },
  { id: 'lavaglass', st: 'forge', icon: '🪟', item: 'glass', n: 5, in: { lava: 1, glass: 2 } },
  { id: 'cage3', st: 'forge', icon: '🧺', tool: 'cage', tier: 3, in: { obsidian: 2, iron: 2 } },
  { id: 'cart3', st: 'forge', icon: '🛒', tool: 'cart', tier: 3, in: { obsidian: 3, iron: 2 } },
  // --- crystal altar ---
  { id: 'lamp', st: 'altar', icon: '🏮', count: ['crafting', 'lamps'], in: { crystal: 2, glass: 1 } },
  { id: 'charge', st: 'altar', icon: '⚡', count: ['rocky', 'charged'], in: { crystal: 3 } },
  { id: 'rod3', st: 'altar', icon: '🎣', tool: 'rod', tier: 3, in: { crystal: 1, iron: 2, rope: 3 } },
  { id: 'bucket3', st: 'altar', icon: '🪣', tool: 'bucket', tier: 3, in: { crystal: 1, iron: 2 } }
];
const FLAG_ROWS = [
  ['vehicles', 'raft', '🛶'], ['vehicles', 'sail', '⛵'], ['vehicles', 'wax', '🎿'], ['vehicles', 'tires', '🛞'],
  ['rocky', 'cape', '🧣'], ['rocky', 'armor', '🛡'], ['ecology', 'coat', '🧥'],
  ['crafting', 'lamps', '🏮', 1], ['rocky', 'charged', '⚡', 1]
];

// ---------- procedural sprites (32×32, footprint 2×1) ----------
const px = (g, x, y, c, w = 1, h = 1) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
const shadow = g => { g.fillStyle = 'rgba(0,0,0,.28)'; g.beginPath(); g.ellipse(16, 30, 13, 3, 0, 0, 7); g.fill(); };
let spritesReady = false;
function ensureSprites(ctx) {
  if (spritesReady) return;
  spritesReady = true;
  // workbench — planked table, saw + hammer on top, stacked boards underneath
  ctx.defineObject(STATIONS.bench.obj, 32, 32, 2, 1, g => {
    shadow(g);
    px(g, 4, 5, PAL.out, 3, 5); px(g, 4, 5, PAL.stoneL, 2, 4);              // saw blade
    for (let x = 5; x < 15; x += 2) px(g, x, 9, PAL.stoneL, 1, 1);
    px(g, 6, 6, PAL.out, 9, 3); px(g, 6, 6, '#c9cbd6', 8, 2);
    px(g, 21, 3, PAL.out, 7, 4); px(g, 22, 4, PAL.stoneD, 5, 2);            // hammer head
    px(g, 23, 7, PAL.woodD, 2, 6);
    px(g, 1, 13, PAL.out, 30, 6); px(g, 2, 14, PAL.wood, 28, 4);            // table top
    px(g, 2, 16, '#6f4622', 28, 1); px(g, 10, 14, '#6f4622', 1, 4); px(g, 21, 14, '#6f4622', 1, 4);
    px(g, 3, 18, PAL.out, 4, 12); px(g, 4, 18, PAL.woodD, 2, 11);           // legs
    px(g, 25, 18, PAL.out, 4, 12); px(g, 26, 18, PAL.woodD, 2, 11);
    px(g, 6, 23, PAL.woodD, 20, 2); px(g, 6, 23, PAL.out, 20, 1);           // brace
    px(g, 9, 26, PAL.out, 14, 4); px(g, 10, 27, PAL.dirt, 12, 1); px(g, 10, 28, PAL.dirtD, 12, 1); // boards
    px(g, 17, 10, PAL.out, 2, 3); px(g, 17, 10, PAL.gold, 1, 3);            // chisel
  }, { solid: true });
  // furnace — stone block, arched mouth full of fire, smoking chimney
  ctx.defineObject(STATIONS.furnace.obj, 32, 32, 2, 1, g => {
    shadow(g);
    g.fillStyle = 'rgba(200,200,210,.18)'; circle(g, 23, 3, 3, 'rgba(210,210,220,.18)'); circle(g, 26, 0, 2, 'rgba(210,210,220,.14)');
    px(g, 19, 2, PAL.out, 9, 10); px(g, 20, 3, PAL.stoneD, 7, 9);            // chimney
    px(g, 20, 3, PAL.stone, 3, 9); px(g, 19, 2, PAL.stoneL, 9, 1);
    px(g, 2, 10, PAL.out, 28, 20); px(g, 3, 11, PAL.stone, 26, 18);          // body
    px(g, 3, 11, PAL.stoneL, 26, 2); px(g, 3, 27, PAL.stoneD, 26, 2);
    for (const [x, y] of [[5, 14], [12, 14], [24, 15], [6, 22], [25, 21], [13, 25]]) px(g, x, y, PAL.stoneD, 4, 3);
    px(g, 8, 15, PAL.out, 14, 14); px(g, 9, 16, '#2a1208', 12, 13);          // mouth
    px(g, 9, 19, '#b3300a', 12, 10); px(g, 10, 21, '#ff8c1a', 10, 8);        // fire
    px(g, 11, 23, PAL.gold, 8, 6); px(g, 13, 25, '#fff3d0', 4, 4);
    px(g, 12, 18, '#ff8c1a', 2, 3); px(g, 17, 17, '#ff8c1a', 2, 4);
    px(g, 4, 29, '#ff8c1a', 2, 1); px(g, 27, 29, '#ff8c1a', 2, 1);           // embers on the floor
  }, { solid: true });
  // loom — upright frame, warp threads, half-woven cloth and a shuttle
  ctx.defineObject(STATIONS.loom.obj, 32, 32, 2, 1, g => {
    shadow(g);
    px(g, 2, 2, PAL.out, 28, 4); px(g, 3, 3, PAL.wood, 26, 2);               // top beam
    px(g, 2, 25, PAL.out, 28, 5); px(g, 3, 26, PAL.wood, 26, 3);             // bottom beam
    px(g, 2, 2, PAL.out, 5, 28); px(g, 3, 3, PAL.woodD, 3, 26);              // uprights
    px(g, 25, 2, PAL.out, 5, 28); px(g, 26, 3, PAL.woodD, 3, 26);
    for (let x = 8; x <= 24; x += 2) px(g, x, 6, '#e8dcc0', 1, 19);          // warp threads
    px(g, 7, 18, PAL.out, 19, 8); px(g, 8, 19, '#b23a7a', 17, 6);            // woven cloth
    px(g, 8, 20, '#ffd45e', 17, 1); px(g, 8, 23, '#3d6db5', 17, 1);
    px(g, 9, 14, PAL.out, 12, 3); px(g, 10, 15, PAL.dirt, 10, 1);            // shuttle
    px(g, 22, 8, PAL.out, 5, 5); px(g, 23, 9, '#b48cff', 3, 3);              // yarn ball
  }, { solid: true });
  // forge — anvil on a stump beside a roaring coal fire
  ctx.defineObject(STATIONS.forge.obj, 32, 32, 2, 1, g => {
    shadow(g);
    px(g, 19, 20, PAL.out, 12, 10); px(g, 20, 21, PAL.stoneD, 10, 8);        // fire pit
    px(g, 20, 22, '#4a1a08', 10, 6); px(g, 21, 24, '#b3300a', 8, 5);
    px(g, 22, 25, '#ff8c1a', 6, 4); px(g, 24, 26, PAL.gold, 3, 3);
    px(g, 23, 14, '#ff8c1a', 3, 8); px(g, 21, 17, '#b3300a', 2, 5); px(g, 27, 16, '#b3300a', 2, 6);  // flames
    px(g, 24, 11, PAL.gold, 2, 4); px(g, 25, 8, '#fff3d0', 1, 3);
    px(g, 2, 21, PAL.out, 14, 9); px(g, 3, 22, PAL.woodD, 12, 7);            // stump
    px(g, 3, 22, PAL.wood, 12, 2);
    px(g, 2, 12, PAL.out, 15, 4); px(g, 3, 13, PAL.stone, 13, 2);            // anvil face
    px(g, 3, 13, PAL.stoneL, 13, 1); px(g, 3, 15, PAL.stoneD, 13, 1);
    px(g, 15, 13, PAL.out, 3, 3); px(g, 15, 13, PAL.stone, 2, 2);            // horn
    px(g, 7, 16, PAL.out, 6, 3); px(g, 8, 16, PAL.stoneD, 4, 3);             // waist
    px(g, 4, 18, PAL.out, 12, 3); px(g, 5, 19, PAL.stone, 10, 1); px(g, 5, 20, PAL.stoneD, 10, 1); // foot
    px(g, 8, 6, PAL.out, 3, 8); px(g, 8, 6, PAL.woodD, 2, 7);                 // hammer resting on it
    px(g, 5, 3, PAL.out, 9, 4); px(g, 6, 4, PAL.stoneD, 7, 2);
    px(g, 17, 10, PAL.gold, 1, 1); px(g, 14, 7, '#fff3d0', 1, 1);             // sparks
  }, { solid: true });
  // crystal altar — dark plinth, glowing runes, a floating purple crystal
  ctx.defineObject(STATIONS.altar.obj, 32, 32, 2, 1, g => {
    shadow(g);
    g.fillStyle = 'rgba(180,140,255,.16)'; circle(g, 16, 9, 10, 'rgba(180,140,255,.16)');
    circle(g, 16, 9, 6, 'rgba(180,140,255,.22)');
    for (let i = 0; i < 7; i++) {                                            // crystal body (diamond)
      px(g, 16 - i, 9 - i, '#7a5cd0', 1 + i * 2, 1);
      px(g, 16 - (6 - i), 10 + i, '#6a4fb2', 1 + (6 - i) * 2, 1);
    }
    px(g, 14, 5, '#d9c8ff', 2, 6); px(g, 17, 8, '#b48cff', 2, 5);
    px(g, 16, 2, '#ffffff', 1, 3);
    px(g, 4, 16, PAL.out, 24, 5); px(g, 5, 17, '#7a5cd0', 22, 3);            // top slab
    px(g, 5, 17, '#a98aea', 22, 1); px(g, 5, 19, '#5a4498', 22, 1);
    px(g, 7, 21, PAL.out, 18, 9); px(g, 8, 22, '#5a4790', 16, 7);            // plinth
    px(g, 8, 22, '#6f59ad', 16, 2); px(g, 8, 28, '#342a5c', 16, 1);
    for (const [x, y] of [[10, 24], [14, 24], [18, 24], [22, 24]]) { px(g, x, y, '#e0d2ff', 2, 1); px(g, x, y + 2, '#c0a6ff', 2, 1); }
    px(g, 2, 26, PAL.out, 3, 4); px(g, 2, 26, '#7a5cd0', 2, 3);              // little shards on the ground
    px(g, 27, 25, PAL.out, 3, 5); px(g, 27, 25, '#7a5cd0', 2, 4);
  }, { solid: true });
}

// ---------- module state ----------
const ST = {
  list: [],        // [{key, o}] stations in this zone
  parts: [],       // craft sparks
  anim: null,      // {o, t}
  mode: null,      // 'craft' | 'bag' | null
  station: null,   // station key while the craft panel is open
  el: null, bagEl: null, closers: false
};

// ---------- placement ----------
function objAt(ctx, map, x, y) {
  return map.objects.some(o => { const d = ctx.O[o.type]; return d && x >= o.x && x < o.x + d.fw && y >= o.y && y < o.y + d.fh; });
}
function free(ctx, map, x, y) {
  if (x < 1 || y < 1 || x >= map.w - 1 || y >= map.h - 1) return false;
  if (ctx.isSolid(map, x, y) || objAt(ctx, map, x, y)) return false;
  return !(map.reserved || []).some(r => Math.abs(r.x - x) <= 1 && Math.abs(r.y - y) <= 1);
}
// A free 2×1 spot with somewhere to stand in front. Market/trees park their stalls at x 30–34 / 46–50,
// so we take the outer plaza flanks first and only then widen the search.
const SPOTS = [];
for (const y of [8, 7, 9]) for (const x of [27, 52, 26, 51, 28, 53]) SPOTS.push({ x, y });
for (const y of [5, 4, 6]) for (const x of [27, 52, 24, 55, 29, 50]) SPOTS.push({ x, y });
function findSpot(ctx, map, taken) {
  const ok = (x, y) => free(ctx, map, x, y) && free(ctx, map, x + 1, y) &&
    (free(ctx, map, x, y + 1) || free(ctx, map, x + 1, y + 1)) &&
    !taken.some(t => Math.abs(t.x - x) < 3 && Math.abs(t.y - y) < 2);
  for (const s of SPOTS) if (ok(s.x, s.y)) return s;
  for (let y = 6; y <= 12; y++) for (let x = 20; x <= 58; x++) { if (x >= 30 && x <= 50) continue; if (ok(x, y)) return { x, y }; }
  for (let y = 12; y <= 16; y++) for (let x = 22; x <= 56; x++) if (ok(x, y)) return { x, y };
  return null;
}

// ---------- save helpers ----------
const sysOf = (ctx, k) => { const s = ctx.S.save; s.sys = s.sys || {}; return (s.sys[k] = s.sys[k] || {}); };
const flagGet = (ctx, f) => !!sysOf(ctx, f[0])[f[1]];
const cntGet = (ctx, f) => sysOf(ctx, f[0])[f[1]] || 0;
const rName = (ctx, r) => L(ctx).names[r.id] || r.id;

function missing(ctx, r) {
  const out = [];
  for (const [id, n] of Object.entries(r.in)) if (ctx.bag.count(id) < n) out.push(id);
  return out;
}
// 'owned' · 'needPrev' · 'short' · 'ok'
function stateOf(ctx, r) {
  if (r.tool) {
    const t = ctx.tool.tier(r.tool);
    if (t >= r.tier) return 'owned';
    if (t < r.tier - 1) return 'needPrev';
  }
  if (r.flag && flagGet(ctx, r.flag)) return 'owned';
  return missing(ctx, r).length ? 'short' : 'ok';
}

// ---------- craft panel ----------
const BS = 'width:auto;margin:0;padding:7px 12px;font-size:13px';
function inputsHTML(ctx, r) {
  return Object.entries(r.in).map(([id, n]) => {
    const have = ctx.bag.count(id), poor = have < n;
    return `<span class="chip" style="${poor ? 'color:#ff6b84;background:#3a2030' : 'color:#cbd5c0'}">${ctx.itemIcon(id)} ${esc(ctx.itemName(id))} ${have}/${n}</span>`;
  }).join(' ');
}
function recipeRow(ctx, r) {
  const t = L(ctx), st = stateOf(ctx, r), note = t.notes[r.id];
  let extra = '';
  if (r.item) extra = ` <span class="chip">×${r.n}</span>`;
  else if (r.count) extra = ` <span class="chip">${t.have} ${cntGet(ctx, r.count)}</span>`;
  let right;
  if (st === 'owned') right = `<span class="chip" style="color:#8ee07a">${t.owned}</span>`;
  else if (st === 'needPrev') right = `<span class="chip">${t.needPrev(`${ctx.TOOLS[r.tool].icon} ${esc(ctx.itemName(r.tool))} ${ROMAN[r.tier - 1]}`)}</span>`;
  else {
    const can = st === 'ok';
    right = `<button class="btn${can ? ' primary' : ''}" data-r="${r.id}"${can ? '' : ' disabled'} style="${BS}${can ? '' : ';opacity:.4;cursor:default'}">${t.craft}</button>`;
  }
  return `<div class="hrow">
    <span style="font-size:19px;width:22px;text-align:center">${r.icon}</span>
    <span class="hwho"><b>${esc(rName(ctx, r))}</b>${extra}
      <div style="margin-top:3px;line-height:1.7">${inputsHTML(ctx, r)}</div>
      ${note ? `<div class="dim tiny" style="margin-top:2px">${esc(note)}</div>` : ''}</span>
    ${right}</div>`;
}
function renderCraft(ctx) {
  const t = L(ctx), key = ST.station, s = STATIONS[key];
  const rows = RECIPES.filter(r => r.st === key).map(r => recipeRow(ctx, r)).join('');
  ST.el = ctx.panel('crafting', `<h2>${s.icon} ${esc(t.st[key])}<span class="chip">⚖ ${nw(ctx.bag.weight())}/${ctx.bag.cap()}</span></h2>
    <div class="scroll" id="cf-body">${rows}</div>
    <button class="btn" id="cf-close">${t.close}</button>`);
  ST.el.hidden = false;
  ST.el.querySelector('#cf-close').onclick = () => closePanels(ctx);
  ST.el.querySelector('#cf-body').onclick = e => {
    const b = e.target.closest('[data-r]'); if (!b || b.disabled) return;
    doCraft(ctx, b.getAttribute('data-r'));
  };
}
function doCraft(ctx, id) {
  const t = L(ctx), r = RECIPES.find(x => x.id === id); if (!r) return;
  if (stateOf(ctx, r) !== 'ok') { ctx.sfx('fail'); return; }
  for (const [k, n] of Object.entries(r.in)) ctx.bag.remove(k, n);
  let msg = `${r.icon} ${rName(ctx, r)}`;
  if (r.item) { const got = ctx.bag.add(r.item, r.n); msg = `+${got} ${ctx.itemIcon(r.item)} ${ctx.itemName(r.item)}`; }
  else if (r.tool) ctx.tool.set(r.tool, r.tier);
  else if (r.flag) { sysOf(ctx, r.flag[0])[r.flag[1]] = true; msg += ' ✓'; }
  else if (r.count) { const s = sysOf(ctx, r.count[0]); s[r.count[1]] = (s[r.count[1]] || 0) + 1; msg += ` ×${s[r.count[1]]}`; }
  ctx.persist();
  ctx.sfx('craft');
  ctx.toast(msg, !!(r.flag || r.tool));
  const o = ST.list.find(s2 => s2.key === ST.station);
  if (o) { ST.anim = { o: o.o, t: 1.2 }; sparks(o.o, 22); const pl = ctx.S.player, d = ctx.O[o.o.type]; if (pl.act && pl.hasAct('hammer')) { pl.faceTo((o.o.x + (d ? d.fw / 2 : 0.5)) * 16, (o.o.y + (d ? d.fh : 1)) * 16); pl.act('hammer', 1.2); } }
  renderCraft(ctx);
}
function sparks(o, n) {
  const cx = o.x * TS + 16, cy = o.y * TS + 4, R = Math.random;
  for (let i = 0; i < n; i++) ST.parts.push({
    x: cx + (R() - 0.5) * 18, y: cy + R() * 12,
    vx: (R() - 0.5) * 46, vy: -26 - R() * 34, g: 70,
    t: 0.5 + R() * 0.7, s: R() < 0.4 ? 2 : 1,
    c: [PAL.gold, '#fff3d0', '#ff8c1a', '#b48cff'][(R() * 4) | 0]
  });
}

// ---------- bag panel ----------
function bagHTML(ctx) {
  const t = L(ctx), inv = ctx.S.save.inv || {};
  const rows = [];
  for (const id of Object.keys(ctx.ITEMS)) {
    const n = inv[id] || 0; if (n <= 0) continue;
    const d = ctx.ITEMS[id], tot = d.w * n;
    rows.push(`<div class="hrow">
      <span style="font-size:18px;width:22px;text-align:center">${d.icon}</span>
      <span class="hwho"><b>${esc(ctx.itemName(id))}</b>${d.w ? ` <span class="dim tiny">${nw(d.w)} ${t.weight}</span>` : ''}</span>
      <span class="hnum"><b>×${n}</b><small>${d.w ? '⚖ ' + nw(tot) : '—'}</small></span></div>`);
  }
  const tools = [];
  for (const id of Object.keys(ctx.TOOLS)) {
    const tier = ctx.tool.tier(id); if (!tier) continue;
    tools.push(`<span class="chip" style="font-size:13px;color:#ffd45e">${ctx.TOOLS[id].icon} ${esc(ctx.itemName(id))} ${ROMAN[tier] || tier}</span>`);
  }
  const flags = FLAG_ROWS.map(([a, b, icon, isCount]) => {
    const v = isCount ? cntGet(ctx, [a, b]) : flagGet(ctx, [a, b]);
    const on = isCount ? v > 0 : v;
    return `<span class="chip" style="font-size:13px;${on ? 'color:#8ee07a' : 'opacity:.45'}">${icon} ${esc(t.fl[b])} ${on ? (isCount ? '×' + v : '✓') : '–'}</span>`;
  }).join(' ');
  const w = ctx.bag.weight(), cap = ctx.bag.cap(), pct = Math.min(100, Math.round(w / cap * 100));
  return `<h2>🎒 ${t.bag}<span class="chip">⚖ ${nw(w)}/${cap}</span></h2>
    <div style="height:8px;border-radius:5px;background:#241e34;overflow:hidden;margin:2px 0 6px">
      <div style="height:100%;width:${pct}%;background:${pct > 90 ? '#ff6b84' : '#ffd45e'}"></div></div>
    <div class="scroll">
      <h3>${t.items}</h3>
      ${rows.length ? rows.join('') : `<p class="dim" style="padding:8px 2px">${t.empty}</p>`}
      <h3>${t.tools}</h3>
      <div style="display:flex;flex-wrap:wrap;gap:5px;padding:2px">${tools.length ? tools.join('') : `<span class="dim tiny">${t.noTools}</span>`}</div>
      <h3>${t.flags}</h3>
      <div style="display:flex;flex-wrap:wrap;gap:5px;padding:2px 2px 6px">${flags}</div>
    </div>
    <button class="btn" id="bg-close">${t.close}</button>`;
}
function refreshBag(ctx) {
  ST.bagEl = ctx.panel('bag', bagHTML(ctx));
  ST.bagEl.querySelector('#bg-close').onclick = () => closePanels(ctx);
}
function openBag(ctx) {
  refreshBag(ctx);
  ST.bagEl.hidden = false;
  ST.mode = 'bag';
  ctx.setMode('bag');
  ensureClosers(ctx);
}
function ensureClosers(ctx) {
  if (ST.closers) return;
  ST.closers = true;
  ctx.registerCloser('craft', () => closePanels(ctx));
  ctx.registerCloser('bag', () => closePanels(ctx));
}
function closePanels(ctx) {
  if (ST.el) ST.el.hidden = true;
  if (ST.bagEl) ST.bagEl.hidden = true;
  const was = ST.mode;
  ST.mode = null; ST.station = null;
  if (was) ctx.setMode('play');
}

// ---------- system ----------
export const crafting = {
  id: 'crafting',

  onZoneEnter(ctx) {
    ensureSprites(ctx);
    closePanels(ctx);
    ST.list.length = 0; ST.parts.length = 0; ST.anim = null;
    const map = ctx.S.map, zone = ctx.S.zone && ctx.S.zone.id;
    if (!map || !zone) return;
    const taken = [];
    for (const key of Object.keys(STATIONS)) {
      const s = STATIONS[key];
      if (!s.zones.includes(zone)) continue;
      const spot = findSpot(ctx, map, taken);
      if (!spot) continue;
      taken.push(spot);
      ST.list.push({ key, o: ctx.place(map, s.obj, spot.x, spot.y, { craft: key }) });
    }
  },

  onZoneLeave(ctx) { closePanels(ctx); ST.list.length = 0; ST.parts.length = 0; ST.anim = null; },

  update(dt, ctx) {
    if (ST.mode) {                                   // keep an open panel in step with the bag (other systems change it too)
      ST.tick = (ST.tick || 0) + dt;
      if (ST.tick >= 0.25) {
        ST.tick = 0;
        const sig = JSON.stringify([ctx.S.save.inv, ctx.S.save.toolTier, ctx.S.save.sys.vehicles, ctx.S.save.sys.rocky, ctx.S.save.sys.ecology, ctx.S.save.sys.crafting]);
        if (sig !== ST.sig) { ST.sig = sig; if (ST.mode === 'craft') renderCraft(ctx); else refreshBag(ctx); }
      }
    }
    if (ST.anim) {
      ST.anim.t -= dt;
      if (ST.anim.t > 0 && Math.random() < dt * 14) sparks(ST.anim.o, 2);
      if (ST.anim.t <= 0) ST.anim = null;
    }
    for (let i = ST.parts.length - 1; i >= 0; i--) {
      const p = ST.parts[i]; p.t -= dt;
      if (p.t <= 0) { ST.parts.splice(i, 1); continue; }
      p.x += p.vx * dt; p.y += p.vy * dt; p.vy += p.g * dt;
    }
  },

  near(ctx) {
    if (ST.mode) return null;
    const p = ctx.S.player, map = ctx.S.map; if (!p || !map) return null;
    const t = L(ctx);
    let best = null, bd = Infinity;
    for (const s of ST.list) {
      if (!map.objects.includes(s.o)) continue;
      const x = s.o.x * TS + 16, y = (s.o.y + 1) * TS - 4, d = Math.hypot(x - p.x, y - p.y);
      if (d < 30 && d < bd) { bd = d; best = { label: t.st[s.key], x, y, limit: 30, data: s }; }
    }
    return best;
  },

  interact(ctx, cand) {
    const s = cand && cand.data; if (!s || ST.mode) return;
    ST.station = s.key; ST.mode = 'craft';
    ctx.setMode('craft');
    ensureClosers(ctx);
    renderCraft(ctx);
  },

  draw(g, ctx, cx, cy) {
    if (ST.anim) {                                   // soft heat glow over the working station
      const o = ST.anim.o, k = Math.max(0, ST.anim.t / 1.2);
      const a = (0.2 + Math.abs(Math.sin(ctx.S.time * 14)) * 0.3) * k;
      const gx = o.x * TS + 16 - cx, gy = (o.y + 1) * TS - 14 - cy;
      const grd = g.createRadialGradient(gx, gy, 1, gx, gy, 22);
      grd.addColorStop(0, `rgba(255,212,94,${a.toFixed(3)})`); grd.addColorStop(1, 'rgba(255,212,94,0)');
      g.save(); g.fillStyle = grd; g.beginPath(); g.arc(gx, gy, 22, 0, 7); g.fill(); g.restore();
    }
    for (const p of ST.parts) { g.fillStyle = p.c; g.fillRect(Math.round(p.x - cx), Math.round(p.y - cy), p.s, p.s); }
  },

  drawUI(ug, ctx, cx, cy, scale) {
    if (!ST.list.length) return;
    const t = L(ctx), map = ctx.S.map;
    ug.save();
    const fs = Math.max(10, scale * 3);
    ug.font = `bold ${fs}px "Segoe UI",system-ui,sans-serif`; ug.textAlign = 'center'; ug.textBaseline = 'bottom';
    for (const s of ST.list) {
      if (!map || !map.objects.includes(s.o)) continue;
      const sx = Math.round((s.o.x * TS + 16 - cx) * scale), sy = Math.round((s.o.y * TS - 18 - cy) * scale);
      if (sx < -160 || sx > ug.canvas.width + 160 || sy < -40 || sy > ug.canvas.height + 40) continue;
      const txt = `${STATIONS[s.key].icon} ${t.st[s.key]}`;
      const w = ug.measureText(txt).width + 10, h = fs + 6;
      ug.fillStyle = 'rgba(13,11,20,.72)'; ug.beginPath(); ug.roundRect(sx - w / 2, sy - h, w, h, 4); ug.fill();
      ug.strokeStyle = 'rgba(255,212,94,.5)'; ug.lineWidth = 1; ug.stroke();
      ug.fillStyle = '#ffd45e'; ug.fillText(txt, sx, sy - 3);
    }
    ug.restore();
  },

  key(code, ctx) {
    if (code !== 'KeyB') return false;
    if (!ctx.S.save || !ctx.S.map) return false;
    if (ST.mode === 'bag') { closePanels(ctx); return true; }
    if (ctx.S.mode !== 'play') return false;
    openBag(ctx);
    return true;
  },

  hudLines(ctx) {
    const out = [];
    for (const id of Object.keys(ctx.TOOLS)) {
      const tier = ctx.tool.tier(id); if (!tier) continue;
      out.push(`${ctx.TOOLS[id].icon}${ROMAN[tier] || tier}`);
    }
    return out.length ? [out.join(' ')] : [];
  }
};
