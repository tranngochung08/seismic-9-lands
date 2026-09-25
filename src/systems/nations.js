// nations.js — plan-18 (anh duyệt 2026-09-28): chọn tên + quốc gia (hoặc không quốc gia), gia nhập/đổi nước tốn đá Seismic,
// luật khu: trồng cây / bắt thú trong khu nước khác = xâm phạm → lần 1 cảnh báo, lần 2 trong 60 s người nước đó chạy tới đuổi, chạm là đẩy ra khỏi khu.
// Không phạt (không mất đồ/máu). Thân thiện (nói chuyện ≥ 5 lần với người nước đó) → được làm trong khu họ.
// API cho hệ khác: ctx.trespass(tx, ty, what) → true = được làm; false = bị chặn (đã tự cảnh báo/đuổi). ctx.canWorkPlot(tx, ty).
// Mỏ đá Seismic: gather.js (objet 'seisvein' → đá 🪨). Chọn nước: openPicker() khi save.nation === undefined (không chạy ở ?auto).
import { NATIONS, nationOf } from '../data.js';
import { FLAG_COLORS } from '../gfx.js';
import { ART } from '../art.js';

const JOIN_COST = 10, CHANGE_COST = 25, FRIEND_TALKS = 5, WARN_WINDOW = 60, LEAVE_SEC = 3, MAX_CHASERS = 3;
const STR = {
  en: {
    pickTitle: 'Who are you?', name: 'Your name', nameHint: '2–16 characters', nation: 'Choose your nation', none: 'No nation',
    noneNote: 'Wanderer: every yard belongs to someone else. Mine Seismic stones and join a nation at its board.',
    go: 'Enter the world', needName: 'Type a name first (2–16 characters)', needNation: 'Pick a nation (or No nation)',
    yours: 'This is your nation', join: n => `Join ${n} · ${JOIN_COST} 🪨`, change: n => `Move to ${n} · ${CHANGE_COST} 🪨`,
    joined: n => `Welcome to ${n}! Your yard is marked with your flag.`, poor: c => `Not enough Seismic stones — you need ${c} 🪨. Mine the purple crystals!`,
    friendOk: n => `The ${n} folk like you — go ahead.`,
    warn: n => `This is the ${n} yard! Planting and catching animals here is not allowed.`, warnNone: 'You belong to no nation — you cannot plant or catch here. Mine Seismic stones and join one.',
    shout: ['Hey! Not in our yard!', 'Those are OUR crops!', 'Hands off our animals!', 'Out you go!', 'Get out!'],
    pushed: n => `The ${n} folk chased you out of their yard.`,
    tag: 'Nation', noneTag: 'No nation'
  },
  vi: {
    pickTitle: 'Bạn là ai?', name: 'Tên của bạn', nameHint: '2–16 ký tự', nation: 'Chọn quốc gia', none: 'Không quốc gia',
    noneNote: 'Kẻ lang thang: khu nào cũng là khu của người khác. Đào đá Seismic rồi gia nhập một nước ở bảng nước đó.',
    go: 'Vào thế giới', needName: 'Nhập tên trước (2–16 ký tự)', needNation: 'Chọn một nước (hoặc Không quốc gia)',
    yours: 'Đây là nước của bạn', join: n => `Gia nhập ${n} · ${JOIN_COST} 🪨`, change: n => `Chuyển sang ${n} · ${CHANGE_COST} 🪨`,
    joined: n => `Chào mừng tới ${n}! Khu của bạn là khu có cờ nước này.`, poor: c => `Chưa đủ đá Seismic — cần ${c} 🪨. Đi đào tinh thể tím!`,
    friendOk: n => `Người ${n} quý bạn — cứ tự nhiên.`,
    warn: n => `Đây là khu của người ${n}! Không được trồng cây hay bắt thú ở đây.`, warnNone: 'Bạn chưa thuộc nước nào — không được trồng hay bắt thú ở đây. Đào đá Seismic rồi gia nhập một nước.',
    shout: ['Này! Không phải vườn nhà bạn!', 'Rau nhà tôi đấy!', 'Buông con vật ra!', 'Đi ra ngay!', 'Ra khỏi đây!'],
    pushed: n => `Người ${n} đã đuổi bạn ra khỏi khu của họ.`,
    tag: 'Quốc gia', noneTag: 'Không quốc gia'
  }
};
const L = ctx => STR[ctx.lang() === 'vi' ? 'vi' : 'en'];
const nName = (ctx, k) => (NATIONS[k] ? NATIONS[k][ctx.lang() === 'vi' ? 2 : 1] : k);
const TS = 16;
let CTXR = null, warned = {}, chase = null, anger = null, friendToast = {};

