// title.js — plan-13: màn hình chính pixel sống động. Canvas riêng #tbg (cảnh bến cảng parallax: trời theo giờ máy, mây, đảo xa, biển,
// hải đăng, nhà, cọ, thuyền, nhân vật thở, Rocky con, gà) + logo canvas (#t-logo, Press Start 2P + quầng sáng) + điều hướng phím
// + bảng Cài đặt (âm lượng, tỉ lệ pixel) + Credits DOM + Thoát. Không có asset (chế độ code) → vẽ hình đơn giản.
import { ART } from './art.js';
import { charSheet, SKINS, HAIRS } from './gfx.js';
import { ROSTER } from './data.js';
import { loadSave } from './save.js';
import * as AUDIO from './audio.js';
import * as UI from './ui.js';

const $ = s => document.querySelector(s);
const STR = {
  en: { settings: 'Settings', credits: 'Credits', quit: 'Quit', back: 'Back', volume: 'Volume', scale: 'Pixel scale', auto: 'Auto', demo: '▶ Auto demo', bye: 'Saved. See you next time!', byeNote: 'You can close this tab now.', creditsTitle: 'SEISMIC · 9 LANDS', creditsSub: n => `${n.toLocaleString()} artists of #artwork`, made: 'Made with love for the community' },
  vi: { settings: 'Cài đặt', credits: 'Credits', quit: 'Thoát', back: 'Quay lại', volume: 'Âm lượng', scale: 'Tỉ lệ pixel', auto: 'Tự động', demo: '▶ Demo tự chạy', bye: 'Đã lưu. Hẹn gặp lại!', byeNote: 'Bạn có thể đóng tab này.', creditsTitle: 'SEISMIC · 9 LANDS', creditsSub: n => `${n.toLocaleString()} nghệ sĩ của #artwork`, made: 'Làm bằng cả tấm lòng cho cộng đồng' }
};
const L = () => STR[UI.lang() === 'vi' ? 'vi' : 'en'];

let cv, g, logoCv, raf = 0, t0 = 0, mouse = { x: 0, y: 0 }, imgs = {}, sheet = null, sel = 0, panel = null, deps = null;
const BASE = 'assets/px/';
function img(path) { const i = new Image(); i.src = BASE + path; return i; }
const ok = i => i && i.complete && i.naturalWidth > 0;
const FIX = { lighthouse: 'zones/sea/obj/lighthouse_s7.png', house: 'zones/sea/obj/house_y_t8.png', palm: 'zones/m1/obj/palm_s7.png', boat: 'zones/m1/obj/boat_t8.png', pet: 'zones/village/misc/out/rockypet_3.png' };

