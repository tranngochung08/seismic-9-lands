/* howto121.js — c71-trogiup (plan-121 A7): trang "CÁCH CHƠI" — 1 trang vẽ VÒNG CHƠI bằng icon PixelLab có sẵn.
   Đánh quái → đá / XP / thú hoang → mua Kiếm, đồ, nâng Chấn Thú → huy hiệu vùng (gặp nghệ sĩ + việc vùng) → qua Đèo → vùng mới M1…M9 → cứu Lyron.
   Mỗi ô 1 dòng ngắn đúng cơ chế thật (nextstep.js: 30 đá mua Kiếm, O mua nhanh, đèo = thắng bạn tập; monsters/farm106: rơi đá, Tinh hồn;
   fieldct/farm106: thú hoang ngất → Ấn Thu; story_land/krstory: Chuông Lặn M4, Bản Đồ Vực M6, Đại Pha Lê M9 → lặn dưới cầu tàu tới Hang Ổ Kraken).
   · Mở: nút "Cách chơi" gắn vào Sổ tay (C) (chèn DOM như bestiary120) + nút trong bảng phím help121 (ctx.howto121.open).
   · Khung pixel ui.npick (panel / ruy băng / ô tile); chữ vi / en; Esc / X / bấm ra ngoài đóng. Mode 'howto121'.
   Móc test: window.__ht121 = { open, close, state }. */
const BASE = 'assets/px/';
const MODE = 'howto121';
const STR = {
  vi: {
    title: 'Cách chơi', lead: 'Vòng chơi của Seismic — mỗi vùng lặp lại vòng này, vùng sau quái mạnh hơn.', btn: '📖 Cách chơi', keys: '⌨ Bảng phím', fb: '🎞 Hồi tưởng Lyron', close: 'Đóng',
    loop: '↻ Vùng mới quái mạnh hơn — đánh tiếp, mạnh tiếp.', foot: 'Esc đóng · ? / F1 xem phím',
    steps: [
      ['Đánh quái', 'Chuột trái / E (điện thoại: Ⓐ). Thả Chấn Thú (J) đánh cùng.'],
      ['Nhận thưởng', 'Hạ quái: bạn + Chấn Thú lên XP, rơi đá Seismic, Tinh hồn, đồ. F nhặt hết.'],
      ['Bắt thú hoang', 'Đánh Chấn Thú hoang tới ngất → ném Ấn Thu (E) để thu vào đội.'],
      ['Mạnh hơn', 'Gom 30 đá mua Kiếm (O · Mua nhanh). Đá còn mua đồ, Ấn Thu, áo mới.'],
      ['Huy hiệu vùng', 'Gặp đủ nghệ sĩ (E nói chuyện) + xong việc vùng → huy hiệu Mx.'],
      ['Qua Đèo', 'Đường Lên Đèo phía Bắc: thắng bạn tập chắn đường để mở đoạn kế.'],
      ['Vùng mới M1 → M9', 'Chín vùng đất, mỗi vùng có Thủ Lĩnh, Khe Nứt có trùm.'],
      ['Cứu Lyron', 'Chuông Lặn (lò M4) · Bản Đồ Vực (thư viện M6) · Đại Pha Lê (15 Leader M9) → lặn dưới cầu tàu Biển tới Hang Ổ Kraken.'],
    ],
  },
  en: {
    title: 'How to play', lead: 'The Seismic loop — every land repeats it, and each new land has tougher monsters.', btn: '📖 How to play', keys: '⌨ Keys', fb: '🎞 Lyron flashback', close: 'Close',
    loop: '↻ New land, tougher monsters — keep fighting, keep growing.', foot: 'Esc close · ? / F1 keys',
    steps: [
      ['Fight monsters', 'Left-click / E (phone: Ⓐ). Send your Quake Beast out (J) to fight with you.'],
      ['Get rewards', 'Each win: XP for you + your beast, Seismic stones, Soul sparks, loot. F picks it all up.'],
      ['Catch wild beasts', 'Beat a wild Quake Beast until it faints → throw a Seal Orb (E) to add it to your team.'],
      ['Grow stronger', 'Save 30 stones for a Sword (O · Quick buy). Stones also buy gear, Seal Orbs, new looks.'],
      ['Land badge', 'Meet the artists (E to talk) + finish the land task → Mx badge.'],
      ['Cross the Pass', 'Pass Road to the north: beat the sparring partner blocking each stretch.'],
      ['New lands M1 → M9', 'Nine lands, each with a Leader beast; Rifts hide bosses.'],
      ['Save Lyron', 'Diving Bell (M4 furnace) · Trench Map (M6 library) · Great Crystal (15 Leaders, M9) → dive under the sea pier to the Kraken\'s Lair.'],
    ],
  },
};
/* icon từng ô (ảnh PixelLab có sẵn; [file, khung vuông cắt từ dải ngang?]) */
const ICONS = [
  [['ui/hud91/act_fight.png']],
  [['ui/items/stone.png'], ['ui/items/soul.png']],
  [['duel/orb/orb_spin.png', 32]],
  [['ui/items/sword.png']],
  [['badges/lv_1.png'], ['ui/zmap/artist.png']],
  [['ui/zmap/exit.png']],
  [['badges/lv_9.png']],
  [['ui/items/divebell.png'], ['ui/items/trenchmap.png'], ['ui/items/greatcrystal.png']],
];
const ST = { ctx: null, el: null, from: null, log: [] };
const L = ctx => STR[ctx && ctx.lang() === 'en' ? 'en' : 'vi'];
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const log = (ev, o) => { ST.log.push({ t: +(performance.now() / 1000).toFixed(1), ev, ...(o || {}) }); if (ST.log.length > 60) ST.log.shift(); };

