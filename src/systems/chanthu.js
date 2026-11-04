// chanthu.js — plan-58 C.2 (2026-10-30): CON KHỞI ĐẦU + CHẤN THÚ HOANG + ẤN THU.
//  · Làng: 3 Ấn Chấn nằm cạnh lối vào (Lôi Hồ · Vịt Bão · Bánh Bao Thánh) → E: bảng chọn nhỏ, đặt tên. Chọn xong 2 viên còn lại vẫn nằm đó → E: bảng ĐỘI (đổi tên, chọn con ra trận, xem kho).
//  · Vùng M1–M9: 2 Chấn Thú hoang lang thang (sprite trận, vẽ 1:1 ½ ảnh như trong trận — đúng bậc cỡ), đến gần bấm E → trận 1v1 (linhduel opts.wild: thú hoang đứng sẵn, không ném cầu).
//  · Trong trận: máu thú hoang ≤ 30 % → nút / phím Ấn Thu (linhduel.js). Bắt được → đội (≤ 6) hoặc kho; hụt → nó chạy, lát sau mới hiện lại.
//  · Lưu: save.sys.chanthu = { v, starter, team: [{ id, sp, lv, name }], box: [...], anThu, nextId, caught } — save cũ không có trường → coi như chưa chọn con nào.
//  · Ấn Thu mua ở quầy Thương nhân (market.js gọi ctx.chanthuShopRow / chanthuShopBind).
import { SPECIES, TYPE_NAME, TYPE_COLOR, RARITY_NAME, SPECIES_EN, TYPE_EN } from './duel-data.js';
import { T, O } from '../gfx.js';
import { SHADOW, shadowAt, shadowFor } from './shadow.js';   /* plan-66: bóng dưới chân (ảnh PixelLab flyshadow, co + nhạt theo độ cao) */

const BASE = 'assets/px/';
const STARTERS = ['loiho', 'vitbao', 'banhbao'];
const STARTER_LV = 20, GIFT = 3, PRICE = 25, TEAM_MAX = 6, TEAM_SIZE = { '3v3': 3, '6v6': 6 };
/* hệ hợp địa hình từng vùng (chỉ dùng 10 loài đã có sprite trận) */
const WILD = { m1: ['bachkinh', 'vitbao'], m2: ['cuoitho', 'loiho'], m3: ['diepnhan', 'cuoitho'], m4: ['golem', 'tinhmieu'], m5: ['golem', 'vitbao'],
  m6: ['tinhmieu', 'cuoitho'], m7: ['rongdo', 'golem'], m8: ['tuyetky', 'banhbao'], m9: ['loiho', 'banhbao'] };
const RESPAWN = { fled: 40, beaten: 60, caught: 90 };   /* giây (giờ thật) trước khi con khác hiện lại chỗ đó */
const SPEED = { xs: 26, s: 22, m: 17, l: 13 };   /* p72: bậc Tí (linh thú) */
const FPS = { idle: 8, run: 14 };
const SHW = { xs: 9, s: 10, m: 14, l: 20 };   /* plan-66: bề ngang bóng theo bậc cỡ */
const STR = {
  vi: { pick: '◉ Chọn Chấn Thú khởi đầu', team: '◉ Đội Chấn Thú', pickT: 'Chọn Chấn Thú khởi đầu', pickLead: 'Chọn 1 con đi cùng bạn. Đặt tên được (đổi lại sau ở đây).',
    name: 'Tên', ok: '✓ Chọn', later: 'Để sau', close: 'Đóng', save: '✓ Lưu', lead: 'Ra trận', isLead: '★ Ra đầu', box: 'Kho', empty: 'trống', order: 'Thứ tự ra trận: ▲▼ để xếp · 1–3 đánh 3v3 · 1–6 đánh 6v6', up: 'Lên', down: 'Xuống',
    got: (n, k) => `${n} đã về đội! Nhận ${k} Ấn Thu.`, wildL: (n, lv) => `⚔ ${n} hoang Lv${lv}`, noStarter: 'Chưa có Chấn Thú — về Làng chọn con khởi đầu (3 Ấn Chấn cạnh lối vào).',
    caught: (n, w) => `Đã bắt ${n}! → ${w === 'team' ? 'vào đội' : 'vào kho'}`, balls: n => `Ấn Thu ×${n}`, anthu: 'Ấn Thu', anthuNote: 'ném khi thú hoang còn ≤ 30 % máu', poor: 'Không đủ đá Seismic',
    bought: 'Đã mua 1 Ấn Thu', size: { xs: 'Tí', s: 'Nhỏ', m: 'Vừa', l: 'To' } },
  en: { pick: '◉ Choose your first beast', team: '◉ Beast team', pickT: 'Choose your first beast', pickLead: 'Pick one partner. You can name it (rename here later).',
    name: 'Name', ok: '✓ Choose', later: 'Later', close: 'Close', save: '✓ Save', lead: 'Lead', isLead: '★ Leads', box: 'Storage', empty: 'empty', order: 'Battle order: ▲▼ to sort · 1–3 fight 3v3 · 1–6 fight 6v6', up: 'Up', down: 'Down',
    got: (n, k) => `${n} joined your team! Got ${k} Seal Stones.`, wildL: (n, lv) => `⚔ Wild ${n} Lv${lv}`, noStarter: 'No Quake Beast yet — go back to the Village and pick a starter (3 orbs by the entrance).',
    caught: (n, w) => `Caught ${n}! → ${w === 'team' ? 'team' : 'storage'}`, balls: n => `Seal Stone ×${n}`, anthu: 'Seal Stone', anthuNote: 'throw when a wild one is at ≤ 30 % HP', poor: 'Not enough Seismic stones',
    bought: 'Bought 1 Seal Stone', size: { xs: 'Tiny', s: 'Small', m: 'Medium', l: 'Large' } },
};
const L = ctx => STR[ctx.lang() === 'en' ? 'en' : 'vi'];
const enL = () => !!(ST && ST.ctx && ST.ctx.lang && ST.ctx.lang() === 'en');   /* p74: tên tiếng Anh khi lang=en */
const spN = sp => (enL() && SPECIES_EN[sp]) || (SPECIES[sp] ? SPECIES[sp].name : sp);
const nmOf = m => (m.name && !(SPECIES[m.sp] && m.name === SPECIES[m.sp].name) ? m.name : spN(m.sp));
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* ---------- save ---------- */
function data(ctx) { const sv = ctx.S.save; if (!sv) return null; sv.sys = sv.sys || {}; return sv.sys.chanthu || null; }
function ensure(ctx) {
  const sv = ctx.S.save; sv.sys = sv.sys || {}; let d = sv.sys.chanthu;
  if (!d || typeof d !== 'object') d = sv.sys.chanthu = {};
  d.v = 1; d.team = Array.isArray(d.team) ? d.team : []; d.box = Array.isArray(d.box) ? d.box : []; d.anThu = d.anThu | 0; d.nextId = d.nextId || 1; d.caught = d.caught | 0; if (d.starter === undefined) d.starter = null;
  return d;
}
const hasStarter = ctx => { const d = data(ctx); return !!(d && Array.isArray(d.team) && d.team.length); };
function addMon(ctx, sp, lv, name) {
  const d = ensure(ctx), m = { id: d.nextId++, sp, lv: lv | 0 || 10, name: name || spN(sp) }; let where = 'team';
  if (d.team.length < TEAM_MAX) d.team.push(m); else { d.box.push(m); where = 'box'; }
  ctx.persist(); return where;
}

