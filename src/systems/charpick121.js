/* charpick121.js — CHỌN NHÂN VẬT (anh yêu cầu 04/11, sửa lần 2 cùng ngày):
   · Ván mới: trước khi Noxx mở lời, chỉ 2 lựa chọn NAM (thân c0) / NỮ (thân c4) + màu áo cơ bản. Miễn phí.
   · Muốn nhân vật ĐẸP HƠN → gặp NOXX: trong hội thoại Noxx có nút "Tủ đồ Noxx" → bảng mua bằng đá Seismic (túi 'stone'):
     nhân vật SEISMIC (sheet hung_b, đủ clip động tác) giá SEIS_PRICE + 4 kiểu tóc khác (thân c1, c2, c3, c5) giá HAIR_PRICE.
     Đã mua thì đổi qua lại miễn phí ở Noxx.
   · Save CŨ (chơi trước khi có bảng này) đang mặc Seismic → được giữ (owned 'char:seismic'), không mất gì. Cờ save.flags.p121.
   · Khung pixel ui.npick như bảng chọn Chấn Thú (p120). Chữ vi / en.
   Móc test: window.__p121. */
const BASE = 'assets/px/';
export const SEIS_PRICE = 200;   /* giá nhân vật Seismic (đá Seismic) */
export const HAIR_PRICE = 50;    /* giá mỗi kiểu tóc khác ở Noxx */
const HERO = 'hung_b';
const CHARS = [   /* skin / hair trùng gói Làng chars.base → art.js chọn đúng thân c0–c5; price 0 = có sẵn */
  { id: 'c0', skin: '#f6d3b5', hair: '#2b1d14', vi: 'Nam', en: 'Male', price: 0 },
  { id: 'c4', skin: '#e8b48e', hair: '#b23a3a', vi: 'Nữ', en: 'Female', price: 0 },
  { id: 'seis', vi: 'Seismic', en: 'Seismic', price: SEIS_PRICE, hero: HERO },
  { id: 'c1', skin: '#f6d3b5', hair: '#c98b2e', vi: 'Tóc vàng', en: 'Blond', price: HAIR_PRICE },
  { id: 'c2', skin: '#c98b5f', hair: '#1f1f1f', vi: 'Tóc đen', en: 'Black hair', price: HAIR_PRICE },
  { id: 'c3', skin: '#8d5a3b', hair: '#1f1f1f', vi: 'Da nâu', en: 'Dark skin', price: HAIR_PRICE },
  { id: 'c5', skin: '#c98b5f', hair: '#3a4fb2', vi: 'Tóc xanh', en: 'Blue hair', price: HAIR_PRICE }];
