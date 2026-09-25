// trees.js — wood cutting + art-card collecting (see API.md)
//  · Chop the forest: stand next to a tree, press E three times (0.35s between swings) → the tree falls,
//    leaves a procedural stump and pays wood (2 for living trees, 1 for a dead one).
//  · Art dealer: a stall on the top plaza of every land trades wood for art cards of the artists
//    walking that land. Owned cards live in save.cards and render as pixel "artworks".
import { mkCanvas, rngFrom, hashStr, circle, PAL, TS , HOOK } from '../gfx.js';

// ---------- constants ----------
const WOOD = { tree: 2, pine: 2, pine_s: 2, palm: 2, deadtree: 1 };  // chop reward per tree type
const HITS = 3, COOLDOWN = 0.35, SWING = 0.28, SHAKE = 0.25, FALL = 0.7;
const PRICE = 3, PRICE_LEADER = 6;
const REACH = 24, STALL_REACH = 30;

const STR = {
  en: {
    chop: 'Chop', cards: 'Art cards', dealer: 'Art dealer', tabDealer: 'Dealer',
    mine: n => `My collection (${n})`, buy: 'Buy', owned: '✓ Owned', price: 'price',
    got: n => `+${n} wood`, bought: name => `Art card: ${name}`, poor: n => `Need ${n} wood — chop trees with the axe`,
    close: 'Close', imgs: 'artworks', leader: '★ Leader', noAxe: 'Needs an axe — craft Axe I at the workbench (5 wood)',
    note: 'Real artworks appear here once the roster includes image links.',
    empty: 'No cards yet — buy one from the dealer.', nobody: 'No artists walking this land right now.'
  },
  vi: {
    chop: 'Chặt cây', cards: 'Thẻ tranh', dealer: 'Nhà buôn tranh', tabDealer: 'Người bán',
    mine: n => `Bộ sưu tập (${n})`, buy: 'Mua', owned: '✓ Đã có', price: 'giá',
    got: n => `+${n} gỗ`, bought: name => `Thẻ tranh: ${name}`, poor: n => `Cần ${n} gỗ — chặt cây bằng rìu`,
    close: 'Đóng', imgs: 'tranh', leader: '★ Leader', noAxe: 'Cần rìu — chế Rìu I ở Bàn mộc (5 gỗ)',
    note: 'Tranh thật sẽ hiện khi danh sách có link ảnh.',
    empty: 'Chưa có thẻ nào — mua ở nhà buôn tranh.', nobody: 'Chưa có nghệ sĩ nào đi trong vùng này.'
  }
};
const L = ctx => STR[ctx.lang()] || STR.en;
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const nf = n => (n || 0).toLocaleString('en-US');

// ---------- module state (reset on every zone enter) ----------
const ST = {
  grid: new Map(),   // tileKey -> tree object, for a cheap "closest tree" lookup
  stumps: [],        // {x,y} tiles where a tree was felled in this zone
  parts: [],         // wood chips / leaves
  shakes: [],        // {o,t} trees currently vibrating from a hit
  falls: [],         // {type,x,y,face,t} felled trees mid-fall (drawn rotating for FALL s)
  pips: [],          // trees with hits on them (progress dots)
  dealer: null,      // the stall object placed this zone
  swing: 0, swingFace: 1, swingX: 0, swingY: 0,
  cd: 0, hudN: -1, hudUsed: false, tab: 0, panel: null, closerSet: false
};
const key = (x, y) => x * 4096 + y;

// ---------- procedural sprites ----------
let stumpImg = null;
function stumpSprite() {
  if (stumpImg) return stumpImg;
  const c = mkCanvas(16, 16), g = c.getContext('2d');
  g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(8, 14, 6, 2, 0, 0, 7); g.fill();
  g.fillStyle = PAL.out; g.fillRect(3, 6, 10, 9);                      // outline
  g.fillStyle = PAL.trunk; g.fillRect(4, 7, 8, 7);                     // bark
  g.fillStyle = PAL.woodD; g.fillRect(4, 7, 2, 7); g.fillRect(4, 12, 8, 2);
  circle(g, 8, 7, 4, PAL.out);                                         // cut top
  circle(g, 8, 7, 3, '#c9a06a');
  circle(g, 8, 7, 2, '#b88b52'); circle(g, 8, 7, 1, '#d8b57c');
  g.fillStyle = PAL.woodD; g.fillRect(11, 10, 2, 4);                   // a chip on the side
  stumpImg = HOOK.image('stump', c); return stumpImg;
}

