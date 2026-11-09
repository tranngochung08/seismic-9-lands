/* help121.js — c71-trogiup (plan-121 A6): BẢNG PHÍM nhỏ + nút ? trên điện thoại.
   · Máy tính: phím ? (Shift + /) hoặc F1 mở / đóng bảng phím; Esc / bấm ra ngoài / nút X đóng. Mode 'help121' (đồng hồ, di chuyển dừng).
   · Điện thoại: nút ? nhỏ đặt cạnh hàng nút ⟳ 📷 ☰ (đo vị trí #btn-rot mỗi giây, không đè nút có sẵn) → bảng giải thích các NÚT ẢO.
     Bảng có 2 thẻ: Nút điện thoại / Phím máy tính (điện thoại mở thẻ nút trước, máy tính mở thẻ phím trước).
   · Chỉ ghi phím ĐANG CÓ trong code (main.js, hotbar.js, squad104.js, comp79.js, fieldct.js, drops.js, lich120.js, bestiary120.js…).
     Bay = V, Shift = lộn né (anh chốt plan-121 câu 3; hệ Bay do tác nhân khác đổi).
   · Khung pixel ui.npick (panel + ruy băng) như bảng chọn Chấn Thú; chữ vi / en. Nút "Cách chơi" mở trang howto121 (ctx.howto121.open).
   Không sửa file có sẵn: tự nghe keydown (capture) + chèn DOM. Móc test: window.__h121 = { open(tab), close, state }. */
