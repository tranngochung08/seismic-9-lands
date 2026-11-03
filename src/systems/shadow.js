// shadow.js — plan-66 (anh 30/10): BÓNG dưới chân cho mọi nhân vật / thú ở thế giới ngoài, để biết đang TIẾP ĐẤT hay LƠ LỬNG.
//  · Ảnh: flyshadow PixelLab (36×16, 2 tông — cùng ảnh bóng trong trận Chấn Thú p52e). KHÔNG phóng to: cỡ khác ghép từ 4 góc của chính ảnh
//    + lặp cột / hàng giữa (cùng mật độ điểm ảnh), dựng sẵn vào canvas KHÔNG __hi (luật 25/09) rồi dán ở ½ cỡ (ảnh 2× = 1 px logic).
//  · Bóng luôn nằm ở toạ độ CHÂN trên mặt đất. Vật ở độ cao z (nhảy, bị hất, bay, lơ lửng) → bóng nhỏ lại + nhạt dần; tiếp đất → đầy.
//  · Lội nước / bơi / đi bè → không bóng; bay trên mặt nước → bóng nhạt.
//  · Cỡ theo bề ngang thân: SIZE.S/M/L/XL (px logic lúc tiếp đất).
//  · API: shadowAt(g, x, y, w, z, a) vẽ ngay (toạ độ của hệ đang vẽ); hệ shadow.drawGround vẽ bóng người chơi (dáng thường) + dân + nhân viên ở lớp nền.
//    Các hệ khác (Rocky, quái, thú, linh thú, bạn tập, Chấn Thú hoang…) gọi shadowAt trong chính hàm vẽ của mình thay cho elip vẽ code cũ.
import { WATER } from '../anim.js';

const SRC = 'assets/px/fx/shadow/flyshadow.png';
export const SIZE = { S: 8, M: 12, L: 18, XL: 28 };
export const SHADOW = { on: true, n: 0, base: 0.3,   /* p110sh: anh 02/11 'bóng đậm quá' → alpha ≈ 0,22–0,3 cho MỌI bóng (người chơi, dân, Chấn Thú như nhau) */ boost: 1.0, img: null };
let IM = null;
function img() {
  if (!IM && typeof Image !== 'undefined') { IM = new Image(); IM.src = SRC; SHADOW.img = IM; }
  return IM && IM.complete && IM.naturalWidth ? IM : null;
}
img();
if (typeof window !== 'undefined') window.__shadow = { stat: () => ({ on: SHADOW.on, n: SHADOW.n, ready: !!img(), cache: SHC.size, last: SHADOW.last }), set: o => Object.assign(SHADOW, o), wet: (x, y) => wetAt(x, y), dark: (x, y) => +darkAt(x, y).toFixed(2), night: () => LUM.night, lum: () => ({ d: !!LUM.d, f: LUM.f, night: LUM.night, cx: LUM.cx, cy: LUM.cy, VW: LUM.VW, gn: SHADOW.gn || 0, err: SHADOW.err || null }) };
const SHC = new Map();
function shadowCv(W, H) {   /* W, H: điểm ảnh gốc (2× logic) */
  const key = W * 1000 + H; let c = SHC.get(key); if (c) return c; const im = img(); if (!im) return null;
  const X0 = 4, X1 = 32, Y0 = 2, Y1 = 14, CW = X1 - X0, CH = Y1 - Y0, hw = Math.min(W >> 1, CW >> 1), hh = Math.min(H >> 1, CH >> 1);
  c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d'); x.imageSmoothingEnabled = false;
  const cols = [[X0, 0, hw], [X1 - hw, W - hw, hw]], rows = [[Y0, 0, hh], [Y1 - hh, H - hh, hh]];
  for (const [sx, dx, w] of cols) for (const [sy, dy, h] of rows) x.drawImage(im, sx, sy, w, h, dx, dy, w, h);
  if (W > 2 * hw) for (const [sy, dy, h] of rows) x.drawImage(im, X0 + (CW >> 1), sy, 1, h, hw, dy, W - 2 * hw, h);   /* cột giữa lặp ngang */
  if (H > 2 * hh) x.drawImage(c, 0, hh - 1, W, 1, 0, hh, W, H - 2 * hh);   /* hàng giữa lặp dọc */
  SHC.set(key, c); return c;
}
/* hệ số cỡ theo độ cao z (px logic): sát đất 1 → cao 60+ px còn 0,4 */
export const shadowK = z => Math.max(0.4, 1 - Math.max(0, z || 0) / 60);
/* vẽ 1 bóng: (x, y) = chân (toạ độ của hệ đang vẽ), w = bề ngang lúc tiếp đất, z = độ cao thân, a = hệ số đậm (0..1) */
export function shadowAt(g, x, y, w, z = 0, a = 1, dk = null) {
  if (!(a > 0.01)) return false;
  const k = shadowK(z), W = Math.max(8, Math.round(w * k) * 2), H = Math.max(4, Math.min(16, Math.round(W * 0.32 / 2) * 2)), c = shadowCv(W, H); if (!c) return false;
  const d = dk == null ? LUM.night : dk, a0 = g.globalAlpha; g.globalAlpha = a0 * Math.min(0.88, SHADOW.base * a * (0.3 + 0.7 * k) * (1 + SHADOW.boost * d));   /* nền tối → đậm hơn (vẫn mềm, tối đa 0,88) */
  g.drawImage(c, 0, 0, W, H, (globalThis.__R89||Math.round)(x) - W / 4, (globalThis.__R89||Math.round)(y) - H / 4, W / 2, H / 2);
  g.globalAlpha = a0; SHADOW.n++; return true;
}
/* ĐỘ SÁNG NỀN dưới chân: ~mỗi 12 khung thu nhỏ khung hình (lúc vừa vẽ xong nền, CHƯA vẽ nhân vật) về lưới 64×36 rồi đọc độ sáng từng ô.
   Tối = độ sáng thấp (hang, Sàn Đấu Ngầm…) + đêm (ctx.darkness, phủ SAU) + đèn hầm (map.dungeon, phủ SAU). dk 0 (nền sáng) … 1 (rất tối). */
