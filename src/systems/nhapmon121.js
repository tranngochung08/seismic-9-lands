/* nhapmon121.js — c69-nhapmon (plan-121 đợt A1/A2): CHUỖI "NHẬP MÔN" cho NGƯỜI CHƠI MỚI.
   · Chỉ áp cho ván mới (save.flags.p120new — noxx120.fresh120). Save cũ không có cờ → coi như xong (không bắt chơi lại).
   · 10 bước nối nhau, xong bước này mới hiện bước sau, mỗi bước dạy đúng 1 thứ, phím ghi ngay trong dòng (máy tính: phím; điện thoại: tên nút ảo):
       (0 chọn Chấn Thú với Noxx) → 1 tới bãi quái phía Nam → 2 thả Chấn Thú (J) → 3 hạ 3 quái → 4 Chưởng (phím L, 1 Ki) → 5 mở túi (I)
       → 6 đập 3 mỏ tím → 7 bắt 1 Chấn Thú hoang (đánh ngất → E ném Ấn Thu) → 8 gom 30 đá mua Kiếm (O) → 9 mở bản đồ (M) → 10 qua Đèo 1.
   · Lưu save.sys.nhapmon121 = { v, i (bước hiện tại), prog, base, done, old }. Thưởng nhỏ mỗi bước (đá vào túi + XP) + banner "HOÀN THÀNH NHIỆM VỤ"
     (cùng kiểu ruy băng / khung giấy của questbanner120, xếp hàng sau banner đang hiện, không lặp).
   · Một mục tiêu duy nhất: ctx.nhapmon121 = { active(), line(lang), target(), state() } — nextstep.js (thanh việc), edgearrow120.js (mũi tên mép)
     và bảng Nhiệm vụ (chèn mục Nhập môn vào thẻ Nhiệm vụ của menu.js qua DOM, các dòng cốt truyện khác ghi 'sau Nhập môn') cùng chỉ bước hiện tại.
     Đang Nhập môn: ẩn dòng 'Cứu Lyron' (#h-story) / #h-quest / #h-task trên HUD.
   · Save đã đi trước (đã có Kiếm, đã qua Đèo 1, có huy hiệu, đang ở vùng khác) tự đánh dấu các bước đã xong; qua Đèo 1 là xong cả chuỗi.
   Móc test: window.__nm121 = { state(), skip(), set(i), banner() }. Dấu build: NM121_NHAPMON */
import { regionAt } from '../village88.js';
import { netStat, ballInfo } from './farm106.js';
import { img, paper, sh, uiS, isVi, bannerTop, itemRel } from './hud120lib.js';
import { ROADS } from '../world.js';

