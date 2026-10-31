// vfx.js — plan-19: phát VFX sheet PixelLab (manifest `vfx`, sinh bằng vfx_workbench, đóng gói bằng tools/px-vfx.py).
// Dùng: ctx.vfx('dirt_puff', wx, wy[, dur]) → true nếu có sheet (dur: giây sống cho VFX lặp như leaf_fall) (module tự bỏ hạt code khi true). wx, wy = điểm chạm đất (pivot đáy-giữa).
// Khi clip động tác có `impact` (khung va chạm), gọi ctx.vfxAt(entity, name, wx, wy): VFX bắn đúng lúc clip tới khung đó.
import { ART } from '../art.js';
import { FPS, clipFps } from '../anim.js';
import { vfxSound } from '../audio.js';   /* 2026-10-10: mỗi VFX kèm tiếng tương ứng (bảng VFX_SFX trong audio.js, tự nhường tiếng cụ thể hơn) */
import { WFX } from './pxfx_world.js';   /* plan-69: VFX ngoài map vẽ code hoàn toàn (?vfx=old = sheet PixelLab cũ để so) */
let OLDV = typeof location !== 'undefined' && /[?&]vfx=old\b/.test(location.search);
/* sheet → cảnh code. KHÔNG đổi ở đây: slash_t* (trùm Hắc Rocky / Xealist dùng — đòn người chơi gọi ctx.wfx('hit') thẳng từ monsters.js), sheet của trùm, Rocky, Chấn Thú, nước (p63/p65/p52/p68) */
const CODE = {
  monster_poof: ['kill', {}], item_pickup_pop: ['pickup', {}], dball_pickup: ['pickup', { big: 1 }], sparkle: ['pickup', {}], level_up: ['levelup', {}],
  dirt_puff: ['dirt', {}], wood_chips: ['wood', {}], rock_debris: ['rock', {}], footstep_dust: ['step', {}], ki_dust: ['kidust', {}], ki_wind: ['kiwind', {}],
  leaf_fall: ['leaves', {}], crop_sparkle: ['crop', {}], stone_free: ['stonefree', {}],
};
const HS = { stopOn: false, stopUntil: 0, zoomOn: false, zoomUntil: 0 };
const AMB = { t: 0 };   /* đợt 3: khói lửa trại (êm) — mỗi 0,42 s 1 cụm cho mỗi lửa trại trong màn */
function ambient(ctx, dt) {
  if (OLDV) return; AMB.t -= dt; if (AMB.t > 0) return; AMB.t = 0.42; const m = ctx.S.map, cam = ctx.cam; if (!m || !cam || !m.objects) return; const VW = ctx.VW || 480, VH = ctx.VH || 270;
  for (const o of m.objects) { if (o.type !== 'campfire' || o.ruined || o.ghost) continue; const x = o.x * 16 + 8, y = (o.y + 1) * 16 - 3; if (x < cam.cx - 24 || x > cam.cx + VW + 24 || y < cam.cy - 8 || y > cam.cy + VH + 60) continue; WFX.spawn('smoke', x, y, {}); }
}
function hsTick(ctx) {
  const S = ctx.S, now = performance.now();
  if (HS.stopOn && (now >= HS.stopUntil || S.mode !== 'play')) { HS.stopOn = false; if (S.timeScale === 0.04) S.timeScale = 1; }
  if (HS.zoomOn && now >= HS.zoomUntil) { HS.zoomOn = false; if (S.camZoom === HS.zk) { S.camZoom = 1; S.camFocus = null; } }
}
function hooksFor(ctx) {
  return {
    stop(sec) { const S = ctx.S; if (!S || S.mode !== 'play') return; if (!HS.stopOn && (S.timeScale ?? 1) !== 1) return; HS.stopUntil = Math.max(HS.stopUntil, performance.now() + sec * 1000); if (!HS.stopOn) { HS.stopOn = true; S.timeScale = 0.04; } },
    shake(sec) { if (ctx.quake) ctx.quake(sec); },
    zoom(k, sec, x, y) { const S = ctx.S; if (!S || (S.camZoom || 1) > 1.01 && !HS.zoomOn) return; HS.zoomOn = true; HS.zk = k; HS.zoomUntil = performance.now() + sec * 1000; S.camZoom = k; S.camFocus = { x, y }; },
  };
}

const LIVE = [], WAIT = [];
let CTXR = null; const CAPLOW = () => !!(CTXR && CTXR.gfxLow && CTXR.gfxLow());
const sheet = name => ART.vfx && ART.vfx[name];

