/* pkthu32.js — c32-pkthu (04/11/2026): PK CÓ CHẤN THÚ. Anh yêu cầu 04/11: "khi PK nếu người chơi đang gọi Chấn Thú ra thì chúng sẽ đánh nhau với nhau,
   nếu không có Chấn Thú thì nó mới đánh người chơi là chủ Chấn Thú; cho phép người chơi đánh Chấn Thú đối thủ và dùng các skill lên Chấn Thú đối thủ luôn".
   · Chỉ khi CẢ HAI bật PK (pk.js). Một trong hai tắt → không ai đánh ai, kể cả Chấn Thú.
   · Mục tiêu giả (proxy) cho bộ não Chấn Thú đội (squad104.monList nối thêm A.list): đối thủ có Chấn Thú đang thả → mỗi con là 1 mục tiêu;
     không có con nào → chính người đó là mục tiêu. squad104.dealHit thấy mo.__pk32 → gọi hit() ở đây thay vì ctx.monsters.damage.
   · Mạng (không sửa máy chủ, tin gửi riêng 'to'): đòn lên Chấn Thú = 'pvu' {s: id con, k: pet|sword|fist|palm, d} → máy CHỦ con đó tự kiểm
     (cả 2 bật PK, khoảng cách, nhịp, trần) rồi ctx.squad104.hurt (×0,5 như PvP người) → trả 'pvuok'. Hết máu = kiệt sức về Ấn Chấn 15 s (cơ chế sẵn có).
     Chấn Thú đánh NGƯỜI = 'pvp' k:'pet' (pk.js chuyển sang onPet ở đây) → ctx.hero.hit → trả 'pvpok' (pk.js hiện số).
     Đòn Chấn Thú gom 0,25 s / mục tiêu thành 1 tin. Máu Chấn Thú đi kèm tin 'st' (coop.js: u[6]=hp, u[7]=max, u[8]=id).
   · Người chơi đánh Chấn Thú đối thủ: kiếm / đấm (phím E, nút A, bấm vào con đó) và Chưởng (quyen.js → pk.aim / pk.palmHit → ở đây).
   · Hiển thị: thanh máu đỏ trên đầu Chấn Thú đối thủ khi cả 2 bật PK, góc khoá TĨNH quanh con đang chọn, số sát thương. Móc test: window.__pkthu. */
import { NET } from './farm106.js';
import { SPECIES, SPECIES_EN } from './duel-data.js';

const CF = { mul: 0.5, reach: 28, range: 260, petMax: 210, meleeMax: 50, palmMax: 170, petGap: 0.2, meleeGap: 0.22, palmGap: 1.0, petCap: 300, meleeCap: 220, palmCap: 420, flush: 0.25, grace: 1.5, warnT: 6 };
const TX = {
  vi: { hit: n => `⚔ ${n}`, hitU: (n, s) => `⚔ ${n} đang đánh ${s} của bạn (PK)`, koU: (s, n) => `Bạn đã hạ ${s} của ${n}!`, petHit: n => `⚔ Chấn Thú của ${n} đang tấn công bạn (PK)`, of: (s, n) => `${s} (${n})` },
  en: { hit: n => `⚔ ${n}`, hitU: (n, s) => `⚔ ${n} is attacking your ${s} (PK)`, koU: (s, n) => `You knocked out ${n}'s ${s}!`, petHit: n => `⚔ ${n}'s Quake Beast is attacking you (PK)`, of: (s, n) => `${s} (${n})` },
};
const T = ctx => TX[ctx.lang && ctx.lang() === 'en' ? 'en' : 'vi'];
const A = { ctx: null, prox: new Map(), list: [], acc: new Map(), accT: 0, cd: 0, combo: 0, comboT: 0, q: [], sel: null, palm: new Map(), palmT: 0, last: new Map(), warnT: -99, outSince: null,
  n: { tx: 0, rx: 0, ok: 0, rej: 0, dmgIn: 0, dmgOut: 0, koU: 0, koByU: 0, petTx: 0, petRx: 0 }, log: [] };
