/* c37-dauhoang (anh 04/11): ĐẤU CHẤN THÚ HOANG ngoài map — tự ra thú, thú ngã thì con khác ra, chuyển cảnh mượt.
   · CHỌN (click / Tab khoá) hoặc ĐÁNH một Chấn Thú hoang (farm106: mo.f6.sp — thú hoang 1 chiêu + thủ lĩnh) → chưa có Chấn Thú nào
     đang đứng trên sân thì TỰ THẢ con khoẻ đầu đội (bung Ấn Chấn như J) + mọi con đang thả nhắm con hoang đó.
   · Chấn Thú của mình NGÃ giữa giao tranh → tự thả con khoẻ kế tiếp trong đội (bỏ qua con vừa ngã < 15 s), tới khi hết con khoẻ.
   · Thả thêm bao nhiêu cũng được: squad104 nới MAXN 3 → 6 (cả đội) — vá trong patch-c37.py.
   · E đấu chính thức (thủ lĩnh) khi chưa thả con nào → tự thả con đầu đội rồi vào trận luôn (trước: chỉ báo 'thả Chấn Thú trước').
   · CHUYỂN CẢNH vào / ra trận tại chỗ (linhduel gọi globalThis.__tr37 TRƯỚC khi đổi zoom / camera): chụp khung game cũ lên 1 canvas phủ
     riêng, phóng / thu theo bậc zoom mới + mờ dần 0,42 s (chỉ CSS opacity / transform, không filter, không màn đen); ra trận thì camera
     trượt về người chơi trong ~0,5 s thay vì nhảy. Máu Chấn Thú đầu đội sau trận giữ theo máu cuối trận.
   Test: window.__dh37. */
import * as TGT from './target.js';

const KO_T = 15, ENG_R = 220, TR_T = 0.42;
const ST = { ctx: null, eng: null, lock: null, cr: new WeakMap(), ko: new Set(), koAt: new Map(), log: [], noneT: -99, cam: null, tr: null, trCv: null, shot: null,
  n: { auto: 0, next: 0, none: 0, need: 0, trIn: 0, trOut: 0, hpSync: 0, aim: 0 } };
const now = () => (ST.ctx ? ST.ctx.S.time : 0);
const vi = ctx => ctx.lang() !== 'en';
const TX = {
  vi: { go: (n, w) => `Thả ${n} — đấu ${w}!`, next: n => `${n} ra thay!`, none: 'Hết Chấn Thú còn sức — lùi lại nghỉ đã!' },
  en: { go: (n, w) => `Go, ${n} — battle ${w}!`, next: n => `${n}, take over!`, none: 'No healthy Quake Beast left — fall back and rest!' } };
const L = ctx => (vi(ctx) ? TX.vi : TX.en);
function log(e) { ST.log.push({ t: +now().toFixed(2), ...e }); if (ST.log.length > 200) ST.log.shift(); }
const SQ = ctx => (ctx.squad104 && ctx.squad104.out && ctx.squad104.put ? ctx.squad104 : null);
const duelOn = ctx => !!(ctx.duel && ctx.duel.active && ctx.duel.active());
const alive = mo => !!mo && mo.hp > 0 && !mo.dead && !mo.hide && mo.state !== 'dead' && !mo.statue;
const wild = mo => alive(mo) && !!(mo.f6 && mo.f6.sp);
const hyp = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
function monList(ctx) { try { return ctx.monsters && ctx.monsters.list ? ctx.monsters.list() : []; } catch (e) { return []; } }
const nameOfM = (ctx, m) => (m && (m.name || (ctx.ldKit && ctx.ldKit.name ? ctx.ldKit.name(m.sp) : m.sp))) || '?';
const nameOfW = (ctx, mo) => { try { return TGT.nameOf({ kind: 'mon', ref: mo }) || nameOfM(ctx, { sp: mo.f6.sp }); } catch (e) { return nameOfM(ctx, { sp: mo.f6 && mo.f6.sp }); } };

