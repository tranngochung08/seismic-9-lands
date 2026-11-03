/* chieu73.js — p73 (01/11/2026): 8 CHIÊU ĐỘC LẠ ★ cho trận Chấn Thú / linh thú (linhduel.js). Thiết kế: scratchpad chieumoi/plan.md (anh duyệt "theo ý em").
   · Vòng Dư Chấn (Chũi) · Bẫy Lò Than (Xích Long, Hoả Hùng) · Đổi Dòng (Cá Chép) · Hình Nhân Lá (Diệp Nhẫn Giả)
   · Hoàn Tác (Bọ Vi Mạch) · Khúc Tàn Canh (Dế) · Rình Sơ Hở (Cu Li Bóng) · Gương Hồi Quang (Tắc Kè).
   Cơ chế + AI + VFX VẼ CODE HOÀN TOÀN (skill vfx-code): bảng 8 bậc mỗi hệ (PAL_SRC), mờ bằng dither Bayer 4×4, hạt có trọng lực, khựng + rung đúng khung.
   Không hiệu ứng lặp quanh thú: mọi thứ bật theo sự kiện rồi tắt (biểu tượng than / số đếm / bóng điểm lưu là hình TĨNH).
   linhduel.js gọi: init(env) · fire · onCast · onStart · tick · update · shot · decoyFor · decoyHit · dmgMul · afterHit · spdMul · holdMoves · weight · steer · drawF · drawGround · drawables · reset · bench · dbg. */
import { PAL_SRC } from './pxfx.js';

let E = null;
export function init(env) { E = env; }
export const IDS = { vong_du_chan: 1, bay_lo_than: 1, doi_dong: 1, hinh_nhan_la: 1, hoan_tac: 1, khuc_tan_canh: 1, rinh_so_ho: 1, guong_hoi_quang: 1 };
const S = { rings: [], decoys: [], saves: [], songs: [], cols: [], parts: [], streaks: [], refl: [], flashes: [], log: [], n: {} };
const P = he => PAL_SRC[he] || PAL_SRC.chan;
const rnd = () => Math.random();
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const vi = () => !(E && E.ST.ctx && E.ST.ctx.lang() === 'en');
function say(x, y, a, b, col, size = 0.95, life = 1.4) { E.text(x, y, vi() ? a : b, col, size, life); }
function log(o) { const r = { t: +E.ST.t.toFixed(2), ...o }; S.log.push(r); if (S.log.length > 300) S.log.shift(); S.n[o.ev] = (S.n[o.ev] || 0) + 1; }
const live = q => !!(q && !q.dead && !q.absent && E.ST.F[q.side] === q);
const quake = s => { try { if (E.ST.ctx && E.ST.ctx.quake) E.ST.ctx.quake(s); } catch (e) { } };
const stop = s => { E.ST.hitstop = Math.max(E.ST.hitstop || 0, s); };
const chestY = q => q.y - Math.max(6, E.standH(q) * 0.45) - (q.alt || 0);
function canAffect(att, def) { return live(def) && live(att) && !(def.inv > 0) && !def.hide && !(def.dig && def.dig.ph === 'under') && E.ST.ph === 'fight'; }
function okAt(q, x, y) {   /* chỗ đứng hợp lệ cho thú q: thú bay → trong bản đồ; thú đất → không ô cứng (bơi được thì cả nước) + đủ chỗ thân */
  const m = E.ST.ctx && E.ST.ctx.S.map; if (!m) return false; if (x < 24 || y < 24 || x > m.w * 16 - 24 || y > m.h * 16 - 16) return false;
  if (E.ST.inField && (y < E.FIELD_TOP() || y > E.FIELD_BOT())) return false;
  if (E.FLY[q.sp]) return E.flyable(x, y);
  const W = (a, b) => E.walkable(a, b) || E.swimOK(q, a, b); return W(x, y) && W(x - 6, y) && W(x + 6, y) && W(x, y - 3) && W(x, y + 2);
}
function fixedDmg(q, dmg, col, why) { if (!live(q) || dmg <= 0) return; q.hp = Math.max(0, q.hp - dmg); E.text(q.x, q.y - 26, String(dmg), col || '#ffffff', 1.15); q.flash = 0.034; E.ST.log.push({ t: +E.ST.t.toFixed(1), side: 1 - q.side, mv: why, dmg, fixed: true }); if (q.hp <= 0) E.faint(q); }

/* ================= bộ vẽ điểm ảnh (nửa px logic, như duelfx) ================= */
const BAY = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5], bay = (x, y) => (BAY[((y & 3) << 2) | (x & 3)] + 0.5) / 16;
function dot(g, X, Y, c) { g.fillStyle = c; g.fillRect(X / 2, Y / 2, 0.5, 0.5); }
function disc(g, X, Y, r, c, a = 1) { g.fillStyle = c; for (let y = Math.floor(Y - r); y <= Math.ceil(Y + r); y++) for (let x = Math.floor(X - r); x <= Math.ceil(X + r); x++) { const dx = x + 0.5 - X, dy = y + 0.5 - Y; if (dx * dx + dy * dy <= r * r && (a >= 1 || a > bay(x, y))) g.fillRect(x / 2, y / 2, 0.5, 0.5); } }
const SX = (x, cx) => Math.round((x - cx) * 2), SY = (y, cy) => Math.round((y - cy) * 2);
function part(o) { const p = Object.assign({ x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, g: 0, drag: 0, t: 0, T: 0.4, k: 'px', ky: null, a: 1, bounce: 0 }, o); if (p.ky == null) p.ky = p.y + 0.3; S.parts.push(p); if (S.parts.length > 700) S.parts.shift(); return p; }
function sparks(x, y, z, he, n, sp = 60, up = 40, T = 0.35, g = 240, ky = null) { const C = P(he); for (let i = 0; i < n; i++) { const a = rnd() * Math.PI * 2, v = sp * (0.4 + rnd() * 0.8); part({ x, y, z, vx: Math.cos(a) * v, vy: Math.sin(a) * v * 0.5, vz: up * (0.3 + rnd()), g, drag: 2, T: T * (0.6 + rnd() * 0.6), cols: [C[0], C[1], C[2], C[4]], ky: ky ?? y + 0.4 }); } }
function puff(x, y, he, n = 5, r = 2, T = 0.45, ky = null) { const C = P(he); for (let i = 0; i < n; i++) part({ k: 'disc', x: x + (rnd() - 0.5) * 8, y: y + (rnd() - 0.5) * 3, z: rnd() * 2, vx: (rnd() - 0.5) * 26, vz: 8 + rnd() * 12, g: 20, drag: 3, r: r * (0.7 + rnd() * 0.6), grow: 0.8, T: T * (0.7 + rnd() * 0.5), cols: [C[2], C[3], C[4]], ky: ky ?? y + 0.4 }); }
function flash(x, y, z, he, r, T = 0.12, ky = null, star = false) { S.flashes.push({ x, y, z, he, r, t: 0, T, ky: ky ?? y + 0.6, star }); }
function updParts(dt) {
  for (const p of S.parts) { p.t += dt; const dr = Math.max(0, 1 - p.drag * dt); p.vx *= dr; p.vy *= dr; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; p.vz -= p.g * dt;
    if (p.z < 0) { p.z = 0; if (p.bounce && Math.abs(p.vz) > 20) { p.vz = -p.vz * p.bounce; p.vx *= 0.6; p.vy *= 0.6; } else { p.vz = 0; p.vx *= 0.8; p.vy *= 0.8; } }
    if (p.spin) p.ang = (p.ang || 0) + p.spin * dt; }
  S.parts = S.parts.filter(p => p.t < p.T);
  for (const f of S.flashes) f.t += dt; S.flashes = S.flashes.filter(f => f.t < f.T);
  for (const s of S.streaks) s.t += dt; S.streaks = S.streaks.filter(s => s.t < s.T);
}
function drawPart(g, p, cx, cy) {
  const k = p.t / p.T, X = SX(p.x, cx), Y = SY(p.y - p.z, cy), cols = p.cols || ['#fff'];
  const c = cols[Math.min(cols.length - 1, Math.floor(k * cols.length))], a = (p.fade === false ? 1 : 1 - k * k) * p.a;
  if (p.k === 'px') { if (a < bay(X, Y)) return; dot(g, X, Y, c); dot(g, X + 1, Y, c); if (k < 0.4) dot(g, X, Y + 1, cols[Math.min(cols.length - 1, 2)]); return; }
  if (p.k === 'sq') { if (a < bay(X, Y)) return; const s = p.s || 2; g.fillStyle = c; g.fillRect(X / 2, Y / 2, s / 2, s / 2); return; }
  if (p.k === 'leaf') { if (a < bay(X, Y)) return; const ph = Math.floor(((p.ang || 0) % (Math.PI * 2) + Math.PI * 2) / (Math.PI / 2)) % 4, L = [[0, 0, 1, 0, 2, 0, 1, 1], [0, 0, 0, 1, 1, 1, 1, 2], [0, 1, 1, 1, 2, 1, 1, 0], [1, 0, 1, 1, 0, 1, 0, 2]][ph];
    for (let i = 0; i < 8; i += 2) dot(g, X + L[i], Y + L[i + 1], i < 4 ? c : cols[Math.min(cols.length - 1, 2)]); return; }
  if (p.k === 'disc') { const r = (p.r || 2) * 2 * (1 + (p.grow || 0) * k); disc(g, X, Y, r + 1, cols[Math.min(cols.length - 1, 2)], a); disc(g, X - r * 0.25, Y - r * 0.25, r * 0.65, cols[0], a * 0.9); return; }
}
function drawFlash(g, f, cx, cy) {   /* chớp sáng 1–3 khung: lõi tròn nở-co (+ sao 4 cánh khi star) */
  const k = f.t / f.T, C = P(f.he), X = SX(f.x, cx), Y = SY(f.y - (f.z || 0), cy), r = f.r * 2 * (k < 0.3 ? 0.6 + k * 1.4 : 1 - (k - 0.3) * 0.9);
  if (r < 1) return; disc(g, X, Y, r + 2, C[3]); disc(g, X, Y, r, C[1]); disc(g, X, Y, r * 0.55, C[0]);
  if (f.star) { const L = r * 2.6; for (const [ux, uy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) for (let s = r * 0.6; s < L; s += 1) { const w = 1 - s / L; if (w < bay(X + ux * s, Y + uy * s) * 0.8) continue; dot(g, Math.round(X + ux * s), Math.round(Y + uy * s), s < L * 0.5 ? C[0] : C[2]); } }
}
/* chữ số pixel 3×5 (số đếm, nhãn 00:03) — tĩnh, viền tối 1 px */
const GLY = { 0: ['111', '101', '101', '101', '111'], 1: ['010', '110', '010', '010', '111'], 2: ['111', '001', '111', '100', '111'], 3: ['111', '001', '111', '001', '111'], 4: ['101', '101', '111', '001', '001'], 5: ['111', '100', '111', '001', '111'], ':': ['0', '1', '0', '1', '0'] };
function digits(g, s, x, y, col, cx, cy, out = '#140e1a') {   /* x, y: giữa-đáy chữ (px logic) */
  const ws = [...s].map(ch => (GLY[ch] ? GLY[ch][0].length : 3)), W = ws.reduce((a, b) => a + b + 1, -1); let ox = Math.round(x - cx - W / 2); const oy = Math.round(y - cy - 5);
  for (const pass of [0, 1]) { let px = ox; for (let i = 0; i < s.length; i++) { const G = GLY[s[i]]; if (!G) { px += 4; continue; } g.fillStyle = pass ? col : out;
      for (let r = 0; r < 5; r++) for (let c = 0; c < G[r].length; c++) if (G[r][c] === '1') { if (pass) g.fillRect(px + c, oy + r, 1, 1); else g.fillRect(px + c - 1, oy + r - 1, 3, 3); }
      px += G[0].length + 1; } }
}
/* vòng dither trên đất (elip tỉ lệ 0,55): R bán kính ngoài, th dày (px logic), dens(0..1 theo chiều sâu) → mật độ, cols theo chiều sâu */
function ringBand(g, x, y, R, th, cx, cy, colOf, densOf, ry = 0.55) {
  if (R < 1) return; const X = (x - cx) * 2, Y = (y - cy) * 2, rows = Math.max(1, Math.round(th * 2));
  for (let q = 0; q < rows; q++) { const r = R * 2 - q, dq = q / rows, d = densOf(dq); if (d <= 0.02 || r < 1) continue; g.fillStyle = colOf(dq); const n = Math.max(16, Math.round(r * 6.4));
    for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2, px = Math.round(X + Math.cos(a) * r), py = Math.round(Y + Math.sin(a) * r * ry); if (d < bay(px, py)) continue; g.fillRect(px / 2, py / 2, 0.5, 0.5); } }
}

