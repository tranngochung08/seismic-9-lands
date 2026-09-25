// districts.js — living nation districts (see systems/API.md).
//
// Raiders (or Rocky) knock pieces out of a nation's yard. The notice board inside the yard
// then asks you for materials: deliver them and the nation's own artists pick up their tools,
// walk to each ruin, raise a scaffold and rebuild the district piece by piece.
// A whole district whose nation trusts you offers the next tier — pay the wood and stone and
// the crew raises the whole yard one step (Camp → Yard → Court → Estate → Citadel → Sanctum).
// How fast they work depends on the land's Magnitude (every artist there has that level),
// on how many artworks they have posted, and on whether you fed them.

import { getCarry, removeCarry } from './animals.js';

const TS = 16;
const SCAN = 0.5;          // seconds between damage scans
const FEED_SEC = 90;       // one animal keeps the crew at double speed this long
const MAX_WORKERS = 4;
const TRUST_MIN = 0.5;
const REACH = 40;          // px radius around the notice board
const ARRIVE = 15;         // px: close enough to the ruin to start hammering
const WALK_TIMEOUT = 12;   // s: give up on one approach route and try another

// ---------------------------------------------------------------- text
const TIERS = { en: ['Camp', 'Yard', 'Court', 'Estate', 'Citadel', 'Sanctum'], vi: ['Trại', 'Sân', 'Dinh', 'Điền trang', 'Thành trì', 'Thánh điện'] };
// NPC skill by the land's Magnitude: [max level, seconds per piece, title]
const SKILL = [
  { max: 1, sec: 40, en: 'Apprentice', vi: 'Thợ học việc' },
  { max: 3, sec: 30, en: 'Builder', vi: 'Thợ' },
  { max: 5, sec: 22, en: 'Master builder', vi: 'Thợ cả' },
  { max: 7, sec: 15, en: 'Artisan', vi: 'Nghệ nhân' },
  { max: 8, sec: 12, en: 'Grand artisan', vi: 'Nghệ nhân bậc cao' },
  { max: 9, sec: 8, en: 'Grandmaster', vi: 'Bậc thầy' }
];
const STR = {
  en: {
    deliverNear: 'Deliver materials', upgradeNear: 'Upgrade district', feedNear: 'Feed the workers',
    close: 'Close', deliverBtn: 'Deliver what I have', feedBtn: 'Feed the workers',
    condition: 'Condition', ruined: n => `${n} ${n === 1 ? 'piece' : 'pieces'} in ruins`, whole: 'Every piece stands.',
    needTitle: '🛠 Materials needed', upTitle: t => `⬆ Raise to ${t}`, bag: 'bag',
    crew: (k, title) => `👷 ${k} × ${title}`, perPiece: s => `${s}s per piece`, fedFor: s => `fed ×2 · ${s}s left`,
    progress: (a, b) => `${a}/${b} rebuilt`, buildBar: p => `Building… ${p}%`,
    trustLock: (k, n) => `Earn their trust: met ${k}/${n}`,
    rebuilt: 'District rebuilt!', raised: (nation, t) => `${nation} raised to ${t}!`,
    nothing: 'Nothing to deliver — your bag is empty.', gave: n => `Delivered ${n} materials`,
    allIn: 'All materials delivered — the crew is on its way.',
    fedOk: 'The workers eat and speed up! ×2 for 90s', noFood: 'Carry a 🐟 fish, 🐔 chicken or 🐄 cow to feed them.',
    noCrew: 'No artist of this nation is here to build.', alertNeed: (f, n) => `🛠 ${f} ${n} — the district needs repairs`,
    upReady: t => `Next tier: ${t}`, capped: 'This yard is as grand as the land allows.'
  },
  vi: {
    deliverNear: 'Giao vật liệu', upgradeNear: 'Nâng cấp khu', feedNear: 'Cho thợ ăn',
    close: 'Đóng', deliverBtn: 'Giao hết chỗ đang có', feedBtn: 'Cho thợ ăn',
    condition: 'Tình trạng', ruined: n => `${n} phần đổ nát`, whole: 'Mọi thứ còn nguyên.',
    needTitle: '🛠 Vật liệu cần', upTitle: t => `⬆ Nâng lên ${t}`, bag: 'túi',
    crew: (k, title) => `👷 ${k} × ${title}`, perPiece: s => `${s} giây mỗi phần`, fedFor: s => `đã ăn ×2 · còn ${s}s`,
    progress: (a, b) => `${a}/${b} đã dựng lại`, buildBar: p => `Đang xây… ${p}%`,
    trustLock: (k, n) => `Cần tin tưởng: đã gặp ${k}/${n}`,
    rebuilt: 'Khu đã xây lại!', raised: (nation, t) => `${nation} lên ${t}!`,
    nothing: 'Không có gì để giao — túi trống.', gave: n => `Đã giao ${n} vật liệu`,
    allIn: 'Đã giao đủ vật liệu — thợ đang tới.',
    fedOk: 'Thợ ăn xong, làm nhanh gấp đôi! ×2 trong 90 giây', noFood: 'Cần mang 🐟 cá, 🐔 gà hoặc 🐄 bò để cho thợ ăn.',
    noCrew: 'Không có nghệ sĩ nước này ở đây để xây.', alertNeed: (f, n) => `🛠 ${f} ${n} — khu cần sửa chữa`,
    upReady: t => `Bậc tiếp theo: ${t}`, capped: 'Khu này đã cao nhất mức vùng đất cho phép.'
  }
};
const L = ctx => STR[ctx.lang() === 'vi' ? 'vi' : 'en'];
const lg = ctx => (ctx.lang() === 'vi' ? 'vi' : 'en');
const tierName = (ctx, t) => TIERS[lg(ctx)][Math.max(0, Math.min(5, t | 0))];
const skillOf = lv => SKILL.find(s => lv <= s.max) || SKILL[SKILL.length - 1];
const skillTitle = (ctx, lv) => skillOf(lv)[lg(ctx)];
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// ---------------------------------------------------------------- costs
// Materials for one ruined piece. Only wood 🪵 and Seismic stones 🪨 exist today.
function costOf(piece, tier) {
  if (piece === 'board') return { wood: 2, stone: 1 };
  if (piece === 'house' || piece === 'fountain') return { wood: 4, stone: 2 };
  if (piece === 'rocky') return { wood: 2, stone: 5 };
  if (tier <= 1) return { wood: 2, stone: 0 };            // wall / corner / flag / light
  if (tier <= 3) return { wood: 1, stone: 1 };
  return { wood: 0, stone: 3 };
}
const upCost = n => ({ wood: 8 * n, stone: 4 * n });
const enough = (have, need) => (have.wood || 0) >= need.wood && (have.stone || 0) >= need.stone;

