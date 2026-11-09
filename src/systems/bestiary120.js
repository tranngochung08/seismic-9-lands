/* bestiary120.js — c66-loot (plan-120 #8, học Saiyan "Bestiary"): SỔ QUÁI THEO LOÀI.
   · Đếm số con mỗi loài đã HẠ (monsters.js killMonster / trùm khe nứt → ctx.onMonsterDown, móc nối chuỗi, không sửa core) và số Chấn Thú đã
     THU PHỤC theo loài (đọc save.sys.chanthu: caught tăng → con mới có id >= nextId cũ). Lưu save.sys.bestiary120 = { v, k: {key: {n, vi, en}}, c: {sp: n}, cc, nx }.
   · Mốc ×10 / ×50 / ×250 → toast nhỏ + thưởng khiêm tốn (đá Seismic; ×50 thêm Tinh hồn, ×250 thêm Ngọc trai) rơi cạnh người (ctx.give).
   · Bảng xem (khung pixel ui/dlg_frame): phím ` (Backquote) hoặc nút "Sổ quái" gắn vào Sổ tay (C). Mục "Sắp đạt" = 3 loài gần mốc nhất.
     ↑ ↓ / con lăn cuộn, ` / Esc / nút X đóng. Không chạy bạn tập (c.spar). Mỗi con chỉ đếm 1 lần (WeakSet) dù nhiều hệ cùng gọi onMonsterDown.
   Móc test: window.__b120 = { state, open, close, kill(key, vi, en, n), catch(sp, n) }. */
import { SPECIES, SPECIES_EN } from './duel-data.js';

const MS = [10, 50, 250];
const REW = { 10: [['stone', 3]], 50: [['stone', 8], ['soul', 1]], 250: [['stone', 20], ['pearl', 1]] };
const OPEN_KEY = 'Backquote', MODE = 'b120';
const STR = {
  vi: { title: 'Sổ quái', kills: 'Đã hạ', caught: 'Thu phục', soon: 'Sắp đạt', all: 'Mọi loài', none: 'Chưa ghi loài nào — hạ quái hoặc thu phục Chấn Thú để ghi vào sổ.',
    sum: (a, b, c, d) => `Đã hạ ${a} con · ${b} loài    Thu phục ${c} con · ${d} loài`, hint: '` mở/đóng · ↑↓ cuộn · Esc đóng', next: (n, r) => `mốc ×${n}: ${r}`, done: 'đủ mọi mốc',
    toast: (nm, n, k, r) => `📖 Sổ quái: ${k === 'c' ? 'thu phục' : 'hạ'} ${nm} ×${n}! Thưởng ${r}`, btn: '📖 Sổ quái (`)', unit: 'con' },
  en: { title: 'Bestiary', kills: 'Defeated', caught: 'Tamed', soon: 'Within reach', all: 'All species', none: 'Nothing recorded yet — defeat monsters or tame Quake Beasts to fill the book.',
    sum: (a, b, c, d) => `Defeated ${a} · ${b} species    Tamed ${c} · ${d} species`, hint: '` open/close · ↑↓ scroll · Esc close', next: (n, r) => `×${n}: ${r}`, done: 'all milestones',
    toast: (nm, n, k, r) => `📖 Bestiary: ${k === 'c' ? 'tamed' : 'defeated'} ${nm} ×${n}! Reward ${r}`, btn: '📖 Bestiary (`)', unit: '' },
};
const ST = { ctx: null, seen: new WeakSet(), scroll: 0, maxScroll: 0, rects: {}, cv: null, chkT: 0, img: {}, n: { kill: 0, catch: 0, ms: 0 } };
const L = ctx => STR[ctx.lang() === 'en' ? 'en' : 'vi'];
const lgOf = ctx => (ctx.lang() === 'en' ? 'en' : 'vi');

function sv(ctx) {
  const s = ctx.S.save; s.sys = s.sys || {}; let d = s.sys.bestiary120;
  if (!d || typeof d !== 'object') d = s.sys.bestiary120 = {};
  if (d.v !== 1) { d.v = 1; d.k = d.k || {}; d.c = d.c || {}; d.got = d.got || {}; }
  return d;
}
const spName = (sp, lg) => (lg === 'en' && SPECIES_EN[sp]) || (SPECIES[sp] ? SPECIES[sp].name : sp);
const nameOf = (ctx, kind, id, rec) => kind === 'c' ? spName(id, lgOf(ctx)) : ((rec && (rec[lgOf(ctx)] || rec.vi || rec.en)) || id);
const nextMs = n => MS.find(m => m > n) || null;
function rewText(ctx, m) { return REW[m].map(([id, n]) => `${n} ${ctx.itemName(id)}`).join(' + '); }

