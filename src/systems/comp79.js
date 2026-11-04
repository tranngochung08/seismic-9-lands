/* comp79.js — plan-79 đợt 1 (anh duyệt 02/11): THẢ CHẤN THÚ ở mọi map.
   · Ô Ấn Chấn trên thanh công cụ (máy tính) / nút tròn (điện thoại) / phím J: thả hoặc thu con ĐẦU ĐỘI Chấn Thú (save.sys.chanthu.team[0]).
   · Đang thả: con thú đi theo người chơi; có quái thường quanh người (≤ 120 px) thì tự chạy tới cắn (anh chốt: tự đánh quái như linh thú).
     Chũi / Cóc hoang chưa nổi giận KHÔNG bị đánh (thú hiền để bắt) — muốn đấu thì lại gần bấm E (trận tại chỗ, linhduel).
   · Vẽ bằng chính sprite trận (ctx.ldKit từ linhduel: mkFighter + drawFighter) → cùng cỡ với lúc đánh tại chỗ; bóng dưới chân (shadow.js).
   · Đòn cắn: VFX code fx78.bite (nét theo loài) — chỉ bật khi trúng, không hiệu ứng lặp.
   · Trong trận (duel.active): không vẽ / không chạy — con thú ra sân bằng Ấn Chấn của trận; hết trận đứng lại cạnh người. */
import { SPECIES } from './duel-data.js';
import * as FX from './fx78.js';
import { SHADOW, shadowFor } from './shadow.js';
import * as D107 from './dash107.js';   /* plan-107: LAO NHANH tới (áp sát quái / đuổi kịp người chơi) */
import * as TK from './rktk.js';   /* plan-90: Rocky golem (loài 'rocky') — 6 chiêu + VFX code khi thả đi theo */

const vi = ctx => ctx.lang() !== 'en';
const duelOn = ctx => !!(ctx.duel && ctx.duel.active && ctx.duel.active());
const T = {
  vi: { none: 'Chưa có Chấn Thú — nhận con đầu tiên ở bệ Chấn Thú trong Làng', out: n => `Thả ${n}!`, back: n => `${n} về Ấn Chấn`, busy: 'Đang đấu — chưa thu được', need: 'Thả Chấn Thú ra trước (phím J / ô Ấn Chấn) rồi bấm E để đấu', tipOut: n => `Thu ${n} về Ấn Chấn (J)`, tipIn: n => `Thả ${n} ra (J) — đi theo bạn, tự đánh quái; gặp thú hoang bấm E để đấu`, lblOut: 'Thu', lblIn: 'Thả' },
  en: { none: 'No Quake Beast yet — get your first one at the beast stand in the Village', out: n => `Go, ${n}!`, back: n => `${n}, come back!`, busy: 'In a battle — cannot recall now', need: 'Send out your Quake Beast first (J / Quake Seal slot), then press E to battle', tipOut: n => `Recall ${n} (J)`, tipIn: n => `Send out ${n} (J) — follows you and fights monsters; press E near a wild beast to battle`, lblOut: 'Back', lblIn: 'Go' },
};
const L = ctx => (vi(ctx) ? T.vi : T.en);
const ST = { ctx: null, f: null, act: null, atkT: 0, stuckT: 0, tgt: null, n: { out: 0, back: 0, hit: 0, kill: 0, tele: 0, spawn: 0 }, log: [], btn: null, btnSig: '', loading: false };
const sv = ctx => { const s = ctx.S.save; s.sys = s.sys || {}; return (s.sys.p79 = s.sys.p79 || { out: false }); };
const team0 = ctx => { try { const d = ctx.chanthu && ctx.chanthu.ensure && ctx.chanthu.ensure(); return (d && d.team && d.team[0]) || null; } catch (e) { return null; } };
const nameOf = (ctx, m) => (m && (m.name || (ctx.ldKit && ctx.ldKit.name ? ctx.ldKit.name(m.sp) : m.sp))) || '?';
const hyp = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
function log(e) { ST.log.push({ t: +(performance.now() / 1000).toFixed(2), ...e }); if (ST.log.length > 80) ST.log.shift(); }

