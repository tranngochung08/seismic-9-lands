// main.js — boot, game loop, zone loading, interaction, quests, hazards, rendering
import { initArt, ART, enterZone as artEnterZone, mapBuilt as artMapBuilt } from './art.js';
import { TS, T, O, PAL, tiles, buildTiles, buildObjects, charSheet, lookFor, rngFrom, hashStr, SKINS, mkCanvas, rockyObj } from './gfx.js';
import { loadRoster, membersOfLevel, pickNpcs, LEVEL_COLORS, isLeader, isBooster, ROSTER, byId, nationOf, findMember, nationGroups, nationStats } from './data.js';
import { ZONES, ZONE_LIST, freeTiles, getG, setG, isSolid, setSolid, removeObject, zoneTier, place, computeReach, hasObjectAt, rebuildPlot, tierCap, MAX_TIER, FLOW } from './world.js';
import { SYSTEMS } from './systems/index.js';
import * as AUDIO from './audio.js';
import { ITEMS, TOOLS, BAG_CAP, itemName, itemIcon } from './items.js';
import { obj as defineObject } from './gfx.js';
import { setNationLang } from './data.js';
import { Player, NPC } from './entities.js';
import { loadSave, writeSave, defaultSave, clearSave } from './save.js';
import { CONFIG } from './config.js';
import * as UI from './ui.js';
import { FRIEND, friendSheet, drawScarf, normalizeStory, storyItemsLeft, ITEMS3 } from './story.js';
import { initMenu, openMenu, closeMenu, toggleMenu, menuKey } from './menu.js';
import * as TITLE from './title.js';
import { createClock } from './clock.js';   /* F01: đồng hồ, lịch, hết ngày */

const $ = s => document.querySelector(s);
const cv = $('#c'), g = cv.getContext('2d');
const uiCv = $('#ui'), ug = uiCv.getContext('2d'); // full-resolution overlay for crisp text labels
const seis = $('#seis'), sg = seis.getContext('2d', { willReadFrequently: true });
let scale = 3, VW = 320, VH = 200;

const S = { mode: 'title', save: null, zone: null, map: null, player: null, npcs: [], guide: null, time: 0, near: null, gateLock: true, seisY: 0, quakeOn: 0, shakeAmp: 0, flash: 0, boltNext: 4, hazards: [], hazNext: 3, talking: null, lore: null };
const input = { up: false, down: false, left: false, right: false };
let interactQueued = false, escQueued = false, mapQueued = false, codexQueued = false;
/* con trỏ chuột kiểu Stardew (anh yêu cầu 2026-09-28): S.mouse = vị trí chuột trên canvas theo px logic; click trái trong 'play' = E; các hệ (ruộng) dùng CTX.mouseTile() để nhắm ô */
const MOUSE = { on: false, sx: 0, sy: 0 };
function mouseAt(e) { const r = cv.getBoundingClientRect(); MOUSE.on = true; MOUSE.sx = (e.clientX - r.left) / scale; MOUSE.sy = (e.clientY - r.top) / scale; }
cv.addEventListener('pointermove', e => { if (e.pointerType === 'touch') return; mouseAt(e); });
cv.addEventListener('pointerleave', () => { MOUSE.on = false; });
const CURSOR = { arrow: 'url(assets/px/ui/cursor_arrow.png) 1 1, auto', hand: 'url(assets/px/ui/cursor_hand.png) 9 2, pointer', tool: 'url(assets/px/ui/cursor_tool.png) 8 8, crosshair' };   /* PixelLab (px-farm2.py gen_cursors) */
let cursorNow = ''; function applyCursor() { const want = MOUSE.on && MOUSE.hit && S.mode === 'play' ? (CURSOR[MOUSE.cursor] || CURSOR.hand) : CURSOR.arrow; if (want !== cursorNow) { cursorNow = want; cv.style.cursor = want; document.body.style.cursor = CURSOR.arrow; } }
cv.addEventListener('pointerdown', e => { if (e.pointerType === 'touch' || e.button !== 0) return; mouseAt(e); if (S.mode === 'play') { interactQueued = true; e.preventDefault(); } });
const DEFAULT_OUTFIT = { skin: SKINS[0], hair: '#2b1d14', shirt: '#ffffff', pants: '#2f3b5e', hero: 'hung_b' };   /* hero: sheet riêng theo avatar anh Hùng (manifest chars.fixed.hung); chỉ có tác dụng ở chế độ px */
const zoneOfLevel = lv => lv < 0 ? 'village' : 'm' + lv;
S.closers = {}; S.sys = SYSTEMS;   // systems active in the current zone (a zone may restrict them: ZONES[id].systems = [ids])

