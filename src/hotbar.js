// hotbar.js — p91 (plan-91 đợt B, anh duyệt 2026-11-02): CỤM HUD GIỮA DƯỚI kiểu Saiyan trên MÁY TÍNH.
//   Hàng trên: thanh máu đỏ có số · chân dung người chơi + cấp · 7 ngọc Ki xếp ngang · vạch EXP mỏng.
//   Hàng dưới: 10 ô phím 1…0 — ô 1–5 = KỸ NĂNG (1 Đánh = cầm vũ khí · 2 Rocky-ha · 3 Lướt Ki · 4 Gọi linh thú · 5 Hợp Thể / Rồng Thần),
//   vạch ngăn, ô 6–0 = ĐỒ (5 ô, save.hotbar 5 phần tử). Hồi chiêu = ô tối + số giây. Đang Hợp Thể: ô 1–5 = chiêu Hợp Thể (#ht-bar ẩn).
//   Phím − = bỏ. R = ăn nhanh (giữ). / = lệnh Rocky, J = Ấn Chấn, B = túi (nút nhỏ bên phải cụm).
//   Save cũ (hotbar 12 ô, chưa có cờ hb91): chuyển 1 lần — kiếm về ô 1, 5 món đầu khác lên ô 6–0, phần thừa nằm trong túi (túi = mọi món có mà
//   không ở thanh, không mất gì). Điện thoại: #hotbar vẫn ẩn (style.css), dùng mslots + #herobar cũ như trước (đợt D làm sau).
// MÓN ĐANG CẦM quyết định hành động như plan-20: các hệ hỏi ctx.holding('axe') / ctx.heldSeed() …
// save.hotbar = [5 id | null], save.hotSel = -1 (ô 1: vũ khí) | 0..4 (ô 6–0). Ẩn ở Vực Kraken (phím 1–3 = kỹ năng Rocky).
import { ITEMS, TOOLS, itemName, itemIcon, MERGED, toolOf } from './items.js';
import { Entity } from './entities.js';

export const N = 5;
const BAGW = 12;   /* bề ngang túi giữ 12 ô như cũ */
export const ACTIVE = ['petgun', 'sword', 'bua', 'axe', 'pickaxe', 'shovel', 'scythe', 'knife', 'rod', 'torch'];
const PLACE = ['scarecrow', 'pen1', 'pen2', 'seed', 'hay', 'revive', 'stone', 'a_fish', 'a_fishbig'];
const KEYS = { Digit6: 0, Digit7: 1, Digit8: 2, Digit9: 3, Digit0: 4 };
const SKEYS = { Digit1: 0, Digit2: 1, Digit3: 2, Digit4: 3, Digit5: 4 };
const LABEL = ['6', '7', '8', '9', '0'];
const WEAPON = 'sword';
let deps = null, el = null, sig = '', tipT = 0, off = false;
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
function owned(id) { const s = sv(); if (!s) return false; return TOOLS[id] ? !MERGED.includes(id) && deps.CTX.tool.tier(id) > 0 : (s.inv[id] || 0) > 0; }

