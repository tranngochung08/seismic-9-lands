/* album.js — plan-44 đợt D (R6): ALBUM ẢNH của chế độ chụp (photo.js).
   · Mỗi lần Tải PNG / Sao chép ở chế độ chụp → lưu 1 bản vào album: ảnh PNG cạnh dài ≤ 1280 px (thu nhỏ kiểu pixel, không nhoè) + ảnh nhỏ JPEG 240 px cho lưới.
   · Giữ 12 ảnh gần nhất trong IndexedDB ('seismic9-album'); trình duyệt chặn / lỗi IndexedDB → giữ tạm trong bộ nhớ (mất khi tải lại trang), game vẫn chạy.
   · Đóng = nút ✕ của bảng (hud.js gắn, phát Esc → photo.js đóng album, về bảng chụp).
   · Xem lại: lưới ảnh → chạm xem to → Tải · Chia sẻ (Web Share API có file → bảng chia sẻ của điện thoại; không có → sao chép ảnh, không được nữa thì tải) · Xoá (chạm 2 lần).
   · Không đụng save (đếm ảnh vẫn là save.sys.photo.count của photo.js). */
const DB = 'seismic9-album', STORE = 'shots', MAX = 12, BIG = 1280, THUMB = 240;
const STR = {
  vi: { title: 'Album ảnh', empty: 'Chưa có ảnh nào. Bấm 📷 Tải PNG hoặc 📋 Sao chép để chụp — ảnh sẽ tự vào album (giữ 12 ảnh gần nhất).', keep: n => `${n}/12 ảnh gần nhất · lưu trên máy này`,
    back: '← Album', close: 'Đóng', dl: '⬇ Tải', share: '📤 Chia sẻ', del: '🗑 Xoá', delAsk: 'Chạm lần nữa để xoá', deleted: 'Đã xoá ảnh', shared: 'Đã mở bảng chia sẻ', copied: 'Đã sao chép ảnh — dán vào nơi muốn gửi', saved: 'Đã tải ảnh về máy',
    mem: 'Trình duyệt không cho lưu lâu — album chỉ giữ tới khi tải lại trang', open: n => `🖼 Album (${n})`, shareText: z => `${z} — Seismic: 9 Lands` },
  en: { title: 'Photo album', empty: 'No photos yet. Press 📷 Download PNG or 📋 Copy to take one — it goes into the album automatically (the 12 newest are kept).', keep: n => `${n}/12 newest photos · stored on this device`,
    back: '← Album', close: 'Close', dl: '⬇ Download', share: '📤 Share', del: '🗑 Delete', delAsk: 'Tap again to delete', deleted: 'Photo deleted', shared: 'Share sheet opened', copied: 'Photo copied — paste it wherever you like', saved: 'Photo downloaded',
    mem: 'This browser blocks long-term storage — the album lasts until the page reloads', open: n => `🖼 Album (${n})`, shareText: z => `${z} — Seismic: 9 Lands` }
};
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* ---------- lưu trữ ---------- */
let DBP = null, MEMORY = false;
const MEM = [];   /* dự phòng khi không có IndexedDB */
let NEXT_ID = 1;
function db() {
  if (DBP) return DBP;
  DBP = new Promise((res, rej) => {
    try {
      if (typeof indexedDB === 'undefined') throw new Error('no indexedDB');
      const r = indexedDB.open(DB, 1);
      r.onupgradeneeded = () => { try { r.result.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true }); } catch (e) { } };
      r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); r.onblocked = () => rej(new Error('blocked'));
    } catch (e) { rej(e); }
  }).catch(e => { console.warn('album: IndexedDB off →', e && e.message); MEMORY = true; return null; });
  return DBP;
}
function req(store, fn) { return new Promise((res, rej) => { try { const r = fn(store); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); } catch (e) { rej(e); } }); }
async function tx(mode, fn) { const d = await db(); if (!d) return null; const t = d.transaction(STORE, mode), st = t.objectStore(STORE); const out = await fn(st); await new Promise((res, rej) => { t.oncomplete = res; t.onerror = () => rej(t.error); t.onabort = () => rej(t.error); }); return out; }

