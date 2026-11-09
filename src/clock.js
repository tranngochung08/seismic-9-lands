// clock.js — đồng hồ, lịch & hết ngày trong game (plan-17 F01, anh chốt 2026-09-27 đêm)
//  · 1 ngày game = 6:00 → 2:00 (1200 phút game) ≈ 12 phút thật → 5/3 phút game mỗi giây thật.
//  · 4 mùa (spring/summer/autumn/winter) × 12 ngày; năm tăng sau Đông 12.
//  · CHỈ chạy khi S.mode === 'play', tab đang hiện (document.visibilityState) và không ai pause(reason).
//    Menu/hộp thoại/cutscene/panel = mode khác 'play' → tự dừng. Tắt game → save.clock giữ nguyên giờ lúc persist cuối.
//  · Đến 2:00 → tự 'về giường': fade đen → onDayEnd → ngày +1, 6:00 → onDayStart → bảng tổng kết sáng (mode 'summary').
//  · Ngủ chủ động: ctx.clock.sleep() (giường 'bed' cạnh đình mỗi vùng, hoặc module khác gọi).
//  · Save cũ không có save.clock → Xuân · Ngày 1 · 6:00, năm 1.
//  Hợp đồng cho module: src/systems/API.md mục "Clock" + docs/contract-dot1.md.

export const SEASONS = ['spring', 'summer', 'autumn', 'winter'];
export const DAYS_PER_SEASON = 12;
export const DAY_MIN = 1200;                 // phút game trong 1 ngày (6:00 → 2:00)
export const REAL_SEC_PER_DAY = 720;         // 12 phút thật
export const RATE = DAY_MIN / REAL_SEC_PER_DAY;   // phút game / giây thật = 1,6667
export const MS_PER_GAME_MIN = 600;          // "ms tương đương" của 1 phút game (dùng quy đổi t0 giây thật của cây con gather)
/* c38-dongho: ĐỒNG HỒ THẾ GIỚI CHUNG — mọi máy cùng năm/mùa/ngày/giờ, tính từ giờ thật (Date.now() + lệch giờ máy chủ) kể từ WORLD_EPOCH, đúng RATE (1 ngày game 6:00→2:00 = 12 phút thật). */
export const WORLD_EPOCH = Date.UTC(2026, 8, 30, 17, 0, 0);   /* 01/10/2026 00:00 giờ VN; mốc sớm để ngày chung luôn lớn hơn ngày của save cũ */
const W = { obj: null, min: -1, day: 0, season: '', year: 0, off: 0, srv: 0, want: null };   /* off = độ lệch TẠM (phút game) cho test/preset, không lưu; srv = lệch giờ máy chủ (ms) */
try { const q = new URLSearchParams(location.search).get('clock'); if (q) { const mt = /^(\d{1,2})(?::(\d{1,2}))?$/.exec(q); if (mt) W.want = ((+mt[1] + 24 - 6) % 24) * 60 + (+(mt[2] || 0)); else if (/^\d+(\.\d+)?$/.test(q)) W.want = +q; if (W.want != null) W.want = Math.max(0, Math.min(DAY_MIN - 1, W.want)); } } catch (e) { }   /* test: ?clock=21:00 hoặc ?clock=900 (phút từ 6:00) */
const worldMin = () => (Date.now() + W.srv - WORLD_EPOCH) / 1000 * RATE + W.off;
const absDayOf = c => (c.year - 1) * SEASONS.length * DAYS_PER_SEASON + Math.max(0, SEASONS.indexOf(c.season)) * DAYS_PER_SEASON + (c.day - 1);
function nowDM() { const T = worldMin(); const D = Math.max(0, Math.floor(T / DAY_MIN)); return { D, m: Math.max(0, Math.min(DAY_MIN - 0.001, T - D * DAY_MIN)) }; }
function syncW(c) { W.obj = c; W.min = c.min; W.day = c.day; W.season = c.season; W.year = c.year; }
function setMin(c, m) { c.min = m; c.hour = Math.floor(6 + m / 60) % 24; c.minute = Math.floor(m % 60); }
function writeWorld(c, D, m) { const P = SEASONS.length * DAYS_PER_SEASON; c.year = Math.floor(D / P) + 1; c.season = SEASONS[Math.floor((D % P) / DAYS_PER_SEASON)]; c.day = D % DAYS_PER_SEASON + 1; setMin(c, m); c.wd = D; syncW(c); }
function adopt(c) {   /* save vừa nạp: save cũ (chưa có wd) hoặc ngày đã lưu ≥ ngày chung → lấy ngay giờ chung, không chuyển ngày; save mới đã qua ngày → giữ ngày cũ để tick chạy ĐÚNG 1 lần chuyển ngày */
  if (W.want != null) { const a = nowDM(); W.off += W.want - a.m; W.want = null; }
  const { D, m } = nowDM();
  if (typeof c.wd !== 'number' || absDayOf(c) >= D) writeWorld(c, D, m); else { setMin(c, m); syncW(c); }
}
/* c70-detho (plan-121 A4): SAVE MỚI TINH VÀO GAME BAN NGÀY — đồng hồ chung (WORLD_EPOCH) giữ nguyên cho mọi người, chỉ ĐỘ TỐI của người mới bị giữ:
   save chưa từng có clock → save.clock.nb121 = 600 giây chơi (chỉ đếm khi đồng hồ chạy: đang chơi, tab hiện). 8 phút đầu: trời sáng hẳn (darkness 0, isNight false);
   2 phút cuối: độ tối tăng mượt từ 0 về đúng độ tối chung; hết 600 s xoá nb121. Giờ / ngày / mùa hiển thị vẫn là giờ chung. */
