// market.js — the trader stall: sell what you are carrying on your head, buy a fishing rod. See systems/API.md.
import { getCarry, removeCarry, clearCarry } from './animals.js';

const STR = {
  en: {
    sign: 'Trader', near: 'Trade', title: 'Trader',
    lead: 'Sell anything in your bag for Seismic stones — and whatever you carry in your hands.',
    head: 'On your head', goods: 'Goods', shop: 'For sale',
    stones: 'Stones', sell: 'Sell', sell1: 'Sell 1', sellAll: 'Sell all', close: 'Close', buy: 'Buy', owned: 'Owned ✓',
    empty: 'Your head is empty — go catch something!',
    each: 'each', got: n => `+${n} Seismic stones`,
    rod: '🎣 Fishing rod', rodNote: 'Cast at any shore', gotRod: 'Fishing rod bought! Cast at the shore.',
    poor: 'Not enough stones — mine purple veins (bare hands), chop trees and sell the wood here, sell animals/fish, meet new artists',   /* plan-44 Q3 */
    firstMine: n => `First Seismic vein! +${n} 🪨 newcomer bonus — enough to start saving for a Sword (30 🪨)`,
    seeds: 'Seeds of the season', seedNote: 'sow on tilled soil in your district', gotSeed: n => `+1 ${n}`,
    names: { fish: '🐟 Fish', fishBig: '🐟 Big fish', chicken: '🐔 Chicken', bird: '🐦 Bird', cow: '🐄 Cow', sheep: '🐏 Sheep', rabbit: '🐰 Rabbit', crab: '🦀 Crab', bat: '🦇 Bat', wood: '🪵 Wood', squid: '🦑 Squid', goldfish: '🐠 Golden fish' }
  },
  vi: {
    sign: 'Thương nhân', near: 'Mua bán', title: 'Thương nhân',
    lead: 'Bán mọi vật phẩm trong túi lấy đá Seismic — và thứ đang bế trên tay.',
    head: 'Trên đầu bạn', goods: 'Hàng hóa', shop: 'Bán cho bạn',
    stones: 'Đá', sell: 'Bán', sell1: 'Bán 1', sellAll: 'Bán hết', close: 'Đóng', buy: 'Mua', owned: 'Đã có ✓',
    empty: 'Trên đầu chưa có gì — đi bắt thú đi!',
    each: 'mỗi cái', got: n => `+${n} đá Seismic`,
    rod: '🎣 Cần câu', rodNote: 'Thả câu ở bờ nước', gotRod: 'Đã mua cần câu! Ra bờ nước thả câu.',
    poor: 'Không đủ đá — đào mỏ tím (tay không), chặt cây rồi bán gỗ ở đây, bán thú/cá, gặp nghệ sĩ mới',   /* plan-44 Q3 */
    firstMine: n => `Mỏ đá Seismic đầu tiên! +${n} 🪨 thưởng người mới — gom đủ 30 🪨 là mua được Kiếm`,
    seeds: 'Hạt giống theo mùa', seedNote: 'gieo trên đất đã cày trong khu của bạn', gotSeed: n => `+1 ${n}`,
    names: { fish: '🐟 Cá', fishBig: '🐟 Cá to', chicken: '🐔 Gà', bird: '🐦 Chim', cow: '🐄 Bò', sheep: '🐏 Cừu', rabbit: '🐰 Thỏ', crab: '🦀 Cua', bat: '🦇 Dơi', wood: '🪵 Gỗ', squid: '🦑 Mực', goldfish: '🐠 Cá vàng' }
  }
};
const L = ctx => STR[ctx.lang() === 'vi' ? 'vi' : 'en'];