/* ---------- ảnh ---------- */
let SPR = null, sprP = null; const IMG = {};
function img(src) { if (!IMG[src]) { const i = new Image(); i.src = BASE + src; IMG[src] = i; } const i = IMG[src]; return i.complete && i.naturalWidth ? i : null; }
function loadSpr() { if (sprP) return sprP; sprP = fetch(BASE + 'linhduel/duel_sprites.json').then(r => r.json()).then(j => { SPR = j; }).catch(() => { sprP = null; }); return sprP; }
const ORB = { file: 'duel/orb/orb_spin.png', fw: 32 };   /* Ấn Chấn PixelLab (plan-58 E) — khung 0, đổi vết nứt cyan sang màu hệ */
const ORBT = new Map();
function orbTinted(type) {
  const im = img(ORB.file); if (!im) return null; let c = ORBT.get(type); if (c) return c;
  c = document.createElement('canvas'); c.width = ORB.fw; c.height = ORB.fw; const x = c.getContext('2d'); x.drawImage(im, 0, 0, ORB.fw, ORB.fw, 0, 0, ORB.fw, ORB.fw);   /* canvas KHÔNG __hi (luật 25/09) */
  const d = x.getImageData(0, 0, ORB.fw, ORB.fw), a = d.data, h = (TYPE_COLOR[type] || '#9fe8ff').replace('#', ''), col = [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16));
  for (let i = 0; i < a.length; i += 4) { const r = a[i], g = a[i + 1], b = a[i + 2]; if (a[i + 3] && b > r + 25 && g > r + 10) { const L0 = (r + g + b) / 765, k = Math.min(1, L0 * 1.25); for (let j = 0; j < 3; j++) a[i + j] = Math.round(col[j] * k + 255 * Math.max(0, L0 - 0.8) * 1.5); } }
  x.putImageData(d, 0, 0); ORBT.set(type, c); return c;
}
function rowOf(c, fx, fy) {
  const ax = Math.abs(fx); let d, flip = fx < -0.05;
  if (fy > 0.38 && ax < 0.92) d = ax > 0.38 ? 'south-east' : 'south'; else if (fy < -0.38 && ax < 0.92) d = ax > 0.38 ? 'north-east' : 'north'; else d = 'east';
  let r = c.rows.indexOf(d); if (r < 0) r = 0; if (d === 'south' || d === 'north') flip = false; return { r, flip };
}
function drawMon(g, w, cx, cy) {
  const S0 = SPR && SPR[w.sp]; if (!S0) return; const clip = w.moving && S0.run ? 'run' : 'idle', c = S0[clip], im = img(c.file); if (!im) return;
  const fr = Math.floor(w.ct * FPS[clip]) % c.n, { r, flip } = rowOf(c, w.fx, w.fy), x = Math.round(w.x - cx), y = Math.round(w.y - cy);
  if (SHADOW.on) shadowFor(g, w.x, w.y, x, y + 1, SHW[w.tier] || 14, w.z || 0);   /* plan-66: bóng dưới chân (lớp vẽ của thú, ngay trước thân) */
  if (flip) { g.save(); g.translate(x, y); g.scale(-1, 1); g.drawImage(im, fr * c.cw, r * c.ch, c.cw, c.ch, -c.ax / 2, -c.ay / 2, c.cw / 2, c.ch / 2); g.restore(); }
  else g.drawImage(im, fr * c.cw, r * c.ch, c.cw, c.ch, x - c.ax / 2, y - c.ay / 2, c.cw / 2, c.ch / 2);   /* ảnh gói 2× → vẽ ½ (1:1 với pixel người chơi) */
}

/* ---------- thú hoang ---------- */
const ST = { wild: [], pad: null, ctx: null, gone: {}, panel: null, wxForce: null, rareT: 0, rareLog: [] };
function hash(s) { let h = 2166136261; for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return h >>> 0; }
function rng(seed) { let x = seed || 1; return () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return ((x >>> 0) % 100000) / 100000; }; }
function dryOK(ctx, m, tx, ty) { if (tx < 1 || ty < 1 || tx >= m.w - 1 || ty >= m.h - 1 || ctx.isSolid(m, tx, ty)) return false; const t = ctx.getG(m, tx, ty); return t !== T.WATER && t !== T.DEEP && t !== T.REEF && t !== T.LAVA; }
function walkPx(ctx, x, y) { const m = ctx.S.map; return dryOK(ctx, m, Math.floor(x / 16), Math.floor(y / 16)); }
function openAt(ctx, m, tx, ty) { for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) if (!dryOK(ctx, m, tx + i, ty + j)) return false; return true; }
function zoneLv(id) { const n = +String(id).slice(1) || 1; return 12 + n + (n > 5 ? n - 5 : 0); }   /* M1 13 … M5 17 … M9 25 */
/* p110m: 4 Chấn Thú mới gặp / bắt được ở Làng mới, đặt theo HỆ của loài (anh 02/11): Moyaki + Oa Lì cạnh suối / ao, Molandak trên cao nguyên đồi, Chog đồng cỏ.
   HIẾM: mỗi lần vào Làng mỗi loài ~50 % có mặt (đổi theo khung 10 phút). Không phải thủ lĩnh (thủ lĩnh do farm106). Loài chưa có trong SPECIES thì bỏ qua. */
