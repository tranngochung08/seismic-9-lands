/* scenes113.js — p114fx: cảnh VFX mẫu trên lõi pxfx113 (cách pixelfx: nét + ánh sáng, khối mờ trong suốt, hạt có vật lý, đòn theo nhịp gồng → khựng → phản ứng → hồi).
   Kỹ thuật chuyển thể từ pixelfx (https://github.com/patch-gg/pixelfx) — MIT License, Copyright (c) 2026 Patch, Copyright (c) 2026 Hugo Duprez
   (impacts/blunt-hit: cục trắng nóng + nêm mực + vòng bụi; arcane-beam: tia nhiều dải + chớp gốc; sim.js: hạt / mảnh / đèn). Thiết kế riêng cho chiêu game.
   4 chiêu mẫu (mỗi chiêu 3 bản a|b|c, chọn bằng VAR113 hoặc ?fx113=stamp:b,flare:a,ult:c,fist:b):
     Elyziuma  stamp  Ký Duyệt       — gồng: mực đỏ hút về tay → dấu bay xoay có vệt → ĐÓNG xuống (khựng) → ấn tròn trên đất mờ dần
               flare  Kính Lóe       — gồng: lóe sao trên kính → chớp 8 tia + nón tia sáng + bóng lens flare → tia co về kính
               ult    Tái Cấu Trúc   — gồng: vòng sơ đồ nghiêng mọc dưới chân + dữ liệu xoáy vào → nối dây tới từng mục tiêu → cột sáng + sóng vòng (khựng) → tàn
     Rocky     fist   Nắm Đấm Đá Bay — gồng: vân magma sáng ở nắm tay + sạn hút vào → bụi bung ở gốc → vệt bụi + sạn khi bay → cú TRÚNG kiểu blunt-hit (khựng)
   Toạ độ thế giới px logic; painter vẽ theo ĐIỂM (×2). */
import { Rng, Particles, Bits, Lights, P, PF, B, pal, hex, mix, scale, WHITE, TAU, clamp, ease, bump, sparkle, flare, band, blob, wedges, drawWedges, bayer, move } from './pxfx113.js';

export const VAR113 = { stamp: 'b', flare: 'a', ult: 'b', fist: 'c' };   /* anh duyet 03/11: theo de xuat */
try { const q = new URLSearchParams(location.search).get('fx113'); if (q) for (const kv of q.split(',')) { const [k, v] = kv.split(':'); if (k in VAR113 && /^[a-e]$/.test(v)) VAR113[k] = v; } } catch (e) { }
const K = 2, Q = v => v * K;   /* px logic → điểm */
const INKC = hex('#1a0c10');

/* nhịp đòn (đọc từ elyz95 / rktk — KHÔNG tự bịa): wind = thời gian gồng trước khung tung; hits.t tính từ khung tung */
export const MOVES = {
  stamp: move({ wind: 0.32, hits: [{ t: 0.34, stop: 0.07, shake: 0.1, flash: 0.12, push: 30 }], rec: 0.6 }),
  flare: move({ wind: 0.28, hits: [{ t: 0.0, stop: 0.05, shake: 0.06, flash: 0.16, push: 40 }], rec: 0.3 }),
  ult: move({ wind: 0.95, hits: [{ t: 0.0, stop: 0.12, shake: 0.35, flash: 0.3, push: 230 }], rec: 0.9 }),
  fist: move({ wind: 0.16, hits: [{ t: 0.0, stop: 0.06, shake: 0.12, flash: 0.1, push: 150 }], rec: 0.4 }),
};