function css() {
  if (document.getElementById('ht121-css')) return; const s = document.createElement('style'); s.id = 'ht121-css';
  s.textContent = `#ht121{position:fixed;inset:0;z-index:47;display:flex;align-items:center;justify-content:center;background:rgba(8,6,14,.3)}
#ht121 .pk{position:relative;width:min(96vw,760px);max-height:92vh;display:flex;flex-direction:column;box-sizing:border-box;color:#f5ecdc;font:18px VT323,monospace;background:#1a1426;background-clip:padding-box;border:24px solid transparent;border-image:url(${BASE}ui/npick/panel.png) 12 / 24px round;image-rendering:pixelated;padding:0 4px}
#ht121 h3{margin:0 auto 2px;font:bold 24px VT323,monospace;color:#fff4d6;text-align:center;padding:3px 34px 8px;text-shadow:0 2px 0 #5a1010;background:url(${BASE}ui/npick/banner.png) center/100% 100% no-repeat;image-rendering:pixelated}
#ht121 .x{position:absolute;right:-14px;top:-14px;width:30px;height:30px;border:0;background:url(${BASE}ui/hud/close.png) center/100% 100% no-repeat;image-rendering:pixelated;cursor:pointer;touch-action:manipulation}
#ht121 p.ld{margin:0 0 6px;text-align:center;color:#cfc4b4;font-size:17px;line-height:1.05}
#ht121 .gr{display:grid;grid-template-columns:repeat(4,1fr);gap:16px 18px;overflow:auto;min-height:0;flex:1 1 auto;padding:2px 10px 2px 2px;overscroll-behavior:contain;counter-reset:st}
#ht121 .cd{position:relative;display:flex;flex-direction:column;align-items:center;text-align:center;background:#2a1f38;border:8px solid transparent;border-image:url(${BASE}ui/npick/tile.png) 6 / 8px round;background-clip:padding-box;padding:2px 3px 4px;min-width:0}
#ht121 .cd.last{border-image-source:url(${BASE}ui/npick/tile_on.png)}
#ht121 .cd .n{position:absolute;left:-6px;top:-8px;font:bold 16px VT323,monospace;color:#3b1d08;background:#ffd45e;border:2px solid #5a3410;border-radius:3px;line-height:14px;padding:0 3px}
#ht121 .cd .ic{display:flex;gap:2px;align-items:flex-end;justify-content:center;height:34px;margin:2px 0}
#ht121 .cd .ic i{display:block;width:32px;height:32px;background-repeat:no-repeat;image-rendering:pixelated}
#ht121 .cd b{font:bold 19px VT323,monospace;color:#ffd45e;line-height:1}
#ht121 .cd span{font-size:16px;line-height:1.02;color:#e9dcc6}
#ht121 .cd:not(.last)::after{content:'';position:absolute;right:-17px;top:50%;width:0;height:0;margin-top:-6px;border:6px solid transparent;border-left:9px solid #ffd45e;filter:drop-shadow(0 1px 0 #3a1c08)}
#ht121 .lp{margin:8px 0 2px;text-align:center;color:#ffe9b0;font-size:18px}
#ht121 .ft{display:flex;flex-wrap:wrap;gap:8px;align-items:center;justify-content:center;margin:4px 0 2px}
#ht121 .ft .dim{color:#a89a88;font-size:16px}
#ht121 button.b{font:19px VT323,monospace;color:#3b1d08;background:#e8913a;border:12px solid transparent;border-image:url(${BASE}ui/npick/btn.png) 8 / 12px round;background-clip:padding-box;padding:0 8px;cursor:pointer;touch-action:manipulation;image-rendering:pixelated}
@media (max-width:640px){#ht121 .gr{grid-template-columns:repeat(2,1fr);gap:12px 16px}#ht121 .cd:nth-child(2n):not(.last)::after{right:auto;left:50%;top:auto;bottom:-15px;margin:0 0 0 -6px;border:6px solid transparent;border-top:8px solid #ffd45e}}
@media (max-width:520px){#ht121 .pk{border-width:18px;border-image-width:18px}#ht121 h3{font-size:21px}#ht121 .x{right:-10px;top:-10px}#ht121 .cd span{font-size:15px}}`;
  document.head.appendChild(s);
}
function iconHTML(list) {
  return list.map(([f, strip]) => strip ? `<i style="background-image:url(${BASE}${f});background-size:auto 32px;background-position:0 0"></i>` : `<i style="background-image:url(${BASE}${f});background-size:32px 32px"></i>`).join('');
}
function render(ctx) {
  const t = L(ctx), n = t.steps.length, hasFb = !!(ctx.lyronFlash121 && ctx.lyronFlash121.play);
  ST.el.innerHTML = `<div class="pk"><button type="button" class="x" data-a="x" aria-label="${esc(t.close)}"></button><h3>${esc(t.title)}</h3><p class="ld">${esc(t.lead)}</p>
    <div class="gr">${t.steps.map(([h, d], i) => `<div class="cd${i === n - 1 ? ' last' : ''}"><span class="n">${i + 1}</span><div class="ic">${iconHTML(ICONS[i] || [])}</div><b>${esc(h)}</b><span>${esc(d)}</span></div>`).join('')}</div>
    <div class="lp">${esc(t.loop)}</div>
    <div class="ft"><button type="button" class="b" data-a="keys">${esc(t.keys)}</button>${hasFb ? `<button type="button" class="b" data-a="fb">${esc(t.fb)}</button>` : ''}<span class="dim">${esc(t.foot)}</span></div></div>`;
}
function isOpen() { return !!(ST.el && ST.el.isConnected); }
function closeCodex(ctx) { const el = document.getElementById('codex'); if (el) el.hidden = true; if (ctx.S.mode === 'codex') ctx.setMode('play'); }
function open(ctx, from) {
  if (!ctx || !ctx.S || !ctx.S.save || !ctx.S.map) return false;
  if (ctx.S.mode === 'codex') closeCodex(ctx);
  if (ctx.S.mode !== 'play' && ctx.S.mode !== MODE) return false;
  css(); ST.from = from || 'key';
  if (!ST.el) {
    const el = document.createElement('div'); el.id = 'ht121';
    el.addEventListener('pointerdown', e => { e.stopPropagation(); if (e.target === el) { e.preventDefault(); close(ctx); } });
    el.addEventListener('wheel', e => e.stopPropagation(), { passive: true });
    el.addEventListener('click', e => {
      e.stopPropagation(); const b = e.target.closest('[data-a]'); if (!b) return; const C = ST.ctx || ctx;
      if (b.dataset.a === 'x') close(C);
      else if (b.dataset.a === 'keys') { close(C); try { if (C.help121) C.help121.open(); } catch (er) { console.error('howto121 keys', er); } }
      else if (b.dataset.a === 'fb') { close(C); try { if (C.lyronFlash121) C.lyronFlash121.play('howto'); } catch (er) { console.error('howto121 fb', er); } }
    });
    ST.el = el;
  }
  render(ctx); if (!ST.el.isConnected) document.body.appendChild(ST.el);
  if (ctx.S.mode !== MODE) { ctx.setMode(MODE); ctx.registerCloser(MODE, () => close(ctx)); }
  log('open', { from: ST.from }); return true;
}
function close(ctx) { if (ST.el && ST.el.isConnected) ST.el.remove(); if (ctx && ctx.S.mode === MODE) ctx.setMode('play'); log('close'); }

