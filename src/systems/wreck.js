// wreck.js — plan-23 (anh duyệt 2026-10-10): ban đêm quái PHÁ LÀNG, ban ngày DÂN TỰ SỬA.
//  · Đêm: monsters.js giao ~1/3 quái vai 'wreck' → hỏi ctx.wreck.pick(mo) → đập (ctx.wreck.hit) từng đòn.
//    Mục tiêu: công trình khu quốc gia (tường/rào/cột, bảng, đèn, đình/bệ thờ, đài phun) + bù nhìn + rào/cổng chuồng của người chơi
//    (ruộng: quái giẫm nát — monsters.js gọi ctx.farmSteal không lấy đồ). 2 mức hình: hư hỏng (máu ≤ ½) → đổ nát (hết máu), ảnh PixelLab manifest.ruins.
//    Giới hạn mỗi đêm mỗi vùng: CAP món đổ nát; tối đa 2 dân chết / đêm / vùng (dân "sắp chết" ngồi bị thương tới sáng).
//  · Ngày (7:00–18:00): 1 dân rảnh nhận việc: đi đào đá Seismic → tới Thương nhân đổi vật liệu → về gõ búa sửa món đổ nát gần nhất.
//    Mỗi dân 1 việc / ngày. Người chơi vẫn tự sửa ngay được (bảng Khu cho công trình; E vào đồ của mình = 2 gỗ).
//  · Vắng mặt: vào lại vùng sau N đêm (tối đa 2) → mỗi đêm vắng đổ nát ½ CAP món ngẫu nhiên, báo 1 dòng.
// Lưu: save.sys.wreck = { night: { zid: { d, n, deaths } }, own: { zid: { 'type@x,y': hp } }, seen: { zid: dayIndex }, fixed: { zid: { npcId: day } } }