/* ================= vào trận / đổi thú ================= */
export function reset() { for (const k of ['rings', 'decoys', 'saves', 'songs', 'cols', 'parts', 'streaks', 'refl', 'flashes']) S[k] = []; S.log = []; S.n = {}; }
export function bench(f) {   /* thu về: bỏ mọi trạng thái p73 của con này + vật nó sở hữu (hình nhân, điểm lưu, khúc đếm) */
  if (f.p73dec) breakDecoy(f.p73dec, 'bench'); S.saves = S.saves.filter(s => s.f !== f); S.songs = S.songs.filter(s => { if (s.f === f) { for (const q of s.list) if (q.p73cnt === s) q.p73cnt = null; return false; } return true; });
  for (const s of S.songs) s.list = s.list.filter(q => q !== f);
  for (const k of ['p73coal', 'p73wet', 'p73hold', 'p73fade', 'p73glitch', 'p73fast', 'p73flee', 'p73camp', 'p73lurk', 'p73mirror', 'p73sub', 'p73cnt', 'p73dec', 'p73mirWait']) f[k] = null;
}

/* ================= tung chiêu (skFire, SK.m === 'p73') ================= */
export function fire(f, a, foe) {
  E.skLog({ side: f.side, id: a.id, m: 'p73' }); log({ ev: 'fire', id: a.id, side: f.side });
  switch (a.id) {
    case 'vong_du_chan': return vdcFire(f, a, foe);
    case 'bay_lo_than': return coalFire(f, a, foe);
    case 'doi_dong': return swapFire(f, a);
    case 'hinh_nhan_la': return decoyFire(f, a);
    case 'hoan_tac': return saveFire(f, a);
    case 'khuc_tan_canh': return songFire(f, a);
    case 'rinh_so_ho': return lurkFire(f, a);
    case 'guong_hoi_quang': return true;   /* gương dựng ngay lúc bắt đầu (onStart) */
  }
  return false;
}
/* bắt đầu một chiêu (đầu startAct, sau rối / tê): than nổ · Rình Sơ Hở bật — trả true = huỷ chiêu (vẫn tính hồi) */
export function onCast(f, id) {
  if (!E || f.p73decoy || !E.MOVES[id] || id === 'huc') return false;
  if (f.p73coal && live(f)) { coalBoom(f, id); return true; }
  const o = E.foeReal(f);
  if (o && o.p73lurk && o.act && o.act.id === 'rinh_so_ho' && live(o) && live(f) && Math.hypot(o.x - f.x, o.y - f.y) <= 130) { lurkSpring(o, f, id); return true; }
  if (o && id !== 'guong_hoi_quang' && live(o) && E.ST.auto[o.side] && mirrorReady(o)) { const K = E.SK[id], M0 = E.MOVES[id]; if (K && (K.m === 'strip' || K.m === 'beam') && Math.hypot(o.x - f.x, o.y - f.y) < 170 && rnd() < 0.4) E.startAct(o, 'guong_hoi_quang'); else if ((K && K.m === 'proj') || (M0 && M0.shape === 'dan')) o.p73mirWait = 1.4; }   /* đạn sắp bay tới: đứng chờ dựng gương thay vì lướt né */   /* đạn bay: để phản xạ theo thời gian tới (updReflex) — dựng sớm thì gương tắt trước khi đạn tới */
  return false;
}
export function onStart(f, id) {
  if (id === 'guong_hoi_quang' && f.act && f.act.id === id) mirrorUp(f, f.act);
  if (id === 'huc' || !E.MOVES[id] || !live(f)) return;
  /* đối thủ nhìn thấy cột nước / thế rình… (phản ứng riêng ở từng chiêu) */
}

/* ---------- 1. VÒNG DƯ CHẤN (Chấn): dậm → tâm chấn nứt sao dưới chân đối thủ → 1,2 s sau vòng sóng đất nở 0 → 90 px ---------- */
function vdcFire(f, a, foe) {
  const R = { f, mv: a.mv, x: foe.x, y: foe.y + 1, t: 0, r: 0, hit: false, air: false, seen: null, aoeN: 0, seed: (Math.random() * 1e6) | 0 }; S.rings.push(R);
  quake(0.1); E.sfx('smash'); puff(f.x, f.y, 'chan', 6, 2.2, 0.5); sparks(f.x, f.y, 1, 'chan', 6, 40, 50, 0.4, 260);
  for (let i = 0; i < 7; i++) { const an = rnd() * Math.PI * 2; part({ k: 'sq', x: R.x + Math.cos(an) * 4, y: R.y + Math.sin(an) * 2, z: 1, vx: Math.cos(an) * 24, vy: Math.sin(an) * 12, vz: 50 + rnd() * 40, g: 300, bounce: 0.3, T: 0.55, s: 2, cols: P('chan').slice(2, 7) }); }
  const o = E.foeReal(f); if (live(o) && E.ST.auto[o.side] && rnd() < 0.45 + E.dodgeB(o)) o.p73flee = { x: R.x, y: R.y, r: 104, t: 1.9 };   /* AI né báo trước: chạy khỏi tâm */
  say(R.x, R.y - 14, 'TÂM CHẤN', 'EPICENTER', '#e8c48a', 0.8, 1.0);
  return true;
}
function updRings(dt) {
  for (const R of S.rings) { if (R.song) continue;
    R.t += dt; const k = (R.t - 1.2) / 0.6; if (k < 0) { if (R.t > 0.95 && !R.pre) { R.pre = 1; puff(R.x, R.y, 'chan', 3, 1.6, 0.3); } continue; }
    R.r = 90 * Math.min(1, k); if (k > 1) continue;
    if (!R.go) { R.go = 1; quake(0.16); E.sfx('smash'); flash(R.x, R.y, 2, 'chan', 6, 0.1); }
    for (let i = 0; i < 6; i++) { const an = rnd() * Math.PI * 2; part({ k: rnd() < 0.5 ? 'sq' : 'px', x: R.x + Math.cos(an) * R.r, y: R.y + Math.sin(an) * R.r * 0.55, z: 0, vx: Math.cos(an) * 30, vy: Math.sin(an) * 15, vz: 40 + rnd() * 60, g: 320, bounce: 0.25, T: 0.45, s: 2, cols: P('chan').slice(1, 6) }); }
    { const an = rnd() * Math.PI * 2; part({ k: 'disc', x: R.x + Math.cos(an) * R.r, y: R.y + Math.sin(an) * R.r * 0.55, z: 1, vz: 14, g: 10, drag: 3, r: 2.2, grow: 0.7, T: 0.4, cols: [P('chan')[1], P('chan')[2], P('chan')[3]] }); }
    const steps = [30, 60, 90]; while (R.aoeN < 3 && R.r >= steps[R.aoeN]) { R.seen = E.aoe(R.f, R.x, R.y, steps[R.aoeN], 0.55, { seen: R.seen, noObj: R.aoeN < 2 }); R.aoeN++; }
    const o = E.foeReal(R.f); if (R.hit || !o || !live(o)) continue;
    const dE = Math.hypot(o.x - R.x, (o.y - R.y) / 0.55);
    if (!R.lunge && E.ST.auto[o.side] && Math.abs(dE - R.r) < 22 && R.r < dE && E.freeFor(o) && rnd() < 0.3 + E.dodgeB(o)) { R.lunge = 1; const ux = (o.x - R.x) / (dE || 1), uy = (o.y - R.y) / (dE || 1); o.dodge = { vx: ux, vy: uy * 0.6, t: 0.26, delay: 0, slide: true }; }   /* lướt né đúng lúc vành vòng tới */
    if (Math.abs(dE - R.r) > 7) continue;
    if ((o.alt || 0) >= 6 || (E.FLY[o.sp] && !(E.grounded && E.grounded(o)))) { R.hit = true; say(o.x, o.y - 30, 'BAY NÉ ĐẤT', 'AIRBORNE', '#bfe6ff', 0.85); log({ ev: 'vdc_air', side: R.f.side }); continue; }
    if ((o.dodge && !(o.dodge.delay > 0)) || o.p73sub || (o.inv > 0)) { if (!R.dodged) { R.dodged = 1; say(o.x, o.y - 22, 'NÉ!', 'DODGED', '#d8d8e8', 0.85); log({ ev: 'vdc_dodge', side: R.f.side }); } continue; }
    R.hit = true; const ok = E.hit(R.f, o, R.mv, { _now: 1, noMiss: true, kb: 60 });
    if (ok && !o.dead) { const ux = (o.x - R.x) / (dE || 1), uy = (o.y - R.y) / (dE || 1); o.kb = { vx: ux * 200, vy: uy * 110, t: 0.2 }; E.ST.hitstop = Math.min(E.ST.hitstop, 0.05); stop(0.05); quake(0.12);
      for (let i = 0; i < 6; i++) part({ k: 'sq', x: o.x, y: o.y, z: 2, vx: ux * 40 + (rnd() - 0.5) * 40, vy: uy * 20 + (rnd() - 0.5) * 20, vz: 60 + rnd() * 60, g: 340, bounce: 0.3, T: 0.5, s: 2, cols: P('chan').slice(1, 6) }); }
    log({ ev: 'vdc_hit', side: R.f.side, ok });
  }
}
function drawCrack(g, R, cx, cy) {   /* nứt sao 10 px (lớp đất): 6 nhánh răng cưa, mọc 0,12 s; mờ dither sau khi vòng tắt */
  const C = P('chan'), k0 = Math.min(1, R.t / 0.12), fade = R.t > 1.8 ? 1 - (R.t - 1.8) / 0.6 : 1; if (fade <= 0) return; let s = R.seed;
  const rn = () => { s = (s * 16807) % 2147483647; return s / 2147483647; }, X = SX(R.x, cx), Y = SY(R.y, cy), hot = R.t > 0.95 && R.t < 1.25;
  for (let b = 0; b < 7; b++) { let a = b / 7 * Math.PI * 2 + rn() * 0.5, px = X, py = Y; const L = (17 + rn() * 10) * k0;
    for (let i = 0; i < L; i++) { a += (rn() - 0.5) * 0.5; px += Math.cos(a); py += Math.sin(a) * 0.55; const w = 1 - i / L, xx = Math.round(px), yy = Math.round(py); if (fade < bay(xx, yy)) continue;
      dot(g, xx, yy, C[7]); dot(g, xx + 1, yy, C[7]); if (w > 0.4) { dot(g, xx, yy + 1, C[6]); dot(g, xx + 1, yy + 1, C[6]); } if (w > 0.25) dot(g, xx, yy - 1, hot ? (i % 2 ? C[0] : C[1]) : C[3]);
      if (i === Math.round(L) - 1 && b % 2) for (let q = 1; q < 6 * w + 3; q++) dot(g, Math.round(xx + Math.cos(a + 1.1) * q), Math.round(yy + Math.sin(a + 1.1) * q * 0.55), C[6]); } }
  disc(g, X, Y, 3.5 * k0, C[7], fade); disc(g, X, Y, 2.2 * k0, C[5], fade); if (hot) { disc(g, X, Y, 2.4, C[1]); disc(g, X, Y, 1.2, C[0]); }
}
function drawRingBand(g, R, cx, cy) {   /* vành bụi: mép trước sáng, phía trong dither thưa dần; tắt bằng co mật độ */
  if (!R.go || R.t > 1.85) return; const k = Math.min(1, (R.t - 1.2) / 0.6), C = P('chan'), fade = 1 - Math.max(0, (R.t - 1.62) / 0.23);
  ringBand(g, R.x, R.y, R.r, 10 * (0.6 + 0.4 * (1 - k * 0.4)), cx, cy, q => (q < 0.1 ? C[0] : q < 0.22 ? C[1] : q < 0.5 ? C[3] : C[4]), q => (q < 0.22 ? 1 : 0.95 * Math.pow(1 - q, 0.7)) * fade);
  ringBand(g, R.x, R.y + 1, R.r + 1, 1, cx, cy, () => C[6], () => fade);   /* bóng đất dưới mép vòng */
}

