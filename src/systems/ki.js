// ki.js — plan-34 (anh duyệt 2026-10-14): KI (7 nấc) + NHÀO LỘN NÉ (2 nấc) + LƯỚT TỚI ĐÁNH (1 nấc).
// 2026-10-14 (anh: "muốn TỰ sử dụng các đòn lộn và né"): mặc định DÙNG TAY; Tự động vẫn còn trong menu ⚙ cho người chơi nhẹ nhàng.
// 2026-10-15 (anh: "các kỹ năng lộn và lao cứ đủ Ki là dùng, không cần phải tự bấm"): mặc định đổi lại TỰ ĐỘNG (save v3); Tự bấm chọn trong ⚙. Nút Lộn / Lướt + Shift / K vẫn bấm tay được.
//
// THANH KI: thanh dọc XANH LÁ ngay cạnh thanh máu (#herobar .hb-kv, hero.js gọi ctx.kiMount), khung kiv.png = khung máu PixelLab đổi màu
//   (tools/px-kibar.py), 6 vạch chia mờ (7 nấc). Loé ngắn khi đầy thêm 1 nấc hoặc khi tiêu (sự kiện) — không hiệu ứng lặp.
// NẠP: chém trúng +⅓ · bị trúng +¼ · trong trận đứng yên không đánh ≥ 2 s: ~1 nấc / 6 s · ngoài trận ~1 nấc / 1,5 s; ×(1 + 1 %/cấp). Tối đa 7.
// NHÀO LỘN NÉ (2 nấc, miễn đòn 0,35 s, hồi 1,2 s) — máy tính: Shift · điện thoại: nút 'Lộn' cạnh nút A.
//   Hướng: theo hướng đang đi (phím / cần điều khiển); đứng yên → tránh đòn có báo trước gần nhất (vuông góc đường đòn / ra xa tâm vòng); không có → lùi về sau.
//   NÉ HOÀN HẢO: lộn trong ~0,2 s trước khi một đòn có báo trước chạm → 'Né hoàn hảo!' + chậm thời gian rất ngắn + hoàn 1 nấc.
//   Đang bay (chong chóng): LỘN XOAY GIỮA TRỜI — cả người + chong chóng xoay 1 vòng quanh giữa thân (hình do hệ bay vẽ), lách ngang.
//   Đang bơi / hình riêng hệ khác: lách ngang + bóng mờ. Đang đi bè: không lộn.
// LƯỚT TỚI ĐÁNH (1 nấc, hồi 0,8 s) — máy tính: K hoặc chuột phải · điện thoại: nút 'Lướt'.
//   Có mục tiêu khóa trong ~7 ô → lướt tới (dừng ở vật cản) + chém ×1,3 (monsters.strike đọc ctx.kiStrikeMul). Không có → lướt ngắn theo hướng đi / nhìn, không chém.
// TỰ ĐỘNG (tuỳ chọn ⚙): tự lộn khi đòn có báo trước sắp chạm (≤ 0,25 s); bấm E/A khi mục tiêu khóa ở xa 3–7 ô → tự lướt (móc target.sayFar → ctx.kiDash).
// CHUYỂN ĐỘNG: KHÔNG đụng p.speedMul (trước đây knock.js / aircombat lưu nhầm 0 rồi trả lại 0 → người chơi đứng im — lỗi 'speedMul = 0').
//   Thay vào đó gán tạm p.update (bỏ phím đi) + p.draw (clip PixelLab roll / dash, hoặc xoay hình bay) lên CHÍNH đối tượng người chơi; hết động tác xoá đi.
//   Bị hất / lộn nhào trên không / ngất / đổi vùng → huỷ động tác ngay (ctx.kiAbort, knock.js gọi). Canh gác: còn sót p.update/p.draw của ki khi không có động tác → xoá.
//
// API cho trùm / quái (ctx.threat): ctx.threat.add({ id?, kind, from:{x,y}, to:{x,y}, at | in | speed+t0, width? | radius?, dur? }) → id ;
//   remove(id) · clear() · list(). Chi tiết: src/systems/API.md mục Ki. Test: window.__ki.
import { ART } from '../art.js';
import { monsters } from './monsters.js';
import { Entity } from '../entities.js';
import { SHADOW, shadowAt, shadowFor } from './shadow.js';   /* plan-66: bóng dưới chân (ảnh PixelLab flyshadow, co + nhạt theo độ cao) */

const MAX = 7, ROLL_COST = 2, DASH_COST = 1, LEAD = 0.25, IFR = 0.35, ROLL_CD = 1.2, DASH_CD = 0.8, PERFECT = 0.2;
const ROLL_T = 0.32, ROLL_MIN = 30, ROLL_MAX = 56, ROLL_FREE = 46, JINK_T = 0.22, AIR_T = 0.42, AIR_D = 46;
const DASH_MIN = 46, DASH_MAX = 116, DASH_SP = 430, DASH_STOP = 20, DASH_FREE = 56, STRIKE_MUL = 1.3, PR = 6;
const STR = {
  vi: { auto: 'Ki: Tự động (tự lộn né + tự lướt)', manual: 'Ki: Tự bấm (Shift lộn · K / chuột phải lướt)', low: 'Chưa đủ Ki', cd: 'Đang hồi chiêu', tip: 'Ki — Nhào lộn né (2 nấc) · Lướt tới đánh (1 nấc)',
    perfect: 'Né hoàn hảo!', roll: 'Lộn', dash: 'Lướt',
    tutPc: 'Ki (7 ngọc xanh cạnh chân dung, giữa dưới): Shift = nhào lộn né (2 nấc) · K hoặc chuột phải = lướt tới đánh (1 nấc). Lộn đúng lúc đòn sắp chạm = Né hoàn hảo!',
    tutAuto: 'Ki (7 ngọc xanh cạnh chân dung): đủ Ki là TỰ nhào lộn né đòn sắp trúng (2 nấc) và TỰ lướt tới chém khi đánh mục tiêu ở xa (1 nấc). Muốn tự bấm: ⚙ → Ki.',
    tutTouch: 'Ki (7 ngọc xanh cạnh chân dung): nút Lộn = nhào lộn né (2 nấc) · nút Lướt = lướt tới đánh (1 nấc). Lộn đúng lúc đòn sắp chạm = Né hoàn hảo!' },
  en: { auto: 'Ki: Auto (auto dodge + dash)', manual: 'Ki: Manual (Shift roll · K / right-click dash)', low: 'Not enough Ki', cd: 'Cooling down', tip: 'Ki — Dodge roll (2) · Dash strike (1)',
    perfect: 'Perfect dodge!', roll: 'Roll', dash: 'Dash',
    tutPc: 'Ki (7 green orbs by your portrait, bottom centre): Shift = dodge roll (2) · K or right-click = dash strike (1). Roll right before a hit lands = Perfect dodge!',
    tutAuto: 'Ki (7 green orbs by your portrait): with enough Ki you AUTO-roll away from incoming hits (2) and AUTO-dash in when attacking a far target (1). Manual mode: ⚙ → Ki.',
    tutTouch: 'Ki (7 green orbs by your portrait): Roll button = dodge roll (2) · Dash button = dash strike (1). Roll right before a hit lands = Perfect dodge!' },
};
const ST = { ki: MAX, cd: { roll: 0, dash: 0 }, ifr: 0, mv: null, ghosts: [], thr: new Map(), nid: 1, lastHitSeen: -99, dealtT: -99, takenT: -99,
  stillT: 0, bonusUntil: 0, log: [], el: null, sig: '', btns: null, flashT: 0, flashN: 0, ctx: null, shiftDown: 0, shiftDirty: false, slowUntil: 0, perfT: 0,
  stats: { roll: 0, jink: 0, air: 0, dash: 0, dashFree: 0, perfect: 0, noKi: 0, gain: 0, abort: 0, guard: 0 } };
