// farm.js — F02 Trồng trọt (plan-17 đợt 1, tác nhân A1-FARM). Hợp đồng: src/systems/API.md mục Clock / Plot / Đợt 1 + docs/contract-dot1.md.
//  · Cày bằng XẺNG (ctx.tool.tier('shovel') ≥ 1) trên ô cỏ/đất trống TRONG plot nước mình (ctx.myPlot) → T.TILLED; tối đa 60 ô/vùng.
//  · Gieo hạt seed_<crop> trong túi, chọn hạt đúng mùa (tag mùa của item); hạt sai mùa → nhãn từ chối.
//  · Tưới bằng XÔ: đứng cạnh giếng/ô nước → E 'Múc nước' → save.sys.farm.bucketWater 0..5; tưới tốn 1 → T.TILLED_WET.
//  · onDayEnd: ô đã tưới → stage +1 (1 ngày game = 1 giai đoạn), ướt → khô; ngày cuối mùa → cây sai mùa héo. Không tưới → cây đứng, không chết.
//  · Thu hoạch +2–4 nông sản (số nổi ctx.pop), chất lượng q 0/1/2 theo số ngày tưới liên tục (chỉ lưu để bán sau); dâu/cà chua/bắp mọc lại.
//  · Bù nhìn Rocky: item 'scarecrow' (RECIPES bàn mộc) → E trên ô trống trong plot → vật 'scarecrow' (solid) + save.sys.farm[zone].scarecrows
//    để raiders_low đọc (hàm thuần guardedByScarecrow export bên dưới). Gỡ lại được (E cạnh bù nhìn).
//  · Vẽ: ô cày = tile lõi T.TILLED / T.TILLED_WET (ctx.setG); cây = drawables theo giai đoạn qua HOOK.image('crop_<crop>_<0..3>' | 'crop_<crop>_dead')
//    (fallback vẽ code fillRect); bù nhìn HOOK.image('scarecrow') 16×24 logic.
//  · Save: save.sys.farm = { bucketWater, harvested, quality:[n0,n1,n2], [zone]: { tiles: {'x,y': {crop, stage, wet, planted, waterDays, q, dead}}, scarecrows:[{x,y}] } }.
//    Save cũ không có sys.farm → tự tạo rỗng.
//  · Móc test: window.__farm = { give, tools, tick, state, act, press, near }.
import { mkCanvas, HOOK, T, TS, PAL, tiles } from '../gfx.js';
import { ART } from '../art.js';   /* chỉ đọc ART.on: chế độ px nền Wang không vẽ tile TILLED → module tự vẽ ô cày làm drawable */

// ---------- chữ ----------
const STR = {
  en: {
    till: 'Till soil', sow: s => `Sow ${s}`, water: 'Water', harvest: 'Harvest', pull: 'Pull dead crop', fill: 'Fill bucket',
    placeScare: 'Place scarecrow', takeScare: 'Take scarecrow',
    emptyBucket: 'Bucket is empty — fill it at the well or a water tile', needShovel: 'Needs a shovel — craft it at the workbench (4 wood)',
    needBucket: 'Needs a bucket — craft Bucket I at the workbench (3 wood + 1 resin)', notMine: "Fields only inside your own nation's yard",
    wrongSeason: 'Wrong season for these seeds', full: 'This yard already has 60 field tiles', bucketFull: 'Bucket is already full',
    tilled: 'Soil tilled', sown: 'Seeds sown', watered: 'Watered', filled: 'Bucket filled', pulled: 'Dead crop removed', placed: 'Scarecrow placed', taken: 'Scarecrow taken back',
    grew: n => `${n} crops grew`, wilted: n => `${n} crops wilted (season changed)`, harvested: (n, name) => `Harvested ${n} ${name}`, stars: ['', ' ☆', ' ★'],
    hud: (w, m) => `💧 ${w}/${m}`
  },
  vi: {
    till: 'Cày đất', sow: s => `Gieo ${s}`, water: 'Tưới', harvest: 'Thu hoạch', pull: 'Nhổ cây héo', fill: 'Múc nước',
    placeScare: 'Đặt bù nhìn', takeScare: 'Gỡ bù nhìn',
    emptyBucket: 'Xô rỗng — múc nước ở giếng hoặc ô nước', needShovel: 'Cần xẻng — chế ở Bàn mộc (4 gỗ)',
    needBucket: 'Cần xô — chế Xô I ở Bàn mộc (3 gỗ + 1 nhựa thông)', notMine: 'Ruộng chỉ đặt trong khu của nước mình',
    wrongSeason: 'Hạt sai mùa, chưa gieo được', full: 'Khu này đã đủ 60 ô ruộng', bucketFull: 'Xô đã đầy',
    tilled: 'Đã cày đất', sown: 'Đã gieo hạt', watered: 'Đã tưới', filled: 'Đã múc đầy xô', pulled: 'Đã nhổ cây héo', placed: 'Đã đặt bù nhìn', taken: 'Đã gỡ bù nhìn',
    grew: n => `${n} cây lớn thêm`, wilted: n => `${n} cây héo vì sang mùa`, harvested: (n, name) => `Thu hoạch ${n} ${name}`, stars: ['', ' ☆', ' ★'],
    hud: (w, m) => `💧 ${w}/${m}`
  }
};
const L = ctx => STR[ctx.lang()] || STR.en;

// ---------- bảng cây ----------
const CROPS = ['turnip', 'strawberry', 'tomato', 'corn', 'pumpkin', 'yam', 'starmush', 'quakeflower'];
// days = số ngày ĐÃ TƯỚI để chín; regrow = sau thu hoạch lùi lại bấy nhiêu ngày rồi chín tiếp (dâu/cà chua/bắp)
const CROP = {
  turnip: { days: 3 }, strawberry: { days: 4, regrow: 3 }, tomato: { days: 5, regrow: 3 }, corn: { days: 6, regrow: 3 },
  pumpkin: { days: 6 }, yam: { days: 5 }, starmush: { days: 4 }, quakeflower: { days: 5 }
};
const FRUIT = { turnip: ['#f3ecff', '#b48cf0'], strawberry: ['#e2323f', '#ffd0d6'], tomato: ['#e5462a', '#ffb98a'], corn: ['#ffd84a', '#fff3a8'], pumpkin: ['#f08a1e', '#ffc46a'], yam: ['#9a5aa8', '#e8b5f5'], starmush: ['#5fe6ff', '#ffffff'], quakeflower: ['#d64ad8', '#ffe0ff'] };
const MAX_TILES = 60, BUCKET_MAX = 5, SCARE_R = 6;
const TILE_BIAS = 24;   // gather báo ô đất "cách" 25 px → ruộng 24 px thắng gather trên cùng ô, vẫn thua NPC/vật thể (≤ 22 px)
const DIRV = [[0, 1], [-1, 0], [1, 0], [0, -1]];   // dir nhân vật: 0 xuống, 1 trái, 2 phải, 3 lên

