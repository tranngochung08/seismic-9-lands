/* chet27.js — c27-chet (anh 04/11): CẢNH CHẾT mới.
   "khi chết thì người chơi sẽ có effect ngã xuống đất và xuất hồn bay lên, về thẳng gần Noxx, và không còn nút hồi sinh và về nhà như trước nữa".
   · hero.js (vá c27) gọi ctx.chet27.start(ctx, player) lúc hết máu: chụp dáng ĐỨNG của chính nhân vật → HỒN (tô lam nhạt theo độ sáng,
     mờ bằng dither Bayer theo ô pixel logic, chân tan dần thành đuôi khói) bay lên ~1,4 s rồi tan; vài đốm sáng nhỏ bay theo. Bật 1 lần, không lặp.
   · Thân nằm: clip knockdown giữ khung nằm (hero.js như cũ).
   · Hết ~2,15 s: hero.js gọi ctx.chet27.toNoxx(ctx) (sau faintTravel — trận trùm / dưới nước giữ luật cũ của chúng):
       màn ngả sáng nhẹ (≤ 0,45, KHÔNG đen); ở Làng → đặt cạnh Noxx (S.guide) ngay; vùng khác → ctx.travel('village', speed 5: màn chuyển vùng chuẩn chỉ 0,2 s mỗi chiều) rồi đặt cạnh Noxx.
     Tới nơi: hồn rơi nhẹ xuống nhập vào người (0,5 s).
   · Chơi chung (coop, chỉ ở Làng): người khác ko 0→1 → thấy hồn của họ bay lên từ xác; ko 1→0 → hồn nhập ở chỗ mới (cạnh Noxx).
   Móc test: window.__c27 = { state(), log() }. */
import { ART } from '../art.js';
import { NET } from './farm106.js';
import { T } from '../gfx.js';
import { ZONES, ZONE_LIST } from '../world.js';   /* c66-loot: điểm hồi sinh gần nhất (vùng đã mở, như bản đồ M) */
import { statsOf } from './stats.js';   /* c66-loot: số lần ngất = save.stats.faints */

const CF = { rise: 1.45, up: 36, delay: 0.42, fadeA: 0.45, fadeIn: [1.75, 2.15], fadeOut: 0.4, land: 0.5, landUp: 26 };
const PAL = [[0.16, [62, 76, 140]], [0.36, [118, 142, 208]], [0.6, [182, 202, 248]], [1.01, [236, 243, 255]]];   /* hồn: viền lam đậm → lam nhạt → gần trắng (dịu, ít màu) */
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const ST = { souls: [], motes: [], die: null, pend: null, seen: new Map(), log: [], n: { die: 0, noxx: 0, travel: 0, land: 0, peerDie: 0, peerLand: 0, fallback: 0 } };
const lg = e => { ST.log.push({ t: +(performance.now() / 1000).toFixed(2), ...e }); if (ST.log.length > 80) ST.log.shift(); };

