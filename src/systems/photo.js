// photo.js — Photo mode (P): freeze the scene, pick a frame / sticker / filter / pose, then download or copy a PNG
// of exactly what is on screen (pixel canvas ×scale, nearest-neighbour + the crisp overlay). See systems/API.md.

const STR = {
  en: {
    title: 'Photo mode', frame: 'Frame', sticker: 'Sticker', filter: 'Filter', pose: 'Pose', wave: '👋 Wave', hud: 'Hide HUD',
    frames: { none: 'None', pixel: 'Pixel', polaroid: 'Polaroid', pink: 'Seismic pink' },
    stickers: { none: 'None', rocky: 'Rocky', mark: 'Wordmark', land: 'Land', me: 'Me + flags' },
    filters: { none: 'None', warm: 'Warm', cool: 'Cool', night: 'Night' },
    download: '📷 Download PNG', copy: '📋 Copy', close: 'Close',
    hint: 'E / Space: snap · Arrows: pose · Esc: close',
    saved: 'Photo saved!', copied: 'Copied to clipboard!', copyFail: 'Copy not allowed here — use Download', cheese: 'Say cheese! 📷', ach: 'Achievement: Photographer',
    shots: n => `${n} photo${n === 1 ? '' : 's'}`, mark: 'SEISMIC', mark2: '· 9 LANDS', caption: 'Seismic · 9 Lands'
  },
  vi: {
    title: 'Chụp ảnh', frame: 'Khung', sticker: 'Nhãn', filter: 'Màu', pose: 'Dáng', wave: '👋 Vẫy', hud: 'Ẩn HUD',
    frames: { none: 'Không', pixel: 'Pixel', polaroid: 'Polaroid', pink: 'Hồng Seismic' },
    stickers: { none: 'Không', rocky: 'Rocky', mark: 'Logo', land: 'Tên vùng', me: 'Tôi + cờ' },
    filters: { none: 'Không', warm: 'Ấm', cool: 'Lạnh', night: 'Đêm' },
    download: '📷 Tải PNG', copy: '📋 Sao chép', close: 'Đóng',
    hint: 'E / Space: chụp · Mũi tên: đổi dáng · Esc: đóng',
    saved: 'Đã lưu ảnh!', copied: 'Đã sao chép vào clipboard!', copyFail: 'Không sao chép được — hãy bấm Tải', cheese: 'Cười lên nào! 📷', ach: 'Thành tựu: Nhiếp ảnh gia',
    shots: n => `${n} ảnh`, mark: 'SEISMIC', mark2: '· 9 LANDS', caption: 'Seismic · 9 Lands'
  }
};
const L = ctx => STR[ctx.lang() === 'vi' ? 'vi' : 'en'];
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const FRAMES = ['none', 'pixel', 'polaroid', 'pink'], STICKERS = ['none', 'rocky', 'mark', 'land', 'me'], FILTERS = ['none', 'warm', 'cool', 'night'];
const PINK = '#ff5aa5', GOLD = '#ffd45e', INK = '#1a1626';
const FONT = '"Segoe UI",system-ui,sans-serif';

let CTX = null;
const ST = { open: false, frame: 'pixel', sticker: 'none', filter: 'none', hideHud: false, wave: false, el: null, timer: null, prevSpeed: 1, busy: null, cam: null, closerSet: false, busyRender: false };

