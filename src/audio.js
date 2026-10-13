// audio.js — âm thanh game (2026-10-10 anh yêu cầu "âm thanh cho game và effect âm thanh"). 100% tổng hợp bằng Web Audio, không tải file nào.
//   Nhạc nền: bài soạn sẵn mỗi vùng (audio/songs.js) + biến thể đêm (đổi mượt, cùng nhịp), nhỏ lại khi hội thoại, nghẹt nhẹ khi mở túi/bảng; nhạc ngắn (stinger) khi lên cấp, nhận huy hiệu, chọn phe…
//   Tiếng động: thư viện kiểu sfxr (audio/sfxlib.js, dựng bằng audio/dsp.js). Tên cũ hit/chop/pickup/coin/craft/build/squeak/roar/splash/alarm/fail/win vẫn chạy, tên lạ → 'hit'.
//   Tự phủ mà không phải sửa nhiều file: VFX → tiếng (vfxSound, gọi từ systems/vfx.js), bấm nút / đổi thẻ / chọn ô (1 bộ nghe chung trên document),
//   bước chân · chèo bè · bơi · câu cá · bị đánh · quái kêu · ngày đêm · cốt truyện (audioTick gọi mỗi khung từ main.js).
//   Gộp lô: mọi tiếng trong cùng 1 khung được gộp → tiếng chung chung ('hit', 'coin'…) nhường chỗ cho tiếng cụ thể hơn của VFX/trạng thái, tránh kêu chồng.
// API cũ giữ nguyên: initAudio, setZone, setEnabled/isEnabled (bật tắt NHẠC), getVolume/setVolume (cả hai), blip(freq), sfx(name).
// API mới: getMusicVolume/setMusicVolume, getSfxVolume/setSfxVolume, audioTick(S, dt, CTX), vfxSound(name, ok, dur), stinger(id), playTrack(id). Móc test: window.__audio.
import { createMixer } from './audio/mixer.js';
import { SFX_LIB, SFX_ALIAS } from './audio/sfxlib.js';
import { TRACKS, STINGERS } from './audio/songs.js';

let ac = null, M = null, timer = null, hidden = false;
let musicOn = true;

/* ---------------- âm lượng (0–1; 0,5 = mức chuẩn; khoá cũ 'seismic.vol' vẫn được đọc) ---------------- */
const clamp01 = v => Math.max(0, Math.min(1, Number(v) || 0));
const lsGet = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, String(v)); } catch (e) { } };
const numOr = (s, d) => { const v = parseFloat(s); return isNaN(v) ? d : clamp01(v); };
const legacyVol = numOr(lsGet('seismic.vol'), 0.5);
let mVol = numOr(lsGet('seismic.vol.music'), legacyVol), sVol = numOr(lsGet('seismic.vol.sfx'), legacyVol);
const curve = v => (v <= 0 ? 0 : Math.pow(v / 0.5, 1.4));
const MUSIC_K = 0.32, SFX_K = 0.85;   /* nhạc nền nhỏ hơn tiếng động (đo offline: nhạc ~-25 dBFS RMS, tiếng động đỉnh 0,1–0,5) */
function applyLevels() { if (M) M.setLevels({ music: musicOn ? curve(mVol) * MUSIC_K : 0, sfx: curve(sVol) * SFX_K, amb: curve(sVol) * SFX_K }); }
export function getMusicVolume() { return mVol; }
export function setMusicVolume(v) { mVol = clamp01(v); lsSet('seismic.vol.music', mVol); applyLevels(); }
export function getSfxVolume() { return sVol; }
export function setSfxVolume(v) { sVol = clamp01(v); lsSet('seismic.vol.sfx', sVol); applyLevels(); }
export function getVolume() { return Math.max(mVol, sVol); }
export function setVolume(v) { const x = clamp01(v); mVol = sVol = x; lsSet('seismic.vol', x); lsSet('seismic.vol.music', x); lsSet('seismic.vol.sfx', x); applyLevels(); }   /* thanh âm lượng chung (màn hình chính) */

/* ---------------- nhật ký cho test ---------------- */
const LOG = [], MLOG = [];
const logIt = (n, src) => { LOG.push({ n, t: Math.round(performance.now()), src }); if (LOG.length > 50) LOG.shift(); };
const mlog = n => { MLOG.push({ n, t: Math.round(performance.now()) }); if (MLOG.length > 30) MLOG.shift(); };

