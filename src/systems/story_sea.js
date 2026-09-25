// story_sea.js — Act 1 of "Friend at Sea" (see src/story.js, systems/API.md "Story" and plan-5.md "Hồi 1").
//   0 adrift on a plank (no paddle, the current drifts you, dim vignette) → Lyron's raft with a torn sail comes for you →
//   two on one raft: five guided challenges (whirlpool · reef · the hermit's sailcloth · the ghost ship · the bottle story) →
//   in sight of the pier the Kraken rises: Lyron pushes you onto a plank, the raft goes down with him, his red scarf floats up →
//   the plank drifts down the lane to the dock, act 2 begins. After act 1 this module only keeps the scarf bobbing by the dock.
// Runs only while S.map.sea && story.act === 1 (plus the post-climax drift and the scarf). Reads S.sea (owned by sea_raft.js):
// while we hold the player on a plank we set S.sea.riding = 'plank' so the raft system stops re-applying its defaults.
import { NPC } from '../entities.js';
import { mkCanvas, HOOK } from '../gfx.js';

// ---------------------------------------------------------------- strings
const STR = {
  en: {
    wake: 'You wake on a plank… adrift on the Sea of Origins', noPaddle: 'No paddle. Only the current carries you.', sail: 'A sail on the horizon!',
    meet: ['Hey! Hold on! Grab my hand!', "I'm Lyron. Seismic never leaves anyone at sea.", "Two on one raft, then. You paddle — I know these waters. Let's get you ashore!"],
    goal: {
      whirl: 'Ride the current east — mind the whirlpool!', reef: 'Careful, the reefs here are sharp. Keep an eye on the logs.',
      hermit: 'The hermit on the middle island trades sailcloth for 2 shells. Dive the bright reef for shells!',
      ghost: 'Night is falling. Something pale is following us — ride a current, it cannot follow!', bottle: 'Wait — a bottle! Let me tell you a story.',
      done: "That's the lighthouse! Follow the lane south — the pier is right there."
    },
    short: { whirl: 'ride the current east', reef: 'patch the raft (2 planks = 1 ♥)', hermit: 'sailcloth from the hermit (2 🐚)', ghost: 'lose the ghost ship on a current', bottle: "Lyron's story", done: 'head for the pier' },
    mash: 'Mash E! Paddle out of it!', escaped: 'Ha! That is how you beat a whirlpool.',
    reefHit: 'The reef tears the raft!', reefBubble: 'Fish out planks — 2 planks patch one log!', patched: 'Good as new. Well — nearly.', lyronPatch: 'Lyron patches the raft with spare planks',
    trade: 'Trade 2 shells for sailcloth', traded: 'The hermit hands you sailcloth ⛵', hermitDone: 'Sailcloth! Rope + cloth = a sail. Faster raft.',
    ghostGone: 'It gave up. Ghosts hate currents.',
    bottleToast: 'Lyron fishes a bottle out of the water',
    bottle: ['See this bottle? Notes from artists all over the world. Seismic is an encrypted blockchain — but the #artwork channel is where the people live.', 'Every artist you meet ashore is real. They posted, they cheered each other on. Go find them — and tell them Lyron sent you.'],
    kraken: 'Something is rising from the deep!', taken: 'The raft goes down with Lyron…', scarfUp: 'A red scarf floats up…', pushed: 'Lyron pushes you onto a plank',
    cut: ['Go! Find help — the trench… it keeps what it takes!', 'Take the plank. Seismic never leaves anyone at sea. Not even me. GO!'],
    pier: 'You reach the pier', scarfPick: "Pick up Lyron's scarf", scarfGot: "Lyron's scarf 🧣 — a keepsake", skip: 'E · skip', hud: '♥ Lyron', drifting: '🪵 drifting to the pier'
  },
  vi: {
    wake: 'Bạn tỉnh dậy trên một mảnh ván… trôi giữa Biển Khởi Nguồn', noPaddle: 'Không có mái chèo. Chỉ có dòng nước đưa đi.', sail: 'Một cánh buồm ở chân trời!',
    meet: ['Này! Bám chắc! Nắm lấy tay tôi!', 'Tôi là Lyron. Seismic không bỏ ai lại giữa biển.', 'Vậy là hai người một bè. Bạn chèo — tôi rành vùng nước này. Đưa bạn vào bờ thôi!'],
    goal: {
      whirl: 'Đi theo dòng chảy về phía đông — coi chừng xoáy nước!', reef: 'Cẩn thận, đá ngầm ở đây sắc lắm. Để ý mấy khúc gỗ.',
      hermit: 'Ẩn sĩ ở đảo giữa đổi vải buồm lấy 2 vỏ sò. Lặn xuống rạn san hô sáng mà nhặt sò!',
      ghost: 'Đêm xuống rồi. Có thứ gì nhợt nhạt đang bám theo — vào hải lưu đi, nó không theo được!', bottle: 'Khoan — một cái chai! Để tôi kể bạn nghe một chuyện.',
      done: 'Hải đăng kia rồi! Theo làn nước xuôi nam — bến tàu ngay đó.'
    },
    short: { whirl: 'theo dòng chảy về đông', reef: 'vá bè (2 ván = 1 ♥)', hermit: 'vải buồm từ ẩn sĩ (2 🐚)', ghost: 'cắt đuôi tàu ma bằng hải lưu', bottle: 'chuyện của Lyron', done: 'hướng về bến tàu' },
    mash: 'Bấm E liên tục! Chèo ra khỏi nó!', escaped: 'Ha! Xoáy nước là phải trị như thế.',
    reefHit: 'Đá ngầm xé toạc bè!', reefBubble: 'Vớt ván đi — 2 ván vá được một khúc gỗ!', patched: 'Như mới. Ừ thì — gần như mới.', lyronPatch: 'Lyron vá bè bằng ván dự phòng',
    trade: 'Đổi 2 vỏ sò lấy vải buồm', traded: 'Ẩn sĩ đưa bạn tấm vải buồm ⛵', hermitDone: 'Vải buồm! Dây + vải = cánh buồm. Bè nhanh hơn.',
    ghostGone: 'Nó bỏ cuộc rồi. Ma ghét hải lưu.',
    bottleToast: 'Lyron vớt một cái chai dưới nước lên',
    bottle: ['Thấy cái chai này không? Thư của nghệ sĩ khắp thế giới. Seismic là một blockchain mã hóa — nhưng kênh #artwork mới là nơi mọi người sống.', 'Mỗi nghệ sĩ bạn gặp trên bờ đều là người thật. Họ đăng tranh, cổ vũ nhau. Đi tìm họ đi — và nói là Lyron gửi bạn tới.'],
    kraken: 'Có thứ gì đang trồi lên từ vực sâu!', taken: 'Chiếc bè chìm xuống cùng Lyron…', scarfUp: 'Một chiếc khăn đỏ nổi lên…', pushed: 'Lyron đẩy bạn lên một mảnh ván',
    cut: ['Đi đi! Tìm người giúp — vực sâu… nó giữ những gì nó bắt!', 'Bám lấy ván. Seismic không bỏ ai lại giữa biển. Kể cả tôi. ĐI ĐI!'],
    pier: 'Bạn đã tới bến tàu', scarfPick: 'Nhặt khăn của Lyron', scarfGot: 'Khăn của Lyron 🧣 — kỷ vật', skip: 'E · bỏ qua', hud: '♥ Lyron', drifting: '🪵 trôi về bến tàu'
  }
};
const L = ctx => STR[ctx.lang && ctx.lang() === 'vi' ? 'vi' : 'en'];

// ---------------------------------------------------------------- tuning
const TILE = 16, TAU = Math.PI * 2;
const WAIT = 12, ARRIVE = 4, DIM = 0.35, PLANK_PX = 1.0 * TILE, STILL_PX = 8;
const WHIRL_T = 90, REEF_WAIT = 120, REEF_FIX = 150, HERMIT_T = 120, GHOST_T = 60, DRIFT_MAX = 45;
const F = { ABOARD: 1, WHIRL: 2, REEF: 4, HERMIT: 8, GHOST: 16, BOTTLE: 32, CLIMAX: 64 };
const GOALS = ['whirl', 'reef', 'hermit', 'ghost', 'bottle'];
const GOAL_FLAG = { whirl: F.WHIRL, reef: F.REEF, hermit: F.HERMIT, ghost: F.GHOST, bottle: F.BOTTLE };
const ALL5 = F.WHIRL | F.REEF | F.HERMIT | F.GHOST | F.BOTTLE;