const CAP = { village: 3, sea: 0, m1: 3, m2: 4, m3: 4, m4: 5, m5: 5, m6: 6, m7: 7, m8: 7, m9: 8 };
const PIECES = ['wall', 'corner', 'board', 'light', 'house', 'fountain'];
const OWN_MAX = { scarecrow: 4, pen_gate: 3 };
const ST = { ctx: null, applied: false, alertT: -99, hitting: new Map(), job: null, jobCd: 6, offline: 0 };
const vi = ctx => ctx.lang() === 'vi';
const L = ctx => (vi(ctx) ? {
  wreck: w => `Quái đang phá ${w}!`, own: 'đồ của bạn', area: n => `Khu ${n}`, village: 'làng',
  away: n => `Đêm qua quái phá ${n} món trong vùng — dân làng sẽ dần sửa lại`, fixE: 'Sửa (2 gỗ)', needWood: 'Cần 2 gỗ để sửa',
  dig: 'Đi kiếm đá Seismic…', buy: 'Đổi vật liệu đây!', hammer: 'Để tôi sửa!', done: 'Sửa xong rồi!', fixed: (n, w) => `${n} đã sửa xong ${w}`,
  things: { wall: 'tường rào', corner: 'cột góc', board: 'bảng tin', light: 'đèn', house: 'đình', fountain: 'đài phun nước', scarecrow: 'bù nhìn', pen: 'rào chuồng' },
} : {
  wreck: w => `Monsters are wrecking ${w}!`, own: 'your things', area: n => `the ${n} district`, village: 'the village',
  away: n => `Last night monsters wrecked ${n} things here — the villagers will slowly fix them`, fixE: 'Repair (2 wood)', needWood: 'Needs 2 wood to repair',
  dig: 'Off to find Seismic stones…', buy: 'Trading for materials!', hammer: 'Let me fix this!', done: 'All fixed!', fixed: (n, w) => `${n} repaired the ${w}`,
  things: { wall: 'fence', corner: 'corner post', board: 'notice board', light: 'lamp', house: 'pavilion', fountain: 'fountain', scarecrow: 'scarecrow', pen: 'pen fence' },
});
const zid = ctx => (ctx.S.zone && ctx.S.zone.id) || '';
const day = ctx => (ctx.clock ? ctx.clock.dayIndex : 0);
const hour = ctx => (ctx.clock ? ctx.clock.hour : 12);
const isNight = ctx => !!(ctx.clock && ctx.clock.isNight && ctx.clock.isNight()) || hour(ctx) < 6;
function sv(ctx) { const s = ctx.S.save; s.sys = s.sys || {}; const w = (s.sys.wreck ||= {}); w.night ||= {}; w.own ||= {}; w.seen ||= {}; w.fixed ||= {}; return w; }
function nightState(ctx) {   /* đêm hiện tại = ngày của 19:00 (sau nửa đêm vẫn tính đêm hôm trước) */
  const w = sv(ctx), d = hour(ctx) < 6 ? day(ctx) - 1 : day(ctx), z = zid(ctx);
  if (!w.night[z] || w.night[z].d !== d) w.night[z] = { d, n: 0, deaths: 0 };
  return w.night[z];
}
const keyOf = o => `${o.orig || o.type}@${o.x},${o.y}`;
const isOwn = o => o.type === 'scarecrow' || (o.pens && /fence|pen_gate/.test(o.orig || o.type));
const ownMax = o => OWN_MAX[o.orig || o.type] || 3;
export const maxOf = (ctx, o) => (o.plot !== undefined ? ctx.hpMax(o) : ownMax(o));
const kindOf = o => (o.plot !== undefined ? o.piece : o.type === 'scarecrow' ? 'scarecrow' : 'pen');
const center = o => ({ x: o.x * 16 + 8, y: o.y * 16 + 14 });
function targets(ctx) {
  return ctx.S.map.objects.filter(o => !o.ruined && !o.rkMax && !o.ghost && ((o.plot !== undefined && PIECES.includes(o.piece)) || isOwn(o)));
}
function ruinOwn(ctx, o) {
  o.ruined = true; o.hp = 0; o.orig = o.orig || o.type;
  const d = ctx.O && ctx.O[o.type]; if (d && d.solid) for (let j = 0; j < d.fh; j++) for (let i = 0; i < d.fw; i++) ctx.setSolid(ctx.S.map, o.x + i, o.y + j, 0);
}
function restoreOwn(ctx, o) {
  o.ruined = false; o.hp = ownMax(o);
  const d = ctx.O && ctx.O[o.type]; if (d && d.solid) for (let j = 0; j < d.fh; j++) for (let i = 0; i < d.fw; i++) ctx.setSolid(ctx.S.map, o.x + i, o.y + j, 1);
}
function saveOwn(ctx, o) { const w = sv(ctx), z = zid(ctx); (w.own[z] ||= {}); if (o.hp >= ownMax(o)) delete w.own[z][keyOf(o)]; else w.own[z][keyOf(o)] = o.hp; ctx.persist(); }
function nationName(ctx, o) { const p = ctx.S.map.plots && ctx.S.map.plots[o.plot]; return p && (p.name || p.nation || p.key) || ''; }
/* đập 1 đòn; trả true nếu món vừa đổ nát */
function hit(ctx, o, mo) {
  if (o.ruined) return true;
  const ns = nightState(ctx), cap = CAP[zid(ctx)] || 0; if (ns.n >= cap) return true;
  let down;
  if (o.plot !== undefined) down = ctx.damage(o, 1);
  else { o.hp = (o.hp ?? ownMax(o)) - 1; down = o.hp <= 0; if (down) ruinOwn(ctx, o); saveOwn(ctx, o); }
  ST.hitting.set(o, ctx.S.time);
  const c = center(o); if (ctx.vfx) ctx.vfx('dirt_puff', c.x, c.y - 2); ctx.sfx(down ? 'collapse' : 'smash');
  if (ctx.S.time - ST.alertT > 25) {
    ST.alertT = ctx.S.time; const t = L(ctx), nn = o.plot !== undefined ? nationName(ctx, o) : '';
    ctx.toast(t.wreck(isOwn(o) ? t.own : nn ? t.area(nn) : t.village), true); ctx.sfx('alarm');
  }
  if (down) { ns.n++; ctx.persist(); }
  return down;
}
function pick(ctx, mo) {
  const ns = nightState(ctx); if (ns.n >= (CAP[zid(ctx)] || 0)) return null;
  let best = null, bd = 560;
  for (const o of targets(ctx)) {
    const taken = (ctx.monsters ? ctx.monsters.list() : []).filter(m => m !== mo && m.goal && m.goal.o === o).length; if (taken >= 2) continue;
    const c = center(o), d = Math.hypot(c.x - mo.x, c.y - mo.y) * (isOwn(o) ? 0.8 : 1); if (d < bd) { bd = d; best = o; }
  }
  return best;
}
/* dân chết: tối đa 2 / đêm / vùng */
function allowDeath(ctx) { return nightState(ctx).deaths < 2; }
function noteDeath(ctx) { nightState(ctx).deaths++; ctx.persist(); }
/* áp trạng thái đồ của người chơi + mô phỏng đêm vắng mặt (gọi 1 lần sau khi mọi hệ đã đặt vật xong) */
function apply(ctx) {
  const w = sv(ctx), z = zid(ctx), own = w.own[z] || {};
  for (const o of ctx.S.map.objects) { if (!isOwn(o)) continue; const hp = own[keyOf(o)]; if (hp != null) { o.hp = hp; if (hp <= 0) ruinOwn(ctx, o); } }
  const today = day(ctx), last = w.seen[z]; w.seen[z] = today;
  const cap = CAP[z] || 0;
  if (last != null && today > last && cap && ctx.S.npcs.length) {
    const nights = Math.min(2, today - last), want = nights * Math.floor(cap / 2); let n = 0;
    const pool = targets(ctx).filter(o => o.plot !== undefined || isOwn(o)).sort(() => Math.random() - 0.5);
    for (const o of pool) { if (n >= want) break; if (o.plot !== undefined) { while (!o.ruined && !ctx.damage(o, 1)) { /* đập tới đổ */ } } else { ruinOwn(ctx, o); saveOwn(ctx, o); } n++; }
    if (n) setTimeout(() => ctx.toast(L(ctx).away(n)), 1600);
  }
  ctx.persist();
}
// ---------------------------------------------------------------- dân tự sửa (ban ngày)
function ruinedList(ctx) { return ctx.S.map.objects.filter(o => o.ruined && !o.rkRuin && ((o.plot !== undefined && PIECES.includes(o.piece)) || isOwn(o))); }
function walkTo(ctx, n, x, y) {
  const p = ctx.pathTo(Math.floor(n.x / 16), Math.floor(n.y / 16), Math.floor(x / 16), Math.floor(y / 16), 10);
  n.busy = false; n.goal = null; n.speedMul = 1.7; n.path = p ? p.reverse() : [{ x, y }];   /* đang làm việc → đi nhanh hơn */
}
const arrived = (n, x, y) => !n.goal && !(n.path && n.path.length) && Math.hypot(n.x - x, n.y - y) < 40;
function startJob(ctx) {
  const list = ruinedList(ctx); if (!list.length) return;
  const w = sv(ctx), z = zid(ctx), done = (w.fixed[z] ||= {}), today = day(ctx);
  const free = ctx.villagers ? ctx.villagers.alive().filter(n => !n.hurtSit && !n.attacker && done[n.m.id] !== today) : []; if (!free.length) return;
  const o = list[0], c = center(o); free.sort((a, b) => Math.hypot(a.x - c.x, a.y - c.y) - Math.hypot(b.x - c.x, b.y - c.y));
  const n = free[0];
  const node = ctx.S.map.objects.filter(q => /seisvein|orevein|^ore|rock_s|boulder/.test(q.type) && !q.ghost).sort((a, b) => Math.hypot(a.x * 16 - n.x, a.y * 16 - n.y) - Math.hypot(b.x * 16 - n.x, b.y * 16 - n.y))[0];
  const dig = node ? { x: node.x * 16 + 8, y: node.y * 16 + 26 } : { x: n.x + 40, y: n.y };
  ST.job = { n, o, step: 'dig', t: 0, dig };
  walkTo(ctx, n, dig.x, dig.y); ctx.bubble(n, L(ctx).dig, 3);
}
function tickJob(ctx, dt) {
  const j = ST.job, t = L(ctx); if (!j) return;
  const n = j.n;
  if (!ctx.S.npcs.includes(n) || n.hurtSit || isNight(ctx)) { n.busy = false; ST.job = null; return; }
  if (!j.o.ruined) { n.busy = false; ST.job = null; return; }   /* người chơi sửa trước rồi */
  const trader = (ctx.S.staff || []).find(s => s.m.staff === 'trader');
  if (j.step === 'dig') {
    if (!arrived(n, j.dig.x, j.dig.y) && (j.t += dt) < 18) return;
    n.busy = true; n.faceTo(j.dig.x, j.dig.y - 10); j.work = (j.work || 0) + dt;
    if (Math.floor(j.work * 2) !== Math.floor((j.work - dt) * 2)) { if (n.hasAct && n.hasAct('mine')) n.act('mine', 0.4); if (ctx.vfx) ctx.vfx('dirt_puff', j.dig.x, j.dig.y - 8); ctx.sfx('dig'); }
    if (j.work > 4) { j.step = trader ? 'buy' : 'go'; j.t = 0; j.work = 0; if (ctx.pop) ctx.pop(n.x, n.y - 24, '+2 Seismic', '#9fe0ff'); if (trader) walkTo(ctx, n, trader.x, trader.y + 14); else { const c = center(j.o); walkTo(ctx, n, c.x, c.y + 14); } }
  } else if (j.step === 'buy') {
    if (!arrived(n, trader.x, trader.y + 14) && (j.t += dt) < 18) return;
    n.busy = true; j.work = (j.work || 0) + dt;
    if (j.work < dt * 1.5) { ctx.bubble(n, t.buy, 2); ctx.bubble(trader, vi(ctx) ? 'Của bạn đây!' : 'Here you go!', 2); }
    if (j.work > 2.2) { j.step = 'go'; j.t = 0; j.work = 0; const c = center(j.o); walkTo(ctx, n, c.x, c.y + 14); }
  } else if (j.step === 'go') {
    const c = center(j.o);
    if (!arrived(n, c.x, c.y + 14) && (j.t += dt) < 18) return;
    n.busy = true; n.faceTo(c.x, c.y); j.work = (j.work || 0) + dt;
    if (j.work < dt * 1.5) ctx.bubble(n, t.hammer, 2);
    if (Math.floor(j.work * 2.5) !== Math.floor((j.work - dt) * 2.5)) { if (n.hasAct && n.hasAct('hammer')) n.act('hammer', 0.35); ctx.sfx('hammer'); if (ctx.vfx) ctx.vfx('dirt_puff', c.x, c.y); }
    if (j.work > 3) {
      if (j.o.plot !== undefined) ctx.repair(j.o); else { restoreOwn(ctx, j.o); saveOwn(ctx, j.o); }
      const w = sv(ctx), z = zid(ctx); (w.fixed[z] ||= {})[n.m.id] = day(ctx);
      ctx.bubble(n, t.done, 2.5); ctx.toast(t.fixed(n.m.k || n.m.n || n.m.id, t.things[kindOf(j.o)] || ''));
      if (ctx.vfx) ctx.vfx('sparkle', c.x, c.y - 6); n.busy = false; n.speedMul = 1; ST.job = null; ST.jobCd = 20; ctx.persist();
    }
  }
}

