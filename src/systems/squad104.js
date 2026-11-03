/* p95s: cỡ 1,5× người (anh 2026-11-02) */
/* squad104.js — plan-104: BỘ QUẢN LÝ CHUNG cho Chấn Thú thả ra ngoài map (thay giới hạn 1 con của comp79).
   · Thả tối đa 3 con bất kỳ trong đội (save.sys.p104.out). Mỗi loài cắm 1 "bộ não loài": Elyziuma = elyz95 (5 chiêu riêng, nghe lệnh qua ctx.squad104);
     loài khác (kể cả Rocky golem / Rocky Jr) = bộ não chung ở đây: đi theo, cắn, 1 chiêu tấn công + 1 chiêu bảo vệ lấy từ chiêu thật trong duel-data.
   · Lệnh: G = tấn công mục tiêu đang khoá (cả đội / con đang chọn) · U = đổi chế độ Bảo vệ → Tự do → Theo sau · H = chiêu con đang chọn · J = thả / thu.
   · BẢO VỆ: chấm điểm đe doạ (con đang đánh người chơi cao nhất), đứng chắn giữa quái và người; quái bị đánh thì quay sang đánh Chấn Thú (gây hấn);
     ĐỠ ĐÒN: đòn / đạn sắp trúng người → con gần nhất lướt ra chắn, nhận ×0,5 (khiên PixelLab TĨNH 0,4 s); chiêu bảo vệ (khiên phủ người / khống chế kẻ đánh);
     người < 30 % máu: cả đội quây về. Đấu Chấn Thú TẠI CHỖ: quái quanh người bị đẩy ra + máu người không dưới 1 (không áp với trùm).
   · Thanh đội (DOM, khung gỗ của game) ngay trên-trái cụm HUD — chỉ máy tính. Test: window.__sq. */
import { SPECIES, MOVES, MOVE_NAME_EN } from './duel-data.js';
import * as FX from './fx78.js';
import { SHADOW, shadowFor } from './shadow.js';
import * as D107 from './dash107.js';   /* plan-107: LAO NHANH tới */
import * as TGT from './target.js';

/* p104rk: BỘ NÃO LOÀI Rocky golem = rktk.js (p90, 6 chiêu: Nắm Đấm Đá Bay · Địa Chấn Khối · Tách Khối Bão Đá · Khiên Ngực Seismic · Lao Thạch Cự · Nắm Đấm Đá Khổng Lồ).
   Chỉ nạp khi chuỗi có loài 'rocky'. Chế độ Bảo vệ: người chơi bị đánh → Rocky lướt ra chắn + Khiên Ngực Seismic PHỦ người chơi (đòn ×0,2, phản đòn ×1,5). */
let RK = null; if (MOVES.rk_fist) import('./rktk.js').then(m => { RK = m; }, e => console.warn('squad104: không nạp được rktk', e));
const rkOn = u => !!RK && !!u && u.sp === 'rocky';
function rkSync(f) { const ax = Math.abs(f.fx || 0), ay = Math.abs(f.fy || 0); f.dir = (f.fx || 0) < 0 ? -1 : 1; f.face = ay > ax * 1.2 ? (f.fy > 0 ? 'ds' : 'dn') : 'side'; }
function rkPt(u) { const p = u.__pt || (u.__pt = { golem: true }); p.hp = u.hp; p.koT = 0; return p; }
function rkPool(ctx, u, fo) { const p = ctx.S.player, f = u.f; if (!f) return []; return monList(ctx).filter(mo => alive(mo) && !(mo.c && mo.c.fct && !mo.angry) && (!(mo.c && mo.c.boss) || mo === fo) && (hyp(mo, p) < 150 || hyp(mo, f) < 190)); }
function rkH(ctx, u) { return u.__H || (u.__H = { ctx, pet: () => rkPt(u), ent: () => u.f, stats: () => ({ max: u.max }), atk: () => Math.max(12, ((u.f && u.f.st && u.f.st.atk) || 40) * 0.35), mons: () => rkPool(ctx, u, focusOf(u.id)),
  deal: (mo, dmg, kb) => { if (u.f) dealHit(ctx, u, mo, dmg, kb || 0, 'rk'); }, face8: (e, dx, dy) => { face(e, e.x + dx, e.y + dy); rkSync(e); },
  passable: (x, y) => !(ctx.isSolid && ctx.isSolid(ctx.S.map, Math.floor(x / 16), Math.floor(y / 16))), origin: (pt, e, ang) => RK.originOf(e, ang), dust: () => { }, quake: s => { if (ctx.quake && typeof location !== 'undefined' && /[?&]quake113=1/.test(location.search)) ctx.quake(s); } }); }
function rkPose(ctx, f) { const P = f.tkPose; if (!P || !ctx.ldKit) return; const clip = P.clip === 'punch' ? 'atk' : P.clip === 'ha' ? 'cast' : (ctx.ldKit.has && ctx.ldKit.has(f, P.clip) ? P.clip : 'cast');   /* p115: tư thế riêng từng chiêu */ if (f.clip !== clip) f.clip = clip; f.ct = P.prog * Math.max(0.2, ctx.ldKit.clipT(f, clip)) * 0.98; }
function rkTick(ctx, u, dt) {
  const f = u.f, p = ctx.S.player, H = rkH(ctx, u), pt = rkPt(u); rkSync(f); u.cd.skill = 99; u.cd.guard = 99;   /* 6 chiêu riêng thay chiêu chung */
  const md = modeOf(ctx, u.id), fo = focusOf(u.id); if (md === 'follow' && !fo) return false;
  const dbg = RK.debug();
  if (!fo && (md === 'guard' || ST.rallyOn) && danger(ctx) && !dbg.cast && !(dbg.cd.shield > 0) && !(now() < (ST.rkShUntil || 0))) {
    const att = hostileNear(ctx, p.x, p.y, 60) || rangedNear(ctx, p, 170);
    if (att) { const dd = hyp(att, p) || 1, R = Math.min(reachOf(u), dd * 0.7); if (hyp(f, p) > R + 8) startDash(ctx, u, p.x + (att.x - p.x) / dd * R, p.y + (att.y - p.y) / dd * R * 0.75);
      RK.force(ctx, pt, f, 'shield', att, H); const T0 = RK.SK.shield.dur + 0.4; ST.rkShUntil = now() + T0; ST.shieldT = Math.max(ST.shieldT, T0);
      ST.n.shield++; ST.n.guardSk++; log({ ev: 'guardSk', id: u.id, kind: 'rkshield', mv: 'rk_shield' }); rkPose(ctx, f); f.tkWas = true; return true; } }
  const t0 = fo || pickTarget(ctx, u); u.tgt = t0;
  if (RK.tick(ctx, pt, f, t0, rkPool(ctx, u, fo), dt, H)) { rkPose(ctx, f); f.tkWas = true; return true; }
  if (f.tkWas) { f.tkWas = false; f.clip = 'idle'; f.ct = 0; }
  return false;
}
function rkUpd(ctx, u, dt) { rkSync(u.f); try { RK.update(ctx, dt, rkH(ctx, u)); } catch (e) { console.error('rktk', e); } }
function rkDraw(ctx, out, cx, cy) { for (const u of ST.U.values()) if (rkOn(u) && u.f && !u.ko) { RK.drawables(ctx, out, cx, cy, rkH(ctx, u)); break; } }
function rkShieldHit(ctx, att, raw) {   /* người chơi trúng đòn trong lúc Khiên Ngực Seismic: phản đòn lên kẻ đánh */
  if (!(now() < (ST.rkShUntil || 0))) return false; const u = [...ST.U.values()].find(v => rkOn(v) && v.f && !v.ko); if (!u) return false;
  if (now() - (ST.rkLast || -9) < 0.55) return true;   /* trong lúc người chơi đang miễn đòn: chỉ giảm, không đếm / phản lại */
  ST.rkLast = now(); if (att && alive(att)) rkH(ctx, u).deal(att, raw * RK.SK.shield.refl, 0); ST.n.rkShield = (ST.n.rkShield || 0) + 1; return true;
}
if (typeof window !== 'undefined') window.__sqrk = () => (RK ? { ...RK.debug(), shieldOn: now() < (ST.rkShUntil || 0) } : null);

const MAXN = 3;
const vi = ctx => ctx.lang() !== 'en';
const duelOn = ctx => !!(ctx.duel && ctx.duel.active && ctx.duel.active());
const duelLocal = ctx => duelOn(ctx) && ctx.S.mode === 'play';   /* đấu tại chỗ: người vẫn đứng trên map, quái vẫn chạy */
const hyp = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const MODES = ['guard', 'free', 'follow'];
const T = {
  vi: { mode: { guard: 'Bảo vệ', free: 'Tấn công tự do', follow: 'Theo sau' }, all: 'Cả đội', out: n => `Thả ${n}!`, back: n => `${n} về Ấn Chấn`, full: `Đã thả đủ ${MAXN} Chấn Thú — thu bớt 1 con (J hoặc chuột phải ô)`,
    none: 'Chưa có Chấn Thú — nhận con đầu tiên ở bệ Chấn Thú trong Làng', busy: 'Đang đấu — chưa đổi được', needLock: 'Khoá mục tiêu trước (Tab / bấm vào quái) rồi bấm G', noneOut: 'Chưa thả Chấn Thú nào (J)',
    atk: (a, n) => `${a}: tấn công ${n}!`, setMode: (a, m) => `${a} → ${m}`, ko: n => `${n} kiệt sức — về Ấn Chấn nghỉ 15 giây`, rest: n => `${n} đã hồi sức`, cd: n => `${n} chưa hồi chiêu`, noTgt: 'Không có đối thủ quanh đây', block: 'ĐỠ!', allBack: 'Thu cả đội về Ấn Chấn',
    tipPort: (n, o) => `${n} — bấm: chọn để ra lệnh riêng · chuột phải: ${o ? 'thu về' : 'thả ra'}`, tipAll: 'Cả đội — lệnh áp cho mọi con đang thả', tipAtk: 'Tấn công mục tiêu đang khoá (G)', tipMode: m => `Chế độ: ${m} (U đổi)`, tipKey: 'J thả/thu · G tấn công · U chế độ · H chiêu', rested: s => `nghỉ ${s}s`, lowHp: 'Bạn yếu máu — cả đội quây về bảo vệ!' },
  en: { mode: { guard: 'Guard', free: 'Free attack', follow: 'Follow' }, all: 'Whole team', out: n => `Go, ${n}!`, back: n => `${n}, come back!`, full: `${MAXN} Quake Beasts are already out — recall one first (J or right-click its slot)`,
    none: 'No Quake Beast yet — get your first one at the beast stand in the Village', busy: 'In a battle — cannot change now', needLock: 'Lock a target first (Tab / click a monster), then press G', noneOut: 'No Quake Beast is out (J)',
    atk: (a, n) => `${a}: attack ${n}!`, setMode: (a, m) => `${a} → ${m}`, ko: n => `${n} is exhausted — resting in the Quake Seal for 15 s`, rest: n => `${n} is back on duty`, cd: n => `${n}'s move is recharging`, noTgt: 'No enemy nearby', block: 'BLOCK!', allBack: 'Whole team recalled',
    tipPort: (n, o) => `${n} — click: select for its own orders · right-click: ${o ? 'recall' : 'send out'}`, tipAll: 'Whole team — orders apply to every beast that is out', tipAtk: 'Attack the locked target (G)', tipMode: m => `Mode: ${m} (U to change)`, tipKey: 'J send/recall · G attack · U mode · H move', rested: s => `rest ${s}s`, lowHp: 'You are low on health — the team rallies to guard you!' },
};
const L = ctx => (vi(ctx) ? T.vi : T.en);
const CFG = { follow: 26, guardR: 150, freeR: 160, rallyR: 70, rallyK: 0.3, blockR: 56, sideR: 28, blockCd: 3, blockCdBoss: 6, blockMul: 0.5, sideMul: 0.7, shieldT: 3, shieldMul: 0.3, guardCd: 12, skillCd: 6, koT: 15, repelR: 130, taunt: 3, regen: 4 };