const L = ctx => STR[ctx.lang() === 'vi' ? 'vi' : 'en'];
const sv = ctx => { const s = ctx.S.save; s.sys ||= {}; s.sys.ki ||= {}; const k = s.sys.ki; if (k.v !== 3) { k.v = 3; k.auto = true; } return k; };   /* v3 (2026-10-15 anh: 'đủ Ki là dùng, không cần tự bấm'): mặc định TỰ ĐỘNG, mọi save chuyển; Tự bấm vẫn chọn được trong ⚙ */   /* v2: mặc định TỰ BẤM (save cũ đang 'tự động' cũng chuyển) */
const isAuto = ctx => sv(ctx).auto === true;
const now = ctx => ctx.S.time;
const p_ = ctx => ctx.S.player;
const faceOf = (dx, dy) => (Math.abs(dx) >= Math.abs(dy) ? (dx >= 0 ? 2 : 1) : (dy >= 0 ? 0 : 3));
const DV = [[0, 1], [-1, 0], [1, 0], [0, -1]];
const lvMul = ctx => 1 + Math.max(0, ((ctx.hero && ctx.hero.lv) || 1) - 1) * 0.01;
let MQ_TOUCH = null; const touchUI = () => typeof matchMedia !== 'undefined' && (MQ_TOUCH || (MQ_TOUCH = matchMedia('(pointer: coarse)'))).matches;   /* plan-42 A6: không tạo MediaQueryList mỗi khung */
const flying = ctx => { const p = ctx.S.player; return !!(p && (p.airBody || (ctx.air && ctx.air.on && ctx.air.on()) || (ctx.playerAir && ctx.playerAir()) || (ctx.S.map && ctx.S.map.sky && p.custom))); };   /* sân trời (aircombat) · tầng Trung trên vùng đất · trời (sky.js) đang bay */
function log(ctx, type, extra) { ST.log.push({ t: +now(ctx).toFixed(2), type, ki: +ST.ki.toFixed(2), ...(extra || {}) }); if (ST.log.length > 60) ST.log.shift(); }
function gain(ctx, n, why) { const k0 = ST.ki; ST.ki = Math.min(MAX, ST.ki + n); if (ST.ki > k0 && why) { ST.stats.gain += ST.ki - k0; } }
function spend(ctx, n) { if (ST.ki + 1e-6 < n) return false; const before = Math.floor(ST.ki + 1e-6); ST.ki = Math.max(0, ST.ki - n); ST.flashT = 0.45; ST.flashN = before; return true; }

/* ---------------- đòn có báo trước ---------------- */
function addThreat(ctx, o) {
  if (!o || !o.from || !o.to) return null;
  const id = o.id != null ? o.id : 'k' + ST.nid++, old = ST.thr.get(id);
  const t = { ...(old || {}), ...o, id, from: { x: o.from.x, y: o.from.y }, to: { x: o.to.x, y: o.to.y } };
  if (t.at == null && t.speed == null && o.in == null) t.at = now(ctx) + 0.5;
  if (t.speed != null) t.t0 = o.t0 != null ? o.t0 : now(ctx);   /* đạn: from = vị trí lúc gọi → mỗi lần cập nhật tính lại từ bây giờ */
  if (o.in != null) t.at = now(ctx) + o.in;
  t.width = t.width || 12; t.dur = t.dur || 0; if (!old) t.done = false;
  ST.thr.set(id, t); return id;
}
function segInfo(t, x, y) {   /* khoảng cách điểm → đoạn from→to, vị trí chiếu dọc đường (px) */
  const ax = t.from.x, ay = t.from.y, dx = t.to.x - ax, dy = t.to.y - ay, L2 = dx * dx + dy * dy || 1;
  const u = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / L2)), qx = ax + dx * u, qy = ay + dy * u;
  return { d: Math.hypot(x - qx, y - qy), along: u * Math.sqrt(L2), len: Math.sqrt(L2), ux: dx / Math.sqrt(L2), uy: dy / Math.sqrt(L2) };
}
function impactAt(t, p) { if (t.speed != null) { const s = segInfo(t, p.x, p.y - PR); return t.t0 + s.along / Math.max(1, t.speed); } return t.at; }
function hits(t, x, y) {
  if (t.radius != null) return Math.hypot(x - t.to.x, y - t.to.y) <= t.radius + PR;
  return segInfo(t, x, y).d <= t.width / 2 + PR;
}
function expired(ctx, t) { const p = p_(ctx), at = impactAt(t, p); return now(ctx) > at + t.dur + 0.6; }
function incoming(ctx, within) {   /* đòn có báo trước sẽ trúng người chơi trong `within` giây (gần nhất trước) */
  const p = p_(ctx); let best = null, bt = 1e9;
  for (const t of ST.thr.values()) { if (t.done) continue; const at = impactAt(t, p), left = at - now(ctx); if (left > within || now(ctx) > at + t.dur + 0.05) continue; if (!hits(t, p.x, p.y - PR)) continue; if (left < bt) { bt = left; best = t; } }
  return best ? { t: best, left: bt } : null;
}

