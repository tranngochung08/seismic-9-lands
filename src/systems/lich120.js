/* lich120.js — c67-world (plan-120 #12): LỊCH TRONG GAME. Mở bằng phím L (ngoài Quần Đảo Mây, nơi L = ghim ống nhòm) hoặc bấm vào đồng hồ HUD (#h-clock).
   Bảng khung pixel (ui/frame.png + dlg_plate + title/btn, cùng kiểu bảng Tiềm Năng): mùa + ngày + năm, giờ game, dải 12 ngày của mùa, thanh ngày / đêm 6:00 → 2:00,
   mục "Sắp tới" đếm ngược theo GIỜ THẬT (cập nhật mỗi giây khi bảng mở): boss thế giới Nữ Hoàng Gương (worldboss44: save.sys.wb44.nx, 30 phút sau trận trước),
   trời tối / sáng, đổi mùa, sự kiện mùa (Halloween ở Làng 25/10 – 10/11 theo ngày máy, như halloween119). Ghi chú quy đổi giờ game ↔ giờ thật.
   Đồng hồ thế giới chung (clock.js c38): 1 ngày game 6:00 → 2:00 = 1200 phút game = 12 phút thật → 1 giờ game = 36 giây thật; 1 mùa = 12 ngày = 2 giờ 24 phút thật.
   Không đổi clock.js: chỉ đọc ctx.clock.world() (dayIndex, min, srvOffsetMs) + ctx.clock.RATE. Móc test: window.__lich120. */
const STR = {
  vi: { title: 'Lịch', year: y => `Năm ${y}`, day: d => `Ngày ${d}`, season: { spring: 'Xuân', summer: 'Hè', autumn: 'Thu', winter: 'Đông' },
    now: 'Bây giờ', daybar: 'Ngày · đêm', dayOf: 'Ngày trong mùa', next: 'Sắp tới', close: 'Đóng', hint: 'L / bấm đồng hồ để mở lịch',
    boss: 'Boss thế giới: Nữ Hoàng Gương', bossLive: 'đang ở Quảng Trường Làng', bossReady: 'đã tới giờ — vào Quảng Trường Làng là xuất hiện',
    dusk: 'Trời tối (19:00)', dawn: 'Bình minh · ngày mới (6:00)', seasonTo: s => `Sang mùa ${s}`, hallo: 'Lễ hội Halloween ở Làng', halloEnd: 'Halloween kết thúc', on: 'đang diễn ra',
    at: t => `lúc ${t} giờ thật`, inT: t => `còn ${t}`, h: 'giờ', m: 'phút', s: 'giây', d: 'ngày',
    note: '1 ngày game (6:00 → 2:00) = 12 phút thật · 1 giờ game ≈ 36 giây thật · 1 mùa (12 ngày) = 2 giờ 24 phút thật. Mọi người chơi cùng một đồng hồ.' },
  en: { title: 'Calendar', year: y => `Year ${y}`, day: d => `Day ${d}`, season: { spring: 'Spring', summer: 'Summer', autumn: 'Autumn', winter: 'Winter' },
    now: 'Now', daybar: 'Day · night', dayOf: 'Days of the season', next: 'Coming up', close: 'Close', hint: 'L / click the clock to open the calendar',
    boss: 'World boss: Mirror Queen', bossLive: 'in the Village Square now', bossReady: 'it is time — enter the Village Square to summon her',
    dusk: 'Nightfall (19:00)', dawn: 'Dawn · new day (6:00)', seasonTo: s => `${s} begins`, hallo: 'Halloween festival in the Village', halloEnd: 'Halloween ends', on: 'happening now',
    at: t => `at ${t} real time`, inT: t => `in ${t}`, h: 'h', m: 'm', s: 's', d: 'd',
    note: '1 game day (6:00 → 2:00) = 12 real minutes · 1 game hour ≈ 36 real seconds · 1 season (12 days) = 2 h 24 min real time. Everyone shares the same clock.' },
};
const SEASONS = ['spring', 'summer', 'autumn', 'winter'], DAYS = 12, DAY_MIN = 1200, P_WB = 30 * 60 * 1000, WB_LIFE = 300 * 1000;
const ST = { el: null, iv: 0, ctx: null, hudBound: null, prev: 'play', last: null };
const BASE = 'assets/px/';

