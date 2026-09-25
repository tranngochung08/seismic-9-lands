// pens.js — F03 Chuồng thú (plan-17 đợt 1, tác nhân A2-PEN).
//  · Vật phẩm 'pen1' (chuồng gỗ) / 'pen2' (chuồng đá, sức chứa gấp đôi) từ RECIPES → đứng trên bãi trống 4×3 ô TRONG plot nước mình
//    (ctx.myPlot(), quyết định 2 của anh) → E 'Dựng chuồng'. Chuồng = rào fence_h/fence_v sẵn + cổng 'pen_gate' + máng 'pen_trough'
//    + bảng tên 'pen_sign' (ctx.defineObject, ảnh gói qua HOOK.image cùng khóa, vẽ code khi không có).
//  · Thả thú: đang bế thú (ctx.carry) đứng cạnh cổng → E. Nhỏ (gà/chim/thỏ/cua) = 1 chỗ, lớn (bò/cừu) = 2 chỗ; pen1 4 chỗ, pen2 8 chỗ.
//  · Cho ăn: E ở máng với rơm 🌾 hoặc bắp 🌽 → mỗi lần 1 con no. Vuốt ve: E cạnh thú → +1 tim/ngày (tối đa 5).
//  · Hết ngày (ctx.clock.onDayEnd): no → giữ tim + sản phẩm sáng (gà→trứng, bò→sữa, cừu→len, thỏ→lông thỏ, chim→lông chim);
//    đói → −1 tim, KHÔNG chết (quyết định 3: không hình phạt). Tim ≥ 4 → bậc vàng (q=2, nhận ×2 vì items.js chưa có chất lượng).
//  · Bảng chuồng: E ở bảng tên → ctx.panel: tên (đổi được), tim, no/đói, sản phẩm chờ → E/nút 'Lấy'. Sữa cần xô (ctx.tool.tier('bucket') ≥ 1).
//  · Save: save.sys.pens[zone] = [{ x, y, tier, animals: [{kind, name, heart, fed, pet}], products: [{id, q}] }]. Save cũ thiếu → {}.
//  · Chuồng gà cũ eco_coop (ecology.js) giữ nguyên, nằm ngoài plot nên không đụng nhau.
import { HOOK, mkCanvas, PAL } from '../gfx.js';
import { dirFrame } from './animals.js';

const TILE = 16, TAU = Math.PI * 2;
const PW = 4, PH = 3;                                   /* dấu chân chuồng chuẩn: 4 ngang × 3 dọc ô (rào quanh, trong 2×1 ô); khu chật (bậc ≥4, tượng Rocky cao + nhà) → bản hẹp 3×3 */
const HEART_MAX = 5, PROD_MAX = 12;
/* loài ở chuồng được: cat nhỏ = 1 chỗ, lớn = 2 chỗ; prod = sản phẩm sáng; tool = dụng cụ cần khi lấy */
const KINDS = {
  chicken: { cat: 'small', prod: 'egg', icon: '🐔' }, bird: { cat: 'small', prod: 'feather', icon: '🐦' },
  rabbit: { cat: 'small', prod: 'fur_rabbit', icon: '🐰' }, crab: { cat: 'small', prod: null, icon: '🦀' },
  cow: { cat: 'large', prod: 'milk', icon: '🐄', tool: 'bucket' }, sheep: { cat: 'large', prod: 'wool', icon: '🐑' }
};
const SLOT = { small: 1, large: 2 };
const CAP = { 1: 4, 2: 8 };
const MOVE = { chicken: { sp: 14, anim: 5 }, bird: { sp: 16, anim: 6 }, rabbit: { sp: 22, anim: 8 }, crab: { sp: 10, anim: 5 }, cow: { sp: 8, anim: 3 }, sheep: { sp: 9, anim: 3 } };
const FEED = ['hay', 'corn'];
/* nền không dựng được (nước, dung nham, vực, cầu, bến, đất cày của farm) — còn lại (cỏ, đất, sỏi, đá…) đều là 'bãi trống' */
const BAD_NAMES = ['NONE', 'WATER', 'LAVA', 'CHASM', 'BRIDGE', 'ICE', 'REEF', 'DEEP', 'DOCK', 'SEABED', 'ABYSS', 'TILLED', 'TILLED_WET'];
let BAD_GROUND = null;
const badGround = ctx => BAD_GROUND || (BAD_GROUND = new Set(BAD_NAMES.map(n => ctx.T[n]).filter(v => v !== undefined)));