const PRICE = { fish: 2, fishBig: 5, chicken: 3, bird: 4, cow: 6, sheep: 5, rabbit: 3, crab: 3, bat: 4, wood: 1, squid: 4, goldfish: 12, pearl: 8, shell: 1, seagem: 5 };
for (const k of ['fish', 'chicken', 'bird', 'cow', 'sheep', 'rabbit', 'crab', 'bat', 'squid', 'goldfish']) PRICE['a_' + k] = PRICE[k];   /* thú đã ném vào túi (phím T) */
PRICE.a_fishbig = PRICE.fishBig;   /* 2026-10-11 bỏ xô: cá câu được vào thẳng túi, cá to giữ giá 5 */
const ROD_PRICE = 8;
const FIRST_BONUS = 8;   /* plan-44 Q3: 2 (mỏ) + 8 = 10 🪨 ở mỏ đầu tiên */
let VEINS = null, VT = 0;
/* F02: Thương nhân bán hạt 2 đá/hạt, chỉ hạt đúng mùa hiện tại (tag mùa hoặc 'any') */
const SEED_PRICE = 2;
const CROP_SEEDS = ['turnip', 'strawberry', 'tomato', 'corn', 'pumpkin', 'yam', 'starmush', 'quakeflower'];
function seedsOfSeason(ctx) {
  const season = ctx.season ? ctx.season() : 'spring', IT = ctx.ITEMS || {};
  return CROP_SEEDS.map(c => 'seed_' + c).filter(id => { const it = IT[id]; return it && (it.tags.includes('any') || it.tags.includes(season)); });
}
/* F02 (A0 thêm dòng, market.js thuộc tác nhân đợt 2): giá bán nông sản 3–8 🪨 + sản phẩm chuồng; trứng/sữa/len giữ để nấu/quà nên giá thấp */
Object.assign(PRICE, { turnip: 3, strawberry: 4, tomato: 4, corn: 5, pumpkin: 8, yam: 5, starmush: 6, quakeflower: 6, egg: 2, milk: 3, wool: 3, fur_rabbit: 3 });
const TILE = 16;
const keyOf = it => (it.kind === 'fish' && it.big ? 'fishBig' : it.kind);
const priceOf = it => PRICE[keyOf(it)] || 0;
/* c35-demban (anh 04/11): MỌI vật phẩm trong túi bán được lấy đá Seismic. Có giá trong PRICE → giữ; không có → theo loại (≈ 50 % giá mua nếu biết, tối thiểu 1).
   KHÔNG bán: tiền (stone), công cụ / kiếm / trang bị (tag tool + mã công cụ), đồ nhiệm vụ / cốt truyện (quest, story), Ngọc Rồng (sưu tầm), Bông Tai Hợp Thể. */
const SI = '<img src="assets/px/ui/items/stone.png" alt="" style="width:14px;height:14px;vertical-align:-2px;image-rendering:pixelated">';
const NOSELL_ID = new Set(['stone', 'bua', 'axe', 'pickaxe', 'rod', 'shovel', 'scythe', 'knife', 'torch', 'sword', 'ht_earring', 'divebell', 'trenchmap']);
const NOSELL_TAG = ['currency', 'tool', 'quest', 'story', 'dragonball'];
const BUYP = { pill_s: 20, pill_l: 50 };   /* giá mua đã biết (items.js PILLS) → bán nửa giá */
const TAGP = [['trophy', 10], ['book', 5], ['sky', 3], ['sea', 3], ['monster', 2], ['placeable', 3], ['revive', 3], ['crop', 3], ['food', 2], ['seed', 1], ['material', 1]];
function priceId(ctx, id) {
  if (PRICE[id]) return PRICE[id];
  const it = ctx.ITEMS && ctx.ITEMS[id]; if (!it || NOSELL_ID.has(id) || /^(sword|kiem|blade)/.test(id)) return 0;
  const tg = it.tags || []; if (NOSELL_TAG.some(t => tg.includes(t))) return 0;
  if (BUYP[id]) return Math.max(1, Math.round(BUYP[id] / 2));
  if (/^seed_/.test(id)) return Math.max(1, Math.round(SEED_PRICE / 2));
  for (const [t, p] of TAGP) if (tg.includes(t)) return p;
  return 1;
}
function goodsList(ctx, inv) {
  const base = GOODS.filter(id => id === 'wood' || inv[id] > 0);
  const more = Object.keys(inv).filter(id => !GOODS.includes(id) && typeof inv[id] === 'number' && inv[id] > 0 && priceId(ctx, id) > 0).sort();
  return base.concat(more);
}

let stall = null;   // the placed object in the current map
let el = null;      // the panel element
let open = false;

// --- placement -----------------------------------------------------------
let OCC = null;   /* plan-42 A4: lưới ô có vật — chỉ bật trong lúc quét cả bản đồ (vòng quét không đặt / bớt vật) thay cho quét m.objects ở từng ô */
function withOcc(map, O, f) { const g = new Uint8Array(map.w * map.h); for (const o of map.objects) { const d = O[o.type]; if (!d) continue; for (let j = 0; j < d.fh; j++) for (let i = 0; i < d.fw; i++) { const x = o.x + i, y = o.y + j; if (x >= 0 && y >= 0 && x < map.w && y < map.h) g[y * map.w + x] = 1; } }
  const prev = OCC; OCC = { map, g, n: map.objects.length }; try { return f(); } finally { OCC = prev; } }