/* p91: chuyển save cũ 12 ô → 5 ô đồ + ô vũ khí (1 lần, cờ hb91). Không xoá món nào khỏi túi: món rời thanh vẫn nằm trong túi (bagSlots). */
export function migrate(s) {
  if (!s || s.hb91 === 1) return false;
  const old = Array.isArray(s.hotbar) ? s.hotbar.slice() : [], sel = s.hotSel, heldOld = old[sel] || null;
  const items = [];
  for (const id of old) if (id && id !== WEAPON && !isTool(id) && !items.includes(id)) items.push(id);   /* đợt F: công cụ rời thanh (cấp giữ nguyên) */
  let bar = items.slice(0, N);
  if (heldOld && heldOld !== WEAPON && !isTool(heldOld) && !bar.includes(heldOld)) bar[N - 1] = heldOld;   /* món đang cầm luôn còn trên thanh */
  while (bar.length < N) bar.push(null);
  s.hb91old = old; s.hotbar = bar; s.hb91 = 1;
  s.hotSel = heldOld === WEAPON || isTool(heldOld) ? -1 : heldOld ? bar.indexOf(heldOld) : old.length && sel >= 0 ? -2 : -1;   /* -2 = tay không (cũ đang chọn ô trống) */
  return true;
}
/* giữ chỗ cũ; bỏ món đã hết; CHỈ món MỚI có (chưa từng thấy — save.hbSeen) mới tự vào ô trống. Kiếm không lên ô đồ (ô 1 riêng). */
export function sync() {
  const s = sv(); if (!s) return;
  migrate(s);
  let bar = Array.isArray(s.hotbar) ? s.hotbar.slice(0, N) : [];
  while (bar.length < N) bar.push(null);
  bar = bar.map(id => (id && id !== WEAPON && !isTool(id) && (ITEMS[id] || TOOLS[id]) && owned(id) ? id : null));   /* p91 đợt F: công cụ không lên thanh (tay ảo, tự cầm khi làm việc) */
  const seen = new Set((s.hbSeen || []).filter(owned));
  const want = [...Object.keys(s.inv).filter(id => kindOf(id) === 'seed' && owned(id)), ...Object.keys(s.inv).filter(id => kindOf(id) === 'food' && owned(id)), ...PLACE.filter(owned)];
  for (const id of want) { if (bar.includes(id) || seen.has(id)) continue; const i = bar.indexOf(null); if (i < 0) break; bar[i] = id; }
  for (const id of ownedIds()) seen.add(id);
  s.hbSeen = [...seen];
  s.hotbar = bar;
  if (!(s.hotSel >= -2 && s.hotSel < N)) s.hotSel = -1;
}
const MQ = typeof matchMedia !== 'undefined' ? matchMedia('(pointer:coarse)') : null;
export const mobile = () => !off && !!(MQ && MQ.matches);
function selId() { const s = sv(); if (!s || !s.hotbar) return null; if (s.hotSel === -1) return owned(WEAPON) ? WEAPON : null; return s.hotSel >= 0 ? s.hotbar[s.hotSel] || null : null; }
export const held = () => { const s = sv(); if (!s) return null; if (mobile()) { if (s.mHeld === undefined) s.mHeld = selId(); return s.mHeld && owned(s.mHeld) ? s.mHeld : null; } if (s.tHeld && owned(s.tHeld)) return s.tHeld; return selId(); };
if (typeof globalThis !== 'undefined') globalThis.__f91 = true;   /* đợt F bật: hệ (farm.js…) đưa việc cần công cụ cho phím E kể cả không trỏ chuột */
const TOOL_IDLE = 8;   /* p91 đợt F: tay ảo tự buông sau 8 s không làm việc cần món đó */
let tT = 0;
export function putAway() { const s = sv(); if (!s) return; s.mHeld = null; tipT = 0; if (deps.onHold) deps.onHold(null); render(true); }
export const holding = id => held() === toolOf(id);
export const heldKind = () => kindOf(held());
export function slotOf(id) { const s = sv(); return s && s.hotbar ? s.hotbar.indexOf(id) : -1; }
export function needText(id) { id = toolOf(id);
  const vi = deps.CTX.lang() === 'vi', nm = `${itemIcon(id)} ${itemName(id, vi ? 'vi' : 'en')}`;
  if (!owned(id)) return vi ? `Cần ${nm} — chưa có` : `Needs ${nm} — you don't have one`;
  return vi ? `Bấm để dùng ${nm}` : `Click to use ${nm}`;
}
export const owns = id => !!id && owned(toolOf(id));
export function ownedIds() { const s = sv(); if (!s) return []; return [...Object.keys(TOOLS).filter(id => !MERGED.includes(id) && deps.CTX.tool.tier(id) > 0), ...Object.keys(ITEMS).filter(id => (s.inv[id] || 0) > 0)]; }
export function bagSlots() {
  const s = sv(); if (!s) return []; sync();
  const on = new Set(s.hotbar.filter(Boolean)), own = ownedIds().filter(id => !on.has(id)), ok = new Set(own), seen = new Set();
  let ord = (Array.isArray(s.bagOrder) ? s.bagOrder : []).map(id => (id && ok.has(id) && !seen.has(id) ? (seen.add(id), id) : null));
  for (const id of own) if (!seen.has(id)) { const i = ord.indexOf(null); if (i >= 0) ord[i] = id; else ord.push(id); seen.add(id); }
  let last = -1; ord.forEach((id, i) => { if (id) last = i; });
  let len = Math.max(2 * BAGW, Math.ceil((last + 1) / BAGW) * BAGW); if (ord.slice(0, len).every(Boolean)) len += BAGW;
  ord = ord.slice(0, len); while (ord.length < len) ord.push(null);
  s.bagOrder = ord; return ord;
}
export function move(a, b) {
  const s = sv(); if (!s || a === b) return; bagSlots();
  const arr = p => (p[0] === 'h' ? s.hotbar : s.bagOrder), ix = p => +p.slice(1);
  const x = arr(a)[ix(a)] || null, y = arr(b)[ix(b)] || null;
  if ((a[0] === 'h' && (y === WEAPON || isTool(y))) || (b[0] === 'h' && (x === WEAPON || isTool(x)))) { deps.CTX.toast(deps.CTX.lang() === 'vi' ? 'Công cụ tự dùng khi bấm vào việc; kiếm ở ô 1 (Đánh)' : 'Tools are used automatically; the sword lives in slot 1 (Attack)'); return; }
  arr(a)[ix(a)] = y; arr(b)[ix(b)] = x;
  deps.CTX.persist(); render(true);
}
const ORDER = id => (TOOLS[id] ? 0 : kindOf(id) === 'seed' ? 1 : kindOf(id) === 'food' ? 2 : kindOf(id) === 'place' ? 3 : 4);
export function sortBag() {
  const s = sv(); const ord = bagSlots(), keys = [...Object.keys(TOOLS), ...Object.keys(ITEMS)];
  const ids = ord.filter(Boolean).sort((p, q) => ORDER(p) - ORDER(q) || keys.indexOf(p) - keys.indexOf(q));
  s.bagOrder = ids.concat(Array(Math.max(0, ord.length - ids.length)).fill(null)); bagSlots(); deps.CTX.persist(); render(true);
}
export const label = i => LABEL[i] || '';
export const hidden0 = () => off || !deps || (deps.S.zone && deps.S.zone.id === 'trench');
export const hidden = () => off || !deps || !deps.S.save || !deps.S.map || deps.S.mode !== 'play' || (deps.S.zone && deps.S.zone.id === 'trench');

export function select(i) { const s = sv(); if (!s) return; s.tHeld = null; s.hotSel = i === -1 ? -1 : ((i % N) + N) % N; tipT = 1.6; render(true); }
export function cycle(d) { const s = sv(); let i = (s.hotSel == null || s.hotSel < -1 ? -1 : s.hotSel) + d; if (i > N - 1) i = -1; if (i < -1) i = N - 1; select(i); }
export function key(code, rep) {
  if (hidden()) return false;
  if (code === 'KeyR') { if (!rep) eatBest(); return true; }
  if (code in SKEYS) { if (!rep) skill(SKEYS[code]); return true; }
  if (!(code in KEYS)) return false;
  const i = KEYS[code], id = sv().hotbar[i]; select(i);
  if (kindOf(id) === 'food' && !rep) eatTap(id);
  return true;
}
export function hold(id) { id = toolOf(id); const s = sv(); if (!s || !id) return false; sync(); if (mobile()) { s.mHeld = id; if (deps.onHold) deps.onHold(id); render(true); return true; }
  if (id === WEAPON) { select(-1); return true; }
  if (isTool(id)) { s.tHeld = id; tT = TOOL_IDLE; render(true); return true; }   /* p91 đợt F: công cụ = tay ảo, không chiếm ô */
  let i = s.hotbar.indexOf(id); if (i < 0) { i = s.hotbar.indexOf(null); if (i < 0) i = s.hotSel >= 0 ? s.hotSel : 0; s.hotbar[i] = id; } select(i); return true; }
