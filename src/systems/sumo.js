// sumo.js — Rocky sumo: your piloted Rocky vs another nation's Rocky on a round ring (see systems/API.md)
//
//   Every land with districts gets a round dohyo of packed sand near the middle of the map (position
//   persisted in save.sys.sumo.ring[zone]). Pilot a nation's Rocky (rocky.js), step onto the ring and
//   press E: pick another nation present in this land, its statue walks over from its district and the
//   duel starts — 30 s, push the other statue over the rope. E = shove (0.8 s cooldown); the AI shoves
//   back, and higher-tier statues are heavier. Win: +4 stones, save.sys.sumo.wins[nation]++, 'sumo'
//   achievement. Lose: nothing lost. No nation ranking — this is a friendly bout.

import { FLAG_COLORS } from '../gfx.js';

// ---------------------------------------------------------------- strings
const STR = {
  en: {
    near: 'Challenge a nation', nearNo: 'Sumo ring — pilot a Rocky to challenge',
    explain: 'Sumo: earn a nation\'s trust (meet half its artists), press E at its Rocky statue to pilot it, then come back here.',
    title: 'Rocky Sumo', lead: 'Pick a nation to challenge. Push their Rocky over the rope within 30 s. E = shove.',
    challenge: 'Challenge', ruined: 'statue in ruins', wins: n => `wins ${n}`, tier: t => `tier ${t}`, close: 'Close',
    noOpp: 'No other nation to challenge here.',
    coming: n => `${n}'s Rocky enters the ring…`, fight: 'Hajime! Push them out (E = shove)',
    won: n => `You pushed out ${n}'s Rocky!`, lost: 'Your Rocky was pushed out', forfeit: 'You left the ring — forfeit',
    timeUp: 'Time! The judges call it for the one nearer the centre.',
    reward: '+4 🪨 stones', ach: 'Achievement: Sumo champion',
    hud: (t, s) => `Sumo: ${t} · shoves ${s}`, you: 'You', walkHud: 'Sumo: opponent approaching',
    sign: 'Sumo ring.\nPilot a nation\'s Rocky (earn its trust, then E at its statue), step onto the ring and challenge another nation.\nPush their Rocky over the rope!'
  },
  vi: {
    near: 'Thách đấu một nước', nearNo: 'Sàn sumo — điều khiển Rocky để thách đấu',
    explain: 'Sumo: lấy lòng tin một nước (gặp nửa nghệ sĩ của họ), bấm E ở tượng Rocky của họ để điều khiển, rồi quay lại đây.',
    title: 'Sumo Rocky', lead: 'Chọn một nước để thách đấu. Đẩy Rocky của họ qua vòng dây trong 30 giây. E = xô.',
    challenge: 'Thách đấu', ruined: 'tượng đã đổ', wins: n => `thắng ${n}`, tier: t => `bậc ${t}`, close: 'Đóng',
    noOpp: 'Không còn nước nào khác để thách đấu ở đây.',
    coming: n => `Rocky của ${n} bước lên sàn…`, fight: 'Bắt đầu! Đẩy họ ra (E = xô)',
    won: n => `Bạn đã đẩy Rocky của ${n} ra ngoài!`, lost: 'Rocky của bạn bị đẩy ra ngoài', forfeit: 'Bạn đã bỏ sàn — xử thua',
    timeUp: 'Hết giờ! Trọng tài xử cho bên gần tâm hơn.',
    reward: '+4 🪨 đá', ach: 'Thành tựu: Nhà vô địch sumo',
    hud: (t, s) => `Sumo: ${t} · xô ${s}`, you: 'Bạn', walkHud: 'Sumo: đối thủ đang tới',
    sign: 'Sàn sumo.\nĐiều khiển Rocky của một nước (lấy lòng tin rồi bấm E ở tượng), bước lên sàn và thách đấu nước khác.\nĐẩy Rocky của họ qua vòng dây!'
  }
};
const L = ctx => STR[ctx.lang() === 'vi' ? 'vi' : 'en'];

// ---------------------------------------------------------------- tuning
const RING_TILES = 5;            // 5×5 tile dohyo
const RING_R = 36;               // rope radius (px) — a statue whose centre crosses it is out
const ROPE_R = 34;               // how far a statue can walk on its own; only a push takes it further
const PASS_R = 72;               // tiles whose centre is within this of the ring centre are walkable in a duel (the rope itself is enforced by ropeClamp, so the 20 px Rocky box never snags a corner tile)
const STATUE_R = 12;             // collision circle of each statue
const START_D = 18;              // starting distance from the centre (west = you, east = them)
const DUEL_LEN = 30, WALK_LEN = 3, END_LEN = 1.4;
const AI_SPEED = 45, SHOVE = 14, SHOVE_CD = 0.8;
const REWARD = 4;
const TAU = Math.PI * 2;
const DIRV = [[0, 1], [-1, 0], [1, 0], [0, -1]];   // player.dir: down, left, right, up