// ---------------------------------------------------------------- persisted state
function sysRoot(ctx) {
  const sv = ctx.S.save; sv.sys = sv.sys || {};
  return (sv.sys.districts = sv.sys.districts || {});
}
function sysState(ctx, i) {
  const z = (sysRoot(ctx)[ctx.S.zone.id] = sysRoot(ctx)[ctx.S.zone.id] || {});
  const s = (z[i] = z[i] || {});
  if (!s.delivered || typeof s.delivered !== 'object') s.delivered = { wood: 0, stone: 0 };
  if (!s.updel || typeof s.updel !== 'object') s.updel = { wood: 0, stone: 0 };
  s.delivered.wood |= 0; s.delivered.stone |= 0; s.updel.wood |= 0; s.updel.stone |= 0;
  return s;
}
// read-only peek: keeps the save free of an entry for every plot of every land
const peekState = (ctx, i) => (sysRoot(ctx)[ctx.S.zone.id] || {})[i] || null;
const fedLeft = (ctx, i) => { const s = peekState(ctx, i); return s && s.fed ? Math.max(0, (s.fed - Date.now()) / 1000) : 0; };
const fedMul = (ctx, i) => (fedLeft(ctx, i) > 0 ? 2 : 1);

// ---------------------------------------------------------------- requests & offers
// One pass over map.objects per frame, grouped by plot — `piecesOf` per plot every frame would be O(plots × objects).
let infoT = -1, INFO = null;
const dropInfo = () => { INFO = null; infoT = -1; };
function infos(ctx) {
  const plots = ctx.S.map.plots;
  if (INFO && infoT === ctx.S.time && INFO.length === plots.length) return INFO;
  const arr = plots.map(() => ({ ruined: [], total: 0, need: { wood: 0, stone: 0 }, board: null }));
  for (const o of ctx.S.map.objects) {
    const a = o.plot === undefined ? null : arr[o.plot]; if (!a) continue;
    a.total++;
    if (o.piece === 'board') a.board = o;
    if (o.ruined) { a.ruined.push(o); const c = costOf(o.piece, plots[o.plot].tier || 0); a.need.wood += c.wood; a.need.stone += c.stone; }
  }
  INFO = arr; infoT = ctx.S.time;
  return arr;
}
// The repair request of a district: materials for every ruined piece, or null when the yard is whole.
function requestOf(ctx, i) {
  const a = infos(ctx)[i];
  return a && a.ruined.length ? { need: a.need, n: a.ruined.length, list: a.ruined } : null;
}
function metCount(ctx, key) {
  const mine = ctx.S.npcs.filter(n => n.m && !n.m.guide && ctx.nationOf(n.m)?.key === key), met = ctx.metIds();
  return [mine.filter(n => met.has(n.m.id)).length, mine.length];
}
// An upgrade offer: whole district, below the land's cap, and the nation trusts you.
function offerOf(ctx, i) {
  const plot = ctx.S.map.plots[i]; if (!plot) return null;
  if (requestOf(ctx, i)) return null;
  const next = (plot.tier || 0) + 1;
  if (next > ctx.tierCap()) return null;
  const ok = ctx.trust(plot.nation) >= TRUST_MIN;
  return { next, cost: upCost(next), ok };
}

// ---------------------------------------------------------------- module state
const JOBS = new Map();     // plot index -> running build job
const BUSY = new Set();     // NPCs we hold
const fx = [];              // particles
let scanT = 0, uiT = 0, openPlot = -1, panelEl = null, closerSet = false;
let known = new Set();      // plots we have already warned about

// ---------------------------------------------------------------- sprites (built once, procedurally)
let SPR = null;
function sprites(ctx) {
  if (SPR) return SPR;
  const P = ctx.PAL;
  const px = (g, x, y, c, w = 1, h = 1) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
  const tool = (head, shine) => {
    const c = ctx.mkCanvas(12, 14), g = c.getContext('2d');
    px(g, 5, 3, P.out, 3, 11); px(g, 6, 4, P.wood, 1, 9);          // handle
    px(g, 1, 0, P.out, 10, 6); px(g, 2, 1, head, 8, 4);            // head
    px(g, 3, 2, shine, 2, 1);
    return c;
  };
  SPR = {
    mallet: tool(P.wood, '#b98a52'),        // ≤ M3 — wooden mallet
    iron: tool(P.stone, P.stoneL),          // M4–M7 — iron hammer
    gold: tool(P.gold, '#fff6cf')           // M8–M9 — golden hammer (glows)
  };
  return SPR;
}
const toolFor = lv => (lv >= 8 ? 'gold' : lv >= 4 ? 'iron' : 'mallet');