const TS = 16, SWORD = 30, KILL_N = 3, VEIN_N = 3, FARM = 'south';
const IDS = ['noxx', 'go', 'out', 'kill', 'palm', 'bag', 'vein', 'catch', 'sword', 'map', 'pass'];
const IX = Object.fromEntries(IDS.map((k, i) => [k, i]));
const NSTEP = IDS.length - 1;   /* bước đánh số 1..10 (bước 'noxx' = 0, chưa đánh số) */
const RW = { go: { s: 2, x: 5 }, out: { s: 2, x: 5 }, kill: { s: 4, x: 10 }, palm: { s: 3, x: 5 }, bag: { s: 2, x: 0 }, vein: { s: 4, x: 5 }, catch: { s: 5, x: 10 }, sword: { s: 0, x: 15 }, map: { s: 2, x: 5 }, pass: { s: 5, x: 20 } };
const FLY = { crow: 1, gull: 1, daibang: 1, hac: 1, macuu: 1 };
const T_ALL = 3.0, T_IN = 0.3, T_OUT = 0.7;
const TX = {
  vi: {
    tag: n => `Nhập môn ${n}/${NSTEP}`, title: 'HOÀN THÀNH NHIỆM VỤ', fin: 'HOÀN THÀNH NHẬP MÔN', stones: 'đá', sec: 'Nhập môn', after: 'Mở sau khi xong Nhập môn',
    short: { noxx: 'Chọn Chấn Thú', go: 'Tới bãi quái', out: 'Thả Chấn Thú', kill: 'Hạ 3 quái', palm: 'Dùng Chưởng', bag: 'Mở túi đồ', vein: 'Đập 3 mỏ tím', catch: 'Bắt Chấn Thú hoang', sword: 'Mua Kiếm', map: 'Mở bản đồ', pass: 'Qua Đèo 1' },
    noxx: k => `Nói chuyện với Noxx (${k}) để chọn Chấn Thú`,
    go: 'Đi xuống bãi quái phía Nam (theo mũi tên)',
    out: k => `Thả Chấn Thú ra đánh cùng: ${k}`,
    kill: (n, k) => `Hạ ${KILL_N} quái (${n}/${KILL_N}): ${k}`,
    palm: k => `Dùng Chưởng: ${k} · tốn 1 Ki (ngọc xanh, tự hồi)`,
    bag: k => `Mở túi đồ: ${k}`,
    vein: (n, k) => `Đập ${VEIN_N} mỏ tím lấy đá Seismic (${n}/${VEIN_N}): ${k}`,
    catch: k => `Bắt 1 Chấn Thú hoang: đánh ngất nó rồi ${k} ném Ấn Thu`,
    catchNow: k => `Nó ngất rồi! ${k} để ném Ấn Thu`,
    noBall: 'Hết Ấn Thu — bỏ qua bước bắt thú',
    gather: n => `Gom ${SWORD} đá mua Kiếm (có ${n}): đập mỏ tím, hạ quái`,
    buy: k => `Mua Kiếm: ${k} · ${SWORD} đá`,
    map: k => `Mở bản đồ: ${k}`,
    pass: (nm, lv) => `Qua Đèo 1 → M1: lên cổng phía Bắc, thắng ${nm}` + (lv ? ` (nên Lv ${lv})` : ''),
    kD: { talk: 'bấm E', out: 'bấm J', kill: 'chuột trái vào quái', palm: 'bấm L khi quái ở trước mặt', bag: 'bấm I', vein: 'chuột trái vào mỏ', ball: 'bấm E', buy: 'bấm O (Mua nhanh)', map: 'bấm M' },
    kT: { talk: 'bấm nút A', out: 'bấm nút Thả', kill: 'đi sát quái, bấm nút A', palm: 'bấm nút Chưởng', bag: 'bấm nút ☰', vein: 'đứng sát mỏ, bấm nút A', ball: 'bấm nút A', buy: 'nút ☰ → thẻ Mua nhanh', map: 'bấm nút Bản đồ (cuộn giấy góc trên)' },
    tgt: { noxx: 'Noxx', go: 'Bãi quái', kill: 'Quái', palm: 'Quái', vein: 'Mỏ tím', catch: 'Chấn Thú hoang', village: 'Về Làng', pass: 'Đèo 1', m1: 'Cổng M1' },
  },
  en: {
    tag: n => `Basics ${n}/${NSTEP}`, title: 'QUEST COMPLETE', fin: 'BASICS COMPLETE', stones: 'stones', sec: 'Basics', after: 'Opens after the Basics',
    short: { noxx: 'Pick a Quake Beast', go: 'Reach the monster field', out: 'Send out your beast', kill: 'Defeat 3 monsters', palm: 'Use Ki Palm', bag: 'Open your bag', vein: 'Mine 3 purple veins', catch: 'Catch a wild beast', sword: 'Buy a Sword', map: 'Open the map', pass: 'Cross Pass 1' },
    noxx: k => `Talk to Noxx (${k}) to pick a Quake Beast`,
    go: 'Head to the monster field in the south (follow the arrow)',
    out: k => `Send out your Quake Beast to fight with you: ${k}`,
    kill: (n, k) => `Defeat ${KILL_N} monsters (${n}/${KILL_N}): ${k}`,
    palm: k => `Use Ki Palm: ${k} · costs 1 Ki (green orbs, they refill)`,
    bag: k => `Open your bag: ${k}`,
    vein: (n, k) => `Mine ${VEIN_N} purple veins for Seismic stones (${n}/${VEIN_N}): ${k}`,
    catch: k => `Catch a wild Quake Beast: knock it out, then ${k} to throw a Seal Orb`,
    catchNow: k => `It fainted! ${k} to throw a Seal Orb`,
    noBall: 'Out of Seal Orbs — skipping the catch step',
    gather: n => `Gather ${SWORD} stones for a Sword (have ${n}): mine purple veins, beat monsters`,
    buy: k => `Buy a Sword: ${k} · ${SWORD} stones`,
    map: k => `Open the map: ${k}`,
    pass: (nm, lv) => `Cross Pass 1 → M1: take the north gate, beat ${nm}` + (lv ? ` (aim for Lv ${lv})` : ''),
    kD: { talk: 'press E', out: 'press J', kill: 'left-click a monster', palm: 'press L facing a monster', bag: 'press I', vein: 'left-click a vein', ball: 'press E', buy: 'press O (Quick buy)', map: 'press M' },
    kT: { talk: 'tap A', out: 'tap Go', kill: 'walk up, tap A', palm: 'tap the Ki Palm button', bag: 'tap ☰', vein: 'stand next to it, tap A', ball: 'tap A', buy: '☰ → Quick buy', map: 'tap the Map button (scroll, top)' },
    tgt: { noxx: 'Noxx', go: 'Monster field', kill: 'Monster', palm: 'Monster', vein: 'Purple vein', catch: 'Wild beast', village: 'Back to Village', pass: 'Pass 1', m1: 'M1 gate' },
  },
};
const ST = { ctx: null, sv: null, kill: null, palmCd: 0, veins: null, veinMap: null, q: [], cur: null, log: [], obs: null, obsEl: null, cssOn: null };
const L = ctx => TX[isVi(ctx) ? 'vi' : 'en'];
const log = (ev, o) => { ST.log.push({ t: +(performance.now() / 1000).toFixed(1), ev, ...(o || {}) }); if (ST.log.length > 60) ST.log.shift(); };
const flags = sv => (sv && sv.flags) || {};
const touch = ctx => !!(ctx.touchA && ctx.touchA());
const keyOf = (ctx, k) => (touch(ctx) ? L(ctx).kT[k] : L(ctx).kD[k]);