const occHit = (map, x, y) => OCC && OCC.map === map && OCC.n === map.objects.length && x >= 0 && y >= 0 && x < map.w && y < map.h ? OCC.g[y * map.w + x] : -1;
function objAt(ctx, map, tx, ty) {
  { const h = occHit(map, tx, ty); if (h >= 0) return h === 1; }
  return map.objects.some(o => { const d = ctx.O[o.type]; return d && tx >= o.x && tx < o.x + d.fw && ty >= o.y && ty < o.y + d.fh; });
}
function findSpot(ctx, map) { return withOcc(map, ctx.O, () => findSpot0(ctx, map)); }
function findSpot0(ctx, map) {
  const reach = ctx.computeReach(map, map.entries.default);
  const free = (x, y) => !ctx.isSolid(map, x, y) && !objAt(ctx, map, x, y);
  // 2×1 footprint, with somewhere to stand in front of it.
  // `strict` also wants that spot reachable from the south entrance — M5's chasm cuts the plaza off
  // until the bridge is up, so we fall back to the plain walkability test there.
  const mk = strict => {
    const walk = (x, y) => free(x, y) && (!strict || reach[y * map.w + x]);
    return (x, y) => free(x, y) && free(x + 1, y) && (walk(x, y + 1) || walk(x + 1, y + 1)) && !gateFront(x, y);
  };
  /* plan-43f (theme gateClear, hiện chỉ M4): người bán đứng ở (x+1, y+1,5) — không đứng trong làn cột cổng trên (cột q.x+4..q.x+5) ngay trên khu rào */
  const gateFront = (x, y) => !!(map.theme && map.theme.gateClear) && (map.plots || []).some(q => y + 1 >= q.y - 3 && y + 1 < q.y && (x + 1) * 16 + 5 > (q.x + 4) * 16 && (x + 1) * 16 - 5 < (q.x + 6) * 16);
  if (map.spots && map.spots.stall) { const s = map.spots.stall; if (mk(false)(s.x, s.y)) return { x: s.x, y: s.y }; }   /* p88: Làng mới — quầy ở mép Đông Nam quảng trường */
  for (const strict of [true, false]) {
    const ok = mk(strict);
    for (const y of [8, 7, 9]) for (const x of [47, 48, 49, 46, 50, 33, 32, 31, 30, 34]) if (ok(x, y)) return { x, y };
    for (const y of [9, 8]) for (const x of [44, 35, 36, 43, 45, 37]) if (ok(x, y)) return { x, y }; // inside the plaza itself
    for (let y = 6; y <= 11; y++) for (let x = 26; x <= 54; x++) { if (x >= 38 && x <= 41) continue; if (ok(x, y)) return { x, y }; }
  }
  return null;
}

