/* skymon.js — plan-31 bước 3: 5 loài quái bay ở Quần Đảo Mây (sky.js sinh qua ctx.monsters.add → kiếm người chơi đi qua monsters.strike, XP + rơi đồ qua killMonster).
   Mỗi con có mo.alt = tầng (0 thấp · 1 cao); đòn báo trước bằng vạch tĩnh theo tầng (ĐỎ thấp · XANH cao) → người chơi NÉ bằng cách đổi tầng (Space / ⇅) hoặc chạy khỏi vạch.
   Ảnh: sheet PixelLab 8 hướng (manifest monsters.<sheet>: 5 hàng S, SE, E, NE, N — tây = lật), vẽ 1:1. AI không vùng chết: ngưỡng áp sát ≤ ngưỡng đánh. */
import { ART } from '../art.js';

let API = null;
export function skyMonInit(a) { API = a; }
const TAU = Math.PI * 2, MLIFT = [10, 28];
const G = { thunderNext: 0 };
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
function moveTo(ctx, mo, tx, ty, sp, dt) {
  const dx = tx - mo.x, dy = ty - mo.y, d = Math.hypot(dx, dy); if (d < 1) return true;
  const s = Math.min(d, sp * dt), m = ctx.S.map; mo.x = Math.max(12, Math.min(m.w * 16 - 12, mo.x + dx / d * s)); mo.y = Math.max(16, Math.min(m.h * 16 - 8, mo.y + dy / d * s));
  mo.fa = Math.atan2(dy, dx); mo.moving = true; return d < 4;
}
const face = (mo, x, y) => { mo.fa = Math.atan2(y - mo.y, x - mo.x); };
const okTo = ctx => ctx.S.mode === 'play' && !(ctx.hero && ctx.hero.fainted);
const mark = (o) => API && API.mark(o);
const say = (ctx, txt) => { if (ctx.S.time - (G.sayT || -9) > 5) { G.sayT = ctx.S.time; ctx.toast(txt); } };
const V = ctx => ctx.lang() === 'vi';