/* ---------- thả / nhắm ---------- */
function active(ctx) { const sq = SQ(ctx); return sq ? sq.units().filter(u => !u.ko && (u.sp !== 'elyziuma' || u.onField())) : []; }   /* con đang thả còn sức (con vừa thả chưa dựng sprite vẫn tính) */
function fresh(ctx) { const sq = SQ(ctx), out = sq.out(), t = now(); return sq.team().filter(m => !out.includes(m.id) && !(t - (ST.koAt.has(m.id) ? ST.koAt.get(m.id) : -99) < KO_T)); }
function aim(ctx, mo) { const sq = SQ(ctx); if (!sq || !alive(mo)) return; for (const id of sq.out()) sq.focus(id, mo); ST.n.aim++; }
function release(ctx, mo, why) {
  const sq = SQ(ctx); if (!sq || sq.out().length >= sq.maxN()) return null;
  const m = fresh(ctx)[0]; if (!m || !sq.put(m.id)) return null;
  ST.n[why === 'next' ? 'next' : 'auto']++; log({ ev: why, id: m.id, sp: m.sp, mo: mo && mo.id });
  try { ctx.toast(why === 'next' ? L(ctx).next(nameOfM(ctx, m)) : L(ctx).go(nameOfM(ctx, m), mo ? nameOfW(ctx, mo) : '?')); ctx.sfx('whoosh'); } catch (e) { }
  if (mo) aim(ctx, mo); return m;
}
function engage(ctx, mo, why) {
  if (!wild(mo) || !SQ(ctx)) return; const p = ctx.S.player; if (hyp(mo, p) > ENG_R) return;
  const was = ST.eng; ST.eng = mo;
  if (!active(ctx).length) release(ctx, mo, 'auto'); else if (was !== mo || why === 'lock') aim(ctx, mo);
  if (was !== mo) log({ ev: 'engage', why, mo: mo.id, sp: mo.f6.sp });
}
function fighting(ctx) {   /* đang giao tranh: con hoang đang đấu còn sống gần đây, hoặc quái nổi giận sát người */
  const p = ctx.S.player; if (wild(ST.eng) && hyp(ST.eng, p) < ENG_R * 1.3) return ST.eng;
  let best = null, bd = 160; for (const mo of monList(ctx)) { if (!alive(mo) || !(mo.angry || (mo.f6 && mo.f6.mode === 'angry'))) continue; const d = hyp(mo, p); if (d < bd) { bd = d; best = mo; } } return best;
}
function onKo(ctx, u) {
  const mo = fighting(ctx); log({ ev: 'ko', id: u.id, fight: !!mo });
  if (!SQ(ctx)) return;
  const m = mo ? release(ctx, mo, 'next') : null;
  if (!m && !active(ctx).length && !fresh(ctx).length && now() - ST.noneT > 6) { ST.noneT = now(); ST.n.none++; try { ctx.toast(L(ctx).none); } catch (e) { } }
}

/* ---------- E đấu chính thức khi chưa thả con nào ---------- */
function wrapNeed(ctx) {
  const C = ctx.comp79; if (!C || !C.need || C.need.__dh37) return; const n0 = C.need;
  const w = function (...a) {
    try { if (ctx.S.mode === 'play' && !duelOn(ctx) && SQ(ctx)) {
      const p = ctx.S.player, nd = ctx.S.near && ctx.S.near.data && ctx.S.near.data.f106; let mo = wild(nd) ? nd : null;
      if (!mo) { let bd = 56; for (const o of monList(ctx)) if (wild(o) && hyp(o, p) < bd) { bd = hyp(o, p); mo = o; } }
      if (mo && release(ctx, mo, 'need')) { ST.n.need++; if (window.__f106 && window.__f106.duel) { window.__f106.duel(mo.id); return; } } } } catch (e) { console.error('dh37 need', e); }
    return n0.apply(this, a); };
  w.__dh37 = true; C.need = w;
}

