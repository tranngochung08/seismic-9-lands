// lan48.js — c48-lan (anh 05/11): đang BƠI ở chỗ sâu của sông Làng → LẶN (phím Z / nút tròn) xuống "Đáy Sông Làng" (vùng 'uriver'),
// một map dưới nước riêng để farm quái nước theo tầng (nông → sâu mạnh dần), tái dùng toàn bộ hệ underwater.js (hơi thở, dáng bơi,
// lỗ phun khí, rương, đồ rải, sức đánh dưới nước) + monsters.js (SP.uriver, trại theo loài). Nổi lên (Z / nút) = về ĐÚNG chỗ đã lặn.
//  · Hơi thở: mỗi lần lặn từ sông có sẵn 120 s "hơi sông" (không cần viên thở của Heathcliff); hơi biển trong save giữ nguyên, nổi lên trả lại.
//  · Ngất dưới đáy sông (hết hơi / bị quái hạ) → nổi lên bờ sông gần chỗ lặn nhất (giữ luật dưới nước: không mất đồ, không về Noxx).
//  · Chơi chung: coop.js chỉ có phòng 'village' → xuống đáy sông là rời phòng (chơi một mình), nổi lên tự vào lại phòng.
import { ZONES, makeMap, setG, fillG, place, inb, isSolid, hasObjectAt, getG, computeReach } from '../world.js';
import { T } from '../gfx.js';
import { ART } from '../art.js';

const ZID = 'uriver', TS = 16, RIVER_BREATH = 120;
const vi = ctx => ctx.lang() !== 'en';
const L = ctx => (vi(ctx) ? {
  dive: 'Lặn', up: 'Nổi', tipDive: 'Lặn xuống đáy sông (Z)', tipUp: 'Nổi lên mặt sông (Z)',
  dived: s => `🫧 Lặn xuống Đáy Sông Làng — hơi thở ${s} s · quái nước mạnh dần về phía thượng nguồn`, surfaced: 'Đã nổi lên mặt sông', fainted: 'Bạn ngất dưới đáy sông… được dòng nước đẩy lên bờ',
} : {
  dive: 'Dive', up: 'Rise', tipDive: 'Dive to the riverbed (Z)', tipUp: 'Swim back up (Z)',
  dived: s => `🫧 You dive to the Village Riverbed — ${s} s of breath · water monsters get stronger upstream`, surfaced: 'Back at the river surface', fainted: 'You blacked out on the riverbed… the current pushed you ashore',
});

