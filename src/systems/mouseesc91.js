// mouseesc91.js — p91 (anh 02/11, đang chơi p110: "Câu cá có thể dùng CHUỘT để thoát ra").
//  Bảng mini-game vẽ trên canvas (câu cá trên bờ 'fish', câu cá dưới biển 'seafish') thoát / chơi được bằng chuột:
//   · Nút "✕ Thu cần / Reel in" (khung giấy PixelLab ui/hud/box.png + icon ui/hud/close.png) ở góc phải trên bảng.
//   · Chuột trái: cá đang cắn ('bite') → giật (= phím E) · đang kéo ('reel') → bấm trong bảng = kéo (= E), ra ngoài bảng = thu cần · đang chờ → ra ngoài bảng = thu cần.
//   · Chuột phải bất kỳ đâu = thu cần.
//  Bảng câu cá báo khung + pha qua globalThis.__mg91 = { mode, phase, x, y, w, h } (toạ độ canvas UI) — animals.js / sea_dive.js vá 1 dòng (patch-mouseesc.py).
//  Thu cần = gọi đúng hàm đóng Esc của chế độ đó (S.closers[mode]); giật / kéo = S.actions[mode]. Không đổi luật câu cá.
//  · ANH CHỐT 02/11: chuột TRÁI lên ô nước = ĐI TỚI đó (lội / bơi nếu đi được, không thì tới mép gần nhất) — KHÔNG thả câu;
//    chuột PHẢI lên ô nước = CÂU CÁ (tự cầm cần, xa thì đi tới mép rồi thả). Đang câu: chuột phải = thu cần (không thả câu mới).
//    Chuột phải chỗ khác giữ hành vi cũ (ăn món đang cầm…), không mở menu trình duyệt. Phím E cạnh nước vẫn câu như cũ.
//    Cơ chế: trái lên nước → globalThis.__ww91 (animals.js near bỏ ứng viên câu tới khi hết đường đi); phải lên nước → globalThis.__rf91 + phát 1 click trái giả
//    (dùng lại đúng luồng click cũ: trong tầm thì câu, xa thì đi tới rồi câu).
const MODES = new Set(['fish', 'seafish']);
const WW = { frames: 0, rfT: 0 };
function waterAt(ctx) { const C = ctx, m = C.S.map, mt = C.mouseTile && C.mouseTile(); if (!m || !mt || m.sea || !C.getG || !C.T) return null; return C.getG(m, mt.tx, mt.ty) === C.T.WATER ? mt : null; }
const ST = { el: null, ctx: null, last: null };
const vi = ctx => ctx.lang() === 'vi';
function css() {
  if (document.getElementById('me91-style')) return;
  const s = document.createElement('style'); s.id = 'me91-style';
  s.textContent = `#me91{position:fixed;z-index:12;display:flex;align-items:center;gap:3px;box-sizing:border-box;border:6px solid transparent;border-image:url(assets/px/ui/hud/box.png) 6 fill / 6px;image-rendering:pixelated;padding:0 5px 0 2px;font:17px/20px VT323,monospace;color:#3b2412;cursor:pointer;user-select:none;touch-action:manipulation}
#me91[hidden]{display:none}
#me91 img{width:18px;height:18px;image-rendering:pixelated;pointer-events:none}
#me91:hover{filter:brightness(1.08)}`;
  document.head.appendChild(s);
}
function S_(ctx) { return ctx.S; }
const fishOn = ctx => !!ctx && (MODES.has(ctx.S.mode) || !!ctx.S.fish91);   /* p91: câu trên bờ giữ chế độ 'play' (S.fish91) */
const mk = ctx => (ctx.S.fish91 && !MODES.has(ctx.S.mode) ? 'fish' : ctx.S.mode);
function reel(ctx) { const S = S_(ctx), f = S.closers && S.closers[mk(ctx)]; if (f) { f(); return true; } return false; }
function act(ctx) { const S = S_(ctx), f = S.actions && S.actions[mk(ctx)]; if (f) { f(); return true; } return false; }
function panel() { const g = globalThis.__mg91; return g && performance.now() - (g.at || 0) < 400 ? g : null; }
function toCanvas(e) {   /* điểm chuột → toạ độ canvas UI (bảng câu vẽ ở đó) */
  const ug = document.getElementById('ui') || document.querySelector('canvas#ug') || document.querySelectorAll('canvas')[1] || document.getElementById('c');
  const c = (panel() && panel().cv) || ug; if (!c) return null; const r = c.getBoundingClientRect(); if (!r.width) return null;
  return { x: (e.clientX - r.left) * c.width / r.width, y: (e.clientY - r.top) * c.height / r.height, r, c };
}
function inPanel(e) { const p = panel(), q = toCanvas(e); if (!p || !q) return false; return q.x >= p.x && q.x <= p.x + p.w && q.y >= p.y && q.y <= p.y + p.h; }
function place(ctx) {
  const el = ST.el, p = panel(), on = fishOn(ctx) && !!p && p.phase !== 'done';
  if (el.hidden === on) el.hidden = !on; if (!on) return;
  const c = p.cv; if (!c) return; const r = c.getBoundingClientRect(), kx = r.width / c.width, ky = r.height / c.height;
  const lab = vi(ctx) ? 'Thu cần' : 'Reel in'; if (el.dataset.l !== lab) { el.dataset.l = lab; el.innerHTML = `<img src="assets/px/ui/hud/close.png" alt="">${lab}`; el.title = vi(ctx) ? 'Thu cần (Esc / chuột phải)' : 'Reel in (Esc / right-click)'; }
  const w = el.offsetWidth || 90, h = el.offsetHeight || 30, x = Math.round(r.left + (p.x + p.w) * kx - w + 4), y = Math.round(r.top + p.y * ky - h + 6);
  const L = Math.max(4, Math.min(innerWidth - w - 4, x)) + 'px', T = Math.max(4, y) + 'px'; if (el.style.left !== L) el.style.left = L; if (el.style.top !== T) el.style.top = T;
}
export const mouseesc91 = {
  id: 'mouseesc91',
  onZoneEnter(ctx) {
    ST.ctx = ctx; if (typeof document === 'undefined' || ST.el) return;
    css(); const el = document.createElement('div'); el.id = 'me91'; el.hidden = true; document.body.appendChild(el); ST.el = el;
    el.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); const C = ST.ctx; if (fishOn(C)) { ST.last = 'btn'; reel(C); } });
    addEventListener('pointerdown', e => {
      const C = ST.ctx; if (!fishOn(C) || e.target === el || el.contains(e.target)) return;
      if (e.target.closest && e.target.closest('#touch, #menu, .ov, button')) return;   /* nút cảm ứng (A…) / menu giữ nguyên */
      const p = panel(), ph = p ? p.phase : null; let done = false;
      if (e.button === 2) { ST.last = 'right'; done = reel(C); }
      else if (e.button === 0) {
        if (ph === 'bite') { ST.last = 'bite'; done = act(C); }
        else if (ph === 'reel' && inPanel(e)) { ST.last = 'reel'; done = act(C); }
        else if (!inPanel(e)) { ST.last = 'outside'; done = reel(C); }
      }
      if (done || (C.S.fish91 && e.target && e.target.id === 'c')) { e.preventDefault(); e.stopPropagation(); }   /* đang câu (chế độ play): bấm canvas không làm người đi */
    }, true);
    addEventListener('contextmenu', e => { const C = ST.ctx; if (fishOn(C)) { e.preventDefault(); e.stopImmediatePropagation(); return; } if (C && C.S.mode === 'play' && e.target && e.target.id === 'c') { e.preventDefault(); if (ST.rclickWater) { ST.rclickWater = false; e.stopImmediatePropagation(); } } }, true);
    /* bấm chuột trên canvas lúc đang chơi: trái lên nước = đi (không câu) · phải lên nước = câu */
    addEventListener('pointerdown', e => {
      const C = ST.ctx; if (!C || C.S.mode !== 'play' || C.S.fish91 || !e.target || e.target.id !== 'c' || e.pointerType === 'touch') return;
      if (e.button === 0) { if (globalThis.__rf91 && performance.now() - WW.rfT < 200) return; globalThis.__rf91 = false; const w = waterAt(C); globalThis.__ww91 = !!w; WW.frames = 0; if (w) ST.last = 'leftWater'; return; }
      if (e.button === 2) { const w = waterAt(C); if (!w) return; ST.rclickWater = true; ST.last = 'rightWater'; e.preventDefault(); e.stopImmediatePropagation();
        globalThis.__ww91 = false; globalThis.__rf91 = true; WW.rfT = performance.now(); WW.frames = 0;
        const cv = e.target; setTimeout(() => { try { cv.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, clientX: e.clientX, clientY: e.clientY, button: 0, buttons: 1, pointerType: 'mouse', isPrimary: true })); } catch (er) { } }, 0); }
    }, true);
    if (typeof window !== 'undefined') window.__me91 = { state: () => ({ mode: ST.ctx && ST.ctx.S.mode, fish91: !!(ST.ctx && ST.ctx.S.fish91), panel: panel() && { ...panel(), cv: undefined }, btn: el.hidden ? null : (() => { const r = el.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), text: el.textContent }; })(), last: ST.last, ww: !!globalThis.__ww91, rf: !!globalThis.__rf91 }), water: () => waterAt(ST.ctx), mt: () => ST.ctx.mouseTile && ST.ctx.mouseTile() };
  },
  key(code, ctx) { if (code === 'Escape' && ctx.S.fish91) { reel(ctx); return true; } return false; },   /* Esc khi đang câu (chế độ play) = thu cần, không mở menu */
  update(dt, ctx) { ST.ctx = ctx; if (ST.el) place(ctx);
    if (globalThis.__ww91 || globalThis.__rf91) { WW.frames++; if (WW.frames > 3 && !ctx.S.clickGoal) { globalThis.__ww91 = false; globalThis.__rf91 = false; } if (MODES.has(ctx.S.mode)) globalThis.__rf91 = false; }
  },
};