// ---------------------------------------------------------------- sprites (built once)
const C = { out: '#1c1a24', wood: '#8a5a2b', woodD: '#5f3d1c', woodL: '#a8733c', rope: '#d9c283', cloth: '#e9dcc3', clothD: '#cbbb9c', red: '#c94b33', patch: '#a24b3a', patchD: '#7c3428', water: '#7cc0f2', waterD: '#3f7fcf', scarf: '#ff1f4b', scarfD: '#b3123a', scarfL: '#ff7a92' };
const px = (g, x, y, c, w = 1, h = 1) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
function ln(g, x0, y0, x1, y1, c, t = 1) {
  const dx = x1 - x0, dy = y1 - y0, n = Math.max(Math.abs(dx), Math.abs(dy), 1); g.fillStyle = c;
  for (let i = 0; i <= n; i++) g.fillRect(Math.round(x0 + dx * i / n) - (t >> 1), Math.round(y0 + dy * i / n) - (t >> 1), t, t);
}
function sheetOf(w, h, fn, flip) { const c = mkCanvas(w, h), g = c.getContext('2d'); if (flip) { g.translate(w, 0); g.scale(-1, 1); } fn(g); return c; }
// the raft: 32×20 logs + rope lashings (same look as sea_raft.js so Lyron's raft IS the raft you ride afterwards)
const RAFT = HOOK.image('raft_story', sheetOf(32, 20, g => {
  for (let i = 0; i < 4; i++) {
    const y = 4 + i * 4;
    px(g, 1, y, C.out, 30, 4); px(g, 2, y + 1, i % 2 ? C.wood : C.woodL, 28, 2); px(g, 2, y + 3, C.woodD, 28, 1);
    px(g, 2, y + 1, '#a8733c', 1, 2); px(g, 29, y + 1, '#6f4720', 1, 2);
  }
  for (const x of [7, 23]) { px(g, x, 3, C.out, 3, 18); px(g, x, 4, C.rope, 2, 16); }
  px(g, 12, 2, C.out, 8, 3); px(g, 13, 3, C.rope, 6, 1);
}));
// the torn sail: 30×26, mast at column 12..14, cloth billowing to starboard with two red-brown patches and ragged holes
function tornSail(g, f) {
  px(g, 12, 0, C.out, 3, 26); px(g, 13, 1, C.woodL, 1, 24);
  for (let k = 0; k < 20; k++) {
    const w = 2 + Math.round((11 + (f ? 1 : 0)) * Math.sin((k / 19) * Math.PI * 0.95));
    px(g, 15, 2 + k, C.out, w + 1, 1); px(g, 15, 2 + k, (k > 7 && k < 11) ? C.red : (k % 6 === 5 ? C.clothD : C.cloth), w, 1);
  }
  px(g, 17, 5, C.patchD, 6, 4); px(g, 18, 6, C.patch, 4, 2); px(g, 19, 14, C.patchD, 5, 3); px(g, 20, 15, C.patch, 3, 1);
  g.clearRect(24, 11, 3, 2); g.clearRect(20, 19, 2, 3); g.clearRect(26, 8, 2, 1); g.clearRect(16, 21, 3, 1); g.clearRect(22, 3, 2, 1);
  ln(g, 15, 2, 14, 23, C.rope, 1);
}
const SAIL = [0, 1].map(f => [HOOK.image(`sail_story_${f}`, sheetOf(30, 26, g => tornSail(g, f))), HOOK.image(`sail_story_l_${f}`, sheetOf(30, 26, g => tornSail(g, f), true))]);   // [frame][0 right, 1 left]
// the plank you cling to: 18×7
const PLANK = HOOK.image('plank_story', sheetOf(18, 7, g => { px(g, 0, 1, C.out, 18, 6); px(g, 1, 2, '#9a6b3c', 16, 4); px(g, 1, 2, '#b98352', 16, 1); px(g, 5, 2, C.out, 1, 4); px(g, 12, 2, C.out, 1, 4); px(g, 2, 5, '#6e4a28', 14, 1); }));
// Kraken tentacles: 16×32 tapering spines, dark purple with pale suckers (same style as raiders_sea.js) — 0/1 sway, 2 curled (wrapping)
function tentacleArt(g, f) {
  const B = '#4a2a6a', LT = '#6e44a0', D = '#33184d', SK = '#e6b8ef', SD = '#a06fc0';
  const curve = s => f === 2 ? { x: 8 + s * 4 - (s > 0.7 ? (s - 0.7) * 30 : 0), y: 31 - s * 28 + (s > 0.7 ? (s - 0.7) * 12 : 0) } : { x: 8 + Math.sin(s * 4.5 + (f ? Math.PI : 0)) * 2.2 * (0.3 + s), y: 31 - s * 29 };
  const wOf = s => 7 - s * 5, N = 48;
  for (let i = 0; i <= N; i++) { const s = i / N, p = curve(s), w = wOf(s) + 2; g.fillStyle = C.out; g.fillRect(Math.round(p.x - w / 2), Math.round(p.y - 1), Math.round(w), 3); }
  for (let i = 0; i <= N; i++) { const s = i / N, p = curve(s), w = wOf(s); g.fillStyle = s > 0.85 ? D : B; g.fillRect(Math.round(p.x - w / 2), Math.round(p.y), Math.round(w), 1); }
  for (let i = 0; i <= N; i++) { const s = i / N, p = curve(s), w = wOf(s); if (w > 3) px(g, Math.round(p.x + w / 2 - 2), Math.round(p.y), LT, 1, 1); }
  for (let i = 2; i < N; i += 5) { const s = i / N, p = curve(s), w = wOf(s); if (w < 3) continue; const sx = Math.round(p.x - w / 2 + 1), sy = Math.round(p.y); px(g, sx, sy, SD, 2, 1); px(g, sx, sy - 1, SK, 1, 1); }
}
const TENT = HOOK.creature('kraken_tent_story', [0, 1, 2].map(f => [sheetOf(16, 32, g => tentacleArt(g, f)), sheetOf(16, 32, g => tentacleArt(g, f), true)]));
// the red scarf on the water: 14×6, two wave frames
const SCARF = HOOK.creature('scarf', [0, 1].map(f => [sheetOf(14, 6, g => {
  for (let x = 0; x < 14; x++) { const y = 2 + Math.round(Math.sin(x / 2.2 + f * Math.PI) * 1); px(g, x, y - 1, C.out, 1, 4); px(g, x, y, x % 5 === 2 ? C.scarfL : C.scarf, 1, 2); px(g, x, y + 1, C.scarfD, 1, 1); }
  px(g, 0, 1, C.out, 1, 4); px(g, 13, 1, C.out, 1, 4);
}), null])).map(fr => fr[0]);   // [frame]; art.js thay tại chỗ

