// world.js — map data structure + the "nation districts" zone generator used by all 10 lands
import { T, O, flagName, rockyObj, obj as defObj } from './gfx.js';

export function makeMap(w, h, fill) {
  return { w, h, ground: new Uint8Array(w * h).fill(fill), solid: new Uint8Array(w * h), objects: [], gates: [], entries: {}, npcArea: null, specials: [], reserved: [], plots: [], roads: new Uint8Array(w * h) };
}
const idx = (m, x, y) => y * m.w + x;
export const inb = (m, x, y) => x >= 0 && y >= 0 && x < m.w && y < m.h;
export function setG(m, x, y, t, solid) { if (!inb(m, x, y)) return; m.ground[idx(m, x, y)] = t; if (solid !== undefined) m.solid[idx(m, x, y)] = solid ? 1 : 0; }
export function getG(m, x, y) { return inb(m, x, y) ? m.ground[idx(m, x, y)] : T.NONE; }
export function fillG(m, x, y, w, h, t, solid) { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) setG(m, i, j, t, solid); }
export function isSolid(m, x, y) { return !inb(m, x, y) || m.solid[idx(m, x, y)] === 1; }
export function setSolid(m, x, y, v = 1) { if (inb(m, x, y)) m.solid[idx(m, x, y)] = v; }
export function hasObjectAt(m, x, y) { return m.objects.some(o => { const d = O[o.type]; return x >= o.x && x < o.x + d.fw && y >= o.y && y < o.y + d.fh; }); }
export function reservedNear(m, x, y) { return m.reserved.some(r => Math.abs(r.x - x) <= 1 && Math.abs(r.y - y) <= 1); }
const isRoad = (m, x, y) => inb(m, x, y) && m.roads[idx(m, x, y)] === 1;
const inPlot = (m, x, y, margin = 1) => m.plots.some(p => x >= p.x - margin && x < p.x + p.w + margin && y >= p.y - margin && y < p.y + p.h + margin);

export function place(m, type, x, y, extra = {}) {
  const d = O[type]; if (!d) throw new Error('unknown object ' + type);
  const ob = { type, x, y, ...extra }; m.objects.push(ob);
  if (d.solid) for (let j = 0; j < d.fh; j++) for (let i = 0; i < d.fw; i++) setSolid(m, x + i, y + j, 1);
  return ob;
}
export function removeObject(m, o) {
  const i = m.objects.indexOf(o); if (i < 0) return; m.objects.splice(i, 1);
  const d = O[o.type]; if (d.solid) for (let j = 0; j < d.fh; j++) for (let x = 0; x < d.fw; x++) setSolid(m, o.x + x, o.y + j, 0);
}
export function scatterG(m, rng, t, p, test = () => true) { for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) if (rng() < p && test(x, y)) setG(m, x, y, t); }
export function scatterO(m, rng, type, p, x0, y0, w, h, test = () => true, extra = {}) {
  const d = O[type];
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
    if (rng() >= p) continue; let ok = true;
    for (let j = 0; j < d.fh && ok; j++) for (let i = 0; i < d.fw && ok; i++) if (isSolid(m, x + i, y + j) || hasObjectAt(m, x + i, y + j) || reservedNear(m, x + i, y + j) || !test(x + i, y + j)) ok = false;
    if (ok) place(m, type, x, y, { ...extra });
  }
}
export function ellipse(m, cx, cy, rx, ry, t, solid) {
  for (let y = cy - ry; y <= cy + ry; y++) for (let x = cx - rx; x <= cx + rx; x++) if (((x - cx) ** 2) / (rx * rx) + ((y - cy) ** 2) / (ry * ry) <= 1) setG(m, x, y, t, solid);
}
export function gate(m, x, y, trig, to, entry, requires = null, type = 'gate') {
  place(m, type, x, y); setSolid(m, x, y, 1); setSolid(m, x + 2, y, 1);
  m.gates.push({ x: trig.x, y: trig.y, w: trig.w, h: trig.h, to, entry, requires, gx: x, gy: y });
  m.reserved.push({ x: x + 1, y }, { x: x + 1, y: y + 1 }, { x: x + 1, y: y - 1 });
}
/* 2026-10-11 anh: 'xóa cổng vòm ở M1…M9, xấu quá' → lối chuyển vùng trên cạn (Làng ↔ M1…M9, Biển → Làng) KHÔNG còn vòm gạch:
   con đường 3 ô chạy thẳng ra mép bản đồ (bước lên ô mép = chuyển vùng, như lối Sàn Đấu Ngầm) + biển chỉ đường nhỏ cạnh đường
   mang tên vùng đích (o.exit → main.js vẽ nhãn chữ). Lối cần huy hiệu: biển đổi sang exit_sign_lock (xích + ổ khóa) + nhãn
   'Cần huy hiệu Mx'; chặn vẫn là checkGates (toast + đẩy lùi) như cũ → tự mở khi có huy hiệu, save cũ không cần cờ.
   Ảnh PixelLab td8 hướng nam: tools/px-exits.py → zones/village/obj/exit_sign*_t8.png (M1…M9, Biển kế thừa gói village). */
const px1 = (g, x, y, c, w = 1, h = 1) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
defObj('exit_sign', 16, 24, 1, 1, g => { px1(g, 7, 10, '#4a3324', 3, 14); px1(g, 1, 3, '#2a1a10', 14, 9); px1(g, 2, 4, '#c8945a', 12, 7); px1(g, 5, 7, '#fff', 6, 1); });
defObj('exit_sign_lock', 16, 24, 1, 1, g => { px1(g, 7, 10, '#4a3324', 3, 14); px1(g, 1, 3, '#2a1a10', 14, 9); px1(g, 2, 4, '#a07040', 12, 7); px1(g, 5, 8, '#ffd45e', 6, 5); px1(g, 6, 6, '#8a8a8a', 4, 2); });
export function exitPath(m, side, to, entry, requires = null) {   /* side: 'n' (mép trên, trigger 2 hàng) | 's' (mép dưới, 1 hàng) */
  const x = CX - 1, n = side === 'n';
  m.gates.push({ x, y: n ? 0 : H - 1, w: 3, h: n ? 2 : 1, to, entry, requires, path: true });
  m.reserved.push({ x: x + 1, y: n ? 2 : H - 2 }, { x: x + 1, y: n ? 3 : H - 3 });
  const sx = n ? CX + 2 : CX - 2, sy = n ? 2 : H - 6;   /* lối Nam: lùi lên 4 hàng cho khỏi bị hàng cây viền mép che */
  for (const o of m.objects.filter(o => o.x === sx && o.y === sy)) removeObject(m, o);
  const z = ZONES[to], zr = z && z.road ? ZONES[n ? z.road.upper : z.road.lower] : null, nm = zr ? S('Pass · ' + zr.name.en, 'Đèo · ' + zr.name.vi) : z ? z.name : S('Journey\'s End', 'Hồi Kết'), ar = n ? ' ↑' : ' ↓';   /* plan-28: lối qua đèo → biển ghi vùng ĐÍCH thật ở đầu kia đèo */
  const sign = place(m, 'exit_sign', sx, sy, { exit: { to, requires, name: nm, ar }, text: S(nm.en + ar + (requires ? `\nNeeds the Magnitude ${requires}.0 badge (finish this land's quest).` : ''), nm.vi + ar + (requires ? `\nCần huy hiệu Magnitude ${requires}.0 (xong nhiệm vụ vùng này).` : '')) });
  return sign;
}
export function computeReach(m, start) {
  const seen = new Uint8Array(m.w * m.h), q = [[start.x, start.y]]; seen[idx(m, start.x, start.y)] = 1;
  while (q.length) {
    const [x, y] = q.shift();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (!inb(m, nx, ny) || seen[idx(m, nx, ny)] || m.solid[idx(m, nx, ny)]) continue; seen[idx(m, nx, ny)] = 1; q.push([nx, ny]); }
  }
  return seen;
}
// random free tiles inside rect, away from `avoid` points, only tiles reachable from the entrance (reach mask cached per map)
export function freeTiles(m, rng, rect, count, avoid = [], minDist = 3, spacing = 2) {
  const out = []; let tries = 0;
  const reach = m._reach || (m._reach = computeReach(m, m.entries.default));
  while (out.length < count && tries++ < 6000) {
    const x = rect.x + ((rng() * rect.w) | 0), y = rect.y + ((rng() * rect.h) | 0);
    if (isSolid(m, x, y) || hasObjectAt(m, x, y) || reservedNear(m, x, y) || !reach[idx(m, x, y)]) continue;
    if (avoid.some(a => Math.abs(a.x - x) < minDist && Math.abs(a.y - y) < minDist)) continue;
    if (out.some(a => Math.abs(a.x - x) < spacing && Math.abs(a.y - y) < spacing)) continue;
    out.push({ x, y });
  }
  return out;
}

// ---------------- district generator ----------------
const W = 80, H = 64, CX = 40, PW = 10, PH = 8;
const PLOT_COLS = [3, 15, 27, CX + 3, CX + 15, CX + 27], PLOT_ROWS = [10, 20, 30, 40, 50];
const ROAD_ROWS = [[18, 19], [28, 29], [38, 39], [48, 49]], ROAD_COLS = [[13, 14], [25, 26], [CX + 13, CX + 14], [CX + 25, CX + 26]];

function districtZone(rng, ctx, t) {
  const m = makeMap(W, H, t.base);
  for (const [tile, p] of t.scatter || []) scatterG(m, rng, tile, p, (x, y) => getG(m, x, y) === t.base);
  // sea on the right (M1)
  if (t.water) for (let y = 0; y < H; y++) { const sx = W - t.water + Math.round(2 * Math.sin(y / 3)); for (let x = sx; x < W; x++) setG(m, x, y, x < sx + 2 ? T.WATER : T.DEEP, x >= sx + 2); }   /* plan-15: 2 ô sát bờ = nông (lội được, không solid), còn lại = sâu (solid với NPC/thú; người chơi bơi qua p.passable) */
  // roads: a grid between the plots + the central avenue
  const road = (x, y) => { setG(m, x, y, t.path, false); m.roads[idx(m, x, y)] = 1; };
  for (const [y0, y1] of ROAD_ROWS) for (let x = 2; x < W - 2; x++) for (let y = y0; y <= y1; y++) if (!isSolid(m, x, y)) road(x, y);
  for (const [x0, x1] of ROAD_COLS) for (let y = 3; y < H - 3; y++) for (let x = x0; x <= x1; x++) if (!isSolid(m, x, y)) road(x, y);
  for (let y = 3; y < H - 3; y++) for (let x = CX - 1; x <= CX + 1; x++) road(x, y);
  // frame: border objects + gates (top exit, bottom entrance)
  fillG(m, CX - 1, 0, 3, 3, t.path, false); fillG(m, CX - 1, H - 3, 3, 3, t.path, false);
  if (t.next) exitPath(m, 'n', t.next, 'default', t.lv || null);   /* 2026-10-11: hết vòm cổng → đường ra mép + biển tên vùng */
  if (t.prev) exitPath(m, 's', t.prev, 'back');
  m.entries = { default: { x: CX, y: H - 5 }, back: { x: CX, y: 4 } };
  m.reserved.push(m.entries.default, m.entries.back);
  for (let y = 3; y < H - 3; y++) m.reserved.push({ x: CX, y });
  const bt = typeof t.border === 'function' ? t.border : () => t.border;
  for (let x = 0; x < W; x++) for (const y of [0, 1, H - 2, H - 1]) { if (x >= CX - 1 && x <= CX + 1) continue; if (!isSolid(m, x, y) && !hasObjectAt(m, x, y)) place(m, bt(x, y, rng), x, y); }
  for (let y = 2; y < H - 2; y++) for (const x of [0, 1, W - 2, W - 1]) if (!isSolid(m, x, y) && !hasObjectAt(m, x, y)) place(m, bt(x, y, rng), x, y);
  // central plaza with the Hall monument
  fillG(m, CX - 5, 3, 11, 7, t.plaza || T.STONE, false); place(m, 'monument', CX - 1, 5, { hall: true });
  if (!hasObjectAt(m, CX + 3, 5)) place(m, 'bed', CX + 3, 5, { bed: true });   /* F01: giường ngủ → hết ngày (ctx.clock.sleep) */
  // themed bands (chasm / lava rivers) on road rows
  m.bridge = null;
  for (const b of t.bands || []) {
    for (let x = 0; x < W; x++) {
      const gap = b.gaps.some(([a, c]) => x >= a && x <= c);
      for (let y = b.rows[0]; y <= b.rows[1]; y++) { if (gap) { if (b.bridge && x >= CX - 1 && x <= CX + 1) { setG(m, x, y, T.BRIDGE, false); (m.bridge ||= []).push({ x, y }); } } else setG(m, x, y, b.tile, true); }
    }
  }
  // nation plots: biggest nations nearest the avenue and the top
  const plots = [];
  for (const y of PLOT_ROWS) for (const x of PLOT_COLS) { if (t.water && x + PW > W - t.water - 1) continue; plots.push({ x, y, d: Math.abs(x + PW / 2 - CX) }); }
  plots.sort((a, b) => a.y - b.y || a.d - b.d);
  m.theme = t; m.tier = t.tier || 0;
  (ctx.nations || []).forEach((n, i) => { if (plots[i]) buildPlot(m, plots[i], { ...n, rank: i + 1 }, t); });
  // houses along the top strip (village themes)
  if (t.houses) for (const x of [4, 10, 16, 22, 28, 46, 52, 58, 64, 70]) place(m, ['house_r', 'house_b', 'house_g', 'house_y'][(x / 6) % 4 | 0], x, 3);
  for (const f of t.fixed || []) if (!hasObjectAt(m, f.x, f.y) && !isSolid(m, f.x, f.y)) place(m, f.obj, f.x, f.y, f.extra || {});
  // decor outside the plots and off the roads
  const free = (x, y) => !inPlot(m, x, y) && !isRoad(m, x, y) && getG(m, x, y) !== T.WATER && getG(m, x, y) !== T.LAVA && getG(m, x, y) !== T.CHASM && getG(m, x, y) !== T.BRIDGE && !(y >= 3 && y <= 9 && x >= CX - 6 && x <= CX + 6);
  for (const [obj, p, extra] of t.decor || []) scatterO(m, rng, obj, p, 3, 3, W - 6, H - 6, free, extra || {});
  place(m, 'sign', CX + 3, H - 6, { text: t.sign });
  m.npcArea = { x: 3, y: 4, w: W - 6, h: H - 9 };
  m.specials = t.guide ? [{ kind: 'guide', x: CX + 3, y: H - 8 }] : [];
  if (t.arenaExit) arenaExit(m);
  if (t.riftCrack) riftCrackM2(m, t.riftCrack === true ? 'rift2' : t.riftCrack);   /* plan-30 trùm 2 (M2 → rift2) · trùm 3 (M6 → rift3) · trùm 4 (M4 → rift4) · trùm 5 (M7 → rift5) */
  return m;
}
/* 2026-10-11 anh: Sàn Đấu Ngầm tách khỏi lối vào Làng → cửa hầm ở mép ĐÔNG, cuối đường hàng 48–49 (đi vào cửa = xuống 'arena').
   Ảnh PixelLab: arena_sign (biển gỗ nhỏ vẽ găng đấm) — zones/village.json. */
const ARENA_ROW = 48;
function arenaExit(m) {   /* anh 2026-10-11: không cửa/cổng — chỉ con đường đất chạy tới mép bản đồ (đi ra mép = chuyển vùng) + biển nhỏ 'Sàn Đấu' */
  const y0 = ARENA_ROW;
  for (const o of m.objects.filter(o => (o.x >= W - 3 && o.x < W - 1 && o.y >= y0 && o.y <= y0 + 1) || (o.x === W - 3 && o.y === y0 - 1))) removeObject(m, o);
  for (let y = y0; y <= y0 + 1; y++) for (let x = W - 4; x < W; x++) { setG(m, x, y, T.DIRT, false); m.roads[idx(m, x, y)] = 1; }
  for (let y = y0; y <= y0 + 1; y++) if (!hasObjectAt(m, W - 1, y)) place(m, 'tree', W - 1, y);   /* đường đi khuất vào hàng cây ở cột cuối (mép bản đồ không lộ khoảng đen) */
  m.gates.push({ x: W - 2, y: y0, w: 1, h: 2, to: 'arena', entry: 'default', requires: null });
  m.entries.arena = { x: W - 5, y: y0 + 1 };
  m.reserved.push({ x: W - 4, y: y0 }, { x: W - 4, y: y0 + 1 }, { x: W - 5, y: y0 + 1 });
  const sx = W - 3, sy = y0 - 1;
  place(m, 'arena_sign', sx, sy, { tag: S('Underground Ring →', 'Sàn Đấu Ngầm →'), text: S('Underground Ring →\nSparring with Xealist\'s partners. Lose and you just get back up — no items lost.', 'Sàn Đấu Ngầm →\nĐấu tập với các bạn tập của Xealist. Thua thì đứng dậy tập tiếp — không mất đồ.') });
}

