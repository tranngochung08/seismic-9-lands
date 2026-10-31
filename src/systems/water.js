/* water.js — plan-68: VFX NƯỚC + CÁ BƠI vẽ code hoàn toàn (skill vfx-code, anh chốt code hoàn toàn 30/10).
   Ô nước PixelLab giữ làm nền; mọi chuyển động trên mặt nước là code, vẽ theo lưới 2 điểm / px logic (RES 2), mờ bằng dither Bayer 4×4.
   - Mặt nạ nước theo ĐÚNG điểm ảnh ô Wang (ghép các lớp như art.js rồi đo màu xanh) + ô ao (ponds.js, khối bo góc blobTile).
   - Mặt nước sống: caustic cộng sáng (atlas tuần hoàn 96 px logic, 24 khung ~5 s) + bọt mép bờ vỗ chậm 8 pha (~4,2 s). Không nháy.
   - Tương tác: gợn vòng khi người / dân / Rocky / linh thú / quái lội, bơi; vệt rẽ nước sau bè, thuyền, người bơi; toé nước (giọt có trọng lực) khi trúng đòn trong nước, rơi xuống nước, cá nhảy.
   - Cá: bầy boids (dính bầy / cùng hướng / giãn cách / né bờ / né người, quay mượt 32 hướng, uốn thân 6 pha); loài theo vùng; tầng nước: cá nhìn thấy + bóng đáy + bọt khí + caustic đáy, u4 cá đèn lồng sáng.
   - Cờ ?water=old = đường vẽ cũ (art.js / ponds / swim / sea_raft / sea_dive / underwater giữ nhánh cũ khi ART.waterNew = false).
   Thử: window.__water (stat, set, splash, fish, ripple). Kế hoạch: plan-68-nuoc.md. */
import { ART } from '../art.js';
import { WATER } from '../anim.js';

const QS = typeof location !== 'undefined' ? new URLSearchParams(location.search) : null;
export const WFX = { on: !(QS && QS.get('water') === 'old') };
ART.waterNew = WFX.on;

const TAU = Math.PI * 2;
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const bay = (hx, hy) => (BAYER[((hy & 3) << 2) | (hx & 3)] + 0.5) / 16;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const mkC = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
function rngOf(seed) { let s = (seed >>> 0) || 0x9e3779b9; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
const R = rngOf(6801);

/* ---------- bảng màu 8 bậc theo loại nước (đo từ ảnh ô PixelLab: m1/wang/c2 nông, m1/wang/e3 + sea/wang/a2 sâu, ô ao art.js POND.pal) ---------- */
const K_SH = 1, K_DP = 2, K_PD = 3;
const BASE = { 1: [86, 155, 243], 2: [52, 112, 205], 3: [118, 190, 253], 9: [63, 143, 214] };
const mix = (a, b, k) => [Math.round(a[0] + (b[0] - a[0]) * k), Math.round(a[1] + (b[1] - a[1]) * k), Math.round(a[2] + (b[2] - a[2]) * k)];
const css = c => `rgb(${c[0]},${c[1]},${c[2]})`;
function pal8(b) {
  const N = [14, 30, 70], W = [236, 250, 255];
  const rgb = [mix(b, N, 0.62), mix(b, N, 0.45), mix(b, N, 0.28), mix(b, N, 0.12), b, mix(b, W, 0.2), mix(b, W, 0.45), mix(b, W, 0.78)];
  return { rgb, css: rgb.map(css) };
}
const PAL = { 1: pal8(BASE[1]), 2: pal8(BASE[2]), 3: pal8(BASE[3]) };

/* ---------- trạng thái ---------- */
const ST = {
  ctx: null, map: null, zid: '', under: false, cave: false, sea: false, uLv: 0,
  wang: false, cellAny: false, mw: 0, mh: 0, tileCombo: null, combos: [{ none: true }], comboKey: new Map(), cellKind: null, cellMasks: new Map(),
  snap: null, snapT: 0, pondSig: '',
  fish: [], schools: 0, rip: [], wake: [], drops: [], foamPatch: [], bub: [], ents: new Map(),
  t: 0, lod: 0, lodLock: false, jumpT: 6, riseT: 2, popT: 0, ventT: 1, spawnT: 0, buildQ: [], atlases: new Map(), cls: new Map(),
  vis: [], visN: 0, perf: new Float32Array(240), pi: 0, pn: 0, acc: 0, lastFrame: -1, prevHp: new WeakMap(), heroHp: -1, knockZ: 0, frame: 0,
  n: { caus: 0, foam: 0, fish: 0, rip: 0, drops: 0, bub: 0 },
};
const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
function tAdd(ms) { ST.acc += ms; }

/* ---------- mặt nạ nước ---------- */
const isWC = c => c === 'water' || c === 'deep';
function blueAt(d, i) { const r = d[i], gg = d[i + 1], b = d[i + 2], a = d[i + 3]; return a > 100 && b > r + 40 && b >= gg - 12; }
function buildCombo(c4) {
  const W = ART.wang, any = c4.some(isWC); if (!any) return { none: true };
  const all = c4.every(isWC), mask = new Uint8Array(1024);
  const qk = c4.map(c => (c === 'deep' ? K_DP : K_SH));
  if (all) { for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) mask[y * 32 + x] = qk[(y < 16 ? 0 : 2) + (x < 16 ? 0 : 1)]; }
  else {
    const c = mkC(32, 32), g = c.getContext('2d'); let drawn = false;
    for (const L of W.layers) { const key = c4.map(v => (v === L.upper ? 1 : 0)).join(''); if (!drawn || key !== '0000') { const im = L.byKey[key]; if (im) { g.drawImage(im, 0, 0, 32, 32); drawn = true; } } }
    const d = g.getImageData(0, 0, 32, 32).data;
    for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) if (blueAt(d, (y * 32 + x) * 4)) mask[y * 32 + x] = qk[(y < 16 ? 0 : 2) + (x < 16 ? 0 : 1)];
  }
  const kinds = new Set(mask); kinds.delete(0);
  return { none: !kinds.size, all, mask, kind1: kinds.size === 1 ? [...kinds][0] : 0, foam: null, mcv: null };
}
function comboAt(tx, ty) {
  if (!ST.wang) return ST.combos[0];
  tx = clamp(tx, 0, ST.mw); ty = clamp(ty, 0, ST.mh); const i = ty * (ST.mw + 1) + tx; let id = ST.tileCombo[i];
  if (id < 0) {
    const m = ST.map, c4 = [ART.clsAt(m, tx - 1, ty - 1), ART.clsAt(m, tx, ty - 1), ART.clsAt(m, tx - 1, ty), ART.clsAt(m, tx, ty)];
    if (!c4.some(isWC)) id = 0;
    else { const key = c4.join('|'); id = ST.comboKey.get(key); if (id === undefined) { id = ST.combos.length; ST.combos.push(buildCombo(c4)); ST.comboKey.set(key, id); } }
    ST.tileCombo[i] = id;
  }
  return ST.combos[id];
}
function cellMask(x, y) {   /* ô nước vẽ kiểu khối (ao): 8 ô kề → hình blobTile (inset 1/32, bo góc) */
  const K = ST.cellKind, w = ST.mw, h = ST.mh, at = (a, b) => (a >= 0 && b >= 0 && a < w && b < h && K[b * w + a] ? 1 : 0);
  const bits = at(x, y - 1) | (at(x + 1, y) << 1) | (at(x, y + 1) << 2) | (at(x - 1, y) << 3) | (at(x + 1, y - 1) << 4) | (at(x + 1, y + 1) << 5) | (at(x - 1, y + 1) << 6) | (at(x - 1, y - 1) << 7);
  const kind = K[y * w + x], key = bits + kind * 256; let e = ST.cellMasks.get(key);
  if (!e) {
    const cls = ART.blobCls ? ART.blobCls(bits) : null, mask = new Uint8Array(1024);
    for (let i = 0; i < 1024; i++) mask[i] = cls ? (cls[i] ? kind : 0) : kind;
    e = { bits, mask, all: bits === 255, kind1: kind, foam: null, mcv: null }; ST.cellMasks.set(key, e);
  }
  return e;
}
/* hx, hy: toạ độ thế giới theo nửa px (RES 2). → 0 khô · 1 nông · 2 sâu · 3 ao */
function wetH(hx, hy) {
  hx = Math.floor(hx); hy = Math.floor(hy);
  if (ST.cellAny) { const x = hx >> 5, y = hy >> 5; if (x >= 0 && y >= 0 && x < ST.mw && y < ST.mh) { const k = ST.cellKind[y * ST.mw + x]; if (k) return cellMask(x, y).mask[((hy & 31) << 5) | (hx & 31)] ? k : 0; } }
  if (ST.wang) { const c = comboAt((hx + 16) >> 5, (hy + 16) >> 5); if (c.none) return 0; return c.mask[(((hy + 16) & 31) << 5) | ((hx + 16) & 31)]; }
  return 0;
}
const wetAt = (x, y) => wetH(x * 2, y * 2);
function underOpen(x, y) { const m = ST.map, tx = Math.floor(x / 16), ty = Math.floor(y / 16); return tx > 0 && ty > 0 && tx < m.w - 1 && ty < m.h - 1 && !ST.ctx.isSolid(m, tx, ty); }
const swimOk = (x, y) => (ST.under ? underOpen(x, y) : wetAt(x, y) > 0);
export const waterAt = (x, y) => (WFX.on && ST.map && !ST.under ? wetAt(x, y) : 0);
function rebuildMask(ctx) {
  const m = ctx.S.map, T = ctx.T, W = ART.wang;
  ST.mw = m.w; ST.mh = m.h;
  if (ST.wLayers !== (W && W.layers)) { ST.wLayers = W && W.layers; ST.combos = [{ none: true }]; ST.comboKey = new Map(); ST.cellMasks = new Map(); }   /* khối Wang theo lớp đất (không theo vị trí): thủy triều đổi ô thì giữ */
  ST.wang = !!(W && W.layers && W.layers.length && ART.clsAt && (Object.values(W.cls).some(isWC) || isWC(W.base)));
  ST.tileCombo = ST.wang ? new Int16Array((m.w + 1) * (m.h + 1)).fill(-1) : null;
  const ponds = (ctx.S.save.sys && ctx.S.save.sys.ponds && ctx.S.save.sys.ponds[ST.zid]) || {}, K = new Uint8Array(m.w * m.h); let any = false;
  const noWang = !(W && W.layers && W.layers.length);
  for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
    const t = m.ground[y * m.w + x]; if (t !== T.WATER && t !== T.DEEP && t !== T.REEF) continue;
    if (ponds[x + ',' + y]) { K[y * m.w + x] = K_PD; any = true; }
    else if (noWang) { K[y * m.w + x] = t === T.DEEP ? K_DP : K_SH; any = true; }
  }
  ST.maskVer = (ST.maskVer || 0) + 1; ST.cellKind = K; ST.cellAny = any; ST.snap = m.ground.slice(); ST.pondSig = Object.keys(ponds).join(';');
}
function checkChanged(ctx, full) {   /* so nền theo lát (1/30 bản đồ / khung) — không quét cả bản đồ trong 1 khung */
  const m = ctx.S.map; if (!ST.snap || ST.snap.length !== m.ground.length) { rebuildMask(ctx); return; }
  const a = ST.snap, b = m.ground, W1 = m.w + 1, step = Math.ceil(a.length / 30), i0 = full ? 0 : (ST.scanI || 0) % a.length, i1 = full ? a.length : Math.min(a.length, i0 + step); ST.scanI = i1 >= a.length ? 0 : i1;
  for (let i = i0; i < i1; i++) if (a[i] !== b[i]) {   /* thuỷ triều / đào ao: chỉ xoá khối Wang quanh ô đổi (khối theo lớp đất giữ nguyên) */
    if (ST.cellAny || !ST.wang) { rebuildMask(ctx); return; }
    a[i] = b[i]; ST.maskVer = (ST.maskVer || 0) + 1; const x = i % m.w, y = (i / m.w) | 0; for (let dy = 0; dy <= 1; dy++) for (let dx = 0; dx <= 1; dx++) if (x + dx <= m.w && y + dy <= m.h) ST.tileCombo[(y + dy) * W1 + x + dx] = -1;
  }
}
function checkPonds(ctx) { const ponds = (ctx.S.save.sys && ctx.S.save.sys.ponds && ctx.S.save.sys.ponds[ST.zid]) || {}, sig = Object.keys(ponds).join(';'); if (sig !== ST.pondSig) { rebuildMask(ctx); syncPonds(ctx); return; } let n = 0; for (const k in ponds) n += ponds[k].n || 0; if (n !== ST.pondN) { ST.pondN = n; syncPonds(ctx); } }

