/* chuong115.js — p115cl (03/11/2026): CHƯỞNG LỰC trên lõi pxfx113 (cách pixelfx: lưỡi lửa pixel dày + khói tròn mờ + lõi trắng nóng ở gốc, đổi bảng màu 1 tham số).
   Mẫu anh gửi: video pixelfx (fire breath "same code. any palette"). Kỹ thuật chuyển thể từ pixelfx (https://github.com/patch-gg/pixelfx) — MIT License,
   Copyright (c) 2026 Patch, Copyright (c) 2026 Hugo Duprez. Không chép nguyên hiệu ứng — tự viết lại cho game.
   4 bản nháp (v):
     a  Luồng chưởng lửa   — lưỡi lửa phun thành nón từ lòng bàn tay, khói tròn ở đuôi, đánh nhiều nhịp
     b  Luồng chưởng khí   — cùng code a, bảng ngọc (Mã) — thử đổi màu
     c  Chưởng cầu         — gồng tụ cầu → cầu bay kéo đuôi lưỡi lửa → nổ ở đích (khựng)
     d  Sóng chưởng        — tia đặc lõi trắng, lưỡi lửa bung dọc mép, toé ở đích, chốt nổ
   Toạ độ vào: px logic; vẽ theo ĐIỂM (×2). */
import { Rng, Particles, Lights, Bits, B, P, pal, hex, mix, scale, WHITE, TAU, clamp, ease, bump, blob, wedges, drawWedges, band, bayer } from './pxfx113.js';

const Q = v => v * 2;
export const PAL115 = { a: 'fire', b: 'ma', c: 'arcane', d: 'ice' };

/* lưỡi lửa: giọt méo dài theo hướng bay, nhiệt giảm theo tuổi → bậc màu; mép răng cưa nhảy theo thời gian */
function tongue(p, q, C, t) {
  const k = q.age / q.max, sp = Math.hypot(q.vx, q.vy) || 1, ux = q.vx / sp, uy = q.vy / sp, s = q.s * (1 + k * 2.2), L = s * (1.6 + Math.min(1.4, sp / 260)), W = s * 0.62;
  const heat = clamp(1 - k * 1.15 + q.hot * 0.25), x0 = q.x, y0 = q.y, R = L + 2;
  if (k > 0.97) return;
  if (p.tx === 0 && p.ty === 0 && p.fx === 1 && p.cs === 1 && p.sn === 0) { tongueFast(p, q, C, t, k, ux, uy, L, W, heat, x0, y0, R); return; }   /* c18-perf: đường nhanh (cùng điểm, cùng màu) */
  p.shade(x0 - R, y0 - R, x0 + R, y0 + R, (x, y, o) => {
    const dx = x - x0, dy = y - y0, u = dx * ux + dy * uy, v = dx * -uy + dy * ux;   /* u dọc (đầu = +), v ngang */
    const uu = (u + L * 0.35) / L; if (uu < 0 || uu > 1) return;
    const jag = 1 + 0.35 * Math.sin(q.seed + t * 38 + uu * 9) + 0.2 * Math.sin(q.seed * 2.1 + t * 23 - uu * 14);
    const half = W * jag * Math.sin(Math.PI * Math.pow(uu, 0.7)) * (1 - uu * 0.35) * (k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3 * 0.8); if (Math.abs(v) > half) return;
    const rim = Math.abs(v) / (half || 1), h = heat - rim * 0.35 - (1 - uu) * 0.12;
    const c = h > 0.86 ? WHITE : h > 0.7 ? C[7] : h > 0.55 ? C[6] : h > 0.4 ? C[5] : h > 0.25 ? C[4] : h > 0.12 ? C[3] : C[2];
    o.c = c; o.a = k < 0.82 ? 1 : 1 - (k - 0.82) / 0.15; if (h > 0.6) { o.l = C[6]; o.k = 0.05; }
  });
}