/* ---- 1. Chim Sấm: bầy, lượn quanh; lần lượt nhắm LAO CHÉO qua người (vạch theo tầng 0,7 s) → để lại vệt sét 1 s (cùng tầng chạm vào là giật) ---- */
function aiThunder(ctx, mo, dt, p, dp) {
  const now = ctx.S.time; mo.moving = false;
  if (mo.trail) { for (const s of mo.trail) s.t -= dt; mo.trail = mo.trail.filter(s => s.t > 0);
    if (okTo(ctx) && mo.trail.some(s => Math.hypot(s.x - p.x, s.y - p.y) < 8) && (mo.trCd = (mo.trCd || 0) - dt) <= 0) { mo.trCd = 0.8; API.hitPlayer(ctx, mo, 0.5, mo.trTier ?? mo.alt, 'zap'); } }
  if (mo.st2 === 'aim') { mo.t2 -= dt; face(mo, mo.ax, mo.ay); if (mo.t2 <= 0) { mo.st2 = 'dash'; mo.t2 = 0.55; mo.hitOnce = false; mo.trail = mo.trail || []; mo.trTier = mo.alt; ctx.sfx('zap'); } return; }
  if (mo.st2 === 'dash') { mo.t2 -= dt; const l = Math.hypot(mo.ax - mo.sx, mo.ay - mo.sy) || 1; mo.x += (mo.ax - mo.sx) / l * 300 * dt; mo.y += (mo.ay - mo.sy) / l * 300 * dt; mo.fa = Math.atan2(mo.ay - mo.sy, mo.ax - mo.sx); mo.moving = true;
    mo.trail.push({ x: mo.x, y: mo.y, t: 1.0 });
    if (okTo(ctx) && !mo.hitOnce && dist(mo, p) < 11) { mo.hitOnce = true; API.hitPlayer(ctx, mo, 1, mo.alt, 'dash'); }
    if (mo.t2 <= 0) { mo.st2 = 'tired'; mo.t2 = 1.0; mo.open = true; } return; }
  if (mo.st2 === 'tired') { mo.t2 -= dt; if (mo.t2 <= 0) { mo.st2 = null; mo.open = false; } return; }
  if ((mo.altT = (mo.altT ?? 4 + (mo.id % 5)) - dt) <= 0) { mo.altT = 6 + Math.random() * 4; mo.alt = 1 - (mo.alt || 0); }
  const aggro = mo.angry || dp < 190;
  if (!aggro) { mo.orb = (mo.orb || mo.id) + dt * 0.4; moveTo(ctx, mo, mo.home.x + Math.cos(mo.orb) * 50, mo.home.y + Math.sin(mo.orb) * 30, mo.c.sp * 0.6, dt); return; }
  mo.orb = (mo.orb ?? Math.atan2(mo.y - p.y, mo.x - p.x)) + dt * 0.9;
  moveTo(ctx, mo, p.x + Math.cos(mo.orb) * 70, p.y + Math.sin(mo.orb) * 48, mo.c.sp, dt);
  if (now >= G.thunderNext && dp < 130 && okTo(ctx)) {   /* cả bầy thay phiên: 2,4 s một con lao */
    G.thunderNext = now + 2.4; const l = dp || 1; mo.sx = mo.x; mo.sy = mo.y; mo.ax = p.x + (p.x - mo.x) / l * 70; mo.ay = p.y + (p.y - mo.y) / l * 70;
    mo.st2 = 'aim'; mo.t2 = 0.7; mark({ kind: 'lane', x: mo.x, y: mo.y, x2: mo.ax, y2: mo.ay, w: 6, tier: mo.alt, t: 0.7, dur: 0.7 });
  }
}
/* ---- 2. Sứa Trời: tầng THẤP, trôi chậm về phía người; xúc tu điện: vòng ĐỎ 0,9 s rồi giật cả vòng ---- */
function aiJelly(ctx, mo, dt, p, dp) {
  mo.alt = 0; mo.moving = false;
  if (mo.zap > 0) mo.zap -= dt;
  if (mo.st2 === 'charge') { mo.t2 -= dt; if (mo.t2 <= 0) { mo.st2 = null; mo.cd = 3.2; mo.zap = 0.4; ctx.sfx('zap');
    if (ctx.vfx) for (let i = 0; i < 6; i++) ctx.vfx('u_shock', mo.x + Math.cos(i * TAU / 6) * 26, mo.y + Math.sin(i * TAU / 6) * 15 + 4, 0, true);
    if (okTo(ctx) && dist(mo, p) < 36) API.hitPlayer(ctx, mo, 1, 0, 'zap'); } return; }
  if (okTo(ctx) && dp < 12 && (mo.cd2 = (mo.cd2 || 0) - dt) <= 0) { mo.cd2 = 1.5; API.hitPlayer(ctx, mo, 0.4, 0, 'touch'); }
  if (mo.angry || dp < 210) { moveTo(ctx, mo, p.x + Math.sin(ctx.S.time * 0.7 + mo.id) * 14, p.y - 2, mo.c.sp, dt);
    if (dp < 44 && mo.cd <= 0 && okTo(ctx)) { mo.st2 = 'charge'; mo.t2 = 0.9; mark({ kind: 'ring', x: mo.x, y: mo.y, r: 36, tier: 0, t: 0.9, dur: 0.9 }); } return; }
  moveTo(ctx, mo, mo.home.x + Math.sin(ctx.S.time * 0.3 + mo.id) * 40, mo.home.y + Math.cos(ctx.S.time * 0.25 + mo.id) * 24, mo.c.sp * 0.5, dt);
}
/* ---- 3. Diều Hâu Đá: tầng CAO, lượn vòng; BỔ NHÀO vào chỗ người đứng: vòng theo TẦNG HIỆN TẠI của người (1 s) → đổi tầng / chạy ra để né;
        trúng khi đang bay = BỊ ĐÁNH RƠI khỏi lưng Rocky; bổ hụt → choáng 1,6 s ở tầng thấp (đánh đau ×1,5) ---- */
