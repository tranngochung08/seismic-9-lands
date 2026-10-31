// dungeon.js — plan-46 Đợt C (2026-10-28): vùng HẦM phong cách v3 (map.dungeon, hiện chỉ Sàn Đấu Ngầm — world.js buildArena).
//  · drawBase: ảnh nền ghép sẵn cả vùng (ảnh PixelLab ghép vá, tools/px-p46c-arena.py) thay cho vẽ ô + hố dung nham động (khung PixelLab animate_image).
//  · drawLight: lớp ánh sáng (Đợt B, phương án B anh chốt): bản đồ sáng vẽ vào canvas phụ 1/4 độ phân giải (rẻ) rồi phóng mượt lên khung:
//      'multiply' = tối ambient + quầng ấm quanh lửa (lò rèn, cột lửa, dung nham, vạc, nến) + quầng hơi lạnh quanh người chơi;
//      'lighter'  = hắt màu cam nhẹ quanh lửa. Nguồn sáng TĨNH (lửa chỉ 'thở' rất chậm ±3 %, không nhấp nháy — luật hiệu ứng lặp).
//  · rim: viền sáng MỘT PHÍA cho người chơi (+ quái / bạn tập) hướng về nguồn lửa gần nhất: tô điểm thứ 2–3 tính từ mép vào trong
//      (giữ nét viền tối — v3 vòng 1 tô lên nét viền thành nét dán bị chê). Mặt nạ tính 1 lần / khung ảnh / hướng rồi lưu đệm.
//  · Camera vùng hầm 1,25× (main.js resize: DUNGEON.zoom).
// Không dùng CSS filter (Safari điện thoại vẽ đen) — chỉ globalCompositeOperation của canvas.
const TS = 16;
export const DUNGEON = { zoom: 1.25, amb: 0.5, on: true };
const IM = {};
function img(src) { let i = IM[src]; if (!i) { i = IM[src] = new Image(); i.src = 'assets/px/' + src; } return i.complete && i.naturalWidth ? i : null; }
export function preload(m) { const D = m && m.dungeon; if (!D) return; img(D.bg); for (const L of D.lava || []) for (let i = 0; i < L.n; i++) img(L.frames + i + '.png'); }

export function drawBase(g, m, cx, cy, VW, VH, t) {
  const D = m.dungeon; if (!D) return false; const bg = img(D.bg); if (!bg) return false;
  g.fillStyle = '#060408'; g.fillRect(0, 0, VW, VH);
  const o = D.bgOff || 0, k = bg.naturalWidth / (m.w * TS + 2 * o);   /* ảnh nền nới o px logic ra ngoài bản đồ mỗi phía (khối đá tối) */
  const x0 = Math.max(-o, cx), y0 = Math.max(-o, cy), x1 = Math.min(m.w * TS + o, cx + VW), y1 = Math.min(m.h * TS + o, cy + VH);
  if (x1 > x0 && y1 > y0) g.drawImage(bg, (x0 + o) * k, (y0 + o) * k, (x1 - x0) * k, (y1 - y0) * k, x0 - cx, y0 - cy, x1 - x0, y1 - y0);
  for (const L of D.lava || []) {   /* dung nham: khung ghim 2 đầu (PixelLab) — chảy chậm 5 khung/giây, vòng khép kín */
    const x = Math.round(L.x - L.w / 2 - cx), y = Math.round(L.y - L.h / 2 - cy); if (x > VW || y > VH || x + L.w < 0 || y + L.h < 0) continue;
    const im = img(L.frames + (Math.floor(t * 5) % L.n) + '.png'); if (im) g.drawImage(im, x, y, L.w, L.h);
  }
  return true;
}

