// swim.js — plan-15: nước nông (lội) / nước sâu (bơi, thanh sức 15 s) / kiệt sức nổi như người chết đuối → tàu chở NPC tới cứu,
// đưa về khu (plot) của nước người cứu trong vùng (biển: về bến). Người cứu = NPC của nước anh hay trò chuyện nhất (save.talks), không có → ngẫu nhiên.
// Ô: T.WATER = nông (đi được, ngập tới hông), T.DEEP = sâu (bơi). Không hình phạt. Phím T: thả thú đang cầm xuống nước (chỉ cá/cua/kỳ nhông).
import { HOOK } from '../gfx.js';
import { getCarry, removeCarry, catOf } from './animals.js';
import * as UI from '../ui.js';

const STR = {
  en: { wade: 'Wading', swim: 'Swimming', stam: 'Stamina', tired: 'You are exhausted… you float like driftwood', boat: n => `A boat is coming — ${n} spotted you!`,
        saved: (flag, n, nat) => `${flag} ${n} pulled you out and brought you to the ${nat} district`, savedDock: (flag, n) => `${flag} ${n} pulled you out and rowed you to the pier`,
        say: ['Breathe! You are safe now.', 'Next time stay near the shore!', 'Got you. The sea does not forgive.', 'Rest a bit before you swim again.'],
        release: 'Release into the water', released: k => `${k} swims away 🐟`, noSwim: 'That one cannot swim — keep it on land', low: 'Low stamina — head back to shore!' },
  vi: { wade: 'Đang lội', swim: 'Đang bơi', stam: 'Sức bơi', tired: 'Bạn kiệt sức… nổi lềnh bềnh như khúc gỗ', boat: n => `Có tàu đang tới — ${n} thấy bạn rồi!`,
        saved: (flag, n, nat) => `${flag} ${n} đã kéo bạn lên và đưa về khu ${nat}`, savedDock: (flag, n) => `${flag} ${n} đã kéo bạn lên và chèo về bến`,
        say: ['Thở đi! An toàn rồi.', 'Lần sau đừng bơi xa bờ thế!', 'Bắt được bạn rồi. Biển không tha ai đâu.', 'Nghỉ chút rồi hãy bơi tiếp.'],
        release: 'Thả xuống nước', released: k => `${k} bơi đi mất 🐟`, noSwim: 'Con này không biết bơi — giữ trên bờ', low: 'Sắp hết sức — quay vào bờ!' }
};
const L = ctx => STR[ctx.lang() === 'vi' ? 'vi' : 'en'];
const STAM_MAX = 15, REGEN = STAM_MAX / 4, DROWN_SECS = 1.6, BOAT_SPEED = 70;
const st = { mode: 'none', stam: STAM_MAX, t: 0, rescue: null, ripT: 0, warned: false, prevCustom: undefined, ownCustom: null, fx: [] };
const tileOf = v => Math.floor(v / 16);
const tileAt = (ctx, x, y) => ctx.getG(ctx.S.map, tileOf(x), tileOf(y));
const isShallow = (ctx, t) => t === ctx.T.WATER;
const isDeep = (ctx, t) => t === ctx.T.DEEP;
/* Nông thật = ô WATER có đất trong bán kính 2 ô (vòng cạn quanh đảo/bờ); WATER xa bờ (biển khơi) = sâu như DEEP */
function nearLand(ctx, tx, ty, r = 2) {
  const m = ctx.S.map;
  for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { const g0 = ctx.getG(m, tx + dx, ty + dy); if (g0 !== undefined && !isShallow(ctx, g0) && !isDeep(ctx, g0) && g0 !== ctx.T.REEF && g0 !== ctx.T.NONE) return true; }
  return false;
}
function depthAt(ctx, x, y) {   /* 'none' | 'wade' | 'swim' */
  const tx = tileOf(x), ty = tileOf(y), g0 = ctx.getG(ctx.S.map, tx, ty);
  if (isDeep(ctx, g0)) return 'swim';
  if (isShallow(ctx, g0) || g0 === ctx.T.REEF) return nearLand(ctx, tx, ty) ? 'wade' : 'swim';
  return 'none';
}
const busy = ctx => { const s = ctx.S.sea; return !!(s && (s.riding || s.diving)) || (ctx.S.player.custom && ctx.S.player.custom !== st.ownCustom) || ctx.S.player.pilot === 'rocky'; };

