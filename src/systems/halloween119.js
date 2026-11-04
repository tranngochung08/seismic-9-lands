/* halloween119.js — p119 (plan-119, anh thu gọn 03/11): sự kiện Halloween ở Làng mới (village88).
   (1) vật trang trí PixelLab td8 hướng nam (gói vùng village.json p119: pumpkin_s / pumpkin_l / pumpkin_pile / pumpkin_lamp / grave / scarecrow / web_fence), đặt theo cụm quanh quảng trường + đường mòn,
       mỗi chỗ qua kiểm: không trên đường / nước / ô cứng, cách vật khác ≥ 1 ô, không chặn lối (BFS từ lối vào trước / sau phải như nhau).
   (2) TRỜI TỐI kiểu Saiyan Online: lớp sáng (lightmap cỡ khung logic) = màu nền xanh tím + vùng sáng ấm (bậc + dither Bayer) quanh đèn / đuốc / lửa trại / bí ngô + vầng nhẹ quanh người chơi,
       nhân với cảnh (multiply). Tên / thanh máu vẽ ở lớp nhãn SAU nên luôn rõ. Đè đêm thường của main.js (S.dark = 0 khi đang bật) để không tối 2 lần.
   (3) MƯA vẽ code từng pixel: vệt xiên 2 lớp (xa: nét đứt dither, gần: nét liền), toé 1–3 điểm trên đất + gợn vòng trên nước (lớp nền drawGround, neo theo thế giới). Không trạng thái, không cấp phát mỗi khung.
   Bật: tự theo ngày máy 25/10 – 10/11 · ?halloween=1 / 0 ép bật / tắt · phím F7 bật / tắt trong game · chỉ ở vùng Làng (village). ?rain119=0 tắt riêng mưa. window.__h119 để test. */
const Q = typeof location !== 'undefined' ? new URLSearchParams(location.search) : new URLSearchParams('');
const URLF = Q.get('halloween'), RAIN_OFF = Q.get('rain119') === '0', RAIN_ON = Q.get('rain119') === '1';   /* c14-thoitiet: =1 ép mưa (test) */
function dateOn(d = new Date()) { const mo = d.getMonth(), da = d.getDate(); return (mo === 9 && da >= 25) || (mo === 10 && da <= 10); }
const ST = { force: URLF === '1' ? true : URLF === '0' ? false : null, placed: [], lightN: 0, amb: [116, 124, 172], rain: !RAIN_OFF, rainK: 0.4, log: [], dk: 0, wet: 0 };   /* c14-thoitiet: dk = độ tối đêm theo đồng hồ (0…1), wet = độ mưa hiện tại (0…1) */
/* c14-thoitiet: lịch mưa — khung 2 giờ game, ~35 % mưa, băm theo năm/ngày/khung (mọi máy giống nhau); vào / tạnh dần */
function wetStep(ctx, dt) { const c = ctx.S.save && ctx.S.save.clock; let want = 0;
  if (RAIN_ON) want = 1; else if (c) { const blk = Math.floor((c.min || 0) / 120), sd = (c.year || 1) * 977 + (c.day || 1) * 31 + blk + (c.season ? c.season.length * 7 : 0); want = HSH(sd, 3) < 0.35 ? 1 : 0; }
  return ST.wet + Math.max(-dt * 0.15, Math.min(dt * 0.15, want - ST.wet)); }
const HSH = (i, k) => { let h = Math.imul(i + 1, 2654435761) ^ Math.imul(k + 7, 1597334677); h = Math.imul(h ^ (h >>> 15), 2246822519); h ^= h >>> 13; return (h >>> 0) / 4294967296; };
function on(ctx) { const S = ctx.S; if (!S || !S.zone || S.zone.id !== 'village' || !S.map || !S.map.v88) return false; return ST.force === null ? dateOn() : ST.force; }