// ---------- trạng thái module ----------
const ST = { zone: null, sprites: false, scare: [], parts: [], chk: 0, ctx: null };
const key = (x, y) => x + ',' + y;

// ---------- save ----------
function root(ctx) {
  const s = ctx.S.save; s.sys = s.sys || {};
  const f = (s.sys.farm = s.sys.farm || {});
  if (typeof f.bucketWater !== 'number' || !(f.bucketWater >= 0)) f.bucketWater = 0;
  f.bucketWater = Math.min(BUCKET_MAX, f.bucketWater | 0);
  if (typeof f.harvested !== 'number') f.harvested = 0;
  if (!Array.isArray(f.quality)) f.quality = [0, 0, 0];
  return f;
}
const isZoneData = v => !!v && typeof v === 'object' && !Array.isArray(v) && (v.tiles || v.scarecrows);
function zoneData(ctx, id) {
  const f = root(ctx); id = id || (ctx.S.zone && ctx.S.zone.id) || 'village';
  let z = f[id]; if (!isZoneData(z)) z = f[id] = {};
  z.tiles = z.tiles || {}; z.scarecrows = Array.isArray(z.scarecrows) ? z.scarecrows : [];
  return z;
}
const tileCount = z => Object.keys(z.tiles).length;
const cropOk = (ctx, crop) => { const it = ctx.ITEMS[crop]; const tg = it ? it.tags : []; return tg.includes('any') || tg.includes(ctx.season()); };
const ripe = rec => !!rec.crop && !rec.dead && rec.stage >= (CROP[rec.crop] || { days: 4 }).days;
// khung ảnh theo tiến độ: 'seed' (vừa gieo, chưa lớn ngày nào) → 0 mầm → 1 → 2 → 3 chín (plan-19: 5 giai đoạn như luật, chỉ đổi hiển thị, save giữ nguyên)
const CROP_LIFT = 3;   /* px: nhấc gốc cây khỏi mép dưới ô → gốc ở giữa-dưới ô vuông */
function frameOf(rec) {
  const d = (CROP[rec.crop] || { days: 4 }).days;
  if (rec.stage >= d) return 3;
  if (rec.stage === 0) return 'seed';
  return Math.min(2, Math.floor(rec.stage * 3 / d));
}

// ---------- sprite vẽ code (đăng ký HOOK.image lúc nạp module để art.js thay ảnh gói nếu có) ----------
const IMG = {};   // 'crop_<crop>_<i>' | 'crop_<crop>_dead' | 'scarecrow' → canvas
function cropArt(crop, stage) {
  const c = mkCanvas(16, 16), g = c.getContext('2d'), [fa, fb] = FRUIT[crop];
  const leaf = crop === 'starmush' ? '#7fb8c9' : PAL.grassD, leafL = crop === 'starmush' ? '#a9d8e6' : PAL.grass;
  const px = (x, y, col, w = 1, h = 1) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
  if (stage === 'dead') {
    px(7, 8, '#6b4a2a', 2, 7); px(4, 9, '#8a6a3c', 3, 1); px(9, 7, '#8a6a3c', 3, 1); px(3, 8, '#a08050', 1, 1); px(12, 6, '#a08050', 1, 1);
    px(6, 6, '#7a5a30', 1, 2); px(10, 9, '#7a5a30', 1, 2);
    return c;
  }
  if (stage === 'seed') {                              /* hạt vừa gieo: ụ đất + 3 hạt (dự phòng khi chưa có ảnh PixelLab) */
    px(4, 11, '#6b4a2a', 8, 3); px(5, 10, '#8a6238', 6, 1); px(5, 10, '#ecdcb4', 1, 1); px(8, 10, '#ecdcb4', 1, 1); px(10, 11, '#ecdcb4', 1, 1);
    return c;
  }
  if (stage === 0) {                                   // mầm
    px(7, 10, leaf, 2, 5); px(5, 9, leafL, 2, 2); px(9, 8, leafL, 2, 2); px(7, 9, leafL, 1, 1);
  } else if (stage === 1) {                            // cây con
    px(7, 7, leaf, 2, 8); px(4, 8, leafL, 3, 2); px(9, 6, leafL, 3, 2); px(5, 11, leaf, 2, 2); px(9, 10, leaf, 3, 2); px(6, 5, leafL, 2, 2);
  } else {                                             // 2 = bụi, 3 = chín có quả
    if (crop === 'corn') { px(7, 1, leaf, 2, 14); px(3, 5, leafL, 4, 2); px(9, 3, leafL, 4, 2); px(2, 9, leaf, 5, 2); px(9, 8, leaf, 5, 2); px(4, 12, leafL, 3, 1); }
    else { px(3, 5, leaf, 10, 8); px(2, 7, leafL, 3, 4); px(11, 6, leafL, 3, 4); px(5, 3, leafL, 6, 3); px(6, 12, leaf, 4, 3); px(4, 4, leaf, 2, 1); px(10, 4, leaf, 2, 1); }
    if (stage === 3) {
      if (crop === 'corn') { px(9, 6, fa, 3, 5); px(10, 6, fb, 1, 2); px(4, 8, fa, 3, 4); px(5, 8, fb, 1, 2); }
      else if (crop === 'pumpkin') { px(4, 8, PAL.out, 8, 6); px(5, 9, fa, 6, 4); px(6, 9, fb, 1, 2); px(7, 7, leaf, 2, 2); }
      else if (crop === 'quakeflower') { px(6, 3, fa, 4, 4); px(5, 4, fa, 6, 2); px(7, 4, fb, 2, 2); px(2, 8, fa, 2, 2); px(12, 9, fa, 2, 2); }
      else if (crop === 'starmush') { px(5, 4, fa, 6, 3); px(4, 5, fa, 8, 2); px(7, 7, '#e8f6ff', 2, 6); px(6, 4, fb, 1, 1); px(9, 5, fb, 1, 1); px(12, 6, fb, 1, 1); px(3, 9, fb, 1, 1); }
      else if (crop === 'turnip' || crop === 'yam') { px(5, 10, fa, 6, 4); px(6, 11, fb, 2, 1); px(4, 12, PAL.dirtD, 8, 1); }
      else { px(4, 7, fa, 2, 2); px(10, 9, fa, 2, 2); px(7, 11, fa, 2, 2); px(4, 7, fb, 1, 1); px(10, 9, fb, 1, 1); px(7, 11, fb, 1, 1); }
    }
  }
  return c;
}
function scareArt() {
  const c = mkCanvas(16, 24), g = c.getContext('2d');
  const px = (x, y, col, w = 1, h = 1) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
  px(7, 6, PAL.woodD, 2, 18);                          // cọc
  px(2, 10, PAL.woodD, 12, 2);                         // xà ngang
  px(3, 9, '#c9a86b', 10, 5); px(3, 9, PAL.out, 10, 1); px(3, 13, PAL.out, 10, 1);   // áo rơm
  px(1, 10, '#d9c07a', 2, 2); px(13, 10, '#d9c07a', 2, 2);                       // tay rơm
  px(5, 2, PAL.out, 6, 7); px(6, 3, PAL.stone, 4, 5); px(6, 4, PAL.stoneL, 1, 1);  // đầu đá Rocky
  px(7, 5, PAL.out, 1, 1); px(9, 5, PAL.out, 1, 1); px(7, 7, PAL.out, 2, 1);        // mắt, miệng
  px(4, 1, '#b3123a', 8, 2); px(5, 0, '#b3123a', 6, 1);                            // nón đỏ
  px(2, 15, '#d9c07a', 1, 3); px(13, 15, '#d9c07a', 1, 3);
  return c;
}
for (const crop of CROPS) {
  for (let i = 0; i < 4; i++) IMG[`crop_${crop}_${i}`] = HOOK.image(`crop_${crop}_${i}`, cropArt(crop, i));
  IMG[`crop_${crop}_dead`] = HOOK.image(`crop_${crop}_dead`, cropArt(crop, 'dead'));
  IMG[`crop_${crop}_seed`] = HOOK.image(`crop_${crop}_seed`, cropArt(crop, 'seed'));   /* plan-19 */
}
IMG.scarecrow = HOOK.image('scarecrow', scareArt());
IMG.cursor = HOOK.image('cursor_tile', (() => { const c = mkCanvas(16, 16), g = c.getContext('2d'); g.strokeStyle = '#e8ffb0'; g.lineWidth = 1; g.strokeRect(0.5, 0.5, 15, 15); return c; })());   /* khung chọn ô (gói: zones/village/farm/cursor_tile.png) */
let HOVER = null;   /* ô đang trỏ chuột trong tầm với: { tx, ty, ok } — đặt trong near(), vẽ trong drawables() */

