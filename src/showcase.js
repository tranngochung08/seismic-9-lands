// showcase.js — bảng "check nhanh" cho anh xem tính năng mới không phải tự mò: ?auto&zone=village&showcase=dot1
// Bảng nổi bên trái: nút cấp đồ / dựng ruộng mẫu / dựng chuồng mẫu / qua đêm / đặt giờ / đổi mùa + checklist những gì cần nhìn. Phím F9 ẩn/hiện.
import { farm } from './systems/farm.js';
import { pens } from './systems/pens.js';

const $ = s => document.querySelector(s);
let deps = null, el = null;
const wait = ms => new Promise(r => setTimeout(r, ms));
const T = () => deps.CTX.T;
const say = t => { const b = el.querySelector('#sc-log'); if (b) { b.textContent = t; } };

function warp(tx, ty, dir = 0) { const p = deps.S.player; p.x = tx * 16 + 8; p.y = ty * 16 + 12; p.dir = dir; }
function toWell() { const S = deps.S, C = deps.CTX, w = S.map.objects.find(o => o.type === 'well' && !o.ruined); if (!w) return false; const d = C.O.well; S.player.x = w.x * 16 + d.fw * 8; S.player.y = (w.y + d.fh) * 16 + 6; S.player.dir = 3; return true; }
function pressFarm() { const c = farm.near(deps.CTX); if (c) farm.interact(deps.CTX, c); return c ? c.label : null; }
function pressPens() { const c = pens.near(deps.CTX); if (c) pens.interact(deps.CTX, c); return c ? c.label : null; }
function seasonSeeds(ctx) { return Object.keys(ctx.ITEMS).filter(id => id.startsWith('seed_') && (ctx.ITEMS[id].tags.includes('any') || ctx.ITEMS[id].tags.includes(ctx.season()))); }