// ---------------------------------------------------------------- state
let CTX = null;
let ring = null;                 // { tx, ty, cx, cy } (tile of the top-left corner, centre in px) or null
let signObj = null;
let phase = 'idle';              // idle | pick | walk | duel | end | back
let ai = null;                   // { key, name, flag, tier, x, y, img, w, h, from:{x,y}, to:{x,y}, t, dir, cd, circleT, circleDir, res, hurt }
let aiStatue = null;             // { map, type, x, y, extra } — the statue lifted off its plinth, to put back
let myKey = null;                // the piloted nation (inferred, see pilotNation)
let left = 0, walkT = 0, endT = 0, shoves = 0, cd = 0, animT = 0;
let result = null;               // 'win' | 'lose' after the duel
let prev = null;                 // player fields to restore
let forced = false;              // test start without a real pilot
let panelEl = null;
const fx = [];

const sysS = ctx => {
  const sv = ctx.S.save; sv.sys = sv.sys || {};
  const s = (sv.sys.sumo = sv.sys.sumo || {});
  s.ring = s.ring || {}; s.wins = s.wins || {}; if (typeof s.duels !== 'number') s.duels = 0;
  return s;
};
const nationInfo = (ctx, key) => (ctx.S.nations || []).find(n => n.key === key) || { key, flag: '', name: ctx.nationName(key) };
const fullName = (ctx, key) => { const n = nationInfo(ctx, key); return `${n.flag ? n.flag + ' ' : ''}${n.name}`; };
const statueSize = (ctx, d) => { const tier = ctx.S.zone.tier || 0, w = tier >= 3 ? Math.min(48, d.w) : 32; return { w, h: Math.round(d.h * (w / d.w)) }; };

// ---------------------------------------------------------------- sprites
const px = (g, x, y, c, w = 1, h = 1) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
function circ(g, cx, cy, r, c) { g.fillStyle = c; for (let dy = -r; dy <= r; dy++) { const w = Math.floor(Math.sqrt(r * r - dy * dy)); g.fillRect(cx - w, cy + dy, 2 * w + 1, 1); } }
// the dohyo: packed sand disc, straw rope circle, two starting lines
function ringArt(g, rng) {
  const N = RING_TILES * 16, c = N / 2, OUT = '#5a4630';
  circ(g, c, c, 39, OUT); circ(g, c, c, 38, '#c9b184');
  for (let i = 0; i < 90; i++) { const a = rng() * TAU, r = rng() * 37; px(g, Math.round(c + Math.cos(a) * r), Math.round(c + Math.sin(a) * r), rng() < 0.5 ? '#b89c70' : '#d8c49c'); }
  circ(g, c, c, 33, '#d4bf96');
  for (let i = 0; i < 40; i++) { const a = rng() * TAU, r = rng() * 32; px(g, Math.round(c + Math.cos(a) * r), Math.round(c + Math.sin(a) * r), '#c6ae82'); }
  // rope: a twisted straw ring, dark outline
  for (let a = 0; a < 360; a += 1) {
    const rad = a * Math.PI / 180, seg = Math.floor(a / 9) % 2;
    for (let r = RING_R - 2; r <= RING_R + 2; r++) {
      const x = Math.round(c + Math.cos(rad) * r), y = Math.round(c + Math.sin(rad) * r);
      const edge = r === RING_R - 2 || r === RING_R + 2;
      px(g, x, y, edge ? OUT : seg ? '#e6d5ab' : '#b8996a');
    }
  }
  px(g, c - 11, c - 5, '#f4ecdc', 2, 10); px(g, c + 9, c - 5, '#f4ecdc', 2, 10);   // starting lines
  px(g, c - 12, c - 6, OUT, 1, 12); px(g, c + 11, c - 6, OUT, 1, 12);
}
// the AI statue with a sash in its nation's colours (built once per nation/tier; the sash is clipped to the statue's pixels)
const sashCache = new Map();
function sashed(ctx, key, tier) {
  const id = key + '|' + tier;
  if (sashCache.has(id)) return sashCache.get(id);
  const d = ctx.O[ctx.rockyObj(key, tier)], src = d.img, w = src.width, h = src.height;
  const c = ctx.mkCanvas(w, h), g = c.getContext('2d');
  g.drawImage(src, 0, 0);
  g.globalCompositeOperation = 'source-atop';
  const cols = FLAG_COLORS[key] || ['#ffd45e', '#ffffff'], band = Math.max(4, Math.round(h * 0.16)), stripe = Math.max(1, Math.floor(band / cols.length));
  g.save(); g.translate(w / 2, h * 0.42); g.rotate(-0.55);
  px(g, -w, -band / 2 - 1, '#2a1a12', w * 2, band + 2);
  cols.forEach((col, i) => px(g, -w, -band / 2 + i * stripe, col, w * 2, i === cols.length - 1 ? band - i * stripe : stripe));
  g.restore();
  sashCache.set(id, c);
  return c;
}

// ---------------------------------------------------------------- particles
function dust(x, y, n = 8, c = 'rgba(214,196,160,.9)') {
  for (let i = 0; i < n; i++) { const a = Math.random() * TAU, sp = 10 + Math.random() * 30; fx.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.5 - 24, t: 0.4 + Math.random() * 0.4, life: 1, s: 1 + ((Math.random() * 2) | 0), c }); }
}
function updateFx(dt) {
  for (let i = fx.length - 1; i >= 0; i--) {
    const q = fx[i]; q.t -= dt;
    if (q.t <= 0) { fx.splice(i, 1); continue; }
    q.x += q.vx * dt; q.y += q.vy * dt; q.vy += 40 * dt; q.vx *= 0.93;
  }
}