const BASE = 'assets/px/';
const MODE = 'help121';
const STR = {
  vi: {
    title: 'Phím & nút', tabKeys: 'Phím máy tính', tabTouch: 'Nút điện thoại', howto: '📖 Cách chơi', close: 'Đóng',
    foot: '? hoặc F1 mở / đóng · Esc đóng',
    keys: [
      ['Di chuyển', [['WASD · ↑↓←→', 'Đi'], ['Chuột trái lên đất', 'Đi tới chỗ đó'], ['Tab · Shift+Tab', 'Khoá mục tiêu kế tiếp / lùi lại'], ['− / =', 'Thu nhỏ / phóng to cảnh']]],
      ['Đánh & chiêu', [['Chuột trái lên quái', 'Đánh (tự chạy tới)'], ['E · Space', 'Đánh khi đứng sát · nói chuyện · nhặt'], ['1 – 5', 'Chiêu trên thanh kỹ năng'], ['L · ô Chưởng', 'Chưởng: tốn 1 Ki, đánh mọi quái trước mặt'], ['Ki', 'Thanh Ki đầy dần khi đánh — Chấn Thú đủ Ki tự tung chiêu'], ['Shift', 'Lộn né'], ['R', 'Ăn nhanh món hồi máu tốt nhất'], ['6 7 8 9 0', 'Chọn ô đồ trên thanh công cụ']]],
      ['Chấn Thú', [['J', 'Thả ra / thu về'], ['G', 'Cả đội đánh mục tiêu đang khoá'], ['H', 'Chấn Thú đang chọn tung chiêu'], ['U', 'Đổi lệnh đội: Bảo vệ · Tấn công tự do · Theo sau'], ['X', 'Thu cả đội về'], ['E cạnh thú ngất', 'Ném Ấn Thu — đánh thú hoang tới ngất rồi bắt'], ['T', 'Bảng Tiềm Năng']]],
      ['Bay', [['V', 'Bay lên / hạ cánh']]],
      ['Bảng', [['I · B', 'Túi đồ'], ['Q', 'Nhiệm vụ'], ['O', 'Mua nhanh'], ['M', 'Bản đồ'], ['C', 'Sổ tay'], ['F2', 'Lịch'], ['`', 'Sổ quái'], ['F', 'Nhặt hết đồ dưới đất (khi bảng đồ rơi hiện) · không thì toàn màn hình'], ['P', 'Chụp ảnh'], ['? · F1', 'Bảng phím này']]],
      ['Thoát', [['Esc', 'Đóng bảng / mở menu'], ['E · Space · Enter', 'Lật thoại · xác nhận']]],
    ],
    touch: [
      ['Đi & nhìn', [['Cần gạt trái', 'Kéo để đi 8 hướng'], ['Chạm lên đất', 'Đi tới chỗ đó'], ['🎯 Đổi mục tiêu', 'Khoá quái kế tiếp']]],
      ['Đánh', [['Ⓐ', 'Đánh · nói chuyện · nhặt — chữ dưới nút cho biết việc sẽ làm'], ['Chưởng', 'Tốn 1 Ki, đánh mọi quái trước mặt'], ['Ô chiêu', 'Chiêu trên thanh kỹ năng (khi có)'], ['Lộn', 'Lộn né đòn (khi có nút)']]],
      ['Chấn Thú', [['Thả', 'Thả Chấn Thú ra / thu về'], ['Ấn Thu', 'Ném Ấn Thu vào thú hoang đang ngất — số là Ấn Thu còn lại'], ['Ô chân dung', 'Chạm để thả / thu từng con']]],
      ['Bay', [['Bay', 'Bay lên / hạ cánh']]],
      ['Góc trên', [['Sổ tay · Bản đồ · Cài đặt', '3 nút trên cùng'], ['⟳', 'Xoay ngang màn hình'], ['📷', 'Chụp ảnh'], ['☰', 'Menu: túi, nhiệm vụ, đội…'], ['?', 'Bảng này']]],
    ],
  },
  en: {
    title: 'Keys & buttons', tabKeys: 'Keyboard', tabTouch: 'Phone buttons', howto: '📖 How to play', close: 'Close',
    foot: '? or F1 open / close · Esc close',
    keys: [
      ['Move', [['WASD · ↑↓←→', 'Walk'], ['Left-click the ground', 'Walk there'], ['Tab · Shift+Tab', 'Lock next / previous target'], ['− / =', 'Zoom out / in']]],
      ['Fight & moves', [['Left-click a monster', 'Attack (walks there)'], ['E · Space', 'Attack up close · talk · pick up'], ['1 – 5', 'Moves on the skill bar'], ['L · Palm slot', 'Palm Strike: 1 Ki, hits every monster in front'], ['Ki', 'Ki fills as you fight — your Quake Beast casts its moves when it has enough'], ['Shift', 'Dodge roll'], ['R', 'Quick-eat your best healing food'], ['6 7 8 9 0', 'Pick a toolbar item slot']]],
      ['Quake Beasts', [['J', 'Send out / call back'], ['G', 'Whole team attacks the locked target'], ['H', 'Selected beast casts its move'], ['U', 'Team order: Guard · Free attack · Follow'], ['X', 'Recall the whole team'], ['E by a fainted beast', 'Throw a Seal Orb — beat a wild beast until it faints, then catch it'], ['T', 'Potential panel']]],
      ['Fly', [['V', 'Take off / land']]],
      ['Panels', [['I · B', 'Bag'], ['Q', 'Quests'], ['O', 'Quick buy'], ['M', 'Map'], ['C', 'Codex'], ['F2', 'Calendar'], ['`', 'Bestiary'], ['F', 'Pick up all loot (when the loot box shows) · otherwise fullscreen'], ['P', 'Photo mode'], ['? · F1', 'This panel']]],
      ['Exit', [['Esc', 'Close panels / open menu'], ['E · Space · Enter', 'Next line · confirm']]],
    ],
    touch: [
      ['Move & look', [['Left stick', 'Drag to walk in 8 directions'], ['Tap the ground', 'Walk there'], ['🎯 Next target', 'Lock the next monster']]],
      ['Fight', [['Ⓐ', 'Attack · talk · pick up — the word under it says what it will do'], ['Palm', '1 Ki, hits every monster in front'], ['Move slots', 'Moves on the skill bar (when you have them)'], ['Roll', 'Dodge roll (when the button shows)']]],
      ['Quake Beasts', [['Out', 'Send your Quake Beast out / call it back'], ['Seal Orb', 'Throw at a fainted wild beast — the number is how many you have'], ['Portrait slot', 'Tap to send out / recall each beast']]],
      ['Fly', [['Fly', 'Take off / land']]],
      ['Top corner', [['Codex · Map · Settings', 'The three top buttons'], ['⟳', 'Rotate to landscape'], ['📷', 'Photo mode'], ['☰', 'Menu: bag, quests, team…'], ['?', 'This panel']]],
    ],
  },
};
const ST = { ctx: null, el: null, tab: null, btn: null, btT: 0, prevMode: null, log: [] };
const L = ctx => STR[ctx && ctx.lang() === 'en' ? 'en' : 'vi'];
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const touchDev = () => typeof matchMedia !== 'undefined' && matchMedia('(pointer:coarse)').matches;
const log = (ev, o) => { ST.log.push({ t: +(performance.now() / 1000).toFixed(1), ev, ...(o || {}) }); if (ST.log.length > 60) ST.log.shift(); };