function aiHawk(ctx, mo, dt, p, dp) {
  mo.moving = false;
  if (mo.st2 === 'aim') { mo.t2 -= dt; if (mo.t2 > 0.5) { mo.rx = p.x; mo.ry = p.y; mo.mk.x = p.x; mo.mk.y = p.y; } face(mo, mo.rx, mo.ry);
    if (mo.t2 <= 0) { mo.st2 = 'dive'; mo.t2 = 0.32; ctx.sfx('whoosh'); } return; }
  if (mo.st2 === 'dive') { mo.t2 -= dt; moveTo(ctx, mo, mo.rx, mo.ry, 420, dt); if (mo.t2 <= 0) {
      mo.x = mo.rx; mo.y = mo.ry; if (ctx.quake) ctx.quake(0.18); if (ctx.vfx) ctx.vfx('rock_debris', mo.x, mo.y + 4);
      const inR = Math.hypot(p.x - mo.rx, p.y - mo.ry) < 22;
      if (okTo(ctx) && inR && API.hitPlayer(ctx, mo, 1.3, mo.dTier, API.flying() ? 'knockoff' : 'dive')) { if (!API.flying()) { const l = Math.hypot(p.x - mo.x, p.y - mo.y) || 1; API.shove(ctx, (p.x - mo.x) / l || 1, (p.y - mo.y) / l, 26); } }
      mo.st2 = 'stun'; mo.t2 = 1.6; mo.alt = 0; mo.open = true; } return; }
  if (mo.st2 === 'stun') { mo.t2 -= dt; if (mo.t2 <= 0) { mo.st2 = null; mo.open = false; mo.alt = 1; mo.cd = 2.5; } return; }
  mo.alt = 1;
  if (!(mo.angry || dp < 220)) { mo.orb = (mo.orb || mo.id) + dt * 0.35; moveTo(ctx, mo, mo.home.x + Math.cos(mo.orb) * 70, mo.home.y + Math.sin(mo.orb) * 40, mo.c.sp * 0.6, dt); return; }
  mo.orb = (mo.orb ?? 0) + dt * 0.7; moveTo(ctx, mo, p.x + Math.cos(mo.orb) * 92, p.y + Math.sin(mo.orb) * 60, mo.c.sp, dt);
  if (mo.cd <= 0 && dp < 150 && okTo(ctx)) { mo.st2 = 'aim'; mo.t2 = 1.0; mo.rx = p.x; mo.ry = p.y; mo.dTier = API.tier(); mo.mk = { kind: 'ring', x: p.x, y: p.y, r: 22, tier: mo.dTier, t: 1.3, dur: 1.3 }; mark(mo.mk);
    say(ctx, V(ctx) ? (mo.dTier ? 'Diều Hâu Đá nhắm bổ nhào tầng CAO — xuống tầng thấp để né!' : 'Diều Hâu Đá nhắm bổ nhào tầng THẤP — lên tầng cao hoặc chạy ra!') : (mo.dTier ? 'Stone Hawk dives at the HIGH tier — drop low to dodge!' : 'Stone Hawk dives at the LOW tier — go high or run!')); }
}
/* ---- 4. Cướp Trời: thuyền buồm-mây giữ khoảng cách, BẮN MÓC theo tầng của người (vạch 0,8 s): trúng → kéo về phía thuyền + ép xuống TẦNG THẤP 1,2 s ---- */
function aiPirate(ctx, mo, dt, p, dp) {
  mo.alt = 0; mo.moving = false;
  if (mo.hook) { const h = mo.hook; h.t -= dt;
    if (h.st === 'out') { h.x += h.vx * dt; h.y += h.vy * dt; h.d += Math.hypot(h.vx, h.vy) * dt;
      if (okTo(ctx) && Math.hypot(h.x - p.x, h.y - p.y) < 10) { h.st = 'back';
        if (API.hitPlayer(ctx, mo, 0.8, h.tier, 'hook')) { const l = Math.hypot(mo.x - p.x, mo.y - p.y) || 1; API.shove(ctx, (mo.x - p.x) / l, (mo.y - p.y) / l, 40); API.setHook(1.2); ctx.toast(API.L(ctx).hooked); } }
      if (h.d > 210) h.st = 'back'; }
    else { const l = Math.hypot(mo.x - h.x, mo.y - h.y) || 1; h.x += (mo.x - h.x) / l * 360 * dt; h.y += (mo.y - h.y) / l * 360 * dt; if (l < 10) mo.hook = null; }
    return; }
  if (mo.st2 === 'aim') { mo.t2 -= dt; face(mo, mo.ax, mo.ay); if (mo.t2 <= 0) { mo.st2 = null; mo.cd = 4.5; const l = Math.hypot(mo.ax - mo.x, mo.ay - mo.y) || 1;
      mo.hook = { x: mo.x, y: mo.y - 6, vx: (mo.ax - mo.x) / l * 320, vy: (mo.ay - mo.y) / l * 320, d: 0, st: 'out', t: 3, tier: mo.hTier }; ctx.sfx('whoosh'); } return; }
  if (!(mo.angry || dp < 230)) { mo.orb = (mo.orb || mo.id) + dt * 0.25; moveTo(ctx, mo, mo.home.x + Math.cos(mo.orb) * 60, mo.home.y + Math.sin(mo.orb) * 30, mo.c.sp * 0.6, dt); return; }
  mo.orb = (mo.orb ?? Math.atan2(mo.y - p.y, mo.x - p.x)) + dt * 0.35;   /* giữ ~110 px — không có vùng chết: đứng đâu cũng bắn được trong 200 px */
  moveTo(ctx, mo, p.x + Math.cos(mo.orb) * 110, p.y + Math.sin(mo.orb) * 75, mo.c.sp, dt);
  if (okTo(ctx) && dp < 15 && (mo.cd2 = (mo.cd2 || 0) - dt) <= 0) { mo.cd2 = 1.4; API.hitPlayer(ctx, mo, 0.5, 0, 'ram'); }
  if (mo.cd <= 0 && dp < 200 && okTo(ctx)) { mo.st2 = 'aim'; mo.t2 = 0.8; mo.hTier = API.tier(); const l = dp || 1; mo.ax = p.x + (p.x - mo.x) / l * 40; mo.ay = p.y + (p.y - mo.y) / l * 40;
    mark({ kind: 'lane', x: mo.x, y: mo.y, x2: mo.ax, y2: mo.ay, w: 4, tier: mo.hTier, t: 0.8, dur: 0.8 }); }
}
/* ---- 5. Cá Voi Mây: khổng lồ, bơi vòng quanh quần đảo, CHỞ ĐẢO NHỎ trên lưng — mo.x/y = đảo trên lưng (chỗ đánh được);
        bị chọc giận: luân phiên quạt gió tầng CAO (vòng xanh lớn, hất ra) / quẫy đuôi tầng THẤP (vòng đỏ) ---- */