function ensureSprites(ctx) {
  if (!ST.sprites) {
    ST.sprites = true;
    ctx.defineObject('scarecrow', 16, 24, 1, 1, g => { g.drawImage(scareArt(), 0, 0); }, { solid: true });
  }
  // gói px: nếu art.js không có objects.scarecrow nhưng đã thay HOOK.image('scarecrow') → dùng canvas đó cho vật thể
  const d = ctx.O.scarecrow; if (d && !d.img.__hi && IMG.scarecrow.__hi) { d.img = IMG.scarecrow; d.w = IMG.scarecrow.width; d.h = IMG.scarecrow.height; }
}

// ---------- map ----------
const isRoad = (m, x, y) => !!(m.roads && x >= 0 && y >= 0 && x < m.w && y < m.h && m.roads[y * m.w + x] === 1);
const plainGround = g0 => g0 === T.GRASS || g0 === T.GRASS2 || g0 === T.FLOWER || g0 === T.DIRT || g0 === T.SAND || g0 === T.SAND2;
// plot được cày: plot nước mình; chưa có nước (mine:false) mà vùng đã có ruộng → giữ plot chứa ruộng cũ (không rải ruộng khắp nơi)
function farmPlot(ctx) {
  const p = ctx.myPlot(); if (!p) return null;
  if (p.mine || ctx.S.save.nation !== undefined) return p;   /* plan-18: đã chọn nước → chỉ khu nước mình */
  const z = zoneData(ctx); const k = Object.keys(z.tiles)[0];
  if (k) { const [x, y] = k.split(',').map(Number); const q = ctx.plotOf(x, y); if (q) return q; }
  return p;
}
function tillable(ctx, tx, ty) {   // ô trống có thể cày (chưa xét plot)
  const m = ctx.S.map, g0 = ctx.getG(m, tx, ty);
  if (!plainGround(g0) || isRoad(m, tx, ty) || ctx.isSolid(m, tx, ty) || ctx.hasObjectAt(m, tx, ty)) return false;
  return !(m.reserved || []).some(r => r.x === tx && r.y === ty);
}
function inFarmPlot(ctx, tx, ty) { if (ctx.ownsTile && ctx.ownsTile(tx, ty)) return true;   /* plan-25: đất đã mua */
  const p = farmPlot(ctx), q = ctx.plotOf(tx, ty); return !!(q && ((p && p.idx === q.idx) || (q.nation && ctx.canWorkPlot && ctx.canWorkPlot(tx, ty) && ctx.myNation() !== q.nation))); }   /* + khu nước thân thiện (nói chuyện ≥ 5 lần) */
