// target91.js — p91 (plan-91 đợt A, anh duyệt 2026-11-02): MÁU ĐỐI THỦ TRÊN ĐẦU + DẤU KHOÁ MỚI + KHUNG MỤC TIÊU giữa trên (kiểu Saiyan Online).
//  · 1 hàm chung overBar() vẽ thanh máu nhỏ trên đầu (khung PixelLab ui/hud91/obar.png): ĐỎ = đối thủ (quái, thú hoang / Chấn Thú hoang, bạn tập),
//    XANH LÁ = phe mình (Rocky — pet.js gọi globalThis.__ob91 —, Chấn Thú đi theo). Trùm (c.boss) có thanh trùm riêng → KHÔNG vẽ trùng.
//    NPC / dân không phải đối thủ: không có thanh. Hiện khi: đang khoá / đang trỏ / đã mất máu / đang hung (đánh mình). ⚙ sau: Luôn / Khi đánh / Tắt.
//  · Tên (nền đỏ) CHỈ hiện với con đang khoá hoặc đang trỏ.
//  · Trỏ chuột = 4 góc XANH (ảnh hover.png) — TĨNH. Khoá (click / chạm / Tab) = vòng elip CAM tĩnh dưới chân (ring.png, lớp nền) — không VFX lặp.
//  · Khung mục tiêu giữa trên (DOM, khung gỗ PixelLab): chân dung (viền đỏ địch / vàng NPC / lục phe mình), tên, cấp, loại, thanh máu có số — CHỈ khi có khoá.
//    Mục tiêu là trùm đã có thanh trùm → không hiện khung (tránh chồng thanh trùm trên đầu màn).
//  · Esc = bỏ khoá (anh duyệt); bấm đất vẫn không bỏ. Đánh khi chưa khoá → tự khoá con vừa trúng đòn (gần người chơi nhất).
//  · Bật: globalThis.__t91 = true (target.js tắt mũi tên vàng cũ). Test: window.__t91.
import * as TGT from './target.js';
import { ART } from '../art.js';
import { Entity } from '../entities.js';

const IMG = 'assets/px/ui/hud91/';
const ST = { im: {}, hitSeen: -99, el: null, sig: '', port: { ref: null, url: null, t: 0 }, drawn: [], mode: 'fight', lastEsc: -9, frame: null };
const vi = ctx => ctx.lang() === 'vi';
function img(k) {
  if (ST.im[k] !== undefined) return ST.im[k];
  ST.im[k] = null; if (typeof Image === 'undefined') return null;
  const m = ART.man && ART.man.ui && ART.man.ui.hud91, im = new Image(); im.onload = () => { ST.im[k] = im; }; im.src = 'assets/px/' + ((m && m[k]) || `ui/hud91/${k}.png`); return null;
}
const L = ctx => (vi(ctx) ? { foe: 'Đối thủ', wild: 'Chấn Thú hoang', spar: 'Bạn tập', npc: 'Dân làng', ani: 'Vật nuôi', obj: 'Vật thể', tent: 'Xúc tu', ally: 'Phe mình', lv: 'Cấp', hint: 'Tab đổi · Esc bỏ khoá', unlock: 'Đã bỏ khoá mục tiêu' }
  : { foe: 'Enemy', wild: 'Wild Seismon', spar: 'Sparring partner', npc: 'Villager', ani: 'Animal', obj: 'Object', tent: 'Tentacle', ally: 'Ally', lv: 'Lv', hint: 'Tab: next · Esc: unlock', unlock: 'Target unlocked' });

