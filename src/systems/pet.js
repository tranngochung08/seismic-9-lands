// pet.js — the Rocky pet: a crystal egg found in the Encrypted Core (M9) hatches into a mini Rocky
// that follows you everywhere, fetches sparkles, gets hungry, can be fed, petted and named. See systems/API.md.
import { mkCanvas, FLAG_COLORS, TS, HOOK } from '../gfx.js';

// ---------------------------------------------------------------- strings
const STR = {
  en: {
    takeEgg: 'Take the crystal egg', needCrystals: 'Needs 3 crystals to warm it — mine crystals in M9 with Pickaxe II', eggTaken: 'The egg is warm in your bag — keep walking',
    eggHud: p => `🥚 Egg: ${p}% warm`, hatched: 'A Rocky hatched!', nameTitle: 'A Rocky hatched!', nameHint: 'Give it a name (max 12)',
    renameTitle: 'Rename your Rocky', ok: 'OK', cancel: 'Cancel', named: n => `${n} is now your buddy`, renamed: n => `Renamed to ${n}`,
    takeFrom: n => `Take from ${n}`, feed: n => `Feed ${n}`, pet: n => `Pet ${n}`,
    got: (n, s) => `${n} brought ${s}`, fed: n => `${n} munches happily`, petted: n => `${n} wiggles`,
    hud: (n, lvl, h) => `🪨 ${n} · ${lvl} · hunger ${h}%`, lv: ['Hatchling', 'Buddy', 'Best friend'], renameKey: 'N · rename'
  },
  vi: {
    takeEgg: 'Lấy trứng tinh thể', needCrystals: 'Cần 3 tinh thể để ủ ấm — đào tinh thể ở M9 bằng Cuốc II', eggTaken: 'Trứng đang ấm trong túi — cứ đi tiếp',
    eggHud: p => `🥚 Trứng: ấm ${p}%`, hatched: 'Một Rocky đã nở!', nameTitle: 'Một Rocky đã nở!', nameHint: 'Đặt tên cho bé (tối đa 12 ký tự)',
    renameTitle: 'Đổi tên Rocky', ok: 'Xong', cancel: 'Hủy', named: n => `${n} giờ là bạn của bạn`, renamed: n => `Đã đổi tên thành ${n}`,
    takeFrom: n => `Nhận từ ${n}`, feed: n => `Cho ${n} ăn`, pet: n => `Vuốt ve ${n}`,
    got: (n, s) => `${n} mang về ${s}`, fed: n => `${n} ăn ngon lành`, petted: n => `${n} ngoáy đuôi`,
    hud: (n, lvl, h) => `🪨 ${n} · ${lvl} · no ${h}%`, lv: ['Rocky con', 'Bạn thân', 'Tri kỷ'], renameKey: 'N · đổi tên'
  }
};
const L = ctx => STR[ctx.lang() === 'vi' ? 'vi' : 'en'];
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// ---------------------------------------------------------------- tuning
const HATCH_TILES = 400;          // tiles walked before the egg hatches
const FOLLOW_MIN = 20, FOLLOW_MAX = 28;
const PLAYER_SPEED = 84;          // entities.js Player
const PET_SPEED = PLAYER_SPEED * 1.1;
const TELEPORT_PX = 8 * TS;
const HUNGER_EVERY = 60;          // s of play per hunger point
const HUNGRY_AT = 30;
const FEED_AMOUNT = 40;
const FOODS = ['berry', 'egg', 'meat', 'mushroom', 'honey'];
const PET_CD = 20;
const FETCH_MIN = 40, FETCH_MAX = 70, FETCH_RANGE = 6;
const MATERIALS = ['wood', 'rock', 'leaf', 'flower', 'berry', 'shell'];
const DIRV = [[0, 1], [-1, 0], [1, 0], [0, -1]];   // player dir: 0 down, 1 left, 2 right, 3 up
const TAU = Math.PI * 2;
const bondLevel = b => b >= 15 ? 2 : b >= 5 ? 1 : 0;

// ---------------------------------------------------------------- save
function sv(ctx) {
  const s = ctx.S.save; s.sys = s.sys || {};
  const p = (s.sys.pet = s.sys.pet || {});
  if (p.pet) { if (typeof p.pet.hunger !== 'number') p.pet.hunger = 100; if (typeof p.pet.bond !== 'number') p.pet.bond = 0; if (!p.pet.name) p.pet.name = 'Pebble'; }
  if (p.egg && typeof p.egg.walked !== 'number') p.egg.walked = 0;
  return p;
}

// ---------------------------------------------------------------- sprites (cached)
const px = (g, x, y, c, w = 1, h = 1) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
const RP = { body: '#f2a081', shade: '#d97c5c', light: '#f8bfa6', out: '#5a3222' };
const PINK = ['#ff5aa5', '#ffd6ea'];
const spriteCache = new Map();   // key → [stand, walkA, walkB, sit] canvases (12×14, facing right, no eyes)