function nearWater(ctx) {
  const m = ctx.S.map, p = ctx.S.player, tx = Math.floor(p.x / TS), ty = Math.floor(p.y / TS);
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const g0 = ctx.getG(m, tx + dx, ty + dy); if (g0 === T.WATER || g0 === T.REEF || g0 === T.DEEP) return { x: (tx + dx) * TS + 8, y: (ty + dy) * TS + 8 }; }
  for (const o of m.objects) {
    if (o.type !== 'well' || o.ruined) continue;
    const d = ctx.O[o.type], wx = o.x * TS + d.fw * 8, wy = (o.y + d.fh) * TS - 4;
    if (Math.hypot(wx - p.x, wy - p.y) < 30) return { x: wx, y: wy, well: true };
  }
  return null;
}
function pickSeed(ctx) {   // hạt đúng mùa đầu tiên trong túi (theo thứ tự CROPS); trả { crop, id } | null; hasAny = có hạt nào không
  let any = false, pick = null;
  for (const crop of CROPS) { const id = 'seed_' + crop; if (!ctx.bag.has(id, 1)) continue; any = true; if (!pick && cropOk(ctx, crop)) pick = { crop, id }; }
  return { pick, any };
}
function applyTile(ctx, x, y, rec) { const m = ctx.S.map; ctx.setG(m, x, y, rec.wet ? T.TILLED_WET : T.TILLED, false); }
function placeScare(ctx, x, y) {
  const m = ctx.S.map; if (ctx.hasObjectAt(m, x, y) || ctx.isSolid(m, x, y)) return null;
  const o = ctx.place(m, 'scarecrow', x, y, { scarecrow: true, farm: true }); ST.scare.push({ x, y, o }); return o;
}
/** Hàm thuần cho raiders_low: ô (tx,ty) của vùng zoneId có bù nhìn trong bán kính 6 ô không (đọc save.sys.farm). */
export function guardedByScarecrow(save, zoneId, tx, ty) {
  const f = save && save.sys && save.sys.farm, z = f && f[zoneId];
  if (!z || !Array.isArray(z.scarecrows)) return false;
  return z.scarecrows.some(s => Math.abs(s.x - tx) <= SCARE_R && Math.abs(s.y - ty) <= SCARE_R);
}

// ---------- hạt bụi ----------
function burst(ctx, wx, wy, n, cols) {
  const R = Math.random;
  for (let i = 0; i < n; i++) ST.parts.push({ x: wx + (R() - 0.5) * 8, y: wy - R() * 4, vx: (R() - 0.5) * 50, vy: -20 - R() * 30, g: 120, t: 0.3 + R() * 0.3, c: cols[(R() * cols.length) | 0] });
}

// ---------- hành động ----------
/* plan-19: clip PixelLab cuốc/tưới/thu hoạch (quay mặt về ô), không có clip thì bỏ qua */
function playAct(ctx, name, tx, ty) { const p = ctx.S.player; if (!p || !p.act || !p.hasAct || !p.hasAct(name) || p.custom) return; p.faceTo(tx * TS + 8, ty * TS + 8); p.act(name, 0); }
function doTill(ctx, tx, ty) {
  const t = L(ctx), z = zoneData(ctx);
  if (tileCount(z) >= MAX_TILES) { ctx.toast(t.full); ctx.sfx('fail'); return false; }
  const rec = { crop: null, stage: 0, wet: false, planted: 0, waterDays: 0, q: 0, dead: false };
  z.tiles[key(tx, ty)] = rec; applyTile(ctx, tx, ty, rec);
  playAct(ctx, 'hoe', tx, ty);
  ctx.sfx('till'); if (!(ctx.vfxAt && ctx.vfxAt(ctx.S.player, 'dirt_puff', tx * TS + 8, ty * TS + 13))) burst(ctx, tx * TS + 8, ty * TS + 10, 7, [PAL.dirt, PAL.dirtD, '#8a6238']);   /* plan-19: VFX PixelLab, hạt code chỉ còn là dự phòng */ ctx.toast(t.tilled); ctx.persist(); return true;
}
function doSow(ctx, tx, ty, seed) {
  const t = L(ctx), z = zoneData(ctx), rec = z.tiles[key(tx, ty)]; if (!rec || rec.crop) return false;
  if (!ctx.bag.has(seed.id, 1)) return false;
  ctx.bag.remove(seed.id, 1);
  rec.crop = seed.crop; rec.stage = 0; rec.planted = ctx.clock.dayIndex; rec.waterDays = 0; rec.q = 0; rec.dead = false;
  ctx.sfx('sow'); burst(ctx, tx * TS + 8, ty * TS + 10, 5, [PAL.grass, PAL.grassD]); ctx.toast(`${t.sown}: ${ctx.itemIcon(seed.id)} ${ctx.itemName(seed.id)}`); ctx.persist(); return true;
}
function doWater(ctx, tx, ty) {
  const t = L(ctx), f = root(ctx), z = zoneData(ctx), rec = z.tiles[key(tx, ty)]; if (!rec || rec.wet) return false;
  if (f.bucketWater <= 0) { ctx.toast(t.emptyBucket); ctx.sfx('fail'); return false; }
  f.bucketWater -= 1; rec.wet = true; applyTile(ctx, tx, ty, rec);
  playAct(ctx, 'water', tx, ty);
  ctx.sfx('water'); if (!(ctx.vfxAt && ctx.vfxAt(ctx.S.player, 'water_splash', tx * TS + 8, ty * TS + 13))) burst(ctx, tx * TS + 8, ty * TS + 8, 7, [PAL.waterL, PAL.foam, PAL.water]);   /* plan-19 */ ctx.persist(); return true;
}
function doFill(ctx) {
  const t = L(ctx), f = root(ctx);
  if (f.bucketWater >= BUCKET_MAX) { ctx.toast(t.bucketFull); return false; }
  f.bucketWater = BUCKET_MAX; ctx.sfx('bucket_fill'); ctx.toast(`${t.filled} ${t.hud(f.bucketWater, BUCKET_MAX)}`); ctx.persist(); return true;
}
function doHarvest(ctx, tx, ty) {
  const t = L(ctx), f = root(ctx), z = zoneData(ctx), rec = z.tiles[key(tx, ty)]; if (!rec || !ripe(rec)) return false;
  const def = CROP[rec.crop], n = 2 + ((Math.random() * 3) | 0);
  const q = rec.waterDays >= def.days ? 2 : rec.waterDays * 2 >= def.days ? 1 : 0;
  const got = ctx.give(rec.crop, n, tx * TS + 8, ty * TS + 12); if (got <= 0) return false;   /* plan-24: quả rơi ra ô ruộng */
  f.harvested += got; f.quality[q] = (f.quality[q] || 0) + got; rec.q = q;
  const name = ctx.itemName(rec.crop), icon = ctx.itemIcon(rec.crop), col = FRUIT[rec.crop][0];
  if (def.regrow) { rec.stage = Math.max(0, def.days - def.regrow); rec.waterDays = 0; }
  else { rec.crop = null; rec.stage = 0; rec.waterDays = 0; rec.dead = false; }
  playAct(ctx, 'harvest', tx, ty);
  ctx.sfx('harvest'); if (!(ctx.vfxAt && ctx.vfxAt(ctx.S.player, 'crop_sparkle', tx * TS + 8, ty * TS + 13))) burst(ctx, tx * TS + 8, ty * TS + 8, 8, [col, PAL.grass, '#ffd45e']);   /* plan-19 */
  ctx.toast(`+${got} ${icon} ${name}${t.stars[q]}`); if (ctx.pop) ctx.pop(ctx.S.player.x, ctx.S.player.y - 18, `+${got} ${icon}`);
  ctx.clock.log(t.harvested(got, name) + t.stars[q]); ctx.persist(); return true;
}
function doPull(ctx, tx, ty) {
  const t = L(ctx), z = zoneData(ctx), rec = z.tiles[key(tx, ty)]; if (!rec || !rec.dead) return false;
  rec.crop = null; rec.stage = 0; rec.dead = false; rec.waterDays = 0;
  ctx.sfx('pull'); burst(ctx, tx * TS + 8, ty * TS + 8, 6, ['#8a6a3c', '#6b4a2a']); ctx.toast(t.pulled); ctx.persist(); return true;
}
function doPlaceScare(ctx, tx, ty) {
  const t = L(ctx), z = zoneData(ctx); if (!ctx.bag.has('scarecrow', 1)) return false;
  const o = placeScare(ctx, tx, ty); if (!o) return false;
  ctx.bag.remove('scarecrow', 1); z.scarecrows.push({ x: tx, y: ty });
  ctx.sfx('place'); burst(ctx, tx * TS + 8, ty * TS + 12, 6, [PAL.dirt, '#d9c07a']); ctx.toast(t.placed); ctx.persist(); return true;
}
function doTakeScare(ctx, s) {
  const t = L(ctx), z = zoneData(ctx);
  if (ctx.give('scarecrow', 1, s.o.x * TS + 8, s.o.y * TS + 14) <= 0) return false;
  ctx.removeObject(ctx.S.map, s.o); ST.scare = ST.scare.filter(e => e !== s);
  z.scarecrows = z.scarecrows.filter(e => !(e.x === s.x && e.y === s.y));
  ctx.sfx('pickup'); ctx.toast(t.taken); ctx.persist(); return true;
}

