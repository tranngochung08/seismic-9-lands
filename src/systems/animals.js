// animals.js — wild animals: land animals are caught instantly and ride on your head,
// fish need a rod, live in a per-zone density field and fight back on the line. See systems/API.md.
import { mkCanvas, HOOK } from '../gfx.js';
import { ART } from '../art.js';

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
   qua HOOK.image('carry_<tool><tier>[_s|e|n]'). Ô: tay = đội đầu như cũ; lồng = đội đầu, thú ngồi trong, song lồng đè mờ; xô = cầm bên hông,
   cá ló đầu; xe = kéo sau lưng ngược hướng đi, bò/cừu ngồi trên thùng (thu 75 %). */
/* ---- plan-11: thú đi 4 hướng. set.dir = { s, e, n } do art.js gắn (mỗi hàng 4 khung [khung][lật]); face 's'|'e'|'n'|'w' từ hướng đi ---- */
export function faceOfV(vx, vy) { return Math.abs(vx) >= Math.abs(vy) ? (vx >= 0 ? 'e' : 'w') : (vy >= 0 ? 's' : 'n'); }
export function faceOf(a) { return faceOfV(Math.cos(a.ang), Math.sin(a.ang)); }
export function dirFrame(set0, face, ft, moving) {
  const d = set0 && set0.dir; if (!d) return null;
  const f = face || 'e';
  if ((f === 'e' || f === 'w') && !moving && set0.idle) return null;   /* đứng nghiêng: giữ clip idle nhìn ngang sẵn có */
  const row = f === 's' ? d.s : f === 'n' ? d.n : d.e; if (!row || !row.length) return null;
  const i = moving ? Math.floor(ft * 2) % row.length : 0;
  return row[i][f === 'w' ? 1 : 0];
}
export const HEAD_SPR = {};
export function registerHead(kind, set) { if (set) HEAD_SPR[kind] = set; return set; }
if (typeof window !== 'undefined') window.__carrySpr = HEAD_SPR;   /* móc test */
registerHead('cow', SPR.cow); registerHead('chicken', SPR.chicken); registerHead('bird', SPR.bird); registerHead('fish', HELD.fish); registerHead('fishBig', HELD.fishBig);
const sprOf = it => (it.kind === 'fish' && it.big ? HEAD_SPR.fishBig : HEAD_SPR[it.kind]) || null;
function contArt(w, h, fn) { const c = mkCanvas(w, h); fn(c.getContext('2d')); return c; }
const CONT_IMG = {};
for (let t = 1; t <= 3; t++) {
  const wood = ['', '#9c6b3a', '#8a8f9a', '#6b3fa0'][t], dark = ['', '#5a3a1e', '#4a4f5a', '#3a1f60'][t];
  CONT_IMG['bucket' + t] = HOOK.image('carry_bucket' + t, contArt(10, 10, g => { g.fillStyle = dark; g.fillRect(1, 2, 8, 8); g.fillStyle = wood; g.fillRect(2, 3, 6, 6); g.fillStyle = dark; g.fillRect(2, 0, 6, 1); g.fillRect(1, 1, 1, 2); g.fillRect(8, 1, 1, 2); }));
  CONT_IMG['cage' + t] = HOOK.image('carry_cage' + t, contArt(20, 16, g => { g.fillStyle = dark; g.fillRect(0, 0, 20, 2); g.fillRect(0, 14, 20, 2); for (let x = 0; x < 20; x += 4) g.fillRect(x, 0, 1, 16); g.fillRect(19, 0, 1, 16); g.fillStyle = wood; g.fillRect(1, 1, 18, 1); }));
  for (const d of ['s', 'e', 'n']) CONT_IMG[`cart${t}_${d}`] = HOOK.image(`carry_cart${t}_${d}`, contArt(32, 22, g => { g.fillStyle = dark; g.fillRect(2, 6, 28, 12); g.fillStyle = wood; g.fillRect(4, 8, 24, 8); g.fillStyle = '#222'; g.beginPath(); g.arc(8, 18, 3.5, 0, TAU); g.arc(24, 18, 3.5, 0, TAU); g.fill(); }));
}
function carrySlots(ctx) {   /* → [{ it, where: 'hand'|'bucket'|'cage'|'cart', i }] theo thứ tự bắt; đồ đựng đầy → tay (save cũ vượt mức chồng lên đầu) */
  const n = {}, out = []; let hand = 0;
  for (const raw of sysS(ctx).carry) {
    const it = normItem(raw), cat = catOf(it.kind), cap = capOf(ctx, cat), k = n[cat] || 0;
    if (CONT[cat].tool && k < cap) out.push({ it, where: CONT[cat].tool, i: k }); else out.push({ it, where: 'hand', i: hand++ });
    n[cat] = k + 1;
  }
  return out;
}
const clampT = (ctx, tool) => Math.min(3, Math.max(1, ctx.tool.tier(tool)));
export function drawCarry(ctx, g, cx, cy, out) {
  const p = ctx.S.player; if (p.custom && !ctx.S.sea) return;   /* thuyền/jeep/Rocky vẽ người chơi riêng; trên biển (bè/ván) vẫn vẽ */
  const slots = carrySlots(ctx); if (!slots.length) return;
  const t = ctx.S.time, flipI = p.dir === 1 ? 1 : 0, px = Math.round(p.x) - cx, py = Math.round(p.y) - cy;
  const frame = (set, i) => set[(((t * 3 + i * 0.7) | 0) % 2 + 2) % 2][flipI];
  const glow = (it, x, y, w, h) => { if (it.kind !== 'goldfish') return; g.globalAlpha = 0.35 + 0.25 * Math.sin(t * 5); g.fillStyle = '#ffd45e'; g.beginPath(); g.ellipse(x, y, w * 0.75, h * 0.8, 0, 0, TAU); g.fill(); g.globalAlpha = 1; };
  const by = slots.filter(s => s.where === 'bucket'), cg = slots.filter(s => s.where === 'cage'), ct = slots.filter(s => s.where === 'cart'), hd = slots.filter(s => s.where === 'hand');
  /* 2026-09-28 anh chê 'cồng kềnh' → gọn kiểu Stardew: trên đầu CHỈ con bế tay; lồng đeo hông (thu 0,6, phía đối diện xô); xe nhỏ 0,75 và bám sát lưng */
  if (hd.length) out.push({ y: p.y + 0.5, f: () => {
    const lift = (p.action && p.action.name === 'carry') ? -4 : 0;   /* clip bế: tay giơ ngang tai → hạ 4 px cho chạm tay */
    const top = py - 18 - lift;
    hd.forEach((s, i) => { const set = sprOf(s.it); if (!set) return; const im = frame(set, i), bob = Math.sin(t * 3.2 + i * 0.9) * 1.2, wig = Math.sin(t * 9 + i * 1.3) * 0.12;
      const yy = Math.round(top - i * 8 + bob); glow(s.it, px, yy - (im.height >> 1), im.width, im.height);
      g.save(); g.translate(px, yy); g.rotate(wig); g.drawImage(im, -(im.width >> 1), -im.height); g.restore(); });
  } });
  const SHOW_CAGE_CART = false;   /* 2026-09-28 anh: 'chỉ để lại xô cá, bỏ 2 thứ còn lại' — lồng/xe vẫn chứa thú, chỉ không vẽ */
  if (SHOW_CAGE_CART && cg.length) {
    const back = p.dir === 3;   /* quay lưng (bắc): lồng che trước người → vẽ sau người; còn lại vẽ trước */
    out.push({ y: p.y + (back ? 0.7 : -0.2), f: () => {
      const img = CONT_IMG['cage' + clampT(ctx, 'cage')], K = 0.6, cw = Math.round(img.width * K), ch = Math.round(img.height * K);
      const side = p.dir === 1 ? 1 : p.dir === 2 ? -1 : -1, x0 = px + side * 8 - (cw >> 1), y0 = py - 1 - ch;
      cg.forEach((s, j) => { const set = sprOf(s.it); if (!set) return; const im = frame(set, j), k = 0.5, w = Math.max(4, Math.round(im.width * k)), h = Math.max(3, Math.round(im.height * k));
        const ax = x0 + (cw >> 1) - (w >> 1) + ((j % 3) - 1) * 3, ay = y0 + ch - 2 - ((j / 3) | 0) * 2;
        g.save(); g.beginPath(); g.rect(x0, y0 - 2, cw, ch + 2); g.clip(); g.drawImage(im, Math.round(ax), Math.round(ay - h), w, h); g.restore(); });
      g.globalAlpha = 0.8; g.drawImage(img, x0, y0, cw, ch); g.globalAlpha = 1;
    } });
  }
  if (by.length) out.push({ y: p.y + 0.6, f: () => {
    const img = CONT_IMG['bucket' + clampT(ctx, 'bucket')], side = p.dir === 1 ? -1 : 1, bx = px + side * 9 - (img.width >> 1), b0 = py + 2 - img.height;
    by.forEach((s, j) => { const set = sprOf(s.it); if (!set) return; const im = frame(set, j), k = 0.5, w = Math.max(4, Math.round(im.width * k)), h = Math.max(3, Math.round(im.height * k));   /* cá thu nửa, ló đầu trên miệng xô */
      const fx = bx + (img.width >> 1) - (w >> 1) + ((j % 3) - 1) * 2, fy = b0 + 5 + ((j / 3) | 0) - Math.round(Math.sin(t * 4 + j) * 1);
      glow(s.it, fx + (w >> 1), fy - (h >> 1), w, h); g.drawImage(im, fx, fy - h, w, h); });
    g.drawImage(img, bx, b0); } });
  if (SHOW_CAGE_CART && ct.length) {
    const d = p.dir, key = d === 0 ? 's' : d === 3 ? 'n' : 'e', img = CONT_IMG[`cart${clampT(ctx, 'cart')}_${key}`];
    const off = d === 0 ? [0, -20] : d === 3 ? [0, 13] : d === 2 ? [-19, 0] : [19, 0], wob = p.moving ? Math.round(Math.sin(t * 8)) : 0, KC = 0.75;   /* xe nhỏ lại, bám sát lưng */
    const cxp = px + off[0], cyp = py + off[1] + wob;
    out.push({ y: p.y + off[1] + (d === 3 ? 1 : -0.5), f: () => {
      const iw = Math.round(img.width * KC), ih = Math.round(img.height * KC), x0 = cxp - (iw >> 1), y0 = cyp + 4 - ih;
      g.save(); if (d === 1) { g.translate(cxp * 2, 0); g.scale(-1, 1); } g.drawImage(img, x0, y0, iw, ih); g.restore();
      ct.forEach((s, j) => { const set = sprOf(s.it); if (!set) return; const im = frame(set, j), k = 0.55, w = Math.round(im.width * k), h = Math.round(im.height * k);
        const ax = cxp - (w >> 1) + (j - (ct.length - 1) / 2) * 5, ay = y0 + ih - 5 - (j % 2) * 2;
        g.drawImage(im, Math.round(ax), Math.round(ay - h), w, h); });
    } });
  }
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
  return !inPlot(map, tx, ty);
}
const isWater = (ctx, x, y) => ctx.getG(ctx.S.map, tileOf(x), tileOf(y)) === ctx.T.WATER;
const isWaterT = (ctx, tx, ty) => ctx.getG(ctx.S.map, tx, ty) === ctx.T.WATER;
const hasRod = ctx => !!(ctx.S.save.tools && ctx.S.save.tools.rod);