/* ---------------- khởi động (trình duyệt chỉ cho phát sau 1 cú bấm / phím) ---------------- */
const WARM = ['click', 'hover', 'tab', 'slot_select', 'menu_open', 'menu_close', 'pickup', 'coin', 'pop', 'slot', 'magnet', 'fail', 'hit', 'step_grass', 'step_dirt', 'step_stone', 'step_sand', 'step_wood',
  'step_water', 'step_gravel', 'step_snow', 'splash_small', 'chop', 'till', 'sow', 'water', 'harvest', 'mine', 'dig', 'dirt', 'sword_hit', 'swing', 'hurt', 'stone_gain', 'build', 'leaves', 'rock_hit'];
/* điện thoại (anh báo không nghe được trên điện thoại 2026-10-10):
   · chỉ NHẤC TAY (touchend / pointerup) hay click mới được tính là thao tác cho phép phát tiếng — chạm xuống (pointerdown) thì không;
   · iPhone gạt sang chế độ im lặng thì Web Audio câm → khai báo kiểu phiên 'playback' (Safari 17+) và phát 1 đoạn rỗng qua thẻ <audio> ở lần chạm đầu (cách cũ cho máy cũ). */
const SILENT_WAV = (() => { try { const n = 800, b = new Uint8Array(44 + n), v = new DataView(b.buffer), w = (o, s) => { for (let i = 0; i < s.length; i++) b[o + i] = s.charCodeAt(i); };
  w(0, 'RIFF'); v.setUint32(4, 36 + n, true); w(8, 'WAVE'); w(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, 8000, true); v.setUint32(28, 8000, true); v.setUint16(32, 1, true); v.setUint16(34, 8, true); w(36, 'data'); v.setUint32(40, n, true); b.fill(128, 44);
  let s = ''; for (const x of b) s += String.fromCharCode(x); return 'data:audio/wav;base64,' + btoa(s); } catch (e) { return null; } })();
let mobileUnlocked = false;
function unlockMobile() {
  try { if (typeof navigator !== 'undefined' && navigator.audioSession && navigator.audioSession.type !== 'playback') navigator.audioSession.type = 'playback'; } catch (e) { }
  if (mobileUnlocked || !SILENT_WAV || typeof Audio === 'undefined') return; mobileUnlocked = true;
  try { const a = new Audio(SILENT_WAV); a.setAttribute('playsinline', ''); const p = a.play(); if (p && p.catch) p.catch(() => { mobileUnlocked = false; }); } catch (e) { mobileUnlocked = false; }
}
export function initAudio() {
  unlockMobile();
  if (ac) { if (ac.state === 'suspended' && !hidden) ac.resume().catch(() => { }); return; }
  const AC = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext); if (!AC) return;
  try { ac = new AC({ latencyHint: 'interactive' }); } catch (e) { try { ac = new AC(); } catch (e2) { return; } }
  M = createMixer(ac); applyLevels();
  if (ac.state === 'suspended') ac.resume().catch(() => { });
  timer = setInterval(() => { try { if (ac.state === 'running') M.tick(); } catch (e) { } }, 30);
  if (!want && titleOpen()) want = 'title';
  if (want && musicOn) { M.playTrack(want, { fade: 1.5 }); playing = want; }
  if (ambWant) M.ambience(ambWant);
  /* dựng sẵn bộ đệm dần dần (tiếng hay dùng trước, rồi cả thư viện) → lần phát đầu không giật */
  const all = WARM.concat(Object.keys(SFX_LIB).filter(n => !WARM.includes(n)));
  let i = 0; const step = () => { if (!M) return; const t0 = performance.now(); while (i < all.length && performance.now() - t0 < 6) M.warm([all[i++]]); if (i < all.length) setTimeout(step, 40); };
  setTimeout(step, 200);
}
const titleOpen = () => { try { const t = document.getElementById('title'); return !!(t && !t.hidden); } catch (e) { return false; } };

