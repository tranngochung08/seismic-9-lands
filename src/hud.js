// hud.js — plan-22: HUD kiểu Stardew, TOÀN PIXEL (anh chốt 2026-10-10).
//  · Góc trên phải: khung đồng hồ PixelLab (mùa · ngày / giờ) + ô đá Seismic + hàng icon trạng thái (thay dòng HUD dài).
//  · Góc dưới phải: thanh máu dọc + thanh kinh nghiệm + số cấp.
//  · Góc dưới trái: thông báo nhỏ (tự gộp "+N món", tối đa 4, mờ sau 3 s). Việc lớn → băng ngang giữa màn 2,2 s.
//  · Nhãn hành động: cạnh con trỏ (chuột) hoặc ngay trên vật (phím/chạm) — thay thanh "E · …".
//  · pxText(): emoji → icon PixelLab (ui/items); emoji chưa có ảnh thì bỏ (không để emoji lẫn vào giao diện pixel).
import { ITEMS, TOOLS } from './items.js';

let deps = null, root = null, notes = [], bannerT = 0, sig = {};
const EMO = /\p{Extended_Pictographic}️?(‍\p{Extended_Pictographic}️?)*/gu;
let ICON = null;   /* emoji → đường dẫn ảnh */
function iconMap() {
  if (ICON) return ICON;
  ICON = new Map(); const items = (deps.ART.man && deps.ART.man.ui && deps.ART.man.ui.items) || {};
  const put = (emo, id) => { if (emo && items[id] && !ICON.has(emo)) ICON.set(emo, 'assets/px/' + items[id]); };
  put('🪨', 'stone'); put('⚔', 'sword_t1'); put('🕯', 'revive'); put('✨', 'soul');
  /* biểu tượng trạng thái → icon đồ PixelLab gần nghĩa nhất */
  for (const [e, id] of [['⛽', 'charcoal'], ['🥚', 'egg'], ['🫧', 'pearl'], ['🪵', 'wood'], ['🐾', 'meat'], ['🏊', 'fish'], ['⛵', 'sailcloth'], ['🛶', 'plank'], ['🦑', 'squid'], ['🏁', 'flower'], ['🐋', 'fish'], ['🎈', 'rope'], ['🛠', 'pickaxe'], ['👷', 'axe'], ['📜', 'trenchmap'], ['🐎', 'saddle'], ['🦊', 'fur'], ['🐰', 'rabbit'], ['🐏', 'sheep'], ['🖼', 'bottle'],
    /* dòng chỉ số thẻ Nhân vật (plan-22 B4) */
    ['🏃', 'st_boots'], ['🚶', 'st_boots'], ['🎿', 'wax'], ['🛞', 'fl_tires'], ['🛡', 'fl_armor'], ['🧥', 'fl_coat'], ['🏮', 'fl_lamps'], ['⚡', 'fl_charged'], ['⭐', 'st_medal'], ['🏅', 'st_medal'], ['🗿', 'st_rocky'], ['🌑', 'st_dark'], ['🫧', 'st_breath'], ['🧣', 'fl_cape']]) put(e, id);
  const tb = (deps.ART.man && deps.ART.man.ui && deps.ART.man.ui.tabs) || {}; if (tb.bag) ICON.set('🎒', 'assets/px/' + tb.bag); if (tb.hero) ICON.set('☺', 'assets/px/' + tb.hero);
  for (const [id, d] of Object.entries({ ...TOOLS, ...ITEMS })) put(d.icon, id);
  return ICON;
}
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
/* polish 2026-10-10: gợi ý phím theo thiết bị. Màn cảm ứng (pointer:coarse, hoặc vừa chạm) → E/Space/Enter = Ⓐ (nút A), Esc = ☰ (nút menu).
   Desktop (hoặc vừa bấm phím thật / dùng chuột) → giữ nguyên chữ. keyHint nhận 1 phím ('E', 'Esc') hoặc cả câu gợi ý ('Esc · thu cần'). */
