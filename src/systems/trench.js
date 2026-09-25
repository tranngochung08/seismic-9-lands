// trench.js — Act 3 of "Friend at Sea": the Kraken Trench (zone `trench`, see systems/API.md "Story").
//   · the diver: a diving-bell helmet + lamp, 45 s of air, refilled at the vents; out of air → you float up to the sea (never lose progress)
//   · darkness: a lamp around you, the great crystals and the vents are the only lights
//   · the maze: tentacle pillars block ~8 chokepoints (cut them with a knife, or squeeze past by mashing E), three sharks patrol,
//               two wrecks hold rare art cards
//   · the Rocky ally: the nation whose Rocky you have piloted most sends its giant; it follows your trail and has three counter-skills (keys 1/2/3)
//   · the boss: the Kraken of the trench — a huge head in front of the bubble cage, 8 tentacles, strange skills every ~6 s
//               (Slam, Sweep, Ink, Whirl, Bubble Prison, Regrow). Win → the cage bursts, Lyron is free, the end screen.
// No continuous screen shake: the only quakes are single short events (Rocky's Ground Pound, the head sinking).
import { mkCanvas, HOOK } from '../gfx.js';
import { NPC } from '../entities.js';

// ---------------------------------------------------------------- strings
const STR = {
  en: {
    outOfAir: 'Out of air — you float up', air: 'Air', o2: s => `🫧 ${s}s`,
    bossHud: (a, n) => `🦑 tentacles ${a}/${n}`, headHud: hp => `head ♥${hp}`,
    cut: n => `Cut the tentacle (${n} hit${n === 1 ? '' : 's'})`, squeeze: k => `Squeeze through (E ${k}/8)`, cutDone: 'The tentacle withdraws', squeezed: 'You squeeze past the tentacle',
    search: 'Search the wreck', wreckCard: n => `Rare art card: ${n} · 🫧 +3`, wreckPearl: 'Only pearls left in this wreck · 🫧 +3',
    shark: '🦈 Shark bite! −8 s air',
    strike: 'Strike', pop: k => `Pop the bubble (E ${k}/10)`, resist: 'Resist the whirl (mash E)', mash: 'MASH E',
    intro: '🦑 The Kraken of the trench rises!', rematch: '🦑 The Kraken remembers you…',
    slam: '🦑 Slam — move!', sweep: '🦑 Sweep — leave the band!', ink: '🦑 Ink cloud!', whirl: '🦑 Whirlpool — mash E!', bubble: '🦑 Bubble prison — mash E!',
    regrow: '🦑 A tentacle regrows!', thrash: '🦑 The head thrashes — survive 5 s!',
    slamHit: 'Slammed! −10 s air', sweepHit: 'Swept! −8 s air', bite: 'The beak snaps! −8 s air',
    tentDown: n => n ? `Tentacle down — ${n} left` : 'All tentacles down!', headHit: hp => hp ? `Rocky crushes the head! ${hp} to go` : 'The head cracks!',
    headNeed: 'Crush reaches the head only with 5 tentacles down', crushNone: 'Nothing in Rocky\'s reach', noAlly: 'No Rocky with you — wake a Rocky on land first (meet its nation, pay stones), then dive',
    skills: ['Ground Pound', 'Stone Shield', 'Crush'], skillHint: 'Rocky · keys 1 2 3', ready: 'ready',
    pound: 'Rocky pounds the floor — the tentacles are stunned!', shield: 'Stone shield up — 5 s', crushed: 'Rocky crushes the tentacle!', popped: 'Rocky crushes the bubble!', inkHeld: 'The stone shield holds the ink off',
    ally: n => `Rocky · ${n}`,
    win: 'The Kraken sinks into the abyss!', cage: 'The bubble cage bursts!', rematchWin: 'The Kraken retreats! 🦑 Kraken ink +1 · 🪨 +10',
    pages: ally => ['…you? You actually came down here?! I thought the trench would keep me for good.', ally ? 'And you came back with a ROCKY? The statue walks?! Seismic really does move mountains.' : 'You fought that thing alone? Braver than any founder should ask of anyone.', 'Let\'s go home. The pier, the village, everyone. And I owe you a story about a red scarf.'],
    talk: 'Talk', after: 'Up we go — the gate is at the bottom of the maze. I am right behind you.',
    endTitle: 'Lyron is home', endBody: 'You dived into the Kraken Trench and brought Lyron back to the light.\nThe harbor is lit tonight. Thank you, friend.'
  },
  vi: {
    outOfAir: 'Hết dưỡng khí — bạn nổi lên', air: 'Dưỡng khí', o2: s => `🫧 ${s}s`,
    bossHud: (a, n) => `🦑 xúc tu ${a}/${n}`, headHud: hp => `đầu ♥${hp}`,
    cut: n => `Chém xúc tu (${n} nhát)`, squeeze: k => `Lách qua (E ${k}/8)`, cutDone: 'Xúc tu rụt lại', squeezed: 'Bạn lách qua được xúc tu',
    search: 'Lục xác tàu', wreckCard: n => `Thẻ tranh hiếm: ${n} · 🫧 +3`, wreckPearl: 'Xác tàu chỉ còn ngọc trai · 🫧 +3',
    shark: '🦈 Cá mập đớp! −8 s khí',
    strike: 'Đánh', pop: k => `Phá bong bóng (E ${k}/10)`, resist: 'Chống xoáy (bấm E liên tục)', mash: 'BẤM E',
    intro: '🦑 Kraken của vực trỗi dậy!', rematch: '🦑 Kraken nhớ mặt bạn…',
    slam: '🦑 Đập — né đi!', sweep: '🦑 Quét — rời khỏi dải!', ink: '🦑 Mây mực!', whirl: '🦑 Xoáy nước — bấm E!', bubble: '🦑 Lồng bong bóng — bấm E!',
    regrow: '🦑 Một xúc tu mọc lại!', thrash: '🦑 Đầu Kraken vùng vẫy — trụ 5 s!',
    slamHit: 'Trúng đòn đập! −10 s khí', sweepHit: 'Bị quét! −8 s khí', bite: 'Mỏ Kraken đớp! −8 s khí',
    tentDown: n => n ? `Hạ một xúc tu — còn ${n}` : 'Hạ hết xúc tu!', headHit: hp => hp ? `Rocky bóp đầu Kraken! Còn ${hp}` : 'Đầu Kraken nứt toác!',
    headNeed: 'Cần hạ 5 xúc tu thì Rocky mới với tới đầu', crushNone: 'Không có gì trong tầm Rocky', noAlly: 'Không có Rocky đi cùng — đánh thức Rocky trên đất liền trước (gặp đủ người nước đó + trả đá) rồi mới lặn',
    skills: ['Dậm Đất', 'Khiên Đá', 'Bóp Nát'], skillHint: 'Rocky · phím 1 2 3', ready: 'sẵn sàng',
    pound: 'Rocky dậm đất — xúc tu choáng!', shield: 'Khiên đá bật — 5 s', crushed: 'Rocky bóp nát xúc tu!', popped: 'Rocky bóp vỡ bong bóng!', inkHeld: 'Khiên đá chặn mực lại',
    ally: n => `Rocky · ${n}`,
    win: 'Kraken chìm xuống vực sâu!', cage: 'Lồng bong bóng vỡ tung!', rematchWin: 'Kraken rút lui! 🦑 Mực Kraken +1 · 🪨 +10',
    pages: ally => ['…bạn à? Bạn xuống tận đây thật sao?! Mình tưởng vực này giữ mình mãi rồi.', ally ? 'Còn dắt theo cả ROCKY? Tượng biết đi?! Seismic đúng là dời được núi.' : 'Bạn đánh con đó một mình? Gan hơn bất cứ điều gì một nhà sáng lập dám mong.', 'Về nhà thôi. Cầu tàu, làng, mọi người. Mình còn nợ bạn chuyện về chiếc khăn đỏ.'],
    talk: 'Nói chuyện', after: 'Đi lên thôi — cổng ở cuối mê cung. Mình theo ngay sau bạn.',
    endTitle: 'Lyron đã về nhà', endBody: 'Bạn đã lặn xuống Vực Kraken và đưa Lyron trở lại ánh sáng.\nĐêm nay bến cảng thắp đèn. Cảm ơn bạn, người bạn của mình.'
  }
};
const L = ctx => STR[ctx.lang() === 'vi' ? 'vi' : 'en'];

// ---------------------------------------------------------------- tuning
const TILE = 16, TAU = Math.PI * 2, OUT = '#1c1a24';
const O2_MAX = 45, VENT_R = 1.5 * TILE, VENT_RATE = 12, SPEED = 0.85;
const LAMP_R = 44, LAMP_R_BIG = 70, CRYSTAL_R = 90, VENT_LIGHT = 20, CAGE_R = 40, ALLY_R = 26;
const N_PILLARS = 8, PILLAR_HP = 3, SQUEEZE_N = 8, PILLAR_REACH = 30;
const N_SHARKS = 3, SHARK_SEE = 6 * TILE, SHARK_SP = 55, SHARK_WANDER = 30, SHARK_BITE = 8, SHARK_IMM = 1.5, SCARE_R = 4 * TILE;
const ALLY_GAP = 2.5 * TILE, ALLY_SP = 95, CD = [12, 15, 20], STUN_T = 4, SHIELD_T = 5;
const TENT_HP = 3, N_TENTS = 8, STRIKE_R = 22, HEAD_HP = 3, HEAD_NEED_DEAD = 5, HEAD_REACH = 7 * TILE, CRUSH_REACH = 7 * TILE;
const SKILL_GAP = [4.5, 6.5], TELL = 1.0, REGROW_T = 25, THRASH_T = 5;
const SLAM_DMG = 10, SWEEP_DMG = 8, BITE_DMG = 8, SWEEP_SP = 250, WHIRL_T = 3, WHIRL_PULL = 30, BUBBLE_T = 4, BUBBLE_MASH = 10, INK_T = 2;
const rand = (a, b) => a + Math.random() * (b - a);
const tileOf = v => Math.floor(v / TILE);

