// menu.js — plan-10: menu phụ kiểu RPG pixel (Esc / B / Q / I): Túi đồ · Nhân vật · Nhiệm vụ · Cài đặt.
// Không dừng thế giới: mode 'menu' chỉ khóa điều khiển người chơi (main.js), hệ thống vẫn chạy; nội dung tự làm mới mỗi 1,5 s.
// Asset PixelLab qua manifest.ui (assets/px/ui/*): khung viền 9 mảnh, icon vật phẩm, icon thẻ/trạng thái. Không có ảnh → emoji + viền CSS.
import { ART } from './art.js';
import { ITEMS, TOOLS, itemName, MERGED } from './items.js';   /* p80: 6 dụng cụ đã gộp vào Búa Seismic */
import { ZONE_LIST } from './world.js';
import { membersOfLevel } from './data.js';
import * as UI from './ui.js';
import { questRows } from './systems/quests.js';
import { bagPrice, sellFromBag } from './systems/market.js';
import * as HB from './hotbar.js';   /* plan-20: đưa món lên hotbar */
import { pxText, keyHint, isTouchUI } from './hud.js';   /* plan-22: emoji → icon pixel */
import * as AUDIO from './audio.js';
import { isEasy, setDiff, diffLabel } from './systems/diff.js';   /* plan-44 C2: Độ khó Dễ / Thường */
import { MAX_LV as HMAX_LV, needXp as hNeedXp } from './systems/hero.js';   /* thẻ Nhân vật: chỉ số chiến đấu */
import * as RLV from './systems/petlv.js';
import { collect, nextSteps, rescued, fmtTime } from './journey.js';   /* plan-44 P1/P2/R3/R4: bộ sưu tập + thống kê hành trình */
import { exportCode, parseCode, importSave } from './save.js';   /* plan-44 Q6: xuất / nhập mã lưu */   /* plan-27: thẻ Rocky (cấp, chỉ số, chiêu) */   /* 2026-10-10: 2 thanh âm lượng nhạc / hiệu ứng */