// ---------------------------------------------------------------- vẽ người chơi dưới nước
function ripple(ctx, x, y, r = 6) { st.fx.push({ x, y, r, t: 0 }); }
function drawInWater(g, ent, depth) {   // depth: 6 (lội) | 11 (bơi) hàng px dưới bị nước che
  const x = Math.round(ent.x), y = Math.round(ent.y), t = performance.now() / 1000, bob = depth > 8 ? Math.round(Math.sin(t * 3) * 1) : 0;
  const h = 20 - depth;
  g.fillStyle = 'rgba(20,80,120,.28)'; g.beginPath(); g.ellipse(x, y - 18 + h + bob + 1, 9, 3.5, 0, 0, Math.PI * 2); g.fill();   /* bóng ngay dưới mép nước */
  g.drawImage(ent.sheet, ent.frame * 16, ent.dir * 20, 16, h, x - 8, y - 18 + bob, 16, h);
  g.fillStyle = 'rgba(230,246,255,.8)';
  for (let i = -7; i <= 7; i += 3) { const w = Math.sin(t * 4 + i) * 1; g.fillRect(x + i, y - 18 + h + bob + Math.round(w), 2, 1); }   // mép nước lượn
  if (depth > 8 && ent.moving) { const k = Math.floor(t * 8) % 2; g.fillStyle = 'rgba(255,255,255,.85)'; g.fillRect(x - 10 + k * 2, y - 12 + bob, 3, 1); g.fillRect(x + 8 - k * 2, y - 11 + bob, 3, 1); }   // tay quạt nước
}
function drawDrowned(g, ent) {   // nổi ngửa: sheet hướng nam, xoay 90°, nhấp nhô
  const x = Math.round(ent.x), y = Math.round(ent.y), t = performance.now() / 1000, bob = Math.sin(t * 2.2) * 1.2;
  g.fillStyle = 'rgba(20,80,120,.3)'; g.beginPath(); g.ellipse(x, y, 14, 4, 0, 0, Math.PI * 2); g.fill();
  g.save(); g.translate(x, y - 4 + bob); g.rotate(Math.PI / 2 + Math.sin(t * 1.3) * 0.08); g.globalAlpha = 0.92; g.drawImage(ent.sheet, 0, 0, 16, 20, -8, -10, 16, 20); g.restore();
  g.fillStyle = 'rgba(230,246,255,.8)'; for (let i = -12; i <= 12; i += 4) g.fillRect(x + i, y - 3 + Math.round(Math.sin(t * 3 + i) * 1), 2, 1);
}
/* người chơi được đi vào ô DEEP (bơi) — chỉ đặt p.passable khi không module nào khác đang giữ */
function setPass(ctx, on) {
  const p = ctx.S.player;
  if (on) { if (p.passable && p.passable !== st.ownPass) return; if (!st.ownPass) st.ownPass = (m, tx, ty) => { const g0 = ctx.getG(m, tx, ty); return !ctx.isSolid(m, tx, ty) || isDeep(ctx, g0) || isShallow(ctx, g0) || g0 === ctx.T.REEF; }; p.passable = st.ownPass; }
  else if (p.passable === st.ownPass) { p.passable = null; }
}
function setCustom(ctx, fn) {
  const p = ctx.S.player;
  if (fn) { if (p.custom && p.custom !== st.ownCustom) return; st.ownCustom = fn; p.custom = fn; }
  else if (p.custom === st.ownCustom) { p.custom = null; st.ownCustom = null; }
}

