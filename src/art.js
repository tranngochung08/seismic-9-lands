// art.js — lớp đồ họa PixelLab vẽ ở độ phân giải gấp đôi (plan-6/plan-7). Bật bằng ?art=px; không bật → initArt() không làm gì.
// Nguyên lý: mọi ảnh thay thế là canvas 2× có `__hi = 2`; drawImage của mọi context được bọc: ảnh có __hi thì nhân toạ độ nguồn
// ×2 và giữ kích thước đích logic → module gameplay (ô 16×20, vật thể 16×N…) không phải sửa. Canvas game vẽ với backing ×2 (main.js).
// Gói ảnh theo vùng: assets/px/manifest.json { scale, chars.fixed, zones: { id: 'zones/id.json' } } → mỗi gói { inherit, classes, wang,
// decor, tiles, objects, rocky, chars.base }. Tất cả gói nạp lúc boot; ART.enterZone(id) đổi gói đang dùng (đồng bộ).
import { tiles, O, T, mkCanvas, HOOK, FLAG_COLORS, flagName } from './gfx.js';

export const ART = { on: false, hi: 1, man: null, packs: {}, zone: null, pack: null, ground: null, groundDone: null };
const BASE = 'assets/px/';

const load1 = src => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('art: ' + src)); i.src = src; });
// tải ảnh: thử lại 3 lần (server tĩnh hay rớt khi nạp hàng nghìn ảnh cùng lúc); thất bại → ảnh 1×1 trong suốt, không kéo cả gói xuống
const BLANK = mkCanvas(2, 2);
const LOADS = new Map();   /* bộ nhớ đệm theo URL: tải trước song song (prefetchPack) rồi các bước sau lấy lại, không tải lần 2 */
function load(src) { if (!LOADS.has(src)) LOADS.set(src, loadRaw(src)); return LOADS.get(src); }
async function loadRaw(src) { for (let a = 0; a < 3; a++) { try { return await load1(src + (a ? `?r=${a}` : '')); } catch (e) { await new Promise(r => setTimeout(r, 150 * (a + 1))); } } console.warn('art: không tải được', src); return BLANK; }
function toCanvas(img) { const c = mkCanvas(img.width, img.height); c.getContext('2d').drawImage(img, 0, 0); c.__hi = ART.hi; return c; }
// Canvas 2× "giả kích thước logic": width/height trả về kích thước logic (module vẽ code dùng img.width>>1 để canh giữa), bitmap thật ở __w/__h
function logicalCanvas(c) { c.__w = c.width; c.__h = c.height; Object.defineProperty(c, 'width', { value: c.width / ART.hi }); Object.defineProperty(c, 'height', { value: c.height / ART.hi }); return c; }
// phóng/thu canvas 2× về cỡ logic w×h (giữ __hi, width/height logic)
function scaleLogical(src, w, h) {
  const c = mkCanvas(w * ART.hi, h * ART.hi), g = c.getContext('2d'); g.imageSmoothingEnabled = false;
  g.drawImage(src, 0, 0, src.__w || src.width, src.__h || src.height, 0, 0, c.width, c.height); c.__hi = ART.hi; return logicalCanvas(c);
}
function flipC(src, fx, fy) { const c = mkCanvas(src.width, src.height), g = c.getContext('2d'); g.translate(fx ? src.width : 0, fy ? src.height : 0); g.scale(fx ? -1 : 1, fy ? -1 : 1); g.drawImage(src, 0, 0, src.width, src.height); c.__hi = src.__hi; return c; }
// pixel giống ô thuần lower (sai khác nhỏ) → trong suốt; giữ __hi
function maskLower(tile, lower) {
  const w = tile.width, h = tile.height, c = mkCanvas(w, h), g = c.getContext('2d'); g.drawImage(tile, 0, 0, w, h);
  const a = g.getImageData(0, 0, w, h), b = lower.getContext('2d').getImageData(0, 0, w, h), da = a.data, db = b.data;
  for (let i = 0; i < da.length; i += 4) { if (Math.abs(da[i] - db[i]) + Math.abs(da[i + 1] - db[i + 1]) + Math.abs(da[i + 2] - db[i + 2]) < 6) da[i + 3] = 0; } /* ngưỡng chặt: chỉ phần chép y nguyên texture nền */
  g.putImageData(a, 0, 0); c.__hi = tile.__hi; return c;
}
const h2 = (a, b) => (((a * 73856093) ^ (b * 19349663) ^ 0x9e3779b9) >>> 0);