// ---------------- 2026-10-11: Sàn Đấu Ngầm (arena) — hang đá dưới Làng, sàn cát tròn ở giữa (đường kính 15 ô), cột đá có chậu lửa quanh sàn,
// đồ tập ở mép (bao cát, giá tạ, hình nhân gỗ, ghế), bóng khán giả phía trên. Không dân, không quái. Xealist đứng mép sàn làm 'bầu sô' (xealist.js).
// m.sparRing = vòng đấu (px) cho spar.js: ra khỏi sàn = hết trận. Ảnh PixelLab: zones/arena.json (kế thừa M4: đá hang, cổng hang, đuốc).
function buildArena(rng) {
  const W = 32, H = 30, C = 16, RY = 13, RR = 7;
  const m = makeMap(W, H, T.ROCK);
  scatterG(m, rng, T.GRAVEL, 0.035, (x, y) => (x - C) ** 2 + (y - RY) ** 2 > (RR + 2.5) ** 2);   /* sỏi lác đác, không sát sàn cát (không có ô chuyển cát↔sỏi) */
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {   /* vách hang: viền tối không đi được, mép hơi lượn */
    const e = Math.min(x, y, W - 1 - x, H - 1 - y);   /* vách đều 2 ô (anh 2026-10-11: ô tối lác đác trông như nền mà không đi được → bỏ) */
    if (e < 2 && !(y >= H - 3 && Math.abs(x - C) <= 1)) setG(m, x, y, T.DARK, true);
  }
  for (let y = RY - RR - 1; y <= RY + RR + 1; y++) for (let x = C - RR - 1; x <= C + RR + 1; x++) if ((x - C) ** 2 + (y - RY) ** 2 <= (RR + 0.45) ** 2) setG(m, x, y, T.SAND, false);   /* sàn cát (≥ 11×11 ô): đủ chỗ cho húc / hất tung / quật */
  m.sparRing = { x: C * 16 + 8, y: RY * 16 + 8, r: RR * 16 - 6 };
  for (let k = 0; k < 8; k++) {   /* 8 cột đá có chậu lửa quanh sàn */
    const a = k / 8 * Math.PI * 2 + Math.PI / 8, x = Math.round(C + Math.cos(a) * (RR + 2.4)), y = Math.round(RY + Math.sin(a) * (RR + 1.6));
    if (y < H - 4 && !hasObjectAt(m, x, y)) place(m, 'arena_pillar', x, y, { glow: true });
  }
  const props = [['arena_crowd', C - 11, 3], ['arena_crowd', C + 8, 3], ['arena_crowd', C - 2, 2], ['arena_bag', 3, 9], ['arena_bag', 3, 14], ['arena_dummy', W - 5, 9], ['arena_dummy', W - 5, 14],
    ['arena_weights', 3, 20], ['arena_bench', W - 6, 20], ['arena_bench', C - 9, 24], ['crate', W - 4, 24], ['crate', W - 5, 24]];
  for (const [o, x, y] of props) if (!hasObjectAt(m, x, y)) place(m, o, x, y);
  for (let y = RY + RR + 3; y < H - 1; y++) for (let x = C - 1; x <= C + 1; x++) setG(m, x, y, T.DIRT, false);   /* đường đất ra mép Nam (không cổng), chui vào bóng tối hang ở hàng cuối */
  for (let x = C - 1; x <= C + 1; x++) setG(m, x, H - 1, T.CHASM, true);   /* miệng hang tối (zones/arena.json: CHASM → 'dark'); DARK = vách đá PixelLab 'cavewall' */
  m.gates.push({ x: C - 1, y: H - 2, w: 3, h: 1, to: 'village', entry: 'arena', requires: null });
  m.entries = { default: { x: C, y: H - 4 } };
  m.promoter = { x: C + 1, y: RY + RR + 2 };   /* Xealist đứng mép dưới sàn (ngoài vòng) */
  m.petSpot = { x: C - 2, y: RY + RR + 2 };   /* Rocky ngồi chờ ở mép sàn khi đang đấu */
  m.reserved.push(m.entries.default, m.promoter, m.petSpot);
  place(m, 'sign', C + 2, H - 4, { tag: S('← Harbor Village', '← Làng Xuất Phát'), text: S("Underground Ring.\nTalk to Xealist to call a sparring partner. Step off the sand to end a bout.\nSouth cave → Harbor Village", 'Sàn Đấu Ngầm.\nNói chuyện với Xealist để gọi bạn tập. Bước ra khỏi sàn cát là hết trận.\nHang phía Nam → Làng Xuất Phát') });
  /* plan-30: Khe Nứt Magnitude (trùm 1 Hắc Rocky) ở vách Bắc — ảnh PixelLab rift_crack (td8 hướng nam); hacrocky.js đổi sang rift_crack_off khi chưa đủ điều kiện */
  place(m, 'rift_crack', C + 4, 2, { rift: true, tag: S('Magnitude Rift', 'Khe Nứt Magnitude') });
  m.entries.rift = { x: C + 5, y: 4 }; m.reserved.push(m.entries.rift);
  m.npcArea = { x: 3, y: 3, w: W - 6, h: H - 6 };
  return m;
}
// ---------------- plan-30 trùm 1: Khe Nứt · Hắc Rocky (rift1) — hang tối tím dưới Sàn Đấu Ngầm. Vách = ô DARK (ảnh 'cavewall', nứt khi bị đập như Sàn Đấu Ngầm),
// 4 cột pha lê + 2 cột lục giác (gói m9, ảnh hư / đổ nát PixelLab sẵn) — PHÁ ĐƯỢC (arena.js BREAK) nên trùm / người không bao giờ bị nhốt.
// Lối ra hang Nam LUÔN mở (cổng về 'arena' lối 'rift'). Khe nứt trên vách Bắc = chỗ Hắc Rocky trồi lên (m.hrBoss).
function buildRift1(rng) {
  const W = 30, H = 22, C = 15;
  const m = makeMap(W, H, T.ROCK);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const e = Math.min(x, y, W - 1 - x, H - 1 - y); if (e < 2 && !(y >= H - 3 && Math.abs(x - C) <= 1)) setG(m, x, y, T.DARK, true); }
  for (let x = C - 1; x <= C + 1; x++) setG(m, x, H - 1, T.CHASM, true);
  scatterG(m, rng, T.GRAVEL, 0.07, (x, y) => getG(m, x, y) === T.ROCK && x >= 3 && y >= 3 && x < W - 3 && y < H - 4);   /* 2026-10-13: mảng pha lê vụn (Wang PixelLab zones/rift1/wang/a, lớp 'riftvein') — nền không còn một màu tím trơn */
  m.gates.push({ x: C - 1, y: H - 2, w: 3, h: 1, to: 'arena', entry: 'rift', requires: null });
  place(m, 'rift_crack', C - 1, 2, { riftTop: true });
  m.hrBoss = { x: C, y: 6 };
  for (const [o, x, y] of [['crystal_p', 7, 6], ['crystal_p', 22, 6], ['crystal_p', 6, 14], ['crystal_p', 23, 14], ['hexpillar', 10, 10], ['hexpillar', 20, 10]]) place(m, o, x, y, { glow: true });
  m.entries = { default: { x: C, y: H - 5 } };
  m.reserved.push(m.entries.default);
  place(m, 'sign', C + 2, H - 4, { tag: S('← Underground Ring', '← Sàn Đấu Ngầm'), text: S("The Rift · Shadow Rocky.\nRocky's attacks barely hurt Shadow Rocky — except while it is EXPOSED (win the beam struggle, cut the chain, hit the real copy).\nWith bond 20+ the Chain of Friendship cannot turn Rocky against you.\nSouth cave → Underground Ring", 'Khe Nứt · Hắc Rocky.\nĐòn của Rocky vào Hắc Rocky gần như vô dụng — trừ lúc nó LỘ (thắng giằng co, chém đứt xích, đánh trúng bản thật).\nĐộ thân Rocky từ 20 thì Xích Tình Bạn không kéo được Rocky sang phe địch.\nHang Nam → Sàn Đấu Ngầm') });
  m.npcArea = { x: 3, y: 3, w: W - 6, h: H - 6 };
  return m;
}