// ---------------------------------------------------------------- carry stack (on the player's head)
const MAX_CARRY = 3;   /* chỉ còn là mốc cũ cho save cũ; luật thật ở CAT/CONT bên dưới (plan-9) */
function sysS(ctx) {
  const sv = ctx.S.save; sv.sys = sv.sys || {};
  const s = (sv.sys.animals = sv.sys.animals || {});
  if (!Array.isArray(s.carry)) s.carry = [];
  return s;
}
/* ---- plan-9: tay không mang 1 con; mang thêm phải có đồ đựng đúng loại, nâng cấp để chứa nhiều hơn ----
   Loại: fish (xô) · small (lồng) · large (xe chở) · loot (đồ lặn, không có đồ đựng, 2 + tay).
   Ô tay = 1 thứ bất kỳ không nằm vừa đồ đựng. Save cũ vượt mức: giữ nguyên, chỉ chặn bắt thêm. */
export const CAT = { fish: 'fish', goldfish: 'fish', squid: 'fish', sala: 'fish',
  chicken: 'small', bird: 'small', rabbit: 'small', crab: 'small', bat: 'small', moth: 'small',
  cow: 'large', sheep: 'large' };
export const CONT = { fish: { tool: 'bucket', cap: [0, 3, 5, 8] }, small: { tool: 'cage', cap: [0, 3, 5, 8] }, large: { tool: 'cart', cap: [0, 2, 4, 6] }, loot: { tool: null, cap: [2] } };
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
const UPG = {
  bucket: { 1: { vi: 'Xô I ở Bàn mộc (3 gỗ + 1 nhựa thông)', en: 'Bucket I at the workbench (3 wood + 1 resin)' }, 2: { vi: 'Xô sắt II ở Lò nung M4/M5 (2 thanh sắt)', en: 'Iron bucket II at the furnace in M4/M5 (2 iron bars)' }, 3: { vi: 'Xô tinh thể III ở Bàn thờ tinh thể M9 (1 tinh thể + 2 sắt)', en: 'Crystal bucket III at the crystal altar in M9 (1 crystal + 2 iron)' } },
  cage: { 1: { vi: 'Lồng I ở Bàn mộc (4 gỗ + 2 dây thừng)', en: 'Cage I at the workbench (4 wood + 2 rope)' }, 2: { vi: 'Lồng sắt II ở Lò nung M4/M5 (3 sắt + 2 dây)', en: 'Iron cage II at the furnace in M4/M5 (3 iron + 2 rope)' }, 3: { vi: 'Lồng obsidian III ở Lò rèn M7/M8 (2 obsidian + 2 sắt)', en: 'Obsidian cage III at the forge in M7/M8 (2 obsidian + 2 iron)' } },
  cart: { 1: { vi: 'Xe chở vật nuôi I ở Bàn mộc (8 gỗ + 3 dây thừng)', en: 'Livestock cart I at the workbench (8 wood + 3 rope)' }, 2: { vi: 'Xe bánh sắt II ở Lò nung M4/M5 (3 sắt + 4 gỗ)', en: 'Iron-wheel cart II at the furnace in M4/M5 (3 iron + 4 wood)' }, 3: { vi: 'Xe obsidian III ở Lò rèn M7/M8 (3 obsidian + 2 sắt)', en: 'Obsidian cart III at the forge in M7/M8 (3 obsidian + 2 iron)' } },
};
const ANIMAL_VI = { fish: 'cá', small: 'thú nhỏ', large: 'bò/cừu', loot: 'đồ lặn' }, ANIMAL_EN = { fish: 'fish', small: 'small animals', large: 'cows/sheep', loot: 'dive finds' };
export function carryDeny(ctx, kind) {
  const vi = ctx.lang && ctx.lang() === 'vi', cat = catOf(kind), c = CONT[cat], tier = c.tool ? ctx.tool.tier(c.tool) : 0;
  const name = c.tool ? ctx.itemName(c.tool) : '', maxT = c.tool ? c.cap.length - 1 : 0, an = vi ? ANIMAL_VI[cat] : ANIMAL_EN[cat];
  if (!c.tool) return vi ? `Tay đang bận — chỉ mang được 2 ${an} + 1 trên tay. Bán ở Thương nhân Làng rồi quay lại` : `Hands busy — only 2 ${an} + 1 in hand. Sell at the village trader and come back`;
  const next = UPG[c.tool][tier + 1], nx = next ? (vi ? next.vi : next.en) : '';
  if (tier < 1) return vi ? `Tay đang bận — muốn mang thêm ${an}, hãy chế ${nx}` : `Hands busy — to carry more ${an}, craft ${nx}`;
  if (tier < maxT) return vi ? `${name} đầy (${c.cap[tier]} ${an}) — nâng cấp: ${nx}` : `${name} is full (${c.cap[tier]} ${an}) — upgrade: ${nx}`;
  return vi ? `${name} đã đầy mức tối đa (${c.cap[tier]} ${an}) — bán ở Thương nhân Làng rồi quay lại` : `${name} is at max (${c.cap[tier]} ${an}) — sell at the village trader and come back`;
}
// carry entries may be plain kinds ('cow') or objects ({kind:'fish', big:true}) — normalise on read
const normItem = it => (typeof it === 'string' ? { kind: it, big: false } : { kind: (it && it.kind) || 'fish', big: !!(it && it.big) });
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
function addCarry(ctx, item) {
  const c = sysS(ctx).carry;
  if (!canCarry(ctx, normItem(item).kind)) return false;
  c.push(item); syncInv(ctx); ctx.persist(); return true;
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
function fishUi() { const f = ART.on && ART.man && ART.man.ui && ART.man.ui.fish; return f || null; }
function startCast(ctx, t) {
  const S = L(ctx);
  if (!canCarry(ctx, 'fish')) { ctx.toast(carryDeny(ctx, 'fish')); return; }
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
function startReel(ctx) {
  const d = fishing.dens;
  fishing.big = Math.random() < 0.15 + d * 0.45;                 // crowded water → better odds of a big one
  { const pl = ctx.S.player; if (pl.act && pl.hasAct('reel')) pl.act('reel', 0.6); }   /* giật kéo cá */
  fishing.phase = 'reel'; fishing.prog = 0.28; fishing.tens = 0; fishing.presses = []; fishing.life = 30;
  // the fish pulls back 0.05..0.11 of the bar per second, scaled by its size
  fishing.pull = fishing.big ? 0.085 + Math.random() * 0.025 : 0.05 + Math.random() * 0.03;
  splash(fishing.bx, fishing.by, 0.9);
}
function endFish(ctx) { fishing = null; if (ctx.S.player.endAct) ctx.S.player.endAct('fish'); if (ctx.S.mode === 'fish') ctx.setMode('play'); }
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
  const ok = addCarry(ctx, { kind: 'fish', big: !!fishing.big });
  ctx.toast(ok ? (fishing.big ? S.gotBigFish : S.gotFish) : carryDeny(ctx, 'fish')); if (ok && ctx.pop) ctx.pop(ctx.S.player.x, ctx.S.player.y - 18, '+1 🐟');
  const sp = pickFish(!!fishing.big), cm = Math.round(sp.cm[0] + (sp.cm[1] - sp.cm[0]) * Math.pow(Math.random(), fishing.big ? 0.7 : 1.4));
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
  ug.textAlign = 'center'; ug.font = F(5.5); const hint = vi ? 'E · đóng' : 'E · close', hw = ug.measureText(hint).width + U(8);
  ug.fillStyle = 'rgba(13,11,20,.7)'; ug.fillRect(x0 + cw / 2 - hw / 2, Y(91), hw, U(8)); ug.fillStyle = '#f5e6c4'; ug.fillText(hint, x0 + cw / 2, Y(92));
}

// ---------------------------------------------------------------- system
export const animals = {
  id: 'animals',

  onZoneEnter(ctx) {
    list = []; fx = []; fishing = null; splashT = 0.6;
    if (ctx.S.mode === 'fish' || ctx.S.mode === 'catch') ctx.setMode('play');
    ctx.onAction('fish', () => fishAction(ctx));     // E / Space / Enter / touch A while reeling
    ctx.registerCloser('fish', () => { fishing = null; ctx.setMode('play'); });
    syncInv(ctx);                                    // the HUD line always mirrors what is on your head
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
      list: () => list.map(a => ({ kind: a.kind, x: Math.round(a.x), y: Math.round(a.y), st: a.st })),
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
    list = []; fx = []; dens = null; spots = []; waterTiles = [];
  },

  update(dt, ctx) {
    const p = ctx.S.player, playing = ctx.S.mode === 'play';
    // bế thú: có gì trên đầu → clip 'carry' (hai tay giơ đỡ, chân theo bước); hết → trả về (không đè động tác khác đang chạy)
    if (p.act) { const carrying = !p.custom && carrySlots(ctx).some(s => s.where === 'hand');   /* chỉ khi bế tay trên đầu; lồng đã đeo hông (2026-09-28), xô/xe không giơ tay */ if (carrying && p.hasAct('carry') && (!p.action || p.action.name === 'carry')) p.act('carry', 1, true, true); else if (!carrying && p.action && p.action.name === 'carry') p.endAct('carry'); }
    for (const a of list) {
      if (a.kind === 'bird') updateBird(dt, ctx, a, p, playing);
      else if (a.kind === 'fish') updateFish(dt, ctx, a);
      else {
        // land animals bolt if you barge into them; catching itself is instant, so no sneaking bar any more
        if (playing && Math.hypot(a.x - p.x, a.y - p.y) < 13 && a.st !== 'flee') fleeFrom(a, p);
        updateLand(dt, ctx, a, p, playing);
      }
    }
    hotSplashes(dt, ctx);
    updateFx(dt);
    if (fishing) updateFishing(dt, ctx);
  },

  drawables(ctx, cx, cy) {
    if (ctx.S.map.sea) return [];                    // sea_dive.js draws the head stack at sea
    const out = [], g = ctx.g, VW = ctx.VW, VH = ctx.VH;
    for (const a of list) {
      const sx = a.x - cx, sy = a.y - cy;
      if (sx < -40 || sy < -60 || sx > VW + 40 || sy > VH + 40) continue;
      const set0 = SPR[a.kind], set = (a.st === 'idle' && set0.idle) ? set0.idle : set0;   // art.js gắn clip idle (gặm/thở) nếu gói có
      const img = dirFrame(set0, a.face, a.ft, a.st !== 'idle') || set[a.fr % set.length][a.dir < 0 ? 1 : 0];   /* plan-11: hàng theo hướng nếu có */
      const dx = Math.round(a.x) - (img.width >> 1) - cx;
      const dy = Math.round(a.y - (a.z || 0)) - img.height - cy;
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
        out.push({ y: a.y, f: () => g.drawImage(img, dx, dy) });
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
    g.beginPath(); g.moveTo(Math.round(p.x) - cx + (p.dir === 1 ? -5 : 5), Math.round(p.y) - 13 - cy); g.lineTo(x, y + bob); g.stroke();
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
    const fs = Math.max(12, scale * 4);
    if (f.phase === 'wait' || f.phase === 'bite') {              // "…" then "!" over the bobber
      const bx = Math.round((f.bx - cx) * scale), by = Math.round((f.by - 22 - cy) * scale);
      const bite = f.phase === 'bite';
      ug.font = `bold ${fs * (bite ? 2 : 1.3)}px "Segoe UI",system-ui,sans-serif`;
      ug.fillStyle = 'rgba(13,11,20,.65)'; ug.beginPath(); ug.arc(bx, by, fs * (bite ? 1.1 : 0.9), 0, TAU); ug.fill();
      ug.fillStyle = bite ? '#ffd45e' : '#cfd8e6';
      ug.fillText(bite ? S.bite : '…', bx, by + 2);
    }
    const bw = Math.min(W * 0.62, 460), bh = Math.max(18, scale * 7), bx = (W - bw) / 2;
    const th = Math.max(6, scale * 2.2);                        // tension meter height
    const extra = f.phase === 'reel' ? th + 6 + fs : 0;         // the reel panel is taller: bar + tension + labels
    const by = H - Math.max(96, scale * 34) - extra;
    const pad = Math.max(8, scale * 3);
    ug.fillStyle = 'rgba(13,11,20,.82)';
    ug.beginPath(); ug.roundRect(bx - pad, by - fs * 2.2 - pad, bw + pad * 2, bh + fs * 3.4 + pad * 2 + extra, 10); ug.fill();
    ug.strokeStyle = 'rgba(255,212,94,.35)'; ug.lineWidth = 2; ug.stroke();
    ug.font = `bold ${fs}px "Segoe UI",system-ui,sans-serif`;
    const small = `${Math.max(10, scale * 3)}px "Segoe UI",system-ui,sans-serif`;
    if (f.phase === 'done') {
      ug.fillStyle = f.ok ? '#8fe08a' : '#ff8c8c';
      ug.font = `bold ${fs * 1.5}px "Segoe UI",system-ui,sans-serif`;
      ug.fillText(f.text, W / 2, by + bh / 2);
    } else if (f.phase === 'reel') {
      ug.fillStyle = '#f2ebe0'; ug.fillText(f.big ? S.reelBig : S.reelTitle, W / 2, by - fs * 0.6);
      ug.fillStyle = '#2b2440'; ug.beginPath(); ug.roundRect(bx, by, bw, bh, bh / 2); ug.fill();
      const pw = bw * Math.max(0, Math.min(1, f.prog));
      ug.fillStyle = f.big ? '#ffb347' : '#4caa4f'; ug.beginPath(); ug.roundRect(bx, by, Math.max(bh, pw), bh, bh / 2); ug.fill();
      const mx = bx + pw;                                        // progress marker
      ug.fillStyle = '#1c1a24'; ug.fillRect(mx - 3, by - 5, 6, bh + 10);
      ug.fillStyle = '#ffd45e'; ug.fillRect(mx - 2, by - 4, 4, bh + 8);
      // tension meter
      const ty = by + bh + 5;
      ug.fillStyle = '#2b2440'; ug.beginPath(); ug.roundRect(bx, ty, bw, th, th / 2); ug.fill();
      ug.fillStyle = f.tens > 0.66 ? '#ff4d4d' : f.tens > 0.33 ? '#ffb347' : '#6fb2e0';
      ug.beginPath(); ug.roundRect(bx, ty, Math.max(2, bw * f.tens), th, th / 2); ug.fill();
      ug.font = small; ug.fillStyle = '#a79a86'; ug.textAlign = 'left';
      ug.fillText(S.tension, bx, ty + th + fs * 0.7);
      ug.textAlign = 'right'; ug.fillText(S.reelHint, bx + bw, ty + th + fs * 0.7);
      ug.textAlign = 'center';
    } else {
      ug.fillStyle = '#f2ebe0'; ug.fillText(f.phase === 'bite' ? S.biteHint : S.waiting, W / 2, by - fs * 0.6);
      ug.font = small; ug.fillStyle = '#a79a86';
      ug.fillText(S.castHint, W / 2, by + bh + fs * 0.9);
      ug.fillStyle = '#2b2440'; ug.beginPath(); ug.roundRect(bx, by, bw, bh, bh / 2); ug.fill();
      if (f.phase === 'bite') { ug.fillStyle = '#ffd45e'; ug.beginPath(); ug.roundRect(bx, by, Math.max(bh, bw * Math.max(0, f.t / 1.2)), bh, bh / 2); ug.fill(); }
      else { const k = (Math.sin(f.wob * 2) + 1) / 2; ug.fillStyle = '#3d6db5'; ug.beginPath(); ug.roundRect(bx + bw * 0.5 - bh, by, bh * 2 + bw * 0.06 * k, bh, bh / 2); ug.fill(); }
    }
    ug.restore();
  },

  near(ctx) {
    if (fishing || ctx.S.map.sea) return null;       // sea fishing lives in sea_dive.js
    const S = L(ctx), p = ctx.S.player;
    let best = null, bd = Infinity;
    for (const a of list) {
      if (a.kind === 'fish') continue;
      if (a.kind === 'bird' && a.st !== 'sit') continue;        // only a perched bird can be grabbed
      const d = Math.hypot(a.x - p.x, a.y - p.y - (a.kind === 'cow' ? 2 : 0));
      if (d < 26 && d < bd) { bd = d; best = a; }
    }
    if (best) return { label: S[best.kind], x: best.x, y: best.y, limit: 26, data: { animal: best } };
    const t = castTarget(ctx);
    if (!t) return null;
    if (!hasRod(ctx)) return { label: S.needRod, x: t.x, y: t.y, limit: 30, data: { hint: true } };
    return { label: S.cast, x: t.x, y: t.y, limit: 30, data: { cast: t } };
  },

  interact(ctx, cand) {
    const d = cand && cand.data; if (!d) return;
    if (d.hint) { ctx.toast(L(ctx).needRod); return; }
    if (d.cast) { startCast(ctx, d.cast); return; }
    if (d.animal) catchLand(ctx, d.animal);
  }
};
