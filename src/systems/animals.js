// animals.js — wild animals: land animals are caught instantly and ride on your head,
// fish need a rod, live in a per-zone density field and fight back on the line. See systems/API.md.
import { mkCanvas, HOOK } from '../gfx.js';
import { STONE_FILTER } from './petgun.js';
import { ART } from '../art.js';
import { FPS, loopFrame, phase, waterDraw } from '../anim.js';
import { keyHint, isTouchUI } from '../hud.js';
import { thirst, drawThirsty } from './thirst.js';   /* 2026-10-11 anh: thú thấy nước chỉ uống, không xuống */   /* polish 2026-10-10: cảm ứng → Ⓐ / ☰ thay E / Esc */

// ---------------------------------------------------------------- strings
const STR = {
  en: {
    cow: 'Catch cow', chicken: 'Catch chicken', bird: 'Catch bird',
    gotCow: 'Caught a cow! 🐄', gotChicken: 'Caught a chicken! 🐔', gotBird: 'Caught a bird! 🐦',
    gotFish: 'Caught a fish! 🐟', gotBigFish: 'A big one! 🐟 +5 🪨 at the trader',
    full: 'Hands full — sell at the trader',
    needRod: 'Need a fishing rod — buy it at the village trader (🪨 stones)',
    cast: 'Cast the line',
    waiting: 'Waiting for a bite…', castHint: 'Esc · reel in',
    biteHint: 'E · hook it!', bite: '!',
    reelTitle: 'Reel it in!', reelBig: 'A big one — reel!', reelHint: 'E / Space / A · reel   ·   do not mash, the line snaps',
    tension: 'Line tension', gotAway: 'It got away', snapped: 'Line snapped!',
    ok: 'CAUGHT!', bad: 'MISSED'
  },
  vi: {
    cow: 'Bắt bò', chicken: 'Bắt gà', bird: 'Bắt chim',
    gotCow: 'Bắt được bò! 🐄', gotChicken: 'Bắt được gà! 🐔', gotBird: 'Bắt được chim! 🐦',
    gotFish: 'Câu được cá! 🐟', gotBigFish: 'Cá to! 🐟 bán được 5 🪨',
    full: 'Đầy tay rồi — đem bán ở Thương nhân',
    needRod: 'Cần cần câu — mua ở Thương nhân Làng (trả bằng 🪨 đá)',
    cast: 'Thả câu',
    waiting: 'Đợi cá cắn câu…', castHint: 'Esc · thu cần',
    biteHint: 'E · giật cần!', bite: '!',
    reelTitle: 'Thu cần!', reelBig: 'Cá to — thu mạnh!', reelHint: 'E / Space / A · thu   ·   đừng bấm loạn, đứt cước',
    tension: 'Độ căng cước', gotAway: 'Hụt rồi', snapped: 'Đứt cước!',
    ok: 'ĐƯỢC RỒI!', bad: 'HỤT'
  }
};
const L = ctx => STR[ctx.lang() === 'vi' ? 'vi' : 'en'];
const cap = s => s[0].toUpperCase() + s.slice(1);

// ---------------------------------------------------------------- sprites (built once, at module load)
const px = (g, x, y, c, w = 1, h = 1) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
const OUT = '#1c1a24';
const TAU = Math.PI * 2;

function cowArt(g, f) {
  const W = '#f5f1ea', B = '#2b2733', P = '#f2a0b8', S = '#d8d2c8', H = '#e8dcc0';
  const a = f ? 1 : 0, b = f ? 0 : 1;
  px(g, 3 + a, 9, OUT, 2, 5); px(g, 3 + a, 9, W, 2, 4); px(g, 3 + a, 12, B, 2, 2);
  px(g, 8 + b, 9, OUT, 2, 5); px(g, 8 + b, 9, W, 2, 4); px(g, 8 + b, 12, B, 2, 2);
  px(g, 0, 3, OUT, 1, 6); px(g, 0, 8, B, 1, 3);                       // tail
  px(g, 1, 2, OUT, 12, 9); px(g, 2, 3, W, 10, 7); px(g, 2, 9, S, 10, 1); // body
  px(g, 3, 3, B, 3, 3); px(g, 7, 5, B, 4, 3); px(g, 4, 8, B, 2, 2);   // patches
  px(g, 10, 3, OUT, 6, 8); px(g, 11, 4, W, 4, 6);                      // head
  px(g, 10, 4, B, 1, 2);                                               // ear
  px(g, 11, 2, H, 1, 1); px(g, 13, 2, H, 1, 1);                        // horns
  px(g, 13, 7, P, 3, 3); px(g, 14, 8, OUT, 1, 1);                      // muzzle + nostril
  px(g, 12, 5, OUT, 1, 1);                                             // eye
}
function chickenArt(g, f) {
  const W = '#fbf8f2', R = '#e04b4b', Y = '#ffc93a', S = '#ddd6c8';
  const a = f ? 1 : 0;
  px(g, 5 + a, 9, Y, 1, 2); px(g, 4 + a, 11, Y, 3, 1);
  px(g, 8 - a, 9, Y, 1, 2); px(g, 7 - a, 11, Y, 3, 1);
  px(g, 0, 1, OUT, 5, 5); px(g, 1, 2, W, 4, 3); px(g, 1, 2, S, 2, 1);   // tail
  px(g, 2, 2, OUT, 10, 8); px(g, 3, 3, W, 8, 6); px(g, 3, 8, S, 8, 1);  // body
  px(g, 5, 5, S, 4, 2); px(g, 5, 5, OUT, 4, 1);                          // wing
  px(g, 9, 1, OUT, 6, 6); px(g, 10, 2, W, 4, 4);                         // head
  px(g, 10, 0, R, 3, 1); px(g, 11, 0, OUT, 1, 1);                        // comb
  px(g, 14, 3, Y, 2, 2);                                                 // beak
  px(g, 13, 5, R, 1, 2);                                                 // wattle
  px(g, 12, 3, OUT, 1, 1);                                               // eye
}
function birdArt(g, f) {
  const B = '#3d7fd6', BL = '#8cc4f7', G = '#ff9426';
  px(g, 0, 4, OUT, 6, 5); px(g, 1, 5, B, 5, 3); g.clearRect(0, 6, 2, 1); // forked tail
  px(g, 4, 3, OUT, 9, 8); px(g, 5, 4, B, 7, 6); px(g, 5, 7, G, 6, 2);    // body
  px(g, 9, 1, OUT, 6, 6); px(g, 10, 2, B, 4, 4);                         // head
  px(g, 13, 4, G, 3, 2);                                                 // beak
  px(g, 11, 3, '#ffffff', 2, 1); px(g, 12, 3, OUT, 1, 1);                // eye
  if (!f) { px(g, 5, 0, OUT, 7, 5); px(g, 6, 1, BL, 5, 3); }             // wing up
  else { px(g, 5, 6, OUT, 7, 6); px(g, 6, 7, BL, 5, 4); }                // wing down
}
function fishArt(g, f) {   // underwater silhouette (a shadow under the surface)
  const D = 'rgba(10,38,68,.58)', M = 'rgba(32,86,140,.5)', H = 'rgba(190,228,255,.45)';
  const t = f ? 0 : 1;
  px(g, 0, 2 + t, D, 3, 2); px(g, 0, 5 + t, D, 3, 2); px(g, 2, 4, D, 3, 2);  // tail
  px(g, 4, 3, D, 9, 4); px(g, 5, 2, D, 6, 1); px(g, 5, 7, D, 6, 1);          // body
  px(g, 12, 4, D, 2, 2);
  px(g, 6, 3, H, 4, 1); px(g, 7, 6, M, 3, 1);                                 // sheen
  px(g, 3 + (f ? 1 : 0), 1, H, 2, 1);                                         // ripple
}
// a landed fish — solid colours and a real silhouette, so it reads on top of the player's head
function heldFishArt(big) {
  const W2 = big ? 18 : 14, H2 = big ? 11 : 9, bx0 = big ? 6 : 5;
  return (g, f) => {
    const B = big ? '#4a8fd0' : '#6fb2e0', BL = big ? '#8fc8ef' : '#a8d8f5', D = big ? '#2c5f95' : '#3d7fd6', O2 = '#123049';
    const cx = (bx0 + W2 - 1) / 2, cy = (H2 - 1) / 2;
    const rx = (W2 - bx0) / 2 + 0.4, ry = H2 / 2 - (big ? 1.4 : 1.1);
    for (let y = 0; y < H2; y++) for (let x = bx0; x < W2; x++) {   // body: a shaded ellipse
      const k = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2;
      if (k > 1) continue;
      px(g, x, y, k > 0.68 ? O2 : y < cy ? B : BL);
    }
    const tc = cy + (f ? 0.6 : -0.6);                              // the tail flicks between frames
    for (let x = 0; x < bx0; x++) {                                 // fan tail
      const hh = 0.5 + (bx0 - x) * 0.85;
      for (let y = 0; y < H2; y++) { const d = Math.abs(y - tc); if (d <= hh) px(g, x, y, d > hh - 1 || x === 0 ? O2 : D); }
    }
    px(g, ((cx - 1) | 0), 0, O2, 3, 1); px(g, ((cx - 1) | 0), 1, D, 3, 1);            // dorsal fin
    px(g, ((cx - 1) | 0), H2 - 1, D, 3, 1);                                            // belly fin
    px(g, W2 - 4, ((cy - 1) | 0), '#ffffff', 2, 2); px(g, W2 - 3, ((cy - 1) | 0), O2, 1, 1);  // eye
    px(g, W2 - 1, (cy | 0) + (f ? 1 : 0), O2, 1, 1);                                   // mouth
  };
}
function flip(src) { const c = mkCanvas(src.width, src.height), g = c.getContext('2d'); g.translate(src.width, 0); g.scale(-1, 1); g.drawImage(src, 0, 0); return c; }
function build(w, h, fn) {
  return [0, 1].map(f => { const c = mkCanvas(w, h); fn(c.getContext('2d'), f); return [c, flip(c)]; }); // [frame][0=right,1=left]
}
const SPR = { cow: HOOK.creature('cow', build(16, 14, cowArt)), chicken: HOOK.creature('chicken', build(16, 12, chickenArt)), bird: HOOK.creature('bird', build(16, 12, birdArt)), fish: HOOK.creature('fish', build(16, 10, fishArt)) }; // art.js thay ảnh PixelLab tại chỗ khi có
const HELD = { fish: build(14, 9, heldFishArt(false)), fishBig: build(18, 11, heldFishArt(true)) };
/* ---------------------------------------------------------------- plan-9: vẽ đồ mang theo (tay / xô / lồng / xe) — trung tâm cho mọi module
   HEAD_SPR: kind → [khung][lật]; ecology/sea_dive đăng ký sprite của mình bằng registerHead. Đồ đựng: canvas vẽ code, art.js thay ảnh PixelLab
   qua HOOK.image('carry_<tool><tier>[_s|e|n]'). Ô: tay = đội đầu như cũ (lồng bỏ 2026-10-11);
   xe = kéo sau lưng ngược hướng đi, bò/cừu ngồi trên thùng (thu 75 %). Xô đựng cá đã bỏ 2026-10-11 (cá vào túi). */
