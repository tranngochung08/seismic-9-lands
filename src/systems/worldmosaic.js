/* worldmosaic.js — 2026-10-14 (plan-33 mục 13, anh thử điện thoại): lên cao thấy TOÀN CẢNH — các map kề ghép liền đúng vị trí thật thành 1 bản đồ thế giới.
   Hệ 'worldmosaic' (always) chỉ lo CHỤP vùng đang chơi (ruộng, nhà nâng cấp, đồ bị phá) để vùng kề phản ánh đúng thế giới của save; còn vẽ thì sky.js gọi drawMosaic.

   · BỐ CỤC: data/worldlayout.json (tools/build-worldlayout.js): Biển · Làng ↑ đèo1 ↑ M1 … ↑ đèo9 ↑ M9, căn cột giữa (lối đất luôn ở cột giữa).
     Làng = (0,0), Bắc = y âm. Biển nằm dưới Làng và LẬT DỌC (flip) vì lối thật nối mép NAM Làng ↔ mép NAM Biển (bến cảng).
     Đứng ở Biển (hoặc trời Biển) → khung 'mirror': cả thế giới lật dọc quanh Biển → Làng hiện phía Nam bến, đúng đường đi. Ảnh lật được DỰNG LẠI từ bản đồ lật (vật vẫn đứng thẳng).
   · ẢNH VÙNG (theo thứ tự ưu tiên): RAM → ảnh CHỤP của save này (IndexedDB, ½ + ¼) → ảnh dựng sẵn ¼ WebP (assets/px/worldmap/<vùng>[_f]_4.webp)
     → vẽ lúc chạy (cắt lát ≤ ~5 ms / khung). Bậc ⅛ luôn suy từ ¼ (80 KB / vùng, giữ mãi). Bậc ½ chỉ có từ ảnh chụp, hoặc vẽ lúc chạy cho vùng KỀ vùng giữa.
   · ĐẤT NGOÀI MAP (khe 2 bên đèo + rìa thế giới): ảnh 'đất độn' dựng sẵn fill_<vùng>_<L|R|T|B>[_f]_4.webp — địa hình THỦ TỤC theo chính bộ ô / vật của vùng đó
     (nhiễu theo toạ độ thế giới → không lặp, không đối xứng; khe đèo = khối vách / rừng dày như sống núi liền), mật độ giảm dần ra ngoài rồi chìm vào TƯỜNG SƯƠNG.
   · RAM ảnh: mặc định 16 MB (điện thoại / máy ≤ 4 GB: 9 MB) — bỏ ½ rồi ¼ của vùng không còn trên màn trước. IndexedDB: ≤ 6 MB toàn bộ, bỏ ảnh cũ nhất.
   · API: drawMosaic(g, ctx, { centerZone, camWorldX, camWorldY, scale, VW, VH, haze, anchorX?, anchorY?, col?, drawCenter?, time? }) → { drawn, pending, lv, mirror } | false
         camWorldX / camWorldY = toạ độ TRONG vùng centerZone (như player.x / y) của điểm hiện ở (anchorX, anchorY) trên màn (mặc định giữa màn).
       zoneWorldOffset · localToWorld · worldToZone · mosaicSnapshot(ctx) · mosaicStats · mosaicConfig({ budgetMB }) · mosaicReset · mosaicPrewarm
       renderThumbCanvases / renderFillerCanvas (cho tools/build-worldthumbs.js) · layoutReady
*/
import { ART, enterZone as artEnterZone, mapBuilt as artMapBuilt } from '../art.js';
import { tiles as TILES, O, T, rngFrom, hashStr } from '../gfx.js';
import { ZONES, ROADS, ROAD } from '../world.js';
import { fogTint, mixHex, THEME } from './sky.js';

const TS = 16, LW = 80, LH = 64, FWT = 20, FW = FWT * TS, FOG_D = 28 * TS;
const SKYB = s => (s === 'sky' ? 'village' : /^sky_(sea|m[1-9]|road[1-9])$/.test(s || '') ? s.slice(4) : s);   /* trời → vùng dưới (như sky.js BELOW_OF) */
const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

/* ---------------- bố cục + khung nhìn ---------------- */
function fallbackLayout() {   /* cùng luật với tools/build-worldlayout.js */
  const RW = ROAD.W, RH = ROAD.len + 6, zones = {};
  const size = z => (/^road/.test(z) ? [RW, RH] : [LW, LH]);
  const link = z => { if (z === 'village') return { n: 'road1', s: 'sea' };
    const R = ROADS.find(r => r.id === z); if (R) return { n: R.upper, s: R.lower };
    const m = /^m([1-9])$/.exec(z); if (m) { const n = +m[1]; return { n: n < 9 ? 'road' + (n + 1) : null, s: 'road' + n }; } return {}; };
  const put = (z, x, y) => { const [tw, th] = size(z); zones[z] = { x, y, w: tw * TS, h: th * TS, tw, th, ...link(z), kind: z === 'sea' ? 'sea' : /^road/.test(z) ? 'road' : 'land' }; };
  put('village', 0, 0); let cur = 'village';
  for (let i = 0; i < 40; i++) { const nx = link(cur).n; if (!nx || zones[nx]) break; const [tw, th] = size(nx); put(nx, (LW * TS - tw * TS) / 2, zones[cur].y - th * TS); cur = nx; }
  put('sea', 0, LH * TS); zones.sea.flip = true; zones.sea.n = 'village';
  const v = Object.values(zones);
  return { zones, band: { x0: 0, x1: LW * TS }, bounds: { x0: 0, y0: Math.min(...v.map(r => r.y)), x1: LW * TS, y1: Math.max(...v.map(r => r.y + r.h)) }, src: 'fallback' };
}
let LAY = fallbackLayout(); const FR = {};
export const layoutReady = (() => { try { return fetch(new URL('../../data/worldlayout.json', import.meta.url)).then(r => (r.ok ? r.json() : null)).then(j => { if (j && j.zones && j.zones.village) { j.src = 'json'; LAY = j; FR.n = FR.m = null; } return LAY.src; }).catch(() => LAY.src); } catch (e) { return Promise.resolve(LAY.src); } })();
export const worldLayout = () => LAY;
function frame(mirror) {   /* khung nhìn: thường (Làng làm gốc) hoặc gương (đứng ở Biển) — mỗi vùng: chữ nhật + lật hay không */
  const k = mirror ? 'm' : 'n'; if (FR[k]) return FR[k]; const BD = LAY.bounds, zones = [];
  for (const [z, r] of Object.entries(LAY.zones)) zones.push([z, mirror ? { ...r, y: -r.y - r.h, flip: !r.flip } : { ...r, flip: !!r.flip }]);
  const ys = zones.map(([, r]) => r.y), ye = zones.map(([, r]) => r.y + r.h);
  return (FR[k] = { mirror, zones, by: Object.fromEntries(zones), band: LAY.band || { x0: 0, x1: LW * TS }, bounds: mirror ? { x0: BD.x0, x1: BD.x1, y0: -BD.y1, y1: -BD.y0 } : BD,
    top: zones[ys.indexOf(Math.min(...ys))][0], bot: zones[ye.indexOf(Math.max(...ye))][0] });
}
export const mosaicFrame = z => frame(!!(LAY.zones[SKYB(z)] || {}).flip);   /* khung nhìn khi đứng ở vùng z: { mirror, zones, by, band, bounds } */
export function zoneWorldOffset(z) { const r = LAY.zones[SKYB(z)]; return r ? { x: r.x, y: r.y, flip: !!r.flip } : null; }
export function localToWorld(z, lx, ly) { const r = LAY.zones[SKYB(z)]; return r ? { x: r.x + lx, y: r.flip ? r.y + r.h - ly : r.y + ly } : null; }
export function worldToZone(wx, wy) { for (const [z, r] of Object.entries(LAY.zones)) if (wx >= r.x && wy >= r.y && wx < r.x + r.w && wy < r.y + r.h) return { zone: z, x: wx - r.x, y: r.flip ? r.y + r.h - wy : wy - r.y, flip: !!r.flip }; return null; }
const vkey = (z, flip) => (flip ? z + '_f' : z);