/* ---------------- nhạc theo vùng / ngày đêm ---------------- */
let zone = null, want = null, playing = null, night = false, bossOn = false, credits = false, ambWant = null;
const AMB_OF = { sea: 'waves', m1: 'shore', m4: 'drips', arena: 'drips', m5: 'breeze', m7: 'lava', m8: 'wind', trench: 'deep', u1: 'under' };
function wantedTrack() {
  if (credits) return 'credits';
  if (!zone) return titleOpen() ? 'title' : null;
  const base = TRACKS[zone.id] ? zone.id : zone.under ? 'u1' : zone.trench ? 'trench' : zone.sea ? 'sea' : 'village';
  if (base === 'trench' && bossOn) return 'boss';
  if (night && TRACKS[base + ':night']) return base + ':night';
  return base;
}
function refreshMusic(fade = 1, align = false) {
  const w = wantedTrack(); if (w === want && (playing === w || !musicOn || !M)) return;
  want = w; mlog(w || '-');
  if (!M || !musicOn) return;
  if (w) M.playTrack(w, { fade, align }); else M.stopMusic(fade);
  playing = w;
}
export function setZone(z) {
  const prev = zone; zone = z; bossOn = false;
  if (prev && prev.id !== z.id) {   /* lặn xuống / trồi lên giữa Biển và vùng dưới nước */
    const deep = q => !!(q.under || q.trench);
    if (deep(z) && !deep(prev)) play('dive', {}, 's'); else if (deep(prev) && !deep(z)) play('surface', {}, 's');
  }
  ambWant = AMB_OF[z.id] || (z.under ? 'under' : null);
  if (M) M.ambience(ambWant);
  refreshMusic(1.0, false);
}
export function setEnabled(on) {   /* nút "♪ Nhạc: bật/tắt" — chỉ tắt nhạc, tiếng động vẫn còn (có thanh âm lượng riêng) */
  musicOn = !!on; applyLevels();
  if (!M) return;
  if (!musicOn) { M.stopMusic(0.4); playing = null; } else { want = null; refreshMusic(1.2); }
}
export function isEnabled() { return musicOn; }
/* plan-30 trùm 2: đồng hồ nhịp của bài đang phát (null nếu nhạc tắt / chưa phát) — trống trùm gõ đúng nhịp nhạc */
export function musicClock() { if (!M || !musicOn || !M.clock || !ac || ac.state !== 'running') return null; const c = M.clock(); return c && c.id === M.current() ? c : null; }
/* trúng đòn quan trọng → nhạc 'lỡ nhịp': nhạc nghẹt + chùng xuống 0,8 s */
let hiccupUntil = 0;
export function musicHiccup() { hiccupUntil = performance.now() + 800; if (M) try { M.muffle(true); } catch (e) { } }
export function playTrack(id) { want = id; mlog(id); if (M && musicOn) { M.playTrack(id, { fade: 0.8 }); playing = id; } }   /* trang nghe thử / test */
export function stinger(id) {
  const st = STINGERS[id]; if (!st) return false;
  logIt('♪' + id, 'st');
  if (!M || !ac || ac.state !== 'running') return false;
  if (musicOn && mVol > 0) { M.stinger(st); return true; }
  const fb = { levelup: 'level_up', badge: 'quest_done', quest: 'quest_done', noxx: 'win', xea: 'xealist', boss: 'roar_big', reveal: 'xealist', ending: 'quest_done' }[id];
  if (fb) M.sfx(fb);
  return true;
}

/* ---------------- phát tiếng (có chống lặp) ---------------- */
const lastAt = new Map();
const GAP = { mine: 200, chop: 120, reel: 25, step_grass: 60, step_dirt: 60, step_stone: 60, step_sand: 60, step_wood: 60, step_water: 60, step_gravel: 60, step_snow: 60, hover: 40, pop: 30, slot: 35, magnet: 30 };
const STING_SFX = { quest_done: 'quest', badge: 'badge' };   /* tiếng = nhạc ngắn khi nhạc đang bật */
const COMBO = { boss_intro: ['kraken_roar', 'boss'], boss_win: ['kraken_hurt', 'badge'] };
const resolve = n => { n = SFX_ALIAS[n] || n; return SFX_LIB[n] || COMBO[n] || STING_SFX[n] ? n : 'hit'; };
function play(name, o = {}, src = 'x') {
  const now = performance.now(), gap = GAP[name] ?? 45, last = lastAt.get(name) || -1e9;
  if (now - last < gap) return false;
  lastAt.set(name, now); logIt(name, src);
  if (!M || !ac || ac.state !== 'running') return false;
  if (COMBO[name]) { if (sVol > 0) M.sfx(COMBO[name][0], o); stinger(COMBO[name][1]); return true; }
  if (STING_SFX[name]) { stinger(STING_SFX[name]); return true; }   /* nhạc tắt → stinger() tự phát tiếng thay thế */
  if (sVol <= 0) return false;
  const p = { ...o }; if (o.delay) p.when = ac.currentTime + o.delay;
  return M.sfx(name, p);
}

