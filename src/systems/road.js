// road.js — plan-28 (anh duyệt 2026-10-12, mục 4 chọn A): ĐƯỜNG ĐÈO giữa các vùng (world.js buildRoad, zone road1…road9).
//  · Lần đầu đi LÊN: bạn tập cơ bắp đứng chắn trước CỔNG ĐÈO (đóng) giữa sân → bước vào sân là vào trận (spar.js qua ctx.sparRoad).
//    Thắng (đoạn 9: thắng lần lượt Lực Sĩ rồi Biker) → cổng mở vĩnh viễn (save.sys.road.won[road]). Thua → về chân đèo, hồi đầy máu, đánh lại được ngay.
//  · Đường THÔNG (không chặn) khi: đã thắng; HOẶC đã từng tới vùng phía trên / có huy hiệu ≥ vùng trên (save cũ — bài học 2026-09-22: không bao giờ kẹt);
//    HOẶC đi từ trên xuống (entry 'back'). Khi thông: bạn tập đứng bên lề sân, lại gần bấm E để thách đấu kiếm đồ.
//  · Bạn tập bị hạ → vắng 60 s (save.sys.road.cd[id] = mốc giờ thật) rồi đứng lại bên lề. Chỉ lần thắng đầu mới mở đường; đánh lại vẫn rơi đồ + Ngọc Rồng (roadloot.js).
//  · Hệ này chạy ở MỌI vùng (vùng không giới hạn systems): ghi vùng M cao nhất đã tới (save.sys.road.maxZ) để biết đường nào đã thông.
// Lưu: save.sys.road = { won: { road1: true }, beat: { road9: ['lucsi'] }, cd: { caro: <ms> }, maxZ: 3, balls: [7, 6] }.
const RESPAWN_MS = 60000;
const ROAD_LV = [0, 2, 3, 5, 6, 8, 10, 12, 14, 16];   /* cấp nhân vật dự kiến khi tới đoạn i (bạn tập mạnh theo cấp vùng) */
const ROAD_SWORD = [0, 1, 1, 2, 2, 3, 3, 4, 4, 5];   /* cấp kiếm dự kiến */
const ST = { ctx: null, info: null, armed: true, next: 0, t: 0 };
const vi = ctx => ctx.lang() === 'vi';
const L = ctx => (vi(ctx) ? {
  block: n => `${n} chặn cổng đèo — bước vào sân để đấu!`, open: '🚪 Cổng đèo đã mở! Đường lên vùng trên thông rồi.', lost: 'Bạn bị đánh văng xuống chân đèo — đã hồi đầy máu. Thử lại nhé!',
  next: n => `Còn ${n}! Chuẩn bị…`, dare: n => `🥊 Thách đấu ${n} (thắng có thưởng)`, back: n => `${n} sẽ quay lại sau ít phút`, gateTip: 'Cổng đèo đóng — thắng bạn tập để mở',
} : {
  block: n => `${n} blocks the pass gate — step into the clearing to fight!`, open: '🚪 The pass gate is open! The way up is clear.', lost: 'You got knocked back down the pass — fully healed. Try again!',
  next: n => `${n} is next! Get ready…`, dare: n => `🥊 Challenge ${n} (win for loot)`, back: n => `${n} will be back in a minute`, gateTip: 'The pass gate is shut — beat the partner to open it',
});
function sv(ctx) { const s = ctx.S.save; s.sys ||= {}; const r = (s.sys.road ||= {}); r.won ||= {}; r.beat ||= {}; r.cd ||= {}; r.balls ||= []; if (r.maxZ == null) r.maxZ = Math.max(0, ...(s.badges || [])); return r; }
const zoneLv = id => (/^m\d$/.test(id || '') ? +id.slice(1) : 0);
/* đường thông chưa (không chặn)? — đã thắng, đã tới vùng trên (hoặc cao hơn), có huy hiệu ≥ vùng trên, hoặc đang đi từ trên xuống */
export function roadOpen(ctx, info = ST.info) {
  if (!info) return true; const s = sv(ctx), up = zoneLv(info.upper);
  if (s.tour) return !!s.won[info.id] || ctx.S.save.entry === 'back';   /* preset duongall: thử hết 9 đèo — chỉ thắng mới thông */
  return !!s.won[info.id] || s.maxZ >= up || (ctx.S.save.badges || []).some(b => b >= up) || ctx.S.save.entry === 'back';
}
const nowMs = () => Date.now();
const gone = (ctx, id) => (sv(ctx).cd[id] || 0) > nowMs();
const px = t => ({ x: t.x * 16 + 8, y: t.y * 16 + 12 });
function postOf(info, i) { const n = info.who.length, p = px(info.post); return { x: p.x + (n > 1 ? (i ? 14 : -14) : 0), y: p.y }; }
function asideOf(info, i) { return px(info.aside[i % info.aside.length]); }
function blocker(ctx) {   /* bạn tập đang chắn (đường chưa thông): người đầu tiên chưa bị hạ ở đoạn này */
  const info = ST.info, beat = sv(ctx).beat[info.id] || []; return info.who.find(id => !beat.includes(id)) || null;
}
function setGate(ctx, open) {
  const m = ctx.S.map, o = m.passGate; if (!o) return; const want = open ? 'pass_gate_open' : 'pass_gate'; if (o.type === want) return;
  ctx.removeObject(m, o); m.passGate = ctx.place(m, want, o.x, o.y, { passGate: true }); ST.reach = null;   /* cổng đổi → tính lại vùng nối về đường (unstick) */
}
function opts(ctx, id, at) {
  const info = ST.info, c = info.clear, i = info.idx;
  return { at, ring: info.ring, rect: { x0: c.x0 * 16 + 4, x1: (c.x1 + 1) * 16 - 4, y0: c.y0 * 16 + 4, y1: (c.y1 + 1) * 16 - 2 }, max: info.max, lv: ROAD_LV[i], sword: ROAD_SWORD[i], mul: 1 + 0.06 * (i - 1),
    outFn: p => { const ty = Math.floor(p.y / 16); return ty > c.y1 + 1 || ty < c.y0 - 2; }, onEnd: (why, b) => onEnd(ctx, id, why, b) };
}
function start(ctx, id, at) {
  if (!ctx.sparRoad || ctx.sparRoad.active()) return false;
  const ok = ctx.sparRoad.start(id, opts(ctx, id, at)); if (ok) { ST.fight = { id, blocked: !roadOpen(ctx) }; } return ok;
}
function onEnd(ctx, id, why) {
  const s = sv(ctx), info = ST.info, f = ST.fight || {}; ST.fight = null; if (!info) return;
  if (why === 'win') {
    s.cd[id] = nowMs() + RESPAWN_MS;   /* bạn tập vắng 1 phút */
    if (f.blocked) {
      const beat = (s.beat[info.id] ||= []); if (!beat.includes(id)) beat.push(id);
      if (info.who.every(w => beat.includes(w))) { s.won[info.id] = true; setGate(ctx, true); setTimeout(() => ctx.toast(L(ctx).open, true), 2600); if (ctx.quake) ctx.quake(0.6); ctx.sfx('win'); }
      else { const nx = blocker(ctx); if (nx) { ST.next = 3.2; ctx.toast(L(ctx).next(ctx.sparRoad.name(nx)), true); } }
    }
  } else if (why === 'yield' && f.blocked) {   /* Thua khi đang bị chặn → về chân đèo, hồi đầy máu */
    const p = ctx.S.player, e = ctx.S.map.entries.default; p.x = e.x * 16 + 8; p.y = e.y * 16 + 14; p.dir = 3; p.autoPath = null;
    if (ctx.hero) ctx.hero.heal(99999); setTimeout(() => ctx.toast(L(ctx).lost, true), 300); ST.armed = false;
  } else if (why === 'out') ST.armed = false;
  ctx.persist();
}
function inClear(p) { const c = ST.info.clear, tx = Math.floor(p.x / 16), ty = Math.floor(p.y / 16); return tx >= c.x0 && tx <= c.x1 && ty >= c.y0 && ty <= c.y1; }
function standing(ctx) {   /* bạn tập đang đứng chờ (không trong trận, không vắng): [{ id, x, y, face, post }] */
  const info = ST.info; if (!info) return []; const open = roadOpen(ctx), bout = ctx.sparRoad && ctx.sparRoad.bout(), out = [];
  info.who.forEach((id, i) => {
    if (bout && bout.r && bout.r.id === id) return; if (gone(ctx, id)) return;
    if (!open && (sv(ctx).beat[info.id] || []).includes(id)) return;   /* đoạn 9: người đã bị hạ rời đi, người kế đứng chắn */
    const at = open ? asideOf(info, i) : postOf(info, i); out.push({ id, ...at, face: open ? (i ? 1 : 2) : 0, post: !open });
  });
  return out;
}
/* 2026-10-12 anh: người chơi / bạn tập / quái bị VĂNG vào vật viền đèo (cây, đá, vách, cột…) → vật đó HƯ (cú 1) rồi ĐỔ NÁT (cú 2; cú mạnh ≥ 1,2 tính 2).
   Ảnh hư / đổ nát PixelLab RIÊNG của từng file gốc (manifest.ruins, tools/px-road-ruin.py) — main.js ruinStage vẽ; đổ nát nằm như lớp nền.
   Đổ nát đi xuyên được (trừ vành ngoài 2 ô: không vỡ; hàng cổng khi đường còn chặn: vẫn cứng) — xem roadImpact. VFX chỉ theo sự kiện (bụi / dăm gỗ / đá vụn), không lặp. Vào lại đèo = lành (bản đồ dựng mới). */