/* ---------- chụp hồn từ sprite ---------- */
function capture(ent) {
  const hi = ART.hi || 1, W = 48, H = 48, c = document.createElement('canvas'); c.width = W * hi; c.height = H * hi;
  const q = c.getContext('2d'); q.imageSmoothingEnabled = false; q.setTransform(hi, 0, 0, hi, 0, 0);
  const sv = { action: ent.action, moving: ent.moving, idleT: ent.idleT, frame: ent.frame, diag: ent.diag, dir: ent.dir };
  try { ent.action = null; ent.moving = false; ent.idleT = 0; ent.frame = 0; ent.diag = null; ent.dir = 0;   /* hồn quay mặt ra (nam) */ q.translate(24 - Math.round(ent.x), 40 - Math.round(ent.y)); ent.draw(q); }
  catch (e) { return null; }
  finally { ent.action = sv.action; ent.moving = sv.moving; ent.idleT = sv.idleT; ent.frame = sv.frame; ent.diag = sv.diag; ent.dir = sv.dir; }
  let im; try { im = q.getImageData(0, 0, c.width, c.height); } catch (e) { return null; }
  const a = im.data, Wb = c.width, Hb = c.height; let x0 = Wb, y0 = Hb, x1 = -1, y1 = -1;
  for (let y = 0; y < Hb; y++) for (let x = 0; x < Wb; x++) if (a[(y * Wb + x) * 4 + 3] > 40) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  if (x1 < 0) return null;
  const hb = y1 - y0 + 1, A0 = new Uint8Array(Wb * Hb); for (let i = 0; i < Wb * Hb; i++) A0[i] = a[i * 4 + 3] > 40 ? 1 : 0;
  const edge = (x, y) => { for (const [dx, dy] of [[hi, 0], [-hi, 0], [0, hi], [0, -hi]]) { const X = x + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= Wb || Y >= Hb || !A0[Y * Wb + X]) return true; } return false; };
  for (let y = 0; y < Hb; y++) for (let x = 0; x < Wb; x++) {
    const o = (y * Wb + x) * 4; if (a[o + 3] <= 40) { a[o + 3] = 0; continue; }
    const Lm = (0.3 * a[o] + 0.55 * a[o + 1] + 0.15 * a[o + 2]) / 255, col = edge(x, y) ? PAL[0][1] : PAL.find(P => 0.3 + Lm * 0.7 < P[0])[1];   /* viền lam đậm, thân sáng lên (hồn nhạt) */
    a[o] = col[0]; a[o + 1] = col[1]; a[o + 2] = col[2]; a[o + 3] = 255;
    const u = (y - y0) / hb, lx = Math.floor(x / hi), ly = Math.floor(y / hi), th = (BAYER[(ly & 3) * 4 + (lx & 3)] + 0.5) / 16;
    if (u > 0.62 && th < (u - 0.62) / 0.38 * 1.05) a[o + 3] = 0;   /* chân tan dần thành đuôi (dither theo ô logic) */
  }
  q.setTransform(1, 0, 0, 1, 0, 0); q.putImageData(im, 0, 0);
  /* 4 mức mờ dither (25/50/75/100 %) — canvas KHÔNG __hi (bài học shim), vẽ bằng drawImage 5 tham số */
  const lv = [0.25, 0.5, 0.75, 1].map(k => {
    if (k >= 1) return c;
    const d = document.createElement('canvas'); d.width = Wb; d.height = Hb; const r = d.getContext('2d'); r.drawImage(c, 0, 0);
    const jm = r.getImageData(0, 0, Wb, Hb), b = jm.data;
    for (let y = 0; y < Hb; y++) for (let x = 0; x < Wb; x++) { const lx = Math.floor(x / hi), ly = Math.floor(y / hi); if ((BAYER[(ly & 3) * 4 + (lx & 3)] + 0.5) / 16 >= k) b[(y * Wb + x) * 4 + 3] = 0; }
    r.putImageData(jm, 0, 0); return d;
  });
  return { lv, W, H, top: y0 / hi, bot: y1 / hi };
}
const pickLv = (G, al) => al <= 0.05 ? null : G.lv[al < 0.32 ? 0 : al < 0.6 ? 1 : al < 0.86 ? 2 : 3];

function spawnSoul(ent, kind, who) {
  const G = capture(ent); if (!G) { lg({ ev: 'nocap', kind, who }); return false; }
  ST.souls.push({ G, x: ent.x, y: ent.y, t: kind === 'rise' ? -CF.delay : 0, kind, who, ph: Math.random() * 6.28 });
  const n = kind === 'rise' ? 7 : 4;
  for (let i = 0; i < n; i++) ST.motes.push({ x: ent.x + (Math.random() * 14 - 7), y: ent.y - 4 - Math.random() * 14, vy: kind === 'rise' ? -(14 + Math.random() * 16) : -(4 + Math.random() * 6), t: kind === 'rise' ? -CF.delay - Math.random() * 0.5 : -Math.random() * 0.2, life: 0.7 + Math.random() * 0.5, c: Math.random() < 0.5 ? '#eef4ff' : '#b8cbff' });
  return true;
}

