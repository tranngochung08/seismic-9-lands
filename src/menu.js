// menu.js — plan-10: menu phụ kiểu RPG pixel (Esc / B / Q / I): Túi đồ · Nhân vật · Nhiệm vụ · Cài đặt.
// Không dừng thế giới: mode 'menu' chỉ khóa điều khiển người chơi (main.js), hệ thống vẫn chạy; nội dung tự làm mới mỗi 1,5 s.
// Asset PixelLab qua manifest.ui (assets/px/ui/*): khung viền 9 mảnh, icon vật phẩm, icon thẻ/trạng thái. Không có ảnh → emoji + viền CSS.
import { ART } from './art.js';
import { ITEMS, TOOLS, itemName } from './items.js';
import { ZONE_LIST } from './world.js';
import { membersOfLevel } from './data.js';
import * as UI from './ui.js';
import { questRows } from './systems/quests.js';
import { bagPrice, sellFromBag } from './systems/market.js';

const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const ROMAN = ['', 'I', 'II', 'III'];
const TABS = ['bag', 'hero', 'quest', 'gear'];
const STR = {
  en: {
    tabs: { bag: 'Bag', hero: 'Character', quest: 'Quests', gear: 'Settings' }, foot: 'Esc · close   ·   ← → or 1-4 · tabs   ·   B bag · Q quests',
    equip: 'Equipment', progress: 'Progress', items: 'Items', load: 'Bag load', empty: 'Nothing in the bag yet — chop, mine, gather.', tipHint: 'Hover or tap a slot to read about it.',
    locked: 'Not crafted yet', weight: 'weight', count: 'count', sell: 'Sell at the village trader', sell1: 'Sell 1', sellAll: 'Sell all', sellHere: 'sell right from the bag', material: 'Crafting / building material', story: 'Story item',
    fl: { raft: 'Raft', sail: 'Sail', wax: 'Ski wax', tires: 'Obsidian tires', cape: 'Rocky cape', armor: 'Rocky armour', coat: 'Warm coat', lamps: 'Crystal lamps', charged: 'Rocky charges' },
    stats: { str: 'Strength', agi: 'Agility', def: 'Defense', cap: 'Capacity', skill: 'Skill', rep: 'Reputation' },
    statHint: { str: 'Axe & pickaxe tiers', agi: 'Walk · ski wax · obsidian tires · sail · saddle', def: 'Rocky armour · warm coat · iron bucket', cap: 'Bag · bucket · cage · cart', skill: 'Fishing rod · crystal lamps · Rocky charges', rep: 'Artists met · badges · Rockies woken' },
    next: 'Next: ', up: 'up since last time', down: 'down since last time', same: '',
    nextStr: { 1: 'Axe I at the workbench (5 wood) · Pickaxe I (6 wood + 2 rock)', 2: 'Axe/Pickaxe II at the furnace M4/M5 (3 iron + 2 wood)', 3: 'Axe/Pickaxe III at the forge M7/M8 (4 obsidian + 2 iron)' },
    nextAgi: 'Ski wax (M8 workbench: 2 wax) · Obsidian tires (forge) · Sail (loom: 6 wool + 2 rope) · Saddle (workbench)',
    nextDef: 'Rocky armour (forge: worm hide + 4 obsidian) · Warm coat (loom: yeti fur + 4 wool) · Iron bucket (furnace: 2 iron)',
    nextCap: 'Bucket / Cage / Cart at the workbench, upgrade at the furnace and forge', nextSkill: 'Rod II (furnace) · Rod III (altar M9) · Crystal lamp (altar: 2 crystal + 1 glass) · Rocky charge (altar: 3 crystal)',
    nextRep: 'Meet artists in each land (E to talk) · finish land quests for badges · wake Rockies',
    main: 'Main story', side: 'Requests', none: 'No requests taken — look for a yellow ! above an artist.', reward: 'reward', here: 'here',
    qSea: 'Sea of Origins', qSeaText: 'Drift on the plank, meet Lyron, paddle the raft to the harbour.',
    qLand: (n, t) => `Meet ${n}/${t} artists`, qLocked: lv => `Locked — earn the Magnitude ${lv}.0 badge first`, badgeDone: 'Badge earned',
    qGather: 'Three gifts for the deep', qGatherText: 'Forge the diving bell, get the trench map, receive the core crystal.', qGatherLocked: 'Opens after the nine lands',
    qTrench: 'The Kraken Trench', qTrenchText: 'Dive with a Rocky, bring Lyron home.', qHome: 'Lyron is home — the harbour lights its lanterns.',
    resume: 'Resume', lang: 'Tiếng Việt', music: 'Music', fs: 'Fullscreen', quit: 'Save & quit to title', on: 'on', off: 'off'
  },
  vi: {
    tabs: { bag: 'Túi đồ', hero: 'Nhân vật', quest: 'Nhiệm vụ', gear: 'Cài đặt' }, foot: 'Esc · đóng   ·   ← → hoặc 1-4 · đổi thẻ   ·   B túi · Q nhiệm vụ',
    equip: 'Trang bị', progress: 'Tiến độ', items: 'Vật phẩm', load: 'Tải túi', empty: 'Túi chưa có gì — chặt cây, đập đá, nhặt đồ đi.', tipHint: 'Rê chuột hoặc chạm ô để xem mô tả.',
    locked: 'Chưa chế', weight: 'nặng', count: 'số lượng', sell: 'Bán ở Thương nhân Làng', sell1: 'Bán 1', sellAll: 'Bán hết', sellHere: 'bán ngay tại túi', material: 'Nguyên liệu chế tạo / xây dựng', story: 'Vật phẩm cốt truyện',
    fl: { raft: 'Bè', sail: 'Buồm', wax: 'Sáp trượt', tires: 'Lốp obsidian', cape: 'Áo choàng Rocky', armor: 'Giáp Rocky', coat: 'Áo ấm', lamps: 'Đèn tinh thể', charged: 'Pin Rocky' },
    stats: { str: 'Sức mạnh', agi: 'Nhanh nhẹn', def: 'Phòng thủ', cap: 'Sức chứa', skill: 'Kỹ năng', rep: 'Uy tín' },
    statHint: { str: 'Cấp rìu và cuốc', agi: 'Đi bộ · sáp trượt · lốp obsidian · buồm · yên ngựa', def: 'Giáp Rocky · áo ấm · xô sắt', cap: 'Túi · xô · lồng · xe chở', skill: 'Cần câu · đèn tinh thể · pin Rocky', rep: 'Nghệ sĩ đã gặp · huy hiệu · Rocky đã thức' },
    next: 'Tăng tiếp: ', up: 'tăng so với lần trước', down: 'giảm so với lần trước', same: '',
    nextStr: { 1: 'Rìu I ở Bàn mộc (5 gỗ) · Cuốc I (6 gỗ + 2 đá)', 2: 'Rìu/Cuốc II ở Lò nung M4/M5 (3 sắt + 2 gỗ)', 3: 'Rìu/Cuốc III ở Lò rèn M7/M8 (4 obsidian + 2 sắt)' },
    nextAgi: 'Sáp trượt (Bàn mộc M8: 2 sáp) · Lốp obsidian (Lò rèn) · Buồm (Khung dệt: 6 len + 2 dây) · Yên ngựa (Bàn mộc)',
    nextDef: 'Giáp Rocky (Lò rèn: da sâu + 4 obsidian) · Áo ấm (Khung dệt: lông yeti + 4 len) · Xô sắt (Lò nung: 2 sắt)',
    nextCap: 'Xô / Lồng / Xe chở ở Bàn mộc, nâng cấp ở Lò nung và Lò rèn', nextSkill: 'Cần câu II (Lò nung) · Cần câu III (Bàn thờ M9) · Đèn tinh thể (Bàn thờ: 2 tinh thể + 1 kính) · Pin Rocky (Bàn thờ: 3 tinh thể)',
    nextRep: 'Gặp nghệ sĩ ở từng vùng (bấm E nói chuyện) · xong nhiệm vụ vùng để lấy huy hiệu · đánh thức Rocky',
    main: 'Cốt truyện chính', side: 'Lời nhờ riêng', none: 'Chưa nhận việc nào — tìm dấu ! vàng trên đầu nghệ sĩ.', reward: 'thưởng', here: 'ở đây',
    qSea: 'Biển Khởi Nguồn', qSeaText: 'Trôi trên ván, gặp Lyron, chèo bè về bến cảng.',
    qLand: (n, t) => `Gặp ${n}/${t} nghệ sĩ`, qLocked: lv => `Chưa mở — cần huy hiệu Magnitude ${lv}.0 trước`, badgeDone: 'Đã nhận huy hiệu',
    qGather: 'Ba món cho vực sâu', qGatherText: 'Rèn chuông lặn, lấy bản đồ vực, nhận tinh thể Lõi.', qGatherLocked: 'Mở sau khi xong chín vùng đất',
    qTrench: 'Vực Kraken', qTrenchText: 'Lặn cùng Rocky, đưa Lyron về nhà.', qHome: 'Lyron đã về nhà — bến cảng thắp đèn.',
    resume: 'Tiếp tục', lang: 'English', music: 'Nhạc', fs: 'Toàn màn hình', quit: 'Lưu & về màn hình chính', on: 'bật', off: 'tắt'
  }
};
const FLAGS = [['vehicles', 'raft', '🛶'], ['vehicles', 'sail', '⛵'], ['vehicles', 'wax', '🎿'], ['vehicles', 'tires', '🛞'], ['rocky', 'cape', '🧣'], ['rocky', 'armor', '🛡'], ['ecology', 'coat', '🧥'], ['crafting', 'lamps', '🏮', 1], ['rocky', 'charged', '⚡', 1]];
const L = () => STR[UI.lang() === 'vi' ? 'vi' : 'en'];

