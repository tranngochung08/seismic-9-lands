/* noxx120.js — plan-118 §8 (anh chốt 03/11): NGƯỜI CHƠI MỚI gặp NOXX ngay ở Làng mới.
   · Ván mới (main.js gọi fresh120): vào thẳng Làng, save.flags.p120new = 1, story bỏ đoạn Biển (như promo.js). Save cũ KHÔNG có cờ → mọi thứ như cũ.
   · Vào Làng khi chưa chọn thú: đặt người chơi CẠNH NOXX, Noxx tự mở lời (hội thoại pixel ui.dialog, vi/en): hướng dẫn ngắn → bảng CHỌN CHẤN THÚ
     (mọi loài gốc có sprite đấu, ROCKY đứng đầu; khung pixel ui.npick). Chọn 1 con → đội (chanthu ensure/team), +3 Ấn Thu như starter cũ.
   · Bảng "Bạn là ai?" (nations) mở SAU hội thoại cuối (main.js bỏ qua lúc vào game khi p120new chưa xong).
   · Sau khi chọn: đánh dấu nhỏ kiểu Saiyan (4 góc + icon + tên nhỏ, TĨNH) tới bãi quái gần nhất (vùng 'south' Đồng Cỏ Bến Cảng, quái Lv2–4 của farm106)
     + ghim bản đồ (M). Tới nơi thì tắt dấu. XP Chấn Thú do farm106/petlv sẵn có (không viết hệ mới).
   Móc test: window.__p120. */
import { SPECIES, SPECIES_EN, TYPE_COLOR, TYPE_NAME, TYPE_EN } from './duel-data.js';
import { regionAt } from '../village88.js';
import { T } from '../gfx.js';

