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
import * as HB from './hotbar.js';   /* plan-20: đưa món lên hotbar */
import { pxText, keyHint, isTouchUI } from './hud.js';   /* plan-22: emoji → icon pixel */
import * as AUDIO from './audio.js';
import * as RLV from './systems/petlv.js';   /* plan-27: thẻ Rocky (cấp, chỉ số, chiêu) */   /* 2026-10-10: 2 thanh âm lượng nhạc / hiệu ứng */

const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const ROMAN = ['', 'I', 'II', 'III'];
const TABS = ['bag', 'shop', 'hero', 'rocky', 'quest', 'gear'];   /* plan-27: thẻ Rocky */   /* 2026-10-10 anh yêu cầu: 'Mua nhanh' công cụ bằng đá Seismic, không qua NPC (phím O) */
const STR = {
  en: {
    tabs: { bag: 'Bag', shop: 'Quick buy', hero: 'Character', rocky: 'Rocky', quest: 'Quests', gear: 'Settings' }, foot: 'Esc · close   ·   ← → or 1-6 · tabs   ·   B bag · O quick buy · Q quests', footTouch: 'Esc · close   ·   tap a tab to switch',
    shopHint: 'Buy tools and supplies instantly with Seismic stones — no need to find a trader. Bought goods drop at your feet.', tier: 'tier', buyT: (n, p) => `Tier ${n} · ${p} 🪨`, maxT: 'Max tier', buyN: (n, p) => `×${n} · ${p} 🪨`, poor: 'Not enough Seismic stones', boughtT: (n, k) => `${n} tier ${k} — ready on your hotbar`, supplies: 'Supplies', tools: 'Tools',
    equip: 'Equipment', progress: 'Progress', tool: 'Tool tier', currency: 'Currency — gift it to villagers so they can fight', food: 'Food — right-click / E to eat', seedK: 'Seed — plant on tilled soil', dragHint: 'Drag to rearrange · top row = hotbar', trash: 'Drop here to throw away', sort: 'Sort', noTrash: "That can't be thrown away.", trashAsk: (n, k) => `Throw away ${n}${k > 1 ? ' (×' + k + ')' : ''}?`, trash1: 'Throw 1', trashAll: 'Throw all', shards: 'Tremor shards', met: 'Artists met', items: 'Items', load: 'Bag load', empty: 'Nothing in the bag yet — chop, mine, gather.', tipHint: 'Hover or tap a slot to read about it.',
    locked: 'Not crafted yet', weight: 'weight', count: 'count', sell: 'Sell at the village trader', sell1: 'Sell 1', sellAll: 'Sell all', toBar: k => `To slot ${k}`, onBar: (n, k) => `${n} → hotbar slot ${k}`, eat: 'Eat', ate: n => `Yum, ${n}! You feel lively — walking faster for 30 s`, sellHere: 'sell right from the bag', material: 'Crafting / building material', story: 'Story item',
    fl: { raft: 'Raft', sail: 'Sail', wax: 'Ski wax', tires: 'Obsidian tires', cape: 'Rocky cape', armor: 'Rocky armour', coat: 'Warm coat', lamps: 'Crystal lamps', charged: 'Rocky charges' },
    stats: { str: 'Strength', agi: 'Agility', def: 'Defense', skill: 'Skill', rep: 'Reputation' },
    statHint: { str: 'Axe & pickaxe tiers', agi: 'Walk · ski wax · obsidian tires · sail · tamed horse', def: 'Rocky armour · warm coat', skill: 'Fishing rod · crystal lamps · Rocky charges', rep: 'Artists met · badges · Rockies woken' },
    next: 'Next: ', up: 'up since last time', down: 'down since last time', same: '',
    nextStr: { 1: 'Axe I at the workbench (5 wood) · Pickaxe I (6 wood + 2 rock)', 2: 'Axe/Pickaxe II at the furnace M4/M5 (3 iron + 2 wood)', 3: 'Axe/Pickaxe III at the forge M7/M8 (4 obsidian + 2 iron)' },
    nextAgi: 'Ski wax (M8 workbench: 2 wax) · Obsidian tires (forge) · Sail (loom: 6 wool + 2 rope) · Tame a horse (M2: feed it 3 hay)',
    nextDef: 'Rocky armour (forge: worm hide + 4 obsidian) · Warm coat (loom: yeti fur + 4 wool)',
    nextSkill: 'Rod II (furnace) · Rod III (altar M9) · Crystal lamp (altar: 2 crystal + 1 glass) · Rocky charge (altar: 3 crystal)',
    nextRep: 'Meet artists in each land (E to talk) · finish land quests for badges · wake Rockies',
    main: 'Main story', side: 'Requests', none: 'No requests taken — look for a yellow ! above an artist.', reward: 'reward', here: 'here',
    qSea: 'Sea of Origins', qSeaText: 'Drift on the plank, meet Lyron, paddle the raft to the harbour.',
    qLand: (n, t) => `Meet ${n}/${t} artists`, qLocked: lv => `Locked — earn the Magnitude ${lv}.0 badge first`, badgeDone: 'Badge earned',
    qGather: 'Three gifts for the deep', qGatherText: 'Forge the diving bell, get the trench map, receive the core crystal.', qGatherLocked: 'Opens after the nine lands',
    qTrench: 'The Kraken Trench', qTrenchText: 'Dive with a Rocky, bring Lyron home.', qHome: 'Lyron is home — the harbour lights its lanterns.',
    resume: 'Resume', lang: 'Tiếng Việt', musicVol: 'Music', sfxVol: 'Sound effects', music: 'Music', fs: 'Fullscreen', quit: 'Save & quit to title', on: 'on', off: 'off'
  },
  vi: {
    tabs: { bag: 'Túi đồ', shop: 'Mua nhanh', hero: 'Nhân vật', rocky: 'Rocky', quest: 'Nhiệm vụ', gear: 'Cài đặt' }, foot: 'Esc · đóng   ·   ← → hoặc 1-6 · đổi thẻ   ·   B túi · O mua nhanh · Q nhiệm vụ', footTouch: 'Esc · đóng   ·   chạm thẻ để đổi',
    shopHint: 'Mua công cụ và vật tư ngay bằng đá Seismic — không cần tìm thương nhân. Đồ mua rơi ngay dưới chân.', tier: 'cấp', buyT: (n, p) => `Cấp ${n} · ${p} 🪨`, maxT: 'Cấp tối đa', buyN: (n, p) => `×${n} · ${p} 🪨`, poor: 'Không đủ đá Seismic', boughtT: (n, k) => `${n} cấp ${k} — đã lên thanh công cụ`, supplies: 'Vật tư', tools: 'Công cụ',
    equip: 'Trang bị', progress: 'Tiến độ', tool: 'Dụng cụ cấp', currency: 'Tiền — tặng dân làng để họ biết chiến đấu', food: 'Đồ ăn — chuột phải / E để ăn', seedK: 'Hạt giống — gieo trên đất đã cày', dragHint: 'Kéo để xếp · hàng trên = thanh công cụ', trash: 'Thả vào đây để vứt', sort: 'Xếp gọn', noTrash: 'Món này không vứt được.', trashAsk: (n, k) => `Vứt ${n}${k > 1 ? ' (×' + k + ')' : ''}?`, trash1: 'Vứt 1', trashAll: 'Vứt hết', shards: 'Mảnh địa chấn', met: 'Nghệ sĩ đã gặp', items: 'Vật phẩm', load: 'Tải túi', empty: 'Túi chưa có gì — chặt cây, đập đá, nhặt đồ đi.', tipHint: 'Rê chuột hoặc chạm ô để xem mô tả.',
    locked: 'Chưa chế', weight: 'nặng', count: 'số lượng', sell: 'Bán ở Thương nhân Làng', sell1: 'Bán 1', sellAll: 'Bán hết', toBar: k => `Lên ô ${k}`, onBar: (n, k) => `${n} → ô ${k} trên thanh`, eat: 'Ăn', ate: n => `Ngon quá, ${n}! Thấy khoẻ khoắn — đi nhanh hơn 30 giây`, sellHere: 'bán ngay tại túi', material: 'Nguyên liệu chế tạo / xây dựng', story: 'Vật phẩm cốt truyện',
    fl: { raft: 'Bè', sail: 'Buồm', wax: 'Sáp trượt', tires: 'Lốp obsidian', cape: 'Áo choàng Rocky', armor: 'Giáp Rocky', coat: 'Áo ấm', lamps: 'Đèn tinh thể', charged: 'Pin Rocky' },
    stats: { str: 'Sức mạnh', agi: 'Nhanh nhẹn', def: 'Phòng thủ', skill: 'Kỹ năng', rep: 'Uy tín' },
    statHint: { str: 'Cấp rìu và cuốc', agi: 'Đi bộ · sáp trượt · lốp obsidian · buồm · ngựa đã thuần', def: 'Giáp Rocky · áo ấm', skill: 'Cần câu · đèn tinh thể · pin Rocky', rep: 'Nghệ sĩ đã gặp · huy hiệu · Rocky đã thức' },
    next: 'Tăng tiếp: ', up: 'tăng so với lần trước', down: 'giảm so với lần trước', same: '',
    nextStr: { 1: 'Rìu I ở Bàn mộc (5 gỗ) · Cuốc I (6 gỗ + 2 đá)', 2: 'Rìu/Cuốc II ở Lò nung M4/M5 (3 sắt + 2 gỗ)', 3: 'Rìu/Cuốc III ở Lò rèn M7/M8 (4 obsidian + 2 sắt)' },
    nextAgi: 'Sáp trượt (Bàn mộc M8: 2 sáp) · Lốp obsidian (Lò rèn) · Buồm (Khung dệt: 6 len + 2 dây) · Thuần ngựa (M2: cho ăn 3 rơm)',
    nextDef: 'Giáp Rocky (Lò rèn: da sâu + 4 obsidian) · Áo ấm (Khung dệt: lông yeti + 4 len)',
    nextSkill: 'Cần câu II (Lò nung) · Cần câu III (Bàn thờ M9) · Đèn tinh thể (Bàn thờ: 2 tinh thể + 1 kính) · Pin Rocky (Bàn thờ: 3 tinh thể)',
    nextRep: 'Gặp nghệ sĩ ở từng vùng (bấm E nói chuyện) · xong nhiệm vụ vùng để lấy huy hiệu · đánh thức Rocky',
    main: 'Cốt truyện chính', side: 'Lời nhờ riêng', none: 'Chưa nhận việc nào — tìm dấu ! vàng trên đầu nghệ sĩ.', reward: 'thưởng', here: 'ở đây',
    qSea: 'Biển Khởi Nguồn', qSeaText: 'Trôi trên ván, gặp Lyron, chèo bè về bến cảng.',
    qLand: (n, t) => `Gặp ${n}/${t} nghệ sĩ`, qLocked: lv => `Chưa mở — cần huy hiệu Magnitude ${lv}.0 trước`, badgeDone: 'Đã nhận huy hiệu',
    qGather: 'Ba món cho vực sâu', qGatherText: 'Rèn chuông lặn, lấy bản đồ vực, nhận tinh thể Lõi.', qGatherLocked: 'Mở sau khi xong chín vùng đất',
    qTrench: 'Vực Kraken', qTrenchText: 'Lặn cùng Rocky, đưa Lyron về nhà.', qHome: 'Lyron đã về nhà — bến cảng thắp đèn.',
    resume: 'Tiếp tục', lang: 'English', musicVol: 'Nhạc nền', sfxVol: 'Hiệu ứng', music: 'Nhạc', fs: 'Toàn màn hình', quit: 'Lưu & về màn hình chính', on: 'bật', off: 'tắt'
  }
};
const FLAGS = [['vehicles', 'raft', '🛶'], ['vehicles', 'sail', '⛵'], ['vehicles', 'wax', '🎿'], ['vehicles', 'tires', '🛞'], ['rocky', 'cape', '🧣'], ['rocky', 'armor', '🛡'], ['ecology', 'coat', '🧥'], ['crafting', 'lamps', '🏮', 1], ['rocky', 'charged', '⚡', 1]];
const L = () => STR[UI.lang() === 'vi' ? 'vi' : 'en'];

