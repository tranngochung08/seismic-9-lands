// rockycore.js — plan-38 (2026-10-15 anh duyệt): Rocky ăn MẢNH LÕI TRÙM → học 6 chiêu, mang 2 ô, Rocky TỰ dùng (gọi được bằng chat) + VFX va chạm.
//
// MẢNH LÕI: hạ trùm lần đầu (ctx.achieve → save.achievements có 'hacrocky' / 'trongdong' / 'guong' / 'hoden' / 'dongho' / 'bakunawa') → pt.corePend;
//   khi Rocky có mặt + hết trận → mảnh lõi PixelLab của trùm đó rơi cạnh người chơi, Rocky chạy tới ăn (nhai ~1 s, loé 1 lần) → mở chiêu bậc 1, tự mang nếu còn ô.
//   Save cũ đã hạ trùm trước plan-38 → nhận thẳng khi vào game (1 thông báo nhỏ). Chiêu dùng được khi Rocky ≥ cấp 20 (như Rocky-ha).
// CHIÊU (số liệu ở petlv.js): Địa Chấn (quake) · Khiên Đá Bóng (mirror) · Đá Từ Hút (magnet) · Hoá Đá (petrify) · Lôi Thạch Quyền (thunder) · Đối Chưởng (clash).
//   pet.js gọi ctx.rkSkill(pt, e, pool, tg, dt) trong combatTick (true = Rocky đang ra chiêu, đứng yên), ctx.rkGoal(e) (đi tới mảnh lõi), ctx.rkPose() (khung động tác).
//   Không xen trong Sàn Đấu (pet.js không gọi combatTick khi petWait), không dùng khi bị Câm Lặng (ctx.rkMute), không nhắm bạn tập (c.spar).
// VFX VA CHẠM (chỉ bật NGẮN khi có sự kiện — không hào quang lặp): dừng hình 60–90 ms đòn mạnh (Rocky ↔ trùm), tia va chạm theo hệ, số sát thương màu theo hệ,
//   ĐẤU CHƯỞNG chung cho mọi trùm bắn chưởng / đạn có báo trước (ctx.threat), HỢP KÍCH (người chơi + Rocky cùng trúng 1 mục tiêu trong 0,6 s).
// Thử: window.__rc (state, give, cast, eq, pend, log). Test: tools/qa-tests-rocky38.js. Ảnh: tools/px-rk38.py.
import { ART } from '../art.js';
import * as LV from './petlv.js';
import { sheet as bSheet, drawAt as bDraw, frameAt as bFrame, darkSheet, beamKey } from './beamfx.js';
import { hacrocky } from './hacrocky.js';
import { trongdong } from './trongdong.js';
import { guong } from './guong.js';
import { hoden } from './hoden.js';
import { dongho } from './dongho.js';
import { bakunawa } from './bakunawa.js';