/* ---------- trạng thái ---------- */
function roadOpen(sv) {
  const road = (sv.sys || {}).road || {}, won = road.won || {}, badges = sv.badges || [];
  return !!won.road1 || (road.maxZ || 0) >= 1 || badges.length > 0;
}
function sword(ctx) { try { return ctx.tool ? ctx.tool.tier('sword') : 0; } catch (e) { return 0; } }
function chData(ctx) { try { return ctx.chanthu && ctx.chanthu.ensure ? ctx.chanthu.ensure() : null; } catch (e) { return null; } }
function caught(ctx) { const d = chData(ctx); return d ? (d.caught | 0) : 0; }
function st(ctx) {
  const sv = ctx.S.save; if (!sv) return null; sv.sys = sv.sys || {};
  let s = sv.sys.nhapmon121;
  if (!s || typeof s !== 'object') {
    const f = flags(sv);
    if (!f.p120new) s = { v: 1, i: IDS.length, done: 1, old: 1 };   /* save cũ (trước Nhập môn) → không bắt chơi lại */
    else {
      s = { v: 1, i: 0, prog: 0, base: 0, done: 0, t0: Date.now() };
      if (roadOpen(sv) || (sv.zone && sv.zone !== 'village' && sv.zone !== 'road1')) { s.done = 1; s.i = IDS.length; s.old = 2; }
      else if (sword(ctx) >= 1) s.i = IX.map;
      else if (f.p120done) s.i = f.p120arr ? IX.out : IX.go;
    }
    sv.sys.nhapmon121 = s; log('init', { i: s.i, done: s.done, old: s.old || 0 });
  }
  return s;
}
/* c71-trogiup lyronflash121: hồi tưởng Lyron đang chờ phát → Nhập môn tạm ẩn (chưa hiện bước 1, không đếm) cho tới khi xem xong */
const hold = ctx => { try { const F = ctx.lyronFlash121; return !!(F && ((F.pending && F.pending()) || (F.open && F.open()) || ctx.S.mode === 'lf121')); } catch (e) { return false; } };
const isActive = ctx => { try { const s = st(ctx); return !!(s && !s.done); } catch (e) { return false; } };
const curId = s => IDS[Math.min(s.i, IDS.length - 1)];