/* ---------- caustic: trường sóng 3 hướng tuần hoàn (96 px logic = 192 điểm), 24 khung / vòng ~5 s ---------- */
const CP = 192, CPAD = 224, CN = 32, CFPS = 4;   /* vòng 8 s */
const CAUS = { masks: null, cv: {}, cur: {}, job: null };
/* caustic kiểu lưới tế bào (Worley F2 − F1): 26 hạt nhân lượn vòng tuần hoàn → đường sáng mảnh nối nhau như ánh nắng xuyên nước */
const CSEED = (() => { const r = rngOf(68); const a = []; for (let i = 0; i < 26; i++) a.push({ x: r() * CP, y: r() * CP, rr: 7 + r() * 11, k: [1, -1, 2, -2, 1][Math.floor(r() * 5)], ph: r() * TAU }); return a; })();
function causRows(f, M, y0, y1) {
  const ph = (f / CN) * TAU, P = CSEED.map(s => [s.x + Math.cos(ph * s.k + s.ph) * s.rr, s.y + Math.sin(ph * s.k + s.ph) * s.rr * 0.8]);
  for (let y = y0; y < y1; y++) for (let x = 0; x < CP; x++) {
    let f1 = 1e9, f2 = 1e9;
    const wx = x + 5.5 * Math.sin(TAU * (2 * y + x) / CP + ph) + 3 * Math.sin(TAU * 5 * y / CP - ph * 2), wy = y + 5.5 * Math.sin(TAU * (2 * x - y) / CP - ph) + 3 * Math.sin(TAU * 4 * x / CP + ph);   /* cong đường viền tế bào → gợn mềm như caustic thật */
    for (let i = 0; i < P.length; i++) { let dx = Math.abs(wx - P[i][0]) % CP, dy = Math.abs(wy - P[i][1]) % CP; if (dx > CP / 2) dx = CP - dx; if (dy > CP / 2) dy = CP - dy; const d = dx * dx + dy * dy; if (d < f1) { f2 = f1; f1 = d; } else if (d < f2) f2 = d; }
    const e = Math.sqrt(f2) - Math.sqrt(f1);
    M[y * CPAD + x] = e < 0.7 && f1 > 30 ? 2 : e < 1.5 ? 1 : 0;
  }
}
function causStep() {   /* dựng dần: tối đa 40 hàng / khung (~1 ms) */
  if (!CAUS.masks) CAUS.masks = new Array(CN).fill(null);
  let j = CAUS.job; if (!j) { const f = CAUS.masks.findIndex(m => !m); if (f < 0) return; j = CAUS.job = { f, y: 0, M: new Uint8Array(CPAD * CPAD) }; }
  const t0 = now(); while (j.y < CP && now() - t0 < 0.5) { const y1 = Math.min(CP, j.y + 2); causRows(j.f, j.M, j.y, y1); j.y = y1; }   /* chia theo thời gian: ≤ 0,5 ms / khung */
  if (j.y >= CP) { const M = j.M; for (let y = 0; y < CPAD; y++) for (let x = 0; x < CPAD; x++) if (x >= CP || y >= CP) M[y * CPAD + x] = M[(y % CP) * CPAD + (x % CP)]; CAUS.masks[j.f] = M; CAUS.job = null; }
}
const CVAR = { full: [[14, 19, 18], [30, 36, 32], 1], thin: [[11, 15, 15], [24, 29, 27], 1], dim: [[9, 12, 13], [20, 24, 24], 1], floor: [[20, 24, 16], [42, 46, 30], 1], floorDim: [[11, 13, 9], [24, 26, 18], 1] };   /* chỉ đổi cường độ, không thưa bằng dither (tránh ranh vuông giữa các ô) */
function causCanvas(variant, f) {   /* canvas của khung f — dựng lại khi đổi khung (putImageData 224², ~0,2 ms) */
  if (!CAUS.masks) CAUS.masks = new Array(CN).fill(null);
  if (!CAUS.masks[f]) { let k = f; while (k >= 0 && !CAUS.masks[k]) k--; if (k < 0) return null; f = k; }   /* khung chưa dựng → dùng khung gần nhất đã có */
  let cv = CAUS.cv[variant]; if (!cv) { cv = CAUS.cv[variant] = mkC(CPAD, CPAD); CAUS.cur[variant] = -1; }
  if (CAUS.cur[variant] !== f) {
    const M = CAUS.masks[f], V = CVAR[variant], g = cv.getContext('2d'), id = CAUS.id || (CAUS.id = g.createImageData(CPAD, CPAD)), d32 = new Uint32Array(id.data.buffer);
    const C1 = (255 << 24 | V[0][2] << 16 | V[0][1] << 8 | V[0][0]) >>> 0, C2 = (255 << 24 | V[1][2] << 16 | V[1][1] << 8 | V[1][0]) >>> 0;
    for (let i = 0; i < M.length; i++) { const c = M[i]; d32[i] = c === 1 ? C1 : c === 2 ? C2 : 0; }
    g.putImageData(id, 0, 0); CAUS.cur[variant] = f;
  }
  return cv;
}
/* mẫu lặp (pattern) 192×192 của khung f: tô cả dải ô nước kín bằng 1 lệnh fillRect (ít lệnh vẽ → nhẹ trên điện thoại) */
const PAT = { cv: {}, pat: {}, cur: {} };
function causPattern(g, variant, f) {
  if (!CAUS.masks) return null; let k = f; while (k >= 0 && !CAUS.masks[k]) k--; if (k < 0) return null;
  if (PAT.cur[variant] !== k || !PAT.pat[variant]) {
    const cv = PAT.cv[variant] || (PAT.cv[variant] = mkC(CP, CP)), cg = cv.getContext('2d'), id = PAT.id || (PAT.id = cg.createImageData(CP, CP)), d32 = new Uint32Array(id.data.buffer), M = CAUS.masks[k], V = CVAR[variant];
    const C1 = (255 << 24 | V[0][2] << 16 | V[0][1] << 8 | V[0][0]) >>> 0, C2 = (255 << 24 | V[1][2] << 16 | V[1][1] << 8 | V[1][0]) >>> 0;
    for (let y = 0; y < CP; y++) { const r = y * CPAD, o = y * CP; for (let x = 0; x < CP; x++) { const c = M[r + x]; d32[o + x] = c === 1 ? C1 : c === 2 ? C2 : 0; } }
    cg.putImageData(id, 0, 0); PAT.pat[variant] = g.createPattern(cv, 'repeat'); PAT.cur[variant] = k;
  }
  return PAT.pat[variant];
}
const PM = typeof DOMMatrix !== 'undefined' ? new DOMMatrix() : null;
function patAt(pat, cx, cy) { if (PM) { PM.a = 0.5; PM.d = 0.5; PM.e = -cx; PM.f = -cy; pat.setTransform(PM); } return pat; }
/* ô ven bờ: caustic đã cắt theo mặt nạ nước, dựng trên CPU (ImageData 32×32) khi đổi khung — mỗi ô 1 canvas riêng, nhớ tối đa 260 ô */
const CU = new Map();
function causUnit(e, ox, oy, variant, f) {
  if (!CAUS.masks) return null; let k = f; while (k >= 0 && !CAUS.masks[k]) k--; if (k < 0) return null;
  const key = ox + ',' + oy; let u = CU.get(key);
  if (u && u.f === k && u.v === variant && u.e === e) return u.c;
  if (u && u.e === e && u.v === variant && ST.cuBudget <= 0) return u.c;   /* hết lượt dựng khung này → giữ khung cũ thêm 1 nhịp */
  ST.cuBudget--;
  if (!u) { if (CU.size > 260) { const first = CU.keys().next().value; const old = CU.get(first); CU.delete(first); u = old; } else u = { c: mkC(32, 32) }; CU.set(key, u); }
  const M = CAUS.masks[k], V = CVAR[variant], g = u.c.getContext('2d'), id = g.createImageData(32, 32), d = id.data, bx = ((ox * 2) % CP + CP) % CP, by = ((oy * 2) % CP + CP) % CP;
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
    const mk = e.mask[y * 32 + x]; if (!mk) continue; const c = M[(by + y) * CPAD + bx + x]; if (!c) continue;
    const col = (mk === K_DP ? CVAR.dim : V)[c - 1], i = (y * 32 + x) * 4; d[i] = col[0]; d[i + 1] = col[1]; d[i + 2] = col[2]; d[i + 3] = 255;
  }
  g.putImageData(id, 0, 0); u.f = k; u.v = variant; u.e = e; return u.c;
}
function maskCanvas(e) {   /* mặt nạ trắng 32×32 của khối / ô ven bờ (caustic cắt đúng mép nước) */
  if (e.mcv) return e.mcv; const c = mkC(32, 32), g = c.getContext('2d'), id = g.createImageData(32, 32);
  for (let i = 0; i < 1024; i++) if (e.mask[i]) { id.data[i * 4] = id.data[i * 4 + 1] = id.data[i * 4 + 2] = 255; id.data[i * 4 + 3] = 255; }
  g.putImageData(id, 0, 0); return (e.mcv = c);
}

