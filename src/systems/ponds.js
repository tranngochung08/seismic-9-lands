// ponds.js — plan-25 B2: ĐÀO AO NUÔI CÁ trên đất của mình (khu nước mình hoặc đất đã mua).
//  · Cầm xẻng + E vào ô đã cày (chưa trồng) → ô thành ao nước (bụi đất + nước bắn, VFX PixelLab).
//  · Cá trong túi (2026-10-11 bỏ xô): cầm cá trên thanh công cụ (hoặc ao còn trống) + E cạnh ao → thả cá (tối đa 6 / ao). Mỗi ngày: cứ 2 con sinh 1 cá con (tới 6).
//  · 'Vớt cá' → cá rơi ra bờ ao (drops) rồi nhặt vào túi. Bóng cá bơi trong ao (ảnh PixelLab fishshadow).
//  · Lưu save.sys.ponds[vùng] = { 'x,y': { n, sp: [loài…], day } }; vào vùng → đặt lại ô nước.
import { getCarry, FISH_BAG, takeFish } from './animals.js';

const MAX = 6;
const ST = { list: [] };
const zid = ctx => (ctx.S.zone && ctx.S.zone.id) || '';
function store(ctx) { const s = ctx.S.save; s.sys = s.sys || {}; const p = (s.sys.ponds ||= {}); return (p[zid(ctx)] ||= {}); }
const key = (x, y) => `${x},${y}`;
const vi = ctx => ctx.lang() === 'vi';
const L = ctx => (vi(ctx) ? { dig: 'Đào ao', stock: n => `Thả cá vào ao (${n}/${MAX})`, full: 'Ao đầy rồi (6 con)', take: n => `Vớt cá (${n})`, dug: 'Đã đào ao! Thả cá vào để nuôi', born: (n) => `Ao cá có thêm ${n} cá con` }
  : { dig: 'Dig a pond', stock: n => `Stock the pond (${n}/${MAX})`, full: 'The pond is full (6 fish)', take: n => `Net a fish (${n})`, dug: 'Pond dug! Stock it with fish', born: n => `Your pond bred ${n} young fish` });
function mine(ctx, tx, ty) { if (ctx.ownsTile && ctx.ownsTile(tx, ty)) return true; const my = ctx.myPlot && ctx.myPlot(), q = ctx.plotOf(tx, ty); return !!(my && my.mine && q && q.idx === my.idx); }
function apply(ctx) { const m = ctx.S.map, st = store(ctx); for (const k of Object.keys(st)) { const [x, y] = k.split(',').map(Number); ctx.setG(m, x, y, ctx.T.WATER, true); } shoo(ctx); }
/* ai đang đứng trên ô ao (dân, người bán, người chơi) → bước ra bờ gần nhất */
function shoo(ctx) {
  const m = ctx.S.map, st = store(ctx), all = (ctx.S.npcs || []).concat(ctx.S.staff || [], ctx.S.player ? [ctx.S.player] : []);
  for (const n of all) { const tx = Math.floor(n.x / 16), ty = Math.floor((n.y - 2) / 16); if (!st[key(tx, ty)]) continue;
    for (let r = 1; r < 5; r++) { let done = false; for (const [dx, dy] of [[0, r], [0, -r], [-r, 0], [r, 0], [r, r], [-r, r]]) if (!ctx.isSolid(m, tx + dx, ty + dy)) { n.x = (tx + dx) * 16 + 8; n.y = (ty + dy) * 16 + 12; if (n.home) n.home = { x: n.x, y: n.y }; n.goal = null; n.path = null; done = true; break; } if (done) break; } }
}
function breed(ctx) {
  const st = store(ctx), today = ctx.clock ? ctx.clock.dayIndex : 0; let born = 0;
  for (const p of Object.values(st)) { if (p.day == null) p.day = today; const days = today - p.day; if (days <= 0) continue; p.day = today; for (let d = 0; d < Math.min(days, 7); d++) { const k = Math.floor(p.n / 2); const add = Math.min(k, MAX - p.n); p.n += add; born += add; for (let i = 0; i < add; i++) p.sp.push(p.sp[(Math.random() * p.sp.length) | 0] || 'perch'); } }
  if (born) { ctx.persist(); setTimeout(() => ctx.toast(L(ctx).born(born)), 1800); }
}
/* polish 2026-10-10: ô dưới chân tính GIỐNG farm.js (floor(y/16)); trước đây (y−2)/16 → đứng sát mép trên ô (y%16 < 2) ao nhìn lệch lên 1 hàng,
   E thứ hai không đào được ô vừa cày (anh thấy trong video) */
