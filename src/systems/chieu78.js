/* chieu78.js — p78 (plan-78 đợt MẪU, 01/11/2026): CƠ CHẾ + AI trong trận Chấn Thú (linhduel.js) cho kho chiêu hệ Chấn + nhóm Chung.
   Hệ Chấn: Đá Vụn Bắn · Đào Hầm Vồ · Cát Lún · Sơn Băng (tuyệt chiêu, gồng + đòn đường thẳng xuyên hàng — Saiyan B) · Địa Từ (Độc Lạ).
   Chung: Thủ Thế · Gồng Chịu · Ngủ Bù · Lăn Xả.  (Vòng Dư Chấn ★ đã có ở chieu73.js.)
   VFX vẽ code ở fx78.js theo NÉT THÚ của chính con ra chiêu (skinOf) + độ lực theo sức mạnh thú (power).
   Bộ chiêu mang theo của từng con: f.moves (equip) — linhduel đọc qua MV78(f) thay cho LOAD[f.sp]. Save cũ (không có mv) → bộ cũ y hệt.
   linhduel gọi: init · equip · fire · onStart · ownTag · tick · update · preHit · dmgMul · afterHit · grounded · dodgeMul · weight · steer · drawF · drawGround · drawables · reset · bench · dbg. */
import * as FX from './fx78.js';
import { SPECIES, loadFor } from './duel-data.js';

let E = null;
export const IDS = { da_vun_ban: 1, dao_ham_vo: 1, cat_lun: 1, son_bang: 1, dia_tu: 1, thu_the: 1, gong_chiu: 1, ngu_bu: 1, lan_xa: 1 };
const S = { pits: [], fields: [], timers: [], debuffs: [], log: [], n: {} };
const rnd = () => Math.random();
const vi = () => !(E && E.ST.ctx && E.ST.ctx.lang() === 'en');
function say(x, y, a, b, col, size = 0.95, life = 1.3) { E.text(x, y, vi() ? a : b, col, size, life); }
function log(o) { const r = { t: +E.ST.t.toFixed(2), ...o }; S.log.push(r); if (S.log.length > 400) S.log.shift(); S.n[o.ev] = (S.n[o.ev] || 0) + 1; }
const live = q => !!(q && !q.dead && !q.absent && E.ST.F[q.side] === q);
const skinF = f => FX.skinOf(f.sp, f.types && f.types[0]);
const pwF = f => FX.power(FX.powerP(SPECIES[f.sp], f.lv));
const chestZ = q => Math.max(6, E.standH(q) * 0.45) + (q.alt || 0);
const at = (t, fn) => S.timers.push({ t, fn });
function hooks() {
  FX.setHooks({ quake: s => { try { if (E.ST.ctx && E.ST.ctx.quake) E.ST.ctx.quake(s); } catch (e) { } }, stop: s => { E.ST.hitstop = Math.max(E.ST.hitstop || 0, Math.min(0.12, s)); },
    flash: k => { try { if (E.ST.ctx && E.ST.ctx.S) E.ST.ctx.S.flash = Math.max(E.ST.ctx.S.flash || 0, k); } catch (e) { } }, zoom: null, sfx: n => E.sfx(n === 'shot' ? 'knock_whoosh' : n) });
}
export function init(env) { E = env; hooks(); }
function okAt(q, x, y) { const m = E.ST.ctx && E.ST.ctx.S.map; if (!m) return false; if (x < 24 || y < 24 || x > m.w * 16 - 24 || y > m.h * 16 - 16) return false; if (E.ST.inField && (y < E.FIELD_TOP() || y > E.FIELD_BOT())) return false; if (E.FLY[q.sp]) return E.flyable(x, y); const W = (a, b) => E.walkable(a, b) || E.swimOK(q, a, b); return W(x, y) && W(x - 6, y) && W(x + 6, y) && W(x, y - 3) && W(x, y + 2); }
function spot(q, x, y) { if (okAt(q, x, y)) return { x, y }; return E.nearWalk(x, y); }

/* ---------- bộ mang theo (save: mv / ult) ---------- */
export function equip(f, e) {
  const L = loadFor(f.sp, f.lv, e || null, f.side); if (!L) return f;
  f.moves = L; f.p78lo = true; f.cds = Object.fromEntries(L.map(m => [m, E.MOVES[m].ult ? E.MOVES[m].cd : 1.5 + f.side * 0.8])); return f;
}