/* ---------------- cache RAM ---------------- */
const lowMem = (() => { try { return (navigator.deviceMemory && navigator.deviceMemory <= 4) || matchMedia('(pointer: coarse)').matches || Math.min(screen.width, screen.height) < 600; } catch (e) { return false; } })();   /* điện thoại / máy yếu */
const C = { th: new Map(), fill: new Map(), budget: (lowMem ? 9 : 16) * 1048576, frame: 0, center: null, job: null, jobs: [], scratch: null, lastJob: -999,
  stats: { builds: 0, ms: [], slices: [], mapMs: [], evict: 0, loads: 0, loadMs: [], idbLoads: 0, idbPuts: 0, snaps: 0, snapMs: [] } };
const ASSET = f => new URL('../../assets/px/worldmap/' + f, import.meta.url).href;
const GUESS = { sea: '#3f86b8', village: '#5f9a4a', m1: '#d9c48a', m2: '#6aa04e', m3: '#3f6e3a', m4: '#6c6870', m5: '#9a7a52', m6: '#8a8a92', m7: '#4a3a36', m8: '#dfe8ee', m9: '#3a2f5a' };
const guessCol = z => GUESS[z] || (/^road(\d)/.test(z) ? GUESS[(ROADS[+z.slice(4) - 1] || {}).lower] : null) || '#6a8a6a';
const baseOf = vk => vk.replace(/_f$/, '');
const bytesOf = c => (c ? (c.naturalWidth || c.width) * (c.naturalHeight || c.height) * 4 : 0);
const entBytes = e => bytesOf(e.lv[2]) + bytesOf(e.lv[4]) + bytesOf(e.lv[8]);
const ent = vk => { let e = C.th.get(vk); if (!e) { e = { lv: {}, used: { 2: 0, 4: 0, 8: 0 }, loading: {}, miss: {}, src: {}, col: null, t: 0 }; C.th.set(vk, e); } return e; };
function total() { let b = 0; for (const e of C.th.values()) b += entBytes(e); for (const f of C.fill.values()) b += bytesOf(f.im); return b; }
function drop(e, lv) { const c = e.lv[lv]; if (!c) return; if (c.getContext) c.width = c.height = 0; e.lv[lv] = null; e.src[lv] = null; C.stats.evict++; }
function evict() {
  let b = total(); if (b <= C.budget) return;
  for (const lv of [2, 4]) {   /* bỏ bậc nét trước; vùng còn trên màn (dùng trong 2 khung gần nhất) không bỏ; bậc ⅛ giữ */
    const cand = [...C.th.values()].filter(e => e.lv[lv] && C.frame - e.used[lv] > 2 && (lv === 2 || e.lv[8])).sort((a, b2) => a.used[lv] - b2.used[lv]);
    for (const e of cand) { if (b <= C.budget) return; b -= bytesOf(e.lv[lv]); drop(e, lv); }
  }
  for (const [k, f] of [...C.fill.entries()].sort((a, b2) => a[1].used - b2[1].used)) { if (b <= C.budget) return; if (C.frame - f.used <= 2 || !f.im) continue; b -= bytesOf(f.im); C.fill.delete(k); }
}
function half(src) { const c = document.createElement('canvas'); c.width = Math.max(1, (src.naturalWidth || src.width) >> 1); c.height = Math.max(1, (src.naturalHeight || src.height) >> 1); const g = c.getContext('2d'); g.imageSmoothingEnabled = true; try { g.imageSmoothingQuality = 'high'; } catch (e) { } g.drawImage(src, 0, 0, c.width, c.height); return c; }
function avgCol(im, z) {
  try { const c = document.createElement('canvas'); c.width = 20; c.height = 16; const g = c.getContext('2d'); g.drawImage(im, 0, 0, 20, 16); const d = g.getImageData(0, 0, 20, 16).data; let r = 0, gg = 0, b = 0, n = 0;
    for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 200) { r += d[i]; gg += d[i + 1]; b += d[i + 2]; n++; }
    return n ? '#' + [r, gg, b].map(v => Math.round(v / n).toString(16).padStart(2, '0')).join('') : guessCol(z); } catch (e) { return guessCol(z); }
}
function setLv(vk, lv, im, src, t) {   /* nhận ảnh 1 bậc; ¼ → tự suy ⅛ */
  const e = ent(vk); if (e.lv[lv] && e.lv[lv] !== im) drop(e, lv); e.lv[lv] = im; e.src[lv] = src; e.used[lv] = C.frame; e.miss[lv] = false; if (t) e.t = Math.max(e.t, t);
  if (lv === 4) { if (e.lv[8]) drop(e, 8); e.lv[8] = half(im); e.src[8] = src; e.used[8] = C.frame; e.col = avgCol(e.lv[8], baseOf(vk)); }
  evict();
}
function loadImg(url, ok, bad) { const im = new Image(), t0 = now(); im.onload = () => { C.stats.loads++; C.stats.loadMs.push(Math.round(now() - t0)); if (C.stats.loadMs.length > 40) C.stats.loadMs.shift(); ok(im); }; im.onerror = bad; im.src = url; }

/* ---------------- IndexedDB: ảnh chụp theo save ---------------- */
const DB = { db: null, init: null, id: null, idx: new Map(), bytes: 0, cap: 6 * 1048576, off: false };
function saveId(ctx) { const s = ctx && ctx.S && ctx.S.save; if (!s) return null; s.sys = s.sys || {}; const w = s.sys.wm || (s.sys.wm = {}); if (!w.id) w.id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8); return w.id; }
function idbInit(ctx) {
  const id = saveId(ctx); if (!id) return null; if (DB.init && DB.id === id) return DB.init;
  DB.id = id; DB.idx = new Map();
  DB.init = new Promise(res => {
    try {
      if (DB.off || typeof indexedDB === 'undefined') { DB.off = true; return res(false); }
      const rq = indexedDB.open('seismic-worldmap', 1);
      rq.onupgradeneeded = () => { try { rq.result.createObjectStore('snap', { keyPath: 'k' }); } catch (e) { } };
      rq.onerror = () => { DB.off = true; res(false); };
      rq.onsuccess = () => { DB.db = rq.result; DB.bytes = 0;
        try { const cur = DB.db.transaction('snap', 'readonly').objectStore('snap').openCursor();
          cur.onsuccess = () => { const c = cur.result; if (!c) return res(true); const v = c.value; DB.bytes += v.size || 0;
            if (v.id === DB.id) { const e = DB.idx.get(v.vk) || {}; e[v.lv] = { t: v.t, hash: v.hash, k: v.k, size: v.size }; DB.idx.set(v.vk, e); } c.continue(); };
          cur.onerror = () => res(false); } catch (e) { res(false); } };
    } catch (e) { DB.off = true; res(false); }
  });
  return DB.init;
}
function idbGet(k) { return new Promise(res => { try { const r = DB.db.transaction('snap', 'readonly').objectStore('snap').get(k); r.onsuccess = () => res(r.result || null); r.onerror = () => res(null); } catch (e) { res(null); } }); }
function idbTrim() {   /* giữ tổng ≤ DB.cap: xoá bản cũ nhất (mọi save) */
  if (DB.bytes <= DB.cap || !DB.db) return;
  try { const all = []; const cur = DB.db.transaction('snap', 'readonly').objectStore('snap').openCursor();
    cur.onsuccess = () => { const c = cur.result; if (c) { all.push({ k: c.value.k, t: c.value.t, size: c.value.size || 0, id: c.value.id, vk: c.value.vk, lv: c.value.lv }); c.continue(); return; }
      all.sort((a, b) => a.t - b.t); const st = DB.db.transaction('snap', 'readwrite').objectStore('snap');
      for (const r of all) { if (DB.bytes <= DB.cap) break; st.delete(r.k); DB.bytes -= r.size; if (r.id === DB.id) { const e = DB.idx.get(r.vk); if (e) delete e[r.lv]; } } };
  } catch (e) { /* bỏ */ }
}
function idbPut(vk, lv, canvas, hash) {
  if (!DB.db || DB.off || !canvas.toBlob) return; const t = Date.now(), k = DB.id + '|' + vk + '|' + lv;
  try { canvas.toBlob(blob => { if (!blob) return; try { const old = (DB.idx.get(vk) || {})[lv];
    const tx = DB.db.transaction('snap', 'readwrite'); tx.objectStore('snap').put({ k, id: DB.id, vk, lv, t, hash, size: blob.size, blob });
    tx.oncomplete = () => { DB.bytes += blob.size - (old ? old.size || 0 : 0); const e = DB.idx.get(vk) || {}; e[lv] = { t, hash, k, size: blob.size }; DB.idx.set(vk, e); C.stats.idbPuts++; idbTrim(); }; } catch (e) { } }, 'image/webp', 0.86); } catch (e) { /* bỏ */ }
}
function idbLoad(vk, lv) {   /* ảnh chụp → RAM (bất đồng bộ) */
  const e = ent(vk), rec = (DB.idx.get(vk) || {})[lv]; if (!rec || !DB.db || e.loading[lv]) return false; e.loading[lv] = true;
  idbGet(rec.k).then(v => { if (!v || !v.blob) { e.loading[lv] = false; const x = DB.idx.get(vk); if (x) delete x[lv]; return; }
    const url = URL.createObjectURL(v.blob); loadImg(url, im => { URL.revokeObjectURL(url); e.loading[lv] = false; C.stats.idbLoads++; setLv(vk, lv, im, 'snap', v.t); e.hash = v.hash; }, () => { URL.revokeObjectURL(url); e.loading[lv] = false; const x = DB.idx.get(vk); if (x) delete x[lv]; }); });
  return true;
}

