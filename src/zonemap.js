// zonemap.js — plan-44 D4 + D7: thẻ "Vùng này" trong bảng bản đồ (M).
//   Ảnh thu nhỏ CẢ vùng đang đứng (nền Wang / ô + vật thể — cùng cách sky.js landImage dựng mặt đất nhìn từ trời),
//   rồi ghim: bạn · việc nhiệm vụ còn lại (lửa chưa đốt, quặng, cần gạt, thư viện, obsidian, trưởng lão, Leader chưa gặp, lò nung chuông lặn)
//   · lối ra (tên vùng đích, khoá thì hồng) · nghệ sĩ chưa gặp · nghệ sĩ đang tìm (Tìm tôi) · kho báu thư trong chai (khi đang giữ, ở Biển).
//   Icon: ảnh PixelLab ui/zmap/*.png (tools/px-zonemap.py, manifest ui.zmap) + vương miện ui/hud/crown; chưa có ảnh → chấm màu (dự phòng).
import { ART } from './art.js';
import { TS, O, tiles as TILES } from './gfx.js';
import { ZONES, isSolid } from './world.js';
import { isLeader } from './data.js';
import { mapPins as f106Pins, NET as F106NET } from './systems/farm106.js';   /* c23-farmmap: khu quái / thủ lĩnh / Chấn Thú hoang / chấm quái trên Làng */

const IMG = {};
function icon(k) {
  if (IMG[k] !== undefined) return IMG[k] && IMG[k].complete && IMG[k].naturalWidth ? IMG[k] : null;
  const f = k === 'rare' ? 'ui/zmap/rare.png' : k === 'fight' ? 'ui/hud91/act_fight.png' : ART.man && ART.man.ui && ((ART.man.ui.zmap || {})[k] || (k === 'crown' ? ART.man.ui.crown : null));   /* p52d: icon Chấn Thú hiếm (PixelLab, chưa vào manifest) */
  IMG[k] = null; if (typeof f === 'string') { const im = new Image(); im.onload = () => { if (REDRAW) REDRAW(); }; im.src = 'assets/px/' + f; IMG[k] = im; }
  return null;
}
let REDRAW = null, RD_T = 0;   /* ảnh icon nạp xong khi bảng đang mở → vẽ lại 1 lần */
export function preloadZoneIcons() { for (const k of ['you', 'quest', 'exit', 'artist', 'treasure', 'crown', 'whirl', 'rare', 'fight']) icon(k); }
/* plan-44 đợt D: chuỗi riêng của module (ui.js không thuộc phạm vi đợt này) */
const ZS = {
  vi: { whirl: 'Xoáy nước', seaGoal: 'Mục tiêu biển', walkHint: 'Chạm / bấm vào bản đồ để tự đi tới đó (chạm cần điều khiển hoặc bấm phím đi để dừng).', noPath: 'Không có đường đi tới chỗ đó', goalNow: 'mục tiêu lúc này', tooClose: 'Bạn đang đứng ngay đó rồi', busy: 'Lúc này chưa tự đi được',
    cmp: { whirl: 'xoáy nước', plank: 'ván trôi', reef: 'sò (rạn sáng)', hermit: 'ẩn sĩ', current: 'hải lưu', dock: 'bến tàu', treasure: 'kho báu' } },
  en: { whirl: 'Whirlpool', seaGoal: 'Sea goal', walkHint: 'Tap / click the map to walk there (touch the stick or press a move key to stop).', noPath: 'No way to get there', goalNow: 'current goal', tooClose: 'You are already there', busy: 'Cannot walk there right now',
    cmp: { whirl: 'whirlpool', plank: 'drifting plank', reef: 'shells (reef)', hermit: 'hermit', current: 'current', dock: 'pier', treasure: 'treasure' } }
};
export const zstr = lg => ZS[lg === 'vi' ? 'vi' : 'en'];