const ART_PALS = [
  ['#171226', '#ff9426', '#ffd45e', '#f2ebe0'], ['#0b1a2a', '#3f8fd6', '#7cc0f2', '#dff3ff'],
  ['#20122b', '#b23a7a', '#ff1f4b', '#ffd45e'], ['#10241c', '#2f7d3a', '#4caa4f', '#e2d79a'],
  ['#241e34', '#6a4fb2', '#b48cff', '#f4c6c0'], ['#2a1a10', '#8a5a2b', '#d9a23a', '#ecd9a0']
];
const artCache = new Map();
// A tiny 64x48 abstract "artwork", deterministic per member id.
function artFor(m) {
  if (artCache.has(m.id)) return artCache.get(m.id);
  const rng = rngFrom(hashStr(m.id) ^ 0x51ed), c = mkCanvas(64, 48), g = c.getContext('2d');
  const p = ART_PALS[(rng() * ART_PALS.length) | 0], pick = () => p[1 + ((rng() * 3) | 0)];
  g.fillStyle = p[0]; g.fillRect(0, 0, 64, 48);
  const style = (rng() * 4) | 0;
  if (style === 0) {                                    // mosaic
    for (let y = 0; y < 12; y++) for (let x = 0; x < 16; x++) { if (rng() < 0.42) continue; g.fillStyle = pick(); g.fillRect(x * 4, y * 4, 4, 4); }
  } else if (style === 1) {                             // horizon, sun and a skyline
    let y = 4 + ((rng() * 10) | 0);
    const sun = p[3];
    circle(g, 12 + ((rng() * 40) | 0), y + 4, 5 + ((rng() * 4) | 0), sun);
    const horizon = y + 10 + ((rng() * 8) | 0);
    while (y < 48) { const h = 3 + ((rng() * 7) | 0); g.fillStyle = pick(); g.fillRect(0, y, 64, h); y += h; }
    g.fillStyle = p[0];                                 // silhouettes on the horizon
    for (let x = 0; x < 64;) { const w = 3 + ((rng() * 7) | 0), h = 4 + ((rng() * 12) | 0); if (rng() < 0.7) g.fillRect(x, horizon - h, w, h); x += w + 1 + ((rng() * 4) | 0); }
    for (let i = 0; i < 30; i++) g.fillRect((rng() * 64) | 0, (rng() * 48) | 0, 1, 1);
  } else if (style === 2) {                             // diagonal weave
    for (let i = -48; i < 64; i += 3) { g.fillStyle = pick(); g.beginPath(); g.moveTo(i, 0); g.lineTo(i + 3, 0); g.lineTo(i + 51, 48); g.lineTo(i + 48, 48); g.fill(); i += 1 + ((rng() * 4) | 0); }
    g.fillStyle = p[3]; for (let i = 0; i < 18; i++) g.fillRect((rng() * 62) | 0, (rng() * 46) | 0, 2, 2);
  } else {                                              // orbits
    for (let i = 0; i < 7; i++) { const r = 3 + ((rng() * 14) | 0); circle(g, (rng() * 64) | 0, (rng() * 48) | 0, r, pick()); }
    for (let i = 0; i < 5; i++) { g.fillStyle = p[3]; g.fillRect(0, (rng() * 48) | 0, 64, 1); }
  }
  g.fillStyle = 'rgba(0,0,0,.55)'; g.fillRect(0, 0, 64, 2); g.fillRect(0, 46, 64, 2); g.fillRect(0, 0, 2, 48); g.fillRect(62, 0, 2, 48);
  const url = c.toDataURL();
  artCache.set(m.id, url); return url;
}

// ---------- helpers ----------
const saveOf = ctx => ctx.S.save;
const cardsOf = ctx => (saveOf(ctx).cards ||= []);
const woodOf = ctx => { const s = saveOf(ctx); s.inv ||= {}; return s.inv.wood || 0; };
const priceOf = (ctx, m) => ctx.isLeader(m) ? PRICE_LEADER : PRICE;
const hasAxe = ctx => { const t = saveOf(ctx).tools; return !t || t.axe !== false; };

