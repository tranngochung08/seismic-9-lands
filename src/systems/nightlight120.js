/* nightlight120.js — c67-world (plan-120 #11): ÁNH SÁNG ĐÊM cho người chơi + chiêu, mọi vùng (đêm thường của main.js: lớp tối rgba(10,12,40,S.dark)).
   Cách làm (vẽ code, không ảnh): ở sys.draw (hệ CUỐI danh sách, TRƯỚC lớp tối của main.js) tự phủ lớp tối GIỐNG HỆT main.js (rgba(10,12,40,S.dark))
   nhưng KHOÉT lỗ sáng 16 bậc quanh nguồn sáng (destination-out, không dither chấm bi — anh đã bỏ ở c42) + cộng 1 lớp màu ấm nhẹ, rồi tự vẽ lại
   vầng đèn / cửa sổ (chép nguyên khối đèn của main.js) + đom đóm (drawFireflies69) và đặt S.dark = 0 cho PHẦN CÒN LẠI của khung → main.js không phủ tối lần 2
   (main.js gán lại S.dark từ đồng hồ đầu mỗi update). Tĩnh: không nhấp nháy, không lặp.
   Nguồn sáng: (1) quanh người chơi (r 64) · (2) đạn / tia đang bay đã khai báo ctx.threat (ki.js) — quầng nhỏ dẹt chiếu xuống đất
   · (3) điểm sáng của VFX code chiêu Chấn Thú (PXFX.list[].c.lights) · (4) chớp ngắn khi trúng đòn / quái ngã / lên cấp (WFX 'hit' 'kill' 'levelup', ≤ 0,25 s)
   · (5) ctx.light120.add({ x, y, r, col:[r,g,b], k }) — mọi hệ khác gọi MỖI KHUNG cho đạn của mình (tự xoá sau mỗi khung).
   Không chạy: ban ngày (S.dark < 0,03), Làng lúc đêm Halloween (halloween119 đặt S.dark = 0 → tự nhường), vùng hầm (m.dungeon có lớp sáng riêng), Biển (đèn hải đăng của main.js đọc S.dark), góc nhìn khác (altView).
   Tắt thử: ?night120=0. Móc test: window.__nl120. */
import { PXFX } from './pxfx.js';
import { WFX } from './pxfx_world.js';
import { drawFireflies69 } from './weather69.js';

const OFF = typeof location !== 'undefined' && /[?&]night120=0\b/.test(location.search);
const WARM = [255, 222, 170], LV = 16, MAXL = 14;
const ST = { reg: [], n: 0, last: [], buf: null, bg: null, masks: new Map(), force: null };

function mask(r, sq) {   /* đĩa alpha 16 bậc (logic px), sq = dẹt theo trục y (mặt đất) */
  const key = r + '|' + sq; let c = ST.masks.get(key); if (c) return c;
  const w = r * 2, h = Math.max(2, Math.round(r * 2 * sq)); c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d'), id = x.createImageData(w, h), D = id.data;
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const dx = (i + 0.5 - r) / r, dy = (j + 0.5 - h / 2) / (h / 2), d = Math.hypot(dx, dy); if (d >= 1) continue;
    const v = Math.round(Math.pow(1 - d, 1.15) * LV) / LV, o = (j * w + i) * 4; D[o] = D[o + 1] = D[o + 2] = 255; D[o + 3] = Math.round(255 * Math.min(1, v * 1.25)); }
  x.putImageData(id, 0, 0); ST.masks.set(key, c); return c;
}
const colOf = c => Array.isArray(c) ? c : typeof c === 'number' ? [c & 255, (c >>> 8) & 255, (c >>> 16) & 255] : WARM;