const V110 = [['molandak', 'hill'], ['chog', 'meadow'], ['moyaki', 'water'], ['oali', 'water']];
function spawnVillage110(ctx) {
  const m = ctx.S.map, T = ctx.T, R = rng(hash('village:110:' + Math.floor(Date.now() / 600000)));
  const wet = (tx, ty) => { for (let j = -2; j <= 2; j++) for (let i = -2; i <= 2; i++) { const g = ctx.getG(m, tx + i, ty + j); if (g === T.WATER || g === T.DEEP) return true; } return false; };
  const kind = (tx, ty) => (wet(tx, ty) ? 'water' : ty < 44 && tx <= 61 ? 'hill' : 'meadow');
  V110.forEach(([sp, want], i) => { if (!SPECIES[sp] || R() > 0.5) return; let at = null;
    for (let k = 0; k < 4000 && !at; k++) { const tx = 4 + Math.floor(R() * (m.w - 8)), ty = 4 + Math.floor(R() * (m.h - 8)); if (!openAt(ctx, m, tx, ty) || kind(tx, ty) !== want) continue; if (Math.hypot(tx - 80, ty - 62) < 16) continue; if (ST.wild.some(w => Math.hypot(w.hx - (tx * 16 + 8), w.hy - (ty * 16 + 12)) < 160)) continue; at = { x: tx * 16 + 8, y: ty * 16 + 12 }; }
    if (!at) return; ST.wild.push({ key: 'village:110:' + i, sp, lv: 14 + i, x: at.x, y: at.y, hx: at.x, hy: at.y, fx: 0, fy: 1, ct: R() * 2, wait: 1 + R() * 2, goal: null, moving: false, tier: SPECIES[sp].size || 'm' }); });
  if (typeof window !== 'undefined') window.__v110wild = () => ST.wild.filter(w => /village:110/.test(w.key)).map(w => ({ sp: w.sp, x: Math.round(w.x), y: Math.round(w.y) }));
}
function spawnWild(ctx) {
  ST.wild = []; const z = ctx.S.zone.id; if (z === 'village') { spawnVillage110(ctx); return; } const list = WILD[z]; if (!list) return;   /* p110m: Làng mới có thú hoang mới theo hệ */ const m = ctx.S.map, e = (m.entries && m.entries.default) || { x: m.w >> 1, y: m.h >> 1 }, R = rng(hash(z + ':ct'));
  list.forEach((sp, i) => {
    if (!SPECIES[sp]) return; let at = null;
    for (let k = 0; k < 600 && !at; k++) { const d = 7 + R() * 16, a = R() * Math.PI * 2, tx = Math.round(e.x + Math.cos(a) * d), ty = Math.round(e.y + Math.sin(a) * d * 0.8);
      if (!openAt(ctx, m, tx, ty)) continue; if (ST.wild.some(w => Math.hypot(w.hx - (tx * 16 + 8), w.hy - (ty * 16 + 12)) < 96)) continue; at = { x: tx * 16 + 8, y: ty * 16 + 12 }; }
    if (!at) return; const key = z + ':' + i;
    ST.wild.push({ key, sp, lv: zoneLv(z) + (i % 2), x: at.x, y: at.y, hx: at.x, hy: at.y, fx: 0, fy: 1, ct: R() * 2, wait: 1 + R() * 2, goal: null, moving: false, tier: SPECIES[sp].size || 'm' });
  });
}
const goneNow = w => (ST.gone[w.key] || 0) > performance.now() / 1000;
function markGone(key, why) { ST.gone[key] = performance.now() / 1000 + ((/:r:/.test(key) ? RARE_RESPAWN : RESPAWN)[why] || 45); }   /* p52d: con hiếm lâu hiện lại hơn */
function updWild(ctx, w, dt) {
  w.ct += dt; const p = ctx.S.player, dp = Math.hypot(p.x - w.x, p.y - w.y);
  if (dp < 40) { w.moving = false; w.goal = null; const dx = p.x - w.x, dy = p.y - w.y, d = Math.hypot(dx, dy) || 1; w.fx = dx / d; w.fy = dy / d; return; }   /* người chơi lại gần: đứng nhìn */
  if (w.wait > 0) { w.wait -= dt; w.moving = false; return; }
  if (!w.goal) { const a = Math.random() * Math.PI * 2, r = 12 + Math.random() * 40, gx = w.hx + Math.cos(a) * r, gy = w.hy + Math.sin(a) * r * 0.7; if (walkPx(ctx, gx, gy)) w.goal = { x: gx, y: gy }; else { w.wait = 0.4; return; } }
  const dx = w.goal.x - w.x, dy = w.goal.y - w.y, d = Math.hypot(dx, dy), v = SPEED[w.tier] || 17;
  if (d < 1.5) { w.goal = null; w.moving = false; w.wait = 1.4 + Math.random() * 2.6; return; }
  const s = Math.min(d, v * dt), nx = w.x + dx / d * s, ny = w.y + dy / d * s; w.fx = dx / d; w.fy = dy / d;
  if (!walkPx(ctx, nx, ny)) { w.goal = null; w.moving = false; w.wait = 0.8; return; }
  w.x = nx; w.y = ny; w.moving = true;
}
const inDuel = (ctx, w) => !!(ctx.duel && ctx.duel.wildKey && ctx.duel.wildKey() === w.key);   /* p79: đang đấu tại chỗ với con này → ẩn bản trên map (không hiện 2 con) */
function fightWild(ctx, w) {
  const LT0 = ctx.ltDuelTeam ? ctx.ltDuelTeam() : [];   /* p72: có linh thú đấu được thì cũng đánh thú hoang được */
  if (!hasStarter(ctx) && !LT0.length) { ctx.toast(ctx.S.save && ctx.S.save.flags && ctx.S.save.flags.p120new ? (ctx.lang() === 'en' ? 'No Quake Beast yet — talk to Noxx in the Village square to pick one.' : 'Chưa có Chấn Thú — gặp Noxx ở quảng trường Làng để chọn 1 con.') : L(ctx).noStarter); return; }
  if (!ctx.duel || !ctx.duel.start || ctx.duel.active()) return;
  if (ctx.comp79 && !ctx.comp79.out()) { ctx.comp79.need(); return; }   /* p79: thả Chấn Thú ra trước rồi mới đấu */
  const d = ensure(ctx), me = (ctx.comp79 && ctx.comp79.out() && d.team[0]) || (ctx.duelLead && ctx.duelLead()) || d.team[0], key = w.key, sp = w.sp, lv = w.lv, t = L(ctx);
  ctx.duel.start({ wildAt: { x: w.x, y: w.y }, wild: { sp, lv, key, ...(w.rare ? { rarity: 'hiem', rare: w.rare } : {}) }, mode: '1v1', lv: me.lv, team: [{ sp: me.sp, lv: me.lv, name: me.name, lt: me.lt || null }], foeTeam: [{ sp, lv }],
    onCatch: () => { const where = addMon(ctx, sp, lv); const dd = ensure(ctx); dd.caught++; ctx.persist(); markGone(key, 'caught'); try { ctx.toast(t.caught(spN(sp), where)); } catch (e) { } return where; },
    onWin: () => markGone(key, 'beaten'), onFlee: () => markGone(key, 'fled'), onLose: () => { } });
}