function objAt(map, ctx, x, y) { // any object whose footprint covers this tile
  for (const o of map.objects) { const d = ctx.O[o.type]; if (x >= o.x && x < o.x + d.fw && y >= o.y && y < o.y + d.fh) return o; }
  return null;
}
function spotFree(map, ctx, x, y, w) {
  for (let i = 0; i < w; i++) {
    if (ctx.isSolid(map, x + i, y) || objAt(map, ctx, x + i, y)) return false;
    if (ctx.isSolid(map, x + i, y + 1) || objAt(map, ctx, x + i, y + 1)) return false;   // keep the front walkable
    if ((map.reserved || []).some(r => r.x === x + i && Math.abs(r.y - y) <= 1)) return false;
  }
  return true;
}
// A free 2x1 spot beside the top plaza; the market module parks a stall here too, so keep away from any stall.
function placeDealer(ctx) {
  const map = ctx.S.map; if (!map) return null;
  const stalls = map.objects.filter(o => o.type === 'stall');
  for (const y of [8, 7, 9]) for (const x0 of [30, 32, 34, 31, 33, 46, 48, 50, 47, 49]) {
    if (!spotFree(map, ctx, x0, y, 2)) continue;
    if (stalls.some(s => Math.abs(s.x - x0) < 4 && Math.abs(s.y - y) < 3)) continue;
    return ctx.place(map, 'stall', x0, y, { dealer: true });
  }
  return null;
}

function spawnChips(ctx, o, n) {
  const dead = o.type === 'deadtree', cx = o.x * TS + 8, base = o.y * TS + 11, R = Math.random;
  for (let i = 0; i < n; i++) {
    const leaf = !dead && i % 2 === 0, side = R() < 0.5 ? -1 : 1;
    if (leaf) ST.parts.push({                                   // leaves torn off the canopy edge
      x: cx + side * (4 + R() * 6), y: o.y * TS - 12 + R() * 12,
      vx: side * (10 + R() * 22), vy: 8 + R() * 18, g: 24,
      t: 1.0 + R() * 0.7, s: 2, c: R() < 0.5 ? PAL.leaf : PAL.leafL
    });
    else ST.parts.push({                                        // wood chips off the trunk
      x: cx + (R() - 0.5) * 6, y: base - R() * 5,
      vx: side * (16 + R() * 34), vy: -38 - R() * 30, g: 150,
      t: 0.6 + R() * 0.4, s: 2, c: R() < 0.5 ? PAL.trunk : PAL.woodD
    });
  }
  for (let i = 0; i < 4; i++) ST.parts.push({                   // bright impact sparks
    x: cx + (R() - 0.5) * 4, y: base - R() * 3, vx: (R() - 0.5) * 60, vy: -20 - R() * 30, g: 90,
    t: 0.18 + R() * 0.12, s: 2, c: R() < 0.5 ? '#fff3d0' : PAL.gold
  });
}