/* c18-perf: tongue() đường nhanh cho Painter đồng nhất. Giống hệt p.shade + hàm điểm của tongue (thứ tự phép tính giữ nguyên),
   nhưng mỗi hàng chỉ quét đoạn x mà tâm điểm có thể nằm trong hộp u ∈ [-0,35L, 0,65L], |v| ≤ 1,55W (jag ≤ 1,55; các hệ số khác ≤ 1) — nới 1 điểm mỗi phía. */
function span18(a, b, m0, m1) {   /* tập dx thoả m0 ≤ a·dx + b ≤ m1 → [lo, hi] (null = rỗng) */
  if (Math.abs(a) < 1e-9) return b >= m0 && b <= m1 ? [-1e9, 1e9] : null;
  const p0 = (m0 - b) / a, p1 = (m1 - b) / a; return p0 < p1 ? [p0, p1] : [p1, p0];
}
function tongueFast(p, q, C, t, k, ux, uy, L, W, heat, x0, y0, R) {
  const f = p.f, PW = p.w, PH = p.h, OX = p.ox, OY = p.oy, Cb = p.C, fade = p.fade, ak = k < 0.82 ? 1 : 1 - (k - 0.82) / 0.15, kf = k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3 * 0.8;
  const sy0 = Math.max(Math.floor(y0 - R), OY), sy1 = Math.min(Math.ceil(y0 + R), OY + PH - 1), bx0 = Math.max(Math.floor(x0 - R), OX), bx1 = Math.min(Math.ceil(x0 + R), OX + PW - 1);
  const uLo = -L * 0.35 - 1, uHi = L * 0.65 + 1, vM = W * 1.55 + 1, C6 = C[6], L35 = L * 0.35, j1 = q.seed + t * 38, j2 = q.seed * 2.1 + t * 23, vB = W * 1.55 * kf * 1.001 + 1e-6, PI = Math.PI;   /* j1 / j2 / L35: cùng phép cộng trái → phải như bản gốc */
  for (let sy = sy0; sy <= sy1; sy++) {
    const y = sy + 0.5, dy = y - y0;
    const su = span18(ux, dy * uy, uLo, uHi); if (!su) continue;
    const sv = span18(-uy, dy * ux, -vM, vM); if (!sv) continue;
    const lo = Math.max(su[0], sv[0]), hi = Math.min(su[1], sv[1]); if (lo > hi) continue;
    const sx0 = Math.max(bx0, Math.floor(x0 + lo - 0.5) - 1), sx1 = Math.min(bx1, Math.ceil(x0 + hi - 0.5) + 1);
    for (let sx = sx0; sx <= sx1; sx++) {
      const x = sx + 0.5, dx = x - x0, u = dx * ux + dy * uy, v = dx * -uy + dy * ux;
      const uu = (u + L35) / L; if (uu < 0 || uu > 1) continue;
      const av = Math.abs(v), e1 = PI * Math.sqrt(uu), e2 = PI * (1 - uu); if (av > vB * (e1 < 1 ? (e1 < e2 ? e1 : e2) : e2 < 1 ? e2 : 1) * (1 - uu * 0.35)) continue;   /* chặn trên rẻ: sin(πx) ≤ min(1, πx, π(1−x)), x = uu^0,7 ≤ √uu */
      const jag = 1 + 0.35 * Math.sin(j1 + uu * 9) + 0.2 * Math.sin(j2 - uu * 14);
      const half = W * jag * Math.sin(Math.PI * Math.pow(uu, 0.7)) * (1 - uu * 0.35) * kf; if (Math.abs(v) > half) continue;
      const rim = Math.abs(v) / (half || 1), h = heat - rim * 0.35 - (1 - uu) * 0.12;
      const c = h > 0.86 ? WHITE : h > 0.7 ? C[7] : h > 0.55 ? C6 : h > 0.4 ? C[5] : h > 0.25 ? C[4] : h > 0.12 ? C[3] : C[2];
      if (c) { const a = ak * fade; if (!(a < 1 && a <= bayer(sx, sy))) { const X = sx - OX, Y = sy - OY; Cb[Y * PW + X] = c; if (X < f.x0) f.x0 = X; if (X > f.x1) f.x1 = X; if (Y < f.y0) f.y0 = Y; if (Y > f.y1) f.y1 = Y; } }
      if (h > 0.6) p.add(sx, sy, C6, 0.05);
    }
  }
}