/* ---------- nguồn sáng ---------- */
const WARM = [255, 214, 168], COOL = [222, 226, 255];
const SRC = {   /* loại vật → [dx, dy (từ góc trái-đáy ô gốc, logic), bán kính, độ mạnh] */
  arena_pillar: [8, -9, 66, 0.9], dg_forge: [16, -16, 118, 1.0], dg_cauldron: [16, -4, 46, 0.5], dg_candles: [8, -8, 40, 0.5],
};
function lights(S, m, t) {
  const out = [], br = 1 + 0.03 * Math.sin(t * 0.9);
  for (const o of m.objects) { const s = SRC[o.type]; if (!s || o.ruined) continue; out.push({ x: o.x * TS + s[0], y: (o.y + 1) * TS + s[1], r: s[2] * br, k: s[3], warm: 1 }); }
  for (const L of (m.dungeon && m.dungeon.lava) || []) out.push({ x: L.x, y: L.y, r: 120 * br, k: 1, warm: 1 });
  if (m.sparRing) out.push({ x: m.sparRing.x, y: m.sparRing.y, r: m.sparRing.r * 1.35, k: 0.42, warm: 0.4 });   /* ánh lửa 8 cột hắt vào lòng sàn: đủ sáng đọc đòn / vòng báo đòn */
  return out;
}
const LC = { c: null, g: null, c2: null, g2: null, w: 0, h: 0 };
const Q = 4;   /* canvas sáng = 1/4 cỡ khung logic */
function lcv(w, h) {
  if (!LC.c || LC.w !== w || LC.h !== h) {
    for (const k of ['c', 'c2']) { const c = document.createElement('canvas'); c.width = w; c.height = h; LC[k] = c; LC[k === 'c' ? 'g' : 'g2'] = c.getContext('2d'); }
    LC.w = w; LC.h = h;
  }
}
function grad(x, cx0, cy0, r, col, a) {   /* quầng: giảm dần mềm (gần g^1.25 của v3) */
  const gr = x.createRadialGradient(cx0, cy0, 0, cx0, cy0, r), c = `${col[0]},${col[1]},${col[2]}`;
  gr.addColorStop(0, `rgba(${c},${a})`); gr.addColorStop(0.45, `rgba(${c},${(a * 0.5).toFixed(3)})`); gr.addColorStop(1, `rgba(${c},0)`);
  x.fillStyle = gr; x.fillRect(cx0 - r, cy0 - r, r * 2, r * 2);
}
export const LIGHT_STAT = { n: 0, ms: 0 };
export function drawLight(g, S, cx, cy, VW, VH) {
  const m = S.map; if (!m || !m.dungeon || !DUNGEON.on) return;
  const t0 = performance.now(), w = Math.ceil(VW / Q) + 2, h = Math.ceil(VH / Q) + 2; lcv(w, h);
  const x = LC.g, x2 = LC.g2, A = DUNGEON.amb, p = S.player, L = lights(S, m, S.time);
  x.globalCompositeOperation = 'source-over'; x.fillStyle = `rgb(${Math.round(255 * A * 0.92)},${Math.round(255 * A * 0.88)},${Math.round(255 * A)})`; x.fillRect(0, 0, w, h);
  x2.globalCompositeOperation = 'source-over'; x2.clearRect(0, 0, w, h);
  x.globalCompositeOperation = 'lighter'; x2.globalCompositeOperation = 'lighter';
  let n = 0;
  for (const l of L) {
    const sx = (l.x - cx) / Q, sy = (l.y - cy) / Q, r = l.r / Q; if (sx < -r || sy < -r || sx > w + r || sy > h + r) continue; n++;
    const col = l.warm >= 1 ? WARM : [Math.round(WARM[0] * l.warm + COOL[0] * (1 - l.warm)), Math.round(WARM[1] * l.warm + COOL[1] * (1 - l.warm)), Math.round(WARM[2] * l.warm + COOL[2] * (1 - l.warm))];
    grad(x, sx, sy, r, col, (l.k * (1.05 - A)).toFixed(3));
    if (l.warm >= 1) grad(x2, sx, sy, r * 0.9, [74, 30, 4], (0.55 * l.k).toFixed(3));   /* hắt cam (v3: +58/+20/−10) */
  }
  if (p) { const sx = (p.x - cx) / Q, sy = (p.y - 12 - cy) / Q; grad(x, sx, sy, 92 / Q, COOL, (1.0 - A).toFixed(3)); grad(x2, sx, sy, 80 / Q, [18, 18, 24], '0.9'); }   /* quầng người chơi (phương án B) */
  g.save(); g.imageSmoothingEnabled = true;
  g.globalCompositeOperation = 'multiply'; g.drawImage(LC.c, 0, 0, w, h, 0, 0, w * Q, h * Q);
  g.globalCompositeOperation = 'lighter'; g.drawImage(LC.c2, 0, 0, w, h, 0, 0, w * Q, h * Q);
  g.restore();
  LIGHT_STAT.n = n; LIGHT_STAT.ms = performance.now() - t0;
}

