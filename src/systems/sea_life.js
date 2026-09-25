// sea_life.js — life on the Sea of Origins: castaways clinging to driftwood, message bottles from real artists,
// the whale you can ride, and the hermit's buoy race. Everyone here is a real member of the roster. See systems/API.md.
import { mkCanvas, HOOK } from '../gfx.js';

// ---------------------------------------------------------------- strings
const STR = {
  en: {
    pull: 'Pull aboard', full: 'The raft is full (2 castaways) — drop them at the harbour pier, then come back', aboard: n => `${n} climbs onto the raft`,
    saved: n => `Rescued ${n}! +3 🪨`, thanks: (nat, i) => `You pulled me out of the sea! I'm from ${nat}. I've posted ${i} artworks in #artwork — come see them some day. Take these stones, captain.`,
    thanksNoNat: i => `You pulled me out of the sea! I've posted ${i} artworks in #artwork — come see them some day. Take these stones, captain.`,
    bottle: 'Message in a bottle', bottleTitle: '🍾 A message in a bottle', bottleGot: 'Bottle +1',
    note: (name, nat, i, r, f) => `"${name}" wrote this note.${nat ? ` From ${nat}.` : ''} ${i} artworks, ${r} reactions${f ? `, first post ${f}` : ''}.`,
    hint: (dir, d, x, y) => `P.S. I buried something at the reef ${dir} of the lighthouse, about ${d} tiles out (${x}, ${y}). Dive there.`,
    whaleNear: 'A whale surfaces!', ride: 'Ride the whale', dives: 'The whale dives!', riding: '🐋 riding',
    hermit: 'Talk to the hermit', giveUp: 'Give up the race', raceTitle: '🏁 The buoy race',
    raceIntro: ['Ha! A visitor on a raft. I have lived on this island longer than the lighthouse has stood.', 'See the six buoys out there? Sail past them in order — 1 to 6 — and I time you. Under 150 seconds and you earn the title of Captain.'],
    raceRecord: t => `Your best so far: ${t}s. Think you can beat it?`, raceNoRecord: 'Nobody has finished the loop yet. Will you be the first?',
    start: 'Start the race', later: 'Later', raceGo: 'GO! Buoy 1', check: n => `Buoy ${n} ✓`, next: n => `→ buoy ${n}`,
    finish: t => `Finished in ${t}s`, newBest: 'New record!', captain: '🏆 Captain! +5 🪨 · a card from the hermit', notCaptain: 'Under 150 s for the Captain title', gaveUp: 'Race abandoned',
    hud: (n, t) => `🏁 buoy ${n}/6 · ${t}s`, timer: 'TIME', buoyLbl: n => `Buoy ${n}`
  },
  vi: {
    pull: 'Kéo lên bè', full: 'Bè đầy rồi (2 người) — đưa họ về bến cảng rồi quay lại', aboard: n => `${n} leo lên bè`,
    saved: n => `Đã cứu ${n}! +3 🪨`, thanks: (nat, i) => `Bạn kéo mình ra khỏi biển rồi! Mình đến từ ${nat}. Mình đã đăng ${i} bức ở #artwork — hôm nào ghé xem nhé. Nhận mấy viên đá này đi, thuyền trưởng.`,
    thanksNoNat: i => `Bạn kéo mình ra khỏi biển rồi! Mình đã đăng ${i} bức ở #artwork — hôm nào ghé xem nhé. Nhận mấy viên đá này đi, thuyền trưởng.`,
    bottle: 'Thư trong chai', bottleTitle: '🍾 Thư trong chai', bottleGot: 'Chai +1',
    note: (name, nat, i, r, f) => `"${name}" viết lá thư này.${nat ? ` Đến từ ${nat}.` : ''} ${i} bức tranh, ${r} lượt thả cảm xúc${f ? `, đăng lần đầu ${f}` : ''}.`,
    hint: (dir, d, x, y) => `T.B. Mình chôn một thứ ở rạn san hô phía ${dir} hải đăng, cách chừng ${d} ô (${x}, ${y}). Lặn xuống đó nhé.`,
    whaleNear: 'Cá voi nổi lên!', ride: 'Cưỡi cá voi', dives: 'Cá voi lặn rồi!', riding: '🐋 đang cưỡi',
    hermit: 'Nói chuyện với ẩn sĩ', giveUp: 'Bỏ cuộc đua', raceTitle: '🏁 Đua phao',
    raceIntro: ['Ha! Khách đi bè. Tôi sống trên đảo này từ trước khi có hải đăng.', 'Thấy sáu cái phao ngoài kia không? Lái qua đủ theo thứ tự 1 tới 6, tôi bấm giờ. Dưới 150 giây là được phong Thuyền trưởng.'],
    raceRecord: t => `Kỷ lục của bạn: ${t}s. Phá được không?`, raceNoRecord: 'Chưa ai chạy hết vòng này. Bạn làm người đầu tiên chứ?',
    start: 'Bắt đầu đua', later: 'Để sau', raceGo: 'CHẠY! Phao 1', check: n => `Phao ${n} ✓`, next: n => `→ phao ${n}`,
    finish: t => `Về đích sau ${t}s`, newBest: 'Kỷ lục mới!', captain: '🏆 Thuyền trưởng! +5 🪨 · thẻ từ ẩn sĩ', notCaptain: 'Dưới 150 s mới được phong Thuyền trưởng', gaveUp: 'Đã bỏ cuộc',
    hud: (n, t) => `🏁 phao ${n}/6 · ${t}s`, timer: 'GIỜ', buoyLbl: n => `Phao ${n}`
  }
};
const L = ctx => STR[ctx.lang() === 'vi' ? 'vi' : 'en'];

// ---------------------------------------------------------------- sprites (built once)
const TILE = 16, TAU = Math.PI * 2, OUT = '#1c1a24';
const px = (g, x, y, c, w = 1, h = 1) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
function flip(src) { const c = mkCanvas(src.width, src.height), g = c.getContext('2d'); g.translate(src.width, 0); g.scale(-1, 1); g.drawImage(src, 0, 0); return c; }