export const wreck = {
  id: 'wreck',
  onZoneEnter(ctx) {
    ST.ctx = ctx; ST.applied = false; ST.hitting.clear(); if (ST.job) ST.job.n.busy = false; ST.job = null; ST.jobCd = 6;
    ctx.wreck = { pick: mo => pick(ctx, mo), hit: (o, mo) => hit(ctx, o, mo), can: () => nightState(ctx).n < (CAP[zid(ctx)] || 0), allowDeath: () => allowDeath(ctx), noteDeath: () => noteDeath(ctx), maxOf: o => maxOf(ctx, o), center };
    if (typeof window !== 'undefined') window.__wreck = {
      state: () => ({ night: nightState(ctx), ruined: ruinedList(ctx).length, targets: targets(ctx).length, job: ST.job && { step: ST.job.step, who: ST.job.n.m.id } }),
      smash: (n = 1) => { let k = 0; for (const o of targets(ctx)) { if (k >= n) break; while (!o.ruined) { if (o.plot !== undefined) ctx.damage(o, 1); else { o.hp = (o.hp ?? ownMax(o)) - 1; if (o.hp <= 0) ruinOwn(ctx, o); saveOwn(ctx, o); } } k++; } return ruinedList(ctx).length; },
      dent: () => { const o = targets(ctx)[0]; if (!o) return null; if (o.plot !== undefined) ctx.damage(o, Math.ceil(ctx.hpMax(o) / 2)); return { x: o.x, y: o.y, hp: o.hp }; },
      job: () => { ST.jobCd = 0; ST.job = null; startJob(ctx); return !!ST.job; },
      cap: () => CAP[zid(ctx)] || 0,
    };
  },
  onZoneLeave() { if (ST.job) ST.job.n.busy = false; ST.job = null; },
  update(dt, ctx) {
    if (!ctx.S.map || ctx.S.mode !== 'play') return;
    if (!ST.applied) { ST.applied = true; try { apply(ctx); } catch (e) { console.error('wreck apply', e); } }
    if (!isNight(ctx) && hour(ctx) >= 7 && hour(ctx) < 18) { if (ST.job) tickJob(ctx, dt); else if ((ST.jobCd -= dt) <= 0) { ST.jobCd = 8; startJob(ctx); } }
    else if (ST.job) { ST.job.n.busy = false; ST.job = null; }
  },
  near(ctx) {   /* E vào đồ của mình đã hư → sửa bằng 2 gỗ */
    const p = ctx.S.player; let best = null, bd = 26;
    for (const o of ctx.S.map.objects) { if (!isOwn(o) || !(o.ruined || (o.hp != null && o.hp < ownMax(o)))) continue; const c = center(o), d = Math.hypot(c.x - p.x, c.y - p.y); if (d < bd) { bd = d; best = o; } }
    return best ? { label: L(ctx).fixE, x: center(best).x, y: center(best).y, limit: 26, priority: 2, data: best } : null;
  },
  interact(ctx, cand) {
    const o = cand && cand.data; if (!o) return;
    if (!ctx.bag.has('wood', 2)) { ctx.toast(L(ctx).needWood); return; }
    ctx.bag.remove('wood', 2); restoreOwn(ctx, o); saveOwn(ctx, o); ctx.sfx('build'); if (ctx.vfx) ctx.vfx('sparkle', center(o).x, center(o).y - 6);
  },
  drawUI(ug, ctx, cx, cy, scale) {   /* icon cảnh báo nhấp nháy trên món đang bị đập (3 s sau đòn cuối) */
    const now = ctx.S.time; if (!ST.hitting.size || Math.floor(now * 4) % 2) return;
    const ic = ctx.ART && ctx.ART.man && ctx.ART.man.ui && ctx.ART.man.ui.alert && ctx.ART.uiImg ? ctx.ART.uiImg('alert') : null;
    for (const [o, t] of ST.hitting) {
      if (now - t > 3 || o.ruined) { ST.hitting.delete(o); continue; }
      const c = center(o), sx = Math.round((c.x - cx) * scale), sy = Math.round((o.y * 16 - 14 - cy) * scale), s = Math.round(8 * scale);
      if (ic) ug.drawImage(ic, sx - s / 2, sy - s, s, s);
      else { ug.fillStyle = '#352022'; ug.fillRect(sx - s / 4 - 2, sy - s - 2, s / 2 + 4, s + 4); ug.fillStyle = '#ff4b3a'; ug.fillRect(sx - s / 4, sy - s, s / 2, s * 0.65); ug.fillRect(sx - s / 4, sy - s * 0.25, s / 2, s * 0.2); }
    }
  },
};
