// staff.js — plan-22 (2026-10-10, anh yêu cầu): quầy hàng và nhà trang trí xấu, sai tỉ lệ → thay bằng NPC PixelLab.
//  · Quầy Thương nhân / Buôn tranh / chợ trang phục: quầy thành 'ghost' (không vẽ, không chắn đường) nhưng vẫn là điểm tương tác cũ
//    → mọi hệ (market, trees, shop) chạy y như trước; người bán (NPC đứng yên) đứng đúng chỗ quầy.
//  · Nhà trang trí (house_r/b/g/y): bỏ hẳn; cứ 2 nhà đặt 1 dân làng đi lại quanh đó, thỉnh thoảng chào khi người chơi tới gần.
// NPC nằm trong S.staff (không phải S.npcs) → không bị quái săn, không lẫn vào danh sách nghệ sĩ / nhiệm vụ.
import { NPC } from './entities.js';
import { charSheet } from './gfx.js';
import { O } from './gfx.js';
import { setSolid } from './world.js';

const TS = 16;
const VILL = ['v_farmer', 'v_baker', 'v_fisher', 'v_kid'];
const HELLO = {
  vi: ['Chào bạn!', 'Hôm nay trời đẹp ghê.', 'Ghé chợ chưa?', 'Cẩn thận quái ban đêm nhé!', 'Đất lại rung kìa…'],
  en: ['Hello there!', 'Lovely day, isn\'t it?', 'Been to the market yet?', 'Mind the monsters at night!', 'Did the ground just shake…?'],
};
let ctxRef = null;
const sheetOf = key => charSheet({ skin: '#f6d3b5', hair: '#2b1d14', shirt: '#ffffff', pants: '#2f3b5e', hero: key });

function unsolid(map, o) { const d = O[o.type]; if (d && d.solid) for (let j = 0; j < d.fh; j++) for (let i = 0; i < d.fw; i++) setSolid(map, o.x + i, o.y + j, 0); }
function seller(S, o, key) {
  o.ghost = true; unsolid(S.map, o);
  const n = new NPC({ staff: key, n: '' }, o.x * TS + 16, o.y * TS + 24, sheetOf(key), () => 0.5);
  n.radius = 0; n.dir = 0; n.staffStill = true; n.busy = true; return n;   /* busy = đứng yên tại quầy */
}
export function setupStaff(S, ctx) {
  ctxRef = ctx; S.staff = []; const map = S.map; if (!map) return;
  const objs = map.objects;
  let tailor = false;
  for (const o of objs.slice()) {
    if (o.type === 'stall' && o.trader) S.staff.push(seller(S, o, 'trader'));
    else if (o.type === 'stall' && o.dealer) S.staff.push(seller(S, o, 'dealer'));
    else if (o.type === 'stall' && o.shop) {
      if (!tailor) { S.staff.push(seller(S, o, 'tailor')); tailor = true; }
      else { unsolid(map, o); objs.splice(objs.indexOf(o), 1); }   /* chợ trang phục 3 quầy → 1 thợ may */
    }
  }
  let k = 0;
  for (const o of objs.slice()) {
    if (!/^house_[rbgy]$/.test(o.type)) continue;
    unsolid(map, o); objs.splice(objs.indexOf(o), 1);
    if (k++ % 2 || (S.zone && S.zone.id === 'sea')) continue;   /* đảo ông lão ngoài biển: ông lão đã là NPC, chỉ bỏ nhà */
    const key = VILL[(k >> 1) % VILL.length], d = O[o.type] || { fw: 3, fh: 3 };
    const n = new NPC({ staff: key, n: '' }, (o.x + d.fw / 2) * TS, (o.y + d.fh) * TS + 10, sheetOf(key), mulberry(o.x * 31 + o.y));
    n.radius = 40; n.helloT = 2 + (k % 5); S.staff.push(n);
  }
}
function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
/* người bán quay mặt về người chơi khi tới gần; dân làng chào bằng bong bóng */
export function tickStaff(S, dt) {
  if (!S.staff || !S.player || !ctxRef) return;
  const p = S.player, vi = ctxRef.lang() === 'vi';
  for (const n of S.staff) {
    const d = Math.hypot(n.x - p.x, n.y - p.y);
    if (n.staffStill) { if (d < 48) n.faceTo(p.x, p.y); else n.dir = 0; continue; }
    if (n.helloT != null) { n.helloT -= dt; if (d < 30 && n.helloT <= 0) { const L = HELLO[vi ? 'vi' : 'en']; ctxRef.bubble(n, L[Math.floor(Math.random() * L.length)], 2.5); n.helloT = 14; } }
  }
}
/* bảng tên pixel trên đầu người bán (thay biển của quầy cũ) */
const TITLE = { trader: ['Thương nhân', 'Trader'], dealer: ['Nhà buôn tranh', 'Art dealer'], tailor: ['Thợ may', 'Tailor'] };
export function drawStaffTags(ug, S, cx, cy, scale) {
  if (!S.staff || !ctxRef) return; const vi = ctxRef.lang() === 'vi';
  const fs = Math.max(12, Math.round(scale * 4.2)); ug.save(); ug.font = `${fs}px VT323, monospace`; ug.textAlign = 'center'; ug.textBaseline = 'middle';
  for (const n of S.staff) {
    const tt = TITLE[n.m.staff] || (n.m.tag ? [n.m.tag, n.m.tag] : null); if (!tt) continue;   /* plan-25: Leader khu */
    const sx = Math.round((n.x - cx) * scale), sy = Math.round((n.y - 30 - cy) * scale), txt = tt[vi ? 0 : 1], w = Math.ceil(ug.measureText(txt).width) + 10, h = fs + 4;
    if (sx < -100 || sy < -40 || sx > ug.canvas.width + 100 || sy > ug.canvas.height + 40) continue;
    ug.fillStyle = '#352022'; ug.fillRect(sx - w / 2 - 2, sy - h / 2 - 2, w + 4, h + 4); ug.fillStyle = '#7a4a2a'; ug.fillRect(sx - w / 2, sy - h / 2, w, h);
    ug.fillStyle = '#ffd45e'; ug.fillText(txt, sx, sy + 1);
  }
  ug.restore();
}
