// showcase19.js — bảng test plan-19 (luật asset PixelLab): ?auto&zone=village&showcase=p19
// Mỗi nút dựng sẵn cảnh rồi chạy 1 tính năng mới để anh xem. Chế độ này KHÔNG ghi save thật (saveOff). Phím F9 ẩn/hiện bảng.
import { saveOff } from './save.js';
import { toggleMenu } from './menu.js';
import { addCarry } from './systems/animals.js';

let deps = null, el = null;
const wait = ms => new Promise(r => setTimeout(r, ms));
const say = t => { const b = el && el.querySelector('#s19-log'); if (b) b.textContent = t; };
const P = () => deps.S.player, C = () => deps.CTX, S = () => deps.S;
const sys = id => S().sys.find(s => s.id === id);
function press(id) { const s = sys(id); if (!s || !s.near) return null; const c = s.near(C()); if (c) s.interact(C(), c); return c ? c.label : null; }
function warpPx(x, y, dir = 0) { const p = P(); p.x = x; p.y = y; p.dir = dir; p.action = null; }
function nearest(pred) { const p = P(); return S().map.objects.filter(pred).sort((a, b) => Math.hypot(a.x * 16 - p.x, a.y * 16 - p.y) - Math.hypot(b.x * 16 - p.x, b.y * 16 - p.y))[0] || null; }
async function goZone(id) { if (S().zone && S().zone.id === id) return; deps.enterZone(id, 'default'); await wait(1200); }
function key(code, down) { window.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', { code, key: code })); }

/* ô cỏ/đất trống ngay dưới người chơi (để mặt quay xuống — clip hướng nam rõ nhất) */
function freeTileBelow() {
  /* cày chỉ được trong khu của mình (luật game) → về khu mình rồi tìm ô trống có ô phía trên để đứng */
  const my = C().myPlot && C().myPlot(); if (my) { const sp = my.spawn || my; warpPx((sp.x + 1) * 16 + 8, (sp.y + 1) * 16 + 8, 0); }
  const p = P(), m = S().map, T = C().T, ok = g => [T.GRASS, T.GRASS2, T.DIRT, T.FLOWER, T.SAND].includes(g);
  const inMine = (tx, ty) => !my || (tx >= my.x && tx < my.x + my.w && ty >= my.y && ty < my.y + my.h);
  const tx0 = Math.floor(p.x / 16), ty0 = Math.floor(p.y / 16);
  for (let r = 0; r < 12; r++) for (let dx = -r; dx <= r; dx++) {
    const tx = tx0 + dx, ty = ty0 + r;
    if (inMine(tx, ty) && ok(C().getG(m, tx, ty)) && !C().isSolid(m, tx, ty) && !C().isSolid(m, tx, ty - 1) && !C().hasObjectAt(m, tx, ty) && !C().hasObjectAt(m, tx, ty - 1)) return { tx, ty };
  }
  return null;
}
let farmTile = null;
function standAbove(t) { warpPx(t.tx * 16 + 8, t.ty * 16 - 4, 0); }

const STEPS = {
  async idle() { await goZone('village'); P().action = null; P().moving = false; P().dir = 0; say('Đứng yên vài giây: nhân vật thở (đầu nhấp 1 px, ~1 giây/nhịp). Bản cũ đứng đơ một khung.'); },
  async hoe() {
    await goZone('village'); window.__farm.tools(); farmTile = freeTileBelow(); if (!farmTile) { say('Không thấy ô trống quanh đây — đi ra bãi cỏ rồi bấm lại.'); return; }
    standAbove(farmTile); C().hold('shovel'); await wait(250); const before = new Set(Object.keys(window.__farm.state().zone.tiles)); const ok = /Cày|Till/.test(press('farm') || '');
    const nk = Object.keys(window.__farm.state().zone.tiles).find(k => !before.has(k)); if (nk) { const [tx, ty] = nk.split(',').map(Number); farmTile = { tx, ty }; }   /* ô thật vừa cày (game ưu tiên ô dưới chân) */
    say(ok ? 'Cuốc đất: clip cuốc PixelLab, bụi đất bật đúng khung lưỡi cuốc chạm đất (khung 3).' : 'Ô này không cày được — bấm lại.');
  },
  async sow() {
    if (!farmTile) await STEPS.hoe(); await wait(500); window.__farm.give('turnip', 3); C().hotbarSync(); C().hold('seed_turnip'); standAbove(farmTile); await wait(250);
    const ok = /Gieo|Sow/.test(press('farm') || ''); say(ok ? 'Gieo hạt: ô đất hiện ụ đất có 3 hạt (giai đoạn "hạt" mới, trước mầm).' : 'Chưa gieo được (ô chưa cày?) — bấm "Cuốc" trước.');
  },
  async water() {
    if (!farmTile) { await STEPS.hoe(); await wait(500); await STEPS.sow(); await wait(300); }
    standAbove(farmTile); window.__farm.act('fill'); C().hold('bucket'); await wait(250); const ok = /Tưới|Water/.test(press('farm') || '');
    say(ok ? 'Tưới: clip cầm bình tưới, nước bắn ra ở khung 2.' : 'Ô đã tưới hôm nay — bấm "Thu hoạch" (tự qua ngày) hoặc cuốc ô khác.');
  },
  async harvest() {
    if (!farmTile) { await STEPS.hoe(); await wait(500); await STEPS.sow(); }
    standAbove(farmTile); for (let i = 0; i < 8; i++) { window.__farm.act('fill'); window.__farm.act('water', farmTile.tx, farmTile.ty); window.__farm.tick(); }
    await wait(700); standAbove(farmTile); await wait(250); const ok = /Thu hoạch|Harvest/.test(press('farm') || '');   /* tay không */
    say(ok ? 'Thu hoạch: clip nhổ cây, sao vàng lấp lánh (khung 4) + hiệu ứng nhặt đồ trên đầu.' : 'Cây chưa chín — bấm lại lần nữa.');
    if (ok) farmTile = null;
  },
  async chop() {
    await goZone('village'); const o = nearest(o => o.type === 'tree'); if (!o) { say('Không thấy cây.'); return; }
    C().hold('axe'); warpPx(o.x * 16 + 8, (o.y + 2) * 16 + 2, 3); await wait(250); const l = press('trees');
    say(l ? 'Chặt cây: dăm gỗ văng đúng khung rìu chạm (khung 3) + vài lá rơi. Bấm E thêm để chặt tiếp.' : 'Đứng chưa đúng chỗ — bấm lại.');
  },
  async mine() {
    await goZone('m1'); C().tool.set('pickaxe', Math.max(1, C().tool.tier('pickaxe'))); const o = nearest(o => /^rock/.test(o.type)); if (!o) { say('Không thấy tảng đá.'); return; }
    C().hold('pickaxe'); warpPx(o.x * 16 + 8, (o.y + 1) * 16 + 10, 3); await wait(250); const l = press('gather');
    say(l ? 'Đào đá (M1): clip cuốc chim, xong thì đá vụn văng + nhặt đá.' : 'Đứng chưa đúng chỗ — bấm lại.');
  },
  async eat() {
    await goZone('village'); C().bag.add('berry', 3); C().hotbarSync(); C().hold('berry'); P().dir = 0; await wait(150);
    key('KeyE', true); key('KeyE', false);
    say('Ăn: đang CẦM quả (hotbar) → E vào chỗ trống hoặc chuột phải = ăn; clip ăn + đi nhanh hơn 20 % trong 30 giây. Đã cấp 3 quả.');
  },
  async bees() {
    await goZone('m3'); C().tool.set('torch', 0); C().hold('axe'); const o = nearest(o => o.type === 'beehive');   /* tổ ong có ở M3 (rừng) */ if (!o) { say('Vùng này không có tổ ong.'); return; }
    warpPx(o.x * 16 + 8, (o.y + 1) * 16 + 6, 3); await wait(200); const l = press('gather');
    say(l ? 'Ong đốt (M3, không có đuốc): clip đau, co người rồi đứng thẳng lại.' : 'Đứng chưa đúng chỗ — bấm lại.');
  },
  async steps() {
    await goZone('village'); const m = S().map, T = C().T, p = P(); let best = null;
    for (let r = 1; r < 30 && !best; r++) for (let dx = -r; dx <= r && !best; dx++) for (const dy of [-r, r]) { const tx = Math.floor(p.x / 16) + dx, ty = Math.floor(p.y / 16) + dy; if (C().getG(m, tx, ty) === T.DIRT && C().getG(m, tx, ty + 1) === T.DIRT && C().getG(m, tx, ty + 2) === T.DIRT && !C().isSolid(m, tx, ty)) best = { tx, ty }; }
    if (best) warpPx(best.tx * 16 + 8, best.ty * 16 + 8, 0);
    say('Bụi bước chân: nhân vật tự đi xuống 1,5 giây trên đường đất (trên cỏ/nước không có bụi).');
    key('ArrowDown', true); await wait(1500); key('ArrowDown', false);
  },
  async give() {
    await goZone('village'); const c = C();
    for (const id of ['axe', 'pickaxe', 'shovel', 'bucket', 'scythe', 'knife', 'rod', 'torch']) if (c.tool.tier(id) < 1) c.tool.set(id, 1);
    c.bag.add('seed_turnip', 5); c.bag.add('berry', 3); c.bag.add('hay', 3); c.bag.add('scarecrow', 1); c.hotbarSync(); c.hold('axe');
    say('Đã cấp đủ dụng cụ + hạt, quả, rơm, bù nhìn. Chọn ô bằng phím 1–9, 0, −, = / lăn chuột / bấm ô. Con trỏ đổi theo món đang cầm.');
  },
  async wrong() {
    await STEPS.give(); const o = nearest(o => o.type === 'tree'); if (!o) return;
    C().hold('shovel'); warpPx(o.x * 16 + 8, (o.y + 2) * 16 + 2, 3); await wait(300);
    say('Trỏ + click tự chọn: đang cầm XẺNG cạnh cây. Trỏ chuột vào cây → con trỏ thành 🪓, nhãn "Bấm để dùng 🪓 Rìu"; click (hoặc E) → hotbar tự nhảy sang rìu và chặt luôn. Thử cả: trỏ ô cỏ (xẻng), ô đã cày (hạt), cây non (xô), nước M1 (cần câu), cát M1 (xẻng).');
  },
  async mspawn() { await goZone('village'); C().hold('axe'); window.__monsters.spawnNear(3); say('Gọi 3 quái tới cạnh bạn. Click vào quái → tự đuổi theo, tự cầm vũ khí, chém. Quái đánh lại làm mất máu (thanh đỏ góc trái); hạ quái → kinh nghiệm + đồ rơi.'); },
  async mgift() { await goZone('village'); C().bag.add('stone', 5); C().hotbarSync(); C().hold('stone'); const n = S().npcs.find(x => C().villagers && !C().villagers.immune(x)); if (n) { n.busy = true; n.goal = null; warpPx(n.x - 22, n.y, 2); } say('Đang CẦM 🪨 đá Seismic (đã cấp 5). Click vào dân cạnh bạn để tặng — dân có đá mới chiến đấu: không chạy nữa mà đánh quái, có kiếm nhỏ ở vai; càng nhiều đá (tối đa 10) càng mạnh. Bấm "Gọi quái" để xem dân đánh.'); },
  /* ---- plan-25: hóa đá · 2 phe · mua đất · ao · phá đào · Xealist ---- */
  async kraken() {
    await goZone('sea'); Object.assign(S().save.story, { act: 1, step: 0, seaDone: false }); delete S().save.story.path; delete S().save.sys.pet;
    window.__storySea.plank(); await wait(300); window.__storySea.skipWait();
    const E = async () => { key('KeyE', true); await wait(60); key('KeyE', false); await wait(350); };
    let t0 = performance.now(); while (performance.now() - t0 < 20000) { if (S().mode === 'dialog') await E(); const st = window.__storySea.state(); if (st.flags.aboard && S().mode === 'play') break; await wait(300); }
    window.__storySea.completeAll(); await wait(900); window.__storySea.climax();
    say('Kraken trồi lên → Lyron đẩy bạn + Rocky lên ván → tia tím HÓA ĐÁ Lyron (xám dần) → tượng bị kéo xuống biển → khăn đỏ nổi lên → ván trôi vào bến → BẢNG CHỌN PHE. Bấm E để qua hội thoại.');
  },
  async faction() { await goZone('sea'); window.__storySea.faction(); say('Bảng chọn phe: Noxx (cứu Lyron, mua đất) / Xealist (sức mạnh, tiền, hóa đá). Bắt buộc chọn. Chọn xong có VFX riêng.'); },
  async petrify() { await goZone('village'); const id = window.__villagers.kill(0); await wait(200); const tb = S().map.objects.find(o => o.tomb === id); if (tb) warpPx(tb.x * 16 + 8, tb.y * 16 + 44, 3); say('Dân bị quái hạ → HÓA ĐÁ (tượng = chính người đó tô đá, sóng đá lan ra). 3 ngày để giải đá bằng Bùi nhùi hồi sinh, quá hạn → Vườn Tượng Đá.'); },
  async unstone() { const tb = S().map.objects.find(o => o.tomb); if (!tb) { say('Chưa có ai hóa đá — bấm "Dân hóa đá" trước.'); return; } C().bag.add('revive', 1); C().hold && C().hold('revive'); warpPx(tb.x * 16 + 8, tb.y * 16 + 30, 3); await wait(300); press('villagers'); say('Giải đá: vỏ đá vỡ, ánh vàng loé, dân sống lại.'); },
  async buyland() { await goZone('m2'); const c = (S().staff || []).find(n => n.chief); if (!c) { say('Vùng này không có Leader khu.'); return; } (S().save.met ||= []).includes(c.m.id) || S().save.met.push(c.m.id); C().bag.add('stone', 200); warpPx(c.x, c.y + 14, 3); await wait(300); say('Đứng cạnh Leader khu (vương miện + hào quang) → "' + (press('land') || 'Mua đất') + '". Mảnh 6×6 có cọc ranh + biển tên, VFX ánh vàng. Sau 3 s có dòng hướng dẫn thao tác.'); },
  async pond() { await goZone('m2'); let l = window.__land.list()[0] || window.__land.grant(); for (const [dx, dy] of [[1, 1], [2, 1], [3, 1], [1, 2], [2, 2], [3, 2]]) window.__ponds.dig(l.x + dx, l.y + dy); const st = S().save.sys.ponds.m2; for (const k in st) { st[k].n = 2; st[k].sp = ['carp', 'perch']; } warpPx((l.x + 2) * 16 + 8, (l.y + 4) * 16 + 12, 3); say('Ao nuôi cá trên đất mua: nhiều ô = 1 mặt nước liền, chỉ sắc xanh, viền đất; cá quẫy + vòng sóng; E cạnh ao = vớt cá. Đào ao thật: cầm xẻng, E vào ô đã cày.'); },
  async brk() { await goZone('m5'); let l = window.__land.list()[0]; if (!l) { C().bag.add('stone', 300); const c = (S().staff || []).find(n => n.chief); (S().save.met ||= []).includes(c.m.id) || S().save.met.push(c.m.id); warpPx(c.x, c.y + 14, 3); await wait(300); press('land'); l = window.__land.list()[0]; } const o = S().map.objects.find(o => !o.ghost && !o.landOf && o.x >= l.x && o.y >= l.y && o.x < l.x + l.w && o.y < l.y + l.h); if (o) { C().tool.set('pickaxe', 1); C().hold && C().hold('pickaxe'); warpPx(o.x * 16 + 8, (o.y + 1) * 16 + 12, 3); } say(o ? `Đất mua có sẵn ${o.type} → cầm cuốc/rìu, bấm E 3 lần: mảnh vụn → bản hư hỏng → sập, rơi gỗ/đá, ô thành ĐẤT. Cầm xẻng + E vào nền lát = đào lên thành đất.` : 'Mảnh đất trống — không có gì để phá.'); },
  async xea() { Object.assign(S().save.story, { act: 2, seaDone: true, step: 127, path: 'xealist' }); if (!(S().save.sys.pet || {}).pet) S().save.sys.pet = { pet: { name: 'Rocky', hunger: 100, bond: 5, born: Date.now() } }; await goZone('m1'); await goZone('village'); const x = window.__xea.npc(); if (x) warpPx(x.x, x.y + 14, 3); say('PHE XEALIST: Xealist đứng gần lối vào (E = nhận nhiệm vụ đen: đập công trình / hóa đá / móc túi). Rocky thành Rocky Bóng Tối (tím + hào quang). HUD góc phải: 🌑 Bóng tối.'); },
  async xeaact() { if (((S().save.story || {}).path) !== 'xealist') { say('Chọn phe Xealist trước (nút Phe Xealist).'); return; } const v = C().villagers.alive().find(n => !n.hurtSit); if (!v) return; v.busy = true; C().tool.set('sword', 1); C().hold && C().hold('sword'); warpPx(v.x, v.y + 12, 3); say('Cầm kiếm + E vào dân 3 lần = HÓA ĐÁ (dân choáng, kêu Dừng lại!). Tay không + E = móc túi 3–8 đá. Dân khác trông thấy → nghi ngờ +1, đủ 3 → dân tránh mặt.'); },
  async repent() { if (((S().save.story || {}).path) !== 'xealist') { say('Đang ở phe Noxx rồi.'); return; } await goZone('village'); const mem = S().map.objects.find(o => o.type === 'memorial'); if (mem) warpPx(mem.x * 16 + 16, (mem.y + 1) * 16 + 14, 3); say('Đứng trước Vườn Tượng Đá → E "Hối cải — quay về phe Noxx": Bóng tối về 0, Rocky sáng lại.'); },
  async reveal() { if (((S().save.story || {}).path) !== 'xealist') { say('Chọn phe Xealist trước.'); return; } window.__xea.reveal(); say('LỘ MẶT: băng đỏ, sóng đá, Xealist nói 3 câu. Từ giờ dân luôn bỏ chạy, quái không đánh bạn, không hối cải được, HUD 🌑 Tàn phá n/9.'); },
  async smashmon() { if (!(window.__xea && __xea.state().revealed)) { say('Cần lộ mặt trước (nút Lộ mặt).'); return; } await goZone('m1'); const o = S().map.objects.find(o => o.hall && !o.ruined); if (!o) { say('Bia vùng này đã vỡ.'); return; } C().tool.set('sword', 1); C().hold && C().hold('sword'); warpPx(o.x * 16 + 16, (o.y + 2) * 16 + 4, 3); say('Cầm kiếm + E 5 lần vào bia Magnitude → vỡ (đá văng, sóng đá, rung). Vỡ đủ 9 vùng → KẾT THÚC phe Xealist.'); },
  async xend() { if (!window.__xea) return; __xea.breakAll(); await goZone('m9'); const o = S().map.objects.find(o => o.hall && !o.ruined); if (o) { C().tool.set('sword', 1); C().hold && C().hold('sword'); warpPx(o.x * 16 + 16, (o.y + 2) * 16 + 4, 3); } say('Đã coi như vỡ 8 bia — đập bia M9 này (E ×5) để xem màn KẾT THÚC phe Xealist.'); },
  async leader() { const c = (S().staff || []).find(n => n.chief); if (!c) { say('Vùng này không có khu quốc gia.'); return; } warpPx(c.x + 24, c.y + 8, 1); say('Leader VIP: vương miện PixelLab nhấp nhô + hào quang riêng từng vùng (Làng cột vàng, M1/biển bong bóng, M2 hoa hồng, M3 ấn xanh, M4 lửa cam, M5/M6 vòng pháp thuật, M7 cột lửa, M8 băng, M9 ấn ngọc).'); },
  /* ---- plan-22 + lặt vặt: giao diện, túi, mua nhanh, cá, ném T ---- */
  async uibag() { toggleMenu('bag'); say('Túi kiểu Stardew: hàng đầu = thanh công cụ, kéo-thả, thùng rác, Xếp gọn, hộp mô tả cạnh con trỏ. Túi vô hạn. Thẻ Nhân vật có Đất của tôi + Tiến độ.'); },
  async uishop() { C().bag.add('stone', 300); toggleMenu('shop'); say('MUA NHANH (phím O): công cụ lên cấp + vật tư bằng đá Seismic, không cần NPC. Đồ mua rơi dưới chân rồi tự hút.'); },
  async trader() { const t = (S().staff || []).find(n => n.m.staff === 'trader'); if (!t) { say('Vùng này không có Thương nhân.'); return; } C().bag.add('wood', 5); warpPx(t.x, t.y + 16, 3); await wait(300); press('market'); say('Quầy Thương nhân = NPC + bảng tên; bảng 2 cột có chân dung. Bán/mua → đá rơi trước mặt rồi hút.'); },
  async talk() { const n = S().npcs.find(x => !x.m.friend); if (!n) return; n.busy = true; warpPx(n.x, n.y + 14, 3); await wait(300); key('KeyE', true); await wait(60); key('KeyE', false); say('Hộp thoại kiểu Stardew: đáy màn, chân dung to bên phải, chữ chạy từng ký tự, emoji → icon pixel.'); },
  async fishsp() { addCarry(C(), { kind: 'fish', sp: 'salmon', cm: 75 }); addCarry(C(), { kind: 'fish', sp: 'tuna', big: true, cm: 120 }); say('Câu được loài nào bưng đúng con đó: cá hồi + cá ngừ to trên đầu (ảnh PixelLab như thẻ cá). Bấm T → ném vào ô thanh công cụ (bay vòng cung, lấp lánh, +1).'); },
  async throwT() { if (!C().carry.get().length) addCarry(C(), { kind: 'fish', sp: 'carp' }); key('KeyT', true); await wait(60); key('KeyT', false); say('Phím T: con vật trên đầu bay vòng cung vào ô trống (hoặc ô có sẵn), bung lấp lánh, ô nảy, "+1". Thanh đầy → bay vào nút Túi.'); },
  async hudfx() { C().pop(P().x, P().y - 20, '+3 🪵 Gỗ'); C().toast('Túi đầy!'); window.__hero.hit(15); setTimeout(() => C().toast('Lên cấp 2! Máu và sức đánh tăng', true), 600); say('HUD Stardew: đồng hồ + đá góc phải, icon trạng thái, thông báo gộp góc dưới trái, băng đỏ việc lớn, máu/KN dọc, nhãn cạnh con trỏ.'); },
  async seafish() { Object.assign(S().save.story, { act: 2, seaDone: true, step: 127 }); S().save.story.path ||= 'noxx'; C().tool.set('rod', 1); await goZone('village'); await goZone('sea'); C().hold && C().hold('rod'); say('Ở biển: lên bè (E), cầm cần câu, E vào nước → vung cần, phao, thanh kéo, thẻ loài — y như trên bờ. Rocky ngồi mép bè đối diện Lyron.'); },
  /* plan-24: mọi vật phẩm rơi ra → nhặt → ném vào túi; quái cướp phải giơ đồ */
  async drop() { if (window.__drops) { __drops.drop('wood', 6, 0, 46); __drops.drop('stone', 4, 36, 30); __drops.drop('berry', 3, -36, 30); } say('Gỗ, đá Seismic, quả bật ra đất, nảy rồi nằm lại (lưu mãi). Đi tới gần ~2 ô → tự hút về người → bay vào ô thanh công cụ / ô đếm đá.'); },
  async steal() { const A = await import('./systems/animals.js'); A.addCarry(C(), { kind: 'fish', sp: 'salmon', cm: 70 }); const m = C().monsters && C().monsters.list()[0]; if (m) { const p = S().player; m.x = p.x + 10; m.y = p.y + 2; m.angry = true; m.cd = 0; } say(m ? 'Quái giật con cá trên đầu bạn, GIƠ LÊN rồi bỏ chạy (dấu ! nhấp nháy). Đánh trúng nó → cá rơi xuống đất cho bạn nhặt lại.' : 'Chưa có quái ở đây — bấm Gọi quái trước.'); },
  /* plan-23: quái phá làng + dân tự sửa + Rocky */
  async wdent() { const r = window.__wreck && __wreck.dent(); say(r ? 'Một công trình gần đây bị quái đập còn ½ máu → hiện bản HƯ HỎNG (nứt, nghiêng) bằng ảnh PixelLab.' : 'Vùng này không có công trình nào.'); },
  async wsmash() { const n = window.__wreck && __wreck.smash(3); say(`Đập đổ 3 món → bản ĐỔ NÁT (sập, không chắn đường, đèn tắt). Đang có ${n} món đổ nát trong vùng.`); },
  async wnight() { C().clock.set({ hour: 21, minute: 0 }); say(`Chuyển sang 21:00 — cứ 3 con quái thì 1 con đi PHÁ: rào, tường, đèn, đình, bù nhìn, chuồng, ruộng. Tối đa ${window.__wreck ? __wreck.cap() : '?'} món / đêm ở vùng này; băng cảnh báo + dấu ! nhấp nháy trên món đang bị đập.`); },
  async wjob() { C().clock.set({ hour: 9, minute: 0 }); if (window.__wreck && !__wreck.state().ruined) __wreck.smash(1); const ok = window.__wreck && __wreck.job(); say(ok ? '9:00 — 1 dân nhận việc: đi đào đá Seismic → tới Thương nhân đổi vật liệu → về gõ búa sửa món đổ nát gần nhất (khoảng 1 phút).' : 'Không có dân rảnh hoặc không có món đổ nát.'); },
  async wgrow() { const p = window.__pet && __pet.hatchNow(); say(p ? `${p.name} lớn lên (giống khi ủ đủ tinh thể Lõi M9): to hơn, hay mang về đồ hiếm.` : 'Chưa có Rocky.'); },
  async mnight() { C().clock.set({ hour: 21, minute: 0 }); say('Chuyển sang 21:00 — quái đông gấp đôi và đi săn dân. Dân bị đánh kêu "Cứu với!", mũi tên đỏ ở mép màn hình chỉ tới.'); },
  async mday() { C().clock.set({ hour: 8, minute: 0 }); say('Chuyển sang 8:00 — quái quay về cướp tài nguyên (cây trồng, đồ đang bế, chỗ tài nguyên).'); },
  async mkill() { await goZone('village'); const id = window.__villagers.kill(0); const tb = S().map.objects.find(o => o.tomb === id); if (tb) warpPx(tb.x * 16 + 8, (tb.y + 1) * 16 + 6, 3); C().bag.add('revive', 1); C().hotbarSync(); say('Một dân đã ngã xuống → bia mộ. Đã cấp 1 🕯 Bùi nhùi hồi sinh: click vào bia mộ để hồi sinh. Quá 3 ngày không cứu → chết hẳn, tên lên Đài Tưởng Niệm.'); },
  async msword() { const c = C(), k = Math.min(6, c.tool.tier('sword') + 1); c.tool.set('sword', k); c.hotbarSync(); c.hold('sword'); say(`Kiếm lên cấp ${k} (6 = Kiếm Seismic). Quái vùng cao có giáp: kiếm cấp thấp chỉ gây 1 sát thương.`); },
  async mmem() { await goZone('village'); window.__villagers.kill(1); window.__villagers.expireNow(); const o = S().map.objects.find(o => o.memorial); if (o) warpPx(o.x * 16 + 16, (o.y + 2) * 16 + 4, 3); say('Đài Tưởng Niệm (cạnh cổng Làng): click vào để xem danh sách người đã chết hẳn.'); },
  async levelup() { C().vfx && C().vfx('level_up', P().x, P().y + 2, 0, true); say('Lên cấp: cột sáng vàng + vòng + mũi tên (chạy khi nhận huy hiệu vùng).'); },
  async wade() {
    await goZone('m1'); const m = S().map, T = C().T; let spot = null;
    for (let ty = 2; ty < m.h - 2 && !spot; ty++) for (let tx = 2; tx < m.w - 3; tx++) { if (C().getG(m, tx, ty) === T.WATER && C().getG(m, tx + 1, ty) === T.WATER && C().getG(m, tx - 3, ty) !== T.WATER && C().getG(m, tx - 3, ty) !== T.DEEP) { spot = { tx, ty }; break; } }
    if (!spot) { say('Không thấy chỗ nước nông.'); return; }
    const ns = S().npcs.slice(0, 2); ns.forEach((n, i) => { n.busy = true; n.goal = null; n.path = null; n.x = (spot.tx + i) * 16 + 8; n.y = (spot.ty + i) * 16 + 10; });
    warpPx((spot.tx - 2) * 16 + 8, spot.ty * 16 + 10, 2);
    say('NPC lội nước (M1): chìm tới hông, có mép nước gợn (trước hiện nguyên người như đứng trên nước). Tự đi xuống nước để thấy mình cũng lội.');
  },
  async boat() {
    await goZone('m1'); const info = window.__veh && window.__veh.info(); const pk = info && info.parked;
    if (pk) warpPx((pk.x ?? pk.tx) * 16 + 8, ((pk.y ?? pk.ty) + 1) * 16 + 4, 3); await wait(250);
    const l = press('vehicles');
    say(l ? `Thuyền M1 (${l}): người chèo ngồi ghế, chỉ còn 2 mái chèo của thuyền (trước bị 3). Dùng phím mũi tên để chèo, E để lên bờ.` : 'Chưa tới được thuyền — đi tới bến thuyền ở bờ biển M1 rồi bấm E.');
  },
  async raft() {
    await goZone('sea'); const ss = window.__storySea; if (!ss) { say('Không có cốt truyện biển.'); return; }
    ss.skipWait(); say('Đang chờ bè của Lyron tới…');
    for (let i = 0; i < 80; i++) { await wait(250); const s = ss.state(); if (s.phase === 'ride') break; if (s.mode === 'dialog') { key('KeyE', true); key('KeyE', false); } }
    say('Bè + Lyron: Lyron ngồi gọn phía đuôi bè (trước lòi ra ngoài nước). Dùng phím mũi tên để chèo.');
  },
};

const LIST = [
  ['Cốt truyện · 2 phe (plan-25)', [['kraken', 'Cảnh Kraken → hóa đá Lyron'], ['faction', 'Bảng chọn phe'], ['petrify', 'Dân hóa đá'], ['unstone', 'Giải đá'], ['xea', 'Phe Xealist'], ['xeaact', 'Hóa đá / móc túi'], ['repent', 'Hối cải'], ['reveal', 'Lộ mặt'], ['smashmon', 'Đập bia M1'], ['xend', 'Kết thúc Xealist']]],
  ['Mua đất · ao · phá (plan-25)', [['buyland', 'Mua đất (M2)'], ['pond', 'Ao cá liền'], ['brk', 'Phá & đào (M5)'], ['leader', 'Leader VIP']]],
  ['Giao diện · túi · cá (plan-22)', [['hudfx', 'HUD + thông báo'], ['uibag', 'Túi đồ'], ['uishop', 'Mua nhanh (O)'], ['trader', 'Quầy Thương nhân'], ['talk', 'Hội thoại'], ['fishsp', 'Bưng đúng loài cá'], ['throwT', 'Phím T ném'], ['seafish', 'Câu ở biển']]],
  ['Đồ rơi · nhặt (plan-24)', [['drop', 'Rơi đồ ra đất'], ['steal', 'Quái cướp cá']]],
  ['Quái phá làng · Rocky (plan-23)', [['wnight', 'Đêm: quái đi phá'], ['wdent', 'Hư hỏng 1 món'], ['wsmash', 'Đổ nát 3 món'], ['wjob', 'Dân đi sửa'], ['wgrow', 'Rocky lớn lên']]],
  ['Quái (plan-21)', [['mspawn', 'Gọi quái'], ['mgift', 'Tặng đá cho dân'], ['msword', 'Kiếm +1 cấp'], ['mnight', 'Đêm'], ['mday', 'Ngày'], ['mkill', 'Giết 1 dân'], ['mmem', 'Đài Tưởng Niệm']]],
  ['Hotbar (plan-20)', [['give', 'Cấp đủ đồ'], ['wrong', 'Trỏ + click tự chọn']]],
  ['Nhân vật', [['idle', 'Đứng thở'], ['eat', 'Ăn'], ['bees', 'Ong đốt (M3)'], ['steps', 'Bụi bước chân'], ['levelup', 'Lên cấp']]],
  ['Trồng trọt', [['hoe', '1. Cuốc'], ['sow', '2. Gieo hạt'], ['water', '3. Tưới'], ['harvest', '4. Thu hoạch']]],
  ['Thu thập', [['chop', 'Chặt cây'], ['mine', 'Đào đá (M1)']]],
  ['Lỗi đã sửa', [['wade', 'NPC lội nước'], ['boat', 'Thuyền 2 mái chèo'], ['raft', 'Bè + Lyron']]],
];
function render() {
  el.innerHTML = `<div class="s19-h">🧪 TEST tổng hợp plan-19 → 25 <span class="dim">F9 ẩn/hiện · không ghi save</span></div>`
    + LIST.map(([h, bs]) => `<div class="s19-g">${h}</div><div class="s19-row">${bs.map(([a, t]) => `<button data-a="${a}">${t}</button>`).join('')}</div>`).join('')
    + `<div id="s19-log" class="dim">Bấm từng nút rồi nhìn nhân vật giữa màn hình. Mới: CLICK chuột vào đâu nhân vật đi tới đó; click vào cây/đá/ô ruộng/nước ở xa → tự đi tới, tự cầm đúng món và làm. Phím mũi tên huỷ tự đi.</div>`;
  el.onclick = async e => {
    const b = e.target.closest('button'); if (!b) return; b.blur();
    try { await STEPS[b.dataset.a](); } catch (err) { say('Lỗi: ' + err.message); console.error(err); }
  };
}
export function runShowcase19(d) {
  deps = d; saveOff();
  el = document.createElement('div'); el.id = 'show19'; document.body.appendChild(el);
  const css = document.createElement('style');
  css.textContent = `#show19{position:fixed;left:10px;top:104px;width:280px;max-height:calc(100vh - 120px);overflow-y:auto;z-index:8;background:rgba(13,11,20,.9);border:2px solid #ffd45e;border-radius:10px;padding:8px 10px;color:#f2ebe0;font:12.5px VT323, monospace}
  #show19 .s19-h{font-weight:700;color:#ffd45e;margin-bottom:4px} #show19 .s19-g{margin:7px 0 2px;color:#ffd45e;font-size:11.5px;text-transform:uppercase;letter-spacing:.04em}
  #show19 .s19-row{display:flex;flex-wrap:wrap;gap:4px} #show19 button{font:12px VT323, monospace;padding:5px 8px;border-radius:6px;border:1px solid #33294a;background:#2b2440;color:#f2ebe0;cursor:pointer}
  #show19 button:hover{border-color:#ffd45e} #show19 .dim{color:#a79a86} #show19 #s19-log{margin-top:8px;min-height:3em;line-height:1.35} #show19[hidden]{display:none}
  @media (max-width:600px){#show19{top:auto;bottom:8px;left:8px;right:8px;width:auto;max-height:42vh}}`;
  document.head.appendChild(css); render();
  window.addEventListener('keydown', e => { if (e.code === 'F9') { el.hidden = !el.hidden; e.preventDefault(); } });
}