function css() {
  if (document.getElementById('h121-css')) return; const s = document.createElement('style'); s.id = 'h121-css';
  s.textContent = `#h121{position:fixed;inset:0;z-index:47;display:flex;align-items:center;justify-content:center;background:rgba(8,6,14,.3)}
#h121 .pk{position:relative;width:min(96vw,720px);max-height:90vh;display:flex;flex-direction:column;box-sizing:border-box;color:#f5ecdc;font:19px VT323,monospace;background:#1a1426;background-clip:padding-box;border:24px solid transparent;border-image:url(${BASE}ui/npick/panel.png) 12 / 24px round;image-rendering:pixelated;padding:0 4px}
#h121 h3{margin:0 auto 4px;font:bold 24px VT323,monospace;color:#fff4d6;text-align:center;padding:3px 34px 8px;text-shadow:0 2px 0 #5a1010;background:url(${BASE}ui/npick/banner.png) center/100% 100% no-repeat;image-rendering:pixelated}
#h121 .x{position:absolute;right:-14px;top:-14px;width:30px;height:30px;border:0;background:url(${BASE}ui/hud/close.png) center/100% 100% no-repeat;image-rendering:pixelated;cursor:pointer;touch-action:manipulation}
#h121 .tabs{display:flex;gap:6px;justify-content:center;margin:0 0 6px}
#h121 .tabs button{font:18px VT323,monospace;color:#f5ecdc;background:#2a1f38;border:8px solid transparent;border-image:url(${BASE}ui/npick/tile.png) 6 / 8px round;background-clip:padding-box;padding:0 8px;cursor:pointer;touch-action:manipulation}
#h121 .tabs button.on{border-image-source:url(${BASE}ui/npick/tile_on.png);color:#ffe9b0}
#h121 .bd{overflow:auto;min-height:0;flex:1 1 auto;overscroll-behavior:contain;columns:2 300px;column-gap:14px;padding:0 4px}
#h121 .gp{break-inside:avoid;margin:0 0 8px}
#h121 .gp h4{margin:0 0 2px;font:bold 20px VT323,monospace;color:#ffd45e;border-bottom:1px solid #4a3c5c}
#h121 .rw{display:flex;gap:8px;align-items:baseline;line-height:1.05;margin:2px 0}
#h121 kbd{flex:0 0 auto;min-width:64px;max-width:46%;white-space:normal;font:18px VT323,monospace;color:#3b2412;background:#f3e6c6;border:1px solid #6a5a7c;border-bottom-width:3px;border-radius:4px;padding:0 5px;text-align:center}
#h121 .rw span{color:#e9dcc6}
#h121 .ft{display:flex;flex-wrap:wrap;gap:8px;align-items:center;justify-content:center;margin:6px 0 2px}
#h121 .ft .dim{color:#a89a88;font-size:16px}
#h121 button.b{font:20px VT323,monospace;color:#3b1d08;background:#e8913a;border:12px solid transparent;border-image:url(${BASE}ui/npick/btn.png) 8 / 12px round;background-clip:padding-box;padding:0 8px;cursor:pointer;touch-action:manipulation;image-rendering:pixelated}
#h121btn{position:absolute;pointer-events:auto;width:36px;height:36px;font:bold 20px VT323,monospace;touch-action:manipulation;padding:0;line-height:1}
@media (max-width:520px){#h121 .pk{font-size:17px;border-width:18px;border-image-width:18px}#h121 kbd{min-width:52px;font-size:16px}#h121 h3{font-size:21px}#h121 .x{right:-10px;top:-10px}}`;
  document.head.appendChild(s);
}
function rows(groups) {
  return groups.map(([h, list]) => `<div class="gp"><h4>${esc(h)}</h4>${list.map(([k, d]) => `<div class="rw"><kbd>${esc(k)}</kbd><span>${esc(d)}</span></div>`).join('')}</div>`).join('');
}
function render(ctx) {
  const el = ST.el; if (!el) return; const t = L(ctx), keys = ST.tab === 'keys';
  el.innerHTML = `<div class="pk"><button type="button" class="x" data-a="x" aria-label="${esc(t.close)}"></button><h3>${esc(t.title)}</h3>
    <div class="tabs"><button type="button" data-tab="touch" class="${keys ? '' : 'on'}">${esc(t.tabTouch)}</button><button type="button" data-tab="keys" class="${keys ? 'on' : ''}">${esc(t.tabKeys)}</button></div>
    <div class="bd">${rows(keys ? t.keys : t.touch)}</div>
    <div class="ft"><button type="button" class="b" data-a="howto">${esc(t.howto)}</button><span class="dim">${esc(t.foot)}</span></div></div>`;
}
function isOpen() { return !!(ST.el && ST.el.isConnected); }
function open(ctx, tab) {
  if (!ctx || !ctx.S || !ctx.S.save || !ctx.S.map) return false;
  if (ctx.S.mode !== 'play' && ctx.S.mode !== MODE) return false;
  css(); ST.tab = tab || ST.tab || (touchDev() ? 'touch' : 'keys');
  if (!ST.el) {
    const el = document.createElement('div'); el.id = 'h121';
    el.addEventListener('pointerdown', e => { e.stopPropagation(); if (e.target === el) { e.preventDefault(); close(ctx); } });
    el.addEventListener('click', e => {
      e.stopPropagation(); const tb = e.target.closest('[data-tab]'); if (tb) { ST.tab = tb.dataset.tab; render(ctx); return; }
      const b = e.target.closest('[data-a]'); if (!b) return;
      if (b.dataset.a === 'x') close(ctx);
      else if (b.dataset.a === 'howto') { close(ctx); try { if (ctx.howto121 && ctx.howto121.open) ctx.howto121.open('help'); } catch (er) { console.error('help121 howto', er); } }
    });
    el.addEventListener('wheel', e => e.stopPropagation(), { passive: true });
    ST.el = el;
  }
  render(ctx); if (!ST.el.isConnected) document.body.appendChild(ST.el);
  if (ctx.S.mode !== MODE) { ctx.setMode(MODE); ctx.registerCloser(MODE, () => close(ctx)); }
  log('open', { tab: ST.tab }); return true;
}
function close(ctx) {
  if (ST.el && ST.el.isConnected) ST.el.remove();
  if (ctx && ctx.S.mode === MODE) ctx.setMode('play'); log('close');
}
function toggle(ctx, tab) { if (isOpen() || (ctx && ctx.S.mode === MODE)) { close(ctx); return true; } return open(ctx, tab); }