// frame: 0 stand, 1 walk A, 2 walk B, 3 sit. Eyes are drawn live (blink / facing).
function rockyFrame(g, frame, scarf) {
  const sit = frame === 3, dy = sit ? 2 : 0;
  const box = (x, y, w, h, c = RP.body) => { px(g, x - 1, y - 1, RP.out, w + 2, h + 2); px(g, x, y, c, w, h); };
  // stubby legs (hidden when sitting); a walking frame lifts one of them
  if (!sit) {
    const la = frame === 1 ? 1 : 0, lb = frame === 2 ? 1 : 0;
    box(3, 12 - la, 2, 1, RP.shade); box(7, 12 - lb, 2, 1, RP.shade);
  }
  // body
  box(4, 8 + dy, 4, sit ? 2 : 3); px(g, 4, 8 + dy, RP.shade, 4, 1);
  // huge stone fists
  const fh = sit ? 3 : 4;
  box(1, 8 + dy, 2, fh); box(9, 8 + dy, 2, fh);
  px(g, 1, 10 + dy, RP.shade, 2, 1); px(g, 9, 10 + dy, RP.shade, 2, 1);
  px(g, 1, 8 + dy, RP.light, 1, 1); px(g, 9, 8 + dy, RP.light, 1, 1);
  // head: rounded square, dark brow line, no mouth (drawn last so it sits over the body)
  box(2, 1 + dy, 8, 7);
  for (const [cx, cy] of [[1, dy], [10, dy], [1, 8 + dy], [10, 8 + dy]]) g.clearRect(cx, cy, 1, 1);
  px(g, 2, 1 + dy, RP.shade, 8, 1); px(g, 3, 2 + dy, RP.light, 2, 1);
  // scarf (best friend): nation colours around the neck with a little tail
  if (scarf) {
    px(g, 3, 8 + dy, RP.out, 6, 1);
    px(g, 3, 8 + dy, scarf[0], 6, 1);
    if (scarf[1]) px(g, 5, 8 + dy, scarf[1], 2, 1);
    px(g, 8, 9 + dy, RP.out, 2, 2); px(g, 8, 9 + dy, scarf[0], 1, 2); px(g, 9, 9 + dy, scarf[1] || scarf[0], 1, 1);
  }
}
function flipC(src) { const c = mkCanvas(src.width, src.height), g = c.getContext('2d'); g.translate(src.width, 0); g.scale(-1, 1); g.drawImage(src, 0, 0); return c; }
function frames(scarf) {
  const key = scarf ? scarf.join(',') : '-';
  if (spriteCache.has(key)) return spriteCache.get(key);
  const hk = HOOK.petFrames && HOOK.petFrames(scarf);   // ảnh PixelLab (art.js) nếu có — đã có mắt sẵn (set.px = true)
  const set = hk || [0, 1, 2, 3].map(f => { const c = mkCanvas(12, 14); rockyFrame(c.getContext('2d'), f, scarf); return [c, flipC(c)]; });
  spriteCache.set(key, set); return set;
}
// the crystal egg map object: pink faceted egg in a small crystal nest, with a soft glow baked in
function eggArt(g) {
  g.fillStyle = 'rgba(255,90,165,.18)'; g.beginPath(); g.ellipse(8, 10, 7.5, 5, 0, 0, TAU); g.fill();
  g.fillStyle = 'rgba(0,0,0,.28)'; g.beginPath(); g.ellipse(8, 14, 5, 2, 0, 0, TAU); g.fill();
  // nest: dark crystal shards
  px(g, 3, 12, '#2a1a44', 10, 2); px(g, 2, 13, '#3d2a63', 3, 1); px(g, 11, 13, '#3d2a63', 3, 1); px(g, 4, 11, '#5a3fa8', 2, 1); px(g, 10, 11, '#5a3fa8', 2, 1);
  // egg silhouette (outline) rows: width per row from the top
  const rows = [[7, 2], [6, 4], [5, 6], [4, 8], [4, 8], [4, 8], [4, 8], [5, 6], [6, 4]];
  rows.forEach(([x, w], i) => px(g, x - 1, 3 + i, '#7a2a5a', w + 2, 1));
  px(g, 6, 2, '#7a2a5a', 4, 1); px(g, 5, 12, '#7a2a5a', 6, 1);
  rows.forEach(([x, w], i) => px(g, x, 3 + i, '#ff7fc0', w, 1));
  // facets
  px(g, 5, 6, '#ff5aa5', 2, 3); px(g, 9, 5, '#ff5aa5', 2, 2); px(g, 7, 9, '#e0408a', 3, 2); px(g, 4, 9, '#e0408a', 2, 1);
  px(g, 6, 4, '#ffd6ea', 2, 2); px(g, 9, 8, '#ffd6ea', 1, 1); px(g, 7, 3, '#ffffff', 1, 1);
}
let eggDefined = false;
function defineEgg(ctx) { if (!eggDefined) { ctx.defineObject('crystal_egg', 16, 16, 1, 1, eggArt, { solid: false }); eggDefined = true; } }