/* ---------- bọt mép bờ: khoảng cách tới bờ thật (chamfer), 8 pha vỗ ---------- */
const FN = 8, FPER = 4.2;
function foamFrames(e, ox4) {
  if (e.foam && e.foamN >= FN) return e.foam;
  if (!e.foamD) e.foamD = foamDist(e);
  if (!e.foam) { e.foam = new Array(FN).fill(undefined); e.foamN = 0; }
  const t0 = now();
  for (let f = 0; f < FN && now() - t0 < 0.4 && ST.foamBudget > 0; f++) if (e.foam[f] === undefined) { e.foam[f] = foamPhase(e, e.foamD, f, ox4); e.foamN++; }
  ST.foamBudget = now() - t0 > 0.4 ? 0 : ST.foamBudget;
  return e.foam;
}
function foamDist(e) {
  const P = 10, S = 32 + P * 2;
  const D = new Float32Array(S * S), INF = 1e9;
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) { const sx = clamp(x - P, 0, 31), sy = clamp(y - P, 0, 31); D[y * S + x] = e.mask[sy * 32 + sx] ? INF : 0; }
  for (let y = 1; y < S; y++) for (let x = 1; x < S - 1; x++) { const i = y * S + x; D[i] = Math.min(D[i], D[i - 1] + 1, D[i - S] + 1, D[i - S - 1] + 1.41, D[i - S + 1] + 1.41); }
  for (let y = S - 2; y >= 0; y--) for (let x = S - 2; x >= 1; x--) { const i = y * S + x; D[i] = Math.min(D[i], D[i + 1] + 1, D[i + S] + 1, D[i + S + 1] + 1.41, D[i + S - 1] + 1.41); }
  return D;
}
function foamPhase(e, D, f, ox4) {
  const P = 10, S = 32 + P * 2;
  {
    const lap = 0.5 - 0.5 * Math.cos(TAU * f / FN), Rr = 2.6 + 5.2 * lap, c = mkC(32, 32), g = c.getContext('2d'), id = g.createImageData(32, 32), d = id.data; let n = 0;
    for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
      const k = e.mask[y * 32 + x]; if (!k) continue; const dist = D[(y + P) * S + x + P]; if (dist > 14) continue;
      let den = 0, ci = 6;   /* viền bọt liền sát bờ + 1 vạch sóng chạy vào / ra + vài đốm giữa (ít, không lưới chấm) */
      if (dist <= 1.3) { den = 0.95; ci = 7; }
      else if (Math.abs(dist - Rr) <= 0.75) { den = 0.55 + 0.4 * lap; ci = lap > 0.6 ? 7 : 6; }
      if (!den || bay(x + ox4, y) >= den) continue;
      const col = PAL[k].rgb[ci], i = (y * 32 + x) * 4; d[i] = col[0]; d[i + 1] = col[1]; d[i + 2] = col[2]; d[i + 3] = 255; n++;
    }
    g.putImageData(id, 0, 0); return n ? c : null;
  }
}

/* ---------- cá: atlas 32 hướng × 6 pha uốn, dựng 1 lần / loài, tô màu theo bảng ---------- */
const SPEC = {
  minnow: { L: 9, W: 1.7, F: 3, Fw: 1.7, A: 1.0, sp: [9, 17], school: [5, 9], pec: false },
  carp: { L: 17, W: 3.2, F: 5, Fw: 3, A: 1.8, sp: [5, 10], school: [1, 3], pec: true },
  ray: { L: 22, W: 11, F: 13, Fw: 0.7, A: 1.2, sp: [4, 7], school: [1, 1], ray: true },
  koi: { L: 12, W: 2.5, F: 4, Fw: 2.8, A: 1.5, sp: [4, 8], school: [1, 1], pec: true, eye: true },
  reef: { L: 10, W: 2.6, F: 3, Fw: 2.2, A: 1.1, sp: [8, 15], school: [5, 8], eye: true, stripe: true },
  kelp: { L: 12, W: 2.2, F: 4, Fw: 2.2, A: 1.4, sp: [7, 13], school: [4, 7], eye: true },
  grey: { L: 16, W: 3.2, F: 5, Fw: 3, A: 1.7, sp: [5, 10], school: [2, 4], eye: true, pec: true },
  lantern: { L: 14, W: 4.2, F: 4, Fw: 2.6, A: 1.3, sp: [3, 6], school: [1, 1], eye: true, lure: true },
};
const NA = 32, NP = 6;
for (const s of Object.values(SPEC)) s.S = Math.ceil(Math.max(s.L + 2 * s.F, 2 * s.W) + 6) + 1 & ~1;
function fishClasses(name) {   /* 0 trống · 1 thân · 2 viền · 3 sống lưng · 4 mắt · 5 vây (lưới ca rô) · 6 mồi đèn */
  let J = ST.cls.get(name); const s = SPEC[name], S = s.S, W = S * NA, H = S * NP;
  if (!J) ST.cls.set(name, J = { M: new Uint8Array(W * H), next: 0, done: false });
  if (J.done) return J.M;
  const M = J.M, T0 = now(); let end = J.next;   /* dựng dần theo thời gian: ≤ 0,5 ms / khung */
  for (let q = J.next; q < NP * NA && now() - T0 < 0.5; q++) { end = q + 1; const p = Math.floor(q / NA), a = q % NA;
    const ang = (a / NA) * TAU, ca = Math.cos(ang), sa = Math.sin(ang), ph = (p / NP) * TAU, X0 = a * S, Y0 = p * S;
    for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
      const dx = i + 0.5 - S / 2, dy = j + 0.5 - S / 2, u = dx * ca + dy * sa, v = -dx * sa + dy * ca;
      const q = clamp((s.L / 2 - u) / (s.L + s.F), 0, 1), bend = s.ray ? 0 : s.A * Math.sin(ph - q * 3.4) * Math.pow(q, 1.4), vv = v - bend;
      let c = 0;
      if (s.ray) {
        const Wf = s.W * (0.82 + 0.18 * Math.sin(ph)), tb = s.A * Math.sin(ph - q * 4) * q;
        if (u >= -s.L / 2 && u <= s.L / 2) { const k = Math.abs(u) / (s.L / 2) * 0.55 + (u > 0 ? 0.45 * u / (s.L / 2) : 0) + Math.abs(v) / Wf; if (k <= 1) c = k > 0.86 ? 2 : 1; }
        else if (u < -s.L / 2 && u >= -s.L / 2 - s.F && Math.abs(v - tb) <= s.Fw) c = 1;
      } else if (u >= -s.L / 2 && u <= s.L / 2) {
        const t = (u + s.L / 2) / s.L, w = s.W * (t > 0.6 ? Math.sqrt(Math.max(0, 1 - ((t - 0.6) / 0.4) ** 2)) : 0.42 + 0.58 * (t / 0.6)), av = Math.abs(vv);
        if (av <= w) {
          c = av > w - 0.85 || t > 0.95 ? 2 : 1;
          if (c === 1 && av < 0.6 && t > 0.12 && t < 0.82) c = 3;
          if (s.eye && t > 0.72 && t < 0.86 && av > w - 1.9 && av <= w - 0.85) c = 4;
        } else if (s.pec && t > 0.58 && t < 0.72 && av <= w + 1.3 && ((i + j) & 1) === 0) c = 5;
      } else if (u < -s.L / 2 && u >= -s.L / 2 - s.F) {
        const e = (-s.L / 2 - u) / s.F, fw = s.Fw * (0.35 + 0.65 * e), av = Math.abs(vv);
        if (av <= fw && !(e > 0.62 && av < fw * 0.38)) c = ((i + j) & 1) === 0 || e < 0.3 ? 5 : 0;
      }
      if (s.lure && !c) { const lu = u - (s.L / 2 + 2.6), lv = v + Math.sin(ph) * 0.5; if (lu * lu + lv * lv <= 1.1) c = 6; else if (u > s.L / 2 - 1 && u < s.L / 2 + 2 && Math.abs(v) < 0.5) c = 2; }
      if (c) M[(Y0 + j) * W + X0 + i] = c;
    }
  }
  J.next = end; if (end >= NP * NA) { J.done = true; return M; } return null;
}
const LOOK = {   /* màu cá nhìn thấy: [thân, viền, sống lưng, mắt, vây, mồi] — dịu, ít màu */
  koi: [[236, 136, 70], [120, 52, 32], [250, 236, 214], [40, 22, 20], [250, 196, 150]],
  koi2: [[236, 232, 222], [96, 92, 104], [222, 98, 58], [30, 26, 34], [244, 240, 232]],
  silver: [[184, 204, 216], [70, 92, 112], [120, 146, 168], [24, 30, 40], [214, 230, 238]],
  reef: [[246, 200, 76], [112, 76, 30], [66, 112, 176], [30, 24, 20], [252, 226, 140]],
  reef2: [[98, 160, 222], [32, 58, 98], [240, 236, 220], [20, 24, 40], [160, 206, 240]],
  kelp: [[150, 186, 120], [54, 80, 50], [200, 214, 160], [24, 30, 20], [190, 214, 160]],
  grey: [[120, 132, 140], [44, 50, 60], [86, 96, 108], [22, 24, 30], [160, 170, 176]],
  lantern: [[54, 52, 70], [22, 20, 32], [74, 66, 90], [250, 236, 160], [80, 76, 96], [255, 236, 150]],
};
function atlasKey(name, look) { return name + '|' + look; }
function getAtlas(name, look) {   /* look: 'sh<kind><lv>' (bóng) hoặc tên LOOK */
  const k = atlasKey(name, look); const a = ST.atlases.get(k); if (a) return a;
  if (!ST.buildQ.includes(k)) ST.buildQ.push(k); return null;
}
function buildAtlas(k) {
  const [name, look] = k.split('|'), s = SPEC[name], M = fishClasses(name), W = s.S * NA, H = s.S * NP;
  if (!M) return false;
  let cols;
  if (look.startsWith('sh')) {
    const kind = +look[2], lv = +look[3], p = PAL[kind].rgb, f = [0.34, 0.6, 0.84][lv], body = mix(p[4], p[1], f), edge = mix(p[4], p[0], f);
    cols = [null, body, s.ray ? edge : body, body, body, body, body];
  } else { const L = LOOK[look]; cols = [null, L[0], L[1], L[2], L[3], L[4], L[5] || L[4]]; }
  const c = mkC(W, H), g = c.getContext('2d'), id = g.createImageData(W, H), d = id.data;
  for (let i = 0; i < M.length; i++) { const v = M[i]; if (!v) continue; const col = cols[v]; if (!col) continue; d[i * 4] = col[0]; d[i * 4 + 1] = col[1]; d[i * 4 + 2] = col[2]; d[i * 4 + 3] = 255; }
  g.putImageData(id, 0, 0); ST.atlases.set(k, c); return true;
}
function drawFishSprite(g, f, look, x, y, cx, cy) {
  const s = SPEC[f.sp], A = getAtlas(f.sp, look); if (!A) return;
  const ai = ((Math.round(f.ang / TAU * NA) % NA) + NA) % NA, pi = Math.floor(f.ph) % NP, S = s.S;
  const dx = Math.round(x * 2) / 2 - S / 4 - cx, dy = Math.round(y * 2) / 2 - S / 4 - cy;
  g.drawImage(A, ai * S, pi * S, S, S, dx, dy, S / 2, S / 2);
}