let lastInput = null;
if (typeof window !== 'undefined') {
  window.addEventListener('pointerdown', e => { if (e.pointerType === 'touch') lastInput = 'touch'; else if (e.pointerType === 'mouse') lastInput = 'key'; }, { capture: true, passive: true });
  window.addEventListener('keydown', e => { if (e.isTrusted) lastInput = 'key'; }, { capture: true, passive: true });   /* phím ảo của nút cảm ứng (isTrusted=false) không tính */
}
export function isTouchUI() { if (lastInput) return lastInput === 'touch'; try { return matchMedia('(pointer:coarse)').matches; } catch (e) { return false; } }
export function keyHint(s) {
  if (!s || !isTouchUI()) return s;
  return String(s).replace(/E \/ Space(?: \/ (?:A|Enter))?|\bEsc\b|\bSpace\b|\bEnter\b|(^|\s)E(?=\s*[·:]|$)/g, (m, pre) => m === 'Esc' ? '☰' : (pre || '') + 'Ⓐ');
}
export function pxText(s) {   /* chuỗi có emoji → HTML với icon pixel */
  const m = iconMap();
  return esc(s).replace(EMO, e => { const k = e.replace(/️/g, ''); const src = m.get(e) || m.get(k); return src ? `<img class="pxi" src="${src}" alt="">` : KEEP.has(k) ? k : ''; }).replace(/\s{2,}/g, ' ').trim();
}
const KEEP = new Set(['♥', '♡', '★', '☆', '✔', '✖', '▶', '◀', '▲', '▼', '●', '○', '◆', '◇', '♪', '☀', '☁', '⚠']);   /* ký hiệu đơn giản: giữ dạng chữ */
/* ---- plan-22 B3: mọi bảng / hộp thoại → emoji thành icon pixel + nút ✕ pixel góc phải (tự gắn lại khi bảng vẽ lại) ---- */
const hasEmo = str => (String(str).match(EMO) || []).some(e => !KEEP.has(e.replace(/️/g, '')));   /* chỉ emoji cần đổi (ký hiệu KEEP thì thôi → không lặp vô tận) */
function pxNode(n) {
  const w = document.createTreeWalker(n, NodeFilter.SHOW_TEXT, { acceptNode: t => (hasEmo(t.nodeValue) && !t.parentElement.closest('script,style,textarea,input,option,canvas') ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT) });
  const list = []; while (w.nextNode()) list.push(w.currentNode);
  for (const t of list) { const sp = document.createElement('span'); sp.className = 'pxt'; sp.innerHTML = pxText(t.nodeValue).replace(/^/, /^\s/.test(t.nodeValue) ? ' ' : '') + (/\s$/.test(t.nodeValue) ? ' ' : ''); t.replaceWith(sp); }
  for (const pn of n.querySelectorAll('.ov:not([hidden]) .panel')) {
    if (pn.querySelector(':scope > .px-x')) continue;
    const b = document.createElement('button'); b.className = 'px-x'; b.type = 'button'; b.innerHTML = '<img src="assets/px/ui/hud/close.png" alt="">';
    b.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape', key: 'Escape' })); });
    pn.prepend(b);
  }
}
/* chữ vẽ trên canvas (nhãn trên vật, thanh câu cá, biển quầy…): bỏ emoji ở một chỗ chung — fillText/strokeText/measureText cùng làm sạch nên khung nền vẫn khớp */
const cleanC = t => (typeof t === 'string' && hasEmo(t) ? t.replace(EMO, e => (KEEP.has(e.replace(/️/g, '')) ? e : '')).replace(/\s{2,}/g, ' ').trim() : t);
function patchCanvas() {
  const P = CanvasRenderingContext2D.prototype; if (P.__px) return; P.__px = true;
  for (const k of ['fillText', 'strokeText', 'measureText']) { const f = P[k]; P[k] = function (t, a, b, c) { const n = arguments.length; return n <= 1 ? f.call(this, cleanC(t)) : n === 3 ? f.call(this, cleanC(t), a, b) : f.call(this, cleanC(t), a, b, c); }; }   /* plan-37: không rest-args (mỗi chữ vẽ = 1 mảng rác) */
}
let pxQ = false;
export function watchPixel() {
  const run = () => { pxQ = false; if (!ICON && !deps) return; for (const r of document.querySelectorAll('.ov:not([hidden]), #menu:not([hidden])')) pxNode(r); earnTip(); };
  new MutationObserver(() => { if (!pxQ) { pxQ = true; requestAnimationFrame(run); } }).observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['hidden'] });
}
const strip = s => String(s).replace(EMO, '').replace(/\s{2,}/g, ' ').trim();
/* plan-44 Q3: thẻ Mua nhanh (menu.js) khi thiếu đá cho món rẻ nhất chưa có → 1 dòng 'cách kiếm đá' ngay dưới dòng giới thiệu. Chèn qua DOM (menu.js thuộc đợt khác). */
const EARN = {
  vi: '💡 Kiếm đá 🪨: đào mỏ tím (tay không, 3 nhát = 2 🪨) · chặt cây rồi bán gỗ ở Thương nhân (1 🪨/gỗ) · gặp nghệ sĩ mới · đánh quái nhỏ ở bãi cỏ hai bên đèo. Đá bán ra rơi xuống đất — nhớ nhặt.',
  en: '💡 Earn stones 🪨: mine purple veins (bare hands, 3 hits = 2 🪨) · chop trees and sell wood at the Trader (1 🪨/wood) · meet new artists · fight the little monsters beside the passes. Sold stones drop on the ground — pick them up.',
};
function earnTip() {
  const menu = document.getElementById('menu'); if (!menu || menu.hidden || !deps || !deps.S.save) return;
  const rows = menu.querySelectorAll('.shoprow'); if (!rows.length) return;
  const stone = (deps.S.save.inv && deps.S.save.inv.stone) || 0, cheapest = Math.min(...[...rows].map(r => { const m = /(\d+)\s*(?:<img[^>]*stone|🪨)/.exec(r.innerHTML); return m ? +m[1] : Infinity; }));
  const old = menu.querySelector('.p44-earn'), need = stone < Math.max(30, Number.isFinite(cheapest) ? cheapest : 30);
  if (!need) { if (old) old.remove(); return; }
  if (old) return;
  const hint = menu.querySelector('.mhint'); if (!hint) return;
  const p = document.createElement('p'); p.className = 'mhint p44-earn'; p.innerHTML = pxText(EARN[document.documentElement.lang === 'vi' ? 'vi' : 'en']); hint.insertAdjacentElement('afterend', p);
}

