/* autofarm50.js — c50-autofarm (anh 05/11): PHIẾU TẬP LUYỆN TỰ ĐỘNG.
   · Heathcliff thứ hai đứng ở Quảng Trường Làng (cạnh Thương nhân, không chắn lối) — Heathcliff ở bến cảng Biển giữ nguyên (cốt truyện, viên thở, sách Rocky).
     Bấm / E → hội thoại ngắn → quầy bán "Phiếu Tập Luyện Tự Động" (10 đá Seismic).
   · Dùng phiếu (nút nhỏ trên HUD, hoặc "Dùng ngay" trong quầy) → 15 phút giờ thật TỰ FARM ở Làng; dùng thêm khi đang chạy → cộng dồn.
       - tự thả cả đội Chấn Thú (squad104), đặt đội 'Tấn công tự do' (hết giờ trả lại chế độ cũ);
       - tự tìm quái thường / Chấn Thú hoang gần nhất của bãi farm (farm106), tìm đường né nước + lối ra vùng, tới gần thì dùng đúng đường click quái
         (monsters.onClick → tự đuổi + chém); đủ Ki + hết hồi thì tung Chưởng (ctx.quyen.press); con này chết → con kế, hết quanh đây → bầy kế;
       - KHÔNG đánh thủ lĩnh (an toàn, tránh ngất), KHÔNG tự ném Ấn Thu, KHÔNG xuống nước, không đi tới lối ra vùng, không đánh người chơi khác;
       - người chơi bấm phím đi / chạm cần / click → tạm dừng 5 s rồi tự tiếp; nút ⏸ (dừng tay) và ✕ (tắt, giữ thời gian còn lại) trên HUD;
       - ngất / đang hội thoại / menu / đấu → tự chờ.
   · Tăng tốc ×1,5 khi phiếu đang chạy: KHÔNG ghi p.speedMul (luật 14/10). Cách làm: hệ chạy ngay sau player.update cùng khung;
     lấy quãng người chơi vừa tự đi trong khung (chỉ khi p.moving, không đang lộn / lướt Ki, không bị hất) rồi cho đi thêm 0,5 lần quãng đó
     bằng p.tryMove (đúng luật va chạm). Không lưu-rồi-trả bất kỳ thuộc tính nào → không thể kẹt tốc độ sau khi tắt.
   · Thời gian lưu ở save.sys.af50.left (giây); chỉ trừ khi game đang chạy (tắt game thì dừng đếm).
   · Móc test: window.__af50. */
import { ART } from '../art.js';
import { ITEMS } from '../items.js';

const TS = 16, ID = 'auto_ticket', PRICE = 10, DUR = 15 * 60, SPD = 1.5, PAUSE = 5, NEAR = 110, HC_KEY = 'heathcliff';
const CF = { lead: false, scan: 0.5, path: 1.0, click: 0.5, exitR: 4, maxD: 900 };
ITEMS[ID] = { icon: '🎫', name: { en: 'Auto-Training Ticket', vi: 'Phiếu Tập Luyện Tự Động' }, w: 0.05, tags: ['ticket'],
  desc: { vi: 'Phiếu của Heathcliff (Quảng Trường Làng, 10 đá). Dùng → 15 phút tự farm ở Làng: tự thả đội Chấn Thú, tự tìm và đánh quái / Chấn Thú hoang, đi nhanh ×1,5. Dùng thêm để cộng dồn giờ.',
    en: "Heathcliff's ticket (Village Square, 10 stone). Use it for 15 minutes of auto-farming in the Village: releases your Seismic Beasts, hunts monsters and wild beasts for you, ×1.5 move speed. Stacks." } };