/* ---- plan-11: thú đi 4 hướng. set.dir = { s, e, n } do art.js gắn (mỗi hàng 4 khung [khung][lật]); face 's'|'e'|'n'|'w' từ hướng đi ---- */
export function faceOfV(vx, vy) { return Math.abs(vx) >= Math.abs(vy) ? (vx >= 0 ? 'e' : 'w') : (vy >= 0 ? 's' : 'n'); }
export function faceOf(a) { return faceOfV(Math.cos(a.ang), Math.sin(a.ang)); }
export function dirFrame(set0, face, ft, moving, who) {   /* who: đối tượng thú → lệch pha riêng (plan-19: 8 FPS chung, ft cũ không còn quyết định tốc độ khung) */
  const d = set0 && set0.dir; if (!d) return null;
  const f = face || 'e';
  if ((f === 'e' || f === 'w') && !moving && set0.idle) return null;   /* đứng nghiêng: giữ clip idle nhìn ngang sẵn có */
  const row = f === 's' ? d.s : f === 'n' ? d.n : d.e; if (!row || !row.length) return null;
  const i = moving ? loopFrame(row.length, FPS.creature, who ? phase(who) : ft) : 0;
  return row[i][f === 'w' ? 1 : 0];
}
export const HEAD_SPR = {};
export function registerHead(kind, set) { if (set) HEAD_SPR[kind] = set; return set; }
if (typeof window !== 'undefined') window.__carrySpr = HEAD_SPR;   /* móc test */
registerHead('cow', SPR.cow); registerHead('chicken', SPR.chicken); registerHead('bird', SPR.bird); registerHead('fish', HELD.fish); registerHead('fishBig', HELD.fishBig);
const sprOf = it => (it.kind === 'fish' && it.sp && speciesSet(it.sp, it.big)) || (it.kind === 'fish' && it.big ? HEAD_SPR.fishBig : HEAD_SPR[it.kind]) || null;
/* ảnh loài cá (ui/fish/<loài>.png, 32×32 = 16 logic) → bộ 2 khung [thường, hơi co] × [phải, trái]; cá to ×1,3.
   Ghép trên canvas KHÔNG có __hi (bài học shim 2026-09-25), chỉ đánh dấu __hi cho canvas kết quả. */
const SP_SET = {};
function speciesSet(sp, big) {
  const key = sp + (big ? '+' : ''); if (SP_SET[key] !== undefined) return SP_SET[key];
  const ui = fishUi(), f = ui && ui.species && ui.species[sp]; if (!f) return (SP_SET[key] = null);
  const im = fimg('head_' + sp, f); if (!im.complete || !im.naturalWidth) return null;   /* chưa tải xong → khung sau thử lại */
  const W = im.naturalWidth, H = im.naturalHeight, src = mkCanvas(W, H), sg = src.getContext('2d'); sg.drawImage(im, 0, 0);
  const d = sg.getImageData(0, 0, W, H).data; let x0 = W, y0 = H, x1 = 0, y1 = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (d[(y * W + x) * 4 + 3] > 0) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  if (x1 < x0) return (SP_SET[key] = null);
  const k = big ? 1.3 : 1, hi = ART.hi || 2, cw = Math.round((x1 - x0 + 1) * k / hi) * hi, ch = Math.round((y1 - y0 + 1) * k / hi) * hi;
  const make = (squash, flip) => {
    const c = mkCanvas(cw, ch), g = c.getContext('2d'); g.imageSmoothingEnabled = false;
    const sh = Math.round(ch * (squash ? 0.9 : 1)); if (flip) { g.translate(cw, 0); g.scale(-1, 1); }
    g.drawImage(src, x0, y0, x1 - x0 + 1, y1 - y0 + 1, 0, ch - sh, cw, sh);
    c.__w = cw; c.__h = ch; c.__hi = hi; Object.defineProperty(c, 'width', { value: cw / hi }); Object.defineProperty(c, 'height', { value: ch / hi }); return c;
  };
  return (SP_SET[key] = [[make(false, false), make(false, true)], [make(true, false), make(true, true)]]);
}
/* 2026-10-11 anh bỏ XÔ + LỒNG + XE CHỞ: không còn đồ đựng thú — mọi con bắt được bế trên đầu (1 con), phím T cất vào túi */
/* 2026-10-11 anh bỏ XÔ: cá câu được vào thẳng TÚI (đã cộng ngay lúc câu → tắt game giữa chừng không mất cá). SHOW = { it, id, until, pending }:
   con vừa câu giơ trên đầu lúc thẻ cá hiện + 2,6 s sau khi đóng thẻ (anh: 'câu được cá thì cầm cá lên luôn'), rồi bay vào ô/túi. */
let SHOW = null;
const showOn = ctx => !!SHOW && (SHOW.pending || ctx.S.time < SHOW.until);
function carrySlots(ctx) {   /* → [{ it, where: 'hand', i }] theo thứ tự bắt (không còn xe/lồng/xô: tất cả trên tay; save cũ vượt mức chồng lên đầu) */
  const out = []; let hand = 0;
  for (const raw of sysS(ctx).carry) out.push({ it: normItem(raw), where: 'hand', i: hand++ });
  if (showOn(ctx)) out.push({ it: SHOW.it, where: 'hand', i: hand++ });   /* cá đang khoe: trên cùng chồng tay */
  return out;
}
export function drawCarry(ctx, g, cx, cy, out) {
  const p = ctx.S.player; if (p.custom && !ctx.S.sea) return;   /* thuyền/jeep/Rocky vẽ người chơi riêng; trên biển (bè/ván) vẫn vẽ */
  const slots = carrySlots(ctx); if (!slots.length) return;
  const t = ctx.S.time, flipI = p.dir === 1 ? 1 : 0, px = Math.round(p.x) - cx, py = Math.round(p.y) - cy;
  const frame = (set, i) => set[(((t * 3 + i * 0.7) | 0) % 2 + 2) % 2][flipI];
  const glow = (it, x, y, w, h) => { if (it.kind !== 'goldfish') return; g.globalAlpha = 0.35 + 0.25 * Math.sin(t * 5); g.fillStyle = '#ffd45e'; g.beginPath(); g.ellipse(x, y, w * 0.75, h * 0.8, 0, 0, TAU); g.fill(); g.globalAlpha = 1; };
  const hd = slots;
  /* 2026-09-28 anh chê 'cồng kềnh' → gọn kiểu Stardew: trên đầu CHỈ con bế tay (xô/lồng/xe chở đã bỏ 2026-10-11) */
  if (hd.length) out.push({ y: p.y + 0.5, f: () => {
    const lift = (p.action && p.action.name === 'carry') ? -4 : 0;   /* clip bế: tay giơ ngang tai → hạ 4 px cho chạm tay */
    const top = py - 18 - lift - (ctx.S.sea && ctx.S.sea.riding ? 8 : 0);   /* trên bè/ván người vẽ cao hơn 8 px */
    hd.forEach((s, i) => { const set = sprOf(s.it); if (!set) return; const im = frame(set, i), bob = Math.sin(t * 3.2 + i * 0.9) * 1.2, wig = Math.sin(t * 9 + i * 1.3) * 0.12;
      const yy = Math.round(top - i * 8 + bob); glow(s.it, px, yy - (im.height >> 1), im.width, im.height);
      g.save(); g.translate(px, yy); g.rotate(wig); g.drawImage(im, -(im.width >> 1), -im.height); g.restore(); });
  } });
}


// ---------------------------------------------------------------- kinds / themes
const KIND = {
  cow: { sp: 11, flee: 26, anim: 3.0, idleAnim: 0.8 },
  chicken: { sp: 26, flee: 62, anim: 8.0, idleAnim: 1.2 },
  bird: { sp: 34, flee: 0, anim: 9.0, idleAnim: 1.6 },
  fish: { sp: 9, flee: 0, anim: 4.0, idleAnim: 4.0 }
};
// per-zone themes: [min,max] head count per kind; `fish: true` = build a density field wherever there is water
const THEME = {
  village: { cow: [4, 6], chicken: [5, 8] },
  m1: { cow: [4, 6], chicken: [5, 8], fish: true },
  m2: { cow: [4, 6], chicken: [5, 8] },
  m3: { cow: [4, 6], chicken: [5, 8], bird: [6, 8] },
  m4: { bird: [2, 3] }, m5: { bird: [2, 3] }, m6: { bird: [2, 3] }, m7: { bird: [2, 3] },
  m8: { bird: [6, 8] }, m9: { bird: [2, 3] }
};

// ---------------------------------------------------------------- state
let list = [];          // live animals in this zone
let fx = [];            // particles (poof, feathers, splashes, jumping fish)
let fishing = null;     // fishing state machine, null when not fishing
let dens = null;        // Float32Array density per tile (0 outside water)
let spots = [];         // hot spots [{tx,ty,r}]
let waterTiles = [];    // indices of every water tile in this zone
let splashT = 0;        // countdown to the next hot-spot splash

const TILE = 16;
const BASE = 0.15;      // density far from any hot spot
const tileOf = v => Math.floor(v / TILE);
const DIRV = [[0, 1], [-1, 0], [1, 0], [0, -1]];   // player dir: 0 down, 1 left, 2 right, 3 up
function inPlot(map, tx, ty, m = 0) { return map.plots.some(p => tx >= p.x - m && tx < p.x + p.w + m && ty >= p.y - m && ty < p.y + p.h + m); }
function onRoad(map, tx, ty) { return tx >= 0 && ty >= 0 && tx < map.w && ty < map.h && map.roads[ty * map.w + tx] === 1; }
function walkable(ctx, x, y) {
  const map = ctx.S.map, tx = tileOf(x), ty = tileOf(y);
  if (tx < 1 || ty < 1 || tx > map.w - 2 || ty > map.h - 2) return false;
  if (ctx.isSolid(map, tx, ty)) return false;
  { const g0 = ctx.getG(map, tx, ty); if (g0 === ctx.T.WATER || g0 === ctx.T.DEEP) return false; }   /* thú cạn không bao giờ bước xuống nước (kể cả ô nước không đặt cờ chắn) */
  return !inPlot(map, tx, ty);
}
const isWater = (ctx, x, y) => ctx.getG(ctx.S.map, tileOf(x), tileOf(y)) === ctx.T.WATER;
const isWaterT = (ctx, tx, ty) => ctx.getG(ctx.S.map, tx, ty) === ctx.T.WATER;
const hasRod = ctx => ctx.tool.tier('rod') > 0;   /* plan-20: thống nhất theo tier */
const holdRod = ctx => (ctx.holding ? ctx.holding('rod') : true);

// ---------------------------------------------------------------- carry stack (on the player's head)
const MAX_CARRY = 3;   /* chỉ còn là mốc cũ cho save cũ; luật thật ở CAT/CONT bên dưới (plan-9) */
function sysS(ctx) {
  const sv = ctx.S.save; sv.sys = sv.sys || {};
  const s = (sv.sys.animals = sv.sys.animals || {});
  if (!Array.isArray(s.carry)) s.carry = [];
  return s;
}
/* ---- plan-9: tay không mang 1 con; mang thêm phải có đồ đựng đúng loại, nâng cấp để chứa nhiều hơn ----
   Loại: fish · small (bế tay, 1 thứ — 2026-10-11 bỏ xô + lồng; cá câu vào túi, phím T cất thú vào túi) · large (bò/cừu, bế tay như gà — bỏ xe chở 2026-10-11) · loot (đồ lặn, không có đồ đựng, 2 + tay).
   Ô tay = 1 thứ bất kỳ không nằm vừa đồ đựng. Save cũ vượt mức: giữ nguyên, chỉ chặn bắt thêm. */
export const CAT = { fish: 'fish', goldfish: 'fish', squid: 'fish', sala: 'fish',
  chicken: 'small', bird: 'small', rabbit: 'small', crab: 'small', bat: 'small', moth: 'small',
  cow: 'large', sheep: 'large' };