/* ---------- 2. BẪY LÒ THAN (Nham): nắm tro than bay chậm → đối thủ ngậm than 4 s; ra chiêu thì than nổ ---------- */
function coalFire(f, a, foe) {
  const mo = E.beamMouth(f), tx = foe.x + (foe.vx || 0) * 0.3, ty = chestY(foe), d = Math.hypot(tx - mo.x, ty - mo.y) || 1, v = 170;
  E.ST.shots.push({ kind: 'p73', sk: 'coal', f, mv: a.mv, x: mo.x, y: mo.y, vx: (tx - mo.x) / d * v, vy: (ty - mo.y) / d * v, h: f.y - mo.y, gy: f.y, t: 0, life: 125 / v + 0.35, rad: 11, trail: [], ox: mo.x, oy: mo.y });
  flash(mo.x, f.y, f.y - mo.y, 'nham', 3, 0.1, f.y + 0.7); sparks(mo.x, f.y, f.y - mo.y, 'nham', 6, 40, 30, 0.3, 200, f.y + 0.7); E.sfx('knock_whoosh');
  return true;
}
function coalOn(att, def) {
  def.p73coal = { t: 4, T: 4, by: att }; if (E.ST.auto[def.side] && rnd() < 0.7) def.p73hold = 4;   /* AI 70 % nhịn chiêu */
  say(def.x, def.y - 30, 'NGẬM THAN!', 'COAL TRAP!', '#ffb052', 0.95); flash(def.x, def.y, E.standH(def) + 6, 'nham', 3, 0.12, def.y + 0.7); sparks(def.x, def.y, E.standH(def) + 4, 'nham', 7, 30, 30, 0.35, 220, def.y + 0.7);
  log({ ev: 'coal_on', side: att.side });
}
function coalBoom(f, id) {   /* than nổ ngay khung đầu chiêu: 12 % máu tối đa (cố định), huỷ chiêu (vẫn tính hồi), 30 % bỏng */
  f.p73coal = null; const mv = E.MOVES[id]; f.cds[id] = Math.max(f.cds[id] || 0, mv.cd); f.plan = null; f.queued = null;
  const hy = E.standH(f) + 2; flash(f.x, f.y, hy, 'nham', 7, 0.16, f.y + 0.8); sparks(f.x, f.y, hy, 'nham', 16, 80, 70, 0.45, 260, f.y + 0.8); puff(f.x, f.y - 1, 'nham', 4, 2.5, 0.5, f.y + 0.8);
  for (let i = 0; i < 5; i++) part({ k: 'sq', x: f.x, y: f.y, z: hy, vx: (rnd() - 0.5) * 70, vy: (rnd() - 0.5) * 30, vz: 30 + rnd() * 50, g: 300, bounce: 0.3, T: 0.6, s: 2, cols: ['#3a2620', '#2a1a16', '#ff7a2a', '#2a1a16'], ky: f.y + 0.5 });
  stop(0.067); quake(0.16); E.sfx('smash'); say(f.x, f.y - 40, 'NỔ THAN!', 'COAL BURST!', '#ff8a3a', 1.1, 1.5);
  f.act = null; f.dodge = null; f.hurtT = 0.35; f.clip = 'hurt'; f.ct = 0;
  log({ ev: 'coal_boom', side: f.side, id });
  fixedDmg(f, Math.max(1, Math.round(f.max * 0.12)), '#ff9a4a', 'bay_lo_than');
  if (!f.dead && rnd() < 0.3) E.applyStatus(f, 'bong');
}
export function shot(s, foe, dt) {   /* đạn p73 (than / đạn bị gương bật lại): trả true khi xong */
  s.t += dt; s.trail.unshift({ x: s.x, y: s.y }); if (s.trail.length > 8) s.trail.pop();
  s.x += s.vx * dt; s.y += s.vy * dt; s.gy = s.y + s.h;
  if ((s.sparkT = (s.sparkT || 0) - dt) <= 0) { s.sparkT = 0.06; part({ x: s.x, y: s.gy, z: s.h, vx: -s.vx * 0.1 + (rnd() - 0.5) * 10, vz: 10, g: 120, T: 0.3, cols: s.p73refl ? [P('quang')[0], P('quang')[2], P('quang')[4]] : [P('nham')[1], P('nham')[3], P('nham')[5]], ky: s.gy + 0.2 }); }
  if (!E.passShot(s.x, s.y + s.h)) { burstAt(s, s.x, s.y, s.gy); return true; }
  if (foe && !foe.dead && Math.hypot(foe.x - s.x, chestY(foe) - s.y) < s.rad) {
    burstAt(s, s.x, s.y, foe.y + 0.6);
    if (foe.p73decoy) { E.hit(s.f, foe, s.mv, { _now: 1 }); return true; }
    if (s.sk === 'coal') { if (!canAffect(s.f, foe)) { E.text(foe.x, foe.y - 22, E.L().miss, '#d8d8e8', 0.85); return true; }
      if (rnd() * 100 > s.mv.acc * E.ACC_STAGE(s.f.stage.acc || 0)) { E.text(foe.x, foe.y - 22, E.L().miss, '#d8d8e8', 0.95); log({ ev: 'coal_miss', side: s.f.side }); return true; }
      coalOn(s.f, foe); return true; }
    if (s.mv.pow) E.hit(s.f, foe, s.mv, { _now: 1 }); else E.applyTT(s.f, foe, s.mv); return true;
  }
  if (s.t > s.life) { burstAt(s, s.x, s.y, s.gy); return true; }
  return false;
}
function burstAt(s, x, y, ky) { const he = s.p73refl ? 'quang' : s.sk === 'coal' ? 'nham' : (s.mv && s.mv.type) || 'quang'; const z = Math.max(0, (s.gy || y) - y); flash(x, s.gy || y, z, he, 3.5, 0.12, ky); sparks(x, s.gy || y, z, he, 6, 50, 30, 0.3, 220, ky); }
function drawCoalIcon(g, f, cx, cy) {   /* cục than 5×5 tĩnh trên đầu + vạch 4 s */
  const c = f.p73coal; if (!c || f.dead) return; const x = Math.round(f.x - cx) - 13, y = Math.round(E.headY(f) - cy) - 8;   /* bên trái mũi tên phe */
  const M = ['01110', '12321', '13431', '12321', '01110'], col = ['', '#2a1a16', '#5a2a18', '#e8481f', '#ffb52e'];
  g.fillStyle = '#140e1a'; g.fillRect(x - 1, y - 1, 7, 7);
  for (let r = 0; r < 5; r++) for (let q = 0; q < 5; q++) { const v = +M[r][q]; if (v) { g.fillStyle = col[v]; g.fillRect(x + q, y + r, 1, 1); } }
  const w = Math.max(0, Math.round(9 * c.t / c.T)); g.fillStyle = '#140e1a'; g.fillRect(x - 3, y + 7, 11, 3); g.fillStyle = '#fc7e27'; g.fillRect(x - 2, y + 8, w, 1);
}