/* ---------- chỗ cạnh Noxx ---------- */
function walkable(ctx, x, y) {
  const m = ctx.S.map, tx = Math.floor(x / 16), ty = Math.floor(y / 16); if (!m || tx < 1 || ty < 1 || tx >= m.w - 1 || ty >= m.h - 1) return false;
  try { if (ctx.isSolid && ctx.isSolid(m, tx, ty)) return false; const gg = ctx.getG ? ctx.getG(m, tx, ty) : -1; return gg !== T.WATER && gg !== T.DEEP && gg !== T.LAVA; } catch (e) { return false; }
}
function placeNoxx(ctx) {
  const S = ctx.S, p = S.player, g = S.guide;
  if (g) for (const [dx, dy] of [[22, 6], [-22, 6], [0, 26], [-26, 20], [26, 20], [0, 34], [-32, 0], [32, 0], [0, -20], [0, 44], [-40, 24], [40, 24]]) {
    const x = g.x + dx, y = g.y + dy; if (!walkable(ctx, x, y) || !walkable(ctx, x - 4, y) || !walkable(ctx, x + 4, y)) continue;
    p.x = x; p.y = y; p.autoPath = null; p.moving = false; if (p.faceTo) p.faceTo(g.x, g.y); lg({ ev: 'noxx', x: Math.round(x), y: Math.round(y), gx: Math.round(g.x), gy: Math.round(g.y) }); return true;
  }
  const e = S.map && S.map.entries && S.map.entries.default; if (!e) return false;
  p.x = e.x * 16 + 8; p.y = e.y * 16 + 14; p.autoPath = null; ST.n.fallback++; lg({ ev: 'noxx-miss', x: p.x, y: p.y }); return true;
}
function arrive(ctx, noxx) { ST.n.land++; spawnSoul(ctx.S.player, 'land', 'me'); if (noxx) ST.say = { t: 0.75 }; }   /* c66-loot: tới cạnh Noxx → Noxx nói 1 câu */

/* ---------- c66-loot (plan-120 #9): NGẤT CÓ TÌNH TIẾT ----------
   · Lúc ngất: nhớ kẻ hạ mình (quái gần nhất trong ctx.monsters.list) → save.sys.chet27.last; số lần ngất = save.stats.faints (stats.js).
   · Ngất ngoài Làng ở vùng đất đã mở (M1–M9, đèo / trời quy về vùng đất bên dưới): hồn bay xong → giữ xác nằm ~5 s, số đếm nhỏ trên đầu,
     2 nút nhỏ dưới chân: [1] Về Làng (Noxx) — mặc định khi hết giờ / E / Esc · [2] Lối vào vùng (điểm dịch chuyển của bản đồ M = lối vào 'default').
   · Về cạnh Noxx: Noxx nói 1 câu ngắn (bong bóng pixel ctx.bubble) — số lần ngất + tên kẻ hạ mình. */