// ---------------------------------------------------------------- module state
const st = {
  ctx: null, on: false, phase: 'off', t: 0, dim: 0, wait: 0, toastI: 0,
  lyron: null, arrive: null, seat: null, bubble: null, fx: [], openReef: null,
  rideT: 0, wasCaught: false, reefHit: false, reefFixT: 0, hermitT: 0, ghostForced: false, ghostT: 0, ghostNear: false, bottleShown: false, bottleT: 0,
  curShown: null, goalDelay: 1.2, cut: null, drift: null, scarf: null, meetOpen: false, lastPos: null, stuckT: 0
};
const tileOf = v => Math.floor(v / TILE);
const isWaterT = (ctx, t) => t === ctx.T.WATER || t === ctx.T.DEEP || t === ctx.T.REEF;
function waterAt(ctx, x, y) { const m = ctx.S.map; if (x < 0 || y < 0 || x >= m.w || y >= m.h) return false; return isWaterT(ctx, ctx.getG(m, x, y)) && !ctx.hasObjectAt(m, x, y); }
const waterPass = ctx => (m, tx, ty) => waterAt(ctx, tx, ty);
function restore(p) { p.speedMul = 1; p.passable = null; p.custom = null; p.ghost = false; p.boxW = 10; p.boxH = 6; }
const onRaft = ctx => !!(ctx.S.sea && ctx.S.sea.riding === 'raft' && !ctx.S.sea.diving);
const raftInfo = () => { try { return typeof window !== 'undefined' && window.__raft && window.__raft.info ? window.__raft.info() : null; } catch (e) { return null; } };
const raidState = () => { try { return typeof window !== 'undefined' && window.__seaRaid && window.__seaRaid.state ? window.__seaRaid.state() : null; } catch (e) { return null; } };
const story = ctx => ctx.story();
const has = (ctx, f) => !!(story(ctx).step & f);
const dockPx = ctx => ({ x: ctx.S.map.dock.x * TILE + 8, y: ctx.S.map.dock.y * TILE + 8 });
function nearestWater(ctx, at, rmax = 14, r0 = 0) {
  for (let r = r0; r <= rmax; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
    const x = at.x + dx, y = at.y + dy; if (waterAt(ctx, x, y)) return { x, y };
  }
  return null;
}
function flowAt(ctx, x, y) { const m = ctx.S.map, tx = tileOf(x), ty = tileOf(y); if (!m.flow || tx < 0 || ty < 0 || tx >= m.w || ty >= m.h) return 0; return m.flow[ty * m.w + tx]; }
function flowVec(ctx, f) { const Fl = ctx.FLOW; return [f === Fl.R ? 1 : f === Fl.L ? -1 : 0, f === Fl.D ? 1 : f === Fl.U ? -1 : 0]; }
function persistStep(ctx, flag) { const s = story(ctx); if ((s.step & flag) === flag) return; s.step |= flag; ctx.persist(); }
function say(text, secs = 5) { if (text) st.bubble = { text, t: secs }; }
// sea_raft.js shows its own three tutorial toasts ("You wake on a raft…") on a fresh save; Lyron's lines replace them in act 1.
function killRaftTut(ctx) {
  const sys = ctx.S.save.sys; if (sys) { sys.seaRaft = sys.seaRaft || {}; sys.seaRaft.seen = true; }
  const i = raftInfo(); if (i && i.tut) i.tut.t = 1e9;
}
function buildOpenReef(ctx) {
  const m = ctx.S.map, T = ctx.T; st.openReef = new Uint8Array(m.w * m.h);
  for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
    if (ctx.getG(m, x, y) !== T.REEF) continue;
    let open = true;
    for (let dy = -2; dy <= 2 && open; dy++) for (let dx = -2; dx <= 2; dx++) if (ctx.getG(m, x + dx, y + dy) === T.SAND) { open = false; break; }
    if (open) st.openReef[y * m.w + x] = 1;
  }
}
function nearOpenReef(ctx) {
  const p = ctx.S.player, m = ctx.S.map, tx = tileOf(p.x), ty = tileOf(p.y);
  for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) { if (dx * dx + dy * dy > 9) continue; const x = tx + dx, y = ty + dy; if (x < 0 || y < 0 || x >= m.w || y >= m.h) continue; if (st.openReef[y * m.w + x]) return true; }
  return false;
}

// ---------------------------------------------------------------- particles
function ring(x, y, s = 1) { st.fx.push({ k: 'ring', x, y, t: 0.7 * s, life: 0.7 * s, r0: 3 * s, r1: 14 * s }); }
function bubble(x, y) { st.fx.push({ k: 'bub', x, y, vx: (Math.random() - 0.5) * 8, vy: -12 - Math.random() * 12, t: 0.8 + Math.random() * 0.6, life: 1.4, r: 1 + Math.random() * 1.5 }); }
function updateFx(dt) {
  for (let i = st.fx.length - 1; i >= 0; i--) { const p = st.fx[i]; p.t -= dt; if (p.t <= 0) { st.fx.splice(i, 1); continue; } if (p.vx !== undefined) { p.x += p.vx * dt; p.y += p.vy * dt; } }
  if (st.fx.length > 120) st.fx.splice(0, st.fx.length - 120);
}
function drawFx(g, cx, cy) {
  for (const p of st.fx) {
    const k = Math.max(0, p.t / p.life), x = Math.round(p.x) - cx, y = Math.round(p.y) - cy;
    if (p.k === 'ring') { g.globalAlpha = k * 0.75; g.strokeStyle = '#dff0ff'; g.lineWidth = 1; g.beginPath(); const r = p.r0 + (p.r1 - p.r0) * (1 - k); g.ellipse(x, y, r, r * 0.45, 0, 0, TAU); g.stroke(); }
    else { g.globalAlpha = Math.min(1, k * 1.5) * 0.8; g.strokeStyle = '#e8fbff'; g.lineWidth = 1; g.beginPath(); g.arc(x, y, p.r, 0, TAU); g.stroke(); }
  }
  g.globalAlpha = 1;
}

// ---------------------------------------------------------------- Lyron (an NPC in S.npcs: the core labels him ♥ Lyron and leaves talking to us)
function ensureLyron(ctx) {
  if (st.lyron && ctx.S.npcs.includes(st.lyron)) return st.lyron;
  const p = ctx.S.player, n = new NPC(ctx.FRIEND, p.x, p.y, ctx.friendSheet(), ctx.rngFrom(7));
  n.busy = true; n.ghost = true; n.radius = 0; n.custom = drawNothing; n.lyron = true;
  ctx.S.npcs.push(n); st.lyron = n; return n;
}
function removeLyron(ctx) { if (!st.lyron) return; const i = ctx.S.npcs.indexOf(st.lyron); if (i >= 0) ctx.S.npcs.splice(i, 1); st.lyron = null; }
function drawNothing() { }
// where Lyron sits: the bow seat of the raft you ride (facing your way), or the raft's resting spot when you are ashore / diving
function seatOf(ctx) {
  const p = ctx.S.player, s = ctx.S.sea;
  if (onRaft(ctx)) return { x: p.x + (p.dir === 1 ? -11 : 11), y: p.y + 0.3, dir: p.dir, on: 'raft' };
  const i = raftInfo(), sunk = !!(i && i.sinkT > 0);
  return { x: s.x, y: s.y + (sunk ? 0.3 : 2.3), dir: 0, on: sunk ? 'water' : (i && i.parked ? 'parked' : 'water') };
}
function drawFriendFrame(g, x, y, dir, seated, t) {   // top-left (x, y); seated = legs tucked (16 rows), else the full 20-row frame
  const sheet = st.ctx.friendSheet();
  g.drawImage(sheet, 0, dir * 20, 16, seated ? 16 : 20, x, y, 16, seated ? 16 : 20);
  st.ctx.drawScarf(g, x, y, dir, t);
}
function drawWave(g, x, y, t) {   // a raised waving arm beside a frame whose top-left is (x, y)
  if (Math.sin(t * 5) <= 0.2) return;
  const up = Math.round(Math.sin(t * 15) * 1.5);
  px(g, x + 15, y + 2 + up, C.out, 3, 8); px(g, x + 16, y + 3 + up, '#f6d3b5', 1, 6);
}
function drawPassenger(g, ent) {
  const seat = st.seat; if (!seat) return;
  const x = Math.round(ent.x), y = Math.round(ent.y), bob = Math.round(Math.sin(st.t * 2.6)), t = st.t;
  if (seat.on === 'water') {                                          // treading water beside the wreck spot
    g.drawImage(st.ctx.friendSheet(), 0, 0, 16, 12, x - 8, y - 14 + bob, 16, 12); st.ctx.drawScarf(g, x - 8, y - 14 + bob, 0, t);
    g.fillStyle = 'rgba(80,160,200,.55)'; g.fillRect(x - 8, y - 3 + bob, 16, 1);
    g.strokeStyle = 'rgba(223,240,255,.5)'; g.lineWidth = 1; g.beginPath(); g.ellipse(x, y - 1, 10, 3, 0, 0, TAU); g.stroke();
    return;
  }
  if (seat.on === 'parked') {                                         // the raft system draws the moored raft under him
    drawFriendFrame(g, x - 8, y - 18 + bob, 0, true, t); return;
  }
  drawFriendFrame(g, x - 8, y - 16 + bob, seat.dir, true, t);
}
function drawArrivingRaft(g, ent) {
  const a = st.arrive; if (!a) return;
  const x = Math.round(ent.x), y = Math.round(ent.y), bob = Math.round(Math.sin(st.t * 2.6)), f = Math.floor(st.t * 3) & 1, left = a.dx < 0;
  g.fillStyle = 'rgba(20,60,110,.28)'; g.beginPath(); g.ellipse(x, y + 3, 16, 5, 0, 0, TAU); g.fill();
  g.drawImage(RAFT, x - 16, y - 13 + bob);
  const dir = Math.abs(a.dx) >= Math.abs(a.dy) ? (a.dx > 0 ? 2 : 1) : (a.dy > 0 ? 0 : 3);
  drawFriendFrame(g, x - 8, y - 26 + bob, dir, false, st.t);
  drawWave(g, x - 8, y - 26 + bob, st.t);
  g.drawImage(SAIL[f][left ? 1 : 0], left ? x - 21 : x - 9, y - 39 + bob);
  if (a.k < 1) { const wx = x - a.dx * 14, wy = y + 2 - a.dy * 4; g.strokeStyle = 'rgba(223,243,255,.6)'; g.lineWidth = 1; g.beginPath(); g.ellipse(wx, wy, 8 + (st.t * 20 % 8), 3, 0, 0, TAU); g.stroke(); }
}