/* ---------------- di chuyển: lộn / lộn xoay trên không / lách / lướt ---------------- */
function freeRun(ctx, ux, uy, dist) {   /* đi thử từng 2 px: được bao xa trước khi chạm ô cứng */
  const p = p_(ctx), m = ctx.S.map; let ok = 0;
  const G = m.gates || [], onGate = (x, y) => { const tx = Math.floor(x / 16), ty = Math.floor((y - 3) / 16); return G.some(g => tx >= g.x && tx < g.x + g.w && ty >= g.y && ty < g.y + g.h); };   /* 2026-10-15: lộn / lướt (nhất là TỰ ĐỘNG) không lao vào ô lối chuyển vùng — trước đây tự lộn hất người từ Làng sang Biển */
  for (let s = 2; s <= dist; s += 2) { const x = p.x + ux * s, y = p.y + uy * s; if (p.blocked(x, y, m, []) || onGate(x, y)) break; ok = s; }
  return ok;
}
function moveStep(ctx, dx, dy) {   /* như knock.moveGround: từng bước nhỏ, ô cứng chặn */
  const p = p_(ctx), n = Math.max(1, Math.ceil(Math.hypot(dx, dy) / 2)); let hit = false;
  for (let i = 0; i < n; i++) { const sx = dx / n, sy = dy / n, ox = p.x, oy = p.y; p.tryMove(sx, sy, ctx.S.map, []); if (Math.abs(p.x - ox - sx) > 0.01 || Math.abs(p.y - oy - sy) > 0.01) { hit = true; break; } }
  return hit;
}
function busy(ctx) {
  const S = ctx.S, p = p_(ctx);
  if (S.mode !== 'play' || !p || !S.map) return 'mode';
  if (ctx.hero && ctx.hero.fainted) return 'faint';
  if (ctx.knocked && ctx.knocked()) return 'knocked';
  if (ctx.air && ctx.air.tumbling && ctx.air.tumbling()) return 'tumble';
  if (S.sea && S.sea.riding) return 'riding';
  if (ST.mv) return 'moving';
  if (p.speedMul === 0) return 'frozen';   /* hệ khác đang giữ người chơi đứng yên (chụp ảnh, bị túm…) */
  return null;
}
const ownDraw = p => !p.custom;   /* người chơi đang dùng hình thường → lộn / lướt bằng clip PixelLab */
function freezeUpdate(dt) { this.moving = false; this.autoPath = null; this.animate(dt); }   /* thay Player.update trong lúc lộn / lướt: bỏ phím đi, giữ đồng hồ clip */
freezeUpdate.__ki = true;
function measureCenter(ctx, p) {   /* tâm hình đang vẽ (so với chân) — dùng cho lộn xoay trên không: vẽ thử ra canvas phụ rồi lấy khung bao */
  try {
    const W = 160, H = 220, c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
    g.translate(80 - p.x, 190 - p.y); Entity.prototype.draw.call(p, g);
    const d = g.getImageData(0, 0, W, H).data; let x0 = W, y0 = H, x1 = -1, y1 = -1;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (d[(y * W + x) * 4 + 3] > 80) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    if (x1 >= 0) return { dx: (x0 + x1) / 2 - 80, dy: (y0 + y1) / 2 - 190 };
  } catch (e) { }
  return { dx: 0, dy: -9 - (ctx.air && ctx.air.on && ctx.air.on() && ctx.air.lift ? ctx.air.lift() : 24) };
}
function startMove(ctx, kind, ux, uy, dist, dur, extra) {
  const p = p_(ctx), own = ownDraw(p) && kind !== 'jink' && kind !== 'air';
  const mv = { kind, ux, uy, dist, dur, t: 0, done: 0, x0: p.x, y0: p.y, row: faceOf(ux, uy), own, gT: 0, spin: ux >= 0 ? 1 : -1, ...(extra || {}) };
  p.autoPath = null; if (p.endAct) p.endAct();
  p.update = freezeUpdate;
  if (own) { const f = function (g) { drawMove(g, this, mv); }; f.__ki = true; p.draw = f; }
  else if (kind === 'air') {   /* hệ bay hỗ trợ móc ent.kiSpin (chỉ xoay người + chong chóng, không xoay Rocky bay cạnh) → dùng móc; chưa có → xoay cả hình bay */
    mv.hook = !!(p.airBody ? ctx.airKiSpin : ctx.skyKiSpin); mv.c = measureCenter(ctx, p);
    if (mv.hook) p.kiSpin = { ang: 0 }; else { const f = function (g) { drawSpin(g, this, mv); }; f.__ki = true; p.draw = f; } }
  ST.mv = mv; return mv;
}
function clearOverrides(p) {
  if (!p) return false; let any = false;
  if (Object.prototype.hasOwnProperty.call(p, 'update') && p.update && p.update.__ki) { delete p.update; any = true; }
  if (Object.prototype.hasOwnProperty.call(p, 'draw') && p.draw && p.draw.__ki) { delete p.draw; any = true; }
  return any;
}
function endMove(ctx, cut) {
  const mv = ST.mv, p = p_(ctx); if (!mv) return; ST.mv = null;
  clearOverrides(p); if (p.kiSpin) delete p.kiSpin;
  if (!cut) p.dir = mv.face != null ? mv.face : mv.row;
  if (cut) { ST.stats.abort++; log(ctx, 'abort', { kind: mv.kind }); }
  if (!cut && mv.kind !== 'dash') fx(ctx, 'ki_dust', p.x, p.y + 1) || fx(ctx, 'footstep_dust', p.x, p.y + 1);
  if (mv.kind === 'dash' && mv.onEnd && !cut) { try { mv.onEnd(); } catch (e) { console.error('ki dash strike', e); } }
}
function fx(ctx, name, x, y, top, flip) { return !!(ctx.vfx && ctx.hasVfx && ctx.hasVfx(name) && ctx.vfx(name, x, y, 0, top, flip)); }
function iframes(ctx, sec) { ST.ifr = Math.max(ST.ifr, sec); if (ctx.hero && ctx.hero.iframes) ctx.hero.iframes(sec, true); }

function rollDir(ctx, t) {   /* → [{ ux, uy, need }] các hướng thử, tốt trước */
  const p = p_(ctx), cx = p.x, cy = p.y - PR, inp = ctx.input || {};
  const ix = (inp.right ? 1 : 0) - (inp.left ? 1 : 0), iy = (inp.down ? 1 : 0) - (inp.up ? 1 : 0);
  if (ix || iy) { const l = Math.hypot(ix, iy); return [{ ux: ix / l, uy: iy / l, need: ROLL_FREE }]; }   /* tự bấm: theo hướng đang đi */
  if (t) {
    if (t.radius != null) {   /* vòng: lộn ra xa tâm; tâm trùng người → vuông góc hướng đòn */
      let ax = cx - t.to.x, ay = cy - t.to.y, l = Math.hypot(ax, ay);
      if (l < 1) { const s = segInfo(t, cx, cy); ax = -s.uy; ay = s.ux; l = 1; }
      ax /= l; ay /= l; const R = t.radius + PR + 4;
      return [{ ux: ax, uy: ay, need: R - l }, { ux: -ay, uy: ax, need: R }, { ux: ay, uy: -ax, need: R }];
    }
    const s = segInfo(t, cx, cy), half = t.width / 2 + PR + 4; let nx = -s.uy, ny = s.ux;   /* đường thẳng: vuông góc, ưu tiên phía đang đứng */
    if (segInfo(t, cx + nx * 4, cy + ny * 4).d < s.d) { nx = -nx; ny = -ny; }
    return [{ ux: nx, uy: ny, need: half - s.d }, { ux: -nx, uy: -ny, need: half + s.d }];
  }
  const [fx0, fy0] = DV[p.dir & 3]; return [{ ux: -fx0, uy: -fy0, need: ROLL_FREE }, { ux: -fy0, uy: fx0, need: ROLL_FREE }, { ux: fy0, uy: -fx0, need: ROLL_FREE }];   /* đứng yên, không có đòn: lùi về sau */
}
function dodge(ctx, t, manual) {
  const why = busy(ctx); if (why) return false;
  if (ST.cd.roll > 0) { if (manual) say(ctx, L(ctx).cd); return false; }
  if (ST.ki + 1e-6 < ROLL_COST) { if (t) t.noKi = true; ST.stats.noKi++; if (manual) say(ctx, L(ctx).low); return false; }
  const p = p_(ctx), air = flying(ctx), kind = air ? 'air' : ownDraw(p) ? 'roll' : 'jink';
  const inc = manual ? incoming(ctx, 0.8) : null, tt = t || (inc && inc.t);
  let best = null;
  for (const c of rollDir(ctx, tt)) {
    const want = air ? AIR_D : Math.max(ROLL_MIN, Math.min(ROLL_MAX, c.need + 6)), run = freeRun(ctx, c.ux, c.uy, want);
    const score = run >= Math.min(want, Math.max(ROLL_MIN, c.need)) ? 1000 - c.need : run;
    if (!best || score > best.score) best = { ...c, run, want, score };
  }
  if (!best || best.run < 6) { if (t) t.blocked = true; if (manual) { best = { ...(best || rollDir(ctx, null)[0]), run: 0 }; } else return false; }   /* bị kẹt: tự bấm vẫn lộn tại chỗ (miễn đòn), tự động thì thôi */
  /* né hoàn hảo: có đòn báo trước sắp chạm (≤ 0,2 s) đúng lúc bấm lộn */
  const perf = manual && inc && inc.left <= PERFECT && inc.left >= -0.05;
  spend(ctx, ROLL_COST); ST.cd.roll = ROLL_CD; iframes(ctx, IFR + (perf ? 0.15 : 0));
  startMove(ctx, kind, best.ux, best.uy, best.run, kind === 'roll' ? ROLL_T : kind === 'air' ? AIR_T : JINK_T, { face: p.dir });
  if (tt) tt.done = true;
  ST.stats[kind]++; log(ctx, kind, { threat: tt ? tt.kind || 'threat' : 'free', dist: best.run, manual: !!manual, perfect: !!perf });
  ctx.sfx('knock_whoosh'); if (!air) fx(ctx, 'ki_dust', p.x, p.y + 1) || fx(ctx, 'footstep_dust', p.x, p.y + 1);
  if (perf) perfect(ctx);
  return true;
}
function perfect(ctx) {
  const p = p_(ctx), S = ctx.S; ST.stats.perfect++; gain(ctx, 1); ST.perfT = 1.0; log(ctx, 'perfect');
  ST.perfTxt = L(ctx).perfect;   /* chữ nhỏ trên đầu (drawUI) */
  ST.perfW = !!(ctx.wfx && ctx.wfx('perfect', p.x, p.y, {}));   /* plan-69: vòng pixel code; có thì bỏ vầng gradient */
  if (ctx.sfx) ctx.sfx('coin');
  if ((S.timeScale ?? 1) === 1) { S.timeScale = 0.35; ST.slowOwn = true; ST.slowUntil = performance.now() + 260; }   /* chậm rất ngắn (thời gian thật 0,26 s) */
}