/* ---------- 3. ĐỔI DÒNG (Triều): cột nước dưới chân 2 thú (0,35 s báo) → chìm 0,15 s → trồi ở chỗ của nhau; đối thủ ƯỚT 3 s ---------- */
function lineClear(x0, y0, x1, y1) { const L = Math.hypot(x1 - x0, y1 - y0), n = Math.ceil(L / 6); for (let i = 1; i < n; i++) { const x = x0 + (x1 - x0) * i / n, y = y0 + (y1 - y0) * i / n; if (!E.walkable(x, y) && !E.isWater(x, y)) return false; } return true; }
function swapFire(f, a) {
  const o = E.foeReal(f);
  const fail = (vi0, en, why) => { say(f.x, f.y - 30, vi0, en, '#9fd0ff', 0.9); log({ ev: 'swap_fail', side: f.side, why }); return true; };
  if (!live(o) || o.p73decoy) return fail('TRƯỢT', 'MISS', 'nofoe');
  const d = Math.hypot(o.x - f.x, o.y - f.y); if (d > 160) return fail('XA QUÁ', 'TOO FAR', 'far');
  if (!E.FLY[f.sp] && !E.FLY[o.sp] && !lineClear(f.x, f.y, o.x, o.y)) return fail('BỊ CHẮN', 'BLOCKED', 'line');
  const A = { x: f.x, y: f.y }, B = { x: o.x, y: o.y };
  if (!okAt(f, B.x, B.y) || !okAt(o, A.x, A.y)) return fail('KHÔNG ĐỔI ĐƯỢC', 'CAN\'T SWAP', 'tile');
  const W = { f, o, A, B, t: 0, ph: 'col', mv: a.mv, hit: false, a }; S.cols.push({ x: A.x, y: A.y, W, who: f }, { x: B.x, y: B.y, W, who: o });
  if (E.ST.auto[o.side] && E.freeFor(o) && rnd() < 0.3 + E.dodgeB(o)) { const dx = o.x - f.x, dy = o.y - f.y, dd = Math.hypot(dx, dy) || 1, s = rnd() < 0.5 ? 1 : -1; o.dodge = { vx: -dy / dd * s, vy: dx / dd * s, t: 0.32, delay: 0.1 + rnd() * 0.1 }; }   /* thấy cột nước → lướt né */
  E.sfx('knock_whoosh'); puff(A.x, A.y, 'trieu', 3, 1.6, 0.35); puff(B.x, B.y, 'trieu', 3, 1.6, 0.35);
  a.sigU = dt => swapStep(W, dt, a);
  log({ ev: 'swap_start', side: f.side });
  return true;
}
function swapStep(W, dt, a) {
  const f = W.f, o = W.o; W.t += dt; f.ct = Math.min(f.ct, E.impactT(a.clip)); if (!live(f)) return endSwap(W);
  if (W.ph === 'col') { if (live(o)) { W.B = { x: o.x, y: o.y }; for (const c of S.cols) if (c.W === W && c.who === o) { c.x = o.x; c.y = o.y; } if (o.dodge && !(o.dodge.delay > 0)) W.dodged = true; }   /* cột nước bám chân đối thủ tới lúc đổi — chỉ lướt né mới thoát */
    if (W.t < 0.35) return true;
    if (!live(o) || W.dodged || o.inv > 0 || o.hide || (o.dig && o.dig.ph === 'under')) { say(W.B.x, W.B.y - 22, 'NÉ!', 'DODGED', '#d8d8e8', 0.85); log({ ev: 'swap_miss', side: f.side }); return endSwap(W); }
    if (!okAt(f, o.x, o.y) || !okAt(o, f.x, f.y)) { say(f.x, f.y - 30, 'KHÔNG ĐỔI ĐƯỢC', 'CAN\'T SWAP', '#9fd0ff', 0.9); log({ ev: 'swap_fail', side: f.side, why: 'tile2' }); return endSwap(W); }
    W.A = { x: f.x, y: f.y }; W.B = { x: o.x, y: o.y }; W.ph = 'sink'; o.pin = 0.36; o.kb = null; o.dodge = null; if (!(o.act && o.act.ult)) { o.act = null; } E.sfx('knock_whoosh'); return true; }
  const k = W.t - 0.35;
  if (W.ph === 'sink') { f.p73sub = Math.min(1, k / 0.15); o.p73sub = f.p73sub; o.pin = Math.max(o.pin || 0, 0.2); if (k < 0.15) return true;
    f.x = W.B.x; f.y = W.B.y; o.x = W.A.x; o.y = W.A.y; f.kb = null; o.kb = null; f.dodge = null; o.dodge = null; E.clampField(f); E.clampField(o); E.face(f, o.x, o.y); E.face(o, f.x, f.y);
    f.flash = 0.05; o.flash = 0.05; flash(W.A.x, W.A.y, 8, 'trieu', 5, 0.12); flash(W.B.x, W.B.y, 8, 'trieu', 5, 0.12); quake(0.1);
    for (const [p0, p1] of [[W.A, W.B], [W.B, W.A]]) S.streaks.push({ k: 'arc', x0: p0.x, y0: p0.y, x1: p1.x, y1: p1.y, t: 0, T: 0.22, he: 'trieu' });
    W.ph = 'rise'; log({ ev: 'swap', side: f.side, A: [Math.round(W.A.x), Math.round(W.A.y)], B: [Math.round(W.B.x), Math.round(W.B.y)] }); return true; }
  if (W.ph === 'rise') { const r = 1 - Math.min(1, (k - 0.15) / 0.15); f.p73sub = r; o.p73sub = r;
    if (!W.hit && k >= 0.22) { W.hit = true; if (live(o)) { o.pin = 0; const ok = E.hit(f, o, W.mv, { _now: 1, noMiss: true, kb: 0 }); if (ok && !o.dead) { o.kb = null; o.p73wet = 3; say(o.x, o.y - 40, 'ƯỚT!', 'SOAKED!', '#7fc8ff', 0.95); } for (let i = 0; i < 10; i++) part({ x: o.x, y: o.y, z: 6, vx: (rnd() - 0.5) * 80, vy: (rnd() - 0.5) * 40, vz: 50 + rnd() * 50, g: 300, T: 0.45, cols: P('trieu').slice(0, 5) }); } }
    if (k < 0.3) return true; return endSwap(W); }
  return endSwap(W);
}
function endSwap(W) { W.f.p73sub = 0; if (W.o) { W.o.p73sub = 0; if (W.o.pin > 0 && !W.hit) W.o.pin = 0; } W.done = true; if (W.ph !== 'rise') for (let i = 0; i < 6; i++) for (const p of [W.A, W.B]) part({ x: p.x, y: p.y, z: 8, vx: (rnd() - 0.5) * 50, vy: (rnd() - 0.5) * 20, vz: 30 + rnd() * 30, g: 300, T: 0.35, cols: P('trieu').slice(0, 5) }); return false; }
function drawColumn(g, c, cx, cy) {   /* cột nước: dải dither 8 bậc xanh (mỏng lúc báo → dày che thân lúc chìm), bọt trên đỉnh; sập khi xong */
  const W = c.W, t = W.t, C = P('trieu'), H0 = Math.max(14, E.standH(c.who) + 8);
  let w, h, dens; if (t < 0.35) { const k = t / 0.35; w = 3 + 2 * k; h = 6 + 10 * k; dens = 0.5; } else { const k = Math.min(1, (t - 0.35) / 0.1); w = 5 + 4 * k; h = 16 + (H0 - 16) * k; dens = 0.95; }
  if (W.done) { const k = (c.ct || 0) / 0.2; if (k >= 1) return; h *= 1 - k; dens *= 1 - k * 0.5; }
  const X = SX(c.x, cx), Y = SY(c.y, cy), HW = Math.round(w * 2), HH = Math.round(h * 2);
  for (let yy = 0; yy < HH; yy++) { const wob = Math.round(Math.sin((yy + t * 60) * 0.35) * 1.2);
    for (let xx = -HW; xx <= HW; xx++) { const e = Math.abs(xx) / HW; if (e > 0.3 && dens < bay(X + xx, Y - yy)) continue;
      dot(g, X + xx + wob, Y - yy, e > 0.85 ? C[6] : e > 0.6 ? C[4] : yy > HH - 3 ? C[0] : ((yy + wob + 7) % 7 < 2 ? C[1] : C[2])); } }
  disc(g, X, Y - HH, w * 0.9 + 1, C[2], 0.9); disc(g, X - 1, Y - HH - 1, w * 0.6, C[0], 0.85);
}