function milestone(ctx, kind, id, n, rec) {
  if (!MS.includes(n)) return;
  const d = sv(ctx), tag = kind + ':' + id + ':' + n; if (d.got[tag]) return; d.got[tag] = 1; ST.n.ms++;
  for (const [it, k] of REW[n]) { try { if (ctx.give) ctx.give(it, k, undefined, undefined, { toPlayer: true }); else ctx.bag.add(it, k); } catch (e) { try { ctx.bag.add(it, k); } catch (e2) { } } }
  try { ctx.toast(L(ctx).toast(nameOf(ctx, kind, id, rec), n, kind, rewText(ctx, n))); ctx.sfx('coin'); } catch (e) { }
}
function onKill(ctx, mo) {
  if (!mo || !mo.c || mo.c.spar || ST.seen.has(mo)) return; ST.seen.add(mo);
  const c = mo.c, key = String(c.key || '?').split('@')[0], d = sv(ctx), rec = d.k[key] || (d.k[key] = { n: 0 });
  rec.vi = c.vi || c.en || key; rec.en = c.en || c.vi || key; rec.n++; ST.n.kill++;
  milestone(ctx, 'k', key, rec.n, rec); ctx.persist();
}
function addCatch(ctx, sp, times = 1) {
  const d = sv(ctx); for (let i = 0; i < times; i++) { d.c[sp] = (d.c[sp] | 0) + 1; ST.n.catch++; milestone(ctx, 'c', sp, d.c[sp]); }
  ctx.persist();
}
function hookKill(ctx) {   /* nối vào cuối chuỗi ctx.onMonsterDown (pet.js gán lại mỗi vùng; sky.js nối chuỗi) — WeakSet chặn đếm trùng */
  const f = ctx.onMonsterDown; if (f && f.__b120) return;
  const w = (mo, xp) => { if (f) f(mo, xp); try { onKill(ctx, mo); } catch (e) { console.error('bestiary120', e); } };
  w.__b120 = true; ctx.onMonsterDown = w;
}
function checkCatch(ctx) {   /* save.sys.chanthu.caught tăng → con mới (id >= nextId cũ) trong đội / kho */
  const ch = ctx.S.save.sys && ctx.S.save.sys.chanthu; if (!ch) return;
  const d = sv(ctx), caught = ch.caught | 0, nx = ch.nextId || 1;
  if (d.cc == null || d.cc > caught) { d.cc = caught; d.nx = nx; return; }
  if (caught > d.cc) {
    const fresh = [...(ch.team || []), ...(ch.box || [])].filter(m => m && m.id >= (d.nx || 0)).sort((a, b) => b.id - a.id).slice(0, caught - d.cc);
    for (const m of fresh) addCatch(ctx, m.sp, 1);
    d.cc = caught;
  }
  d.nx = nx;
}

/* ---------- danh sách ---------- */
function entries(ctx) {
  const d = sv(ctx), out = [];
  for (const [k, r] of Object.entries(d.k)) if (r.n > 0) out.push({ kind: 'k', id: k, n: r.n, name: nameOf(ctx, 'k', k, r) });
  for (const [sp, n] of Object.entries(d.c)) if (n > 0) out.push({ kind: 'c', id: sp, n, name: nameOf(ctx, 'c', sp) });
  return out;
}
function soon(ctx) {   /* 3 loài gần mốc kế nhất (tỉ lệ còn thiếu nhỏ nhất) */
  return entries(ctx).filter(e => nextMs(e.n)).map(e => { const m = nextMs(e.n), prev = MS[MS.indexOf(m) - 1] || 0; return { ...e, m, prev, left: m - e.n, f: (e.n - prev) / (m - prev) }; })
    .sort((a, b) => b.f - a.f || a.left - b.left).slice(0, 3);
}