export function initTitle(d) {
  deps = d; cv = $('#tbg'); g = cv.getContext('2d'); logoCv = $('#t-logo');
  const ui = ART.on && ART.man && ART.man.ui && ART.man.ui.title;
  if (ui) { for (const [k, f] of Object.entries(ui)) imgs[k] = img(f); for (const [k, f] of Object.entries(FIX)) imgs[k] = img(f); for (let i = 0; i < 4; i++) imgs['chk' + i] = img(`zones/village/creatures/chicken_ds_${i}.png`); }
  try { const sv = loadSave(); const o = (sv && sv.outfit) || { skin: SKINS[1], hair: HAIRS[0], shirt: '#5a9c58', pants: '#3b2f2f' }; sheet = charSheet(o); } catch (e) { sheet = null; }
  window.addEventListener('pointermove', e => { mouse.x = e.clientX / window.innerWidth - 0.5; mouse.y = e.clientY / window.innerHeight - 0.5; }, { passive: true });
  window.addEventListener('resize', () => { if (raf) fit(); });
  // nút pixel: đánh dấu chọn khi rê chuột; phím ↑↓ Enter
  document.addEventListener('pointerover', e => { const b = e.target.closest('#title .btn'); if (b) setSel(buttons().indexOf(b)); });
  window.addEventListener('keydown', e => {
    if (!isOpen() || e.target.tagName === 'INPUT') return;
    const bs = buttons(); if (!bs.length) return;
    if (e.code === 'ArrowDown' || e.code === 'KeyS') { setSel((sel + 1) % bs.length); e.preventDefault(); }
    else if (e.code === 'ArrowUp' || e.code === 'KeyW') { setSel((sel + bs.length - 1) % bs.length); e.preventDefault(); }
    else if (e.code === 'Enter' || e.code === 'KeyE' || e.code === 'Space') { bs[sel] && bs[sel].click(); e.preventDefault(); }
    else if (e.code === 'Escape' && panel) { showPanel(null); e.preventDefault(); }
  });
  $('#t-settings').onclick = () => showPanel('settings'); $('#t-credits').onclick = () => showPanel('credits'); $('#t-quit').onclick = quit;
  for (const b of document.querySelectorAll('#title [data-back]')) b.onclick = () => showPanel(null);
  const vol = $('#t-vol'); vol.value = Math.round(AUDIO.getVolume() * 100); vol.oninput = () => { AUDIO.setVolume(vol.value / 100); AUDIO.sfx('pickup'); };
  const sc = $('#t-scale'); sc.value = localStorage.getItem('seismic.scale') || '0'; sc.onchange = () => { try { sc.value === '0' ? localStorage.removeItem('seismic.scale') : localStorage.setItem('seismic.scale', sc.value); } catch (e) { } deps.resize && deps.resize(); };
  applyText();
}
const isOpen = () => !$('#title').hidden;
const buttons = () => [...document.querySelectorAll('#title .btn')].filter(b => !b.hidden && b.offsetParent !== null);
function setSel(i) { const bs = buttons(); if (!bs.length) return; sel = Math.max(0, Math.min(bs.length - 1, i)); bs.forEach((b, j) => b.classList.toggle('sel', j === sel)); }
function showPanel(p) {
  panel = p; $('#t-main').hidden = !!p; $('#t-panel-settings').hidden = p !== 'settings'; $('#t-panel-credits').hidden = p !== 'credits'; $('#t-panel-bye').hidden = p !== 'bye';
  if (p === 'credits') buildCredits(); setSel(0);
}
function buildCredits() {
  const t = L(), el = $('#t-credits-list'); const sv = loadSave();
  const names = (sv && sv.story && sv.story.rescued ? ['♥ Lyron', ''] : []).concat(ROSTER.map(m => m.n));
  el.innerHTML = `<h3>${t.creditsTitle}</h3><p class="dim">${t.creditsSub(ROSTER.length)}</p>` + names.map(n => `<div>${n.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]))}</div>`).join('') + `<p class="dim" style="margin-top:40px">${t.made}</p>`;
  credY = 0; credAt = performance.now();
}
let credY = 0, credAt = 0;
function tickCredits(now) {
  if (panel !== 'credits') return; const el = $('#t-credits-list'), box = el.parentElement; if (!el || !box) return;
  const dt = (now - credAt) / 1000; credAt = now; credY += dt * 42; const h = el.offsetHeight, bh = box.offsetHeight;
  if (credY > h + bh) credY = 0; el.style.top = Math.round(bh - credY) + 'px';
}
function quit() { try { if (deps.persist) deps.persist(); } catch (e) { } showPanel('bye'); setTimeout(() => { try { window.close(); } catch (e) { } }, 150); }
export function applyText() {
  const t = L();
  $('#t-settings').textContent = '⚙ ' + t.settings; $('#t-credits').textContent = '★ ' + t.credits; $('#t-quit').textContent = '⏻ ' + t.quit;
  for (const b of document.querySelectorAll('#title [data-back]')) b.textContent = '← ' + t.back;
  $('#t-vol-label').textContent = t.volume; $('#t-scale-label').textContent = t.scale; $('#t-scale option[value="0"]').textContent = t.auto;
  $('#t-bye').textContent = t.bye; $('#t-bye-note').textContent = t.byeNote;
}
export function showTitle() { if (raf) return; fit(); t0 = performance.now(); raf = requestAnimationFrame(frame); showPanel(null); setSel(0); $('#tbg').hidden = false; }
export function hideTitle() { if (raf) cancelAnimationFrame(raf); raf = 0; $('#tbg').hidden = true; }