const NB_DAY = 600, NB_FADE = 120;
const nbLeft = c => (c && c.nb121 > 0 ? c.nb121 : 0);
const SEASON_NAME = {
  en: { spring: 'Spring', summer: 'Summer', autumn: 'Autumn', winter: 'Winter' },
  vi: { spring: 'Xuân', summer: 'Hè', autumn: 'Thu', winter: 'Đông' }
};
const STR = {
  en: { day: n => `Day ${n}`, dayShort: n => `D${n}`, newDay: 'A new day', stoneToday: 'Stones gained today', shardsToday: 'Tremor shards today', metToday: 'Artists met today', events: 'What happened', nothing: 'A quiet day.', ok: 'Wake up', year: y => `Year ${y}`, slept: 'You fell asleep… (2:00)', rested: 'You rested: HP restored, game saved' },
  vi: { day: n => `Ngày ${n}`, dayShort: n => `N${n}`, newDay: 'Ngày mới', stoneToday: 'Đá thu được hôm nay', shardsToday: 'Mảnh dư chấn hôm nay', metToday: 'Nghệ sĩ gặp hôm nay', events: 'Chuyện đã xảy ra', nothing: 'Một ngày yên ả.', ok: 'Thức dậy', year: y => `Năm ${y}`, slept: 'Bạn ngủ gục… (2:00)', rested: 'Đã nghỉ ngơi: hồi đầy máu, đã lưu game' }
};

function normalize(c) {
  const out = c && typeof c === 'object' ? c : {};
  if (!SEASONS.includes(out.season)) out.season = 'spring';
  out.day = Math.min(DAYS_PER_SEASON, Math.max(1, (out.day | 0) || 1));
  out.year = Math.max(1, (out.year | 0) || 1);
  if (typeof out.min !== 'number' || !(out.min >= 0) || out.min >= DAY_MIN) out.min = (typeof out.hour === 'number') ? Math.max(0, Math.min(DAY_MIN - 1, ((out.hour + 24 - 6) % 24) * 60 + (out.minute | 0))) : 0;
  out.hour = Math.floor(6 + out.min / 60) % 24; out.minute = Math.floor(out.min % 60);
  if (!out.today || typeof out.today !== 'object') out.today = null;
  return out;
}

