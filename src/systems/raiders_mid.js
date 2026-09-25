// raiders_mid.js — the raiders of the middle lands (see systems/API.md)
//
//   M4 · Rockfall Mine   — Tommyknockers (Quỷ mỏ): two Cornish mine imps fade out of the dark at a
//                          district's corner, knock its walls apart and snuff its torches. Two burning
//                          lights keep them outside the fence; they circle, then give up after 30 s.
//                          Repel: E · Strike with the axe (2 hits) — or run them over as Rocky.
//   M5 · Fault Canyon    — the Sandworm (Olgoi-Khorkhoi): rises out of the chasm in a puff of dust,
//                          burrows straight under the fences and swallows walls whole.
//                          Repel: drop a live animal as bait (E while carrying) — or 3 Rocky hits.
//   M6 · Leaning City    — Gargoyles: the statues on a district's corner pillars wake up, fly, and
//                          throw stones at the house, the fountain and the board. Stone only cracks
//                          in lantern light: E · Smash while they drift within 3 tiles of a lantern.
//
// One raid at a time, 20 s of warning first, capped at 40% of the district's pieces.

import { mkCanvas, HOOK } from '../gfx.js';
import { getCarry, removeCarry } from './animals.js';

// ---------------------------------------------------------------- strings
const STR = {
  en: {
    knocker: 'Tommyknocker', worm: 'Sandworm', garg: 'Gargoyle',
    warn: {
      knocker: n => `⚠ Knocking in the dark under ${n} — knockers are coming`,
      worm: n => `⚠ The ground hums by the chasm — something is heading for ${n}`,
      garg: n => `⚠ The corner statues of ${n} are opening their eyes`
    },
    raid: {
      knocker: n => `⚠ Knockers are wrecking ${n} — strike them!`,
      worm: n => `⚠ The sandworm is eating ${n}'s walls — bait it!`,
      garg: n => `⚠ Gargoyles are stoning ${n} — smash them in the lantern light!`
    },
    npc: {
      knocker: 'Hear that knocking? Keep the torches lit!',
      worm: 'The sand is moving. Grab an animal — it only wants meat!',
      garg: 'The statues are waking. Fight them under a lantern!'
    },
    strike: 'Strike', smash: 'Smash', bait: 'Drop bait', baitNo: 'Bait: bring an animal (catch a chicken/cow, or fish one)',
    needAxe: 'Needs an axe — craft Axe I at the workbench (5 wood).',
    needBait: 'The worm only wants meat — catch a chicken/cow in the village or fish at a shore, then come back.',
    tooDark: 'Too dark to hit — lure it into lantern light',
    fearLight: 'The knockers fear the light',
    ate: it => `The worm swallows your ${it} and dives away.`,
    dove: 'The sandworm dives away!',
    down: c => `${c} down!`,
    repelled: 'Raid repelled!',
    left: 'The raiders slink back into the dark.',
    over: 'The raid is over.',
    stone: n => `+${n} 🪨 stone`,
    hide: 'Worm hide! Rocky armour, one day…',
    hud: s => `⚠ raid ${s}s`, hudWarn: s => `⚠ raid in ${s}s`
  },
  vi: {
    knocker: 'Quỷ mỏ', worm: 'Sâu cát', garg: 'Tượng quỷ',
    warn: {
      knocker: n => `⚠ Tiếng gõ trong bóng tối dưới ${n} — quỷ mỏ sắp tới`,
      worm: n => `⚠ Mặt đất ù ù bên hẻm — thứ gì đó đang tới ${n}`,
      garg: n => `⚠ Tượng ở góc khu ${n} đang mở mắt`
    },
    raid: {
      knocker: n => `⚠ Quỷ mỏ đang phá ${n} — đánh chúng đi!`,
      worm: n => `⚠ Sâu cát đang nuốt tường của ${n} — nhử mồi đi!`,
      garg: n => `⚠ Tượng quỷ ném đá vào ${n} — đập chúng dưới ánh đèn!`
    },
    npc: {
      knocker: 'Nghe tiếng gõ không? Giữ đuốc cháy!',
      worm: 'Cát đang động. Kiếm con vật đi — nó chỉ thèm thịt!',
      garg: 'Tượng đang thức. Đánh chúng dưới đèn lồng!'
    },
    strike: 'Đánh', smash: 'Đập', bait: 'Thả mồi', baitNo: 'Cần mồi: mang theo con vật (bắt gà/bò hoặc câu cá)',
    needAxe: 'Cần rìu — chế Rìu I ở Bàn mộc (5 gỗ).',
    needBait: 'Sâu chỉ thèm thịt — về Làng bắt gà/bò hoặc câu cá ở bờ nước rồi quay lại.',
    tooDark: 'Tối quá, không đánh trúng — dụ nó vào ánh đèn',
    fearLight: 'Quỷ mỏ sợ ánh sáng',
    ate: it => `Sâu nuốt ${it} của bạn rồi lặn mất.`,
    dove: 'Sâu cát lặn mất!',
    down: c => `Hạ ${c}!`,
    repelled: 'Đã đẩy lui cuộc cướp!',
    left: 'Bọn cướp lủi về bóng tối.',
    over: 'Cuộc cướp kết thúc.',
    stone: n => `+${n} 🪨 đá`,
    hide: 'Da sâu! Giáp cho Rocky, mai mốt…',
    hud: s => `⚠ cướp ${s}s`, hudWarn: s => `⚠ cướp sau ${s}s`
  }
};
const L = ctx => STR[ctx.lang() === 'vi' ? 'vi' : 'en'];
const ITEM = { en: { cow: 'cow', chicken: 'chicken', bird: 'bird', fish: 'fish' }, vi: { cow: 'con bò', chicken: 'con gà', bird: 'con chim', fish: 'con cá' } };

// ---------------------------------------------------------------- sprites (built once, at module load)
const px = (g, x, y, c, w = 1, h = 1) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
const OUT = '#14121a';
const TAU = Math.PI * 2;
function flip(src) { const c = mkCanvas(src.width, src.height), g = c.getContext('2d'); g.translate(src.width, 0); g.scale(-1, 1); g.drawImage(src, 0, 0); return c; }
function build(w, h, fn) { return [0, 1].map(f => { const c = mkCanvas(w, h); fn(c.getContext('2d'), f); return [c, flip(c)]; }); } // [frame][0=right,1=left]