const TAU = Math.PI * 2, TS = 16, PR = 6;
const BOSS_NAME = {
  vi: { hacrocky: 'Hắc Rocky', trongdong: 'Trống Đồng Thiên Lôi', guong: 'Gương Địa Chấn', hoden: 'Hố Đen Địa Tâm', dongho: 'Đồng Hồ Đứt Dây', bakunawa: 'Ngô Công Lôi Thần' },
  en: { hacrocky: 'Shadow Rocky', trongdong: 'Thunder Bronze Drum', guong: 'Quake Mirror', hoden: 'Void Devourer', dongho: 'Broken-Spring Clock', bakunawa: 'Thunder Centipede God' },
};
const DESC = {
  vi: {
    clash: 'Rocky-ha va thẳng vào chưởng / đạn lớn của trùm: đạn vỡ giữa đường; chưởng thì GIẰNG CO — bấm E / Space / A liên tục góp sức, thắng thì quả cầu nổ ngược vào trùm.',
    quake: 'Rocky nhảy lên dậm hai nắm đấm xuống đất: vòng nứt đất lan ra, quái quanh Rocky trúng đòn và bị hất văng. Bậc cao: vòng rộng hơn, mạnh hơn.',
    mirror: 'Khi đòn có báo trước sắp trúng bạn, Rocky dựng phiến đá bóng như gương chắn trước bạn: đòn bật ngược vào kẻ bắn. Chắn 2 đòn (bậc 4+: 3 đòn).',
    magnet: 'Rocky ném cục đá từ vào giữa đám quái: hút quái con về một chỗ ~1 giây rồi nổ — gom quái cho bạn chém một lượt.',
    petrify: 'Rocky phủ lớp đá lên đối thủ: quái thường đứng hẳn ~1,5 giây, trùm chậm một nửa ~2 giây — mở khe để bạn chém hoặc né.',
    thunder: 'Cú đấm tích sét: trúng mục tiêu rồi sét nảy sang 2 kẻ gần đó (bậc 4+: 3 kẻ).',
  },
  en: {
    clash: "Rocky-ha slams into the boss's big blasts: bullets shatter mid-air; beams lock into a STRUGGLE — mash E / Space / A to push, win and the orb blows back into the boss.",
    quake: 'Rocky jumps and pounds the ground: a ring of cracking earth hits and flings every monster around Rocky. Higher tiers: wider, stronger.',
    mirror: 'When a telegraphed attack is about to hit you, Rocky raises a polished stone slab in front of you: the attack bounces back at the shooter. Blocks 2 hits (tier 4+: 3).',
    magnet: 'Rocky throws a lodestone into a pack of monsters: it pulls small monsters together for ~1 s, then bursts — line them up for one big swing.',
    petrify: 'Rocky crusts the foe in stone: small monsters freeze ~1.5 s, bosses move at half speed ~2 s — an opening to hit or dodge.',
    thunder: 'A lightning-charged punch: hits the target, then the bolt jumps to 2 more foes nearby (tier 4+: 3).',
  },
};
const STR = {
  vi: {
    learned: (b, s) => `Rocky ăn Mảnh Lõi ${b} — học được chiêu ${s}!`, needLv: ' (dùng được khi Rocky đạt cấp 20)', equipped: s => `Rocky mang theo: ${s}`,
    migr: n => `Rocky đã hấp thụ ${n} mảnh lõi trùm từ trước — mở thẻ Rocky (Túi đồ) để chọn 2 chiêu mang theo`, coreDrop: b => `Mảnh Lõi ${b} rơi ra — Rocky đang tới ăn`,
    full: 'Rocky chỉ mang được 2 chiêu học từ trùm — bỏ bớt một chiêu trước', notLearned: (s, b) => `Rocky chưa học ${s} — hạ ${b} để lấy mảnh lõi`,
    notEq: s => `Rocky chưa mang ${s} — mở thẻ Rocky để chọn`, lowLv: s => `${s} cần Rocky cấp 20`, cd: (s, n) => `${s} đang hồi (${n} giây)`, noTarget: s => `Không có mục tiêu cho ${s}`,
    say: { clash: 'Đối chưởng nào!', quake: 'Địa chấn!', mirror: 'Đỡ cho bạn!', magnet: 'Hút hết lại đây!', petrify: 'Hoá đá đi!', thunder: 'Đấm sét!' },
    combo: 'HỢP KÍCH!', clashGo: 'ĐỐI CHƯỞNG — GIẰNG CO!', mash: 'Đẩy luồng! (bấm liên tục)', clashWin: 'Quả cầu nổ ngược vào trùm!', clashLose: 'Rocky bị đẩy lùi!', cancel: 'ĐỐI CHƯỞNG!',
    eqTitle: 'Chiêu học từ trùm', eqHint: 'Chạm chiêu đã học để mang / bỏ (tối đa 2). Rocky tự dùng khi đánh; gõ tên chiêu trong ô chat (vd <b>địa chấn</b>, <b>khiên</b>) để gọi ngay.',
    worn: 'Đang mang', learnedTag: 'Đã học', lockedBy: b => `Hạ ${b}`, tier: 'Bậc', lvNeed: 'Cần cấp 20',
  },
  en: {
    learned: (b, s) => `Rocky ate the ${b} Core — learned ${s}!`, needLv: ' (usable from Rocky Lv 20)', equipped: s => `Rocky carries: ${s}`,
    migr: n => `Rocky absorbed ${n} boss cores earlier — open the Rocky tab (Bag) to pick 2 skills to carry`, coreDrop: b => `The ${b} Core dropped — Rocky is going to eat it`,
    full: 'Rocky can carry only 2 boss skills — drop one first', notLearned: (s, b) => `Rocky hasn't learned ${s} — defeat ${b} for its core`,
    notEq: s => `Rocky isn't carrying ${s} — pick it in the Rocky tab`, lowLv: s => `${s} needs Rocky Lv 20`, cd: (s, n) => `${s} is cooling down (${n}s)`, noTarget: s => `No target for ${s}`,
    say: { clash: 'Beam clash!', quake: 'Quake!', mirror: 'I got you!', magnet: 'Come here, all of you!', petrify: 'Turn to stone!', thunder: 'Thunder fist!' },
    combo: 'TEAM STRIKE!', clashGo: 'BEAM CLASH — STRUGGLE!', mash: 'Push the beam! (mash)', clashWin: 'The orb blows back into the boss!', clashLose: 'Rocky was pushed back!', cancel: 'BEAM CLASH!',
    eqTitle: 'Boss skills', eqHint: 'Tap a learned skill to carry / drop it (max 2). Rocky uses them on its own in fights; type its name in the chat (e.g. <b>quake</b>, <b>shield</b>) to call it now.',
    worn: 'Carried', learnedTag: 'Learned', lockedBy: b => `Defeat ${b}`, tier: 'Tier', lvNeed: 'Needs Lv 20',
  },
};
const vi = ctx => ctx.lang() === 'vi';
const L = ctx => STR[vi(ctx) ? 'vi' : 'en'];
const SN = (ctx, id) => { const S = LV.SKILLS[id]; return S ? (vi(ctx) ? S.vi : S.en) : id; };
const BN = (ctx, b) => BOSS_NAME[vi(ctx) ? 'vi' : 'en'][b] || b;
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const EL_COL = { earth: '#f0c080', mirror: '#c8f4ff', void: '#d6a0ff', time: '#efe4cc', bolt: '#fff27a', dark: '#ff9cf0', combo: '#ffd45e' };
const now = ctx => ctx.S.time;
const SKILL_FX = {   /* VFX PixelLab theo hệ: tên mới (vfx_workbench plan-38) → dự phòng sheet có sẵn */
  hit_earth: ['rc_hit_earth', 'rk_punch_t4', 'dirt_puff'], quake: ['rc_quake', 'spar_shock', 'rk_shock'], hit_mirror: ['rc_hit_mirror', 'gm_glint'], mirror_up: ['rc_mirror_up', 'gm_arrive', 'gm_ripple'],
  mirror_break: ['rc_mirror_break', 'gm_shatter'], magnet: ['rc_magnet', 'hd_implode'], magnet_burst: ['rc_magnet_burst', 'hd_nova'], petrify: ['rc_petrify', 'petrify'], petrify_big: ['rc_petrify_big', 'rc_petrify', 'petrify'], petrify_end: ['rc_petrify_end', 'td_poof'],
  hit_bolt: ['rc_hit_bolt', 'bk_zap', 'td_spark'], bolt_fist: ['rc_bolt_fist', 'bk_zap'], clash: ['rc_clash', 'hr_clash'], clash_boom: ['rc_clash_boom', 'hr_boom'], combo: ['rc_combo', 'hr_boom'],
  absorb: ['rc_absorb', 'rk_book_t7', 'level_up'], hit_void: ['rc_hit_void', 'hd_nova'], hit_dark: ['rc_hit_dark', 'hr_boom'],
};
const ST = {
  ctx: null, cast: null, cd: {}, shard: null, slab: null, stone: null, chains: [], refl: [], orb: null, slow: { until: 0, mul: 1, mo: null },
  stopOn: false, stopUntil: 0, stopNext: 0, popCol: null, pHitT: -99, lastP: null, lastR: null, comboCd: 0, guard: [], migT: 0, scanT: 0, bossPos: null,
  stats: { cast: {}, blocks: 0, reflects: 0, combos: 0, clashes: 0, clashWin: 0, intercepts: 0, stops: 0, ate: 0 }, log: [],
};
const log = s => { ST.log.push(`${ST.ctx ? ST.ctx.S.time.toFixed(1) : '?'} ${s}`); if (ST.log.length > 200) ST.log.shift(); };
const R = ctx => ctx.rocky || null;
const petOf = ctx => { const r = R(ctx); return r && r.pet ? r.pet() : null; };
function ent(ctx) { const r = R(ctx), pt = petOf(ctx), e = r && r.ent ? r.ent() : null; if (!e || !pt || e.state === 'home' || e.state === 'mount' || (pt.koT || 0) > 0 || pt.cmd === 'home') return null; return e; }
const atkOf = ctx => { const r = R(ctx), s = r && r.stats ? r.stats() : null; return s ? s.atk : 10; };
function mons(ctx) { const L0 = ctx.monsters && ctx.monsters.list ? ctx.monsters.list() : []; return L0.filter(mo => mo && mo.hp > 0 && mo.state !== 'dead' && !mo.dead && !mo.statue && !(mo.c && mo.c.spar)); }
const dst = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const rkLift = (ctx, e) => (ctx.air && ctx.air.on && ctx.air.on() ? ctx.air.lift() : 0) + Math.round((e && e.lift) || 0);   /* như pet.js: Rocky bay (AL) / nhảy qua vật (lift) — VFX quanh thân trừ đúng độ nâng */
const inAir = ctx => !!(ctx.air && ctx.air.on && ctx.air.on());   /* trên trời không có mặt đất: không Địa Chấn / Khiên đá / Đá Từ */
const isBoss = mo => !!(mo && mo.c && (mo.c.boss || mo.c.hrBoss || mo.c.tdBoss || mo.c.gmBoss || mo.c.hdBoss || mo.c.dhBoss || mo.c.bkBoss || mo.c.lyBoss || mo.c.chaseBoss || (mo.max || 0) >= 3000));   /* trùm khe nứt / trời gắn cờ riêng (gmBoss, hdBoss…), không phải c.boss */
function fx(ctx, key, x, y, top = true) {   /* sheet plan-38 (rc_*) có gốc ox / oy → đặt gốc hiệu ứng đúng (x, y); sheet cũ: đáy-giữa */
  const L0 = SKILL_FX[key] || [key]; if (!ctx.vfx) return false;
  for (const n of L0) { const s = ART.vfx && ART.vfx[n]; if (!s) continue; const X = s.ox != null ? x + s.w / 2 - s.ox : x, Y = s.oy != null ? y + s.h - s.oy : y; if (ctx.vfx(n, X, Y, 0, top)) return true; }
  return false;
}
function deal(ctx, mo, dmg, kb, el) { const r = R(ctx); if (!r || !r.deal) return; ST.popCol = EL_COL[el] || null; try { r.deal(mo, Math.max(1, Math.round(dmg)), kb); } finally { ST.popCol = null; } }
function say(ctx, txt) { const r = R(ctx); if (r && r.say) r.say(txt); }
const tierOf = (pt, id) => (pt ? LV.tierOf(pt, id) : 0);
const isEq = (pt, id) => LV.equipped(pt).includes(id);

/* ---------------- dừng hình (hit-stop): đòn mạnh trúng → thời gian gần như dừng 60–90 ms (thời gian thật) ---------------- */
function hitStop(ctx, ms) {
  if (!ctx.S || ctx.S.mode !== 'play') return; const tn = performance.now();
  if (!ST.stopOn && ((ctx.S.timeScale ?? 1) !== 1 || tn < ST.stopNext)) return;   /* đang có cảnh chậm khác (biến hình, né hoàn hảo) → nhường; giãn cách ≥ 0,3 s cho khỏi giật */
  ST.stopUntil = Math.max(ST.stopUntil, tn + ms); ST.stopNext = tn + ms + 800;
  if (!ST.stopOn) { ST.stopOn = true; ctx.S.timeScale = 0.04; ST.stats.stops++; }
}
function stopTick(ctx) { if (ST.stopOn && (performance.now() >= ST.stopUntil || ctx.S.mode !== 'play')) { ST.stopOn = false; if (ctx.S.timeScale === 0.04) ctx.S.timeScale = 1; } }

/* ---------------- đòn có báo trước (ki.js ctx.threat) ---------------- */
function thrList(ctx) { try { return ctx.threat && ctx.threat.list ? ctx.threat.list() : []; } catch (e) { return []; } }
function segInfo(t, x, y) { const ax = t.from.x, ay = t.from.y, dx = t.to.x - ax, dy = t.to.y - ay, L2 = dx * dx + dy * dy || 1, u = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / L2)); return { d: Math.hypot(x - (ax + dx * u), y - (ay + dy * u)), along: u * Math.sqrt(L2), len: Math.sqrt(L2), ux: dx / Math.sqrt(L2), uy: dy / Math.sqrt(L2) }; }
function impactAt(t, x, y) { if (t.speed != null) { const s = segInfo(t, x, y); return (t.t0 || 0) + s.along / Math.max(1, t.speed); } return t.at; }
function hitsPt(t, x, y, pad = 6) { if (t.radius != null) return Math.hypot(x - t.to.x, y - t.to.y) <= t.radius + pad; return segInfo(t, x, y).d <= (t.width || 12) / 2 + pad; }
const fromAbove = t => (t.kind === 'slam' || t.kind === 'circle' || (t.kind === 'bolt' && Math.abs(t.from.x - t.to.x) < 20 && t.to.y - t.from.y > 30));
function incoming(ctx, x, y, lo, hi, kinds) {   /* đòn sẽ trúng điểm (x, y) trong [lo, hi] giây tới — gần nhất trước */
  let best = null, bt = 1e9;
  for (const t of thrList(ctx)) { if (!t || t.done || !t.from || !t.to) continue; if (kinds && !kinds.includes(t.kind)) continue; if (fromAbove(t)) continue;
    const left = impactAt(t, x, y) - now(ctx); if (left < lo || left > hi) continue; if (!hitsPt(t, x, y)) continue; if (left < bt) { bt = left; best = t; } }
  return best ? { t: best, left: bt } : null;
}
const guarded = ctx => ST.guard.some(g => now(ctx) < g.until);