// the whale: 64×32, facing right. f = tail frame (0 down, 1 up)
function whaleArt(g, f) {
  const B = '#3f6b95', B2 = '#2f5378', BL = '#a9cbe6', BL2 = '#8fb6d6';
  const cx = 38, cy = 19, rx = 24, ry = 10;
  for (let y = 0; y < 32; y++) for (let x = 10; x < 64; x++) {          // body: shaded ellipse, flatter belly
    const k = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2;
    if (k > 1) continue;
    const belly = y > cy + 3;
    px(g, x, y, k > 0.82 ? OUT : belly ? (y > cy + 6 ? BL : BL2) : (y < cy - 5 ? B2 : B));
  }
  const ty = f ? cy - 8 : cy + 5;                                        // fluke tip: raised or slapped down
  for (let x = 21; x >= 2; x--) {                                        // tail: stock narrows from the body, then the fluke fans out, one connected curve
    const k = (21 - x) / 19, yc = cy + (ty - cy) * k * k, h = x > 11 ? 3.5 - (21 - x) * 0.22 : 1.2 + (11 - x) * 0.55;
    for (let y = -h; y <= h; y++) px(g, x, Math.round(yc + y), Math.abs(y) > h - 1 ? OUT : B2);
  }
  px(g, 34, 22, OUT, 12, 6); px(g, 35, 23, B2, 10, 4);                   // pectoral fin
  px(g, 54, 15, '#fff', 3, 3); px(g, 55, 16, OUT, 1, 1);                // eye
  px(g, 50, 24, OUT, 10, 1);                                            // mouth
  for (let i = 0; i < 6; i++) px(g, 41 + i * 3, 25 + (i % 2), '#7ea3c6', 2, 1); // throat grooves
  px(g, 44, 9, OUT, 3, 2); px(g, 45, 9, '#557d9f', 1, 1);               // blowhole
}
function build(w, h, fn) { return [0, 1].map(f => { const c = mkCanvas(w, h); fn(c.getContext('2d'), f); return [c, flip(c)]; }); } // [frame][0=right,1=left]
const WHALE = HOOK.creature('whale', build(64, 32, whaleArt));
const WW = 128, WH = 64;   /* cỡ vẽ cá voi (logic px) = cỡ ảnh PixelLab gốc; bản code 64×32 phóng ×2 */
const WL = 0.62;           /* mép nước cắt thân ở 62 % chiều cao từ đỉnh: phần dưới chìm (vẽ mờ + phủ xanh), khỏi trông như đang bay */
function drawWhaleBody(g, img, x, y, dy, t) {   /* x = tâm, y = mặt nước; dy = dịch lên/xuống khi trồi/lặn */
  const top = y - WH * WL + dy, cut = y + dy * 0.3;   /* mép nước theo mặt nước, thân trượt qua nó khi trồi/lặn */
  g.save(); g.beginPath(); g.rect(x - WW, top - 8, WW * 2, Math.max(0, cut - top + 8)); g.clip(); g.drawImage(img, x - WW / 2, top, WW, WH); g.restore();
  g.save(); g.beginPath(); g.rect(x - WW, cut, WW * 2, WH); g.clip(); g.globalAlpha = 0.28; g.drawImage(img, x - WW / 2, top, WW, WH); g.globalAlpha = 1; g.restore();
  g.fillStyle = 'rgba(230,246,255,.75)';                                                    /* bọt mép nước lượn nhẹ */
  for (let i = -WW * 0.46; i < WW * 0.46; i += 5) { const w = Math.sin(t * 2.4 + i * 0.35) * 1; g.fillRect(Math.round(x + i), Math.round(cut + w), 3, 1); }
}

const BOARD = HOOK.image('drift_board', (() => { const c = mkCanvas(18, 7), g = c.getContext('2d'); px(g, 0, 1, OUT, 18, 6); px(g, 1, 2, '#9a6b3c', 16, 4); px(g, 1, 2, '#b98352', 16, 1); px(g, 5, 2, OUT, 1, 4); px(g, 12, 2, OUT, 1, 4); px(g, 2, 5, '#6e4a28', 14, 1); return c; })());
const BOTTLE = HOOK.creature('bottle', [0, 1].map(f => { const c = mkCanvas(10, 12), g = c.getContext('2d'); const t = f ? 1 : 0;
  px(g, 3, 1 + t, OUT, 4, 10); px(g, 4, 2 + t, '#b0e0c8', 2, 2); px(g, 4, 3 + t, '#5c3b1e', 2, 1);   // cork
  px(g, 2, 4 + t, OUT, 6, 7); px(g, 3, 5 + t, '#8fd6bc', 4, 5); px(g, 3, 5 + t, '#d8f6ea', 1, 4); px(g, 4, 7 + t, '#f5ecd0', 2, 2); // glass + the note inside
  px(g, 0, 9, 'rgba(223,240,255,.7)', 10, 1); return [c, c]; })).map(fr => fr[0]);   // [frame]; art.js thay phần tử tại chỗ
const ARROW = (() => { const c = mkCanvas(11, 10), g = c.getContext('2d'); px(g, 0, 0, OUT, 11, 10); px(g, 1, 1, '#ffd45e', 9, 4); for (let i = 0; i < 4; i++) px(g, 1 + i, 5 + i, '#ffd45e', 9 - i * 2, 1); px(g, 4, 1, '#fff3b0', 3, 2); return c; })();