const BODIES = CHARS.filter(c => !c.hero);
/* Tủ đồ chỉ BÁN thân đã có đủ clip động tác (gói Làng chars.actions ≥ 20 clip) — kiểu tóc chưa làm động tác thì ẩn, làm xong tự hiện (04/11 anh: đưa lên game 2 nhân vật Nữ + tóc vàng) */
const ready = (ctx, id) => { try { const vp = ctx.ART && ctx.ART.packs && ctx.ART.packs.village, c = vp && (vp.chars || []).find(x => x.file === `chars/${id}.png`); return !!(c && c.actions && Object.keys(c.actions).length >= 20); } catch (e) { return false; } };
const SHIRTS = ['#ffffff', '#e04b4b', '#3d6db5', '#5a9c58', '#ffd45e', '#1f1f1f'];
const STR = {
  vi: { title: 'Chọn nhân vật', lead: 'Nam hay nữ? Muốn nhân vật đẹp hơn thì gặp Noxx để mua bằng đá Seismic.',
    shop: 'Tủ đồ Noxx', leadShop: 'Nhân vật đẹp hơn · mua bằng đá Seismic · đã mua thì đổi lại miễn phí', shopBtn: '👕 Tủ đồ Noxx',
    shirt: 'Áo', have: n => `Bạn có ${n} 🪨`, owned: 'Đã có', free: 'Có sẵn',
    pick: '✓ Chọn', wear: '✓ Mặc', worn: 'Đang mặc', buy: p => `Mua · ${p} 🪨`, close: 'Đóng',
    poor: (p, n) => `Chưa đủ đá Seismic — cần ${p} 🪨 (bạn có ${n}). Đào tinh thể tím, bán đồ cho Thương nhân…`, bought: n => `Đã mua: ${n}!`, changed: 'Đã đổi nhân vật' },
  en: { title: 'Choose your character', lead: 'Male or female? For a cooler character, visit Noxx and buy one with Seismic stones.',
    shop: "Noxx's Wardrobe", leadShop: 'Cooler characters · paid with Seismic stones · switch back for free once bought', shopBtn: "👕 Noxx's Wardrobe",
    shirt: 'Shirt', have: n => `You have ${n} 🪨`, owned: 'Owned', free: 'Free',
    pick: '✓ Choose', wear: '✓ Wear', worn: 'Wearing', buy: p => `Buy · ${p} 🪨`, close: 'Close',
    poor: (p, n) => `Not enough Seismic stones — you need ${p} 🪨 (you have ${n}). Mine purple crystals, sell to the Trader…`, bought: n => `Unlocked: ${n}!`, changed: 'Character changed' }
};
const ST = { ctx: null, open: false, isNew: false, timer: 0, log: [] };
const L = ctx => STR[ctx.lang() === 'vi' ? 'vi' : 'en'];
const lgOf = ctx => (ctx.lang() === 'vi' ? 'vi' : 'en');
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const log = (ev, o) => { ST.log.push({ t: +(performance.now() / 1000).toFixed(1), ev, ...(o || {}) }); if (ST.log.length > 60) ST.log.shift(); };
const flags = ctx => { const sv = ctx.S.save; sv.flags = sv.flags || {}; return sv.flags; };
const ownKey = id => 'char:' + (id === 'seis' ? 'seismic' : id);
const owns = (ctx, id) => { const c = CHARS.find(x => x.id === id); return !!c && (!c.price || (ctx.S.save.owned || []).includes(ownKey(id))); };
const stones = ctx => (ctx.bag ? ctx.bag.count('stone') : (ctx.S.save.inv && ctx.S.save.inv.stone) || 0);
/* người mới cần chọn: ván mới p120 (chưa nghe Noxx) và chưa có cờ p121 */
const needPick = ctx => { const f = flags(ctx); return !f.p121 && !!f.p120new && !f.p120tut && !f.p120done; };
/* tủ đồ Noxx mở được khi: không còn trong phần hướng dẫn người mới */
const shopReady = ctx => { const f = flags(ctx); return !!f.p121 && (!f.p120new || !!f.p120done); };

/* save cũ: lần đầu gặp bảng này → giữ nhân vật đang mặc (Seismic là mặc định cũ; thân tóc đang mặc cũng tính là đã có) */
function migrate(ctx) {
  const sv = ctx.S.save; if (!sv) return; const f = flags(ctx); if (f.p121 || needPick(ctx)) return;
  sv.owned = sv.owned || []; const k = ownKey(bodyOf(sv.outfit)); if (!sv.owned.includes(k)) sv.owned.push(k);
  f.p121 = 1; log('migrate', { k }); ctx.persist();
}
function bodyOf(o) {   /* nhân vật đang mặc: 'seis' hoặc thân gần nhất theo màu */
  if (o && o.hero) return 'seis';
  const hx = h => [1, 3, 5].map(i => parseInt(String(h || '#000000').slice(i, i + 2), 16) || 0), d = (a, b) => { const x = hx(a), y = hx(b); return (x[0] - y[0]) ** 2 + (x[1] - y[1]) ** 2 + (x[2] - y[2]) ** 2; };
  let best = BODIES[0], bd = Infinity; for (const b of BODIES) { const v = d(b.skin, o && o.skin) * 1.5 + d(b.hair, o && o.hair); if (v < bd) { bd = v; best = b; } } return best.id;
}
function outfitFor(ctx, id, shirt) {
  const cur = ctx.S.save.outfit || {};
  if (id === 'seis') return { ...cur, hero: HERO };
  const b = BODIES.find(x => x.id === id) || BODIES[0]; return { ...cur, skin: b.skin, hair: b.hair, shirt: shirt || cur.shirt || '#ffffff', pants: cur.pants || '#2f3b5e', hero: null };
}
function wear(ctx, o) {   /* sửa TẠI CHỖ: art.js nhận diện người chơi bằng c === S.save.outfit */
  const sv = ctx.S.save; if (!sv.outfit) sv.outfit = {}; Object.assign(sv.outfit, o);
  try { ctx.S.player.sheet = ctx.charSheet(sv.outfit); } catch (e) { console.error('p121 sheet', e); }
  ctx.persist();
}