/* ---------- 4. HÌNH NHÂN LÁ (Mộc): trả 20 % máu → hình nhân (sprite của chính thú phủ màu lá) hút đòn 5 s ---------- */
function decoyFire(f, a) {
  if (f.hp <= f.max * 0.24) { say(f.x, f.y - 30, 'KHÔNG ĐỦ SỨC', 'TOO WEAK', '#a3de5f', 0.85); log({ ev: 'decoy_fail', side: f.side }); return true; }
  if (f.p73dec) breakDecoy(f.p73dec, 'renew');
  const cost = Math.round(f.max * 0.2); f.hp = Math.max(1, f.hp - cost); E.text(f.x, f.y - 26, '-' + cost, '#a3de5f', 0.95);
  const d = { p73decoy: true, owner: f, side: f.side, sp: f.sp, lv: f.lv, st: f.st, types: f.types, tier: f.tier, x: f.x, y: f.y, fx: f.fx, fy: f.fy, hp: Math.round(f.max * 0.24), max: Math.round(f.max * 0.24),
    stage: { atk: 0, def: 0, spa: 0, spd: 0, spe: 0, acc: 0 }, cds: {}, alt: 0, vx: 0, vy: 0, clip: 'idle', ct: 0, dead: false, absent: false, inv: 0, act: null, status: null, kb: null, dodge: null, hurtT: 0, pin: 0, t: 0, T: 5, seeT: 1.5, seenBy: null, flash: 0 };
  f.p73dec = d; S.decoys.push(d);
  for (let i = 0; i < 12; i++) { const an = i / 12 * Math.PI * 2; part({ k: 'leaf', x: d.x + Math.cos(an) * 8, y: d.y + Math.sin(an) * 3, z: 4 + rnd() * 10, vx: -Math.sin(an) * 50, vy: Math.cos(an) * 18, vz: 10 + rnd() * 20, g: 30, drag: 2.5, spin: 9, T: 0.5, cols: P('moc').slice(0, 5), ky: d.y + 0.6 }); }
  /* chủ lùi 40 px (xa đối thủ), mờ ẩn 0,5 s */
  const o = E.foeReal(f), dx = f.x - (o ? o.x : f.x - 1), dy = f.y - (o ? o.y : f.y), dd = Math.hypot(dx, dy) || 1; let moved = 0;
  for (let i = 0; i < 8; i++) { const sx = f.x, sy = f.y; E.moveBy(f, dx / dd * 5, dy / dd * 5); E.clampField(f); moved += Math.hypot(f.x - sx, f.y - sy); }
  if (moved < 20) for (let i = 0; i < 8; i++) { E.moveBy(f, -dy / dd * 5, dx / dd * 5); E.clampField(f); }
  f.p73fade = 0.5; f.inv = Math.max(f.inv || 0, 0.5); E.sfx('knock_whoosh');
  log({ ev: 'decoy', side: f.side });
  return true;
}
export function decoyFor(att, o) {   /* foeOf(att) khi o đang có hình nhân: AI đối thủ nhắm hình nhân (trừ khi đã nhìn thấu) */
  const d = o.p73dec; if (!d || d.dead || d.seenBy === att || !live(o) || att.side === o.side) return null; return d;
}
export function decoyHit(att, d, mv, o) {
  if (d.dead) return false;
  if (!mv.pow) { E.text(d.x, d.y - 22, E.L().miss, '#d8d8e8', 0.85); return false; }
  const r = E.calcDamage(att.lv, mv, E.statsFor(att), { ...E.statsFor(d.owner), types: d.types }, { weather: E.ST.weather }), dmg = Math.max(1, Math.round(r.dmg * (o.mul || 1)));
  d.hp -= dmg; d.flash = 0.05; E.text(d.x, d.y - 26, String(dmg), '#c8f0a0', 1.0); stop(E.HS.hit); E.sfx('hit'); E.ST.stats.hits = (E.ST.stats.hits || 0) + 1;
  for (let i = 0; i < 4; i++) part({ k: 'leaf', x: d.x, y: d.y, z: 8, vx: (rnd() - 0.5) * 60, vy: (rnd() - 0.5) * 20, vz: 20 + rnd() * 30, g: 90, drag: 2, spin: 8, T: 0.5, cols: P('moc').slice(1, 6) });
  const own = d.owner; if ((mv.shape === 'quanh' || mv.shape === 'vung' || mv.ult) && live(own) && Math.hypot(own.x - d.x, own.y - d.y) <= 44) E.hit(att, own, mv, { ...o, _now: 1 });   /* chiêu vùng rộng vẫn trúng chủ nếu chủ đứng trong vùng */
  log({ ev: 'decoy_hit', side: d.side, mv: mv.id, dmg });
  if (d.hp <= 0) breakDecoy(d, 'hp');
  return true;
}
function breakDecoy(d, why) {
  if (d.dead) return; d.dead = true; if (d.owner && d.owner.p73dec === d) d.owner.p73dec = null;
  for (let i = 0; i < 16; i++) { const an = rnd() * Math.PI * 2, v = 30 + rnd() * 60; part({ k: 'leaf', x: d.x, y: d.y, z: 6 + rnd() * 10, vx: Math.cos(an) * v, vy: Math.sin(an) * v * 0.5, vz: 30 + rnd() * 50, g: 110, drag: 1.5, spin: (rnd() - 0.5) * 20, T: 0.8, cols: P('moc').slice(0, 6), ky: d.y + 0.5 }); }
  if (why === 'hp') { stop(0.05); quake(0.08); say(d.x, d.y - 36, 'HÌNH NHÂN VỠ!', 'EFFIGY BROKEN!', '#a3de5f', 0.95); }
  log({ ev: 'decoy_end', side: d.side, why });
}
function updDecoys(dt) {
  for (const d of S.decoys) { if (d.dead) continue; d.t += dt; d.ct += dt; d.flash = Math.max(0, d.flash - dt); const own = d.owner;
    if (!live(own) || d.t >= d.T || E.ST.ph !== 'fight') { breakDecoy(d, 'time'); continue; }
    const en = E.ST.F[1 - d.side];
    if ((d.seeT -= dt) <= 0) { d.seeT = 1.5; if (en && live(en) && d.seenBy !== en && rnd() < 0.25) { d.seenBy = en; say(en.x, en.y - 34, 'NHÌN THẤU!', 'SEEN THROUGH!', '#ffe9a3', 0.9); log({ ev: 'decoy_see', side: d.side }); en.plan = null; } } }
  S.decoys = S.decoys.filter(d => !d.dead);
}
function drawDecoy(g, d, cx, cy) {   /* sprite có sẵn của chủ, phủ màu lá (colorOf), đứng yên khung idle */
  const SP = E.SPR(), S0 = SP && SP[d.sp]; if (!S0) return; const c = S0.idle, im = E.img(c.file); if (!im) return;
  const fr = Math.floor(d.ct * (c.fps || 8)) % c.n, { r, flip } = E.rowOf(c, d), sw = c.cw, sh = c.ch, w = sw / 2, h = sh / 2, ax = c.ax / 2, ay = c.ay / 2, x = Math.round(d.x - cx), y = Math.round(d.y - cy);
  const src = d.flash > 0 ? E.whiteOf(im) : E.colorOf(im, '#4f9a3c');
  if (flip) { g.save(); g.translate(x, y); g.scale(-1, 1); g.drawImage(src, fr * sw, r * sh, sw, sh, -ax, -ay, w, h); g.restore(); } else g.drawImage(src, fr * sw, r * sh, sw, sh, x - ax, y - ay, w, h);
  const k = d.hp / d.max, X = x - 6, Y = y + 3; g.fillStyle = '#140e1a'; g.fillRect(X - 1, Y - 1, 14, 3); g.fillStyle = '#72cb4e'; g.fillRect(X, Y, Math.max(0, Math.round(12 * k)), 1);   /* vạch máu hình nhân (tĩnh) */
}

/* ---------- 5. HOÀN TÁC (Mã): lưu điểm (chỗ + máu); 3 s sau giật lỗi rồi về đúng điểm, hồi 60 % máu đã mất (trần 25 %) ---------- */
function saveFire(f, a) {
  S.saves = S.saves.filter(s => s.f !== f);
  const sv = { f, x: f.x, y: f.y, fx: f.fx, fy: f.fy, hp: f.hp, st: f.status ? f.status.id : null, t: 0, T: 3, wait: 0, done: false };
  S.saves.push(sv); for (let i = 0; i < 10; i++) part({ k: 'sq', x: f.x + (rnd() - 0.5) * 14, y: f.y, z: rnd() * 18, vz: 20 + rnd() * 20, T: 0.45, s: 2, cols: P('ma').slice(0, 5), ky: f.y + 0.6 });
  flash(f.x, f.y, 10, 'ma', 4, 0.1, f.y + 0.6); E.sfx('knock_whoosh'); say(f.x, f.y - 34, 'LƯU ĐIỂM', 'SAVE POINT', '#86ffc8', 0.9);
  const o = E.foeReal(f); if (live(o) && E.ST.auto[o.side] && rnd() < 0.4) o.p73camp = { x: sv.x, y: sv.y, t: 3.4, f };   /* AI đối thủ 40 % chạy tới điểm lưu chờ */
  log({ ev: 'save', side: f.side, hp: Math.round(f.hp) });
  return true;
}
function updSaves(dt) {
  for (const s of S.saves) { if (s.done) continue; const f = s.f; s.t += dt;
    if (!live(f) || E.ST.ph !== 'fight') { s.done = true; log({ ev: 'rewind_cancel', side: f.side, why: f.dead ? 'dead' : E.ST.ph !== 'fight' ? 'ph' : 'out' }); continue; }
    if (s.t < s.T - 0.15) continue;
    if ((f.act && f.act.id !== 'huc') || f.dig || (E.ST.clash && (E.ST.clash.a === f || E.ST.clash.b === f)) || f.p73sub > 0) {   /* đang ra chiêu / đào / đối chưởng: chờ xong mới tua (không cắt ngang chiêu của chính mình) */ s.wait += dt; if (s.wait < 3.5) continue; s.done = true; log({ ev: 'rewind_cancel', side: f.side, why: 'busy' }); continue; }
    if (!s.gl) { s.gl = 1; s.glT = 0.15; f.p73glitch = 0.15; continue; }   /* giật lỗi 3 lát 0,15 s rồi mới về điểm lưu */
    if ((s.glT -= dt) > 0) continue;
    rewind(s);
  }
  S.saves = S.saves.filter(s => !s.done || s.fadeT > 0);
  for (const s of S.saves) if (s.done && s.fadeT > 0) s.fadeT -= dt;
}
function rewind(s) {
  const f = s.f, x0 = f.x, y0 = f.y; s.done = true; s.fadeT = 0;
  if (f.act && f.act.id === 'huc') f.act = null; f.kb = null; f.dodge = null; f.pin = 0; f.toss = 0; f.tossT = 0; f.hide = null; f.hyp = null; f.dig = null; f.jump = null; f.relocate = null; f.plan = null;
  let q = { x: s.x, y: s.y }; if (!okAt(f, q.x, q.y)) q = E.nearWalk(q.x, q.y); f.x = q.x; f.y = q.y; E.clampField(f); f.fx = s.fx; f.fy = s.fy;
  const lost = Math.max(0, s.hp - f.hp), heal = Math.min(Math.round(lost * 0.6), Math.round(f.max * 0.25));
  if (heal > 0) { f.hp = Math.min(f.max, f.hp + heal); E.text(f.x, f.y - 26, (vi() ? 'HOÀN TÁC +' : 'UNDO +') + heal, '#86ffc8', 1.05, 1.5); } else say(f.x, f.y - 26, 'HOÀN TÁC', 'UNDO', '#86ffc8', 0.95);
  let cured = false; if (f.status && f.status.id !== s.st) { f.status = null; cured = true; }
  f.hurtT = 0.4; f.clip = 'idle'; f.ct = 0; f.flash = 0.034; f.p73glitch = 0;
  const L = Math.hypot(x0 - f.x, y0 - f.y), n = Math.max(6, Math.min(18, Math.round(L / 6)));
  for (let i = 0; i < n; i++) { const k = i / n; part({ k: 'sq', x: x0 + (f.x - x0) * k, y: y0 + (f.y - y0) * k, z: 4 + rnd() * 12, vx: (f.x - x0) * 2.2, vy: (f.y - y0) * 2.2, drag: 6, T: 0.18 + k * 0.12, s: 2, cols: [P('ma')[0], P('ma')[2], P('ma')[4]], ky: Math.max(y0, f.y) + 0.6 }); }
  flash(f.x, f.y, 10, 'ma', 6, 0.08, f.y + 0.7);
  log({ ev: 'rewind', side: f.side, heal, cured, from: [Math.round(x0), Math.round(y0)], to: [Math.round(f.x), Math.round(f.y)] });
}
function drawGhost(g, s, cx, cy) {   /* bóng tĩnh mờ màu mã tại điểm lưu + nhãn 00:03 */
  const SP = E.SPR(), S0 = SP && SP[s.f.sp]; if (!S0 || s.done) return; const c = S0.idle, im = E.img(c.file); if (!im) return;
  const { r, flip } = E.rowOf(c, s), sw = c.cw, sh = c.ch, w = sw / 2, h = sh / 2, ax = c.ax / 2, ay = c.ay / 2, x = Math.round(s.x - cx), y = Math.round(s.y - cy), src = E.colorOf(im, '#86ffc8');
  g.save(); g.globalAlpha = 0.68; if (flip) { g.translate(x, y); g.scale(-1, 1); g.drawImage(src, 0, r * sh, sw, sh, -ax, -ay, w, h); } else g.drawImage(src, 0, r * sh, sw, sh, x - ax, y - ay, w, h); g.restore();
  digits(g, '00:0' + Math.max(1, Math.ceil(s.T - s.t)), s.x, s.y - E.standH(s.f) - 4, '#86ffc8', cx, cy);
}