/* nền vùng: dựng 1 lần cho mỗi bản đồ (ô + vật) — vật bị gỡ (quặng đã đào…) thì dựng lại */
let BASE = null;
function baseOf(m) {
  const sig = m.objects.length;
  if (BASE && BASE.m === m && BASE.sig === sig) return BASE.c;
  const W = m.w * TS, H = m.h * TS, c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
  for (let ty = 0; ty < m.h; ty++) for (let tx = 0; tx < m.w; tx++) { const sx = tx * TS, sy = ty * TS, t = m.ground[ty * m.w + tx];
    if (!(ART.ground && ART.ground(g, m, tx, ty, sx, sy))) { const fr = TILES[t]; if (fr) g.drawImage(fr.pick ? fr.pick(tx, ty) : fr[0], sx, sy); } }
  if (ART.groundDone) ART.groundDone(g);
  for (const o of m.objects.slice().sort((p, q) => (p.y + (O[p.type] ? O[p.type].fh : 1)) - (q.y + (O[q.type] ? O[q.type].fh : 1)))) {
    const d = O[o.type]; if (!d || o.ghost) continue; const im = o.artImg || (d.frames ? d.frames[0] : d.img); if (!im) continue; const by = (o.y + d.fh) * TS;
    try { g.drawImage(im, o.x * TS + (o.artImg ? 0 : (d.ox || 0)), by - (o.artImg ? im.height / (ART.hi || 1) : d.h) + (o.artImg ? 0 : (d.oy || 0))); } catch (e) { }
  }
  BASE = { m, sig, c }; return c;
}

/* các ghim của vùng hiện tại (toạ độ thế giới px) */
let LL = {};
export function zonePins(S, CTX, lg) {
  const m = S.map, sv = S.save, vi = lg === 'vi', met = new Set(sv.met || []), pins = [], L = LL;
  const zq = S.zone.quest, done = zq && sv.badges.includes(S.zone.lv), st = sv.story || {};
  const objC = o => { const d = O[o.type] || { fw: 1, fh: 1 }; return { x: o.x * TS + d.fw * 8, y: (o.y + d.fh) * TS - 6 }; };
  if (!done) for (const o of m.objects) {
    let k = null;
    if (o.fire && !o.lit) k = 'zFire'; else if (o.ore) k = 'zOre'; else if (o.lever && !o.on) k = 'zLever'; else if (o.quiz && !((sv.tasks[S.zone.id] || {}).quiz >= 1)) k = 'zQuiz'; else if (o.item) k = 'zObs';
    if (k) pins.push({ ...objC(o), kind: 'quest', label: L[k] || k });
  }
  if (S.zone.id === 'm4' && st.act >= 2 && st.items && !st.items.divebell) { const f = m.objects.find(o => o.type === 'craft_furnace'); if (f) pins.push({ ...objC(f), kind: 'quest', label: L.zFurnace }); }
  if (S.zone.id === 'm6' && st.act >= 2 && st.items && !st.items.trenchmap) { const f = m.objects.find(o => o.quiz); if (f && !pins.some(p => p.label === L.zQuiz)) pins.push({ ...objC(f), kind: 'quest', label: L.zQuiz }); }
  for (const n of S.npcs || []) {
    const mm = n.m; if (!mm || mm.guide || mm.friend || n.hermit && met.has(mm.id)) continue;
    if (sv.target === mm.id) { pins.push({ x: n.x, y: n.y - 8, kind: 'target', label: (L.zTarget || '') + ': ' + mm.n }); continue; }
    if (met.has(mm.id)) continue;
    if (zq && zq.leaders && isLeader(mm)) pins.push({ x: n.x, y: n.y - 8, kind: 'leader', label: L.zLeader });
    else if (mm.elder && !sv.flags[`m8:elder:${mm.id}`]) pins.push({ x: n.x, y: n.y - 8, kind: 'quest', label: L.zElder });
    else pins.push({ x: n.x, y: n.y - 8, kind: 'artist', label: L.zArtist, small: true });
  }
  const seen = new Set();
  for (const gt of m.gates || []) {
    const Z = ZONES[gt.to]; const key = gt.to + ':' + Math.round(gt.x / 6) + ':' + Math.round(gt.y / 6); if (seen.has(key)) continue; seen.add(key);
    let name = Z ? Z.name[vi ? 'vi' : 'en'] : gt.to === 'end' ? (vi ? 'Kết thúc' : 'The end') : gt.to;
    if (Z && Z.road) { const R = Z.road, other = ZONES[R.lower === S.zone.id ? R.upper : R.lower]; if (other) name = (vi ? 'Đèo → ' : 'Pass → ') + other.name[vi ? 'vi' : 'en']; }   /* lối xuống đèo: ghi vùng ở đầu kia của đèo */
    pins.push({ x: (gt.x + gt.w / 2) * TS, y: (gt.y + gt.h / 2) * TS, kind: 'exit', label: name, locked: !!(gt.requires && !sv.badges.includes(gt.requires)) });
  }
  if (m.sea && m.dock) pins.push({ x: m.dock.x * TS + 8, y: m.dock.y * TS + 8, kind: 'exit', label: L.zDock });
  if (m.sea && typeof window !== 'undefined' && window.__raft) {   /* plan-44 đợt D: Biển — xoáy nước + mục tiêu biển hiện tại (cùng mục tiêu kim la bàn, sea_raft.js compassGoal) */
    const Z = zstr(lg); let info = null, cp = null; try { info = window.__raft.info(); cp = window.__raft.compass(); } catch (e) { }
    const gw = !!(S.sea && S.sea.goal === 'whirl');
    if (info && info.whirls) for (const w of info.whirls) pins.push({ x: w.x * TS + 8, y: w.y * TS + 8, kind: 'whirl', label: Z.whirl, goal: gw });
    const g = cp && cp.goal; if (g && g.k && !['whirl', 'dock', 'treasure'].includes(g.k)) pins.push({ x: g.x, y: g.y, kind: 'quest', label: `${Z.seaGoal}: ${Z.cmp[g.k] || g.k}` });
  }
  if (S.sea && S.sea.treasure) pins.push({ x: S.sea.treasure.x * TS + 8, y: S.sea.treasure.y * TS + 8, kind: 'treasure', label: `${L.zTreasure} (${S.sea.treasure.x}, ${S.sea.treasure.y})` });
  try { if (CTX && CTX.chanthu && CTX.chanthu.pins) for (const q of CTX.chanthu.pins()) pins.push(q); } catch (e) { }   /* p52d (plan-58 C.4): Chấn Thú hiếm đang xuất hiện */
  try { for (const q of f106Pins(lg)) pins.push(q); } catch (e) { }   /* c23-farmmap */
  pins.push({ x: S.player.x, y: S.player.y - 6, kind: 'you', label: L.zYou });
  return pins;
}

