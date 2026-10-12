// kraken.js — 2026-10-11 (anh: "làm lại Kraken từ kỹ năng tới hình dáng"): trùm giữa Vực Kraken · Hang Ổ.
// Không phải 1 hệ riêng — monsters.js gọi vào (AI 'kraken', vẽ đầu/xúc tu, nhắm/đánh xúc tu, bị túm). Phụ thuộc chung truyền qua initKraken(H).
// Hình (PixelLab, manifest monsters.kraken_*): đầu to 80×64 logic (thở/chớp mắt · gầm · đau) trồi từ KHE VỰC (kraken_crack) ở mép trên đấu trường;
//   xúc tu 48×64 logic: trồi lên (kraken_tsink chạy ngược) → đung đưa (kraken_tsway) → đập (kraken_tslam) → KẸT trên đáy → rút xuống (kraken_tsink).
// Kỹ năng — mọi đòn đều báo trước bằng hình TĨNH (vết nứt kraken_warn / vệt nứt cả hàng / bóng đá), không nhấp nháy lặp:
//   Pha 1: xúc tu trồi lên chỗ đất nứt rồi đập xuống; đập xong KẸT 2 s = lúc chém (chém xúc tu = trừ máu Kraken); đầu chìm sau khe vực (chỉ ăn 25 %),
//          sau 3 lượt đòn đầu NGOI LÊN thở ~2,8 s (đánh ×1,5).
//   Pha 2 (< 66 %): gầm + phun mực 1 lần; thêm QUÉT NGANG (vệt nứt chạy cả hàng → xúc tu dài quét qua, bước lên/xuống để né); đầu ngoi lên gầm sau mỗi 2 lượt.
//   Pha 3 (< 33 %): gầm + gọi cá mập (1 lần); thêm TÚM (vết nứt dưới chân → xúc tu cuộn lấy người: bấm E liên tục để vùng ra, Rocky ở gần cắn giúp)
//          và ĐÁ RƠI từ trần hang (bóng đen dưới đáy báo trước).
import { ART } from '../art.js';

let H = null;   /* { ST, UW, hitP, shove, say, newMo, walkable, nm, vi } — monsters.js gắn lúc nạp */
export function initKraken(h) { H = h; }