export function firstEmpty(id) { const s = sv(); if (!s) return -1; sync(); const j = s.hotbar.indexOf(id); if (j >= 0) return j; return s.hotbar.indexOf(null); }
export function putAt(i, id) { const s = sv(); if (!s || i < 0 || i >= N || id === WEAPON || isTool(id)) return; s.hotbar[i] = id; deps.CTX.persist(); render(true); }
export function setSlot(i, id) { const s = sv(); sync(); if (id === WEAPON) { select(-1); return; } if (isTool(id)) { deps.CTX.toast(deps.CTX.lang() === 'vi' ? 'Công cụ tự dùng khi bấm vào việc — không cần lên ô' : 'Tools are used automatically — no slot needed'); return; } if (!(i >= 0 && i < N)) i = Math.max(0, s.hotbar.indexOf(null)); const j = s.hotbar.indexOf(id); if (j >= 0) s.hotbar[j] = s.hotbar[i]; s.hotbar[i] = id; deps.CTX.persist(); render(true); }

export function eatHeld() { if (off) return false; return eatItem(held()); }
export function eatItem(id) {
  if (!deps || kindOf(id) !== 'food') return false;
  const C = deps.CTX, p = deps.S.player; if (!C.bag.has(id, 1)) return false;
  C.bag.remove(id, 1);
  if (p.hasAct && p.hasAct('eat') && !p.custom) { p.dir = 0; p.act('eat', 0); }
  p.fedT = 30; if (C.hero) C.hero.heal(ITEMS[id] && ITEMS[id].heal ? Math.round(C.hero.max * ITEMS[id].heal) : 25); C.sfx('pickup');
  const vi = C.lang() === 'vi', nm = itemName(id, vi ? 'vi' : 'en');
  C.toast(vi ? `Ngon quá, ${nm}! Thấy khoẻ khoắn — đi nhanh hơn 30 giây` : `Yum, ${nm}! You feel lively — walking faster for 30 s`);
  sync(); render(true); C.persist(); return true;
}
const hpFull = () => { const h = deps && deps.CTX.hero; return !!(h && h.hp >= h.max); };
function eatTap(id) {
  if (hpFull()) { deps.CTX.toast(deps.CTX.lang() === 'vi' ? 'Máu đang đầy — chưa cần ăn' : 'HP is full — no need to eat'); return false; }
  return eatItem(id);
}
export function pickFood() {
  const s = sv(); if (!s) return null; const h = deps.CTX.hero, lost = h ? (h.max - h.hp) / h.max : 0;
  const has = id => (s.inv[id] || 0) > 0, heal = Object.keys(ITEMS).filter(id => kindOf(id) === 'food' && ITEMS[id].heal && has(id)).sort((a, b) => ITEMS[b].heal - ITEMS[a].heal);
  if (heal.length && lost >= ITEMS[heal[0]].heal) return heal[0];
  let best = null, bn = 0;
  for (const id of Object.keys(ITEMS)) { if (kindOf(id) !== 'food' || ITEMS[id].heal) continue; const n = s.inv[id] || 0; if (n > bn) { bn = n; best = id; } }
  return best || heal[heal.length - 1] || null;
}
export function eatBest() { const id = pickFood(); if (!id) { deps.CTX.toast(deps.CTX.lang() === 'vi' ? 'Không có gì để ăn' : 'Nothing to eat'); return false; } return eatTap(id); }

export const iconId = id => (id === 'sword' && deps ? `sword_t${Math.max(1, deps.CTX.tool.tier('sword'))}` : id);
function itemSrc(id) { const man = deps.ART && deps.ART.man, f = man && man.ui && man.ui.items && (man.ui.items[iconId(id)] || man.ui.items[id]); return f ? 'assets/px/' + f : null; }
function iconHTML(id) { const f = itemSrc(id); return f ? `<img src="${f}" alt="">` : `<span class="hb-emo">${itemIcon(id)}</span>`; }