const STR = {
  en: {
    kind: { chicken: 'Hen', bird: 'Bird', rabbit: 'Rabbit', crab: 'Crab', cow: 'Cow', sheep: 'Sheep' },
    tier: { 1: 'Wooden pen', 2: 'Stone pen' },
    build: t => `Build ${t === 2 ? 'stone' : 'wooden'} pen`, small: ' (narrow 3×3)', buildBad: 'Pen: needs a clear 4×3 patch inside your nation\'s yard',
    notMine: 'Pens can only be built inside your own nation\'s yard', built: 'Pen built! Carry animals to the gate, put hay in the trough',
    bad: { free: 'Not enough room here — stand on a clear 4×3 patch inside the yard (walls, road, trees and other pens in the way)', edge: 'Too close to the yard wall — step further inside', gate: 'The gate needs open ground below it' },
    release: n => `Put ${n} in the pen`, full: 'Pen is full', fullMsg: 'Pen is full — craft a Stone pen (furnace: 8 rock + 4 iron) or build another pen',
    released: n => `${n} settles into the pen`, feed: (n, m) => `Feed 🌾 (${n}/${m} fed)`, feedNeed: 'Needs hay 🌾 (cut tall grass with a scythe) or corn 🌽',
    allFed: 'Everyone in the pen has eaten today', noAnimals: 'The pen is empty — carry an animal to the gate first',
    pet: n => `Pet ${n}`, petted: n => `${n} is happy ♥`, board: 'Pen board', boardN: n => `Pen board · ${n} to collect`,
    collect: 'Collect', needBucket: 'Milk needs a bucket — craft Bucket I at the workbench (3 wood + 1 resin)', got: s => `Collected: ${s}`, bagFull: 'Bag is full — some products stay in the pen',
    heart: 'Hearts', fed: 'Fed', hungry: 'Hungry', products: 'Waiting to collect', none: 'Nothing yet — feed them and sleep', empty: 'No animals yet. Carry one to the gate and press E.',
    rename: 'Rename', ok: 'OK', close: 'Close', gold: 'gold', hint: 'Feed every day (hay/corn), pet for +1 ♥ · hungry animals lose 1 ♥ but never die · 4 ♥ = gold products',
    log: (icon, n, item) => `${icon} ${n} ${item}`, logHungry: n => `${n} pen animal(s) went hungry (−1 ♥)`
  },
  vi: {
    kind: { chicken: 'Gà', bird: 'Chim', rabbit: 'Thỏ', crab: 'Cua', cow: 'Bò', sheep: 'Cừu' },
    tier: { 1: 'Chuồng gỗ', 2: 'Chuồng đá' },
    build: t => `Dựng chuồng ${t === 2 ? 'đá' : 'gỗ'}`, small: ' (bản hẹp 3×3)', buildBad: 'Chuồng: cần bãi trống 4×3 ô trong khu nước mình',
    notMine: 'Chuồng chỉ dựng được trong khu của nước mình', built: 'Đã dựng chuồng! Bế thú tới cổng để thả, bỏ rơm vào máng',
    bad: { free: 'Chỗ này không đủ trống — đứng trên bãi trống 4×3 ô trong khu (vướng tường, đường, cây hoặc chuồng khác)', edge: 'Sát tường khu quá — bước vào trong thêm', gate: 'Dưới cổng phải là đất trống' },
    release: n => `Thả ${n} vào chuồng`, full: 'Chuồng đầy', fullMsg: 'Chuồng đầy — chế Chuồng đá (Lò nung: 8 đá + 4 sắt) hoặc dựng thêm chuồng',
    released: n => `${n} đã vào chuồng`, feed: (n, m) => `Cho ăn 🌾 (${n}/${m} no)`, feedNeed: 'Cần rơm 🌾 (cắt cỏ cao bằng liềm) hoặc bắp 🌽',
    allFed: 'Cả chuồng đã no hôm nay', noAnimals: 'Chuồng trống — bế thú tới cổng thả vào trước',
    pet: n => `Vuốt ve ${n}`, petted: n => `${n} vui ♥`, board: 'Bảng chuồng', boardN: n => `Bảng chuồng · ${n} sản phẩm chờ`,
    collect: 'Lấy', needBucket: 'Vắt sữa cần xô — chế Xô I ở Bàn mộc (3 gỗ + 1 nhựa thông)', got: s => `Thu: ${s}`, bagFull: 'Túi đầy — phần còn lại để ở chuồng',
    heart: 'Tim', fed: 'No', hungry: 'Đói', products: 'Sản phẩm chờ lấy', none: 'Chưa có — cho ăn rồi đi ngủ', empty: 'Chưa có thú. Bế thú tới cổng rồi bấm E.',
    rename: 'Đổi tên', ok: 'OK', close: 'Đóng', gold: 'vàng', hint: 'Cho ăn mỗi ngày (rơm/bắp), vuốt ve +1 ♥ · đói −1 ♥ nhưng không chết · 4 ♥ = sản phẩm vàng',
    log: (icon, n, item) => `${icon} ${n} ${item}`, logHungry: n => `${n} con trong chuồng bị đói (−1 ♥)`
  }
};
const L = ctx => STR[ctx.lang() === 'vi' ? 'vi' : 'en'];
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* ---------------------------------------------------------------- save */
function sv(ctx) {
  const s = ctx.S.save; s.sys = s.sys || {};
  if (!s.sys.pens || typeof s.sys.pens !== 'object' || Array.isArray(s.sys.pens)) s.sys.pens = {};
  return s.sys.pens;
}
function zoneList(ctx, id = ctx.S.zone.id) { const all = sv(ctx); if (!Array.isArray(all[id])) all[id] = []; return all[id]; }
function normPen(r) {
  r.tier = r.tier === 2 ? 2 : 1; r.w = r.w === 3 ? 3 : 4; r.g = r.w === 3 ? 0 : r.g === 2 ? 2 : 1;
  if (!Array.isArray(r.animals)) r.animals = [];
  r.animals = r.animals.filter(a => a && KINDS[a.kind]);
  for (const a of r.animals) { a.name = String(a.name || '').slice(0, 12) || a.kind; a.heart = Math.max(0, Math.min(HEART_MAX, a.heart | 0)); a.fed = !!a.fed; a.pet = !!a.pet; }
  if (!Array.isArray(r.products)) r.products = [];
  r.products = r.products.filter(p => p && typeof p.id === 'string');
  return r;
}
const slotsUsed = r => r.animals.reduce((n, a) => n + (SLOT[KINDS[a.kind].cat] || 1), 0);
const capOf = r => CAP[r.tier] || CAP[1];

