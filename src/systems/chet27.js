/* chet27.js — c27-chet (anh 04/11): CẢNH CHẾT mới.
   "khi chết thì người chơi sẽ có effect ngã xuống đất và xuất hồn bay lên, về thẳng gần Noxx, và không còn nút hồi sinh và về nhà như trước nữa".
   · hero.js (vá c27) gọi ctx.chet27.start(ctx, player) lúc hết máu: chụp dáng ĐỨNG của chính nhân vật → HỒN (tô lam nhạt theo độ sáng,
     mờ bằng dither Bayer theo ô pixel logic, chân tan dần thành đuôi khói) bay lên ~1,4 s rồi tan; vài đốm sáng nhỏ bay theo. Bật 1 lần, không lặp.
   · Thân nằm: clip knockdown giữ khung nằm (hero.js như cũ).
   · Hết ~2,15 s: hero.js gọi ctx.chet27.toNoxx(ctx) (sau faintTravel — trận trùm / dưới nước giữ luật cũ của chúng):
       màn ngả sáng nhẹ (≤ 0,45, KHÔNG đen); ở Làng → đặt cạnh Noxx (S.guide) ngay; vùng khác → ctx.travel('village', speed 5: màn chuyển vùng chuẩn chỉ 0,2 s mỗi chiều) rồi đặt cạnh Noxx.
     Tới nơi: hồn rơi nhẹ xuống nhập vào người (0,5 s).
   · Chơi chung (coop, chỉ ở Làng): người khác ko 0→1 → thấy hồn của họ bay lên từ xác; ko 1→0 → hồn nhập ở chỗ mới (cạnh Noxx).
   Móc test: window.__c27 = { state(), log() }. */
import { ART } from '../art.js';
import { NET } from './farm106.js';
import { T } from '../gfx.js';

const CF = { rise: 1.45, up: 36, delay: 0.42, fadeA: 0.45, fadeIn: [1.75, 2.15], fadeOut: 0.4, land: 0.5, landUp: 26 };
const PAL = [[0.16, [62, 76, 140]], [0.36, [118, 142, 208]], [0.6, [182, 202, 248]], [1.01, [236, 243, 255]]];   /* hồn: viền lam đậm → lam nhạt → gần trắng (dịu, ít màu) */
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const ST = { souls: [], motes: [], die: null, pend: null, seen: new Map(), log: [], n: { die: 0, noxx: 0, travel: 0, land: 0, peerDie: 0, peerLand: 0, fallback: 0 } };
const lg = e => { ST.log.push({ t: +(performance.now() / 1000).toFixed(2), ...e }); if (ST.log.length > 80) ST.log.shift(); };

/* ---------- chụp hồn từ sprite ---------- */
function capture(ent) {
  const hi = ART.hi || 1, W = 48, H = 48, c = document.createElement('canvas'); c.width = W * hi; c.height = H * hi;
  const q = c.getContext('2d'); q.imageSmoothingEnabled = false; q.setTransform(hi, 0, 0, hi, 0, 0);
  const sv = { action: ent.action, moving: ent.moving, idleT: ent.idleT, frame: ent.frame, diag: ent.diag, dir: ent.dir };
  try { ent.action = null; ent.moving = false; ent.idleT = 0; ent.frame = 0; ent.diag = null; ent.dir = 0;   /* hồn quay mặt ra (nam) */ q.translate(24 - Math.round(ent.x), 40 - Math.round(ent.y)); ent.draw(q); }
  catch (e) { return null; }
  finally { ent.action = sv.action; ent.moving = sv.moving; ent.idleT = sv.idleT; ent.frame = sv.frame; ent.diag = sv.diag; ent.dir = sv.dir; }
  let im; try { im = q.getImageData(0, 0, c.width, c.height); } catch (e) { return null; }
  const a = im.data, Wb = c.width, Hb = c.height; let x0 = Wb, y0 = Hb, x1 = -1, y1 = -1;
  for (let y = 0; y < Hb; y++) for (let x = 0; x < Wb; x++) if (a[(y * Wb + x) * 4 + 3] > 40) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  if (x1 < 0) return null;
  const hb = y1 - y0 + 1, A0 = new Uint8Array(Wb * Hb); for (let i = 0; i < Wb * Hb; i++) A0[i] = a[i * 4 + 3] > 40 ? 1 : 0;
  const edge = (x, y) => { for (const [dx, dy] of [[hi, 0], [-hi, 0], [0, hi], [0, -hi]]) { const X = x + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= Wb || Y >= Hb || !A0[Y * Wb + X]) return true; } return false; };
  for (let y = 0; y < Hb; y++) for (let x = 0; x < Wb; x++) {
    const o = (y * Wb + x) * 4; if (a[o + 3] <= 40) { a[o + 3] = 0; continue; }
    const Lm = (0.3 * a[o] + 0.55 * a[o + 1] + 0.15 * a[o + 2]) / 255, col = edge(x, y) ? PAL[0][1] : PAL.find(P => 0.3 + Lm * 0.7 < P[0])[1];   /* viền lam đậm, thân sáng lên (hồn nhạt) */
    a[o] = col[0]; a[o + 1] = col[1]; a[o + 2] = col[2]; a[o + 3] = 255;
    const u = (y - y0) / hb, lx = Math.floor(x / hi), ly = Math.floor(y / hi), th = (BAYER[(ly & 3) * 4 + (lx & 3)] + 0.5) / 16;
    if (u > 0.62 && th < (u - 0.62) / 0.38 * 1.05) a[o + 3] = 0;   /* chân tan dần thành đuôi (dither theo ô logic) */
  }
  q.setTransform(1, 0, 0, 1, 0, 0); q.putImageData(im, 0, 0);
  /* 4 mức mờ dither (25/50/75/100 %) — canvas KHÔNG __hi (bài học shim), vẽ bằng drawImage 5 tham số */
  const lv = [0.25, 0.5, 0.75, 1].map(k => {
    if (k >= 1) return c;
    const d = document.createElement('canvas'); d.width = Wb; d.height = Hb; const r = d.getContext('2d'); r.drawImage(c, 0, 0);
    const jm = r.getImageData(0, 0, Wb, Hb), b = jm.data;
    for (let y = 0; y < Hb; y++) for (let x = 0; x < Wb; x++) { const lx = Math.floor(x / hi), ly = Math.floor(y / hi); if ((BAYER[(ly & 3) * 4 + (lx & 3)] + 0.5) / 16 >= k) b[(y * Wb + x) * 4 + 3] = 0; }
    r.putImageData(jm, 0, 0); return d;
  });
  return { lv, W, H, top: y0 / hi, bot: y1 / hi };
}
const pickLv = (G, al) => al <= 0.05 ? null : G.lv[al < 0.32 ? 0 : al < 0.6 ? 1 : al < 0.86 ? 2 : 3];