let deps = null, el = null, tab = 'bag', timer = null, tip = '';
const ui = () => (ART.on && ART.man && ART.man.ui) || null;
const img = (path, cls = 'pxi') => `<img class="${cls}" src="assets/px/${path}" draggable="false" alt="">`;
function icon(id) { const u = ui(), p = u && u.items && u.items[id], d = ITEMS[id] || TOOLS[id]; return p ? img(p) : `<span class="emo">${d ? d.icon : '▪'}</span>`; }
function stIcon(k, fb) { const u = ui(), p = u && u.status && u.status[k]; return p ? img(p, 'pxi st ' + k) : `<span class="emo st">${fb}</span>`; }
function tabIcon(k, fb) { const u = ui(), p = u && u.tabs && u.tabs[k]; return p ? img(p, 'pxi st') : `<span class="emo st">${fb}</span>`; }
const TAB_FB = { bag: '🎒', hero: '☺', quest: '📜', gear: '⚙' };

export function initMenu(d) {
  deps = d; el = document.createElement('div'); el.id = 'menu'; el.className = 'ov'; el.hidden = true; document.body.appendChild(el);
  el.addEventListener('pointerover', e => { const s = e.target.closest('[data-tip]'); if (s) setTip(s.dataset.tip); });
  el.addEventListener('pointerdown', e => {
    const s = e.target.closest('[data-tip]'); if (s) setTip(s.dataset.tip);
    const t = e.target.closest('[data-tab]'); if (t) { tab = t.dataset.tab; render(); }
    const a = e.target.closest('[data-act]'); if (a) { e.preventDefault(); act(a.dataset.act); }
    const b = e.target.closest('[data-sell]'); if (b) { e.preventDefault(); doSell(b.dataset.sell, b.dataset.w); }
    if (s && s.dataset.id) selId = s.dataset.id;
  });
}
let selId = null;
function doSell(id, how) {   /* bán rồi vẽ lại túi, giữ dòng mô tả của đúng món (nếu còn) */
  if (!sellFromBag(deps.CTX, id, how)) return;
  render(); const s = el.querySelector(`[data-id="${id}"]`); setTip(s ? s.dataset.tip : ''); if (!s) selId = null;
}
function setTip(t) { tip = t || ''; const b = el.querySelector('#mtip'); if (b) b.innerHTML = tip; }
function act(k) {
  const A = deps.actions || {};
  if (k === 'resume') closeMenu();
  else if (A[k]) { A[k](); render(); }
}
export const menuOpen = () => !!(el && !el.hidden);
export function openMenu(t) {
  if (!deps || !deps.S.save || !deps.S.map) return;
  if (t) tab = t; tip = ''; render(); el.hidden = false; deps.setMode('menu');
  clearInterval(timer); timer = setInterval(() => { if (!el.hidden) render(true); else clearInterval(timer); }, 1500);
}
export function closeMenu() {
  if (!el) return; el.hidden = true; clearInterval(timer); timer = null; saveLast();
  if (deps.S.mode === 'menu') deps.setMode('play');
}
export function toggleMenu(t) { if (menuOpen() && (!t || t === tab)) closeMenu(); else openMenu(t); }
export function menuKey(code) {
  if (!menuOpen()) return false;
  const i = TABS.indexOf(tab);
  if (code === 'ArrowLeft' || code === 'KeyA') { tab = TABS[(i + 3) % 4]; render(); return true; }
  if (code === 'ArrowRight' || code === 'KeyD') { tab = TABS[(i + 1) % 4]; render(); return true; }
  if (/^Digit[1-4]$/.test(code)) { tab = TABS[+code[5] - 1]; render(); return true; }
  return code === 'ArrowUp' || code === 'ArrowDown' || code === 'KeyW' || code === 'KeyS';   /* nuốt phím di chuyển cho người chơi không đi */
}

