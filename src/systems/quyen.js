/* quyen.js — c13 (04/11/2026): QUYỀN = cách đánh khi TAY KHÔNG. Port từ c10-quyen (cloud, bản "bỏ vũ khí") theo 3 điểm anh chốt 04/11:
   (1) GIỮ KIẾM: thanh kỹ năng như cũ (Đánh · Rocky-ha · Lướt Ki · Gọi linh thú · Hợp Thể) + THÊM ô 6 Chưởng (phím L). Không ô khoá "Sắp có".
   (2) Đánh theo món đang cầm: cầm kiếm = chém như cũ; tay không (không cầm gì) = combo 3 đòn Đấm theo cấp Quyền (monsters.js hỏi ctx.quyen).
   (3) TÁCH 2 cấp: kiếm theo cấp kiếm (tool.tier không bị đụng); Quyền cấp riêng save.quyen = { lv 1…30, xp }, khởi điểm theo cấp kiếm của save (1 lần).
   Luyện Quyền: mỗi đòn đấm trúng +1 · Chưởng trúng +1 / con (≤ 3 / lần) · hạ quái khi đang đánh tay không +⌈XP quái / 5⌉. Cần 20 + 12 × cấp.
   Bậc Quyền = 1 + ⌊(cấp − 1)/5⌋ (≤ 6) — chỉ dùng cho đòn tay không / Chưởng (so giáp quái). Sát thương cộng thêm nội suy bảng kiếm cũ; hồi Đấm / Chưởng × (1 − 1,5 %/cấp, ≥ 0,55).
   Clip tay không: q_punch1/2/3 (punch1/2/3 PixelLab nếu có, chưa có → ghép tạm từ 'throw'); clip attack* của kiếm GIỮ NGUYÊN.
   Va chạm đòn đấm (ctx.wfx 'hit' có o.fist) vẽ code: chớp lõi + nan khí + tia. Tắt để so: ?quyen=0. */
import { pal, Particles, Lights, Rng, P, blob, wedges, drawWedges, band, hex, WHITE, TAU, inst as inst113 } from './pxfx113.js';
import { chuong as chuong115 } from './chuong115.js';

const OFF = (() => { try { return new URLSearchParams(location.search).get('quyen') === '0'; } catch (e) { return false; } })();
const BONUS = [0, 5, 12, 22, 35, 50, 70];   /* = hero.js (sát thương thêm theo cấp kiếm 0..6) */
export const MAXQ = 30;
export const tierOf = L => Math.min(6, 1 + Math.floor((L - 1) / 5));
export const bonusOf = L => { const t = tierOf(L); if (t >= 6) return BONUS[6] + Math.max(0, L - 26) * 4; return Math.round(BONUS[t] + (BONUS[t + 1] - BONUS[t]) * (((L - 1) % 5) / 5)); };
export const cdMulOf = L => Math.max(0.55, 1 - 0.015 * (L - 1));
export const needOf = L => 20 + 12 * L;
export const SK = { palm: { cd: 6, ki: 1, range: 88, tick: 0.3, boom: 1.4, wind: 0.26, fire: 0.95 } };
const ICON = { palm: 'assets/px/ui/hud91/kion.png' };   /* tạm: ngọc Ki PixelLab có sẵn — chờ icon Chưởng */
export const CLIPS = ['q_punch1', 'q_punch2', 'q_punch3'];

const TX = {
  vi: { palm: 'Chưởng', q: 'Quyền', tipPalm: L => `Ô 6 (L) · Chưởng — 1 Ki, đánh mọi quái trong nón trước mặt · Quyền cấp ${L}`,
    up: L => `🥊 Quyền lên cấp ${L}! Đấm / Chưởng mạnh hơn, hồi nhanh hơn`, cd: 'Chưởng đang hồi', noKi: 'Không đủ Ki' },
  en: { palm: 'Ki Palm', q: 'Fist', tipPalm: L => `Slot 6 (L) · Ki Palm — 1 Ki, hits every monster in a cone ahead · Fist Lv ${L}`,
    up: L => `🥊 Fist Lv ${L}! Punch / Palm hit harder and recover faster`, cd: 'Ki Palm is cooling down', noKi: 'Not enough Ki' },
};
const T = ctx => TX[ctx.lang && ctx.lang() === 'vi' ? 'vi' : 'en'];