/* ---------- 6. KHÚC TÀN CANH (Âm): gáy → mọi thú trong 110 px (kể cả mình) nhận số đếm 3; hết đếm ai còn trong 110 px quanh Dế mất máu cố định ---------- */
function songFire(f, a) {
  const o = E.foeReal(f), list = [f]; if (live(o) && Math.hypot(o.x - f.x, o.y - f.y) <= 110) list.push(o);
  const sg = { f, list, t: 0, T: 4.5, beats: 0, flee: live(o) && E.ST.auto[o.side] && rnd() < 0.65, done: false }; S.songs = S.songs.filter(s => s.f !== f); S.songs.push(sg);
  for (const q of list) q.p73cnt = sg; f.p73fast = 4.5;
  E.sfx('roar'); beat(sg);
  log({ ev: 'song', side: f.side, n: list.length });
  return true;
}
function beat(sg) { const f = sg.f; S.rings.push({ song: 1, f, x: f.x, y: f.y + 1, t: 0, T: 0.4, r: 0 }); flash(E.beamMouth(f).x, f.y, Math.max(4, f.y - E.beamMouth(f).y), 'am', 3, 0.1, f.y + 0.6); sg.beats++; }
function updSongs(dt) {
  for (const sg of S.songs) { if (sg.done) continue; const f = sg.f; sg.t += dt;
    if (!live(f) || E.ST.ph !== 'fight') { sg.done = true; for (const q of sg.list) if (q.p73cnt === sg) q.p73cnt = null; f.p73fast = 0; log({ ev: 'song_cancel', side: f.side }); continue; }
    if (sg.beats < 3 && sg.t >= sg.beats * 1.5) beat(sg);
    if (sg.t < sg.T) continue;
    sg.done = true; f.p73fast = 0; let any = false;
    for (const q of sg.list) { if (q.p73cnt === sg) q.p73cnt = null; if (!live(q)) continue; const d = Math.hypot(q.x - f.x, q.y - f.y);
      if (d > 110) { say(q.x, q.y - 30, 'THOÁT!', 'ESCAPED!', '#d8d8e8', 0.9); log({ ev: 'song_escape', side: f.side, who: q === f ? 'self' : 'foe', d: Math.round(d) }); continue; }
      any = true; S.streaks.push({ k: 'implode', x: q.x, y: q.y, f: q, t: 0, T: 0.22, he: 'am' }); flash(q.x, q.y, E.standH(q) * 0.5, 'am', 6, 0.14, q.y + 0.7);
      const dmg = Math.max(1, Math.round(q.max * (q === f ? 0.18 : 0.28))); fixedDmg(q, dmg, '#d8b0ff', 'khuc_tan_canh'); log({ ev: 'song_hit', side: f.side, who: q === f ? 'self' : 'foe', dmg }); }
    if (any) { stop(0.067); quake(0.2); E.sfx('smash'); }
  }
  S.songs = S.songs.filter(s => !s.done);
}
function songDigits(g, q, cx, cy) { const sg = q.p73cnt; if (!sg || q.dead) return; const n = Math.max(1, 3 - Math.floor(sg.t / 1.5)); digits(g, String(n), q.x + 9, E.headY(q) - 3, n === 1 ? '#ffb0d0' : '#e8d8ff', cx, cy); }   /* cạnh mũi tên phe (không đè) */

/* ---------- 7. RÌNH SƠ HỞ (Ảnh): thế rình 1 s (chìm nửa vào bóng); đối thủ ≤ 130 px bắt đầu chiêu → hiện sau lưng cắn, huỷ chiêu ---------- */
function lurkFire(f, a) {
  f.p73lurk = { t: 0, T: 1.0 }; const o = E.foeReal(f);
  if (live(o) && E.ST.auto[o.side] && Math.hypot(o.x - f.x, o.y - f.y) <= 140 && rnd() < 0.5) o.p73hold = 1.0;   /* AI thấy thế rình: 50 % nhịn chiêu */
  puff(f.x, f.y, 'anh', 4, 2, 0.4); say(f.x, f.y - 30, 'RÌNH...', 'LURKING...', '#b38bff', 0.85);
  a.sigU = dt => { const L = f.p73lurk; if (!L) return false; L.t += dt; f.ct = Math.min(f.ct, E.impactT(a.clip)); if (L.t < L.T) return true;
    f.p73lurk = null; f.hurtT = 0.3; f.clip = 'idle'; f.ct = 0; say(f.x, f.y - 26, 'HỤT', 'WHIFF', '#d8d8e8', 0.85); log({ ev: 'lurk_miss', side: f.side }); return false; };
  log({ ev: 'lurk', side: f.side }); return true;
}
function lurkSpring(o, f, id) {   /* o: Cu Li đang rình · f: đối thủ vừa bắt đầu chiêu id */
  const mv = E.MOVES[id]; f.cds[id] = Math.max(f.cds[id] || 0, mv.cd); f.plan = null; f.queued = null;
  const bx = f.x - (Math.abs(f.fx) > 0.2 ? Math.sign(f.fx) : (o.x >= f.x ? -1 : 1) * -1) * 18, by = f.y - (f.fy || 0) * 6;
  let q = { x: bx, y: by }; if (!okAt(o, q.x, q.y)) q = E.nearWalk(q.x, q.y); const x0 = o.x, y0 = o.y;
  o.p73lurk = null; o.x = q.x; o.y = q.y; E.clampField(o); E.face(o, f.x, f.y); o.kb = null; o.dodge = null;
  S.streaks.push({ k: 'tear', x0, y0, x1: o.x, y1: o.y, t: 0, T: 0.07, he: 'anh' });
  const bite = E.MOVES.rinh_so_ho; o.act = { id: 'rinh_so_ho', mv: bite, clip: o.act ? o.act.clip : 'atk', t: E.impactT(o.act ? o.act.clip : 'atk'), fired: true, ult: false, mark: null, dash: null };
  f.act = null; f.dodge = null;
  const ok = E.hit(o, f, bite, { _now: 1, kb: 110 }); stop(0.067);
  S.streaks.push({ k: 'bite', x: f.x, y: f.y, z: E.standH(f) * 0.5, t: 0, T: 0.3, he: 'anh' }); sparks(f.x, f.y, E.standH(f) * 0.5, 'anh', 9, 60, 30, 0.35, 200, f.y + 0.7);
  say(f.x, f.y - 42, 'BỊ RÌNH!', 'AMBUSHED!', '#d27cff', 1.05, 1.5); log({ ev: 'lurk_hit', side: o.side, ok, cancel: id });
}

/* ---------- 8. GƯƠNG HỒI QUANG (Quang): gương 0,8 s trước mặt (cung 120°) bật đạn về người bắn; tia / sóng đất chặn còn ×0,5 ---------- */
function mirrorReady(f) { const L = E.MV78(f); return !!(L && L.includes('guong_hoi_quang') && (f.cds.guong_hoi_quang || 0) <= 0 && E.freeFor(f)); }
function mirrorUp(f, a) {
  const o = E.foeReal(f), dx = (o ? o.x : f.x + f.fx) - f.x, dy = (o ? o.y : f.y + f.fy) - f.y, d = Math.hypot(dx, dy) || 1;
  f.p73mirror = { t: 0, T: 0.8, dx: dx / d, dy: dy / d, n: 0 }; E.face(f, f.x + dx, f.y + dy); a.fired = true; a.p73 = 1;
  a.sigU = dt => { const m = f.p73mirror; if (!m) return false; m.t += dt; f.ct = Math.min(f.ct, E.impactT(a.clip)); if (m.t < 1.2) return true; f.p73mirror = null; return false; };
  flash(f.x + dx / d * 8, f.y, 8, 'quang', 4, 0.1, f.y + 0.6); E.sfx('knock_whoosh'); log({ ev: 'mirror', side: f.side });
}
const REFL_KINDS = { proj: 1, proj2: 1, ball: 1, p73: 1 };
function mirrorCenter(f, m) { return { x: f.x + m.dx * 9, y: f.y - Math.max(6, E.standH(f) * 0.45) - (f.alt || 0) + m.dy * 4 }; }
function updMirrors(dt) {
  for (const f of E.ST.F) { const m = f && f.p73mirror; if (!m || m.t >= m.T || !live(f)) continue; const c = mirrorCenter(f, m);
    for (const s of E.ST.shots) { if (!REFL_KINDS[s.kind] || s.f.side === f.side || s.done) continue; const rx = s.x - f.x, ry = s.y - (f.y - E.standH(f) * 0.45);
      if (Math.hypot(s.x - c.x, s.y - c.y) > 18 || rx * m.dx + ry * m.dy < -2) continue; reflect(f, s, m); } }
}
function reflect(f, s, m) {
  const shooter0 = s.f, shooter = live(shooter0) ? shooter0 : E.foeReal(f);
  if (s.hide && s.sk) { const sc = E.DFX.find(shooter0, s.sk); if (sc) { sc.dead = true; sc.q.length = 0; } }
  s.f = f; s.p73refl = 1; s.hide = 1; s.dodgeChk = false;
  if (s.kind === 'proj' || s.kind === 'ball') { s.kind = 'p73'; s.sk = 'refl'; s.rad = 12; s.h = s.h ?? 6; s.trail = []; }
  if (!s.trail) s.trail = [];
  const tx = shooter ? shooter.x : s.x - s.vx, ty = shooter ? chestY(shooter) : s.y, v = Math.max(150, Math.hypot(s.vx || 0, s.vy || 0)), d = Math.hypot(tx - s.x, ty - s.y) || 1;
  s.vx = (tx - s.x) / d * v; s.vy = (ty - s.y) / d * v; s.t = 0; s.life = d / v + 0.5; m.n++;
  flash(s.x, f.y, f.y - s.y, 'quang', 5, 0.08, f.y + 0.8, true); sparks(s.x, f.y, f.y - s.y, 'quang', 8, 70, 30, 0.3, 200, f.y + 0.8); stop(0.04); quake(0.06);
  say(s.x, s.y - 12, 'BẬT LẠI!', 'REFLECTED!', '#ffe27a', 0.95);
  if (shooter && live(shooter) && rnd() < 0.3) { shooter.stage.acc = Math.max(-6, (shooter.stage.acc || 0) - 1); say(shooter.x, shooter.y - 34, 'LOÁ MẮT', 'DAZZLED', '#ffe9a3', 0.85); }
  S.refl.push({ s, shooter }); log({ ev: 'refl', side: f.side, kind: s.kind, sk: s.sk || null, mv: s.mv && s.mv.id });
}
export function dmgMul(att, def, mv) {   /* gương chặn tia / sóng mặt đất ×0,5 (không bật lại) — chỉ khi kẻ đánh ở phía trước gương */
  const m = def && def.p73mirror; if (!m || m.t >= m.T || att === def || !mv) return 1; const K = E.SK[mv.id];
  const beamy = mv.shape === 'tia' || (K && (K.m === 'strip' || K.m === 'beam')); if (!beamy) return 1;
  if ((att.x - def.x) * m.dx + (att.y - def.y) * m.dy <= 0) return 1;
  const c = mirrorCenter(def, m); flash(c.x, def.y, def.y - c.y, 'quang', 4, 0.1, def.y + 0.8, true); say(def.x, def.y - 40, 'CHẶN ½', 'BLOCKED ½', '#ffe27a', 0.85); log({ ev: 'block', side: def.side, mv: mv.id });
  return 0.5;
}
function drawMirror(g, f, cx, cy) {   /* mặt lăng kính 2×20 px vuông góc hướng nhìn, 8 bậc vàng-trắng, vệt loé quét theo thời gian (chỉ 0,8 s) */
  const m = f.p73mirror; if (!m || m.t >= m.T) return; const C = P('quang'), c = mirrorCenter(f, m), k = m.t / m.T, grow = Math.min(1, m.t / 0.08), shrink = k > 0.85 ? 1 - (k - 0.85) / 0.15 : 1;
  const px = -m.dy, py = m.dx * 0.6, L = 20 * grow * shrink, sweep = (m.t * 3) % 1;
  for (let i = -L; i <= L; i += 0.5) { const u = i / (L || 1), X = Math.round((c.x + px * i / 2 - cx) * 2), Y = Math.round((c.y + py * i / 2 - cy) * 2), lit = Math.abs(u - (sweep * 2 - 1)) < 0.18;
    const col = lit ? C[0] : Math.abs(u) > 0.85 ? C[4] : C[2]; dot(g, X, Y, col); dot(g, X + Math.round(m.dx * 2), Y + Math.round(m.dy), Math.abs(u) > 0.85 ? C[5] : C[3]); if (Math.abs(u) < 0.6) dot(g, X - Math.round(m.dx), Y, C[1]); }
}