// ---------------------------------------------------------------- cảnh
let Z = 3, VW = 320, VH = 180;
function fit() {
  const w = window.innerWidth, h = window.innerHeight; Z = Math.max(2, Math.round(w / 400)); VW = Math.ceil(w / Z); VH = Math.ceil(h / Z);
  cv.width = VW * Z; cv.height = VH * Z; cv.style.width = w + 'px'; cv.style.height = h + 'px'; g.setTransform(Z, 0, 0, Z, 0, 0); g.imageSmoothingEnabled = false;
}
const lerp = (a, b, k) => a + (b - a) * k;
function skyPalette() {
  const h = new Date().getHours() + new Date().getMinutes() / 60;
  const day = { top: '#4f9be8', bot: '#bfe6ff', sea: '#2a9ab8', seaD: '#1d6f8c', sun: '#fff3b0', k: 0 };
  const set = { top: '#5a3d7a', bot: '#ff9a5c', sea: '#3a6e9c', seaD: '#1f3f62', sun: '#ffb347', k: 0.5 };
  const night = { top: '#0b1030', bot: '#243a6b', sea: '#16355a', seaD: '#0c1f3a', sun: '#e8f0ff', k: 1 };
  if (h >= 7 && h < 16.5) return day; if (h >= 19.5 || h < 5) return night;
  const mix = (a, b, k) => Object.fromEntries(Object.keys(a).map(key => [key, typeof a[key] === 'number' ? lerp(a[key], b[key], k) : lerpHex(a[key], b[key], k)]));
  if (h < 7) return mix(night, day, (h - 5) / 2); if (h < 17.5) return mix(day, set, (h - 16.5)); return mix(set, night, (h - 17.5) / 2);
}
function lerpHex(a, b, k) { const p = s => [1, 3, 5].map(i => parseInt(s.slice(i, i + 2), 16)); const A = p(a), B = p(b); return '#' + A.map((v, i) => Math.round(lerp(v, B[i], k)).toString(16).padStart(2, '0')).join(''); }
function drawHi(im, x, y, s = 1) { if (!ok(im)) return false; const w = im.naturalWidth / 2 * s, h = im.naturalHeight / 2 * s; g.drawImage(im, Math.round(x), Math.round(y), Math.round(w), Math.round(h)); return true; }
function frame(now) {
  raf = requestAnimationFrame(frame);
  const t = (now - t0) / 1000, P = skyPalette(), px = mouse.x * 8, py = mouse.y * 4, hor = Math.round(VH * 0.55);
  // trời
  const sky = g.createLinearGradient(0, 0, 0, hor); sky.addColorStop(0, P.top); sky.addColorStop(1, P.bot); g.fillStyle = sky; g.fillRect(0, 0, VW, hor + 2);
  // mặt trời / trăng
  const sunX = VW * 0.72 - px * 0.3, sunY = hor - 34 - py * 0.3; g.fillStyle = P.sun; g.globalAlpha = 0.9; g.beginPath(); g.arc(sunX, sunY, 9, 0, 7); g.fill(); g.globalAlpha = 0.25; g.beginPath(); g.arc(sunX, sunY, 16 + Math.sin(t) * 1.5, 0, 7); g.fill(); g.globalAlpha = 1;
  if (P.k > 0.6) { g.fillStyle = '#ffffff'; for (let i = 0; i < 40; i++) { const sx = (i * 97) % VW, sy = (i * 53) % (hor - 20); if (Math.sin(t * 2 + i) > 0.3) g.fillRect(sx, sy, 1, 1); } }
  // mây (3 tầng)
  for (let i = 0; i < 7; i++) {
    const im = imgs['cloud_' + (i % 3)], sp = 3 + (i % 3) * 3, layer = 0.3 + (i % 3) * 0.3;
    const x = ((i * 137 + t * sp - px * layer * 2) % (VW + 80) + VW + 80) % (VW + 80) - 80, y = 8 + (i * 31) % Math.max(20, hor - 60) - py * layer;
    g.globalAlpha = 0.85; if (!drawHi(im, x, y)) { g.fillStyle = 'rgba(255,255,255,.8)'; g.fillRect(x, y, 34, 8); g.fillRect(x + 6, y - 5, 18, 6); } g.globalAlpha = 1;
  }
  // đảo xa (lặp bằng lật gương)
  const far = imgs.far;
  if (ok(far)) { const w = far.naturalWidth / 2, h = far.naturalHeight / 2, off = ((t * 1.2 + px * 0.6) % (w * 2) + w * 2) % (w * 2); g.globalAlpha = 0.85;
    for (let x = -off - w * 2; x < VW + w; x += w * 2) { g.drawImage(far, Math.round(x), hor - h + 6, w, h); g.save(); g.translate(Math.round(x + w * 2), 0); g.scale(-1, 1); g.drawImage(far, 0, hor - h + 6, w, h); g.restore(); } g.globalAlpha = 1; }
  else { g.fillStyle = 'rgba(40,60,110,.6)'; for (let x = -20; x < VW + 40; x += 90) { const xx = x - ((t * 1.2) % 90); g.beginPath(); g.moveTo(xx, hor); g.lineTo(xx + 30, hor - 18); g.lineTo(xx + 60, hor); g.fill(); } }
  // biển
  const sea = imgs.sea;
  g.fillStyle = P.sea; g.fillRect(0, hor, VW, VH - hor);
  if (ok(sea)) { const w = sea.naturalWidth / 2, h = sea.naturalHeight / 2, off = ((t * 6 + px) % w + w) % w; g.globalAlpha = 0.9;
    for (let row = 0; row < 3; row++) { const y = hor + row * (h - 6) + Math.round(Math.sin(t * 1.6 + row) * 1); for (let x = -off - w; x < VW + w; x += w) g.drawImage(sea, Math.round(x + row * 20), y, w, h); } g.globalAlpha = 1; }
  else { g.fillStyle = 'rgba(255,255,255,.25)'; for (let i = 0; i < 12; i++) { const y = hor + 6 + i * 9, x = ((i * 53 + t * (8 + i)) % (VW + 30)) - 15; g.fillRect(x, y, 10 + i, 1); } }
  const dark = g.createLinearGradient(0, hor, 0, VH); dark.addColorStop(0, 'rgba(0,0,0,0)'); dark.addColorStop(1, P.seaD); g.fillStyle = dark; g.globalAlpha = 0.55; g.fillRect(0, hor, VW, VH - hor); g.globalAlpha = 1;
  // hải đăng trên mỏm đá bên phải, đèn quét
  const lx = VW - 70 - px * 1.4, ly = hor + 10 - py * 0.6;
  g.fillStyle = '#3a3040'; g.beginPath(); g.ellipse(lx + 16, ly + 6, 30, 7, 0, 0, 7); g.fill();
  if (!drawHi(imgs.lighthouse, lx, ly - 62)) { g.fillStyle = '#e8e0d0'; g.fillRect(lx + 10, ly - 44, 12, 48); g.fillStyle = '#c33'; g.fillRect(lx + 10, ly - 30, 12, 6); }
  const beam = (Math.sin(t * 0.9) + 1) / 2; g.fillStyle = `rgba(255,240,170,${0.12 + beam * 0.25})`; g.beginPath(); g.moveTo(lx + 16, ly - 56); g.lineTo(lx + 16 - 70 - beam * 60, ly - 30); g.lineTo(lx + 16 - 40 - beam * 60, ly - 8); g.fill();
  // bến gỗ bên trái
  const dy = VH - 46 - py * 1.5, dx = 0 - px * 2, dw = Math.min(VW * 0.55, 200);
  g.fillStyle = '#5a3a1e'; g.fillRect(dx, dy, dw, 24); g.fillStyle = '#8a5a30'; for (let x = 0; x < dw; x += 8) g.fillRect(dx + x, dy, 7, 22); g.fillStyle = '#3a2410'; for (let x = 12; x < dw; x += 40) g.fillRect(dx + x, dy + 22, 4, 12);
  if (VW >= 260) {   /* màn hẹp (điện thoại dọc): bỏ nhà + cọ cho khỏi đè lên chữ */
    if (!drawHi(imgs.house, dx + 6, dy - 62)) { g.fillStyle = '#c8b090'; g.fillRect(dx + 8, dy - 34, 40, 34); g.fillStyle = '#a03a2a'; g.fillRect(dx + 4, dy - 44, 48, 12); }
    drawHi(imgs.palm, dx + 54, dy - 50);
  }
  // thuyền neo bập bềnh
  const bx = dx + dw + 8, by = dy + 6 + Math.round(Math.sin(t * 1.4) * 1.5);
  if (!drawHi(imgs.boat, bx, by - 10)) { g.fillStyle = '#7a4a22'; g.fillRect(bx, by, 30, 8); }
  // nhân vật thở + Rocky con + gà
  const cx = dx + 70, cyy = dy + 20, bob = (Math.floor(t * 1.25) % 2) ? 1 : 0;
  if (sheet) { try { g.drawImage(sheet, 0, 0, 16, 20, Math.round(cx - 8), Math.round(cyy - 20 + bob), 16, 20 - bob); } catch (e) { } }
  drawHi(imgs.pet, cx + 16, cyy - 14 + (bob ? 0 : 1));
  const chk = imgs['chk' + (Math.floor(t * 4) % 4)]; drawHi(chk, cx + 44 + Math.round(Math.sin(t * 0.5) * 12), cyy - 10);
  // tối viền + nhịp sáng nhẹ
  const vig = g.createRadialGradient(VW / 2, VH / 2, VH * 0.5, VW / 2, VH / 2, VH); vig.addColorStop(0, 'rgba(0,0,0,0)'); vig.addColorStop(1, 'rgba(0,0,0,.55)'); g.fillStyle = vig; g.fillRect(0, 0, VW, VH);
  drawLogo(t); tickCredits(now);
}
function drawLogo(t) {
  const W = 360, H = 120, c = logoCv; if (c.width !== W) { c.width = W; c.height = H; }
  const lg = c.getContext('2d'); lg.clearRect(0, 0, W, H); lg.imageSmoothingEnabled = false;
  const em = imgs.emblem; if (ok(em)) { lg.globalAlpha = 0.55; lg.drawImage(em, W / 2 - 128, 4, 256, 128 * (em.naturalHeight / em.naturalWidth)); lg.globalAlpha = 1; }
  lg.textAlign = 'center'; lg.textBaseline = 'middle'; lg.font = '44px "Press Start 2P", monospace';
  const glow = 0.5 + Math.sin(t * 1.3) * 0.25; lg.shadowColor = `rgba(255,148,38,${glow})`; lg.shadowBlur = 18;
  lg.fillStyle = '#5a1e0e'; lg.fillText('SEISMIC', W / 2 + 4, 52 + 4);
  lg.shadowBlur = 0; lg.lineWidth = 6; lg.strokeStyle = '#2a0d06'; lg.strokeText('SEISMIC', W / 2, 52);
  const gr = lg.createLinearGradient(0, 30, 0, 74); gr.addColorStop(0, '#fff2a8'); gr.addColorStop(0.5, '#ffd45e'); gr.addColorStop(1, '#ff9426'); lg.fillStyle = gr; lg.fillText('SEISMIC', W / 2, 52);
  lg.font = '26px VT323, monospace'; lg.fillStyle = '#ff9426'; lg.fillText('·  9   L A N D S  ·', W / 2, 98);
}