/**
 * deps = { S, persist, fadeTo, setMode, registerCloser, onAction, lang, panel, toast }
 * Trả về object clock (gắn vào ctx.clock).
 */
export function createClock(deps) {
  const { S } = deps;
  const endCbs = [], startCbs = [], pauses = new Set();
  let ending = false, ctxRef = null, hudEl = null, hudText = '', hudNarrow = false;
  const L = () => STR[deps.lang() === 'vi' ? 'vi' : 'en'];
  try { fetch(location.href.split('#')[0], { method: 'HEAD', cache: 'no-store' }).then(r => { const d = Date.parse(r.headers.get('date') || ''); if (d > 0) { const diff = d + 500 - Date.now(); if (Math.abs(diff) > 3000) W.srv = diff; } }).catch(() => { }); } catch (e) { }   /* c38-dongho: giờ máy lệch > 3 s → theo giờ máy chủ (header Date, chính xác ~1 s) */
  const st = () => S.save.clock;
  const info = () => { const c = st(); return { day: c.day, season: c.season, year: c.year, dayIndex: clock.dayIndex }; };

  function snapshotToday() {
    const sv = S.save;
    st().today = { stone: (sv.inv && sv.inv.stone) || 0, shards: sv.shards || 0, met: (sv.met || []).length, events: [] };
  }
  function fire(list, name) {
    for (const cb of list) { try { cb(ctxRef, info()); } catch (e) { console.error('clock.' + name, e); } }
  }
  function advanceDay() {
    const c = st();
    c.day += 1;
    if (c.day > DAYS_PER_SEASON) { c.day = 1; const si = SEASONS.indexOf(c.season) + 1; if (si >= SEASONS.length) { c.season = SEASONS[0]; c.year += 1; } else c.season = SEASONS[si]; }
    c.min = 0; c.hour = 6; c.minute = 0;
  }
  function summaryData(prev) {
    const sv = S.save, t = prev || { stone: 0, shards: 0, met: 0, events: [] };
    return {
      stone: Math.max(0, ((sv.inv && sv.inv.stone) || 0) - t.stone), shards: Math.max(0, (sv.shards || 0) - t.shards), met: Math.max(0, (sv.met || []).length - t.met),
      events: (t.events || []).slice(0, 8)
    };
  }
  function openSummary(prev, auto) {
    const t = L(), d = summaryData(prev), esc = s => String(s ?? '').replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
    const el = deps.panel('summary');
    const rows = [[`🪨 ${t.stoneToday}`, `+${d.stone}`], [`◆ ${t.shardsToday}`, `+${d.shards}`], [`☺ ${t.metToday}`, `+${d.met}`]];
    el.panel.className = 'panel small';
    el.panel.innerHTML = `<h2 style="justify-content:center;font-family:'VT323',var(--font);font-size:26px">☀ ${esc(t.newDay)}</h2>
      <p class="dim" style="font-family:'VT323',var(--font);font-size:22px">${esc(clock.label(deps.lang(), true))} · ${esc(t.year(st().year))}</p>
      ${auto ? `<p class="dim">${esc(t.slept)}</p>` : ''}
      ${rows.map(([a, b]) => `<div class="hrow"><span class="hwho">${esc(a)}</span><span class="hnum"><b>${esc(b)}</b></span></div>`).join('')}
      <h3>${esc(t.events)}</h3>
      <div class="scroll" style="max-height:30vh;text-align:left">${d.events.length ? d.events.map(e => `<div>· ${esc(e)}</div>`).join('') : `<div class="dim">${esc(t.nothing)}</div>`}</div>
      <button id="sum-ok" class="btn primary" style="margin-top:10px">${esc(t.ok)}</button>`;
    el.hidden = false; deps.setMode('summary');
    el.panel.querySelector('#sum-ok').onclick = closeSummary;
  }
  function closeSummary() { const el = deps.panel('summary'); el.hidden = true; if (S.mode === 'summary') deps.setMode('play'); }
  deps.registerCloser('summary', closeSummary);
  deps.onAction('summary', closeSummary);

  function endDay(auto) {
    // TRƯỚC khi tăng ngày: module tính sản phẩm/cây lớn theo ngày vừa qua
    fire(endCbs, 'onDayEnd');
    const prev = st().today;
    advanceDay();
    snapshotToday();
    fire(startCbs, 'onDayStart');
    ending = false;
    deps.persist();
    try { const lg = deps.lang(), t = STR[lg === 'vi' ? 'vi' : 'en']; deps.toast(`☀ ${t.newDay} · ${clock.label(lg, true)}`); } catch (e) { }   /* c36: bỏ bảng Ngày mới, chỉ toast nhỏ */
  }

  function rest() {   /* c38-dongho: thời gian chung → ngủ KHÔNG tua giờ; chỉ hồi đầy máu (công thức maxHp của hero.js) + lưu game + thông báo nhỏ */
    try { const h = S.save.hero; if (h && h.lv) h.hp = 100 + 15 * (h.lv - 1); } catch (e) { }
    deps.persist();
    try { const lg = deps.lang(), t = STR[lg === 'vi' ? 'vi' : 'en']; deps.toast(`🛏 ${t.rested}`); } catch (e) { }
    return true;
  }
  function worldNewDay(c, D, m) {   /* c38-dongho: đồng hồ chung sang ngày → onDayEnd (ngày cũ) → ngày chung → onDayStart, ĐÚNG 1 lần dù offline nhiều ngày */
    ending = true;
    fire(endCbs, 'onDayEnd');
    writeWorld(c, D, m);
    snapshotToday();
    fire(startCbs, 'onDayStart');
    ending = false;
    deps.persist();
    try { const lg = deps.lang(), t = STR[lg === 'vi' ? 'vi' : 'en']; deps.toast(`☀ ${t.newDay} · ${clock.label(lg, true)}`); } catch (e) { }
  }
  const clock = {
    SEASONS, DAYS_PER_SEASON, DAY_MIN, RATE,
    get day() { return st().day; }, get season() { return st().season; }, get year() { return st().year; },
    get hour() { return st().hour; }, get minute() { return st().minute; },
    get dayIndex() { const c = st(); return (c.year - 1) * SEASONS.length * DAYS_PER_SEASON + SEASONS.indexOf(c.season) * DAYS_PER_SEASON + (c.day - 1); },
    get seasonIndex() { return SEASONS.indexOf(st().season); },
    now: () => st().min,                                            // phút game kể từ 6:00 (0 … 1199, số thực)
    ms: () => clock.dayIndex * DAY_MIN * MS_PER_GAME_MIN + st().min * MS_PER_GAME_MIN,   // "ms game" tuyệt đối (600 ms / phút game)
    fromRealMs: t0 => clock.ms() - Math.max(0, Date.now() - t0),    // quy đổi mốc giây thật cũ (Date.now()) sang ms game, giữ nguyên thời gian đã trôi
    running: () => !!S.save && !!S.save.clock && S.mode === 'play' && document.visibilityState !== 'hidden' && pauses.size === 0 && !ending,
    isNight: () => st().min >= 780 && !(nbLeft(st()) > NB_FADE),      // từ 19:00 (c70-detho: người mới 8 phút đầu coi như ngày)
    pause: reason => { pauses.add(reason || 'x'); }, resume: reason => { pauses.delete(reason || 'x'); },
    onDayEnd: cb => { if (typeof cb === 'function' && !endCbs.includes(cb)) endCbs.push(cb); },
    onDayStart: cb => { if (typeof cb === 'function' && !startCbs.includes(cb)) startCbs.push(cb); },
    log: text => { const t = st().today; if (t && text) { t.events.push(String(text).slice(0, 80)); if (t.events.length > 8) t.events.shift(); } },
    sleep: (auto = false) => {
      if (!S.save || !S.save.clock) return false;
      return rest();   /* c38-dongho: không tua giờ */   /* c36: không fade đen, không bảng */   /* plan-45 BD3: tối dần 1 s → bảng Ngày mới trên nền đen → đóng bảng thì sáng dần 1 s */           // đang fade dở (đổi vùng) → thử lại sau
      ending = true; deps.setMode('sleep');                          // khóa người chơi trong lúc fade đen
      return true;
    },
    seasonName: lg => SEASON_NAME[lg === 'vi' ? 'vi' : 'en'][st().season],
    label: (lg, noTime) => {
      const c = st(), t = STR[lg === 'vi' ? 'vi' : 'en'];
      const hh = String(c.hour).padStart(1, '0'), mm = String(c.minute).padStart(2, '0');
      return `${clock.seasonName(lg)} · ${t.day(c.day)}` + (noTime ? '' : ` · ${hh}:${mm}`);
    },
    // 0 ban ngày … tối đa 0,45 về khuya; đổi mượt theo phút, không nhấp nháy. 17:00 bắt đầu tối, 21:00 tối hẳn (mùa đông sớm hơn 1 giờ).
    darkness: () => {
      const c = st(); if (!c) return 0;
      const nb = nbLeft(c), hold = nb > 0 ? Math.max(0, Math.min(1, 1 - nb / NB_FADE)) : 1;   /* c70-detho: người mới — 0 khi còn > 2 phút, rồi tăng mượt về 1 */
      const start = c.season === 'winter' ? 600 : 660, full = start + 240, m = c.min;
      if (m <= start) return 0; if (m >= full) return 0.34 * hold;
      const k = (m - start) / (full - start); return 0.34 * (k * k * (3 - 2 * k)) * hold;   /* c35-demban: đêm bớt tối (0,45 → 0,34) */
    },
    dayT: () => { const h = 6 + st().min / 60; return (((h - 12) % 24) + 24) % 24 / 24; },   // tương thích cũ: 0 = trưa, 0,5 = nửa đêm
    world: () => ({ epoch: WORLD_EPOCH, srvOffsetMs: W.srv, testOffsetMin: W.off, dayIndex: nowDM().D, min: nowDM().m }),   /* c38-dongho: xem đồng hồ chung */
    worldReset: () => { W.off = 0; W.want = null; W.lockUrl = false; const c = W.obj; if (c) { const { D, m } = nowDM(); writeWorld(c, D, m); } },   /* c38-dongho: bỏ độ lệch test */
    init: sv => { const fresh = (!sv.clock || typeof sv.clock !== 'object') && !(sv.hero && sv.hero.lv > 1); sv.clock = normalize(sv.clock); if (fresh) sv.clock.nb121 = NB_DAY; adopt(sv.clock);   /* c70-detho: save mới tinh → 10 phút đầu ban ngày */ if (!sv.clock.today) { S.save = sv; snapshotToday(); } },
    set: o => { const c = st(); if (!c) return; if (o.season && SEASONS.includes(o.season)) c.season = o.season; if (o.day) c.day = Math.min(DAYS_PER_SEASON, Math.max(1, o.day | 0)); if (o.year) c.year = Math.max(1, o.year | 0); if (typeof o.min === 'number') c.min = Math.max(0, Math.min(DAY_MIN - 1, o.min)); if (typeof o.hour === 'number') c.min = Math.max(0, Math.min(DAY_MIN - 1, ((o.hour + 24 - 6) % 24) * 60 + (o.minute | 0))); c.hour = Math.floor(6 + c.min / 60) % 24; c.minute = Math.floor(c.min % 60); },   // debug/test
    tick: (dt, ctx) => {
      ctxRef = ctx;
      const c = st(); if (!c) return;
      if (c !== W.obj) adopt(c);   /* c38-dongho: save khác vừa nạp (cloud, đổi tài khoản) */
      else if (c.min !== W.min || c.day !== W.day || c.season !== W.season || c.year !== W.year) { W.off += (absDayOf(c) * DAY_MIN + c.min) - worldMin(); syncW(c); }   /* ghi tay (test, preset, clock.set) → độ lệch TẠM, không lưu */
      const { D, m } = nowDM(), cur = absDayOf(c);
      if (D < cur) { writeWorld(c, D, m); return; }
      if (c.nb121 > 0 && clock.running()) { c.nb121 = Math.max(0, c.nb121 - dt); if (!(c.nb121 > 0)) delete c.nb121; }   /* c70-detho: đếm 10 phút ban ngày của người mới (giây chơi thật) */
      if (D === cur) { setMin(c, m); c.wd = D; syncW(c); return; }
      if (!clock.running()) return;   /* sang ngày khi đang ở menu / hộp thoại → chờ về chơi mới chuyển ngày */
      worldNewDay(c, D, m);
    },
    hud: lg => {
      const hud = document.getElementById('hud'); if (!hud) return;
      if (!hudEl) {
        hudEl = document.createElement('span'); hudEl.id = 'h-clock';
        hudEl.style.cssText = "font-family:'VT323',monospace;font-size:19px;line-height:1;color:#ffd45e;text-shadow:1px 1px 0 #000;white-space:nowrap;padding:2px 6px;border:1px solid rgba(255,212,94,.35);border-radius:6px;background:rgba(36,30,52,.6)";
        const tr = hud.querySelector('.hud-tr'); if (tr) tr.insertBefore(hudEl, tr.firstChild); else hud.appendChild(hudEl);
      }
      if (!S.save || !S.save.clock) return;
      const narrow = window.innerWidth < 600, c = st(), t = STR[lg === 'vi' ? 'vi' : 'en'];
      if (narrow !== hudNarrow) {   /* màn hẹp (mobile): khung riêng dưới nút ☰/📷 (top 52..92 px), không đè nhãn vùng bên trái lẫn nút touch */
        hudNarrow = narrow; const tr = hud.querySelector('.hud-tr');
        if (narrow) { hudEl.style.position = 'absolute'; hudEl.style.top = '100px'; hudEl.style.right = '10px'; hud.appendChild(hudEl); }
        else { hudEl.style.position = 'static'; if (tr) tr.insertBefore(hudEl, tr.firstChild); }
      }
      const text = narrow ? `${clock.seasonName(lg)} ${t.dayShort(c.day)} ${c.hour}:${String(c.minute).padStart(2, '0')}` : clock.label(lg);
      if (text !== hudText) { hudText = text; hudEl.textContent = text; }
    }
  };
  // tắt tab / đóng game: ghi giờ hiện tại ngay (rAF không chạy khi tab ẩn nên đồng hồ tự đứng)
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && S.save && S.save.clock) deps.persist(); });
  window.addEventListener('pagehide', () => { if (S.save && S.save.clock) deps.persist(); });
  if (W.want != null) { const set0 = clock.set; clock.set = o => { if (W.want == null && W.lockUrl && o && (o.hour != null || o.min != null)) return; set0(o); }; W.lockUrl = true; }   /* c38-dongho: có ?clock= thì preset gọi clock.set({hour}) không đè giờ test (ghi tay __S.save.clock.min vẫn được) */
  try { window.__clock38 = clock; } catch (e) { }   /* c38-dongho: móc test */
  try { window.__nbday121 = { left: () => nbLeft(st()), set: s => { const c = st(); if (c) { if (s > 0) c.nb121 = s; else delete c.nb121; } return nbLeft(st()); } }; } catch (e) { }   /* c70-detho: móc test ban ngày người mới */
  return clock;
}
