/* lyronflash121.js — c71-trogiup (plan-121, anh chốt câu Lyron phương án (a)): HỒI TƯỞNG LYRON cho người chơi mới.
   Người mới (fresh120: bỏ đoạn Biển, vào thẳng act 2) không biết Lyron là ai mà HUD vẫn ghi "Cứu Lyron" → đoạn hồi tưởng NGẮN:
   3 khung tranh pixel (PixelLab, cùng kiểu ký ức ui/lyron/mem1..4, sinh bằng tools/pxlab.py PX_NO_LOCK=1 → ui/lyron/fb121_1..3.png):
     1) Lyron kéo người chơi lên bè giữa biển · 2) Kraken trồi lên bắt Lyron gần bến · 3) dạt vào Làng, Noxx: "Gom đủ 3 món để cứu cậu ấy"
     (Chuông Lặn · Bản Đồ Vực · Đại Pha Lê — tên như krstory.js / items.js).
   · Mỗi khung tự sang sau 6 s (cả đoạn 18 s ≤ 20 s); bấm / chạm / E / Space / Enter / nút A = sang khung; Esc hoặc nút "Bỏ qua" = bỏ qua hết.
     Mode 'lf121' (người chơi đứng yên, đồng hồ dừng như mọi bảng). Nền mờ (không đen kín), không nhấp nháy: mỗi khung chỉ hiện dần 1 lần.
   · Tự phát 1 LẦN cho save mới (save.flags.p120new) ở Làng: sau hội thoại Noxx đầu tiên (flags.p120tut) và khi đã về mode 'play' ổn định
     1,2 s (tức là sau cả bảng chọn Chấn Thú / đặt tên nếu có). Save cũ (không có p120new) KHÔNG phát; save đã có huy hiệu / đã cứu Lyron cũng không.
     Đánh dấu đã xem: save.sys.lyronflash121 = { seen, t, n }.
   · Chuỗi Nhập môn (save.sys.nhapmon121, tác nhân khác làm): nên đợi ctx.lyronFlash121.pending() === false rồi mới hiện bước 1
     (hệ này phát ngay khi đủ điều kiện, không đợi chuỗi đó).
   · Xem lại: nút "Hồi tưởng Lyron" trong Sổ tay (C) + trang Cách chơi (howto121).
   Móc test: window.__lf121 = { play, next, skip, state, reset, log }. */
const BASE = 'assets/px/';
const MODE = 'lf121';
const PANEL_T = 6;   /* giây mỗi khung */
const READY_T = 1.2;   /* giây 'play' ổn định trước khi tự phát */
const IMGS = ['ui/lyron/fb121_1.png', 'ui/lyron/fb121_2.png', 'ui/lyron/fb121_3.png'];
const PORTS = ['ui/lyron/c_friend.png', 'ui/lyron/c_friend.png', 'ui/port_noxx_0.png'];
const STR = {
  vi: {
    title: 'Hồi tưởng', skip: 'Bỏ qua ✕', next: 'Tiếp ▶', end: 'Lên đường ▶', hint: 'Bấm để tiếp · Esc bỏ qua', btn: '🎞 Hồi tưởng Lyron',
    who: ['Lyron', 'Lyron', 'Noxx'],
    lines: [
      'Bè của bạn vỡ giữa biển khơi. Lyron — người sáng lập Seismic — chìa tay kéo bạn lên bè của cậu ấy.',
      'Gần tới bến, Kraken trồi lên từ đáy biển, cuốn Lyron đi mất.',
      '"Bạn dạt vào Làng rồi! Lyron bị Kraken bắt mất… Gom đủ 3 món — Chuông Lặn, Bản Đồ Vực, Đại Pha Lê — để cứu cậu ấy."',
    ],
  },
  en: {
    title: 'Flashback', skip: 'Skip ✕', next: 'Next ▶', end: "Let's go ▶", hint: 'Tap to continue · Esc to skip', btn: '🎞 Lyron flashback',
    who: ['Lyron', 'Lyron', 'Noxx'],
    lines: [
      'Your raft broke apart at sea. Lyron — founder of Seismic — reached out and pulled you onto his raft.',
      'Just short of the pier, the Kraken rose from the deep and dragged Lyron away.',
      '"You washed up in the Village! The Kraken took Lyron… Gather three things — the Diving Bell, the Trench Map and the Great Crystal — to save him."',
    ],
  },
};
const ST = { ctx: null, el: null, i: 0, t: 0, from: null, okT: 0, prevMode: 'play', log: [], img: [] };
const L = ctx => STR[ctx && ctx.lang() === 'en' ? 'en' : 'vi'];
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const log = (ev, o) => { ST.log.push({ t: +(performance.now() / 1000).toFixed(1), ev, ...(o || {}) }); if (ST.log.length > 60) ST.log.shift(); };
function sv(ctx) { const s = ctx.S.save; s.sys = s.sys || {}; let d = s.sys.lyronflash121; if (!d || typeof d !== 'object') d = s.sys.lyronflash121 = {}; return d; }
const flags = ctx => (ctx.S.save && ctx.S.save.flags) || {};