// ---------- shared context for gameplay systems (src/systems/API.md) ----------
const CTX = {
  S, TS, T, O, PAL, g, VW, VH, input,
  getG, setG, isSolid, removeObject, place, freeTiles, computeReach, hasObjectAt,
  allNpcs: () => allNpcs(), membersOfLevel, nationOf, byId, isLeader, isBooster, nationGroups,
  charSheet, lookFor, mkCanvas, rngFrom, hashStr, rockyObj,
  setMode: m => setMode(m), registerCloser: (mode, fn) => { S.closers[mode] = fn; }, onAction: (mode, fn) => { (S.actions ||= {})[mode] = fn; },
  toast: (t, big) => UI.toast(t, big), bubble: (n, t, sec) => UI.bubble(n, t, sec), quake: s => quake(s), persist: () => persist(), lang: () => UI.lang(),
  openDialog: o => UI.openDialog(o), levelBadge: UI.levelBadge, avatarHTML: UI.avatarHTML,
  pop: (x, y, text, color = '#ffd45e') => { (S.pops ||= []).push({ x, y, text, color, t: 0 }); if (S.pops.length > 12) S.pops.shift(); },   /* plan-14: số nổi '+2 🪵' */
  panel: (id, inner) => { let el = document.getElementById('sys-' + id); if (!el) { el = document.createElement('div'); el.id = 'sys-' + id; el.className = 'ov'; el.hidden = true; el.innerHTML = `<div class="panel"></div>`; document.body.appendChild(el); el.panel = el.firstElementChild; } if (inner !== undefined) el.panel.innerHTML = inner; return el; },
  metIds: () => new Set(S.save.met),
  FLOW, dayT: () => S.dayT, darkness: () => S.dark, /* F01: theo đồng hồ game (ctx.clock): 0 ban ngày … 0,45 về khuya, đổi mượt */
  // ---- story ("Friend at Sea", src/story.js) ----
  FRIEND, friendSheet, drawScarf, ITEMS3,
  story: () => S.save.story,                                            // { act, step, items{}, rescued, attempts, flashback, seaDone, keepsake } — edit then ctx.persist()
  storyAct: act => { S.save.story.act = act; persist(); },
  travel: (id, entry = 'default') => { if (!ZONES[id] || fadeCb) return false; fadeTo(() => enterZone(id, entry)); return true; },   // fade out, load another zone
  finale: o => { setMode('end'); UI.openEnd(S.save.met.length, ROSTER.length, o); },            // custom end screen: { title, body, btn? } (Esc / button → play; credits button rolls credits)
  rollCredits: () => startCredits(), closeDialog: () => UI.dialogClose(),
  achieve: id => { if (!S.save.achievements.includes(id)) { S.save.achievements.push(id); if (UI.L.ach[id]) UI.toast(UI.L.achGot(UI.L.ach[id][0])); persist(); } },
  hazardsOff: v => { S.hazardsOff = !!v; },
  // ---- items & bag (save.inv is the bag; head-carried animals weigh 0) ----
  ITEMS, TOOLS, itemName: (id, lg) => itemName(id, lg || UI.lang()), itemIcon,
  bag: {
    count: id => S.save.inv[id] || 0,
    weight: () => Object.entries(S.save.inv).reduce((a, [k, n]) => a + (ITEMS[k]?.w || 0) * n, 0),
    cap: () => BAG_CAP + (S.bagBonus || 0),
    add: (id, n = 1) => { const w = ITEMS[id]?.w || 0; const room = w ? Math.max(0, Math.floor((CTX.bag.cap() - CTX.bag.weight()) / w)) : n; const k = Math.min(n, room); S.save.inv[id] = (S.save.inv[id] || 0) + k; persist(); if (k < n) UI.toast(UI.lang() === 'vi' ? 'Túi đầy!' : 'Bag is full!'); return k; },
    remove: (id, n = 1) => { const have = S.save.inv[id] || 0, k = Math.min(n, have); S.save.inv[id] = have - k; persist(); return k; },
    has: (id, n = 1) => (S.save.inv[id] || 0) >= n,
    setBonus: v => { S.bagBonus = v; }
  },
  tool: { tier: id => (S.save.toolTier || {})[id] || (S.save.tools?.[id] ? 1 : 0), set: (id, t) => { (S.save.toolTier ||= {})[id] = t; if (S.save.tools) S.save.tools[id] = t > 0; if (id === 'rod' && t > 0) S.save.tools.rodBought = true; persist(); } },
  defineObject: (name, w, h, fw, fh, fn, opts) => { if (!O[name]) defineObject(name, w, h, fw, fh, fn, opts); return name; },
  sfx: name => AUDIO.sfx(name),
  nationName: key => { const n = nationOf({ ro: [key] }); return n ? n.name : key; },
  // BFS on tiles from (x0,y0) to (x1,y1) in tile units; returns pixel waypoints (tile centres) or null. Limited to a box around both points.
  pathTo: (x0, y0, x1, y1, margin = 6) => {
    const m = S.map, bx0 = Math.max(0, Math.min(x0, x1) - margin), by0 = Math.max(0, Math.min(y0, y1) - margin), bx1 = Math.min(m.w - 1, Math.max(x0, x1) + margin), by1 = Math.min(m.h - 1, Math.max(y0, y1) + margin);
    const W = bx1 - bx0 + 1, H = by1 - by0 + 1, prev = new Int32Array(W * H).fill(-1), k = (x, y) => (y - by0) * W + (x - bx0);
    const q = [[x0, y0]]; prev[k(x0, y0)] = k(x0, y0);
    while (q.length) {
      const [x, y] = q.shift(); if (x === x1 && y === y1) break;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (nx < bx0 || ny < by0 || nx > bx1 || ny > by1) continue; if (prev[k(nx, ny)] !== -1 || (isSolid(m, nx, ny) && !(nx === x1 && ny === y1))) continue; prev[k(nx, ny)] = k(x, y); q.push([nx, ny]); }
    }
    if (prev[k(x1, y1)] === -1) return null;
    const out = []; let c = k(x1, y1); while (c !== k(x0, y0)) { out.push({ x: (c % W + bx0) * TS + 8, y: (Math.floor(c / W) + by0) * TS + 12 }); c = prev[c]; }
    return out.reverse();
  },
  // ---- districts: damage / ruin / repair / upgrade (state persisted per zone in save.districts) ----
  MAX_TIER, tierCap: () => tierCap(S.zone.tier || 0),
  plotAt: (tx, ty) => S.map.plots.findIndex(p => tx >= p.x && tx < p.x + p.w && ty >= p.y && ty < p.y + p.h),
  piecesOf: idx => S.map.objects.filter(o => o.plot === idx),
  hpMax: o => ({ wall: 3, corner: 4, flag: 2, board: 3, light: 2, house: 6, fountain: 5, rocky: 8 })[o.piece] || 3,
  damage: (o, amt = 1) => { if (o.plot === undefined || o.ruined) return false; o.hp = (o.hp ?? CTX.hpMax(o)) - amt; if (o.hp <= 0) ruinPiece(o); saveDistricts(); return o.hp <= 0; },
  repair: o => { if (!o.ruined) return; restorePiece(o); saveDistricts(); },
  upgradePlot: idx => { const p = S.map.plots[idx]; if (!p || p.tier >= tierCap(S.zone.tier || 0)) return null; const np = rebuildPlot(S.map, idx, p.tier + 1); saveDistricts(); return np; },
  districtState: idx => { const d = (S.save.districts[S.zone.id] || {})[idx] || {}; const pcs = S.map.objects.filter(o => o.plot === idx), r = pcs.filter(o => o.ruined).length; return { ...d, tier: S.map.plots[idx]?.tier, ruined: r, ruinedKeys: d.ruined || [], total: pcs.length, condition: pcs.length ? 1 - r / pcs.length : 1 }; },
  carry: { get: () => (S.save.sys.animals ||= {}).carry ||= [], remove: i => { const c = (S.save.sys.animals ||= {}).carry ||= []; const it = c.splice(i, 1)[0]; for (const k of Object.keys(ITEMS)) if (ITEMS[k].tags.includes('carry')) S.save.inv[k] = c.filter(x => (typeof x === 'string' ? x : x.kind) === k).length; persist(); return it; } },
  isRocky: () => S.player.pilot === 'rocky',
  alert: (text, ttl = 6, prio = 0) => { // up to 2 live lines: systems don't clobber each other. ttl Infinity = hold until the same source alerts ''
    const now = performance.now(); S.alerts = (S.alerts || []).filter(a => a.until > now);
    if (!text) { S.alerts = []; } else {
      const same = S.alerts.find(a => a.text.slice(0, 6) === text.slice(0, 6)); // same source (same leading emoji/word) → replace its line
      const entry = { text, prio, until: Number.isFinite(ttl) ? now + ttl * 1000 : Infinity };
      if (same) Object.assign(same, entry); else { S.alerts.push(entry); if (S.alerts.length > 2) { S.alerts.sort((a, b) => b.prio - a.prio); S.alerts.length = 2; } }
    }
    const el = $('#h-alert'); el.innerHTML = S.alerts.map(a => `<div>${a.text.replace(/</g, '&lt;')}</div>`).join(''); el.hidden = !S.alerts.length;
    clearTimeout(S._alertT); const next = Math.min(...S.alerts.map(a => a.until)); if (S.alerts.length && Number.isFinite(next)) S._alertT = setTimeout(() => CTX.alert(undefined), Math.max(50, next - now + 20));
  },
  trust: key => { const mine = S.npcs.filter(n => !n.m.guide && nationOf(n.m)?.key === key); if (!mine.length) return 0; const met = new Set(S.save.met); return mine.filter(n => met.has(n.m.id)).length / mine.length; }
};
/* ---------- F01 (plan-17): đồng hồ game + tiện ích plot cho module đợt 1 (hợp đồng: src/systems/API.md, docs/contract-dot1.md) ---------- */
const CLOCK = createClock({
  S, persist: () => persist(), fadeTo: cb => { if (fadeCb) return false; fadeTo(cb); return true; }, setMode: m => setMode(m),
  registerCloser: (m, fn) => { S.closers[m] = fn; }, onAction: (m, fn) => { (S.actions ||= {})[m] = fn; }, lang: () => UI.lang(), panel: id => CTX.panel(id), toast: t => UI.toast(t)
});
CTX.clock = CLOCK; CTX.season = () => CLOCK.season;
CTX.plotOf = (tx, ty) => { const i = CTX.plotAt(tx, ty); if (i < 0) return null; const p = S.map.plots[i]; p.idx = i; return p; };
/* nước của người chơi: save.self (Discord) → nước gặp nhiều nhất trong save.talks → null */
CTX.myNation = () => {
  const sv = S.save; if (!sv) return null;
  if (sv.nation !== undefined) return sv.nation === 'none' ? null : sv.nation;   /* plan-18: người chơi tự chọn (hoặc 'none' = không quốc gia) */
  if (sv.self && sv.self.id) { const m = byId.get(sv.self.id); const n = m && nationOf(m); if (n) return n.key; }
  const t = sv.talks || {}; let best = null, bn = 0; for (const [k, n] of Object.entries(t)) if (n > bn) { bn = n; best = k; }
  return best;
};
/* plot của nước người chơi trong vùng hiện tại; không có → plot gần người chơi nhất (giả định ghi trong contract-dot1.md); vùng không có plot → null */
CTX.myPlot = () => {
  const plots = S.map && S.map.plots; if (!plots || !plots.length) return null;
  const key = CTX.myNation(); let i = key ? plots.findIndex(p => p.nation === key) : -1;
  if (S.save && S.save.nation !== undefined && i < 0) return null;   /* plan-18: đã chọn nước (hoặc không nước) mà vùng này không có khu của nước đó → không có khu riêng */
  if (i < 0) { const p = S.player, px = p ? p.x / TS : 0, py = p ? p.y / TS : 0; let bd = Infinity; plots.forEach((q, j) => { const d = Math.hypot(q.x + q.w / 2 - px, q.y + q.h / 2 - py); if (d < bd) { bd = d; i = j; } }); }
  const p = plots[i]; p.idx = i; p.mine = p.nation === key; return p;
};
const pieceKey = o => `${o.orig || o.type}@${o.x},${o.y}`;
function ruinPiece(o) {
  const d = O[o.type]; o.orig = o.type; o.ruined = true; o.hp = 0;
  for (let j = 0; j < d.fh; j++) for (let i = 0; i < d.fw; i++) setSolid(S.map, o.x + i, o.y + j, 0);
  o.type = O[`rubble_${d.fw}x${d.fh}`] ? `rubble_${d.fw}x${d.fh}` : 'rubble_1x1';
}
function restorePiece(o) {
  o.type = o.orig; delete o.orig; o.ruined = false; o.hp = CTX.hpMax(o);
  const d = O[o.type]; if (d.solid) for (let j = 0; j < d.fh; j++) for (let i = 0; i < d.fw; i++) setSolid(S.map, o.x + i, o.y + j, 1);
}
function saveDistricts() {
  const z = (S.save.districts ||= {})[S.zone.id] ||= {};
  S.map.plots.forEach((p, i) => { const pcs = S.map.objects.filter(o => o.plot === i); z[i] = { tier: p.tier, ruined: pcs.filter(o => o.ruined).map(pieceKey), hp: Object.fromEntries(pcs.filter(o => !o.ruined && o.hp !== undefined && o.hp < CTX.hpMax(o)).map(o => [pieceKey(o), o.hp])) }; });
  clearTimeout(S._dsT); S._dsT = setTimeout(persist, 400); // raids hit many pieces per second: batch the localStorage write
}
function applyDistricts() {
  const z = (S.save.districts || {})[S.zone.id]; if (!z) return;
  S.map.plots.forEach((p, i) => {
    const d = z[i]; if (!d) return;
    if (d.tier !== undefined && d.tier !== p.tier) rebuildPlot(S.map, i, Math.min(d.tier, tierCap(S.zone.tier || 0)));
    for (const o of S.map.objects.filter(o => o.plot === i)) { const k = pieceKey(o); if (d.ruined?.includes(k)) ruinPiece(o); else if (d.hp && d.hp[k] !== undefined) o.hp = d.hp[k]; }
  });
}
const invText = () => {
  const i = S.save.inv || {}, parts = [`🪨 ${i.stone || 0}`];
  for (const [k, n] of Object.entries(i)) if (n > 0 && k !== 'stone' && ITEMS[k]) parts.push(`${ITEMS[k].icon} ${n}`);
  return parts.join(' · ') + ` · ⚖ ${Math.round(CTX.bag.weight())}/${CTX.bag.cap()}`;
};