let deps = null, el = null, tab = 'bag', timer = null, tip = '';
const ui = () => (ART.on && ART.man && ART.man.ui) || null;
const img = (path, cls = 'pxi') => `<img class="${cls}" src="assets/px/${path}" draggable="false" alt="">`;
function icon(id) { const u = ui(), p = u && u.items && u.items[id], d = ITEMS[id] || TOOLS[id]; return p ? img(p) : `<span class="emo">${d ? d.icon : '▪'}</span>`; }
function stIcon(k, fb) { const u = ui(), p = u && u.status && u.status[k]; return p ? img(p, 'pxi st ' + k) : `<span class="emo st">${fb}</span>`; }
function tabIcon(k, fb) { const u = ui(), p = u && u.tabs && (u.tabs[k] || (k === 'shop' && u.items && u.items.stone)); return p ? img(p, 'pxi st') : `<span class="emo st">${fb}</span>`; }
const TAB_FB = { bag: '🎒', shop: '🪨', hero: '☺', rocky: '🗿', quest: '📜', gear: '⚙' };

export function initMenu(d) {
  deps = d; el = document.createElement('div'); el.id = 'menu'; el.className = 'ov'; el.hidden = true; document.body.appendChild(el);
  el.addEventListener('pointerover', e => { const s = e.target.closest('[data-tip]'); if (s) setTip(s.dataset.tip); const v = e.target.closest('[data-pos]'); if (v && e.pointerType === 'mouse') showTT(v, e); else if (!v) hideTT(); });
  el.addEventListener('pointermove', e => moveTT(e));
  el.addEventListener('input', e => {   /* thanh âm lượng: nhạc nền / hiệu ứng (bộ âm thanh mới) */
    const r = e.target.closest('[data-vol]'); if (!r) return; const v = r.value / 100;
    if (r.dataset.vol === 'music') { if (AUDIO.setMusicVolume) AUDIO.setMusicVolume(v); } else { if (AUDIO.setSfxVolume) AUDIO.setSfxVolume(v); if (AUDIO.sfx) AUDIO.sfx('click'); }
    if (r.nextElementSibling) r.nextElementSibling.textContent = r.value + '%';
  });
  el.addEventListener('pointerleave', hideTT);
  el.addEventListener('pointerdown', e => {
    const v = e.target.closest('[data-pos]'); if (v) { e.preventDefault(); dragStart(e, v); return; }   /* plan-22: ô túi → kéo-thả / chọn */
    const bb = e.target.closest('[data-buy]'); if (bb) { e.preventDefault(); doBuy(bb.dataset.buy); return; }
    const dl = e.target.closest('[data-del]'); if (dl) { e.preventDefault(); const id = dl.dataset.del, n = dl.dataset.w === 'all' ? deps.CTX.bag.count(id) : 1; deps.CTX.bag.remove(id, n); tip = ''; selId = null; render(); return; }
    const s = e.target.closest('[data-tip]'); if (s) setTip(s.dataset.tip);
    const t = e.target.closest('[data-tab]'); if (t) { tab = t.dataset.tab; render(); }
    const a = e.target.closest('[data-act]'); if (a) { e.preventDefault(); act(a.dataset.act); }
    const b = e.target.closest('[data-sell]'); if (b) { e.preventDefault(); doSell(b.dataset.sell, b.dataset.w); }
    const f = e.target.closest('[data-eat]'); if (f) { e.preventDefault(); doEat(f.dataset.eat); }
    const dg = e.target.closest('[data-dragon]'); if (dg) { e.preventDefault(); closeMenu(); if (deps.CTX.dragon) deps.CTX.dragon.summon(); return; }   /* plan-29 */
    const lk = e.target.closest('[data-look]'); if (lk) { e.preventDefault(); if (deps.CTX.dragon) deps.CTX.dragon.wear(lk.dataset.look === 'chad'); render(); return; }   /* plan-29: thẻ Ngoại hình */
    const h = e.target.closest('[data-hb]'); if (h) { e.preventDefault(); HB.setSlot(deps.S.save.hotSel || 0, h.dataset.hb); deps.CTX.toast(L().onBar(deps.CTX.itemName(h.dataset.hb), HB.label(deps.S.save.hotSel || 0))); }
    if (s && s.dataset.id) selId = s.dataset.id;
  });
}
let selId = null;
function doSell(id, how) {   /* bán rồi vẽ lại túi, giữ dòng mô tả của đúng món (nếu còn) */
  if (!sellFromBag(deps.CTX, id, how)) return;
  if (deps.CTX.bag.count(id) > 0) tip = tipOf(id); else { tip = ''; selId = null; } render();
}
function doEat(id) {   /* plan-19: đóng túi để thấy nhân vật ăn (clip PixelLab 'eat', hướng nam) */
  const C = deps.CTX, p = C.S.player, t = L(); if (!C.bag.has(id, 1)) return;
  C.bag.remove(id, 1); closeMenu();
  if (p.hasAct && p.hasAct('eat') && !p.custom) { p.dir = 0; p.act('eat', 0); }
  p.fedT = 30; if (C.hero) C.hero.heal(ITEMS[id] && ITEMS[id].heal ? Math.round(C.hero.max * ITEMS[id].heal) : 25);   /* plan-28: viên hồi máu hồi theo % máu tối đa */ C.sfx('eat'); C.toast(t.ate(itemName(id, UI.lang()))); if (C.persist) C.persist();
}
function setTip(t) { tip = t || ''; const b = el.querySelector('#mtip'); if (b) b.innerHTML = tip; }
function act(k) {
  const A = deps.actions || {};
  if (k === 'resume') closeMenu();
  else if (k === 'sort') { HB.sortBag(); render(); }
  else if (A[k]) { A[k](); render(); }
}
export const menuOpen = () => !!(el && !el.hidden);
export function openMenu(t) {
  if (!deps || !deps.S.save || !deps.S.map) return;
  if (t) tab = t; tip = ''; render(); el.hidden = false; deps.setMode('menu');
  clearInterval(timer); timer = setInterval(() => { if (!el.hidden) { if (!drag && tab !== 'gear') render(true); } else clearInterval(timer); }, 1500);   /* thẻ Cài đặt không vẽ lại (đang kéo thanh âm lượng) */
}
export function closeMenu() {
  if (!el) return; el.hidden = true; hideTT(); clearInterval(timer); timer = null; saveLast();
  if (deps.S.mode === 'menu') deps.setMode('play');
}
export function toggleMenu(t) { if (menuOpen() && (!t || t === tab)) closeMenu(); else openMenu(t); }
export function menuKey(code) {
  if (!menuOpen()) return false;
  if (document.activeElement && document.activeElement.matches && document.activeElement.matches('input[type=range]') && /^Arrow/.test(code)) return true;   /* ←/→ chỉnh thanh âm lượng, không đổi thẻ */
  const i = TABS.indexOf(tab);
  if (code === 'ArrowLeft' || code === 'KeyA') { tab = TABS[(i + TABS.length - 1) % TABS.length]; render(); return true; }
  if (code === 'ArrowRight' || code === 'KeyD') { tab = TABS[(i + 1) % TABS.length]; render(); return true; }
  if (/^Digit[1-6]$/.test(code)) { tab = TABS[+code[5] - 1] || tab; render(); return true; }
  return code === 'ArrowUp' || code === 'ArrowDown' || code === 'KeyW' || code === 'KeyS';   /* nuốt phím di chuyển cho người chơi không đi */
}