// ---------------------------------------------------------------- sprites (built once at module load)
const px = (g, x, y, c, w = 1, h = 1) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
function one(w, h, fn) { const c = mkCanvas(w, h); fn(c.getContext('2d')); return c; }
function flip(src) { const c = mkCanvas(src.width, src.height), g = c.getContext('2d'); g.translate(src.width, 0); g.scale(-1, 1); g.drawImage(src, 0, 0); return c; }
function scaled(src, k) { const c = mkCanvas(src.width * k, src.height * k), g = c.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(src, 0, 0, c.width, c.height); return c; }
// a tentacle spine (same style as the sea Kraken): 16×32 — frames 0/1 sway · 2 wind-up · 3 lash
function tentacleArt(g, f) {
  const B = '#4a2a6a', LT = '#6e44a0', D = '#33184d', SK = '#e6b8ef', SD = '#a06fc0';
  const curve = s => {
    if (f === 2) return { x: 8 + s * 4 - (s > 0.7 ? (s - 0.7) * 30 : 0), y: 31 - s * 28 + (s > 0.7 ? (s - 0.7) * 12 : 0) };
    if (f === 3) return { x: 8 - s * 6, y: 31 - s * 20 };
    return { x: 8 + Math.sin(s * 4.5 + (f ? Math.PI : 0)) * 2.2 * (0.3 + s), y: 31 - s * 29 };
  };
  const wOf = s => 7 - s * 5, N = 48;
  for (let i = 0; i <= N; i++) { const s = i / N, p = curve(s), w = wOf(s) + 2; g.fillStyle = OUT; g.fillRect(Math.round(p.x - w / 2), Math.round(p.y - 1), Math.round(w), 3); }
  for (let i = 0; i <= N; i++) { const s = i / N, p = curve(s), w = wOf(s); g.fillStyle = s > 0.85 ? D : B; g.fillRect(Math.round(p.x - w / 2), Math.round(p.y), Math.round(w), 1); }
  for (let i = 0; i <= N; i++) { const s = i / N, p = curve(s), w = wOf(s); if (w > 3) px(g, Math.round(p.x + w / 2 - 2), Math.round(p.y), LT, 1, 1); }
  for (let i = 2; i < N; i += 5) { const s = i / N, p = curve(s), w = wOf(s); if (w < 3) continue; const sx = Math.round(p.x - w / 2 + 1), sy = Math.round(p.y); px(g, sx, sy, SD, 2, 1); px(g, sx, sy - 1, SK, 1, 1); }
}
// the head, 32×24 then scaled ×2 — a dark dome, slit yellow eyes, a beak, no froth (we are under water)
function headArt(g) {
  const TOP = '#5a3488', MID = '#43266f', LOW = '#341c58', E = '#ffd45e';
  for (let y = 0; y < 22; y++) {
    const k = (y - 12) / 13, hw = Math.sqrt(Math.max(0, 1 - k * k)) * 15;
    const x0 = Math.round(16 - hw), w = Math.round(hw * 2); if (w <= 0) continue;
    px(g, x0 - 1, y, OUT, w + 2, 1); if (y > 0) px(g, x0, y, y < 7 ? TOP : y < 14 ? MID : LOW, w, 1);
  }
  px(g, 12, 2, '#7d55b0', 6, 1); px(g, 10, 3, '#7d55b0', 3, 1);
  px(g, 6, 9, OUT, 8, 6); px(g, 7, 10, E, 6, 4); px(g, 10, 10, OUT, 1, 4);
  px(g, 18, 9, OUT, 8, 6); px(g, 19, 10, E, 6, 4); px(g, 22, 10, OUT, 1, 4);
  px(g, 7, 10, '#fff2b0', 1, 1); px(g, 19, 10, '#fff2b0', 1, 1);
  px(g, 13, 16, OUT, 6, 3); px(g, 14, 16, '#1a0b2c', 4, 2); px(g, 15, 18, '#8a5a2b', 2, 1);
  for (const [x, w] of [[2, 5], [9, 4], [19, 4], [26, 4]]) { px(g, x, 20, LOW, w, 4); px(g, x, 20, OUT, 1, 4); px(g, x + w - 1, 20, OUT, 1, 4); }
}
// coiled tentacle pillars blocking a maze door: vertical (1×3 tiles) and horizontal (3×1 tiles)
function coilArt(g, w, h, vertical) {
  const B = '#4a2a6a', LT = '#6e44a0', D = '#33184d', SK = '#e6b8ef', SD = '#a06fc0', N = 90;
  const p = s => vertical ? { x: w / 2 + Math.sin(s * 9) * (w / 2 - 5), y: h - 4 - s * (h - 10) } : { x: 4 + s * (w - 8), y: h / 2 + 2 + Math.sin(s * 9) * (h / 2 - 6) };
  const wOf = s => 8 - s * 3;
  for (let i = 0; i <= N; i++) { const q = p(i / N), ww = wOf(i / N) + 2; g.fillStyle = OUT; g.fillRect(Math.round(q.x - ww / 2), Math.round(q.y - ww / 2), Math.round(ww), Math.round(ww)); }
  for (let i = 0; i <= N; i++) { const s = i / N, q = p(s), ww = wOf(s); g.fillStyle = s > 0.9 ? D : B; g.fillRect(Math.round(q.x - ww / 2), Math.round(q.y - ww / 2), Math.round(ww), Math.round(ww)); }
  for (let i = 0; i <= N; i += 2) { const s = i / N, q = p(s), ww = wOf(s); px(g, Math.round(q.x - ww / 2 + 1), Math.round(q.y - ww / 2 + 1), LT, 1, 1); }
  for (let i = 3; i < N; i += 7) { const s = i / N, q = p(s); px(g, Math.round(q.x - 1), Math.round(q.y), SD, 2, 2); px(g, Math.round(q.x - 1), Math.round(q.y), SK, 1, 1); }
}
// a shark: 24×10, grey, a fin on top, two tail frames
function sharkArt(g, f) {
  const B = '#6b7686', BL = '#8d98a8', D = '#465061';
  px(g, 5, 3, OUT, 15, 6); px(g, 6, 4, B, 13, 4); px(g, 6, 4, BL, 13, 1); px(g, 6, 7, D, 13, 1);
  px(g, 19, 4, OUT, 4, 3); px(g, 20, 5, B, 2, 1);                                    // snout
  px(g, 10, 0, OUT, 4, 4); px(g, 11, 1, D, 2, 2);                                    // fin
  const t = f ? 1 : -1; px(g, 1, 3 + t, OUT, 5, 2); px(g, 2, 4 + t, D, 3, 1); px(g, 1, 6 - t, OUT, 5, 2); px(g, 2, 6 - t, D, 3, 1); // tail
  px(g, 18, 5, '#ffffff', 1, 1); px(g, 16, 7, '#ffffff', 2, 1);                       // eye, teeth
}
const SPR = {
  tent: HOOK.creature('kraken_tent_big', [0, 1, 2, 3].map(f => { const c = one(16, 32, g => tentacleArt(g, f)); const b = scaled(c, 2); return [b, flip(b)]; })),   // 32×64 boss tentacles
  head: HOOK.image('kraken_head_big', scaled(one(32, 24, headArt), 2)),                                                                                             // 64×48
  coilV: HOOK.image('coil_v', one(16, 56, g => coilArt(g, 16, 56, true))), coilH: HOOK.image('coil_h', one(48, 24, g => coilArt(g, 48, 24, false))),
  shark: HOOK.creature('shark', [0, 1].map(f => { const c = one(24, 10, g => sharkArt(g, f)); return [c, flip(c)]; }))
};

// ---------------------------------------------------------------- module state
let live = false, CTX = null;
let o2 = O2_MAX, surfacing = false, immT = 0, bubT = 0;
let pillars = [], sharks = [], searched = new Set(), vents = [], crystals = [], cageObj = null;
let ally = null;          // { key, name, img, w, h, x, y, dir, trail[], cd[3], shieldT, poundT, lunge:{x,y,t}|null, moving }
let boss = null;          // { phase, t, head, tents[], skillT, cur, forced, headHp, rematch, thrashT, lastSkill, out }
let trapped = null;       // { t, mash, slamAt }
let whirl = null;         // { t }
let inkT = 0, stunT = 0;
let fx = [], rings = [], marks = [];
let lyron = null, cut = null;   // cut: { t, step } — the win cutscene
let darkCv = null;
const stats = ctx => { const sv = ctx.S.save; sv.sys = sv.sys || {}; sv.sys.trench = { dives: 0, surfaced: 0, wins: 0, rematches: 0, ...(sv.sys.trench || {}) }; return sv.sys.trench; };

// ---------------------------------------------------------------- helpers
function pillarAt(tx, ty) { for (const p of pillars) if (p.st === 'block' && tx >= p.x && tx < p.x + p.w && ty >= p.y && ty < p.y + p.h) return p; return null; }
function solidFor(ctx, tx, ty) { return ctx.isSolid(ctx.S.map, tx, ty) || !!pillarAt(tx, ty); }
function boxFree(ctx, x, y, w, h, extra) {
  const x0 = tileOf(x - w / 2), x1 = tileOf(x + w / 2 - 1), y0 = tileOf(y - h), y1 = tileOf(y - 1);
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) if (solidFor(ctx, tx, ty) || (extra && extra(tx, ty))) return false;
  return true;
}
function bubble(x, y, n = 3, up = 30) { for (let i = 0; i < n; i++) fx.push({ x: x + rand(-3, 3), y: y + rand(-2, 2), vx: rand(-4, 4), vy: -up * rand(0.6, 1.3), t: 0, life: rand(0.8, 1.6), c: 'rgba(230,248,255,.85)', r: Math.random() < 0.3 ? 2 : 1, wob: Math.random() * TAU }); }
function ink(x, y, n = 12) { for (let i = 0; i < n; i++) { const a = Math.random() * TAU, sp = 6 + Math.random() * 18; fx.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.6, t: 0, life: 0.9 + Math.random() * 0.6, c: 'rgba(30,16,50,.85)', r: 2 + Math.random() * 2.5, blob: true }); } }
function ring(x, y, r1, life, c = '223,243,255') { rings.push({ x, y, r: 3, r1, t: 0, life, c }); }
function dust(x, y, n = 10) { for (let i = 0; i < n; i++) { const a = Math.random() * TAU, sp = 20 + Math.random() * 50; fx.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.4 - 20, gy: 90, t: 0, life: 0.5 + Math.random() * 0.4, c: '#8d8d98', r: Math.random() < 0.5 ? 2 : 1 }); } }
function updateFx(dt) {
  for (let i = fx.length - 1; i >= 0; i--) { const p = fx[i]; p.t += dt; if (p.t >= p.life) { fx.splice(i, 1); continue; } p.x += p.vx * dt + (p.wob !== undefined ? Math.sin(p.t * 6 + p.wob) * 8 * dt : 0); p.y += p.vy * dt; if (p.gy) p.vy += p.gy * dt; p.vx *= 1 - dt * 1.5; }
  for (let i = rings.length - 1; i >= 0; i--) { rings[i].t += dt; if (rings[i].t >= rings[i].life) rings.splice(i, 1); }
  for (let i = marks.length - 1; i >= 0; i--) { marks[i].t += dt; if (marks[i].t >= marks[i].life) marks.splice(i, 1); }
  if (fx.length > 220) fx.splice(0, fx.length - 220);
}
function knock(ctx, fromX, fromY, px_ = 12) {
  const p = ctx.S.player, dx = p.x - fromX, dy = p.y - fromY, d = Math.hypot(dx, dy) || 1;
  const ox = dx / d * px_, oy = dy / d * px_;
  p.tryMove(ox, oy, ctx.S.map, ctx.allNpcs());
}
function loseAir(ctx, n, text) { o2 = Math.max(0, o2 - n); ctx.sfx('alarm'); if (text) ctx.toast(text); bubble(ctx.S.player.x, ctx.S.player.y - 14, 8, 40); }
const inArena = (ctx, x, y) => { const a = ctx.S.map.arena; if (!a) return false; const tx = tileOf(x), ty = tileOf(y); return ty < 16 && tx >= a.x && tx < a.x + a.w; };