/* ---------- vùng / loài ---------- */
function envOf(ctx) {
  const z = ctx.S.zone || {}, m = ctx.S.map;
  if (m.under || z.under) return { under: true, id: z.id, cave: !!m.cave };
  return { under: false, sea: !!m.sea, id: z.id };
}
function pickSpecies() {
  const id = ST.zid, r = R();
  if (ST.under) {
    if (id === 'u1') return r < 0.6 ? ['reef', 'reef'] : r < 0.85 ? ['reef', 'reef2'] : ['grey', 'silver'];
    if (id === 'u2') return r < 0.7 ? ['kelp', 'kelp'] : ['grey', 'silver'];
    if (id === 'u3') return r < 0.65 ? ['grey', 'grey'] : ['minnow', 'silver'];
    if (id === 'u4') return r < 0.45 ? ['lantern', 'lantern'] : ['minnow', 'grey'];
    return ['grey', 'grey'];
  }
  if (ST.sea) return r < 0.66 ? ['minnow', null] : r < 0.9 ? ['carp', null] : ['ray', null];
  return r < 0.6 ? ['minnow', null] : ['carp', null];
}
function capFish() { const k = ST.lod >= 3 ? 0.4 : ST.lod >= 2 ? 0.6 : 1; if (ST.under) return Math.round((ST.cave ? 14 : 24) * k); if (ST.sea) return Math.round(28 * k); return Math.round(20 * k); }

function spawnSchool(x, y, sp, look, home) {
  const s = SPEC[sp], n = home ? 1 : s.school[0] + Math.floor(R() * (s.school[1] - s.school[0] + 1)), id = ++ST.schools, ang = R() * TAU;
  for (let i = 0; i < n; i++) {
    let fx = x + (R() - 0.5) * 10, fy = y + (R() - 0.5) * 8; if (!swimOk(fx, fy)) { fx = x; fy = y; }
    const sp0 = s.sp[0] + R() * (s.sp[1] - s.sp[0]) * 0.5;
    ST.fish.push({ sp, look, school: id, x: fx, y: fy, ang: ang + (R() - 0.5) * 0.4, v: sp0, wa: ang, ph: R() * NP, vis: home ? 1 : 0, out: false, flee: 0, h: ST.under ? 5 + R() * 10 : 0, home: home || null, jump: null, lv: R() < 0.3 ? 1 : 2, seed: R() * 100 });
  }
}

/* ---------- hiệu ứng tương tác ---------- */
/* pool: lấy lại object đã tắt thay vì tạo mới (máy yếu: tránh gom rác giữa trận) */
const FREE = { rip: [], wake: [], drops: [], bub: [], fp: [] };
const take = k => FREE[k].pop() || {};
function kill(arr, i, k) { const o = arr[i], last = arr.pop(); if (i < arr.length) arr[i] = last; FREE[k].push(o); }
function addWake(x, y, vx, vy, dur, c) { if (ST.wake.length >= 240) return; const w = take('wake'); w.x = x; w.y = y; w.vx = vx; w.vy = vy; w.t = 0; w.dur = dur; w.c = c || 0; ST.wake.push(w); }
const SD = [-1, 1];
function ripple(x, y, r1 = 7, dur = 1.1, r0 = 1.5) { if (ST.rip.length >= 90) return; const r = take('rip'); r.x = x; r.y = y; r.r0 = r0; r.r1 = r1; r.t = 0; r.dur = dur; ST.rip.push(r); }
function splash(x, y, pow = 1) {
  if (!WFX.on || !ST.ctx) return;
  if (!ST.under && !wetAt(x, y)) { const ok = wetAt(x, y + 3) || wetAt(x + 3, y) || wetAt(x - 3, y); if (!ok) return; }
  const n = Math.round(6 + pow * 10);
  for (let i = 0; i < n; i++) {
    const a = R() * TAU, sp = (10 + R() * 26) * (0.6 + pow * 0.5);
    if (ST.drops.length >= 260) break; const d = take('drops'); d.x = x + Math.cos(a) * 2; d.y = y + Math.sin(a) * 1.2; d.z = 1 + R() * 3; d.vx = Math.cos(a) * sp * 0.6; d.vy = Math.sin(a) * sp * 0.35; d.vz = (40 + R() * 70) * (0.6 + pow * 0.4); d.t = 0; d.big = R() < 0.45; ST.drops.push(d);
  }
  for (let i = 0; i < 3 + Math.round(pow * 3); i++) {   /* cột nước giữa: giọt to bắn thẳng lên */
    if (ST.drops.length >= 260) break; const d = take('drops'); d.x = x + (R() - 0.5) * 3; d.y = y + 0.5; d.z = 2; d.vx = (R() - 0.5) * 6; d.vy = 0; d.vz = (70 + R() * 50) * (0.7 + pow * 0.35); d.t = 0; d.big = true; ST.drops.push(d);
  }
  if (!ST.under) { ripple(x, y, 9 + pow * 6, 1.3 + pow * 0.3); ripple(x, y, 5 + pow * 3, 0.9); if (ST.foamPatch.length < 12) { const f = take('fp'); f.x = x; f.y = y; f.r = 3 + pow * 3; f.t = 0; f.dur = 0.9 + pow * 0.4; ST.foamPatch.push(f); } }
  else bubbles(x, y - 6, 3 + Math.round(pow * 3));
  ST.n.splash = (ST.n.splash || 0) + 1;
}
function bubbles(x, y, n = 3) {
  for (let i = 0; i < n && ST.bub.length < 120; i++) { const b = take('bub'); b.x = x + (R() - 0.5) * 7; b.y = y + 6 + R() * 2; b.z = 6 + R() * 4; b.vz = 16 + R() * 14; b.t = 0; b.life = 1.2 + R() * 1.1; b.r = R() < 0.3 ? 2 : 1; b.ph = R() * 6; ST.bub.push(b); }
}