export const CONT = { fish: { tool: null, cap: [0] }, small: { tool: null, cap: [0] },   /* 2026-10-11 anh bỏ LỒNG: gà/chim/thỏ/cua/dơi… bế trên đầu như bò */ large: { tool: null, cap: [0] }   /* 2026-10-11 anh bỏ XE CHỞ: bò/cừu cũng bế trên đầu */, loot: { tool: null, cap: [2] } };
export const catOf = kind => CAT[kind] || 'loot';
export function capOf(ctx, cat) { const c = CONT[cat]; if (!c.tool) return c.cap[0]; return c.cap[Math.min(c.cap.length - 1, ctx.tool.tier(c.tool))] || 0; }
/* { n: {cat: số}, over: số con phải cầm tay (ngoài đồ đựng) } */
export function carryInfo(ctx) {
  const n = {}; for (const it of sysS(ctx).carry) { const k = catOf(normItem(it).kind); n[k] = (n[k] || 0) + 1; }
  let over = 0; for (const [k, v] of Object.entries(n)) over += Math.max(0, v - capOf(ctx, k));
  return { n, over };
}
export function canCarry(ctx, kind) {
  const cat = catOf(kind), info = carryInfo(ctx), have = info.n[cat] || 0;
  if (have < capOf(ctx, cat)) return true;            /* còn chỗ trong đồ đựng */
  return info.over < 1;                                /* không thì phải còn tay trống */
}
/* Lý do không bắt thêm được (EN/VI), nêu rõ đồ cần / cần nâng cấp */
/* Đường nâng cấp từng món: [cấp] = { vi, en } (tên · nơi chế · nguyên liệu) — khớp RECIPES trong crafting.js */
const UPG = {};   /* 2026-10-11 bỏ xô, lồng, xe chở: không còn đồ đựng nào để nâng cấp */
const ANIMAL_VI = { fish: 'cá', small: 'thú nhỏ', large: 'bò/cừu', loot: 'đồ lặn' }, ANIMAL_EN = { fish: 'fish', small: 'small animals', large: 'cows/sheep', loot: 'dive finds' };
export function carryDeny(ctx, kind) {
  const vi = ctx.lang && ctx.lang() === 'vi', cat = catOf(kind), c = CONT[cat], tier = c.tool ? ctx.tool.tier(c.tool) : 0;
  const name = c.tool ? ctx.itemName(c.tool) : '', maxT = c.tool ? c.cap.length - 1 : 0, an = vi ? ANIMAL_VI[cat] : ANIMAL_EN[cat];
  if (!c.tool && !c.cap[0]) return vi ? 'Tay đang bận — chỉ cầm được 1 thứ trên tay. Bấm T cất vào túi hoặc bán ở Thương nhân Làng' : 'Hands busy — you can only hold 1 thing. Press T to stow it in the bag or sell it at the village trader';   /* cá: không còn xô (2026-10-11) */
  if (!c.tool) return vi ? `Tay đang bận — chỉ mang được 2 ${an} + 1 trên tay. Bán ở Thương nhân Làng rồi quay lại` : `Hands busy — only 2 ${an} + 1 in hand. Sell at the village trader and come back`;
  const next = UPG[c.tool][tier + 1], nx = next ? (vi ? next.vi : next.en) : '';
  if (tier < 1) return vi ? `Tay đang bận — muốn mang thêm ${an}, hãy chế ${nx}` : `Hands busy — to carry more ${an}, craft ${nx}`;
  if (tier < maxT) return vi ? `${name} đầy (${c.cap[tier]} ${an}) — nâng cấp: ${nx}` : `${name} is full (${c.cap[tier]} ${an}) — upgrade: ${nx}`;
  return vi ? `${name} đã đầy mức tối đa (${c.cap[tier]} ${an}) — bán ở Thương nhân Làng rồi quay lại` : `${name} is at max (${c.cap[tier]} ${an}) — sell at the village trader and come back`;
}
// carry entries may be plain kinds ('cow') or objects ({kind:'fish', big:true}) — normalise on read
const normItem = it => (typeof it === 'string' ? { kind: it, big: false } : { kind: (it && it.kind) || 'fish', big: !!(it && it.big), ...(it && it.sp ? { sp: it.sp, cm: it.cm } : {}) });   /* sp: loài cá câu được (anh yêu cầu: bưng đúng con đó) */
const CARRIABLE = ['cow', 'chicken', 'bird', 'fish'];
function syncInv(ctx) {                        // save.inv.<kind> is only a mirror of the stack, so the HUD line matches
  const inv = (ctx.S.save.inv = ctx.S.save.inv || {});
  for (const k of CARRIABLE) inv[k] = 0;
  for (const it of sysS(ctx).carry) { const k = normItem(it).kind; if (CARRIABLE.includes(k)) inv[k]++; }
}
export function getCarry(ctx) { return sysS(ctx).carry.map(normItem); }
export function removeCarry(ctx, i) {
  const c = sysS(ctx).carry; if (i < 0 || i >= c.length) return null;
  const it = normItem(c[i]); c.splice(i, 1); syncInv(ctx); ctx.persist(); return it;
}
export function clearCarry(ctx) { const out = getCarry(ctx); sysS(ctx).carry.length = 0; syncInv(ctx); ctx.persist(); return out; }
export const carryFull = (ctx, kind = 'fish') => !canCarry(ctx, kind);
export const CARRY_MAX = MAX_CARRY;
/* phím T: ném con trên cùng của chồng trên đầu vào ô trống của thanh công cụ (hiệu ứng bay ở hud.js) */
export function throwTop(ctx) {
  const c = sysS(ctx).carry; if (!c.length || ctx.S.mode !== 'play') return false;
  const raw = removeCarry(ctx, c.length - 1); if (!raw) return false;
  const it = normItem(raw);   /* cá vàng / mực lưu dạng chuỗi ('goldfish') → trước đây ra 'a_undefined', không ném được (QA 2026-10-10) */
  const id = bagIdOf(it); if (!ctx.ITEMS[id]) { addCarry(ctx, raw); return false; }
  const p = ctx.S.player; if (p.hasAct && p.hasAct('harvest')) p.act('harvest', 0.3);
  if (ctx.vfx) ctx.vfx('item_pickup_pop', p.x, p.y - 26, 0, true); ctx.sfx('magnet');
  const slot = ctx.hotbarFirstEmpty ? ctx.hotbarFirstEmpty(id) : -1;
  const done = () => { ctx.bag.add(id, 1); if (slot >= 0 && ctx.hotbarPut) ctx.hotbarPut(slot, id); ctx.sfx('slot'); ctx.toast(`+1 ${ctx.itemIcon(it.kind)} ${ctx.itemName(it.kind)}`); };
  if (ctx.flyToSlot) ctx.flyToSlot(it.kind, slot, done, it.sp && fishUi() && fishUi().species ? fishUi().species[it.sp] : null); else done();
  return true;
}
/* ---- 2026-10-11 anh bỏ XÔ: cá ở trong TÚI. Mã túi: 'a_fish' (cá thường) · 'a_fishbig' (cá to, giá cao) · 'a_goldfish' · 'a_squid'.
   Loài cá (cho ao nuôi) nhớ ở save.sys.animals.fishSp (hàng đợi, tối đa 40). Các hệ cần "một con cá" (cáo, khỉ, Yeti, Kraken, ao, nhiệm vụ, cho dân ăn)
   hỏi hasFish / takeFish: cá trên tay (save cũ, quái trả lại) trước, rồi tới túi. ---- */
export const FISH_BAG = ['a_fish', 'a_fishbig'];
export const bagIdOf = it => (it.kind === 'fish' ? (it.big ? 'a_fishbig' : 'a_fish') : 'a_' + it.kind);
const FISH_CAT = ['fish', 'goldfish', 'squid'];   /* loại vào túi được (kỳ nhông 'sala' không có mã túi → vẫn cầm tay) */
export function hasFish(ctx, big) {
  if (getCarry(ctx).some(it => it.kind === 'fish' && (!big || it.big))) return true;
  return (big ? ['a_fishbig'] : FISH_BAG).some(id => ctx.bag.has(id, 1));
}
export function takeFish(ctx, big) {   /* → { kind:'fish', big, sp } | null */
  const c = getCarry(ctx); for (let i = c.length - 1; i >= 0; i--) if (c[i].kind === 'fish' && (!big || c[i].big)) return removeCarry(ctx, i);
  for (const id of (big ? ['a_fishbig'] : FISH_BAG)) if (ctx.bag.has(id, 1)) { ctx.bag.remove(id, 1); const q = sysS(ctx).fishSp, sp = Array.isArray(q) && q.length ? q.shift() : null; ctx.persist(); return { kind: 'fish', big: id === 'a_fishbig', ...(sp ? { sp } : {}) }; }
  return null;
}
export function catchToBag(ctx, item) {   /* cá vừa câu (bờ + biển): cộng túi ngay, giơ khoe trên đầu, hết khoe thì bay vào ô */
  const it = normItem(item), id = bagIdOf(it); if (!ctx.ITEMS[id]) return false;
  if (addCarry(ctx, item)) return true;   /* 2026-10-11 anh: cá vừa câu nằm TRÊN TAY (giơ trên đầu) tới khi bấm T mới vào túi — như bắt gà; tay bận thì mới vào thẳng túi */
  ctx.bag.add(id, 1);
  if (it.kind === 'fish' && it.sp) { const s = sysS(ctx), q = (s.fishSp = Array.isArray(s.fishSp) ? s.fishSp : []); q.push(it.sp); if (q.length > 40) q.shift(); }
  SHOW = { it, id, until: Infinity, pending: true }; ctx.persist();
  return true;
}
function showLand(ctx) {   /* hết khoe → con cá bay vào ô hotbar đang chứa nó (hoặc nút Túi); chỉ là hiệu ứng, túi đã cộng lúc câu */
  const sh = SHOW; SHOW = null; if (!sh) return;
  const slot = ctx.hotbarSlotOf ? ctx.hotbarSlotOf(sh.id) : -1, file = sh.it.sp && fishUi() && fishUi().species ? fishUi().species[sh.it.sp] : null;
  const done = () => { ctx.sfx('slot'); };
  if (ctx.flyToSlot) ctx.flyToSlot(sh.it.kind, slot, done, file); else done();
}
/* save cũ: cá đang nằm trong xô / trên tay → vào túi (save.js dọn xô lúc nạp; đây là lưới an toàn khi vào vùng) */
function fishToBag(ctx) {
  const c = sysS(ctx).carry; let moved = 0;
  for (let i = c.length - 1; i >= 0; i--) { const it = normItem(c[i]); if (!FISH_CAT.includes(it.kind) || !ctx.ITEMS[bagIdOf(it)]) continue; c.splice(i, 1); ctx.bag.add(bagIdOf(it), 1); moved++; }
  if (moved) { syncInv(ctx); ctx.persist(); }
  return moved;
}
export function addCarry(ctx, item) {   /* plan-21: export — quái bị hạ trả lại thú đã cướp */
  const c = sysS(ctx).carry;
  if (!canCarry(ctx, normItem(item).kind)) return false;
  c.push(item); syncInv(ctx); ctx.persist();
  const sa = sysS(ctx); if (!sa.tHint) { sa.tHint = true; setTimeout(() => ctx.toast(ctx.lang() === 'vi' ? 'Mẹo: bấm T để ném con vật trên đầu vào ô trống của thanh công cụ' : 'Tip: press T to toss the animal on your head into an empty hotbar slot'), 900); }   /* nhắc phím T 1 lần */
  return true;
}