const ST = { ctx: null, cd: { palm: 0 }, fx: [], fightT: -99, hero: null, cast: null, stats: { punchHit: 0, palmHit: 0, palmCast: 0, qxp: 0 } };
const sq = ctx => { const s = ctx.S.save; if (!s.quyen) { let t = 0; try { t = ctx.tool ? ctx.tool.tier('sword') : ((s.toolTier || {}).sword || 0); } catch (e) { } s.quyen = { lv: t > 0 ? Math.min(MAXQ, 1 + 5 * (t - 1)) : 1, xp: 0 }; } return s.quyen; };
const add = (ctx, I, y) => { ST.fx.push({ I, y }); return I; };

function addQ(ctx, n) {
  const q = sq(ctx); if (q.lv >= MAXQ || !(n > 0)) return; q.xp += n; ST.stats.qxp += n; let up = false;
  while (q.lv < MAXQ && q.xp >= needOf(q.lv)) { q.xp -= needOf(q.lv); q.lv++; up = true; }
  if (q.lv >= MAXQ) q.xp = 0;
  if (up) { ctx.toast(T(ctx).up(q.lv), true); ctx.sfx && ctx.sfx('coin'); }
}

/* ---------- móc (gọi mỗi khung: ctx.hero / ctx.wfx được tạo lại mỗi lần vào vùng) ---------- */
function hook(ctx) {
  const h = ctx.hero;
  if (h && h !== ST.hero) {
    ST.hero = h; const gx = h.gainXp;
    h.gainXp = (n, ...r) => { const res = gx(n, ...r); if (n > 0 && ctx.S.time - ST.fightT < 2.5) addQ(ctx, Math.ceil(n / 5)); return res; };   /* hạ quái bằng tay không / Chưởng → luyện Quyền */
  }
  if (ctx.wfx && !ctx.wfx.__q) {
    const w0 = ctx.wfx, w = (kind, x, y, o = {}) => { if (kind === 'hit' && o && o.fist) { punchFx(ctx, x, y, o); return true; } return w0(kind, x, y, o); };   /* chỉ đòn TAY KHÔNG; kiếm giữ vệt chém cũ */
    w.__q = true; ctx.wfx = w;
  }
}
/* clip tạm ghép từ vài khung của 1 clip PixelLab (chép điểm ảnh bằng get/putImageData — KHÔNG qua drawImage bị bọc __hi, luật 25/09) */
function subClip(src, idx, fps, impact) {
  try {
    const im = src.img, W = im.__w || im.width, H = im.__h || im.height, fw = Math.round(W / src.n), c = document.createElement('canvas');
    c.width = fw * idx.length; c.height = H; const g = c.getContext('2d'), sg = im.getContext('2d');
    idx.forEach((f, i) => g.putImageData(sg.getImageData(f * fw, 0, fw, H), i * fw, 0));
    c.__hi = im.__hi; return { ...src, img: c, n: idx.length, fps, impact };
  } catch (e) { return { ...src, fps, impact }; }
}
/* thêm clip tay không q_punch1/2/3 + palm (không đụng attack* của kiếm). Có punch1/2/3 / palm PixelLab thì dùng; chưa có → ghép tạm từ 'throw':
   khung 'throw' 2–4 là vung tay RA SAU (ném) → không dùng; chỉ lấy 1 (thủ thế) · 5 (lao người, tay đẩy về trước) · 0 (đứng) */
function clips(p) {
  const A = p && p.sheet && p.sheet.actions; if (!A || A.__q13 === A) return;
  const th = A.throw; if (!th && !A.punch1) return;
  const mk = (own, fps, imp) => (own ? { ...own, fps: own.fps || fps, impact: own.impact != null ? own.impact : imp } : subClip(th, [1, 5, 5, 0], fps, imp));
  A.q_punch1 = mk(A.punch1, 14, 1); A.q_punch2 = mk(A.punch2, 14, 1); A.q_punch3 = mk(A.punch3, 11, 1);
  A.palm = A.palm && !A.palm.__tmp ? A.palm : { ...subClip(th, [0, 1, 5, 5, 5, 0], 10, 2), __tmp: true };
  A.__q13 = A;
}