/* ---------- trạng thái ---------- */
const ST = { ctx: null, U: new Map(), focus: new Map(), shots: [], log: [], el: null, sig: '', rT: 0, port: {}, img: {}, pHitT: -9, shieldT: 0, inShot: false, rallyOn: false,
  n: { out: 0, back: 0, hit: 0, kill: 0, skill: 0, guardSk: 0, shield: 0, ctrl: 0, blockMelee: 0, blockShot: 0, side: 0, shieldAbs: 0, clamp: 0, repel: 0, ko: 0, tele: 0, foeHitU: 0, shotFired: 0, shotHitP: 0, atkCmd: 0, pDmg: 0, pHits: 0 } };
const now = () => (ST.ctx ? ST.ctx.S.time : 0);
function log(e) { ST.log.push({ t: +now().toFixed(2), ...e }); if (ST.log.length > 300) ST.log.shift(); }
const sv = ctx => { const s = ctx.S.save; s.sys = s.sys || {}; let k = s.sys.p104;
  if (!k) { k = s.sys.p104 = { v: 1, out: [], mode: 'guard', per: {}, sel: null }; const o = s.sys.p79, t = team(ctx); if (o && o.out && t[0]) k.out = [t[0].id]; }   /* save cũ: con đầu đội đang thả (comp79) */
  if (s.sys.p79) s.sys.p79.out = false;   /* comp79 không tự dựng con riêng nữa */
  return k; };
function team(ctx) { try { const d = ctx.chanthu && ctx.chanthu.ensure ? ctx.chanthu.ensure() : ctx.S.save.sys && ctx.S.save.sys.chanthu; return (d && d.team) || []; } catch (e) { return []; } }
const member = (ctx, id) => team(ctx).find(m => m.id === id) || null;
const nameOf = (ctx, m) => (m && (m.name || (ctx.ldKit && ctx.ldKit.name ? ctx.ldKit.name(m.sp) : m.sp))) || '?';
const modeOf = (ctx, id) => { const k = sv(ctx); return (k.per && k.per[id]) || k.mode || 'guard'; };
const isEly = (ctx, u) => u.sp === 'elyziuma' && !!ctx.elyz95;
const heroHp = ctx => { const h = ctx.hero; if (!h) return { hp: 1, max: 1 }; return { hp: h.hp, max: h.max }; };
const rally = ctx => { const h = heroHp(ctx); return h.max > 0 && h.hp / h.max < CFG.rallyK; };
const danger = ctx => now() - ST.pHitT < 1.5 || (() => { const h = heroHp(ctx); return h.hp / h.max < 0.5; })();

/* ---------- mục tiêu ---------- */
function monList(ctx) { try { return ctx.monsters && ctx.monsters.list ? ctx.monsters.list() : []; } catch (e) { return []; } }
function alive(mo) { return !!mo && mo.hp > 0 && !mo.dead && mo.state !== 'dead' && !mo.hide && !mo.statue && !(mo.c && mo.c.spar); }
function valid(mo) { return alive(mo) && !(mo.c && mo.c.boss) && !(mo.c && mo.c.fct && !mo.angry); }   /* Chũi / Cóc hoang hiền: để bắt; trùm: chỉ khi ra lệnh G */
function focusOf(id) { const mo = ST.focus.get(id); if (mo && alive(mo) && monList(ST.ctx).includes(mo)) return mo; if (mo) ST.focus.delete(id); return null; }
function hostileNear(ctx, x, y, r) { let best = null, bd = r; for (const mo of monList(ctx)) { if (!alive(mo) || (mo.c && mo.c.fct && !mo.angry)) continue; const d = Math.hypot(mo.x - x, mo.y - y); if (d < bd) { bd = d; best = mo; } } return best; }
function rangedNear(ctx, p, r) {   /* đòn từ xa (chiêu Chấn Thú hoang nổi giận / côn đồ): con hung gần nhất trong r */
  let best = null, bd = r; for (const mo of monList(ctx)) { if (!alive(mo) || !(mo.angry || (mo.c && (mo.c.gang95 || mo.c.boss)))) continue; const d = hyp(mo, p); if (d < bd) { bd = d; best = mo; } } return best; }
const reachOf = u => (u && u.f && u.f.tier === 'l' ? 26 : u && u.f && u.f.tier === 's' ? 12 : 17);   /* đứng chắn cách người theo cỡ thú — thú to không che kín người chơi */
const shooter = mo => !!(mo && mo.c && (mo.c.rg104 || mo.c.ranged)) || (mo && mo.chg104 > 0);
function shooterNear(ctx) { const p = ctx.S.player; let best = null, bd = 190; for (const mo of monList(ctx)) { if (!alive(mo) || !shooter(mo)) continue; const d = hyp(mo, p); if (d < bd) { bd = d; best = mo; } } return best; }
function isGuardian(ctx, u) {   /* HỘ VỆ: có kẻ bắn xa + thả ≥ 2 con → con ở chế độ Bảo vệ gần người nhất ở lại cạnh người để chắn đạn */
  if (ST.U.size < 2 || !ST.shooter) return false; let best = null, bd = 1e9; for (const v of ST.U.values()) { if (!v.onField() || isEly(ctx, v) || modeOf(ctx, v.id) !== 'guard' || focusOf(v.id)) continue; const d = hyp(v.pos(), ctx.S.player); if (d < bd) { bd = d; best = v; } } return best === u; }
function pickTarget(ctx, u) {
  const fo = focusOf(u.id); if (fo) return fo;
  const md = modeOf(ctx, u.id); if (md === 'follow') return null;
  const p = ctx.S.player, P = u.pos(); let best = null, bs = -1e9; const guardian = isGuardian(ctx, u);
  const taken = new Map(); for (const v of ST.U.values()) if (v !== u && v.tgt) taken.set(v.tgt, (taken.get(v.tgt) || 0) + 1);
  for (const mo of monList(ctx)) {
    if (!valid(mo)) continue; const dp = hyp(mo, p), du = hyp(mo, P); let s;
    if (ST.rallyOn || guardian) { if (dp > (guardian ? 34 : CFG.rallyR)) continue; s = 10 - dp / 10; }
    else if (md === 'free') { if (dp > CFG.freeR && du > 120) continue; s = 5 - du / 40; }
    else {   /* Bảo vệ: con đang đánh / nhắm người chơi cao nhất */
      if (dp > CFG.guardR + 30 && du > 110) continue;
      s = 1; if (mo.c && mo.c.gang95) s += 2; if (mo.angry) s += 2; if (dp < 70) s += 2; if (dp < 26) s += 3; if ((mo.taunt104 || 0) > now() && mo.tu104 === u.id) s += 1.5;
      if (!(mo.angry || (mo.c && mo.c.gang95) || dp < 70)) continue; s += Math.max(0, (CFG.guardR - dp) / CFG.guardR) - du / 300;
    }
    s -= 0.8 * (taken.get(mo) || 0);   /* chia việc: tránh cả đội dồn 1 con khi có nhiều con */
    if (s > bs) { bs = s; best = mo; } }
  return best;
}

/* ---------- chiêu lấy từ duel-data ---------- */
function movesOf(u) { const s = SPECIES[u.sp], m = u.m || {}; const ids = (m.mv && m.mv.length ? [...m.mv, m.ult] : m.moves || (s && s.moves) || []).filter(Boolean); return [...new Set(ids)].map(id => MOVES[id]).filter(Boolean); }
function atkMove(u) { const ms = movesOf(u).filter(m => m.cat !== 'tt' && m.pow > 0); ms.sort((a, b) => b.pow - a.pow); return ms[0] || null; }
function guardMove(u) {
  const ms = movesOf(u);
  const sh = ms.find(m => m.eff && (m.eff.protect || m.eff.heal || (m.eff.stat && m.eff.who === 'minh' && ((m.eff.stat.def || 0) > 0 || (m.eff.stat.spd || 0) > 0))));
  if (sh) return { kind: 'shield', mv: sh };
  const ct = ms.find(m => m.eff && m.eff.st && m.cat !== 'tt') || ms.find(m => m.shape === 'quanh' || m.shape === 'vung') || atkMove(u);
  return ct ? { kind: 'ctrl', mv: ct } : null;
}
const mvName = (ctx, mv) => (vi(ctx) ? mv.name : (MOVE_NAME_EN && MOVE_NAME_EN[mv.id]) || mv.name);