export const KR = { WARN: 1.0, RISE: 0.42, LASH: 0.28, STUCK: 2.0, RET: 0.55, R: 18, SINK: 15, SW_WARN: 1.1, SW_GO: 0.75, SW_BACK: 0.45, SW_H: 11, GR_WARN: 0.85, GR_MAX: 4.2, GR_NEED: 6, RK_WARN: 1.05, RK_FALL: 0.35, RK_R: 13 };
const TAU = Math.PI * 2;
const L = ctx => (H.vi(ctx) ? {
  p1: 'Kraken trồi lên từ khe vực! Né chỗ đất nứt, rồi chém xúc tu đang KẸT dưới đáy!',
  slam: 'Đất nứt dưới chân — xúc tu sắp trồi lên đập xuống, tránh ra!', stuck: 'Xúc tu cắm xuống đáy, KẸT 2 giây — chém nó!',
  surf: 'Kraken ngoi lên khỏi khe vực — chém vào ĐẦU ngay!', deep: 'Đầu Kraken còn chìm sau khe vực — chém xúc tu đang KẸT, hoặc đợi nó ngoi lên!',
  p2: 'Kraken nổi giận! Coi chừng xúc tu QUÉT NGANG cả hàng!', sweep: 'Vệt nứt chạy ngang — xúc tu sắp quét cả hàng, bơi lên hoặc xuống!', ink: 'Kraken phun mực!',
  p3: 'Kraken điên cuồng — xúc tu TÚM người, đá trần hang rơi xuống!', grab: 'Đất nứt dưới chân — xúc tu sắp TÚM bạn, bơi ra ngay!',
  held: n => `Vùng ra khỏi xúc tu! (${n}/${KR.GR_NEED})`, heldMsg: 'Bị xúc tu túm! Bấm liên tục để vùng ra', free: 'Vùng ra được rồi!', rocky: 'Rocky cắn xúc tu giúp bạn!',
  rocks: 'Trần hang rung — đá sắp rơi, tránh bóng đen dưới đáy!', sum: 'Kraken gọi cá mập tới!', tent: (h, m) => `⚔ Chém xúc tu đang kẹt (${h}/${m})`,
} : {
  p1: 'The Kraken rises from the abyss! Dodge the cracking ground, then slash the tentacle while it is STUCK!',
  slam: 'The ground cracks under you — a tentacle is about to burst up and slam, move!', stuck: 'The tentacle is STUCK in the seabed for 2 s — slash it!',
  surf: 'The Kraken surfaces from the abyss — hit its HEAD now!', deep: 'The Kraken\'s head is sunk in the abyss — slash a STUCK tentacle, or wait for it to surface!',
  p2: 'The Kraken is enraged! Watch out for tentacle SWEEPS across a whole row!', sweep: 'A crack runs across the floor — a tentacle will sweep that row, swim up or down!', ink: 'The Kraken sprays ink!',
  p3: 'The Kraken goes wild — tentacles GRAB, rocks fall from the cave roof!', grab: 'The ground cracks under you — a tentacle is about to GRAB you, swim away!',
  held: n => `Struggle free of the tentacle! (${n}/${KR.GR_NEED})`, heldMsg: 'Grabbed by a tentacle! Keep pressing to break free', free: 'You broke free!', rocky: 'Rocky bites the tentacle for you!',
  rocks: 'The roof shakes — rocks are falling, avoid the dark shadows!', sum: 'The Kraken calls in the sharks!', tent: (h, m) => `⚔ Slash the stuck tentacle (${h}/${m})`,
});
const sheet = k => (ART.monsters && ART.monsters['kraken_' + k]) || null;
const KIMG = {};
function oldImg(f) { if (typeof Image === 'undefined') return null; let im = KIMG[f]; if (!im) { im = KIMG[f] = new Image(); im.src = 'assets/px/zones/village/rem/' + f; } return im.complete && im.naturalWidth ? im : null; }   /* dự phòng khi tắt ảnh PixelLab mới (?art=code) */
const blit = (g, sh, f, x, y, flip) => { f = Math.max(0, Math.min(sh.n - 1, f | 0)); if (!flip) { g.drawImage(sh.img, f * sh.cw, 0, sh.cw, sh.ch, x, y, sh.cw, sh.ch); return; } g.save(); g.translate(x + sh.cw, y); g.scale(-1, 1); g.drawImage(sh.img, f * sh.cw, 0, sh.cw, sh.ch, 0, 0, sh.cw, sh.ch); g.restore(); };
const rocky = () => { try { return typeof window !== 'undefined' && window.__pet && window.__pet.state().ent; } catch (e) { return null; } };