const BASE = 'assets/px/';
const START_LV = 1, GIFT = 3, TEAM_MAX = 6, FARM_RID = 'south';
const STR = {
  vi: {
    tut: [
      'Chào bạn, mình là Noxx — CM của Seismic. Đây là Làng Xuất Phát. Trước khi lên đường, mình chỉ nhanh vài điều nhé.',
      'ĐI: phím WASD / mũi tên, hoặc bấm chuột vào chỗ muốn tới. Điện thoại: cần gạt bên trái.',
      'ĐÁNH: bấm chuột trái vào quái, hoặc E / Space khi đứng sát. Điện thoại: nút Ⓐ.',
      'KI: thanh Ki đầy dần khi đánh. Shift = lộn né, K hoặc chuột phải = lướt Ki. Chấn Thú đủ sức sẽ tự tung chiêu.',
      'CHẤN THÚ: J để thả ra / thu về (hoặc bấm ô chân dung). Thả ra nó đánh cùng bạn — hạ quái là nó nhận XP và lên cấp.',
      'BẢN ĐỒ: M mở bản đồ vùng. Đường Lên Đèo phía Bắc dẫn tới chín vùng đất M1–M9.',
      'Giờ chọn một Chấn Thú làm bạn đồng hành nhé! Con nào cũng được — Rocky là bạn thân của mình đấy.'],
    again: 'Chọn Chấn Thú đồng hành chưa? Con nào cũng được.',
    done: (n, r) => [`Tuyệt! ${n} đã vào đội của bạn. Mình tặng thêm 3 Ấn Thu để bắt thú hoang.`, `Bãi quái gần nhất là ${r} — ngay phía Nam quảng trường, mình đã đánh dấu trên đường và trên bản đồ (M).`, `Tới đó bấm J thả ${n} ra, cùng đánh quái để nó lên cấp. Trước khi đi, cho mình biết tên bạn nhé!`],
    doneNoName: (n, r) => [`Tuyệt! ${n} đã vào đội của bạn. Mình tặng thêm 3 Ấn Thu để bắt thú hoang.`, `Bãi quái gần nhất là ${r} — ngay phía Nam quảng trường, mình đã đánh dấu trên đường và trên bản đồ (M).`, `Tới đó bấm J thả ${n} ra, cùng đánh quái để nó lên cấp. Đi thôi!`],
    farmAgain: r => `Bãi quái ở ${r}, phía Nam quảng trường — theo dấu vàng nhé. Nhớ bấm J thả Chấn Thú ra.`,
    pickT: 'Chọn Chấn Thú đồng hành', pickLead: n => `${n} loài · chọn 1 con, đặt tên được (đổi lại sau ở bảng Đội)`, name: 'Tên', ok: '✓ Chọn', later: 'Để sau',
    got: (n, k) => `${n} đã về đội! Nhận ${k} Ấn Thu · J để thả ra`, farm: 'Bãi farm', farmName: 'Đồng Cỏ Bến Cảng', arrive: 'Tới bãi quái — bấm J thả Chấn Thú, hạ quái để lên cấp!',
    pinNoxx: 'Noxx — chọn Chấn Thú', pinFarm: 'Bãi farm (quái Lv2–4)', lv: 'Lv', size: { xs: 'Tí', s: 'Nhỏ', m: 'Vừa', l: 'To' } },
  en: {
    tut: [
      "Hi, I'm Noxx — community manager of Seismic. This is Harbor Village. Before you head out, a few quick tips.",
      'MOVE: WASD / arrow keys, or click where you want to go. Phone: the stick on the left.',
      'FIGHT: left-click a monster, or E / Space when you stand next to it. Phone: the Ⓐ button.',
      'KI: your Ki bar fills as you fight. Shift = dodge roll, K or right-click = Ki dash. Your Quake Beast casts its moves on its own.',
      'QUAKE BEASTS: J sends yours out / calls it back (or tap its portrait). Out in the field it fights with you — every monster you beat gives it XP.',
      'MAP: M opens the area map. The Pass Road to the north leads to the nine lands, M1–M9.',
      'Now pick a Quake Beast to travel with! Any one you like — Rocky is my best buddy, by the way.'],
    again: 'Ready to pick your partner? Any beast you like.',
    done: (n, r) => [`Great! ${n} joined your team. Here are 3 Seal Stones for catching wild beasts.`, `The closest monster field is ${r} — just south of the square. I marked it on the ground and on your map (M).`, `Press J there to send ${n} out and fight together so it levels up. Oh — before you go, tell me your name!`],
    doneNoName: (n, r) => [`Great! ${n} joined your team. Here are 3 Seal Stones for catching wild beasts.`, `The closest monster field is ${r} — just south of the square. I marked it on the ground and on your map (M).`, `Press J there to send ${n} out and fight together so it levels up. Off you go!`],
    farmAgain: r => `The monster field is ${r}, south of the square — follow the yellow marker. Remember: J sends your beast out.`,
    pickT: 'Choose your partner', pickLead: n => `${n} species · pick one and name it (rename later in Team)`, name: 'Name', ok: '✓ Choose', later: 'Later',
    got: (n, k) => `${n} joined your team! Got ${k} Seal Stones · J to send it out`, farm: 'Farm field', farmName: 'Harbor Meadow', arrive: 'Monster field reached — press J to send your beast out and level it up!',
    pinNoxx: 'Noxx — pick a Quake Beast', pinFarm: 'Farm field (monsters Lv2–4)', lv: 'Lv', size: { xs: 'Tiny', s: 'Small', m: 'Medium', l: 'Large' } },
};
const ST = { ctx: null, greetT: -1, greeted: false, panel: false, spr: null, sprP: null, img: {}, thumbs: new Map(), log: [] };
const L = ctx => STR[ctx.lang() === 'en' ? 'en' : 'vi'];
const en = ctx => ctx.lang() === 'en';
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const spN = (ctx, sp) => (en(ctx) && SPECIES_EN[sp]) || (SPECIES[sp] ? SPECIES[sp].name : sp);
const flags = ctx => { const sv = ctx.S.save; if (!sv) return {}; sv.flags = sv.flags || {}; return sv.flags; };
const isNew = ctx => !!flags(ctx).p120new;
const pending = ctx => isNew(ctx) && !flags(ctx).p120done;
const log = (ev, o) => { ST.log.push({ t: +(performance.now() / 1000).toFixed(1), ev, ...(o || {}) }); if (ST.log.length > 80) ST.log.shift(); };

/* ván mới (main.js #t-play): vào thẳng Làng, bỏ đoạn mở đầu ở Biển (như promo.js) */
export function fresh120(sv) {
  sv.zone = 'village'; sv.entry = 'default';
  sv.story = { ...(sv.story || {}), act: 2, step: 127, seaDone: true, keepsake: true, flashback: false, guideStoryTold: true, path: 'noxx' };   /* như presets STORY: không băng 'Noxx trao khăn Lyron' (cốt truyện Biển người mới không đi qua) */
  sv.flags = { ...(sv.flags || {}), p120new: 1 };
  return sv;
}