/* có nên tự phát không (save mới, chưa xem, ở Làng, xong hội thoại Noxx đầu) */
function pending(ctx) {
  const s = ctx.S.save; if (!s || !ctx.S.map || !ctx.S.zone) return false;
  const f = flags(ctx); if (!f.p120new) return false;
  if (s.sys && s.sys.lyronflash121 && s.sys.lyronflash121.seen) return false;
  const st = s.story || {}; if (st.rescued || (st.act | 0) >= 3) return false;
  if ((s.badges || []).length) return false;
  return true;
}
function ready(ctx) {
  if (!pending(ctx) || ctx.S.zone.id !== 'village') return false;
  const f = flags(ctx); if (!f.p120tut && !f.p120done) return false;
  if (ctx.S.mode !== 'play' || ctx.S.bossFight) return false;
  if (typeof document !== 'undefined' && (document.getElementById('p120pick') || document.getElementById('p121pick') || document.getElementById('npick') || document.querySelector('#dialog:not([hidden])'))) return false;
  return true;
}

function preload() { if (ST.img.length || typeof Image === 'undefined') return; for (const f of IMGS.concat(PORTS)) { const i = new Image(); i.src = BASE + f; ST.img.push(i); } }
function css() {
  if (document.getElementById('lf121-css')) return; const s = document.createElement('style'); s.id = 'lf121-css';
  s.textContent = `#lf121{position:fixed;inset:0;z-index:48;display:flex;align-items:center;justify-content:center;background:rgba(8,6,14,.55);cursor:pointer;touch-action:manipulation}
#lf121 .pk{position:relative;max-width:96vw;max-height:94vh;display:flex;flex-direction:column;align-items:center;box-sizing:border-box;color:#f5ecdc;font:19px VT323,monospace;background:#1a1426;background-clip:padding-box;border:24px solid transparent;border-image:url(${BASE}ui/npick/panel.png) 12 / 24px round;image-rendering:pixelated;padding:0 4px 2px}
#lf121 h3{margin:0 auto 4px;font:bold 22px VT323,monospace;color:#fff4d6;text-align:center;padding:2px 30px 7px;text-shadow:0 2px 0 #5a1010;background:url(${BASE}ui/npick/banner.png) center/100% 100% no-repeat;image-rendering:pixelated}
#lf121 .pic{position:relative;border:3px solid #0d0b14;box-shadow:0 0 0 2px #6a4a2a;background:#0d0b14;line-height:0}
#lf121 .pic img{display:block;image-rendering:pixelated;opacity:0;transition:opacity .45s ease-out}
#lf121 .pic img.on{opacity:1}
#lf121 .tx{display:flex;gap:8px;align-items:flex-start;box-sizing:border-box;margin-top:8px;background:#f3e6c6;color:#3b2412;border:8px solid transparent;border-image:url(${BASE}ui/npick/input.png) 4 / 8px round;background-clip:padding-box;padding:2px 6px;min-height:68px}
#lf121 .tx img{flex:0 0 auto;width:48px;height:48px;image-rendering:pixelated;border:2px solid #6a4a2a;background:#d8c49a}
#lf121 .tx b{display:block;color:#7a3a10;font-size:19px;line-height:1}
#lf121 .tx span{display:block;font-size:19px;line-height:1.05}
#lf121 .ft{display:flex;align-items:center;justify-content:space-between;gap:8px;width:100%;margin-top:4px}
#lf121 .dots{display:flex;gap:5px}#lf121 .dots i{width:9px;height:9px;background:#4a3c5c;border:1px solid #0d0b14}#lf121 .dots i.on{background:#ffd45e}
#lf121 .ft .dim{color:#a89a88;font-size:16px;flex:1 1 auto;text-align:center}
#lf121 button.b{font:18px VT323,monospace;color:#3b1d08;background:#e8913a;border:10px solid transparent;border-image:url(${BASE}ui/npick/btn.png) 8 / 10px round;background-clip:padding-box;padding:0 6px;cursor:pointer;touch-action:manipulation;image-rendering:pixelated}
#lf121 button.lt{font:17px VT323,monospace;background:none;border:none;color:#cfc4b4;cursor:pointer;text-decoration:underline;touch-action:manipulation;padding:0 2px}
@media (max-width:520px){#lf121 .pk{border-width:16px;border-image-width:16px}#lf121 .tx span,#lf121 .tx b{font-size:17px}#lf121 .tx img{width:40px;height:40px}#lf121 .ft .dim{display:none}}`;
  document.head.appendChild(s);
}
function scaleK() { const w = Math.min(window.innerWidth, 900) - 64, h = window.innerHeight - 250; return Math.max(1, Math.min(3, Math.floor(w / 160), Math.floor(h / 96))); }
function render(ctx) {
  const t = L(ctx), i = ST.i, k = scaleK(), W = 160 * k, H = 96 * k, last = i >= IMGS.length - 1;
  ST.el.innerHTML = `<div class="pk" style="width:${W + 56}px"><h3>${esc(t.title)}</h3>
    <div class="pic" style="width:${W}px;height:${H}px"><img alt="" width="${W}" height="${H}" src="${BASE}${IMGS[i]}"></div>
    <div class="tx" style="width:${W + 6}px"><img alt="" src="${BASE}${PORTS[i]}"><div><b>${esc(t.who[i])}</b><span>${esc(t.lines[i])}</span></div></div>
    <div class="ft"><div class="dots">${IMGS.map((_, j) => `<i class="${j <= i ? 'on' : ''}"></i>`).join('')}</div><span class="dim">${esc(t.hint)}</span>
      <button type="button" class="lt" data-a="skip">${esc(t.skip)}</button><button type="button" class="b" data-a="next">${esc(last ? t.end : t.next)}</button></div></div>`;
  const im = ST.el.querySelector('.pic img'), on = () => requestAnimationFrame(() => im.classList.add('on'));
  if (im.complete && im.naturalWidth) on(); else { im.addEventListener('load', on, { once: true }); im.addEventListener('error', on, { once: true }); }
}
function isOpen() { return !!(ST.el && ST.el.isConnected); }
function play(ctx, from) {
  if (!ctx || !ctx.S || !ctx.S.save || !ctx.S.map) return false;
  if (ctx.S.mode === 'codex') { const c = document.getElementById('codex'); if (c) c.hidden = true; ctx.setMode('play'); }
  if (ctx.S.mode !== 'play' && ctx.S.mode !== MODE) return false;
  css(); preload(); ST.i = 0; ST.t = 0; ST.from = from || 'auto';
  const d = sv(ctx); d.seen = 1; d.t = d.t || Date.now(); d.n = (d.n | 0) + 1; ctx.persist();   /* đánh dấu ngay lúc bắt đầu: bị ngắt giữa chừng cũng không phát lại */
  if (!ST.el) {
    const el = document.createElement('div'); el.id = 'lf121';
    el.addEventListener('pointerdown', e => { e.stopPropagation(); e.preventDefault(); });
    el.addEventListener('click', e => {
      e.stopPropagation(); e.preventDefault(); const C = ST.ctx || ctx, b = e.target.closest('[data-a]');
      if (b && b.dataset.a === 'skip') finish(C, 'skip'); else next(C);
    });
    el.addEventListener('wheel', e => { e.stopPropagation(); e.preventDefault(); }, { passive: false });
    ST.el = el;
  }
  render(ctx); if (!ST.el.isConnected) document.body.appendChild(ST.el);
  ctx.setMode(MODE); ctx.registerCloser(MODE, () => finish(ctx, 'esc')); try { ctx.onAction(MODE, () => next(ctx)); } catch (e) { }
  log('play', { from: ST.from }); return true;
}
function next(ctx) { if (!isOpen()) return; ST.t = 0; if (ST.i >= IMGS.length - 1) { finish(ctx, 'end'); return; } ST.i++; render(ctx); log('next', { i: ST.i }); }
function finish(ctx, why) {
  if (ST.el && ST.el.isConnected) ST.el.remove();
  if (ctx && ctx.S.mode === MODE) ctx.setMode('play');
  log('finish', { why, i: ST.i });
  try { window.dispatchEvent(new CustomEvent('lf121done', { detail: { why } })); } catch (e) { }
}