function plotRect(p) { return { x0: p.x, y0: p.y, x1: p.x + p.w, y1: p.y + p.h }; }
function friendly(ctx, key) { return ((ctx.S.save.talks || {})[key] || 0) >= FRIEND_TALKS; }
export function canWork(ctx, tx, ty) {
  const q = ctx.plotOf(tx, ty); if (!q || !q.nation) return true;           // đất chung
  const mine = ctx.myNation(); if (mine && q.nation === mine) return true;
  return friendly(ctx, q.nation);
}
function npcsOf(ctx, key) { return ctx.S.npcs.filter(n => n.m && !n.m.guide && !n.m.friend && (nationOf(n.m) || {}).key === key); }

function trespass(ctx, tx, ty, what) {
  const q = ctx.plotOf(tx, ty); if (!q || !q.nation) return true;
  const mine = ctx.myNation(); if (mine && q.nation === mine) return true;
  const t = L(ctx), nm = nName(ctx, q.nation);
  if (friendly(ctx, q.nation)) { if (!friendToast[q.nation]) { friendToast[q.nation] = true; ctx.toast(t.friendOk(nm)); } return true; }
  const now = ctx.S.time, w = warned[q.nation];
  const folk = npcsOf(ctx, q.nation).sort((a, b) => Math.hypot(a.x - ctx.S.player.x, a.y - ctx.S.player.y) - Math.hypot(b.x - ctx.S.player.x, b.y - ctx.S.player.y));
  ctx.sfx && ctx.sfx('fail');
  if (!w || now - w > WARN_WINDOW) {   /* lần 1: cảnh báo */
    warned[q.nation] = now; ctx.toast(mine ? t.warn(nm) : t.warnNone);
    if (folk[0]) { ctx.bubble ? ctx.bubble(folk[0], t.shout[0], 3) : null; folk[0].faceTo(ctx.S.player.x, ctx.S.player.y); }
    return false;
  }
  /* lần 2 trong 60 s: đuổi */
  warned[q.nation] = now;
  const ch = folk.slice(0, MAX_CHASERS);
  if (!ch.length) { ctx.toast(mine ? t.warn(nm) : t.warnNone); return false; }
  chase = { key: q.nation, plot: q, npcs: ch, out: 0, shoutT: 0 };
  ch.forEach((n, i) => { n.chasing = true; n.busy = true; if (ctx.bubble) ctx.bubble(n, t.shout[1 + (i % 4)], 2.5); });
  ctx.toast(mine ? t.warn(nm) : t.warnNone);
  return false;
}

function insidePlot(p, x, y, pad = 0) { const r = plotRect(p); const tx = x / TS, ty = y / TS; return tx >= r.x0 - pad && tx < r.x1 + pad && ty >= r.y0 - pad && ty < r.y1 + pad; }
function pushOut(ctx, p) {   /* đẩy người chơi ra ô trống ngoài mép khu gần nhất */
  const pl = ctx.S.player, r = plotRect(p), tx = pl.x / TS, ty = pl.y / TS, m = ctx.S.map;
  const cands = [
    { d: tx - r.x0, dx: -1, dy: 0, sx: r.x0 - 1, sy: Math.floor(ty) }, { d: r.x1 - tx, dx: 1, dy: 0, sx: r.x1, sy: Math.floor(ty) },
    { d: ty - r.y0, dx: 0, dy: -1, sx: Math.floor(tx), sy: r.y0 - 1 }, { d: r.y1 - ty, dx: 0, dy: 1, sx: Math.floor(tx), sy: r.y1 }].sort((a, b) => a.d - b.d);
  for (const o of cands) for (let k = 0; k < 4; k++) {
    const cx = o.sx + o.dx * k, cy = o.sy + o.dy * k;
    if (cx < 1 || cy < 1 || cx >= m.w - 1 || cy >= m.h - 1 || ctx.isSolid(m, cx, cy) || ctx.plotOf(cx, cy)) continue;
    pl.x = cx * TS + 8; pl.y = cy * TS + 12; if (ctx.quake) ctx.quake(0.15); return true;
  }
  return false;
}