function el(tag, id, parent) { const e = document.createElement(tag); if (id) e.id = id; (parent || root).appendChild(e); return e; }
export function initHud(d) {
  deps = d;
  root = document.createElement('div'); root.id = 'pxhud'; document.body.appendChild(root);
  const clock = el('div', 'px-clock'); clock.innerHTML = '<div class="pc-date"></div><div class="pc-time"></div>';
  el('div', 'px-money').innerHTML = '<img class="pxi" src="assets/px/ui/items/stone.png" alt=""><b>0</b>';
  el('div', 'px-status');
  el('div', 'px-notes').addEventListener('pointerdown', noteClick);   /* plan-44 Q4: × đóng / chạm mở hết */
  el('div', 'px-banner').hidden = true;
  el('div', 'px-label').hidden = true;
  watchPixel(); patchCanvas();
}
/* ---- thông báo ---- */
export function notify(text, big) {
  if (!root) return false;
  if (big) { const b = root.querySelector('#px-banner'); b.innerHTML = pxText(text); b.hidden = false; bannerT = 2.2; return true; }
  const m = /^\+(\d+)\s*(.+)$/.exec(String(text).trim());   /* gộp "+N món" cùng loại */
  const T = noteTime(text);   /* plan-44 Q4: câu dài ở lâu hơn (đọc kịp) */
  if (m) { const key = strip(m[2]); const old = notes.find(n => n.key === key); if (old) { old.n += +m[1]; old.t = T; old.html = pxText(`+${old.n} ${m[2]}`); render(); return true; } notes.push({ id: ++noteId, key, n: +m[1], t: T, html: pxText(text) }); }
  else { const key = strip(text); const old = notes.find(n => n.key === key); if (old) old.t = Math.max(old.t, T); else notes.push({ id: ++noteId, key, t: T, html: pxText(text), long: strip(text).length > 56 }); }
  while (notes.length > 4) notes.shift();
  render(); return true;
}
let notesHTML = null, noteId = 0;
const noteTime = text => 3 + Math.min(7, Math.max(0, strip(text).length - 40) / 18);   /* plan-44 Q4: 3 s + ~1 s mỗi 18 ký tự quá 40 (tối đa 10 s) */
function render() {   /* plan-37: chỉ ghi DOM khi nội dung đổi (trước: innerHTML mỗi khung khi có thông báo) */
  const touch = isTouchUI();   /* plan-44 Q4 + M1: chữ xuống dòng (CSS); điện thoại tối đa 2 dòng — chạm để mở hết; nút × (điện thoại: mọi thông báo, máy tính: câu dài) */
  const html = notes.map(n => `<div class="pn${n.long ? ' long' : ''}${n.open ? ' open' : ''}" data-id="${n.id}" style="opacity:${Math.min(1, n.t / 0.6).toFixed(1)}"><span class="pn-t">${n.html}</span>${touch || n.long ? '<button type="button" class="pn-x" aria-label="close">×</button>' : ''}</div>`).join('');
  if (html === notesHTML) return; notesHTML = html;
  root.querySelector('#px-notes').innerHTML = html;
}
function noteClick(e) {
  const pn = e.target.closest('.pn'); if (!pn) return; const n = notes.find(q => String(q.id) === pn.dataset.id); if (!n) return;
  e.preventDefault(); e.stopPropagation();
  if (e.target.closest('.pn-x')) notes = notes.filter(q => q !== n); else { n.open = !n.open; n.t = Math.max(n.t, 6); }
  render();
}
/* ---- trạng thái (thay dòng HUD dài): mỗi dòng hudLines → 1 icon chip, rê chuột xem đủ ---- */
export function setStatus(lines) {
  const key = lines.join('|'); if (sig.st === key) return; sig.st = key;
  root.querySelector('#px-status').innerHTML = lines.map(l => `<span class="ps" title="${esc(strip(l))}">${pxText(l)}</span>`).join('');
}
/* ---- người chơi / bảng tên người bán lọt sau cụm đồng hồ → cụm mờ đi (kiểu Stardew) ---- */
let bhT = 0;
function behind(S) {
  if ((bhT = (bhT + 1) % 6)) return;   /* 10 lần/giây là đủ */
  const C = deps.CTX, cv = document.getElementById('c'); if (!C.cam || !cv || !S.player) return;
  const r = cv.getBoundingClientRect(), k = r.width / C.VW, box = [];
  for (const id of ['px-clock', 'px-money', 'px-status']) { const e = root.querySelector('#' + id); if (e && e.offsetWidth) box.push(e.getBoundingClientRect()); }
  const pts = [[S.player.x, S.player.y - 12]].concat((S.staff || []).map(n => [n.x, n.y - 30]));
  const hit = pts.some(([x, y]) => { const sx = r.left + (x - C.cam.cx) * k, sy = r.top + (y - C.cam.cy) * k; return box.some(b => sx > b.left - 8 && sx < b.right + 8 && sy > b.top - 8 && sy < b.bottom + 8); });
  root.classList.toggle('behind', hit);
}
/* ---- 2026-10-15 (tác nhân HUD): điện thoại — chip trạng thái nằm ngay dưới tên vùng / nhiệm vụ (.hud-tl), thông báo (điện thoại dọc) ngay dưới chip.
   Đo 2 lần / giây, chỉ ghi style khi đổi. Máy tính: giữ CSS (chip dưới đồng hồ). ---- */