/* nút "Hồi tưởng Lyron" trong Sổ tay (C) */
function codexBtn(ctx) {
  const cx = document.getElementById('codex'); if (!cx || cx.hidden) return;
  let b = document.getElementById('lf121btn'); const t = L(ctx).btn;
  if (!b) {
    const anchor = document.getElementById('c-ach-title') || document.getElementById('c-title'); if (!anchor || !anchor.parentNode) return;
    b = document.createElement('button'); b.id = 'lf121btn'; b.type = 'button'; b.className = 'btn'; b.style.cssText = 'margin:4px 6px 6px 0;display:inline-block';
    b.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); if (ST.ctx) play(ST.ctx, 'codex'); });
    anchor.parentNode.insertBefore(b, anchor);
  }
  if (b.dataset.t !== t) { b.dataset.t = t; b.textContent = t; }   /* QA 09/11: không ghi lại chữ mỗi khung (pxt bọc chữ → khác textContent → nút bị thay giữa lúc bấm, click không ăn) */
}

if (typeof window !== 'undefined' && !window.__lf121bind) {
  window.__lf121bind = true;
  window.addEventListener('keydown', e => {
    const C = ST.ctx; if (!C || !C.S || C.S.mode !== MODE) return;
    e.preventDefault(); e.stopImmediatePropagation(); if (e.repeat) return;
    if (e.code === 'Escape') finish(C, 'esc');
    else if (e.code === 'KeyE' || e.code === 'Space' || e.code === 'Enter' || e.code === 'ArrowRight' || e.code === 'KeyD') next(C);
  }, true);
  window.addEventListener('resize', () => { const C = ST.ctx; if (C && isOpen()) render(C); });
}