// ---------------- plan-30 trùm 2: Khe Nứt · Trống Đồng Thiên Lôi (rift2) — sân đá phiến khảm đồng dưới Làng Rung Chuyển (M2).
// Sàn: Wang PixelLab zones/rift2/wang/a (đá phiến + mảng đồng chạm khắc: vòng tròn đồng quanh tâm như mặt trống). Vách = ô DARK (cavewall, nứt khi bị đập — arena.js).
// Vật cản PHÁ ĐƯỢC (arena.js BREAK, ảnh hư / đổ nát PixelLab riêng): 4 cột đồng (td_pillar) + 2 bệ thu lôi (td_stele). Lối ra hang Nam LUÔN mở → M2 lối 'rift'.
function buildRift2(rng) {
  const W = 30, H = 24, C = 15, CY = 10;
  const m = makeMap(W, H, T.ROCK);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const e = Math.min(x, y, W - 1 - x, H - 1 - y); if (e < 2 && !(y >= H - 3 && Math.abs(x - C) <= 1)) setG(m, x, y, T.DARK, true); }
  for (let x = C - 1; x <= C + 1; x++) setG(m, x, H - 1, T.CHASM, true);
  for (let y = 2; y < H - 2; y++) for (let x = 2; x < W - 2; x++) { const d = Math.hypot(x - C, (y - CY) * 1.15); if ((d > 6.4 && d < 7.6) || d < 1.6) setG(m, x, y, T.GRAVEL, false); }   /* vòng đồng + tâm đồng (lớp 'bronze') */
  scatterG(m, rng, T.STONE, 0.035, (x, y) => getG(m, x, y) === T.ROCK && x >= 3 && y >= 3 && x < W - 3 && y < H - 4);
  m.gates.push({ x: C - 1, y: H - 2, w: 3, h: 1, to: 'm2', entry: 'rift', requires: null });
  place(m, 'rift_crack', C - 1, 2, { riftTop: true });
  m.tdBoss = { x: C, y: CY }; m.tdCenter = { x: C * 16 + 8, y: CY * 16 + 8 };
  for (const [o, x, y] of [['td_pillar', 6, 5], ['td_pillar', 23, 5], ['td_pillar', 6, 16], ['td_pillar', 23, 16], ['td_stele', 4, 10], ['td_stele', 25, 10]]) place(m, o, x, y, { glow: true });
  m.entries = { default: { x: C, y: H - 5 } };
  m.reserved.push(m.entries.default);
  place(m, 'sign', C + 2, H - 4, { tag: S('← Trembling Village', '← Làng Rung Khẽ'), text: S("The Rift · Thunder Bronze Drum.\nThe drum beats the rhythm of every attack: move between the shockwaves.\nRocky's attacks barely dent the bronze — strike the drum's rim ON the beat 3 times in a row to make it miss a beat (exposed 5 s).\nWhen it silences Rocky, one on-beat strike breaks the silence.\nSouth cave → Trembling Village", 'Khe Nứt · Trống Đồng Thiên Lôi.\nTrống gõ nhịp cho mọi đòn: đi vào khe giữa các vòng sóng.\nĐòn Rocky gần như không làm móp đồng — đánh vào mép trống ĐÚNG NHỊP 3 lần liền để trống lỡ nhịp (lộ 5 giây).\nKhi trống làm Rocky câm, 1 nhát đúng nhịp là phá câm.\nHang Nam → Làng Rung Khẽ') });
  m.npcArea = { x: 3, y: 3, w: W - 6, h: H - 6 };
  return m;
}
// ---------------- plan-30 trùm 3: Khe Nứt · Gương Địa Chấn (rift3) — thư viện cổ dưới Thành Nghiêng (M6).
// Sàn: Wang PixelLab zones/rift3/wang/a (gạch đá thư viện xanh xám + mảng sàn gương pha lê: vòng gương + ngôi sao 6 cánh quanh tâm). Vách: zones/rift3/wang/w (đá tím có pha lê).
// Vật cản PHÁ ĐƯỢC (arena.js BREAK, ảnh hư / đổ nát PixelLab riêng — tools/px-guong-env.py ruin): 4 cột gương (gm_pillar, mặt gương hướng Nam — Rocky-ha phản xạ được) + 2 kệ sách (gm_shelf).
// Gương lớn (gm_bigmirror) ở vách Bắc: màn mở đầu (bóng người chơi bước ra) + pha 2 (Bóng Gương bước ra từ gương lớn). Lối ra hang Nam LUÔN mở → M6 lối 'rift'.
function buildRift3(rng) {
  const W = 30, H = 24, C = 15, CY = 10;
  const m = makeMap(W, H, T.ROCK);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const e = Math.min(x, y, W - 1 - x, H - 1 - y); if (e < 2 && !(y >= H - 3 && Math.abs(x - C) <= 1)) setG(m, x, y, T.DARK, true); }
  for (let x = C - 1; x <= C + 1; x++) setG(m, x, H - 1, T.CHASM, true);
  for (let y = 2; y < H - 2; y++) for (let x = 2; x < W - 2; x++) {
    const dx = x - C, dy = (y - CY) * 1.15, d = Math.hypot(dx, dy), a = Math.atan2(dy, dx), star = 2.2 + 1.4 * Math.max(0, Math.cos(3 * a)) ** 4;   /* vòng gương + ngôi sao 6 cánh ở tâm (lớp 'mirror') */
    if ((d > 6.4 && d < 7.5) || d < star) setG(m, x, y, T.GRAVEL, false);
  }
  scatterG(m, rng, T.STONE, 0.025, (x, y) => getG(m, x, y) === T.ROCK && x >= 3 && y >= 3 && x < W - 3 && y < H - 4);
  m.gates.push({ x: C - 1, y: H - 2, w: 3, h: 1, to: 'm6', entry: 'rift', requires: null });
  place(m, 'gm_bigmirror', C - 1, 3, { bigMirror: true });
  m.gmBoss = { x: C, y: 6 }; m.gmCenter = { x: C * 16 + 8, y: CY * 16 + 8 }; m.gmMirror = { x: C * 16, y: 4 * 16 };
  for (const [o, x, y] of [['gm_pillar', 6, 5], ['gm_pillar', 23, 5], ['gm_pillar', 6, 16], ['gm_pillar', 23, 16], ['gm_shelf', 4, 10], ['gm_shelf', 25, 10]]) place(m, o, x, y, { glow: true });
  m.entries = { default: { x: C, y: H - 5 } };
  m.reserved.push(m.entries.default);
  place(m, 'sign', C + 2, H - 4, { tag: S('← Leaning City', '← Thành Nghiêng'), text: S("The Rift · Myriad Mirror Queen.\nRocky-ha bounces off her mirrors at the true reflection angle — mind where it flies.\nSmash her 6 flying mirror shards in RAINBOW order (red → orange → yellow → green → blue → violet) to expose the real mirror on her face: then Rocky-ha pierces it.\nDuring Myriad Mirror Lance, strike the standing mirrors to turn the light onto her.\nSouth cave → Leaning City", 'Khe Nứt · Gương Địa Chấn.\nRocky-ha bắn vào gương bị phản lại đúng góc phản xạ — coi chừng tia nảy về phía mình.\nĐập 6 mảnh gương bay theo thứ tự CẦU VỒNG (đỏ → cam → vàng → lục → lam → tím) để lộ gương thật trên mặt: lúc đó Rocky-ha mới xuyên được.\nKhi có Vạn Kính Lao, đánh vào gương đứng để xoay tia sáng sang trùm.\nHang Nam → Thành Nghiêng') });
  m.npcArea = { x: 3, y: 3, w: W - 6, h: H - 6 };
  return m;
}
// ---------------- plan-30 trùm 4: Khe Nứt · Hố Đen Địa Tâm (rift4) — hang mỏ sâu nhất dưới Mỏ Đá Lở (M4).
// Sàn: Wang PixelLab zones/rift4/wang/a (sỏi đá mỏ tối + mảng đá đen nứt tia tím hư không: vòng nứt quanh tâm). Vách = ô DARK (cavewall arena, nứt khi bị đập).
// 6 KHỐI ĐÁ LỚN (hd_block, td8 PixelLab, ảnh hư + đổ nát riêng) = chỗ NÚP Sự Kiện Chân Trời — hoden.js phá / dựng lại (luôn còn ≥ 3).
// Vật viền: cột chống gỗ (beam), xe goòng (cart), đuốc (torch) — ảnh PixelLab gói m4 (có ảnh hư + đổ nát) — Trọng Lực kéo đổ bay vào hố. Lối ra hang Nam LUÔN mở → M4 lối 'rift'.
function buildRift4(rng) {
  const W = 30, H = 24, C = 15, CY = 11;
  const m = makeMap(W, H, T.ROCK);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const e = Math.min(x, y, W - 1 - x, H - 1 - y); if (e < 2 && !(y >= H - 3 && Math.abs(x - C) <= 1)) setG(m, x, y, T.DARK, true); }
  for (let x = C - 1; x <= C + 1; x++) setG(m, x, H - 1, T.CHASM, true);
  for (let y = 2; y < H - 2; y++) for (let x = 2; x < W - 2; x++) {
    const dx = x - C, dy = (y - CY) * 1.2, d = Math.hypot(dx, dy), a = Math.atan2(dy, dx), arm = Math.abs(Math.sin(2 * a + d * 0.55));   /* vòng nứt hư không + 4 nhánh xoáy quanh tâm (lớp 'voidcrack') */
    if (d < 2.4 || (d > 5.2 && d < 6.1) || (d < 9 && arm < 0.12)) setG(m, x, y, T.GRAVEL, false);
  }
  scatterG(m, rng, T.STONE, 0.02, (x, y) => getG(m, x, y) === T.ROCK && x >= 3 && y >= 3 && x < W - 3 && y < H - 4);
  m.gates.push({ x: C - 1, y: H - 2, w: 3, h: 1, to: 'm4', entry: 'rift', requires: null });
  m.hdBoss = { x: C, y: 7 }; m.hdCenter = { x: C * 16 + 8, y: CY * 16 + 8 };
  for (const [x, y] of [[6, 6], [22, 6], [4, 12], [24, 12], [9, 17], [19, 17]]) place(m, 'hd_block', x, y, { hdBlock: true });
  for (const [o, x, y] of [['beam', 3, 3], ['beam', 26, 3], ['beam', 2, 9], ['beam', 27, 9], ['beam', 3, 19], ['beam', 26, 19], ['cart', 9, 2], ['cart', 19, 2], ['torch', 13, 2], ['torch', 17, 2], ['torch', 2, 15], ['torch', 27, 15]]) if (!hasObjectAt(m, x, y)) place(m, o, x, y, { hdEdge: true });
  m.entries = { default: { x: C, y: H - 5 } };
  m.reserved.push(m.entries.default);
  place(m, 'sign', C + 2, H - 4, { tag: S('← Rockfall Mine', '← Mỏ Đá Lở'), text: S("The Rift · Magnitude Devourer.\nThe old Void Miner holds a black hole over his head with his lantern. It SWALLOWS Rocky-ha and grows stronger — do not fire blindly.\nFeed it HARD ROCK: push rock chunks into the hole (E / walk into them), or let its Gravity drag them in. When it is full the hole shrinks and the core is exposed for 8 s.\nEVENT HORIZON: hide behind a big rock block — only solid rock stops the supernova.\nSouth cave → Rockfall Mine", 'Khe Nứt · Kẻ Nuốt Magnitude.\nLão Thợ Mỏ Hư Không giơ đèn nâng hố đen trên đầu. Hố NUỐT Rocky-ha và mạnh lên — đừng bắn bừa.\nCho hố ăn ĐÁ CỨNG: đẩy cục đá vào hố (E / đi đẩy), hoặc để Trọng Lực tự kéo vào. No rồi hố co lại, lõi lộ 8 giây.\nSỰ KIỆN CHÂN TRỜI: núp sau khối đá lớn — chỉ đá cứng chặn được siêu tân tinh.\nHang Nam → Mỏ Đá Lở') });
  m.npcArea = { x: 3, y: 3, w: W - 6, h: H - 6 };
  return m;
}
// ---------------- plan-30 trùm 5: Khe Nứt · Đồng Hồ Đứt Dây (rift5) — lò rèn đồng thau ngầm dưới Núi Lửa Ngủ (M7).
// Sàn: Wang PixelLab zones/rift5/wang/a (sàn sắt tán đinh + mặt BÁNH RĂNG đồng thau khổng lồ: 1 bánh lớn quanh tâm có răng + 2 bánh nhỏ ở góc). Vách = ô DARK (cavewall arena).
// 6 CỘT BÁNH RĂNG (dh_pillar, td8 PixelLab, ảnh hư + đổ nát riêng) PHÁ ĐƯỢC; ống đồng (dh_pipe) / lò rèn (dh_forge) ở viền, cũng phá được. Lối ra hang Nam LUÔN mở → M7 lối 'rift'.
function buildRift5(rng) {
  const W = 30, H = 24, C = 15, CY = 11;
  const m = makeMap(W, H, T.ROCK);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const e = Math.min(x, y, W - 1 - x, H - 1 - y); if (e < 2 && !(y >= H - 3 && Math.abs(x - C) <= 1)) setG(m, x, y, T.DARK, true); }
  for (let x = C - 1; x <= C + 1; x++) setG(m, x, H - 1, T.CHASM, true);
  const gear = (gx, gy, r, teeth) => { for (let y = 2; y < H - 2; y++) for (let x = 2; x < W - 2; x++) { const dx = x - gx, dy = (y - gy) * 1.15, d = Math.hypot(dx, dy), a = Math.atan2(dy, dx), tooth = Math.cos(a * teeth) > 0.2;
    if (d < 1.6 || (d > r - 1.6 && d < r) || (d >= r && d < r + 1.1 && tooth) || (d < r - 1.6 && d > 2.4 && Math.abs(Math.sin(a * 3)) < 0.14)) setG(m, x, y, T.GRAVEL, false); } };   /* bánh răng: trục + vành + răng + 6 nan */
  void gear;   /* v2 (anh Hùng): bỏ mảng Wang vàng — sàn bánh răng = ảnh bánh răng tròn PixelLab đặt phẳng (dongho.js drawGround, m.dhFloor) */
  m.dhFloor = [{ x: C * 16 + 8, y: CY * 16 + 8, big: true }, { x: 5 * 16, y: 5 * 16 + 8 }, { x: 25 * 16, y: 5 * 16 + 8 }, { x: 4 * 16 + 8, y: 18 * 16 }, { x: 25 * 16 + 8, y: 18 * 16 }, { x: 9 * 16, y: 11 * 16 + 8 }, { x: 22 * 16, y: 11 * 16 + 8 }, { x: 15 * 16 + 8, y: 19 * 16 }];
  m.gates.push({ x: C - 1, y: H - 2, w: 3, h: 1, to: 'm7', entry: 'rift', requires: null });
  m.dhBoss = { x: C, y: 7 }; m.dhCenter = { x: C * 16 + 8, y: CY * 16 + 8 };
  for (const [x, y] of [[7, 7], [22, 7], [5, 13], [24, 13], [10, 17], [19, 17]]) place(m, 'dh_pillar', x, y, { dhPillar: true });
  for (const [o, x, y] of [['dh_pipe', 3, 2], ['dh_forge', 8, 2], ['dh_forge', 20, 2], ['dh_pipe', 25, 2], ['dh_pipe', 2, 9], ['dh_pipe', 26, 9], ['dh_forge', 2, 17], ['dh_forge', 26, 17]]) if (!hasObjectAt(m, x, y) && !hasObjectAt(m, x + 1, y)) place(m, o, x, y, { dhEdge: true });
  m.entries = { default: { x: C, y: H - 5 } };
  m.reserved.push(m.entries.default);
  place(m, 'sign', C + 2, H - 4, { tag: S('← Sleeping Volcano', '← Núi Lửa Ngủ'), text: S("The Rift · Broken-Spring Clock.\nEvery 20 s the Gear God REWINDS the last 3 seconds: everyone runs backwards and he heals back — unless the big COGWHEEL on his back is broken.\nThe cogwheel can only be hit from BEHIND him: let Rocky hold his attention and circle around.\nAMBER FRAME: smash the amber to free Rocky. SECOND HANDS: stay away from where the two hands cross.\nTWELVE O'CLOCK: stand in a slice that is not red.\nSouth cave → Sleeping Volcano", 'Khe Nứt · Đồng Hồ Đứt Dây.\nMỗi 20 giây Thần Bánh Răng TUA LẠI 3 giây cuối: mọi người chạy ngược và hắn hồi máu — trừ khi BÁNH RĂNG lớn trên lưng đã vỡ.\nBánh răng chỉ đánh được từ SAU LƯNG: để Rocky giữ chân hắn rồi vòng ra sau.\nKHUNG HỔ PHÁCH: đập khung để cứu Rocky. KIM GIÂY: tránh chỗ hai kim giao nhau.\nMƯỜI HAI GIỜ: đứng ở múi không đỏ.\nHang Nam → Núi Lửa Ngủ') });
  m.npcArea = { x: 3, y: 3, w: W - 6, h: H - 6 };
  return m;
}
/* plan-30 trùm 2: khe nứt Trống Đồng ở M2 — tìm chỗ trống 2×1 gần quảng trường (phía Đông), có 2 ô đi được ngay dưới để đứng / làm lối vào 'rift' */
function riftCrackM2(m, rid = 'rift2') {
  const reach = computeReach(m, m.entries.default);
  for (let r = 0; r < 14; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
    const x = CX + 11 + dx, y = 6 + dy; if (x < 3 || y < 3 || x + 2 >= W - 3 || y + 3 >= H - 3) continue;
    const okT = (a, b) => !isSolid(m, a, b) && !hasObjectAt(m, a, b) && !isRoad(m, a, b) && !inPlot(m, a, b) && !reservedNear(m, a, b);
    if (!(okT(x, y) && okT(x + 1, y) && okT(x, y + 1) && okT(x + 1, y + 1) && okT(x + 1, y + 2) && reach[idx(m, x + 1, y + 2)])) continue;
    place(m, 'rift_crack', x, y, { rift: rid, tag: S('Magnitude Rift', 'Khe Nứt Magnitude') });
    m.entries.rift = { x: x + 1, y: y + 2 }; m.reserved.push(m.entries.rift, { x, y: y + 1 }, { x: x + 1, y: y + 1 });
    return true;
  }
  return false;
}

// A nation's district. Its architecture grows with the land's tier (0 camp … 5 sanctum); the top-ranked nations get a fountain / statue.
const TIER = [
  { floor: null, wall: 'post', corner: 'post', sparse: true },
  { floor: null, wall: ['fence_h', 'fence_v'], corner: 'fence_h' },
  { floor: T.STONE, wall: 'wall_s', corner: 'wall_s', lights: 2 },
  { floor: T.COBBLE, wall: 'wall_s', corner: 'pillar', lights: 2, house: 'pavilion', statue: true },
  { floor: T.MARBLE, wall: 'wall_h', corner: 'turret', lights: 2, house: 'pavilion', statue: true },
  { floor: T.HEXLIT, wall: 'hexwall', corner: 'hexpillar', lights: 2, house: 'altar', statue: true },
];
export const MAX_TIER = 5;
// A district's architecture tier: the land's tier by default; nations may upgrade it by one step (cap = land tier + 1).
export function tierCap(landTier) { return Math.min(MAX_TIER, (landTier || 0) + 1); }
function buildPlot(m, p, n, t, idx = m.plots.length) {
  const { x, y } = p, tn = Math.min(tierCap(t.tier || 0), n.tier ?? (t.tier || 0)), tier = TIER[tn], fl = flagName(n.key);
  const put = (type, px_, py_, extra = {}) => place(m, type, px_, py_, { ...extra, plot: idx, piece: extra.piece || type });
  fillG(m, x + 1, y + 1, PW - 2, PH - 2, tier.floor ?? t.plot, false);
  for (let i = 0; i < PW; i++) for (let j = 0; j < PH; j++) {
    const edge = i === 0 || i === PW - 1 || j === 0 || j === PH - 1; if (!edge) continue;
    if (((i === 4 || i === 5) && (j === 0 || j === PH - 1)) || ((j === 3 || j === 4) && (i === 0 || i === PW - 1))) continue; // entrances
    const corner = (i === 0 || i === PW - 1) && (j === 0 || j === PH - 1);
    if (tier.sparse && !corner && !((j === 0 || j === PH - 1) ? i % 3 === 0 : j % 3 === 0)) continue;
    const type = corner ? tier.corner : Array.isArray(tier.wall) ? (j === 0 || j === PH - 1 ? tier.wall[0] : tier.wall[1]) : tier.wall;
    put(type, x + i, y + j, { piece: corner ? 'corner' : 'wall' });
  }
  put(fl, x + 1, y + 1, { flag: n.key, label: true, piece: 'flag' }); put('board', x + 2, y + 1, { nation: n.key, piece: 'board' });
  if (tn === 0) put('campfire', x + 7, y + 2, { piece: 'light' });
  else { if (t.light) put(t.light, x + 7, y + 1, { piece: 'light' }); put(fl, x + 8, y + 1, { flag: n.key, piece: 'flag' }); }
  if (tier.lights && t.light) put(t.light, x + 1, y + 6, { piece: 'light' });
  if (tier.house) put(tier.house, x + 6, y + 5, { piece: 'house' });
  if (n.rank === 1) put('fountain', x + 1, y + 4, { piece: 'fountain' });
  /* 2026-10-12 anh: bỏ tượng Rocky quốc gia khỏi game (giữ cờ) — kéo theo điều khiển Rocky + sumo Rocky không còn. Bản cũ _bak/nostatue/world.js */
  const plot = { x, y, w: PW, h: PH, nation: n.key, tier: tn, rank: n.rank, spawn: { x: x + 1, y: y + 2, w: PW - 2, h: PH - 3 } };
  if (idx === m.plots.length) m.plots.push(plot); else m.plots[idx] = plot;
}
// Rebuild one district at a new tier in place (upgrade): removes its pieces, re-lays floor and structures.
export function rebuildPlot(m, idx, tier) {
  const p = m.plots[idx]; if (!p || !m.theme) return null;
  for (const o of m.objects.filter(o => o.plot === idx)) removeObject(m, o);
  buildPlot(m, p, { key: p.nation, rank: p.rank, tier }, m.theme, idx);
  return m.plots[idx];
}