// ---------------------------------------------------------------- khung
function render(soft) {
  const t = L(), u = ui(), px = !!(u && u.frame);
  const body = el.querySelector('.mbody'), scroll = soft && body ? body.scrollTop : 0;
  const tabs = TABS.map(k => `<div class="mtab ${k === tab ? 'on' : ''}" data-tab="${k}">${tabIcon(k, TAB_FB[k])}<span>${t.tabs[k]}</span></div>`).join('');
  const inner = tab === 'bag' ? bagBody() : tab === 'shop' ? shopBody() : tab === 'hero' ? heroBody() : tab === 'rocky' ? rockyBody() : tab === 'quest' ? questBody() : gearBody();
  const cls = `<button class="px-x m-x" type="button" data-act="resume" aria-label="${esc(t.resume)}"><img src="assets/px/ui/hud/close.png" alt=""></button>`;   /* plan-25 B5: ✕ đóng túi trên điện thoại (CSS ẩn ở desktop) */
  el.innerHTML = `<div class="mframe ${px ? 'px' : ''}"><div class="mtabs">${tabs}${cls}</div><div class="mbody">${inner}</div>` +
    (tab === 'bag' ? `<div id="mtip" class="mtip">${tip || `<span class="mhint">${t.tipHint}</span>`}</div>` : '') + `<div class="mfoot">${isTouchUI() ? keyHint(t.footTouch) : t.foot}</div></div>`;
  if (tab === 'hero') drawAvatar();
  if (soft) { const b = el.querySelector('.mbody'); if (b) b.scrollTop = scroll; }
}