export async function initArt(q) {
  if (q.get('art') === 'code') return false;   /* 2026-09-28 (deploy): PixelLab là mặc định; ?art=code để xem bản vẽ code */
  let man; try { man = await fetch(BASE + 'manifest.json').then(r => r.json()); } catch (e) { console.warn('art: no manifest', e); return false; }
  ART.on = true; ART.hi = man.scale || 2; ART.man = man;
  installShim();
  ART.fixed = {};
  await Promise.all(Object.entries((man.chars && man.chars.fixed) || {}).map(async ([k, c]) => {
    const img = toCanvas(await load(BASE + c.file)); ART.fixed[k] = { ...c, img };
    if (c.actions) { img.actions = {}; for (const [n, a] of Object.entries(c.actions)) img.actions[n] = { img: toCanvas(await load(BASE + a.file)), n: a.n, ch: a.ch || 20, cw: a.cw || 16 }; }   /* px-hero: nhân vật riêng có clip động tác */
  }));
  await Promise.all(Object.entries(man.zones || {}).map(async ([id, file]) => { try { ART.packs[id] = await loadPack(file, id); } catch (e) { console.warn('art: pack', id, e); } }));
  HOOK.charSheet = charSheetPx;
  // canvas đơn vẽ code (bè, ván, buồm): thay bitmap tại chỗ bằng ảnh gói Làng (dùng chung mọi vùng)
  const vp = ART.packs.village;
  if (vp && vp.images) for (const [kind, cv] of Object.entries(HOOK.images)) {
    const img = vp.images[kind]; if (!img) continue;
    cv.width = img.width; cv.height = img.height; cv.getContext('2d').drawImage(img, 0, 0, img.width, img.height); cv.__hi = ART.hi; logicalCanvas(cv);
  }
  HOOK.petFrames = petFramesPx;
  // cờ quốc gia: cột PixelLab + lá cờ sọc theo FLAG_COLORS, 6 khung phất (dịch cột theo sóng + bóng sáng/tối)
  if (vp && vp.images && vp.images.flagpole) buildFlags(vp.images.flagpole, vp.flags || {});
  HOOK.rocky = (key, tier) => packChain().map(p => p.rocky && p.rocky[tier]).find(Boolean) || null;
  HOOK.objDefined = name => { if (ART.zone) applyObj(name); };
  ART.ground = groundCell; ART.groundDone = groundDone;
  return true;
}