// --- procedural sprites (cached at load) -----------------------------------
// Rocky head: 16×16 — square rounded head, two slit eyes, no mouth, a pink gem on the brow (the community mascot)
const ROCKY = (() => {
  const c = document.createElement('canvas'); c.width = 16; c.height = 16; const g = c.getContext('2d');
  const px = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
  px(2, 1, 12, 14, '#5a3222');                 // outline block
  px(3, 2, 10, 12, '#f2a081');                 // face
  px(3, 2, 10, 2, '#f8bfa6');                  // light on top
  px(3, 11, 10, 3, '#d97c5c');                 // shade at the bottom
  g.clearRect(2, 1, 1, 1); g.clearRect(13, 1, 1, 1); g.clearRect(2, 14, 1, 1); g.clearRect(13, 14, 1, 1); // rounded corners
  px(4, 7, 3, 1, '#2a1410'); px(9, 7, 3, 1, '#2a1410'); // slit eyes
  px(7, 3, 2, 2, PINK); px(7, 3, 1, 1, '#ffd6ea');   // gem
  px(1, 5, 1, 4, '#5a3222'); px(14, 5, 1, 4, '#5a3222'); // little stone ears
  return c;
})();
const HAND = ['X.X.X', 'XXXXX', 'XXXXX', '.XXX.', '.XXX.'];
const HEART = ['.XX.XX.', 'XXXXXXX', 'XXXXXXX', '.XXXXX.', '..XXX..', '...X...'];
function pat(g, rows, x, y, u, col, outline) {
  if (outline) { g.fillStyle = outline; for (let r = 0; r < rows.length; r++) for (let c = 0; c < rows[r].length; c++) if (rows[r][c] === 'X') g.fillRect(x + c * u - 1, y + r * u - 1, u + 2, u + 2); }
  g.fillStyle = col; for (let r = 0; r < rows.length; r++) for (let c = 0; c < rows[r].length; c++) if (rows[r][c] === 'X') g.fillRect(x + c * u, y + r * u, u, u);
}

// --- helpers -----------------------------------------------------------------
const zoneName = ctx => { const z = ctx.S.zone; return z && z.name ? (z.name[ctx.lang()] || z.name.en) : (z ? z.id : ''); };
const sysSave = ctx => { const sv = ctx.S.save; sv.sys = sv.sys || {}; sv.sys.photo = sv.sys.photo || { count: 0 }; return sv.sys.photo; };
function flagsInView(ctx) {
  const cam = ST.cam, S = ctx.S; if (!cam) return [];
  const out = [], seen = new Set();
  for (const n of ctx.allNpcs()) {
    if (n.x < cam.cx || n.x > cam.cx + ctx.VW || n.y < cam.cy || n.y > cam.cy + ctx.VH) continue;
    const nat = n.m && ctx.nationOf(n.m); if (nat && !seen.has(nat.flag)) { seen.add(nat.flag); out.push(nat.flag); }
    if (out.length >= 6) break;
  }
  return out;
}