// ---------------------------------------------------------------- module state
const ST = {
  ent: null,            // { x, y, dir(1 right / -1 left), fr, ft, state, hop, ghost, blocked, sit, blink, blinkT, bounceT, tx, ty }
  eggObj: null,         // the placed egg object in this zone
  lastP: null,          // last player position (walk tracking)
  fx: [],               // particles: hearts, notes, dust
  sparkle: null,        // { x, y, t } world px
  fetchT: 0,            // countdown to the next sparkle
  holding: null,        // { id, n } the pet carries back
  idleT: 0, petCd: 0, hungerAcc: 0, persistT: 0,
  panelEl: null, closerSet: false, naming: false, digT: 0
};
const tileOf = v => Math.floor(v / TS);
function passable(ctx, x, y) {   // 8×4 feet box, same tile rule as the player's default
  const map = ctx.S.map;
  for (const [ox, oy] of [[-4, -4], [3, -4], [-4, -1], [3, -1]]) if (ctx.isSolid(map, tileOf(x + ox), tileOf(y + oy))) return false;
  return true;
}
function freeNear(ctx, x, y) {   // nearest walkable px spot around (x,y)
  if (passable(ctx, x, y)) return { x, y };
  for (let r = 8; r <= 48; r += 8) for (let a = 0; a < TAU; a += TAU / 8) { const nx = x + Math.cos(a) * r, ny = y + Math.sin(a) * r; if (passable(ctx, nx, ny)) return { x: nx, y: ny }; }
  return { x, y };
}
function behindPoint(ctx, d = 24) {
  const p = ctx.S.player, [vx, vy] = DIRV[p.dir & 3];
  return { x: p.x - vx * d, y: p.y - vy * d };
}
function spawnEnt(ctx) {
  const p = ctx.S.player, bp = behindPoint(ctx, 16), b = freeNear(ctx, bp.x, bp.y);
  ST.ent = { x: b.x, y: b.y, dir: p.dir === 1 ? -1 : 1, fr: 0, ft: 0, state: 'follow', hop: 0, ghost: 0, blocked: 0, sit: false, blink: 0, blinkT: 2, bounceT: 6, moving: false };
  return ST.ent;
}
function teleport(ctx) { const bp = behindPoint(ctx, 16), b = freeNear(ctx, bp.x, bp.y); ST.ent.x = b.x; ST.ent.y = b.y; ST.ent.blocked = 0; ST.ent.ghost = 0; }

// ---------------------------------------------------------------- particles
function hearts(x, y, n = 6) {
  for (let i = 0; i < n; i++) ST.fx.push({ k: 'heart', x: x + (Math.random() - 0.5) * 14, y: y - 8 - Math.random() * 6, vx: (Math.random() - 0.5) * 8, vy: -14 - Math.random() * 12, t: 0.9 + Math.random() * 0.4, life: 1.3, c: Math.random() < 0.5 ? '#ff5aa5' : '#ff8fc8' });
}
function note(x, y) { ST.fx.push({ k: 'note', x: x + 5, y: y - 16, vx: 4, vy: -12, t: 0.9, life: 0.9 }); }
function dust(x, y, n = 6) {
  for (let i = 0; i < n; i++) ST.fx.push({ k: 'dust', x: x + (Math.random() - 0.5) * 8, y: y - 1, vx: (Math.random() - 0.5) * 40, vy: -18 - Math.random() * 20, g: 90, t: 0.35 + Math.random() * 0.25, life: 0.6, c: Math.random() < 0.5 ? '#6b5a78' : '#a898b8' });
}
function updateFx(dt) {
  for (let i = ST.fx.length - 1; i >= 0; i--) {
    const p = ST.fx[i]; p.t -= dt;
    if (p.t <= 0) { ST.fx.splice(i, 1); continue; }
    p.x += p.vx * dt; p.y += p.vy * dt; if (p.g) p.vy += p.g * dt;
    if (p.k === 'heart') p.x += Math.sin(p.t * 9) * 6 * dt;
  }
  if (ST.fx.length > 60) ST.fx.splice(0, ST.fx.length - 60);
}
function drawHeart(g, x, y, c) { px(g, x, y, c, 2, 1); px(g, x + 3, y, c, 2, 1); px(g, x, y + 1, c, 5, 1); px(g, x + 1, y + 2, c, 3, 1); px(g, x + 2, y + 3, c, 1, 1); }