/* ---------- thanh máu trên đầu: 1 hàm chung (toạ độ màn hình) ---------- */
const OB = { cap: 3, ix: 3, iy: 3 };   /* khung obar_s.png (52→46×10, bản thấp của obar.png PixelLab): mép trái/phải 3 px nguồn; lòng thanh lùi 3 px (đo từ ảnh) */
export function overBar(ug, sx, sy, w, k, side, su) {
  const h = Math.max(8, Math.round(su * 2.6)), x = Math.round(sx - w / 2), y = Math.round(sy - h), im = img('obar_s'), q = Math.max(0, Math.min(1, k));
  const fill = side === 'ally' ? (q > 0.5 ? '#7bd04a' : q > 0.25 ? '#ffd45e' : '#ff5a5a') : '#e84a3a', dark = side === 'ally' ? '#2f5a1c' : '#7a1c16';
  if (im) {
    const sw = im.width, sh = im.height, c = OB.cap, dc = Math.max(2, Math.round(c * h / sh)), ix = Math.max(1, Math.round(OB.ix * h / sh)), iy = Math.max(1, Math.round(OB.iy * h / sh));
    ug.save(); ug.imageSmoothingEnabled = false;
    ug.drawImage(im, 0, 0, c, sh, x, y, dc, h); ug.drawImage(im, c, 0, sw - 2 * c, sh, x + dc, y, w - 2 * dc, h); ug.drawImage(im, sw - c, 0, c, sh, x + w - dc, y, dc, h);
    const iw = w - 2 * ix, ih = h - 2 * iy; ug.fillStyle = fill; ug.fillRect(x + ix, y + iy, Math.round(iw * q), ih); ug.fillStyle = dark; ug.fillRect(x + ix, y + iy + ih - Math.max(1, Math.round(ih / 3)), Math.round(iw * q), Math.max(1, Math.round(ih / 3)));
    ug.restore();
  } else { ug.fillStyle = '#352022'; ug.fillRect(x, y, w, h); ug.fillStyle = fill; ug.fillRect(x + 1, y + 1, Math.round((w - 2) * q), h - 2); }
  return { x, y, w, h };
}
/* cụm HUD giữa dưới (hotbar.js p91) chiếm bao nhiêu px tính từ đáy màn, theo toạ độ canvas UI cao H — thanh máu dưới đáy của hệ khác (bạn tập…) đặt cao hơn */
if (typeof globalThis !== 'undefined') globalThis.__h91bot = H => { const e = typeof document !== 'undefined' && document.body.classList.contains('h91') && document.getElementById('hotbar'); if (!e || e.hidden) return 0; const r = e.getBoundingClientRect(); return r.height ? Math.round((innerHeight - r.top) * H / innerHeight) : 0; };
if (typeof globalThis !== 'undefined') globalThis.__ob91 = (ug, x, y, w, k, side, su) => overBar(ug, x + w / 2, y + Math.max(8, Math.round(su * 2.6)), w, k, side, su);   /* pet.js (Rocky): x, y = góc trái trên */

function nameTag(ug, txt, sx, sy, fs, foe) {
  ug.save(); ug.font = `${fs}px VT323, monospace`; ug.textAlign = 'center'; ug.textBaseline = 'middle';
  const w = Math.ceil(ug.measureText(txt).width) + 10, h = fs + 2, x = Math.round(sx - w / 2), y = Math.round(sy - h);
  ug.fillStyle = '#2a1410'; ug.fillRect(x - 1, y - 1, w + 2, h + 2); ug.fillStyle = foe ? '#9a2a20' : '#3f6a2a'; ug.fillRect(x, y, w, h);
  ug.fillStyle = foe ? '#c8463a' : '#5a8a3a'; ug.fillRect(x, y, w, 1);
  ug.fillStyle = '#fff6c8'; ug.fillText(txt, sx, y + h / 2 + 1); ug.restore();
}
function corners(ug, x0, y0, x1, y1, su) {   /* 4 góc xanh (ảnh hover.png 4 phần tư), cỡ cố định ~4 px logic */
  const im = img('hover'), c = Math.max(12, Math.round(su * 5));   /* r5: góc 3,2 px logic quá nhỏ, khó thấy */
  if (!im) { ug.save(); ug.strokeStyle = '#7bea3a'; ug.lineWidth = 2; ug.strokeRect(x0, y0, x1 - x0, y1 - y0); ug.restore(); return; }
  const hw = im.width / 2, hh = im.height / 2; ug.save(); ug.imageSmoothingEnabled = false;
  ug.drawImage(im, 0, 0, hw, hh, x0, y0, c, c); ug.drawImage(im, hw, 0, hw, hh, x1 - c, y0, c, c);
  ug.drawImage(im, 0, hh, hw, hh, x0, y1 - c, c, c); ug.drawImage(im, hw, hh, hw, hh, x1 - c, y1 - c, c, c); ug.restore();
}