/* ================= KỸ NĂNG ô 1–5 ================= */
const H91 = 'assets/px/ui/hud91/';
const DO = { open: false };
const PH91 = typeof location !== 'undefined' && /[?&]hud91m/.test(location.search);   /* đợt D (điện thoại) HOÃN theo anh 02/11 — bản nháp chỉ bật bằng ?hud91m; mặc định điện thoại giữ HUD cũ */   /* điện thoại: hàng đồ 6–0 đang mở */
const hud91 = k => { const m = deps.ART && deps.ART.man, u = m && m.ui && m.ui.hud91; return 'assets/px/' + ((u && u[k]) || `ui/hud91/${k}.png`); };
const T = () => (deps.CTX.lang() === 'vi' ? {
  atk: 'Đánh', rk: 'Rocky-ha', dash: 'Lướt Ki', call: 'Gọi linh thú', back: 'Thu linh thú', fuse: 'Hợp Thể', dragon: 'Rồng Thần Giáng',
  noRk: 'Chưa có Rocky', noHa: 'Rocky chưa học Rocky-ha', rkBusy: 'Rocky đang bận / đang nghỉ', cd: 'Đang hồi chiêu', noLt: 'Chưa có linh thú — bắt ở ổ linh thú các vùng', lowKi: 'Chưa đủ Ki',
  lock5: 'Mở khi có Rocky (Hợp Thể) hoặc Rồng Thần', tipAtk: 'Ô 1 · Đánh — cầm vũ khí; E / chuột trái để chém mục tiêu', hp: 'Máu', ki: 'Ki', xp: 'Kinh nghiệm', lv: 'Cấp',
  doBtn: 'Đồ', bag: 'Túi đồ (B)', rkCmd: 'Ra lệnh cho Rocky (phím /)', items: 'Ô 6–0: đồ', skills: 'Ô 1–5: kỹ năng', ht: 'Hợp Thể', eat: 'R: ăn nhanh',
} : {
  atk: 'Attack', rk: 'Rocky-ha', dash: 'Ki Dash', call: 'Call spirit beasts', back: 'Recall spirit beasts', fuse: 'Fusion', dragon: 'Dragon Dive',
  noRk: 'No Rocky yet', noHa: "Rocky hasn't learned Rocky-ha", rkBusy: 'Rocky is busy / resting', cd: 'Cooling down', noLt: 'No spirit beasts yet — catch them at the beast dens', lowKi: 'Not enough Ki',
  lock5: 'Unlocks with Rocky (Fusion) or the Dragon', tipAtk: 'Slot 1 · Attack — hold your weapon; E / left-click to strike the target', hp: 'HP', ki: 'Ki', xp: 'EXP', lv: 'Lv',
  doBtn: 'Items', bag: 'Bag (B)', rkCmd: 'Command Rocky (key /)', items: 'Slots 6–0: items', skills: 'Slots 1–5: skills', ht: 'Fusion', eat: 'R: quick eat',
});
const rk = () => deps.CTX.rocky && deps.CTX.rocky.pet && deps.CTX.rocky.pet() ? deps.CTX.rocky : null;
const htOn = () => !!(deps.CTX.hopthe && deps.CTX.hopthe.on && deps.CTX.hopthe.on());
const dragonSv = () => { const s = sv(); return (s && s.sys && s.sys.dragon) || null; };
const dragonOk = () => { const d = dragonSv(); return !!(d && d.got && d.got.skill); };
function ltState() { const L = deps.CTX.linhthu; return !mobile() && L && L.slot && L.press ? L.slot() : null; }
function kiState() { try { return window.__ki ? window.__ki.state() : null; } catch (e) { return null; } }
const HT_SLOTS = [   /* = hopthe.js SLOTS (ảnh + tên); trạng thái / hồi chiêu đọc từ window.__hopthe */
  { id: 'hacha', vi: 'Hắc-ha Cong', en: 'Curved Shadow-ha', cd: 4 }, { id: 'nhipchan', vi: 'Nhịp Chấn', en: 'Quake Beat' }, { id: 'tiaguong', vi: 'Tia Gương', en: 'Mirror Ray' },
  { id: 'trongluc', vi: 'Trọng Lực', en: 'Gravity' }, { id: 'longmach', vi: 'Long Mạch Lôi Thần', en: 'Dragon-Vein Thunder', ult: true },
];
function skillInfo(i) {   /* → { icon, name, lock, cd (giây), cdMax, dim, cls, extra } */
  const t = T(), C = deps.CTX;
  if (htOn()) {
    const sl = HT_SLOTS[i], st = window.__hopthe ? window.__hopthe.state() : { cds: {} }, sys = sv().sys || {};
    const un = sl.id === 'hacha' ? ((sys.hacrocky || {}).wins || 0) > 0 : false;
    return { icon: `assets/px/hopthe/icons/${sl.ult ? 'ult_' : 'sk_'}${sl.id}.png`, name: C.lang() === 'vi' ? sl.vi : sl.en, lock: !un, cd: st.cds[sl.id] || 0, cdMax: sl.cd || 1, cls: 'ht' };
  }
  if (i === 0) { const sw = owned(WEAPON); return { icon: sw ? itemSrc(WEAPON) : hud91('sk_atk'), name: t.atk, on: sv().hotSel === -1, tip: t.tipAtk }; }
  if (i === 1) { const R = rk(); if (!R) return { icon: hud91('sk_rkha'), name: t.rk, lock: true, tip: t.noRk };
    const why = R.haWhy ? R.haWhy() : 'ok', m = /cd([\d.]+)/.exec(why), noTier = /(^|,)tier/.test(why);
    return { icon: hud91('sk_rkha'), name: t.rk, lock: noTier, tip: noTier ? t.noHa : t.rk + ' (2)', cd: m ? +m[1] : 0, cdMax: 6, dim: !m && why !== 'ok' && !noTier }; }
  if (i === 2) { const k = kiState(), cd = k ? k.cd.dash : 0, low = k ? k.ki < 1 : false; return { icon: hud91('sk_dash'), name: t.dash, cd, cdMax: 0.8, dim: low, tip: low ? t.lowKi : t.dash + ' (3)' }; }
  if (i === 3) { const o = ltState(); if (!o || !o.has) return { icon: hud91('sk_call'), name: t.call, lock: true, tip: t.noLt, lt: o };
    return { icon: o.shell, pet: o.pet && o.st === 'in' ? o.pet : null, name: o.st === 'out' ? t.back : t.call, cd: o.st === 'rest' ? o.rest : 0, cdMax: 60, dim: !o.n, lt: o, tip: (o.st === 'out' ? t.back : t.call) + ' (4 / U)' }; }
  if (dragonOk()) { const d = dragonSv(), left = Math.max(0, ((d.skillAt || 0) - Date.now()) / 1000); return { icon: 'assets/px/dragon/skill_icon.png', name: t.dragon, cd: left, cdMax: 60, tip: t.dragon + ' (5 / G)' }; }
  if (rk() && deps.CTX.hopthe) { const ct = deps.CTX.hopthe.cdText ? deps.CTX.hopthe.cdText() : ''; return { icon: hud91('sk_fuse'), name: t.fuse, cdTxt: ct, tip: t.fuse + ' (5)' }; }
  return { icon: hud91('sk_fuse'), name: t.fuse, lock: true, tip: t.lock5 };
}
function aimHa() {   /* ô 2: Rocky-ha nhắm con đang khoá → con gần nhất trong 10 ô → hướng nhìn của người chơi */
  const C = deps.CTX, R = rk(), e = R && R.ent && R.ent(); if (!e) return null;
  const lk = C.target && C.target.get && C.target.get(); let q = null;
  if (lk && (lk.kind === 'mon' || lk.kind === 'tent')) { const r = lk.mo || lk.ref; q = { x: r.x, y: r.y - 6 }; }
  if (!q && C.monsters && C.monsters.list) { let bd = 160; for (const mo of C.monsters.list()) { if (mo.hp <= 0 || mo.statue || (mo.c && mo.c.spar)) continue; const d = Math.hypot(mo.x - e.x, mo.y - e.y); if (d < bd) { bd = d; q = { x: mo.x, y: mo.y - 6 }; } } }
  if (q) return Math.atan2(q.y - (e.y - 7), q.x - e.x);
  const p = deps.S.player, D = [[0, 1], [-1, 0], [1, 0], [0, -1]][p.dir || 0]; return Math.atan2(D[1], D[0]);
}
export function skill(i) {
  const C = deps.CTX, t = T(); if (deps.S.mode !== 'play') return false;
  if (htOn()) { if (window.__hopthe) window.__hopthe.use(i); render(true); return true; }   /* ô 5 = tuyệt chiêu Hợp Thể (trước: R) */
  if (i === 0) { if (mobile()) hold(WEAPON); else select(-1); return true; }
  if (i === 1) { const R = rk(); if (!R) { C.toast(t.noRk); C.sfx('fail'); return false; }
    if (!(R.haReady && R.haReady())) { const why = R.haWhy ? R.haWhy() : ''; C.toast(/tier/.test(why) ? t.noHa : /cd/.test(why) ? t.cd : t.rkBusy); C.sfx('fail'); return false; }
    const a = aimHa(); const ok = a != null && R.haFire(a); render(true); return ok; }
  if (i === 2) { const ok = C.ki && C.ki.dash ? C.ki.dash() : false; render(true); return ok; }
  if (i === 3) { const o = ltState(); if (!o || !o.has) { C.toast(t.noLt); C.sfx('fail'); return false; } C.linhthu.press(); render(true); return true; }
  if (dragonOk()) { const d = (deps.S.sys || []).find(s => s && s.id === 'dragon'); if (d && d.key) d.key('KeyG', C); render(true); return true; }
  if (rk() && C.hopthe && C.hopthe.fuse) { C.hopthe.fuse(); render(true); return true; }
  C.toast(t.lock5); C.sfx('fail'); return false;
}
export const skillState = () => [0, 1, 2, 3, 4].map(i => { const s = skillInfo(i); return { name: s.name, lock: !!s.lock, cd: +(s.cd || 0).toFixed(1), dim: !!s.dim, ht: s.cls === 'ht' }; });