const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const ROMAN = ['', 'I', 'II', 'III'];
const TABS = ['bag', 'shop', 'hero', 'anlinh', 'quest', 'gear'];   /* c29-vat (anh 04/11 'Bỏ mục Rocky này ra khỏi game'): bỏ thẻ Rocky (rockyBody / pet.js giữ nguyên) */   /* 2026-10-15: thẻ Ấn Linh (linh thú + nâng cấp) */   /* plan-27: thẻ Rocky */   /* 2026-10-10 anh yêu cầu: 'Mua nhanh' công cụ bằng đá Seismic, không qua NPC (phím O) */
const STR = {
  en: {
    tabs: { bag: 'Bag', shop: 'Quick buy', hero: 'Character', rocky: 'Rocky', anlinh: 'Spirit Seal', quest: 'Quests', gear: 'Settings' }, foot: 'Esc · close   ·   ← → or 1-6 · tabs   ·   B bag · O quick buy · Q quests', footTouch: 'Esc · close   ·   tap a tab to switch',
    shopHint: 'Buy tools and supplies instantly with Seismic stones — no need to find a trader. Bought goods drop at your feet.', tier: 'tier', buyT: (n, p) => `Tier ${n} · ${p} 🪨`, maxT: 'Max tier', buyN: (n, p) => `×${n} · ${p} 🪨`, poor: 'Not enough Seismic stones', boughtT: (n, k) => `${n} tier ${k} — ready on your hotbar`, supplies: 'Supplies', tools: 'Tools',
    equip: 'Equipment', progress: 'Progress', tool: 'Tool tier', currency: 'Currency — gift it to villagers so they can fight', food: 'Food — right-click / E to eat', seedK: 'Seed — plant on tilled soil', dragHint: 'Drag to rearrange · top row = hotbar', trash: 'Drop here to throw away', sort: 'Sort', noTrash: "That can't be thrown away.", trashAsk: (n, k) => `Throw away ${n}${k > 1 ? ' (×' + k + ')' : ''}?`, trash1: 'Throw 1', trashAll: 'Throw all', shards: 'Tremor shards', met: 'Artists met', items: 'Items', load: 'Bag load', empty: 'Nothing in the bag yet — chop, mine, gather.', tipHint: 'Hover or tap a slot to read about it.',
    locked: 'Not crafted yet', weight: 'weight', count: 'count', sell: 'Sell at the village trader', sell1: 'Sell 1', sellAll: 'Sell all', toBar: k => `To slot ${k}`, onBar: (n, k) => `${n} → hotbar slot ${k}`, eat: 'Eat', ate: n => `Yum, ${n}! You feel lively — walking faster for 30 s`, sellHere: 'sell right from the bag', material: 'Crafting / building material', story: 'Story item',
    fl: { raft: 'Raft', sail: 'Sail', wax: 'Ski wax', tires: 'Obsidian tires', cape: 'Rocky cape', armor: 'Rocky armour', coat: 'Warm coat', lamps: 'Crystal lamps', charged: 'Rocky charges' },
    stats: { str: 'Tools', agi: 'Agility', def: 'Defense', skill: 'Skill', rep: 'Reputation' },
    statHint: { str: 'Seismic Hammer tier', agi: 'Walk · ski wax · obsidian tires · sail · tamed horse', def: 'Rocky armour · warm coat', skill: 'Fishing rod · crystal lamps · Rocky charges', rep: 'Artists met · badges' },
    next: 'Next: ', up: 'up since last time', down: 'down since last time', same: '',
    nextStr: { 1: 'Seismic Hammer I at the workbench (6 wood + 2 rock)', 2: 'Seismic Hammer II at the furnace M4/M5 (3 iron + 2 wood) or Quick buy', 3: 'Seismic Hammer III at the forge M7/M8 (4 obsidian + 2 iron) or Quick buy' },
    nextAgi: 'Ski wax (M8 workbench: 2 wax) · Obsidian tires (forge) · Sail (loom: 6 wool + 2 rope) · Tame a horse (M2: feed it 3 hay)',
    nextDef: 'Rocky armour (forge: worm hide + 4 obsidian) · Warm coat (loom: yeti fur + 4 wool)',
    nextSkill: 'Rod II (furnace) · Rod III (altar M9) · Crystal lamp (altar: 2 crystal + 1 glass) · Rocky charge (altar: 3 crystal)',
    nextRep: 'Meet artists in each land (E to talk) · finish land quests for badges',
    main: 'Main story', side: 'Requests', none: 'No requests taken — look for a yellow ! above an artist.', reward: 'reward', here: 'here',
    qSea: 'Sea of Origins', qSeaText: 'Drift on the plank, meet Lyron, paddle the raft to the harbour.',
    qLand: (n, t) => `Meet ${n}/${t} artists`, qLocked: lv => `Locked — earn the Magnitude ${lv}.0 badge first`, badgeDone: 'Badge earned',
    qGather: 'Three gifts for the deep', qGatherText: 'Forge the diving bell, get the trench map, receive the core crystal.', qGatherLocked: 'Opens after the nine lands',
    qTrench: 'The Kraken Trench', qTrenchText: 'Dive with a Rocky, bring Lyron home.', qHome: 'Lyron is home — the harbour lights its lanterns.',
    resume: 'Resume', lang: 'Tiếng Việt', musicVol: 'Music', sfxVol: 'Sound effects', music: 'Music', fs: 'Fullscreen', quit: 'Save & quit to title', on: 'on', off: 'off'
  },
  vi: {
    tabs: { bag: 'Túi đồ', shop: 'Mua nhanh', hero: 'Nhân vật', rocky: 'Rocky', anlinh: 'Ấn Linh', quest: 'Nhiệm vụ', gear: 'Cài đặt' }, foot: 'Esc · đóng   ·   ← → hoặc 1-6 · đổi thẻ   ·   B túi · O mua nhanh · Q nhiệm vụ', footTouch: 'Esc · đóng   ·   chạm thẻ để đổi',
    shopHint: 'Mua công cụ và vật tư ngay bằng đá Seismic — không cần tìm thương nhân. Đồ mua rơi ngay dưới chân.', tier: 'cấp', buyT: (n, p) => `Cấp ${n} · ${p} 🪨`, maxT: 'Cấp tối đa', buyN: (n, p) => `×${n} · ${p} 🪨`, poor: 'Không đủ đá Seismic', boughtT: (n, k) => `${n} cấp ${k} — đã lên thanh công cụ`, supplies: 'Vật tư', tools: 'Công cụ',
    equip: 'Trang bị', progress: 'Tiến độ', tool: 'Dụng cụ cấp', currency: 'Tiền — tặng dân làng để họ biết chiến đấu', food: 'Đồ ăn — chuột phải / E để ăn', seedK: 'Hạt giống — gieo trên đất đã cày', dragHint: 'Kéo để xếp · hàng trên = thanh công cụ', trash: 'Thả vào đây để vứt', sort: 'Xếp gọn', noTrash: 'Món này không vứt được.', trashAsk: (n, k) => `Vứt ${n}${k > 1 ? ' (×' + k + ')' : ''}?`, trash1: 'Vứt 1', trashAll: 'Vứt hết', shards: 'Mảnh địa chấn', met: 'Nghệ sĩ đã gặp', items: 'Vật phẩm', load: 'Tải túi', empty: 'Túi chưa có gì — chặt cây, đập đá, nhặt đồ đi.', tipHint: 'Rê chuột hoặc chạm ô để xem mô tả.',
    locked: 'Chưa chế', weight: 'nặng', count: 'số lượng', sell: 'Bán ở Thương nhân Làng', sell1: 'Bán 1', sellAll: 'Bán hết', toBar: k => `Lên ô ${k}`, onBar: (n, k) => `${n} → ô ${k} trên thanh`, eat: 'Ăn', ate: n => `Ngon quá, ${n}! Thấy khoẻ khoắn — đi nhanh hơn 30 giây`, sellHere: 'bán ngay tại túi', material: 'Nguyên liệu chế tạo / xây dựng', story: 'Vật phẩm cốt truyện',
    fl: { raft: 'Bè', sail: 'Buồm', wax: 'Sáp trượt', tires: 'Lốp obsidian', cape: 'Áo choàng Rocky', armor: 'Giáp Rocky', coat: 'Áo ấm', lamps: 'Đèn tinh thể', charged: 'Pin Rocky' },
    stats: { str: 'Dụng cụ', agi: 'Nhanh nhẹn', def: 'Phòng thủ', skill: 'Kỹ năng', rep: 'Uy tín' },
    statHint: { str: 'Cấp Búa Seismic', agi: 'Đi bộ · sáp trượt · lốp obsidian · buồm · ngựa đã thuần', def: 'Giáp Rocky · áo ấm', skill: 'Cần câu · đèn tinh thể · pin Rocky', rep: 'Nghệ sĩ đã gặp · huy hiệu' },
    next: 'Tăng tiếp: ', up: 'tăng so với lần trước', down: 'giảm so với lần trước', same: '',
    nextStr: { 1: 'Búa Seismic I ở Bàn mộc (6 gỗ + 2 đá)', 2: 'Búa Seismic II ở Lò nung M4/M5 (3 sắt + 2 gỗ) hoặc Mua nhanh', 3: 'Búa Seismic III ở Lò rèn M7/M8 (4 obsidian + 2 sắt) hoặc Mua nhanh' },
    nextAgi: 'Sáp trượt (Bàn mộc M8: 2 sáp) · Lốp obsidian (Lò rèn) · Buồm (Khung dệt: 6 len + 2 dây) · Thuần ngựa (M2: cho ăn 3 rơm)',
    nextDef: 'Giáp Rocky (Lò rèn: da sâu + 4 obsidian) · Áo ấm (Khung dệt: lông yeti + 4 len)',
    nextSkill: 'Cần câu II (Lò nung) · Cần câu III (Bàn thờ M9) · Đèn tinh thể (Bàn thờ: 2 tinh thể + 1 kính) · Pin Rocky (Bàn thờ: 3 tinh thể)',
    nextRep: 'Gặp nghệ sĩ ở từng vùng (bấm E nói chuyện) · xong nhiệm vụ vùng để lấy huy hiệu',
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
function icon(id) { const u = ui(), p = u && u.items && (u.items[id] || (/^rkbook_/.test(id) && u.items[id.replace(/_\d+$/, '')])), d = ITEMS[id] || TOOLS[id]; return p ? img(p) : `<span class="emo">${d ? d.icon : '▪'}</span>`; }
function stIcon(k, fb) { const u = ui(), p = u && u.status && u.status[k]; return p ? img(p, 'pxi st ' + k) : `<span class="emo st">${fb}</span>`; }
function tabIcon(k, fb) { const u = ui(), p = u && u.tabs && (u.tabs[k] || (k === 'shop' && u.items && u.items.stone)); return p ? img(p, 'pxi st') : `<span class="emo st">${fb}</span>`; }
const TAB_FB = { bag: '🎒', shop: '🪨', hero: '☺', rocky: '🗿', anlinh: '🔮', quest: '📜', gear: '⚙' };

export function initMenu(d) {
  deps = d; el = document.createElement('div'); el.id = 'menu'; el.className = 'ov'; el.hidden = true; document.body.appendChild(el);
  injectCSS();
  el.addEventListener('keydown', e => { if (e.target && e.target.tagName === 'TEXTAREA') e.stopPropagation(); });   /* plan-44 Q6: gõ / dán mã lưu không đổi thẻ, không bật phím game */
  el.addEventListener('change', e => { const f = e.target.closest && e.target.closest('[data-importfile]'); if (f && f.files && f.files[0]) { const r = new FileReader(); r.onload = () => { const ta = el.querySelector('#m-imp'); if (ta) ta.value = String(r.result || ''); checkImport(); }; r.readAsText(f.files[0]); } });
  el.addEventListener('pointerover', e => { const s = e.target.closest('[data-tip]'); if (s) setTip(s.dataset.tip); const v = e.target.closest('[data-pos]'); if (v && e.pointerType === 'mouse') showTT(v, e); else if (!v) hideTT(); });
  el.addEventListener('pointermove', e => moveTT(e));
  el.addEventListener('input', e => {   /* thanh âm lượng: nhạc nền / hiệu ứng (bộ âm thanh mới) */
    const r = e.target.closest('[data-vol]'); if (!r) return; const v = r.value / 100;
    if (r.dataset.vol === 'music') { if (AUDIO.setMusicVolume) AUDIO.setMusicVolume(v); } else { if (AUDIO.setSfxVolume) AUDIO.setSfxVolume(v); if (AUDIO.sfx) AUDIO.sfx('click'); }
    if (r.nextElementSibling) r.nextElementSibling.textContent = r.value + '%';
  });
  el.addEventListener('pointerleave', hideTT);
  el.addEventListener('dblclick', e => { const v = e.target.closest('[data-pos]'), id = v && v.dataset.id; if (id && ITEMS[id] && ITEMS[id].rk) { e.preventDefault(); doRead(id); } });   /* 2026-10-13 anh: bấm đúp sách Rocky trong túi = Đọc */
  el.addEventListener('pointerdown', e => {
    const v = e.target.closest('[data-pos]'); if (v) { e.preventDefault(); dragStart(e, v); return; }   /* plan-22: ô túi → kéo-thả / chọn */
    const bb = e.target.closest('[data-buy]'); if (bb) { e.preventDefault(); doBuy(bb.dataset.buy); return; }
    const dl = e.target.closest('[data-del]'); if (dl) { e.preventDefault(); const id = dl.dataset.del, n = dl.dataset.w === 'all' ? deps.CTX.bag.count(id) : 1; deps.CTX.bag.remove(id, n); tip = ''; selId = null; render(); return; }
    const s = e.target.closest('[data-tip]'); if (s) setTip(s.dataset.tip);
    const t = e.target.closest('[data-tab]'); if (t) { tab = t.dataset.tab; render(); }
    const a = e.target.closest('[data-act]'); if (a) { e.preventDefault(); act(a.dataset.act); }
    const b = e.target.closest('[data-sell]'); if (b) { e.preventDefault(); doSell(b.dataset.sell, b.dataset.w); }
    const f = e.target.closest('[data-eat]'); if (f) { e.preventDefault(); doEat(f.dataset.eat); }
    const rb = e.target.closest('[data-rkread]'); if (rb) { e.preventDefault(); doRead(rb.dataset.rkread); return; }   /* 2026-10-13 anh: đọc sách Rocky từ túi */
    const hb = e.target.closest('[data-hrbook]'); if (hb) { e.preventDefault(); closeMenu(); if (deps.CTX.hrBook) deps.CTX.hrBook.open(); return; }   /* plan-30: sách bậc 8 (thưởng Hắc Rocky) */
    const z19 = e.target.closest('[data-size19]'); if (z19) { e.preventDefault(); if (deps.CTX.size19) deps.CTX.size19.set(z19.dataset.size19); render(); return; }   /* c19-zoom: Cỡ hiển thị */
    const gx = e.target.closest('[data-gfx]'); if (gx) { e.preventDefault(); if (deps.CTX.gfx) deps.CTX.gfx.cycle(); render(); return; }   /* plan-37: Đồ họa Tự động / Đẹp / Mượt */
    const ct = e.target.closest('[data-ctteam]'); if (ct) { e.preventDefault(); closeMenu(); if (deps.CTX.chanthu && deps.CTX.chanthu.openTeam) deps.CTX.chanthu.openTeam(); return; }   /* c6: Chấn Thú đã thu phục trong thẻ Ấn Linh → bảng Đội Chấn Thú */
    const la = e.target.closest('[data-ltsel],[data-ltinfo],[data-ltadd],[data-ltdel],[data-ltup],[data-ltorb]'); if (la && deps.CTX.linhthu && deps.CTX.linhthu.act) { e.preventDefault(); const D = la.dataset, kind = D.ltsel != null ? 'sel' : D.ltinfo != null ? 'info' : D.ltadd != null ? 'add' : D.ltdel != null ? 'del' : D.ltorb != null ? 'orb' : 'up'; if (kind === 'orb') { closeMenu(); deps.CTX.linhthu.act('orb'); return; }   /* 2026-10-15 anh: nút Gọi ra / Thu về — đóng menu rồi gọi */ deps.CTX.linhthu.act(kind, D.ltsel ?? D.ltinfo ?? D.ltadd ?? D.ltdel ?? D.ltup); render(true); if (kind === 'info' || kind === 'sel') { const ib = el.querySelector('.ltp-info'); if (ib && ib.scrollIntoView) ib.scrollIntoView({ block: 'nearest' }); } return; }   /* 2026-10-15 thẻ Ấn Linh: chọn ô đội / xem / mang theo / bỏ / nâng cấp */
    const lq = e.target.closest('[data-lt]'); if (lq) { e.preventDefault(); if (deps.CTX.linhthu) deps.CTX.linhthu.pick(lq.dataset.lt); render(); return; }   /* plan-39: chọn linh thú đi cùng */
    const ht = e.target.closest('[data-ht]'); if (ht) { e.preventDefault(); if (deps.CTX.hopthe) { const a = ht.dataset.ht; deps.CTX.hopthe.menuAct(a); if (a === 'toggle' || a === 'wear') closeMenu(); else render(); } return; }   /* plan-50: Hợp thể / đeo-tháo Bông Tai */
    const rq = e.target.closest('[data-rkeq]'); if (rq) { e.preventDefault(); if (deps.CTX.rkCore) deps.CTX.rkCore.toggle(rq.dataset.rkeq); render(); return; }   /* plan-38: mang / bỏ chiêu học từ trùm */
    const df = e.target.closest('[data-diff]'); if (df) { e.preventDefault(); const S = deps.S; setDiff(S.save, isEasy(S.save) ? 'normal' : 'easy'); if (deps.CTX.persist) deps.CTX.persist(); render(); return; }   /* plan-44 C2: Độ khó — áp cho trận / quái sinh ra SAU khi đổi */
    const km = e.target.closest('[data-kimode]'); if (km) { e.preventDefault(); if (deps.CTX.ki) deps.CTX.ki.toggleAuto(); render(); return; }   /* plan-34: Ki tự động / dùng tay */
    const rn30 = e.target.closest('[data-rn30]'); if (rn30) { e.preventDefault(); const c8 = window.__cloud82; if (c8 && c8.renamePanel) c8.renamePanel().then(() => render()); return; }   /* c30-tk: đổi tên hiển thị (cloud82.js) */
    const dg = e.target.closest('[data-dragon]'); if (dg) { e.preventDefault(); closeMenu(); if (deps.CTX.dragon) deps.CTX.dragon.summon(); return; }   /* plan-29 */
    const lk = e.target.closest('[data-look]'); if (lk) { e.preventDefault(); if (deps.CTX.dragon) deps.CTX.dragon.wear(lk.dataset.look === 'chad'); render(); return; }   /* plan-29: thẻ Ngoại hình */
    const jb = e.target.closest('[data-journey]'); if (jb) { e.preventDefault(); openCert(); return; }   /* plan-44 P2 */
    const xb = e.target.closest('[data-save]'); if (xb) { e.preventDefault(); saveAct(xb.dataset.save); return; }   /* plan-44 Q6 */
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
/* 2026-10-13 anh: sách luyện Rocky trong túi → Đọc. Đủ điều kiện: Rocky lên bậc (VFX + toast sẵn có trong pet.js), trừ 1 sách, đóng túi để thấy hiệu ứng.
   Chưa đủ (chưa có Rocky / thiếu cấp / chưa đọc bậc trước / đã vượt bậc) → GIỮ sách, báo lý do ở thanh mô tả + toast. rkbook8 → bảng chọn chiêu (hacrocky.js) */
function rkWhy(pt, id, n) {
  const vi = UI.lang() === 'vi'; if (!pt) return vi ? 'Chưa có Rocky — ấp nở trứng Rocky trước rồi mới đọc sách.' : 'No Rocky yet — hatch the Rocky egg first.';
  const c = RLV.canBook(pt, id, n), S2 = RLV.SKILLS[id], nm = vi ? S2.vi : S2.en, cur = RLV.tierOf(pt, id), lv = RLV.levelFromXp(pt.xp || 0).lv, need = RLV.bookNeedLv(id, n);
  if (c.ok) return '';
  if (c.why === 'core') { const b = { hacrocky: vi ? 'Hắc Rocky' : 'Shadow Rocky', trongdong: vi ? 'Trống Đồng' : 'the Bronze Drum', guong: vi ? 'Gương Địa Chấn' : 'the Quake Mirror', hoden: vi ? 'Hố Đen Địa Tâm' : 'the Void Devourer', dongho: vi ? 'Đồng Hồ Đứt Dây' : 'the Broken Clock', bakunawa: vi ? 'Ngô Công Lôi Thần' : 'the Thunder Centipede' }[S2.core] || S2.core; return vi ? `Rocky chưa học ${nm} — hạ ${b} để Rocky ăn mảnh lõi trước.` : `Rocky hasn't learned ${nm} — defeat ${b} so Rocky can eat its core first.`; }   /* plan-38 */
  if (c.why === 'have') return vi ? `${nm} đã ở bậc ${cur} — sách bậc ${n} không còn tác dụng.` : `${nm} is already tier ${cur} — this tier-${n} book is no use.`;
  const lvTxt = lv < need ? (vi ? `Rocky cần cấp ${need} (đang cấp ${lv})` : `Rocky needs Lv ${need} (now Lv ${lv})`) : '';
  if (c.why === 'prev') return (cur === 0 ? (vi ? `Rocky chưa mở chiêu ${nm} (mở ở cấp ${S2.unlock})` : `Rocky hasn't unlocked ${nm} (unlocks at Lv ${S2.unlock})`) : (vi ? `Cần đọc ${nm} bậc ${n - 1} trước (đang bậc ${cur})` : `Read ${nm} tier ${n - 1} first (now tier ${cur})`)) + (lvTxt && cur > 0 ? ' · ' + lvTxt : '') + '.';
  return (lvTxt || (vi ? 'Chưa đọc được.' : "Can't read yet.")) + (lvTxt ? '.' : '');
}
function doRead(id) {
  const C = deps.CTX, d = ITEMS[id]; if (!d || !d.rk || !C.bag.has(id, 1)) return false;
  const pt = C.rocky && C.rocky.pet(), fail = m => { selId = id; setTip(tipOf(id) + `<div class="mhint rk-why" style="color:#ffb4a0">⚠ ${esc(m)}</div>`); C.toast(m); if (C.sfx) C.sfx('fail'); return false; };
  if (d.rk.fly) { const r = C.skyFly ? C.skyFly.read() : { ok: false, why: '…' }; if (!r || !r.ok) return fail((r && r.why) || '…'); C.bag.remove(id, 1); tip = ''; selId = null; closeMenu(); if (C.persist) C.persist(); return true; }   /* plan-31: sách Rocky 'Bay' (sky.js) */
  if (!pt) return fail(rkWhy(null));
  if (!d.rk.id) {   /* sách bậc 8 */
    if (!RLV.SKILL_IDS.some(k => RLV.tierOf(pt, k) === RLV.TIER_SHOP)) return fail(UI.lang() === 'vi' ? 'Chưa chiêu nào của Rocky ở bậc 7 — đọc đủ sách tới bậc 7 rồi dùng sách bậc 8.' : 'No Rocky skill at tier 7 yet — reach tier 7 first.');
    closeMenu(); if (C.hrBook) C.hrBook.open(); return true;
  }
  const why = rkWhy(pt, d.rk.id, d.rk.n); if (why) return fail(why);
  const r = C.rocky.readBook(d.rk.id, d.rk.n); if (!r || r.ok === false) return fail(rkWhy(pt, d.rk.id, d.rk.n) || (UI.lang() === 'vi' ? 'Chưa đọc được.' : "Can't read yet."));
  C.bag.remove(id, 1); tip = ''; selId = null; closeMenu(); if (C.persist) C.persist(); return true;
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
  if (t) tab = TABS.includes(t) ? t : 'bag'; tip = ''; render(); el.hidden = false; deps.setMode('menu');   /* c29-vat: thẻ đã bỏ (rocky) → Túi đồ */
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
  if (/^Digit[1-9]$/.test(code) && TABS[+code[5] - 1]) { tab = TABS[+code[5] - 1]; render(); return true; }   /* c29-vat: số thẻ theo TABS (6 thẻ) */
  return code === 'ArrowUp' || code === 'ArrowDown' || code === 'KeyW' || code === 'KeyS';   /* nuốt phím di chuyển cho người chơi không đi */
}

// ---------------------------------------------------------------- khung
function render(soft) {
  const t = L(), u = ui(), px = !!(u && u.frame);
  const body = el.querySelector('.mbody'), scroll = soft && body ? body.scrollTop : 0;
  const tabs = TABS.map(k => `<div class="mtab ${k === tab ? 'on' : ''}" data-tab="${k}">${tabIcon(k, TAB_FB[k])}<span>${t.tabs[k]}</span></div>`).join('');
  const inner = tab === 'bag' ? bagBody() : tab === 'shop' ? shopBody() : tab === 'hero' ? heroBody() : tab === 'rocky' ? rockyBody() : tab === 'anlinh' ? anlinhBody() : tab === 'quest' ? questBody() : gearBody();
  const cls = `<button class="px-x m-x" type="button" data-act="resume" aria-label="${esc(t.resume)}"><img src="assets/px/ui/hud/close.png" alt=""></button>`;   /* plan-25 B5: ✕ đóng túi trên điện thoại (CSS ẩn ở desktop) */
  el.innerHTML = `<div class="mframe ${px ? 'px' : ''}"><div class="mtabs">${tabs}${cls}</div><div class="mbody">${inner}</div>` +
    (tab === 'bag' ? `<div id="mtip" class="mtip">${tip || `<span class="mhint">${t.tipHint}</span>`}</div>` : '') + `<div class="mfoot">${isTouchUI() ? keyHint(t.footTouch) : t.foot}</div></div>`;
  if (tab === 'hero') drawAvatar();
  if (tab === 'rocky') drawRocky();
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
  if (d && d.rk) return UI.lang() === 'vi' ? 'Sách luyện Rocky — chọn rồi bấm Đọc (máy tính: bấm đúp)' : 'Rocky training book — select, then Read (desktop: double-click)';   /* 2026-10-13 anh */
  return d.tags.includes('food') ? t.food : id.startsWith('seed') ? t.seedK : d.tags.includes('carry') ? t.sell : d.tags.includes('sea') || /divebell|trenchmap|greatcrystal|scarf/.test(id) ? t.story : t.material;
}
/* nội dung thanh mô tả dưới túi (bấm chọn ô): tên · loại · nút Ăn / Bán */
function tipOf(id) {
  const t = L(), S = deps.S, C = deps.CTX, lg = UI.lang(), d = ITEMS[id], n = TOOLS[id] ? 0 : (S.save.inv[id] || 0);
  const pr = !d || id === 'stone' ? null : bagPrice(C, id);
  const eat = d && d.tags.includes('food') ? `<button class="btn" data-eat="${id}">${esc(t.eat)}</button>` : '';
  const sb = pr ? `<button class="btn" data-sell="${id}" data-w="1">${esc(t.sell1)} · +${pr.one} 🪨</button>${pr.n > 1 ? `<button class="btn primary" data-sell="${id}" data-w="all">${esc(t.sellAll)} · +${pr.all} 🪨</button>` : ''}` : '';
  const dr = /^dball\d$/.test(id) && C.dragon && C.dragon.hasAll() ? `<button class="btn primary" data-dragon="1">${esc(C.dragon.label())}</button>` : '';   /* plan-29: đủ 7 Ngọc Rồng → gọi Rồng Thần */
  const rd = d && d.rk ? `<button class="btn primary" data-rkread="${id}">${UI.lang() === 'vi' ? '📖 Đọc' : '📖 Read'}</button>` : '';   /* 2026-10-13 anh: sách Rocky */
  const btn = eat || sb || dr || rd ? ` <span class="msell">${rd}${dr}${eat}${sb}</span>` : '';
  return pxText(`${itemName(id, lg)}${n > 1 ? ' ×' + n : ''} · ${d && d.desc ? d.desc[lg] || d.desc.en : kindText(id)}${pr ? ' · ' + t.sellHere : ''}`) + btn.replace(/🪨/g, img('ui/items/stone.png'));
}
function invSlot(pos, id, key) {
  const S = deps.S, C = deps.CTX, n = id && !TOOLS[id] ? S.save.inv[id] || 0 : 0, tier = id && TOOLS[id] ? C.tool.tier(id) : 0;
  const ic = id ? icon(HB.iconId(id)) : '';
  return `<div class="slot iv${id ? '' : ' empty'}${id && id === selId ? ' sel' : ''}" data-pos="${pos}"${id ? ` data-id="${id}"` : ''}>${key ? `<i class="ik">${key}</i>` : ''}${ic}${n > 1 ? `<b class="n">${n}</b>` : ''}${tier > 1 && id !== 'sword' ? `<b class="tier">${ROMAN[tier] || tier}</b>` : ''}${id && ITEMS[id] && ITEMS[id].rk ? `<b class="tier">${ITEMS[id].rk.n}</b>` : ''}</div>`;
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
const TOOL_MAX = { bua: 3, rod: 3, sword: 6 };   /* p80 đợt 3: Búa Seismic thay Rìu / Cuốc / Xẻng / Liềm / Dao / Đuốc */   /* bỏ xe chở, thòng lọng, bẫy, yên 2026-10-11 */
const TOOL_BASE = { bua: 25, rod: 20, sword: 30 };   /* p80: Búa lấy giá Cuốc cũ → I 25 · II 75 · III 200 🪨 */
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
  const tools = Object.keys(TOOLS).filter(id => !MERGED.includes(id)).map(id => {
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
  const R = k => ROMAN[tt(k)] || '–', lo = tt('bua');   /* p80: Sức mạnh = cấp Búa Seismic */
  const horse = !!(((sys.ecology || {}).horse || {}).tamed);   /* 2026-10-11 bỏ yên ngựa: điểm Nhanh nhẹn tính theo ngựa đã thuần (cưỡi không cần yên) */
  return [
    { k: 'str', ic: '⚔', v: tt('bua') * 2, max: 6, detail: `${icon('bua')} ${R('bua')}`, next: lo < 3 ? t.nextStr[lo + 1] : '' },
    { k: 'agi', ic: '🏃', v: 1 + (fl('vehicles', 'wax') ? 1 : 0) + (fl('vehicles', 'tires') ? 1 : 0) + (fl('vehicles', 'sail') ? 1 : 0) + (horse ? 1 : 0), max: 5,
      detail: ['🚶', fl('vehicles', 'wax') ? '🎿' : '', fl('vehicles', 'tires') ? '🛞' : '', fl('vehicles', 'sail') ? '⛵' : '', horse ? '🐎' : ''].filter(Boolean).join(' '), next: t.nextAgi },
    { k: 'def', ic: '🛡', v: (fl('rocky', 'armor') ? 1 : 0) + (fl('ecology', 'coat') ? 1 : 0), max: 2,
      detail: [fl('rocky', 'armor') ? '🛡' : '', fl('ecology', 'coat') ? '🧥' : ''].filter(Boolean).join(' ') || '–', next: t.nextDef },
    /* 2026-10-11 bỏ dòng Sức chứa: túi vô hạn, xe chở đã bỏ */
    { k: 'skill', ic: '🎣', v: tt('rod') + (cnt('crafting', 'lamps') > 0 ? 1 : 0) + (cnt('rocky', 'charged') > 0 ? 1 : 0), max: 5, detail: `🎣 ${R('rod')} · 🏮 ${cnt('crafting', 'lamps')} · ⚡ ${cnt('rocky', 'charged')}`, next: t.nextSkill },
    { k: 'rep', ic: '⭐', v: badges, max: 9, detail: `☺ ${hereMet}/${here.length} · ${UI.lang() === 'vi' ? 'tổng' : 'total'} ${met} · 🏅 ${badges}/9`, next: t.nextRep },
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
  const eq = Object.keys(TOOLS).filter(id => !MERGED.includes(id)).map(id => {   /* plan-22: trang bị (kể cả chưa chế) + tiến độ chuyển từ túi sang đây */
    const tier = C.tool.tier(id), nm = itemName(id, lg);
    return slot(HB.iconId(id), 0, tier ? '' : 'off', `<b>${esc(nm)}${tier ? ' ' + ROMAN[tier] : ''}</b> — ${tier ? esc(t.equip) : esc(t.locked)}`, tier ? `<b class="tier">${ROMAN[tier] || tier}</b>` : `<span class="lock">${stIcon('lock', '')}</span>`);
  });
  const fl = FLAGS.map(([a, b, ic, cnt]) => {
    const v = ((sys[a] || {})[b]) || 0, on = cnt ? v > 0 : !!v;
    return `<div class="slot ${on ? '' : 'off'}" data-tip="<b>${esc(t.fl[b])}</b> — ${on ? (cnt ? '×' + v : '✓') : esc(t.locked)}">${(ui() && ui().items && ui().items['fl_' + b]) ? img(ui().items['fl_' + b]) : b === 'wax' ? icon('wax') : pxText(ic) || `<b class="fl-t">${esc(t.fl[b].slice(0, 2))}</b>`}${cnt && v > 0 ? `<b class="n">${v}</b>` : ''}${on ? '' : `<span class="lock">${stIcon('lock', '')}</span>`}</div>`;
  });
  const inLands = new Set(); for (const z of ZONE_LIST) for (const m of membersOfLevel(z.lv)) inLands.add(m.id);
  const met = (S.save.met || []).filter(id => inLands.has(id)).length, here = S.zone && S.zone.lv != null ? membersOfLevel(S.zone.lv) : [], ms = new Set(S.save.met || []), hereMet = here.filter(m => ms.has(m.id)).length;
  return `${heroCard(name, zone, met, hereMet, here.length)}${blessings()}
    <h3>${lg === 'vi' ? 'Hành trình' : 'Journey'}</h3>${rows}
    <h3>${t.equip}</h3><div class="mgrid">${eq.join('')}</div><h3>${t.progress}</h3><div class="mgrid">${fl.join('')}</div>${ballsRow()}
    ${badgeRow()}${statsBlock()}
    ${C.dragon && C.dragon.lookHTML ? C.dragon.lookHTML() : ''}
    <h3>${lg === 'vi' ? 'Đất của tôi' : 'My land'}</h3>${landList()}
    <div id="mtip" class="mtip"><span class="mhint">${t.tipHint}</span></div>`;
}
/* ---------------------------------------------------------------- plan-44 (2026-10-17): huy hiệu · Ngọc Rồng · thống kê · tổng kết · hậu truyện */
const isVi = () => UI.lang() === 'vi';
const achIds = () => Object.keys((UI.L && UI.L.ach) || {});
function injectCSS() {
  if (document.getElementById('p44-menu-css')) return; const s = document.createElement('style'); s.id = 'p44-menu-css';
  s.textContent = `#menu .p44-badges{display:grid;grid-template-columns:repeat(9,1fr);gap:4px;max-width:440px;margin:2px 0 4px}
#menu .p44-badges .bd{display:flex;flex-direction:column;align-items:center;gap:1px;font:13px VT323,monospace;color:var(--dim)}
#menu .p44-badges .bd.on{color:var(--gold)} #menu .p44-badges img{width:100%;max-width:44px;image-rendering:pixelated}
#menu .p44-balls{display:flex;align-items:center;gap:4px;flex-wrap:wrap;margin:6px 0 2px;font:16px VT323,monospace;color:#d8cbe8}
#menu .p44-balls img{width:22px;height:22px;image-rendering:pixelated} #menu .p44-balls img.off{opacity:.22;filter:none}
#menu .p44-stats{display:grid;grid-template-columns:1fr 1fr;column-gap:22px;row-gap:2px;margin:2px 0 6px}
#menu .p44-stats .hst{display:flex;justify-content:space-between;gap:8px;font:16px VT323,monospace;color:#d8cbe8;border-bottom:1px dashed var(--line)} #menu .p44-stats .hst b{font:16px VT323,monospace;color:var(--gold);font-weight:normal}
#menu .p44-coll{display:grid;grid-template-columns:120px 1fr 64px;gap:6px;align-items:center;font:15px VT323,monospace;color:#d8cbe8;padding:2px 0}
#menu .p44-coll .pbar{height:8px} #menu .p44-coll b{color:var(--gold);font-weight:normal;text-align:right}
#menu .p44-next{margin:4px 0 0 0;padding-left:4px;font-size:13px;line-height:1.35} #menu .p44-next div{padding:2px 0}
#menu .p44-save{max-width:340px;margin:10px auto 0} #menu .p44-save .row .btn{flex:1;margin:0} #menu .p44-save textarea{width:100%;min-height:64px;box-sizing:border-box;font:12px monospace;background:#1a1526;color:#e8dcf4;border:2px solid var(--line);resize:vertical}
#menu .p44-save .row{display:flex;gap:6px;flex-wrap:wrap;margin:4px 0} #menu .p44-save .msg{font-size:13px;min-height:16px}
@media (max-width:520px){#menu .p44-stats{grid-template-columns:1fr} #menu .p44-coll{grid-template-columns:84px 1fr 62px}}
#jcert{position:fixed;inset:0;z-index:60;background:rgba(10,8,16,.72);display:flex;align-items:center;justify-content:center;flex-direction:column;gap:8px}
#jcert .card{position:relative;width:min(92vw,672px);aspect-ratio:448/336;background:url(assets/px/ui/journey_cert.png) center/100% 100% no-repeat;image-rendering:pixelated}
#jcert .in{position:absolute;left:14%;right:14%;top:17%;bottom:31%;display:flex;flex-direction:column;align-items:center;color:#4a2e1a;font:clamp(11px,2.6vw,18px) VT323,monospace;text-align:center;line-height:1.15}
#jcert h2{margin:0;font:clamp(16px,4.6vw,30px) VT323,monospace;color:#6a2b12;letter-spacing:1px} #jcert .nm{font-size:clamp(14px,3.6vw,24px);color:#2c1a0e;margin:1px 0 3px}
#jcert .gr{display:grid;grid-template-columns:1fr 1fr;column-gap:14px;width:100%;text-align:left} #jcert .gr span{display:flex;justify-content:space-between;border-bottom:1px dotted rgba(74,46,26,.35)} #jcert .gr b{color:#8a3a12;font-weight:normal}
#jcert .bt{display:flex;gap:8px} #jcert .bt .btn{white-space:nowrap;width:auto;padding:8px 14px}`;
  document.head.appendChild(s);
}
function badgeImg(n, on) { const u = ui(), m = u && u.mbadges; return 'assets/px/' + ((m && m[on ? String(n) : 'off' + n]) || `badges/lv_${n}${on ? '' : '_off'}.png`); }
function badgeRow() {   /* R4: 9 huy hiệu Magnitude (ảnh huy hiệu anh gửi, bản xám = chưa có) */
  const vi = isVi(), got = new Set((deps.S.save.badges || []).filter(b => b >= 1 && b <= 9));
  const cells = Array.from({ length: 9 }, (_, i) => { const n = i + 1, on = got.has(n); return `<div class="bd${on ? ' on' : ''}" data-tip="<b>Magnitude ${n}.0</b> — ${on ? (vi ? 'đã nhận' : 'earned') : (vi ? 'chưa có — gặp đủ nghệ sĩ + xong việc vùng M' + n : 'not yet — meet the artists + finish the M' + n + ' tasks')}"><img src="${badgeImg(n, on)}" alt="" draggable="false">M${n}</div>`; }).join('');
  return `<h3>${vi ? 'Huy hiệu Magnitude' : 'Magnitude badges'} · ${got.size}/9</h3><div class="p44-badges">${cells}</div>`;
}
function ballsRow() {   /* R3: Ngọc Rồng n/7 trong Tiến độ */
  const vi = isVi(), inv = deps.S.save.inv || {}; let n = 0;
  const ic = Array.from({ length: 7 }, (_, i) => { const k = 'dball' + (i + 1), on = (inv[k] || 0) > 0; if (on) n++; return `<img class="${on ? '' : 'off'}" src="assets/px/ui/items/${k}.png" alt="" draggable="false" title="${esc(itemName(k, UI.lang()))}">`; }).join('');
  const hint = n >= 7 ? (vi ? 'đủ 7 — chọn 1 viên trong túi → Gọi Rồng Thần' : 'all 7 — pick one in the bag → Summon') : (vi ? 'rơi từ trùm Khe Nứt (lần đầu chắc chắn) và bạn tập trên đèo' : 'from Rift bosses (first win guaranteed) and pass sparring partners');
  return `<div class="p44-balls" data-tip="${esc((vi ? 'Ngọc Rồng: ' : 'Dragon Balls: ') + hint)}">🐉 ${vi ? 'Ngọc Rồng' : 'Dragon Balls'} <b style="color:var(--gold)">${n}/7</b> ${ic} <span class="mhint">${esc(hint)}</span></div>`;
}
function statsBlock() {   /* P2: thống kê chơi + nút Tổng kết (mở sau khi cứu Lyron) */
  const vi = isVi(), S = deps.S, c = collect(S.save, achIds()), row = (k, v) => `<div class="hst"><span>${k}</span><b>${v}</b></div>`;
  const done = rescued(S.save);
  return `<h3>${vi ? 'Thống kê hành trình' : 'Journey stats'}</h3><div class="p44-stats">
    ${row(vi ? 'Thời gian chơi' : 'Play time', fmtTime(c.sec, vi))}${row(vi ? 'Số lần ngất' : 'Times fainted', c.faints)}
    ${row(vi ? 'Quãng đường' : 'Distance walked', `${c.tiles} ${vi ? 'ô' : 'tiles'}`)}${row(vi ? 'Trùm Khe Nứt đã hạ' : 'Rift bosses beaten', `${c.bosses.n}/${c.bosses.of}${c.bosses.wins > c.bosses.n ? ` <span class="dim">(${c.bosses.wins} ${vi ? 'trận thắng' : 'wins'})</span>` : ''}`)}
    ${row(vi ? 'Nghệ sĩ đã gặp' : 'Artists met', `${c.artists.n}/${c.artists.of}`)}${row(vi ? 'Ảnh đã chụp' : 'Photos taken', c.photos)}
    ${row(vi ? 'Linh thú' : 'Spirit beasts', `${c.linhthu.n}/${c.linhthu.of}`)}${row(vi ? 'Thành tựu' : 'Achievements', `${c.ach.n}/${c.ach.of}`)}</div>
    <div style="margin:2px 0 8px">${done ? `<button class="btn primary" data-journey="1">📜 ${vi ? 'Tổng kết hành trình' : 'Journey summary'}</button>` : `<span class="mhint">📜 ${vi ? 'Tổng kết hành trình: mở sau khi cứu Lyron' : 'Journey summary: unlocks after rescuing Lyron'}</span>`}</div>`;
}
let certEl = null;
function openCert() {
  const vi = isVi(), S = deps.S, c = collect(S.save, achIds()), name = esc(S.save.name || (vi ? 'Bạn' : 'You')), h = S.save.hero || {};
  if (!certEl) { certEl = document.createElement('div'); certEl.id = 'jcert'; document.body.appendChild(certEl);
    certEl.addEventListener('pointerdown', e => { const b = e.target.closest('[data-cert]'); if (!b) { if (e.target === certEl) closeCert(); return; } e.preventDefault(); if (b.dataset.cert === 'close') closeCert(); else certPng(); }); }
  const sp = (k, v) => `<span>${k}<b>${v}</b></span>`;
  certEl.innerHTML = `<div class="card"><div class="in"><h2>${vi ? 'TỔNG KẾT HÀNH TRÌNH' : 'JOURNEY SUMMARY'}</h2><div>Seismic · 9 ${vi ? 'Vùng Đất' : 'Lands'}</div>
    <div class="nm">${name} · ${vi ? 'Cấp' : 'Lv'} ${h.lv || 1}</div><div class="gr">
    ${sp(vi ? 'Thời gian' : 'Play time', fmtTime(c.sec, vi))}${sp(vi ? 'Ngất' : 'Fainted', c.faints)}
    ${sp(vi ? 'Nghệ sĩ' : 'Artists', `${c.artists.n}/${c.artists.of}`)}${sp('Leader', `${c.leaders.n}/${c.leaders.of}`)}
    ${sp(vi ? 'Huy hiệu' : 'Badges', `${c.badges.n}/9`)}${sp(vi ? 'Trùm' : 'Bosses', `${c.bosses.n}/${c.bosses.of}`)}
    ${sp(vi ? 'Linh thú' : 'Spirit beasts', `${c.linhthu.n}/${c.linhthu.of}`)}${sp(vi ? 'Ngọc Rồng' : 'Dragon Balls', `${c.balls.n}/7`)}
    ${sp(vi ? 'Ảnh chụp' : 'Photos', c.photos)}${sp(vi ? 'Quãng đường' : 'Distance', `${c.tiles} ${vi ? 'ô' : 'tiles'}`)}</div>
    <div style="margin-top:16px">${vi ? 'Lyron đã về nhà. Cảm ơn bạn!' : 'Lyron is home. Thank you!'}</div></div></div>
    <div class="bt"><button class="btn primary" data-cert="png">💾 ${vi ? 'Tải ảnh' : 'Save image'}</button><button class="btn" data-cert="close">${vi ? 'Đóng' : 'Close'}</button></div>`;
  certEl.hidden = false;
}
function closeCert() { if (certEl) certEl.hidden = true; }
function certPng() {   /* vẽ khung giấy khen PixelLab (×2, giữ pixel) + chữ ra PNG để khoe */
  const im = new Image(); im.onload = () => {
    const k = 2, W = im.width * k, H = im.height * k, cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(im, 0, 0, W, H);
    const inn = certEl.querySelector('.in'), lines = [...inn.querySelectorAll('h2, div:not(.gr), .gr span')].filter(e => !e.querySelector('h2'));
    g.textAlign = 'center'; g.fillStyle = '#4a2e1a'; let y = H * 0.21; const cx = W / 2;
    const txt = (s, sz, col) => { g.font = `${sz}px VT323, monospace`; g.fillStyle = col; g.fillText(s, cx, y); y += sz * 1.15; };
    txt(inn.querySelector('h2').textContent, 46, '#6a2b12'); txt('Seismic · 9 ' + (isVi() ? 'Vùng Đất' : 'Lands'), 26, '#4a2e1a'); txt(inn.querySelector('.nm').textContent, 34, '#2c1a0e');
    const sp = [...inn.querySelectorAll('.gr span')]; g.font = '25px VT323, monospace';
    sp.forEach((s, i) => { const col = i % 2, row = i >> 1, x0 = W * (col ? 0.52 : 0.15), x1 = W * (col ? 0.85 : 0.48), yy = y + 6 + row * 29; g.textAlign = 'left'; g.fillStyle = '#4a2e1a'; g.fillText(s.firstChild.textContent, x0, yy); g.textAlign = 'right'; g.fillStyle = '#8a3a12'; g.fillText(s.querySelector('b').textContent, x1, yy); });
    g.textAlign = 'center'; g.font = '26px VT323, monospace'; g.fillStyle = '#4a2e1a'; g.fillText(isVi() ? 'Lyron đã về nhà. Cảm ơn bạn!' : 'Lyron is home. Thank you!', cx, y + 6 + Math.ceil(sp.length / 2) * 29 + 22);   /* ngay dưới bảng số, trên vòng nguyệt quế */
    const a = document.createElement('a'); a.download = `seismic9-hanh-trinh-${(deps.S.save.name || 'ban').replace(/[\/:*?"<>|\s]+/g, '_')}.png`; a.href = cv.toDataURL('image/png'); document.body.appendChild(a); a.click(); a.remove();
  }; im.src = 'assets/px/ui/journey_cert.png';
}
/* ---- Q6: xuất / nhập mã lưu (thẻ Cài đặt) ---- */
let pendingImport = null;
function saveMsg(t, ok) { const m = el.querySelector('#m-savemsg'); if (m) { m.textContent = t; m.style.color = ok === false ? '#ff9a8a' : ok ? '#9be07a' : 'var(--dim)'; } }
async function saveAct(k) {
  const vi = isVi(), C = deps.CTX;
  if (k === 'export' || k === 'file') {
    try { C.persist(); } catch (e) { /* */ }
    const code = await exportCode(deps.S.save), ta = el.querySelector('#m-exp'); if (ta) { ta.value = code; ta.hidden = false; }
    if (k === 'file') { const a = document.createElement('a'), d = new Date(), ds = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`; a.download = `seismic9-save-${(deps.S.save.name || 'ban').replace(/[\/:*?"<>|\s]+/g, '_')}-${ds}.txt`; a.href = URL.createObjectURL(new Blob([code], { type: 'text/plain' })); document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); saveMsg(vi ? 'Đã tải file mã lưu — mở game trên máy kia → Cài đặt → Nhập mã lưu.' : 'Save file downloaded — on the other device: Settings → Import save.', true); return; }
    let copied = false; try { if (navigator.clipboard && navigator.clipboard.writeText) { await navigator.clipboard.writeText(code); copied = true; } } catch (e) { /* trình duyệt chặn */ }
    if (!copied && ta) { ta.focus(); ta.select(); }
    saveMsg(copied ? (vi ? `Đã chép mã lưu (${code.length} ký tự) — dán vào ô Nhập ở máy kia.` : `Save code copied (${code.length} chars) — paste it into Import on the other device.`) : (vi ? 'Mã lưu ở ô bên dưới — chọn hết rồi chép.' : 'The code is in the box below — select all and copy.'), true);
  } else if (k === 'check') await checkImport();
  else if (k === 'yes') {
    if (!pendingImport) return;
    if (!importSave(pendingImport)) { saveMsg(vi ? 'Không ghi được (bộ nhớ trình duyệt bị chặn?).' : "Couldn't write (browser storage blocked?).", false); return; }
    saveMsg(vi ? 'Đã nhập — đang tải lại…' : 'Imported — reloading…', true);
    const q = new URLSearchParams(location.search); q.delete('reset'); q.delete('zone'); q.delete('auto'); const qs = q.toString();
    setTimeout(() => { location.href = location.pathname + (qs ? '?' + qs : ''); }, 400);
  } else if (k === 'no') { pendingImport = null; const c = el.querySelector('#m-impask'); if (c) c.hidden = true; saveMsg(vi ? 'Đã huỷ — save hiện tại giữ nguyên.' : 'Cancelled — your current save is untouched.'); }
}
async function checkImport() {
  const vi = isVi(), ta = el.querySelector('#m-imp'), ask = el.querySelector('#m-impask'); pendingImport = null; if (ask) ask.hidden = true;
  const r = await parseCode(ta ? ta.value : '');
  if (!r.ok) { const W = { empty: vi ? 'Chưa dán mã nào.' : 'Nothing pasted yet.', format: vi ? 'Không phải mã lưu Seismic (phải bắt đầu bằng S9Z1: hoặc S9J1:).' : 'Not a Seismic save code (must start with S9Z1: or S9J1:).', nogzip: vi ? 'Trình duyệt này không giải nén được mã — xuất lại trên máy kia bằng trình duyệt mới hơn.' : "This browser can't unpack the code.", broken: vi ? 'Mã bị hỏng / thiếu đoạn — chép lại đủ cả mã.' : 'The code is broken or cut off — copy it again in full.' }; saveMsg(W[r.why] || (vi ? `Mã lưu không hợp lệ (${r.why}).` : `Invalid save (${r.why}).`), false); return; }
  pendingImport = r.save; const s = r.save, z = ZONE_LIST.find(q => q.id === s.zone), zn = z ? (z.name[UI.lang()] || z.name.en) : s.zone;
  if (ask) { ask.hidden = false; ask.querySelector('.sum').innerHTML = esc(vi ? `Save: ${s.name || '(chưa đặt tên)'} · cấp ${(s.hero || {}).lv || 1} · ${zn} · ${(s.badges || []).length} huy hiệu · ${(s.met || []).length} nghệ sĩ đã gặp` : `Save: ${s.name || '(no name)'} · Lv ${(s.hero || {}).lv || 1} · ${zn} · ${(s.badges || []).length} badges · ${(s.met || []).length} artists met`); }
  saveMsg(vi ? 'Mã hợp lệ. Ghi đè save hiện tại? (không hoàn tác được — nên Xuất save hiện tại trước)' : 'Valid code. Overwrite the current save? (cannot be undone — export the current one first)', true);
}
function saveBox() {
  const vi = isVi();
  return `<div class="p44-save"><h3>${vi ? 'Mang save sang máy khác' : 'Move your save to another device'}</h3>
    <div class="row"><button class="btn primary" data-save="export">📤 ${vi ? 'Xuất mã lưu (chép)' : 'Export save (copy)'}</button><button class="btn" data-save="file">💾 ${vi ? 'Tải file mã lưu' : 'Download save file'}</button></div>
    <textarea id="m-exp" readonly hidden></textarea>
    <div class="mhint">${vi ? 'Nhập mã lưu: dán mã hoặc chọn file rồi bấm Kiểm tra.' : 'Import: paste the code or pick the file, then Check.'}</div>
    <textarea id="m-imp" placeholder="S9Z1:…"></textarea>
    <div class="row"><button class="btn" data-save="check">✔ ${vi ? 'Kiểm tra mã' : 'Check code'}</button><label class="btn" style="cursor:pointer">📂 ${vi ? 'Chọn file' : 'Pick file'}<input type="file" accept=".txt,.json,text/plain,application/json" data-importfile="1" hidden></label></div>
    <div id="m-impask" hidden><div class="sum mhint" style="color:#ffe6a8"></div><div class="row"><button class="btn primary" data-save="yes">⚠ ${vi ? 'Ghi đè & tải lại' : 'Overwrite & reload'}</button><button class="btn" data-save="no">${vi ? 'Huỷ' : 'Cancel'}</button></div></div>
    <div class="msg mhint" id="m-savemsg"></div></div>`;
}
function afterStory() {   /* P1: HẬU TRUYỆN — % từng bộ sưu tập + việc kế tiếp (chỉ hiện sau khi cứu Lyron) */
  const vi = isVi(), S = deps.S; if (!rescued(S.save)) return '';
  const c = collect(S.save, achIds());
  const bar = (k, o, extra = '') => { const pc = o.of ? Math.round(o.n / o.of * 100) : 0; return `<div class="p44-coll"><span>${k}</span><div class="pbar"><div style="width:${pc}%"></div></div><b>${o.n}/${o.of}${extra}</b></div>`; };
  const steps = nextSteps(S.save, c, vi, 4).map(s => `<div>▸ ${esc(s)}</div>`).join('');
  const all = [c.artists, c.linhthu, c.balls, c.badges, c.ach, c.leaders, c.bosses].reduce((a, o) => a + (o.of ? o.n / o.of : 0), 0) / 7;
  return `<h3>${vi ? 'Hậu truyện' : 'Afterwards'} · ${Math.round(all * 100)}%</h3><p class="mhint" style="margin:0 0 4px">${vi ? 'Lyron đã về nhà — nhưng thế giới còn nhiều thứ để gom:' : 'Lyron is home — but there is plenty left to collect:'}</p>
    ${bar(vi ? 'Nghệ sĩ' : 'Artists', c.artists)}${bar(vi ? 'Linh thú' : 'Spirit beasts', c.linhthu)}${bar(vi ? 'Ngọc Rồng' : 'Dragon Balls', c.balls)}${bar(vi ? 'Huy hiệu' : 'Badges', c.badges)}
    ${bar(vi ? 'Thành tựu' : 'Achievements', c.ach)}${bar('Leader', c.leaders)}${bar(vi ? 'Trùm đã hạ' : 'Bosses beaten', c.bosses, c.bosses.wins > c.bosses.n ? ` · ${c.bosses.wins}×` : '')}
    <div class="mhint" style="margin-top:6px"><b style="color:var(--gold)">${vi ? 'Việc kế tiếp' : 'What next'}</b></div><div class="p44-next mhint">${steps}</div>
    <div style="margin-top:6px"><button class="btn" data-journey="1">📜 ${vi ? 'Tổng kết hành trình' : 'Journey summary'}</button></div>`;
}
/* 2026-10-12 anh: thẻ Nhân vật mở đầu bằng chỉ số chiến đấu thật (cấp, kinh nghiệm, máu, sức đánh, kiếm) — điều ước 'Sức mạnh tối đa' phải thấy ngay ở đây */
function heroCard(name, zone, met, hereMet, hereN) {
  const vi = UI.lang() === 'vi', C = deps.CTX, h = C.hero, S = deps.S, t = L();
  const sh = S.save.hero || { lv: 1, xp: 0 }, lv = h ? h.lv : sh.lv || 1, max = h ? h.max : 100, hp = Math.max(0, Math.ceil(h ? h.hp : max)), mx = lv >= HMAX_LV;
  const need = hNeedXp(lv), xp = sh.xp || 0, tier = C.tool.tier('sword'), bonus = h ? h.weaponBonus(tier) : 0, atk = h ? h.atk : 10;
  const row = (k, v) => `<div class="hst"><span>${k}</span><b>${v}</b></div>`;
  return `<div class="mhero hcard"><canvas class="mav" id="mav" width="64" height="80"></canvas>
    <div class="hcol"><div><b style="font-size:20px">${name}</b> <span class="lvb" style="background:var(--gold)">${vi ? 'Cấp' : 'Lv'} ${lv}${mx ? ' MAX' : ''}</span></div>
      <div class="mhint">${zone}</div>
      <div class="hbar"><span>${vi ? 'Máu' : 'HP'}</span><div class="pbar hp"><div style="width:${Math.round(hp / max * 100)}%"></div></div><b>${hp}/${max}</b></div>
      <div class="hbar"><span>XP</span><div class="pbar"><div style="width:${mx ? 100 : Math.round(xp / need * 100)}%"></div></div><b>${mx ? (vi ? 'Tối đa' : 'Max') : `${xp}/${need}`}</b></div>
      ${row(vi ? 'Sức đánh' : 'Attack', tier ? `${atk + bonus} <span class="dim">(${atk} + ${vi ? 'kiếm' : 'sword'} ${bonus})</span>` : atk)}
      ${row(vi ? 'Kiếm' : 'Sword', tier ? `${vi ? 'Cấp' : 'Tier'} ${tier}/6` : (vi ? 'Chưa có' : 'None'))}
      ${row(`◆ ${esc(t.shards)}`, S.save.shards || 0)}${row(esc(t.met), `${hereMet}/${hereN} <span class="dim">(${vi ? 'tổng' : 'total'} ${met})</span>`)}</div></div>`;
}
function blessings() {   /* điều ước Rồng Thần đã nhận (icon PixelLab của thẻ điều ước) */
  const vi = UI.lang() === 'vi', d = ((deps.S.save.sys || {}).dragon) || {}, got = d.got || {};
  const W = [['power', 'Sức mạnh tối đa', 'Maximum power', `Cấp ${HMAX_LV} · Kiếm Seismic`, `Level ${HMAX_LV} · Seismic Sword`],
    ['skill', 'Rồng Thần Giáng', 'Divine Dragon Dive', 'Chiêu · phím G', 'Skill · key G'],
    ['rocky', 'Rocky mạnh nhất', 'Strongest Rocky', 'Rocky cấp 50 · chiêu bậc 7', 'Rocky Lv 50 · tier-7 skills'],
    ['chad', 'Đẹp trai nhất', 'Most handsome', 'Ngoại hình Chad', 'Chad look']];
  const on = W.filter(w => got[w[0]]); if (d.treasure) on.push(['treasure', 'Kho báu', 'Treasure', `Đã nhận ${d.treasure} lần`, `Received ×${d.treasure}`]);
  if (!on.length) return '';
  return `<h3>${vi ? 'Phúc lành Rồng Thần' : 'Dragon blessings'}</h3><div class="hbless">${on.map(w => `<div class="hb1"><img src="assets/px/dragon/ui/icon_${w[0]}.png" alt="" draggable="false"><span><b>${esc(vi ? w[1] : w[2])}</b><i>${esc(vi ? w[3] : w[4])}</i></span></div>`).join('')}</div>`;
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
      : id === 'ha' ? (vi ? 'Gồng 0,8 s, bắn luồng sáng thẳng vào mục tiêu, trúng mọi quái trên đường và bắn sập vật chắn (cây, đá, nhà…). Bậc càng cao tầm càng xa (64 → 160 px), phá xuyên càng nhiều vật (1 → 6), hất quái càng mạnh' : 'Charge 0.8 s, fire a straight beam at the target, hitting every monster in line and blasting through obstacles (trees, rocks, buildings…). Higher tiers reach farther (64 → 160 px), smash through more objects (1 → 6) and knock monsters farther')
      : (vi ? `Biến hình ${RLV.superOf(Math.max(1, t)).dur} giây, hồi ${RLV.superOf(Math.max(1, t)).cd} giây` : `Transform for ${RLV.superOf(Math.max(1, t)).dur}s, cooldown ${RLV.superOf(Math.max(1, t)).cd}s`);
    const tip = `<b>${esc(vi ? S2.vi : S2.en)}</b> — ${on ? `${vi ? 'bậc' : 'tier'} ${t}/${RLV.TIER_MAX}` : `${vi ? 'mở ở cấp' : 'unlocks at Lv'} ${S2.unlock}`} · ${esc(desc)}`;
    return `<div class="rk-sk" data-tip="${esc(tip)}" style="display:flex;flex-direction:column;align-items:center;gap:2px;min-width:86px">
      <div class="slot ${on ? '' : 'off'}" data-tip="${esc(tip)}" style="width:44px;height:44px">${ic ? img(ic) : `<span class="emo">${S2.icon}</span>`}${on ? `<b class="n">${t}/${RLV.TIER_MAX}</b>` : `<span class="lock">${stIcon('lock', '🔒')}</span>`}</div>
      <span style="font:16px VT323,monospace;color:${on ? 'var(--gold)' : 'var(--dim)'}">${esc(vi ? S2.vi : S2.en)}</span><span class="mhint" style="font-size:13px">${on ? `${vi ? 'Bậc' : 'Tier'} ${t}/${RLV.TIER_MAX}` : `${vi ? 'Cấp' : 'Lv'} ${S2.unlock}`}</span></div>`;
  }).join('');
  const hpN = Math.round(ko ? pt.hp || 0 : pt.hp ?? st.max), mx = lv.lv >= RLV.LV_CAP, rk = (((deps.S.save.sys || {}).dragon || {}).got || {}).rocky;
  const hst = (k, v) => `<div class="hst"><span>${k}</span><b>${v}</b></div>`;   /* 2026-10-12 anh: thẻ Rocky cùng kiểu thẻ Nhân vật; ảnh = hình Rocky đúng cỡ hiện tại (lớn / Siêu Cấp) */
  return `<div class="mhero hcard">${RLV.sizeStage(lv.lv) > 0 || sup ? '<canvas class="mav" id="mrk" width="120" height="104" style="width:120px;height:104px"></canvas>' : port ? `<img class="mav" src="assets/px/${port}" alt="" style="width:92px;height:92px;image-rendering:pixelated">` : ''}
    <div class="hcol"><div><b style="font-size:20px">${esc(pt.name)}</b> <span class="lvb" style="background:var(--gold)">${vi ? 'Cấp' : 'Lv'} ${lv.lv}${mx ? ' MAX' : ''}</span>${sup ? ` <span class="lvb" style="background:#ffd45e">⚡ ${vi ? 'Siêu Cấp' : 'Super'}</span>` : ''}</div>
      <div class="hbar"><span>${vi ? 'Máu' : 'HP'}</span><div class="pbar hp"><div style="width:${Math.round(hpN / st.max * 100)}%"></div></div><b>${hpN}/${st.max}</b></div>
      <div class="hbar"><span>XP</span><div class="pbar"><div style="width:${pct}%"></div></div><b>${lv.need ? `${lv.into}/${lv.need}` : (vi ? 'Tối đa' : 'Max')}</b></div>
      <div class="hgrid">${hst(vi ? 'Công' : 'Attack', st.atk)}${hst(vi ? 'Thủ' : 'Defense', st.def)}${hst(vi ? 'Độ no' : 'Fullness', Math.round(pt.hunger) + '%')}${hst(vi ? 'Độ thân' : 'Bond', `${vi ? bondN[bl] : bondE[bl]} <span class="dim">(${Math.round(pt.bond)})</span>`)}</div>
      ${hst(vi ? 'Lệnh' : 'Command', esc(cmdTxt))}</div></div>
    ${rk ? `<h3>${vi ? 'Phúc lành Rồng Thần' : 'Dragon blessings'}</h3><div class="hbless"><div class="hb1"><img src="assets/px/dragon/ui/icon_rocky.png" alt="" draggable="false"><span><b>${vi ? 'Rocky mạnh nhất' : 'Strongest Rocky'}</b><i>${vi ? 'Cấp 50 · 3 chiêu bậc 7' : 'Lv 50 · all skills tier 7'}</i></span></div></div>` : ''}
    <h3>${vi ? 'Chiêu' : 'Skills'}</h3><div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:space-around">${skills}</div>${C.rkCore ? C.rkCore.html() : ''}${C.hopthe ? C.hopthe.menuHtml() : ''}${(deps.S.save.inv.rkbook8 || 0) > 0 ? `<div style="text-align:center;margin-top:6px"><button class="btn primary" data-hrbook="1">📕 ${vi ? 'Dùng sách Rocky bậc 8' : 'Use Rocky tier-8 book'} (${deps.S.save.inv.rkbook8})</button></div>` : ''}
    <p class="mhint" style="margin-top:8px">${vi ? 'Ra lệnh: bấm nút Rocky trên thanh công cụ hoặc phím / (điện thoại: nút chat cạnh nút chụp ảnh) rồi bấm lệnh hoặc gõ <b>bảo vệ</b> · <b>tấn công</b> · <b>đi theo</b> · <b>về nhà</b>. Khi được đánh, Rocky luôn dùng chiêu mạnh nhất đã hồi: Siêu Cấp → Rocky-ha → Đấm. Sách luyện chiêu: Heathcliff ở chân cầu tàu Biển.' : 'Commands: click the Rocky button on the hotbar or press / (phone: the chat button next to the camera), then tap a command or type <b>protect</b> · <b>attack</b> · <b>follow</b> · <b>home</b>. When allowed to fight, Rocky always uses its strongest ready skill: Super → Rocky-ha → Punch. Skill books: Heathcliff at the foot of the Sea pier.'}</p>
    <div id="mtip" class="mtip"><span class="mhint">${L().tipHint}</span></div>`;
}
function landList() {   /* plan-25: mảnh đất đã mua (vùng · quốc gia · cỡ) */
  const vi = UI.lang() === 'vi', all = (deps.S.save.lands) || {}, rows = [];
  for (const [z, arr] of Object.entries(all)) for (const l of arr) { const zone = ZONE_LIST.find(q => q.id === z), zn = zone ? (zone.name[UI.lang()] || zone.name.en) : z; rows.push(`<div class="mhint">${esc(zn)} · ${esc(l.nation)} · ${l.w}×${l.h}</div>`); }
  return rows.length ? rows.join('') : `<p class="dim" style="padding:4px 2px">${vi ? 'Chưa có mảnh đất nào — gặp Leader các quốc gia để mua.' : 'No land yet — meet the leaders of each nation to buy some.'}</p>`;
}
function drawRocky() {   /* ảnh Rocky lớn / Siêu Cấp từ gói village (khung đứng hướng nam), 4 px màn / 1 px logic = 2 px màn / 1 px ảnh */
  const c = el.querySelector('#mrk'), R = deps.CTX.rocky, pt = R && R.pet(); if (!c || !pt) return;
  const cr = ART.packs && ART.packs.village && ART.packs.village.creatures, pre = (pt.superT || 0) > 0 && cr && cr.rockysup_ds ? 'rockysup' : 'rockybig', set = cr && (cr[pre + '_ds'] || cr[pre]); if (!set) return;
  const im = set[0][0], w = pre === 'rockysup' ? 29 : 18, h = pre === 'rockysup' ? 26 : 16, g = c.getContext('2d');
  g.imageSmoothingEnabled = false; g.clearRect(0, 0, c.width, c.height);
  const k = pre === 'rockysup' ? 4 : 6;   /* bội số nguyên: Siêu Cấp 2 px màn/px ảnh, cỡ lớn 3 px màn/px ảnh — vừa khung 120×104 */
  try { g.drawImage(im, Math.round((c.width - w * k) / 2), c.height - h * k, w * k, h * k); } catch (e) { /* ảnh chưa sẵn */ }
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
  const HINT3 = lg === 'vi' ? { divebell: 'Rèn ở Lò nung M4 (4 kính + 3 sắt)', trenchmap: 'Xin Thủ thư ở bàn thi M6 (sau khi qua bài thi thư viện)', greatcrystal: 'Leader ở Lõi M9 trao (sau khi có huy hiệu M9)' }
    : { divebell: 'Forge it at the M4 furnace (4 glass + 3 iron)', trenchmap: 'Ask the librarian at the M6 exam desk (after passing the exam)', greatcrystal: 'A Leader in the M9 Core hands it over (after the M9 badge)' };   /* plan-44 D5: lấy từ systems/story_land.js */
  const gatherText = act === 2 ? items3.map(k => { const ok = (st.items || {})[k]; return `<div>${ITEMS[k] ? ITEMS[k].icon : k} <b>${esc(itemName(k, lg))}</b> ${ok ? '✓' : `· <span class="dim">${esc(HINT3[k])}</span>`}</div>`; }).join('') : act < 2 ? t.qGatherLocked : t.qGatherText;
  rows.push({ name: t.qGather, state: act >= 3 ? 'done' : act === 2 ? 'now' : 'locked', text: gatherText });
  rows.push({ name: t.qTrench, state: act >= 4 ? 'done' : act === 3 ? 'now' : 'locked', text: act >= 4 ? t.qHome : t.qTrenchText });
  return rows;
}
function qRow(r) {
  const ic = r.state === 'done' ? stIcon('check', '✓') : r.state === 'now' ? stIcon('play', '▶') : stIcon('quest', '?');
  return `<div class="mq ${r.state}"><span class="qs">${ic}</span><span style="flex:1;min-width:0">${r.av || ''}<b>${esc(r.name)}</b>${r.right ? `<span class="chip" style="float:right">${r.right}</span>` : ''}<div class="mhint">${r.text}</div></span></div>`;
}
function anlinhBody() {   /* 2026-10-15: thẻ ẤN LINH — nội dung do linhthu.js dựng (quả cầu + cấp + nâng cấp · đội hình · bộ sưu tập · mô tả) */
  const C = deps.CTX; return C.linhthu && C.linhthu.panel ? C.linhthu.panel() : `<p class="dim">${UI.lang() === 'vi' ? 'Chưa có Ấn Linh.' : 'No Spirit Seal yet.'}</p>`;
}
function questBody() {
  const t = L(), C = deps.CTX; let side = [];
  try { side = questRows(C); } catch (e) { side = []; }
  const main = mainQuests().map(qRow).join('');
  const sd = side.map(q => qRow({ name: q.name, state: q.done ? 'done' : 'now', text: `${esc(q.text)}${q.here ? '' : ` · <span class="dim">${esc(q.zone)}</span>`}`, right: `${q.have}/${q.need} · 🪨 ${q.reward}` })).join('');
  return `${afterStory()}<h3>${t.main}</h3>${main}<h3>${t.side}</h3>${sd || `<p class="dim" style="padding:6px 2px">${t.none}</p>`}`;
}

// ---------------------------------------------------------------- cài đặt
/* c26-coban (anh 04/11 "bỏ được phần nào bỏ, vì từ giờ save game bằng tài khoản"): bỏ khối 'Chuyển save sang máy khác' (saveBox) khỏi Cài đặt;
   thay bằng 1 dòng trạng thái tài khoản (cloud82): đã đăng nhập → tên; chưa → nút 'Đăng nhập để lưu game' (lưu & về màn hình chính, nơi có nút đăng nhập). Cloud tắt (preset/test) → không hiện. */
function acct26() {
  const vi = isVi(); let c = null, u = null;
  try { c = typeof window !== 'undefined' && window.__cloud82 && window.__cloud82.cloud; if (!c || !c.status || c.mode === 'off') return ''; u = c.status().user; } catch (e) { return ''; }
  let dn = ''; try { const c8 = window.__cloud82; dn = c8 && c8.displayName ? c8.displayName() : ''; } catch (e) { dn = ''; }   /* c30-tk: hiện TÊN HIỂN THỊ (đổi được), tên đăng nhập ghi riêng */
  const nm = u ? (dn || u.name || u.username || u.email || (vi ? 'Người chơi' : 'Player')) : '';
  return `<div class="c26-acct" style="display:contents">`
    + (u ? `<span style="text-align:center;font:18px VT323,monospace;color:#cfc4b4;margin-top:4px">☁ ${vi ? 'Đã đăng nhập' : 'Signed in'}: <b style="color:#ffd96a">${esc(nm)}</b> · ${vi ? 'tự lưu theo tài khoản' : 'auto-saves to account'}</span>${u.username && u.username !== nm ? `<span style="display:block;text-align:center;font:16px VT323,monospace;color:#9d917f">(${vi ? 'tên đăng nhập' : 'username'}: ${esc(u.username)})</span>` : ''}<button class="btn" data-rn30="1">✎ ${vi ? 'Đổi tên' : 'Rename'}</button>`
      : `<span style="text-align:center;font:18px VT323,monospace;color:#cfc4b4;margin-top:4px">☁ ${vi ? 'Chưa đăng nhập' : 'Not signed in'}</span><button class="btn" data-act="quit">${vi ? 'Đăng nhập để lưu game' : 'Sign in to save your game'}</button>`) + `</div>`;
}
function gearBody() {   /* c26-coban: bỏ thanh Nhạc nền + nút ♪ Nhạc (anh 04/11 bỏ nhạc), giữ thanh Hiệu ứng; bỏ khối chuyển save */
  const t = L(), A = deps.actions || {}, on = A.musicOn ? A.musicOn() : true;
  const vol = (k, label, v) => `<label class="mvol"><span>${label}</span><input type="range" min="0" max="100" value="${Math.round(v * 100)}" data-vol="${k}"><b>${Math.round(v * 100)}%</b></label>`;
  const mv = AUDIO.getMusicVolume ? AUDIO.getMusicVolume() : 0.5, sv = AUDIO.getSfxVolume ? AUDIO.getSfxVolume() : 0.5;
  return `<div class="mgear"><button class="btn primary" data-act="resume">${t.resume}</button><button class="btn" data-act="lang">${t.lang}</button>
    ${vol('sfx', t.sfxVol, sv)}${deps.CTX.size19 ? deps.CTX.size19.html(deps.CTX.lang() === 'vi') : ''}
    <button class="btn" data-diff="1" title="${deps.CTX.lang() === 'vi' ? 'Dễ: máu & đòn của quái, bạn tập, trùm ×0,6 — phần thưởng giữ nguyên' : 'Easy: monsters, sparring partners and bosses have ×0.6 HP & damage — same rewards'}">⚖ ${diffLabel(deps.CTX.lang() === 'vi', deps.S.save)}</button>${deps.CTX.ki ? `<button class="btn" data-kimode="1">◉ ${deps.CTX.ki.menuLabel()}</button>` : ''}${deps.CTX.gfx ? `<button class="btn" data-gfx="1">▣ ${deps.CTX.gfx.label(deps.CTX.lang() === 'vi')}</button>` : ''}<button class="btn" data-act="fs">⛶ ${t.fs}</button><button class="btn" data-act="quit">${t.quit}</button>${acct26()}</div>`;
}