/* ---------- thả / thu ---------- */
function press(ctx) {
  if (ctx && ctx.squad104) return ctx.squad104.press();   /* p104: bộ quản lý chung lo thả / thu */
  if (!ctx || ctx.S.mode !== 'play') return false;
  if (duelOn(ctx)) { ctx.toast(L(ctx).busy); return false; }
  const m = team0(ctx), k = sv(ctx);
  if (!m) { ctx.toast(L(ctx).none); ctx.sfx('fail'); return false; }
  k.out = !k.out;
  if (k.out) { ST.n.out++; log({ ev: 'out', sp: m.sp }); ctx.toast(L(ctx).out(nameOf(ctx, m))); ctx.sfx('whoosh'); if (m.sp === 'elyziuma') { if (ctx.elyz95) ctx.elyz95.pop(); } else ensure(ctx, true); }
  else { ST.n.back++; log({ ev: 'back' }); ctx.toast(L(ctx).back(nameOf(ctx, m))); ctx.sfx('pickup'); if (m.sp === 'elyziuma' && ctx.elyz95) ctx.elyz95.recall(); if (ST.f) FX.sink(ST.f.x, ST.f.y, FX.skinOf(ST.f.sp, ST.f.types && ST.f.types[0]), FX.power(0.2)); ST.f = null; ST.act = null; }
  ctx.persist(); return true;
}
function ensure(ctx, pop) {   /* dựng đối tượng chiến binh cho con đầu đội (sprite trận tải lười: chờ loadDuel) */
  const kit = ctx.ldKit, m = team0(ctx); if (!kit || !m) return null;
  if (ST.f && ST.f.sp === m.sp && ST.f.lv === m.lv) return ST.f;
  if (!kit.ready()) { if (!ST.loading) { ST.loading = true; kit.load().then(() => { ST.loading = false; }, () => { ST.loading = false; }); } return null; }
  const p = ctx.S.player, dv = [[0, 1], [-1, 0], [1, 0], [0, -1]][p.dir] || [0, 1], q = kit.near(p.x - dv[0] * 16 + (dv[1] ? 12 : 0), p.y - dv[1] * 12 + 2);
  const f = kit.mk(m.sp, m.lv, m, q.x, q.y); f.comp79 = true; f.clip = 'idle'; f.ct = 0; f.fx = dv[0] || 0.01; f.fy = dv[1]; ST.f = f; ST.act = null; ST.n.spawn++;
  if (pop) FX.erupt(q.x, q.y, FX.skinOf(f.sp, f.types && f.types[0]), FX.power(0.15), 'b');
  log({ ev: 'spawn', sp: f.sp, x: Math.round(q.x), y: Math.round(q.y) }); return f;
}