/* ---------- danh sách loài: dạng gốc có sprite đấu, Rocky đầu ---------- */
function loadSpr() { if (ST.sprP) return ST.sprP; ST.sprP = fetch(BASE + 'linhduel/duel_sprites.json').then(r => r.json()).then(j => fetch(BASE + 'chanthu/elyziuma/ely.json').then(r => r.json()).then(m => { if (m && m.idle && !j.elyziuma) j.elyziuma = { idle: m.idle }; }).catch(() => { }).then(() => { ST.spr = j; }))   /* c15-elyz: Elyziuma chưa có sprite trận → dùng ảnh đi theo cho ô chọn */.catch(() => { ST.sprP = null; }); return ST.sprP; }
function speciesList() {
  const J = ST.spr || {}, evoT = new Set();
  for (const k of Object.keys(SPECIES)) { const s = SPECIES[k]; if (s.evo) evoT.add(s.evo); }
  const out = Object.keys(SPECIES).filter(k => { const s = SPECIES[k]; return !evoT.has(k) && (!s.secret || k === 'elyziuma') && J[k] && J[k].idle && k !== 'rocky';   /* c15-elyz: anh cho Elyziuma vào bảng chọn */ });
  return (SPECIES.rocky && J.rocky && J.rocky.idle ? ['rocky'] : []).concat(out);
}
function img(src) { let i = ST.img[src]; if (!i) { i = new Image(); i.src = BASE + src; ST.img[src] = i; } return i; }
function thumb(sp, cv) {   /* khung 0 hướng nam của clip idle, cắt sát hình rồi vẽ nearest vừa ô 56 px */
  const c = ST.spr && ST.spr[sp] && ST.spr[sp].idle; if (!c) return; const im = img(c.file);
  const go = () => {
    try {
      let r = (c.rows || []).indexOf('south'); if (r < 0) r = 0;
      const t = document.createElement('canvas'); t.width = c.cw; t.height = c.ch; const x = t.getContext('2d'); x.drawImage(im, 0, r * c.ch, c.cw, c.ch, 0, 0, c.cw, c.ch);
      const d = x.getImageData(0, 0, c.cw, c.ch).data; let x0 = c.cw, y0 = c.ch, x1 = -1, y1 = -1;
      for (let y = 0; y < c.ch; y++) for (let xx = 0; xx < c.cw; xx++) if (d[(y * c.cw + xx) * 4 + 3] > 20) { if (xx < x0) x0 = xx; if (xx > x1) x1 = xx; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      if (x1 < 0) return; const bw = x1 - x0 + 1, bh = y1 - y0 + 1, W = cv.width, H = cv.height;
      let k = Math.min((W - 4) / bw, (H - 4) / bh); if (k >= 1) k = Math.floor(k);
      const g = cv.getContext('2d'); g.imageSmoothingEnabled = false; g.clearRect(0, 0, W, H);
      const dw = Math.round(bw * k), dh = Math.round(bh * k); g.drawImage(t, x0, y0, bw, bh, Math.round((W - dw) / 2), H - 2 - dh, dw, dh);
    } catch (e) { }
  };
  if (im.complete && im.naturalWidth) go(); else im.addEventListener('load', go, { once: true });
}

/* ---------- bảng chọn (khung pixel ui.npick) ---------- */
function css() {
  if (document.getElementById('p120-css')) return; const s = document.createElement('style'); s.id = 'p120-css';
  s.textContent = `#p120pick{position:fixed;inset:0;z-index:46;display:flex;align-items:center;justify-content:center;background:rgba(8,6,14,.35)}
#p120pick .pk{position:relative;width:min(96vw,660px);max-height:92vh;display:flex;flex-direction:column;box-sizing:border-box;background:#1a1426;color:#f5ecdc;font:20px VT323,monospace;padding:4px 6px;border-radius:12px;border:2px solid #ffd45e}
#p120pick.px .pk{background:#1a1426;background-clip:padding-box;border:24px solid transparent;border-image:var(--np-panel) 12 / 24px round;border-radius:0;image-rendering:pixelated;padding:0 2px}
#p120pick h3{margin:0 auto 2px;font:bold 25px VT323,monospace;color:#fff4d6;text-align:center;padding:4px 30px 8px;text-shadow:0 2px 0 #5a1010}
#p120pick.px h3{background:var(--np-banner) center/100% 100% no-repeat;image-rendering:pixelated}
#p120pick p.ld{margin:0 0 6px;text-align:center;color:#cfc4b4;font-size:17px;line-height:1}
#p120pick .gr{display:grid;grid-template-columns:repeat(auto-fill,minmax(92px,1fr));gap:4px;overflow:auto;min-height:0;flex:1 1 auto;padding:2px;overscroll-behavior:contain}
#p120pick .cd{display:flex;flex-direction:column;align-items:center;gap:0;background:#2a1f38;border:2px solid #4a3c5c;border-radius:8px;padding:2px 2px 4px;color:#f5ecdc;font:17px VT323,monospace;cursor:pointer;touch-action:manipulation;min-width:0}
#p120pick.px .cd{border:8px solid transparent;border-image:var(--np-tile) 6 / 8px round;background-clip:padding-box;border-radius:0;padding:0 1px 2px}
#p120pick .cd.on{background:#3a2c4c;border-color:#ffd45e}#p120pick.px .cd.on{border-image-source:var(--np-tile-on)}
#p120pick .cd canvas{width:56px;height:56px;image-rendering:pixelated}
#p120pick .cd b{font-size:17px;line-height:1;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}
#p120pick .cd.rk b{color:#ffd45e}
#p120pick .ch{display:inline-flex;align-items:center;gap:2px;border-radius:5px;padding:0 4px;color:#1a1420;font-size:15px;line-height:16px;margin-top:1px}#p120pick .ch img{width:12px;height:12px;image-rendering:pixelated}
#p120pick .ft{display:flex;flex-wrap:wrap;gap:6px;align-items:center;justify-content:center;margin-top:6px}
#p120pick .sel{flex:1 1 100%;text-align:center;color:#ffe9b0;font-size:19px;line-height:1}
#p120pick input{font:20px VT323,monospace;width:150px;padding:1px 6px;border-radius:6px;border:2px solid #6a5a7c;background:#f3e6c6;color:#3b2412}
#p120pick.px input{border:8px solid transparent;border-image:var(--np-input) 4 / 8px round;background-clip:padding-box;border-radius:0;padding:0 4px}
#p120pick button.b{font:22px VT323,monospace;padding:2px 16px;border-radius:9px;border:2px solid #ffd45e;background:#e8913a;color:#3b1d08;cursor:pointer;touch-action:manipulation}
#p120pick.px button.b{border:12px solid transparent;border-image:var(--np-btn) 8 / 12px round;background-clip:padding-box;border-radius:0;padding:0 10px;image-rendering:pixelated}
#p120pick button.lt{font:18px VT323,monospace;background:none;border:none;color:#cfc4b4;cursor:pointer;text-decoration:underline;touch-action:manipulation}
@media (max-width:520px){#p120pick .gr{grid-template-columns:repeat(auto-fill,minmax(78px,1fr))}#p120pick .cd canvas{width:48px;height:48px}#p120pick h3{font-size:22px}}`;
  document.head.appendChild(s);
}
function chip(ctx, sp) { const t = (SPECIES[sp].types || ['chan'])[0]; return `<span class="ch" style="background:${TYPE_COLOR[t] || '#aaa'}"><img src="${BASE}linhduel/ui/icon_${t}.png" alt="">${esc((en(ctx) ? TYPE_EN : TYPE_NAME)[t] || t)}</span>`; }
function closePick(ctx) { const el = document.getElementById('p120pick'); if (el) el.remove(); ST.panel = false; if (ctx.S.mode === 'p120pick') ctx.setMode('play'); }
function openPick(ctx) {
  loadSpr().then(() => openPick0(ctx));
}
function openPick0(ctx) {
  if (!pending(ctx)) return; css(); closePick(ctx);
  const t = L(ctx), list = speciesList(); if (!list.length) return; let pick = list[0], typed = false;
  const el = document.createElement('div'); el.id = 'p120pick';
  const U = (ctx.ART && ctx.ART.on && ctx.ART.man && ctx.ART.man.ui) || {}, NP = U.npick || null;
  if (NP) { el.classList.add('px'); for (const k of ['panel', 'tile', 'tile_on', 'input', 'btn', 'banner']) if (NP[k]) el.style.setProperty('--np-' + k.replace('_', '-'), `url(${BASE}${NP[k]})`); }
  const sz = sp => t.size[SPECIES[sp].size || 'm'] || '';
  el.innerHTML = `<div class="pk"><h3>${esc(t.pickT)}</h3><p class="ld">${esc(t.pickLead(list.length))}</p><div class="gr">${list.map(sp => `<button type="button" class="cd${sp === pick ? ' on' : ''}${sp === 'rocky' ? ' rk' : ''}" data-sp="${sp}"><canvas width="56" height="56"></canvas><b>${esc(spN(ctx, sp))}</b>${chip(ctx, sp)}</button>`).join('')}</div>
    <div class="ft"><div class="sel" id="p120-sel"></div><label>${esc(t.name)}: <input id="p120-name" maxlength="14" autocomplete="off"></label><button type="button" class="b" data-a="ok">${esc(t.ok)}</button><button type="button" class="lt" data-a="no">${esc(t.later)}</button></div></div>`;
  document.body.appendChild(el); ST.panel = true;
  for (const b of el.querySelectorAll('.cd')) thumb(b.dataset.sp, b.querySelector('canvas'));
  const inp = el.querySelector('#p120-name'), sel = el.querySelector('#p120-sel');
  const show = () => { sel.textContent = `${spN(ctx, pick)} · ${(en(ctx) ? TYPE_EN : TYPE_NAME)[(SPECIES[pick].types || [])[0]] || ''} · ${sz(pick)} · ${t.lv}${START_LV}`; if (!typed) inp.value = spN(ctx, pick); };
  show();
  inp.oninput = () => { typed = inp.value.trim() !== '' && inp.value.trim() !== spN(ctx, pick); };
  el.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter') { choose(ctx, pick, inp.value); } if (e.key === 'Escape') closePick(ctx); });
  el.addEventListener('click', e => {
    const c = e.target.closest('.cd'); if (c) { pick = c.dataset.sp; for (const b of el.querySelectorAll('.cd')) b.classList.toggle('on', b === c); show(); return; }
    const b = e.target.closest('button[data-a]'); if (!b) return;
    if (b.dataset.a === 'no') { closePick(ctx); return; }
    choose(ctx, pick, inp.value);
  });
  ctx.setMode('p120pick'); ctx.registerCloser('p120pick', () => closePick(ctx)); log('pick_open', { n: list.length, first: list[0] });
}

/* ---------- chọn → đội ---------- */
function choose(ctx, sp, name) {
  if (!pending(ctx) || !SPECIES[sp] || !ctx.chanthu || !ctx.chanthu.ensure) return false;
  const d = ctx.chanthu.ensure(); if (d.team.length && d.starter) { flags(ctx).p120done = 1; closePick(ctx); return false; }
  const nm = String(name || '').trim().slice(0, 14) || spN(ctx, sp), m = { id: d.nextId++, sp, lv: START_LV, name: nm };
  d.starter = sp; if (d.team.length < TEAM_MAX) d.team.unshift(m); else d.box.push(m); d.anThu = (d.anThu | 0) + GIFT;
  const f = flags(ctx); f.p120done = 1; f.p120sp = sp; f.p120t = Date.now(); ctx.persist(); closePick(ctx); log('chosen', { sp, nm });
  try { ctx.toast(L(ctx).got(nm, GIFT), true); } catch (e) { } try { ctx.duelSfx && ctx.duelSfx('orb_pop'); } catch (e) { }
  farmTarget(ctx);
  const t = L(ctx), needName = ctx.S.save.nation === undefined && !!ctx.openNationPicker;
  ctx.S.talking = ctx.S.guide || null; ctx.setMode('dialog');
  ctx.openDialog({ guide: true, pages: (needName ? t.done : t.doneNoName)(nm, t.farmName), onClose: () => {
    ctx.S.talking = null; ctx.setMode('play'); ctx.persist();
    if (needName) { ctx.setMode('pause'); ctx.openNationPicker(() => { ctx.setMode('play'); ctx.persist(); log('named'); }); }
  } });
  return true;
}

/* ---------- Noxx nói (main.js gọi trước hội thoại guide thường) ---------- */
function talk(ctx) {
  if (!isNew(ctx)) return false;
  const t = L(ctx), f = flags(ctx), g = ctx.S.guide;
  if (f.p120done) {
    if (f.p120arr) return false;   /* đã tới bãi farm → Noxx nói như cũ */
    ctx.S.talking = g; ctx.setMode('dialog'); ctx.openDialog({ guide: true, pages: [t.farmAgain(t.farmName)], onClose: () => { ctx.S.talking = null; ctx.setMode('play'); } }); return true;
  }
  ST.greeted = true; ctx.S.save.seenGuide = true; loadSpr();
  const pages = f.p120tut ? [t.again] : t.tut.slice();
  ctx.S.talking = g; ctx.setMode('dialog'); log('talk', { tut: !f.p120tut });
  ctx.openDialog({ guide: true, pages, onClose: () => { ctx.S.talking = null; f.p120tut = 1; ctx.persist(); ctx.setMode('play'); openPick(ctx); } });
  return true;
}

/* ---------- vị trí: cạnh Noxx / bãi farm ---------- */
const walk = (ctx, x, y) => { const m = ctx.S.map, tx = Math.floor(x / 16), ty = Math.floor(y / 16); if (tx < 1 || ty < 1 || tx >= m.w - 1 || ty >= m.h - 1 || ctx.isSolid(m, tx, ty)) return false; const gg = ctx.getG(m, tx, ty); return gg !== T.WATER && gg !== T.DEEP && gg !== T.LAVA; };
function besideNoxx(ctx) {
  const g = ctx.S.guide, p = ctx.S.player; if (!g || !p) return false;
  for (const [dx, dy] of [[0, 22], [-20, 8], [20, 8], [0, 30], [-26, 20], [26, 20], [0, -20], [-32, 0], [32, 0]]) {
    const x = g.x + dx, y = g.y + dy; if (!walk(ctx, x, y) || !walk(ctx, x - 4, y) || !walk(ctx, x + 4, y)) continue;
    p.x = x; p.y = y; p.autoPath = null; if (p.faceTo) p.faceTo(g.x, g.y); log('spawn', { x: Math.round(x), y: Math.round(y), gx: Math.round(g.x), gy: Math.round(g.y) }); return true;
  }
  return false;
}
function farmTarget(ctx) {
  const f = flags(ctx); if (f.p120farm) return f.p120farm; if (!ctx.S.zone || ctx.S.zone.id !== 'village') return null;
  const g = ctx.S.guide || ctx.S.player, m = ctx.S.map; let best = null, bd = 1e9;
  for (let ty = 82; ty < Math.min(m.h - 2, 112); ty++) for (let tx = 2; tx < m.w - 2; tx++) {   /* vào sâu ≥ 4 ô trong Đồng Cỏ (vùng bắt đầu ở hàng 78) */
    if (regionAt(tx, ty).id !== FARM_RID) continue; const x = tx * 16 + 8, y = ty * 16 + 12;
    let ok = true; for (let j = -1; j <= 1 && ok; j++) for (let i = -1; i <= 1; i++) if (!walk(ctx, x + i * 16, y + j * 16)) { ok = false; break; }
    if (!ok) continue; const d = Math.hypot(x - g.x, (y - g.y) - 6 * 16);   /* ~6 ô vào sâu trong đồng cỏ, không đứng ngay mép */
    if (d < bd) { bd = d; best = { x, y }; }
  }
  if (best) { f.p120farm = best; ctx.persist(); log('farm', best); }
  return best;
}
const inFarm = (ctx, x, y) => regionAt(Math.floor(x / 16), Math.floor(y / 16)).id === FARM_RID;

/* ---------- vẽ: dấu kiểu Saiyan (4 góc + icon + tên nhỏ), TĨNH ---------- */
function markTarget(ctx) {
  if (!isNew(ctx) || !ctx.S.zone || ctx.S.zone.id !== 'village') return null; const f = flags(ctx), t = L(ctx);
  if (!f.p120done) { const g = ctx.S.guide; return g ? { x: g.x, y: g.y - 30, label: 'Noxx', box: 0, noxx: true } : null; }
  if (f.p120arr || !f.p120farm) return null; return { x: f.p120farm.x, y: f.p120farm.y, label: t.farm, box: 1 };
}
function icon(ctx) { const z = ctx.ART && ctx.ART.man && ctx.ART.man.ui && ctx.ART.man.ui.zmap; return z && z.quest ? img(z.quest) : null; }
function drawUI(ug, ctx, cx, cy, scale) {
  if (ctx.S.mode !== 'play') return; const M = markTarget(ctx); if (!M) return;
  const k = (globalThis.__u89 ? globalThis.__u89(scale) : scale), fs = Math.max(10, Math.round(k * 2.6)), W = ug.canvas.width, H = ug.canvas.height;
  let sx = (M.x - cx) * scale, sy = (M.y - cy) * scale; const on = sx > 8 && sx < W - 8 && sy > H * 0.15 && sy < H * 0.62, im = icon(ctx), isz = Math.round(fs * 1.1);
  ug.save(); ug.imageSmoothingEnabled = false; ug.font = `bold ${fs}px VT323, monospace`; ug.textAlign = 'center'; ug.textBaseline = 'bottom';
  if (M.noxx) {   /* chỉ icon nhỏ trên đầu Noxx (tên Noxx đã có sẵn) */
    if (on && im && im.complete && im.naturalWidth) ug.drawImage(im, 0, 0, im.naturalWidth, im.naturalHeight, Math.round(sx - isz / 2), Math.round(sy - isz), isz, isz);
    ug.restore(); return;
  }
  const lw = Math.max(1, Math.round(k * 0.6));
  if (on) {
    const hw = Math.round(14 * scale), hh = Math.round(10 * scale), arm = Math.round(5 * scale), y0 = sy - hh, x0 = sx - hw;
    const corners = (col, w) => { ug.strokeStyle = col; ug.lineWidth = w; ug.beginPath();
      for (const [cxx, cyy, ddx, ddy] of [[x0, y0, 1, 1], [x0 + 2 * hw, y0, -1, 1], [x0, y0 + 2 * hh, 1, -1], [x0 + 2 * hw, y0 + 2 * hh, -1, -1]]) { ug.moveTo(cxx + ddx * arm, cyy); ug.lineTo(cxx, cyy); ug.lineTo(cxx, cyy + ddy * arm); } ug.stroke(); };
    corners('rgba(13,11,20,.8)', lw + 2); corners('#ffd45e', lw);
    tag(ug, M.label, sx, y0 - 3, fs, im, isz);
  } else {   /* ngoài khung: mũi tam giác nhỏ ở mép + tên */
    const a = Math.atan2(sy - H / 2, sx - W / 2), mx = 22 + isz, ex = Math.max(mx, Math.min(W - mx, W / 2 + Math.cos(a) * W)), ey = Math.max(Math.max(mx + fs, H * 0.15), Math.min(H * 0.62, H / 2 + Math.sin(a) * H));   /* tránh HUD trên + hotbar / thanh máu dưới + nút Go điện thoại */
    const r = Math.round(fs * 0.55); ug.save(); ug.translate(ex, ey); ug.rotate(a); ug.fillStyle = 'rgba(13,11,20,.8)'; ug.beginPath(); ug.moveTo(r + 3, 0); ug.lineTo(-r - 1, -r - 2); ug.lineTo(-r - 1, r + 2); ug.closePath(); ug.fill();
    ug.fillStyle = '#ffd45e'; ug.beginPath(); ug.moveTo(r, 0); ug.lineTo(-r + 1, -r); ug.lineTo(-r + 1, r); ug.closePath(); ug.fill(); ug.restore();
    tag(ug, M.label, ex - Math.cos(a) * (r + fs * 1.2), ey - Math.sin(a) * (r + fs * 0.9) + fs * 0.5, fs, im, isz);
  }
  ug.restore();
}
function tag(ug, txt, x, y, fs, im, isz) {
  const tw = ug.measureText(txt).width, hasI = im && im.complete && im.naturalWidth, w = tw + 8 + (hasI ? isz + 2 : 0), bh = fs + 2, x0 = Math.round(x - w / 2);
  ug.fillStyle = 'rgba(13,11,20,.6)'; ug.beginPath(); if (ug.roundRect) ug.roundRect(x0, y - bh, w, bh, 3); else ug.rect(x0, y - bh, w, bh); ug.fill();
  if (hasI) ug.drawImage(im, 0, 0, im.naturalWidth, im.naturalHeight, x0 + 3, Math.round(y - bh + (bh - isz) / 2), isz, isz);
  ug.fillStyle = '#ffd45e'; ug.textAlign = 'left'; ug.fillText(txt, x0 + 4 + (hasI ? isz + 2 : 0), y - 1); ug.textAlign = 'center';
}

export const noxx120 = {
  id: 'noxx120',
  always: true,
  onZoneEnter(ctx) {
    ST.ctx = ctx; closePick(ctx); ST.greetT = -1;
    ctx.noxx120 = { talk: () => talk(ctx), fresh: fresh120 };
    if (ctx.chanthu && ctx.chanthu.pins && !ctx.chanthu.pins.__p120) {   /* ghim bản đồ (M): Noxx khi chưa chọn · bãi farm khi chưa tới */
      const o = ctx.chanthu.pins, w = () => { const out = o(); try { const M = markTarget(ctx), t = L(ctx); if (M) out.push({ x: M.x, y: M.noxx ? M.y + 22 : M.y - 6, kind: 'quest', label: M.noxx ? t.pinNoxx : t.pinFarm }); } catch (e) { } return out; };
      w.__p120 = true; ctx.chanthu.pins = w;
    }
    if (typeof window !== 'undefined') window.__p120 = {
      state: () => { const f = flags(ctx), d = ctx.chanthu && ctx.chanthu.data && ctx.chanthu.data(); return { isNew: isNew(ctx), done: !!f.p120done, tut: !!f.p120tut, arr: !!f.p120arr, sp: f.p120sp || null, farm: f.p120farm || null, panel: ST.panel, mode: ctx.S.mode, zone: ctx.S.zone && ctx.S.zone.id,
        team: d && d.team ? d.team.map(m => ({ id: m.id, sp: m.sp, lv: m.lv, name: m.name, xp106: m.xp106 || 0 })) : [], pad: ctx.chanthu && ctx.chanthu.pad ? ctx.chanthu.pad() : null, pet: !!(ctx.S.save.sys && ctx.S.save.sys.pet && ctx.S.save.sys.pet.pet), nation: ctx.S.save.nation,
        guide: ctx.S.guide ? { x: Math.round(ctx.S.guide.x), y: Math.round(ctx.S.guide.y) } : null, player: { x: Math.round(ctx.S.player.x), y: Math.round(ctx.S.player.y) }, mark: markTarget(ctx) }; },
      talk: () => talk(ctx), open: () => openPick(ctx), close: () => closePick(ctx), pick: (sp, nm) => choose(ctx, sp, nm), list: () => loadSpr().then(() => speciesList()), log: () => ST.log.slice(), farm: () => farmTarget(ctx) };
    if (ctx.S.zone.id !== 'village' || !isNew(ctx)) return;
    if (!flags(ctx).p120done && (ctx.S.save.entry === 'default' || !ctx.S.save.entry)) { besideNoxx(ctx); if (!ST.greeted) ST.greetT = 0.9; loadSpr(); }
    if (flags(ctx).p120done) farmTarget(ctx);
  },
  onZoneLeave(ctx) { closePick(ctx); },
  key(code, ctx) { if (ST.panel && code === 'Escape') { closePick(ctx); return true; } return false; },
  update(dt, ctx) {
    if (!isNew(ctx) || !ctx.S.zone || ctx.S.zone.id !== 'village') return;
    if (ST.greetT > 0 && ctx.S.mode === 'play') { ST.greetT -= dt; if (ST.greetT <= 0) { ST.greetT = -1; const g = ctx.S.guide, p = ctx.S.player; if (pending(ctx) && g && Math.hypot(g.x - p.x, g.y - p.y) < 70) talk(ctx); } }
    const f = flags(ctx); if (f.p120done && !f.p120arr && f.p120farm) { const p = ctx.S.player; if (inFarm(ctx, p.x, p.y) && Math.hypot(p.x - f.p120farm.x, p.y - f.p120farm.y) < 120) { f.p120arr = 1; f.p120arrT = Date.now(); ctx.persist(); log('arrive'); try { ctx.toast(L(ctx).arrive); } catch (e) { } } }
  },
  drawUI(ug, ctx, cx, cy, scale) { try { drawUI(ug, ctx, cx, cy, scale); } catch (e) { } },
};