/* ---------------- xúc tu đập (dùng chung với Xealist pha 2) ---------------- */
export function slamAt(mo, pts, stuck = 0.6) { (mo.slams ||= []).push(...pts.map(([x, y]) => ({ x, y, t: KR.WARN, st: 'warn', stuck, hp: 0 }))); }
export function slamTick(ctx, mo, dt, p, canHit, mul = 1.2) {   /* nứt đất (tĩnh) → trồi lên + đung đưa → đập (trúng: đau + hất) → kẹt (chém được) → rút xuống */
  if (!mo.slams || !mo.slams.length) return;
  for (const s of mo.slams) {
    s.t -= dt; if (s.flash > 0) s.flash -= dt; if (s.t > 0) continue;
    if (s.st === 'warn') { s.st = 'lash'; s.t = KR.LASH; ctx.sfx('whoosh_big'); continue; }
    if (s.st === 'lash') {
      s.st = 'stuck'; s.t = s.stuck ?? 0.6; s.t0 = s.t; ctx.sfx('slam'); if (ctx.vfx) ctx.vfx('rock_debris', s.x, s.y + 2);
      if (canHit && Math.hypot(p.x - s.x, p.y - (s.y - 4)) < KR.R + 4) { H.hitP(ctx, mo, mul); H.shove(ctx, p, p.x - s.x || 1, p.y - s.y + 2, 16); }
      if (mo.c.ai === 'kraken' && Math.hypot(p.x - s.x, p.y - s.y) < 170) H.say(ctx, 'krstuck', L(ctx).stuck, false, 14);
      continue;
    }
    if (s.st === 'stuck') { s.st = 'retract'; s.t = KR.RET; ctx.sfx('squelch'); continue; }
    s.st = 'gone';
  }
  mo.slams = mo.slams.filter(s => s.st !== 'gone');
}
/* vết nứt báo trước (lớp nền, tĩnh — chỉ hiện khi đang báo) */
function warnDecal(g, x, y, a = 1) {
  const sh = sheet('warn'); g.save(); g.globalAlpha = a;
  if (sh) blit(g, sh, 0, Math.round(x - sh.cw / 2), Math.round(y - sh.ch / 2));
  else { g.fillStyle = 'rgba(20,6,30,.42)'; g.beginPath(); g.ellipse(x, y, KR.R, KR.R * 0.6, 0, 0, TAU); g.fill(); }
  g.strokeStyle = 'rgba(255,120,150,.55)'; g.lineWidth = 1; g.beginPath(); g.ellipse(x, y, KR.R + 2, (KR.R + 2) * 0.58, 0, 0, TAU); g.stroke();   /* viền tầm đánh (tĩnh) */
  g.restore();
}
export function drawSlamGround(g, mo, cx, cy) {
  if (mo.slams) for (const s of mo.slams) if (s.st === 'warn' || s.st === 'lash') warnDecal(g, Math.round(s.x - cx), Math.round(s.y - 3 - cy), s.st === 'warn' ? 1 : 0.6);
  const k = mo.kr; if (!k) return;
  for (const w of k.sweeps) if (w.st === 'warn') {   /* vệt nứt cả hàng */
    const y = Math.round(w.y - cy), x0 = Math.round(w.x0 - cx), x1 = Math.round(w.x1 - cx), sh = sheet('warn');
    g.save(); g.fillStyle = 'rgba(20,6,30,.28)'; g.fillRect(x0, y - KR.SW_H, x1 - x0, KR.SW_H * 2);
    g.strokeStyle = 'rgba(255,120,150,.5)'; g.lineWidth = 1; g.beginPath(); g.moveTo(x0, y - KR.SW_H + 0.5); g.lineTo(x1, y - KR.SW_H + 0.5); g.moveTo(x0, y + KR.SW_H - 0.5); g.lineTo(x1, y + KR.SW_H - 0.5); g.stroke();
    if (sh) { g.globalAlpha = 0.75; for (let x = x0 + 20; x < x1 - 12; x += 44) blit(g, sh, 0, x - sh.cw / 2, y - sh.ch / 2); }
    g.restore();
  }
  if (k.grab && k.grab.st === 'warn') warnDecal(g, Math.round(k.grab.x - cx), Math.round(k.grab.y - cy));
  for (const r of k.rocks) if (r.st === 'warn') {   /* bóng đá rơi: to dần khi đá tới gần (không nhấp nháy) */
    const f = 1 - Math.max(0, r.t) / KR.RK_WARN, x = Math.round(r.x - cx), y = Math.round(r.y - cy);
    g.save(); g.fillStyle = `rgba(10,4,20,${0.25 + f * 0.35})`; g.beginPath(); g.ellipse(x, y, 6 + f * 7, 3 + f * 3.5, 0, 0, TAU); g.fill();
    g.strokeStyle = 'rgba(255,120,150,.45)'; g.lineWidth = 1; g.beginPath(); g.ellipse(x, y, KR.RK_R, KR.RK_R * 0.55, 0, 0, TAU); g.stroke(); g.restore();
  }
}
/* xúc tu đứng (drawable, sắp theo y) */
export function tentDrawable(g, s, cx, cy) {
  const x = Math.round(s.x - cx), y = Math.round(s.y - cy);
  return { y: s.y + 0.2, f: () => {
    const sw = sheet('tsway'), sl = sheet('tslam'), sk = sheet('tsink');
    if (!sw || !sl || !sk) { const im = oldImg(`kraken_tent_${s.st === 'warn' ? 2 : 3}.png`); if (im && s.st !== 'retract') { g.save(); g.globalAlpha = s.st === 'warn' ? 0.35 : 1; g.drawImage(im, x - 16, y - 60, 32, 64); g.restore(); } return; }
    const dx = x - 24, dy = y - 50, fl = s.x < (s.cx0 ?? s.x), slamF = f => blit(g, sl, f, dx, dy + (f >= 4 ? 4 : 0), fl);   /* lỗ xúc tu ở hàng 48 của ảnh 64 → chân ảnh trùng vết nứt; khung nằm đập (≥ 4) hạ 4 px cho trùng vòng tầm đánh */
    if (s.flash > 0) g.filter = 'brightness(2)';
    if (s.st === 'warn') {
      const up = KR.RISE - s.t; if (up <= 0) { g.filter = 'none'; return; }   /* đầu báo trước: chỉ có vết nứt */
      const riseT = 0.22; if (up < riseT) blit(g, sk, Math.round((1 - up / riseT) * (sk.n - 1)), dx, dy, fl);   /* trồi lên = rút xuống chạy ngược */
      else blit(g, sw, Math.floor((up - riseT) * 10) % sw.n, dx, dy, fl);
    } else if (s.st === 'lash') slamF(Math.min(4, Math.floor((1 - s.t / KR.LASH) * 5)));
    else if (s.st === 'stuck') { const k = (s.t0 || 0.6) - s.t; slamF(k < 0.32 ? 4 + Math.min(3, Math.floor(k / 0.08)) : 4); }
    else if (s.st === 'retract') { const k = KR.RET - s.t; if (k < 0.16) slamF(4 - Math.min(4, Math.floor(k / 0.04))); else blit(g, sk, Math.min(sk.n - 1, Math.floor((k - 0.16) / (KR.RET - 0.16) * sk.n)), dx, dy, fl); }   /* rút: nhấc lên (đập chạy ngược) rồi chui xuống lỗ */
    g.filter = 'none';
  } };
}