/* ---------- vẽ (khung pixel của game) ---------- */
function im(f) { if (ST.img[f] !== undefined) return ST.img[f]; const i = new Image(); i.src = 'assets/px/' + f; return (ST.img[f] = i); }
const ok = i => i && i.complete && i.naturalWidth;
function itemImg(ctx, id) { const it = ctx.ART && ctx.ART.man && ctx.ART.man.ui && ctx.ART.man.ui.items; return it && it[id] ? im(it[id]) : null; }
function nine(ug, f, c, x, y, w, h, b) {
  const i = im(f); x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h); b = Math.round(b);
  if (!ok(i)) { ug.fillStyle = '#4a2c1c'; ug.fillRect(x, y, w, h); ug.fillStyle = '#ecd9b0'; ug.fillRect(x + 4, y + 4, w - 8, h - 8); return; }
  const W = i.naturalWidth, H = i.naturalHeight, mw = W - 2 * c, mh = H - 2 * c;
  for (const [sx, sw, dx, dw] of [[0, c, 0, b], [c, mw, b, w - 2 * b], [W - c, c, w - b, b]]) for (const [sy, sh, dy, dh] of [[0, c, 0, b], [c, mh, b, h - 2 * b], [H - c, c, h - b, b]]) if (dw > 0 && dh > 0) ug.drawImage(i, sx, sy, sw, sh, x + dx, y + dy, dw, dh);
}
function kindIcon(ug, kind, x, y, s) {
  if (kind === 'c') { const i = im('duel/orb/orb_spin.png'); if (ok(i)) { ug.drawImage(i, 0, 0, 32, 32, x, y, s, s); return; } }
  else { const i = im('ui/hud91/act_fight.png'); if (ok(i)) { ug.drawImage(i, 0, 0, i.naturalWidth, i.naturalHeight, x, y, s, s); return; } }
  ug.fillStyle = kind === 'c' ? '#5fb0e0' : '#c06040'; ug.fillRect(x + s / 4, y + s / 4, s / 2, s / 2);
}
function bar(ug, x, y, w, h, f) {   /* thanh tiến độ: khung pixel obar_s + phần đầy */
  nine(ug, 'ui/hud91/obar_s.png', 3, x, y, w, h, Math.max(3, Math.round(h * 0.3)));
  const ins = Math.max(3, Math.round(h * 0.3)); ug.fillStyle = '#e0a83a'; ug.fillRect(Math.round(x + ins), Math.round(y + ins), Math.round((w - ins * 2) * Math.max(0, Math.min(1, f))), Math.round(h - ins * 2));
}
function draw(ug, ctx, scale) {
  const T = L(ctx), W = ug.canvas.width, H = ug.canvas.height, R = Math.round, u = globalThis.__u89 ? globalThis.__u89(scale) : scale;
  const fs = Math.max(14, R(u * 4.3)), lh = R(fs * 1.3), pw = Math.min(W - 24, R(fs * 34)), ph = Math.min(H - 32, R(fs * 25)), px = R((W - pw) / 2), py = R((H - ph) / 2);
  const bd = Math.max(10, R(fs * 1.1)), pad = bd + R(fs * 0.5), ink = '#3a2418', head = '#7a3a10', dim = '#7a6048';
  ug.save(); ug.imageSmoothingEnabled = false; ug.textBaseline = 'middle';
  nine(ug, 'ui/dlg_frame.png', 22, px, py, pw, ph, bd); ST.rects = {};
  const cs = R(fs * 1.5), cl = im('ui/hud/close.png'), cxp = px + pw - cs - R(bd * 0.4), cyp = py + R(bd * 0.4);
  if (ok(cl)) ug.drawImage(cl, 0, 0, cl.naturalWidth, cl.naturalHeight, cxp, cyp, cs, cs); ST.rects.close = [cxp, cyp, cxp + cs, cyp + cs];
  let y = py + pad + lh / 2; const x0 = px + pad, iw = pw - pad * 2;
  ug.font = `${R(fs * 1.35)}px VT323, monospace`; ug.textAlign = 'left'; ug.fillStyle = head; kindIcon(ug, 'k', x0, R(y - fs * 0.7), R(fs * 1.4)); ug.fillText(T.title, x0 + R(fs * 1.8), y);
  const d = sv(ctx), E = entries(ctx), ks = E.filter(e => e.kind === 'k'), cs2 = E.filter(e => e.kind === 'c');
  ug.font = `${fs}px VT323, monospace`; y += lh; ug.fillStyle = dim; ug.fillText(T.sum(ks.reduce((a, e) => a + e.n, 0), ks.length, cs2.reduce((a, e) => a + e.n, 0), cs2.length), x0, y); y += lh;
  if (!E.length) { ug.fillStyle = ink; ug.fillText(T.none, x0, y + lh / 2); ug.restore(); return; }
  const ic = R(fs * 1.1), barW = R(iw * 0.22), nameX = x0 + ic + R(fs * 0.5);
  const row = (e, yy, showNext) => {
    kindIcon(ug, e.kind, x0, R(yy - ic / 2), ic); ug.fillStyle = ink; ug.textAlign = 'left';
    let nm = e.name; while (nm.length > 4 && ug.measureText(nm).width > iw * 0.3) nm = nm.slice(0, -2) + '…'; ug.fillText(nm, nameX, yy);
    const m = nextMs(e.n), prev = m ? (MS[MS.indexOf(m) - 1] || 0) : 0, bx = x0 + R(iw * 0.36);
    bar(ug, bx, R(yy - fs * 0.45), barW, R(fs * 0.9), m ? (e.n - prev) / (m - prev) : 1);
    ug.fillStyle = ink; ug.fillText(m ? `${e.n}/${m}` : `${e.n} ✓`, bx + barW + R(fs * 0.4), yy);
    if (showNext && m) { let rx = x0 + iw; const s = R(fs * 0.95); ug.textAlign = 'right';   /* thưởng mốc kế: icon món + số (gọn) */
      for (const [it, k] of REW[m].slice().reverse()) { const ii = itemImg(ctx, it); rx -= s; if (ok(ii)) ug.drawImage(ii, 0, 0, ii.naturalWidth, ii.naturalHeight, rx, R(yy - s / 2), s, s); rx -= 2; ug.fillStyle = '#2f6a2a'; ug.fillText(String(k), rx, yy); rx -= ug.measureText(String(k)).width + R(fs * 0.5); }
      ug.fillStyle = dim; ug.fillText('×' + m + ' →', rx, yy); ug.textAlign = 'left'; }
    else { let sx = x0 + iw; for (let i = MS.length - 1; i >= 0; i--) { const st = im(e.n >= MS[i] ? 'ui/st_check.png' : 'ui/st_lock.png'), s = R(fs * 0.95); sx -= s + 2; if (ok(st)) ug.drawImage(st, 0, 0, st.naturalWidth, st.naturalHeight, sx, R(yy - s / 2), s, s); } }
  };
  const SN = soon(ctx);
  if (SN.length) { ug.fillStyle = head; ug.fillText(T.soon, x0, y); y += lh; for (const e of SN) { row(e, y, true); y += lh; } y += R(lh * 0.3); }
  ug.fillStyle = head; ug.fillText(T.all, x0, y); y += lh;
  const listTop = R(y - lh / 2), listBot = py + ph - pad - lh, all = E.slice().sort((a, b) => a.kind.localeCompare(b.kind) || b.n - a.n || a.name.localeCompare(b.name));
  ST.maxScroll = Math.max(0, all.length * lh - (listBot - listTop)); ST.scroll = Math.max(0, Math.min(ST.maxScroll, ST.scroll));
  ug.save(); ug.beginPath(); ug.rect(px, listTop, pw, listBot - listTop); ug.clip();
  let yy = listTop + lh / 2 - ST.scroll; for (const e of all) { if (yy > listTop - lh && yy < listBot + lh) row(e, R(yy), false); yy += lh; }
  ug.restore();
  ug.fillStyle = dim; ug.textAlign = 'center'; ug.fillText(T.hint + (ST.maxScroll > 0 ? `   (${Math.round(ST.scroll / Math.max(1, ST.maxScroll) * 100)}%)` : ''), px + pw / 2, py + ph - pad + R(lh * 0.1));
  ST.rects.panel = [px, py, px + pw, py + ph];
  ug.restore();
}