/* ---------------- vẽ 1 bản đồ (ô Wang + vật + hư hỏng / đổ nát) — cắt lát được ---------------- */
function ruinImg(ctx, o) {   /* như main.js ruinStage: đổ nát / hư ≤ ½ máu → ảnh PixelLab riêng của vật */
  if (!ART.ruinOf) return null; let st = null;
  if (o.ruined) st = 'ruin'; else if (o.hp != null) { if (o.hpMax) st = o.hp < o.hpMax ? 'dmg' : null; else { let mx = 0; try { mx = o.plot !== undefined && ctx.hpMax ? ctx.hpMax(o) : ctx.wreck && ctx.wreck.maxOf ? ctx.wreck.maxOf(o) : 0; } catch (e) { } st = mx && o.hp < mx && o.hp <= mx / 2 ? 'dmg' : null; } }
  return st ? ART.ruinOf(o.orig || o.type, st) : null;
}
function drawTileRows(m, g, r0, r1) {
  for (let ty0 = r0; ty0 < r1; ty0++) for (let tx0 = -1; tx0 <= m.w; tx0++) { const tx = Math.max(0, Math.min(m.w - 1, tx0)), ty = Math.max(0, Math.min(m.h - 1, ty0)), sx = tx0 * TS, sy = ty0 * TS, t = m.ground[ty * m.w + tx];
    if (!(ART.ground && ART.ground(g, m, tx, ty, sx, sy))) { const fr = TILES[t]; if (fr) g.drawImage(fr.pick ? fr.pick(tx, ty) : fr[0], sx, sy); } }
  if (ART.groundDone) ART.groundDone(g);
}
const objOrder = m => m.objects.filter(o => !o.ghost && O[o.type]).map(o => ({ o, y: o.ruined ? o.y * TS + 1 : (o.y + O[o.type].fh) * TS })).sort((a, b) => a.y - b.y).map(q => q.o);
function drawObj(ctx, g, o) {
  const d = O[o.type]; if (!d) return; const ri = o.__ri !== undefined ? o.__ri : ruinImg(ctx, o);   /* plan-42 A4: __ri = ảnh hư hỏng chốt lúc rời vùng (bản sao bản đồ) */
  try { if (ri) { const od = O[o.orig || o.type] || d; g.drawImage(ri, o.x * TS + (od.ox || 0), (o.y + od.fh) * TS - ri.height / (ART.hi || 1) + (od.oy || 0)); return; }
    const im = o.artImg || (d.frames ? d.frames[0] : d.img); if (!im) return; const by = (o.y + d.fh) * TS;
    g.drawImage(im, o.x * TS + (o.artImg ? 0 : (d.ox || 0)), by - (o.artImg ? im.height / (ART.hi || 1) : d.h) + (o.artImg ? 0 : (d.oy || 0))); } catch (e) { /* ảnh hỏng: bỏ */ }
}
function flipMap(m) {   /* lật dọc: nền đảo hàng, vật đặt lại vị trí nhưng vẫn ĐỨNG THẲNG (Wang tự nối lại) */
  const w = m.w, h = m.h, gr = new Uint8Array(w * h); for (let y = 0; y < h; y++) gr.set(m.ground.subarray((h - 1 - y) * w, (h - y) * w), y * w);
  const objects = m.objects.map(o => { const d = O[o.orig || o.type] || O[o.type], fh = d ? d.fh : 1; const c = Object.assign({}, o); c.y = h - o.y - fh; c.artImg = null; return c; });
  return { ...m, ground: gr, objects, solid: m.solid, flipped: true };
}
function liveGround(ctx, g, m, W, H, flip) {   /* lớp nền của hệ trên bản đồ đang chơi: ô đất cày (farm) + ao (ponds) */
  const px = Object.create(ctx); px.VW = W; px.VH = H;
  for (const s of (ctx.S && ctx.S.sys) || []) { if (!s.drawGround || !/^(farm|ponds)$/.test(s.id)) continue;
    g.save(); if (flip) g.setTransform(1, 0, 0, -1, 0, H); try { s.drawGround(g, px, 0, 0); } catch (e) { /* hệ không chịu vẽ ngoài khung: bỏ */ } g.restore(); }
}
/* JOB vẽ 1 vùng: { z, vk, flip, live, persist, lvs } — step() chạy tới khi hết ngân sách ms; xong thì nhận ảnh ½ ¼ (⅛ suy ra) */
function newJob(ctx, z, flip, o = {}) { return { z, vk: vkey(z, flip), flip, live: !!o.live, persist: !!o.persist, fresh: !!o.fresh, stage: 'map', row: -1, oi: 0, t0: now(), work: 0, hash: o.hash || null }; }
function stepJob(ctx, J, budget) {
  const t0 = now(), Z = ZONES[J.z]; if (!Z) { J.stage = 'done'; return true; }
  if (J.stage === 'map') {
    let m = J.copy ? J.copy.m : J.live ? ctx.S.map : null;   /* plan-42 A4: J.copy — chụp lúc rời vùng, vẽ dần sau */
    if (!m) { const saved = J.fresh ? {} : (((ctx.S && ctx.S.save && ctx.S.save.districts) || {})[J.z] || {}), ng = ctx.nationGroups ? ctx.nationGroups(Z.lv) : [];
      m = Z.build(rngFrom(hashStr(J.z)), { nations: ng.map((gg, i) => ({ key: gg.key, size: gg.members.length, tier: saved[i] && saved[i].tier })) }); C.stats.mapMs.push(Math.round(now() - t0)); if (C.stats.mapMs.length > 30) C.stats.mapMs.shift(); }
    J.src = m; J.m = J.flip ? flipMap(m) : m; J.W = m.w * TS; J.H = m.h * TS; J.objs = null; J.mb = !J.live || J.flip;
    if (!C.scratch || C.scratch.width < J.W || C.scratch.height < J.H) { if (C.scratch) C.scratch.width = 0; C.scratch = document.createElement('canvas'); C.scratch.width = Math.max(J.W, LW * TS); C.scratch.height = Math.max(J.H, LH * TS); }
    const g = C.scratch.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, C.scratch.width, C.scratch.height); g.imageSmoothingEnabled = false;
    J.stage = 'tiles'; J.row = -1; J.work += now() - t0; if (now() - t0 > budget * 0.6) { J.mapSlice = true; return false; }
  }
  const g = C.scratch.getContext('2d'), cur = ART.zone, needArt = J.stage === 'tiles' || J.stage === 'objs', swap = needArt && ART.on && cur !== J.z;
  if (swap) artEnterZone(J.z); if (J.mb && needArt) { artMapBuilt(J.m); J.mb = false; }
  g.save(); g.beginPath(); g.rect(0, 0, J.W, J.H); g.clip();
  try {
    while (J.stage === 'tiles' && now() - t0 < budget) { const r1 = Math.min(J.m.h + 1, J.row + 4); drawTileRows(J.m, g, J.row, r1); J.row = r1; if (J.row > J.m.h) { J.stage = 'objs'; if (J.copy) { if (J.copy.layer) g.drawImage(J.copy.layer, 0, 0); } else if (J.live) liveGround(ctx, g, J.src, J.W, J.H, J.flip); } }
    if (J.stage === 'objs') { J.objs = J.objs || objOrder(J.m); while (J.oi < J.objs.length && now() - t0 < budget) { const end = Math.min(J.objs.length, J.oi + 60); for (; J.oi < end; J.oi++) drawObj(ctx, g, J.objs[J.oi]); } if (J.oi >= J.objs.length) J.stage = 'down'; }
  } finally { g.restore(); if (swap) artEnterZone(cur); }
  if (J.stage === 'down' && now() - t0 < budget * 0.5) {   /* thu nhỏ thẳng từ canvas nháp (không chép), ½ một lát, ¼ ⅛ lát sau */
    if (!J.out) { const c = document.createElement('canvas'); c.width = J.W >> 1; c.height = J.H >> 1; const gg = c.getContext('2d'); gg.imageSmoothingEnabled = true; try { gg.imageSmoothingQuality = 'high'; } catch (e) { } gg.drawImage(C.scratch, 0, 0, J.W, J.H, 0, 0, c.width, c.height); J.out = { 2: c }; }
    else { J.out[4] = half(J.out[2]); J.out[8] = half(J.out[4]); J.stage = 'done'; }
  }
  J.work += now() - t0; if (!J.mapSlice) { C.stats.slices.push(+(now() - t0).toFixed(1)); if (C.stats.slices.length > 200) C.stats.slices.shift(); } J.mapSlice = false;
  return J.stage === 'done';
}
function finishJob(ctx, J) {
  if (!J.out) return; const src = J.live ? 'live' : 'build', t = Date.now();
  setLv(J.vk, 2, J.out[2], src, t); setLv(J.vk, 4, J.out[4], src, t); J.out[8].width = 0;
  const e = ent(J.vk); e.live = J.live; e.hash = J.hash;
  C.stats.builds++; C.stats.ms.push(Math.round(J.work)); if (C.stats.ms.length > 40) C.stats.ms.shift();
  if (J.persist) { idbPut(J.vk, 2, J.out[2], J.hash); idbPut(J.vk, 4, J.out[4], J.hash); C.stats.snaps++; }
}
function pumpJobs(ctx, budget) {
  if (!C.job) { C.jobs.sort((a, b) => (b.live ? 1 : 0) - (a.live ? 1 : 0)); C.job = C.jobs.shift() || null; }
  const J = C.job; if (!J) { if (C.scratch && C.frame - C.lastJob > 120) { C.scratch.width = C.scratch.height = 0; C.scratch = null; } return; }
  if (J.live && !J.copy && (!ctx.S || !ctx.S.zone || ctx.S.zone.id !== J.z)) { C.job = null; return; }   /* rời vùng giữa chừng: bỏ (onZoneLeave chụp đồng bộ) */
  let done = false; try { done = stepJob(ctx, J, budget); } catch (e) { console.error('worldmosaic job', J.vk, e); done = true; J.out = null; ent(J.vk).failed = true; }
  C.lastJob = C.frame; if (done) { C.job = null; finishJob(ctx, J); if (J.copy) { if (J.copy.layer) J.copy.layer.width = 0; J.copy = null; } }
}
const queued = vk => (C.job && C.job.vk === vk) || C.jobs.some(j => j.vk === vk);
function queue(ctx, z, flip, o = {}) { const vk = vkey(z, flip); if (queued(vk)) return; C.jobs.push(newJob(ctx, z, flip, o)); }
/* vẽ đồng bộ cả vùng (công cụ dựng sẵn / chụp lúc rời vùng) */
function runNow(ctx, z, flip, o = {}) { const J = newJob(ctx, z, flip, o); const sj = C.job; C.job = null; for (let i = 0; i < 100000 && !stepJob(ctx, J, 1e9); i++); C.job = sj;
  if (sj && sj.stage !== 'map') { sj.stage = 'map'; sj.row = -1; sj.oi = 0; sj.out = null; sj.objs = null; }   /* plan-42: canvas nháp vừa bị vẽ đè → việc cắt lát đang dở làm lại từ đầu */
  return J; }