const vi = ctx => !ctx.lang || ctx.lang() !== 'en';
const L = ctx => (vi(ctx) ? {
  talk: '💬 Heathcliff', title: 'Heathcliff · Phiếu tập luyện', lead: 'Bận việc mà vẫn muốn mạnh lên? Một phiếu = 15 phút tự luyện ở bãi quái Làng.',
  first: ['Chào! Tôi là Heathcliff — CM của Seismic. Hôm nay tôi lên Làng mở quầy riêng.', 'Phiếu Tập Luyện Tự Động: 15 phút đội Chấn Thú và bạn tự đi săn quái quanh Làng, chân còn nhanh hơn. Chỉ 10 đá Seismic!'],
  again: ['Lại cần phiếu à? Bãi quái Làng hồi sinh nhanh lắm.', 'Quái hồi sinh chỉ sau ~15 giây — cứ luyện thoải mái.'],
  buy: 'Mua', use: 'Dùng ngay', close: 'Đóng', poor: 'Không đủ đá Seismic (cần 10)', bought: 'Đã mua Phiếu Tập Luyện Tự Động', have: n => `Đang có ×${n}`,
  on: m => `Tự farm bật · ${m} phút`, add: m => `+${m} phút tự farm`, end: 'Hết giờ tự farm', off: 'Đã tắt tự farm (giữ thời gian còn lại)', resume: 'Tiếp tục tự farm',
  run: 'Tự farm', wait: 'Tạm dừng', hand: 'Dừng tay', away: 'Chỉ chạy ở Làng', faint: 'Đang ngất', noneT: 'Không còn phiếu — mua ở Heathcliff (Quảng Trường Làng)',
  useBtn: n => `Dùng phiếu ×${n}`, contBtn: 'Tiếp tục', tipP: 'Dừng / tiếp', tipX: 'Tắt (giữ giờ còn lại)', desc: '15 phút tự farm ở Làng · đi nhanh ×1,5 · cộng dồn',
} : {
  talk: '💬 Heathcliff', title: 'Heathcliff · Training tickets', lead: 'Busy but still want to grow? One ticket = 15 minutes of auto-training at the Village hunting grounds.',
  first: ["Hi! I'm Heathcliff — Seismic's CM. Today I've opened a stall in the Village.", 'Auto-Training Ticket: for 15 minutes you and your beasts hunt around the Village on your own, and you move faster. Only 10 Seismic stone!'],
  again: ['Need another ticket? The Village grounds respawn fast.', 'Monsters come back in ~15 seconds — train all you like.'],
  buy: 'Buy', use: 'Use now', close: 'Close', poor: 'Not enough Seismic stone (need 10)', bought: 'Bought an Auto-Training Ticket', have: n => `You have ×${n}`,
  on: m => `Auto-farm on · ${m} min`, add: m => `+${m} min auto-farm`, end: 'Auto-farm time is up', off: 'Auto-farm off (time kept)', resume: 'Auto-farm resumed',
  run: 'Auto-farm', wait: 'Paused', hand: 'On hold', away: 'Village only', faint: 'Fainted', noneT: 'No tickets — buy from Heathcliff (Village Square)',
  useBtn: n => `Use ticket ×${n}`, contBtn: 'Resume', tipP: 'Hold / resume', tipX: 'Turn off (keeps time)', desc: '15 min auto-farm in the Village · ×1.5 speed · stacks',
});

const ST = { ctx: null, hc: null, placed: false, shopEl: null, hud: null, sig: '', hudT: 0, tg: null, scanT: 0, pathT: 0, clickT: 0, skip: new Map(), pauseT: 0,
  lp: null, lastNow: 0, ours: null, log: [], n: { kill: 0, tg: 0, click: 0, palm: 0, path: 0, nopath: 0, pause: 0, boost: 0, boostPx: 0, buy: 0, use: 0, release: 0 }, tried: new Set(), relT: 0, exits: null, exitZ: null };
const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
const log = o => { ST.log.push({ t: Math.round(now() / 100) / 10, ...o }); if (ST.log.length > 300) ST.log.shift(); };
const sv = ctx => { const s = ctx.S.save; s.sys = s.sys || {}; const a = s.sys.af50 || (s.sys.af50 = { left: 0, on: false, hand: false, mode0: null, met: false, talks: 0 }); return a; };
const inv = ctx => ctx.S.save.inv || (ctx.S.save.inv = {});
const count = ctx => (ctx.bag && ctx.bag.count ? ctx.bag.count(ID) : (inv(ctx)[ID] || 0));
const inVillage = ctx => ctx.S.zone && ctx.S.zone.id === 'village';
/* icon: TẠM dùng ảnh PixelLab sẵn có 'trenchmap' (cuộn giấy) — máy chưa có token PixelLab. Có token: chạy _gen/px-ticket.py gen → pick <seed>
   rồi đổi ICON thành 'ui/items/auto_ticket.png' (không dò file lúc chạy — dò 404 là lỗi trang). */
