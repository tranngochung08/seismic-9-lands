/* c4perf: gộp điểm fx78 (Việc 4 cloud, 2026-11-03) */
/* fx78.js — p78 (plan-78 đợt mẫu, 01/11/2026): VFX VẼ CODE HOÀN TOÀN cho kho chiêu hệ Chấn + nhóm Chung + 3 chiêu đầu của Rocky + cảnh "Thức Tỉnh" (Saiyan A).
   Skill vfx-code: điểm ảnh 2× (RES 2), bảng 8 bậc, mờ bằng dither Bayer 4×4 (không alpha), lớp nền (drawGround) / drawables theo y chân / lớp trên cùng (drawTop),
   hạt có trọng lực + lực cản + nảy, khựng / rung / chớp CHỈ ở khung sự kiện. Không có hiệu ứng lặp quanh thú: mọi thứ có thời hạn rồi tắt.
   "Cùng LOẠI hiệu ứng, khác NÉT THÚ" (plan-78 §5): mỗi loài 1 bộ nét (SKIN: bảng màu + hình viên đá + màu loé) — Chũi = mảnh thạch anh tím, Tê Tê = cát nén,
   Tê Tê Giáp Đá = phiến đá xám, Ngưu Sơn = tảng đá đỏ gỉ, Thạch Chấn Vương = đá son, Rocky = đá thô xám nâu + vân nứt cam.
   Độ lực theo sức mạnh thú (anh chốt 01/11): pw = power(sp, lv) → số hạt, cỡ đá, khựng, rung, vòng xung kích.
   Mỗi chiêu 3 bản (VAR[id] = 'a' | 'b' | 'c') để anh chọn — bản mặc định là bản em khuyên sau khi tự soát sheet khung.
   Không phụ thuộc linhduel / fieldct: bên gọi truyền toạ độ thế giới + hàm getter; hooks (rung / khựng / chớp) đặt bằng setHooks. */
import { PAL_SRC } from './pxfx.js';

/* ---------------- nét thú ---------------- */
const DIRT = ['#e9cfa0', '#c9a274', '#a07a52', '#7c5a3c', '#5a3f2a', '#3e2a1c', '#2a1a12', '#160c08'];
export const SKIN = {
  chan: { pal: PAL_SRC.chan, glow: ['#fffbe0', '#ffe2a0', '#e8b060'], shape: 'rock', name: 'chan' },
  chuichui: { pal: ['#fdf4ff', '#efd2f6', '#d3a8e2', '#b07ac8', '#8c48ac', '#622c7c', '#3c1a4e', '#1e0a28'], glow: ['#ffffff', '#f8e4ff', '#dcaaf4'], shape: 'crystal', name: 'chuichui' },
  chuichui2: { pal: ['#f8f2ff', '#e4d0ff', '#c6a0f6', '#a474e6', '#7e4ccc', '#5832a0', '#361c6a', '#1c0c3a'], glow: ['#ffffff', '#ece0ff', '#c8a8ff'], shape: 'crystal', name: 'chuichui2' },
  tete: { pal: ['#fff6dc', '#f4d8a0', '#dfb070', '#c98a5e', '#a4643e', '#7c4630', '#4e2c1e', '#28160e'], glow: ['#fffcec', '#ffeab0', '#f6c878'], shape: 'sand', name: 'tete' },
  tete2: { pal: ['#f8f2e8', '#e4d8c2', '#bcae9c', '#929a9a', '#6e7a7c', '#4e5458', '#303236', '#17161a'], glow: ['#ffffff', '#eef4f4', '#bccccc'], shape: 'slab', name: 'tete2' },
  nguuson: { pal: ['#fff2d4', '#f4c47e', '#e8a050', '#cc6e3a', '#a84a32', '#84302e', '#521e28', '#2a0e14'], glow: ['#fffbe0', '#ffd890', '#f0a048'], shape: 'boulder', name: 'nguuson', moss: ['#cfe2b8', '#a2be95', '#688576'] },
  golem: { pal: ['#ffe6c0', '#ecb47c', '#cc8e58', '#b26a3c', '#8a4828', '#62291c', '#3e1712', '#1c0806'], glow: ['#fff8e0', '#ffd49a', '#f0a050'], shape: 'rock', name: 'golem' },
  rocky: { pal: ['#f2ebe0', '#d2c6b2', '#aa9c88', '#847661', '#615548', '#453b32', '#2b251f', '#15110d'], glow: ['#fff8c8', '#ffc85a', '#ff8a2a'], shape: 'raw', name: 'rocky' },
};
SKIN.utchan = SKIN.golem; SKIN.dinhchan = SKIN.golem; SKIN.tamchan = SKIN.golem;
export function skinOf(sp, he) { return SKIN[sp] || (he && he !== 'chan' && PAL_SRC[he] ? { pal: PAL_SRC[he], glow: [PAL_SRC[he][0], PAL_SRC[he][1], PAL_SRC[he][2]], shape: 'rock', name: he } : SKIN.chan); }

/* ---------------- độ lực (cùng công thức fieldevo.fxPowerOf / fxPower — chép để khỏi vòng import) ---------------- */
const SZ = { xs: 0, s: 0.2, m: 0.45, l: 0.7 }, RR = { thuong: 0, hiem: 0.3, rathiem: 0.6, huyen: 0.9 };
export function powerP(s, lv = 20) { if (!s) return 0.3; return Math.max(0, Math.min(1, 0.75 * (RR[s.rarity] ?? 0.2) / 0.9 + 0.15 * (SZ[s.size] ?? 0.45) / 0.7 + 0.1 * Math.min(1, (lv | 0) / 100))); }
export function power(p) { p = Math.max(0, Math.min(1, p)); return { p, n: 0.7 + 1.1 * p, size: 1 + 0.7 * p, stop: 0.035 + 0.06 * p, shake: 0.08 + 0.22 * p, ring: 22 + 30 * p, zoom: 0.04 + 0.16 * p }; }

/* ---------------- trạng thái + hooks ---------------- */
const S = { parts: [], fx: [], decals: [], tops: [], n: {} };
let H = { quake: () => { }, stop: () => { }, flash: () => { }, zoom: () => { } };
export function setHooks(h) { H = { ...H, ...(h || {}) }; }
export const VAR = { da_vun_ban: 'a', dao_ham_vo: 'a', cat_lun: 'a', son_bang: 'a', dia_tu: 'a', thu_the: 'a', gong_chiu: 'a', ngu_bu: 'a', lan_xa: 'a', vong78: 'a', awaken: 'a' };
export function setVar(id, v) { if (id in VAR && /^[abc]$/.test(v)) VAR[id] = v; return VAR[id]; }
try { const q = new URLSearchParams(location.search).get('vfx78'); if (q) for (const kv of q.split(',')) { const [k, v] = kv.split(':'); setVar(k, v); } } catch (e) { }   /* link thử: &vfx78=da_vun_ban:b,son_bang:c */
const cnt = k => { S.n[k] = (S.n[k] || 0) + 1; };
export function clear() { S.parts = []; S.fx = []; S.decals = []; S.tops = []; }
export function stats() { return { n: { ...S.n }, parts: S.parts.length, fx: S.fx.map(f => f.k), decals: S.decals.length, tops: S.tops.length, VAR: { ...VAR } }; }
let SEED = 1; const rnd = () => { SEED = (SEED * 16807) % 2147483647; return (SEED - 1) / 2147483646; };
export function seed(s) { SEED = (s | 0) % 2147483646 + 1; }
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const TAU = Math.PI * 2;

/* ---------------- bút vẽ 2× ---------------- */
const BAY = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5], bay = (x, y) => (BAY[((y & 3) << 2) | (x & 3)] + 0.5) / 16;
/* c4perf: bút gộp — RG/RC/RX0..RX1/RY = đoạn điểm đang chờ; LG/LC = màu đang đặt trên canvas LG */
let LG = null, LC = null, RG = null, RC = null, RX0 = 0, RX1 = 0, RY = 0, C4RUN = true, C4DEC = true;
const C4OFF = k => globalThis.__c4off === true || !!(globalThis.__c4off && globalThis.__c4off[k]);
function flushRun() { const g = RG; if (!g) return; RG = null; if (g !== LG || RC !== LC) { g.fillStyle = RC; LG = g; LC = RC; } g.fillRect(RX0 / 2, RY / 2, (RX1 - RX0 + 1) / 2, 0.5); }
function FS(g, c) { if (RG) flushRun(); if (g !== LG || c !== LC || !C4RUN) { g.fillStyle = c; LG = g; LC = c; } }
function FR(g, x, y, w, h) { if (RG) flushRun(); g.fillRect(x, y, w, h); }
function enter() { if (RG) flushRun(); LG = null; C4RUN = !C4OFF('run'); C4DEC = !C4OFF('decal'); }   /* vào / ra fx78: code khác có thể đã đổi fillStyle */
function dot(g, X, Y, c) { if (!C4RUN) { g.fillStyle = c; g.fillRect(X / 2, Y / 2, 0.5, 0.5); return; }
  if (RG === g && RC === c && RY === Y) { if (X === RX1 + 1) { RX1 = X; return; } if (X === RX0 - 1) { RX0 = X; return; } if (X >= RX0 && X <= RX1 && OPQ(c)) return; }   /* nối phải / trái; trùng điểm đã có (màu đặc) → bỏ */
  if (RG) flushRun(); RG = g; RC = c; RX0 = RX1 = X; RY = Y; }