let lyT = 0;
function layoutInfo() {
  const now = performance.now(); if (now - lyT < 500) return; lyT = now;
  const st = root.querySelector('#px-status'), nt = root.querySelector('#px-notes'); if (!st || !nt) return;
  if (!matchMedia('(pointer:coarse)').matches) { if (st.style.top) st.style.top = ''; if (nt.style.top) nt.style.top = ''; return; }
  const tl = document.querySelector('#hud .hud-tl'), rr = root.getBoundingClientRect(), q = tl && tl.getBoundingClientRect();
  const y = q && q.height ? Math.round(q.bottom - rr.top + 6) : 10, ty = y + 'px'; if (st.style.top !== ty) st.style.top = ty;
  const por = matchMedia('(orientation:portrait) and (max-width:640px)').matches, lan = !por && matchMedia('(orientation:landscape) and (max-height:500px)').matches;   /* ngang: thông báo cũng về cột trái dưới chip (trước nằm giữa màn) */
  if (por || lan) { const ny = Math.max(por ? 178 : 0, Math.round(y + st.offsetHeight + 6)) + 'px'; if (nt.style.top !== ny) nt.style.top = ny; }
  else if (nt.style.top) nt.style.top = '';
}
/* ---- nhãn hành động ---- */
export function setLabel(text, sx, sy) {
  const lb = root.querySelector('#px-label');
  if (!text) { if (!lb.hidden) lb.hidden = true; sig.lb = ''; return; }
  if (sig.lb !== text) { sig.lb = text; lb.innerHTML = pxText(text); }
  if (lb.hidden) lb.hidden = false; const L = Math.round(sx), T = Math.round(sy); if (sig.lbx !== L) { sig.lbx = L; lb.style.left = L + 'px'; } if (sig.lby !== T) { sig.lby = T; lb.style.top = T + 'px'; }   /* plan-37: chỉ ghi style khi đổi */
}
export function tick(dt) {
  if (!root || !deps.S.save) return;
  const S = deps.S, play = S.mode === 'play';
  if (document.body.dataset.mode !== S.mode) document.body.dataset.mode = S.mode;   /* plan-25 B5: CSS điện thoại theo chế độ (câu cá → ẩn D-pad) */
  { const hid = !(S.map && (play || S.mode === 'menu' || S.mode === 'dialog' || S.mode === 'chat' || S.mode === 'sleepask' || S.mode === 'roadlost')); if (root.hidden !== hid) root.hidden = hid; }   /* plan-42 A6: chỉ ghi khi đổi (ghi trùng vẫn bắn MutationObserver) */   /* plan-27: ô chat Rocky không làm tắt HUD */
  if (bannerT > 0) { bannerT -= dt; if (bannerT <= 0) root.querySelector('#px-banner').hidden = true; }
  if (notes.length) { for (const n of notes) n.t -= dt; notes = notes.filter(n => n.t > 0); render(); }
  const ck = document.getElementById('h-clock'); const txt = ck ? ck.textContent : '';   /* đồng hồ cũ (clock.js) làm nguồn chữ, ẩn bằng CSS */
  if (txt !== sig.ck) { sig.ck = txt; const m = /(\d{1,2}:\d{2}\s*(?:[AaPp][Mm])?)\s*$/.exec(txt.trim()), t = m ? m[1] : '', d = (m ? txt.trim().slice(0, m.index) : txt).replace(/[·\s]+$/, '').trim(); root.querySelector('.pc-date').textContent = d; root.querySelector('.pc-time').textContent = t; }   /* giờ = 'hh:mm' cuối chuỗi, còn lại là mùa · ngày */
  behind(S); layoutInfo(); night45(S);
  const st = (S.save.inv && S.save.inv.stone) || 0; if (st !== sig.st2) { sig.st2 = st; root.querySelector('#px-money b').textContent = st; }
}