// ---------------- ZONES ----------------
const S = (en, vi) => ({ en, vi });
const themes = {
  village: { tier: 0, base: T.GRASS, scatter: [[T.GRASS2, .12], [T.FLOWER, .05]], plot: T.GRASS2, path: T.DIRT, border: 'tree', decor: [['tree', .04], ['bush', .03]], light: 'lantern', houses: false /* 2026-09-25 anh bỏ nhà trang trí không tính năng khỏi Làng */, guide: true, next: 'road1', prev: 'sea', arenaExit: true,
    fixed: [{ obj: 'well', x: CX + 8, y: 7 }, { obj: 'crate', x: CX - 9, y: 7 }, { obj: 'crate', x: CX - 10, y: 7 }, { obj: 'crate', x: CX - 9, y: 8 }],
    sign: S('Harbor Village — start of the journey.\nEvery fenced yard belongs to one country. Read the board inside.\nNorth road → M1 · Calm Shoals', 'Làng Xuất Phát — nơi bắt đầu hành trình.\nMỗi khu rào là của một quốc gia. Đọc bảng trong khu.\nĐường Bắc → M1 · Bãi Bồi Yên') },
  m1: { tier: 1, base: T.SAND, scatter: [[T.SAND2, .15]], plot: T.DIRT, path: T.DIRT, border: (x, y) => y < 2 || y > H - 3 ? 'palm' : 'rock', water: 8, decor: [['palm', .04], ['rock', .015], ['shell', .03], ['rock_s', .02]], light: 'torch', prev: 'road1', next: 'road2', lv: 1,
    fixed: [{ obj: 'boat', x: 5, y: 59 }],
    sign: S('Magnitude 1.0 — where every artist starts.\nMeet 5 artists here to earn the M1 badge.', 'Magnitude 1.0 — nơi mọi nghệ sĩ bắt đầu.\nGặp 5 người ở đây để nhận huy hiệu M1.') },
  m2: { tier: 1, base: T.GRASS, scatter: [[T.GRASS2, .12], [T.FLOWER, .04], [T.CRACKG, .04]], plot: T.GRASS2, path: T.DIRT, border: 'tree', decor: [['bush', .03], ['tree', .03], ['crate', .01]], light: 'lantern', houses: true, prev: 'road2', next: 'road3', lv: 2, riftCrack: true,
    fixed: [{ obj: 'stall', x: CX - 10, y: 7, extra: { shop: true } }, { obj: 'stall', x: CX + 8, y: 7, extra: { shop: true } }, { obj: 'stall', x: CX - 10, y: 9, extra: { shop: true } }, { obj: 'well', x: CX + 8, y: 9 }],
    sign: S('Magnitude 2.0 — the lanterns sway.\nThe market by the plaza trades tremor shards for outfits. Meet 5 artists.', 'Magnitude 2.0 — đèn lồng đung đưa.\nChợ cạnh quảng trường đổi mảnh dư chấn lấy trang phục. Gặp 5 nghệ sĩ.') },
  m3: { tier: 2, base: T.GRASS, scatter: [[T.MOSS, .25], [T.GRASS2, .15], [T.CRACKG, .07]], plot: T.DIRT, path: T.DIRT, border: 'tree', decor: [['tree', .16], ['deadtree', .04], ['bush', .05], ['rock_s', .03]], light: 'campfire', prev: 'road3', next: 'road4', lv: 3,
    fixed: [{ obj: 'campfire_off', x: 8, y: 19, extra: { fire: true } }, { obj: 'campfire_off', x: 72, y: 29, extra: { fire: true } }, { obj: 'campfire_off', x: 30, y: 49, extra: { fire: true } }],
    sign: S('Magnitude 3.0 — the forest is cracking.\nLight the 3 cold campfires along the roads so nobody gets lost. Meet 6 artists.', 'Magnitude 3.0 — rừng đang nứt.\nĐốt 3 đống lửa tắt dọc đường để không ai lạc. Gặp 6 nghệ sĩ.') },
  m4: { tier: 2, base: T.ROCK, scatter: [[T.GRAVEL, .2], [T.DARK, .08]], plot: T.GRAVEL, path: T.GRAVEL, border: 'rock', decor: [['ore', .05, { ore: true }], ['rock', .04], ['boulder', .006], ['crate', .01], ['torch', .015], ['beam', .01]], light: 'torch', prev: 'road4', next: 'road5', lv: 4, riftCrack: 'rift4',   /* plan-30 trùm 4: khe nứt Hố Đen Địa Tâm (mỏ sâu, phía Đông quảng trường) */
    fixed: [{ obj: 'cart', x: CX - 9, y: 7 }, { obj: 'cart', x: CX + 7, y: 7 }],
    sign: S('Magnitude 4.0 — Rockfall Mine.\nWatch the shadows — stones fall. Mine 3 ore. Meet 6 artists.', 'Magnitude 4.0 — Mỏ Đá Lở.\nCoi chừng bóng đen — đá rơi. Đào 3 quặng. Gặp 6 nghệ sĩ.') },
  m5: { tier: 3, base: T.DIRT, scatter: [[T.CRACKD, .1], [T.GRAVEL, .12], [T.ROCK, .05]], plot: T.GRAVEL, path: T.GRAVEL, border: 'rock', decor: [['boulder', .008], ['rock', .04], ['deadtree', .03], ['rock_s', .03]], light: 'torch', prev: 'road5', next: 'road6', lv: 5,
    bands: [{ rows: [28, 29], tile: T.CHASM, gaps: [[CX - 1, CX + 1]], bridge: true }],
    fixed: [{ obj: 'lever_off', x: CX - 2, y: 33, extra: { lever: true } }, { obj: 'lever_off', x: CX + 2, y: 33, extra: { lever: true } }],
    sign: S('Magnitude 5.0 — Fault Canyon.\nThe fault splits the land in two. Pull both levers south of it to raise the bridge. Meet 6 artists.', 'Magnitude 5.0 — Hẻm Đứt Gãy.\nĐứt gãy chia đôi vùng đất. Gạt cả hai cần ở bờ Nam để nâng cầu. Gặp 6 nghệ sĩ.') },
  m6: { tier: 3, base: T.COBBLE, scatter: [[T.MOSS, .1], [T.STONE, .06]], plot: T.STONE, path: T.STONE, plaza: T.STONE, border: 'pillar_broken', decor: [['pillar_broken', .04], ['pillar', .012], ['statue', .008], ['bush', .02], ['rock_s', .02]], light: 'lantern', prev: 'road6', next: 'road7', lv: 6, riftCrack: 'rift3',   /* plan-30 trùm 3: khe nứt Gương Địa Chấn (phía Đông quảng trường thư viện) */
    fixed: [{ obj: 'library', x: CX - 9, y: 7, extra: { quiz: 'library' } }, { obj: 'library', x: CX + 7, y: 7, extra: { quiz: 'library' } }, { obj: 'tower', x: 5, y: 7 }, { obj: 'tower', x: 72, y: 7 }],
    sign: S('Magnitude 6.0 — the Leaning City.\nThe libraries by the plaza test what you know about Seismic. Meet 7 artists.', 'Magnitude 6.0 — Thành Nghiêng.\nThư viện cạnh quảng trường kiểm tra bạn hiểu Seismic tới đâu. Gặp 7 nghệ sĩ.') },
  m7: { tier: 4, base: T.ASH, scatter: [[T.ROCK, .15], [T.DARK, .05]], plot: T.ROCK, path: T.ROCK, border: 'rock', decor: [['rock', .05], ['deadtree', .035], ['rock_s', .04], ['torch', .01], ['obsidian', .003, { item: 'obsidian' }]], light: 'torch', prev: 'road7', next: 'road8', lv: 7, riftCrack: 'rift5',   /* plan-30 trùm 5: khe nứt Đồng Hồ Đứt Dây (lò rèn ngầm, phía Đông quảng trường) */
    bands: [{ rows: [18, 19], tile: T.LAVA, gaps: [[13, 14], [CX - 1, CX + 1], [65, 66]] }, { rows: [38, 39], tile: T.LAVA, gaps: [[25, 26], [CX - 1, CX + 1], [53, 54]] }],
    fixed: [{ obj: 'obsidian', x: 6, y: 29, extra: { item: 'obsidian' } }, { obj: 'obsidian', x: 74, y: 29, extra: { item: 'obsidian' } }, { obj: 'obsidian', x: 6, y: 49, extra: { item: 'obsidian' } }, { obj: 'obsidian', x: 74, y: 49, extra: { item: 'obsidian' } }],
    sign: S("Magnitude 7.0 — the Sleeping Volcano.\nTwo lava rivers cross the land. Collect 3 obsidian shards, dodge the spurts. Meet 7 artists.", 'Magnitude 7.0 — Núi Lửa Ngủ.\nHai sông dung nham cắt ngang. Nhặt 3 mảnh obsidian, né dung nham phun. Gặp 7 nghệ sĩ.') },
  m8: { tier: 4, base: T.SNOW, scatter: [[T.ROCK, .12], [T.ICE, .06]], plot: T.ROCK, path: T.ROCK, border: 'pine_s', decor: [['pine_s', .08], ['pine', .03], ['boulder', .008], ['rock', .03], ['campfire', .004]], light: 'campfire', prev: 'road8', next: 'road9', lv: 8,
    sign: S('Magnitude 8.0 — Epicenter Peak.\nThree Elders (☆) guard the way. Answer their riddles. Meet 8 artists.', 'Magnitude 8.0 — Đỉnh Tâm Chấn.\nBa Trưởng lão (☆) canh đường. Trả lời câu đố của họ. Gặp 8 nghệ sĩ.') },
  m9: { tier: 5, base: T.HEX, scatter: [[T.DARK, .15]], plot: T.DARK, path: T.HEX, plaza: T.DARK, border: 'hexpillar', decor: [['crystal_p', .03], ['crystal_b', .02], ['crystal_r', .015], ['hexpillar', .01], ['rock_s', .02]], light: 'crystal_p', prev: 'road9', next: 'end', lv: 9, gateType: 'core_gate',
    sign: S('Magnitude 9.0 — the Encrypted Core.\n77 artists. 15 Leaders (★). Find them all.', 'Magnitude 9.0 — Lõi Mã Hóa.\n77 nghệ sĩ. 15 Leader (★). Tìm đủ họ.') },
};
const build = id => (rng, ctx = {}) => districtZone(rng, ctx, themes[id]);
export const zoneTier = id => (themes[id] || {}).tier || 0;

// ---------------- the Sea of Origins: open water, islets, reefs, currents, a lighthouse and the dock to Harbor Village ----------------
export const FLOW = { NONE: 0, R: 1, L: 2, D: 3, U: 4 };
function buildSea(rng) {
  const m = makeMap(W, H, T.WATER); m.solid.fill(1); m.flow = new Uint8Array(W * H); m.theme = { tier: 0 }; m.tier = 0;
  for (const [cx, cy, rx, ry] of [[10, 4, 9, 3], [34, 6, 8, 3], [56, 4, 10, 3], [76, 10, 6, 5], [4, 24, 5, 6], [30, 34, 7, 3], [62, 38, 6, 3], [14, 48, 8, 3], [70, 48, 8, 3]]) ellipse(m, cx, cy, rx, ry, T.DEEP, true); // deep trenches as soft blobs, not random squares
  const isle = (cx, cy, rx, ry, palms = 3) => {
    ellipse(m, cx, cy, rx + 1, ry + 1, T.REEF, true); ellipse(m, cx, cy, rx, ry, T.SAND, false);
    for (let i = 0; i < palms; i++) { const x = cx + Math.round((rng() - .5) * rx * 1.4), y = cy + Math.round((rng() - .5) * ry * 1.4); if (getG(m, x, y) === T.SAND && !hasObjectAt(m, x, y)) place(m, rng() < .7 ? 'palm' : 'rock', x, y); }
  };
  isle(14, 14, 5, 3, 4); isle(66, 12, 4, 3, 3); isle(70, 34, 5, 3, 4); isle(12, 38, 4, 3, 2);
  isle(40, 26, 7, 4, 2); place(m, 'house_y', 38, 24); m.specials = [{ kind: 'hermit', x: 42, y: 27 }];     // the hermit's island
  // reefs to dive at (shallow, bright water)
  for (const [cx, cy] of [[26, 8], [56, 20], [30, 44], [58, 44], [22, 28]]) ellipse(m, cx, cy, 3 + ((rng() * 2) | 0), 2, T.REEF, true);
  // shipwreck on a sandbank
  ellipse(m, 60, 30, 3, 2, T.SAND, false); place(m, 'wreck', 58, 29, { wreck: true });
  // race buoys (a loop the hermit times you on)
  [[30, 18], [50, 12], [64, 24], [52, 38], [34, 40], [20, 30]].forEach(([x, y], i) => place(m, 'buoy', x, y, { buoy: i + 1 }));
  // currents: three streams flowing towards the shore side, one against
  const stream = (y0, dir, amp, len = W) => { for (let x = 0; x < len; x++) { const y = y0 + Math.round(Math.sin(x / 7) * amp); for (let d = 0; d < 2; d++) if (inb(m, x, y + d) && getG(m, x, y + d) !== T.SAND) m.flow[idx(m, x, y + d)] = dir; } };
  stream(10, FLOW.R, 2); stream(22, FLOW.L, 3); stream(48, FLOW.R, 2);
  for (let y = 30; y < 56; y++) for (let x = 44; x < 46; x++) if (getG(m, x, y) !== T.SAND) m.flow[idx(m, x, y)] = FLOW.D;      // a lane that carries you to the dock
  for (let y = 4; y < 20; y++) for (let x = 6; x < 8; x++) m.flow[idx(m, x, y)] = FLOW.U;
  // the shore: sand strip, stone dock into the water, the lighthouse and the gate to Harbor Village
  for (let x = 0; x < W; x++) { const top = 58 - ((x >= 36 && x <= 44) ? 0 : (x % 7 === 0 ? 1 : 0)); fillG(m, x, top, 1, H - top, T.SAND, false); }
  fillG(m, CX - 1, 50, 3, 9, T.DOCK, false);
  place(m, 'lighthouse', 48, 56, { lighthouse: true }); place(m, 'lantern', 36, 57); place(m, 'lantern', 46, 57);
  for (let x = 0; x < W; x++) for (const y of [H - 2, H - 1]) if (!(x >= CX - 1 && x <= CX + 1)) place(m, 'rock', x, y);
  fillG(m, CX - 1, H - 3, 3, 3, T.SAND, false);
  exitPath(m, 's', 'village', 'default');   /* 2026-10-11: bến cảng → Làng: hết vòm cổng, đường cát ra mép + biển tên vùng */
  place(m, 'sign', CX + 3, 56, { text: { en: 'Harbor Village dock. Step off your raft here.\nThe lighthouse always points home.', vi: 'Bến cảng Làng Xuất Phát. Rời bè ở đây.\nHải đăng luôn chỉ về nhà.' } });
  m.entries = { default: { x: CX, y: 5 }, back: { x: CX, y: 56 } };       // default = adrift far out at sea, back = the dock
  m.reserved.push(m.entries.default, m.entries.back);
  /* plan-26 B0: điểm lặn (vòng xoáy phát sáng, underwater.js vẽ + xử lý E) sát mép tây cầu tàu → tầng nước 1 (u1); từ u1 ngoi lên thì đứng trên cầu tàu cạnh nó */
  m.dive = { x: CX - 3, y: 51 }; m.entries.whirl = { x: CX - 1, y: 51 }; m.reserved.push(m.entries.whirl, m.dive);
  m.npcArea = { x: 3, y: 50, w: W - 6, h: 8 };
  m.dock = { x: CX, y: 56 }; m.sea = true;
  return m;
}

// ---------------- the Kraken Trench: an underwater coral maze under the reef; the arena with the bubble cage at the top ----------------
function buildTrench(rng) {
  const m = makeMap(W, H, T.SEABED); m.theme = { tier: 0 }; m.tier = 0; m.trench = true;
  // the abyss frames the map; coral on top of it so the edge reads as a wall
  for (let x = 0; x < W; x++) for (const y of [0, 1, H - 2, H - 1]) setG(m, x, y, T.ABYSS, true);
  for (let y = 0; y < H; y++) for (const x of [0, 1, W - 2, W - 1]) setG(m, x, y, T.ABYSS, true);
  for (let x = 0; x < W; x++) for (const y of [1, H - 2]) if (!(x >= CX - 2 && x <= CX + 2 && y === H - 2)) place(m, rng() < .3 ? 'coral_t' : 'coral', x, y);
  for (let y = 2; y < H - 2; y++) for (const x of [1, W - 2]) place(m, rng() < .3 ? 'coral_t' : 'coral', x, y);
  // maze: 12 × 6 cells of 6 tiles (rows 16..52), 1-tile coral walls between cells, carved with a recursive backtracker
  const COLS = 12, ROWS = 6, CS = 6, MX = 4, MY = 16, wallT = (x, y) => { if (!hasObjectAt(m, x, y)) place(m, 'coral', x, y); };
  for (let c = 0; c <= COLS; c++) for (let y = MY; y <= MY + ROWS * CS; y++) wallT(MX + c * CS, y);
  for (let r = 0; r <= ROWS; r++) for (let x = MX; x <= MX + COLS * CS; x++) wallT(x, MY + r * CS);
  const seen = new Uint8Array(COLS * ROWS), stack = [[0, ROWS - 1]], doors = []; seen[(ROWS - 1) * COLS] = 1;
  const carve = (x, y, w, h) => { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) { const o = m.objects.find(o => o.x === i && o.y === j && (o.type === 'coral' || o.type === 'coral_t')); if (o) removeObject(m, o); } doors.push({ x, y, w, h }); };
  while (stack.length) {
    const [cx, cy] = stack[stack.length - 1];
    const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => [cx + dx, cy + dy]).filter(([x, y]) => x >= 0 && y >= 0 && x < COLS && y < ROWS && !seen[y * COLS + x]);
    if (!nb.length) { stack.pop(); continue; }
    const [nx, ny] = nb[(rng() * nb.length) | 0]; seen[ny * COLS + nx] = 1; stack.push([nx, ny]);
    if (nx !== cx) carve(MX + Math.max(cx, nx) * CS, MY + cy * CS + 2, 1, 3); else carve(MX + cx * CS + 2, MY + Math.max(cy, ny) * CS, 3, 1);
  }
  // a few extra loops so the maze is not a single corridor
  for (let k = 0; k < 6; k++) { const c = 1 + ((rng() * (COLS - 1)) | 0), r = (rng() * ROWS) | 0; carve(MX + c * CS, MY + r * CS + 2, 1, 3); }
  // openings: bottom-middle cell → entrance, top-middle cells → the arena
  carve(CX - 1, MY + ROWS * CS, 3, 1); carve(CX - 1, MY, 3, 1); carve(MX + 2 * CS + 2, MY, 3, 1); carve(MX + 9 * CS + 2, MY, 3, 1);
  m.doors = doors;
  // the arena: open sand ringed by the abyss, the bubble cage at the top, two great crystals as the only lights
  m.arena = { x: 12, y: 3, w: W - 24, h: 12 };
  for (let y = 2; y < MY; y++) for (let x = 2; x < W - 2; x++) if (x < m.arena.x || x >= m.arena.x + m.arena.w) setG(m, x, y, T.ABYSS, true);
  for (let x = m.arena.x; x < m.arena.x + m.arena.w; x++) setG(m, x, 2, T.ABYSS, true);
  place(m, 'cage', CX - 1, 3, { cage: true }); m.cage = { x: CX - 1, y: 3 };
  place(m, 'gcrystal', m.arena.x + 2, 4, { light: true }); place(m, 'gcrystal', m.arena.x + m.arena.w - 4, 4, { light: true });
  // oxygen vents in the maze cells, two wrecks with rare cards, kelp everywhere
  const cellFree = (c, r) => ({ x: MX + c * CS + 1, y: MY + r * CS + 1, w: CS - 1, h: CS - 1 });
  const cells = []; for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) cells.push([c, r]);
  cells.sort(() => rng() - .5);
  cells.slice(0, 10).forEach(([c, r]) => { const f = cellFree(c, r); place(m, 'vent', f.x + 1 + ((rng() * 3) | 0), f.y + 1 + ((rng() * 3) | 0), { vent: true }); });
  cells.slice(10, 12).forEach(([c, r]) => { const f = cellFree(c, r); place(m, 'wreck', f.x + 1, f.y + 2, { wreck: true, trench: true }); });
  scatterO(m, rng, 'kelp', .05, 2, MY, W - 4, ROWS * CS, (x, y) => getG(m, x, y) === T.SEABED);
  scatterO(m, rng, 'kelp', .03, m.arena.x, m.arena.y + 6, m.arena.w, 6, (x, y) => getG(m, x, y) === T.SEABED);
  // entrance (you sink down here from the pier) and the way back up
  fillG(m, CX - 1, H - 3, 3, 3, T.SEABED, false);
  gate(m, CX - 1, H - 2, { x: CX - 1, y: H - 1, w: 3, h: 1 }, 'sea', 'back');
  place(m, 'sign', CX + 3, H - 6, { text: { en: 'The Kraken Trench. Air runs out — breathe at the vents.\nThe bubble cage is at the far end of the maze.', vi: 'Vực Kraken. Dưỡng khí cạn dần — thở ở miệng phun.\nLồng bong bóng nằm cuối mê cung.' } });
  m.entries = { default: { x: CX, y: H - 5 }, back: { x: CX, y: H - 5 } };
  m.reserved.push(m.entries.default);
  m.npcArea = { x: 3, y: 50, w: W - 6, h: 8 }; m.specials = [];
  return m;
}

