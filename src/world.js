// world.js — map data structure + the "nation districts" zone generator used by all 10 lands
import { T, O, flagName, rockyObj } from './gfx.js';

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
  if (t.next) gate(m, CX - 1, 2, { x: CX - 1, y: 0, w: 3, h: 2 }, t.next, 'default', t.lv, t.gateType || 'gate');
  if (t.prev) gate(m, CX - 1, H - 2, { x: CX - 1, y: H - 1, w: 3, h: 1 }, t.prev, 'back');
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
  return m;
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
  // every nation raises its own Rocky statue, in its colours, centred under the entrance (tallest ones one row lower)
  const rk = rockyObj(n.key, tn), rd = O[rk];
  put(rk, x + 5 - Math.floor(rd.fw / 2), y + (rd.h > 60 ? 3 : 2), { nation: n.key, rocky: true, piece: 'rocky' });
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
  village: { tier: 0, base: T.GRASS, scatter: [[T.GRASS2, .12], [T.FLOWER, .05]], plot: T.GRASS2, path: T.DIRT, border: 'tree', decor: [['tree', .04], ['bush', .03]], light: 'lantern', houses: false /* 2026-09-25 anh bỏ nhà trang trí không tính năng khỏi Làng */, guide: true, next: 'm1', prev: 'sea',
    fixed: [{ obj: 'well', x: CX + 8, y: 7 }, { obj: 'crate', x: CX - 9, y: 7 }, { obj: 'crate', x: CX - 10, y: 7 }, { obj: 'crate', x: CX - 9, y: 8 }],
    sign: S('Harbor Village — start of the journey.\nEvery fenced yard belongs to one country. Read the board inside.\nNorth gate → M1 · Calm Shoals', 'Làng Xuất Phát — nơi bắt đầu hành trình.\nMỗi khu rào là của một quốc gia. Đọc bảng trong khu.\nCổng Bắc → M1 · Bãi Bồi Yên') },
  m1: { tier: 1, base: T.SAND, scatter: [[T.SAND2, .15]], plot: T.DIRT, path: T.DIRT, border: (x, y) => y < 2 || y > H - 3 ? 'palm' : 'rock', water: 8, decor: [['palm', .04], ['rock', .015], ['shell', .03], ['rock_s', .02]], light: 'torch', prev: 'village', next: 'm2', lv: 1,
    fixed: [{ obj: 'boat', x: 5, y: 59 }],
    sign: S('Magnitude 1.0 — where every artist starts.\nMeet 5 artists here to earn the M1 badge.', 'Magnitude 1.0 — nơi mọi nghệ sĩ bắt đầu.\nGặp 5 người ở đây để nhận huy hiệu M1.') },
  m2: { tier: 1, base: T.GRASS, scatter: [[T.GRASS2, .12], [T.FLOWER, .04], [T.CRACKG, .04]], plot: T.GRASS2, path: T.DIRT, border: 'tree', decor: [['bush', .03], ['tree', .03], ['crate', .01]], light: 'lantern', houses: true, prev: 'm1', next: 'm3', lv: 2,
    fixed: [{ obj: 'stall', x: CX - 10, y: 7, extra: { shop: true } }, { obj: 'stall', x: CX + 8, y: 7, extra: { shop: true } }, { obj: 'stall', x: CX - 10, y: 9, extra: { shop: true } }, { obj: 'well', x: CX + 8, y: 9 }],
    sign: S('Magnitude 2.0 — the lanterns sway.\nThe market by the plaza trades tremor shards for outfits. Meet 5 artists.', 'Magnitude 2.0 — đèn lồng đung đưa.\nChợ cạnh quảng trường đổi mảnh dư chấn lấy trang phục. Gặp 5 nghệ sĩ.') },
  m3: { tier: 2, base: T.GRASS, scatter: [[T.MOSS, .25], [T.GRASS2, .15], [T.CRACKG, .07]], plot: T.DIRT, path: T.DIRT, border: 'tree', decor: [['tree', .16], ['deadtree', .04], ['bush', .05], ['rock_s', .03]], light: 'campfire', prev: 'm2', next: 'm4', lv: 3,
    fixed: [{ obj: 'campfire_off', x: 8, y: 19, extra: { fire: true } }, { obj: 'campfire_off', x: 72, y: 29, extra: { fire: true } }, { obj: 'campfire_off', x: 30, y: 49, extra: { fire: true } }],
    sign: S('Magnitude 3.0 — the forest is cracking.\nLight the 3 cold campfires along the roads so nobody gets lost. Meet 6 artists.', 'Magnitude 3.0 — rừng đang nứt.\nĐốt 3 đống lửa tắt dọc đường để không ai lạc. Gặp 6 nghệ sĩ.') },
  m4: { tier: 2, base: T.ROCK, scatter: [[T.GRAVEL, .2], [T.DARK, .08]], plot: T.GRAVEL, path: T.GRAVEL, border: 'rock', decor: [['ore', .05, { ore: true }], ['rock', .04], ['boulder', .006], ['crate', .01], ['torch', .015], ['beam', .01]], light: 'torch', prev: 'm3', next: 'm5', lv: 4,
    fixed: [{ obj: 'cart', x: CX - 9, y: 7 }, { obj: 'cart', x: CX + 7, y: 7 }],
    sign: S('Magnitude 4.0 — Rockfall Mine.\nWatch the shadows — stones fall. Mine 3 ore. Meet 6 artists.', 'Magnitude 4.0 — Mỏ Đá Lở.\nCoi chừng bóng đen — đá rơi. Đào 3 quặng. Gặp 6 nghệ sĩ.') },
  m5: { tier: 3, base: T.DIRT, scatter: [[T.CRACKD, .1], [T.GRAVEL, .12], [T.ROCK, .05]], plot: T.GRAVEL, path: T.GRAVEL, border: 'rock', decor: [['boulder', .008], ['rock', .04], ['deadtree', .03], ['rock_s', .03]], light: 'torch', prev: 'm4', next: 'm6', lv: 5,
    bands: [{ rows: [28, 29], tile: T.CHASM, gaps: [[CX - 1, CX + 1]], bridge: true }],
    fixed: [{ obj: 'lever_off', x: CX - 2, y: 33, extra: { lever: true } }, { obj: 'lever_off', x: CX + 2, y: 33, extra: { lever: true } }],
    sign: S('Magnitude 5.0 — Fault Canyon.\nThe fault splits the land in two. Pull both levers south of it to raise the bridge. Meet 6 artists.', 'Magnitude 5.0 — Hẻm Đứt Gãy.\nĐứt gãy chia đôi vùng đất. Gạt cả hai cần ở bờ Nam để nâng cầu. Gặp 6 nghệ sĩ.') },
  m6: { tier: 3, base: T.COBBLE, scatter: [[T.MOSS, .1], [T.STONE, .06]], plot: T.STONE, path: T.STONE, plaza: T.STONE, border: 'pillar_broken', decor: [['pillar_broken', .04], ['pillar', .012], ['statue', .008], ['bush', .02], ['rock_s', .02]], light: 'lantern', prev: 'm5', next: 'm7', lv: 6,
    fixed: [{ obj: 'library', x: CX - 9, y: 7, extra: { quiz: 'library' } }, { obj: 'library', x: CX + 7, y: 7, extra: { quiz: 'library' } }, { obj: 'tower', x: 5, y: 7 }, { obj: 'tower', x: 72, y: 7 }],
    sign: S('Magnitude 6.0 — the Leaning City.\nThe libraries by the plaza test what you know about Seismic. Meet 7 artists.', 'Magnitude 6.0 — Thành Nghiêng.\nThư viện cạnh quảng trường kiểm tra bạn hiểu Seismic tới đâu. Gặp 7 nghệ sĩ.') },
  m7: { tier: 4, base: T.ASH, scatter: [[T.ROCK, .15], [T.DARK, .05]], plot: T.ROCK, path: T.ROCK, border: 'rock', decor: [['rock', .05], ['deadtree', .035], ['rock_s', .04], ['torch', .01], ['obsidian', .003, { item: 'obsidian' }]], light: 'torch', prev: 'm6', next: 'm8', lv: 7,
    bands: [{ rows: [18, 19], tile: T.LAVA, gaps: [[13, 14], [CX - 1, CX + 1], [65, 66]] }, { rows: [38, 39], tile: T.LAVA, gaps: [[25, 26], [CX - 1, CX + 1], [53, 54]] }],
    fixed: [{ obj: 'obsidian', x: 6, y: 29, extra: { item: 'obsidian' } }, { obj: 'obsidian', x: 74, y: 29, extra: { item: 'obsidian' } }, { obj: 'obsidian', x: 6, y: 49, extra: { item: 'obsidian' } }, { obj: 'obsidian', x: 74, y: 49, extra: { item: 'obsidian' } }],
    sign: S("Magnitude 7.0 — the Sleeping Volcano.\nTwo lava rivers cross the land. Collect 3 obsidian shards, dodge the spurts. Meet 7 artists.", 'Magnitude 7.0 — Núi Lửa Ngủ.\nHai sông dung nham cắt ngang. Nhặt 3 mảnh obsidian, né dung nham phun. Gặp 7 nghệ sĩ.') },
  m8: { tier: 4, base: T.SNOW, scatter: [[T.ROCK, .12], [T.ICE, .06]], plot: T.ROCK, path: T.ROCK, border: 'pine_s', decor: [['pine_s', .08], ['pine', .03], ['boulder', .008], ['rock', .03], ['campfire', .004]], light: 'campfire', prev: 'm7', next: 'm9', lv: 8,
    sign: S('Magnitude 8.0 — Epicenter Peak.\nThree Elders (☆) guard the way. Answer their riddles. Meet 8 artists.', 'Magnitude 8.0 — Đỉnh Tâm Chấn.\nBa Trưởng lão (☆) canh đường. Trả lời câu đố của họ. Gặp 8 nghệ sĩ.') },
  m9: { tier: 5, base: T.HEX, scatter: [[T.DARK, .15]], plot: T.DARK, path: T.HEX, plaza: T.DARK, border: 'hexpillar', decor: [['crystal_p', .03], ['crystal_b', .02], ['crystal_r', .015], ['hexpillar', .01], ['rock_s', .02]], light: 'crystal_p', prev: 'm8', next: 'end', lv: 9, gateType: 'core_gate',
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
  gate(m, CX - 1, H - 2, { x: CX - 1, y: H - 1, w: 3, h: 1 }, 'village', 'default');
  place(m, 'sign', CX + 3, 56, { text: { en: 'Harbor Village dock. Step off your raft here.\nThe lighthouse always points home.', vi: 'Bến cảng Làng Xuất Phát. Rời bè ở đây.\nHải đăng luôn chỉ về nhà.' } });
  m.entries = { default: { x: CX, y: 5 }, back: { x: CX, y: 56 } };       // default = adrift far out at sea, back = the dock
  m.reserved.push(m.entries.default, m.entries.back);
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

export const ZONES = {
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
export const ZONE_LIST = Object.values(ZONES).sort((a, b) => a.order - b.order);