// ---------------------------------------------------------------- the diver
function applyDiver(ctx) {
  const p = ctx.S.player;
  p.speedMul = SPEED; p.ghost = false; p.boxW = 10; p.boxH = 6;
  p.passable = (m, tx, ty) => !ctx.isSolid(m, tx, ty) && !pillarAt(tx, ty);
  p.custom = (g, ent) => {
    const x = Math.round(ent.x), y = Math.round(ent.y);
    g.drawImage(ent.sheet, ent.frame * 16, ent.dir * 20, 16, 20, x - 8, y - 18, 16, 20);
    const b = ent.frame === 0 ? 0 : -1, hx = x, hy = y - 13 + b;                       // the head sits at rows 1..9 of the frame
    g.fillStyle = 'rgba(170,225,255,.42)'; g.beginPath(); g.arc(hx, hy, 6.5, 0, TAU); g.fill();
    g.strokeStyle = '#c9a24a'; g.lineWidth = 1; g.beginPath(); g.arc(hx, hy, 6.5, 0, TAU); g.stroke();
    g.fillStyle = '#c9a24a'; g.fillRect(hx - 6, hy + 4, 12, 2);                          // brass collar
    g.fillStyle = 'rgba(255,255,255,.8)'; g.fillRect(hx - 4, hy - 4, 2, 1); g.fillRect(hx - 5, hy - 3, 1, 2);
    g.fillStyle = OUT; g.fillRect(hx - 2, hy - 9, 4, 3); g.fillStyle = '#ffe89a'; g.fillRect(hx - 1, hy - 8, 2, 1);  // the lamp
    g.fillStyle = 'rgba(255,240,180,.35)'; g.fillRect(hx - 3, hy - 10, 6, 1);
  };
}
function restoreDiver(ctx) {
  const p = ctx.S.player;
  p.speedMul = 1; p.passable = null; p.custom = null; p.ghost = false; p.boxW = 10; p.boxH = 6;
}
function surface(ctx) {
  if (surfacing) return;
  surfacing = true;
  const st = ctx.story(); st.attempts = (st.attempts || 0) + 1; stats(ctx).surfaced++; ctx.persist();
  ctx.toast(L(ctx).outOfAir, true); ctx.alert(''); ctx.sfx('splash');
  if (!ctx.travel('sea', 'back')) surfacing = false;
}

// ---------------------------------------------------------------- the maze: pillars, sharks, wrecks
function bfsPath(ctx, x0, y0, x1, y1) {
  const m = ctx.S.map, W = m.w, H = m.h, prev = new Int32Array(W * H).fill(-1), k = (x, y) => y * W + x;
  const q = [[x0, y0]]; prev[k(x0, y0)] = k(x0, y0); let head = 0;
  while (head < q.length) {
    const [x, y] = q[head++]; if (x === x1 && y === y1) break;
    for (const [dx, dy] of [[0, -1], [1, 0], [-1, 0], [0, 1]]) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H || prev[k(nx, ny)] !== -1 || ctx.isSolid(m, nx, ny)) continue; prev[k(nx, ny)] = k(x, y); q.push([nx, ny]); }
  }
  if (prev[k(x1, y1)] === -1) return null;
  const out = []; let c = k(x1, y1); while (c !== k(x0, y0)) { out.push({ x: c % W, y: Math.floor(c / W) }); c = prev[c]; }
  return out.reverse();
}
function buildPillars(ctx) {
  pillars = [];
  const m = ctx.S.map, doors = (m.doors || []).filter(d => d.y > 16 && d.y < 52);
  const e = m.entries.default, path = bfsPath(ctx, e.x, e.y, Math.floor(m.w / 2), 15) || [];
  const order = new Map();
  path.forEach((t, i) => { for (const d of doors) if (!order.has(d) && t.x >= d.x && t.x < d.x + d.w && t.y >= d.y && t.y < d.y + d.h) order.set(d, i); });
  const onPath = [...order.keys()].sort((a, b) => order.get(a) - order.get(b));
  let pick = [];
  if (onPath.length >= N_PILLARS) for (let i = 0; i < N_PILLARS; i++) pick.push(onPath[Math.floor((i + 0.5) * onPath.length / N_PILLARS)]);
  else { pick = onPath.slice(); const rest = doors.filter(d => !order.has(d)).sort(() => Math.random() - 0.5); while (pick.length < N_PILLARS && rest.length) pick.push(rest.pop()); }
  for (const d of pick) {
    if (pillars.some(p => p.x === d.x && p.y === d.y)) continue;
    pillars.push({ x: d.x, y: d.y, w: d.w, h: d.h, hp: PILLAR_HP, squeeze: 0, st: 'block', t: 0, hitCd: 0, cx: (d.x + d.w / 2) * TILE, cy: (d.y + d.h / 2) * TILE, ft: Math.random() * 3 });
  }
}
function sharkBlocked(ctx, x, y) {
  const m = ctx.S.map, test = (tx, ty) => ty < 17 || ty > 52 || solidFor(ctx, tx, ty);
  return test(tileOf(x - 9), tileOf(y - 3)) || test(tileOf(x + 9), tileOf(y - 3)) || test(tileOf(x - 9), tileOf(y + 3)) || test(tileOf(x + 9), tileOf(y + 3)) || !m;
}
function buildSharks(ctx) {
  sharks = [];
  const m = ctx.S.map, p = ctx.S.player;
  for (let n = 0; n < 200 && sharks.length < N_SHARKS; n++) {
    const tx = 3 + ((Math.random() * (m.w - 6)) | 0), ty = 18 + ((Math.random() * 33) | 0), x = tx * TILE + 8, y = ty * TILE + 8;
    if (sharkBlocked(ctx, x, y)) continue;
    if (Math.hypot(x - p.x, y - p.y) < 12 * TILE) continue;
    if (sharks.some(s => Math.hypot(s.x - x, s.y - y) < 14 * TILE)) continue;
    sharks.push({ x, y, dir: [[1, 0], [-1, 0], [0, 1], [0, -1]][(Math.random() * 4) | 0], face: 1, ft: Math.random() * 3, turnT: rand(1, 3), flee: 0, st: 'wander' });
  }
}
function updateSharks(dt, ctx) {
  const p = ctx.S.player;
  for (const s of sharks) {
    s.ft += dt; if (s.flee > 0) s.flee -= dt;
    const dp = Math.hypot(p.x - s.x, p.y - s.y), scared = ally && Math.hypot(ally.x - s.x, ally.y - s.y) < SCARE_R;
    let vx = 0, vy = 0, sp = SHARK_WANDER;
    if (scared || s.flee > 0) { const ax = scared ? ally.x : p.x, ay = scared ? ally.y : p.y, dx = s.x - ax, dy = s.y - ay, d = Math.hypot(dx, dy) || 1; vx = dx / d; vy = dy / d; sp = SHARK_SP; s.st = 'flee'; }
    else if (dp < SHARK_SEE && !trapped) { const dx = p.x - s.x, dy = p.y - 3 - s.y, d = Math.hypot(dx, dy) || 1; vx = dx / d; vy = dy / d; sp = SHARK_SP; s.st = 'hunt'; }
    else { s.st = 'wander'; s.turnT -= dt; if (s.turnT <= 0) { s.turnT = rand(1.5, 4); s.dir = [[1, 0], [-1, 0], [0, 1], [0, -1]][(Math.random() * 4) | 0]; } vx = s.dir[0]; vy = s.dir[1]; }
    let moved = false;
    if (vx && !sharkBlocked(ctx, s.x + vx * sp * dt, s.y)) { s.x += vx * sp * dt; moved = true; }
    if (vy && !sharkBlocked(ctx, s.x, s.y + vy * sp * dt)) { s.y += vy * sp * dt; moved = true; }
    if (!moved && s.st === 'wander') s.turnT = 0;
    if (Math.abs(vx) > 0.2) s.face = vx > 0 ? 1 : -1;
    // contact
    if (immT <= 0 && s.st !== 'flee') {
      const b = p.box(); if (b.x < s.x + 10 && b.x + b.w > s.x - 10 && b.y < s.y + 4 && b.y + b.h > s.y - 4) {
        loseAir(ctx, SHARK_BITE, L(ctx).shark); knock(ctx, s.x, s.y, 12); immT = SHARK_IMM; s.flee = 1.5; ring(p.x, p.y - 6, 14, 0.4, '255,120,120');
      }
    }
  }
}
function searchWreck(ctx, o) {
  const S = L(ctx), key = `${o.x},${o.y}`; if (searched.has(key)) return;
  searched.add(key);
  const cards = (ctx.S.save.cards ||= []);
  const pool = ctx.membersOfLevel(8).concat(ctx.membersOfLevel(9)).filter(m => !cards.includes(m.id));
  ctx.bag.add('pearl', 3);
  if (pool.length) { const m = pool[(Math.random() * pool.length) | 0]; cards.push(m.id); ctx.toast(S.wreckCard(m.k || m.n), true); } else ctx.toast(S.wreckPearl, true);
  ctx.sfx('coin'); ctx.persist(); bubble(o.x * TILE + 24, o.y * TILE + 16, 10, 40);
}