// ---------------------------------------------------------------- particles
function puff(x, y, n = 9, c = '#fdf6e8') {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * TAU, sp = 10 + Math.random() * 26;
    fx.push({ k: 'puff', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 12, gy: 22, t: 0.42 + Math.random() * 0.3, life: 0.72, r: 1.6 + Math.random() * 2.2, c });
  }
}
function poof(ctx, x, y, kind) {
  puff(x, y, 10);
  const FEA = { chicken: ['#fbf8f2', '#e04b4b', '#ffc93a'], bird: ['#8cc4f7', '#3d7fd6', '#ff9426'], cow: ['#f5f1ea', '#2b2733', '#d8d2c8'] }[kind] || ['#fbf8f2'];
  const n = kind === 'cow' ? 4 : 7;
  for (let i = 0; i < n; i++) {
    const a = Math.random() * TAU;
    fx.push({
      k: 'feather', x, y: y - 2, vx: Math.cos(a) * (14 + Math.random() * 20), vy: -20 - Math.random() * 26, gy: 26,
      t: 1.0 + Math.random() * 0.7, life: 1.7, w: 3, h: 2, c: FEA[(Math.random() * FEA.length) | 0], sw: 1.4 + Math.random() * 2.4, ph: Math.random() * TAU
    });
  }
}
function splash(x, y, scale = 1) {
  fx.push({ k: 'ring', x, y, t: 0.55, life: 0.55, r0: 2 * scale, r1: 11 * scale });
  fx.push({ k: 'ring', x, y, t: 0.8, life: 0.8, r0: 4 * scale, r1: 17 * scale });
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.2;
    fx.push({ k: 'drop', x, y, vx: Math.cos(a) * (16 + Math.random() * 22) * scale, vy: Math.sin(a) * (26 + Math.random() * 26) * scale, gy: 120, t: 0.5, life: 0.5, r: 1 + Math.random(), c: 'rgba(214,240,255,.9)' });
  }
}
function jumpFish(x, y) {                       // a fish breaking the surface: tells the player "there are fish here"
  splash(x, y, 0.8);
  fx.push({ k: 'jump', x, y, vx: (Math.random() < 0.5 ? -1 : 1) * (10 + Math.random() * 14), vy: -46 - Math.random() * 20, gy: 110, t: 0.85, life: 0.85, land: { x, y } });
}
function updateFx(dt) {
  for (let i = fx.length - 1; i >= 0; i--) {
    const p = fx[i]; p.t -= dt;
    if (p.t <= 0) { if (p.k === 'jump') splash(p.x, p.y, 0.7); fx.splice(i, 1); continue; }
    if (p.vx !== undefined) { p.x += p.vx * dt; p.y += p.vy * dt; if (p.gy) p.vy += p.gy * dt; }
    if (p.k === 'feather') { p.vx *= (1 - dt * 1.4); p.vy = Math.min(p.vy, 16); p.x += Math.sin(p.t * 7 + p.ph) * p.sw * dt * 10; }
  }
  if (fx.length > 160) fx.splice(0, fx.length - 160);
}
function drawFx(g, cx, cy) {
  for (const p of fx) {
    const k = Math.max(0, p.t / p.life), x = Math.round(p.x) - cx, y = Math.round(p.y) - cy;
    if (p.k === 'puff') { g.globalAlpha = k * 0.9; g.fillStyle = p.c; g.beginPath(); g.arc(x, y, p.r * (0.6 + (1 - k) * 0.9), 0, TAU); g.fill(); }
    else if (p.k === 'feather') { g.globalAlpha = Math.min(1, k * 1.6); g.fillStyle = p.c; g.fillRect(x - 1, y - 1, p.w, p.h); g.fillStyle = 'rgba(28,26,36,.5)'; g.fillRect(x - 1, y - 1, 1, 1); }
    else if (p.k === 'ring') { g.globalAlpha = k * 0.75; g.strokeStyle = '#dff0ff'; g.lineWidth = 1; g.beginPath(); const r = p.r0 + (p.r1 - p.r0) * (1 - k); g.ellipse(x, y, r, r * 0.45, 0, 0, TAU); g.stroke(); }
    else if (p.k === 'drop') { g.globalAlpha = k; g.fillStyle = p.c; g.fillRect(x, y, 1 + (p.r | 0), 1 + (p.r | 0)); }
    else if (p.k === 'jump') { const img = HELD.fish[(p.t * 8 | 0) % 2][p.vx < 0 ? 1 : 0]; g.globalAlpha = 1; g.drawImage(img, x - (img.width >> 1), y - img.height); }
  }
  g.globalAlpha = 1;
}

// ---------------------------------------------------------------- fish density field
function buildDensity(ctx) {
  dens = null; spots = []; waterTiles = [];
  const map = ctx.S.map, W = map.w, H = map.h, T = ctx.T;
  const shore = [];
  for (let ty = 1; ty < H - 1; ty++) for (let tx = 1; tx < W - 1; tx++) {
    if (ctx.getG(map, tx, ty) !== T.WATER) continue;
    const t = ty * W + tx; waterTiles.push(t);
    let near = false;
    for (let dy = -3; dy <= 3 && !near; dy++) for (let dx = -3; dx <= 3; dx++) {
      const gg = ctx.getG(map, tx + dx, ty + dy);
      if (gg !== T.WATER && gg !== T.NONE && !ctx.isSolid(map, tx + dx, ty + dy)) { near = true; break; }
    }
    if (near) shore.push(t);
  }
  if (waterTiles.length < 8) return;
  // hot spots: seeded by zone id + the day, so the shoal sits somewhere new tomorrow
  const day = ctx.clock ? ctx.clock.dayIndex : Math.floor(Date.now() / 86400000);   /* F01: seed theo ngày game */
  const rng = ctx.rngFrom(((ctx.hashStr(ctx.S.zone.id) ^ 0x1f5) + day * 7919) >>> 0);
  const pool = shore.length > 6 ? shore : waterTiles;       // prefer water the player can actually cast into
  const n = 2 + ((rng() * 3) | 0);                          // 2..4 hot spots
  for (let i = 0; i < n; i++) {
    const t = pool[(rng() * pool.length) | 0];
    spots.push({ tx: t % W, ty: (t / W) | 0, r: 4 + rng() * 3 });   // radius 4..7 tiles
  }
  dens = new Float32Array(W * H);
  for (const t of waterTiles) {
    const tx = t % W, ty = (t / W) | 0;
    let d = BASE;
    for (const s of spots) {
      const k = 1 - Math.hypot(tx - s.tx, ty - s.ty) / s.r;
      if (k > 0) d = Math.max(d, BASE + (1 - BASE) * k);    // 1.0 at the centre → 0.15 baseline
    }
    dens[t] = d;
  }
}
function densityAt(ctx, tx, ty) {
  if (!dens) return 0.5;
  const map = ctx.S.map;
  if (tx < 0 || ty < 0 || tx >= map.w || ty >= map.h) return BASE;
  return dens[ty * map.w + tx] || BASE;
}
function randWaterNear(ctx, rng, tx, ty, rad) {
  for (let i = 0; i < 26; i++) {
    const a = rng() * TAU, r = rng() * rad;
    const x = Math.round(tx + Math.cos(a) * r), y = Math.round(ty + Math.sin(a) * r);
    if (isWaterT(ctx, x, y)) return { x, y };
  }
  return isWaterT(ctx, tx, ty) ? { x: tx, y: ty } : null;
}
function mkFish(tx, ty, home, hr, rng) {
  return {
    kind: 'fish', x: tx * TILE + 8, y: ty * TILE + 8, hx: home.x * TILE + 8, hy: home.y * TILE + 8, hr,
    dir: 1, st: 'swim', t: rng() * 2, ang: rng() * TAU, fr: 0, ft: rng() * 2, z: 0
  };
}
function spawnFishByDensity(ctx, rng) {
  if (!dens) return;
  const map = ctx.S.map, W = map.w;
  for (const s of spots) {                                  // crowded: 4..6 shadows around each hot spot
    const n = 4 + ((rng() * 3) | 0);
    for (let i = 0; i < n; i++) {
      const p = randWaterNear(ctx, rng, s.tx, s.ty, s.r * 0.65);
      if (p) list.push(mkFish(p.x, p.y, { x: s.tx, y: s.ty }, s.r * TILE * 0.7, rng));
    }
  }
  // sparse water: a lone shadow here and there (0..1 per area)
  const want = Math.max(2, Math.min(8, (waterTiles.length / 110) | 0));
  for (let i = 0, guard = 0; i < want && guard < 200; guard++) {
    const t = waterTiles[(rng() * waterTiles.length) | 0], tx = t % W, ty = (t / W) | 0;
    if (dens[t] > 0.35) continue;                           // that is hot-spot water, leave it to the shoal
    list.push(mkFish(tx, ty, { x: tx, y: ty }, 2.5 * TILE, rng));
    i++;
  }
}
function hotSplashes(dt, ctx) {
  if (!spots.length) return;
  splashT -= dt;
  if (splashT > 0) return;
  splashT = 0.5 + Math.random() * 0.9;
  const p = ctx.S.player;
  const s = spots[(Math.random() * spots.length) | 0];
  const t = randWaterNear(ctx, Math.random, s.tx, s.ty, s.r * 0.6);
  if (!t) return;
  const x = t.x * TILE + 8, y = t.y * TILE + 9;
  if (Math.hypot(x - p.x, y - p.y) > 320) return;           // off screen, do not bother
  if (Math.random() < 0.34) jumpFish(x, y); else splash(x, y, 0.7 + Math.random() * 0.5);
}

// ---------------------------------------------------------------- spawning (land)
function spawnLand(ctx, rng, kind, n) {
  const map = ctx.S.map;
  const cand = ctx.freeTiles(map, rng, { x: 3, y: 3, w: map.w - 6, h: map.h - 6 }, n * 8, Object.values(map.entries), 3, 3);
  let made = 0;
  for (const s of cand) {
    if (made >= n) break;
    if (inPlot(map, s.x, s.y, 1) || onRoad(map, s.x, s.y)) continue;
    list.push(mkLand(kind, s.x * TILE + 8, s.y * TILE + 14, rng));
    made++;
  }
}
function mkLand(kind, x, y, rng) {
  return { kind, x, y, dir: rng() < 0.5 ? 1 : -1, st: 'idle', t: rng() * 2, ang: rng() * TAU, fr: 0, ft: rng() * 2, z: 0 };
}
function spawnBirds(ctx, rng, n) {
  const map = ctx.S.map;
  const cand = ctx.freeTiles(map, rng, { x: 6, y: 6, w: map.w - 12, h: map.h - 12 }, n * 4, [], 4, 5);
  let made = 0;
  for (const s of cand) {
    if (made >= n) break;
    if (inPlot(map, s.x, s.y, 1)) continue;
    const rx = 40 + rng() * 60, ry = 26 + rng() * 40;
    list.push({
      kind: 'bird', st: 'fly', dir: 1, fr: 0, ft: rng() * 2, z: 24 + rng() * 10,
      cx: s.x * TILE + 8, cy: s.y * TILE + 8, rx, ry, ang: rng() * TAU, av: (rng() < .5 ? -1 : 1) * (0.32 + rng() * 0.36),
      x: s.x * TILE + 8, y: s.y * TILE + 8, t: 5 + rng() * 9
    });
    made++;
  }
}