/* ---------- cập nhật ---------- */
const ENT = [], ENTP = [], LTK = {};
function entsInWater(ctx) {
  const S = ctx.S, p = S.player, out = ENT, cam = ctx.cam || { cx: p.x - 200, cy: p.y - 150 }, VW = ctx.VW || 320, VH = ctx.VH || 200;
  out.length = 0; let np = 0; const put = (e, kind, key) => { const it = ENTP[np] || (ENTP[np] = {}); np++; it.e = e; it.kind = kind; it.key = key || null; out.push(it); };
  const near = e => e && e.x > cam.cx - 40 && e.x < cam.cx + VW + 40 && e.y > cam.cy - 40 && e.y < cam.cy + VH + 60;
  const ride = !!(p.custom && /Raft|Boat|Plank/.test(p.custom.name || '')) || !!(S.sea && (S.sea.riding === 'raft' || S.sea.riding === 'plank'));
  put(p, ride ? 'ride' : 'p');
  for (const n of S.npcs || []) if (near(n)) put(n, 'n');
  for (const n of S.staff || []) if (near(n)) put(n, 'n');
  try { const r = ctx.rocky && ctx.rocky.ent && ctx.rocky.ent(); if (r && near(r)) put(r, 'r'); } catch (e) { }
  try { if (ctx.ltPets) for (const c of ctx.ltPets()) if (near(c)) put(c, 'l', LTK[c.id] || (LTK[c.id] = 'lt' + c.id)); } catch (e) { }
  try { if (ctx.monsters && ctx.monsters.list) for (const mo of ctx.monsters.list()) if (mo.hp > 0 && near(mo)) put(mo, 'm'); } catch (e) { }
  return out;
}
function updateInteract(ctx, dt) {
  const S = ctx.S, p = S.player;
  for (const it of entsInWater(ctx)) {
    const e = it.e, key = it.key || e; let s = ST.ents.get(key);
    if (!s) { s = { lx: e.x, ly: e.y, acc: R() * 0.3, idle: R() * 2, hx: 0, hy: 1, seen: 0 }; ST.ents.set(key, s); }
    s.seen = ST.frame;
    const dx = e.x - s.lx, dy = e.y - s.ly, d = Math.hypot(dx, dy); s.lx = e.x; s.ly = e.y;
    if (d > 0.05) { s.hx = s.hx * 0.8 + dx / d * 0.2; s.hy = s.hy * 0.8 + dy / d * 0.2; }
    if (d > 20) continue;   /* dịch chuyển tức thời (warp) */
    const depth = WATER.depth ? WATER.depth(e.x, e.y) : 0, wet = it.kind === 'ride' ? wetAt(e.x, e.y) : depth > 0 && wetAt(e.x, e.y - 1);
    if (!wet) { s.in = false; continue; }
    if (!s.in && it.kind !== 'ride' && s.seen > 2) { if (ST.frame > 20) splash(e.x, e.y, 0.55); }
    s.in = true;
    const moving = d > 0.04, hl = Math.hypot(s.hx, s.hy) || 1, hx = s.hx / hl, hy = s.hy / hl;
    if (it.kind === 'ride') {
      if (moving) { s.acc += dt; const WI = ST.lod >= 3 ? 0.13 : ST.lod >= 2 ? 0.09 : 0.05; while (s.acc > WI) { s.acc -= WI; for (const sd of SD) addWake(e.x - hx * 9 - hy * sd * 7, e.y - hy * 6 + hx * sd * 4, -hy * sd * 5 - hx * 3, hx * sd * 3 - hy * 2, 1.7 + R() * 0.4); addWake(e.x - hx * 11 + (R() - 0.5) * 4, e.y - hy * 7 + (R() - 0.5) * 2, -hx * 2, -hy, 0.8, 1); } }
      if ((s.idle -= dt) <= 0) { s.idle = moving ? 1.1 : 2.4; ripple(e.x, e.y - 1, moving ? 16 : 20, 2.2, 11); }
      continue;
    }
    const swim = depth > 8;
    if (moving) {
      if ((s.acc += dt) > (swim ? 0.26 : 0.34)) { s.acc = 0; ripple(e.x, e.y, swim ? 8 : 6, swim ? 1.1 : 0.9, 2); }
      if (swim) { s.wk = (s.wk || 0) + dt; while (s.wk > 0.08) { s.wk -= 0.08; for (const sd of SD) addWake(e.x - hx * 4 - hy * sd * 4, e.y - hy * 2 + hx * sd * 2.5, -hy * sd * 4 - hx * 2, hx * sd * 2.5 - hy, 1.1); } }
    } else if ((s.idle -= dt) <= 0) { s.idle = 1.9 + R() * 0.8; ripple(e.x, e.y, swim ? 9 : 7, 1.6, 3); }
  }
  if (ST.frame % 120 === 0) for (const [k, s] of ST.ents) if (ST.frame - s.seen > 60) ST.ents.delete(k);
  /* trúng đòn trong nước → toé (quái, người chơi); rơi xuống nước sau cú hất */
  try {
    if (ctx.monsters && ctx.monsters.list) for (const mo of ctx.monsters.list()) {
      const prev = ST.prevHp.get(mo); ST.prevHp.set(mo, mo.hp);
      if (prev != null && mo.hp < prev - 0.01 && (ST.under ? false : wetAt(mo.x, mo.y))) splash(mo.x, mo.y, clamp((prev - mo.hp) / Math.max(1, mo.maxHp || (mo.c && mo.c.hp) || 30) * 5, 1.0, 1.7));
    }
  } catch (e) { }
  try {
    const H = typeof window !== 'undefined' && window.__hero ? window.__hero.state().hp : -1;
    if (ST.heroHp >= 0 && H >= 0 && H < ST.heroHp - 0.01 && !ST.under && wetAt(p.x, p.y)) splash(p.x, p.y, 0.9);
    ST.heroHp = H;
  } catch (e) { }
}
const SCH = new Map(), THR = [];
function threats(ctx) {
  const out = THR, S = ctx.S, p = S.player; out.length = 0;
  out.push(p.x, p.y, S.sea && S.sea.riding === 'raft' ? 30 : 22);
  for (const [k, s] of ST.ents) if (s.in && s.seen === ST.frame && k !== p) out.push(s.lx, s.ly, 16);
  try { const r = ctx.rocky && ctx.rocky.ent && ctx.rocky.ent(); if (r) out.push(r.x, r.y, 20); } catch (e) { }
  return out;
}
function bait() {
  try { const f = typeof window !== 'undefined' && window.__animals && window.__animals.fishing ? window.__animals.fishing() : null; if (f && (f.phase === 'wait' || f.phase === 'bite') && f.bx != null) return f; } catch (e) { }
  return null;
}
const probe = (f, an, dist) => swimOk(f.x + Math.cos(an) * dist, f.y + Math.sin(an) * dist) && swimOk(f.x + Math.cos(an) * (dist + 2.5), f.y + Math.sin(an) * (dist + 2.5));
const NOSK = {};
function updateFish(ctx, dt, sub = 0, per = 1) {   /* per > 1: mỗi khung chỉ tính 1/per số cá (dt riêng từng con) — rải đều, không gai */
  const L = ST.fish, TH = threats(ctx), bt = bait(), cam = ctx.cam || { cx: 0, cy: 0 }, VW = ctx.VW || 320, VH = ctx.VH || 200, mx = cam.cx + VW / 2, my = cam.cy + VH / 2;
  const sch = SCH; for (const a of sch.values()) a[4] = 0;
  for (const f of L) { let a = sch.get(f.school); if (!a) sch.set(f.school, a = [0, 0, 0, 0, 0]); if (!a[4]) { a[0] = a[1] = a[2] = a[3] = 0; } a[0] += f.x; a[1] += f.y; a[2] += Math.cos(f.ang); a[3] += Math.sin(f.ang); a[4]++; }
  if (sch.size > 64) for (const [k, a] of sch) if (!a[4]) sch.delete(k);
  for (let i = L.length - 1; i >= 0; i--) {
    const f = L[i], s = SPEC[f.sp];
    f.acc = (f.acc || 0) + dt; if (per > 1 && (i % per) !== sub) continue;
    if (f.home && (Math.abs(f.x - mx) > VW * 0.5 + 60 || Math.abs(f.y - my) > VH * 0.5 + 60)) { if (f.acc > 1) f.acc = 1; continue; }   /* ao ngoài khung: đứng yên, vào lại thì bơi tiếp */
    const fdt = Math.min(f.acc, 0.1); f.acc = 0;
    if (f.jump) { const j = f.jump; j.t += fdt; const k = Math.min(1, j.t / j.dur); f.x = j.x0 + j.dx * k; f.y = j.y0 + j.dy * k; f.z = 4 * j.h * k * (1 - k); f.ph += fdt * 14; if (k >= 1) { f.jump = null; f.z = 0; splash(f.x, f.y, 0.75); } continue; }
    if (!f.home && Math.abs(f.x - mx) > VW * 0.5 + 90 || !f.home && Math.abs(f.y - my) > VH * 0.5 + 90) { L.splice(i, 1); continue; }
    if (f.out) { f.vis -= fdt * 0.7; if (f.vis <= 0) { L.splice(i, 1); continue; } } else if (f.vis < 1) f.vis = Math.min(1, f.vis + fdt * 0.6);
    const a = sch.get(f.school), hx = Math.cos(f.ang), hy = Math.sin(f.ang);
    let ax = 0, ay = 0;
    f.wa += (Math.sin(ST.t * 0.7 + f.seed) * 0.6 + (R() - 0.5) * 0.8) * fdt;
    ax += Math.cos(f.wa) * 0.6; ay += Math.sin(f.wa) * 0.6;
    if (a && a[4] > 1) {
      const n = a[4], ccx = (a[0] - f.x) / (n - 1), ccy = (a[1] - f.y) / (n - 1), d = Math.hypot(ccx - f.x, ccy - f.y) || 1;
      ax += (ccx - f.x) / d * Math.min(1, d / 10) * 0.9; ay += (ccy - f.y) / d * Math.min(1, d / 10) * 0.9;
      ax += (a[2] / n) * 0.8; ay += (a[3] / n) * 0.8;
      for (const o of L) { if (o === f || o.school !== f.school) continue; const ex = f.x - o.x, ey = f.y - o.y, e2 = ex * ex + ey * ey; if (e2 < 9 && e2 > 0.001) { ax += ex / e2 * 2.2; ay += ey / e2 * 2.2; } }
    }
    if (f.home) { const ex = f.home.x - f.x, ey = f.home.y - f.y, d = Math.hypot(ex, ey); if (d > f.home.r) { ax += ex / d * 1.4; ay += ey / d * 1.4; } }
    let flee = 0;
    for (let k = 0; k < TH.length; k += 3) { const ex = f.x - TH[k], ey = f.y - TH[k + 1], d = Math.hypot(ex, ey), r = TH[k + 2]; if (d < r && d > 0.01) { const w = (1 - d / r) * 3.2; ax += ex / d * w; ay += ey / d * w; flee = Math.max(flee, 1 - d / r); } }
    if (bt && !flee) { const ex = bt.bx - f.x, ey = bt.by - f.y, d = Math.hypot(ex, ey); if (d < 90 && d > 4) { ax += ex / d * 1.6; ay += ey / d * 1.6; f.nib = d < 9; } }
    /* né bờ: dò 3 tia phía trước */
    const la = 5 + f.v * 0.35;
    const fw = probe(f, f.ang, la);
    if (!fw) { const l = probe(f, f.ang - 0.7, la), r = probe(f, f.ang + 0.7, la); const turn = l && !r ? -1 : r && !l ? 1 : (f.seed > 50 ? 1 : -1); ax += Math.cos(f.ang + turn * 1.6) * 3.5; ay += Math.sin(f.ang + turn * 1.6) * 3.5; f.wa = f.ang + turn * 1.2; }
    f.flee = Math.max(flee, f.flee - fdt * 0.8);
    const want = Math.atan2(ay + hy * 0.4, ax + hx * 0.4); let da = want - f.ang; da = Math.atan2(Math.sin(da), Math.cos(da));
    const maxTurn = (2.4 + f.flee * 5) * fdt; f.ang += clamp(da, -maxTurn, maxTurn);
    const target = (f.nib ? 0.25 : 1) * (s.sp[0] + (s.sp[1] - s.sp[0]) * (0.35 + 0.25 * Math.sin(ST.t * 0.9 + f.seed))) * (1 + f.flee * 1.6);
    f.v += (target - f.v) * Math.min(1, fdt * 2.5);
    const nx = f.x + Math.cos(f.ang) * f.v * fdt, ny = f.y + Math.sin(f.ang) * f.v * fdt;
    if (swimOk(nx, ny)) { f.x = nx; f.y = ny; } else { f.ang += Math.PI * 0.6 * fdt * 4; f.v *= 0.5; }
    f.ph += fdt * (2.2 + f.v * 0.45 + f.flee * 4);
    if (ST.under && (f.bubT = (f.bubT || 2 + R() * 6) - fdt) <= 0) { f.bubT = 4 + R() * 7; bubbles(f.x + Math.cos(f.ang) * 4, f.y - f.h, 1); }
  }
  /* quần thể: bơi vào khung hình từ chỗ nước kín đang thấy (hiện dần như trồi từ dưới sâu) */
  if ((ST.spawnT -= dt) <= 0) {
    ST.spawnT = 0.5;
    const wild = L.filter(f => !f.home && !f.out).length, cap = capFish(), want = Math.min(cap, Math.floor(ST.visN / (ST.under ? 9 : 6)));
    if (wild < want && ST.vis.length) {
      for (let tries = 0; tries < 6; tries++) {
        const k = Math.floor(R() * (ST.vis.length / 2)) * 2, x = ST.vis[k] + 4 + R() * 8, y = ST.vis[k + 1] + 4 + R() * 8;
        let tooClose = false; for (let t = 0; t < TH.length; t += 3) if (Math.hypot(x - TH[t], y - TH[t + 1]) < 40) tooClose = true;
        if (tooClose || !swimOk(x, y)) continue;
        const [sp, look] = pickSpecies(); spawnSchool(x, y, sp, look); break;
      }
    } else if (wild > want + 4) { let far = null, fd = -1; for (const f of L) if (!f.home && !f.out) { const d = Math.hypot(f.x - mx, f.y - my); if (d > fd) { fd = d; far = f; } } if (far) for (const f of L) if (f.school === far.school) f.out = true; }
  }
  /* cá nhảy + cá đớp mặt nước (gợn nhỏ) */
  if (!ST.under) {
    if ((ST.jumpT -= dt) <= 0) {
      ST.jumpT = 7 + R() * 8; const c = L.filter(f => !f.jump && f.vis > 0.9 && f.sp !== 'ray' && Math.abs(f.x - mx) < VW * 0.42 && Math.abs(f.y - my) < VH * 0.42);
      const f = c[Math.floor(R() * c.length)];
      if (f) { const dx = Math.cos(f.ang) * 14, dy = Math.sin(f.ang) * 9; if (swimOk(f.x + dx, f.y + dy)) { f.jump = { t: 0, dur: 0.78, h: f.home ? 6 : 9 + R() * 5, x0: f.x, y0: f.y, dx, dy }; splash(f.x, f.y, 0.5); } }
    }
    if ((ST.riseT -= dt) <= 0) { ST.riseT = 1.6 + R() * 2.2; const f = L[Math.floor(R() * L.length)]; if (f && !f.jump && f.vis > 0.8) ripple(f.x + Math.cos(f.ang) * 3, f.y + Math.sin(f.ang) * 2, 5, 1.2, 1); }
  } else if ((ST.ventT -= dt) <= 0 && ST.vis.length) {   /* bọt khí từ đáy */
    ST.ventT = 0.5 + R() * 0.7; const k = Math.floor(R() * (ST.vis.length / 2)) * 2; bubbles(ST.vis[k] + R() * 16, ST.vis[k + 1] + R() * 16, 1 + (R() < 0.3 ? 2 : 0));
  }
}
function syncPonds(ctx) {   /* cá koi trong ao: theo số cá đã thả (save.sys.ponds), mỗi ao (cụm ô liền) tối đa max(2, số ô) và ≤ 6 con — không chen chúc */
  const st = (ctx.S.save.sys && ctx.S.save.sys.ponds && ctx.S.save.sys.ponds[ST.zid]) || {}, want = [], seen = new Set();
  for (const k0 of Object.keys(st)) {
    if (seen.has(k0)) continue; const comp = [], q = [k0]; seen.add(k0);
    while (q.length) { const k = q.pop(); comp.push(k); const [x, y] = k.split(',').map(Number); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const n = (x + dx) + ',' + (y + dy); if (st[n] && !seen.has(n)) { seen.add(n); q.push(n); } } }
    comp.sort(); const tot = comp.reduce((a, k) => a + (st[k].n || 0), 0), n = Math.min(tot, Math.max(2, comp.length), 6);
    let sx = 0, sy = 0; for (const k of comp) { const [x, y] = k.split(',').map(Number); sx += x * 16 + 8; sy += y * 16 + 8; }
    const cx = sx / comp.length, cy = sy / comp.length, r = 3 + Math.sqrt(comp.length) * 5;
    for (let i = 0; i < n; i++) { const [x, y] = comp[i % comp.length].split(',').map(Number); want.push({ key: comp[0] + '#' + i, x: x * 16 + 8, y: y * 16 + 8, hx: cx, hy: cy, r, look: i % 3 === 2 ? 'koi2' : 'koi' }); }
  }
  const have = new Set(ST.fish.filter(f => f.home).map(f => f.home.key));
  for (const w of want) if (!have.has(w.key)) spawnSchool(w.x, w.y, 'koi', w.look, { key: w.key, x: w.hx, y: w.hy, r: w.r });
  const keys = new Set(want.map(w => w.key)); ST.fish = ST.fish.filter(f => !f.home || keys.has(f.home.key));
}