// ---------------------------------------------------------------- the player on a plank
function drawPlank(g, ent) {
  const x = Math.round(ent.x), y = Math.round(ent.y), bob = Math.round(Math.sin(st.t * 2.2) * 1.5);
  g.fillStyle = 'rgba(20,60,110,.25)'; g.beginPath(); g.ellipse(x, y + 2, 11, 4, 0, 0, TAU); g.fill();
  g.drawImage(PLANK, x - 9, y - 5 + bob);
  g.drawImage(ent.sheet, 0, 0, 16, 14, x - 8, y - 17 + bob, 16, 14);          // kneeling: head + torso from your own sheet
  g.fillStyle = 'rgba(223,243,255,.6)'; g.fillRect(x - 12, y + 1 + bob, 4, 1); g.fillRect(x + 9, y + bob, 3, 1);
}
function toPlank(ctx) {
  const p = ctx.S.player, s = ctx.S.sea;
  s.riding = 'plank'; s.diving = false; p.custom = drawPlank; p.passable = waterPass(ctx); p.speedMul = 0; p.boxW = 10; p.boxH = 6; p.ghost = false; p.dir = 0;
}
// the current carries the plank (~1 tile/s); still water drifts it gently south, or towards `target` when given
function driftPlank(dt, ctx, target) {
  const p = ctx.S.player, f = flowAt(ctx, p.x, p.y - 2);
  let vx = 0, vy = 0;
  if (f) { const [fx, fy] = flowVec(ctx, f); vx = fx * PLANK_PX; vy = fy * PLANK_PX; }
  if (target) {
    const dx = target.x - p.x, dy = target.y - p.y, d = Math.hypot(dx, dy) || 1, sp = f ? 6 : 14;
    vx += dx / d * sp; vy += dy / d * sp;
  } else if (!f) { vy = STILL_PX; vx = Math.sin(st.t * 0.8) * 4; }
  return p.tryMove(vx * dt, vy * dt, ctx.S.map, ctx.allNpcs());
}