/* ---------- ai có thanh trên đầu ---------- */
const lvOf = mo => mo.lv ?? (mo.F && mo.F.lv) ?? mo.c.lv ?? null;
function foes(ctx) {
  const out = [], m = ctx.monsters && ctx.monsters.list ? ctx.monsters.list() : [];
  for (const mo of m) {
    if (!mo || !mo.c || mo.c.boss || mo.c.spar || mo.c.shortHit || mo.statue || mo.state === 'dead' || !(mo.hp > 0) || mo.hide) continue;
    out.push({ ref: mo, kind: 'mon', x: mo.x, y: mo.y, top: mo.y + (mo.__bt != null ? mo.__bt : -(mo.c.h || 12) - 4), w: mo.c.w || 12, h: mo.c.h || 12, hp: mo.hp, max: mo.max, side: 'foe', angry: !!mo.angry });
  }
  try { const f = typeof window !== 'undefined' && window.__c79 && window.__c79.f && window.__c79.f(); if (f && f.hp != null && f.max) out.push({ ref: f, kind: 'ally', x: f.x, y: f.y, top: f.y - 22, w: 14, h: 18, hp: f.hp, max: f.max, side: 'ally' }); } catch (e) { }
  return out;
}
function showBar(e, lk, hv) {
  if (ST.mode === 'off') return e.ref === lk || e.ref === hv;
  if (ST.mode === 'always') return true;
  return e.ref === lk || e.ref === hv || e.hp < e.max - 0.01 || e.angry;
}

/* ---------- chân dung mục tiêu (cắt từ sprite PixelLab của chính nó) ---------- */
function portraitOf(ctx, t) {
  const r = t.mo || t.ref, now = ctx.S.time;
  if (ST.port.ref === r && ST.port.url && now - ST.port.t < 2) return ST.port.url;
  let url = null;
  try {
    const K = 2, W = 72, H = 72, c = document.createElement('canvas'); c.width = W * K; c.height = H * K; const g = c.getContext('2d'); g.imageSmoothingEnabled = false; g.scale(K, K);
    if (t.kind === 'mon' || t.kind === 'tent') {
      const mo = t.mo || t.ref, cc = mo.c, sh = ART.monsters && ART.monsters[cc.key];
      if (cc.drawFn) { const px = Object.create(mo); px.flash = 0; px.hide = false; cc.drawFn(g, px, 36, 64); }
      else if (sh) g.drawImage(sh.img, 0, 0, sh.cw, sh.ch, 36 - (sh.cw >> 1), 66 - sh.ch, sh.cw, sh.ch);
      else { g.fillStyle = (cc.c && cc.c[0]) || '#8a5a3a'; g.fillRect(36 - cc.w / 2, 64 - cc.h, cc.w, cc.h); }
    } else if (t.kind === 'npc') { const px = Object.create(t.ref); px.x = 36; px.y = 64; px.dir = 0; px.action = null; px.moving = false; px.idleT = 0; px.frame = 0; Entity.prototype.draw.call(px, g); }
    else return null;
    const d = g.getImageData(0, 0, c.width, c.height).data; let x0 = c.width, y0 = c.height, x1 = -1, y1 = -1;
    for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) { const a = d[(y * c.width + x) * 4 + 3]; if (a > 140) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; } }
    if (x1 < 0) return null;
    const bw = x1 - x0 + 1, bh = y1 - y0 + 1, side = Math.max(bw, Math.min(bh, Math.round(bw * 1.1))), o = document.createElement('canvas'); o.width = o.height = side;
    const og = o.getContext('2d'); og.imageSmoothingEnabled = false; og.drawImage(c, x0 - (side - bw) / 2, y0, side, side, 0, 0, side, side);   /* đầu / nửa trên nếu sprite cao */
    url = o.toDataURL();
  } catch (e) { url = null; }
  ST.port = { ref: r, url, t: now }; return url;
}