// ---------------------------------------------------------------- state
let cast = [];        // castaways in the water [{m, x, y, ph, sheet}]
let aboard = [];      // castaways on the raft (max 2)
let bottles = [];     // [{x, y, ph, taken, respawn}]
let whale = null;     // {x, y, dir, phase:'rise'|'idle'|'dive'|'ride', t, ang, fr, ft, spout}
let whaleT = 0;       // countdown to the next surfacing
let race = null;      // {i (next buoy index), t, done}
let fx = [];
let hermitNpc = null, hermitM = null, reefs = [], waterFar = [], panelEl = null, delivering = false, treasure = null;
let ride = null;      // saved player defaults while riding the whale
const tileOf = v => Math.floor(v / TILE);
const isWaterT = (ctx, tx, ty) => { const t = ctx.getG(ctx.S.map, tx, ty), T = ctx.T; return t === T.WATER || t === T.DEEP || t === T.REEF; };
const testMode = () => typeof window !== 'undefined' && !!window.__lifeTest;

function sysS(ctx) {
  const sv = ctx.S.save; sv.sys = sv.sys || {};
  const s = (sv.sys.seaLife = sv.sys.seaLife || {});
  if (!Array.isArray(s.rescued)) s.rescued = [];
  if (!('best' in s)) s.best = null;
  return s;
}
function ensureSea(ctx) {   // while sea_raft.js is a stub, a test flag stands in for it
  const S = ctx.S; if (S.sea || !testMode()) return;
  const T = ctx.T;
  S.sea = { raft: { hp: 3, max: 6, sail: false }, riding: 'raft', diving: false, x: S.player.x, y: S.player.y };
  S.player.passable = (m, tx, ty) => [T.WATER, T.DEEP, T.REEF, T.SAND, T.DOCK].includes(ctx.getG(m, tx, ty));
}

// ---------------------------------------------------------------- particles
function splash(x, y, scale = 1) {
  fx.push({ k: 'ring', x, y, t: 0.55, life: 0.55, r0: 2 * scale, r1: 11 * scale });
  fx.push({ k: 'ring', x, y, t: 0.8, life: 0.8, r0: 4 * scale, r1: 17 * scale });
  for (let i = 0; i < 6; i++) { const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.2; fx.push({ k: 'drop', x, y, vx: Math.cos(a) * (16 + Math.random() * 22) * scale, vy: Math.sin(a) * (26 + Math.random() * 26) * scale, gy: 120, t: 0.5, life: 0.5 }); }
}
function updateFx(dt) {
  for (let i = fx.length - 1; i >= 0; i--) { const p = fx[i]; p.t -= dt; if (p.t <= 0) { fx.splice(i, 1); continue; } if (p.vx !== undefined) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += (p.gy || 0) * dt; } }
  if (fx.length > 120) fx.splice(0, fx.length - 120);
}
function drawFx(g, cx, cy) {
  for (const p of fx) {
    const k = Math.max(0, p.t / p.life), x = Math.round(p.x) - cx, y = Math.round(p.y) - cy;
    if (p.k === 'ring') { g.globalAlpha = k * 0.75; g.strokeStyle = '#dff0ff'; g.lineWidth = 1; g.beginPath(); const r = p.r0 + (p.r1 - p.r0) * (1 - k); g.ellipse(x, y, r, r * 0.45, 0, 0, TAU); g.stroke(); }
    else { g.globalAlpha = k; g.fillStyle = 'rgba(214,240,255,.9)'; g.fillRect(x, y, 2, 2); }
  }
  g.globalAlpha = 1;
}

// ---------------------------------------------------------------- spawning
function scanSea(ctx) {
  const m = ctx.S.map, T = ctx.T; reefs = []; waterFar = [];
  for (let ty = 2; ty < 50; ty++) for (let tx = 3; tx < m.w - 3; tx++) {
    const t = ctx.getG(m, tx, ty);
    if (t === T.REEF) reefs.push({ x: tx, y: ty });
    if (t !== T.WATER && t !== T.DEEP) continue;
    let open = true;
    for (let dy = -2; dy <= 2 && open; dy++) for (let dx = -2; dx <= 2; dx++) if (!isWaterT(ctx, tx + dx, ty + dy)) { open = false; break; }
    if (open && !m.flow[ty * m.w + tx]) waterFar.push({ x: tx, y: ty });
  }
}
function pickFar(rng, n, minDist, avoid = []) {
  const out = [];
  for (let guard = 0; guard < 400 && out.length < n && waterFar.length; guard++) {
    const c = waterFar[(rng() * waterFar.length) | 0];
    if (out.concat(avoid).some(o => Math.hypot(o.x - c.x, o.y - c.y) < minDist)) continue;
    out.push(c);
  }
  return out;
}
function spawnCastaways(ctx) {
  cast = []; aboard = [];
  const s = sysS(ctx), rng = ctx.rngFrom(ctx.hashStr('sea:castaways') ^ 0xc5a7);
  const pool = ctx.membersOfLevel(-1).filter(m => m !== hermitM && !s.rescued.includes(m.id));
  for (let i = pool.length - 1; i > 0; i--) { const j = (rng() * (i + 1)) | 0;[pool[i], pool[j]] = [pool[j], pool[i]]; }
  const e = ctx.S.map.entries, avoid = [e.default, e.back, { x: 40, y: 26 }];
  const spots = pickFar(rng, 3, 14, avoid);
  spots.forEach((sp, i) => { const m = pool[i]; if (!m) return; cast.push({ m, x: sp.x * TILE + 8, y: sp.y * TILE + 10, ph: rng() * TAU, sheet: ctx.charSheet(ctx.lookFor(m.id, '#9a9a9a')) }); });
}
function spawnBottles(ctx) {
  bottles = [];
  const rng = ctx.rngFrom(ctx.hashStr('sea:bottles') ^ 0xb077);
  for (const sp of pickFar(rng, 6, 8, cast.map(c => ({ x: tileOf(c.x), y: tileOf(c.y) })))) bottles.push({ x: sp.x * TILE + 8, y: sp.y * TILE + 8, ph: rng() * TAU, taken: false, respawn: 0 });
}
function respawnBottle(ctx, b) {
  const sp = pickFar(Math.random, 1, 6, bottles.filter(o => o !== b && !o.taken).map(o => ({ x: tileOf(o.x), y: tileOf(o.y) })))[0];
  if (!sp) return;
  b.x = sp.x * TILE + 8; b.y = sp.y * TILE + 8; b.taken = false; b.respawn = 0;
}
function pickTreasure(ctx) {
  const far = reefs.filter(r => r.y < 46);
  const pool = far.length ? far : reefs; if (!pool.length) return null;
  return pool[(Math.random() * pool.length) | 0];
}
function dirWord(ctx, dx, dy) {
  const vi = ctx.lang() === 'vi';
  const ns = dy < -3 ? (vi ? 'bắc' : 'north') : dy > 3 ? (vi ? 'nam' : 'south') : '';
  const ew = dx > 3 ? (vi ? 'đông' : 'east') : dx < -3 ? (vi ? 'tây' : 'west') : '';
  return ns && ew ? (vi ? `${ns}-${ew}` : `${ns}-${ew}`) : (ns || ew || (vi ? 'ngay cạnh' : 'right beside'));
}