const WPATH = [[46, 30], [60, 22], [68, 36], [54, 46], [34, 38], [28, 24]];
function aiWhale(ctx, mo, dt, p, dp) {
  mo.alt = 0; mo.moving = false;
  if (mo.st2 === 'wind') { mo.t2 -= dt; if (mo.t2 <= 0) { mo.st2 = null; mo.cd = 4.5; const k = mo.atk; ctx.sfx('whoosh'); if (ctx.quake) ctx.quake(0.2);
      if (ctx.vfx) ctx.vfx(ART.vfx && ART.vfx.sky_gust ? 'sky_gust' : 'dirt_puff', mo.x, mo.y + 6);
      if (okTo(ctx) && dist(mo, p) < k.r && API.hitPlayer(ctx, mo, k.tier ? 0.8 : 1, k.tier, 'whale')) { const l = dist(mo, p) || 1; API.shove(ctx, (p.x - mo.x) / l || 1, (p.y - mo.y) / l, k.tier ? 46 : 20); } } return; }
  if (mo.angry && dp > 50 && dp < 320) moveTo(ctx, mo, p.x, p.y, mo.c.sp * 2.2, dt);   /* bị chọc giận: bơi lại gần tới 50 px — nhỏ hơn bán kính cả 2 đòn (70 / 90) → không vùng chết */
  else { const wp = WPATH[mo.wi = mo.wi ?? 0]; if (moveTo(ctx, mo, wp[0] * 16, wp[1] * 16, mo.c.sp, dt)) mo.wi = (mo.wi + 1) % WPATH.length; }
  if (mo.angry && dp > 420) mo.angry = false;
  if ((mo.angry || dp < 70) && mo.cd <= 0 && dp < 130 && okTo(ctx)) { mo.n = (mo.n || 0) + 1; const hi = mo.n % 2 === 1;
    mo.atk = { tier: hi ? 1 : 0, r: hi ? 90 : 70 }; mo.st2 = 'wind'; mo.t2 = 1.1; mark({ kind: 'ring', x: mo.x, y: mo.y, r: mo.atk.r, tier: mo.atk.tier, t: 1.1, dur: 1.1 }); }
}