// ---------------------------------------------------------------- movement
function stepTo(ctx, a, dx, dy) {
  let moved = false;
  if (dx && walkable(ctx, a.x + dx, a.y)) { a.x += dx; moved = true; }
  if (dy && walkable(ctx, a.x, a.y + dy)) { a.y += dy; moved = true; }
  return moved;
}
function fleeFrom(a, p) {
  a.st = 'flee'; a.t = a.kind === 'chicken' ? 1.1 : 1.8;
  a.ang = Math.atan2(a.y - p.y, a.x - p.x) + (Math.random() - 0.5) * 0.6;
}
function updateLand(dt, ctx, a, p, playing) {
  const K = KIND[a.kind];
  a.t -= dt;
  if (a.st === 'flee') {
    const sp = K.flee * dt;
    if (!stepTo(ctx, a, Math.cos(a.ang) * sp, Math.sin(a.ang) * sp)) a.ang += 1.7;
    if (a.t <= 0) { a.st = 'idle'; a.t = 0.6 + Math.random() * 1.6; }
  } else if (a.st === 'walk') {
    const sp = K.sp * dt;
    if (!stepTo(ctx, a, Math.cos(a.ang) * sp, Math.sin(a.ang) * sp)) a.ang += 1.9;
    if (a.t <= 0) { a.st = 'idle'; a.t = (a.kind === 'chicken' ? 0.3 : 1.0) + Math.random() * (a.kind === 'chicken' ? 1.0 : 3.0); }
  } else if (a.t <= 0) {
    a.st = 'walk'; a.ang = Math.random() * TAU;
    a.t = (a.kind === 'chicken' ? 0.2 : 0.8) + Math.random() * (a.kind === 'chicken' ? 0.4 : 2.2);
  }
  if (a.st !== 'idle') { a.dir = Math.cos(a.ang) >= 0 ? 1 : -1; a.face = faceOf(a); }
  a.ft += dt * (a.st === 'idle' ? K.idleAnim : K.anim * (a.st === 'flee' ? 1.4 : 1));
  a.fr = ((a.ft | 0) % 2);
}
function updateBird(dt, ctx, a, p, playing) {
  const K = KIND.bird;
  if (a.st === 'fly') {
    a.ang += a.av * dt; a.t -= dt;
    a.x = a.cx + Math.cos(a.ang) * a.rx; a.y = a.cy + Math.sin(a.ang) * a.ry;
    a.dir = (-Math.sin(a.ang) * a.av) >= 0 ? 1 : -1;
    if (a.t <= 0) {
      const spot = findPerch(ctx, a);
      if (spot) { a.st = 'down'; a.lx = spot.x; a.ly = spot.y; a.t = 0.7; a.z0 = a.z; }
      else a.t = 3 + Math.random() * 5;
    }
  } else if (a.st === 'down') {
    a.t -= dt; const k = Math.max(0, a.t / 0.7);
    a.x += (a.lx - a.x) * Math.min(1, dt * 5); a.y += (a.ly - a.y) * Math.min(1, dt * 5);
    a.z = a.z0 * k;
    if (a.t <= 0) { a.st = 'sit'; a.z = 0; a.x = a.lx; a.y = a.ly; a.t = 4 + Math.random() * 3; }
  } else if (a.st === 'sit') {
    a.t -= dt;
    if (a.t <= 0) { a.st = 'up'; a.t = 0.5; a.z0 = 24 + Math.random() * 10; }
  } else if (a.st === 'up') {
    a.t -= dt; a.z = a.z0 * (1 - Math.max(0, a.t / 0.5));
    if (a.t <= 0) {
      a.z = a.z0; a.st = 'fly'; a.t = 6 + Math.random() * 10;
      a.ang = Math.random() * TAU;
      a.cx = a.x - Math.cos(a.ang) * a.rx; a.cy = a.y - Math.sin(a.ang) * a.ry;
    }
  }
  a.ft += dt * (a.st === 'sit' ? K.idleAnim : K.anim);
  a.fr = ((a.ft | 0) % 2);
}
function findPerch(ctx, a) {
  const cands = [[0, 0]];
  for (let i = 0; i < 10; i++) cands.push([(Math.random() - 0.5) * 60, (Math.random() - 0.5) * 60]);
  const map = ctx.S.map;
  for (const [dx, dy] of cands) {
    const x = a.x + dx, y = a.y + dy, tx = tileOf(x), ty = tileOf(y);
    if (tx < 2 || ty < 2 || tx > map.w - 3 || ty > map.h - 3) continue;
    if (!walkable(ctx, x, y)) continue;
    return { x: tx * TILE + 8, y: ty * TILE + 13 };
  }
  return null;
}
function updateFish(dt, ctx, a) {
  a.t -= dt;
  if (a.t <= 0) { a.ang = Math.random() * TAU; a.t = 1 + Math.random() * 2.2; }
  if (Math.hypot(a.x - a.hx, a.y - a.hy) > a.hr) {            // fish stay around their spot
    a.ang = Math.atan2(a.hy - a.y, a.hx - a.x) + (Math.random() - 0.5) * 0.7;
  }
  const sp = KIND.fish.sp * dt, nx = a.x + Math.cos(a.ang) * sp, ny = a.y + Math.sin(a.ang) * sp;
  if (isWater(ctx, nx, a.y)) a.x = nx; else a.ang = Math.PI - a.ang;   // water only, never onto the beach
  if (isWater(ctx, a.x, ny)) a.y = ny; else a.ang = -a.ang;
  a.dir = Math.cos(a.ang) >= 0 ? 1 : -1; a.face = faceOf(a);
  a.ft += dt * KIND.fish.anim; a.fr = ((a.ft | 0) % 2);
}

// ---------------------------------------------------------------- catching on land (instant)
function catchLand(ctx, a) {
  const S = L(ctx);
  if (ctx.trespass && !ctx.trespass(Math.floor(a.x / TILE), Math.floor(a.y / TILE), 'catch')) return;   /* plan-18: bắt thú khu nước khác */
  if (!canCarry(ctx, a.kind)) { ctx.toast(carryDeny(ctx, a.kind)); return; }            // no room on your head
  const i = list.indexOf(a); if (i < 0) return;
  list.splice(i, 1);
  poof(ctx, a.x, a.y - 5, a.kind);
  addCarry(ctx, a.kind);
  ctx.toast(S['got' + cap(a.kind)]); if (ctx.pop) ctx.pop(a.x, a.y - 14, '+1 ' + ctx.itemIcon(a.kind));
}

