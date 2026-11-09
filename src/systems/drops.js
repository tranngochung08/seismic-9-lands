// drops.js — plan-24 (anh duyệt 2026-10-10): MỌI vật phẩm rơi ra đất → nhặt (tự hút khi đi gần, như Stardew) → ném vào túi.
//  · ctx.drop(id, n, x, y, opts) thay cho bag.add ở các nguồn: đồ bật ra thành ≤5 cục, nảy 2 nhịp, nằm lại (bóng + nhấp nhô; đồ hiếm lấp lánh).
//  · Tới gần ~1,5 ô → đồ bay hút về người → chạm người: bay vòng cung vào ô thanh công cụ / ô đá Seismic (hud.js flyToSlot) rồi mới vào túi.
//  · Đồ chưa nhặt nằm mãi (save.sys.drops[vùng]); cục cùng loại sát nhau thì gộp; tối đa 200 cục / vùng. Bấm vào cục đồ → đi tới nhặt.
//  · opts.beam: cột sáng (đồ cốt truyện). opts.toPlayer: rơi ngay cạnh người chơi (mua / chế tạo / thưởng).

const MAGNET = 34, GRAB = 7, MAX = 200, GRAV = 260;
const ST = { ctx: null, list: [], flying: 0, img: {}, res: {} };   /* res: ô thanh đang được món bay giữ chỗ */
const LBL_R = 48, NEAR_R = 80, NEAR_MIN = 3;   /* c66-loot: nhãn tên khi đứng trong ~3 ô; bảng 'Đồ dưới đất' khi >= 3 cục trong ~5 ô */
const U66 = { cv: null, box: null, btn: null, near: [], show: false, n: { all: 0, key: 0, click: 0 }, img: {} };
const zid = ctx => (ctx.S.zone && ctx.S.zone.id) || '';
function store(ctx) { const s = ctx.S.save; s.sys = s.sys || {}; return (s.sys.drops ||= {}); }
function persist(ctx) {
  store(ctx)[zid(ctx)] = ST.list.filter(d => d.st !== 'gone').map(d => ({ id: d.id, n: d.n, x: Math.round(d.x), y: Math.round(d.y), b: d.beam ? 1 : 0 }));
  ctx.persist();
}
function icon(ctx, id) {
  if (ST.img[id] !== undefined) return ST.img[id];
  const it = ctx.ART && ctx.ART.man && ctx.ART.man.ui && ctx.ART.man.ui.items;
  let f = it && (it[id] || it[id.replace(/^a_/, '')]);
  if (!f && it) { const e = (ctx.ITEMS[id] || {}).icon; const k = e && Object.keys(ctx.ITEMS).find(k => ctx.ITEMS[k].icon === e && it[k]); if (k) f = it[k]; }   /* 2026-10-13 anh báo ô vàng: món chưa có icon riêng → mượn icon món cùng emoji (như túi đồ), không vẽ ô vàng */
  if (!f) return (ST.img[id] = null);
  const im = new Image(); im.src = 'assets/px/' + f; return (ST.img[id] = im);
}
const rare = (ctx, id) => { const d = ctx.ITEMS[id]; return !!d && /story|trophy/.test((d.tags || []).join(' ')) || ['pearl', 'crystal', 'seagem', 'greatcrystal', 'goldfish', 'a_goldfish', 'soul', 'core'].includes(id); };
function walkable(ctx, x, y) { const m = ctx.S.map, tx = Math.floor(x / 16), ty = Math.floor(y / 16); return tx > 0 && ty > 0 && tx < m.w - 1 && ty < m.h - 1 && !ctx.isSolid(m, tx, ty); }