// ---------------------------------------------------------------- the Rocky ally
function allyKey(ctx) {
  const t = ctx.S.save.sys && ctx.S.save.sys.rocky && ctx.S.save.sys.rocky.tamed; if (!t) return null;
  let best = null, bn = 0; for (const [k, n] of Object.entries(t)) if (n > bn) { bn = n; best = k; }
  return best;
}
function spawnAlly(ctx) {
  const key = allyKey(ctx); if (!key) { ally = null; return; }
  const d = ctx.O[ctx.rockyObj(key, 5)], p = ctx.S.player;
  ally = { key, name: ctx.nationName(key), img: d.img, w: d.w, h: d.h, x: p.x, y: p.y + 24, dir: 0, trail: [{ x: p.x, y: p.y }], cd: [0, 0, 0], shieldT: 0, poundT: 0, lunge: null, moving: false, stepT: 0, lastPx: p.x, lastPy: p.y };
}
function updateAlly(dt, ctx) {
  const a = ally, p = ctx.S.player;
  for (let i = 0; i < 3; i++) if (a.cd[i] > 0) a.cd[i] -= dt;
  if (a.shieldT > 0) a.shieldT -= dt;
  if (a.poundT > 0) a.poundT -= dt;
  if (a.lunge) { a.lunge.t -= dt; if (a.lunge.t <= 0) a.lunge = null; }
  // the trail: the player's recent positions, so the giant never gets stuck behind coral
  const tl = a.trail, last = tl[tl.length - 1];
  if (Math.hypot(p.x - last.x, p.y - last.y) >= 4) { tl.push({ x: p.x, y: p.y }); if (tl.length > 200) tl.shift(); }
  // target: the trail point ALLY_GAP px behind the player (measured along the trail)
  let acc = 0, tx = last.x, ty = last.y;
  for (let i = tl.length - 1; i > 0; i--) { const seg = Math.hypot(tl[i].x - tl[i - 1].x, tl[i].y - tl[i - 1].y); if (acc + seg >= ALLY_GAP) { const k = (ALLY_GAP - acc) / (seg || 1); tx = tl[i].x + (tl[i - 1].x - tl[i].x) * k; ty = tl[i].y + (tl[i - 1].y - tl[i].y) * k; acc = ALLY_GAP; break; } acc += seg; tx = tl[i - 1].x; ty = tl[i - 1].y; }
  if (acc < ALLY_GAP) { const dx = p.x - tx, dy = p.y - ty, d = Math.hypot(dx, dy); if (d > 0.1 && d < ALLY_GAP) { tx = p.x - dx / d * ALLY_GAP; ty = p.y - dy / d * ALLY_GAP; } }
  const dx = tx - a.x, dy = ty - a.y, d = Math.hypot(dx, dy);
  a.moving = d > 2 && !a.lunge && a.poundT <= 0;
  if (a.moving) { const sp = Math.min(d, Math.max(ALLY_SP, d * 3) * dt); a.x += dx / d * sp; a.y += dy / d * sp; if (Math.abs(dx) > 1) a.dir = dx > 0 ? 1 : -1; a.stepT += dt; if (a.stepT > 0.45) { a.stepT = 0; bubble(a.x + rand(-10, 10), a.y - 60, 2, 25); } }
}
function skillReady(n) { return !!ally && ally.cd[n - 1] <= 0; }
function useSkill(ctx, n, force) {
  const S = L(ctx); if (!ally) { ctx.toast(S.noAlly); return false; }
  if (!force && ally.cd[n - 1] > 0) return false;
  const p = ctx.S.player, a = ally;
  if (n === 1) {                                                         // Ground Pound: stuns every tentacle (Sweep dies, Whirl stops)
    a.cd[0] = CD[0]; a.poundT = 0.5; ctx.quake(0.6); ctx.sfx('build'); dust(a.x, a.y, 16); ring(a.x, a.y, 60, 0.6, '210,200,190');
    stunT = STUN_T; if (whirl) whirl = null;
    if (boss && boss.cur && (boss.cur.name === 'sweep' || boss.cur.name === 'slam' || boss.cur.name === 'whirl')) boss.cur = null;
    if (boss) { for (const t of boss.tents) if (t.st === 'wind' || t.st === 'lash') t.st = 'sway'; }
    ctx.toast(S.pound); ctx.alert('');
  } else if (n === 2) {                                                  // Stone Shield: 5 s — no darkening from ink, no hits
    a.cd[1] = CD[1]; a.shieldT = SHIELD_T; ctx.sfx('craft'); ring(p.x, p.y - 6, 22, 0.5, '200,200,220'); ctx.toast(S.shield);
  } else if (n === 3) {                                                  // Crush: pops the bubble, 2 hits on the nearest tentacle, or the head
    a.cd[2] = CD[2]; ctx.sfx('hit');
    let did = false;
    if (trapped) { popBubble(ctx, true); did = true; }
    if (boss && (boss.phase === 'fight' || boss.phase === 'thrash')) {
      const dead = boss.tents.filter(t => t.st === 'dead').length, h = boss.head;
      const hd = Math.hypot(h.x - p.x, h.y - p.y);
      if (dead >= HEAD_NEED_DEAD && hd <= HEAD_REACH && boss.headHp > 0) { a.lunge = { x: h.x, y: h.y + 20, t: 0.5 }; hitHead(ctx); did = true; }
      else {
        let best = null, bd = Infinity; for (const t of boss.tents) { if (t.st === 'dead' || t.rise < 0.8) continue; const d = Math.hypot(t.x - p.x, t.y - p.y); if (d <= CRUSH_REACH && d < bd) { bd = d; best = t; } }
        if (best) { a.lunge = { x: best.x, y: best.y, t: 0.5 }; strike(ctx, best, 2, true); ctx.toast(S.crushed); did = true; }
        else if (dead >= HEAD_NEED_DEAD && boss.headHp > 0 && !did) ctx.toast(S.headNeed);
        else if (!did) ctx.toast(dead < HEAD_NEED_DEAD && boss.tents.every(t => t.st === 'dead' || Math.hypot(t.x - p.x, t.y - p.y) > CRUSH_REACH) ? S.crushNone : S.headNeed);
      }
    } else if (!did) ctx.toast(S.crushNone);
    if (!did) a.cd[2] = 1.5;                                              // a miss is cheap
  }
  return true;
}