/* ---------- đơn vị ---------- */
function mkUnit(ctx, m) {
  const u = { id: m.id, sp: m.sp, lv: m.lv, m, f: null, hp: 0, max: 1, act: null, atkT: 0, cd: { skill: 2, guard: 1, block: 0 }, blkT: 0, dash: null, ko: false, koT: 0, stuck: 0, tgt: null, pop: true, slot: 0 };
  u.pos = () => { if (isEly(ctx, u)) { const E = ctx.elyz95.E && ctx.elyz95.E(); return E ? { x: E.x, y: E.y } : { x: ctx.S.player.x, y: ctx.S.player.y }; } return u.f ? { x: u.f.x, y: u.f.y } : { x: ctx.S.player.x, y: ctx.S.player.y }; };
  u.onField = () => { if (duelOn(ctx)) return false; if (isEly(ctx, u)) { const E = ctx.elyz95.E && ctx.elyz95.E(); return !!E && !E.ko && !(ctx.elyz95.koT && ctx.elyz95.koT() > 0); } return !!u.f && !u.ko; };
  return u;
}
function ensureF(ctx, u) {   /* sprite trận tải lười */
  if (u.f || u.ko || isEly(ctx, u)) return u.f; const kit = ctx.ldKit; if (!kit) return null;
  if (!kit.ready()) { if (!ST.loading) { ST.loading = true; kit.load().then(() => { ST.loading = false; }, () => { ST.loading = false; }); } return null; }
  const p = ctx.S.player, q = kit.near(p.x - 14 + u.slot * 12, p.y + 8);
  try { const f = kit.mk(u.sp, u.lv, u.m, q.x, q.y); f.comp79 = true; f.clip = 'idle'; f.ct = 0; f.fx = 0.01; f.fy = 1; u.f = f; } catch (e) { console.error('squad104 mk', u.sp, e); return null; }
  u.max = Math.round(70 + (u.f.st && u.f.st.hp ? u.f.st.hp * 1.6 : 110)); if (!(u.hp > 0)) u.hp = u.max;
  if (u.pop) { u.pop = false; FX.erupt(q.x, q.y, FX.skinOf(u.sp, u.f.types && u.f.types[0]), FX.power(0.15), 'b'); }
  log({ ev: 'spawn', id: u.id, sp: u.sp }); return u.f;
}
const skinU = u => FX.skinOf(u.sp, u.f && u.f.types && u.f.types[0]);
function biteDmg(u, mo) { return Math.max(1, Math.round(Math.max((mo.max || 10) * 0.12, (u.f && u.f.st && u.f.st.atk ? u.f.st.atk : 40) * 0.35))); }
function dealHit(ctx, u, mo, dmg, kb = 55, tag = 'bite') {
  if (!alive(mo)) return false; dmg = Math.max(1, Math.round(dmg));
  globalThis.__env105he = (u.f && u.f.types && u.f.types[0]) || null; try { ctx.monsters.damage(mo, dmg, u.pos(), 0.3, kb); } catch (e) { } globalThis.__env105he = null;   /* p105w: hệ đòn → envfx (vết đất / tóe nước theo hệ) */
  mo.taunt104 = now() + CFG.taunt; mo.tu104 = u.id; if (mo.c && mo.c.gang95) { mo.taunt95 = 0; }   /* bị Chấn Thú đánh → quay sang đánh nó (gây hấn) */
  ST.n.hit++; if (!(mo.hp > 0)) { ST.n.kill++; log({ ev: 'kill', id: u.id, tag }); } return true;
}
function hurtU(ctx, u, dmg, src) {
  dmg = Math.max(1, Math.round(dmg)); ST.n.foeHitU++;
  if (isEly(ctx, u)) { if (ctx.elyz95.hurt) ctx.elyz95.hurt(dmg); return; }
  if (rkOn(u) && u.f && !u.ko && RK.onHurt) { const r = RK.onHurt(ctx, rkPt(u), dmg, src, rkH(ctx, u)); if (r != null) dmg = Math.max(1, Math.round(r)); }   /* p104rk: khiên của chính Rocky */
  if (!u.f || u.ko) return; u.hp -= dmg; u.f.flash = 0.12; if (ctx.pop) ctx.pop(u.f.x, u.f.y - 18, `-${dmg}`, '#ffb070');
  if (u.hp <= 0) { u.ko = true; u.koT = CFG.koT; u.act = null; u.dash = null; ST.n.ko++; FX.sink(u.f.x, u.f.y, skinU(u), FX.power(0.3)); try { ctx.toast(L(ctx).ko(nameOf(ctx, u.m))); } catch (e) { } log({ ev: 'ko', id: u.id }); u.f = null; }
}
function face(f, x, y) { const dx = x - f.x, dy = y - f.y, d = Math.hypot(dx, dy); if (d > 0.5) { f.fx = dx / d; f.fy = dy / d; } }
function moveTo(ctx, u, gx, gy, sp, dt, near0 = 3) {
  const f = u.f, kit = ctx.ldKit, dx = gx - f.x, dy = gy - f.y, d = Math.hypot(dx, dy);
  { const r = D107.goFighter(ctx, f, gx, gy, sp, dt, near0, { trig: 70 }); if (r) { u.stuck = 0; return r === 'arrive'; } }   /* plan-107 */
  if (d <= near0) { if (f.clip !== 'idle' && !u.act) { f.clip = 'idle'; f.ct = 0; } u.stuck = 0; return true; }
  const st = Math.min(d, sp * dt), ok = kit.move(f, dx / d * st, dy / d * st); face(f, gx, gy); if (f.clip !== 'run' && kit.has(f, 'run')) { f.clip = 'run'; f.ct = 0; }
  u.stuck = ok ? 0 : u.stuck + dt; if (u.stuck > 1.4) { const p = ctx.S.player, q = kit.near(p.x - 12, p.y + 6); f.x = q.x; f.y = q.y; u.stuck = 0; ST.n.tele++; log({ ev: 'unstuck', id: u.id }); }
  return false;
}
const spdOf = f => Math.min(118, 50 + (f.st && f.st.spe ? f.st.spe * 0.7 : 30));
function startDash(ctx, u, x, y) { D107.stop(u.f, 'guard');   /* lướt ngắn ra chắn (đỡ đòn) */
  const q = ctx.ldKit && ctx.ldKit.near ? ctx.ldKit.near(x, y) : { x, y };
  if (isEly(ctx, u)) { const E = ctx.elyz95.E(); if (E) { E.x = q.x; E.y = q.y; } return; }
  const f = u.f; u.act = null; u.dash = { x0: f.x, y0: f.y, x1: q.x, y1: q.y, t: 0, T: Math.max(0.06, Math.min(0.2, Math.hypot(q.x - f.x, q.y - f.y) / 420)) }; try { (globalThis.__sfx108 && globalThis.__sfx108.at(ctx, 'dash_fast', f.x, f.y, { vol: 0.6 })); } catch (e) { } face(f, q.x, q.y);
}
function blockFx(ctx, u, src) { u.blkT = 0.4; const P = u.pos(); if (src) { const d = Math.hypot(src.x - P.x, src.y - P.y) || 1; u.bdx = (src.x - P.x) / d; u.bdy = (src.y - P.y) / d; } else { u.bdx = 0; u.bdy = 1; }
  try { FX.impact(P.x + u.bdx * 7, P.y - 6, 10, isEly(ctx, u) ? FX.skinOf('elyziuma', 'ma') : skinU(u), FX.power(0.25), { noCrater: true }); FX.shout(P.x, P.y - 30, L(ctx).block, '#bff3e6', 1, 0.6); ctx.sfx('block'); } catch (e) { } }
function blockerFor(ctx, near, R = CFG.blockR) {   /* con ở chế độ Bảo vệ, rảnh, gần người chơi nhất */
  const p = ctx.S.player; let best = null, bd = R;
  for (const u of ST.U.values()) { if (!u.onField() || u.cd.block > 0) continue; const md = modeOf(ctx, u.id); if (md !== 'guard' && !ST.rallyOn) continue; if (focusOf(u.id) && !ST.rallyOn && md !== 'guard') continue;
    const d = hyp(u.pos(), near || p); if (d < bd) { bd = d; best = u; } }
  return best;
}