/* ---------- vật trang trí ---------- */
const DECO = {   /* w, h logic (= ½ ảnh), chân fw × fh, ánh sáng { r bán kính, y cách đáy ảnh, k độ mạnh } */
  pumpkin_s: { w: 16, h: 16, fw: 1, fh: 1, L: { r: 20, y: 6, k: 0.85 } },
  pumpkin_l: { w: 24, h: 22, fw: 1, fh: 1, L: { r: 26, y: 8, k: 0.95 } },
  pumpkin_pile: { w: 32, h: 22, fw: 2, fh: 1, L: { r: 26, y: 7, k: 0.9 } },
  pumpkin_lamp: { w: 16, h: 32, fw: 1, fh: 1, L: { r: 36, y: 8, k: 1, dx: 3 } },   /* bí treo bên phải cột, đáy bí cách chân ~2 px (đo ảnh) */
  grave: { w: 16, h: 20, fw: 1, fh: 1 },
  scarecrow: { w: 24, h: 40, fw: 1, fh: 1 },
  web_fence: { w: 32, h: 24, fw: 2, fh: 1 },
};
const T119 = n => 'h119_' + n;
function defineAll(ctx) {
  for (const [n, d] of Object.entries(DECO)) {
    if (ctx.O[T119(n)]) continue;
    ctx.defineObject(T119(n), d.w, d.h, d.fw, d.fh, g => {   /* vẽ code = dự phòng khi ảnh PixelLab chưa tải */
      const orange = '#e07a1f', dark = '#7a3a10';
      if (/pumpkin/.test(n)) { g.fillStyle = dark; g.fillRect(2, d.h - 10, d.w - 4, 9); g.fillStyle = orange; g.fillRect(3, d.h - 10, d.w - 6, 8); g.fillStyle = '#ffd25e'; g.fillRect(5, d.h - 7, 2, 2); g.fillRect(d.w - 7, d.h - 7, 2, 2); }
      else if (n === 'grave') { g.fillStyle = '#5e6070'; g.fillRect(3, 4, 10, 16); g.fillStyle = '#8a8c9c'; g.fillRect(4, 5, 8, 14); }
      else { g.fillStyle = '#6a4a2a'; g.fillRect((d.w >> 1) - 1, 4, 2, d.h - 4); g.fillRect(2, 12, d.w - 4, 2); }
    }, { solid: true });
  }
}
/* chỗ đặt (ô) theo cụm — tọa độ quanh PLAZA (80, 62) của village88; ô xấu thì tìm ô hợp lệ gần nhất (≤ 3 ô) */
const SPOTS = [
  ['pumpkin_lamp', 77, 73], ['pumpkin_lamp', 84, 73],                 /* cổng Nam vào quảng trường */
  ['pumpkin_lamp', 82, 51], ['pumpkin_lamp', 88, 51],                 /* lối Bắc */
  ['pumpkin_pile', 91, 56], ['pumpkin_s', 90, 59], ['pumpkin_l', 69, 56], ['pumpkin_s', 70, 58],   /* góc quảng trường cạnh đèn */
  ['pumpkin_l', 86, 70], ['pumpkin_s', 74, 70],
  ['grave', 60, 61], ['grave', 62, 60], ['grave', 64, 61], ['web_fence', 61, 63], ['pumpkin_s', 66, 60],   /* nghĩa địa nhỏ phía Tây (trên lối Tây) */
  ['scarecrow', 65, 75], ['pumpkin_pile', 67, 77], ['pumpkin_s', 63, 77],   /* bù nhìn cạnh vườn hoa Tây Nam */
  ['web_fence', 95, 53], ['scarecrow', 99, 59], ['pumpkin_s', 97, 61],      /* Đông quảng trường */
  ['pumpkin_lamp', 119, 66], ['pumpkin_l', 104, 70],                        /* dọc lối Đông */
];
function placeAll(ctx) {
  const S = ctx.S, m = S.map, W = m.w, H = m.h, T = ctx.T, O = ctx.O; ST.placed = []; ST.log = [];
  const ent = m.entries && (m.entries.default || Object.values(m.entries)[0]); if (!ent) return;
  const occ = new Uint8Array(W * H);
  for (const o of m.objects) { const d = O[o.type]; if (!d) continue; for (let j = -1; j <= d.fh; j++) for (let i = -1; i <= d.fw; i++) { const x = o.x + i, y = o.y + j; if (x >= 0 && y >= 0 && x < W && y < H) occ[y * W + x] = 1; } }
  for (const gt of m.gates || []) for (let j = -3; j < gt.h + 3; j++) for (let i = -3; i < gt.w + 3; i++) { const x = gt.x + i, y = gt.y + j; if (x >= 0 && y >= 0 && x < W && y < H) occ[y * W + x] = 1; }
  const bfs = () => { const seen = new Uint8Array(W * H), q = [ent.y * W + ent.x]; seen[q[0]] = 1; let n = 0;
    for (let h = 0; h < q.length; h++) { const c = q[h], x = c % W, y = (c / W) | 0; n++;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue; const k = ny * W + nx; if (seen[k] || m.solid[k]) continue; seen[k] = 1; q.push(k); } }
    return n; };
  let reach = bfs();
  const okAt = (x, y, d) => { for (let j = 0; j < d.fh; j++) for (let i = 0; i < d.fw; i++) { const X = x + i, Y = y + j; if (X < 1 || Y < 1 || X >= W - 1 || Y >= H - 1) return false; const k = Y * W + X, g = m.ground[k];
    if (m.solid[k] || occ[k] || (m.roads && m.roads[k]) || g === T.WATER || g === T.DEEP) return false; } return true; };
  for (const [n, x0, y0] of SPOTS) {
    const d = DECO[n]; let at = null;
    for (let r = 0; r <= 3 && !at; r++) for (let j = -r; j <= r && !at; j++) for (let i = -r; i <= r && !at; i++) { if (Math.max(Math.abs(i), Math.abs(j)) !== r) continue; if (okAt(x0 + i, y0 + j, d)) at = [x0 + i, y0 + j]; }
    if (!at) { ST.log.push(n + '@' + x0 + ',' + y0 + ':no'); continue; }
    const o = ctx.place(m, T119(n), at[0], at[1], { h119: 1 }), r2 = bfs();
    if (r2 < reach - d.fw * d.fh) { ctx.removeObject(m, o); ST.log.push(n + ':block'); continue; }   /* chặn lối → bỏ */
    reach = r2; ST.placed.push(o);
    for (let j = -1; j <= d.fh; j++) for (let i = -1; i <= d.fw; i++) { const X = at[0] + i, Y = at[1] + j; if (X >= 0 && Y >= 0 && X < W && Y < H) occ[Y * W + X] = 1; }
  }
  m._reach = null;
}
function removeAll(ctx) { const m = ctx.S.map; if (!m) return; for (const o of ST.placed) ctx.removeObject(m, o); ST.placed = []; }