/* ---------- viền sáng một phía (rim) ---------- */
const REC = { on: false, list: [], g: null, raw: null };
export function recStart(g) {
  if (REC.on) return; REC.on = true; REC.g = g; const raw = REC.raw = Object.getPrototypeOf(g).drawImage;
  g.drawImage = function (img, a0, a1, a2, a3, a4, a5, a6, a7) {
    const n = arguments.length; if (img && (img.width || 0) >= 8) REC.list.push({ img, n, a: [a0, a1, a2, a3, a4, a5, a6, a7], tf: this.getTransform() });
    return n === 3 ? raw.call(this, img, a0, a1) : n === 5 ? raw.call(this, img, a0, a1, a2, a3) : raw.call(this, img, a0, a1, a2, a3, a4, a5, a6, a7);
  };
}
export function recStop(g) { if (!REC.on) return; delete g.drawImage; REC.on = false; }
const RIM = new WeakMap(); let rimN = 0;
const RIMCOL = [255, 178, 106];
function realSize(img) { return [img.__w || img.naturalWidth || img.width, img.__h || img.naturalHeight || img.height]; }
function rimCanvas(r, sx, sy) {   /* mặt nạ viền sáng cho 1 lần vẽ (cùng nguồn ảnh) theo hướng (sx, sy) ∈ {-1,0,1} */
  const { img, n, a } = r, k = img.__hi || 1;
  let RW, RH; if (n === 9) { RW = Math.round(a[2] * k); RH = Math.round(a[3] * k); } else [RW, RH] = realSize(img);
  if (!(RW >= 4 && RH >= 4 && RW <= 512 && RH <= 512)) return null;
  let mp = RIM.get(img); if (!mp) { mp = new Map(); RIM.set(img, mp); }
  const key = (n === 9 ? a.slice(0, 4).join(',') : 'all') + '|' + sx + ',' + sy; let c = mp.get(key); if (c !== undefined) return c;
  if (rimN > 600) { c = null; mp.set(key, c); return c; }   /* chặn bộ đệm phình */
  const tc = document.createElement('canvas'); tc.width = RW; tc.height = RH; const tg = tc.getContext('2d'); tg.imageSmoothingEnabled = false;
  if (n === 9) tg.drawImage(img, a[0], a[1], a[2], a[3], 0, 0, RW, RH); else tg.drawImage(img, 0, 0, RW, RH);
  let d; try { d = tg.getImageData(0, 0, RW, RH); } catch (e) { mp.set(key, null); return null; }
  const s = d.data, al = new Uint8Array(RW * RH); for (let i = 0; i < RW * RH; i++) al[i] = s[i * 4 + 3] > 0 ? 1 : 0;
  const at = (x, y) => x >= 0 && y >= 0 && x < RW && y < RH ? al[y * RW + x] : 0;
  const o = tg.createImageData(RW, RH), od = o.data; let any = 0;
  for (let y = 0; y < RH; y++) for (let x = 0; x < RW; x++) {
    if (!al[y * RW + x]) continue;
    let e0 = !at(x + sx, y + sy); if (sx && sy) e0 = e0 || !at(x + sx, y) || !at(x, y + sy);   /* nét viền ngoài phía nguồn sáng: GIỮ tối */
    if (e0) continue;
    const e1 = !at(x + 2 * sx, y + 2 * sy), e2 = !e1 && !at(x + 3 * sx, y + 3 * sy);
    if (!e1 && !e2) continue; const kk = e1 ? 0.75 : 0.34, i = (y * RW + x) * 4;
    od[i] = RIMCOL[0]; od[i + 1] = RIMCOL[1]; od[i + 2] = RIMCOL[2]; od[i + 3] = Math.round(255 * kk); any++;
  }
  if (!any) { mp.set(key, null); return null; }
  tg.clearRect(0, 0, RW, RH); tg.putImageData(o, 0, 0); mp.set(key, tc); rimN++; return tc;
}
export const RIM_STAT = { n: 0, last: null };
/* vẽ viền cho mọi lần vẽ đã ghi (gọi SAU lớp sáng) — wx, wy: chân nhân vật (thế giới) để chọn nguồn sáng */
export function rimFlush(g, S, groups, cx = 0, cy = 0, K = 2) {
  RIM_STAT.n = 0; const m = S.map; if (!m || !m.dungeon || !DUNGEON.on) { REC.list.length = 0; return; }
  const L = lights(S, m, S.time).filter(l => l.warm >= 1), raw = REC.raw || Object.getPrototypeOf(g).drawImage;
  for (const gp of groups) {
    if (gp.i1 <= gp.i0) continue;
    if (gp.x === null) { const r = REC.list[gp.i0], tf = r.tf, dx0 = r.n === 9 ? r.a[4] : r.a[0], dw = r.n === 5 ? r.a[2] : r.n === 9 ? r.a[6] : realSize(r.img)[0] / (r.img.__hi || 1); gp.x = cx + (tf.e + tf.a * (dx0 + dw / 2)) / K; }   /* quái: tâm ảnh đầu tiên → toạ độ thế giới */
    let best = null, bv = 0.12;
    for (const l of L) { const d = Math.hypot(l.x - gp.x, (l.y - gp.y) * 1.15); if (d >= l.r * 1.25) continue; const v = l.k * Math.pow(1 - d / (l.r * 1.25), 1.1); if (v > bv) { bv = v; best = l; } }
    if (!best) continue;
    const dx = best.x - gp.x, dy = best.y - (gp.y - 10), len = Math.hypot(dx, dy) || 1, ux = dx / len, uy = dy / len;
    const qx = Math.abs(ux) > 0.38 ? Math.sign(ux) : 0, qy = Math.abs(uy) > 0.38 ? Math.sign(uy) : 0; if (!qx && !qy) continue;
    const alpha = Math.min(1, bv * 1.6);
    for (let i = gp.i0; i < gp.i1; i++) {
      const r = REC.list[i]; const tf = r.tf; const fx = tf.a < 0 ? -1 : 1, fy = tf.d < 0 ? -1 : 1;
      const c = rimCanvas(r, qx * fx, qy * fy); if (!c) continue;
      const k = r.img.__hi || 1; let dx0, dy0, dw, dh;
      if (r.n === 3) { const [RW, RH] = realSize(r.img); dx0 = r.a[0]; dy0 = r.a[1]; dw = RW / k; dh = RH / k; }
      else if (r.n === 5) { dx0 = r.a[0]; dy0 = r.a[1]; dw = r.a[2]; dh = r.a[3]; }
      else { dx0 = r.a[4]; dy0 = r.a[5]; dw = r.a[6]; dh = r.a[7]; }
      if (!(dh >= 10)) continue;   /* bỏ bóng chân / vật nhỏ */
      g.save(); g.setTransform(tf); g.imageSmoothingEnabled = false; g.globalAlpha = alpha; raw.call(g, c, 0, 0, c.width, c.height, dx0, dy0, dw, dh); g.restore(); RIM_STAT.n++;
    }
    RIM_STAT.last = { qx, qy, alpha: +alpha.toFixed(2) };
  }
  REC.list.length = 0;
}
export const recMark = () => REC.list.length;
if (typeof window !== 'undefined') window.__dg = { light: () => ({ ...LIGHT_STAT, ms: +LIGHT_STAT.ms.toFixed(2) }), rim: () => ({ ...RIM_STAT }), D: DUNGEON };