const now = () => (A.ctx ? A.ctx.S.time : 0);
const lg = e => { A.log.push({ t: +now().toFixed(2), ...e }); if (A.log.length > 300) A.log.shift(); };
const api = () => NET.pkApi || null;
const live = () => { const a = api(); return !!(a && a.on()); };
const peers = () => { const a = api(); return a ? a.peers() : []; };
const peerOf = id => peers().find(P => P.id === id) || null;
const pkOf = P => !!(P && P.st && P.st.pk);
const meOn = ctx => !!(ctx.pk && ctx.pk.isOn && ctx.pk.isOn());
const fainted = ctx => !!(ctx.hero && ctx.hero.fainted);
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const toast = (ctx, t) => { try { ctx.toast(t); } catch (e) { } };
const spName = (ctx, sp) => (ctx.lang && ctx.lang() === 'en' && SPECIES_EN[sp]) || (SPECIES[sp] ? SPECIES[sp].name : sp);
const ghostOf = (P, uid) => { if (!P) return null; for (const u of P.units.values()) if (u.uid === uid) return u; return null; };
const fight = ctx => { try { if (ctx.pk && ctx.pk.fight) ctx.pk.fight(); } catch (e) { } };
/* Chấn Thú của mình đang hiện ngoài map và có gửi qua mạng (Elyziuma / Ubam không có u.f → không tính) */
const myNet = ctx => { const q = ctx.squad104; if (!q || !q.units) return []; try { return q.units().filter(u => u.f && !u.ko && u.onField()); } catch (e) { return []; } };

/* ---------- mục tiêu giả cho bộ não Chấn Thú ---------- */
function mkProx(k, P, gu) {
  const o = { __pk32: k, __pk: k, pid: P.id, uid: gu ? gu.uid : null, unit: !!gu, sp: gu ? (gu.sp || gu.e.sp) : null, c: { h: gu ? 14 : 22, w: 12, vi: '', en: '' }, angry: true, hp: 1, max: 1, id: 'pk32:' + k, lx: 0, ly: 0, hpT: -1 };
  o.live = () => A.prox.get(k) === o && o.hp > 0;
  const pos = () => { const Q = peerOf(o.pid); const e = Q ? (o.unit ? (ghostOf(Q, o.uid) || {}).e : Q.ent) : null; if (e) { o.lx = e.x; o.ly = e.y; } };
  Object.defineProperty(o, 'x', { get() { pos(); return o.lx; }, set() { }, enumerable: true });
  Object.defineProperty(o, 'y', { get() { pos(); return o.ly; }, set() { }, enumerable: true });
  A.prox.set(k, o); return o;
}
function build(ctx) {
  const keep = new Set(), p = ctx.S.player;
  if (p && meOn(ctx) && !fainted(ctx) && ctx.S.mode === 'play') for (const P of peers()) {
    if (!pkOf(P) || P.ko) continue;
    if (P.units.size) {   /* đối thủ có Chấn Thú đang thả → chỉ đánh Chấn Thú */
      for (const gu of P.units.values()) {
        if (gu.uid == null || !(gu.hp > 0) || dist(gu.e, p) > CF.range) continue; const k = 'u:' + P.id + ':' + gu.uid; keep.add(k);
        const o = A.prox.get(k) || mkProx(k, P, gu); o.max = Math.max(1, gu.hm || 100); if (!(now() < o.hpT)) o.hp = gu.hp; o.c.vi = o.c.en = T(ctx).of(spName(ctx, o.sp), P.name);
      }
    } else if (dist(P.ent, p) <= CF.range) {   /* không có Chấn Thú → đánh chính người đó */
      const k = 'p:' + P.id; keep.add(k); const o = A.prox.get(k) || mkProx(k, P, null), s = P.st || {};
      o.max = Math.max(1, s.hm | 0 || 100); if (!(now() < o.hpT)) o.hp = s.hm ? Math.max(0, s.hp | 0) : 1; o.c.vi = o.c.en = P.name;
    }
  }
  for (const [k, o] of A.prox) if (!keep.has(k)) { o.hp = 0; o.dead = true; A.prox.delete(k); }
  A.list = [...A.prox.values()].filter(o => o.hp > 0);
  if (A.sel && !A.prox.has(A.sel)) A.sel = null;
}