/* ---------------- bọc hero.hit: khiên đá / đối chưởng chặn đòn; bọc monsters.damage: dừng hình + Hợp Kích; bọc ctx.pop: màu theo hệ ---------------- */
function wrapHero(ctx) {
  const h = ctx.hero; if (!h || WRAPS.has(h)) return; WRAPS.add(h); const h0 = h.hit;
  h.hit = function (d, ...a) { try { if (blockHit(ctx)) return false; } catch (e) { console.error('rc block', e); } return h0.call(this, d, ...a); }; h.__rc = true;
}
const WRAPS = new WeakSet();
function wrapDamage(ctx) {
  const M = ctx.monsters; if (!M || !M.damage || WRAPS.has(M)) return; WRAPS.add(M); const d0 = M.damage;
  M.damage = function (mo, dmg, src, ...a) { const hp0 = mo && mo.hp; const r = d0.call(this, mo, dmg, src, ...a); try { const e = ent(ctx); if (e && src === e && mo && hp0 > 0) onRockyHit(ctx, mo, dmg); } catch (er) { console.error('rc dmg', er); } return r; };
  M.damage.__rc = true;
}
function wrapPop(ctx) { if (!ctx.pop || ctx.__rcPop) return; ctx.__rcPop = true; const p0 = ctx.pop; ctx.pop = function (x, y, txt, col, ...a) { return p0.call(this, x, y, txt, ST.popCol || col, ...a); }; ctx.pop.__rc = true; }
function wrapRockyHit(ctx) {   /* trùm đánh trúng Rocky đòn mạnh (hất bay) → dừng hình + tia va chạm */
  const r = R(ctx); if (!r || !r.hitBy || WRAPS.has(r)) return; WRAPS.add(r); const h0 = r.hitBy;
  r.hitBy = function (raw, src, kx, ky, kb, kind) { const out = h0.call(this, raw, src, kx, ky, kb, kind); try { if (out && (kind === 'fly' || kind === 'launch' || (kb || 0) >= 50)) { const e = r.ent && r.ent(); if (e) fx(ctx, 'hit_dark', e.x, e.y - 6 - rkLift(ctx, e)); hitStop(ctx, 70); } } catch (e) { } return out; };
  r.hitBy.__rc = true;
}
function onRockyHit(ctx, mo, dmg) {
  const t = now(ctx); ST.lastR = { mo, t };
  if (mo.c && isBoss(mo) && dmg >= atkOf(ctx) * 3) hitStop(ctx, 65);
  if (ST.lastP && ST.lastP.mo === mo && t - ST.lastP.t <= 0.6) combo(ctx, mo);
}
function pollPlayerHit(ctx) {
  const M = ctx.monsters; if (!M || !M.lastHitT) return; const lt = M.lastHitT(); if (!(lt > ST.pHitT)) return; ST.pHitT = lt;
  const p = ctx.S.player; let best = null, bd = 44; for (const mo of mons(ctx)) { const d = dst(mo, p) - (isBoss(mo) ? 24 : 0); if (d < bd) { bd = d; best = mo; } }
  if (!best) return; ST.lastP = { mo: best, t: lt };
  if (ST.lastR && ST.lastR.mo === best && lt - ST.lastR.t <= 0.6) combo(ctx, best);
}
function combo(ctx, mo) {   /* HỢP KÍCH: người chơi + Rocky cùng trúng 1 mục tiêu trong 0,6 s */
  if (ST.comboCd > 0 || ST.inCombo || !ent(ctx)) return; ST.inCombo = true; ST.comboCd = 6; ST.stats.combos++; log('combo ' + (mo.c && mo.c.key));
  try {
    const bonus = atkOf(ctx) * (isBoss(mo) ? 1.4 : 1); fx(ctx, 'combo', mo.x, mo.y - 8); deal(ctx, mo, bonus, isBoss(mo) ? 0 : 120, 'combo');
    if (ctx.pop) ctx.pop(mo.x, mo.y - 30, L(ctx).combo, EL_COL.combo); hitStop(ctx, 90); if (ctx.quake) ctx.quake(0.22); ctx.sfx('smash');
  } finally { ST.inCombo = false; ST.lastP = null; ST.lastR = null; }
}

/* ---------------- KHIÊN ĐÁ BÓNG: chặn đòn đến từ phía phiến đá ---------------- */
function slabCovers(ctx, S) {
  const p = ctx.S.player, t = now(ctx), nx = Math.cos(S.ang), ny = Math.sin(S.ang);
  for (const th of thrList(ctx)) { if (!th || !th.from || fromAbove(th)) continue; const at = impactAt(th, p.x, p.y - PR); if (t < at - 0.25 || t > at + (th.dur || 0) + 0.15) continue;
    const dx = th.from.x - p.x, dy = th.from.y - (p.y - PR), d = Math.hypot(dx, dy) || 1; if ((dx * nx + dy * ny) / d > 0.2) return th; }
  for (const mo of mons(ctx)) { if (!isBoss(mo)) continue; const dx = mo.x - p.x, dy = mo.y - p.y, d = Math.hypot(dx, dy) || 1; if (d < 220 && (dx * nx + dy * ny) / d > 0.55) return { from: { x: mo.x, y: mo.y }, boss: mo }; }
  return null;
}
function blockHit(ctx) {
  if (guarded(ctx)) { log('guard block'); return true; }
  const S = ST.slab; if (!S || S.broken) return false;
  const th = slabCovers(ctx, S); if (!th) return false;
  S.blocks++; ST.stats.blocks++; log('slab block ' + (th.kind || 'boss'));
  fx(ctx, 'hit_mirror', S.x, S.y - 10); hitStop(ctx, 60); ctx.sfx('glass');
  if (th.id && typeof th.id === 'object' && !(th.id.hp > 0)) { th.id.life = 0; th.id.dead = true; }   /* đạn là object của module trùm → vỡ luôn */
  if (th.id != null && ctx.threat && ctx.threat.remove) try { ctx.threat.remove(th.id); } catch (e) { }
  const tg = th.boss || nearestBoss(ctx, th.from.x, th.from.y) || nearestMon(ctx, th.from.x, th.from.y, 90);
  if (tg) ST.refl.push({ x: S.x, y: S.y - 10, tg, t: 0, T: 0.32, tier: S.tier });
  ST.guard.push({ until: now(ctx) + 0.35 });   /* cùng đòn (tia kéo dài) không trúng nữa */
  if (S.blocks >= S.max) { S.broken = true; S.t = Math.max(S.t, S.dur - 0.25); fx(ctx, 'mirror_break', S.x, S.y - 8); }
  return true;
}
function nearestBoss(ctx, x, y) { let b = null, bd = 1e9; for (const mo of mons(ctx)) if (isBoss(mo)) { const d = Math.hypot(mo.x - x, mo.y - y); if (d < bd) { bd = d; b = mo; } } return b; }
function nearestMon(ctx, x, y, r) { let b = null, bd = r; for (const mo of mons(ctx)) { const d = Math.hypot(mo.x - x, mo.y - y); if (d < bd) { bd = d; b = mo; } } return b; }

