/* edgearrow120.js — c65-hud (plan-120 việc 1, học Saiyan): MŨI TÊN NHIỆM VỤ Ở MÉP MÀN HÌNH + "tên · N bước".
   Mục tiêu (≤ 2 mũi tên, tính lại 4 lần / giây, chỉ ĐỌC save — không ghi gì):
     1) lời nhờ của nghệ sĩ trong vùng này (quests.js): việc đã đủ → người nhờ (vắng mặt → bảng tin); việc 'chào hỏi' → người cần gặp.
     2) việc chính theo cùng thứ tự nextstep.js: việc vùng (gặp nghệ sĩ chưa gặp gần nhất / lửa trại / mỏ / cần gạt / thư viện / obsidian),
        qua Đèo → cổng lên vùng trên, 3 món cứu Lyron (M4 / M6 / M9 Leader), lặn ở cầu tàu Biển.
        Mục tiêu ở vùng KHÁC → trỏ về cổng ra dẫn tới vùng đó (chuỗi Biển → Làng → Đèo → M1 → … theo ZONES.order); không có dữ liệu → bỏ.
   Vẽ ở drawUI: mục tiêu ngoài màn → mũi tên PixelLab (ui/hud/target_arrow.png) bám mép, xoay đúng hướng + nhãn khung giấy (ui/hud91/tframe.png) "tên · N bước"
   (1 bước = 1 ô 16 px). Trong màn → mũi tên nhỏ TĨNH chỉ xuống trên đầu mục tiêu (bỏ qua nghệ sĩ đã có dấu !/?/✓ của quests.js). Không nhấp nháy, không lặp.
   Không vẽ khi: không ở chế độ 'play', đang đánh trùm / đèo, Biển hồi 1, mục tiêu < 3 bước.
   Móc test: window.__ea120 = { targets(), drawn(), off(bool) }. Dấu build: EA120_EDGE */
import { ZONES, ROADS } from '../world.js';
import { isLeader } from '../data.js';
import { img, paper, sh, uiS, isVi } from './hud120lib.js';

const TS = 16, NEAR_STEPS = 3, MAXN = 2;
const ST = { t: 0, list: [], drawn: [], off: false };
const TX = {
  vi: { meet: n => `Gặp ${n}`, hand: n => `Giao việc: ${n}`, board: 'Bảng tin', hello: n => `Chào ${n}`, fire: 'Lửa trại', ore: 'Mỏ tím', lever: 'Cần gạt', quiz: 'Thư viện', item: 'Obsidian',
    to: z => `Tới ${z}`, dive: 'Vòng xoáy lặn', steps: n => `${n} bước`, village: 'Làng', sea: 'Biển', pass: n => `Đèo ${n}` },
  en: { meet: n => `Meet ${n}`, hand: n => `Hand in: ${n}`, board: 'Notice board', hello: n => `Greet ${n}`, fire: 'Campfire', ore: 'Purple vein', lever: 'Lever', quiz: 'Library', item: 'Obsidian',
    to: z => `To ${z}`, dive: 'Dive whirl', steps: n => `${n} steps`, village: 'Village', sea: 'Sea', pass: n => `Pass ${n}` },
};
const CHAIN = id => id === 'sea' || id === 'village' || /^m[1-9]$/.test(id) || /^road\d$/.test(id);
function shortZ(id, t) { const z = ZONES[id]; if (!z) return id; if (id === 'village') return t.village; if (id === 'sea') return t.sea; if (z.road) return t.pass(z.roadIdx || 1); if (z.lv >= 1) return 'M' + z.lv; return (z.name && z.name.en) || id; }
function objPos(ctx, o) { const d = ctx.O[o.orig || o.type] || ctx.O[o.type]; if (!d) return null; return { x: o.x * TS + d.fw * 8, y: (o.y + d.fh) * TS - 4, top: (o.y + d.fh) * TS - Math.max(d.h || 16, d.fh * TS) }; }

/* ---------- cổng ra dẫn về phía vùng đích ---------- */
function gateToward(ctx, goal) {
  const m = ctx.S.map, cur = ctx.S.zone, G = ZONES[goal]; if (!m || !m.gates || !G || !cur) return null;
  const co = cur.order, go = G.order; let best = null, bv = Infinity;
  for (const g of m.gates) {
    const Z = ZONES[g.to]; if (!Z || !CHAIN(g.to)) continue;
    if (g.to === goal) { best = g; break; }
    let v;
    if (CHAIN(cur.id)) { if (go > co ? !(Z.order > co && Z.order <= go) : !(Z.order < co && Z.order >= go)) continue; v = Math.abs(go - Z.order); }
    else v = Math.abs(go - Z.order);
    if (v < bv) { bv = v; best = g; }
  }
  if (!best) return null;
  return { x: (best.x + best.w / 2) * TS, y: (best.y + best.h / 2) * TS, top: (best.y + best.h / 2) * TS - 12 };
}