/* ---------- đòn Chấn Thú của mình (squad104.dealHit) ---------- */
function hit(ctx, u, mo, dmg, tag) {
  if (!mo || !mo.__pk32 || !A.prox.has(mo.__pk32) || !meOn(ctx)) return false;
  const r = A.acc.get(mo.__pk32) || { d: 0, n: 0 }; r.d += Math.max(0, +dmg || 0); r.n++; A.acc.set(mo.__pk32, r); if (!(A.accT > 0)) A.accT = CF.flush;
  lg({ ev: 'pet', id: u && u.id, k: mo.__pk32, d: Math.round(dmg), tag }); fight(ctx); return true;
}
function flushAcc(ctx) {
  const a = api(), p = ctx.S.player; A.accT = 0; if (!a || !p) { A.acc.clear(); return; }
  for (const [k, r] of A.acc) {
    const o = A.prox.get(k); if (!o) continue; const d = Math.max(1, Math.round(r.d));
    const msg = o.unit ? { t: 'pvu', to: o.pid, s: o.uid, k: 'pet', d, x: Math.round(p.x), y: Math.round(p.y) } : { t: 'pvp', to: o.pid, k: 'pet', d, fin: 0, x: Math.round(p.x), y: Math.round(p.y) };
    if (a.send(msg)) { A.n.tx++; A.n.petTx++; lg({ ev: 'tx', k, kind: 'pet', d }); }
  }
  A.acc.clear();
}