export function renderThumbCanvases(ctx, z, o = {}) { if (!ZONES[z]) return null; const J = runNow(ctx, z, !!o.flip, { fresh: o.fresh, live: !o.fresh && ctx.S && ctx.S.zone && ctx.S.zone.id === z }); return J.out ? { ...J.out, live: J.live } : null; }

/* ---------------- ĐẤT ĐỘN thủ tục (chỉ dùng trong công cụ dựng sẵn): theo bộ ô / vật của chính vùng ---------------- */
const h3 = (x, y, s) => { let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(s | 0, 2246822519); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
function vnoise(x, y, sc, s) { const fx = x / sc, fy = y / sc, x0 = Math.floor(fx), y0 = Math.floor(fy), tx = fx - x0, ty = fy - y0, u = tx * tx * (3 - 2 * tx), v = ty * ty * (3 - 2 * ty);
  const a = h3(x0, y0, s), b = h3(x0 + 1, y0, s), c = h3(x0, y0 + 1, s), d = h3(x0 + 1, y0 + 1, s); return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; }
const fbm = (x, y, s) => vnoise(x, y, 9, s) * 0.6 + vnoise(x, y, 4, s + 7) * 0.3 + vnoise(x, y, 2, s + 13) * 0.1;
const PLAIN = new Set(['type', 'x', 'y', 'artImg']);
export function fillStyle(m, kind) {   /* thống kê ô + vật ở vùng VIỀN của bản đồ (rim: 2 cột mép · outer: 8 cột trong) */
  const w = m.w, h = m.h, C2 = w >> 1, isRoad = kind === 'road', rim = x => (isRoad ? x < C2 - 8 || x >= C2 + 8 : x < 2 || x >= w - 2), outer = x => (isRoad ? rim(x) : (x >= 2 && x < 10) || (x >= w - 10 && x < w - 2));
  const prof = test => { const gc = {}, oc = {}; let n = 0; for (let y = 2; y < h - 2; y++) for (let x = 0; x < w; x++) if (test(x)) { n++; const t = m.ground[y * w + x]; gc[t] = (gc[t] || 0) + 1; }
    const og = {}; for (const o of m.objects) { if (o.ghost || !test(o.x) || o.y < 2 || o.y >= h - 2) continue; const d = O[o.type]; if (!d || d.fw > 2 || d.fh > 2 || !Object.keys(o).every(k => PLAIN.has(k))) continue; oc[o.type] = (oc[o.type] || 0) + 1; (og[o.type] ||= {})[m.ground[(o.y + d.fh - 1) * w + o.x]] = 1; }
    const gl = Object.entries(gc).map(([t, c]) => [+t, c / n]).sort((a, b) => b[1] - a[1]).filter(q => q[1] > 0.02), ol = Object.entries(oc).map(([t, c]) => [t, c / n]).sort((a, b) => b[1] - a[1]);
    return { g: gl, o: ol, og, dens: ol.reduce((s, q) => s + q[1], 0) }; };
  return { rim: prof(rim), outer: prof(outer), kind };
}
function pickW(list, r) { let s = 0; for (const q of list) s += q[1]; let a = r * s; for (const q of list) { a -= q[1]; if (a <= 0) return q[0]; } return list.length ? list[list.length - 1][0] : null; }
/* bản đồ độn cho 1 dải (toạ độ ô THẾ GIỚI x0,y0, cỡ w×h, lề M ô để Wang nối mép); edge: (x,y) → khoảng cách (ô) tới đất thật · ridge: (x,y) → đang ở khe đèo */
function genFill(st, x0, y0, w, h, seed, edge, ridge) {
  const M = 2, W = w + 2 * M, H = h + 2 * M, ground = new Uint8Array(W * H), occ = new Uint8Array(W * H), objects = [];
  const gl = st.outer.g.length ? st.outer.g : st.rim.g, base = gl.length ? gl[0][0] : T.GRASS;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const wx = x0 + x - M, wy = y0 + y - M, n = vnoise(wx, wy, 5, seed) * 0.7 + vnoise(wx, wy, 2, seed + 1) * 0.3;   /* đốm nền nhỏ, không mảng lớn */
    ground[y * W + x] = gl.length > 1 && n > 0.66 ? pickW(gl.slice(1), h3(wx >> 2, wy >> 2, seed + 3)) : base; }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (occ[y * W + x]) continue; const wx = x0 + x - M, wy = y0 + y - M, d = edge(wx, wy), rg = ridge(wx, wy);
    const pr = rg ? st.rim : d < 2 ? st.rim : st.outer; if (!pr.o.length) continue;
    const cl = fbm(wx + 500, wy + 300, seed + 21), far = Math.max(0, 1 - Math.max(0, d - 6) / 26), rd = vnoise(wx, wy / 3.5, 4, seed + 31) * 0.75 + vnoise(wx, wy, 2, seed + 32) * 0.25;   /* khe đèo: nhiễu kéo dài theo hướng đèo (Bắc–Nam) → sống núi liền */
    let p = rg ? (rd > 0.42 ? Math.min(0.95, pr.dens * 1.2) : 0.06) : d < 2 ? pr.dens : Math.min(0.75, pr.dens * (cl > 0.5 ? 2.4 : 0.35)); p *= rg ? 1 : far;
    if (h3(wx, wy, seed + 5) >= p) continue; const ty = pickW(pr.o, h3(wx, wy, seed + 9)), od = O[ty]; if (!od) continue;
    if (x + od.fw > W || y + od.fh > H || (pr.og && pr.og[ty] && !pr.og[ty][ground[(y + od.fh - 1) * W + x]])) continue; let free = true; for (let j = 0; j < od.fh && free; j++) for (let i = 0; i < od.fw; i++) if (occ[(y + j) * W + x + i]) { free = false; break; }
    if (!free) continue; for (let j = 0; j < od.fh; j++) for (let i = 0; i < od.fw; i++) occ[(y + j) * W + x + i] = 1; objects.push({ type: ty, x, y });
  }
  return { w: W, h: H, ground, objects, solid: new Uint8Array(W * H), M };
}
/* ảnh độn 1 phía (L / R / T / B) của vùng z ở khung thường, ¼ (o.flip = bản cho khung gương) — style lấy từ bản đồ vùng (công cụ truyền vào) */
export function renderFillerCanvas(ctx, z, side, st, o = {}) {
  const r = LAY.zones[z], B = LAY.band || { x0: 0, x1: LW * TS }; if (!r) return null;
  const rect = side === 'L' ? { x: B.x0 - FW, y: r.y, w: r.x - (B.x0 - FW), h: r.h } : side === 'R' ? { x: r.x + r.w, y: r.y, w: B.x1 + FW - (r.x + r.w), h: r.h }
    : side === 'T' ? { x: B.x0 - FW, y: r.y - FW, w: B.x1 - B.x0 + 2 * FW, h: FW } : { x: B.x0 - FW, y: r.y + r.h, w: B.x1 - B.x0 + 2 * FW, h: FW };
  const tx0 = Math.round(rect.x / TS), ty0 = Math.round(rect.y / TS), tw = Math.round(rect.w / TS), th = Math.round(rect.h / TS), seed = hashStr('fill' + z) & 0xffff;
  const zx0 = r.x / TS, zx1 = (r.x + r.w) / TS, zy0 = r.y / TS, zy1 = (r.y + r.h) / TS, bx0 = B.x0 / TS, bx1 = B.x1 / TS;
  const edge = (wx, wy) => Math.max(wx < zx0 ? zx0 - 1 - wx : wx >= zx1 ? wx - zx1 : 0, wy < zy0 ? zy0 - 1 - wy : wy >= zy1 ? wy - zy1 : 0);
  const ridge = (wx) => r.kind === 'road' && wx >= bx0 - 4 && wx < bx1 + 4;
  let m = genFill(st, tx0, ty0, tw, th, seed, edge, ridge); if (o.flip) m = flipMap(m);
  const c = document.createElement('canvas'); c.width = tw * TS; c.height = th * TS; const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
  const cur = ART.zone, swap = ART.on && cur !== z; if (swap) artEnterZone(z); artMapBuilt(m);
  try { g.translate(-m.M * TS, -m.M * TS); drawTileRows(m, g, 0, m.h + 1); for (const ob of objOrder(m)) drawObj(ctx, g, ob); } finally { if (swap) artEnterZone(cur); if (ctx.S && ctx.S.map) artMapBuilt(ctx.S.map); }
  const c4 = half(half(c)); c.width = 0; return { c4, rect, objs: m.objects.length };
}