function spawnSoul(ent, kind, who) {
  const G = capture(ent); if (!G) { lg({ ev: 'nocap', kind, who }); return false; }
  ST.souls.push({ G, x: ent.x, y: ent.y, t: kind === 'rise' ? -CF.delay : 0, kind, who, ph: Math.random() * 6.28 });
  const n = kind === 'rise' ? 7 : 4;
  for (let i = 0; i < n; i++) ST.motes.push({ x: ent.x + (Math.random() * 14 - 7), y: ent.y - 4 - Math.random() * 14, vy: kind === 'rise' ? -(14 + Math.random() * 16) : -(4 + Math.random() * 6), t: kind === 'rise' ? -CF.delay - Math.random() * 0.5 : -Math.random() * 0.2, life: 0.7 + Math.random() * 0.5, c: Math.random() < 0.5 ? '#eef4ff' : '#b8cbff' });
  return true;
}

/* ---------- chỗ cạnh Noxx ---------- */
function walkable(ctx, x, y) {
  const m = ctx.S.map, tx = Math.floor(x / 16), ty = Math.floor(y / 16); if (!m || tx < 1 || ty < 1 || tx >= m.w - 1 || ty >= m.h - 1) return false;
  try { if (ctx.isSolid && ctx.isSolid(m, tx, ty)) return false; const gg = ctx.getG ? ctx.getG(m, tx, ty) : -1; return gg !== T.WATER && gg !== T.DEEP && gg !== T.LAVA; } catch (e) { return false; }
}
function placeNoxx(ctx) {
  const S = ctx.S, p = S.player, g = S.guide;
  if (g) for (const [dx, dy] of [[22, 6], [-22, 6], [0, 26], [-26, 20], [26, 20], [0, 34], [-32, 0], [32, 0], [0, -20], [0, 44], [-40, 24], [40, 24]]) {
    const x = g.x + dx, y = g.y + dy; if (!walkable(ctx, x, y) || !walkable(ctx, x - 4, y) || !walkable(ctx, x + 4, y)) continue;
    p.x = x; p.y = y; p.autoPath = null; p.moving = false; if (p.faceTo) p.faceTo(g.x, g.y); lg({ ev: 'noxx', x: Math.round(x), y: Math.round(y), gx: Math.round(g.x), gy: Math.round(g.y) }); return true;
  }
  const e = S.map && S.map.entries && S.map.entries.default; if (!e) return false;
  p.x = e.x * 16 + 8; p.y = e.y * 16 + 14; p.autoPath = null; ST.n.fallback++; lg({ ev: 'noxx-miss', x: p.x, y: p.y }); return true;
}
function arrive(ctx) { ST.n.land++; spawnSoul(ctx.S.player, 'land', 'me'); }