/* ---------------- map Đáy Sông Làng (64×52): bờ đá uốn khúc, rong, san hô nước ngọt, lỗ phun khí, 2 rương; trại quái theo tầng ---------------- */
function buildRiver(rng) {
  const W = 64, H = 56, C = 32, m = makeMap(W, H, T.SEABED); m.theme = { tier: 0 }; m.tier = 0; m.under = true; m.river48 = true;
  const left = y => 4 + Math.round(3 + 3 * Math.sin(y / 6.3) + 1.5 * Math.sin(y / 2.7 + 1)), right = y => W - 5 - Math.round(3 + 3 * Math.sin(y / 7.1 + 2) + 1.5 * Math.sin(y / 3.1));
  for (let y = 0; y < H; y++) {
    const a = y < 2 || y >= H - 6 ? W : left(y), b = y < 2 || y >= H - 6 ? -1 : right(y);
    for (let x = 0; x < W; x++) if (x < a || x > b) setG(m, x, y, y >= H - 6 && x >= left(y) && x <= right(y) ? T.SEABED : T.ABYSS, true);   /* hạ lưu: đáy cát cứng (camera điện thoại không lộ khoảng đen) */
  }
  for (let y = 2; y < 4; y++) for (let x = 0; x < W; x++) setG(m, x, y, T.ABYSS, true);   /* thượng nguồn: vách đá */
  /* bờ đá: ô đi được sát vực → đá hang (phá được như dưới biển) */
  const rock = (x, y) => { if (inb(m, x, y) && !isSolid(m, x, y) && !hasObjectAt(m, x, y)) place(m, rng() < .5 ? 'caverock' : 'caverock2', x, y); };
  const edge = [];
  for (let y = 4; y < H - 2; y++) for (let x = 1; x < W - 1; x++) if (!isSolid(m, x, y) && (isSolid(m, x - 1, y) || isSolid(m, x + 1, y) || isSolid(m, x, y - 1) || isSolid(m, x, y + 1))) edge.push([x, y]);
  for (const [x, y] of edge) rock(x, y);
  m.entries = { default: { x: C, y: H - 11 }, back: { x: C, y: H - 11 } };
  m.reserved.push(m.entries.default); for (let y = 5; y < H - 3; y++) m.reserved.push({ x: C, y });   /* lối giữa luôn thông */
  const keep = (x, y) => Math.abs(x - C) <= 1 || (y > H - 15 && y < H - 7 && Math.abs(x - C) <= 4);
  /* cụm san hô + đá giữa lòng sông */
  for (let i = 0; i < 26; i++) {
    const cx = 6 + ((rng() * (W - 12)) | 0), cy = 6 + ((rng() * (H - 13)) | 0), r = 1 + ((rng() * 2) | 0);
    for (let y = cy - r; y <= cy + r; y++) for (let x = cx - r; x <= cx + r; x++) if (!keep(x, y) && Math.hypot(x - cx, y - cy) <= r + 0.3 && rng() < 0.6 && !isSolid(m, x, y) && !hasObjectAt(m, x, y)) place(m, rng() < .55 ? (rng() < .2 ? 'coral_t' : 'coral') : (rng() < .5 ? 'caverock' : 'caverock2'), x, y);
  }
  /* rong cao (không chắn đường; người / quái núp trong rong mờ đi — underwater.js m.kelp) ở khúc giữa; rong thấp rải khắp */
  m.kelp = new Uint8Array(W * H);
  for (let y = 18; y < 36; y++) for (let x = 3; x < W - 3; x++) { const k = Math.sin(x / 4.2) + Math.sin(y / 3.3 + x / 9); if (k > 0.9 && !keep(x, y) && !isSolid(m, x, y) && !hasObjectAt(m, x, y) && rng() < 0.75) { place(m, 'tallkelp', x, y, { kelp: true, ghost: true }); m.kelp[y * W + x] = 1; } }
  for (let i = 0; i < 70; i++) { const x = 4 + ((rng() * (W - 8)) | 0), y = 5 + ((rng() * (H - 10)) | 0); if (!keep(x, y) && !isSolid(m, x, y) && !hasObjectAt(m, x, y)) place(m, 'kelp', x, y); }
  const reach = computeReach(m, m.entries.default);
  const spot = (x0, y0) => { for (let r = 0; r < 9; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { const x = x0 + dx, y = y0 + dy; if (Math.max(Math.abs(dx), Math.abs(dy)) !== r || !inb(m, x, y) || isSolid(m, x, y) || hasObjectAt(m, x, y) || !reach[y * W + x] || !reach[(y + 1) * W + x]) continue; return { x, y }; } return null; };
  for (const [x, y] of [[C - 9, 42], [C + 10, 30], [C - 10, 20], [C + 8, 9]]) { const s = spot(x, y); if (s) place(m, 'vent', s.x, s.y, { vent: true }); }
  [[C - 14, 26, 'c1', [['stone', 6], ['pearl', 1], ['shell', 2]]], [C + 13, 7, 'c2', [['stone', 12], ['pearl', 2], ['seagem', 1]]]].forEach(([x, y, id, loot]) => { const s = spot(x, y); if (s) place(m, 'uchest', s.x, s.y, { uchest: id, loot }); });
  m.pickups = [['shell', 1, C - 6, 40], ['pearl', 1, C + 9, 22], ['shell', 2, C - 8, 12]];
  /* trại quái theo tầng: hạ lưu (gần chỗ lặn) yếu → thượng nguồn mạnh */
  m.camps = [{ k: 'puffer', x: C - 10, y: 39, rx: 7, ry: 5 }, { k: 'jelly', x: C + 10, y: 39, rx: 7, ry: 5 }, { k: 'eel', x: C, y: 28, rx: 16, ry: 6 }, { k: 'swordfish', x: C - 11, y: 14, rx: 9, ry: 6 }, { k: 'sawshark', x: C + 11, y: 11, rx: 9, ry: 5 }]
    .map(c => ({ ...c, rect: { x: c.x - c.rx, y: c.y - c.ry, w: c.rx * 2 + 1, h: c.ry * 2 + 1 } }));
  m.npcArea = { x: 3, y: 3, w: W - 6, h: H - 6 }; m.specials = [];
  return m;
}

/* vùng mới: đăng ký vào ZONES lúc nạp module (systems/index.js nạp trước khi main.js đọc save.zone) */
if (!ZONES[ZID]) ZONES[ZID] = { id: ZID, lv: -2, order: 98.05, hidden: true, under: true, uLv: [3, 12], name: { en: 'Village Riverbed', vi: 'Đáy Sông Làng' }, tremor: 0, build: buildRiver,
  systems: ['underwater', 'petgun', 'monsters', 'hero', 'drops', 'vfx', 'pet', 'photo', 'knock', 'quyen', 'target91', 'noprompt91', 'mouseesc91', 'demban35'], tint: 'rgba(30,120,100,.14)',
  flavor: { en: ['The river is deeper than it looks. Something bites the reeds upstream.'], vi: ['Sông sâu hơn bạn tưởng. Phía thượng nguồn có thứ gì gặm rong.'] } };
/* ảnh: dùng gói Rừng Tảo Bẹ (u2 → u1 → trench → sea) + đá hang của u4 — không cần gói / manifest mới */
if (!Object.getOwnPropertyDescriptor(ART.packs, ZID)) {
  let cache = null;
  Object.defineProperty(ART.packs, ZID, { configurable: true, enumerable: false, get() {
    const u2 = ART.packs.u2, u4 = ART.packs.u4; if (!u2) return ART.packs.u1;
    if (cache && cache.__u2 === u2) return cache;
    const objects = {}, files = {}; for (const k of ['caverock', 'caverock2']) { if (u4 && u4.objects && u4.objects[k]) objects[k] = u4.objects[k]; if (u4 && u4.files && u4.files[k]) files[k] = u4.files[k]; }
    cache = { id: ZID, inherit: 'u2', classes: {}, layers: [], decor: {}, tiles: {}, objects, files, rocky: {}, chars: [], __u2: u2 }; return cache;
  } });
}

/* ---------------- lặn / nổi ---------------- */
const ST = { ctx: null, fx: [], btn: null, desk: null, sig: '', layT: 0, pend: null };
const sv = ctx => ((ctx.S.save.sys ||= {}).c48 ||= {});
const uwSave = ctx => ((ctx.S.save.sys ||= {}).underwater ||= {});
const inRiver = ctx => !!(ctx.S.zone && ctx.S.zone.id === ZID);
const busy = ctx => { const p = ctx.S.player, s = ctx.S.sea; return !p || !!ST.anim || ctx.S.mode !== 'play' || (ctx.hero && ctx.hero.fainted) || !!(s && (s.riding || s.diving)) || p.pilot === 'rocky' || (ctx.air && ctx.air.on && ctx.air.on()); };
function canDive(ctx) { return !!(ctx.S.zone && ctx.S.zone.id === 'village' && ctx.S.swimming && !busy(ctx)); }
function canRise(ctx) { return inRiver(ctx) && !busy(ctx); }
function splash(x, y, big) { ST.fx.push({ x, y, t: 0, big: !!big }); }
function dive(ctx) {
  if (!canDive(ctx)) return false;
  const p = ctx.S.player, s = sv(ctx), u = uwSave(ctx);
  s.x = Math.round(p.x); s.y = Math.round(p.y); s.prev = typeof u.breath === 'number' && isFinite(u.breath) ? u.breath : 0; s.on = true;
  u.breath = RIVER_BREATH; ctx.sfx('dive');
  /* động tác lặn 0,5 s: clip PixelLab 'dive' chúc đầu chìm dần qua mép nước, toé nước, rồi mới chuyển vùng (mờ dần) */
  const sh = p.sheet && p.sheet.actions && p.sheet.actions.dive, c0 = p.custom;
  ST.anim = { t: 0, x: p.x, y: p.y, dur: 0.5, splashed: false };
  p.autoPath = null; p.update = () => { };   /* khoá tạm: ghi đè trên chính đối tượng rồi delete (không đụng speedMul) */
  if (sh && sh.img) p.custom = (g, e) => drawDive(g, e, sh);
  ST.anim.done = () => {
    delete p.update; if (p.custom !== c0 && p.custom && p.custom.__c48) p.custom = null;
    if (!ctx.travel(ZID, 'default')) { u.breath = s.prev; s.on = false; return; }
    ctx.persist(); setTimeout(() => ctx.toast(L(ctx).dived(RIVER_BREATH)), 900);
  };
  if (p.custom) p.custom.__c48 = true;
  return true;
}
function drawDive(g, ent, sh) {
  const a = ST.anim, k = a ? Math.min(1, a.t / a.dur) : 1, x = Math.round(ent.x), y = Math.round(ent.y), wl = y - 8, cw = sh.cw || 32, ch = sh.ch || 32;
  const f = Math.min((sh.n || 12) - 1, Math.floor(k * (sh.n || 12))), dy = Math.round(-6 + k * 26);
  g.save(); g.beginPath(); g.rect(x - 24, wl - 60, 48, 60); g.clip();
  g.drawImage(sh.img, f * cw, (ent.dir & 3) * ch, cw, ch, x - (cw >> 1), wl - ch + dy, cw, ch); g.restore();
  g.fillStyle = 'rgba(230,246,255,.85)'; for (let i = -9; i <= 9; i += 3) g.fillRect(x + i, wl + Math.round(Math.sin(a ? a.t * 12 + i : i)), 2, 1);
}
function rise(ctx, faint) {
  const s = sv(ctx);
  ST.pend = { x: s.x, y: s.y, bank: !!faint }; ctx.sfx(faint ? 'splash' : 'dive');
  if (!ctx.travel('village', 'lan48')) { ST.pend = null; return false; }
  return true;
}
/* làng dựng lại map mỗi lần vào → gài entry 'lan48' (ô chỗ đã lặn / bờ gần nhất khi ngất) ngay trong build, trước khi đặt người + Chấn Thú */
function nearestBank(m, tx, ty) {
  for (let r = 1; r < 24; r++) { let best = null, bd = 1e9; for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue; const x = tx + dx, y = ty + dy, g = getG(m, x, y); if (!inb(m, x, y) || isSolid(m, x, y) || g === T.WATER || g === T.DEEP || hasObjectAt(m, x, y)) continue; const d = dx * dx + dy * dy; if (d < bd) { bd = d; best = { x, y }; } } if (best) return best; }
  return null;
}
if (ZONES.village && !ZONES.village.__c48) {
  const b0 = ZONES.village.build;
  ZONES.village.build = (rng, c) => {
    const m = b0(rng, c), pd = ST.pend;
    if (pd && pd.x != null && m && m.entries) {
      const tx = Math.floor(pd.x / TS), ty = Math.floor((pd.y - 6) / TS), b = pd.bank ? nearestBank(m, tx, ty) : null;
      m.entries.lan48 = b || { x: tx, y: Math.round((pd.y - 14) / TS) }; pd.tile = b;
    }
    return m;
  };
  ZONES.village.__c48 = true;
}

