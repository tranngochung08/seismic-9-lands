/* farm103.js — plan-103: ĐẠO DIỄN CẢNH QUAY FARM QUÁI trên Làng mới (preset video_farm, presets.js khối p103).
   · Chỗ quay: bờ Tây / Nam ao Làng (m.v88.pond) — người chơi đứng ở bờ, nhìn được ao + suối.
   · Quái theo đợt (giữ số con sống: nước 2 · bờ 3 · bay 2, tối đa 8):
       (a) DƯỚI NƯỚC: Cá Nóc Gai, Lươn Điện, Cua Trộm — dùng đúng loài + ảnh có sẵn trong monsters.js, AI bơi riêng ở đây (chỉ đi trong ô nước,
           bơi lại mép nước gần người chơi rồi trồi lên cắn; nước Làng là ô cứng nên không bị đánh văng lên bờ). Vẽ bằng monsters.js (waterDraw: chìm nửa thân).
       (b) TRÊN BỜ: Nhầy Mầm, Sói Bóng, Bọ Cạp Cát (bỏ Yêu Đá — giống Rocky golem) — AI gốc của monsters.js (angry → lao vào người chơi).
       (c) BIẾT BAY: Quạ Xám, Mòng Biển Cướp — AI gốc (c.fly, bay thấp, bay từ ngoài khung vào).
     Máu quái nhân lên (HPK) để trận kéo dài đủ thấy chiêu: Rocky Nguyên Bản (golem) + Elyziuma đánh rất đau.
   · BOT người chơi: đi dọc bờ (tuần tra 4 điểm), có quái trong tầm thì bấm đánh con gần nhất (đúng đường click → monsters.onClick → tự đuổi + chém).
   · Giữ cảnh không đứt: người chơi / Elyziuma / Rocky tụt máu thì hồi lặng lẽ (không ngất giữa video).
   · Lệnh thử: window.__farm103 { state, log, spawn(kind,n), stop, go } · window.__fps103(). Tham số URL: bot103=0, wave103=0. */
import * as FX from './systems/fx78.js';
import { SPECIES, MOVES, SPECIES_EN, MOVE_NAME_EN } from './systems/duel-data.js';   /* c7: tên en */
import { shadowFor } from './systems/shadow.js';
const TS = 16;
const KINDS = { w: ['puffer', 'eel', 'crab'], s: ['slime', 'wolf', 'scorpion']   /* anh 02/11: bỏ Yêu Đá (rockimp) — trông như Rocky golem */, f: ['crow', 'gull'] };
const WANT = { w: 2, s: 3, f: 2 }, MAXN = 8;
const HPK = { puffer: 900, eel: 1000, crab: 800, slime: 700, wolf: 1300, scorpion: 1200, crow: 750, gull: 650 };
const ST = { on: false, C: null, t: 0, spot: null, bank: [], water: [], wset: null, patrol: [], pi: 0, mons: [], log: [], n: { w: 0, s: 0, f: 0, kill: 0, click: 0, heal: 0, bite: 0 }, next: 1.2, order: ['w', 's', 'f'], oi: 0, tg: null, clickT: 0, walkT: 0, fr: [], q: null, pet0: null };
const log = o => { ST.log.push({ t: +ST.t.toFixed(1), ...o }); if (ST.log.length > 400) ST.log.shift(); };
const rnd = (a, b) => a + Math.random() * (b - a);
const hyp = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

function isWaterT(C, tx, ty) { const m = C.S.map, g = C.getG(m, tx, ty); return g === C.T.WATER || g === C.T.DEEP; }
function free(C, tx, ty) { const m = C.S.map; return tx > 1 && ty > 1 && tx < m.w - 1 && ty < m.h - 1 && !C.isSolid(m, tx, ty) && !isWaterT(C, tx, ty); }

/* ---------- dựng chỗ quay: bờ + nước quanh ao ---------- */
function survey(C) {
  const m = C.S.map, P = (m.v88 && m.v88.pond) || { x: 131, y: 47, rx: 7, ry: 5 };
  const bank = [], water = [], wset = new Set();
  for (let ty = P.y - P.ry - 8; ty <= P.y + P.ry + 10; ty++) for (let tx = P.x - P.rx - 12; tx <= P.x + P.rx + 4; tx++) {
    if (isWaterT(C, tx, ty)) { water.push({ tx, ty }); wset.add(tx + ',' + ty); continue; }
    if (!free(C, tx, ty)) continue;
    let wn = 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (isWaterT(C, tx + dx, ty + dy)) wn++;
    if (wn) bank.push({ tx, ty, a: Math.atan2(ty - P.y, tx - P.x) });
  }
  /* tuần tra dọc bờ Tây → Nam của ao (góc ~ 200° … 80°): 4 điểm cách đều theo góc */
  const arc = bank.filter(b => Math.hypot(b.tx - P.x, (b.ty - P.y) * 1.3) < P.rx + 4 && (b.a > 1.2 || b.a < -2.6)).sort((a, b) => ((b.a + 2 * Math.PI) % (2 * Math.PI)) - ((a.a + 2 * Math.PI) % (2 * Math.PI)));
  const pick = [];
  if (arc.length) for (let i = 0; i < 4; i++) { const b = arc[Math.min(arc.length - 1, Math.round(i * (arc.length - 1) / 3))]; pick.push(b); }
  /* bước 1 ô vào đất (không đứng sát mép nước để quái bờ còn chỗ) */
  const patrol = pick.map(b => { let best = b; for (const [dx, dy] of [[-1, 0], [0, 1], [-1, 1], [1, 1]]) if (free(C, b.tx + dx, b.ty + dy)) { best = { tx: b.tx + dx, ty: b.ty + dy }; break; } return { x: best.tx * TS + 8, y: best.ty * TS + 12 }; });
  ST.bank = bank; ST.water = water; ST.wset = wset; ST.patrol = patrol.length ? patrol : [{ x: (P.x - P.rx - 2) * TS + 8, y: P.y * TS + 12 }];
  ST.spot = ST.patrol[1] || ST.patrol[0];
  log({ ev: 'survey', bank: bank.length, water: water.length, patrol: ST.patrol.map(p => [Math.round(p.x / TS), Math.round(p.y / TS)]) });
}