// ---------------------------------------------------------------- cứu hộ
function nationKey(ctx, m) { const n = ctx.nationOf(m); return n ? n.key : null; }
function pickRescuer(ctx) {
  const S = ctx.S, cands = S.npcs.filter(n => n.m && !n.m.guide && !n.m.friend);
  if (!cands.length) return null;
  const talks = (S.save.talks || {}); const best = Object.entries(talks).sort((a, b) => b[1] - a[1])[0];
  if (best && best[1] >= 2) { const same = cands.filter(n => nationKey(ctx, n.m) === best[0]); if (same.length) return same[Math.floor(Math.random() * same.length)]; }
  return cands[Math.floor(Math.random() * cands.length)];
}
function waterEdgeSpawn(ctx, p) {   // điểm xuất phát của tàu: ô nước sâu xa người chơi nhất về phía mép bản đồ (cùng hàng), không có → mép phải
  const m = ctx.S.map, ty = Math.max(0, Math.min(m.h - 1, tileOf(p.y))), tx0 = tileOf(p.x); let bx = null;
  for (let x = m.w - 1; x >= 0; x--) if (isDeep(ctx, ctx.getG(m, x, ty)) || isShallow(ctx, ctx.getG(m, x, ty))) { bx = x; break; }
  if (bx === null || Math.abs(bx - tx0) < 6) bx = Math.min(m.w - 1, tx0 + 14);
  return { x: bx * 16 + 8, y: ty * 16 + 8 };
}
function homeSpot(ctx, key) {   // về khu của nước người cứu; biển → bến; không có plot → ô đất gần bờ nhất
  const m = ctx.S.map, p = ctx.S.player;
  if (m.sea && m.dock) return { x: m.dock.x * 16 + 8, y: (m.dock.y - 1) * 16 + 8, where: 'dock' };
  const plot = (m.plots || []).find(pl => pl.nation === key);
  if (plot && plot.spawn) {
    const s = plot.spawn; for (let k = 0; k < 40; k++) { const tx = s.x + Math.floor(Math.random() * s.w), ty = s.y + Math.floor(Math.random() * s.h); if (!ctx.isSolid(m, tx, ty)) return { x: tx * 16 + 8, y: ty * 16 + 12, where: 'plot' }; }
  }
  let best = null, bd = 1e9; const tx0 = tileOf(p.x), ty0 = tileOf(p.y);
  for (let r = 1; r < 40 && !best; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    const tx = tx0 + dx, ty = ty0 + dy, g0 = ctx.getG(m, tx, ty); if (g0 === undefined || ctx.isSolid(m, tx, ty) || isShallow(ctx, g0) || isDeep(ctx, g0)) continue;
    const d = dx * dx + dy * dy; if (d < bd) { bd = d; best = { x: tx * 16 + 8, y: ty * 16 + 12, where: 'shore' }; }
  }
  return best || { x: p.x, y: p.y, where: 'shore' };
}
function startRescue(ctx) {
  const p = ctx.S.player, n = pickRescuer(ctx), from = waterEdgeSpawn(ctx, p);
  st.mode = 'rescue'; st.rescue = { n, x: from.x, y: from.y, dir: from.x > p.x ? -1 : 1, phase: 'come', t: 0, fade: 0 };
  ctx.toast(L(ctx).boat(n ? n.m.n : '???'));
}
function finishRescue(ctx) {
  const S = ctx.S, p = S.player, r = st.rescue, n = r.n, t = L(ctx);
  const key = n ? nationKey(ctx, n.m) : null, nat = n ? ctx.nationOf(n.m) : null, spot = homeSpot(ctx, key);
  p.x = spot.x; p.y = spot.y; p.dir = 0; p.speedMul = 1; setCustom(ctx, null);
  if (n) {
    if (!S.save.met.includes(n.m.id)) S.save.met.push(n.m.id);
    n.x = p.x + 18; n.y = p.y; n.dir = 1;   /* người cứu đứng cạnh, nói một câu */
    UI.bubble(n, t.say[Math.floor(Math.random() * t.say.length)], 3.5);
    const flag = nat ? nat.flag : '🚣', name = n.m.n;
    ctx.toast(spot.where === 'dock' ? t.savedDock(flag, name) : t.saved(flag, name, nat ? nat.name : '?'), true);
  }
  st.stam = STAM_MAX; st.mode = 'none'; st.rescue = null; st.warned = false; ctx.sfx('win'); ctx.persist();
}