// ---------- boot ----------
async function boot() {
  buildTiles(); buildObjects();
  const [, lore] = await Promise.all([loadRoster(), fetch('data/lore.json').then(r => r.json()), initArt(new URLSearchParams(location.search))]);
  { const dlg = ART.on && ART.man && ART.man.ui && ART.man.ui.dialog; if (dlg) { const im = f => { const i = new Image(); i.src = 'assets/px/' + f; return i; }; UI.setDialogArt({ px: !!dlg.frame, guide: dlg.guide ? dlg.guide.map(im) : null, bubble: dlg.bubble ? im(dlg.bubble) : null, tail: dlg.tail ? im(dlg.tail) : null }); } }   /* plan-12: asset hộp thoại */
  S.lore = lore;
  resize(); window.addEventListener('resize', resize);
  bindInput();
  const sv = loadSave();
  const qLang = new URLSearchParams(location.search).get('lang');
  UI.setLang(qLang === 'vi' || qLang === 'en' ? qLang : (sv ? sv.lang : 'en')); UI.applyStaticText();
  $('#t-cont').hidden = !sv;
  if (sv) $('#t-name').value = sv.name || '';
  $('#t-play').onclick = () => { if (loadSave() && !confirm(UI.L.newConfirm)) return; clearSave(); startGame(defaultSave()); };
  $('#t-cont').onclick = () => { const s = loadSave(); if (s) startGame(s); };
  $('#t-lang').onclick = () => { const l = UI.L === UI.STR.vi ? 'en' : 'vi'; UI.setLang(l); UI.applyStaticText(); TITLE.applyText(); if (S.save) { S.save.lang = l; writeSave(S.save); } };
  $('#t-find-btn').onclick = findMe; $('#t-find').addEventListener('keydown', e => { if (e.key === 'Enter') findMe(); });
  $('#h-close').onclick = () => { UI.closeHall(); setMode('play'); };
  $('#p-resume').onclick = () => setMode('play');
  $('#p-lang').onclick = () => { $('#t-lang').onclick(); };
  $('#p-quit').onclick = () => { persist(); location.reload(); };
  $('#t-fs').onclick = toggleFullscreen; $('#btn-fs').onclick = toggleFullscreen;
  $('#t-demo').onclick = () => { location.href = location.pathname + '?demo&lang=' + UI.lang(); };
  $('#btn-map').onclick = () => { mapQueued = true; }; $('#btn-codex').onclick = () => { codexQueued = true; };
  $('#m-close').onclick = () => { UI.closeMap(); setMode('play'); };
  $('#s-close').onclick = () => { UI.closeShop(); setMode('play'); };
  $('#c-close').onclick = () => { UI.closeCodex(); setMode('play'); };
  $('#n-close').onclick = () => { UI.closeNation(); setMode('play'); };
  $('#e-btn').onclick = () => { UI.closeEnd(); setMode('play'); };
  $('#e-credits').onclick = () => { UI.closeEnd(); startCredits(); };
  $('#cr-skip').onclick = () => { stopCredits(); };
  const toggleMusic = () => { const on = !AUDIO.isEnabled(); AUDIO.setEnabled(on); UI.setMusicLabel(on); if (S.save) { S.save.music = on; writeSave(S.save); } };
  $('#p-music').onclick = toggleMusic; $('#t-music').onclick = toggleMusic;
  initMenu({ S, CTX, setMode, actions: { lang: () => $('#t-lang').onclick(), music: toggleMusic, musicOn: () => AUDIO.isEnabled(), fs: toggleFullscreen, quit: () => { persist(); location.reload(); } } });   /* plan-10: menu phụ */
  AUDIO.setEnabled(sv ? sv.music !== false : true); UI.setMusicLabel(AUDIO.isEnabled());
  for (const ev of ['keydown', 'pointerdown']) window.addEventListener(ev, () => AUDIO.initAudio(), { passive: true }); // browsers only allow audio after a user gesture
  document.addEventListener('fullscreenchange', resize);
  setInterval(() => { if (cv.width !== VW * ART.hi || cv.height !== VH * ART.hi || Math.abs(cv.clientWidth - window.innerWidth) > 1 || Math.abs(cv.clientHeight - window.innerHeight) > 1) resize(); }, 500);
  setupDiscord();
  $('#loading').hidden = true; $('#title').hidden = false;
  TITLE.initTitle({ resize, persist: () => { if (S.save) persist(); } }); TITLE.showTitle();   /* plan-13 */
  for (const b of document.querySelectorAll('#title .btn')) if (ART.on && ART.man && ART.man.ui && ART.man.ui.title && ART.man.ui.title.btn) b.classList.add('px');
  requestAnimationFrame(loop);
  const q = new URLSearchParams(location.search);
  window.__S = S; window.__CTX = CTX;
  if (q.has('promo')) { import('./save.js').then(m => m.saveOff()); import('./promo.js').then(m => m.runPromo({ S, CTX, UI, enterZone, startGame, defaultSave, setMode, input })); return; }   /* video quảng bá: ?promo&art=px&lang=vi (không đụng save thật) */
  if (q.has('demo')) { clearSave(); import('./demo.js').then(m => m.runDemo({ S, CTX, UI, enterZone, startGame, defaultSave, setMode, input })); return; } // guided auto-tour
  if (q.has('showcase')) { setTimeout(() => import('./showcase.js').then(m => m.runShowcase({ S, CTX, UI, setMode, enterZone })), 1500); }   /* bảng check nhanh tính năng mới (?auto&zone=village&showcase=dot1) */
  if (q.has('auto')) startGame(sv || defaultSave()); // debug: skip the title screen
  if (q.has('zone') && ZONES[q.get('zone')]) { S.save = S.save || defaultSave(); if (!S.player) startGame(S.save); enterZone(q.get('zone'), 'default'); }
  window.__S = S; window.__CTX = CTX;
}
function startGame(sv) {
  S.save = sv; sv.name = $('#t-name').value.trim().slice(0, 24) || sv.name; sv.lang = UI.L === UI.STR.vi ? 'vi' : 'en';
  sv.outfit = sv.outfit || { ...DEFAULT_OUTFIT }; if (sv.outfit.hero === undefined) sv.outfit.hero = DEFAULT_OUTFIT.hero;   /* save cũ → nhận nhân vật riêng */ sv.tasks = sv.tasks || {}; sv.flags = sv.flags || {}; sv.owned = sv.owned || []; sv.achievements = sv.achievements || [];
  const d = defaultSave(); sv.inv = { ...d.inv, ...(sv.inv || {}) }; sv.tools = { ...d.tools, ...(sv.tools || {}), rod: !!(sv.tools && sv.tools.rodBought) }; sv.cards = sv.cards || []; sv.sys = sv.sys || {}; sv.districts = sv.districts || {};
  sv.toolTier = { axe: 1, ...(sv.toolTier || {}) }; if (sv.tools.rod && !sv.toolTier.rod) sv.toolTier.rod = 1;
  normalizeStory(sv); CLOCK.init(sv);   /* F01: save cũ không có clock → Xuân · Ngày 1 · 6:00 */
  S.player = new Player(0, 0, charSheet(sv.outfit));
  enterZone(sv.zone in ZONES ? sv.zone : 'village', sv.entry);
  $('#title').hidden = true; TITLE.hideTitle(); $('#hud').hidden = false; setMode('play');
  if (sv.nation === undefined && !new URLSearchParams(location.search).has('auto') && CTX.openNationPicker) { setMode('pause'); CTX.openNationPicker(() => { setMode('play'); persist(); }); }   /* plan-18: chọn tên + quốc gia (ván mới / save cũ chưa chọn) */
}
function setMode(m) { S.mode = m; $('#pause').hidden = m !== 'pause'; }
function persist() { if (!S.save) return; S.save.zone = S.zone.id; writeSave(S.save); }
function toggleFullscreen() {
  const el = document.documentElement;
  if (document.fullscreenElement) document.exitFullscreen().catch(() => { });
  else (el.requestFullscreen ? el.requestFullscreen({ navigationUI: 'hide' }) : Promise.reject()).catch(() => UI.toast('F11'));
}
function findMe() {
  const m = findMember($('#t-find').value); if (!m) { UI.toast(UI.L.notFound); return; }
  const sv = loadSave() || defaultSave(); sv.target = m.id; sv.zone = zoneOfLevel(m.lv); sv.entry = 'default';
  startGame(sv); UI.toast(UI.L.targetWaiting(m.n, S.zone.name[UI.lang()]), true);
}