/* ---------------- AI chọn chiêu (pet.js combatTick gọi mỗi khung) ---------------- */
const READY = (ctx, pt, id) => isEq(pt, id) && tierOf(pt, id) > 0 && !(ST.cd[id] > 0);
function think(ctx, pt, e, pool, tg) {
  ST.thinkN = (ST.thinkN || 0) + 1; ST.why = '';
  if (ST.cast) return true;
  if (ctx.rkMute && ctx.rkMute()) { ST.why = 'mute'; return false; }
  if (!LV.equipped(pt).length) { ST.why = 'noeq'; return false; }
  const p = ctx.S.player, P = pool.filter(mo => !(mo.c && mo.c.spar)), T = tg && !(tg.c && tg.c.spar) ? tg : null;
  /* 1. Khiên: đòn có báo trước sắp trúng NGƯỜI CHƠI */
  if (READY(ctx, pt, 'mirror') && !inAir(ctx) && !ST.slab && dst(e, p) < 170) { const h = incoming(ctx, p.x, p.y - PR, 0.12, 0.95, ['projectile', 'beam', 'lunge', 'sweep', 'bolt']); if (h) return start(ctx, pt, e, 'mirror', { th: h.t }); }
  /* 2. Đối Chưởng: chưởng / đạn bắn vào người chơi hoặc Rocky */
  if (READY(ctx, pt, 'clash') && !(ctx.rkHaHold && ctx.rkHaHold()) && tierOf(pt, 'ha') > 0 && !(R(ctx).beamInfo && R(ctx).beamInfo())) {   /* Đối Chưởng bắn được cả khi Rocky-ha thường đang hồi (chiêu có hồi riêng) */
    const h = incoming(ctx, p.x, p.y - PR, 0.12, 1.5, ['beam', 'projectile']) || incoming(ctx, e.x, e.y - 8, 0.12, 1.5, ['beam', 'projectile']);
    if (h && clashStart(ctx, pt, e, h)) return true;
  }
  if (!P.length) { ST.why = 'nopool'; return false; }
  ST.why = 'nocond';
  /* 3. Hoá Đá: trùm / quái to đang ra đòn (hoặc trong tầm) */
  if (READY(ctx, pt, 'petrify')) { const big = T && (isBoss(T) || (T.max || 0) >= atkOf(ctx) * 4) ? T : P.find(mo => isBoss(mo)); if (big && dst(big, e) < 110 && !(isBoss(big) && now(ctx) < ST.slow.until)) return start(ctx, pt, e, 'petrify', { mo: big }); }
  /* 4. Địa Chấn: ≥ 2 quái sát Rocky, hoặc trùm áp sát */
  if (READY(ctx, pt, 'quake') && !inAir(ctx)) { const Q = LV.quakeOf(tierOf(pt, 'quake')), near = P.filter(mo => dst(mo, e) < Q.r + (isBoss(mo) ? 18 : 0)); if (near.length >= 2 || near.some(mo => isBoss(mo))) return start(ctx, pt, e, 'quake', {}); }
  /* 5. Đá Từ Hút: ≥ 3 quái thường trong ~120 px quanh người chơi */
  if (READY(ctx, pt, 'magnet') && !inAir(ctx)) { const sm = P.filter(mo => !isBoss(mo) && dst(mo, p) < 130); if (sm.length >= 3) { const cx = sm.reduce((s, m) => s + m.x, 0) / sm.length, cy = sm.reduce((s, m) => s + m.y, 0) / sm.length; return start(ctx, pt, e, 'magnet', { x: cx, y: cy }); } }
  /* 6. Lôi Thạch Quyền: mục tiêu trong tầm đấm */
  if (READY(ctx, pt, 'thunder') && T && dst(T, e) < 22 + (isBoss(T) ? 16 : 0)) return start(ctx, pt, e, 'thunder', { mo: T });
  return false;
}
const CAST_T = { quake: 0.8, mirror: 0.42, magnet: 0.55, petrify: 0.55, thunder: 0.5, eat: 1.15 };
const POSE = { quake: ['sk_quake', 'hop'], mirror: ['sk_mirror', 'ha'], magnet: ['sk_magnet', 'punch'], petrify: ['sk_petrify', 'ha'], thunder: ['sk_thunder', 'punch'], clash: ['ha', 'ha'], eat: ['sk_eat', 'cheer'] };
function face(e, x, y) { const dx = x - e.x, dy = y - e.y; e.face = Math.abs(dy) > Math.abs(dx) * 1.2 ? (dy > 0 ? 'ds' : 'dn') : 'side'; if (Math.abs(dx) > 2) e.dir = dx < 0 ? -1 : 1; }
function start(ctx, pt, e, id, o) {
  const t = tierOf(pt, id) || 1; ST.cast = { id, t: 0, T: CAST_T[id] || 0.5, tier: t, done: false, ...o }; ST.stats.cast[id] = (ST.stats.cast[id] || 0) + 1; log('cast ' + id + ' t' + t);
  e.moving = false; e.sit = false;
  const tx = o.mo ? o.mo.x : o.x != null ? o.x : o.th ? o.th.from.x : ctx.S.player.x, ty = o.mo ? o.mo.y : o.y != null ? o.y : o.th ? o.th.from.y : ctx.S.player.y; face(e, tx, ty);
  if (id === 'quake') e.hop = 0.45;
  if (Math.random() < 0.35) say(ctx, L(ctx).say[id]);
  return true;
}
function castTick(ctx, dt) {
  const C = ST.cast; if (!C) return; const e = ent(ctx), pt = petOf(ctx);
  if (!e || !pt || e.kfly || e.kdown > 0) { ST.cast = null; return; }   /* Rocky bị hất / gục → huỷ chiêu */
  C.t += dt; const fire = at => { if (!C['f' + at] && C.t >= at) { C['f' + at] = true; return true; } return false; };
  if (C.id === 'quake' && fire(0.38)) quakeHit(ctx, pt, e, C);
  else if (C.id === 'mirror' && fire(0.2)) slabUp(ctx, pt, e, C);   /* khớp khung đập tay xuống đất của clip sk_mirror */
  else if (C.id === 'magnet' && fire(0.33)) {   /* khớp khung buông tay ném của clip sk_magnet */ const M = LV.magnetOf(C.tier); ST.stone = { x0: e.x, y0: e.y - 10, x: C.x, y: C.y, t: 0, fly: 0.38, field: M.pull, r: M.r, tier: C.tier, burst: false }; ctx.sfx('whoosh'); }
  else if (C.id === 'petrify' && fire(0.3)) petrifyHit(ctx, pt, e, C);
  else if (C.id === 'thunder' && fire(0.22)) thunderHit(ctx, pt, e, C);
  else if (C.id === 'eat') eatTick(ctx, pt, e, C);
  if (C.t >= C.T) { if (C.id !== 'eat') ST.cd[C.id] = cdOf(C.id, C.tier); ST.cast = null; }
}
function cdOf(id, t) { return ({ quake: LV.quakeOf, mirror: LV.mirrorOf, magnet: LV.magnetOf, petrify: LV.petrifyOf, thunder: LV.thunderOf, clash: LV.clashOf }[id])(t).cd; }