const BREAK_WOOD = /^(tree|palm|pine|pine_s|deadtree|bush|beam|crate)$/, BREAK_STONE = /^(rock|rock_s|boulder|cliff_mine|cliff_basalt|pillar|pillar_broken|statue|torch|lantern|campfire|shell)$/;
/* vành ngoài 2 ô sát mép bản đồ KHÔNG BAO GIỜ vỡ → không ai ra khỏi bản đồ */
const outer = (m, o) => o.x < 2 || o.y < 2 || o.x > m.w - 3 || o.y > m.h - 3;
const breakable = (m, o) => !o.exit && !o.passGate && !o.ruined && !outer(m, o) && (BREAK_WOOD.test(o.orig || o.type) || BREAK_STONE.test(o.orig || o.type));
/* 2026-10-12 anh (bị văng kẹt trong rừng): đổ nát ĐI XUYÊN ĐƯỢC (gốc cây / đống đá vụn nằm như nền) → luôn đi ngược ra đường được.
   Ngoại lệ: hàng cổng đèo khi đường còn chặn (không cho phá rừng vòng qua cổng) + vành ngoài (không vỡ). Trả { pass } để knock.js cho cú mạnh xuyên tiếp 1 vật. */
function roadImpact(ctx, x, y, power = 1, kind = 'wall') {
  if (!ST.info || kind !== 'wall') return 0; const m = ctx.S.map; let best = null, bd = 15;
  for (const o of m.objects) {
    if (!breakable(m, o)) continue; const d0 = ctx.O[o.type]; if (!d0) continue;
    const cx = Math.max(o.x * 16, Math.min((o.x + d0.fw) * 16, x)), cy = Math.max(o.y * 16, Math.min((o.y + d0.fh) * 16, y)), d = Math.hypot(x - cx, y - cy);
    if (d < bd) { bd = d; best = o; }
  }
  if (!best) return 0; return hitObj(ctx, best, power >= 1.2 ? 2 : 1);
}
/* 1 cú vào đúng vật o (dmg máu, vật viền có 2 máu). Dùng chung cho cú văng (roadImpact) và luồng Rocky-ha (blast.js qua ctx.roadHitObj, dmg = HA_POW). */
function hitObj(ctx, o, dmg) {
  const m = ctx.S.map, wood = BREAK_WOOD.test(o.type), fx = o.x * 16 + 8, fy = (o.y + 1) * 16 - 4;
  o.hpMax = 2; o.hp = (o.hp ?? 2) - dmg; ST.breaks = (ST.breaks || 0) + 1;
  if (o.hp <= 0) {
    o.orig = o.type; o.ruined = true; o.hp = 0;
    const keep = o.y === ST.info.gate.y && !roadOpen(ctx);   /* hàng cổng khi còn chặn: đổ nát vẫn cứng */
    if (!keep) { const d0 = ctx.O[o.orig]; for (let j = 0; j < d0.fh; j++) for (let i = 0; i < d0.fw; i++) ctx.setSolid(m, o.x + i, o.y + j, 0); ST.reach = null; }
    if (ctx.vfx) { ctx.vfx(wood ? 'wood_chips' : 'rock_debris', fx, fy); if (wood && /tree|palm|pine/.test(o.orig)) ctx.vfx('leaf_fall', fx, fy - 18); }
    ctx.sfx('smash'); if (ctx.quake) ctx.quake(0.14);
    return { pass: !keep, o };
  }
  if (ctx.vfx) ctx.vfx(wood ? 'wood_chips' : 'dirt_puff', fx, fy); ctx.sfx('knock_wall');
  return { pass: false, o };
}
/* AN TOÀN: người chơi / bạn tập / quái không bao giờ kẹt trong khối viền — đứng ở ô cứng hoặc ô không nối về đường → dời về ô đi được gần nhất nối với đường (BFS). */
function reach(ctx) { const m = ctx.S.map; if (!ST.reach || ST.reachMap !== m) { ST.reach = ctx.computeReach(m, m.entries.default); ST.reachMap = m; } return ST.reach; }
function safeTile(ctx, x, y) {
  const m = ctx.S.map, R = reach(ctx), tx0 = Math.floor(x / 16), ty0 = Math.floor(y / 16), seen = new Set([tx0 + ',' + ty0]), q = [[tx0, ty0]];
  while (q.length) { const [tx, ty] = q.shift(); if (tx >= 0 && ty >= 0 && tx < m.w && ty < m.h && R[ty * m.w + tx] && !ctx.isSolid(m, tx, ty)) return { x: tx * 16 + 8, y: ty * 16 + 12 };
    for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = tx + a, ny = ty + b, k = nx + ',' + ny; if (nx < 0 || ny < 0 || nx >= m.w || ny >= m.h || seen.has(k)) continue; seen.add(k); q.push([nx, ny]); } }
  return null;
}
function stuck(ctx, x, y) { const m = ctx.S.map, tx = Math.floor(x / 16), ty = Math.floor(y / 16), R = reach(ctx); return ctx.isSolid(m, tx, ty) || !R[ty * m.w + tx]; }
function unstick(ctx) {
  const p = ctx.S.player;
  if (!(ctx.knocked && ctx.knocked()) && p && (stuck(ctx, p.x, p.y - 3) || p.blocked(p.x, p.y, ctx.S.map, []))) {
    const s = safeTile(ctx, p.x, p.y - 3); if (s && (Math.abs(s.x - p.x) > 1 || Math.abs(s.y - p.y) > 2)) { p.x = s.x; p.y = s.y + 2; p.autoPath = null; ST.snaps = (ST.snaps || 0) + 1; ST.lastSnap = { who: 'player', x: s.x, y: s.y }; }
  }
  /* 2026-10-12 tối anh: Rocky cũng không bao giờ kẹt — bị hất / đi xuyên (ghost khi vướng) vào khối viền → dời về ô đi được nối với đường gần nhất.
     Bỏ qua lúc đang xuyên tường (ghost: tự ra trong 0,5 s), ở ổ, cưỡi bè. */
  const rk = ctx.rocky && ctx.rocky.ent && ctx.rocky.ent();
  if (rk && rk.state !== 'home' && rk.state !== 'ride' && !(rk.ghost > 0) && stuck(ctx, rk.x, rk.y - 2)) {
    const s = safeTile(ctx, rk.x, rk.y - 2); if (s) { rk.x = s.x; rk.y = s.y + 2; rk.px = rk.x; rk.py = rk.y; rk.blocked = 0; ST.snaps = (ST.snaps || 0) + 1; ST.rkSnaps = (ST.rkSnaps || 0) + 1; ST.lastSnap = { who: 'rocky', x: s.x, y: s.y }; if (ctx.vfx) ctx.vfx('dirt_puff', rk.x, rk.y + 2); }
  }
  for (const mo of (ctx.monsters ? ctx.monsters.list() : [])) {
    if (mo.kb || mo.c.fly || !stuck(ctx, mo.x, mo.y)) continue; const s = safeTile(ctx, mo.x, mo.y); if (s) { mo.x = s.x; mo.y = s.y; ST.snaps = (ST.snaps || 0) + 1; ST.lastSnap = { who: mo.c.key, x: s.x, y: s.y }; }
  }
}
export const road = {
  id: 'road',
  onZoneEnter(ctx) {
    ST.ctx = ctx; const s = sv(ctx), z = ctx.S.zone, lv = zoneLv(z.id); if (lv > s.maxZ) s.maxZ = lv;
    ST.info = ctx.S.map.roadInfo || null; ST.fight = null; ST.breaks = 0; ST.reach = null; ST.snaps = 0; ST.rkSnaps = 0; ST.lastSnap = null;
    ctx.roadHitObj = ST.info ? (o, pow) => { if (!breakable(ctx.S.map, o)) return null; const r = hitObj(ctx, o, pow); return { gone: !!(r && r.o && r.o.ruined) }; } : null;   /* 2026-10-12 tối: luồng Rocky-ha phá vật viền đèo (blast.js) */
    ctx.arenaImpact = (x, y, pw = 1, kind = 'land') => roadImpact(ctx, x, y, pw, kind);   /* (Sàn Đấu Ngầm không chạy hệ này: arena.js tự gán lại khi vào đó) */ ST.armed = true; ST.next = 0; ST.t = 0;
    if (ST.info) { if (ctx.sparRoad) ctx.sparRoad.load(); setGate(ctx, roadOpen(ctx)); const b = !roadOpen(ctx) && blocker(ctx); if (b) setTimeout(() => { if (ctx.S.map && ctx.S.map.roadInfo === ST.info && !roadOpen(ctx)) ctx.toast(L(ctx).block(ctx.sparRoad.name(b))); }, 1200); }
    if (typeof window !== 'undefined') window.__road = {
      info: () => ST.info && { ...ST.info }, open: () => roadOpen(ctx), save: () => JSON.parse(JSON.stringify(sv(ctx))), standing: () => standing(ctx), blocker: () => (ST.info ? blocker(ctx) : null),
      gate: () => ctx.S.map.passGate && { type: ctx.S.map.passGate.type, solid: ctx.isSolid(ctx.S.map, ctx.S.map.passGate.x + 1, ctx.S.map.passGate.y) }, fight: () => ST.fight,
      noAuto: v => { ST.noAuto = !!v; }, impact: (x, y, pw, k) => roadImpact(ctx, x, y, pw, k || 'wall'), breaks: () => ST.breaks || 0, snaps: () => ST.snaps || 0, rkSnaps: () => ST.rkSnaps || 0, lastSnap: () => ST.lastSnap, reachOk: (x, y) => !stuck(ctx, x, y), edgeReach: () => { const m = ctx.S.map, R = ctx.computeReach(m, m.entries.default); let n = 0; for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) if (R[y * m.w + x] && (x < 2 || x > m.w - 3) ) n++; return n; },
      border: () => ctx.S.map.objects.filter(o => o.hpMax || o.ruined).map(o => ({ type: o.orig || o.type, x: o.x, y: o.y, hp: o.hp, ruined: !!o.ruined, solid: ctx.isSolid(ctx.S.map, o.x, o.y) })),   /* test chụp ảnh: tạm không tự vào trận */
      cdLeft: id => Math.max(0, (sv(ctx).cd[id] || 0) - nowMs()), setCd: (id, ms) => { sv(ctx).cd[id] = nowMs() + ms; }, start: id => { const st = standing(ctx).find(q => q.id === id); return start(ctx, id, st ? { x: st.x, y: st.y } : postOf(ST.info, 0)); },
    };
  },
  onZoneLeave() { ST.fight = null; },
  update(dt, ctx) {
    const info = ST.info; if (!info || ctx.S.mode !== 'play' || !ctx.sparRoad) return; ST.t += dt;
    unstick(ctx);   /* 2026-10-12: không bao giờ kẹt trong khối rừng / đá */
    const p = ctx.S.player, open = roadOpen(ctx);
    if (!inClear(p)) ST.armed = true;
    if (ST.next > 0) { ST.next -= dt; if (ST.next <= 0 && !open && !ctx.sparRoad.active()) { const b = blocker(ctx); if (b) start(ctx, b, postOf(info, info.who.indexOf(b))); } return; }
    if (open || ctx.sparRoad.active() || !ST.armed || ST.noAuto) return;
    const ty = Math.floor(p.y / 16);
    if (inClear(p) && ty <= info.clear.y1 - 1) { const b = blocker(ctx); if (b && !gone(ctx, b)) { ST.armed = false; start(ctx, b, postOf(info, info.who.indexOf(b))); } }   /* bước vào sân → bạn tập ra chặn */
  },
  near(ctx) {
    if (!ST.info || !ctx.sparRoad || ctx.sparRoad.active() || !roadOpen(ctx)) return null;
    const p = ctx.S.player; let best = null, bd = 30;
    for (const q of standing(ctx)) { const d = Math.hypot(q.x - p.x, q.y - p.y); if (d < bd) { bd = d; best = q; } }
    return best ? { label: L(ctx).dare(ctx.sparRoad.name(best.id)), x: best.x, y: best.y, limit: 30, data: { dare: best.id, at: { x: best.x, y: best.y } } } : null;
  },
  interact(ctx, cand) { const d = cand && cand.data; if (d && d.dare) start(ctx, d.dare, d.at); },
  drawables(ctx, cx, cy) {
    if (!ST.info || !ctx.sparRoad) return []; const g = ctx.g, t = ST.t;
    return standing(ctx).map(q => ({ y: q.y, f: () => { ctx.sparRoad.draw(g, q.id, Math.round(q.x - cx), Math.round(q.y - cy), q.face, t + q.x * 0.01); } }));
  },
};