// ---------- zones ----------
function enterZone(id, entry) {
  const z = ZONES[id]; artEnterZone(id);
  if (S.zone) for (const sys of S.sys) { try { sys.onZoneLeave?.(CTX); } catch (e) { console.error(sys.id, e); } }
  setNationLang(UI.lang());
  S.nations = nationGroups(z.lv); // nations present at this level, biggest first → one fenced district each (names localized)
  const saved = (S.save.districts || {})[id] || {};
  const map = z.build(rngFrom(hashStr(id)), { nations: S.nations.map((g, i) => ({ key: g.key, size: g.members.length, tier: saved[i]?.tier })) });
  S.zone = z; z.tier = zoneTier(id); S.map = map; artMapBuilt(map); S.sys = z.systems ? SYSTEMS.filter(sy => z.systems.includes(sy.id)) : SYSTEMS; S.save.zone = id; S.save.entry = entry; S.hazards = []; S.hazNext = 3; S.talking = null;
  const e = map.entries[entry] || map.entries.default;
  S.player.x = e.x * TS + 8; S.player.y = e.y * TS + 14; S.player.dir = 0;
  const rng = rngFrom(hashStr(id) ^ Math.floor(Date.now() / 864e5));
  let members = pickNpcs(z.lv, 48, rng);
  // Elders (M8): the top artists of the land always appear and carry riddles
  if (z.elders) { const eld = membersOfLevel(z.lv).slice(0, z.elders); members = eld.concat(members.filter(m => !eld.includes(m))); for (const m of eld) m.elder = true; }
  // "Find me": the searched artist always stands near the entrance of their land
  const target = S.save.target ? byId.get(S.save.target) : null;
  if (target && target.lv === z.lv) members = [target].concat(members.filter(m => m.id !== target.id));
  const avoid = Object.values(map.entries).concat(map.specials);
  // everyone spawns inside their nation's district; artists without a nation wander the roads
  const placed = new Map();
  for (const p of map.plots) {
    const mine = members.filter(m => nationOf(m)?.key === p.nation); if (!mine.length) continue;
    const spots = freeTiles(map, rng, p.spawn, mine.length, [], 1, 2);
    mine.forEach((m, i) => { if (spots[i]) placed.set(m, spots[i]); });
  }
  const rest = members.filter(m => !placed.has(m));
  const spots = freeTiles(map, rng, map.npcArea, rest.length, avoid, 4);
  rest.forEach((m, i) => { if (spots[i]) placed.set(m, spots[i]); });
  if (target && target.lv === z.lv) { const near = freeTiles(map, rng, { x: e.x - 5, y: e.y - 5, w: 11, h: 6 }, 1, [e], 2); if (near.length) placed.set(target, near[0]); }
  S.npcs = members.filter(m => placed.has(m)).map(m => { const s = placed.get(m); return new NPC(m, s.x * TS + 8, s.y * TS + 14, charSheet(lookFor(m.id, LEVEL_COLORS[m.lv])), rngFrom(hashStr(m.id))); });
  AUDIO.setZone(z);
  S.guide = null;
  for (const sp of map.specials) {
    if (sp.kind === 'guide') { S.guide = new NPC({ guide: true }, sp.x * TS + 8, sp.y * TS + 14, charSheet({ skin: '#f6d3b5', hair: '#8a4a2c', shirt: '#2a2630', pants: '#2f2b3a', hero: 'noxx' }), rngFrom(7)); S.guide.radius = 24; }
    if (sp.kind === 'hermit') { // the hermit of the sea is a real artist: the most-reacted villager without a Magnitude role
      const hm = membersOfLevel(-1).slice().sort((a, b) => b.r - a.r)[0]; if (hm) { const n = new NPC(hm, sp.x * TS + 8, sp.y * TS + 14, charSheet({ skin: '#c98b5f', hair: '#e8e8e8', shirt: '#5a9c58', pants: '#3b2f2f' }), rngFrom(11)); n.radius = 20; n.hermit = true; S.npcs.push(n); }
    }
  }
  applyObjectStates(); applyDistricts();
  S.gateLock = true; S.quakeOn = 0; S.flash = 0; UI.showPrompt(null); CTX.alert(''); persist(); $('#touch-skills').hidden = !z.trench;
  for (const sys of S.sys) { try { sys.onZoneEnter?.(CTX); } catch (e) { console.error(sys.id, e); } }
  if (z.tremor > 0) setTimeout(() => quake(0.8 + z.tremor), 500); // a short tremor greets you when you arrive
}
const flagKey = o => `${S.zone.id}:${o.type.replace('_off', '').replace('_on', '')}:${o.x},${o.y}`;
function applyObjectStates() {
  const f = S.save.flags, m = S.map;
  for (const o of m.objects.slice()) {
    if (o.fire && f[flagKey(o)]) { o.type = 'campfire'; o.lit = true; }
    // levers stay pulled once done; also pre-pulled if you already hold this land's badge or arrive from the far side (never strand the player)
    if (o.lever && (f[flagKey(o)] || S.save.badges.includes(S.zone.lv) || S.save.entry === 'back')) { o.type = 'lever_on'; o.on = true; f[flagKey(o)] = true; }
    if ((o.ore || o.item) && f[flagKey(o)]) removeObject(m, o);
  }
  if (m.bridge) { const n = m.objects.filter(o => o.lever && o.on).length; if (n > taskVal('levers')) taskSet('levers', n); }
  applyBridge();
}
function applyBridge() {
  const m = S.map; if (!m.bridge) return;
  const open = m.objects.filter(o => o.lever && o.on).length >= 2;
  for (const t of m.bridge) setG(m, t.x, t.y, open ? T.BRIDGE : T.CHASM, !open);
}
function allNpcs() { return S.guide ? S.npcs.concat([S.guide]) : S.npcs; }
function metCountInZone() { const ids = new Set(S.save.met); return membersOfLevel(S.zone.lv).filter(m => ids.has(m.id)).length; }
function quake(seconds) { S.quakeOn = Math.max(S.quakeOn, seconds); }

// ---------- quests & tasks ----------
function questCount() {
  const q = S.zone.quest; if (!q) return 0; const ids = new Set(S.save.met);
  let list = membersOfLevel(S.zone.lv); if (q.leaders) list = list.filter(isLeader);
  return list.filter(m => ids.has(m.id)).length;
}
function taskVal(id) { const z = S.save.tasks[S.zone.id]; return z ? (z[id] || 0) : 0; }
function taskSet(id, v) { (S.save.tasks[S.zone.id] ||= {})[id] = v; }
function questComplete() {
  const q = S.zone.quest; if (!q) return false; if (questCount() < q.meet) return false;
  for (const t of q.tasks || []) if (taskVal(t.id) < t.n) return false;
  return true;
}
function taskText() { const q = S.zone.quest; if (!q || !q.tasks) return ''; return q.tasks.map(t => UI.L.tasks[t.id](Math.min(taskVal(t.id), t.n), t.n)).join(' · '); }
function checkQuest() {
  if (questComplete() && !S.save.badges.includes(S.zone.lv)) { S.save.badges.push(S.zone.lv); quake(1.5); setTimeout(() => UI.toast(UI.L.badge(S.zone.lv), true), 900); }
  checkAchievements(); persist();
}
const ACH = [
  { id: 'first', test: s => s.met.length >= 1 }, { id: 'ten', test: s => s.met.length >= 10 }, { id: 'hundred', test: s => s.met.length >= 100 },
  { id: 'leaders', test: s => ROSTER.filter(isLeader).every(m => s.met.includes(m.id)) }, { id: 'boosters', test: s => ROSTER.filter(isBooster).every(m => s.met.includes(m.id)) },
  { id: 'badges', test: s => [1, 2, 3, 4, 5, 6, 7, 8, 9].every(l => s.badges.includes(l)) },
  { id: 'nations', test: s => new Set(s.met.map(id => { const n = nationOf(byId.get(id) || {}); return n && n.key; }).filter(Boolean)).size >= 10 },
  { id: 'shop', test: s => s.owned.length >= 1 }, { id: 'scholar', test: s => Object.values(s.tasks).some(t => t.quiz >= 1) },
  // granted by systems (photo / sea_life / sumo / pet push the id themselves); listed here so the Codex shows them
  ...['photographer', 'captain', 'sumo', 'pet', 'rescue', 'keepsake'].map(id => ({ id, test: s => s.achievements.includes(id) }))
];
function checkAchievements() {
  for (const a of ACH) if (!S.save.achievements.includes(a.id) && a.test(S.save)) { S.save.achievements.push(a.id); setTimeout(() => UI.toast(UI.L.achGot(UI.L.ach[a.id][0])), 1600); }
}
const SHOWN_ZONES = () => ZONE_LIST.filter(z => !z.hidden);   // the Kraken Trench is reached from the pier, not from the map
function openWorldMap() { setMode('map'); UI.openMap(SHOWN_ZONES(), S.save, S.zone.id, id => { setMode('play'); fadeTo(() => enterZone(id, 'default')); }); }
function openCodex() { setMode('codex'); UI.openCodex(S.save, SHOWN_ZONES(), ACH.map(a => ({ id: a.id, done: S.save.achievements.includes(a.id) })), ROSTER.length); }
// the main quest line in the HUD
function storyText() {
  const st = S.save.story, lg = UI.lang(); if (!st) return '';
  if (st.act === 2) return UI.L.storyGather(ITEMS3.map(k => `${itemIcon(k)}${st.items[k] ? '✓' : '·'}`).join(' '));
  if (st.act === 3) return S.zone.id === 'trench' ? UI.L.storyInTrench : UI.L.storyDive;
  return '';
}

// ---------- input ----------
const KEYS = { ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right' };
function bindInput() {
  window.addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT') { if (e.code === 'Escape') e.target.blur(); return; }
    if (S.mode === 'quiz') { UI.quizKey(e.code); e.preventDefault(); return; }
    if (S.mode === 'menu' && menuKey(e.code)) { e.preventDefault(); return; }   /* plan-10: đổi thẻ, nuốt phím đi */
    if ((e.code === 'KeyB' || e.code === 'KeyI' || e.code === 'KeyQ') && (S.mode === 'play' || S.mode === 'menu') && S.save && S.map) { toggleMenu(e.code === 'KeyQ' ? 'quest' : 'bag'); e.preventDefault(); return; }
    for (const sys of S.sys) if (sys.key && sys.key(e.code, CTX)) { e.preventDefault(); return; }
    if (KEYS[e.code]) { input[KEYS[e.code]] = true; e.preventDefault(); }
    if (e.code === 'KeyE' || e.code === 'Space' || e.code === 'Enter') { if (!e.repeat) interactQueued = true; e.preventDefault(); } // holding the key must not count as mashing
    if (e.code === 'Escape') escQueued = true;
    if (e.code === 'KeyF') toggleFullscreen();
    if (e.code === 'KeyM') mapQueued = true;
    if (e.code === 'KeyC') codexQueued = true;
  });
  window.addEventListener('keyup', e => { if (KEYS[e.code]) input[KEYS[e.code]] = false; });
  window.addEventListener('blur', () => { for (const k in input) input[k] = false; });
  for (const b of document.querySelectorAll('#touch [data-k]')) {
    const k = b.dataset.k, on = e => { e.preventDefault(); input[k] = true; }, off = e => { e.preventDefault(); input[k] = false; };
    b.addEventListener('pointerdown', on); b.addEventListener('pointerup', off); b.addEventListener('pointercancel', off); b.addEventListener('pointerleave', off);
  }
  $('#btn-a').addEventListener('pointerdown', e => { e.preventDefault(); interactQueued = true; });
  $('#btn-menu').addEventListener('pointerdown', e => { e.preventDefault(); escQueued = true; });
  $('#btn-photo').addEventListener('pointerdown', e => { e.preventDefault(); window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyP', key: 'p' })); }); // touch: photo mode (photo.js listens for KeyP)
  for (const b of document.querySelectorAll('#touch-skills [data-skill]')) b.addEventListener('pointerdown', e => { e.preventDefault(); window.dispatchEvent(new KeyboardEvent('keydown', { code: b.dataset.skill, key: b.textContent })); }); // touch: Rocky skills in the trench (trench.js listens for Digit1..3)
  $('#dialog').addEventListener('pointerdown', e => { if (S.mode === 'dialog') { e.preventDefault(); UI.dialogAdvance(); } });
}
function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  scale = Math.max(2, Math.round(w / 340)); if (h / scale < 150) scale = Math.max(2, Math.floor(h / 150));
  { let pref = 0; try { pref = +localStorage.getItem('seismic.scale') || 0; } catch (e) { } if (pref >= 2 && w / pref >= 200) scale = pref; }   /* plan-13: tỉ lệ pixel người chơi chọn */
  VW = Math.ceil(w / scale); VH = Math.ceil(h / scale);
  if (ART.on) scale = Math.max(ART.hi, Math.round(scale / ART.hi) * ART.hi), VW = Math.ceil(w / scale), VH = Math.ceil(h / scale); // bội của hi → mỗi pixel art = số nguyên pixel màn hình
  cv.width = VW * ART.hi; cv.height = VH * ART.hi; cv.style.width = w + 'px'; cv.style.height = h + 'px'; g.setTransform(ART.hi, 0, 0, ART.hi, 0, 0); g.imageSmoothingEnabled = false;
  uiCv.width = w; uiCv.height = h; uiCv.style.width = w + 'px'; uiCv.style.height = h + 'px';
  CTX.VW = VW; CTX.VH = VH; CTX.scale = scale;
  CTX.mouseTile = () => MOUSE.on && CTX.cam ? { tx: Math.floor((CTX.cam.cx + MOUSE.sx) / TS), ty: Math.floor((CTX.cam.cy + MOUSE.sy) / TS), wx: CTX.cam.cx + MOUSE.sx, wy: CTX.cam.cy + MOUSE.sy } : null;
}

