// drops.js — plan-24 (anh duyệt 2026-10-10): MỌI vật phẩm rơi ra đất → nhặt (tự hút khi đi gần, như Stardew) → ném vào túi.
//  · ctx.drop(id, n, x, y, opts) thay cho bag.add ở các nguồn: đồ bật ra thành ≤5 cục, nảy 2 nhịp, nằm lại (bóng + nhấp nhô; đồ hiếm lấp lánh).
//  · Tới gần ~1,5 ô → đồ bay hút về người → chạm người: bay vòng cung vào ô thanh công cụ / ô đá Seismic (hud.js flyToSlot) rồi mới vào túi.
//  · Đồ chưa nhặt nằm mãi (save.sys.drops[vùng]); cục cùng loại sát nhau thì gộp; tối đa 200 cục / vùng. Bấm vào cục đồ → đi tới nhặt.
//  · opts.beam: cột sáng (đồ cốt truyện). opts.toPlayer: rơi ngay cạnh người chơi (mua / chế tạo / thưởng).

const MAGNET = 34, GRAB = 7, MAX = 200, GRAV = 260;
const ST = { ctx: null, list: [], flying: 0, img: {}, res: {} };   /* res: ô thanh đang được món bay giữ chỗ */
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
  if (/^dball\d$/.test(d.id) && ctx.vfx) ctx.vfx('dball_pickup', d.x, d.y + 9, 0, true);   /* plan-28: nhặt Ngọc Rồng → lóe sáng 1 lần (vfx_workbench, không lặp) */
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
export const drops = {
  id: 'drops',
  onZoneEnter(ctx) {
    ST.ctx = ctx; ST.flying = 0;
    ST.list = (store(ctx)[zid(ctx)] || []).map(d => ({ id: d.id, n: d.n, x: d.x, y: d.y, z: 0, vz: 0, vx: 0, vy: 0, st: 'rest', t: 0, ph: Math.random() * 6, beam: !!d.b, rare: rare(ctx, d.id), delay: 0 }));
    ctx.drop = (id, n, x, y, opts) => drop(ctx, id, n, x, y, opts);
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
    ug.save(); ug.font = `${Math.max(10, Math.round(scale * 3.4))}px VT323, monospace`; ug.textAlign = 'center'; ug.textBaseline = 'middle';
    for (const d of ST.list) {
      if (d.st !== 'rest' || d.n <= 1) continue;
      const sx = Math.round((d.x + 5 - cx) * scale), sy = Math.round((d.y - 2 - cy) * scale);
      ug.fillStyle = '#352022'; ug.fillText(String(d.n), sx + 1, sy + 1); ug.fillText(String(d.n), sx - 1, sy); ug.fillStyle = '#fff6c8'; ug.fillText(String(d.n), sx, sy);
    }
    ug.restore();
  },
};