/* ---------- VFX va chạm đòn đấm (code): chớp lõi trắng + nan khí ngọc + tia văng theo hướng đòn; đòn 3 thêm vòng sóng đất ---------- */
function punchFx(ctx, x, y, o) {
  const C = pal('ma'), R = new Rng(((x * 7 + y * 13) | 0) + 1), Lt = new Lights(), fin = !!o.fin, sh = !!o.shell, zc = Math.max(5, Math.min(14, (o.h || 16) * 0.5));
  const X = x * 2, Y = (y - zc) * 2, G = y * 2, d = o.dir || { x: 1, y: 0 }, a0 = Math.atan2(d.y, d.x), ph = R.range(0, TAU);
  const ps = new Particles({ rng: R, ground: () => G, sparks: ['#ffffff', C[6], C[5], C[4]].map(c => (typeof c === 'number' ? c : hex(c))) });
  const Wd = wedges(R, fin ? 9 : 6, fin ? 8 : 6, fin ? 18 : 12); let go = false;
  const sc = { T: fin ? 0.55 : 0.36, layers: fin ? ['ground', 'body'] : ['body'],
    box() { const r = fin ? 42 : 28; return [x - r, y - zc - r, x + r, y + r * 0.6]; },
    update(dt) {
      if (!go) { go = true; const n = fin ? 14 : sh ? 9 : 7;
        for (let i = 0; i < n; i++) { const an = a0 + R.range(-0.95, 0.95), s = R.range(120, fin ? 320 : 220); ps.spawn(P.SPARK, X, Y, Math.cos(an) * s, Math.sin(an) * s - 40, R.range(0.18, 0.4), sh ? hex('#d8d8e0') : i % 2 ? C[6] : C[5], 1); }
        Lt.add(X, Y, fin ? 46 : 30, C[6], 0.8, 0.25); }
      ps.update(dt); Lt.update(dt);
    },
    draw(p, layer, t) {
      if (layer === 'ground') { if (fin && t < 0.45) { const u = t / 0.45; band(p, X, G, 6 + 34 * (1 - (1 - u) * (1 - u)), 0.5, 3, 1 - u, C, () => true, t < 0.04); } return; }
      ps.draw(p, 'back');
      if (t < 0.05) blob(p, X, Y, fin ? 11 : 7, t < 0.02 ? 0 : 1, C, ph);
      drawWedges(p, Wd, X, Y, t, hex('#120a10'), WHITE, C[6]);
      ps.draw(p, 'front'); Lt.draw(p);
    } };
  const yk = y + 0.5;   /* va chạm vẽ TRƯỚC quái bị đánh */
  add(ctx, inst113(sc), () => yk);
  if (fin && ctx.quake) ctx.quake(0.08);
}