// ---------------------------------------------------------------- the boss
function tentSpots(ctx) {
  const a = ctx.S.map.arena, x0 = a.x * TILE, w = a.w * TILE, top = (a.y + 4.5) * TILE, bot = (a.y + 10.5) * TILE;
  const pts = [];
  for (const k of [0.12, 0.3, 0.7, 0.88]) pts.push({ x: x0 + w * k, y: top });
  for (const k of [0.18, 0.4, 0.6, 0.82]) pts.push({ x: x0 + w * k, y: bot });
  return pts;
}
function startBoss(ctx, rematch) {
  const m = ctx.S.map, c = m.cage || { x: Math.floor(m.w / 2) - 1, y: 3 };
  boss = {
    phase: 'intro', t: 0, rematch: !!rematch, headHp: HEAD_HP, headHitCd: 0, thrashT: 0, skillT: 3, cur: null, forced: null, lastSkill: '', slamTurn: 0,
    head: { x: (c.x + 1) * TILE, y: (c.y + 2) * TILE + 30, rise: 0, alpha: 1, tell: 0 },
    tents: tentSpots(ctx).map(s => ({ x: s.x, y: s.y, hp: TENT_HP, rise: 0, st: 'rise', ft: Math.random() * 3, hitCd: 0, regrow: 0, a: 0 }))
  };
  ctx.alert(L(ctx)[rematch ? 'rematch' : 'intro'], 3); ctx.sfx('roar'); ctx.hazardsOff(true);
}
const liveTents = () => boss ? boss.tents.filter(t => t.st !== 'dead') : [];
function strike(ctx, t, n = 1, byRocky = false) {
  if (!boss || (boss.phase !== 'fight' && boss.phase !== 'thrash') || t.st === 'dead' || (!byRocky && t.hitCd > 0)) return;
  t.hitCd = 0.35; t.hp -= n; if (!byRocky) ctx.sfx('hit');
  ctx.S.player.faceTo(t.x, t.y); ink(t.x, t.y - 16, 5); bubble(t.x, t.y - 10, 3);
  if (t.hp <= 0) {
    t.st = 'dead'; t.regrow = REGROW_T; ink(t.x, t.y - 10, 16);
    const left = liveTents().length; ctx.toast(L(ctx).tentDown(left));
    if (boss.cur && (boss.cur.name === 'slam' || boss.cur.name === 'sweep') && boss.cur.tents && boss.cur.tents.includes(t) && !left) boss.cur = null;
    if (!left) allDown(ctx);
  }
}
function hitHead(ctx) {
  const S = L(ctx); boss.headHp--; boss.head.tell = 0; ctx.sfx('roar'); ink(boss.head.x, boss.head.y - 20, 20); ring(boss.head.x, boss.head.y - 20, 40, 0.5, '255,212,94');
  ctx.toast(S.headHit(boss.headHp), true);
  if (boss.headHp <= 0 && liveTents().length === 0) winBoss(ctx);
}
function allDown(ctx) {
  if (!ally) { boss.phase = 'thrash'; boss.thrashT = THRASH_T; boss.cur = null; boss.skillT = 0.6; ctx.alert(L(ctx).thrash, 3); }
  else if (boss.headHp <= 0) winBoss(ctx);
}
function pickSkill() {
  const alive = liveTents().length;
  const pool = [];
  if (alive) { pool.push('slam', 'slam', 'slam'); if (alive >= 2) pool.push('sweep', 'sweep'); }
  pool.push('ink', 'ink', 'whirl', 'whirl', 'bubble', 'bubble');
  let s = pool[(Math.random() * pool.length) | 0], tries = 0;
  while (s === boss.lastSkill && s !== 'slam' && tries++ < 6) s = pool[(Math.random() * pool.length) | 0];
  return s;
}
function beginSkill(ctx, name) {
  const S = L(ctx), p = ctx.S.player, alive = liveTents();
  if ((name === 'slam' || name === 'sweep') && !alive.length) name = 'ink';
  if (name === 'sweep' && alive.length < 2) name = 'slam';
  boss.lastSkill = name;
  const cur = { name, t: 0, phase: 'tell', tell: TELL };
  if (name === 'slam') { const t = alive.sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[0]; cur.tents = [t]; t.st = 'wind'; cur.tx = tileOf(p.x); cur.ty = tileOf(p.y - 3); marks.push({ x: cur.tx * TILE + 8, y: cur.ty * TILE + 8, t: 0, life: TELL + 0.35, kind: 'slam' }); ctx.alert(S.slam, 2); }
  else if (name === 'sweep') { const ts = alive.slice().sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y)).slice(0, 2); cur.tents = ts; for (const t of ts) t.st = 'wind'; const a = ctx.S.map.arena; cur.y0 = Math.max(a.y * TILE + 8, Math.min((a.y + a.h) * TILE - 40, p.y - 6 - 16)); cur.dirX = p.x < (a.x + a.w / 2) * TILE ? 1 : -1; cur.fx = cur.dirX > 0 ? a.x * TILE : (a.x + a.w) * TILE; cur.x0 = a.x * TILE; cur.x1 = (a.x + a.w) * TILE; cur.hit = false; ctx.alert(S.sweep, 2.5); }
  else if (name === 'ink') { boss.head.tell = TELL; ctx.alert(S.ink, 2); }
  else if (name === 'whirl') { boss.head.tell = TELL; ctx.alert(S.whirl, 3); }
  else if (name === 'bubble') { boss.head.tell = TELL; ctx.alert(S.bubble, 3); for (let i = 0; i < 6; i++) bubble(p.x + rand(-20, 20), p.y + rand(-4, 12), 1, 20); }
  boss.cur = cur;
}
function execSkill(ctx, cur) {
  const S = L(ctx), p = ctx.S.player;
  if (cur.name === 'slam') {
    for (const t of cur.tents) if (t.st === 'wind') { t.st = 'lash'; t.a = 0; }
    const hx = cur.tx * TILE + 8, hy = cur.ty * TILE + 8; ring(hx, hy, 22, 0.45); ink(hx, hy, 6); ctx.sfx('splash');
    const b = p.box(); const hit = b.x < hx + 10 && b.x + b.w > hx - 10 && b.y < hy + 10 && b.y + b.h > hy - 10;
    if (hit && !(ally && ally.shieldT > 0)) { loseAir(ctx, SLAM_DMG, S.slamHit); knock(ctx, hx, hy + 4, 14); }
    cur.phase = 'done'; cur.t = 0;
  } else if (cur.name === 'sweep') { cur.phase = 'run'; cur.t = 0; for (const t of cur.tents) t.st = 'lash'; ctx.sfx('splash'); }
  else if (cur.name === 'ink') { if (ally && ally.shieldT > 0) ctx.toast(S.inkHeld); else inkT = INK_T; ink(boss.head.x, boss.head.y - 24, 30); cur.phase = 'done'; cur.t = -1.2; boss.skillT = 1.5; }   // the next skill comes fast, in the dark
  else if (cur.name === 'whirl') { whirl = { t: WHIRL_T }; cur.phase = 'run'; cur.t = 0; }
  else if (cur.name === 'bubble') { trapped = { t: BUBBLE_T, mash: 0, slamAt: 1.5 }; cur.phase = 'run'; cur.t = 0; ctx.sfx('squeak'); ring(p.x, p.y - 6, 16, 0.4); }
}
function popBubble(ctx, byRocky) {
  if (!trapped) return;
  const p = ctx.S.player; trapped = null; bubble(p.x, p.y - 10, 14, 45); ring(p.x, p.y - 6, 18, 0.35); ctx.sfx('splash');
  if (byRocky) ctx.toast(L(ctx).popped);
  if (boss && boss.cur && boss.cur.name === 'bubble') { boss.cur = null; }
}
function updateBoss(dt, ctx) {
  const S = L(ctx), p = ctx.S.player, B = boss, h = B.head;
  B.t += dt;
  for (const t of B.tents) { t.ft += dt; if (t.hitCd > 0) t.hitCd -= dt; if (t.st === 'lash') { t.a += dt; if (t.a > 0.45) { t.st = 'sway'; t.a = 0; } } }
  if (h.tell > 0) h.tell -= dt;
  if (B.phase === 'intro') {
    const k = Math.min(1, B.t / 1.6);
    for (const t of B.tents) { t.rise = Math.min(1, k * 1.15); if (t.rise >= 1 && t.st === 'rise') t.st = 'sway'; }
    h.rise = Math.min(1, Math.max(0, (B.t - 0.3) / 1.2));
    if (B.t > 0.2 && Math.random() < dt * 6) bubble(h.x + rand(-30, 30), h.y - 10, 2, 35);
    if (B.t >= 1.8) { B.phase = 'fight'; B.t = 0; for (const t of B.tents) if (t.st === 'rise') t.st = 'sway'; }
    return;
  }
  if (B.phase === 'win') { updateWin(dt, ctx); return; }
  if (B.phase !== 'fight' && B.phase !== 'thrash') return;
  if (B.phase === 'thrash') { B.thrashT -= dt; if (B.thrashT <= 0 && !B.cur) { winBoss(ctx); return; } }
  // regrow: a dead tentacle comes back after 25 s unless the head has been hit (Crush) — and not while the head thrashes
  if (B.headHp === HEAD_HP && B.phase === 'fight') for (const t of B.tents) if (t.st === 'dead') { t.regrow -= dt; if (t.regrow <= 0) { t.st = 'rise'; t.hp = TENT_HP; t.rise = 0; ctx.alert(S.regrow, 2); bubble(t.x, t.y, 6, 30); } }
  for (const t of B.tents) if (t.st === 'rise') { t.rise = Math.min(1, t.rise + dt * 0.7); if (t.rise >= 1) t.st = 'sway'; }
  if (stunT > 0) stunT -= dt;
  // skills
  const cur = B.cur;
  if (cur) {
    cur.t += dt;
    if (cur.phase === 'tell') { if (stunT > 0 && (cur.name === 'slam' || cur.name === 'sweep')) { B.cur = null; for (const t of cur.tents || []) t.st = 'sway'; } else if (cur.t >= cur.tell) execSkill(ctx, cur); }
    else if (cur.phase === 'run') {
      if (cur.name === 'sweep') {
        cur.fx += cur.dirX * SWEEP_SP * dt;
        const b = p.box(), inBand = b.y + b.h > cur.y0 && b.y < cur.y0 + 32, atFront = Math.abs(p.x - cur.fx) < 14;
        if (!cur.hit && inBand && atFront && !(ally && ally.shieldT > 0)) { cur.hit = true; loseAir(ctx, SWEEP_DMG, S.sweepHit); knock(ctx, p.x - cur.dirX * 10, p.y + (p.y - 6 < cur.y0 + 16 ? 30 : -30), 16); ring(p.x, p.y - 6, 14, 0.4, '255,120,120'); }
        if (Math.random() < dt * 20) ink(cur.fx, cur.y0 + rand(0, 32), 1);
        if (cur.fx < cur.x0 - 20 || cur.fx > cur.x1 + 20 || stunT > 0) { for (const t of cur.tents) t.st = 'sway'; B.cur = null; }
      } else if (cur.name === 'whirl') {
        if (!whirl) { B.cur = null; }
        else {
          whirl.t -= dt;
          const dx = h.x - p.x, dy = h.y + 10 - p.y, d = Math.hypot(dx, dy) || 1;
          if (ctx.S.mode === 'play') p.tryMove(dx / d * WHIRL_PULL * dt, dy / d * WHIRL_PULL * dt, ctx.S.map, ctx.allNpcs());
          if (d < 44 && immT <= 0 && !(ally && ally.shieldT > 0)) { loseAir(ctx, BITE_DMG, S.bite); knock(ctx, h.x, h.y, 26); immT = 1.2; }
          if (whirl.t <= 0) { whirl = null; B.cur = null; }
        }
      } else if (cur.name === 'bubble') {
        if (!trapped) { B.cur = null; }
        else {
          trapped.t -= dt;
          if (trapped.slamAt > 0) { trapped.slamAt -= dt; if (trapped.slamAt <= 0 && liveTents().length) { cur.slam = { t: 0, tx: tileOf(p.x), ty: tileOf(p.y - 3) }; const t = liveTents()[0]; t.st = 'wind'; cur.tent = t; marks.push({ x: cur.slam.tx * TILE + 8, y: cur.slam.ty * TILE + 8, t: 0, life: TELL + 0.35, kind: 'slam' }); ctx.alert(S.slam, 1.5); } }
          if (cur.slam) { cur.slam.t += dt; if (cur.slam.t >= TELL) { const s = cur.slam; cur.slam = null; if (cur.tent && cur.tent.st === 'wind') { cur.tent.st = 'lash'; cur.tent.a = 0; } const hx = s.tx * TILE + 8, hy = s.ty * TILE + 8; ring(hx, hy, 22, 0.45); ink(hx, hy, 6); ctx.sfx('splash'); if (trapped && !(ally && ally.shieldT > 0)) { loseAir(ctx, SLAM_DMG, S.slamHit); } popBubble(ctx, false); B.cur = null; } }
          if (trapped && trapped.t <= 0) { popBubble(ctx, false); B.cur = null; }
        }
      }
    } else if (cur.phase === 'done') { if (cur.t >= 0.5) B.cur = null; }
  } else {
    B.skillT -= dt;
    if (B.skillT <= 0) {
      let name;
      if (B.phase === 'thrash') { name = 'slam'; B.skillT = 1.3; if (!liveTents().length) { /* head thrash = slams from the head */ } }
      else { name = B.forced || pickSkill(); B.forced = null; B.skillT = rand(SKILL_GAP[0], SKILL_GAP[1]); }
      if (B.phase === 'thrash') beginHeadSlam(ctx); else beginSkill(ctx, name);
    }
  }
}
// while the head thrashes (no Rocky, all tentacles dead): the head itself slams the tile under you every ~1.3 s
function beginHeadSlam(ctx) {
  const p = ctx.S.player, cur = { name: 'slam', t: 0, phase: 'tell', tell: 0.85, tents: [], tx: tileOf(p.x), ty: tileOf(p.y - 3) };
  boss.head.tell = 0.85; marks.push({ x: cur.tx * TILE + 8, y: cur.ty * TILE + 8, t: 0, life: 0.85 + 0.35, kind: 'slam' }); ctx.alert(L(ctx).slam, 1.2);
  boss.cur = cur;
}
function winBoss(ctx) {
  const S = L(ctx); if (!boss || boss.phase === 'win' || boss.phase === 'done') return;
  boss.phase = 'win'; boss.t = 0; boss.cur = null; whirl = null; stunT = 0; inkT = 0; if (trapped) popBubble(ctx, false);
  ctx.alert(''); ctx.toast(S.win, true); ctx.sfx('win'); ctx.quake(0.5);
  for (const t of boss.tents) t.st = t.st === 'dead' ? 'dead' : 'sink';
  const st = stats(ctx); if (boss.rematch) st.rematches++; else st.wins++; ctx.persist();
  cut = { t: 0, step: 0 };
  if (!boss.rematch) ctx.setMode('cutscene');
}
function updateWin(dt, ctx) {
  const S = L(ctx), B = boss, h = B.head, p = ctx.S.player, m = ctx.S.map;
  cut.t += dt;
  for (const t of B.tents) if (t.st === 'sink') { t.rise = Math.max(0, t.rise - dt * 0.8); if (Math.random() < dt * 4) bubble(t.x, t.y - 10, 1, 30); }
  h.y -= dt * 8; h.alpha = Math.max(0, 1 - cut.t / 2); if (Math.random() < dt * 8) bubble(h.x + rand(-30, 30), h.y - 10, 2, 40);
  if (B.rematch) {
    if (cut.step === 0 && cut.t >= 2) { cut.step = 1; ctx.bag.add('ink', 1); ctx.bag.add('stone', 10); ctx.toast(S.rematchWin, true); ctx.sfx('coin'); ctx.persist(); B.phase = 'done'; }
    return;
  }
  if (cut.step === 0 && cut.t >= 2) {                                       // the cage bursts
    cut.step = 1;
    if (cageObj) { const cx = (cageObj.x + 1) * TILE, cy = (cageObj.y + 1) * TILE; ctx.removeObject(m, cageObj); cageObj = null; bubble(cx, cy, 40, 50); ring(cx, cy, 40, 0.6); ring(cx, cy, 26, 0.45, '255,255,255'); }
    ctx.sfx('splash'); ctx.toast(S.cage, true);
    const cx = m.cage ? (m.cage.x + 1) * TILE : h.x, cy = m.cage ? (m.cage.y + 2) * TILE + 2 : h.y;
    lyron = new NPC(ctx.FRIEND, cx, cy, ctx.friendSheet(), ctx.rngFrom(3));
    lyron.ghost = true; lyron.radius = 8; lyron.speedMul = 1.6;
    lyron.custom = (g, ent) => { const x = Math.round(ent.x) - 8, y = Math.round(ent.y) - 18; g.drawImage(ent.sheet, ent.frame * 16, ent.dir * 20, 16, 20, x, y, 16, 20); ctx.drawScarf(g, x, y, ent.dir, ctx.S.time); };
    ctx.S.npcs.push(lyron);
    lyron.goal = { x: p.x, y: p.y + 22 };
  }
  if (cut.step === 1 && cut.t >= 2.4) {                                     // he swims to you
    const d = Math.hypot(lyron.x - p.x, lyron.y - p.y);
    if (!lyron.goal && d > 30 && cut.t < 8) lyron.goal = { x: p.x, y: p.y + 22 };
    if (d <= 30 || cut.t >= 8) {
      cut.step = 2; lyron.goal = null; lyron.busy = true; lyron.faceTo(p.x, p.y); p.faceTo(lyron.x, lyron.y); ctx.S.talking = lyron;
      ctx.setMode('dialog');
      ctx.openDialog({
        m: ctx.FRIEND, pages: S.pages(!!ally), onClose: () => {
          ctx.S.talking = null; const st = ctx.story(); st.rescued = true; st.act = 4; ctx.persist(); ctx.achieve('rescue');
          B.phase = 'done'; ctx.setMode('play');
          ctx.finale({ title: S.endTitle, body: S.endBody });
        }
      });
    }
  }
}