/* ---------- khung mục tiêu giữa trên (DOM) ---------- */
function css() {
  if (document.getElementById('t91-style')) return;
  const s = document.createElement('style'); s.id = 't91-style';
  s.textContent = `#tf91{position:fixed;left:50%;top:8px;transform:translateX(-50%);z-index:7;display:flex;align-items:center;gap:6px;min-width:250px;max-width:340px;box-sizing:border-box;border:12px solid transparent;border-image:url(${IMG}tframe.png) 8 fill / 10px stretch;image-rendering:pixelated;padding:2px 6px 2px 0;pointer-events:none;font-family:VT323,monospace;color:#3b2412}
#tf91[hidden]{display:none}
#tf91 .pf{position:relative;width:48px;height:48px;flex:none;margin:-8px 0 -8px -6px}
#tf91 .pf img.fr{position:absolute;inset:0;width:48px;height:48px;image-rendering:pixelated}
#tf91 .pf img.pi{position:absolute;left:8px;top:8px;width:32px;height:32px;image-rendering:pixelated;object-fit:contain;background:#2a1c18}
#tf91 .tx{flex:1;min-width:0;display:flex;flex-direction:column;gap:1px}
#tf91 .nm{font-size:20px;line-height:17px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#tf91 .nm small{font-size:16px;color:#9a2a20;margin-left:6px}
#tf91 .ty{font-size:15px;line-height:13px;color:#6b4a2a}
#tf91 .hp{position:relative;height:13px;box-sizing:border-box;border:3px solid transparent;border-image:url(${IMG}obar_s.png) 3 fill / 3px stretch;image-rendering:pixelated;margin-top:3px}
#tf91 .hp i{position:absolute;left:0;top:0;bottom:0;background:#e84a3a}
#tf91.ally .hp i{background:#7bd04a}
#tf91 .hp b{position:absolute;right:2px;top:-4px;font-size:15px;line-height:14px;font-weight:normal;color:#fff6c8;text-shadow:1px 1px 0 #2a1410,-1px 0 0 #2a1410,0 -1px 0 #2a1410,1px 0 0 #2a1410}
#tf91 .hn{font-size:14px;line-height:12px;color:#8a6a48}
@media (pointer:coarse){#tf91{left:8px;transform:none;top:auto;bottom:calc(var(--h91h,90px) + 168px);min-width:190px;max-width:220px} #tf91 .hn{display:none}}
@media (pointer:coarse) and (orientation:landscape){#tf91{bottom:auto;top:8px;left:50%;transform:translateX(-50%)}}`;
  document.head.appendChild(s);
}
function frameInfo(ctx, t) {
  const l = L(ctx), r = t.mo || t.ref;
  if (t.kind === 'mon' || t.kind === 'tent') {
    const mo = r, c = mo.c, lv = lvOf(mo), ty = t.kind === 'tent' ? l.tent : c.spar ? l.spar : mo.F ? l.wild : l.foe;
    return { cls: 'foe', name: TGT.nameOf(t), lv, ty, hp: Math.max(0, Math.ceil(mo.hp)), max: mo.max, boss: !!c.boss };
  }
  if (t.kind === 'npc') return { cls: 'npc', name: TGT.nameOf(t), ty: l.npc };
  if (t.kind === 'ani') return { cls: 'npc', name: TGT.nameOf(t), ty: l.ani };
  const o = t.ref; return { cls: 'npc', name: TGT.nameOf(t), ty: l.obj, hp: o.hp != null && o.hpMax ? o.hp : null, max: o.hpMax };
}
function renderFrame(ctx) {
  if (typeof document === 'undefined') return;
  if (!ST.el) { css(); ST.el = document.createElement('div'); ST.el.id = 'tf91'; ST.el.hidden = true; document.body.appendChild(ST.el); }
  const t = ctx.S.mode === 'play' ? TGT.get() : null, inDuel = document.body.classList.contains('ld-on');
  const fi = t ? frameInfo(ctx, t) : null;
  if (!t || !fi || fi.boss || inDuel) { if (!ST.el.hidden) ST.el.hidden = true; ST.sig = ''; ST.frame = null; return; }
  const pu = portraitOf(ctx, t), l = L(ctx), fr = fi.cls === 'foe' ? 'port_r' : fi.cls === 'ally' ? 'port_g' : 'port_y';
  const sig = [fi.name, fi.lv, fi.ty, fi.hp, fi.max, fi.cls, pu && pu.length, ctx.lang()].join('|'); ST.frame = fi;
  if (ST.el.hidden) ST.el.hidden = false;
  if (sig === ST.sig) return; ST.sig = sig;
  ST.el.className = fi.cls;
  const hpb = fi.hp != null ? `<div class="hp"><i style="width:${Math.round(Math.max(0, fi.hp) / (fi.max || 1) * 100)}%"></i><b>${fi.hp}/${fi.max}</b></div>` : '';
  ST.el.innerHTML = `<div class="pf"><img class="fr" src="${IMG}${fr}.png" alt="">${pu ? `<img class="pi" src="${pu}" alt="">` : ''}</div><div class="tx"><div class="nm">${esc(fi.name)}${fi.lv != null ? `<small>${l.lv} ${fi.lv}</small>` : ''}</div><div class="ty">${esc(fi.ty)}</div>${hpb}<div class="hn">${l.hint}</div></div>`;
}
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