/* ---------------- AI trùm ---------------- */
const phaseOf = mo => { const k = mo.hp / mo.max; return k > 0.66 ? 1 : k > 0.33 ? 2 : 3; };
function st(mo) { return (mo.kr ||= { sweeps: [], rocks: [], grab: null, anim: null, vol: 0, sink: KR.SINK, surf: 0, hurtT: 0, inked: false, held: 0 }); }
function anim(mo, k) { st(mo).anim = { k, t: 0 }; }
export function krReset(ctx, mo) {   /* người chơi rời đấu trường → thu hết đòn, thả người */
  const k = st(mo); mo.slams = null; k.sweeps = []; k.rocks = []; if (k.grab) release(ctx, k); k.surf = 0; mo.open = false;
}
function release(ctx, k) { const p = ctx.S.player; k.grab = null; p.autoPath = null; }
function surface(ctx, mo, ph) {
  const k = st(mo); k.surf = ph === 1 ? 2.8 : 3.4; k.vol = 0; mo.open = true;
  if (ph >= 2) { anim(mo, 'roar'); ctx.sfx('kraken_roar'); } else ctx.sfx('bubbles');
  if (ctx.vfx) ctx.vfx('u_bubbles', mo.x, mo.y - 20, 0, true);
  H.say(ctx, 'krsurf', L(ctx).surf, false, 9);
}
function volley(ctx, mo, p, ph) {
  const k = st(mo); mo.n = (mo.n || 0) + 1; k.vol++;
  const m = ctx.S.map, ar = m.arena || { x: 3, y: 2, w: m.w - 6, h: 30 }, minY = -1e9;   /* 2026-10-11 anh: đứng SAU LƯNG Kraken thì nó không đánh được → đòn nhắm đúng chỗ người đứng, mọi phía (chỉ tránh ô đặc của khe vực nhờ walkable) */
  const near = (r0, r1) => { for (let i = 0; i < 12; i++) { const a = Math.random() * TAU, r = r0 + Math.random() * (r1 - r0), x = p.x + Math.cos(a) * r, y = Math.max(minY, p.y + Math.sin(a) * r * 0.8); if (H.walkable(ctx, x, y)) return [x, y]; } return null; };
  const slam = n => { const pts = [[p.x, Math.max(minY, p.y)]]; for (let i = 1; i < n; i++) { const q = near(38, 70); if (q) pts.push(q); } slamAt(mo, pts, KR.STUCK); for (const s of mo.slams) s.cx0 ??= mo.x; H.say(ctx, 'krslam', L(ctx).slam, false, 16); };
  const stuckN = (mo.slams || []).filter(s => s.st === 'stuck').length;
  if (ph === 1) { slam(mo.n <= 1 || stuckN >= 2 ? 1 : 2); return; }
  if (ph === 2) { if (mo.n % 3 === 0) sweep(ctx, mo, p, ar); else slam(stuckN >= 2 ? 1 : 2 + (Math.random() < 0.4 ? 1 : 0)); return; }
  const r = mo.n % 4;
  if (r === 0) grab(ctx, mo, p);
  else if (r === 2) { rocks(ctx, mo, p, ar); slam(1); }
  else if (r === 3) sweep(ctx, mo, p, ar);
  else slam(stuckN >= 2 ? 2 : 3);
}
function sweep(ctx, mo, p, ar) {
  const k = st(mo), fromL = p.x > mo.x;   /* quét từ phía xa người chơi hơn → kịp nhìn thấy */
  k.sweeps.push({ y: p.y - 2, x0: ar.x * 16, x1: (ar.x + ar.w) * 16, dir: fromL ? 1 : -1, st: 'warn', t: KR.SW_WARN, tip: 0, hit: false });
  H.say(ctx, 'krsweep', L(ctx).sweep, false, 12); ctx.sfx('rumble');
}
function grab(ctx, mo, p) { st(mo).grab = { st: 'warn', t: KR.GR_WARN, x: p.x, y: p.y, n: 0, rk: 0, dmgT: 1 }; H.say(ctx, 'krgrab', L(ctx).grab, false, 10); ctx.sfx('warn'); }
function rocks(ctx, mo, p, ar) {
  const k = st(mo), pts = [[p.x, p.y]];
  for (let i = 0; i < 4; i++) { const x = (ar.x + 1 + Math.random() * (ar.w - 2)) * 16, y = mo.y + 40 + Math.random() * ((ar.y + ar.h) * 16 - mo.y - 60); if (H.walkable(ctx, x, y)) pts.push([x, y]); }
  pts.forEach(([x, y], i) => k.rocks.push({ x, y, t: KR.RK_WARN + i * 0.12, st: 'warn' }));
  H.say(ctx, 'krrocks', L(ctx).rocks, false, 12); ctx.sfx('rumble'); if (ctx.quake) ctx.quake(0.2);   /* rung ngắn 1 lần lúc đá bắt đầu rơi (sự kiện) */
}
function tickExtras(ctx, mo, dt, p, canHit) {
  const k = st(mo);
  for (const w of k.sweeps) {
    w.t -= dt;
    if (w.st === 'warn') { if (w.t <= 0) { w.st = 'go'; w.t = KR.SW_GO; ctx.sfx('whoosh_big'); } continue; }
    if (w.st === 'go') {
      const f = 1 - Math.max(0, w.t) / KR.SW_GO; w.tip = w.dir > 0 ? w.x0 + (w.x1 - w.x0) * f : w.x1 - (w.x1 - w.x0) * f;
      const passed = w.dir > 0 ? w.tip >= p.x - 6 : w.tip <= p.x + 6;
      if (canHit && !w.hit && passed && Math.abs(p.y - w.y) < KR.SW_H + 2) { w.hit = true; H.hitP(ctx, mo, 1.1); H.shove(ctx, p, 0, p.y >= w.y ? 1 : -1, 20); ctx.sfx('slam'); if (ctx.vfx) ctx.vfx('rock_debris', p.x, p.y + 2); }
      if (w.t <= 0) { w.st = 'back'; w.t = KR.SW_BACK; }
      continue;
    }
    if (w.st === 'back') { const f = Math.max(0, w.t) / KR.SW_BACK; w.tip = w.dir > 0 ? w.x0 + (w.x1 - w.x0) * f : w.x1 - (w.x1 - w.x0) * f; if (w.t <= 0) w.st = 'gone'; }
  }
  k.sweeps = k.sweeps.filter(w => w.st !== 'gone');
  for (const r of k.rocks) {
    r.t -= dt;
    if (r.st === 'warn' && r.t <= 0) {
      r.st = 'land'; r.t = 0.5; ctx.sfx('rock_break'); if (ctx.vfx) ctx.vfx('rock_debris', r.x, r.y + 2);
      if (canHit && Math.hypot(p.x - r.x, p.y - r.y) < KR.RK_R) H.hitP(ctx, mo, 0.9);
    } else if (r.st === 'land' && r.t <= 0) r.st = 'gone';
  }
  k.rocks = k.rocks.filter(r => r.st !== 'gone');
  const gr = k.grab; if (!gr) return;
  gr.t -= dt;
  if (gr.st === 'warn') {
    if (gr.t > 0) return;
    if (canHit && Math.hypot(p.x - gr.x, p.y - gr.y) < 15) {
      gr.st = 'hold'; gr.t = KR.GR_MAX; gr.x = p.x; gr.y = p.y; p.autoPath = null; ctx.sfx('squelch'); H.say(ctx, 'krheld', L(ctx).heldMsg, true, 6);
    } else { gr.st = 'miss'; gr.t = 0.5; ctx.sfx('slam'); if (ctx.vfx) ctx.vfx('rock_debris', gr.x, gr.y + 2); }
    return;
  }
  if (gr.st === 'miss') { if (gr.t <= 0) k.grab = null; return; }
  /* đang bị túm: ghim người tại chỗ, siết mất máu mỗi 1 s; Rocky ở gần (≤ 60 px) cắn giúp (+1 mỗi 0,5 s) */
  if (!canHit) { release(ctx, k); return; }   /* ngất / lộ mặt → thả ra */
  p.x = gr.x; p.y = gr.y; p.autoPath = null;
  gr.dmgT -= dt; if (gr.dmgT <= 0) { gr.dmgT = 1; H.hitP(ctx, mo, 0.45); }
  const rk = rocky(); if (rk && Math.hypot(rk.x - p.x, rk.y - p.y) <= 60) { gr.rk += dt; if (gr.rk >= 0.5) { gr.rk = 0; gr.n++; H.say(ctx, 'krrocky', L(ctx).rocky, false, 6); ctx.sfx('rocky_chirp'); } }
  if (gr.n >= KR.GR_NEED) { freeGrab(ctx, mo, true); return; }
  if (gr.t <= 0) { H.hitP(ctx, mo, 1.0); release(ctx, k); H.shove(ctx, p, 0, 1, 24); ctx.sfx('slam'); }   /* hết giờ: quăng người ra */
}
function freeGrab(ctx, mo, won) {
  const k = st(mo), p = ctx.S.player; release(ctx, k);
  if (won) { ctx.sfx('bubble_pop'); if (ctx.vfx) ctx.vfx('u_bubbles', p.x, p.y, 0, true); H.say(ctx, 'krfree', L(ctx).free, false, 3); H.shove(ctx, p, 0, 1, 10); mo.hp -= Math.round(mo.max * 0.02); mo.flash = 0.18; mo.justHit = true; }
}
export function krMash(ctx, mo) { const gr = mo && mo.kr && mo.kr.grab; if (!gr || gr.st !== 'hold') return false; gr.n++; ctx.sfx('squelch'); if (gr.n >= KR.GR_NEED) freeGrab(ctx, mo, true); return true; }
export function krHeld(mo) { const gr = mo && mo.kr && mo.kr.grab; return !!(gr && gr.st === 'hold'); }