/* ---------------------------------------------------------------- hình (vẽ code; art.js thay tại chỗ qua HOOK.image nếu gói có) */
const px = (g, x, y, c, w = 1, h = 1) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
function art(w, h, fn) { const c = mkCanvas(w, h); fn(c.getContext('2d')); return c; }
const IMG = {
  pen_gate: HOOK.image('pen_gate', art(16, 16, g => {
    px(g, 1, 2, PAL.out, 4, 14); px(g, 2, 3, PAL.wood, 2, 12); px(g, 11, 2, PAL.out, 4, 14); px(g, 12, 3, PAL.wood, 2, 12);   /* hai trụ */
    px(g, 4, 5, PAL.out, 8, 3); px(g, 4, 6, '#b07a3e', 8, 1); px(g, 4, 10, PAL.out, 8, 3); px(g, 4, 11, '#b07a3e', 8, 1);   /* hai thanh ngang sáng hơn rào */
    px(g, 5, 7, PAL.woodD, 1, 3); px(g, 7, 7, PAL.woodD, 1, 3); px(g, 9, 7, PAL.woodD, 1, 3);
  })),
  pen_trough: HOOK.image('pen_trough', art(16, 8, g => {
    px(g, 0, 1, PAL.out, 16, 7); px(g, 1, 2, PAL.woodD, 14, 5); px(g, 2, 3, '#4a2f14', 12, 2); px(g, 1, 6, '#3d2510', 14, 1);
    px(g, 1, 1, '#b07a3e', 14, 1); px(g, 2, 7, PAL.out, 2, 1); px(g, 12, 7, PAL.out, 2, 1);
  })),
  pen_sign: HOOK.image('pen_sign', art(16, 12, g => {
    px(g, 7, 6, PAL.out, 3, 6); px(g, 8, 7, PAL.woodD, 1, 5);
    px(g, 1, 0, PAL.out, 14, 8); px(g, 2, 1, PAL.wood, 12, 6); px(g, 3, 2, '#e8dcc0', 10, 4); px(g, 4, 3, PAL.woodD, 4, 1); px(g, 9, 3, PAL.gem, 3, 2);
  })),
  pen_hay: HOOK.image('pen_hay', art(12, 5, g => {
    px(g, 1, 1, '#c9a53c', 10, 3); px(g, 0, 2, '#e3c25a', 12, 2); px(g, 2, 0, '#f0d878', 3, 1); px(g, 7, 0, '#f0d878', 3, 1); px(g, 4, 3, '#a8872a', 2, 1); px(g, 9, 2, '#a8872a', 1, 2);
  }))
};
let defined = false;
function defineObjects(ctx) {
  const def = (name, w, h, solid, fn) => {
    ctx.defineObject(name, w, h, 1, 1, g => { g.drawImage(IMG[name], 0, 0, IMG[name].width, IMG[name].height); if (fn) fn(g); }, { solid });
    const d = ctx.O[name], cv = IMG[name];
    if (d && cv && cv.__hi) { d.img = d.img0 = cv; d.w = d.w0 = cv.width; d.h = d.h0 = cv.height; d.ox = d.oy = 0; }   /* gói có ảnh 2× → dùng thẳng, giữ cả khi đổi vùng (applyObj rớt về img0) */
  };
  def('pen_gate', 16, 16, false);
  def('pen_trough', 16, 8, true);
  def('pen_sign', 16, 12, true);
  defined = true;
}

/* ---------------------------------------------------------------- hình học chuồng */
/* hàng trước (dưới) của chuồng: w = bề ngang (4 chuẩn / 3 hẹp), g = cột cổng. w4 g1: [rào][cổng][máng][bảng] · w4 g2: [rào][máng][cổng][bảng]
   (khu bậc ≥3 có nhà ở cột +6 nên lùi trái 1 ô, cổng vẫn trùng lối vào nam của khu) · w3 g0: [cổng][máng][bảng] (khu bậc ≥4 chỉ còn dải 3 cột) */
const wOf = r => (r.w === 3 ? 3 : 4);
const gCol = r => (wOf(r) === 3 ? 0 : r.g === 2 ? 2 : 1);
const gateT = r => ({ x: r.x + gCol(r), y: r.y + 2 }), troughT = r => ({ x: r.x + (gCol(r) === 2 ? 1 : gCol(r) === 0 ? 1 : 2), y: r.y + 2 }), signT = r => ({ x: r.x + wOf(r) - 1, y: r.y + 2 });
const cen = t => ({ x: t.x * TILE + 8, y: t.y * TILE + 12 });
/* vùng đi lại (px, chân thú): giữa rào, dưới rào trên (vẽ đè lên rào trên), trên rào dưới (rào dưới vẽ đè) */
const rect = r => ({ x0: r.x * TILE + 11, x1: (r.x + wOf(r)) * TILE - 11, y0: r.y * TILE + 22, y1: (r.y + PH - 1) * TILE + 4 });