/* ================= tung chiêu (SK.m === 'p78') ================= */
export function fire(f, a, foe) {
  E.skLog({ side: f.side, id: a.id, m: 'p78' }); log({ ev: 'fire', id: a.id, side: f.side, sp: f.sp });
  switch (a.id) {
    case 'da_vun_ban': return rubble(f, a);
    case 'dao_ham_vo': return burrow(f, a);
    case 'cat_lun': return quicksand(f, a);
    case 'son_bang': return avalanche(f, a);
    case 'dia_tu': return geomagnet(f, a);
    case 'ngu_bu': return catnap(f, a);
    case 'lan_xa': return recklessRoll(f, a);
    case 'thu_the': case 'gong_chiu': return true;   /* dựng ngay lúc bắt đầu (onStart) */
  }
  return false;
}
export const ownTag = id => id === 'son_bang';   /* Sơn Băng tự hô tên (chữ điểm ảnh tách 2 nhịp gồng / tung) — engine không hiện tên tuyệt chiêu lần nữa */
export function onStart(f, id) {
  if (!IDS[id] || !f.act || f.act.id !== id) return;
  const sk = skinF(f), pw = pwF(f), a = f.act;
  if (id === 'son_bang') {
    const T = E.impactT(a.clip) + 0.04; a.p78chg = 1;
    FX.chargeAura({ get: () => (live(f) && f.act === a && !a.fired ? { x: f.x, y: f.y, h: E.standH(f) + (f.alt || 0), w: E.bodyW(f) } : null), T, sk, pw });
    FX.shout(f.x, E.headY(f) - 6, vi() ? 'SƠN…' : 'AVALAN…', '#ffe9a0', 1, Math.max(0.6, T));
    const o = E.foeReal(f); if (live(o) && E.ST.auto[o.side] && E.freeFor(o) && rnd() < 0.22 + E.dodgeB(o)) { const dx = o.x - f.x, dy = o.y - f.y, d = Math.hypot(dx, dy) || 1, s = rnd() < 0.5 ? 1 : -1; o.dodge = { vx: -dy / d * s, vy: dx / d * s, t: 0.42, delay: Math.max(0.05, T - 0.35) }; }   /* thấy gồng → lướt ngang khỏi hàng */
    log({ ev: 'charge', side: f.side });
  }
  if (id === 'thu_the') {
    a.fired = true; a.p78 = 1; f.cds[id] = E.MOVES[id].cd;
    if (E.ST.t - (f.p78gLast ?? -99) < 6 && rnd() < 0.5) { say(f.x, f.y - 30, 'HỤT THẾ', 'STANCE SLIPPED', '#d8d8e8', 0.85); log({ ev: 'guard_fail', side: f.side }); f.p78gLast = E.ST.t; return; }
    f.p78gLast = E.ST.t; f.p78guard = { t: 0, T: 0.7, h: FX.guard({ get: () => (live(f) ? { x: f.x, y: f.y, h: E.standH(f), fx: f.fx, fy: f.fy } : null), T: 0.7, sk }) };
    log({ ev: 'guard', side: f.side });
  }
  if (id === 'gong_chiu') {
    a.fired = true; a.p78 = 1;
    if (f.p78endUsed) { say(f.x, f.y - 30, 'HẾT SỨC GỒNG', 'NO GRIT LEFT', '#d8d8e8', 0.85); log({ ev: 'endure_fail', side: f.side }); return; }
    f.p78endure = { t: 0, T: 2, h: FX.endure({ get: () => (live(f) ? { x: f.x, y: f.y, h: E.standH(f) } : null), T: 2, sk }) };
    say(f.x, f.y - 30, 'GỒNG!', 'BRACE!', '#ffd45e', 0.9); log({ ev: 'endure', side: f.side });
  }
}

/* ---------- ĐÁ VỤN BẮN: 2–5 viên × 18, viên đầu tung xúc xắc trúng, các viên sau chắc trúng nếu đối thủ còn đứng trong đường ---------- */
function pickN() { const r = rnd(); return r < 0.35 ? 2 : r < 0.7 ? 3 : r < 0.85 ? 4 : 5; }
function rubble(f, a) {
  const n = pickN(), sk = skinF(f), pw = pwF(f); let hits = 0, landed = 0; a.p78t = 0;
  FX.volley({ src: () => { const m = E.beamMouth(f); return { x: m.x, gy: f.y, z: Math.max(2, f.y - m.y) }; }, tg: () => { const o = E.foeReal(f); return { x: o.x, gy: o.y, z: chestZ(o) }; }, n, gap: 0.085, sk, pw, ky: f.y,
    onArrive: (i, s) => { landed++; const o = E.foeReal(f); if (!live(o)) return false; if (Math.hypot(o.x - s.aim.x, o.y - s.aim.gy) > 14 || o.p78under || (o.dodge && !(o.dodge.delay > 0))) { log({ ev: 'rubble_miss', side: f.side, i }); return false; }
      const ok = E.hit(f, o, a.mv, { _now: 1, noMiss: hits > 0, kb: 26, noFlash: hits > 0 });   /* chỉ viên trúng đầu chớp trắng + khựng; viên sau ánh màu nhẹ (trước: trắng toát nửa thời gian) */ if (ok) hits++; if (landed === n && hits >= 2) say(o.x, o.y - 44, `×${hits}`, `×${hits}`, '#ffe9a0', 1.05, 1.0); log({ ev: 'rubble_hit', side: f.side, i, ok }); return ok; } });
  a.sigU = dt => { a.p78t += dt; f.ct = Math.min(f.ct, E.impactT(a.clip)); return a.p78t < n * 0.085 + 0.12; };
  log({ ev: 'rubble', side: f.side, n }); return true;
}