function quakeHit(ctx, pt, e, C) {
  const Q = LV.quakeOf(C.tier), a = atkOf(ctx); let n = 0, boss = false;
  fx(ctx, 'quake', e.x, e.y + 2, false); if (ctx.quake) ctx.quake(0.28); ctx.sfx('smash');
  for (const mo of mons(ctx)) { const d = dst(mo, e); if (d > Q.r + (isBoss(mo) ? 18 : 0)) continue; n++;
    deal(ctx, mo, a * Q.mul, isBoss(mo) ? 0 : Q.kb, 'earth'); fx(ctx, 'hit_earth', mo.x, mo.y - 4); if (isBoss(mo)) boss = true; }   /* quái thường bị hất văng ra ngoài vòng nứt (kb) */
  if (boss || n >= 3) hitStop(ctx, 75); log('quake hit ' + n);
}
function slabUp(ctx, pt, e, C) {
  const p = ctx.S.player, M = LV.mirrorOf(C.tier), th = C.th, sx = th ? th.from.x : p.x + 20, sy = th ? th.from.y : p.y, ang = Math.atan2(sy - (p.y - PR), sx - p.x);
  ST.slab = { x: p.x + Math.cos(ang) * 14, y: p.y + Math.sin(ang) * 10 + 2, ang, t: 0, dur: M.dur, blocks: 0, max: M.max, tier: C.tier, broken: false };
  fx(ctx, 'mirror_up', ST.slab.x, ST.slab.y); ctx.sfx('rock_break'); log('slab up');
}
function petrifyHit(ctx, pt, e, C) {
  const mo = C.mo; if (!mo || !(mo.hp > 0)) return; const P = LV.petrifyOf(C.tier);
  fx(ctx, isBoss(mo) ? 'petrify_big' : 'petrify', mo.x, mo.y + 2); ctx.sfx('petrify');
  if (isBoss(mo)) { ST.slow = { until: now(ctx) + P.boss, mul: P.slow, mo }; if (ctx.pop) ctx.pop(mo.x, mo.y - 30, `🗿 ×${P.slow}`, EL_COL.time); hitStop(ctx, 60); }
  else { mo.stoneT = Math.max(mo.stoneT || 0, now(ctx) + P.mob); mo.kb = null; if (ctx.pop) ctx.pop(mo.x, mo.y - 18, `🗿 ${P.mob}s`, EL_COL.time); }
  deal(ctx, mo, atkOf(ctx) * 0.6, 0, 'time'); log('petrify ' + (isBoss(mo) ? 'boss' : mo.c.key));
}
function thunderHit(ctx, pt, e, C) {
  const mo = C.mo; if (!mo || !(mo.hp > 0)) return; const T = LV.thunderOf(C.tier), a = atkOf(ctx);
  fx(ctx, 'bolt_fist', e.x + (e.dir || 1) * 6, e.y - 8 - rkLift(ctx, e)); fx(ctx, 'hit_bolt', mo.x, mo.y + 1); deal(ctx, mo, a * T.mul, isBoss(mo) ? 0 : 90, 'bolt'); ctx.sfx('zap');
  let from = mo; const hit = new Set([mo]);
  for (let k = 0; k < T.chain; k++) { let nx = null, nd = T.cr; for (const o of mons(ctx)) { if (hit.has(o)) continue; const d = dst(o, from); if (d < nd) { nd = d; nx = o; } } if (!nx) break;
    hit.add(nx); ST.chains.push({ a: { x: from.x, y: from.y - 6 }, b: { x: nx.x, y: nx.y - 6 }, t: 0, T: 0.28, seed: Math.random() * 99 }); fx(ctx, 'hit_bolt', nx.x, nx.y + 1); deal(ctx, nx, a * T.mul * T.cmul, isBoss(nx) ? 0 : 60, 'bolt'); from = nx; }
  hitStop(ctx, isBoss(mo) ? 80 : 55); log('thunder chain ' + (hit.size - 1));
}
function stoneTick(ctx, dt) {
  const S = ST.stone; if (!S) return; S.t += dt;
  if (S.t < S.fly) return;
  if (!S.landed) { S.landed = true; fx(ctx, 'magnet', S.x, S.y, false); ctx.sfx('rumble'); }
  const k = Math.min(1, (S.t - S.fly) / S.field);
  for (const mo of mons(ctx)) { if (isBoss(mo)) continue; const d = dst(mo, S); if (d > S.r || d < 6) continue; const sp = 70 * dt * (1 + k), nx = mo.x + (S.x - mo.x) / d * sp, ny = mo.y + (S.y - mo.y) / d * sp;
    if (!ctx.isSolid || !ctx.isSolid(ctx.S.map, Math.floor(nx / TS), Math.floor(ny / TS))) { mo.x = nx; mo.y = ny; } mo.kb = null; }
  if (!S.burst && S.t >= S.fly + S.field) {
    S.burst = true; const M = LV.magnetOf(S.tier), a = atkOf(ctx); let n = 0; fx(ctx, 'magnet_burst', S.x, S.y - 4); ctx.sfx('boom'); if (ctx.quake) ctx.quake(0.2);
    for (const mo of mons(ctx)) { const d = dst(mo, S); if (d > (isBoss(mo) ? S.r : 34)) continue; n++; deal(ctx, mo, a * M.mul * (isBoss(mo) ? 0.5 : 1), isBoss(mo) ? 0 : 80, 'void'); fx(ctx, 'hit_void', mo.x, mo.y - 4); }
    if (n >= 3) hitStop(ctx, 70); log('magnet burst ' + n); setTimeout(() => { if (ST.stone === S) ST.stone = null; }, 450);
  }
}
function slabTick(ctx, dt) { const S = ST.slab; if (!S) return; S.t += dt; if (S.t >= S.dur) { if (!S.broken) fx(ctx, 'mirror_break', S.x, S.y - 8); ST.slab = null; } }
function reflTick(ctx, dt) {
  for (const r of ST.refl) { r.t += dt; if (!r.hit && r.t >= r.T) { r.hit = true; if (r.tg && r.tg.hp > 0) { const M = LV.mirrorOf(r.tier); deal(ctx, r.tg, atkOf(ctx) * M.mul, 0, 'mirror'); fx(ctx, 'hit_mirror', r.tg.x, r.tg.y - 8); ST.stats.reflects++; if (isBoss(r.tg)) hitStop(ctx, 70); } } }
  ST.refl = ST.refl.filter(r => r.t < r.T + 0.1);
}

/* ---------------- ĐỐI CHƯỞNG ---------------- */
function clashStart(ctx, pt, e, h) {
  const th = h.t, r = R(ctx), tier = tierOf(pt, 'ha'); if (!tier) return false;
  const src = th.from, ang = Math.atan2(src.y - (e.y - 8), src.x - e.x), range = LV.haOf(tier).range;
  if (th.kind === 'projectile') {   /* đạn: bắn chặn — tính chỗ đạn lúc luồng ra */
    const ch = Math.max(0.3, Math.min(0.75, h.left - 0.12)); if (!r.haFire(ang, true, ch)) return false; ST.guard.push({ until: now(ctx) + ch + 0.45 });   /* Rocky đã nhận đòn: người chơi không trúng viên này dù luồng ra sau */
    ST.orb = { kind: 'intercept', th, t: 0, fire: ch, ang, range }; log('clash intercept ' + th.kind); ST.cd.clash = cdOf('clash', tierOf(pt, 'clash')); return true;
  }
  /* chưởng: chỉ khi Rocky nằm gần đường chưởng (đối đầu thẳng) */
  const si = segInfo(th, e.x, e.y - 8), sp = segInfo(th, ctx.S.player.x, ctx.S.player.y - PR); if (Math.min(si.d, sp.d) > 60 || Math.hypot(src.x - e.x, src.y - e.y) > range * 2 + 60) return false;
  const ch = Math.max(0.3, Math.min(0.8, h.left)); if (!r.haFire(ang, true, ch)) return false;
  ST.orb = { kind: 'beam', th, t: 0, fire: ch, ang, range, b: 0.5, presses: 0, push: 0.07, res: null, T: 1.6, tier: tierOf(pt, 'clash') };
  ST.cd.clash = cdOf('clash', tierOf(pt, 'clash')); log('clash beam'); return true;
}
function orbPoint(ctx, O) { const e = ent(ctx); if (!e) return null; const src = O.th.from, ox = e.x + Math.cos(O.ang) * 8, oy = e.y - 8 - rkLift(ctx, e) + Math.sin(O.ang) * 8, D = Math.hypot(src.x - ox, src.y - oy), m = Math.min(O.range * 0.9, D * (0.25 + 0.5 * (1 - O.b))); return { x: ox + Math.cos(O.ang) * m, y: oy + Math.sin(O.ang) * m, ox, oy, src }; }
function orbTick(ctx, dt) {
  const O = ST.orb; if (!O) return; O.t += dt; const e = ent(ctx), r = R(ctx);
  if (!e) { ST.orb = null; return; }
  if (O.kind === 'intercept') {
    if (O.t >= O.fire && !O.hit) { O.hit = true; const th = O.th;   /* chỗ viên đạn lúc luồng Rocky-ha ra (đạn khai báo lại mỗi khung: from = vị trí hiện tại) */
      const s = segInfo(th, e.x, e.y), trav = th.speed != null ? Math.max(0, (now(ctx) - (th.t0 || now(ctx))) * th.speed) : s.along * 0.5, px = th.from.x + s.ux * Math.min(trav, s.len), py = th.from.y + s.uy * Math.min(trav, s.len);
      fx(ctx, 'clash', px, py); hitStop(ctx, 60); ctx.sfx('smash'); if (ctx.pop) ctx.pop(px, py - 12, L(ctx).cancel, EL_COL.dark);
      if (th.id && typeof th.id === 'object' && !(th.id.hp > 0)) { th.id.life = 0; th.id.dead = true; }
      if (th.id != null && ctx.threat && ctx.threat.remove) try { ctx.threat.remove(th.id); } catch (er) { }
      ST.guard.push({ until: now(ctx) + 0.7 }); ST.stats.intercepts++; ST.stats.clashes++; }
    if (O.t > O.fire + 0.5) ST.orb = null; return;
  }
  /* chưởng: giằng co */
  if (O.t < O.fire) return;
  if (!O.go) { O.go = true; O.t0 = O.t; ST.guard.push({ until: now(ctx) + O.T + 0.4 }); ST.stats.clashes++; ctx.sfx('spar_charge'); if (ctx.toast) ctx.toast(L(ctx).clashGo); hitStop(ctx, 90); }
  const bi = r.beamInfo && r.beamInfo(), P0 = orbPoint(ctx, O); if (bi && bi.ref) { bi.ref.show = Math.max(bi.ref.show || 0, 0.2); if (P0) bi.ref.len = Math.max(6, Math.hypot(P0.x - bi.x, P0.y - bi.y)); }   /* giữ luồng Rocky-ha đang vẽ suốt lúc giằng co, cắt đúng tới quả cầu */
  if (!O.res) {
    const k = LV.clashOf(O.tier); O.b = Math.max(0, Math.min(1, O.b + dt * (0.1 * k.push - 0.16)));   /* trùm đẩy nhẹ — người chơi bấm để thắng */
    if (O.t - O.t0 >= O.T) O.res = O.b >= 0.5 ? 'win' : 'lose', O.rt = 0;
    O.pulse = Math.max(0, (O.pulse || 0) - dt);
    return;
  }
  O.rt += dt; const P = orbPoint(ctx, O);
  if (!O.fin && O.rt >= 0.25) {
    O.fin = true; const boss = nearestBoss(ctx, O.th.from.x, O.th.from.y) || nearestMon(ctx, O.th.from.x, O.th.from.y, 120);
    if (O.res === 'win') { ST.stats.clashWin++; const x = boss ? boss.x : O.th.from.x, y = boss ? boss.y - 10 : O.th.from.y; fx(ctx, 'clash_boom', x, y); if (boss) deal(ctx, boss, atkOf(ctx) * LV.clashOf(O.tier).mul, 0, 'dark'); hitStop(ctx, 90); if (ctx.quake) ctx.quake(0.4); ctx.sfx('boom'); if (ctx.toast) ctx.toast(L(ctx).clashWin); }
    else { if (P) fx(ctx, 'clash_boom', P.ox, P.oy); if (r.hitBy) r.hitBy(atkOf(ctx) * 0.8, null, -Math.cos(O.ang), -Math.sin(O.ang), 70, 'fly'); if (ctx.toast) ctx.toast(L(ctx).clashLose); }
    log('clash ' + O.res + ' b=' + O.b.toFixed(2) + ' presses=' + O.presses);
  }
  if (O.rt >= 0.45) { ST.orb = null; if (r.beamStop) r.beamStop(); }
}
function mashPress(ctx) { const O = ST.orb; if (!O || O.kind !== 'beam' || !O.go || O.res) return; O.presses++; O.b = Math.min(1, O.b + O.push); O.pulse = 0.12; const P = orbPoint(ctx, O); if (P && ctx.vfx) ctx.vfx('knock_jab', P.x + (Math.random() - 0.5) * 8, P.y + (Math.random() - 0.5) * 6, 0, true); }