/* ---------- quái nước: AI bơi ---------- */
const wetAt = (x, y) => ST.wset && ST.wset.has(Math.floor(x / TS) + ',' + Math.floor(y / TS));
function swimAI(C, mo, dt, p, dp, canHit) {
  mo.t2 = (mo.t2 || 0) - dt; if (mo.bite > 0) mo.bite -= dt;
  if (!mo.g2 || mo.t2 <= 0) {
    mo.t2 = rnd(0.5, 1.0);
    if (dp < 200) {   /* ô nước gần người chơi nhất (mỗi con 1 chỗ khác nhau) */
      const taken = ST.mons.filter(o => o !== mo && o.g2).map(o => o.g2);
      const c = ST.water.map(w => ({ w, d: Math.hypot(w.tx * TS + 8 - p.x, w.ty * TS + 10 - p.y) })).filter(o => !taken.some(t => Math.hypot(t.x - (o.w.tx * TS + 8), t.y - (o.w.ty * TS + 10)) < 18)).sort((a, b) => a.d - b.d).slice(0, 3);
      const o = c[(Math.random() * c.length) | 0]; if (o) mo.g2 = { x: o.w.tx * TS + 8 + rnd(-3, 3), y: o.w.ty * TS + 10 + rnd(-3, 3) };
    } else { const w = ST.water[(Math.random() * ST.water.length) | 0]; if (w) mo.g2 = { x: w.tx * TS + 8, y: w.ty * TS + 10 }; }
  }
  if (mo.g2) {
    const dx = mo.g2.x - mo.x, dy = mo.g2.y - mo.y, d = Math.hypot(dx, dy);
    if (d > 1.5) { const sp = mo.c.sp * (dp < 60 ? 1.1 : 0.75) * dt, nx = mo.x + dx / d * Math.min(sp, d), ny = mo.y + dy / d * Math.min(sp, d);
      if (wetAt(nx, mo.y)) mo.x = nx; if (wetAt(mo.x, ny)) mo.y = ny;
      mo.dir = dx >= 0 ? 1 : -1; mo.face = Math.abs(dx) >= Math.abs(dy) ? (dx >= 0 ? 2 : 1) : (dy >= 0 ? 0 : 3); }
  }
  for (const o of ST.mons) if (o !== mo && o.swim103 && o.hp > 0) { const d = hyp(o, mo); if (d < 13 && d > 0.01) { const k = (13 - d) * 0.5 / d, nx = mo.x + (mo.x - o.x) * k, ny = mo.y + (mo.y - o.y) * k; if (wetAt(nx, ny)) { mo.x = nx; mo.y = ny; } } }   /* không chồng nhau */
  if (canHit && dp < 26 && mo.cd <= 0) {   /* trồi lên cắn người trên bờ */
    mo.cd = rnd(1.5, 2.1); mo.bite = 0.25; mo.dir = p.x >= mo.x ? 1 : -1;
    try { if (C.hero) C.hero.hit(Math.round(mo.c.dmg * 0.8)); } catch (e) { } ST.n.bite++;
    try { if (C.vfx) C.vfx('water_splash', mo.x, mo.y); } catch (e) { }
  }
}

/* ---------- sinh quái ---------- */
function mkMon(C, key, x, y) {
  const L = window.__monsters; if (!L) return null;
  const id = L.spawnKind(key, 0, 0); if (id == null) return null;
  const mo = C.monsters.list().find(o => o.id === id); if (!mo) return null;
  mo.x = x; mo.y = y; mo.hp = mo.max = HPK[key] || mo.max * 8; mo.angry = true; mo.farm103 = true; return mo;
}
function spawn(C, cat, n = 1) {
  const p = C.S.player, out = [];
  for (let i = 0; i < n; i++) {
    const key = KINDS[cat][(ST.n[cat] + i) % KINDS[cat].length];
    let q = null;
    if (cat === 'w') {   /* ô nước 3–8 ô quanh người chơi, xa con nước khác */
      const c = ST.water.filter(w => { const d = Math.hypot(w.tx * TS + 8 - p.x, w.ty * TS + 10 - p.y); return d > 36 && d < 100 && !ST.mons.some(o => o.swim103 && Math.hypot(o.x - (w.tx * TS + 8), o.y - (w.ty * TS + 10)) < 30); });
      const w = c[(Math.random() * c.length) | 0]; if (w) q = { x: w.tx * TS + 8, y: w.ty * TS + 10 };
    } else if (cat === 's') {   /* đất trống 90–150 px, phía không phải nước */
      for (let k = 0; k < 60 && !q; k++) { const a = rnd(0, Math.PI * 2), r = rnd(60, 105), x = p.x + Math.cos(a) * r, y = p.y + Math.sin(a) * r * 0.75, tx = Math.floor(x / TS), ty = Math.floor(y / TS);
        if (free(C, tx, ty) && free(C, tx + 1, ty) && free(C, tx - 1, ty) && C.pathTo(tx, ty, Math.floor(p.x / TS), Math.floor(p.y / TS), 8)) q = { x: tx * TS + 8, y: ty * TS + 12 }; }
    } else {   /* bay từ mép khung hình vào (hai bên, hơi cao) — trong 200 px để monsters.js giữ 'angry' */
      const sd = Math.random() < 0.5 ? -1 : 1; q = { x: p.x + sd * rnd(115, 135), y: p.y - rnd(30, 70) };
    }
    if (!q) continue;
    const mo = mkMon(C, key, q.x, q.y); if (!mo) continue;
    if (cat === 'w') { mo.c = Object.assign({}, mo.c, { ai: undefined, aiFn: swimAI, swim: true, aqua: false, lurk: false, float: false }); mo.swim103 = true; try { C.vfx && C.vfx('water_splash', q.x, q.y); } catch (e) { } }
    else if (cat === 's') { try { C.vfx && C.vfx('dirt_puff', q.x, q.y + 2); } catch (e) { } }
    mo.cat103 = cat; ST.mons.push(mo); out.push(mo); ST.n[cat]++; log({ ev: 'spawn', cat, key, x: Math.round(q.x), y: Math.round(q.y) });
  }
  return out.length;
}
function alive(C) { const L = C.monsters.list(), keep = ST.mons.filter(o => L.includes(o) && o.hp > 0); for (const o of ST.mons) if (!keep.includes(o)) { ST.n.kill++; log({ ev: 'kill', key: o.c.key, cat: o.cat103 }); } ST.mons = keep; return ST.mons; }