const COL = { you: '#ffd45e', quest: '#ffb02e', exit: '#7fd1ff', artist: '#f2ebe0', target: '#ff6bd0', leader: '#ffd45e', treasure: '#ff5a4a', whirl: '#5ab8ff', rare: '#b48cff', farm: '#ff7a4a', lead: '#ffd45e', wild: '#b48cff', mob: '#ff4a3a' };
const ICO = { you: 'you', quest: 'quest', exit: 'exit', artist: 'artist', target: 'artist', leader: 'crown', treasure: 'treasure', whirl: 'whirl', rare: 'rare', farm: 'fight', lead: 'crown', wild: 'rare' };   /* c23-farmmap: farm / lead / wild (mob = chấm đỏ vẽ code) */
const F23 = { vi: { farm: 'Khu quái', lead: 'Thủ lĩnh (ở hang)', wild: 'Chấn Thú hoang (bắt được)', mob: 'Quái đang sống', go: 'bấm để đi tới' },
              en: { farm: 'Monster area', lead: 'Leader (in its den)', wild: 'Wild Quake Beast (catchable)', mob: 'Monsters alive', go: 'click to walk there' } };

/* vẽ vào canvas + chú thích (legendEl) */
export function drawZoneMap(cv, legendEl, S, CTX, lg, Lstr, onWalk) {
  LL = Lstr || {}; preloadZoneIcons();
  REDRAW = () => { const now = performance.now(); if (now - RD_T < 120 || !cv.isConnected || cv.offsetParent === null || S.mode !== 'map') return; RD_T = now; setTimeout(() => drawZoneMap(cv, legendEl, S, CTX, lg, Lstr, onWalk), 30); };
  const m = S.map, vi = lg === 'vi', base = baseOf(m), W0 = m.w * TS, H0 = m.h * TS;
  const pw = cv.parentElement && cv.parentElement.clientWidth, maxW = Math.max(220, Math.min(520, pw ? pw - 4 : 520)), maxH = 400, k = Math.min(maxW / W0, maxH / H0), cw = Math.round(W0 * k), ch = Math.round(H0 * k);
  const dpr = 2; cv.width = cw * dpr; cv.height = ch * dpr; cv.style.aspectRatio = `${cw} / ${ch}`;
  const g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
  g.fillStyle = '#0d0b14'; g.fillRect(0, 0, cw, ch); g.drawImage(base, 0, 0, cw, ch);
  g.fillStyle = 'rgba(13,11,20,.38)'; g.fillRect(0, 0, cw, ch);   /* nền tối nhẹ để ghim nổi */
  g.imageSmoothingEnabled = false;
  const pins = zonePins(S, CTX, lg), order = { mob: -1, artist: 0, exit: 1, farm: 1.5, whirl: 2, quest: 2, leader: 2, wild: 2.5, lead: 2.8, treasure: 3, rare: 3, target: 4, you: 5 };
  pins.sort((a, b) => (order[a.kind] || 0) - (order[b.kind] || 0));
  g.textAlign = 'center'; g.textBaseline = 'bottom'; g.font = 'bold 13px VT323, monospace';
  const TAG23 = [];   /* c23-farmmap: ô nhãn đã vẽ (lối ra + khu quái) */
  for (const p of pins) {
    if (p.kind === 'mob') { const x = Math.round(p.x * k), y = Math.round(p.y * k); g.fillStyle = '#1c1a24'; g.fillRect(x - 2, y - 2, 4, 4); g.fillStyle = p.ang ? '#ffb02e' : COL.mob; g.fillRect(x - 1, y - 1, 2, 2); continue; }   /* c23-farmmap: chấm quái đang sống (vẽ code, 2 px viền tối) */
    if (p.kind === 'farm' || p.kind === 'lead' || p.kind === 'wild') { const x = Math.round(p.x * k), y = Math.round(p.y * k), sz = p.kind === 'farm' ? 20 : p.kind === 'lead' ? 18 : 14, im = icon(ICO[p.kind]);   /* c23-farmmap */
      if (p.kind === 'farm') { g.fillStyle = 'rgba(255,122,74,.30)'; g.beginPath(); g.arc(x, y, 12, 0, 7); g.fill(); }
      g.globalAlpha = p.dead ? 0.45 : 1; if (im) g.drawImage(im, x - sz / 2, y - sz / 2, sz, sz); else { g.fillStyle = '#1c1a24'; g.beginPath(); g.arc(x, y, 4.5, 0, 7); g.fill(); g.fillStyle = COL[p.kind]; g.beginPath(); g.arc(x, y, 3.4, 0, 7); g.fill(); } g.globalAlpha = 1;
      if (p.kind === 'farm') { const t = p.lvT + ' · ' + p.n + '/' + p.tot, tw = g.measureText(t).width + 6, tx = Math.max(tw / 2 + 2, Math.min(cw - tw / 2 - 2, x));
        let ty = Math.min(ch - 2, y + 24); for (const oy of [24, 38, -12, 52, -26, 66]) { const yy = Math.max(14, Math.min(ch - 2, y + oy)); if (!TAG23.some(q => Math.abs(q.x - tx) < (q.w + tw) / 2 && Math.abs(q.y - yy) < 13)) { ty = yy; break; } }   /* c23-farmmap: nhãn không chồng nhãn khác */
        TAG23.push({ x: tx, y: ty, w: tw }); g.fillStyle = 'rgba(13,11,20,.78)'; g.fillRect(tx - tw / 2, ty - 13, tw, 13); g.fillStyle = '#ffc49a'; g.fillText(t, tx, ty); }
      continue; }
    const x = Math.round(p.x * k), y = Math.round(p.y * k), sz = p.small ? 12 : p.kind === 'you' ? 24 : p.kind === 'exit' ? 18 : 20, im = icon(ICO[p.kind]);
    if (p.kind === 'you') { g.fillStyle = 'rgba(255,212,94,.35)'; g.beginPath(); g.arc(x, y, 11, 0, 7); g.fill(); }
    else if (p.kind === 'quest' || p.kind === 'leader' || p.kind === 'treasure' || p.kind === 'target' || p.kind === 'rare' || p.goal) { g.fillStyle = 'rgba(255,246,200,.45)'; g.beginPath(); g.arc(x, y, 10, 0, 7); g.fill(); }   /* nền sáng tĩnh để việc cần làm nổi trên ảnh vùng */
    if (im) { g.globalAlpha = p.locked ? 0.55 : 1; g.drawImage(im, x - sz / 2, y - (p.kind === 'you' ? sz - 3 : sz / 2), sz, sz); g.globalAlpha = 1; }
    else { g.fillStyle = '#1c1a24'; g.beginPath(); g.arc(x, y, p.small ? 2.5 : 4.5, 0, 7); g.fill(); g.fillStyle = p.locked ? '#ff9a9a' : COL[p.kind]; g.beginPath(); g.arc(x, y, p.small ? 1.6 : 3.4, 0, 7); g.fill(); }
    if (p.kind === 'exit') { const t = p.label + (p.locked ? ' 🔒' : ''), tw = g.measureText(t).width + 6, ty = Math.min(ch - 2, Math.max(14, y - 8)), tx = Math.max(tw / 2 + 2, Math.min(cw - tw / 2 - 2, x));
      g.fillStyle = 'rgba(13,11,20,.75)'; g.fillRect(tx - tw / 2, ty - 13, tw, 13); g.fillStyle = p.locked ? '#ff9a9a' : '#bfe8ff'; g.fillText(t, tx, ty); TAG23.push({ x: tx, y: ty, w: tw }); }
  }
  /* chú thích: đếm theo loại + danh sách việc */
  if (legendEl) {
    const cnt = {}, quests = {}; for (const p of pins) { cnt[p.kind] = (cnt[p.kind] || 0) + 1; if (p.kind === 'quest' || p.kind === 'leader') quests[p.label] = (quests[p.label] || 0) + 1; }
    const L = LL, row = (kind, text) => { const f = kind === 'rare' || kind === 'wild' ? 'ui/zmap/rare.png' : kind === 'farm' ? 'ui/hud91/act_fight.png' : ART.man && ART.man.ui && ((ART.man.ui.zmap || {})[ICO[kind]] || (ICO[kind] === 'crown' ? ART.man.ui.crown : null)); return `<div class="zl"><span class="zi">${f ? `<img src="assets/px/${f}" alt="">` : `<i style="background:${COL[kind]}"></i>`}</span>${text}</div>`; };
    let h = row('you', L.zYou);
    const qk = Object.keys(quests); if (qk.length) for (const q of qk) h += row(q === L.zLeader ? 'leader' : 'quest', `${q} × ${quests[q]}`); else if (S.zone.quest) h += `<div class="zl dim">${L.zNothing}</div>`;
    if (cnt.target) h += row('target', pins.find(p => p.kind === 'target').label);
    if (cnt.artist) h += row('artist', `${L.zArtist} × ${cnt.artist}`);
    if (cnt.treasure) h += row('treasure', pins.find(p => p.kind === 'treasure').label);
    for (const p of pins) if (p.kind === 'rare') h += row('rare', p.label);
    if (cnt.whirl) h += row('whirl', `${zstr(lg).whirl} × ${cnt.whirl}${pins.some(p => p.kind === 'whirl' && p.goal) ? ' · ' + zstr(lg).goalNow : ''}`);
    { const T = F23[vi ? 'vi' : 'en'];   /* c23-farmmap: mỗi khu quái 1 dòng bấm được (tự đi tới) + thủ lĩnh / Chấn Thú hoang / quái đang sống */
      for (const p of pins) if (p.kind === 'farm') h += row('farm', `${p.label} · ${p.n}/${p.tot}`).replace('<div class="zl">', `<div class="zl zgo" data-x="${Math.round(p.x)}" data-y="${Math.round(p.y)}" title="${T.go}" style="cursor:pointer">`);
      const lds = pins.filter(p => p.kind === 'lead'); if (lds.length) h += row('lead', `${T.lead} × ${lds.filter(p => !p.dead).length}/${lds.length}`);
      if (cnt.wild) h += row('wild', `${T.wild} × ${cnt.wild}`);
      if (cnt.mob) h += `<div class="zl"><span class="zi"><b style="display:block;width:6px;height:6px;background:${COL.mob};outline:2px solid #1c1a24"></b></span>${T.mob} × ${cnt.mob}</div>`; }
    if (cnt.exit) h += row('exit', `${L.zExit} × ${cnt.exit}`);
    if (onWalk) h += `<div class="zl dim zwalk" id="m-zmsg">${zstr(lg).walkHint}</div>`;
    legendEl.innerHTML = h;
    legendEl.onclick = ev => { const r = ev.target.closest && ev.target.closest('.zgo'); if (r) pickWorld(+r.dataset.x, +r.dataset.y); };   /* c23-farmmap: bấm dòng khu quái -> tự đi tới */
  }
  PICK = { S, k, W0, H0, cw, ch, onWalk, lg, legendEl };   /* plan-44 đợt D: bấm bản đồ → tự đi */
  if (!cv.__zpick) { cv.__zpick = true; cv.addEventListener('click', pickAt); }
  cv.classList.toggle('zwalkable', !!onWalk);
  if (typeof window !== 'undefined') window.__zmap = { pins: pins.map(p => ({ kind: p.kind, label: p.label, x: Math.round(p.x), y: Math.round(p.y), locked: !!p.locked, n: p.n, tot: p.tot, rid: p.rid })), w: cw, h: ch, k, tap: (wx, wy) => pickWorld(wx, wy) };
  return pins;
}