/* ---------------- tải ảnh (theo thứ tự ưu tiên) ---------------- */
function want(ctx, vk, lv, adj) {   /* trả ảnh nếu đã có; chưa có thì gọi nạp; adj: vùng kề vùng giữa (được phép vẽ ½ lúc chạy) */
  const e = ent(vk), z = baseOf(vk), flip = vk !== z, snap = DB.idx.get(vk) || {}, live = !!(ctx.S && ctx.S.zone && ctx.S.zone.id === z);
  if (e.lv[lv]) { e.used[lv] = C.frame; if (e.src[lv] === 'png' && snap[lv] && !e.loading[lv]) idbLoad(vk, lv); return e.lv[lv]; }   /* có ảnh chụp của save (IndexedDB nạp xong muộn) → thay ảnh dựng sẵn */
  if (lv === 8) { if (e.lv[4]) { setLv(vk, 4, e.lv[4], e.src[4]); return e.lv[8]; } lv = 4; }   /* ⅛ suy từ ¼ */
  if (e.loading[lv]) return null;
  if (snap[lv] && idbLoad(vk, lv)) return null;
  if (lv === 4 && !e.miss[4]) { e.loading[4] = true; loadImg(ASSET(vk + '_4.webp'), im => { e.loading[4] = false; setLv(vk, 4, im, 'png'); }, () => { e.loading[4] = false; e.miss[4] = true; }); return null; }
  const qo = live ? { live: true, persist: true, hash: mapHash(ctx.S.map) } : {};
  if (lv === 4 && e.miss[4]) { queue(ctx, z, flip, qo); return null; }
  if (lv === 2 && adj && !queued(vk) && (!lowMem || live)) queue(ctx, z, flip, qo);   /* điện thoại: ½ chỉ từ ảnh chụp (khỏi giật vì dựng bản đồ) */   /* ½: chỉ vùng kề, vẽ cắt lát */
  return null;
}
function anyLevel(vk, lv) { const e = C.th.get(vk); if (!e) return null; for (const k of (lv === 2 ? [2, 4, 8] : lv === 4 ? [4, 8, 2] : [8, 4, 2])) if (e.lv[k]) { e.used[k] = C.frame; return { im: e.lv[k], d: k }; } return null; }
function fillImg(name) {
  let f = C.fill.get(name); if (!f) { f = { im: null, used: C.frame, miss: false, loading: false }; C.fill.set(name, f); }
  f.used = C.frame; if (f.im || f.miss || f.loading) return f.im; f.loading = true;
  loadImg(ASSET(name + '_4.webp'), im => { f.loading = false; f.im = im; evict(); }, () => { f.loading = false; f.miss = true; }); return null;
}
const loadingN = () => { let n = 0; for (const e of C.th.values()) n += Object.values(e.loading).filter(Boolean).length; for (const f of C.fill.values()) n += f.loading ? 1 : 0; return n; };
export function mosaicStats() {
  const per = {}; for (const [z, e] of C.th) { const lv = Object.entries(e.lv || {}).filter(([, c]) => c); if (lv.length) per[z] = { lv: lv.map(([k, c]) => k + ':' + (c.naturalWidth || c.width) + 'x' + (c.naturalHeight || c.height) + '/' + (e.src[k] || '?')), kb: Math.round(entBytes(e) / 1024), live: !!e.live, ageS: e.t ? Math.round((Date.now() - e.t) / 1000) : null }; }
  return { bytes: total(), mb: +(total() / 1048576).toFixed(2), budgetMB: +(C.budget / 1048576).toFixed(1), lowMem, jobs: C.jobs.map(j => j.vk), job: C.job ? C.job.vk + ':' + C.job.stage : null, loading: loadingN(),
    builds: C.stats.builds, buildMs: C.stats.ms.slice(), mapMs: C.stats.mapMs.slice(), sliceMs: C.stats.slices.slice(), loads: C.stats.loads, loadMs: C.stats.loadMs.slice(), idb: { on: !!DB.db, id: DB.id, kb: Math.round(DB.bytes / 1024), snaps: [...DB.idx.keys()], loads: C.stats.idbLoads, puts: C.stats.idbPuts },
    snaps: C.stats.snaps, snapMs: C.stats.snapMs.slice(), evict: C.stats.evict, scratch: !!C.scratch, fills: [...C.fill.entries()].filter(([, f]) => f.im).map(([k]) => k), layout: LAY.src || 'json', per };
}
export function mosaicConfig(o = {}) { if (o.budgetMB) { C.budget = o.budgetMB * 1048576; evict(); } if (o.idbCapMB) DB.cap = o.idbCapMB * 1048576; return mosaicStats(); }
export const mosaicPeek = (z, flip, lv) => { const e = C.th.get(vkey(z, flip)); return (e && e.lv[lv]) || null; };   /* plan-42: kiểm thử (so ảnh chụp đồng bộ / vẽ dần) */
export function mosaicReset(z) { for (const [k, e] of C.th) if (!z || baseOf(k) === z) { for (const lv of [2, 4, 8]) drop(e, lv); C.th.delete(k); } if (!z) C.fill.clear(); }
export function mosaicPrewarm(ctx, z, n = 2) {   /* nạp sẵn ¼ (+⅛) của vùng giữa và n vùng kề mỗi phía theo khung nhìn của z */
  const z0 = SKYB(z), F = frame(!!(LAY.zones[z0] || {}).flip), r0 = F.by[z0]; if (!r0) return;
  for (const [zz, r] of F.zones) if (Math.abs((r.y + r.h / 2) - (r0.y + r0.h / 2)) <= (n + 0.6) * LH * TS) want(ctx, vkey(zz, r.flip), 4, false);
}

