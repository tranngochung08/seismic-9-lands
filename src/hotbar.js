// hotbar.js — plan-20: thanh 12 ô kiểu Stardew ở đáy màn hình. MÓN ĐANG CẦM quyết định hành động:
// các hệ hỏi ctx.holding('axe') / ctx.heldSeed() …; cầm sai món → ứng viên 'need' chỉ nhắc ("Cần cầm 🪓 Rìu (phím 2)").
// Phím 1–9, 0, −, =; lăn chuột; bấm/chạm ô. save.hotbar = [12 id | null], save.hotSel = 0..11. Ẩn ở Vực Kraken (phím 1–3 = kỹ năng Rocky).
import { ITEMS, TOOLS, itemName, itemIcon } from './items.js';

export const N = 12;
export const ACTIVE = ['petgun', 'sword', 'axe', 'pickaxe', 'shovel', 'scythe', 'knife', 'rod', 'torch'];   /* dụng cụ phải cầm mới dùng (bẫy, xe chở, yên, thòng lọng đã bỏ 2026-10-11) */
const PLACE = ['scarecrow', 'pen1', 'pen2', 'seed', 'hay', 'revive', 'stone', 'a_fish', 'a_fishbig'];   /* a_fish: cá câu được vào túi (bỏ xô 2026-10-11) → lần đầu có tự lên 1 ô trống, cầm cá + E cạnh ao = thả cá */   /* stone: cầm đá Seismic → click dân = tặng (dân có đá mới chiến đấu, plan-21) */   /* hay = rơm cho thú ăn (ngựa, chuồng gà, máng chuồng) */   /* seed = hạt cây (trồng cây, gather.js) */
const KEYS = { Digit1: 0, Digit2: 1, Digit3: 2, Digit4: 3, Digit5: 4, Digit6: 5, Digit7: 6, Digit8: 7, Digit9: 8, Digit0: 9, Minus: 10, Equal: 11 };
const LABEL = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '−', '='];
let deps = null, el = null, sig = '', tipT = 0, off = false;
/* tour ?demo / video ?promo / bảng test cũ: chơi kiểu cũ (E tự chọn) — gỡ các hàm cầm món khỏi ctx, các hệ tự rơi về nhánh cũ */
export function disable(ctx) { off = true; for (const k of ['held', 'holding', 'heldKind', 'heldSeed', 'needHold', 'hold']) delete ctx[k]; if (el) el.hidden = true; }

const sv = () => deps && deps.S.save;
const isTool = id => ACTIVE.includes(id);
const tags = id => (ITEMS[id] && ITEMS[id].tags) || [];
export function kindOf(id) {
  if (!id) return null;
  if (isTool(id)) return 'tool';
  if (PLACE.includes(id)) return 'place';
  if (id.startsWith('seed_')) return 'seed';
  if (tags(id).includes('food')) return 'food';
  return null;
}
function owned(id) { const s = sv(); if (!s) return false; return TOOLS[id] ? deps.CTX.tool.tier(id) > 0 : (s.inv[id] || 0) > 0; }

/* giữ chỗ cũ; bỏ món đã hết; CHỈ món MỚI có (chưa từng thấy — save.hbSeen) mới tự vào ô trống (dụng cụ → hạt → đồ ăn → đồ đặt).
   plan-22: người chơi kéo món xuống túi thì ô trống đó giữ trống, không bị tự lấp lại. */