export const target91 = {
  id: 'target91',
  init() { },
  onZoneEnter(ctx) {
    globalThis.__t91 = true; ST.port = { ref: null, url: null, t: 0 };
    const s = ctx.S.save; if (s) { s.sys ||= {}; const k = (s.sys.t91 ||= {}); ST.mode = k.bars || 'fight'; }
    for (const k of ['obar_s', 'hover', 'ring', 'tri', 'port_r', 'port_y', 'port_g', 'tframe']) img(k);
    if (typeof window !== 'undefined') window.__t91 = {
      mode: m => { if (m) { ST.mode = m; const s2 = ctx.S.save; (s2.sys.t91 ||= {}).bars = m; ctx.persist && ctx.persist(); } return ST.mode; },
      drawn: () => ST.drawn.slice(), frame: () => (ST.el && !ST.el.hidden ? { ...ST.frame, rect: (() => { const r = ST.el.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }; })() } : null),
      esc: () => target91.key('Escape', ctx), imgs: () => Object.fromEntries(Object.entries(ST.im).map(([k, v]) => [k, !!v])),
    };
  },
  key(code, ctx) {   /* Esc: đang khoá → bỏ khoá (nuốt phím, lần Esc sau mới mở menu) */
    if (code !== 'Escape' || ctx.S.mode !== 'play' || !TGT.get()) return false;
    TGT.clear(); ctx.sfx && ctx.sfx('target_lock'); ST.lastEsc = ctx.S.time; return true;
  },
  update(dt, ctx) {
    const M = ctx.monsters;
    if (M && M.lastHitT) {   /* đánh khi chưa khoá → khoá (lặng) con vừa trúng đòn gần người chơi nhất */
      const lt = M.lastHitT(); if (lt !== ST.hitSeen) { ST.hitSeen = lt;
        if (lt > 0 && ctx.S.time - lt < 0.5 && !TGT.get()) { const p = ctx.S.player; let best = null, bd = 48;
          for (const mo of M.list()) { if (!(mo.flash > 0) || mo.hp <= 0 || mo.statue) continue; const d = Math.hypot(mo.x - p.x, mo.y - p.y); if (d < bd) { bd = d; best = mo; } }
          if (best) TGT.lock({ kind: 'mon', ref: best }, true); } }
    }
    renderFrame(ctx);
  },
  drawGround(g, ctx, cx, cy) {   /* vòng cam TĨNH dưới chân con đang khoá — p120 (anh 04/11): thay bằng tam giác lộn ngược trên đầu (drawUI) */
    if (globalThis.__tri120 !== false) return;
    const t = ctx.S.mode === 'play' ? TGT.get() : null; if (!t) return;
    const q = TGT.pos(t), r = t.mo || t.ref, bw = t.kind === 'mon' ? Math.max(14, Math.min(46, Math.round((r.c.w || 12) * 1.5))) : t.kind === 'obj' ? 22 : 16;
    const im = img('ring'), w = bw, h = im ? Math.max(5, Math.round(w * im.height / im.width)) : Math.round(w / 2.6), x = Math.round(q.x - cx - w / 2), y = Math.round(q.y - cy - h / 2 + 1);
    if (im) { g.save(); g.imageSmoothingEnabled = false; g.drawImage(im, 0, 0, im.width, im.height, x, y, w, h); g.restore(); }
    else { g.save(); g.strokeStyle = '#ff9a3a'; g.lineWidth = 1; g.beginPath(); g.ellipse(q.x - cx, q.y - cy + 1, w / 2, h / 2, 0, 0, 7); g.stroke(); g.restore(); }
  },
  drawUI(ug, ctx, cx, cy, scale) {
    ST.drawn = []; if (ctx.S.mode !== 'play') return;
    const su = ctx.scaleUI || scale, lk = TGT.get(), lref = lk ? (lk.mo || lk.ref) : null, hv = TGT.hovering ? TGT.hovering() : null, href = hv ? (hv.mo || hv.ref) : null;
    const W = ug.canvas.width, H = ug.canvas.height, fs = Math.max(13, Math.round(su * 3.4));
    for (const e of foes(ctx)) {
      if (!showBar(e, lref, href)) continue;
      const sx = (e.x - cx) * scale, sy = (e.top - cy) * scale - 2; if (sx < -40 || sx > W + 40 || sy < -40 || sy > H + 40) continue;
      const w = Math.max(Math.round(su * 9), Math.min(Math.round(su * 16), Math.round(e.w * scale * 1.05)));
      const b = overBar(ug, sx, sy, w, e.hp / e.max, e.side, su);
      let tag = false;
      if (e.ref === lref || e.ref === href) { const lv = e.kind === 'mon' ? lvOf(e.ref) : null; nameTag(ug, TGT.nameOf({ kind: 'mon', ref: e.ref }) + (lv != null ? ` ${L(ctx).lv}${lv}` : ''), sx, b.y - 2, fs, e.side === 'foe'); tag = true; }
      ST.drawn.push({ id: e.ref.id ?? null, key: e.ref.c ? e.ref.c.key : e.kind, side: e.side, x: b.x, y: b.y, w: b.w, h: b.h, tag, lock: e.ref === lref });
    }
    if (lk && globalThis.__tri120 !== false) {   /* p120 anh 04/11: con đang khoá = TAM GIÁC LỘN NGƯỢC tĩnh trên đầu (ảnh tri.png cắt từ mũi tên PixelLab target_arrow) */
      const d = ST.drawn.find(x => x.lock), q = TGT.pos(lk), hh = TGT.heightOf ? TGT.heightOf(lk) : 16;
      const top = d ? d.y - 2 - (d.tag ? fs + 2 : 0) : Math.round((q.y - hh - 2 - cy) * scale - su * 5.5);   /* không có thanh target91: chừa thanh máu + Lv của hệ khác (c10-vsnho / monsters) */
      const im = img('tri'), tw = Math.round(su * 4.6), th = im ? Math.round(tw * im.height / im.width) : Math.round(tw * 0.7), tx = Math.round((q.x - cx) * scale - tw / 2), ty = Math.round(top - th - 2);
      ST.tri = { x: tx, y: ty, w: tw, h: th };
      if (im) { ug.save(); ug.imageSmoothingEnabled = false; ug.drawImage(im, 0, 0, im.width, im.height, tx, ty, tw, th); ug.restore(); }
      else { ug.save(); ug.fillStyle = '#ffd45e'; ug.strokeStyle = '#4a2430'; ug.lineWidth = 2; ug.beginPath(); ug.moveTo(tx, ty); ug.lineTo(tx + tw, ty); ug.lineTo(tx + tw / 2, ty + th); ug.closePath(); ug.fill(); ug.stroke(); ug.restore(); }
    } else ST.tri = null;
    if (hv && href !== lref) {   /* trỏ chuột: 4 góc xanh quanh thứ đang trỏ (con đang khoá đã có vòng cam) */
      const q = TGT.pos(hv), hh = TGT.heightOf ? TGT.heightOf(hv) : 16, ww = hv.kind === 'mon' ? (href.c.w || 12) + 6 : hv.kind === 'obj' ? 18 : 14;
      corners(ug, Math.round((q.x - ww / 2 - cx) * scale), Math.round((q.y - hh - 2 - cy) * scale), Math.round((q.x + ww / 2 - cx) * scale), Math.round((q.y + 3 - cy) * scale), su);
    }
  },
};