/* ---------------- gộp lô theo khung ---------------- */
let pending = [], flushT = 0, lastExplicit = -1e9, order = 0;
const queue = e => { e.i = order++; pending.push(e); if (!flushT && typeof setTimeout !== 'undefined') flushT = setTimeout(flush, 60); };
/* VFX → tiếng. rep: tiếng chung chung bị thay; add: kêu thêm; còn lại: chỉ kêu khi khung đó không có tiếng nào khác (và 0,6 s trước cũng không) */
const VFX_SFX = {
  dirt_puff: { s: 'dirt', p: 2 }, water_splash: { s: 'splash_small', p: 3, o: { vol: 0.6 } }, wood_chips: { s: 'chop', p: 4, rep: ['hit'] }, rock_debris: { s: 'rock_hit', p: 4, rep: ['hit'] },
  crop_sparkle: { s: 'sparkle', p: 3 }, sparkle: { s: 'sparkle', p: 3 }, leaf_fall: { s: 'leaves', p: 1, add: 1 }, item_pickup_pop: { s: 'pop', p: 1 },
  level_up: { s: 'level_up', p: 8, rep: ['coin', 'win', 'pickup'] }, monster_poof: { s: 'poof', p: 5, rep: ['hit'] },
  stone_free: { s: 'unstone', p: 9, rep: ['win', 'coin', 'build', 'pickup'] }, petrify: { s: 'petrify', p: 9, add: 1 },
  u_bubbles: { s: 'bubbles', p: 2 }, u_shock: { s: 'zap', p: 6, rep: ['alarm'] }, u_puff: { s: 'puff', p: 6, rep: ['hit'] }, u_gate: { s: 'gate_open', p: 8, rep: ['win'] },
};
for (let i = 0; i <= 6; i++) VFX_SFX['slash_t' + i] = { s: 'sword_hit', p: 6, rep: ['hit'], o: { rate: 1.06 - i * 0.04 } };
export function vfxSound(name, ok, dur, wx, wy) {
  const m = VFX_SFX[name]; if (!m) return;
  const at = typeof wx === 'number' && typeof wy === 'number' ? { x: wx, y: wy } : {};
  if (name === 'leaf_fall' && dur >= 1.5) { queue({ k: 'v', n: 'tree_fall', vfx: name, p: 7, add: 1, ok: ok ? 1 : 0, ...at }); return; }   /* trees.js: nhát cuối → lá rơi 1,6 s = cây đổ */
  queue({ k: 'v', n: m.s, vfx: name, p: m.p, rep: m.rep, add: m.add, o: m.o, ok: ok ? 1 : 0, ...at });
}
const PL = { x: 0, y: 0, ok: false };   /* vị trí người chơi (audioTick cập nhật) → VFX ở xa thì nhỏ dần, ngoài màn hình thì im */
const WORLD = new Set(['smash', 'collapse', 'hit', 'build', 'hammer', 'chop', 'mine', 'dig', 'dirt', 'splash_small', 'rock_break', 'rock_hit', 'sparkle', 'pop', 'leaves', 'roar', 'squeak']);
const FB_GAP = { splash_small: 2500, dirt: 400, pop: 150, bubbles: 1200, sparkle: 300 };   /* tiếng "dự phòng" của VFX lặp (cá quẫy ao…) không kêu dày */
export function sfx(name, o) { queue({ k: 'x', n: resolve(String(name || 'hit')), o }); }
const stateSfx = (n, extra = {}) => queue({ k: 's', n, ...extra });
function flush() {
  if (flushT) { clearTimeout(flushT); flushT = 0; }
  const b = pending; pending = []; if (!b.length) return;
  const now = performance.now();
  let X = []; const St = [], V = [];
  for (const e of b) { if (e.k === 'x') { if (!X.some(q => q.n === e.n)) X.push(e); } else if (e.k === 's') St.push(e); else V.push(e); }
  const sup = new Set(); for (const s of St) for (const n of s.sup || []) sup.add(n);
  const drop = names => { X = X.filter(q => !names.includes(q.n)); };
  if (PL.ok && X.length) {   /* tiếng thế giới đi kèm VFX ở xa (quái đập nhà, dân sửa nhà…) → nhỏ dần theo khoảng cách, quá xa thì im */
    let dmin = Infinity, at = null; for (const v of V) if (v.x != null) { const d = Math.hypot(v.x - PL.x, v.y - PL.y); if (d < dmin) { dmin = d; at = v; } }
    if (at && dmin > 160) X = X.filter(q => { if (!WORLD.has(q.n)) return true; if (dmin > 420) return false; q.o = { ...(q.o || {}), vol: ((q.o && q.o.vol) ?? 1) * Math.max(0.25, 1 - (dmin - 120) / 360), pan: Math.max(-0.7, Math.min(0.7, (at.x - PL.x) / 220)) }; return true; });
  }
  const out = [];
  for (const s of St) { if (s.need && !X.some(q => q.n === s.need)) continue; if (s.rep) drop(s.rep); out.push(s); }
  V.sort((a, c) => (c.ok - a.ok) || (c.p - a.p) || (a.i - c.i));
  const fb = [];
  for (const v of V) {
    if (sup.has(v.vfx) || sup.has(v.n)) continue;
    if (v.x != null && PL.ok) { const d = Math.hypot(v.x - PL.x, v.y - PL.y); if (d > 280) continue; v.o = { ...(v.o || {}), vol: ((v.o && v.o.vol) ?? 1) * Math.max(0.3, 1 - d / 360), pan: Math.max(-0.7, Math.min(0.7, (v.x - PL.x) / 220)) }; }
    if (v.rep && v.rep.some(r => X.some(q => q.n === r))) { drop(v.rep); out.push(v); }
    else if (v.add) out.push(v);
    else fb.push(v);
  }
  out.push(...X);
  if (!out.length && fb.length && now - lastExplicit > 600 && now - (lastAt.get(fb[0].n) || -1e9) > (FB_GAP[fb[0].n] || 0)) out.push(fb[0]);
  if (X.length || St.length) lastExplicit = now;
  const seen = new Set(); let n = 0;
  for (const e of out) { if (seen.has(e.n) || n >= 4) continue; seen.add(e.n); n++; play(e.n, e.o || {}, e.k); }
}