// ---------------------------------------------------------------- khung
function render(soft) {
  const t = L(), u = ui(), px = !!(u && u.frame);
  const body = el.querySelector('.mbody'), scroll = soft && body ? body.scrollTop : 0;
  const tabs = TABS.map(k => `<div class="mtab ${k === tab ? 'on' : ''}" data-tab="${k}">${tabIcon(k, TAB_FB[k])}<span>${t.tabs[k]}</span></div>`).join('');
  const inner = tab === 'bag' ? bagBody() : tab === 'hero' ? heroBody() : tab === 'quest' ? questBody() : gearBody();
  el.innerHTML = `<div class="mframe ${px ? 'px' : ''}"><div class="mtabs">${tabs}</div><div class="mbody">${inner}</div>` +
    (tab === 'bag' ? `<div id="mtip" class="mtip">${tip || `<span class="mhint">${t.tipHint}</span>`}</div>` : '') + `<div class="mfoot">${t.foot}</div></div>`;
  if (tab === 'hero') drawAvatar();
  if (soft) { const b = el.querySelector('.mbody'); if (b) b.scrollTop = scroll; }
}

// ---------------------------------------------------------------- túi đồ
function slot(id, n, cls, tipText, extra = '', sid = '') {
  return `<div class="slot ${cls || ''}" data-tip="${esc(tipText)}"${sid ? ` data-id="${sid}"` : ''}>${icon(id)}${n > 1 ? `<b class="n">${n}</b>` : ''}${extra}</div>`;
}
function bagBody() {
  const t = L(), S = deps.S, C = deps.CTX, lg = UI.lang(), inv = S.save.inv || {};
  const eq = Object.keys(TOOLS).map(id => {
    const tier = C.tool.tier(id), name = itemName(id, lg);
    return slot(id, 0, tier ? '' : 'off', `<b>${esc(name)}${tier ? ' ' + ROMAN[tier] : ''}</b> — ${tier ? esc(t.equip) : esc(t.locked)}`, tier ? `<b class="tier">${ROMAN[tier] || tier}</b>` : `<span class="lock">${stIcon('lock', '🔒')}</span>`);
  });
  const sys = S.save.sys || {};
  const fl = FLAGS.map(([a, b, ic, cnt]) => {
    const v = ((sys[a] || {})[b]) || 0, on = cnt ? v > 0 : !!v;
    return `<div class="slot ${on ? '' : 'off'}" data-tip="<b>${esc(t.fl[b])}</b> — ${on ? (cnt ? '×' + v : '✓') : esc(t.locked)}"><span class="emo">${ic}</span>${cnt && v > 0 ? `<b class="n">${v}</b>` : ''}${on ? '' : `<span class="lock">${stIcon('lock', '🔒')}</span>`}</div>`;
  });
  const its = Object.keys(ITEMS).filter(id => (inv[id] || 0) > 0);
  const rows = its.map(id => {
    const d = ITEMS[id], n = inv[id], pr = id === 'stone' ? null : bagPrice(C, id), kind = d.tags.includes('carry') ? t.sell : d.tags.includes('sea') || /divebell|trenchmap|greatcrystal|scarf/.test(id) ? t.story : t.material;
    const sell = pr ? ` <span class="msell"><button class="btn" data-sell="${id}" data-w="1">${esc(t.sell1)} · +${pr.one} 🪨</button>${pr.n > 1 ? `<button class="btn primary" data-sell="${id}" data-w="all">${esc(t.sellAll)} · +${pr.all} 🪨</button>` : ''}</span>` : '';
    return slot(id, n, '', `<b>${esc(itemName(id, lg))}</b> ×${n}${d.w ? ` · ${t.weight} ${Math.round(d.w * n * 10) / 10}` : ''} · <span class="mhint">${esc(pr ? t.sellHere : kind)}</span>${sell}`, '', id);
  });
  const pad = Math.max(0, (its.length <= 8 ? 16 : Math.ceil(its.length / 8) * 8) - its.length);
  for (let i = 0; i < pad; i++) rows.push('<div class="slot off"></div>');
  const w = C.bag.weight(), cap = C.bag.cap(), pct = Math.min(100, Math.round(w / cap * 100));
  return `<h3>${t.equip}</h3><div class="mgrid">${eq.join('')}</div>
    <h3>${t.progress}</h3><div class="mgrid">${fl.join('')}</div>
    <h3>${t.items} <span class="chip">⚖ ${Math.round(w * 10) / 10}/${cap}</span></h3>
    <div class="mbar big"><i style="width:${pct}%" class="on"></i></div>
    ${its.length ? '' : `<p class="dim" style="padding:6px 2px">${t.empty}</p>`}<div class="mgrid">${rows.join('')}</div>`;
}

