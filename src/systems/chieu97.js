/* chieu97.js — p97 (02/11/2026): CƠ CHẾ + AI 5 chiêu của Chấn Thú ếch OA LÌ (Croaksmug, hệ Triều — plan-93) + 2 dạng tiến hoá (Oa Lì Phố, Lão Oa Đại Ca).
   Bọt Ộp (3 bong bóng nối đuôi; Oa Lì Phố 5 quả) · Bụng Phệ Đè (CHIÊU LAO TỚI plan-84: nhảy vồng, đáp bụng → NGÃ 0,6 s; hụt nằm sấp 0,7 s)
   Kính Đen Lì Đòn (3 s: nhận ×0,5 sát thương, bật lại viên đạn đầu tiên) · Cốc Lũ Vô Đáy (TUYỆT CHIÊU: cốc to nghiêng → tường sóng chạy 170 px, ếch cưỡi sóng)
   Lưỡi Kéo Về (CHIÊU RIÊNG: lưỡi phóng từ MIỆNG, dính → giật về sát người → tát hất văng) · Vòng Khói Tẩu (Lão Oa Đại Ca: vòng khói chậm, tốc −1 + chính xác −1).
   Module BỌC chieu78.js (cùng giao diện; linhduel import module này thay chieu78) → chiêu p78 chạy y nguyên, chiêu p97 xử lý ở đây. VFX code: fx97.js. */
import * as A from './chieu78.js';
import * as FX from './fx97.js';
import { SPECIES } from './duel-data.js';
import { powerP, power } from './fx78.js';

let E = null, X = {};
const OWN = { bot_op: 1, bung_phe: 1, kinh_den: 1, coc_lu: 1, luoi_keo: 1, vong_khoi: 1 };
export const IDS = { ...A.IDS, ...OWN };
export const FROGS = { oali: 1, oalipho: 1, laooa: 1 };
const S = { shots: [], log: [], n: {}, orig: [] };
const rnd = () => Math.random();
const vi = () => !(E && E.ST.ctx && E.ST.ctx.lang() === 'en');
function say(x, y, a, b, col, size = 0.95, life = 1.3) { E.text(x, y, vi() ? a : b, col, size, life); }
function log(o) { const r = { t: +E.ST.t.toFixed(2), ...o }; S.log.push(r); if (S.log.length > 400) S.log.shift(); S.n[o.ev] = (S.n[o.ev] || 0) + 1; }
const live = q => !!(q && !q.dead && !q.absent && E.ST.F[q.side] === q);
const pwF = f => power(powerP(SPECIES[f.sp], f.lv));
const chestZ = q => Math.max(5, E.standH(q) * 0.45) + (q.alt || 0);
const dodging = o => !!(o.dodge && !(o.dodge.delay > 0));
/* mắt (px logic so với chân, hướng chưa lật; W = lật E) — đo trên khung 0 clip idle (tools/px-p97.py eyes) — kính đen đặt ở đây */
export const EYE = { oali: { south: [-1, -13.5], east: [2.2, -12.8], 'south-east': [1.5, -13.4], north: null, 'north-east': null } };
EYE.oalipho = EYE.oali; EYE.laooa = EYE.oali;
function dirOf(f) { const ax = Math.abs(f.fx || 0), fy = f.fy || 0; if (fy > 0.38 && ax < 0.92) return ax > 0.38 ? 'south-east' : 'south'; if (fy < -0.38 && ax < 0.92) return ax > 0.38 ? 'north-east' : 'north'; return 'east'; }
function eyeOf(f) { const T0 = (X.eye && X.eye[f.sp]) || EYE[f.sp] || EYE.oali, d = dirOf(f), e = T0[d] || EYE.oali[d]; if (!e) return null; const flip = (f.fx || 0) < -0.05 && d !== 'south' && d !== 'north'; return { x: f.x + (flip ? -e[0] : e[0]), y: f.y + e[1] - (f.alt || 0), flip }; }
function hooks() { FX.setHooks({ quake: s => { try { if (E.ST.ctx && E.ST.ctx.quake) E.ST.ctx.quake(s); } catch (e) { } }, stop: s => { E.ST.hitstop = Math.max(E.ST.hitstop || 0, Math.min(0.12, s)); } }); }
export function init(env) { E = env; A.init(env); hooks(); }
export function init97(x) { X = x || {}; if (X.img) FX.setImgs(X.img, X.meta); }   /* applyStatus, faint, img, meta, impact, DFX, sepNeed (linhduel, đoạn p97:b) */
export const equip = (f, e) => A.equip(f, e);
export const ownTag = id => A.ownTag(id);
export const grounded = q => A.grounded(q);
export const dodgeMul = q => A.dodgeMul(q);
export const drawF = (g, f, cx, cy, df) => A.drawF(g, f, cx, cy, df);
const mouth = (f, clip) => { const m = E.beamMouth(f, clip); return { x: m.x, gy: f.y, z: Math.max(2, f.y - m.y) }; };
function origin(f, clip, x, gy, z) { const m = E.beamMouth(f, clip); S.orig.push({ sp: f.sp, clip, err: +Math.hypot(x - m.x, (gy - z) - m.y).toFixed(2) }); if (S.orig.length > 60) S.orig.shift(); }   /* test: gốc chiêu = điểm miệng đo trên sprite (MOUTH) */