// ---------------------------------------------------------------- particles
function spawnFx(x, y, lv) {
  for (let i = 0; i < 7; i++) {
    const a = Math.random() * Math.PI * 2, sp = 12 + Math.random() * 28;
    if (lv <= 3) fx.push({ x: x + (Math.random() * 8 - 4), y: y - 4, vx: Math.cos(a) * sp * 0.6, vy: -14 - Math.random() * 18, g: 30, t: 0.8, life: 0.8, c: i % 3 ? '#efe4cf' : '#cdbb98', s: 2 });
    else if (lv <= 7) fx.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 18, g: 130, t: 0.38, life: 0.38, c: i % 2 ? '#ffd45e' : '#fff2b8', s: 1 });
    else fx.push({ x, y, vx: Math.cos(a) * sp * 0.4, vy: -14 - Math.random() * 14, g: -8, t: 0.8, life: 0.8, c: '#ffd45e', s: 2, glint: true });
  }
}

// ---------------------------------------------------------------- geometry helpers
const defOf = (ctx, o) => ctx.O[o.orig || o.type] || ctx.O[o.type];
const tileFeet = (tx, ty) => ({ x: tx * TS + 8, y: ty * TS + 14 });
function freeNear(ctx, tx, ty, taken) {
  const map = ctx.S.map;
  const ring = [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1], [2, 0], [-2, 0], [0, 2], [0, -2], [2, 1], [-2, 1]];
  for (const [dx, dy] of ring) {
    const x = tx + dx, y = ty + dy, k = x + ',' + y;
    if (ctx.isSolid(map, x, y)) continue;
    if (taken && taken.has(k)) continue;
    if (taken) taken.add(k);
    return { x, y };
  }
  return { x: tx, y: ty };
}
// Walkable tiles from which a worker can reach one piece: inside the yard first, the tile below next.
function approachTiles(ctx, plot, o, npc) {
  const map = ctx.S.map, d = defOf(ctx, o), fw = d.fw, fh = d.fh, out = [];
  for (let j = -1; j <= fh; j++) for (let i = -1; i <= fw; i++) {
    if (i >= 0 && i < fw && j >= 0 && j < fh) continue;                       // the piece itself
    const diag = (i === -1 || i === fw) && (j === -1 || j === fh);
    const tx = o.x + i, ty = o.y + j;
    if (ctx.isSolid(map, tx, ty)) continue;
    const inside = tx > plot.x && tx < plot.x + plot.w - 1 && ty > plot.y && ty < plot.y + plot.h - 1;
    const below = j === fh;
    const dist = Math.hypot(tx * TS + 8 - npc.x, ty * TS + 14 - npc.y) / 64;
    out.push({ tx, ty, score: (inside ? 0 : 6) + (below ? 0 : 1) + (diag ? 2 : 0) + dist });
  }
  out.sort((a, b) => a.score - b.score);
  return out;
}
// tiles other people stand on — walking into them only wedges everybody
function occupiedTiles(ctx, except) {
  const s = new Set();
  for (const n of ctx.allNpcs()) { if (n === except) continue; s.add(Math.floor(n.x / TS) + ',' + Math.floor((n.y - 3) / TS)); }
  const p = ctx.S.player; if (p) s.add(Math.floor(p.x / TS) + ',' + Math.floor((p.y - 3) / TS));
  return s;
}
// NPC steering is a straight line, so a worker crossing its yard wedges itself on the fountain or the statue.
// We walk them tile by tile instead: a BFS inside the district (plus a 3-tile skirt) gives the next step,
// and the route is re-planned whenever they arrive at a waypoint or stop making headway.
function pathTo(ctx, rect, from, to, occ) {
  const map = ctx.S.map, W = rect.w, H = rect.h, x0 = rect.x, y0 = rect.y;
  const id = (x, y) => (y - y0) * W + (x - x0);
  const inR = (x, y) => x >= x0 && y >= y0 && x < x0 + W && y < y0 + H;
  if (!inR(from.x, from.y) || !inR(to.x, to.y)) return null;
  const prev = new Int32Array(W * H).fill(-2), q = [from];
  prev[id(from.x, from.y)] = -1;
  let found = false;
  while (q.length && !found) {
    const c = q.shift();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = c.x + dx, ny = c.y + dy;
      if (!inR(nx, ny) || prev[id(nx, ny)] !== -2 || ctx.isSolid(map, nx, ny)) continue;
      if (occ && occ.has(nx + ',' + ny) && !(nx === to.x && ny === to.y)) continue;
      prev[id(nx, ny)] = id(c.x, c.y);
      if (nx === to.x && ny === to.y) { found = true; break; }
      q.push({ x: nx, y: ny });
    }
  }
  if (!found) return null;
  const path = [];
  for (let cur = id(to.x, to.y); cur !== -1; cur = prev[cur]) path.push({ x: x0 + (cur % W), y: y0 + ((cur / W) | 0) });
  path.pop();                                                        // drop the tile we stand on
  return path.reverse();
}
const npcTile = n => ({ x: Math.floor(n.x / TS), y: Math.floor((n.y - 3) / TS) });
function unstick(ctx, npc) {
  const map = ctx.S.map, tx = Math.floor(npc.x / TS), ty = Math.floor((npc.y - 3) / TS);
  if (!ctx.isSolid(map, tx, ty)) return;
  for (let r = 1; r <= 5; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    const x = tx + dx, y = ty + dy;
    if (ctx.isSolid(map, x, y)) continue;
    npc.x = x * TS + 8; npc.y = y * TS + 14; return;
  }
}