/* ---------- người chơi đánh Chấn Thú đối thủ: kiếm / đấm ---------- */
function weapon(ctx) {
  if (ctx.holding && ctx.holding('sword')) return 'sword';
  if (ctx.quyen && ctx.quyen.on() && ctx.held && !ctx.held()) return 'fist';
  return null;
}
const unitProx = () => A.list.filter(o => o.unit);
function canHit(ctx, o) { return !!o && o.unit && o.live() && meOn(ctx) && live() && !fainted(ctx) && ctx.S.mode === 'play'; }
function swing(ctx, o) {
  const p = ctx.S.player; if (!p || A.cd > 0 || !canHit(ctx, o)) return false;
  const w = weapon(ctx); if (!w) return false;
  if (p.faceTo) p.faceTo(o.x, o.y);
  const step = A.comboT > 0 ? (A.combo + 1) % 3 : 0, want = ['attack', 'attack2', 'attack3'][step]; A.combo = step; A.comboT = 0.8;
  const clip = w === 'fist' ? ctx.quyen.clip(step) : (p.hasAct && p.hasAct(want) ? want : p.hasAct && p.hasAct('attack') ? 'attack' : null);
  if (clip && !p.custom) p.act(clip, 0);
  const sh = clip && p.sheet && p.sheet.actions[clip], at = sh && sh.impact != null ? sh.impact / (sh.fps || 12) : 0.18;
  const fin = clip === 'attack3' || clip === 'q_punch3';
  A.cd = (fin ? 0.62 : 0.45) * (w === 'fist' ? ctx.quyen.cdMul() : 1);
  A.q.push({ k: o.__pk32, t: at, fin, w, step }); A.sel = o.__pk32;
  return true;
}
function rawDmg(ctx, w) {
  const h = ctx.hero; if (!h) return 10;
  const add = w === 'fist' ? ctx.quyen.bonus() : h.weaponBonus(ctx.tool ? ctx.tool.tier('sword') : 0);
  return (h.atk + add) * (ctx.atkMul ? ctx.atkMul() : 1);
}
function landMelee(ctx, Q) {
  const o = A.prox.get(Q.k), p = ctx.S.player; if (!o || !canHit(ctx, o)) return;
  if (dist(o, p) > CF.reach + 12) { lg({ ev: 'miss', k: Q.k, d: Math.round(dist(o, p)) }); return; }
  let d = rawDmg(ctx, Q.w); if (Q.fin) d *= 1.5; d = Math.max(1, Math.round(d));
  const a = api(); if (!a || !a.send({ t: 'pvu', to: o.pid, s: o.uid, k: Q.w, d, fin: Q.fin ? 1 : 0, x: Math.round(p.x), y: Math.round(p.y) })) return;
  A.n.tx++; fight(ctx); lg({ ev: 'tx', k: Q.k, kind: Q.w, d });
  const tier = Q.w === 'sword' ? (ctx.tool ? ctx.tool.tier('sword') : 0) : ctx.quyen.tier(), ox = o.x, oy = o.y;
  try { if (ctx.wfx) ctx.wfx('hit', ox, oy, { dir: { x: ox - p.x, y: oy - p.y }, fin: Q.fin, fist: Q.w === 'fist', step: Q.step, tier, h: 14, follow: () => ({ x: o.x, y: o.y }) }); } catch (er) { }
  ctx.sfx && ctx.sfx('hit');
}
/* Chưởng: pk.palmHit gọi sang (cùng hình học), cộng dồn, gửi lúc nổ */
function palmHit(ctx, h, o0, a0, ca, sa, pw) {
  if (!meOn(ctx) || !live()) return;
  for (const o of unitProx()) {
    if (!canHit(ctx, o)) continue; const ex = o.x, ey = o.y;
    const dx = ex - o0.x, dy = ey - 6 - o0.y, al = dx * ca + dy * sa, pe = Math.abs(-dx * sa + dy * ca);
    const hitOk = h.k === 'tick' ? (al > -2 && al < 96 && pe < 7 + al * 0.35) : Math.hypot(ex - a0.x, ey - 8 - a0.y) < 18;
    if (!hitOk) continue;
    const r = A.palm.get(o.__pk32) || { d: 0 }; r.d += pw * (h.k === 'tick' ? 0.3 : 1.4); A.palm.set(o.__pk32, r);
  }
  A.palmT = 1.6; if (h.k === 'boom') flushPalm(ctx);
}
function flushPalm(ctx) {
  const p = ctx.S.player, a = api();
  for (const [k, r] of A.palm) { const o = A.prox.get(k); if (!o || !a || !p) continue; const d = Math.max(1, Math.round(r.d));
    if (a.send({ t: 'pvu', to: o.pid, s: o.uid, k: 'palm', d, fin: 1, x: Math.round(p.x), y: Math.round(p.y) })) { A.n.tx++; fight(ctx); lg({ ev: 'tx', k, kind: 'palm', d }); } }
  A.palm.clear(); A.palmT = 0;
}
function aim(ctx, p, maxD) {
  if (!meOn(ctx) || !live()) return null; let best = null, bd = maxD;
  for (const o of unitProx()) { if (!canHit(ctx, o)) continue; const d = dist(o, p) - (o.__pk32 === A.sel ? 30 : 0); if (d < bd) { bd = d; best = o; } }
  return best;
}