/* kiểm chỗ dựng: gốc (x0,y0) = ô trên-trái, g = cột cổng; trả { ok, why } */
function spotCheck(ctx, x0, y0, g = 1, w = PW) {
  const map = ctx.S.map, my = ctx.myPlot(); if (!my) return { ok: false, why: 'notMine' };
  for (let j = 0; j < PH; j++) for (let i = 0; i < w; i++) {
    const tx = x0 + i, ty = y0 + j;
    const p = ctx.plotOf(tx, ty); if (!p || p.idx !== my.idx) return { ok: false, why: p ? 'notMine' : 'edge' };
    if (tx <= p.x || tx >= p.x + p.w - 1 || ty <= p.y || ty >= p.y + p.h - 1) return { ok: false, why: 'edge' };
    if (ctx.isSolid(map, tx, ty) || ctx.hasObjectAt(map, tx, ty) || badGround(ctx).has(ctx.getG(map, tx, ty))) return { ok: false, why: 'free' };
    if (map.roads && map.roads[ty * map.w + tx] === 1) return { ok: false, why: 'free' };
    if (map.reserved && map.reserved.some(q => q.x === tx && q.y === ty)) return { ok: false, why: 'free' };
  }
  const gt = gateT({ x: x0, y: y0, g, w }); if (ctx.isSolid(map, gt.x, gt.y + 1)) return { ok: false, why: 'gate' };
  return { ok: true };
}

/* ---------------------------------------------------------------- runtime */
let PENS = [];            /* [{ rec, i, objs: [], ents: [] }] — rec là bản ghi trong save (ghi thẳng) */
let fx = [];
let panelEl = null, openIdx = -1, closerSet = false, actionSet = false;
let dayHooked = false;

function mkEnt(pen, a, rng) {
  const rc = rect(pen.rec);
  const e = { a, kind: a.kind, x: rc.x0 + (rng ? rng() : Math.random()) * (rc.x1 - rc.x0), y: rc.y0 + (rng ? rng() : Math.random()) * (rc.y1 - rc.y0), ang: Math.random() * TAU, st: 'idle', t: 0.5 + Math.random() * 2, ft: Math.random() * 3, fr: 0, dir: 1, face: 's' };
  return e;
}
function placePen(ctx, rec, i) {
  const map = ctx.S.map, objs = [];
  const put = (type, x, y) => { if (ctx.hasObjectAt(map, x, y)) return; objs.push(ctx.place(map, type, x, y, { pen: i, pens: true })); };
  const w = wOf(rec);
  for (let k = 0; k < w; k++) put('fence_h', rec.x + k, rec.y);
  put('fence_v', rec.x, rec.y + 1); put('fence_v', rec.x + w - 1, rec.y + 1);
  if (w === 4) put('fence_h', rec.x, rec.y + PH - 1);
  const g = gateT(rec), t = troughT(rec), s = signT(rec);
  put('pen_gate', g.x, g.y); put('pen_trough', t.x, t.y); put('pen_sign', s.x, s.y);
  const pen = { rec, i, objs, ents: [] };
  const rng = ctx.rngFrom(ctx.hashStr('pen:' + ctx.S.zone.id + ':' + rec.x + ',' + rec.y));
  for (const a of rec.animals) pen.ents.push(mkEnt(pen, a, rng));
  PENS.push(pen);
  return pen;
}
function build(ctx, item, x0, y0, g = 1, w = PW) {
  const t = L(ctx);
  if (!ctx.bag.has(item)) return;
  const chk = spotCheck(ctx, x0, y0, g, w); if (!chk.ok) { ctx.toast(t.bad[chk.why] || t.notMine); ctx.sfx('fail'); return; }
  ctx.bag.remove(item, 1);
  const list = zoneList(ctx);
  const rec = normPen({ x: x0, y: y0, g, w, tier: item === 'pen2' ? 2 : 1, animals: [], products: [] });
  list.push(rec);
  placePen(ctx, rec, list.length - 1);
  const c = cen(gateT(rec)); puff(c.x + 16, c.y - 12, 12, '#d8c9a8');
  ctx.sfx('build'); ctx.toast(t.built, true); ctx.persist();
}
function defaultName(ctx, kind, rec) {
  const base = L(ctx).kind[kind] || kind; let n = 1;
  while (rec.animals.some(a => a.name === `${base} ${n}`)) n++;
  return `${base} ${n}`;
}
function carryPenable(ctx) {
  const c = ctx.carry.get();
  for (let i = 0; i < c.length; i++) { const k = typeof c[i] === 'string' ? c[i] : c[i] && c[i].kind; if (KINDS[k]) return { i, kind: k }; }
  return null;
}
function release(ctx, pen) {
  const t = L(ctx), it = carryPenable(ctx); if (!it) return;
  const rec = pen.rec, need = SLOT[KINDS[it.kind].cat];
  if (slotsUsed(rec) + need > capOf(rec)) { ctx.toast(t.fullMsg); ctx.sfx('fail'); return; }
  ctx.carry.remove(it.i);
  const a = { kind: it.kind, name: defaultName(ctx, it.kind, rec), heart: 1, fed: false, pet: false };
  rec.animals.push(a);
  const e = mkEnt(pen, a); pen.ents.push(e);
  puff(e.x, e.y - 6, 7); hearts(e.x, e.y - 10, 3);
  ctx.sfx('squeak'); ctx.toast(t.released(a.name)); ctx.persist();
}
function feed(ctx, pen) {
  const t = L(ctx), rec = pen.rec;
  if (!rec.animals.length) { ctx.toast(t.noAnimals); ctx.sfx('fail'); return; }
  const a = rec.animals.find(x => !x.fed); if (!a) { ctx.toast(t.allFed); return; }
  const item = FEED.find(id => ctx.bag.has(id, 1)); if (!item) { ctx.toast(t.feedNeed); ctx.sfx('fail'); return; }
  ctx.bag.remove(item, 1); a.fed = true;
  const c = cen(troughT(rec)); bits(c.x, c.y - 6, 6, '#e3c25a');
  const n = rec.animals.filter(x => x.fed).length;
  ctx.sfx('pickup'); ctx.toast(t.feed(n, rec.animals.length)); ctx.persist();
}
function pet(ctx, e) {
  const t = L(ctx), a = e.a; if (a.pet) return;
  a.pet = true; a.heart = Math.min(HEART_MAX, a.heart + 1);
  hearts(e.x, e.y - 10, 5); ctx.sfx('squeak'); ctx.toast(t.petted(a.name)); ctx.persist();
}
/* lấy sản phẩm ở bảng: sữa cần xô; túi đầy → phần còn lại giữ ở chuồng */
function collect(ctx, pen) {
  const t = L(ctx), rec = pen.rec; if (!rec.products.length) return false;
  const keep = [], got = {}; let needBucket = false, full = false;
  for (const p of rec.products) {
    const k = KINDS[Object.keys(KINDS).find(x => KINDS[x].prod === p.id)] || {};
    if (k.tool && ctx.tool.tier(k.tool) < 1) { keep.push(p); needBucket = true; continue; }
    if (full) { keep.push(p); continue; }
    const n = p.q === 2 ? 2 : 1, add = ctx.bag.add(p.id, n);
    if (add < n) { full = true; if (add === 0) { keep.push(p); continue; } }
    got[p.id] = (got[p.id] || 0) + add;
  }
  rec.products = keep;
  const s = Object.entries(got).map(([id, n]) => `${ctx.itemIcon(id)} ${ctx.itemName(id)} ×${n}`).join(' · ');
  if (s) { ctx.sfx('coin'); ctx.toast(t.got(s)); const c = cen(signT(rec)); ctx.pop(c.x, c.y - 16, '+' + Object.values(got).reduce((a, b) => a + b, 0)); }
  if (needBucket) ctx.toast(t.needBucket);
  if (full) ctx.toast(t.bagFull);
  ctx.persist();
  return !!s;
}