/* ---------- vẽ ---------- */
const BUCK = new Map(), UNITS = [];
function px(ci, kind, hx, hy) { const key = PAL[kind].css[ci]; let b = BUCK.get(key); if (!b) BUCK.set(key, b = []); b.push(hx, hy); }
function flush(g, cx, cy) { for (const [col, b] of BUCK) { if (!b.length) continue; g.fillStyle = col; g.beginPath(); for (let i = 0; i < b.length; i += 2) g.rect(b[i] / 2 - cx, b[i + 1] / 2 - cy, 0.5, 0.5); g.fill(); b.length = 0; } }
function drawSurface(g, ctx, cx, cy) {
  const VW = ctx.VW, VH = ctx.VH, fC = Math.floor(ST.t * CFPS) % CN, fF = Math.floor(ST.t / FPER * FN);
  const vis = ST.vis; vis.length = 0; let nC = 0, nF = 0;
  const units = UNITS; ST.visLod = ST.lod >= 2 || !!(ST.skip && ST.skip.caus);
  const U = ST.uk || (ST.uk = [NaN, 0, 0, 0, 0]), ua = Math.floor((cx + 8) / 16), ub = Math.floor((cy + 8) / 16);   /* danh sách ô nước thấy được: chỉ dựng lại khi camera sang ô mới / mặt nạ đổi */
  if (U[0] !== ua || U[1] !== ub || U[2] !== VW || U[3] !== VH || (U[4] !== ST.maskVer && ST.t - (ST.uT || 0) > 0.5)) { U[0] = ua; U[1] = ub; U[2] = VW; U[3] = VH; U[4] = ST.maskVer; ST.uT = ST.t; units.length = 0;   /* thuỷ triều đổi ô: dựng lại tối đa 2 lần / s */
  if (ST.wang) {
    const tx0 = Math.floor((cx + 8) / 16), ty0 = Math.floor((cy + 8) / 16), tx1 = Math.floor((cx + VW + 8) / 16) + 1, ty1 = Math.floor((cy + VH + 8) / 16) + 1;
    for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) { const c = comboAt(tx, ty); if (!c.none) units.push(c, tx * 16 - 8, ty * 16 - 8, tx, ty, 1); }
  }
  if (ST.cellAny) {
    const x0 = Math.max(0, Math.floor(cx / 16) - 1), y0 = Math.max(0, Math.floor(cy / 16) - 1), x1 = Math.min(ST.mw - 1, Math.floor((cx + VW) / 16) + 1), y1 = Math.min(ST.mh - 1, Math.floor((cy + VH) / 16) + 1);
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (ST.cellKind[y * ST.mw + x]) units.push(cellMask(x, y), x * 16, y * 16, x, y, 0);
  } }
  /* 1) cá (bóng dưới mặt nước) — dưới caustic */
  const SK = ST.skip || NOSK, tA = now();
  if (!SK.fish) for (const f of ST.fish) {
    if (f.jump || f.x < cx - 12 || f.y < cy - 12 || f.x > cx + VW + 12 || f.y > cy + VH + 12) continue;
    const k = wetAt(f.x, f.y) || K_SH;
    if (f.sp === 'koi') { drawFishSprite(g, f, f.look, f.x, f.y, cx, cy); continue; }
    const lv = Math.min(f.lv, Math.floor(f.vis * 2.99)); drawFishSprite(g, f, 'sh' + k + lv, f.x, f.y, cx, cy); ST.n.fish++;
  }
  for (const f of ST.fish) if (f.jump) { const sx = f.x, sy = f.y; for (let i = -3; i <= 3; i++) for (let j = -1; j <= 1; j++) { const hx = Math.round(sx * 2) + i, hy = Math.round(sy * 2) + j; if (((hx + hy) & 1) === 0 && wetH(hx, hy)) px(1, wetH(hx, hy), hx, hy); } }
  const tB = now();
  /* 2) caustic cộng sáng */
  if (ST.visLod) for (let i = 0; i < units.length; i += 6) { const e = units[i]; if (e.all) vis.push(units[i + 1], units[i + 2]); }
  if (ST.lod === 2 && !SK.caus) glints(g, units, cx, cy, VW, VH);
  if (!SK.caus && ST.lod < 2) {
  g.save(); g.globalCompositeOperation = 'lighter';
  const pf = causPattern(g, 'full', fC), pd = causPattern(g, 'dim', fC); if (pf) patAt(pf, cx, cy); if (pd) patAt(pd, cx, cy);
  let rx = 0, ry = 0, rw = 0, rp = null;   /* dải ô kín liền nhau cùng loại → 1 fillRect */
  const flushRun = () => { if (rw && rp && !SK.call) { g.fillStyle = rp; g.fillRect(rx - cx, ry - cy, rw, 16); } rw = 0; };
  for (let i = 0; i < units.length; i += 6) {
    const e = units[i], ox = units[i + 1], oy = units[i + 2];
    if (ox + 16 < cx || oy + 16 < cy || ox > cx + VW || oy > cy + VH) { flushRun(); continue; }
    const variant = e.kind1 === K_DP ? 'dim' : 'full';
    if (e.all && e.kind1) {
      const pp = variant === 'dim' ? pd : pf; vis.push(ox, oy);
      if (rw && pp === rp && oy === ry && ox === rx + rw) rw += 16; else { flushRun(); rx = ox; ry = oy; rw = 16; rp = pp; }
    } else {
      flushRun(); if (e.all) vis.push(ox, oy);
      if (!SK.cmask && ST.lod < 1) { const uc = causUnit(e, ox, oy, variant, fC); if (uc) g.drawImage(uc, 0, 0, 32, 32, ox - cx, oy - cy, 16, 16); }
    }
    nC++;
  }
  flushRun();
  g.restore(); }
  const tC = now();
  /* 3) bọt mép bờ vỗ chậm */
  if (!SK.foam && ST.lod < 3) nF = drawFoamStrips(g, units, cx, cy, VW, VH, fF);
  const tD = now(); ST.sec = ST.sec || { fish: 0, caus: 0, foam: 0, rest: 0, n: 0 };
  ST.visN = vis.length / 2; ST.n.caus = nC; ST.n.foam = nF;
  /* 4) vệt bọt toé trên mặt nước (sau khi toé) */
  for (const fp of ST.foamPatch) {   /* đĩa bọt đặc: nở nhanh rồi co vào tâm và tắt; viền ngoài sáng, lõi trắng */
    const k = fp.t / fp.dur, r = fp.r * (k < 0.15 ? 0.6 + k / 0.15 * 0.4 : 1 - (k - 0.15) / 0.85), ry = r * 0.55, R2 = Math.ceil(r * 2), RY2 = Math.ceil(ry * 2), fx = Math.round(fp.x * 2), fy = Math.round(fp.y * 2);
    if (r < 0.5) continue;
    for (let j = -RY2; j <= RY2; j++) for (let i = -R2; i <= R2; i++) { const q = (i * i) / (4 * r * r) + (j * j) / (4 * ry * ry); if (q > 1) continue; const hx = fx + i, hy = fy + j, w = wetH(hx, hy); if (!w) continue; if (q > 0.55 || ((hx * 7 + hy * 3) & 7) === 0) px(q > 0.55 ? 6 : 7, w, hx, hy); else px(7, w, hx, hy); }
  }
  /* 5) gợn vòng (dither, chỉ trên điểm nước) */
  for (const r of ST.rip) {
    const k = r.t / r.dur, rad = r.r0 + (r.r1 - r.r0) * (1 - (1 - k) * (1 - k)), lev = (1 - k) * 0.95, n = Math.max(10, Math.round(rad * (ST.lod >= 2 ? 4.5 : 6.5)));
    const segs = Math.max(4, Math.round(rad * 1.3)), rot = (r.x * 0.37 + r.y * 0.21) % 1;
    for (let i = 0; i < n; i++) { const a = (i / n) * TAU; if (((i / n) * segs + rot) % 1 > lev) continue; const hx = Math.round((r.x + Math.cos(a) * rad) * 2), hy = Math.round((r.y + Math.sin(a) * rad * 0.5) * 2), w = wetH(hx, hy); if (w) px(k < 0.35 ? 7 : 6, w, hx, hy); }
  }
  /* 6) vệt rẽ nước */
  for (const w of ST.wake) { const k = w.t / w.dur, hx = Math.round(w.x * 2), hy = Math.round(w.y * 2), ww = wetH(hx, hy); if (!ww || bay(hx, hy) >= (1 - k) * 0.95 + 0.05) continue; px(w.c ? 7 : k < 0.4 ? 7 : 6, ww, hx, hy); if (k < 0.75 && wetH(hx + 1, hy)) px(k < 0.4 ? 7 : 6, ww, hx + 1, hy); }
  flush(g, cx, cy);
  const tE = now(), Q = ST.sec; Q.fish += tB - tA; Q.caus += tC - tB; Q.foam += tD - tC; Q.rest += tE - tD; Q.n++;
}
const GLOW = [];
function glowImg(i) {   /* quầng sáng cá đèn lồng: đĩa dither 3 bậc màu ấm, bán kính 12 / 13 / 14 điểm */
  if (GLOW[i]) return GLOW[i]; const R0 = 18 + i * 2, S = R0 * 2 + 2, c = mkC(S, S), g = c.getContext('2d'), id = g.createImageData(S, S), d = id.data;
  for (let j = 0; j < S; j++) for (let k = 0; k < S; k++) { const dd = Math.hypot(k - S / 2 + 0.5, j - S / 2 + 0.5) / R0; if (dd > 1 || (dd > 0.22 && bay(k, j) > (1 - dd) * 0.85 + 0.1)) continue; const col = dd < 0.22 ? [230, 204, 104] : dd < 0.45 ? [150, 130, 58] : dd < 0.7 ? [84, 72, 30] : [40, 34, 14], o = (j * S + k) * 4; d[o] = col[0]; d[o + 1] = col[1]; d[o + 2] = col[2]; d[o + 3] = 255; }
  g.putImageData(id, 0, 0); return (GLOW[i] = c);
}
const SHC = 'rgb(14,30,44)';   /* bóng cá trên đáy: màu đặc, mờ bằng dither */
/* bọt mép bờ vẽ sẵn thành TẤM theo khối 8×8 ô và theo nhịp vỗ (8 pha): mỗi khung chỉ dán vài tấm thay vì hàng chục ô.
   Mỗi tấm giữ 2 canvas (đang dán / đang dựng nhịp sau); nhịp sau dựng dần ≤ 0,3 ms / khung rồi đổi. Mỗi ô vẫn lệch pha riêng (sóng chạy dọc bờ). */