/* ---------------- MẢNH LÕI ---------------- */
function bossesDone(ctx) { const a = (ctx.S.save && ctx.S.save.achievements) || []; return LV.CORE_BOSSES.filter(b => a.includes(b)); }
function migrate(ctx, pt) {
  if (pt.coreMig) return; pt.cores = pt.cores || []; pt.eq = pt.eq || []; pt.corePend = pt.corePend || [];
  const got = bossesDone(ctx).filter(b => !pt.cores.includes(b)); for (const b of got) { pt.cores.push(b); const id = LV.coreSkillOf(b); if (id && pt.eq.length < LV.EQ_MAX) pt.eq.push(id); }
  pt.coreMig = 1; if (got.length) { setTimeout(() => ctx.toast(L(ctx).migr(got.length)), 2500); log('migrate ' + got.join(',')); } if (ctx.persist) ctx.persist();
}
function scanNew(ctx, pt) {
  for (const b of bossesDone(ctx)) if (!pt.cores.includes(b) && !pt.corePend.includes(b)) { pt.corePend.push(b); log('pending ' + b); if (ctx.persist) ctx.persist(); }
}
function shardTick(ctx, pt, dt) {
  const e = ent(ctx), p = ctx.S.player;
  if (!ST.shard && pt.corePend && pt.corePend.length && e && ctx.S.mode === 'play' && !ctx.S.bossFight && !mons(ctx).some(mo => isBoss(mo) && dst(mo, p) < 260)) {
    ST.spawnT = (ST.spawnT || 0) + dt; if (ST.spawnT < 1.2) return; ST.spawnT = 0;
    const b = pt.corePend[0]; let x = p.x + (e.x > p.x ? -18 : 18), y = p.y + 10;
    for (let k = 0; k < 8 && ctx.isSolid && ctx.isSolid(ctx.S.map, Math.floor(x / TS), Math.floor(y / TS)); k++) { const a = k * TAU / 8; x = p.x + Math.cos(a) * 20; y = p.y + Math.sin(a) * 14; }
    ST.shard = { boss: b, x, y, t: 0 }; fx(ctx, 'hit_mirror', x, y - 4); ctx.sfx('chime'); if (ctx.toast) ctx.toast(L(ctx).coreDrop(BN(ctx, b))); log('shard ' + b);
  }
  if (ST.shard) { const S = ST.shard; S.t += dt;
    if (S.t > 4 && e && !ST.cast) { const d = Math.hypot(e.x - S.x, e.y - S.y); if (d > 4) { const k = Math.min(d, 70 * dt); S.x += (e.x - S.x) / d * k; S.y += (e.y - S.y) / d * k; } }   /* Rocky không tới được (nước, vật cản) → mảnh lõi tự bay về Rocky */
  }
}
function goal(ctx, e) {   /* pet.js: Rocky đi tới mảnh lõi (khi không đánh nhau) */
  const S = ST.shard; if (!S || ST.cast || ctx.S.bossFight) return null; if (Math.hypot(S.x - e.x, S.y - e.y) < 5) { if (!ST.cast) { ST.cast = { id: 'eat', t: 0, T: CAST_T.eat, tier: 1 }; e.face = 'ds'; e.moving = false; } return null; }
  return { x: S.x, y: S.y };
}
function eatTick(ctx, pt, e, C) {
  const S = ST.shard; if (!S) return; e.face = 'ds';
  if (!C.f1 && C.t >= 0.25) { C.f1 = true; e.hop = 0.45; ctx.sfx('eat'); }
  if (!C.f2 && C.t >= 0.7) {
    C.f2 = true; const b = S.boss, id = LV.coreSkillOf(b); fx(ctx, 'absorb', e.x, e.y - 8 - rkLift(ctx, e)); ctx.sfx('rocky_happy');
    pt.cores = pt.cores || []; if (!pt.cores.includes(b)) pt.cores.push(b); pt.corePend = (pt.corePend || []).filter(q => q !== b);
    pt.skills = pt.skills || {}; if (id && !(pt.skills[id] > 0)) pt.skills[id] = 1; pt.eq = pt.eq || []; if (id && !pt.eq.includes(id) && pt.eq.length < LV.EQ_MAX) pt.eq.push(id);
    const lvOk = LV.levelFromXp(pt.xp || 0).lv >= 20; if (ctx.toast) ctx.toast(L(ctx).learned(BN(ctx, b), SN(ctx, id)) + (lvOk ? '' : L(ctx).needLv), true);
    ST.stats.ate++; ST.shard = null; log('ate ' + b); if (ctx.persist) ctx.persist();
  }
}

/* ---------------- trang bị (thẻ Rocky) ---------------- */
function toggle(ctx, id) {
  const pt = petOf(ctx); if (!pt || !LV.CORE_SKILLS[id]) return false; const t = L(ctx);
  if (!LV.hasCore(pt, id)) { ctx.toast(t.notLearned(SN(ctx, id), BN(ctx, LV.CORE_SKILLS[id].core))); return false; }
  pt.eq = LV.equipped(pt);
  if (pt.eq.includes(id)) pt.eq = pt.eq.filter(q => q !== id);
  else { if (pt.eq.length >= LV.EQ_MAX) { ctx.toast(t.full); ctx.sfx('fail'); return false; } pt.eq.push(id); }
  ctx.toast(t.equipped(pt.eq.map(q => SN(ctx, q)).join(' · ') || '—')); ctx.sfx('pickup'); if (ctx.persist) ctx.persist(); return true;
}
function coreHtml(ctx) {
  const pt = petOf(ctx); if (!pt) return ''; const t = L(ctx), V = vi(ctx), eq = LV.equipped(pt), lv = LV.levelFromXp(pt.xp || 0).lv, items = (ART.man && ART.man.ui && ART.man.ui.items) || {};
  const cells = LV.CORE_IDS.map(id => {
    const S = LV.CORE_SKILLS[id], has = LV.hasCore(pt, id), tier = has ? Math.max(1, (pt.skills || {})[id] || 1) : 0, on = eq.includes(id), ic = items['rk_skill_' + id];
    const tip = `<b>${esc(SN(ctx, id))}</b> — ${has ? `${t.tier} ${tier}/${LV.TIER_SHOP}` : esc(t.lockedBy(BN(ctx, S.core)))}${has && lv < 20 ? ' · ' + t.lvNeed : ''} · ${esc(DESC[V ? 'vi' : 'en'][id])}`;
    return `<div class="rk-sk" data-tip="${esc(tip)}" style="display:flex;flex-direction:column;align-items:center;gap:2px;min-width:78px">
      <div class="slot ${has ? '' : 'off'}" ${has ? `data-rkeq="${id}"` : ''} data-tip="${esc(tip)}" style="width:44px;height:44px;cursor:${has ? 'pointer' : 'default'};${on ? 'outline:3px solid var(--gold);outline-offset:1px;' : ''}">${ic ? `<img src="assets/px/${ic}" alt="" draggable="false" style="width:32px;height:32px;image-rendering:pixelated">` : `<span class="emo">${S.icon}</span>`}${has ? `<b class="n">${tier}</b>` : ''}</div>
      <span style="font:15px VT323,monospace;color:${on ? 'var(--gold)' : has ? '#e8dcc0' : 'var(--dim)'};text-align:center;line-height:1">${esc(SN(ctx, id))}</span><span class="mhint" style="font-size:12px;text-align:center">${on ? '★ ' + t.worn : has ? (lv < 20 ? t.lvNeed : t.learnedTag) : esc(t.lockedBy(BN(ctx, S.core)))}</span></div>`;
  }).join('');
  return `<h3>${t.eqTitle} <span class="mhint" style="font-size:14px">(${eq.length}/${LV.EQ_MAX})</span></h3><div style="display:flex;gap:6px;flex-wrap:wrap;justify-content:space-around">${cells}</div><p class="mhint" style="margin-top:4px">${t.eqHint}</p>`;
}