/* ---------- bệ Ấn Chấn ở Làng ---------- */
function placePad(ctx) {
  ST.pad = null; if (ctx.S.zone.id !== 'village') return; if (ctx.S.save && ctx.S.save.flags && ctx.S.save.flags.p120new) return;   /* p120: người mới chọn Chấn Thú ở Noxx — không có bệ 3 Ấn Chấn (save cũ giữ bệ) */ const m = ctx.S.map, e = m.entries && m.entries.default; if (!e) return;
  const clear = (tx, ty) => { for (let j = -2; j <= 3; j++) for (let i = -2; i <= 2; i++) if (!dryOK(ctx, m, tx + i, ty + j)) return false; return true; };   /* thoáng 5×6 ô: không cây / vật cao phía dưới che 3 viên */
  let best = null; for (let dy = -9; dy <= 2; dy++) for (let dx = -8; dx <= 8; dx++) { if (Math.abs(dx) < 2) continue; const tx = e.x + dx, ty = e.y + dy, d = Math.hypot(dx, dy * 1.2); if ((!best || d < best.d) && clear(tx, ty)) best = { tx, ty, d }; }   /* không chắn lối đi giữa */
  if (best) ST.pad = { x: best.tx * 16 + 8, y: best.ty * 16 + 12 };
}
function padOrbs(ctx) {   /* 3 viên (chưa chọn) / 2 viên còn lại (đã chọn) */
  const d = data(ctx), st = d && d.starter; return STARTERS.map((sp, i) => ({ sp, x: ST.pad.x + (i - 1) * 13, y: ST.pad.y + (i === 1 ? 2 : 0) })).filter(o => o.sp !== st);
}

/* ---------- bảng chọn / bảng đội (DOM nhỏ) ---------- */
function css() {
  if (document.getElementById('ct-css')) return; const s = document.createElement('style'); s.id = 'ct-css';
  s.textContent = `#ct-panel{position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:45;background:rgba(20,16,28,.95);border:2px solid #ffd45e;border-radius:12px;padding:10px 12px;color:#f5ecdc;font:20px VT323,monospace;width:min(94vw,420px);max-height:86vh;overflow:auto;box-sizing:border-box}
#ct-panel h3{margin:0 0 2px;font:bold 24px VT323,monospace;color:#ffd45e;text-align:center}#ct-panel p{margin:0 0 8px;text-align:center;color:#cfc4b4;font-size:18px;line-height:1.05}
#ct-panel .row{display:flex;gap:6px;justify-content:center}
#ct-panel .card{flex:1 1 0;min-width:0;background:#2a2234;border:2px solid #4a3c5c;border-radius:10px;padding:4px 2px 5px;color:#f5ecdc;font:18px VT323,monospace;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:1px;touch-action:manipulation}
#ct-panel .card.on{border-color:#ffd45e;background:#3a2e1c}#ct-panel .card img.p{width:64px;height:64px;image-rendering:pixelated}#ct-panel .card b{font-size:19px;line-height:1}
#ct-panel .chip{display:inline-flex;align-items:center;gap:2px;border-radius:6px;padding:0 4px;color:#1a1420;font-size:16px;line-height:18px}#ct-panel .chip img{width:14px;height:14px;image-rendering:pixelated}
#ct-panel label{display:flex;gap:6px;align-items:center;justify-content:center;margin:8px 0 2px}#ct-panel input{font:20px VT323,monospace;width:150px;padding:2px 6px;border-radius:6px;border:2px solid #6a5a7c;background:#120e18;color:#ffe9b0}
#ct-panel .r{display:flex;gap:8px;justify-content:center;margin-top:8px}#ct-panel button.b{font:21px VT323,monospace;padding:4px 14px;border-radius:9px;border:2px solid #ffd45e;background:#2a2234;color:#ffe9b0;cursor:pointer;touch-action:manipulation}
#ct-panel .tm{display:flex;align-items:center;gap:6px;background:#2a2234;border-radius:8px;padding:3px 6px;margin-bottom:4px}#ct-panel .tm img.p{width:36px;height:36px;image-rendering:pixelated}
#ct-panel .tm .i{flex:1;min-width:0;display:flex;flex-direction:column}#ct-panel .tm input{width:100%;box-sizing:border-box;font-size:19px}#ct-panel .tm small{color:#cfc4b4;font-size:16px}
#ct-panel .tm button{font:17px VT323,monospace;padding:2px 6px;border-radius:7px;border:2px solid #8a7a5a;background:#1c1624;color:#ffe9b0;cursor:pointer;white-space:nowrap}#ct-panel .tm button[disabled]{border-color:#ffd45e;opacity:1;color:#ffd45e}
#ct-panel .bx{color:#cfc4b4;font-size:17px;text-align:center}#ct-panel p.ord{font-size:16px;color:#ffe9b0;margin:-4px 0 6px}
#ct-panel .tm b.no{font:bold 18px VT323,monospace;width:16px;height:18px;line-height:18px;text-align:center;border-radius:5px;background:#1c1624;color:#8a7a9c;flex:none}#ct-panel .tm b.no.n3{background:#ffd45e;color:#1a1420}
#ct-panel .tm .ud{display:flex;flex-direction:column;gap:1px}#ct-panel .tm .ud button{padding:0 5px;font-size:13px;line-height:15px;border-color:#6a5a7c}#ct-panel .tm .ud button[disabled]{opacity:.3;color:#8a7a9c;border-color:#3a2e48}`;
  document.head.appendChild(s);
}
const port = sp => (SPR && SPR._port && SPR._port[sp]) ? BASE + SPR._port[sp] : BASE + 'linhduel/ui/port_' + sp + '.png';
const chip = (ctx, sp) => { const t = SPECIES[sp].types[0]; return `<span class="chip" style="background:${TYPE_COLOR[t]}"><img src="${BASE}linhduel/ui/icon_${t}.png" alt="">${(enL() ? TYPE_EN : TYPE_NAME)[t]}</span>`; };
function panelEl() { css(); let el = document.getElementById('ct-panel'); if (!el) { el = document.createElement('div'); el.id = 'ct-panel'; document.body.appendChild(el); } el.hidden = false; return el; }
function closePanel(ctx) { const el = document.getElementById('ct-panel'); if (el) el.hidden = true; ST.panel = null; if (ctx.S.mode === 'ctpick') ctx.setMode('play'); }
function openPick(ctx) {
  const t = L(ctx), el = panelEl(); let pick = STARTERS[0], typed = false; ST.panel = 'pick';
  const sz = sp => t.size[SPECIES[sp].size || 'm'];
  el.innerHTML = `<h3>${t.pickT}</h3><p>${t.pickLead}</p><div class="row">${STARTERS.map(sp => `<button class="card${sp === pick ? ' on' : ''}" data-sp="${sp}"><img class="p" src="${port(sp)}" alt=""><b>${esc(spN(sp))}</b>${chip(ctx, sp)}<small>${sz(sp)}</small></button>`).join('')}</div>
    <label>${t.name}: <input id="ct-name" maxlength="14" value="${esc(spN(pick))}"></label><div class="r"><button class="b" data-a="ok">${t.ok}</button><button class="b" data-a="no">${t.later}</button></div>`;
  const inp = el.querySelector('#ct-name'); inp.oninput = () => { typed = inp.value.trim() !== '' && inp.value.trim() !== spN(pick); };
  el.onclick = e => {
    const c = e.target.closest('.card'); if (c) { pick = c.dataset.sp; for (const b of el.querySelectorAll('.card')) b.classList.toggle('on', b === c); if (!typed) inp.value = spN(pick); return; }
    const b = e.target.closest('button.b'); if (!b) return; if (b.dataset.a === 'no') { closePanel(ctx); return; }
    choose(ctx, pick, inp.value); closePanel(ctx);
  };
  ctx.setMode('ctpick'); ctx.registerCloser('ctpick', () => closePanel(ctx));
}
function choose(ctx, sp, name) {
  if (hasStarter(ctx) || !STARTERS.includes(sp)) return false; const d = ensure(ctx), nm = String(name || '').trim().slice(0, 14) || spN(sp);
  d.starter = sp; d.team.unshift({ id: d.nextId++, sp, lv: STARTER_LV, name: nm }); d.anThu += GIFT; ctx.persist();
  try { ctx.toast(L(ctx).got(nm, GIFT), true); } catch (e) { } try { ctx.duelSfx && ctx.duelSfx('orb_pop'); } catch (e) { }
  return true;
}
function openTeam(ctx) {
  const t = L(ctx), d = ensure(ctx), el = panelEl(); ST.panel = 'team';
  const n = d.team.length, row = (m, i) => `<div class="tm"><b class="no${i < 3 ? ' n3' : ''}">${i + 1}</b><img class="p" src="${port(m.sp)}" alt=""><div class="i"><input data-id="${m.id}" maxlength="14" value="${esc(nmOf(m))}"><small>${esc(spN(m.sp))} · Lv${m.lv} ${chip(ctx, m.sp)}</small></div>`
    + `<span class="ud"><button data-mv="${i}" data-d="-1" title="${t.up}"${i === 0 ? ' disabled' : ''}>▲</button><button data-mv="${i}" data-d="1" title="${t.down}"${i === n - 1 ? ' disabled' : ''}>▼</button></span><button data-lead="${i}"${i === 0 ? ' disabled' : ''}>${i === 0 ? t.isLead : t.lead}</button></div>`;   /* p52d: ▲▼ xếp thứ tự ra trận (3v3 lấy 1–3, 6v6 lấy 1–6) */
  el.innerHTML = `<h3>${t.team.replace('◉ ', '')}</h3><p>${t.balls(d.anThu)}</p>${ctx.fieldct ? `<div class="r" style="margin:0 0 6px"><button class="b" data-a="tn">${ctx.lang() === 'en' ? '✦ Potential' : '✦ Tiềm Năng'}</button>${ctx.kho78 ? `<button class="b" data-a="sap">${ctx.lang() === 'en' ? '⚙ Moves' : '⚙ Sắp Chiêu'}</button>` : ''}</div>` : ''}${n > 1 ? `<p class="ord">${t.order}</p>` : ''}${d.team.map(row).join('')}
    <div class="bx">${t.box}: ${d.box.length ? d.box.map(m => esc(nmOf(m)) + ' Lv' + m.lv).join(' · ') : t.empty}</div>
    <div class="r"><button class="b" data-a="save">${t.save}</button><button class="b" data-a="no">${t.close}</button></div>`;
  const saveNames = () => { for (const inp of el.querySelectorAll('input[data-id]')) { const m = d.team.find(q => q.id === +inp.dataset.id); if (m) m.name = inp.value.trim().slice(0, 14) || spN(m.sp); } ctx.persist(); };
  el.onclick = e => {
    const ld = e.target.closest('button[data-lead]'); if (ld) { saveNames(); const i = +ld.dataset.lead; const [m] = d.team.splice(i, 1); d.team.unshift(m); ctx.persist(); openTeam(ctx); return; }
    const mv = e.target.closest('button[data-mv]'); if (mv) { saveNames(); moveMon(ctx, +mv.dataset.mv, +mv.dataset.d); openTeam(ctx); return; }
    const b = e.target.closest('button.b'); if (!b) return; if (b.dataset.a === 'sap') { saveNames(); closePanel(ctx); ctx.kho78.openSap(); return; }   /* p78: Sắp Chiêu */ if (b.dataset.a === 'tn') { saveNames(); closePanel(ctx); ctx.fieldct.openTN(); return; }   /* p74: bảng Tiềm Năng (fieldct.js) */ if (b.dataset.a === 'save') saveNames(); closePanel(ctx);
  };
  ctx.setMode('ctpick'); ctx.registerCloser('ctpick', () => closePanel(ctx));
}