export function aiKraken(ctx, mo, dt, p, dp, canHit, bossLeash) {
  const c = mo.c, k = st(mo), home = mo.home || mo;
  mo.x = home.x; mo.y = home.y; mo.face = 0;
  if (k.anim) { k.anim.t += dt; const sh = sheet(k.anim.k); if (!sh || k.anim.t >= sh.n / (sh.fps || 10)) k.anim = null; }
  if (k.hurtT > 0) k.hurtT -= dt;
  if (mo.justHit) { mo.justHit = false; if (!k.anim || k.anim.k !== 'roar') anim(mo, 'hurt'); if (!(k.hurtT > 0)) { k.hurtT = 0.8; ctx.sfx('kraken_hurt'); } }
  const wantSink = k.surf > 0 ? 0 : KR.SINK; k.sink += (wantSink - k.sink) * Math.min(1, dt * 5);
  slamTick(ctx, mo, dt, p, canHit, 1.2); tickExtras(ctx, mo, dt, p, canHit);
  if (bossLeash(ctx, mo, dt, p, canHit)) { krReset(ctx, mo); mo.x = home.x; mo.y = home.y; return; }
  if (!mo.warned) { mo.warned = true; ctx.toast(`👑 ${H.nm(ctx, c)}`, true); ctx.sfx('kraken_roar'); anim(mo, 'roar'); H.say(ctx, 'krp1', L(ctx).p1, false, 30); mo.cd = 1.4; }
  const ph = phaseOf(mo);
  if (mo.ph && ph > mo.ph) {   /* chuyển pha: gầm (1 lần) */
    anim(mo, 'roar'); ctx.sfx('kraken_roar'); if (ctx.quake) ctx.quake(0.3);
    if (ph === 2) { H.say(ctx, 'krp2', L(ctx).p2, true, 4); if (!k.inked && ctx.uwInk) { k.inked = true; ctx.uwInk(2.2); ctx.sfx('ink'); if (ctx.vfx) ctx.vfx('u_ink', mo.x, mo.y - 10, 0, true); H.say(ctx, 'krink', L(ctx).ink, false, 10); } }
    if (ph === 3) {
      H.say(ctx, 'krp3', L(ctx).p3, true, 4);
      if (!mo.summoned) { mo.summoned = true; H.say(ctx, 'krsum', L(ctx).sum, false, 4);
        for (const [kk, dx] of [['sawshark', -80], ['sawshark', 80], ['seasnake', 0]]) { const e = H.newMo(H.UW[kk], mo.x + dx, mo.y + 70); if (!H.walkable(ctx, e.x, e.y)) { e.x = mo.x; e.y = mo.y + 80; } e.angry = true; H.ST.list.push(e); if (ctx.vfx) ctx.vfx('u_bubbles', e.x, e.y, 0, true); } }
    }
    k.surf = 0; mo.cd = Math.max(mo.cd, 1.2);
  }
  mo.ph = ph;
  if (k.surf > 0) { k.surf -= dt; mo.open = true; if (k.surf <= 0) { mo.open = false; mo.cd = 1.0; ctx.sfx('bubbles'); } return; }
  mo.open = false;
  const busy = (mo.slams || []).some(s => s.st === 'warn' || s.st === 'lash') || k.sweeps.length || k.grab || k.rocks.some(r => r.st === 'warn');
  if (mo.cd > 0 || busy) return;
  if (k.vol >= (ph === 2 ? 2 : 3)) { surface(ctx, mo, ph); return; }
  volley(ctx, mo, p, ph); mo.cd = ph === 1 ? 1.5 : ph === 2 ? 1.25 : 1.05;
}
export function krOnDeath(mo) { H.ST.krDead = { x: mo.x, y: mo.y, t: 0, sink: mo.kr ? mo.kr.sink : KR.SINK }; }
export function krStrikeLabel(ctx) { return L(ctx); }