export const chet27 = {
  id: 'chet27',
  always: true,
  onZoneEnter(ctx) {
    ST.souls.length = 0; ST.motes.length = 0; ST.seen.clear();
    ctx.chet27 = {
      start: (c, ent) => { ST.n.die++; ST.die = { t: 0, zone: c.S.zone && c.S.zone.id, soft: true }; lg({ ev: 'die', zone: ST.die.zone, x: Math.round(ent.x), y: Math.round(ent.y) }); spawnSoul(ent, 'rise', 'me'); },
      toNoxx: c => {
        const z = c.S.zone && c.S.zone.id;
        if (z === 'village') { if (!placeNoxx(c)) return false; ST.n.noxx++; if (ST.die) ST.die.tp = ST.die.t; arrive(c); return true; }
        ST.pend = { from: z };
        if (c.travel && c.travel('village', 'default', { speed: 5 })   /* đổi vùng: màn tối chuẩn của game nhưng rất ngắn (0,2 s mỗi chiều) */) { ST.n.travel++; lg({ ev: 'travel', from: z }); return true; }
        ST.pend = null; return false;
      },
      ui: (ug, c) => chet27.ui(ug, c),
    };
    if (ST.pend && ctx.S.zone && ctx.S.zone.id === 'village') { ST.pend = null; if (placeNoxx(ctx)) { ST.n.noxx++; if (ST.die) ST.die.tp = ST.die.t; arrive(ctx); } }
    if (typeof window !== 'undefined') window.__c27 = { state: () => ({ n: { ...ST.n }, souls: ST.souls.map(s => ({ kind: s.kind, who: s.who, t: +s.t.toFixed(2) })), motes: ST.motes.length, die: ST.die && { ...ST.die }, pend: ST.pend }), log: () => ST.log.slice() };
  },
  update(dt, ctx) {
    if (ST.die) { ST.die.t += dt; if (ST.die.t > 4) ST.die = null; }
    for (const s of ST.souls) s.t += dt; ST.souls = ST.souls.filter(s => s.t < (s.kind === 'rise' ? CF.rise : CF.land));
    for (const m of ST.motes) { m.t += dt; if (m.t > 0) { m.y += m.vy * dt; m.x += Math.sin(m.t * 7 + m.y) * 6 * dt; } } ST.motes = ST.motes.filter(m => m.t < m.life);
    const api = NET.pkApi; if (!api || !api.on || !api.on()) return;   /* chơi chung: hồn của người khác */
    let ps = []; try { ps = api.peers() || []; } catch (e) { ps = []; }
    for (const P of ps) {
      const was = ST.seen.get(P.id); ST.seen.set(P.id, !!P.ko);
      if (was === undefined) continue;
      if (!was && P.ko) { ST.n.peerDie++; spawnSoul(P.ent, 'rise', P.id); lg({ ev: 'peer-die', id: P.id }); }
      else if (was && !P.ko) { ST.n.peerLand++; spawnSoul(P.ent, 'land', P.id); lg({ ev: 'peer-land', id: P.id }); }
    }
  },
  drawables(ctx, cx, cy) {
    if (!ST.souls.length && !ST.motes.length) return [];
    const g = ctx.g, out = [], R = Math.round;
    for (const s of ST.souls) {
      if (s.t < 0) continue;
      let dy, al, sx;
      if (s.kind === 'rise') { const u = s.t / CF.rise, e = 1 - (1 - u) * (1 - u); dy = 6 - CF.up * e; al = Math.min(1, s.t / 0.18) * (u > 0.6 ? Math.max(0, 1 - (u - 0.6) / 0.4) : 1) * 0.9; sx = Math.sin(s.ph + s.t * 4.2) * 2.2 * u; }
      else { const u = s.t / CF.land; dy = -CF.landUp * (1 - u) * (1 - u); al = Math.min(1, s.t / 0.12) * (1 - u) * 0.85; sx = 0; }
      const img = pickLv(s.G, al); if (!img) continue;
      const x = R(s.x - cx + sx) - 24, y = R(s.y - cy + dy) - 40;
      out.push({ y: s.y + 2, f: () => g.drawImage(img, x, y, s.G.W, s.G.H) });   /* trên xác (khoá y + 2), hồn không __hi → 5 tham số */
    }
    if (ST.motes.length) out.push({ y: 1e6, f: () => { g.save(); for (const m of ST.motes) { if (m.t <= 0) continue; const u = m.t / m.life; if (u > 0.7 && ((R(m.x) + R(m.y)) & 1)) continue; g.fillStyle = m.c; g.fillRect(R(m.x - cx), R(m.y - cy), 1, 1); } g.restore(); } });
    return out;
  },
  ui(ug, ctx) {   /* gọi từ hero.drawUI: màn ngả sáng NHẸ quanh lúc dịch chuyển trong Làng (không đen, không bảng) */
    const D = ST.die; if (!D || !D.soft) return; const t = D.t, [a0, a1] = CF.fadeIn; let a = 0;
    if (D.tp == null) { if (t > a0) a = Math.min(1, (t - a0) / (a1 - a0)) * CF.fadeA; }
    else { const k = (t - D.tp) / CF.fadeOut; a = k < 1 ? (1 - k) * Math.min(CF.fadeA, D.tp > a0 ? (D.tp - a0) / (a1 - a0) * CF.fadeA : CF.fadeA) : 0; if (k >= 1) D.soft = false; }
    if (a <= 0.01) return; ug.save(); ug.globalAlpha = a; ug.fillStyle = '#e4eafc'; ug.fillRect(0, 0, ug.canvas.width, ug.canvas.height); ug.restore();
  },
};
