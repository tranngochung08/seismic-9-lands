/* village88.js — plan-88 đợt 1 (02/11/2026): BỐ CỤC LÀNG MỚI kiểu Saiyan Online (anh: 'map đơn giản, không rối'; 'map rộng càng tốt'; BỎ HẲN MUA ĐẤT).
   Module THUẦN (không canvas) → world.js dựng bản đồ từ kết quả; node cũng nạp được để in lưới ký tự (_wip/p88/_gen/ascii88.mjs → plan-88).
   Cỡ 160 × 128 ô (gấp đôi mỗi chiều bản cũ 80 × 64). Người đi 84 px/s → lối Nam → quảng trường ≈ 60 ô đường uốn ≈ 12 s.
   Ký tự ô: '.' cỏ · ',' cỏ đậm · ':' hoa · '=' đường đất · '#' đá quảng trường · '~' nước (cứng) · 'b' cầu (đi được) · 'T' rừng (cứng, có cây)
            'C' vách đá (cứng, ảnh vách) · 'S' bậc thang (đi được) · '^' cao nguyên (cỏ tầng trên).
   Vật: { t: loại, x, y, ...thêm }. Mọi toạ độ là ô. */
export const VW = 160, VH = 128, VCX = 80, ER = 70;   /* ER: hàng lối Tây (Đấu Trường Leader) / Đông (Sàn Đấu Ngầm) = ER..ER+1 */
export const PLAZA = { x: 80, y: 62, rx: 10, ry: 8 };
export const CLIFF = { y: 44, x0: 4, x1: 61, stairs: 30, ridge: [58, 65] };   /* mặt vách hàng 44–45; cao nguyên ở trên (y < 44), x ≤ 61; bậc thang cột 30–31; sống rừng 58–65 che mép Đông cao nguyên */
export const CAMPS = [
  { k: 'chuichui', x: 22, y: 22, rx: 6, ry: 5, name: { vi: 'Trại Chũi', en: 'Mole Camp' } },   /* trên cao nguyên, lên bằng bậc thang */
  { k: 'coc', x: 146, y: 42, rx: 6, ry: 5, name: { vi: 'Trại Cóc', en: 'Toad Camp' } },          /* bờ Đông ao, qua cầu suối */
];
function rngOf(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function noise2(seed) {   /* nhiễu giá trị mượt (lưới 8 ô) → mảng cỏ đậm / mép rừng tự nhiên, không lốm đốm theo từng ô */
  const h = (x, y) => { let n = (x * 374761393 + y * 668265263 + seed * 2246822519) | 0; n = Math.imul(n ^ (n >>> 13), 1274126177); return ((n ^ (n >>> 16)) >>> 0) / 4294967296; };
  const sm = t => t * t * (3 - 2 * t);
  return (x, y, s = 8) => { const fx = x / s, fy = y / s, ix = Math.floor(fx), iy = Math.floor(fy), tx = sm(fx - ix), ty = sm(fy - iy);
    const a = h(ix, iy), b = h(ix + 1, iy), c = h(ix, iy + 1), d = h(ix + 1, iy + 1); return a + (b - a) * tx + (c - a) * ty + (a - b - c + d) * tx * ty; };
}
function catmull(pts, step = 0.25) {   /* đường cong qua các điểm (đường mòn / suối uốn) */
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)], L = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]), n = Math.max(2, Math.ceil(L / step));
    for (let k = 0; k < n; k++) { const t = k / n, t2 = t * t, t3 = t2 * t;
      out.push([0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
        0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3)]); }
  }
  out.push(pts[pts.length - 1]); return out;
}
export const PATHS = {   /* [điểm…], bề rộng (ô) */
  south: [[[80, 127], [80, 118], [75, 108], [72, 96], [76, 84], [80, 71]], 3],
  north: [[[84, 54], [86, 44], [91, 33], [87, 21], [81, 11], [80, 0]], 3],
  west: [[[70, 64], [58, 67], [45, 72], [30, 70], [15, 71], [0, 71]], 2],
  east: [[[90, 64], [102, 67], [117, 71], [131, 70], [146, 71], [159, 71]], 2],
  cliff: [[[33, 70], [33, 60], [31, 52], [31, 46]], 2],               /* rẽ từ lối Tây lên chân bậc thang */
  plateau: [[[31, 43], [29, 36], [25, 29], [23, 26]], 2],             /* trên cao nguyên → Trại Chũi */
  coc: [[[141, 70], [143, 60], [145, 50], [146, 46]], 2],             /* rẽ từ lối Đông lên Trại Cóc */
};
export const STREAM = [[123, 0], [122, 10], [117, 22], [121, 33], [127, 41], 'pond', [126, 55], [120, 65], [117, 71], [114, 82], [116, 96], [110, 110], [108, 127]];
export const POND = { x: 131, y: 47, rx: 7, ry: 5 };
/* p89 vòng 4: vách cao chỉ khi chơi bản sty89=d (tắt bằng &cliff89=0); node (in lưới) → thấp như cũ */
const TALL89V = (() => { try { const q = new URLSearchParams(location.search); return (q.get('sty89') ?? 'd') === 'd' && q.get('cliff89') !== '0'; } catch (e) { return false; } })(), TALL89 = () => TALL89V;   /* đọc URL lúc nạp module: preset &reset viết lại URL (mất sty89) trước khi dựng bản đồ */
export function layout88(seed = 88) {
  const W = VW, H = VH, g = new Array(W * H).fill('.'), objs = [], R = rngOf(seed), N = noise2(seed), N2 = noise2(seed + 7);
  const at = (x, y) => (x >= 0 && y >= 0 && x < W && y < H ? g[y * W + x] : 'X'), set = (x, y, c) => { if (x >= 0 && y >= 0 && x < W && y < H) g[y * W + x] = c; };
  const isOpen = c => c === '.' || c === ',' || c === ':' || c === '^';
  /* 1. cỏ đậm theo mảng lớn + cao nguyên */
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (N(x, y, 5) * 0.7 + N2(x, y, 2) * 0.3 > 0.7) set(x, y, ',');   /* mảng cỏ đậm nhỏ, mép lượn (bản đầu mảng to vuông vức — em tự chê) */
  for (let y = 0; y < CLIFF.y; y++) for (let x = 0; x <= CLIFF.x1; x++) set(x, y, N(x, y, 5) * 0.7 + N2(x, y, 2) * 0.3 > 0.7 ? ',' : '^');
  /* 2. rừng viền: dày 5–9 ô, mép trong lượn theo nhiễu */
  const depth = (u, side) => 5 + Math.round(N2(u, side * 40, 6) * 4);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const d = Math.min(x < depth(y, 1) ? 0 : 99, W - 1 - x < depth(y, 2) ? 0 : 99, y < depth(x, 3) ? 0 : 99, H - 1 - y < depth(x, 4) ? 0 : 99);
    if (d === 0) set(x, y, 'T');
  }
  /* lùm rừng trong map (không rải đều: vài khối dày) */
  const grove = (cx, cy, rx, ry) => { for (let y = cy - ry - 2; y <= cy + ry + 2; y++) for (let x = cx - rx - 2; x <= cx + rx + 2; x++) { const e = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 - (N(x, y, 3) - 0.5) * 0.7; if (e <= 1) set(x, y, 'T'); } };
  grove(42, 98, 7, 5); grove(132, 106, 8, 6); grove(103, 24, 5, 4); grove(52, 116, 6, 3); grove(150, 92, 4, 6); grove(12, 92, 4, 7); grove(68, 34, 4, 3); grove(138, 86, 5, 4); grove(150, 14, 4, 4); grove(96, 112, 4, 3);   /* rừng xếp khối chia luồng (research-saiyan-video §2) */
  /* sống rừng che mép Đông cao nguyên */
  for (let y = 0; y < CLIFF.y + 2; y++) for (let x = CLIFF.ridge[0]; x <= CLIFF.ridge[1]; x++) { const w0 = CLIFF.ridge[0] + 2 + Math.round((N(x, y, 4) - 0.5) * 3); if (x >= w0 - 2) set(x, y, 'T'); }
  /* 3. vách đá 2 tầng + bậc thang */
  for (let x = CLIFF.x0; x <= CLIFF.x1 + 1; x++) for (let y = CLIFF.y; y <= CLIFF.y + 1; y++) set(x, y, x === CLIFF.stairs || x === CLIFF.stairs + 1 ? 'S' : 'C');
  if (TALL89()) { CLIFF.tall = 1; for (let x = CLIFF.x0; x <= CLIFF.x1 + 1; x++) set(x, CLIFF.y - 1, x === CLIFF.stairs || x === CLIFF.stairs + 1 ? 'S' : 'C'); }   /* p89 vòng 4 (sty89=d): vách CAO 3 hàng ô (43–45) — ảnh vách / bậc cao hơn ở sty/d; hàng 43 thành vách cứng, bậc thang kéo dài */
  for (let x = CLIFF.x0; x <= CLIFF.x1; x++) if (at(x, CLIFF.y + 2) !== 'T') set(x, CLIFF.y + 2, ',');   /* dải cỏ đậm = bóng chân vách */
  const clearing = (cx, cy, rx, ry) => { for (let y = cy - ry; y <= cy + ry; y++) for (let x = cx - rx; x <= cx + rx; x++) { const e = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 - (N2(x, y, 2) - 0.5) * 0.6; if (e <= 1 && isOpen(at(x, y))) set(x, y, '='); } };
  clearing(42, 84, 5, 3); clearing(128, 96, 4, 3); clearing(46, 28, 5, 3); clearing(100, 48, 3, 2);   /* bãi đất trống (như video: đất nện cạnh đường) */
  /* 4. suối + ao */
  const pts = []; let seg = [];
  for (const p of STREAM) { if (p === 'pond') { pts.push(seg); seg = []; continue; } seg.push(p); } pts.push(seg);
  const stamp = (x, y, r, c, keep) => { for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) if (i * i + j * j <= r * r + r) { const X = Math.round(x) + i, Y = Math.round(y) + j; if (!keep || !keep(at(X, Y))) set(X, Y, c); } };
  for (const s of pts) for (const [x, y] of catmull(s)) stamp(x, y, 1, '~');
  for (let y = POND.y - POND.ry - 1; y <= POND.y + POND.ry + 1; y++) for (let x = POND.x - POND.rx - 1; x <= POND.x + POND.rx + 1; x++) if (((x - POND.x) / POND.rx) ** 2 + ((y - POND.y) / POND.ry) ** 2 - (N(x, y, 3) - 0.5) * 0.5 <= 1) set(x, y, '~');
  /* 5. quảng trường đá */
  for (let y = PLAZA.y - PLAZA.ry - 1; y <= PLAZA.y + PLAZA.ry + 1; y++) for (let x = PLAZA.x - PLAZA.rx - 1; x <= PLAZA.x + PLAZA.rx + 1; x++) if (((x - PLAZA.x) / PLAZA.rx) ** 2 + ((y - PLAZA.y) / PLAZA.ry) ** 2 - (N2(x, y, 3) - 0.5) * 0.35 <= 1) set(x, y, '#');
  /* 6. đường mòn (đè rừng / cỏ; qua suối = cầu; không đè vách / bậc / quảng trường) */
  const roads = new Uint8Array(W * H);
  for (const [k, [P, w]] of Object.entries(PATHS)) for (const [x, y] of catmull(P)) {
    const a = w === 3 ? -1 : 0;   /* bề rộng 3: -1..1 · bề rộng 2: 0..1 */
    for (let j = a; j < 2; j++) for (let i = a; i < 2; i++) {
      const X = Math.round(x) + i, Y = Math.round(y) + j, c = at(X, Y); if (c === 'X' || c === 'C' || c === 'S' || c === '#') continue;
      set(X, Y, c === '~' || c === 'b' ? 'b' : '='); roads[Y * W + X] = 1;
    }
  }
  /* lối ra mép: đường thẳng tới mép (N, S: cột 79–81; W, E: hàng ER–ER+1) */
  for (let y = 0; y < 12; y++) for (let x = VCX - 1; x <= VCX + 1; x++) { set(x, y, '='); roads[y * W + x] = 1; }
  for (let y = H - 12; y < H; y++) for (let x = VCX - 1; x <= VCX + 1; x++) { set(x, y, '='); roads[y * W + x] = 1; }
  for (let x = 0; x < 12; x++) for (let y = ER; y <= ER + 1; y++) { set(x, y, '='); roads[y * W + x] = 1; }
  for (let x = W - 12; x < W; x++) for (let y = ER; y <= ER + 1; y++) { set(x, y, '='); roads[y * W + x] = 1; }
  /* 7. trại thú hoang: bãi đất nện + mốc (lửa trại, lều, khúc gỗ, xương, gốc cây, đá) */
  for (const c of CAMPS) for (let y = c.y - c.ry; y <= c.y + c.ry; y++) for (let x = c.x - c.rx; x <= c.x + c.rx; x++) { const e = ((x - c.x) / c.rx) ** 2 + ((y - c.y) / c.ry) ** 2; if (e <= 1 && at(x, y) !== 'T' && at(x, y) !== '~') set(x, y, e < 0.45 && N(x, y, 2) > 0.35 ? '=' : at(x, y) === '=' ? '=' : (at(x, y) === '^' ? '^' : '.')); }
  const C1 = CAMPS[0], C2 = CAMPS[1];
  objs.push({ t: 'campfire', x: C1.x, y: C1.y, camp: 0 }, { t: 'tent88', x: C1.x - 4, y: C1.y - 3 }, { t: 'log88', x: C1.x + 1, y: C1.y + 2 }, { t: 'log88', x: C1.x - 3, y: C1.y + 1 },
    { t: 'bones88', x: C1.x + 3, y: C1.y - 1, flat: true }, { t: 'bones88', x: C1.x - 2, y: C1.y + 3, flat: true }, { t: 'rock88', x: C1.x + 4, y: C1.y + 3 }, { t: 'rocks88', x: C1.x + 5, y: C1.y + 2 }, { t: 'stump', x: C1.x + 3, y: C1.y - 4 });
  objs.push({ t: 'campfire', x: C2.x, y: C2.y, camp: 1 }, { t: 'tent88', x: C2.x + 2, y: C2.y - 4 }, { t: 'log88', x: C2.x - 3, y: C2.y + 1 }, { t: 'log88', x: C2.x + 1, y: C2.y + 2 },
    { t: 'bones88', x: C2.x - 4, y: C2.y - 2, flat: true }, { t: 'bones88', x: C2.x + 4, y: C2.y + 1, flat: true }, { t: 'stump', x: C2.x - 5, y: C2.y + 2 }, { t: 'rocks88', x: C2.x + 5, y: C2.y - 1 });
  /* 8. quảng trường: bệ Chấn Thú (monument), giếng, giường, thùng, đèn 4 góc, biển chỉ đường */
  objs.push({ t: 'monument', x: 78, y: 55, hall: true }, { t: 'well', x: 87, y: 58 }, { t: 'bed', x: 72, y: 59, bed: true },
    { t: 'crate', x: 71, y: 64 }, { t: 'crate', x: 72, y: 65 }, { t: 'crate', x: 71, y: 65 },
    { t: 'lantern', x: 72, y: 55 }, { t: 'lantern', x: 89, y: 55 }, { t: 'lantern', x: 71, y: 68 }, { t: 'lantern', x: 89, y: 68 },
    { t: 'lantern', x: 77, y: 80 }, { t: 'lantern', x: 83, y: 80 }, { t: 'lantern', x: 119, y: 68 });
  /* 9. trang trí gom cụm (mép khu, chừa giữa khu trống) */
  const cluster = (cx, cy, list, rad = 2) => { for (const t of list) for (let k = 0; k < 14; k++) { const x = cx + Math.round((R() - 0.5) * rad * 2), y = cy + Math.round((R() - 0.5) * rad * 2); if (!isOpen(at(x, y)) || objs.some(o => Math.abs(o.x - x) <= (o.t === 'tree' ? 1 : 0) && Math.abs(o.y - y) <= 0)) continue; objs.push({ t, x, y }); break; } };
  const flowers = (cx, cy, rx, ry) => { for (let y = cy - ry; y <= cy + ry; y++) for (let x = cx - rx; x <= cx + rx; x++) if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1 && N(x, y, 2) > 0.45 && isOpen(at(x, y))) set(x, y, ':'); };
  flowers(66, 76, 4, 3); flowers(95, 52, 4, 3); flowers(62, 90, 3, 2); flowers(100, 84, 4, 2); flowers(40, 22, 4, 3); flowers(138, 30, 3, 2); flowers(90, 104, 3, 2);
  cluster(97, 57, ['bush', 'bush', 'bush'], 2); cluster(63, 57, ['bush', 'bush'], 2); cluster(60, 86, ['bush', 'bush', 'stump'], 2); cluster(98, 92, ['bush', 'bush', 'rocks88'], 2);
  cluster(16, 50, ['rock88', 'rocks88', 'rocks88'], 2); cluster(48, 49, ['rock88', 'rocks88'], 2); cluster(12, 35, ['rock88', 'bush'], 2); cluster(45, 15, ['rock88', 'rocks88', 'bush'], 2);
  cluster(124, 54, ['rocks88', 'rock88'], 2); cluster(112, 88, ['rocks88', 'bush'], 2); cluster(106, 116, ['stump', 'bush'], 2); cluster(30, 110, ['stump', 'bush', 'bush'], 2);
  cluster(140, 20, ['bush', 'bush', 'stump'], 2); cluster(98, 40, ['rocks88', 'bush'], 2); cluster(66, 100, ['bush', 'stump'], 2); cluster(20, 84, ['bush', 'rocks88'], 2);
  for (const [x, y] of [[54, 36], [40, 34], [14, 14], [48, 26], [94, 76], [62, 44 + 4], [102, 108], [128, 84], [70, 112], [150, 58], [134, 26], [86, 92]]) if (isOpen(at(x, y)) && isOpen(at(x - 1, y)) && isOpen(at(x + 1, y))) objs.push({ t: 'tree', x, y });   /* cây lẻ làm điểm nhấn */
  /* vật cố định rơi vào ô nước / rừng / vách (suối uốn theo nhiễu) → dời sang ô trống gần nhất (bản đầu: đèn lồng cạnh cầu đứng giữa suối — em tự chê) */
  const okT = c => isOpen(c) || c === '=' || c === '#';
  for (const o of objs) { if (o.forest || okT(at(o.x, o.y))) continue; let best = null;
    for (let r = 1; r <= 4 && !best; r++) for (let j = -r; j <= r && !best; j++) for (let i = -r; i <= r && !best; i++) if (okT(at(o.x + i, o.y + j)) && !objs.some(q => q !== o && q.x === o.x + i && q.y === o.y + j)) best = [o.x + i, o.y + j];
    if (best) { o.x = best[0]; o.y = best[1]; } else o.skip = true; }
  for (let i = objs.length - 1; i >= 0; i--) if (objs[i].skip) objs.splice(i, 1);
  /* 10. cây trong rừng: mọi ô 'T' cứng; cây đặt so le (lưới 2 × 2 lệch hàng) để tán phủ kín, mép trong luôn có cây */
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (at(x, y) !== 'T') continue; const edge = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => { const c = at(x + a, y + b); return c !== 'T' && c !== 'X'; });
    if (((x + (y % 4 < 2 ? 0 : 1)) % 2 === 0 && y % 2 === 0) || (edge && (x + y) % 2 === 0)) objs.push({ t: 'tree', x, y, forest: true });
  }
  return { W, H, g, roads, objs, plaza: PLAZA, cliff: CLIFF, camps: CAMPS, pond: POND, er: ER };
}
export function ascii88(L) { const rows = []; for (let y = 0; y < L.H; y++) rows.push(L.g.slice(y * L.W, (y + 1) * L.W).join('')); return rows.join('\n'); }
/* VÙNG CON (theo research-saiyan-video.md mục 1): Làng chia 8 vùng con có tên; bước qua ranh → băng tên nhỏ giữa trên (khu · tên · An toàn / Thú hoang) rồi mờ.
   Xét theo thứ tự, vùng đầu tiên chứa ô (x, y) thắng. wild = có thú hoang (thẻ màu cam thay vì xanh). */