// ---------------------------------------------------------------- ring placement
const isRoad = (m, x, y) => m.roads && m.roads[y * m.w + x] === 1;
const inPlot = (m, x, y, margin) => m.plots.some(p => x >= p.x - margin && x < p.x + p.w + margin && y >= p.y - margin && y < p.y + p.h + margin);
function badGround(ctx, m, x, y) {
  const T = ctx.T, t = ctx.getG(m, x, y);
  return t === T.NONE || t === T.WATER || t === T.DEEP || t === T.REEF || t === T.LAVA || t === T.CHASM || t === T.BRIDGE;
}
// scenery (rocks, bushes, trees, scattered ore, gather nodes) may be cleared to make room — trees.js re-indexes on
// object-count change and gather.js prunes removed nodes. Anything that belongs to a district, a gate, a quest or a
// fixed landmark stays, and a spot with one of those in it is not a ring spot.
const KEEP_KEYS = ['plot', 'rocky', 'nation', 'flag', 'hall', 'shop', 'fire', 'lever', 'quiz', 'item', 'text', 'trader', 'planted', 'host', 'wreck', 'buoy', 'lighthouse', 'hermit', 'sumo', 'dealer', 'coop', 'pet'];
const KEEP_TYPES = /^(gate|core_gate|monument|sign|stall|boat|cart|well|library|tower|house_|lighthouse|wreck|buoy|lever_|campfire_off|obsidian|sumo)/;
const plainDecor = o => !KEEP_TYPES.test(o.type) && !KEEP_KEYS.some(k => o[k] !== undefined);
function objectsIn(ctx, m, x0, y0, x1, y1) {
  const out = [];
  for (const o of m.objects) { const d = ctx.O[o.type]; if (!d) continue; if (o.x + d.fw > x0 && o.x <= x1 && o.y + d.fh > y0 && o.y <= y1) out.push(o); }
  return out;
}
// a 5×5 footprint with a 1-tile margin: no roads/plots/hazards/reserved tiles, and only clearable scenery on it
function footprintOk(ctx, m, tx, ty) {
  if (tx < 2 || ty < 10 || tx + RING_TILES > m.w - 2 || ty + RING_TILES > m.h - 3) return false;
  for (let y = ty - 1; y <= ty + RING_TILES; y++) for (let x = tx - 1; x <= tx + RING_TILES; x++) {
    if (isRoad(m, x, y) || inPlot(m, x, y, 1) || badGround(ctx, m, x, y)) return false;
    if (y >= ty && y < ty + RING_TILES && x >= tx && x < tx + RING_TILES && m.reserved.some(r => Math.abs(r.x - x) <= 1 && Math.abs(r.y - y) <= 1)) return false;
    if (ctx.isSolid(m, x, y) && !ctx.hasObjectAt(m, x, y)) return false;      // solid ground (water, chasm edge…)
  }
  return objectsIn(ctx, m, tx - 1, ty - 1, tx + RING_TILES, ty + RING_TILES).every(plainDecor);
}
function clearFootprint(ctx, m, tx, ty) {
  for (const o of objectsIn(ctx, m, tx - 1, ty - 1, tx + RING_TILES, ty + RING_TILES)) if (plainDecor(o)) ctx.removeObject(m, o);
}
function findRing(ctx, m) {
  const zone = ctx.S.zone.id, s = sysS(ctx), saved = s.ring[zone];
  if (saved && footprintOk(ctx, m, saved.x, saved.y)) return saved;
  const rng = ctx.rngFrom(ctx.hashStr(zone + ':sumo'));
  const mx = m.w >> 1, my = m.h >> 1, half = (RING_TILES - 1) >> 1;
  let best = null;
  for (const R of [10, 16, 24, 34, 48]) {
    const rect = { x: Math.max(2, mx - R), y: Math.max(10, my - Math.round(R * 0.75)), w: 0, h: 0 };
    rect.w = Math.min(m.w - 2, mx + R) - rect.x; rect.h = Math.min(m.h - 3, my + Math.round(R * 0.75)) - rect.y;
    const cands = ctx.freeTiles(m, rng, rect, 160, [], 1, 1);           // reachable single tiles → tried as ring centres
    cands.sort((a, b) => Math.hypot(a.x - mx, a.y - my) - Math.hypot(b.x - mx, b.y - my));
    for (const c of cands) { const tx = c.x - half, ty = c.y - half; if (footprintOk(ctx, m, tx, ty)) { best = { x: tx, y: ty }; break; } }
    if (best) break;
  }
  if (best) { s.ring[zone] = best; ctx.persist(); }
  return best;
}
function placeRing(ctx) {
  const m = ctx.S.map, spot = findRing(ctx, m);
  if (!spot) return;
  const half = RING_TILES / 2;
  clearFootprint(ctx, m, spot.x, spot.y);
  ring = { tx: spot.x, ty: spot.y, cx: (spot.x + half) * 16, cy: (spot.y + half) * 16 };
  for (let y = spot.y; y < spot.y + RING_TILES; y++) for (let x = spot.x; x < spot.x + RING_TILES; x++) m.reserved.push({ x, y });   // keep other systems' scatter off the sand
  // a small sign beside the ring
  const S = STR;
  for (const [x, y] of [[spot.x + RING_TILES, spot.y + 2], [spot.x - 1, spot.y + 2], [spot.x + 2, spot.y + RING_TILES], [spot.x + 2, spot.y - 1], [spot.x + RING_TILES, spot.y]]) {
    if (ctx.isSolid(m, x, y) || ctx.hasObjectAt(m, x, y) || isRoad(m, x, y) || inPlot(m, x, y, 0) || badGround(ctx, m, x, y)) continue;
    signObj = ctx.place(m, 'sign', x, y, { text: { en: S.en.sign, vi: S.vi.sign }, sumo: true });
    break;
  }
}