/* ---------- bộ não chung ---------- */
function slotGoal(ctx, u) {
  const p = ctx.S.player, dv = [[0, 1], [-1, 0], [1, 0], [0, -1]][p.dir] || [0, 1], k = u.slot - 1, lx = -dv[1], ly = dv[0];
  const big = u.f && u.f.tier === 'l' ? 1.4 : u.f && u.f.tier === 's' ? 0.85 : 1; return { x: p.x - dv[0] * CFG.follow * big + lx * k * 20 * big, y: p.y - dv[1] * 16 * big + ly * k * 13 * big + 3 };
}
function castSkill(ctx, u, mo, forced) {
  const mv = atkMove(u); if (!mv || !mo) return false; const f = u.f, kit = ctx.ldKit;
  const clip = kit.has(f, 'cast') && mv.shape !== 'can' ? 'cast' : kit.has(f, 'atk') ? 'atk' : 'idle', Tc = Math.max(0.45, kit.clipT(f, clip));
  face(f, mo.x, mo.y); f.clip = clip; f.ct = 0; D107.stop(u.f, 'act'); u.act = { kind: 'skill', mv, mo, t: 0, T: Tc, imp: Math.min(Tc * 0.6, kit.impT(clip)), hit: false }; u.cd.skill = CFG.skillCd; ST.n.skill++;
  FX.shout(f.x, f.y - 30, mvName(ctx, mv).toUpperCase(), '#ffe9a0', 1, 0.8); if (mv.shape !== 'can') FX.muzzle(f.x + f.fx * 6, f.y, 8, skinU(u), FX.power(0.3), f.fx, f.fy);
  try { if (globalThis.__sfx108) globalThis.__sfx108.move(ctx, mv.id, 'cast', f.x, f.y, { type: mv.type }); } catch (e) { }   /* p108 */
  log({ ev: 'skill', id: u.id, mv: mv.id, forced: !!forced }); return true;
}
function castGuard(ctx, u) {
  const G = guardMove(u); if (!G) return false; const p = ctx.S.player, f = u.f;
  const att = monList(ctx).filter(mo => alive(mo) && !(mo.c && mo.c.fct && !mo.angry) && hyp(mo, p) < 56);
  if (G.kind === 'shield') { if (ST.shieldT > 0) return false; ST.shieldT = CFG.shieldT; ST.n.shield++; FX.shockRing(p.x, p.y, 16, skinU(u), 0.3, 2); FX.heal(p.x, p.y, 18, skinU(u), 8); }
  else { if (!att.length) return false; ST.n.ctrl++;
    for (const mo of att) { const d = hyp(mo, p) || 1; mo.kb = { vx: (mo.x - p.x) / d * 170, vy: (mo.y - p.y) / d * 170, t: 0.22 }; mo.stun104 = now() + 1.1; mo.stun95 = now() + 1.1; mo.taunt104 = now() + CFG.taunt; mo.tu104 = u.id;
      dealHit(ctx, u, mo, biteDmg(u, mo) * 1.2, 0, 'ctrl'); FX.impact(mo.x, mo.y, 8, skinU(u), FX.power(0.5), { noCrater: true }); } }
  const kit = ctx.ldKit, clip = kit.has(f, 'cast') ? 'cast' : 'idle'; f.clip = clip; f.ct = 0; face(f, p.x, p.y);
  D107.stop(u.f, 'act'); u.act = { kind: 'guard', t: 0, T: Math.max(0.4, kit.clipT(f, clip)), hit: true }; u.cd.guard = CFG.guardCd; ST.n.guardSk++;
  FX.shout(f.x, f.y - 30, mvName(ctx, G.mv).toUpperCase(), '#bff3e6', 1, 0.8); try { if (!(globalThis.__sfx108 && globalThis.__sfx108.move(ctx, G.mv.id, 'cast', f.x, f.y, { type: G.mv.type }))) ctx.sfx('whoosh'); } catch (e) { }
  log({ ev: 'guardSk', id: u.id, kind: G.kind, mv: G.mv.id, n: att.length }); return true;
}
function tickU(ctx, u, dt) {
  const f = u.f, kit = ctx.ldKit, p = ctx.S.player; f.ct += dt; D107.tick(f, dt); if (f.flash > 0) f.flash = Math.max(0, f.flash - dt); u.atkT -= dt; u.blkT -= dt; for (const k in u.cd) u.cd[k] -= dt;
  if (u.dash) { const D = u.dash; D.t += dt; const k = Math.min(1, D.t / D.T); kit.move(f, D.x0 + (D.x1 - D.x0) * k - f.x, D.y0 + (D.y1 - D.y0) * k - f.y); if (k >= 1) u.dash = null; return; }
  if (u.act) { const A = u.act; A.t += dt;
    if (!A.hit && A.t >= A.imp) { A.hit = true; const mo = A.mo;
      if (A.kind === 'bite') { if (alive(mo) && hyp(mo, f) <= 30) { dealHit(ctx, u, mo, biteDmg(u, mo)); FX.bite(mo.x, mo.y, 6, skinU(u), FX.power(FX.powerP(SPECIES[u.sp], u.lv))); } }
      else if (A.kind === 'skill' && mo) { const R = 24, cx0 = alive(mo) ? mo.x : A.mo.x, cy0 = alive(mo) ? mo.y : A.mo.y; let n = 0;
        for (const o of monList(ctx)) if (valid(o) || o === mo) { if (Math.hypot(o.x - cx0, o.y - cy0) <= R && alive(o)) { dealHit(ctx, u, o, biteDmg(u, o) * 2.2, 110, 'skill'); n++; } }
        FX.impact(cx0, cy0, 8, skinU(u), FX.power(0.6), { ring: true, q: 0.5 }); try { if (ctx.envfx) { ctx.envfx.hit(cx0, cy0, 24, A.mv.type, 0.9, { noFlood: true }); if (ctx.envfx.floodMv) ctx.envfx.floodMv(A.mv.id, u.f && u.f.types && u.f.types[0], cx0, cy0, 72, 20, 'sq:' + u.sp + ':' + A.mv.id); } } catch (e) { }   /* p105w-skill: chiêu đội → vết theo hệ; chiêu nước lớn trong danh sách → NGẬP */ if (n) try { if (globalThis.__sfx108) globalThis.__sfx108.move(ctx, A.mv.id, 'hit', cx0, cy0, { type: A.mv.type }); } catch (e) { } log({ ev: 'skillHit', id: u.id, n }); } }
    if (A.t >= A.T) { u.act = null; f.clip = 'idle'; f.ct = 0; } return; }
  if (rkOn(u) && rkTick(ctx, u, dt)) return;   /* p104rk: Rocky golem dùng 6 chiêu rktk trước, hết chiêu thì cắn / đi theo như mọi loài */
  if (hyp(f, p) > 240) { D107.stop(f, 'tele'); const q = kit.near(p.x - 12, p.y + 6); f.x = q.x; f.y = q.y; ST.n.tele++; log({ ev: 'tele', id: u.id }); return; }
  if (u.queue) { const Q = u.queue; u.queue = null; if (now() < Q.t && alive(Q.mo) && u.cd.skill <= 0 && castSkill(ctx, u, Q.mo, true)) return; }
  const md = modeOf(ctx, u.id);
  if ((md === 'guard' || ST.rallyOn) && u.cd.guard <= 0 && danger(ctx) && hostileNear(ctx, p.x, p.y, 56) && castGuard(ctx, u)) return;
  const mo = pickTarget(ctx, u); u.tgt = mo; const sp = spdOf(f);
  if (!mo && isGuardian(ctx, u)) { const sh = ST.shooter, k = hyp(sh, p) || 1, R = reachOf(u), gx = p.x + (sh.x - p.x) / k * R, gy = p.y + (sh.y - p.y) / k * R * 0.75; if (moveTo(ctx, u, gx, gy, sp * 1.4, dt, 2)) face(f, sh.x, sh.y); return; }   /* đứng chắn giữa người và kẻ bắn */
  if (!mo) { if (u.hp < u.max) u.hp = Math.min(u.max, u.hp + CFG.regen * dt); const g = slotGoal(ctx, u); if (hyp(f, p) < 30 && hyp(f, g) < 12) { if (f.clip !== 'idle') { f.clip = 'idle'; f.ct = 0; } face(f, p.x, p.y + 30); return; } moveTo(ctx, u, g.x, g.y, hyp(f, p) > 80 ? sp * 1.5 : sp, dt, 4); return; }
  const d = hyp(f, mo), mv = atkMove(u), rng = mv && mv.shape === 'can' ? 26 : 96;
  if (u.cd.skill <= 0 && mv && d <= rng && castSkill(ctx, u, mo)) return;
  if (d < 22 && u.atkT <= 0) { const clip = kit.has(f, 'atk') ? 'atk' : 'idle', Tc = Math.max(0.35, kit.clipT(f, clip)); face(f, mo.x, mo.y); f.clip = clip; f.ct = 0; D107.stop(u.f, 'act'); u.act = { kind: 'bite', mo, t: 0, T: Tc, imp: Math.min(Tc * 0.6, kit.impT(clip)), hit: false }; u.atkT = 1.0; return; }
  let gx, gy; const dpm = hyp(mo, p);
  if ((md === 'guard' || ST.rallyOn) && dpm < 60) { const k = dpm || 1; gx = mo.x + (p.x - mo.x) / k * 14; gy = mo.y + (p.y - mo.y) / k * 10; }   /* đứng CHẮN giữa quái và người */
  else { const side = f.x <= mo.x ? -1 : 1; gx = mo.x + side * 14; gy = mo.y + 1; }
  if (d < 22) { face(f, mo.x, mo.y); if (f.clip === 'run') { f.clip = 'idle'; f.ct = 0; } return; }
  moveTo(ctx, u, gx, gy, sp * 1.25, dt, 3);
}