// --- the decoration: frame + sticker, drawn at overlay resolution (W×H) ------
function drawDeco(g, W, H, ctx) {
  const u = Math.max(2, Math.round(H / 120)), T = L(ctx);
  let band = 0;
  g.save(); g.imageSmoothingEnabled = false;
  if (ST.frame === 'pixel') {
    band = 3 * u;
    g.fillStyle = INK; g.fillRect(0, 0, W, 2 * u); g.fillRect(0, H - 2 * u, W, 2 * u); g.fillRect(0, 0, 2 * u, H); g.fillRect(W - 2 * u, 0, 2 * u, H);
    g.fillStyle = GOLD; g.fillRect(2 * u, 2 * u, W - 4 * u, u); g.fillRect(2 * u, H - 3 * u, W - 4 * u, u); g.fillRect(2 * u, 2 * u, u, H - 4 * u); g.fillRect(W - 3 * u, 2 * u, u, H - 4 * u);
    g.fillStyle = '#ff9426'; for (const [x, y] of [[0, 0], [W - 4 * u, 0], [0, H - 4 * u], [W - 4 * u, H - 4 * u]]) g.fillRect(x, y, 4 * u, 4 * u);
    g.fillStyle = INK; for (const [x, y] of [[u, u], [W - 3 * u, u], [u, H - 3 * u], [W - 3 * u, H - 3 * u]]) g.fillRect(x, y, 2 * u, 2 * u);
  } else if (ST.frame === 'polaroid') {
    band = 3 * u; const bottom = 10 * u;
    g.fillStyle = '#f5f1ea'; g.fillRect(0, 0, W, band); g.fillRect(0, H - bottom, W, bottom); g.fillRect(0, 0, band, H); g.fillRect(W - band, 0, band, H);
    g.fillStyle = 'rgba(0,0,0,.12)'; g.fillRect(band, band, W - 2 * band, 1); g.fillRect(band, band, 1, H - band - bottom);
    g.fillStyle = '#3a3330'; g.font = `italic ${Math.round(u * 3.2)}px ${FONT}`; g.textAlign = 'left'; g.textBaseline = 'middle';
    g.fillText(zoneName(ctx), band + u, H - bottom / 2 + u * 0.3);
    g.textAlign = 'right'; g.fillStyle = '#8a7f78'; g.font = `${Math.round(u * 2.4)}px ${FONT}`; g.fillText(T.caption, W - band - u, H - bottom / 2 + u * 0.3);
  } else if (ST.frame === 'pink') {
    band = 3 * u;
    g.fillStyle = PINK; g.fillRect(0, 0, W, 2 * u); g.fillRect(0, H - 2 * u, W, 2 * u); g.fillRect(0, 0, 2 * u, H); g.fillRect(W - 2 * u, 0, 2 * u, H);
    g.fillStyle = '#ffd6ea'; g.fillRect(2 * u, 2 * u, W - 4 * u, u); g.fillRect(2 * u, H - 3 * u, W - 4 * u, u); g.fillRect(2 * u, 2 * u, u, H - 4 * u); g.fillRect(W - 3 * u, 2 * u, u, H - 4 * u);
    g.fillStyle = '#fff'; for (const [x, y] of [[0, 0], [W - 5 * u, 0], [0, H - 5 * u], [W - 5 * u, H - 5 * u]]) { g.fillRect(x + u, y + u, 3 * u, u); g.fillRect(x + u, y + u, u, 3 * u); }
  }
  const pad = band + 2 * u;
  // stickers
  if (ST.sticker === 'rocky') {
    const s = Math.max(2, Math.round(u * 0.75)), sw = 16 * s;
    g.drawImage(ROCKY, pad, H - pad - sw - (ST.frame === 'polaroid' ? 7 * u : 0), sw, sw);
  } else if (ST.sticker === 'mark') {
    const fs = Math.round(u * 4.2); g.textAlign = 'right'; g.textBaseline = 'top';
    g.font = `900 ${fs}px ${FONT}`; const x = W - pad, y = pad;
    g.fillStyle = '#6a2a12'; g.fillText(T.mark, x + Math.round(u * 0.5), y + Math.round(u * 0.5)); g.fillStyle = GOLD; g.fillText(T.mark, x, y);
    g.font = `bold ${Math.round(u * 2.2)}px ${FONT}`; g.fillStyle = PINK; g.fillText(T.mark2, x, y + fs + u * 0.4);
  } else if (ST.sticker === 'land' || ST.sticker === 'me') {
    let text = zoneName(ctx);
    if (ST.sticker === 'me') { const nm = ctx.S.save.name || 'Me', fl = flagsInView(ctx); text = nm + (fl.length ? '  ' + fl.join(' ') : ''); }
    // bottom-left (the bottom-right corner sits under the panel while the mode is open)
    const fs = Math.round(u * 3); g.font = `bold ${fs}px ${FONT}`; g.textAlign = 'left'; g.textBaseline = 'middle';
    const tw = g.measureText(text).width + 4 * u, th = fs + 3 * u, x = pad, y = H - pad - (ST.frame === 'polaroid' ? 7 * u : 0);
    g.fillStyle = 'rgba(13,11,20,.75)'; g.beginPath(); g.roundRect(x, y - th, tw, th, u); g.fill();
    g.strokeStyle = ST.sticker === 'me' ? PINK : GOLD; g.lineWidth = Math.max(1, u / 3); g.stroke();
    g.fillStyle = ST.sticker === 'me' ? '#ffd6ea' : GOLD; g.fillText(text, x + 2 * u, y - th / 2 + u * 0.2);
  }
  g.restore();
}
// wave: hand beside the shoulder + ♥ above the head (overlay coords)
function drawWave(g, ctx, cx, cy, scale) {
  const p = ctx.S.player, t = ctx.S.time, u = Math.max(1, Math.round(scale));
  const sx = Math.round((p.x - cx) * scale), sy = Math.round((p.y - cy) * scale);
  const skin = (ctx.S.save.outfit && ctx.S.save.outfit.skin) || '#f0c8a0';
  const wob = Math.round(Math.sin(t * 9) * u), hx = sx + 9 * u + wob, hy = sy - 16 * u - Math.abs(wob);
  pat(g, HAND, hx, hy, u, skin, 'rgba(40,20,10,.85)');
  const bob = Math.round(Math.sin(t * 3) * u * 1.5);
  pat(g, HEART, sx - 3 * u, sy - 40 * u + bob, u, PINK, 'rgba(40,10,30,.7)');
}
// filter on the pixel canvas (so it is part of the scene on screen and in the export)
function drawFilter(g, W, H) {
  if (ST.filter === 'none') return;
  g.save();
  if (ST.filter === 'warm') { g.globalCompositeOperation = 'multiply'; g.globalAlpha = 0.5; g.fillStyle = '#ffc48a'; g.fillRect(0, 0, W, H); g.globalCompositeOperation = 'screen'; g.globalAlpha = 0.16; g.fillStyle = '#ff9a40'; g.fillRect(0, 0, W, H); }
  else if (ST.filter === 'cool') { g.globalCompositeOperation = 'multiply'; g.globalAlpha = 0.5; g.fillStyle = '#9ac8ff'; g.fillRect(0, 0, W, H); g.globalCompositeOperation = 'screen'; g.globalAlpha = 0.12; g.fillStyle = '#3c78ff'; g.fillRect(0, 0, W, H); }
  else if (ST.filter === 'night') {
    g.globalCompositeOperation = 'multiply'; g.globalAlpha = 0.6; g.fillStyle = '#4a5aa8'; g.fillRect(0, 0, W, H);
    g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
    const gr = g.createRadialGradient(W / 2, H / 2, H * 0.25, W / 2, H / 2, H * 0.85); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(5,0,25,.7)'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
  }
  g.restore();
}