// ---------------------------------------------------------------- fishing
function castTarget(ctx) {
  const map = ctx.S.map, p = ctx.S.player;
  const ptx = tileOf(p.x), pty = tileOf(p.y);
  if (isWaterT(ctx, ptx, pty)) return null;                     // must stand on a dry tile
  let adj = null;
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
    if (isWaterT(ctx, ptx + dx, pty + dy)) { adj = { tx: ptx + dx, ty: pty + dy, dx, dy }; break; }
  }
  if (!adj) return null;
  const [fdx, fdy] = DIRV[p.dir & 3];
  const a = isWaterT(ctx, ptx + fdx, pty + fdy) ? { tx: ptx + fdx, ty: pty + fdy, dx: fdx, dy: fdy } : adj;
  let bx = a.tx, by = a.ty;                                      // the bobber lands 1–2 tiles in
  if (isWaterT(ctx, a.tx + a.dx, a.ty + a.dy)) { bx += a.dx; by += a.dy; }
  return { tx: a.tx, ty: a.ty, bx, by, x: a.tx * TILE + 8, y: a.ty * TILE + 8 };
}
/* 2026-09-28: loài cá + thẻ thông tin khi câu được (ảnh PixelLab: tools/px-fish.py → manifest ui.fish) */
const FISH = [   /* id, tên, cỡ cm [min,max], độ hiếm 1–4, trọng số [nhỏ, to], mô tả */
  { id: 'perch', vi: 'Cá rô', en: 'Perch', cm: [12, 25], r: 1, w: [30, 0], dvi: 'Cá rô sọc, gặp ở mọi bờ nước lặng.', den: 'A striped perch, found by any calm shore.' },
  { id: 'carp', vi: 'Cá chép', en: 'Carp', cm: [25, 60], r: 1, w: [25, 6], dvi: 'Cá chép vàng, ăn khỏe, kéo lì.', den: 'A golden carp, hungry and stubborn.' },
  { id: 'sardine', vi: 'Cá mòi', en: 'Sardine', cm: [10, 20], r: 1, w: [25, 0], dvi: 'Nhỏ và nhanh, hay đi thành đàn.', den: 'Small and quick, travels in shoals.' },
  { id: 'mackerel', vi: 'Cá thu', en: 'Mackerel', cm: [30, 55], r: 2, w: [14, 10], dvi: 'Lưng xanh sọc sóng, bơi rất khỏe.', den: 'Wavy blue back, a strong swimmer.' },
  { id: 'catfish', vi: 'Cá trê', en: 'Catfish', cm: [35, 90], r: 2, w: [6, 18], dvi: 'Râu dài, thích nằm sát đáy bùn.', den: 'Long whiskers, likes the muddy bottom.' },
  { id: 'salmon', vi: 'Cá hồi', en: 'Salmon', cm: [50, 100], r: 3, w: [0, 22], dvi: 'Thịt hồng, bơi ngược dòng về nơi sinh ra.', den: 'Pink-fleshed, swims home upstream.' },
  { id: 'tuna', vi: 'Cá ngừ', en: 'Tuna', cm: [80, 200], r: 3, w: [0, 16], dvi: 'Sức kéo như ngựa, cẩn thận đứt dây.', den: 'Pulls like a horse, mind your line.' },
  { id: 'grouper', vi: 'Cá mú', en: 'Grouper', cm: [60, 150], r: 3, w: [0, 14], dvi: 'Miệng to, ẩn mình giữa rạn đá.', den: 'A big mouth hiding among the rocks.' },
  { id: 'goldkoi', vi: 'Cá Koi Hoàng Kim', en: 'Golden Koi', cm: [60, 120], r: 4, w: [0.6, 2.5], dvi: 'Truyền thuyết của Seismic, ánh vàng chẳng bao giờ tắt.', den: 'A Seismic legend, its glow never fades.' },
];
const RARITY = { vi: ['', 'Thường', 'Khá hiếm', 'Hiếm', 'Huyền thoại'], en: ['', 'Common', 'Uncommon', 'Rare', 'Legendary'] }, RCOL = ['', '#8a7a5e', '#3d8a4f', '#3d6db5', '#c9851a'];
function pickFish(big) { const k = big ? 1 : 0, tot = FISH.reduce((a, f) => a + f.w[k], 0); let x = Math.random() * tot; for (const f of FISH) { x -= f.w[k]; if (x <= 0) return f; } return FISH[0]; }
const FIMG = {}; function fimg(k, file) { if (FIMG[k] !== undefined) return FIMG[k]; const im = new Image(); im.src = 'assets/px/' + file; FIMG[k] = im; return im; }
/* khung giấy PixelLab 9 mảnh (ui/hud/box.png 32×32, góc 6 px) cho bảng câu cá — plan-22 'mọi thứ là pixel' */
function nine(ug, x, y, w, h, b) {
  const im = fimg('hudbox', 'ui/hud/box.png'); x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h); b = Math.round(b);
  if (!im.complete || !im.naturalWidth) { ug.fillStyle = '#352022'; ug.fillRect(x, y, w, h); ug.fillStyle = '#f6e7c8'; ug.fillRect(x + 3, y + 3, w - 6, h - 6); return; }
  const S = im.naturalWidth, c = 6, m = S - 2 * c, ss = ug.imageSmoothingEnabled; ug.imageSmoothingEnabled = false;
  const P = [[0, c, 0, b], [c, m, b, w - 2 * b], [S - c, c, w - b, b]], Q = [[0, c, 0, b], [c, m, b, h - 2 * b], [S - c, c, h - b, b]];
  for (const [sx, sw, dx, dw] of P) for (const [sy, sh, dy, dh] of Q) ug.drawImage(im, sx, sy, sw, sh, x + dx, y + dy, dw, dh);
  ug.imageSmoothingEnabled = ss;
}
function fishUi() { const f = ART.on && ART.man && ART.man.ui && ART.man.ui.fish; return f || null; }
function startCast(ctx, t) {
  const S = L(ctx);   /* 2026-10-11: cá vào túi vô hạn → không còn chặn 'đầy xô' */
  const d = densityAt(ctx, t.bx, t.by);
  // nhân phẩm — luck: a plain 0.7–1.3 roll on top of how crowded the water is
  const luck = 0.7 + Math.random() * 0.6;
  const wait = Math.min(20, Math.max(2, (7 / d) * luck));
  fishing = { phase: 'wait', t: wait, wob: 0, bx: t.bx * TILE + 8, by: t.by * TILE + 9, dens: d, ent: null, prog: 0, tens: 0, presses: [], pull: 0, big: false, yank: 0, life: 0 };
  splash(fishing.bx, fishing.by, 0.8);
  { const pl = ctx.S.player; if (pl.act) { pl.faceTo(fishing.bx, fishing.by); if (pl.hasAct('cast')) { pl.act('cast', 0.7); fishing.castT = 0.7; } else if (pl.hasAct('fish')) pl.act('fish', 1.0, true); } }   /* vung cần (clip cast) rồi giữ tư thế chờ (fish) */
  ctx.setMode('fish');
  ctx.registerCloser('fish', () => { fishing = null; if (ctx.S.player.endAct) ctx.S.player.endAct('fish'); ctx.setMode('play'); });
}
function biteNow(ctx) {
  fishing.phase = 'bite'; fishing.t = 1.2;                       // 1.2 s to hook it
  splash(fishing.bx, fishing.by, 0.6);
  let best = null, bd = 90;
  for (const a of list) { if (a.kind !== 'fish') continue; const d = Math.hypot(a.x - fishing.bx, a.y - fishing.by); if (d < bd) { bd = d; best = a; } }
  if (best) { fishing.ent = best; best.hx = fishing.bx; best.hy = fishing.by; best.hr = 10; }
}
export function seaCast(ctx, t, dens) {   /* sea_dive.js gọi khi thả câu từ bè: vung cần, phao, thanh kéo, thẻ loài, bưng đúng con — như trên bờ */
  startCast(ctx, t); if (!fishing) return false;
  const luck = 0.7 + Math.random() * 0.6; fishing.sea = true; fishing.dens = dens || 0.5; fishing.t = Math.min(20, Math.max(2, (7 / fishing.dens) * luck)); return true;
}
export const headSprite = it => sprOf(normItem(it));   /* sea_dive vẽ chồng trên đầu ngoài biển: cá đúng loài */
function startReel(ctx) {
  const d = fishing.dens;
  fishing.big = Math.random() < 0.15 + d * 0.45;                 // crowded water → better odds of a big one
  if (fishing.sea) { const r = Math.random(); fishing.special = r < 0.05 ? 'goldfish' : r < 0.2 ? 'squid' : null; if (fishing.special) fishing.big = false; }   /* biển: cá vàng / mực như trước */
  { const pl = ctx.S.player; if (pl.act && pl.hasAct('reel')) pl.act('reel', 0.6); }   /* giật kéo cá */
  fishing.phase = 'reel'; fishing.prog = 0.28; fishing.tens = 0; fishing.presses = []; fishing.life = 30;
  // the fish pulls back 0.05..0.11 of the bar per second, scaled by its size
  fishing.pull = fishing.big ? 0.085 + Math.random() * 0.025 : 0.05 + Math.random() * 0.03;
  splash(fishing.bx, fishing.by, 0.9);
}
function endFish(ctx) {
  fishing = null; if (ctx.S.player.endAct) ctx.S.player.endAct('fish'); if (ctx.S.mode === 'fish') ctx.setMode('play');
  if (SHOW && SHOW.pending) {   /* thẻ cá vừa đóng → giơ con cá lên đầu 2,6 s cho người chơi thấy rồi mới bay vào túi */
    SHOW.pending = false; SHOW.until = ctx.S.time + 2.6;
    const p = ctx.S.player; if (p.hasAct && p.hasAct('carry') && p.act) p.act('carry', 2.2);
  }
}
function failFish(ctx, msg) {
  const S = L(ctx);
  if (fishing && fishing.ent) { const e = fishing.ent; e.ang = Math.random() * TAU; e.t = 2; e.hr = Math.max(e.hr, 30); }
  if (fishing) splash(fishing.bx, fishing.by, 1.0);
  ctx.toast(msg || S.gotAway);
  fishing = { ...fishing, phase: 'done', ok: false, t: 0.9, text: msg === S.snapped ? S.snapped : S.bad };
}
function succeedFish(ctx) {
  const S = L(ctx);
  if (fishing.ent) { const i = list.indexOf(fishing.ent); if (i >= 0) list.splice(i, 1); }
  splash(fishing.bx, fishing.by, 1.4);
  puff(ctx.S.player.x, ctx.S.player.y - 16, 6, '#dff0ff');
  if (fishing.special) {   /* biển: mực / cá vàng (không có thẻ loài) → túi */
    const k = fishing.special, vi = ctx.lang() === 'vi'; catchToBag(ctx, k);
    ctx.toast(k === 'goldfish' ? (vi ? 'Cá vàng! (hiếm)' : 'A golden fish! (rare)') : (vi ? 'Câu được mực!' : 'A squid!')); ctx.sfx(k === 'goldfish' ? 'catch_rare' : 'catch');
    fishing = { ...fishing, phase: 'done', ok: true, t: 0.9, text: S.ok }; if (ctx.S.player.endAct) ctx.S.player.endAct('reel'); return;
  }
  const sp = pickFish(!!fishing.big), cm = Math.round(sp.cm[0] + (sp.cm[1] - sp.cm[0]) * Math.pow(Math.random(), fishing.big ? 0.7 : 1.4));   /* chọn loài TRƯỚC → nhân vật giơ đúng con vừa câu */
  const ok = catchToBag(ctx, { kind: 'fish', big: !!fishing.big, sp: sp.id, cm });
  ctx.toast(fishing.big ? S.gotBigFish : S.gotFish); if (ok && ctx.pop) ctx.pop(ctx.S.player.x, ctx.S.player.y - 18, '+1 🐟');
  const log = ((ctx.S.save.sys ||= {}).fishLog ||= {}), rec = log[sp.id] ||= { n: 0, best: 0 }; rec.n++; const isRec = cm > rec.best; if (isRec) rec.best = cm; ctx.persist();
  fishing = { ...fishing, phase: 'done', ok: true, t: 6, text: S.ok, card: { sp, cm, n: rec.n, best: rec.best, isRec, first: rec.n === 1 } };
  if (ctx.S.player.endAct) ctx.S.player.endAct('reel');
}
// E / Space / Enter / touch A while S.mode === 'fish'
function fishAction(ctx) {
  if (!fishing) return;
  const S = L(ctx);
  if (fishing.phase === 'bite') {
    // even with the timing right, the hook slips 12% of the time
    if (Math.random() < 0.12) { failFish(ctx, S.gotAway); return; }
    startReel(ctx); return;
  }
  if (fishing.phase === 'reel') {
    const now = ctx.S.time, last = fishing.presses.length ? fishing.presses[fishing.presses.length - 1] : -9;
    const inst = 1 / Math.max(0.02, now - last);           // presses per second, straight off the last gap
    if (now - last < 1 && inst > 6) fishing.tens += (inst - 6) * 0.028;   // mashing puts the line under strain
    fishing.presses.push(now);
    fishing.yank = 0.16;
    if (fishing.tens >= 1) { failFish(ctx, S.snapped); return; }
    fishing.prog = Math.min(1, fishing.prog + 0.09);
    if (fishing.prog >= 1) succeedFish(ctx);
    return;
  }
  if (fishing.phase === 'done') endFish(ctx);
}
function updateFishing(dt, ctx) {
  const S = L(ctx), f = fishing;
  f.wob += dt * (f.phase === 'bite' ? 7 : 2);
  { const pl = ctx.S.player;   /* động tác theo pha: vung xong thì tư thế chờ; đang kéo thì lặp clip reel */
    if (f.castT > 0) { f.castT -= dt; if (f.castT <= 0 && pl.hasAct && pl.hasAct('fish') && (f.phase === 'wait' || f.phase === 'bite')) pl.act('fish', 0.3, true); }
    if (f.phase === 'reel' && pl.hasAct && pl.hasAct('reel') && !(pl.action && pl.action.name === 'reel')) pl.act('reel', 0.6); }
  if (f.yank) f.yank = Math.max(0, f.yank - dt);
  if (f.phase === 'wait') {
    f.t -= dt;
    if (Math.random() < dt * 0.7) splash(f.bx + (Math.random() - 0.5) * 10, f.by + (Math.random() - 0.5) * 6, 0.35);
    if (f.t <= 0) biteNow(ctx);
  } else if (f.phase === 'bite') {
    f.t -= dt;
    if (f.t <= 0) failFish(ctx, S.gotAway);
  } else if (f.phase === 'reel') {
    const now = ctx.S.time;
    f.presses = f.presses.filter(t => t > now - 1.5);
    const rate = f.presses.filter(t => t > now - 1).length;      // presses per second
    if (rate > 6) f.tens = Math.min(1, f.tens + (rate - 6) * 0.08 * dt);
    else f.tens = Math.max(0, f.tens - 0.5 * dt);
    if (f.tens >= 1) { failFish(ctx, S.snapped); return; }
    f.prog -= f.pull * (1 + 0.35 * Math.sin(now * 2.6)) * dt;
    if (f.ent) { f.ent.x += Math.cos(now * 5) * 12 * dt; f.ent.y += Math.sin(now * 4) * 8 * dt; }
    f.life -= dt;
    if (f.prog <= 0 || f.life <= 0) { f.prog = 0; failFish(ctx, S.gotAway); return; }
  } else if (f.phase === 'done') {
    f.t -= dt;
    if (f.t <= 0) endFish(ctx);
  }
}

/* thẻ thông tin cá: khung PixelLab (ui/fish_card.png) + hình loài + tên, cỡ, độ hiếm, mô tả, số lần câu, kỷ lục */
let fontAsked = false;
function drawFishCard(ug, ctx, c, W, H, scale) {
  /* khung PixelLab 128×96, lòng giấy đo được x 23..104, y 19..75 (px-fish.py) → chữ/ảnh chỉ nằm trong lòng giấy */
  if (!fontAsked && document.fonts) { fontAsked = true; document.fonts.load('16px VT323', 'Cá rô ắ ệ ★').catch(() => {}); }   /* VT323 chia 2 file theo bảng mã: nạp cả bản tiếng Việt cho canvas */
  const vi = ctx.lang() === 'vi', fa = fishUi(), k = Math.max(3, Math.min(6, Math.floor(Math.min(W / 135, H / 110)))), cw = 128 * k, ch = 96 * k, x0 = Math.round((W - cw) / 2), y0 = Math.round((H - ch) / 2 - H * 0.03);
  const F = n => `${Math.round(n * k)}px VT323, monospace`, U = n => Math.round(n * k), X = n => x0 + U(n), Y = n => y0 + U(n), t = ctx.S.time;
  ug.imageSmoothingEnabled = false;
  const card = fa && fa.card ? fimg('card', fa.card) : null;
  if (card && card.complete && card.naturalWidth) ug.drawImage(card, x0, y0, cw, ch);
  else { ug.fillStyle = '#6b4a2e'; ug.fillRect(X(9), Y(6), U(110), U(83)); ug.fillStyle = '#f5e6c4'; ug.fillRect(X(23), Y(19), U(82), U(57)); }
  const is = U(22), ix = X(25), iy = Y(21), fi = fa && fa.species && fa.species[c.sp.id] ? fimg('f_' + c.sp.id, fa.species[c.sp.id]) : null;
  if (c.sp.r >= 4) { ug.fillStyle = `rgba(255,212,94,${0.25 + 0.15 * Math.sin(t * 4)})`; ug.beginPath(); ug.arc(ix + is / 2, iy + is / 2, is * 0.55, 0, TAU); ug.fill(); }
  if (fi && fi.complete && fi.naturalWidth) ug.drawImage(fi, ix, iy + Math.round(Math.sin(t * 3) * k * 0.5), is, is);
  const tx = X(50), tw = X(103) - tx; ug.textAlign = 'left'; ug.textBaseline = 'top';
  ug.fillStyle = '#3b2412'; ug.font = F(7.5); ug.fillText(vi ? c.sp.vi : c.sp.en, tx, Y(20), tw);
  ug.font = F(5.5); ug.fillStyle = RCOL[c.sp.r]; ug.fillText('★'.repeat(c.sp.r) + ' ' + RARITY[vi ? 'vi' : 'en'][c.sp.r], tx, Y(27.5), tw);
  ug.fillStyle = '#3b2412'; ug.fillText((vi ? 'Cỡ ' : 'Size ') + c.cm + ' cm' + (c.isRec && !c.first ? (vi ? ' · kỷ lục!' : ' · record!') : ''), tx, Y(33), tw);
  ug.font = F(5); ug.fillStyle = '#6b4a2e'; ug.fillText((vi ? 'Lần ' : 'Catch #') + c.n + (vi ? ' · kỷ lục ' : ' · best ') + c.best + ' cm', tx, Y(38.5), tw);
  ug.fillStyle = '#5a3d22'; ug.font = F(5); const desc = vi ? c.sp.dvi : c.sp.den, maxW = U(77); let line = '', yy = Y(46);
  for (const w of desc.split(' ')) { const tt = line ? line + ' ' + w : w; if (ug.measureText(tt).width > maxW) { ug.fillText(line, X(25), yy); line = w; yy += U(5.5); } else line = tt; }
  if (line) ug.fillText(line, X(25), yy);
  if (c.first) { ug.fillStyle = '#c9851a'; ug.textAlign = 'right'; ug.font = F(6); ug.fillText(vi ? 'MỚI!' : 'NEW!', X(103), Y(68)); }
  ug.textAlign = 'center'; ug.font = F(5.5); const hint = keyHint(vi ? 'E · đóng' : 'E · close'), hw = ug.measureText(hint).width + U(8);
  ug.fillStyle = 'rgba(13,11,20,.7)'; ug.fillRect(x0 + cw / 2 - hw / 2, Y(91), hw, U(8)); ug.fillStyle = '#f5e6c4'; ug.fillText(hint, x0 + cw / 2, Y(92));
}