// ---------------- plan-26 B0: tầng nước 1 — Rạn San Hô Nông (u1). Đáy cát mở, cụm san hô / tảo bẹ, lỗ phun khí (+hơi thở), 2 rương,
// đấu trường phía trên có Cua Hoàng Đế canh cổng xoáy xuống u2 (cổng mở khi cua bị hạ — underwater.js). Cổng dưới cùng ngoi lên Biển (entry 'whirl').
// Vật thể mới (uwgate_sealed / uwgate / uchest / uchest_open / vent_spent) do underwater.js định nghĩa lúc nạp module; ảnh PixelLab ở zones/u1.json.
function buildU1(rng) {
  const W1 = 64, H1 = 48, C1 = 32;
  const m = makeMap(W1, H1, T.SEABED); m.theme = { tier: 0 }; m.tier = 0; m.under = true;
  for (let x = 0; x < W1; x++) for (const y of [0, 1, H1 - 2, H1 - 1]) setG(m, x, y, T.ABYSS, true);
  for (let y = 0; y < H1; y++) for (const x of [0, 1, W1 - 2, W1 - 1]) setG(m, x, y, T.ABYSS, true);
  const coral = (x, y, tall) => { if (inb(m, x, y) && !hasObjectAt(m, x, y)) place(m, tall ? 'coral_t' : 'coral', x, y); };
  for (let x = 1; x < W1 - 1; x++) { if (Math.abs(x - C1) > 3) coral(x, 1, rng() < .3); if (Math.abs(x - C1) > 2) coral(x, H1 - 2, false); }   /* viền san hô; chừa chỗ cổng xoáy (trên) và cổng ra (dưới) */
  for (let y = 2; y < H1 - 2; y++) for (const x of [1, W1 - 2]) coral(x, y, rng() < .3);
  // đấu trường của Cua Hoàng Đế: vòng san hô quanh cổng xoáy, mở ở đáy (giữa) cho người chơi bơi vào
  m.arena = { x: C1 - 9, y: 2, w: 19, h: 12 }; m.boss = { x: C1, y: 9 };
  for (let y = 2; y <= 13; y++) for (let x = C1 - 9; x <= C1 + 9; x++) {
    const k = ((x - C1) / 9) ** 2 + ((y - 6) / 7.5) ** 2; if (k < 0.82 || k > 1.12) continue;
    if (y >= 9 && Math.abs(x - C1) <= 3) continue;   /* lối vào đấu trường */
    coral(x, y, rng() < .25);
  }
  // cổng xoáy xuống tầng 2 (bị phong ấn tới khi hạ trùm canh cổng)
  place(m, 'uwgate_sealed', C1 - 1, 3, { uwgate: 'u2' }); m.ugate = { x: C1 - 1, y: 3 };
  // cổng ra (ngoi lên Biển, đứng trên cầu tàu cạnh điểm lặn)
  fillG(m, C1 - 1, H1 - 3, 3, 3, T.SEABED, false);
  gate(m, C1 - 1, H1 - 2, { x: C1 - 1, y: H1 - 1, w: 3, h: 1 }, 'sea', 'whirl');
  m.entries = { default: { x: C1, y: H1 - 7 }, back: { x: C1, y: 6 } };   /* vào từ Biển: đứng trên cổng đá 2 ô cho khỏi chồng lên vòm */
  m.reserved.push(m.entries.default, m.entries.back); for (let y = 14; y < H1 - 3; y++) m.reserved.push({ x: C1, y });   /* đại lộ giữa luôn thông */
  place(m, 'sign', C1 + 3, H1 - 6, { text: { en: 'Shallow Coral Reef — water layer 1 (level 2–3).\nUnderwater your attacks deal only 50%. Air vents give extra breath.\nThe Emperor Crab guards the whirl gate down to layer 2.', vi: 'Rạn San Hô Nông — tầng nước 1 (cấp 2–3).\nDưới nước sức đánh chỉ còn 50%. Lỗ phun khí cho thêm hơi thở.\nCua Hoàng Đế canh cổng xoáy xuống tầng 2.' } });
  // cụm san hô rải rác (không chắn đại lộ giữa, không lấn đấu trường / lối vào)
  const keepOut = (x, y) => Math.abs(x - C1) <= 3 || (x >= m.arena.x - 1 && x < m.arena.x + m.arena.w + 1 && y < m.arena.y + m.arena.h + 2) || y > H1 - 7 && Math.abs(x - C1) <= 6;
  for (let i = 0; i < 34; i++) {
    const cx = 4 + ((rng() * (W1 - 8)) | 0), cy = 4 + ((rng() * (H1 - 9)) | 0); if (keepOut(cx, cy)) continue;
    const r = 1 + ((rng() * 2) | 0);
    for (let y = cy - r; y <= cy + r; y++) for (let x = cx - r; x <= cx + r; x++) if (!keepOut(x, y) && x > 2 && y > 2 && x < W1 - 3 && y < H1 - 3 && Math.hypot(x - cx, y - cy) <= r + 0.3 && rng() < 0.7) coral(x, y, rng() < .2);
  }
  // rừng tảo nhỏ (không chắn đường)
  scatterO(m, rng, 'kelp', .045, 3, 3, W1 - 6, H1 - 6, (x, y) => getG(m, x, y) === T.SEABED && !(Math.abs(x - C1) <= 1));
  // ô trống gần nhất mà bơi tới được từ lối vào (lỗ phun khí, rương)
  const reach = computeReach(m, m.entries.default);
  const spot = (x0, y0) => { for (let r = 0; r < 8; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { const x = x0 + dx, y = y0 + dy; if (Math.max(Math.abs(dx), Math.abs(dy)) !== r || !inb(m, x, y) || isSolid(m, x, y) || hasObjectAt(m, x, y) || !reach[y * W1 + x] || !reach[(y + 1) * W1 + x]) continue; return { x, y }; } return null; };
  for (const [x, y] of [[10, 37], [54, 35], [12, 19], [52, 21]]) { const s = spot(x, y); if (s) place(m, 'vent', s.x, s.y, { vent: true }); }
  [[6, 6, 'c1'], [57, 41, 'c2']].forEach(([x, y, id]) => { const s = spot(x, y); if (s) place(m, 'uchest', s.x, s.y, { uchest: id }); });
  m.npcArea = { x: 3, y: 3, w: W1 - 6, h: H1 - 6 }; m.specials = [];
  m.pickups = [['pearl', 1, 9, 30], ['shell', 2, 50, 12], ['pearl', 1, 58, 30]];
  return m;
}

// ---------------- plan-26 B1: tầng nước 2–4. Khung chung: viền vực + vật viền, cổng ra phía dưới (lên tầng trên, entry 'back' = đứng cạnh
// cổng xoáy đã mở của tầng đó), cổng xoáy xuống tầng sau ở giữa trên (phong ấn tới khi hạ trùm canh cổng — underwater.js), lối vào ở dưới.
// m.pickups: đồ nằm sẵn dưới đáy (underwater.js rải 1 lần / save); m.secret: góc bí mật (báo khi tới lần đầu); rương mang loot riêng (o.loot).
function uwFrame(o) {
  const W = 64, H = 48, C = 32, m = makeMap(W, H, T.SEABED); m.theme = { tier: 0 }; m.tier = 0; m.under = true;
  for (let x = 0; x < W; x++) for (const y of [0, 1, H - 2, H - 1]) setG(m, x, y, T.ABYSS, true);
  for (let y = 0; y < H; y++) for (const x of [0, 1, W - 2, W - 1]) setG(m, x, y, T.ABYSS, true);
  const wall = (x, y, t) => { if (inb(m, x, y) && !hasObjectAt(m, x, y)) place(m, t || o.wall(x, y), x, y); };
  for (let x = 1; x < W - 1; x++) { if (Math.abs(x - C) > 3) wall(x, 1); if (Math.abs(x - C) > 2) wall(x, H - 2); }
  for (let y = 2; y < H - 2; y++) for (const x of [1, W - 2]) wall(x, y);
  place(m, 'uwgate_sealed', C - 1, 3, { uwgate: o.next }); m.ugate = { x: C - 1, y: 3 };
  fillG(m, C - 1, H - 3, 3, 3, T.SEABED, false);
  gate(m, C - 1, H - 2, { x: C - 1, y: H - 1, w: 3, h: 1 }, o.up, 'back');
  m.entries = { default: { x: C, y: H - 7 }, back: { x: C, y: 6 } };
  m.reserved.push(m.entries.default, m.entries.back, { x: C, y: 5 }, { x: C - 1, y: 5 }, { x: C + 1, y: 5 });
  m.npcArea = { x: 3, y: 3, w: W - 6, h: H - 6 }; m.specials = []; m.pickups = [];
  // ô trống gần (x0,y0) bơi tới được từ lối vào (gọi SAU khi dựng xong tường) — cho lỗ phun khí / rương / đồ rải
  const spot = (x0, y0, r0 = 8) => {
    const reach = m._uwReach || (m._uwReach = computeReach(m, m.entries.default));
    for (let r = 0; r < r0; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      const x = x0 + dx, y = y0 + dy; if (Math.max(Math.abs(dx), Math.abs(dy)) !== r || !inb(m, x, y + 1) || isSolid(m, x, y) || hasObjectAt(m, x, y) || reservedNear(m, x, y) || !reach[y * W + x] || !reach[(y + 1) * W + x]) continue;
      return { x, y };
    }
    return null;
  };
  const vents = list => { for (const [x, y] of list) { const s = spot(x, y); if (s) place(m, 'vent', s.x, s.y, { vent: true }); } };
  const chests = list => { for (const [x, y, id, loot] of list) { const s = spot(x, y); if (s) place(m, 'uchest', s.x, s.y, { uchest: id, loot }); } };
  const pickups = list => { for (const [id, n, x, y] of list) { const s = spot(x, y, 5); if (s) m.pickups.push([id, n, s.x, s.y]); } };
  return { m, W, H, C, wall, spot, vents, chests, pickups };
}
const uwSign = (m, x, y, en, vi) => place(m, 'sign', x, y, { text: { en, vi } });

// T2 Rừng Tảo Bẹ (u2, cấp ~4–5): rừng tảo cao che người + quái (Lươn Điện núp trong tảo), Cá Kiếm húc; Lươn Mẹ canh cổng.
// Tảo cao 'tallkelp' không chắn đường, underwater.js tự vẽ (mờ đi khi người chơi đứng sau); m.kelp = mặt nạ ô có tảo.
function buildU2(rng) {
  const { m, W, H, C, wall, vents, chests, pickups } = uwFrame({ wall: () => (rng() < .3 ? 'coral_t' : 'coral'), up: 'u1', next: 'u3' });
  m.kelp = new Uint8Array(W * H);
  m.arena = { x: C - 10, y: 2, w: 21, h: 13 }; m.boss = { x: C, y: 8 };
  for (let y = 2; y <= 14; y++) for (let x = C - 10; x <= C + 10; x++) {
    const k = ((x - C) / 10) ** 2 + ((y - 6) / 8.5) ** 2; if (k < 0.84 || k > 1.12) continue;
    if (y >= 10 && Math.abs(x - C) <= 3) continue;   /* lối vào đấu trường */
    wall(x, y);
  }
  // góc bí mật trên trái: hốc san hô kín, khe 1 ô ở đáy (x 6) bị rừng tảo che
  m.secret = { x: 2, y: 2, w: 8, h: 7 };
  for (let x = 2; x <= 10; x++) if (x !== 6) wall(x, 9);
  for (let y = 2; y <= 9; y++) wall(10, y);
  const keepOut = (x, y) => (x >= m.arena.x - 1 && x < m.arena.x + m.arena.w + 1 && y < m.arena.y + m.arena.h + 2) || (y > H - 9 && Math.abs(x - C) <= 4) || (x <= 10 && y <= 9);
  // đá san hô chắn đường rải rác
  for (let i = 0; i < 22; i++) {
    const cx = 4 + ((rng() * (W - 8)) | 0), cy = 12 + ((rng() * (H - 18)) | 0); if (keepOut(cx, cy) || Math.abs(cx - C) <= 2) continue;
    const r = 1 + ((rng() * 2) | 0);
    for (let y = cy - r; y <= cy + r; y++) for (let x = cx - r; x <= cx + r; x++) if (!keepOut(x, y) && x > 2 && y > 2 && x < W - 3 && y < H - 3 && Math.abs(x - C) > 1 && Math.hypot(x - cx, y - cy) <= r + 0.3 && rng() < 0.6) wall(x, y, rng() < .2 ? 'coral_t' : 'coral');
  }
  // rừng tảo cao (ellipse): đánh dấu m.kelp cả vùng, đặt tảo ~60 % số ô trống
  const patch = (cx, cy, rx, ry, p) => {
    for (let y = cy - ry; y <= cy + ry; y++) for (let x = cx - rx; x <= cx + rx; x++) {
      if (!inb(m, x, y) || ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 > 1) continue;
      if (y > H - 9 && Math.abs(x - C) <= 4) continue;
      m.kelp[y * W + x] = 1;
      if (!isSolid(m, x, y) && !hasObjectAt(m, x, y) && !reservedNear(m, x, y) && rng() < p) place(m, 'tallkelp', x, y, { kelp: true, ghost: true });
    }
  };
  for (const [cx, cy, rx, ry] of [[6, 12, 5, 3], [13, 30, 7, 6], [51, 30, 7, 6], [20, 20, 6, 4], [45, 20, 6, 4], [33, 29, 5, 3], [55, 41, 5, 3], [9, 41, 5, 3], [58, 12, 3, 4]]) patch(cx, cy, rx, ry, 0.62);
  uwSign(m, C + 3, H - 6, 'Kelp Forest — water layer 2 (level 4–5).\nTall kelp hides you — and the Shock Eels lurking in it.\nThe Mother Eel guards the whirl gate down to layer 3.', 'Rừng Tảo Bẹ — tầng nước 2 (cấp 4–5).\nTảo cao che bạn — và cả Lươn Điện núp trong đó.\nLươn Mẹ canh cổng xoáy xuống tầng 3.');
  vents([[8, 26], [56, 23], [22, 39], [46, 38], [40, 16]]);
  chests([[14, 16, 'c1', [['stone', 14], ['pill_s', 1], ['pearl', 1]]], [52, 44, 'c2', [['stone', 12], ['shell', 3], ['seagem', 1]]], [5, 5, 'c3', [['stone', 25], ['pill_l', 1], ['pearl', 2], ['seagem', 1]]]]);
  pickups([['pearl', 1, 13, 30], ['pearl', 1, 51, 30], ['shell', 2, 20, 20], ['pearl', 1, 45, 20], ['shell', 2, 33, 29], ['pearl', 1, 55, 41], ['pearl', 2, 4, 3], ['seagem', 1, 8, 6]]);
  return m;
}

// T3 Nghĩa Địa Tàu Đắm (u3, cấp ~6–7): mảnh xác tàu dựng thành mê cung, dòng chảy mạnh đẩy người (m.current: 1 phải · 2 trái);
// Mực Ma phun mực (tối nhẹ ngắn), Cá Mập Răng Cưa lao cắn chảy máu; Cá Mập Bọc Giáp canh cổng (húc trúng xác tàu thì hở giáp).
function buildU3(rng) {
  const wreckT = (x, y) => { const h = ((x * 73856093) ^ (y * 19349663)) >>> 0, k = (h % 100); return k < 55 ? 'wreckwall' : k < 85 ? 'wreckwall2' : 'wreckwall3'; };   /* 3 mẫu tường xác tàu chọn theo băm ô (ván thùng · thân tàu cửa sổ tròn · cột buồm gãy) */
  const { m, W, H, C, wall, vents, chests, pickups } = uwFrame({ wall: wreckT, up: 'u2', next: 'u4' });
  m.current = new Uint8Array(W * H);
  m.arena = { x: 3, y: 2, w: W - 6, h: 12 }; m.boss = { x: C, y: 9 };
  for (const [bx, by] of [[C - 13, 6], [C + 12, 6], [C - 7, 10], [C + 6, 10], [C - 19, 10], [C + 18, 10]]) for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) wall(bx + dx, by + dy);   /* khối xác tàu trong đấu trường: dụ cá mập húc vào */
  // mê cung 9 × 4 ô (mỗi ô 6), tường = mảnh xác tàu; hàng tường trên cùng (y 14) cũng là đáy đấu trường
  const COLS = 9, ROWS = 4, CS = 6, MX = 5, MY = 14;
  for (let x = 2; x < W - 2; x++) if (x < MX || x > MX + COLS * CS) wall(x, MY);
  for (let c = 0; c <= COLS; c++) for (let y = MY; y <= MY + ROWS * CS; y++) wall(MX + c * CS, y);
  for (let r = 0; r <= ROWS; r++) for (let x = MX; x <= MX + COLS * CS; x++) wall(x, MY + r * CS);
  const carve = (x, y, w, h) => { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) { const o = m.objects.find(o => o.x === i && o.y === j && o.type.startsWith('wreckwall')); if (o) removeObject(m, o); } };
  const seen = new Uint8Array(COLS * ROWS), stack = [[4, ROWS - 1]]; seen[(ROWS - 1) * COLS + 4] = 1;
  while (stack.length) {
    const [cx, cy] = stack[stack.length - 1];
    const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => [cx + dx, cy + dy]).filter(([x, y]) => x >= 0 && y >= 0 && x < COLS && y < ROWS && !seen[y * COLS + x]);
    if (!nb.length) { stack.pop(); continue; }
    const [nx, ny] = nb[(rng() * nb.length) | 0]; seen[ny * COLS + nx] = 1; stack.push([nx, ny]);
    if (nx !== cx) carve(MX + Math.max(cx, nx) * CS, MY + cy * CS + 2, 1, 3); else carve(MX + cx * CS + 2, MY + Math.max(cy, ny) * CS, 3, 1);
  }
  for (let k = 0; k < 5; k++) { const c = 1 + ((rng() * (COLS - 1)) | 0), r = (rng() * ROWS) | 0; carve(MX + c * CS, MY + r * CS + 2, 1, 3); }   /* vài vòng lặp cho đỡ thành 1 hành lang */
  carve(C - 1, MY, 3, 1); carve(C - 1, MY + ROWS * CS, 3, 1);   /* lối lên đấu trường · lối xuống bãi vào */
  for (let y = MY; y <= MY + ROWS * CS; y++) for (let x = 2; x < W - 2; x++) if ((x < MX || x > MX + COLS * CS) && !hasObjectAt(m, x, y)) setG(m, x, y, T.ABYSS, true);   /* dải ngoài mê cung = vực (không thành hành lang vòng) */
  // dòng chảy: nửa số ô mê cung có dòng ngang (hàng chẵn sang trái, hàng lẻ sang phải)
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    if (rng() < 0.45 && !(c === 0 && r === ROWS - 1)) continue;
    const dir = (r + (c === 0 ? 1 : 0)) % 2 ? 1 : 2;
    for (let y = MY + r * CS + 1; y < MY + (r + 1) * CS; y++) for (let x = MX + c * CS + 1; x < MX + (c + 1) * CS; x++) m.current[y * W + x] = dir;
  }
  // xác tàu lớn làm mốc giữa vài ô (vật chắn), ván vụn rải trang trí
  const cells = []; for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (!(c === 4)) cells.push([c, r]);
  cells.sort(() => rng() - .5);
  for (const [c, r] of cells.slice(0, 3)) place(m, 'wreck', MX + c * CS + 2, MY + r * CS + 2, { wreck: true });
  scatterO(m, rng, 'debris', .03, 3, 15, W - 6, H - 20, (x, y) => getG(m, x, y) === T.SEABED);
  // góc bí mật dưới trái: hốc kín dưới ô (0, hàng cuối), khe 1 ô ở tường đáy mê cung (x 7) — dòng chảy trong ô đó đẩy ra xa khe
  m.secret = { x: 2, y: MY + ROWS * CS + 1, w: 9, h: H - 3 - (MY + ROWS * CS + 1) };
  for (let y = MY + ROWS * CS; y <= H - 3; y++) wall(11, y);
  carve(7, MY + ROWS * CS, 1, 1);
  uwSign(m, C + 3, H - 6, 'Shipwreck Graveyard — water layer 3 (level 6–7).\nStrong currents push you through the wreck maze.\nThe Armored Shark guards the whirl gate down to layer 4.', 'Nghĩa Địa Tàu Đắm — tầng nước 3 (cấp 6–7).\nDòng chảy mạnh đẩy bạn trong mê cung xác tàu.\nCá Mập Bọc Giáp canh cổng xoáy xuống tầng 4.');
  vents([[MX + 1 * CS + 3, MY + 3], [MX + 7 * CS + 3, MY + 9], [MX + 3 * CS + 3, MY + 15], [MX + 6 * CS + 3, MY + 21], [12, 44]]);
  chests([[MX + 8 * CS + 3, MY + 3, 'c1', [['stone', 18], ['pill_s', 1], ['pearl', 1]]], [MX + 1 * CS + 3, MY + 21, 'c2', [['stone', 16], ['shell', 3], ['seagem', 1]]], [4, H - 5, 'c3', [['stone', 30], ['pill_l', 1], ['pearl', 2], ['seagem', 2]]]]);
  pickups([['pearl', 1, MX + 2 * CS + 3, MY + 3], ['pearl', 1, MX + 6 * CS + 3, MY + 3], ['shell', 3, MX + 4 * CS + 3, MY + 15], ['pearl', 1, MX + 8 * CS + 3, MY + 21], ['pearl', 2, 7, H - 4], ['seagem', 1, 9, H - 6], ['shell', 2, 50, 43]]);
  return m;
}