function moveMon(ctx, i, dir) { const d = ensure(ctx), j = i + dir; if (i < 0 || j < 0 || i >= d.team.length || j >= d.team.length) return false; const t = d.team[i]; d.team[i] = d.team[j]; d.team[j] = t; ctx.persist(); return true; }   /* p52d: đổi chỗ 2 con kề nhau */

/* ---------- p52d (plan-58 C.4): CHẤN THÚ HIẾM theo giờ / thời tiết ----------
   Game chưa có hệ thời tiết toàn cục → dùng cái đang có: ĐÊM 19:00–2:00 / BÌNH MINH 6:00–7:00 theo đồng hồ game (ctx.clock),
   MƯA = người chơi đang đứng trong mưa Gọi Mưa (ctx.rainAt — linhthu.js), BÃO SÉT = vùng có sét (S.zone.lightning — M8).
   Mỗi vùng M1–M9 tối đa 1 con hiếm (độ hiếm 'hiem': tỉ lệ bắt gốc 35 %, Lv vùng + 3), hiện ở ô thoáng trong khung nhìn (không tán cây / vật che), cách người chơi ≥ 3,5 ô; hết điều kiện thì nó bỏ đi
   (trừ khi người chơi đứng sát / đang đấu). Báo: 1 dòng toast + biểu tượng TĨNH trên đầu nó + ghim trên bản đồ Vùng này (M) — không VFX lặp.
   Loài: chỉ dùng loài đã có sprite trận (Bóng Lẻ / Đom Sáng hệ Ảnh / Quang trong duel-data chưa có ảnh). Test: ctx.chanthu.setWx({ night: true }) hoặc URL ?wx=night|dawn|rain|storm. */