/* ---------- lớp sáng ---------- */
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + 0.5) / 16);
const LS = new Map();
function lightSprite(r, col, k) {   /* đĩa sáng bậc 4 mức + dither Bayer ở ranh bậc (không gradient mịn) */
  const key = r + '|' + col + '|' + k; let c = LS.get(key); if (c) return c;
  const n = r * 2 + 1; c = document.createElement('canvas'); c.width = c.height = n; const x = c.getContext('2d'), id = x.createImageData(n, n), D = id.data;
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { const d = Math.hypot(i - r, j - r) / r; if (d >= 1) continue; const v = Math.pow(1 - d, 1.25) * 4, lv = Math.min(4, Math.max(0, Math.floor(v + BAYER[(j & 3) * 4 + (i & 3)] - 0.25))) / 4 * k;
    const o = (j * n + i) * 4; D[o] = col[0] * lv; D[o + 1] = col[1] * lv; D[o + 2] = col[2] * lv; D[o + 3] = 255; }
  x.putImageData(id, 0, 0); LS.set(key, c); return c;
}
const WARM = [255, 150, 70], HALO = [150, 62, 14], PALE = [150, 150, 120], LIGHT_OLD = { lantern: [26, 10, 1], torch: [24, 12, 1], campfire: [30, 6, 1], arena_pillar: [26, 20, 0.9], crystal_p: [22, 10, 0.6], crystal_b: [20, 10, 0.6] };
let LM = null, LMg = null; const LC = { m: null, n: -1, list: [] };
function glowC35(g, ctx, cx, cy) {   /* c35-demban: đêm thường — vầng sáng tĩnh quanh người chơi (vẽ trước lớp tối của main.js nên bù 1/(1-tối)) */
  const S = ctx.S, d = S.dark || 0, p = S.player; if (d < 0.05 || !p || (ctx.altView && ctx.altView())) return;
  const lx = Math.round(p.x - cx), ly = Math.round(p.y - 10 - cy), r = 72, a = Math.min(0.45, d * 0.6 / (1 - d));
  const gr = g.createRadialGradient(lx, ly, 4, lx, ly, r); gr.addColorStop(0, `rgba(200,190,150,${a.toFixed(3)})`); gr.addColorStop(0.55, `rgba(200,186,140,${(a * 0.5).toFixed(3)})`); gr.addColorStop(1, 'rgba(255,228,170,0)');
  g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = gr; g.fillRect(lx - r, ly - r, r * 2, r * 2); g.restore();
}
function drawNight(g, ctx, cx, cy) {
  const kq = Math.round(ST.dk * 10) / 10; if (kq < 0.1) return;   /* c14-thoitiet: ban ngày không phủ đêm; bậc 0,1 để ảnh đèn khỏi tạo mới mỗi khung */
  const VW = ctx.VW, VH = ctx.VH, m = ctx.S.map, O = ctx.O, TS = 16;
  if (!LM || LM.width !== VW || LM.height !== VH) { LM = document.createElement('canvas'); LM.width = VW; LM.height = VH; LMg = LM.getContext('2d'); }
  const a = ST.amb.map(v => Math.round(255 - (255 - v) * kq)); LMg.globalCompositeOperation = 'source-over';   /* c14-thoitiet: tối dần theo giờ */ LMg.fillStyle = `rgb(${a[0]},${a[1]},${a[2]})`; LMg.fillRect(0, 0, VW, VH);
  LMg.globalCompositeOperation = 'lighter'; let n = 0; const HL = [];   /* p119w: tâm đèn — lớp cộng sáng cam sau multiply (multiply trên cỏ xanh ra vàng xanh) */
  const put = (lx, ly, r, k, col = WARM) => { lx = Math.round(lx); ly = Math.round(ly); if (lx < -r || ly < -r || lx > VW + r || ly > VH + r) return; LMg.drawImage(lightSprite(r, col, k), lx - r, ly - r); n++; if (col === WARM) HL.push([lx, ly, r, k]); };
  if (LC.m !== m || LC.n !== m.objects.length) { LC.m = m; LC.n = m.objects.length; LC.list = m.objects.filter(o => (o.h119 && DECO[o.type.slice(5)]) || LIGHT_OLD[o.type]); }   /* p119: nhớ vật phát sáng, không quét cả map mỗi khung */
  for (const o of LC.list) {
    if (o.ruined) continue; const d = O[o.type]; if (!d) continue;
    const L = o.h119 ? DECO[o.type.slice(5)].L : null, old = !L && LIGHT_OLD[o.type];
    if (!L && !old) continue;
    const bx = o.x * TS + d.fw * 8 - cx, by = (o.y + d.fh) * TS - cy;
    if (L) put(bx + (L.dx || 0), by - L.y, L.r, L.k); else put(bx, by - old[1], old[0], old[2]);
  }
  const p = ctx.S.player; if (p) put(p.x - cx, p.y - 10 - cy, 70, 0.62, PALE);   /* c35-demban: 44/0,42 → 70/0,62 */   /* vầng nhẹ quanh người chơi: nhân vật luôn đọc được */
  ST.lightN = n;
  g.save(); g.globalCompositeOperation = 'multiply'; g.imageSmoothingEnabled = false; g.drawImage(LM, 0, 0, VW, VH);
  g.globalCompositeOperation = 'lighter'; for (const [lx, ly, r, k] of HL) { const rr = Math.max(6, Math.round(r * 0.55)); g.drawImage(lightSprite(rr, HALO, k * 0.5 * kq), lx - rr, ly - rr); } g.restore();
}