/* ---------- vẽ hình nhân vật (khung 16×20 logic của sheet đi) ---------- */
function drawChar(cv, sheet, dir, fr) {
  const g = cv.getContext('2d'); g.imageSmoothingEnabled = false; g.clearRect(0, 0, cv.width, cv.height); if (!sheet) return;
  try { g.drawImage(sheet, fr * 16, dir * 20, 16, 20, 0, 0, cv.width, cv.height); } catch (e) { }   /* 9 tham số tọa độ logic → shim art.js nhân __hi */
}

function css() {
  if (document.getElementById('p121-css')) return; const s = document.createElement('style'); s.id = 'p121-css';
  s.textContent = `#p121pick{position:fixed;inset:0;z-index:47;display:flex;align-items:center;justify-content:center;background:rgba(8,6,14,.45)}
#p121pick .pk{position:relative;width:min(96vw,620px);max-height:94vh;display:flex;flex-direction:column;box-sizing:border-box;background:#1a1426;color:#f5ecdc;font:20px VT323,monospace;padding:4px 6px;border-radius:12px;border:2px solid #ffd45e;overflow:auto}
#p121pick.nw .pk{width:min(94vw,400px)}#p121pick.nw .pv{display:none}
#p121pick.px .pk{border:24px solid transparent;border-image:var(--np-panel) 12 / 24px round;border-radius:0;background-clip:padding-box;image-rendering:pixelated;padding:0 2px}
#p121pick h3{margin:0 auto 2px;font:bold 25px VT323,monospace;color:#fff4d6;text-align:center;padding:4px 30px 8px;text-shadow:0 2px 0 #5a1010}
#p121pick.px h3{background:var(--np-banner) center/100% 100% no-repeat;image-rendering:pixelated}
#p121pick p.ld{margin:0 0 4px;text-align:center;color:#cfc4b4;font-size:17px;line-height:1}
#p121pick .top{display:flex;gap:8px;align-items:stretch}
#p121pick .pv{flex:0 0 auto;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#120e1c;border:2px solid #4a3c5c;padding:4px 6px}
#p121pick.px .pv{border:8px solid transparent;border-image:var(--np-tile) 6 / 8px round;background-clip:padding-box}
#p121pick .pv canvas{width:96px;height:120px;image-rendering:pixelated}
#p121pick .pv b{font-size:19px;color:#ffe9b0;line-height:1;text-align:center;max-width:120px}
#p121pick .gr{flex:1 1 auto;display:grid;grid-template-columns:repeat(auto-fill,minmax(84px,1fr));gap:4px;align-content:start;min-width:0}
#p121pick.nw .gr{grid-template-columns:repeat(2,1fr);align-content:center}
#p121pick .cd{position:relative;display:flex;flex-direction:column;align-items:center;background:#2a1f38;border:2px solid #4a3c5c;border-radius:8px;padding:2px 2px 4px;color:#f5ecdc;font:16px VT323,monospace;cursor:pointer;touch-action:manipulation;min-width:0}
#p121pick.px .cd{border:8px solid transparent;border-image:var(--np-tile) 6 / 8px round;background-clip:padding-box;border-radius:0;padding:0 1px 2px}
#p121pick .cd.on{background:#3a2c4c;border-color:#ffd45e}#p121pick.px .cd.on{border-image-source:var(--np-tile-on)}
#p121pick .cd canvas{width:40px;height:50px;image-rendering:pixelated}
#p121pick.nw .cd canvas{width:96px;height:120px}
#p121pick .cd b{font-size:15px;line-height:1;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}
#p121pick.nw .cd b{font-size:20px}
#p121pick .cd.se b{color:#ffd45e}
#p121pick .cd .pr{font-size:14px;line-height:14px;border-radius:4px;padding:0 3px;background:#ffd45e;color:#2a1608;margin-top:1px}
#p121pick .cd .pr.ok{background:#5a9c58;color:#fff}
#p121pick .cd.lk canvas{opacity:.55}
#p121pick .sh{display:flex;align-items:center;justify-content:center;gap:5px;margin:6px 0 0;flex-wrap:wrap}
#p121pick .sh button{width:22px;height:22px;border:2px solid #2a1f38;border-radius:4px;cursor:pointer;padding:0;touch-action:manipulation}
#p121pick .sh button.on{outline:3px solid #ffd45e;outline-offset:1px}
#p121pick .sh.off{display:none}
#p121pick .note{min-height:17px;text-align:center;color:#ffb38a;font-size:16px;line-height:1;margin-top:4px}
#p121pick .ft{display:flex;flex-wrap:wrap;gap:8px;align-items:center;justify-content:center;margin-top:4px}
#p121pick .ft .st{color:#cfc4b4;font-size:18px}
#p121pick button.b{font:22px VT323,monospace;padding:2px 16px;border-radius:9px;border:2px solid #ffd45e;background:#e8913a;color:#3b1d08;cursor:pointer;touch-action:manipulation}
#p121pick.px button.b{border:12px solid transparent;border-image:var(--np-btn) 8 / 12px round;background-clip:padding-box;border-radius:0;padding:0 10px;image-rendering:pixelated}
#p121pick button.b.dim{opacity:.6}
#p121pick button.lt{font:18px VT323,monospace;background:none;border:none;color:#cfc4b4;cursor:pointer;text-decoration:underline;touch-action:manipulation}
#p121-dbtn{position:absolute;right:14px;top:-40px;font:20px VT323,monospace;padding:0 12px;color:#3b1d08;background:#e8913a;border:2px solid #ffd45e;border-radius:8px;cursor:pointer;pointer-events:auto;touch-action:manipulation;z-index:2}
#p121-dbtn.px{border:12px solid transparent;border-image:var(--np-btn) 8 / 12px round;background-clip:padding-box;border-radius:0;padding:0 8px;image-rendering:pixelated;top:-46px}
@media (max-width:520px){#p121pick:not(.nw) .top{flex-direction:column;align-items:center}#p121pick:not(.nw) .gr{width:100%;grid-template-columns:repeat(4,1fr)}#p121pick .pv canvas{width:64px;height:80px}#p121pick h3{font-size:22px}}`;
  document.head.appendChild(s);
}
const npVars = (ctx, el) => {
  const U = (ctx.ART && ctx.ART.on && ctx.ART.man && ctx.ART.man.ui) || {}, NP = U.npick || null; if (!NP) return false;
  el.classList.add('px'); for (const k of ['panel', 'tile', 'tile_on', 'btn', 'banner']) if (NP[k]) el.style.setProperty('--np-' + k.replace('_', '-'), `url(${BASE}${NP[k]})`); return true;
};