// --- panel ---------------------------------------------------------------
const BS = 'width:auto;margin:0;padding:6px 10px;font-size:13px';
function carryRow(ctx, it, i) {
  const S = L(ctx), k = keyOf(it), p = priceOf(it);
  return `<div class="hrow">
    <span class="hwho"><b>${S.names[k]}</b> <span class="chip">${p} 🪨</span></span>
    <span class="hnum"></span>
    <button class="btn primary" data-i="${i}" style="${BS}">${S.sell}</button>
  </div>`;
}
// bag goods the trader buys: wood always, sea finds only once the player has some
const GOODS = ['wood', 'pearl', 'shell', 'seagem'];
GOODS.push('a_fish', 'a_fishbig', 'a_goldfish', 'a_squid');   /* cá trong túi (bỏ xô 2026-10-11) — chỉ hiện khi có */
GOODS.push('a_cow', 'a_sheep', 'a_chicken', 'a_bird', 'a_rabbit', 'a_crab', 'a_bat');   /* thú cất trong túi (phím T; bỏ lồng + xe chở 2026-10-11) — chỉ hiện khi có */
GOODS.push('turnip', 'strawberry', 'tomato', 'corn', 'pumpkin', 'yam', 'starmush', 'quakeflower', 'egg', 'milk', 'wool', 'fur_rabbit');   /* F02: nông sản bán được ở quầy (A0 thêm dòng) */
function goodsRow(ctx, id, n) {
  const S = L(ctx), dis = n > 0 ? '' : ' disabled';
  const bs = BS + (n > 0 ? '' : ';opacity:.35;cursor:default');
  const name = S.names[id] || `${ctx.itemIcon(id)} ${ctx.itemName(id)}`;
  return `<div class="hrow">
    <span class="hwho"><b>${name}</b> <span class="chip">${priceId(ctx, id)} ${SI} ${S.each}</span></span>
    <span class="hnum"><b>×${n}</b></span>
    <button class="btn" data-w="1" data-g="${id}" style="${bs}"${dis}>${S.sell1}</button>
    <button class="btn primary" data-w="all" data-g="${id}" style="${bs}"${dis}>${S.sellAll}</button>
  </div>`;
}
function rodRow(ctx) {
  const S = L(ctx), sv = ctx.S.save, has = !!(sv.tools && sv.tools.rod), stone = (sv.inv && sv.inv.stone) || 0;
  const can = !has && stone >= ROD_PRICE;
  const bs = BS + (can ? '' : ';opacity:.35;cursor:default');
  return `<div class="hrow">
    <span class="hwho"><b>${S.rod}</b> <span class="chip">${ROD_PRICE} ${SI}</span> <span class="dim">${S.rodNote}</span></span>
    <span class="hnum"></span>
    ${has ? `<span class="chip">${S.owned}</span>`
      : `<button class="btn primary" data-buy="rod" style="${bs}"${can ? '' : ' disabled'}>${S.buy}</button>`}
  </div>`;
}
function seedRow(ctx, id) {
  const S = L(ctx), inv = ctx.S.save.inv || {}, can = (inv.stone || 0) >= SEED_PRICE;
  const bs = BS + (can ? '' : ';opacity:.35;cursor:default');
  return `<div class="hrow">
    <span class="hwho"><b>${ctx.itemIcon(id)} ${ctx.itemName(id)}</b> <span class="chip">${SEED_PRICE} ${SI}</span></span>
    <span class="hnum"><b>×${inv[id] || 0}</b></span>
    <button class="btn primary" data-seed="${id}" style="${bs}"${can ? '' : ' disabled'}>${S.buy}</button>
  </div>`;
}
function buySeed(ctx, id) {
  const S = L(ctx), inv = ctx.S.save.inv;
  if (!seedsOfSeason(ctx).includes(id)) return;
  if ((inv.stone || 0) < SEED_PRICE) { ctx.toast(S.poor); return; }
  if (ctx.give(id, 1, stall ? stall.x * TILE + 16 : undefined, stall ? (stall.y + 2) * TILE : undefined) <= 0) return;   /* plan-24: đồ mua rơi trước mặt người bán */
  inv.stone -= SEED_PRICE; ctx.persist();
  ctx.toast(S.gotSeed(`${ctx.itemIcon(id)} ${ctx.itemName(id)}`));
  render(ctx);
}
function render(ctx) {
  const S = L(ctx), inv = ctx.S.save.inv || {}, carry = getCarry(ctx);
  const total = carry.reduce((a, it) => a + priceOf(it), 0);
  const html = `<h2>🏪 ${S.title}<span class="chip">${SI} ${inv.stone || 0}</span></h2>
    <div class="shopw"><div class="shop-side"><div class="shop-port"><img src="assets/px/ui/port_trader.png" alt=""></div><p class="shop-say">${S.lead}</p></div>   <!-- plan-22: quầy kiểu Stardew: chân dung + lời chào bên trái -->
    <div class="scroll shop-main">
      <div class="hrow" style="opacity:.7"><span class="hwho"><b>${S.head}</b></span><span class="hnum"></span>
        <button class="btn primary" data-i="all" style="${BS}${carry.length ? '' : ';opacity:.35;cursor:default'}"${carry.length ? '' : ' disabled'}>${S.sellAll}${total ? ` · +${total} ${SI}` : ''}</button></div>
      ${carry.length ? carry.map((it, i) => carryRow(ctx, it, i)).join('') : `<p class="dim" style="margin:6px 0 10px">${S.empty}</p>`}
      <div class="hrow" style="opacity:.7"><span class="hwho"><b>${S.goods}</b></span><span class="hnum"></span><span></span></div>
      ${goodsList(ctx, inv).map(id => goodsRow(ctx, id, inv[id] || 0)).join('')}
      <div class="hrow" style="opacity:.7"><span class="hwho"><b>${S.shop}</b></span><span class="hnum"></span><span></span></div>
      ${rodRow(ctx)}
      ${ctx.chanthuShopRow ? ctx.chanthuShopRow() : ''}
      <div class="hrow" style="opacity:.7"><span class="hwho"><b>${S.seeds}</b> <span class="dim">${S.seedNote}</span></span><span class="hnum"></span><span></span></div>
      ${seedsOfSeason(ctx).map(id => seedRow(ctx, id)).join('')}
    </div></div>
    <button class="btn" id="mk-close">${S.close}</button>`;
  el = ctx.panel('market', html); el.panel.classList.add('wide', 'shop');
  el.hidden = false;
  el.querySelector('#mk-close').onclick = () => close(ctx);
  for (const b of el.querySelectorAll('[data-i]')) b.onclick = () => sellCarry(ctx, b.dataset.i);
  for (const b of el.querySelectorAll('[data-w]')) b.onclick = () => sellGoods(ctx, b.dataset.g, b.dataset.w);
  for (const b of el.querySelectorAll('[data-buy]')) b.onclick = () => buyRod(ctx);
  for (const b of el.querySelectorAll('[data-seed]')) b.onclick = () => buySeed(ctx, b.dataset.seed);
  if (ctx.chanthuShopBind) ctx.chanthuShopBind(el, () => render(ctx));   /* plan-58 C.2: Ấn Thu (chanthu.js) */
}
function sellCarry(ctx, which) {
  const S = L(ctx), inv = ctx.S.save.inv;
  let earned = 0;
  if (which === 'all') {
    const items = clearCarry(ctx);                  // empties the head stack and re-syncs save.inv
    if (!items.length) return;
    for (const it of items) earned += priceOf(it);
  } else {
    const it = removeCarry(ctx, +which);
    if (!it) return;
    earned = priceOf(it);
  }
  ctx.give('stone', earned, stall ? stall.x * TILE + 16 : undefined, stall ? (stall.y + 2) * TILE : undefined);   /* plan-24: tiền bán hàng = đá rơi trước mặt người bán */
  ctx.persist();
  ctx.toast(S.got(earned));
  render(ctx);
}
/* --- bán từ túi đồ (menu.js): id = mã vật phẩm trong túi. Thú/cá đang mang (tag carry) lấy khỏi chồng mang theo; hàng thường trừ inv. Trả số đá nhận được. --- */
export function bagPrice(ctx, id) {
  const carry = getCarry(ctx).filter(it => it.kind === id);
  if (carry.length) return { one: priceOf(carry[0]), all: carry.reduce((a, it) => a + priceOf(it), 0), n: carry.length };
  const n = (ctx.S.save.inv || {})[id] || 0; const pp = priceId(ctx, id); return pp && n > 0 ? { one: pp, all: pp * n, n } : null;
}
export function sellFromBag(ctx, id, how) {
  const S = L(ctx), inv = ctx.S.save.inv; let earned = 0, sold = 0;
  const idx = () => getCarry(ctx).findIndex(it => it.kind === id);
  if (idx() >= 0) { do { const it = removeCarry(ctx, idx()); if (!it) break; earned += priceOf(it); sold++; } while (how === 'all' && idx() >= 0); }
  else { const have = inv[id] || 0; const pp = priceId(ctx, id); if (have <= 0 || !pp) return 0; sold = how === 'all' ? have : 1; inv[id] = have - sold; earned = sold * pp; }
  if (!sold) return 0;
  /* 2026-10-11 anh: bán qua TÚI ở vùng không có quầy (M1…) không nhận được đá — trước đây rơi đá ở toạ độ quầy (không có → mất). Giờ cộng THẲNG vào túi */
  ctx.bag.add('stone', earned); if (ctx.flyToSlot) try { ctx.flyToSlot('stone'); } catch (e) { } ctx.persist(); ctx.sfx && ctx.sfx('sell'); ctx.toast(S.got(earned));
  return earned;
}
function sellGoods(ctx, id, how) {
  const S = L(ctx), inv = ctx.S.save.inv, have = inv[id] || 0;
  if (have <= 0 || !priceId(ctx, id)) return;
  const n = how === 'all' ? have : 1;
  inv[id] = have - n;
  ctx.give('stone', n * priceId(ctx, id), stall ? stall.x * TILE + 16 : undefined, stall ? (stall.y + 2) * TILE : undefined);
  ctx.persist();
  ctx.toast(S.got(n * priceId(ctx, id)));
  render(ctx);
}
function buyRod(ctx) {
  const S = L(ctx), sv = ctx.S.save, inv = sv.inv;
  sv.tools = sv.tools || {};
  if (sv.tools.rod) return;
  if ((inv.stone || 0) < ROD_PRICE) { ctx.toast(S.poor); return; }
  inv.stone -= ROD_PRICE;
  sv.tools.rod = true; sv.tools.rodBought = true;   // the core restores `rod` from `rodBought` on load
  ctx.persist();
  ctx.toast(S.gotRod, true);
  render(ctx);
}
function close(ctx) {
  open = false;
  if (el) el.hidden = true;
  ctx.setMode('play');
}