/* ================= chân dung người chơi (cắt từ sprite đang mặc, PixelLab gốc) ================= */
const PORT = { url: null, t: -9, key: '' };
function portrait() {
  const p = deps.S.player, now = performance.now() / 1000; if (!p || typeof document === 'undefined') return PORT.url;
  const key = [p.sheet && (p.sheet.src || p.sheet.width), !!p.custom, deps.S.save.outfit && JSON.stringify(deps.S.save.outfit)].join('|');
  if (PORT.url && key === PORT.key && now - PORT.t < 30) return PORT.url;
  try {
    const K = 2, W = 48, H = 48, c = document.createElement('canvas'); c.width = W * K; c.height = H * K; const g = c.getContext('2d'); g.imageSmoothingEnabled = false; g.scale(K, K);
    const px = Object.create(p); px.x = 24; px.y = 44; px.dir = 0; px.action = null; px.moving = false; px.idleT = 0; px.frame = 0;
    Entity.prototype.draw.call(px, g);
    const d = g.getImageData(0, 0, c.width, c.height).data; let y0 = -1, x0 = c.width, x1 = -1;
    for (let y = 0; y < c.height && y0 < 0; y++) for (let x = 0; x < c.width; x++) if (d[(y * c.width + x) * 4 + 3] > 60) { y0 = y; break; }
    if (y0 < 0) return PORT.url;
    for (let y = y0; y < Math.min(c.height, y0 + 13 * K); y++) for (let x = 0; x < c.width; x++) if (d[(y * c.width + x) * 4 + 3] > 60) { if (x < x0) x0 = x; if (x > x1) x1 = x; }
    const cx = (x0 + x1) / 2, S2 = 15 * K, o = document.createElement('canvas'); o.width = S2; o.height = S2; const og = o.getContext('2d'); og.imageSmoothingEnabled = false;
    og.drawImage(c, Math.round(cx - S2 / 2), y0 - K, S2, S2, 0, 0, S2, S2);
    PORT.url = o.toDataURL(); PORT.key = key; PORT.t = now;
  } catch (e) { /* sprite chưa nạp */ }
  return PORT.url;
}