const underTile = p => ({ tx: Math.floor(p.x / 16), ty: Math.floor(p.y / 16) });
function facing(ctx) { const p = ctx.S.player, d = [[0, 1], [-1, 0], [1, 0], [0, -1]][p.dir & 3], u = underTile(p); return { tx: u.tx + d[0], ty: u.ty + d[1] }; }
function pondNear(ctx) { const p = ctx.S.player, st = store(ctx); let best = null, bd = 30; for (const k of Object.keys(st)) { const [x, y] = k.split(',').map(Number), d = Math.hypot(x * 16 + 8 - p.x, y * 16 + 8 - p.y); if (d < bd) { bd = d; best = { x, y, k, rec: st[k] }; } } return best; }

/* ao liền (anh yêu cầu: nhiều ô sát nhau phải thành một mặt nước): cắt ô ao PixelLab thành 9 mảnh (góc 6 px của ảnh 32 px);
   cạnh nào giáp ô ao khác thì lấy mảnh nước giữa, chỉ cạnh giáp đất mới có viền. */
const hash = (a, b) => { let h = (a * 374761393 + b * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177 | 0; return (h ^ (h >>> 16)) >>> 0; };
let PAL = null;
function waterPal(tile) {   /* lấy 3 sắc xanh từ giữa ô ao PixelLab: nền (nhiều nhất), sáng, tối */
  if (PAL) return PAL; const g = tile.getContext('2d'), S = tile.width, d = g.getImageData(Math.round(S * 0.2), Math.round(S * 0.45), Math.round(S * 0.3), Math.round(S * 0.3)).data, cnt = {};
  for (let i = 0; i < d.length; i += 4) { if (d[i + 2] < d[i] + 30) continue; const k = `${d[i]},${d[i + 1]},${d[i + 2]}`; cnt[k] = (cnt[k] || 0) + 1; }
  const cols = Object.entries(cnt).sort((a, b) => b[1] - a[1]).map(e => e[0].split(',').map(Number)), lum = c => c[0] * 0.3 + c[1] * 0.59 + c[2] * 0.11;
  const base = cols[0] || [58, 143, 214], rest = cols.slice(1, 8), light = rest.filter(c => lum(c) > lum(base)).sort((a, b) => lum(b) - lum(a))[0] || [191, 232, 255], dark = rest.filter(c => lum(c) < lum(base)).sort((a, b) => lum(a) - lum(b))[0] || [36, 90, 143];
  const css = c => `rgb(${c[0]},${c[1]},${c[2]})`; return (PAL = { base: css(base), light: css(light), dark: css(dark) });
}
const pondMask = (st, x, y) => { const h = (dx, dy) => !!st[key(x + dx, y + dy)]; return (h(0, -1) ? 1 : 0) | (h(1, 0) ? 2 : 0) | (h(0, 1) ? 4 : 0) | (h(-1, 0) ? 8 : 0) | (h(1, -1) ? 16 : 0) | (h(1, 1) ? 32 : 0) | (h(-1, 1) ? 64 : 0) | (h(-1, -1) ? 128 : 0); };
function drawJoined(g, tile, st, x, y, sx, sy) {
  const S = tile.width, f = S / 32, c = Math.round(7 * f), k = 16 / S, has = (dx, dy) => !!st[key(x + dx, y + dy)];
  const L = has(-1, 0), R = has(1, 0), U = has(0, -1), D = has(0, 1);
  /* 1) mặt nước liền mạch: màu nền + vệt sáng/tối lấy từ bảng màu ô ao PixelLab, rải theo toạ độ thế giới (không lặp ô) */
  const P = waterPal(tile); g.fillStyle = P.base; g.fillRect(sx, sy, 16, 16);
  for (let i = 0; i < 6; i++) { const h1 = hash(x * 31 + i * 7, y * 17 + i * 13), wx = h1 % 13, wy = (h1 >> 4) % 15, len = 2 + ((h1 >> 8) % 3); g.fillStyle = i % 3 === 0 ? P.dark : P.light; g.fillRect(sx + wx, sy + wy, len, 1); }
  /* 2) viền chỉ ở cạnh / góc giáp đất */
  const piece = (srcx, srcy, w, h, dx, dy) => g.drawImage(tile, srcx, srcy, w, h, sx + dx * k, sy + dy * k, w * k, h * k), m = S - 2 * c;
  if (!U) piece(c, 0, m, c, c, 0); if (!D) piece(c, S - c, m, c, c, S - c); if (!L) piece(0, c, c, m, 0, c); if (!R) piece(S - c, c, c, m, S - c, c);
  const corner = (cx0, cy0, a, b, hx, hy, vx, vy) => {   /* a: thiếu ngang (L/R), b: thiếu dọc (U/D) */
    if (a && b) piece(cx0, cy0, c, c, cx0, cy0); else if (b) piece(hx, cy0, c, c, cx0, cy0); else if (a) piece(cx0, vy, c, c, cx0, cy0);
  };
  corner(0, 0, !L, !U, c, 0, 0, c); corner(S - c, 0, !R, !U, S - 2 * c, 0, S - c, c);
  corner(0, S - c, !L, !D, c, S - c, 0, S - 2 * c); corner(S - c, S - c, !R, !D, S - 2 * c, S - c, S - c, S - 2 * c);
}
export const ponds = {
  id: 'ponds',
  onZoneEnter(ctx) {
    ST.list = []; apply(ctx); breed(ctx);
    if (typeof window !== 'undefined') window.__ponds = { list: () => JSON.parse(JSON.stringify(store(ctx))), dig: (x, y) => { store(ctx)[key(x, y)] = { n: 0, sp: [], day: ctx.clock ? ctx.clock.dayIndex : 0 }; apply(ctx); ctx.persist(); } };
  },
  near(ctx) {
    if (ctx.S.mode !== 'play') return null;
    const t = L(ctx), pn0 = pondNear(ctx), mt = ctx.mouseTile && ctx.mouseTile(), pl = ctx.S.player;
    /* 2026-10-11 anh: trỏ chuột vào ô khác để đào mà bấm lại ra 'Thả cá vào ao' → chuột đang chỉ 1 ô KHÔNG phải ao ngay cạnh người thì nhường ô đó */
    const aimElse = !!(mt && !ctx.mouseOnSprite && !store(ctx)[key(mt.tx, mt.ty)] && Math.abs(mt.tx - Math.floor(pl.x / 16)) <= 1 && Math.abs(mt.ty - Math.floor(pl.y / 16)) <= 1);
    const pn = aimElse ? null : pn0;
    if (pn) {
      const carry = getCarry(ctx), fi = carry.map(c => c.kind).lastIndexOf('fish'), hb = FISH_BAG.some(id => ctx.bag.has(id, 1)), held = ctx.holding ? FISH_BAG.some(id => ctx.holding(id)) : hb;   /* cá trong túi: phải cầm cá (hoặc ao trống) mới thả, kẻo không vớt được */
      if (fi >= 0 || (hb && held)) return { label: pn.rec.n >= MAX ? t.full : t.stock(pn.rec.n), x: pn.x * 16 + 8, y: pn.y * 16 + 8, limit: 30, priority: true, data: { stock: pn, fi } };
      if (pn.rec.n > 0) return { label: t.take(pn.rec.n), x: pn.x * 16 + 8, y: pn.y * 16 + 8, limit: 30, priority: 1, data: { take: pn } };
    }
    const shovel = ctx.holding ? ctx.holding('shovel') : ctx.tool.tier('shovel') > 0; if (!shovel) return null;
    const p = ctx.S.player, under = underTile(p);   /* như ruộng: ô dưới chân trước, rồi ô phía trước */
    for (const f of [under, facing(ctx)]) {
      const g = ctx.getG(ctx.S.map, f.tx, f.ty);
      if ((g === ctx.T.TILLED || g === ctx.T.TILLED_WET) && mine(ctx, f.tx, f.ty) && !(ctx.farmCrops && ctx.farmCrops().some(c => c.tx === f.tx && c.ty === f.ty)))
        return { label: t.dig, x: f.tx * 16 + 8, y: f.ty * 16 + 8, limit: 30, priority: 0.6, data: { dig: f } };
    }
    return null;
  },
  interact(ctx, cand) {
    const d = cand && cand.data; if (!d) return; const t = L(ctx), st = store(ctx);
    if (d.dig) {
      const { tx, ty } = d.dig; if (ctx.farmUntill) ctx.farmUntill(tx, ty);
      st[key(tx, ty)] = { n: 0, sp: [], day: ctx.clock ? ctx.clock.dayIndex : 0 }; ctx.setG(ctx.S.map, tx, ty, ctx.T.WATER, true); ctx.persist(); shoo(ctx);
      const p = ctx.S.player; if (p.hasAct && p.hasAct('hoe')) p.act('hoe', 0.5);
      const u = underTile(p); if (u.tx === tx && u.ty === ty) { for (const [dx, dy] of [[0, 1], [0, -1], [-1, 0], [1, 0]]) if (!ctx.isSolid(ctx.S.map, tx + dx, ty + dy)) { p.x = (tx + dx) * 16 + 8; p.y = (ty + dy) * 16 + 12; break; } }   /* đứng trên ô vừa thành nước → bước ra bờ */
      if (ctx.vfx) { ctx.vfx('dirt_puff', tx * 16 + 8, ty * 16 + 12); setTimeout(() => ctx.vfx && ctx.vfx('water_splash', tx * 16 + 8, ty * 16 + 12), 260); }   /* đất bung rồi nước trào lên */
      ctx.sfx('pond_dig'); ctx.toast(t.dug);
    } else if (d.stock) {
      const r = d.stock.rec; if (r.n >= MAX) { ctx.toast(t.full); return; }
      const it = takeFish(ctx, !!(ctx.holding && ctx.holding('a_fishbig'))); if (!it) return;
      r.n++; r.sp.push(it.sp || 'perch'); ctx.persist();
      if (ctx.vfx) ctx.vfx('water_splash', d.stock.x * 16 + 8, d.stock.y * 16 + 12); ctx.sfx('splash');
    } else if (d.take) {
      const r = d.take.rec; if (r.n <= 0) return; r.n--; r.sp.shift(); ctx.persist();
      const p = ctx.S.player; if (p.hasAct && p.hasAct('reel')) p.act('reel', 0.5);
      if (ctx.vfx) ctx.vfx('water_splash', d.take.x * 16 + 8, d.take.y * 16 + 12);
      ctx.give('a_fish', 1, d.take.x * 16 + 8, d.take.y * 16 + 26); ctx.sfx('catch');
    }
  },
  update(dt, ctx) {   /* VFX nước: cá quẫy bắn nước + vòng sóng (anh: 'thêm vfx cho nước') */
    const st = store(ctx), ks = Object.keys(st).filter(k => st[k].n > 0); if (!ks.length) return;
    ST.jumpT = (ST.jumpT ?? 2) - dt;
    if (ST.jumpT <= 0) { ST.jumpT = 3 + Math.random() * 3; const [x, y] = ks[(Math.random() * ks.length) | 0].split(',').map(Number), wx = x * 16 + 4 + Math.random() * 8, wy = y * 16 + 6 + Math.random() * 6;
      if (ctx.vfx) ctx.vfx('water_splash', wx, wy + 4); (ST.rings ||= []).push({ x: wx, y: wy, t: 0 }); }
    if (ST.rings) { for (const r of ST.rings) r.t += dt; ST.rings = ST.rings.filter(r => r.t < 1.2); }
  },
  drawGround(g, ctx, cx, cy) {   /* lớp NỀN (anh báo người đứng cạnh ao bị mất đầu khi vẽ ao đè lên) — mặt ao (chỉ các sắc xanh) + gợn sáng + bóng cá xanh đậm + vòng sóng */
    const st = store(ctx), sh = ctx.ART && ctx.ART.packs && ctx.ART.packs.village && ctx.ART.packs.village.images, t = ctx.S.time;
    const tile = sh && sh.pond_tile;
    for (const [k, p] of Object.entries(st)) {
      const [x, y] = k.split(',').map(Number), bx = x * 16 - cx, by = y * 16 - cy;
      const pt = tile && ctx.ART.pondTile ? ctx.ART.pondTile(pondMask(st, x, y), tile) : null;   /* 2026-10-11 anh: ao bo góc, viền nâu dịu như ô đào đất */
      if (pt) g.drawImage(pt, bx, by, 16, 16); else if (tile) drawJoined(g, tile, st, x, y, bx, by);
      for (let i = 0; i < 2; i++) {   /* gợn sáng: vạch xanh nhạt trôi ngang, nhấp nháy */
        const ph = (t * 0.6 + i * 0.5 + (x * 7 + y * 3) * 0.13) % 1, gx = Math.round(bx + 3 + ph * 9), gy = Math.round(by + 5 + i * 6 + ((x + y + i) % 2) * 2);
        if (Math.floor(t * 3 + i + x) % 3 !== 0) { g.fillStyle = '#bfe8ff'; g.fillRect(gx, gy, 3, 1); g.fillStyle = '#8fd0f5'; g.fillRect(gx + 3, gy, 1, 1); }
      }
      const fishIm = sh && [sh.pondfish_koi, sh.pondfish_blue];   /* 2026-10-11 anh: cá trong ao phải nhận ra rõ → cá PixelLab bơi lượn (tối đa 3 con / ô) */
      if (fishIm && fishIm[0]) { for (let i = 0; i < Math.min(p.n, 3); i++) {
        const a = t * (0.6 + i * 0.27) + i * 2.1 + x * 1.3 + y, fx = bx + 8 + Math.cos(a) * 4, fy = by + 8 + Math.sin(a) * 3, right = -Math.sin(a) >= 0, im = fishIm[(i + x + y) % 2] || fishIm[0];
        g.save(); g.translate(Math.round(fx), Math.round(fy)); if (right) g.scale(-1, 1); g.globalAlpha = 0.92; g.drawImage(im, 0, 0, im.width, im.height, -5, -5, 10, 10); g.restore();
      } continue; }
      for (let i = 0; i < Math.min(p.n, 2); i++) {   /* dự phòng khi chưa có ảnh: bóng cá pixel xanh nước đậm */
        const a = t * (0.7 + i * 0.35) + i * 2.1 + x, fx = Math.round(bx + 8 + Math.cos(a) * 4), fy = Math.round(by + 8 + Math.sin(a) * 3), dir = -Math.sin(a) >= 0 ? 1 : -1;
        g.fillStyle = '#245a8f'; g.fillRect(fx - 2, fy, 5, 2); g.fillRect(fx - 2 - dir * 2, fy - (dir > 0 ? 0 : 0), 1, 2); g.fillRect(fx - 3 * dir - (dir > 0 ? 0 : 0), fy - 1 + 0, 1, 1); g.fillRect(fx - 3 * dir, fy + 2, 1, 1);
      }
    }
    for (const r of ST.rings || []) {   /* vòng sóng loang */
      const rad = 2 + r.t * 8, a = 1 - r.t / 1.2, xx = Math.round(r.x - cx), yy = Math.round(r.y - cy);
      g.strokeStyle = `rgba(223,243,255,${(a * 0.85).toFixed(2)})`; g.lineWidth = 1; g.beginPath(); g.ellipse(xx, yy, rad, rad * 0.55, 0, 0, Math.PI * 2); g.stroke();
    }
  },
};