/* ---------- nhận đòn (máy CHỦ con bị đánh tự kiểm) ---------- */
function gate(ctx, m, P, key, gap) {
  const L = A.last.get(key) || -99; if (now() - L < gap) return false; A.last.set(key, now()); return true;
}
function srcDist(P, to, m, k) {   /* khoảng cách nguồn đòn tới đích theo bản sao trên máy mình */
  if (k === 'pet') { let b = 1e9; for (const gu of P.units.values()) b = Math.min(b, dist(gu.e, to)); return b; }
  return Math.min(dist(P.ent, to), Number.isFinite(+m.x) ? Math.hypot(+m.x - to.x, +m.y - to.y) : 1e9);
}
function onMsg(ctx, m) {
  const a = api(); if (!a) return;
  if (m.t === 'pvuok') {
    const k = 'u:' + m.f + ':' + m.s, o = A.prox.get(k), P = peerOf(m.f); A.n.ok++;
    if (m.ok) { A.n.dmgOut += +m.d || 0; if (o) { o.hp = Math.max(0, +m.hp || 0); o.hpT = now() + 0.8; const gu = ghostOf(P, m.s); if (gu) gu.e.flash = 0.12; if (ctx.pop) ctx.pop(o.x, o.y - 18, `-${m.d}`, '#ffb36a'); }
      if (m.ko) { A.n.koU++; toast(ctx, T(ctx).koU(o ? spName(ctx, o.sp) : '?', P ? P.name : '?')); if (o) o.hp = 0; } }
    else lg({ ev: 'rej-back', k, why: m.why });
    return;
  }
  if (m.t !== 'pvu') return;
  A.n.rx++;
  const P = peerOf(m.f), k = ['palm', 'fist', 'pet'].includes(m.k) ? m.k : 'sword';
  const rej = why => { A.n.rej++; lg({ ev: 'rej', f: m.f, s: m.s, k, why }); a.send({ t: 'pvuok', to: m.f, s: m.s, ok: 0, why }); };
  if (!P) return rej('gone');
  if (!meOn(ctx) || !pkOf(P)) return rej('off');
  if (P.ko || ctx.S.mode !== 'play') return rej('state');
  const q = ctx.squad104, u = myNet(ctx).find(v => v.id === m.s); if (!q || !u) return rej('nou');
  const far = srcDist(P, u.f, m, k), lim = k === 'pet' ? CF.petMax : k === 'palm' ? CF.palmMax : CF.meleeMax;
  if (far > lim) return rej('far');
  const grp = k === 'pet' ? 'pet' : k === 'palm' ? 'palm' : 'mel';
  if (!gate(ctx, m, P, m.f + '|' + m.s + '|' + grp, k === 'pet' ? CF.petGap : k === 'palm' ? CF.palmGap : CF.meleeGap)) return rej('rate');
  const raw = Math.min(k === 'pet' ? CF.petCap : k === 'palm' ? CF.palmCap : CF.meleeCap, Math.max(1, +m.d || 0)), d = Math.max(1, Math.round(raw * CF.mul));
  const hp0 = u.hp; try { q.hurt(u, d, { x: P.ent.x, y: P.ent.y }); } catch (e) { return rej('err'); }
  const ko = !!u.ko, dd = Math.max(0, Math.round(ko ? hp0 : hp0 - u.hp)); fight(ctx);
  A.n.dmgIn += dd; if (ko) A.n.koByU++;
  if (now() - A.warnT > CF.warnT) { A.warnT = now(); toast(ctx, T(ctx).hitU(P.name, spName(ctx, u.sp))); }
  lg({ ev: 'rx', f: m.f, s: m.s, k, d: dd, ko, hp: Math.round(u.hp) });
  a.send({ t: 'pvuok', to: m.f, s: m.s, ok: 1, d: dd, ko: ko ? 1 : 0, hp: ko ? 0 : Math.max(0, Math.ceil(u.hp)) });
}
/* Chấn Thú đối thủ đánh NGƯỜI mình (pk.js chuyển tin 'pvp' k:'pet' sang đây) — chỉ khi mình không có Chấn Thú nào đang thả */
function onPet(ctx, m) {
  const a = api(); if (!a) return; A.n.petRx++;
  const P = peerOf(m.f), p = ctx.S.player;
  const rej = why => { A.n.rej++; lg({ ev: 'rejP', f: m.f, why }); a.send({ t: 'pvpok', to: m.f, ok: 0, why }); };
  if (!P || !p) return rej('gone');
  if (!meOn(ctx) || !pkOf(P)) return rej('off');
  if (P.ko || fainted(ctx) || ctx.S.mode !== 'play') return rej('state');
  if (A.reviveT != null && now() - A.reviveT < 4) return rej('spawn');   /* c39: vừa hồi sau ngất → 4 s Chấn Thú đối thủ không đánh được (thú tự động, không như người phải đi tới) */
  if (myNet(ctx).length && A.outSince != null && now() - A.outSince > CF.grace) return rej('pets');
  if (srcDist(P, p, m, 'pet') > CF.petMax) return rej('far');
  if (!gate(ctx, m, P, m.f + '|me|pet', CF.petGap)) return rej('rate');
  const raw = Math.min(CF.petCap, Math.max(1, +m.d || 0)), d = Math.max(1, Math.round(raw * CF.mul));
  const ok = !!(ctx.hero && ctx.hero.hit(d)); fight(ctx);
  if (!ok) { lg({ ev: 'rxP-inv', f: m.f }); a.send({ t: 'pvpok', to: m.f, ok: 0, why: 'inv' }); return; }
  const ko = fainted(ctx); A.n.dmgIn += d;
  if (now() - A.warnT > CF.warnT) { A.warnT = now(); toast(ctx, T(ctx).petHit(P.name)); }
  lg({ ev: 'rxP', f: m.f, d, ko });
  a.send({ t: 'pvpok', to: m.f, ok: 1, d, ko: ko ? 1 : 0, hp: Math.max(0, Math.ceil(ctx.hero.hp)) });
}