// ---------------------------------------------------------------- system
export const animals = {
  id: 'animals',
  key(code, ctx) { return code === 'KeyT' && throwTop(ctx); },   /* T: ném thú trên đầu vào ô trống */

  onZoneEnter(ctx) {
    list = []; fx = []; fishing = null; splashT = 0.6;
    if (ctx.S.mode === 'fish' || ctx.S.mode === 'catch') ctx.setMode('play');
    ctx.onAction('fish', () => fishAction(ctx));     // E / Space / Enter / touch A while reeling
    ctx.registerCloser('fish', () => { fishing = null; ctx.setMode('play'); });
    /* cá trên tay giữ nguyên tới khi bấm T (anh 2026-10-11); xô của save cũ đã được save.js dropBucket dọn */
    { const sa = sysS(ctx), m = sa.migr; if (m) { delete sa.migr; ctx.persist(); const vi = ctx.lang() === 'vi';   /* save cũ có lồng / xe chở (save.js dropBucket) → báo 1 lần */
      setTimeout(() => ctx.toast(vi ? `Đã bỏ lồng/xe chở: ${m.bag || 0} con thú chuyển vào túi${m.freed ? `, ${m.freed} con được thả ra` : ''} (bấm T cất thú trên đầu vào túi)` : `Cages and carts are gone: ${m.bag || 0} animals moved to your bag${m.freed ? `, ${m.freed} released` : ''} (press T to stow the one on your head)`, true), 1200); } }
    syncInv(ctx);                                    // the HUD line always mirrors what is on your head
    ctx.animals = { list: () => list, remove: a => { const i = list.indexOf(a); if (i >= 0) list.splice(i, 1); } };   /* petgun.js: thú hóa đá (a.stoneT) → tượng rồi vỡ */
    if (ctx.S.map.sea) return;                       // the Sea of Origins: sea_dive.js owns fishing, schools and the head stack there
    buildDensity(ctx);
    const id = ctx.S.zone.id, th = THEME[id]; if (!th) return;
    const rng = ctx.rngFrom(ctx.hashStr('animals:' + id) ^ 0x5eed);
    const n = r => r[0] + ((rng() * (r[1] - r[0] + 1)) | 0);
    if (th.cow) spawnLand(ctx, rng, 'cow', n(th.cow));
    if (th.chicken) spawnLand(ctx, rng, 'chicken', n(th.chicken));
    if (th.bird) spawnBirds(ctx, rng, n(th.bird));
    if (th.fish) spawnFishByDensity(ctx, rng);
    // test / demo hooks
    if (typeof window !== 'undefined') window.__animalsRaw = () => list;   /* móc test plan-11 */
    if (typeof window !== 'undefined') window.__animals = {
      list: () => list.map(a => ({ kind: a.kind, x: Math.round(a.x), y: Math.round(a.y), st: a.st, drink: a.dr ? a.dr.ph : null, drinkN: a.drinkN || 0 })),
      thirsty: (kind, x, y) => { const a = list.find(o => o.kind === kind); if (!a) return null; if (x !== undefined) { a.x = x; a.y = y; } a.st = 'idle'; a.t = 1; a.dr = null; a.thirstT = 0; a.badK = null; return { x: a.x, y: a.y }; },   /* test thirst.js */
      raw: kind => list.find(o => o.kind === kind) || null,
      warp: (kind, dx = 14) => { const a = list.find(x => x.kind === kind); if (!a) return null; ctx.S.player.x = a.x + dx; ctx.S.player.y = a.y + 4; return { x: a.x, y: a.y }; },
      bring: kind => { const a = list.find(x => x.kind === kind), p = ctx.S.player; if (!a) return null; a.x = p.x + 16; a.y = p.y; a.st = 'idle'; a.t = 5; if (a.perch) { a.perch.x = a.x; a.perch.y = a.y; } return { x: a.x, y: a.y }; },
      spots: () => spots.slice(), fishing: () => fishing,
      shore: () => { // a dry tile next to water, as close to the richest hot spot as possible: {tx, ty, dir}
        const m = ctx.S.map, s = spots[0]; if (!s) return null; let best = null, bd = 1e9;
        for (let ty = 1; ty < m.h - 1; ty++) for (let tx = 1; tx < m.w - 1; tx++) {
          if (ctx.getG(m, tx, ty) === ctx.T.WATER || ctx.isSolid(m, tx, ty)) continue;
          const w = [[1, 0, 2], [-1, 0, 1], [0, 1, 0], [0, -1, 3]].find(([dx, dy]) => ctx.getG(m, tx + dx, ty + dy) === ctx.T.WATER); if (!w) continue;
          const d = Math.hypot(tx - s.tx, ty - s.ty); if (d < bd) { bd = d; best = { tx, ty, dir: w[2] }; }
        }
        return best;
      }
    };
  },

  onZoneLeave(ctx) {
    if (fishing) { fishing = null; if (ctx.S.mode === 'fish') ctx.setMode('play'); }
    SHOW = null;   /* cá đã ở trong túi từ lúc câu */
    list = []; fx = []; dens = null; spots = []; waterTiles = [];
  },

  update(dt, ctx) {
    const p = ctx.S.player, playing = ctx.S.mode === 'play';
    if (SHOW) {   /* khoe cá: thẻ bị đóng kiểu khác (Esc) → bắt đầu đếm 2,6 s; hết giờ → bay vào túi */
      if (SHOW.pending && !fishing) { SHOW.pending = false; SHOW.until = ctx.S.time + 2.6; }
      else if (!SHOW.pending && ctx.S.time >= SHOW.until) showLand(ctx);
    }
    // bế thú: có gì trên đầu → clip 'carry' (hai tay giơ đỡ, chân theo bước); hết → trả về (không đè động tác khác đang chạy)
    if (p.act) { const carrying = !p.custom && carrySlots(ctx).some(s => s.where === 'hand');   /* chỉ khi bế tay trên đầu; lồng đã đeo hông (2026-09-28), xô/xe không giơ tay */ if (carrying && p.hasAct('carry') && (!p.action || p.action.name === 'carry')) p.act('carry', 1, true, true); else if (!carrying && p.action && p.action.name === 'carry') p.endAct('carry'); }
    for (const a of list) {
      if (a.stoneT) continue;   /* petgun.js: tượng đá đứng yên */
      if (a.kind === 'bird') updateBird(dt, ctx, a, p, playing);
      else if (a.kind === 'fish') updateFish(dt, ctx, a);
      else {
        // land animals bolt if you barge into them; catching itself is instant, so no sneaking bar any more
        if (playing && Math.hypot(a.x - p.x, a.y - p.y) < 13 && a.st !== 'flee') fleeFrom(a, p);
        if (thirst(dt, ctx, a, { walk: (x, y) => walkable(ctx, x, y), step: (dx, dy) => stepTo(ctx, a, dx, dy), sp: KIND[a.kind].sp })) { if (a.st === 'walk') { a.ft += dt * KIND[a.kind].anim; a.fr = (a.ft | 0) % 2; } }   /* khát → ra mép nước uống */
        else updateLand(dt, ctx, a, p, playing);
      }
    }
    hotSplashes(dt, ctx);
    updateFx(dt);
    if (fishing) updateFishing(dt, ctx);
  },

  drawables(ctx, cx, cy) {
    if (ctx.S.map.sea) { const out = []; drawCarry(ctx, ctx.g, cx, cy, out); return out; }   /* biển: vẫn vẽ chồng trên đầu (anh: câu được là cầm cá lên luôn) — sea_dive không vẽ */
    const out = [], g = ctx.g, VW = ctx.VW, VH = ctx.VH;
    for (const a of list) {
      const sx = a.x - cx, sy = a.y - cy;
      if (sx < -40 || sy < -60 || sx > VW + 40 || sy > VH + 40) continue;
      const set0 = SPR[a.kind], set = (a.st === 'idle' && set0.idle) ? set0.idle : set0;   // art.js gắn clip idle (gặm/thở) nếu gói có
      const img = dirFrame(set0, a.face, a.ft, a.st !== 'idle', a) || set[a.fr % set.length][a.dir < 0 ? 1 : 0];   /* plan-11: hàng theo hướng nếu có */
      const dx = Math.round(a.x) - (img.width >> 1) - cx;
      const dy = Math.round(a.y - (a.z || 0)) - img.height - cy;
      if (a.stoneT) { out.push({ y: a.y, f: () => { g.save(); g.filter = STONE_FILTER; g.drawImage(img, dx, dy); g.restore(); } }); continue; }   /* petgun.js: tượng đá = chính ảnh thú tô đá */
      if (a.kind === 'bird' && a.z > 1) {
        const bx = Math.round(a.x) - cx, by = Math.round(a.y) - cy, r = Math.max(2, 5 - a.z / 10);
        out.push({ y: a.y - 1, f: () => { g.fillStyle = 'rgba(0,0,0,.22)'; g.beginPath(); g.ellipse(bx, by, r, r * 0.5, 0, 0, 7); g.fill(); } });
        out.push({ y: 1e5 + a.y, f: () => g.drawImage(img, dx, dy) });
      } else if (a.kind === 'fish') {
        // keep the silhouette inside the water: never let it spill onto the beach
        const map = ctx.S.map, W = ctx.T.WATER, tx = tileOf(a.x), ty = tileOf(a.y);
        let fx2 = dx, fy2 = dy + 5;
        if (ctx.getG(map, tx - 1, ty) !== W) fx2 = Math.max(fx2, tx * TILE - cx);
        if (ctx.getG(map, tx + 1, ty) !== W) fx2 = Math.min(fx2, (tx + 1) * TILE - img.width - cx);
        if (ctx.getG(map, tx, ty - 1) !== W) fy2 = Math.max(fy2, ty * TILE - cy);
        if (ctx.getG(map, tx, ty + 1) !== W) fy2 = Math.min(fy2, (ty + 1) * TILE - img.height - cy);
        out.push({ y: a.y - 200, f: () => g.drawImage(img, fx2, fy2) });
      } else {
        out.push({ y: a.y, f: () => waterDraw(g, a.x, a.y, Math.round(a.x) - cx, Math.round(a.y) - cy, () => drawThirsty(g, img, dx, dy, a)) });   /* thú lội nước vẽ ngập; đang uống → cúi đầu (thirst.js) */
      }
    }
    // plan-9: đồ mang theo (tay / xô / lồng / xe) vẽ tập trung cho mọi module
    drawCarry(ctx, g, cx, cy, out);
    return out;
  },

  // particles + the bobber and line, in world space
  draw(g, ctx, cx, cy) {
    drawFx(g, cx, cy);
    if (!fishing || fishing.phase === 'done') return;
    const x = Math.round(fishing.bx) - cx, y = Math.round(fishing.by) - cy;
    const pull = fishing.phase === 'reel' ? (fishing.yank ? -2 : 1) : 0;
    const bob = fishing.phase === 'bite' ? Math.round(Math.sin(fishing.wob) * 2) : Math.round(Math.sin(fishing.wob) * 1) + pull;
    g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 1;
    g.beginPath(); g.ellipse(x, y + 2, 6, 2.5, 0, 0, TAU); g.stroke();
    g.strokeStyle = 'rgba(255,255,255,.25)'; g.beginPath(); g.ellipse(x, y + 2, 10, 4, 0, 0, TAU); g.stroke();
    const p = ctx.S.player;                                      // the line, from the player's hands
    g.strokeStyle = fishing.phase === 'reel' ? `rgba(255,${Math.round(240 - fishing.tens * 180)},${Math.round(255 - fishing.tens * 210)},.75)` : 'rgba(240,240,255,.45)';
    const ry = ctx.S.sea && ctx.S.sea.riding ? 21 : 13;   /* trên bè: tay cao hơn 8 px */
    g.beginPath(); g.moveTo(Math.round(p.x) - cx + (p.dir === 1 ? -5 : 5), Math.round(p.y) - ry - cy); g.lineTo(x, y + bob); g.stroke();
    const fa = fishUi(), bim = fa && fa.bobber ? fimg('bobber', fa.bobber) : null;
    if (bim && bim.complete && bim.naturalWidth) { const dip = fishing.phase === 'bite' ? 2 : 0; g.drawImage(bim, 0, 0, bim.naturalWidth, bim.naturalHeight, x - 4, y - 6 + bob + dip, 8, 8); }   /* phao PixelLab 8×8 logic; cắn câu thì chìm */
    else { g.fillStyle = '#1c1a24'; g.fillRect(x - 3, y - 4 + bob, 6, 7); g.fillStyle = '#e04b4b'; g.fillRect(x - 2, y - 3 + bob, 4, 3); g.fillStyle = '#ffffff'; g.fillRect(x - 2, y + bob, 4, 2); }
  },

  drawUI(ug, ctx, cx, cy, scale) {
    if (!fishing) return;
    const S = L(ctx), f = fishing, W = ug.canvas.width, H = ug.canvas.height;
    if (f.phase === 'done' && f.card) { ug.save(); drawFishCard(ug, ctx, f.card, W, H, scale); ug.restore(); return; }   /* thẻ cá thay cho bảng câu */
    ug.save();
    ug.textAlign = 'center'; ug.textBaseline = 'middle';
    const fs = Math.max(W < 600 ? 14 : 12, scale * 4);   /* điện thoại dọc: chữ to hơn chút cho dễ đọc */
    if (f.phase === 'wait' || f.phase === 'bite') {              // "…" then "!" over the bobber
      const bx = Math.round((f.bx - cx) * scale), by = Math.round((f.by - 22 - cy) * scale);
      const bite = f.phase === 'bite';
      ug.font = `bold ${fs * (bite ? 2 : 1.3)}px VT323, monospace`;
      const rr = Math.round(fs * (bite ? 1.1 : 0.9)); nine(ug, bx - rr, by - rr, rr * 2, rr * 2, Math.max(4, scale * 2));   /* ô giấy PixelLab */
      ug.fillStyle = bite ? '#c0392b' : '#3b2412';
      ug.fillText(bite ? S.bite : '…', bx, by + 2);
    }
    /* polish 2026-10-10: màn hẹp (điện thoại dọc ~390 px) → khung gần hết bề ngang; nhãn 'Độ căng' + gợi ý không đủ chỗ thì gợi ý xuống dòng riêng (thu chữ nếu vẫn dài);
       cảm ứng: khung nhấc lên trên nút A. Desktop (≥ 600 px) giữ y như cũ. */
    const pad = Math.max(8, scale * 3), narrow = W < 600;
    const bw = narrow ? Math.max(120, W - pad * 2 - 24) : Math.min(W * 0.62, 460), bh = Math.max(18, scale * 7), bx = (W - bw) / 2;
    const th = Math.max(6, scale * 2.2);                        /* tension meter height */
    const smallPx = Math.max(narrow ? 12 : 10, scale * 3), small = `${smallPx}px VT323, monospace`;
    const reelHint = keyHint(S.reelHint); let wrap = false, hintFont = small;
    if (f.phase === 'reel') { ug.font = small; const tw = ug.measureText(S.tension).width, hw = ug.measureText(reelHint).width; if (tw + hw + 16 > bw) { wrap = true; if (hw > bw) hintFont = `${Math.max(8, Math.floor(smallPx * bw / hw))}px VT323, monospace`; } }
    const extra = f.phase === 'reel' ? th + 6 + fs + (wrap ? fs * 0.9 : 0) : 0;   /* the reel panel is taller: bar + tension + labels */
    const by = H - (narrow && isTouchUI() ? 190 : Math.max(96, scale * 34)) - extra;
    nine(ug, bx - pad, by - fs * 2.2 - pad, bw + pad * 2, bh + fs * 3.4 + pad * 2 + extra, Math.max(8, scale * 3));   /* khung giấy PixelLab (ui/hud/box.png), không bo góc */
    ug.font = `bold ${fs}px VT323, monospace`;
    if (f.phase === 'done') {
      ug.fillStyle = f.ok ? '#2e7d32' : '#c0392b';
      ug.font = `bold ${fs * 1.5}px VT323, monospace`;
      ug.fillText(f.text, W / 2, by + bh / 2);
    } else if (f.phase === 'reel') {
      ug.fillStyle = '#3b2412'; ug.fillText(f.big ? S.reelBig : S.reelTitle, W / 2, by - fs * 0.6);
      ug.fillStyle = '#352022'; ug.fillRect(bx - 2, by - 2, bw + 4, bh + 4); ug.fillStyle = '#7a5634'; ug.fillRect(bx, by, bw, bh);
      const pw = bw * Math.max(0, Math.min(1, f.prog));
      ug.fillStyle = f.big ? '#ffb347' : '#4caa4f'; ug.fillRect(bx, by, Math.max(bh, pw), bh);
      const mx = bx + pw;                                        // progress marker
      ug.fillStyle = '#1c1a24'; ug.fillRect(mx - 3, by - 5, 6, bh + 10);
      ug.fillStyle = '#ffd45e'; ug.fillRect(mx - 2, by - 4, 4, bh + 8);
      // tension meter
      const ty = by + bh + 5;
      ug.fillStyle = '#352022'; ug.fillRect(bx - 2, ty - 2, bw + 4, th + 4); ug.fillStyle = '#7a5634'; ug.fillRect(bx, ty, bw, th);
      ug.fillStyle = f.tens > 0.66 ? '#ff4d4d' : f.tens > 0.33 ? '#ffb347' : '#6fb2e0';
      ug.fillRect(bx, ty, Math.max(2, bw * f.tens), th);
      ug.font = small; ug.fillStyle = '#7a5634'; ug.textAlign = 'left';
      ug.fillText(S.tension, bx, ty + th + fs * 0.7);
      if (wrap) { ug.font = hintFont; ug.textAlign = 'center'; ug.fillText(reelHint, W / 2, ty + th + fs * 1.6); }
      else { ug.textAlign = 'right'; ug.fillText(reelHint, bx + bw, ty + th + fs * 0.7); }
      ug.textAlign = 'center';
    } else {
      ug.fillStyle = '#3b2412'; ug.fillText(f.phase === 'bite' ? keyHint(S.biteHint) : S.waiting, W / 2, by - fs * 0.6);
      ug.font = small; ug.fillStyle = '#7a5634';
      ug.fillText(keyHint(S.castHint), W / 2, by + bh + fs * 0.9);
      ug.fillStyle = '#352022'; ug.fillRect(bx - 2, by - 2, bw + 4, bh + 4); ug.fillStyle = '#7a5634'; ug.fillRect(bx, by, bw, bh);
      if (f.phase === 'bite') { ug.fillStyle = '#ffd45e'; ug.fillRect(bx, by, Math.max(bh, bw * Math.max(0, f.t / 1.2)), bh); }
      else { const k = (Math.sin(f.wob * 2) + 1) / 2; ug.fillStyle = '#3d6db5'; ug.fillRect(bx + bw * 0.5 - bh, by, bh * 2 + bw * 0.06 * k, bh); }
    }
    ug.restore();
  },

  near(ctx) {
    if (fishing || ctx.S.map.sea) return null;       // sea fishing lives in sea_dive.js
    const S = L(ctx), p = ctx.S.player;
    let best = null, bd = Infinity;
    for (const a of list) {
      if (a.kind === 'fish' || a.stoneT) continue;   /* tượng đá (petgun) không bắt được */
      if (a.kind === 'bird' && a.st !== 'sit') continue;        // only a perched bird can be grabbed
      const d = Math.hypot(a.x - p.x, a.y - p.y - (a.kind === 'cow' ? 2 : 0));
      if (d < 26 && d < bd) { bd = d; best = a; }
    }
    if (best) return { label: S[best.kind], x: best.x, y: best.y, limit: 26, data: { animal: best } };
    const t = castTarget(ctx);
    if (!t) return null;
    if (!hasRod(ctx)) return { label: S.needRod, x: t.x, y: t.y, limit: 30, data: { hint: true } };
    if (!holdRod(ctx)) { const mt = ctx.mouseTile && ctx.mouseTile(), p = ctx.S.player;   /* có cần mà không cầm: chỉ khi TRỎ CHUỘT vào nước gần → click tự cầm cần câu */
      if (mt && ctx.needHold && isWaterT(ctx, mt.tx, mt.ty) && Math.hypot(mt.wx - p.x, mt.wy - p.y) < 56) return { label: ctx.needHold('rod'), x: mt.wx, y: mt.wy, limit: 60, mouse: true, cursor: 'tool', need: true, needId: 'rod', data: { need: true } };
      if (ctx.touchA && ctx.touchA() && ctx.needHold) return { label: ctx.needHold('rod'), x: t.x, y: t.y, limit: 30, mouse: false, cursor: 'tool', need: true, needId: 'rod', data: { need: true } };   /* điện thoại: đứng cạnh nước → nút A tự cầm cần câu */
      return null; }
    return { label: S.cast, x: t.x, y: t.y, limit: 30, data: { cast: t } };
  },

  interact(ctx, cand) {
    const d = cand && cand.data; if (!d) return;
    if (d.hint) { ctx.toast(L(ctx).needRod); return; }
    if (d.cast) { startCast(ctx, d.cast); return; }
    if (d.animal) catchLand(ctx, d.animal);
  }
};