/* ---------- bot người chơi ---------- */
function reachable(C, mo) {
  if (mo.swim103) return ST.bank.some(b => Math.hypot(b.tx * TS + 8 - mo.x, b.ty * TS + 12 - mo.y) < 24);
  if (mo.c.fly) return !wetAt(mo.x, mo.y) && !wetAt(mo.x, mo.y + 6);   /* quái bay trên mặt nước: không đuổi (người chơi sẽ lội / bơi ra) */
  return true;
}
function bot(C, dt) {
  const p = C.S.player; if (C.S.mode !== 'play') return;
  ST.clickT -= dt; ST.walkT -= dt;
  if (wetAt(p.x, p.y) || p.custom) {   /* lỡ xuống nước (đang bơi → quái không đánh, không chém được) → bỏ mục tiêu, về ô bờ gần nhất */
    ST.n.wet = (ST.n.wet || 0) + 1; ST.tg = null;
    if (!p.autoPath || ST.walkT <= 0) { ST.walkT = 0.8; let best = null, bd = 1e9; for (const b of ST.bank) { const d = Math.hypot(b.tx * TS + 8 - p.x, b.ty * TS + 12 - p.y); if (d < bd) { bd = d; best = b; } }
      if (best) { p.autoPath = [{ x: best.tx * TS + 8, y: best.ty * TS + 12 }]; p.autoStuck = 0; } }
    return;
  }
  const L = C.monsters.list().filter(o => o.hp > 0 && !(o.c && (o.c.fct || o.c.spar)) && hyp(o, p) < 150 && hyp(o, ST.spot) < 200 && reachable(C, o));   /* chỉ đánh quanh bờ ao (không đuổi quạ đi xa khỏi khung) */
  if (ST.tg && (!L.includes(ST.tg))) { ST.tg = null; p.autoPath = null; }
  if (!ST.tg && L.length) { L.sort((a, b) => (a.lead103 ? -60 : 0) + hyp(a, p) - (b.lead103 ? -60 : 0) - hyp(b, p));   /* ưu tiên thủ lĩnh */ ST.tg = L[0]; ST.clickT = 0; log({ ev: 'tg', key: ST.tg.c.key }); }
  if (ST.tg) {
    if (ST.clickT <= 0) { ST.clickT = 0.5; const mon = C.S.sys.find(s => s.id === 'monsters'); try { if (mon && mon.onClick(C, { wx: ST.tg.x, wy: ST.tg.y - 4, tx: Math.floor(ST.tg.x / TS), ty: Math.floor(ST.tg.y / TS) })) ST.n.click++; } catch (e) { console.error('farm103 click', e); } }
    return;
  }
  /* rảnh: tuần tra dọc bờ */
  const P = ST.patrol[ST.pi % ST.patrol.length];
  if (hyp(p, P) < 10) { if (ST.walkT <= -1.2) { ST.pi = (ST.pi + 1) % ST.patrol.length; ST.walkT = 0; } return; }
  if (!p.autoPath && ST.walkT <= 0) { ST.walkT = 1.5; const path = C.pathTo(Math.floor(p.x / TS), Math.floor(p.y / TS), Math.floor(P.x / TS), Math.floor(P.y / TS), 10);
    if (path) { if (path.length) path[path.length - 1] = { x: P.x, y: P.y }; else path.push({ x: P.x, y: P.y }); p.autoPath = path; p.autoStuck = 0; } else ST.pi++; }
}

/* ---------- giữ cảnh không đứt ---------- */
function keepAlive(C) {
  try { const h = window.__hero && __hero.state(); if (h && h.hp < h.max * 0.45) { C.hero.heal(h.max); ST.n.heal++; } } catch (e) { }
  try { const E = window.__ely && __ely.E && __ely.E(); if (E && !E.ko && E.hp < E.max * 0.4) __ely.setHp(E.max); } catch (e) { }
  try { const pt = C.S.save.sys.pet && C.S.save.sys.pet.pet; if (pt && ST.pet0 && pt.hp < ST.pet0 * 0.4) pt.hp = ST.pet0; } catch (e) { }
}

/* đồng hành không đứng đè người chơi (video: Rocky golem che mất người) — đẩy nhẹ sang ngang, chỉ khi không đang ra chiêu lướt */
/* VỊ TRÍ ĐỒNG HÀNH (điều phối 02/11: Rocky ×2 che người chơi + Elyziuma). Mỗi khung kéo nhẹ (không dịch chuyển tức thời, không khi đang ra chiêu lướt):
   · Rocky (thân ~56 px): ĐANG ĐÁNH → đứng phía XA người chơi của mục tiêu (bên kia quái), cách người chơi ≥ 56 px; ĐI THEO → sau-chéo người chơi, cách ≥ 48 px.
   · Elyziuma: cách người chơi ≥ 28 px và lệch về phía ĐỐI DIỆN Rocky (cách Rocky ≥ 44 px).
   Khoảng cách đo elip (trục y ×1,4 — thân cao che theo chiều dọc). Chỉ dời vào ô đi được. Sắp lớp theo y giữ nguyên (hệ vẽ tự sắp). */