// ---------------------------------------------------------------- nhân vật
function statsOf() {
  const t = L(), S = deps.S, C = deps.CTX, sys = S.save.sys || {}, tt = id => C.tool.tier(id);
  const fl = (a, b) => !!((sys[a] || {})[b]), cnt = (a, b) => ((sys[a] || {})[b]) || 0;
  const inLands = new Set(); for (const z of ZONE_LIST) for (const m of membersOfLevel(z.lv)) inLands.add(m.id);   /* nghệ sĩ có mặt trong các vùng (không tính cả roster) */
  const met = (S.save.met || []).filter(id => inLands.has(id)).length, badges = (S.save.badges || []).filter(b => b >= 1).length, pilots = cnt('rocky', 'pilots');
  const R = k => ROMAN[tt(k)] || '–', lo = Math.min(tt('axe'), tt('pickaxe'));
  return [
    { k: 'str', ic: '⚔', v: tt('axe') + tt('pickaxe'), max: 6, detail: `🪓 ${R('axe')} · ⛏ ${R('pickaxe')}`, next: lo < 3 ? t.nextStr[lo + 1] : '' },
    { k: 'agi', ic: '🏃', v: 1 + (fl('vehicles', 'wax') ? 1 : 0) + (fl('vehicles', 'tires') ? 1 : 0) + (fl('vehicles', 'sail') ? 1 : 0) + (tt('saddle') ? 1 : 0), max: 5,
      detail: ['🚶', fl('vehicles', 'wax') ? '🎿' : '', fl('vehicles', 'tires') ? '🛞' : '', fl('vehicles', 'sail') ? '⛵' : '', tt('saddle') ? '🐎' : ''].filter(Boolean).join(' '), next: t.nextAgi },
    { k: 'def', ic: '🛡', v: (fl('rocky', 'armor') ? 1 : 0) + (fl('ecology', 'coat') ? 1 : 0) + (tt('bucket') >= 2 ? 1 : 0), max: 3,
      detail: [fl('rocky', 'armor') ? '🛡' : '', fl('ecology', 'coat') ? '🧥' : '', tt('bucket') >= 2 ? '🪣' : ''].filter(Boolean).join(' ') || '–', next: t.nextDef },
    { k: 'cap', ic: '🎒', v: tt('bucket') + tt('cage') + tt('cart'), max: 9, detail: `🎒 ${C.bag.cap()} · 🪣 ${R('bucket')} · 🧺 ${R('cage')} · 🛒 ${R('cart')}`, next: t.nextCap },
    { k: 'skill', ic: '🎣', v: tt('rod') + (cnt('crafting', 'lamps') > 0 ? 1 : 0) + (cnt('rocky', 'charged') > 0 ? 1 : 0), max: 5, detail: `🎣 ${R('rod')} · 🏮 ${cnt('crafting', 'lamps')} · ⚡ ${cnt('rocky', 'charged')}`, next: t.nextSkill },
    { k: 'rep', ic: '⭐', v: badges, max: 9, detail: `☺ ${met}/${inLands.size} · 🏅 ${badges}/9 · 🗿 ${pilots}`, next: t.nextRep },
  ];
}
function lastStats() { const m = deps.S.save.menu; return (m && m.last) || null; }
function saveLast() { try { const o = {}; for (const s of statsOf()) o[s.k] = s.v; (deps.S.save.menu ||= {}).last = o; deps.CTX.persist(); } catch (e) { /* save chưa sẵn */ } }
function heroBody() {
  const t = L(), S = deps.S, last = lastStats();
  const rows = statsOf().map(s => {
    const prev = last ? last[s.k] : undefined, d = prev === undefined ? 0 : Math.sign(s.v - prev);
    const arrow = d > 0 ? `<span title="${t.up}">${stIcon('up', '▲')}</span>` : d < 0 ? `<span title="${t.down}">${stIcon('down', '▼')}</span>` : '';
    const segs = Array.from({ length: s.max }, (_, i) => `<i class="${i < s.v ? 'on' : ''}"></i>`).join('');
    return `<div class="mstat"><span class="emo st">${s.ic}</span><span><b>${t.stats[s.k]}</b><div class="mhint">${t.statHint[s.k]}</div></span>
      <span><div class="mbar">${segs}</div><div class="mhint">${s.detail}${s.v < s.max && s.next ? ` · ${t.next}${esc(s.next)}` : ''}</div></span><span class="arr ${d > 0 ? 'up' : d < 0 ? 'down' : ''}">${arrow}</span></div>`;
  }).join('');
  const name = esc(S.save.name || (UI.lang() === 'vi' ? 'Bạn' : 'You')), zone = S.zone ? esc(S.zone.name[UI.lang()] || S.zone.name.en) : '';
  return `<div class="mhero"><canvas class="mav" id="mav" width="64" height="80"></canvas><div><b style="font-size:17px">${name}</b><div class="mhint">${zone} · ◆ ${S.save.shards || 0}</div></div></div>${rows}`;
}
function drawAvatar() {
  const c = el.querySelector('#mav'), p = deps.S.player; if (!c || !p || !p.sheet) return;
  const g = c.getContext('2d'); g.imageSmoothingEnabled = false; g.clearRect(0, 0, 64, 80);
  try { g.drawImage(p.sheet, 0, 0, 16, 20, 0, 0, 64, 80); } catch (e) { /* sheet chưa sẵn */ }
}