const RARE = { storm: ['loiho'], rain: ['bachkinh'], dawn: ['banhbao'], night: ['cuoitho', 'tinhmieu'] };
const RARE_ORDER = ['storm', 'rain', 'dawn', 'night'];
const RARE_Z100 = { m6: { sang: ['chog'] } };   /* p100: Chog (Mã, Hiếm) ở M6 Thành Nghiêng, giờ bản tin sáng 6–10 h */
const sangNow100 = ctx => { const c = ctx.clock, sv = ctx.S.save; if (ST.wxForce) return !ST.wxForce.night; if (!(c && sv && sv.clock)) return false; const t = c.hour + c.minute / 60; return t >= 6 && t < 10; };
const RARE_Z99 = { m1: { ven: ['moyaki'] } };   /* p99: Moyaki (Triều, Hiếm) ở M1 Bãi Bồi Yên, ban ngày, ven nước */
const dayNow99 = ctx => { const c = ctx.clock, sv = ctx.S.save; if (ST.wxForce) return !ST.wxForce.night && !ST.wxForce.dawn; if (!(c && sv && sv.clock)) return true; const t = c.hour + c.minute / 60; return t >= 7 && t < 18; };
function nearWater99(ctx, m, tx, ty) { for (let j = -2; j <= 2; j++) for (let i = -2; i <= 2; i++) { const x = tx + i, y = ty + j; if (x < 0 || y < 0 || x >= m.w || y >= m.h) continue; const t = ctx.getG(m, x, y); if (t === T.WATER || t === T.DEEP || t === T.REEF) return true; } return false; }
const RARE_Z = { m4: { day: ['molandak'] } };   /* p96: Molandak (Chấn, Hiếm) ở M4 Mỏ Đá Lở lúc trời quang ban ngày */
const RARE_RESPAWN = { fled: 90, beaten: 240, caught: 600 };
const RARE_ICON = 'ui/zmap/rare.png';
const RSTR = {
  vi: { day: 'ban ngày', sang: 'bản tin sáng', night: 'đêm', dawn: 'bình minh', rain: 'mưa', storm: 'bão sét', ven: 'ven nước', appear: (n, k) => `✦ ${n} HIẾM xuất hiện (${k}) · bản đồ M`, pin: (n, k) => `${n} hiếm (${k})`, leave: n => `${n} hiếm đã bỏ đi`, wildL: (n, lv) => `⚔ ${n} HIẾM Lv${lv}` },
  en: { day: 'daytime', sang: 'morning news', night: 'night', dawn: 'dawn', rain: 'rain', storm: 'thunderstorm', ven: 'by the water', appear: (n, k) => `✦ RARE ${n} appeared (${k}) · map M`, pin: (n, k) => `Rare ${n} (${k})`, leave: n => `The rare ${n} has left`, wildL: (n, lv) => `⚔ RARE ${n} Lv${lv}` },
};
const RL = ctx => RSTR[ctx.lang() === 'en' ? 'en' : 'vi'];
function wxNow(ctx) {
  if (ST.wxForce) return { ...ST.wxForce };
  const c = ctx.clock, sv = ctx.S.save, has = !!(c && sv && sv.clock), t = has ? c.hour + c.minute / 60 : 12, p = ctx.S.player;
  let rain = false; try { rain = !!(ctx.rainAt && p && ctx.rainAt(p.x, p.y)); } catch (e) { }
  return { night: has && (t >= 19 || t < 2), dawn: has && t >= 6 && t < 7,   /* bình minh 6:00–7:00 (~36 s thật mỗi sáng) */ rain, storm: !!(ctx.S.zone && ctx.S.zone.lightning) };
}
const rareKind = ctx => { const w = wxNow(ctx); return RARE_ORDER.find(k => w[k]) || null; };
/* p52d v2 (điều phối: con hiếm chui dưới hàng tán cây trên điện thoại): ô hiện phải THOÁNG — không vật nào vẽ sau nó (gốc thấp hơn) đè lên khung sprite
   (cả phần đầu + biểu tượng: ±14 px ngang, 34 px trên chân), và nằm TRONG khung nhìn (điện thoại dọc: dải 30–88 % chiều cao, chừa HUD trên); cách người chơi ≥ 3,5 ô. */