/* ---------- ĐÀO HẦM VỒ: chui đất 1 s (miễn đòn, trừ chiêu vùng đất ×2 và buộc trồi) → ụ đất đuổi theo → trồi cắn 85 + hất bổng ---------- */
function burrow(f, a) {
  const sk = skinF(f), pw = pwF(f), V = FX.VAR.dao_ham_vo; FX.sink(f.x, f.y, sk, pw); E.sfx('knock_whoosh');
  const D = f.p78dig = { ph: 'down', t: 0, warn: false, V };
  const B = FX.burrow({ get: () => (f.p78dig === D && D.ph === 'under' ? { x: f.x, y: f.y } : null), sk, pw, variant: V });
  a.sigU = dt => { if (f.p78dig !== D) { B.end(); f.p78under = false; f.p78sink = 0; return false; } D.t += dt; f.ct = Math.min(f.ct, E.impactT(a.clip));
    const o = E.foeReal(f);
    if (D.ph === 'down') { f.p78sink = Math.min(1, D.t / 0.22); if (D.t >= 0.22) { D.ph = 'under'; D.t = 0; f.p78under = true; log({ ev: 'dig_under', side: f.side }); } return true; }
    if (D.ph === 'under') {
      if (live(o)) { const sd = f.x <= o.x ? -1 : 1, tx = o.x + sd * 10, ty = o.y + 1, dx = tx - f.x, dy = ty - f.y, d = Math.hypot(dx, dy); const sp = 175 * dt; if (d > 2) { f.x += dx / d * Math.min(d, sp); f.y += dy / d * Math.min(d, sp); E.clampField(f); } E.face(f, o.x, o.y);
        if (V === 'c' && !D.warn && D.t > 0.62) { D.warn = true; FX.warnRing(o.x, o.y, sk, 15, 0.36); }
        if (!D.warned && D.t > 0.7 && E.ST.auto[o.side] && E.freeFor(o) && rnd() < 0.18 + E.dodgeB(o)) { D.warned = 1; const s = rnd() < 0.5 ? 1 : -1; o.dodge = { vx: s, vy: 0.3, t: 0.3, delay: 0.15 }; }   /* đất rung dưới chân → AI đôi khi nhảy tránh */
      }
      if (D.t >= 1.0 || D.forced) emerge(f, a, D, sk, pw); return true; }
    if (D.ph === 'up') { f.p78sink = Math.max(0, 1 - D.t / 0.12); if (D.t >= 0.38) { f.p78dig = null; f.p78sink = 0; B.end(); return false; } return true; }
    return false; };
  log({ ev: 'dig', side: f.side }); return true;
}
function emerge(f, a, D, sk, pw) {
  f.p78under = false; D.ph = 'up'; D.t = 0; const o = E.foeReal(f), forced = !!D.forced; const q = spot(f, f.x, f.y); f.x = q.x; f.y = q.y;
  FX.erupt(f.x, f.y, sk, pw, D.V); E.sfx('smash'); f.toss = 0.3; f.tossT = 0.3; f.tossH = 10;
  if (forced) { say(f.x, f.y - 30, 'BỊ ÉP TRỒI!', 'FORCED OUT!', '#ffb347', 0.95); log({ ev: 'dig_forced', side: f.side }); return; }
  if (!live(o)) return; const d = Math.hypot(o.x - f.x, o.y - f.y);
  if (d > 26 || (o.dodge && !(o.dodge.delay > 0)) || o.p78under) { say(f.x, f.y - 30, 'HỤT', 'WHIFF', '#d8d8e8', 0.85); log({ ev: 'dig_miss', side: f.side, d: Math.round(d) }); return; }
  FX.bite(o.x, o.y, chestZ(o), sk, pw); const ok = E.hit(f, o, a.mv, { _now: 1, kb: 120 });
  if (ok && !o.dead) { o.toss = 0.45; o.tossT = 0.45; o.tossH = 16 + 8 * pw.p; }
  log({ ev: 'dig_bite', side: f.side, ok });
}