// ---------------------------------------------------------------- who is piloting whom
// rocky.js keeps the piloted nation private; while piloted the statue is lifted off the map, so the one
// district without a Rocky piece is the pilot's. (A ctx.pilotNation() hook would make this exact.)
function pilotNation(ctx) {
  if (!ctx.isRocky()) return null;
  const m = ctx.S.map, missing = [];
  m.plots.forEach((p, i) => { if (!m.objects.some(o => o.plot === i && o.piece === 'rocky')) missing.push(p.nation); });
  return missing.length === 1 ? missing[0] : null;
}
// the standing (not ruined) Rocky statue object of a nation, or null
function statueOf(ctx, key) {
  const m = ctx.S.map, i = m.plots.findIndex(p => p.nation === key);
  if (i < 0) return null;
  return m.objects.find(o => o.plot === i && o.piece === 'rocky' && !o.ruined) || null;
}

// ---------------------------------------------------------------- panel (pick a nation)
function openPick(ctx) {
  const S = L(ctx), s = sysS(ctx), m = ctx.S.map;
  myKey = pilotNation(ctx);
  const rows = [];
  for (const n of ctx.S.nations || []) {
    if (n.key === myKey) continue;
    const pi = m.plots.findIndex(p => p.nation === n.key); if (pi < 0) continue;
    const st = statueOf(ctx, n.key), tier = m.plots[pi].tier || 0, wins = s.wins[n.key] || 0;
    rows.push(`<div class="hrow"><span class="hwho"><b>${n.flag} ${n.name}</b> <span class="chip">${S.tier(tier)}</span>${wins ? ` <span class="chip">🏆 ${S.wins(wins)}</span>` : ''}</span>
      <span class="hnum"></span>${st ? `<button class="btn primary" data-key="${n.key}" style="width:auto;margin:0;padding:8px 12px">${S.challenge}</button>` : `<span class="dim">${S.ruined}</span>`}</div>`);
  }
  const html = `<h2>🥋 ${S.title}</h2><p class="dim">${S.lead}</p>
    <div class="scroll">${rows.length ? rows.join('') : `<p class="dim">${S.noOpp}</p>`}</div>
    <button class="btn" id="sumo-close">${S.close}</button>`;
  panelEl = ctx.panel('sumo', html);
  panelEl.hidden = false;
  phase = 'pick';
  ctx.setMode('sumoPick');
  ctx.registerCloser('sumoPick', () => closePick(ctx));
  panelEl.querySelector('#sumo-close').onclick = () => closePick(ctx);
  for (const b of panelEl.querySelectorAll('[data-key]')) b.onclick = () => { const k = b.dataset.key; closePick(ctx); startDuel(ctx, k); };
}
function closePick(ctx) {
  if (panelEl) panelEl.hidden = true;
  if (phase === 'pick') phase = 'idle';
  if (ctx.S.mode === 'sumoPick') ctx.setMode('play');
}