// ---------------------------------------------------------------- the system
export const trench = {
  id: 'trench',

  onZoneEnter(ctx) {
    CTX = ctx; live = !!(ctx.S.map && ctx.S.map.trench);
    o2 = O2_MAX; surfacing = false; immT = 0; bubT = 0; pillars = []; sharks = []; searched = new Set(); ally = null; boss = null; trapped = null; whirl = null; inkT = 0; stunT = 0; fx = []; rings = []; marks = []; lyron = null; cut = null;
    if (!live) return;
    const m = ctx.S.map, st = stats(ctx); st.dives++;
    applyDiver(ctx);
    // arena vents: the fight needs air too (the maze vents are too far)
    const a = m.arena; if (a && !m.objects.some(o => o.vent && o.y < 16)) for (const k of [0.12, 0.38, 0.62, 0.88]) { const vx = Math.round(a.x + a.w * k), vy = a.y + a.h - 2; if (!ctx.hasObjectAt(m, vx, vy)) ctx.place(m, 'vent', vx, vy, { vent: true }); }
    vents = m.objects.filter(o => o.vent); crystals = m.objects.filter(o => o.type === 'gcrystal'); cageObj = m.objects.find(o => o.cage) || null;
    if (ctx.story().rescued && cageObj) { ctx.removeObject(m, cageObj); cageObj = null; }          // Lyron is home: the cage is gone
    buildPillars(ctx); buildSharks(ctx); spawnAlly(ctx);
    ctx.persist();
    if (typeof window !== 'undefined') window.__trench = {
      state: () => ({ live, o2: +o2.toFixed(1), ally: ally && { key: ally.key, x: Math.round(ally.x), y: Math.round(ally.y), cd: ally.cd.map(c => +Math.max(0, c).toFixed(1)), shield: +Math.max(0, ally.shieldT).toFixed(1) },
        boss: boss && { phase: boss.phase, t: +boss.t.toFixed(1), skill: boss.cur && boss.cur.name, skillPhase: boss.cur && boss.cur.phase, skillT: +boss.skillT.toFixed(1), tents: boss.tents.map(t => ({ st: t.st, hp: t.hp, x: Math.round(t.x), y: Math.round(t.y) })), headHp: boss.headHp, head: [Math.round(boss.head.x), Math.round(boss.head.y)], rematch: boss.rematch },
        pillars: pillars.map(p => ({ x: p.x, y: p.y, w: p.w, h: p.h, st: p.st, hp: p.hp, squeeze: p.squeeze })), sharks: sharks.map(s => ({ x: Math.round(s.x), y: Math.round(s.y), st: s.st })),
        trapped: trapped && { t: +trapped.t.toFixed(1), mash: trapped.mash }, whirl: whirl && +whirl.t.toFixed(1), ink: +inkT.toFixed(1), stun: +stunT.toFixed(1), immT: +immT.toFixed(1), mode: ctx.S.mode, lyron: lyron && { x: Math.round(lyron.x), y: Math.round(lyron.y) }, cage: !!cageObj, cut: cut && { step: cut.step, t: +cut.t.toFixed(1) }, player: [Math.round(ctx.S.player.x), Math.round(ctx.S.player.y)], story: JSON.parse(JSON.stringify(ctx.story())) }),
      warpArena: () => { const a = CTX.S.map.arena, p = CTX.S.player; p.x = (a.x + a.w / 2) * TILE; p.y = (a.y + a.h - 1) * TILE + 12; return [p.x, p.y]; },
      giveAlly: (key = 'Vietnamese') => { const sv = CTX.S.save; sv.sys = sv.sys || {}; sv.sys.rocky = sv.sys.rocky || {}; (sv.sys.rocky.tamed ||= {})[key] = (sv.sys.rocky.tamed[key] || 0) + 1; CTX.persist(); spawnAlly(CTX); return ally && ally.key; },
      killTents: (n = 1) => { if (!boss) return 'no boss'; let k = 0; for (const t of boss.tents) { if (k >= n) break; if (t.st !== 'dead') { t.hp = 1; strike(CTX, t, 1, true); k++; } } return liveTents().length; },
      skill: n => { if (ally) ally.cd[n - 1] = 0; return useSkill(CTX, n, true); },
      win: () => { if (!boss) return 'no boss'; for (const t of boss.tents) if (t.st !== 'dead') { t.hp = 1; strike(CTX, t, 1, true); } if (boss.phase === 'thrash') boss.thrashT = 0; boss.headHp = 0; if (boss.phase !== 'win' && boss.phase !== 'done') winBoss(CTX); return boss.phase; },
      o2: s => { o2 = Math.max(0, Math.min(O2_MAX, s)); return o2; },
      bossSkill: name => { if (!boss) return 'no boss'; boss.forced = name; boss.cur = null; boss.skillT = 0.1; return name; },
      cutPillar: i => { const p = pillars[i]; if (p) { p.st = 'withdraw'; p.t = 0; } return !!p; },
      pillarsOff: () => { for (const p of pillars) p.st = 'gone'; return pillars.length; }
    };
  },

  onZoneLeave(ctx) {
    if (!live) return;
    restoreDiver(ctx); ctx.alert(''); ctx.hazardsOff(false);
    if (ctx.S.mode === 'cutscene') ctx.setMode('play');
    live = false; boss = null; ally = null; trapped = null; whirl = null; lyron = null; cut = null; fx = []; rings = []; marks = [];
  },

  update(dt, ctx) {
    if (!live) return;
    CTX = ctx; updateFx(dt);
    const p = ctx.S.player, playing = ctx.S.mode === 'play';
    if (p.custom === null && playing && !surfacing) applyDiver(ctx);                       // another system (photo) may have cleared the look
    if (immT > 0) immT -= dt;
    if (inkT > 0) inkT -= dt;
    // oxygen
    if (playing && !surfacing) {
      const nearVent = vents.some(v => Math.hypot(v.x * TILE + 8 - p.x, v.y * TILE + 8 - (p.y - 4)) <= VENT_R);
      if (nearVent) o2 = Math.min(O2_MAX, o2 + VENT_RATE * dt); else o2 -= dt;
      if (o2 <= 0) { o2 = 0; surface(ctx); return; }
      bubT -= dt; if (bubT <= 0) { bubT = rand(0.5, 1.1); bubble(p.x + 2, p.y - 20, 1, 25); }
    }
    // vent bubbles
    for (const v of vents) { const sx = v.x * TILE + 8 - ctx.cam?.cx, sy = v.y * TILE + 6 - ctx.cam?.cy; if (ctx.cam && (sx < -20 || sy < -20 || sx > ctx.VW + 20 || sy > ctx.VH + 20)) continue; if (Math.random() < dt * 4) bubble(v.x * TILE + 8, v.y * TILE + 6, 1, 35); }
    // trapped: the player cannot move
    p.speedMul = trapped ? 0 : SPEED;
    // pillars
    for (const q of pillars) { q.ft += dt; if (q.hitCd > 0) q.hitCd -= dt; if (q.st === 'withdraw') { q.t += dt; if (q.t >= 2) q.st = 'gone'; } }
    if (playing) updateSharks(dt, ctx);
    if (ally) updateAlly(dt, ctx);
    // the boss
    if (!boss && playing && inArena(ctx, p.x, p.y - 3)) { const st = ctx.story(); startBoss(ctx, !!st.rescued); }
    if (boss && boss.phase === 'done' && playing && !inArena(ctx, p.x, p.y - 3) && ctx.story().rescued) boss = null;   // out of the arena → a rematch is possible next time
    if (boss && (playing || (boss.phase === 'win' && ctx.S.mode === 'cutscene'))) updateBoss(dt, ctx);
    if (boss && boss.phase === 'win' && ctx.S.mode === 'dialog') updateWin(dt, ctx);
  },

  near(ctx) {
    if (!live) return null;
    const S = L(ctx), p = ctx.S.player;
    if (trapped) return { label: S.pop(trapped.mash), x: p.x, y: p.y, limit: 999, priority: 4, data: { pop: true } };
    if (whirl) return { label: S.resist, x: p.x, y: p.y, limit: 999, priority: 3, data: { resist: true } };
    if (boss && (boss.phase === 'fight' || boss.phase === 'thrash')) {
      let best = null, bd = Infinity;
      for (const t of boss.tents) { if (t.st === 'dead' || t.rise < 0.8) continue; const d = Math.hypot(t.x - p.x, t.y - 8 - p.y); if (d <= STRIKE_R && d < bd) { bd = d; best = t; } }
      if (best) return { label: S.strike, x: best.x, y: best.y - 8, limit: STRIKE_R, priority: 2, data: { tent: best } };
    }
    let best = null, bd = Infinity;
    for (const q of pillars) { if (q.st !== 'block') continue; const d = Math.hypot(q.cx - p.x, q.cy - p.y); if (d <= PILLAR_REACH && d < bd) { bd = d; best = q; } }
    if (best) { const tier = ctx.tool.tier('knife'); const label = tier >= 1 ? S.cut(Math.ceil(best.hp / tier)) : S.squeeze(best.squeeze); return { label, x: best.cx, y: best.cy, limit: PILLAR_REACH, priority: 1, data: { pillar: best, tier } }; }
    for (const o of ctx.S.map.objects) { if (!(o.wreck && o.trench) || searched.has(`${o.x},${o.y}`)) continue; const d = ctx.O[o.type], x = (o.x + d.fw / 2) * TILE, y = (o.y + d.fh) * TILE; const dd = Math.hypot(x - p.x, y - p.y); if (dd <= 30) return { label: S.search, x, y, limit: 30, data: { wreck: o } }; }
    if (lyron && ctx.S.npcs.includes(lyron) && boss && boss.phase === 'done') { const d = Math.hypot(lyron.x - p.x, lyron.y - p.y); if (d <= 26) return { label: S.talk, x: lyron.x, y: lyron.y, limit: 26, data: { lyron: true } }; }
    return null;
  },

  interact(ctx, cand) {
    const S = L(ctx), d = cand && cand.data; if (!d) return;
    if (d.pop) { trapped.mash++; bubble(ctx.S.player.x, ctx.S.player.y - 10, 2, 30); if (trapped.mash >= BUBBLE_MASH) popBubble(ctx, false); return; }
    if (d.resist) { const p = ctx.S.player, h = boss ? boss.head : { x: p.x, y: p.y - 40 }; knock(ctx, h.x, h.y, 12); bubble(p.x, p.y - 12, 2, 30); return; }
    if (d.tent) { strike(ctx, d.tent, 1, false); return; }
    if (d.pillar) {
      const q = d.pillar; if (q.st !== 'block') return;
      if (d.tier >= 1) { if (q.hitCd > 0) return; q.hitCd = 0.3; q.hp -= d.tier; ctx.sfx('hit'); ink(q.cx, q.cy - 6, 6); ctx.S.player.faceTo(q.cx, q.cy); if (q.hp <= 0) { q.st = 'withdraw'; q.t = 0; ink(q.cx, q.cy - 6, 14); ctx.toast(S.cutDone); } }
      else { q.squeeze++; bubble(ctx.S.player.x, ctx.S.player.y - 12, 2, 30); if (q.squeeze >= SQUEEZE_N) { q.st = 'withdraw'; q.t = 0; ctx.sfx('squeak'); ctx.toast(S.squeezed); } }
      return;
    }
    if (d.wreck) { searchWreck(ctx, d.wreck); return; }
    if (d.lyron) { ctx.S.talking = lyron; ctx.setMode('dialog'); ctx.openDialog({ m: ctx.FRIEND, pages: [S.after], onClose: () => { ctx.S.talking = null; ctx.setMode('play'); } }); }
  },

  key(code, ctx) {
    if (!live || ctx.S.mode !== 'play' || !ally) return false;
    const n = code === 'Digit1' || code === 'Numpad1' ? 1 : code === 'Digit2' || code === 'Numpad2' ? 2 : code === 'Digit3' || code === 'Numpad3' ? 3 : 0;
    if (!n) return false;
    useSkill(ctx, n, false); return true;
  },

  hudLines(ctx) {
    if (!live) return [];
    const S = L(ctx), out = [S.o2(Math.ceil(o2))];
    if (boss && (boss.phase === 'fight' || boss.phase === 'thrash' || boss.phase === 'intro')) { let s = S.bossHud(liveTents().length, N_TENTS); if (ally) s += ' · ' + S.headHud(boss.headHp); out.push(s); }
    return out;
  },

  drawables(ctx, cx, cy) {
    if (!live) return [];
    const out = [], g = ctx.g, VW = ctx.VW, VH = ctx.VH, vis = (x, y, m = 40) => x - cx > -m && y - cy > -m && x - cx < VW + m && y - cy < VH + m;
    for (const q of pillars) {
      if (q.st === 'gone' || !vis(q.cx, q.cy, 60)) continue;
      const vert = q.h > q.w, img = vert ? SPR.coilV : SPR.coilH, k = q.st === 'withdraw' ? Math.max(0, 1 - q.t / 1.2) : 1;
      out.push({ y: (q.y + q.h) * TILE, f: () => {
        const sway = Math.round(Math.sin(q.ft * 2) * 1), bx = q.x * TILE - cx, by = (q.y + q.h) * TILE - cy;
        g.save(); g.globalAlpha = 0.35 + k * 0.65;
        if (vert) { const hh = Math.max(1, Math.round(img.height * k)); g.drawImage(img, 0, img.height - hh, 16, hh, bx + sway, by - hh, 16, hh); }
        else { const ww = Math.max(1, Math.round(img.width * k)); g.drawImage(img, 0, 0, ww, img.height, bx, by - img.height + 4 + sway, ww, img.height); }
        g.restore();
        if (q.st === 'block' && q.hp < PILLAR_HP) for (let i = 0; i < PILLAR_HP; i++) { g.fillStyle = i < q.hp ? '#e6b8ef' : 'rgba(40,20,60,.7)'; g.fillRect(Math.round(q.cx - cx) - 5 + i * 4, Math.round(q.cy - cy) - (vert ? 34 : 18), 3, 2); }
      } });
    }
    for (const s of sharks) {
      if (!vis(s.x, s.y)) continue;
      out.push({ y: s.y + 4, f: () => { const img = SPR.shark[Math.floor(s.ft * 5) % 2][s.face > 0 ? 0 : 1]; g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(Math.round(s.x - cx), Math.round(s.y - cy) + 5, 10, 3, 0, 0, TAU); g.fill(); g.drawImage(img, Math.round(s.x - cx) - 12, Math.round(s.y - cy) - 5); } });
    }
    if (ally) {
      const a = ally, lx = a.lunge ? a.lunge.x : a.x, ly = a.lunge ? a.lunge.y : a.y, lk = a.lunge ? Math.sin((1 - a.lunge.t / 0.5) * Math.PI) : 0;
      const ax = a.x + (lx - a.x) * lk, ay = a.y + (ly - a.y) * lk, hop = a.lunge ? Math.round(lk * 16) : (a.moving ? Math.round(Math.abs(Math.sin(ctx.S.time * 7)) * 2) : 0) - (a.poundT > 0 ? 4 : 0);
      if (vis(ax, ay, 100)) out.push({ y: ay + 0.5, f: () => {
        const sx = Math.round(ax - cx), sy = Math.round(ay - cy);
        g.fillStyle = 'rgba(0,0,0,.3)'; g.beginPath(); g.ellipse(sx, sy + 1, 20, 6, 0, 0, TAU); g.fill();
        const pl = ctx.S.player, px_ = Math.round(pl.x - cx), py_ = Math.round(pl.y - cy), covers = px_ > sx - (a.w >> 1) - 6 && px_ < sx + (a.w >> 1) + 6 && py_ - 18 < sy + 2 - hop && py_ > sy - a.h - hop && pl.y < ay;
        g.save(); if (covers) g.globalAlpha = 0.4; if (a.dir < 0) { g.translate(sx, 0); g.scale(-1, 1); g.translate(-sx, 0); }
        g.drawImage(a.img, sx - (a.w >> 1), sy - a.h + 2 - hop, a.w, a.h); g.restore();
        if (a.shieldT > 0) { g.strokeStyle = 'rgba(210,210,230,.6)'; g.lineWidth = 1; g.beginPath(); g.arc(Math.round(ctx.S.player.x - cx), Math.round(ctx.S.player.y - cy) - 8, 13 + Math.sin(ctx.S.time * 6), 0, TAU); g.stroke(); }
      } });
    }
    if (boss) {
      const B = boss;
      for (const t of B.tents) {
        if (t.rise <= 0 || t.st === 'dead' || !vis(t.x, t.y, 70)) continue;
        out.push({ y: t.y, f: () => {
          const fr = t.st === 'wind' ? 2 : t.st === 'lash' ? 3 : (Math.floor(t.ft * (stunT > 0 ? 0.6 : 2.5)) % 2), img = SPR.tent[fr][t.x < B.head.x ? 0 : 1];
          const sh = Math.max(1, Math.round(64 * t.rise)), sx = Math.round(t.x - cx), sy = Math.round(t.y - cy);
          g.fillStyle = 'rgba(0,0,0,.3)'; g.beginPath(); g.ellipse(sx, sy, 12, 4, 0, 0, TAU); g.fill();
          g.drawImage(img, 0, 64 - sh, 32, sh, sx - 16, sy - sh + 3, 32, sh);
          if (stunT > 0 && t.rise >= 1) { for (let i = 0; i < 3; i++) { const a = ctx.S.time * 5 + i * TAU / 3; g.fillStyle = '#ffd45e'; g.fillRect(sx + Math.round(Math.cos(a) * 9) - 1, sy - 62 + Math.round(Math.sin(a) * 3) - 1, 2, 2); } }
          if (t.hp < TENT_HP && t.rise >= 1) for (let i = 0; i < TENT_HP; i++) { g.fillStyle = i < t.hp ? '#e6b8ef' : 'rgba(40,20,60,.7)'; g.fillRect(sx - 5 + i * 4, sy - 70, 3, 2); }
        } });
      }
      const h = B.head;
      if (h.rise > 0 && h.alpha > 0 && vis(h.x, h.y, 80)) out.push({ y: h.y + 4, f: () => {
        const sh = Math.max(1, Math.round(48 * h.rise)), sx = Math.round(h.x - cx), sy = Math.round(h.y - cy), tell = h.tell > 0 ? Math.round(Math.sin(ctx.S.time * 30)) : 0;
        g.save(); g.globalAlpha = h.alpha;
        g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.ellipse(sx, sy + 2, 30, 8, 0, 0, TAU); g.fill();
        g.drawImage(SPR.head, 0, 48 - sh, 64, sh, sx - 32 + tell, sy + 4 - sh, 64, sh);
        if (h.rise >= 1) { const gl = 0.25 + 0.2 * Math.sin(ctx.S.time * 4) + (h.tell > 0 ? 0.35 : 0); g.globalCompositeOperation = 'lighter'; for (const ex of [-12, 12]) { const gr = g.createRadialGradient(sx + ex, sy - 24, 1, sx + ex, sy - 24, 12); gr.addColorStop(0, `rgba(255,212,94,${gl.toFixed(2)})`); gr.addColorStop(1, 'rgba(255,212,94,0)'); g.fillStyle = gr; g.fillRect(sx + ex - 12, sy - 36, 24, 24); } }
        g.restore();
        if (ally && B.headHp < HEAD_HP) for (let i = 0; i < HEAD_HP; i++) { g.fillStyle = i < B.headHp ? '#ffd45e' : 'rgba(40,20,60,.7)'; g.fillRect(sx - 8 + i * 6, sy - 54, 4, 3); }
      } });
    }
    return out;
  },

  // overlays on the pixel canvas: skill tells, particles, then the darkness with its light holes
  draw(g, ctx, cx, cy) {
    if (!live) return;
    const p = ctx.S.player, VW = ctx.VW, VH = ctx.VH, t = ctx.S.time;
    // slam markers (a growing shadow on the target tile), the sweep band, the whirl, the bubble prison
    for (const mk of marks) { const k = Math.min(1, mk.t / (mk.life - 0.35)); g.fillStyle = `rgba(40,10,60,${(0.25 + k * 0.45).toFixed(2)})`; g.beginPath(); g.ellipse(Math.round(mk.x - cx), Math.round(mk.y - cy), 4 + k * 8, 3 + k * 5, 0, 0, TAU); g.fill(); if (k >= 1) { g.strokeStyle = 'rgba(255,120,120,.8)'; g.lineWidth = 1; g.strokeRect(Math.round(mk.x - cx) - 8, Math.round(mk.y - cy) - 8, 16, 16); } }
    if (boss && boss.cur && boss.cur.name === 'sweep') {
      const c = boss.cur, y0 = Math.round(c.y0 - cy);
      g.fillStyle = c.phase === 'tell' ? `rgba(160,60,200,${(0.18 + 0.12 * Math.sin(t * 20)).toFixed(2)})` : 'rgba(160,60,200,.14)'; g.fillRect(Math.round(c.x0 - cx), y0, c.x1 - c.x0, 32);
      if (c.phase === 'run') { const fx_ = Math.round(c.fx - cx); g.fillStyle = 'rgba(74,42,106,.85)'; g.fillRect(fx_ - 6, y0, 12, 32); g.fillStyle = '#e6b8ef'; for (let y = 2; y < 32; y += 6) g.fillRect(fx_ - 2, y0 + y, 2, 2); const img = SPR.tent[3][c.dirX > 0 ? 1 : 0]; g.drawImage(img, fx_ - 16, y0 - 40, 32, 64); }
    }
    if (whirl && boss) { const h = boss.head; for (let i = 0; i < 18; i++) { const a = t * 4 + i * TAU / 18, r = 30 + ((i * 37 + t * 60) % 90); g.fillStyle = 'rgba(200,230,255,.55)'; g.fillRect(Math.round(h.x + Math.cos(a) * r * 1.6 - cx), Math.round(h.y + 10 + Math.sin(a) * r * 0.7 - cy), 2, 1); } }
    if (trapped) { const sx = Math.round(p.x - cx), sy = Math.round(p.y - cy) - 9, r = 13 + Math.sin(t * 9) * 0.8; g.fillStyle = 'rgba(180,230,255,.28)'; g.beginPath(); g.arc(sx, sy, r, 0, TAU); g.fill(); g.strokeStyle = 'rgba(230,248,255,.9)'; g.lineWidth = 1; g.beginPath(); g.arc(sx, sy, r, 0, TAU); g.stroke(); g.fillStyle = 'rgba(255,255,255,.8)'; g.fillRect(sx - 7, sy - 8, 3, 1); g.fillRect(sx - 9, sy - 6, 1, 3); }
    // particles
    for (const r of rings) { const k = r.t / r.life; g.strokeStyle = `rgba(${r.c},${(1 - k).toFixed(2)})`; g.lineWidth = 1; g.beginPath(); g.ellipse(Math.round(r.x - cx), Math.round(r.y - cy), r.r + (r.r1 - r.r) * k, (r.r + (r.r1 - r.r) * k) * 0.6, 0, 0, TAU); g.stroke(); }
    for (const q of fx) { const k = 1 - q.t / q.life; g.globalAlpha = q.blob ? Math.min(1, k * 1.5) : Math.min(1, k * 2); g.fillStyle = q.c; if (q.blob) { g.beginPath(); g.arc(Math.round(q.x - cx), Math.round(q.y - cy), q.r, 0, TAU); g.fill(); } else g.fillRect(Math.round(q.x - cx), Math.round(q.y - cy), q.r, q.r); }
    g.globalAlpha = 1;
    // darkness with light holes
    if (!darkCv || darkCv.width !== VW || darkCv.height !== VH) { darkCv = mkCanvas(VW, VH); }
    const d = darkCv.getContext('2d'), inky = inkT > 0 && !(ally && ally.shieldT > 0);
    d.globalCompositeOperation = 'source-over'; d.clearRect(0, 0, VW, VH);
    d.fillStyle = inky ? `rgba(4,6,20,${(0.72 + 0.24 * Math.min(1, inkT / 0.3, (INK_T - inkT) / 0.3 + 1)).toFixed(2)})` : 'rgba(4,6,20,.72)'; d.fillRect(0, 0, VW, VH);
    d.globalCompositeOperation = 'destination-out';
    const hole = (x, y, r, soft = 0.55) => { const sx = x - cx, sy = y - cy; if (sx < -r || sy < -r || sx > VW + r || sy > VH + r) return; const gr = d.createRadialGradient(sx, sy, r * 0.15, sx, sy, r); gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(soft, 'rgba(0,0,0,.85)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); d.fillStyle = gr; d.fillRect(sx - r, sy - r, r * 2, r * 2); };
    for (const c of crystals) hole((c.x + 1) * TILE, c.y * TILE + 14, CRYSTAL_R, 0.5);
    if (!inky) {
      hole(p.x, p.y - 10, ctx.bag.has('greatcrystal') ? LAMP_R_BIG : LAMP_R);
      for (const v of vents) hole(v.x * TILE + 8, v.y * TILE + 8, VENT_LIGHT, 0.4);
      if (cageObj && ctx.S.map.objects.includes(cageObj)) hole((cageObj.x + 1) * TILE, (cageObj.y + 1) * TILE + 4, CAGE_R);
      if (ally) hole(ally.x, ally.y - 40, ALLY_R, 0.4);
    }
    g.drawImage(darkCv, 0, 0);
    // the ink cloud itself: drifting dark blobs
    if (inky) { g.fillStyle = 'rgba(20,8,40,.35)'; for (let i = 0; i < 14; i++) { const a = t * 0.7 + i * 1.7; g.beginPath(); g.arc(VW / 2 + Math.cos(a) * VW * 0.4, VH / 2 + Math.sin(a * 1.3) * VH * 0.4, 18 + (i % 4) * 8, 0, TAU); g.fill(); } }
  },

  drawUI(ug, ctx, cx, cy, scale) {
    if (!live) return;
    const S = L(ctx), W = ug.canvas.width, H = ug.canvas.height, t = ctx.S.time, font = (s, b) => `${b ? 'bold ' : ''}${s}px "Segoe UI",system-ui,sans-serif`;
    ug.save(); ug.textAlign = 'center'; ug.textBaseline = 'middle';
    // oxygen bar (top centre, clear of the toast)
    const bw = Math.max(170, Math.min(340, Math.round(W * 0.3))), bh = Math.max(14, Math.round(scale * 5)), bx = Math.round((W - bw) / 2), by = Math.min(Math.max(122, Math.round(H * 0.17)), Math.max(60, H - 90));
    const k = Math.max(0, Math.min(1, o2 / O2_MAX));
    ug.fillStyle = 'rgba(13,11,20,.78)'; ug.beginPath(); ug.roundRect(bx, by, bw, bh, 5); ug.fill();
    ug.fillStyle = k > 0.5 ? 'rgba(92,214,255,.55)' : k > 0.25 ? 'rgba(255,179,71,.6)' : `rgba(255,77,77,${(0.5 + 0.25 * Math.sin(t * 8)).toFixed(2)})`;
    ug.beginPath(); ug.roundRect(bx + 2, by + 2, Math.max(0, (bw - 4) * k), bh - 4, 4); ug.fill();
    ug.strokeStyle = '#8fd3ff'; ug.lineWidth = 1; ug.beginPath(); ug.roundRect(bx + .5, by + .5, bw - 1, bh - 1, 5); ug.stroke();
    ug.fillStyle = '#fff'; ug.font = font(Math.max(11, Math.round(scale * 3.3)), true); ug.fillText(`${S.air} · ${Math.ceil(o2)}s`, bx + bw / 2, by + bh / 2 + 1);
    // the ally: name label + skill buttons (top right)
    if (ally) {
      const a = ally, sx = Math.round((a.x - cx) * scale), sy = Math.round((a.y + 12 - cy) * scale), fs = Math.max(10, scale * 3);
      ug.font = font(fs, true); const txt = S.ally(a.name), tw = ug.measureText(txt).width + 8;
      if (sx > -100 && sx < W + 100 && sy > -20 && sy < H + 20) { ug.fillStyle = 'rgba(13,11,20,.6)'; ug.beginPath(); ug.roundRect(sx - tw / 2, sy - fs - 2, tw, fs + 4, 3); ug.fill(); ug.fillStyle = '#ffd45e'; ug.fillText(txt, sx, sy); }
      const kw = Math.max(92, Math.round(scale * 34)), kh = Math.max(30, Math.round(scale * 11)), gap = 6, x0 = W - 12 - kw, y0 = Math.max(96, Math.round(H * 0.14));
      ug.font = font(Math.max(9, Math.round(scale * 2.6)), false); ug.fillStyle = '#cfd8e6'; ug.textAlign = 'right'; ug.fillText(S.skillHint, W - 12, y0 - 10);
      ug.textAlign = 'center';
      for (let i = 0; i < 3; i++) {
        const y = y0 + i * (kh + gap), cd = Math.max(0, a.cd[i]), ready = cd <= 0, on = (i === 1 && a.shieldT > 0) || (i === 0 && a.poundT > 0);
        ug.fillStyle = ready ? 'rgba(13,11,20,.8)' : 'rgba(13,11,20,.55)'; ug.beginPath(); ug.roundRect(x0, y, kw, kh, 6); ug.fill();
        if (!ready) { ug.fillStyle = 'rgba(255,212,94,.18)'; ug.beginPath(); ug.roundRect(x0, y, kw * (1 - cd / CD[i]), kh, 6); ug.fill(); }
        ug.strokeStyle = on ? '#8fe08a' : ready ? '#ffd45e' : 'rgba(255,212,94,.35)'; ug.lineWidth = on ? 2 : 1; ug.beginPath(); ug.roundRect(x0 + .5, y + .5, kw - 1, kh - 1, 6); ug.stroke();
        ug.fillStyle = ready ? '#ffd45e' : '#8d8d98'; ug.font = font(Math.max(10, Math.round(scale * 3.2)), true); ug.fillText(`${i + 1} · ${S.skills[i]}`, x0 + kw / 2, y + kh * 0.36);
        ug.fillStyle = ready ? '#8fe08a' : '#cfd8e6'; ug.font = font(Math.max(9, Math.round(scale * 2.6)), false); ug.fillText(ready ? S.ready : `${Math.ceil(cd)}s`, x0 + kw / 2, y + kh * 0.74);
      }
    }
    // mash prompt over the player
    if (trapped || whirl) { const sx = Math.round((ctx.S.player.x - cx) * scale), sy = Math.round((ctx.S.player.y - 30 - cy) * scale), fs = Math.max(11, scale * 3.6); ug.font = font(fs, true); ug.fillStyle = 'rgba(13,11,20,.7)'; ug.beginPath(); ug.roundRect(sx - fs * 2.4, sy - fs * 0.8, fs * 4.8, fs * 1.6, 4); ug.fill(); ug.fillStyle = Math.floor(t * 6) % 2 ? '#ffd45e' : '#fff'; ug.fillText(trapped ? `${S.mash} ${trapped.mash}/${BUBBLE_MASH}` : S.mash, sx, sy); }
    ug.restore();
  }
};