/* ---------- CÁT LÚN: 3 vũng 10 s quanh đối thủ; bước vào → tốc −1 + mắc 0,6 s (mỗi vũng nghỉ 1,5 s / thú) ---------- */
function quicksand(f, a) {
  const o = E.foeReal(f), sk = skinF(f), pw = pwF(f), V = FX.VAR.cat_lun; for (const P of S.pits.filter(p => p.f === f)) P.h.kill(); S.pits = S.pits.filter(p => p.f !== f);
  const tx = o ? o.x + (o.vx || 0) * 0.35 : f.x + f.fx * 60, ty = o ? o.y + (o.vy || 0) * 0.35 : f.y + f.fy * 30, dx = tx - f.x, dy = ty - f.y, d = Math.hypot(dx, dy) || 1, px = -dy / d, py = dx / d;
  const spots = [{ x: tx, y: ty }, { x: tx + px * 28 - dx / d * 8, y: ty + py * 16 }, { x: tx - px * 28 - dx / d * 8, y: ty - py * 16 }].map(s => spot(f, s.x, s.y)).filter(Boolean);
  const mo = E.beamMouth(f);
  spots.forEach((s, i) => { const mk = () => { const h = FX.pit({ x: s.x, y: s.y, r: 13, T: 10, sk }); S.pits.push({ f, h, x: s.x, y: s.y, r: 13, cd: new Map() }); if (V === 'c') FX.shockRing(s.x, s.y + 1, 18, sk, 0.4, 2); log({ ev: 'pit', side: f.side, i }); };
    at(i * 0.09, () => { if (V === 'a') FX.lob({ x: mo.x, gy: f.y, z: Math.max(2, f.y - mo.y), tx: s.x, ty: s.y, T: 0.42, h: 24, sk, onLand: mk }); else if (V === 'b') FX.sandWave({ x: f.x, y: f.y, tx: s.x, ty: s.y, T: 0.36, sk, onLand: mk }); else at(0.25, mk); }); });
  E.sfx('knock_whoosh'); say(tx, ty - 22, 'CÁT LÚN', 'QUICKSAND', '#f4d8a0', 0.85, 1.0); return true;
}
function updPits(dt) {
  for (const P of S.pits) { if (!P.h.alive()) { P.dead = true; continue; }
    for (const [q, c] of P.cd) if (c > 0) P.cd.set(q, c - dt);
    for (const q of E.ST.F) { if (!live(q) || q.side === P.f.side || q.p78under || (q.alt || 0) >= 6 || (E.FLY[q.sp] && !grounded(q))) continue;
      const ex = (q.x - P.x) / P.r, ey = (q.y - P.y) / (P.r * 0.55); if (ex * ex + ey * ey > 1 || (P.cd.get(q) || 0) > 0) continue;
      P.cd.set(q, 1.5); q.stage.spe = Math.max(-6, (q.stage.spe || 0) - 1); q.pin = Math.max(q.pin || 0, 0.6); q.kb = null; q.dodge = null; P.h.trig();
      say(q.x, q.y - 30, 'MẮC CÁT!', 'STUCK!', '#f4d8a0', 0.95); log({ ev: 'pit_trap', side: P.f.side }); } }
  S.pits = S.pits.filter(p => !p.dead);
}