function open(ctx) { if (ctx.S.mode !== 'play' && ctx.S.mode !== 'codex') return false; if (ctx.S.mode === 'codex') closeCodex(ctx); ST.scroll = 0; ctx.setMode(MODE); ctx.registerCloser(MODE, () => close(ctx)); ctx.onAction(MODE, () => close(ctx)); return true; }
function close(ctx) { if (ctx.S.mode === MODE) ctx.setMode('play'); }
function closeCodex(ctx) { const el = typeof document !== 'undefined' && document.getElementById('codex'); if (el) el.hidden = true; ctx.setMode('play'); }
function codexBtn(ctx) {   /* nút "Sổ quái" gắn vào Sổ tay (C) — không sửa ui.js */
  if (typeof document === 'undefined') return; const cx = document.getElementById('codex'); if (!cx || cx.hidden) return;
  let b = document.getElementById('b120btn'); const t = L(ctx).btn;
  if (!b) {
    const anchor = document.getElementById('c-ach-title') || document.getElementById('c-title'); if (!anchor || !anchor.parentNode) return;
    b = document.createElement('button'); b.id = 'b120btn'; b.className = 'btn'; b.style.cssText = 'margin:4px 0 6px;display:inline-block';
    b.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); if (ST.ctx) open(ST.ctx); });
    anchor.parentNode.insertBefore(b, anchor);
  }
  if (b.textContent !== t) b.textContent = t;
}
if (typeof window !== 'undefined' && !window.__b120bind) {
  window.__b120bind = true;
  const at = (e, r) => { const c = ST.cv; if (!c || !r) return false; const b = c.getBoundingClientRect(); if (!b.width) return false; const x = (e.clientX - b.left) * c.width / b.width, y = (e.clientY - b.top) * c.height / b.height; return x >= r[0] && x <= r[2] && y >= r[1] && y <= r[3]; };
  window.addEventListener('pointerdown', e => {
    const C = ST.ctx; if (!C || C.S.mode !== MODE) return;
    e.stopPropagation(); e.preventDefault();
    if (at(e, ST.rects.close) || !at(e, ST.rects.panel)) close(C);
  }, true);
  window.addEventListener('wheel', e => { const C = ST.ctx; if (!C || C.S.mode !== MODE) return; ST.scroll += e.deltaY > 0 ? 40 : -40; e.preventDefault(); e.stopImmediatePropagation(); }, { capture: true, passive: false });
}