// ---------------------------------------------------------------- crews
function skillMul(ctx, npc) {
  const m = (npc && npc.m) || {};
  let k = Math.max(0.6, Math.min(1, 1 - (m.i || 0) / 400));   // more artworks → faster
  if (ctx.isBooster(m)) k /= 1.5;
  if (ctx.isLeader(m)) k /= 1.3;
  return k;
}
const pieceSecs = (ctx, npc) => skillOf(ctx.S.zone.lv).sec * skillMul(ctx, npc);
function pickWorkers(ctx, plot) {
  const inYard = n => { const tx = Math.floor(n.x / TS), ty = Math.floor(n.y / TS); return tx >= plot.x && tx < plot.x + plot.w && ty >= plot.y && ty < plot.y + plot.h; };
  const free = n => n.m && !n.m.guide && !BUSY.has(n) && !n.busy;
  let list = ctx.S.npcs.filter(n => free(n) && ctx.nationOf(n.m)?.key === plot.nation);
  if (!list.length) list = ctx.S.npcs.filter(n => free(n) && inYard(n));       // nobody of the nation here → whoever stands in the yard
  const cx = (plot.x + plot.w / 2) * TS, cy = (plot.y + plot.h / 2) * TS;
  list.sort((a, b) => Math.hypot(a.x - cx, a.y - cy) - Math.hypot(b.x - cx, b.y - cy));
  return list.slice(0, MAX_WORKERS);
}
function releaseWorker(w) {
  const n = w && w.n; if (!n) return;
  n.busy = false; n.goal = null; n.speedMul = 1; n.stuck = 0;
  BUSY.delete(n);
}
function releaseJob(job) { for (const w of job.workers) releaseWorker(w); job.workers.length = 0; }
function releaseAll() { for (const job of JOBS.values()) releaseJob(job); JOBS.clear(); BUSY.clear(); }