const FCH = new Map(), FCS = 128, FPAD = 8;
function foamChunk(X, Y) {
  const key = X * 65536 + Y; let ch = FCH.get(key);
  if (!ch) { if (FCH.size > 40) { const k0 = FCH.keys().next().value; FCH.delete(k0); } ch = { X, Y, cur: null, curStep: -1, nxt: null, nxtStep: -1, nxtI: 0, list: null, ver: -1 }; FCH.set(key, ch); }
  return ch;
}
function drawFoamStrips(g, units, cx, cy, VW, VH, fF) {
  const step = ((fF % FN) + FN) % FN; let n = 0;
  const X0 = Math.floor((cx - FPAD * 2) / FCS), Y0 = Math.floor((cy - FPAD * 2) / FCS), X1 = Math.floor((cx + VW + FPAD) / FCS), Y1 = Math.floor((cy + VH + FPAD) / FCS);
  const t0 = now();
  for (let Y = Y0; Y <= Y1; Y++) for (let X = X0; X <= X1; X++) {
    const ch = foamChunk(X, Y);
    if (!ch.list || (ch.ver !== ST.maskVer && ST.t - (ch.vT || 0) > 0.5)) { ch.vT = ST.t; ch.ver = ST.maskVer; ch.list = []; ch.nxtStep = -1;   /* ô ven bờ trong khối */
      if (ST.wang) for (let ty = Y * 8; ty < Y * 8 + 8; ty++) for (let tx = X * 8; tx < X * 8 + 8; tx++) { const c = comboAt(tx, ty); if (!c.none && !c.all) ch.list.push(c, tx * 16 - 8, ty * 16 - 8); }
      if (ST.cellAny) for (let y = Math.max(0, Y * 8); y < Math.min(ST.mh, Y * 8 + 8); y++) for (let x = Math.max(0, X * 8); x < Math.min(ST.mw, X * 8 + 8); x++) if (ST.cellKind[y * ST.mw + x]) { const e = cellMask(x, y); if (!e.all) ch.list.push(e, x * 16, y * 16); }
      if (!ch.list.length) { ch.cur = ch.cur || null; ch.curStep = step; }
    }
    if (!ch.list.length) continue;
    if (ch.curStep !== step && ch.nxtStep !== step) { ch.nxtStep = step; ch.nxtI = 0; ch.nxtDone = false; if (!ch.nxt) ch.nxt = mkC((FCS + FPAD * 2) * 2, (FCS + FPAD * 2) * 2); ch.nxt.getContext('2d').clearRect(0, 0, ch.nxt.width, ch.nxt.height); }
    if (ch.nxtStep === step && !ch.nxtDone) {   /* dựng tiếp tấm nhịp này */
      const ng = ch.nxt.getContext('2d'), bx = X * FCS - FPAD, by = Y * FCS - FPAD, L = ch.list;
      while (ch.nxtI < L.length && (now() - t0 < 0.3 || !ch.cur)) {
        const e = L[ch.nxtI], ox = L[ch.nxtI + 1], oy = L[ch.nxtI + 2]; ch.nxtI += 3;
        const fr = foamFrames(e, ((ox * 2) & 3)); let ph = ((step + Math.floor((ox * 0.011 + oy * 0.017) * FN)) % FN + FN) % FN; while (fr[ph] === undefined && ph > 0) ph--; const c = fr[ph];
        if (c) ng.drawImage(c, 0, 0, 32, 32, (ox - bx) * 2, (oy - by) * 2, 32, 32);
        if (!ch.cur && now() - t0 > 2) break;
      }
      if (ch.nxtI >= L.length) { ch.nxtDone = true; const t = ch.cur; ch.cur = ch.nxt; ch.curStep = step; ch.nxt = t; ch.nxtStep = -1; }
    }
    if (ch.cur) { const W2 = FCS + FPAD * 2; g.drawImage(ch.cur, 0, 0, W2 * 2, W2 * 2, X * FCS - FPAD - cx, Y * FCS - FPAD - cy, W2, W2); n++; }
  }
  return n;
}
/* bậc 2: lấp lánh thưa — mỗi ô nước kín ~1/3 có 1 vệt sáng 2–3 điểm hiện / tắt chậm theo pha riêng (không nháy đồng loạt) */
function glints(g, units, cx, cy, VW, VH) {
  for (let i = 0; i < units.length; i += 6) {
    const e = units[i]; if (!e.all || !e.kind1) continue; const ox = units[i + 1], oy = units[i + 2], h = ((ox * 73856093) ^ (oy * 19349663)) >>> 0;
    if (h % 3) continue; const ph = (ST.t * 0.22 + (h % 1000) / 1000) % 1; if (ph > 0.42) continue;
    const len = ph < 0.08 || ph > 0.34 ? 1 : ph < 0.14 || ph > 0.28 ? 2 : 3, hx = ox * 2 + 4 + (h >>> 4) % 22, hy = oy * 2 + 4 + (h >>> 9) % 24;
    for (let k = 0; k < len; k++) px(len === 3 && k === 1 ? 7 : 6, e.kind1, hx + k, hy);
  }
}
function drawUnderFloor(g, ctx, cx, cy) {
  const VW = ctx.VW, VH = ctx.VH, id = ST.zid, variant = id === 'u1' ? 'floor' : id === 'u2' || id === 'u3' || id === 'kraken' ? 'floorDim' : null;
  const vis = ST.vis; vis.length = 0; const m = ST.map;
  const x0 = Math.max(0, Math.floor(cx / 16)), y0 = Math.max(0, Math.floor(cy / 16)), x1 = Math.min(m.w - 1, Math.floor((cx + VW) / 16)), y1 = Math.min(m.h - 1, Math.floor((cy + VH) / 16));
  const pat = variant && ST.lod < 2 ? causPattern(g, variant, Math.floor(ST.t * CFPS * 0.7) % CN) : null, cv = pat;
  if (pat) { g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = patAt(pat, cx, cy); }
  for (let y = y0; y <= y1; y++) { let run = -1;
    for (let x = x0; x <= x1 + 1; x++) {
      const open = x <= x1 && !ST.ctx.isSolid(m, x, y);
      if (open) { vis.push(x * 16, y * 16); if (run < 0) run = x; }
      else if (run >= 0) { if (pat) g.fillRect(run * 16 - cx, y * 16 - cy, (x - run) * 16, 16); run = -1; }
    } }
  if (pat) g.restore();
  ST.visN = vis.length / 2; ST.n.caus = cv ? ST.visN : 0;
  /* bóng cá trên đáy */
  for (const f of ST.fish) {
    if (f.x < cx - 12 || f.y < cy - 12 || f.x > cx + VW + 12 || f.y > cy + VH + 12) continue;
    const s = SPEC[f.sp], w = Math.max(2, s.L / 4), hx0 = Math.round(f.x * 2), hy0 = Math.round(f.y * 2);
    for (let j = -1; j <= 1; j++) for (let i = -w; i <= w; i++) { if (Math.abs(j) === 1 && Math.abs(i) > w - 1) continue; const hx = hx0 + i, hy = hy0 + j; if (bay(hx, hy) < 0.45 * f.vis) { let b = BUCK.get(SHC); if (!b) BUCK.set(SHC, b = []); b.push(hx, hy); } }
  }
  flush(g, cx, cy);
}

/* ---------- mục vẽ dùng lại cho drawables ---------- */
const DOUT = [], DOUT0 = [], DSL = [], DBK = [], DBY = new Map(), DV = { g: null, cx: 0, cy: 0, VW: 320, VH: 200 };
const onV = (x, y, m = 20) => x > DV.cx - m && y > DV.cy - m && x < DV.cx + DV.VW + m && y < DV.cy + DV.VH + m + 30;
function mkSlot() { const it = { y: 0, kind: 0, a: null, f: null }; it.f = () => { const t = now(); try { drawSlot(it); } finally { tAdd(now() - t); } }; return it; }
function drawSlot(it) {
  const g = DV.g, cx = DV.cx, cy = DV.cy;
  if (it.kind === 1) { for (const d of it.a) { const kind = ST.under ? K_SH : (wetAt(d.x, d.y) || K_SH), P = PAL[kind].css, hx = Math.round(d.x * 2), hy = Math.round((d.y - d.z) * 2); g.fillStyle = d.t < 0.12 ? P[7] : P[d.big ? 7 : 6]; g.fillRect(hx / 2 - cx, hy / 2 - cy, d.big ? 1 : 0.5, d.big ? 1 : 0.5); if (d.vz > 30) g.fillRect(hx / 2 - cx, hy / 2 + 0.5 - cy, 0.5, 0.5); } return; }
  if (it.kind === 2) { const f = it.a; drawFishSprite(g, f, f.sp === 'koi' ? f.look : 'silver', f.x, f.y - (f.z || 0), cx, cy); return; }
  if (it.kind === 3) { const f = it.a; if (f.vis < 1 && bay(Math.round(f.x * 2), Math.round(f.y * 2)) > f.vis) return; drawFishSprite(g, f, f.look || 'grey', f.x, f.y - f.h + Math.sin(ST.t * 1.3 + f.seed) * 0.8, cx, cy); return; }
  if (it.kind === 4) {
    const P = PAL[1].css;
    for (const b of ST.bub) {
      if (!onV(b.x, b.y)) continue; const k = b.t / b.life, x = Math.round((b.x + Math.sin(b.t * 5 + b.ph) * 1.2) * 2) / 2 - cx, y = Math.round((b.y - b.z) * 2) / 2 - cy;
      if (k > 0.93) { g.fillStyle = P[6]; g.fillRect(x - 1, y, 0.5, 0.5); g.fillRect(x + 1, y, 0.5, 0.5); g.fillRect(x, y - 1, 0.5, 0.5); continue; }
      g.fillStyle = P[7]; if (b.r === 1) { g.fillRect(x, y - 0.5, 0.5, 0.5); g.fillRect(x - 0.5, y, 0.5, 0.5); g.fillRect(x + 0.5, y, 0.5, 0.5); g.fillRect(x, y + 0.5, 0.5, 0.5); }
      else { g.fillRect(x - 0.5, y - 1, 1, 0.5); g.fillRect(x - 0.5, y + 1, 1, 0.5); g.fillRect(x - 1, y - 0.5, 0.5, 1.5); g.fillRect(x + 1, y - 0.5, 0.5, 1.5); g.fillStyle = '#ffffff'; g.fillRect(x - 0.5, y - 0.5, 0.5, 0.5); }
    }
  }
}