/* ---------- dòng nhiệm vụ (thanh việc + bảng Nhiệm vụ) ---------- */
function stepText(ctx, s) {
  const t = L(ctx), id = curId(s), k = x => keyOf(ctx, x), sv = ctx.S.save, stone = (sv.inv || {}).stone || 0;
  switch (id) {
    case 'noxx': return t.noxx(k('talk'));
    case 'go': return t.go;
    case 'out': return t.out(k('out'));
    case 'kill': return t.kill(Math.min(s.prog | 0, KILL_N), k('kill'));
    case 'palm': return t.palm(k('palm'));
    case 'bag': return t.bag(k('bag'));
    case 'vein': return t.vein(Math.min(s.prog | 0, VEIN_N), k('vein'));
    case 'catch': { let near = false; try { near = !!ballInfo(ctx).near; } catch (e) { } return near ? t.catchNow(k('ball')) : t.catch(k('ball')); }
    case 'sword': return stone < SWORD ? t.gather(stone) : t.buy(k('buy'));
    case 'map': return t.map(k('map'));
    case 'pass': {
      const R = ROADS && ROADS[0], who = (R && R.who) || [], nm = who.map(id2 => (ctx.sparRoad && ctx.sparRoad.name ? ctx.sparRoad.name(id2) : id2)).join(isVi(ctx) ? ' rồi ' : ' then ');
      const hlv = ctx.hero ? ctx.hero.lv : 1; return t.pass(nm || 'Ca Rô', hlv < 2 ? 2 : 0);
    }
  }
  return '';
}
function line(ctx) {
  const s = st(ctx); if (!s || s.done) return null; if (s.i > 0 && hold(ctx)) return null; const t = L(ctx), id = curId(s);
  return (id === 'noxx' ? t.sec : t.tag(s.i)) + ' · ' + stepText(ctx, s);
}

/* ---------- mục tiêu cho mũi tên mép ---------- */
function monList(ctx) { try { return ctx.monsters && ctx.monsters.list ? ctx.monsters.list() : []; } catch (e) { return []; } }
function nearest(ctx, arr, pos) { const p = ctx.S.player; let b = null, bd = Infinity; for (const o of arr) { const q = pos(o); if (!q) continue; const d = Math.hypot(q.x - p.x, q.y - p.y); if (d < bd) { bd = d; b = o; } } return b; }
function farmSpot(ctx) {
  const f = flags(ctx.S.save); if (f.p120farm) return f.p120farm;
  return { x: 80 * TS, y: 92 * TS };   /* giữa Đồng Cỏ Bến Cảng (village88 REGIONS south: y 78…128) */
}
function target(ctx) {
  const s = st(ctx); if (!s || s.done || (s.i > 0 && hold(ctx))) return null; const S = ctx.S, t = L(ctx), id = curId(s), zid = S.zone && S.zone.id;
  if (id === 'pass') return { gotoZone: 'm1', name: /^road/.test(zid || '') ? t.tgt.m1 : t.tgt.pass };
  if (id === 'bag' || id === 'map' || id === 'out' || id === 'sword' && ((S.save.inv || {}).stone || 0) >= SWORD) return null;
  if (zid !== 'village') return { gotoZone: 'village', name: t.tgt.village };
  if (id === 'noxx') { const g = S.guide; return g ? { kind: 'npc', ref: g, glyph: true, name: t.tgt.noxx, pos: () => ({ x: g.x, y: g.y, top: g.y - 26 }) } : null; }
  if (id === 'go') { const q = farmSpot(ctx); return { kind: 'spot', ref: 'farm', name: t.tgt.go, pos: () => ({ x: q.x, y: q.y, top: q.y - 12 }) }; }
  if (id === 'kill' || id === 'palm') {
    const P = S.player, ok = mo => mo && mo.hp > 0 && mo.f6 && !mo.f6.lead && !mo.f6.ct && !FLY[mo.f6.key] && regionAt(Math.floor(mo.x / TS), Math.floor(mo.y / TS)).id === FARM;
    const mo = nearest(ctx, monList(ctx).filter(ok), o => o);
    if (mo) return { kind: 'mon', ref: mo, name: t.tgt[id], pos: () => ({ x: mo.x, y: mo.y, top: mo.y - 18 }) };
    if (!(P && regionAt(Math.floor(P.x / TS), Math.floor(P.y / TS)).id === FARM)) { const q = farmSpot(ctx); return { kind: 'spot', ref: 'farm', name: t.tgt.go, pos: () => ({ x: q.x, y: q.y, top: q.y - 12 }) }; }
    return null;
  }
  if (id === 'vein' || id === 'sword') {
    const o = nearest(ctx, (S.map.objects || []).filter(o => o.type === 'seisvein'), o => ({ x: o.x * TS + 8, y: o.y * TS + 12 }));
    return o ? { kind: 'obj', ref: o, name: t.tgt.vein, pos: () => ({ x: o.x * TS + 8, y: o.y * TS + 14, top: o.y * TS - 4 }) } : null;
  }
  if (id === 'catch') {
    const mo = nearest(ctx, monList(ctx).filter(mo => mo && mo.hp > 0 && mo.f6 && mo.f6.ct && !mo.f6.lead && !(ctx.b49Tier && !ctx.b49Tier(mo)) && regionAt(Math.floor(mo.x / TS), Math.floor(mo.y / TS)).id === FARM), o => o);
    return mo ? { kind: 'mon', ref: mo, name: t.tgt.catch, pos: () => ({ x: mo.x, y: mo.y, top: mo.y - 22 }) } : null;
  }
  return null;
}