/* ---------- đi theo + đánh quái ---------- */
function targetOf(ctx, f) {
  const p = ctx.S.player, L0 = ctx.monsters && ctx.monsters.list ? ctx.monsters.list() : []; let best = null, bd = 1e9;
  for (const mo of L0) {
    if (!mo || !(mo.hp > 0) || mo.dead || mo.hide || mo.statue || mo.state === 'dead' || (mo.c && (mo.c.spar || mo.c.boss))) continue;
    if (mo.c && mo.c.fct && !mo.angry) continue;   /* Chũi / Cóc hoang hiền: để bắt, không cắn */
    const dp = hyp(mo, p), df = hyp(mo, f); if (dp > 120 || df > 180) continue; const s = dp + df * 0.4; if (s < bd) { bd = s; best = mo; } }
  return best;
}
function spdOf(f) { return Math.min(110, 46 + (f.st && f.st.spe ? f.st.spe * 0.7 : 30)); }
function face(f, x, y) { const dx = x - f.x, dy = y - f.y, d = Math.hypot(dx, dy); if (d > 0.5) { f.fx = dx / d; f.fy = dy / d; } }
function strike(ctx, f, mo) {
  if (!mo || !(mo.hp > 0) || hyp(mo, f) > (isRk(f) ? 35 : 30)) { log({ ev: 'whiff' }); return; }
  const dmg = Math.max(1, Math.round(Math.max((mo.max || 10) * 0.14, (f.st && f.st.atk ? f.st.atk : 40) * 0.35)));
  try { mo.__by = 'c79'; ctx.monsters.damage(mo, dmg, { x: f.x, y: f.y }, 0.3, 55); } catch (e) { }   /* p106: ghi công */
  const sk = FX.skinOf(f.sp, f.types && f.types[0]); FX.bite(mo.x, mo.y, 6, sk, FX.power(FX.powerP(SPECIES[f.sp], f.lv))); if (ctx.envfx) { try { ctx.envfx.hit(mo.x, mo.y + 2, 9, (f.types && f.types[0]) || 'chan', 0.45); } catch (e) { } }   /* p105 */
  ST.n.hit++; if (!(mo.hp > 0)) ST.n.kill++; log({ ev: 'hit', dmg, hp: Math.max(0, Math.round(mo.hp || 0)) });
}
/* plan-90: cầu nối rktk.js cho con 'rocky' đang thả (fighter của ldKit): hướng, dáng ra chiêu (clip atk / cast), sát thương lên quái, ô cứng */
const isRk = f => !!f && f.sp === 'rocky';
function rkSync(f) { const ax = Math.abs(f.fx || 0), ay = Math.abs(f.fy || 0); f.dir = (f.fx || 0) < 0 ? -1 : 1; f.face = ay > ax * 1.2 ? (f.fy > 0 ? 'ds' : 'dn') : 'side'; }
function rkPt(f) { const p = f.__pt || (f.__pt = { golem: true }); p.hp = f.hp; return p; }
function rkPool(ctx, f) { const p = ctx.S.player, L0 = ctx.monsters && ctx.monsters.list ? ctx.monsters.list() : []; return L0.filter(mo => mo && mo.hp > 0 && !mo.dead && !mo.hide && !mo.statue && mo.state !== 'dead' && !(mo.c && mo.c.spar) && !(mo.c && mo.c.fct && !mo.angry) && hyp(mo, p) < 140 && hyp(mo, f) < 190); }
function rkH(ctx, f) { const H = f.__H || (f.__H = { ctx, pet: () => rkPt(f), ent: () => f, stats: () => ({ max: f.max }), atk: () => Math.max(12, ((f.st && f.st.atk) || 40) * 0.35), mons: () => rkPool(ctx, f),
  deal: (mo, dmg, kb) => { try { mo.__by = 'c79'; ctx.monsters.damage(mo, Math.max(1, Math.round(dmg)), { x: f.x, y: f.y }, 0.3, kb || 0, true); ST.n.hit++; if (!(mo.hp > 0)) ST.n.kill++; } catch (e) { } },
  face8: (e, dx, dy) => { face(e, e.x + dx, e.y + dy); rkSync(e); }, passable: (x, y) => !(ctx.isSolid && ctx.isSolid(ctx.S.map, Math.floor(x / 16), Math.floor(y / 16))), origin: (pt, e, ang) => TK.originOf(e, ang),
  dust: () => { }, quake: s => { if (ctx.quake && typeof location !== 'undefined' && /[?&]quake113=1/.test(location.search)) ctx.quake(s); } }); return H; }