// ---------------------------------------------------------------- jobs
function startJob(ctx, i, kind) {
  const plot = ctx.S.map.plots[i]; if (!plot || JOBS.has(i)) return null;
  const crew = pickWorkers(ctx, plot);
  if (!crew.length) return null;
  const map = ctx.S.map;
  const rect = { x: Math.max(0, plot.x - 3), y: Math.max(0, plot.y - 3), w: 0, h: 0 };
  rect.w = Math.min(map.w, plot.x + plot.w + 3) - rect.x; rect.h = Math.min(map.h, plot.y + plot.h + 3) - rect.y;
  const job = { i, kind, plot, rect, workers: [], done: 0, total: 0, t: 0, tmax: 0, cool: new Map(), res: new Map(), park: new Set(), scaff: [] };
  for (const n of crew) {
    BUSY.add(n); n.goal = null; n.busy = false;
    job.workers.push({ n, piece: null, state: 'idle', t: 0, max: 0, cands: null, ci: 0, walkT: 0, stepT: 0, idleT: 0, tries: 0, spot: null, hit: 0, gx: 0, gy: 0, lx: n.x, ly: n.y, noMoveT: 0, parked: false });
  }
  if (kind === 'repair') {
    job.total = ctx.piecesOf(i).filter(o => o.ruined).length;
  } else {
    const mul = job.workers.reduce((a, w) => a + skillMul(ctx, w.n), 0) / job.workers.length;
    job.tmax = job.t = 20 * (plot.tier + 1) * mul;
    const taken = new Set();
    for (const w of job.workers) {                                   // gather around the centre of the yard
      const sp = freeNear(ctx, plot.x + (plot.w >> 1), plot.y + (plot.h >> 1) + 1, taken);
      w.state = 'gather'; w.gx = sp.x; w.gy = sp.y; w.walkT = 0; w.stepT = 0; w.n.goal = null;
    }
    job.scaff = [[plot.x, plot.y], [plot.x + plot.w - 1, plot.y], [plot.x, plot.y + plot.h - 1], [plot.x + plot.w - 1, plot.y + plot.h - 1]].map(([x, y]) => ({ x, y }));
  }
  JOBS.set(i, job);
  return job;
}
function dropSpot(job, w) { if (w.spot) { job.res.delete(w.spot); w.spot = null; } }
function goIdle(ctx, job, w, cooldown) {
  if (cooldown && w.piece) job.cool.set(w.piece, ctx.S.time + 6);
  dropSpot(job, w);
  w.piece = null; w.state = 'idle'; w.cands = null; w.ci = 0; w.tries = 0;
  w.n.busy = false; w.n.goal = null;
}
function assignPiece(ctx, job, w, list) {
  const taken = new Set(job.workers.map(o => o.piece).filter(Boolean));
  const now = ctx.S.time, left = list.filter(o => o.ruined);
  const pick = left.find(o => !taken.has(o) && !(job.cool.get(o) > now)) || left.find(o => !taken.has(o));
  if (!pick) {                                     // nothing left to do: step aside so the others can work
    goIdle(ctx, job, w, false);
    if (!w.parked) {
      const p = job.plot, sp = freeNear(ctx, p.x + (p.w >> 1) + 1, p.y + (p.h >> 1) + 1, job.park);
      w.parked = true; w.gx = sp.x; w.gy = sp.y; w.state = 'park'; w.walkT = 0; w.stepT = 0; w.n.goal = null;
    }
    return false;
  }
  w.parked = false;
  w.piece = pick; w.cands = approachTiles(ctx, job.plot, pick, w.n); w.ci = 0; w.walkT = 0; w.tries = 0;
  return sendTo(ctx, job, w);
}
// claim the next free standing spot beside the piece
function sendTo(ctx, job, w) {
  dropSpot(job, w);
  while (w.cands && w.ci < w.cands.length) {
    const c = w.cands[w.ci], key = c.tx + ',' + c.ty;
    if (job.res.has(key)) { w.ci++; continue; }
    job.res.set(key, w); w.spot = key;
    w.gx = c.tx; w.gy = c.ty; w.state = 'walk'; w.walkT = 0; w.stepT = 0;
    w.n.busy = false; w.n.stuck = 0; w.n.goal = null;
    return true;
  }
  return false;
}
// one BFS step toward the claimed spot; 'there' when the worker can start hammering
function stepTowards(ctx, job, w) {
  const n = w.n, cur = npcTile(n);
  if (cur.x === w.gx && cur.y === w.gy) return 'there';
  const path = pathTo(ctx, job.rect, cur, { x: w.gx, y: w.gy }, occupiedTiles(ctx, n))
    || pathTo(ctx, job.rect, cur, { x: w.gx, y: w.gy });     // everybody in the way? walk anyway
  if (!path || !path.length) return 'nopath';
  // aim past the NPC's own tile: a goal closer than the entity's 6px arrival radius would "arrive" without moving
  let g = null;
  for (const p of path) { const q = tileFeet(p.x, p.y); if (Math.hypot(q.x - n.x, q.y - n.y) >= 11) { g = q; break; } }
  if (!g) return 'there';
  n.goal = g; n.stuck = 0; w.stepT = 0;
  return 'walking';
}
// An NPC pressed against a wall or another artist still "moves" by a fraction of a pixel, so the engine
// never marks it stuck. Watch the real distance covered instead and re-plan when it stops making headway.
function noProgress(dt, ctx, w) {
  const n = w.n;
  if (Math.hypot(n.x - (w.lx || 0), n.y - (w.ly || 0)) > 1.5) { w.lx = n.x; w.ly = n.y; w.noMoveT = 0; w.jam = 0; return false; }
  w.noMoveT = (w.noMoveT || 0) + dt;
  if (w.noMoveT < 1.2) return false;
  w.noMoveT = 0; w.jam = (w.jam || 0) + 1; n.goal = null;
  // two boxes that already overlap (the player walked onto the worker) can never step apart: slide them free
  if (w.jam >= 2) {
    w.jam = 0;
    const dx = Math.sign(w.gx * TS + 8 - n.x), dy = Math.sign(w.gy * TS + 14 - n.y);
    const nx = n.x + dx * 7, ny = n.y + dy * 7;
    if (!ctx.isSolid(ctx.S.map, Math.floor(nx / TS), Math.floor((ny - 3) / TS))) { n.x = nx; n.y = ny; }
  }
  w.lx = n.x; w.ly = n.y;
  return true;
}
function beginWork(ctx, w) {
  const n = w.n;
  w.state = 'work'; w.t = w.max = pieceSecs(ctx, n); w.hit = 0;
  n.goal = null; n.busy = true;
  if (w.piece) n.faceTo(w.piece.x * TS + 8, w.piece.y * TS + 8);
}
function updateRepair(dt, ctx, job) {
  const req = requestOf(ctx, job.i);
  if (!req) { finishRepair(ctx, job); return; }
  const left = req.list;
  const rate = fedMul(ctx, job.i), lv = ctx.S.zone.lv;
  for (const w of job.workers) {
    const n = w.n;
    if (!n || ctx.S.npcs.indexOf(n) < 0) { w.piece = null; w.state = 'gone'; continue; }
    n.speedMul = rate > 1 ? 1.6 : 1;
    if (w.piece && !w.piece.ruined) { goIdle(ctx, job, w, false); }   // somebody else fixed it
    if (!w.piece) { assignPiece(ctx, job, w, left); continue; }
    if (w.state === 'walk') {
      w.walkT += dt; w.stepT += dt;
      const d = Math.hypot(n.x - (w.gx * TS + 8), n.y - (w.gy * TS + 14));
      if (d < ARRIVE) beginWork(ctx, w);
      else if (!n.goal || w.stepT > 2 || noProgress(dt, ctx, w)) {           // arrived at a waypoint, or wedged: re-plan
        const r = stepTowards(ctx, job, w);
        if (r === 'there') beginWork(ctx, w);
        else if (r === 'nopath') { w.ci++; if (!sendTo(ctx, job, w)) goIdle(ctx, job, w, true); }
      }
      if (w.state === 'walk' && w.walkT > WALK_TIMEOUT) { w.ci++; if (!sendTo(ctx, job, w)) goIdle(ctx, job, w, true); }
    } else if (w.state === 'park') {
      w.walkT += dt; w.stepT += dt;
      const d = Math.hypot(n.x - (w.gx * TS + 8), n.y - (w.gy * TS + 14));
      if (d < ARRIVE || w.walkT > 8) { w.state = 'idle'; n.goal = null; }
      else if (!n.goal || w.stepT > 2 || noProgress(dt, ctx, w)) { if (stepTowards(ctx, job, w) !== 'walking') { w.state = 'idle'; n.goal = null; } }
    } else if (w.state === 'work') {
      w.t -= dt * rate;
      w.hit -= dt * rate;
      if (w.hit <= 0) { w.hit = 0.45; const d = defOf(ctx, w.piece); spawnFx(w.piece.x * TS + d.fw * 8, w.piece.y * TS + d.fh * 8, lv); }
      if (w.t <= 0) {
        const d = defOf(ctx, w.piece);
        spawnFx(w.piece.x * TS + d.fw * 8, w.piece.y * TS + d.fh * 8 - 4, lv);
        ctx.repair(w.piece); dropInfo();
        job.done++;
        goIdle(ctx, job, w, false);
      }
    } else if (w.state === 'idle') { w.idleT = (w.idleT || 0) - dt; if (w.idleT <= 0) { w.idleT = 0.4; assignPiece(ctx, job, w, left); } }
  }
}
function finishRepair(ctx, job) {
  const t = L(ctx);
  if (job.done > 0) { ctx.toast(t.rebuilt, true); ctx.quake(0.3); }
  const st = sysState(ctx, job.i);
  st.delivered = { wood: 0, stone: 0 };
  releaseJob(job); JOBS.delete(job.i);
  known.delete(job.i);
  ctx.persist();
  if (openPlot === job.i) renderPanel(ctx);
}
function updateUpgrade(dt, ctx, job) {
  const rate = fedMul(ctx, job.i);
  for (const w of job.workers) {
    const n = w.n;
    if (!n || ctx.S.npcs.indexOf(n) < 0) continue;
    n.speedMul = rate > 1 ? 1.6 : 1;
    if (w.state === 'gather') {
      w.walkT += dt; w.stepT += dt;
      const d = Math.hypot(n.x - (w.gx * TS + 8), n.y - (w.gy * TS + 14));
      if (d < ARRIVE || w.walkT > WALK_TIMEOUT) { w.state = 'work'; w.hit = 0; n.goal = null; n.busy = true; n.faceTo((job.plot.x + job.plot.w / 2) * TS, job.plot.y * TS); }
      else if (!n.goal || w.stepT > 2 || noProgress(dt, ctx, w)) { if (stepTowards(ctx, job, w) !== 'walking') { w.state = 'work'; n.busy = true; } }
    } else if (w.state === 'work') {
      w.hit -= dt * rate;
      if (w.hit <= 0) { w.hit = 0.5; const c = job.scaff[(Math.random() * job.scaff.length) | 0]; if (c) spawnFx(c.x * TS + 8, c.y * TS + 8, ctx.S.zone.lv); }
    }
  }
  job.t -= dt * rate;
  if (job.t > 0) return;
  const plot = ctx.S.map.plots[job.i], nation = ctx.S.nations.find(x => x.key === plot.nation);
  const np = ctx.upgradePlot(job.i);
  dropInfo();
  const st = sysState(ctx, job.i);
  st.updel = { wood: 0, stone: 0 };
  if (np) {
    ctx.toast(L(ctx).raised(`${nation ? nation.flag + ' ' : ''}${nation ? nation.name : plot.nation}`, tierName(ctx, np.tier)), true);
    ctx.quake(0.5);
  }
  for (const w of job.workers) { unstick(ctx, w.n); releaseWorker(w); }
  JOBS.delete(job.i);
  ctx.persist();
  if (openPlot === job.i) renderPanel(ctx);
}