async function giveAll() {
  const C = deps.CTX; window.__farm && window.__farm.tools();
  if (C.tool.tier('cage') < 1) C.tool.set('cage', 1); if (C.tool.tier('cart') < 1) C.tool.set('cart', 1);
  for (const id of seasonSeeds(C)) C.bag.add(id, 5);
  C.bag.add('hay', 8); if (!C.bag.has('pen1', 1)) C.bag.add('pen1', 1);
  const c = C.carry.get(); if (!c.includes('chicken')) c.push('chicken'); if (!c.includes('cow')) c.push('cow');
  C.persist(); say('Đã cấp: xẻng, xô, lồng, xe, hạt theo mùa ×5, rơm 8, chuồng gỗ; đang bế gà + bò. (Bù nhìn cấp khi dựng ruộng.)');
}
function plotTiles() {
  const C = deps.CTX, S = deps.S, my = C.myPlot(); if (!my) return null; const sp = my.spawn || my; const out = [];
  for (let y = sp.y; y < sp.y + sp.h && out.length < 8; y++) for (let x = sp.x; x < sp.x + sp.w && out.length < 8; x++) {
    const g = C.getG(S.map, x, y); if (!C.isSolid(S.map, x, y) && !C.hasObjectAt(S.map, x, y) && (g === T().GRASS || g === T().GRASS2 || g === T().DIRT || g === T().SAND || g === T().FLOWER)) out.push({ x, y });
  }
  return out;
}
async function buildFarm() {
  const C = deps.CTX; await giveAll(); const tiles = plotTiles(); if (!tiles || !tiles.length) { say('Không tìm được ô trống trong khu — đi tới khu khác rồi bấm lại.'); return; }
  const seeds = seasonSeeds(C); let n = 0;
  for (const t of tiles.slice(0, 6)) { warp(t.x, t.y); pressFarm(); await wait(30); const l = pressFarm(); if (l && /Gieo|Sow/.test(l)) n++; await wait(30); }
  /* múc nước ở giếng */
  if (toWell()) { pressFarm(); await wait(30); }
  for (const t of tiles.slice(0, 5)) { warp(t.x, t.y); pressFarm(); await wait(20); }
  /* bù nhìn ở ô thứ 7 (cấp sau cùng vì cầm bù nhìn thì E ưu tiên đặt bù nhìn) */
  let sc = false; if (tiles[6] && C.bag.add('scarecrow', 1) > 0) { warp(tiles[6].x, tiles[6].y); sc = /Bù nhìn|scarecrow/i.test(pressFarm() || ''); }
  const t0 = tiles[0]; warp(t0.x, t0.y + 1, 3);
  say(`Ruộng mẫu: cày + gieo ${n} ô (${seeds.map(s => s.slice(5)).join(', ')}), tưới ${window.__farm.state().bucketWater >= 0 ? 5 : 0} ô${sc ? ', bù nhìn 1' : ''}. Bấm "Qua đêm" vài lần để xem cây lớn; ô thứ 6 chưa tưới để so sánh.`);
}
async function buildPen() {
  const C = deps.CTX; await giveAll(); const sp = window.__pens && window.__pens.spot(); if (!sp) { say('Khu này không có bãi trống 4×3 cho chuồng — thử khu khác.'); return; }
  warp(sp.gate.x, sp.gate.y, 0); const built = pressPens(); await wait(80);
  C.bag.remove('pen1', 99);   /* chuồng thừa trong túi làm nhãn E ưu tiên 'dựng' thay vì 'thả' */
  if (!window.__pens.state().length) { say('Không dựng được chuồng: ' + (built || 'không có nhãn E') + '. Thử bấm lại ở khu khác.'); return; }
  const acts = []; for (let i = 0; i < 4 && C.carry.get().length; i++) { acts.push(pressPens()); await wait(40); }   /* thả gà + bò qua cổng */
  const trough = deps.S.map.objects.find(o => o.type === 'pen_trough'); C.carry.get().length = 0;
  if (trough) { warp(trough.x, trough.y + 1, 3); await wait(30); acts.push(pressPens()); await wait(40); acts.push(pressPens()); }
  const st = window.__pens.state()[0];
  say(`Chuồng mẫu dựng ở (${sp.x0},${sp.y0}), thú trong chuồng: ${st ? st.animals.map(a => a.name || a.kind).join(', ') : '?'}; đã cho ăn ${st ? st.animals.filter(a => a.fed).length : 0} (E: ${acts.filter(Boolean).join(' → ')}). Bấm "Qua đêm" → bảng sáng báo trứng + sữa; đứng cạnh bảng tên bấm E lấy.`);
}
async function careAll() {   /* tưới hết ô đã cày (múc lại xô khi cạn) + cho thú ăn → bấm trước mỗi "Qua đêm" để thấy cây lớn từng ngày */
  const C = deps.CTX, tiles = Object.keys(window.__farm.state().zone.tiles).map(k => k.split(',').map(Number)); let w = 0, fed = null;
  for (const [x, y] of tiles) {
    if (window.__farm.state().bucketWater <= 0) { if (!toWell()) break; pressFarm(); await wait(30); }
    warp(x, y); const l = pressFarm(); if (l && /Tưới|Water/.test(l)) w++; await wait(20);
  }
  const trough = deps.S.map.objects.find(o => o.type === 'pen_trough'); if (trough) { warp(trough.x, trough.y + 1, 3); await wait(20); fed = pressPens(); await wait(30); pressPens(); }
  say(`Đã tưới ${w}/${tiles.length} ô${fed ? '; ' + fed : ''}. Giờ bấm "Qua 1 đêm".`);
}
async function sleepN(n) { const C = deps.CTX; for (let i = 0; i < n; i++) { C.clock.sleep(); await wait(1400); if (deps.S.mode === 'summary') { const cl = deps.S.closers && deps.S.closers.summary; if (cl) cl(); else deps.setMode('play'); } await wait(100); } say(`Đã qua ${n} đêm → ${C.clock.label(C.lang())}`); }
function render() {
  const C = deps.CTX;
  el.innerHTML = `<div class="sc-h">🧪 CHECK ĐỢT 1 <span class="dim">(F9 ẩn/hiện)</span></div>
  <div class="sc-row"><button data-a="give">1. Cấp đồ</button><button data-a="farm">2. Dựng ruộng mẫu</button><button data-a="pen">3. Dựng chuồng mẫu</button></div>
  <div class="sc-row"><button data-a="care">Tưới + cho ăn</button><button data-a="sleep1">Qua 1 đêm</button><button data-a="sleep3">Qua 3 đêm</button><button data-a="late">Đặt 1:50 (tự ngủ)</button><button data-a="season">Mùa tiếp</button><button data-a="night">Đặt 21:00</button></div>
  <div class="sc-row"><button data-a="plot">Tới khu của mình</button><button data-a="well">Tới giếng</button><button data-a="bed">Tới giường</button><button data-a="trader">Tới Thương nhân</button></div>
  <div id="sc-log" class="dim">Bấm 1 → 2 → 3, rồi lặp "Tưới + cho ăn" → "Qua 1 đêm" để xem cây lớn, trứng/sữa mỗi sáng.</div>
  <ol class="sc-chk">
   <li>Đồng hồ góc trên phải chạy khi chơi, dừng khi mở menu (Esc).</li>
   <li>Ruộng: ô cày nâu, ô đã tưới sẫm hơn; đêm nào có tưới thì cây lớn 1 giai đoạn, không tưới đứng yên; chín → E "Thu hoạch" → số nổi.</li>
   <li>Đổi mùa → cây sai mùa héo (E "Nhổ").</li>
   <li>Chuồng: gà bò đi trong rào; cho ăn ở máng (E), vuốt ve +♥; sáng có trứng/sữa ở bảng tên; đêm không ăn → tim tụt, không chết.</li>
   <li>Ngủ ở giường cạnh đình → màn tối → bảng tổng kết sáng.</li>
   <li>Thương nhân bán hạt theo mùa 2 đá; cắt cỏ đôi khi rơi hạt.</li>
  </ol>`;
  el.onclick = async e => {
    const b = e.target.closest('button'); if (!b) return; const a = b.dataset.a; const S = deps.S;
    try {
      if (a === 'give') await giveAll(); else if (a === 'farm') await buildFarm(); else if (a === 'pen') await buildPen();
      else if (a === 'care') await careAll(); else if (a === 'sleep1') await sleepN(1); else if (a === 'sleep3') await sleepN(3);
      else if (a === 'late') { C.clock.set({ hour: 1, minute: 50 }); say('1:50 — chờ ~6 giây thật sẽ tự về giường.'); }
      else if (a === 'night') { C.clock.set({ hour: 21, minute: 0 }); say('21:00 — xem trời tối dần (tối đa 45 %).'); }
      else if (a === 'season') { const s = C.clock.SEASONS, i = (s.indexOf(C.clock.season) + 1) % s.length; C.clock.set({ day: 1, season: s[i], year: C.clock.year + (i === 0 ? 1 : 0) }); say(`Mùa: ${C.clock.seasonName(C.lang())} — cây sai mùa sẽ héo sau đêm đầu.`); }
      else if (a === 'plot') { const my = C.myPlot(); if (my) { const sp = my.spawn || my; warp(sp.x + 1, sp.y + 1); say(`Khu ${my.nation}${my.mine ? '' : ' (chưa xác định nước → khu gần nhất)'}`); } }
      else if (a === 'well') { const w = S.map.objects.find(o => o.type === 'well'); if (w) warp(w.x + 1, w.y + 3, 3); }
      else if (a === 'bed') { const b2 = S.map.objects.find(o => o.bed); if (b2) warp(b2.x, b2.y + 1, 3); say('Bấm E để ngủ.'); }
      else if (a === 'trader') { const go = () => { const t = S.map.objects.find(o => o.shop); if (t) { warp(t.x + 1, t.y + 3, 3); say('Bấm E mở quầy → mục "Hạt giống theo mùa" (2 đá/hạt).'); } else say('Vùng này không có quầy.'); };
        if (S.map.objects.some(o => o.shop)) go(); else if (deps.enterZone) { deps.enterZone('m2', 'default'); setTimeout(go, 900); say('Đang sang Chợ (M2)…'); } }
    } catch (err) { say('Lỗi: ' + err.message); console.error(err); }
  };
}
export function runShowcase(d) {
  deps = d; window.__showcase = { toWell, warp, pressFarm, pressPens };   /* cho script test */ el = document.createElement('div'); el.id = 'showcase'; document.body.appendChild(el);
  const css = document.createElement('style'); css.textContent = `#showcase{position:fixed;left:10px;top:104px;width:300px;max-height:calc(100vh - 120px);overflow-y:auto;z-index:8;background:rgba(13,11,20,.88);border:2px solid #ffd45e;border-radius:10px;padding:8px;color:#f2ebe0;font:13px "Segoe UI",sans-serif}
  #showcase .sc-h{font-weight:700;color:#ffd45e;margin-bottom:4px} #showcase .sc-row{display:flex;flex-wrap:wrap;gap:4px;margin:3px 0}
  #showcase button{font:12px "Segoe UI",sans-serif;padding:4px 7px;border-radius:6px;border:1px solid #33294a;background:#2b2440;color:#f2ebe0;cursor:pointer} #showcase button:hover{border-color:#ffd45e}
  #showcase .sc-chk{margin:6px 0 0 16px;padding:0;font-size:11.5px;color:#cbd5c0} #showcase .sc-chk li{margin:2px 0} #showcase .dim{color:#a79a86} #showcase[hidden]{display:none}`;
  document.head.appendChild(css); render();
  window.addEventListener('keydown', e => { if (e.code === 'F9') { el.hidden = !el.hidden; e.preventDefault(); } });
}