// ---------------------------------------------------------------- the duel
function startDuel(ctx, key, force = false) {
  if (!ring || phase !== 'idle' && phase !== 'pick') return false;
  if (!force && !ctx.isRocky()) return false;
  const st = statueOf(ctx, key); if (!st) return false;
  const m = ctx.S.map, p = ctx.S.player, pi = m.plots.findIndex(q => q.nation === key), tier = m.plots[pi].tier || 0;
  const d = ctx.O[st.type], sz = statueSize(ctx, d);
  forced = force && !ctx.isRocky();
  myKey = pilotNation(ctx) || (forced ? ((ctx.S.nations || []).find(n => n.key !== key) || {}).key || null : null);
  // lift the statue off its plinth; it walks over
  aiStatue = { map: m, type: st.type, x: st.x, y: st.y, extra: { plot: st.plot, piece: 'rocky', nation: st.nation, rocky: true, hp: st.hp } };
  ctx.removeObject(m, st);
  const from = { x: (st.x + d.fw / 2) * 16, y: (st.y + d.fh) * 16 }, to = { x: ring.cx + START_D, y: ring.cy };
  ai = { key, name: fullName(ctx, key), tier, x: from.x, y: from.y, img: sashed(ctx, key, tier), w: sz.w, h: sz.h, from, to, t: 0, dir: from.x > to.x ? -1 : 1, cd: 2.5, circleT: 3 + Math.random() * 2, circleDir: 1, circling: 0, res: Math.max(0.4, 1 - tier * 0.1), hurt: 0, bob: 0 };
  // the player takes the west side
  prev = { speedMul: p.speedMul, passable: p.passable, custom: p.custom, ghost: p.ghost, boxW: p.boxW, boxH: p.boxH };
  p.x = ring.cx - START_D; p.y = ring.cy; p.dir = 2; p.moving = false;
  p.speedMul = 0.9; p.ghost = true;
  p.passable = (mm, tx, ty) => Math.hypot(tx * 16 + 8 - ring.cx, ty * 16 + 8 - ring.cy) <= PASS_R;
  if (forced) {                       // test only: no real pilot — draw a plain Rocky of "our" nation so the bout still reads
    const mk = myKey || key, art = ctx.O[ctx.rockyObj(mk, tier)], s2 = statueSize(ctx, art);
    p.boxW = 20; p.boxH = 10;
    p.custom = (g, ent) => { g.fillStyle = 'rgba(0,0,0,.28)'; g.beginPath(); g.ellipse(Math.round(ent.x), Math.round(ent.y) + 1, s2.w * 0.4, s2.w * 0.16, 0, 0, TAU); g.fill(); g.drawImage(art.img, Math.round(ent.x) - (s2.w >> 1), Math.round(ent.y) - s2.h + 2, s2.w, s2.h); };
  }
  left = DUEL_LEN; walkT = WALK_LEN; shoves = 0; cd = 0; animT = 0; result = null; fx.length = 0;
  phase = 'walk';
  ctx.setMode('sumo');
  ctx.registerCloser('sumo', () => { if (phase === 'walk' || phase === 'duel') { ctx.toast(L(ctx).forfeit); finish(ctx, false, true); } });
  ctx.onAction('sumo', () => playerShove(ctx));
  ctx.toast(L(ctx).coming(ai.name), true);
  sysS(ctx).duels++; ctx.persist();
  return true;
}

function playerShove(ctx) {
  if (phase !== 'duel' || !ai || cd > 0) return;
  const p = ctx.S.player, dx = ai.x - p.x, dy = ai.y - p.y, dist = Math.hypot(dx, dy) || 1;
  if (dist > STATUE_R * 2 + 5) return;                   // not in contact
  cd = SHOVE_CD; shoves++;
  let [fx_, fy_] = DIRV[p.dir] || [1, 0];
  const nx = dx / dist, ny = dy / dist;
  if (fx_ * nx + fy_ * ny < 0.3) { fx_ = nx; fy_ = ny; }  // shove along the contact when not squarely facing
  const push = SHOVE * ai.res;
  ai.x += fx_ * push; ai.y += fy_ * push; ai.hurt = 0.25;
  p.x -= fx_ * 2; p.y -= fy_ * 2;
  dust((p.x + ai.x) / 2, (p.y + ai.y) / 2, 10);
  ctx.sfx('hit');
  if (Math.hypot(ai.x - ring.cx, ai.y - ring.cy) > RING_R) finish(ctx, true);   // over the rope: decided on the spot, whatever the frame rate
  else ropeClamp(ai);
}
function aiShove(ctx) {
  const p = ctx.S.player, dx = p.x - ai.x, dy = p.y - ai.y, dist = Math.hypot(dx, dy) || 1;
  const nx = dx / dist, ny = dy / dist, push = (SHOVE - 4) * (1 + ai.tier * 0.15);   // heavier statues hit harder
  p.x += nx * push; p.y += ny * push;
  ai.x -= nx * 2; ai.y -= ny * 2;
  dust((p.x + ai.x) / 2, (p.y + ai.y) / 2, 10);
  ctx.sfx('hit');
  if (Math.hypot(p.x - ring.cx, p.y - ring.cy) > RING_R) finish(ctx, false);
  else ropeClamp(p);
}
// keep a statue inside the rope when it moves on its own (only a push takes it over)
function ropeClamp(o, r = ROPE_R) {
  const dx = o.x - ring.cx, dy = o.y - ring.cy, d = Math.hypot(dx, dy);
  if (d > r) { o.x = ring.cx + dx / d * r; o.y = ring.cy + dy / d * r; }
}