function occluded(ctx, x, y) {
  const m = ctx.S.map, X0 = x - 14, X1 = x + 14, Y0 = y - 34, Y1 = y + 3;
  for (const o of m.objects || []) { const d = O[o.type]; if (!d || o.ghost) continue; const by = (o.y + d.fh) * 16; if (by <= y - 2) continue;   /* vật gốc cao hơn chân con thú → vẽ trước, không che */
    const ai = o.artImg, k = ai && !ai.__w ? (ai.__hi || 1) : 1, w = ai ? ai.width / k : d.w, h = ai ? ai.height / k : d.h,   /* artImg 2× (toCanvas __hi) → cỡ logic */ ox = o.x * 16 + (o.artImg ? 0 : (d.ox || 0)), oy = by - h + (o.artImg ? 0 : (d.oy || 0));
    if (ox < X1 && ox + w > X0 && oy < Y1 && oy + h > Y0) return true; }
  return false;
}
const UI_SEL = '#pxhud > *:not(#px-label):not(#px-banner), #px-notes, #hud .hud-tl, #hud .hud-tr, #px-clock, #px-status, #px-money, #herobar, #hotbar, #touch button, #joy, #mslots > *, #btn-map, #btn-codex, #btn-menu, #lt-orb, .dpad';
function uiRects(ctx) {   /* p52d v3 (ảnh điện thoại): khung HUD / thông báo đổi ra toạ độ thế giới — con hiếm không hiện dưới chữ; khung thông báo nới thêm ~2 dòng cho chính thông báo con hiếm */
  const out = []; try { const cv = document.getElementById('c'), c = ctx.cam; if (!cv || !c) return out; const r = cv.getBoundingClientRect(), k = r.width / (ctx.VW || 320); if (!k) return out;
    for (const e of document.querySelectorAll(UI_SEL)) { if (e.hidden || e.closest('[hidden]')) continue; const q = e.getBoundingClientRect(); if (q.width < 2 || q.height < 2) continue; const ext = e.id === 'px-notes' ? 70 : 6;
      out.push({ x0: c.cx + (q.left - 6 - r.left) / k, x1: c.cx + (q.right + 6 - r.left) / k, y0: c.cy + (q.top - 6 - r.top) / k, y1: c.cy + (q.bottom + ext - r.top) / k }); } } catch (e) { }
  return out;
}
function viewRect(ctx) {   /* phần khung game THẬT SỰ thấy trên màn (canvas có thể tràn ra ngoài cửa sổ điện thoại) → toạ độ thế giới */
  const c = ctx.cam, VW = ctx.VW || 320, VH = ctx.VH || 200; if (!c) return null; let v = { x0: c.cx, x1: c.cx + VW, y0: c.cy, y1: c.cy + VH };
  try { const r = document.getElementById('c').getBoundingClientRect(), k = r.width / VW; if (k > 0) v = { x0: c.cx + Math.max(0, -r.left) / k, x1: c.cx + (Math.min(innerWidth, r.right) - r.left) / k, y0: c.cy + Math.max(0, -r.top) / k, y1: c.cy + (Math.min(innerHeight, r.bottom) - r.top) / k }; } catch (e) { }
  return v;
}
function rareSpot(ctx, offOK) {
  const m = ctx.S.map, p = ctx.S.player, c = ctx.cam, VW = ctx.VW || 320, VH = ctx.VH || 200, tall = VH > VW * 1.1, cands = [], far = [], UR = uiRects(ctx);
  const nearGate = (x, y) => (m.gates || []).some(g => x > g.x * 16 - 40 && x < (g.x + g.w) * 16 + 40 && y > g.y * 16 - 24 && y < (g.y + g.h) * 16 + 56);   /* lối ra có nhãn tên vùng nổi phía trên → tránh */
  const underUI = (x, y) => UR.some(u => x + 14 > u.x0 && x - 14 < u.x1 && y + 3 > u.y0 && y - 44 < u.y1);   /* cả biểu tượng trên đầu */
  const ok = (tx, ty) => { if (!openAt(ctx, m, tx, ty)) return null; if (ST.rareNear99 && !nearWater99(ctx, m, tx, ty)) return null; const x = tx * 16 + 8, y = ty * 16 + 12; if (ST.wild.some(w => Math.hypot(w.x - x, w.y - y) < 64) || occluded(ctx, x, y) || underUI(x, y) || nearGate(x, y)) return null; return { x, y }; };
  const V = viewRect(ctx); if (V) { const H = V.y1 - V.y0, x0 = V.x0 + 20, x1 = V.x1 - 20, y0 = V.y0 + H * 0.12 + 34, y1 = V.y0 + H * 0.9;   /* HUD / thông báo đã loại bằng uiRects */
    for (let ty = Math.floor(y0 / 16); ty * 16 + 12 <= y1; ty++) for (let tx = Math.floor(x0 / 16); tx * 16 + 8 <= x1; tx++) { const d = Math.hypot(tx * 16 + 8 - p.x, ty * 16 + 12 - p.y); if (d < 56) continue; const q = ok(tx, ty); if (q) (d <= 160 ? cands : far).push(q); } }
  const pool = cands.length ? cands : far; if (pool.length) return pool[Math.floor(Math.random() * pool.length)]; if (!offOK) return null;   /* khung đang kín chữ / tán cây: chờ lần kiểm sau (mỗi 1 s, tối đa ~12 s) */
  const ptx = Math.floor(p.x / 16), pty = Math.floor(p.y / 16);   /* khung nhìn không còn chỗ thoáng: quanh người chơi 4–10 ô */
  for (let k = 0; k < 500; k++) { const d = 4 + Math.random() * 6, a = Math.random() * Math.PI * 2, q = ok(Math.round(ptx + Math.cos(a) * d), Math.round(pty + Math.sin(a) * d * 0.8)); if (q) return q; }
  return null;
}
function pondNear(ctx, R) {   /* p97: có ô nước nông / sâu trong R ô quanh người chơi (ao, đầm, suối) */
  const m = ctx.S.map, p = ctx.S.player; if (!m || !p) return false; const tx = Math.floor(p.x / 16), ty = Math.floor(p.y / 16);
  for (let j = -R; j <= R; j++) for (let i = -R; i <= R; i++) { const x = tx + i, y = ty + j; if (x < 0 || y < 0 || x >= m.w || y >= m.h) continue; const t = ctx.getG(m, x, y); if (t === T.WATER || t === T.DEEP) return true; }
  return false;
}
function rareTick(ctx) {
  const z = ctx.S.zone.id; if (!WILD[z] || !ctx.S.player) return; const k = rareKind(ctx) || (RARE_Z100[z] && RARE_Z100[z].sang && sangNow100(ctx) ? 'sang' : null) || (RARE_Z99[z] && RARE_Z99[z].ven && dayNow99(ctx) ? 'ven' : null) || (RARE_Z[z] && RARE_Z[z].day ? 'day' : null), p = ctx.S.player; let cur = ST.wild.find(w => w.rare);
  if (cur && cur.rare !== k) {   /* hết giờ / tạnh: bỏ đi (người chơi đang sát bên hay đang đấu thì chờ) */
    if (Math.hypot(p.x - cur.x, p.y - cur.y) < 48 || (ctx.duel && ctx.duel.active && ctx.duel.active())) return;
    ST.wild = ST.wild.filter(w => w !== cur); if (!goneNow(cur)) { try { ctx.toast(RL(ctx).leave(spN(cur.sp))); } catch (e) { } } ST.rareLog.push({ t: +(performance.now() / 1000).toFixed(1), z, ev: 'leave', sp: cur.sp, k: cur.rare }); cur = null;   /* điều kiện mới (vd đêm → bình minh) thì con mới hiện ngay */
  }
  if (cur || !k) return; const key = z + ':r:' + k; if ((ST.gone[key] || 0) > performance.now() / 1000) return;
  const list = (RARE_Z[z] && RARE_Z[z][k]) || (RARE_Z100[z] && RARE_Z100[z][k]) || (RARE_Z99[z] && RARE_Z99[z][k]) || RARE[k],   /* p116: sửa lỗi gộp p99/p100 — thiếu RARE_Z99 → 'ven' (Moyaki M1) lỗi list undefined mỗi khung */ n = +String(z).slice(1) || 1, sp = list[n % list.length]; if (!SPECIES[sp]) return; ST.rareNear99 = k === 'ven'; const at = rareSpot(ctx, (ST.rareWait = (ST.rareWait || 0) + 1) > 12); if (!at) return; ST.rareWait = 0;
  ST.wild.push({ key, sp, lv: zoneLv(z) + 3, rare: k, x: at.x, y: at.y, hx: at.x, hy: at.y, fx: 0, fy: 1, ct: Math.random() * 2, wait: 1.5, goal: null, moving: false, tier: SPECIES[sp].size || 'm' });
  ST.rareLog.push({ t: +(performance.now() / 1000).toFixed(1), z, ev: 'appear', sp, k }); if (ST.rareLog.length > 120) ST.rareLog.splice(0, ST.rareLog.length - 120); /* c2-raloi rareLog */ const R0 = RL(ctx); try { ctx.toast(R0.appear(spN(sp), R0[k])); } catch (e) { }
}
function rarePins(ctx) { const R0 = RL(ctx); return ST.wild.filter(w => w.rare && !goneNow(w)).map(w => ({ x: w.x, y: w.y - 8, kind: 'rare', label: R0.pin(spN(w.sp), R0[w.rare]) })); }
function drawRareIcon(g, w, cx, cy) {   /* biểu tượng TĨNH trên đầu (ảnh PixelLab 32 px → 10 px logic, vẽ kèm cỡ đích) */
  const im = img(RARE_ICON), S0 = SPR && SPR[w.sp], c = S0 && S0.idle; if (!im || !c) return; const top = Math.round(w.y - cy - c.ay / 2 + (c.top != null ? c.top / 2 : 4));
  g.drawImage(im, 0, 0, im.naturalWidth, im.naturalHeight, Math.round(w.x - cx - 5), top - 12, 10, 10);
}