// Tommyknocker 16×20 — a green-grey imp with red coal eyes and a little pick
function knockerArt(g, f) {
  const B = '#6b7a63', BD = '#4a5646', BL = '#8b9a80', E = '#ff2a3a', EL = '#ffb0a0', W = '#8a5a2b', M = '#b9b9c2';
  const a = f ? 1 : 0;
  g.fillStyle = 'rgba(0,0,0,.28)'; g.fillRect(4, 18, 9, 2);
  px(g, 4, 15 + a, OUT, 3, 5 - a); px(g, 4, 16 + a, BD, 2, 3 - a);          // legs
  px(g, 9, 16 - a, OUT, 3, 4 + a); px(g, 9, 17 - a, BD, 2, 2 + a);
  px(g, 3, 8, OUT, 10, 8); px(g, 4, 9, B, 8, 6); px(g, 4, 13, BD, 8, 2); px(g, 5, 9, BL, 3, 2);  // hunched body
  px(g, 2, 10 + a, OUT, 2, 5); px(g, 2, 11 + a, B, 1, 3);                   // left arm
  px(g, 12, 9 - a, OUT, 2, 5); px(g, 12, 10 - a, B, 1, 3);                  // right arm
  px(g, 3, 1, OUT, 10, 8); px(g, 4, 2, B, 8, 6); px(g, 4, 2, BL, 8, 1);     // head
  px(g, 0, 2, OUT, 4, 3); px(g, 1, 3, BD, 2, 1); px(g, 12, 2, OUT, 4, 3); px(g, 13, 3, BD, 2, 1); // ears
  px(g, 5, 5, E, 2, 2); px(g, 9, 5, E, 2, 2); px(g, 5, 5, EL, 1, 1); px(g, 9, 5, EL, 1, 1);       // eyes
  px(g, 6, 8, OUT, 4, 1); px(g, 7, 8, '#d8d2c8', 1, 1);                     // grin
  const py = f ? 4 : 8;                                                     // the pick swings between frames
  px(g, 13, py, OUT, 3, 9); px(g, 14, py + 1, W, 1, 7);
  px(g, 11, py - 1, OUT, 5, 3); px(g, 12, py, M, 3, 1);
}
// Sandworm head 24×20 — Olgoi-Khorkhoi: a blood-red tube with a ringed maw (faces right)
function wormHeadArt(g, f) {
  const B = '#b5433f', BD = '#8a2e2e', BL = '#d9756a', MAW = '#3a1014', TH = '#f2d6c0';
  px(g, 0, 5, OUT, 17, 12); px(g, 1, 6, B, 15, 10); px(g, 1, 6, BL, 15, 2); px(g, 1, 13, BD, 15, 3);  // tube
  for (let i = 0; i < 4; i++) px(g, 3 + i * 4 + (f ? 1 : 0), 6, BD, 1, 10);                            // rings
  px(g, 14, 2, OUT, 9, 17); px(g, 15, 3, B, 7, 15); px(g, 15, 3, BL, 7, 2); px(g, 15, 15, BD, 7, 3);   // head flare
  const o = f ? 6 : 3;                                                                                 // maw opens on frame 1
  px(g, 18, 10 - o, OUT, 6, o * 2); px(g, 19, 11 - o, MAW, 4, o * 2 - 2);
  for (let i = 0; i < 3; i++) { px(g, 19 + i, 11 - o, TH, 1, 1); px(g, 19 + i, 8 + o, TH, 1, 1); }
  px(g, 16, 6, '#ffd8cc', 1, 1);
}
// worm body segment 14×14 — a ringed muscle, not a brick
function circ(g, cx, cy, r, c) { g.fillStyle = c; for (let dy = -r; dy <= r; dy++) { const w = Math.floor(Math.sqrt(r * r - dy * dy)); g.fillRect(cx - w, cy + dy, 2 * w + 1, 1); } }
function wormSegArt(g, f) {
  const B = '#a83c39', BD = '#7a2828', BL = '#cf6b5d';
  circ(g, 7, 7, 6, OUT); circ(g, 7, 7, 5, B);
  circ(g, 5, 5, 2, BL); px(g, 4, 3, BL, 3, 1);
  px(g, 2, 8 + (f ? 1 : 0), BD, 10, 2);                 // the ring slides as it crawls
  px(g, 3, 11, BD, 8, 1);
}
// Gargoyle 24×24 — grey stone, bat wings, embers for eyes (faces right)
function gargArt(g, f) {
  const B = '#8e8a94', BD = '#666270', BL = '#aaa6b2', E = '#ffb03a', EL = '#ffe6a0';
  const up = !f;                                     // bat wings: scalloped membranes that beat up and down
  for (const s of [-1, 1]) for (let i = 0; i < 8; i++) {
    const x = s < 0 ? 7 - i : 16 + i;
    const y0 = Math.round(up ? 1 + i * 0.95 : 6 + i * 0.8), y1 = Math.round(up ? 12 - i * 0.45 : 17 - i * 0.6);
    if (y1 - y0 < 1) continue;
    px(g, x, y0 - 1, OUT, 1, y1 - y0 + 2);
    px(g, x, y0, i % 3 === 1 ? BD : B, 1, y1 - y0);
  }
  px(g, 8, 8, OUT, 8, 12); px(g, 9, 9, B, 6, 10); px(g, 9, 9, BL, 3, 4); px(g, 9, 16, BD, 6, 2);  // body
  px(g, 8, 2, OUT, 8, 7); px(g, 9, 3, B, 6, 5); px(g, 9, 3, BL, 6, 1);                            // head
  px(g, 7, 0, OUT, 2, 3); px(g, 15, 0, OUT, 2, 3); px(g, 7, 0, BD, 1, 2); px(g, 15, 0, BD, 1, 2); // horns
  px(g, 10, 5, E, 2, 2); px(g, 13, 5, E, 2, 2); px(g, 10, 5, EL, 1, 1); px(g, 13, 5, EL, 1, 1);   // eyes
  px(g, 11, 8, OUT, 3, 1);
  px(g, 8, 20, OUT, 3, 4); px(g, 13, 20, OUT, 3, 4); px(g, 9, 20, BD, 1, 3); px(g, 14, 20, BD, 1, 3); // claws
}
// loot: a chip of stone (the gargoyles leave a carved one)
function stoneArt(carved) {
  return (g, f) => {
    const B = '#9a9aa3', BL = '#c6c6d0', BD = '#6f6f7a';
    px(g, 1, 3, OUT, 10, 8); px(g, 2, 4, B, 8, 6); px(g, 2, 4, BL, 4, 2); px(g, 2, 8, BD, 8, 2);
    if (carved) { px(g, 4, 6, '#ffd45e', 4, 1); px(g, 4, 8, '#ffd45e', 2, 1); }
    if (f) px(g, 9, 2, '#ffffff', 1, 1);
  };
}
const SPR = {
  knocker: HOOK.creature('knocker', build(16, 20, knockerArt)), worm: HOOK.creature('wormHead', build(24, 20, wormHeadArt)), seg: HOOK.creature('wormSeg', build(14, 14, wormSegArt)),
  garg: HOOK.creature('garg', build(24, 24, gargArt)), stone: build(12, 12, stoneArt(false)), carved: build(12, 12, stoneArt(true))
};

