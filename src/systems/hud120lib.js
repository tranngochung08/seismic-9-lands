/* hud120lib.js — c65-hud (plan-120 đợt 1+2): hàm vẽ dùng chung cho edgearrow120 / zonebanner120 / questbanner120 / news120.
   Chỉ dùng ảnh PixelLab có sẵn trong assets/px/ui (khung tframe, dlg_plate, ruy băng npick/banner, mũi tên target_arrow, icon items). */
import { ART } from '../art.js';

const IM = {};
/* ảnh theo đường dẫn tương đối assets/px/... — trả null khi chưa tải xong (lần sau gọi lại) */
export function img(rel) {
  if (!rel) return null;
  let i = IM[rel];
  if (!i) { if (typeof Image === 'undefined') return null; i = IM[rel] = new Image(); i.src = 'assets/px/' + rel; }
  return i.complete && i.naturalWidth ? i : null;
}
export function man() { return (ART && ART.man) || null; }
/* đường dẫn ảnh icon món đồ (manifest ui.items) hoặc null */
export function itemRel(id) { const m = man(), it = m && m.ui && m.ui.items; return (it && it[id]) || null; }
/* cỡ UI: như village88 / quests (__u89 = tỉ lệ trước khi lùi camera) */
export function uiS(ctx, scale) { const u = globalThis.__u89 ? globalThis.__u89(scale) : (ctx.scaleUI || scale); return Math.max(2, Math.round(u)); }
export const isVi = ctx => !ctx.lang || ctx.lang() !== 'en';

/* 9 mảnh: ảnh im, góc c px nguồn, vẽ vào (x,y,w,h) với góc k px đích */
export function nine(g, im, c, x, y, w, h, k) {
  const sw = im.width, sh = im.height; k = Math.max(1, Math.round(k));
  x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
  const mw = Math.max(0, w - 2 * k), mh = Math.max(0, h - 2 * k);
  g.drawImage(im, 0, 0, c, c, x, y, k, k); g.drawImage(im, c, 0, sw - 2 * c, c, x + k, y, mw, k); g.drawImage(im, sw - c, 0, c, c, x + w - k, y, k, k);
  g.drawImage(im, 0, c, c, sh - 2 * c, x, y + k, k, mh); g.drawImage(im, c, c, sw - 2 * c, sh - 2 * c, x + k, y + k, mw, mh); g.drawImage(im, sw - c, c, c, sh - 2 * c, x + w - k, y + k, k, mh);
  g.drawImage(im, 0, sh - c, c, c, x, y + h - k, k, k); g.drawImage(im, c, sh - c, sw - 2 * c, c, x + k, y + h - k, mw, k); g.drawImage(im, sw - c, sh - c, c, c, x + w - k, y + h - k, k, k);
}
/* 3 mảnh ngang (giữ tỉ lệ cao): ảnh im, mép c px nguồn */
export function three(g, im, c, x, y, w, h) {
  const k = c * h / im.height; x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
  g.drawImage(im, 0, 0, c, im.height, x, y, Math.round(k), h);
  g.drawImage(im, c, 0, im.width - 2 * c, im.height, x + Math.round(k), y, w - 2 * Math.round(k), h);
  g.drawImage(im, im.width - c, 0, c, im.height, x + w - Math.round(k), y, Math.round(k), h);
}
/* khung giấy gỗ (hud91/tframe.png 62×32, góc 8) — dùng cho nhãn nhỏ / thân banner */
export function paper(g, x, y, w, h, s) {
  const im = img('ui/hud91/tframe.png');
  if (im) nine(g, im, 8, x, y, w, h, Math.max(6, Math.round(s * 2.4)));
  else { g.fillStyle = '#3b2412'; g.fillRect(x, y, w, h); g.fillStyle = '#ecd6aa'; g.fillRect(x + 3, y + 3, w - 6, h - 6); }
}
/* tấm ván (dlg_plate.png 96×32, mép 14) — như băng tên vùng con của village88 */
export function plank(g, x, y, w, h) {
  const im = img('ui/dlg_plate.png');
  if (im) three(g, im, 14, x, y, w, h); else { g.fillStyle = '#b7834a'; g.fillRect(x, y, w, h); }
}
/* chữ có bóng 1 px */
export function sh(g, txt, x, y, col, font, shCol) {
  g.font = font; g.fillStyle = shCol || '#2a1a10'; g.fillText(txt, x + 1, y + 1); g.fillStyle = col; g.fillText(txt, x, y);
}
/* chữ viền tối 4 phía + bóng (đọc rõ trên ván gỗ sáng) */
export function ol(g, txt, x, y, col, font, olCol) {
  const k = font.match(/(\d+)px/), w = k && +k[1] >= 20 ? 2 : 1;
  g.font = font; g.fillStyle = olCol || '#2a1a10';
  for (const [dx, dy] of [[-w, 0], [w, 0], [0, -w], [0, w], [w, w]]) g.fillText(txt, x + dx, y + dy);
  g.fillStyle = col; g.fillText(txt, x, y);
}
/* đỉnh khung mục tiêu target91 (DOM #tf91) theo px canvas UI — banner giữa trên tránh chồng */
export function tfBottom(H) {
  if (typeof document === 'undefined') return 0;
  const e = document.getElementById('tf91'); if (!e || e.hidden) return 0;
  const r = e.getBoundingClientRect(); if (!r.height || r.top > innerHeight / 2) return 0;
  return Math.round(r.bottom * H / innerHeight);
}
/* mép trên cho banner giữa trên: dưới khung mục tiêu; điện thoại dọc (H > W) → xuống dưới cụm nút / đồng hồ DOM góc trên (~20 % cao) */
export function bannerTop(W, H, s) {
  let t = Math.max(Math.round(10 * s), tfBottom(H) + Math.round(4 * s));
  if (H > W) t = Math.max(t, Math.round(H * 0.2));
  return t;
}