// ---------------------------------------------------------------- egg
function placeEgg(ctx) {
  const s = sv(ctx), map = ctx.S.map; ST.eggObj = null;
  if (s.egg || s.pet || s.eggTaken) return;
  defineEgg(ctx);
  const ok = (x, y) => x > 2 && y > 2 && x < map.w - 3 && y < map.h - 3 && !ctx.isSolid(map, x, y) && !ctx.hasObjectAt(map, x, y);
  let at = s.eggAt && ok(s.eggAt.x, s.eggAt.y) ? s.eggAt : null;
  if (!at) {
    const cx = map.w >> 1, cy = map.h >> 1, rng = ctx.rngFrom(ctx.hashStr('pet-egg') ^ 0x77);
    for (let r = 2; r <= 14 && !at; r += 2) {
      const c = ctx.freeTiles(map, rng, { x: cx - r, y: cy - r, w: r * 2 + 1, h: r * 2 + 1 }, 1, Object.values(map.entries), 3, 1);
      if (c.length && ok(c[0].x, c[0].y)) at = { x: c[0].x, y: c[0].y };
    }
    if (!at) return;
    s.eggAt = at; ctx.persist();
  }
  ST.eggObj = ctx.place(map, 'crystal_egg', at.x, at.y, { petEgg: true });
}
function takeEgg(ctx) {
  const t = L(ctx), s = sv(ctx);
  if (!ctx.bag.has('crystal', 3)) { ctx.toast(t.needCrystals); ctx.sfx('fail'); return; }
  ctx.bag.remove('crystal', 3);
  if (ST.eggObj) { ctx.removeObject(ctx.S.map, ST.eggObj); ST.eggObj = null; }
  s.egg = { warmth: 0, walked: 0 }; s.eggTaken = true;
  ctx.sfx('pickup'); ctx.toast(t.eggTaken, true); ctx.persist();
  hearts(ctx.S.player.x, ctx.S.player.y - 10, 4);
}
function hatch(ctx) {
  const t = L(ctx), s = sv(ctx);
  if (s.pet) return;
  s.egg = null; s.eggTaken = true;
  s.pet = { name: 'Pebble', hunger: 100, bond: 0, born: Date.now() };
  const sav = ctx.S.save; sav.achievements = sav.achievements || []; if (!sav.achievements.includes('pet')) sav.achievements.push('pet');
  ctx.persist();
  spawnEnt(ctx); hearts(ST.ent.x, ST.ent.y, 8); dust(ST.ent.x, ST.ent.y, 8);
  ctx.sfx('win'); ctx.toast(t.hatched, true);
  openName(ctx, false);
}

// ---------------------------------------------------------------- naming panel (mode 'petname')
function openName(ctx, rename) {
  const t = L(ctx), s = sv(ctx); if (!s.pet) return;
  const cur = rename ? s.pet.name : 'Pebble';
  const html = `<h2>🪨 ${esc(rename ? t.renameTitle : t.nameTitle)}</h2><p class="dim">${esc(t.nameHint)}</p>
    <input id="pet-nm" maxlength="12" value="${esc(cur)}" autocomplete="off" spellcheck="false">
    <div style="display:flex;gap:8px"><button class="btn primary" id="pet-ok" style="margin:6px 0">${esc(t.ok)}</button>${rename ? `<button class="btn" id="pet-cancel" style="margin:6px 0">${esc(t.cancel)}</button>` : ''}</div>`;
  ST.panelEl = ctx.panel('petname', html); ST.panelEl.hidden = false; ST.naming = true;
  const el = ST.panelEl.panel, inp = el.querySelector('#pet-nm');
  const done = () => confirmName(ctx, inp.value, rename);
  el.querySelector('#pet-ok').onclick = done;
  const cancel = el.querySelector('#pet-cancel'); if (cancel) cancel.onclick = () => closeName(ctx);
  inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); done(); } });
  ctx.setMode('petname');
  ctx.onAction('petname', done);                                           // E / Enter / touch A while the input is not focused
  if (!ST.closerSet) { ctx.registerCloser('petname', () => closeName(ctx)); ST.closerSet = true; }
  setTimeout(() => { try { inp.focus(); inp.select(); } catch (e) { } }, 60);
}
function confirmName(ctx, raw, rename) {
  const t = L(ctx), s = sv(ctx);
  const name = String(raw || '').trim().slice(0, 12) || 'Pebble';
  if (s.pet) { s.pet.name = name; ctx.persist(); ctx.toast(rename ? t.renamed(name) : t.named(name)); }
  closeName(ctx);
}
function closeName(ctx) {
  ST.naming = false;
  if (ST.panelEl) ST.panelEl.hidden = true;
  if (ctx.S.mode === 'petname') ctx.setMode('play');
}

// ---------------------------------------------------------------- fetch
function spawnSparkle(ctx) {
  const p = ctx.S.player, map = ctx.S.map;
  for (let i = 0; i < 30; i++) {
    const a = Math.random() * TAU, r = (2 + Math.random() * (FETCH_RANGE - 2)) * TS;
    const x = p.x + Math.cos(a) * r, y = p.y + Math.sin(a) * r, tx = tileOf(x), ty = tileOf(y);
    if (tx < 2 || ty < 2 || tx >= map.w - 2 || ty >= map.h - 2) continue;
    if (ctx.isSolid(map, tx, ty) || ctx.hasObjectAt(map, tx, ty)) continue;
    if (!passable(ctx, tx * TS + 8, ty * TS + 12)) continue;
    ST.sparkle = { x: tx * TS + 8, y: ty * TS + 12, t: 0, life: 30 };
    if (ST.ent) { ST.ent.state = 'fetch'; ST.ent.sit = false; }
    return true;
  }
  return false;
}
function rollLoot() {
  const r = Math.random();
  if (r < 0.60) return { id: 'stone', n: 1 + (Math.random() < 0.5 ? 1 : 0) };
  if (r < 0.95) return { id: MATERIALS[(Math.random() * MATERIALS.length) | 0], n: 1 };
  return { id: 'pearl', n: 1 };
}
function cancelFetch() { ST.sparkle = null; if (ST.ent && (ST.ent.state === 'fetch' || ST.ent.state === 'dig')) ST.ent.state = 'follow'; }
function giveLoot(ctx) {
  const t = L(ctx), s = sv(ctx), h = ST.holding; if (!h || !s.pet) return;
  const got = ctx.bag.add(h.id, h.n);
  if (got <= 0) return;                                                   // bag full: the pet keeps holding it
  ST.holding = null; s.pet.bond += 1; ctx.persist();
  ctx.sfx('pickup'); ctx.toast(t.got(s.pet.name, `+${got} ${ctx.itemIcon(h.id)} ${ctx.itemName(h.id)}`));
  hearts(ST.ent.x, ST.ent.y, 3);
}