/* ---------- quầy Thương nhân (market.js) ---------- */
function shopRow(ctx) {
  const t = L(ctx), inv = ctx.S.save.inv || {}, d = data(ctx), n = d ? d.anThu | 0 : 0, can = (inv.stone || 0) >= PRICE;
  return `<div class="hrow"><span class="hwho"><b><img src="${BASE}duel/anthu/anthu_icon.png" alt="" style="width:20px;height:20px;image-rendering:pixelated;vertical-align:-4px"> ${t.anthu}</b> <span class="chip">${PRICE} 🪨</span> <span class="dim">${t.anthuNote}</span></span>
    <span class="hnum"><b>×${n}</b></span><button class="btn primary" data-anthu="1" style="font-size:18px;padding:4px 12px${can ? '' : ';opacity:.35;cursor:default'}"${can ? '' : ' disabled'}>${ctx.lang() === 'en' ? 'Buy' : 'Mua'}</button></div>`;
}
function buyBall(ctx) {
  const inv = ctx.S.save.inv; if ((inv.stone || 0) < PRICE) { ctx.toast(L(ctx).poor); return false; }
  inv.stone -= PRICE; ensure(ctx).anThu++; ctx.persist(); ctx.toast(L(ctx).bought); return true;
}

export const chanthu = {
  id: 'chanthu',
  always: true,
  onZoneEnter(ctx) {
    ST.ctx = ctx; loadSpr(); img(ORB.file); closePanel(ctx);
    ctx.chanthu = { data: () => data(ctx), ensure: () => ensure(ctx), hasStarter: () => hasStarter(ctx), team: () => (data(ctx) || { team: [] }).team.slice(), balls: () => { const d = data(ctx); return d ? d.anThu | 0 : 0; },
      useBall: () => { const d = data(ctx); if (!d || d.anThu <= 0) return false; d.anThu--; ctx.persist(); return true; }, addBall: n => { ensure(ctx).anThu += n | 0; ctx.persist(); }, add: (sp, lv, nm) => addMon(ctx, sp, lv, nm), choose: (sp, nm) => choose(ctx, sp, nm),
      wild: () => ST.wild.filter(w => !w.rare).map(w => ({   /* p52d: con hiếm xem ở rare() */ key: w.key, sp: w.sp, lv: w.lv, x: Math.round(w.x), y: Math.round(w.y), gone: goneNow(w), moving: w.moving })), pad: () => ST.pad && { ...ST.pad, orbs: padOrbs(ctx).map(o => o.sp) },
      fight: i => { const w = ST.wild[i | 0]; if (!w || goneNow(w)) return false; fightWild(ctx, w); return true; }, openPick: () => openPick(ctx), openTeam: () => openTeam(ctx), panel: () => ST.panel, gone: () => ({ ...ST.gone }), ungone: () => { ST.gone = {}; },
      shopRow: () => shopRow(ctx), buy: () => buyBall(ctx), markGone: (k, why) => markGone(k, why),
      move: (i, dir) => moveMon(ctx, i, dir), battleTeam: mode => (data(ctx) || { team: [] }).team.slice(0, TEAM_SIZE[mode] || 1),   /* p52d: đội ra trận theo thể thức */
      wx: () => wxNow(ctx), setWx: o => { ST.wxForce = o ? { night: !!o.night, dawn: !!o.dawn, rain: !!o.rain, storm: !!o.storm } : null; rareTick(ctx); return wxNow(ctx); }, rareTick: () => rareTick(ctx),
      rare: () => ST.wild.filter(w => w.rare).map(w => ({ key: w.key, sp: w.sp, lv: w.lv, k: w.rare, x: Math.round(w.x), y: Math.round(w.y), gone: goneNow(w) })), rareLog: () => ST.rareLog.slice(-20), pins: () => rarePins(ctx), occ: (x, y) => occluded(ctx, x, y), view: () => ({ V: viewRect(ctx), UR: uiRects(ctx).map(u => [u.x0, u.y0, u.x1, u.y1].map(Math.round)), cam: ctx.cam, VW: ctx.VW, VH: ctx.VH, p: [Math.round(ctx.S.player.x), Math.round(ctx.S.player.y)] }) };
    ctx.chanthuShopRow = () => shopRow(ctx);
    ctx.chanthuShopBind = (el, rerender) => { for (const b of el.querySelectorAll('[data-anthu]')) b.onclick = () => { if (buyBall(ctx)) rerender(); }; };
    spawnWild(ctx); placePad(ctx); img(RARE_ICON);
    if (ST.wxForce === null && !ST.wxUrl) { ST.wxUrl = true; try { const q = new URLSearchParams(location.search).get('wx'); if (q) { const s = q.split(','); ST.wxForce = { night: s.includes('night'), dawn: s.includes('dawn'), rain: s.includes('rain'), storm: s.includes('storm') }; } } catch (e) { } }   /* ?wx= cho preset rare_test */
    ST.rareT = 0; rareTick(ctx);
  },
  onZoneLeave(ctx) { closePanel(ctx); ST.wild = []; ST.pad = null; },
  near(ctx) {
    if (ctx.S.mode !== 'play' || (ctx.duel && ctx.duel.active && ctx.duel.active())) return null; const p = ctx.S.player, t = L(ctx);
    if (ST.pad && Math.hypot(p.x - ST.pad.x, p.y - ST.pad.y) < 30) return { label: hasStarter(ctx) ? t.team : t.pick, x: ST.pad.x, y: ST.pad.y - 6, limit: 30, priority: true, data: 'ctpad' };
    let best = null, bd = 30; for (const w of ST.wild) { if (goneNow(w)) continue; const d = Math.hypot(p.x - w.x, p.y - w.y); if (d < bd) { bd = d; best = w; } }
    return best ? { label: best.rare ? RL(ctx).wildL(spN(best.sp), best.lv) : t.wildL(spN(best.sp), best.lv), x: best.x, y: best.y - 8, limit: 30, priority: true, data: { wild: best } } : null;
  },
  interact(ctx, cand) {
    if (!cand) return; if (cand.data === 'ctpad') { if (hasStarter(ctx)) openTeam(ctx); else openPick(ctx); return; }
    if (cand.data && cand.data.wild) fightWild(ctx, cand.data.wild);
  },
  key(code, ctx) { if (ST.panel && code === 'Escape') { closePanel(ctx); return true; } return false; },
  update(dt, ctx) { if (ctx.S.mode !== 'play' && ctx.S.mode !== 'ctpick') return; for (const w of ST.wild) if (!goneNow(w) && !inDuel(ctx, w)) updWild(ctx, w, Math.min(dt, 0.1)); if ((ST.rareT += dt) >= 1) { ST.rareT = 0; rareTick(ctx); } },
  drawables(ctx, cx, cy) {
    const g = ctx.g, out = [];
    for (const w of ST.wild) if (!goneNow(w) && !inDuel(ctx, w)) out.push({ y: w.y, f: () => { drawMon(g, w, cx, cy); if (w.rare) drawRareIcon(g, w, cx, cy); } });
    if (ST.pad) for (const o of padOrbs(ctx)) { const c = orbTinted(SPECIES[o.sp].types[0]); if (c) out.push({ y: o.y, f: () => g.drawImage(c, 0, 0, ORB.fw, ORB.fw, Math.round(o.x - cx - 8), Math.round(o.y - cy - 13), 16, 16) }); }   /* ảnh 32 px = 16 px logic (vẽ kèm cỡ đích) */
    return out;
  },
};