// ---------- interaction ----------
const KIND = o => o.bed ? 'bed' : o.hall ? 'hall' : o.rocky ? 'rocky' : o.nation ? 'nation' : o.shop ? 'shop' : o.fire ? 'fire' : o.ore ? 'ore' : o.lever ? 'lever' : o.quiz ? 'quiz' : o.item ? 'item' : o.text ? 'sign' : null;
function findNear() {
  const p = S.player; let best = null, bd = Infinity;
  /* chuột kiểu Stardew: thứ đang trỏ (NPC / vật thể / neo của hệ) trong tầm với (≤ 1,5× tầm E) thắng mọi thứ khác; MOUSE.hit → con trỏ bàn tay */
  const mt = CTX.mouseTile && CTX.mouseTile(); MOUSE.hit = false; let hitBest = null, hitD = Infinity;
  const hover = (cand, dist, limit) => { if (dist < limit * 1.5 && dist < hitD) { hitD = dist; hitBest = cand; } };
  const consider = (cand, dist, limit, bias = 0) => { if (dist < limit && dist - bias < bd) { bd = dist - bias; best = cand; } }; // bias: systems may claim priority over NPCs/objects
  for (const n of allNpcs()) { if (n.m.friend) continue; const dist = Math.hypot(n.x - p.x, n.y - p.y); consider({ kind: 'npc', npc: n }, dist, 22); if (mt && Math.abs(mt.wx - n.x) < 9 && mt.wy > n.y - 22 && mt.wy < n.y + 4) hover({ kind: 'npc', npc: n }, dist, 22); }   // the story friend is handled by the story systems' near()
  for (const o of S.map.objects) {
    const kind = KIND(o); if (!kind) continue; if ((kind === 'fire' && o.lit) || (kind === 'lever' && o.on)) continue;
    const d = O[o.type];
    const cx = o.x * TS + d.fw * 8, cy = (o.y + d.fh) * TS - 4, dist = Math.hypot(cx - p.x, cy - p.y), lim = 24 + d.fw * 4;
    consider({ kind, obj: o }, dist, lim);
    if (mt && mt.wx >= o.x * TS && mt.wx < (o.x + d.fw) * TS && mt.wy >= (o.y + d.fh) * TS - Math.max(d.h, d.fh * TS) && mt.wy < (o.y + d.fh) * TS) hover({ kind, obj: o }, dist, lim);
  }
  for (const sys of S.sys) { let c = null; try { c = sys.near && sys.near(CTX); } catch (e) { console.error(sys.id, e); } if (c) { const dist = Math.hypot(c.x - p.x, c.y - p.y), cand = { kind: 'sys', sys, cand: c, label: c.label }; consider(cand, dist, c.limit ?? 24, (typeof c.priority === 'number' ? c.priority : c.priority ? 1 : 0) * 1000); if (mt && c.mouse !== false && Math.hypot(mt.wx - c.x, mt.wy - c.y) < 14) hover(cand, dist, c.limit ?? 24); } } // priority: true 
  if (hitBest) { MOUSE.hit = true; MOUSE.cursor = hitBest.kind === 'sys' && hitBest.cand.cursor || 'hand'; return hitBest; }   /* priority: true (=1) or a number; higher wins */
  if (best && best.kind === 'sys' && best.cand.mouse) { MOUSE.hit = true; MOUSE.cursor = best.cand.cursor || 'hand'; }   /* hệ tự nhắm theo chuột (ruộng) → cũng đổi con trỏ */
  return best;
}
const PROMPT = { npc: 'talk', bed: 'sleep', sign: 'read', hall: 'hall', nation: 'nationBoard', rocky: 'rocky', shop: 'shop', fire: 'light', ore: 'mine', lever: 'pull', quiz: 'study', item: 'pickup' };
function interact() {
  const n = S.near; if (!n) return; const lg = UI.lang(), o = n.obj;
  if (n.kind === 'sys') { try { n.sys.interact?.(CTX, n.cand); } catch (e) { console.error(n.sys.id, e); if (S.mode !== 'play') setMode('play'); } return; }
  switch (n.kind) {
    case 'sign': setMode('dialog'); UI.openDialog({ title: '📜', pages: [o.text[lg]], onClose: () => setMode('play') }); return;
    case 'bed': CLOCK.sleep(false); return;   /* F01: ngủ chủ động → hết ngày */
    case 'hall': setMode('hall'); UI.openHall(S.zone.lv); return;
    case 'nation': case 'rocky': { const st = nationStats(o.nation, S.zone.lv); if (!st) return; setMode('nation'); UI.openNation(st, S.save, S.zone.tier || 0); if (CTX.nationBoardExtra) CTX.nationBoardExtra(o.nation); return; }   /* plan-18: nút gia nhập/đổi nước */
    case 'shop': setMode('shop'); UI.openShop(S.save, shopPick); return;
    case 'fire': o.type = 'campfire'; o.lit = true; S.save.flags[flagKey(o)] = true; taskSet('fires', taskVal('fires') + 1); UI.toast(UI.L.fireLit); checkQuest(); return;
    case 'ore': S.save.flags[flagKey(o)] = true; removeObject(S.map, o); S.save.shards++; taskSet('ore', taskVal('ore') + 1); UI.toast(UI.L.oreMined); quake(0.3); checkQuest(); return;
    case 'item': S.save.flags[flagKey(o)] = true; removeObject(S.map, o); taskSet('obsidian', taskVal('obsidian') + 1); UI.toast(UI.L.itemGot); checkQuest(); return;
    case 'lever': {
      o.type = 'lever_on'; o.on = true; S.save.flags[flagKey(o)] = true; taskSet('levers', taskVal('levers') + 1);
      const open = S.map.objects.filter(x => x.lever && x.on).length >= 2; applyBridge();
      UI.toast(open ? UI.L.bridgeUp : UI.L.bridgeNeed, open); if (open) quake(1.2); checkQuest(); return;
    }
    case 'quiz': {
      const pool = S.lore.library.slice(); for (let i = pool.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0;[pool[i], pool[j]] = [pool[j], pool[i]]; }
      setMode('quiz');
      UI.openQuiz({ title: UI.L.quizLibrary, questions: pool.slice(0, 5), sources: S.lore.sources, onDone: (score, n) => { setMode('play'); if (score >= 4) { taskSet('quiz', 1); UI.toast(UI.L.quizPass(score, n), true); } else UI.toast(UI.L.quizFail(score, n, 4), true); checkQuest(); } });
      return;
    }
  }
  const npc = n.npc; S.player.faceTo(npc.x, npc.y); S.talking = npc;
  { const nat = npc.m && !npc.m.guide ? nationOf(npc.m) : null; if (nat) { (S.save.talks ||= {})[nat.key] = ((S.save.talks || {})[nat.key] || 0) + 1; } }   /* plan-15: nước hay trò chuyện → người cứu */
  if (npc.m.guide) {
    const first = !S.save.seenGuide, st = S.save.story; S.save.seenGuide = true;
    let pages;
    if (st.flashback) { st.flashback = false; pages = UI.L.guideFlashback.concat(UI.L.guideStory); }        // old save: the tale of the raft and the Kraken, then the errand
    else if (st.act === 2 && !st.guideStoryTold) { st.guideStoryTold = true; pages = (first ? UI.L.guideFirst.slice(0, 1) : []).concat(UI.L.guideStory); }
    else if (st.act === 2) pages = [UI.L.guideGather(storyItemsLeft(st).map(k => itemName(k, UI.lang())).join(', '))];
    else if (st.act === 3) pages = [UI.L.guideDive];
    else if (st.act === 4) pages = [UI.L.guideAfter];
    else pages = first ? UI.L.guideFirst : [UI.L.guideAgain[(Math.random() * UI.L.guideAgain.length) | 0]];
    setMode('dialog'); UI.openDialog({ guide: true, pages, onClose: () => { setMode('play'); S.talking = null; persist(); } });
    return;
  }
  const m = npc.m, first = !S.save.met.includes(m.id);
  const pages = UI.linesFor(m, S.zone, first, rngFrom(hashStr(m.id) ^ (Date.now() | 0)), lg);
  if (m.elder && !S.save.flags[`m8:elder:${m.id}`]) pages.push(UI.L.elderIntro);
  setMode('dialog');
  UI.openDialog({
    m, pages, onClose: () => {
      setMode('play'); S.talking = null;
      if (first) { S.save.met.push(m.id); S.save.shards++; UI.toast(UI.L.shardGet); if (isLeader(m)) quake(1); if (S.save.target === m.id) S.save.target = null; }
      if (m.elder && !S.save.flags[`m8:elder:${m.id}`]) { elderRiddle(m); return; }
      checkQuest();
    }
  });
}
function elderRiddle(m) {
  const idx = membersOfLevel(8).indexOf(m) % S.lore.elders.length;
  setMode('quiz');
  UI.openQuiz({ title: UI.L.quizElder, questions: [S.lore.elders[idx]], sources: S.lore.sources, onDone: score => { setMode('play'); if (score >= 1) { S.save.flags[`m8:elder:${m.id}`] = true; taskSet('elders', taskVal('elders') + 1); UI.toast(UI.L.elderOk, true); } else UI.toast(UI.L.elderWrong); checkQuest(); } });
}
function shopPick(part, color) {
  const d = UI.SHOP[part], key = part + ':' + color, owned = d.cost === 0 || S.save.owned.includes(key);
  if (!owned) { if (S.save.shards < d.cost) { UI.toast(UI.L.notEnough); return; } S.save.shards -= d.cost; S.save.owned.push(key); UI.toast(UI.L.bought); }
  S.save.outfit[part] = color; S.player.sheet = charSheet(S.save.outfit); checkAchievements(); persist();
}
function checkGates() {
  const p = S.player, tx = Math.floor(p.x / TS), ty = Math.floor((p.y - 3) / TS);
  let onGate = null;
  for (const gt of S.map.gates) if (tx >= gt.x && tx < gt.x + gt.w && ty >= gt.y && ty < gt.y + gt.h) onGate = gt;
  if (!onGate) { S.gateLock = false; return; }
  if (S.gateLock) return;
  S.gateLock = true;
  if (onGate.requires && !S.save.badges.includes(onGate.requires)) { UI.toast(UI.L.locked(onGate.requires)); pushBack(onGate); return; }
  if (onGate.to === 'end') { pushBack(onGate); setMode('end'); UI.openEnd(S.save.met.length, ROSTER.length); return; }
  if (!ZONES[onGate.to]) { pushBack(onGate); return; }
  fadeTo(() => enterZone(onGate.to, onGate.entry));
}
function pushBack(gt) { const p = S.player; if (gt.y <= 1) p.y += 12; else if (gt.x <= 1) p.x += 12; else if (gt.x >= S.map.w - 3) p.x -= 12; else p.y -= 12; }
let fade = 0, fadeCb = null;
function fadeTo(cb) { fade = 0.01; fadeCb = cb; }