/* ---------- Chưởng ---------- */
const DIRV = [[0, 1], [-1, 0], [1, 0], [0, -1]];   /* p.dir: 0 S · 1 W · 2 E · 3 N (như hotbar aimHa) */
function pickTarget(ctx, p) {
  const ok = mo => mo && mo.hp > 0 && !mo.statue && !(ctx.b49Tier && !ctx.b49Tier(mo) && !(ctx.b49Air && ctx.b49Air())) && !(mo.c && mo.c.spar && !(ctx.sparFoe && ctx.sparFoe() === mo));
  const lk = ctx.target && ctx.target.get && ctx.target.get();
  if (lk && (lk.kind === 'mon' || lk.kind === 'tent')) { const r = lk.mo || lk.ref; if (r && Math.hypot(r.x - p.x, r.y - p.y) < SK.palm.range * 1.8) return r; }
  let best = null, bd = SK.palm.range * 1.5;
  for (const mo of (ctx.monsters && ctx.monsters.list()) || []) { if (!ok(mo)) continue; const dd = Math.hypot(mo.x - p.x, mo.y - p.y); if (dd < bd) { bd = dd; best = mo; } }
  if (ctx.pk && ctx.pk.aim) { const q17 = ctx.pk.aim(p, best ? Math.hypot(best.x - p.x, best.y - p.y) : SK.palm.range * 1.5); if (q17) return q17; }   /* c17-pk: người chơi PK gần hơn quái → Chưởng nhắm người */
  return best;
}
function spendKi(ctx, n) { try { if (ctx.ki && ctx.ki.spend) return ctx.ki.spend(n); if (typeof window !== 'undefined' && window.__ki && window.__ki.set) window.__ki.set(ctx.ki.get() - n); } catch (e) { } }
/* c56-chuongxuong: đang Bay + khoá / click quái MẶT ĐẤT → bay tới trên đầu nó rồi chưởng xuống (lặp mỗi lần hết hồi) */
const PC56 = { mo: null, path: null, n: 0, t: 0, casts: 0 };
const air56 = ctx => !!(ctx.b49Air && ctx.b49Air());
const ground56 = (ctx, mo) => !!(mo && !mo.__pk && ctx.b49Tier && !ctx.b49Tier(mo));
function pcIn(ctx, mo) { const p = ctx.S.player; return !!(p && air56(ctx) && ground56(ctx, mo) && mo.hp > 0 && Math.hypot(mo.x - p.x, mo.y - p.y) < SK.palm.range * 1.8); }
function pcStop(p) { if (PC56.path && p && p.autoPath === PC56.path) p.autoPath = null; PC56.mo = null; PC56.path = null; PC56.n = 0; }
function pcStart(ctx, mo) {
  const p = ctx.S.player; if (!p || !air56(ctx) || !mo || mo.hp <= 0 || !ctx.monsters || !ctx.monsters.list().includes(mo)) return false;
  if (ctx.ki && ctx.ki.get() < SK.palm.ki) { ctx.toast(T(ctx).noKi); ctx.sfx('fail'); return false; }
  pcStop(p); PC56.mo = mo; PC56.t = 0; return true;
}
function pcTick(ctx, dt) {
  const mo = PC56.mo; if (!mo) return; const p = ctx.S.player;
  const steer = !!(PC56.path && p && p.autoPath && p.autoPath !== PC56.path) && (PC56.n = PC56.n + 1) > 3;   /* bấm đi / click chỗ khác → thôi */
  if (!p || ctx.S.mode !== 'play' || !air56(ctx) || mo.hp <= 0 || !ctx.monsters.list().includes(mo) || steer || (PC56.t += dt) > 25) { pcStop(p); return; }
  const d = Math.hypot(mo.x - p.x, mo.y - p.y);
  if (d <= 34) {   /* đã ở trên đầu quái */
    if (PC56.path && p.autoPath === PC56.path) p.autoPath = null; PC56.path = null; PC56.n = 0;
    if (!ST.cast && ST.cd.palm <= 0 && !(ctx.ki && ctx.ki.busy && ctx.ki.busy())) {
      if (ctx.ki && ctx.ki.get() < SK.palm.ki) { ctx.toast(T(ctx).noKi); ctx.sfx('fail'); pcStop(p); return; }
      if (ctx.target && ctx.target.lock) { try { ctx.target.lock({ kind: 'mon', ref: mo }); } catch (e) { } }
      if (palm(ctx)) PC56.casts++;
    }
  } else if (!p.autoPath || (PC56.rt = (PC56.rt || 0) - dt) <= 0) { PC56.rt = 0.3; if (!PC56.path || p.autoPath === PC56.path || !p.autoPath) { p.autoPath = PC56.path = [{ x: mo.x, y: mo.y + 2 }]; } }
}
function palm(ctx) {
  const p = ctx.S.player, t = T(ctx), q = sq(ctx); if (ctx.S.mode !== 'play' || !p) return false;
  if (ST.cast) return false;
  if (ST.cd.palm > 0) { ctx.toast(t.cd); ctx.sfx('fail'); return false; }
  if (ctx.ki && ctx.ki.get() < SK.palm.ki) { ctx.toast(t.noKi); ctx.sfx('fail'); return false; }
  if (ctx.ki && ctx.ki.busy && ctx.ki.busy()) return false;
  if (p.custom && !(ctx.b49Air && ctx.b49Air()) && !(ctx.isUnderwater && ctx.isUnderwater())) return false;   /* dáng riêng (thuyền, bè…): không chưởng — c53-troinuoc: đang Bay / dưới nước chưởng như mặt đất */
  spendKi(ctx, SK.palm.ki); ST.cd.palm = SK.palm.cd * cdMulOf(q.lv); ST.stats.palmCast++; ST.fightT = ctx.S.time;
  const tg = pickTarget(ctx, p), L56 = (ctx.b49Air && ctx.b49Air() && ctx.b49Lift) ? (ctx.b49Lift() || 0) : 0, mL56 = mo => (L56 && !ground56(ctx, mo)) ? L56 : 0;   /* c56-chuongxuong: đang Bay — quái trời ở tầng cao (nâng L56), quái mặt đất ở đất → tia chéo xuống */
  let ang; if (tg) { ang = Math.atan2(tg.y - 6 - mL56(tg) - (p.y - 10 - L56), tg.x - p.x); if (p.faceTo) p.faceTo(tg.x, tg.y); } else { const D = DIRV[p.dir || 0]; ang = Math.atan2(D[1], D[0]); }
  const ca0 = Math.cos(ang), sa0 = Math.sin(ang), dir = p.dir || 0;
  const HAND = [[0, -9], [-8, -11], [8, -11], [0, -13]];   /* lòng bàn tay theo hướng nhìn (khung đẩy tay) */
  const L53 = (ctx.b49Air && ctx.b49Air() && ctx.b49Lift) ? (ctx.b49Lift() || 0) : 0;   /* c53-troinuoc: đang Bay → chưởng ra từ tay ở tầng cao */
  const org = () => { const H = HAND[dir]; return { x: p.x + H[0] + ca0 * 2, y: p.y - L53 + H[1] + sa0 * 2 }; };
  let last = tg ? { x: tg.x, y: tg.y - 8 - mL56(tg) } : { x: p.x + ca0 * SK.palm.range, y: p.y - 10 - L53 + sa0 * SK.palm.range };
  const aim = () => { if (tg && (tg.__pk ? tg.live() : tg.hp > 0 && ctx.monsters.list().includes(tg))) last = { x: tg.x, y: tg.y - 8 - mL56(tg) }; return last; };
  const hitN = new Set(), sum = new Map(), pw = () => (ctx.hero ? ctx.hero.atk + bonusOf(sq(ctx).lv) : 10) * (ctx.atkMul ? ctx.atkMul() : 1);
  const onHit = h => {
    const o = org(), a = aim(), A = Math.atan2(a.y - o.y, a.x - o.x), ca = Math.cos(A), sa = Math.sin(A), tier = tierOf(sq(ctx).lv);
    for (const mo of ctx.monsters.list().slice()) {
      if (mo.hp <= 0 || (mo.c.spar && !(ctx.sparFoe && ctx.sparFoe() === mo)) || (ctx.b49Tier && !ctx.b49Tier(mo) && !(ctx.b49Air && ctx.b49Air()))) continue;   /* c56-chuongxuong: đang Bay trúng cả quái MẶT ĐẤT */   /* c53-troinuoc: chỉ trúng quái CÙNG TẦNG */
      const dx = mo.x - o.x, dy = mo.y - 6 - mL56(mo) - o.y, al = dx * ca + dy * sa, pe = Math.abs(-dx * sa + dy * ca), boss = !!mo.c.boss;
      const hit = h.k === 'tick' ? (al > -2 && al < SK.palm.range + 8 && pe < 7 + al * 0.35 + (boss ? 10 : 0)) : Math.hypot(mo.x - a.x, mo.y - 8 - mL56(mo) - a.y) < 18 + (boss ? 12 : 0);
      if (!hit) continue;
      let dmg = Math.max(1, Math.round(pw() * (h.k === 'tick' ? SK.palm.tick : SK.palm.boom))); if (tier < (mo.c.armor || 0)) dmg = 1;
      const pop0 = ctx.pop; ctx.pop = null; try { ctx.monsters.damage(mo, dmg, o, 1, h.push * 1.4, true); } finally { ctx.pop = pop0; }   /* số sát thương: gộp cả luồng, hiện 1 số / con lúc nổ */
      sum.set(mo, (sum.get(mo) || 0) + dmg); ST.stats.palmHit++;
      if (!hitN.has(mo) && hitN.size < 3) { hitN.add(mo); addQ(ctx, 1); }
      ST.fightT = ctx.S.time;
    }
    if (ctx.pk && ctx.pk.palmHit) ctx.pk.palmHit(h, o, a, ca, sa, pw());   /* c17-pk: Chưởng trúng người chơi đang PK */
    if (h.shake && ctx.quake) ctx.quake(0.035 * h.shake);
    if (h.k === 'boom' && ctx.pop) { for (const [mo, n] of sum) ctx.pop(mo.x, mo.y - 14, `-${n}`, '#8fd3ff'); sum.clear(); }
  };
  ST.cast = { t: 0, dur: SK.palm.wind + SK.palm.fire + 0.12 };
  clips(p); if (p.hasAct && p.hasAct('palm')) p.act('palm', ST.cast.dur);
  ctx.sfx('swing');
  add(ctx, inst113(chuong115(org, aim, { v: 'b', gy: p.y, onHit, seed: (ctx.S.time * 997) | 0 })), () => p.y + (sa0 < -0.05 ? -0.5 : 0.5));   /* luật lớp chiêu: bắn LÊN → chưởng sau lưng; ngang / XUỐNG → chưởng trước người */
  return true;
}