/* ---------------- chat: gọi chiêu ---------------- */
function chatHook(s) {
  const ctx = ST.ctx; if (!ctx) return false; const id = LV.parseSkill(s); if (!id) return false;
  const pt = petOf(ctx), t = L(ctx); if (!pt) return false; const e = ent(ctx);
  if (!LV.hasCore(pt, id)) { ctx.toast(t.notLearned(SN(ctx, id), BN(ctx, LV.CORE_SKILLS[id].core))); return true; }
  if (!LV.equipped(pt).includes(id)) { ctx.toast(t.notEq(SN(ctx, id))); return true; }
  if (!tierOf(pt, id)) { ctx.toast(t.lowLv(SN(ctx, id))); return true; }
  if (ST.cd[id] > 0) { ctx.toast(t.cd(SN(ctx, id), Math.ceil(ST.cd[id]))); return true; }
  if (!e || ST.cast) { ctx.sfx('fail'); return true; }
  const r = cast(ctx, id, true); if (!r) ctx.toast(t.noTarget(SN(ctx, id))); else ctx.sfx('rocky_chirp');
  return true;
}
function cast(ctx, id, manual) {   /* ép ra chiêu (chat / test): tự tìm mục tiêu hợp lý */
  const pt = petOf(ctx), e = ent(ctx); if (!pt || !e || ST.cast) return false; const p = ctx.S.player, ms = mons(ctx), tier = tierOf(pt, id); if (!tier) return false;
  const near = (o, r) => ms.filter(mo => dst(mo, o) < r).sort((a, b) => dst(a, o) - dst(b, o));
  if (inAir(ctx) && (id === 'quake' || id === 'mirror' || id === 'magnet')) return false;
  if (id === 'quake') return start(ctx, pt, e, 'quake', {});
  if (id === 'mirror') { if (ST.slab) return false; const h = incoming(ctx, p.x, p.y - PR, 0, 2, null), b = nearestBoss(ctx, p.x, p.y) || near(p, 200)[0]; return start(ctx, pt, e, 'mirror', { th: h ? h.t : b ? { from: { x: b.x, y: b.y } } : { from: { x: p.x + (p.dir === 1 ? -30 : 30), y: p.y } } }); }
  if (id === 'magnet') { const sm = near(p, 150).filter(mo => !isBoss(mo)); const c = sm.length ? { x: sm.reduce((s, m) => s + m.x, 0) / sm.length, y: sm.reduce((s, m) => s + m.y, 0) / sm.length } : (near(p, 200)[0] || null); return c ? start(ctx, pt, e, 'magnet', { x: c.x, y: c.y }) : false; }
  if (id === 'petrify') { const mo = nearestBoss(ctx, e.x, e.y) || near(e, 140)[0]; return mo && dst(mo, e) < 160 ? start(ctx, pt, e, 'petrify', { mo }) : false; }
  if (id === 'thunder') { const mo = near(e, 60)[0] || nearestBoss(ctx, e.x, e.y); return mo && dst(mo, e) < 60 ? start(ctx, pt, e, 'thunder', { mo }) : false; }
  if (id === 'clash') { const h = incoming(ctx, p.x, p.y - PR, 0.2, 2, ['beam', 'projectile']); if (h && R(ctx).haReady && R(ctx).haReady()) return clashStart(ctx, pt, e, h); const b = nearestBoss(ctx, e.x, e.y) || near(e, 150)[0]; if (b && R(ctx).haFire) { R(ctx).haFire(Math.atan2(b.y - 4 - (e.y - 8), b.x - e.x), true); return true; } return false; }
  return false;
}

/* ---------------- trùm chậm (Hoá Đá): bọc update của hệ trùm, nhân dt ---------------- */
let WRAPPED = false;
function wrapBosses() {
  if (WRAPPED) return; WRAPPED = true;
  for (const sys of [hacrocky, trongdong, guong, hoden, dongho, bakunawa]) { if (!sys || typeof sys.update !== 'function' || sys.__rcSlow) continue; const u0 = sys.update; sys.update = function (dt, ctx) { const k = ctx && ctx.S && ctx.S.time < ST.slow.until ? ST.slow.mul : 1; return u0.call(this, dt * k, ctx); }; sys.__rcSlow = true; }
}

/* ---------------- vẽ ---------------- */
const UI = n => (ART.uiImg ? ART.uiImg(n) : null);
function blit(g, im, x, y, a = 1) { if (!im) return false; const w = im.width / 2, h = im.height / 2; if (a < 1) g.globalAlpha = a; g.drawImage(im, Math.round(x - w / 2), Math.round(y - h), w, h); if (a < 1) g.globalAlpha = 1; return true; }
function slabImg(ang) {   /* mặt gương luôn quay ra camera để đọc được: đòn từ trái → ảnh xéo tây-nam, từ phải → đông-nam, trên / dưới → mặt nam (ảnh nghiêng hẳn 90° chỉ còn cạnh mỏng, khó nhìn) */
  const c = Math.cos(ang); const d = c < -0.38 ? 'south-west' : c > 0.38 ? 'south-east' : 'south'; return UI('rk38_slab_' + d) || UI('rk38_slab_south');
}