function lockedFoe(ctx) {
  const lk = ctx.target && ctx.target.mon && ctx.target.mon(); if (!lk) return null;
  const mo = lk.mo || lk.ref, tg = lk.kind === 'tent' ? lk.ref : mo; if (!mo || !(mo.hp > 0) || mo.statue) return null;
  if (mo.c && mo.c.spar && !(ctx.sparFoe && ctx.sparFoe() === mo)) return null;
  return { mo, tg, tent: lk.kind === 'tent' ? lk.ref : null };
}
function dash(ctx, manual) {
  const why = busy(ctx); if (why) return false;
  if (!manual && !isAuto(ctx)) return false;
  const f = lockedFoe(ctx), p = p_(ctx);
  const d = f ? Math.hypot(f.tg.x - p.x, f.tg.y - p.y) : Infinity;
  if (!manual && (!f || d < DASH_MIN || d > DASH_MAX)) return false;
  if (ST.cd.dash > 0) { if (manual) say(ctx, L(ctx).cd); return false; }
  if (ST.ki + 1e-6 < DASH_COST) { if (manual) say(ctx, L(ctx).low); return false; }
  if (!manual && f.mo.c && f.mo.c.boss && ST.ki + 1e-6 < DASH_COST + ROLL_COST) return false;   /* tự động đánh trùm: chừa 2 nấc cho né */
  if (f && d <= DASH_MAX) {
    const ux = (f.tg.x - p.x) / (d || 1), uy = (f.tg.y - p.y) / (d || 1), want = Math.max(0, d - DASH_STOP - (f.mo.c && f.mo.c.boss && !f.tent ? 6 : 0)), run = freeRun(ctx, ux, uy, want);
    if (want < 8) { strikeAfter(ctx, f); return true; }   /* đã sát: chém luôn (không tốn Ki) */
    if (run < 10 && !manual) return false;
    spend(ctx, DASH_COST); ST.cd.dash = DASH_CD;
    const mv = startMove(ctx, 'dash', ux, uy, run, Math.max(0.1, run / DASH_SP), { face: faceOf(ux, uy), foe: f });
    mv.onEnd = () => strikeAfter(ctx, f);
    ST.stats.dash++; log(ctx, 'dash', { dist: Math.round(run), want: Math.round(want), manual: !!manual });
    ctx.sfx('knock_whoosh'); fx(ctx, 'ki_wind', p.x, p.y, false, ux < 0);
    return true;
  }
  /* không có mục tiêu (hoặc quá xa): lướt ngắn theo hướng đi / nhìn, không chém */
  const inp = ctx.input || {}; let ix = (inp.right ? 1 : 0) - (inp.left ? 1 : 0), iy = (inp.down ? 1 : 0) - (inp.up ? 1 : 0);
  if (f) { ix = f.tg.x - p.x; iy = f.tg.y - p.y; } else if (!ix && !iy) [ix, iy] = DV[p.dir & 3];
  const l = Math.hypot(ix, iy) || 1, ux = ix / l, uy = iy / l, run = freeRun(ctx, ux, uy, DASH_FREE);
  if (run < 8) return false;
  spend(ctx, DASH_COST); ST.cd.dash = DASH_CD;
  startMove(ctx, flying(ctx) ? 'jink' : 'dash', ux, uy, run, Math.max(0.1, run / DASH_SP), { face: faceOf(ux, uy) });
  ST.stats.dashFree++; log(ctx, 'dash_free', { dist: Math.round(run) });
  ctx.sfx('knock_whoosh'); fx(ctx, 'ki_wind', p.x, p.y, false, ux < 0);
  return true;
}
function strikeAfter(ctx, f) {   /* tới nơi → chém đúng mục tiêu bằng luồng đánh thường (clip attack, monsters.strike) với ×1,3 */
  const p = p_(ctx); if (p.faceTo) p.faceTo(f.tg.x, f.tg.y);
  let c = monsters.near(ctx);
  if (c && c.need && c.needId && ctx.hold) { ctx.hold(c.needId); c = monsters.near(ctx); }
  if (!c || !c.data || !c.data.mo) { log(ctx, 'dash_nohit', { d: Math.round(Math.hypot(f.tg.x - p.x, f.tg.y - p.y)) }); return; }
  ST.bonusUntil = now(ctx) + 0.9; ST.inStrike = true;
  try { monsters.interact(ctx, c); } finally { ST.inStrike = false; }
}
function say(ctx, s) { if (now(ctx) - (ST.sayT || -9) > 1.2) { ST.sayT = now(ctx); ctx.toast(s); ctx.sfx('fail'); } }