const OPQ = c => c.charCodeAt(0) === 35 && (c.length === 7 || c.length === 4);   /* '#rrggbb' / '#rgb' = màu đặc */
function disc(g, X, Y, r, c, a = 1) { if (r <= 0) return; for (let y = Math.floor(Y - r); y <= Math.ceil(Y + r); y++) for (let x = Math.floor(X - r); x <= Math.ceil(X + r); x++) { const dx = x + 0.5 - X, dy = y + 0.5 - Y; if (dx * dx + dy * dy <= r * r && (a >= 1 || a > bay(x, y))) dot(g, x, y, c); } }   /* c4perf: bút gộp */
function oval(g, X, Y, rx, ry, c, a = 1) { if (rx <= 0 || ry <= 0) return; for (let y = Math.floor(Y - ry); y <= Math.ceil(Y + ry); y++) for (let x = Math.floor(X - rx); x <= Math.ceil(X + rx); x++) { const dx = (x + 0.5 - X) / rx, dy = (y + 0.5 - Y) / ry; if (dx * dx + dy * dy <= 1 && (a >= 1 || a > bay(x, y))) dot(g, x, y, c); } }   /* c4perf: bút gộp */
const SX = (x, cx) => Math.round((x - cx) * 2), SY = (y, cy) => Math.round((y - cy) * 2);
function seg(g, X0, Y0, X1, Y1, c, a = 1, w = 1) { const n = Math.max(1, Math.ceil(Math.max(Math.abs(X1 - X0), Math.abs(Y1 - Y0)))); FS(g, c); for (let i = 0; i <= n; i++) { const x = Math.round(X0 + (X1 - X0) * i / n), y = Math.round(Y0 + (Y1 - Y0) * i / n); if (a < 1 && a <= bay(x, y)) continue; FR(g, x / 2, y / 2, w / 2, w / 2); } }
function ringBand(g, x, y, R, th, cx, cy, colOf, densOf, ry = 0.5) {
  if (R < 1) return; const X = (x - cx) * 2, Y = (y - cy) * 2, rows = Math.max(1, Math.round(th * 2));
  for (let q = 0; q < rows; q++) { const r = R * 2 - q, dq = q / rows, d = densOf(dq); if (d <= 0.02 || r < 1) continue; const cq = colOf(dq);   /* c4perf */ const n = Math.max(16, Math.round(r * 6.4));
    for (let i = 0; i < n; i++) { const a = i / n * TAU, px = Math.round(X + Math.cos(a) * r), py = Math.round(Y + Math.sin(a) * r * ry); if (d < bay(px, py)) continue; dot(g, px, py, cq); } }
}
/* viên đá theo nét thú: mẫu ô (a sáng · b giữa · c tối · g loé vân) + viền tối; xoay bằng lấy mẫu */
const SHAPE = {
  crystal: ['..a..', '.aab.', '.abb.', 'abbbc', '.bbc.', '.bcc.', '..c..'],
  rock: ['.aab.', 'abbbc', 'bbbcc', 'bbcc.', '.cc..'],
  sand: ['.ab.', 'abbc', 'bbcc', '.cc.'],
  slab: ['aaabb.', 'abbbcc', '.bcccc'],
  boulder: ['..aab..', '.abbbc.', 'abbbbcc', 'bbbbccc', '.bbcccc', '..ccc..'],
  raw: ['.aab.', 'abgbc', 'bbbgc', 'bbcc.', '.cc..'],
};
const SHAPE_PTS = {}; for (const [k, rows] of Object.entries(SHAPE)) { const H0 = rows.length, W0 = rows[0].length, pts = []; for (let j = 0; j < H0; j++) for (let i = 0; i < W0; i++) { const ch = rows[j][i]; if (ch !== '.') pts.push([i - (W0 - 1) / 2, j - (H0 - 1) / 2, ch]); } SHAPE_PTS[k] = pts; }
function peb(g, X, Y, sk, ang = 0, sc = 1, shape = null, lit = 0) { if (C4RUN && peb2(g, X, Y, sk, ang, sc, shape, lit)) return;
  const pts = SHAPE_PTS[shape || sk.shape] || SHAPE_PTS.rock, c = Math.cos(ang), s = Math.sin(ang), P = sk.pal, Gl = sk.glow;
  const col = ch => (ch === 'a' ? (lit ? Gl[0] : P[1]) : ch === 'b' ? (lit ? P[1] : P[3]) : ch === 'g' ? Gl[1] : P[5]);
  const pl = (u, v) => [Math.round(X + (u * c - v * s) * sc), Math.round(Y + (u * s + v * c) * sc)];
  FS(g, P[7]); for (const [u, v] of pts) { const [x, y] = pl(u, v); FR(g, (x - 1) / 2, y / 2, 1.5, 0.5); FR(g, x / 2, (y - 1) / 2, 0.5, 1.5); }
  for (const [u, v, ch] of pts) { const [x, y] = pl(u, v); FS(g, col(ch)); FR(g, x / 2, y / 2, 0.5, 0.5); if (sc > 1.3) FR(g, (x + 1) / 2, y / 2, 0.5, 0.5); if (sc > 1.6) FR(g, x / 2, (y + 1) / 2, 0.5, 0.5); }
}
function peb2(g, X, Y, sk, ang, sc, shape, lit) {   /* c4perf: cùng hình với peb, ít lượt vẽ */
  const pts = SHAPE_PTS[shape || sk.shape] || SHAPE_PTS.rock, c = Math.cos(ang), s = Math.sin(ang), P = sk.pal, Gl = sk.glow;
  const col = ch => (ch === 'a' ? (lit ? Gl[0] : P[1]) : ch === 'b' ? (lit ? P[1] : P[3]) : ch === 'g' ? Gl[1] : P[5]);
  if (!OPQ(P[7]) || !OPQ(P[1]) || !OPQ(P[3]) || !OPQ(P[5]) || !OPQ(Gl[0]) || !OPQ(Gl[1])) return false;
  const M = PEBM; M.clear(); const put = (x, y, v) => M.set((y + 2048) * 4096 + (x + 2048), v);
  const xy = []; for (const [u, v, ch] of pts) { const x = Math.round(X + (u * c - v * s) * sc), y = Math.round(Y + (u * s + v * c) * sc); xy.push(x, y, ch); put(x - 1, y, P[7]); put(x, y, P[7]); put(x + 1, y, P[7]); put(x, y - 1, P[7]); put(x, y + 1, P[7]); }
  for (let i = 0; i < xy.length; i += 3) { const x = xy[i], y = xy[i + 1], cc = col(xy[i + 2]); put(x, y, cc); if (sc > 1.3) put(x + 1, y, cc); if (sc > 1.6) put(x, y + 1, cc); }
  const K = [...M.keys()].sort((a, b) => a - b); for (const k of K) dot(g, (k % 4096) - 2048, Math.floor(k / 4096) - 2048, M.get(k)); return true;
}
const PEBM = new Map();
/* ---------------- chữ điểm ảnh 3×5 (có dấu tiếng Việt) ---------------- */
const FONT = { A: ['010', '101', '111', '101', '101'], B: ['110', '101', '110', '101', '110'], C: ['011', '100', '100', '100', '011'], D: ['110', '101', '101', '101', '110'], E: ['111', '100', '110', '100', '111'], F: ['111', '100', '110', '100', '100'],
  G: ['011', '100', '101', '101', '011'], H: ['101', '101', '111', '101', '101'], I: ['111', '010', '010', '010', '111'], J: ['001', '001', '001', '101', '010'], K: ['101', '101', '110', '101', '101'], L: ['100', '100', '100', '100', '111'],
  M: ['10001', '11011', '10101', '10001', '10001'], N: ['1001', '1101', '1011', '1001', '1001'], O: ['010', '101', '101', '101', '010'], P: ['110', '101', '110', '100', '100'], Q: ['010', '101', '101', '110', '011'], R: ['110', '101', '110', '101', '101'],
  S: ['011', '100', '010', '001', '110'], T: ['111', '010', '010', '010', '010'], U: ['101', '101', '101', '101', '111'], V: ['101', '101', '101', '101', '010'], W: ['10001', '10001', '10101', '11011', '10001'], X: ['101', '101', '010', '101', '101'],
  Y: ['101', '101', '010', '010', '010'], Z: ['111', '001', '010', '100', '111'], 0: ['111', '101', '101', '101', '111'], 1: ['010', '110', '010', '010', '111'], 2: ['111', '001', '111', '100', '111'], 3: ['111', '001', '111', '001', '111'],
  4: ['101', '101', '111', '001', '001'], 5: ['111', '100', '111', '001', '111'], 6: ['011', '100', '111', '101', '111'], 7: ['111', '001', '010', '010', '010'], 8: ['111', '101', '111', '101', '111'], 9: ['111', '101', '111', '001', '110'],
  '.': ['0', '0', '0', '0', '1'], '!': ['1', '1', '1', '0', '1'], '-': ['000', '000', '111', '000', '000'], '+': ['000', '010', '111', '010', '000'], '%': ['101', '001', '010', '100', '101'], '?': ['111', '001', '010', '000', '010'], ':': ['0', '1', '0', '1', '0'], '×': ['000', '101', '010', '101', '000'] };
const MARK = { '́': [[-3, 2], [-2, 1]], '̀': [[-3, 0], [-2, 1]], '̉': [[-4, 0], [-4, 1], [-3, 1], [-2, 1]], '̃': [[-3, 1], [-2, 0], [-3, 2]], '̣': [[6, 1]], '̂': [[-2, 1], [-1, 0], [-1, 2]], '̆': [[-2, 0], [-1, 1], [-2, 2]], '̛': [[-1, 3], [0, 3]] };
function glyphs(txt) {   /* → [{ rows, marks }] ; Đ = D + gạch */
  const out = []; for (const ch0 of String(txt).toUpperCase().replace(/[−–]/g, '-').replace(/…/g, '...')) { const d = ch0.normalize('NFD'); let base = d[0]; const mk = [...d.slice(1)];
    if (ch0 === 'Đ') { base = 'D'; mk.push('bar'); } if (base === ' ') { out.push({ sp: true }); continue; } const rows = FONT[base] || FONT['?'];
    const hasCap = mk.includes('̂') || mk.includes('̆'); const marks = [];
    for (const m of mk) { if (m === 'bar') { marks.push([2, -1]); continue; } const L0 = MARK[m]; if (!L0) continue; const up = (m !== '̂' && m !== '̆' && m !== '̣' && m !== '̛' && hasCap) ? -2 : 0; for (const [r, c] of L0) marks.push([r + up, Math.min(c, rows[0].length - 1 + (m === '̛' ? 1 : 0))]); }
    out.push({ rows, marks }); }
  return out;
}
export function textW(txt) { return glyphs(txt).reduce((s, q) => s + (q.sp ? 2 : q.rows[0].length + 1), -1); }
/* x, y: giữa-đáy chữ (px logic); sc: cỡ điểm (1 = 1 px logic); a < 1 → dither */
export function pixText(g, txt, x, y, col, cx, cy, sc = 1, out = '#140e1a', a = 1) { enter(); pixText0(g, txt, x, y, col, cx, cy, sc, out, a); enter(); }   /* c4perf: vào / ra */
function pixText0(g, txt, x, y, col, cx, cy, sc, out, a) {
  const G = glyphs(txt), W = G.reduce((s, q) => s + (q.sp ? 2 : q.rows[0].length + 1), -1); const ox = Math.round(x - cx - W * sc / 2), oy = Math.round(y - cy - 5 * sc);
  for (const pass of [0, 1]) { let px = 0; FS(g, pass ? col : out);
    for (const q of G) { if (q.sp) { px += 2; continue; } const cells = []; q.rows.forEach((r, j) => { for (let i = 0; i < r.length; i++) if (r[i] === '1') cells.push([j, i]); }); for (const m of q.marks) cells.push(m);
      for (const [j, i] of cells) { const X = ox + (px + i) * sc, Y = oy + j * sc; if (a < 1 && a <= bay(X * 2, Y * 2)) continue; if (pass) FR(g, X, Y, sc, sc); else { const o1 = sc < 1 ? Math.max(0.25, sc / 2) : 1; FR(g, X - o1, Y - o1, sc + 2 * o1, sc + 2 * o1); } }   /* p110: viền mảnh khi chữ nhỏ */
      px += q.rows[0].length + 1; } }
}

/* ---------------- hạt ---------------- */
function part(o) { const p = Object.assign({ x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, g: 0, drag: 0, t: 0, T: 0.4, k: 'px', ky: null, a: 1, bounce: 0, sc: 1, ang: 0, spin: 0 }, o); if (p.ky == null) p.ky = p.y + 0.3; S.parts.push(p); if (S.parts.length > 900) S.parts.shift(); return p; }
function chips(x, y, z, sk, n, sp = 70, up = 70, T = 0.6, big = 0.7, ky = null) { for (let i = 0; i < n; i++) { const a = rnd() * TAU, v = sp * (0.35 + rnd() * 0.9); part({ k: 'peb', sk, x, y, z, vx: Math.cos(a) * v, vy: Math.sin(a) * v * 0.5, vz: up * (0.4 + rnd()), g: 330, drag: 0.8, bounce: 0.35, T: T * (0.7 + rnd() * 0.6), sc: big * (0.45 + rnd() * 0.55), ang: rnd() * 6, spin: (rnd() - 0.5) * 18, ky: ky ?? y + 0.4 }); } }
function sparks(x, y, z, cols, n, sp = 60, up = 40, T = 0.32, ky = null) { for (let i = 0; i < n; i++) { const a = rnd() * TAU, v = sp * (0.4 + rnd() * 0.8); part({ x, y, z, vx: Math.cos(a) * v, vy: Math.sin(a) * v * 0.5, vz: up * (0.3 + rnd()), g: 240, drag: 2, T: T * (0.6 + rnd() * 0.6), cols, ky: ky ?? y + 0.4 }); } }
function puff(x, y, cols, n = 4, r = 2.2, T = 0.5, ky = null, spread = 8) { for (let i = 0; i < n; i++) part({ k: 'disc', x: x + (rnd() - 0.5) * spread, y: y + (rnd() - 0.5) * spread * 0.35, z: rnd() * 2, vx: (rnd() - 0.5) * 30, vy: (rnd() - 0.5) * 6, vz: 8 + rnd() * 14, g: 18, drag: 3, r: r * (0.7 + rnd() * 0.6), grow: 0.9, T: T * (0.7 + rnd() * 0.5), cols, ky: ky ?? y + 0.4 }); }
function updParts(dt) {
  for (const p of S.parts) { p.t += dt; const dr = Math.max(0, 1 - p.drag * dt); p.vx *= dr; p.vy *= dr; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; p.vz -= p.g * dt; p.ang += p.spin * dt;
    if (p.z < 0) { p.z = 0; if (p.bounce && Math.abs(p.vz) > 22) { p.vz = -p.vz * p.bounce; p.vx *= 0.6; p.vy *= 0.6; p.spin *= 0.5; } else { p.vz = 0; p.vx *= 0.78; p.vy *= 0.78; p.spin *= 0.7; } } if (p.ky != null && p.track) p.ky = p.y + 0.3; }
  S.parts = S.parts.filter(p => p.t < p.T);
}
function drawPart(g, p, cx, cy) {
  const k = p.t / p.T, X = SX(p.x, cx), Y = SY(p.y - p.z, cy), cols = p.cols || ['#fff'], a = (p.fade === false ? 1 : 1 - k * k) * p.a;
  if (p.k === 'peb') { if (k > 0.8 && (k - 0.8) * 5 > bay(X, Y)) return; if (p.z > 1) { FS(g, 'rgba(20,12,10,.3)'); FR(g, SX(p.x, cx) / 2 - 0.5, SY(p.y, cy) / 2, 1, 0.5); } peb(g, X, Y, p.sk, p.ang, p.sc, p.shape, p.lit && k < 0.3); return; }
  const c = cols[Math.min(cols.length - 1, Math.floor(k * cols.length))];
  if (p.k === 'px') { if (a < bay(X, Y)) return; dot(g, X, Y, c); dot(g, X + 1, Y, c); if (k < 0.4) dot(g, X, Y + 1, cols[Math.min(cols.length - 1, 2)]); return; }
  if (p.k === 'grain') { if (a < bay(X, Y)) return; dot(g, X, Y, c); return; }
  if (p.k === 'disc') { const r = (p.r || 2) * 2 * (1 + (p.grow || 0) * k); disc(g, X, Y, r + 1, cols[Math.min(cols.length - 1, 2)], a); disc(g, X - r * 0.25, Y - r * 0.25, r * 0.65, cols[0], a * 0.9); return; }
  if (p.k === 'spike') {   /* lưỡi hào quang gai: thon dần, bay lên */ const L = (p.L || 8) * 2 * (1 - k * 0.6), w = p.w || 2; for (let i = 0; i < L; i++) { const u = i / L, ww = Math.max(1, Math.round(w * (1 - u))); const yy = Y - i, xx = X + Math.round(Math.sin(u * 3 + p.ph) * 1.2); if (a * (1 - u * 0.5) < bay(xx, yy)) continue; for (let q = 0; q < ww; q++) dot(g, xx + q - (ww >> 1), yy, u < 0.25 ? cols[0] : u < 0.6 ? cols[1] : cols[2]); } return; }
  if (p.k === 'zz') { if (a < bay(X, Y)) return; pixText(g, 'Z', p.x, p.y - p.z, c, cx, cy, p.sc >= 1.5 ? 2 : 1, '#140e1a'); return; }
}