function collect(ctx) {
  const S = ctx.S, p = S.player, out = [], t = S.time || 0;
  if (p && !p.hidden) out.push({ x: p.x, y: p.y - 6, r: 64, sq: 0.9, k: 1, col: WARM, warm: 0.08, hole: 0.78 });
  try { if (ctx.threat && ctx.threat.list) for (const th of ctx.threat.list()) {
    if (th.done) continue; const fx = th.from.x, fy = th.from.y, dx = th.to.x - fx, dy = th.to.y - fy, L = Math.hypot(dx, dy) || 1;
    if (th.speed != null && th.t0 != null) { const s = th.speed * (t - th.t0); if (s < 0 || s > L + 4) continue; out.push({ x: fx + dx / L * s, y: fy + dy / L * s + 6, r: 18, sq: 0.6, k: 0.8, col: [255, 236, 200], tint: 0.6 }); }
    else if (th.kind === 'beam' && th.at != null && t >= th.at && t <= th.at + Math.max(0.15, th.dur || 0)) { const n = Math.min(6, Math.ceil(L / 40)); for (let i = 0; i <= n; i++) out.push({ x: fx + dx * i / n, y: fy + dy * i / n + 6, r: 20, sq: 0.6, k: 0.7, col: [255, 236, 210], tint: 0.6 }); }
  } } catch (e) { }
  try { for (const e of PXFX.list) for (const l of (e.c && e.c.lights) || []) { const k = l.max ? l.life / l.max : 1; out.push({ x: l.x, y: l.y, r: Math.max(10, Math.min(40, Math.round(l.r * 1.4))), sq: 0.7, k: Math.min(1, (l.k || 0.5) * 1.4 * k), col: colOf(l.col), tint: 0.5 }); } } catch (e) { }
  try { for (const e of WFX.list) { const kd = e.kind, tt = e.c ? e.c.t : 1; if ((kd === 'hit' || kd === 'kill' || kd === 'levelup') && tt < 0.25) out.push({ x: e.x, y: e.y, r: kd === 'levelup' ? 40 : 22, sq: 0.7, k: 1 - tt / 0.25, col: kd === 'levelup' ? [255, 240, 170] : [255, 226, 190], tint: 0.4 }); } } catch (e) { }
  for (const l of ST.reg) out.push({ sq: 0.65, k: 0.8, tint: 0.5, ...l, r: Math.max(6, Math.min(80, l.r || 16)), col: colOf(l.col) });
  ST.reg.length = 0;
  return out;
}