/* ===================== Ký Duyệt ===================== */
/* gồng: tay Elyziuma (hx, hy) — mực đỏ hút vào, ấn tròn nhỏ hiện dần */
export function stampWind(E, o = {}) {
  const C = pal(o.pal || 'dau', o.palo), R = new Rng(o.seed || 3), ps = new Particles({ rng: R }), T = 0.34;
  const hand = () => ({ x: Q(E.x + E.fx * 11), y: Q(E.y - 25) }); let acc = 0;
  return { T, box() { const h = hand(); return [h.x / K - 30, h.y / K - 30, h.x / K + 30, h.y / K + 30]; },
    update(dt, I) { ps.update(dt); acc += dt * 70; const h = hand(); for (; acc > 1; acc--) { if (I.t > T - 0.06) continue; const a = R.range(0, TAU), d = R.range(22, 44);
      ps.spawn(P.STREAK, h.x + Math.cos(a) * d, h.y + Math.sin(a) * d * 0.8, -Math.cos(a) * R.range(40, 70), -Math.sin(a) * R.range(40, 70) * 0.8, R.range(0.12, 0.22), R.chance(0.4) ? C[6] : C[5]); } },
    draw(p, layer, t) { const h = hand(), k = clamp(t / T); ps.draw(p);
      p.glow(h.x, h.y, 10 + 18 * k, C[5], 0.25 + 0.35 * k);
      p.ring(h.x, h.y, 3 + 5 * k, 1.5, C[6], 0.6 + 0.4 * k); if (k > 0.6) sparkle(p, h.x, h.y, 2 + 4 * (k - 0.6) / 0.4, C[6], C[5], 0.5); } };
}
/* bay + đóng: sx, sy (điểm bắt đầu), mo (mục tiêu, getter vị trí), i (thứ tự), delay i*0.07, chạm ở 0.34 (như elyz95) */
export function stampFly(E, mo, i, o = {}) {
  const v = o.v || VAR113.stamp, C = pal(o.pal || 'dau', o.palo), W0 = pal('rocky'), R = new Rng(17 + i * 7), ps = new Particles({ rng: R, ground: () => gy }), bits = new Bits({ ground: () => gy }), L = new Lights();
  const D = i * 0.07, TH = 0.34, sx = Q(E.x + E.fx * 11), sy = Q(E.y - 25); let gx = Q(mo.x), gy = Q(mo.y), hit = false, ht = 0, wd = null, PH = R.range(0, TAU), x = sx, y = sy, ang = 0, trail = [];
  const head = () => ({ x: Q(mo.x), y: Q(mo.y - 16) });
  function stampAt(p, X, Y, a, sq = 1, al = 1) {   /* dấu mộc 7×9 điểm xoay: cán gỗ sẫm, mặt đỏ, viền mực */
    p.place(X, Y, false, a); p.shade(-10, -13, 10, 13, (lx0, ly0, out) => { const lx = lx0 / 1.8, ax = Math.abs(lx), yy = ly0 / 1.8 / sq; if (yy < -6 || yy > 5) return;
      const face = yy > 1.5, w = face ? 4.6 : yy < -3.5 ? 2.2 : 3.2; if (ax > w) return; out.a = al; const edge = ax > w - 1 || yy > 4.2 || yy < -5.2;
      return edge ? INKC : face ? (lx < -1 ? C[6] : C[5]) : (lx < -0.5 ? W0[3] : W0[2]); }); p.place(0, 0); }
  return { T: D + TH + 0.75, hitT: D + TH,
    box() { const xs = [sx, gx, x], ys = [sy, gy - 60, y]; return [Math.min(...xs) / K - 26, Math.min(...ys) / K - 24, Math.max(...xs) / K + 26, gy / K + 14]; },
    update(dt, I) { const t = I.t - D; ps.update(dt); bits.update(dt); L.update(dt); if (t < 0) return;
      if (!hit) { gx = Q(mo.x); gy = Q(mo.y); const k = clamp(t / TH), h = head();
        if (v === 'b') { const up = k < 0.45, u = up ? ease.outCubic(k / 0.45) : ease.inCubic((k - 0.45) / 0.55); x = up ? sx + (h.x - sx) * u * 0.7 : sx + (h.x - sx) * (0.7 + 0.3 * u); y = up ? sy - 70 * u : sy - 70 + (h.y - (sy - 70)) * u; ang = up ? u * TAU : TAU; }
        else { x = sx + (h.x - sx) * k; y = sy + (h.y - sy) * k - Math.sin(k * Math.PI) * 34; ang = k * TAU * 1.5; }
        trail.push([x, y, ang]); if (trail.length > 5) trail.shift();
        if (R.chance(0.5)) ps.spawn(P.EMBER, x + R.range(-3, 3), y + R.range(-3, 3), R.range(-20, 20), R.range(-30, 0), R.range(0.2, 0.4), C[6], 1);
        if (t >= TH) { hit = true; ht = 0; I.freeze(MOVES.stamp.def.hits[0].stop); wd = wedges(R, v === 'c' ? 10 : 7, 9, v === 'c' ? 20 : 13);
          const h2 = head(); x = h2.x; y = h2.y; L.add(x, y, 46, C[5], 0.7, 0.35); L.add(x, y, 16, WHITE, 0.7, 0.08); L.add(gx, gy, 40, C[5], 0.3, 0.6);
          for (let k2 = 0; k2 < (v === 'c' ? 26 : 16); k2++) { const a = R.range(0, TAU), s = R.range(60, 200); ps.spawn(P.SPARK, x, y, Math.cos(a) * s, Math.sin(a) * s - 50, R.range(0.25, 0.55), C[6], 1); }
          for (let k2 = 0; k2 < (v === 'c' ? 14 : 7); k2++) { const a = -Math.PI / 2 + R.range(-1.4, 1.4), s = R.range(50, 150); ps.spawn(P.GRIT, x + R.range(-4, 4), y, Math.cos(a) * s, Math.sin(a) * s, R.range(0.5, 0.9), k2 % 3 ? C[4] : C[2], R.chance(0.4) ? 2 : 1); }   /* giọt mực */
          for (let k2 = 0; k2 < 6; k2++) ps.spawn(P.DUST, gx + R.range(-14, 14), gy + R.range(-3, 3), R.range(-40, 40), R.range(-10, 4), R.range(0.35, 0.6), mix(C[6], WHITE, 0.4), R.range(3, 6)); } }
      else ht += dt; },
    draw(p, layer, tt) { const t = tt - D; if (t < 0) return;
      if (layer === 'ground') {   /* ấn tròn trên đất: mực đỏ 2 vòng + dấu chéo, mờ dither dần */
        if (!hit || v === 'c') return; const q = ht / 0.7, a = q < 0.6 ? 1 : 1 - (q - 0.6) / 0.4, r = (v === 'b' ? 26 : 20) * (q < 0.08 ? 0.6 + 5 * q : 1);
        p.ellipse(gx, gy, r + 2, (r + 2) * 0.5, (d) => (d > 0.86 ? C[3] : d > 0.7 ? C[5] : 0), a); p.ellipse(gx, gy, r * 0.62, r * 0.31, d => (d > 0.78 ? C[4] : 0), a);
        for (let s = -1; s <= 1; s += 2) p.line(gx - r * 0.42, gy - s * r * 0.12, gx + r * 0.42, gy + s * r * 0.12, C[5], a);
        if (q < 0.25) p.glow(gx, gy, r * 2, C[5], 0.35 * (1 - q / 0.25)); return; }
      ps.draw(p); bits.draw(p);
      if (!hit) { trail.forEach(([tx, ty, ta], j) => { if (j < trail.length - 1) stampAt(p, tx, ty, ta, 1, 0.2 + j * 0.1); }); if (trail.length > 1) { const [ax0, ay0] = trail[0]; p.line(ax0, ay0, x, y, uu => (uu > 0.6 ? C[6] : C[4]), uu => uu); } stampAt(p, x, y, ang); p.glow(x, y, 18, C[5], 0.4); }
      else { const ft = ht; if (ft < 0.1) { const sq = ft < 0.04 ? 0.6 : 1; stampAt(p, x, y + (ft < 0.04 ? 3 : 0), 0, sq); }
        if (ft < 0.06) blob(p, x, y + 4, ft < 0.025 ? 9 : 11, ft < 0.025 ? 0 : 1, C, PH, 0.75);
        drawWedges(p, wd, x, y + 4, ft, INKC, WHITE, C[6], 0.8);
        if (v === 'c' && ft < 0.6) { const q = ft / 0.6, r = 10 + 10 * ease.outCubic(q); p.ring(x, y - 18, r, 2, C[6], 1 - q); if (q < 0.5) sparkle(p, x, y - 18 - r, 3, C[6], C[5], 0.4); }
        if (v !== 'c' && ft < 0.35) band(p, gx, gy, 10 + 34 * ease.outCubic(ft / 0.35), 0.5, 3, 1 - ft / 0.35, C, () => true, ft < 0.08); }
      L.draw(p); } };
}