function rkPose(ctx, f) { const P = f.tkPose; if (!P) return; const clip = P.clip === 'punch' ? 'atk' : P.clip === 'ha' ? 'cast' : (ctx.ldKit.has && ctx.ldKit.has(f, P.clip) ? P.clip : 'cast');   /* p115: tư thế riêng từng chiêu */ if (f.clip !== clip) f.clip = clip; f.ct = P.prog * Math.max(0.2, ctx.ldKit.clipT(f, clip)) * 0.98; }
/* plan-107: cầu nối dash107 cho chiến binh ldKit — dùng chung D107.goFighter (squad104 / thú hoang p106 gắn y như vậy) */
function io107(ctx, f, gx, gy, sp, dt, near, mo) { return D107.fighterIO(ctx, f, gx, gy, sp, dt, near, { trig: mo ? 56 : 76, r: f.sp === 'rocky' ? 18 : 9, face: () => { if (f.sp === 'rocky' && typeof rkSync === 'function') rkSync(f); } }); }
function tick(ctx, f, dt) {
  const kit = ctx.ldKit, p = ctx.S.player; f.ct += dt; D107.tick(f, dt); if (f.flash > 0) f.flash = Math.max(0, f.flash - dt); ST.atkT -= dt;
  if (ST.act) { const A = ST.act; A.t += dt; if (!A.hit && A.t >= A.imp) { A.hit = true; strike(ctx, f, A.mo); } if (A.t >= A.T) { ST.act = null; f.clip = 'idle'; f.ct = 0; } return; }
  if (hyp(f, p) > 240) { D107.stop(f, 'tele'); const q = kit.near(p.x - 12, p.y + 4); f.x = q.x; f.y = q.y; ST.n.tele++; log({ ev: 'tele' }); return; }   /* tụt lại quá xa (qua cổng, bị kẹt) → về cạnh người */
  if (isRk(f)) { rkSync(f); const t0 = targetOf(ctx, f); if (TK.tick(ctx, rkPt(f), f, t0, rkPool(ctx, f), dt, rkH(ctx, f))) { D107.stop(f, 'tk'); rkPose(ctx, f); ST.tgt = t0 ? t0.id : null; return; } if (f.tkWas) { f.tkWas = false; f.clip = 'idle'; f.ct = 0; } }   /* plan-90: Rocky golem dùng 6 chiêu trước, hết chiêu thì cắn / đấm thường */
  const mo = targetOf(ctx, f); ST.tgt = mo ? mo.id : null; let gx, gy, sp = spdOf(f), near = 0;
  if (mo) { const side = f.x <= mo.x ? -1 : 1; gx = mo.x + side * (isRk(f) ? 17 : 14); gy = mo.y + 1; sp *= 1.25; near = 3;
    if (hyp(f, mo) < (isRk(f) ? 26 : 22) && ST.atkT <= 0) { const clip = kit.has(f, 'atk') ? 'atk' : kit.has(f, 'cast') ? 'cast' : 'idle', Tc = Math.max(0.35, kit.clipT(f, clip)); face(f, mo.x, mo.y); f.clip = clip; f.ct = 0; D107.stop(f, 'atk'); ST.act = { mo, t: 0, T: Tc, imp: Math.min(Tc * 0.6, kit.impT(clip)), hit: false }; ST.atkT = 1.1; return; } }
  else { const dv = [[0, 1], [-1, 0], [1, 0], [0, -1]][p.dir] || [0, 1]; const KR = isRk(f) ? 1.45 : 1; gx = p.x - dv[0] * 18 * KR + (dv[1] ? 13 * KR : 0); gy = p.y - dv[1] * 12 * KR + 2; near = 6;   /* plan-90 cỡ = Elyziuma (K 1.077) */ { const G = D107.clear(ctx, f, gx, gy, f.sp === 'rocky' ? 18 : 9); gx = G.x; gy = G.y; }   /* plan-107: chỗ đứng không chồng lên Rocky / người */ if (hyp(f, p) > 90) sp *= 1.5; }
  const dx = gx - f.x, dy = gy - f.y, d = Math.hypot(dx, dy);
  { const r = D107.go(f, io107(ctx, f, gx, gy, sp, dt, near, mo)); if (r) { ST.stuckT = 0; return; } }   /* plan-107: xa → lấy đà, lao, phanh trượt */
  if (d <= near || (!mo && hyp(f, p) < (isRk(f) ? 30 : 24))) { if (f.clip !== 'idle') { f.clip = 'idle'; f.ct = 0; } ST.stuckT = 0; if (!mo) face(f, p.x, p.y); return; }
  const st = Math.min(d, sp * dt), ok = kit.move(f, dx / d * st, dy / d * st); face(f, gx, gy); if (f.clip !== 'run' && kit.has(f, 'run')) { f.clip = 'run'; f.ct = 0; }
  ST.stuckT = ok ? 0 : ST.stuckT + dt; if (ST.stuckT > 1.4) { const q = kit.near(p.x - 12, p.y + 4); f.x = q.x; f.y = q.y; ST.stuckT = 0; ST.n.tele++; log({ ev: 'unstuck' }); }
}