/* ---------- chuyển cảnh vào / ra trận ---------- */
function snap(kind) {
  const ctx = ST.ctx; if (typeof document === 'undefined' || !ctx) return; ST.n[kind === 'out' ? 'trOut' : 'trIn']++;
  if (kind === 'out') { ST.cam = { dx: ctx.S.camDX || 0, dy: ctx.S.camDY || 0, t: 0 }; hpSync(ctx); }
  if (globalThis.__tr37off) return;   /* so sánh: tắt chuyển cảnh (bài test đặt) */
  const cv = document.getElementById('c'); if (!cv || !cv.width || !cv.height) return;
  let o = ST.trCv; if (!o) { o = document.createElement('canvas'); o.id = 'tr37'; o.style.cssText = 'position:fixed;pointer-events:none;image-rendering:pixelated;display:none;transform-origin:50% 50%;will-change:opacity,transform'; ST.trCv = o; }
  if (o.parentNode !== cv.parentNode || o.previousSibling !== cv) cv.parentNode.insertBefore(o, cv.nextSibling);
  const r = cv.getBoundingClientRect(); if (!(r.width > 0)) return;
  o.width = cv.width; o.height = cv.height; const g = o.getContext('2d'); g.imageSmoothingEnabled = false; g.clearRect(0, 0, o.width, o.height); g.drawImage(cv, 0, 0);
  const z = getComputedStyle(cv).zIndex; o.style.zIndex = z && z !== 'auto' ? z : '0';
  o.style.left = r.left + 'px'; o.style.top = r.top + 'px'; o.style.width = r.width + 'px'; o.style.height = r.height + 'px'; o.style.opacity = '1'; o.style.transform = 'none'; o.style.display = 'block';
  const z0 = r.width / Math.max(1, ctx.VW || 1), pc = () => { const p = ctx.S.player, c = ctx.cam; return c ? { x: (p.x - c.cx), y: (p.y - 12 - c.cy) } : null; }, P0 = pc();
  o.style.transformOrigin = '0 0';
  const sm = +(globalThis.__tr37slow || 0);   /* test: chiếu chậm ×N để chụp từng khung (đặt từ bài test — URL bị preset dọn) */
  ST.tr = { kind, t0: performance.now(), z0, k: null, slow: sm > 1 ? Math.min(20, sm) : 1, tx: 0, ty: 0, fr: 0, a0: P0 ? { x: P0.x * z0, y: P0.y * z0 } : null, r0: { x: r.left, y: r.top } };
  log({ ev: 'tr', kind, w: Math.round(r.width), vw: ctx.VW });
  const step = () => { const T = ST.tr; if (!T || T.done) return; const t = (performance.now() - T.t0) / 1000; T.fr++;
    if (T.k == null && T.fr >= 2) {   /* khung mới đã vẽ: tỉ lệ phóng mới (resize của zoom trận) + dời để người chơi trong ảnh cũ trượt về đúng chỗ mới */
      const r1 = cv.getBoundingClientRect(), z1 = r1.width / Math.max(1, ctx.VW || 1), P1 = pc(); T.k = Math.max(0.4, Math.min(2.5, z1 / T.z0)); T.z1 = z1;
      if (T.a0 && P1) { T.tx = P1.x * z1 + r1.left - T.r0.x - T.a0.x * T.k; T.ty = P1.y * z1 + r1.top - T.r0.y - T.a0.y * T.k; } }
    const u = Math.min(1, t / (TR_T * T.slow)), e = 1 - Math.pow(1 - u, 2), k = T.k == null ? 1 : T.k;
    o.style.opacity = String(Math.max(0, 1 - e * 1.05)); o.style.transform = `translate(${(T.tx * e).toFixed(1)}px,${(T.ty * e).toFixed(1)}px) scale(${(1 + (k - 1) * e).toFixed(4)})`;
    if (u >= 1) { T.done = true; o.style.display = 'none'; return; } requestAnimationFrame(step); };
  requestAnimationFrame(step);
}
function hpSync(ctx) {   /* máu Chấn Thú đầu đội sau trận = máu cuối trận (tỉ lệ), tối thiểu 1 */
  try { const D = window.__duel && window.__duel.state && window.__duel.state(), f = D && D.F && D.F[0], sq = SQ(ctx); if (!f || !sq || !(f.max > 0)) return;
    const u = sq.units().find(v => v.sp === f.sp && v.f && !v.ko && v.sp !== 'elyziuma'); if (!u || !(u.max > 0)) return;
    u.hp = Math.max(1, Math.round(u.max * Math.max(0, f.hp) / f.max)); ST.n.hpSync++; log({ ev: 'hp', id: u.id, hp: u.hp, max: u.max }); } catch (e) { }
}
function camTick(ctx, dt) {   /* ra trận: camera trượt về người chơi (linhduel đặt camDX = 0 một phát) */
  const C = ST.cam; if (!C) return; if (duelOn(ctx)) { ST.cam = null; return; }
  C.t += dt; const k = Math.max(0, 1 - C.t / 0.5), e = k * k * (3 - 2 * k); ctx.S.camDX = C.dx * e; ctx.S.camDY = C.dy * e; if (k <= 0) { ctx.S.camDX = 0; ctx.S.camDY = 0; ST.cam = null; }
}
if (typeof globalThis !== 'undefined') globalThis.__tr37 = kind => { try { snap(kind); } catch (e) { console.error('tr37', e); } };

