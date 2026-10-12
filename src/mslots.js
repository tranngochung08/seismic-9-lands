// mslots.js — ĐIỆN THOẠI (pointer:coarse): nút A THEO NGỮ CẢNH + nút ĂN + nút Túi. Desktop không thấy gì ở đây (thanh công cụ PC giữ nguyên).
// 2026-10-11 anh (đổi thiết kế lần 2): màn chật → bỏ vòng ô đồ tròn quanh A (bản cũ: _bak/mslots-radial-2026-10-11.js).
//  · Nút A làm ĐÚNG việc của thứ đang ở gần / đang khóa: cây → rìu, đá/quặng → cuốc, quái → kiếm, đất → xẻng/hạt, nước → cần câu, dân → nói chuyện…
//    Dùng hệ ứng viên sẵn có (S.near; cand.need/needId → main.interact TỰ CẦM món đúng rồi làm). Mặt nút: icon món/việc sẽ dùng + chữ ngắn ("Chặt", "Đánh"…);
//    thiếu dụng cụ → icon xám, bấm thì báo thiếu gì. KHÔNG bao giờ tự đổi sang súng hóa đá (không hệ nào trả needId 'petgun').
//  · Nút Ăn (tròn, cạnh A): món ăn nhiều nhất trong túi + số lượng; chạm = ăn (hồi máu). Máu đầy → mờ; hết đồ ăn → ẩn.
//  · Nút 🎒 (tròn nhỏ): mở túi đồ (bán / ăn / vứt). 🎯 đổi mục tiêu đặt cạnh cụm, không đè.
import { ITEMS, TOOLS, itemName } from './items.js';
import * as HB from './hotbar.js';

let D = null, root = null, sig = '', lay = '', layT = 0, aSig = '';
const sv = () => D && D.S.save;
const vi = () => D.CTX.lang() === 'vi';
const man = () => (D.ART && D.ART.man && D.ART.man.ui) || {};
const itemSrc = id => { const u = man().items || {}, f = u[HB.iconId(id)] || u[id]; return f ? 'assets/px/' + f : null; };
const curSrc = k => { const c = man().cursor || {}; return c[k] ? 'assets/px/' + c[k] : null; };
const strip = s => String(s || '').replace(/\p{Extended_Pictographic}️?(‍\p{Extended_Pictographic}️?)*/gu, '').replace(/Ⓐ/g, '').replace(/\s{2,}/g, ' ').trim();