/* ---------- SƠN BĂNG (tuyệt chiêu): gồng (hào quang gai + đá bay lên + chữ hô) → dòng đá lở đường thẳng 150 px xuyên hàng 135 → tự hạ phòng −2 trong 6 s ---------- */
function avalanche(f, a) {
  const o = E.foeReal(f), sk = skinF(f), pw = pwF(f), V = FX.VAR.son_bang; const dx = (o ? o.x : f.x + f.fx * 50) - f.x, dy = (o ? o.y : f.y + f.fy * 20) - f.y, d = Math.hypot(dx, dy) || 1, ux = dx / d, uy = dy / d;
  const L = E.ST.inField ? 170 : 150, W = 8 + 6 * pw.p, x0 = f.x + ux * 6, y0 = f.y + uy * 3; let hitDone = false; const seen = new Set();
  FX.shout(f.x, E.headY(f) - 6, vi() ? 'BĂNG!!' : '…CHE!!', '#ffd45e', 2, 0.7);
  FX.slide({ x: x0, gy: y0, z: 6, ux, uy, L, W, T: 0.55, sk, pw, variant: V, kyC: f.y, hitAt: o ? Math.max(20, (o.x - x0) * ux + (o.y - y0) * uy) : L * 0.6,
    onFront: (u, u0) => { const q = E.foeReal(f); if (!hitDone && live(q)) { const along = (q.x - x0) * ux + (q.y - y0) * uy, perp = Math.abs(-(q.x - x0) * uy + (q.y - y0) * ux);
        if (along >= u0 - 6 && along <= u + 4 && along <= L + 4 && perp <= W + E.bodyW(q) * 0.5 && !q.p78under) { hitDone = true; const ok = E.hit(f, q, a.mv, { _now: 1, kb: 220 }); if (ok) FX.impact(q.x, q.y, chestZ(q), sk, pw, { n: 12, r: 5, big: 1.1, ring: true, ringR: 22, star: true, noCrater: true }); log({ ev: 'slide_hit', side: f.side, ok, along: Math.round(along) }); } }
      for (let s = Math.ceil(u0 / 30) * 30; s <= u; s += 30) if (!seen.has(s)) { seen.add(s); E.aoe(f, x0 + ux * s, y0 + uy * s, W + 8, 1.3, { noObj: s < 40 }); } } });   /* xuyên hàng: dân / vật / quái dọc đường cũng trúng */
  E.ST.ctx && E.ST.ctx.quake && E.ST.ctx.quake(pw.shake * 1.3); E.ST.hitstop = Math.max(E.ST.hitstop, pw.stop);
  a.p78t = 0; a.sigU = dt => { a.p78t += dt; f.ct = Math.min(f.ct, E.impactT(a.clip)); if (a.p78t < 0.75) return true;
    if (!a.p78cost) { a.p78cost = 1; if (live(f)) { f.stage.def = Math.max(-6, (f.stage.def || 0) - 2); S.debuffs.push({ f, k: 'def', v: 2, t: 6 }); say(f.x, f.y - 34, 'PHÒNG −2', 'DEF −2', '#9fb4c8', 0.9, 1.4); log({ ev: 'slide_cost', side: f.side }); } } return false; };
  log({ ev: 'slide', side: f.side, V }); return true;
}

/* ---------- ĐỊA TỪ: sân 100 px quanh chỗ dậm, 8 s — thú bay bị kéo xuống (mất BAY NÉ ĐẤT), lướt / bay văng ×0,6, chiêu Chấn của chủ ×1,15 ---------- */
function geomagnet(f, a) {
  for (const F0 of S.fields) if (F0.f === f) F0.h.kill(); S.fields = S.fields.filter(F0 => F0.f !== f);
  const sk = skinF(f), F0 = { f, x: f.x, y: f.y + 1, R: 100, t: 0, T: 8, pulled: new Set() }; F0.h = FX.geoField({ x: F0.x, y: F0.y, R: F0.R, T: F0.T, sk }); S.fields.push(F0);
  E.sfx('smash'); say(f.x, f.y - 34, 'ĐỊA TỪ', 'LODESTONE', '#e8c48a', 0.95, 1.2); log({ ev: 'field', side: f.side }); return true;
}
const inField = (F0, q) => Math.hypot(q.x - F0.x, (q.y - F0.y) / 0.55) <= F0.R;
export function grounded(q) { if (!E || !q) return false; for (const F0 of S.fields) if (F0.h.alive() && inField(F0, q)) return true; return false; }
export const dodgeMul = q => (grounded(q) ? 0.6 : 1);
function updFields(dt) {
  for (const F0 of S.fields) { F0.t += dt; if (!F0.h.alive() || !live(F0.f) && F0.t > 0.5) { F0.dead = !F0.h.alive(); }
    for (const q of E.ST.F) { if (!live(q) || !E.FLY[q.sp] || F0.pulled.has(q) || !inField(F0, q)) continue; F0.pulled.add(q); FX.pullDown(q.x, q.y, (q.alt || 0) + E.standH(q) * 0.5, skinF(F0.f)); say(q.x, q.y - 36, 'BỊ KÉO XUỐNG!', 'PULLED DOWN!', '#e8c48a', 0.95); log({ ev: 'field_pull', side: F0.f.side, sp: q.sp }); } }
  S.fields = S.fields.filter(F0 => !F0.dead);
}