/* ===================== Kính Lóe ===================== */
/* e = getter vị trí kính (px logic) {x, y}; dir (fx, fy); R bán kính nón, H nửa góc */
export function flareCast(E, eye, Rr, Hh, o = {}) {
  const v = o.v || VAR113.flare, C = pal(o.pal || 'kinh', o.palo), Cm = pal('ma'), R = new Rng(o.seed || 5), ps = new Particles({ rng: R }), L = new Lights();
  const W = MOVES.flare.def.wind, T = W + 0.5, a0 = Math.atan2(E.fy, E.fx), RR = Q(Rr), HH = Hh;
  const rays = Array.from({ length: 19 }, (_, i) => ({ b: (i / 18 - 0.5) * 2 * HH * R.range(0.85, 1), len: R.range(0.7, 1), w: i % 3 === 0 ? 2 : 1, ph: R.range(0, TAU) })); let fired = false, acc = 0;
  const ghosts = [{ d: 0.32, r: 5, c: Cm[6] }, { d: 0.56, r: 9, c: C[4] }, { d: 0.78, r: 4, c: Cm[5] }, { d: 0.95, r: 7, c: C[5] }];
  return { T, layers: ['body'],
    box() { const e = eye(); return [e.x - Rr - 16, e.y - Rr - 16, e.x + Rr + 16, e.y + Rr + 16]; },
    update(dt, I) { ps.update(dt); L.update(dt); const e = eye(), X = Q(e.x), Y = Q(e.y);
      if (I.t < W) { acc += dt * 60; for (; acc > 1; acc--) { const b = a0 + R.range(-HH, HH), d = R.range(18, 40); ps.spawn(P.STREAK, X + Math.cos(b) * d, Y + Math.sin(b) * d * 0.85, -Math.cos(b) * 60, -Math.sin(b) * 50, R.range(0.1, 0.2), R.chance(0.5) ? C[6] : Cm[6]); } }
      else if (!fired) { fired = true; L.add(X, Y, 34, C[6], 0.5, 0.25); L.add(X, Y, 18, WHITE, 1, 0.08);
        for (let k = 0; k < 18; k++) { const b = a0 + R.range(-HH, HH), s = R.range(120, 320); ps.spawn(P.MOTE, X, Y, Math.cos(b) * s, Math.sin(b) * s * 0.85, R.range(0.2, 0.4), k % 2 ? C[6] : Cm[6], 1); }
        for (let k = 0; k < 8; k++) ps.spawn(P.STAR, X + Math.cos(a0) * R.range(30, RR * 0.8) + R.range(-10, 10), Y + Math.sin(a0) * R.range(30, RR * 0.7) + R.range(-10, 10), 0, -6, R.range(0.35, 0.6), C[6], R.range(2, 4)); }
      else if (!I.fz2 && I.t - W >= 0.07) { I.fz2 = 1; I.freeze(MOVES.flare.def.hits[0].stop); } },   /* khựng ĐÚNG khung tia đã mọc đủ (hero frame) */
    draw(p, layer, t) { const e = eye(), X = Q(e.x), Y = Q(e.y);
      if (t < W) { const k = t / W; ps.draw(p); sparkle(p, X, Y, 1 + 5 * k, C[6], Cm[6], 0.3 + 0.5 * k); p.glow(X, Y, 8 + 14 * k, C[6], 0.3 + 0.4 * k); return; }
      const u = t - W, grow = clamp(u / 0.07), fade = u < 0.18 ? 0 : clamp((u - 0.18) / 0.3), back = fade * 0.95;   /* tia mọc từ kính trong 0,07 s, giữ, co về kính */
      if (u < 0.06) flare(p, X, Y, 26 * (1 - u / 0.06 * 0.4), 0.8, C);
      if (v === 'b' || (v === 'a' && u < 0.16)) {   /* a: chỉ loé mờ 0,16 s dưới các tia; nón đặc nhiều dải: lõi trắng → ngọc → mép dither */
        const L0 = RR * grow, L1 = RR * back;
        p.shade(X - RR, Y - RR, X + RR, Y + RR, (x, y, out) => { const dx = x - X, dy = (y - Y) / 0.85, d = Math.hypot(dx, dy); if (d < 4 || d > L0 || d < L1) return; let b = Math.atan2(dy, dx) - a0; b = Math.atan2(Math.sin(b), Math.cos(b)); const q = Math.abs(b) / HH; if (q > 1) return;
          const r = d / RR, s = q + r * 0.35 + 0.08 * Math.sin(d * 0.3 - u * 40), al = (1 - r * 0.6) * (1 - fade * 0.7); out.a = (q > 0.8 ? al * (1 - q) * 5 : al) * (v === 'a' ? 0.3 * (1 - u / 0.16) : 1); out.k = 0.18 * (1 - r) * (1 - fade); return s < 0.25 ? WHITE : s < 0.5 ? C[6] : s < 0.75 ? C[5] : C[4]; }); }
      if (v !== 'b') {   /* a / c: các tia nét 1–2 điểm, sáng ở lõi; c = 1 dải quét ngang nón */
        const sweep = v === 'c' ? clamp(u / 0.16) : 1;
        for (const r0 of rays) { const b = v === 'c' ? a0 + (sweep * 2 - 1) * HH * 0.9 + r0.b * 0.25 : a0 + r0.b, len = RR * r0.len * grow, st = RR * r0.len * back, ca = Math.cos(b), sa = Math.sin(b) * 0.85;
          if (len <= st + 2) continue; const q = Math.abs(r0.b) / HH;
          p.line(X + ca * Math.max(4, st), Y + sa * Math.max(4, st), X + ca * len, Y + sa * len, uu => (uu < 0.3 && q < 0.5 ? WHITE : uu < 0.6 ? C[6] : C[5]), uu => (uu < 0.7 ? 1 : 1.5 - uu) * (1 - fade * 0.5));
          if (r0.w > 1) p.line(X + ca * Math.max(4, st) + 1, Y + sa * Math.max(4, st), X + ca * len * 0.7 + 1, Y + sa * len * 0.7, C[6], 1 - fade);
          p.glowLine(X + ca * st, Y + sa * st, X + ca * len * 0.8, Y + sa * len * 0.8, 6, C[5], 0.12 * (1 - fade)); } }
      if (v !== 'b' || true) for (const gh of ghosts) { const d = RR * gh.d * grow, gxx = X + Math.cos(a0) * d, gyy = Y + Math.sin(a0) * d * 0.85, al = (1 - fade) * 0.5;   /* bóng lens flare: vòng / lục giác trong suốt dọc trục */
        if (al <= 0.02 || d < 6) continue; p.disc(gxx, gyy, gh.r, gh.c, dd => al * (dd > 0.75 ? 0.9 : 0.28)); }
      p.glow(X, Y, 20, C[6], 0.6 * (1 - fade)); ps.draw(p); L.draw(p); } };
}