/* ---------- việc chính (cùng thứ tự nextstep.js, rút gọn) → { zone, find(ctx) } ---------- */
function mainGoal(ctx) {
  const S = ctx.S, sv = S.save, st = sv.story || {};
  if (S.bossFight || (ctx.sparRoad && ctx.sparRoad.active && ctx.sparRoad.active())) return null;
  if (st.act === 1 || !st.seaDone) return null;
  const ly = (sv.sys || {}).lyron || {}; if (ly.stage === 'meet') return null;
  const badges = sv.badges || [], road = (sv.sys || {}).road || {}, won = road.won || {}, maxZ = Math.max(road.maxZ || 0, ...badges, 0);
  const open = i => !!won['road' + i] || maxZ >= i || badges.some(b => b >= i);
  const sword = ctx.tool ? ctx.tool.tier('sword') : 0;
  let fr = 0; for (let i = 1; i <= 9; i++) if (!open(i)) { fr = i; break; }
  if (fr) {
    let miss = 0; for (let lv = 1; lv <= fr - 1; lv++) if (!badges.includes(lv)) { miss = lv; break; }
    if (miss) return { zone: 'm' + miss, task: miss };
    if (fr === 1 && sword < 1) return null;   /* gom đá mua kiếm: không có chỗ cụ thể */
    return { zone: 'm' + fr };                  /* qua đèo: cổng → đèo → cổng lên vùng trên */
  }
  for (let lv = 1; lv <= 9; lv++) if (!badges.includes(lv)) return { zone: 'm' + lv, task: lv };
  if (st.act === 2 && st.items) {
    if (!st.items.divebell) return { zone: 'm4' };
    if (!st.items.trenchmap) return { zone: 'm6', obj: 'quiz' };
    if (!st.items.greatcrystal) return { zone: 'm9', leaders: true };
  }
  if (st.act === 3) return { zone: 'sea', dive: true };
  return null;
}
function nearestNpc(ctx, pred) {
  const p = ctx.S.player; let best = null, bd = Infinity;
  for (const n of (ctx.allNpcs ? ctx.allNpcs() : ctx.S.npcs)) { if (!n || !n.m || n.m.friend || n.m.guide || !pred(n)) continue; const d = Math.hypot(n.x - p.x, n.y - p.y); if (d < bd) { bd = d; best = n; } }
  return best;
}
function nearestObj(ctx, pred) {
  const p = ctx.S.player; let best = null, bd = Infinity;
  for (const o of ctx.S.map.objects) { if (!pred(o)) continue; const q = objPos(ctx, o); if (!q) continue; const d = Math.hypot(q.x - p.x, q.y - p.y); if (d < bd) { bd = d; best = o; } }
  return best;
}
const npcT = (n, name, glyph) => ({ ref: n, kind: 'npc', name, glyph, pos: () => ({ x: n.x, y: n.y, top: n.y - 26 }) });
const objT = (ctx, o, name) => ({ ref: o, kind: 'obj', name, pos: () => objPos(ctx, o) });

function inZoneMain(ctx, G, t) {
  const S = ctx.S, sv = S.save, zid = S.zone.id, met = new Set(sv.met || []);
  if (G.dive) { const d = S.map.dive; return d ? { kind: 'spot', name: t.dive, pos: () => ({ x: d.x * TS + 8, y: d.y * TS + 8, top: d.y * TS - 8 }) } : null; }
  if (G.obj === 'quiz') { const o = nearestObj(ctx, o => o.quiz); return o ? objT(ctx, o, t.quiz) : null; }
  if (G.leaders) { const n = nearestNpc(ctx, n => isLeader(n.m) && !met.has(n.m.id)); return n ? npcT(n, t.meet(n.m.n)) : null; }
  if (!G.task) return null;
  const q = S.zone.quest; if (!q) return null;
  const tv = id => { const z = (sv.tasks || {})[zid]; return z ? (z[id] || 0) : 0; };
  const metHere = (S.npcs || []).filter(n => n.m && met.has(n.m.id) && (!q.leaders || isLeader(n.m))).length;
  const metAll = (() => { try { return ctx.membersOfLevel(S.zone.lv).filter(m => met.has(m.id) && (!q.leaders || isLeader(m))).length; } catch (e) { return metHere; } })();
  if (metAll < q.meet) { const n = nearestNpc(ctx, n => !met.has(n.m.id) && (!q.leaders || isLeader(n.m))); if (n) return npcT(n, t.meet(n.m.n)); }
  for (const tk of q.tasks || []) {
    if (tv(tk.id) >= tk.n) continue;
    const pick = { fires: [o => o.fire && !o.lit, t.fire], ore: [o => o.ore, t.ore], levers: [o => o.lever && !o.on, t.lever], quiz: [o => o.quiz, t.quiz], obsidian: [o => o.item, t.item] }[tk.id];
    if (!pick) continue;
    const o = nearestObj(ctx, pick[0]); if (o) return objT(ctx, o, pick[1]);
  }
  return null;
}