/* ---------- NGỦ BÙ: hồi 50 % + xoá trạng thái, rồi ngủ 2,5 s (trúng đòn thì tỉnh) ---------- */
function catnap(f, a) {
  const hv = Math.min(f.max - f.hp, Math.round(f.max * 0.5)); f.hp = Math.min(f.max, f.hp + Math.round(f.max * 0.5)); const had = f.status ? f.status.id : null; f.status = null;
  f.status = { id: 'ngu', t: 2.5, tick: 0 }; f.p78nap = 1; const sk = skinF(f);
  E.text(f.x, f.y - 26, (vi() ? 'NGỦ BÙ +' : 'CATNAP +') + hv, '#7ee08a', 1.05, 1.5); FX.heal(f.x, f.y, E.standH(f), sk, 18);
  FX.nap({ get: () => (live(f) && f.status && f.status.id === 'ngu' ? { x: f.x, y: f.y, h: E.standH(f) } : null), T: 2.6, sk });
  log({ ev: 'nap', side: f.side, hv, had }); return true;
}

/* ---------- LĂN XẢ: cuộn tròn lăn húc 100, tự mất 25 % sát thương gây ra ---------- */
function recklessRoll(f, a) {
  const sk = skinF(f), pw = pwF(f); a.p78r = { t: 0, done: false }; let lx = f.x, ly = f.y;
  const R = FX.roll({ get: () => (a.p78r && !a.p78r.done && live(f) ? { x: f.x, y: f.y, h: E.standH(f), vx: f.x - lx || f.fx, vy: f.y - ly || 0 } : null), T: 1, sk });
  E.sfx('knock_whoosh');
  a.sigU = dt => { const r = a.p78r; if (!r || r.done) { R.end(); return false; } r.t += dt; f.ct = Math.min(f.ct + dt * 0.5, E.impactT(a.clip)); const o = E.foeReal(f);
    if (!live(o)) { r.done = true; R.end(); return false; } E.face(f, o.x, o.y); lx = f.x; ly = f.y; const sp = 270; if (!E.moveBy(f, f.fx * sp * dt, f.fy * sp * dt)) r.t = 9; E.clampField(f);
    if (Math.hypot(o.x - f.x, o.y - f.y) < Math.max(18, (E.bodyW(f) + E.bodyW(o)) * 0.42 + 3)) { r.done = true; R.end();
      const hp0 = o.hp, stab = f.types.includes(a.mv.type) ? 1 / 1.5 : 1, ok = E.hit(f, o, a.mv, { _now: 1, kb: 170, mul: stab }), dealt = Math.max(0, hp0 - o.hp);
      FX.impact((f.x + o.x) / 2, Math.max(f.y, o.y), chestZ(o) * 0.7, sk, pw, { n: 10, r: 4.5, big: 1, ring: true, ringR: 18, star: true });
      if (ok && dealt > 0 && live(f)) { const rc = Math.max(1, Math.round(dealt * 0.25)); f.hp = Math.max(1, f.hp - rc); E.text(f.x, f.y - 26, '-' + rc, '#ffb08a', 0.95); say(f.x, f.y - 38, 'GIẬT LÙI', 'RECOIL', '#ffb08a', 0.8); f.kb = { vx: -f.fx * 120, vy: -f.fy * 60, t: 0.16 }; log({ ev: 'roll_hit', side: f.side, dealt, rc }); }
      else log({ ev: 'roll_hit', side: f.side, ok, dealt });
      return false; }
    if (r.t > 0.62) { r.done = true; R.end(); say(f.x, f.y - 30, 'HỤT', 'WHIFF', '#d8d8e8', 0.85); log({ ev: 'roll_miss', side: f.side }); return false; }
    return true; };
  log({ ev: 'roll', side: f.side }); return true;
}

/* ================= móc trúng đòn ================= */
const GROUND_AREA = mv => mv && mv.type === 'chan' && (mv.shape === 'quanh' || mv.shape === 'vung');
export function preHit(att, def, mv) {   /* false = chặn đòn (không sát thương) */
  if (!E || !def || att === def) return true;
  if (def.p78under) { if (GROUND_AREA(mv)) { const D = def.p78dig; if (D && D.ph === 'under') { D.forced = true; D.t = 0; emerge(def, def.act, D, skinF(def), pwF(def)); } return true; } E.text(def.x, def.y - 12, vi() ? 'DƯỚI ĐẤT' : 'UNDERGROUND', '#d8d8e8', 0.8); log({ ev: 'dig_dodge', side: def.side, mv: mv && mv.id }); return false; }
  const G = def.p78guard; if (G && G.t < G.T && mv && mv.pow > 0) { def.p78guard = null; G.h.block(att.x, att.y); say(def.x, def.y - 34, 'CHẶN!', 'BLOCKED!', '#ffe9a0', 1.0); log({ ev: 'guard_block', side: def.side, mv: mv.id }); return false; }
  return true;
}
export function dmgMul(att, def, mv) {
  let k = 1; if (def && def.p78under && GROUND_AREA(mv)) k *= 2;
  if (att && mv && mv.type === 'chan') for (const F0 of S.fields) if (F0.f === att && F0.h.alive() && inField(F0, att)) { k *= 1.15; break; }
  return k;
}
export function afterHit(att, def, mv) {
  if (def.p78endure && def.hp <= 0) { def.hp = 1; def.p78endure.h.save(); def.p78endure = null; def.p78endUsed = true; say(def.x, def.y - 40, 'GỒNG CHỊU!', 'HELD ON!', '#ffd45e', 1.15, 1.6); log({ ev: 'endure_save', side: def.side }); }
  if (def.kb && grounded(def)) { def.kb.vx *= 0.6; def.kb.vy *= 0.6; }
}