/* ===================== Tái Cấu Trúc ===================== */
/* E: Elyziuma, tgs: getter danh sách mục tiêu [{x, y}], Rh: bán kính đánh thật, holes: getter vật cần chừa (người chơi, đồng hành) */
export function ultCast(E, tgs, Rh, holes, o = {}) {
  const v = o.v || VAR113.ult, C = pal(o.pal || 'ma', o.palo), Cw = pal('kinh'), Cv = pal('navy'), R = new Rng(o.seed || 11), ps = new Particles({ rng: R, ground: x => GY + 30 }), L = new Lights(), bits = new Bits();
  const W = MOVES.ult.def.wind, T = W + 1.0, X0 = Q(E.x), GY = Q(E.y), RH = Q(Math.max(40, Rh)), RC = Q(34); let hitd = false, list = [], acc = 0, PH = R.range(0, TAU);
  const near = (x, y, r) => (holes ? holes() : []).some(h => { const dx = x - Q(h.x), dy = (y - Q(h.y)) * 2; return dx * dx + dy * dy < r * r; });
  const nodes = Array.from({ length: 6 }, (_, i) => ({ a: i / 6 * TAU + 0.3 }));
  return { T, layers: ['ground', 'body'],
    box() { return [E.x - Rh - 24, E.y - Rh * 0.5 - 130, E.x + Rh + 24, E.y + Rh * 0.5 + 24]; },
    update(dt, I) { ps.update(dt); L.update(dt); bits.update(dt); const t = I.t;
      if (t < W) { if (t > 0.6 && !list.length) list = tgs().map(m => ({ x: Q(m.x), y: Q(m.y) }));
        acc += dt * (v === 'b' ? 90 : 50); for (; acc > 1; acc--) { const a = R.range(0, TAU), d = R.range(RC * 0.9, RC * 2.2), sp = R.range(60, 110);
          ps.spawn(v === 'b' ? P.MOTE : P.GLYPH, X0 + Math.cos(a) * d, GY + Math.sin(a) * d * 0.5 - R.range(0, 30), -Math.cos(a + 0.9) * sp, -Math.sin(a + 0.9) * sp * 0.5, R.range(0.25, 0.45), R.chance(0.5) ? C[6] : Cw[6], 1); } }
      else if (!hitd) { hitd = true; I.freeze(MOVES.ult.def.hits[0].stop); if (!list.length) list = tgs().map(m => ({ x: Q(m.x), y: Q(m.y) }));
        L.add(X0, GY - 20, 64, C[6], 0.3, 0.45); L.add(X0, GY - 20, 30, WHITE, 0.9, 0.1);
        for (const m of list) { L.add(m.x, m.y - 20, 36, Cw[6], 0.4, 0.35); for (let k = 0; k < 10; k++) { const a = R.range(0, TAU), s = R.range(60, 220); ps.spawn(P.SPARK, m.x, m.y - 16, Math.cos(a) * s, Math.sin(a) * s - 80, R.range(0.25, 0.6), Cw[6], 1); }
          for (let k = 0; k < 6; k++) ps.spawn(P.GLYPH, m.x + R.range(-8, 8), m.y - 20, R.range(-60, 60), R.range(-160, -60), R.range(0.6, 1), k % 2 ? C[6] : WHITE, 1); }
        for (let k = 0; k < 24; k++) ps.spawn(P.EMBER, X0 + R.range(-RH * 0.6, RH * 0.6), GY + R.range(-RH * 0.25, RH * 0.25), R.range(-10, 10), R.range(-50, -20), R.range(0.6, 1.2), k % 2 ? C[6] : Cw[5], 1); } },
    draw(p, layer, t) {
      const wk = clamp(t / W), u = t - W, fade = u < 0.25 ? 0 : clamp((u - 0.25) / 0.7);
      if (layer === 'ground') {
        /* vòng sơ đồ nghiêng dưới chân (a, c) / đĩa xoáy dữ liệu (b) */
        const rc = RC * ease.outCubic(clamp(t / 0.5)) * (u > 0 ? 1 + 0.3 * ease.outCubic(clamp(u / 0.2)) : 1), al = (u < 0 ? 0.5 + 0.5 * wk : 1) * (1 - fade);
        if (al > 0.02) {
          if (v === 'b') { const spin = t * (u < 0 ? 3 + 8 * wk : 2); p.shade(X0 - rc - 2, GY - rc * 0.5 - 2, X0 + rc + 2, GY + rc * 0.5 + 2, (x, y, out) => { const dx = x - X0, dy = (y - GY) * 2, d = Math.hypot(dx, dy); if (d > rc || d < 5) return; const a = Math.atan2(dy, dx), s = 0.5 + 0.5 * Math.cos(3 * (a - spin) + d * 0.18);
              const I2 = s * (0.4 + 0.6 * (1 - d / rc)); if (I2 < 0.3) return; out.a = al * (I2 < 0.45 ? 0.6 : 1); out.k = 0.12 * I2; return I2 > 0.85 ? WHITE : I2 > 0.65 ? C[6] : I2 > 0.5 ? C[5] : C[4]; }); }
          else { band(p, X0, GY, rc, 0.5, 2.5, al, C); band(p, X0, GY, rc * 0.62, 0.5, 1.5, al * 0.9, C);
            for (const n of nodes) { const a = n.a + t * 0.6, nx = X0 + Math.cos(a) * rc * 0.62, ny = GY + Math.sin(a) * rc * 0.31, nx2 = X0 + Math.cos(a) * rc, ny2 = GY + Math.sin(a) * rc * 0.5;
              p.line(nx, ny, nx2, ny2, C[5], al); p.ellipse(nx2, ny2, 3, 1.6, d => (d < 0.5 ? WHITE : C[6]), al); } }
          p.glow(X0, GY, rc * 0.9, C[5], 0.14 * al); }
        /* dây nối tới mục tiêu (0,6 s → tung): đường gãy dữ liệu chạy tới, ấn nhỏ dưới chân mục tiêu */
        if (list.length && fade < 1) for (const m of list) { const k = u < 0 ? clamp((t - 0.6) / (W - 0.6)) : 1, ex = X0 + (m.x - X0) * ease.outCubic(k), ey = GY + (m.y - GY) * ease.outCubic(k), al2 = 1 - fade;
          if (v === 'c') { let px0 = X0, py0 = GY; const n = 6; for (let s = 1; s <= n; s++) { const q = s / n; if (q > k + 0.001) break; const jx = s < n ? R.range(-6, 6) : 0, jy = s < n ? R.range(-3, 3) : 0, nx = X0 + (m.x - X0) * q + jx, ny = GY + (m.y - GY) * q + jy; p.line(px0, py0, nx, ny, s % 2 ? Cw[6] : WHITE, al2); px0 = nx; py0 = ny; } }
          else p.line(X0, GY, ex, ey, uu => (Math.floor(uu * 24 - t * 30) % 3 === 0 ? WHITE : C[6]), al2 * 0.9);
          p.glowLine(X0, GY, ex, ey, 5, C[5], 0.1 * al2);
          if (k >= 1) { const r = 9 + (u > 0 ? 8 * ease.outCubic(clamp(u / 0.2)) : 0); p.ellipse(m.x, m.y + 1, r, r * 0.5, d => (d > 0.75 ? C[6] : d > 0.6 ? C[4] : 0), al2); } }
        /* sóng vòng quét tới Rh lúc tung (nửa xa ở lớp đất) */
        if (u > 0 && u < 0.5) { const q = u / 0.5, r = RC + (RH - RC) * ease.outCubic(Math.max(q, 0.06)); band(p, X0, GY, r, 0.5, 5 * (1 - q) + 1.5, 1 - q, Cw, a => !near(X0 + Math.cos(a) * r, GY + Math.sin(a) * r * 0.5, 22), q < 0.12); p.glowRing(X0, GY, r, 10, C[6], 0.25 * (1 - q), 0.5); }
        return; }
      /* lớp thân: dữ liệu xoáy, cột sáng ở mục tiêu, hạt */
      ps.draw(p); bits.draw(p);
      if (u < 0) { const k = wk; p.glow(X0, GY - 50, 10 + 20 * k, C[6], 0.2 + 0.4 * k); if (k > 0.7) sparkle(p, X0 + Q(E.fx * 4), GY - 46, 2 + 4 * (k - 0.7) / 0.3, C[6], C[5], 0.5); }
      else if (u < 0.45) for (const m of list) { const q = u / 0.45, w = (q < 0.2 ? 9 : 9 * (1 - (q - 0.2) / 0.8)) + 1, H = 120 * Math.min(1, 0.55 + q * 6);   /* khung khựng đã thấy cột */
        p.beam(m.x, m.y - H, m.x, m.y - 2, w, (uu, vv) => (vv < 0.3 ? WHITE : vv < 0.65 ? Cw[6] : C[6]), (uu, vv) => (uu < 0.15 ? uu / 0.15 : 1) * (vv > 0.8 ? 0.6 : 1));
        p.glowLine(m.x, m.y - H, m.x, m.y, 10, Cw[6], 0.35 * (1 - q)); if (q < 0.12) blob(p, m.x, m.y - 14, 9, q < 0.05 ? 0 : 1, Cw, PH, 1); }
      L.draw(p); } };
}