// --- system --------------------------------------------------------------
export const market = {
  id: 'market',

  onZoneEnter(ctx) {
    stall = null;
    if (open) close(ctx);
    const map = ctx.S.map, spot = findSpot(ctx, map);
    if (!spot) return;
    stall = ctx.place(map, 'stall', spot.x, spot.y, { trader: true });
  },

  onZoneLeave(ctx) { if (open) close(ctx); stall = null; VEINS = null; },

  /* plan-44 Q3: mỏ đá Seismic ĐẦU TIÊN đào ở Làng ra thêm FIRST_BONUS 🪨 (1 lần mỗi save, cờ save.sys.p44a.firstMine) — tân thủ đỡ phải cày ~15 mỏ / cây mới đủ Kiếm */
  update(dt, ctx) {
    const S = ctx.S; if (!S.zone || S.zone.id !== 'village' || !S.save) return;
    const f = ((S.save.sys ||= {}).p44a ||= {}); if (f.firstMine) return;
    if ((VT += dt) < 0.25) return; VT = 0;
    if (!VEINS || VEINS.map !== S.map) { VEINS = { map: S.map, list: S.map.objects.filter(o => o.type === 'seisvein') }; return; }
    for (const o of VEINS.list) {
      if (S.map.objects.includes(o)) continue;
      const x = o.x * TILE + 8, y = o.y * TILE + 12, p = S.player; VEINS.list = VEINS.list.filter(q => q !== o);
      if (Math.hypot(x - p.x, y - p.y) > 48) continue;   /* gỡ vì lý do khác (không phải người chơi đào) → bỏ qua */
      f.firstMine = true; ctx.give('stone', FIRST_BONUS, x, y); ctx.toast(L(ctx).firstMine(FIRST_BONUS), true); ctx.sfx('coin'); ctx.persist(); return;
    }
  },

  near(ctx) {
    if (!stall || open) return null;
    const S = L(ctx), p = ctx.S.player;
    const x = stall.x * TILE + TILE, y = (stall.y + 1) * TILE - 4;
    return Math.hypot(x - p.x, y - p.y) < 30 ? { label: S.near, x, y, limit: 30, data: stall } : null;
  },

  interact(ctx) {
    if (!stall || open) return;
    open = true;
    ctx.setMode('market');
    ctx.registerCloser('market', () => close(ctx));
    render(ctx);
  },

  // floating "Trader" sign above the stall
  drawUI(ug, ctx, cx, cy, scale) {
    if (!stall || stall.ghost) return;   /* plan-22: quầy thành NPC → bảng tên vẽ ở staff.js */
    const S = L(ctx);
    const sx = Math.round((stall.x * TILE + TILE - cx) * scale), sy = Math.round((stall.y * TILE - 6 - cy) * scale);
    if (sx < -120 || sx > ug.canvas.width + 120 || sy < -40 || sy > ug.canvas.height + 40) return;
    ug.save();
    const fs = Math.max(10, (globalThis.__u89?globalThis.__u89(scale):scale) * 3);
    ug.font = `bold ${fs}px VT323, monospace`; ug.textAlign = 'center'; ug.textBaseline = 'bottom';
    const txt = '🏪 ' + S.sign, w = ug.measureText(txt).width + 10, h = fs + 6;
    ug.fillStyle = 'rgba(13,11,20,.72)'; ug.beginPath(); ug.roundRect(sx - w / 2, sy - h, w, h, 4); ug.fill();
    ug.strokeStyle = 'rgba(255,212,94,.5)'; ug.lineWidth = 1; ug.stroke();
    ug.fillStyle = '#ffd45e'; ug.fillText(txt, sx, sy - 3);
    ug.restore();
  }
};
