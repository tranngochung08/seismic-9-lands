/* flyposes.js — 2026-10-14 (anh): DÁNG BAY chong chóng tre theo tốc độ + VFX tốc độ — helper THUẦN (không phải hệ, KHÔNG đăng ký index.js).
   Ảnh: PixelLab — create_character_state (tư thế bổ nhào / vút lên của CHÍNH nhân vật, 4 hướng) + v3 'gió thổi' giữ dáng;
        VFX: vfx_workbench (vệt gió, luồng gió, mây lao qua, đĩa mờ cánh quạt). Công cụ: tools/px-flystates.py + tools/px-flyposes.py. Thư mục assets/px/flyposes/.
     · Người chơi: clip 'dive' / 'climb' trong p.sheet.actions (manifest chars.fixed.hung_b.actions + village.json chars.actions.c0)
       → art.js tự ĐỔI MÀU ÁO theo trang phục save (recolorShirt) như mọi clip động tác. Ô 32×32 logic, 4 hàng S, W, E, N (= p.dir & 3).
       Đáy ô = chân + 2 (giống drawPlayer); tâm dáng đặt đúng tâm thân lúc hover → đổi dáng không giật.
     · Rocky: creatures '<pre>_<dive|climb>_<s|e|n>' (pre = rockybig | rockysup), mỗi khung [phải, trái(lật)], tây = lật đông.
       Khung có thể thò xuống dưới chân fy px (dáng dài) → dùng flyPose (oy đã tính fy). Rocky con (rockypet) KHÔNG có → null.
     · hover = clip hover cũ (người chơi actions.hover; Rocky <pre>_hover_<k>) — đỉnh đầu = pixel cao nhất như sky.topOf.
   ĐỈNH ĐẦU (gắn chong chóng): bảng flyposes-data.js, từng khung: [x, y, góc°]. Góc = hướng đỉnh đầu (0 = lên, 90 = phải, 180 = xuống, −90 = trái).
     vút lên: góc 0 = đỉnh đầu thật (tay / nắm đấm giơ cao hơn đầu nhưng điểm vẫn trên ĐẦU).
     bổ nhào: điểm DẪN ĐẦU theo hướng lao (chong chóng kéo người lao đi): S/N-dive 180° (dưới đầu), E ~100–120°, W đối xứng.
     → nơi tích hợp: drawCopter tại (hx, hy); nếu |ang| > 20° thì xoay chong chóng quanh (hx, hy) theo ang (g.rotate(ang·π/180)) — xoay, KHÔNG phóng to.

   API
     flyKind(vz, falling?) → 'dive' (vz < −110) | 'climb' (vz > 110) | 'hover'          (vz = ctx.alt.vz(); giống sky.altPose)
     flyPose(kind, who, dir, t, opts?) → null | { img, sx, sy, sw, sh, ox, oy, flip, headTop:{x,y,ang}, fps, n, f }
        kind: 'dive' | 'climb' | 'hover' · who: 'player' (cần opts.sheet = p.sheet) | 'rocky' (= rockybig) | 'rockybig' | 'rockysup' | 'rockypet'
        dir : 0 S · 1 W · 2 E · 3 N (p.dir & 3 / rk.dir) · t: giây (ctx.S.time)
        opts: { sheet } người chơi; { body:'hung_b'|'c0' } ép bảng đầu (mặc định: sheet trùng ART.fixed[k].img → k, còn lại c0 — mọi trang phục đổi màu từ c0)
        Vẽ:  g.drawImage(img, sx, sy, sw, sh, x + ox, y + oy, sw, sh)   (x, y = CHÂN trên màn hình, như lúc hover; ảnh lật sẵn khi flip)
        đỉnh đầu màn hình = (x + ox + headTop.x, y + oy + headTop.y)
     drawFlyPose(g, who, kind, dir, t, x, y, opts?) → { hx, hy, ang } | null   (vẽ luôn; đưa thẳng hx, hy (+ang) cho drawCopter)
     drawSpeedFx(g, kind, x, y, t, k = 1, layer = 'back'|'front')   VFX tốc độ quanh nhân vật (x, y = tâm thân màn hình), k 0..1 = mạnh theo |vz|.
        dive  → vệt + luồng gió chạy LÊN, mây lao qua phía trên ('back' vẽ trước nhân vật, 'front' vài vệt mảnh vẽ sau)
        climb → chạy XUỐNG, mây toả phía dưới chân. hover → không vẽ. Chỉ bật khi đang nhanh (luật anh: hiệu ứng chỉ khi có sự kiện).
     drawCopterBlur(g, hx, hy, t, a = 1)   đĩa mờ cánh quạt quay nhanh (vẽ ĐÈ lên chong chóng lúc |vz| lớn; tâm đĩa = đỉnh cán ~ hy − 9).
     fxReady() → true khi ảnh VFX đã tải (tự tải lần đầu gọi). */