/* ---------------- vẽ ---------------- */
function clipOf(p, name) { const a = p.sheet && p.sheet.actions; return a && a[name]; }
function poseOf(p, mv) {   /* → { c, f, row } clip PixelLab theo tiến độ, hoặc null */
  const u = Math.min(0.999, mv.t / mv.dur), c = clipOf(p, mv.kind === 'dash' ? 'dash' : 'roll');
  return c ? { c, f: Math.min(c.n - 1, Math.floor(u * c.n)), row: mv.row } : null;
}
function drawPose(g, pose, x, y) { const c = pose.c, cw = c.cw || 16, ch = c.ch || 20; g.drawImage(c.img, pose.f * cw, pose.row * ch, cw, ch, Math.round(x) - (cw >> 1), Math.round(y) - 18 - (ch - 20), cw, ch); }
function drawMove(g, p, mv) {
  const x = Math.round(p.x), y = Math.round(p.y);
  if (!SHADOW.on) { g.fillStyle = 'rgba(0,0,0,.28)'; g.beginPath(); g.ellipse(x, y + 1, 6, 2.2, 0, 0, 7); g.fill(); }   /* plan-66: bóng do shadow.drawGround vẽ (lớp nền) */
  const pose = poseOf(p, mv);
  if (pose) { drawPose(g, pose, x, y); return; }
  /* chưa có clip PixelLab (thân khác): dự phòng — hình thường xoay quanh giữa thân (lộn) hoặc ngả về trước (lướt) */
  const u = Math.min(1, mv.t / mv.dur), a = mv.kind === 'roll' ? mv.spin * u * Math.PI * 2 : mv.spin * 0.25;
  g.save(); g.translate(x, y - 9); g.rotate(a); g.translate(-x, -(y - 9));
  const d0 = p.dir; p.dir = mv.row; try { Entity.prototype.draw.call(p, g); } finally { p.dir = d0; } g.restore();
}
function spinAngle(mv) { const u = Math.min(1, mv.t / mv.dur), e = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2; return mv.spin * e * Math.PI * 2; }
function drawSpin(g, p, mv) {   /* lộn xoay giữa trời: hình của hệ bay (người + chong chóng) xoay 1 vòng quanh giữa thân */
  const cx = p.x + mv.c.dx, cy = p.y + mv.c.dy;
  g.save(); g.translate(cx, cy); g.rotate(spinAngle(mv)); g.translate(-cx, -cy);
  try { Entity.prototype.draw.call(p, g); } finally { g.restore(); }
}
function snapGhost(ctx, mv) {   /* bóng mờ: chụp hình hiện tại tại vị trí này */
  const p = p_(ctx);
  ST.ghosts.push({ x: p.x, y: p.y, pose: mv.own ? poseOf(p, mv) : null, ang: mv.kind === 'air' ? spinAngle(mv) : 0, c: mv.c || null, t: 0, life: mv.kind === 'dash' ? 0.22 : 0.26 });
  if (ST.ghosts.length > 10) ST.ghosts.shift();
}
function drawGhost(g, ctx, gh, cx, cy) {
  const a = 0.42 * (1 - gh.t / gh.life); if (a <= 0.02) return;
  const p = p_(ctx); g.save(); g.globalAlpha = a;
  try {
    if (gh.pose) drawPose(g, gh.pose, gh.x - cx, gh.y - cy);
    else { const px = Object.create(p); px.x = gh.x; px.y = gh.y; g.translate(-cx, -cy);
      if (gh.c) { const ox = gh.x + gh.c.dx, oy = gh.y + gh.c.dy; g.translate(ox, oy); g.rotate(gh.ang); g.translate(-ox, -oy); }
      Entity.prototype.draw.call(px, g); }
  } catch (e) { /* hình của hệ khác không vẽ được ở bản sao → bỏ bóng mờ */ }
  g.restore();
}

/* ---------------- thanh Ki (DOM, trong #herobar) ---------------- */
function kiEl(ctx) {
  if (ST.el) return ST.el;
  const el = document.createElement('div'); el.className = 'hb-kv'; el.title = L(ctx).tip;
  let ticks = ''; for (let i = 1; i < MAX; i++) ticks += `<b class="kt" style="bottom:${(i / MAX * 100).toFixed(2)}%"></b>`;
  el.innerHTML = `<div class="hb-kslot"><i class="kf"></i>${ticks}</div>`;
  ST.el = el; ST.sig = ''; ST.segShown = Math.floor(ST.ki + 1e-6); return el;
}
function renderBar(ctx) {
  const el = ST.el; if (!el || !el.isConnected) return;
  const seg = Math.floor(ST.ki + 1e-6);
  if (ST.segShown != null && seg !== ST.segShown) { ST.glowT = 0.4; }   /* vừa đầy thêm 1 nấc / vừa tiêu → loé ngắn (sự kiện) */
  ST.segShown = seg;
  const glow = (ST.glowT || 0) > 0 || ST.flashT > 0, q = Math.round(ST.ki * 40) / 40, sig = q + '|' + glow;
  if (sig === ST.sig) return; ST.sig = sig;
  el.querySelector('.kf').style.height = (q / MAX * 100).toFixed(1) + '%';
  el.classList.toggle('glow', glow); el.title = `${L(ctx).tip} · ${Math.floor(ST.ki + 1e-6)}/${MAX}`;
}
/* ---------------- nút điện thoại: Lộn + Lướt (icon PixelLab ui/ki/roll.png, dash.png — tools/px-kibtn.py) ---------------- */
/* 2026-10-14 v3 (ảnh điện thoại của anh: 2 nút chồng lên nhau, vuông, đè chỗ nút 🚁): 2 nút TRÒN khung vòng HUD (ui/mslots/ring.png — cùng khung nút Ăn / Túi),
   đặt CẠNH NHAU thành 1 cặp ở chỗ trống gần nút A. Tránh mọi nút đang hiện (A, Ăn, Túi, 🎯, kỹ năng Rocky, cần điều khiển, cần độ cao, nút trời 🚁…)
   + GIỮ CHỖ 3 ô mà sky.js placeBtns sẽ chọn cho nút bay (sky.js không biết nút Ki → em mô phỏng đúng thuật toán của nó để không bao giờ đè). */