// ---------------------------------------------------------------- hệ thống
export const swim = {
  id: 'swim',
  onZoneEnter(ctx) {
    st.mode = 'none'; st.rescue = null; st.fx = []; st.ownCustom = null; st.ownPass = null; ctx.S.swimming = false;
    if (typeof window !== 'undefined') window.__swim = { state: () => ({ mode: st.mode, stam: +st.stam.toFixed(2), rescue: st.rescue && { phase: st.rescue.phase, n: st.rescue.n && st.rescue.n.m.n, x: Math.round(st.rescue.x), y: Math.round(st.rescue.y) } }), drain: () => { st.stam = 0.01; }, talks: () => ctx.S.save.talks };
  },
  onZoneLeave(ctx) { setCustom(ctx, null); setPass(ctx, false); ctx.S.swimming = false; },
  update(dt, ctx) {
    const S = ctx.S, p = S.player, t = L(ctx); if (!S.map || S.mode === 'title') return;
    for (const f of st.fx) f.t += dt; st.fx = st.fx.filter(f => f.t < 0.6);
    if (st.mode === 'rescue') { S.swimming = true; rescueTick(dt, ctx); return; }
    if (busy(ctx)) { if (st.mode !== 'none') { st.mode = 'none'; setCustom(ctx, null); } setPass(ctx, false); S.swimming = false; st.stam = Math.min(STAM_MAX, st.stam + REGEN * dt); return; }
    setPass(ctx, true); S.swimming = st.mode === 'swim' || st.mode === 'drown';
    const want = st.mode === 'drown' ? 'drown' : depthAt(ctx, p.x, p.y + 2);
    if (want !== st.mode) {
      if (st.mode === 'none' && want !== 'none') { ripple(ctx, p.x, p.y, 8); ctx.sfx('splash'); }
      st.mode = want; st.t = 0;
      if (want === 'none') { p.speedMul = 1; setCustom(ctx, null); }
    }
    st.t += dt; st.ripT += dt;
    if (st.mode === 'wade') { p.speedMul = 0.65; setCustom(ctx, (g, e) => drawInWater(g, e, 6)); st.stam = Math.min(STAM_MAX, st.stam + REGEN * dt); if (p.moving && st.ripT > 0.35) { st.ripT = 0; ripple(ctx, p.x, p.y, 4); } }
    else if (st.mode === 'swim') {
      p.speedMul = 0.5; setCustom(ctx, (g, e) => drawInWater(g, e, 11)); st.stam -= dt;
      if (p.moving && st.ripT > 0.25) { st.ripT = 0; ripple(ctx, p.x, p.y, 5); }
      if (st.stam < STAM_MAX * 0.3 && !st.warned) { st.warned = true; ctx.toast(t.low); ctx.sfx('alarm'); }
      if (st.stam <= 0) { st.stam = 0; st.mode = 'drown'; st.t = 0; p.speedMul = 0; p.moving = false; setCustom(ctx, drawDrowned); ctx.toast(t.tired, true); ctx.sfx('fail'); }
    }
    else if (st.mode === 'drown') { p.speedMul = 0; if (st.t > DROWN_SECS) startRescue(ctx); }
    else { st.stam = Math.min(STAM_MAX, st.stam + REGEN * dt); if (st.stam >= STAM_MAX) st.warned = false; }
  },
  near(ctx) {   /* thả thú đang cầm xuống nước: đứng trong nước, có cá/cua/kỳ nhông trên tay */
    const S = ctx.S, p = S.player; if (st.mode === 'none' || st.mode === 'drown' || st.mode === 'rescue') return null;
    const c = getCarry(ctx); if (!c.length) return null;
    const i = c.map((it, k) => [it, k]).filter(([it]) => catOf(it.kind) === 'fish' || it.kind === 'crab')[0]; if (!i) return null;
    return { label: L(ctx).release, x: p.x, y: p.y, limit: 20, data: { idx: i[1], kind: i[0].kind } };
  },
  interact(ctx, cand) { const d = cand.data; const it = removeCarry(ctx, d.idx); if (!it) return; ripple(ctx, ctx.S.player.x + 10, ctx.S.player.y, 8); ctx.sfx('splash'); ctx.toast(L(ctx).released(ctx.itemName(it.kind))); },
  hudLines(ctx) { if (st.mode === 'swim' || st.mode === 'drown') return [`🏊 ${Math.ceil(st.stam)}s`]; if (st.mode === 'wade') return ['💧']; return []; },
  drawables(ctx, cx, cy) {
    const out = [], g = ctx.g;
    for (const f of st.fx) out.push({ y: f.y - 300, f: () => { const k = f.t / 0.6; g.strokeStyle = `rgba(230,246,255,${(0.7 * (1 - k)).toFixed(2)})`; g.lineWidth = 1; g.beginPath(); g.ellipse(f.x - cx, f.y - cy, f.r + k * 10, (f.r + k * 10) * 0.45, 0, 0, Math.PI * 2); g.stroke(); } });
    const r = st.rescue;
    if (r) out.push({ y: r.y + 6, f: () => drawBoat(g, ctx, r, cx, cy) });
    return out;
  },
  drawUI(ug, ctx, cx, cy, scale) {
    if (st.mode === 'none' && st.stam >= STAM_MAX) return;
    const t = L(ctx), w = 120, h = 10, x = 14, y = Math.round(scale * 24) + 12, k = st.stam / STAM_MAX;
    ug.fillStyle = 'rgba(13,11,20,.7)'; ug.fillRect(x - 2, y - 2, w + 4, h + 4); ug.fillStyle = '#2b2440'; ug.fillRect(x, y, w, h);
    ug.fillStyle = k < 0.3 ? '#ff6b84' : '#5cc9ee'; ug.fillRect(x, y, Math.round(w * k), h);
    ug.font = '13px VT323, monospace'; ug.fillStyle = '#f2ebe0'; ug.textAlign = 'left'; ug.textBaseline = 'bottom'; ug.fillText(`🏊 ${t.stam} ${Math.ceil(st.stam)}s · ${st.mode === 'swim' ? t.swim : st.mode === 'wade' ? t.wade : ''}`, x, y - 3);
    if (st.mode === 'rescue' && st.rescue && st.rescue.fade > 0) { ug.fillStyle = `rgba(0,0,0,${Math.min(1, st.rescue.fade).toFixed(2)})`; ug.fillRect(0, 0, ug.canvas.width, ug.canvas.height); }
    else if (st.mode === 'swim' && k < 0.3) { ug.fillStyle = `rgba(20,20,60,${((0.3 - k) * 1.5).toFixed(2)})`; ug.fillRect(0, 0, ug.canvas.width, ug.canvas.height); }
  },
  isSwimming: () => st.mode === 'swim' || st.mode === 'drown' || st.mode === 'rescue'
};
function rescueTick(dt, ctx) {
  const r = st.rescue, p = ctx.S.player; if (!r) { st.mode = 'none'; return; }
  r.t += dt;
  if (r.phase === 'come') {
    const dx = p.x - r.x, dy = p.y - r.y, d = Math.hypot(dx, dy);
    if (d > 14) { const sp = BOAT_SPEED * dt; r.x += dx / d * Math.min(sp, d); r.y += dy / d * Math.min(sp, d); r.dir = dx >= 0 ? 1 : -1; if (Math.random() < dt * 6) ripple(ctx, r.x - r.dir * 10, r.y + 4, 3); }
    else { r.phase = 'pull'; r.t = 0; ctx.sfx('splash'); }
  } else if (r.phase === 'pull') {
    if (r.t > 0.9) { r.phase = 'fade'; r.t = 0; }
  } else if (r.phase === 'fade') {
    r.fade = Math.min(1, r.t / 0.6);
    if (r.t > 0.9) { finishRescue(ctx); }
  }
}
function drawBoat(g, ctx, r, cx, cy) {
  const img = HOOK.images[r.dir < 0 ? 'boat_1_0' : 'boat_2_0'] || null, x = Math.round(r.x) - cx, y = Math.round(r.y) - cy, t = performance.now() / 1000, bob = Math.round(Math.sin(t * 2) * 1);
  g.fillStyle = 'rgba(20,60,110,.3)'; g.beginPath(); g.ellipse(x, y + 4, 16, 5, 0, 0, Math.PI * 2); g.fill();
  if (img) g.drawImage(img, x - 16, y - 12 + bob); else { g.fillStyle = '#7a4a22'; g.fillRect(x - 14, y - 6 + bob, 28, 10); }
  const n = r.n; if (n && n.sheet) g.drawImage(n.sheet, 0, (r.dir < 0 ? 1 : 2) * 20, 16, 20, x - 8 - r.dir * 2, y - 26 + bob, 16, 20);
  if (r.phase !== 'come') { g.fillStyle = 'rgba(255,255,255,.8)'; for (let i = 0; i < 3; i++) g.fillRect(x - 12 + i * 10 + Math.round(Math.sin(t * 5 + i) * 2), y + 2 + bob, 3, 1); }
}