/* ---------- nút điện thoại (máy tính dùng ô trên thanh công cụ — hotbar.js) ---------- */
const BTN_CSS = `.c79-btn{position:fixed;z-index:30;width:52px;height:52px;box-sizing:border-box;border-radius:50%!important;border:3px solid #5a3f2a;background:#e9cfa0;box-shadow:0 2px 0 #2a1a12;padding:0;touch-action:none;display:flex;align-items:center;justify-content:center;cursor:pointer}
.c79-btn img{width:32px;height:32px;image-rendering:pixelated;display:block;margin:auto}.c79-btn.out{background:#c9a274}
.c79-btn i{position:absolute;left:50%;bottom:-15px;transform:translateX(-50%);font:700 11px/1 monospace;color:#fff;text-shadow:0 1px 0 #000,1px 0 0 #000,-1px 0 0 #000,0 -1px 0 #000;font-style:normal;white-space:nowrap}`;
function btnTick(ctx) {
  if (typeof document === 'undefined') return;
  if (!ST.btn) { if (!document.getElementById('c79-css')) { const s = document.createElement('style'); s.id = 'c79-css'; s.textContent = BTN_CSS; document.head.appendChild(s); }
    const b = document.createElement('div'); b.setAttribute('role', 'button'); b.id = 'c79-btn';   /* div: tránh style chung của thẻ button (bị vuông) */ b.className = 'c79-btn'; b.innerHTML = '<img src="assets/px/ui/hud91/sk_call.png" alt=""><i></i>';   /* c10: nút Thả (điện thoại) dùng icon gọi — quả cầu nay là Ấn Thu để ném */ b.style.display = 'none';
    b.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); press(ST.ctx); }); document.body.appendChild(b); ST.btn = b; }
  const b = ST.btn, hs = document.querySelector('#hotbar .hb-c79'), show = !!team0(ctx) && ctx.S.mode === 'play' && !duelOn(ctx) && !(hs && hs.getClientRects().length);
  if (!show) { if (b.style.display !== 'none') b.style.display = 'none'; ballBtn(ctx, null); return; }
  const out = !!sv(ctx).out, sig = out + ':' + vi(ctx); if (ST.btnSig !== sig) { ST.btnSig = sig; b.className = 'c79-btn' + (out ? ' out' : ''); b.querySelector('i').textContent = out ? L(ctx).lblOut : L(ctx).lblIn; }
  const lt = document.getElementById('lt-orb'), r = lt && lt.style.display !== 'none' ? lt.getBoundingClientRect() : null;
  const x = r && r.width ? r.left - 62 : innerWidth - 215, y = r && r.width ? r.top + (r.height - 52) / 2 : innerHeight - 262;   /* không có nút Ấn Linh: chỗ trống trên-phải cần điều khiển, không đè Túi đồ / nút A (soát ảnh 390×844) */
  if (b.style.display === 'none') b.style.display = ''; b.style.left = Math.round(Math.max(8, x)) + 'px'; b.style.top = Math.round(Math.max(8, y)) + 'px';
  ballBtn(ctx, { x: Math.max(8, x), y: Math.max(8, y) - 76 });   /* c10: ngay trên nút Thả (bên trái có ô sóng âm thanh / cần điều khiển) */
}
/* c10 (anh 04/11): nút NÉM ẤN THU trên điện thoại — ảnh quả cầu PixelLab orb_icon, số Ấn Thu dưới nút; chỉ hiện ở bãi farm (ctx.ballInfo của farm106), mờ khi không có con ngất trong tầm */
function ballBtn(ctx, at) {
  if (typeof document === 'undefined') return; const inf = at && ctx.ballInfo ? ctx.ballInfo() : null;
  if (!inf || !inf.on) { if (ST.bb && ST.bb.style.display !== 'none') ST.bb.style.display = 'none'; return; }
  if (!ST.bb) { const b = document.createElement('div'); b.setAttribute('role', 'button'); b.id = 'c10-ball'; b.className = 'c79-btn c10-ball'; b.innerHTML = '<img src="assets/px/duel/anthu/anthu_icon.png" alt=""><i></i>'; b.style.display = 'none';
    b.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); const C = ST.ctx; if (C && C.ballThrow) C.ballThrow(); }); document.body.appendChild(b); ST.bb = b; }
  const b = ST.bb, sig = inf.n + ':' + inf.near + ':' + vi(ctx); if (ST.bbSig !== sig) { ST.bbSig = sig; b.querySelector('i').textContent = (vi(ctx) ? 'Ấn Thu ' : 'Orb ') + inf.n; b.style.opacity = inf.near ? '1' : '0.55'; b.style.background = inf.near ? '#ffe9a0' : ''; }
  if (b.style.display === 'none') b.style.display = ''; b.style.left = Math.round(Math.max(8, at.x)) + 'px'; b.style.top = Math.round(at.y) + 'px';
}