function updateAi(dt, ctx) {
  const p = ctx.S.player, toP = { x: p.x - ai.x, y: p.y - ai.y }, dP = Math.hypot(toP.x, toP.y) || 1;
  const fromC = { x: ai.x - ring.cx, y: ai.y - ring.cy }, dC = Math.hypot(fromC.x, fromC.y);
  ai.circleT -= dt;
  if (ai.circleT <= 0) { ai.circling = 0.9 + Math.random() * 0.7; ai.circleDir = Math.random() < 0.5 ? -1 : 1; ai.circleT = 3 + Math.random() * 2.5; }
  let vx, vy;
  if (ai.circling > 0) {                                   // sidestep around the player for a moment
    ai.circling -= dt;
    vx = -toP.y / dP * ai.circleDir + toP.x / dP * 0.3; vy = toP.x / dP * ai.circleDir + toP.y / dP * 0.3;
  } else { vx = toP.x / dP; vy = toP.y / dP; }
  if (dC > 24) { vx -= fromC.x / dC * 0.6; vy -= fromC.y / dC * 0.6; }   // a good rikishi keeps away from the rope
  const vl = Math.hypot(vx, vy) || 1;
  if (dP > STATUE_R * 2 - 2 || ai.circling > 0) { ai.x += vx / vl * AI_SPEED * dt; ai.y += vy / vl * AI_SPEED * dt; ai.bob += dt; }
  if (Math.abs(toP.x) > 2) ai.dir = toP.x > 0 ? 1 : -1;
  ai.cd -= dt;
  if (dC > 26 && ai.cd > 0.6) ai.cd = 0.6;                 // backed against the rope: it shoves sooner
  if (ai.cd <= 0 && dP < STATUE_R * 2 + 5) { ai.cd = 1.5 + Math.random(); aiShove(ctx); }
}
// bodies in contact: the overlap is split by weight (a higher-tier statue gives less). Walking can only carry a
// statue up to the rope; only a shove throws it over — so the bout never hinges on frame rate.
function resolveContact(ctx) {
  const p = ctx.S.player, dx = ai.x - p.x, dy = ai.y - p.y, d = Math.hypot(dx, dy) || 0.001, ov = STATUE_R * 2 - d;
  if (ov > 0) {
    const nx = d > 0.001 ? dx / d : 1, ny = d > 0.001 ? dy / d : 0;
    const mA = 1 + ai.tier * 0.12, aiShare = 1 / (1 + mA), pShare = 1 - aiShare;   // tier 0: an even match … tier 5: the statue barely budges when you both push
    ai.x += nx * ov * aiShare; ai.y += ny * ov * aiShare;
    p.x -= nx * ov * pShare; p.y -= ny * ov * pShare;
  }
  ropeClamp(ai); ropeClamp(p);
}

function finish(ctx, win, forfeit = false) {
  if (phase !== 'walk' && phase !== 'duel') return;
  const S = L(ctx), p = ctx.S.player, s = sysS(ctx);
  result = win ? 'win' : 'lose';
  if (win) {
    ctx.toast(S.won(ai.name), true); ctx.sfx('win');
    ctx.S.save.inv.stone = (ctx.S.save.inv.stone || 0) + REWARD;
    s.wins[ai.key] = (s.wins[ai.key] || 0) + 1;
    const ach = ctx.S.save.achievements = ctx.S.save.achievements || [];
    const first = !ach.includes('sumo'); if (first) ach.push('sumo');
    setTimeout(() => { try { ctx.toast(S.reward); if (first) setTimeout(() => ctx.toast(S.ach), 1500); } catch (e) { } }, 1400);
    dust(ai.x, ai.y, 16); ai.hurt = 0.6;
  } else {
    if (!forfeit) { ctx.toast(S.lost, true); dust(p.x, p.y, 16); }
    ctx.sfx('fail');
  }
  ctx.persist();
  phase = 'end'; endT = forfeit ? 0.3 : END_LEN;
}
function restorePlayer(ctx) {
  const p = ctx.S.player;
  if (prev && ctx.isRocky() && !forced) { p.speedMul = prev.speedMul; p.passable = prev.passable; p.ghost = prev.ghost; }   // still piloting: give rocky.js its rules back
  else { p.speedMul = 1; p.passable = null; p.custom = null; p.ghost = false; p.boxW = 10; p.boxH = 6; }                       // plain walker again
  p.x = ring.cx - 44; p.y = ring.cy + 2; p.dir = 2;
  prev = null; forced = false;
}
function endDuel(ctx) {
  restorePlayer(ctx);
  if (ctx.S.mode === 'sumo') ctx.setMode('play');
  if (ai) { ai.from = { x: ai.x, y: ai.y }; ai.to = { x: (aiStatue.x + ctx.O[aiStatue.type].fw / 2) * 16, y: (aiStatue.y + ctx.O[aiStatue.type].fh) * 16 }; ai.t = 0; ai.dir = ai.to.x > ai.from.x ? 1 : -1; ai.hurt = 0; }
  phase = 'back'; walkT = WALK_LEN;
}
function putStatueBack(ctx) {
  if (aiStatue && aiStatue.map === ctx.S.map) {
    try { ctx.place(ctx.S.map, aiStatue.type, aiStatue.x, aiStatue.y, aiStatue.extra); } catch (e) { }
  }
  aiStatue = null; ai = null; phase = 'idle'; result = null;
}
function abort(ctx) {                                   // zone change / reset in the middle of anything
  if (phase === 'pick') closePick(ctx);
  if (phase === 'walk' || phase === 'duel' || phase === 'end') { restorePlayer(ctx); if (ctx.S.mode === 'sumo') ctx.setMode('play'); }
  aiStatue = null; ai = null; phase = 'idle'; result = null; fx.length = 0;
}