/* ---------------------------------------------------------------- hết ngày: mọi vùng trong save */
function dayEnd(ctx) {
  const t = L(ctx), all = sv(ctx), here = ctx.S.zone.id;
  const made = {}; let hungry = 0;
  for (const [zone, list] of Object.entries(all)) {
    if (!Array.isArray(list)) continue;
    for (const raw of list) {
      const rec = normPen(raw);
      for (const a of rec.animals) {
        if (a.fed) {
          const k = KINDS[a.kind];
          if (k.prod && rec.products.length < PROD_MAX) { rec.products.push({ id: k.prod, q: a.heart >= 4 ? 2 : 1 }); if (zone === here) made[k.prod] = (made[k.prod] || 0) + 1; }
        } else { a.heart = Math.max(0, a.heart - 1); if (zone === here) hungry++; }
        a.fed = false; a.pet = false;
      }
    }
  }
  if (ctx.clock && ctx.clock.log) {
    for (const [id, n] of Object.entries(made)) ctx.clock.log(t.log(ctx.itemIcon(id), n, ctx.itemName(id)));
    if (hungry) ctx.clock.log(t.logHungry(hungry));
  }
}

/* ---------------------------------------------------------------- bảng chuồng (mode 'pens') */
function heartsStr(n) { let s = ''; for (let i = 0; i < HEART_MAX; i++) s += i < n ? '♥' : '♡'; return s; }
function renderPanel(ctx) {
  const t = L(ctx), pen = PENS[openIdx]; if (!pen) return closePanel(ctx);
  const rec = pen.rec, bs = 'width:auto;margin:0;padding:8px 14px';
  const rows = rec.animals.length ? rec.animals.map((a, i) => `<div class="hrow"><span style="font-size:20px">${KINDS[a.kind].icon}</span>
      <span class="hwho" style="flex:1"><span data-nm="${i}">${esc(a.name)}</span> <button class="btn" data-rn="${i}" style="display:inline;width:auto;margin:0 0 0 6px;padding:2px 7px;font-size:12px" title="${esc(t.rename)}">✎</button></span>
      <span style="color:#ff6b8a;letter-spacing:1px" title="${esc(t.heart)}">${heartsStr(a.heart)}</span>
      <span class="chip" style="${a.fed ? 'background:#2f5a3a;color:#bff0c8' : ''}">${a.fed ? t.fed : t.hungry}</span></div>`).join('')
    : `<p class="dim">${esc(t.empty)}</p>`;
  const prods = rec.products.length ? rec.products.map(p => `${ctx.itemIcon(p.id)} ${esc(ctx.itemName(p.id))}${p.q === 2 ? ` <span class="chip" style="background:#5a4a1a;color:#ffd45e">★ ${esc(t.gold)}</span>` : ''}`).join(' · ') : `<span class="dim">${esc(t.none)}</span>`;
  const html = `<h2>${rec.tier === 2 ? '🏛' : '🏚'} ${esc(t.tier[rec.tier])}<span class="chip">${slotsUsed(rec)}/${capOf(rec)}</span></h2>
    <p class="dim" style="font-size:12px">${esc(t.hint)}</p>
    <div class="scroll">${rows}<h3>${esc(t.products)}</h3><div style="font-size:14px;padding:4px">${prods}</div></div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:6px">
      <button class="btn${rec.products.length ? ' primary' : ''}" id="pn-take" style="${bs}"${rec.products.length ? '' : ' disabled'}>${esc(t.collect)}</button>
      <button class="btn" id="pn-close" style="${bs}">${esc(t.close)}</button></div>`;
  panelEl = ctx.panel('pens', html); panelEl.hidden = false;
  const el = panelEl.panel;
  el.querySelector('#pn-take').onclick = () => { collect(ctx, pen); renderPanel(ctx); };
  el.querySelector('#pn-close').onclick = () => closePanel(ctx);
  for (const b of el.querySelectorAll('[data-rn]')) b.onclick = () => {
    const i = +b.dataset.rn, a = rec.animals[i]; if (!a) return;
    const span = el.querySelector(`[data-nm="${i}"]`); if (!span) return;
    const inp = document.createElement('input'); inp.maxLength = 12; inp.value = a.name; inp.style.cssText = 'width:110px;font:inherit;padding:2px 6px';
    span.replaceWith(inp); b.remove();
    const done = () => { a.name = String(inp.value || '').trim().slice(0, 12) || a.name; ctx.persist(); renderPanel(ctx); };
    inp.addEventListener('keydown', ev => { if (ev.key === 'Enter') { ev.preventDefault(); done(); } });
    inp.addEventListener('blur', done);
    setTimeout(() => { try { inp.focus(); inp.select(); } catch (e) { } }, 30);
  };
}
function openPanel(ctx, i) {
  openIdx = i; ctx.setMode('pens');
  if (!closerSet) { ctx.registerCloser('pens', () => closePanel(ctx)); closerSet = true; }
  if (!actionSet) { ctx.onAction('pens', () => { const pen = PENS[openIdx]; if (pen && pen.rec.products.length) { collect(ctx, pen); renderPanel(ctx); } else closePanel(ctx); }); actionSet = true; }
  renderPanel(ctx);
}
function closePanel(ctx) {
  openIdx = -1; if (panelEl) panelEl.hidden = true;
  if (ctx.S.mode === 'pens') ctx.setMode('play');
}