/* nút ? trên điện thoại: bên trái hàng ⟳ 📷 ☰ (đo #btn-rot / #btn-photo thật, không đè) */
function placeBtn(ctx) {
  if (typeof document === 'undefined') return; const host = document.getElementById('touch');
  const show = touchDev() && host && ctx.S.save && ctx.S.map && ctx.S.mode === 'play';
  let b = ST.btn;
  if (!show) { if (b) b.hidden = true; return; }
  const ref = [document.getElementById('btn-rot'), document.getElementById('btn-photo'), document.getElementById('btn-menu')].find(e => e && !e.hidden && e.getBoundingClientRect().width > 0);
  if (!ref) { if (b) b.hidden = true; return; }
  if (!b) {
    b = document.createElement('button'); b.id = 'h121btn'; b.type = 'button'; b.textContent = '?'; b.setAttribute('aria-label', 'Help');
    b.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); if (ST.ctx) toggle(ST.ctx, 'touch'); });
    host.appendChild(b); ST.btn = b;
  }
  const r = ref.getBoundingClientRect(), cs = getComputedStyle(ref), w = Math.round(r.width), h = Math.round(r.height);
  for (const p of ['background', 'border', 'borderRadius', 'boxShadow', 'color', 'borderImage', 'imageRendering']) if (b.style[p] !== cs[p]) b.style[p] = cs[p];
  b.style.width = w + 'px'; b.style.height = h + 'px';
  let x = Math.round(r.left - w - 4), y = Math.round(r.top);
  const hit = (xx, yy) => [...host.querySelectorAll('button, .hbtn')].some(o => { if (o === b || o.hidden) return false; const q = o.getBoundingClientRect(); return q.width > 0 && xx < q.right && xx + w > q.left && yy < q.bottom && yy + h > q.top; });
  if (hit(x, y)) { x = Math.round(r.left); y = Math.round(r.bottom + 6); if (hit(x, y)) { x = Math.round(r.left - w - 4); y = Math.round(r.bottom + 6); } }
  if (b.style.left !== x + 'px') b.style.left = x + 'px'; if (b.style.top !== y + 'px') b.style.top = y + 'px';
  b.hidden = false;
}