/* ---------- xong bước → thưởng + banner ---------- */
function complete(ctx, s, why) {
  const id = curId(s), t = L(ctx), r = RW[id] || { s: 0, x: 0 }, n = s.i, rw = [];
  if (id !== 'noxx') {
    if (r.s > 0) { try { ctx.bag.add('stone', r.s); } catch (e) { } rw.push({ icon: itemRel('stone'), txt: `+${r.s} ${t.stones}` }); }
    if (r.x > 0) { try { if (ctx.hero && ctx.hero.gainXp) ctx.hero.gainXp(r.x); } catch (e) { } rw.push({ icon: null, txt: `+${r.x} XP` }); }
    const last = s.i >= NSTEP;
    ST.q.push({ title: last ? t.fin : t.title, name: `${t.tag(n)} · ${t.short[id]}`, rw, at: performance.now() });
    try { ctx.sfx && ctx.sfx('win'); } catch (e) { }
  }
  log('step', { id, why: why || '' });
  s.i++; s.prog = 0; s.base = 0; s.at = Date.now();
  if (s.i >= IDS.length) { s.done = 1; s.t1 = Date.now(); log('done'); }
  else enter(ctx, s);
  try { ctx.persist(); } catch (e) { }
}
function enter(ctx, s) {   /* mốc đầu bước (số đếm tính từ đây) */
  const id = curId(s);
  if (id === 'catch') s.base = caught(ctx);
  if (id === 'kill') ST.kill = null;
  if (id === 'palm') ST.palmCd = 0;
  if (id === 'vein') ST.veins = null;
}

/* ---------- kiểm từng khung ---------- */
function bagOpen() { try { return !!document.querySelector('#menu:not([hidden]) .mtab.on[data-tab="bag"]'); } catch (e) { return false; } }
function veinKeys(ctx) { const m = ctx.S.map, out = new Map(); for (const o of m.objects || []) if (o.type === 'seisvein') out.set(o.x + ',' + o.y, o); return out; }
function check(ctx, s) {
  const S = ctx.S, sv = S.save, f = flags(sv), id = curId(s), zid = S.zone && S.zone.id, P = S.player;
  if (roadOpen(sv)) { if (id === 'pass') complete(ctx, s, 'road'); else { s.i = IDS.length; s.done = 1; s.t1 = Date.now(); log('done', { why: 'road' }); try { ctx.persist(); } catch (e) { } } return; }
  switch (id) {
    case 'noxx': { let has = false; try { const d = ctx.chanthu && ctx.chanthu.data && ctx.chanthu.data(); has = !!(d && d.team && d.team.length); } catch (e) { } if (f.p120done || has) complete(ctx, s); return; }
    case 'go': if (f.p120arr || (zid === 'village' && P && regionAt(Math.floor(P.x / TS), Math.floor(P.y / TS)).id === FARM)) complete(ctx, s); return;
    case 'out': if (ctx.comp79 && ctx.comp79.out && ctx.comp79.out()) complete(ctx, s); return;
    case 'kill': {
      let k = 0; try { k = netStat().n.kill | 0; } catch (e) { return; }
      if (ST.kill == null || k < ST.kill) { ST.kill = k; return; }
      if (k > ST.kill) { s.prog = (s.prog | 0) + (k - ST.kill); ST.kill = k; try { ctx.persist(); } catch (e) { } }
      if (s.prog >= KILL_N) complete(ctx, s); return;
    }
    case 'palm': {
      if (!ctx.quyen || !ctx.quyen.palmSlot) { complete(ctx, s, 'noquyen'); return; }
      let cd = 0; try { cd = ctx.quyen.palmSlot().cd || 0; } catch (e) { }
      if (cd > ST.palmCd + 0.5) { ST.palmCd = cd; complete(ctx, s); return; }
      ST.palmCd = cd; return;
    }
    case 'bag': if (bagOpen()) complete(ctx, s); return;
    case 'vein': {
      if (zid !== 'village' || !P) { ST.veins = null; return; }
      const now = veinKeys(ctx);
      if (!ST.veins || ST.veinMap !== S.map) { ST.veins = now; ST.veinMap = S.map; }
      else {
        for (const [key, o] of ST.veins) if (!now.has(key) && Math.hypot(o.x * TS + 8 - P.x, o.y * TS + 12 - P.y) < 56) { s.prog = (s.prog | 0) + 1; log('vein', { key }); try { ctx.persist(); } catch (e) { } }
        ST.veins = now;
      }
      if (s.prog >= VEIN_N || (!now.size && (s.prog | 0) > 0)) complete(ctx, s, now.size ? '' : 'noveins');
      return;
    }
    case 'catch': {
      if (caught(ctx) > (s.base | 0)) { complete(ctx, s); return; }
      const d = chData(ctx); let near = false; try { near = !!ballInfo(ctx).near; } catch (e) { }
      if (d && (d.anThu | 0) <= 0 && !near && !(ctx.S.mode !== 'play')) { if (!s.noBallT) s.noBallT = Date.now(); else if (Date.now() - s.noBallT > 4000) { try { ctx.toast(L(ctx).noBall); } catch (e) { } complete(ctx, s, 'noball'); } }
      else s.noBallT = 0;
      return;
    }
    case 'sword': if (sword(ctx) >= 1) complete(ctx, s); return;
    case 'map': if (S.mode === 'map') complete(ctx, s); return;
    case 'pass': return;   /* roadOpen ở trên */
  }
}