// ---------------------------------------------------------------- feeding / petting
function foodInBag(ctx) { return FOODS.find(id => ctx.bag.has(id, 1)) || null; }
function feed(ctx) {
  const t = L(ctx), s = sv(ctx), id = foodInBag(ctx); if (!s.pet || !id) return false;
  ctx.bag.remove(id, 1);
  s.pet.hunger = Math.min(100, s.pet.hunger + FEED_AMOUNT); s.pet.bond += 1; ctx.persist();
  if (ST.ent) { hearts(ST.ent.x, ST.ent.y, 7); note(ST.ent.x, ST.ent.y); ST.ent.hop = 0.5; }
  ctx.sfx('coin'); ctx.toast(t.fed(s.pet.name));
  return true;
}
function petIt(ctx) {
  const t = L(ctx), s = sv(ctx); if (!s.pet || ST.petCd > 0) return;
  s.pet.bond = Math.round((s.pet.bond + 0.2) * 10) / 10; ST.petCd = PET_CD; ctx.persist();
  if (ST.ent) { hearts(ST.ent.x, ST.ent.y, 5); ST.ent.hop = 0.4; }
  ctx.sfx('squeak'); ctx.toast(t.petted(s.pet.name));
}
function scarfFor(ctx) {
  const s = sv(ctx); if (!s.pet || bondLevel(s.pet.bond) < 2) return null;
  const self = ctx.S.save.self, id = self && (typeof self === 'object' ? self.id : self);
  const m = id != null && ctx.byId ? ctx.byId.get(id) : null;
  const n = m ? ctx.nationOf(m) : null;
  return (n && FLAG_COLORS[n.key]) || PINK;
}

// ---------------------------------------------------------------- movement
function stepToward(ctx, e, tx, ty, sp, dt) {
  const dx = tx - e.x, dy = ty - e.y, d = Math.hypot(dx, dy); if (d < 0.5) return true;
  const mx = dx / d * sp * dt, my = dy / d * sp * dt; let moved = false;
  const ok = (x, y) => e.ghost > 0 || passable(ctx, x, y);
  if (mx && ok(e.x + mx, e.y)) { e.x += mx; moved = true; }
  if (my && ok(e.x, e.y + my)) { e.y += my; moved = true; }
  if (Math.abs(dx) > 1) e.dir = dx > 0 ? 1 : -1;
  if (!moved) { e.blocked += dt; if (e.blocked > 1) { e.blocked = 0; e.ghost = 0.5; e.hop = 0.5; dust(e.x, e.y, 4); } }
  else e.blocked = 0;
  return moved;
}
function updatePet(dt, ctx) {
  const s = sv(ctx), p = ctx.S.player, e = ST.ent || spawnEnt(ctx), playing = ctx.S.mode === 'play';
  const hungry = s.pet.hunger < HUNGRY_AT;
  const riding = !!(ctx.S.sea || (ctx.S.map && ctx.S.map.sea));
  if (e.ghost > 0) e.ghost -= dt;
  if (e.hop > 0) e.hop -= dt;
  if (ST.petCd > 0) ST.petCd -= dt;
  // hunger: 1 point per minute of play
  ST.hungerAcc += dt;
  if (ST.hungerAcc >= HUNGER_EVERY) { ST.hungerAcc -= HUNGER_EVERY; s.pet.hunger = Math.max(0, s.pet.hunger - 1); ctx.persist(); }
  // idle tracking
  if (p.moving) ST.idleT = 0; else ST.idleT += dt;

  if (riding) {                                                            // on the raft: sits next to the player, no pathing
    if (ST.sparkle) cancelFetch();
    e.state = 'ride'; e.x = p.x + (p.dir === 2 ? -9 : 9); e.y = p.y + 1; e.dir = p.dir === 1 ? -1 : 1; e.sit = true; e.moving = false;
  } else {
    if (e.state === 'ride') e.state = 'follow';
    const dp = Math.hypot(p.x - e.x, p.y - e.y);
    if (dp > TELEPORT_PX) { teleport(ctx); cancelFetch(); }
    const spd = PET_SPEED * (hungry ? 0.7 : 1) * Math.min(2, Math.max(1, p.speedMul || 1));
    e.moving = false;
    if (e.state === 'fetch' && ST.sparkle) {
      const sp = ST.sparkle; sp.t += dt;
      if (sp.t > sp.life || Math.hypot(sp.x - p.x, sp.y - p.y) > 14 * TS) cancelFetch();
      else {
        const d = Math.hypot(sp.x - e.x, sp.y - e.y);
        if (d < 5) { e.state = 'dig'; ST.digT = 1; }
        else { stepToward(ctx, e, sp.x, sp.y, spd, dt); e.moving = true; }
      }
    } else if (e.state === 'dig') {
      ST.digT -= dt; e.sit = false;
      if (Math.random() < dt * 9) dust(e.x, e.y, 2);
      if (ST.digT <= 0) { ST.holding = rollLoot(); ST.sparkle = null; e.state = 'follow'; e.hop = 0.5; ctx.sfx('pickup'); note(e.x, e.y); }
    } else {
      e.state = 'follow';
      const tgt = behindPoint(ctx, FOLLOW_MAX - 4);
      const dt2 = Math.hypot(tgt.x - e.x, tgt.y - e.y);
      if (dp > FOLLOW_MAX || (dp > FOLLOW_MIN && dt2 > 6 && p.moving)) { stepToward(ctx, e, tgt.x, tgt.y, spd, dt); e.moving = true; e.sit = false; }
      else if (dp < FOLLOW_MIN - 6 && p.moving) { stepToward(ctx, e, e.x - (p.x - e.x), e.y - (p.y - e.y), spd * 0.6, dt); e.moving = true; }
      else if (Math.abs(p.x - e.x) > 2) e.dir = p.x > e.x ? 1 : -1;
    }
    // sit down when the player has been standing still for 3 s
    if (!e.moving && ST.idleT >= 3 && e.state === 'follow' && playing) {
      if (!e.sit) { e.sit = true; e.bounceT = 4 + Math.random() * 5; }
    } else if (e.moving || ST.idleT < 3) e.sit = false;
  }
  // blink + the occasional happy bounce while sitting
  e.blinkT -= dt;
  if (e.blinkT <= 0) { e.blink = 0.14; e.blinkT = (e.sit ? 1.6 : 3) + Math.random() * 3; }
  if (e.blink > 0) e.blink -= dt;
  if (e.sit) { e.bounceT -= dt; if (e.bounceT <= 0) { e.bounceT = 5 + Math.random() * 5; e.hop = 0.45; note(e.x, e.y); } }
  // walk animation
  e.ft += dt * (e.moving ? 9 : 0); e.fr = e.moving ? 1 + ((e.ft | 0) % 2) : 0;
  // fetch timer
  if (!riding && playing && !ST.sparkle && !ST.holding && s.pet.bond >= 1) {
    ST.fetchT -= dt;
    if (ST.fetchT <= 0) { ST.fetchT = FETCH_MIN + Math.random() * (FETCH_MAX - FETCH_MIN); spawnSparkle(ctx); }
  }
  if (ST.sparkle) ST.sparkle.ph = (ST.sparkle.ph || 0) + dt;
}