/* ---- plan-44 đợt D (D4 phần còn lại): chạm 1 điểm trên bản đồ vùng → đóng bản đồ, nhân vật tự đi tới đó.
   Đường đi = BFS cả bản đồ theo đúng luật va chạm của người chơi (p.passable khi đang chèo bè, không thì isSolid);
   đích không đi được / không tới được → ô tới được gần đích nhất (bán kính 4 ô); không có thì báo, giữ bản đồ mở. ---- */
let PICK = null;
function pickAt(e) {
  const P = PICK; if (!P || !P.onWalk) return; const cv = e.currentTarget, r = cv.getBoundingClientRect(); if (!r.width) return;
  pickWorld((e.clientX - r.left) / r.width * P.W0, (e.clientY - r.top) / r.height * P.H0);
}
function pickWorld(wx, wy) {
  const P = PICK; if (!P || !P.onWalk) return { ok: false, why: 'off' };
  const res = P.onWalk(wx, wy) || { ok: false, why: 'busy' };
  if (!res.ok) { const el = P.legendEl && P.legendEl.querySelector('#m-zmsg'), Z = zstr(P.lg); if (el) { el.textContent = res.why === 'here' ? Z.tooClose : res.why === 'busy' ? Z.busy : Z.noPath; el.classList.add('zbad'); } }
  return res;
}
const walkFn = S => { const m = S.map, p = S.player; return (x, y) => x >= 0 && y >= 0 && x < m.w && y < m.h && (p.passable ? !!p.passable(m, x, y) : !isSolid(m, x, y)); };
/* ---- c23-farmmap (anh 04/11): MINI-MAP góc dưới-phải màn MÁY TÍNH — xác định phương hướng + quái đang ở đâu.
   Ô 160×160 (khung pixel ui/dlg_port.png), vùng quanh người chơi ~30 ô (nền = ảnh thu nhỏ cả vùng baseOf, dựng 1 lần / vùng),
   chấm: bạn (vàng + mũi hướng nhìn) · quái đang sống (đỏ, cam = đang giận) · Chấn Thú hoang (ui/zmap/rare.png) · thủ lĩnh (ui/hud/crown.png)
   · việc cần làm (ui/zmap/quest.png) · lối ra (ui/zmap/exit.png, ngoài khung thì kẹp ở mép = chỉ hướng) · người chơi khác (xanh, chơi chung).
   Vẽ 8 lần/giây (setInterval, không trong vòng vẽ game); ẩn khi không ở chế độ chơi / đang đấu / trên trời / màn hẹp (< 1000 px) / màn cảm ứng.
   Bấm mini-map = mở bảng bản đồ lớn (#btn-map). Móc test: window.__mm23. ---- */