export const comp79 = {
  id: 'comp79',
  always: true,
  onZoneEnter(ctx) {
    ST.ctx = ctx; ST.act = null; ST.stuckT = 0; if (ST.f) { const p = ctx.S.player; ST.f.x = p.x - 12; ST.f.y = p.y + 4; }   /* qua vùng mới: thú đi cùng, đứng cạnh người */
    ctx.comp79 = { f: () => ST.f,   /* p106 */ press: () => press(ctx), out: () => !!sv(ctx).out && !!team0(ctx), need: () => ctx.toast(L(ctx).need), pos: () => (ST.f ? { x: ST.f.x, y: ST.f.y } : null),
      slot: () => { const m = team0(ctx); if (!m) return null; const out = !!sv(ctx).out; return { out, name: nameOf(ctx, m), sp: m.sp, tip: out ? L(ctx).tipOut(nameOf(ctx, m)) : L(ctx).tipIn(nameOf(ctx, m)), lbl: out ? L(ctx).lblOut : L(ctx).lblIn }; } };
    if (typeof window !== 'undefined') window.__c79 = { press: () => press(ctx), state: () => ({ out: !!sv(ctx).out, f: ST.f && { sp: ST.f.sp, x: Math.round(ST.f.x), y: Math.round(ST.f.y), clip: ST.f.clip }, act: !!ST.act, tgt: ST.tgt, n: { ...ST.n } }), log: () => ST.log.slice(), f: () => ST.f, btn: () => { const b = ST.btn; return b ? { show: b.style.display !== 'none', x: b.style.left, y: b.style.top } : null; } };
  },
  onZoneLeave() { ST.act = null; },
  key(code, ctx) { if (code === 'KeyJ' && ctx.S.mode === 'play') { press(ctx); return true; } return false; },
  update(dt, ctx) {
    ST.ctx = ctx; btnTick(ctx);
    if (duelOn(ctx) || ctx.S.mode !== 'play') return;
    const k = sv(ctx); if (!k.out) { if (ST.f) ST.f = null; return; }
    if (!team0(ctx)) { k.out = false; ST.f = null; return; }
    if (team0(ctx).sp === 'elyziuma') { ST.f = null; ST.act = null; return; }   /* p95: Elyziuma có hệ đi theo riêng (elyz95.js) */
    const f = ensure(ctx, false); if (f) tick(ctx, f, Math.min(dt, 0.05));
    if (f && isRk(f)) { if (f.tkPose) f.tkWas = true; try { rkSync(f); TK.update(ctx, dt, rkH(ctx, f)); } catch (e) { console.error('rktk', e); } }   /* plan-90 */
  },
  drawGround(g, ctx, cx, cy) { const f = ST.f; if (!f || duelOn(ctx) || !sv(ctx).out) return; D107.ground(g, f, cx, cy); if (SHADOW.on) shadowFor(g, f.x, f.y, (globalThis.__R89||Math.round)(f.x - cx), (globalThis.__R89||Math.round)(f.y - cy) + 1, (globalThis.__fw110 ? globalThis.__fw110(f.sp, isRk(f) ? 22 : f.tier === 'l' ? 18 : f.tier === 's' ? 10 : 13) : isRk(f) ? 22 : f.tier === 'l' ? 18 : f.tier === 's' ? 10 : 13), 0); },
  drawables(ctx, cx, cy) { const f = ST.f; if (!f || duelOn(ctx) || !sv(ctx).out || !ctx.ldKit) return []; const out = [{ y: f.y, f: () => D107.draw(f, ctx.g, cx, cy, (gg, a, c) => ctx.ldKit.draw(gg, f, a, c)) }]; D107.drawables(out, f, ctx.g, cx, cy); if (isRk(f)) TK.drawables(ctx, out, cx, cy, rkH(ctx, f)); return out; },   /* plan-90: VFX 6 chiêu Rocky golem sắp theo chiều sâu */
};