/* ---------------- theo dõi trạng thái mỗi khung (main.js gọi) ---------------- */
const PANEL = new Set(['menu', 'bag', 'map', 'shop', 'codex', 'hall', 'nation', 'market', 'summary', 'craft', 'districts', 'gallery', 'pens', 'petname', 'photo', 'quest', 'questlog', 'quiz', 'memorial', 'uwshop', 'diveask', 'faction', 'pause']);
const STEP_OF = { GRASS: 'step_grass', GRASS2: 'step_grass', FLOWER: 'step_grass', MOSS: 'step_grass', CRACKG: 'step_grass', DIRT: 'step_dirt', CRACKD: 'step_dirt', TILLED: 'step_dirt', TILLED_WET: 'step_dirt', ASH: 'step_dirt',
  GRAVEL: 'step_gravel', SAND: 'step_sand', SAND2: 'step_sand', STONE: 'step_stone', COBBLE: 'step_stone', ROCK: 'step_stone', MARBLE: 'step_stone', HEX: 'step_stone', HEXLIT: 'step_stone', DARK: 'step_stone', ICE: 'step_stone',
  SNOW: 'step_snow', BRIDGE: 'step_wood', DOCK: 'step_wood', WATER: 'step_water', REEF: 'step_water' };
let stepById = null;
const W = { key: null, mode: null, frame: 0, act: null, actK: -1e9, pulls: 0, inv: null, stone: 0, lx: 0, ly: 0, foot: 0, strokeT: 0, fish: null, presses: 0, hp: null, mons: new Map(), growlT: -1e9, badges: 0, path: undefined, rev: false, night: null, quake: 0, flash: 0, rumbleT: -1e9, thunderT: -1e9, hot: null, tab: null, bossT: 0, endMode: false };
const shapeOf = mo => { const c = mo.c || {}; return c.shape || 'blob'; };
export function audioTick(S, dt, CTX) {
  try { tickInner(S, dt || 0, CTX || (typeof window !== 'undefined' ? window.__CTX : null)); } catch (e) { /* âm thanh không bao giờ được làm vỡ vòng lặp game */ }
  try { flush(); } catch (e) { }
}
function tickInner(S, dt, CTX) {
  if (!S || !S.zone) return;
  const now = performance.now(), p = S.player, sv = S.save || {};
  if (p) { PL.x = p.x; PL.y = p.y; PL.ok = true; }
  const key = S.zone.id + '|' + (sv.name || '') + '|' + (sv.lang || '');
  const fresh = key !== W.key;
  if (fresh) {   /* vào vùng mới / tải save: lấy mốc, không kêu */
    W.key = key; W.hp = sv.hero ? sv.hero.hp : null; W.mons.clear(); W.fish = null; W.badges = (sv.badges || []).length; W.path = sv.story ? sv.story.path : undefined;
    W.rev = !!(sv.dark && sv.dark.revealed); W.hot = sv.hotSel; W.inv = null; W.nflags = -1; W.flagSet = null; W.dive = null; W.quake = S.quakeOn || 0; W.flash = S.flash || 0; W.bossT = 0;
    const nt = isNight(S); if (nt !== night) { night = nt; refreshMusic(0.8, false); } W.night = nt;
  }
  /* ---- chế độ: mở/đóng bảng, nhỏ nhạc khi hội thoại, nghẹt khi mở túi ---- */
  const mode = S.mode;
  if (mode !== W.mode) {
    const was = W.mode; W.mode = mode;
    if (!fresh && was) {
      if (PANEL.has(mode) && !PANEL.has(was)) play('menu_open', {}, 'ui');
      else if (PANEL.has(was) && !PANEL.has(mode)) play('menu_close', {}, 'ui');
    }
    if ((mode === 'end' || mode === 'xending') && !W.endMode) { W.endMode = true; stinger(mode === 'xending' ? 'xea' : 'ending'); } else if (mode !== 'end' && mode !== 'xending') W.endMode = false;
    const cr = mode === 'credits'; if (cr !== credits) { credits = cr; refreshMusic(1.5); }
  }
  if (M) { M.duckDialog(mode === 'dialog'); M.muffle(PANEL.has(mode) || performance.now() < hiccupUntil); }
  if (mode === 'menu') { try { const t = document.querySelector('#menu .mtab.on'); const id = t && t.dataset.tab; if (id && W.tab && id !== W.tab) play('tab', {}, 'ui'); W.tab = id; } catch (e) { } } else W.tab = null;
  if (sv.hotSel !== W.hot) { if (!fresh && W.hot != null) play('slot_select', {}, 'ui'); W.hot = sv.hotSel; }

  /* ---- bước chân theo nền (khung chạm đất 1, 2 của chu kỳ đi 0-1-0-2) · lội nước · chèo bè · bơi · nhát cuốc lặp ---- */
  if (p) {
    const z = S.zone, riding = !!(S.sea && S.sea.riding && !S.sea.diving), under = !!(z.under || z.trench), m = S.map;
    const tx = Math.floor(p.x / 16), ty = Math.floor(p.y / 16);
    if (!stepById && CTX && CTX.T) { stepById = {}; for (const k in CTX.T) if (STEP_OF[k]) stepById[CTX.T[k]] = STEP_OF[k]; }
    const nm = stepById && m && m.ground && tx >= 0 && ty >= 0 && tx < m.w && ty < m.h ? stepById[m.ground[ty * m.w + tx]] : null;
    const wading = !!p.custom && !S.swimming && nm === 'step_water';
    if (mode === 'play' && p.moving && (!p.custom || wading) && !S.swimming && !riding && !under) {
      if (p.frame !== W.frame && (p.frame === 1 || p.frame === 2) && Math.hypot(p.x - W.lx, p.y - W.ly) > 4) {
        W.lx = p.x; W.ly = p.y;
        if (nm) { W.foot = -W.foot || 0.12; play(nm, { vol: 0.45, pan: W.foot }, 'step'); }   /* bước chân nhỏ (anh không thích hiệu ứng ồn lặp lại) */
      }
    } else if (mode === 'play' && p.moving && (riding || S.swimming || under)) {
      W.strokeT -= dt;
      if (W.strokeT <= 0) { W.strokeT = riding ? 0.62 : under ? 0.85 : 0.55; play(riding ? 'paddle' : 'swim', under ? { rate: 0.8, vol: 0.6 } : { vol: 0.8 }, 'step'); }
    } else W.strokeT = 0.15;
    W.frame = p.frame;
    const a = p.action;   /* clip động tác của người chơi: vung kiếm → tiếng gió; cuốc/búa lặp (đào đá, sửa) → mỗi nhát 1 tiếng */
    if (a !== W.act) {
      if (a && a.name === 'attack') play('swing', { vol: 0.7 }, 'step');
      W.act = a; W.actK = -1e9;
    }
    if (a && a.loop && (a.name === 'mine' || a.name === 'hammer')) {
      const sh = p.sheet && p.sheet.actions && p.sheet.actions[a.name];
      if (sh && sh.n) {
        const fps = sh.fps || 12, per = sh.n / fps, imp = (sh.impact != null ? sh.impact : Math.floor(sh.n / 2)) / fps, k = Math.floor((a.t - imp) / per);
        if (W.actK !== -1e9 && k > W.actK && k >= 0) play(a.name, { vol: 0.7 }, 'step');
        W.actK = k;
      }
    }
  }
  /* ---- đồ: hút về người · rơi vào túi/ô (chỉ kêu khi khung đó không có tiếng nào khác) ---- */
  if (S.sys && S.sys.some(s => s.id === 'drops') && typeof window !== 'undefined' && window.__drops) {
    try { const pulls = window.__drops.list().filter(d => d.st === 'pull').length; if (!fresh && pulls > W.pulls) queue({ k: 'v', n: 'magnet', p: 1, ok: 1 }); W.pulls = pulls; } catch (e) { }
  }
  if (sv.inv) {
    let tot = 0; for (const k in sv.inv) tot += sv.inv[k] || 0; const st = sv.inv.stone || 0;
    if (!fresh && W.inv != null && tot > W.inv) queue({ k: 'v', n: st > W.stone ? 'stone_gain' : 'slot', p: 2, ok: 1 });
    W.inv = tot; W.stone = st;
  }

  /* ---- câu cá (animals.js: wait → bite → reel → done) ---- */
  try {
    const A = typeof window !== 'undefined' && window.__animals, f = A && A.fishing ? A.fishing() : null, ph = f ? f.phase : null;
    if (ph !== W.fish) {
      if (!fresh) {
        if (ph === 'wait' && !W.fish) stateSfx('cast');
        else if (ph === 'bite') stateSfx('bite');
        else if (ph === 'reel') stateSfx('hook');
        else if (ph === 'done' && W.fish) stateSfx(f.ok ? (f.special === 'goldfish' || (f.card && f.card.isRec) ? 'catch_rare' : 'catch') : (f.tens >= 1 ? 'line_snap' : 'fish_escape'), { rep: ['pickup', 'win'] });
      }
      W.fish = ph; W.presses = f && f.presses ? f.presses.length : 0;
    } else if (ph === 'reel' && f.presses && f.presses.length !== W.presses) { W.presses = f.presses.length; play('reel', { rate: 0.9 + (f.prog || 0) * 0.45 }, 's'); }
  } catch (e) { }

  /* ---- máu người chơi (hero.js) ---- */
  const h = sv.hero;
  if (h && typeof h.hp === 'number') {
    if (W.hp != null && !fresh) {
      if (h.hp < W.hp - 0.5) stateSfx(h.hp <= 0 ? 'faint' : 'hurt', { rep: h.hp <= 0 ? ['fail', 'hit'] : ['hit'] });
      else if (h.hp > W.hp + 4) stateSfx('eat', { need: 'pickup', rep: ['pickup'] });   /* ăn từ túi (menu.js kêu 'pickup' + hồi máu) */
    }
    W.hp = h.hp;
  }

  /* ---- quái (monsters.js): bị đánh / gục / nổi giận ---- */
  if (CTX && CTX.monsters && CTX.monsters.list && S.sys && S.sys.some(s => s.id === 'monsters')) {
    const list = CTX.monsters.list() || [], seen = new Set();
    for (const mo of list) {
      seen.add(mo);
      const prev = W.mons.get(mo);
      if (prev) {
        if (mo.hp < prev.hp - 0.01 && mo.hp > 0) stateSfx('mon_hurt_' + shapeOf(mo), { o: { vol: 0.85 } });
        if (mo.angry && !prev.angry && p && now - W.growlT > 6500 && Math.hypot(mo.x - p.x, mo.y - p.y) < 200) {
          W.growlT = now; const c = mo.c || {}, sh = shapeOf(mo);
          stateSfx(c.boss ? 'roar_big' : (sh === 'blob' || sh === 'crab' || sh === 'bird') ? 'growl_small' : 'roar', { o: { vol: c.boss ? 0.8 : 0.55 } });
        }
        prev.hp = mo.hp; prev.angry = !!mo.angry;
      } else W.mons.set(mo, { hp: mo.hp, angry: !!mo.angry });
    }
    for (const [mo, st] of W.mons) if (!seen.has(mo)) { W.mons.delete(mo); if (!fresh && (mo.hp <= 0 || st.hp <= 0)) stateSfx('mon_die_' + shapeOf(mo), { sup: ['monster_poof'] }); }
  }

  /* ---- lặn từ bè (sea_dive.js) ---- */
  const dv = !!(S.sea && S.sea.diving);
  if (dv !== W.dive) { if (!fresh && W.dive != null) play(dv ? 'dive' : 'surface', {}, 's'); W.dive = dv; }
  /* ---- cờ vật thể (main.js): đốt lửa trại, gạt cần ---- */
  if (sv.flags) {
    const ks = Object.keys(sv.flags);
    if (ks.length !== W.nflags) {
      if (!fresh && W.flagSet) for (const k of ks) if (!W.flagSet.has(k)) { const nm = /:campfire:/.test(k) ? 'campfire' : /:lever:/.test(k) ? 'door' : null; if (nm) stateSfx(nm, { rep: ['hit', 'build', 'pickup', 'win', 'coin'] }); }
      W.flagSet = new Set(ks); W.nflags = ks.length;
    }
  }
  /* ---- cốt truyện: huy hiệu, chọn phe, lộ mặt ---- */
  const nb = (sv.badges || []).length;
  if (nb > W.badges && !fresh) { stinger('badge'); stateSfx('sparkle', { sup: ['level_up'] }); }
  W.badges = nb;
  const path = sv.story ? sv.story.path : undefined;
  if (path !== W.path) { if (!fresh && path) { stinger(path === 'xealist' ? 'xea' : 'noxx'); stateSfx(path === 'xealist' ? 'petrify' : 'unstone', { rep: ['win', 'roar'], sup: ['level_up', 'stone_free', 'petrify'] }); } W.path = path; }
  const rev = !!(sv.dark && sv.dark.revealed);
  if (rev !== W.rev) { if (rev && !fresh) { stinger('reveal'); stateSfx('xealist', { rep: ['roar'] }); } W.rev = rev; }

  /* ---- ngày / đêm ---- */
  const nt = isNight(S);
  if (nt !== W.night) {
    if (!fresh && W.night != null) play(nt ? 'night' : 'morning', {}, 's');
    W.night = nt; if (nt !== night) { night = nt; refreshMusic(3, true); }
  }
  /* ---- đất rung · sấm ---- */
  const q = S.quakeOn || 0;
  if (q > W.quake + 0.3 && now - W.rumbleT > 2500 && !fresh) { W.rumbleT = now; play('rumble', { vol: Math.min(1, 0.35 + q * 0.3) }, 's'); }
  W.quake = q;
  const fl = S.flash || 0;
  if (fl > W.flash + 0.3 && S.zone.lightning && now - W.thunderT > 5000) { W.thunderT = now; play('thunder', { vol: 0.65, delay: 0.3 + Math.random() * 0.9 }, 's'); }
  W.flash = fl;
  /* ---- trận Kraken → nhạc trùm ---- */
  if (S.zone.id === 'trench') {
    W.bossT -= dt;
    if (W.bossT <= 0) {
      W.bossT = 0.5;
      try { const st = window.__trench && window.__trench.state && window.__trench.state(), on = !!(st && st.boss && ['intro', 'fight', 'thrash'].includes(st.boss.phase)); if (on !== bossOn) { bossOn = on; refreshMusic(on ? 0.6 : 2); } } catch (e) { }
    }
  }
}
function isNight(S) { const c = S.save && S.save.clock; if (c && typeof c.min === 'number') return c.min >= 780; return (S.dark || 0) > 0.3; }