/* ---------------- chụp vùng đang chơi (save này) ---------------- */
const FLIPSNAP = new Set(['sea', 'village', 'road1', 'm1']);   /* vùng cần thêm bản lật (khung gương quanh Biển) */
function mapHash(m) {
  let h = 2166136261; const gr = m.ground; for (let i = 0; i < gr.length; i++) { h ^= gr[i]; h = Math.imul(h, 16777619); }
  for (const o of m.objects) { if (o.ghost) continue; const s = o.type + (o.ruined ? '!' : '') + (o.hp != null ? (o.hp > 0 ? 'h' : 'x') : ''); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } h ^= o.x * 131 + o.y; h = Math.imul(h, 16777619); }
  return (h >>> 0).toString(36);
}
const lastHash = vk => ((C.th.get(vk) || {}).hash) || (((DB.idx.get(vk) || {})[4] || {}).hash) || null;
const snapZone = ctx => { const z = ctx.S && ctx.S.zone && ctx.S.zone.id; return z && LAY.zones[z] && ctx.S.map ? z : null; };
function snapFlips(z) { const r = LAY.zones[z]; return FLIPSNAP.has(z) ? [!!r.flip, !r.flip] : [!!r.flip]; }
function copyLive(ctx, fl) {   /* plan-42 A4: bản sao bản đồ đang chơi lúc rời vùng (vật chép nông + ảnh hư hỏng chốt) + lớp ruộng / ao vẽ sẵn (hệ sẽ đổi sang vùng mới) */
  const m = ctx.S.map, W = m.w * TS, H = m.h * TS;
  const objects = m.objects.map(o => { const c = Object.assign({}, o); c.__ri = O[o.type] ? ruinImg(ctx, o) : null; return c; });
  let layer = null; if ((ctx.S.sys || []).some(s => s.drawGround && /^(farm|ponds)$/.test(s.id))) { layer = document.createElement('canvas'); layer.width = W; layer.height = H; const lg = layer.getContext('2d'); lg.imageSmoothingEnabled = false; liveGround(ctx, lg, m, W, H, fl); }
  return { m: { ...m, ground: m.ground.slice(), objects }, layer };
}
export function mosaicSnapshot(ctx, o = {}) {   /* chụp vùng đang đứng: o.sync = vẽ ngay (lúc rời vùng), mặc định = cắt lát nền */
  const z = snapZone(ctx); if (!z) return false; idbInit(ctx); const hash = mapHash(ctx.S.map), ok = vk => lastHash(vk) === hash;
  let n = 0; for (const fl of (o.noFlip ? [!!LAY.zones[z].flip] : snapFlips(z))) { const vk = vkey(z, fl); if (!o.force && ok(vk)) continue; n++;
    if (o.sync && o.defer) { const t0 = now(), J = newJob(ctx, z, fl, { live: true, persist: true, hash }); J.copy = copyLive(ctx, fl); C.jobs = C.jobs.filter(j => j.vk !== vk); C.jobs.unshift(J); C.stats.snapMs.push(Math.round(now() - t0)); if (C.stats.snapMs.length > 20) C.stats.snapMs.shift(); }
    else if (o.sync) { const t0 = now(), J = runNow(ctx, z, fl, { live: true, persist: true, hash }); finishJob(ctx, J); C.stats.snapMs.push(Math.round(now() - t0)); if (C.stats.snapMs.length > 20) C.stats.snapMs.shift(); }
    else { C.jobs = C.jobs.filter(j => j.vk !== vk); C.jobs.push(newJob(ctx, z, fl, { live: true, persist: true, hash })); } }
  return n;
}
export const worldmosaic = {
  id: 'worldmosaic', always: true,
  onZoneEnter(ctx) { idbInit(ctx); this._t = 0; this._h = null; },
  onZoneLeave(ctx) {   /* bản đồ sắp bị bỏ → chụp đồng bộ nếu đã đổi so với lần chụp cuối (gói ảnh lúc này đã là vùng MỚI → đổi tạm về vùng cũ) */
    const z = snapZone(ctx); if (!z) return; if (lastHash(vkey(z, !!LAY.zones[z].flip)) === mapHash(ctx.S.map)) return;
    const nz = ART.zone; try { if (ART.on && nz !== z) artEnterZone(z); mosaicSnapshot(ctx, { sync: true, noFlip: true, defer: !(typeof window !== 'undefined' && window.__wmSyncLeave) }); }   /* plan-42 A4: defer — vẽ dần sau khi qua cổng; window.__wmSyncLeave = true → cách cũ (đồng bộ) */   /* bản lật (chỉ để nhìn từ Biển) để lần chụp nền sau — rời vùng nhanh hơn */ catch (er) { console.error('worldmosaic snap', er); } finally { if (ART.on && ART.zone !== nz) artEnterZone(nz); }
  },
  update(dt, ctx) {   /* mỗi 40 s: bản đồ đổi → chụp lại dần (≤ ~4 ms / khung, không đổi gói ảnh) */
    this._t = (this._t || 0) + dt; if (C.job || C.jobs.length) { if (C.job ? C.job.live : C.jobs.some(j => j.live)) pumpJobs(ctx, 4); return; }
    if (this._t < 40 || !snapZone(ctx) || ctx.S.mode !== 'play') return; this._t = 0; mosaicSnapshot(ctx);
  },
};