/* ================= vẽ cụm ================= */
let cssDone = false;
function css() {
  if (cssDone || typeof document === 'undefined') return; cssDone = true;
  const st = document.createElement('style'); st.id = 'h91-style';
  st.textContent = `
@media (pointer:fine){
 body.h91 #herobar{display:none!important}
 body.h91 #ht-bar:not(.arc){display:none!important}
 #hotbar.h91{gap:2px;bottom:6px}
 body.h91 #px-notes .pn{max-width:max(220px,calc(50vw - 300px))}
}
 #hotbar .h91-top{display:flex;align-items:center;gap:0;pointer-events:none;position:relative}
 #hotbar .h91-hp{position:relative;width:232px;height:22px;box-sizing:border-box;border:6px solid transparent;border-image:url(${H91}obar.png) 6 fill / 6px stretch;image-rendering:pixelated;margin-right:-6px}
 #hotbar .h91-hp i{position:absolute;left:0;top:0;bottom:0;background:#e84a3a;box-shadow:inset 0 2px 0 #ff8a7a,inset 0 -2px 0 #a8261c}
 #hotbar .h91-hp b,#hotbar .h91-kin{position:absolute;right:6px;top:50%;transform:translateY(-52%);font:16px/1 VT323,monospace;color:#fff6c8;text-shadow:1px 1px 0 #352022,-1px 0 0 #352022,0 -1px 0 #352022,1px 0 0 #352022;white-space:nowrap}
 #hotbar .h91-hp em{position:absolute;left:4px;top:50%;transform:translateY(-52%);font:14px/1 VT323,monospace;font-style:normal;color:#ffd0c8;text-shadow:1px 1px 0 #352022}
 #hotbar .h91-port{position:relative;width:56px;height:56px;flex:none;z-index:2;margin:-14px 0 -8px}
 #hotbar .h91-port .pf{position:absolute;inset:0;width:56px;height:56px;image-rendering:pixelated}
 #hotbar .h91-port .pi{position:absolute;left:10px;top:10px;width:36px;height:36px;image-rendering:pixelated;border-radius:3px;background:#3a2a22}
 #hotbar .h91-port .lv{position:absolute;right:-8px;bottom:-4px;width:24px;height:24px;background:url(${H91}lvbadge.png) center/100% 100% no-repeat;image-rendering:pixelated;font:15px/24px VT323,monospace;text-align:center;color:#fff6c8;text-shadow:1px 1px 0 #352022}
 #hotbar .h91-ki{position:relative;width:232px;height:22px;box-sizing:border-box;border:6px solid transparent;border-image:url(${H91}obar.png) 6 fill / 6px stretch;image-rendering:pixelated;margin-left:-6px;display:flex;align-items:center;justify-content:flex-start;gap:3px;padding-left:12px}
 #hotbar .h91-ki i{display:block;width:16px;height:16px;margin:-3px 0;background:url(${H91}kioff.png) center/100% 100% no-repeat;image-rendering:pixelated}
 #hotbar .h91-ki i.on{background-image:url(${H91}kion.png)}
 #hotbar .h91-ki i.half{background-image:url(${H91}kion.png);opacity:.45}
 #hotbar .h91-ki.glow i.on{filter:brightness(1.35)}
 #hotbar .h91-xp{position:relative;width:520px;height:10px;box-sizing:border-box;border:3px solid transparent;border-image:url(${H91}obar_s.png) 3 fill / 3px stretch;image-rendering:pixelated;pointer-events:none;margin-top:1px}
 #hotbar .h91-xp i{position:absolute;left:0;top:0;bottom:0;background:#ffd45e;box-shadow:inset 0 -2px 0 #c8962c}
 #hotbar .h91-xp b{position:absolute;right:2px;top:-15px;font:13px/1 VT323,monospace;color:#ffe9a8;text-shadow:1px 1px 0 #352022}
 #hotbar .h91-sep{width:10px;height:40px;align-self:center;background:url(${H91}sep.png) center/contain no-repeat;image-rendering:pixelated;margin:0 3px}
 #hotbar .hb-slot.sk .hb-k,#hotbar .hb-slot .hb-k{left:-4px;top:-7px;font:13px VT323,monospace;color:#fff6c8;text-shadow:1px 1px 0 #352022,-1px 0 0 #352022,0 -1px 0 #352022,1px 0 0 #352022}
 #hotbar .hb-slot .cd{position:absolute;inset:-6px;background:rgba(10,6,4,.62);display:flex;align-items:center;justify-content:center;font:16px/1 VT323,monospace;color:#fff;text-shadow:1px 1px 0 #000;pointer-events:none}
 #hotbar .hb-slot.lock img{filter:grayscale(1) brightness(.5)}
 #hotbar .hb-slot.lock .lk{position:absolute;right:-6px;top:-6px;width:14px;height:14px;margin:0;image-rendering:pixelated}
 #hotbar .hb-slot.dim img{opacity:.55}
 #hotbar .hb-slot .bar{position:absolute;left:-4px;right:-4px;bottom:-7px;height:2px;pointer-events:none}
 #hotbar .hb-slot.sk .pe{position:absolute;left:3px;top:3px;width:18px;height:18px;margin:0}
 #hotbar .h91-ex{display:flex;gap:2px;margin-left:6px}
 #hotbar .h91-ex .hb-slot,#hotbar .h91-ex .hb-bag{width:34px;height:34px;border-width:6px;border-image-width:6px}
 #hotbar .h91-ex img{width:24px;height:24px;margin:-5px}
 #hotbar .h91-ht{position:absolute;left:4px;top:-17px;font:15px/1 VT323,monospace;color:#e9d6ff;border:3px solid transparent;border-image:url(${H91}obar_s.png) 3 fill / 3px stretch;image-rendering:pixelated;padding:0 4px;white-space:nowrap;top:-20px}
 body.ld-on #hotbar .h91-top,body.ld-on #hotbar .h91-xp{visibility:hidden}
@media (pointer:coarse){
 html body #hotbar.h91m{display:flex!important;left:0;right:0;bottom:0;transform:none;width:auto;flex-direction:column;align-items:stretch;gap:2px;padding:4px 6px calc(4px + env(safe-area-inset-bottom,0px));box-sizing:border-box;border:8px solid transparent;border-image:url(assets/px/ui/npick/panel.png) 12 fill / 8px round;image-rendering:pixelated;z-index:9}
 html body #hotbar.h91m[hidden]{display:none!important}
 body.h91m #herobar{display:none!important}
 body.h91m #ht-bar.arc{display:none!important}
 body.h91m #touch .dpad{bottom:calc(var(--h91h,150px) + 4px)!important}
 body.h91m #btn-a{bottom:calc(var(--h91h,150px) + 26px)!important}
 body.h91m #btn-tgt{bottom:calc(var(--h91h,150px) + 4px)!important}
 body.h91m #px-notes .pn{max-width:calc(100vw - 30px)}
 #hotbar.h91m .h91-top{width:100%}
 #hotbar.h91m .h91-hp,#hotbar.h91m .h91-ki{flex:1;width:auto;height:20px}
 #hotbar.h91m .h91-ki{padding-left:6px;gap:1px} #hotbar.h91m .h91-ki i{width:13px;height:13px}
 #hotbar.h91m .h91-kin{display:none}
 #hotbar.h91m .h91-port{width:46px;height:46px;margin:-10px 0 -6px} #hotbar.h91m .h91-port .pf{width:46px;height:46px} #hotbar.h91m .h91-port .pi{left:8px;top:8px;width:30px;height:30px}
 #hotbar.h91m .h91-xp{width:100%;height:8px;border-width:2px;border-image-width:2px}
 #hotbar.h91m .h91-xp b{display:none}
 #hotbar.h91m .hb-bar{display:flex!important;justify-content:space-between;gap:3px;border:0;padding:0}
 #hotbar.h91m .hb-slot{flex:1;width:auto!important;height:50px!important;max-width:62px;border-width:8px!important;border-image-width:8px!important}
 #hotbar.h91m .hb-slot img{width:32px;height:32px;margin:-6px}
 #hotbar.h91m .hb-slot .hb-k{display:none}
 #hotbar.h91m .h91-do{flex:1.1;max-width:70px}
 #hotbar.h91m .h91-do .lt-l{position:absolute;left:-6px;right:-6px;bottom:-8px;text-align:center;font:14px/1 VT323,monospace;font-style:normal;color:#fff6c8;text-shadow:1px 1px 0 #352022,-1px 0 0 #352022}
 #hotbar.h91m .h91-it{display:none;justify-content:space-between;gap:3px}
 #hotbar.h91m.open .h91-it{display:flex}
}`;
  document.head.appendChild(st);
}
const pc = () => !mobile() && !(MQ && MQ.matches);
function topHTML(lg) {
  const C = deps.CTX, t = T(), h = C.hero; if (!h) return '';
  const hp = Math.max(0, Math.ceil(h.hp)), mx = h.max, s = sv(), hs = s.hero || { xp: 0, lv: 1 }, need = 50 * (hs.lv || 1), xp = hs.xp || 0;
  const ki = C.ki ? C.ki.get() : 0, KM = C.ki ? C.ki.max : 7; let orbs = '';
  for (let i = 0; i < KM; i++) { const f = ki - i; orbs += `<i class="${f >= 1 - 1e-6 ? 'on' : f > 0.5 ? 'half' : ''}"></i>`; }
  const pu = portrait();
  return `<div class="h91-top"><div class="h91-hp" title="${t.hp} ${hp}/${mx}"><i style="width:${Math.round(hp / mx * 100)}%"></i><em>${t.hp}</em><b>${hp}/${mx}</b></div>`
    + `<div class="h91-port"><img class="pf" src="${H91}port.png" alt="">${pu ? `<img class="pi" src="${pu}" alt="">` : ''}<span class="lv" title="${t.lv} ${h.lv}">${h.lv}</span></div>`
    + `<div class="h91-ki" title="${t.ki} ${Math.floor(ki + 1e-6)}/${KM}">${orbs}<span class="h91-kin">${Math.floor(ki + 1e-6)}/${KM}</span></div>`
    + (htOn() && window.__hopthe ? (() => { const st = window.__hopthe.state(), V = C.lang() === 'vi'; return `<span class="h91-ht">${t.ht} · ${st.worn ? '∞' : Math.floor(st.left / 60) + ':' + String(Math.floor(st.left % 60)).padStart(2, '0')} · ${V ? 'năng lượng' : 'energy'} ${st.e}</span>`; })() : '')
    + `</div><div class="h91-xp" title="${t.xp} ${xp}/${need}"><i style="width:${Math.min(100, Math.round(xp / need * 100))}%"></i><b>EXP ${Math.min(100, Math.round(xp / need * 100))}%</b></div>`;
}
const cdTxt = c => (c >= 10 ? Math.ceil(c) + 's' : c.toFixed(1) + 's');
function skillHTML(i) {
  const s = skillInfo(i), lockImg = 'assets/px/hopthe/icons/lock.png', col = ['#c9c9c9', '#ff9a3a', '#5ad1ff', '#7bd04a', '#c58bff'][i];
  const lt = i === 3 && s.lt && !htOn() ? ' hb-lt' : '';
  return `<div class="hb-slot sk${s.on ? ' on' : ''}${s.lock ? ' lock' : ''}${s.dim ? ' dim' : ''}${lt}" data-sk="${i}" title="${esc(s.name + (s.tip && s.tip !== s.name ? ' — ' + s.tip : ''))}">`
    + `<i class="hb-k">${i + 1}</i>${s.icon ? `<img src="${s.icon}" alt="">` : ''}${s.pet ? `<img class="pe" src="${s.pet}" alt="">` : ''}${s.lock ? `<img class="lk" src="${lockImg}" alt="">` : ''}`
    + `${s.cd > 0.05 ? `<span class="cd">${cdTxt(s.cd)}</span>` : s.cdTxt ? `<span class="cd">${s.cdTxt}</span>` : ''}<b class="bar" style="background:${col}"></b></div>`;
}
const hasRk = () => !!rk();
const c79Api = () => { const C = deps && deps.CTX.comp79; return !mobile() && C && C.slot && C.press ? C : null; };
const c79Slot = () => { const C = c79Api(); return C ? C.slot() : null; };
const esc = s => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
const openSeal = () => import('./menu.js').then(m => m.openMenu && m.openMenu('anlinh')).catch(() => { });
export function render(force) {
  if (!el) return;
  { const m = deps.ART && deps.ART.man; if (m && m.ui) { const it = (m.ui.items ||= {}); if (!it.bua) it.bua = 'ui/items/bua.png'; } }
  const hide = hidden(); el.hidden = hide;
  const mob = mobile() && PH91; if (typeof document !== 'undefined') { document.body.classList.toggle('h91', !hide && pc()); document.body.classList.toggle('h91m', !hide && mob); }
  if (hide) return;
  sync(); css(); el.classList.add('h91'); el.classList.toggle('h91m', mob); el.classList.toggle('open', mob && DO.open);
  const s = sv(), lg = deps.CTX.lang() === 'vi' ? 'vi' : 'en', h = deps.CTX.hero, c79 = c79Slot();
  const sk = [0, 1, 2, 3, 4].map(skillInfo).map(x => [x.icon, x.lock, x.dim, x.on, Math.round((x.cd || 0) * 10), x.cdTxt, x.name, x.pet].join(','));
  const ki = deps.CTX.ki ? Math.round(deps.CTX.ki.get() * 2) : 0, hs = s.hero || {};
  const key = JSON.stringify([sk, h ? [Math.ceil(h.hp), h.max, h.lv] : 0, hs.xp, ki, PORT.url && PORT.url.length, hasRk(), c79 && [c79.out, c79.sp, c79.lbl], s.hotbar, s.hotSel, mob && s.mHeld, mob && DO.open, s.hotbar.map(id => (id && !isTool(id) ? s.inv[id] || 0 : 0)), lg, tipT > 0, htOn() && window.__hopthe ? Math.round(window.__hopthe.state().e) + '|' + Math.floor(window.__hopthe.state().left) : 0]);
  if (!force && key === sig) return; sig = key;
  const cur = held(), t = T();
  const items = s.hotbar.map((id, i) => {
      const n = id && !isTool(id) ? s.inv[id] || 0 : 0;
      return `<div class="hb-slot${(mob ? id && id === s.mHeld : i === s.hotSel) ? ' on' : ''}" data-i="${i}" title="${id ? esc(itemName(id, lg)) : ''}"><i class="hb-k">${LABEL[i]}</i>${id ? iconHTML(id) : ''}${n > 1 ? `<b class="hb-n">${n}</b>` : ''}</div>`;
    }).join('');
  if (mob) {   /* p91 đợt D: điện thoại — cụm ngang đáy màn, 5 ô kỹ năng to + nút Đồ (mở hàng 6–0) */
    const fd = pickFood(), fn = fd ? s.inv[fd] || 0 : 0;
    el.innerHTML = topHTML(lg) + `<div class="h91-it">${items}</div><div class="hb-bar">` + [0, 1, 2, 3, 4].map(skillHTML).join('')
      + `<div class="hb-slot h91-do" title="${esc(t.items)}">${fd ? iconHTML(fd) : `<img src="assets/px/ui/tab_bag.png" alt="">`}${fn > 1 ? `<b class="hb-n">${fn}</b>` : ''}<i class="lt-l">${t.doBtn}${DO.open ? '▼' : '▲'}</i></div></div>`;
    requestAnimationFrame(() => { const hh = el.offsetHeight; if (hh) document.documentElement.style.setProperty('--h91h', (DO.open ? hh - 58 : hh) + 'px'); });   /* nút cảm ứng (#touch) nâng lên trên cụm; hàng đồ mở thì đè tạm */
    return;
  }
  el.innerHTML = `<div class="hb-tip"${tipT > 0 && cur ? '' : ' hidden'}>${cur ? itemName(cur, lg) : ''}</div>` + topHTML(lg) + `<div class="hb-bar">`
    + [0, 1, 2, 3, 4].map(skillHTML).join('') + `<b class="h91-sep" title="${esc(t.skills + ' · ' + t.items)}"></b>` + items
    + `<div class="h91-ex">${hasRk() ? `<div class="hb-slot hb-rk" title="${esc(t.rkCmd)}">${deps.ART && deps.ART.man && deps.ART.man.ui && deps.ART.man.ui.port_rocky ? `<img src="assets/px/${deps.ART.man.ui.port_rocky}" alt="">` : '🪨'}<i class="hb-v">/</i></div>` : ''}`
    + `${c79 ? `<div class="hb-slot hb-c79${c79.out ? ' st-out' : ''}" title="${esc(c79.tip)}"><img src="assets/px/duel/orb/orb_icon.png" alt=""><i class="hb-v">J</i></div>` : ''}`
    + `<div class="hb-bag" title="${esc(t.bag)}"><img src="assets/px/ui/tab_bag.png" alt=""></div></div></div>`;
}
let rT = 0;
export function tick(dt) { if (tT > 0 && (tT -= dt) <= 0) { const s = sv(); if (s && s.tHeld && !mobile()) { s.tHeld = null; render(true); } } if (tipT > 0) { tipT -= dt; if (tipT <= 0) { render(true); rT = 0.1; return; } } if ((rT -= dt) > 0) return; rT = 0.1; render(false); }