/* nút "Cách chơi" trong Sổ tay (C) — chèn trước tiêu đề Thành tựu, cạnh nút Sổ quái của bestiary120 (không sửa ui.js) */
function codexBtn(ctx) {
  const cx = document.getElementById('codex'); if (!cx || cx.hidden) return;
  let b = document.getElementById('ht121btn'); const t = L(ctx).btn;
  if (!b) {
    const anchor = document.getElementById('c-ach-title') || document.getElementById('c-title'); if (!anchor || !anchor.parentNode) return;
    b = document.createElement('button'); b.id = 'ht121btn'; b.type = 'button'; b.className = 'btn'; b.style.cssText = 'margin:4px 6px 6px 0;display:inline-block';
    b.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); if (ST.ctx) open(ST.ctx, 'codex'); });
    const b120 = document.getElementById('b120btn');
    if (b120 && b120.parentNode === anchor.parentNode) anchor.parentNode.insertBefore(b, b120); else anchor.parentNode.insertBefore(b, anchor);
  }
  if (b.dataset.t !== t) { b.dataset.t = t; b.textContent = t; }   /* QA 09/11: không ghi lại chữ mỗi khung (pxt bọc chữ → khác textContent → nút bị thay giữa lúc bấm, click không ăn) */
}

if (typeof window !== 'undefined' && !window.__ht121bind) {
  window.__ht121bind = true;
  window.addEventListener('keydown', e => {
    const C = ST.ctx; if (!C || !C.S || C.S.mode !== MODE) return;
    e.preventDefault(); e.stopImmediatePropagation();
    if (e.code === 'Escape' || (e.code === 'Enter' && !e.repeat)) close(C);
  }, true);
}

export const howto121 = {
  id: 'howto121',
  always: true,
  onZoneEnter(ctx) {
    ST.ctx = ctx; if (isOpen()) close(ctx);
    ctx.howto121 = { open: from => open(ctx, from), close: () => close(ctx) };
    if (typeof window !== 'undefined') window.__ht121 = { open: from => open(ctx, from), close: () => close(ctx), log: () => ST.log.slice(), state: () => ({ open: isOpen(), mode: ctx.S.mode, from: ST.from, cards: ST.el ? ST.el.querySelectorAll('.cd').length : 0 }) };
  },
  onZoneLeave(ctx) { if (isOpen()) close(ctx); },
  update(dt, ctx) {
    ST.ctx = ctx;
    if (isOpen() && ctx.S.mode !== MODE) { ST.el.remove(); log('lost-mode', { mode: ctx.S.mode }); }
    if (ctx.S.mode === 'codex') { try { codexBtn(ctx); } catch (e) { } }
  },
};