/* ---------- chọn / bấm vào Chấn Thú đối thủ ---------- */
function unitAt(mt) {
  let best = null, bd = 1e9;
  for (const o of unitProx()) { const x = o.x, y = o.y; if (Math.abs(mt.wx - x) < 11 && mt.wy > y - 22 && mt.wy < y + 5) { const d = Math.hypot(mt.wx - x, mt.wy - (y - 8)); if (d < bd) { bd = d; best = o; } } }
  if (best) for (const o of A.list) { if (o.unit) continue; if (Math.abs(mt.wx - o.x) < 9 && mt.wy > o.y - 30 && mt.wy < o.y + 4 && Math.hypot(mt.wx - o.x, mt.wy - (o.y - 12)) <= bd) return null; }   /* c39: chạm trúng cả người lẫn Chấn Thú đứng sát → người gần chỗ chạm hơn thì nhường c17 chọn NGƯỜI (bảng thông tin) */
  return best;
}
function clickUnit(ctx, mt) {
  const o = unitAt(mt); if (!o) return false; const p = ctx.S.player;
  if (canHit(ctx, o) && weapon(ctx) && p && dist(o, p) <= CF.reach * 1.6) { A.sel = o.__pk32; swing(ctx, o); return true; }
  A.sel = A.sel === o.__pk32 ? null : o.__pk32; if (p) p.autoPath = null; return true;
}
let hooked = false;
function hook(ctx) {
  if (hooked || typeof window === 'undefined') return; hooked = true;
  window.addEventListener('pointerdown', e => {
    const c = A.ctx || ctx, cv = document.getElementById('c');
    if (!cv || e.target !== cv || e.button !== 0 || c.S.mode !== 'play' || !live() || !meOn(c) || !c.cam || !c.VW || !A.list.length) return;
    const r = cv.getBoundingClientRect(), k = r.width / c.VW, mt = { wx: c.cam.cx + (e.clientX - r.left) / k, wy: c.cam.cy + (e.clientY - r.top) / k };
    if (!unitAt(mt)) return;
    e.preventDefault(); e.stopImmediatePropagation(); clickUnit(c, mt);
  }, true);
  window.addEventListener('keydown', e => { if (e.code === 'Escape' && A.sel) A.sel = null; }, true);
}