// T4 Hang Phát Sáng (u4, cấp ~8–9): hang tối đen (underwater.js phủ bóng tối, chỉ sáng quanh người + pha lê / lỗ phun / mồi cá đèn lồng);
// Cá Đèn Lồng dụ bằng ánh sáng rồi đớp, Rắn Biển uốn lượn cắn độc; Rắn Biển Khổng Lồ canh cổng (chỉ đầu là điểm yếu).
// Cổng xoáy cuối dẫn tới Vực Kraken · Hang Ổ (B2, buildKraken). Hang dựng bằng automat ô (cellular) + đường hầm chính bảo đảm thông.
function buildU4(rng) {
  const { m, W, H, C, wall, spot, vents, chests, pickups } = uwFrame({ wall: () => 'caverock', up: 'u3', next: 'kraken' });
  m.cave = true;
  const Y0 = 15, Y1 = H - 4, open = new Uint8Array(W * H);
  for (let y = Y0; y <= Y1; y++) for (let x = 2; x < W - 2; x++) open[y * W + x] = rng() < 0.55 ? 1 : 0;
  for (let it = 0; it < 4; it++) {
    const nx = open.slice();
    for (let y = Y0; y <= Y1; y++) for (let x = 2; x < W - 2; x++) { let n = 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if ((dx || dy) && !(open[(y + dy) * W + x + dx] && y + dy >= Y0 && y + dy <= Y1 && x + dx >= 2 && x + dx < W - 2)) n++; nx[y * W + x] = n >= 5 ? 0 : 1; }
    open.set(nx);
  }
  // đấu trường: hang lớn hình bầu dục phía trên
  for (let y = 2; y <= 14; y++) for (let x = 2; x < W - 2; x++) open[y * W + x] = ((x - C) / 22) ** 2 + ((y - 8) / 6.6) ** 2 <= 1 ? 1 : 0;
  // đường hầm chính (rộng 3) từ lối vào lên đấu trường qua các điểm ngẫu nhiên; nhánh phụ tới rương / góc bí mật
  const dig = (x0, y0, x1, y1, r) => { const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2); for (let i = 0; i <= n; i++) { const x = x0 + (x1 - x0) * i / n, y = y0 + (y1 - y0) * i / n; for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { const tx = Math.round(x + dx), ty = Math.round(y + dy); if (tx > 1 && ty > 1 && tx < W - 2 && ty < H - 2 && dx * dx + dy * dy <= r * r + 0.5) open[ty * W + tx] = 1; } } };
  const way = [[C, H - 5], [12 + ((rng() * 14) | 0), 38], [38 + ((rng() * 14) | 0), 30], [10 + ((rng() * 16) | 0), 22], [C, 14], [C, 9]];
  for (let i = 0; i < way.length - 1; i++) dig(way[i][0], way[i][1], way[i + 1][0], way[i + 1][1], 1.5);
  for (let y = H - 9; y <= H - 3; y++) for (let x = C - 3; x <= C + 3; x++) open[y * W + x] = 1;
  dig(way[1][0], 38, 6, 42, 1); dig(way[2][0], 30, 57, 36, 1); dig(way[3][0], 22, 8, 18, 1);
  // góc bí mật: hốc nhỏ trên phải, nối bằng khe 1 ô ngoằn ngoèo
  const sx = 55, sy = 19; m.secret = { x: sx - 3, y: sy - 2, w: 7, h: 5 };
  for (let y = sy - 2; y <= sy + 2; y++) for (let x = sx - 3; x <= sx + 3; x++) open[y * W + x] = 1;
  dig(way[2][0], 30, 46, 27, 0); dig(46, 27, 50, 23, 0); dig(50, 23, sx - 3, sy, 0);
  // chỉ giữ phần hang thông với lối vào (ô cô lập → đá)
  const reach = new Uint8Array(W * H), q = [[C, H - 6]]; reach[(H - 6) * W + C] = 1;
  while (q.length) { const [x, y] = q.pop(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const a = x + dx, b = y + dy, i = b * W + a; if (a < 2 || b < 2 || a >= W - 2 || b >= H - 2 || reach[i] || !open[i]) continue; reach[i] = 1; q.push([a, b]); } }
  for (let y = 2; y < H - 2; y++) for (let x = 2; x < W - 2; x++) {
    if (reach[y * W + x] || (y >= H - 3 && Math.abs(x - C) <= 1)) continue;
    if (hasObjectAt(m, x, y)) continue;
    let edge = false; for (let dy = -1; dy <= 1 && !edge; dy++) for (let dx = -1; dx <= 1; dx++) if (reach[(y + dy) * W + x + dx]) { edge = true; break; }
    if (edge) wall(x, y, rng() < .5 ? 'caverock' : 'caverock2'); else setG(m, x, y, T.ABYSS, true);
  }
  m.arena = { x: C - 22, y: 2, w: 45, h: 13 }; m.boss = { x: C, y: 8 };
  // ánh sáng: pha lê dọc hầm (sát vách), pha lê lớn trong đấu trường
  m._uwReach = null;
  const lightAt = (x0, y0, t) => { const s = spot(x0, y0, 5); if (s) place(m, t, s.x, s.y, { glow: true }); };
  for (let i = 0; i < way.length - 2; i++) { const [ax, ay] = way[i], [bx, by] = way[i + 1]; for (const k of [0.3, 0.7]) lightAt(Math.round(ax + (bx - ax) * k) + (k < 0.5 ? 2 : -2), Math.round(ay + (by - ay) * k), k < 0.5 ? 'crystal_b' : 'crystal_p'); }
  place(m, 'gcrystal', C - 15, 5, { light: true }); place(m, 'gcrystal', C + 14, 5, { light: true });
  m._uwReach = null;
  uwSign(m, C + 3, H - 6, 'Glowing Cave — water layer 4 (level 8–9).\nPitch dark: only your lamp, the crystals and the vents give light.\nNever swim toward a lonely light. The Giant Sea Serpent guards the last gate.', 'Hang Phát Sáng — tầng nước 4 (cấp 8–9).\nTối đen: chỉ có đèn của bạn, pha lê và lỗ phun khí là sáng.\nĐừng bơi về phía đốm sáng lẻ loi. Rắn Biển Khổng Lồ canh cổng cuối.');
  vents([[way[1][0], 38], [way[2][0], 30], [way[3][0], 22], [C + 8, 12]]);
  chests([[6, 42, 'c1', [['stone', 22], ['pill_s', 2], ['pearl', 1]]], [57, 36, 'c2', [['stone', 20], ['shell', 3], ['seagem', 1]]], [sx + 1, sy, 'c3', [['stone', 40], ['pill_l', 2], ['pearl', 3], ['seagem', 2]]]]);
  pickups([['pearl', 1, 8, 18], ['pearl', 1, way[2][0], 32], ['shell', 3, way[1][0], 40], ['pearl', 1, C - 12, 11], ['pearl', 2, sx - 1, sy + 1], ['seagem', 1, sx + 2, sy - 1]]);
  return m;
}

// ---------------- plan-26 B2: Vực Kraken · Hang Ổ (kraken) — đấu trường mở tối, vài cột đá; Kraken (máu thật) canh cổng xoáy lên phía trên → Pháo Đài Xealist.
// Đầu Kraken nằm gần mép trên (m.boss), xúc tu đập xuống vùng báo trước; hạ nó → gates.kraken (underwater.js) → cổng xoáy dẫn tới 'xfort'.
function buildKraken(rng) {
  const { m, W, H, C, wall, vents, chests, pickups } = uwFrame({ wall: () => (rng() < .5 ? 'caverock' : 'caverock2'), up: 'u4', next: 'xfort' });
  m.arena = { x: 3, y: 2, w: W - 6, h: 30 }; m.boss = { x: C, y: 10 };
  m.krCrack = { x: C * 16 + 8, y: 158 };   /* 2026-10-11: khe vực Kraken trồi lên (ảnh monsters.kraken_crack 80×40, monsters.js vẽ lớp nền); 5×2 ô giữa khe chắn đường */
  for (let y = 9; y <= 10; y++) for (let x = C - 2; x <= C + 2; x++) setG(m, x, y, T.SEABED, true);
  // vài cột đá / san hô trong đấu trường (chỗ núp tạm), chừa đại lộ giữa và quanh đầu Kraken
  for (const [px, py] of [[C - 18, 14], [C + 17, 14], [C - 10, 22], [C + 9, 22], [C - 22, 28], [C + 21, 28], [C - 4, 30], [C + 4, 34]]) {
    for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) if (Math.abs(px + dx - C) > 1) wall(px + dx, py + dy, rng() < .3 ? 'coral_t' : undefined);
  }
  for (let i = 0; i < 10; i++) { const x = 4 + ((rng() * (W - 8)) | 0), y = 34 + ((rng() * 8) | 0); if (Math.abs(x - C) > 4) wall(x, y); }
  uwSign(m, C + 3, H - 6, "Kraken's Lair — the deep (level 9–10).\nThe Kraken lurks in the abyss crack up top. Where the ground cracks, a tentacle bursts up — dodge it, then slash it while it is stuck.\nBeat it and the whirl above leads to Xealist's Fortress.", 'Vực Kraken · Hang Ổ — vực sâu (cấp 9–10).\nKraken núp trong khe vực phía trên. Đất nứt chỗ nào, xúc tu trồi lên đập chỗ đó — né rồi chém lúc nó còn KẸT.\nHạ nó thì cổng xoáy phía trên dẫn tới Pháo Đài Xealist.');
  vents([[10, 30], [54, 30]]);
  chests([[6, 40, 'c1', [['stone', 45], ['pill_l', 2], ['pearl', 2], ['seagem', 2]]]]);
  pickups([['pearl', 1, 14, 38], ['seagem', 1, 50, 38], ['shell', 3, 40, 26]]);
  return m;
}
// ---------------- plan-26 B2: Pháo Đài Xealist (xfort) — sảnh nhỏ (dưới) → phòng ngai (trên). Tường đá đen + pha lê hồng (PixelLab td8, zones/xfort.json).
// Phe Noxx: trùm cuối Xealist (monsters.js ai 'xealist', 3 pha). Phe Xealist: không quái, Xealist đứng ở ngai (fortress.js).
function buildXfort(rng) {
  const { m, W, H, C, wall, vents, chests } = uwFrame({ wall: () => (rng() < .25 ? 'xwall2' : 'xwall'), up: 'kraken', next: 'none' });
  const g0 = m.objects.find(o => o.uwgate); if (g0) removeObject(m, g0); m.ugate = null;   /* điểm cuối: không có cổng xoáy đi tiếp */
  m.xfort = true; m.entries.back = { x: C, y: H - 7 };
  const HALL = 33;
  for (let x = 2; x < W - 2; x++) if (Math.abs(x - C) > 2) wall(x, HALL);   /* tường ngăn sảnh / phòng ngai, cửa rộng 5 ô ở giữa */
  for (let y = HALL + 1; y < H - 2; y++) for (const x of [C - 9, C + 9]) wall(x, y);   /* sảnh hẹp */
  for (let y = HALL + 1; y < H - 2; y++) for (let x = 2; x < W - 2; x++) if ((x < C - 9 || x > C + 9) && !hasObjectAt(m, x, y)) setG(m, x, y, T.ABYSS, true);
  m.arena = { x: 3, y: 2, w: W - 6, h: HALL - 2 }; m.boss = { x: C, y: 10 }; m.throne = { x: C - 1, y: 4 };
  place(m, 'xthrone', C - 1, 4, { throne: true });
  for (const [x, y] of [[C - 12, 6], [C + 11, 6], [C - 20, 14], [C + 19, 14], [C - 20, 26], [C + 19, 26], [C - 6, 30], [C + 5, 30]]) place(m, 'xcrystal', x, y, { glow: true });
  for (const [x, y] of [[C - 9, HALL - 6], [C + 8, HALL - 6]]) for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) wall(x + dx, y + dy);
  uwSign(m, C + 3, H - 6, "Xealist's Fortress.\nBlack stone, pink crystal — and somewhere above, the one who turned Lyron to stone.", 'Pháo Đài Xealist.\nĐá đen, pha lê hồng — và đâu đó phía trên, kẻ đã biến Lyron thành đá.');
  for (const [x, y] of [[C - 7, HALL + 2], [C + 6, HALL + 2]]) place(m, 'xcrystal', x, y, { glow: true });   /* 2 cột pha lê hai bên cửa phòng ngai */
  vents([[C - 6, 40], [C + 6, 40]]);
  chests([[C - 7, 44, 'c1', [['stone', 60], ['pill_l', 2], ['seagem', 3]]]]);
  return m;
}