export const REGIONS = [
  { id: 'camp_chui', x: 13, y: 14, w: 20, h: 16, wild: true, vi: 'Trại Chũi', en: 'Mole Camp' },
  { id: 'camp_coc', x: 136, y: 30, w: 22, h: 22, wild: true, vi: 'Trại Cóc', en: 'Toad Camp' },
  { id: 'plateau', x: 0, y: 0, w: 62, h: 44, vi: 'Cao Nguyên Gió', en: 'Windy Plateau' },
  { id: 'square', x: 64, y: 46, w: 34, h: 32, vi: 'Quảng Trường Làng', en: 'Village Square' },
  { id: 'cliff', x: 0, y: 44, w: 64, h: 36, vi: 'Chân Vách Đá', en: 'Cliff Foot' },
  { id: 'north', x: 62, y: 0, w: 46, h: 46, vi: 'Đường Lên Đèo', en: 'Pass Road' },
  { id: 'stream', x: 108, y: 0, w: 52, h: 82, vi: 'Bờ Suối Ao Sen', en: 'Lotus Pond Stream' },
  { id: 'south', x: 0, y: 78, w: 160, h: 50, vi: 'Đồng Cỏ Bến Cảng', en: 'Harbor Meadow' },
];
export function regionAt(tx, ty) { for (const r of REGIONS) if (tx >= r.x && ty >= r.y && tx < r.x + r.w && ty < r.y + r.h) return r; return REGIONS[3]; }