/* ---------------------------------------------------------------- hạt hiệu ứng (ngắn, chỉ khi có sự kiện) */
function puff(x, y, n = 8, c = '#fdf6e8') { for (let i = 0; i < n; i++) { const a = Math.random() * TAU, s = 6 + Math.random() * 16; fx.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 6, t: 0, life: 0.5 + Math.random() * 0.3, c, r: 1 + Math.random() * 1.5 }); } }
function bits(x, y, n, c) { for (let i = 0; i < n; i++) fx.push({ x: x + (Math.random() - 0.5) * 10, y, vx: (Math.random() - 0.5) * 20, vy: -20 - Math.random() * 20, t: 0, life: 0.6, c, r: 1, g: 60 }); }
function hearts(x, y, n) { for (let i = 0; i < n; i++) fx.push({ x: x + (Math.random() - 0.5) * 12, y: y - Math.random() * 4, vx: (Math.random() - 0.5) * 6, vy: -14 - Math.random() * 8, t: 0, life: 0.9 + Math.random() * 0.4, c: '#ff6b8a', heart: true }); }
function updateFx(dt) { for (let i = fx.length - 1; i >= 0; i--) { const f = fx[i]; f.t += dt; if (f.t >= f.life) { fx.splice(i, 1); continue; } f.x += f.vx * dt; f.y += f.vy * dt; if (f.g) f.vy += f.g * dt; } }
function drawFx(g, cx, cy) {
  for (const f of fx) {
    const a = 1 - f.t / f.life, x = Math.round(f.x - cx), y = Math.round(f.y - cy);
    g.globalAlpha = Math.max(0, Math.min(1, a * 1.3)); g.fillStyle = f.c;
    if (f.heart) { g.fillRect(x - 2, y - 1, 2, 2); g.fillRect(x + 1, y - 1, 2, 2); g.fillRect(x - 2, y, 5, 1); g.fillRect(x - 1, y + 1, 3, 1); g.fillRect(x, y + 2, 1, 1); }
    else g.fillRect(x, y, Math.ceil(f.r || 1), Math.ceil(f.r || 1));
  }
  g.globalAlpha = 1;
}