/* ================= mỗi khung ================= */
export function tick(f, dt) {   /* đầu updFighter: hẹn giờ riêng từng thú */
  if (f.p73coal && (f.p73coal.t -= dt) <= 0) { f.p73coal = null; puff(f.x, f.y - E.standH(f), 'nham', 2, 1.5, 0.4); }
  for (const k of ['p73wet', 'p73hold', 'p73fade', 'p73glitch', 'p73fast']) if (f[k] > 0) f[k] = Math.max(0, f[k] - dt);
  if (f.p73mirWait > 0) { f.p73mirWait -= dt; if (f.dodge && (f.cds.guong_hoi_quang || 0) <= 0 && !f.act) f.dodge = null; }
  if (f.p73flee && (f.p73flee.t -= dt) <= 0) f.p73flee = null;
  if (f.p73camp && (f.p73camp.t -= dt) <= 0) f.p73camp = null;
  if (f.p73lurk && !(f.act && f.act.id === 'rinh_so_ho')) f.p73lurk = null;
  if (f.p73mirror && !(f.act && f.act.id === 'guong_hoi_quang')) f.p73mirror = null;
  if (f.p73wet > 0 && (f.wetT = (f.wetT || 0) - dt) <= 0) { f.wetT = 0.45; part({ x: f.x + (rnd() - 0.5) * 8, y: f.y, z: E.standH(f) * 0.6, vz: -10, g: 200, T: 0.35, cols: [P('trieu')[1], P('trieu')[3]], ky: f.y + 0.4 }); }   /* giọt nước rơi (theo sự kiện ƯỚT, tắt sau 3 s) */
}
export function update(dt) {
  if (!E) return; updParts(dt); updDecoys(dt); updSaves(dt); updSongs(dt); updReflex(); updMirrors(dt);   /* phản xạ trước → gương có hiệu lực ngay khung này */
  for (const R of S.rings) if (R.song) { R.t += dt; R.r = 110 * Math.min(1, R.t / 0.35); }
  updRings(dt); S.rings = S.rings.filter(R => (R.song ? R.t < R.T : R.t < 2.4));
  for (const c of S.cols) { const W = c.W; if (!W.done && W.f.act !== W.a) endSwap(W); }   /* động tác bị ngắt (trúng đòn / ngất / thu về) → dọn cột, bỏ trạng thái chìm */
  for (const c of S.cols) if (c.W.done) { c.ct = (c.ct || 0) + dt; if (c.ct > 0.2) c.gone = true; }   /* cột sập 0,2 s sau khi xong */
  S.cols = S.cols.filter(c => !c.gone);
  for (const r of S.refl) { const s = r.s, q = r.shooter; if (!q || !live(q) || !E.ST.shots.includes(s)) continue; const v = Math.hypot(s.vx, s.vy) || 1, a0 = Math.atan2(s.vy, s.vx), a1 = Math.atan2(chestY(q) - s.y, q.x - s.x); let da = a1 - a0; while (da > Math.PI) da -= Math.PI * 2; while (da < -Math.PI) da += Math.PI * 2; const a = a0 + Math.max(-5 * dt, Math.min(5 * dt, da)); s.vx = Math.cos(a) * v; s.vy = Math.sin(a) * v; }   /* đạn bật lại bám nhẹ người bắn (quay ≤ 5 rad/s) */
  for (const r of S.refl) if (!E.ST.shots.includes(r.s)) { r.gone = true; const s = r.s; if (s.kind === 'proj2') { const gy = s.gy || s.y; flash(s.x, gy, gy - s.y, 'quang', 4, 0.12, gy + 0.7); sparks(s.x, gy, gy - s.y, 'quang', 7, 50, 30, 0.3, 220, gy + 0.7); } }
  S.refl = S.refl.filter(r => !r.gone);
}
function updReflex() {   /* AI gương: đạn đối thủ sẽ tới trong ~0,45 s → dựng gương (phản xạ) */
  for (const f of E.ST.F) { if (!f || !live(f) || !E.ST.auto[f.side] || !mirrorReady(f)) continue;
    for (const s of E.ST.shots) { if (!REFL_KINDS[s.kind] || s.f.side === f.side || s.p73chk) continue; const vx = s.vx || 0, vy = s.vy || 0, v = Math.hypot(vx, vy); if (v < 1) continue;
      const rx = f.x - s.x, ry = chestY(f) - s.y, along = (rx * vx + ry * vy) / v, perp = Math.abs(rx * vy - ry * vx) / v; if (along <= 0 || perp > 18) continue; const eta = along / v; if (eta > 0.5) continue;
      s.p73chk = 1; if (rnd() < 0.85) { E.startAct(f, 'guong_hoi_quang'); log({ ev: 'mirror_reflex', side: f.side, eta: +eta.toFixed(2) }); break; } } }
  for (const f of E.ST.F) { if (!f || !live(f) || !E.ST.auto[f.side]) continue; const L = E.MV78(f); if (!L || !L.includes('hinh_nhan_la') || (f.cds.hinh_nhan_la || 0) > 0 || !E.freeFor(f) || f.hp < f.max * 0.4 || f.p73dec) continue;
    const o = E.foeReal(f); if (o && o.act && !o.act.fired && o.act.t < 0.25 && !o.act.p73seen && (o.act.ult || (o.act.mv && o.act.mv.pow >= 70))) { o.act.p73seen = 1; if (rnd() < 0.6) { E.startAct(f, 'hinh_nhan_la'); log({ ev: 'decoy_reflex', side: f.side, vs: o.act.id }); } } }
}
export const spdMul = f => (f.p73wet > 0 ? 2 / 3 : 1) * (f.p73fast > 0 ? 1.5 : 1);
export const holdMoves = f => !!(f.p73hold > 0 && E && E.ST.auto[f.side]);
export function afterHit(att, def, mv) {   /* trúng đòn Triều thì than tắt (dập lửa) */
  if (def.p73coal && mv && mv.type === 'trieu') { def.p73coal = null; say(def.x, def.y - 34, 'THAN TẮT', 'COAL OUT', '#9fd0ff', 0.85); for (let i = 0; i < 4; i++) part({ k: 'disc', x: def.x, y: def.y, z: E.standH(def), vx: (rnd() - 0.5) * 10, vz: 18, g: 0, r: 1.6, grow: 0.8, T: 0.5, cols: ['#ffffff', '#e4eef2', '#c4d2d8'] }); log({ ev: 'coal_out', side: def.side }); }
}
/* AI: trọng số chọn chiêu (choose) */
export function weight(f, id, k0, foe, d) {
  const o = E.foeReal(f), hp = f.hp / f.max, ohp = o ? o.hp / o.max : 1;
  switch (id) {
    case 'vong_du_chan': { if (o && ((E.FLY[o.sp] && !(E.grounded && E.grounded(o))) || (o.alt || 0) > 6)) return 0.05; const still = !o.moving || (o.act && !o.act.fired); return (still || d <= 60) ? 2.2 : 0.7; }
    case 'bay_lo_than': { if (!o || o.p73coal) return 0; const L = E.MV78(o) || []; const soon = L.some(m => m !== 'huc' && !E.MOVES[m].ult && (o.cds[m] || 0) > 0 && (o.cds[m] || 0) <= 2.2); return soon ? 2.2 : 1.0; }
    case 'doi_dong': { const cornered = cornerScore(f) >= 3, inZone = (E.ST.zones || []).some(z => z.f !== f && Math.hypot(f.x - z.x, f.y - z.y) <= (z.r || 30) + 6); if (cornered || inZone) return 3; return d >= 40 && d <= 140 ? 0.9 : 0.2; }
    case 'hinh_nhan_la': { if (hp <= 0.4 || f.p73dec) return 0; if (o && o.act && !o.act.fired && (o.act.ult || (o.act.mv && o.act.mv.pow >= 70))) return 3; return hp > 0.55 && d <= 110 ? 0.7 : 0.15; }
    case 'hoan_tac': { if (hp > 0.92) return 0.05; if (o && o.act && !o.act.fired && (o.act.ult || (o.act.mv && o.act.mv.pow >= 70)) && hp >= 0.3 && hp <= 0.8) return 3; return hp >= 0.3 && hp <= 0.85 ? 0.9 : 0.25; }
    case 'khuc_tan_canh': { if (d > 92) return 0; const better = hp - ohp >= 0.15 || (o && E.speedOf(o) < E.speedOf(f)); return better ? 2.2 : 0.6; }
    case 'rinh_so_ho': { if (!o || d > 125) return 0; const L = E.MV78(o) || []; const soon = L.some(m => m !== 'huc' && !E.MOVES[m].ult && (o.cds[m] || 0) <= 0.6); return soon && !o.act ? 2.0 : 0.3; }
    case 'guong_hoi_quang': { if (o && o.act && !o.act.fired) { const K = E.SK[o.act.id], m = o.act.mv; if ((K && (K.m === 'strip' || K.m === 'beam')) || (m && m.shape === 'tia')) return 3; } return 0; }   /* đạn bay: phản xạ ở updReflex */
  }
  return k0;
}
function cornerScore(f) { let n = 0; for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; if (!okAt(f, f.x + Math.cos(a) * 26, f.y + Math.sin(a) * 26)) n++; } return n; }
/* AI: hướng chạy thêm (steer) — trả { x, y, w } (w = trọng số trộn vào hướng cũ) hoặc null */
export function steer(f) {
  if (!E) return null;
  if (f.p73flee) { const F0 = f.p73flee, dx = f.x - F0.x, dy = (f.y - F0.y) / 0.55, d = Math.hypot(dx, dy); if (d < F0.r) return { x: dx / (d || 1), y: dy / (d || 1) * 0.55, w: 0.85 }; }
  const sg = f.p73cnt; if (sg && sg.f !== f && sg.flee && sg.t >= 2.9 && live(sg.f)) { const dx = f.x - sg.f.x, dy = f.y - sg.f.y, d = Math.hypot(dx, dy); if (d < 130) return { x: dx / (d || 1), y: dy / (d || 1), w: 0.92 }; }
  const mine = S.songs.find(s => s.f === f && !s.done); if (mine) { const o = E.foeReal(f); if (o && live(o) && o.p73cnt === mine) { const dx = o.x - f.x, dy = o.y - f.y, d = Math.hypot(dx, dy); if (d > 24) return { x: dx / d, y: dy / d, w: 0.7 }; } }
  if (f.p73camp) { const C = f.p73camp, dx = C.x - f.x, dy = C.y - f.y, d = Math.hypot(dx, dy); if (d > 8) return { x: dx / d, y: dy / d, w: 0.75 }; return { x: 0, y: 0, w: 0.9 }; }
  return null;
}