function endChase(ctx) {
  if (!chase) return;
  for (const n of chase.npcs) { n.chasing = false; n.busy = false; n.goal = { x: n.home.x, y: n.home.y }; n.speedMul = 1; }
  chase = null;
}

/* ---------------- chọn tên + quốc gia ---------------- */
function flagCanvas(key, w = 36, h = 24) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'), cols = FLAG_COLORS[key] || ['#888', '#aaa'], hh = h / cols.length;
  cols.forEach((col, i) => { g.fillStyle = col; g.fillRect(0, Math.round(i * hh), w, Math.ceil(hh)); }); g.strokeStyle = '#1c1a24'; g.strokeRect(0.5, 0.5, w - 1, h - 1); return c;
}
export function openPicker(ctx, onDone) {
  const t = L(ctx), sv = ctx.S.save; let pick = sv.nation === undefined ? ctx.myNation() : sv.nation;
  let el = document.getElementById('npick'); if (el) el.remove();
  el = document.createElement('div'); el.id = 'npick'; el.className = 'ov';
  const U = (ART.on && ART.man && ART.man.ui) || {}, NP = U.npick || null, FL = U.flags || {};   /* UI PixelLab (tools/px-npick.py) — không có thì dùng CSS thường */
  if (NP) el.classList.add('px');
  const keys = Object.keys(NATIONS).sort((a, b) => nName(ctx, a).localeCompare(nName(ctx, b)));
  el.innerHTML = `<div class="card npick"><h2${NP && NP.banner ? ' class="banner"' : ''}>${t.pickTitle}</h2>
    <label class="nplab">${t.name} <span class="dim">(${t.nameHint})</span></label><input id="np-name" maxlength="16" autocomplete="off" value="${(sv.name || (sv.self && sv.self.name) || '').replace(/"/g, '&quot;').slice(0, 16)}">
    <label class="nplab">${t.nation}</label><div class="npgrid">${keys.map(k => `<button class="npf" data-k="${k}"><span class="npc" data-f="${k}"></span><b>${nName(ctx, k)}</b></button>`).join('')}
      <button class="npf none" data-k="none"><span class="npc">${NP && NP.compass ? `<img src="assets/px/${NP.compass}" alt="">` : '🧭'}</span><b>${t.none}</b></button></div>
    <p class="dim npnote">${t.noneNote}</p><p id="np-err" class="nperr"></p><button id="np-go" class="btn primary">${t.go}</button></div>`;
  document.body.appendChild(el);
  for (const s of el.querySelectorAll('[data-f]')) { const f = FL[s.dataset.f]; if (f) { const i = new Image(); i.src = 'assets/px/' + f; i.width = 36; i.height = 27; s.appendChild(i); } else s.appendChild(flagCanvas(s.dataset.f)); }
  if (NP) { const r = document.documentElement.style; for (const k of ['panel', 'tile', 'tile_on', 'input', 'btn', 'banner']) if (NP[k]) r.setProperty('--np-' + k.replace('_', '-'), `url(assets/px/${NP[k]})`); }
  const mark = () => { for (const b of el.querySelectorAll('.npf')) b.classList.toggle('on', b.dataset.k === pick); };
  mark();
  el.addEventListener('click', e => { const b = e.target.closest('.npf'); if (b) { pick = b.dataset.k; mark(); } });
  el.addEventListener('keydown', e => e.stopPropagation());   /* gõ tên không điều khiển nhân vật */
  el.querySelector('#np-go').onclick = () => {
    const nm = el.querySelector('#np-name').value.trim();
    if (nm.length < 2) { el.querySelector('#np-err').textContent = t.needName; return; }
    if (!pick) { el.querySelector('#np-err').textContent = t.needNation; return; }
    sv.name = nm; sv.nation = pick; ctx.persist(); el.remove(); if (onDone) onDone();
  };
  setTimeout(() => { const i = el.querySelector('#np-name'); if (i && !i.value) i.focus(); }, 50);
}

