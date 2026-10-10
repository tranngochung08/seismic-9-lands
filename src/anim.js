// anim.js — tốc độ khung dùng chung (luật asset PixelLab, plan-19, anh chốt 2026-10-10).
// 8 FPS cho đi/đứng/thú/vật lặp/cờ; động tác nhanh (chặt, đào, đập, giật cần) 12 FPS; VFX 12 FPS.
// Clip trong manifest có thể ghi đè bằng trường `fps` / `impact` (khung va chạm, VFX bắn đúng khung này).
export const FPS = { walk: 8, idle: 8, creature: 8, loop: 8, flag: 8, act: 8, actFast: 12, vfx: 12 };
const FAST = new Set(['chop', 'mine', 'hammer', 'reel']);
export function clipFps(name, clip) { return (clip && clip.fps) || (FAST.has(name) ? FPS.actFast : FPS.act); }

// Đồng hồ hoạt hình (main.js cộng dt mỗi khung) + lệch pha ngẫu nhiên theo từng đối tượng để thú không bước đều răm rắp.
export const clock = { t: 0 };
const PH = new WeakMap();
export function phase(o) {
  if (!o || typeof o !== 'object') return 0;
  let p = PH.get(o); if (p === undefined) { p = Math.random() * 8; PH.set(o, p); }
  return p;
}
export function loopFrame(n, fps, ph = 0, t = clock.t) { return n > 0 ? Math.floor(t * fps + ph) % n : 0; }