// ---------------------------------------------------------------- tuning
const ZONE_KIND = { m4: 'knocker', m5: 'worm', m6: 'garg' };
const WARN = 20, WARN_FAST = 2, RAID_LEN = 90, GATE_LEN = 30;
const FIRST_MIN = 90, FIRST_MAX = 150, GAP_MIN = 360, GAP_MAX = 720;
const KNOCK_HP = 2, GARG_HP = 2, WORM_HITS = 3;
const LIGHT_R = 48;          // 3 tiles: gargoyles are only breakable this close to a lantern
const CAP_FRAC = 0.4;

// ---------------------------------------------------------------- state
let CTX = null;
let kind = null;                    // creature kind of the current zone, null elsewhere
let phase = 'idle';                 // idle | warn | raid
let nextT = 0, warnT = 0, raidT = 0, gateT = 0, cueT = 0, alertT = 0, saveT = 0;
let plotIdx = -1, plot = null, nationKey = '', nationName = '';
let mobs = [], loot = [], fx = [], shots = [];
let cap = 0, ruinedNow = 0;
let wormSpot = null;

const rnd = (a, b) => a + Math.random() * (b - a);
const fast = () => typeof window !== 'undefined' && !!window.__raidMidFast;
function sysS(ctx) {                                    // merge into save.sys.raiders — other raider modules share it
  const sv = ctx.S.save; sv.sys = sv.sys || {};
  const r = (sv.sys.raiders = sv.sys.raiders || {});
  if (typeof r.raids !== 'number') r.raids = 0;
  if (typeof r.repelled !== 'number') r.repelled = 0;
  if (typeof r.wrecked !== 'number') r.wrecked = 0;
  return r;
}
const nameOf = ctx => L(ctx)[kind] || '';

// ---------------------------------------------------------------- district helpers
const piecesOf = ctx => { try { return plotIdx >= 0 ? ctx.piecesOf(plotIdx) : []; } catch (e) { return []; } };
const livePieces = ctx => piecesOf(ctx).filter(o => !o.ruined);
const lightsIn = ctx => livePieces(ctx).filter(o => o.piece === 'light');
function pieceCenter(ctx, o) { const d = ctx.O[o.type] || { fw: 1, fh: 1 }; return { x: o.x * 16 + d.fw * 8, y: (o.y + d.fh) * 16 - 8 }; }
function nearestPiece(ctx, c, kinds) {
  let best = null, bd = Infinity;
  for (const o of livePieces(ctx)) {
    if (!kinds.includes(o.piece)) continue;
    const p = pieceCenter(ctx, o), d = Math.hypot(p.x - c.x, p.y - c.y);
    if (d < bd) { bd = d; best = o; }
  }
  return best;
}
function hurtPiece(ctx, o, amt) {
  if (!o || o.ruined || ruinedNow >= cap) return false;
  let ruined = false;
  try { ruined = ctx.damage(o, amt); } catch (e) { return false; }
  if (ruined) { ruinedNow++; sysS(ctx).wrecked++; saveT = 0.8; }
  return ruined;
}
const plotRect = () => plot ? { x: plot.x * 16, y: plot.y * 16, w: plot.w * 16, h: plot.h * 16 } : null;
const plotMid = () => plot ? { x: (plot.x + plot.w / 2) * 16, y: (plot.y + plot.h / 2) * 16 } : { x: 0, y: 0 };

// ---------------------------------------------------------------- particles
function ring(x, y, c = 'rgba(255,212,94,.9)', r = 16, life = 0.7) { fx.push({ k: 'ring', x, y, t: life, life, r, c }); }
function dust(x, y, n = 8, c = 'rgba(200,185,160,.85)') {
  for (let i = 0; i < n; i++) { const a = Math.random() * TAU, sp = 8 + Math.random() * 26; fx.push({ k: 'p', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 22, gy: 34, t: 0.5 + Math.random() * 0.5, life: 1, s: 1 + ((Math.random() * 2) | 0), c }); }
}
function chips(x, y, n = 10, c = '#b9b9c2') {
  for (let i = 0; i < n; i++) { const a = Math.random() * TAU, sp = 24 + Math.random() * 60; fx.push({ k: 'p', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 46, gy: 170, t: 0.5 + Math.random() * 0.4, life: 1, s: 1 + ((Math.random() * 2) | 0), c }); }
}
function hole(x, y) { fx.push({ k: 'hole', x, y, t: 2.4, life: 2.4 }); dust(x, y, 14, 'rgba(150,120,100,.9)'); }
function updateFx(dt) {
  for (let i = fx.length - 1; i >= 0; i--) {
    const q = fx[i]; q.t -= dt;
    if (q.t <= 0) { fx.splice(i, 1); continue; }
    if (q.k === 'p') { q.x += q.vx * dt; q.y += q.vy * dt; q.vy += q.gy * dt; q.vx *= 0.94; }
  }
}

// ---------------------------------------------------------------- loot
function drop(ctx, x, y, amount, carved, hide) {
  loot.push({ x, y, amount, carved: !!carved, hide: !!hide, t: 0, life: 60 });
}
function takeLoot(ctx, it) {
  const sv = ctx.S.save;
  sv.inv = sv.inv || {}; sv.inv.stone = (sv.inv.stone || 0) + it.amount;
  ctx.toast(L(ctx).stone(it.amount));
  if (it.hide) { sysS(ctx).wormHide = true; setTimeout(() => { try { ctx.toast(L(ctx).hide, true); } catch (e) { } }, 700); }
  ctx.persist();
}

// ---------------------------------------------------------------- raid flow
function scheduleFirst() { nextT = fast() ? 12 : rnd(FIRST_MIN, FIRST_MAX); }
function scheduleNext() { nextT = fast() ? 25 : rnd(GAP_MIN, GAP_MAX); }