export const rockycore = {
  id: 'rockycore',
  always: true,   /* chạy ở MỌI vùng (khe nứt trùm, sân trời… có danh sách hệ riêng) — Rocky mang chiêu đi khắp nơi */
  onZoneEnter(ctx) {
    ST.ctx = ctx; ST.shard = null; ST.slab = null; ST.stone = null; ST.chains = []; ST.refl = []; ST.orb = null; ST.cast = null; ST.guard = []; ST.slow = { until: 0, mul: 1, mo: null }; ST.lastP = null; ST.lastR = null;
    wrapBosses();
    ctx.rkSkill = (pt, e, pool, tg) => think(ctx, pt, e, pool || [], tg);
    ctx.rkGoal = e => goal(ctx, e);
    ctx.rkPose = () => { const C = ST.cast; if (!C) return null; const P = POSE[C.id] || ['ha', 'ha']; return { clip: P[0], fb: P[1], prog: Math.min(1, C.t / C.T) }; };
    ctx.rkCore = { html: () => coreHtml(ctx), toggle: id => toggle(ctx, id), cast: id => cast(ctx, id, true) };
    if (!(ctx.chatHooks ||= []).includes(chatHook)) ctx.chatHooks.push(chatHook);
    if (typeof window !== 'undefined') window.__rc = {
      state: () => { const pt = petOf(ctx); return { cores: pt ? pt.cores || [] : [], eq: pt ? LV.equipped(pt) : [], pend: pt ? pt.corePend || [] : [], tiers: pt ? Object.fromEntries(LV.CORE_IDS.map(id => [id, tierOf(pt, id)])) : {}, cast: ST.cast ? { id: ST.cast.id, t: +ST.cast.t.toFixed(2) } : null, cd: { ...ST.cd }, shard: ST.shard && { boss: ST.shard.boss, x: Math.round(ST.shard.x), y: Math.round(ST.shard.y) }, slab: ST.slab && { blocks: ST.slab.blocks, t: +ST.slab.t.toFixed(2) }, stone: !!ST.stone, orb: ST.orb && { kind: ST.orb.kind, b: +(ST.orb.b || 0).toFixed(2), res: ST.orb.res || null, presses: ST.orb.presses || 0, go: !!ST.orb.go }, slow: +(Math.max(0, ST.slow.until - now(ctx))).toFixed(2), stats: JSON.parse(JSON.stringify(ST.stats)), stop: ST.stopOn, thinkN: ST.thinkN || 0, why: ST.why || '' }; },
      give: (bosses, eq) => { const pt = petOf(ctx); if (!pt) return null; pt.cores = [...new Set([...(pt.cores || []), ...(bosses || LV.CORE_BOSSES)])]; pt.coreMig = 1; if (eq) pt.eq = eq.slice(0, LV.EQ_MAX); for (const b of pt.cores) { const id = LV.coreSkillOf(b); pt.skills[id] = Math.max(1, pt.skills[id] || 0); } if (ctx.persist) ctx.persist(); return LV.equipped(pt); },
      tier: (id, n) => { const pt = petOf(ctx); if (pt) { pt.skills[id] = n; if (ctx.persist) ctx.persist(); } return pt && tierOf(pt, id); },
      eq: list => { const pt = petOf(ctx); if (!pt) return null; pt.eq = list.slice(0, LV.EQ_MAX); return LV.equipped(pt); },
      pend: b => { const pt = petOf(ctx); if (!pt) return null; pt.corePend = [...new Set([...(pt.corePend || []), b])]; return pt.corePend; },
      cast: id => cast(ctx, id, true), clearCd: () => { ST.cd = {}; }, mash: () => mashPress(ctx), log: () => ST.log.slice(), hitStop: ms => hitStop(ctx, ms || 80),
      slowMul: () => (ctx.S.time < ST.slow.until ? ST.slow.mul : 1), combo: () => { const m = mons(ctx)[0]; if (m) { ST.comboCd = 0; combo(ctx, m); } return ST.stats.combos; },
    };
  },
  update(dt, ctx) {
    ST.ctx = ctx; stopTick(ctx);
    if (ctx.S.mode !== 'play') return;
    wrapHero(ctx); wrapDamage(ctx); wrapPop(ctx); wrapRockyHit(ctx);
    for (const k in ST.cd) if (ST.cd[k] > 0) ST.cd[k] = Math.max(0, ST.cd[k] - dt);
    if (ST.comboCd > 0) ST.comboCd -= dt;
    ST.guard = ST.guard.filter(g => now(ctx) < g.until);
    const pt = petOf(ctx); if (!pt) return;
    migrate(ctx, pt);
    if ((ST.scanT -= dt) <= 0) { ST.scanT = 0.5; scanNew(ctx, pt); }
    shardTick(ctx, pt, dt);
    pollPlayerHit(ctx);
    castTick(ctx, dt); slabTick(ctx, dt); stoneTick(ctx, dt); reflTick(ctx, dt); orbTick(ctx, dt);
    for (const c of ST.chains) c.t += dt; ST.chains = ST.chains.filter(c => c.t < c.T);
  },
  near(ctx) {
    const O = ST.orb, p = ctx.S.player; if (O && O.kind === 'beam' && O.go && !O.res) return { label: L(ctx).mash, x: p.x, y: p.y - 30, limit: 999, priority: 6, mouse: false, data: { rcMash: true, grab: true } };
    return null;
  },
  interact(ctx, cand) { const d = cand && cand.data; if (d && d.rcMash) mashPress(ctx); },
  drawables(ctx, cx, cy) {
    const out = [], g = ctx.g;
    if (ST.shard) { const S = ST.shard, im = UI('rk38_core_' + S.boss); out.push({ y: S.y, f: () => { g.fillStyle = 'rgba(0,0,0,.22)'; g.beginPath(); g.ellipse(Math.round(S.x) - cx, Math.round(S.y) - cy, 6, 2, 0, 0, TAU); g.fill(); if (!blit(g, im, S.x - cx, S.y - cy + 1)) { g.fillStyle = '#c9a6ff'; g.fillRect(Math.round(S.x) - cx - 3, Math.round(S.y) - cy - 7, 6, 7); } } }); }
    if (ST.slab) { const S = ST.slab, im = slabImg(S.ang), up = Math.min(1, S.t / 0.12), fade = S.t > S.dur - 0.2 ? Math.max(0, (S.dur - S.t) / 0.2) : 1; out.push({ y: S.y, f: () => { if (!im) return; const w = im.width / 2, h = im.height / 2 * up; g.globalAlpha = fade; g.drawImage(im, Math.round(S.x - w / 2) - cx, Math.round(S.y - h) - cy, w, h); g.globalAlpha = 1; } }); }
    if (ST.stone) { const S = ST.stone, im = UI('rk38_lodestone'), u = Math.min(1, S.t / S.fly), x = S.x0 + (S.x - S.x0) * u, y = S.y0 + (S.y - S.y0) * u - Math.sin(u * Math.PI) * 26 + (u >= 1 ? 10 : 0); if (!S.burst) out.push({ y: S.y, f: () => { if (!blit(g, im, x - cx, y - cy + (u >= 1 ? 0 : 6))) { g.fillStyle = '#5a3b7a'; g.fillRect(Math.round(x) - cx - 3, Math.round(y) - cy - 5, 6, 6); } } }); }
    /* 2026-10-16 anh (QUY TẮC LỚP VẼ CHIÊU): chiêu phóng theo hướng — bay LÊN thì nằm sau kẻ phóng, bay XUỐNG thì nằm trước; dọc đường sắp theo chân điểm đang bay */
    { const os = bSheet('rk_hacharge_s'); if (os) for (const r of ST.refl) { if (r.hit || !r.tg) continue;   /* đòn bật ngược: quả cầu sáng PixelLab (sheet tụ năng Rocky-ha) bay từ phiến đá về kẻ bắn */
      const u = Math.min(1, r.t / r.T), x = r.x + (r.tg.x - r.x) * u, y = r.y + (r.tg.y - 10 - r.y) * u, g0 = r.y + 10, gy = g0 + (r.tg.y - g0) * u, upw = r.tg.y < g0;
      out.push({ y: upw ? Math.min(gy, g0 - 0.5) : Math.max(gy, g0 + 0.5), skill: 'rc_refl', f: () => bDraw(g, os, (os.n || 1) - 1, x - cx, y - cy) }); } }
    const O = ST.orb; if (O && O.kind === 'beam' && O.go) {   /* giằng co: luồng tối của trùm (bản tối Hắc-ha từ sheet PixelLab) từ nguồn → quả cầu; quả cầu hr_clashorb_l */
      const P = orbPoint(ctx, O); if (P) { const ds = darkSheet(beamKey(7)), ang = Math.atan2(P.y - P.src.y, P.x - P.src.x), len = Math.hypot(P.x - P.src.x, P.y - P.src.y), e = ent(ctx);
        const sh = nearestMon(ctx, P.src.x, P.src.y + 10, 80), sy0 = sh ? sh.y : P.src.y + 10;   /* chân kẻ bắn chưởng (trùm) — luồng tối khoá theo chân nó */
        const kB = sy0 + (Math.sin(ang) < 0 ? -0.5 : 0.5), kR = (e ? e.y : P.oy + 8) + (Math.sin(O.ang) < 0 ? -0.5 : 0.5);   /* kR: luồng Rocky-ha (pet.js) khoá theo chân Rocky ∓ 0,5 */
        if (ds && !O.fin) out.push({ y: kB, skill: 'rc_clash_beam', f: () => bDraw(g, ds, bFrame(ds, O.t), P.src.x - cx, P.src.y - cy, ang, len) });
        const os = ART.vfx && ART.vfx.hr_clashorb_l; if (os && os.img) out.push({ y: Math.max(kR, kB) + 0.25, skill: 'rc_clash_orb', f: () => { const n = os.n || 8, f = Math.floor(O.t * (os.fps || 12)) % n, hi = os.img.__hi ? 1 : 2, k = 1 + (O.pulse || 0) * 2; g.drawImage(os.img, f * os.w * hi, 0, os.w * hi, os.h * hi, Math.round(P.x - os.w * k / 2) - cx, Math.round(P.y - os.h * k / 2) - cy, os.w * k, os.h * k); } });   /* quả cầu: ngay trên cả hai luồng (chỗ gặp) */
      } }
    return out;
  },
  draw(g, ctx, cx, cy) {
    stopTick(ctx);   /* 2026-10-16 (QUY TẮC LỚP VẼ CHIÊU): đòn bật ngược + giằng co Đối Chưởng đã chuyển sang drawables */
  },
  drawUI(ug, ctx, cx, cy, scale) {
    const O = ST.orb; if (!O || O.kind !== 'beam' || !O.go || O.res) return;   /* thanh giằng co nhỏ trên đầu người chơi (không che cảnh) */
    const p = ctx.S.player, W = ug.canvas.width, sx = (p.x - cx) * scale, sy = (p.y - 40 - cy) * scale, w = Math.min(W * 0.45, scale * 40), h = Math.max(6, scale * 2.2);
    ug.fillStyle = 'rgba(20,10,30,.75)'; ug.fillRect(sx - w / 2 - 1, sy - 1, w + 2, h + 2); ug.fillStyle = '#7a3cff'; ug.fillRect(sx - w / 2, sy, w, h); ug.fillStyle = '#8fd3ff'; ug.fillRect(sx - w / 2, sy, w * O.b, h);
    ug.fillStyle = '#fff'; ug.fillRect(Math.round(sx - 1), sy - 2, 2, h + 4);
  },
};