// ---------------------------------------------------------------- castaways
function pullAboard(ctx, c) {
  const S = L(ctx);
  if (aboard.length >= 2) { ctx.toast(S.full); return; }
  const i = cast.indexOf(c); if (i < 0) return;
  cast.splice(i, 1); aboard.push(c);
  splash(c.x, c.y, 1.1); ctx.sfx('splash');
  ctx.toast(S.aboard(c.m.k || c.m.n));
}
function nearDock(ctx) {
  const d = ctx.S.map.dock, p = ctx.S.player; if (!d) return false;
  return Math.hypot(tileOf(p.x) - d.x, tileOf(p.y) - d.y) <= 4;
}
function deliver(ctx) {
  if (delivering || !aboard.length) return;
  delivering = true;
  const S = L(ctx), s = sysS(ctx), list = aboard.splice(0, aboard.length);
  const sv = ctx.S.save;
  for (const c of list) {
    if (!s.rescued.includes(c.m.id)) s.rescued.push(c.m.id);
    if (!sv.met.includes(c.m.id)) sv.met.push(c.m.id);
    ctx.bag.add('stone', 3);
  }
  ctx.persist(); ctx.sfx('win');
  ctx.setMode('dialog');
  const next = () => {
    const c = list.shift();
    if (!c) { delivering = false; ctx.setMode('play'); return; }
    const nat = ctx.nationOf(c.m);
    ctx.toast(S.saved(c.m.k || c.m.n), true);
    ctx.openDialog({ m: c.m, pages: [nat ? S.thanks(nat.name, c.m.i) : S.thanksNoNat(c.m.i)], onClose: () => { if (list.length) { ctx.setMode('dialog'); next(); } else { delivering = false; ctx.setMode('play'); } } });
  };
  next();
}

// ---------------------------------------------------------------- bottles
function allMembers(ctx) { const out = []; for (const m of ctx.byId.values()) if (m.n !== 'Deleted User') out.push(m); return out; }
function pickBottle(ctx, b) {
  const S = L(ctx);
  b.taken = true; b.respawn = 120;
  splash(b.x, b.y, 0.8); ctx.sfx('pickup');
  ctx.bag.add('bottle', 1);
  const all = allMembers(ctx), m = all[(Math.random() * all.length) | 0];
  const pages = [];
  if (m) { const nat = ctx.nationOf(m); pages.push(S.note(m.k || m.n, nat ? nat.name : '', m.i, m.r, m.f)); }
  treasure = pickTreasure(ctx);
  if (treasure) {
    const lh = ctx.S.map.objects.find(o => o.lighthouse) || ctx.S.map.dock, dx = treasure.x - lh.x, dy = treasure.y - lh.y;
    pages.push(S.hint(dirWord(ctx, dx, dy), Math.round(Math.hypot(dx, dy)), treasure.x, treasure.y));
    if (ctx.S.sea) ctx.S.sea.treasure = { x: treasure.x, y: treasure.y };
  }
  ctx.setMode('dialog');
  ctx.openDialog({ title: S.bottleTitle, pages, onClose: () => ctx.setMode('play') });
}