function pickPlot(ctx) {
  const plots = ctx.S.map.plots || []; if (!plots.length) return -1;
  const all = plots.map((p, i) => i);
  const fresh = all.filter(i => { try { return ctx.districtState(i).condition > 0.999; } catch (e) { return false; } });
  const pool = fresh.length ? fresh : all;
  return pool[(Math.random() * pool.length) | 0];
}
function chasmSpot(ctx, p) {
  const map = ctx.S.map, cx = p.x + (p.w >> 1);
  for (let d = 0; d < 44; d++) for (const sx of (d ? [cx - d, cx + d] : [cx]))
    for (const ty of [28, 29]) if (sx > 1 && sx < map.w - 1 && ctx.getG(map, sx, ty) === ctx.T.CHASM) return { x: sx * 16 + 8, y: ty * 16 + 10 };
  return { x: (p.x + 5) * 16, y: 29 * 16 + 10 };
}

function startRaid(ctx) {
  if (!kind || phase !== 'idle') return false;
  plotIdx = pickPlot(ctx); if (plotIdx < 0) return false;
  plot = ctx.S.map.plots[plotIdx];
  nationKey = plot.nation || '';
  const grp = (ctx.S.nations || []).find(n => n.key === nationKey);
  nationName = grp ? `${grp.flag} ${grp.name}` : (nationKey || '?');
  cap = Math.max(1, Math.floor(piecesOf(ctx).length * CAP_FRAC));
  ruinedNow = 0; mobs = []; shots = []; gateT = GATE_LEN;
  phase = 'warn'; warnT = fast() ? WARN_FAST : WARN; cueT = 0; alertT = 0;
  const S = L(ctx);
  ctx.alert(S.warn[kind](nationName), warnT + 1);
  // one of the nation's artists shouts the warning
  const own = ctx.S.npcs.filter(n => !n.m.guide && (ctx.nationOf(n.m) || {}).key === nationKey);
  const who = own.length ? own[(Math.random() * own.length) | 0] : null;
  ctx.toast(who ? `${who.m.n}: “${S.npc[kind]}”` : S.npc[kind], true);
  if (kind === 'worm') wormSpot = chasmSpot(ctx, plot);
  if (kind === 'garg') spawnGargoyles(ctx);      // the corner statues open their eyes during the warning
  sysS(ctx).raids++; ctx.persist();
  return true;
}

function spawnKnockers(ctx) {
  const r = plotRect();
  const corners = [{ x: r.x - 6, y: r.y + 6 }, { x: r.x + r.w + 6, y: r.y + r.h + 4 }, { x: r.x + r.w + 6, y: r.y + 6 }, { x: r.x - 6, y: r.y + r.h + 4 }];
  for (let i = 0; i < 2; i++) {
    const c = corners[i];
    mobs.push({ k: 'knocker', x: c.x, y: c.y, hp: KNOCK_HP, fade: 0, st: 'wake', t: 0, atk: 1.2 + i * 0.7, dir: i ? -1 : 1, side: i ? -1 : 1, fr: 0, ft: Math.random() * 2, ang: i * Math.PI + Math.random(), hurt: 0, target: null });
    dust(c.x, c.y - 6, 6, 'rgba(90,110,90,.8)');
  }
}
function spawnWorm(ctx) {
  const s = wormSpot || chasmSpot(ctx, plot);
  mobs.push({ k: 'worm', x: s.x, y: s.y, hp: WORM_HITS, rise: 0, st: 'rise', t: 0, atk: 3, dir: 1, fr: 0, ft: 0, inv: 0, hurt: 0, hist: [], target: null });
  ctx.quake(0.4);                                  // the one tremor of the whole raid
  for (let i = 0; i < 18; i++) dust(s.x + (Math.random() - 0.5) * 34, s.y + (Math.random() - 0.5) * 12, 1, 'rgba(180,160,140,.9)');
}
function spawnGargoyles(ctx) {
  const pillars = livePieces(ctx).filter(o => o.piece === 'corner');
  const spots = (pillars.length >= 2 ? pillars.slice(0, 2).map(o => pieceCenter(ctx, o))
    : [{ x: plot.x * 16 + 8, y: plot.y * 16 + 8 }, { x: (plot.x + plot.w - 1) * 16 + 8, y: plot.y * 16 + 8 }]);
  spots.forEach((s, i) => mobs.push({
    k: 'garg', x: s.x, y: s.y, hp: GARG_HP, z: 0, st: 'perch', t: 0, atk: 1.5 + i * 0.8, dir: i ? -1 : 1,
    fr: 0, ft: Math.random() * 2, ang: i * Math.PI + Math.random() * 0.6, hurt: 0, target: null, lit: false
  }));
}

function beginAssault(ctx) {
  phase = 'raid'; raidT = RAID_LEN; alertT = 0;
  if (kind === 'knocker') spawnKnockers(ctx);
  else if (kind === 'worm') spawnWorm(ctx);
  else for (const m of mobs) { m.st = 'fly'; m.t = 0; }
  ctx.alert(L(ctx).raid[kind](nationName), 8);
}

function endRaid(ctx, reason) {
  const S = L(ctx);
  if (reason === 'repelled') { sysS(ctx).repelled++; ctx.toast(S.repelled, true); }
  else if (reason === 'light') ctx.toast(S.fearLight, true);
  else if (reason === 'bait') { sysS(ctx).repelled++; ctx.toast(S.dove, true); }
  else ctx.toast(S.left);
  for (const m of mobs) dust(m.x, m.y - (m.z || 0) - 6, 7, 'rgba(120,120,130,.7)');   // they melt back into the dark
  mobs = []; shots = [];
  phase = 'idle'; plotIdx = -1; plot = null; raidT = 0; warnT = 0;
  ctx.alert(''); scheduleNext(); ctx.persist();
}