/* ---------- thả / thu ---------- */
function toggle(ctx, id, quiet) {
  if (!ctx || ctx.S.mode !== 'play') return false; if (duelOn(ctx)) { ctx.toast(L(ctx).busy); return false; }
  const k = sv(ctx), m = member(ctx, id); if (!m) return false;
  const i = k.out.indexOf(id);
  if (i >= 0) { k.out.splice(i, 1); const u = ST.U.get(id); if (u) { if (isEly(ctx, u)) { if (ctx.elyz95.recall) ctx.elyz95.recall(); } else if (u.f) FX.sink(u.f.x, u.f.y, skinU(u), FX.power(0.2)); } ST.U.delete(id); ST.focus.delete(id); ST.n.back++; log({ ev: 'back', id }); if (!quiet) { ctx.toast(L(ctx).back(nameOf(ctx, m))); ctx.sfx('pickup'); } }
  else { if (k.out.length >= MAXN) { ctx.toast(L(ctx).full); ctx.sfx('fail'); return false; } k.out.push(id); ST.n.out++; log({ ev: 'out', id, sp: m.sp }); if (!quiet) { ctx.toast(L(ctx).out(nameOf(ctx, m))); ctx.sfx('whoosh'); } if (m.sp === 'elyziuma' && ctx.elyz95 && ctx.elyz95.pop) ctx.elyz95.pop(); }
  ctx.persist(); ST.sig = ''; return true;
}
function press(ctx) {   /* J: con đang chọn → thả / thu; chưa chọn → thả con kế tiếp trong đội, đủ rồi thì thu cả đội */
  if (!ctx || ctx.S.mode !== 'play') return false; if (duelOn(ctx)) { ctx.toast(L(ctx).busy); return false; }
  const k = sv(ctx), tm = team(ctx); if (!tm.length) { ctx.toast(L(ctx).none); ctx.sfx('fail'); return false; }
  if (k.sel != null && member(ctx, k.sel)) return toggle(ctx, k.sel);
  const next = tm.find(m => !k.out.includes(m.id));
  if (next && k.out.length < MAXN) return toggle(ctx, next.id);
  for (const id of k.out.slice()) toggle(ctx, id, true); ctx.toast(L(ctx).allBack); ctx.sfx('pickup'); return true;
}
function targets(ctx) { const k = sv(ctx); return k.sel != null && k.out.includes(k.sel) ? [k.sel] : k.out.slice(); }
function label(ctx) { const k = sv(ctx), m = k.sel != null ? member(ctx, k.sel) : null; return m ? nameOf(ctx, m) : L(ctx).all; }
function attack(ctx) {
  const k = sv(ctx); if (!k.out.length) { ctx.toast(L(ctx).noneOut); return false; }
  const t = TGT.get(); const mo = t && t.kind === 'mon' ? (t.mo || t.ref) : null;
  if (!mo || !alive(mo)) { ctx.toast(L(ctx).needLock); ctx.sfx('fail'); return false; }
  for (const id of targets(ctx)) ST.focus.set(id, mo);
  ST.n.atkCmd++; ctx.toast(L(ctx).atk(label(ctx), TGT.nameOf ? TGT.nameOf(t) : '?')); if (!(globalThis.__sfx108 && globalThis.__sfx108.at(ctx, 'sel_target', ctx.S.player.x, ctx.S.player.y, { vol: 0.6 }))) ctx.sfx('target_lock'); log({ ev: 'atkCmd', ids: targets(ctx), key: mo.c && mo.c.key }); ST.sig = ''; return true;
}
function setMode(ctx, m) {
  const k = sv(ctx); if (!MODES.includes(m)) return false; k.per = k.per || {};
  if (k.sel != null && member(ctx, k.sel)) k.per[k.sel] = m; else { k.mode = m; k.per = {}; }
  if (m === 'follow') for (const id of targets(ctx)) { ST.focus.delete(id); const u = ST.U.get(id); if (u && u.act && u.act.kind !== 'guard') { u.act = null; u.queue = null; if (u.f) { u.f.clip = 'idle'; u.f.ct = 0; } } }   /* Theo sau: dừng đòn đang dở ngay */
  ctx.toast(L(ctx).setMode(label(ctx), L(ctx).mode[m])); ctx.persist(); ST.sig = ''; log({ ev: 'mode', m, sel: k.sel }); return true;
}
function cycleMode(ctx) { const k = sv(ctx), cur = k.sel != null ? modeOf(ctx, k.sel) : k.mode || 'guard'; return setMode(ctx, MODES[(MODES.indexOf(cur) + 1) % MODES.length]); }
function castSel(ctx) {
  const k = sv(ctx), id = k.sel != null && k.out.includes(k.sel) ? k.sel : k.out[0]; const u = id != null ? ST.U.get(id) : null; log({ ev: 'H', id, on: !!(u && u.onField()), act: u && u.act && u.act.kind, cd: u && +u.cd.skill.toFixed(2) }); if (!u || !u.onField()) { ctx.toast(L(ctx).noneOut); return false; }
  if (isEly(ctx, u)) { const r = ctx.elyz95.cast ? ctx.elyz95.cast() : false; if (!r) ctx.toast(L(ctx).cd(nameOf(ctx, u.m))); return !!r; }
  if (rkOn(u) && u.f) { const t = TGT.get(), mo = (t && t.kind === 'mon' && alive(t.mo || t.ref) ? (t.mo || t.ref) : null) || pickTarget(ctx, u) || hostileNear(ctx, u.f.x, u.f.y, 120); if (!mo) { ctx.toast(L(ctx).noTgt); return false; }
    const dbg = RK.debug(), id = ['ult', 'storm', 'quake', 'dash', 'fist'].find(k => !(dbg.cd[k] > 0)); if (!id) { ctx.toast(L(ctx).cd(nameOf(ctx, u.m))); return false; }
    RK.force(ctx, rkPt(u), u.f, id, mo, rkH(ctx, u)); u.act = null; log({ ev: 'skill', id: u.id, mv: 'rk_' + id, forced: true }); return true; }   /* p104rk: H → chiêu rktk sẵn sàng */
  const t = TGT.get(), mo = (t && t.kind === 'mon' && alive(t.mo || t.ref) ? (t.mo || t.ref) : null) || pickTarget(ctx, u) || hostileNear(ctx, u.f.x, u.f.y, 100);
  if (u.act && u.act.kind !== 'guard') { u.act = null; u.dash = null; }   /* lệnh người chơi ngắt đòn đang dở (phản ứng ngay) */
  if (!mo) { ctx.toast(L(ctx).noTgt); return false; }
  if (u.act && u.cd.skill <= 0 && mo) { u.queue = { mo, t: now() + 1.5 }; log({ ev: 'queued', id: u.id }); return true; }   /* đang gồng chiêu bảo vệ → ra chiêu ngay sau đó */
  if (u.cd.skill > 0 || u.act || !mo) { ctx.toast(L(ctx).cd(nameOf(ctx, u.m))); return false; }
  return castSkill(ctx, u, mo, true);
}
function select(ctx, id) { const k = sv(ctx); k.sel = id == null || k.sel === id ? null : id; ctx.persist(); ST.sig = ''; return k.sel; }

/* ---------- đỡ đòn: bọc ctx.hero.hit ---------- */
function wrapHero(ctx) {
  const h = ctx.hero; if (!h || h.__w104) return; const h0 = h.hit; h.__w104 = true;
  h.hit = function (dmg, ...a) {
    const p = ctx.S.player; if (!(dmg > 0) || h.fainted) return h0.call(h, dmg, ...a);
    ST.pHitT = now(); let d = dmg;
    const att = ST.inShot ? ST.shotSrc : hostileNear(ctx, p.x, p.y, 44) || rangedNear(ctx, p, 170), boss = !!(att && att.c && att.c.boss);
    if (!ST.inShot && att && !duelOn(ctx)) { const u = blockerFor(ctx); if (u) {   /* ĐỠ ĐÒN cận chiến: lướt ra chắn, nhận đòn thay */
      const dd = hyp(att, p) || 1, R = Math.min(reachOf(u), dd * 0.7); startDash(ctx, u, p.x + (att.x - p.x) / dd * R, p.y + (att.y - p.y) / dd * R * 0.75); u.cd.block = boss ? CFG.blockCdBoss : CFG.blockCd;
      hurtU(ctx, u, dmg * CFG.blockMul, att); blockFx(ctx, u, att); if (!isEly(ctx, u)) { att.taunt104 = now() + CFG.taunt; att.tu104 = u.id; } else { att.tgt95 = 'E'; att.taunt95 = now() + CFG.taunt; }
      ST.n.blockMelee++; log({ ev: 'block', id: u.id, dmg, key: att.c && att.c.key }); return false; } }
    if (ST.shieldT > 0 && rkShieldHit(ctx, att, dmg)) { d = Math.round(d * (1 - RK.SK.shield.cut)); ST.n.shieldAbs++; if (d <= 0) return false; } else   /* p104rk: Khiên Ngực Seismic phủ người chơi */
    if (ST.shieldT > 0) { d = Math.max(1, Math.round(d * CFG.shieldMul)); ST.n.shieldAbs++; }
    else if ([...ST.U.values()].some(u => u.onField() && hyp(u.pos(), p) <= CFG.sideR)) { d = Math.max(1, Math.round(d * CFG.sideMul)); ST.n.side++; }
    if (duelLocal(ctx) && !boss) { const lim = Math.max(0, Math.ceil(h.hp) - 1); if (d > lim) { d = lim; ST.n.clamp++; } if (d <= 0) return false; }   /* lưới an toàn: đấu Chấn Thú tại chỗ không chết */
    const r = h0.call(h, d, ...a); if (r !== false) { ST.n.pDmg += d; ST.n.pHits++; } return r;
  };
}

/* ---------- AI quái khi có Chấn Thú (monsters.js gọi trước AI của nó) ---------- */
function monAI(mo, dt, steer) {
  const ctx = ST.ctx; if (!ctx) return false; const c = mo.c || {}, t = now(), p = ctx.S.player;
  if ((mo.stun104 || 0) > t && !c.boss) return true;
  if (duelLocal(ctx) && !c.boss && !c.spar && !c.fct && !mo.hide) { const d = hyp(mo, p);   /* Vòng Ấn Chấn: đấu tại chỗ → quái quanh người bị đẩy ra, thôi nhắm */
    if (d < CFG.repelR) { mo.angry = false; mo.taunt104 = 0; mo.taunt95 = 0; const k = d || 1; try { steer(ctx, mo, mo.x + (mo.x - p.x) / k * 40, mo.y + (mo.y - p.y) / k * 40, (c.sp || 40) * 1.2, dt); } catch (e) { } if (!mo.rp104) { mo.rp104 = true; ST.n.repel++; } return true; }
    return d < CFG.repelR + 40; }
  mo.rp104 = false;
  if (c.ai || c.aiFn || c.boss) return false;   /* AI riêng (côn đồ elyz95 / quái biển / trùm) tự xử lý gây hấn */
  const U = tauntOf(mo); if (!U) return false;
  const P = U.pos(), d = hyp(mo, P);
  if (d > 13) steer(ctx, mo, P.x, P.y, c.sp || 40, dt);
  else if (mo.cd <= 0) { mo.cd = 1.3; hurtU(ctx, U, c.dmg || 5, mo); }
  return true;
}
function tauntOf(mo) {
  const ctx = ST.ctx; if (!ctx || !mo || !((mo.taunt104 || 0) > now())) return null; const u = ST.U.get(mo.tu104);
  if (!u || isEly(ctx, u) || !u.onField() || hyp(u.pos(), mo) > 110) return null; return u;
}