export function sync() {
  const s = sv(); if (!s) return;
  let bar = Array.isArray(s.hotbar) ? s.hotbar.slice(0, N) : [];
  while (bar.length < N) bar.push(null);
  bar = bar.map(id => (id && (ITEMS[id] || TOOLS[id]) && owned(id) ? id : null));
  const seen = new Set((s.hbSeen || []).filter(owned));
  const want = [...ACTIVE.filter(owned), ...Object.keys(s.inv).filter(id => kindOf(id) === 'seed' && owned(id)), ...Object.keys(s.inv).filter(id => kindOf(id) === 'food' && owned(id)), ...PLACE.filter(owned)];
  for (const id of want) { if (bar.includes(id) || seen.has(id)) continue; const i = bar.indexOf(null); if (i < 0) break; bar[i] = id; }
  if (owned('stone') && !bar.includes('stone')) { const i = bar.indexOf(null); bar[i >= 0 ? i : N - 1] = 'stone'; }   /* ô đếm đá dưới đồng hồ đã bỏ (2026-10-10) → đá Seismic luôn có 1 ô trên thanh, kể cả đá cộng thẳng vào túi / save cũ */
  for (const id of ownedIds()) seen.add(id);
  s.hbSeen = [...seen];
  s.hotbar = bar;
  if (!(s.hotSel >= 0 && s.hotSel < N)) s.hotSel = 0;
}
/* 2026-10-11 anh: ĐIỆN THOẠI (pointer:coarse) không dùng thanh công cụ PC — 'tay' riêng save.mHeld do ô tròn quanh nút A chọn (src/mslots.js). Desktop giữ nguyên hotSel. */
const MQ = typeof matchMedia !== 'undefined' ? matchMedia('(pointer:coarse)') : null;
export const mobile = () => !off && !!(MQ && MQ.matches);
export const held = () => { const s = sv(); if (!s) return null; if (mobile()) { if (s.mHeld === undefined) s.mHeld = s.hotbar ? s.hotbar[s.hotSel] || null : null; return s.mHeld && owned(s.mHeld) ? s.mHeld : null; } return s.hotbar ? s.hotbar[s.hotSel] || null : null; };
export function putAway() { const s = sv(); if (!s) return; s.mHeld = null; tipT = 0; if (deps.onHold) deps.onHold(null); render(true); }   /* điện thoại: cất đồ, tay không */
export const holding = id => held() === id;
export const heldKind = () => kindOf(held());
export function slotOf(id) { const s = sv(); return s && s.hotbar ? s.hotbar.indexOf(id) : -1; }
/* câu nhắc khi cầm sai món */
export function needText(id) {   /* 2026-10-10 anh yêu cầu: trỏ + click là tự cầm đúng món → nhãn mời bấm */
  const vi = deps.CTX.lang() === 'vi', nm = `${itemIcon(id)} ${itemName(id, vi ? 'vi' : 'en')}`;
  if (!owned(id)) return vi ? `Cần ${nm} — chưa có` : `Needs ${nm} — you don't have one`;
  return vi ? `Bấm để dùng ${nm}` : `Click to use ${nm}`;
}
export const owns = id => !!id && owned(id);
/* ---- plan-22: túi đồ kiểu Stardew (vô hạn). Hàng đầu = hotbar; phần còn lại = save.bagOrder (id | null), tự thêm hàng 12 ô. ---- */
export function ownedIds() { const s = sv(); if (!s) return []; return [...Object.keys(TOOLS).filter(id => deps.CTX.tool.tier(id) > 0), ...Object.keys(ITEMS).filter(id => (s.inv[id] || 0) > 0)]; }
export function bagSlots() {
  const s = sv(); if (!s) return []; sync();
  const on = new Set(s.hotbar.filter(Boolean)), own = ownedIds().filter(id => !on.has(id)), ok = new Set(own), seen = new Set();
  let ord = (Array.isArray(s.bagOrder) ? s.bagOrder : []).map(id => (id && ok.has(id) && !seen.has(id) ? (seen.add(id), id) : null));
  for (const id of own) if (!seen.has(id)) { const i = ord.indexOf(null); if (i >= 0) ord[i] = id; else ord.push(id); seen.add(id); }
  let last = -1; ord.forEach((id, i) => { if (id) last = i; });
  let len = Math.max(2 * N, Math.ceil((last + 1) / N) * N); if (ord.slice(0, len).every(Boolean)) len += N;   /* luôn còn ô trống: túi vô hạn */
  ord = ord.slice(0, len); while (ord.length < len) ord.push(null);
  s.bagOrder = ord; return ord;
}
/* đổi chỗ 2 ô: pos = 'h<i>' (hotbar) | 'b<i>' (túi) */
export function move(a, b) {
  const s = sv(); if (!s || a === b) return; bagSlots();
  const arr = p => (p[0] === 'h' ? s.hotbar : s.bagOrder), ix = p => +p.slice(1);
  const x = arr(a)[ix(a)] || null, y = arr(b)[ix(b)] || null;
  arr(a)[ix(a)] = y; arr(b)[ix(b)] = x;
  deps.CTX.persist(); render(true);
}
const ORDER = id => (TOOLS[id] ? 0 : kindOf(id) === 'seed' ? 1 : kindOf(id) === 'food' ? 2 : kindOf(id) === 'place' ? 3 : 4);
export function sortBag() {   /* xếp gọn phần túi (không đụng hotbar): dụng cụ → hạt → đồ ăn → đồ đặt → nguyên liệu */
  const s = sv(); const ord = bagSlots(), keys = [...Object.keys(TOOLS), ...Object.keys(ITEMS)];
  const ids = ord.filter(Boolean).sort((p, q) => ORDER(p) - ORDER(q) || keys.indexOf(p) - keys.indexOf(q));
  s.bagOrder = ids.concat(Array(Math.max(0, ord.length - ids.length)).fill(null)); bagSlots(); deps.CTX.persist(); render(true);
}
export const label = i => LABEL[i];
export const hidden0 = () => off || !deps || (deps.S.zone && deps.S.zone.id === 'trench');   /* tắt hẳn (không tính chế độ menu) */
export const hidden = () => off || !deps || !deps.S.save || !deps.S.map || deps.S.mode !== 'play' || (deps.S.zone && deps.S.zone.id === 'trench');