const HOLD = 5;
const S66 = {
  vi: { noxx: 'Về Làng (Noxx)', near: z => `Lối vào ${z}`, back: z => `Hồi sinh ở lối vào ${z}`,
    say: [(n, k) => `Lần thứ ${n} rồi đấy! Lần này là ${k}.`, (n, k) => `${k} à? Lần thứ ${n} rồi, cẩn thận nha!`, (n, k) => `Lại ngất vì ${k}! Lần ${n} rồi đó.`, (n, k) => `Lần ${n}… ${k} mạnh thật nhỉ? Nghỉ chút đi.`],
    say0: [n => `Lần thứ ${n} rồi đấy! Về đây nghỉ chút đã.`, n => `Ngất lần ${n} rồi. Không sao, không mất gì đâu.`],
    first: k => k ? `Lần đầu ngất à? ${k} đáng sợ thật.` : 'Lần đầu ngất à? Không mất gì đâu.' },
  en: { noxx: 'Village (Noxx)', near: z => `${z} entrance`, back: z => `Back at the ${z} entrance`,
    say: [(n, k) => `That's ${n} times now! This time: ${k}.`, (n, k) => `${k} again? That's ${n} — careful!`, (n, k) => `${k} got you! That makes ${n}.`, (n, k) => `Number ${n}… ${k} hits hard, huh?`],
    say0: [n => `That's ${n} times now! Rest up a bit.`, n => `Fainted ${n} times. Don't worry, nothing lost.`],
    first: k => k ? `First faint? ${k} is scary, huh.` : 'First faint? Relax, nothing lost.' },
};
const L66 = c => S66[c.lang && c.lang() === 'en' ? 'en' : 'vi'];
function sv66(ctx) { const s = ctx.S.save; s.sys = s.sys || {}; return (s.sys.chet27 ||= {}); }
function killerOf(ctx, ent) {   /* quái gần xác nhất lúc ngất (trùm: bán kính rộng hơn) */
  let L = []; try { L = ctx.monsters && ctx.monsters.list ? ctx.monsters.list() : []; } catch (e) { L = []; }
  let best = null, bd = 1e9;
  for (const mo of L || []) {
    const c = mo && mo.c; if (!c || c.spar || mo.state === 'dead' || !(c.vi || c.en)) continue;
    const d = Math.hypot(mo.x - ent.x, mo.y - ent.y); if (d < (c.boss || c.w > 22 ? 300 : 180) && d < bd) { bd = d; best = c; }
  }
  return best ? { key: String(best.key || '').split('@')[0], vi: best.vi || best.en, en: best.en || best.vi } : null;
}
function landOf(z) {   /* vùng đất ứng với chỗ ngất: đèo → vùng dưới; trời → vùng đất bên dưới; vùng ẩn khác → không có */
  const Z = ZONES[z]; if (!Z) return null;
  if (Z.road) return Z.road.lower;
  if (Z.sky) { const m = /^sky_(.+)$/.exec(z); if (!m) return 'village'; const B = ZONES[m[1]]; return B ? (B.road ? B.road.lower : m[1]) : null; }
  return Z.hidden ? null : z;
}
function nearestPt(ctx, z) {
  const L = landOf(z); if (!L || L === 'village' || L === 'sea') return null;
  const list = ZONE_LIST.filter(q => !q.hidden), i = list.findIndex(q => q.id === L); if (i < 0) return null;
  const prev = list[i - 1], bd = (ctx.S.save && ctx.S.save.badges) || [];
  if (prev && prev.lv >= 1 && !bd.includes(prev.lv)) return null;   /* chưa mở trên bản đồ M */
  const nm = ZONES[L].name || {}, lg = ctx.lang && ctx.lang() === 'en' ? 'en' : 'vi', full = nm[lg] || L;
  return { zone: L, short: String(full).split(' · ')[0], full };
}
function sayNoxx(ctx) {
  const g = ctx.S.guide; if (!g || !ctx.bubble) return;
  const n = statsOf(ctx.S.save).faints || 1, last = sv66(ctx).last, L = L66(ctx), lng = ctx.lang && ctx.lang() === 'en' ? 'en' : 'vi';
  let k = last ? String(last[lng] || last.vi || '') : ''; if (k.length > 18) k = k.slice(0, 17) + '…';
  let s;
  if (n <= 1) s = L.first(k);
  else if (k) { const arr = L.say, i0 = n % arr.length; s = arr[i0](n, k); for (let j = 1; j < arr.length && s.length > 48; j++) s = arr[(i0 + j) % arr.length](n, k); }
  else s = L.say0[n % L.say0.length](n);
  ctx.bubble(g, s, 4.5); ST.said = s; lg({ ev: 'say', n, k, s });
}
function goNoxx(ctx, z) {   /* luồng cũ toNoxx: ở Làng → cạnh Noxx ngay; vùng khác → travel về Làng */
  if (z === 'village') { if (!placeNoxx(ctx)) return false; ST.n.noxx++; if (ST.die) ST.die.tp = ST.die.t; arrive(ctx, true); return true; }
  ST.pend = { from: z };
  if (ctx.travel && ctx.travel('village', 'default', { speed: 5 })) { ST.n.travel++; lg({ ev: 'travel', from: z }); return true; }
  ST.pend = null; return false;
}
function goNear(ctx, pt) {
  const cur = ctx.S.zone && ctx.S.zone.id, t = L66(ctx).back(pt.short);
  if (cur === pt.zone) {
    const e = ctx.S.map && ctx.S.map.entries && ctx.S.map.entries.default, p = ctx.S.player; if (!e) return goNoxx(ctx, cur);
    p.x = e.x * 16 + 8; p.y = e.y * 16 + 14; p.autoPath = null; p.moving = false; ST.n.near = (ST.n.near || 0) + 1; lg({ ev: 'near', zone: cur, x: p.x, y: p.y }); arrive(ctx, false); try { ctx.toast(t); } catch (er) { } return true;
  }
  ST.pend2 = { zone: pt.zone, t };
  if (ctx.travel && ctx.travel(pt.zone, 'default', { speed: 5 })) { ST.n.near = (ST.n.near || 0) + 1; lg({ ev: 'near-travel', zone: pt.zone }); return true; }
  ST.pend2 = null; return goNoxx(ctx, cur);
}
function holdStart(ctx, z, pt) {
  const p = ctx.S.player; ST.hold = { t: HOLD, z, pt, sel: 0, rects: [] }; ST.n.hold = (ST.n.hold || 0) + 1;
  if (ST.die) ST.die.tp = ST.die.t;   /* màn ngả sáng nhẹ tan đi trong lúc chọn — không phủ cảnh */
  if (p) { p.autoPath = null; p.moving = false; if (p.hasAct && p.hasAct('knockdown')) p.action = { name: 'knockdown', t: 0.55, dur: 0.55, hold: true, walk: false, loop: false }; }   /* vẫn nằm */
  try { if (ctx.hero && ctx.hero.iframes) ctx.hero.iframes(HOLD + 2.5); } catch (e) { }
  ctx.setMode('hon120'); ctx.registerCloser('hon120', () => holdPick(ctx, 0)); ctx.onAction('hon120', () => holdPick(ctx, ST.hold ? ST.hold.sel : 0));
  lg({ ev: 'hold', z, to: pt.zone });
}
function holdPick(ctx, i) {
  const H = ST.hold; if (!H) return; ST.hold = null; ST.n.pick = (ST.n.pick || 0) + 1; lg({ ev: 'pick', i });
  const p = ctx.S.player; if (p) { if (p.endAct) p.endAct(); p.action = null; }
  if (ctx.S.mode === 'hon120') ctx.setMode('play');
  try { if (ctx.hero && ctx.hero.iframes) ctx.hero.iframes(2); } catch (e) { }
  if (i === 1 && H.pt) goNear(ctx, H.pt); else goNoxx(ctx, H.z);
  try { ctx.persist(); } catch (e) { }
}
function box66(ug, f, c, x, y, w, h, b) {   /* khung pixel 9 mảnh (ảnh manifest ui) */
  const im = IMG66[f] || (IMG66[f] = Object.assign(new Image(), { src: 'assets/px/' + f })); x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h); b = Math.round(b);
  if (!im.complete || !im.naturalWidth) { ug.fillStyle = '#352022'; ug.fillRect(x, y, w, h); ug.fillStyle = '#e8c890'; ug.fillRect(x + 2, y + 2, w - 4, h - 4); return; }
  const W = im.naturalWidth, H = im.naturalHeight, mw = W - 2 * c, mh = H - 2 * c;
  for (const [sx, sw, dx, dw] of [[0, c, 0, b], [c, mw, b, w - 2 * b], [W - c, c, w - b, b]]) for (const [sy, sh, dy, dh] of [[0, c, 0, b], [c, mh, b, h - 2 * b], [H - c, c, h - b, b]]) if (dw > 0 && dh > 0) ug.drawImage(im, sx, sy, sw, sh, x + dx, y + dy, dw, dh);
}
const IMG66 = {};
function tx66(ug, s, x, y, col) { ug.fillStyle = '#2a1a1c'; for (const [a, c] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1]]) ug.fillText(s, x + a, y + c); ug.fillStyle = col; ug.fillText(s, x, y); }
if (typeof window !== 'undefined' && !window.__c66hold) {
  window.__c66hold = true;
  window.addEventListener('pointerdown', e => {   /* bấm 2 nút nhỏ dưới xác */
    const H = ST.hold, c = ST.uiCv; if (!H || !c || !ST.ctx) return; const b = c.getBoundingClientRect(); if (!b.width) return;
    const x = (e.clientX - b.left) * c.width / b.width, y = (e.clientY - b.top) * c.height / b.height;
    const i = H.rects.findIndex(r => x >= r[0] && x <= r[2] && y >= r[1] && y <= r[3]); if (i < 0) return;
    e.stopPropagation(); e.preventDefault(); holdPick(ST.ctx, i);
  }, true);
}