/* ---------- vẽ: thanh máu đỏ + góc khoá TĨNH ---------- */
function headOff(e) { return (e.sp === 'rocky' || e.sp === 'rockyl') ? 36 : e.tier === 'l' ? 34 : e.tier === 's' ? 22 : 26; }
function drawUI(ug, ctx, cx, cy, scale) {
  if (ctx.S.mode !== 'play' || !meOn(ctx) || !live()) return; const ob = globalThis.__ob91, su = ctx.scaleUI || scale, R = globalThis.__R89 || Math.round;
  for (const P of peers()) {
    if (!pkOf(P) || P.ko) continue;
    for (const gu of P.units.values()) {
      if (!(gu.hm > 0)) continue; const e = gu.e, w = Math.round(su * 11), sx = (e.x - cx) * scale, sy = (e.y - cy - headOff(e)) * scale, f = Math.max(0, Math.min(1, gu.hp / gu.hm));
      if (sx < -40 || sy < -40 || sx > ug.canvas.width + 40 || sy > ug.canvas.height + 40) continue;
      const o = A.prox.get('u:' + P.id + ':' + gu.uid), ff = o && now() < o.hpT ? Math.max(0, Math.min(1, o.hp / o.max)) : f;
      if (ob) ob(ug, R(sx - w / 2), R(sy - su * 2.6), w, ff, 'foe', su); else { ug.fillStyle = '#0b0d1e'; ug.fillRect(sx - w / 2, sy, w, 4); ug.fillStyle = '#e84a3a'; ug.fillRect(sx - w / 2 + 1, sy + 1, (w - 2) * ff, 2); }
    }
  }
  const o = A.sel ? A.prox.get(A.sel) : null;
  if (o && o.unit) {   /* góc khoá 4 góc TĨNH (kiểu nhắm quái), không nhấp nháy */
    const gu = ghostOf(peerOf(o.pid), o.uid); if (!gu) return; const e = gu.e, hh = headOff(e) - 4;
    const x0 = R((e.x - cx - 10) * scale), x1 = R((e.x - cx + 10) * scale), y0 = R((e.y - cy - hh) * scale), y1 = R((e.y - cy + 3) * scale), L0 = Math.max(4, R(su * 2.2)), t = Math.max(2, R(su * 0.6));
    ug.save(); ug.fillStyle = '#1a1020';
    for (const [x, y, dx, dy] of [[x0, y0, 1, 1], [x1, y0, -1, 1], [x0, y1, 1, -1], [x1, y1, -1, -1]]) { ug.fillRect(dx > 0 ? x - 1 : x - L0 + 1, dy > 0 ? y - 1 : y - t + 1, L0 + 0, t + 0); ug.fillRect(dx > 0 ? x - 1 : x - t + 1, dy > 0 ? y - 1 : y - L0 + 1, t, L0); }
    ug.fillStyle = '#ff6a5a';
    for (const [x, y, dx, dy] of [[x0, y0, 1, 1], [x1, y0, -1, 1], [x0, y1, 1, -1], [x1, y1, -1, -1]]) { ug.fillRect(dx > 0 ? x : x - L0 + 2, dy > 0 ? y : y - t + 2, L0 - 2, t - 1); ug.fillRect(dx > 0 ? x : x - t + 2, dy > 0 ? y : y - L0 + 2, t - 1, L0 - 2); }
    ug.restore();
  }
}