/* ---------- điện thoại: nút Chưởng cạnh nút A — khung tròn pixel ring.png như nút Ăn / Lộn; vòng tối = đang hồi; xám = thiếu Ki.
   Là <button> trong #touch → nút Lộn/Lướt, Ấn Linh, Đổi (đều né '#touch button') tự tránh nó; nó chỉ né các nút cố định. */
const PB = 54;
const PB_CSS = `#touch #btn-palm{width:${PB}px!important;height:${PB}px!important;padding:0;display:flex;align-items:center;justify-content:center;border:none!important;border-radius:50%!important;background:url(assets/px/ui/mslots/ring.png) no-repeat center/100% 100%!important;image-rendering:pixelated;box-sizing:border-box;z-index:7}
#touch #btn-palm img{width:30px;height:30px;image-rendering:pixelated;pointer-events:none;margin-top:-5px;position:relative;z-index:1}
#touch #btn-palm i{position:absolute;left:-6px;right:-6px;bottom:-7px;font:15px/1 VT323,monospace;color:#fff6c8;font-style:normal;text-align:center;white-space:nowrap;pointer-events:none;z-index:2;text-shadow:1px 1px 0 #352022,-1px 0 0 #352022,0 -1px 0 #352022,1px 0 0 #352022}
#touch #btn-palm s{position:absolute;inset:5px;border-radius:50%;pointer-events:none;z-index:1;background:conic-gradient(rgba(20,12,10,.62) calc(var(--cd,0) * 360deg),transparent 0)}
#touch #btn-palm b{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font:17px/1 VT323,monospace;color:#fff;text-shadow:1px 1px 0 #000;pointer-events:none;z-index:3}
#touch #btn-palm.low img{opacity:.45}
#touch #btn-palm:active{transform:translateY(2px)}
#touch #btn-palm[hidden]{display:none}`;
const PBS = { el: null, layT: 0, sig: '' };
const coarse = () => { try { return matchMedia('(pointer: coarse)').matches; } catch (e) { return false; } };
function palmBtn(ctx, dt) {
  if (typeof document === 'undefined') return;
  const host = document.getElementById('touch'), a = document.getElementById('btn-a'); if (!host || !a) return;
  const ms = typeof window !== 'undefined' && window.__ms, show = !!(coarse() && ctx.S.mode === 'play' && (!ms || ms.visible()) && a.getBoundingClientRect().width);
  if (!PBS.el) {
    if (!show) return;
    const st = document.createElement('style'); st.id = 'q-palm-css'; st.textContent = PB_CSS; document.head.appendChild(st);
    const b = document.createElement('button'); b.id = 'btn-palm'; b.hidden = true; b.innerHTML = `<img src="${ICON.palm}" alt=""><s></s><b></b><i></i>`;
    b.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); if (ctx.S.mode === 'play') palm(ST.ctx || ctx); PBS.sig = ''; });
    host.appendChild(b); PBS.el = b; PBS.layT = 0;
  }
  const b = PBS.el; if (b.hidden === show) b.hidden = !show; if (!show) return;
  const t = T(ctx), cd = ST.cd.palm, cdMax = SK.palm.cd * cdMulOf(sq(ctx).lv), low = !!(ctx.ki && ctx.ki.get() + 1e-6 < SK.palm.ki);
  const sig = [t.palm, cd > 0 ? Math.ceil(cd * 10) : 0, low].join('|');
  if (sig !== PBS.sig) { PBS.sig = sig; b.querySelector('i').textContent = t.palm; b.title = t.tipPalm(sq(ctx).lv); b.style.setProperty('--cd', (cd > 0 ? cd / cdMax : 0).toFixed(3)); b.querySelector('b').textContent = cd > 0.05 ? (cd >= 10 ? Math.ceil(cd) : cd.toFixed(1)) : ''; b.classList.toggle('low', low); }
  if ((PBS.layT -= dt) > 0) return; PBS.layT = 0.35;
  const r = a.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2, ra = r.width / 2, taken = [];
  for (const e of document.querySelectorAll('#touch button, #mslots > *, #joy, .dpad, #altw, #herobar, #hotbar, #btn-chat, .sky-btn, #btn-copter, #px-clock, #px-status, #px-money, #btn-menu, #btn-photo, #touch-skills, #c10-ball, .c79-btn')) {
    if (e === b || e.classList.contains('kib') || e.classList.contains('lt-orb') || e.hidden || e.closest('[hidden]') || getComputedStyle(e).display === 'none' || getComputedStyle(e).visibility === 'hidden') continue;
    const q = e.getBoundingClientRect(); if (q.width && q.height) taken.push(q); }
  const free = (x, y) => x >= 4 && y >= 4 && x + PB <= innerWidth - 4 && y + PB <= innerHeight - 4 && !taken.some(q => !(x + PB <= q.left - 4 || x >= q.right + 4 || y + PB <= q.top - 4 || y >= q.bottom + 4));
  let at = null;
  for (const rad of [ra + PB / 2 + 8, ra + PB / 2 + 22, ra + PB / 2 + 40]) { for (const ang of [90, 75, 105, 60, 120, 135, 45, 150, 180, 200]) { const k = ang * Math.PI / 180, x = Math.round(cx + Math.cos(k) * rad - PB / 2), y = Math.round(cy - Math.sin(k) * rad - PB / 2); if (free(x, y)) { at = [x, y]; break; } } if (at) break; }
  if (!at) at = [Math.round(r.left + (r.width - PB) / 2), Math.max(4, Math.round(r.top - PB - 70))];
  b.style.left = at[0] + 'px'; b.style.top = at[1] + 'px'; b.style.right = 'auto'; b.style.bottom = 'auto';
}

