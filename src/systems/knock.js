// knock.js — 2026-10-11 (anh yêu cầu): PHẢN ỨNG TRÚNG ĐÒN của người chơi — dùng chung cho bạn tập (spar.js), sau này cả quái/trùm.
//   ctx.knockPlayer({ type, dir: {x, y}, power = 1, bound(x, y) → false = không được ra ngoài, src })
//   type: 'stagger' (lảo đảo, không bay) · 'fly' (văng xa trên cung, trượt + ngã khi rơi) · 'launch' (hất TUNG lên: độ cao z, bóng nằm dưới đất,
//         rơi nảy 1 nhịp) · 'throw' (bị nhấc lên ném theo cung).
// HÌNH = PixelLab (anh: 'mọi thứ hiện ra là ảnh PixelLab'):
//   · clip người chơi (tools/px-actions.py, cho cả hung_b + c0, S/E/N, tây = lật): `stagger` (giật lùi 1 bước) · `knockfly` (văng ngửa, tay chân quơ)
//     · `launched` (bị hất thẳng lên, dang tay chân) · `knockdown` (ngã ngửa xuống đất rồi chống tay đứng dậy). Bay: thêm xoay canvas NHẸ (ngả + lộn khi cú rất nặng).
//   · VFX vfx_workbench (assets/px/vfx/knock_*): knock_jab (tia nhỏ) · knock_heavy (sao nổ trắng-cam) · knock_streak (vệt gió sau thân đang bay, chỉ lúc bay)
//     · knock_erupt (đất nứt + đá bắn dưới chân khi bị hất tung) · knock_land (bụi vòng + đá vụn khi ngã) · knock_wall (đập tường) · knock_dizzy (sao quay ~1 s sau cú nặng nhất).
// Luật: không điều khiển được trong lúc phản ứng; miễn sát thương lúc bay + 0,6 s sau khi đứng dậy; ô cứng / mép vòng → dừng (đập tường rồi trượt xuống);
//   hiệu ứng chỉ theo SỰ KIỆN (lúc bị đánh / chạm đất / đập tường), không vòng lặp kéo dài.
import { ART } from '../art.js';
const G = 560;   /* trọng lực (px/s²) cho độ cao z */
const TYPES = {
  stagger: { sp: 70, vz: 0, spin: 0, fric: 9, stop: 0, minT: 0.32 },
  fly: { sp: 175, vz: 150, spin: 1, fric: 6, stop: 0.06, skid: true, minT: 0.6 },
  launch: { sp: 22, vz: 215, spin: 0, fric: 4, stop: 0.06, bounce: 70, minT: 0.7 },
  uppercut: { sp: 120, vz: 235, spin: 0, fric: 5, stop: 0.09, skid: true, bounce: 60, minT: 0.8 },   /* 2026-10-11 Cằm Búa 'Hất Cằm': hất tung CAO + văng xa (clip launched) */
  throw: { sp: 125, vz: 210, spin: 0.5, fric: 6, stop: 0.07, skid: true, minT: 0.7 },
  hold: { sp: 0, vz: 0, spin: 0, fric: 9, stop: 0, minT: 99 },   /* bị nhấc bổng (Ôm Quật): vị trí do o.follow() quyết định, tới khi ctx.knockRelease() */
};
const DOWN_T = 0.95;   /* clip knockdown: nằm (khung 3→cuối) · nằm im · đứng dậy (chạy ngược về khung 0) */
const ST = { k: null, last: null, log: [], dizzy: null };
const p_ = ctx => ctx.S.player;
const faceOf = (dx, dy) => (Math.abs(dx) >= Math.abs(dy) ? (dx >= 0 ? 2 : 1) : (dy >= 0 ? 0 : 3));
const clip = (p, n) => p.sheet && p.sheet.actions && p.sheet.actions[n];
function fx(ctx, name, x, y, top, flip) { return !!(ctx.vfx && ctx.vfx(name, x, y, 0, top, flip)); }
function start(ctx, o) {
  const p = p_(ctx), T = TYPES[o.type] || TYPES.stagger, pw = Math.max(0.3, Math.min(1.6, o.power || 1));
  const l = Math.hypot(o.dir && o.dir.x || 0, o.dir && o.dir.y || 0) || 1, ux = (o.dir ? o.dir.x : 0) / l, uy = (o.dir ? o.dir.y : 1) / l;
  if (ST.k) end(ctx, true);
  const own = !p.custom;   /* đang dùng hình riêng (bơi, lái xe…) → chỉ đẩy lùi, không thay hình */
  const type = o.type in TYPES ? o.type : 'stagger';
  const k = { type, T, pw, ux, uy, vx: ux * T.sp * pw, vy: uy * T.sp * pw * 0.85, z: 0, vz: T.vz * (0.75 + 0.25 * pw), ang: 0, spinDir: ux >= 0 ? 1 : -1,
    t: 0, stop: T.stop, air: T.vz > 0, bounced: false, down: -1, flash: type === 'stagger' ? 0.05 : 0.08, bound: o.bound || null, own, sm: p.speedMul, wall: false, x0: p.x, y0: p.y,
    dir: faceOf(-ux, -uy), mdir: faceOf(ux, uy), heavy: type !== 'stagger' && type !== 'hold' && pw >= 1, follow: o.follow || null, onLand: o.onLand || null };   /* mặt quay về phía kẻ đánh, thân văng ngược lại */
  k.air0 = k.air ? 2 * k.vz / G : 0;
  k.spinSp = k.air0 && T.spin && pw >= 1.05 ? T.spin * Math.PI * 2 / k.air0 : 0;   /* lộn vòng chỉ khi cú thật nặng; còn lại ngả nhẹ */
  p.autoPath = null; p.speedMul = 0; if (p.endAct) p.endAct(); if (own) p.custom = (g, pp) => draw(g, pp, k);
  if (ctx.hero && ctx.hero.iframes) ctx.hero.iframes(type === 'stagger' ? 0.15 : 3);   /* lảo đảo: chỉ khựng ngắn (combo jab vẫn nối được) */
  if (type === 'stagger') fx(ctx, 'knock_jab', p.x - ux * 3, p.y - 5, true);
  else if (type === 'hold') { /* tiếng do hệ gọi lo */ }
  else {
    ctx.sfx('knock_whoosh'); if (ctx.quake) ctx.quake(0.1);
    fx(ctx, 'knock_heavy', p.x - ux * 4, p.y + 2, true);
    if (type === 'launch') fx(ctx, 'knock_erupt', p.x, p.y + 3, false);   /* đất nứt + đá bắn dưới chân (Bàn Cờ, giáng xuống) */
  }
  ST.k = k; ST.log.push({ type, t: +ctx.S.time.toFixed(2) }); if (ST.log.length > 12) ST.log.shift();
  return k;
}
function end(ctx, cut) {
  const k = ST.k, p = p_(ctx); if (!k) return; ST.k = null;
  if (k.own && p.custom) p.custom = null; p.speedMul = k.sm == null ? 1 : k.sm; p.dir = k.dir;
  if (ctx.hero && ctx.hero.iframes && k.type !== 'stagger') ctx.hero.iframes(cut ? 0.2 : 0.6);   /* đứng dậy xong: thêm 0,6 s miễn sát thương */
  if (!cut && k.heavy && k.type !== 'throw') ST.dizzy = { t: 0, dur: 1 };   /* sao quay ~1 s sau cú nặng nhất (sự kiện ngắn) */
  ST.last = { type: k.type, dx: Math.round(p.x - k.x0), dy: Math.round(p.y - k.y0), wall: k.wall, maxZ: Math.round(k.maxZ || 0), spins: +(Math.abs(k.spun || 0) / (Math.PI * 2)).toFixed(2), t: +k.t.toFixed(2), cut: !!cut, down: k.down >= 0 };
}
function moveGround(ctx, k, dx, dy) {   /* đi từng bước nhỏ; ô cứng / mép vòng → dừng */
  const p = p_(ctx), n = Math.max(1, Math.ceil(Math.hypot(dx, dy) / 2)); let hit = false;
  for (let i = 0; i < n; i++) {
    const sx = dx / n, sy = dy / n;
    if (k.bound && !k.bound(p.x + sx, p.y + sy)) { hit = true; break; }
    const ox = p.x, oy = p.y; p.tryMove(sx, sy, ctx.S.map, []);   /* chỉ ô cứng chặn (dân/Rocky không phải tường) */
    if (Math.abs(p.x - ox - sx) > 0.01 || Math.abs(p.y - oy - sy) > 0.01) { hit = true; break; }
  }
  return hit;
}
/* ---- vẽ: bóng trên đất · vệt gió (sau thân) · khung clip PixelLab theo pha (xoay nhẹ quanh giữa thân) ---- */
function clipFrame(p, k) {
  if (k.down >= 0) { const c = clip(p, 'knockdown'); if (c) { const u = (k.t - k.down) / DOWN_T, n = c.n, a = Math.min(3, n - 1);
    const f = u < 0.35 ? a + Math.floor(u / 0.35 * (n - a)) : u < 0.55 ? n - 1 : Math.max(0, n - 1 - Math.floor((u - 0.55) / 0.45 * n)); return [c, Math.min(n - 1, f), k.mdir]; } }
  if (k.type === 'stagger') { const c = clip(p, 'stagger'); if (c) return [c, Math.min(c.n - 1, Math.floor(k.t / TYPES.stagger.minT * c.n))]; }
  if (k.type === 'hold') { const c = clip(p, 'launched'); if (c) return [c, Math.min(c.n - 1, 2 + Math.floor(k.t * 6) % 2), k.dir]; }   /* bị nhấc bổng: dang tay chân giãy */
  if (k.type === 'launch' || (k.type === 'uppercut' && k.z > 2)) { const c = clip(p, 'launched'); if (c) return [c, Math.min(c.n - 1, 1 + Math.floor(k.t * 8) % Math.max(1, c.n - 1))]; }
  if (k.type === 'fly' || k.type === 'throw') { const c = clip(p, 'knockfly'); if (c) return [c, Math.min(c.n - 1, 2 + Math.floor(k.t * 9) % Math.max(1, c.n - 2)), k.mdir]; }   /* hàng = hướng bay (clip vẽ thân lao theo hướng đó) */
  const h = clip(p, 'hurt'); return h ? [h, Math.min(h.n - 1, 1)] : [null, 0];
}
function draw(g, p, k) {
  const x = Math.round(p.x), y = Math.round(p.y), cy = y - 9, z = Math.round(k.z), s = Math.max(0.45, 1 - k.z / 90);
  g.fillStyle = `rgba(0,0,0,${0.3 * s})`; g.beginPath(); g.ellipse(x, y + 1, 6 * s, 2.2 * s, 0, 0, 7); g.fill();   /* bóng nằm trên đất suốt lúc bay */
  const st = ART.vfx && ART.vfx.knock_streak;
  if (st && k.air && (k.type === 'fly' || k.type === 'throw') && Math.hypot(k.vx, k.vy) > 50) {   /* vệt gió sau thân (sheet vẽ cho hướng bay sang phải → bay trái thì lật) */
    const f = Math.floor(k.t * (st.fps || 12)) % st.n, hi = st.img.__hi ? 1 : 2, left = k.vx < 0;
    g.save(); g.globalAlpha = 0.85; g.translate(x - (left ? -10 : 10), cy - z); if (left) g.scale(-1, 1);
    g.drawImage(st.img, f * st.w * hi, 0, st.w * hi, st.h * hi, -st.w + 8, -st.h / 2, st.w, st.h); g.restore();
  }
  const [c, f, rowO] = clipFrame(p, k), lean = k.air && !c ? (k.type === 'launch' || k.type === 'uppercut' ? 0 : -0.35 * k.spinDir) : 0;   /* có clip PixelLab thì không ngả thêm */
  g.save(); g.translate(x, cy - z); const a = c && c !== clip(p, 'hurt') ? (k.air && k.type !== 'launch' && k.type !== 'uppercut' ? Math.sin(k.t * 16) * 0.16 * k.spinDir : 0) : k.ang + lean; if (a) g.rotate(a); g.translate(-x, -cy);   /* clip PixelLab: chỉ lắc nhẹ (lộn vòng nặng chỉ khi thiếu clip) */
  if (k.flash > 0) g.filter = 'brightness(2.2)';
  if (c) {
    const ch = c.ch || 20, cw = c.cw || 16, row = rowO ?? k.dir;
    g.drawImage(c.img, f * cw, row * ch, cw, ch, x - (cw >> 1), y - 18 - (ch - 20), cw, ch);
  } else { const cc = p.custom; p.custom = null; try { p.draw(g); } finally { p.custom = cc; } }
  g.filter = 'none'; g.restore();
}
export const knock = {
  id: 'knock',
  onZoneEnter(ctx) {
    ST.k = null; ST.dizzy = null;
    ctx.knockPlayer = o => start(ctx, o || {});
    ctx.knocked = () => !!ST.k;
    ctx.knockRelease = () => { if (ST.k && ST.k.type === 'hold') { const p = p_(ctx); p.y += 2; end(ctx, true); } };   /* thả người đang bị nhấc bổng (để ném / vùng thoát) */
    if (typeof window !== 'undefined') window.__knock = { state: () => (ST.k ? { type: ST.k.type, z: +ST.k.z.toFixed(1), ang: +ST.k.ang.toFixed(2), t: +ST.k.t.toFixed(2), speedMul: p_(ctx).speedMul, wall: ST.k.wall, down: ST.k.down >= 0, clip: (clipFrame(p_(ctx), ST.k)[0] || {}).n || 0 } : null), last: () => ST.last, log: () => ST.log.slice(), hit: o => start(ctx, o), dizzy: () => !!ST.dizzy };
  },
  onZoneLeave(ctx) { if (ST.k) end(ctx, true); ST.dizzy = null; },
  update(dt, ctx) {
    if (ST.dizzy) { ST.dizzy.t += dt; if (ST.dizzy.t >= ST.dizzy.dur) ST.dizzy = null; }
    const k = ST.k; if (!k) return; const p = p_(ctx);
    if (ctx.S.mode !== 'play') return;
    p.autoPath = null; p.speedMul = 0;
    if (k.flash > 0) k.flash -= dt;
    if (k.stop > 0) { k.stop -= dt; return; }   /* khựng hình lúc trúng đòn */
    k.t += dt;
    if (k.type === 'hold') { const f = k.follow && k.follow(); if (!f) { end(ctx, true); return; } p.x = f.x; p.y = f.y; k.z = f.z || 0; k.maxZ = Math.max(k.maxZ || 0, k.z); return; }
    if (k.air) {
      k.vz -= G * dt; k.z = Math.max(0, k.z + k.vz * dt); k.maxZ = Math.max(k.maxZ || 0, k.z); const da = k.spinSp * k.spinDir * dt; k.ang += da; k.spun = (k.spun || 0) + Math.abs(da);
      if (moveGround(ctx, k, k.vx * dt, k.vy * dt) && Math.hypot(k.vx, k.vy) > 40 && !k.wall) {   /* bay ngang trúng tường / mép vòng: đập rồi trượt xuống */
        const pw0 = Math.max(0.8, Math.min(1.5, k.pw + 0.1)), r = ctx.arenaImpact ? ctx.arenaImpact(p.x + k.ux * 10, p.y + k.uy * 6, pw0, 'wall') : 0;   /* lực theo cú đánh: vách hang nứt nặng/nhẹ theo đó */   /* Sàn Đấu Ngầm: văng trúng vật → vật hư / vỡ */
        ctx.sfx('knock_wall'); if (ctx.quake) ctx.quake(0.12); fx(ctx, 'knock_wall', p.x + k.ux * 6, p.y - Math.round(k.z) + 6, true);
        if (r && r.pass && pw0 >= 1.2 && !k.chain) { k.chain = true; k.pw = Math.max(0.6, k.pw - 0.45); k.vx *= 0.6; k.vy *= 0.6; k.flash = 0.06; }   /* 2026-10-12 (đường đèo): cú mạnh phá đổ vật đầu tiên → bay xuyên qua, yếu đi, đập tiếp vật sau */
        else { k.wall = true; k.vx = -k.vx * 0.15; k.vy = -k.vy * 0.15; k.vz = Math.min(k.vz, 0); k.spinSp *= 0.3; k.flash = 0.06; }
      }
      if (k.z <= 0 && k.vz < 0) {   /* chạm đất */
        if (k.T.bounce && !k.bounced) { k.bounced = true; k.vz = k.T.bounce; k.vx *= 0.4; k.vy *= 0.4; ctx.sfx('knock_land'); if (ctx.quake) ctx.quake(0.1); fx(ctx, 'knock_land', p.x, p.y + 2, false); }
        else {
          k.air = false; k.z = 0; k.ang = 0; k.down = k.t; if (ctx.arenaImpact) ctx.arenaImpact(p.x, p.y, k.heavy ? 1.2 : 0.8, 'land'); ctx.sfx('knock_land'); if (ctx.quake) ctx.quake(0.1); if (k.onLand) { try { k.onLand(p.x, p.y); } catch (e) { console.error('knock onLand', e); } }
          if (!k.bounced) fx(ctx, 'knock_land', p.x, p.y + 2, false); if (!k.T.skid) { k.vx *= 0.2; k.vy *= 0.2; }
        }
      }
      return;
    }
    const f = Math.exp(-k.T.fric * dt); k.vx *= f; k.vy *= f;   /* trượt ngã / lảo đảo */
    const sp = Math.hypot(k.vx, k.vy);
    if (sp > 6) { if (moveGround(ctx, k, k.vx * dt, k.vy * dt)) { k.vx = 0; k.vy = 0; if (!k.wall && sp > 60) { k.wall = true; ctx.sfx('knock_wall'); fx(ctx, 'knock_wall', p.x + k.ux * 6, p.y + 4, true); if (ctx.arenaImpact) ctx.arenaImpact(p.x + k.ux * 10, p.y + k.uy * 6, 1, 'wall'); } } else if (k.T.skid && Math.random() < dt * 14) fx(ctx, 'footstep_dust', p.x, p.y + 1, false); }
    const needT = k.down >= 0 ? k.down + DOWN_T : k.T.minT;   /* ngã → đợi clip đứng dậy xong */
    if (k.t >= needT && sp <= 6) end(ctx, false);
    else if (k.t > 3) end(ctx, false);
  },
  drawables(ctx, cx, cy) {   /* sao quay trên đầu ~1 s sau cú nặng nhất (sheet PixelLab knock_dizzy) */
    const d = ST.dizzy, sh = ART.vfx && ART.vfx.knock_dizzy; if (!d || !sh) return [];
    const p = p_(ctx), g = ctx.g;
    return [{ y: p.y + 0.5, f: () => { const f = Math.floor(d.t * (sh.fps || 12)) % sh.n, hi = sh.img.__hi ? 1 : 2; g.globalAlpha = Math.min(1, (d.dur - d.t) * 4); g.drawImage(sh.img, f * sh.w * hi, 0, sh.w * hi, sh.h * hi, Math.round(p.x - cx - sh.w / 2), Math.round(p.y - cy - 24 - sh.h / 2), sh.w, sh.h); g.globalAlpha = 1; } }];
  },
};