// ---------- gói vùng ----------
const wangDirCache = {};
function loadWangDir(dir) {   /* tải 16 ô Wang của 1 thư mục, cache theo dir (nhiều gói tham chiếu cùng bộ → 1 lần fetch, đỡ nghẽn server) */
  return wangDirCache[dir] ||= (async () => {
    const meta = await fetch(BASE + dir + '/meta.json').then(r => r.json()); const byKey = {};
    await Promise.all(meta.tiles.map(async t => {
      const c = t.corners, key = [c.NW, c.NE, c.SW, c.SE].map(v => v === 'upper' ? 1 : 0).join('');
      byKey[key] = toCanvas(await load(BASE + dir + '/' + String(t.i).padStart(2, '0') + '.png'));
    }));
    return byKey;
  })();
}
/* bản web: mỗi gói có ~15 bước tải nối đuôi → lần đầu chờ ~17 s. Đọc JSON xong là bắn song song mọi ảnh + mọi bộ Wang ngay. */
function prefetchPack(j) {
  const walk = v => { if (typeof v === 'string') { if (/\.png$/i.test(v)) load(BASE + v); } else if (Array.isArray(v)) v.forEach(walk); else if (v && typeof v === 'object') Object.values(v).forEach(walk); };
  walk(j); for (const L of j.wang || []) loadWangDir(L.dir);
}
async function loadPack(file, id) {
  const j = await fetch(BASE + file).then(r => r.json());
  prefetchPack(j);
  const p = { id, inherit: j.inherit || null, classes: j.classes || {}, layers: [], decor: {}, tiles: {}, objects: {}, rocky: {}, chars: [] };
  for (const L of j.wang || []) {   // { dir, upper }
    const byKey = { ...await loadWangDir(L.dir) };   /* bộ dùng chung (vd. wang/f2 đất cày ở 12 gói) chỉ tải 1 lần */
    // lớp thứ 2 trở đi: làm trong suốt phần "lower" (so với ô thuần 0000) để không đè mất lớp trước (vd. đường đè cỏ đậm)
    if (p.layers.length && byKey['0000']) for (const k of Object.keys(byKey)) if (k !== '0000') byKey[k] = maskLower(byKey[k], byKey['0000']);
    for (const k of ['0000', '1111']) if (byKey[k]) byKey[k + 'v'] = [byKey[k], flipC(byKey[k], 1, 0), flipC(byKey[k], 0, 1), flipC(byKey[k], 1, 1)]; // ô thuần: 4 bản lật chống lặp
    for (const [k, files] of Object.entries(L.variants || {})) {   // biến thể ô thuần sinh thêm (px-variants.py) + bản lật
      for (const f of files) { const v = toCanvas(await load(BASE + f)); (byKey[k + 'v'] ||= [byKey[k]]).push(v, flipC(v, 1, 0)); }
    }
    p.layers.push({ upper: L.upper, byKey });
  }
  for (const [tile, list] of Object.entries(j.decor || {})) p.decor[tile] = await Promise.all(list.map(async f => ({ img: toCanvas(await load(BASE + f.file)), p: f.p ?? 1, n: f.n ?? 1 })));
  for (const [tile, files] of Object.entries(j.tiles || {})) { const arr = await Promise.all(files.map(f => load(BASE + f).then(toCanvas))); arr.pick = (tx, ty) => arr[h2(tx, ty) % arr.length]; p.tiles[tile] = arr; }
  await Promise.all(Object.entries(j.objects || {}).map(async ([name, spec]) => {
    const f = typeof spec === 'string' ? spec : spec.file; const img = await load(BASE + f);
    p.objects[name] = { img: toCanvas(img), ox: (spec.ox || 0), oy: (spec.oy || 0) };
  }));
  await Promise.all(Object.entries(j.rocky || {}).map(async ([tier, f]) => { p.rocky[tier] = toCanvas(await load(BASE + f)); }));
  // clip lặp cho vật thể (lửa, đèn, đài phun…): { name: [4 file] } → O[name].frames (main.js chọn khung theo thời gian)
  p.loops = {};
  await Promise.all(Object.entries(j.loops || {}).map(async ([n, files]) => { p.loops[n] = await Promise.all(files.map(f => load(BASE + f).then(toCanvas))); }));
  p.chars = await Promise.all(((j.chars && j.chars.base) || []).map(async c => ({ ...c, img: toCanvas(await load(BASE + c.file)) })));
  // clip động tác theo thân: chars.actions = { c0: { chop: {file, n}, … } } → gắn vào phần tử chars có file tương ứng
  for (const [body, clips] of Object.entries((j.chars && j.chars.actions) || {})) {
    const base = p.chars.find(c => c.file.endsWith(`/${body}.png`) || c.file === `chars/${body}.png`); if (!base) continue;
    base.actions = {};
    for (const [n, a] of Object.entries(clips)) base.actions[n] = { img: toCanvas(await load(BASE + a.file)), n: a.n, ch: a.ch || 20, cw: a.cw || 16 };
  }
  // hàng rào nối liền: { fence: { types:['fence_h','fence_v'], post:'file', rail:'#hex', railDark:'#hex', railY:[12,20], railW:3 } }
  p.connect = {};
  // ảnh mảnh ghép để NGUYÊN (không __hi): fenceCanvas tự ghép trên canvas 2× rồi mới đánh dấu __hi cho canvas kết quả
  const plain = async f => { const img = await load(BASE + f); const c = mkCanvas(img.width, img.height); c.getContext('2d').drawImage(img, 0, 0); return c; };
  for (const [fam, c] of Object.entries(j.connect || {})) p.connect[fam] = { ...c, postImg: c.post ? await plain(c.post) : null, hImg: c.h ? await plain(c.h) : null, vImg: c.v ? await plain(c.v) : null, cache: {} };
  // lá cờ quốc kỳ 22×14 (PixelLab, đã soi tay): { Vietnamese: 'file', … } → ImageData
  p.flags = {};
  await Promise.all(Object.entries(j.flags || {}).map(async ([k, f]) => { const img = await load(BASE + f); const c = mkCanvas(img.width, img.height); const g = c.getContext('2d'); g.drawImage(img, 0, 0); p.flags[k] = g.getImageData(0, 0, img.width, img.height); }));
  // ảnh đơn: { raft: 'file', sail_0_0: 'file', … } (canvas thường, art.js chép vào canvas của module)
  p.images = {};
  await Promise.all(Object.entries(j.images || {}).map(async ([k, f]) => { const img = await load(BASE + f); const c = mkCanvas(img.width, img.height); c.getContext('2d').drawImage(img, 0, 0); p.images[k] = c; }));
  // sinh vật: { cow: ["creatures/cow_0.png", "creatures/cow_1.png"] } → [frame][0=phải, 1=trái(lật)]
  p.creatures = {};
  await Promise.all(Object.entries(j.creatures || {}).map(async ([kind, files]) => {
    p.creatures[kind] = await Promise.all(files.map(async f => { const c = toCanvas(await load(BASE + f)); const fl = flipC(c, 1, 0); return [logicalCanvas(c), logicalCanvas(fl)]; }));
  }));
  return p;
}
function packChain(id = ART.zone) { const out = []; let p = ART.packs[id]; const seen = new Set(); while (p && !seen.has(p.id)) { out.push(p); seen.add(p.id); p = p.inherit ? ART.packs[p.inherit] : null; } return out; }