const SPR = { rk: 56, rkF: 48, ely: 28, elyRk: 44 };
function nudge(C, f, tx, ty, sp, dt) {
  const dx = tx - f.x, dy = ty - f.y, d = Math.hypot(dx, dy); if (d < 1) return false;
  const st = Math.min(d, sp * dt), nx = f.x + dx / d * st, ny = f.y + dy / d * st;
  let ok = false;
  if (free(C, Math.floor(nx / TS), Math.floor(f.y / TS))) { f.x = nx; ok = true; }
  if (free(C, Math.floor(f.x / TS), Math.floor(ny / TS))) { f.y = ny; ok = true; }
  if (ok) ST.n.spread = (ST.n.spread || 0) + 1; return ok;
}
const ell = (a, b) => Math.hypot(a.x - b.x, (a.y - b.y) * 1.4);
function spread(C, dt) {
  const p = C.S.player; let R = null, E = null;
  let X = [];
  try { if (window.__sq && __sq.fighters) { const L = __sq.fighters(); const r = L.find(u => u.sp === 'rocky' && u.f); if (r) R = r.f; X = L.filter(u => u.f && u.sp !== 'rocky' && u.sp !== 'elyziuma').map(u => u.f); } } catch (e) { }   /* p110: đội squad104 */
  if (!R) try { R = window.__c79 && __c79.f && __c79.f(); } catch (e) { }
  try { E = window.__ely && __ely.E && __ely.E(); if (E && E.ko) E = null; } catch (e) { }
  if (R && !R.tkPose && !R.dashT) {
    const mons = C.monsters.list().filter(o => o.hp > 0 && !(o.c && (o.c.fct || o.c.spar)));
    let tg = null, bd = 90; for (const o of mons) { const d = Math.hypot(o.x - R.x, o.y - R.y); if (d < bd) { bd = d; tg = o; } }
    let gx, gy;
    if (tg) {   /* bên kia quái so với người chơi */
      const vx = tg.x - p.x, vy = tg.y - p.y, l = Math.hypot(vx, vy) || 1, off = Math.max(18, SPR.rk - l);
      gx = tg.x + vx / l * off; gy = tg.y + vy / l * off * 0.7;
    } else {    /* đi theo: sau-chéo (ngược hướng nhìn, lệch ngang) */
      const dv = [[0, 1], [-1, 0], [1, 0], [0, -1]][p.dir] || [0, 1], side = R.x >= p.x ? 1 : -1;
      gx = p.x - dv[0] * 40 + (dv[0] ? 0 : side * 40); gy = p.y - dv[1] * 30 + (dv[1] ? 0 : 6);
    }
    const need = tg ? SPR.rk : SPR.rkF, d = ell(R, p);
    if (d < need) { const ux = (R.x - p.x) || (gx - p.x) || 1, uy = ((R.y - p.y) || 0.01) * 1.4, l = Math.hypot(ux, uy); nudge(C, R, p.x + ux / l * need, p.y + uy / l * need / 1.4, 90, dt); }
    else if (tg && Math.hypot(gx - R.x, gy - R.y) > 10) nudge(C, R, gx, gy, 45, dt);
  }
  for (const f of X) { if (f.tkPose) continue; const d = ell(f, p); if (d < 26) { const ux = (f.x - p.x) || 1, l = Math.abs(ux); nudge(C, f, p.x + ux / l * 26, f.y, 60, dt); } if (R && ell(f, R) < 40) { const ux = (f.x - R.x) || 1, uy = (f.y - R.y) || 0.01, l = Math.hypot(ux, uy); nudge(C, f, f.x + ux / l * 16, f.y + uy / l * 8, 50, dt); } }
  if (E && !E.act) {
    const d = ell(E, p);
    if (d < SPR.ely) { const ux = (E.x - p.x) || (R ? (p.x - R.x) : -1) || -1, l = Math.abs(ux) || 1; nudge(C, E, p.x + ux / l * SPR.ely, E.y, 70, dt); }
    if (R && ell(E, R) < SPR.elyRk) { const ux = E.x - R.x || 1, uy = (E.y - R.y) || 0.01, l = Math.hypot(ux, uy); nudge(C, E, E.x + ux / l * 20, E.y + uy / l * 10, 60, dt); }
  }
}
/* quái của đợt không ai đụng tới > 18 s (bay lạc / kẹt chỗ không với tới) → lặn / bay đi lặng lẽ để đợt mới sinh gần */
function stale(C, dt) {
  const p = C.S.player;
  for (const o of ST.mons) { if (o.hp !== o.hp103) { o.hp103 = o.hp; o.idle103 = 0; continue; } o.idle103 = (o.idle103 || 0) + dt;
    if (!o.lead103 && o.idle103 > 18 && hyp(o, p) > 90) { try { if (C.vfx) C.vfx(o.swim103 ? 'water_splash' : 'dirt_puff', o.x, o.y); C.monsters.remove(o); } catch (e) { } o.gone103 = true; log({ ev: 'stale', key: o.c.key }); } }
  ST.mons = ST.mons.filter(o => !o.gone103);
}
/* ---------- THỦ LĨNH đợt (anh 02/11): mỗi đợt có 1 Chấn Thú thủ lĩnh hợp chỗ — nước Bạch Kình / Cá Chép · bờ Hắc Giác / Ụt Chấn · trời Đại Bàng.
   Ảnh = sprite đấu Chấn Thú (ldKit), dấu TĨNH: vương miện + tên vàng 'Thủ lĩnh …' + thanh máu đỏ. Dùng chiêu thật của loài (tên + hệ từ duel-data): hô tên chiêu,
   VFX fx78 theo hệ (nước: vòng sóng + phun; đất / bóng: trồi đất; gió: bổ nhào), đánh người chơi + đồng hành trong vùng. Hệ thủ lĩnh đầy đủ: plan-106. ---------- */