/* ---------------- vẽ ---------------- */
const rgba = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };
const toHex = s => { if (s[0] === '#') return s; const m = /(\d+)\D+(\d+)\D+(\d+)/.exec(s); return m ? '#' + [m[1], m[2], m[3]].map(v => (+v).toString(16).padStart(2, '0')).join('') : '#b1e0f9'; };
function blitFlip(g, im, x0, y0, x1, y1, fy) { const w = x1 - x0, h = y1 - y0; if (w <= 0 || h <= 0) return; if (!fy) { g.drawImage(im, x0, y0, w, h); return; } g.save(); g.translate(x0, y1); g.scale(1, -1); g.drawImage(im, 0, 0, w, h); g.restore(); }
const SEAM_T = 14 * TS, SEAM_X = 6 * TS;   /* hoà sắc 14 ô · hoà trộn chéo 6 ô */
function seamBlend(g, pcs, F, X, Y, s, VW, VH) {
  const B = F.band, xL = Math.max(0, X(B.x0 - FW)), xR = Math.min(VW, X(B.x1 + FW)); if (xR <= xL) return;
  const hb = Math.max(4, Math.round(SEAM_T * s)), hx = Math.max(2, Math.round(SEAM_X * s));
  for (const [z, r] of F.zones) {
    const yS = r.y + r.h, nb = F.zones.find(([, r2]) => r2.y === yS); if (!nb) continue; const ys = Y(yS); if (ys + hb < 0 || ys - hb > VH) continue;
    const [z2, r2] = nb, eA = C.th.get(vkey(z, r.flip)), eB = C.th.get(vkey(z2, r2.flip)), cA = (eA && eA.col) || guessCol(z), cB = (eB && eB.col) || guessCol(z2);
    /* (a) tràn mép: dải 2 ô sát mép của mảnh, lật gương ra ngoài, alpha 1 → 0 (canvas nháp nhỏ, dùng lại) */
    for (const pc of pcs) {
      const down = pc.y1 === yS, up = pc.y0 === yS; if (!down && !up) continue; const x0 = Math.max(xL, X(pc.x0)), x1 = Math.min(xR, X(pc.x1)); if (x1 <= x0) continue;
      const iw = pc.im.naturalWidth || pc.im.width, ih = pc.im.naturalHeight || pc.im.height, ky = ih / (pc.y1 - pc.y0), sh = Math.max(1, Math.round(SEAM_X * ky));
      const sx = (x0 - X(pc.x0)) / (X(pc.x1) - X(pc.x0)) * iw, sw = (x1 - x0) / (X(pc.x1) - X(pc.x0)) * iw;
      /* không dùng canvas nháp (vẽ canvas vừa sửa gây chờ GPU ~3 ms/lần): chia dải thành 4 lát, alpha giảm dần 0,5 → 0,06 */
      const w = x1 - x0, n = 4, sm1 = g.imageSmoothingEnabled; g.imageSmoothingEnabled = true;
      for (let i = 0; i < n; i++) { const a0 = i / n, a1 = (i + 1) / n, ya = Math.round(hx * a0), yb = Math.round(hx * a1); if (yb <= ya) continue;
        const srcA = sh * a0, srcB = sh * a1;   /* lát i (tính từ mép ra) = hàng thứ i tính từ mép của mảnh (lật gương) */
        g.globalAlpha = 0.5 * (1 - (i + 0.5) / n) + 0.03;
        if (down) g.drawImage(pc.im, sx, ih - srcB, sw, srcB - srcA, x0, ys + ya, w, yb - ya); else g.drawImage(pc.im, sx, srcA, sw, srcB - srcA, x0, ys - yb, w, yb - ya); }
      g.globalAlpha = 1; g.imageSmoothingEnabled = sm1;
    }
    /* (b) hoà sắc: phía trên ngả về màu hàng dưới, phía dưới ngả về màu hàng trên */
    let gr = g.createLinearGradient(0, ys - hb, 0, ys); gr.addColorStop(0, rgba(cB, 0)); gr.addColorStop(0.5, rgba(cB, 0.12)); gr.addColorStop(1, rgba(cB, 0.32)); g.fillStyle = gr; g.fillRect(xL, ys - hb, xR - xL, hb);
    gr = g.createLinearGradient(0, ys, 0, ys + hb); gr.addColorStop(0, rgba(cA, 0.32)); gr.addColorStop(0.5, rgba(cA, 0.12)); gr.addColorStop(1, rgba(cA, 0)); g.fillStyle = gr; g.fillRect(xL, ys, xR - xL, hb);
    /* (c) mép không thẳng: khối mềm (sương Gauss của sky.js tô màu hàng kề) rải lệch dọc mép → ranh giới loang như địa hình thật */
    const sm0 = g.imageSmoothingEnabled; g.imageSmoothingEnabled = true; g.globalAlpha = 0.42;
    for (let wx = Math.floor((B.x0 - FW) / (5 * TS)) * 5 * TS; wx < B.x1 + FW; wx += 5 * TS) { const sx0 = X(wx); if (sx0 < xL - 60 || sx0 > xR + 60) continue;
      for (const [col, sg, k] of [[cB, -1, 1], [cA, 1, 2]]) { const h1 = hashStr(z + k + ':' + wx), im = fogTint(h1 % 4, col); if (!im) continue;
        const w = (7 + (h1 >>> 4) % 7) * TS * s, hh = w * 0.55, cy = ys + sg * ((h1 >>> 8) % 5 + 1) * TS * s; g.drawImage(im, sx0 + ((h1 >>> 12) % 40 - 20) * s - w / 2, cy - hh / 2, w, hh); } }
    g.globalAlpha = 1; g.imageSmoothingEnabled = sm0;
  }
}
export function drawMosaic(g, ctx, o = {}) {
  const z0 = SKYB(o.centerZone || (ctx.S && ctx.S.zone && ctx.S.zone.id)), R00 = LAY.zones[z0]; if (!R00) return false;
  C.frame++; idbInit(ctx);
  const F = frame(!!R00.flip), R0 = F.by[z0];
  if (C.center !== z0) { C.center = z0; mosaicPrewarm(ctx, z0, 2); }
  const VW = o.VW || ctx.VW, VH = o.VH || ctx.VH, s = Math.max(0.02, o.scale || 0.25), ax = o.anchorX ?? VW / 2, ay = o.anchorY ?? VH / 2, t = o.time ?? ((ctx.S && ctx.S.time) || 0);
  const cwx = R0.x + (o.camWorldX ?? R0.w / 2), cwy = R0.y + (o.camWorldY ?? R0.h / 2);   /* vùng giữa luôn KHÔNG lật trong khung của nó */
  const X = wx => Math.round(ax + (wx - cwx) * s), Y = wy => Math.round(ay + (wy - cwy) * s);
  const wx0 = cwx - ax / s, wx1 = cwx + (VW - ax) / s, wy0 = cwy - ay / s, wy1 = cwy + (VH - ay) / s;
  const lv = s > 0.25 ? 2 : s > 0.125 ? 4 : 8, col = toHex(o.col || (THEME[z0 === 'village' ? 'sky' : 'sky_' + z0] || THEME.sky).col), fogC = toHex(mixHex(col, 'w', 0.42)), B = F.band, BD = F.bounds;
  const sm = g.imageSmoothingEnabled; g.imageSmoothingEnabled = true; try { g.imageSmoothingQuality = 'medium'; } catch (e) { }
  g.fillStyle = fogC; g.fillRect(0, 0, VW, VH);
  const vis = []; for (const [z, r] of F.zones) { if (r.x - FW > wx1 || r.x + r.w + FW < wx0 || r.y - FW > wy1 || r.y + r.h + FW < wy0) continue; vis.push([z, r]); }
  const near = z => { const r = F.by[z]; return Math.abs((r.y + r.h / 2) - (R0.y + R0.h / 2)) <= (r.h + R0.h) / 2 + 1; };
  let drawn = 0; const pcs = [];   /* mảnh đã vẽ: { im, x0, y0, x1, y1, z, zone } — để làm mềm mép nối */
  /* lượt 1: đất độn (khe đèo + rìa) — ảnh dựng sẵn, lật theo khung */
  const fillAt = (name, x0, y0, x1, y1, z) => { if (x0 > wx1 || x1 < wx0 || y0 > wy1 || y1 < wy0) return; const im = fillImg(name + (F.mirror ? '_f' : ''));
    if (im) { g.drawImage(im, X(x0), Y(y0), X(x1) - X(x0), Y(y1) - Y(y0)); pcs.push({ im, x0, y0, x1, y1, z }); } else { const e = C.th.get(vkey(z, F.by[z].flip)); g.fillStyle = (e && e.col) || guessCol(z); g.globalAlpha = 0.75; g.fillRect(X(x0), Y(y0), X(x1) - X(x0), Y(y1) - Y(y0)); g.globalAlpha = 1; } };
  for (const [z, r] of vis) {
    fillAt('fill_' + z + '_L', B.x0 - FW, r.y, r.x, r.y + r.h, z); fillAt('fill_' + z + '_R', r.x + r.w, r.y, B.x1 + FW, r.y + r.h, z);
    const F0 = frame(false), cap = (side, above) => fillAt('fill_' + z + '_' + side, B.x0 - FW, above ? r.y - FW : r.y + r.h, B.x1 + FW, above ? r.y : r.y + r.h + FW, z);
    if (z === F0.top) cap('T', !F.mirror); if (z === F0.bot) cap('B', F.mirror);   /* nắp rìa: trên M9 · ngoài khơi Biển (khung gương: đảo phía) */
  }
  /* lượt 2: chính các vùng (ảnh đã đúng chiều lật — dựng từ bản đồ lật, vật đứng thẳng) */
  for (const [z, r] of vis) {
    if (r.x > wx1 || r.x + r.w < wx0 || r.y > wy1 || r.y + r.h < wy0) continue;
    const vk = vkey(z, r.flip), w2 = want(ctx, vk, lv, near(z)), a = w2 ? { im: w2 } : anyLevel(vk, lv);
    if (o.drawCenter === false && z === z0) { drawn++; continue; }
    if (!a) { const e = C.th.get(vk); g.fillStyle = (e && e.col) || guessCol(z); g.fillRect(X(r.x), Y(r.y), X(r.x + r.w) - X(r.x), Y(r.y + r.h) - Y(r.y)); continue; }
    blitFlip(g, a.im, X(r.x), Y(r.y), X(r.x + r.w), Y(r.y + r.h), false); drawn++; pcs.push({ im: a.im, x0: r.x, y0: r.y, x1: r.x + r.w, y1: r.y + r.h, z, zone: true });
  }
  /* lượt 2b: MÉP NỐI MỀM giữa 2 hàng vùng (vd M8 tuyết ↔ đèo 8 đá tối): (a) mỗi mảnh tràn 2 ô sang hàng kề, mờ dần (mặt nạ lông vũ);
     (b) dải 10 ô mỗi bên ngả dần về màu trung bình của hàng bên kia (≤ 50 % ngay mép) → độ sáng / sắc gặp nhau ở giữa, không vạch cứng. Trải cả đất độn 2 bên. */
  seamBlend(g, pcs, F, X, Y, s, VW, VH);
  /* lượt 3: TƯỜNG SƯƠNG ở rìa thế giới (dày dần → đặc), khối sương mềm trôi chậm */
  const fogRamp = (x0, y0, x1, y1, horiz) => { const gr = horiz ? g.createLinearGradient(x0, 0, x1, 0) : g.createLinearGradient(0, y0, 0, y1);
    gr.addColorStop(0, rgba(fogC, 0.2)); gr.addColorStop(0.3, rgba(fogC, 0.55)); gr.addColorStop(0.62, rgba(fogC, 0.92)); gr.addColorStop(1, rgba(fogC, 1)); return gr; };
  { const xe = X(B.x0), xf = X(B.x0 - FOG_D); if (xe > 0) { g.fillStyle = fogRamp(xe, 0, xf, 0, true); g.fillRect(Math.max(0, xf), 0, xe - Math.max(0, xf), VH); if (xf > 0) { g.fillStyle = fogC; g.fillRect(0, 0, xf, VH); } } }
  { const xe = X(B.x1), xf = X(B.x1 + FOG_D); if (xe < VW) { g.fillStyle = fogRamp(xe, 0, xf, 0, true); g.fillRect(xe, 0, Math.min(VW, xf) - xe, VH); if (xf < VW) { g.fillStyle = fogC; g.fillRect(xf, 0, VW - xf, VH); } } }
  { const ye = Y(BD.y0), yf = Y(BD.y0 - FOG_D); if (ye > 0) { g.fillStyle = fogRamp(0, ye, 0, yf, false); g.fillRect(0, Math.max(0, yf), VW, ye - Math.max(0, yf)); if (yf > 0) { g.fillStyle = fogC; g.fillRect(0, 0, VW, yf); } } }
  { const ye = Y(BD.y1), yf = Y(BD.y1 + FOG_D); if (ye < VH) { g.fillStyle = fogRamp(0, ye, 0, yf, false); g.fillRect(0, ye, VW, Math.min(VH, yf) - ye); if (yf < VH) { g.fillStyle = fogC; g.fillRect(0, yf, VW, VH - yf); } } }
  const puff = (wx, wy, k, i) => { const im = fogTint(i % 4, fogC); if (!im) return; const w = FOG_D * 1.1 * s * k, h = w * im.height / im.width, x = X(wx) - w / 2, y = Y(wy) - h / 2; if (x > VW || y > VH || x + w < 0 || y + h < 0) return; g.drawImage(im, x, y, w, h); };
  { const step = 9 * TS, ya = Math.floor((wy0 - FOG_D) / step), yb = Math.ceil((wy1 + FOG_D) / step);
    g.globalAlpha = 0.55; for (let k = ya; k <= yb; k++) { const h1 = hashStr('wf' + k), dr = Math.sin(t * 0.07 + k) * 2 * TS, wy = k * step + (h1 % 97) - 48; if (wy < BD.y0 - FOG_D * 0.6 || wy > BD.y1 + FOG_D * 0.6) continue;
      puff(B.x0 - FOG_D * 0.42 + dr + (h1 % 61) - 30, wy, 0.8 + (h1 % 40) / 100, h1); puff(B.x1 + FOG_D * 0.42 - dr - ((h1 >>> 8) % 61) + 30, wy + 40, 0.8 + ((h1 >>> 4) % 40) / 100, h1 >>> 3); }
    const sx = 9 * TS, xa = Math.floor((wx0 - FOG_D) / sx), xb = Math.ceil((wx1 + FOG_D) / sx);
    for (let k = xa; k <= xb; k++) { const h1 = hashStr('wfx' + k), dr = Math.sin(t * 0.06 + k) * 2 * TS, wx = k * sx + (h1 % 97) - 48; if (wx < B.x0 - FOG_D || wx > B.x1 + FOG_D) continue;
      puff(wx + dr, BD.y0 - FOG_D * 0.42 + (h1 % 61) - 30, 0.8 + (h1 % 40) / 100, h1); puff(wx - dr, BD.y1 + FOG_D * 0.42 - ((h1 >>> 8) % 61) + 30, 0.8 + ((h1 >>> 4) % 40) / 100, h1 >>> 3); }
    g.globalAlpha = 1; }
  /* lượt 4: mù xanh khí quyển (đều + dày hơn về rìa khung nhìn) */
  const hz = Math.max(0, Math.min(1, o.haze || 0));
  if (hz > 0) { const hc = toHex(mixHex(col, 'w', 0.3)); g.fillStyle = rgba(hc, (0.5 * hz).toFixed(3)); g.fillRect(0, 0, VW, VH);
    const rg = g.createRadialGradient(ax, ay, Math.min(VW, VH) * 0.25, ax, ay, Math.hypot(VW, VH) * 0.6); rg.addColorStop(0, rgba(hc, 0)); rg.addColorStop(1, rgba(hc, (0.35 * hz).toFixed(3))); g.fillStyle = rg; g.fillRect(0, 0, VW, VH); }
  g.imageSmoothingEnabled = sm;
  if (!(C.job && C.job.live)) pumpJobs(ctx, 4);   /* ½ vùng kề / dự phòng: cắt lát ≤ 4 ms */
  return { drawn, pending: C.jobs.length + (C.job ? 1 : 0) + loadingN(), lv, mirror: F.mirror };
}