// ---------- ứng viên hành động cho 1 ô ----------
/* plan-20: MÓN ĐANG CẦM quyết định (hotbar kiểu Stardew). Tay không: thu hoạch, nhổ cây héo. Cầm hạt X → gieo X; xô → tưới; xẻng → cày; bù nhìn → đặt.
   Cầm sai món → kind 'need' (chỉ nhắc). aim = ô đang trỏ chuột: chỉ khi đó mới nhắc "cần cầm xẻng" trên ô cỏ trống (không spam khi đi ngang). */
const holds = (ctx, id) => (ctx.holding ? ctx.holding(id) : ctx.tool.tier(id) >= 1 || ctx.bag.has(id, 1));
const need = (ctx, id, tx, ty) => ({ kind: 'need', label: ctx.needHold ? ctx.needHold(id) : id, tx, ty, needId: id });
function anySeed(ctx) { for (const crop of CROPS) if (ctx.bag.has('seed_' + crop, 1)) return 'seed_' + crop; return null; }
function tileCand(ctx, tx, ty, aim) {
  const t = L(ctx), f = root(ctx), z = zoneData(ctx), rec = z.tiles[key(tx, ty)];
  const shovel = holds(ctx, 'shovel'), bucket = holds(ctx, 'bucket'), hs = ctx.heldSeed ? ctx.heldSeed() : null;
  if (rec) {
    if (rec.crop && rec.dead) return { kind: 'pull', label: t.pull, tx, ty };
    if (rec.crop && ripe(rec)) return { kind: 'harvest', label: t.harvest, tx, ty };
    if (!rec.crop) {
      if (hs) { const crop = hs.slice(5); if (!ctx.bag.has(hs, 1)) return null; return cropOk(ctx, crop) ? { kind: 'sow', label: t.sow(ctx.itemName(hs)), tx, ty, seed: { crop, id: hs } } : { kind: 'deny', label: t.wrongSeason, tx, ty, why: t.wrongSeason }; }
      if (!ctx.heldSeed) { const { pick, any } = pickSeed(ctx); if (pick) return { kind: 'sow', label: t.sow(ctx.itemName(pick.id)), tx, ty, seed: pick }; if (any) return { kind: 'deny', label: t.wrongSeason, tx, ty, why: t.wrongSeason }; }
    }
    if (!rec.wet) {
      if (bucket) return f.bucketWater <= 0 ? { kind: 'deny', label: t.emptyBucket, tx, ty, why: t.emptyBucket } : { kind: 'water', label: t.water, tx, ty };
      if (rec.crop && ctx.tool.tier('bucket') >= 1) return need(ctx, 'bucket', tx, ty);
      if (!rec.crop && aim) { const sd = anySeed(ctx); if (sd) return need(ctx, sd, tx, ty); }
      if (rec.crop && !ctx.holding) return { kind: 'deny', label: t.water, tx, ty, why: t.needBucket };
    }
    return null;
  }
  const mine = inFarmPlot(ctx, tx, ty), free = tillable(ctx, tx, ty);
  if (!free) return null;
  const scare = ctx.bag.has('scarecrow', 1) && (ctx.holding ? ctx.holding('scarecrow') : true);
  if (mine) {
    if (scare) return { kind: 'scare', label: t.placeScare, tx, ty };
    if (shovel) return { kind: 'till', label: t.till, tx, ty };
    /* ô cỏ trống: không cầm xẻng → để click = đi tới (không tự chọn xẻng, kẻo đi đâu cũng cày) */
    if (!ctx.holding && pickSeed(ctx).any) return { kind: 'deny', label: t.till, tx, ty, why: t.needShovel };
    return null;
  }
  // trong khu nước KHÁC khi đang cầm xẻng (hoặc bù nhìn) → nhãn từ chối rõ; ngoài mọi khu → im lặng
  if (ctx.plotOf(tx, ty) && (shovel || scare)) return ctx.trespass ? { kind: 'trespass', label: t.till, tx, ty } : { kind: 'deny', label: t.notMine, tx, ty, why: t.notMine };   /* plan-18: cày khu nước khác = xâm phạm */
  return null;
}