if (typeof window !== 'undefined' && !window.__h121bind) {
  window.__h121bind = true;
  window.addEventListener('keydown', e => {
    const C = ST.ctx; if (!C || !C.S || e.repeat) return;
    const tg = e.target; if (tg && /INPUT|TEXTAREA|SELECT/.test(tg.tagName)) return;
    const q = e.key === '?' || (e.code === 'Slash' && e.shiftKey) || e.code === 'F1';
    if (q && (C.S.mode === 'play' || C.S.mode === MODE)) { e.preventDefault(); e.stopImmediatePropagation(); toggle(C); return; }
    if (C.S.mode === MODE) { e.preventDefault(); e.stopImmediatePropagation(); if (e.code === 'Escape') close(C); }   /* bảng đang mở: nuốt phím khác */
  }, true);
}

export const help121 = {
  id: 'help121',
  always: true,
  onZoneEnter(ctx) {
    ST.ctx = ctx; if (isOpen()) close(ctx);
    ctx.help121 = { open: tab => open(ctx, tab), close: () => close(ctx), toggle: () => toggle(ctx) };
    if (typeof window !== 'undefined') window.__h121 = {
      open: tab => open(ctx, tab), close: () => close(ctx), log: () => ST.log.slice(),
      state: () => ({ open: isOpen(), tab: ST.tab, mode: ctx.S.mode, btn: ST.btn && !ST.btn.hidden ? (() => { const r = ST.btn.getBoundingClientRect(); return [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)]; })() : null }),
    };
  },
  onZoneLeave(ctx) { if (isOpen()) close(ctx); },
  update(dt, ctx) {
    ST.ctx = ctx;
    if (isOpen() && ctx.S.mode !== MODE) { ST.el.remove(); log('lost-mode', { mode: ctx.S.mode }); }
    if ((ST.btT -= dt) <= 0) { ST.btT = 0.5; try { placeBtn(ctx); } catch (e) { } }
  },
};