// ---------------- plan-28 (anh duyệt 2026-10-12): ĐƯỜNG ĐÈO giữa các vùng — road1 (Làng → M1) … road9 (M8 → M9).
// Đường hẹp đi DỌC LÊN: vào ở chân (entry 'default', từ vùng dưới), ra ở đỉnh (sang vùng trên, entry 'default'); đi ngược vào từ đỉnh (entry 'back').
// Hai bên = vật viền / trang trí của VÙNG DƯỚI (dùng lại ảnh PixelLab của vùng đó, gói zones/roadN.json kế thừa gói vùng dưới).
// Giữa đường có KHOẢNG SÂN rộng hơn: bạn tập cơ bắp đứng chắn trước CỔNG ĐÈO (pass_gate, PixelLab) — lần đầu đi lên phải thắng mới mở (road.js).
// m.roadInfo: hình học cho road.js / spar.js · m.monSpots: chỗ quái đường (monsters.js hồi sinh tại chỗ sau 10 s).
export const ROAD = { len: 40, half: 4, clearHalf: 8, clearH: 11, W: 32 };   /* len = số hàng đường (chỉnh được; rủi ro trong plan: có thể rút còn ~25) */
export const ROADS = [
  { id: 'road1', lower: 'village', upper: 'm1', who: ['caro'], max: 0 },
  { id: 'road2', lower: 'm1', upper: 'm2', who: ['dauvuong'], max: 0 },
  { id: 'road3', lower: 'm2', upper: 'm3', who: ['maoga'], max: 0 },
  { id: 'road4', lower: 'm3', upper: 'm4', who: ['batup'], max: 1 },
  { id: 'road5', lower: 'm4', upper: 'm5', who: ['riatrau'], max: 1 },
  { id: 'road6', lower: 'm5', upper: 'm6', who: ['bonggon'], max: 1 },
  { id: 'road7', lower: 'm6', upper: 'm7', who: ['bittai'], max: 2 },
  { id: 'road8', lower: 'm7', upper: 'm8', who: ['cambua'], max: 2 },
  { id: 'road9', lower: 'm8', upper: 'm9', who: ['lucsi', 'biker'], max: 2 },
];
/* cổng đèo: bản vẽ code chỉ là dự phòng khi chưa nạp gói PixelLab (zones/road/obj/pass_gate*.png) */
defObj('pass_gate', 48, 40, 3, 1, g => { px1(g, 2, 8, '#3a2618', 8, 32); px1(g, 38, 8, '#3a2618', 8, 32); px1(g, 3, 9, '#8a5a32', 6, 30); px1(g, 39, 9, '#8a5a32', 6, 30); px1(g, 10, 16, '#2a1a10', 28, 24); px1(g, 11, 17, '#b27b3a', 26, 22); px1(g, 11, 22, '#5a5a62', 26, 2); px1(g, 11, 33, '#5a5a62', 26, 2); px1(g, 0, 4, '#5a3a20', 48, 6); });
defObj('pass_gate_open', 48, 40, 3, 1, g => { px1(g, 2, 8, '#3a2618', 8, 32); px1(g, 38, 8, '#3a2618', 8, 32); px1(g, 3, 9, '#8a5a32', 6, 30); px1(g, 39, 9, '#8a5a32', 6, 30); px1(g, 10, 16, '#2a1a10', 4, 24); px1(g, 34, 16, '#2a1a10', 4, 24); px1(g, 0, 4, '#5a3a20', 48, 6); }, { solid: false });
/* vách đá cao 2 ô (PixelLab td8 hướng nam, zones/road/obj/cliff_*_t8.png) cho đèo vùng đá: mỏ (M4, M5) · núi lửa (M7). Bản code chỉ là dự phòng. */
defObj('cliff_mine', 16, 32, 1, 1, g => { px1(g, 1, 4, '#3a2c22', 14, 28); px1(g, 2, 5, '#8a7a68', 12, 26); px1(g, 2, 12, '#6a5a4a', 12, 2); px1(g, 2, 21, '#6a5a4a', 12, 2); });
defObj('cliff_basalt', 16, 32, 1, 1, g => { px1(g, 1, 4, '#1a1418', 14, 28); px1(g, 2, 5, '#3a3236', 12, 26); px1(g, 6, 10, '#e8541e', 1, 8); });
const ROAD_WALL = { m4: 'cliff_mine', m5: 'cliff_mine', m7: 'cliff_basalt' };
/* 2026-10-12 tối anh: viền đèo M1 (road2) toàn đá xếp ô trông rối → pha rừng cọ + bụi (ảnh PixelLab sẵn có: m1 palm/rock, làng bush — đều có ảnh hư/đổ nát riêng).
   ROAD_MIX: [vật, tỉ lệ] cho khối viền (trừ 2 cột mép); ROAD_LOW: vật thấp xen kẽ ngay dưới chỗ đi được (không che người). */
const ROAD_MIX = { m1: [['palm', 0.5], ['bush', 0.3], ['rock', 0.2]] };
const ROAD_LOW = { m1: ['bush', 'bush', 'rock'] };
function buildRoad(R, idx) {
  return rng => {
    const t = themes[R.lower], W = ROAD.W, C = W >> 1, len = ROAD.len, H = len + 6, hw = ROAD.half, ch = ROAD.clearHalf;
    const m = makeMap(W, H, t.base); m.theme = { tier: t.tier || 0 }; m.tier = t.tier || 0; m.road = true;
    for (const [tile, p] of t.scatter || []) scatterG(m, rng, tile, p, (x, y) => getG(m, x, y) === t.base);
    const C0 = Math.floor(H / 2) - (ROAD.clearH >> 1), C1 = C0 + ROAD.clearH - 1, G = C0 - 1;   /* sân: hàng C0..C1, cổng đèo ở hàng G (sát mép trên sân) */
    const walk = new Uint8Array(W * H), at = (x, y) => y * W + x;
    for (let y = 0; y < H; y++) for (let x = C - hw; x <= C + hw; x++) walk[at(x, y)] = 1;
    for (let y = C0; y <= C1; y++) for (let x = C - ch; x <= C + ch; x++) { const k = Math.min(y - C0, C1 - y); if (Math.abs(x - C) <= ch - (k === 0 ? 2 : 0)) walk[at(x, y)] = 1; }   /* sân bo góc */
    for (let x = C - hw; x <= C + hw; x++) if (Math.abs(x - C) > 1) walk[at(x, G)] = 0;   /* hàng cổng: chỉ chừa 3 ô cho cổng đèo */
    for (let y = 0; y < 2; y++) for (let x = C - hw; x <= C + hw; x++) if (Math.abs(x - C) > 1) walk[at(x, y)] = 0;   /* 2 đầu: đường 3 ô ra mép */
    /* 2026-10-12 tối anh: TÚI TRỐNG hai bên đường — chỗ bầy quái NHỎ tụ để farm kinh nghiệm (monsters.js SMALL[roadN]).
       4 túi 5×4 ô bo góc nối thẳng vào mép đường, xa sân đấu bạn tập + cổng đèo (2 túi dưới sân, 2 túi trên cổng); vẫn cách mép bản đồ ≥ 7 ô (viền kín). */
    const PW = 5, PH = 4, pockets = [{ x0: C - hw - PW, y0: C1 + 3 }, { x0: C + hw + 1, y0: H - 9 }, { x0: C - hw - PW, y0: 4 }, { x0: C + hw + 1, y0: G - 8 }].filter(q => q.y0 >= 3 && q.y0 + PH <= H - 4 && (q.y0 + PH < G - 1 || q.y0 > C1 + 1));
    for (const q of pockets) for (let y = q.y0; y < q.y0 + PH; y++) for (let x = q.x0; x < q.x0 + PW; x++) { const cx0 = x === q.x0 || x === q.x0 + PW - 1, cy0 = y === q.y0 || y === q.y0 + PH - 1; if (!(cx0 && cy0)) walk[at(x, y)] = 1; }
    for (let y = H - 2; y < H; y++) for (let x = C - hw; x <= C + hw; x++) if (Math.abs(x - C) > 1) walk[at(x, y)] = 0;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (!walk[at(x, y)]) setSolid(m, x, y, 1);
    for (let y = C0 + 1; y < C1; y++) for (let x = C - ch + 1; x <= C + ch - 1; x++) if (walk[at(x, y)] && rng() < 0.5) setG(m, x, y, t.plot || t.path, false);   /* sân nện đất loang lổ */
    for (const q of pockets) for (let y = q.y0; y < q.y0 + PH; y++) for (let x = q.x0; x < q.x0 + PW; x++) if (walk[at(x, y)] && rng() < 0.35) setG(m, x, y, t.plot || t.path, false);   /* túi farm: đất giẫm loang lổ */
    for (let y = 0; y < H; y++) for (let x = C - 1; x <= C + 1; x++) if (walk[at(x, y)]) { setG(m, x, y, t.path, false); m.roads[at(x, y)] = 1; }   /* lối mòn 3 ô giữa đường */
    m.gates.push({ x: C - 1, y: 0, w: 3, h: 2, to: R.upper, entry: 'default', requires: null, path: true });
    m.gates.push({ x: C - 1, y: H - 1, w: 3, h: 1, to: R.lower, entry: 'back', requires: null, path: true });
    m.entries = { default: { x: C, y: H - 4 }, back: { x: C, y: 3 } };
    m.reserved.push(m.entries.default, m.entries.back);
    for (let y = 2; y < H - 2; y++) m.reserved.push({ x: C, y });
    m.roadInfo = { idx, id: R.id, lower: R.lower, upper: R.upper, who: R.who, max: R.max, H, C, clear: { x0: C - ch, x1: C + ch, y0: C0, y1: C1 }, gate: { x: C - 1, y: G }, post: { x: C, y: C0 + 1 },
      aside: [{ x: C - ch + 2, y: C0 + 2 }, { x: C + ch - 2, y: C0 + 2 }], ring: { x: C * 16 + 8, y: Math.round(((C0 + C1) / 2) * 16 + 8), r: ch * 16 - 8 } };
    m.passGate = place(m, 'pass_gate', C - 1, G, { passGate: true });
    const bt = typeof t.border === 'function' ? t.border : () => t.border;
    const near = (x, y) => { for (let d = 1; d <= 3; d++) for (const [dx, dy] of [[d, 0], [-d, 0], [0, d], [0, -d]]) { const a = x + dx, b = y + dy; if (a >= 0 && b >= 0 && a < W && b < H && walk[at(a, b)]) return d; } return 9; };
    const deco = (t.decor || []).map(d => d[0]).filter(o => O[o] && O[o].solid !== false && O[o].fw === 1 && O[o].fh === 1 && !/ore|obsidian|crate/.test(o));
    const one = o => O[o] && O[o].fw === 1 && O[o].fh === 1;
    const decN = (t.decor || []).map(d => d[0]).concat([bt(0, 10, rng)]), low = ['bush', 'rock', 'boulder', 'rock_s'].find(o => decN.includes(o) && one(o)) || 'rock';   /* vật thấp hợp chủ đề vùng dưới */
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (walk[at(x, y)] || hasObjectAt(m, x, y)) continue;
      const d = near(x, y), edge = x < 2 || x > W - 3, gateRow = y === G;
      /* 2026-10-12 anh: cả khối rừng / đá đều phản ứng khi bị văng vào → MỌI ô không đi được đều có vật (không còn ô cứng trống vô hình) */
      let type = bt(x, y < 2 ? 0 : y > H - 3 ? H - 1 : 10, rng); if (!gateRow && d > 1 && deco.length && rng() < 0.3) type = deco[(rng() * deco.length) | 0];
      if (!one(type)) type = one('rock') ? 'rock' : 'tree';
      if (ROAD_MIX[R.lower] && !edge) { const mx = ROAD_MIX[R.lower]; let r0 = rng(); type = mx[mx.length - 1][0]; for (const [o, p] of mx) { if (r0 < p) { type = o; break; } r0 -= p; } }   /* 2026-10-12 tối anh: viền M1 toàn đá rối mắt → pha cọ + bụi */
      if (ROAD_WALL[R.lower] && (d <= 2 || edge || gateRow) && rng() < 0.85) type = ROAD_WALL[R.lower];   /* đèo vùng đá: vách đá cao sát đường */
      if (y > 0 && (walk[at(x, y - 1)] || (y > 1 && walk[at(x, y - 2)])) && (O[type].h || 16) > 20) type = ROAD_LOW[R.lower] ? ROAD_LOW[R.lower][(x + y) % ROAD_LOW[R.lower].length] : low;   /* ngay DƯỚI chỗ đi được: vật thấp (bụi / đá) — tán cây cao vẽ sau sẽ che mất người đứng sát mép dưới (QA 2026-10-12) */
      place(m, type, x, y);
    }
    if (t.light && one(t.light)) for (const x of [C - ch + 1, C + ch - 1]) if (!hasObjectAt(m, x, C0)) place(m, t.light, x, C0);   /* đèn 2 góc trên sân */
    const ZU = ZONES[R.upper], ZL = ZONES[R.lower];
    for (const [x, y] of [[C + 2, 2], [C - 2, H - 4]]) for (const o of m.objects.filter(o => o.x === x && o.y === y)) removeObject(m, o);
    place(m, 'exit_sign', C + 2, 2, { exit: { to: R.upper, requires: null, name: ZU.name, ar: ' ↑' }, text: S(ZU.name.en + ' ↑', ZU.name.vi + ' ↑') });
    place(m, 'exit_sign', C - 2, H - 4, { exit: { to: R.lower, requires: null, name: ZL.name, ar: ' ↓' }, text: S(ZL.name.en + ' ↓', ZL.name.vi + ' ↓') });
    m.reserved.push({ x: C + 2, y: 2 }, { x: C - 2, y: H - 4 });
    const n = 4 + (idx >= 4 ? 1 : 0) + (idx >= 7 ? 1 : 0), lowN = Math.ceil(n / 2), upN = n - lowN, spots = [];   /* quái đường: 4–6 chỗ cố định ngoài sân */
    for (let i = 0; i < lowN; i++) spots.push({ x: C + (i % 2 ? 3 : -3), y: Math.round(C1 + 4 + (H - 8 - (C1 + 4)) * (i + 0.5) / lowN) });
    for (let i = 0; i < upN; i++) spots.push({ x: C + (i % 2 ? -3 : 3), y: Math.round(5 + (G - 3 - 5) * (i + 0.5) / upN) });
    /* 2026-10-12 tối anh: quái NHỎ để farm — 3 con mỗi túi trống (rải 3 góc túi), small: true → monsters.js SMALL[roadN], hồi sinh nhanh; nằm SAU quái thường trong mảng (test dùng spots()[0] = quái thường) */
    for (const q of pockets) for (const [dx, dy] of [[1, 1], [3, 1], [2, 2]]) spots.push({ x: q.x0 + dx, y: q.y0 + dy, small: true });
    m.monSpots = spots; m.farmPockets = pockets.map(q => ({ x: q.x0, y: q.y0, w: PW, h: PH }));
    m.npcArea = { x: C - 3, y: 3, w: 7, h: H - 6 }; m.specials = [];
    return m;
  };
}