/* ---- chữ ngắn dưới icon nút A ---- */
const VERB = {
  vi: { axe: 'Chặt', pickaxe: 'Đập', shovel: 'Đào', sword: 'Đánh', rod: 'Câu', scythe: 'Cắt', knife: 'Lột', torch: 'Đốt', petgun: 'Bắn', hay: 'Cho ăn', revive: 'Hồi sinh', seed: 'Trồng', stone: 'Tặng', scarecrow: 'Đặt', pen1: 'Đặt', pen2: 'Đặt', a_fish: 'Thả cá', a_fishbig: 'Thả cá', npc: 'Nói', bed: 'Ngủ', sign: 'Đọc', hall: 'Xem', nation: 'Xem', rocky: 'Xem', shop: 'Mua', fire: 'Đốt', ore: 'Đập', lever: 'Kéo', quiz: 'Học', item: 'Nhặt', seedK: 'Gieo', use: 'Dùng' },
  en: { axe: 'Chop', pickaxe: 'Mine', shovel: 'Dig', sword: 'Hit', rod: 'Fish', scythe: 'Cut', knife: 'Skin', torch: 'Light', petgun: 'Shoot', hay: 'Feed', revive: 'Revive', seed: 'Plant', stone: 'Gift', scarecrow: 'Place', pen1: 'Place', pen2: 'Place', a_fish: 'Release', a_fishbig: 'Release', npc: 'Talk', bed: 'Sleep', sign: 'Read', hall: 'View', nation: 'View', rocky: 'View', shop: 'Shop', fire: 'Light', ore: 'Mine', lever: 'Pull', quiz: 'Study', item: 'Pick up', seedK: 'Sow', use: 'Use' }
};
const verbOf = k => { const v = VERB[vi() ? 'vi' : 'en']; return v[k] || (k && k.startsWith('seed_') ? v.seedK : v.use); };
function shortLabel(label) {   /* 'Chặt cây' → 'Chặt'; 'Nói chuyện với X' → 'Nói chuyện'; cắt ở · → ( : */
  let t = strip(label).split(/\s[·→(:—-]\s?|\s\(/)[0].trim(); const w = t.split(' ');
  t = w[0].length <= 3 && w[1] ? w[0] + ' ' + w[1] : w[0];
  return t.length > 11 ? t.slice(0, 10) + '…' : t;
}

/* ---- việc nút A sẽ làm lúc này ---- */
export function aAction() {
  if (!D || !D.S.save) return null;
  const n = D.S.near; if (!n) { const h = HB.held(); return h && HB.kindOf(h) === 'food' ? { icon: itemSrc(h), verb: vi() ? 'Ăn' : 'Eat', ok: true, id: h } : null; }
  if (n.kind === 'sys' && n.cand && n.cand.need) {
    const id = n.cand.needId; if (!id) return { icon: null, verb: shortLabel(n.cand.label), ok: false };
    return { icon: itemSrc(id) || curSrc('tool'), verb: verbOf(id), ok: HB.owns(id), id, need: true };
  }
  if (n.kind === 'sys') {
    const h = HB.held(), k = HB.kindOf(h), useHeld = h && (k === 'tool' || k === 'seed' || k === 'place');
    return { icon: useHeld ? itemSrc(h) : null, verb: shortLabel(n.label || (n.cand && n.cand.label)) || verbOf(h), ok: true, id: useHeld ? h : null };
  }
  if (n.kind === 'npc') return { icon: null, verb: verbOf('npc'), ok: true };
  return { icon: null, verb: verbOf(n.kind), ok: true };   /* việc tay không (nói, đọc, nhặt…): mặt nút = chữ A + chữ việc */
}
function aFace() {
  const a = document.getElementById('btn-a'); if (!a) return;
  const on = HB.mobile(), act = on && D.S.mode === 'play' ? aAction() : null;
  const k = JSON.stringify([on, act, !!(man().mslots && man().mslots.btn_a)]); if (k === aSig) return; aSig = k;
  a.classList.toggle('ms-a', !!(on && man().mslots && man().mslots.btn_a));
  a.classList.toggle('ms-no', !!(act && !act.ok));
  a.dataset.verb = act ? act.verb : '';
  a.innerHTML = act && act.icon ? `<img src="${act.icon}" alt="" draggable="false"><i class="ms-a-v">${act.verb}</i>` : act ? `<span class="ms-a-l">A</span><i class="ms-a-v">${act.verb}</i>` : '<span class="ms-a-l">A</span>';
}

/* ---- nút Ăn: món ăn nhiều nhất trong túi ---- */
export function bestFood() {
  const s = sv(); if (!s) return null; let best = null, bn = 0;
  for (const id of Object.keys(ITEMS)) { if (HB.kindOf(id) !== 'food') continue; const n = s.inv[id] || 0; if (n > bn) { bn = n; best = id; } }
  return best;
}
const hpFull = () => { const h = D.CTX.hero; return !!(h && h.hp >= h.max); };
export function eat() {
  const id = bestFood(); if (!id) return false;
  if (hpFull()) { D.CTX.toast(vi() ? 'Máu đang đầy — chưa cần ăn' : 'HP is full — no need to eat'); return false; }
  const ok = HB.eatItem(id); sig = ''; render(true); return ok;
}

/* ---- hiển thị ---- */
export const visible = () => !!(D && HB.mobile() && !HB.hidden0() && D.S.save && D.S.map && D.S.mode === 'play');
export function render(force) {
  if (!root) return;
  const show = visible(); if (root.hidden === show) root.hidden = !show;
  aFace(); if (!show) return;
  const f = bestFood(), n = f ? sv().inv[f] || 0 : 0, full = hpFull(), lg = vi();
  const key = JSON.stringify([f, n, full, lg]); if (!force && key === sig) return; sig = key;
  root.innerHTML = (f ? `<div class="ms-eat${full ? ' dim' : ''}" title="${lg ? 'Ăn' : 'Eat'} ${itemName(f, lg ? 'vi' : 'en')}"><img src="${itemSrc(f) || ''}" alt="" draggable="false">${n > 1 ? `<b class="ms-n">${n}</b>` : ''}<i class="ms-v">${lg ? 'Ăn' : 'Eat'}</i></div>` : '') +
    `<div class="ms-bag" title="${lg ? 'Túi đồ' : 'Bag'}"><img src="assets/px/${(man().tabs && man().tabs.bag) || 'ui/tab_bag.png'}" alt="" draggable="false"></div>`;
  lay = ''; layout();
}
/* xếp quanh tâm nút A (đo toạ độ thật → đúng cả dọc lẫn ngang): Ăn bên trái A, Túi trên-trái A, 🎯 trên cụm (dọc) / trái cụm (ngang) */
function layout() {
  const a = document.getElementById('btn-a'); if (!a || !root || root.hidden) return;
  const r = a.getBoundingClientRect(); if (!r.width) return;
  const key = [r.left, r.top, r.width, innerWidth, innerHeight, root.children.length].map(Math.round).join(','); if (key === lay) return; lay = key;
  const cx = r.left + r.width / 2, cy = r.top + r.height / 2, ra = r.width / 2, land = innerWidth > innerHeight;
  const place = (e, ang, rad, w) => { if (!e) return; const t = ang * Math.PI / 180; e.style.left = Math.round(cx + Math.cos(t) * rad - w / 2) + 'px'; e.style.top = Math.round(cy - Math.sin(t) * rad - w / 2) + 'px'; };
  const EAT = 58, BAG = 48;
  place(root.querySelector('.ms-eat'), 168, ra + EAT / 2 + 8, EAT);
  place(root.querySelector('.ms-bag'), 108, ra + BAG / 2 + 8, BAG);
  const tg = document.getElementById('btn-tgt');
  if (tg) {
    tg.style.left = 'auto'; tg.style.top = 'auto';
    if (land) { const left = cx + Math.cos(168 * Math.PI / 180) * (ra + EAT / 2 + 8) - EAT / 2; tg.style.right = Math.round(innerWidth - left + 10) + 'px'; tg.style.bottom = Math.round(innerHeight - cy - 17) + 'px'; }
    else { const top = cy - Math.sin(108 * Math.PI / 180) * (ra + BAG / 2 + 8) - BAG / 2; tg.style.right = Math.round(innerWidth - r.right) + 'px'; tg.style.bottom = Math.round(innerHeight - top + 10) + 'px'; }
  }
}
/* đích bay khi nhặt đồ: nút Túi (hud.js tìm '#mslots .ms-bag') */
export function flyTarget() { return visible() && root ? root.querySelector('.ms-bag') : null; }

export function tick(dt) {
  if (!D) return;
  render(false);
  if ((layT -= dt) <= 0) { layT = 0.4; layout(); }
}
export function initMslots(d) {
  D = d;
  const host = document.getElementById('touch') || document.body;
  root = document.createElement('div'); root.id = 'mslots'; root.hidden = true; host.appendChild(root);
  root.addEventListener('pointerdown', e => {
    const ea = e.target.closest('.ms-eat'), bg = e.target.closest('.ms-bag'); if (!ea && !bg) return;
    e.preventDefault(); e.stopPropagation();
    if (bg) { if (D.openFullBag) D.openFullBag(); return; }
    eat();
  });
  window.addEventListener('resize', () => { lay = ''; setTimeout(layout, 60); });
  if (typeof window !== 'undefined') window.__ms = { aAction, bestFood, eat, visible, held: () => HB.held(), foodIds: () => Object.keys(ITEMS).filter(id => HB.kindOf(id) === 'food') };
}