/* ================= tung chiêu ================= */
export function fire(f, a, foe) {
  if (!OWN[a.id]) return A.fire(f, a, foe);
  E.skLog({ side: f.side, id: a.id, m: 'p78' }); log({ ev: 'fire', id: a.id, side: f.side, sp: f.sp });
  switch (a.id) {
    case 'bot_op': return bubbles(f, a);
    case 'bung_phe': return flop(f, a);
    case 'kinh_den': return shades(f, a);
    case 'coc_lu': return flood(f, a);
    case 'luoi_keo': f.sigDone = true; return tongue(f, a);
    case 'vong_khoi': return smoke(f, a);
  }
  return false;
}
export function onStart(f, id) {
  A.onStart(f, id);
  if (id === 'coc_lu' && f.act && f.act.id === id) mugUp(f, f.act);   /* cốc to hiện ngay lúc gồng (trước khung đổ) */
  if (id === 'bot_op' && f.act) { const m = mouth(f, 'spit'); FX.charge(m.x, m.gy, m.z, pwF(f).p, 6); }
}

/* ---------- BỌT ỘP: phồng má → 3 (5) bong bóng nối đuôi từ miệng ---------- */
function bubbles(f, a) {
  const N = f.sp === 'oalipho' ? 5 : 3, mul = N === 5 ? 0.3 : 0.42, pw = pwF(f); let k = 0, t = 0; const T0 = E.impactT(a.clip);
  const shoot = () => { const o = E.foeReal(f); if (!o) return; const m = mouth(f, 'spit'), tx = o.x + (o.vx || 0) * 0.25, ty = o.y + (o.vy || 0) * 0.25, dx = tx - m.x, dy = ty - m.gy, d = Math.hypot(dx, dy) || 1, sp = 150 + k * 6;
    origin(f, 'spit', m.x, m.gy, m.z); const h = FX.track({ k: 'bub', x: m.x, y: m.gy, z: m.z, r: 3.3 + (k === N - 1 ? 0.7 : 0), ky: m.gy + (dy < 0 ? -0.5 : 0.5) });
    S.shots.push({ kind: 'bub', f, mv: a.mv, h, x: m.x, y: m.gy, z: m.z, z0: m.z, tz: chestZ(o), vx: dx / d * sp, vy: dy / d * sp, wob: (k % 2 ? 1 : -1) * 2.2, t: 0, life: 1.1, mul, i: k, gy0: m.gy, pw });
    k++; E.sfx(k === 1 ? 'knock_whoosh' : 'pop'); };
  shoot(); log({ ev: 'bub_fire', side: f.side, n: N });
  a.sigU = dt => { t += dt; f.ct = Math.min(f.ct, T0 + 0.04); while (k < N && t >= k * 0.11) shoot(); return k < N || t < k * 0.11 + 0.05; };
  return true;
}
/* ---------- BỤNG PHỆ ĐÈ: ngồi gồng → nhảy vồng → đáp bụng ---------- */
function flop(f, a) {
  const o = E.foeReal(f); if (!o) return false; const pw = pwF(f), FPSf = 12;
  let tx = o.x + (o.vx || 0) * 0.35, ty = o.y + (o.vy || 0) * 0.35; const dx0 = tx - f.x, dy0 = ty - f.y, d0 = Math.hypot(dx0, dy0) || 1, D = Math.min(d0, 130);
  tx = f.x + dx0 / d0 * D; ty = f.y + dy0 / d0 * D; const J = { t: 0, x0: f.x, y0: f.y, tx, ty, T: 0.34 + D / 600, H: 9 + D * 0.05, ph: 'air', lie: 0 };
  J.sh = FX.track({ k: 'jshadow', get: () => (J.ph === 'air' ? { x: J.x0 + (J.tx - J.x0) * Math.min(1, J.t / J.T), y: J.y0 + (J.ty - J.y0) * Math.min(1, J.t / J.T), s: Math.min(1, J.t / J.T) } : null), T: 5 });
  E.face(f, tx, ty); E.sfx('knock_whoosh'); FX.skid(f.x, f.y, -dx0 / d0, -dy0 / d0, 4); log({ ev: 'flop_jump', side: f.side, D: Math.round(D) });
  a.sigU = dt => {
    if (!live(f)) { J.sh.alive = false; f.alt = 0; return false; }
    if (J.ph === 'air') {
      J.t += dt; const u = Math.min(1, J.t / J.T), nx = J.x0 + (J.tx - J.x0) * u, ny = J.y0 + (J.ty - J.y0) * u; E.moveBy(f, nx - f.x, ny - f.y); E.clampField(f);
      f.alt = Math.sin(Math.PI * u) * J.H; f.ct = (u < 0.5 ? 3 : 4) / FPSf + 0.01;
      if (u >= 1) { f.alt = 0; J.ph = 'land'; J.sh.alive = false; f.ct = 5 / FPSf + 0.01;
        const q = E.foeReal(f), hitR = 14 + (q ? E.bodyW(q) * 0.5 : 6), ok0 = live(q) && Math.hypot(q.x - f.x, (q.y - f.y) * 1.2) <= hitR && (q.alt || 0) < 10 && !q.p78under && !(dodging(q) && rnd() < 0.7);
        let ok = false; if (ok0) ok = E.hit(f, q, a.mv, { _now: 1, kb: 0 });
        FX.landSplash(f.x, f.y + 1, pw.p, ok);
        if (ok && live(q) && !(q.pin > 0)) { const dx = q.x - f.x || f.fx, dy = q.y - f.y, dd = Math.hypot(dx, dy) || 1; q.kb = { vx: dx / dd * 270, vy: dy / dd * 270, t: 0.3, fly: true, rut: 0, bounced: false }; q.act = null; q.dodge = null; q.clip = 'hurt'; q.ct = 0; q.hurtT = 0.62; say(q.x, q.y - 34, 'NGÃ!', 'KNOCKED DOWN!', '#ffd0a0', 0.95, 1.1); FX.skid(q.x, q.y, dx / dd, dy / dd, 16); E.ST.stats.p84kd = (E.ST.stats.p84kd | 0) + 1; }
        J.lie = ok ? 0.22 : 0.7; if (!ok) say(f.x, f.y - 26, 'HỤT', 'WHIFF', '#d8d8e8', 0.85);
        log({ ev: ok ? 'flop_hit' : 'flop_miss', side: f.side, d: q ? Math.round(Math.hypot(q.x - f.x, q.y - f.y)) : -1 });
        { const S0 = E.ST.stats.p84sh = E.ST.stats.p84sh || {}; }
      }
      return true;
    }
    J.lie -= dt; f.ct = 5 / FPSf + 0.01; if (J.lie > 0) return true; f.ct = 6 / FPSf; return false;
  };
  return true;
}
/* ---------- KÍNH ĐEN LÌ ĐÒN ---------- */
function shades(f, a) {
  const own = f.sp === 'laooa';   /* Lão Oa Đại Ca đeo kính sẵn → chỉ loé + bật khiên */
  const B = f.p97sh = { t: 0, T: 3, refl: 1, own };
  if (!own) B.h = FX.track({ k: 'shades', drop: 34, shine: 0, kyF: () => f.y + 0.7, get: () => (f.p97sh === B && live(f) ? eyeOf(f) || { back: 1 } : null),
    upd: (dt, o) => { o.drop = Math.max(0, o.drop - dt * 150); if (o.drop <= 0 && !o.landed) { o.landed = 1; o.shine = 1; const e = eyeOf(f); if (e) FX.shine(e.x, f.y, f.y - e.y, f.y + 0.8); E.sfx('pop'); } if (o.shine > 0) o.shine = Math.max(0, o.shine - dt * 4); if (f.p97sh !== B || !live(f)) o.alive = false; } });
  else { const e = eyeOf(f); if (e) FX.shine(e.x, f.y, f.y - e.y, f.y + 0.8); }
  say(f.x, f.y - 34, 'LÌ ĐÒN', 'TOO COOL', '#e8e8f0', 0.95, 1.4); log({ ev: 'shades', side: f.side });
  const T0 = E.impactT(a.clip); let t = 0; a.sigU = dt => { t += dt; f.ct = Math.min(f.ct, T0 + 0.05); return t < 0.3; };
  return true;
}
function updShades(dt) {
  for (const f of E.ST.F) { const B = f && f.p97sh; if (!B) continue; B.t += dt; if (B.t >= B.T || !live(f)) { if (B.h) B.h.alive = false; f.p97sh = null; if (live(f)) { say(f.x, f.y - 30, 'HẾT LÌ', 'COOL OFF', '#b8b8c8', 0.75); } log({ ev: 'shades_end', side: f.side }); continue; }
    if (B.refl > 0) for (const s of E.ST.shots) { if (s.done || !s.f || s.f.side === f.side || !(s.kind === 'proj' || s.kind === 'ball' || s.kind === 'proj2' || s.kind === 'p73')) continue;
      if (Math.hypot(s.x - f.x, (s.y - (f.y - chestZ(f))) * 1.2) > 16) continue; reflectShot(f, s, B); break; } }
}
function reflectShot(f, s, B) {   /* đạn của đối thủ chạm kính → huỷ đạn gốc (cả cảnh code ẩn) + 1 quả nước loé bật ngược về người bắn, sát thương của chính chiêu đó */
  B.refl--; s.done = true; s.life = 0; if (s.hide && s.sk && X.DFX && X.DFX.find) { try { const sc = X.DFX.find(s.f, s.sk); if (sc) { sc.dead = true; if (sc.q) sc.q.length = 0; } } catch (e) { } }
  const sh = s.f, tz = live(sh) ? chestZ(sh) : 8, z = chestZ(f), d = live(sh) ? Math.hypot(sh.x - f.x, sh.y - f.y) || 1 : 1, ux = live(sh) ? (sh.x - f.x) / d : -f.fx, uy = live(sh) ? (sh.y - f.y) / d : 0;
  const h = FX.track({ k: 'bub', x: f.x, y: f.y, z, r: 3.2, ky: f.y + 0.5 }); S.shots.push({ kind: 'refl', f, mv: s.mv, h, x: f.x + ux * 6, y: f.y + uy * 3, z, z0: z, tz, vx: ux * 220, vy: uy * 220, t: 0, life: 1.0, mul: 1, i: 0, gy0: f.y, pw: pwF(f), target: sh });
  FX.reflectSpark(f.x + ux * 6, f.y, z, f.y + 0.8); say(f.x, f.y - 40, 'BẬT LẠI!', 'REFLECTED!', '#e8f4ff', 1.0); E.sfx('pop'); log({ ev: 'shades_refl', side: f.side, mv: s.mv && s.mv.id, kind: s.kind });
}
/* ---------- CỐC LŨ VÔ ĐÁY (tuyệt chiêu) ---------- */
function mugUp(f, a) {
  if (a.p97mug) return; const flip = (f.fx || 1) < 0;
  const M = a.p97mug = FX.track({ k: 'mug', x: f.x, y: f.y, z: 0, pop: 0, ang: 0, flip, kyF: () => f.y + (f.fy < -0.3 ? -0.6 : 0.6),
    upd: (dt, o) => { o.x = f.x + (o.flip ? -7 : 7); o.y = f.y; o.z = E.standH(f) + 6 + (f.alt || 0); o.pop = Math.min(1, o.t / 0.16);
      if (!o.pour) o.ang = Math.max(0, Math.min(60, (o.t - 0.3) * 160)); else o.ang = Math.min(110, o.ang + dt * 200); if (o.end) { o.pop = Math.max(0, 1 - (o.t - o.end) / 0.18); if (o.pop <= 0) o.alive = false; } if (!live(f)) o.alive = false; } });
  E.sfx('pop'); say(f.x, f.y - 46, 'NHẤP 1 NGỤM…', 'ONE SIP…', '#f4ecd8', 0.85, 0.9);
}
function flood(f, a) {
  const pw = pwF(f), o0 = E.foeReal(f); if (!a.p97mug) mugUp(f, a); const M = a.p97mug; M.pour = 1;
  const dx = (o0 ? o0.x : f.x + f.fx * 60) - f.x, dy = (o0 ? o0.y : f.y + f.fy * 20) - f.y, d = Math.hypot(dx, dy) || 1, ux = dx / d, uy = dy / d;
  const Wv = { k: 'wave', x: f.x - ux * 6, y: f.y - uy * 3, ux, uy, front: 0, W: 36 + 8 * pw.p, H: 13 + 4 * pw.p, T2: 46, grow: 0, fade: 1, ky: f.y, kyF: null };
  Wv.kyF = () => Wv.y + Wv.uy * Wv.front + (Wv.uy < 0 ? -0.5 : 0.5); const hW = FX.track(Wv);
  const pour = FX.track({ k: 'pour', x0: M.x, y0: f.y, z0: M.z, x1: f.x + ux * 10, y1: f.y + uy * 4, T: 0.45, ky: f.y + 0.6, upd: (dt, o) => { o.x0 = M.x + (M.flip ? -5 : 5); o.y0 = f.y; o.z0 = M.z - 2; o.x1 = f.x + ux * 12; o.y1 = f.y + uy * 5; } });
  FX.waveCrash(f.x + ux * 10, f.y + uy * 4, pw.p * 0.5); E.sfx('smash'); log({ ev: 'flood', side: f.side });
  const L = 175, T = 0.85, seen = new Set(); let t = 0, ride = true, lastP = 0, ended = false; const T0 = E.impactT(a.clip);
  a.sigU = dt => {
    t += dt; f.ct = Math.max(f.ct, T0); Wv.grow = Math.min(1, t / 0.14); const u = Math.min(1, t / T), front = L * (1 - Math.pow(1 - u, 1.6)), adv = front - Wv.front; Wv.front = front;
    if (t > 0.35 && !M.end) M.end = M.t;
    if (ride && live(f)) { const want = front - 16; if (want > 0) { E.moveBy(f, ux * Math.max(0, adv) * 0.62, uy * Math.max(0, adv) * 0.62); E.clampField(f); } f.alt = Math.sin(Math.min(1, t / 0.75) * Math.PI) * 9; if (t > 0.75) { ride = false; f.alt = 0; } }
    if (!ended && ((t * 25) | 0) % 2 === 0) { const sa = (rnd() * 2 - 1) * Wv.W; FX.foam(Wv.x + ux * front - uy * sa, Wv.y + uy * front + ux * sa * 0.6, Wv.H * 1.6 * Wv.grow, 1); }
    if (front - lastP > 18) { lastP = front; FX.puddle(Wv.x + ux * front - ux * 8 + (rnd() - 0.5) * Wv.W, Wv.y + uy * front + (rnd() - 0.5) * 8, 5 + rnd() * 4, 2.2); FX.foam(Wv.x + ux * front, Wv.y + uy * front, Wv.H * 0.8, 2); }
    for (const q of E.ST.F) { if (!live(q) || q.side === f.side || seen.has(q)) continue; const along = (q.x - Wv.x) * ux + (q.y - Wv.y) * uy, perp = Math.abs(-(q.x - Wv.x) * uy + (q.y - Wv.y) * ux);
      if (along <= front + 4 && along >= front - 26 && perp <= Wv.W + E.bodyW(q) * 0.5) { seen.add(q); const ok = (q.alt || 0) < 16 && !q.p78under && E.hit(f, q, a.mv, { _now: 1, kb: 340 }); if (ok) { FX.waveCrash(q.x, q.y, pw.p); if (live(q) && q.kb) { q.kb.vx = ux * 340; q.kb.vy = uy * 340; } } log({ ev: ok ? 'flood_hit' : 'flood_miss', side: f.side, along: Math.round(along) }); } }
    if (u >= 1 && !ended) { ended = true; FX.waveCrash(Wv.x + ux * front, Wv.y + uy * front, pw.p); for (let i = 0; i < 4; i++) FX.puddle(Wv.x + ux * (front - i * 12) + (rnd() - 0.5) * Wv.W * 1.4, Wv.y + uy * (front - i * 12) + (rnd() - 0.5) * 10, 6 + rnd() * 5, 2.6); }
    if (ended) { Wv.fade = Math.max(0, 1 - (t - T) / 0.25); Wv.grow = Wv.fade; if (Wv.fade <= 0) { hW.alive = false; f.alt = 0; if (!seen.size) log({ ev: 'flood_whiff', side: f.side }); return false; } }
    return true;
  };
  return true;
}
/* ---------- LƯỠI KÉO VỀ (chiêu riêng) ---------- */
function tongue(f, a) {
  const o = E.foeReal(f); if (!o) return false; const pw = pwF(f), m0 = mouth(f, 'tongue'), Lmax = 128;
  const aim = { x: o.x + (o.vx || 0) * 0.12, y: o.y + (o.vy || 0) * 0.12, z: chestZ(o) }; let dx = aim.x - m0.x, dy = aim.y - m0.gy; const d0 = Math.hypot(dx, dy) || 1; dx /= d0; dy /= d0;
  const Tg = { k: 'tongue', x0: m0.x, y0: m0.gy, z0: m0.z, x1: m0.x, y1: m0.gy, z1: m0.z, flash: 0.06, stick: 0, sag: 0, kyF: () => f.y + (dy < -0.2 ? -0.5 : 0.5) };
  origin(f, 'tongue', m0.x, m0.gy, m0.z); const h = FX.track(Tg); E.sfx('knock_whoosh'); log({ ev: 'tongue', side: f.side, d: Math.round(d0) });
  const P = { ph: 'out', t: 0, len: 0, foe: o }; const T0 = E.impactT(a.clip);
  const root = () => { const m = mouth(f, 'tongue'); Tg.x0 = m.x; Tg.y0 = m.gy; Tg.z0 = m.z; };
  a.sigU = dt => {
    P.t += dt; Tg.flash = Math.max(0, Tg.flash - dt); Tg.stick = Math.max(0, Tg.stick - dt * 3); if (!live(f)) { h.alive = false; return false; } root();
    if (P.ph === 'out') { f.ct = T0;
      P.len = Math.min(Lmax, P.len + 640 * dt); const tz = Tg.z0 + (aim.z - Tg.z0) * Math.min(1, P.len / d0); Tg.x1 = Tg.x0 + dx * P.len; Tg.y1 = Tg.y0 + dy * P.len; Tg.z1 = tz;
      const q = P.foe; if (live(q) && !q.p78under && !(q.hide) && Math.hypot(Tg.x1 - q.x, (Tg.y1 - q.y) * 1.3) <= 6 + E.bodyW(q) * 0.5 && Math.abs(Tg.z1 - chestZ(q)) < 14 && !(dodging(q) && rnd() < 0.5)) {
        if (rnd() * 100 > a.mv.acc * 1) { P.ph = 'back'; say(q.x, q.y - 26, 'TRƯỢT', 'MISS', '#d8d8e8', 0.85); log({ ev: 'tongue_miss', side: f.side, acc: 1 }); return true; }
        P.ph = 'pull'; P.t = 0; Tg.stick = 1; P.sx = q.x; P.sy = q.y; q.act = null; q.dodge = null; q.kb = null; q.clip = 'hurt'; q.ct = 0; q.hurtT = 0.5; E.ST.hitstop = Math.max(E.ST.hitstop || 0, 0.05); E.sfx('hit');
        say(q.x, q.y - 34, 'DÍNH!', 'GOTCHA!', '#ffb0c0', 1.0, 1.0); log({ ev: 'tongue_stick', side: f.side }); return true; }
      if (P.len >= Lmax || P.len >= d0 + 24) { P.ph = 'back'; log({ ev: 'tongue_whiff', side: f.side }); }
      return true; }
    if (P.ph === 'pull') { f.ct = T0; const q = P.foe; if (!live(q)) { P.ph = 'back'; return true; }
      const need = (X.sepNeed ? X.sepNeed(f, q) : 14) + 4, gx = f.x + dx * need, gy = f.y + dy * need, k = Math.min(1, P.t / 0.24), e = k * k;
      const nx = P.sx + (gx - P.sx) * e, ny = P.sy + (gy - P.sy) * e; q.x = nx; q.y = ny; q.hurtT = Math.max(q.hurtT, 0.3); q.alt = Math.sin(k * Math.PI) * 5; Tg.x1 = q.x; Tg.y1 = q.y; Tg.z1 = chestZ(q);
      if (k > 0.2 && ((P.t * 30) | 0) % 2 === 0) FX.skid(q.x, q.y, -dx, -dy, 3);
      if (k >= 1) { q.alt = 0; P.ph = 'slap'; P.t = 0; h.alive = false; f.clip = 'atk'; f.ct = 0; E.face(f, q.x, q.y); }
      return true; }
    if (P.ph === 'slap') { const q = P.foe, ti = E.impactT('atk'); if (P.t < ti) return true;
      if (!P.done) { P.done = true; if (live(q)) { const ok = E.hit(f, q, a.mv, { _now: 1, kb: 230, noMiss: true }); const e = { x: (f.x + q.x) / 2, y: Math.max(f.y, q.y), z: chestZ(q) }; FX.slap(e.x, e.y, e.z, pw.p, Math.sign(q.x - f.x) || 1);
        if (ok && live(q) && X.impact) try { X.impact(f, q, a.mv, 'B', 'slap97'); } catch (er) { } if (ok) say(q.x, q.y - 44, 'BỐP!', 'SMACK!', '#ffe0a0', 1.15, 1.0); log({ ev: 'tongue_slap', side: f.side, ok }); } }
      return P.t < ti + 0.25; }
    if (P.ph === 'back') { f.ct = T0; P.len = Math.max(0, Math.hypot(Tg.x1 - Tg.x0, Tg.y1 - Tg.y0) - 760 * dt); const L0 = Math.hypot(Tg.x1 - Tg.x0, Tg.y1 - Tg.y0) || 1, ux = (Tg.x1 - Tg.x0) / L0, uy = (Tg.y1 - Tg.y0) / L0; Tg.x1 = Tg.x0 + ux * P.len; Tg.y1 = Tg.y0 + uy * P.len; Tg.z1 += (Tg.z0 - Tg.z1) * Math.min(1, dt * 12);
      if (P.len <= 1) { h.alive = false; return false; } return true; }
    return false;
  };
  return true;
}
/* ---------- VÒNG KHÓI TẨU (Lão Oa Đại Ca) ---------- */
function smoke(f, a) {
  const o = E.foeReal(f); if (!o) return false; const m = mouth(f, 'spit'), dx = o.x - m.x, dy = o.y - m.gy, d = Math.hypot(dx, dy) || 1;
  for (let i = 0; i < 2; i++) { const h = FX.track({ k: 'smoke', x: m.x, y: m.gy, z: m.z, r: 3, T: 1.5, ky: m.gy + (dy < 0 ? -0.5 : 0.5) });
    S.shots.push({ kind: 'smoke', f, mv: a.mv, h, x: m.x - dx / d * i * 10, y: m.gy - dy / d * i * 5, z: m.z, z0: m.z, tz: chestZ(o), vx: dx / d * 105, vy: dy / d * 105, t: -i * 0.18, life: 1.4, mul: i ? 0.4 : 0.7, i, gy0: m.gy, pw: pwF(f) }); }
  FX.smokePuff(m.x, m.gy, m.z); E.sfx('knock_whoosh'); log({ ev: 'smoke', side: f.side });
  const T0 = E.impactT(a.clip); let t = 0; a.sigU = dt => { t += dt; f.ct = Math.min(f.ct, T0 + 0.05); return t < 0.25; };
  return true;
}
/* ---------- đạn riêng (bong bóng / khói / quả bật lại) ---------- */
function updShots(dt) {
  for (const s of S.shots) { if (s.done) continue; s.t += dt; if (s.t < 0) { s.h.x = s.x; s.h.y = s.y; s.h.z = s.z; s.h.alive = true; continue; }
    if (!live(s.f) && s.kind !== 'refl') { s.done = true; s.h.alive = false; continue; }
    s.x += s.vx * dt; s.y += s.vy * dt; const k = Math.min(1, s.t / 0.35); s.z = s.z0 + (s.tz - s.z0) * k + (s.kind === 'bub' ? Math.sin(s.t * 18 + s.i) * 1.2 : 0);
    const wv = s.wob ? Math.sin(s.t * 14) * s.wob : 0, sp0 = Math.hypot(s.vx, s.vy) || 1; s.h.x = s.x - s.vy / sp0 * wv; s.h.y = s.y + s.vx / sp0 * wv * 0.5; s.h.z = s.z; s.h.ky = s.y + (s.vy < 0 ? -0.5 : 0.5); if (s.kind === 'smoke') s.h.t = s.t;
    const q = s.target || E.foeReal(s.f);
    if (live(q) && q.side !== s.f.side && Math.hypot(s.x - q.x, (s.y - q.y) * 1.4) <= 5 + E.bodyW(q) * 0.5 && Math.abs(s.z - chestZ(q)) < 13 && !q.p78under && !(dodging(q) && rnd() < 0.8)) {
      s.done = true; s.h.alive = false;
      if (s.kind === 'smoke') { const ok = rnd() * 100 <= s.mv.acc; if (ok) { E.hit(s.f, q, s.mv, { _now: 1, kb: 20, mul: s.mul, noMiss: true, noFlash: s.i > 0 }); if (live(q)) { q.stage.spe = Math.max(-6, (q.stage.spe || 0) - 1); q.stage.acc = Math.max(-6, (q.stage.acc || 0) - (s.i ? 0 : 1)); if (!s.i) say(q.x, q.y - 40, 'SẶC KHÓI! TỐC ↓ CHÍNH XÁC ↓', 'SMOKED! SPD ↓ ACC ↓', '#d9d4ca', 0.85, 1.4); } } FX.smokePuff(s.x, s.y, s.z); log({ ev: ok ? 'smoke_hit' : 'smoke_miss', side: s.f.side }); continue; }
      const ok = E.hit(s.f, q, s.mv, { _now: 1, kb: s.kind === 'refl' ? 120 : 45, mul: s.mul, noMiss: s.i > 0 || s.kind === 'refl', noFlash: s.i > 0 && s.kind !== 'refl' });
      FX.pop(s.x, s.y, s.z, s.pw.p, s.kind === 'refl' ? 1.4 : 1); log({ ev: s.kind === 'refl' ? 'refl_hit' : 'bub_hit', side: s.f.side, i: s.i, ok }); continue; }
    if (s.t >= s.life) { s.done = true; s.h.alive = false; if (s.kind !== 'smoke') FX.pop(s.x, s.y, s.z, 0.2, 0.6); log({ ev: s.kind + '_expire', side: s.f.side, i: s.i }); }
  }
  S.shots = S.shots.filter(s => !s.done);
}