export async function list() {
  try { const d = await db(); if (d) { const all = await tx('readonly', st => req(st, s => s.getAll())); return (all || []).sort((a, b) => b.t - a.t); } } catch (e) { console.warn('album list', e); MEMORY = true; }
  return MEM.slice().sort((a, b) => b.t - a.t);
}
export async function count() { return (await list()).length; }
export async function remove(id) {
  try { const d = await db(); if (d) { await tx('readwrite', st => req(st, s => s.delete(id))); return true; } } catch (e) { console.warn('album del', e); }
  const i = MEM.findIndex(r => r.id === id); if (i >= 0) MEM.splice(i, 1); return true;
}
/* thu nhỏ kiểu pixel: chỉ chia nguyên (÷2, ÷3…) cho nét đều; không chia đều được thì nearest */
function shrink(cv, maxSide, smooth) {
  const k = Math.max(cv.width, cv.height) / maxSide; if (k <= 1) return cv;
  const div = smooth ? k : Math.ceil(k), w = Math.max(1, Math.round(cv.width / div)), h = Math.max(1, Math.round(cv.height / div));
  const o = document.createElement('canvas'); o.width = w; o.height = h; const g = o.getContext('2d'); g.imageSmoothingEnabled = !!smooth; if (smooth) g.imageSmoothingQuality = 'high'; g.drawImage(cv, 0, 0, w, h); return o;
}
const toBlob = (cv, type, q) => new Promise(res => { try { cv.toBlob(b => res(b), type, q); } catch (e) { res(null); } });
const blobToURL = b => new Promise(res => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.onerror = () => res(null); fr.readAsDataURL(b); });
const urlToBlob = async u => { try { return await (await fetch(u)).blob(); } catch (e) { return null; } };

/* thêm 1 ảnh (canvas đã ghép đủ khung / nhãn) → id; ảnh y hệt ảnh mới nhất (tải rồi sao chép cùng một cảnh) thì không thêm lần nữa */
export async function add(cv, meta = {}) {
  try {
    const thumb = shrink(cv, THUMB, true).toDataURL('image/jpeg', 0.82);
    const last = (await list())[0]; if (last && last.thumb === thumb && Date.now() - last.t < 10 * 60e3) return last.id;
    const big = shrink(cv, BIG, false), blob = await toBlob(big, 'image/png'); if (!blob) return null;
    const rec = { t: Date.now(), zone: meta.zone || '', zname: meta.zname || '', w: big.width, h: big.height, blob, thumb };
    let id = null;
    try { const d = await db(); if (d) id = await tx('readwrite', st => req(st, s => s.add(rec))); }
    catch (e) {   /* vài trình duyệt (chế độ riêng tư cũ) không cất được Blob → cất dạng dataURL */
      try { const r2 = { ...rec, blob: null, url: await blobToURL(blob) }; id = await tx('readwrite', st => req(st, s => s.add(r2))); } catch (e2) { console.warn('album add', e2); MEMORY = true; }
    }
    if (id == null) { rec.id = NEXT_ID++; MEM.push(rec); id = rec.id; while (MEM.length > MAX) MEM.splice(MEM.indexOf(MEM.reduce((a, b) => (a.t <= b.t ? a : b))), 1); return id; }
    const all = await list(); for (const r of all.slice(MAX)) await remove(r.id);   /* chỉ giữ 12 ảnh gần nhất */
    return id;
  } catch (e) { console.warn('album add', e); return null; }
}
async function blobOf(rec) { return rec.blob || (rec.url ? await urlToBlob(rec.url) : null); }
const fname = rec => { const d = new Date(rec.t), p = n => String(n).padStart(2, '0'); return `seismic-9lands-${rec.zone || 'land'}-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}.png`; };
async function download(rec) {
  const b = await blobOf(rec); if (!b) return false;
  const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = fname(rec); document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); return true;
}
/* Chia sẻ: Web Share có file (điện thoại) → sao chép ảnh → tải về */
export async function share(rec, T) {
  const b = await blobOf(rec); if (!b) return 'fail';
  try {
    const file = new File([b], fname(rec), { type: 'image/png' });
    if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: 'Seismic · 9 Lands', text: T.shareText(rec.zname || '') }); return 'shared'; }
  } catch (e) { if (e && e.name === 'AbortError') return 'abort'; }
  try { if (navigator.clipboard && window.ClipboardItem) { await navigator.clipboard.write([new ClipboardItem({ 'image/png': b })]); return 'copied'; } } catch (e) { }
  return (await download(rec)) ? 'downloaded' : 'fail';
}