/* plan-45 BD2: ban đêm (từ 19:00, clock.isNight) mặt đồng hồ HUD đổi sang ảnh trăng PixelLab (ui/hud/clock_night.png, CSS #px-clock.night) — đổi 1 lần, không nhấp nháy.
   plan-45 D12: đang đánh trùm (S.bossFight của Rết, hoặc trùm còn sống ≤ 320 px) → body.p45-boss: CSS ẩn máy đo địa chấn #seis, rút gọn tên vùng. Kiểm 4 lần / giây. */
let n45T = 0;
const BOSS45 = mo => !!(mo && mo.c && (mo.c.boss || mo.c.hrBoss || mo.c.tdBoss || mo.c.gmBoss || mo.c.hdBoss || mo.c.dhBoss || mo.c.bkBoss || mo.c.lyBoss || mo.c.chaseBoss || mo.c.ai === 'kraken'));
function night45(S) {
  const now = performance.now(); if (now - n45T < 250) return; n45T = now;
  const C = deps.CTX, ck = root.querySelector('#px-clock'), nt = !!(C && C.clock && S.save && S.save.clock && C.clock.isNight());
  if (ck && ck.classList.contains('night') !== nt) ck.classList.toggle('night', nt);
  let boss = !!S.bossFight;
  if (!boss && C && C.monsters && C.monsters.list && S.player) { try { for (const mo of C.monsters.list()) if (BOSS45(mo) && mo.hp > 0 && mo.state !== 'dead' && Math.hypot(mo.x - S.player.x, mo.y - S.player.y) < 320) { boss = true; break; } } catch (e) { /* bỏ qua */ } }
  if (document.body.classList.contains('p45-boss') !== boss) document.body.classList.toggle('p45-boss', boss);
}
/* ---- phím T: ném thú trên đầu bay vòng cung vào ô trống của thanh công cụ (anh yêu cầu 2026-10-10: hiệu ứng ấn tượng, toàn pixel) ----
   icon PixelLab của con thú xoay 2 vòng + vệt bóng mờ dần; tới nơi: ô nảy + viền vàng nháy, chùm 'item_pickup_pop' + 'crop_sparkle' (sheet VFX PixelLab). */
