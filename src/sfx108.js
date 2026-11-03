/* sfx108.js — p108 (02/11/2026, anh: "Thêm các ÂM THANH SKILL cho các Chấn Thú").
   Tiếng RIÊNG từng chiêu Chấn Thú (file mp3 assets/sfx/duel/<loài>_<chiêu>_cast|_hit.mp3, sinh bằng tools/el-sfx.py gen108) + cổng chung cho mọi tiếng file Chấn Thú:
   · gate(n, o): chặn chồng tiếng — tối đa 4 tiếng cùng lúc (đếm theo độ dài file ước lượng, chạy cả khi trình duyệt tắt tiếng / chưa có AudioContext), cùng tên cách ≥ 80 ms.
     Qua cổng thì ghi window.__sfxlog { t: performance.now ms, w: Date.now ms, n: tên, v: âm lượng 0–1, p: pan −1…1 } — dùng để trộn tiếng vào video quay câm (tools/mix-sfx.py).
   · name(mvId, 'cast'|'hit'): chiêu trận (duel-data) → tên tiếng riêng (dạng tiến hoá 'lan_gai2' dùng chung 'lan_gai'); null = không có, audio.js dùng tiếng hệ chung.
   · at(ctx, tên, x, y, o): phát NGOÀI MAP theo khoảng cách tới người chơi (≤ 70 px đủ tiếng, xa dần nhỏ, > 330 px im) + pan trái/phải. Trả false nếu chưa gắn audio (để nơi gọi dùng tiếng cũ).
   · move(ctx, mvId, phase, x, y): như at() nhưng tra tên theo chiêu (thiếu thì tiếng hệ <hệ>_cast / <hệ>_hit nếu biết hệ, o.type).
   audio.js gọi bind(duelPlayThật). Module không import gì → không vòng phụ thuộc. Test: window.__sfx108, window.__sfxlog. */
export const MV108 = {
  /* Rocky golem (plan-90) */
  rk_fist: ['rk_fist_cast', 'rk_fist_hit'], rk_quake: ['rk_quake_cast', 'rk_quake_hit'], rk_storm: ['rk_storm_cast', 'rk_storm_hit'],
  rk_shield: ['rk_shield_cast', null], rk_dash: ['rk_dash_cast', 'rk_dash_hit'], rk_ult: ['rk_ult_cast', 'rk_ult_hit'],
  /* Molandak (p96) */
  lan_gai: ['mdk_lan_gai_cast', 'mdk_lan_gai_hit'], ban_gai: ['mdk_ban_gai_cast', 'mdk_ban_gai_hit'], tre_moi: ['mdk_tre_moi_cast', null],
  cuon_thu: ['mdk_cuon_thu_cast', null], cau_gai: ['mdk_cau_gai_cast', 'mdk_cau_gai_hit'],
  /* Moyaki (p99) */
  quay_vay: ['myk_quay_vay_cast', 'myk_quay_vay_hit'], bong_bong: ['myk_bong_bong_cast', 'myk_bong_bong_hit'], liec_mat: ['myk_liec_mat_cast', null],
  nguoc_dong: ['myk_nguoc_dong_cast', null], vuot_thac: ['myk_vuot_thac_cast', 'myk_vuot_thac_hit'],
  /* Chog (p100) */
  tin_nong: ['chg_tin_nong_cast', 'chg_tin_nong_hit'], bom_gai: ['chg_bom_gai_cast', 'chg_bom_gai_hit'], phong_van: ['chg_phong_van_cast', null],
  cuoi_tit: ['chg_cuoi_tit_cast', null], ban_tin: ['chg_ban_tin_cast', 'chg_ban_tin_hit'],
  /* Oa Lì (p97) */
  bot_op: ['oali_bot_op_cast', 'oali_bot_op_hit'], bung_phe: ['oali_bung_phe_cast', 'oali_bung_phe_hit'], kinh_den: ['oali_kinh_den_cast', null],
  luoi_keo: ['oali_luoi_keo_cast', 'oali_luoi_keo_hit'], coc_lu: ['oali_coc_lu_cast', 'oali_coc_lu_hit'], vong_khoi: ['oali_vong_khoi_cast', null],
  /* Elyziuma ngoài map (elyz95.js: id hành động stamp / meet / flare / fire / ult) */
  ely_stamp: ['ely_stamp_cast', 'ely_stamp_hit'], ely_meet: ['ely_meet_cast', 'ely_meet_hit'], ely_flare: ['ely_flare_cast', 'ely_flare_hit'],
  ely_fire: ['ely_fire_cast', 'ely_fire_hit'], ely_ult: ['ely_ult_cast', 'ely_ult_hit'],
};
export const EXTRA108 = ['rk_storm_fire', 'dash_fast', 'sel_target'];
export const FILES108 = [...new Set(Object.values(MV108).flat().filter(Boolean).concat(EXTRA108))];
/* độ dài ước lượng (s) cho bộ đếm tiếng chồng — đo từ file thật sau khi sinh (el-sfx.py check); tên không có thì 0,8 s */
const DUR = { ely_ult_cast: 1.4, ely_ult_hit: 1.3, ely_meet_cast: 1.0, rk_quake_hit: 1.2, rk_ult_cast: 1.5, rk_ult_hit: 1.5, rk_storm_cast: 0.9, mdk_cau_gai_cast: 1.2, mdk_cau_gai_hit: 1.2,
  myk_nguoc_dong_cast: 1.0, myk_vuot_thac_cast: 1.3, myk_vuot_thac_hit: 1.2, chg_ban_tin_cast: 1.2, chg_ban_tin_hit: 1.2, oali_coc_lu_cast: 1.2, oali_coc_lu_hit: 1.4,
  hit: 0.6, hit_big: 1.2, clash_start: 2.0, clash_boom: 2.0, ko_burst: 1.5, ult_cast: 1.5, wave_crash: 1.5, sel_target: 0.4, dash_fast: 0.5 };