// ---------------------------------------------------------------- damage to raiders
function hitMob(ctx, m, n = 1) {
  m.hp -= n; m.hurt = 0.3; chips(m.x, m.y - 8, 8, m.k === 'garg' ? '#b9b9c2' : m.k === 'worm' ? '#c85a52' : '#7d8f76');
  if (m.hp > 0) return false;
  killMob(ctx, m);
  return true;
}
function killMob(ctx, m) {
  const i = mobs.indexOf(m); if (i >= 0) mobs.splice(i, 1);
  chips(m.x, m.y - 8, 14, m.k === 'garg' ? '#b9b9c2' : '#8a5a52');
  ctx.toast(L(ctx).down(nameOf(ctx)));
  if (m.k === 'garg') drop(ctx, m.x, m.y, 2, true);
  else drop(ctx, m.x, m.y, 2, false);
  if (!mobs.length && phase === 'raid') endRaid(ctx, 'repelled');
}
function wormHit(ctx, m) {                          // Rocky punches: 3 of them, 0.6 s apart
  if (m.inv > 0) return;
  m.inv = 0.6; m.hp--; m.hurt = 0.3; chips(m.x, m.y - 8, 10, '#c85a52');
  if (m.hp <= 0) wormLeaves(ctx, m, true);
}
function wormLeaves(ctx, m, withLoot) {
  m.st = 'dive'; m.t = 0.9;
  if (withLoot) { drop(ctx, m.x, m.y, 3, false, true); sysS(ctx).wormHide = true; ctx.persist(); }
}

// ---------------------------------------------------------------- creature updates
function step(c, tx, ty, sp, dt) {
  const dx = tx - c.x, dy = ty - c.y, d = Math.hypot(dx, dy) || 1, s = Math.min(sp * dt, d);
  c.x += dx / d * s; c.y += dy / d * s;
  if (Math.abs(dx) > 1.5) c.dir = dx > 0 ? 1 : -1;
  return d;
}
function updateKnocker(dt, ctx, m) {
  m.ft += dt * (m.st === 'work' ? 6 : 3); m.fr = (m.ft | 0) % 2;
  if (m.st === 'wake') { m.fade = Math.min(1, m.fade + dt / 1.2); if (m.fade >= 1) m.st = 'seek'; return; }
  m.fade = 1;
  const lights = lightsIn(ctx).length;
  if (lights >= 2) {                                 // two torches burning: they cannot cross the fence
    m.st = 'circle'; m.ang += dt * 0.55;
    const c = plotMid(), hw = plot.w * 8 + 13, hh = plot.h * 8 + 11;     // a lap of the fence, always outside it
    const ca = Math.cos(m.ang), sa = Math.sin(m.ang);
    const k = 1 / Math.max(Math.abs(ca) / hw, Math.abs(sa) / hh, 1e-4);
    step(m, c.x + ca * k, c.y + sa * k, 46, dt);
    m.atk -= dt;
    if (m.atk <= 0) { m.atk = 1.1 + Math.random() * 0.8; ring(m.x, m.y - 6, 'rgba(255,212,94,.5)', 13, 0.6); }  // knocking on the fence
    return;
  }
  if (!m.target || m.target.ruined || ruinedNow >= cap) m.target = nearestPiece(ctx, m, ['light']) || nearestPiece(ctx, m, ['wall', 'corner', 'house']);
  if (!m.target) { m.st = 'seek'; m.ang += dt * 0.7; const c = plotMid(); step(m, c.x + Math.cos(m.ang) * 30, c.y + Math.sin(m.ang) * 22, 30, dt); return; }
  const p = pieceCenter(ctx, m.target), d = step(m, p.x + (m.side || 1) * 9, p.y + 6, 40, dt);  // one on each side of the piece
  if (d < 16) {
    m.st = 'work'; m.atk -= dt;
    if (m.atk <= 0) {
      m.atk = 2;
      ring(p.x, p.y - 4, m.target.piece === 'light' ? 'rgba(120,160,255,.85)' : 'rgba(255,212,94,.85)', 18, 0.7);
      chips(p.x, p.y - 4, 5, m.target.piece === 'light' ? '#ffd45e' : '#cdbb98');
      hurtPiece(ctx, m.target, 1);
      if (m.target.ruined) m.target = null;
    }
  } else m.st = 'seek';
}
function updateWorm(dt, ctx, m) {
  m.ft += dt * 5; m.fr = (m.ft | 0) % 2;
  if (m.inv > 0) m.inv -= dt;
  if (m.st === 'rise') {
    m.rise = Math.min(1, m.rise + dt / 1.2); m.t += dt;
    if (m.t > 0.25) { m.t = 0; dust(m.x + (Math.random() - 0.5) * 20, m.y, 2, 'rgba(170,150,130,.8)'); }
    if (m.rise >= 1) { m.st = 'hunt'; m.atk = 2; }
    return;
  }
  if (m.st === 'dive') {
    m.rise = Math.max(0, m.rise - dt / 0.9); m.t -= dt;
    if (m.t > 0 && Math.random() < dt * 10) dust(m.x, m.y, 2, 'rgba(170,150,130,.8)');
    if (m.t <= 0) { const i = mobs.indexOf(m); if (i >= 0) mobs.splice(i, 1); if (!mobs.length && phase === 'raid') endRaid(ctx, 'bait'); }
    return;
  }
  m.rise = 1;
  if (!m.target || m.target.ruined || ruinedNow >= cap) m.target = nearestPiece(ctx, m, ['wall']) || nearestPiece(ctx, m, ['corner', 'house', 'fountain']);
  if (!m.target) { const c = plotMid(); step(m, c.x, c.y, 22, dt); return; }
  const p = pieceCenter(ctx, m.target), d = step(m, p.x, p.y + 4, 26, dt);   // burrows straight under the fences
  if (d < 20) {
    m.atk -= dt;
    if (m.atk <= 0) {
      m.atk = 3;
      hole(p.x, p.y);                                  // it swallows the piece whole and leaves a hole
      hurtPiece(ctx, m.target, 3);
      if (m.target.ruined) m.target = null;
    }
  }
}
function litSpots(ctx) {
  const out = [];
  for (const o of ctx.S.map.objects) if (o.piece === 'light' && !o.ruined) out.push(pieceCenter(ctx, o));
  return out;
}
function updateGarg(dt, ctx, m) {
  m.ft += dt * (m.st === 'perch' ? 1.2 : 5); m.fr = (m.ft | 0) % 2;
  if (m.inv > 0) m.inv -= dt;
  if (m.st === 'perch') { m.z = 0; return; }
  m.z = 14 + Math.sin(ctx.S.time * 2.2 + m.ang) * 3;
  if (!m.target || m.target.ruined || ruinedNow >= cap) m.target = nearestPiece(ctx, m, ['house', 'fountain', 'board']) || nearestPiece(ctx, m, ['flag', 'wall']);
  const c = m.target ? pieceCenter(ctx, m.target) : plotMid();
  m.ang += dt * 0.7;                                  // they circle their target, drifting in and out of the lantern light
  step(m, c.x + Math.cos(m.ang) * 46, c.y + Math.sin(m.ang) * 34, 34, dt);
  m.lit = litSpots(ctx).some(s => Math.hypot(s.x - m.x, s.y - (m.y - m.z)) < LIGHT_R);
  if (!m.target) return;
  m.atk -= dt;
  if (m.atk <= 0) {
    m.atk = 2.5;
    shots.push({ x: m.x, y: m.y - m.z - 6, sx: m.x, sy: m.y - m.z - 6, tx: c.x, ty: c.y - 6, t: 0, dur: 0.55, o: m.target });
  }
}
function updateShots(dt, ctx) {
  for (let i = shots.length - 1; i >= 0; i--) {
    const s = shots[i]; s.t += dt;
    const k = Math.min(1, s.t / s.dur);
    s.x = s.sx + (s.tx - s.sx) * k; s.y = s.sy + (s.ty - s.sy) * k - Math.sin(k * Math.PI) * 16;
    if (k >= 1) {
      shots.splice(i, 1);
      chips(s.tx, s.ty, 7, '#b9b9c2'); ring(s.tx, s.ty, 'rgba(200,200,215,.7)', 12, 0.45);
      hurtPiece(ctx, s.o, 1);
    }
  }
}

