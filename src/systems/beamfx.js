// beamfx.js — 2026-10-13 (anh: "Rocky-ha đẹp hơn"): vẽ luồng Rocky-ha / Hắc-ha từ sheet vfx_workbench PixelLab (rk_ha2_s/m/l, rk_hacharge, rk_haboom).
//  · Luồng: sheet ngang dài 177 logic (ảnh 2×), gốc ax/ay (manifest) = tay Rocky; CẮT theo độ dài thật (không co giãn), xoay theo góc bắn (tắt làm mượt).
//  · Cỡ theo bậc: 1–3 nhỏ (lõi xanh nhạt) · 4–5 vừa · 6–8 to + lõi trắng sáng.
//  · Bản tím-đen lõi đỏ cho Hắc Rocky: đổi màu theo độ sáng từng điểm ảnh của CHÍNH sheet PixelLab (1 lần, canvas nguồn giữ __hi — bài học shim 2026-09-25).
//  · Không phải hệ (system) — hàm tiện ích pet.js / hacrocky.js gọi.
import { ART } from '../art.js';

export const beamKey = tier => (tier >= 6 ? 'rk_ha2_l' : tier >= 4 ? 'rk_ha2_m' : 'rk_ha2_s');
export const chargeKey = (tier, sup) => (sup ? 'rk_hacharge_x' : tier >= 6 ? 'rk_hacharge' : tier >= 4 ? 'rk_hacharge_m' : 'rk_hacharge_s');   /* quả cầu tụ năng theo bậc (Siêu Cấp to nhất) */
const VX = n => ART.vfx && ART.vfx[n];
const DARK = {};
const PAL = [[0.22, [18, 4, 30]], [0.4, [58, 12, 96]], [0.56, [112, 34, 184]], [0.72, [176, 80, 240]], [0.86, [255, 110, 140]], [2, [255, 52, 72]]];   /* độ sáng → tím-đen … lõi đỏ */
/* sheet bản tối (Hắc-ha): trả { ...sheet, img: canvas đã đổi màu } */
export function darkSheet(name) {
  if (DARK[name]) return DARK[name]; const s = VX(name); if (!s || !s.img) return null;
  const src = s.img, c = document.createElement('canvas'); c.width = src.width; c.height = src.height; const g = c.getContext('2d');
  g.drawImage(src, 0, 0, src.width, src.height);   /* 5 tham số: không qua shim nhân toạ độ */
  const d = g.getImageData(0, 0, c.width, c.height), a = d.data;
  for (let i = 0; i < a.length; i += 4) {
    if (!a[i + 3]) continue; const L = (0.3 * a[i] + 0.55 * a[i + 1] + 0.15 * a[i + 2]) / 255;
    const col = PAL.find(p => L < p[0])[1]; a[i] = col[0]; a[i + 1] = col[1]; a[i + 2] = col[2];
  }
  g.putImageData(d, 0, 0); c.__hi = src.__hi; DARK[name] = { ...s, img: c }; return DARK[name];
}
export function sheet(name, dark) { return dark ? darkSheet(name) : VX(name); }
/* vẽ 1 khung f của sheet s, gốc (ax, ay) đặt tại (x, y) màn hình, xoay ang; cut = bề dài logic tối đa tính từ gốc (luồng cắt theo độ dài thật) */
export function drawAt(g, s, f, x, y, ang = 0, cut = null, alpha = 1) {
  if (!s || !s.img) return false; const hi = s.img.__hi ? 1 : 2, ax = s.ax != null ? s.ax : s.w / 2, ay = s.ay != null ? s.ay : s.h / 2;
  const w = cut == null ? s.w : Math.max(1, Math.min(s.w, Math.round(ax + cut)));
  g.save(); g.imageSmoothingEnabled = false; if (alpha !== 1) g.globalAlpha = alpha; g.translate(Math.round(x), Math.round(y)); if (ang) g.rotate(ang);
  g.drawImage(s.img, (f % s.n) * s.w * hi, 0, w * hi, s.h * hi, -ax, -ay, w, s.h); g.restore(); return true;
}
/* khung theo thời gian (one-shot dừng ở khung cuối · loop quay vòng) */
export const frameAt = (s, t) => { if (!s) return 0; const f = Math.floor(t * (s.fps || 12)); return s.loop ? f % s.n : Math.min(s.n - 1, f); };
export const durOf = s => (s ? s.n / (s.fps || 12) : 0.5);