// ---------------------------------------------------------------- the system
export const sumo = {
  id: 'sumo',

  onZoneEnter(ctx) {
    CTX = ctx;
    abort(ctx);
    ring = null; signObj = null;
    ctx.defineObject('sumo_ring', RING_TILES * 16, RING_TILES * 16, RING_TILES, RING_TILES, ringArt, { solid: false });
    const m = ctx.S.map;
    if (m.sea || ctx.S.zone.id === 'village' || !m.plots || m.plots.length < 2) return;
    placeRing(ctx);
  },

  onZoneLeave(ctx) { abort(ctx); ring = null; signObj = null; },

  near(ctx) {
    if (!ring || phase !== 'idle') return null;
    const p = ctx.S.player, d = Math.hypot(p.x - ring.cx, p.y - ring.cy);
    if (d > RING_R + 8) return null;
    const S = L(ctx), pilot = ctx.isRocky();
    return { label: pilot ? S.near : S.nearNo, x: ring.cx, y: ring.cy, limit: RING_R + 8, priority: true, data: { pilot } };
  },

  interact(ctx, cand) {
    if (!ring || phase !== 'idle') return;
    if (!cand.data.pilot) { ctx.toast(L(ctx).explain); return; }
    openPick(ctx);
  },

  update(dt, ctx) {
    CTX = ctx;
    updateFx(dt);
    if (!ring || !ai) return;
    if (ai.hurt > 0) ai.hurt -= dt;
    if (phase === 'walk' || phase === 'back') {
      walkT -= dt; ai.bob += dt;
      const k = Math.max(0, Math.min(1, 1 - walkT / WALK_LEN));
      ai.x = ai.from.x + (ai.to.x - ai.from.x) * k; ai.y = ai.from.y + (ai.to.y - ai.from.y) * k;
      if (walkT <= 0) {
        if (phase === 'walk') { phase = 'duel'; ctx.S.player.faceTo(ai.x, ai.y); ai.dir = -1; ctx.toast(L(ctx).fight, true); ctx.sfx('roar'); dust(ai.x, ai.y, 8); }
        else putStatueBack(ctx);
      }
      return;
    }
    if (phase === 'end') { endT -= dt; if (endT <= 0) endDuel(ctx); return; }
    if (phase !== 'duel' || ctx.S.mode !== 'sumo') return;

    // ---- the bout ----
    const p = ctx.S.player;
    left -= dt; if (cd > 0) cd -= dt;
    p.update(dt, ctx.input, ctx.S.map, ctx.allNpcs());    // core skips player movement outside 'play' — drive it here
    if (p.moving) animT += dt; else animT = 0; p.animT = animT;
    updateAi(dt, ctx);                                     // may shove → finish()
    if (phase !== 'duel') return;
    resolveContact(ctx);
    const dA = Math.hypot(ai.x - ring.cx, ai.y - ring.cy), dP = Math.hypot(p.x - ring.cx, p.y - ring.cy);
    if (left <= 0) { ctx.toast(L(ctx).timeUp); finish(ctx, dP <= dA); }
  },

  // the dohyo (under everything) and the visiting statue, depth-sorted with the world
  drawables(ctx, cx, cy) {
    if (!ring) return [];
    const g = ctx.g, out = [];
    const rx = ring.tx * 16 - cx, ry = ring.ty * 16 - cy;
    if (rx > -100 && ry > -100 && rx < ctx.VW + 20 && ry < ctx.VH + 20) out.push({ y: -1e6, f: () => g.drawImage(ctx.O.sumo_ring.img, rx, ry) });
    if (ai) {
      const walking = phase === 'walk' || phase === 'back' || (phase === 'duel' && ai.circling > 0);
      const bob = walking && Math.floor(ai.bob / 0.16) % 2 ? 1 : 0;
      const x = Math.round(ai.x) - (ai.w >> 1) - cx, y = Math.round(ai.y) - ai.h + 2 - bob - cy;
      out.push({
        y: ai.y, f: () => {
          g.save();
          g.fillStyle = 'rgba(0,0,0,.28)'; g.beginPath(); g.ellipse(Math.round(ai.x) - cx, Math.round(ai.y) + 1 - cy, ai.w * 0.4, ai.w * 0.16, 0, 0, TAU); g.fill();
          if (ai.dir > 0) { g.translate(x + ai.w, y); g.scale(-1, 1); g.drawImage(ai.img, 0, 0, ai.w, ai.h); }
          else g.drawImage(ai.img, x, y, ai.w, ai.h);
          g.restore();
        }
      });
    }
    return out;
  },

  // dust, rope-edge warning
  draw(g, ctx, cx, cy) {
    if (!ring) return;
    if (phase === 'duel' && ai) {
      const p = ctx.S.player;
      for (const o of [ai, p]) {
        const dx = o.x - ring.cx, dy = o.y - ring.cy, d = Math.hypot(dx, dy);
        if (d < 24) continue;
        const a = Math.atan2(dy, dx), k = Math.min(1, (d - 24) / 12);
        g.strokeStyle = `rgba(255,${o === ai ? '212,94' : '80,90'},${(0.35 + 0.55 * k).toFixed(2)})`; g.lineWidth = 2;
        g.beginPath(); g.arc(ring.cx - cx, ring.cy - cy, RING_R + 1, a - 0.7, a + 0.7); g.stroke();
      }
    }
    for (const q of fx) {
      g.globalAlpha = Math.max(0, Math.min(1, q.t * 2.5));
      const x = Math.round(q.x) - cx, y = Math.round(q.y) - cy;
      g.fillStyle = '#5a4630'; g.fillRect(x - 1, y - 1, q.s + 2, q.s + 2);
      g.fillStyle = q.c; g.fillRect(x, y, q.s, q.s);
    }
    g.globalAlpha = 1;
  },

  // timer + the two names on the crisp overlay
  drawUI(ug, ctx, cx, cy, scale) {
    if (!ai || phase === 'back') return;
    const S = L(ctx), W = ug.canvas.width, H = ug.canvas.height;
    const bw = Math.max(210, Math.min(420, Math.round(W * 0.38))), bh = Math.max(34, Math.round(scale * 11));
    const bx = Math.round((W - bw) / 2), by = Math.min(Math.max(122, Math.round(H * 0.17)), Math.max(60, H - 120)) + Math.max(20, Math.round(scale * 7));   // under rocky.js's pilot bar
    ug.save();
    ug.fillStyle = 'rgba(13,11,20,.78)'; ug.beginPath(); ug.roundRect(bx, by, bw, bh, 6); ug.fill();
    ug.strokeStyle = '#e6d5ab'; ug.lineWidth = 1; ug.beginPath(); ug.roundRect(bx + .5, by + .5, bw - 1, bh - 1, 6); ug.stroke();
    const k = Math.max(0, Math.min(1, left / DUEL_LEN));
    ug.fillStyle = k < 0.2 ? 'rgba(255,31,75,.55)' : 'rgba(230,213,171,.35)';
    ug.beginPath(); ug.roundRect(bx + 3, by + bh - 7, Math.max(0, (bw - 6) * k), 4, 2); ug.fill();
    ug.textBaseline = 'middle';
    const fs = Math.max(11, Math.round(scale * 3.3));
    ug.font = `bold ${fs}px "Segoe UI",system-ui,sans-serif`;
    ug.textAlign = 'left'; ug.fillStyle = '#8fd3ff'; ug.fillText(myKey ? `${S.you} · ${fullName(ctx, myKey)}` : S.you, bx + 10, by + bh / 2 - 3);
    ug.textAlign = 'right'; ug.fillStyle = '#ffd45e'; ug.fillText(ai.name, bx + bw - 10, by + bh / 2 - 3);
    ug.textAlign = 'center'; ug.fillStyle = '#fff'; ug.font = `bold ${Math.max(13, Math.round(scale * 4.2))}px "Segoe UI",system-ui,sans-serif`;
    const t = phase === 'duel' || phase === 'end' ? Math.max(0, Math.ceil(left)) : DUEL_LEN;
    ug.fillText(phase === 'walk' ? '…' : `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`, bx + bw / 2, by + bh / 2 - 3);
    ug.restore();
  },

  hudLines(ctx) {
    if (!ai) return [];
    const S = L(ctx);
    if (phase === 'walk') return [S.walkHud];
    if (phase === 'duel') { const t = Math.max(0, Math.ceil(left)); return [S.hud(`${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`, shoves)]; }
    return [];
  }
};