// ---------- hazards (M4 falling rocks, M7 lava spurts) ----------
function updateHazards(dt) {
  const hz = S.zone.hazard; if (!hz || S.mode !== 'play' || S.hazardsOff) return;
  S.hazNext -= dt; if (S.hazNext <= 0) { S.hazNext = 1.6 + Math.random() * 2; spawnHazard(hz); }
  for (const h of S.hazards) {
    h.t -= dt;
    if (h.phase === 'warn' && h.t <= 0) { h.phase = 'hit'; h.t = hz === 'rock' ? 2.5 : 0.7; hazardHit(h); }
    else if (h.phase === 'hit' && h.t <= 0) h.dead = true;
  }
  S.hazards = S.hazards.filter(h => !h.dead);
}
function nearLava(tx, ty) { for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if (getG(S.map, tx + dx, ty + dy) === T.LAVA) return true; return false; }
function spawnHazard(hz) {
  const p = S.player, ptx = Math.floor(p.x / TS), pty = Math.floor(p.y / TS);
  for (let i = 0; i < 25; i++) {
    const tx = ptx + ((Math.random() * 11) | 0) - 5, ty = pty + ((Math.random() * 9) | 0) - 4;
    if (isSolid(S.map, tx, ty)) continue; if (hz === 'lava' && !nearLava(tx, ty)) continue;
    S.hazards.push({ x: tx, y: ty, t: hz === 'rock' ? 1.0 : 0.8, phase: 'warn', kind: hz }); return;
  }
}
function hazardHit(h) {
  const p = S.player, b = p.box(), hx = h.x * TS, hy = h.y * TS;
  if (!(b.x < hx + TS && b.x + b.w > hx && b.y < hy + TS && b.y + b.h > hy)) return;
  const dx = Math.sign(p.x - (hx + 8)) || 1, dy = Math.sign(p.y - (hy + 8)) || 1;
  p.tryMove(dx * 12, dy * 12, S.map, allNpcs()); p.tryMove(dx * 6, dy * 6, S.map, allNpcs());
  if (S.save.shards > 0) { S.save.shards--; UI.toast(UI.L.hazardHit); } else UI.toast(UI.L.hazardHitNoShard);
  quake(0.5); persist();
}

// ---------- discord "play as yourself" (needs CONFIG.DISCORD_CLIENT_ID) ----------
function setupDiscord() {
  const wrap = $('#t-discord-wrap'); if (!CONFIG.DISCORD_CLIENT_ID) { wrap.hidden = true; return; }
  const redirect = CONFIG.DISCORD_REDIRECT || (location.origin + location.pathname);
  $('#t-discord').onclick = () => { location.href = `https://discord.com/oauth2/authorize?client_id=${encodeURIComponent(CONFIG.DISCORD_CLIENT_ID)}&response_type=token&redirect_uri=${encodeURIComponent(redirect)}&scope=identify`; };
  const h = new URLSearchParams(location.hash.slice(1)); const tok = h.get('access_token');
  if (!tok) return; history.replaceState(null, '', location.pathname + location.search);
  fetch('https://discord.com/api/users/@me', { headers: { Authorization: 'Bearer ' + tok } }).then(r => r.json()).then(u => {
    const m = byId.get(u.id); if (!m) { UI.toast(UI.L.discordNotMember, true); return; }
    const sv = loadSave() || defaultSave(); sv.self = { id: m.id, name: u.global_name || u.username, avatar: u.avatar ? `https://cdn.discordapp.com/avatars/${u.id}/${u.avatar}.png?size=64` : m.a }; sv.name = sv.self.name;
    writeSave(sv); $('#t-cont').hidden = false; $('#t-name').value = sv.name; UI.toast(UI.L.discordOk(sv.self.name), true);
  }).catch(() => UI.toast(UI.L.discordFail));
}
let selfImg = null;
function selfAvatar() { if (!S.save.self) return null; if (!selfImg) { selfImg = new Image(); selfImg.src = S.save.self.avatar; } return selfImg.complete && selfImg.naturalWidth ? selfImg : null; }

// ---------- credits ----------
let credits = null;
function startCredits() { setMode('credits'); credits = { y: 0, names: (S.save.story?.rescued ? [`♥ ${FRIEND.n} — ${FRIEND.title[UI.lang()]}`, ''] : []).concat(ROSTER.map(m => m.n)) }; $('#credits').hidden = false; }   // once Lyron is home, his name opens the credits
function stopCredits() { credits = null; $('#credits').hidden = true; setMode('play'); }

// ---------- loop ----------
let last = 0;
function loop(t) {
  const dt = Math.min(0.05, (t - last) / 1000 || 0); last = t; S.time += dt;
  if (S.mode !== 'title') { update(dt); render(); }
  requestAnimationFrame(loop);
}
function update(dt) {
  if (escQueued) {
    escQueued = false;
    const closers = { play: () => openMenu(), menu: () => closeMenu(), pause: () => setMode('play'), dialog: () => UI.dialogClose(), hall: () => { UI.closeHall(); setMode('play'); }, map: () => { UI.closeMap(); setMode('play'); }, end: () => { UI.closeEnd(); setMode('play'); }, shop: () => { UI.closeShop(); setMode('play'); }, codex: () => { UI.closeCodex(); setMode('play'); }, nation: () => { UI.closeNation(); setMode('play'); }, credits: stopCredits };
    if (closers[S.mode]) closers[S.mode](); else if (S.closers[S.mode]) S.closers[S.mode]();
  }
  if (mapQueued) { mapQueued = false; if (S.mode === 'play') openWorldMap(); else if (S.mode === 'map') { UI.closeMap(); setMode('play'); } }
  if (codexQueued) { codexQueued = false; if (S.mode === 'play') openCodex(); else if (S.mode === 'codex') { UI.closeCodex(); setMode('play'); } }
  if (interactQueued) {
    interactQueued = false;
    if (S.mode === 'play') interact(); else if (S.mode === 'dialog') UI.dialogAdvance(); else if (S.mode === 'credits') stopCredits();
    else if (S.actions && S.actions[S.mode]) { try { S.actions[S.mode](); } catch (e) { console.error(e); } } // E / touch A inside a system's own mode
  }
  if (credits) { credits.y += dt * 60 * scale; if (credits.y > (credits.names.length / 4 + 12) * 22 * (scale / 2) + uiCv.height) stopCredits(); }
  // screen shake only on events (entering a land, earning a badge, lightning, meeting a Leader) — never continuously
  const tr = S.zone.tremor;
  if (S.quakeOn > 0) S.quakeOn -= dt;
  S.shakeAmp = S.quakeOn > 0 ? Math.min(S.quakeOn, 1) * (2 + tr * 4) : 0;
  if (S.zone.lightning) { S.boltNext -= dt; if (S.boltNext <= 0) { S.flash = 0.7; S.boltNext = 8 + Math.random() * 10; quake(0.5); } }
  S.flash = Math.max(0, S.flash - dt * 2.5);
  if (fade > 0) { fade += dt * 2.5; if (fade >= 1 && fadeCb) { fadeCb(); fadeCb = null; } if (fade >= 2) fade = 0; }
  if (S.save && S.save.clock) { CLOCK.tick(dt, CTX); S.dayT = CLOCK.dayT(); S.dark = CLOCK.darkness(); CLOCK.hud(UI.lang()); } else { S.dayT = 0; S.dark = 0; }   /* F01: đồng hồ game thay chu kỳ 10 phút giờ máy */
  const others = allNpcs();
  if (S.mode === 'play' && !fadeCb) { S.player.update(dt, input, S.map, others); checkGates(); }
  else { S.player.moving = false; S.player.animate(dt); }
  for (const sys of S.sys) { try { sys.update?.(dt, CTX); } catch (e) { console.error(sys.id, e); } }
  for (const n of others) n.update(dt, S.map, others.concat([S.player]), S.talking === n ? S.player : null);
  updateHazards(dt);
  if (S.pops && S.pops.length) { for (const q of S.pops) q.t += dt; S.pops = S.pops.filter(q => q.t < 1.1); }
  S.near = S.mode === 'play' ? findNear() : null;
  /* plan-12: đứng cạnh nghệ sĩ ~0,8 s → họ nói một câu chào ngắn trong bong bóng (mỗi người tối đa 1 lần / 40 s) */
  if (S.near && S.near.npc && !S.near.npc.m.guide) { const n = S.near.npc; S.nearT = (S.nearT || 0) + dt; if (S.nearT > 0.8 && !n.bubble && (!n.bubbleAt || S.time - n.bubbleAt > 40)) { n.bubbleAt = S.time; const hi = UI.L.hi; if (hi) UI.bubble(n, hi[hashStr('hi' + n.m.id + Math.floor(S.time / 40)) % hi.length], 2.6); } } else S.nearT = 0;
  UI.showPrompt(S.near ? `E · ${S.near.kind === 'sys' ? S.near.label : UI.L[PROMPT[S.near.kind]]}` : null); applyCursor();
  let it = invText(); for (const sys of S.sys) { if (!sys.hudLines) continue; try { for (const l of sys.hudLines(CTX) || []) it += ' · ' + l; } catch (e) { } }
  if (it !== S._inv) { S._inv = it; $('#h-inv').textContent = it; }
  const q = S.zone.quest, target = S.save.target ? byId.get(S.save.target) : null;
  UI.updateHud({ zone: S.zone, shards: S.save.shards, metInZone: metCountInZone(), totalInZone: membersOfLevel(S.zone.lv).length, quest: q ? q.meet : 0, questN: questCount(), leaders: !!(q && q.leaders), tasks: taskText(), done: questComplete(), target: target && target.lv === S.zone.lv ? UI.L.targetHere(target.n) : '', story: storyText() });
}