// ---------------------------------------------------------------- system
export const pet = {
  id: 'pet',

  onZoneEnter(ctx) {
    const s = sv(ctx);
    ST.fx.length = 0; ST.sparkle = null; ST.lastP = null; ST.idleT = 0; ST.eggObj = null;
    if (ctx.S.mode === 'petname') closeName(ctx);
    if (ctx.S.zone && ctx.S.zone.id === 'm9') placeEgg(ctx);
    if (s.pet) { spawnEnt(ctx); if (ST.fetchT <= 0) ST.fetchT = FETCH_MIN + Math.random() * (FETCH_MAX - FETCH_MIN); }
    else ST.ent = null;
    if (typeof window !== 'undefined') window.__pet = {
      hatchNow: () => { const st = sv(ctx); if (st.pet) return st.pet; if (ST.eggObj) { ctx.removeObject(ctx.S.map, ST.eggObj); ST.eggObj = null; } st.egg = st.egg || { warmth: 0, walked: 0 }; hatch(ctx); return st.pet; },
      state: () => ({ save: JSON.parse(JSON.stringify(sv(ctx))), ent: ST.ent && { x: Math.round(ST.ent.x), y: Math.round(ST.ent.y), state: ST.ent.state, sit: ST.ent.sit, ghost: ST.ent.ghost > 0 }, sparkle: ST.sparkle && { x: ST.sparkle.x, y: ST.sparkle.y }, holding: ST.holding, egg: ST.eggObj && { x: ST.eggObj.x, y: ST.eggObj.y }, mode: ctx.S.mode, petCd: ST.petCd, fetchT: ST.fetchT }),
      warp: (tx, ty) => { if (!ST.ent) return null; ST.ent.x = tx * TS + 8; ST.ent.y = ty * TS + 12; return { x: ST.ent.x, y: ST.ent.y }; },
      fetchNow: () => { if (!sv(ctx).pet) return false; ST.holding = null; return spawnSparkle(ctx); },
      feed: () => { if (!foodInBag(ctx)) ctx.bag.add('berry', 1); return feed(ctx); },
      name: n => confirmName(ctx, n, true)
    };
  },

  onZoneLeave(ctx) {
    ST.sparkle = null; ST.fx.length = 0; ST.eggObj = null;
    if (ST.ent && (ST.ent.state === 'fetch' || ST.ent.state === 'dig')) ST.ent.state = 'follow';
    if (ctx.S.mode === 'petname') closeName(ctx);
  },

  update(dt, ctx) {
    const s = sv(ctx), p = ctx.S.player; if (!p || !ctx.S.map) return;
    // how far the player walks warms the egg (teleports / zone jumps do not count)
    if (ST.lastP) {
      const d = Math.hypot(p.x - ST.lastP.x, p.y - ST.lastP.y);
      if (d > 0 && d < 40 && s.egg && !s.pet) {
        s.egg.walked += d / TS; s.egg.warmth = Math.min(1, s.egg.walked / HATCH_TILES);
        ST.persistT += dt;
        if (s.egg.walked >= HATCH_TILES) hatch(ctx);
        else if (ST.persistT > 4) { ST.persistT = 0; ctx.persist(); }
      }
    }
    ST.lastP = { x: p.x, y: p.y };
    updateFx(dt);
    if (s.pet) updatePet(dt, ctx);
  },

  near(ctx) {
    if (ctx.S.mode !== 'play') return null;
    const t = L(ctx), s = sv(ctx), p = ctx.S.player;
    if (ST.eggObj && ctx.S.map.objects.includes(ST.eggObj)) {
      const x = ST.eggObj.x * TS + 8, y = ST.eggObj.y * TS + 12;
      if (Math.hypot(x - p.x, y - p.y) < 26) return { label: t.takeEgg, x, y, limit: 26, priority: true, data: { egg: true } };
    }
    if (!s.pet || !ST.ent) return null;
    const e = ST.ent, d = Math.hypot(e.x - p.x, e.y - p.y); if (d > 30 || e.state === 'fetch' || e.state === 'dig') return null;
    const n = s.pet.name;
    if (ST.holding) return { label: t.takeFrom(n), x: e.x, y: e.y, limit: 30, priority: true, data: { take: true } };
    if (s.pet.hunger < 100 && foodInBag(ctx)) return { label: t.feed(n), x: e.x, y: e.y, limit: 30, data: { feed: true } };
    if (ST.petCd <= 0) return { label: t.pet(n), x: e.x, y: e.y, limit: 30, data: { pet: true } };
    return null;
  },

  interact(ctx, cand) {
    const d = cand && cand.data; if (!d) return;
    if (d.egg) takeEgg(ctx);
    else if (d.take) giveLoot(ctx);
    else if (d.feed) feed(ctx);
    else if (d.pet) petIt(ctx);
  },

  key(code, ctx) {
    if (code !== 'KeyN' || ctx.S.mode !== 'play') return false;
    const s = sv(ctx); if (!s.pet || !ST.ent) return false;
    const p = ctx.S.player; if (Math.hypot(ST.ent.x - p.x, ST.ent.y - p.y) > 40) return false;
    openName(ctx, true); return true;
  },

  drawables(ctx, cx, cy) {
    const s = sv(ctx), e = ST.ent; if (!s.pet || !e) return [];
    const g = ctx.g, sx = e.x - cx, sy = e.y - cy;
    if (sx < -30 || sy < -40 || sx > ctx.VW + 30 || sy > ctx.VH + 30) return [];
    const set = frames(scarfFor(ctx));
    const fr = e.sit ? 3 : e.fr, img = set[fr][e.dir < 0 ? 1 : 0];
    const hop = e.hop > 0 ? Math.round(Math.abs(Math.sin(e.hop * Math.PI * 4)) * 3) : (e.moving ? Math.round(Math.abs(Math.sin(e.ft * 1.6)) * 1) : 0);
    const x0 = Math.round(e.x) - 6, y0 = Math.round(e.y) - 14 - hop, ghost = e.ghost > 0;
    return [{
      y: e.y + (e.state === 'ride' ? 0.6 : 0), f: () => {
        g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(Math.round(e.x) - cx, Math.round(e.y) - cy, 5, 2, 0, 0, TAU); g.fill();
        if (ghost) g.globalAlpha = 0.55;
        g.drawImage(img, x0 - cx, y0 - cy);
        // eyes: two slits (or a blink), nudged toward the way it faces
        const dy = (e.sit ? 2 : 0) + 3, ex = x0 - cx + (e.dir < 0 ? 3 : 4);
        g.fillStyle = RP.out;
        if (set.px) { /* sprite PixelLab đã có mắt */ }
        else if (e.blink > 0) { g.fillRect(ex, y0 - cy + dy + 1, 1, 1); g.fillRect(ex + 3, y0 - cy + dy + 1, 1, 1); }
        else { g.fillRect(ex, y0 - cy + dy, 1, 2); g.fillRect(ex + 3, y0 - cy + dy, 1, 2); }
        g.globalAlpha = 1;
        // the item it carries, held up over its head
        if (ST.holding) {
          const c = { stone: '#8a8a96', wood: '#8a5a2e', rock: '#6f6a7a', leaf: '#4caa4f', flower: '#ff8fc8', berry: '#d0304a', shell: '#f5e6d0', pearl: '#ffffff' }[ST.holding.id] || '#ffd45e';
          const hx = x0 - cx + 4, hy = y0 - cy - 4 + Math.round(Math.sin(ctx.S.time * 4) * 1);
          g.fillStyle = RP.out; g.fillRect(hx - 1, hy - 1, 5, 5); g.fillStyle = c; g.fillRect(hx, hy, 3, 3); g.fillStyle = 'rgba(255,255,255,.7)'; g.fillRect(hx, hy, 1, 1);
        }
      }
    }];
  },

  // world-space effects: egg glow, the fetch sparkle, hearts / notes / dust
  draw(g, ctx, cx, cy) {
    const tm = ctx.S.time;
    if (ST.eggObj && ctx.S.map.objects.includes(ST.eggObj)) {
      const x = ST.eggObj.x * TS + 8 - cx, y = ST.eggObj.y * TS + 9 - cy;
      if (x > -30 && y > -30 && x < ctx.VW + 30 && y < ctx.VH + 30) {
        const k = 0.5 + 0.5 * Math.sin(tm * 2.2), r = 14 + k * 4;
        g.save(); g.globalCompositeOperation = 'lighter';
        const gr = g.createRadialGradient(x, y, 1, x, y, r); gr.addColorStop(0, `rgba(255,120,190,${(0.28 + k * 0.18).toFixed(3)})`); gr.addColorStop(1, 'rgba(255,120,190,0)');
        g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
        g.restore();
        g.fillStyle = 'rgba(255,214,234,.9)';                            // a drifting glint or two
        g.fillRect(x - 6 + Math.round(Math.sin(tm * 1.7) * 3), y - 9 + Math.round(Math.cos(tm * 2.3) * 2), 1, 1);
        g.fillRect(x + 5 + Math.round(Math.cos(tm * 1.3) * 2), y - 3 + Math.round(Math.sin(tm * 1.9) * 3), 1, 1);
      }
    }
    if (ST.sparkle) {
      const sp = ST.sparkle, x = Math.round(sp.x) - cx, y = Math.round(sp.y) - 3 - cy, ph = sp.ph || 0;
      const k = 0.55 + 0.45 * Math.sin(ph * 6), r = 3 + Math.round(k * 2);
      g.fillStyle = `rgba(255,240,150,${(0.25 + k * 0.2).toFixed(2)})`; g.beginPath(); g.arc(x, y, r + 3, 0, TAU); g.fill();
      g.fillStyle = '#ffd45e'; g.fillRect(x - r, y, r * 2 + 1, 1); g.fillRect(x, y - r, 1, r * 2 + 1);
      g.fillStyle = '#ffffff'; g.fillRect(x - 1, y - 1, 3, 3);
      g.fillStyle = '#ffe9a0'; g.fillRect(x + 4 + Math.round(Math.sin(ph * 3) * 2), y - 5, 1, 1); g.fillRect(x - 5, y + 3 + Math.round(Math.cos(ph * 4) * 2), 1, 1);
    }
    for (const p of ST.fx) {
      const k = Math.max(0, p.t / p.life), x = Math.round(p.x) - cx, y = Math.round(p.y) - cy;
      g.globalAlpha = Math.min(1, k * 1.5);
      if (p.k === 'heart') drawHeart(g, x - 2, y - 2, p.c);
      else if (p.k === 'dust') { g.fillStyle = p.c; g.fillRect(x, y, 2, 2); }
    }
    g.globalAlpha = 1;
  },

  // crisp overlay: ♪ notes and the hungry 🍖 thought bubble
  drawUI(ug, ctx, cx, cy, scale) {
    const s = sv(ctx), e = ST.ent; if (!s.pet || !e) return;
    ug.save(); ug.textAlign = 'center'; ug.textBaseline = 'middle';
    for (const p of ST.fx) {
      if (p.k !== 'note') continue;
      const k = Math.max(0, p.t / p.life);
      ug.globalAlpha = Math.min(1, k * 1.6); ug.fillStyle = '#ffd45e'; ug.font = `bold ${Math.max(11, scale * 4)}px "Segoe UI",system-ui,sans-serif`;
      ug.fillText('♪', (p.x - cx) * scale, (p.y - cy) * scale);
    }
    ug.globalAlpha = 1;
    if (s.pet.hunger < HUNGRY_AT && e.state !== 'ride') {
      const bx = Math.round((e.x + 8 - cx) * scale), by = Math.round((e.y - 20 - cy) * scale), r = Math.max(7, scale * 3.2);
      ug.fillStyle = 'rgba(255,255,255,.92)'; ug.beginPath(); ug.arc(bx, by, r, 0, TAU); ug.fill();
      ug.beginPath(); ug.arc(bx - r * 0.7, by + r * 0.9, r * 0.28, 0, TAU); ug.fill(); ug.beginPath(); ug.arc(bx - r * 1.05, by + r * 1.35, r * 0.16, 0, TAU); ug.fill();
      ug.fillStyle = '#1c1a24'; ug.font = `${Math.max(10, scale * 3.6)}px "Segoe UI",system-ui,sans-serif`;
      ug.fillText('🍖', bx, by + 1);
    }
    ug.restore();
  },

  hudLines(ctx) {
    const t = L(ctx), s = sv(ctx);
    if (s.pet) return [t.hud(s.pet.name, t.lv[bondLevel(s.pet.bond)], Math.round(s.pet.hunger))];
    if (s.egg) return [t.eggHud(Math.min(100, Math.round(s.egg.walked / HATCH_TILES * 100)))];
    return [];
  }
};
