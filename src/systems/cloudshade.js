// cloudshade.js — 2026-10-13 anh: "dưới đất có bóng mây do mây che ánh nắng mặt trời cho đẹp".
//  · Bóng mây trôi chậm theo gió trên mặt đất các vùng NGOÀI TRỜI (Làng, M1–M9), chỉ ban ngày (mờ dần khi chiều tối, tắt về đêm).
//  · Hình bóng = 4 đám mây PixelLab (assets/px/fx/cloudshadow/raw_*) → làm mờ Gauss thành bóng mềm soft_*.png (theo video mẫu anh gửi: bóng to, mép mềm) — vẽ ×1,4.
//  · Rất nhẹ (alpha ~0,13), trôi đều, không nhấp nháy; vẽ ở sys.draw (đè lên cả người + vật như bóng thật).
const ZONES = ['village', 'm1', 'm2', 'm3', 'm4', 'm5', 'm6', 'm7', 'm8', 'm9'];
const N_IMG = 4, WIND = { x: 7, y: 2.5 }, ALPHA = 0.7, SC = 0.5;   /* anh gửi video mẫu (TikTok): bóng TO, MỀM (mờ mép, không viền pixel), đậm hơn */
const ST = { img: [], list: [], zone: null };
function load() {
  if (ST.img.length) return;
  for (let i = 0; i < N_IMG; i++) { const im = new Image(); im.src = `assets/px/fx/cloudshadow/soft_${i}.png`; ST.img.push(im); }
}
export const cloudshade = {
  id: 'cloudshade', always: true,   /* chạy ở mọi vùng để tự xoá bóng khi vào vùng trong nhà/hang */
  onZoneEnter(ctx) {
    ST.zone = ctx.S.zone && ctx.S.zone.id; ST.list = [];
    if (!ZONES.includes(ST.zone) || !ctx.S.map) return;
    load();
    const m = ctx.S.map, W = m.w * 16, H = m.h * 16, n = Math.max(4, Math.round((W * H) / (200 * 150)));
    for (let i = 0; i < n; i++) ST.list.push({ x: Math.random() * W, y: Math.random() * H, k: i % N_IMG, sp: 0.75 + Math.random() * 0.5 });
  },
  update(dt, ctx) {
    if (!ST.list.length || !ctx.S.map) return;
    const m = ctx.S.map, W = m.w * 16, H = m.h * 16;
    for (const c of ST.list) {
      c.x += WIND.x * c.sp * dt; c.y += WIND.y * c.sp * dt;
      if (c.x > W + 80) { c.x = -360; c.y = Math.random() * H; } if (c.y > H + 80) { c.y = -250; c.x = Math.random() * W; }
    }
  },
  draw(g, ctx, cx, cy) {
    if (!ST.list.length) return;
    const day = 1 - Math.min(1, (ctx.S.dark || 0) / 0.3); if (day <= 0.02) return;   /* tối dần → bóng mờ dần, đêm không có */
    g.save(); g.globalAlpha = ALPHA * day; g.imageSmoothingEnabled = true; g.globalCompositeOperation = 'multiply';   /* nhân màu: đất tối đi mà GIỮ sắc (như ảnh mẫu anh gửi), không phủ xám */   /* bóng mềm: cho phép nội suy (chỉ trong khối này) */
    for (const c of ST.list) {
      const im = ST.img[c.k]; if (!im || !im.complete || !im.naturalWidth) continue;
      const w = Math.round(im.naturalWidth * SC), h = Math.round(im.naturalHeight * SC), sx = Math.round(c.x - cx), sy = Math.round(c.y - cy);
      if (sx > ctx.VW || sy > ctx.VH || sx + w < 0 || sy + h < 0) continue;
      g.drawImage(im, 0, 0, im.naturalWidth, im.naturalHeight, sx, sy, w, h);
    }
    g.restore();
  },
};
if (typeof window !== 'undefined') window.__cloudshade = { n: () => ST.list.length, zone: () => ST.zone, list: () => ST.list.map(c => [Math.round(c.x), Math.round(c.y), c.k]), img: () => ST.img.map(i => i.complete && i.naturalWidth) };