/* ---------- lời nhờ của nghệ sĩ trong vùng này ---------- */
function questTarget(ctx, t) {
  const S = ctx.S, qs = ((S.save.sys || {}).quests || {}).active || [], zid = S.zone.id, met = new Set(S.save.met || []);
  let ready = null; try { ready = window.__quests && window.__quests.list().active; } catch (e) { }
  const isReady = q => { if (!ready) return false; const r = ready.find(x => x.npcId === q.npcId); return !!(r && r.ready); };
  for (const q of qs) {
    if (q.zone !== zid) continue;
    if (isReady(q)) {
      const n = nearestNpc(ctx, n => n.m.id === q.npcId);
      if (n && !q.bird) return npcT(n, t.hand(n.m.n), true);
      const b = nearestObj(ctx, o => o.piece === 'board' && !o.ruined); if (b) return objT(ctx, b, t.board);
    }
  }
  for (const q of qs) {
    if (q.zone !== zid || q.type !== 'friend' || q.ok || met.has(q.friendId)) continue;
    const n = nearestNpc(ctx, n => n.m.id === q.friendId); if (n) return npcT(n, t.hello(n.m.n));
  }
  return null;
}

function compute(ctx) {
  const S = ctx.S, out = []; if (!S.save || !S.zone || !S.map || !S.player) return out;
  const t = TX[isVi(ctx) ? 'vi' : 'en'];
  try { const q = questTarget(ctx, t); if (q) out.push(q); } catch (e) { }
  try {
    const G = mainGoal(ctx);
    if (G) {
      let tg = null;
      if (G.zone === S.zone.id) tg = inZoneMain(ctx, G, t);
      else { const gp = gateToward(ctx, G.zone); if (gp) tg = { kind: 'gate', name: t.to(shortZ(G.zone, t)), pos: () => gp }; }
      if (tg && !out.some(o => o.ref && o.ref === tg.ref)) out.push(tg);
    }
  } catch (e) { }
  return out.slice(0, MAXN);
}

/* ---------- vẽ ---------- */
function arrowImg() { return img('ui/hud/target_arrow.png'); }
function drawArrow(ug, x, y, ang, sz) {   /* ảnh mũi chỉ XUỐNG → xoay (ang - 90°) */
  const im = arrowImg(); ug.save(); ug.translate(Math.round(x), Math.round(y)); ug.rotate(ang - Math.PI / 2);
  if (im) ug.drawImage(im, 0, 0, im.width, im.height, -sz / 2, -sz / 2, sz, sz);
  else { ug.fillStyle = '#ffd45e'; ug.strokeStyle = '#4a2430'; ug.lineWidth = 2; ug.beginPath(); ug.moveTo(-sz / 2, -sz / 4); ug.lineTo(sz / 2, -sz / 4); ug.lineTo(0, sz / 2); ug.closePath(); ug.fill(); ug.stroke(); }
  ug.restore();
}
function label(ug, txt, x, y, s, W, H, box) {
  const fs = Math.max(13, Math.round(s * 3.9)); ug.font = `${fs}px VT323, monospace`;
  const w = Math.ceil(ug.measureText(txt).width) + Math.round(12 * s / 2) * 2, h = fs + Math.round(5 * s);
  let lx = Math.round(x - w / 2), ly = Math.round(y - h / 2);
  lx = Math.max(box.x0, Math.min(box.x1 - w, lx)); ly = Math.max(box.y0, Math.min(box.y1 - h, ly));
  paper(ug, lx, ly, w, h, s * 0.6);
  ug.textAlign = 'center'; ug.textBaseline = 'middle'; sh(ug, txt, lx + w / 2, ly + h / 2 + 1, '#3b2412', `${fs}px VT323, monospace`, 'rgba(255,240,200,.55)');
  return { x: lx, y: ly, w, h };
}