export const dauhoang37 = {
  id: 'dauhoang37',
  always: true,
  onZoneEnter(ctx) {
    ST.ctx = ctx; ST.eng = null; ST.lock = null; ST.ko.clear(); ST.cam = null;
    if (typeof window !== 'undefined') window.__dh37 = { state: () => ({ n: { ...ST.n }, eng: ST.eng ? ST.eng.id : null, active: active(ctx).map(u => u.id), fresh: SQ(ctx) ? fresh(ctx).map(m => m.id) : [], koAt: [...ST.koAt.entries()], tr: ST.tr ? { kind: ST.tr.kind, k: ST.tr.k, tx: Math.round(ST.tr.tx), ty: Math.round(ST.tr.ty), done: !!ST.tr.done } : null }),
      log: () => ST.log.slice(), engage: id => { const mo = monList(ctx).find(o => o.id === id); engage(ctx, mo, 'api'); return !!mo; }, snap: k => snap(k || 'in'), reset: () => { for (const k in ST.n) ST.n[k] = 0; ST.log = []; ST.koAt.clear(); } };
  },
  onZoneLeave() { ST.eng = null; ST.lock = null; ST.cam = null; },
  update(dt, ctx) {
    ST.ctx = ctx; dt = Math.min(dt, 0.05); wrapNeed(ctx); camTick(ctx, dt);
    if (ctx.S.mode !== 'play' || duelOn(ctx)) return; const sq = SQ(ctx); if (!sq) return; const p = ctx.S.player;
    const t = TGT.get(), lm = t && t.kind === 'mon' ? (t.mo || t.ref) : null;
    if (lm !== ST.lock) { ST.lock = lm; if (wild(lm)) engage(ctx, lm, 'lock'); }   /* chọn / khoá con hoang */
    for (const mo of monList(ctx)) { if (!wild(mo)) continue; const c = (mo.f6.cr && mo.f6.cr.pl) || 0, c0 = ST.cr.get(mo);   /* người chơi đánh trúng con hoang (farm106 ghi công 'pl') */
      if (c0 === undefined) { ST.cr.set(mo, c); continue; } if (c > c0) { ST.cr.set(mo, c); if (hyp(mo, p) < ENG_R) engage(ctx, mo, 'hit'); } }
    for (const u of sq.units()) { if (u.sp === 'elyziuma') { const on = u.onField(); if (on) u.on37 = true; else if (u.on37) { u.on37 = false; ST.koAt.set(u.id, now()); onKo(ctx, u); } continue; }   /* Elyziuma: elyz95 tự ngất (E.ko) — đang trên sân → mất = ngã */
      if (u.ko && !ST.ko.has(u.id)) { ST.ko.add(u.id); ST.koAt.set(u.id, now()); onKo(ctx, u); } else if (!u.ko && ST.ko.has(u.id)) ST.ko.delete(u.id); }
    if (ST.eng && !alive(ST.eng)) { log({ ev: 'engEnd', mo: ST.eng.id }); ST.eng = null; }
  },
};