// ---------------------------------------------------------------- túi đồ
function slot(id, n, cls, tipText, extra = '', sid = '') {
  return `<div class="slot ${cls || ''}" data-tip="${esc(tipText)}"${sid ? ` data-id="${sid}"` : ''}>${icon(id)}${n > 1 ? `<b class="n">${n}</b>` : ''}${extra}</div>`;
}
const NO_TRASH = id => !!TOOLS[id] || id === 'stone' || /story|trophy|carry/.test(((ITEMS[id] || {}).tags || []).join(' ')) || /divebell|trenchmap|greatcrystal|scarf/.test(id);
function kindText(id) {
  const t = L(), d = ITEMS[id], C = deps.CTX;
  if (TOOLS[id]) { const tier = C.tool.tier(id); return `${t.tool} ${ROMAN[tier] || tier}`; }
  if (id === 'stone') return t.currency;
  return d.tags.includes('food') ? t.food : id.startsWith('seed') ? t.seedK : d.tags.includes('carry') ? t.sell : d.tags.includes('sea') || /divebell|trenchmap|greatcrystal|scarf/.test(id) ? t.story : t.material;
}
/* nội dung thanh mô tả dưới túi (bấm chọn ô): tên · loại · nút Ăn / Bán */
function tipOf(id) {
  const t = L(), S = deps.S, C = deps.CTX, lg = UI.lang(), d = ITEMS[id], n = TOOLS[id] ? 0 : (S.save.inv[id] || 0);
  const pr = !d || id === 'stone' ? null : bagPrice(C, id);
  const eat = d && d.tags.includes('food') ? `<button class="btn" data-eat="${id}">${esc(t.eat)}</button>` : '';
  const sb = pr ? `<button class="btn" data-sell="${id}" data-w="1">${esc(t.sell1)} · +${pr.one} 🪨</button>${pr.n > 1 ? `<button class="btn primary" data-sell="${id}" data-w="all">${esc(t.sellAll)} · +${pr.all} 🪨</button>` : ''}` : '';
  const dr = /^dball\d$/.test(id) && C.dragon && C.dragon.hasAll() ? `<button class="btn primary" data-dragon="1">${esc(C.dragon.label())}</button>` : '';   /* plan-29: đủ 7 Ngọc Rồng → gọi Rồng Thần */
  const btn = eat || sb || dr ? ` <span class="msell">${dr}${eat}${sb}</span>` : '';
  return pxText(`${itemName(id, lg)}${n > 1 ? ' ×' + n : ''} · ${d && d.desc ? d.desc[lg] || d.desc.en : kindText(id)}${pr ? ' · ' + t.sellHere : ''}`) + btn.replace(/🪨/g, img('ui/items/stone.png'));
}
function invSlot(pos, id, key) {
  const S = deps.S, C = deps.CTX, n = id && !TOOLS[id] ? S.save.inv[id] || 0 : 0, tier = id && TOOLS[id] ? C.tool.tier(id) : 0;
  const ic = id ? icon(HB.iconId(id)) : '';
  return `<div class="slot iv${id ? '' : ' empty'}${id && id === selId ? ' sel' : ''}" data-pos="${pos}"${id ? ` data-id="${id}"` : ''}>${key ? `<i class="ik">${key}</i>` : ''}${ic}${n > 1 ? `<b class="n">${n}</b>` : ''}${tier > 1 && id !== 'sword' ? `<b class="tier">${ROMAN[tier] || tier}</b>` : ''}</div>`;
}
function bagBody() {
  const t = L(), S = deps.S, ord = HB.bagSlots(), bar = S.save.hotbar || [];
  const top = bar.map((id, i) => invSlot('h' + i, id, HB.label(i))).join('');
  const rest = ord.map((id, i) => invSlot('b' + i, id)).join('');
  return `<div class="inv"><div class="inv-grid hb">${top}</div><div class="inv-sep"></div><div class="inv-grid">${rest}</div></div>
    <div class="inv-tools"><span class="mhint">${esc(t.dragHint)}</span><span class="inv-tr" data-trash="1" title="${esc(t.trash)}">${img('ui/hud/trash.png', 'pxi trash')}</span><button class="btn" data-act="sort">${esc(t.sort)}</button></div>`;
}
/* ---- kéo-thả (chuột + chạm) ---- */
let drag = null;
function slotAt(x, y) { const e = document.elementFromPoint(x, y); return e && (e.closest('[data-pos]') || e.closest('[data-trash]')); }
function dragStart(e, s) {
  drag = { pos: s.dataset.pos, id: s.dataset.id || null, x: e.clientX, y: e.clientY, moved: false, ghost: null };
  const mv = ev => {
    if (!drag) return;
    if (!drag.moved && drag.id && Math.hypot(ev.clientX - drag.x, ev.clientY - drag.y) > 6) {
      drag.moved = true; hideTT(); const g = document.createElement('div'); g.id = 'inv-ghost'; g.innerHTML = icon(HB.iconId(drag.id)); document.body.appendChild(g); drag.ghost = g;
      s.classList.add('lift');
    }
    if (drag.ghost) {
      drag.ghost.style.left = ev.clientX + 'px'; drag.ghost.style.top = ev.clientY + 'px';
      const tg = slotAt(ev.clientX, ev.clientY); el.querySelectorAll('.drop').forEach(x => x.classList.remove('drop')); if (tg) tg.classList.add('drop');
    }
  };
  const up = ev => {
    window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up);
    const d = drag; drag = null; if (!d) return;
    if (d.ghost) d.ghost.remove();
    if (!d.moved) { if (d.id) { selId = d.id; setTip(tipOf(d.id)); el.querySelectorAll('.slot.sel').forEach(x => x.classList.remove('sel')); s.classList.add('sel'); } return; }
    const tg = slotAt(ev.clientX, ev.clientY);
    if (tg && tg.dataset.trash) askTrash(d.id);
    else if (tg && tg.dataset.pos) { HB.move(d.pos, tg.dataset.pos); if (deps.CTX.sfx) deps.CTX.sfx('slot'); }
    render();
  };
  window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up);
}
function askTrash(id) {
  const t = L(), n = deps.S.save.inv[id] || 0;
  if (!id || NO_TRASH(id)) { tip = `<span class="mhint">${esc(t.noTrash)}</span>`; return; }
  selId = id; tip = `${pxText(t.trashAsk(itemName(id, UI.lang()), n))} <span class="msell"><button class="btn" data-del="${id}" data-w="1">${esc(t.trash1)}</button>${n > 1 ? `<button class="btn primary" data-del="${id}" data-w="all">${esc(t.trashAll)}</button>` : ''}</span>`;
}
/* ---- hộp mô tả nổi cạnh con trỏ (kiểu Stardew) ---- */
let tt = null;
function showTT(s, e) {
  const id = s.dataset.id; if (!id || drag) return hideTT();
  if (!tt) { tt = document.createElement('div'); tt.id = 'inv-tt'; document.body.appendChild(tt); }
  const C = deps.CTX, d = ITEMS[id], pr = d && id !== 'stone' ? bagPrice(C, id) : null, n = TOOLS[id] ? 0 : deps.S.save.inv[id] || 0;
  tt.innerHTML = `<b>${esc(itemName(id, UI.lang()))}</b><div class="mhint">${esc(kindText(id))}</div>${n > 1 ? `<div>×${n}</div>` : ''}${pr ? `<div class="tt-pr">${img('ui/items/stone.png')} ${pr.one}</div>` : ''}`;
  tt.hidden = false; moveTT(e);
}
function moveTT(e) { if (!tt || tt.hidden) return; const w = tt.offsetWidth, x = e.clientX + 18 + w > innerWidth ? e.clientX - w - 10 : e.clientX + 18; tt.style.left = x + 'px'; tt.style.top = (e.clientY + 16) + 'px'; }
function hideTT() { if (tt) tt.hidden = true; }