// ---------------------------------------------------------------- phases: adrift → Lyron arrives → ride
function startPlank(ctx) {
  toPlank(ctx);
  st.phase = 'plank'; st.wait = WAIT; st.dim = DIM; st.toastI = 0; st.t = 0;
}
function startArrive(ctx) {
  const p = ctx.S.player, m = ctx.S.map;
  // from the nearest current: pick, among 8 headings, the one closest to it with the longest open-water run
  let cur = null, bd = Infinity;
  for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) { if (!m.flow[y * m.w + x]) continue; const d = Math.hypot(x - tileOf(p.x), y - tileOf(p.y)); if (d < bd && d > 2) { bd = d; cur = { x, y }; } }
  const want = cur ? Math.atan2(cur.y - tileOf(p.y), cur.x - tileOf(p.x)) : Math.PI / 2;
  let best = null, bs = -Infinity;
  for (let k = 0; k < 8; k++) {
    const a = k * TAU / 8, dx = Math.cos(a), dy = Math.sin(a); let run = 0;
    for (let r = 1; r <= 10; r++) { if (!waterAt(ctx, Math.round(tileOf(p.x) + dx * r), Math.round(tileOf(p.y) + dy * r))) break; run = r; }
    let da = Math.abs(a - want); da = Math.min(da, TAU - da);
    const score = run * 2 - da; if (score > bs) { bs = score; best = { dx, dy, run }; }
  }
  const dist = Math.max(4, Math.min(9, best.run)) * TILE;
  st.arrive = { dx: -best.dx, dy: -best.dy, sx: p.x + best.dx * dist, sy: p.y + best.dy * dist, k: 0, x: 0, y: 0 };
  const n = ensureLyron(ctx); n.custom = drawArrivingRaft; n.x = st.arrive.sx; n.y = st.arrive.sy;
  st.phase = 'arrive'; st.t = 0; st.meetOpen = false;
  ctx.toast(L(ctx).sail, true); ctx.sfx('splash');
}
function updateArrive(dt, ctx) {
  const a = st.arrive, p = ctx.S.player, n = ensureLyron(ctx);
  if (st.dim > 0) st.dim = Math.max(0, st.dim - dt * (DIM / 2.5));
  if (ctx.S.mode === 'play') a.k = Math.min(1, a.k + dt / ARRIVE);
  const e = 1 - (1 - a.k) * (1 - a.k), tx = p.x - a.dx * 26, ty = p.y - a.dy * 26;   // ease out, stop beside the plank
  n.x = a.sx + (tx - a.sx) * e; n.y = a.sy + (ty - a.sy) * e;
  if (a.k >= 1 && !st.meetOpen && ctx.S.mode === 'play') {
    st.meetOpen = true; ctx.setMode('dialog');
    ctx.openDialog({ m: ctx.FRIEND, pages: L(ctx).meet.slice(), onClose: () => { ctx.setMode('play'); boardLyron(ctx); } });
  }
}
function boardLyron(ctx) {
  const p = ctx.S.player, s = ctx.S.sea, n = ensureLyron(ctx);
  const at = { x: tileOf(n.x), y: tileOf(n.y) }, spot = waterAt(ctx, at.x, at.y) ? at : (nearestWater(ctx, at) || { x: tileOf(p.x), y: tileOf(p.y) });
  p.x = spot.x * TILE + 8; p.y = spot.y * TILE + 14; p.custom = null; p.passable = waterPass(ctx); p.speedMul = 0.8; p.boxW = 14; p.boxH = 8;
  s.riding = 'raft'; s.diving = false; s.x = p.x; s.y = p.y; s.raft.hp = 3; s.raft.max = 6; s.raft.sail = false;
  persistStep(ctx, F.ABOARD); ctx.sfx('splash'); ring(p.x, p.y, 1.2);
  st.arrive = null; st.dim = 0; startRide(ctx);
}
function attachRaft(ctx) {   // never strand: put the player (and so Lyron) on the raft at the nearest water tile
  const p = ctx.S.player, s = ctx.S.sea, at = { x: tileOf(p.x), y: tileOf(p.y) };
  const spot = waterAt(ctx, at.x, at.y) ? at : nearestWater(ctx, at, 16, 1); if (!spot) return false;
  p.x = spot.x * TILE + 8; p.y = spot.y * TILE + 14; p.custom = null; p.passable = waterPass(ctx); p.speedMul = 0.8; p.boxW = 14; p.boxH = 8; p.ghost = false;
  s.riding = 'raft'; s.diving = false; s.x = p.x; s.y = p.y; if (s.raft.hp < 1) s.raft.hp = 1;
  ring(p.x, p.y, 1); return true;
}
function startRide(ctx) {
  const n = ensureLyron(ctx); n.custom = drawPassenger;
  st.phase = 'ride'; st.rideT = 0; st.wasCaught = false; st.curShown = null; st.goalDelay = 1.2;
  st.reefHit = false; st.reefFixT = 0; st.hermitT = 0; st.ghostForced = false; st.ghostT = 0; st.ghostNear = false; st.bottleShown = false; st.bottleT = 0;
}
const curGoal = ctx => GOALS.find(g => !has(ctx, GOAL_FLAG[g])) || 'done';
const doneCount = ctx => GOALS.filter(g => has(ctx, GOAL_FLAG[g])).length;
function finishGoal(ctx, name, line) {
  if (has(ctx, GOAL_FLAG[name])) return;
  persistStep(ctx, GOAL_FLAG[name]); ctx.sfx('coin');
  if (line) { say(line, 4.5); st.goalDelay = 4; } else st.goalDelay = 1;
}
function reefBump(ctx) {
  const s = ctx.S.sea, p = ctx.S.player, t = L(ctx);
  s.raft.hp = Math.min(s.raft.hp, 1); st.reefHit = true; st.reefFixT = 0;
  ctx.toast(t.reefHit, true); ctx.sfx('hit'); ctx.quake(0.5); ring(p.x, p.y, 1.4); say(t.reefBubble, 6); st.curShown = 'reef';
}
function updateRide(dt, ctx) {
  const p = ctx.S.player, s = ctx.S.sea, t = L(ctx), play = ctx.S.mode === 'play', riding = onRaft(ctx), info = raftInfo();
  const caught = !!(info && info.caught), sinking = !!(info && info.sinkT > 0);
  // never strand: on foot with no moored raft (or right at the dock before the climax) → back onto the raft
  if (play && !riding && s.riding !== 'whale' && !s.diving && !sinking) {
    const parked = info && info.parked, far = !parked || Math.hypot(parked.x - tileOf(p.x), parked.y - tileOf(p.y)) > 24;   // islets are ≤ 15 tiles wide: only a raft that is truly gone counts
    if (tileOf(p.y) >= 50 && Math.abs(tileOf(p.x) - ctx.S.map.dock.x) <= 5) { if (attachRaft(ctx)) { startClimax(ctx); return; } }
    else if (s.riding !== 'raft' && s.riding !== 'plank' && far && !ctx.S.swimming) attachRaft(ctx);
  }
  st.seat = seatOf(ctx); const n = ensureLyron(ctx); n.x = st.seat.x; n.y = st.seat.y; n.dir = st.seat.dir;
  if (!play) return;
  if (riding) st.rideT += dt;
  const cur = curGoal(ctx);
  // --- whirlpool: escape once (caught → free), or 90 s of riding
  if (!has(ctx, F.WHIRL)) {
    if (caught && !st.wasCaught) { say(t.mash, 6); st.curShown = 'whirl'; }
    if (st.wasCaught && !caught) finishGoal(ctx, 'whirl', t.escaped);
    else if (st.rideT > WHIRL_T) finishGoal(ctx, 'whirl', null);
  }
  st.wasCaught = caught;
  // --- reef: a scripted bump near an open reef (or after 120 s), then patched back to 3 ♥ (Lyron helps after 150 s)
  if (!has(ctx, F.REEF)) {
    if (!st.reefHit) { if (riding && !caught && (nearOpenReef(ctx) || st.rideT > REEF_WAIT)) reefBump(ctx); }
    else if (s.raft.hp >= 3) finishGoal(ctx, 'reef', t.patched);
    else { st.reefFixT += dt; if (st.reefFixT > REEF_FIX) { s.raft.hp = Math.max(s.raft.hp, 3); ctx.toast(t.lyronPatch); finishGoal(ctx, 'reef', t.patched); } }
  }
  // --- the hermit: sailcloth in the bag, a sail up, or 120 s once it is the goal
  if (!has(ctx, F.HERMIT)) {
    if (ctx.bag.count('sailcloth') >= 1 || s.raft.sail) finishGoal(ctx, 'hermit', t.hermitDone);
    else if (cur === 'hermit') { st.hermitT += dt; if (st.hermitT > HERMIT_T) finishGoal(ctx, 'hermit', null); }
  }
  // --- the ghost ship: forced once when it is the goal (any ship that comes within 10 tiles counts too); gone (left, or shaken off ≥ 14 tiles) or 60 s
  if (!has(ctx, F.GHOST)) {
    const rs = raidState(), sh = rs && rs.ship, d = sh ? Math.hypot(sh.x - p.x, sh.y - p.y) / TILE : Infinity;
    if (cur === 'ghost' && !st.ghostForced) { st.ghostForced = true; st.ghostT = 0; try { if (typeof window !== 'undefined' && window.__seaRaid && window.__seaRaid.ship) window.__seaRaid.ship(); } catch (e) { } }
    if (sh && sh.st === 'sail' && sh.fade > 0.5 && d < 10 && !st.ghostNear) { st.ghostNear = true; st.ghostT = 0; if (st.curShown !== 'ghost') { say(t.goal.ghost, 6); st.curShown = 'ghost'; } }
    if (st.ghostForced || st.ghostNear) {
      st.ghostT += dt;
      if (sh && st.ghostNear && st.ghostT > 3 && (sh.st !== 'sail' || d >= 14)) finishGoal(ctx, 'ghost', t.ghostGone);
      else if (st.ghostT > (sh ? GHOST_T : 8)) finishGoal(ctx, 'ghost', sh ? t.ghostGone : null);
    }
  }
  // --- the bottle: Lyron's story (two dialog pages) once it is the goal and you are riding
  if (!has(ctx, F.BOTTLE) && cur === 'bottle' && riding && !caught) {
    st.bottleT += dt;
    if (st.bottleT > 2.5 && !st.bottleShown) {
      st.bottleShown = true; st.bubble = null; ctx.toast(t.bottleToast); ctx.bag.add('bottle', 1); ctx.sfx('pickup');
      ctx.setMode('dialog');
      ctx.openDialog({ m: ctx.FRIEND, pages: t.bottle.slice(), onClose: () => { ctx.setMode('play'); finishGoal(ctx, 'bottle', null); } });
      return;
    }
  }
  // --- Lyron announces the current goal (after a beat when it changes)
  const now = curGoal(ctx);
  if (now !== st.curShown) { st.goalDelay -= dt; if (st.goalDelay <= 0) { say(t.goal[now], 6); st.curShown = now; } }
  // --- the climax: all five done within 14 tiles of the dock, or the raft reaches row 48 whatever the checklist says
  if (riding && !caught && !(raidState() && raidState().kraken)) {
    const d = dockPx(ctx), dist = Math.hypot(d.x - p.x, d.y - p.y) / TILE;
    if ((now === 'done' && dist <= 14) || tileOf(p.y) >= 48) startClimax(ctx);
  }
}

