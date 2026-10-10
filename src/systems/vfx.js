// vfx.js — plan-19: phát VFX sheet PixelLab (manifest `vfx`, sinh bằng vfx_workbench, đóng gói bằng tools/px-vfx.py).
// Dùng: ctx.vfx('dirt_puff', wx, wy[, dur]) → true nếu có sheet (dur: giây sống cho VFX lặp như leaf_fall) (module tự bỏ hạt code khi true). wx, wy = điểm chạm đất (pivot đáy-giữa).
// Khi clip động tác có `impact` (khung va chạm), gọi ctx.vfxAt(entity, name, wx, wy): VFX bắn đúng lúc clip tới khung đó.
import { ART } from '../art.js';
import { FPS, clipFps } from '../anim.js';

const LIVE = [], WAIT = [];
const sheet = name => ART.vfx && ART.vfx[name];

function spawn(name, wx, wy, dur, top) {   /* top: vẽ trên mọi sprite (nhặt đồ trên đầu, lên cấp) */
  const s = sheet(name); if (!s) return false;
  LIVE.push({ s, x: wx, y: wy, t: 0, dur: dur || (s.loop ? 1.5 : 0), top: !!top });
  if (LIVE.length > 40) LIVE.shift();
  return true;
}
/* bụi bước chân: khung đi chạm đất (1, 2 của chu kỳ 0-1-0-2) trên đất/cát/đá lát — không rắc trên cỏ, nước */
const DUSTY = new Set(['DIRT', 'SAND', 'SAND2', 'GRAVEL', 'COBBLE', 'STONE', 'TILLED', 'ASH', 'SNOW']);
let lastFrame = 0;
function footsteps(ctx) {
  const p = ctx.S.player; if (!p || p.custom || !p.moving || ctx.S.swimming) { lastFrame = 0; return; }
  if (p.frame !== lastFrame && p.frame !== 0) {
    const m = ctx.S.map, g = m && ctx.getG && ctx.getG(m, Math.floor(p.x / 16), Math.floor(p.y / 16));
    const name = ctx.T && Object.keys(ctx.T).find(k => ctx.T[k] === g);
    if (name && DUSTY.has(name)) spawn('footstep_dust', p.x + (p.frame === 1 ? -2 : 2), p.y + 1);
  }
  lastFrame = p.frame;
}

export const vfx = {
  id: 'vfx',
  onZoneEnter(ctx) {
    LIVE.length = 0; WAIT.length = 0;
    if (typeof window !== 'undefined') window.__vfx = { live: () => LIVE.map(e => e.s.file.split('/').pop()), wait: () => WAIT.map(w => w.name) };   /* móc test */
    ctx.vfx = (name, wx, wy, dur, top) => spawn(name, wx, wy, dur, top);
    ctx.hasVfx = name => !!sheet(name);
    ctx.vfxAt = (ent, name, wx, wy) => {   /* chờ clip của ent tới khung impact; không có clip/impact thì bắn ngay */
      const a = ent && ent.action, sh = a && ent.sheet && ent.sheet.actions && ent.sheet.actions[a.name];
      if (!sh || sh.impact == null) return spawn(name, wx, wy);
      if (!sheet(name)) return false;
      WAIT.push({ ent, act: a, at: sh.impact / clipFps(a.name, sh), name, x: wx, y: wy });
      return true;
    };
  },
  onZoneLeave() { LIVE.length = 0; WAIT.length = 0; },
  update(dt, ctx) {
    if (sheet('footstep_dust')) footsteps(ctx);
    for (let i = WAIT.length - 1; i >= 0; i--) {
      const w = WAIT[i];
      if (w.ent.action !== w.act) { WAIT.splice(i, 1); continue; }   /* clip bị ngắt trước khung chạm → bỏ */
      if (w.act.t >= w.at) { spawn(w.name, w.x, w.y); WAIT.splice(i, 1); }
    }
    for (let i = LIVE.length - 1; i >= 0; i--) {
      const e = LIVE[i]; e.t += dt;
      if (e.s.loop ? e.t >= e.dur : e.t * (e.s.fps || FPS.vfx) >= e.s.n) LIVE.splice(i, 1);
    }
  },
  drawables(ctx, cx, cy) {   /* sắp theo chiều sâu như sprite: người đứng dưới (phía trước) che VFX của ô phía trên */
    return LIVE.map(e => ({ y: e.top ? 1e9 : e.y, f: () => {
      const s = e.s, f = Math.floor(e.t * (s.fps || FPS.vfx)) % s.n;
      ctx.g.drawImage(s.img, f * s.w, 0, s.w, s.h, Math.round(e.x - cx - s.w / 2), Math.round(e.y - cy - s.h), s.w, s.h);   /* toạ độ nguồn logic: shim __hi nhân đôi */
    } }));
  },
};