// ---------------------------------------------------------------- scan
function scan(ctx) {
  const map = ctx.S.map; if (!map || !map.plots) return;
  const seen = new Set();
  for (let i = 0; i < map.plots.length; i++) {
    const req = requestOf(ctx, i);
    const st = peekState(ctx, i) || { delivered: {}, updel: {} };
    if (req) {
      seen.add(i);
      if (!known.has(i) && !JOBS.has(i)) {                                   // a subtle warning, once per district
        known.add(i);
        const nation = ctx.S.nations.find(x => x.key === map.plots[i].nation);
        ctx.alert(L(ctx).alertNeed(nation ? nation.flag : '🏳', nation ? nation.name : map.plots[i].nation), 6);
      }
      if (!JOBS.has(i) && enough(st.delivered || {}, req.need)) startJob(ctx, i, 'repair');
    } else {
      const off = offerOf(ctx, i);
      if (off && off.ok && !JOBS.has(i) && enough(st.updel || {}, off.cost)) startJob(ctx, i, 'upgrade');
    }
  }
  for (const i of [...known]) if (!seen.has(i)) known.delete(i);
}

// ---------------------------------------------------------------- panel
function matRow(ctx, label, sub, need, got) {
  const t = L(ctx), inv = ctx.S.save.inv || {};
  const cell = (icon, k) => (need[k] ? `<span class="hnum"><b>${icon} ${Math.min(got[k] || 0, need[k])}/${need[k]}</b><small>${t.bag} ${inv[k] || 0}</small></span>` : '');
  return `<div class="hrow"><span class="hwho"><b>${label}</b><div class="dim">${sub}</div></span>${cell('🪵', 'wood')}${cell('🪨', 'stone')}</div>`;
}
function renderPanel(ctx) {
  if (openPlot < 0) return;
  const i = openPlot, t = L(ctx), map = ctx.S.map, plot = map && map.plots[i];
  if (!plot) { closePanel(ctx); return; }
  const nation = ctx.S.nations.find(x => x.key === plot.nation) || { flag: '🏳', name: plot.nation };
  const stt = ctx.districtState(i), cond = Math.round((stt.condition || 0) * 100);
  const st = sysState(ctx, i), req = requestOf(ctx, i), off = offerOf(ctx, i), job = JOBS.get(i);
  const carry = getCarry(ctx), food = carry.findIndex(c => c.kind === 'fish' || c.kind === 'chicken' || c.kind === 'cow');
  const fed = Math.round(fedLeft(ctx, i));
  const lvTitle = skillTitle(ctx, ctx.S.zone.lv), secs = skillOf(ctx.S.zone.lv).sec;

  let rows = '';
  if (req) rows += matRow(ctx, t.needTitle, t.ruined(req.n), req.need, st.delivered);
  if (off && off.ok) rows += matRow(ctx, t.upTitle(tierName(ctx, off.next)), t.upReady(tierName(ctx, off.next)), off.cost, st.updel);
  if (off && !off.ok) { const [k, n] = metCount(ctx, plot.nation); rows += `<div class="hrow"><span class="hwho"><b>⬆ ${esc(tierName(ctx, off.next))}</b><div class="dim">${t.trustLock(k, n)}</div></span></div>`; }
  if (!req && !off) rows += `<div class="hrow"><span class="hwho"><b>✓</b><div class="dim">${t.capped}</div></span></div>`;
  if (job) {
    const prog = job.kind === 'repair'
      ? t.progress(job.done, Math.max(job.total, job.done))
      : t.buildBar(Math.max(0, Math.min(100, Math.round((1 - job.t / job.tmax) * 100))));
    rows += `<div class="hrow"><span class="hwho"><b>${t.crew(job.workers.length, lvTitle)}</b>` +
      `<div class="dim">${t.perPiece(secs)}${fed > 0 ? ' · ' + t.fedFor(fed) : ''}</div></span>` +
      `<span class="hnum"><b>${prog}</b></span></div>`;
  }

  const deliverable = (req && !enough(st.delivered, req.need)) || (off && off.ok && !enough(st.updel, off.cost));
  const bs = 'width:auto;margin:0;padding:8px 12px';
  const html = `<h2>${nation.flag} ${esc(nation.name)}<span class="chip">${esc(tierName(ctx, plot.tier || 0))} · ${plot.tier || 0}/${ctx.tierCap()}</span></h2>
    <p class="dim">${t.condition}: <b>${cond}%</b> · ${req ? t.ruined(req.n) : t.whole}</p>
    <div class="pbar"><div style="width:${cond}%"></div></div>
    <div class="scroll">${rows}</div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:6px">
      <button class="btn${deliverable ? ' primary' : ''}" id="dt-give" style="${bs}${deliverable ? '' : ';opacity:.4;cursor:default'}"${deliverable ? '' : ' disabled'}>${t.deliverBtn}</button>
      <button class="btn" id="dt-feed" style="${bs}${food >= 0 ? '' : ';opacity:.4;cursor:default'}"${food >= 0 ? '' : ' disabled'}>🍖 ${t.feedBtn}</button>
      <button class="btn" id="dt-close" style="${bs}">${t.close}</button>
    </div>`;
  panelEl = ctx.panel('districts', html);
  panelEl.hidden = false;
  const p = panelEl.panel;
  p.querySelector('#dt-give').onclick = () => deliver(ctx, i);
  p.querySelector('#dt-feed').onclick = () => feed(ctx, i);
  p.querySelector('#dt-close').onclick = () => closePanel(ctx);
}
function openPanel(ctx, i) {
  openPlot = i;
  ctx.setMode('districts');
  if (!closerSet) { ctx.registerCloser('districts', () => closePanel(ctx)); closerSet = true; }
  renderPanel(ctx);
}
function closePanel(ctx) {
  openPlot = -1;
  if (panelEl) panelEl.hidden = true;
  if (ctx.S.mode === 'districts') ctx.setMode('play');
}
function deliver(ctx, i) {
  const t = L(ctx), st = sysState(ctx, i), inv = (ctx.S.save.inv = ctx.S.save.inv || {});
  const req = requestOf(ctx, i), off = req ? null : offerOf(ctx, i);
  const target = req ? { need: req.need, bag: st.delivered } : (off && off.ok ? { need: off.cost, bag: st.updel } : null);
  if (!target) return;
  let moved = 0;
  for (const k of ['wood', 'stone']) {
    const want = Math.max(0, target.need[k] - (target.bag[k] || 0));
    const take = Math.min(want, inv[k] || 0);
    if (take > 0) { inv[k] = (inv[k] || 0) - take; target.bag[k] = (target.bag[k] || 0) + take; moved += take; }
  }
  if (!moved) { ctx.toast(t.nothing); return; }
  ctx.persist();
  ctx.toast(t.gave(moved));
  if (enough(target.bag, target.need)) {
    const job = startJob(ctx, i, req ? 'repair' : 'upgrade');
    ctx.toast(job ? t.allIn : t.noCrew, true);
  }
  renderPanel(ctx);
}
function feed(ctx, i) {
  const t = L(ctx), carry = getCarry(ctx);
  const idx = carry.findIndex(c => c.kind === 'fish' || c.kind === 'chicken' || c.kind === 'cow');
  if (idx < 0) { ctx.toast(t.noFood); return; }
  removeCarry(ctx, idx);                       // also re-syncs save.inv.<kind> and persists
  const st = sysState(ctx, i);
  st.fed = Date.now() + FEED_SEC * 1000;
  ctx.persist();
  ctx.toast(t.fedOk, true);
  renderPanel(ctx);
}