// ---------------------------------------------------------------- the whale
function surfaceWhale(ctx, tx, ty) {
  const m = ctx.S.map, T = ctx.T;
  if (tx === undefined) {
    const deep = [];
    for (let y = 2; y < 52; y++) for (let x = 4; x < m.w - 4; x++) if (ctx.getG(m, x, y) === T.DEEP) deep.push({ x, y });
    if (!deep.length) return null;
    const d = deep[(Math.random() * deep.length) | 0]; tx = d.x; ty = d.y;
  }
  const p = ctx.S.player;
  whale = { x: tx * TILE + 8, y: ty * TILE + 8, dir: p.x < tx * TILE ? -1 : 1, phase: 'rise', t: 0, ang: 0, fr: 0, ft: 0, spout: 0 };
  splash(whale.x, whale.y, 1.6); ctx.sfx('splash');
  if (Math.hypot(whale.x - p.x, whale.y - p.y) < 260) ctx.toast(L(ctx).whaleNear);
  return whale;
}
function startRide(ctx) {
  const S = ctx.S, p = S.player, w = whale; if (!w || !S.sea) return;
  ride = { passable: p.passable, custom: p.custom, speedMul: p.speedMul, ghost: p.ghost, boxW: p.boxW, boxH: p.boxH };
  S.sea.riding = 'whale';
  p.ghost = true; p.speedMul = 0; p.passable = () => true;
  p.custom = (g, ent) => {
    const img = WHALE[w.fr][w.dir < 0 ? 1 : 0], x = Math.round(ent.x), y = Math.round(ent.y);
    drawWhaleBody(g, img, x, y + 6, 0, performance.now() / 1000);   /* đúng cỡ ảnh gốc 128×64, bụng chìm dưới mặt nước */
    const sh = ent.sheet; if (sh) g.drawImage(sh, ent.frame * 16, ent.dir * 20, 16, 20, x - 8 + (w.dir < 0 ? 4 : -4), y + 6 - WH * WL - 14, 16, 20);
  };
  w.phase = 'ride'; w.t = 0;
  w.ang = Math.atan2(S.map.h * TILE * 0.45 - w.y, S.map.w * TILE * 0.5 - w.x) + (Math.random() - 0.5) * 1.2;
  w.dir = Math.cos(w.ang) >= 0 ? 1 : -1;
  splash(w.x, w.y, 1.4); ctx.sfx('splash');
}
function endRide(ctx) {
  const S = ctx.S, p = S.player;
  if (ride) { p.passable = ride.passable; p.custom = ride.custom; p.speedMul = ride.speedMul || 1; p.ghost = !!ride.ghost; p.boxW = ride.boxW; p.boxH = ride.boxH; ride = null; }
  else { p.passable = null; p.custom = null; p.speedMul = 1; p.ghost = false; }
  if (S.sea) { S.sea.riding = 'raft'; S.sea.x = p.x; S.sea.y = p.y; }
  if (testMode()) { p.passable = null; ensureSea(ctx); }
  splash(p.x, p.y, 1.8); ctx.sfx('splash');
  ctx.toast(L(ctx).dives);
  whale = null; whaleT = 60;
}
function updateWhale(dt, ctx) {
  const w = whale, p = ctx.S.player, m = ctx.S.map;
  w.t += dt; w.ft += dt * (w.phase === 'ride' ? 4 : 1.6); w.fr = (w.ft | 0) % 2;
  if (w.spout > 0) w.spout -= dt;
  if (w.phase === 'rise') { if (w.t > 0.9) { w.phase = 'idle'; w.t = 0; w.spout = 1.4; } return; }
  if (w.phase === 'idle') {
    if (w.spout <= 0 && Math.random() < dt * 0.25) { w.spout = 1.4; if (Math.hypot(w.x - p.x, w.y - p.y) < 220) ctx.sfx('splash'); }
    if (w.t > 15) { w.phase = 'dive'; w.t = 0; splash(w.x, w.y, 1.6); if (Math.hypot(w.x - p.x, w.y - p.y) < 260) ctx.sfx('splash'); }
    return;
  }
  if (w.phase === 'dive') { if (w.t > 1) { whale = null; whaleT = 60; } return; }
  // ride: a long curve at 4 tiles/s, steering away from land and the map edge
  const sp = 64 * dt;
  w.ang += Math.sin(w.t * 0.6) * 0.9 * dt;
  const mw = m.w * TILE, mh = 57 * TILE;
  for (let k = 0; k < 24; k++) {
    const ax = w.x + Math.cos(w.ang) * 28, ay = w.y + Math.sin(w.ang) * 28;
    const ok = ax > 24 && ax < mw - 24 && ay > 24 && ay < mh && isWaterT(ctx, tileOf(ax), tileOf(ay));
    if (ok) break;
    w.ang += 0.26;
  }
  w.x += Math.cos(w.ang) * sp; w.y += Math.sin(w.ang) * sp;
  w.dir = Math.cos(w.ang) >= 0 ? 1 : -1;
  if (Math.random() < dt * 0.5) w.spout = 1.2;
  if (Math.random() < dt * 3) fx.push({ k: 'ring', x: w.x - w.dir * 20, y: w.y + 2, t: 0.6, life: 0.6, r0: 3, r1: 12 });
  p.x = w.x; p.y = w.y + 2; p.dir = w.dir < 0 ? 1 : 2; p.moving = false;
  if (w.t > 12 && isWaterT(ctx, tileOf(w.x), tileOf(w.y))) endRide(ctx);
  else if (w.t > 18) endRide(ctx);
}
function drawWhale(ctx, cx, cy, out) {
  const w = whale, g = ctx.g;
  if (!w || w.phase === 'ride') return;
  const k = w.phase === 'rise' ? Math.min(1, w.t / 0.9) : w.phase === 'dive' ? Math.max(0, 1 - w.t) : 1;
  const img = WHALE[w.fr][w.dir < 0 ? 1 : 0], x = Math.round(w.x) - cx, y = Math.round(w.y) - cy;
  const rise = Math.round((1 - k) * 22), bob = Math.round(Math.sin(ctx.S.time * 1.8) * 1.2);
  out.push({ y: w.y + 4, f: () => {
    g.fillStyle = 'rgba(10,30,60,.35)'; g.beginPath(); g.ellipse(x, y + 2, WW * 0.47, WH * 0.22, 0, 0, TAU); g.fill();
    drawWhaleBody(g, img, x, y + 2, rise * 2 + bob, ctx.S.time);   /* đúng cỡ ảnh gốc, bụng chìm; trồi/lặn = thân trượt qua mép nước */
    g.strokeStyle = 'rgba(223,240,255,.7)'; g.lineWidth = 1; g.beginPath(); g.ellipse(x, y + 2, WW * 0.4 + Math.sin(ctx.S.time * 2) * 2, WH * 0.19, 0, 0, TAU); g.stroke();
    if (w.spout > 0 && w.phase === 'idle') drawSpout(g, x + w.dir * 16, y + 2 - WH * WL + bob, 1.4 - w.spout);
  } });
}
function drawSpout(g, x, y, t) {   // t: 0..1.4 seconds since it blew
  const h = Math.min(1, t / 0.35), fade = t > 0.9 ? Math.max(0, 1 - (t - 0.9) / 0.5) : 1;
  g.globalAlpha = 0.85 * fade; g.fillStyle = '#eaf6ff';
  for (let i = 0; i < 7; i++) { const yy = y - i * 3 * h, spread = i * 0.9 * h; g.fillRect(Math.round(x - spread) - 1, Math.round(yy), 2, 2); g.fillRect(Math.round(x + spread), Math.round(yy), 2, 2); }
  g.fillRect(x - 1, Math.round(y - 20 * h), 2, 2);
  g.globalAlpha = 1;
}