/* ================= mỗi khung ================= */
export function tick(f, dt) {
  if (f.p78guard) { f.p78guard.t += dt; if (f.p78guard.t >= f.p78guard.T) { f.p78guard.h.end(); f.p78guard = null; } }
  if (f.p78endure) { f.p78endure.t += dt; if (f.p78endure.t >= f.p78endure.T) { f.p78endure.h.end(); f.p78endure = null; } }
  if (f.p78dig && !(f.act && (f.act.id === 'dao_ham_vo'))) { f.p78dig = null; f.p78under = false; f.p78sink = 0; }   /* động tác bị ngắt → trồi ngay */
}
export function update(dt) {
  if (!E) return; FX.update(dt);
  for (const T0 of S.timers) { T0.t -= dt; if (T0.t <= 0) { T0.done = true; try { T0.fn(); } catch (e) { console.error('p78 timer', e); } } } S.timers = S.timers.filter(T0 => !T0.done);
  updPits(dt); updFields(dt);
  for (const D of S.debuffs) { D.t -= dt; if (D.t <= 0) { D.done = true; if (live(D.f)) D.f.stage[D.k] = Math.min(6, (D.f.stage[D.k] || 0) + D.v); } } S.debuffs = S.debuffs.filter(D => !D.done);
  reflex();
}
function reflex() {   /* AI: Thủ Thế khi đòn to của đối thủ sắp chạm (≤ 0,35 s) · Gồng Chịu khi máu thấp và đòn to sắp tới. Đòn đánh xa (lob / proj2): tính giờ theo viên đạn đang bay tới, không theo lúc ném */
  const RANGED = id => !!(E.SK[id] && (E.SK[id].m === 'lob' || E.SK[id].m === 'proj2'));
  for (const f of E.ST.F) { if (!live(f) || !E.ST.auto[f.side] || !E.freeFor(f)) continue; const L = E.MV78(f), o = E.foeReal(f); if (!live(o)) continue;
    let src = null, mv = null, eta = 9;
    if (o.act && !o.act.fired && o.act.id !== 'huc' && o.act.p78seen !== f && !RANGED(o.act.id)) { src = o.act; mv = o.act.mv; eta = E.impactT(o.act.clip) - o.act.t; }
    else for (const s of E.ST.shots) { if (s.done || s.f !== o || !s.mv || s.p78seen === f) continue; const e2 = s.kind === 'lob' ? s.T - s.t : s.kind === 'proj2' ? Math.hypot(f.x - s.x, f.y - s.gy) / (Math.hypot(s.vx, s.vy) || 1) : 9; if (e2 < eta) { eta = e2; src = s; mv = s.mv; } }
    if (!src || eta > 0.35 || eta < 0.02) continue; const big = k => !!(mv && (mv.ult || mv.pow >= k));
    if (L.includes('thu_the') && (f.cds.thu_the || 0) <= 0 && big(55) && Math.hypot(o.x - f.x, o.y - f.y) < 170) { src.p78seen = f; if (rnd() < 0.75) { E.startAct(f, 'thu_the'); log({ ev: 'guard_reflex', side: f.side, vs: mv && mv.id }); } continue; }
    if (L.includes('gong_chiu') && !f.p78endUsed && !f.p78endure && (f.cds.gong_chiu || 0) <= 0 && f.hp < f.max * 0.32 && big(70)) { src.p78seen = f; if (rnd() < 0.7) { E.startAct(f, 'gong_chiu'); log({ ev: 'endure_reflex', side: f.side }); } }
  }
}
/* AI: trọng số chọn chiêu */
export function weight(f, id, k0, foe, d) {
  const o = E.foeReal(f), hp = f.hp / f.max; if (!o) return k0;
  switch (id) {
    case 'da_vun_ban': return d >= 40 && d <= 140 ? 1.7 : 0.6;
    case 'dao_ham_vo': return (E.FLY[o.sp] && !grounded(o)) ? 0.4 : d >= 50 ? 1.6 : d < 30 ? 0.4 : 1.0;
    case 'cat_lun': { const mine = S.pits.filter(p => p.f === f).length; if (mine >= 2) return 0; return o.moving ? 1.5 : 0.9; }
    case 'dia_tu': { if (S.fields.some(F0 => F0.f === f && F0.h.alive())) return 0; if (E.FLY[o.sp]) return d <= 95 ? 3 : 0.6; if ((o.tier === 'xs' || o.tier === 's') && d <= 90) return 1.3; return d <= 90 ? 0.5 : 0.1; }
    case 'thu_the': return 0;   /* chỉ dùng phản xạ (reflex) */
    case 'gong_chiu': return f.p78endUsed || f.p78endure ? 0 : hp < 0.45 ? 2.2 : 0.06;
    case 'ngu_bu': { if (f.status && f.status.id !== 'ngu') return hp < 0.7 ? 2.0 : 0.6; return hp < 0.4 && d > 40 ? 2.6 : hp < 0.55 ? 0.6 : 0; }
    case 'lan_xa': return hp < 0.22 ? 0.3 : d <= 120 ? 1.3 : 0.5;
  }
  return k0;
}
export function steer(f) {   /* né vũng cát của đối thủ */
  if (!E) return null; let vx = 0, vy = 0, w = 0;
  for (const P of S.pits) { if (P.f.side === f.side || (E.FLY[f.sp] && !grounded(f))) continue; const dx = f.x - P.x, dy = (f.y - P.y) / 0.55, d = Math.hypot(dx, dy); if (d < P.r + 16) { vx += dx / (d || 1); vy += dy / (d || 1) * 0.55; w = Math.max(w, 0.65 * (1 - d / (P.r + 16)) + 0.2); } }
  if (!w) return null; const n = Math.hypot(vx, vy) || 1; return { x: vx / n, y: vy / n, w };
}