// Gọi ở đầu enterZone(id) trong main.js: đổi gói đang dùng, gán ảnh vật thể, tượng Rocky, nền.
export function enterZone(id) {
  if (!ART.on) return;
  ART.zone = id; const chain = packChain(id); ART.pack = chain[0] || null;
  for (const name of Object.keys(O)) applyObj(name, chain);
  // tile thường (vùng không có Wang): đặt lại toàn bộ rồi gán từ gói
  for (const id2 of Object.keys(tiles0)) tiles[id2] = tiles0[id2];
  for (const p of chain.slice().reverse()) for (const [name, arr] of Object.entries(p.tiles)) { const id2 = T[name]; if (id2 !== undefined) { if (tiles0[id2] === undefined) tiles0[id2] = tiles[id2]; tiles[id2] = arr; } }
  // nền Wang: lớp và bảng lớp đất của gói gần nhất có wang
  const wp = chain.find(p => p.layers.length); WANG.layers = wp ? wp.layers : []; WANG.decor = wp ? wp.decor : {};
  ART.tilled = WANG.layers.some(l => l.upper === 'tilled'); WANG.wetCache = null;   /* px-farm2: có bộ Wang đất cày → farm.js không vẽ ô cày đè nữa, chỉ phủ tối ô đã tưới */
  { const vp = ART.packs.village; WANG.fish = vp && vp.images && vp.images.fishshadow_0 && vp.images.fishshadow_1 ? [vp.images.fishshadow_0, vp.images.fishshadow_1] : null; }   /* plan-14: bóng cá */
  WANG.cls = {}; if (wp) for (const [name, cls] of Object.entries(wp.classes)) WANG.cls[T[name]] = cls;
  WANG.base = (wp && wp.classes.__base) || 'grass';
  charCache.clear();
  // sinh vật: thay nội dung mảng đã đăng ký tại chỗ
  for (const [kind, reg] of Object.entries(HOOK.creatures)) {
    let src = chain.map(p => p.creatures && p.creatures[kind]).find(Boolean) || reg.fb;
    // ảnh PixelLab khác cỡ logic với bản code (vd. xúc tu Kraken lớn = bản thường ×2) → phóng theo cỡ bản code
    if (kind.endsWith('_big') && src !== reg.fb && reg.fb[0] && Array.isArray(reg.fb[0]) && reg.fb[0][0] && src[0] && src[0][0]) {   // chỉ bản '_big' (Kraken vực) mới ép theo cỡ code; thú giữ cỡ PixelLab (chuẩn tỷ lệ)
      const fw = reg.fb[0][0].width, fh = reg.fb[0][0].height, sw = src[0][0].__w ? src[0][0].__w / ART.hi : src[0][0].width;
      if (fw !== sw && !reg.scaledFor) { reg.scaledFor = src; reg.scaled = src.map(fr => fr.map(c => c ? scaleLogical(c, fw, fh) : c)); }
      if (reg.scaledFor === src) src = reg.scaled;
    }
    // thay TẠI CHỖ cả mảng ngoài lẫn mảng trong (module có thể đang giữ tham chiếu tới mảng trong, vd. SPR.ship = fb[0])
    for (let i = 0; i < Math.max(reg.arr.length, src.length); i++) {
      const f = src[i % src.length];
      if (Array.isArray(f)) { if (Array.isArray(reg.arr[i])) { reg.arr[i].length = 0; reg.arr[i].push(...f); } else reg.arr[i] = f.slice(); }
      else reg.arr[i] = f;
    }
    reg.arr.length = Math.max(reg.fb.length, 1) === src.length ? src.length : reg.fb.length;
    // clip idle riêng: creatures['<kind>_idle'] → reg.arr.idle (cùng cỡ với bản code)
    const idle = chain.map(p => p.creatures && p.creatures[kind + '_idle']).find(Boolean);
    if (idle) reg.arr.idle = idle; else delete reg.arr.idle;
    /* plan-11: hàng đi theo hướng: creatures['<kind>_ds'|'_de'|'_dn'] → reg.arr.dir = { s, e, n } (mỗi hàng [khung][lật]); tây = lật đông */
    const d4 = {}; for (const k of ['s', 'e', 'n']) { const f = chain.map(p => p.creatures && p.creatures[kind + '_d' + k]).find(Boolean); if (f) d4[k] = f; }
    if (d4.s && d4.n && d4.e) reg.arr.dir = d4; else delete reg.arr.dir;
  }
}
const tiles0 = {};
// Sau khi map dựng xong (main.js gọi): vật thể thuộc họ "nối" (rào) nhận ảnh riêng theo hàng xóm 4 phía
export function mapBuilt(map) {
  if (!ART.on || !map) return;
  const fams = {}; for (const p of packChain()) for (const [fam, c] of Object.entries(p.connect || {})) if (!fams[fam]) fams[fam] = c;
  const byType = {}; for (const [fam, c] of Object.entries(fams)) for (const t of c.types) byType[t] = c;
  if (!Object.keys(byType).length) { for (const o of map.objects) o.artImg = null; return; }
  const key = (x, y) => x + ',' + y, pos = new Map();
  for (const o of map.objects) { const c = byType[o.type]; if (c) pos.set(key(o.x, o.y), c); }
  for (const o of map.objects) {
    const c = byType[o.type]; if (!c) { o.artImg = null; continue; }
    const same = (x, y) => pos.get(key(x, y)) === c;
    const mask = (same(o.x, o.y - 1) ? 1 : 0) | (same(o.x + 1, o.y) ? 2 : 0) | (same(o.x, o.y + 1) ? 4 : 0) | (same(o.x - 1, o.y) ? 8 : 0);
    o.artImg = c.cache[mask] || (c.cache[mask] = fenceCanvas(c, mask));
  }
}
// Ghép 1 ô rào/tường theo mask hàng xóm (1 trên, 2 phải, 4 dưới, 8 trái). Có ảnh h/v (đoạn thẳng PixelLab) thì vẽ nửa đoạn về phía
// hàng xóm; không thì vẽ thanh rào bằng màu. Nút (post) vẽ ở mọi ô (postMode 'all') hoặc chỉ ở góc/đầu mút/ngã ba ('nodes').
function fenceCanvas(c, mask) {
  const S = 16 * ART.hi, T = (c.tall || 16) * ART.hi, cv = mkCanvas(S, T), g = cv.getContext('2d'), mid = S / 2, base = T - S;
  const ry = (c.railY || [11, 19]).map(y => y + base), rw = c.railW || 3;
  const rail = (x, y, w, h) => { g.fillStyle = c.railDark || '#5a3a1e'; g.fillRect(x, y, w, h); g.fillStyle = c.rail || '#b27b3a'; g.fillRect(x, y, w, Math.max(1, h - 1)); };
  const half = (img, sx, sy, sw, sh, dx, dy) => g.drawImage(img, sx, sy, sw, sh, dx, dy, sw, sh);
  const H = c.hImg, V = c.vImg, hOnly = (mask & 5) === 0 && (mask & 10), vOnly = (mask & 10) === 0 && (mask & 5);
  if (H && hOnly) half(H, 0, 0, H.width, H.height, 0, T - H.height);                                   // chỉ nối ngang (kể cả đầu mút): vẽ trọn đoạn ngang
  else if (V && vOnly) half(V, 0, 0, V.width, V.height, Math.round((S - V.width) / 2), T - V.height);   // chỉ nối dọc: trọn đoạn dọc
  else {
    if (mask & 2) { if (H) half(H, H.width / 2, 0, H.width / 2, H.height, mid, T - H.height); else for (const y of ry) rail(mid, y, S - mid, rw); }
    if (mask & 8) { if (H) half(H, 0, 0, H.width / 2, H.height, 0, T - H.height); else for (const y of ry) rail(0, y, mid, rw); }
    const vx = [mid - rw - 1, mid + 1];
    if (mask & 4) { if (V) half(V, 0, V.height / 2, V.width, V.height / 2, Math.round((S - V.width) / 2), T - V.height / 2); else for (const x of vx) rail(x, mid + base, rw, S - mid); }
    if (mask & 1) { if (V) half(V, 0, 0, V.width, V.height / 2, Math.round((S - V.width) / 2), T - V.height); else for (const x of vx) rail(x, base, rw, mid); }
  }
  const node = !(hOnly || vOnly);   // góc / ngã ba / cô lập
  const pi = c.postImg;
  if (pi && (c.postMode !== 'nodes' || node)) g.drawImage(pi, 0, 0, pi.width, pi.height, Math.round((S - pi.width) / 2), T - pi.height, pi.width, pi.height);
  cv.__hi = ART.hi; return cv;
}
function applyObj(name, chain = packChain()) {
  const d = O[name]; if (!d || d.animFlag) return;   // cờ có animation riêng, không đổi theo vùng
  if (d.img0 === undefined) { d.img0 = d.img; d.w0 = d.w; d.h0 = d.h; }   // nhớ bản vẽ code để rớt về
  let m = null;
  if (name.startsWith('rocky_')) { const tier = name.slice(name.lastIndexOf('_') + 1); const img = chain.map(p => p.rocky[tier]).find(Boolean); m = img ? { img, ox: 0, oy: 0 } : null; }
  else m = chain.map(p => p.objects[name]).find(Boolean) || null;
  if (m) { d.img = m.img; d.w = m.img.width / ART.hi; d.h = m.img.height / ART.hi; d.ox = m.ox; d.oy = m.oy; }
  else { d.img = d.img0; d.w = d.w0; d.h = d.h0; d.ox = 0; d.oy = 0; }
  const lp = chain.map(p => p.loops && p.loops[name]).find(Boolean); d.frames = lp || null;
}