// ---------------------------------------------------------------- test hooks
if (typeof window !== 'undefined') {
  window.__sumo = {
    ring: () => ring ? { ...ring, sign: signObj ? { x: signObj.x, y: signObj.y } : null } : null,
    start: (key, force = true) => CTX && ring ? startDuel(CTX, key, force) : false,
    state: () => ({ phase, mode: CTX ? CTX.S.mode : null, left: +left.toFixed(1), shoves, result, myKey, ai: ai ? { key: ai.key, tier: ai.tier, x: Math.round(ai.x), y: Math.round(ai.y), res: ai.res, dist: ring ? Math.round(Math.hypot(ai.x - ring.cx, ai.y - ring.cy)) : null } : null, player: CTX && ring ? { x: Math.round(CTX.S.player.x), y: Math.round(CTX.S.player.y), dist: Math.round(Math.hypot(CTX.S.player.x - ring.cx, CTX.S.player.y - ring.cy)) } : null, sys: CTX ? CTX.S.save.sys.sumo : null }),
    win: () => { if (CTX && ai && (phase === 'duel' || phase === 'walk')) { if (phase === 'walk') { phase = 'duel'; } finish(CTX, true); return true; } return false; },
    lose: () => { if (CTX && ai && (phase === 'duel' || phase === 'walk')) { if (phase === 'walk') { phase = 'duel'; } finish(CTX, false); return true; } return false; },
    shove: () => { if (CTX) playerShove(CTX); },
    find: () => CTX ? findRing(CTX, CTX.S.map) : null,
    ok: (tx, ty) => CTX ? footprintOk(CTX, CTX.S.map, tx, ty) : null,
    blockers: (tx, ty) => CTX ? objectsIn(CTX, CTX.S.map, tx - 1, ty - 1, tx + RING_TILES, ty + RING_TILES).filter(o => !plainDecor(o)).map(o => [o.type, o.x, o.y]) : null
  };
}