/* ---------- mưa ---------- */
const H = (i, k) => { let h = Math.imul(i + 1, 2654435761) ^ Math.imul(k + 7, 1597334677); h = Math.imul(h ^ (h >>> 15), 2246822519); h ^= h >>> 13; return (h >>> 0) / 4294967296; };
const wrap = (v, md) => ((v % md) + md) % md;
const RAIN_L = [   /* xa: chậm, ngắn, nét đứt (dither); gần: nhanh, dài, liền */
  { n: 46, vy: 170, len: 3, dash: true, c: '#4f5a7e', par: 0.4 },
  { n: 30, vy: 250, len: 5, dash: false, c: '#7f8db4', par: 0.8 },
];
const SLANT = -0.32;   /* gió xiên trái */
function drawRain(g, ctx, cx, cy) {
  const VW = ctx.VW, VH = ctx.VH, t = ctx.S.time || 0, area = (VW * VH) / (480 * 270), Wd = VW + 40, Hh = VH + 20;
  for (let li = 0; li < RAIN_L.length; li++) {
    const l = RAIN_L[li], N = Math.round(l.n * area * ST.rainK); g.fillStyle = l.c;
    for (let i = 0; i < N; i++) {
      const a = H(i, li * 17 + 1), b = H(i, li * 17 + 2), sp = 0.85 + 0.3 * H(i, li * 17 + 3);
      const y = wrap(b * Hh + t * l.vy * sp - cy * l.par, Hh) - 10, x = wrap(a * Wd + (y + 10) * SLANT - cx * l.par, Wd) - 20;
      for (let s = 0; s < l.len; s++) { if (l.dash && (s & 1)) continue; g.fillRect(Math.round(x - s * SLANT), Math.round(y - s), 1, 1); }
    }
  }
}
const SPL_C = 28, SPL_P = 0.8;   /* toé: lưới 28 px thế giới, mỗi ô 1 giọt / chu kỳ 0,8 s */
function drawSplash(g, ctx, cx, cy) {
  const VW = ctx.VW, VH = ctx.VH, m = ctx.S.map, T = ctx.T, t = ctx.S.time || 0, W = m.w;
  const x0 = Math.floor(cx / SPL_C), x1 = Math.floor((cx + VW) / SPL_C), y0 = Math.floor(cy / SPL_C), y1 = Math.floor((cy + VH) / SPL_C);
  for (let gy = y0; gy <= y1; gy++) for (let gx = x0; gx <= x1; gx++) {
    const s = (gx * 73856093) ^ (gy * 19349663), ph = H(s, 9); if (ph > 0.75 * ST.rainK) continue;
    const tt = t / SPL_P + ph, cyc = Math.floor(tt), a = tt - cyc;
    const wx = gx * SPL_C + Math.floor(H(s, cyc) * SPL_C), wy = gy * SPL_C + Math.floor(H(s, cyc + 999) * SPL_C), tx = wx >> 4, ty = wy >> 4;
    if (tx < 0 || ty < 0 || tx >= W || ty >= m.h) continue;
    const gr = m.ground[ty * W + tx], wet = gr === T.WATER || gr === T.DEEP, x = wx - cx, y = wy - cy;
    if (wet) {   /* gợn vòng nở 1 → 4 px, mờ dần bằng dither (bỏ bớt điểm) */
      if (a > 0.7) continue; const r = 1 + Math.floor(a * 4.5), keep = a < 0.35 ? 1 : 2; g.fillStyle = a < 0.35 ? '#d8ecff' : '#a8c8e8';
      for (let k = 0; k < 8; k++) { if (k % keep) continue; const an = k * Math.PI / 4; g.fillRect(Math.round(x + Math.cos(an) * r * 1.4), Math.round(y + Math.sin(an) * r * 0.7), 1, 1); }
    } else if (!m.solid[ty * W + tx]) {   /* toé trên đất: 1 điểm → 2 giọt bắn lên → tắt */
      if (a > 0.3) continue; g.fillStyle = '#c8d8f0';
      if (a < 0.1) g.fillRect(Math.round(x), Math.round(y), 1, 1);
      else { const u = a < 0.2 ? 1 : 2; g.fillRect(Math.round(x) - u, Math.round(y) - u, 1, 1); g.fillRect(Math.round(x) + u, Math.round(y) - u, 1, 1); }
    }
  }
}