// ---------- shim drawImage ----------
let shimmed = false;
function installShim() {
  if (shimmed) return; shimmed = true;
  const raw = CanvasRenderingContext2D.prototype.drawImage;
  CanvasRenderingContext2D.prototype.drawImage = function (img, ...a) {
    const k = img && img.__hi; if (!k) return raw.call(this, img, ...a);
    if (a.length === 2) return raw.call(this, img, a[0], a[1], (img.__w || img.width) / k, (img.__h || img.height) / k);
    if (a.length === 4) return raw.call(this, img, a[0], a[1], a[2], a[3]);
    return raw.call(this, img, a[0] * k, a[1] * k, a[2] * k, a[3] * k, a[4], a[5], a[6], a[7]);
  };
}

// ---------- nền Wang theo đỉnh lưới ----------
// Ô (tx,ty) vẽ 1 tile Wang neo (sx-8, sy-8): 4 góc = lớp đất của 4 ô (tx-1,ty-1) (tx,ty-1) (tx-1,ty) (tx,ty).
// Lớp theo thứ tự gói: lớp sau đè lớp trước ở ô có góc thuộc lớp đó ("lower" của mọi lớp = đất nền).
const WANG = { layers: [], cls: {}, decor: {}, base: 'grass', pending: [], fish: null, fishQ: [], foamQ: [] };
const isWater = c => c === 'water' || c === 'deep';
function clsAt(m, x, y) { x = Math.max(0, Math.min(m.w - 1, x)); y = Math.max(0, Math.min(m.h - 1, y)); return WANG.cls[m.ground[y * m.w + x]] || WANG.base; }
/* px-farm2: ô đất cày ĐÃ TƯỚI = chính pixel đất của ô đó (4 góc phần tư từ 4 ô Wang kề) tô tối, giữ alpha → ranh ướt/khô thẳng theo ô như Stardew, mép ngoài vẫn bo tròn */
function wetSet() {
  if (WANG.wetCache) return WANG.wetCache;
  const L = WANG.layers.find(l => l.upper === 'tilled'); if (!L) return null; const out = {};
  for (const [k, img] of Object.entries(L.byKey)) { if (k.endsWith('v')) continue; const c = mkCanvas(img.width, img.height), g = c.getContext('2d'); g.drawImage(img, 0, 0, img.width, img.height); g.globalCompositeOperation = 'source-atop'; g.fillStyle = 'rgba(30,22,60,0.42)'; g.fillRect(0, 0, img.width, img.height); c.__hi = img.__hi; out[k] = c; }
  return WANG.wetCache = out;
}
ART.tilledWet = (g, m, tx, ty, sx, sy) => {
  const set = wetSet(); if (!set) return false; const L = WANG.layers.find(l => l.upper === 'tilled');
  const key = (x, y) => [clsAt(m, x - 1, y - 1), clsAt(m, x, y - 1), clsAt(m, x - 1, y), clsAt(m, x, y)].map(v => v === L.upper ? 1 : 0).join('');
  const q = [[tx, ty, 8, 8, 0, 0], [tx + 1, ty, 0, 8, 8, 0], [tx, ty + 1, 8, 0, 0, 8], [tx + 1, ty + 1, 0, 0, 8, 8]];   /* ô Wang (x,y) vẽ tại (x*16-8, y*16-8): góc phần tư của ô đất */
  for (const [cx, cy, ox, oy, dx, dy] of q) { const img = set[key(cx, cy)]; if (img) g.drawImage(img, ox, oy, 8, 8, sx + dx, sy + dy, 8, 8); }
  return true;
};
function groundCell(g, m, tx, ty, sx, sy) {
  if (!WANG.layers.length) return false;
  const c = [clsAt(m, tx - 1, ty - 1), clsAt(m, tx, ty - 1), clsAt(m, tx - 1, ty), clsAt(m, tx, ty)];
  let drawn = false;
  for (const L of WANG.layers) {
    const key = c.map(v => v === L.upper ? 1 : 0).join('');
    if (!drawn || key !== '0000') { let img = L.byKey[key]; const v = L.byKey[key + 'v']; if (v) img = v[h2(tx, ty) % v.length]; if (img) { g.drawImage(img, sx - 8, sy - 8); drawn = true; } }
  }
  if (drawn && c[3] === 'water' && c[0] === 'water' && c[1] === 'water' && c[2] === 'water') {   // nước sâu: 2 gợn sáng trôi chậm (không nhấp nháy)
    const t = performance.now() / 1000, h = h2(tx, ty), ph = ((t * 0.35 + (h % 100) / 100) % 1);
    g.fillStyle = 'rgba(255,255,255,0.28)'; g.fillRect(sx + Math.round(2 + ph * 10), sy + (h >>> 4) % 12 + 2, 3, 1);
    g.fillRect(sx + Math.round(12 - ph * 8), sy + ((h >>> 9) % 12) + 3, 2, 1);
  }
  const dec = WANG.decor[tileName(m.ground[ty * m.w + tx])];
  if (dec && drawn) for (let i = 0; i < dec.length; i++) {
    const d = dec[i], h = h2(tx * 7 + i, ty * 13 + i);
    /* decor tràn sang ô phải/dưới → gom lại, vẽ sau khi xong toàn bộ nền (ART.groundDone), không thì ô kế tiếp đè mất nửa */
    if ((h % 1000) / 1000 < d.p) for (let k = 0; k < d.n; k++) { const hh = h2(h, k); WANG.pending.push(d.img, sx + (hh % 11) - 2, sy + ((hh >>> 8) % 11) - 4); }
  }
  /* plan-14 (học Stardew): bọt trắng động dọc mép nước–đất; bóng cá bơi lững lờ trong ô nước nông (ô có 8 hàng xóm đều nước) */
  if (drawn) {
    const wc = c.map(isWater), nw = wc[0] + wc[1] + wc[2] + wc[3];
    if (nw > 0 && nw < 4) {
      const t = performance.now() / 1000, h = h2(tx * 11, ty * 17), segs = [];
      const T = wc[0] && wc[1], B = wc[2] && wc[3], Lf = wc[0] && wc[2], R = wc[1] && wc[3];
      if ((T && !wc[2] && !wc[3]) || (B && !wc[0] && !wc[1])) segs.push([0, 8, 16, 8]);
      else if ((Lf && !wc[1] && !wc[3]) || (R && !wc[0] && !wc[2])) segs.push([8, 0, 8, 16]);
      else { if (wc[0] !== wc[1] || wc[0] !== wc[2]) { if (wc[0] !== wc[1] && wc[0] !== wc[2]) segs.push([0, 8, 8, 0]); if (wc[1] !== wc[0] && wc[1] !== wc[3]) segs.push([8, 0, 16, 8]); }
        if (wc[3] !== wc[1] && wc[3] !== wc[2]) segs.push([8, 16, 16, 8]); if (wc[2] !== wc[0] && wc[2] !== wc[3]) segs.push([0, 8, 8, 16]); }
      for (const [x0, y0, x1, y1] of segs) for (let k = 0; k <= 4; k++) {
        const f = k / 4, a = 0.35 + 0.45 * (0.5 + 0.5 * Math.sin(t * 2.2 + (h % 7) + k * 1.3)); if (a < 0.5) continue;
        WANG.foamQ.push(sx - 8 + Math.round(x0 + (x1 - x0) * f), sy - 8 + Math.round(y0 + (y1 - y0) * f), a);   /* mép Wang đi qua góc trên-trái ô (tile neo sx-8, sy-8); vẽ sau nền */
      }
    }
    if (WANG.fish && nw === 4 && c[3] === 'water') {
      const h = h2(tx * 3 + 1, ty * 5 + 2);
      if (h % 100 < 4 && isWater(clsAt(m, tx - 1, ty)) && isWater(clsAt(m, tx + 1, ty)) && isWater(clsAt(m, tx, ty - 1)) && isWater(clsAt(m, tx, ty + 1)) && isWater(clsAt(m, tx + 2, ty)) && isWater(clsAt(m, tx - 2, ty))) {
        const t = performance.now() / 1000, dir = h & 8 ? 1 : -1, sp = 4 + (h >>> 5) % 5, ph = ((h >>> 9) % 1000) / 1000;
        const x = sx + (((t * sp * dir + ph * 40) % 40) + 40) % 40 - 12, y = sy + (h >>> 12) % 10 + 1, fr = Math.floor(t * 3 + ph * 4) % 2;
        WANG.fishQ.push(WANG.fish[fr], x, y, dir);
      }
    }
  }
  return drawn;
}
function groundDone(g) {
  const q = WANG.pending; for (let i = 0; i < q.length; i += 3) g.drawImage(q[i], q[i + 1], q[i + 2]); q.length = 0;
  const fq = WANG.foamQ; for (let i = 0; i < fq.length; i += 3) { g.fillStyle = `rgba(255,255,255,${fq[i + 2].toFixed(2)})`; g.fillRect(fq[i], fq[i + 1], 2, 1); } fq.length = 0;
  const f = WANG.fishQ; if (f.length) { g.globalAlpha = 0.42; for (let i = 0; i < f.length; i += 4) { const im = f[i], x = f[i + 1], y = f[i + 2], d = f[i + 3]; g.save(); if (d < 0) { g.translate(x * 2 + 16, 0); g.scale(-1, 1); } g.drawImage(im, 0, 0, im.width, im.height, x, y, 16, 16); g.restore(); } g.globalAlpha = 1; f.length = 0; }
}
const tileNames = {}; for (const [n, id] of Object.entries(T)) tileNames[id] = n;
const tileName = id => tileNames[id];