/* ---------- đạn của Chấn Thú địch (côn đồ bắn xa — để thử đỡ đạn) ---------- */
const RG = ['loiho', 'rongdo', 'vitbao', 'bachkinh'];
const RGN = { vi: { loiho: 'Lôi Hồ bắn tỉa', rongdo: 'Xích Long bắn tỉa', vitbao: 'Vịt Bão bắn tỉa', bachkinh: 'Bạch Kình bắn tỉa' }, en: { loiho: 'Sniper Volt Fox', rongdo: 'Sniper Crimson Wyrm', vitbao: 'Sniper Storm Duck', bachkinh: 'Sniper Pale Whale' } };
function foes(ctx, n = 2, kind = 'ranged') {
  if (kind !== 'ranged') return window.__ely ? window.__ely.gang(n) : 0;
  const kit = ctx.ldKit; if (kit && !kit.ready()) kit.load(); const p = ctx.S.player; let k = 0;
  for (let i = 0; i < n; i++) { const sp = RG[(ST.n.shotFired + i) % RG.length], a = (i / n) * Math.PI * 2 + 1.1, q = kit && kit.near ? kit.near(p.x + Math.cos(a) * 100, p.y + Math.sin(a) * 66) : { x: p.x + 100, y: p.y };
    const c = { key: 'rg104_' + sp, vi: RGN.vi[sp], en: RGN.en[sp], hp: 130, w: 16, h: 18, dmg: 12, sp: 40, xp: 15, drop: 'stone', c: '#5a4a7a', gang95: sp, rg104: true, shortHit: false, aiFn: rangedAI, drawFn: (g, mo, x, y) => foeDraw(ctx, g, mo, x, y) };
    const mo = ctx.monsters.add(c, q.x, q.y); mo.angry = true; mo.cd = 1 + i * 0.7; k++; FX.erupt(q.x, q.y, FX.skinOf(sp), FX.power(0.3), 'b'); }
  log({ ev: 'foes', n, kind }); return k;
}
function foeE(ctx, mo) { const kit = ctx.ldKit; if (!mo.e104 && kit && kit.ready()) { try { mo.e104 = kit.mk(mo.c.gang95, 28, null, mo.x, mo.y); mo.e104.clip = 'idle'; mo.e104.ct = 0; } catch (e) { } } return mo.e104; }
function rangedAI(ctx, mo, dt, p, dp, canHit) {
  const e = foeE(ctx, mo), t = now(); if (e) { e.ct += dt; if (e.atkT > 0 && (e.atkT -= dt) <= 0) { e.clip = 'idle'; e.ct = 0; } }
  if ((mo.stun95 || 0) > t || (mo.stun104 || 0) > t) return;
  const U = tauntOf(mo), Ex = ctx.elyz95 && ctx.elyz95.E ? ctx.elyz95.E() : null, onE = !U && Ex && !Ex.ko && (mo.taunt95 || 0) > t, tg = U ? U.pos() : onE ? Ex : p;
  if (!canHit && !U && !onE) return;
  const d = hyp(mo, tg), dx = tg.x - mo.x, dy = tg.y - mo.y, want = 78;
  if (e) { e.fx = dx / (d || 1); e.fy = dy / (d || 1); }
  if (mo.chg104 > 0) { mo.chg104 -= dt; if (mo.chg104 <= 0) { shoot(ctx, mo, tg, U ? 'U' : onE ? 'E' : 'P', U); mo.cd = 2.4; if (e) { e.clip = ctx.ldKit.has(e, 'cast') ? 'cast' : ctx.ldKit.has(e, 'atk') ? 'atk' : 'idle'; e.ct = 0; e.atkT = 0.45; } } return; }
  if (Math.abs(d - want) > 14) { const s = d > want ? 1 : -1, st = Math.min(Math.abs(d - want), mo.c.sp * dt) * s, o = { sp: mo.c.gang95, x: mo.x, y: mo.y };
    try { ctx.ldKit.move(o, dx / (d || 1) * st, dy / (d || 1) * st); } catch (er) { o.x += dx / (d || 1) * st; o.y += dy / (d || 1) * st; } mo.x = o.x; mo.y = o.y;
    if (e && !(e.atkT > 0) && e.clip !== 'run' && ctx.ldKit.has(e, 'run')) { e.clip = 'run'; e.ct = 0; } }
  else if (e && e.clip === 'run') { e.clip = 'idle'; e.ct = 0; }
  if (mo.cd <= 0 && d < 150) mo.chg104 = 0.45;   /* gồng 0,45 s (đốm sáng ở miệng — báo trước) rồi bắn */
}
function shoot(ctx, mo, tg, who, U) {
  const sx = mo.x, sy = mo.y - 9, dx = tg.x - sx, dy = (tg.y - 8) - sy, d = Math.hypot(dx, dy) || 1, v = 150;
  ST.shots.push({ x: sx, y: sy, vx: dx / d * v, vy: dy / d * v, v, dmg: mo.c.dmg, src: mo, who, U, t: 0, sk: FX.skinOf(mo.c.gang95), blk: null }); ST.n.shotFired++;
  FX.muzzle(sx, mo.y, 9, FX.skinOf(mo.c.gang95), FX.power(0.25), dx / d, dy / d); try { ctx.sfx('whoosh'); } catch (e) { }
}
function updShots(ctx, dt) {
  const p = ctx.S.player;
  for (const s of ST.shots) { s.t += dt; s.x += s.vx * dt; s.y += s.vy * dt;
    if (s.who === 'P' && !s.blk) { const tx = p.x - s.x, ty = (p.y - 8) - s.y, dd = Math.hypot(tx, ty), dot = (tx * s.vx + ty * s.vy) / ((dd || 1) * s.v);   /* đọc đường bay: còn ≤ 0,38 s là trúng → con gần nhất lao ra chắn */
      if (dot > 0.8 && dd / s.v <= 0.5) { const u = blockerFor(ctx, null, 100); if (u) { s.blk = u; u.cd.block = CFG.blockCd * 0.5; startDash(ctx, u, p.x - tx / (dd || 1) * reachOf(u), p.y - ty / (dd || 1) * reachOf(u) * 0.75); log({ ev: 'intercept', id: u.id }); } } }
    for (const u of ST.U.values()) { if (!u.onField() || s.dead) continue; const P = u.pos(); if (Math.hypot(P.x - s.x, P.y - 8 - s.y) < 9) { s.dead = true; hurtU(ctx, u, s.dmg * (s.blk === u || s.who !== 'U' ? CFG.blockMul : 1), s.src); if (s.who !== 'U') { blockFx(ctx, u, s.src); ST.n.blockShot++; log({ ev: 'blockShot', id: u.id }); } FX.impact(s.x, P.y, 8, s.sk, FX.power(0.25), { noCrater: true }); } }
    if (!s.dead && s.who === 'P' && Math.hypot(p.x - s.x, p.y - 8 - s.y) < 8) { s.dead = true; ST.inShot = true; ST.shotSrc = s.src; try { if (ctx.hero) ctx.hero.hit(s.dmg); } finally { ST.inShot = false; } ST.n.shotHitP++; FX.impact(s.x, p.y, 8, s.sk, FX.power(0.25), { noCrater: true }); }
    if (!s.dead && s.who === 'E') { const E = ctx.elyz95 && ctx.elyz95.E && ctx.elyz95.E(); if (E && Math.hypot(E.x - s.x, E.y - 12 - s.y) < 13) { s.dead = true; if (ctx.elyz95.hurt) ctx.elyz95.hurt(s.dmg); } }
    if (s.t > 1.6) s.dead = true; }
  ST.shots = ST.shots.filter(s => !s.dead);
}
const B4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5], bay = (X, Y) => (B4[(Y & 3) * 4 + (X & 3)] + 0.5) / 16;
function dot(g, X, Y, c) { g.fillStyle = c; g.fillRect(X / 2, Y / 2, 0.5, 0.5); }
function shotDraw(g, s, cx, cy) {   /* đạn năng lượng vẽ code (px 2 điểm / px logic): lõi sáng + viền màu hệ + đuôi dither ngắn */
  const X = Math.round((s.x - cx) * 2), Y = Math.round((s.y - cy) * 2), pal = (s.sk && s.sk.pal) || ['#fff', '#ffe9a0', '#f2c335', '#a07a20'], ux = s.vx / s.v, uy = s.vy / s.v;
  for (let i = 1; i < 10; i++) { const tx = Math.round(X - ux * i * 1.6), ty = Math.round(Y - uy * i * 1.6); if ((1 - i / 10) * 0.9 < bay(tx, ty)) continue; dot(g, tx, ty, pal[i < 4 ? 1 : 3]); }
  for (let yy = -3; yy <= 3; yy++) for (let xx = -3; xx <= 3; xx++) { const r = Math.hypot(xx, yy); if (r > 3.2) continue; dot(g, X + xx, Y + yy, r < 1.3 ? '#ffffff' : r < 2.3 ? pal[1] : pal[3]); }
}
function foeDraw(ctx, g, mo, x, y) {
  const e = foeE(ctx, mo); if (!e) { g.fillStyle = '#3a2f4a'; g.fillRect(x - 6, y - 12, 12, 12); return; }
  e.x = mo.x; e.y = mo.y; e.flash = mo.flash > 0 ? mo.flash : 0; ctx.ldKit.draw(g, e, mo.x - x, mo.y - y);
  if (mo.chg104 > 0) { const k = 1 - mo.chg104 / 0.45, X = Math.round((x + (e.fx || 0) * 5) * 2), Y = Math.round((y - 9) * 2), R = 1 + Math.round(k * 2.5), sk = FX.skinOf(mo.c.gang95), pal = (sk && sk.pal) || ['#fff', '#ffe9a0'];   /* gồng: đốm sáng lớn dần ở miệng (chỉ lúc gồng) */
    for (let yy = -R; yy <= R; yy++) for (let xx = -R; xx <= R; xx++) if (Math.hypot(xx, yy) <= R) dot(g, X + xx, Y + yy, Math.hypot(xx, yy) < R * 0.5 ? '#ffffff' : pal[1]); }
  if ((mo.stun104 || 0) > now() || (mo.stun95 || 0) > now()) { const k = now() * 6, X = Math.round(x * 2), Y = Math.round((y - 20) * 2); for (let i = 0; i < 3; i++) { const a = k + i * 2.094; dot(g, Math.round(X + Math.cos(a) * 6), Math.round(Y + Math.sin(a) * 2), '#ffe9a0'); } }
}

/* ---------- ảnh UI (PixelLab, _wip/p104/assets/px/ui/hud104) ---------- */
function img(k) { if (ST.img[k] !== undefined) return ST.img[k] && ST.img[k].complete && ST.img[k].naturalWidth ? ST.img[k] : null; if (typeof Image === 'undefined') return null; const im = new Image(); im.src = 'assets/px/ui/hud104/' + k + '.png'; ST.img[k] = im; return null; }
function portrait(ctx, u0) {   /* chân dung cắt từ sprite PixelLab của chính con đó */
  const sp = u0.sp; if (ST.port[sp]) return ST.port[sp]; const kit = ctx.ldKit; if (typeof document === 'undefined') return null;
  try { const K = 2, W = 80, H = 80, c = document.createElement('canvas'); c.width = W * K; c.height = H * K; const g = c.getContext('2d'); g.imageSmoothingEnabled = false; g.scale(K, K);
    if (sp === 'elyziuma' && ctx.elyz95 && ctx.elyz95.drawAt) ctx.elyz95.drawAt(g, 40, 70);
    else { if (!kit || !kit.ready()) return null; const f = kit.mk(sp, u0.lv || 10, u0, 40, 70); f.clip = 'idle'; f.ct = 0; f.fx = 0.01; f.fy = 1; f.flash = 0; kit.draw(g, f, 0, 0); }
    const d = g.getImageData(0, 0, c.width, c.height).data; let x0 = c.width, y0 = c.height, x1 = -1, y1 = -1;
    for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) if (d[(y * c.width + x) * 4 + 3] > 140) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    if (x1 < 0) return null; const bw = x1 - x0 + 1, bh = y1 - y0 + 1, side = Math.max(bw, Math.min(bh, Math.round(bw * 1.1))), o = document.createElement('canvas'); o.width = o.height = side;
    const og = o.getContext('2d'); og.imageSmoothingEnabled = false; og.drawImage(c, x0 - (side - bw) / 2, y0, side, side, 0, 0, side, side); ST.port[sp] = o.toDataURL(); return ST.port[sp];
  } catch (e) { return null; }
}