export const ZONES = {
  u1: { id: 'u1', lv: -2, order: 98, hidden: true, under: true, uLv: [2, 3], name: S('Shallow Coral Reef', 'Rạn San Hô Nông'), tremor: 0, build: buildU1,
    systems: ['underwater', 'petgun', 'monsters', 'hero', 'drops', 'vfx', 'pet', 'photo'], tint: 'rgba(40,170,200,.12)',   /* hero phải có trong danh sách, không thì máu/ngất không chạy (bẫy cũ của Vực Kraken) */
    flavor: S(['The water is clear here. The crabs are not friendly.'], ['Nước ở đây trong vắt. Mấy con cua thì không thân thiện.']) },
  /* plan-26 B1: tầng nước 2–4 (cổng xoáy nối nhau; lặn thẳng xuống tầng đã tới từ điểm lặn ở Biển) */
  u2: { id: 'u2', lv: -2, order: 98.2, hidden: true, under: true, uLv: [4, 5], name: S('Kelp Forest', 'Rừng Tảo Bẹ'), tremor: 0, build: buildU2,
    systems: ['underwater', 'petgun', 'monsters', 'hero', 'drops', 'vfx', 'pet', 'photo'], tint: 'rgba(30,150,70,.13)',
    flavor: S(['Something moves in the kelp. It is not the current.'], ['Có gì đó động đậy trong tảo. Không phải dòng nước đâu.']) },
  u3: { id: 'u3', lv: -2, order: 98.3, hidden: true, under: true, uLv: [6, 7], name: S('Shipwreck Graveyard', 'Nghĩa Địa Tàu Đắm'), tremor: 0, build: buildU3,
    systems: ['underwater', 'petgun', 'monsters', 'hero', 'drops', 'vfx', 'pet', 'photo'], tint: 'rgba(40,70,70,.20)',
    flavor: S(['Every ship down here was sunk by something with teeth.'], ['Con tàu nào dưới này cũng bị thứ có răng đánh chìm.']) },
  u4: { id: 'u4', lv: -2, order: 98.4, hidden: true, under: true, uLv: [8, 9], name: S('Glowing Cave', 'Hang Phát Sáng'), tremor: 0, build: buildU4,
    systems: ['underwater', 'petgun', 'monsters', 'hero', 'drops', 'vfx', 'pet', 'photo'], tint: 'rgba(10,20,60,.18)',
    flavor: S(['If a light blinks back at you, swim the other way.'], ['Đốm sáng nào chớp lại với bạn thì bơi hướng khác.']) },
  /* plan-26 B2: hang ổ Kraken (trùm giữa) + Pháo Đài Xealist (trùm cuối phe Noxx / căn cứ phe Xealist) */
  kraken: { id: 'kraken', lv: -2, order: 98.5, hidden: true, under: true, uLv: [9, 10], name: S("Kraken's Lair", 'Vực Kraken · Hang Ổ'), tremor: 0, build: buildKraken,
    systems: ['underwater', 'petgun', 'monsters', 'hero', 'drops', 'vfx', 'pet', 'photo'], tint: 'rgba(8,10,40,.26)', vignette: true,
    flavor: S(['The water tastes of ink. Something huge breathes above you.'], ['Nước có vị mực. Có thứ gì khổng lồ đang thở phía trên bạn.']) },
  xfort: { id: 'xfort', lv: -2, order: 98.6, hidden: true, under: true, uLv: [10, 10], name: S("Xealist's Fortress", 'Pháo Đài Xealist'), tremor: 0, build: buildXfort,
    systems: ['underwater', 'petgun', 'monsters', 'hero', 'drops', 'vfx', 'pet', 'photo', 'fortress'], tint: 'rgba(40,10,40,.22)', vignette: true,
    flavor: S(['Pink light, black stone. Even the water feels watched.'], ['Ánh hồng, đá đen. Đến nước ở đây cũng như đang bị theo dõi.']) },
  arena: { id: 'arena', lv: -2, order: 0.5, hidden: true, name: S('Underground Ring', 'Sàn Đấu Ngầm'), tremor: 0, build: buildArena, arena: true,
    systems: ['hero', 'monsters', 'knock', 'spar', 'xealist', 'arena', 'drops', 'vfx', 'pet', 'photo'], tint: 'rgba(30,12,4,.28)', vignette: true,
    flavor: S(['Sand on the floor, sweat in the air. Somebody is always training down here.'], ['Cát dưới chân, mồ hôi trong không khí. Dưới này lúc nào cũng có người đang tập.']) },
  rift1: { id: 'rift1', lv: -2, order: 0.55, hidden: true, rift: true, name: S('Magnitude Rift · Shadow Rocky', 'Khe Nứt · Hắc Rocky'), tremor: 0, build: buildRift1,
    systems: ['hero', 'monsters', 'knock', 'arena', 'hacrocky', 'drops', 'vfx', 'pet', 'photo'], tint: 'rgba(60,0,90,.38)', vignette: true,
    flavor: S(['Your own shadow looks back at you. It has your Rocky’s eyes — only white.'], ['Bóng của chính bạn nhìn lại. Nó có đôi mắt của Rocky — chỉ là trắng dã.']) },
  rift2: { id: 'rift2', lv: -2, order: 2.55, hidden: true, rift: true, name: S('Magnitude Rift · Thunder Bronze Drum', 'Khe Nứt · Trống Đồng Thiên Lôi'), tremor: 0, build: buildRift2,
    systems: ['hero', 'monsters', 'knock', 'arena', 'trongdong', 'drops', 'vfx', 'pet', 'photo'], tint: 'rgba(40,24,6,.30)', vignette: true,
    flavor: S(['Every beat of the drum shakes dust from the ceiling.'], ['Mỗi nhịp trống làm bụi trên trần rơi lả tả.']) },
  rift3: { id: 'rift3', lv: -2, order: 6.55, hidden: true, rift: true, name: S('Magnitude Rift · Mirror Queen', 'Khe Nứt · Gương Địa Chấn'), tremor: 0, build: buildRift3,
    systems: ['hero', 'monsters', 'knock', 'arena', 'guong', 'drops', 'vfx', 'pet', 'photo'], tint: 'rgba(30,20,70,.24)', vignette: true,
    flavor: S(['Every mirror here shows you a second too late.'], ['Mọi tấm gương ở đây đều phản chiếu bạn chậm mất một giây.']) },
  rift4: { id: 'rift4', lv: -2, order: 4.55, hidden: true, rift: true, name: S('Magnitude Rift · Void Devourer', 'Khe Nứt · Hố Đen Địa Tâm'), tremor: 0, build: buildRift4,
    systems: ['hero', 'monsters', 'knock', 'arena', 'hoden', 'drops', 'vfx', 'pet', 'photo'], tint: 'rgba(20,6,40,.36)', vignette: true,
    flavor: S(['Pebbles roll uphill here — toward the dark.'], ['Sỏi ở đây lăn ngược dốc — về phía bóng tối.']) },
  rift5: { id: 'rift5', lv: -2, order: 7.55, hidden: true, rift: true, name: S('Magnitude Rift · Broken-Spring Clock', 'Khe Nứt · Đồng Hồ Đứt Dây'), tremor: 0, build: buildRift5,
    systems: ['hero', 'monsters', 'knock', 'arena', 'dongho', 'drops', 'vfx', 'pet', 'photo'], tint: 'rgba(40,24,4,.26)', vignette: true,
    flavor: S(['Every gear in this forge turns the wrong way.'], ['Mọi bánh răng trong lò rèn này đều quay ngược chiều.']) },
  trench: { id: 'trench', lv: -2, order: 99, hidden: true, name: S('Kraken Trench', 'Vực Kraken'), tremor: 0, build: buildTrench, trench: true, systems: ['trench', 'storyLand', 'photo', 'pet'], tint: 'rgba(0,10,40,.35)', vignette: true,
    flavor: S(['Nothing lives down here but what the Kraken keeps.'], ['Dưới này không có gì sống ngoài thứ Kraken giữ.']) },
  sea: { id: 'sea', lv: -2, order: -1, name: S('Sea of Origins', 'Biển Khởi Nguồn'), tremor: 0, build: buildSea, sea: true,
    flavor: S(['The sea brought you here. It will take you home too.', 'Read the currents. They know the way to the dock.', 'Every artist washed up on this shore once.'], ['Biển đưa bạn tới đây. Biển cũng sẽ đưa bạn về.', 'Đọc dòng chảy đi. Nó biết đường ra bến.', 'Nghệ sĩ nào cũng từng dạt vào bờ này.']) },
  village: { id: 'village', lv: -1, order: 0, name: S('Harbor Village', 'Làng Xuất Phát'), tremor: 0, build: build('village'),
    flavor: S(['I have not earned a Magnitude role yet. Someday.', "Quiet here, isn't it? Wait until you reach the fault lines.", 'Every big artist started in this village.'], ['Mình chưa có role Magnitude. Một ngày nào đó.', 'Ở đây yên bình nhỉ? Đợi tới khi bạn đến các đứt gãy xem.', 'Nghệ sĩ lớn nào cũng khởi đầu từ ngôi làng này.']) },
  m1: { id: 'm1', lv: 1, order: 1, name: S('M1 · Calm Shoals', 'M1 · Bãi Bồi Yên'), tremor: 0.05, build: build('m1'), quest: { meet: 5 },
    flavor: S(['The ground is calm at Magnitude 1. Enjoy it — it will not stay that way.', 'First badge is the hardest. Or the easiest. I forget.', 'The sea here never trembles. Yet.'], ['Đất ở Magnitude 1 còn lặng lắm. Tận hưởng đi — không lâu đâu.', 'Huy hiệu đầu tiên là khó nhất. Hoặc dễ nhất. Mình quên rồi.', 'Biển ở đây chưa bao giờ rung. Chưa thôi.']) },
  m2: { id: 'm2', lv: 2, order: 2, name: S('M2 · Trembling Village', 'M2 · Làng Rung Khẽ'), tremor: 0.1, build: build('m2'), quest: { meet: 5 },
    flavor: S(['Feel that? The lanterns sway a little every night now.', 'The market sells tremor shards. Well — trades them. For stories.', 'Cracks in the road appeared last week. Nobody minds.'], ['Cảm nhận được không? Đèn lồng giờ đêm nào cũng đung đưa.', 'Chợ ở đây bán mảnh dư chấn. À, đổi thôi. Đổi lấy chuyện kể.', 'Tuần trước đường nứt vài chỗ. Chẳng ai để ý.']) },
  m3: { id: 'm3', lv: 3, order: 3, name: S('M3 · Cracked Forest', 'M3 · Rừng Nứt'), tremor: 0.15, build: build('m3'), quest: { meet: 6, tasks: [{ id: 'fires', n: 3 }] }, tint: 'rgba(10,50,20,.12)',
    flavor: S(['Follow the roads. The cracks are deeper than they look.', 'I got lost here for a whole day once. Best day of my life.', 'The trees lean toward the core. All of them.'], ['Đi theo đường. Vết nứt sâu hơn vẻ ngoài đấy.', 'Có lần mình lạc ở đây cả ngày. Ngày đẹp nhất đời.', 'Cây ở đây nghiêng hết về phía lõi. Tất cả.']) },
  m4: { id: 'm4', lv: 4, order: 4, name: S('M4 · Rockfall Mine', 'M4 · Mỏ Đá Lở'), tremor: 0.2, build: build('m4'), quest: { meet: 6, tasks: [{ id: 'ore', n: 3 }] }, tint: 'rgba(10,5,25,.35)', hazard: 'rock',
    flavor: S(['Mind the ceiling. It drops a stone every tremor.', 'We dig for shards down here. Real ones.', 'Dark, dusty, shaking. I love it.'], ['Coi chừng trần hầm. Mỗi đợt rung là rơi một cục.', 'Tụi mình đào mảnh dư chấn ở đây. Hàng thật.', 'Tối, bụi, rung. Mình mê.']) },
  m5: { id: 'm5', lv: 5, order: 5, name: S('M5 · Fault Canyon', 'M5 · Hẻm Đứt Gãy'), tremor: 0.3, build: build('m5'), quest: { meet: 6, tasks: [{ id: 'levers', n: 2 }] }, tint: 'rgba(120,70,20,.12)',
    flavor: S(['The canyon split in one night. Magnitude 5 does that.', 'Cross the bridge. Do not look down. Okay, look a little.', 'Halfway to the core. The ground knows it.'], ['Hẻm núi tách ra chỉ trong một đêm. Magnitude 5 là vậy.', 'Qua cầu đi. Đừng nhìn xuống. Thôi, nhìn chút cũng được.', 'Nửa đường tới lõi rồi. Mặt đất cũng biết.']) },
  m6: { id: 'm6', lv: 6, order: 6, name: S('M6 · Leaning City', 'M6 · Thành Nghiêng'), tremor: 0.35, build: build('m6'), quest: { meet: 7, tasks: [{ id: 'quiz', n: 1 }] }, tint: 'rgba(60,50,80,.15)',
    flavor: S(['The tower leans one more degree every season.', 'This city was built by artists. You can tell.', 'They say the library holds every artwork ever posted. They lie. Mostly.'], ['Tháp nghiêng thêm một độ mỗi mùa.', 'Thành này do nghệ sĩ xây. Nhìn là biết.', 'Người ta bảo thư viện giữ mọi bức tranh từng đăng. Nói dối. Gần hết.']) },
  m7: { id: 'm7', lv: 7, order: 7, name: S('M7 · Sleeping Volcano', 'M7 · Núi Lửa Ngủ'), tremor: 0.5, build: build('m7'), quest: { meet: 7, tasks: [{ id: 'obsidian', n: 3 }] }, tint: 'rgba(200,40,0,.15)', hazard: 'lava',
    flavor: S(["It's asleep. Mostly. Don't wake it.", 'Lava on both sides, shaking underneath. Just another Tuesday at M7.', 'Ash gets everywhere. Even in the art.'], ['Nó đang ngủ. Gần như vậy. Đừng đánh thức.', 'Dung nham hai bên, dưới chân rung. Ngày thường ở M7 thôi.', 'Tro bay khắp nơi. Cả vào tranh.']) },
  m8: { id: 'm8', lv: 8, order: 8, name: S('M8 · Epicenter Peak', 'M8 · Đỉnh Tâm Chấn'), tremor: 0.7, build: build('m8'), quest: { meet: 8, tasks: [{ id: 'elders', n: 3 }] }, tint: 'rgba(20,30,80,.3)', lightning: true, elders: 3,
    flavor: S(['Lightning strikes the peak every few minutes. We time our posts by it.', 'Only 138 of us hold Magnitude 8. Fewer stay up here.', 'One more gate. Then the core.'], ['Sét đánh đỉnh núi vài phút một lần. Tụi mình canh đăng bài theo đó.', 'Chỉ 138 người giữ Magnitude 8. Ở lại trên này còn ít hơn.', 'Một cổng nữa thôi. Rồi tới lõi.']) },
  m9: { id: 'm9', lv: 9, order: 9, name: S('M9 · Encrypted Core', 'M9 · Lõi Mã Hóa'), tremor: 1.0, build: build('m9'), quest: { meet: 15, leaders: true }, tint: 'rgba(60,0,90,.35)', vignette: true,
    flavor: S(['Encrypted. Everything here is encrypted. Even the small talk.', 'Seventy-seven of us reached 9.0. Fifteen Leaders keep the core.', 'You made it. Find all fifteen Leaders and the core will open.'], ['Mã hóa. Ở đây cái gì cũng mã hóa. Cả chuyện phiếm.', 'Bảy mươi bảy người đạt 9.0. Mười lăm Leader giữ lõi.', 'Bạn tới rồi. Tìm đủ mười lăm Leader thì lõi sẽ mở.']) },
};
/* plan-28: 9 đoạn đèo (ẩn khỏi bản đồ thế giới; lv -2 như Sàn Đấu Ngầm → không dân). Tên = 'Đèo → vùng trên' (biển chỉ đường ở vùng dưới đọc tên này). */
ROADS.forEach((R, i) => { const up = ZONES[R.upper];
  ZONES[R.id] = { id: R.id, lv: -2, order: i + 0.6, hidden: true, road: R, roadIdx: i + 1, name: S('Pass → ' + up.name.en, 'Đèo → ' + up.name.vi), tremor: 0, build: buildRoad(R, i + 1),
    systems: ['hero', 'monsters', 'knock', 'spar', 'road', 'drops', 'vfx', 'pet', 'photo', 'petgun'], tint: ZONES[R.lower].tint,
    flavor: S(['The pass is narrow. Someone big is waiting halfway up.'], ['Đường đèo hẹp. Lưng chừng dốc có người to con đang chờ.']) }; });
export const ZONE_LIST = Object.values(ZONES).sort((a, b) => a.order - b.order);