// ---------------------------------------------------------------- the system
export const districts = {
  id: 'districts',

  onZoneEnter(ctx) {
    releaseAll(); dropInfo(); fx.length = 0; known = new Set(); scanT = 0; uiT = 0;
    if (openPlot >= 0) closePanel(ctx);
    sysRoot(ctx);
  },

  onZoneLeave(ctx) {
    releaseAll(); dropInfo(); fx.length = 0; known = new Set();
    if (openPlot >= 0) closePanel(ctx);
  },

  update(dt, ctx) {
    for (let i = fx.length - 1; i >= 0; i--) {
      const q = fx[i]; q.t -= dt;
      if (q.t <= 0) { fx.splice(i, 1); continue; }
      q.x += q.vx * dt; q.y += q.vy * dt; q.vy += q.g * dt; q.vx *= 0.94;
    }
    if (!ctx.S.map || !ctx.S.map.plots) return;
    scanT -= dt;
    if (scanT <= 0) { scanT = SCAN; try { scan(ctx); } catch (e) { console.error('districts scan', e); } }
    for (const job of [...JOBS.values()]) {
      if (!ctx.S.map.plots[job.i]) { releaseJob(job); JOBS.delete(job.i); continue; }
      if (job.workers.length === 0) { JOBS.delete(job.i); continue; }
      if (job.kind === 'repair') updateRepair(dt, ctx, job); else updateUpgrade(dt, ctx, job);
    }
    if (openPlot >= 0) { uiT -= dt; if (uiT <= 0) { uiT = 0.5; renderPanel(ctx); } }
  },

  // The notice board asks for help: deliver materials, pay for a tier, or feed the crew while it builds.
  near(ctx) {
    const map = ctx.S.map; if (!map || !map.plots || openPlot >= 0) return null;
    const t = L(ctx), p = ctx.S.player;
    const info = infos(ctx);
    let best = null, bd = Infinity;
    for (let i = 0; i < map.plots.length; i++) {
      const job = JOBS.get(i), req = requestOf(ctx, i), off = req ? null : offerOf(ctx, i);
      if (!job && !req && !off) continue;
      const board = info[i].board; if (!board) continue;
      const locked = !job && !req && off && !off.ok;                    // whole yard, but the nation does not trust you yet
      const limit = locked ? 26 : REACH;
      const d = defOf(ctx, board);
      const x = board.x * TS + d.fw * 8, y = (board.y + d.fh) * TS;
      const dist = Math.hypot(x - p.x, y - p.y);
      if (dist > limit || dist >= bd) continue;
      bd = dist;
      const label = job ? t.feedNear : req ? t.deliverNear : off.ok ? t.upgradeNear : t.trustLock(...metCount(ctx, map.plots[i].nation));
      best = { label, x, y, limit, priority: !locked, data: { i } };
    }
    return best;
  },

  interact(ctx, cand) {
    const i = cand && cand.data && cand.data.i;
    if (i === undefined || i < 0) return;
    openPanel(ctx, i);
  },

  // scaffolds on whatever is being rebuilt right now
  drawables(ctx, cx, cy) {
    const out = [], img = ctx.O.scaffold && ctx.O.scaffold.img; if (!img) return out;
    const h = ctx.O.scaffold.h || 32;
    const add = (tx, ty) => { const by = (ty + 1) * TS; out.push({ y: by + 2, f: () => ctx.g.drawImage(img, tx * TS - cx, by - h - cy) }); };
    for (const job of JOBS.values()) {
      if (job.kind === 'upgrade') { for (const s of job.scaff) add(s.x, s.y); continue; }
      for (const w of job.workers) {
        if (w.state !== 'work' || !w.piece) continue;
        const d = defOf(ctx, w.piece);
        for (let i = 0; i < Math.min(2, d.fw); i++) add(w.piece.x + i, w.piece.y + d.fh - 1);
      }
    }
    return out;
  },

  // tools in the workers' hands + dust / sparks / glints
  draw(g, ctx, cx, cy) {
    const S = sprites(ctx), lv = ctx.S.zone.lv, img = S[toolFor(lv)];
    for (const job of JOBS.values()) {
      for (const w of job.workers) {
        const n = w.n; if (!n || (w.state !== 'work' && w.state !== 'walk')) continue;
        const swing = w.state === 'work' ? Math.sin(ctx.S.time * 9) * 0.7 - 0.35 : -0.2;
        const x = Math.round(n.x - cx) + (n.dir === 1 ? -8 : 7), y = Math.round(n.y - cy) - 13;
        g.save();
        if (lv >= 8) {
          const gr = g.createRadialGradient(x, y - 4, 1, x, y - 4, 12);
          gr.addColorStop(0, 'rgba(255,212,94,.35)'); gr.addColorStop(1, 'rgba(255,212,94,0)');
          g.fillStyle = gr; g.fillRect(x - 12, y - 16, 24, 24);
        }
        g.translate(x, y + 6); g.rotate(n.dir === 1 ? -swing : swing); g.scale(n.dir === 1 ? -1 : 1, 1);
        g.drawImage(img, -6, -12);
        g.restore();
      }
    }
    for (const q of fx) {
      const a = Math.max(0, Math.min(1, q.t / q.life));
      g.globalAlpha = q.glint ? a * (0.6 + 0.4 * Math.sin(ctx.S.time * 18 + q.x)) : a;
      const x = Math.round(q.x - cx), y = Math.round(q.y - cy);
      g.fillStyle = ctx.PAL.out; g.fillRect(x - 1, y - 1, q.s + 2, q.s + 2);
      g.fillStyle = q.c; g.fillRect(x, y, q.s, q.s);
    }
    g.globalAlpha = 1;
  },

  hudLines(ctx) {
    const map = ctx.S.map; if (!map || !map.plots) return [];
    let need = 0;
    for (let i = 0; i < map.plots.length; i++) if (!JOBS.has(i) && requestOf(ctx, i)) need++;
    const out = [];
    if (need) out.push('🛠 ' + need);
    if (JOBS.size) out.push('👷 ' + JOBS.size);
    return out;
  }
};