/* ---------------------------------------------------------------- thú đi lại trong rào */
function faceOfAng(ang) { const vx = Math.cos(ang), vy = Math.sin(ang); return Math.abs(vx) >= Math.abs(vy) ? (vx >= 0 ? 'e' : 'w') : (vy >= 0 ? 's' : 'n'); }
function updateEnt(dt, pen, e) {
  const k = MOVE[e.kind] || MOVE.chicken, rc = rect(pen.rec);
  e.t -= dt;
  if (e.st === 'walk') {
    let nx = e.x + Math.cos(e.ang) * k.sp * dt, ny = e.y + Math.sin(e.ang) * k.sp * dt;
    if (nx < rc.x0 || nx > rc.x1) { e.ang = Math.PI - e.ang; nx = Math.max(rc.x0, Math.min(rc.x1, nx)); }
    if (ny < rc.y0 || ny > rc.y1) { e.ang = -e.ang; ny = Math.max(rc.y0, Math.min(rc.y1, ny)); }
    e.x = nx; e.y = ny;
    if (e.t <= 0) { e.st = 'idle'; e.t = 1 + Math.random() * 3; }
    e.dir = Math.cos(e.ang) >= 0 ? 1 : -1; e.face = faceOfAng(e.ang);
  } else if (e.t <= 0) { e.st = 'walk'; e.t = 0.6 + Math.random() * 1.6; e.ang = Math.random() * TAU; }
  e.ft += dt * (e.st === 'idle' ? 0.8 : k.anim);
  e.fr = (e.ft | 0) % 2;
}
function spriteOf(e) {
  const reg = HOOK.creatures[e.kind]; const set0 = reg && reg.arr; if (!set0 || !set0.length) return null;
  const set = (e.st === 'idle' && set0.idle) ? set0.idle : set0;
  return dirFrame(set0, e.face, e.ft, e.st !== 'idle') || set[e.fr % set.length][e.dir < 0 ? 1 : 0];
}

/* ---------------------------------------------------------------- near: chọn ứng viên gần nhất của mình */
function candidates(ctx) {
  const t = L(ctx), p = ctx.S.player, out = [];
  const add = (label, x, y, limit, data) => { const d = Math.hypot(x - p.x, y - p.y); if (d < limit) out.push({ label, x, y, limit, data, d }); };
  /* dựng chuồng: cầm pen1/pen2, gốc chuồng = (ô người chơi −1, −2) → người chơi đứng ở ô cổng */
  const item = ctx.bag.has('pen2') ? 'pen2' : ctx.bag.has('pen1') ? 'pen1' : null;
  if (item && ctx.S.map.plots && ctx.S.map.plots.length) {
    const ptx = Math.floor(p.x / TILE), pty = Math.floor(p.y / TILE), y0 = pty - 2;
    let x0 = ptx - 1, g = 1, w = PW, chk = spotCheck(ctx, x0, y0, 1, PW);
    if (!chk.ok) { const c2 = spotCheck(ctx, ptx - 2, y0, 2, PW); if (c2.ok) { x0 = ptx - 2; g = 2; chk = c2; } }
    if (!chk.ok) { const c3 = spotCheck(ctx, ptx, y0, 0, 3); if (c3.ok) { x0 = ptx; g = 0; w = 3; chk = c3; } }
    if (chk.ok) add(t.build(item === 'pen2' ? 2 : 1) + (w === 3 ? t.small : ''), p.x, p.y, 20, { act: 'build', item, x0, y0, g, w });
    else { const here = ctx.plotOf(ptx, pty), my = ctx.myPlot(); if (here && my) { add(here.idx === my.idx ? t.buildBad : t.notMine, p.x, p.y, 20, { act: 'why', why: here.idx === my.idx ? chk.why : 'notMine' }); out[out.length - 1].d = 40; } }   /* 'vì sao không dựng được' xếp sau ruộng (24)/NPC/vật thể: cầm chuồng vẫn tưới/thu hoạch được */
  }
  const carry = carryPenable(ctx);
  for (const pen of PENS) {
    const rec = pen.rec, g = cen(gateT(rec)), tr = cen(troughT(rec)), sg = cen(signT(rec));
    if (carry) add(slotsUsed(rec) + SLOT[KINDS[carry.kind].cat] > capOf(rec) ? t.full : t.release(t.kind[carry.kind]), g.x, g.y, 24, { act: 'release', pen });
    add(t.feed(rec.animals.filter(a => a.fed).length, rec.animals.length), tr.x, tr.y, 24, { act: 'feed', pen });
    add(rec.products.length ? t.boardN(rec.products.length) : t.board, sg.x, sg.y, 26, { act: 'board', pen });
    /* vuốt ve: đứng trong dấu chân chuồng (cổng/lòng chuồng) → ưu tiên thú hơn máng/bảng (d − 12) */
    const ptx = Math.floor(p.x / TILE), pty = Math.floor(p.y / TILE), inPen = ptx >= rec.x && ptx < rec.x + wOf(rec) && pty >= rec.y && pty < rec.y + PH;
    for (const e of pen.ents) if (!e.a.pet) { const d = Math.hypot(e.x - p.x, e.y - 4 - p.y); if (d < 20) out.push({ label: t.pet(e.a.name), x: e.x, y: e.y - 4, limit: 20, data: { act: 'pet', pen, e }, d: inPen ? d - 12 : d }); }
  }
  out.sort((a, b) => ((a.data.act === 'why') - (b.data.act === 'why')) || a.d - b.d);   /* nhãn 'vì sao không dựng được' xếp cuối: cầm chuồng thừa đứng ở cổng vẫn thả/cho ăn được */
  return out;
}