/* ---- vẽ: sheet 8 hướng (5 hàng S SE E NE N; tây lật) + bóng tách theo tầng + vệt sét / dây móc ---- */
function rowOf(sh, ang) {   /* ang: hướng màn hình (y xuống) → [hàng, lật] */
  let a = ang * 180 / Math.PI; const flip = Math.cos(ang) < -0.2; if (flip) a = 180 - a;
  a = ((a + 540) % 360) - 180;   /* −180..180, phía đông */
  const rows = sh.rows || ['south', 'south-east', 'east', 'north-east', 'north'], want = a > 67 ? 'south' : a > 22 ? 'south-east' : a > -22 ? 'east' : a > -67 ? 'north-east' : 'north';
  const r = rows.indexOf(want); return [r >= 0 ? r : 0, flip];
}
function drawSky(g, mo, x, y) {
  const c = mo.c, sh = ART.monsters && ART.monsters[c.sheet], tl = MLIFT[mo.alt ?? 0];
  mo.lift = (mo.lift ?? tl) + Math.sign(tl - (mo.lift ?? tl)) * Math.min(Math.abs(tl - (mo.lift ?? tl)), 2);
  const ft = mo.ft || 0, bob = c.big ? Math.round(Math.sin(ft * 1.2) * 2) : Math.round(Math.sin(ft * 3) * 1.5), lift = Math.round(mo.lift) + bob, k = 1 - (mo.lift - MLIFT[0]) / 60;
  g.fillStyle = `rgba(0,0,0,${(0.28 * k).toFixed(3)})`; g.beginPath(); g.ellipse(x, y + 1, c.w * 0.42 * k + 2, (c.big ? 7 : 3) * k + 1, 0, 0, TAU); g.fill();
  if (mo.trail && mo.trail.length) {   /* vệt sét Chim Sấm: tia PixelLab u_shock dọc vệt + đường màu theo tầng */
    const us = ART.vfx && ART.vfx.u_shock, cam = { x: x - mo.x, y: y - mo.y };
    g.save(); g.strokeStyle = (mo.trTier ?? mo.alt) ? 'rgba(120,190,255,.7)' : 'rgba(255,120,80,.7)'; g.lineWidth = 2; g.beginPath(); mo.trail.forEach((s, i) => { const sx = s.x + cam.x, sy = s.y + cam.y - MLIFT[mo.trTier ?? 0]; if (i) g.lineTo(sx, sy); else g.moveTo(sx, sy); }); g.stroke(); g.restore();
    if (us && us.img) { const hi = us.img.__hi ? 1 : 2; mo.trail.forEach((s, i) => { if (i % 3) return; const fi = (Math.floor(ft * 14) + i) % us.n; g.globalAlpha = Math.min(1, s.t * 1.5); g.drawImage(us.img, fi * us.w * hi, 0, us.w * hi, us.h * hi, Math.round(s.x + cam.x - us.w / 2), Math.round(s.y + cam.y - MLIFT[mo.trTier ?? 0] - us.h / 2), us.w, us.h); }); g.globalAlpha = 1; }
  }
  if (mo.hook) {   /* dây móc + móc sắt PixelLab */
    const h = mo.hook, hx = h.x + x - mo.x, hy = h.y + y - mo.y - MLIFT[h.tier ?? 0], pk = ART.packs && ART.packs.sky, im = pk && pk.images && pk.images.hook;
    g.strokeStyle = '#5a3a22'; g.lineWidth = 1; g.beginPath(); g.moveTo(x, y - lift - 10); g.lineTo(hx, hy); g.stroke();
    if (im) g.drawImage(im, Math.round(hx - im.width / 4), Math.round(hy - im.height / 4), im.width / 2, im.height / 2); else { g.fillStyle = '#8a8a96'; g.fillRect(Math.round(hx) - 2, Math.round(hy) - 2, 4, 4); }
  }
  if (sh) {
    const [row, flip] = rowOf(sh, mo.fa ?? Math.PI / 2), fr = Math.floor(ft * (c.big ? 4 : 8)) % sh.n, cw = sh.cw, ch = sh.ch, dx = x - (cw >> 1), dy = y - ch + 2 - lift;
    if (mo.flash > 0) g.filter = 'brightness(2.4)'; else if (mo.open) g.filter = 'brightness(1.2)'; else if (mo.zap > 0 || mo.st2 === 'charge') g.filter = 'brightness(1.35) saturate(1.4)';
    if (flip) { g.save(); g.translate(x * 2, 0); g.scale(-1, 1); g.drawImage(sh.img, fr * cw, row * ch, cw, ch, dx, dy, cw, ch); g.restore(); }
    else g.drawImage(sh.img, fr * cw, row * ch, cw, ch, dx, dy, cw, ch);
    g.filter = 'none';
  } else { g.fillStyle = c.col || '#cfd8ff'; g.fillRect(x - (c.w >> 1), y - 14 - lift, c.w, 12); }
  if (mo.hp < mo.max) { const w = Math.min(36, c.w), top = y - lift - (c.vh || 22) - 3; g.fillStyle = '#352022'; g.fillRect(x - (w >> 1) - 1, top, w + 2, 3); g.fillStyle = mo.open ? '#ff9a3a' : '#e84a3a'; g.fillRect(x - (w >> 1), top + 1, Math.max(1, Math.round(w * mo.hp / mo.max)), 1); }
  if ((mo.alt ?? 0) === 1 && !c.big) { g.fillStyle = 'rgba(120,190,255,.85)'; g.fillRect(x - 1, y - 2, 3, 1); }   /* chấm xanh dưới bóng: con này đang ở tầng CAO */
}
const mk = (key, o) => ({ key, sky: true, fly: true, aiFn: (ctx, mo, dt, p, dp, ch) => { if (!mo.hold) o.ai(ctx, mo, dt, p, dp, ch); },   /* mo.hold: móc test (đứng yên) */ drawFn: drawSky, armor: 4, day: 0, night: 0, c: ['#cfd8ff', '#7a86b0', '#ffffff'], ...o });
export const SKYMON = {
  thunder: mk('sky_thunder', { sheet: 'sky_thunder', vi: 'Chim Sấm', en: 'Thunderbird', hp: 650, dmg: 30, sp: 70, xp: 180, drop: 'tfeather', w: 20, h: 48, vh: 22, alt0: 0, ai: aiThunder, weak: 1.3 }),
  jelly: mk('sky_jelly', { sheet: 'sky_jelly', vi: 'Sứa Trời', en: 'Sky Jelly', hp: 900, dmg: 32, sp: 16, xp: 210, drop: 'cloudsilk', w: 18, h: 44, vh: 22, alt0: 0, ai: aiJelly }),
  hawk: mk('sky_hawk', { sheet: 'sky_hawk', vi: 'Diều Hâu Đá', en: 'Stone Hawk', hp: 1200, dmg: 38, sp: 72, xp: 260, drop: 'floatstone', w: 26, h: 60, vh: 28, alt0: 1, ai: aiHawk, weak: 1.5 }),
  pirate: mk('sky_pirate', { sheet: 'sky_pirate', vi: 'Cướp Trời', en: 'Sky Pirate', hp: 1500, dmg: 34, sp: 40, xp: 320, drop: 'cloudsilk', w: 40, h: 64, vh: 40, alt0: 0, ai: aiPirate }),
  whale: mk('sky_whale', { sheet: 'sky_whale', vi: 'Cá Voi Mây', en: 'Cloud Whale', hp: 4000, dmg: 40, sp: 14, xp: 700, drop: 'floatstone', w: 60, h: 90, vh: 70, alt0: 0, ai: aiWhale, big: true }),
};
export const EXTRA = { sky_whale: [['cloudsilk', 2], ['floatstone', 1]], sky_pirate: [['floatstone', 1]], sky_thunder: [['tfeather', 1]], sky_jelly: [['cloudsilk', 1]], sky_hawk: [['floatstone', 1]] };