/* ---------- thanh đội (DOM, chỉ máy tính) ---------- */
const CSS = `#sq104{position:fixed;z-index:7;display:flex;align-items:flex-end;gap:2px;border:10px solid transparent;border-image:url(assets/px/ui/npick/panel.png) 12 fill / 10px round;image-rendering:pixelated;user-select:none;pointer-events:auto}
#sq104[hidden]{display:none}#sq104 .sq-s{position:relative;width:40px;height:40px;box-sizing:border-box;border:7px solid transparent;border-image:url(assets/px/ui/hotbar/slot.png) 8 fill / 7px;image-rendering:pixelated;display:flex;align-items:center;justify-content:center;cursor:pointer}
#sq104 .sq-s.on{border-image-source:url(assets/px/ui/hotbar/slot_on.png);transform:translateY(-2px)}#sq104 .sq-s img{width:30px;height:30px;image-rendering:pixelated;margin:-6px;pointer-events:none}
#sq104 .sq-s.in img{filter:brightness(.75) saturate(.5);opacity:.85}#sq104 .sq-s.ko img{filter:grayscale(1) brightness(.6)}#sq104 .sq-s.out{box-shadow:0 0 0 1px #7bd04a inset}
#sq104 .sq-hp{position:absolute;left:-4px;right:-4px;bottom:-9px;height:6px;border:2px solid transparent;border-image:url(assets/px/ui/hud91/obar_s.png) 3 fill / 2px;image-rendering:pixelated;pointer-events:none}
#sq104 .sq-hp b{position:absolute;left:1px;top:1px;bottom:1px;background:#7bd04a}#sq104 .sq-hp b.lo{background:#ffd45e}#sq104 .sq-hp b.vlo{background:#ff5a5a}
#sq104 .sq-k{position:absolute;left:-6px;top:-9px;font:13px VT323,monospace;color:#fff6c8;font-style:normal;text-shadow:1px 1px 0 #352022,-1px 0 0 #352022,0 -1px 0 #352022,1px 0 0 #352022;pointer-events:none}
#sq104 .sq-t{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);font:14px VT323,monospace;color:#fff6c8;text-shadow:1px 1px 0 #352022,-1px 0 0 #352022;pointer-events:none;font-style:normal}
#sq104 .sq-sep{width:6px;align-self:stretch;background:url(assets/px/ui/hud91/sep.png) center/6px 18px no-repeat;image-rendering:pixelated}
#sq104 .sq-lbl{position:absolute;left:0;right:0;top:-24px;text-align:center;font:15px VT323,monospace;color:#fff6c8;text-shadow:1px 1px 0 #352022,-1px 0 0 #352022,0 -1px 0 #352022;white-space:nowrap;pointer-events:none}`;
const ICO = { guard: 'cmd_guard', free: 'cmd_free', follow: 'cmd_follow' };
const icoSrc = k => 'assets/px/ui/hud104/' + k + '.png';
const esc = s => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
function barTick(ctx, dt) {
  if (typeof document === 'undefined') return; if ((ST.rT -= dt) > 0) return; ST.rT = 0.15;
  if (!ST.el) { if (!document.getElementById('sq104-css')) { const s = document.createElement('style'); s.id = 'sq104-css'; s.textContent = CSS; document.head.appendChild(s); }
    const el = document.createElement('div'); el.id = 'sq104'; el.hidden = true; document.body.appendChild(el); ST.el = el;
    el.addEventListener('pointerdown', e => { const b = e.target.closest('[data-a]'); if (!b) return; e.preventDefault(); e.stopPropagation(); const C = ST.ctx; if (!C) return; const a = b.dataset.a, id = b.dataset.id != null ? +b.dataset.id : null;
      if (a === 'port') { if (e.button === 2) toggle(C, id); else select(C, id); } else if (a === 'all') select(C, null); else if (a === 'atk') attack(C); else if (a === 'mode') cycleMode(C); ST.rT = 0; });
    el.addEventListener('contextmenu', e => { e.preventDefault(); e.stopPropagation(); }); }
  const el = ST.el, hb = document.getElementById('hotbar'), r = hb && !hb.hidden ? hb.getBoundingClientRect() : null, tm = team(ctx);
  const show = !!r && r.width > 0 && tm.length > 0 && ctx.S.mode === 'play' && !duelOn(ctx) && !(window.matchMedia && matchMedia('(pointer:coarse)').matches) && innerWidth >= 700;
  if (!show) { if (!el.hidden) el.hidden = true; return; }
  const k = sv(ctx), Lx = L(ctx), md = k.sel != null && k.out.includes(k.sel) ? modeOf(ctx, k.sel) : k.mode || 'guard';
  const cells = tm.slice(0, 6).map((m, i) => { const out = k.out.includes(m.id), u = ST.U.get(m.id); let hp = null, ko = 0;
    if (out && u) { if (isEly(ctx, u)) { const E = ctx.elyz95.E && ctx.elyz95.E(); if (E) hp = E.hp / E.max; ko = ctx.elyz95.koT ? Math.ceil(ctx.elyz95.koT()) : 0; } else { hp = u.f ? u.hp / u.max : u.ko ? 0 : 1; ko = u.ko ? Math.ceil(u.koT) : 0; } }
    return { id: m.id, n: nameOf(ctx, m), out, sel: k.sel === m.id, hp: hp == null ? null : Math.round(Math.max(0, hp) * 20) / 20, ko, url: portrait(ctx, m) || '', i }; });
  const sig = JSON.stringify([cells, md, k.sel, vi(ctx), Math.round(r.left), Math.round(r.top), !!img('cmd_atk')]); if (sig === ST.sig && !el.hidden) return; ST.sig = sig;
  const port = c => `<div class="sq-s${c.sel ? ' on' : ''}${c.out ? ' out' : ' in'}${c.ko ? ' ko' : ''}" data-a="port" data-id="${c.id}" title="${esc(Lx.tipPort(c.n, c.out))}">${c.url ? `<img src="${c.url}" alt="">` : ''}${c.ko ? `<i class="sq-t">${c.ko}</i>` : ''}${c.hp != null ? `<span class="sq-hp"><b class="${c.hp < 0.25 ? 'vlo' : c.hp < 0.5 ? 'lo' : ''}" style="right:${Math.round((1 - c.hp) * 100)}%"></b></span>` : ''}</div>`;
  const selName = k.sel != null && member(ctx, k.sel) ? nameOf(ctx, member(ctx, k.sel)) : Lx.all;
  el.innerHTML = `<div class="sq-lbl">${esc(selName)} · ${esc(Lx.mode[md])}</div>`
    + `<div class="sq-s${k.sel == null ? ' on' : ''}" data-a="all" title="${esc(Lx.tipAll)}"><img src="${icoSrc('team')}" alt=""></div>` + cells.map(port).join('')
    + `<b class="sq-sep"></b><div class="sq-s" data-a="atk" title="${esc(Lx.tipAtk)}"><img src="${icoSrc('cmd_atk')}" alt=""><i class="sq-k">G</i></div>`
    + `<div class="sq-s on" data-a="mode" title="${esc(Lx.tipMode(Lx.mode[md]) + ' · ' + Lx.tipKey)}"><img src="${icoSrc(ICO[md])}" alt=""><i class="sq-k">U</i></div>`;
  el.hidden = false; const w = el.offsetWidth || 400, x = Math.max(8, r.left), y = r.top - (el.offsetHeight || 64) - 6;
  el.style.left = Math.round(Math.min(x, innerWidth - w - 8)) + 'px'; el.style.top = Math.round(Math.max(8, y)) + 'px';
}