export const bestiary120 = {
  id: 'bestiary120',
  always: true,
  onZoneEnter(ctx) {
    ST.ctx = ctx; sv(ctx); hookKill(ctx); checkCatch(ctx);
    if (typeof window !== 'undefined') window.__b120 = {
      state: () => { const d = sv(ctx); return { k: JSON.parse(JSON.stringify(d.k)), c: { ...d.c }, got: Object.keys(d.got), n: { ...ST.n }, soon: soon(ctx).map(e => `${e.kind}:${e.id} ${e.n}/${e.m}`), mode: ctx.S.mode, maxScroll: ST.maxScroll }; },
      open: () => open(ctx), close: () => close(ctx),
      kill: (key, vi, en, n = 1) => { for (let i = 0; i < n; i++) onKill(ctx, { c: { key, vi, en } }); return sv(ctx).k[key]; },
      catch: (sp, n = 1) => { addCatch(ctx, sp, n); return sv(ctx).c[sp]; },
    };
  },
  update(dt, ctx) {
    hookKill(ctx);
    if ((ST.chkT -= dt) <= 0) { ST.chkT = 0.5; try { checkCatch(ctx); } catch (e) { console.error('bestiary120 catch', e); } }
    if (ctx.S.mode === 'codex') codexBtn(ctx);
  },
  key(code, ctx) {
    if (ctx.S.mode === MODE) {
      if (code === OPEN_KEY || code === 'Escape') { close(ctx); return true; }
      if (code === 'ArrowDown' || code === 'KeyS') { ST.scroll += 30; return true; }
      if (code === 'ArrowUp' || code === 'KeyW') { ST.scroll -= 30; return true; }
      return true;   /* bảng đang mở: nuốt phím khác */
    }
    if (code === OPEN_KEY && (ctx.S.mode === 'play' || ctx.S.mode === 'codex')) return open(ctx);
    return false;
  },
  drawUI(ug, ctx, cx, cy, scale) { ST.cv = ug.canvas; if (ctx.S.mode === MODE) draw(ug, ctx, scale); },
};