// ---------------------------------------------------------------- nhiệm vụ
function mainQuests() {
  const t = L(), S = deps.S, lg = UI.lang(), st = S.save.story || {}, act = st.act || 0, badges = S.save.badges || [], met = new Set(S.save.met || []);
  const rows = [{ name: t.qSea, state: act >= 2 || st.seaDone ? 'done' : 'now', text: t.qSeaText }];
  let prevDone = true;
  for (const z of ZONE_LIST.filter(z => z.lv >= 1)) {
    const q = z.quest || {}, done = badges.includes(z.lv), mem = membersOfLevel(z.lv), m = mem.filter(x => met.has(x.id)).length;
    const tasks = (q.tasks || []).map(tk => { const v = ((S.save.tasks || {})[z.id] || {})[tk.id] || 0; return UI.L.tasks && UI.L.tasks[tk.id] ? UI.L.tasks[tk.id](Math.min(v, tk.n), tk.n) : tk.id; });
    const state = done ? 'done' : prevDone ? 'now' : 'locked';
    rows.push({ name: z.name[lg] || z.name.en, state, text: state === 'locked' ? t.qLocked(z.lv - 1) : (done ? t.badgeDone + ' · ' : '') + [t.qLand(m, q.meet || mem.length)].concat(tasks).join(' · ') });
    prevDone = done;
  }
  const items3 = ['divebell', 'trenchmap', 'greatcrystal'];
  const gatherText = act === 2 ? items3.map(k => `${ITEMS[k] ? ITEMS[k].icon : k} ${itemName(k, lg)} ${(st.items || {})[k] ? '✓' : '·'}`).join(' · ') : act < 2 ? t.qGatherLocked : t.qGatherText;
  rows.push({ name: t.qGather, state: act >= 3 ? 'done' : act === 2 ? 'now' : 'locked', text: gatherText });
  rows.push({ name: t.qTrench, state: act >= 4 ? 'done' : act === 3 ? 'now' : 'locked', text: act >= 4 ? t.qHome : t.qTrenchText });
  return rows;
}
function qRow(r) {
  const ic = r.state === 'done' ? stIcon('check', '✓') : r.state === 'now' ? stIcon('play', '▶') : stIcon('quest', '?');
  return `<div class="mq ${r.state}"><span class="qs">${ic}</span><span style="flex:1;min-width:0">${r.av || ''}<b>${esc(r.name)}</b>${r.right ? `<span class="chip" style="float:right">${r.right}</span>` : ''}<div class="mhint">${r.text}</div></span></div>`;
}
function questBody() {
  const t = L(), C = deps.CTX; let side = [];
  try { side = questRows(C); } catch (e) { side = []; }
  const main = mainQuests().map(qRow).join('');
  const sd = side.map(q => qRow({ name: q.name, state: q.done ? 'done' : 'now', text: `${esc(q.text)}${q.here ? '' : ` · <span class="dim">${esc(q.zone)}</span>`}`, right: `${q.have}/${q.need} · 🪨 ${q.reward}` })).join('');
  return `<h3>${t.main}</h3>${main}<h3>${t.side}</h3>${sd || `<p class="dim" style="padding:6px 2px">${t.none}</p>`}`;
}

// ---------------------------------------------------------------- cài đặt
function gearBody() {
  const t = L(), A = deps.actions || {}, on = A.musicOn ? A.musicOn() : true;
  return `<div class="mgear"><button class="btn primary" data-act="resume">${t.resume}</button><button class="btn" data-act="lang">${t.lang}</button>
    <button class="btn" data-act="music">♪ ${t.music}: ${on ? t.on : t.off}</button><button class="btn" data-act="fs">⛶ ${t.fs}</button><button class="btn" data-act="quit">${t.quit}</button></div>`;
}