// ---------- the panel ----------
function dealerRows(ctx) {
  const t = L(ctx), seen = new Set(), owned = new Set(cardsOf(ctx)), wood = woodOf(ctx);
  const list = [];
  for (const n of ctx.allNpcs()) { const m = n.m; if (!m || m.guide || seen.has(m.id)) continue; seen.add(m.id); list.push(m); }
  list.sort((a, b) => (ctx.isLeader(b) - ctx.isLeader(a)) || (b.i - a.i));
  if (!list.length) return `<div class="dim" style="padding:14px;text-align:center">${t.nobody}</div>`;
  return list.map(m => {
    const nat = ctx.nationOf(m), pr = priceOf(ctx, m), have = owned.has(m.id), poor = wood < pr;
    const btn = have
      ? `<button class="btn" disabled style="width:auto;margin:0;padding:7px 10px;opacity:.55">${t.owned}</button>`
      : `<button class="btn${poor ? '' : ' primary'}" data-buy="${esc(m.id)}" ${poor ? 'disabled' : ''} style="width:auto;margin:0;padding:7px 12px${poor ? ';opacity:.5' : ''}">${t.buy}</button>`;
    return `<div class="hrow">${ctx.avatarHTML(m, 'av sm')}<div class="hwho"><b>${esc(m.n)}</b> <span class="dim">${esc(m.k && m.k !== m.n ? m.k : '')}</span>` +
      `<div class="dim">${nat ? nat.flag + ' ' : ''}${ctx.isLeader(m) ? '★ ' : ''}${nf(m.i)} ${t.imgs}</div></div>` +
      `<div class="hnum"><b>🪵 ${pr}</b><small>${t.price}</small></div>${btn}</div>`;
  }).join('');
}
function collectionHTML(ctx) {
  const t = L(ctx), ids = cardsOf(ctx);
  if (!ids.length) return `<div class="dim" style="padding:20px;text-align:center">${t.empty}</div>`;
  const cards = ids.map(id => ctx.byId.get(id) || (ctx.FRIEND && id === ctx.FRIEND.id ? ctx.FRIEND : null)).filter(Boolean).map(m => {   // 'lyron' = the story friend's one-of-a-kind card
    const art = Array.isArray(m.art) && m.art.length ? esc(m.art[0]) : artFor(m);
    const nat = ctx.nationOf(m);
    return `<div style="background:#241e34;border:1px solid #33294a;border-radius:10px;padding:7px;text-align:center">` +
      `<img src="${art}" alt="" style="width:100%;height:auto;aspect-ratio:4/3;object-fit:cover;border-radius:6px;image-rendering:pixelated;background:#120f1c">` +
      `<div style="display:flex;gap:6px;align-items:center;margin-top:6px;text-align:left">${ctx.avatarHTML(m, 'av sm')}` +
      `<div style="flex:1;min-width:0;overflow:hidden"><b style="font-size:13px;word-break:break-all">${esc(m.n)}</b>` +
      `<div class="dim tiny">${nat ? nat.flag + ' ' : ''}${nf(m.i)} ${t.imgs}</div></div></div>` +
      `<div style="margin-top:6px;display:flex;gap:4px;align-items:center;justify-content:center;flex-wrap:wrap">${ctx.levelBadge(m.lv)}` +
      `${ctx.isLeader(m) ? `<span class="chip" style="color:#ffd45e">${t.leader}</span>` : ''}${m.friend ? `<span class="chip elder">♥ ${esc(m.title[ctx.lang()])}</span>` : ''}</div></div>`;
  }).join('');
  return `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(148px,1fr));gap:8px;padding:2px">${cards}</div>`;
}
function renderPanel(ctx) {
  const t = L(ctx), el = ST.panel; if (!el) return;
  const body = el.panel.querySelector('#gl-body');
  el.panel.querySelector('#gl-head').textContent = `${t.cards} · 🪵 ${woodOf(ctx)}`;
  const t0 = el.panel.querySelector('#gl-t0'), t1 = el.panel.querySelector('#gl-t1');
  t0.className = 'btn' + (ST.tab === 0 ? ' primary' : ''); t1.className = 'btn' + (ST.tab === 1 ? ' primary' : '');
  t1.textContent = t.mine(cardsOf(ctx).length);
  body.innerHTML = ST.tab === 0 ? dealerRows(ctx) : collectionHTML(ctx);
}
function openPanel(ctx) {
  const t = L(ctx);
  ST.panel = ctx.panel('gallery', `<h2 style="justify-content:space-between">🖼 <span id="gl-head" style="flex:1;font-size:18px"></span></h2>
    <div style="display:flex;gap:6px;margin:2px 0 4px"><button class="btn" id="gl-t0" style="margin:0">${t.tabDealer}</button><button class="btn" id="gl-t1" style="margin:0"></button></div>
    <div class="scroll" id="gl-body"></div>
    <p class="tiny dim" style="margin:6px 0 2px">${t.note}</p>
    <button class="btn" id="gl-close">${t.close}</button>`);
  const p = ST.panel.panel;
  p.querySelector('#gl-t0').onclick = () => { ST.tab = 0; renderPanel(ctx); };
  p.querySelector('#gl-t1').onclick = () => { ST.tab = 1; renderPanel(ctx); };
  p.querySelector('#gl-close').onclick = () => closePanel(ctx);
  p.querySelector('#gl-body').onclick = e => {
    const b = e.target.closest('[data-buy]'); if (!b) return;
    buy(ctx, b.getAttribute('data-buy'));
  };
  renderPanel(ctx);
  ST.panel.hidden = false;
  ctx.setMode('gallery');
  if (!ST.closerSet) { ctx.registerCloser('gallery', () => closePanel(ctx)); ST.closerSet = true; }
}
function closePanel(ctx) { if (ST.panel) ST.panel.hidden = true; ctx.setMode('play'); }
function buy(ctx, id) {
  const t = L(ctx), m = ctx.byId.get(id); if (!m) return;
  const s = saveOf(ctx), pr = priceOf(ctx, m), cards = cardsOf(ctx);
  if (cards.includes(id)) return;
  s.inv ||= {};
  if ((s.inv.wood || 0) < pr) { ctx.toast(t.poor(pr)); return; }
  s.inv.wood = (s.inv.wood || 0) - pr;
  cards.push(id);
  ctx.persist();
  ctx.toast(t.bought(m.k || m.n), true);
  renderPanel(ctx);
}