/* ================= vẽ ================= */
export function drawF(g, f, cx, cy, df) {   /* chui đất: chỉ còn ụ đất (fx78.burrow) · đang chui / trồi: cắt thân theo mặt đất */
  if (f.p78under && !f.dead) return;
  const sink = f.p78sink > 0 ? f.p78sink : 0; if (!sink) return df(g, f, cx, cy);
  g.save(); const Hh = E.standH(f) + 4, yl = Math.round(f.y - cy) + 1; g.beginPath(); g.rect(-9999, -9999, 19999, yl + 9999); g.clip(); const y0 = f.y; f.y = y0 + Math.round(Hh * sink); try { df(g, f, cx, cy); } finally { f.y = y0; } g.restore();
}
export function drawGround(g, cx, cy) { if (E) FX.drawGround(g, cx, cy); }
export function drawables(out, g, cx, cy) { if (E) FX.drawables(out, g, cx, cy); }

/* ================= vào trận / thu về ================= */
export function reset() { S.pits = []; S.fields = []; S.timers = []; S.debuffs = []; S.log = []; S.n = {}; FX.clear(); if (E) hooks(); }
export function bench(f) {
  for (const P of S.pits) if (P.f === f) { P.h.kill(); P.dead = true; } S.pits = S.pits.filter(p => !p.dead);
  for (const F0 of S.fields) if (F0.f === f) { F0.h.kill(); F0.dead = true; } S.fields = S.fields.filter(F0 => !F0.dead);
  for (const D of S.debuffs) if (D.f === f) { D.done = true; f.stage[D.k] = Math.min(6, (f.stage[D.k] || 0) + D.v); } S.debuffs = S.debuffs.filter(D => !D.done);
  if (f.p78guard) f.p78guard.h.end(); if (f.p78endure) f.p78endure.h.end();
  for (const k of ['p78guard', 'p78endure', 'p78dig', 'p78under', 'p78sink']) f[k] = null;
}
export function dbg() { return { n: { ...S.n }, log: S.log.slice(-80), pits: S.pits.length, fields: S.fields.map(F0 => ({ side: F0.f.side, t: +F0.t.toFixed(1) })), fx: FX.stats(),
  F: E ? E.ST.F.map(f => f && { sp: f.sp, lv: f.lv, moves: f.moves || null, under: !!f.p78under, guard: !!f.p78guard, endure: !!f.p78endure, endUsed: !!f.p78endUsed, gr: grounded(f), def: f.stage.def, spe: f.stage.spe, x: Math.round(f.x), y: Math.round(f.y), hp: Math.round(f.hp) }) : [] }; }