function close(ctx) {
  const el = document.getElementById('p121pick'); if (el) el.remove(); if (ST.timer) clearInterval(ST.timer); ST.timer = 0;
  const wasOpen = ST.open; ST.open = false; if (wasOpen && ctx.S.mode === 'p121pick') ctx.setMode('play');
}
/* isNew: bảng Nam / Nữ lúc vào game · không isNew: Tủ đồ Noxx (mọi nhân vật, mua bằng đá) */
function open(ctx, isNew) {
  if (!ctx.S.save || !ctx.S.player) return; css(); close(ctx); migrate(ctx);
  const t = L(ctx), lg = lgOf(ctx), o0 = ctx.S.save.outfit || {}, list = isNew ? CHARS.filter(c => !c.price) : CHARS.filter(c => !c.price || c.hero || ready(ctx, c.id));
  let sel = isNew ? list[0].id : bodyOf(o0), shirt = isNew ? SHIRTS[0] : (o0.shirt || SHIRTS[0]);
  ST.isNew = !!isNew;
  const el = document.createElement('div'); el.id = 'p121pick'; if (isNew) el.classList.add('nw'); npVars(ctx, el);
  const cards = list.map(c => `<button type="button" class="cd${c.hero ? ' se' : ''}" data-id="${c.id}"><canvas width="32" height="40"></canvas><b>${esc(c[lg])}</b>${isNew ? '' : '<span class="pr"></span>'}</button>`).join('');
  el.innerHTML = `<div class="pk"><h3>${esc(isNew ? t.title : t.shop)}</h3><p class="ld">${esc(isNew ? t.lead : t.leadShop)}</p>
    <div class="top"><div class="pv"><canvas width="32" height="40"></canvas><b id="p121-nm"></b></div><div class="gr">${cards}</div></div>
    <div class="sh" id="p121-sh"><span>${esc(t.shirt)}:</span>${SHIRTS.map(c => `<button type="button" data-shirt="${c}" style="background:${c}" aria-label="${c}"></button>`).join('')}</div>
    <div class="note" id="p121-note"></div>
    <div class="ft">${isNew ? '' : '<span class="st" id="p121-st"></span>'}<button type="button" class="b" data-a="ok"></button>${isNew ? '' : `<button type="button" class="lt" data-a="no">${esc(t.close)}</button>`}</div></div>`;
  document.body.appendChild(el); ST.open = true;
  const sheetFor = id => {   /* art.js chỉ dùng bộ Làng khi c === S.save.outfit → tạm gán rồi trả lại (đồng bộ) */
    const sv = ctx.S.save, keep = sv.outfit, cand = outfitFor(ctx, id, shirt);
    try { sv.outfit = cand; return ctx.charSheet(cand); } catch (e) { return null; } finally { sv.outfit = keep; }
  };
  const pv = el.querySelector('.pv canvas'), nm = el.querySelector('#p121-nm'), note = el.querySelector('#p121-note'), okB = el.querySelector('button[data-a="ok"]'), stE = el.querySelector('#p121-st'), shE = el.querySelector('#p121-sh');
  const C = id => CHARS.find(c => c.id === id);
  const thumbs = () => { for (const c of el.querySelectorAll('.cd')) drawChar(c.querySelector('canvas'), sheetFor(c.dataset.id), 0, 0); };
  const render = () => {
    const c = C(sel), have = owns(ctx, sel), n = stones(ctx), cur = bodyOf(ctx.S.save.outfit);
    for (const b of el.querySelectorAll('.cd')) {
      const id = b.dataset.id, h = owns(ctx, id), ci = C(id); b.classList.toggle('on', id === sel); b.classList.toggle('lk', !h);
      const pr = b.querySelector('.pr'); if (pr) { pr.textContent = !ci.price ? t.free : h ? t.owned : `${ci.price} 🪨`; pr.classList.toggle('ok', h); }
    }
    for (const b of shE.querySelectorAll('button')) b.classList.toggle('on', b.dataset.shirt === shirt);
    shE.classList.toggle('off', !!c.hero);
    nm.textContent = c[lg]; if (stE) stE.textContent = t.have(n);
    note.textContent = !have && n < c.price ? t.poor(c.price, n) : '';
    if (!have) { okB.textContent = t.buy(c.price); okB.classList.toggle('dim', n < c.price); }
    else { okB.classList.remove('dim'); okB.textContent = isNew ? t.pick : (cur === sel && (c.hero || (ctx.S.save.outfit || {}).shirt === shirt) ? t.worn : t.wear); }
  };
  let fi = 0; const DIRS = [0, 1, 3, 2], SEQ = [0, 1, 0, 2];   /* xoay S → W → N → E, bước đi 3 khung */
  const anim = () => { fi++; const cv = isNew ? el.querySelector(`.cd[data-id="${sel}"] canvas`) : pv; if (cv) drawChar(cv, sheetFor(sel), DIRS[Math.floor(fi / 8) % 4], SEQ[fi % 4]); };   /* bảng Nam / Nữ: không có ô xem trước riêng — thẻ đang chọn tự xoay */
  ST.timer = setInterval(anim, 160); thumbs(); render(); anim();
  const confirm = () => {
    const c = C(sel);
    if (!owns(ctx, sel)) {
      const n = stones(ctx); if (n < c.price) { ctx.toast(t.poor(c.price, n)); try { ctx.sfx && ctx.sfx('fail'); } catch (e) { } render(); return; }
      ctx.bag.remove('stone', c.price); const sv = ctx.S.save; sv.owned = sv.owned || []; sv.owned.push(ownKey(sel));
      wear(ctx, outfitFor(ctx, sel, shirt)); ctx.toast(t.bought(c[lg]), true); try { ctx.sfx && ctx.sfx('pickup'); } catch (e) { } log('buy', { id: sel, left: stones(ctx) });
      render(); return;
    }
    wear(ctx, outfitFor(ctx, sel, shirt)); log(isNew ? 'pick' : 'wear', { id: sel, shirt });
    if (isNew) { flags(ctx).p121 = 1; ctx.persist(); close(ctx); return; }
    ctx.toast(t.changed); render();
  };
  el.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter') confirm(); if (e.key === 'Escape') { if (isNew) confirm(); else close(ctx); } });
  el.addEventListener('click', e => {
    const c = e.target.closest('.cd'); if (c) { sel = c.dataset.id; thumbs(); render(); anim(); return; }
    const s = e.target.closest('button[data-shirt]'); if (s) { shirt = s.dataset.shirt; thumbs(); render(); anim(); return; }
    const b = e.target.closest('button[data-a]'); if (!b) return;
    if (b.dataset.a === 'no') { close(ctx); return; }
    confirm();
  });
  ctx.setMode('p121pick'); ctx.registerCloser('p121pick', () => { if (ST.isNew) confirm(); else close(ctx); });
  log('open', { isNew: !!isNew, sel });
}