// ---------- qua ngày ----------
function nextSeasonOf(ctx, info) {
  const S = ctx.clock.SEASONS, i = S.indexOf(info.season);
  return info.day >= ctx.clock.DAYS_PER_SEASON ? S[(i + 1) % S.length] : info.season;
}
function seasonFits(ctx, crop, season) { const it = ctx.ITEMS[crop]; const tg = it ? it.tags : []; return tg.includes('any') || tg.includes(season); }
function dayEnd(ctx, info) {
  const t = L(ctx), f = root(ctx), cur = ctx.S.zone ? ctx.S.zone.id : null, ns = nextSeasonOf(ctx, info || { day: ctx.clock.day, season: ctx.clock.season });
  let grew = 0, wilted = 0;
  for (const [id, z] of Object.entries(f)) {
    if (!isZoneData(z) || !z.tiles) continue;
    for (const [k, rec] of Object.entries(z.tiles)) {
      if (!rec || typeof rec !== 'object') { delete z.tiles[k]; continue; }
      if (rec.crop && !rec.dead) {
        const was = ripe(rec);
        if (rec.wet) { if (!was) { rec.stage = (rec.stage | 0) + 1; rec.waterDays = (rec.waterDays | 0) + 1; grew++; } }
        else if (!was) rec.waterDays = 0;   /* cây chín chờ thu: giữ nguyên chuỗi ngày tưới (chất lượng), không cần tưới thêm */
        if (!seasonFits(ctx, rec.crop, ns)) { rec.dead = true; wilted++; }
      }
      rec.wet = false;
      if (id === cur && ctx.S.map) applyTile(ctx, +k.split(',')[0], +k.split(',')[1], rec);
    }
  }
  if (grew) ctx.clock.log(t.grew(grew));
  if (wilted) ctx.clock.log(t.wilted(wilted));
}
function dayStart(ctx) {   // an toàn: sau khi đổi ngày (kể cả clock.set debug) cây sai mùa hiện tại → héo
  const f = root(ctx), s = ctx.season();
  for (const z of Object.values(f)) { if (!isZoneData(z) || !z.tiles) continue; for (const rec of Object.values(z.tiles)) if (rec && rec.crop && !rec.dead && !seasonFits(ctx, rec.crop, s)) rec.dead = true; }
}

// ---------- vào vùng ----------
function restoreZone(ctx) {
  const m = ctx.S.map, z = zoneData(ctx);
  for (const k of Object.keys(z.tiles)) {
    const [x, y] = k.split(',').map(Number), rec = z.tiles[k];
    if (!Number.isFinite(x) || !Number.isFinite(y) || x < 1 || y < 1 || x >= m.w - 1 || y >= m.h - 1 || !rec || typeof rec !== 'object') { delete z.tiles[k]; continue; }
    if (ctx.isSolid(m, x, y) || ctx.hasObjectAt(m, x, y)) { delete z.tiles[k]; continue; }   /* khu vừa nâng cấp đè lên ô ruộng → bỏ ô đó */
    if (rec.crop && !CROP[rec.crop]) { rec.crop = null; rec.stage = 0; rec.dead = false; }
    applyTile(ctx, x, y, rec);
  }
  z.scarecrows = z.scarecrows.filter(s => Number.isFinite(s.x) && Number.isFinite(s.y) && !z.tiles[key(s.x, s.y)] && placeScare(ctx, s.x, s.y));
}
function checkIntegrity(ctx) {   // mỗi ~1 s: khu nâng cấp/lát lại nền → đặt lại tile ruộng, bù nhìn bị gỡ → đặt lại
  const m = ctx.S.map, z = zoneData(ctx);
  for (const k of Object.keys(z.tiles)) {
    const [x, y] = k.split(',').map(Number), rec = z.tiles[k], want = rec.wet ? T.TILLED_WET : T.TILLED;
    if (ctx.getG(m, x, y) !== want) { if (ctx.hasObjectAt(m, x, y) || ctx.isSolid(m, x, y)) delete z.tiles[k]; else applyTile(ctx, x, y, rec); }
  }
  const live = new Set(m.objects);
  for (const s of ST.scare.slice()) if (!live.has(s.o)) { ST.scare = ST.scare.filter(e => e !== s); placeScare(ctx, s.x, s.y); }
}