export const edgearrow120 = {
  id: 'edgearrow120',
  always: true,
  onZoneEnter(ctx) {
    ST.t = 0; ST.list = []; arrowImg(); img('ui/hud91/tframe.png');
    if (typeof window !== 'undefined') window.__ea120 = {
      targets: () => ST.list.map(o => { const p = o.pos(); return { kind: o.kind, name: o.name, x: p && Math.round(p.x), y: p && Math.round(p.y) }; }),
      drawn: () => ST.drawn.slice(), off: v => { if (v != null) ST.off = !!v; return ST.off; }, now: () => { ST.list = compute(ctx); return ST.list.length; },
    };
  },
  onZoneLeave() { ST.list = []; },
  update(dt, ctx) { ST.t -= dt; if (ST.t <= 0) { ST.t = 0.25; ST.list = compute(ctx); } },
  drawUI(ug, ctx, cx, cy, scale) {
    ST.drawn = [];
    if (ST.off || ctx.S.mode !== 'play' || !ST.list.length || ctx.S.bossFight) return;
    const W = ug.canvas.width, H = ug.canvas.height, s = uiS(ctx, scale), p = ctx.S.player;
    const bot = (globalThis.__h91bot ? globalThis.__h91bot(H) : 0) || Math.round(H * 0.12);
    const box = { x0: Math.round(8 * s), y0: Math.round(10 * s), x1: W - Math.round(8 * s), y1: H - bot - Math.round(6 * s) };
    let ban = false; try { ban = !!((window.__zb120 && window.__zb120.state().ban) || (window.__qb120 && window.__qb120.state().cur)); } catch (e) { }   /* banner giữa trên đang hiện → tạm cất mũi tên mép (không chồng chữ) */
    const az = Math.max(18, Math.round(s * 7.5)), px = (p.x - cx) * scale, py = (p.y - 10 - cy) * scale;
    ug.save(); ug.imageSmoothingEnabled = false;
    for (const tg of ST.list) {
      const q = tg.pos(); if (!q) continue;
      const steps = Math.round(Math.hypot(q.x - p.x, q.y - p.y) / TS); if (steps < NEAR_STEPS) continue;
      const sx = (q.x - cx) * scale, sy = (q.y - cy) * scale, ty = (q.top - cy) * scale;
      const inside = sx > 4 && sx < W - 4 && ty > 0 && sy < box.y1;   /* thấy được cả người (đầu chạm mép trên vẫn tính là trong màn) */
      if (inside) {   /* trong màn: mũi tên nhỏ tĩnh chỉ xuống trên đầu (người có dấu !/?/✓ của quests.js thì thôi) */
        if (tg.glyph) { ST.drawn.push({ name: tg.name, inside: true, skip: 'glyph' }); continue; }
        const ax = Math.round(sx), ay = Math.round(Math.max(az * 0.6, ty - az * 0.7)); drawArrow(ug, ax, ay, Math.PI / 2, Math.round(az * 0.8));
        ST.drawn.push({ name: tg.name, steps, inside: true, x: ax, y: ay }); continue;
      }
      /* ngoài màn: tia từ người chơi tới mục tiêu cắt khung → mũi tên ở mép */
      if (ban) continue;
      const dx = sx - px, dy = sy - py, ang = Math.atan2(dy, dx), m = az * 0.7;
      const bx0 = box.x0 + m, bx1 = box.x1 - m, by0 = box.y0 + m, by1 = box.y1 - m;
      const ox = Math.max(bx0, Math.min(bx1, px)), oy = Math.max(by0, Math.min(by1, py));
      let k = Infinity; if (dx > 0) k = Math.min(k, (bx1 - ox) / dx); if (dx < 0) k = Math.min(k, (bx0 - ox) / dx); if (dy > 0) k = Math.min(k, (by1 - oy) / dy); if (dy < 0) k = Math.min(k, (by0 - oy) / dy);
      if (!isFinite(k)) continue;
      const ax = ox + dx * k, ay = oy + dy * k;
      drawArrow(ug, ax, ay, ang, az);
      const r = label(ug, `${tg.name} · ${TX[isVi(ctx) ? 'vi' : 'en'].steps(steps)}`, ax - Math.cos(ang) * az * 1.6, ay - Math.sin(ang) * az * 1.3, s, W, H, box);
      ST.drawn.push({ name: tg.name, steps, inside: false, x: Math.round(ax), y: Math.round(ay), label: r });
    }
    ug.restore();
  },
};