/* ---------------- lớp: nền / theo y / trên cùng ---------------- */
function addFx(o) { o.t = o.t || 0; S.fx.push(o); cnt('fx_' + o.k); return o; }
function decal(o) { S.decals.push(Object.assign({ t: 0, T: 3 }, o)); if (S.decals.length > 40) S.decals.shift(); }
export function update(dt, rdt) {   /* rdt: thời gian thật (cảnh Thức Tỉnh của Rocky chạy lúc thế giới chậm ×0,25) */
  if (rdt == null) rdt = dt; if (dt <= 0 && rdt <= 0) return; if (dt > 0) updParts(dt);
  for (const f of S.fx) { const d = f.real ? rdt : dt; if (d <= 0) continue; f.t += d; if (f.upd) f.upd(d, f); }
  S.fx = S.fx.filter(f => !f.dead && f.t < (f.T ?? 9e9));
  for (const d of S.decals) d.t += dt; S.decals = S.decals.filter(d => d.t < d.T);
}
export function drawGround(g, cx, cy) { enter();
  for (const d of S.decals) { const fade = d.t > d.T - 1 ? (d.T - d.t) : 1; if (C4DEC && decalCached(g, d, cx, cy, fade)) continue; drawDecal(g, d, cx, cy, fade); }
  for (const f of S.fx) if (f.gd) f.gd(g, cx, cy, f);
  enter();
}
export function drawables(out, g, cx, cy) { enter();
  for (const p of S.parts) out.push({ y: p.ky, f: () => { enter(); drawPart(g, p, cx, cy); enter(); } });   /* c4perf: mỗi mục vẽ xen với code khác → vào / ra */
  const n0 = out.length; for (const f of S.fx) if (f.dr) f.dr(out, g, cx, cy, f);
  for (let i = n0; i < out.length; i++) { const o = out[i], f0 = o.f; if (typeof f0 === 'function') o.f = () => { enter(); f0(); enter(); }; }
  enter();
}
export function drawTop(g, cx, cy, VW, VH) { enter(); for (const A of S.fx) if (A.top) A.top(g, cx, cy, VW || 320, VH || 200, A); enter(); }
export const busyTop = () => S.fx.some(f => f.top && !f.dead);
function decalBox(d) {   /* c4perf: hộp bao (px logic, tương đối d.x / d.y) */
  const r = d.r || 10;
  if (d.k === 'crater') return [-r - 2, -r * 0.5 - 2, r + 2, r * 0.5 + 2];
  if (d.k === 'crack') return [-r * 1.3 - 3, -r * 0.8 - 3, r * 1.3 + 3, r * 0.8 + 3];
  if (d.k === 'furrow' || d.k === 'line') { const x1 = (d.x1 ?? d.x) - d.x, y1 = (d.y1 ?? d.y) - d.y; return [Math.min(0, x1) - 4, Math.min(0, y1) - 4, Math.max(0, x1) + 4, Math.max(0, y1) + 4]; }
  return null;
}
function decalCached(g, d, cx, cy, fade) {   /* c4perf: vết vẽ vào canvas riêng (KHÔNG __hi), dựng lại khi đổi nấc mờ (4 nấc); dán drawImage 9 tham số */
  if (typeof document === 'undefined') return false;
  const lv = fade >= 1 ? 4 : Math.max(1, Math.ceil(fade * 4)), B = d.__B || (d.__B = decalBox(d)); if (!B) return false;
  if (d.__lv !== lv) { const W = Math.ceil((B[2] - B[0]) * 2) + 2, H = Math.ceil((B[3] - B[1]) * 2) + 2; if (W * H > 120000) return false;
    let c = d.__cv; if (!c) { c = d.__cv = document.createElement('canvas'); c.width = W; c.height = H; } const x = c.getContext('2d'); x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, W, H); x.setTransform(2, 0, 0, 2, 0, 0);
    /* gốc canvas = ô nguyên gần vết; vẽ bằng chính drawDecal (cùng màu, cùng hình) */
    const ox = Math.floor(d.x + B[0]), oy = Math.floor(d.y + B[1]); d.__ox = ox - d.x; d.__oy = oy - d.y;
    drawDecal(x, d, ox, oy, lv / 4); flushRun(); d.__lv = lv; }
  const c = d.__cv, X = Math.round((d.x + d.__ox - cx) * 2) / 2, Y = Math.round((d.y + d.__oy - cy) * 2) / 2;
  if (RG) flushRun(); g.drawImage(c, 0, 0, c.width, c.height, X, Y, c.width / 2, c.height / 2); return true;
}
function drawDecal(g, d, cx, cy, fade) {
  const X = SX(d.x, cx), Y = SY(d.y, cy), P = d.sk.pal;
  if (d.k === 'crater') { const r = d.r * 2; for (let y = -r * 0.5; y <= r * 0.5; y++) for (let x = -r; x <= r; x++) { const e = (x * x) / (r * r) + (y * y) / (r * r * 0.25); if (e > 1) continue; const px = Math.round(X + x), py = Math.round(Y + y); if (fade * (e > 0.7 ? 0.8 : 1) < bay(px, py)) continue; dot(g, px, py, e > 0.7 ? DIRT[5] : e > 0.35 ? DIRT[6] : DIRT[7]); }
    for (let i = 0; i < 8; i++) { const a = i / 8 * TAU + d.seed, px = Math.round(X + Math.cos(a) * (r + 1)), py = Math.round(Y + Math.sin(a) * (r + 1) * 0.5); if (fade > bay(px, py)) { dot(g, px, py, P[3]); dot(g, px + 1, py, P[4]); } } return; }
  if (d.k === 'crack') { let s = d.seed; const rn = () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; for (let b = 0; b < (d.nb || 6); b++) { let a = b / (d.nb || 6) * TAU + rn() * 0.6, px = X, py = Y; const L = d.r * 2 * (0.6 + rn() * 0.5);
      for (let i = 0; i < L; i++) { a += (rn() - 0.5) * 0.5; px += Math.cos(a); py += Math.sin(a) * 0.5; const xx = Math.round(px), yy = Math.round(py); if (fade < bay(xx, yy)) continue; dot(g, xx, yy, DIRT[7]); if (i < L * 0.6) dot(g, xx, yy + 1, DIRT[6]); if (d.hot && i < L * 0.35) dot(g, xx, yy - 1, d.sk.glow[1]); } } return; }
  if (d.k === 'furrow') { const n = Math.ceil(Math.hypot(d.x1 - d.x, d.y1 - d.y) * 2); for (let i = 0; i <= n; i++) { const u = i / (n || 1), px = Math.round(X + (SX(d.x1, cx) - X) * u), py = Math.round(Y + (SY(d.y1, cy) - Y) * u); for (const w of [-2, -1, 0, 1, 2]) { if (fade * (Math.abs(w) === 2 ? 0.6 : 1) < bay(px, py + w)) continue; dot(g, px, py + w, Math.abs(w) === 2 ? P[4] : w === 0 ? DIRT[7] : DIRT[6]); } } return; }
  if (d.k === 'line') { const n = Math.ceil(Math.hypot(d.x1 - d.x, d.y1 - d.y) * 2); let s = d.seed; const rn = () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; let off = 0;
    for (let i = 0; i <= n; i++) { const u = i / (n || 1); off += (rn() - 0.5) * 1.2; off = clamp(off, -3, 3); const px = Math.round(X + (SX(d.x1, cx) - X) * u), py = Math.round(Y + (SY(d.y1, cy) - Y) * u + off); if (fade < bay(px, py)) continue; dot(g, px, py, DIRT[7]); dot(g, px, py + 1, DIRT[6]); if (i % 9 === 0) chipDot(g, px, py - 2, P); } return; }
}
function chipDot(g, X, Y, P) { dot(g, X, Y, P[2]); dot(g, X + 1, Y, P[4]); }
function flashAt(x, y, z, sk, r, T = 0.1, ky = null, star = false) { return addFx({ k: 'flash', x, y, z, sk, r, T, dr: (out, g, cx, cy, f) => out.push({ y: ky ?? y + 0.6, f: () => { const k = f.t / f.T, C = sk.glow, P = sk.pal, X = SX(x, cx), Y = SY(y - z, cy), rr = r * 2 * (k < 0.3 ? 0.6 + k * 1.4 : 1 - (k - 0.3) * 0.9); if (rr < 1) return; disc(g, X, Y, rr + 2, P[3]); disc(g, X, Y, rr, C[1]); disc(g, X, Y, rr * 0.55, C[0]);
  if (star) { const L = rr * 2.6; for (const [ux, uy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) for (let s = rr * 0.6; s < L; s += 1) { const w = 1 - s / L; if (w < bay(X + ux * s, Y + uy * s) * 0.8) continue; dot(g, Math.round(X + ux * s), Math.round(Y + uy * s), s < L * 0.5 ? C[0] : C[2]); } } } }) }); }

/* ======================= sự kiện dùng chung ======================= */
export function muzzle(x, gy, z, sk, pw, ux = 1, uy = 0) {
  cnt('muzzle'); flashAt(x, gy, z, sk, 2.6 + 1.6 * pw.p, 0.09, gy + 0.7, true);
  for (let i = 0; i < Math.round(4 + 4 * pw.n); i++) { const a = Math.atan2(uy, ux) + (rnd() - 0.5) * 1.1, v = 60 + rnd() * 80; part({ x, y: gy, z, vx: Math.cos(a) * v, vy: Math.sin(a) * v * 0.5, vz: 10 + rnd() * 30, g: 200, drag: 3, T: 0.22 + rnd() * 0.12, cols: [sk.glow[0], sk.pal[1], sk.pal[3]], ky: gy + 0.7 }); }
}
export function impact(x, gy, z, sk, pw, o = {}) {
  cnt('impact'); const n = Math.round((o.n || 6) * pw.n), body = z > 3;
  flashAt(x, gy, z, sk, (o.r || 3.2) * pw.size, o.T || 0.11, gy + 0.8, !!o.star);
  chips(x, gy, z, sk, n, 60 + 30 * pw.p, 50 + 40 * pw.p, 0.6, (o.big || 0.75) * pw.size, gy + 0.6);
  sparks(x, gy, z, [sk.glow[0], sk.pal[1], sk.pal[3]], Math.round(4 + 4 * pw.n), 70, 30, 0.28, gy + 0.7);
  puff(x, gy, [DIRT[2], DIRT[3], DIRT[4]], body ? 2 : 3 + Math.round(2 * pw.p), 1.8 + pw.p, 0.5, gy + 0.3);
  if (!body && !o.noCrater) decal({ k: 'crater', x, y: gy + 1, r: 3 + 2 * pw.p * (o.cr || 1), sk, seed: rnd() * 6, T: 3 });
  if (o.ring || pw.p > 0.55) shockRing(x, gy + 1, (o.ringR || 14) * pw.size, sk, 0.28);
  if (o.big) { H.quake(pw.shake * (o.q || 1)); H.stop(pw.stop * (o.s || 1)); }
}
export function shockRing(x, y, R, sk, T = 0.32, th = 3) { cnt('ring'); return addFx({ k: 'ring', x, y, R, T, gd: (g, cx, cy, f) => { const k = f.t / f.T, e = 1 - Math.pow(1 - k, 3); ringBand(g, x, y, 3 + R * e, th * (1 - k * 0.7), cx, cy, q => (q < 0.25 ? sk.glow[0] : q < 0.5 ? sk.pal[1] : sk.pal[3]), q => (q < 0.5 ? 1 : 0.6) * (1 - k * k)); } }); }
export function crack(x, y, sk, r = 10, hot = false, nb = 6, T = 3) { decal({ k: 'crack', x, y, r, sk, seed: (rnd() * 1e6) | 1, hot, nb, T }); }

/* ======================= 1. ĐÁ VỤN BẮN — đạn nhiều viên ======================= */
/* o: { x, gy, z (độ cao miệng), tg() → { x, gy, z }, n, gap, sk, pw, onArrive(i, shot) → true trúng / false hụt, v } */
export function volley(o) {
  const V = o.variant || VAR.da_vun_ban, pw = o.pw, sk = o.sk; cnt('volley_' + V);
  const F = addFx({ k: 'volley', V, T: 9, shots: [], i: 0, next: V === 'c' ? 0.3 : 0, o, orbit: V === 'c' ? [] : null });
  if (V === 'c') for (let i = 0; i < o.n; i++) F.orbit.push({ a: i / o.n * TAU, r: 14 + rnd() * 6 });   /* gồng: viên đá bay vòng hút về miệng */
  F.upd = (dt, f) => {
    if (f.i < o.n && f.t >= f.next) { const src = o.src ? o.src() : { x: o.x, gy: o.gy, z: o.z }, T0 = o.tg(); const jx = (rnd() - 0.5) * 6, jy = (rnd() - 0.5) * 4;
      const aim = { x: T0.x + jx, gy: T0.gy + jy * 0.4, z: Math.max(2, T0.z + jy) }, d = Math.hypot(aim.x - src.x, aim.gy - src.gy) || 1, v = (o.v || 290) * (V === 'b' ? 0.72 : V === 'c' ? 1.12 : 1);
      f.shots.push({ i: f.i, x: src.x, gy: src.gy, z: src.z, x0: src.x, g0: src.gy, z0: src.z, aim, t: 0, T: d / v, ang: rnd() * 6, spin: (rnd() < 0.5 ? -1 : 1) * (14 + rnd() * 10), trail: [], sc: (V === 'c' ? 0.95 : 0.8) * pw.size * (0.85 + rnd() * 0.3) });
      muzzle(src.x, src.gy, src.z, sk, pw, aim.x - src.x, aim.gy - src.gy); if (H.sfx) H.sfx('shot'); f.i++; f.next = f.t + (o.gap || 0.085); if (f.orbit) f.orbit.shift(); }
    for (const s of f.shots) { if (s.done) continue; s.t += dt; const u = Math.min(1, s.t / s.T); s.trail.unshift({ x: s.x, gy: s.gy, z: s.z }); if (s.trail.length > 7) s.trail.pop();
      s.x = s.x0 + (s.aim.x - s.x0) * u; s.gy = s.g0 + (s.aim.gy - s.g0) * u; s.z = s.z0 + (s.aim.z - s.z0) * u + (V === 'b' ? Math.sin(Math.PI * u) * 16 : 0); s.ang += s.spin * dt;
      if (u >= 1) { s.done = true; const hit = o.onArrive ? o.onArrive(s.i, s) : true; if (hit) impact(s.x, s.gy, s.z, sk, pw, { n: V === 'c' ? 7 : 5, r: 2.6, big: 0.7, ring: V === 'c', ringR: 11, star: V !== 'b', noCrater: true });
        else { impact(s.x, s.gy, 0, sk, pw, { n: 4, r: 2, big: 0.6, cr: 0.6 }); if (V === 'b') for (let q = 0; q < 2; q++) part({ k: 'peb', sk, x: s.x, y: s.gy, z: 2, vx: (s.aim.x - s.x0) / s.T * 0.25 + (rnd() - 0.5) * 20, vy: (rnd() - 0.5) * 10, vz: 50 + rnd() * 30, g: 330, bounce: 0.4, T: 0.7, sc: s.sc * 0.8, spin: 10 }); } } }
    if (f.orbit) for (const q of f.orbit) { q.a += dt * 14; q.r = Math.max(2, q.r - dt * 40); }
    if (f.i >= o.n && f.shots.every(s => s.done)) f.dead = true;
  };
  F.dr = (out, g, cx, cy, f) => {
    if (f.orbit && f.orbit.length && f.i < o.n) { const src = o.src ? o.src() : { x: o.x, gy: o.gy, z: o.z }; for (const q of f.orbit) { const front = Math.sin(q.a) > 0; out.push({ y: src.gy + (front ? 0.6 : -0.6), f: () => peb(g, SX(src.x + Math.cos(q.a) * q.r, cx), SY(src.gy - src.z + Math.sin(q.a) * q.r * 0.45, cy), sk, q.a * 2, 0.6 * pw.size) }); } }
    for (const s of f.shots) { if (s.done) continue; const up = s.aim.gy < s.g0 - 2; out.push({ y: (o.ky ? o.ky : s.g0) + (up ? -0.5 : 0.5), f: () => {   /* luật lớp 16/10: bay lên nằm sau người bắn, bay xuống nằm trước */
      for (let i = 1; i < s.trail.length; i++) { const q = s.trail[i], X = SX(q.x, cx), Y = SY(q.gy - q.z, cy), a = 1 - i / s.trail.length; if (a < bay(X, Y)) continue; const c = i < 2 ? sk.glow[1] : i < 4 ? sk.pal[2] : sk.pal[4]; dot(g, X, Y, c); dot(g, X + 1, Y, c); if (V !== 'b' && i < 3) dot(g, X, Y + 1, sk.pal[1]); }
      if (s.z > 2) { FS(g, 'rgba(20,12,10,.28)'); FR(g, SX(s.x, cx) / 2 - 1, SY(s.gy, cy) / 2, 2, 0.5); }
      peb(g, SX(s.x, cx), SY(s.gy - s.z, cy), sk, s.ang, s.sc, null, V === 'c' && s.t < 0.06); } }); }
  };
  return F;
}

/* ======================= 2. ĐÀO HẦM VỒ — chui / ụ đất / trồi cắn ======================= */
/* sink(x, y, sk, pw): bụi + đá văng lúc chui xuống ; burrow({ get() → {x,y}, sk, pw, variant }) → handle.end() ; erupt(x, y, sk, pw, variant) ; bite(x, y, z, sk, pw) */
export function sink(x, y, sk, pw) { cnt('sink'); puff(x, y, [DIRT[1], DIRT[2], DIRT[3]], 4 + Math.round(2 * pw.p), 2.2, 0.5, y + 0.6, 12); chips(x, y, 1, skinDirt(sk), 5 + Math.round(4 * pw.p), 40, 70, 0.55, 0.6, y + 0.6); crack(x, y + 1, sk, 8, false, 5, 2.5); H.quake(0.06); }
const skinDirt = sk => ({ pal: DIRT, glow: sk.glow, shape: 'rock' });
export function burrow(o) {
  const V = o.variant || VAR.dao_ham_vo, sk = o.sk, pw = o.pw; cnt('burrow_' + V);
  const F = addFx({ k: 'burrow', V, last: null, acc: 0, T: 9 });
  F.upd = (dt, f) => { if (f.ended) { f.dead = true; return; } const p = o.get(); if (!p) return; if (f.last) { const d = Math.hypot(p.x - f.last.x, p.y - f.last.y); f.acc += d;
      if (f.acc > (V === 'b' ? 5 : 7)) { f.acc = 0; if (V === 'a') { crack(p.x, p.y + 1, sk, 4 + rnd() * 3, false, 3, 2.2); part({ k: 'peb', sk: skinDirt(sk), x: p.x, y: p.y, z: 1, vx: -(p.x - f.last.x) * 8 + (rnd() - 0.5) * 20, vy: (rnd() - 0.5) * 8, vz: 40 + rnd() * 30, g: 330, bounce: 0.3, T: 0.5, sc: 0.5 }); }
        if (V === 'b') { decal({ k: 'furrow', x: f.last.x, y: f.last.y + 1, x1: p.x, y1: p.y + 1, sk, T: 2.4 }); for (let q = 0; q < 2; q++) part({ k: 'grain', x: p.x, y: p.y, z: 2, vx: (rnd() - 0.5) * 40, vy: (rnd() - 0.5) * 10, vz: 30 + rnd() * 30, g: 260, T: 0.4, cols: [sk.pal[1], sk.pal[3], DIRT[3]] }); }
        if (V === 'c') { if (rnd() < 0.5) shockRing(p.x, p.y + 1, 6, sk, 0.3, 1.5); } } } f.last = { x: p.x, y: p.y }; };
  F.gd = (g, cx, cy, f) => { if (!f.last || V !== 'a') return; const X = SX(f.last.x, cx), Y = SY(f.last.y, cy), b = Math.round(Math.sin(f.t * 24));   /* ụ đất nhấp nhô */
    oval(g, X, Y + 1, 9, 4, DIRT[6]); oval(g, X, Y - 1 + b, 8, 4, DIRT[4]); oval(g, X - 1, Y - 2 + b, 5, 2.5, DIRT[2]); dot(g, X - 3, Y - 3 + b, DIRT[1]); dot(g, X + 2, Y - 2 + b, sk.pal[2]); };
  F.dr = (out, g, cx, cy, f) => { if (!f.last || V === 'a') return; const p = f.last; out.push({ y: p.y + 0.2, f: () => { const X = SX(p.x, cx), Y = SY(p.y, cy);
    if (V === 'b') { for (let i = -1; i <= 1; i++) peb(g, X + i * 5, Y - 3 - (i === 0 ? 3 : 0) + Math.round(Math.sin(f.t * 30 + i) * 1), sk, -Math.PI / 2 + i * 0.35, 0.9 * pw.size, 'crystal'); oval(g, X, Y + 1, 9, 2.5, DIRT[6], 0.85); }   /* vây đá rẽ đất */
    else { oval(g, X, Y, 7, 3, DIRT[5], 0.9); oval(g, X, Y, 4, 1.8, DIRT[7]); } } }); };
  return { end: () => { F.ended = true; } };
}
export function warnRing(x, y, sk, R = 14, T = 0.35) { cnt('warn'); return addFx({ k: 'warn', T, gd: (g, cx, cy, f) => { const k = f.t / f.T; ringBand(g, x, y + 1, R * (1.4 - 0.4 * k), 1.5, cx, cy, () => DIRT[7], () => 0.5 + 0.5 * k); crackG(g, x, y + 1, sk, R * k, cx, cy, 7); } }); }
function crackG(g, x, y, sk, r, cx, cy, nb = 6) { const X = SX(x, cx), Y = SY(y, cy); for (let b = 0; b < nb; b++) { const a = b / nb * TAU + 0.3; for (let i = 0; i < r * 2; i++) { const px = Math.round(X + Math.cos(a + Math.sin(i * 0.7) * 0.2) * i), py = Math.round(Y + Math.sin(a) * i * 0.5); dot(g, px, py, DIRT[7]); } } }
export function erupt(x, y, sk, pw, variant) {
  const V = variant || VAR.dao_ham_vo; cnt('erupt_' + V); H.quake(pw.shake * 1.1); H.stop(pw.stop);
  flashAt(x, y, 4, sk, 4 + 2 * pw.p, 0.12, y + 0.8, true); crack(x, y + 1, sk, 10 + 6 * pw.p, true, 7, 3.2); decal({ k: 'crater', x, y: y + 1, r: 6 + 3 * pw.p, sk, seed: rnd() * 6, T: 3.2 });
  if (V === 'a') {   /* cột đất phụt thẳng: đá + bụi bắn cao rồi rơi */
    for (let i = 0; i < Math.round(12 * pw.n); i++) part({ k: 'peb', sk: rnd() < 0.5 ? sk : skinDirt(sk), x: x + (rnd() - 0.5) * 8, y: y + (rnd() - 0.5) * 3, z: 2, vx: (rnd() - 0.5) * 50, vy: (rnd() - 0.5) * 16, vz: 120 + rnd() * 120, g: 340, bounce: 0.35, T: 1.0, sc: (0.5 + rnd() * 0.5) * pw.size, ang: rnd() * 6, spin: (rnd() - 0.5) * 20 });
    addFx({ k: 'geyser', T: 0.4, dr: (out, g, cx, cy, f) => out.push({ y: y + 0.65, f: () => { const k = f.t / f.T, Hh = (14 + 10 * pw.p) * 2 * Math.min(1, k * 4), W = (6 + 2 * pw.p) * (1 - k * 0.6), X = SX(x, cx), Y = SY(y, cy);
      for (let yy = 0; yy < Hh; yy++) { const u = yy / Hh, w = W * (1 - u * 0.5); for (let xx = -w; xx <= w; xx++) { const px = Math.round(X + xx + Math.sin(yy * 0.5 + f.t * 30) * 1.5), py = Y - yy; if ((1 - k) * (1 - u * 0.4) < bay(px, py)) continue; dot(g, px, py, Math.abs(xx) > w * 0.7 ? DIRT[5] : u > 0.8 ? DIRT[1] : (yy % 5 < 2 ? DIRT[3] : DIRT[2])); } } } }) });
  } else if (V === 'b') {   /* quạt bắn tung: mảnh nét thú toả hình nón lên trên */
    for (let i = 0; i < Math.round(14 * pw.n); i++) { const a = -Math.PI / 2 + (rnd() - 0.5) * 2.2; part({ k: 'peb', sk, x, y, z: 3, vx: Math.cos(a) * (60 + rnd() * 70), vy: (rnd() - 0.5) * 20, vz: 60 + rnd() * 90, g: 300, bounce: 0.4, T: 0.9, sc: (0.5 + rnd() * 0.6) * pw.size, ang: rnd() * 6, spin: (rnd() - 0.5) * 20 }); }
    puff(x, y, [DIRT[1], DIRT[2], DIRT[3]], 6, 2.6, 0.6, y + 0.6, 16);
  } else {   /* hố sụt: đất quanh tâm sập vào giữa rồi bùng */
    for (let i = 0; i < 14; i++) { const a = i / 14 * TAU, R = 14 + rnd() * 4; part({ k: 'peb', sk: skinDirt(sk), x: x + Math.cos(a) * R, y: y + Math.sin(a) * R * 0.5, z: 1, vx: -Math.cos(a) * 70, vy: -Math.sin(a) * 35, vz: 30, g: 200, T: 0.3, sc: 0.6 }); }
    addFx({ k: 'collapse', T: 0.5, gd: (g, cx, cy, f) => { const k = f.t / f.T; oval(g, SX(x, cx), SY(y + 1, cy), (16 - 8 * k) * 2, (16 - 8 * k), DIRT[7], 1 - k); oval(g, SX(x, cx), SY(y + 1, cy), (11 - 6 * k) * 2, (11 - 6 * k), '#120a06', 1 - k); } });
    chips(x, y, 3, sk, Math.round(10 * pw.n), 50, 120, 0.8, 0.8 * pw.size, y + 0.6);
  }
  shockRing(x, y + 1, 18 * pw.size, sk, 0.3);
}
export function bite(x, y, z, sk, pw) {   /* hàm cắn: 2 cung răng khép lại, răng sáng theo nét thú */
  cnt('bite'); H.stop(pw.stop * 1.2); return addFx({ k: 'bite', T: 0.3, dr: (out, g, cx, cy, f) => out.push({ y: y + 0.8, f: () => { const k = f.t / f.T, X = SX(x, cx), Y = SY(y - z, cy), R = (12 + 4 * pw.p) * 2, cl = Math.min(1, k * 3), a = 1 - Math.max(0, (k - 0.4) / 0.6), P = sk.pal;
    for (const sgn of [-1, 1]) for (let i = 0; i <= 28; i++) { const an = Math.PI * (0.1 + 0.8 * i / 28), px = Math.round(X + Math.cos(an) * R * (1 - cl * 0.25)), py = Math.round(Y + sgn * (Math.sin(an) * R * 0.5 * (1 - cl * 0.7) + 2)); if (a < bay(px, py)) continue; dot(g, px, py, P[7]); dot(g, px + 1, py, P[5]); dot(g, px, py + sgn, P[2]); if (i % 4 === 2) { dot(g, px, py - sgn, sk.glow[0]); dot(g, px, py - 2 * sgn, P[1]); dot(g, px, py - 3 * sgn, P[1]); } } } }) }); }

/* ======================= 3. CÁT LÚN — bẫy sân ======================= */
export function lob(o) {   /* nắm cát / đá bay bổng: { x, gy, z, tx, ty, T, sk, onLand } */
  cnt('lob'); const sk = o.sk; return addFx({ k: 'lob', T: o.T + 0.02, upd: (dt, f) => { const u = Math.min(1, f.t / o.T); f.x = o.x + (o.tx - o.x) * u; f.gy = o.gy + (o.ty - o.gy) * u; f.z = o.z * (1 - u) + Math.sin(Math.PI * u) * (o.h || 22);
      if ((f.tr = (f.tr || 0) - dt) <= 0) { f.tr = 0.035; part({ k: 'grain', x: f.x, y: f.gy, z: f.z, vx: 0, vz: -10, g: 120, T: 0.35, cols: [sk.pal[1], sk.pal[3], sk.pal[4]] }); }
      if (u >= 1 && !f.landed) { f.landed = true; if (o.onLand) o.onLand(); } },
    dr: (out, g, cx, cy, f) => { if (f.x == null || f.landed) return; out.push({ y: f.gy + 0.4, f: () => { FS(g, 'rgba(20,12,10,.25)'); FR(g, SX(f.x, cx) / 2 - 1.5, SY(f.gy, cy) / 2, 3, 1); disc(g, SX(f.x, cx), SY(f.gy - f.z, cy), 4, sk.pal[5]); disc(g, SX(f.x, cx), SY(f.gy - f.z, cy), 3, sk.pal[3]); disc(g, SX(f.x, cx) - 1, SY(f.gy - f.z, cy) - 1, 1.6, sk.pal[1]); } }); } });
}
/* pit({ x, y, r, T, sk }) → handle { x, y, r, trig(), alive() } — vũng TĨNH (không xoáy lặp), chỉ cuộn cát khi có thú bước vào */
export function pit(o) {
  cnt('pit'); const sk = o.sk, sd = (rnd() * 1e6) | 1; const F = addFx({ k: 'pit', x: o.x, y: o.y, r: o.r, T: o.T, trigT: -1, grow: 0 });
  F.upd = (dt, f) => { f.grow = Math.min(1, f.grow + dt / 0.25); if (f.trigT >= 0) f.trigT += dt; };
  F.gd = (g, cx, cy, f) => { const fade = f.t > f.T - 1 ? f.T - f.t : 1, X = SX(f.x, cx), Y = SY(f.y, cy), R = f.r * 2 * f.grow, P = sk.pal; let s = sd; const rn = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    const sw = f.trigT >= 0 && f.trigT < 0.6 ? f.trigT : -1;
    for (let y = -R * 0.5; y <= R * 0.5; y++) for (let x = -R; x <= R; x++) { const e = (x * x) / (R * R) + (y * y) / (R * R * 0.25); if (e > 1) continue; const px = Math.round(X + x), py = Math.round(Y + y);
      let band = e > 0.78 ? 0 : e > 0.45 ? 1 : e > 0.18 ? 2 : 3; if (sw >= 0) { const an = Math.atan2(y * 2, x) + sw * 14 + e * 6; if (Math.sin(an * 3) > 0.55) band = Math.max(0, band - 1); }
      if (fade < bay(px, py)) continue; dot(g, px, py, [P[2], P[3], P[4], P[5]][band]); }
    for (let i = 0; i < 18; i++) { const a = rn() * TAU, rr = R * (0.95 + rn() * 0.15), px = Math.round(X + Math.cos(a) * rr), py = Math.round(Y + Math.sin(a) * rr * 0.5); if (fade > bay(px, py)) { dot(g, px, py, P[1]); if (rn() < 0.5) dot(g, px + 1, py, P[0]); } }   /* viền hạt cát sáng */
    for (let i = 0; i < 6; i++) { const a = rn() * TAU, rr = R * rn() * 0.6, px = Math.round(X + Math.cos(a) * rr), py = Math.round(Y + Math.sin(a) * rr * 0.5); if (fade > bay(px, py)) dot(g, px, py, P[6]); } };
  return { get x() { return F.x; }, get y() { return F.y; }, r: o.r, alive: () => !F.dead && F.t < F.T, trig: () => { F.trigT = 0; cnt('pit_trig'); for (let i = 0; i < 10; i++) { const a = rnd() * TAU; part({ k: 'grain', x: F.x + Math.cos(a) * F.r * 0.8, y: F.y + Math.sin(a) * F.r * 0.4, z: 1, vx: -Math.sin(a) * 40 - Math.cos(a) * 20, vy: Math.cos(a) * 15 - Math.sin(a) * 10, vz: 40 + rnd() * 40, g: 240, T: 0.5, cols: [sk.pal[0], sk.pal[2], sk.pal[4]] }); } puff(F.x, F.y, [sk.pal[1], sk.pal[2], sk.pal[3]], 3, 2, 0.5); }, kill: () => { F.dead = true; } };
}
export function sandWave(o) {   /* bản b: dải cát chạy từ thân tới chỗ đặt vũng */
  cnt('sandwave'); const sk = o.sk; return addFx({ k: 'sandwave', T: o.T + 0.3, gd: (g, cx, cy, f) => { const u = Math.min(1, f.t / o.T), x = o.x + (o.tx - o.x) * u, y = o.y + (o.ty - o.y) * u, fade = f.t > o.T ? 1 - (f.t - o.T) / 0.3 : 1;
    const n = Math.ceil(Math.hypot(x - o.x, y - o.y) * 2); for (let i = 0; i <= n; i++) { const w = i / (n || 1), px = SX(o.x + (x - o.x) * w, cx), py = SY(o.y + (y - o.y) * w, cy); for (let q = -3; q <= 3; q++) { if (fade * (0.4 + 0.6 * w) * (1 - Math.abs(q) / 4) < bay(px, py + q)) continue; dot(g, px, py + q, Math.abs(q) > 1 ? sk.pal[4] : sk.pal[2]); } }
    if (u < 1) { oval(g, SX(x, cx), SY(y, cy), 7, 3, sk.pal[1]); oval(g, SX(x, cx), SY(y, cy) - 1, 4, 2, sk.pal[0]); } },
  upd: (dt, f) => { if (f.t >= o.T && !f.done1) { f.done1 = true; if (o.onLand) o.onLand(); } } });
}

/* ======================= 4. SƠN BĂNG — tuyệt chiêu gồng + đòn đường thẳng xuyên hàng (Saiyan B) ======================= */
/* chargeAura({ get() → { x, y, h, w }, T, sk, pw }) — hào quang gai nhọn + đá vụn bay lên + đất rung dưới chân; CHỈ trong lúc gồng (không lặp sau đó) */
export function chargeAura(o) {
  cnt('charge'); const sk = o.sk, pw = o.pw;
  return addFx({ k: 'charge', T: o.T, upd: (dt, f) => { const p = o.get(); if (!p) { f.dead = true; return; } const k = f.t / f.T, w = p.w || 10, rate = (26 + 60 * k) * pw.n;
      for (let n = rate * dt; n > 0; n--) { if (rnd() > n) break; const a = rnd() * TAU, ex = Math.cos(a) * w * 0.65, ez = Math.max(0, p.h * (0.15 + 0.7 * rnd()));
        part({ k: 'spike', x: p.x + ex, y: p.y + Math.sin(a) * 2, z: ez * 0.6, vx: ex * 0.6, vz: 50 + rnd() * 40 + 40 * k, g: 0, drag: 2, T: 0.22 + rnd() * 0.14, L: 4 + 6 * k + 4 * pw.p, w: rnd() < 0.3 ? 3 : 2, ph: rnd() * 6, cols: [sk.glow[0], sk.glow[1], sk.pal[2]], ky: p.y + (Math.sin(a) > 0 ? 0.62 : -0.62) }); }
      if ((f.deb = (f.deb || 0) - dt) <= 0) { f.deb = 0.09 / pw.n; const a = rnd() * TAU, R = 10 + rnd() * 18; part({ k: 'peb', sk, x: p.x + Math.cos(a) * R, y: p.y + Math.sin(a) * R * 0.45, z: 0, vz: 18 + rnd() * 14, g: -10, drag: 0.5, T: 0.7, sc: 0.45 + rnd() * 0.4, ang: rnd() * 6, spin: (rnd() - 0.5) * 6 }); }   /* đá vụn lơ lửng bay lên */
      if ((f.rum = (f.rum || 0) - dt) <= 0) { f.rum = 0.16; H.quake(0.02 + 0.05 * k * pw.n); } },
    gd: (g, cx, cy, f) => { const p = o.get(); if (!p) return; const k = f.t / f.T; ringBand(g, p.x, p.y + 1, (p.w || 10) * (1.6 - 0.6 * k) + 4, 1.5, cx, cy, () => sk.pal[3], () => 0.35 + 0.5 * k); } });
}
/* shout(x, y, txt, col): chữ hô điểm ảnh (to dần rồi tắt bằng dither) — không che thú: đặt trên đầu */
export function shout(x, y, txt, col = '#ffe9a0', sc = 1, T = 0.9) { cnt('shout'); const map110 = typeof document !== 'undefined' && !document.body.classList.contains('ld-on');   /* p110: ngoài map — chữ nhỏ cỡ nhãn tên, bỏ chữ cũ gần đó */
  if (map110) { const K = (globalThis.__cam89 && globalThis.__cam89().scale) || 2; sc = Math.max(0.25, Math.min(sc, 1) * 2 / K); for (const o of S.fx) if (o.k === 'shout' && !o.dead && Math.abs(o.sx - x) < 90 && Math.abs(o.sy - y) < 24) o.dead = true; }
  return addFx({ k: 'shout', sx: x, sy: y, T, dr: (out, g, cx, cy, f) => out.push({ y: y + 50, f: () => { const k = f.t / f.T, s = k < 0.12 ? (map110 ? sc * 1.25 : sc + 1) : sc, a = k > 0.7 ? 1 - (k - 0.7) / 0.3 : 1, dx = k < 0.25 ? Math.round(Math.sin(f.t * 90)) : 0; pixText(g, txt, x + dx, y - (k < 0.12 ? 2 : 0), col, cx, cy, s, '#140e1a', a); } }) }); }
/* beam({ x, gy, z, ux, uy, L, W, T, sk, pw, variant, kyC (y chân người ra chiêu), onFront(dist) }) — Dòng Đá Lở / Hàng Gai Núi / Đỉnh Núi Rơi */
export function slide(o) {
  const V = o.variant || VAR.son_bang, sk = o.sk, pw = o.pw, L = o.L, W = o.W; cnt('slide_' + V);
  const F = addFx({ k: 'slide', V, T: (o.T || 0.6) + 0.45, front: 0, rocks: [], ring: [] });
  for (let i = 0; i < Math.round(L / 4); i++) F.rocks.push({ u: rnd(), off: (rnd() - 0.5) * 2, z: rnd(), sc: 0.6 + rnd() * 0.9, ang: rnd() * 6, sp: 0.6 + rnd() * 0.8 });
  const grow = V === 'b' ? 0.32 : 0.14, hold = o.T || 0.6;
  F.upd = (dt, f) => { const prev = f.front; f.front = Math.min(1, f.t / grow) * L;
    if (V !== 'c' && o.onFront && f.front > prev) o.onFront(f.front, prev);
    if (f.t < grow + hold) { if ((f.rr = (f.rr || 0) - dt) <= 0) { f.rr = 0.13; f.ring.push(0); }   /* vòng chớp đầu tia */
      if ((f.dd = (f.dd || 0) - dt) <= 0) { f.dd = 0.03; const u = rnd() * f.front, x = o.x + o.ux * u, y = o.gy + o.uy * u + (rnd() - 0.5) * W * 0.6; part({ k: 'peb', sk, x, y, z: rnd() * W * 0.4, vx: o.ux * 90 + (rnd() - 0.5) * 30, vy: o.uy * 90 + (rnd() - 0.5) * 30, vz: 40 + rnd() * 60, g: 330, bounce: 0.3, T: 0.5, sc: (0.4 + rnd() * 0.5) * pw.size, ang: rnd() * 6, spin: (rnd() - 0.5) * 20 }); } }
    for (let i = 0; i < f.ring.length; i++) f.ring[i] += dt; f.ring = f.ring.filter(r => r < 0.3);
    if (!f.end && f.t >= grow + hold) { f.end = true; for (let i = 0; i < Math.round(L / 7); i++) { const u = rnd() * L; chips(o.x + o.ux * u, o.gy + o.uy * u, 2, sk, 1, 40, 60, 0.7, 0.8 * pw.size); } decal({ k: 'line', x: o.x + o.ux * 6, y: o.gy + o.uy * 6 + 1, x1: o.x + o.ux * L, y1: o.gy + o.uy * L + 1, sk, seed: (rnd() * 1e6) | 1, T: 3.5 }); }
    for (const r of f.rocks) r.ang += dt * 9 * r.sp; };
  F.dr = (out, g, cx, cy, f) => {
    const kyC = (o.kyC ?? o.gy) + (o.uy < -0.05 ? -0.5 : 0.5), k2 = f.end ? Math.min(1, (f.t - grow - hold) / 0.45) : 0, fade = 1 - k2;
    if (V === 'a') out.push({ y: kyC, f: () => {   /* DÒNG ĐÁ LỞ: dải đá lăn cuộn sát đất, mép bụi dither, vệt sáng lõi; đầu dòng = cụm đá + vòng chớp */
      const n = Math.ceil(f.front * 2), px = -o.uy, py = o.ux;
      for (let i = 0; i <= n; i++) { const u = i / 2, X0 = SX(o.x + o.ux * u, cx), Y0 = SY(o.gy + o.uy * u, cy), taper = Math.min(1, u / 14) * (u > f.front - 6 ? 0.8 : 1), w = W * taper * (0.85 + 0.15 * Math.sin(u * 0.6 + f.t * 30));
        for (let q = -w; q <= w; q += 0.5) { const e = Math.abs(q) / (w || 1), Xq = Math.round(X0 + px * q * 2), Yq = Math.round(Y0 + py * q * 1.0 - (1 - e) * W * 0.9); if (fade * (e > 0.75 ? 0.55 : 1) < bay(Xq, Yq)) continue;
          dot(g, Xq, Yq, e > 0.85 ? DIRT[4] : e > 0.6 ? sk.pal[4] : ((i + Math.round(f.t * 60)) % 7 < 2 ? sk.pal[1] : sk.pal[3])); } }
      for (const r of f.rocks) { const u = ((r.u + f.t * r.sp * 1.6) % 1) * f.front; if (u < 6) continue; const x = o.x + o.ux * u + -o.uy * r.off * W * 0.5, y = o.gy + o.uy * u + o.ux * r.off * W * 0.25; if (fade < bay(SX(x, cx), SY(y, cy))) continue; peb(g, SX(x, cx), SY(y - r.z * W * 0.7 - 2, cy), sk, r.ang, r.sc * pw.size); }
      const hx = o.x + o.ux * f.front, hy = o.gy + o.uy * f.front; if (!f.end) { for (let i = 0; i < 3; i++) peb(g, SX(hx - o.ux * i * 3, cx), SY(hy - W * 0.5 - i * 2, cy), sk, f.t * 12 + i, 1.4 * pw.size, sk.shape === 'crystal' ? 'crystal' : 'boulder', i === 0); }
      for (const r of f.ring) { const k = r / 0.3; ringBand(g, hx, hy - W * 0.45, 4 + (10 + 8 * pw.p) * k, 2 * (1 - k), cx, cy, q => (q < 0.4 ? sk.glow[0] : sk.glow[1]), () => 1 - k * k, 0.8); }
      if (!f.end && f.t < grow + 0.08) { disc(g, SX(hx, cx), SY(hy - W * 0.45, cy), 8 + 4 * pw.p, sk.glow[1]); disc(g, SX(hx, cx), SY(hy - W * 0.45, cy), 5, sk.glow[0]); }
    } });
    if (V === 'b') { const step = 9, N = Math.floor(f.front / step); for (let i = 1; i <= N; i++) { const u = i * step, x = o.x + o.ux * u, y = o.gy + o.uy * u, born = (u / L) * grow, age = f.t - born; if (age < 0) continue;   /* HÀNG GAI NÚI: gai đá trồi lần lượt rồi vỡ */
      out.push({ y: y + 0.3, f: () => { const up = Math.min(1, age / 0.08), crum = f.end ? k2 : 0, Hh = (10 + 8 * pw.p + (i % 2) * 4) * up * (1 - crum * 0.8); if (Hh < 1) return; const X = SX(x, cx), Y = SY(y, cy), w = 5 + 2 * pw.p;
        for (let yy = 0; yy < Hh * 2; yy++) { const ww = Math.max(1, Math.round(w * (1 - yy / (Hh * 2)))); for (let xx = -ww; xx <= ww; xx++) { const px = X + xx, py = Y - yy; if (crum > 0 && crum > bay(px, py) * 1.4) continue; dot(g, px, py, xx < -ww / 2 ? sk.pal[1] : xx > ww / 2 ? sk.pal[5] : yy > Hh * 2 - 3 ? sk.glow[0] : sk.pal[3]); } } } }); }
      const hx = o.x + o.ux * f.front, hy = o.gy + o.uy * f.front; out.push({ y: hy + 0.7, f: () => { for (const r of f.ring) { const k = r / 0.3; ringBand(g, hx, hy - 8, 4 + 12 * k, 2 * (1 - k), cx, cy, q => (q < 0.4 ? sk.glow[0] : sk.glow[1]), () => 1 - k * k, 0.8); } } }); }
    if (V === 'c') { const tx = o.x + o.ux * Math.min(L, o.hitAt || L * 0.6), ty = o.gy + o.uy * Math.min(L, o.hitAt || L * 0.6), fall = 0.3, k = Math.min(1, f.t / fall);   /* ĐỈNH NÚI RƠI: tảng đá khổng lồ rơi đúng chỗ đối thủ + sóng đường thẳng */
      if (!f.boom && k >= 1) { f.boom = true; impact(tx, ty, 0, sk, pw, { n: 14, r: 6, big: 1.2, ring: true, ringR: 26, q: 1.4, s: 1.2 }); crack(tx, ty + 1, sk, 18, true, 8, 3.5); if (o.onFront) o.onFront(L, 0); }
      if (k < 1) out.push({ y: ty + 0.9, f: () => { const z = (1 - k * k) * 120; FS(g, 'rgba(20,12,10,.35)'); FR(g, Math.round(tx - cx) - 7 * k, Math.round(ty - cy), 14 * k, 2); peb(g, SX(tx, cx), SY(ty - z - 10, cy), sk, 0.3, 3.2 * pw.size, 'boulder', k > 0.8); } });
      if (f.boom) out.push({ y: kyC, f: () => { const kk = (f.t - fall) / 0.4; if (kk > 1) return; const u0 = 0, u1 = L * Math.min(1, kk * 1.2); const n = Math.ceil((u1 - u0) * 2); for (let i = 0; i <= n; i++) { const u = u0 + i / 2, X = SX(o.x + o.ux * u, cx), Y = SY(o.gy + o.uy * u, cy); for (let q = -2; q <= 2; q++) if ((1 - kk) * (1 - Math.abs(q) / 3) > bay(X, Y + q)) dot(g, X, Y + q - 2, Math.abs(q) < 1 ? sk.glow[1] : sk.pal[3]); } } }); }
  };
  return F;
}

/* ======================= 5. ĐỊA TỪ — sân trọng lực ======================= */
export function geoField(o) {   /* { x, y, R, T, sk, variant } → handle { kill() } */
  const V = o.variant || VAR.dia_tu, sk = o.sk; cnt('geofield_' + V); H.quake(0.12); flashAt(o.x, o.y, 2, sk, 5, 0.1, o.y + 0.7);
  for (let i = 0; i < 16; i++) { const a = i / 16 * TAU; part({ k: 'grain', x: o.x + Math.cos(a) * o.R, y: o.y + Math.sin(a) * o.R * 0.5, z: 4, vx: -Math.cos(a) * o.R * 2.4, vy: -Math.sin(a) * o.R * 1.2, vz: 0, g: 0, T: 0.4, cols: [sk.glow[1], sk.pal[2], sk.pal[4]], fade: false }); }   /* đường từ hội tụ */
  const F = addFx({ k: 'geofield', V, T: o.T });
  F.gd = (g, cx, cy, f) => { const fade = f.t > f.T - 1 ? f.T - f.t : 1, k0 = Math.min(1, f.t / 0.3), R = o.R * (V === 'c' && f.t < 0.35 ? 1.3 - 0.3 * (f.t / 0.35) : 1) * (V === 'c' ? 1 : k0), P = sk.pal;
    if (V === 'a') { oval(g, SX(o.x, cx), SY(o.y + 1, cy), R * 2, R, P[5], 0.2 * fade * k0); oval(g, SX(o.x, cx), SY(o.y + 1, cy), R * 1.2, R * 0.6, sk.glow[1], 0.1 * fade * k0); }   /* p78 mài bản a: nền vùng dither (đọc được vùng) + lõi từ trường nhạt — tĩnh */
    ringBand(g, o.x, o.y + 1, R, V === 'a' ? 2.5 : 1.5, cx, cy, q => (q < 0.5 ? DIRT[7] : P[4]), () => fade, 0.5);   /* vòng nứt (bản a dày hơn) */
    if (V === 'a') ringBand(g, o.x, o.y + 1, R * 0.6, 1, cx, cy, () => sk.glow[1], () => fade * 0.7, 0.5);   /* vòng từ trường trong */
    ringBand(g, o.x, o.y + 1, R - 3, 0.5, cx, cy, () => P[2], () => fade * 0.55, 0.5);
    const nT = V === 'b' ? 0 : 16; for (let i = 0; i < nT; i++) { const a = i / nT * TAU, X = SX(o.x + Math.cos(a) * R, cx), Y = SY(o.y + 1 + Math.sin(a) * R * 0.5, cy), ix = -Math.cos(a), iy = -Math.sin(a) * 0.5; for (let s = 0; s < 6; s++) { const px = Math.round(X + ix * s), py = Math.round(Y + iy * s); if (fade < bay(px, py)) continue; dot(g, px, py, s < 2 ? P[1] : DIRT[6]); } }   /* vạch từ hướng vào tâm */
    if (V === 'c' && f.t < 0.35) { const k = f.t / 0.35; ringBand(g, o.x, o.y + 1, o.R * (1.3 - 0.3 * k), 3, cx, cy, () => sk.glow[1], () => 1 - k, 0.5); } };
  if (V === 'b') F.dr = (out, g, cx, cy, f) => { const fade = f.t > f.T - 1 ? f.T - f.t : 1; for (let i = 0; i < 4; i++) { const a = i / 4 * TAU + Math.PI / 4, x = o.x + Math.cos(a) * o.R, y = o.y + Math.sin(a) * o.R * 0.5; out.push({ y: y + 0.2, f: () => { const up = Math.min(1, f.t / 0.2), X = SX(x, cx), Y = SY(y, cy), Hh = 12 * up; for (let yy = 0; yy < Hh; yy++) for (let xx = -3; xx <= 3; xx++) { if (fade < bay(X + xx, Y - yy)) continue; dot(g, X + xx, Y - yy, xx < -1 ? sk.pal[2] : xx > 1 ? sk.pal[6] : yy > Hh - 3 ? sk.glow[1] : sk.pal[4]); } } }); } };
  return { kill: () => { F.dead = true; }, alive: () => !F.dead && F.t < F.T };
}
export function pullDown(x, y, z, sk) {   /* kéo thú bay xuống: đá rơi ngược từ thân xuống + chớp nâu 1 khung */
  cnt('pull'); flashAt(x, y, Math.max(2, z), { pal: DIRT, glow: [DIRT[0], DIRT[1], DIRT[3]] }, 5, 0.06, y + 0.8);
  for (let i = 0; i < 8; i++) part({ k: 'peb', sk, x: x + (rnd() - 0.5) * 14, y, z: z + 6 + rnd() * 10, vx: (rnd() - 0.5) * 10, vz: -40, g: 600, bounce: 0.3, T: 0.6, sc: 0.5 + rnd() * 0.3, ang: rnd() * 6, spin: 8 });
}

/* ======================= Chung ======================= */
export function guard(o) {   /* THỦ THẾ: { get() → { x, y, h, fx, fy }, T, sk, variant } → handle { block(), end() } */
  const V = o.variant || VAR.thu_the, sk = o.sk; cnt('guard_' + V); const F = addFx({ k: 'guard', V, T: o.T + 0.05 });
  F.dr = (out, g, cx, cy, f) => { const p = o.get(); if (!p) return; const k = f.t / o.T, up = Math.min(1, f.t / 0.06), P = sk.pal; if (k >= 1) return;
    if (V === 'a') { const front = (p.fy || 0) > -0.3, ox = (p.fx || 1) * 9, oy = (p.fy || 0) * 3, X = SX(p.x + ox, cx), Y = SY(p.y - p.h * 0.5 + oy, cy);   /* khiên phiến lục giác 6 mảnh trước mặt */
      out.push({ y: p.y + (front ? 0.5 : -0.5), f: () => { const Hh = 16 * up, Wd = 6; for (let yy = -Hh; yy <= Hh; yy++) { const ww = Math.round(Wd * (1 - Math.abs(yy) / (Hh + 4) * 0.6)); for (let xx = -ww; xx <= ww; xx++) { const px = X + xx, py = Y + yy, tile = ((Math.floor((yy + 20) / 7) + (xx > 0 ? 1 : 0)) % 2); dot(g, px, py, Math.abs(xx) === ww || Math.abs(yy) >= Hh - 1 ? P[6] : (yy + 20) % 7 === 0 ? P[5] : tile ? P[2] : P[3]); } }
        if (f.t < 0.05) { seg(g, X - 6, Y - Hh, X + 6, Y + Hh, sk.glow[0]); } const sw = Math.round(((f.t * 3) % 1) * Hh * 2 - Hh); seg(g, X - 4, Y + sw, X + 4, Y + sw - 4, sk.glow[1]); } }); }
    else if (V === 'b') out.push({ y: p.y + 0.55, f: () => { const X = SX(p.x, cx), Y = SY(p.y, cy), R = (p.h * 0.7 + 4) * 2 * up; for (let i = 0; i < 26; i++) { const a = Math.PI + i / 25 * Math.PI, px = X + Math.round(Math.cos(a) * R * 0.85), py = Y + Math.round(Math.sin(a) * R) - 2; peb(g, px, py, sk, a, 0.55); } } });   /* vỏ đá úp quanh thân */
    else out.push({ y: p.y - 0.2, f: () => { const X = SX(p.x, cx), Y = SY(p.y, cy); for (const s of [-1, 1]) for (let i = 0; i < 3; i++) { const px = X + s * (8 + i * 4), Hh = (6 - i) * up; for (let yy = 0; yy < Hh; yy++) dot(g, px, Y - yy, yy > Hh - 2 ? sk.glow[1] : sk.pal[3 + (i % 2)]); } } });   /* thế tấn: gai chống ở 2 bên chân */
  };
  F.gd = (g, cx, cy, f) => { const p = o.get(); if (!p || f.t > o.T) return; const k = Math.min(1, f.t / 0.12); ringBand(g, p.x, p.y + 1, 6 + 8 * k, V === 'c' ? 2 : 1, cx, cy, () => sk.pal[1], () => 1 - k * 0.6, 0.5); };
  H.stop(0.03); flashAt(o.get().x, o.get().y, o.get().h * 0.5, sk, 4, 0.06, o.get().y + 0.8);
  return { end: () => { F.dead = true; }, block: (ax, ay) => { cnt('guard_block'); const p = o.get(); if (!p) return; F.dead = true; const bx = p.x + (p.fx || 1) * 8, bz = p.h * 0.5; flashAt(bx, p.y, bz, sk, 6, 0.1, p.y + 0.9, true); chips(bx, p.y, bz, sk, 10, 80, 50, 0.6, 0.7, p.y + 0.9); sparks(bx, p.y, bz, [sk.glow[0], sk.glow[1], sk.pal[2]], 10, 90, 30, 0.3, p.y + 0.9); H.stop(0.06); H.quake(0.1); } };
}
export function endure(o) {   /* GỒNG CHỊU: { get(), T, sk, variant } — vân đá bò trên thân (0,35 s) + biểu tượng nắm đấm TĨNH trên đầu suốt 2 s */
  const V = o.variant || VAR.gong_chiu, sk = o.sk; cnt('endure_' + V); H.stop(0.04); H.quake(0.06);
  const F = addFx({ k: 'endure', V, T: o.T, veins: Array.from({ length: 7 }, () => ({ x: (rnd() - 0.5) * 12, a: -Math.PI / 2 + (rnd() - 0.5) * 0.9, L: 6 + rnd() * 8, s: (rnd() * 1e5) | 1 })) });
  F.dr = (out, g, cx, cy, f) => { const p = o.get(); if (!p) return; const P = sk.pal;
    if (f.t < 0.4) out.push({ y: p.y + 0.6, f: () => { const k = f.t / 0.4, X = SX(p.x, cx), Y = SY(p.y, cy);
      if (V === 'c') { for (let i = 0; i < 10; i++) { const xx = X + Math.round((i - 4.5) * 2.6), Hh = (8 + (i % 3) * 5) * 2 * Math.min(1, k * 3) * (1 - k * 0.5); for (let yy = 0; yy < Hh; yy++) if ((1 - k) > bay(xx, Y - yy)) dot(g, xx, Y - yy, yy > Hh - 4 ? sk.glow[0] : sk.glow[2]); } return; }
      for (const v of f.veins) { let x = X + v.x * 2, y = Y, a = v.a, s = v.s; const n = Math.round(v.L * 2 * Math.min(1, k * 2.2)); for (let i = 0; i < n; i++) { s = (s * 16807) % 2147483647; a += ((s / 2147483647) - 0.5) * 0.8; x += Math.cos(a); y += Math.sin(a); dot(g, Math.round(x), Math.round(y), V === 'b' ? P[6] : (k < 0.7 ? sk.glow[1] : P[2])); if (V === 'b') dot(g, Math.round(x) + 1, Math.round(y), P[3]); } } } });
    if (!f.used) out.push({ y: p.y + 0.9, f: () => { const X = Math.round(p.x - cx), Y = Math.round(p.y - p.h - cy) - 9, M = ['.0110.', '011110', '111111', '111111', '.1111.', '..11..'], col = ['', P[2]];   /* biểu tượng tĩnh: khiên nắm đấm */
      FS(g, '#140e1a'); FR(g, X - 4, Y - 1, 8, 8); for (let r = 0; r < 6; r++) for (let c = 0; c < 6; c++) if (M[r][c] === '1') { FS(g, r < 2 ? sk.glow[1] : col[1]); FR(g, X - 3 + c, Y + r, 1, 1); } } });
  };
  return { save: () => { cnt('endure_save'); const p = o.get(); F.used = true; F.dead = true; if (!p) return; H.stop(0.09); H.quake(0.22); H.flash(0.08); flashAt(p.x, p.y, p.h * 0.5, sk, 9, 0.14, p.y + 0.9, true); chips(p.x, p.y, p.h * 0.5, sk, 14, 90, 80, 0.8, 0.8, p.y + 0.9); shockRing(p.x, p.y + 1, 26, sk, 0.35); }, end: () => { F.dead = true; } };
}
export function nap(o) {   /* NGỦ BÙ: { get(), T, sk, variant } — chữ Z bay lên (theo sự kiện, tắt khi hết ngủ) + hạt hồi lên */
  const V = o.variant || VAR.ngu_bu, sk = o.sk; cnt('nap_' + V); const p0 = o.get();
  for (let i = 0; i < (V === 'c' ? 26 : 18); i++) { const a = rnd() * TAU, R = V === 'c' ? 22 : 8; part({ k: 'grain', x: p0.x + Math.cos(a) * R, y: p0.y + Math.sin(a) * R * 0.45, z: rnd() * 6, vx: V === 'c' ? -Math.cos(a) * 30 : 0, vy: V === 'c' ? -Math.sin(a) * 12 : 0, vz: 18 + rnd() * 26, g: -8, drag: 1, T: 0.9 + rnd() * 0.4, cols: ['#e8ffe0', '#a8f0a0', sk.pal[1], sk.pal[2]], ky: p0.y + (Math.sin(a) > 0 ? 0.6 : -0.6) }); }
  const F = addFx({ k: 'nap', V, T: o.T, zn: 0 });
  F.upd = (dt, f) => { const p = o.get(); if (!p) { f.dead = true; return; } if (f.t >= f.zn * 0.75 && f.zn < 3) { part({ k: 'zz', x: p.x + 4 + f.zn * 2, y: p.y, z: p.h + 2, vx: 6, vz: 9, g: 0, T: 1.2, sc: f.zn === 2 ? 1.5 : 1, cols: ['#e8eaff', '#b8c0ff', '#8890e0'], ky: p.y + 0.95 }); f.zn++; } };
  if (V === 'b') F.gd = (g, cx, cy, f) => { const p = o.get(); if (!p) return; const fade = f.t > f.T - 0.4 ? (f.T - f.t) / 0.4 : 1; oval(g, SX(p.x, cx), SY(p.y + 1, cy), 16, 5, sk.pal[3], fade); oval(g, SX(p.x, cx), SY(p.y, cy), 12, 3.5, sk.pal[1], fade); };
  return { end: () => { F.dead = true; } };
}
export function roll(o) {   /* LĂN XẢ: { get() → {x,y,h,vx,vy}, T, sk, variant } — bụi + vệt tốc độ + đá văng sau lưng */
  const V = o.variant || VAR.lan_xa, sk = o.sk; cnt('roll_' + V); const F = addFx({ k: 'roll', V, T: o.T, tr: [] });
  F.upd = (dt, f) => { const p = o.get(); if (!p) return; f.tr.unshift({ x: p.x, y: p.y }); if (f.tr.length > 10) f.tr.pop();
    if ((f.e = (f.e || 0) - dt) <= 0) { f.e = 0.035; const v = Math.hypot(p.vx, p.vy) || 1, ux = p.vx / v, uy = p.vy / v; if (V === 'b') part({ x: p.x - ux * 6, y: p.y, z: 2 + rnd() * 4, vx: -ux * 40 + (rnd() - 0.5) * 30, vy: (rnd() - 0.5) * 10, vz: 20 + rnd() * 30, g: 200, T: 0.3, cols: [sk.glow[0], sk.glow[1], sk.glow[2]] });
      else puff(p.x - ux * 6, p.y, [DIRT[1], DIRT[2], DIRT[3]], 1, 2, 0.45, p.y - 0.2, 4); if (V === 'c' || rnd() < 0.4) part({ k: 'peb', sk, x: p.x - ux * 5, y: p.y, z: 1, vx: -ux * 50 + (rnd() - 0.5) * 30, vy: (rnd() - 0.5) * 14, vz: 40 + rnd() * 40, g: 330, bounce: 0.3, T: 0.55, sc: 0.5, spin: 12 }); } };
  F.dr = (out, g, cx, cy, f) => { const p = o.get(); if (!p || f.tr.length < 3) return; out.push({ y: p.y - 0.4, f: () => { for (let i = 2; i < f.tr.length; i++) { const q = f.tr[i], a = 1 - i / f.tr.length, X = SX(q.x, cx), Y = SY(q.y - p.h * 0.5, cy); for (const dy of [-6, -1, 4]) if (a > bay(X, Y + dy)) { dot(g, X, Y + dy, i < 4 ? sk.glow[1] : sk.pal[2]); dot(g, X + 1, Y + dy, sk.pal[3]); } } } }); };
  return { end: () => { F.dead = true; } };
}
export function heal(x, y, h, sk, n = 14) { cnt('heal'); for (let i = 0; i < n; i++) { const a = rnd() * TAU; part({ k: 'grain', x: x + Math.cos(a) * 9, y: y + Math.sin(a) * 4, z: rnd() * h, vz: 20 + rnd() * 24, g: -6, drag: 1, T: 0.8 + rnd() * 0.4, cols: ['#ffffff', '#b8f8b0', sk.pal[1], '#6ad86a'], ky: y + (Math.sin(a) > 0 ? 0.6 : -0.6) }); } }

/* ======================= Rocky: VÒNG DƯ CHẤN (nét đá thô + vân cam) ======================= */
/* quakeRing({ x, y, sk, pw, delay 1.2, R 90, T 0.6, onR(r) }) — tâm chấn nứt sao → vành đất nở; onR(r) gọi mỗi khung để bên gọi tính trúng */
export function quakeRing(o) {
  const sk = o.sk, pw = o.pw, D = o.delay ?? 1.2, R = o.R || 90, T = o.T || 0.6; cnt('quakering'); crack(o.x, o.y + 1, sk, 9, false, 7, D + T + 0.8);
  const F = addFx({ k: 'quakering', T: D + T + 0.3, r: 0 });
  F.upd = (dt, f) => { if (f.t < D) { if (f.t > D - 0.25 && !f.pre) { f.pre = 1; puff(o.x, o.y, [DIRT[1], DIRT[2], DIRT[3]], 3, 1.6, 0.3); } return; } const k = Math.min(1, (f.t - D) / T); f.r = R * k;
    if (!f.go) { f.go = 1; H.quake(pw.shake); H.stop(pw.stop * 0.6); flashAt(o.x, o.y, 2, sk, 6, 0.1, o.y + 0.7); crack(o.x, o.y + 1, sk, 14, true, 7, 2.6); }
    if (k < 1) { for (let i = 0; i < Math.round(3 * pw.n); i++) { const an = rnd() * TAU; part({ k: 'peb', sk, x: o.x + Math.cos(an) * f.r, y: o.y + Math.sin(an) * f.r * 0.5, z: 0, vx: Math.cos(an) * 30, vy: Math.sin(an) * 15, vz: 40 + rnd() * 60, g: 320, bounce: 0.25, T: 0.45, sc: 0.5 * pw.size, ang: rnd() * 6, spin: 14 }); } if (o.onR) o.onR(f.r); } };
  F.gd = (g, cx, cy, f) => { if (f.t < D) { const hot = f.t > D - 0.25; disc(g, SX(o.x, cx), SY(o.y + 1, cy), 3.5, DIRT[7]); disc(g, SX(o.x, cx), SY(o.y + 1, cy), hot ? 2.4 : 1.6, hot ? sk.glow[1] : DIRT[5]); return; }
    const k = Math.min(1, (f.t - D) / T), fade = 1 - Math.max(0, (f.t - D - T * 0.75) / (T * 0.5)); if (fade <= 0) return;
    ringBand(g, o.x, o.y, f.r, 10 * (0.6 + 0.4 * (1 - k * 0.4)), cx, cy, q => (q < 0.08 ? sk.glow[0] : q < 0.2 ? sk.glow[1] : q < 0.5 ? sk.pal[2] : sk.pal[4]), q => (q < 0.2 ? 1 : 0.95 * Math.pow(1 - q, 0.7)) * fade, 0.55);
    ringBand(g, o.x, o.y + 1, f.r + 1, 1, cx, cy, () => sk.pal[6], () => fade, 0.55); };
  return F;
}

/* ======================= SAIYAN A: THỨC TỈNH (tiến hoá con mạnh · Rocky Siêu Cấp) ======================= */
/* awaken({ get() → { x, y, h }, sk, p (0..1), name, T, real }) — tối cả cảnh còn vòng sáng quanh thú · sét giáng · hào quang lửa · chớp vàng/trắng 1 khung ·
   tên dạng mới · nứt đất · đá bay lên · cột sáng. Độ lực theo p: p < 0,2 → không gọi (bên gọi dùng cảnh v1). Trả handle { burst(), F }. */
export function awaken(o) {
  const sk = o.sk, p = clamp(o.p ?? 0.5, 0, 1), T = o.T || 2.4, tB = o.tBurst ?? T * 0.42; cnt('awaken'); const dark = 0.38 + 0.3 * p, bolts = 1 + Math.round(2 * p);
  const F = addFx({ k: 'awaken', T, p, bolts: [], deb: [], burst: false, real: !!o.real });
  const boltAt = (x, y, h) => { const pts = [], top = y - h - 120; let px = x + (rnd() - 0.5) * 30; for (let yy = top; yy < y - h * 0.3; yy += 6) { px += (rnd() - 0.5) * 10; pts.push([px, yy]); } pts.push([x, y - h * 0.3]); F.bolts.push({ pts, t: 0, T: 0.16 }); H.quake(0.08 + 0.1 * p); };
  F.upd = (dt, f) => { const P0 = o.get(); if (!P0) { f.dead = true; return; } for (const b of f.bolts) b.t += dt; f.bolts = f.bolts.filter(b => b.t < b.T);
    if (!f.burst) { if (f.t > 0.12 && (f.nb = (f.nb || 0) - dt) <= 0) { f.nb = tB / bolts; boltAt(P0.x, P0.y, P0.h); }
      if ((f.dd = (f.dd || 0) - dt) <= 0) { f.dd = 0.07 / (0.6 + p); const a = rnd() * TAU, R = 12 + rnd() * 26; f.deb.push({ x: P0.x + Math.cos(a) * R, y: P0.y + Math.sin(a) * R * 0.45, z: 0, vz: 14 + rnd() * 20, sc: 0.5 + rnd() * 0.6 * (0.6 + p), ang: rnd() * 6 }); }
      for (let n = (40 + 80 * p) * dt * Math.min(1, f.t / tB + 0.3); n > 0; n--) { if (rnd() > n) break; const a = rnd() * TAU, ex = Math.cos(a) * (8 + 6 * p); part({ k: 'spike', x: P0.x + ex, y: P0.y + Math.sin(a) * 2, z: rnd() * P0.h * 0.7, vx: ex * 0.5, vz: 70 + rnd() * 50, g: 0, drag: 2, T: 0.25 + rnd() * 0.15, L: 6 + 8 * p, w: rnd() < 0.4 ? 3 : 2, ph: rnd() * 6, cols: ['#ffffff', '#ffe27a', sk.glow[2]], ky: P0.y + (Math.sin(a) > 0 ? 0.62 : -0.62) }); }
      if (f.t >= tB) burst(); }
    for (const d of f.deb) { if (!f.burst) { d.z += d.vz * dt; d.vz *= 0.985; d.ang += dt * 2; } else { d.z += d.vz * dt; d.vz -= 300 * dt; d.x += d.vx * dt; d.y += d.vy * dt; d.ang += dt * 12; } } f.deb = f.deb.filter(d => d.z > -1 && d.z < 160); };
  const burst = () => { if (F.burst) return; F.burst = true; F.tb = F.t; const P0 = o.get(); cnt('awaken_burst'); H.stop(0.07 + 0.1 * p); H.quake(0.25 + 0.35 * p); H.flash(0.1); if (H.zoom) H.zoom(0.06 + 0.2 * p, P0.x, P0.y - P0.h * 0.5);
    boltAt(P0.x, P0.y, P0.h); boltAt(P0.x - 14, P0.y, P0.h * 0.6); crack(P0.x, P0.y + 1, sk, 16 + 14 * p, true, 7 + Math.round(4 * p), 4); shockRing(P0.x, P0.y + 1, 30 + 40 * p, sk, 0.45, 4);
    for (const d of F.deb) { const a = Math.atan2(d.y - P0.y, d.x - P0.x); d.vx = Math.cos(a) * (80 + rnd() * 80); d.vy = Math.sin(a) * 40; d.vz = 60 + rnd() * 60; }
    chips(P0.x, P0.y, 4, sk, Math.round(10 + 20 * p), 110, 120, 1.0, 1.0); };
  F.top = (g, cx, cy, VW, VH, f) => { const P0 = o.get(); if (!P0) return; const k = f.t / f.T, X = Math.round(P0.x - cx), Y = Math.round(P0.y - P0.h * 0.45 - cy);
    const din = Math.min(1, f.t / 0.25) * (k > 0.8 ? (1 - k) / 0.2 : 1), R0 = 26 + 10 * p + (f.burst ? 12 : 0);   /* tối cảnh: vành sáng bậc thang quanh thú (không mờ mịn) */
    enter(); g.save(); for (const [rr, a] of [[R0 * 1.9, dark * 0.45], [R0 * 1.35, dark * 0.3], [R0, dark * 0.25]]) { FS(g, `rgba(6,4,14,${(a * din).toFixed(3)})`); g.beginPath(); g.rect(-20, -20, VW + 40, VH + 40); g.ellipse(X, Y, rr, rr * 0.75, 0, 0, TAU, true); g.fill('evenodd'); } g.restore(); LG = null;
    for (const b of f.bolts) { const kb = b.t / b.T; for (let i = 1; i < b.pts.length; i++) { const [x0, y0] = b.pts[i - 1], [x1, y1] = b.pts[i]; seg(g, SX(x0, cx), SY(y0, cy), SX(x1, cx), SY(y1, cy), '#7a5cff', 1, 4); seg(g, SX(x0, cx), SY(y0, cy), SX(x1, cx), SY(y1, cy), kb < 0.5 ? '#ffffff' : '#ffe27a', 1, 2); } }
    if (f.burst) { const kb = (f.t - f.tb) / 0.9; if (kb < 1) { const W = (8 + 10 * p) * (1 - kb * 0.7), Xp = SX(P0.x, cx), Yb = SY(P0.y, cy); for (let yy = Yb; yy > -40; yy -= 1) for (let xx = -W; xx <= W; xx++) { const e = Math.abs(xx) / W; if ((1 - kb) * (1 - e * 0.7) < bay(Xp + xx, yy)) continue; dot(g, Xp + xx, yy, e < 0.3 ? '#ffffff' : e < 0.65 ? '#fff1a8' : sk.glow[2]); } }   /* cột sáng */
      const kf = f.t - f.tb; if (kf < 0.05) { FS(g, p > 0.5 ? 'rgba(255,214,90,.55)' : 'rgba(255,255,255,.5)'); FR(g, -20, -20, VW + 40, VH + 40); }   /* chớp vàng / trắng 1 khung */
      if (o.name && kf > 0.15 && kf < 1.55) { const a = kf > 1.25 ? 1 - (kf - 1.25) / 0.3 : 1, sc = textW(o.name) * 2 > VW - 20 ? 1 : 2; pixText(g, o.name, P0.x, P0.y - P0.h - 18, '#ffe27a', cx, cy, sc, '#140e1a', a); } }
    for (const d of f.deb) peb(g, SX(d.x, cx), SY(d.y - d.z, cy), sk, d.ang, d.sc); };
  return { burst, F };
}