const durOf = n => DUR[n] || (/_hit$/.test(n) ? 0.6 : 0.8);
export const CFG108 = { maxVoices: 4, gapMs: 80, near: 70, far: 330, minVol: 0.12, panW: 220, panMax: 0.7 };

const LOG = [];
const ACT = [];   /* tiếng đang kêu: { n, end } */
const LAST = new Map();
let play = null;
export function bind(fn) { play = fn; }

export function gate(n, o = {}) {
  const now = performance.now();
  if (now - (LAST.get(n) ?? -1e9) < CFG108.gapMs) return false;
  for (let i = ACT.length - 1; i >= 0; i--) if (ACT[i].end <= now) ACT.splice(i, 1);
  if (ACT.length >= CFG108.maxVoices) return false;
  LAST.set(n, now); ACT.push({ n, end: now + durOf(n) * 1000 });
  const v = Math.round((o.vol ?? 0.8) * 1000) / 1000, p = Math.round((o.pan || 0) * 100) / 100;
  LOG.push({ t: Math.round(now), w: Date.now(), n, v, p }); if (LOG.length > 6000) LOG.shift();
  return true;
}
export function name(mvId, phase) {
  if (!mvId) return null; const k = String(mvId), e = MV108[k] || MV108[k.replace(/\d+$/, '')];
  return e ? e[phase === 'hit' ? 1 : 0] : null;
}
let LCTX = null;   /* ctx gần nhất (nơi gọi không có ctx, vd dash107, vẫn tính được khoảng cách) */
function lis(ctx) { if (ctx && ctx.S) LCTX = ctx; else ctx = LCTX; const p = ctx && ctx.S && ctx.S.player; return p && typeof p.x === 'number' ? p : null; }
export function spatial(ctx, x, y, base = 0.8) {
  const p = lis(ctx); if (!p || typeof x !== 'number' || typeof y !== 'number') return { vol: base, pan: 0 };
  const dx = x - p.x, d = Math.hypot(dx, y - p.y), C = CFG108;
  if (d > C.far) return { vol: 0, pan: 0 };
  const k = d <= C.near ? 1 : Math.max(C.minVol, 1 - (d - C.near) / (C.far - C.near) * (1 - C.minVol));
  return { vol: base * k, pan: Math.max(-C.panMax, Math.min(C.panMax, dx / C.panW)) };
}
export function at(ctx, n, x, y, o = {}) {
  if (!play || !n) return false;
  const s = spatial(ctx, x, y, o.vol ?? 0.8); if (s.vol <= 0) return true;   /* quá xa: im (đã xử lý — nơi gọi không phát tiếng cũ) */
  play(n, { vol: s.vol, pan: s.pan }); return true;
}
export function move(ctx, mvId, phase, x, y, o = {}) {
  const n = name(mvId, phase) || (o.type ? o.type + (phase === 'hit' ? '_hit' : '_cast') : null);
  return n ? at(ctx, n, x, y, o) : false;
}
export function mark(tag = 'mark') { LOG.push({ t: Math.round(performance.now()), w: Date.now(), n: '__' + tag, v: 0, p: 0 }); return LOG.length; }

if (typeof window !== 'undefined') {
  LOG.mark = mark;   /* window.__sfxlog.mark() trước khi quay: đánh dấu điểm 0 cho mix-sfx.py (--from-mark) */
  LOG.clear = () => { LOG.length = 0; };
  LOG.since = t => { const k = Math.floor(t); return LOG.filter(e => e.t >= k); };   /* e.t làm tròn ms → so với floor để không rơi mục vừa ghi */
  LOG.dump = () => JSON.stringify({ v: 1, now: Math.round(performance.now()), wnow: Date.now(), items: LOG.slice() });
  window.__sfxlog = LOG;
  window.__sfx108 = { MV108, FILES108, CFG108, name, at, move, spatial, gate, mark, bound: () => !!play, play: (n, o) => (play ? play(n, o || {}) : false) };
}