// ---------------------------------------------------------------- mua nhanh (phím O)
const TOOL_MAX = { axe: 3, pickaxe: 3, rod: 3, shovel: 1, scythe: 1, knife: 1, torch: 1, sword: 6 };   /* bỏ xe chở, thòng lọng, bẫy, yên 2026-10-11 */
const TOOL_BASE = { axe: 20, pickaxe: 25, rod: 20, shovel: 15, scythe: 15, knife: 15, torch: 10, sword: 30 };
const toolPrice = (id, tier) => (id === 'sword' ? 30 * tier * tier : TOOL_BASE[id] * [1, 3, 8][tier - 1]);
const SUPPLY = [['pen1', 15, 1], ['pen2', 40, 1], ['scarecrow', 10, 1], ['hay', 1, 5], ['revive', 30, 1], ['stone_seed', 0, 0]];   /* [id, giá, số lượng]; hạt giống thêm theo mùa */
function supplyList() {
  const C = deps.CTX, season = C.season ? C.season() : null, out = SUPPLY.filter(([id]) => ITEMS[id]);
  for (const id of Object.keys(ITEMS)) if (id.startsWith('seed_') && (!season || ITEMS[id].tags.includes(season) || ITEMS[id].tags.includes('any'))) out.push([id, 2, 5]);
  if (ITEMS.seed) out.push(['seed', 2, 5]);
  return out;
}
function shopBody() {
  const t = L(), C = deps.CTX, lg = UI.lang(), stone = C.bag.count('stone');
  const tools = Object.keys(TOOLS).map(id => {
    const cur = C.tool.tier(id), max = TOOL_MAX[id] || 1, next = cur + 1, can = next <= max, pr = can ? toolPrice(id, next) : 0;
    return `<div class="hrow shoprow"><span style="width:26px">${icon(HB.iconId(id))}</span><span class="hwho"><b>${esc(itemName(id, lg))}</b>${cur ? ` <span class="dim tiny">${t.tier} ${ROMAN[cur] || cur}</span>` : ''}</span>
      ${can ? `<button class="btn${stone >= pr ? ' primary' : ''}" data-buy="tool:${id}:${next}"${stone >= pr ? '' : ' disabled'}>${pxText(t.buyT(ROMAN[next] || next, pr))}</button>` : `<span class="dim tiny">${t.maxT}</span>`}</div>`;
  }).join('');
  const sup = supplyList().map(([id, pr, n]) => `<div class="hrow shoprow"><span style="width:26px">${icon(id)}</span><span class="hwho"><b>${esc(itemName(id, lg))}</b></span>
      <button class="btn${stone >= pr * n ? ' primary' : ''}" data-buy="item:${id}:${n}:${pr * n}"${stone >= pr * n ? '' : ' disabled'}>${pxText(t.buyN(n, pr * n))}</button></div>`).join('');
  return `<p class="mhint">${t.shopHint} · ${img('ui/items/stone.png')} <b>${stone}</b></p><h3>${t.tools}</h3>${tools}<h3>${t.supplies}</h3>${sup}`;
}
function doBuy(spec) {
  const t = L(), C = deps.CTX, [kind, id, a, b] = spec.split(':');
  if (kind === 'tool') {
    const tier = +a, pr = toolPrice(id, tier); if (!C.bag.has('stone', pr)) { C.toast(t.poor); C.sfx('poor'); return; }
    C.bag.remove('stone', pr); C.tool.set(id, tier); HB.sync(); C.persist();
    const p = C.S.player; if (C.vfx) { C.vfx('level_up', p.x, p.y + 2, 0, true); C.vfx('item_pickup_pop', p.x, p.y - 20, 0, true); } C.sfx('buy');
    C.toast(t.boughtT(itemName(id, UI.lang()), ROMAN[tier] || tier), true);
  } else {
    const n = +a, pr = +b; if (!C.bag.has('stone', pr)) { C.toast(t.poor); C.sfx('poor'); return; }
    C.bag.remove('stone', pr); C.give(id, n, undefined, undefined, { toPlayer: true }); C.sfx('buy');
  }
  render();
}