export const pkthu32 = {
  id: 'pkthu32',
  always: true,
  onZoneEnter(ctx) {
    A.ctx = ctx; A.q.length = 0; A.palm.clear(); A.acc.clear(); A.prox.clear(); A.list = []; A.sel = null;
    ctx.pkthu = { foes: () => A.list, hit: (u, mo, d, tag) => hit(ctx, u, mo, d, tag), onMsg: m => onMsg(ctx, m), onPet: m => onPet(ctx, m),
      palmHit: (h, o, a, ca, sa, pw) => palmHit(ctx, h, o, a, ca, sa, pw), aim: (p, maxD) => aim(ctx, p, maxD) };
    if (typeof window !== 'undefined') window.__pkthu = {
      state: () => ({ me: meOn(ctx), live: live(), sel: A.sel, cd: +A.cd.toFixed(2), n: { ...A.n }, outSince: A.outSince,
        prox: A.list.map(o => ({ k: o.__pk32, unit: o.unit, sp: o.sp, hp: Math.round(o.hp), max: o.max, x: Math.round(o.x), y: Math.round(o.y) })),
        mine: myNet(ctx).map(u => ({ id: u.id, sp: u.sp, hp: Math.round(u.hp), max: u.max, x: Math.round(u.f.x), y: Math.round(u.f.y) })) }),
      log: () => A.log.slice(), cfg: CF, select: k => { A.sel = A.prox.has(k) ? k : null; return A.sel; }, swing: k => swing(ctx, A.prox.get(k || A.sel)),
      raw: m => { const a = api(); return !!(a && a.send(m)); },
    };
    hook(ctx);
  },
  onZoneLeave() { A.q.length = 0; A.palm.clear(); A.acc.clear(); for (const o of A.prox.values()) o.hp = 0; A.prox.clear(); A.list = []; A.sel = null; },
  update(dt, ctx) {
    A.ctx = ctx; if (A.cd > 0) A.cd -= dt; if (A.comboT > 0) A.comboT -= dt;
    { const f = fainted(ctx); if (A.wasKo && !f) A.reviveT = now(); A.wasKo = f; }   /* c39: mốc hồi sau ngất */
    const mine = myNet(ctx).length; if (mine) { if (A.outSince == null) A.outSince = now(); } else A.outSince = null;
    build(ctx);
    for (const P of peers()) for (const gu of P.units.values()) if (gu.e.flash > 0) gu.e.flash = Math.max(0, gu.e.flash - dt);
    for (let i = A.q.length - 1; i >= 0; i--) { const Q = A.q[i]; Q.t -= dt; if (Q.t <= 0) { A.q.splice(i, 1); landMelee(ctx, Q); } }
    if (A.accT > 0) { A.accT -= dt; if (A.accT <= 0) flushAcc(ctx); }
    if (A.palmT > 0) { A.palmT -= dt; if (A.palmT <= 0 && A.palm.size) flushPalm(ctx); }
  },
  drawUI,
  /* phím E / nút A / ô kiếm: Chấn Thú đối thủ trong tầm thành mục tiêu đánh */
  near(ctx) {
    if (!meOn(ctx) || !live() || fainted(ctx) || !A.list.length) return null;
    const p = ctx.S.player; let best = null, bd = CF.reach * 1.6;
    for (const o of unitProx()) { if (!canHit(ctx, o)) continue; const d = dist(o, p) - (o.__pk32 === A.sel ? 8 : 0); if (d < bd) { bd = d; best = o; } }
    if (!best) return null; const t = T(ctx), w = weapon(ctx), nm = spName(ctx, best.sp), x = best.x, y = best.y;
    if (!w) return { label: ctx.needHold ? ctx.needHold('sword') : t.hit(nm), x, y: y - 4, limit: CF.reach * 1.6, priority: 0.84, need: true, needId: 'sword', cursor: 'tool', mouse: false, data: { need: true } };
    return { label: t.hit(nm), x, y: y - 4, limit: CF.reach * 1.6, priority: best.__pk32 === A.sel ? 3.96 : 0.86, cursor: 'tool', mouse: false, data: { fight: true, pk32: best.__pk32 } };
  },
  interact(ctx, cand) { const d = cand && cand.data; if (d && d.pk32) swing(ctx, A.prox.get(d.pk32)); },
  onClick(ctx, mt) { if (!mt || !A.list.length) return false; if (!unitAt(mt)) { return false; } return clickUnit(ctx, mt); },
};