function T(ctx) { return STR[ctx.lang && ctx.lang() === 'en' ? 'en' : 'vi']; }
function dur(ms, t) {   /* ms → '1 giờ 05 phút' / '12 phút 05 giây' */
  const s = Math.max(0, Math.round(ms / 1000)), d = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600), m = Math.floor(s % 3600 / 60), ss = s % 60, p = n => String(n).padStart(2, '0');
  if (d) return `${d} ${t.d} ${h} ${t.h}`; if (h) return `${h} ${t.h} ${p(m)} ${t.m}`; return `${m} ${t.m} ${p(ss)} ${t.s}`;
}
const hhmm = ms => { const d = new Date(ms); return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`; };
const ddmm = ms => { const d = new Date(ms); return `${d.getDate()}/${d.getMonth() + 1} ${hhmm(ms)}`; };
const gameHM = min => { const h = Math.floor(6 + min / 60) % 24, m = Math.floor(min % 60); return `${h}:${String(m).padStart(2, '0')}`; };

export function lichData(ctx, nowMs = Date.now()) {   /* tính sẵn dữ liệu bảng (dùng cả cho test) */
  const C = ctx.clock, w = C.world(), RATE = C.RATE || DAY_MIN / 720, D = w.dayIndex, min = w.min, srv = +w.srvOffsetMs || 0;
  const realIn = gmin => gmin / RATE * 1000;   /* phút game → ms thật */
  const P = SEASONS.length * DAYS, si = Math.floor((D % P) / DAYS), season = SEASONS[si], day = D % DAYS + 1, year = Math.floor(D / P) + 1;
  const ev = [];
  { const sv = (ctx.S.save.sys && ctx.S.save.sys.wb44) || {}, now = nowMs + srv; let nx = sv.nx > 0 ? sv.nx : Math.ceil(now / P_WB) * P_WB, live = null;
    try { const s = typeof window !== 'undefined' && window.__wb44 && window.__wb44.state && ctx.S.zone && ctx.S.zone.id === 'village' ? window.__wb44.state() : null; if (s && s.B) live = s.B.tl; } catch (e) { }
    const done = (sv.done || []).includes('N' + nx);
    if (live != null) ev.push({ k: 'boss', ms: 0, live: true, left: Math.max(0, live * 1000) });
    else if (nx > now) ev.push({ k: 'boss', ms: nx - now, at: nx - srv });
    else if (!done) ev.push({ k: 'boss', ms: 0, ready: true });
    else { nx = Math.ceil((now + 1) / P_WB) * P_WB; ev.push({ k: 'boss', ms: nx - now, at: nx - srv }); } }
  { const dusk = min < 780; const gm = dusk ? 780 - min : DAY_MIN - min; ev.push({ k: dusk ? 'dusk' : 'dawn', ms: realIn(gm), at: nowMs + realIn(gm) }); }
  { const nD = (Math.floor(D / DAYS) + 1) * DAYS, gm = (nD - D) * DAY_MIN - min; ev.push({ k: 'season', ms: realIn(gm), at: nowMs + realIn(gm), to: SEASONS[(si + 1) % 4] }); }
  { const d = new Date(nowMs), y = d.getFullYear(), on = (d.getMonth() === 9 && d.getDate() >= 25) || (d.getMonth() === 10 && d.getDate() <= 10);
    if (on) { const end = new Date(y, 10, 11, 0, 0, 0).getTime(); ev.push({ k: 'halloEnd', ms: end - nowMs, at: end, on: true }); }
    else { let st = new Date(y, 9, 25, 0, 0, 0).getTime(); if (st <= nowMs) st = new Date(y + 1, 9, 25).getTime(); ev.push({ k: 'hallo', ms: st - nowMs, at: st }); } }
  ev.sort((a, b) => a.ms - b.ms);
  return { year, season, si, day, min, hm: gameHM(min), D, ev, night: C.isNight ? C.isNight() : min >= 780 };
}

function css() {
  if (document.getElementById('lich120-css')) return; const s = document.createElement('style'); s.id = 'lich120-css';
  s.textContent = `#lich120{position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:46;border:20px solid transparent;border-image:url(${BASE}ui/frame.png) 20 / 20px round;border-radius:0;background:#1c1424;background-clip:padding-box;image-rendering:pixelated;padding:2px 8px 6px;color:#fff6d8;font:20px VT323,monospace;width:min(94vw,460px);max-height:86vh;overflow:auto;box-sizing:border-box;text-shadow:1px 1px 0 #10241a;letter-spacing:0}
#lich120 h3{margin:0 auto 4px;font:bold 24px VT323,monospace;color:#ffd45e;text-align:center;width:max-content;border:8px solid transparent;border-image:url(${BASE}ui/dlg_plate.png) 8 / 8px round;background:#4a3324;background-clip:padding-box;padding:0 10px;image-rendering:pixelated}
#lich120 .big{text-align:center;font-size:26px;color:#ffe9b0;line-height:1}#lich120 .big b{color:#ffd45e}
#lich120 .l1s{text-align:center;color:#d8ccb8;font-size:17px;margin:2px 0 6px}
#lich120 .lbl{color:#c9b8e8;font-size:16px;margin:6px 0 2px}
#lich120 .seas{display:flex;gap:3px;justify-content:center;margin-bottom:4px}
#lich120 .seas span{border:6px solid transparent;border-image:url(${BASE}ui/dlg_port.png) 8 / 6px round;background:#2a1f38;background-clip:padding-box;padding:0 6px;font-size:17px;line-height:16px;color:#9d92ab}
#lich120 .seas span.on{background:#4d3421;color:#ffd45e}
#lich120 .days{display:grid;grid-template-columns:repeat(12,1fr);gap:2px}
#lich120 .days i{font-style:normal;text-align:center;font-size:15px;line-height:18px;background:#2a1f38;border:2px solid #120f1c;color:#9d92ab}
#lich120 .days i.past{color:#6f6585;background:#1e1729}#lich120 .days i.on{background:#ffd45e;color:#2a1608;border-color:#7a4a12}
#lich120 canvas{display:block;width:100%;height:auto;image-rendering:pixelated;border:2px solid #120f1c}
#lich120 .ev{display:flex;align-items:center;gap:6px;border:8px solid transparent;border-image:url(${BASE}ui/dlg_port.png) 8 / 8px round;background:#2a1f38;background-clip:padding-box;padding:0 2px;margin-bottom:3px}
#lich120 .ev img{width:26px;height:20px;object-fit:contain;image-rendering:pixelated;flex:none}#lich120 .ev .i{flex:1;min-width:0;display:flex;flex-direction:column}
#lich120 .ev b{color:#ffe9b0;font-size:19px;line-height:1}#lich120 .ev small{color:#d8ccb8;font-size:15px;line-height:1.05}#lich120 .ev .cd{color:#ffd45e;font-size:19px;white-space:nowrap}
#lich120 .ev.live .cd{color:#9dff9a}
#lich120 .note{color:#b8a8c8;font-size:15px;line-height:1.05;margin:6px 0 4px;text-align:center}
#lich120 .r{display:flex;justify-content:center;margin-top:4px}
#lich120 button{font:19px VT323,monospace;color:#fff6c8;border:9px solid transparent;border-image:url(${BASE}ui/title/btn.png) 9 / 9px round;border-radius:0;background:#3a2718;background-clip:padding-box;padding:0 10px;cursor:pointer;image-rendering:pixelated;text-shadow:1px 1px 0 #10241a}
#lich120 button:hover{border-image-source:url(${BASE}ui/title/btn_hi.png);background:#4d3421;color:#ffd45e}
#h-clock.lich120{cursor:pointer}`;
  document.head.appendChild(s);
}
const ICON = { boss: 'ui/hud/crown.png', dusk: 'ui/hud/clock_night.png', dawn: 'ui/hud/clock.png', season: 'ui/zmap/quest.png', hallo: 'ui/zmap/treasure.png', halloEnd: 'ui/zmap/treasure.png' };