export function drop(ctx, id, n = 1, x, y, opts = {}) {
  if (!id || n <= 0 || !ctx.S.map) return 0;
  const p = ctx.S.player, near = x == null || opts.toPlayer; if (near) { x = p.x + (Math.random() - 0.5) * 10; y = p.y + 6; }   /* rơi cạnh người (thưởng / mua / chế) → văng gần, tự hút ngay */
  const piles = id === 'stone' ? Math.min(5, n) : Math.min(5, Math.max(1, Math.ceil(n / 3)));
  let left = n;
  for (let i = 0; i < piles; i++) {
    const k = i === piles - 1 ? left : Math.max(1, Math.round(n / piles)); left -= k; if (k <= 0) continue;
    const a = Math.random() * Math.PI * 2, sp = near ? 8 + Math.random() * 10 : 18 + Math.random() * 26;
    const d = { id, n: k, x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.6, z: opts.z ?? 6, vz: 70 + Math.random() * 40, st: 'air', bounce: 0, t: 0, ph: Math.random() * 6, beam: !!opts.beam, rare: rare(ctx, id), delay: 0.45 };
    ST.list.push(d);
  }
  if (ctx.sfx) ctx.sfx('pop');
  while (ST.list.length > MAX) ST.list.shift();
  persist(ctx); return n;
}
function collect(ctx, d) {
  d.st = 'gone'; persist(ctx);
  if (/^dball\d$/.test(d.id) && ctx.vfx) ctx.vfx('dball_pickup', d.x, d.y + 9, 0, true);
  else if (ctx.wfx) ctx.wfx('pickup', d.x, d.y + 2, { top: true });   /* plan-69: lấp lánh nhỏ lúc nhặt (code) */   /* plan-28: nhặt Ngọc Rồng → lóe sáng 1 lần (vfx_workbench, không lặp) */
  /* đích (anh chốt 2026-10-10): món đã có trên thanh → đúng ô đó; món MỚI → ô trống đầu tiên; thanh đầy / món đang nằm trong túi → bay vào túi */
  const C = ctx, had = C.bag.count(d.id) > 0, on = C.hotbarSlotOf ? C.hotbarSlotOf(d.id) : -1;
  let slot = on, put = false;
  if (on < 0 && !had) {   /* đá Seismic cũng lên thanh như món khác (anh bỏ ô đếm đá) */   /* ô trống đầu tiên chưa bị món khác đang bay giữ chỗ */
    const bar = C.S.save.hotbar || []; slot = -1;
    for (let i = 0; i < bar.length; i++) { const r = ST.res[i]; if (r === d.id || (!bar[i] && !r)) { slot = i; break; } }
    put = slot >= 0; if (put) ST.res[slot] = d.id;
  }
  const target = on >= 0 || put ? slot : -2;   /* -2 = nút Túi */
  const done = () => { C.bag.add(d.id, d.n); if (put && C.hotbarPut) { C.hotbarPut(slot, d.id); if (ST.res[slot] === d.id) delete ST.res[slot]; } C.toast(`+${d.n} ${C.itemIcon(d.id)} ${C.itemName(d.id)}`); };
  if (ST.flying >= 4 || !C.flyItem) { done(); C.sfx(d.id === 'stone' ? 'stone_gain' : 'slot'); return; }   /* nhặt cả đống cùng lúc → không bay quá 4 món một lúc */
  ST.flying++; C.flyItem(d.id, target, () => { ST.flying--; done(); }, d.x, d.y - 4, d.n);
}
/* ---------- c66-loot (plan-120 #4): nhãn tên đồ rơi + bảng 'Đồ dưới đất / Nhặt hết' ---------- */
const S66 = { vi: { title: 'Đồ dưới đất', all: 'Nhặt hết', more: n => `+${n} món khác` }, en: { title: 'On the ground', all: 'Take all', more: n => `+${n} more` } };
const L66 = ctx => S66[ctx.lang() === 'en' ? 'en' : 'vi'];
function uimg(f) { if (U66.img[f] !== undefined) return U66.img[f]; const im = new Image(); im.src = 'assets/px/' + f; return (U66.img[f] = im); }
const ok66 = im => im && im.complete && im.naturalWidth;
function nearPiles(ctx) {   /* cục đang nằm yên trong NEAR_R quanh người chơi */
  const p = ctx.S.player; if (!p) return [];
  return ST.list.filter(d => d.st === 'rest' && Math.hypot(p.x - d.x, (p.y - 6) - d.y) < NEAR_R);
}
function takeAll(ctx, how) {   /* mọi cục gần → bay hút về người (luồng nhận đồ cũ: collect → bag.add) */
  const L = nearPiles(ctx); if (!L.length) return 0;
  for (const d of L) { d.st = 'pull'; d.delay = 0; d.sp = 90; }
  U66.n.all++; if (how) U66.n[how]++; if (ctx.sfx) ctx.sfx('pop'); return L.length;
}
function nine66(ug, f, c, x, y, w, h, b) {   /* khung pixel 9 mảnh từ ảnh manifest (góc c px ảnh → b px màn) */
  const im = uimg(f); x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h); b = Math.round(b);
  if (!ok66(im)) { ug.fillStyle = '#352022'; ug.fillRect(x, y, w, h); ug.fillStyle = '#f6e7c8'; ug.fillRect(x + 2, y + 2, w - 4, h - 4); return; }
  const W = im.naturalWidth, H = im.naturalHeight, mw = W - 2 * c, mh = H - 2 * c;
  const P = [[0, c, 0, b], [c, mw, b, w - 2 * b], [W - c, c, w - b, b]], Q = [[0, c, 0, b], [c, mh, b, h - 2 * b], [H - c, c, h - b, b]];
  for (const [sx, sw, dx, dw] of P) for (const [sy, sh, dy, dh] of Q) if (dw > 0 && dh > 0) ug.drawImage(im, sx, sy, sw, sh, x + dx, y + dy, dw, dh);
}
function txt66(ug, s, x, y, col) { ug.fillStyle = '#2a1a1c'; for (const [a, c] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]]) ug.fillText(s, x + a, y + c); ug.fillStyle = col; ug.fillText(s, x, y); }
function drawLoot66(ug, ctx, cx, cy, scale) {
  U66.cv = ug.canvas; U66.box = U66.btn = null; U66.show = false;
  const S = ctx.S, p = S.player; if (S.mode !== 'play' || !p || !ST.list.length) return;
  const u = globalThis.__u89 ? globalThis.__u89(scale) : scale, fs = Math.max(10, Math.round(u * 3.4)), R = Math.round;
  ug.save(); ug.imageSmoothingEnabled = false; ug.font = `${fs}px VT323, monospace`; ug.textBaseline = 'middle';
  /* 1) nhãn tên nhỏ trên cục đồ: đứng trong ~3 ô hoặc rê chuột lên — né chồng nhau (gần người trước) */
  const mt = ctx.mouseTile ? ctx.mouseTile() : null, py = p.y - 6, cand = [];
  for (const d of ST.list) {
    if (d.st !== 'rest') continue;
    const dist = Math.hypot(p.x - d.x, py - d.y), hov = !!mt && Math.abs(d.x - mt.wx) < 9 && Math.abs(d.y - 4 - mt.wy) < 10;
    if (dist < LBL_R || hov) cand.push({ d, k: hov ? -1 : dist });
  }
  cand.sort((a, b) => a.k - b.k); ug.textAlign = 'center'; const used = [];
  for (const { d } of cand.slice(0, 12)) {
    const s = ctx.itemName(d.id), w = ug.measureText(s).width + 6, x = R((d.x - cx) * scale), y = R((d.y - 15 - cy) * scale), r = [x - w / 2, y - fs / 2, x + w / 2, y + fs / 2];
    if (used.some(q => r[0] < q[2] && r[2] > q[0] && r[1] < q[3] && r[3] > q[1])) continue;
    used.push(r); txt66(ug, s, x, y, d.rare ? '#ffe28a' : '#fff6e0');
  }
  /* 2) bảng 'Đồ dưới đất' góc phải khi >= 3 cục gần: icon + tên + số, nút 'Nhặt hết' + phím F */
  const near = nearPiles(ctx); U66.near = near;
  if (near.length >= NEAR_MIN) {
    const L = L66(ctx), grp = new Map(); for (const d of near) grp.set(d.id, (grp.get(d.id) || 0) + d.n);
    const rows = [...grp.entries()].sort((a, b) => b[1] - a[1]), MAXR = 5, shown = rows.slice(0, MAXR), extra = rows.length - shown.length;
    const W = ug.canvas.width, H = ug.canvas.height, bd = Math.max(6, R(u * 2)), pf = R(fs * 1.25), pad = bd + R(pf * 0.35), ic = R(pf * 1.1), rh = R(pf * 1.25);
    ug.textAlign = 'left';
    const tf = `${pf}px VT323, monospace`; ug.font = tf; let tw = ug.measureText(L.title).width;
    for (const [id, n] of shown) tw = Math.max(tw, ic + R(pf * 0.4) + ug.measureText(ctx.itemName(id) + '  ×' + n).width);
    const bh = R(pf * 1.6), btw = ug.measureText(L.all).width + R(pf * 0.8) + ic + R(pf * 0.4);
    const w = R(Math.max(tw, btw) + pad * 2), h = R(pad * 2 + rh * (1 + shown.length + (extra > 0 ? 1 : 0)) + R(pf * 0.3) + bh);
    const x = W - w - R(Math.max(10, u * 4)), y = R(H * 0.42 - h / 2);
    nine66(ug, 'ui/hud/box.png', 6, x, y, w, h, bd); U66.box = [x, y, x + w, y + h]; U66.show = true;
    ug.font = tf; let yy = y + pad + rh / 2;
    ug.fillStyle = '#7a3a10'; ug.fillText(L.title, x + pad, yy); yy += rh;
    for (const [id, n] of shown) {
      const im = icon(ctx, id); if (ok66(im)) ug.drawImage(im, 0, 0, im.naturalWidth, im.naturalHeight, x + pad, R(yy - ic / 2), ic, ic); else { ug.fillStyle = '#ffd45e'; ug.fillRect(x + pad + 2, R(yy - ic / 4), R(ic / 2), R(ic / 2)); }
      const tx = x + pad + ic + R(pf * 0.4), nm = ctx.itemName(id); ug.fillStyle = '#3a2418'; ug.fillText(nm, tx, yy);
      ug.fillStyle = '#2f6a2a'; ug.fillText('×' + n, tx + ug.measureText(nm + '  ').width, yy); yy += rh;
    }
    if (extra > 0) { ug.fillStyle = '#7a6048'; ug.fillText(L.more(extra), x + pad, yy); yy += rh; }
    const bx = x + pad, by = R(yy - rh / 2 + pf * 0.3), bw = w - pad * 2;
    nine66(ug, 'ui/npick/btn.png', 10, bx, by, bw, bh, Math.max(5, R(u * 2.2))); U66.btn = [bx, by, bx + bw, by + bh];
    const kim = uimg('ui/hud91/key.png'), kx = bx + R(pf * 0.4), ky = R(by + (bh - ic) / 2);
    if (ok66(kim)) ug.drawImage(kim, kx, ky, ic, R(ic * 17 / 16)); ug.textAlign = 'center'; ug.fillStyle = '#2a1a1c'; ug.fillText('F', kx + ic / 2, ky + ic / 2);
    ug.textAlign = 'left'; txt66(ug, L.all, kx + ic + R(pf * 0.4), by + bh / 2, '#fff6e0');
  }
  ug.restore();
}
function hit66(e, r) {   /* điểm bấm (toạ độ màn) nằm trong ô r (toạ độ canvas drawUI)? */
  const c = U66.cv; if (!c || !r) return false; const b = c.getBoundingClientRect(); if (!b.width) return false;
  const x = (e.clientX - b.left) * c.width / b.width, y = (e.clientY - b.top) * c.height / b.height; return x >= r[0] && x <= r[2] && y >= r[1] && y <= r[3];
}
if (typeof window !== 'undefined' && !window.__loot66bind) {
  window.__loot66bind = true;
  window.addEventListener('pointerdown', e => {   /* bấm nút 'Nhặt hết' / trong bảng → không cho click lọt xuống game (không đi tới) */
    const C = ST.ctx; if (!C || !U66.show || C.S.mode !== 'play') return;
    if (hit66(e, U66.btn)) { takeAll(C, 'click'); e.stopPropagation(); e.preventDefault(); return; }
    if (hit66(e, U66.box)) { e.stopPropagation(); e.preventDefault(); }
  }, true);
}
export const drops = {
  id: 'drops',
  onZoneEnter(ctx) {
    ST.ctx = ctx; ST.flying = 0;
    ST.list = (store(ctx)[zid(ctx)] || []).map(d => ({ id: d.id, n: d.n, x: d.x, y: d.y, z: 0, vz: 0, vx: 0, vy: 0, st: 'rest', t: 0, ph: Math.random() * 6, beam: !!d.b, rare: rare(ctx, d.id), delay: 0 }));
    ctx.drop = (id, n, x, y, opts) => drop(ctx, id, n, x, y, opts);
    if (typeof window !== 'undefined') window.__loot66 = { near: () => nearPiles(ctx).length, takeAll: () => takeAll(ctx), state: () => ({ show: U66.show, box: U66.box, btn: U66.btn, n: { ...U66.n } }) };   /* c66-loot */
    if (typeof window !== 'undefined') window.__drops = { list: () => ST.list.filter(d => d.st !== 'gone').map(d => ({ id: d.id, n: d.n, x: Math.round(d.x), y: Math.round(d.y), st: d.st })), drop: (id, n, dx = 0, dy = 30) => drop(ctx, id, n, ctx.S.player.x + dx, ctx.S.player.y + dy) };
  },
  onZoneLeave(ctx) { persist(ctx); },
  update(dt, ctx) {
    if (!ST.list.length) return;
    const p = ctx.S.player, play = ctx.S.mode === 'play'; let gone = false;
    for (const d of ST.list) {
      if (d.st === 'gone') { gone = true; continue; }
      d.t += dt; d.ph += dt;
      if (d.st === 'air') {   /* bật ra + nảy 2 nhịp */
        const nx = d.x + d.vx * dt, ny = d.y + d.vy * dt; if (walkable(ctx, nx, ny)) { d.x = nx; d.y = ny; } else { d.vx *= -0.4; d.vy *= -0.4; }
        d.vz -= GRAV * dt; d.z += d.vz * dt;
        if (d.z <= 0) { d.z = 0; d.bounce++; if (d.bounce >= 2) { d.st = 'rest'; d.vx = d.vy = 0; } else { d.vz = 38; d.vx *= 0.5; d.vy *= 0.5; } }
        continue;
      }
      if ((d.delay -= dt) > 0 || !play || !p) continue;
      const dx = p.x - d.x, dy = (p.y - 6) - d.y, dist = Math.hypot(dx, dy);
      if (d.st === 'rest' && dist < MAGNET) d.st = 'pull';
      if (d.st === 'pull') {   /* tự hút về người chơi, nhanh dần */
        d.sp = Math.min(260, (d.sp || 40) + 520 * dt); const k = Math.min(1, d.sp * dt / Math.max(1, dist)); d.x += dx * k; d.y += dy * k; d.z = Math.min(8, d.z + dt * 30);
        if (dist < GRAB) collect(ctx, d);
        else if (dist > MAGNET * 3) { d.st = 'rest'; d.sp = 0; d.z = 0; }
      }
    }
    if (gone) ST.list = ST.list.filter(d => d.st !== 'gone');
  },
  onClick(ctx, mt) {   /* bấm vào cục đồ → đi tới (tự hút khi tới gần) */
    if (!mt) return false;
    const d = ST.list.find(q => q.st === 'rest' && Math.abs(q.x - mt.wx) < 9 && Math.abs(q.y - 4 - mt.wy) < 10); if (!d) return false;
    const p = ctx.S.player; if (ctx.pathTo) { const path = ctx.pathTo(Math.floor(p.x / 16), Math.floor(p.y / 16), Math.floor(d.x / 16), Math.floor(d.y / 16), 8); p.autoPath = path ? path.reverse() : [{ x: d.x, y: d.y }]; }
    return true;
  },
  drawables(ctx, cx, cy) {
    const out = [], g = ctx.g, VW = ctx.VW, VH = ctx.VH;
    for (const d of ST.list) {
      if (d.st === 'gone') continue;
      const sx = Math.round(d.x - cx), sy = Math.round(d.y - cy); if (sx < -20 || sy < -40 || sx > VW + 20 || sy > VH + 20) continue;
      const im = icon(ctx, d.id), bob = d.st === 'rest' ? Math.round(Math.sin(d.ph * 3) * 1) : 0, z = Math.round(d.z);
      out.push({ y: d.y, f: () => {
        if (d.beam) { const a = 0.18 + 0.1 * Math.sin(d.ph * 3); g.fillStyle = `rgba(255,236,150,${a.toFixed(2)})`; g.fillRect(sx - 3, sy - 60, 6, 56); g.fillStyle = `rgba(255,255,220,${(a + 0.15).toFixed(2)})`; g.fillRect(sx - 1, sy - 60, 2, 56); }
        g.fillStyle = 'rgba(0,0,0,.22)'; g.fillRect(sx - 4, sy - 1, 8, 2); g.fillRect(sx - 3, sy - 2, 6, 4);   /* bóng vuông pixel */
        if (im && im.complete && im.naturalWidth) g.drawImage(im, 0, 0, im.naturalWidth, im.naturalHeight, sx - 6, sy - 11 - z + bob, 12, 12);
        else { g.fillStyle = '#ffd45e'; g.fillRect(sx - 3, sy - 7 - z + bob, 6, 6); }
        if (d.rare && Math.floor(d.ph * 4) % 3 === 0) { g.fillStyle = '#fff6c8'; g.fillRect(sx + 4, sy - 12 - z + bob, 2, 2); g.fillRect(sx - 6, sy - 6 - z + bob, 1, 1); }
      } });
    }
    return out;
  },
  drawUI(ug, ctx, cx, cy, scale) {   /* số lượng trên cục đồ (>1) */
    ug.save(); ug.font = `${Math.max(10, Math.round((globalThis.__u89?globalThis.__u89((globalThis.__u89?globalThis.__u89(scale):scale)):(globalThis.__u89?globalThis.__u89(scale):scale)) * 3.4))}px VT323, monospace`; ug.textAlign = 'center'; ug.textBaseline = 'middle';
    for (const d of ST.list) {
      if (d.st !== 'rest' || d.n <= 1) continue;
      const sx = Math.round((d.x + 5 - cx) * scale), sy = Math.round((d.y - 2 - cy) * scale);
      ug.fillStyle = '#352022'; ug.fillText(String(d.n), sx + 1, sy + 1); ug.fillText(String(d.n), sx - 1, sy); ug.fillStyle = '#fff6c8'; ug.fillText(String(d.n), sx, sy);
    }
    ug.restore();
    drawLoot66(ug, ctx, cx, cy, scale);   /* c66-loot: nhãn tên + bảng Nhặt hết */
  },
  key(code, ctx) {   /* c66-loot: F = Nhặt hết, CHỈ khi bảng 'Đồ dưới đất' đang hiện (không thì F vẫn là toàn màn hình) */
    if (code !== 'KeyF' || ctx.S.mode !== 'play' || !U66.show || nearPiles(ctx).length < NEAR_MIN) return false;
    takeAll(ctx, 'key'); return true;
  },
};