/* ================= vẽ ================= */
export function drawF(g, f, cx, cy, df) {   /* vẽ thân thú: chìm (cột nước / thế rình), mờ (hình nhân), giật lỗi 3 lát (hoàn tác) */
  const sink = f.p73sub > 0 ? f.p73sub : (f.p73lurk ? 0.42 * Math.min(1, f.p73lurk.t / 0.12) : 0);
  if (f.p73glitch > 0 && !f.dead) { const H = E.standH(f) + 6, top = Math.round(f.y - cy) - H, sl = Math.ceil(H / 3), ph = Math.floor(f.p73glitch * 40) % 2, off = ph ? [-2, 2, -1] : [2, -1, 2];
    for (let i = 0; i < 3; i++) { g.save(); g.beginPath(); g.rect(-9999, top + i * sl, 19999, i === 2 ? 9999 : sl); g.clip(); g.translate(off[i], 0); df(g, f, cx, cy, false, f.toss); g.restore(); }
    return; }
  if (!sink && !(f.p73fade > 0)) return df(g, f, cx, cy, false, f.toss);
  g.save(); if (f.p73fade > 0) g.globalAlpha = 0.42;
  if (sink > 0) { const H = E.standH(f) + 4, yl = Math.round(f.y - cy) + 1; g.beginPath(); g.rect(-9999, -9999, 19999, yl + 9999); g.clip(); const y0 = f.y; f.y = y0 + Math.round(H * sink); try { df(g, f, cx, cy, false, f.toss); } finally { f.y = y0; } }
  else df(g, f, cx, cy, false, f.toss);
  g.restore();
}
export function drawGround(g, cx, cy) {
  if (!E) return;
  for (const R of S.rings) { if (R.song) { const k = R.t / R.T, C = P('am'); ringBand(g, R.f.x, R.f.y + 1, R.r, 3, cx, cy, q => (q < 0.34 ? C[0] : q < 0.67 ? C[2] : C[4]), q => (q < 0.67 ? 1 : 0.6) * (1 - k * k), 0.5); continue; } drawCrack(g, R, cx, cy); drawRingBand(g, R, cx, cy); }
  for (const c of S.cols) { const C = P('trieu'), k = Math.min(1, c.W.t / 0.3); ringBand(g, c.x, c.y + 1, 5 + 7 * k, 1.5, cx, cy, () => C[1], () => 0.8 * (1 - Math.max(0, c.W.t - 0.6))); }   /* gợn chỉ dưới chân */
  for (const f of E.ST.F) if (f && f.p73lurk && !f.dead) { const C = P('anh'), X = SX(f.x, cx), Y = SY(f.y + 1, cy), R = Math.max(10, E.bodyW(f) * 0.7) * 2 * Math.min(1, f.p73lurk.t / 0.12);   /* vũng bóng tĩnh dưới chân */
    for (let y = -R * 0.4; y <= R * 0.4; y++) for (let x = -R; x <= R; x++) { const e = (x * x) / (R * R) + (y * y) / (R * R * 0.16); if (e > 1) continue; const px = Math.round(X + x), py = Math.round(Y + y); if (e > 0.75 && 0.6 < bay(px, py)) continue; dot(g, px, py, e > 0.75 ? C[5] : C[7]); } }
}
export function drawables(out, g, cx, cy) {
  if (!E) return;
  for (const d of S.decoys) if (!d.dead) out.push({ y: d.y + 0.005, f: () => drawDecoy(g, d, cx, cy) });
  for (const s of S.saves) if (!s.done) out.push({ y: s.y - 0.1, f: () => drawGhost(g, s, cx, cy) });
  for (const c of S.cols) out.push({ y: c.y + 0.6, f: () => drawColumn(g, c, cx, cy) });
  for (const p of S.parts) out.push({ y: p.ky, f: () => drawPart(g, p, cx, cy) });
  for (const fl of S.flashes) out.push({ y: fl.ky, f: () => drawFlash(g, fl, cx, cy) });
  for (const s of S.streaks) out.push({ y: (s.k === 'bite' || s.k === 'implode' ? s.y + 0.8 : Math.max(s.y0 || 0, s.y1 || 0) + 0.7), f: () => drawStreak(g, s, cx, cy) });
  for (const f of E.ST.F) { if (!f || f.dead) continue;
    if (f.p73mirror && f.p73mirror.t < f.p73mirror.T) out.push({ y: f.y + (f.p73mirror.dy < -0.2 ? -0.5 : 0.5), f: () => drawMirror(g, f, cx, cy) });   /* luật lớp vẽ: gương phía trên → sau thân */
    if (f.p73coal) out.push({ y: f.y + 0.75, f: () => drawCoalIcon(g, f, cx, cy) });
    if (f.p73cnt) out.push({ y: f.y + 0.76, f: () => songDigits(g, f, cx, cy) });
    if (f.p73lurk) out.push({ y: f.y + 0.02, f: () => { const C = P('anh'), X = SX(f.x, cx), Y = SY(E.headY(f) + 4 + Math.round((E.standH(f) + 4) * 0.42 * Math.min(1, f.p73lurk.t / 0.12)), cy); dot(g, X - 3, Y, C[0]); dot(g, X - 2, Y, C[1]); dot(g, X + 2, Y, C[0]); dot(g, X + 3, Y, C[1]); } }); }
  for (const s of E.ST.shots) if (s.kind === 'p73' || (s.p73refl && s.kind === 'proj2')) out.push({ y: (s.gy || s.y) + (s.vy < 0 ? -0.5 : 0.5), f: () => drawShot(g, s, cx, cy) });   /* luật 16/10: bay lên sau lưng, xuống trước */
}
function drawShot(g, s, cx, cy) {   /* than hồng (nham) / đạn bị gương bật lại (vàng quang): lõi + quầng + đuôi dither */
  const C = s.p73refl ? P('quang') : P('nham'), coal = s.sk === 'coal' && !s.p73refl, X = SX(s.x, cx), Y = SY(s.y, cy);
  for (let i = 1; i < s.trail.length; i++) { const q = s.trail[i], a = 1 - i / s.trail.length, qx = SX(q.x, cx), qy = SY(q.y, cy); if (a < bay(qx, qy)) continue; const tc = s.p73refl ? (i < 3 ? C[1] : C[3]) : (i < 3 ? C[2] : C[4]); dot(g, qx, qy, tc); dot(g, qx + 1, qy, tc); dot(g, qx, qy + 1, s.p73refl ? C[2] : C[5]); }
  if (coal) { disc(g, X, Y, 7, C[4], 0.55); disc(g, X, Y, 5.5, C[6]); disc(g, X, Y, 4.5, '#3a2620'); for (const [a, b, c] of [[-2, -2, 1], [1, -1, 0], [2, 1, 2], [-1, 2, 3], [0, 0, 1], [-3, 0, 2], [3, -2, 2]]) dot(g, X + a, Y + b, C[c]); } else { disc(g, X, Y, 7, C[3], 0.6); disc(g, X, Y, 5.5, C[2]); disc(g, X, Y, 4, C[1]); disc(g, X - 1, Y - 1, 2.2, C[0]); }
}
function drawStreak(g, s, cx, cy) {
  const C = P(s.he), k = s.t / s.T;
  if (s.k === 'arc') {   /* vệt nước bay cung nối 2 điểm (đổi chỗ) */
    for (let i = 0; i < 6; i++) { const u = Math.min(1, k * 1.2 - i * 0.04); if (u <= 0) continue; const x = s.x0 + (s.x1 - s.x0) * u, y = s.y0 + (s.y1 - s.y0) * u, z = Math.sin(Math.PI * u) * 22 + 8; disc(g, SX(x, cx), SY(y - z, cy), Math.max(1, 3 - i * 0.4), i < 2 ? C[1] : C[3], 1 - i * 0.12); } return; }
  if (s.k === 'tear') {   /* vệt bóng xé ngang 2 khung (Rình Sơ Hở) */
    const n = Math.ceil(Math.hypot(s.x1 - s.x0, s.y1 - s.y0) * 2); for (let i = 0; i <= n; i++) { const u = i / (n || 1), X = SX(s.x0 + (s.x1 - s.x0) * u, cx), Y = SY(s.y0 + (s.y1 - s.y0) * u - 8, cy); for (let w = -3; w <= 3; w++) if (Math.abs(w) < 3 - u * 2) dot(g, X, Y + w, Math.abs(w) < 1 ? C[1] : C[6]); } return; }
  if (s.k === 'bite') {   /* vết cắn tím đen bán kính ≤ 14: 2 cung răng khép lại */
    const X = SX(s.x, cx), Y = SY(s.y - s.z, cy), R = 14 * 2, cl = Math.min(1, k * 3), a = 1 - Math.max(0, (k - 0.4) / 0.6);
    for (const sgn of [-1, 1]) for (let i = 0; i <= 28; i++) { const an = Math.PI * (0.12 + 0.76 * i / 28), px = Math.round(X + Math.cos(an) * R * (1 - cl * 0.3)), py = Math.round(Y + sgn * (Math.sin(an) * R * 0.55 * (1 - cl * 0.65) + 2)); if (a < bay(px, py)) continue; dot(g, px, py, C[7]); dot(g, px + 1, py, C[6]); dot(g, px, py + sgn, C[2]); if (i % 4 === 2) { dot(g, px, py - sgn, C[0]); dot(g, px, py - 2 * sgn, C[1]); dot(g, px, py - 3 * sgn, C[1]); } }
    return; }
  if (s.k === 'implode') {   /* vòng âm nén vào thân (chốt Khúc Tàn Canh) */
    const q = s.f, R = 110 * (1 - k); ringBand(g, q.x, q.y, R, 3, cx, cy, u => (u < 0.4 ? C[0] : C[2]), () => 1, 0.5); return; }
}
export function dbg() { return { n: { ...S.n }, log: S.log.slice(-60), rings: S.rings.length, decoys: S.decoys.map(d => ({ hp: Math.round(d.hp), t: +d.t.toFixed(2), seen: !!d.seenBy })), saves: S.saves.map(s => ({ t: +s.t.toFixed(2), done: s.done })), songs: S.songs.map(s => ({ t: +s.t.toFixed(2), n: s.list.length })), parts: S.parts.length, cols: S.cols.length,
  F: E ? E.ST.F.map(f => f && { sp: f.sp, coal: !!f.p73coal, wet: +(f.p73wet || 0).toFixed(1), hold: +(f.p73hold || 0).toFixed(1), lurk: !!f.p73lurk, mirror: !!f.p73mirror, cnt: !!f.p73cnt, dec: !!f.p73dec, sub: +(f.p73sub || 0).toFixed(2), x: Math.round(f.x), y: Math.round(f.y), hp: Math.round(f.hp) }) : [] }; }