/* ---------------- nhắm / đánh xúc tu ---------------- */
export function krNearTent(mo, p, mt) {   /* xúc tu đang KẸT gần người chơi nhất (hoặc đang trỏ chuột) */
  let best = null, bd = 1e9;
  for (const s of mo.slams || []) {
    if (s.st !== 'stuck') continue; const d = Math.hypot(s.x - p.x, s.y - 4 - p.y), under = mt && Math.abs(mt.wx - s.x) < 18 && mt.wy > s.y - 30 && mt.wy < s.y + 6;
    const dd = under ? -1 : d; if (dd < bd) { bd = dd; best = { s, d, under }; }
  }
  return best;
}

/* ---------------- vẽ ---------------- */
export function drawCrack(g, m, cx, cy) {   /* khe vực trên nền (cả khi trùm đã hạ) */
  const kc = m && m.krCrack; if (!kc) return; const sh = sheet('crack'), x = Math.round(kc.x - cx), y = Math.round(kc.y - cy);
  if (sh) blit(g, sh, 0, x - sh.cw / 2, y - sh.ch / 2);
  else { g.fillStyle = '#0d0818'; g.beginPath(); g.ellipse(x, y, 38, 15, 0, 0, TAU); g.fill(); }
}
function bodyFrame(mo, k) {
  const a = k && k.anim, sh = a ? sheet(a.k) : null;
  if (a && sh) return { sh, f: Math.floor(a.t * (sh.fps || 10)) };
  const id = sheet('idle'); return id ? { sh: id, f: Math.floor(mo.ft * (id.fps || 6)) % id.n } : null;
}
function drawBody(g, mo, x, y, sink, fr, alpha = 1) {   /* đầu: thân vẽ thấp xuống `sink` px, cắt ngang ở lòng khe vực → trông như chìm/ngoi */
  const clipY = y - 4, top = y - 58 + Math.round(sink);
  g.save(); g.beginPath(); g.rect(x - 60, top - 20, 120, clipY - (top - 20)); g.clip(); if (alpha < 1) g.globalAlpha = alpha;
  if (fr) blit(g, fr.sh, fr.f, x - 40, top);
  else { const im = oldImg('kraken_head_big.png'); if (im) g.drawImage(im, x - 32, top + 10, 64, 48); }
  g.restore();
}
export function drawKraken(g, mo, x, y) {
  const k = st(mo), fr = bodyFrame(mo, k);
  if (mo.flash > 0) g.filter = 'brightness(2)'; else if (mo.open) g.filter = 'brightness(1.12)';
  drawBody(g, mo, x, y, k.sink, fr); g.filter = 'none';
}
export function drawDead(g, cx, cy, now) {   /* hạ xong: đầu chìm hẳn xuống khe vực (1,6 s) */
  const d = H.ST.krDead; if (!d) return; if (d.start == null) d.start = now; d.t = now - d.start; if (d.t > 1.6) { H.ST.krDead = null; return; }
  const sh = sheet('hurt'), fr = sh ? { sh, f: Math.min(sh.n - 1, Math.floor(d.t * 8) % sh.n) } : null;
  drawBody(g, null, Math.round(d.x - cx), Math.round(d.y - cy), d.sink + d.t * 34, fr, Math.max(0, 1 - d.t / 1.6));
}
export function krDrawables(g, mo, cx, cy, ctx, out) {
  const k = mo.kr; if (!k) return;
  for (const w of k.sweeps) if (w.st !== 'warn') out.push({ y: w.y + 4, f: () => drawSweep(g, w, cx, cy) });
  for (const r of k.rocks) out.push({ y: r.y + 0.3, f: () => drawRock(g, r, cx, cy) });
  if (k.grab && k.grab.st !== 'warn') { const gr = k.grab; out.push({ y: gr.y + 0.5, f: () => drawCoil(g, gr, cx, cy) }); }
}
function drawSweep(g, w, cx, cy) {   /* xúc tu dài nằm ngang: ngọn (kraken_ltip) + đoạn thân sóng (kraken_lseg) lặp xen kẽ lật gương về phía mép đấu trường → liền mạch */
  const tp = sheet('ltip'), sg = sheet('lseg'), y = Math.round(w.y - cy) - 16, tip = Math.round(w.tip - cx), right = w.dir > 0, edge = Math.round((right ? w.x0 : w.x1) - cx);
  if (!tp || !sg) { g.fillStyle = '#5a2a6a'; g.fillRect(Math.min(edge, tip), y + 8, Math.abs(tip - edge), 10); return; }
  g.save(); g.beginPath(); g.rect(Math.min(edge, tip) - 2, y - 8, Math.abs(tip - edge) + 4, tp.ch + 16); g.clip();
  if (right) { blit(g, tp, 0, tip - tp.cw, y); let k = 0; for (let x = tip - tp.cw - sg.cw; x > edge - sg.cw; x -= sg.cw, k++) blit(g, sg, 0, x, y, k % 2 === 1); }
  else { blit(g, tp, 0, tip, y, true); let k = 0; for (let x = tip + tp.cw; x < edge; x += sg.cw, k++) blit(g, sg, 0, x, y, k % 2 === 0); }
  g.restore();
}
function drawRock(g, r, cx, cy) {
  const sh = sheet('rock'), x = Math.round(r.x - cx), y = Math.round(r.y - cy);
  if (r.st === 'warn') { if (r.t > KR.RK_FALL) return; const h = (r.t / KR.RK_FALL) * 140; if (sh) blit(g, sh, 0, x - 8, Math.round(y - 14 - h)); return; }
  if (sh) { g.save(); g.globalAlpha = Math.max(0, r.t / 0.5); blit(g, sh, 0, x - 8, y - 13); g.restore(); }
}
function drawCoil(g, gr, cx, cy) {
  const sh = sheet('coil'), x = Math.round(gr.x - cx), y = Math.round(gr.y - cy);
  const shake = gr.st === 'hold' && gr.n > 0 ? Math.round(Math.sin(gr.t * 40) * 1) : 0;   /* rung nhẹ chỉ lúc người đang vùng */
  if (gr.st === 'miss') { const sl = sheet('tslam'); if (sl) blit(g, sl, 4 + Math.min(3, Math.floor((0.5 - gr.t) / 0.12)), x - 24, y - 46); return; }
  if (sh) blit(g, sh, 0, x - 16 + shake, y - 25); else { g.strokeStyle = '#7a3a8a'; g.lineWidth = 4; g.beginPath(); g.ellipse(x, y - 10, 10, 12, 0, 0, TAU); g.stroke(); }
}