// ---------- the system ----------
export const trees = {
  id: 'trees',

  onZoneEnter(ctx) {
    ST.grid.clear(); ST.stumps.length = 0; ST.parts.length = 0; ST.shakes.length = 0; ST.falls.length = 0; ST.pips.length = 0;
    ST.swing = 0; ST.cd = 0; ST.dealer = null;
    const map = ctx.S.map; if (!map) return;
    for (const o of map.objects) { if (WOOD[o.type] !== undefined) { o.chop = 0; ST.grid.set(key(o.x, o.y), o); } }
    ST.dealer = placeDealer(ctx); ST.objCount = map.objects.length;
  },

  update(dt, ctx) {
    if (ST.cd > 0) ST.cd -= dt;
    if (ST.swing > 0) ST.swing -= dt;
    for (let i = ST.shakes.length - 1; i >= 0; i--) { const s = ST.shakes[i]; s.t -= dt; if (s.t <= 0) ST.shakes.splice(i, 1); }
    for (let i = ST.falls.length - 1; i >= 0; i--) { const f = ST.falls[i]; f.t -= dt; if (f.t <= 0) ST.falls.splice(i, 1); }
    for (let i = ST.parts.length - 1; i >= 0; i--) {
      const p = ST.parts[i]; p.t -= dt;
      if (p.t <= 0) { ST.parts.splice(i, 1); continue; }
      p.x += p.vx * dt; p.y += p.vy * dt; p.vy += p.g * dt;
    }
    // HUD fallback: the core does not call hudLines() yet (see report), so keep our own chip in the HUD box
    const n = cardsOf(ctx).length;
    if (!ST.hudUsed && n !== ST.hudN) {
      ST.hudN = n;
      const host = document.querySelector('.hud-tl');
      if (host) {
        let el = document.getElementById('sys-trees-hud');
        if (!el) { el = document.createElement('div'); el.id = 'sys-trees-hud'; el.style.cssText = 'margin-top:4px;background:rgba(13,11,20,.6);padding:3px 9px;border-radius:8px;display:table;font-size:12px;color:#f2ebe0'; host.appendChild(el); }
        el.textContent = '🖼 ' + n; el.hidden = !n;
      }
    }
  },

  near(ctx) {
    const p = ctx.S.player, map = ctx.S.map; if (!p || !map) return null;
    if (map.objects.length !== ST.objCount) { // objects were added/removed by other systems (planted trees, raids): refresh the index
      ST.objCount = map.objects.length; ST.grid.clear();
      for (const o of map.objects) if (WOOD[o.type] !== undefined) { if (o.chop === undefined) o.chop = 0; ST.grid.set(key(o.x, o.y), o); }
    }
    const t = L(ctx);
    let best = null, bd = Infinity;
    if (hasAxe(ctx)) {
      const tx = Math.floor(p.x / TS), ty = Math.floor(p.y / TS);
      for (let y = ty - 2; y <= ty + 2; y++) for (let x = tx - 2; x <= tx + 2; x++) {
        const o = ST.grid.get(key(x, y)); if (!o) continue;
        const wx = o.x * TS + 8, wy = o.y * TS + 12, d = Math.hypot(wx - p.x, wy - p.y);
        if (d < REACH && d < bd) { bd = d; best = { label: t.chop, x: wx, y: wy, limit: REACH, data: { kind: 'tree', o } }; }
      }
    }
    const s = ST.dealer;
    if (s && map.objects.includes(s)) {
      const wx = s.x * TS + 16, wy = (s.y + 1) * TS - 4, d = Math.hypot(wx - p.x, wy - p.y);
      if (d < STALL_REACH && d < bd) { bd = d; best = { label: t.cards, x: wx, y: wy, limit: STALL_REACH, data: { kind: 'dealer' } }; }
    }
    return best;
  },

  interact(ctx, cand) {
    const d = cand && cand.data; if (!d) return;
    if (d.kind === 'dealer') { openPanel(ctx); return; }
    const o = d.o, map = ctx.S.map, t = L(ctx);
    if (!map.objects.includes(o)) return;
    if (ST.cd > 0) return;
    ST.cd = COOLDOWN;
    // axe swing next to the player, toward the trunk
    const p = ctx.S.player;
    p.faceTo(o.x * TS + 8, o.y * TS + 12);
    ST.swing = SWING; ST.swingX = p.x; ST.swingY = p.y;
    if (p.act) p.act('chop', COOLDOWN);   // clip PixelLab nếu có (rìu code bên dưới bị bỏ qua khi p.hasAct('chop'))
    ST.swingFace = (o.x * TS + 8) >= p.x ? 1 : -1;
    o.chop = (o.chop || 0) + 1;
    if (!ST.pips.includes(o)) ST.pips.push(o);
    ST.shakes.push({ o, t: SHAKE });
    spawnChips(ctx, o, o.chop >= HITS ? 14 : 7);
    if (o.chop < HITS) return;
    // felled
    const gain = WOOD[o.type] || 1;
    ST.grid.delete(key(o.x, o.y));
    const i = ST.pips.indexOf(o); if (i >= 0) ST.pips.splice(i, 1);
    ST.stumps.push({ x: o.x, y: o.y });
    ST.falls.push({ type: o.type, x: o.x, y: o.y, face: ST.swingFace, t: FALL });   // cây đổ về phía rìu vung tới (xoay dần 0→80°)
    for (let i = ST.shakes.length - 1; i >= 0; i--) if (ST.shakes[i].o === o) ST.shakes.splice(i, 1);
    ctx.removeObject(map, o);
    const s = ctx.S.save; s.inv ||= {}; s.inv.wood = (s.inv.wood || 0) + gain;
    ctx.toast(t.got(gain));
    ctx.persist();
  },

  drawables(ctx, cx, cy) {
    const out = [], img = stumpSprite();
    for (const s of ST.stumps) out.push({ y: (s.y + 1) * TS, f: () => ctx.g.drawImage(img, s.x * TS - cx, (s.y + 1) * TS - 16 - cy) });
    const g = ctx.g;
    for (const sh of ST.shakes) {   // rung: gốc đứng yên, tán nghiêng qua lại (shear) thay vì cả cây trượt ngang
      const o = sh.o, d = ctx.O[o.type]; if (!d) continue;
      const k = sh.t / SHAKE, sx = Math.sin(sh.t * 72) * k * 0.09, by = (o.y + d.fh) * TS, bx = o.x * TS + (d.ox || 0) + d.w / 2;
      out.push({ y: by + 0.5, f: () => { g.save(); g.translate(bx - cx, by - cy); g.transform(1, 0, sx, 1, 0, 0); g.drawImage(d.img, -d.w / 2, -d.h, d.w, d.h); g.restore(); } });
    }
    for (const f of ST.falls) {     // đổ: xoay quanh gốc về phía đổ, cuối mờ dần
      const d = ctx.O[f.type]; if (!d) continue;
      const k = 1 - f.t / FALL, ang = f.face * (k * k) * 1.4, by = (f.y + d.fh) * TS, bx = f.x * TS + (d.ox || 0) + d.w / 2;
      out.push({ y: by + 0.6, f: () => { g.save(); g.globalAlpha = k > 0.8 ? (1 - k) * 5 : 1; g.translate(bx - cx, by - cy); g.rotate(ang); g.drawImage(d.img, -d.w / 2, -d.h, d.w, d.h); g.restore(); } });
    }
    return out;
  },

  draw(g, ctx, cx, cy) {
    for (const p of ST.parts) { g.fillStyle = p.c; g.fillRect(Math.round(p.x - cx), Math.round(p.y - cy), p.s, p.s); }
    if (ST.swing > 0 && !(ctx.S.player.hasAct && ctx.S.player.hasAct('chop'))) {
      const k = 1 - ST.swing / SWING;                                   // 0 → 1 over the swing
      const face = ST.swingFace, r = 11;
      const hx = Math.round(ST.swingX - cx) + face * 3, hy = Math.round(ST.swingY - cy) - 10;
      let a = -2.36 + k * 2.53;                                          // raised behind → down onto the trunk
      if (face < 0) a = Math.PI - a;                                     // mirror for a left-hand swing
      g.save();
      g.strokeStyle = 'rgba(255,255,255,.45)'; g.lineWidth = 2;          // swing trail
      g.beginPath(); g.arc(hx, hy, r, face > 0 ? a - 1.0 : a, face > 0 ? a : a + 1.0); g.stroke();
      const ex = hx + Math.cos(a) * r, ey = hy + Math.sin(a) * r;
      g.strokeStyle = PAL.out; g.lineWidth = 3; g.beginPath(); g.moveTo(hx, hy); g.lineTo(ex, ey); g.stroke();
      g.strokeStyle = PAL.wood; g.lineWidth = 1; g.beginPath(); g.moveTo(hx, hy); g.lineTo(ex, ey); g.stroke();
      const rx = Math.round(ex), ry = Math.round(ey);
      g.fillStyle = PAL.out; g.fillRect(rx - 3, ry - 3, 7, 7);           // axe head
      g.fillStyle = PAL.stoneL; g.fillRect(rx - 2, ry - 2, 5, 5);
      g.fillStyle = '#ffffff'; g.fillRect(rx - 2 + (face > 0 ? 3 : 0), ry - 2, 2, 5);
      g.restore();
    }
  },

  drawUI(ug, ctx, cx, cy, scale) {
    ug.save();
    // progress pips over trees that have been hit + the tree we are standing at
    const near = ctx.S.near, list = ST.pips.slice();
    if (near && near.kind === 'sys' && near.cand && near.cand.data && near.cand.data.kind === 'tree' && !list.includes(near.cand.data.o)) list.push(near.cand.data.o);
    const r = Math.max(2, scale * 1.1), gap = r * 3;
    for (const o of list) {
      const sx = Math.round((o.x * TS + 8 - cx) * scale), sy = Math.round((o.y * TS - 20 - cy) * scale);
      if (sx < -40 || sx > ug.canvas.width + 40 || sy < -20 || sy > ug.canvas.height + 20) continue;
      for (let i = 0; i < HITS; i++) {
        const x = sx + (i - 1) * gap;
        ug.beginPath(); ug.arc(x, sy, r, 0, 7);
        ug.fillStyle = i < (o.chop || 0) ? '#ffd45e' : 'rgba(13,11,20,.65)'; ug.fill();
        ug.strokeStyle = 'rgba(13,11,20,.85)'; ug.lineWidth = Math.max(1, scale / 3); ug.stroke();
      }
    }
    // floating dealer sign
    const s = ST.dealer;
    if (s && ctx.S.map && ctx.S.map.objects.includes(s)) {
      const t = L(ctx), text = t.dealer;
      const sx = Math.round((s.x * TS + 16 - cx) * scale), sy = Math.round((s.y * TS - 18 - cy) * scale);
      if (sx > -160 && sx < ug.canvas.width + 160 && sy > -40 && sy < ug.canvas.height + 40) {
        const fs = Math.max(10, scale * 3);
        ug.font = `bold ${fs}px "Segoe UI",system-ui,sans-serif`; ug.textAlign = 'center'; ug.textBaseline = 'bottom';
        const w = ug.measureText('🖼 ' + text).width + 10, h = fs + 5;
        ug.fillStyle = 'rgba(13,11,20,.72)'; ug.beginPath(); ug.roundRect(sx - w / 2, sy - h, w, h, 4); ug.fill();
        ug.strokeStyle = 'rgba(255,212,94,.55)'; ug.lineWidth = 1; ug.stroke();
        ug.fillStyle = '#ffd45e'; ug.fillText('🖼 ' + text, sx, sy - 3);
      }
    }
    ug.restore();
  },

  hudLines(ctx) {
    ST.hudUsed = true;                                  // core renders it → drop our DOM fallback
    const el = document.getElementById('sys-trees-hud'); if (el) el.hidden = true;
    const n = cardsOf(ctx).length;
    return n ? ['🖼 ' + n] : [];
  }
};