/* ---------------------------------------------------------------- system */
export const pens = {
  id: 'pens',

  onZoneEnter(ctx) {
    PENS = []; fx = []; openIdx = -1;
    if (ctx.S.mode === 'pens') ctx.setMode('play');
    if (!defined) defineObjects(ctx);
    if (ctx.clock && ctx.clock.onDayEnd && !dayHooked) { ctx.clock.onDayEnd(dayEnd); dayHooked = true; }
    const map = ctx.S.map;
    if (map && map.plots && map.plots.length) {
      const list = zoneList(ctx);
      list.forEach((raw, i) => { const rec = normPen(raw); if (rec.x >= 0 && rec.y >= 0 && rec.x + wOf(rec) <= map.w && rec.y + PH <= map.h) placePen(ctx, rec, i); });
    }
    if (typeof window !== 'undefined') window.__pens = {
      state: () => PENS.map(p => ({ x: p.rec.x, y: p.rec.y, w: wOf(p.rec), g: gCol(p.rec), tier: p.rec.tier, cap: capOf(p.rec), used: slotsUsed(p.rec), animals: p.rec.animals.map(a => ({ ...a })), products: p.rec.products.map(q => ({ ...q })), ents: p.ents.map(e => ({ kind: e.kind, x: Math.round(e.x), y: Math.round(e.y), st: e.st })) })),
      save: () => JSON.parse(JSON.stringify(sv(ctx))),
      spot: () => {   /* ô gốc dựng được đầu tiên trong plot của mình (quét) → { x0, y0, gate } */
        const my = ctx.myPlot(); if (!my) return null;
        for (const [g, w] of [[1, 4], [2, 4], [0, 3]]) for (let y = my.y + 1; y < my.y + my.h - PH; y++) for (let x = my.x + 1; x < my.x + my.w - w; x++) if (spotCheck(ctx, x, y, g, w).ok) return { x0: x, y0: y, g, w, gate: gateT({ x, y, g, w }) };
        return null;
      },
      warp: (tx, ty) => { ctx.S.player.x = tx * TILE + 8; ctx.S.player.y = ty * TILE + 12; return true; },
      near: () => { const c = candidates(ctx)[0]; return c ? { label: c.label, act: c.data.act, d: Math.round(c.d) } : null; },
      tryE: () => { const c = pens_sys.near(ctx); if (!c) return null; pens_sys.interact(ctx, c); return c.label; },
      dayEnd: () => { dayEnd(ctx); ctx.persist(); return true; },
      rect: i => PENS[i] ? rect(PENS[i].rec) : null,
      inside: () => PENS.map(p => { const rc = rect(p.rec); return p.ents.every(e => e.x >= rc.x0 - 0.01 && e.x <= rc.x1 + 0.01 && e.y >= rc.y0 - 0.01 && e.y <= rc.y1 + 0.01); }),
      open: i => openPanel(ctx, i), close: () => closePanel(ctx)
    };
  },

  onZoneLeave(ctx) {
    if (ctx.S.mode === 'pens') closePanel(ctx);
    PENS = []; fx = [];
  },

  update(dt, ctx) {
    for (const pen of PENS) for (const e of pen.ents) updateEnt(dt, pen, e);
    updateFx(dt);
  },

  near(ctx) {
    if (ctx.S.mode !== 'play') return null;
    const c = candidates(ctx)[0]; if (!c) return null;
    if (c.data.act === 'why') { const p = ctx.S.player; return { label: c.label, x: p.x + 40, y: p.y, limit: 41, data: c.data }; }   /* main.js đo khoảng cách từ x,y → đẩy 'vì sao' ra xa 40 để thua ruộng (24)/NPC/vật thể */
    return { label: c.label, x: c.x, y: c.y, limit: c.limit, data: c.data };
  },

  interact(ctx, cand) {
    const d = cand && cand.data; if (!d) return;
    const t = L(ctx);
    switch (d.act) {
      case 'build': build(ctx, d.item, d.x0, d.y0, d.g, d.w); break;
      case 'why': ctx.toast(t.bad[d.why] || t.notMine); ctx.sfx('fail'); break;
      case 'release': release(ctx, d.pen); break;
      case 'feed': feed(ctx, d.pen); break;
      case 'pet': pet(ctx, d.e); break;
      case 'board': openPanel(ctx, PENS.indexOf(d.pen)); break;
    }
  },

  drawables(ctx, cx, cy) {
    const out = [], g = ctx.g, VW = ctx.VW, VH = ctx.VH;
    for (const pen of PENS) {
      const rec = pen.rec;
      if (rec.x * TILE > cx + VW + 16 || (rec.x + wOf(rec)) * TILE < cx - 16 || rec.y * TILE > cy + VH + 16 || (rec.y + PH) * TILE < cy - 32) continue;
      if (rec.animals.some(a => a.fed)) {   /* rơm trong máng: vẽ ngay sau máng (cùng đáy +1) */
        const tr = troughT(rec), hx = tr.x * TILE + 2 - cx, hy = (tr.y + 1) * TILE - 7 - cy;
        out.push({ y: (tr.y + 1) * TILE + 0.5, f: () => g.drawImage(IMG.pen_hay, hx, hy) });
      }
      for (const e of pen.ents) {
        const img = spriteOf(e), ex = Math.round(e.x), ey = Math.round(e.y);
        if (img) { const dx = ex - (img.width >> 1) - cx, dy = ey - img.height - cy; out.push({ y: e.y, f: () => g.drawImage(img, dx, dy) }); }
        else out.push({ y: e.y, f: () => { g.fillStyle = '#c9a86b'; g.fillRect(ex - 5 - cx, ey - 8 - cy, 10, 8); } });
      }
    }
    return out;
  },

  draw(g, ctx, cx, cy) { if (fx.length) drawFx(g, cx, cy); }
};
const pens_sys = pens;