/* ---------- vòng chạy ---------- */
function syncUnits(ctx) {
  const k = sv(ctx), tm = team(ctx); k.out = k.out.filter((id, i, a) => a.indexOf(id) === i && tm.some(m => m.id === id)).slice(0, MAXN);
  for (const id of [...ST.U.keys()]) if (!k.out.includes(id)) ST.U.delete(id);
  k.out.forEach((id, i) => { let u = ST.U.get(id); const m = member(ctx, id); if (!u || u.sp !== m.sp) { u = mkUnit(ctx, m); ST.U.set(id, u); } u.m = m; u.lv = m.lv; u.slot = i; });
}
export const squad104 = {
  id: 'squad104',
  always: true,
  onZoneEnter(ctx) {
    ST.ctx = ctx; ST.shots = []; ST.focus.clear(); sv(ctx); syncUnits(ctx);
    for (const u of ST.U.values()) { u.act = null; u.dash = null; if (u.f) { const p = ctx.S.player, q = ctx.ldKit && ctx.ldKit.near ? ctx.ldKit.near(p.x - 12 + u.slot * 12, p.y + 6) : p; u.f.x = q.x; u.f.y = q.y; } }
    for (const k of ['cmd_atk', 'cmd_guard', 'cmd_free', 'cmd_follow', 'team', 'blk', 'shico']) img(k);
    const api = { press: () => press(ctx), toggle: id => toggle(ctx, id), isOut: sp => { const k = sv(ctx); return k.out.some(id => { const m = member(ctx, id); return m && m.sp === sp; }); },
      idOf: sp => { const k = sv(ctx); return k.out.find(id => { const m = member(ctx, id); return m && m.sp === sp; }) ?? null; },
      modeOf: sp => { const id = api.idOf(sp); return id == null ? 'guard' : modeOf(ctx, id); }, focusOf: sp => { const id = api.idOf(sp); return id == null ? null : focusOf(id); },
      rally: () => ST.rallyOn, danger: () => danger(ctx), ai: (mo, dt, steer) => monAI(mo, dt, steer), tauntOf: mo => tauntOf(mo), hurt: (u, d, src) => hurtU(ctx, u, d, src), units: () => [...ST.U.values()] };
    ctx.squad104 = api;
    if (ctx.comp79) {   /* comp79 (ô Ấn Chấn / J / feed80 / fieldct) hỏi bộ quản lý chung */
      const C = ctx.comp79; C.press = () => press(ctx); C.out = () => sv(ctx).out.length > 0;
      C.pos = () => { const t0 = team(ctx)[0], u = t0 && ST.U.get(t0.id); return u && u.onField() ? u.pos() : null; };
      C.slot = () => { const tm = team(ctx); if (!tm.length) return null; const k = sv(ctx), out = k.out.length > 0, n = out ? `${k.out.length}/${MAXN}` : nameOf(ctx, tm[0]); return { out, name: n, sp: tm[0].sp, tip: L(ctx).tipKey, lbl: out ? (vi(ctx) ? 'Thu' : 'Back') : (vi(ctx) ? 'Thả' : 'Go') }; };
    }
    if (typeof window !== 'undefined') window.__sq = {
      fighters: () => [...ST.U.values()].filter(u => u.onField()).map(u => ({ id: u.id, sp: u.sp, f: u.f || null })),   /* p110: farm103.spacing */
      press: () => press(ctx), toggle: id => toggle(ctx, id), sel: id => select(ctx, id), mode: m => setMode(ctx, m), cycle: () => cycleMode(ctx), attack: () => attack(ctx), cast: () => castSel(ctx), foes: (n, kind) => foes(ctx, n, kind),
      lock: mo => { if (mo) TGT.lock({ kind: 'mon', ref: mo }, true); return !!TGT.get(); }, mons: () => monList(ctx).filter(alive).map(mo => ({ id: mo.id, key: mo.c && mo.c.key, hp: Math.round(mo.hp), x: Math.round(mo.x), y: Math.round(mo.y), t104: (mo.taunt104 || 0) > now() ? mo.tu104 : null, rg: !!(mo.c && mo.c.rg104) })),
      mon: i => monList(ctx).filter(alive)[i] || null, clear: () => { for (const mo of monList(ctx).filter(m => m.c && (m.c.gang95 || m.c.rg104))) try { ctx.monsters.remove(mo); } catch (e) { } ST.shots = []; },
      cd0: id => { const u = ST.U.get(id); if (u) u.cd.skill = 0; }, setHp: (id, v) => { const u = ST.U.get(id); if (u && !isEly(ctx, u)) u.hp = v; }, cfg: CFG, log: () => ST.log.slice(), reset: () => { for (const k in ST.n) ST.n[k] = 0; ST.log = []; },
      state: () => { const k = sv(ctx), h = heroHp(ctx); return { out: k.out.slice(), mode: k.mode, per: { ...(k.per || {}) }, sel: k.sel, n: { ...ST.n }, shieldT: +ST.shieldT.toFixed(2), rally: ST.rallyOn, shots: ST.shots.length, duelLocal: duelLocal(ctx), player: { hp: Math.round(h.hp), max: h.max, x: Math.round(ctx.S.player.x), y: Math.round(ctx.S.player.y) },
        units: [...ST.U.values()].map(u => { const P = u.pos(), fo = focusOf(u.id); return { id: u.id, sp: u.sp, brain: isEly(ctx, u) ? 'elyz95' : 'chung', on: u.onField(), x: Math.round(P.x), y: Math.round(P.y), hp: isEly(ctx, u) ? (ctx.elyz95.E && ctx.elyz95.E() ? Math.round(ctx.elyz95.E().hp) : null) : Math.round(u.hp), max: u.max, ko: u.ko, mode: modeOf(ctx, u.id), focus: fo ? fo.id : null, tgt: u.tgt ? u.tgt.id : null, act: u.act && u.act.kind, clip: u.f && u.f.clip, guard: guardMove(u) && { kind: guardMove(u).kind, mv: guardMove(u).mv.id }, atk: atkMove(u) && atkMove(u).id }; }),
        bar: ST.el && !ST.el.hidden ? (() => { const r = ST.el.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), txt: ST.el.textContent }; })() : null }; } };
  },
  onZoneLeave() { ST.shots = []; for (const u of ST.U.values()) { u.act = null; u.dash = null; } },
  key(code, ctx) {
    if (ctx.S.mode !== 'play') return false;
    if (code === 'KeyG' && sv(ctx).out.length) { attack(ctx); return true; }
    if (code === 'KeyU' && team(ctx).length) { cycleMode(ctx); return true; }
    if (code === 'KeyH' && sv(ctx).out.length) { castSel(ctx); return true; }
    if (code === 'KeyX' && sv(ctx).out.length) { const ids = sv(ctx).out.slice(); for (const id of ids) { const u = ST.U.get(id); if (u) { u.act = null; u.dash = null; } toggle(ctx, id, true); } try { ctx.toast(ctx.lang() === 'en' ? 'Whole squad recalled (X)' : 'Thu cả đội về Ấn Chấn (X)'); ctx.sfx('pickup'); } catch (e) { } return true; }   /* p110m: X = thu cả đội bất cứ lúc nào (đòn dở huỷ) */
    return false;
  },
  update(dt, ctx) {
    ST.ctx = ctx; dt = Math.min(dt, 0.05); wrapHero(ctx); barTick(ctx, dt);
    if (ctx.S.mode !== 'play') return;
    if (ST.shieldT > 0) ST.shieldT -= dt;
    if (duelOn(ctx)) { ST.shots = []; return; }
    syncUnits(ctx); updShots(ctx, dt);
    ST.shooter = shooterNear(ctx);
    const was = ST.rallyOn; ST.rallyOn = rally(ctx) && ST.U.size > 0; if (ST.rallyOn && !was) { try { ctx.toast(L(ctx).lowHp); } catch (e) { } for (const id of ST.U.keys()) ST.focus.delete(id); log({ ev: 'rally' }); }
    for (const u of ST.U.values()) {
      if (isEly(ctx, u)) { for (const k in u.cd) u.cd[k] -= dt; u.blkT -= dt; continue; }   /* Elyziuma: bộ não elyz95 tự chạy */
      if (u.ko) { u.koT -= dt; if (u.koT <= 0) { u.ko = false; u.hp = 0; u.pop = true; try { ctx.toast(L(ctx).rest(nameOf(ctx, u.m))); } catch (e) { } } continue; }
      const f = ensureF(ctx, u); if (f) tickU(ctx, u, dt);
      if (rkOn(u) && u.f && !u.ko) rkUpd(ctx, u, dt);   /* p104rk */
    }
  },
  drawUI(ug, ctx, cx, cy, scale) {   /* thanh máu XANH phe mình trên đầu (khung obar_s hud91 qua target91.__ob91) — chỉ khi đã mất máu */
    if (duelOn(ctx) || ctx.S.mode !== 'play') return; const ob = globalThis.__ob91, su = ctx.scaleUI || scale;
    for (const u of ST.U.values()) { const E = isEly(ctx, u) && ctx.elyz95.E ? ctx.elyz95.E() : null; if (E) { if (!E.ko && E.hp < E.max - 0.5 && ob) { const w = Math.round(su * 13); ob(ug, (globalThis.__R89||Math.round)((E.x - cx) * scale - w / 2), (globalThis.__R89||Math.round)((E.y - cy - 46) * scale - su * 2.6), w, E.hp / E.max, 'ally', su); } continue; }
      if (isEly(ctx, u) || !u.f || u.ko || !(u.hp < u.max - 0.5)) continue; const w = Math.round(su * 11), sx = (u.f.x - cx) * scale, sy = (u.f.y - cy - (u.sp === 'rocky' ? 36 : u.f.tier === 'l' ? 34 : 26)) * scale;
      if (ob) ob(ug, Math.round(sx - w / 2), Math.round(sy - su * 2.6), w, u.hp / u.max, 'ally', su); else { ug.fillStyle = '#0b0d1e'; ug.fillRect(sx - w / 2, sy, w, 4); ug.fillStyle = '#7bd04a'; ug.fillRect(sx - w / 2 + 1, sy + 1, (w - 2) * Math.max(0, u.hp / u.max), 2); } }
  },
  drawGround(g, ctx, cx, cy) {
    if (duelOn(ctx)) return;
    for (const u of ST.U.values()) { if (isEly(ctx, u) || !u.f || u.ko) continue; D107.ground(g, u.f, cx, cy); if (SHADOW.on) shadowFor(g, u.f.x, u.f.y, (globalThis.__R89||Math.round)(u.f.x - cx), (globalThis.__R89||Math.round)(u.f.y - cy) + 1, (globalThis.__fw110 ? globalThis.__fw110(u.f.sp, u.sp === 'rocky' ? 22 : u.f.tier === 'l' ? 18 : u.f.tier === 's' ? 10 : 13) : u.sp === 'rocky' ? 22 : u.f.tier === 'l' ? 18 : u.f.tier === 's' ? 10 : 13), 0); }
  },
  drawables(ctx, cx, cy) {
    if (duelOn(ctx) || !ctx.ldKit) return []; const out = [], g = ctx.g, p = ctx.S.player;
    for (const u of ST.U.values()) {
      if (!isEly(ctx, u) && u.f && !u.ko) { const f = u.f; out.push({ y: f.y, f: () => D107.draw(f, g, cx, cy, (gg, a, c) => ctx.ldKit.draw(gg, f, a, c)) }); D107.drawables(out, f, g, cx, cy); }
      if (u.blkT > 0 && u.onField()) { const P = u.pos(), im = img('blk'); out.push({ y: P.y + (u.bdy < 0 ? -0.5 : 0.5), f: () => { const x = (globalThis.__R89||Math.round)(P.x - cx + (u.bdx || 0) * 8), y = (globalThis.__R89||Math.round)(P.y - cy - 8 + (u.bdy || 0) * 3);   /* khiên đỡ TĨNH 0,4 s (PixelLab) */
        if (im) { const w = im.width / 2, h = im.height / 2; g.drawImage(im, 0, 0, im.width, im.height, x - w / 2, y - h / 2, w, h); } else { g.fillStyle = '#bff3e6'; g.fillRect(x - 1, y - 6, 2, 12); } } }); }
    }
    if (ST.shieldT > 0) { const im = img('shico'); out.push({ y: p.y + 0.6, f: () => { const x = (globalThis.__R89||Math.round)(p.x - cx), y = (globalThis.__R89||Math.round)(p.y - cy - 38); if (im) g.drawImage(im, 0, 0, im.width, im.height, x - 4, y - 4, 8, 8); else { g.fillStyle = '#7bd04a'; g.fillRect(x - 3, y - 3, 6, 6); } } }); }   /* icon khiên TĨNH trên đầu khi được che */
    rkDraw(ctx, out, cx, cy);   /* p104rk: VFX 6 chiêu Rocky golem */
    for (const s of ST.shots) out.push({ y: s.y + 9, f: () => shotDraw(g, s, cx, cy) });
    return out;
  },
};