export const chet27 = {
  id: 'chet27',
  always: true,
  onZoneEnter(ctx) {
    ST.souls.length = 0; ST.motes.length = 0; ST.seen.clear();
    ctx.chet27 = {
      start: (c, ent) => { ST.n.die++; ST.die = { t: 0, zone: c.S.zone && c.S.zone.id, soft: true }; lg({ ev: 'die', zone: ST.die.zone, x: Math.round(ent.x), y: Math.round(ent.y) }); spawnSoul(ent, 'rise', 'me');
        try { const k = killerOf(c, ent); sv66(c).last = k ? { ...k, zone: ST.die.zone } : null; lg({ ev: 'killer', k: k && k.key }); } catch (e) { console.error('chet27 killer', e); } },   /* c66-loot */
      toNoxx: c => {
        const z = c.S.zone && c.S.zone.id;
        let pt = null; try { pt = nearestPt(c, z); } catch (e) { pt = null; }   /* c66-loot: có điểm gần đã mở → cho chọn (giữ xác ~5 s) */
        if (pt) { holdStart(c, z, pt); return true; }
        return goNoxx(c, z);   /* đổi vùng: màn tối chuẩn của game nhưng rất ngắn (0,2 s mỗi chiều) */
      },
      ui: (ug, c) => chet27.ui(ug, c),
    };
    ST.ctx = ctx; if (ST.hold && ctx.S.mode !== 'hon120') ST.hold = null;
    if (ST.pend && ctx.S.zone && ctx.S.zone.id === 'village') { ST.pend = null; if (placeNoxx(ctx)) { ST.n.noxx++; if (ST.die) ST.die.tp = ST.die.t; arrive(ctx, true); } }
    if (ST.pend2 && ctx.S.zone && ctx.S.zone.id === ST.pend2.zone) { const t = ST.pend2.t; ST.pend2 = null; arrive(ctx, false); try { ctx.toast(t); } catch (e) { } }   /* c66-loot: hồi sinh ở lối vào vùng */
    if (typeof window !== 'undefined') window.__c27 = { hold: () => ST.hold && { t: +ST.hold.t.toFixed(2), z: ST.hold.z, to: ST.hold.pt.zone, sel: ST.hold.sel, rects: ST.hold.rects.map(r => r.map(Math.round)) }, pick: i => holdPick(ctx, i | 0), said: () => ST.said || null, last: () => sv66(ctx).last || null, state: () => ({ n: { ...ST.n }, souls: ST.souls.map(s => ({ kind: s.kind, who: s.who, t: +s.t.toFixed(2) })), motes: ST.motes.length, die: ST.die && { ...ST.die }, pend: ST.pend }), log: () => ST.log.slice() };
  },
  update(dt, ctx) {
    if (ST.die) { ST.die.t += dt; if (ST.die.t > 4) ST.die = null; }
    if (ST.hold) { if (ctx.S.mode !== 'hon120') ST.hold = null; else if ((ST.hold.t -= dt) <= 0) holdPick(ctx, 0); }   /* c66-loot: hết giờ → về Noxx (mặc định) */
    if (ST.say && (ST.say.t -= dt) <= 0) { ST.say = null; try { sayNoxx(ctx); } catch (e) { console.error('chet27 say', e); } }
    for (const s of ST.souls) s.t += dt; ST.souls = ST.souls.filter(s => s.t < (s.kind === 'rise' ? CF.rise : CF.land));
    for (const m of ST.motes) { m.t += dt; if (m.t > 0) { m.y += m.vy * dt; m.x += Math.sin(m.t * 7 + m.y) * 6 * dt; } } ST.motes = ST.motes.filter(m => m.t < m.life);
    const api = NET.pkApi; if (!api || !api.on || !api.on()) return;   /* chơi chung: hồn của người khác */
    let ps = []; try { ps = api.peers() || []; } catch (e) { ps = []; }
    for (const P of ps) {
      const was = ST.seen.get(P.id); ST.seen.set(P.id, !!P.ko);
      if (was === undefined) continue;
      if (!was && P.ko) { ST.n.peerDie++; spawnSoul(P.ent, 'rise', P.id); lg({ ev: 'peer-die', id: P.id }); }
      else if (was && !P.ko) { ST.n.peerLand++; spawnSoul(P.ent, 'land', P.id); lg({ ev: 'peer-land', id: P.id }); }
    }
  },
  drawables(ctx, cx, cy) {
    if (!ST.souls.length && !ST.motes.length) return [];
    const g = ctx.g, out = [], R = Math.round;
    for (const s of ST.souls) {
      if (s.t < 0) continue;
      let dy, al, sx;
      if (s.kind === 'rise') { const u = s.t / CF.rise, e = 1 - (1 - u) * (1 - u); dy = 6 - CF.up * e; al = Math.min(1, s.t / 0.18) * (u > 0.6 ? Math.max(0, 1 - (u - 0.6) / 0.4) : 1) * 0.9; sx = Math.sin(s.ph + s.t * 4.2) * 2.2 * u; }
      else { const u = s.t / CF.land; dy = -CF.landUp * (1 - u) * (1 - u); al = Math.min(1, s.t / 0.12) * (1 - u) * 0.85; sx = 0; }
      const img = pickLv(s.G, al); if (!img) continue;
      const x = R(s.x - cx + sx) - 24, y = R(s.y - cy + dy) - 40;
      out.push({ y: s.y + 2, f: () => g.drawImage(img, x, y, s.G.W, s.G.H) });   /* trên xác (khoá y + 2), hồn không __hi → 5 tham số */
    }
    if (ST.motes.length) out.push({ y: 1e6, f: () => { g.save(); for (const m of ST.motes) { if (m.t <= 0) continue; const u = m.t / m.life; if (u > 0.7 && ((R(m.x) + R(m.y)) & 1)) continue; g.fillStyle = m.c; g.fillRect(R(m.x - cx), R(m.y - cy), 1, 1); } g.restore(); } });
    return out;
  },
  key(code, ctx) {   /* c66-loot: lúc chọn chỗ hồi sinh — 1 / 2, ← → đổi, (E / Esc do onAction / registerCloser) */
    const H = ST.hold; if (!H || ctx.S.mode !== 'hon120') return false;
    if (code === 'Digit1' || code === 'Numpad1') { holdPick(ctx, 0); return true; }
    if (code === 'Digit2' || code === 'Numpad2') { holdPick(ctx, 1); return true; }
    if (code === 'ArrowLeft' || code === 'KeyA' || code === 'ArrowUp' || code === 'KeyW') { H.sel = 0; return true; }
    if (code === 'ArrowRight' || code === 'KeyD' || code === 'ArrowDown' || code === 'KeyS') { H.sel = 1; return true; }
    return false;
  },
  drawUI(ug, ctx, cx, cy, scale) {   /* c66-loot: số đếm nhỏ trên đầu xác + 2 nút nhỏ dưới chân (không phủ màn) */
    ST.uiCv = ug.canvas; const H = ST.hold, p = ctx.S.player; if (!H || !p || ctx.S.mode !== 'hon120') return;
    const u = globalThis.__u89 ? globalThis.__u89(scale) : scale, fs = Math.max(10, Math.round(u * 3.4)), R = Math.round, L = L66(ctx);
    const sx = R((p.x - cx) * scale), sy = R((p.y - cy) * scale), bd = Math.max(5, R(u * 1.8));
    ug.save(); ug.imageSmoothingEnabled = false; ug.font = `${fs}px VT323, monospace`; ug.textBaseline = 'middle'; ug.textAlign = 'center';
    const n = String(Math.max(1, Math.ceil(H.t))), cw = R(fs * 1.5), chh = R(fs * 1.4), cyy = R(sy - 30 * scale);
    box66(ug, 'ui/hud/box.png', 6, sx - cw / 2, cyy - chh / 2, cw, chh, bd); ug.fillStyle = '#3a2418'; ug.fillText(n, sx, cyy + 1);
    const labs = ['1 ' + L.noxx, '2 ' + L.near(H.pt.short)], bh = R(fs * 1.45), gap = R(fs * 0.4), pad = R(fs * 0.6);
    const ws = labs.map(s => R(ug.measureText(s).width + pad * 2)), tot = ws[0] + ws[1] + gap, by = R(sy + 6 * scale);
    let bx = R(sx - tot / 2); H.rects = [];
    for (let i = 0; i < 2; i++) {
      ug.globalAlpha = i === H.sel ? 1 : 0.8; box66(ug, 'ui/npick/btn.png', 10, bx, by, ws[i], bh, bd);   /* nút đang chọn sáng hơn (tĩnh) */
      tx66(ug, labs[i], bx + ws[i] / 2, by + bh / 2 + 1, i === H.sel ? '#fff6e0' : '#ead8b8'); ug.globalAlpha = 1; H.rects.push([bx, by, bx + ws[i], by + bh]); bx += ws[i] + gap;
    }
    ug.restore();
  },
  ui(ug, ctx) {   /* gọi từ hero.drawUI: màn ngả sáng NHẸ quanh lúc dịch chuyển trong Làng (không đen, không bảng) */
    const D = ST.die; if (!D || !D.soft) return; const t = D.t, [a0, a1] = CF.fadeIn; let a = 0;
    if (D.tp == null) { if (t > a0) a = Math.min(1, (t - a0) / (a1 - a0)) * CF.fadeA; }
    else { const k = (t - D.tp) / CF.fadeOut; a = k < 1 ? (1 - k) * Math.min(CF.fadeA, D.tp > a0 ? (D.tp - a0) / (a1 - a0) * CF.fadeA : CF.fadeA) : 0; if (k >= 1) D.soft = false; }
    if (a <= 0.01) return; ug.save(); ug.globalAlpha = a; ug.fillStyle = '#e4eafc'; ug.fillRect(0, 0, ug.canvas.width, ug.canvas.height); ug.restore();
  },
};