/* ---------------- nút: điện thoại = nút tròn khung pixel (ring.png) cạnh nút A; máy tính = cùng nút, góc phải trên bản đồ nhỏ ---------------- */
const PB = 54;
const CSS = `#c48-dive,#touch #c48-dive{position:fixed!important;right:auto!important;bottom:auto!important;width:${PB}px!important;height:${PB}px!important;min-width:0!important;padding:0!important;margin:0!important;display:flex;align-items:center;justify-content:center;border:none!important;border-radius:50%!important;background:url(assets/px/ui/mslots/ring.png) no-repeat center/100% 100%!important;box-shadow:none!important;image-rendering:pixelated;box-sizing:border-box;z-index:7;cursor:pointer;touch-action:none}
#c48-dive img{width:28px;height:28px;image-rendering:pixelated;pointer-events:none;margin-top:-5px}
#c48-dive i{position:absolute;left:-10px;right:-10px;bottom:-7px;font:15px/1 VT323,monospace;color:#fff6c8;font-style:normal;text-align:center;white-space:nowrap;pointer-events:none;text-shadow:1px 1px 0 #352022,-1px 0 0 #352022,0 -1px 0 #352022,1px 0 0 #352022}
#c48-dive:active{transform:translateY(2px)}
#c48-dive[hidden],#touch #c48-dive[hidden]{display:none!important}`;
const coarse = () => { try { return matchMedia('(pointer: coarse)').matches; } catch (e) { return false; } };
function icon() { const f = ART.man && ART.man.ui && ART.man.ui.items && ART.man.ui.items.st_breath; return f ? 'assets/px/' + f : ''; }
function btnTick(ctx, dt) {
  if (typeof document === 'undefined') return;
  const show = canDive(ctx) || canRise(ctx), ms = typeof window !== 'undefined' && window.__ms, phone = coarse();
  const a = document.getElementById('btn-a'), host = phone ? document.getElementById('touch') : document.body;
  const vis = show && !!host && (!phone || (a && a.getBoundingClientRect().width && (!ms || ms.visible())));
  if (!ST.btn) {
    if (!vis) return;
    const st = document.createElement('style'); st.id = 'c48-css'; st.textContent = CSS; document.head.appendChild(st);
    const b = document.createElement('button'); b.id = 'c48-dive'; b.type = 'button'; b.hidden = true; const ic = icon(); b.innerHTML = `${ic ? `<img src="${ic}" alt="">` : '🫧'}<i></i>`;
    b.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); const c = ST.ctx || ctx; if (canRise(c)) rise(c); else dive(c); ST.sig = ''; });
    host.appendChild(b); ST.btn = b; ST.layT = 0;
  }
  const b = ST.btn; if (b.hidden === vis) b.hidden = !vis; if (!vis) return;
  const t = L(ctx), up = inRiver(ctx), sig = [up, t.dive, phone].join('|');
  if (sig !== ST.sig) { ST.sig = sig; b.querySelector('i').textContent = (up ? t.up : t.dive) + (phone ? '' : ' · Z'); b.title = up ? t.tipUp : t.tipDive; }
  if ((ST.layT -= dt) > 0) return; ST.layT = 0.35;
  if (!phone) {   /* máy tính: trên bản đồ nhỏ (góc phải dưới) */
    const mm = document.querySelector('#minimap, #mm, .minimap, canvas#mini'); const r = mm && mm.getBoundingClientRect();
    const x = r && r.width ? Math.round(r.right - PB - 6) : innerWidth - PB - 24, y = r && r.width ? Math.round(r.top - PB - 18) : innerHeight - 260;
    b.style.left = x + 'px'; b.style.top = y + 'px'; return;
  }
  const r = a.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2, ra = r.width / 2, taken = [];
  for (const e of document.querySelectorAll('#touch button, #mslots > *, #joy, .dpad, #altw, #herobar, #hotbar, #btn-chat, .sky-btn, #btn-copter, #px-clock, #px-status, #px-money, #btn-menu, #btn-photo, #touch-skills, #c10-ball, .c79-btn')) {
    if (e === b || e.classList.contains('kib') || e.classList.contains('lt-orb') || e.hidden || e.closest('[hidden]') || getComputedStyle(e).display === 'none' || getComputedStyle(e).visibility === 'hidden') continue;
    const q = e.getBoundingClientRect(); if (q.width && q.height) taken.push(q); }
  const free = (x, y) => x >= 4 && y >= 4 && x + PB <= innerWidth - 4 && y + PB <= innerHeight - 4 && !taken.some(q => !(x + PB <= q.left - 4 || x >= q.right + 4 || y + PB <= q.top - 4 || y >= q.bottom + 4));
  let at = null;
  for (const rad of [ra + PB / 2 + 8, ra + PB / 2 + 24, ra + PB / 2 + 44, ra + PB / 2 + 66]) { for (const ang of [150, 165, 135, 180, 120, 105, 195, 90, 210]) { const k = ang * Math.PI / 180, x = Math.round(cx + Math.cos(k) * rad - PB / 2), y = Math.round(cy - Math.sin(k) * rad - PB / 2); if (free(x, y)) { at = [x, y]; break; } } if (at) break; }
  if (!at) at = [Math.round(r.left - PB - 12), Math.round(r.top - PB - 12)];
  b.style.left = at[0] + 'px'; b.style.top = at[1] + 'px';
}