/* ---------------- bấm nút / đổi thẻ / chọn ô: 1 bộ nghe chung ---------------- */
if (typeof document !== 'undefined') {
  let hoverEl = null;
  document.addEventListener('pointerdown', e => {
    const t = e.target; initAudio();
    if (!t || !t.closest) return;
    if (t.closest('.mtab')) play('tab', {}, 'ui');
    else if (t.closest('.hb-slot, .slot')) play('slot_select', {}, 'ui');
    else if (t.closest('.btn, button, .qopt')) play('click', {}, 'ui');
  }, true);
  document.addEventListener('pointerover', e => {
    if (e.pointerType && e.pointerType !== 'mouse') return;
    const t = e.target && e.target.closest ? e.target.closest('.btn, button, .mtab') : null;
    if (t && t !== hoverEl && !t.disabled) play('hover', {}, 'ui');
    hoverEl = t;
  }, true);
  document.addEventListener('keydown', () => initAudio(), true);
  for (const ev of ['touchend', 'pointerup', 'click']) document.addEventListener(ev, () => initAudio(), true);   /* điện thoại: nhấc tay mới được phép phát tiếng */
  document.addEventListener('visibilitychange', () => {
    hidden = document.visibilityState === 'hidden';
    if (!ac) return;
    if (hidden) ac.suspend().catch(() => { }); else ac.resume().catch(() => { });
  });
}