// ---------------------------------------------------------------- the climax: the Kraken takes Lyron
function startClimax(ctx) {
  if (st.phase === 'cut') return;
  const p = ctx.S.player, t = L(ctx);
  if (!onRaft(ctx) && !attachRaft(ctx)) return;
  const rx = p.x, ry = p.y;
  const ha = Math.atan2(-1, 0);
  st.cut = {
    sub: 'rise', t: 0, rx, ry, dlg: false, k: 0,
    tents: [0, 1, 2, 3].map(i => { const a = ha + Math.PI / 4 + i * Math.PI / 2; return { ang: a, r: 40, x: rx + Math.cos(a) * 40, y: ry + Math.sin(a) * 40, rise: 0, ft: Math.random() * 3 }; }),
    push: null, sinkK: 0, scarfK: 0
  };
  st.phase = 'cut'; st.bubble = null;
  ctx.setMode('cutscene');
  ctx.onAction('cutscene', () => skipClimax(ctx)); ctx.registerCloser('cutscene', () => skipClimax(ctx));
  ctx.quake(1); ctx.sfx('roar'); ctx.toast(t.kraken, true); ctx.alert('');
  for (const tt of st.cut.tents) ring(tt.x, tt.y, 1.5);
}
function pushTarget(ctx) {   // a water tile ~1.8 tiles from the raft, away from the tentacle ring's tightest side
  const c = st.cut, at = { x: tileOf(c.rx), y: tileOf(c.ry) };
  for (const [dx, dy] of [[-2, 0], [2, 0], [0, -2], [0, 2], [-2, -1], [2, -1], [-1, 2], [1, 2]]) if (waterAt(ctx, at.x + dx, at.y + dy)) return { x: (at.x + dx) * TILE + 8, y: (at.y + dy) * TILE + 14 };
  return { x: c.rx, y: c.ry };
}
function updateCut(dt, ctx) {
  const c = st.cut, p = ctx.S.player, t = L(ctx), mode = ctx.S.mode;
  if (st.lyron) {                                                      // while you are still aboard he sits at the bow; once pushed off, the sinking-raft drawable draws him
    if (c.sub === 'rise') { st.seat = seatOf(ctx); st.lyron.x = st.seat.x; st.lyron.y = st.seat.y; st.lyron.dir = st.seat.dir; st.lyron.custom = drawPassenger; }
    else { st.lyron.x = c.rx; st.lyron.y = c.ry; st.lyron.custom = drawNothing; }
  }
  for (const tt of c.tents) tt.ft += dt;
  if (mode !== 'cutscene') return;                                     // paused while his dialog is up
  c.t += dt;
  if (c.sub === 'rise') {
    st.dim = Math.min(DIM, st.dim + dt * DIM / 1.2);
    const k = Math.min(1, c.t / 1.6); for (const tt of c.tents) tt.rise = Math.min(1, k * 1.15);
    if (c.t > 0.5 && Math.random() < dt * 6) bubble(c.rx + (Math.random() - 0.5) * 60, c.ry + (Math.random() - 0.5) * 30);
    if (c.t >= 1.7 && !c.dlg) {
      c.dlg = true; ctx.setMode('dialog');
      ctx.openDialog({ m: ctx.FRIEND, pages: t.cut.slice(), onClose: () => { ctx.setMode('cutscene'); c.sub = 'push'; c.t = 0; c.push = { x0: p.x, y0: p.y, to: pushTarget(ctx) }; toPlank(ctx); ctx.toast(t.pushed); ctx.sfx('splash'); ring(p.x, p.y, 1.2); } });
    }
    return;
  }
  if (c.sub === 'push') {
    const k = Math.min(1, c.t / 0.7), e = 1 - (1 - k) * (1 - k);
    p.x = c.push.x0 + (c.push.to.x - c.push.x0) * e; p.y = c.push.y0 + (c.push.to.y - c.push.y0) * e;
    if (k >= 1) { c.sub = 'sink'; c.t = 0; ctx.sfx('splash'); ctx.toast(t.taken, true); ring(c.rx, c.ry, 2); }
    return;
  }
  if (c.sub === 'sink') {
    const k = Math.min(1, c.t / 2.6); c.sinkK = k;
    for (const tt of c.tents) { tt.r = 40 - 26 * k; tt.x = c.rx + Math.cos(tt.ang) * tt.r; tt.y = c.ry + Math.sin(tt.ang) * tt.r; tt.rise = k < 0.6 ? 1 : Math.max(0.15, 1 - (k - 0.6) * 2.2); }
    if (Math.random() < dt * 14) bubble(c.rx + (Math.random() - 0.5) * 30, c.ry + 2);
    if (Math.random() < dt * 2) ring(c.rx + (Math.random() - 0.5) * 20, c.ry + 2, 1);
    if (k >= 1) { c.sub = 'scarf'; c.t = 0; spawnScarf(ctx, c.rx, c.ry + 2); ctx.toast(t.scarfUp, true); ctx.sfx('splash'); ring(c.rx, c.ry + 2, 1.6); }
    return;
  }
  if (c.sub === 'scarf') {
    const k = Math.min(1, c.t / 1.6); c.scarfK = k;
    for (const tt of c.tents) tt.rise = Math.max(0, 0.15 - k * 0.3);
    st.dim = Math.max(0, DIM * (1 - k));
    if (k >= 1) finishClimax(ctx);
  }
}
function skipClimax(ctx) {
  const c = st.cut; if (!c || ctx.S.mode !== 'cutscene') return;
  if (c.sub === 'rise' || c.sub === 'push') { if (c.sub === 'rise') { c.push = { to: pushTarget(ctx) }; toPlank(ctx); } const p = ctx.S.player; p.x = c.push.to.x; p.y = c.push.to.y; }
  if (!st.scarf) spawnScarf(ctx, c.rx, c.ry + 2);
  finishClimax(ctx);
}
function finishClimax(ctx) {
  const s = story(ctx), t = L(ctx);
  toPlank(ctx);
  s.seaDone = true; s.step |= F.CLIMAX; ctx.storyAct(2); ctx.persist();
  removeLyron(ctx); st.cut = null; st.dim = 0; st.bubble = null;
  st.phase = 'drift'; st.drift = { t: 0 }; st.stuckT = 0; st.lastPos = null;
  if (st.scarf) st.scarf.free = true;
  ctx.setMode('play'); ctx.toast(t.scarfUp);
}
// the plank drifts down the lane (x 44–45, FLOW.D) to the dock, then you step onto the pier
function landingSpot(ctx) { const d = ctx.S.map.dock, east = ctx.S.player.x >= d.x * TILE; return { x: (east ? d.x + 2 : d.x - 2) * TILE + 8, y: (d.y - 1) * TILE + 8 }; }
function nearDock(ctx, tiles = 1.9) {
  const d = ctx.S.map.dock, p = ctx.S.player, tx = p.x / TILE - 0.5, ty = p.y / TILE - 0.5;
  for (let y = d.y - 6; y <= d.y + 2; y++) if (ctx.getG(ctx.S.map, d.x, y) === ctx.T.DOCK) for (let x = d.x - 1; x <= d.x + 1; x++) if (Math.hypot(x - tx, y - ty) <= tiles) return true;
  return false;
}
function updateDrift(dt, ctx) {
  const p = ctx.S.player, d = st.drift, dk = dockPx(ctx);
  if (ctx.S.mode !== 'play') return;
  d.t += dt;
  const dist = Math.hypot(dk.x - p.x, dk.y - p.y) / TILE;
  let target;
  if (dist > 9) { const laneX = 44.5 * TILE; target = Math.abs(p.x - laneX) > 8 ? { x: laneX, y: p.y + 40 } : null; }   // head for the lane, then let it carry you
  else target = landingSpot(ctx);
  const moved = driftPlank(dt, ctx, target);
  if (!moved && dist < 10) st.stuckT += dt; else st.stuckT = 0;
  if (nearDock(ctx) || st.stuckT > 4 || d.t > DRIFT_MAX) land(ctx);
}
function land(ctx) {
  const p = ctx.S.player, s = ctx.S.sea, m = ctx.S.map, t = L(ctx);
  s.riding = null; s.diving = false; restore(p); p.x = m.dock.x * TILE + 8; p.y = m.dock.y * TILE + 14; p.dir = 0;
  s.raft.hp = 1; s.x = p.x; s.y = p.y;
  st.phase = 'landed'; st.drift = null;
  ctx.toast(t.pier, true); ctx.sfx('splash'); ctx.persist();
}

// ---------------------------------------------------------------- the scarf (the keepsake)
function scarfHome(ctx) { const d = ctx.S.map.dock; return { x: (d.x + 2) * TILE + 8, y: (d.y - 3) * TILE + 8 }; }
function spawnScarf(ctx, x, y) { st.scarf = { x, y, ph: Math.random() * TAU, t: 0, free: false, home: null, taken: false }; }
function updateScarf(dt, ctx) {
  const sc = st.scarf; if (!sc || sc.taken) return;
  sc.t += dt; sc.ph += dt * 2;
  if (sc.free) {                                                       // drifts along the current and settles beside the dock
    if (!sc.home) { const d = ctx.S.map.dock, east = sc.x >= d.x * TILE; sc.home = { x: (east ? d.x + 2 : d.x - 2) * TILE + 8, y: (d.y - 3) * TILE + 8 }; }
    const dx = sc.home.x - sc.x, dy = sc.home.y - sc.y, dd = Math.hypot(dx, dy);
    if (dd > 3 && sc.t > 2) { const f = flowAt(ctx, sc.x, sc.y), [fx, fy] = flowVec(ctx, f), sp = 18; sc.x += (dx / dd * sp + fx * 8) * dt; sc.y += (dy / dd * sp + fy * 8) * dt; }
  }
  const p = ctx.S.player, s = story(ctx);
  if (s.keepsake) { sc.taken = true; return; }
  if (ctx.S.mode === 'play' && ctx.S.sea && !ctx.S.sea.diving && Math.hypot(sc.x - p.x, sc.y - (p.y - 4)) < 13) pickScarf(ctx);
}
function pickScarf(ctx) {
  const sc = st.scarf, s = story(ctx); if (!sc || sc.taken) return;
  sc.taken = true; s.keepsake = true; ctx.bag.add('scarf', 1); ctx.persist(); ctx.achieve('keepsake');
  ctx.toast(L(ctx).scarfGot, true); ctx.sfx('win'); ring(sc.x, sc.y, 1.2);
}