const LEAD = { w: ['bachkinh', 'cachep'], s: ['hacgiac', 'utchan'], f: ['daibang'] };
const LHP = 5000, LDMG = 16;
let CROWN = null;
function crown() { if (!CROWN && typeof Image !== 'undefined') { CROWN = new Image(); CROWN.src = 'assets/px/ui/hud/crown.png'; } return CROWN && CROWN.complete && CROWN.naturalWidth ? CROWN : null; }
const spName = sp => (SPECIES[sp] && SPECIES[sp].name) || sp;
function leadE(C, mo) { const k = C.ldKit; if (!mo.e103 && k && k.ready && k.ready()) { mo.e103 = k.mk(mo.lsp, 40, null, mo.x, mo.y); mo.e103.clip = 'idle'; mo.e103.ct = 0; } return mo.e103; }
function leadClip(C, e, c, t) { if (!e) return; if (C.ldKit.has(e, c)) { e.clip = c; e.ct = 0; e.atkT = t || 0; } }
function hurtNear(C, x, y, r, dmg, src) {   /* đòn thủ lĩnh trúng người chơi + 2 đồng hành trong vùng r */
  const p = C.S.player; let n = 0;
  if (Math.hypot(p.x - x, (p.y - y) * 1.3) < r) { try { C.hero.hit(dmg); } catch (e) { } n++; }
  try { const E = window.__ely && __ely.E && __ely.E(); if (E && !E.ko && Math.hypot(E.x - x, E.y - y) < r) { E.hp -= dmg * 0.6; E.flash = 0.12; n++; } } catch (e) { }
  try { const f = window.__c79 && __c79.f && __c79.f(); if (f && Math.hypot(f.x - x, f.y - y) < r) { f.flash = 0.12; n++; } } catch (e) { }
  return n;
}
function leadCast(C, mo) {
  const sp = mo.lsp, S0 = SPECIES[sp] || {}, mv = (S0.moves || [])[(mo.mvI = (mo.mvI || 0) + 1) % ((S0.moves || []).length || 1)], M0 = MOVES[mv] || { name: 'Gầm Doạ', type: (S0.types || ['chan'])[0] };
  const ty = M0.type || (S0.types || ['chan'])[0], sk = FX.skinOf(sp, ty), pw = FX.power(0.55), p = C.S.player, e = leadE(C, mo);
  FX.shout(mo.x, mo.y - 34, String((C.lang && C.lang() === 'en' && (MOVE_NAME_EN[mv] || (!MOVES[mv] && MOVE_NAME_EN.gam))) || M0.name || mv).toUpperCase(), '#ffd36a', 1, 0.9); leadClip(C, e, C.ldKit.has(e || {}, 'cast') ? 'cast' : 'atk', 0.7);
  let hx = mo.x, hy = mo.y, r = 44;
  if (mo.cat103 === 'w') { hx = (mo.x + p.x) / 2; hy = (mo.y + p.y) / 2; FX.shockRing(mo.x, mo.y, 46, sk, 0.45, 3); FX.erupt(hx, hy, sk, pw, 'b'); try { C.vfx('water_splash', mo.x, mo.y); } catch (er) { } r = 40; }
  else if (mo.cat103 === 'f') { mo.dive = 0.45; hx = p.x; hy = p.y; FX.erupt(p.x, p.y, sk, pw, 'b'); r = 36; }
  else { FX.erupt(mo.x + (p.x - mo.x) * 0.5, mo.y + (p.y - mo.y) * 0.5, sk, pw, 'b'); FX.shockRing(mo.x, mo.y, 52, sk, 0.4, 3); hx = (mo.x + p.x) / 2; hy = (mo.y + p.y) / 2; r = 46; }
  const n = hurtNear(C, hx, hy, r, Math.round(LDMG * 1.6), mo); try { if (C.quake) C.quake(2); C.sfx && C.sfx('boom'); } catch (er) { }
  try { const X = globalThis.__sfx108; if (X && X.play) { X.play(ty + '_cast', { x: mo.x, y: mo.y }); setTimeout(() => { try { X.play(ty + '_hit', { x: hx, y: hy }); } catch (e) { } }, 280); } } catch (er) { }   /* p108: tiếng hệ chiêu của thủ lĩnh (cast + trúng), có ghi __sfxlog */
  ST.n.lcast = (ST.n.lcast || 0) + 1; log({ ev: 'lcast', sp, mv, n });
}
function leadAI(C, mo, dt, p, dp, canHit) {
  const e = leadE(C, mo); if (e) { e.ct += dt; if (e.atkT > 0) { e.atkT -= dt; if (e.atkT <= 0) { e.clip = 'idle'; e.ct = 0; } } }
  mo.castT = (mo.castT ?? 2.5) - dt; if (mo.dive > 0) mo.dive -= dt;
  if (mo.cat103 === 'w') { swimAI(C, mo, dt, p, Math.min(dp, 150), false); }   /* thủ lĩnh nước luôn bơi lại mép gần người chơi (không lảng vảng xa) */
  else {
    const rr = mo.cat103 === 'f' ? 20 : 18;
    if (dp > rr) { const dx = p.x - mo.x, dy = p.y - mo.y, st = Math.min(dp - rr + 1, mo.c.sp * dt);
      if (mo.cat103 === 'f') { mo.x += dx / dp * st; mo.y += dy / dp * st; }
      else { const nx = mo.x + dx / dp * st, ny = mo.y + dy / dp * st; if (free(C, Math.floor(nx / TS), Math.floor(mo.y / TS))) mo.x = nx; if (free(C, Math.floor(mo.x / TS), Math.floor(ny / TS))) mo.y = ny; }
      if (e) { e.fx = dx / dp; e.fy = dy / dp; if (!(e.atkT > 0) && e.clip !== 'run' && C.ldKit.has(e, 'run')) { e.clip = 'run'; e.ct = 0; } } }
    else if (e && e.clip === 'run') { e.clip = 'idle'; e.ct = 0; }
  }
  if (e && mo.cat103 === 'w') { e.fx = (p.x - mo.x) / (dp || 1); e.fy = (p.y - mo.y) / (dp || 1); }
  if (!canHit) return;
  if (mo.castT <= 0 && dp < 120) { mo.castT = 5.5 + Math.random() * 1.5; leadCast(C, mo); return; }
  if (dp < 26 && mo.cd <= 0) { mo.cd = 1.4; leadClip(C, e, 'atk', 0.45); try { C.hero.hit(LDMG); } catch (er) { } FX.bite(p.x, p.y, 8, FX.skinOf(mo.lsp), FX.power(0.4)); }
}
function leadDraw(C, g, mo, x, y) {
  const e = leadE(C, mo), alt = mo.cat103 === 'f' ? (mo.dive > 0 ? 6 : 16) + Math.round(Math.sin(mo.ft * 3) * 2) : 0;
  if (mo.cat103 !== 'w') try { shadowFor(g, mo.x, mo.y, x, y + 1, 22, alt); } catch (er) { }
  if (!e) { g.fillStyle = '#3a2f4a'; g.fillRect(x - 8, y - 16 - alt, 16, 16); return; }
  e.x = mo.x; e.y = mo.y; e.alt = alt; e.flash = mo.flash > 0 ? mo.flash : 0; C.ldKit.draw(g, e, mo.x - x, mo.y - y);
  const top = y - alt - (mo.__bt ? Math.abs(mo.__bt) : 30) - 4;   /* dấu thủ lĩnh TĨNH: vương miện vàng trên đầu; tên 'Thủ lĩnh …' + thanh máu đỏ do target91 (p91) vẽ chung như mọi đối thủ */
  const cr = crown(); if (cr) { const cw = Math.round(cr.naturalWidth / 2), ch = Math.round(cr.naturalHeight / 2); g.drawImage(cr, 0, 0, cr.naturalWidth, cr.naturalHeight, Math.round(x - cw / 2), top - ch - 1, cw, ch); }
}
function spawnLeader(C, cat) {
  const p = C.S.player, sp = LEAD[cat][(ST.n.lead || 0) % LEAD[cat].length]; let q = null;
  if (cat === 'w') { const c = ST.water.filter(w => { const d = Math.hypot(w.tx * TS + 8 - p.x, w.ty * TS + 10 - p.y); return d > 50 && d < 110; }); const w = c[(Math.random() * c.length) | 0]; if (w) q = { x: w.tx * TS + 8, y: w.ty * TS + 10 }; }
  else if (cat === 's') { for (let k = 0; k < 60 && !q; k++) { const a = Math.random() * 6.283, r = rnd(70, 105), tx = Math.floor((p.x + Math.cos(a) * r) / TS), ty = Math.floor((p.y + Math.sin(a) * r * 0.7) / TS); if (free(C, tx, ty) && free(C, tx + 1, ty) && free(C, tx - 1, ty)) q = { x: tx * TS + 8, y: ty * TS + 12 }; } }
  else { const sd = Math.random() < 0.5 ? -1 : 1; q = { x: p.x + sd * 130, y: p.y - 60 }; }
  if (!q) return null;
  const nm = spName(sp), c = { key: 'lead103_' + sp, vi: 'Thủ lĩnh ' + nm, en: 'Leader ' + (SPECIES_EN[sp] || nm), hp: LHP, w: 22, h: 26, dmg: LDMG, sp: cat === 'f' ? 60 : 44, xp: 120, drop: 'stone', c: ['#5a4a7a', '#2a2040', '#ffd36a'], fly: cat === 'f', swim: cat === 'w', shortHit: false,
    aiFn: (ctx, mo, dt, pp, dp, ch) => leadAI(C, mo, dt, pp, dp, ch), drawFn: (g, mo, x, y) => leadDraw(C, g, mo, x, y) };
  const mo = C.monsters.add(c, q.x, q.y); if (cat === 'w') { mo.hp = mo.max = Math.round(LHP * 0.7); } mo.angry = true; mo.farm103 = true; mo.lead103 = true; mo.lsp = sp; mo.cat103 = cat; if (cat === 'w') mo.swim103 = true;
  FX.erupt(q.x, q.y, FX.skinOf(sp), FX.power(0.5), 'b'); try { if (cat === 'w') C.vfx('water_splash', q.x, q.y); } catch (er) { }
  ST.mons.push(mo); ST.lead = mo; ST.n.lead = (ST.n.lead || 0) + 1; log({ ev: 'lead', sp, cat }); return mo;
}
const SYS = { id: 'farm103', always: true,
  update(dt, C) {
    if (!ST.on) return; dt = Math.min(dt, 0.1); ST.t += dt;
    const now = performance.now(); ST.fr.push(now); while (ST.fr.length && now - ST.fr[0] > 1000) ST.fr.shift();
    if (C.S.mode !== 'play') return;
    alive(C);
    if (ST.q.wave) { ST.next -= dt;
      if (ST.next <= 0) { ST.next = 3.2;
        for (let k = 0; k < 3; k++) { const cat = ST.order[ST.oi % 3]; ST.oi++; const have = ST.mons.filter(o => o.cat103 === cat).length;
          if (have < WANT[cat] && ST.mons.length < MAXN) { spawn(C, cat, Math.min(WANT[cat] - have, cat === 's' ? 2 : 1)); break; } } } }
    for (const o of ST.mons) if (o.c.fly && hyp(o, C.S.player) < 260) o.angry = true;   /* quái bay của đợt luôn lao vào (monsters.js bỏ angry khi > 200 px) */
    if (ST.q.lead && ST.q.wave) {   /* thủ lĩnh: con đầu ở giây 14, sau đó 10 s sau khi con trước bị hạ; xoay nước → bờ → trời */
      if (ST.lead && !ST.mons.includes(ST.lead)) { ST.lead = null; ST.leadT = 10; }
      if (!ST.lead) { ST.leadT = (ST.leadT ?? 14) - dt; if (ST.leadT <= 0 && C.ldKit && C.ldKit.ready && C.ldKit.ready()) { const cat = ['w', 's', 'f'][(ST.n.lead || 0) % 3]; if (!spawnLeader(C, cat)) ST.leadT = 1; } else if (C.ldKit && C.ldKit.load && !(C.ldKit.ready && C.ldKit.ready())) C.ldKit.load(); }
    }
    if (ST.q.bot) bot(C, dt);
    keepAlive(C); spread(C, dt); stale(C, dt); audLog();
  },
  onZoneLeave() { ST.mons = []; ST.tg = null; } };