const MM23 = { el: null, cv: null, n: 0, last: null, ang: Math.PI / 2, iv: 0 };
function mm23Peers() { try { const N = F106NET; if (N && N.pkApi && N.pkApi.peers) return N.pkApi.peers().map(P => P.ent).filter(Boolean); if (N && N.peers) return N.peers().map(q => q.o).filter(Boolean); } catch (e) { } return []; }
function mm23Init() {
  if (MM23.el || typeof document === 'undefined' || !document.body) return;
  const el = document.createElement('div'); el.id = 'mm23'; el.hidden = true;
  el.style.cssText = 'position:fixed;right:12px;bottom:12px;z-index:30;box-sizing:content-box;overflow:hidden;width:160px;height:160px;border:8px solid transparent;border-image:url(assets/px/ui/dlg_port.png) 8 / 8px round;background:#120f1c;background-clip:padding-box;image-rendering:pixelated;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.45)';
  const cv = document.createElement('canvas'); cv.width = 320; cv.height = 320; cv.style.cssText = 'width:160px;height:160px;display:block'; el.appendChild(cv);
  el.addEventListener('click', e => { e.stopPropagation(); const b = document.getElementById('btn-map'); if (b) b.click(); else window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyM' })); });
  el.addEventListener('pointerdown', e => e.stopPropagation());
  document.body.appendChild(el); MM23.el = el; MM23.cv = cv;
}
function mm23Tick() {
  try {
    mm23Init(); const el = MM23.el; if (!el) return; const S = window.__S, C = window.__CTX;
    const coarse = typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches;
    const show = !!(S && S.map && S.player && S.mode === 'play' && !S.map.sky && !S.map.air && !S.map.sea && S.map.w * S.map.h <= 40000 && !(S.zone && /^(mind_|sky_)/.test(S.zone.id)) && !(C && C.duel && C.duel.active && C.duel.active()) && !coarse && innerWidth >= 1000 && innerHeight >= 560);
    if (el.hidden === show) el.hidden = !show; if (!show) return;
    const m = S.map, p = S.player, lg = C && C.lang ? C.lang() : 'vi', g = MM23.cv.getContext('2d'), W = 320, VR = 240, k = W / (VR * 2);   /* VR: bán kính nhìn (px thế giới) */
    if (MM23.last && MM23.last.m === m) { const dx = p.x - MM23.last.x, dy = p.y - MM23.last.y; if (Math.hypot(dx, dy) > 0.6) MM23.ang = Math.atan2(dy, dx); }
    else MM23.ang = [Math.PI / 2, Math.PI, 0, -Math.PI / 2][p.dir | 0] || Math.PI / 2;
    MM23.last = { m, x: p.x, y: p.y };
    let base = MM23.bm === m && performance.now() - MM23.bt < 10000 ? MM23.bc : null; if (!base) { const t0 = performance.now(); base = baseOf(m); MM23.bm = m; MM23.bc = base; MM23.bt = performance.now(); MM23.buildMs = Math.round(MM23.bt - t0); }   /* nền dựng lại tối đa 10 s / lần khi vật đổi */
    const x0 = p.x - VR, y0 = p.y - VR;
    g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = '#0d0b14'; g.fillRect(0, 0, W, W);
    g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
    { const sx = Math.max(0, x0), sy = Math.max(0, y0), ex = Math.min(base.width, x0 + VR * 2), ey = Math.min(base.height, y0 + VR * 2); if (ex > sx && ey > sy) g.drawImage(base, sx, sy, ex - sx, ey - sy, (sx - x0) * k, (sy - y0) * k, (ex - sx) * k, (ey - sy) * k); }
    g.fillStyle = 'rgba(13,11,20,.42)'; g.fillRect(0, 0, W, W); g.imageSmoothingEnabled = false;
    const P = (wx, wy) => [(wx - x0) * k, (wy - y0) * k], IN = (x, y, r = 0) => x >= -r && y >= -r && x <= W + r && y <= W + r;
    const pins = zonePins(S, C, lg); let dots = 0;
    for (const q of pins) if (q.kind === 'mob') { const [x, y] = P(q.x, q.y); if (!IN(x, y)) continue; dots++; g.fillStyle = '#1c1a24'; g.fillRect(Math.round(x) - 5, Math.round(y) - 5, 10, 10); g.fillStyle = q.ang ? '#ffb02e' : '#ff4a3a'; g.fillRect(Math.round(x) - 3, Math.round(y) - 3, 6, 6); }
    for (const o of mm23Peers()) { const [x, y] = P(o.x, o.y); if (!IN(x, y)) continue; g.fillStyle = '#1c1a24'; g.beginPath(); g.arc(x, y, 7, 0, 7); g.fill(); g.fillStyle = '#5ad1ff'; g.beginPath(); g.arc(x, y, 4.5, 0, 7); g.fill(); }
    const ic = (kind, x, y, s, a = 1) => { const im = icon(kind); g.globalAlpha = a; if (im) g.drawImage(im, Math.round(x - s / 2), Math.round(y - s / 2), s, s); else { g.fillStyle = '#1c1a24'; g.beginPath(); g.arc(x, y, s / 3, 0, 7); g.fill(); g.fillStyle = COL[kind] || '#ffd45e'; g.beginPath(); g.arc(x, y, s / 4, 0, 7); g.fill(); } g.globalAlpha = 1; };
    for (const q of pins) {
      if (q.kind === 'mob' || q.kind === 'you' || q.kind === 'farm' || q.kind === 'artist') continue;
      let [x, y] = P(q.x, q.y);
      if (q.kind === 'exit') { const cx = Math.max(14, Math.min(W - 14, x)), cy = Math.max(14, Math.min(W - 14, y)); ic('exit', cx, cy, 24, q.locked ? 0.5 : 1); continue; }   /* lối ra ngoài khung → kẹp ở mép, chỉ hướng */
      if (!IN(x, y, 8)) continue;
      if (q.kind === 'wild') ic('rare', x, y, 22); else if (q.kind === 'lead' || q.kind === 'leader') ic('crown', x, y, 24, q.dead ? 0.45 : 1); else if (q.kind === 'quest' || q.kind === 'target' || q.kind === 'treasure' || q.kind === 'rare') ic(ICO[q.kind] || 'quest', x, y, 22);
    }
    { const cx = W / 2, cy = W / 2, a = MM23.ang; g.save(); g.translate(cx, cy); g.rotate(a);   /* bạn: chấm vàng + mũi hướng nhìn */
      g.fillStyle = '#1c1a24'; g.beginPath(); g.moveTo(22, 0); g.lineTo(-2, -12); g.lineTo(-2, 12); g.closePath(); g.fill();
      g.fillStyle = '#fff3c8'; g.beginPath(); g.moveTo(18, 0); g.lineTo(1, -8); g.lineTo(1, 8); g.closePath(); g.fill(); g.restore();
      g.fillStyle = '#1c1a24'; g.beginPath(); g.arc(cx, cy, 9, 0, 7); g.fill(); g.fillStyle = '#ffd45e'; g.beginPath(); g.arc(cx, cy, 6, 0, 7); g.fill(); }
    g.font = 'bold 22px VT323, monospace'; g.textAlign = 'center'; g.textBaseline = 'top'; g.fillStyle = '#1c1a24'; g.fillText(lg === 'vi' ? 'B' : 'N', W / 2 + 1, 5); g.fillStyle = '#fff3c8'; g.fillText(lg === 'vi' ? 'B' : 'N', W / 2, 4);   /* hướng Bắc ở trên */
    el.title = lg === 'vi' ? 'Bản đồ nhỏ — bấm để mở bản đồ (M)' : 'Mini-map — click to open the map (M)';
    MM23.n++; window.__mm23 = { n: MM23.n, dots, buildMs: MM23.buildMs, pins: pins.length, ang: +MM23.ang.toFixed(2), shown: true };
  } catch (e) { MM23.err = (MM23.err || 0) + 1; if (MM23.err < 4) console.error('mm23', e); }
}
if (typeof window !== 'undefined' && typeof document !== 'undefined' && !window.__mm23iv) window.__mm23iv = setInterval(mm23Tick, 125);
export function planZoneWalk(S, wx, wy) {
  const m = S.map, p = S.player; if (!m || !p) return { ok: false, why: 'busy' };
  const W = m.w, H = m.h, ok = walkFn(S), sx = Math.floor(p.x / TS), sy = Math.floor(p.y / TS);
  let tx = Math.max(0, Math.min(W - 1, Math.floor(wx / TS))), ty = Math.max(0, Math.min(H - 1, Math.floor(wy / TS)));
  if (sx < 0 || sy < 0 || sx >= W || sy >= H) return { ok: false, why: 'busy' };
  const prev = new Int32Array(W * H).fill(-1), q = new Int32Array(W * H), s0 = sy * W + sx; let qh = 0, qt = 0; prev[s0] = s0; q[qt++] = s0;
  while (qh < qt) {
    const c = q[qh++], cx = c % W, cy = (c - cx) / W;
    for (let d = 0; d < 4; d++) {
      const nx = cx + (d === 0 ? 1 : d === 1 ? -1 : 0), ny = cy + (d === 2 ? 1 : d === 3 ? -1 : 0); if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      const n = ny * W + nx; if (prev[n] !== -1 || !ok(nx, ny)) continue; prev[n] = c; q[qt++] = n;
    }
  }
  let goal = ty * W + tx; const exact = prev[goal] !== -1;
  if (!exact) {
    let best = -1, bd = 1e9;
    for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) { const x = tx + dx, y = ty + dy; if (x < 0 || y < 0 || x >= W || y >= H) continue; const n = y * W + x; if (prev[n] === -1) continue; const dd = dx * dx + dy * dy; if (dd < bd) { bd = dd; best = n; } }
    if (best < 0) return { ok: false, why: 'nopath' };
    goal = best; tx = goal % W; ty = (goal - tx) / W;
  }
  if (goal === s0) return { ok: false, why: 'here' };
  const tiles = []; for (let c = goal; c !== s0; c = prev[c]) tiles.push(c); tiles.reverse();
  const pts = tiles.map(c => ({ x: (c % W) * TS + 8, y: Math.floor(c / W) * TS + 12 }));
  /* nắn đường: nhảy tới điểm xa nhất còn nhìn thẳng thấy (soi 4 góc hộp chân như main.js lineClear) */
  const clear = (ax, ay, bx, by) => { const dd = Math.hypot(bx - ax, by - ay), n = Math.max(1, Math.ceil(dd / 3)); for (let i = 1; i <= n; i++) { const x = ax + (bx - ax) * i / n, y = ay + (by - ay) * i / n; for (const [ox, oy] of [[-5, -6], [4, -6], [-5, -1], [4, -1]]) if (!ok(Math.floor((x + ox) / TS), Math.floor((y + oy) / TS))) return false; } return true; };
  const out = []; let cx = p.x, cy = p.y, i = 0;
  while (i < pts.length) { let j = Math.min(pts.length - 1, i + 40); while (j > i && !clear(cx, cy, pts[j].x, pts[j].y)) j--; out.push(pts[j]); cx = pts[j].x; cy = pts[j].y; i = j + 1; }
  return { ok: true, path: out, tx, ty, exact, steps: tiles.length };
}