// ---------------------------------------------------------------- drawing helpers
function drawTent(g, tt, sx, sy) {
  const fr = st.cut && st.cut.sub === 'sink' ? 2 : (Math.floor(tt.ft * 2.5) % 2), img = TENT[fr][tt.x < (st.cut ? st.cut.rx : tt.x) ? 0 : 1];
  const sh = Math.max(1, Math.round(32 * tt.rise));
  g.fillStyle = 'rgba(20,30,80,.35)'; g.beginPath(); g.ellipse(sx, sy, 7, 3, 0, 0, TAU); g.fill();
  g.drawImage(img, 0, 32 - sh, 16, sh, sx - 8, sy - sh + 2, 16, sh);
  g.fillStyle = 'rgba(223,243,255,.7)'; g.fillRect(sx - 6, sy + 1, 3, 1); g.fillRect(sx + 3, sy, 3, 1);
}
function drawSinkingRaft(g, c, cx, cy) {
  const x = Math.round(c.rx) - cx, y = Math.round(c.ry) - cy, k = c.sub === 'sink' ? c.sinkK : c.sub === 'scarf' ? 1 : 0, bob = Math.round(Math.sin(st.t * 2.6));
  if (k >= 1) return;
  const dy = Math.round(30 * k * k), tilt = Math.round(k * 6);
  g.fillStyle = 'rgba(20,60,110,.28)'; g.beginPath(); g.ellipse(x, y + 3, 16 * (1 - k * 0.6), 5, 0, 0, TAU); g.fill();
  g.save(); g.beginPath(); g.rect(x - 24, y - 50, 48, 54); g.clip();
  g.drawImage(RAFT, x - 16, y - 13 + bob + dy + tilt);
  const dir = ctx_dirTo(c);
  drawFriendFrame(g, x - 8, y - 26 + bob + dy, dir, false, st.t);
  if (c.sub !== 'scarf') drawWave(g, x - 8, y - 26 + bob + dy, st.t * 2);
  g.restore();
  g.fillStyle = 'rgba(223,243,255,.8)'; for (let i = -14; i <= 14; i += 4) g.fillRect(x + i, y + 3 + ((i / 4) & 1), 2, 1);
}
function ctx_dirTo(c) { const p = st.ctx.S.player, dx = p.x - c.rx, dy = p.y - c.ry; return Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 2 : 1) : (dy > 0 ? 0 : 3); }
function wrapLines(ug, text, maxW) {
  const words = text.split(' '), lines = []; let cur = '';
  for (const w of words) { const test = cur ? cur + ' ' + w : w; if (ug.measureText(test).width > maxW && cur) { lines.push(cur); cur = w; } else cur = test; }
  if (cur) lines.push(cur);
  if (lines.length > 2) { const rest = lines.slice(1).join(' '); lines.length = 1; lines.push(rest); }
  return lines;
}