// ---------- nhân vật: thân gần nhất theo da/tóc trong gói vùng, đổi màu áo theo sắc độ ----------
const charCache = new Map();
const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const dist = (a, b) => { const x = hex(a), y = hex(b); return (x[0] - y[0]) ** 2 + (x[1] - y[1]) ** 2 + (x[2] - y[2]) ** 2; };
function rgb2hsl(r, g, b) {
  r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2; let h = 0, s = 0;
  if (mx !== mn) { const d = mx - mn; s = l > .5 ? d / (2 - mx - mn) : d / (mx + mn); h = mx === r ? ((g - b) / d + (g < b ? 6 : 0)) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; }
  return [h, s, l];
}
function hsl2rgb(h, s, l) {
  const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = l - c / 2;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
}
function charSheetPx(c) {
  const S = window.__S, isPlayer = !!(S && S.save && c === S.save.outfit);
  const zone = isPlayer ? 'village' : (ART.zone || 'village');      // người chơi luôn mặc bộ Làng
  const key = `${zone}|${c.hero || ''}|${c.skin}|${c.hair}|${c.shirt}|${c.pants}`;
  if (charCache.has(key)) return charCache.get(key);
  let out = null;
  if (c.hero && ART.fixed[c.hero]) out = ART.fixed[c.hero].img;   /* outfit.hero = 'hung': sheet riêng theo avatar anh (px-hero.py), bỏ qua màu áo */
  for (const f of Object.values(ART.fixed)) if (f.skin === c.skin && f.hair === c.hair && f.shirt === c.shirt) { out = f.img; break; }
  if (!out) {
    const base = packChain(zone).map(p => p.chars).find(a => a && a.length) || [];
    if (base.length) {
      let best = base[0], bd = Infinity;
      for (const b of base) { const d = dist(b.skin, c.skin) * 1.5 + dist(b.hair, c.hair); if (d < bd) { bd = d; best = b; } }
      const cfg = (ART.man.chars || {});
      out = recolorShirt(best.img, c.shirt, cfg.shirtHue || [300, 350], cfg.shirtSat || 0.3);
      const acts = best.actions;   // clip động tác của thân này (gói Làng: chars.actions[body])
      if (acts) { out.actions = {}; for (const [n, a] of Object.entries(acts)) out.actions[n] = { img: recolorShirt(a.img, c.shirt, cfg.shirtHue || [300, 350], cfg.shirtSat || 0.3), n: a.n, ch: a.ch || 20, cw: a.cw || 16 }; }
    }
  }
  if (out) charCache.set(key, out);
  return out;
}
function recolorShirt(src, shirt, [h0, h1], minSat) {
  const w = src.width, h = src.height, c = mkCanvas(w, h), g = c.getContext('2d'); g.drawImage(src, 0, 0, w, h); // 4 tham số: shim không đụng
  const im = g.getImageData(0, 0, w, h), d = im.data, [th, ts, tl] = rgb2hsl(...hex(shirt));
  let sum = 0, n = 0, idx = [];
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] < 8) continue; const [hh, ss, ll] = rgb2hsl(d[i], d[i + 1], d[i + 2]);
    if (hh >= h0 && hh <= h1 && ss >= minSat && ll > .12 && ll < .9) { idx.push(i); sum += ll; n++; }
  }
  const l0 = n ? sum / n : .5;
  for (const i of idx) { const ll = rgb2hsl(d[i], d[i + 1], d[i + 2])[2]; const nl = Math.max(.05, Math.min(.95, tl + (ll - l0))); const [r, gg, b] = hsl2rgb(th, ts, nl); d[i] = r; d[i + 1] = gg; d[i + 2] = b; }
  g.putImageData(im, 0, 0); c.__hi = src.__hi; return c;
}