export const quyen = {
  id: 'quyen',
  onZoneEnter(ctx) {
    ST.ctx = ctx; if (OFF) return; ST.fx.length = 0; ST.cast = null;
    ctx.quyen = {
      on: () => !OFF, lv: () => sq(ctx).lv, tier: () => tierOf(sq(ctx).lv), cdMul: () => cdMulOf(sq(ctx).lv), bonus: () => bonusOf(sq(ctx).lv),
      /* monsters.js: tên clip tay không cho đòn thứ step (0..2) — null nếu người chơi không có (dáng riêng…) → monsters dùng clip cũ */
      clip: step => { const p = ctx.S.player; if (!p || p.custom) return null; clips(p); const n = CLIPS[step] || CLIPS[0]; return p.hasAct && p.hasAct(n) ? n : null; },
      onHit: () => { addQ(ctx, 1); ST.fightT = ctx.S.time; ST.stats.punchHit++; },   /* monsters.strike: đòn tay không trúng */
      palmSlot: () => { const t = T(ctx), k = ctx.ki ? ctx.ki.get() : 7; return { icon: ICON.palm, name: t.palm, cd: ST.cd.palm, cdMax: SK.palm.cd * cdMulOf(sq(ctx).lv), dim: k < SK.palm.ki, tip: t.tipPalm(sq(ctx).lv) }; },
      press: () => palm(ctx),
    };
    hook(ctx); sq(ctx); PC56.mo = null; PC56.path = null; ctx.palm56 = mo => pcStart(ctx, mo); ctx.palm56In = mo => pcIn(ctx, mo); ctx.palm56Ground = mo => air56(ctx) && ground56(ctx, mo);   /* c56-chuongxuong */
    if (typeof window !== 'undefined') window.__quyen = { state: () => ({ ...sq(ctx), tier: tierOf(sq(ctx).lv), bonus: bonusOf(sq(ctx).lv), cdMul: +cdMulOf(sq(ctx).lv).toFixed(3), need: needOf(sq(ctx).lv), cd: { palm: +ST.cd.palm.toFixed(2) }, fx: ST.fx.length, cast: !!ST.cast, stats: { ...ST.stats } }),
      set: L => { const q = sq(ctx); q.lv = Math.max(1, Math.min(MAXQ, L | 0)); q.xp = 0; return q.lv; }, palm: () => palm(ctx), pc56: () => ({ on: !!PC56.mo, casts: PC56.casts, hp: PC56.mo ? PC56.mo.hp : null }), addQ: n => addQ(ctx, n) };
  },
  update(dt, ctx) {
    if (OFF || !ctx.quyen) return; hook(ctx);
    const p = ctx.S.player; if (p && !p.custom) clips(p);
    if (ST.cd.palm > 0) ST.cd.palm = Math.max(0, ST.cd.palm - dt); pcTick(ctx, dt);   /* c56-chuongxuong */
    if (ST.cast) {   /* giữ khung đẩy tay suốt lúc phun */
      const c = ST.cast; c.t += dt; const a = p && p.action;
      if (a && a.name === 'palm') { const f = (p.sheet.actions.palm && p.sheet.actions.palm.fps) || 10; a.t = c.t < SK.palm.wind ? Math.min(c.t / SK.palm.wind * 2, 1.9) / f : c.t < SK.palm.wind + SK.palm.fire ? 3.5 / f : Math.max(a.t, 4.6 / f); }
      if (c.t >= c.dur) { ST.cast = null; if (a && a.name === 'palm') p.action = null; }
    }
    for (let i = ST.fx.length - 1; i >= 0; i--) { ST.fx[i].I.update(dt); if (ST.fx[i].I.done) ST.fx.splice(i, 1); }
    try { palmBtn(ctx, dt); } catch (e) { console.error('quyen palmBtn', e); }
  },
  key(code, ctx) { return false; },   /* phím L đi qua hotbar (SKEYS) */
  drawables(ctx, cx, cy) {
    if (OFF || !ST.fx.length) return [];
    const g = ctx.g, out = [];
    for (const F of ST.fx) { const L0 = F.I.sc.layers || ['body']; if (L0.includes('ground')) out.push({ y: -1e9, f: () => F.I.blit(g, cx, cy, 'ground') }); if (L0.includes('body')) out.push({ y: F.y(), f: () => F.I.blit(g, cx, cy, 'body') }); }
    return out;
  },
  onZoneLeave() { ST.fx.length = 0; ST.cast = null; if (PBS.el) PBS.el.hidden = true; },
};