export const water = {
  id: 'water', always: true,
  onZoneEnter(ctx) {
    ST.ctx = ctx; ST.map = ctx.S.map; ST.zid = (ctx.S.zone && ctx.S.zone.id) || ''; const env = envOf(ctx);
    ST.under = env.under; ST.cave = !!env.cave; ST.sea = !!env.sea;
    ST.fish = []; ST.rip = []; ST.wake = []; ST.drops = []; ST.foamPatch = []; ST.bub = []; ST.ents = new Map(); ST.prevHp = new WeakMap(); ST.heroHp = -1; ST.knockZ = 0; ST.frame = 0;
    ST.spawnT = 0.2; ST.jumpT = 5 + R() * 4; ST.vis = []; ST.visN = 0; ST.zoneT = ST.t; FCH.clear();
    rebuildMask(ctx); syncPonds(ctx);
    ctx.waterSplash = (x, y, pow) => splash(x, y, pow);
    ctx.waterBubbles = (x, y, n) => bubbles(x, y, n);
    ctx.waterRipple = (x, y, r) => ripple(x, y, r || 7);
    ctx.waterAt = (x, y) => waterAt(x, y);
    if (typeof window !== 'undefined') window.__water = {
      stat: () => statNow(),
      set: o => { if (o && 'on' in o) { WFX.on = !!o.on; ART.waterNew = WFX.on; } return { on: WFX.on }; },
      splash: (x, y, p) => splash(x, y, p), ripple: (x, y, r) => ripple(x, y, r), bubbles: (x, y, n) => bubbles(x, y, n),
      fish: () => ST.fish.map(f => ({ sp: f.sp, x: Math.round(f.x), y: Math.round(f.y), a: +f.ang.toFixed(2), v: +f.v.toFixed(1), school: f.school, jump: !!f.jump, home: !!f.home })),
      jump: () => { ST.jumpT = 0; }, lod: n => { if (n == null) { ST.lodLock = false; } else { ST.lod = n; ST.lodLock = true; } return ST.lod; }, uReset: () => { ST.uSum = 0; ST.uN = 0; }, skip: o => { ST.skip = o || {}; }, sec: () => { const Q = ST.sec || {}; const o = {}; for (const k of ['fish', 'caus', 'foam', 'rest']) o[k] = +((Q[k] || 0) / Math.max(1, Q.n)).toFixed(3); o.tq = +((ST.tq || 0) / Math.max(1, Q.n || 1)).toFixed(3); ST.tq = 0; ST.sec = null; return o; }, perfReset: () => { ST.perf.fill(0); ST.pn = 0; ST.pi = 0; ST.uSum = 0; ST.uN = 0; ST.tm = null; },
      wet: (x, y) => (ST.under ? (underOpen(x, y) ? 1 : 0) : wetAt(x, y)),
      spawn: (x, y, sp) => { sp = sp || 'minnow'; spawnSchool(x, y, sp, ST.under ? (LOOK[sp] ? sp : 'silver') : null); return ST.fish.length; },
    };
  },
  update(dt, ctx) {
    if (!WFX.on || !ctx.S.map) return;
    const t0 = now(); ST.ctx = ctx; ST.t += dt; ST.frame++; 
    if (ST.map !== ctx.S.map) this.onZoneEnter(ctx);
    const tm = ST.tm || (ST.tm = { chk: 0, inter: 0, fish: 0, n: 0 }), m0 = now(); tm.n++;
    checkChanged(ctx); if ((ST.snapT -= dt) <= 0) { ST.snapT = 1; checkPonds(ctx); }
    const m1 = now(); tm.chk += m1 - m0;
    if (ST.buildQ.length && buildAtlas(ST.buildQ[0])) ST.buildQ.shift();
    else if (!ST.buildQ.length && ST.lod < 2) causStep();
    ST.foamBudget = 1e9; ST.cuBudget = ST.lod ? 0 : 5;
    ST.hdA = (ST.hdA || 0) + dt; ST.hdB = (ST.hdB || 0) + dt;
    const PER = ST.lod >= 2 ? 3 : 2;   /* tương tác 30 / 20 lần mỗi giây; cá: mỗi khung 1/PER số con */
    const m2 = now(); if (ST.frame % PER === 1) { if (!ST.under) updateInteract(ctx, ST.hdA); ST.hdA = 0; }
    const m3 = now(); tm.inter += m3 - m2; updateFish(ctx, dt, ST.frame % PER, PER); tm.fish += now() - m3;
    for (let i = ST.rip.length - 1; i >= 0; i--) if ((ST.rip[i].t += dt) >= ST.rip[i].dur) kill(ST.rip, i, 'rip');
    for (let i = ST.foamPatch.length - 1; i >= 0; i--) if ((ST.foamPatch[i].t += dt) >= ST.foamPatch[i].dur) kill(ST.foamPatch, i, 'fp');
    for (let i = ST.wake.length - 1; i >= 0; i--) { const w = ST.wake[i]; w.t += dt; w.x += w.vx * dt; w.y += w.vy * dt; w.vx *= 1 - dt * 0.8; w.vy *= 1 - dt * 0.8; if (w.t >= w.dur) kill(ST.wake, i, 'wake'); }
    for (let i = ST.drops.length - 1; i >= 0; i--) {
      const d = ST.drops[i]; d.t += dt; d.vz -= 260 * dt; d.z += d.vz * dt; d.x += d.vx * dt; d.y += d.vy * dt; d.vx *= 1 - dt * 1.5; d.vy *= 1 - dt * 1.5;
      if (d.z <= 0) { if (d.big && !ST.under && R() < 0.5) ripple(d.x, d.y, 3, 0.5, 0.5); kill(ST.drops, i, 'drops'); }
    }
    for (let i = ST.bub.length - 1; i >= 0; i--) { const b = ST.bub[i]; b.t += dt; b.z += b.vz * dt; b.vz *= 1 - dt * 0.3; if (b.t >= b.life) kill(ST.bub, i, 'bub'); }
    const du = now() - t0; tAdd(du); ST.uSum = (ST.uSum || 0) + du; ST.uN = (ST.uN || 0) + 1;
  },
  drawGround(g, ctx, cx, cy) {
    if (!WFX.on || !ST.map) return;
    const t0 = now();
    try { if (ST.under) drawUnderFloor(g, ctx, cx, cy); else drawSurface(g, ctx, cx, cy); } finally { tAdd(now() - t0); }
  },
  drawables(ctx, cx, cy) {   /* mục vẽ dùng lại (pool): không tạo hàm / mảng mới mỗi khung */
    if (!WFX.on || !ST.map) return DOUT0;
    const t0 = now(), out = DOUT; out.length = 0; DV.g = ctx.g; DV.cx = cx; DV.cy = cy; DV.VW = ctx.VW; DV.VH = ctx.VH; let ns = 0;
    const slot = (y, kind, a) => { const it = DSL[ns] || (DSL[ns] = mkSlot()); ns++; it.y = y; it.kind = kind; it.a = a; out.push(it); return it; };
    /* giọt nước toé: gom theo dải y 6 px (mỗi dải 1 mục) */
    if (ST.drops.length) {
      let nb = 0; for (const b of DBK) b.length = 0; DBY.clear();
      for (const d of ST.drops) { if (!onV(d.x, d.y)) continue; const k = Math.round(d.y / 6); let b = DBY.get(k); if (!b) { b = DBK[nb] || (DBK[nb] = []); nb++; DBY.set(k, b); slot(k * 6 + 3, 1, b); } b.push(d); }
    }
    for (const f of ST.fish) if (f.jump && onV(f.x, f.y)) slot(f.y + 1, 2, f);
    if (ST.under) for (const f of ST.fish) if (onV(f.x, f.y)) slot(f.y, 3, f);
    if (ST.bub.length) slot((ctx.S.player ? ctx.S.player.y : 0) + 0.6, 4, null);
    tAdd(now() - t0);
    return out;
  },
  draw(g, ctx, cx, cy) {   /* u4: ánh đèn cá đèn lồng nằm TRÊN lớp tối (underwater.js vẽ tối trước, hệ này đứng sau trong SYSTEMS) */
    if (!WFX.on || !ST.under) { finishFrame(); return; }
    const t0 = now();
    if (ST.cave) {
      g.save(); g.globalCompositeOperation = 'lighter';
      for (const f of ST.fish) {
        if (f.sp !== 'lantern' || f.x < cx - 30 || f.x > cx + ctx.VW + 30 || f.y < cy - 30 || f.y > cy + ctx.VH + 40) continue;
        const lx = f.x + Math.cos(f.ang) * (SPEC.lantern.L / 4 + 1.3), ly = f.y - f.h + Math.sin(f.ang) * (SPEC.lantern.L / 4 + 1.3), pul = 0.85 + 0.15 * Math.sin(ST.t * 1.6 + f.seed);
        const hx0 = Math.round(lx * 2), hy0 = Math.round(ly * 2), gi = pul < 0.9 ? 0 : pul < 0.96 ? 1 : 2, gl = glowImg(gi);
        g.drawImage(gl, 0, 0, gl.width, gl.height, hx0 / 2 - gl.width / 4 - cx, hy0 / 2 - gl.height / 4 - cy, gl.width / 2, gl.height / 2);
        g.fillStyle = 'rgb(255,240,170)'; g.fillRect(hx0 / 2 - cx - 0.5, hy0 / 2 - cy - 0.5, 1, 1);
      }
      g.restore();
    }
    tAdd(now() - t0); finishFrame();
  },
};
function finishFrame() {
  ST.perf[ST.pi] = ST.acc; ST.pi = (ST.pi + 1) % ST.perf.length; ST.pn = Math.min(ST.perf.length, ST.pn + 1);
  /* bậc chất lượng: trung bình 45 khung > 2,6 ms → hạ 1 bậc; < 0,9 ms suốt ~12 s → nâng lại 1 bậc */
  /* trung vị 45 khung (bỏ qua gai lẻ + 3 s đầu vùng đang dựng atlas) > 2,2 ms → hạ 1 bậc; < 1 ms suốt 8 lượt (~6 s) → nâng lại */
  const L = ST.lodW || (ST.lodW = { a: new Float32Array(45), n: 0, good: 0 }); L.a[L.n++] = ST.acc;
  if (L.n >= 45) { const m = Array.from(L.a).sort((x, y) => x - y)[22]; if (!ST.lodLock && ST.t - (ST.zoneT || 0) > 3) { if (m > 2.2 && ST.lod < 3) { ST.lod++; L.good = 0; } else if (m < 1 && ST.lod > 0) { if (++L.good >= 8) { ST.lod--; L.good = 0; } } else L.good = 0; } L.n = 0; }
  ST.acc = 0;
}
function statNow() {
  const a = Array.from(ST.perf.slice(0, ST.pn)).sort((x, y) => x - y), q = p => (a.length ? +a[Math.min(a.length - 1, Math.floor(a.length * p))].toFixed(3) : 0);
  return { on: WFX.on, zone: ST.zid, under: ST.under, cave: ST.cave, lantern: ST.fish.filter(f => f.sp === 'lantern').length, wang: ST.wang, cells: ST.cellAny, fish: ST.fish.length, wild: ST.fish.filter(f => !f.home).length, koi: ST.fish.filter(f => f.home).length, jumping: ST.fish.filter(f => f.jump).length,
    rip: ST.rip.length, wake: ST.wake.length, drops: ST.drops.length, bub: ST.bub.length, splashes: ST.n.splash || 0, caus: ST.n.caus, foam: ST.n.foam, vis: ST.visN, atlases: ST.atlases.size, combos: ST.combos.length,
    p50: q(0.5), p95: q(0.95), max: q(1), frames: ST.pn, lod: ST.lod, tm: ST.tm ? { chk: +(ST.tm.chk / ST.tm.n).toFixed(3), inter: +(ST.tm.inter / ST.tm.n).toFixed(3), fish: +(ST.tm.fish / ST.tm.n).toFixed(3) } : null, upd: +((ST.uSum || 0) / Math.max(1, ST.uN || 1)).toFixed(3) };
}