/* ---------------- bảng nước: gia nhập / đổi nước ---------------- */
function boardExtra(ctx, key) {
  const t = L(ctx), sv = ctx.S.save, box = document.querySelector('#nation .card') || document.getElementById('nation'); if (!box) return;
  let el = document.getElementById('n-join'); if (el) el.remove();
  el = document.createElement('div'); el.id = 'n-join'; el.className = 'njoin';
  const mine = ctx.myNation(), cost = mine ? CHANGE_COST : JOIN_COST, nm = nName(ctx, key);
  if (mine === key) el.innerHTML = `<span class="chip">✓ ${t.yours}</span>`;
  else el.innerHTML = `<button class="btn primary" id="n-joinb">${mine ? t.change(nm) : t.join(nm)}</button>`;
  box.insertBefore(el, box.firstChild);
  const b = el.querySelector('#n-joinb');
  if (b) b.onclick = () => {
    const inv = sv.inv; if ((inv.stone || 0) < cost) { ctx.toast(t.poor(cost)); ctx.sfx && ctx.sfx('fail'); return; }
    inv.stone -= cost; sv.nation = key; ctx.persist(); ctx.sfx && ctx.sfx('build'); ctx.toast(t.joined(nm), true); boardExtra(ctx, key);
  };
}

export const nations = {
  id: 'nations',
  onZoneEnter(ctx) {
    CTXR = ctx; endChase(ctx); warned = {};
    ctx.trespass = (tx, ty, what) => trespass(ctx, tx, ty, what);
    ctx.canWorkPlot = (tx, ty) => canWork(ctx, tx, ty);
    ctx.nationBoardExtra = key => boardExtra(ctx, key);
    ctx.openNationPicker = cb => openPicker(ctx, cb);
    if (typeof window !== 'undefined') window.__nations = { trespass: (tx, ty) => trespass(ctx, tx, ty, 'test'), chase: () => chase && { key: chase.key, n: chase.npcs.length, out: chase.out }, canWork: (tx, ty) => canWork(ctx, tx, ty), picker: () => openPicker(ctx), board: k => boardExtra(ctx, k) };
  },
  update(dt, ctx) {
    if (!chase) return;
    const pl = ctx.S.player, t = L(ctx), p = chase.plot;
    if (friendly(ctx, chase.key) || ctx.myNation() === chase.key) { endChase(ctx); return; }   /* đã thân thiện / đã gia nhập → thôi đuổi */
    const inside = insidePlot(p, pl.x, pl.y, 0);
    if (!inside) { chase.out += dt; if (chase.out > LEAVE_SEC) endChase(ctx); return; }
    chase.out = 0; chase.shoutT -= dt;
    for (const n of chase.npcs) {
      n.goal = { x: pl.x, y: pl.y }; n.speedMul = 2.2;
      if (Math.hypot(n.x - pl.x, n.y - pl.y) < 13) {
        if (pushOut(ctx, p)) { ctx.toast(t.pushed(nName(ctx, chase.key))); if (ctx.bubble) ctx.bubble(n, t.shout[4], 2.5); ctx.sfx && ctx.sfx('hit'); }
        break;
      }
    }
  },
  drawables(ctx, cx, cy) {
    if (!chase) return [];
    if (!anger) { const f = ART.on && ART.man && ART.man.ui && ART.man.ui.anger; if (f) { anger = new Image(); anger.src = 'assets/px/' + f; } else anger = false; }
    const g = ctx.g, bob = Math.round(Math.sin(ctx.S.time * 10) * 1);
    return chase.npcs.map(n => ({ y: n.y + 40, f: () => {
      const x = Math.round(n.x) - cx, y = Math.round(n.y) - cy - 30 + bob;
      if (anger && anger.complete && anger.naturalWidth) g.drawImage(anger, 0, 0, anger.naturalWidth, anger.naturalHeight, x - 4, y - 4, 8, 8);
      else { g.fillStyle = '#e03a3a'; g.fillRect(x - 3, y - 1, 6, 2); g.fillRect(x - 1, y - 3, 2, 6); }
    } }));
  }
};