function render() {
  const m = S.map, p = S.player;
  const mw = m.w * TS, mh = m.h * TS;
  let cx = Math.round(p.x - VW / 2), cy = Math.round(p.y - 8 - VH / 2);
  cx = Math.max(0, Math.min(mw - VW, cx)); cy = Math.max(0, Math.min(mh - VH, cy));
  if (mw < VW) cx = -((VW - mw) >> 1); if (mh < VH) cy = -((VH - mh) >> 1);
  if (S.shakeAmp > 0) { cx += Math.round((Math.random() - 0.5) * S.shakeAmp * 2); cy += Math.round((Math.random() - 0.5) * S.shakeAmp * 2); }
  g.fillStyle = '#0d0b14'; g.fillRect(0, 0, VW, VH);
  const wf = Math.floor(S.time * 2) % 2;
  const x0 = Math.max(0, Math.floor(cx / TS)), y0 = Math.max(0, Math.floor(cy / TS)), x1 = Math.min(m.w - 1, Math.ceil((cx + VW) / TS) + (ART.ground ? 1 : 0)), y1 = Math.min(m.h - 1, Math.ceil((cy + VH) / TS) + (ART.ground ? 1 : 0));
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
    const t = m.ground[ty * m.w + tx]; const fr = tiles[t]; if (!fr) continue;
    const sx = tx * TS - cx, sy = ty * TS - cy;
    const handled = !!(ART.ground && ART.ground(g, m, tx, ty, sx, sy)); if (!handled) g.drawImage(fr.pick ? fr.pick(tx, ty) : fr[wf % fr.length], sx, sy);
    if (!handled && (t === T.WATER || t === T.DEEP)) {   // viền bọt theo ô chỉ cho art code; nền Wang có bờ hữu cơ riêng
      g.fillStyle = '#dff3ff'; const wat = v => v === T.WATER || v === T.DEEP || v === T.REEF;
      if (!wat(getG(m, tx, ty - 1)) && getG(m, tx, ty - 1) !== T.NONE) g.fillRect(sx, sy + (wf ? 1 : 0), TS, 1);
      if (!wat(getG(m, tx - 1, ty)) && getG(m, tx - 1, ty) !== T.NONE) g.fillRect(sx + (wf ? 1 : 0), sy, 1, TS);
    }
    if (m.flow) { const f = m.flow[ty * m.w + tx]; if (f) { // current arrows drift with the stream
      const ph = (S.time * 1.5 + tx * 0.3 + ty * 0.3) % 1, o = Math.round(ph * 12) - 6; g.fillStyle = 'rgba(230,248,255,.55)';
      const ax = sx + 8 + (f === FLOW.R ? o : f === FLOW.L ? -o : 0), ay = sy + 8 + (f === FLOW.D ? o : f === FLOW.U ? -o : 0);
      if (f === FLOW.R) { g.fillRect(ax - 3, ay - 2, 1, 1); g.fillRect(ax - 2, ay - 1, 1, 1); g.fillRect(ax - 1, ay, 1, 1); g.fillRect(ax - 2, ay + 1, 1, 1); g.fillRect(ax - 3, ay + 2, 1, 1); }
      else if (f === FLOW.L) { g.fillRect(ax + 3, ay - 2, 1, 1); g.fillRect(ax + 2, ay - 1, 1, 1); g.fillRect(ax + 1, ay, 1, 1); g.fillRect(ax + 2, ay + 1, 1, 1); g.fillRect(ax + 3, ay + 2, 1, 1); }
      else if (f === FLOW.D) { g.fillRect(ax - 2, ay - 3, 1, 1); g.fillRect(ax - 1, ay - 2, 1, 1); g.fillRect(ax, ay - 1, 1, 1); g.fillRect(ax + 1, ay - 2, 1, 1); g.fillRect(ax + 2, ay - 3, 1, 1); }
      else { g.fillRect(ax - 2, ay + 3, 1, 1); g.fillRect(ax - 1, ay + 2, 1, 1); g.fillRect(ax, ay + 1, 1, 1); g.fillRect(ax + 1, ay + 2, 1, 1); g.fillRect(ax + 2, ay + 3, 1, 1); }
    } }
  }
  if (ART.groundDone) ART.groundDone(g);   /* decor Wang tràn ô vẽ sau cùng */
  for (const gt of m.gates) { const open = !gt.requires || S.save.badges.includes(gt.requires); g.fillStyle = open ? 'rgba(255,212,94,.18)' : 'rgba(255,31,75,.15)'; g.fillRect(gt.x * TS - cx, gt.y * TS - cy, gt.w * TS, gt.h * TS); }
  // hazard warnings (shadows) under everything
  for (const h of S.hazards) if (h.phase === 'warn') { const k = 1 - h.t / (h.kind === 'rock' ? 1.0 : 0.8); g.fillStyle = h.kind === 'rock' ? `rgba(0,0,0,${0.15 + k * 0.4})` : `rgba(255,80,0,${0.2 + k * 0.5})`; g.beginPath(); g.ellipse(h.x * TS + 8 - cx, h.y * TS + 10 - cy, 3 + k * 5, 2 + k * 3, 0, 0, 7); g.fill(); }
  // depth-sorted drawables
  const draws = [];
  for (const o of m.objects) { const d = O[o.type]; const by = (o.y + d.fh) * TS; if (by < cy - 8 || o.y * TS > cy + VH + 48 || o.x * TS > cx + VW || (o.x + d.fw) * TS < cx) continue; draws.push({ y: by, f: () => { const im = o.artImg || (d.frames ? d.frames[Math.floor(S.time * (d.animFlag ? 9 : 6) + o.x * 3 + o.y) % d.frames.length] : d.img); g.drawImage(im, o.x * TS - cx + (o.artImg ? 0 : (d.ox || 0)), by - (o.artImg ? im.height / ART.hi : d.h) - cy + (o.artImg ? 0 : (d.oy || 0))); } }); }
  for (const n of allNpcs()) draws.push({ y: n.y, n });
  draws.push({ y: p.y, n: p, self: true });
  for (const h of S.hazards) {
    if (h.kind === 'rock') { if (h.phase === 'warn') { const k = 1 - h.t; draws.push({ y: h.y * TS + 16 + 100, f: () => g.drawImage(O.rock_s.img, h.x * TS - cx, h.y * TS - cy - (1 - k) * 70) }); } else draws.push({ y: h.y * TS + 16, f: () => g.drawImage(O.rock_s.img, h.x * TS - cx, h.y * TS - cy) }); }
    else if (h.phase === 'hit') draws.push({ y: h.y * TS + 16, f: () => { const r = 4 + Math.sin(S.time * 40) * 2; g.fillStyle = '#ff8c1a'; g.beginPath(); g.ellipse(h.x * TS + 8 - cx, h.y * TS + 6 - cy, r, r * 1.6, 0, 0, 7); g.fill(); g.fillStyle = '#ffd45e'; g.beginPath(); g.ellipse(h.x * TS + 8 - cx, h.y * TS + 8 - cy, r * 0.5, r, 0, 0, 7); g.fill(); } });
  }
  CTX.g = g; CTX.cam = { cx, cy };
  for (const sys of S.sys) { if (!sys.drawables) continue; try { for (const d of sys.drawables(CTX, cx, cy) || []) draws.push(d); } catch (e) { console.error(sys.id, e); } }
  draws.sort((a, b) => a.y - b.y);
  for (const d of draws) {
    if (!d.n) { d.f(); continue; }
    g.save(); g.translate(-cx, -cy);
    const n = d.n, mm = n.m;
    if (mm && isBooster(mm)) { g.strokeStyle = 'rgba(255,212,94,.9)'; g.lineWidth = 1; g.beginPath(); g.ellipse(Math.round(n.x), Math.round(n.y) - 1, 8, 3, 0, 0, 7); g.stroke(); }
    if (mm && isLeader(mm)) { g.fillStyle = '#b3123a'; g.fillRect(Math.round(n.x) - 8, Math.round(n.y) - 15, 2, 10); g.fillRect(Math.round(n.x) + 6, Math.round(n.y) - 15, 2, 10); g.fillStyle = '#ffd45e'; g.fillRect(Math.round(n.x) - 2, Math.round(n.y) - 21, 5, 2); g.fillRect(Math.round(n.x) - 2, Math.round(n.y) - 23, 1, 2); g.fillRect(Math.round(n.x), Math.round(n.y) - 23, 1, 2); g.fillRect(Math.round(n.x) + 2, Math.round(n.y) - 23, 1, 2); }
    if (mm && mm.elder) g.drawImage(O.elder_mark.img, Math.round(n.x) - 8, Math.round(n.y) - 28);
    n.draw(g); g.restore();
  }
  for (const gt of m.gates) if (gt.requires && !S.save.badges.includes(gt.requires)) g.drawImage(O.lock.img, gt.gx * TS + 16 - cx, gt.gy * TS - 12 - cy);
  for (const sys of S.sys) { try { sys.draw?.(g, CTX, cx, cy); } catch (e) { console.error(sys.id, e); } }
  drawWeather();
  if (S.zone.tint) { g.fillStyle = S.zone.tint; g.fillRect(0, 0, VW, VH); }
  if (S.dark > 0.02) { // gentle night + warm glow around every lamp, torch, campfire and crystal light; the lighthouse sweeps the sea
    g.fillStyle = `rgba(10,12,40,${S.dark.toFixed(3)})`; g.fillRect(0, 0, VW, VH);
    const LIGHT = { lantern: 22, torch: 20, campfire: 18, crystal_p: 24, crystal_b: 20, lighthouse: 30, gcrystal: 44, vent: 10 };
    g.save(); g.globalCompositeOperation = 'lighter';
    for (const o of m.objects) { const r = LIGHT[o.type]; if (!r || o.ruined) continue; const d = O[o.type], lx = o.x * TS + d.fw * 8 - cx, ly = (o.y + d.fh) * TS - 10 - cy; if (lx < -r || ly < -r || lx > VW + r || ly > VH + r) continue; const gr = g.createRadialGradient(lx, ly, 2, lx, ly, r); gr.addColorStop(0, `rgba(255,200,110,${(S.dark * 1.6).toFixed(3)})`); gr.addColorStop(1, 'rgba(255,200,110,0)'); g.fillStyle = gr; g.fillRect(lx - r, ly - r, r * 2, r * 2); }
    g.restore();
  }
  if (m.sea) { const lh = m.objects.find(o => o.lighthouse); if (lh) { const lx = lh.x * TS + 16 - cx, ly = lh.y * TS + 32 - 58 - cy, a = S.time * 0.9; g.save(); g.globalAlpha = 0.22 + S.dark; g.fillStyle = '#fff3b0'; g.beginPath(); g.moveTo(lx, ly); g.lineTo(lx + Math.cos(a) * 160 - Math.sin(a) * 14, ly + Math.sin(a) * 160 + Math.cos(a) * 14); g.lineTo(lx + Math.cos(a) * 160 + Math.sin(a) * 14, ly + Math.sin(a) * 160 - Math.cos(a) * 14); g.closePath(); g.fill(); g.restore(); } }
  if (S.zone.vignette) { const gr = g.createRadialGradient(VW / 2, VH / 2, VH * 0.3, VW / 2, VH / 2, VH * 0.9); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(10,0,30,.75)'); g.fillStyle = gr; g.fillRect(0, 0, VW, VH); }
  if (S.flash > 0) { g.fillStyle = `rgba(255,255,255,${(S.flash * 0.8).toFixed(2)})`; g.fillRect(0, 0, VW, VH); }
  if (fade > 0) { g.fillStyle = `rgba(0,0,0,${fade <= 1 ? fade : 2 - fade})`; g.fillRect(0, 0, VW, VH); }
  drawLabels(cx, cy);
  drawSeis(tr());
}
const tr = () => S.zone.tremor;
// ambient particles per land: leaves (M3), dust (M4), ash (M7), snow (M8), embers (M9)
const WEATHER = { m3: { n: 18, c: '#7fd14b', vx: 12, vy: 18, s: 2 }, m4: { n: 10, c: 'rgba(200,190,170,.5)', vx: 3, vy: -6, s: 1 }, m7: { n: 30, c: 'rgba(120,110,120,.8)', vx: -8, vy: 14, s: 2 }, m8: { n: 40, c: '#ffffff', vx: 20, vy: 26, s: 2 }, m9: { n: 24, c: '#b48cff', vx: 4, vy: -12, s: 1 } };
function drawWeather() {
  const w = WEATHER[S.zone.id]; if (!w) return; g.fillStyle = w.c;
  for (let i = 0; i < w.n; i++) {
    const h = hashStr('p' + i), ox = h % 1000, oy = (h >>> 10) % 1000, ph = (h >>> 20) % 100 / 100;
    const x = ((ox + S.time * (w.vx + ph * 6) + Math.sin(S.time * 1.5 + ph * 6) * 6) % (VW + 20) + VW + 20) % (VW + 20) - 10;
    const y = ((oy + S.time * (w.vy + ph * 8)) % (VH + 20) + VH + 20) % (VH + 20) - 10;
    g.fillRect(Math.round(x), Math.round(y), w.s, w.s);
  }
}
// name labels on the full-resolution overlay canvas (crisp text)
function drawLabels(cx, cy) {
  const p = S.player, fs = Math.max(10, scale * 3);
  ug.clearRect(0, 0, uiCv.width, uiCv.height);
  if (credits) { drawCredits(); return; }
  ug.font = `bold ${fs}px "Segoe UI",system-ui,sans-serif`; ug.textAlign = 'center'; ug.textBaseline = 'bottom';
  const label = (text, x, y, color, mark) => {
    const sx = Math.round((x - cx) * scale), sy = Math.round((y - 20 - cy) * scale);
    if (sx < -100 || sx > uiCv.width + 100 || sy < -20 || sy > uiCv.height + 20) return;
    const w = ug.measureText(text).width + 8, h = fs + 4;
    ug.fillStyle = 'rgba(13,11,20,.6)'; ug.beginPath(); ug.roundRect(sx - w / 2, sy - h, w, h, 3); ug.fill();
    ug.fillStyle = color; ug.fillText(text, sx, sy - 2);
    if (mark) { ug.fillStyle = '#ffd45e'; ug.beginPath(); ug.moveTo(sx - 4, sy - h - 8); ug.lineTo(sx + 4, sy - h - 8); ug.lineTo(sx, sy - h - 2); ug.fill(); }
  };
  for (const n of allNpcs()) {
    if (n.bubble) UI.drawBubble(ug, n, Math.round((n.x - cx) * scale), Math.round((n.y - 20 - cy) * scale) - fs - 6, fs);   /* plan-12: bong bóng nổi */
    const mm = n.m, met = !mm.guide && S.save.met.includes(mm.id), isT = S.save.target === mm.id;
    const pre = mm.guide ? '' : mm.friend ? '♥ ' : isT ? '➤ ' : isLeader(mm) ? '★ ' : mm.elder ? '☆ ' : isBooster(mm) ? '⚡ ' : '';
    label(pre + (mm.guide ? UI.L.guideName : mm.n), n.x, n.y - (mm.elder ? 8 : 0), isT ? '#ffd45e' : met ? '#9ad' : (mm.guide || mm.friend ? '#ffd45e' : '#fff'), S.near && S.near.npc === n);
  }
  ug.font = `${Math.max(9, scale * 2.6)}px "Segoe UI",system-ui,sans-serif`;
  for (const o of S.map.objects) if (o.flag && o.label) { const grp = S.nations.find(n => n.key === o.flag); label(UI.flagLabel(o.flag) + (grp ? ` · ${grp.members.length}` : ''), o.x * TS + 24, o.y * TS - 14, '#f2ebe0', false); }
  ug.font = `bold ${fs}px "Segoe UI",system-ui,sans-serif`;
  const av = selfAvatar();
  if (av) { const sx = Math.round((p.x - cx) * scale), sy = Math.round((p.y - 22 - cy) * scale), r = Math.round(scale * 4); ug.save(); ug.beginPath(); ug.arc(sx, sy - r, r, 0, 7); ug.clip(); ug.drawImage(av, sx - r, sy - 2 * r, 2 * r, 2 * r); ug.restore(); ug.strokeStyle = '#ffd45e'; ug.lineWidth = 2; ug.beginPath(); ug.arc(sx, sy - r, r, 0, 7); ug.stroke(); }
  else if (S.save.name) label(S.save.name, p.x, p.y, '#ffd45e', false);
  if (S.pops && S.pops.length) {   /* plan-14: số nổi bay lên rồi mờ (dùng label() sẵn có cho chắc) */
    ug.font = `bold ${Math.max(11, Math.round(scale * 3.6))}px VT323, "Segoe UI", monospace`;
    for (const q of S.pops) { const k = q.t / 1.1; ug.globalAlpha = k < 0.7 ? 1 : Math.max(0, 1 - (k - 0.7) / 0.3); label(q.text, q.x, q.y + 12 - k * 18, q.color, false); }
    ug.globalAlpha = 1; ug.font = `bold ${fs}px "Segoe UI",system-ui,sans-serif`;
  }
  for (const sys of S.sys) { try { sys.drawUI?.(ug, CTX, cx, cy, scale); } catch (e) { console.error(sys.id, e); } }
}
function drawCredits() {
  const W = uiCv.width, H = uiCv.height, cols = W < 600 ? 2 : 4, colW = W / cols, lh = 22 * (scale / 2), fs = Math.max(11, scale * 4);
  ug.fillStyle = 'rgba(13,11,20,.85)'; ug.fillRect(0, 0, W, H);
  ug.textAlign = 'center'; ug.textBaseline = 'top';
  let y = H - credits.y;
  ug.font = `bold ${fs * 2.2}px "Segoe UI",system-ui,sans-serif`; ug.fillStyle = '#ffd45e'; ug.fillText('SEISMIC · 9 LANDS', W / 2, y); y += lh * 3;
  ug.font = `${fs}px "Segoe UI",system-ui,sans-serif`; ug.fillStyle = '#a79a86'; ug.fillText(UI.lang() === 'vi' ? `${ROSTER.length.toLocaleString()} nghệ sĩ của #artwork` : `${ROSTER.length.toLocaleString()} artists of #artwork`, W / 2, y); y += lh * 3;
  ug.fillStyle = '#f2ebe0';
  for (let i = 0; i < credits.names.length; i++) { const row = Math.floor(i / cols), ry = y + row * lh; if (ry < -lh || ry > H) continue; ug.fillText(credits.names[i], colW * (i % cols) + colW / 2, ry); }
}
function drawSeis(t) {
  const w = seis.width, h = seis.height;
  const img = sg.getImageData(1, 0, w - 1, h); sg.clearRect(0, 0, w, h); sg.putImageData(img, 0, 0);
  const amp = 1 + t * 2 + S.shakeAmp * 2;
  const y = h / 2 + (Math.random() - 0.5) * amp * 2;
  sg.fillStyle = LEVEL_COLORS[S.zone.lv]; sg.fillRect(w - 1, Math.min(y, S.seisY || y), 1, Math.max(1, Math.abs(y - (S.seisY || y)))); S.seisY = y;
}

boot().catch(e => { console.error(e); $('#loading').textContent = 'Error: ' + e.message; });