/* ===================== Nắm Đấm Đá Bay (Rocky) ===================== */
/* gồng ở nắm tay: o = getter gốc (px logic) */
export function fistWind(org, o = {}) {
  const C = pal('magma'), D0 = pal('rocky'), R = new Rng(o.seed || 21), ps = new Particles({ rng: R }), T = 0.2; let acc = 0;
  return { T, box() { const g = org(); return [g.x - 24, g.y - 24, g.x + 24, g.y + 24]; },
    update(dt, I) { ps.update(dt); const g = org(), X = Q(g.x), Y = Q(g.y); acc += dt * 80; for (; acc > 1; acc--) { if (I.t > 0.15) break; const a = R.range(0, TAU), d = R.range(16, 32);
      ps.spawn(R.chance(0.6) ? P.STREAK : P.GRIT, X + Math.cos(a) * d, Y + Math.sin(a) * d, -Math.cos(a) * 80, -Math.sin(a) * 80, R.range(0.1, 0.18), R.chance(0.5) ? C[5] : D0[5], 1); } },
    draw(p, layer, t) { const g = org(), X = Q(g.x), Y = Q(g.y), k = clamp(t / 0.16); ps.draw(p); p.glow(X, Y, 8 + 14 * k, C[4], 0.3 + 0.4 * k);
      for (let i = 0; i < 4; i++) { const a = i * 1.7 + 0.4, l = 2 + 4 * k; p.line(X, Y, X + Math.cos(a) * l, Y + Math.sin(a) * l, C[5 + (i % 2)], k); } } };   /* vân nứt magma loé ở nắm tay */
}
/* vệt bay: q = đạn nắm đấm của rktk (q.x, q.y, q.ang, q.back) — sống tới khi q mất + 0,6 s */
export function fistTrail(q, alive, o = {}) {
  const v = o.v || VAR113.fist, C = pal('magma'), Dd = pal('dust'), R = new Rng(o.seed || 23), ps = new Particles({ rng: R }); let gone = 0, acc = 0, lx = Q(q.x), ly = Q(q.y), x0 = lx, y0 = ly;
  return { T: 9, box() { return [Math.min(q.x, x0 / K) - 40, Math.min(q.y, y0 / K) - 40, Math.max(q.x, x0 / K) + 40, Math.max(q.y, y0 / K) + 40]; },
    update(dt, I) { ps.update(dt); const X = Q(q.x), Y = Q(q.y);
      if (!alive()) { gone += dt; if (gone > 0.6) I.T = I.t; return; }
      if (I.t < 0.05 && !I.mz) { I.mz = 1; for (let k = 0; k < 8; k++) { const a = q.ang + Math.PI + R.range(-1.2, 1.2), s = R.range(30, 90); ps.spawn(P.DUST, X, Y + 4, Math.cos(a) * s, Math.sin(a) * s * 0.5, R.range(0.3, 0.5), Dd[5], R.range(3, 5)); } }   /* bụi bung ở gốc lúc tung */
      acc += dt * 60; const ux = Math.cos(q.ang), uy = Math.sin(q.ang);
      for (; acc > 1; acc--) { if (q.back) { if (R.chance(0.3)) ps.spawn(P.DUST, X, Y + 6, 0, 0, 0.3, Dd[4], 2); continue; }
        ps.spawn(P.DUST, X - ux * 10 + R.range(-3, 3), Y - uy * 8 + R.range(-3, 3), -ux * 30, -uy * 30 - 6, R.range(0.25, 0.45), R.chance(0.5) ? Dd[5] : Dd[4], R.range(2.5, 4.5));
        if (R.chance(0.5)) ps.spawn(P.MOTE, X - ux * 8, Y + R.range(-6, 6), -ux * 160, -uy * 160, R.range(0.08, 0.14), Dd[6], 1);
        if (v !== 'a' && R.chance(0.35)) ps.spawn(P.EMBER, X - ux * 6, Y + R.range(-4, 4), -ux * 40 + R.range(-15, 15), R.range(-30, 0), R.range(0.2, 0.4), C[5], 1); }
      lx = X; ly = Y; },
    draw(p) { ps.draw(p); if (alive() && !q.back) p.glow(Q(q.x), Q(q.y), 14, v === 'a' ? Dd[6] : C[4], v === 'a' ? 0.15 : 0.3); } };
}
/* cú trúng nắm đấm (blunt-hit kiểu đá): x, y = điểm trúng (px logic), gy = chân mục tiêu, ang = hướng bay */
export function fistImpact(x, y, gyL, ang, o = {}) {
  const v = o.v || VAR113.fist, C = pal(v === 'a' ? 'dust' : 'magma'), D0 = pal('rocky'), Dd = pal('dust'), R = new Rng(o.seed || 29), X = Q(x), Y = Q(y), GY = Q(gyL);
  const ps = new Particles({ rng: R, ground: () => GY, sparks: ['#fff8e0', '#ffe9a0', '#f08a2a', '#c8501a'] }), bits = new Bits({ ground: () => GY }), L = new Lights(), PH = R.range(0, TAU), W = wedges(R, 9, 10, v === 'c' ? 18 : 14);
  L.add(X, Y, 50, v === 'a' ? Dd[6] : C[5], 0.55, 0.4); L.add(X, Y, 16, WHITE, 0.7, 0.07); L.add(X, GY, 36, v === 'a' ? Dd[6] : C[4], 0.25, 0.4);
  const puffs = Array.from({ length: v === 'c' ? 34 : 24 }, (_, i) => { const a = (i / 24) * TAU + R.range(-0.12, 0.12), side = Math.abs(Math.cos(a)), s = R.range(40, 140) * (0.6 + 0.5 * side); return { x: X + Math.cos(a) * 9, y: Y + Math.sin(a) * 6, vx: Math.cos(a) * s + Math.cos(ang) * 40, vy: Math.sin(a) * s * 0.5, r: R.range(2.4, 6) * (0.75 + 0.35 * side), life: R.range(0.35, 0.8), max: 0, t0: R.range(0.02, 0.08), lift: R.range(4, 16) }; });
  for (const q of puffs) q.max = q.life;
  for (let i = 0; i < (v === 'c' ? 9 : 6); i++) { const s = R.sign(), a = -Math.PI / 2 + s * R.range(0.4, 1.3), sp = R.range(80, 170); bits.add({ kind: B.CHUNK, x: X + s * R.range(3, 8), y: Y + R.range(-3, 3), vx: Math.cos(a) * sp + Math.cos(ang) * 50, vy: Math.sin(a) * sp, g: 1, drag: 0.6, bounce: 0.3, life: R.range(0.7, 1.0), a: R.range(0, TAU), va: s * R.range(8, 16), s: R.chance(0.4) ? 3 : 2, ramp: D0 }); }
  if (v !== 'a') for (let i = 0; i < 14; i++) { const a = ang + R.range(-1.3, 1.3), sp = R.range(90, 260); ps.spawn(P.SPARK, X, Y, Math.cos(a) * sp, Math.sin(a) * sp - 60, R.range(0.25, 0.55), 0, 1); }
  for (let i = 0; i < 8; i++) ps.spawn(P.GRIT, X + R.range(-4, 4), Y, R.range(-90, 90), R.range(-160, -40), R.range(0.5, 0.9), D0[R.int(3, 6)], R.chance(0.4) ? 2 : 1);
  let fz = false; const T = v === 'c' ? 1.1 : 0.95;
  return { T, layers: ['ground', 'body'],
    box() { return [x - 40, y - 34, x + 40, gyL + 12]; },
    update(dt, I) { if (!fz) { fz = true; I.freeze(MOVES.fist.def.hits[0].stop); } const t = I.t;
      for (const q of puffs) { if (t < q.t0) continue; q.life -= dt; q.vx -= q.vx * 4.5 * dt; q.vy -= q.vy * 4.5 * dt + q.lift * dt; q.x += q.vx * dt; q.y += q.vy * dt; }
      ps.update(dt); bits.update(dt); L.update(dt); },
    draw(p, layer, t) {
      if (layer === 'ground') { if (v === 'a') return; const q = t / T, a = q < 0.5 ? 1 : 1 - (q - 0.5) / 0.5;   /* vết nứt nhỏ + vòng sóng trên đất */
        if (t < 0.35) band(p, X, GY, 6 + (v === 'c' ? 40 : 26) * ease.outCubic(t / 0.35), 0.5, 3, 1 - t / 0.35, D0, () => true, t < 0.06);
        for (let i = 0; i < 6; i++) { const b = i / 6 * TAU + PH; let px0 = X, py0 = GY; for (let s = 1; s <= 4; s++) { const nx = X + Math.cos(b + Math.sin(s * 3 + i) * 0.3) * s * 4, ny = GY + Math.sin(b) * s * 2; p.line(px0, py0, nx, ny, s < 2 && t < 0.4 ? C[5] : D0[0], a); px0 = nx; py0 = ny; } }
        if (t < 0.5) p.glow(X, GY, 20, C[4], 0.3 * (1 - t / 0.5)); return; }
      for (const q of puffs) { const k = q.life / q.max; if (t < q.t0 || k <= 0) continue; const r = q.r * (0.7 + (1 - k) * 0.85), a = Math.pow(k, 1.25) * Math.min(1, (t - q.t0) / 0.03), c = mix(Dd[5], v === 'a' ? Dd[7] : C[6], clamp(1 - (t - 0.03) / 0.25) * 0.55);
        p.disc(q.x, q.y, r, c, d => 0.58 * a * (1 - d * d * 0.75)); p.disc(q.x - r * 0.22, q.y - r * 0.32, r * 0.58, mix(c, WHITE, 0.5), d => 0.45 * a * (1 - d * d)); }
      bits.draw(p);
      if (t < 0.06) blob(p, X, Y, t < 0.025 ? 10 : 12.5, t < 0.025 ? 0 : 1, v === 'a' ? Dd : C, PH);
      drawWedges(p, W, X, Y, t, INKC, WHITE, v === 'a' ? Dd[7] : C[6]);
      const pop = Math.exp(-t / 0.06); if (pop > 0.02) p.glow(X, Y, 28, v === 'a' ? Dd[6] : C[5], 0.5 * pop);
      ps.draw(p); L.draw(p); } };
}