function spawn(name, wx, wy, dur, top, flip) {   /* top: vẽ trên mọi sprite (nhặt đồ trên đầu, lên cấp) */
  const cm = !OLDV && CODE[name]; if (cm) { vfxSound(name, true, dur, wx, wy); WFX.spawn(cm[0], wx, wy, { ...cm[1], top: !!top, flip: !!flip, dur }); return true; }   /* plan-69 */
  const s = sheet(name); vfxSound(name, !!s, dur, wx, wy); if (!s) return false;
  LIVE.push({ s, x: wx, y: wy, t: 0, dur: dur || (s.loop ? 1.5 : 0), top: !!top, flip: !!flip });
  if (LIVE.length > (CAPLOW() ? 20 : 40)) LIVE.shift();   /* plan-37: trần hạt (bậc đồ hoạ nhẹ: 20) */
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
    LIVE.length = 0; WAIT.length = 0; CTXR = ctx; WFX.clear(); WFX.hooks = hooksFor(ctx); if (!OLDV) WFX.warm();   /* plan-69 */
    ctx.wfx = (kind, x, y, o) => (!OLDV && !!WFX.spawn(kind, x, y, o));   /* plan-69: cảnh code trực tiếp (đòn kiếm, quái ngã…); false ở ?vfx=old → hệ gọi tự về đường cũ */
    if (typeof window !== 'undefined') window.__wfx = { set: o => { if (o && 'old' in o) OLDV = !!o.old; return { old: OLDV }; }, old: () => OLDV, live: () => WFX.list.map(e => e.kind), n: () => WFX.list.length, maxLive: () => WFX.maxLive, p95: () => WFX.p95(), ms: () => WFX.ms.slice(-300), reset: () => { WFX.ms.length = 0; WFX.mi = 0; WFX.maxLive = 0; WFX.spk.length = 0; }, spawn: (k, x, y, o) => !!WFX.spawn(k, x, y, o || {}), stat: () => WFX.list.map(e => ({ k: e.kind, ...e.stats() })), spk: () => WFX.spk.splice(0) };
    if (typeof window !== 'undefined') window.__vfx = { live: () => LIVE.map(e => e.s.file.split('/').pop()), wait: () => WAIT.map(w => w.name) };   /* móc test */
    ctx.vfx = (name, wx, wy, dur, top, flip) => spawn(name, wx, wy, dur, top, flip);   /* flip: lật ngang (vệt chém khi nhân vật quay trái) */
    ctx.hasVfx = name => !!sheet(name);
    ctx.vfxKill = test => { let n = 0; for (let i = LIVE.length - 1; i >= 0; i--) { const e = LIVE[i]; if (test(e.s.file.split('/').pop(), e.x, e.y)) { LIVE.splice(i, 1); n++; } } return n; };   /* 2026-10-15: tắt sớm VFX đang chạy (Gọi Mưa dập ảnh lửa) */
    ctx.vfxAt = (ent, name, wx, wy) => {   /* chờ clip của ent tới khung impact; không có clip/impact thì bắn ngay */
      const a = ent && ent.action, sh = a && ent.sheet && ent.sheet.actions && ent.sheet.actions[a.name];
      if (!sh || sh.impact == null) return spawn(name, wx, wy);
      if (!sheet(name)) { vfxSound(name, false, 0, wx, wy); return false; }
      WAIT.push({ ent, act: a, at: sh.impact / clipFps(a.name, sh), name, x: wx, y: wy });
      return true;
    };
  },
  onZoneLeave(ctx) { LIVE.length = 0; WAIT.length = 0; WFX.clear(); if (ctx && ctx.S) { if (HS.stopOn && ctx.S.timeScale === 0.04) ctx.S.timeScale = 1; if (HS.zoomOn && ctx.S.camZoom === HS.zk) { ctx.S.camZoom = 1; ctx.S.camFocus = null; } } HS.stopOn = HS.zoomOn = false; },
  update(dt, ctx) {
    WFX.frame(); hsTick(ctx); ambient(ctx, dt); WFX.update(dt);   /* plan-69 */
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
    const VW = ctx.VW || 480, VH = ctx.VH || 270, vis = LIVE.filter(e => { const sx = e.x - cx, sy = e.y - cy; return sx > -e.s.w && sx < VW + e.s.w && sy > -8 && sy < VH + e.s.h + 8; });   /* plan-37: bỏ hạt ngoài màn */
    const out = []; WFX.drawables(out, ctx.g, cx, cy, VW, VH);   /* plan-69: cảnh code (back / front theo y chân) */
    return out.concat(vis.map(e => ({ y: e.top ? 1e9 : e.y, f: () => {
      const s = e.s, f = Math.floor(e.t * (s.fps || FPS.vfx)) % s.n;
      const dx = Math.round(e.x - cx - s.w / 2), dy = Math.round(e.y - cy - s.h);
      if (e.flip) { ctx.g.save(); ctx.g.translate(dx + s.w, dy); ctx.g.scale(-1, 1); ctx.g.drawImage(s.img, f * s.w, 0, s.w, s.h, 0, 0, s.w, s.h); ctx.g.restore(); }
      else ctx.g.drawImage(s.img, f * s.w, 0, s.w, s.h, dx, dy, s.w, s.h);   /* toạ độ nguồn logic: shim __hi nhân đôi */
    } })));
  },
};