/* cảnh chung: org() = gốc (lòng bàn tay, px logic), aim() = điểm đích (px logic), tg() = danh sách mục tiêu cho phản ứng (do preview / game xử lý qua hit cb) */
export function chuong(org, aim, o = {}) {
  const v = o.v || 'a', C = pal(o.pal || PAL115[v], o.palo), R = new Rng(o.seed || 41), L = new Lights(), bits = new Bits({ ground: () => Q(o.gy || 999) });
  const ps = new Particles({ rng: R, ground: () => Q(o.gy || 999), sparks: ['#ffffff', C[6], C[5], C[4]].map(c => (typeof c === 'number' ? c : hex(c))) });
  const tg = [], smoke = v === 'a' || v === 'c';
  const WIND = v === 'c' ? 0.38 : 0.26, FIRE = v === 'c' ? 0 : v === 'd' ? 0.85 : 0.95, T = WIND + (v === 'c' ? 1.15 : FIRE + 0.55);
  let acc = 0, t = 0, ball = null, boom = null, hitAcc = 0;
  const onHit = o.onHit || (() => { });
  const dir = () => { const a = org(), b = aim(); return Math.atan2(b.y - a.y, b.x - a.x); };
  const sc = {
    T, layers: ['ground', 'body'], wind: WIND,
    box() { const a = org(), b = aim(); return [Math.min(a.x, b.x) - 70, Math.min(a.y, b.y) - 70, Math.max(a.x, b.x) + 70, Math.max(a.y, b.y) + 60]; },
    update(dt) {
      t += dt; const a = org(), A = dir(), ca = Math.cos(A), sa = Math.sin(A), X = Q(a.x), Y = Q(a.y);
      /* gồng: hạt hút về lòng bàn tay */
      if (t < WIND) { acc += dt * 70; for (; acc > 1; acc--) { const an = R.range(0, TAU), d = R.range(18, 34), sp = R.range(90, 150); ps.spawn(P.MOTE, X + Math.cos(an) * d, Y + Math.sin(an) * d, -Math.cos(an) * sp, -Math.sin(an) * sp, d / sp * 0.9, R.chance(0.5) ? C[6] : C[5], 1); } }
      /* phun (a, b, d) */
      if (FIRE && t >= WIND && t < WIND + FIRE) {
        const u = (t - WIND) / FIRE, rate = v === 'd' ? 150 : 260 * (u < 0.1 ? u / 0.1 : 1); acc += dt * rate;
        for (; acc > 1; acc--) { const spread = v === 'd' ? 0.07 : 0.13 + 0.09 * R.next(), an = A + R.range(-spread, spread), sp = v === 'd' ? R.range(420, 560) : R.range(430, 600);
          const pv = v === 'd' ? R.sign() * R.range(30, 80) : 0;
          tg.push({ x: X + ca * R.range(2, 6), y: Y + sa * R.range(2, 6), vx: Math.cos(an) * sp - sa * pv, vy: Math.sin(an) * sp + ca * pv, age: 0, max: R.range(0.42, 0.62) * (v === 'd' ? 0.7 : 1), s: R.range(4, 6.4), seed: R.range(0, 100), hot: R.range(0, 1), sm: false }); }
        if (R.chance(dt * 30)) ps.spawn(P.EMBER, X + ca * 20, Y + sa * 20, ca * R.range(120, 260) + R.range(-40, 40), sa * R.range(120, 260) + R.range(-60, 20), R.range(0.4, 0.8), C[6], 1);
        hitAcc += dt; if (hitAcc > (v === 'd' ? 0.12 : 0.16)) { hitAcc = 0; onHit({ k: 'tick', push: v === 'd' ? 28 : 22, stop: 0.02 }); }
      }
      /* chưởng cầu */
      if (v === 'c') {
        if (!ball && t >= WIND && !boom) ball = { x: X + ca * 6, y: Y + sa * 6, vx: ca * 330, vy: sa * 330 };
        if (ball) { ball.x += ball.vx * dt; ball.y += ball.vy * dt; const b = aim(), bx = Q(b.x), by = Q(b.y);
          acc += dt * 160; for (; acc > 1; acc--) { const an = A + Math.PI + R.range(-0.5, 0.5), sp = R.range(40, 140); tg.push({ x: ball.x + R.range(-4, 4), y: ball.y + R.range(-4, 4), vx: Math.cos(an) * sp, vy: Math.sin(an) * sp, age: 0, max: R.range(0.22, 0.4), s: R.range(2.6, 4.2), seed: R.range(0, 100), hot: R.range(0, 1), sm: false }); }
          if (Math.hypot(bx - ball.x, by - ball.y) < 8) { boom = { x: ball.x, y: ball.y, t: 0, W: wedges(R, 10, 9, 22), ph: R.range(0, TAU) }; ball = null; onHit({ k: 'boom', push: 120, stop: 0.09, shake: 3 });
            for (let i = 0; i < 26; i++) { const an = R.range(0, TAU), s2 = R.range(120, 300); ps.spawn(P.SPARK, boom.x, boom.y, Math.cos(an) * s2, Math.sin(an) * s2 - 60, R.range(0.3, 0.6), C[6], 1); }
            for (let i = 0; i < 26; i++) { const an = R.range(0, TAU), sp = R.range(60, 220); tg.push({ x: boom.x, y: boom.y, vx: Math.cos(an) * sp, vy: Math.sin(an) * sp * 0.7 - 30, age: 0, max: R.range(0.3, 0.55), s: R.range(3.5, 5.5), seed: R.range(0, 100), hot: 1, sm: false }); }
            L.add(boom.x, boom.y, 70, C[6], 0.9, 0.45); L.add(boom.x, boom.y, 26, WHITE, 1, 0.1); } } }
      /* sóng chưởng: chốt nổ ở cuối */
      if (v === 'd' && !boom && t >= WIND + FIRE) { const b = aim(); boom = { x: Q(b.x), y: Q(b.y), t: 0, W: wedges(R, 9, 9, 20), ph: R.range(0, TAU) }; onHit({ k: 'boom', push: 110, stop: 0.08, shake: 3 });
        for (let i = 0; i < 22; i++) { const an = R.range(0, TAU), s2 = R.range(120, 280); ps.spawn(P.SPARK, boom.x, boom.y, Math.cos(an) * s2, Math.sin(an) * s2 - 60, R.range(0.3, 0.6), C[6], 1); }
        L.add(boom.x, boom.y, 64, C[6], 0.85, 0.4); }
      /* luồng a/b: chốt bùng ở đích khi tắt phun */
      if ((v === 'a' || v === 'b') && !boom && t >= WIND + FIRE * 0.98) { const b = aim(); boom = { x: Q(b.x), y: Q(b.y), t: 0, W: wedges(R, 7, 8, 16), ph: R.range(0, TAU), small: true }; onHit({ k: 'boom', push: 70, stop: 0.05, shake: 2 }); }
      if (boom) boom.t += dt;
      /* cập nhật lưỡi lửa */
      for (let i = tg.length - 1; i >= 0; i--) { const q = tg[i]; q.age += dt; if (q.age >= q.max) { if (smoke && !q.sm && R.chance(0.5)) ps.spawn(P.SMOKE, q.x, q.y, q.vx * 0.15, q.vy * 0.15 - 10, R.range(0.5, 0.9), mix(C[2], hex('#3a3440'), 0.75), R.range(5, 9)); tg.splice(i, 1); continue; }
        q.vx -= q.vx * 0.8 * dt; q.vy -= q.vy * 0.8 * dt; if (smoke) q.vy -= 50 * dt; q.x += q.vx * dt; q.y += q.vy * dt;
        if (smoke && !q.sm && q.age > q.max * 0.7 && R.chance(dt * 6)) { q.sm = true; ps.spawn(P.SMOKE, q.x, q.y, q.vx * 0.2, q.vy * 0.2 - 12, R.range(0.6, 1.0), mix(C[2], hex('#3a3440'), 0.75), R.range(5, 10)); } }
      ps.update(dt); L.update(dt); bits.update(dt);
    },
    draw(p, layer) {
      const a = org(), X = Q(a.x), Y = Q(a.y), A = dir(), ca = Math.cos(A), sa = Math.sin(A);
      if (layer === 'ground') { if (boom && !boom.small && boom.t < 0.7) { const g = Q(o.gy || a.y + 4), q = boom.t / 0.7; band(p, boom.x, g, 8 + 44 * ease.outCubic(Math.min(1, boom.t / 0.3)), 0.5, 3, 1 - q, C, () => true, boom.t < 0.05); } return; }
      ps.draw(p, 'back');
      /* sóng chưởng: thân tia */
      if (v === 'd' && t >= WIND && t < WIND + FIRE + 0.12) { const b = aim(), u = (t - WIND) / FIRE, grow = ease.outCubic(clamp(u / 0.12)), end = clamp(1 - (u - 1) / 0.12), BX = X + (Q(b.x) - X) * grow, BY = Y + (Q(b.y) - Y) * grow;
        const w = (12 + 3 * Math.sin(t * 50)) * end; p.beam(X, Y, BX, BY, w + 6, (uu, vv) => (vv < 0.45 ? C[6] : vv < 0.8 ? C[5] : C[4]), (uu, vv) => (vv < 0.8 ? 1 : 0.6));
        p.beam(X, Y, BX, BY, w * 0.5, (uu, vv) => (vv < 0.6 ? WHITE : C[7]), 1); p.glowLine(X, Y, BX, BY, 14, C[5], 0.35 * end); }
      for (const q of tg) tongue(p, q, C, t);
      /* chưởng cầu */
      if (ball) { const r = 6 + Math.sin(t * 40); p.circle(ball.x, ball.y, r + 2, d => (d < 0.5 ? WHITE : d < 0.8 ? C[6] : C[5])); p.glow(ball.x, ball.y, 20, C[5], 0.6); }
      /* gốc: lõi trắng nóng + quầng (gồng lớn dần, phun chập chờn) */
      const firing = (FIRE && t >= WIND && t < WIND + FIRE) || (v === 'c' && t < WIND + 0.05);
      if (t < WIND) { const g = t / WIND, r = 2 + 6 * g; p.circle(X, Y, r, d => (d < 0.5 ? WHITE : C[6]), 1); p.glow(X, Y, 10 + 20 * g, C[5], 0.5 * g); }
      else if (firing) { const r = 6 + 1.5 * Math.sin(t * 60); p.circle(X + ca * 2, Y + sa * 2, r, d => (d < 0.6 ? WHITE : C[7])); p.glow(X, Y, 30, C[6], 0.7); p.glow(X + ca * 40, Y + sa * 40, 40, C[5], 0.25); }
      /* nổ ở đích */
      if (boom) { const bt = boom.t; if (bt < 0.06) blob(p, boom.x, boom.y, boom.small ? 9 : 14, bt < 0.025 ? 0 : 1, C, boom.ph);
        drawWedges(p, boom.W, boom.x, boom.y, bt, hex('#120a10'), WHITE, C[6]); }
      bits.draw(p); ps.draw(p, 'front'); L.draw(p);
    },
  };
  return sc;
}