/* anh 02/11 (bản video p103): bỏ thông báo khỏi cảnh — bảng 'E · …' cạnh nhân vật (vẫn bấm E được), hộp hướng dẫn Ki + hộp nhắc / mẹo góc trái, dòng nhiệm vụ / Cứu Lyron, thông báo nhận đồ góc trái dưới (#px-notes),
   dòng HUD thú cưng cũ ('Rocky … · ở ổ'). Giữ: khung tên chiêu nhỏ, dòng 'Hạ … +XP'. Tắt bằng &clean103=0. */
const HINT = /Ki \(|Mẹo|Tip:|bấm |nhấn |press |tap |chuột|click|: .{60,}/i;
function clean(C) {
  const st = document.createElement('style'); st.textContent = '#prompt,#px-label,#px-notes,#toast,.hud-tl #h-quest,.hud-tl #h-story,.hud-tl #h-task,.hud-tl #h-next{display:none!important}';   /* #px-label = bảng gỗ E · … cạnh nhân vật (hud.js setLabel) */ document.head.appendChild(st);
  try { const k = C.S.save.sys.ki || (C.S.save.sys.ki = {}); k.tut = 1; } catch (e) { }
  const t0 = C.toast; if (t0 && !t0.__p103) { const f = function (t, big) { if (typeof t === 'string' && (HINT.test(t) || t.length > 70)) { log({ ev: 'hush', t: t.slice(0, 50) }); return; } return t0.call(this, t, big); }; f.__p103 = 1; C.toast = f; }
  const pet = C.S.sys.find(x => x.id === 'pet'); if (pet && pet.hudLines) pet.hudLines = () => [];
  sfxLog(C);
}
/* ghi LOG TIẾNG (Chrome headless không thu tiếng): mỗi lần ctx.sfx(tên) → { t: giây đồng hồ máy (cùng mốc timestamp khung screencast), n: tên, x, y }
   để trộn tiếng chiêu Chấn Thú vào video sau (tools/mix-sfx.py của p108). Có window.__sfxlog của p108 thì vẫn ghi song song bản riêng. */
/* nhật ký tiếng THẬT của audio.js (__audio.log chỉ giữ 50 dòng) → gom đủ vào __sfxlog103a { t: giây đồng hồ máy, n: tên tiếng SFX_LIB, src } mỗi khung */
const AUD = { seen: new Set() };
function audLog() {
  const A = window.__audio; if (!A || !A.log) return; const L = window.__sfxlog103a = window.__sfxlog103a || [], pn = performance.now(), dn = Date.now();
  for (const e of A.log) { const k = e.n + '@' + e.t; if (AUD.seen.has(k)) continue; AUD.seen.add(k); L.push({ t: (dn - (pn - e.t)) / 1000, n: e.n, src: e.src }); }
  try { for (const e of (A.duelLog ? A.duelLog() : [])) { const k = 'd:' + e.n + '@' + e.t; if (AUD.seen.has(k)) continue; AUD.seen.add(k); L.push({ t: (dn - (pn - e.t)) / 1000, n: e.n, src: 'duel' }); } } catch (er) { }
}
function sfxLog(C) {
  const L = window.__sfxlog103 = window.__sfxlog103 || [];
  const s0 = C.sfx; if (s0 && !s0.__p103) { const f = function (n, ...a) { try { L.push({ t: Date.now() / 1000, n: String(n) }); if (L.length > 5000) L.shift(); } catch (e) { } return s0.call(this, n, ...a); }; f.__p103 = 1; C.sfx = f; }
}
/* p110 (bản chiến đấu, anh tự chơi): chỉ bật phần giãn chỗ đứng đồng hành (Rocky ×2 không che người chơi) — không gọi quái, không bot, không ẩn UI. */
export function spacing(C) {
  if (C.S.sys.some(s => s.id === 'spacing103')) return;
  const pet = C.S.sys.find(x => x.id === 'pet'); if (pet && pet.hudLines) pet.hudLines = () => [];   /* thú cưng cũ (Rocky Jr) ở ổ — bỏ dòng 'Rocky Lv 40 · ở ổ' gây nhầm với Rocky golem */
  C.S.sys.push({ id: 'spacing103', always: true, update(dt, ctx) { if (ctx.S.mode !== 'play') return; try { spread(ctx, Math.min(dt, 0.1)); } catch (e) { } } });
}
/* ---------- p110 VIDEO v6 (điều phối 02/11): kịch bản ~110 s trên bản chiến đấu p110 — đội squad104 (Rocky ×2, Elyziuma, Ngưu Sơn) farm bầy thú vùng farm106.
   Nhịp: đi dọc suối (đồng hành lội nước) → khiêu khích bầy quanh 1 thủ lĩnh → khoá thủ lĩnh + G cả đội đánh → (Rocky tự Khiên Ngực khi người bị đánh)
   → Elyziuma tuyệt chiêu Tái Cấu Trúc (p105: NGẬP nước nông) → đánh tiếp trong vùng ngập → bầy tan, +XP → nước tự rút. Không tự sinh quái (dùng bầy farm106). ---------- */
const V = { on: false, t: 0, ph: 0, phT: 0, L: null, goal: null, walkT: 0, clickT: 0, tg: null, log: [], ult: 0, G: 0 };
const vlog = o => { V.log.push({ t: +V.t.toFixed(1), ph: V.ph, ...o }); };
function vWalk(C, x, y) {   /* đi từng chặng ≤ 8 ô (pathTo chỉ tìm trong khung quanh 2 đầu) */
  const p = C.S.player, d = Math.hypot(x - p.x, y - p.y), k = Math.min(1, 128 / (d || 1)); let tx = Math.floor((p.x + (x - p.x) * k) / TS), ty = Math.floor((p.y + (y - p.y) * k) / TS);
  for (let r = 0; r < 4; r++) { let ok = false; for (let dy = -r; dy <= r && !ok; dy++) for (let dx = -r; dx <= r && !ok; dx++) if (free(C, tx + dx, ty + dy)) { tx += dx; ty += dy; ok = true; } if (ok) break; }
  const path = C.pathTo(Math.floor(p.x / TS), Math.floor(p.y / TS), tx, ty, 10);
  if (path && path.length) { p.autoPath = path; p.autoStuck = 0; return true; } return false;
}
function vMob(C) { try { return __f106.list(); } catch (e) { return []; } }
function vAngry(C, r = 190) { const p = C.S.player; return C.monsters.list().filter(o => o.hp > 0 && o.f6 && o.f6.mode !== 'calm' && Math.hypot(o.x - p.x, o.y - p.y) < r); }
function vAttack(C, dt) {   /* người chơi đánh con giận gần nhất (ưu tiên thủ lĩnh đang khoá) bằng đường click thật */
  const p = C.S.player, L = C.monsters.list().filter(o => o.hp > 0 && o.f6 && (o.f6.mode !== 'calm' || o === V.L) && Math.hypot(o.x - p.x, o.y - p.y) < 170 && !wetAt(o.x, o.y) && o.f6.kind !== 'aqua');
  if (V.tg && !L.includes(V.tg)) V.tg = null;
  if (!V.tg && L.length) { L.sort((a, b) => (a === V.L ? -40 : 0) + Math.hypot(a.x - p.x, a.y - p.y) - (b === V.L ? -40 : 0) - Math.hypot(b.x - p.x, b.y - p.y)); V.tg = L[0]; }
  V.clickT -= dt; if (V.tg && V.clickT <= 0) { V.clickT = 0.5; const mon = C.S.sys.find(s => s.id === 'monsters'); try { mon && mon.onClick(C, { wx: V.tg.x, wy: V.tg.y - 4, tx: Math.floor(V.tg.x / TS), ty: Math.floor(V.tg.y / TS) }); } catch (e) { } }
  return !!V.tg;
}
function vStep(C, dt) {
  V.t += dt; V.phT += dt; V.ultCd = (V.ultCd || 0) - dt; const p = C.S.player, go = n => { V.ph = n; V.phT = 0; vlog({ ev: 'phase' }); };
  if (V.ph === 0) {   /* chọn THỦ LĨNH trên bờ gần nhất trong ~700 px (bỏ cá); không có thì bầy thường gần nhất */
    const all = vMob(C).filter(f => f.ct && f.hp > 0 && f.mode === 'calm' && !/cachep|bachkinh/.test(f.sp) && Math.hypot(f.x - p.x, f.y - p.y) < 520);
    const pickL = all.filter(f => f.lead).sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[0] || all.sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[0];
    if (pickL) { V.L = __f106.mo(pickL.id); vlog({ ev: 'target', sp: pickL.sp, lead: pickL.lead, d: Math.round(Math.hypot(pickL.x - p.x, pickL.y - p.y)) }); go(1); }
    else if (V.phT > 2) { try { __f106.respawnIn(0.5); } catch (e) { } V.phT = 0; }
    return;
  }
  if (V.ph === 1) {   /* đi tới gần bầy (đồng hành theo, lội suối nếu qua nước) */
    if (!V.L || !(V.L.hp > 0)) { go(0); return; }
    const d = Math.hypot(V.L.x - p.x, V.L.y - p.y);
    V.walkT -= dt; if (V.walkT <= 0 || !p.autoPath) { V.walkT = 1.2; vWalk(C, V.L.x, V.L.y + 20); }
    if (d < 100 || vAngry(C).length >= 2 || V.phT > 4.5) { p.autoPath = null; go(2); }   /* đi 1 đoạn rồi khiêu khích từ xa — bầy tự lao tới (không đi bộ dài, không kẹt đường) */
    return;
  }
  if (V.ph === 2) {   /* khiêu khích cả bầy quanh mục tiêu */
    if (V.phT < 0.1) { try { const rid = V.L && V.L.f6 && V.L.f6.rid; if (V.L && V.L.hp > 0) __f106.provoke(V.L.id, 'pl'); for (const f of vMob(C).filter(f => f.rid === rid && f.mode === 'calm').slice(0, 7)) __f106.provoke(f.id, 'pl'); } catch (e) { }
      for (const o of vAngry(C, 320)) if (!o.v110) { o.v110 = 1; o.max = Math.round(o.max * 3); o.hp = Math.round(o.hp * 3); }   /* video: bầy bền hơn ×3 để trận đủ dài thấy chiêu (đội quá mạnh, bầy tan sau ~4 s) */ vlog({ ev: 'provoke', n: vAngry(C, 300).length }); }
    vAttack(C, dt); if (V.phT > 3) go(3); return;
  }
  if (V.ph === 3) {   /* khoá thủ lĩnh + lệnh G cả đội; Elyziuma tuyệt chiêu khi ≥ 3 con giận quanh (ngập p105) */
    if (V.phT < 0.1 && V.L && V.L.hp > 0) { try { __sq.lock(V.L); __sq.attack(); V.G++; } catch (e) { } vlog({ ev: 'G' }); }
    const busy = vAttack(C, dt), A = vAngry(C);
    if (A.length >= 2 && V.ultCd <= 0 && V.phT > 1.2) { try { const E = __ely.E(); if (E) E.cd.ult = 0; __ely.cast('ult'); V.ult++; V.ultCd = 16; } catch (e) { } vlog({ ev: 'ult', n: A.length }); }
    if (!busy && !A.length && V.phT > 4) go(4);
    if (V.phT > 45) go(4);
    return;
  }
  if (V.ph === 4) {   /* bầy tan → đứng nhìn chút (nước rút / +XP) rồi bầy kế */
    vAttack(C, dt); if (V.phT > 3) { V.L = null; go(0); }
  }
}
export function start110(C) {
  spacing(C); clean(C); ST.on = false; V.on = true;
  if (!C.S.sys.some(s => s.id === 'video110')) C.S.sys.push({ id: 'video110', always: true, update(dt, ctx) { if (!V.on || ctx.S.mode !== 'play') return; dt = Math.min(dt, 0.1); try { vStep(ctx, dt); } catch (e) { console.error('video110', e); } keepAlive(ctx); const now = performance.now(); ST.fr.push(now); while (ST.fr.length && now - ST.fr[0] > 1000) ST.fr.shift(); } });
  window.__fps103 = () => ({ fps: ST.fr.length, t: +V.t.toFixed(1), ph: V.ph });
  window.__v110 = { state: () => ({ t: +V.t.toFixed(1), ph: V.ph, L: V.L && { sp: V.L.f6 && V.L.f6.sp, hp: Math.round(V.L.hp), x: Math.round(V.L.x), y: Math.round(V.L.y) }, ult: V.ult, G: V.G, p: { x: Math.round(C.S.player.x), y: Math.round(C.S.player.y) } }), log: () => V.log.slice(), stop: () => { V.on = false; } };
}
export function start(C) {
  const q = new URLSearchParams(location.search);
  ST.C = C; ST.on = true; ST.q = { bot: q.get('bot103') !== '0', wave: q.get('wave103') !== '0', clean: q.get('clean103') !== '0', lead: q.get('lead103') !== '0' };
  if (ST.q.clean) clean(C);
  try { C.monsters.list().filter(o => !(o.c && (o.c.fct || o.c.spar))).forEach(o => C.monsters.remove(o)); } catch (e) { }
  survey(C);
  const p = C.S.player; p.x = ST.spot.x; p.y = ST.spot.y; p.dir = 0; p.autoPath = null;
  try { const pt = C.S.save.sys.pet && C.S.save.sys.pet.pet; ST.pet0 = pt && pt.hp; } catch (e) { }
  if (window.__pet && __pet.place) try { __pet.place(p.x - 26, p.y + 2); } catch (e) { }
  if (!C.S.sys.some(s => s.id === 'farm103')) C.S.sys.push(SYS);
  window.__fps103 = () => ({ fps: ST.fr.length, t: +ST.t.toFixed(1), n: ST.mons.length });
  window.__farm103 = {
    state: () => ({ t: +ST.t.toFixed(1), on: ST.on, q: ST.q, spot: ST.spot, patrol: ST.patrol, pi: ST.pi, tg: ST.tg && ST.tg.c.key, n: { ...ST.n },
      mons: ST.mons.map(o => ({ k: o.c.key, cat: o.cat103, x: Math.round(o.x), y: Math.round(o.y), hp: Math.round(o.hp), max: o.max, wet: wetAt(o.x, o.y) })),
      p: { x: Math.round(p.x), y: Math.round(p.y), hp: window.__hero && __hero.state().hp }, lead: ST.lead && { sp: ST.lead.lsp, cat: ST.lead.cat103, hp: Math.round(ST.lead.hp), x: Math.round(ST.lead.x), y: Math.round(ST.lead.y) } }),
    log: () => ST.log.slice(), spawn: (cat, n = 1) => spawn(C, cat, n), leader: cat => !!spawnLeader(C, cat || 's'), stop: () => { ST.on = false; }, go: () => { ST.on = true; }, set: o => Object.assign(ST.q, o), ST };
  log({ ev: 'start', spot: [Math.round(ST.spot.x), Math.round(ST.spot.y)] });
}