// ---------- thú cưng Rocky con: 4 khung PixelLab (đứng, bước A, bước B, ngồi), đổi màu khăn hồng → màu cờ ----------
const petCache = new Map();
function petFramesPx(scarf) {
  const key = scarf ? scarf.join(',') : '-'; if (petCache.has(key)) return petCache.get(key);
  const vp = ART.packs.village, base = vp && vp.creatures && vp.creatures.rockypet; if (!base) return null;
  const cfg = ART.man.chars || {};
  const set = base.map(([right]) => {
    const w = right.__w || right.width, h = right.__h || right.height, plainSrc = mkCanvas(w, h); plainSrc.getContext('2d').drawImage(right, 0, 0, w, h);
    const rc = scarf ? recolorShirt(plainSrc, scarf[0], cfg.shirtHue || [300, 350], cfg.shirtSat || 0.3) : plainSrc;
    rc.__hi = ART.hi; const fl = flipC(rc, 1, 0); return [logicalCanvas(rc), logicalCanvas(fl)];
  });
  set.px = true; petCache.set(key, set); return set;
}

// ---------- cờ quốc gia phất ----------
function buildFlags(pole, flags) {
  const H = ART.hi, W = 24 * H, Hh = 32 * H, N = 6, cw = 22, chh = 14, cx0 = Math.round((16 * H - pole.width) / 2) - 4 + pole.width - 3, cy0 = 6;   // canvas rộng 24 ô để lá cờ (22 px) sau cột không bị cắt   // lá cờ 22×14 hi-px, treo bên phải đỉnh cột
  const shade = (hex, k) => { const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16)); return `rgb(${Math.min(255, r * k) | 0},${Math.min(255, g * k) | 0},${Math.min(255, b * k) | 0})`; };
  const shadeRGB = (r, g, b, k) => `rgb(${Math.min(255, r * k) | 0},${Math.min(255, g * k) | 0},${Math.min(255, b * k) | 0})`;
  for (const [key, cols] of Object.entries(FLAG_COLORS)) {
    const d = O[flagName(key)]; if (!d) continue;
    const fd = flags[key];   // quốc kỳ thật (ImageData 22×14) nếu có, không thì sọc màu
    const frames = [];
    for (let f = 0; f < N; f++) {
      const c = mkCanvas(W, Hh), g = c.getContext('2d');
      const px0 = Math.round((16 * H - pole.width) / 2) - 4, py0 = Hh - pole.height;   // vị trí cột; lá cờ vẽ TRƯỚC, cột đè lên sau → cờ buộc sau cột
      const ph = f / N * Math.PI * 2;
      for (let x = 0; x < cw; x++) {
        const t = x / cw, dy = Math.round(Math.sin(t * Math.PI * 2 - ph) * 2 * t), br = 1 + Math.cos(t * Math.PI * 2 - ph + 0.6) * 0.16 * t + 0.06;
        for (let y = 0; y < chh; y++) {
          if (fd) { const i = (Math.min(fd.height - 1, y) * fd.width + Math.min(fd.width - 1, x)) * 4; g.fillStyle = shadeRGB(fd.data[i], fd.data[i + 1], fd.data[i + 2], br); }
          else { const stripe = Math.min(cols.length - 1, Math.floor(y / chh * cols.length)); g.fillStyle = shade(cols[stripe], br); }
          g.fillRect(cx0 + x, cy0 + y + dy, 1, 1);
        }
        g.fillStyle = 'rgba(40,30,30,.9)'; g.fillRect(cx0 + x, cy0 - 1 + dy, 1, 1); g.fillRect(cx0 + x, cy0 + chh + dy, 1, 1);   // viền trên/dưới
      }
      g.fillStyle = 'rgba(40,30,30,.9)'; g.fillRect(cx0 + cw, cy0 + Math.round(Math.sin(Math.PI * 2 - ph) * 2) - 1, 1, chh + 2);
      g.drawImage(pole, 0, 0, pole.width, pole.height, px0, py0, pole.width, pole.height);
      g.fillStyle = '#e8d8a0'; g.fillRect(px0 + 3, cy0 + 1, pole.width - 4, 1); g.fillRect(px0 + 3, cy0 + chh - 2, pole.width - 4, 1);   // 2 vòng dây buộc cờ vào cột
      c.__hi = H; frames.push(c);
    }
    if (d.img0 === undefined) { d.img0 = d.img; d.w0 = d.w; d.h0 = d.h; }
    d.frames = frames; d.img = frames[0]; d.w = 24; d.h = 32; d.ox = 0; d.oy = 0; d.animFlag = true;
  }
}
