// items.js — the item registry shared by every system. Bag = save.inv (id → count); UNLIMITED (anh chốt 2026-10-10: túi vô hạn, field w giữ lại nhưng không dùng).
const I = (icon, en, vi, w, tags = '') => ({ icon, name: { en, vi }, w, tags: tags.split(' ').filter(Boolean) });
export const ITEMS = {
  /* plan-21: đồ rơi của quái + hồi sinh dân */
  soul: I('✨', 'Soul spark', 'Tinh hồn', 0.1, 'material monster'), revive: I('🕯', 'Revival tinder', 'Bùi nhùi hồi sinh', 0.3, 'revive'),
  gel: I('🟢', 'Slime gel', 'Nhựa nhầy', 0.2, 'material monster'), claw: I('🦀', 'Crab claw', 'Càng cua', 0.3, 'material monster'), fang: I('🦷', 'Wolf fang', 'Nanh sói', 0.2, 'material monster'),
  core: I('🪨', 'Rock imp core', 'Lõi yêu đá', 0.5, 'material monster'), stinger: I('🦂', 'Scorpion stinger', 'Ngòi bọ cạp', 0.2, 'material monster'), ember: I('🔥', 'Imp ember', 'Than imp', 0.2, 'material monster'),
  shard: I('💠', 'Glitch shard', 'Mảnh mã hoá', 0.1, 'material monster'),
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
  /* plan-26 B0: viên thở dưới nước (Heathcliff bán ở cầu tàu) — cộng giây thở, đồng hồ thở chỉ chạy khi ở dưới nước */
  /* plan-28: viên hồi máu (thưởng bạn tập trên đường đèo) — ăn như đồ ăn, hồi heal × máu tối đa (hotbar.js / menu.js) */
  pill_hp: { ...I('❤', 'Healing pill', 'Viên hồi máu', 0.1, 'food heal'), heal: 0.45, desc: { vi: 'Ăn để hồi 45 % máu tối đa.', en: 'Eat to restore 45% of your max health.' } },
  pill_s: I('💊', 'Small breath pill', 'Viên thở nhỏ', 0.1, 'pill breath'), pill_l: I('🧪', 'Large breath pill', 'Viên thở lớn', 0.2, 'pill breath'),
  /* 2026-10-11: Súng Hóa Đá — Xealist tặng khi theo phe Xealist (systems/petgun.js). desc: mô tả hiện ở túi đồ */
  petgun: { ...I('🔫', 'Petrify Gun', 'Súng Hóa Đá', 0, 'story weapon'), desc: {
    vi: 'Chỉ bắn khi đang cầm (E / click, 6 ô, hồi 2 giây). Sức súng = 40 + 10 × cấp (dưới nước còn một nửa). Kẻ YẾU (dân thường, thú, quái có máu ≤ sức súng) hóa đá vĩnh viễn; kẻ MẠNH chỉ đứng hình 0,15–3 giây (trùm tối đa 0,4 giây). Vật thể xám đá một lúc rồi trở lại.',
    en: 'Only fires while held (E / click, 6 tiles, 2 s recharge). Power = 40 + 10 × level (halved underwater). The WEAK (villagers, animals, monsters with max HP ≤ power) turn to stone for good; the STRONG only freeze for 0.15–3 s (bosses at most 0.4 s). Objects go stone-grey for a moment, then change back.' } },
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
/* plan-28: NGỌC RỒNG — 7 viên (7 sao → 1 sao), rơi khi thắng bạn tập cơ bắp (systems/roadloot.js). Công dụng khi gom đủ 7: chờ anh chốt. */
for (let n = 1; n <= 7; n++) ITEMS['dball' + n] = { ...I('🟠', `${n}-Star Dragon Ball`, `Ngọc Rồng ${n} sao`, 0, 'trophy dragonball'),
  desc: { vi: `Viên ngọc cam trong suốt, ${n} ngôi sao đỏ bên trong. Gom đủ 7 viên… chuyện gì sẽ xảy ra? (sắp có)`, en: `A clear orange orb with ${n} red star${n > 1 ? 's' : ''} inside. Gather all 7… and then? (coming soon)` } };
// Tools have tiers: 0 = not owned, 1..3 = wood/iron/obsidian quality. `save.toolTier`.
export const TOOLS = {
  axe: I('🪓', 'Axe', 'Rìu', 0), pickaxe: I('⛏', 'Pickaxe', 'Cuốc', 0), rod: I('🎣', 'Fishing rod', 'Cần câu', 0), shovel: I('🥄', 'Shovel', 'Xẻng', 0), scythe: I('🌾', 'Scythe', 'Liềm', 0),
  knife: I('🔪', 'Knife', 'Dao', 0), torch: I('🔦', 'Torch', 'Đuốc', 0),   /* 2026-10-11 anh bỏ xe chở vật nuôi, thòng lọng, bẫy, yên ngựa (save.js dropBucket gỡ khỏi save cũ) */
  sword: I('⚔', 'Sword', 'Kiếm', 0)   /* plan-21: 6 cấp (gỗ → đá → sắt → obsidian → pha lê → Seismic) */
};
/* 2026-10-10 anh yêu cầu: bắt được thú → phím T ném vào ô trống. Thú trong túi mang mã riêng 'a_<loài>' (tên + icon như thú trên đầu) */
export const ANIMAL_KINDS = ['fish', 'cow', 'chicken', 'bird', 'sheep', 'rabbit', 'crab', 'bat', 'squid', 'goldfish'];
for (const k of ANIMAL_KINDS) if (ITEMS[k]) ITEMS['a_' + k] = { ...ITEMS[k], tags: ['animal'], w: 0 };
ITEMS.a_fishbig = { ...ITEMS.a_fish, name: { en: 'Big fish', vi: 'Cá to' } };   /* 2026-10-11 anh bỏ XÔ: cá câu được vào thẳng túi; cá to giữ mã riêng (giá cao, nhiệm vụ 'cá to') */
export const BAG_CAP = 60;
/* plan-26 B0: giây thở mỗi viên + giá (đá Seismic) ở quầy Heathcliff; cộng dồn tối đa BREATH_CAP giây */
export const PILLS = { pill_s: { secs: 60, price: 20 }, pill_l: { secs: 180, price: 50 } };
export const BREATH_CAP = 600;
export function itemName(id, lang) { const d = ITEMS[id] || TOOLS[id]; return d ? d.name[lang] || d.name.en : id; }
export function itemIcon(id) { const d = ITEMS[id] || TOOLS[id]; return d ? d.icon : '▪'; }