// ---------------------------------------------------------------- the hermit's race
const buoys = ctx => ctx.S.map.objects.filter(o => o.buoy).sort((a, b) => a.buoy - b.buoy);
const buoyPx = o => ({ x: o.x * TILE + 8, y: o.y * TILE + 12 });
function openRacePanel(ctx) {
  const S = L(ctx), s = sysS(ctx);
  const html = `<h2 style="margin:0 0 8px">${S.raceTitle}</h2>
    <p class="dim" style="margin:0 0 12px">${s.best != null ? S.raceRecord(s.best.toFixed(1)) : S.raceNoRecord}</p>
    <div style="display:flex;gap:8px;justify-content:center"><button class="btn primary" id="sl-start">${S.start}</button><button class="btn" id="sl-later">${S.later}</button></div>`;
  panelEl = ctx.panel('seaLife', html);
  panelEl.hidden = false;
  ctx.setMode('seaRace');
  ctx.registerCloser('seaRace', () => closePanel(ctx));
  panelEl.querySelector('#sl-start').onclick = () => { closePanel(ctx); startRace(ctx); };
  panelEl.querySelector('#sl-later').onclick = () => closePanel(ctx);
}
function closePanel(ctx) { if (panelEl) panelEl.hidden = true; if (ctx.S.mode === 'seaRace') ctx.setMode('play'); }
function startRace(ctx) {
  race = { i: 0, t: 0 };
  ctx.sfx('coin'); ctx.toast(L(ctx).raceGo, true);
}
function finishRace(ctx) {
  const S = L(ctx), s = sysS(ctx), sv = ctx.S.save, t = race.t;
  race = null;
  let msg = S.finish(t.toFixed(1));
  if (s.best == null || t < s.best) { s.best = t; msg += ' · ' + S.newBest; }
  s.races = (s.races || 0) + 1;
  if (t < 150 && !s.captain) {
    s.captain = true;
    ctx.bag.add('stone', 5);
    sv.achievements = sv.achievements || []; if (!sv.achievements.includes('captain')) sv.achievements.push('captain');
    sv.cards = sv.cards || []; if (hermitM && !sv.cards.includes(hermitM.id)) sv.cards.push(hermitM.id);
    ctx.sfx('win'); ctx.toast(msg, true); setTimeout(() => ctx.toast(S.captain, true), 1900);
  } else { ctx.sfx(t < 150 ? 'win' : 'coin'); ctx.toast(msg + (t >= 150 ? ' · ' + S.notCaptain : ''), true); }
  ctx.persist();
}
function updateRace(dt, ctx) {
  race.t += dt;
  const bs = buoys(ctx), b = bs[race.i]; if (!b) { finishRace(ctx); return; }
  const p = ctx.S.player, c = buoyPx(b);
  if (Math.hypot(c.x - p.x, c.y - p.y) < 26) {
    race.i++; ctx.sfx('coin'); splash(c.x, c.y + 4, 0.8);
    if (race.i >= bs.length) finishRace(ctx); else ctx.toast(L(ctx).check(b.buoy) + ' ' + L(ctx).next(bs[race.i].buoy));
  }
}
function hermitTalk(ctx) {
  const S = L(ctx), s = sysS(ctx);
  if (race) { race = null; ctx.toast(S.gaveUp); return; }
  const n = hermitNpc; ctx.S.player.faceTo(n.x, n.y); ctx.S.talking = n;
  const pages = s.best != null ? [S.raceIntro[1], S.raceRecord(s.best.toFixed(1))] : S.raceIntro.slice();
  const first = !ctx.S.save.met.includes(hermitM.id);
  ctx.setMode('dialog');
  ctx.openDialog({ m: hermitM, pages, onClose: () => {
    ctx.S.talking = null;
    if (first && !ctx.S.save.met.includes(hermitM.id)) { ctx.S.save.met.push(hermitM.id); ctx.persist(); }   // the hermit counts as met (the core would do this on its own talk)
    openRacePanel(ctx);
  } });
}