const KW = 50, KG = 6;
function skySlots(r) {   /* mô phỏng sky.js placeBtns: 3 ô (46 px, cách 8) trái hàng A / cột trên A / hàng trên-trái, tránh đúng danh sách 'others' của sky.js */
  const vis = id => { const e = document.getElementById(id), q = e && e.getBoundingClientRect(); return q && q.width && getComputedStyle(e).display !== 'none' ? q : null; };
  const others = ['joy', 'btn-tgt', 'herobar', 'btn-menu', 'btn-photo', 'btn-chat', 'px-clock', 'px-status', 'px-money', 'hotbar'].map(vis).filter(Boolean)
    .concat([...document.querySelectorAll('#mslots .ms-eat, #mslots .ms-bag')].map(e => e.getBoundingClientRect()).filter(q => q.width));
  const W = 46, gap = 8, used = [], hit = (x, y) => x < 0 || y < 0 || x + W > innerWidth || y + W > innerHeight || others.concat(used).some(q => x < q.right + 2 && x + W > q.left - 2 && y < q.bottom + 2 && y + W > q.top - 2);
  const cand = []; for (let i = 1; i <= 4; i++) cand.push([r.left - i * (W + gap), r.top + (r.height - W) / 2], [r.left + (r.width - W) / 2, r.top - i * (W + gap)], [r.left - i * (W + gap), r.top - (W + gap)]);
  for (let k = 0; k < 3; k++) { const at = cand.find(([x, y]) => !hit(x, y)) || cand[0]; used.push({ left: at[0], top: at[1], right: at[0] + W, bottom: at[1] + W }); }
  return used;
}
function kiButtons(ctx) {
  const host = document.getElementById('touch'); if (!host) return;
  if (!ST.btns) {
    const mk = (id, img, fn) => { const b = document.createElement('button'); b.id = id; b.className = 'kib'; b.hidden = true; b.innerHTML = `<img src="assets/px/ui/ki/${img}.png" alt=""><i></i><s></s>`;
      b.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); if (ST.ctx && ST.ctx.S.mode === 'play') fn(ST.ctx); }); host.appendChild(b); return b; };
    ST.btns = { roll: mk('btn-roll', 'roll', c => dodge(c, null, true)), dash: mk('btn-dash', 'dash', c => dash(c, true)) };
  }
  const show = ctx.S.mode === 'play' && touchUI() && !isAuto(ctx), B = ST.btns;   /* 2026-10-15 anh: 'Bỏ nút lướt và lộn' — chế độ Tự động (mặc định) không hiện nút; chọn Tự bấm trong ⚙ thì nút trở lại */
  for (const b of [B.roll, B.dash]) if (b.hidden === show) b.hidden = !show;
  if (!show) return;
  const lab = L(ctx); if (B.roll.querySelector('i').textContent !== lab.roll) { B.roll.querySelector('i').textContent = lab.roll; B.dash.querySelector('i').textContent = lab.dash; }
  const set = (b, cd, cdMax, cost) => { const f = cd > 0 ? cd / cdMax : 0, low = ST.ki + 1e-6 < cost; b.style.setProperty('--cd', f.toFixed(3)); b.classList.toggle('low', low); b.classList.toggle('cool', f > 0); };
  set(B.roll, ST.cd.roll, ROLL_CD, ROLL_COST); set(B.dash, ST.cd.dash, DASH_CD, DASH_COST);
  if ((ST.layT = (ST.layT || 0) - 1) > 0) return; ST.layT = 20;   /* đặt lại ~3 lần/giây */
  const a = document.getElementById('btn-a'), r = a && a.getBoundingClientRect(); if (!r || !r.width) return;
  const taken = skySlots(r);
  for (const e of document.querySelectorAll('#touch button, .sky-btn, #btn-copter, #mslots > *, #joy, .dpad, #altw, #herobar, #hotbar, #px-clock, #px-status, #px-money, #btn-chat')) {
    if (e.classList.contains('kib') || e.hidden || e.closest('[hidden]') || getComputedStyle(e).display === 'none' || getComputedStyle(e).visibility === 'hidden') continue;
    const q = e.getBoundingClientRect(); if (q.width && q.height) taken.push(q); }
  const free = (x, y) => x >= 4 && y >= 4 && x + KW <= innerWidth - 4 && y + KW <= innerHeight - 4 && !taken.some(q => !(x + KW <= q.left - 3 || x >= q.right + 3 || y + KW <= q.top - 3 || y >= q.bottom + 3));
  /* ứng viên CẶP (Lướt bên trái, Lộn bên phải), xếp theo khoảng cách tới nút A: các hàng phía trên A (căn phải theo A, lùi dần sang trái), rồi hàng ngang A về bên trái */
  const cands = [], step = KW + KG;
  for (let row = 1; row <= 5; row++) for (let col = 0; col <= 5; col++) cands.push([Math.round(r.right - 2 * KW - KG - col * step), Math.round(r.top - row * step)]);
  for (let col = 1; col <= 6; col++) cands.push([Math.round(r.left - col * step - KW - KG), Math.round(r.top + (r.height - KW) / 2)]);
  const ax = r.left + r.width / 2, ay = r.top + r.height / 2;
  cands.sort((p, q) => Math.hypot(p[0] + KW + KG / 2 - ax, p[1] + KW / 2 - ay) - Math.hypot(q[0] + KW + KG / 2 - ax, q[1] + KW / 2 - ay));
  let pos = cands.find(([x, y]) => free(x, y) && free(x + KW + KG, y));
  if (!pos) pos = [Math.max(4, Math.round(r.left - 2 * KW - KG - 8)), Math.max(4, Math.round(r.top - KW - 60))];   /* không còn chỗ: vẫn giữ cặp cạnh nhau, không chồng */
  ST.kiPairFree = !!cands.find(([x, y]) => free(x, y) && free(x + KW + KG, y));
  const put = (b, x, y) => { const k = x + ',' + y; if (b.dataset.pos !== k) { b.dataset.pos = k; b.style.left = x + 'px'; b.style.top = y + 'px'; } };
  put(B.dash, pos[0], pos[1]); put(B.roll, pos[0] + KW + KG, pos[1]);
}

/* ---------------- phím: Shift = lộn · K = lướt · chuột phải = lướt ---------------- */
if (typeof window !== 'undefined') {
  const ok = () => ST.ctx && ST.ctx.S && ST.ctx.S.mode === 'play' && ST.ctx.S.map;
  addEventListener('keydown', e => {
    if (e.key === 'Shift') {
      if (e.repeat || !ok()) return;
      if (flying(ST.ctx)) { ST.shiftDown = performance.now(); ST.shiftDirty = false; return; }   /* đang bay: Shift còn là phím phụ (Shift+X hạ cánh, Shift+lăn chuột) → lộn khi THẢ nhanh */
      dodge(ST.ctx, null, true); return;
    }
    if (ST.shiftDown) ST.shiftDirty = true;
    if (e.code === 'KeyK' && !e.repeat && ok() && !e.ctrlKey && !e.metaKey && !e.altKey) { const t = e.target; if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return; dash(ST.ctx, true); }
  });
  addEventListener('keyup', e => {
    if (e.key !== 'Shift' || !ST.shiftDown) return; const quick = performance.now() - ST.shiftDown < 350 && !ST.shiftDirty; ST.shiftDown = 0;
    if (quick && ok()) dodge(ST.ctx, null, true);
  });
  addEventListener('blur', () => { ST.shiftDown = 0; });
  addEventListener('pointerdown', e => {   /* chuột phải trên màn chơi = lướt (cầm viên hồi máu dưới nước thì để underwater.js dùng) */
    if (e.button !== 2 || !ok() || !e.target || e.target.id !== 'c') return; const C = ST.ctx;
    if (C.held && /pill/.test(String(C.held() || ''))) return;
    e.preventDefault(); dash(C, true);
  });
  addEventListener('contextmenu', e => { if (ok() && e.target && e.target.id === 'c' && !(ST.ctx.held && /pill/.test(String(ST.ctx.held() || '')))) e.preventDefault(); });
}