export function initHotbar(d) {
  deps = d;
  el = document.createElement('div'); el.id = 'hotbar'; el.hidden = true; document.body.appendChild(el);
  let ltHold = null;
  const ltUp = e => { if (!ltHold) return; clearTimeout(ltHold.tm); const fire = !ltHold.done && e.type === 'pointerup'; ltHold = null; if (fire) skill(3); };
  el.addEventListener('pointerdown', e => { const t = e.target.closest('.hb-lt'); if (!t) return; e.preventDefault(); e.stopPropagation(); if (e.button !== 0) return;
    ltHold = { tm: setTimeout(() => { if (ltHold) { ltHold.done = true; openSeal(); } }, 450) }; }, true);
  addEventListener('pointerup', ltUp); addEventListener('pointercancel', ltUp);
  el.addEventListener('contextmenu', e => { if (!e.target.closest('.hb-lt')) return; e.preventDefault(); e.stopPropagation(); if (ltHold) { clearTimeout(ltHold.tm); ltHold = null; } openSeal(); });
  el.addEventListener('pointerdown', e => {
    if (e.target.closest('.hb-c79')) { e.preventDefault(); e.stopPropagation(); const C = c79Api(); if (C) C.press(); render(true); return; }
    if (e.target.closest('.hb-bag')) { e.preventDefault(); e.stopPropagation(); if (deps.openBag) deps.openBag(); return; }
    if (e.target.closest('.hb-rk')) { e.preventDefault(); e.stopPropagation(); if (deps.CTX.rocky && deps.CTX.rocky.openChat) deps.CTX.rocky.openChat(); return; }
    const k = e.target.closest('[data-sk]'); if (k) { e.preventDefault(); e.stopPropagation(); skill(+k.dataset.sk); return; }
    if (e.target.closest('.h91-do')) { e.preventDefault(); e.stopPropagation(); DO.open = !DO.open; render(true); return; }
    const s = e.target.closest('.hb-slot[data-i]'); if (!s) return; e.preventDefault(); e.stopPropagation(); if (mobile()) { const id = sv().hotbar[+s.dataset.i]; if (id) { if (kindOf(id) === 'food') eatTap(id); else hold(id); } DO.open = false; render(true); return; } select(+s.dataset.i);
  });
  const cv = d.canvas;
  cv.addEventListener('wheel', e => { if (hidden() || (window.__altWheel && window.__altWheel())) return; e.preventDefault(); cycle(e.deltaY > 0 ? 1 : -1); }, { passive: false });
  cv.addEventListener('contextmenu', e => { if (hidden()) return; e.preventDefault(); eatHeld(); });
  if (typeof window !== 'undefined') window.__hb91 = { skill, skillState, migrate, held, sel: () => sv() && sv().hotSel, bar: () => sv() && sv().hotbar.slice(), bag: () => bagSlots().slice(), portrait: () => PORT.url };
}