function dayBar(cv, min) {   /* thanh 6:00 → 2:00, 120 ô (10 phút game / ô), màu bậc theo độ tối của đồng hồ (17:00 → 21:00), mốc giờ, mũi tên giờ hiện tại */
  const W = 240, H = 18; if (cv.width !== W) { cv.width = W; cv.height = H; } const g = cv.getContext('2d'); g.imageSmoothingEnabled = false;
  const SK = ['#8fd0ff', '#7cbfe8', '#e8a868', '#a8687c', '#5a4a8a', '#2e2a5a', '#1c1a3e'];
  for (let i = 0; i < 120; i++) { const m = i * 10, k = m <= 660 ? 0 : m >= 900 ? 6 : 1 + Math.floor((m - 660) / 240 * 5); g.fillStyle = SK[k]; g.fillRect(i * 2, 0, 2, H - 6); }
  g.fillStyle = '#120f1c'; g.fillRect(0, H - 6, W, 6);
  g.fillStyle = '#d8ccb8'; for (const m of [0, 360, 660, 780, 900, 1199]) g.fillRect(Math.min(W - 1, Math.round(m / 5)), H - 6, 1, 2);
  const x = Math.round(min / 5); g.fillStyle = '#ffd45e'; g.fillRect(x - 1, 0, 3, H - 6); g.fillStyle = '#2a1608'; g.fillRect(x, 1, 1, H - 8);
  g.fillStyle = '#ffd45e'; g.fillRect(x - 2, H - 5, 5, 1); g.fillRect(x - 1, H - 4, 3, 1); g.fillRect(x, H - 3, 1, 1);
}

