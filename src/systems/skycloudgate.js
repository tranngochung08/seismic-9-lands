/* skycloudgate.js — plan-41 CỔNG MÂY (anh chốt 2026-10-16): trên trời CHỈ sang trời kề qua cổng mây ở giữa mép Bắc / Nam
   (đúng cột giữa như lối đất; khe bay qua 4 ô = 64 px), ngoài khe là tường sương như mép Đông / Tây.
   · Vòm mây TĨNH PixelLab (assets/px/zones/sky/gatecloud/): cg_open (mây trắng) · cg_lock (mây xám + xích + ổ khoá, create_object_state từ vòm mở)
     · cg_plaque (bảng tên). Ảnh 2× → vẽ ½ cỡ ảnh = cùng mật độ điểm ảnh với người chơi, không phóng, không hiệu ứng lặp.
   · Chữ trên bảng (mã ngắn '↑ M8') + nhãn tên đầy đủ trên vòm (kiểu nhãn biển lối dưới đất) vẽ ở lớp UI bằng font game.
   · Hàm thuần: sky.js đưa danh sách cổng { side, x, base, lock, code, name, need } + toạ độ camera (không import ngược sky.js). */
const TS = 16;
export const CG = { HW: 32, BASE_N: 24, BASE_S: 6, H: 63, PW: 40, PH: 12, CLEAR: 54, RAMP: 40, D: 150, ARR_N: 18, ARR_S: 50 };   /* ARR_*: chỗ hiện ra sau khi qua cổng (Bắc: trước vòm · Nam: vừa ra khỏi đỉnh vòm, không bị vòm che) */
export const cgX = m => (m.w >> 1) * TS + 8;   /* cột giữa bản đồ (như gatePos / lối đất) */
export const cgIn = (m, x) => Math.abs(x - cgX(m)) <= CG.HW;   /* trong khe bay qua của cổng */
export const cgBase = (m, side) => (side === 'n' ? CG.BASE_N : m.h * TS - CG.BASE_S);   /* chân vòm (mặt phẳng cổng) */
const IMS = {}, DIR = 'assets/px/zones/sky/gatecloud/';
function img(n) { if (typeof Image === 'undefined') return null; let im = IMS[n]; if (!im) { im = IMS[n] = new Image(); im.src = DIR + n + '.png'; } return im.complete && im.naturalWidth ? im : null; }
export function cgPreload() { img('cg_open'); img('cg_lock'); img('cg_plaque'); }
export const cgReady = () => !!(img('cg_open') && img('cg_lock') && img('cg_plaque'));
function body(g, gt, cx, cy) {
  const im = img(gt.lock ? 'cg_lock' : 'cg_open'); if (!im) return false;
  const w = im.naturalWidth / 2, h = im.naturalHeight / 2, sm = g.imageSmoothingEnabled; g.imageSmoothingEnabled = false;
  g.drawImage(im, Math.round(gt.x - w / 2 - cx), Math.round(gt.base - h - cy), w, h);
  const pq = img('cg_plaque'); if (pq) { const pw = pq.naturalWidth / 2, ph = pq.naturalHeight / 2; g.drawImage(pq, Math.round(gt.x - pw / 2 - cx), Math.round(gt.base - h + 3 - cy), pw, ph); }
  g.imageSmoothingEnabled = sm; return true;
}
/* lớp SAU: vòm là vật đứng trên biển mây, xếp theo y chân vòm (người bay cao có sortUp → bình thường vẽ trên vòm) */
export function cgDrawables(gates, g, cx, cy, VW, VH, out) {
  for (const gt of gates) { if (gt.x + 60 < cx || gt.x - 60 > cx + VW || gt.base < cy - 8 || gt.base - 72 > cy + VH) continue; out.push({ y: gt.base, f: () => body(g, gt, cx, cy) }); }
}
/* lớp TRƯỚC: người / Rocky đã lọt qua mặt phẳng cổng (y < chân vòm, sát vòm) → vòm che lên họ, chỉ trong khung của họ
   (không che quái / vật khác); càng sâu sau vòm càng nhìn xuyên (tối thiểu 42 %) để người không mất hút sau đỉnh vòm. ents: [{ x, y, top, bot }] (toạ độ thế giới) */