// ---------- module ----------
function drawSoilSquares(g, ctx, cx, cy) {   /* ô cày = 1 ô vuông PixelLab (anh chọn 2026-10-10); lớp nền nên người/cây đứng trên không bị che */
  if (!ART.sqSoil) return; const z = zoneData(ctx), m = ctx.S.map, S0 = ART.soilSq;
  const x0 = cx - 16, y0 = cy - 16, x1 = cx + ctx.VW + 16, y1 = cy + ctx.VH + 16;
  for (const k of Object.keys(z.tiles)) {
    const rec = z.tiles[k]; if (!rec) continue; const [tx, ty] = k.split(',').map(Number), wx = tx * TS, wy = ty * TS;
    if (wx < x0 || wx > x1 || wy < y0 || wy > y1) continue;
    const gnd = ctx.getG(m, tx, ty); if (gnd !== T.TILLED && gnd !== T.TILLED_WET) continue;   /* đã thành ao / đổi nền → thôi */
    const im = ART.soilTile ? ART.soilTile(!!rec.wet, ART.soilMask(m, tx, ty), rec.wet && ART.wetMask ? ART.wetMask(m, tx, ty) : 0) : null;   /* nối liền với ô đất kề; vết ướt bo góc (anh yêu cầu) */
    g.drawImage(im || (rec.wet ? S0.wet : S0.dry), wx - cx, wy - cy, TS, TS);   /* ảnh 32 px (2×) → đúng 1 ô 16×16 */
  }
}
export const farm = {
  drawGround(g, ctx, cx, cy) { drawSoilSquares(g, ctx, cx, cy); },
  id: 'farm',

  onZoneEnter(ctx) {
    /* plan-21: quái gặm cây trồng — danh sách ô có cây + lấy mất 1 cây (trả id nông sản để quái ôm chạy) */
    ctx.farmUntill = (tx, ty) => { const z = zoneData(ctx); delete z.tiles[key(tx, ty)]; ctx.persist(); };   /* plan-25: ô ruộng thành ao */
    ctx.farmCrops = () => Object.entries(zoneData(ctx).tiles).filter(([, r]) => r.crop && !r.dead).map(([k]) => { const [tx, ty] = k.split(',').map(Number); return { tx, ty }; });
    ctx.farmSteal = (tx, ty) => { const z = zoneData(ctx), rec = z.tiles[key(tx, ty)]; if (!rec || !rec.crop) return null; const crop = rec.crop; rec.crop = null; rec.stage = 0; rec.waterDays = 0; rec.dead = false; ctx.persist(); return crop; };
    ST.ctx = ctx; ST.scare.length = 0; ST.parts.length = 0; ST.chk = 0; ST.zone = ctx.S.zone ? ctx.S.zone.id : null;
    if (ctx.clock) { ctx.clock.onDayEnd(dayEnd); ctx.clock.onDayStart(dayStart); }
    root(ctx);
    const m = ctx.S.map; if (!m || !ctx.S.zone || !m.plots || !m.plots.length) return;   /* biển / vực: không có plot → không ruộng */
    ensureSprites(ctx);
    try { restoreZone(ctx); } catch (e) { console.error('farm restore', e); }
    if (typeof window !== 'undefined') window.__farm = {   /* móc test */
      give: (seed, n = 1) => ctx.bag.add(String(seed).startsWith('seed_') ? seed : 'seed_' + seed, n),
      tools: () => { if (ctx.tool.tier('shovel') < 1) ctx.tool.set('shovel', 1); if (ctx.tool.tier('bucket') < 1) ctx.tool.set('bucket', 1); },
      tick: () => { const info = { day: ctx.clock.day, season: ctx.clock.season, year: ctx.clock.year, dayIndex: ctx.clock.dayIndex }; dayEnd(ctx, info); const S = ctx.clock.SEASONS; let d = info.day + 1, s = info.season, y = info.year; if (d > ctx.clock.DAYS_PER_SEASON) { d = 1; const i = S.indexOf(s) + 1; if (i >= S.length) { s = S[0]; y++; } else s = S[i]; } ctx.clock.set({ day: d, season: s, year: y, hour: 6, minute: 0 }); dayStart(ctx); ctx.persist(); return ctx.clock.label('vi'); },
      state: () => JSON.parse(JSON.stringify({ bucketWater: root(ctx).bucketWater, harvested: root(ctx).harvested, quality: root(ctx).quality, zone: zoneData(ctx) })),
      near: () => farm.near(ctx),
      press: () => { const c = farm.near(ctx); if (c) farm.interact(ctx, c); return c ? c.label : null; },
      act: (kind, tx, ty) => { const p = ctx.S.player; tx = tx ?? Math.floor(p.x / TS); ty = ty ?? Math.floor(p.y / TS); if (kind === 'till') return doTill(ctx, tx, ty); if (kind === 'sow') { const s = pickSeed(ctx).pick; return !!s && doSow(ctx, tx, ty, s); } if (kind === 'water') return doWater(ctx, tx, ty); if (kind === 'fill') return doFill(ctx); if (kind === 'harvest') return doHarvest(ctx, tx, ty); if (kind === 'pull') return doPull(ctx, tx, ty); if (kind === 'scare') return doPlaceScare(ctx, tx, ty); return false; },
      plot: () => { const p = farmPlot(ctx); return p ? { x: p.x, y: p.y, w: p.w, h: p.h, idx: p.idx, mine: p.mine, nation: p.nation } : null }
    };
  },

  onZoneLeave() { ST.scare.length = 0; ST.parts.length = 0; },

  update(dt, ctx) {
    for (let i = ST.parts.length - 1; i >= 0; i--) { const p = ST.parts[i]; p.t -= dt; if (p.t <= 0) { ST.parts.splice(i, 1); continue; } p.x += p.vx * dt; p.y += p.vy * dt; p.vy += p.g * dt; }
    const m = ctx.S.map; if (!m || !ctx.S.zone || !m.plots || !m.plots.length) return;
    ST.chk -= dt; if (ST.chk <= 0) { ST.chk = 1.2; try { checkIntegrity(ctx); } catch (e) { console.error('farm check', e); } }
  },

  near(ctx) {
    if (ctx.S.mode !== 'play') return null;
    const p = ctx.S.player, m = ctx.S.map; if (!p || !m || !ctx.S.zone || !m.plots || !m.plots.length) return null;
    const t = L(ctx);
    // 1) ô dưới chân, rồi ô trước mặt (thắng cả 'gỡ bù nhìn': ô kề bù nhìn vẫn tưới/thu hoạch được — sửa 2026-09-28)
    const tx = Math.floor(p.x / TS), ty = Math.floor(p.y / TS), [dx, dy] = DIRV[p.dir] || [0, 1];
    /* 0) ô dưới con trỏ chuột (kiểu Stardew): trong tầm 1 ô quanh người → thắng ô dưới chân/trước mặt; khung con trỏ hiện ở ô đó */
    HOVER = null; const mt = ctx.mouseTile && ctx.mouseTile();
    if (mt && !ctx.mouseOnSprite && Math.abs(mt.tx - tx) <= 1 && Math.abs(mt.ty - ty) <= 1 && mt.tx >= 0 && mt.ty >= 0 && mt.tx < m.w && mt.ty < m.h) {
      const h = tileCand(ctx, mt.tx, mt.ty, true);
      if (h) { HOVER = { tx: mt.tx, ty: mt.ty, ok: h.kind !== 'deny' && h.kind !== 'need' }; return { label: h.label, x: p.x + 6, y: p.y, limit: 30, data: h, mouse: true, cursor: 'tool', need: h.kind === 'need', needId: h.needId }; }   /* chủ ý trỏ chuột → ưu tiên hơn NPC/vật thể kề (≤ 22); con trỏ nông cụ */
    }
    /* 0b) trỏ chuột vào giếng / ô nước khi xô chưa đầy → múc nước (thắng ô dưới chân) */
    if (mt && !holds(ctx, 'bucket') && ctx.tool.tier('bucket') >= 1 && ctx.needHold && root(ctx).bucketWater < BUCKET_MAX) { const w = nearWater(ctx); if (w && (w.well || ctx.tool.tier('rod') < 1) && Math.hypot(mt.wx - w.x, mt.wy - w.y) < 30)   /* nước tự nhiên + có cần câu → để câu cá (cầm xô rồi click mới múc) */ return { label: ctx.needHold('bucket'), x: mt.wx, y: mt.wy, limit: 30, data: { kind: 'need' }, mouse: true, cursor: 'tool', need: true, needId: 'bucket' }; }   /* trỏ giếng/nước khi chưa cầm xô → click tự cầm xô */
    if (mt && holds(ctx, 'bucket') && root(ctx).bucketWater < BUCKET_MAX) { const w = nearWater(ctx); if (w && Math.hypot(mt.wx - w.x, mt.wy - w.y) < 30) return { label: t.fill, x: p.x + 6, y: p.y, limit: 30, data: { kind: 'fill' }, mouse: true, cursor: 'tool' }; }
    const c = tileCand(ctx, tx, ty) || tileCand(ctx, tx + dx, ty + dy);
    if (c && c.kind !== 'deny' && c.kind !== 'need') return { label: c.label, x: p.x + TILE_BIAS, y: p.y, limit: TILE_BIAS + 15, data: c };
    // 2) bù nhìn cạnh người chơi → gỡ
    for (const s of ST.scare) { const wx = s.x * TS + 8, wy = s.y * TS + 12; const d = Math.hypot(wx - p.x, wy - p.y); if (d < 20) return { label: t.takeScare, x: wx, y: wy, limit: 20, data: { kind: 'takeScare', s } }; }
    // 3) múc nước (giếng / ô nước) khi có xô — thắng nhãn từ chối
    if (holds(ctx, 'bucket') && root(ctx).bucketWater < BUCKET_MAX) { const w = nearWater(ctx); if (w) return { label: t.fill, x: w.x, y: w.y, limit: 34, data: { kind: 'fill' } }; }
    if (c) return { label: c.label, x: p.x + TILE_BIAS, y: p.y, limit: TILE_BIAS + 15, data: c, need: c.kind === 'need', needId: c.needId };
    return null;
  },

  interact(ctx, cand) {
    const d = cand && cand.data; if (!d) return;
    const p = ctx.S.player;
    if (d.kind !== 'fill' && d.kind !== 'takeScare' && p.faceTo && (d.tx !== Math.floor(p.x / TS) || d.ty !== Math.floor(p.y / TS))) p.faceTo(d.tx * TS + 8, d.ty * TS + 8);
    switch (d.kind) {
      case 'deny': ctx.toast(d.why || d.label); ctx.sfx('fail'); break;
      case 'trespass': ctx.trespass(d.tx, d.ty, 'farm'); break;
      case 'till': doTill(ctx, d.tx, d.ty); break;
      case 'sow': doSow(ctx, d.tx, d.ty, d.seed); break;
      case 'water': doWater(ctx, d.tx, d.ty); break;
      case 'harvest': doHarvest(ctx, d.tx, d.ty); break;
      case 'pull': doPull(ctx, d.tx, d.ty); break;
      case 'scare': doPlaceScare(ctx, d.tx, d.ty); break;
      case 'takeScare': doTakeScare(ctx, d.s); break;
      case 'fill': doFill(ctx); break;
    }
  },

  drawables(ctx, cx, cy) {
    const m = ctx.S.map; if (!m || !m.plots || !m.plots.length) return [];
    const z = zoneData(ctx), out = [], g = ctx.g;
    const x0 = cx - 32, y0 = cy - 48, x1 = cx + ctx.VW + 32, y1 = cy + ctx.VH + 32;
    if (HOVER) { const hx = HOVER.tx * TS, hy = HOVER.ty * TS; out.push({ y: hy + 0.6, f: () => { if (!HOVER.ok) g.globalAlpha = 0.45; g.drawImage(IMG.cursor, hx - cx, hy - cy); g.globalAlpha = 1; } }); }
    for (const k of Object.keys(z.tiles)) {
      const rec = z.tiles[k]; if (!rec) continue;
      const [tx, ty] = k.split(',').map(Number), wx = tx * TS, wy = ty * TS;
      if (wx < x0 || wx > x1 || wy < y0 || wy > y1) continue;
      /* chế độ px: nền Wang xếp T.TILLED vào lớp cỏ nền nên không hiện ảnh tiles TILLED của gói → vẽ đè ô cày ngay trên nền (y = mép trên + 1, dưới mọi vật/người đứng trên ô) */
      if (ART.sqSoil) { /* ô vuông vẽ ở drawGround */ }
      else if (ART.on && ART.tilled) { if (rec.wet) out.push({ y: wy + 1, f: () => { ART.tilledWet(g, m, tx, ty, wx - cx, wy - cy); } }); }
      else if (ART.on) { const fr = tiles[rec.wet ? T.TILLED_WET : T.TILLED]; if (fr && fr.length) { const im = fr.pick ? fr.pick(tx, ty) : fr[0]; out.push({ y: wy + 1, f: () => { g.drawImage(im, wx - cx, wy - cy); } }); } }
      if (!rec.crop) continue;
      const img = rec.dead ? IMG[`crop_${rec.crop}_dead`] : IMG[`crop_${rec.crop}_${frameOf(rec)}`]; if (!img) continue;
      const lift = frameOf(rec) === 'seed' ? 0 : CROP_LIFT;   /* anh yêu cầu 2026-10-10: hạt và cây mọc lên ở TRUNG TÂM ô đất */
      out.push({ y: wy + TS, f: () => { g.drawImage(img, wx - cx + ((TS - img.width) >> 1), wy + TS - img.height - lift - cy); } });
    }
    return out;
  },

  draw(g, ctx, cx, cy) {
    const m = ctx.S.map; if (!m) return;
    // lấp lánh nhẹ trên cây chín (1 điểm sáng nhấp theo thời gian, không rung)
    const z = zoneData(ctx), tm = ctx.S.time || 0;
    for (const k of Object.keys(z.tiles)) {
      const rec = z.tiles[k]; if (!rec || !ripe(rec)) continue;
      const [tx, ty] = k.split(',').map(Number), sx = tx * TS - cx, sy = ty * TS - cy;
      if (sx < -16 || sy < -16 || sx > ctx.VW || sy > ctx.VH) continue;
      if (Math.floor(tm * 2 + tx + ty) % 3 === 0) { g.fillStyle = 'rgba(255,255,255,.85)'; g.fillRect(sx + 3 + ((tx * 5) % 9), sy + 2 + ((ty * 3) % 5), 1, 1); }
    }
    for (const p of ST.parts) { g.fillStyle = p.c; g.fillRect(Math.round(p.x - cx), Math.round(p.y - cy), 2, 2); }
  },

  hudLines(ctx) {
    if (!ctx.S.save || ctx.tool.tier('bucket') < 1) return [];
    const t = L(ctx); return [t.hud(root(ctx).bucketWater, BUCKET_MAX)];
  }
};