import { ART } from '../art.js';
import FP from './flyposes-data.js';

export const FLY_FAST = 110;
const ROWS = ['south', 'west', 'east', 'north'], RK = ['s', 'e', 'e', 'n'], TAU = Math.PI * 2;
export function flyKind(vz, falling) { if (falling) return 'hover'; return vz < -FLY_FAST ? 'dive' : vz > FLY_FAST ? 'climb' : 'hover'; }

const TOPC = new Map();
function topOf(img, sx, sy, sw, sh) {   /* pixel cao nhất (logic) trong ô — chỉ dùng cho clip hover cũ */
  const key = (img.__ftid || (img.__ftid = Math.random().toString(36).slice(2))) + ':' + sx + ':' + sy; let v = TOPC.get(key); if (v) return v; v = { x: sw / 2, y: 2, ang: 0 };
  try {
    const hi = img.__hi || 1, X = Math.round(sx * hi), Y = Math.round(sy * hi), W = Math.round(sw * hi), H = Math.round(sh * hi), d = img.getContext('2d').getImageData(X, Y, W, H).data;
    for (let y = 0; y < H; y++) { let a = -1, b = -1; for (let x = 0; x < W; x++) if (d[(y * W + x) * 4 + 3] > 60) { if (a < 0) a = x; b = x; } if (a >= 0) { v = { x: (a + b + 1) / 2 / hi, y: y / hi, ang: 0 }; break; } }
  } catch (e) { }
  TOPC.set(key, v); return v;
}
function bodyOf(sheet, opts) {
  if (opts && opts.body) return opts.body;
  for (const [k, f] of Object.entries(ART.fixed || {})) if (f && f.img === sheet && FP.player[k]) return k;
  return 'c0';
}
function cre(name) { const vp = ART.packs && ART.packs.village, c = vp && vp.creatures && vp.creatures[name]; return c && c.length ? c : null; }

export function flyPose(kind, who, dir, t, opts = {}) {
  const d = dir & 3;
  if (who === 'player') {
    const sheet = opts.sheet, acts = sheet && sheet.actions, a = acts && acts[kind]; if (!a) return null;
    const cw = a.cw || 16, ch = a.ch || 20, fps = a.fps || 10, f = Math.floor(t * fps) % a.n, sx = f * cw, sy = d * ch;
    const tab = kind !== 'hover' && FP.player[bodyOf(sheet, opts)], hd = tab && tab[kind] && tab[kind].head[ROWS[d]] && tab[kind].head[ROWS[d]][f];
    const headTop = hd ? { x: hd[0], y: hd[1], ang: hd[2] } : topOf(a.img, sx, sy, cw, ch);
    return { img: a.img, sx, sy, sw: cw, sh: ch, ox: -(cw >> 1), oy: -18 - (ch - 20), flip: false, headTop, fps, n: a.n, f };
  }
  const pre = who === 'rocky' ? 'rockybig' : who, k = RK[d], fl = d === 1 ? 1 : 0;
  const set = cre(`${pre}_${kind}_${k}`); if (!set) return null;
  const tab = kind !== 'hover' && FP.rocky[pre] && FP.rocky[pre][kind] && FP.rocky[pre][kind][k], fps = (tab && tab.fps) || 8, f = Math.floor(t * fps) % set.length, im = set[f][fl], w = im.width, h = im.height, fy = (tab && tab.fy) || 0;
  let headTop;
  if (tab && tab.head[f]) { const q = tab.head[f]; headTop = { x: fl ? w - q[0] : q[0], y: q[1], ang: fl ? -q[2] : q[2] }; }
  else { const tp = topOf(set[f][0], 0, 0, w, h); headTop = { x: fl ? w - tp.x : tp.x, y: tp.y, ang: 0 }; }
  return { img: im, sx: 0, sy: 0, sw: w, sh: h, ox: -Math.round(w / 2), oy: -(h - fy), flip: !!fl, headTop, fps, n: set.length, f };
}

