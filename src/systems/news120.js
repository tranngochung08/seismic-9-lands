/* news120.js — c65-hud (plan-120 việc 7, học Saiyan): POPUP "CÓ GÌ MỚI" sau mỗi lần cập nhật.
   Nội dung: data/news.json = { version, title:{vi,en}, items:[{ icon (đường dẫn trong assets/px), vi, en }] } — sửa file này mỗi lần deploy (đổi version).
   Vào game (chế độ 'play' được 1,5 s) mà news.version ≠ save.sys.news120.seen → bảng nhỏ khung gỗ PixelLab (ui/dlg_frame.png) giữa màn, 3–8 dòng có icon,
   nút Đóng (khung ui/npick/btn.png); Esc / E / Enter cũng đóng. Đóng → ghi seen + persist.
   Người chơi MỚI TINH (chưa có seen, cấp 1, chưa gặp ai, chơi < 10 phút) → ghi seen luôn, không hiện. Mỗi phiên hiện tối đa 1 lần.
   Móc test: window.__news120 = { state(), open(), close(), reset() }. Dấu build: NEWS120_POP */
const ST = { data: null, loading: false, el: null, open: false, shown: false, wait: 0, log: [] };
const vi = ctx => !ctx.lang || ctx.lang() !== 'en';
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const sys = ctx => { const s = ctx.S.save; s.sys ||= {}; return (s.sys.news120 ||= {}); };

function load() {
  if (ST.data || ST.loading || typeof fetch === 'undefined') return;
  ST.loading = true;
  fetch('data/news.json?v=' + Date.now(), { cache: 'no-store' }).then(r => (r.ok ? r.json() : null)).then(j => {
    if (j && j.version && Array.isArray(j.items)) ST.data = j; else ST.log.push('bad json');
  }).catch(e => { ST.log.push('fetch ' + e); }).finally(() => { ST.loading = false; });
}
function isFresh(sv) {
  const lv = (sv.hero && sv.hero.lv) || 1, met = (sv.met || []).length, sec = (sv.stats && sv.stats.sec) || 0;
  return lv <= 1 && met === 0 && sec < 600;
}
function css() {
  if (document.getElementById('news120-style')) return;
  const s = document.createElement('style'); s.id = 'news120-style';
  s.textContent = `#news120{position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:30;width:min(400px,calc(100vw - 32px));max-height:calc(100vh - 40px);overflow:auto;box-sizing:border-box;
border:21px solid transparent;border-image:url(assets/px/ui/dlg_frame.png) 14 fill / 21px stretch;image-rendering:pixelated;padding:10px 20px 10px 10px;font-family:VT323,monospace;color:#3b2412}
#news120[hidden]{display:none}
#news120 h3{margin:2px 0 8px;font-size:26px;line-height:24px;text-align:center;color:#6a2a10;letter-spacing:1px}
#news120 ul{list-style:none;margin:0;padding:0}
#news120 li{display:flex;align-items:center;gap:8px;font-size:18px;line-height:17px;padding:3px 0;border-top:1px dashed rgba(90,58,24,.25)}
#news120 li:first-child{border-top:0}
#news120 li img{width:24px;height:24px;flex:none;image-rendering:pixelated;object-fit:contain}
#news120 .ft{display:flex;justify-content:center;margin-top:8px}
#news120 button{font-family:VT323,monospace;font-size:20px;color:#3b2412;background:none;cursor:pointer;min-width:96px;height:32px;padding:0 14px;
border:8px solid transparent;border-image:url(assets/px/ui/npick/btn.png) 8 fill / 8px stretch;image-rendering:pixelated}
#news120 button:hover{filter:none;color:#000}`;
  document.head.appendChild(s);
}
function render(ctx) {
  const d = ST.data, v = vi(ctx), L = v ? 'vi' : 'en';
  if (!ST.el) { css(); ST.el = document.createElement('div'); ST.el.id = 'news120'; ST.el.hidden = true; document.body.appendChild(ST.el); }
  const title = (d.title && (d.title[L] || d.title.en)) || (v ? 'Có gì mới' : "What's new");
  const rows = d.items.slice(0, 8).map(it => `<li>${it.icon ? `<img src="assets/px/${esc(it.icon)}" alt="">` : ''}<span>${esc(it[L] || it.en || it.vi)}</span></li>`).join('');
  ST.el.innerHTML = `<h3>${esc(title)}</h3><ul>${rows}</ul><div class="ft"><button type="button" id="news120-x">${v ? 'Đóng' : 'Close'}</button></div>`;
  ST.el.querySelector('#news120-x').onclick = () => close(ctx);
}
function open(ctx) {
  if (!ST.data || typeof document === 'undefined') return false;
  render(ctx); ST.el.hidden = false; ST.open = true; ST.shown = true;
  ctx.registerCloser('news120', () => close(ctx)); ctx.onAction('news120', () => close(ctx));
  ctx.setMode('news120'); ST.log.push('open ' + ST.data.version);
  return true;
}
function close(ctx) {
  if (ST.el) ST.el.hidden = true;
  if (ST.open && ST.data && ctx.S.save) { sys(ctx).seen = ST.data.version; try { ctx.persist(); } catch (e) { } }
  ST.open = false; if (ctx.S.mode === 'news120') ctx.setMode('play'); ST.log.push('close');
}

export const news120 = {
  id: 'news120',
  always: true,
  onZoneEnter(ctx) {
    load();
    if (typeof window !== 'undefined') window.__news120 = {
      state: () => ({ data: ST.data && { version: ST.data.version, n: ST.data.items.length }, open: ST.open, shown: ST.shown, seen: ctx.S.save && ((ctx.S.save.sys || {}).news120 || {}).seen, log: ST.log.slice() }),
      open: () => open(ctx), close: () => close(ctx), reset: () => { if (ctx.S.save && ctx.S.save.sys) delete ctx.S.save.sys.news120; ST.shown = false; ST.wait = 0; return true; },
    };
  },
  update(dt, ctx) {
    if (ST.open) { if (ctx.S.mode !== 'news120' && ST.el && !ST.el.hidden) { ST.el.hidden = true; ST.open = false; } return; }
    if (ST.shown || !ST.data || !ctx.S.save || ctx.S.mode !== 'play') { if (ctx.S.mode !== 'play') ST.wait = 0; return; }
    ST.wait += dt; if (ST.wait < 1.5) return;
    const k = sys(ctx);
    if (k.seen === ST.data.version) { ST.shown = true; return; }
    if (!k.seen && isFresh(ctx.S.save)) { k.seen = ST.data.version; ST.shown = true; ST.log.push('fresh → seen'); try { ctx.persist(); } catch (e) { } return; }
    open(ctx);
  },
};