/* ---------------- móc test ---------------- */
export function blip(freq = 500) {   /* plan-12: tiếng chữ chạy (ui.js truyền cao độ theo từng nhân vật) */
  if (!M || !ac || ac.state !== 'running' || sVol <= 0) return;
  M.blip(freq);
}
if (typeof window !== 'undefined') window.__audio = {
  log: LOG, musicLog: MLOG,
  music: () => (M && musicOn && M.current()) || want,
  want: () => want, amb: () => (M ? M.ambId() : ambWant),
  state: () => ({ ctx: ac ? ac.state : 'none', music: M ? M.current() : null, want, night, musicOn, boss: bossOn, vol: { music: mVol, sfx: sVol },
    duck: M ? +M.duck.gain.value.toFixed(2) : null, muffle: M ? Math.round(M.musicLP.frequency.value) : null, amb: M ? M.ambId() : ambWant, stingers: M ? M.stings.length : 0 }),
  names: () => Object.keys(SFX_LIB), tracks: () => Object.keys(TRACKS),
  has: n => !!SFX_LIB[SFX_ALIAS[n] || n], play: n => sfx(n), stinger, last: (k = 10) => LOG.slice(-k).map(e => e.n),
  since: t => LOG.filter(e => e.t >= t).map(e => e.n), clear: () => { LOG.length = 0; },
  init: () => initAudio(), flush: () => flush(), level: () => (M ? M.level() : { rms: 0, peak: 0 }),
};