// ---------------------------------------------------------------- system
export const seaLife = {
  id: 'seaLife',

  onZoneEnter(ctx) {
    cast = []; aboard = []; bottles = []; whale = null; race = null; fx = []; hermitNpc = null; hermitM = null; delivering = false; ride = null; treasure = null;
    if (ctx.S.mode === 'seaRace') ctx.setMode('play');
    const S = ctx.S; if (!S.map.sea) return;
    ensureSea(ctx);
    hermitNpc = S.npcs.find(n => n.hermit) || null; hermitM = hermitNpc ? hermitNpc.m : null;
    scanSea(ctx);
    spawnCastaways(ctx);
    spawnBottles(ctx);
    whaleT = 25;
    ctx.registerCloser('seaRace', () => closePanel(ctx));
    if (typeof window !== 'undefined') window.__life = {
      castaways: () => cast.map(c => ({ id: c.m.id, name: c.m.n, x: Math.round(c.x), y: Math.round(c.y), tx: tileOf(c.x), ty: tileOf(c.y) })),
      aboard: () => aboard.map(c => c.m.n),
      bottles: () => bottles.map(b => ({ x: Math.round(b.x), y: Math.round(b.y), tx: tileOf(b.x), ty: tileOf(b.y), taken: b.taken, respawn: Math.round(b.respawn) })),
      whale: () => whale && { x: Math.round(whale.x), y: Math.round(whale.y), phase: whale.phase, t: +whale.t.toFixed(1), next: Math.round(whaleT) },
      summonWhale: (tx, ty) => { if (tx === undefined) { tx = tileOf(S.player.x) + 3; ty = tileOf(S.player.y); } surfaceWhale(ctx, tx, ty); whale.phase = 'idle'; whale.t = 0; return window.__life.whale(); },
      race: () => race ? { next: race.i + 1, t: +race.t.toFixed(1), buoys: buoys(ctx).map(b => ({ n: b.buoy, x: b.x, y: b.y })) } : { best: sysS(ctx).best, captain: !!sysS(ctx).captain, buoys: buoys(ctx).map(b => ({ n: b.buoy, x: b.x, y: b.y })) },
      startRace: () => startRace(ctx),
      hermit: () => hermitNpc && { id: hermitM.id, name: hermitM.n, x: Math.round(hermitNpc.x), y: Math.round(hermitNpc.y) },
      test: () => { window.__lifeTest = true; ensureSea(ctx); return S.sea; },
      warp: (tx, ty) => { S.player.x = tx * TILE + 8; S.player.y = ty * TILE + 14; },
      sys: () => sysS(ctx)
    };
  },

  onZoneLeave(ctx) {
    if (whale && whale.phase === 'ride') { const p = ctx.S.player; if (ride) { p.passable = ride.passable; p.custom = ride.custom; p.speedMul = ride.speedMul || 1; p.ghost = !!ride.ghost; } else { p.passable = null; p.custom = null; p.speedMul = 1; p.ghost = false; } if (ctx.S.sea) ctx.S.sea.riding = 'raft'; ride = null; }
    if (testMode() && ctx.S.player.passable) ctx.S.player.passable = null;
    closePanel(ctx);
    cast = []; aboard = []; bottles = []; whale = null; race = null; fx = []; hermitNpc = null; delivering = false; treasure = null;
  },

  update(dt, ctx) {
    const S = ctx.S; if (!S.map.sea) return;
    ensureSea(ctx); if (!S.sea) return;
    const p = S.player, playing = S.mode === 'play', flow = S.map.flow, F = ctx.FLOW;
    updateFx(dt);
    // castaways bob; bottles drift with the current
    for (const c of cast) c.ph += dt * 1.6;
    for (const b of bottles) {
      if (b.taken) { b.respawn -= dt; if (b.respawn <= 0) respawnBottle(ctx, b); continue; }
      b.ph += dt * 2;
      const f = flow ? flow[tileOf(b.y) * S.map.w + tileOf(b.x)] : 0;
      let vx = Math.sin(b.ph * 0.5) * 2, vy = Math.cos(b.ph * 0.37) * 1.5;
      if (f === F.R) vx += 7; else if (f === F.L) vx -= 7; else if (f === F.D) vy += 7; else if (f === F.U) vy -= 7;
      const nx = b.x + vx * dt, ny = b.y + vy * dt;
      if (isWaterT(ctx, tileOf(nx), tileOf(b.y))) b.x = nx;
      if (isWaterT(ctx, tileOf(b.x), tileOf(ny))) b.y = ny;
      if (playing && S.sea.riding === 'raft' && !S.sea.diving && Math.hypot(b.x - p.x, b.y - (p.y - 4)) < 13) pickBottle(ctx, b);
    }
    // the whale
    if (whale) updateWhale(dt, ctx);
    else if (S.sea.riding !== 'whale') { whaleT -= dt; if (whaleT <= 0) { surfaceWhale(ctx); if (!whale) whaleT = 20; } }
    // castaways aboard reach the dock
    if (aboard.length && playing && (S.sea.riding === 'raft' || S.sea.riding === null) && nearDock(ctx)) deliver(ctx);
    if (race && playing) updateRace(dt, ctx);
  },

  drawables(ctx, cx, cy) {
    const out = [], g = ctx.g, VW = ctx.VW, VH = ctx.VH, p = ctx.S.player;
    if (!ctx.S.map.sea) return out;
    for (const c of cast) {
      const sx = c.x - cx, sy = c.y - cy; if (sx < -30 || sy < -40 || sx > VW + 30 || sy > VH + 30) continue;
      const bob = Math.round(Math.sin(c.ph) * 1.5), x = Math.round(c.x) - cx, y = Math.round(c.y) - cy + bob;
      out.push({ y: c.y - 200, f: () => { g.strokeStyle = 'rgba(223,240,255,.5)'; g.lineWidth = 1; g.beginPath(); g.ellipse(x, y + 1, 12 + Math.sin(c.ph) * 1.5, 4, 0, 0, TAU); g.stroke(); } });
      out.push({ y: c.y, f: () => {
        g.drawImage(BOARD, x - 9, y - 4);
        g.drawImage(c.sheet, 0, 0, 16, 13, x - 8, y - 16, 16, 13);           // head + shoulders above the water
        g.fillStyle = 'rgba(80,160,200,.55)'; g.fillRect(x - 8, y - 3, 16, 1); // the water line
        const t = ctx.S.time * 2 + c.ph; g.fillStyle = c.sheet ? '#f2ebe0' : '#fff';
        if (Math.sin(t) > 0.3) { g.fillStyle = OUT; g.fillRect(x + 8, y - 20 + Math.round(Math.sin(t * 3) * 2), 3, 8); g.fillStyle = '#e8b48e'; g.fillRect(x + 9, y - 19 + Math.round(Math.sin(t * 3) * 2), 1, 6); } // waving arm
      } });
    }
    for (const b of bottles) {
      if (b.taken) continue;
      const sx = b.x - cx, sy = b.y - cy; if (sx < -20 || sy < -20 || sx > VW + 20 || sy > VH + 20) continue;
      const img = BOTTLE[Math.sin(b.ph) > 0 ? 1 : 0], x = Math.round(b.x) - cx, y = Math.round(b.y) - cy;
      out.push({ y: b.y, f: () => { g.strokeStyle = 'rgba(223,240,255,.45)'; g.beginPath(); g.ellipse(x, y + 2, 7, 2.5, 0, 0, TAU); g.stroke(); g.drawImage(img, x - 5, y - 9); } });
    }
    drawWhale(ctx, cx, cy, out);
    // castaways riding beside the player (on the raft, or hanging on to the whale)
    if (aboard.length) {
      const fl = p.dir === 1 ? 1 : 0;
      aboard.forEach((c, i) => {
        const ox = (i === 0 ? -11 : 11), bob = Math.round(Math.sin(ctx.S.time * 2.2 + i) * 1);
        const x = Math.round(p.x + ox) - cx, y = Math.round(p.y) - cy + bob - (ctx.S.sea && ctx.S.sea.riding === 'whale' ? 30 : 0);
        out.push({ y: p.y + 0.4 + i * 0.01, f: () => g.drawImage(c.sheet, 0, (fl ? 1 : p.dir === 2 ? 2 : p.dir === 3 ? 3 : 0) * 20, 16, 20, x - 8, y - 18, 16, 20) });
      });
    }
    return out;
  },

  draw(g, ctx, cx, cy) {
    if (!ctx.S.map.sea) return;
    drawFx(g, cx, cy);
    if (race) {
      const b = buoys(ctx)[race.i]; if (!b) return;
      const c = buoyPx(b), bounce = Math.round(Math.abs(Math.sin(ctx.S.time * 4)) * 5);
      const x = Math.round(c.x) - cx, y = Math.round(c.y) - 30 - bounce - cy;
      g.drawImage(ARROW, x - 5, y - 10);
      g.strokeStyle = 'rgba(255,212,94,.8)'; g.lineWidth = 1; g.beginPath(); g.ellipse(Math.round(c.x) - cx, Math.round(c.y) - cy + 2, 12 + Math.sin(ctx.S.time * 5) * 2, 5, 0, 0, TAU); g.stroke();
    }
  },

  drawUI(ug, ctx, cx, cy, scale) {
    if (!ctx.S.map.sea) return;
    const S = L(ctx), fs = Math.max(10, scale * 3), near = ctx.S.near && ctx.S.near.kind === 'sys' && ctx.S.near.cand && ctx.S.near.cand.data;
    ug.save();
    ug.font = `bold ${fs}px "Segoe UI",system-ui,sans-serif`; ug.textAlign = 'center'; ug.textBaseline = 'bottom';
    const label = (text, x, y, color, mark) => {
      const sx = Math.round((x - cx) * scale), sy = Math.round((y - 20 - cy) * scale);
      if (sx < -100 || sx > ug.canvas.width + 100 || sy < -20 || sy > ug.canvas.height + 20) return;
      const w = ug.measureText(text).width + 8, h = fs + 4;
      ug.fillStyle = 'rgba(13,11,20,.6)'; ug.beginPath(); ug.roundRect(sx - w / 2, sy - h, w, h, 3); ug.fill();
      ug.fillStyle = color; ug.fillText(text, sx, sy - 2);
      if (mark) { ug.fillStyle = '#ffd45e'; ug.beginPath(); ug.moveTo(sx - 4, sy - h - 8); ug.lineTo(sx + 4, sy - h - 8); ug.lineTo(sx, sy - h - 2); ug.fill(); }
    };
    const met = ctx.S.save.met;
    for (const c of cast) label('🆘 ' + c.m.n, c.x, c.y - 2, met.includes(c.m.id) ? '#9ad' : '#fff', !!(near && near.castaway === c));
    const p = ctx.S.player;
    aboard.forEach((c, i) => label(c.m.n, p.x + (i === 0 ? -11 : 11), p.y - 2, '#9ad', false));
    if (race) {
      const bs = buoys(ctx), b = bs[race.i];
      if (b) label(S.buoyLbl(b.buoy), b.x * TILE + 8, b.y * TILE - 18, '#ffd45e', false);
      const tf = Math.max(14, scale * 5), x0 = 16, y0 = Math.max(70, scale * 24);   // top-left, under the HUD (the toast owns the top centre)
      ug.font = `bold ${tf}px "Segoe UI",system-ui,sans-serif`; ug.textBaseline = 'top'; ug.textAlign = 'left';
      const txt = `${race.t.toFixed(1)}s`, w = Math.max(ug.measureText(txt).width, tf * 3) + tf;
      ug.fillStyle = 'rgba(13,11,20,.75)'; ug.beginPath(); ug.roundRect(x0, y0, w, tf * 2, 8); ug.fill();
      ug.fillStyle = '#ffd45e'; ug.fillText(txt, x0 + tf * 0.5, y0 + tf * 0.15);
      ug.font = `${Math.max(9, scale * 2.6)}px "Segoe UI",system-ui,sans-serif`; ug.fillStyle = '#a79a86';
      ug.fillText(`${S.timer} · ${race.i + 1}/${bs.length}`, x0 + tf * 0.5, y0 + tf * 1.25);
    }
    ug.restore();
  },

  hudLines(ctx) {
    if (!ctx.S.map.sea) return [];
    const out = [];
    if (race) out.push(L(ctx).hud(Math.min(6, race.i + 1), race.t.toFixed(0)));
    if (whale && whale.phase === 'ride') out.push(L(ctx).riding);
    return out;
  },

  near(ctx) {
    const S = ctx.S; if (!S.map.sea || !S.sea) return null;
    const T = L(ctx), p = S.player;
    if (S.sea.riding === 'whale' || S.sea.diving) return null;
    // the hermit: every talk goes to the race (the first one also counts as meeting him, see hermitTalk)
    if (hermitNpc) {
      const d = Math.hypot(hermitNpc.x - p.x, hermitNpc.y - p.y);
      if (d < 24) return { label: race ? T.giveUp : T.hermit, x: hermitNpc.x, y: hermitNpc.y, limit: 24, priority: 2, data: { hermit: true } };   // 2: beats the quest offer on the same NPC
    }
    if (S.sea.riding !== 'raft') return null;
    if (whale && whale.phase === 'idle') { const d = Math.hypot(whale.x - p.x, whale.y - p.y); if (d < 44) return { label: T.ride, x: whale.x, y: whale.y, limit: 44, priority: true, data: { whale: true } }; }
    let best = null, bd = 24;
    for (const c of cast) { const d = Math.hypot(c.x - p.x, c.y - p.y); if (d < bd) { bd = d; best = c; } }
    if (best) return { label: T.pull, x: best.x, y: best.y, limit: 24, data: { castaway: best } };
    return null;
  },

  interact(ctx, cand) {
    const d = cand && cand.data; if (!d) return;
    if (d.hermit) { hermitTalk(ctx); return; }
    if (d.whale) { startRide(ctx); return; }
    if (d.castaway) pullAboard(ctx, d.castaway);
  }
};