/* ---------- HUD: CSS (thanh việc xuống dòng, ẩn dòng mâu thuẫn khi Nhập môn) ---------- */
function css() {
  if (typeof document === 'undefined' || document.getElementById('nm121-css')) return;
  const e = document.createElement('style'); e.id = 'nm121-css';
  e.textContent = `#h-next{white-space:normal!important;text-overflow:clip!important;overflow:visible!important;max-width:min(430px,calc(100vw - 250px))!important;line-height:1.05!important}
body.nm121 #h-story,body.nm121 #h-quest,body.nm121 #h-task{display:none!important}
@media (pointer:coarse){#h-next{max-width:calc(100vw - 170px)!important}}
#nm121q .mq.nm-dim{opacity:.55}`;
  document.head.appendChild(e);
}
function bodyClass(on) { if (typeof document === 'undefined' || !document.body) return; if (ST.cssOn === on) return; ST.cssOn = on; document.body.classList.toggle('nm121', on); }

/* ---------- bảng Nhiệm vụ (menu.js): chèn mục Nhập môn khi thẻ Nhiệm vụ đang mở ---------- */
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function menuPatch() {
  const ctx = ST.ctx; if (!ctx || typeof document === 'undefined') return;
  const el = document.getElementById('menu'); if (!el || el.hidden) return;
  if (!el.querySelector('.mtab.on[data-tab="quest"]')) return;
  const body = el.querySelector('.mbody'); if (!body) return;
  const s = st(ctx); if (!s || s.done) return;
  if (body.querySelector('#nm121q')) return;
  const t = L(ctx), icon = cls => { const q = body.querySelector(`.mq.${cls} .qs`); return q ? q.innerHTML : (cls === 'done' ? '✓' : cls === 'now' ? '▶' : '?'); };
  const icDone = icon('done'), icNow = icon('now'), icLock = icon('locked');
  for (const r of body.querySelectorAll('.mq.now')) {   /* cốt truyện khác: chờ sau Nhập môn (một mục tiêu duy nhất) */
    r.classList.remove('now'); r.classList.add('locked'); const q = r.querySelector('.qs'); if (q) q.innerHTML = icLock;
    const h = r.querySelector('.mhint'); if (h) h.textContent = t.after;
  }
  const rows = IDS.slice(1).map((id, k) => {
    const n = k + 1, state = n < s.i ? 'done' : n === s.i ? 'now' : 'locked';
    const txt = state === 'now' ? esc(stepText(ctx, s)) : state === 'done' ? '' : '';
    return `<div class="mq ${state}${state === 'locked' ? ' nm-dim' : ''}"><span class="qs">${state === 'done' ? icDone : state === 'now' ? icNow : icLock}</span><span style="flex:1;min-width:0"><b>${esc(t.tag(n))} · ${esc(t.short[id])}</b>${txt ? `<div class="mhint">${txt}</div>` : ''}</span></div>`;
  }).join('');
  const pre = s.i === 0 ? `<div class="mq now"><span class="qs">${icNow}</span><span style="flex:1;min-width:0"><b>${esc(t.short.noxx)}</b><div class="mhint">${esc(stepText(ctx, s))}</div></span></div>` : '';
  const sec = document.createElement('div'); sec.id = 'nm121q'; sec.innerHTML = `<h3>${esc(t.sec)} · ${Math.max(0, s.i - 1)}/${NSTEP}</h3>${pre}${rows}`;
  body.insertBefore(sec, body.firstChild);
}
function menuWatch() {
  if (typeof document === 'undefined' || typeof MutationObserver === 'undefined') return;
  const el = document.getElementById('menu'); if (!el || ST.obsEl === el) return;
  if (ST.obs) ST.obs.disconnect();
  ST.obsEl = el; ST.obs = new MutationObserver(() => { try { ST.obs.disconnect(); menuPatch(); } catch (e) { } finally { ST.obs.observe(el, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden'] }); } });
  ST.obs.observe(el, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden'] });
}

/* ---------- banner (giống questbanner120: ruy băng đỏ + khung giấy + hàng thưởng) ---------- */
function domShown(id) { const e = document.getElementById(id); if (!e || e.hidden) return false; const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).display !== 'none' && getComputedStyle(e).visibility !== 'hidden'; }
function otherBanner() {   /* banner khác đang hiện (lời nhờ / vào vùng / dải đỏ to của core 'Thắng …') → chờ, không chồng chữ */
  try { return !!((window.__qb120 && window.__qb120.state().cur) || (window.__zb120 && window.__zb120.state().ban) || domShown('px-banner') || (domShown('toast') && document.getElementById('toast').className === 'big')); } catch (e) { return false; }
}
function drawBanner(ug, ctx, scale) {
  const B = ST.cur; if (!B) return;
  const t = B.t, a = t < T_IN ? t / T_IN : t > T_ALL - T_OUT ? Math.max(0, (T_ALL - t) / T_OUT) : 1; if (a <= 0) return;
  const W = ug.canvas.width, H = ug.canvas.height, s = uiS(ctx, scale);
  const fT = Math.max(18, Math.round(s * 6.2)), fN = Math.max(14, Math.round(s * 4.6)), fR = Math.max(13, Math.round(s * 4.2)), ic = Math.max(16, Math.round(s * 6));
  ug.save(); ug.globalAlpha = a; ug.imageSmoothingEnabled = false; ug.textBaseline = 'middle';
  ug.font = `bold ${fT}px VT323, monospace`; const wT = ug.measureText(B.title).width;
  ug.font = `${fN}px VT323, monospace`; const name = B.name, wN = ug.measureText(name).width;
  ug.font = `${fR}px VT323, monospace`; const gap = 6 * s, items = B.rw.map(r => ({ ...r, w: (r.icon ? ic + 3 * s : 0) + ug.measureText(r.txt).width }));
  const wR = items.reduce((v, r) => v + r.w, 0) + gap * Math.max(0, items.length - 1);
  const rbH = Math.round(fT + 7 * s), rbW = Math.round(Math.min(W - 8, Math.max(wT + 34 * s, 90 * s)));
  const pw = Math.round(Math.min(W - 16, Math.max(wN, wR, rbW - 16 * s) + 22 * s)), ph = Math.round(rbH * 0.38 + fN + (items.length ? ic + 2 * s : 0) + 13 * s);
  const top = bannerTop(W, H, s), y = Math.round(top - (1 - Math.min(1, t / T_IN)) * 8 * s), cxm = Math.round(W / 2), py = y + Math.round(rbH * 0.62);
  paper(ug, cxm - pw / 2, py, pw, ph, s);
  const rib = img('ui/npick/banner.png');
  if (rib) { const k = rbH / 27, c = 24, ck = Math.round(c * k), x0 = Math.round(cxm - rbW / 2);
    ug.drawImage(rib, 0, 0, c, 27, x0, y, ck, rbH); ug.drawImage(rib, c, 0, rib.width - 2 * c, 27, x0 + ck, y, rbW - 2 * ck, rbH); ug.drawImage(rib, rib.width - c, 0, c, 27, x0 + rbW - ck, y, ck, rbH); }
  else { ug.fillStyle = '#a8121c'; ug.fillRect(cxm - rbW / 2, y, rbW, rbH); }
  ug.textAlign = 'center';
  sh(ug, B.title, cxm, y + rbH / 2, '#fff3c8', `bold ${fT}px VT323, monospace`, '#4a0a0e');
  const ny = py + Math.round(rbH * 0.38) + Math.round(3 * s) + fN / 2;
  sh(ug, name, cxm, ny, '#3b2412', `${fN}px VT323, monospace`, 'rgba(255,240,200,.6)');
  if (items.length) {
    let x = Math.round(cxm - wR / 2); const ry = Math.round(ny + fN / 2 + 2 * s + ic / 2); ug.textAlign = 'left';
    for (const r of items) {
      if (r.icon) { const im = img(r.icon); if (im) ug.drawImage(im, 0, 0, im.width, im.height, x, Math.round(ry - ic / 2), ic, ic); x += ic + 3 * s; }
      sh(ug, r.txt, x, ry + 1, '#5a3a18', `bold ${fR}px VT323, monospace`, 'rgba(255,240,200,.6)');
      x += ug.measureText(r.txt).width + gap;
    }
  }
  ug.restore();
}

export const nhapmon121 = {
  id: 'nhapmon121',
  always: true,
  onZoneEnter(ctx) {
    ST.ctx = ctx; ST.veins = null; ST.kill = null; css(); img('ui/npick/banner.png'); img('ui/hud91/tframe.png'); const ir = itemRel('stone'); if (ir) img(ir);
    ctx.nhapmon121 = { active: () => isActive(ctx), line: () => line(ctx), target: () => target(ctx), step: () => { const s = st(ctx); return s ? { id: curId(s), i: s.i, done: !!s.done } : null; }, banner: () => !!ST.cur };
    if (typeof window !== 'undefined') window.__nm121 = {
      state: () => { const s = st(ctx); return s ? { ...s, id: curId(s), line: line(ctx), tgt: (() => { const g = target(ctx); if (!g) return null; const p = g.pos && g.pos(); return { name: g.name, kind: g.kind || null, gotoZone: g.gotoZone || null, x: p && Math.round(p.x), y: p && Math.round(p.y) }; })(), q: ST.q.length, cur: ST.cur && { title: ST.cur.title, name: ST.cur.name }, log: ST.log.slice(-30) } : null; },
      skip: () => { const s = st(ctx); if (s && !s.done) complete(ctx, s, 'skip'); return s && curId(s); },
      set: i => { const s = st(ctx); if (!s) return null; s.i = Math.max(0, Math.min(IDS.length, i | 0)); s.done = s.i >= IDS.length ? 1 : 0; s.prog = 0; enter(ctx, s); ctx.persist(); return curId(s); },
      banner: () => { ST.q.push({ title: L(ctx).title, name: `${L(ctx).tag(3)} · ${L(ctx).short.kill}`, rw: [{ icon: itemRel('stone'), txt: `+4 ${L(ctx).stones}` }, { icon: null, txt: '+10 XP' }] }); return true; },
    };
    if (ctx.S.save) st(ctx);
  },
  update(dt, ctx) {
    const sv = ctx.S.save; if (!sv) return;
    if (sv !== ST.sv) { ST.sv = sv; ST.q.length = 0; ST.cur = null; ST.kill = null; ST.veins = null; }
    menuWatch();
    const s = st(ctx); if (!s) return;
    bodyClass(!s.done && ctx.S.mode !== 'title');
    if (!s.done && ctx.S.mode !== 'title' && !(s.i > 0 && hold(ctx))) { try { check(ctx, s); } catch (e) { console.error('nhapmon121', e); } }
    if (ctx.S.mode === 'title') return;
    if (!ST.cur && ST.q.length && performance.now() - (ST.q[0].at || 0) > 450 && !otherBanner()) ST.cur = { ...ST.q.shift(), t: 0 };   /* chờ ~0,45 s: dải đỏ của core (nếu có) hiện trước thì nhường */
    if (ST.cur) { ST.cur.t += dt; if (ST.cur.t > T_ALL) ST.cur = null; }
  },
  drawUI(ug, ctx, cx, cy, scale) { if (!ST.cur || ctx.S.mode === 'title') return; try { drawBanner(ug, ctx, scale); } catch (e) { } },
};
