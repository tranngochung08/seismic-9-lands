// market.js — the trader stall: sell what you are carrying on your head, buy a fishing rod. See systems/API.md.
import { getCarry, removeCarry, clearCarry } from './animals.js';

const STR = {
  en: {
    sign: 'Trader', near: 'Trade', title: 'Trader',
    lead: 'Sell what you are carrying — hands, bucket, cage and cart.',
    head: 'On your head', goods: 'Goods', shop: 'For sale',
    stones: 'Stones', sell: 'Sell', sell1: 'Sell 1', sellAll: 'Sell all', close: 'Close', buy: 'Buy', owned: 'Owned ✓',
    empty: 'Your head is empty — go catch something!',
    each: 'each', got: n => `+${n} 🪨`,
    rod: '🎣 Fishing rod', rodNote: 'Cast at any shore', gotRod: 'Fishing rod bought! Cast at the shore.',
    poor: 'Not enough stones — sell animals/fish here or mine rocks with a pickaxe',
    seeds: 'Seeds of the season', seedNote: 'sow on tilled soil in your district', gotSeed: n => `+1 ${n}`,
    names: { fish: '🐟 Fish', fishBig: '🐟 Big fish', chicken: '🐔 Chicken', bird: '🐦 Bird', cow: '🐄 Cow', sheep: '🐏 Sheep', rabbit: '🐰 Rabbit', crab: '🦀 Crab', bat: '🦇 Bat', wood: '🪵 Wood', squid: '🦑 Squid', goldfish: '🐠 Golden fish' }
  },
  vi: {
    sign: 'Thương nhân', near: 'Mua bán', title: 'Thương nhân',
    lead: 'Bán thứ đang mang theo — trên tay, trong xô, lồng và xe chở.',
    head: 'Trên đầu bạn', goods: 'Hàng hóa', shop: 'Bán cho bạn',
    stones: 'Đá', sell: 'Bán', sell1: 'Bán 1', sellAll: 'Bán hết', close: 'Đóng', buy: 'Mua', owned: 'Đã có ✓',
    empty: 'Trên đầu chưa có gì — đi bắt thú đi!',
    each: 'mỗi cái', got: n => `+${n} 🪨`,
    rod: '🎣 Cần câu', rodNote: 'Thả câu ở bờ nước', gotRod: 'Đã mua cần câu! Ra bờ nước thả câu.',
    poor: 'Không đủ đá — bán thú/cá ở đây hoặc đập đá bằng cuốc',
    seeds: 'Hạt giống theo mùa', seedNote: 'gieo trên đất đã cày trong khu của bạn', gotSeed: n => `+1 ${n}`,
    names: { fish: '🐟 Cá', fishBig: '🐟 Cá to', chicken: '🐔 Gà', bird: '🐦 Chim', cow: '🐄 Bò', sheep: '🐏 Cừu', rabbit: '🐰 Thỏ', crab: '🦀 Cua', bat: '🦇 Dơi', wood: '🪵 Gỗ', squid: '🦑 Mực', goldfish: '🐠 Cá vàng' }
  }
};
const L = ctx => STR[ctx.lang() === 'vi' ? 'vi' : 'en'];

const PRICE = { fish: 2, fishBig: 5, chicken: 3, bird: 4, cow: 6, sheep: 5, rabbit: 3, crab: 3, bat: 4, wood: 1, squid: 4, goldfish: 12, pearl: 8, shell: 1, seagem: 5 };
const ROD_PRICE = 8;
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

let stall = null;   // the placed object in the current map
let el = null;      // the panel element
let open = false;