export const lyronFlash121 = {
  id: 'lyronflash121',
  always: true,
  onZoneEnter(ctx) {
    ST.ctx = ctx; ST.okT = 0; if (isOpen()) finish(ctx, 'zone');
    ctx.lyronFlash121 = { play: from => play(ctx, from), pending: () => pending(ctx), seen: () => !!(ctx.S.save && ctx.S.save.sys && ctx.S.save.sys.lyronflash121 && ctx.S.save.sys.lyronflash121.seen), open: () => isOpen() };
    if (pending(ctx)) preload();
    if (typeof window !== 'undefined') window.__lf121 = {
      play: from => play(ctx, from || 'test'), next: () => next(ctx), skip: () => finish(ctx, 'test'), log: () => ST.log.slice(),
      reset: () => { if (ctx.S.save.sys) delete ctx.S.save.sys.lyronflash121; ctx.persist(); return pending(ctx); },
      state: () => ({ open: isOpen(), i: ST.i, t: +ST.t.toFixed(2), mode: ctx.S.mode, pending: pending(ctx), ready: ready(ctx), seen: (ctx.S.save.sys || {}).lyronflash121 || null, from: ST.from }),
    };
  },
  onZoneLeave(ctx) { if (isOpen()) finish(ctx, 'zone'); },
  update(dt, ctx) {
    ST.ctx = ctx;
    if (isOpen()) {
      if (ctx.S.mode !== MODE) { ST.el.remove(); log('lost-mode', { mode: ctx.S.mode }); return; }
      ST.t += dt; if (ST.t >= PANEL_T) next(ctx);
      return;
    }
    if (ctx.S.mode === 'codex') { try { codexBtn(ctx); } catch (e) { } }
    if (ready(ctx)) { ST.okT += dt; if (ST.okT >= READY_T) { ST.okT = 0; play(ctx, 'auto'); } } else ST.okT = 0;
  },
};