const LAMP = { lantern: 22, torch: 20, arena_pillar: 26, campfire: 18, crystal_p: 24, crystal_b: 20, lighthouse: 30, gcrystal: 44, vent: 10 };   /* = main.js khối đêm (LIGHT) */
const WIN = { memorial: [[0.5, 0.345, 16], [0.33, 0.85, 7], [0.64, 0.85, 7]], eco_coop: [[0.53, 0.64, 10]], stall: [[0.5, 0.45, 18]] };   /* = main.js WIN45 */
function tinted(r, sq, col) {   /* đĩa màu 16 bậc (alpha theo mặt nạ) cho lớp ấm cộng thêm */
  const key = 't' + r + '|' + sq + '|' + col.join(','); let c = ST.masks.get(key); if (c) return c; const m = mask(r, sq);
  c = document.createElement('canvas'); c.width = m.width; c.height = m.height; const x = c.getContext('2d'); x.drawImage(m, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = `rgb(${col[0]},${col[1]},${col[2]})`; x.fillRect(0, 0, c.width, c.height);
  ST.masks.set(key, c); return c;
}
function lamps(g, ctx, cx, cy, d, VW, VH) {   /* chép nguyên vầng đèn + cửa sổ của main.js (main bỏ qua khi S.dark = 0) */
  const m = ctx.S.map, O = ctx.O, TS = 16; g.save(); g.globalCompositeOperation = 'lighter';
  for (const o of m.objects) { const r = LAMP[o.type]; if (!r || o.ruined) continue; const dd = O[o.type]; if (!dd) continue; const lx = o.x * TS + dd.fw * 8 - cx, ly = (o.y + dd.fh) * TS - 10 - cy; if (lx < -r || ly < -r || lx > VW + r || ly > VH + r) continue; const gr = g.createRadialGradient(lx, ly, 2, lx, ly, r); gr.addColorStop(0, `rgba(255,200,110,${(d * 1.6).toFixed(3)})`); gr.addColorStop(1, 'rgba(255,200,110,0)'); g.fillStyle = gr; g.fillRect(lx - r, ly - r, r * 2, r * 2); }
  for (const o of m.objects) { const pts = WIN[o.type]; if (!pts || o.ruined) continue; const dd = O[o.type]; if (!dd) continue; const ix = o.x * TS + (dd.ox || 0) - cx, iy = (o.y + dd.fh) * TS - dd.h - cy;
    for (const [fx, fy, r] of pts) { const lx = ix + fx * dd.w, ly = iy + fy * dd.h; if (lx < -r || ly < -r || lx > VW + r || ly > VH + r) continue; const gr = g.createRadialGradient(lx, ly, 1, lx, ly, r); gr.addColorStop(0, `rgba(255,196,104,${(d * 1.5).toFixed(3)})`); gr.addColorStop(1, 'rgba(255,196,104,0)'); g.fillStyle = gr; g.fillRect(lx - r, ly - r, r * 2, r * 2); } }
  g.restore();
}

export const nightlight120 = {
  id: 'nightlight120',
  always: true,
  onZoneEnter(ctx) {
    ST.reg.length = 0;
    ctx.light120 = { dark: () => ST.d || 0, add: o => { if (o && isFinite(o.x) && isFinite(o.y) && ST.reg.length < 32) ST.reg.push(o); } };
    if (typeof window !== 'undefined') window.__nl120 = { n: () => ST.n, last: () => ST.last.slice(), set: v => { ST.force = v; }, masks: () => ST.masks.size };
  },
  draw(g, ctx, cx, cy) {
    const S = ctx.S, d = ST.force != null ? ST.force : (S.dark || 0); ST.n = 0;
    if (OFF || d < 0.03 || !S.map || S.map.dungeon || S.map.sea || (ctx.altView && ctx.altView())) { ST.reg.length = 0; ST.last = []; return; }
    const VW = ctx.VW, VH = ctx.VH; if (!ST.ov || ST.ov.width !== VW || ST.ov.height !== VH) { ST.ov = document.createElement('canvas'); ST.ov.width = VW; ST.ov.height = VH; ST.og = ST.ov.getContext('2d'); }
    const og = ST.og, list = collect(ctx).slice(0, MAXL), last = [];
    og.globalCompositeOperation = 'copy'; og.globalAlpha = 1; og.fillStyle = `rgba(10,12,40,${d.toFixed(3)})`; og.fillRect(0, 0, VW, VH);   /* = lớp tối main.js */
    og.globalCompositeOperation = 'destination-out'; og.imageSmoothingEnabled = false;
    const vis = [];
    for (const l of list) { const r = Math.round(l.r), mk = mask(r, l.sq), x = Math.round(l.x - cx - r), y = Math.round(l.y - cy - mk.height / 2); if (x > VW || y > VH || x + mk.width < 0 || y + mk.height < 0) continue;
      og.globalAlpha = Math.max(0, Math.min(1, l.k * (l.hole || 0.85))); og.drawImage(mk, x, y); vis.push([l, x, y, r]); last.push([Math.round(l.x), Math.round(l.y), r]); }
    g.save(); g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1; g.imageSmoothingEnabled = false; g.drawImage(ST.ov, 0, 0, VW, VH);
    g.globalCompositeOperation = 'lighter'; const kd = Math.min(1, d / 0.34);
    for (const [l, x, y, r] of vis) { g.globalAlpha = Math.max(0, Math.min(1, l.k * (l.warm == null ? 0.32 : l.warm) * kd)); g.drawImage(tinted(r, l.sq, l.col), x, y); }
    g.restore();
    lamps(g, ctx, cx, cy, d, VW, VH);
    try { drawFireflies69(g, S, cx, cy, VW, VH); } catch (e) { }
    S.dark = 0; ST.n = vis.length; ST.last = last; ST.d = d;   /* main.js: không phủ tối / vầng đèn / đom đóm lần 2 trong khung này */
  },
};