// --- placement -----------------------------------------------------------
function objAt(ctx, map, tx, ty) {
  return map.objects.some(o => { const d = ctx.O[o.type]; return d && tx >= o.x && tx < o.x + d.fw && ty >= o.y && ty < o.y + d.fh; });
}
function findSpot(ctx, map) {
  const reach = ctx.computeReach(map, map.entries.default);
  const free = (x, y) => !ctx.isSolid(map, x, y) && !objAt(ctx, map, x, y);
  // 2×1 footprint, with somewhere to stand in front of it.
  // `strict` also wants that spot reachable from the south entrance — M5's chasm cuts the plaza off
  // until the bridge is up, so we fall back to the plain walkability test there.
  const mk = strict => {
    const walk = (x, y) => free(x, y) && (!strict || reach[y * map.w + x]);
    return (x, y) => free(x, y) && free(x + 1, y) && (walk(x, y + 1) || walk(x + 1, y + 1));
  };
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
GOODS.push('turnip', 'strawberry', 'tomato', 'corn', 'pumpkin', 'yam', 'starmush', 'quakeflower', 'egg', 'milk', 'wool', 'fur_rabbit');   /* F02: nông sản bán được ở quầy (A0 thêm dòng) */
function goodsRow(ctx, id, n) {
  const S = L(ctx), dis = n > 0 ? '' : ' disabled';
  const bs = BS + (n > 0 ? '' : ';opacity:.35;cursor:default');
  const name = S.names[id] || `${ctx.itemIcon(id)} ${ctx.itemName(id)}`;
  return `<div class="hrow">
    <span class="hwho"><b>${name}</b> <span class="chip">${PRICE[id]} 🪨 ${S.each}</span></span>
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
    <span class="hwho"><b>${S.rod}</b> <span class="chip">${ROD_PRICE} 🪨</span> <span class="dim">${S.rodNote}</span></span>
    <span class="hnum"></span>
    ${has ? `<span class="chip">${S.owned}</span>`
      : `<button class="btn primary" data-buy="rod" style="${bs}"${can ? '' : ' disabled'}>${S.buy}</button>`}
  </div>`;
}
function seedRow(ctx, id) {
  const S = L(ctx), inv = ctx.S.save.inv || {}, can = (inv.stone || 0) >= SEED_PRICE;
  const bs = BS + (can ? '' : ';opacity:.35;cursor:default');
  return `<div class="hrow">
    <span class="hwho"><b>${ctx.itemIcon(id)} ${ctx.itemName(id)}</b> <span class="chip">${SEED_PRICE} 🪨</span></span>
    <span class="hnum"><b>×${inv[id] || 0}</b></span>
    <button class="btn primary" data-seed="${id}" style="${bs}"${can ? '' : ' disabled'}>${S.buy}</button>
  </div>`;
}
function buySeed(ctx, id) {
  const S = L(ctx), inv = ctx.S.save.inv;
  if (!seedsOfSeason(ctx).includes(id)) return;
  if ((inv.stone || 0) < SEED_PRICE) { ctx.toast(S.poor); return; }
  if (ctx.bag.add(id, 1) <= 0) return;   /* túi đầy: bag tự báo, không trừ đá */
  inv.stone -= SEED_PRICE; ctx.persist();
  ctx.toast(S.gotSeed(`${ctx.itemIcon(id)} ${ctx.itemName(id)}`));
  render(ctx);
}
function render(ctx) {
  const S = L(ctx), inv = ctx.S.save.inv || {}, carry = getCarry(ctx);
  const total = carry.reduce((a, it) => a + priceOf(it), 0);
  const html = `<h2>🏪 ${S.title}<span class="chip">🪨 ${inv.stone || 0}</span></h2>
    <p class="dim">${S.lead}</p>
    <div class="scroll">
      <div class="hrow" style="opacity:.7"><span class="hwho"><b>${S.head}</b></span><span class="hnum"></span>
        <button class="btn primary" data-i="all" style="${BS}${carry.length ? '' : ';opacity:.35;cursor:default'}"${carry.length ? '' : ' disabled'}>${S.sellAll}${total ? ` · +${total} 🪨` : ''}</button></div>
      ${carry.length ? carry.map((it, i) => carryRow(ctx, it, i)).join('') : `<p class="dim" style="margin:6px 0 10px">${S.empty}</p>`}
      <div class="hrow" style="opacity:.7"><span class="hwho"><b>${S.goods}</b></span><span class="hnum"></span><span></span></div>
      ${GOODS.filter(id => id === 'wood' || inv[id] > 0).map(id => goodsRow(ctx, id, inv[id] || 0)).join('')}
      <div class="hrow" style="opacity:.7"><span class="hwho"><b>${S.shop}</b></span><span class="hnum"></span><span></span></div>
      ${rodRow(ctx)}
      <div class="hrow" style="opacity:.7"><span class="hwho"><b>${S.seeds}</b> <span class="dim">${S.seedNote}</span></span><span class="hnum"></span><span></span></div>
      ${seedsOfSeason(ctx).map(id => seedRow(ctx, id)).join('')}
    </div>
    <button class="btn" id="mk-close">${S.close}</button>`;
  el = ctx.panel('market', html);
  el.hidden = false;
  el.querySelector('#mk-close').onclick = () => close(ctx);
  for (const b of el.querySelectorAll('[data-i]')) b.onclick = () => sellCarry(ctx, b.dataset.i);
  for (const b of el.querySelectorAll('[data-w]')) b.onclick = () => sellGoods(ctx, b.dataset.g, b.dataset.w);
  for (const b of el.querySelectorAll('[data-buy]')) b.onclick = () => buyRod(ctx);
  for (const b of el.querySelectorAll('[data-seed]')) b.onclick = () => buySeed(ctx, b.dataset.seed);
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
  inv.stone = (inv.stone || 0) + earned;
  ctx.persist();
  ctx.toast(S.got(earned));
  render(ctx);
}
/* --- bán từ túi đồ (menu.js): id = mã vật phẩm trong túi. Thú/cá đang mang (tag carry) lấy khỏi chồng mang theo; hàng thường trừ inv. Trả số đá nhận được. --- */
export function bagPrice(ctx, id) {
  const carry = getCarry(ctx).filter(it => it.kind === id);
  if (carry.length) return { one: priceOf(carry[0]), all: carry.reduce((a, it) => a + priceOf(it), 0), n: carry.length };
  const n = (ctx.S.save.inv || {})[id] || 0; return PRICE[id] && n > 0 ? { one: PRICE[id], all: PRICE[id] * n, n } : null;
}
export function sellFromBag(ctx, id, how) {
  const S = L(ctx), inv = ctx.S.save.inv; let earned = 0, sold = 0;
  const idx = () => getCarry(ctx).findIndex(it => it.kind === id);
  if (idx() >= 0) { do { const it = removeCarry(ctx, idx()); if (!it) break; earned += priceOf(it); sold++; } while (how === 'all' && idx() >= 0); }
  else { const have = inv[id] || 0; if (have <= 0 || !PRICE[id]) return 0; sold = how === 'all' ? have : 1; inv[id] = have - sold; earned = sold * PRICE[id]; }
  if (!sold) return 0;
  inv.stone = (inv.stone || 0) + earned; ctx.persist(); ctx.sfx && ctx.sfx('coin'); ctx.toast(S.got(earned));
  return earned;
}
function sellGoods(ctx, id, how) {
  const S = L(ctx), inv = ctx.S.save.inv, have = inv[id] || 0;
  if (have <= 0 || !PRICE[id]) return;
  const n = how === 'all' ? have : 1;
  inv[id] = have - n;
  inv.stone = (inv.stone || 0) + n * PRICE[id];
  ctx.persist();
  ctx.toast(S.got(n * PRICE[id]));
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

  onZoneLeave(ctx) { if (open) close(ctx); stall = null; },

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
    if (!stall) return;
    const S = L(ctx);
    const sx = Math.round((stall.x * TILE + TILE - cx) * scale), sy = Math.round((stall.y * TILE - 6 - cy) * scale);
    if (sx < -120 || sx > ug.canvas.width + 120 || sy < -40 || sy > ug.canvas.height + 40) return;
    ug.save();
    const fs = Math.max(10, scale * 3);
    ug.font = `bold ${fs}px "Segoe UI",system-ui,sans-serif`; ug.textAlign = 'center'; ug.textBaseline = 'bottom';
    const txt = '🏪 ' + S.sign, w = ug.measureText(txt).width + 10, h = fs + 6;
    ug.fillStyle = 'rgba(13,11,20,.72)'; ug.beginPath(); ug.roundRect(sx - w / 2, sy - h, w, h, 4); ug.fill();
    ug.strokeStyle = 'rgba(255,212,94,.5)'; ug.lineWidth = 1; ug.stroke();
    ug.fillStyle = '#ffd45e'; ug.fillText(txt, sx, sy - 3);
    ug.restore();
  }
};