function sheetBurst(name, x, y, size, delay = 0) {
  const v = deps.ART.man && deps.ART.man.vfx && deps.ART.man.vfx[name]; if (!v) return;
  const n = v.n || 4, d = document.createElement('div'); d.className = 'fx-burst';
  d.style.cssText = `left:${x - size / 2}px;top:${y - size / 2}px;width:${size}px;height:${size}px;background-image:url(assets/px/${v.file});background-size:${n * size}px ${size}px;--fx-end:-${n * size}px;animation:fxSheet .42s steps(${n}) ${delay}s forwards`;
  document.body.appendChild(d); setTimeout(() => d.remove(), 600 + delay * 1000);
}
export function flyToSlot(kind, slot, done, file, wx, wy, n = 1) {
  const C = deps.CTX, S = deps.S, cv = document.getElementById('c'), items = deps.ART.man && deps.ART.man.ui && deps.ART.man.ui.items;
  const src = file ? 'assets/px/' + file : items && items[kind] ? 'assets/px/' + items[kind] : null;   /* cá có loài → ảnh đúng loài */
  if (!cv || !C.cam || !src) { done(); return; }
  const r = cv.getBoundingClientRect(), k = r.width / C.VW, p = S.player;
  const x0 = r.left + ((wx ?? p.x) - C.cam.cx) * k, y0 = r.top + ((wy ?? p.y - 30) - C.cam.cy) * k;   /* plan-24: bay từ chỗ nhặt */
  const msr = document.querySelector('#mslots:not([hidden])'), msEl = msr ? msr.querySelector(`.ms-slot[data-id="${kind}"]`) || msr.querySelector('.ms-bag') : null;   /* điện thoại: ô tròn có món đó, không thì nút Túi */
  const el = msEl || (slot >= 0 ? document.querySelector(`#hotbar .hb-slot[data-i="${slot}"]`) : document.querySelector('#hotbar .hb-bag'));   /* ô thanh / nút Túi (ô đếm đá đã bỏ 2026-10-10: đá hiện trên thanh) */   /* đá Seismic → ô đếm đá */
  const tb = el ? el.getBoundingClientRect() : { left: innerWidth / 2 - 20, top: innerHeight - 60, width: 40, height: 40 };
  const x1 = tb.left + tb.width / 2, y1 = tb.top + tb.height / 2, cx1 = (x0 + x1) / 2 + (x1 > x0 ? -60 : 60), cy1 = Math.min(y0, y1) - 140;
  const fly = document.createElement('img'); fly.src = src; fly.className = 'fx-fly'; document.body.appendChild(fly);
  sheetBurst('item_pickup_pop', x0, y0, 64);
  const T = 700, t0 = performance.now(); let last = 0;
  const step = now => {
    const t = Math.min(1, (now - t0) / T), e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2, u = 1 - e;
    const x = u * u * x0 + 2 * u * e * cx1 + e * e * x1, y = u * u * y0 + 2 * u * e * cy1 + e * e * y1, sc = 1.6 - 0.8 * e, rot = Math.round(e * 720 / 90) * 90;   /* xoay theo nấc 90° cho giữ nét pixel */
    fly.style.transform = `translate(${x - 24}px,${y - 24}px) scale(${sc}) rotate(${rot}deg)`;
    if (now - last > 34) { last = now; const g = fly.cloneNode(); g.className = 'fx-fly fx-ghost'; g.style.transform = fly.style.transform; document.body.appendChild(g); setTimeout(() => g.remove(), 320); }
    if (now - (step.sp || 0) > 110) { step.sp = now; sheetBurst('crop_sparkle', x + (Math.random() - 0.5) * 22, y + (Math.random() - 0.5) * 22, 28); }   /* lấp lánh dọc đường bay */
    if (t < 1) requestAnimationFrame(step);
    else {
      fly.remove(); sheetBurst('item_pickup_pop', x1, y1, 72); sheetBurst('crop_sparkle', x1 - 18, y1 - 14, 40, 0.08); sheetBurst('crop_sparkle', x1 + 18, y1 - 10, 40, 0.16);
      done();
      const pl = document.createElement('div'); pl.className = 'fx-plus'; pl.textContent = '+' + n; pl.style.left = (x1 - 12) + 'px'; pl.style.top = (y1 - 44) + 'px'; document.body.appendChild(pl); setTimeout(() => pl.remove(), 900);
      const el2 = msEl ? msEl : slot >= 0 ? document.querySelector(`#hotbar .hb-slot[data-i="${slot}"]`) : slot === -2 ? document.querySelector('#hotbar .hb-bag') : null;
      if (el2) { el2.classList.remove('hb-catch'); void el2.offsetWidth; el2.classList.add('hb-catch'); setTimeout(() => el2.classList.remove('hb-catch'), 700); }
    }
  };
  requestAnimationFrame(step);
}