const LUM = { cv: null, x: null, d: null, w: 64, h: 36, f: 0, VW: 480, VH: 270, cx: 0, cy: 0, night: 0 };
function sampleGround(g, ctx, cx, cy) {
  LUM.cx = cx; LUM.cy = cy; LUM.VW = ctx.VW || 480; LUM.VH = ctx.VH || 270;
  const dn = ctx.darkness ? ctx.darkness() || 0 : 0, dg = ctx.S.map && ctx.S.map.dungeon ? 0.45 : 0; LUM.night = Math.min(1, dn * 1.6 + dg);
  if (LUM.f-- > 0 && LUM.d) return; LUM.f = ctx.scaleUI > ctx.scale && ctx.opt89 !== false ? 30 : 12;   /* p89 vòng 4: lùi camera (canvas lớn) → đọc độ sáng nền thưa hơn (~0,5 s; getImageData chặn GPU) */
  try {
    if (!LUM.cv) { LUM.cv = document.createElement('canvas'); LUM.cv.width = LUM.w; LUM.cv.height = LUM.h; LUM.x = LUM.cv.getContext('2d', { willReadFrequently: true }); }
    const src = g.canvas; LUM.x.imageSmoothingEnabled = true; LUM.x.drawImage(src, 0, 0, src.width, src.height, 0, 0, LUM.w, LUM.h); LUM.d = LUM.x.getImageData(0, 0, LUM.w, LUM.h).data;
  } catch (e) { LUM.d = null; }
}
export function darkAt(wx, wy) {
  let L = 0.5; const D = LUM.d;
  if (D) { const i = Math.max(0, Math.min(LUM.w - 1, Math.floor((wx - LUM.cx) / LUM.VW * LUM.w))), j = Math.max(0, Math.min(LUM.h - 1, Math.floor((wy - LUM.cy) / LUM.VH * LUM.h))), o = (j * LUM.w + i) * 4; L = (D[o] * 0.3 + D[o + 1] * 0.59 + D[o + 2] * 0.11) / 255; }
  const eff = L * (1 - LUM.night * 0.8);
  return Math.max(0, Math.min(1, (0.5 - eff) / 0.32));
}
/* ô nước (để bóng nhạt khi bay trên mặt nước) */
let CTX = null;
export function overWater(x, y) {
  const c = CTX; if (!c || !c.S || !c.S.map || !c.getG) return false; const t = c.getG(c.S.map, Math.floor(x / 16), Math.floor(y / 16));
  return t === c.T.WATER || t === c.T.DEEP;
}
export const wetAt = (x, y) => (WATER.depth ? WATER.depth(x, y) : 0) > 0;
/* tiện cho hệ khác: bóng theo độ cao, tự bỏ khi đang lội / bơi, nhạt khi bay trên nước */
export function shadowFor(g, wx, wy, sx, sy, w, z = 0, a = 1) {
  if (z < 1 && wetAt(wx, wy)) return false;
  return shadowAt(g, sx, sy, w, z, overWater(wx, wy) ? a * 0.45 : a, darkAt(wx, wy));
}