/* nút "Tủ đồ Noxx" gắn trên khung hội thoại khi đang nói chuyện với Noxx (không chen vào lời thoại / cốt truyện) */
function dlgBtn(ctx) {
  const d = document.getElementById('dialog'), S = ctx.S;
  const want = !!(d && !d.hidden && S.mode === 'dialog' && S.guide && S.talking === S.guide && shopReady(ctx));
  let b = document.getElementById('p121-dbtn');
  if (!want) { if (b) b.remove(); return; }
  if (b) return; const dl = d.querySelector('.dlg'); if (!dl) return; css();
  b = document.createElement('button'); b.type = 'button'; b.id = 'p121-dbtn'; b.textContent = L(ctx).shopBtn;
  if (npVars(ctx, b)) b.classList.add('px');
  const go = e => { e.preventDefault(); e.stopPropagation(); b.remove(); try { ctx.closeDialog(); } catch (er) { } ctx.S.talking = null; ctx.setMode('play'); open(ctx, false); };
  b.addEventListener('pointerdown', go); b.addEventListener('click', e => e.stopPropagation());
  if (getComputedStyle(dl).position === 'static') dl.style.position = 'relative';
  dl.appendChild(b); log('dbtn');
}

export const charpick121 = {
  id: 'charpick121',
  always: true,
  onZoneEnter(ctx) {
    ST.ctx = ctx; if (ST.open && !ST.isNew) close(ctx);
    migrate(ctx);
    if (typeof window !== 'undefined') window.__p121 = {
      state: () => ({ open: ST.open, isNew: ST.isNew, need: needPick(ctx), flag: !!flags(ctx).p121, shopReady: shopReady(ctx), owned: CHARS.filter(c => c.price && owns(ctx, c.id)).map(c => c.id), stones: stones(ctx),
        outfit: { ...(ctx.S.save.outfit || {}) }, body: bodyOf(ctx.S.save.outfit), mode: ctx.S.mode, cards: [...document.querySelectorAll('#p121pick .cd')].map(b => b.dataset.id), dbtn: !!document.getElementById('p121-dbtn') }),
      open: () => open(ctx, false), close: () => close(ctx), log: () => ST.log.slice(), chars: () => CHARS.map(c => ({ id: c.id, price: c.price })) };
  },
  update(dt, ctx) {
    if (!ctx.S.save) return;
    if (!ST.open && ctx.S.mode === 'play' && needPick(ctx)) open(ctx, true);
    dlgBtn(ctx);
  }
};