export function drawFlyPose(g, who, kind, dir, t, x, y, opts) {
  const p = flyPose(kind, who, dir, t, opts); if (!p) return null;
  const X = Math.round(x) + p.ox, Y = Math.round(y) + p.oy;
  g.drawImage(p.img, p.sx, p.sy, p.sw, p.sh, X, Y, p.sw, p.sh);
  return { hx: X + p.headTop.x, hy: Y + p.headTop.y, ang: p.headTop.ang || 0 };
}

/* ---------- VFX tốc độ (ảnh 2×, tự tải; vẽ 9 tham số với toạ độ nguồn 2× — ảnh thường không có __hi nên shim không đụng) ---------- */
const FX = {}; let fxLoading = false;
function loadFx() {
  if (fxLoading || typeof Image === 'undefined') return; fxLoading = true;
  for (const [k, e] of Object.entries(FP.vfx || {})) { const im = new Image(); im.onload = () => { FX[k] = { ...e, img: im }; }; im.src = 'assets/px/' + e.file; }
}
export function fxReady() { loadFx(); return Object.keys(FX).length === Object.keys(FP.vfx || {}).length; }
function fxFrame(g, name, t, cx, cy, alpha = 1, fpsMul = 1, phase = 0) {
  const e = FX[name]; if (!e) return; const i = Math.floor(t * e.fps * fpsMul + phase) % e.n;
  const a0 = g.globalAlpha; g.globalAlpha = a0 * alpha;
  g.drawImage(e.img, i * e.w * 2, 0, e.w * 2, e.h * 2, Math.round(cx - e.w / 2), Math.round(cy - e.h / 2), e.w, e.h);
  g.globalAlpha = a0;
}
export function drawSpeedFx(g, kind, x, y, t, k = 1, layer = 'back') {
  loadFx(); if (kind !== 'dive' && kind !== 'climb') return; k = Math.max(0, Math.min(1, k)); if (k <= 0.02) return;
  const up = kind === 'dive', s = up ? 'up' : 'down', sg = up ? -1 : 1;   /* dive: gió ngược chạy LÊN; climb: chạy XUỐNG */
  if (layer === 'back') {
    fxFrame(g, 'fx_wisp_' + s, t, x, y + sg * 22, 0.55 * k, 1.4);                     /* mây lao qua sau lưng (phía ngược hướng bay) */
    fxFrame(g, 'fx_gust_' + s, t, x - 6, y - sg * 2, 0.7 * k, 1.6);
    fxFrame(g, 'fx_streak_' + s, t, x + 4, y, 0.75 * k, 1.8, 3);
  } else {
    fxFrame(g, 'fx_streak_' + s, t, x - 3, y - sg * 4, 0.35 * k, 2.0, 5);               /* vài vệt mảnh vẽ đè lên người cho có chiều sâu */
  }
}
export function drawCopterBlur(g, hx, hy, t, a = 1) {
  loadFx(); fxFrame(g, 'fx_copter_blur', t, hx, hy, a);
}