// --- compositing: pixel canvas ×scale (nearest) + overlay, at screen resolution ×mult ---
function compose(ctx, mult = 1) {
  const cv = document.getElementById('c'), ui = document.getElementById('ui');
  const W = Math.max(1, Math.round(ui.width * mult)), H = Math.max(1, Math.round(ui.height * mult));
  const oc = document.createElement('canvas'); oc.width = W; oc.height = H; const g = oc.getContext('2d');
  g.imageSmoothingEnabled = false; g.drawImage(cv, 0, 0, W, H);
  if (!ST.open) drawFilter(g, W, H);                      // closed: the scene does not carry the filter yet
  const decoOnUi = ST.open && !ST.hideHud;              // while open, drawUI already put the frame/sticker on the overlay
  if (!ST.hideHud) { g.imageSmoothingEnabled = mult !== 1; g.drawImage(ui, 0, 0, W, H); }
  if (!decoOnUi) {
    drawDeco(g, W, H, ctx);
    if (ST.wave && ST.cam) drawWave(g, ctx, ST.cam.cx, ST.cam.cy, ST.cam.scale * mult);
  }
  return oc;
}
const stamp = () => { const d = new Date(), p = n => String(n).padStart(2, '0'); return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`; };
function toBlob(cv) { return new Promise(res => cv.toBlob(b => res(b), 'image/png')); }
function countShot(ctx, doneText) {
  const T = L(ctx), ps = sysSave(ctx), sv = ctx.S.save;
  ps.count = (ps.count || 0) + 1;
  sv.achievements = sv.achievements || [];
  if (!sv.achievements.includes('photographer')) { sv.achievements.push('photographer'); ctx.toast(T.cheese, true); setTimeout(() => ctx.toast(T.ach), 1800); }
  else ctx.toast(doneText);
  ctx.persist(); try { ctx.sfx('pickup'); } catch (e) { }
  refreshCount(ctx);
}
async function download(ctx) {
  const T = L(ctx);
  try {
    const blob = await toBlob(compose(ctx, 1)); if (!blob) throw new Error('no blob');
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `seismic-9lands-${(ctx.S.zone && ctx.S.zone.id) || 'land'}-${stamp()}.png`;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    countShot(ctx, T.saved);
  } catch (e) { console.error('photo', e); ctx.toast(T.copyFail); }
}
async function copy(ctx) {
  const T = L(ctx);
  try {
    const blob = await toBlob(compose(ctx, 1)); if (!blob || !navigator.clipboard || !window.ClipboardItem) throw new Error('clipboard unavailable');
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
    countShot(ctx, T.copied);
  } catch (e) { ctx.toast(T.copyFail); }
}

// --- panel ----------------------------------------------------------------------
const BS = 'width:auto;margin:0;padding:5px 9px;font-size:12px;border-radius:7px;line-height:1.2';
const opts = (key, list, names, cur) => `<div style="display:flex;flex-wrap:wrap;gap:4px">${list.map(v => `<button class="btn${v === cur ? ' primary' : ''}" data-set="${key}" data-v="${v}" style="${BS}">${esc(names[v])}</button>`).join('')}</div>`;
const row = (label, inner) => `<div style="display:flex;gap:8px;align-items:center;margin:5px 0"><span class="dim" style="width:52px;flex:0 0 auto;font-size:12px">${label}</span>${inner}</div>`;
function buildPanel(ctx) {
  const T = L(ctx), ps = sysSave(ctx);
  const html = `<h2 style="font-size:16px;margin:0">📷 ${T.title}<span class="chip" id="ph-count">${T.shots(ps.count || 0)}</span></h2>
    <img id="ph-prev" alt="" style="display:block;max-width:100%;max-height:30vh;margin:6px auto 2px;background:#000;border-radius:8px;border:1px solid var(--line)">
    ${row(T.frame, opts('frame', FRAMES, T.frames, ST.frame))}
    ${row(T.sticker, opts('sticker', STICKERS, T.stickers, ST.sticker))}
    ${row(T.filter, opts('filter', FILTERS, T.filters, ST.filter))}
    ${row(T.pose, `<div style="display:flex;flex-wrap:wrap;gap:4px">
      <button class="btn" data-dir="1" style="${BS}">◀</button><button class="btn" data-dir="3" style="${BS}">▲</button><button class="btn" data-dir="0" style="${BS}">▼</button><button class="btn" data-dir="2" style="${BS}">▶</button>
      <button class="btn${ST.wave ? ' primary' : ''}" data-set="wave" data-v="toggle" style="${BS}">${T.wave}</button>
      <button class="btn${ST.hideHud ? ' primary' : ''}" data-set="hideHud" data-v="toggle" style="${BS}">${T.hud}</button></div>`)}
    <div style="display:flex;gap:6px;margin-top:6px">
      <button class="btn primary" id="ph-dl" style="margin:0;padding:9px 6px;font-size:13px">${T.download}</button>
      <button class="btn" id="ph-copy" style="margin:0;padding:9px 6px;font-size:13px">${T.copy}</button>
      <button class="btn" id="ph-close" style="margin:0;padding:9px 6px;font-size:13px;width:auto">${T.close}</button>
    </div>
    <p class="dim tiny" style="margin:6px 0 0">${T.hint}</p>`;
  const el = ctx.panel('photo', html);
  // dock bottom-right, let clicks pass through to nothing else (the .ov is full-screen)
  el.style.cssText = 'justify-content:flex-end;align-items:flex-end;pointer-events:none;background:transparent;padding:10px';
  el.panel.style.cssText = 'pointer-events:auto;width:min(330px,100%);max-height:calc(100vh - 20px);overflow:auto;padding:12px;background:rgba(26,22,38,.94)';
  el.panel.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.set) { const k = b.dataset.set, v = b.dataset.v; set(ctx, { [k]: v === 'toggle' ? !ST[k] : v }); }
    else if (b.dataset.dir !== undefined) { ctx.S.player.dir = +b.dataset.dir; }
    else if (b.id === 'ph-dl') download(ctx);
    else if (b.id === 'ph-copy') copy(ctx);
    else if (b.id === 'ph-close') close(ctx);
  });
  ST.el = el;
  return el;
}
function refreshCount(ctx) { const c = ST.el && ST.el.querySelector('#ph-count'); if (c) c.textContent = L(ctx).shots(sysSave(ctx).count || 0); }
function syncButtons() {
  if (!ST.el) return;
  for (const b of ST.el.querySelectorAll('[data-set]')) { const k = b.dataset.set, v = b.dataset.v; b.classList.toggle('primary', v === 'toggle' ? !!ST[k] : ST[k] === v); }
}
function set(ctx, o) {
  for (const k of ['frame', 'sticker', 'filter']) if (o[k] !== undefined) ST[k] = String(o[k]);
  if (!FRAMES.includes(ST.frame)) ST.frame = 'none'; if (!STICKERS.includes(ST.sticker)) ST.sticker = 'none'; if (!FILTERS.includes(ST.filter)) ST.filter = 'none';
  if (o.wave !== undefined) ST.wave = !!o.wave;
  if (o.hideHud !== undefined) { ST.hideHud = !!o.hideHud; applyHud(); }
  if (o.pose !== undefined && ctx && ctx.S.player) { const d = { down: 0, left: 1, right: 2, up: 3 }[o.pose]; ctx.S.player.dir = d !== undefined ? d : (+o.pose || 0); }
  syncButtons();
}
function applyHud() {
  const h = document.getElementById('hud'); if (h) h.style.visibility = ST.open && ST.hideHud ? 'hidden' : '';
  const s = document.getElementById('seis'); if (s) s.style.visibility = ST.open ? 'hidden' : ''; // the seismograph widget sits where the corner sticker goes (screen only; it is never in the export)
}
function preview(ctx) {
  if (!ST.open || !ST.el || ST.busyRender) return;
  ST.busyRender = true;
  try { const img = ST.el.querySelector('#ph-prev'); if (img) img.src = compose(ctx, 0.5).toDataURL('image/png'); } catch (e) { }
  ST.busyRender = false;
}

// --- open / close ------------------------------------------------------------------
function open(ctx) {
  if (ST.open || ctx.S.mode !== 'play') return;
  ST.open = true;
  if (!ST.closerSet) { ctx.registerCloser('photo', () => close(ctx)); ctx.onAction('photo', () => download(ctx)); ST.closerSet = true; }
  ctx.setMode('photo');
  const p = ctx.S.player; ST.prevSpeed = p.speedMul; p.speedMul = 0; p.moving = false;
  ST.busy = new Map(); for (const n of ctx.allNpcs()) { ST.busy.set(n, n.busy); n.busy = true; n.moving = false; }
  buildPanel(ctx).hidden = false;
  applyHud();
  preview(ctx); ST.timer = setInterval(() => preview(ctx), 300);
}
function close(ctx) {
  if (!ST.open) return;
  ST.open = false;
  if (ST.timer) { clearInterval(ST.timer); ST.timer = null; }
  if (ST.el) ST.el.hidden = true;
  const p = ctx.S.player; if (p) p.speedMul = ST.prevSpeed == null ? 1 : ST.prevSpeed;
  if (ST.busy) { for (const [n, b] of ST.busy) if (n) n.busy = b; ST.busy = null; }
  applyHud();
  if (ctx.S.mode === 'photo') ctx.setMode('play');
}

// --- test hooks ---------------------------------------------------------------------
window.__photo = {
  open: () => CTX && open(CTX), close: () => CTX && close(CTX),
  render: () => CTX ? compose(CTX, 1).toDataURL('image/png') : null,
  set: o => { set(CTX, o || {}); return { frame: ST.frame, sticker: ST.sticker, filter: ST.filter, wave: ST.wave, hideHud: ST.hideHud }; },
  state: () => ({ open: ST.open, frame: ST.frame, sticker: ST.sticker, filter: ST.filter, wave: ST.wave, hideHud: ST.hideHud, count: CTX ? sysSave(CTX).count : 0 }),
  download: () => CTX && download(CTX), copy: () => CTX && copy(CTX)
};

export const photo = {
  id: 'photo',
  update(dt, ctx) { CTX = ctx; if (ST.open && ctx.S.mode !== 'photo') close(ctx); /* someone else changed mode (e.g. zone change) */ },
  onZoneLeave(ctx) { CTX = ctx; if (ST.open) close(ctx); },
  key(code, ctx) {
    CTX = ctx;
    if (!ST.open) { if (code === 'KeyP' && ctx.S.mode === 'play') { open(ctx); return true; } return false; }
    if (ctx.S.mode !== 'photo') return false;
    const DIR = { ArrowLeft: 1, KeyA: 1, ArrowRight: 2, KeyD: 2, ArrowUp: 3, KeyW: 3, ArrowDown: 0, KeyS: 0 };
    if (DIR[code] !== undefined) { ctx.S.player.dir = DIR[code]; return true; }
    if (code === 'KeyP') { close(ctx); return true; }
    if (code === 'KeyH') { set(ctx, { hideHud: !ST.hideHud }); return true; }
    if (code === 'KeyV') { set(ctx, { wave: !ST.wave }); return true; }
    return false;
  },
  draw(g, ctx) { if (ST.open) drawFilter(g, ctx.VW, ctx.VH); },
  drawUI(ug, ctx, cx, cy, scale) {
    ST.cam = { cx, cy, scale };
    if (!ST.open) return;
    drawDeco(ug, ug.canvas.width, ug.canvas.height, ctx);
    if (ST.wave) drawWave(ug, ctx, cx, cy, scale);
  },
  hudLines() { return []; }
};