// ---------------------------------------------------------------- the system
export const storySea = {
  id: 'storySea',

  onZoneEnter(ctx) {
    st.ctx = ctx; st.on = false; st.phase = 'off'; st.dim = 0; st.lyron = null; st.arrive = null; st.seat = null; st.bubble = null; st.fx = []; st.cut = null; st.drift = null; st.scarf = null; st.meetOpen = false; st.t = 0;
    if (!ctx.S.map || !ctx.S.map.sea || !ctx.S.sea) return;
    const s = story(ctx), sea = ctx.S.sea;
    buildOpenReef(ctx);
    if (s.act !== 1 || s.seaDone) {                                    // after the prologue: only the scarf, if it was never picked up
      st.on = true; st.phase = 'landed';
      if (!s.keepsake) { const h = scarfHome(ctx); spawnScarf(ctx, h.x, h.y); st.scarf.home = h; }
      return;
    }
    st.on = true; killRaftTut(ctx);
    const onWater = sea.riding === 'raft';
    if (!(s.step & F.ABOARD)) {
      if (onWater) startPlank(ctx);
      else { if (attachRaft(ctx)) { persistStep(ctx, F.ABOARD); startRide(ctx); } else startPlank(ctx); }
    } else { if (!onWater) attachRaft(ctx); startRide(ctx); }
    ctx.persist();
  },

  onZoneLeave(ctx) {
    if (ctx.S.sea && ctx.S.sea.riding === 'plank') { restore(ctx.S.player); ctx.S.sea.riding = null; }
    if (ctx.S.mode === 'cutscene') ctx.setMode('play');
    removeLyron(ctx);
    st.on = false; st.phase = 'off'; st.cut = null; st.drift = null; st.scarf = null; st.bubble = null; st.fx = []; st.dim = 0; st.arrive = null;
  },

  update(dt, ctx) {
    st.t += dt; st.ctx = ctx;
    if (!st.on || !ctx.S.sea) return;
    updateFx(dt);
    if (st.bubble) { st.bubble.t -= dt; if (st.bubble.t <= 0) st.bubble = null; }
    updateScarf(dt, ctx);
    const t = L(ctx);
    if (st.phase === 'plank') {
      if (ctx.S.sea.riding !== 'plank') toPlank(ctx);                  // another system touched the player: take him back
      if (ctx.S.mode === 'play') {
        driftPlank(dt, ctx, null);
        const marks = [[1.0, t.wake, true], [5.5, t.noPaddle, false]];
        if (st.toastI < marks.length && st.t >= marks[st.toastI][0]) { ctx.toast(marks[st.toastI][1], marks[st.toastI][2]); st.toastI++; }
        st.wait -= dt; if (st.wait <= 0) startArrive(ctx);
      }
    } else if (st.phase === 'arrive') {
      if (ctx.S.sea.riding !== 'plank') toPlank(ctx);
      if (ctx.S.mode === 'play') driftPlank(dt, ctx, null);
      updateArrive(dt, ctx);
    } else if (st.phase === 'ride') updateRide(dt, ctx);
    else if (st.phase === 'cut') updateCut(dt, ctx);
    else if (st.phase === 'drift') { if (ctx.S.sea.riding !== 'plank') toPlank(ctx); updateDrift(dt, ctx); }
  },

  near(ctx) {
    if (!st.on || !ctx.S.sea) return null;
    const t = L(ctx), p = ctx.S.player;
    if (st.phase === 'ride' && !has(ctx, F.HERMIT) && !ctx.S.sea.diving && ctx.bag.has('shell', 2)) {
      const h = ctx.S.npcs.find(n => n.hermit);
      if (h) { const d = Math.hypot(h.x - p.x, h.y - p.y); if (d < 26) return { label: t.trade, x: h.x, y: h.y, limit: 26, priority: 3, data: { trade: true } }; }
    }
    const sc = st.scarf;
    if (sc && !sc.taken && !ctx.S.sea.diving) { const d = Math.hypot(sc.x - p.x, sc.y - p.y); if (d < 30) return { label: t.scarfPick, x: sc.x, y: sc.y, limit: 30, priority: 2, data: { scarf: true } }; }
    return null;
  },

  interact(ctx, cand) {
    const d = cand && cand.data; if (!d) return;
    const t = L(ctx);
    if (d.trade) {
      if (!ctx.bag.has('shell', 2) || has(ctx, F.HERMIT)) return;
      ctx.bag.remove('shell', 2); ctx.bag.add('sailcloth', 1); ctx.persist(); ctx.sfx('coin'); ctx.toast(t.traded, true);
      const h = ctx.S.npcs.find(n => n.hermit); if (h) ctx.S.player.faceTo(h.x, h.y);
      finishGoal(ctx, 'hermit', t.hermitDone);
      return;
    }
    if (d.scarf) pickScarf(ctx);
  },

  drawables(ctx, cx, cy) {
    if (!st.on) return [];
    const out = [], g = ctx.g, VW = ctx.VW, VH = ctx.VH;
    const c = st.cut;
    if (c) {
      for (const tt of c.tents) { if (tt.rise <= 0) continue; const sx = Math.round(tt.x) - cx, sy = Math.round(tt.y) - cy; out.push({ y: tt.y, f: () => drawTent(g, tt, sx, sy) }); }
      if (c.sub !== 'rise') out.push({ y: c.ry + 2, f: () => drawSinkingRaft(g, c, cx, cy) });   // during the rise the raft system still draws the raft you sit on
    }
    const sc = st.scarf;
    if (sc && !sc.taken && sc.x - cx > -20 && sc.y - cy > -20 && sc.x - cx < VW + 20 && sc.y - cy < VH + 20) {
      const rise = c && c.sub === 'scarf' ? Math.round((1 - c.scarfK) * 6) : 0, alpha = c && c.sub === 'scarf' ? Math.min(1, c.scarfK * 2) : 1;
      const x = Math.round(sc.x) - cx, y = Math.round(sc.y) - cy + Math.round(Math.sin(sc.ph) * 1.5) + rise, img = SCARF[Math.sin(sc.ph * 0.7) > 0 ? 1 : 0];
      out.push({ y: sc.y - 1, f: () => { g.globalAlpha = alpha; g.strokeStyle = 'rgba(223,240,255,.5)'; g.lineWidth = 1; g.beginPath(); g.ellipse(x, y + 2, 9 + Math.sin(sc.ph) * 1.5, 3, 0, 0, TAU); g.stroke(); g.drawImage(img, x - 7, y - 3); g.globalAlpha = 1; } });
    }
    return out;
  },

  draw(g, ctx, cx, cy) {
    if (!st.on) return;
    drawFx(g, cx, cy);
    if (st.dim > 0.005) {                                              // a soft dark vignette: adrift, and while the Kraken rises (≤ 35 %)
      const VW = ctx.VW, VH = ctx.VH, gr = g.createRadialGradient(VW / 2, VH / 2, VH * 0.2, VW / 2, VH / 2, VH * 0.85);
      gr.addColorStop(0, `rgba(6,8,24,${(st.dim * 0.45).toFixed(3)})`); gr.addColorStop(1, `rgba(6,8,24,${st.dim.toFixed(3)})`);
      g.fillStyle = gr; g.fillRect(0, 0, VW, VH);
    }
  },

  drawUI(ug, ctx, cx, cy, scale) {
    if (!st.on) return;
    const t = L(ctx), W = ug.canvas.width, H = ug.canvas.height;
    ug.save();
    const b = st.bubble;
    if (b && (st.phase === 'ride' || st.phase === 'arrive')) {          // Lyron's speech bubble above the raft (crisp text, ≤ 2 lines)
      const p = ctx.S.player, n = st.lyron, ax = Math.round(((n ? n.x : p.x) - cx) * scale), ay = Math.round(((n ? n.y : p.y) - 30 - cy) * scale);
      const fs = Math.max(11, Math.round(scale * 3.4)); ug.font = `bold ${fs}px "Segoe UI",system-ui,sans-serif`;
      const lines = wrapLines(ug, b.text, Math.max(180, scale * 110)), lh = fs + 3;
      const w = Math.max(...lines.map(l => ug.measureText(l).width)) + fs * 1.4, h = lines.length * lh + fs * 0.9;
      let bx = ax - w / 2; bx = Math.max(6, Math.min(W - w - 6, bx)); const by = ay - h - 10;
      ug.globalAlpha = Math.min(1, b.t / 0.5);
      ug.fillStyle = 'rgba(255,248,240,.96)'; ug.beginPath(); ug.roundRect(bx, by, w, h, 7); ug.fill();
      ug.strokeStyle = C.scarf; ug.lineWidth = 2; ug.stroke();
      ug.fillStyle = 'rgba(255,248,240,.96)'; ug.beginPath(); ug.moveTo(ax - 6, by + h - 1); ug.lineTo(ax + 6, by + h - 1); ug.lineTo(ax, by + h + 8); ug.closePath(); ug.fill();
      ug.strokeStyle = C.scarf; ug.beginPath(); ug.moveTo(ax - 6, by + h); ug.lineTo(ax, by + h + 8); ug.lineTo(ax + 6, by + h); ug.stroke();
      ug.fillStyle = '#2a1a1e'; ug.textAlign = 'center'; ug.textBaseline = 'top';
      lines.forEach((l, i) => ug.fillText(l, bx + w / 2, by + fs * 0.45 + i * lh));
      ug.globalAlpha = 1;
    }
    if (st.phase === 'cut' && ctx.S.mode === 'cutscene') {
      const fs = Math.max(11, Math.round(scale * 3)); ug.font = `bold ${fs}px "Segoe UI",system-ui,sans-serif`; ug.textAlign = 'right'; ug.textBaseline = 'bottom';
      ug.fillStyle = 'rgba(13,11,20,.6)'; const tw = ug.measureText(t.skip).width + 12; ug.beginPath(); ug.roundRect(W - tw - 12, H - fs - 22, tw, fs + 8, 5); ug.fill();
      ug.fillStyle = '#f2ebe0'; ug.fillText(t.skip, W - 18, H - 16);
    }
    ug.restore();
  },

  hudLines(ctx) {
    if (!st.on) return [];
    const t = L(ctx);
    if (st.phase === 'ride') return [`${t.hud} · ${t.short[curGoal(ctx)]} (${doneCount(ctx)}/5)`];
    if (st.phase === 'drift') return [t.drifting];
    return [];
  }
};

// ---------------------------------------------------------------- test hooks
if (typeof window !== 'undefined') {
  window.__storySea = {
    state: () => {
      const ctx = st.ctx; if (!ctx || !ctx.S.save) return null;
      const s = story(ctx), p = ctx.S.player;
      return { act: s.act, step: s.step, seaDone: s.seaDone, keepsake: s.keepsake, phase: st.phase, cur: st.on && st.phase === 'ride' ? curGoal(ctx) : null,
        flags: { aboard: !!(s.step & F.ABOARD), whirl: !!(s.step & F.WHIRL), reef: !!(s.step & F.REEF), hermit: !!(s.step & F.HERMIT), ghost: !!(s.step & F.GHOST), bottle: !!(s.step & F.BOTTLE) },
        lyron: st.lyron ? { x: Math.round(st.lyron.x), y: Math.round(st.lyron.y), inNpcs: ctx.S.npcs.includes(st.lyron) } : null,
        player: { x: Math.round(p.x), y: Math.round(p.y), tx: tileOf(p.x), ty: tileOf(p.y), custom: !!p.custom, speedMul: p.speedMul }, riding: ctx.S.sea ? ctx.S.sea.riding : null, hp: ctx.S.sea ? ctx.S.sea.raft.hp : null,
        mode: ctx.S.mode, dim: +st.dim.toFixed(2), bubble: st.bubble ? st.bubble.text : null, rideT: Math.round(st.rideT), cut: st.cut ? { sub: st.cut.sub, t: +st.cut.t.toFixed(1) } : null,
        scarf: st.scarf ? { x: Math.round(st.scarf.x), y: Math.round(st.scarf.y), taken: st.scarf.taken, free: st.scarf.free } : null, wait: +st.wait.toFixed(1) };
    },
    skipWait: () => { if (st.phase === 'plank') { st.wait = 0; return 'arriving'; } return st.phase; },
    completeStep: name => { const ctx = st.ctx; if (!ctx || !GOAL_FLAG[name]) return 'unknown'; finishGoal(ctx, name, null); return curGoal(ctx); },
    completeAll: () => { const ctx = st.ctx; if (!ctx) return null; persistStep(ctx, ALL5); st.goalDelay = 0.2; return story(ctx).step; },
    climax: () => { const ctx = st.ctx; if (!ctx || st.phase !== 'ride') return st.phase; startClimax(ctx); return st.phase; },
    skipCut: () => { if (st.ctx) skipClimax(st.ctx); return st.phase; },
    warp: (tx, ty) => { const p = st.ctx.S.player; p.x = tx * TILE + 8; p.y = ty * TILE + 14; return { x: p.x, y: p.y }; }
  };
}