/* ---------- giao diện ---------- */
const UI = { ctx: null, el: null, open: false, view: null, urls: [], recs: [], delArm: 0, onClose: null };
const T = () => STR[UI.ctx && UI.ctx.lang() === 'vi' ? 'vi' : 'en'];
const toast = s => { try { UI.ctx.toast(s); } catch (e) { } };
function freeURLs() { for (const u of UI.urls) URL.revokeObjectURL(u); UI.urls = []; }
const when = t => { const d = new Date(t), p = n => String(n).padStart(2, '0'); return `${p(d.getDate())}/${p(d.getMonth() + 1)} ${p(d.getHours())}:${p(d.getMinutes())}`; };
async function render() {
  if (!UI.open || !UI.el) return;
  const t = T(), recs = UI.recs = await list(), P = UI.el.panel; freeURLs();
  if (UI.view != null) {
    const r = recs.find(x => x.id === UI.view); if (!r) { UI.view = null; return render(); }
    const b = await blobOf(r), src = b ? URL.createObjectURL(b) : r.thumb; if (b) UI.urls.push(src);
    P.innerHTML = `<div class="al-head"><button class="btn" data-a="back">${t.back}</button><span class="dim">${esc(r.zname)} · ${when(r.t)}</span></div>
      <img class="al-big" src="${src}" alt="">
      <div class="al-acts"><button class="btn primary" data-a="share">${t.share}</button><button class="btn" data-a="dl">${t.dl}</button><button class="btn al-del" data-a="del">${t.del}</button></div>`;
  } else {
    P.innerHTML = `<div class="al-head"><h2>🖼 ${t.title}</h2></div>
      <p class="dim tiny al-note">${recs.length ? t.keep(recs.length) : ''}${MEMORY ? ' · ' + t.mem : ''}</p>
      ${recs.length ? `<div class="al-grid">${recs.map(r => `<button class="al-cell" data-id="${r.id}"><img src="${r.thumb}" alt=""><i>${esc(r.zname)}<br>${when(r.t)}</i></button>`).join('')}</div>` : `<p class="al-empty">${t.empty}</p>`}`;
  }
}
async function onClick(e) {
  const b = e.target.closest('[data-a], .al-cell'); if (!b) return; const t = T();
  if (b.classList.contains('al-cell')) { UI.view = +b.dataset.id; UI.delArm = 0; return render(); }
  const a = b.dataset.a, r = UI.recs.find(x => x.id === UI.view);
  if (a === 'close') return close();
  if (a === 'back') { UI.view = null; return render(); }
  if (!r) return;
  if (a === 'dl') { if (await download(r)) toast(t.saved); }
  else if (a === 'share') { const k = await share(r, t); if (k === 'copied') toast(t.copied); else if (k === 'downloaded') toast(t.saved); }
  else if (a === 'del') {
    if (performance.now() - UI.delArm > 2500) { UI.delArm = performance.now(); b.textContent = t.delAsk; b.classList.add('arm'); return; }
    UI.delArm = 0; await remove(r.id); toast(t.deleted); UI.view = null; render(); if (UI.onCount) UI.onCount();
  }
}
export function openAlbum(ctx, opts = {}) {
  UI.ctx = ctx; UI.onClose = opts.onClose || null; UI.onCount = opts.onCount || null;
  if (!UI.el) { UI.el = ctx.panel('album', ''); UI.el.classList.add('al-ov'); UI.el.panel.classList.add('al-panel'); UI.el.panel.addEventListener('click', onClick); }
  UI.open = true; UI.view = null; UI.el.hidden = false; render();
}
export function close() {
  if (!UI.open) return; UI.open = false; freeURLs(); if (UI.el) UI.el.hidden = true;
  const f = UI.onClose; UI.onClose = null; if (f) f();
}
export const isOpen = () => UI.open;
if (typeof window !== 'undefined') window.__album = { list: async () => (await list()).map(r => ({ id: r.id, t: r.t, zone: r.zone, w: r.w, h: r.h, blob: !!r.blob, size: r.blob ? r.blob.size : 0 })), count, remove, isOpen, memory: () => MEMORY, view: id => { UI.view = id; return render(); }, close };