// ---------------------------------------------------------------- nhân vật
function statsOf() {
  const t = L(), S = deps.S, C = deps.CTX, sys = S.save.sys || {}, tt = id => C.tool.tier(id);
  const fl = (a, b) => !!((sys[a] || {})[b]), cnt = (a, b) => ((sys[a] || {})[b]) || 0;
  const inLands = new Set(); for (const z of ZONE_LIST) for (const m of membersOfLevel(z.lv)) inLands.add(m.id);   /* nghệ sĩ có mặt trong các vùng (không tính cả roster) */
  const here = S.zone && S.zone.lv != null ? membersOfLevel(S.zone.lv) : [], metSet = new Set(S.save.met || []), hereMet = here.filter(m => metSet.has(m.id)).length;   /* Uy tín: đã gặp ở vùng này / số nghệ sĩ vùng này · tổng đã gặp */
  const met = (S.save.met || []).filter(id => inLands.has(id)).length, badges = (S.save.badges || []).filter(b => b >= 1).length, pilots = cnt('rocky', 'pilots');
  const R = k => ROMAN[tt(k)] || '–', lo = Math.min(tt('axe'), tt('pickaxe'));
  const horse = !!(((sys.ecology || {}).horse || {}).tamed);   /* 2026-10-11 bỏ yên ngựa: điểm Nhanh nhẹn tính theo ngựa đã thuần (cưỡi không cần yên) */
  return [
    { k: 'str', ic: '⚔', v: tt('axe') + tt('pickaxe'), max: 6, detail: `🪓 ${R('axe')} · ⛏ ${R('pickaxe')}`, next: lo < 3 ? t.nextStr[lo + 1] : '' },
    { k: 'agi', ic: '🏃', v: 1 + (fl('vehicles', 'wax') ? 1 : 0) + (fl('vehicles', 'tires') ? 1 : 0) + (fl('vehicles', 'sail') ? 1 : 0) + (horse ? 1 : 0), max: 5,
      detail: ['🚶', fl('vehicles', 'wax') ? '🎿' : '', fl('vehicles', 'tires') ? '🛞' : '', fl('vehicles', 'sail') ? '⛵' : '', horse ? '🐎' : ''].filter(Boolean).join(' '), next: t.nextAgi },
    { k: 'def', ic: '🛡', v: (fl('rocky', 'armor') ? 1 : 0) + (fl('ecology', 'coat') ? 1 : 0), max: 2,
      detail: [fl('rocky', 'armor') ? '🛡' : '', fl('ecology', 'coat') ? '🧥' : ''].filter(Boolean).join(' ') || '–', next: t.nextDef },
    /* 2026-10-11 bỏ dòng Sức chứa: túi vô hạn, xe chở đã bỏ */
    { k: 'skill', ic: '🎣', v: tt('rod') + (cnt('crafting', 'lamps') > 0 ? 1 : 0) + (cnt('rocky', 'charged') > 0 ? 1 : 0), max: 5, detail: `🎣 ${R('rod')} · 🏮 ${cnt('crafting', 'lamps')} · ⚡ ${cnt('rocky', 'charged')}`, next: t.nextSkill },
    { k: 'rep', ic: '⭐', v: badges, max: 9, detail: `☺ ${hereMet}/${here.length} · ${UI.lang() === 'vi' ? 'tổng' : 'total'} ${met} · 🏅 ${badges}/9 · 🗿 ${pilots}`, next: t.nextRep },
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
  const C = deps.CTX, lg = UI.lang(), sys = S.save.sys || {};
  const eq = Object.keys(TOOLS).map(id => {   /* plan-22: trang bị (kể cả chưa chế) + tiến độ chuyển từ túi sang đây */
    const tier = C.tool.tier(id), nm = itemName(id, lg);
    return slot(HB.iconId(id), 0, tier ? '' : 'off', `<b>${esc(nm)}${tier ? ' ' + ROMAN[tier] : ''}</b> — ${tier ? esc(t.equip) : esc(t.locked)}`, tier ? `<b class="tier">${ROMAN[tier] || tier}</b>` : `<span class="lock">${stIcon('lock', '')}</span>`);
  });
  const fl = FLAGS.map(([a, b, ic, cnt]) => {
    const v = ((sys[a] || {})[b]) || 0, on = cnt ? v > 0 : !!v;
    return `<div class="slot ${on ? '' : 'off'}" data-tip="<b>${esc(t.fl[b])}</b> — ${on ? (cnt ? '×' + v : '✓') : esc(t.locked)}">${(ui() && ui().items && ui().items['fl_' + b]) ? img(ui().items['fl_' + b]) : b === 'wax' ? icon('wax') : pxText(ic) || `<b class="fl-t">${esc(t.fl[b].slice(0, 2))}</b>`}${cnt && v > 0 ? `<b class="n">${v}</b>` : ''}${on ? '' : `<span class="lock">${stIcon('lock', '')}</span>`}</div>`;
  });
  const inLands = new Set(); for (const z of ZONE_LIST) for (const m of membersOfLevel(z.lv)) inLands.add(m.id);
  const met = (S.save.met || []).filter(id => inLands.has(id)).length, here = S.zone && S.zone.lv != null ? membersOfLevel(S.zone.lv) : [], ms = new Set(S.save.met || []), hereMet = here.filter(m => ms.has(m.id)).length;
  return `<div class="mhero"><canvas class="mav" id="mav" width="64" height="80"></canvas><div><b style="font-size:17px">${name}</b><div class="mhint">${zone}</div>
    <div class="mhint">◆ ${esc(t.shards)} ${S.save.shards || 0} · ${esc(t.met)} ${hereMet}/${here.length} (${UI.lang() === 'vi' ? 'tổng' : 'total'} ${met})</div></div></div>${rows}
    <h3>${UI.lang() === 'vi' ? 'Đất của tôi' : 'My land'}</h3>${landList()}
    ${C.dragon && C.dragon.lookHTML ? C.dragon.lookHTML() : ''}
    <h3>${t.equip}</h3><div class="mgrid">${eq.join('')}</div><h3>${t.progress}</h3><div class="mgrid">${fl.join('')}</div>
    <div id="mtip" class="mtip"><span class="mhint">${t.tipHint}</span></div>`;
}
/* ---------------------------------------------------------------- thẻ Rocky (plan-27) */
function rockyBody() {
  const vi = UI.lang() === 'vi', C = deps.CTX, R = C.rocky, pt = R && R.pet();
  if (!pt) return `<p class="dim" style="padding:8px">${vi ? 'Chưa có Rocky — gặp Lyron trên biển (hoặc ủ trứng tinh thể ở M9).' : 'No Rocky yet — meet Lyron at sea (or warm the crystal egg in M9).'}</p>`;
  const st = R.stats(), lv = RLV.levelFromXp(pt.xp || 0), u = ui(), port = u && u.port_rocky, pct = lv.need ? Math.round(lv.into / lv.need * 100) : 100;
  const bondN = ['Rocky con', 'Bạn thân', 'Tri kỷ'], bondE = ['Hatchling', 'Buddy', 'Best friend'], bl = pt.bond >= 15 ? 2 : pt.bond >= 5 ? 1 : 0;
  const ko = (pt.koT || 0) > 0, sup = (pt.superT || 0) > 0;
  const cmdTxt = ko ? (vi ? `Đang nghỉ ở ổ (${Math.ceil(pt.koT)} giây)` : `Resting at the nest (${Math.ceil(pt.koT)}s)`) : R.cmdName(pt.cmd);
  const row = (k, v) => `<div class="mhint" style="display:flex;justify-content:space-between;gap:10px;font-size:15px"><span>${k}</span><b style="color:var(--gold)">${v}</b></div>`;
  const skills = RLV.SKILL_IDS.map(id => {
    const S2 = RLV.SKILLS[id], t = RLV.tierOf(pt, id), on = t > 0, ic = u && u.items && u.items['rk_skill_' + id];
    const desc = id === 'punch' ? (vi ? 'Lao tới đấm liên hoàn. Bậc 4: đòn cuối hất văng · bậc 7: sóng chấn' : 'Dash in, punch combo. Tier 4: launcher finisher · tier 7: shockwave')
      : id === 'ha' ? (vi ? 'Gồng 0,8 s, bắn luồng sáng thẳng vào mục tiêu, xuyên mọi quái trên đường' : 'Charge 0.8 s, fire a straight beam at the target, piercing every monster in line')
      : (vi ? `Biến hình ${RLV.superOf(Math.max(1, t)).dur} giây, hồi ${RLV.superOf(Math.max(1, t)).cd} giây` : `Transform for ${RLV.superOf(Math.max(1, t)).dur}s, cooldown ${RLV.superOf(Math.max(1, t)).cd}s`);
    const tip = `<b>${esc(vi ? S2.vi : S2.en)}</b> — ${on ? `${vi ? 'bậc' : 'tier'} ${t}/7` : `${vi ? 'mở ở cấp' : 'unlocks at Lv'} ${S2.unlock}`} · ${esc(desc)}`;
    return `<div class="rk-sk" data-tip="${esc(tip)}" style="display:flex;flex-direction:column;align-items:center;gap:2px;min-width:86px">
      <div class="slot ${on ? '' : 'off'}" data-tip="${esc(tip)}" style="width:44px;height:44px">${ic ? img(ic) : `<span class="emo">${S2.icon}</span>`}${on ? `<b class="n">${t}/7</b>` : `<span class="lock">${stIcon('lock', '🔒')}</span>`}</div>
      <span style="font:16px VT323,monospace;color:${on ? 'var(--gold)' : 'var(--dim)'}">${esc(vi ? S2.vi : S2.en)}</span><span class="mhint" style="font-size:13px">${on ? `${vi ? 'Bậc' : 'Tier'} ${t}/7` : `${vi ? 'Cấp' : 'Lv'} ${S2.unlock}`}</span></div>`;
  }).join('');
  return `<div class="mhero" style="align-items:flex-start;gap:12px">${port ? `<img src="assets/px/${port}" alt="" style="width:92px;height:92px;image-rendering:pixelated;background:#241e34;border:2px solid var(--line);border-radius:6px">` : ''}
    <div style="flex:1;min-width:0"><b style="font-size:20px">${esc(pt.name)}</b> <span class="lvb" style="background:var(--gold)">Lv ${lv.lv}${lv.lv >= RLV.LV_CAP ? ' MAX' : ''}</span>${sup ? ` <span class="lvb" style="background:#ffd45e">⚡ ${vi ? 'Siêu Cấp' : 'Super'}</span>` : ''}
      <div class="pbar" title="XP"><div style="width:${pct}%"></div></div><div class="mhint" style="font-size:13px">${lv.need ? `${lv.into}/${lv.need} ${vi ? 'kinh nghiệm tới cấp' : 'XP to Lv'} ${lv.lv + 1}` : (vi ? 'Cấp tối đa' : 'Max level')}</div>
      ${row(vi ? 'Máu' : 'HP', `${Math.round(ko ? pt.hp || 0 : pt.hp ?? st.max)}/${st.max}`)}${row(vi ? 'Công' : 'Attack', st.atk)}${row(vi ? 'Thủ' : 'Defense', st.def)}
      ${row(vi ? 'Độ no' : 'Fullness', Math.round(pt.hunger) + '%')}${row(vi ? 'Độ thân' : 'Bond', `${vi ? bondN[bl] : bondE[bl]} (${Math.round(pt.bond)})`)}${row(vi ? 'Lệnh' : 'Command', esc(cmdTxt))}</div></div>
    <h3>${vi ? 'Chiêu' : 'Skills'}</h3><div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:space-around">${skills}</div>
    <p class="mhint" style="margin-top:8px">${vi ? 'Ra lệnh: bấm Enter (điện thoại: nút chat cạnh nút chụp ảnh) rồi gõ <b>bảo vệ</b> · <b>tấn công</b> · <b>đi theo</b> · <b>về nhà</b>. Khi được đánh, Rocky luôn dùng chiêu mạnh nhất đã hồi: Siêu Cấp → Rocky-ha → Đấm. Sách luyện chiêu: Heathcliff ở chân cầu tàu Biển.' : 'Commands: press Enter (phone: the chat button next to the camera) and type <b>protect</b> · <b>attack</b> · <b>follow</b> · <b>home</b>. When allowed to fight, Rocky always uses its strongest ready skill: Super → Rocky-ha → Punch. Skill books: Heathcliff at the foot of the Sea pier.'}</p>
    <div id="mtip" class="mtip"><span class="mhint">${L().tipHint}</span></div>`;
}
function landList() {   /* plan-25: mảnh đất đã mua (vùng · quốc gia · cỡ) */
  const vi = UI.lang() === 'vi', all = (deps.S.save.lands) || {}, rows = [];
  for (const [z, arr] of Object.entries(all)) for (const l of arr) { const zone = ZONE_LIST.find(q => q.id === z), zn = zone ? (zone.name[UI.lang()] || zone.name.en) : z; rows.push(`<div class="mhint">${esc(zn)} · ${esc(l.nation)} · ${l.w}×${l.h}</div>`); }
  return rows.length ? rows.join('') : `<p class="dim" style="padding:4px 2px">${vi ? 'Chưa có mảnh đất nào — gặp Leader các quốc gia để mua.' : 'No land yet — meet the leaders of each nation to buy some.'}</p>`;
}
function drawAvatar() {
  const c = el.querySelector('#mav'), p = deps.S.player; if (!c || !p || !p.sheet) return;
  const g = c.getContext('2d'); g.imageSmoothingEnabled = false; g.clearRect(0, 0, 64, 80);
  const sk = p.sheet.skin;   /* plan-29: ngoại hình Chad: vẽ khung đứng hướng nam, 2 px màn / 1 px ảnh (giữ pixel nguyên) */
  try { if (sk) g.drawImage(sk.img, 0, 0, sk.cw, sk.ch, Math.round(32 - sk.cw), Math.round(80 - sk.ch * 2), sk.cw * 2, sk.ch * 2); else g.drawImage(p.sheet, 0, 0, 16, 20, 0, 0, 64, 80); } catch (e) { /* sheet chưa sẵn */ }
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
  const vol = (k, label, v) => `<label class="mvol"><span>${label}</span><input type="range" min="0" max="100" value="${Math.round(v * 100)}" data-vol="${k}"><b>${Math.round(v * 100)}%</b></label>`;
  const mv = AUDIO.getMusicVolume ? AUDIO.getMusicVolume() : 0.5, sv = AUDIO.getSfxVolume ? AUDIO.getSfxVolume() : 0.5;
  return `<div class="mgear"><button class="btn primary" data-act="resume">${t.resume}</button><button class="btn" data-act="lang">${t.lang}</button>
    ${vol('music', t.musicVol, mv)}${vol('sfx', t.sfxVol, sv)}
    <button class="btn" data-act="music">♪ ${t.music}: ${on ? t.on : t.off}</button><button class="btn" data-act="fs">⛶ ${t.fs}</button><button class="btn" data-act="quit">${t.quit}</button></div>`;
}