function render(ctx) {
  const el = ST.el; if (!el || el.hidden) return; const t = T(ctx), D = lichData(ctx); ST.last = D;
  el.querySelector('.big').innerHTML = `${t.season[D.season]} · ${t.day(D.day)} · ${t.year(D.year)} — <b>${D.hm}</b>`;
  el.querySelector('.seas').innerHTML = SEASONS.map((s, i) => `<span class="${i === D.si ? 'on' : ''}">${t.season[s]}</span>`).join('');
  el.querySelector('.days').innerHTML = Array.from({ length: DAYS }, (_, i) => `<i class="${i + 1 === D.day ? 'on' : i + 1 < D.day ? 'past' : ''}">${i + 1}</i>`).join('');
  dayBar(el.querySelector('canvas'), D.min);
  el.querySelector('.bt').textContent = '6:00 · 12:00 · 17:00 · 19:00 · 21:00 · 2:00';
  el.querySelector('.evs').innerHTML = D.ev.map(e => {
    const name = e.k === 'boss' ? t.boss : e.k === 'dusk' ? t.dusk : e.k === 'dawn' ? t.dawn : e.k === 'season' ? t.seasonTo(t.season[e.to]) : e.k === 'hallo' ? t.hallo : t.halloEnd;
    const sub = e.live ? t.bossLive : e.ready ? t.bossReady : e.on ? `${t.hallo} · ${t.on} · ${t.at(ddmm(e.at))}` : t.at(e.ms > 20 * 3600e3 ? ddmm(e.at) : hhmm(e.at));
    const cd = e.live ? t.inT(dur(e.left, t)) : e.ready ? '!' : t.inT(dur(e.ms, t));
    return `<div class="ev${e.live || e.ready || e.on ? ' live' : ''}"><img src="${BASE}${ICON[e.k]}" alt=""><div class="i"><b>${name}</b><small>${sub}</small></div><span class="cd">${cd}</span></div>`;
  }).join('');
}
function open(ctx) {
  css(); const t = T(ctx);
  if (!ST.el) { const el = document.createElement('div'); el.id = 'lich120'; el.hidden = true; document.body.appendChild(el); ST.el = el;
    el.addEventListener('pointerdown', e => e.stopPropagation()); el.addEventListener('click', e => { if (e.target.closest && e.target.closest('[data-x]')) close(ctx); }); }
  ST.el.innerHTML = `<h3>${t.title}</h3><div class="big"></div><div class="l1s">${t.now}</div><div class="seas"></div><div class="lbl">${t.dayOf}</div><div class="days"></div>
    <div class="lbl">${t.daybar}</div><canvas width="240" height="18"></canvas><div class="l1s bt"></div><div class="lbl">${t.next}</div><div class="evs"></div>
    <div class="note">${t.note}</div><div class="r"><button type="button" data-x="1">${t.close}</button></div>`;
  ST.el.hidden = false; if (ctx.S.mode === 'play') ctx.setMode('lich120');
  render(ctx); clearInterval(ST.iv); ST.iv = setInterval(() => { try { if (!ST.el || ST.el.hidden) { clearInterval(ST.iv); return; } render(ctx); } catch (e) { console.error('lich120', e); } }, 1000);
}
function close(ctx) { if (ST.el) ST.el.hidden = true; clearInterval(ST.iv); if (ctx.S.mode === 'lich120') ctx.setMode('play'); }
function bindHud(ctx) {
  const h = typeof document !== 'undefined' && document.getElementById('h-clock'); if (!h || ST.hudBound === h) return; ST.hudBound = h;
  h.classList.add('lich120'); css(); h.title = T(ctx).hint;
  h.addEventListener('click', e => { e.stopPropagation(); const c = ST.ctx; if (!c) return; if (c.S.mode === 'lich120') close(c); else if (c.S.mode === 'play') open(c); });
}

export const lich120 = {
  id: 'lich120',
  always: true,
  onZoneEnter(ctx) {
    ST.ctx = ctx;
    if (!ST.reg) { ST.reg = true; ctx.registerCloser('lich120', () => close(ctx)); try { ctx.onAction('lich120', () => close(ctx)); } catch (e) { } }
    if (typeof window !== 'undefined') window.__lich120 = { open: () => open(ctx), close: () => close(ctx), data: () => lichData(ctx), isOpen: () => !!(ST.el && !ST.el.hidden) };
  },
  update(dt, ctx) { ST.ctx = ctx; if ((ST.bt = (ST.bt || 0) - dt) <= 0) { ST.bt = 1; bindHud(ctx); } if (ST.el && !ST.el.hidden && ctx.S.mode !== 'lich120') close(ctx); },
  key(code, ctx) {
    if (code !== 'KeyL') return false; const tn = performance.now(); if (tn - (ST.kT || 0) < 250) return ctx.S.mode === 'lich120'; ST.kT = tn; if (ctx.S.map && (ctx.S.map.sky || ctx.S.map.air)) return false;   /* Quần Đảo Mây: L = ghim ống nhòm (sky.js) */
    if (ctx.S.mode === 'lich120') { close(ctx); return true; } if (ctx.S.mode !== 'play') return false; open(ctx); return true;
  },
};
