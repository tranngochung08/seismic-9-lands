// items.js — the item registry shared by every system. Bag = save.inv (id → count); weight-limited.
const I = (icon, en, vi, w, tags = '') => ({ icon, name: { en, vi }, w, tags: tags.split(' ').filter(Boolean) });
export const ITEMS = {
  wood: I('🪵', 'Wood', 'Gỗ', 1, 'material'), stone: I('🪨', 'Seismic stone', 'Đá Seismic', 0, 'currency'), rock: I('🧱', 'Building stone', 'Đá xây', 2, 'material'),
  ore: I('⛏', 'Iron ore', 'Quặng sắt', 2, 'material'), charcoal: I('🔥', 'Charcoal', 'Than', 1, 'material fuel'), iron: I('🔩', 'Iron bar', 'Thanh sắt', 2, 'material'),
  sand: I('🏖', 'Sand', 'Cát', 1, 'material'), glass: I('🪟', 'Glass', 'Kính', 1, 'material'), rope: I('🪢', 'Rope', 'Dây thừng', 1, 'material'),
  hay: I('🌾', 'Hay', 'Rơm', 1, 'material feed'), leaf: I('🌿', 'Palm leaf', 'Lá cọ', 0.3, 'material'), resin: I('🟠', 'Resin', 'Nhựa thông', 0.5, 'material'),
  seed: I('🌰', 'Seed', 'Hạt giống', 0.2, 'material'), flower: I('🌸', 'Flower', 'Hoa', 0.2, 'material dye'),
  egg: I('🥚', 'Egg', 'Trứng', 0.5, 'food'), milk: I('🥛', 'Milk', 'Sữa', 1, 'food'), berry: I('🍓', 'Berries', 'Quả', 0.5, 'food'), mushroom: I('🍄', 'Mushroom', 'Nấm', 0.5, 'food'),
  honey: I('🍯', 'Honey', 'Mật ong', 1, 'food'), meat: I('🥩', 'Meat', 'Thịt', 1, 'food'), wax: I('🕯', 'Wax', 'Sáp', 0.5, 'material'),
  wool: I('🐑', 'Wool', 'Len', 1, 'material'), fur: I('🧶', 'Fur', 'Lông thú', 0.5, 'material'), feather: I('🪶', 'Feather', 'Lông chim', 0.2, 'material'), tusk: I('🦷', 'Tusk', 'Ngà', 1, 'material'),
  obsidian: I('🖤', 'Obsidian', 'Obsidian', 2, 'material'), ice: I('❄', 'Ice crystal', 'Băng tinh', 1, 'material'), crystal: I('💎', 'Crystal', 'Tinh thể', 1, 'material'), lava: I('🌋', 'Lava sample', 'Mẫu dung nham', 3, 'material'),
  wormhide: I('🐛', 'Worm hide', 'Da sâu cát', 0, 'trophy'), firescale: I('🔥', 'Fire scale', 'Vảy lửa', 0, 'trophy'), yetifur: I('🦣', 'Yeti fur', 'Lông Yeti', 0, 'trophy'), greatcrystal: I('🔮', 'Great crystal', 'Đại tinh thể', 0, 'trophy'),
  // the sea
  plank: I('🪵', 'Driftwood plank', 'Ván gỗ trôi', 1, 'material sea'), sailcloth: I('⛵', 'Sailcloth', 'Vải buồm', 1, 'material sea'), pearl: I('🫧', 'Pearl', 'Ngọc trai', 0.2, 'material sea'),
  shell: I('🐚', 'Sea shell', 'Vỏ sò', 0.3, 'material sea'), seagem: I('🔷', 'Sea crystal', 'Tinh thể biển', 1, 'material sea'), ink: I('🦑', 'Kraken ink', 'Mực Kraken', 0, 'trophy sea'),
  bottle: I('🍾', 'Message bottle', 'Chai thư', 0.5, 'sea'), squid: I('🦑', 'Squid', 'Mực', 0, 'carry'), goldfish: I('🐠', 'Golden fish', 'Cá vàng', 0, 'carry'),
  // the storyline (weight 0: they never block the bag; never sold)
  scarf: I('🧣', "Lyron's scarf", 'Khăn của Lyron', 0, 'story'), divebell: I('🔔', 'Diving bell', 'Chuông lặn', 0, 'story'), trenchmap: I('🗺', 'Map of the Kraken Trench', 'Bản đồ Vực Kraken', 0, 'story'),
  // F02/F03 (plan-17 đợt 1): hạt 'seed_<crop>' + nông sản (tag crop, mùa trong 'season' + tag 'spring|summer|autumn|winter|any'), sản phẩm chuồng, vật đặt được (tag placeable — pens.js/farm.js đặt)
  seed_turnip: I('🌰', 'Turnip seeds', 'Hạt củ cải', 0.1, 'seed spring'), seed_strawberry: I('🌰', 'Strawberry seeds', 'Hạt dâu', 0.1, 'seed spring'),
  seed_tomato: I('🌰', 'Tomato seeds', 'Hạt cà chua', 0.1, 'seed summer'), seed_corn: I('🌰', 'Corn seeds', 'Hạt bắp', 0.1, 'seed summer'),
  seed_pumpkin: I('🌰', 'Pumpkin seeds', 'Hạt bí đỏ', 0.1, 'seed autumn'), seed_yam: I('🌰', 'Yam seeds', 'Hạt khoai lang', 0.1, 'seed autumn'),
  seed_starmush: I('🌰', 'Star mushroom spores', 'Bào tử nấm sao', 0.1, 'seed any'), seed_quakeflower: I('🌰', 'Quakeflower seeds', 'Hạt hoa dư chấn', 0.1, 'seed any'),
  turnip: I('🥔', 'Turnip', 'Củ cải', 0.5, 'crop food spring'), strawberry: I('🍓', 'Strawberry', 'Dâu', 0.3, 'crop food spring'),
  tomato: I('🍅', 'Tomato', 'Cà chua', 0.4, 'crop food summer'), corn: I('🌽', 'Corn', 'Bắp', 0.5, 'crop food summer'),
  pumpkin: I('🎃', 'Pumpkin', 'Bí đỏ', 1, 'crop food autumn'), yam: I('🍠', 'Yam', 'Khoai lang', 0.5, 'crop food autumn'),
  starmush: I('🍄', 'Star mushroom', 'Nấm sao', 0.3, 'crop food any'), quakeflower: I('🌼', 'Quakeflower', 'Hoa dư chấn', 0.2, 'crop dye any'),
  fur_rabbit: I('🐇', 'Rabbit fur', 'Lông thỏ', 0.3, 'material animal'),
  pen1: I('🏚', 'Wooden pen', 'Chuồng gỗ', 3, 'placeable pen'), pen2: I('🏛', 'Stone pen', 'Chuồng đá', 4, 'placeable pen'), scarecrow: I('🧍', 'Rocky scarecrow', 'Bù nhìn Rocky', 2, 'placeable'),
  // legacy head-carry mirrors (animals live on the player's head, not in the bag; weight 0 so they never block the bag)
  fish: I('🐟', 'Fish', 'Cá', 0, 'carry'), cow: I('🐄', 'Cow', 'Bò', 0, 'carry'), chicken: I('🐔', 'Chicken', 'Gà', 0, 'carry'), bird: I('🐦', 'Bird', 'Chim', 0, 'carry'),
  sheep: I('🐏', 'Sheep', 'Cừu', 0, 'carry'), rabbit: I('🐰', 'Rabbit', 'Thỏ', 0, 'carry'), crab: I('🦀', 'Crab', 'Cua', 0, 'carry'), bat: I('🦇', 'Bat', 'Dơi', 0, 'carry'),
};
// Tools have tiers: 0 = not owned, 1..3 = wood/iron/obsidian quality. `save.toolTier`.
export const TOOLS = {
  axe: I('🪓', 'Axe', 'Rìu', 0), pickaxe: I('⛏', 'Pickaxe', 'Cuốc', 0), rod: I('🎣', 'Fishing rod', 'Cần câu', 0), shovel: I('🥄', 'Shovel', 'Xẻng', 0), scythe: I('🌾', 'Scythe', 'Liềm', 0),
  knife: I('🔪', 'Knife', 'Dao', 0), bucket: I('🪣', 'Bucket', 'Xô', 0), cage: I('🧺', 'Cage', 'Lồng', 0), cart: I('🛒', 'Livestock cart', 'Xe chở vật nuôi', 0), lasso: I('🪢', 'Lasso', 'Thòng lọng', 0), trap: I('🪤', 'Trap', 'Bẫy', 0), saddle: I('🐎', 'Saddle', 'Yên ngựa', 0), torch: I('🔦', 'Torch', 'Đuốc', 0)
};
export const BAG_CAP = 60;
export function itemName(id, lang) { const d = ITEMS[id] || TOOLS[id]; return d ? d.name[lang] || d.name.en : id; }
export function itemIcon(id) { const d = ITEMS[id] || TOOLS[id]; return d ? d.icon : '▪'; }