/* ================= móc trúng đòn ================= */
export function preHit(att, def, mv) { return A.preHit(att, def, mv); }
export function dmgMul(att, def, mv) {
  let k = A.dmgMul(att, def, mv); const B = def && def.p97sh; if (B && att !== def && mv && mv.pow > 0) { k *= 0.5; if (!B.saidT || E.ST.t - B.saidT > 0.8) { B.saidT = E.ST.t; say(def.x + 6, def.y - 44, 'LÌ ½', 'COOL ½', '#e8e8f0', 0.8, 0.9); } S.n.shades_half = (S.n.shades_half || 0) + 1; }
  return k;
}
export function afterHit(att, def, mv) { A.afterHit(att, def, mv); }

/* ================= mỗi khung ================= */
export function tick(f, dt) { A.tick(f, dt); if (f.act && f.act.id === 'bung_phe' && !f.act.sigU && f.alt && !f.act.fired) f.alt = 0; }
export function update(dt) { A.update(dt); if (!E) return; FX.update(dt); updShots(dt); updShades(dt); }

/* AI */
export function weight(f, id, k0, foe, d) {
  if (!OWN[id]) return A.weight(f, id, k0, foe, d);
  const o = E.foeReal(f), hp = f.hp / f.max; if (!o) return k0;
  switch (id) {
    case 'bot_op': return d >= 40 && d <= 150 ? 1.4 : d < 40 ? 0.5 : 0.6;
    case 'bung_phe': return (o.alt || 0) > 10 ? 0.1 : d >= 35 && d <= 125 ? 1.7 : d < 35 ? 0.9 : 0.4;
    case 'kinh_den': { if (f.p97sh) return 0; const busy = o.act && !o.act.fired && o.act.id !== 'huc'; const shot = E.ST.shots.some(s => s.f === o && !s.done); return shot ? 2.6 : busy ? 1.6 : hp < 0.6 ? 0.9 : 0.35; }
    case 'luoi_keo': return d >= 45 && d <= 125 ? 1.9 : d < 45 ? 0.4 : 0.3;
    case 'vong_khoi': { if ((o.stage.spe || 0) <= -2) return 0.3; return d >= 40 && d <= 140 ? 1.3 : 0.4; }
    case 'coc_lu': return k0;
  }
  return k0;
}
export function steer(f) { return A.steer(f); }

/* ================= vẽ / vào trận / thu về ================= */
export function drawGround(g, cx, cy) { A.drawGround(g, cx, cy); if (E) FX.drawGround(g, cx, cy); }
export function drawables(out, g, cx, cy) { A.drawables(out, g, cx, cy); if (E) FX.drawables(out, g, cx, cy); }
export function reset() { A.reset(); S.shots = []; S.log = []; S.n = {}; S.orig = []; FX.clear(); if (E) hooks(); }
export function bench(f) { A.bench(f); if (f.p97sh) { if (f.p97sh.h) f.p97sh.h.alive = false; f.p97sh = null; } f.alt = 0; for (const s of S.shots) if (s.f === f) { s.done = true; s.h.alive = false; } }
export function dbg() { const r = A.dbg(); r.p97 = { n: { ...S.n }, log: S.log.slice(-120), orig: S.orig.slice(), shots: S.shots.length, fx: FX.stats(),
  F: E ? E.ST.F.map(f => f && { sp: f.sp, sh: f.p97sh ? +f.p97sh.t.toFixed(2) : null, alt: +(f.alt || 0).toFixed(1), hp: Math.round(f.hp), x: Math.round(f.x), y: Math.round(f.y) }) : [] }; return r; }