export const ki = {
  id: 'ki', always: true,   /* chạy cả ở vùng giới hạn hệ (khe nứt trùm, đèo, trời, dưới nước…) */
  onZoneEnter(ctx) {
    ST.ctx = ctx; ST.thr.clear(); ST.ghosts.length = 0; ST.lastHitSeen = ctx.monsters && ctx.monsters.lastHitT ? ctx.monsters.lastHitT() : -99;
    ST.mv = null; clearOverrides(p_(ctx));
    const sk = sv(ctx); if (typeof sk.ki === 'number' && ST.restored !== true) { ST.ki = Math.max(0, Math.min(MAX, sk.ki)); } ST.restored = true;
    const h = ctx.hero;
    if (h && !h.__ki) { const h0 = h.hit; h.hit = (d, ...a) => { const r = h0.call(h, d, ...a); if (r && d > 0) { ST.takenT = now(ctx); gain(ctx, 0.25, 'hurt'); } return r; }; h.__ki = true; }
    ctx.threat = { add: o => addThreat(ctx, o), remove: id => ST.thr.delete(id), clear: () => ST.thr.clear(), list: () => [...ST.thr.values()] };
    ctx.kiStrikeMul = () => { if (now(ctx) < ST.bonusUntil) { ST.bonusUntil = 0; log(ctx, 'dash_hit'); return STRIKE_MUL; } return 1; };
    ctx.kiMount = host => { const bars = host && host.querySelector('.hb-bars'); if (!bars) return; const el = kiEl(ctx); if (el.parentNode !== bars) bars.insertBefore(el, bars.firstChild); ST.sig = ''; renderBar(ctx); };
    ctx.kiDash = () => (ST.inStrike ? false : dash(ctx, false));
    ctx.kiAbort = () => { if (ST.mv) endMove(ctx, true); };   /* knock.js gọi khi bắt đầu hất người chơi */
    ctx.ki = {
      get: () => ST.ki, max: MAX, auto: () => isAuto(ctx),
      toggleAuto: () => { const s = sv(ctx); s.auto = !isAuto(ctx); ctx.persist(); ctx.toast(s.auto ? L(ctx).auto : L(ctx).manual); return s.auto; },
      menuLabel: () => (isAuto(ctx) ? L(ctx).auto : L(ctx).manual),
      busy: () => !!ST.mv, iframes: () => ST.ifr > 0, roll: () => dodge(ctx, null, true), dash: () => dash(ctx, true),
    };
    if (typeof window !== 'undefined') window.__ki = {
      state: () => ({ ki: +ST.ki.toFixed(3), auto: isAuto(ctx), fight: !!ST.fight, stillT: +ST.stillT.toFixed(2), dealtT: +ST.dealtT.toFixed(2), cd: { roll: +ST.cd.roll.toFixed(2), dash: +ST.cd.dash.toFixed(2) }, ifr: +ST.ifr.toFixed(2),
        mv: ST.mv ? { kind: ST.mv.kind, t: +ST.mv.t.toFixed(2), done: Math.round(ST.mv.done), own: ST.mv.own, ang: ST.mv.kind === 'air' ? +spinAngle(ST.mv).toFixed(2) : 0, c: ST.mv.c || null } : null, threats: ST.thr.size, perfTxt: ST.perfTxt || null, stats: { ...ST.stats }, clip: { roll: !!clipOf(p_(ctx), 'roll'), dash: !!clipOf(p_(ctx), 'dash') }, flying: flying(ctx),
        over: { update: Object.prototype.hasOwnProperty.call(p_(ctx), 'update'), draw: Object.prototype.hasOwnProperty.call(p_(ctx), 'draw'), spin: !!p_(ctx).kiSpin }, spinHook: !!(ctx.skyKiSpin || ctx.airKiSpin) }),
      set: n => { ST.ki = Math.max(0, Math.min(MAX, n)); return ST.ki; },
      mode: auto => { sv(ctx).auto = !!auto; return isAuto(ctx); },
      clearCd: () => { ST.cd.roll = 0; ST.cd.dash = 0; },
      log: () => ST.log.slice(), roll: () => dodge(ctx, null, true), dash: () => dash(ctx, true), manual: () => dodge(ctx, null, true),
      /* bắn thử 1 viên đạn CÓ khai báo vào người chơi: tới nơi mà người chơi còn trên đường đạn thì trúng thật (hero.hit) */
      fire: (o = {}) => { const p = p_(ctx), ang = o.ang ?? 0, dist = o.dist ?? 90, sp = o.speed ?? 180, fx0 = p.x + Math.cos(ang) * dist, fy0 = p.y - PR + Math.sin(ang) * dist, tx = p.x, ty = p.y - PR, ex = tx + (tx - fx0) / dist * 40, ey = ty + (ty - fy0) / dist * 40;
        const b = { x: fx0, y: fy0, vx: (tx - fx0) / dist * sp, vy: (ty - fy0) / dist * sp, life: (dist + 40) / sp, dmg: o.dmg ?? 10, hit: false, id: null, declare: o.declare !== false };
        if (b.declare) b.id = addThreat(ctx, { kind: 'projectile', from: { x: fx0, y: fy0 }, to: { x: ex, y: ey }, speed: sp, t0: now(ctx), width: 8 });
        (ST.shots ||= []).push(b); return { id: b.id, eta: +(dist / sp).toFixed(3) }; },
      shots: () => (ST.shots || []).map(b => ({ x: Math.round(b.x), y: Math.round(b.y), hit: b.hit })),
      lastShot: () => ST.lastShot || null,
      foe: () => { const f = lockedFoe(ctx); return f ? { x: Math.round(f.tg.x), y: Math.round(f.tg.y), hp: f.mo.hp, d: Math.round(Math.hypot(f.tg.x - p_(ctx).x, f.tg.y - p_(ctx).y)) } : null; },
      pairFree: () => !!ST.kiPairFree, buttons: () => ST.btns ? ['roll', 'dash'].map(k => { const b = ST.btns[k], q = b.getBoundingClientRect(); return { k, hidden: b.hidden, x: Math.round(q.x), y: Math.round(q.y), w: Math.round(q.width), low: b.classList.contains('low'), cool: b.classList.contains('cool') }; }) : null,
    };
  },
  onZoneLeave(ctx) { if (ST.mv) endMove(ctx, true); ST.thr.clear(); ST.ghosts.length = 0; ST.shots = []; try { sv(ctx).ki = +ST.ki.toFixed(2); } catch (e) { } },
  key(code, ctx) { return false; },
  update(dt, ctx) {
    const S = ctx.S, p = p_(ctx); if (!p || !S.map) return;
    if (ST.slowOwn && performance.now() >= ST.slowUntil) { ST.slowOwn = false; if (S.timeScale === 0.35) S.timeScale = 1; }
    /* bọc ctx.knockPlayer: đang miễn đòn sau khi lộn → không bị hất (đi dọc chuỗi bọc để khỏi bọc lặp với aircombat) */
    { const k = ctx.knockPlayer; let has = false; for (let w = k, i = 0; w && i < 8; w = w.__prev, i++) if (w.__ki) { has = true; break; }
      if (k && !has) { const w = o => { if (ST.ifr > 0 && o && o.type !== 'hold') return null; if (ST.mv) endMove(ctx, true); return k(o); }; w.__ki = true; w.__prev = k; if (k.__air) w.__air = true; ctx.knockPlayer = w; } }
    if (ST.flashT > 0) ST.flashT -= dt; if (ST.glowT > 0) ST.glowT -= dt; if (ST.perfT > 0) ST.perfT -= dt;
    if (ST.ifr > 0) ST.ifr -= dt;
    ST.cd.roll = Math.max(0, ST.cd.roll - dt); ST.cd.dash = Math.max(0, ST.cd.dash - dt);
    for (let i = ST.ghosts.length - 1; i >= 0; i--) { const gh = ST.ghosts[i]; gh.t += dt; if (gh.t >= gh.life) ST.ghosts.splice(i, 1); }
    /* canh gác: không có động tác mà còn sót p.update / p.draw của ki → xoá (động tác kết thúc bất thường) */
    if (!ST.mv && (clearOverrides(p) || (p.kiSpin && delete p.kiSpin))) { ST.stats.guard++; log(ctx, 'guard'); }
    /* đạn thử (__ki.fire) */
    if (ST.shots && ST.shots.length) for (let i = ST.shots.length - 1; i >= 0; i--) { const b = ST.shots[i]; b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
      if (!b.hit && Math.hypot(b.x - p.x, b.y - (p.y - PR)) < 8) { b.hit = true; const r = ctx.hero ? ctx.hero.hit(b.dmg) : false; ST.lastShot = { hit: !!r, t: +now(ctx).toFixed(2) }; ST.shots.splice(i, 1); if (b.id) ST.thr.delete(b.id); continue; }
      if (b.life <= 0) { ST.lastShot = ST.lastShot && ST.lastShot.t > now(ctx) - 0.5 ? ST.lastShot : { hit: false, t: +now(ctx).toFixed(2), miss: true }; ST.shots.splice(i, 1); if (b.id) ST.thr.delete(b.id); } }
    if (S.mode !== 'play') { renderBar(ctx); kiButtons(ctx); return; }
    /* lời chỉ dẫn 1 lần */
    { const s = sv(ctx); if (!s.tut && (ST.tutT = (ST.tutT || 0) + dt) > 2.5) { s.tut = 1; if (!globalThis.__np91Hint) ctx.toast(isAuto(ctx) ? L(ctx).tutAuto : touchUI() ? L(ctx).tutTouch : L(ctx).tutPc);   /* dòng nhỏ, 1 lần */ ctx.persist(); } }
    /* nạp Ki */
    const lh = ctx.monsters && ctx.monsters.lastHitT ? ctx.monsters.lastHitT() : -99;
    if (lh > ST.lastHitSeen) { ST.lastHitSeen = lh; ST.dealtT = now(ctx); gain(ctx, 1 / 3, 'hit'); }
    const recent = now(ctx) - Math.max(ST.dealtT, ST.takenT) < 6;
    let fight = recent;
    if (!fight && ctx.monsters && ctx.monsters.list) for (const mo of ctx.monsters.list()) { if (!(mo.hp > 0) || mo.statue || (mo.c && mo.c.spar && !(ctx.sparFoe && ctx.sparFoe() === mo))) continue; const d = Math.hypot(mo.x - p.x, mo.y - p.y); if ((mo.c && mo.c.boss && d < 320) || (mo.angry && d < 150)) { fight = true; break; } }
    ST.fight = fight;
    const still = !p.moving && !p.action && !ST.mv; ST.stillT = still ? ST.stillT + dt : 0;
    if (!fight) gain(ctx, dt / 1.5 * lvMul(ctx));
    else if (ST.stillT >= 2 && now(ctx) - ST.dealtT >= 2) gain(ctx, dt / 6 * lvMul(ctx));
    /* đòn có báo trước */
    for (const [id, t] of ST.thr) {
      if (expired(ctx, t)) { ST.thr.delete(id); continue; }
      if (t.done || ST.mv || !isAuto(ctx)) continue;
      const at = impactAt(t, p), left = at - now(ctx);
      if (left > LEAD || now(ctx) > at + t.dur + 0.05) continue;
      if (!hits(t, p.x, p.y - PR)) continue;
      if (!dodge(ctx, t, false) && !t.logged) { t.logged = true; log(ctx, 'nododge', { why: t.noKi ? 'ki' : t.blocked ? 'blocked' : busy(ctx) || (ST.cd.roll > 0 ? 'cd' : '?'), kind: t.kind }); }
    }
    /* chuyển động lộn / lộn xoay / lách / lướt */
    const mv = ST.mv;
    if (mv) {
      if ((ctx.knocked && ctx.knocked()) || (ctx.air && ctx.air.tumbling && ctx.air.tumbling()) || (ctx.hero && ctx.hero.fainted)) { endMove(ctx, true); }
      else {
        mv.t += dt; p.autoPath = null;
        const u = Math.min(1, mv.t / mv.dur), ease = mv.kind === 'dash' ? u : 1 - (1 - u) * (1 - u), want = mv.dist * ease, step = want - mv.done;
        if (step > 0) { const blocked = moveStep(ctx, mv.ux * step, mv.uy * step); mv.done = want; if (blocked && mv.kind === 'dash') mv.t = mv.dur; }
        if (mv.hook && p.kiSpin) p.kiSpin.ang = spinAngle(mv);
        if ((mv.gT -= dt) <= 0) { mv.gT = mv.kind === 'dash' ? 0.035 : 0.05; snapGhost(ctx, mv); }
        if (mv.kind === 'dash' && Math.random() < dt * 30) fx(ctx, 'footstep_dust', p.x - mv.ux * 4, p.y + 1);
        if (mv.t >= mv.dur) endMove(ctx);
      }
    }
    renderBar(ctx); kiButtons(ctx);
  },
  drawables(ctx, cx, cy) {
    const out = [], g = ctx.g;
    for (const gh of ST.ghosts) out.push({ y: gh.y - 0.3, f: () => drawGhost(g, ctx, gh, cx, cy) });
    if (ST.shots) for (const b of ST.shots) out.push({ y: b.y + PR, f: () => {   /* đạn thử: quả cầu tím Hắc-ha (ảnh PixelLab hr_orb) */
      const s = ART.vfx && (ART.vfx.hr_orb || ART.vfx.knock_jab), x = Math.round(b.x - cx), y = Math.round(b.y - cy);
      if (s) { const hi = s.img.__hi ? 1 : 2, f = Math.floor(now(ctx) * (s.fps || 12)) % s.n; g.drawImage(s.img, f * s.w * hi, 0, s.w * hi, s.h * hi, x - (s.w >> 1), y - (s.h >> 1), s.w, s.h); }
      else { g.fillStyle = '#b06cff'; g.beginPath(); g.arc(x, y, 3, 0, 7); g.fill(); }
    } });
    return out;
  },
  drawUI(ug, ctx, cx, cy, scale) {   /* né hoàn hảo: loé trắng mềm quanh người chơi 0,6 s (sự kiện) */
    if (!(ST.perfT > 0)) return; const p = p_(ctx), x = (p.x - cx) * scale, y = (p.y - 10 - cy) * scale, a = Math.min(1, Math.max(0, ST.perfT - 0.4) / 0.6), r = (14 + (1 - a) * 22) * scale;
    ug.save();
    if (a > 0 && !ST.perfW) { const gr = ug.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, `rgba(220,255,230,${0.35 * a})`); gr.addColorStop(1, 'rgba(220,255,230,0)'); ug.fillStyle = gr; ug.beginPath(); ug.arc(x, y, r, 0, 7); ug.fill(); }
    const fs = Math.max(12, Math.round((globalThis.__u89?globalThis.__u89(scale):scale) * 3.4)), ty = (p.y - 36 - (1 - ST.perfT) * 8 - cy) * scale, txt = ST.perfTxt || '';   /* chữ nhỏ bay lên trên đầu, mờ dần */
    ug.globalAlpha = Math.min(1, ST.perfT * 2.5); ug.font = `bold ${fs}px VT323, monospace`; ug.textAlign = 'center'; ug.textBaseline = 'bottom'; const w = ug.measureText(txt).width + 8;
    ug.fillStyle = 'rgba(13,11,20,.6)'; ug.beginPath(); ug.roundRect(x - w / 2, ty - fs - 2, w, fs + 3, 3); ug.fill(); ug.fillStyle = '#b8ffc8'; ug.fillText(txt, x, ty); ug.restore();
  },
};