// ---------------------------------------------------------------- the system
export const raidersMid = {
  id: 'raidersMid',

  onZoneEnter(ctx) {
    CTX = ctx;
    mobs = []; loot = []; fx = []; shots = []; wormSpot = null;
    phase = 'idle'; plotIdx = -1; plot = null; raidT = warnT = alertT = cueT = 0;
    kind = ZONE_KIND[ctx.S.zone.id] || null;
    ctx.alert('');
    if (typeof window !== 'undefined') {
      window.__raidMid = () => { if (!CTX || !kind) return 'raidersMid: not in M4/M5/M6'; if (phase !== 'idle') return 'raidersMid: a raid is already running'; return startRaid(CTX) ? 'raidersMid: raid starting' : 'raidersMid: no district to raid'; };
      window.__raidMidState = () => ({ zone: ctx.S.zone.id, kind, phase, warnT: +warnT.toFixed(1), raidT: +raidT.toFixed(1), nextT: +nextT.toFixed(1), plotIdx, nation: nationName, mobs: mobs.map(m => ({ k: m.k, hp: m.hp, st: m.st, lit: !!m.lit, x: Math.round(m.x), y: Math.round(m.y) })), loot: loot.map(l => ({ x: Math.round(l.x), y: Math.round(l.y), n: l.amount, carved: l.carved })), ruinedNow, cap });
    }
    if (kind) scheduleFirst();
  },

  onZoneLeave(ctx) {
    if (phase !== 'idle') ctx.alert('');
    mobs = []; loot = []; fx = []; shots = []; phase = 'idle'; plotIdx = -1; plot = null; kind = null;
  },

  update(dt, ctx) {
    CTX = ctx;
    updateFx(dt);
    if (!kind || ctx.S.mode !== 'play') return;
    if (saveT > 0) { saveT -= dt; if (saveT <= 0) ctx.persist(); }

    // ground loot: walk over it (Rocky too)
    const p = ctx.S.player;
    for (let i = loot.length - 1; i >= 0; i--) {
      const it = loot[i]; it.t += dt; it.life -= dt;
      if (it.life <= 0) { loot.splice(i, 1); continue; }
      if (Math.hypot(it.x - p.x, it.y - p.y) < 15) { loot.splice(i, 1); takeLoot(ctx, it); }
    }

    if (phase === 'idle') { nextT -= dt; if (nextT <= 0) startRaid(ctx); return; }

    if (phase === 'warn') {
      warnT -= dt; cueT -= dt;
      if (cueT <= 0) {                                 // subtle cues only: no shake, no flash
        cueT = 0.9 + Math.random() * 0.8;
        const r = plotRect();
        if (kind === 'knocker' && r) ring(r.x + Math.random() * r.w, r.y + Math.random() * r.h, 'rgba(255,212,94,.45)', 14, 0.8);
        else if (kind === 'worm' && wormSpot) dust(wormSpot.x + (Math.random() - 0.5) * 60, wormSpot.y + (Math.random() - 0.5) * 10, 3, 'rgba(180,160,140,.7)');
      }
      alertT -= dt;
      if (alertT <= 0) { alertT = 1; ctx.alert(L(ctx).warn[kind](nationName) + ` · ${Math.max(0, Math.ceil(warnT))}s`, 2); }
      for (const m of mobs) { m.ft += dt * 1.2; m.fr = (m.ft | 0) % 2; }
      if (warnT <= 0) beginAssault(ctx);
      return;
    }

    // ---- raid ----
    raidT -= dt;
    alertT -= dt;
    if (alertT <= 0) { alertT = 1.5; ctx.alert(L(ctx).raid[kind](nationName), 3); }
    for (const m of mobs.slice()) {
      if (m.hurt > 0) m.hurt -= dt;
      if (m.k === 'knocker') updateKnocker(dt, ctx, m);
      else if (m.k === 'worm') updateWorm(dt, ctx, m);
      else updateGarg(dt, ctx, m);
    }
    updateShots(dt, ctx);

    // knockers held off by the light give up after 30 s
    if (kind === 'knocker' && mobs.length && mobs.every(m => m.st === 'circle')) {
      gateT -= dt;
      if (gateT <= 0) { endRaid(ctx, 'light'); return; }
    } else if (kind === 'knocker') gateT = GATE_LEN;

    // Rocky flattens raiders on contact
    if (ctx.isRocky()) {
      for (const m of mobs.slice()) {
        if (mobs.indexOf(m) < 0) continue;            // already flattened this frame
        if (m.k === 'worm') {
          if (m.st === 'dive') continue;
          let hit = Math.hypot(m.x - p.x, m.y - p.y) < 26;
          if (!hit) for (const s of (m.segs || [])) if (Math.hypot(s.x - p.x, s.y - p.y) < 20) { hit = true; break; }
          if (hit) wormHit(ctx, m);
        } else if (m.st !== 'wake' && !(m.inv > 0) && Math.hypot(m.x - p.x, (m.y - (m.z || 0)) - p.y) < 22) {
          m.inv = 0.6;
          hitMob(ctx, m, m.k === 'garg' ? 1 : m.hp);   // imps are flattened outright, gargoyles crack once per charge
        }
      }
    }
    if (phase === 'raid' && raidT <= 0) endRaid(ctx, 'timeout');
  },

  near(ctx) {
    if (!kind || phase !== 'raid' || !mobs.length) return null;
    const p = ctx.S.player, S = L(ctx);
    let best = null, bd = Infinity;
    for (const m of mobs) {
      if (m.st === 'wake' || m.st === 'dive' || m.st === 'rise') continue;
      const y = m.y - (m.z || 0), d = Math.hypot(m.x - p.x, y - p.y);
      const lim = m.k === 'worm' ? 40 : m.k === 'garg' ? 26 : 24;
      if (d < lim && d < bd) { bd = d; best = { m, y, lim }; }
    }
    if (!best) return null;
    const m = best.m;
    if (m.k === 'worm') {
      const has = getCarry(ctx).length > 0;
      return { label: has ? S.bait : S.baitNo, x: m.x, y: best.y, limit: best.lim, priority: true, data: { m, bait: true, has } };
    }
    return { label: m.k === 'garg' ? S.smash : S.strike, x: m.x, y: best.y, limit: best.lim, priority: true, data: { m } };
  },

  interact(ctx, cand) {
    const d = cand && cand.data; if (!d || !d.m) return;
    const m = d.m, S = L(ctx);
    if (mobs.indexOf(m) < 0) return;
    if (m.k === 'worm') {
      if (!d.has) { ctx.toast(S.needBait); return; }
      const c = getCarry(ctx); const item = removeCarry(ctx, c.length - 1);
      const lg = ctx.lang() === 'vi' ? 'vi' : 'en';
      ctx.toast(S.ate((ITEM[lg] || ITEM.en)[item ? item.kind : 'cow'] || ''), true);
      dust(m.x, m.y - 10, 12, 'rgba(200,120,110,.9)');
      wormLeaves(ctx, m, true);
      return;
    }
    if (m.k === 'garg') {
      if (!m.lit) { ctx.toast(S.tooDark); ring(m.x, m.y - (m.z || 0) - 8, 'rgba(120,120,160,.5)', 12, 0.4); return; }
      ctx.S.player.faceTo(m.x, m.y); hitMob(ctx, m, 1); return;
    }
    if (!(ctx.S.save.tools && ctx.S.save.tools.axe)) { ctx.toast(S.needAxe); return; }
    ctx.S.player.faceTo(m.x, m.y); hitMob(ctx, m, 1);
  },

  // ---- creatures, depth sorted with the world ----
  drawables(ctx, cx, cy) {
    const out = [], g = ctx.g;
    for (const it of loot) {
      const img = SPR[it.carved ? 'carved' : 'stone'][((it.t * 3) | 0) % 2][0];
      const bob = Math.sin(it.t * 3.4) * 1.5;
      const dx = Math.round(it.x) - 6 - cx, dy = Math.round(it.y + bob) - 12 - cy;
      out.push({ y: it.y, f: () => { g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(Math.round(it.x) - cx, Math.round(it.y) - cy, 5, 2, 0, 0, TAU); g.fill(); g.drawImage(img, dx, dy); } });
    }
    for (const m of mobs) {
      if (m.k === 'worm') { drawWorm(out, g, ctx, m, cx, cy); continue; }
      const img = SPR[m.k][m.fr][m.dir < 0 ? 1 : 0];
      const z = m.z || 0;
      const dx = Math.round(m.x) - (img.width >> 1) - cx, dy = Math.round(m.y - z) - img.height - cy;
      const a = m.k === 'knocker' ? m.fade : 1, hurt = m.hurt > 0;
      if (z > 1) {
        const sx = Math.round(m.x) - cx, sy = Math.round(m.y) - cy, r = Math.max(3, 8 - z / 4);
        out.push({ y: m.y - 1, f: () => { g.fillStyle = 'rgba(0,0,0,.26)'; g.beginPath(); g.ellipse(sx, sy, r, r * 0.45, 0, 0, TAU); g.fill(); } });
      }
      out.push({
        y: m.y + (z > 1 ? 1e4 : 0), f: () => {
          g.save(); g.globalAlpha = a;
          if (m.lit) { const gr = g.createRadialGradient(dx + img.width / 2, dy + img.height / 2, 2, dx + img.width / 2, dy + img.height / 2, img.width); gr.addColorStop(0, 'rgba(255,212,94,.22)'); gr.addColorStop(1, 'rgba(255,212,94,0)'); g.fillStyle = gr; g.fillRect(dx - 12, dy - 12, img.width + 24, img.height + 24); }
          g.drawImage(img, dx, dy);
          if (hurt) { g.globalCompositeOperation = 'source-atop'; g.fillStyle = 'rgba(255,255,255,.65)'; g.fillRect(dx, dy, img.width, img.height); }
          g.restore();
        }
      });
    }
    return out;
  },

  // ---- effects: particles, knock rings, stones in the air, lantern glow ----
  draw(g, ctx, cx, cy) {
    if (phase === 'raid' && kind === 'garg') {                // faint radius where stone can be cracked
      for (const s of litSpots(ctx)) {
        const x = Math.round(s.x) - cx, y = Math.round(s.y) - cy;
        if (x < -80 || y < -80 || x > ctx.VW + 80 || y > ctx.VH + 80) continue;
        const gr = g.createRadialGradient(x, y, 4, x, y, LIGHT_R);
        gr.addColorStop(0, 'rgba(255,212,94,.16)'); gr.addColorStop(1, 'rgba(255,212,94,0)');
        g.fillStyle = gr; g.beginPath(); g.arc(x, y, LIGHT_R, 0, TAU); g.fill();
        g.strokeStyle = 'rgba(255,212,94,.13)'; g.lineWidth = 1; g.beginPath(); g.arc(x, y, LIGHT_R, 0, TAU); g.stroke();
      }
    }
    if (phase === 'warn' && kind === 'garg') {                // the statues' eyes light up
      const k = 0.4 + 0.35 * Math.sin(ctx.S.time * 3);
      for (const m of mobs) { g.fillStyle = `rgba(255,176,58,${k.toFixed(2)})`; g.fillRect(Math.round(m.x) - cx - 3, Math.round(m.y) - cy - 18, 2, 2); g.fillRect(Math.round(m.x) - cx + 1, Math.round(m.y) - cy - 18, 2, 2); }
    }
    for (const s of shots) {                                   // thrown stones
      const x = Math.round(s.x) - cx, y = Math.round(s.y) - cy;
      g.fillStyle = OUT; g.fillRect(x - 2, y - 2, 5, 5);
      g.fillStyle = '#9a9aa3'; g.fillRect(x - 1, y - 1, 3, 3);
      g.fillStyle = '#c6c6d0'; g.fillRect(x - 1, y - 1, 1, 1);
    }
    for (const q of fx) {
      const x = Math.round(q.x) - cx, y = Math.round(q.y) - cy, k = q.t / q.life;
      if (q.k === 'ring') {
        g.strokeStyle = q.c; g.globalAlpha = Math.max(0, k); g.lineWidth = 1;
        g.beginPath(); g.arc(x, y, Math.max(1, q.r * (1 - k)), 0, TAU); g.stroke();
        g.beginPath(); g.arc(x, y, Math.max(1, q.r * (1 - k) * 0.55), 0, TAU); g.stroke();
        g.globalAlpha = 1;
      } else if (q.k === 'hole') {
        g.globalAlpha = Math.min(1, k * 1.4); g.fillStyle = '#120e18';
        g.beginPath(); g.ellipse(x, y, 9, 5, 0, 0, TAU); g.fill();
        g.fillStyle = 'rgba(60,45,40,.8)'; g.beginPath(); g.ellipse(x, y - 1, 6, 3, 0, 0, TAU); g.fill();
        g.globalAlpha = 1;
      } else {
        g.globalAlpha = Math.max(0, Math.min(1, k * 2));
        g.fillStyle = OUT; g.fillRect(x - 1, y - 1, q.s + 2, q.s + 2);
        g.fillStyle = q.c; g.fillRect(x, y, q.s, q.s);
        g.globalAlpha = 1;
      }
    }
    g.globalAlpha = 1;
  },

  // ---- health pips + names on the crisp overlay ----
  drawUI(ug, ctx, cx, cy, scale) {
    if (phase !== 'raid' || !mobs.length) return;
    const S = L(ctx);
    ug.save();
    ug.textAlign = 'center'; ug.textBaseline = 'bottom';
    ug.font = `bold ${Math.max(9, Math.round(scale * 2.7))}px "Segoe UI",system-ui,sans-serif`;
    for (const m of mobs) {
      if (m.st === 'wake' || m.st === 'rise' || m.st === 'dive') continue;
      const top = m.y - (m.z || 0) - (m.k === 'worm' ? 24 : m.k === 'garg' ? 28 : 24);
      const sx = Math.round((m.x - cx) * scale), sy = Math.round((top - cy) * scale);
      if (sx < -60 || sy < -30 || sx > ug.canvas.width + 60 || sy > ug.canvas.height + 30) continue;
      const max = m.k === 'worm' ? WORM_HITS : m.k === 'garg' ? GARG_HP : KNOCK_HP;
      const w = Math.max(4, Math.round(scale * 1.8)), gap = Math.max(2, Math.round(scale * 0.7));
      const total = max * w + (max - 1) * gap, x0 = sx - total / 2;
      for (let i = 0; i < max; i++) {
        const on = i < m.hp;
        ug.fillStyle = 'rgba(13,11,20,.75)'; ug.fillRect(x0 + i * (w + gap) - 1, sy - 1, w + 2, w + 2);
        ug.fillStyle = on ? (m.k === 'garg' ? '#cfcfe0' : '#ff4a5e') : 'rgba(120,115,130,.5)';
        ug.fillRect(x0 + i * (w + gap), sy, w, w);
      }
      const label = m.k === 'worm' ? S.worm : m.k === 'garg' ? S.garg : S.knocker;   // grey = stone, unbreakable out of the light
      ug.fillStyle = 'rgba(13,11,20,.6)'; ug.fillText(label, sx + 1, sy - 3 + 1);
      ug.fillStyle = m.k === 'garg' && !m.lit ? '#9a95a8' : '#ffd45e';
      ug.fillText(label, sx, sy - 3);
    }
    ug.restore();
  },

  hudLines(ctx) {
    if (!kind) return [];
    const S = L(ctx);
    if (phase === 'warn') return [S.hudWarn(Math.max(0, Math.ceil(warnT)))];
    if (phase === 'raid') return [S.hud(Math.max(0, Math.ceil(raidT)))];
    return [];
  }
};