export const halloween119 = {
  id: 'halloween119',
  onZoneEnter(ctx) { defineAll(ctx); ST.placed = []; if (on(ctx)) placeAll(ctx); },
  onZoneLeave(ctx) { ST.placed = []; },
  update(dt, ctx) {
    const act = on(ctx);
    if (act && !ST.placed.length && ctx.S.zone.id === 'village' && !ST.tried) { ST.tried = 1; placeAll(ctx); }
    if (!act && ST.placed.length) removeAll(ctx);
    if (!act) ST.tried = 0;
    if (act) { ST.dk = Math.max(0, Math.min(1, (ctx.S.dark || 0) / 0.34));   /* c35-demban: đồng hồ tối đa 0,34 */ ST.wet = wetStep(ctx, dt); ST.rainK = 0.4 * ST.wet; }   /* c14-thoitiet: đọc độ tối đồng hồ TRƯỚC khi tắt đêm thường */
    if (act) ctx.S.dark = 0;   /* đêm Halloween thay đêm thường (không tối 2 lần) */
  },
  drawGround(g, ctx, cx, cy) { if (on(ctx) && ST.rain && ST.wet > 0.02) drawSplash(g, ctx, cx, cy); },
  draw(g, ctx, cx, cy) {
    if (!on(ctx)) { glowC35(g, ctx, cx, cy); return; } const AV = ctx.altView ? ctx.altView() : null; if (AV) return;
    drawNight(g, ctx, cx, cy); if (ST.rain && ST.wet > 0.02) drawRain(g, ctx, cx, cy);
  },
  key(code, ctx) {
    if (code !== 'F7' || !ctx.S.zone || ctx.S.zone.id !== 'village') return false;
    ST.force = !on(ctx); ST.tried = 0; if (ctx.toast) ctx.toast(ctx.lang && ctx.lang() === 'en' ? (ST.force ? 'Halloween night: on' : 'Halloween night: off') : (ST.force ? 'Đêm Halloween: bật' : 'Đêm Halloween: tắt')); return true;
  },
};
if (typeof window !== 'undefined') window.__h119 = {
  st: () => ({ force: ST.force, date: dateOn(), placed: ST.placed.map(o => [o.type, o.x, o.y]), lightN: ST.lightN, log: ST.log, rain: ST.rain, amb: ST.amb, dk: +ST.dk.toFixed(2), wet: +ST.wet.toFixed(2) }),
  on: () => !!(window.__CTX && on(window.__CTX)), set: o => Object.assign(ST, o), dateOn,
};