const ICON = 'ui/items/trenchmap.png';
const iconSrc = () => 'assets/px/' + ICON;
const mmss = s => { s = Math.max(0, Math.ceil(s)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
const P = ctx => ctx.S.player;

function regIcon() { try { const u = ART.man && ART.man.ui; if (u && u.items && u.items[ID] !== ICON) u.items[ID] = ICON; } catch (e) { } }

/* ---------------- Heathcliff ở Làng ---------------- */
function hcSheet(ctx) { return ctx.charSheetOf(ART.fixed && ART.fixed[HC_KEY] ? { hero: HC_KEY } : { shirt: '#3b3550', pants: '#2a2633', hair: '#1f1a20' }); }
function hcPortrait() { const f = ART.man && ART.man.ui && ART.man.ui.port_heathcliff; return typeof f === 'string' ? 'assets/px/' + f : null; }
function freeT(ctx, x, y) { const m = ctx.S.map; return x > 1 && y > 1 && x < m.w - 1 && y < m.h - 1 && !ctx.isSolid(m, x, y) && !(ctx.hasObjectAt && ctx.hasObjectAt(m, x, y)); }
function placeHc(ctx) {
  ST.hc = null; const S = ctx.S, m = S.map; if (!m || !inVillage(ctx) || !ctx.NPC || !ctx.charSheetOf) return;
  /* phía TÂY quảng trường đá (Làng v88: plaza tâm (80,62)) — tránh miệng đường đất phía nam / bắc; cách NPC khác ≥ 3 ô; 8 ô quanh đều trống → không chắn lối */
  const c = m.v88 && m.v88.plaza ? { x: m.v88.plaza.x, y: m.v88.plaza.y } : { x: Math.floor(P(ctx).x / TS), y: Math.floor(P(ctx).y / TS) };
  const others = (S.staff || []).concat(ctx.allNpcs ? ctx.allNpcs() : []); let at = null;
  for (const [dx, dy] of [[-7, -2], [-7, -1], [-8, -2], [-6, -3], [-7, 0], [-8, 0], [7, -2], [7, -1], [-6, -4], [6, -3]]) {
    const x = c.x + dx, y = c.y + dy; if (!freeT(ctx, x, y)) continue;
    let ok = true; for (let ax = -1; ax <= 1 && ok; ax++) for (let ay = -1; ay <= 1; ay++) if (!freeT(ctx, x + ax, y + ay)) { ok = false; break; }
    if (ok && others.some(n => Math.abs(n.x - (x * TS + 8)) < 3 * TS && Math.abs(n.y - (y * TS + 14)) < 3 * TS)) ok = false;
    if (ok) { at = { x, y }; break; }
  }
  if (!at) return;
  const n = new ctx.NPC({ staff: 'heathcliff50', n: 'Heathcliff', tag: 'Heathcliff · CM' }, at.x * TS + 8, at.y * TS + 14, hcSheet(ctx), () => 0.5);
  n.busy = false; n.radius = 10; n.staffStill = true; n.rng = Math.random; n.dir = 0;
  ST.hc = n; (S.staff ||= []).push(n); log({ ev: 'hc', x: at.x, y: at.y });
}
function hcDialog(ctx, pages, onClose) {
  ctx.setMode('dialog');
  ctx.openDialog({ m: { n: 'Heathcliff · CM', k: 'Heathcliff · CM', id: 'heathcliff', friend: true, a: hcPortrait() || undefined, title: { vi: 'CM của Seismic · phiếu tập luyện', en: 'Seismic CM · training tickets' }, ro: [] }, pages, onClose: () => { ctx.setMode('play'); if (onClose) onClose(); } });
}
function talkHc(ctx) {
  const a = sv(ctx), t = L(ctx), p = P(ctx); if (ST.hc) { try { p.faceTo(ST.hc.x, ST.hc.y); ST.hc.faceTo(p.x, p.y); } catch (e) { } }
  const pages = a.met ? [t.again[(a.talks = (a.talks || 0) + 1) % t.again.length]] : t.first; a.met = true; ctx.persist();
  hcDialog(ctx, pages, () => openShop(ctx));
}

/* ---------------- quầy ---------------- */
const BS = 'width:auto;margin:0 0 0 4px;padding:6px 10px;font-size:13px';
function renderShop(ctx) {
  const t = L(ctx), st = inv(ctx).stone || 0, can = st >= PRICE, n = count(ctx), port = hcPortrait(), nm = ITEMS[ID].name[vi(ctx) ? 'vi' : 'en'];
  const html = `<h2>${t.title}<span class="chip">🪨 ${st}</span></h2>
    <div class="shopw"><div class="shop-side"><div class="shop-port">${port ? `<img src="${port}" alt="">` : `<img src="${iconSrc()}" alt="" style="image-rendering:pixelated">`}</div><p class="shop-say">${t.lead}</p></div>
    <div class="scroll shop-main"><div class="hrow"><span class="hwho"><img src="${iconSrc()}" alt="" style="width:32px;height:32px;image-rendering:pixelated;vertical-align:middle"> <b>${nm}</b> <span class="chip">${PRICE} 🪨</span></span>`
    + `<span class="hnum"><b>×${n}</b></span><button class="btn primary" data-af="buy" style="${BS}${can ? '' : ';opacity:.35;cursor:default'}"${can ? '' : ' disabled'}>${t.buy}</button>`
    + `<button class="btn" data-af="use" style="${BS}${n ? '' : ';opacity:.35;cursor:default'}"${n ? '' : ' disabled'}>${t.use}</button></div>
    <p class="dim" style="margin:8px 0 2px">${t.desc}</p><p class="dim" style="margin:4px 0 4px">${t.have(n)}${sv(ctx).left > 0 ? ' · ⏱ ' + mmss(sv(ctx).left) : ''}</p></div></div>
    <button class="btn" id="af-close">${t.close}</button>`;
  const el = ctx.panel('af50shop', html); ST.shopEl = el; el.panel.classList.add('wide', 'shop'); el.hidden = false;
  el.querySelector('#af-close').onclick = () => closeShop(ctx);
  const b1 = el.querySelector('[data-af=buy]'); if (b1) b1.onclick = () => buy(ctx);
  const b2 = el.querySelector('[data-af=use]'); if (b2) b2.onclick = () => { if (useTicket(ctx)) closeShop(ctx); };
}
function openShop(ctx) { ctx.setMode('af50shop'); if (ctx.registerCloser) ctx.registerCloser('af50shop', () => closeShop(ctx)); renderShop(ctx); }
function closeShop(ctx) { if (ST.shopEl) ST.shopEl.hidden = true; if (ctx.S.mode === 'af50shop') ctx.setMode('play'); }
function buy(ctx) {
  const t = L(ctx), I = inv(ctx); if ((I.stone || 0) < PRICE) { ctx.toast(t.poor); try { ctx.sfx('poor'); } catch (e) { } return false; }
  I.stone -= PRICE; ctx.bag.add(ID, 1); ST.n.buy++; log({ ev: 'buy', stone: I.stone });
  ctx.persist(); try { ctx.sfx('buy'); } catch (e) { } ctx.toast(t.bought); if (ST.shopEl && !ST.shopEl.hidden) renderShop(ctx); return true;
}

/* ---------------- bật / tắt ---------------- */
function squadMode(ctx) { try { const k = ctx.S.save.sys.p104; return k ? k.mode : null; } catch (e) { return null; } }
function useTicket(ctx) {
  const t = L(ctx), a = sv(ctx); if (count(ctx) <= 0 || !ctx.bag.has(ID, 1)) { ctx.toast(t.noneT); return false; }
  ctx.bag.remove(ID, 1); const was = a.on && a.left > 0; a.left = (a.left > 0 ? a.left : 0) + DUR; ST.n.use++;
  if (!a.on) start(ctx); ctx.toast(was ? t.add(15) : t.on(Math.round(a.left / 60))); try { ctx.sfx('buy'); } catch (e) { }
  log({ ev: 'use', left: Math.round(a.left) }); ctx.persist(); ST.sig = ''; return true;
}
function start(ctx) {
  const a = sv(ctx); a.on = true; a.hand = false; ST.tried.clear(); ST.relT = 0; ST.tg = null; ST.pauseT = 0; ST.lastNow = now();
  if (a.mode0 == null) { a.mode0 = squadMode(ctx) || 'guard'; try { if (window.__sq) window.__sq.mode('free'); } catch (e) { } }
  log({ ev: 'start', left: Math.round(a.left) });
}
function stop(ctx, why) {
  const a = sv(ctx), t = L(ctx); a.on = false; a.hand = false; dropTarget(ctx);
  if (a.mode0 != null) { try { if (window.__sq) window.__sq.mode(a.mode0); } catch (e) { } a.mode0 = null; }
  if (why === 'end') { a.left = 0; ctx.toast(t.end); try { ctx.sfx('pickup'); } catch (e) { } } else if (why === 'off') ctx.toast(t.off);
  log({ ev: 'stop', why, left: Math.round(a.left) }); ctx.persist(); ST.sig = '';
}
function resume(ctx) { const a = sv(ctx); if (a.left <= 0) return false; start(ctx); ctx.toast(L(ctx).resume); ctx.persist(); ST.sig = ''; return true; }
function dropTarget(ctx) { const p = P(ctx); if (p && ST.ours && p.autoPath === ST.ours) p.autoPath = null; ST.ours = null; ST.tg = null; }

/* ---------------- tự farm ---------------- */
function isWater(ctx, x, y) { try { const m = ctx.S.map, g = ctx.getG(m, x, y); return g === ctx.T.WATER || g === ctx.T.DEEP; } catch (e) { return false; } }
function exitsOf(ctx) {
  const m = ctx.S.map; if (ST.exitZ === m) return ST.exits; const out = [];
  const add = o => { if (o && typeof o.x === 'number' && typeof o.y === 'number') { const big = o.x > m.w + 2 || o.y > m.h + 2; out.push(big ? { x: Math.floor(o.x / TS), y: Math.floor(o.y / TS) } : { x: o.x | 0, y: o.y | 0 }); } };
  try { const E = m.entries; if (Array.isArray(E)) E.forEach(add); else if (E) for (const k in E) { const v = E[k]; if (Array.isArray(v)) v.forEach(add); else add(v); } } catch (e) { }
  try { for (const g of (m.gates || m.exits || [])) add(g); } catch (e) { }
  ST.exits = out; ST.exitZ = m; return out;
}
const nearExit = (ctx, tx, ty, r) => exitsOf(ctx).some(e => Math.abs(e.x - tx) <= r && Math.abs(e.y - ty) <= r);
function solid(ctx) { return (m, x, y) => ctx.isSolid(m, x, y) || isWater(ctx, x, y) || nearExit(ctx, x, y, CF.exitR); }
const alive = o => o && o.hp > 0 && !o.dead && !o.__dying;
function pickTarget(ctx) {
  const p = P(ctx), L0 = (ctx.monsters && ctx.monsters.list ? ctx.monsters.list() : []), tnow = now(); let best = null, bd = 1e9;
  for (const o of L0) {
    const F = o.f6; if (!F || !alive(o)) continue; if (F.lead && !CF.lead) continue; if (F.rid === 'sky49') continue;   /* c49: quái trên trời — người chơi dưới đất không đánh tới */
    if ((ST.skip.get(o) || 0) > tnow) continue; const tx = Math.floor(o.x / TS), ty = Math.floor(o.y / TS);
    if (isWater(ctx, tx, ty) || nearExit(ctx, tx, ty, CF.exitR + 1)) continue;
    const d = Math.hypot(o.x - p.x, o.y - p.y) + (F.mode === 'angry' ? -60 : 0) + (F.ct ? -10 : 0); if (d > CF.maxD) continue;
    if (d < bd) { bd = d; best = o; }
  }
  return best;
}
function walkTo(ctx, o) {
  const p = P(ctx), path = ctx.pathTo(Math.floor(p.x / TS), Math.floor(p.y / TS), Math.floor(o.x / TS), Math.floor(o.y / TS), 16, solid(ctx));
  if (!path) { ST.n.nopath++; ST.skip.set(o, now() + 30000); ST.tg = null; ST.scanT = 1.2; log({ ev: 'nopath', id: o.id }); return false; }   /* không tới được: bỏ con này 30 s, chờ 1,2 s mới dò con khác (tránh dò đường dồn dập) */
  if (path.length) path[path.length - 1] = { x: o.x, y: o.y + 2 }; else path.push({ x: o.x, y: o.y + 2 });
  p.autoPath = path; p.autoStuck = 0; ST.ours = path; ST.n.path++; return true;
}
function monSys(ctx) { return ctx.S.sys.find(s => s.id === 'monsters'); }
function farmTick(ctx, dt) {
  const p = P(ctx); ST.scanT -= dt; ST.pathT -= dt; ST.clickT -= dt; ST.relT -= dt;
  if (ST.relT <= 0) { ST.relT = 3; release(ctx); }
  if (ST.tg && !alive(ST.tg)) { ST.n.kill++; log({ ev: 'kill', id: ST.tg.id, sp: ST.tg.f6 && (ST.tg.f6.sp || ST.tg.f6.key) }); ST.tg = null; ST.scanT = 0; }
  if (ST.tg && ctx.monsters.list && !ctx.monsters.list().includes(ST.tg)) { ST.tg = null; ST.scanT = 0; }
  if (!ST.tg && ST.scanT <= 0) { ST.scanT = CF.scan; const o = pickTarget(ctx); if (o) { ST.tg = o; ST.n.tg++; ST.pathT = 0; ST.clickT = 0; log({ ev: 'tg', id: o.id, sp: o.f6.sp || o.f6.key, lv: o.f6.lv, d: Math.round(Math.hypot(o.x - p.x, o.y - p.y)) }); try { if (window.__sq) window.__sq.lock(o); } catch (e) { } } }
  const o = ST.tg; if (!o) return;
  const d = Math.hypot(o.x - p.x, o.y - p.y);
  if (d > NEAR) { if (ST.pathT <= 0 || !p.autoPath) { ST.pathT = CF.path; walkTo(ctx, o); } return; }
  if (ST.ours && p.autoPath === ST.ours) { p.autoPath = null; ST.ours = null; }
  if (ST.clickT <= 0) { ST.clickT = CF.click; const ms = monSys(ctx); try { if (ms && ms.onClick && ms.onClick(ctx, { wx: o.x, wy: o.y - 4, tx: Math.floor(o.x / TS), ty: Math.floor(o.y / TS) })) ST.n.click++; } catch (e) { console.error('af50 click', e); } }
  if (d < 72 && ctx.quyen && ctx.quyen.on && ctx.quyen.on() && ctx.quyen.palmSlot) {
    try { const s = ctx.quyen.palmSlot(); if (s && s.cd <= 0 && !s.dim) { try { p.faceTo(o.x, o.y); } catch (e) { } try { if (window.__sq) window.__sq.lock(o); } catch (e) { } ctx.quyen.press(); ST.n.palm++; log({ ev: 'palm', id: o.id }); } } catch (e) { }
  }
}
function release(ctx) {   /* thả cả đội (squad104): mỗi lượt 1 con, mỗi con thử 1 lần / lần bật */
  try {
    const sq = window.__sq; if (!sq || !sq.toggle) return; const s = ctx.S.save.sys || {}, k = s.p104, d = ctx.chanthu && ctx.chanthu.ensure ? ctx.chanthu.ensure() : s.chanthu, tm = (d && d.team) || [];
    const out = (k && k.out) || []; if (out.length >= 6) return;
    const m = tm.find(u => !out.includes(u.id) && !ST.tried.has(u.id)); if (!m) return; ST.tried.add(m.id);
    if (sq.toggle(m.id)) { ST.n.release++; log({ ev: 'release', id: m.id, sp: m.sp }); }
  } catch (e) { }
}
function boost(ctx) {   /* đi nhanh ×1,5: đi thêm 0,5 lần quãng vừa tự đi trong khung (không đụng speedMul) */
  const p = P(ctx); if (!p) return; const lp = ST.lp; ST.lp = { x: p.x, y: p.y, z: ctx.S.map };
  if (!lp || lp.z !== ctx.S.map || ctx.S.mode !== 'play' || !p.moving || p.custom || p.ghost) return;
  if (ctx.ki && ctx.ki.busy && ctx.ki.busy()) return; if (p.kb || p.knock || p.flyT > 0) return;
  const dx = p.x - lp.x, dy = p.y - lp.y, d = Math.hypot(dx, dy); if (d < 0.05 || d > 6) return;
  const others = (ctx.allNpcs ? ctx.allNpcs() : []).concat(ctx.S.staff || []);
  const x0 = p.x, y0 = p.y; p.tryMove(dx * (SPD - 1), dy * (SPD - 1), ctx.S.map, others); ST.n.boost++; ST.n.boostPx += Math.hypot(p.x - x0, p.y - y0);
  ST.lp = { x: p.x, y: p.y, z: ctx.S.map };
}

/* ---------------- HUD nhỏ (khung gỗ ui/hud91/tframe) ---------------- */
function css() {
  if (document.getElementById('af50css')) return; const s = document.createElement('style'); s.id = 'af50css';
  s.textContent = `#af50{position:fixed;left:10px;top:98px;z-index:30;display:flex;align-items:center;gap:4px;font:18px/1 VT323,monospace;color:#3a2614;
  border:7px solid transparent;border-image:url(assets/px/ui/hud91/tframe.png) 7 fill / 7px stretch;image-rendering:pixelated;padding:0 4px;pointer-events:auto;user-select:none;white-space:nowrap}
  #af50[hidden]{display:none}#af50 img{width:24px;height:24px;image-rendering:pixelated}#af50 .tm{font-size:22px;color:#2a1a0c;min-width:44px;text-align:center}
  #af50 .st{font-size:15px;color:#6a4a2a}#af50 button{font:16px/1 VT323,monospace;background:#7a5230;color:#ffe9c4;border:2px solid #3a2614;padding:2px 6px;cursor:pointer;image-rendering:pixelated}
  #af50 button:active{background:#5a3a20}#af50.wait .tm{color:#8a6a4a}
  @media (max-width:600px){#af50{left:10px;top:calc(env(safe-area-inset-top,0px) + 94px);font-size:15px}#af50 .tm{font-size:19px}#af50 img{width:20px;height:20px}}`;
  document.head.appendChild(s);
}
function hudEl(ctx) {
  if (ST.hud && ST.hud.isConnected) return ST.hud; css(); const el = document.createElement('div'); el.id = 'af50'; el.hidden = true;
  el.addEventListener('pointerdown', e => e.stopPropagation()); el.addEventListener('mousedown', e => e.stopPropagation()); el.addEventListener('click', e => { e.stopPropagation(); const b = e.target.closest('button'); if (!b) return; act(ctx, b.dataset.a); });
  document.body.appendChild(el); ST.hud = el; return el;
}
function act(ctx, k) {
  const a = sv(ctx);
  if (k === 'use') useTicket(ctx); else if (k === 'cont') resume(ctx); else if (k === 'off') stop(ctx, 'off');
  else if (k === 'hand') { a.hand = !a.hand; if (a.hand) dropTarget(ctx); log({ ev: 'hand', on: a.hand }); ctx.persist(); }
  ST.sig = ''; renderHud(ctx);
}
/* gộp c54 (anh 05/11): đồng hồ bám NGAY DƯỚI dòng nhiệm vụ + "Cứu Lyron / Save Lyron" (đo #h-next / #h-story thật, không đoán px);
   thông báo #px-notes (cột trái) mà chạm đồng hồ thì đẩy xuống bằng margin-top (hud.js chỉ ghi style.top của nó) */
let afPush = 0;
function place() {
  const el = ST.hud, nt = document.getElementById('px-notes');
  if (!el || el.hidden) { if (nt && afPush) { nt.style.marginTop = ''; afPush = 0; } return; }
  let b = 0;
  for (const id of ['h-next', 'h-story']) { const e = document.getElementById(id); if (!e || e.closest('[hidden]')) continue; const q = e.getBoundingClientRect(); if (q.height > 0 && q.left < innerWidth / 2 && q.bottom < innerHeight / 2) b = Math.max(b, q.bottom); }
  if (b > 0) { const top = Math.round(b + 4) + 'px'; if (el.style.top !== top) el.style.top = top; }
  if (!nt) return;
  const a = el.getBoundingClientRect(), q = nt.getBoundingClientRect(), top0 = q.top - afPush; if (!q.height) return;   /* không có thông báo: giữ nguyên độ đẩy để thông báo mới không chớp đè */
  const push = q.left < a.right && top0 < a.bottom + 4 && top0 + q.height > a.top && q.height > 0 ? Math.max(0, Math.round(a.bottom + 4 - top0)) : 0;
  if (push !== afPush) { afPush = push; nt.style.marginTop = push ? push + 'px' : ''; }
}
function status(ctx) {
  const a = sv(ctx); if (!a.on) return null; if (!inVillage(ctx)) return 'away'; if (ctx.hero && ctx.hero.fainted) return 'faint'; if (a.hand) return 'hand'; if (ST.pauseT > 0 || ctx.S.mode !== 'play') return 'wait'; return 'run';
}
function renderHud(ctx) {
  const el = hudEl(ctx), a = sv(ctx), t = L(ctx), n = count(ctx), show = ctx.S.mode !== 'title' && ctx.S.mode !== 'menu' && (a.on || (inVillage(ctx) && (n > 0 || a.left > 0)));
  const stt = status(ctx), sig = [show, a.on, Math.ceil(a.left), stt, n, vi(ctx)].join('|'); if (sig === ST.sig) return; ST.sig = sig;
  if (!show) { el.hidden = true; return; }
  const img = `<img src="${iconSrc()}" alt="">`;
  if (a.on) { el.className = stt === 'run' ? '' : 'wait'; el.innerHTML = `${img}<span class="tm">${mmss(a.left)}</span><span class="st">${{ run: t.run, wait: t.wait, hand: t.hand, away: t.away, faint: t.faint }[stt]}</span><button data-a="hand" title="${t.tipP}">${a.hand ? '▶' : 'II'}</button><button data-a="off" title="${t.tipX}">✕</button>`; }
  else if (a.left > 0) { el.className = 'wait'; el.innerHTML = `${img}<span class="tm">${mmss(a.left)}</span><button data-a="cont">${t.contBtn}</button>${n ? `<button data-a="use">+${n}</button>` : ''}`; }
  else { el.className = 'wait'; el.innerHTML = `${img}<button data-a="use">${t.useBtn(n)}</button>`; }
  el.hidden = false;
}

/* ---------------- dò người chơi tự lái → tạm dừng 5 s ---------------- */
const MOVE_KEYS = /^(Arrow(Up|Down|Left|Right)|Key[WASD])$/;
function userInput() { const c = ST.ctx; if (!c) return; const a = sv(c); if (!a.on) return; ST.pauseT = PAUSE; ST.n.pause++; dropTarget(c); }
function listen() {
  if (typeof window === 'undefined' || window.__af50L) return; window.__af50L = 1;
  window.addEventListener('keydown', e => { if (MOVE_KEYS.test(e.code) && !(e.target && /INPUT|TEXTAREA/.test(e.target.tagName))) userInput(); }, true);
  window.addEventListener('pointerdown', e => { const c = ST.ctx; if (!c || c.S.mode !== 'play') return; if (e.target && e.target.closest && e.target.closest('#af50')) return; if (e.target && e.target.tagName === 'CANVAS' || (e.target && e.target.closest && e.target.closest('.joy,#joy,[class*=joy]'))) userInput(); }, true);
}

export const autofarm50 = {
  id: 'autofarm50',
  setup(ctx) {   /* API hệ không có hook init → gọi từ onZoneEnter / update (một lần) */
    if (ST.ready) return; ST.ready = true; ST.ctx = ctx; listen(); regIcon();
    ctx.autofarm50 = { on: () => sv(ctx).on, left: () => sv(ctx).left, use: () => useTicket(ctx) };
    if (typeof window !== 'undefined') window.__af50 = {
      state: () => { const a = sv(ctx), p = P(ctx); return { on: a.on, left: +a.left.toFixed(1), hand: a.hand, mode0: a.mode0, stt: status(ctx), n: { ...ST.n }, tickets: count(ctx), stone: inv(ctx).stone || 0, pauseT: +ST.pauseT.toFixed(2), tg: ST.tg ? { id: ST.tg.id, sp: ST.tg.f6 && (ST.tg.f6.sp || ST.tg.f6.key), hp: Math.round(ST.tg.hp), d: Math.round(Math.hypot(ST.tg.x - p.x, ST.tg.y - p.y)) } : null, hc: ST.hc ? { x: Math.round(ST.hc.x), y: Math.round(ST.hc.y), inStaff: (ctx.S.staff || []).includes(ST.hc) } : null, p: { x: Math.round(p.x), y: Math.round(p.y), speedMul: p.speedMul }, squad: squadMode(ctx), exits: exitsOf(ctx).length }; },
      log: () => ST.log.slice(), buy: () => buy(ctx), use: () => useTicket(ctx), setLeft: s => { sv(ctx).left = s; ST.sig = ''; return s; }, off: () => stop(ctx, 'off'), resume: () => resume(ctx),
      talk: () => talkHc(ctx), shop: () => openShop(ctx), shopHtml: () => (ST.shopEl && !ST.shopEl.hidden ? ST.shopEl.innerHTML : ''), cfg: CF, reset: () => { for (const k in ST.n) ST.n[k] = 0; ST.log = []; }, hud: () => (ST.hud ? { hidden: ST.hud.hidden, html: ST.hud.innerHTML } : null),
      input: () => userInput(), hand: () => act(ctx, 'hand'),
    };
  },
  onZoneEnter(ctx) { autofarm50.setup(ctx); ST.ctx = ctx; ST.placed = false; ST.hc = null; ST.tg = null; ST.ours = null; ST.lp = null; ST.skip.clear(); ST.exitZ = null; ST.sig = ''; if (ctx.S.mode === 'af50shop') ctx.setMode('play'); },
  onZoneLeave(ctx) { if (ctx.S.mode === 'af50shop') closeShop(ctx); ST.hc = null; ST.tg = null; ST.ours = null; },
  update(dt, ctx) {
    if (!ST.ready) autofarm50.setup(ctx); ST.ctx = ctx; regIcon(); const a = sv(ctx);
    if (!ST.placed && ctx.S.map) { ST.placed = true; try { placeHc(ctx); } catch (e) { console.error('af50 hc', e); } }
    if (ST.hc && ctx.S.staff && !ctx.S.staff.includes(ST.hc)) ctx.S.staff.push(ST.hc);   /* main / c42 dựng lại danh sách NPC → gắn lại */
    const tn = now(), rdt = ST.lastNow ? Math.min(1, (tn - ST.lastNow) / 1000) : 0; ST.lastNow = tn;
    if (a.on) {
      a.left -= rdt; if (a.left <= 0) { stop(ctx, 'end'); }
      else {
        boost(ctx);
        if (ST.pauseT > 0) ST.pauseT -= rdt;
        if (status(ctx) === 'run') { try { farmTick(ctx, dt); } catch (e) { console.error('af50 farm', e); } }
        if ((a.saveT = (a.saveT || 0) + rdt) > 10) { a.saveT = 0; ctx.persist(); }
      }
    } else ST.lp = null;
    if ((ST.hudT -= rdt) <= 0) { ST.hudT = 0.25; try { renderHud(ctx); place(); } catch (e) { } }
  },
  near(ctx) {
    const p = P(ctx); if (!ST.hc || !p) return null;
    if (Math.hypot(ST.hc.x - p.x, ST.hc.y - p.y) < 26) return { label: L(ctx).talk, x: ST.hc.x, y: ST.hc.y, limit: 28, priority: 4, data: { af50hc: true } };
    return null;
  },
  interact(ctx, cand) { const d = cand && cand.data; if (!d || ctx.S.mode !== 'play') return; if (d.af50hc) talkHc(ctx); },
};
