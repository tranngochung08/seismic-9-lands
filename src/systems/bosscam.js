// bosscam.js — plan-30 (dùng chung cho mọi trùm Vết Nứt): camera trận trùm giữ CẢ người chơi LẪN trùm trong khung, dịch cả ngang (S.camDX) và dọc (S.camDY).
//  · Mặc định camera bám người chơi (main.js render: cx = p.x − VW/2 + camDX). Khi trùm ra ngoài khung (trừ lề), dời camera vừa đủ về phía trùm
//    nhưng người chơi luôn còn trong khung (người chơi ưu tiên khi hai bên quá xa nhau).
//  · Lề trên lớn hơn (thanh máu trùm + tên chiêu che mép trên). Làm mượt theo dt; gọi bossCamReset khi rời sân.
//  Dùng: import { bossCam, bossCamReset } from './bosscam.js'; mỗi update: bossCam(ctx, boss /* {x,y} hoặc null */, dt, { top: 44, h: 30 /* chiều cao hình trùm */ }).
export function bossCam(ctx, b, dt, o = {}) {
  const S = ctx.S, p = S.player, VW = ctx.VW || 480, VH = ctx.VH || 270;
  let wx = 0, wy = o.dy0 || 0;
  if (b && p) {
    const side = o.side ?? 26, top = o.top ?? 44, bot = o.bot ?? 22, bh = o.h ?? 26;
    /* trục ngang: tâm khung c (so với người) sao cho người & trùm cùng nằm trong [c − VW/2 + side, c + VW/2 − side] */
    const axis = (pv, bv, half, lo, hi) => {   /* pv, bv: toạ độ người / trùm; lo/hi: lề hai đầu; trả độ lệch tâm so với pv */
      const minC = Math.max(pv, bv) - (half - hi), maxC = Math.min(pv, bv) + (half - lo);
      if (minC <= maxC) { const want = Math.max(minC, Math.min(maxC, pv)); return want - pv; }
      /* quá xa: giữ người sát mép phía đối diện trùm */
      return bv > pv ? Math.max(0, half - lo - 4) : -Math.max(0, half - hi - 4);
    };
    wx = axis(p.x, b.x, VW / 2, side, side);
    /* trục dọc: người vẽ quanh p.y − 8 (main.js); trùm cao bh → điểm trên cùng b.y − bh; lề trên lớn (thanh máu) */
    const py = p.y - 8, btop = b.y - bh, bbot = b.y;
    const hiY = Math.max(py, bbot), loY = Math.min(py - 18, btop);
    const minC = hiY - (VH / 2 - bot), maxC = loY + (VH / 2 - top);
    if (minC <= maxC) wy = Math.max(minC, Math.min(maxC, py)) - py; else wy = btop < py ? -(VH / 2 - bot - 4) : (VH / 2 - top - 4);   /* quá xa: người sát mép phía đối diện trùm, thấy được nhiều trùm nhất có thể */
    wy += o.dy0 || 0;
  }
  const k = Math.min(1, dt * (o.speed || 3));
  S.camDX = (S.camDX || 0) + (wx - (S.camDX || 0)) * k;
  S.camDY = (S.camDY || 0) + (wy - (S.camDY || 0)) * k;
  return { dx: S.camDX, dy: S.camDY };
}
export function bossCamReset(ctx) { ctx.S.camDX = 0; ctx.S.camDY = 0; }
/* 2026-10-13 (anh Hùng): thanh máu trùm KHÔNG được đè nút HUD (điện thoại dọc: cụm nút góc phải trên). Dùng chung cho cả 3 trùm Vết Nứt.
   bossBarBox(ug, wantW, needH) → { x, y, w, cx }: dò từ mép trên xuống, tìm dải ngang cao needH (px canvas UI) trống nút HUD, lấy khoảng trống rộng nhất
   (≥ min(wantW, 220)); thanh rộng tối đa wantW, ưu tiên giữa màn. Toạ độ nút đọc từ DOM (getBoundingClientRect) quy ra px của canvas UI. */
const HUD_IDS = ['hud-tl', 'hud-tr', 'px-clock', 'btn-menu', 'btn-photo', 'btn-rot', 'btn-chat', 'herobar', 'hotbar', 'mslots', 'btn-a', 'btn-b'];
export function bossBarBox(ug, wantW, needH, minW = 220) {
  const cv = ug.canvas, W = cv.width, H = cv.height, rects = [];
  if (typeof document !== 'undefined' && cv.getBoundingClientRect) {
    const cr = cv.getBoundingClientRect(), kx = W / (cr.width || W), ky = H / (cr.height || H);
    for (const id of HUD_IDS) {
      for (const e of document.querySelectorAll(`#${id}, .${id}`)) { if (e.hidden) continue; const cs = getComputedStyle(e); if (cs.display === 'none' || cs.visibility === 'hidden') continue;
      for (const el of [e, ...e.children]) {   /* khung chứa (display: contents / cỡ 0) → lấy cả các con */
        const r = el.getBoundingClientRect(); if (!r.width || !r.height || (r.width > cr.width * 0.8 && r.height > cr.height * 0.4)) continue;   /* bỏ khung phủ cả màn (lớp chứa cần điều khiển…) */ const c2 = getComputedStyle(el); if (c2.visibility === 'hidden' || c2.display === 'none') continue;
        rects.push({ x0: (r.left - cr.left) * kx - 4, x1: (r.right - cr.left) * kx + 4, y0: (r.top - cr.top) * ky - 3, y1: (r.bottom - cr.top) * ky + 3 });
      } }
    }
  }
  const need = Math.min(wantW, minW);
  for (let y = 6; y < H * 0.5; y += 4) {
    const band = rects.filter(r => r.y0 < y + needH && r.y1 > y).sort((a, b) => a.x0 - b.x0); let best = null, cur = 8;
    for (const r of band) { if (r.x0 > cur && (!best || r.x0 - cur > best.w)) best = { x: cur, w: r.x0 - cur }; cur = Math.max(cur, r.x1); }
    if (W - 8 > cur && (!best || W - 8 - cur > best.w)) best = { x: cur, w: W - 8 - cur };
    if (best && best.w >= need) { const w = Math.min(wantW, best.w), cx = Math.max(best.x + w / 2, Math.min(best.x + best.w - w / 2, W / 2)), out = { x: Math.round(cx - w / 2), y, w: Math.round(w), cx: Math.round(cx), h: needH, W, H }; if (typeof window !== 'undefined') window.__bossBar = { ...out, rects };   /* móc test */ return out; }
  }
  const out = { x: Math.round((W - wantW) / 2), y: 6, w: wantW, cx: Math.round(W / 2), h: needH, W, H, fallback: true }; if (typeof window !== 'undefined') window.__bossBar = { ...out, rects }; return out;
}