// ---------------------------------------------------------------- the worm's body
function drawWorm(out, g, ctx, m, cx, cy) {
  // the head drags a tail of 8 segments through its own path
  if (m.st !== 'rise' && m.st !== 'dive') {
    const last = m.hist[0];
    if (!last || Math.hypot(last.x - m.x, last.y - m.y) > 2) { m.hist.unshift({ x: m.x, y: m.y }); if (m.hist.length > 90) m.hist.length = 90; }
  }
  m.segs = [];
  for (let i = 0; i < 8; i++) {
    const h = m.hist[Math.min(m.hist.length - 1, (i + 1) * 5)];
    if (!h) break;
    m.segs.push(h);
  }
  const rise = m.rise === undefined ? 1 : m.rise;
  for (let i = m.segs.length - 1; i >= 0; i--) {
    const s = m.segs[i], img = SPR.seg[(m.fr + i) % 2][0];
    const w = Math.max(6, Math.round(14 * (1 - i * 0.07)));               // the body tapers toward the tail
    const hh = Math.max(1, Math.round(w * rise));
    const dx = Math.round(s.x) - (w >> 1) - cx, dy = Math.round(s.y) - hh - cy;
    out.push({ y: s.y - 0.1 * (i + 1), f: () => g.drawImage(img, 0, 14 - Math.round(hh * 14 / w), 14, Math.round(hh * 14 / w), dx, dy, w, hh) });
  }
  const img = SPR.worm[m.fr][m.dir < 0 ? 1 : 0];
  const hh = Math.max(1, Math.round(20 * rise));
  const dx = Math.round(m.x) - 12 - cx, dy = Math.round(m.y) - hh - cy;
  const hurt = m.hurt > 0;
  out.push({
    y: m.y + 0.2, f: () => {
      g.save();
      g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(Math.round(m.x) - cx, Math.round(m.y) - cy, 11, 4, 0, 0, TAU); g.fill();
      g.drawImage(img, 0, 20 - hh, 24, hh, dx, dy, 24, hh);
      if (hurt) { g.globalCompositeOperation = 'source-atop'; g.fillStyle = 'rgba(255,255,255,.6)'; g.fillRect(dx, dy, 24, hh); }
      g.restore();
    }
  });
}

if (typeof window !== 'undefined' && !window.__raidMid) window.__raidMid = () => 'raidersMid: no zone loaded yet';