export function cgDrawFront(g, gates, cx, cy, ents) {
  for (const gt of gates) for (const e of ents) {
    const d = gt.base - e.y; if (d <= 0 || d > 64 || Math.abs(e.x - gt.x) > 56) continue;
    const a = d <= 8 ? 1 : Math.max(0.42, 1 - (d - 8) / 18);
    g.save(); g.beginPath(); g.rect(Math.round(e.x - 14 - cx), Math.round(e.top - cy), 28, Math.max(1, Math.round(e.bot - e.top))); g.clip(); g.globalAlpha = a; body(g, gt, cx, cy); g.restore();
  }
}
/* tường sương mép Bắc / Nam (cùng kiểu skyEdgeFog Đông / Tây: dày dần ra ngoài, không vạch cứng); gx = cột cổng → chừa khe quanh vòm, mềm 2 bên khe; gx null → kín cả mép */
export function cgFogNS(g, side, m, gx, cx, cy, VW, VH, col) {
  const D = CG.D, H = m.h * TS, n = side === 'n'; if (n ? cy >= D : cy + VH <= H - D) return;
  const gr = g.createLinearGradient(0, (n ? D : H - D) - cy, 0, (n ? -20 : H + 20) - cy); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, col); g.fillStyle = gr;
  const ry = n ? -VH - 40 : H - D, rh = D + VH + 40, X0 = cx - 10, X1 = cx + VW + 10;
  const R = (x0, x1, al) => { x0 = Math.max(X0, x0); x1 = Math.min(X1, x1); if (x1 <= x0) return; g.globalAlpha = al; g.fillRect(Math.round(x0 - cx), Math.round(ry - cy), Math.round(x1 - x0), Math.round(rh)); };
  if (gx == null) { R(X0, X1, 0.95); g.globalAlpha = 1; return; }
  const a = gx - CG.CLEAR, b = gx + CG.CLEAR, RP = CG.RAMP;
  R(X0, a - RP, 0.95); R(b + RP, X1, 0.95);
  for (let i = 0; i < RP; i += 2) { const k = 1 - (i + 1) / RP, al = 0.95 * k * k * (3 - 2 * k); R(a - RP + i, a - RP + i + 2, al); R(b + RP - i - 2, b + RP - i, al); }
  g.globalAlpha = 1;
}
/* lớp UI (chữ sắc nét ở độ phân giải màn): mã ngắn trên bảng + nhãn tên trên vòm (khoá: nhãn hồng 'Cần huy hiệu Mx').
   o.alpha: mờ theo cảnh chuyển · o.hideLabel(gt): ẩn nhãn (người đang trong vòm — khỏi đè tên người chơi) */
export function cgDrawUI(ug, gates, cx, cy, sc, o = {}) {
  if (!gates.length || !cgReady()) return; const al = o.alpha ?? 1; if (al <= 0.02) return;
  const F = n => 'bold ' + n + 'px VT323, monospace', W = ug.canvas.width, Hc = ug.canvas.height;
  ug.save(); ug.textAlign = 'center'; ug.textBaseline = 'alphabetic'; ug.globalAlpha = al;
  for (const gt of gates) {
    const sx = Math.round((gt.x - cx) * sc), top = gt.base - CG.H; if (sx < 0 || sx > W || (top - cy) * sc > Hc + 30 || (gt.base - cy) * sc < -30) continue;   /* chỉ khi giữa vòm trong màn (nhãn không bị kẹp đè lên HUD) */
    let fz = Math.max(9, Math.round(sc * 6)); ug.font = F(fz); while (fz > 8 && ug.measureText(gt.code).width > (CG.PW - 10) * sc) ug.font = F(--fz);
    ug.fillStyle = gt.lock ? '#6e6258' : '#5e3a16'; ug.fillText(gt.code, sx, Math.round((top + 3 + CG.PH / 2 - cy) * sc + fz * 0.33));
    if (o.hideLabel && o.hideLabel(gt)) continue;
    const ef = Math.round(Math.max(10, sc * 3) * 1.4); ug.font = F(ef);
    const text = gt.lock ? gt.need : gt.name, w = ug.measureText(text).width + 10, hh = ef + 4, x0 = Math.max(2, Math.min(W - w - 2, sx - w / 2)), y0 = Math.round((top - 2 - cy) * sc) - hh;
    ug.fillStyle = 'rgba(13,11,20,.7)'; ug.beginPath(); if (ug.roundRect) ug.roundRect(x0, y0, w, hh, 3); else ug.rect(x0, y0, w, hh); ug.fill();
    ug.fillStyle = gt.lock ? '#ff9a9a' : '#ffd45e'; ug.fillText(text, x0 + w / 2, y0 + hh - 2);
  }
  ug.restore();
}