export const lan48 = {
  id: 'lan48', always: true,
  onZoneEnter(ctx) {
    ST.ctx = ctx; ST.fx = [];
    const S = ctx.S, s = sv(ctx);
    if (inRiver(ctx)) {
      const f0 = ctx.faintTravel && ctx.faintTravel.__c48 ? ctx.faintTravel.__orig : ctx.faintTravel;
      const w = () => (inRiver(ctx) ? rise(ctx, true) : f0 ? f0() : false); w.__c48 = true; w.__orig = f0; ctx.faintTravel = w;
        splash(S.player.x, S.player.y - 10, false);
    } else if (ST.pend && S.zone && S.zone.id === 'village') {
      const pd = ST.pend, p = S.player; ST.pend = null;
      if (!pd.tile && pd.x != null) { p.x = pd.x; p.y = pd.y; }
      const u = uwSave(ctx); if (s.on) { u.breath = typeof s.prev === 'number' ? s.prev : u.breath; s.on = false; }
      splash(p.x, p.y - 4, true); ctx.persist();
      setTimeout(() => ctx.toast(pd.bank ? L(ctx).fainted : L(ctx).surfaced), 700);
    } else if (s.on && !inRiver(ctx)) { const u = uwSave(ctx); u.breath = typeof s.prev === 'number' ? s.prev : u.breath; s.on = false; }   /* rời đáy sông bằng đường khác (tải lại vùng khác…) → trả hơi biển */
    if (typeof window !== 'undefined') window.__lan48 = { state: () => ({ zone: S.zone && S.zone.id, canDive: canDive(ctx), canRise: canRise(ctx), save: { ...sv(ctx) }, btn: !!(ST.btn && !ST.btn.hidden), btnText: ST.btn ? ST.btn.textContent : '' }), dive: () => dive(ctx), rise: () => rise(ctx) };
  },
  update(dt, ctx) {
    ST.ctx = ctx; for (const f of ST.fx) f.t += dt; if (ST.fx.length) ST.fx = ST.fx.filter(f => f.t < 0.7);
    const a = ST.anim; if (a) { a.t += dt; if (!a.splashed && a.t > a.dur * 0.35) { a.splashed = true; splash(a.x, a.y - 6, true); ctx.sfx('splash'); } if (a.t >= a.dur) { ST.anim = null; a.done(); } }
    btnTick(ctx, dt);
  },
  key(code, ctx) {
    if (code !== 'KeyZ' || ctx.S.mode !== 'play') return false;
    if (canRise(ctx)) { rise(ctx); return true; }
    if (canDive(ctx)) { dive(ctx); return true; }
    return false;
  },
  drawables(ctx, cx, cy) {   /* vòng nước toé (chỉ lúc lặn / nổi, 0,7 s) — vẽ code từng pixel */
    if (!ST.fx.length) return [];
    const g = ctx.g, out = [];
    for (const f of ST.fx) out.push({ y: f.y + 0.5, f: () => {
      const k = f.t / 0.7, x = Math.round(f.x - cx), y = Math.round(f.y - cy), r = (f.big ? 7 : 5) + k * (f.big ? 14 : 9);
      for (let i = 0; i < 28; i++) { const a = i / 28 * Math.PI * 2, px = Math.round(x + Math.cos(a) * r), py = Math.round(y + 4 + Math.sin(a) * r * 0.42); if ((i + Math.floor(k * 6)) % 3 === 0) continue; g.fillStyle = k < 0.5 ? '#eaf8ff' : '#9fdcf0'; g.fillRect(px, py, 1, 1); }
      if (f.big && k < 0.6) for (let i = 0; i < 7; i++) { const a = -Math.PI * (0.15 + 0.7 * i / 6), d = 3 + k * 16, px = Math.round(x + Math.cos(a) * d * 0.8), py = Math.round(y + Math.sin(a) * d * 1.1 + k * k * 18); g.fillStyle = i % 2 ? '#ffffff' : '#bfeaff'; g.fillRect(px, py, i % 3 ? 1 : 2, 1); }
    } });
    return out;
  },
};