export function select(i) { const s = sv(); if (!s) return; s.hotSel = ((i % N) + N) % N; tipT = 1.6; render(true); }
export function cycle(d) { select((sv().hotSel || 0) + d); }
export function key(code) { if (hidden() || !(code in KEYS)) return false; select(KEYS[code]); return true; }
/* đưa món lên thanh (ô sẵn có / ô trống / ô đang chọn) rồi chọn — cho kịch bản tự động (demo, promo, bảng test) và móc test */
export function hold(id) { const s = sv(); if (!s || !id) return false; sync(); if (mobile()) { s.mHeld = id; if (deps.onHold) deps.onHold(id); render(true); return true; } let i = s.hotbar.indexOf(id); if (i < 0) { i = s.hotbar.indexOf(null); if (i < 0) i = s.hotSel; s.hotbar[i] = id; } select(i); return true; }
export function firstEmpty(id) { const s = sv(); if (!s) return -1; sync(); const j = s.hotbar.indexOf(id); if (j >= 0) return j; return s.hotbar.indexOf(null); }   /* phím T: ô sẽ nhận thú */
export function putAt(i, id) { const s = sv(); if (!s || i < 0) return; s.hotbar[i] = id; deps.CTX.persist(); render(true); }
export function setSlot(i, id) { const s = sv(); sync(); const j = s.hotbar.indexOf(id); if (j >= 0) s.hotbar[j] = s.hotbar[i]; s.hotbar[i] = id; deps.CTX.persist(); render(true); }

/* ăn món đang cầm (E vào chỗ trống / chuột phải) */
export function eatHeld() {
  if (off) return false; return eatItem(held());
}
export function eatItem(id) {   /* ăn 1 món đồ ăn bất kỳ trong túi (nút Ăn cạnh nút A trên điện thoại) */
  if (!deps || kindOf(id) !== 'food') return false;
  const C = deps.CTX, p = deps.S.player; if (!C.bag.has(id, 1)) return false;
  C.bag.remove(id, 1);
  if (p.hasAct && p.hasAct('eat') && !p.custom) { p.dir = 0; p.act('eat', 0); }
  p.fedT = 30; if (C.hero) C.hero.heal(ITEMS[id] && ITEMS[id].heal ? Math.round(C.hero.max * ITEMS[id].heal) : 25);   /* plan-28: viên hồi máu hồi theo % máu tối đa */ C.sfx('pickup');   /* plan-21: ăn hồi 25 máu */
  const vi = C.lang() === 'vi', nm = itemName(id, vi ? 'vi' : 'en');
  C.toast(vi ? `Ngon quá, ${nm}! Thấy khoẻ khoắn — đi nhanh hơn 30 giây` : `Yum, ${nm}! You feel lively — walking faster for 30 s`);
  sync(); render(true); C.persist(); return true;
}

export const iconId = id => (id === 'sword' && deps ? `sword_t${Math.max(1, deps.CTX.tool.tier('sword'))}` : id);   /* kiếm: icon theo cấp 1–6 */
function iconHTML(id) {
  const man = deps.ART && deps.ART.man, f = man && man.ui && man.ui.items && (man.ui.items[iconId(id)] || man.ui.items[id]);
  return f ? `<img src="assets/px/${f}" alt="">` : `<span class="hb-emo">${itemIcon(id)}</span>`;
}
export function render(force) {
  if (!el) return;
  const hide = hidden(); el.hidden = hide; if (hide) return;
  sync();
  const s = sv(), lg = deps.CTX.lang() === 'vi' ? 'vi' : 'en';
  const key = JSON.stringify([s.hotbar, s.hotSel, s.hotbar.map(id => (id && !isTool(id) ? s.inv[id] || 0 : 0)), lg, tipT > 0]);
  if (!force && key === sig) return; sig = key;
  const cur = held();
  el.innerHTML = `<div class="hb-tip"${tipT > 0 && cur ? '' : ' hidden'}>${cur ? itemName(cur, lg) : ''}</div><div class="hb-bar">` + s.hotbar.map((id, i) => {
    const n = id && !isTool(id) ? s.inv[id] || 0 : 0;
    return `<div class="hb-slot${i === s.hotSel ? ' on' : ''}" data-i="${i}" title="${id ? itemName(id, lg) : ''}"><i class="hb-k">${LABEL[i]}</i>${id ? iconHTML(id) : ''}${n > 1 ? `<b class="hb-n">${n}</b>` : ''}</div>`;
  }).join('') + `<div class="hb-bag" title="${lg === 'vi' ? 'Túi đồ (B)' : 'Bag (B)'}"><img src="assets/px/ui/tab_bag.png" alt=""></div></div>`;   /* plan-24: đích bay khi đồ vào túi */
}
export function tick(dt) { if (tipT > 0) { tipT -= dt; if (tipT <= 0) render(true); } render(false); }

export function initHotbar(d) {
  deps = d;
  el = document.createElement('div'); el.id = 'hotbar'; el.hidden = true; document.body.appendChild(el);
  el.addEventListener('pointerdown', e => { if (e.target.closest('.hb-bag')) { e.preventDefault(); e.stopPropagation(); if (deps.openBag) deps.openBag(); return; } const s = e.target.closest('.hb-slot'); if (!s) return; e.preventDefault(); e.stopPropagation(); select(+s.dataset.i); });
  const cv = d.canvas;
  cv.addEventListener('wheel', e => { if (hidden()) return; e.preventDefault(); cycle(e.deltaY > 0 ? 1 : -1); }, { passive: false });
  cv.addEventListener('contextmenu', e => { if (hidden()) return; e.preventDefault(); eatHeld(); });
}