const onScreen = (x, y, cx, cy, VW, VH) => x > cx - 40 && x < cx + VW + 40 && y > cy - 20 && y < cy + VH + 40;
function charW(e) { const sk = e.sheet && e.sheet.skin; return sk ? Math.max(SIZE.M, Math.round(sk.cw * 0.55)) : SIZE.M; }
export const shadow = {
  id: 'shadow',
  always: true,   /* vùng giới hạn hệ (z.systems: Sàn Đấu Ngầm, khe nứt trùm…) vẫn có bóng */
  onZoneEnter(ctx) {
    CTX = ctx; img();
    ctx.shadow = { at: shadowAt, for: shadowFor, k: shadowK, SIZE, stat: () => ({ on: SHADOW.on, n: SHADOW.n, ready: !!img(), cache: SHC.size }) };
  },
  /* lớp nền: người chơi (dáng thường / hợp thể) + dân + nhân viên. Người chơi đang có hình riêng (hất bay, Ki lộn, bay, bơi, cưỡi…) → hệ đó tự vẽ bóng. */
  drawGround(g, ctx, cx, cy) {
    CTX = ctx; SHADOW.n = 0; SHADOW.gn = (SHADOW.gn || 0) + 1; try { sampleGround(g, ctx, cx, cy); } catch (e) { SHADOW.err = String(e && e.message || e); } if (!SHADOW.on) return;
    const S = ctx.S, VW = ctx.VW || 480, VH = ctx.VH || 270, under = !!(S.zone && S.zone.under), aU = under ? 0.6 : 1;
    const npcs = ctx.allNpcs ? ctx.allNpcs() : S.npcs || [];
    for (let i = 0, N = npcs.length + (S.staff ? S.staff.length : 0); i < N; i++) {
      const n = i < npcs.length ? npcs[i] : S.staff[i - npcs.length]; if (!n || n.custom || n.hidden || n.ghostNpc) continue;
      if (!onScreen(n.x, n.y, cx, cy, VW, VH) || wetAt(n.x, n.y)) continue;
      shadowAt(g, n.x - cx, n.y - cy + 1, charW(n), 0, aU, darkAt(n.x, n.y));
    }
    const p = S.player; SHADOW.last = null; if (!p || p.hidden) return;
    const c = p.custom; if (c && !c.shadowW) return;
    if (S.sea && (S.sea.riding || S.sea.diving)) return;
    if (wetAt(p.x, p.y)) return;
    const w = c ? c.shadowW : charW(p), z = c && c.shadowZ ? c.shadowZ() : 0;
    const dk = darkAt(p.x, p.y); shadowAt(g, p.x - cx, p.y - cy + 1, w, z, aU, dk); SHADOW.last = { w, z, dk: +dk.toFixed(2) };
  },
};

/* p110sh:begin — bóng theo cỡ thật (anh 02/11): bề ngang bóng = 0,65 × bề ngang CHÂN đo từ ảnh đang dùng (shadow110.py, chạy lại khi đổi ảnh / cỡ) */
export const FW110 = {"utchan":8.0,"thanhong":9.0,"golem":8.0,"rongdo":11.5,"bachkinh":6.0,"loiho":3.5,"vitbao":5.5,"diepnhan":13.0,"banhbao":6.0,"tinhmieu":5.5,"cuoitho":6.0,"tuyetky":8.0,"bovimach":8.0,"culibong":10.0,"hacgiac":13.0,"hoahung":7.0,"macuu":5.0,"nguuson":9.0,"kylan":5.0,"kylan2":6.0,"tete":4.0,"tete2":5.5,"hac":2.5,"saola":4.0,"saola2":5.0,"daibang":5.0,"de":8.5,"tacke":10.0,"kimquy":10.5,"chuichui":6.0,"cachep":5.0,"coc":7.0,"de2":8.5,"chuichui2":6.0,"tacke2":10.0,"hac2":4.0,"daibang2":6.5,"kimquy2":16.0,"cachep2":10.5,"coc2":7.5,"rocky":15.0,"molandak":8.0,"molandak2":7.0,"molandak3":11.0,"moyaki":6.0,"moyaki2":8.0,"moyaki3":8.0,"chog":7.0,"chog2":6.0,"chog3":10.0,"oali":9.0,"oalipho":11.0,"laooa":10.0,"elyziuma":16.5,"pwoofer":8.0};
export function fw110(sp, w0) { const f = sp && FW110[sp]; return f ? Math.max(6, Math.round(f * 0.65)) : w0; }
if (typeof globalThis !== 'undefined') globalThis.__fw110 = fw110;
/* p110sh:end */
