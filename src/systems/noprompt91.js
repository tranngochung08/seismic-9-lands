// noprompt91.js — p91 r2 (anh 02/11, khoanh đỏ 2 lần): "Bỏ các thông báo này ra khỏi game".
//  · BỎ bảng gợi ý gỗ "E · …" (Vuốt ve Rocky, Nói chuyện, ⚔ Đấu, Chặt cây…). Thay bằng kiểu Saiyan: thứ tương tác được GẦN NHẤT (S.near)
//    có 4 GÓC XANH ôm sprite + nhãn tên nhỏ trên đầu (đỏ sẫm = đối thủ, tối trung tính = NPC / Rocky / vật) + ô phím E (điện thoại: A)
//    + icon hành động PixelLab (nói / tay / đấu / dụng cụ / đọc; việc dùng công cụ → icon của chính món). Hình TĨNH, không VFX lặp.
//    Câu chữ đầy đủ chỉ còn là tooltip nhỏ cạnh con trỏ khi đang dùng chuột (hud.js setLabel hỏi globalThis.__lbl91).
//  · TẮT hộp hướng dẫn / nhắc tutorial góc trái (Ki, "Khoá mục tiêu … (Tab đổi)", "đi lên phía Bắc để vào làng", "Mẹo: …"): hud.js notify hỏi
//    globalThis.__np91Hint(text) → true = bỏ. Thông tin Ki nằm ở tooltip thanh / ngọc Ki; phím Tab / Esc ở khung mục tiêu.
//  · MODULE ĐỘC LẬP: gộp vào bản nào cũng được bằng _wip/p91/_gen/patch-noprompt.py (đăng ký hệ, vá hud.js, chép 7 ảnh ui/hud91).
//    Chỉ cần src/systems/target.js (có sẵn ở mọi bản) cho tên / con đang khoá. Test: window.__np91.
import * as TGT from './target.js';
import { ART } from '../art.js';
import { Entity } from '../entities.js';

const IMG = 'assets/px/ui/hud91/';
const ST = { im: {}, near: null, nearBox: null, drop: [] };
const vi = ctx => ctx.lang() === 'vi';
function img(k) {
  if (ST.im[k] !== undefined) return ST.im[k];
  ST.im[k] = null; if (typeof Image === 'undefined') return null;
  const im = new Image(); im.onload = () => { ST.im[k] = im; }; im.src = IMG + k + '.png'; return null;
}
const L = ctx => (vi(ctx) ? { lv: 'Cấp' } : { lv: 'Lv' });
const lvOf = mo => mo.lv ?? (mo.F && mo.F.lv) ?? mo.c.lv ?? null;
function corners(ug, x0, y0, x1, y1, su) {   /* 4 góc xanh (hover.png PixelLab, 4 phần tư) */
  const im = img('hover'), c = Math.max(12, Math.round(su * 5));
  if (!im) { ug.save(); ug.strokeStyle = '#7bea3a'; ug.lineWidth = 2; ug.strokeRect(x0, y0, x1 - x0, y1 - y0); ug.restore(); return; }
  const hw = im.width / 2, hh = im.height / 2; ug.save(); ug.imageSmoothingEnabled = false;
  ug.drawImage(im, 0, 0, hw, hh, x0, y0, c, c); ug.drawImage(im, hw, 0, hw, hh, x1 - c, y0, c, c);
  ug.drawImage(im, 0, hh, hw, hh, x0, y1 - c, c, c); ug.drawImage(im, hw, hh, hw, hh, x1 - c, y1 - c, c, c); ug.restore();
}
/* hộp nhắc tutorial (góc trái) bị bỏ — dòng thông báo thường (+1 gỗ, lên cấp, lỗi…) giữ nguyên */
const HINT = [/^Ki \(/, /Khóa mục tiêu|Khoá mục tiêu|Target locked|Lock target/, /để vào làng|to enter the village/i, /^Mẹo:|^Tip:/, /\(Tab đổi mục tiêu\)|\(Tab: next target\)|nút Đổi mục tiêu|Next target button/];
if (typeof globalThis !== 'undefined') globalThis.__np91Hint = text => { const s = String(text || ''); const hit = HINT.some(r => r.test(s)); if (hit) { ST.drop.push(s.slice(0, 80)); if (ST.drop.length > 20) ST.drop.shift(); } return hit; };
/* ---------- p91 r2 (anh 02/11): BỎ bảng gợi ý "E · …" to — thứ tương tác được GẦN NHẤT (S.near) đánh dấu kiểu Saiyan:
   4 góc xanh ôm sprite + nhãn tên nhỏ trên đầu (đỏ sẫm = đối thủ, tối trung tính = NPC / Rocky / vật) + ô phím E (điện thoại: A) + icon hành động PixelLab.
   Câu chữ đầy đủ chỉ còn là tooltip nhỏ cạnh con trỏ khi đang dùng chuột (hud.js setLabel hỏi globalThis.__lbl91). Tĩnh, không VFX lặp. ---------- */
const MZ = { t: -1e9 };
if (typeof window !== 'undefined') addEventListener('mousemove', () => { MZ.t = performance.now(); }, { passive: true });
const fine = () => typeof matchMedia !== 'undefined' && matchMedia('(pointer:fine)').matches;
const mouseLive = () => fine() && performance.now() - MZ.t < 3000;
if (typeof globalThis !== 'undefined') globalThis.__lbl91 = () => !mouseLive();   /* true = ẩn bảng gợi ý (đánh dấu trên đầu thay) */
const OBJK = { sign: ['Biển báo', 'Sign'], bed: ['Giường', 'Bed'], hall: ['Bia Magnitude', 'Magnitude stone'], nation: ['Bảng quốc gia', 'Nation board'], rocky: ['Rocky', 'Rocky'], shop: ['Quầy hàng', 'Shop'], fire: ['Lửa trại', 'Campfire'], ore: ['Quặng', 'Ore'], lever: ['Cần gạt', 'Lever'], quiz: ['Bảng học', 'Study board'], item: ['Đồ rơi', 'Item'] };
const OBJA = { sign: 'read', hall: 'read', nation: 'read', quiz: 'read', ore: 'tool', fire: 'tool', lever: 'hand' };
function nearInfo(ctx) {
  const n = ctx.S.near; if (!n) return null; const v = vi(ctx);
  if (n.kind === 'npc' && n.npc) { const r = n.npc; return { ref: r, x0: r.x - 7, x1: r.x + 7, y0: r.y - 21, y1: r.y + 2, name: '', npcName: TGT.nameOf({ kind: 'npc', ref: r }), side: 'npc', act: 'talk', tip: n.label || '' }; }   /* NPC đã có bảng tên riêng → chỉ phím + icon (không nhân đôi tên) */
  if (n.obj) { const o = n.obj, d = (ctx.O && ctx.O[o.type]) || { fw: 1, fh: 1, h: 16 }, fw = d.fw || 1, fh = d.fh || 1, h = Math.max(d.h || 16, fh * 16), nm = OBJK[n.kind];
    return { ref: o, x0: o.x * 16, x1: (o.x + fw) * 16, y0: (o.y + fh) * 16 - h, y1: (o.y + fh) * 16, name: nm ? nm[v ? 0 : 1] : TGT.nameOf({ kind: 'obj', ref: o }), side: 'npc', act: OBJA[n.kind] || 'hand' }; }
  if (n.kind !== 'sys' || !n.cand) return null;
  const c = n.cand, d = c.data || {}, id = n.sys && n.sys.id, lab = String(c.label || '');
  const act = c.need ? 'tool' : (d.mo || d.lock || d.tent || /⚔|Đấu|Duel|Battle|Đánh|Attack|Hit/.test(lab)) ? 'fight' : (d.talkNpc || /Nói chuyện|Talk/.test(lab)) ? 'talk' : (c.cursor === 'tool' || d.brk || d.wreck || d.smash) ? 'tool' : /Đọc|Read/.test(lab) ? 'read' : 'hand';
  const TOOLS91 = ['bua', 'axe', 'pickaxe', 'shovel', 'scythe', 'knife', 'torch', 'rod', 'sword', 'petgun'], hd = ctx.held ? ctx.held() : null;
  { const NP = (ctx.S.npcs || []).concat(ctx.S.staff || []); let bn = null, bdd = 16; for (const q of NP) { if (!q || q === ctx.S.player) continue; const dd = Math.hypot(q.x - c.x, q.y - 8 - c.y); if (dd < bdd) { bdd = dd; bn = q; } }
    if (bn && !c.need && !d.mo && !d.fct && id !== 'pet' && (act === 'talk' || act === 'hand')) return { ref: bn, x0: bn.x - 7, x1: bn.x + 7, y0: bn.y - 21, y1: bn.y + 2, name: '', npcName: TGT.nameOf({ kind: 'npc', ref: bn }), side: 'npc', act: act === 'tool' || act === 'fight' ? act : 'talk', tip: lab }; }   /* việc gắn với NPC (quầy, đổi thẻ…) → dấu ở chính NPC */
  const tool = c.needId || (hd && TOOLS91.includes(hd) && hd !== 'sword' && hd !== 'petgun' && act !== 'talk' && act !== 'fight' && !d.talkNpc && id !== 'pet' && id !== 'market' ? hd : null) || ((d.mo || d.lock) && hd === 'sword' ? 'sword' : null);   /* kiếm chỉ hiện khi việc là đánh quái */   /* đợt F: việc dùng công cụ → icon của chính món (Búa, cần câu, kiếm…) */
  const wrap = o => (o && tool ? { ...o, tool: tool === 'axe' || tool === 'pickaxe' || tool === 'shovel' || tool === 'scythe' || tool === 'knife' || tool === 'torch' ? 'bua' : tool } : o);
  return wrap(nearSys(ctx, n, c, d, id, lab, act));
}
function nearSys(ctx, n, c, d, id, lab, act) {
  if (d.type && ctx.O && ctx.O[d.type] && d.x != null) { const o = d, dd = ctx.O[o.type], fw = dd.fw || 1, fh = dd.fh || 1, h = Math.max(dd.h || 16, fh * 16); return { ref: o, x0: o.x * 16, x1: (o.x + fw) * 16, y0: (o.y + fh) * 16 - h, y1: (o.y + fh) * 16, name: lab.replace(/^[^\p{L}\p{N}]+/u, '').replace(/\s*\(.*$/, ''), side: 'npc', act: id === 'market' ? 'hand' : act, tip: lab }; }   /* hệ trả chính vật (quầy…) */
  if ((d.mo || d.fct) && (d.mo || d.fct).c) { const mo = d.mo || d.fct, lv = lvOf(mo); if (d.fct) act = d.act === 'catch' ? 'hand' : 'fight'; return { ref: mo, x0: mo.x - (mo.c.w || 12) / 2 - 2, x1: mo.x + (mo.c.w || 12) / 2 + 2, y0: mo.y + (mo.__bt != null ? mo.__bt + 4 : -(mo.c.h || 12) - 2), y1: mo.y + 2, name: TGT.nameOf({ kind: 'mon', ref: mo }) + (lv != null ? ` ${L(ctx).lv}${lv}` : ''), side: mo.c.spar || !mo.angry && mo.F ? 'foe' : 'foe', act, tip: lab, mon: true }; }
  if (d.talkNpc) { const r = d.talkNpc; return { ref: r, x0: r.x - 7, x1: r.x + 7, y0: r.y - 21, y1: r.y + 2, name: TGT.nameOf({ kind: 'npc', ref: r }), side: 'npc', act: 'talk', tip: lab }; }
  if (d.animal) { const a = d.animal; return { ref: a, x0: a.x - 8, x1: a.x + 8, y0: a.y - 14, y1: a.y + 2, name: TGT.nameOf({ kind: 'ani', ref: a }), side: 'npc', act, tip: lab }; }
  if (id === 'pet' && ctx.rocky && ctx.rocky.ent) { const e = ctx.rocky.ent(), pt = ctx.rocky.pet && ctx.rocky.pet(); if (e) return { ref: e, x0: e.x - 9, x1: e.x + 9, y0: e.y - 22, y1: e.y + 2, name: (pt && pt.name) || 'Rocky', side: 'npc', act, tip: lab }; }
  { let bo = null, bd = 18; const ox = c.x, oy = c.y; for (const o of ctx.S.map.objects) { if (Math.abs(o.x * 16 - ox) > 64 || Math.abs(o.y * 16 - oy) > 80) continue; const dd = (ctx.O && ctx.O[o.type]) || null; if (!dd || o.ghost) continue; const fw = dd.fw || 1, fh = dd.fh || 1, h = Math.max(dd.h || 16, fh * 16), x0 = o.x * 16, x1 = (o.x + fw) * 16, y1 = (o.y + fh) * 16, y0 = y1 - h;
      const dx = Math.max(x0 - ox, 0, ox - x1), dy = Math.max(y0 - oy, 0, oy - y1), dist = Math.hypot(dx, dy); if (dist < bd) { bd = dist; bo = { o, x0, x1, y0, y1 }; } }
    const on = bo ? TGT.nameOf({ kind: 'obj', ref: bo.o }) : null, gen = on === TGT.TXT().obj; if (bo && !gen) { const ln = lab.replace(/^[^\p{L}\p{N}]+/u, '').replace(/\s*\(.*$/, ''); return { ref: bo.o, x0: bo.x0, x1: bo.x1, y0: bo.y0, y1: bo.y1, name: on, side: 'npc', act, tip: lab }; } }   /* việc gắn với 1 vật (cây, đá…) → góc ôm đúng vật + tên vật */
  const nm = lab.replace(/^[^\p{L}\p{N}]+/u, '').replace(/\s*\(.*$/, ''); return { ref: c, x0: c.x - 8, x1: c.x + 8, y0: c.y - 8, y1: c.y + 10, name: nm.length > 22 ? nm.slice(0, 21) + '…' : nm, side: 'npc', act, tip: lab };
}
const IIM = {};
function itemImg(id) {   /* icon món (ảnh PixelLab ui.items — kiếm theo cấp) */
  if (IIM[id] !== undefined) return IIM[id]; IIM[id] = null; const it = ART.man && ART.man.ui && ART.man.ui.items; if (!it || typeof Image === 'undefined') return null;
  const f = id === 'sword' ? Object.keys(it).filter(k => /^sword_t\d/.test(k)).sort().pop() : null, src = it[f || id] || it[id]; if (!src) return null;
  const im = new Image(); im.onload = () => { IIM[id] = im; }; im.src = 'assets/px/' + src; return null;
}
function keyCap(ug, x, y, s, ch) {   /* ô phím nhỏ (ảnh PixelLab key.png) + chữ E / A */
  const im = img('key'); ug.save(); ug.imageSmoothingEnabled = false;
  if (im) ug.drawImage(im, 0, 0, im.width, im.height, x, y, s, s); else { ug.fillStyle = '#e8dcc0'; ug.fillRect(x, y, s, s); ug.fillStyle = '#3b2412'; ug.fillRect(x, y + s - 2, s, 2); }
  ug.font = `${Math.round(s * 0.72)}px VT323, monospace`; ug.textAlign = 'center'; ug.textBaseline = 'middle'; ug.fillStyle = '#3b2412'; ug.fillText(ch, x + s / 2, y + s / 2 - 1); ug.restore();
}
function drawNear(ug, ctx, cx, cy, scale, su, skipRef, lockRef) {
  const ni = ST.ni; ST.near = ni ? { name: ni.name, act: ni.act, side: ni.side, tool: ni.tool || null, sel: SEL.v } : null; if (!ni) return;   /* con đang khoá đã có vòng cam + tên + thanh */
  const x0 = Math.round((ni.x0 - cx) * scale), x1 = Math.round((ni.x1 - cx) * scale), y0 = Math.round((ni.y0 - cy) * scale), y1 = Math.round((ni.y1 - cy) * scale);
  if (SEL.v === 'saiyan') corners(ug, x0, y0, x1, y1, su);
  const cmp = SEL.v !== 'saiyan', fs = cmp ? Math.max(11, Math.round(su * 2.6)) : Math.max(12, Math.round(su * 3.1)), ks = cmp ? fs : Math.max(14, Math.round(fs * 1.15)), icon = (ni.tool && itemImg(ni.tool)) || img('act_' + ni.act), mid = (x0 + x1) / 2;
  ug.save(); ug.font = `${fs}px VT323, monospace`; const tw = ni.name ? Math.ceil(ug.measureText(ni.name).width) + 10 : -2; ug.restore();
  const tot = ks + 2 + tw + 2 + ks, lx = ni.name ? Math.round(mid - tot / 2) : x1 + 2, ty = ni.name ? y0 - Math.round(scale * (SEL.v === 'c' ? 9 : SEL.v === 'a' || SEL.v === 'b' ? 3 : 1.5)) : y0 + ks + Math.round(scale * 4), foe = ni.side === 'foe';   /* NPC (không tên): phím + icon bên phải đầu, không đè bảng tên */   /* nhãn dính sát dấu chọn, không che sprite */
  keyCap(ug, lx, ty - ks, ks, fine() ? 'E' : 'A');
  const h = fs + 2, bx = lx + ks + 2, by = ty - ks + Math.round((ks - h) / 2);
  if (ni.name) { ug.save(); ug.fillStyle = '#1c1210'; ug.fillRect(bx - 1, by - 1, tw + 2, h + 2); ug.fillStyle = foe ? '#7e1f18' : '#2e2632'; ug.fillRect(bx, by, tw, h); ug.fillStyle = foe ? '#a8382c' : '#4a4050'; ug.fillRect(bx, by, tw, 1);
  ug.font = `${fs}px VT323, monospace`; ug.textAlign = 'center'; ug.textBaseline = 'middle'; ug.fillStyle = '#fff6c8'; ug.fillText(ni.name, bx + tw / 2, by + h / 2 + 1); ug.restore(); }
  if (icon) { ug.save(); ug.imageSmoothingEnabled = false; ug.drawImage(icon, 0, 0, icon.width, icon.height, bx + tw + 2, ty - ks, ks, ks); ug.restore(); }
  ST.nearBox = { x: lx, y: ty - ks, w: tot, h: ks, cx0: x0, cy0: y0, cx1: x1, cy1: y1 };
}


/* ---------- p91 r3 (anh 02/11: "Làm có nó VFX Claude, không cần bắt chước y chang Saiyan"): DẤU CHỌN VẼ CODE theo skill vfx-code ----------
   Vẽ trên lớp thế giới (g, đơn vị px logic, nét 0,5 px = 2 điểm / px logic như sprite), bảng màu 8 bậc theo loại (lục trung tính / đỏ đối thủ / vàng NPC),
   mờ bằng dither Bayer 4×4 (không alpha). Nhịp: XUẤT HIỆN ≤ 0,3 s khi đối tượng được chọn / đổi, sau đó TĨNH (hoặc thở ≤ 1 px rất chậm) — không nhấp nháy, không xoay liên tục.
   Bản nháp chọn bằng ?sel91=a|b|c|d|e (hoặc window.__np91.sel('c')). 'saiyan' = 4 góc ảnh PixelLab cũ. */
const PALS = {
  npc: ['#2a1c08', '#4a320e', '#725014', '#9e7220', '#c8982e', '#e8c04a', '#f6dc84', '#fff4c8'],   /* vàng: NPC / vật / Rocky */
  foe: ['#2a0c0c', '#4a1414', '#721e1a', '#9e2c22', '#c8402e', '#e86a4a', '#f6a07a', '#ffd6c0'],   /* đỏ: đối thủ */
  ally: ['#0f2a12', '#1d4a1c', '#2f6e28', '#4a9a36', '#6cc04a', '#96dc6a', '#c4f09a', '#eaffd0'],  /* lục: trung tính / phe mình */
  stone: ['#1c1814', '#2e2822', '#443a30', '#5e5042', '#7a6a58', '#9a8a74', '#bcae96', '#e0d6c0'],
};
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const dith = (x, y, a) => a * 16 > BAYER[((y & 3) << 2) | (x & 3)] + 0.5;   /* a 0..1 → điểm (x, y) có vẽ không */
const VAR = (() => { try { const v = new URLSearchParams(location.search).get('sel91'); return v && /^(a|b|c|d|e|f|saiyan)$/.test(v) ? v : 'e'; } catch (e) { return 'e'; } })();   /* ANH DUYỆT bản e (vầng sáng đất) 02/11 — a–d, f, saiyan chỉ còn sau ?sel91= để tham khảo */
const SEL = { v: VAR, ref: null, t0: 0, pal: null };
const ease = u => 1 - Math.pow(1 - Math.min(1, Math.max(0, u)), 3);
function palOf(ni) { return ni.side === 'foe' ? PALS.foe : ni.act === 'talk' || ni.side === 'npc' ? PALS.npc : PALS.ally; }
function px(g, x, y, c, s = 1) { g.fillStyle = c; g.fillRect(x, y, s, s); }   /* 1 px logic */
function hpx(g, x, y, c) { g.fillStyle = c; g.fillRect(x, y, 0.5, 0.5); }      /* nửa px logic = 1 điểm ảnh hi-res */
/* (a) ẤN ĐÁ: vòng đá Seismic dưới chân (ellipse dither) + 4 ngoặc góc pixel BẬT VÀO từ ngoài (0,25 s) */
function selA(g, ni, P, u, cx, cy, part) {
  const e = ease(u), x0 = Math.round(ni.x0 - cx), x1 = Math.round(ni.x1 - cx), y0 = Math.round(ni.y0 - cy), y1 = Math.round(ni.y1 - cy), off = Math.round((1 - e) * 5);
  const mx = (x0 + x1) / 2, rx = Math.max(6, (x1 - x0) / 2 + 2) * (0.6 + 0.4 * e), ry = Math.max(2.5, rx * 0.36), fy = y1 - 0.5;
  if (part === 'ground') { for (let a = 0; a < 64; a++) { const t = a / 64 * Math.PI * 2, xx = mx + Math.cos(t) * rx, yy = fy + Math.sin(t) * ry, back = Math.sin(t) < 0;
    const k = back ? 4 : 6; if (dith(Math.round(xx), Math.round(yy), back ? 0.6 * e : e)) px(g, Math.round(xx), Math.round(yy), back ? P[3] : P[5]); }
  for (let a = 0; a < 6; a++) { const t = a / 6 * Math.PI * 2 + 0.3, xx = Math.round(mx + Math.cos(t) * rx), yy = Math.round(fy + Math.sin(t) * ry); if (e > 0.6) px(g, xx, yy, PALS.stone[6]); }   /* đá vụn điểm trên vòng */
    return; }
  const L = 4, C = P[6], D = P[1];
  for (const [sx, sy, dx, dy] of [[x0 - off, y0 - off, 1, 1], [x1 + off, y0 - off, -1, 1], [x0 - off, y1 + off, 1, -1], [x1 + off, y1 + off, -1, -1]]) {
    const bx = dx > 0 ? sx - 1 : sx, by = dy > 0 ? sy - 1 : sy;
    for (let i = 0; i < L; i++) { px(g, bx + dx * i, by, C); px(g, bx, by + dy * i, C); }
    px(g, bx + (dx > 0 ? -1 : 1), by, D); px(g, bx, by + (dy > 0 ? -1 : 1), D);   /* viền tối ngoài */
  }
}
/* (b) TINH THỂ TỤ: 8 mảnh đá/tinh thể bay từ xa xoay tụ về thành khung góc rồi đứng yên */
function selB(g, ni, P, u, cx, cy, seed) {
  const e = ease(u / 0.9), x0 = Math.round(ni.x0 - cx) - 1, x1 = Math.round(ni.x1 - cx) + 1, y0 = Math.round(ni.y0 - cy) - 1, y1 = Math.round(ni.y1 - cy) + 1;
  const tg = [[x0, y0], [x1, y0], [x0, y1], [x1, y1], [(x0 + x1) >> 1, y0 - 2], [x0 - 1, (y0 + y1) >> 1], [x1 + 1, (y0 + y1) >> 1], [(x0 + x1) >> 1, y1 + 1]];
  tg.forEach(([tx, ty], i) => {
    const ang = (seed * 7 + i * 2.4) % 6.283, r = (1 - e) * 22, x = Math.round(tx + Math.cos(ang) * r), y = Math.round(ty + Math.sin(ang) * r - (1 - e) * 6);
    const big = i < 4; if (!dith(x, y, Math.min(1, u * 3))) return;
    px(g, x, y, P[6]); px(g, x, y - 1, P[4]); if (big) { px(g, x - 1, y, P[3]); px(g, x + 1, y, P[5]); px(g, x, y + 1, P[2]); }
  });
}
/* (c) MŨI CHẤN + SÓNG: mũi tên nhỏ trên đầu (thở 1 px rất chậm) + vạch sóng chấn răng cưa dưới chân, lan từ giữa ra (0,3 s) */
function selC(g, ni, P, u, cx, cy, t, part) {
  const e = ease(u), mx = Math.round((ni.x0 + ni.x1) / 2 - cx), y0 = Math.round(ni.y0 - cy), y1 = Math.round(ni.y1 - cy), w = Math.max(8, (ni.x1 - ni.x0) / 2 + 3) * e;
  const bob = Math.sin(t * 1.6) > 0.6 ? 1 : 0, ay = y0 - 5 - Math.round((1 - e) * 6) + bob;
  const A = [[0, 0, 7], [-1, -1, 5], [1, -1, 5], [-2, -2, 4], [2, -2, 4], [-1, -2, 6], [0, -1, 6], [1, -2, 6], [0, -2, 7], [-3, -3, 3], [3, -3, 3], [-2, -3, 5], [-1, -3, 6], [0, -3, 6], [1, -3, 6], [2, -3, 5]];
  if (part !== 'ground') { for (const [dx, dy, k] of A) px(g, mx + dx, ay + dy, P[k]);
  px(g, mx - 4, ay - 3, P[0]); px(g, mx + 4, ay - 3, P[0]); px(g, mx, ay + 1, P[1]); return; }
  for (let x = -Math.floor(w); x <= Math.floor(w); x++) { const z = (Math.abs(x) % 4), yy = y1 + (z === 1 ? -1 : z === 3 ? 1 : 0); const k = Math.abs(x) > w - 2 ? 3 : 5; px(g, mx + x, yy, P[k]); if (Math.abs(x) % 4 === 1) px(g, mx + x, yy - 1, P[k - 2]); }
}
/* (d) VIỀN SÁNG ÔM SPRITE: chụp hình đối tượng ra canvas phụ, lấy viền ngoài 1 px, tô bảng màu theo loại; xuất hiện bằng dither tăng dần từ dưới lên */
const OUT = { key: '', pts: null, t: 0 };
function outlinePts(ni, ctx) {
  const now = ctx.S.time; const key = (ni.ref && (ni.ref.id ?? '')) + '|' + Math.round(ni.x0) + '|' + Math.round(ni.y0);
  if (OUT.pts && OUT.key === key && now - OUT.t < 0.25) return OUT.pts;
  const W = Math.ceil(ni.x1 - ni.x0) + 12, H = Math.ceil(ni.y1 - ni.y0) + 12; let pts = null;
  try {
    const c = document.createElement('canvas'); c.width = W * 2; c.height = H * 2; const g = c.getContext('2d'); g.imageSmoothingEnabled = false; g.scale(2, 2); g.translate(-ni.x0 + 6, -ni.y0 + 6);
    const r = ni.ref; let ok = false;
    if (ni.mon && r.c) { const sh = ART.monsters && ART.monsters[r.c.key]; if (r.c.drawFn) { const p0 = Object.create(r); p0.flash = 0; r.c.drawFn(g, p0, r.x, r.y); ok = true; } else if (sh) { g.drawImage(sh.img, 0, (r.face ?? 0) * sh.ch, sh.cw, sh.ch, r.x - (sh.cw >> 1), r.y - sh.ch + 2, sh.cw, sh.ch); ok = true; } }
    else if (r && r.sheet) { const p0 = Object.create(r); p0.action = null; p0.moving = false; Entity.prototype.draw.call(p0, g); ok = true; }
    if (ok) { const d = g.getImageData(0, 0, c.width, c.height).data, Wc = c.width, Hc = c.height, A = (x, y) => x >= 0 && y >= 0 && x < Wc && y < Hc && d[(y * Wc + x) * 4 + 3] > 120; pts = [];
      for (let y = 0; y < Hc; y++) for (let x = 0; x < Wc; x++) if (!A(x, y) && (A(x - 1, y) || A(x + 1, y) || A(x, y - 1) || A(x, y + 1))) pts.push([x / 2 + ni.x0 - 6, y / 2 + ni.y0 - 6, y / Hc]); }
  } catch (e) { pts = null; }
  OUT.key = key; OUT.pts = pts; OUT.t = now; return pts;
}
function selD(g, ni, P, u, cx, cy, ctx, noFallback) {
  const pts = outlinePts(ni, ctx); if (!pts || !pts.length) return noFallback ? null : selA(g, ni, P, u, cx, cy, 'top');
  const e = ease(u);
  const seen = new Set(); for (const [x, y, fy] of pts) { const sx = Math.round(x - cx), sy = Math.round(y - cy), k = sx * 4096 + sy; if (seen.has(k)) continue; seen.add(k); if (!dith(sx, sy, Math.min(1, e * 1.4 - (1 - fy) * 0.4 + 0.2))) continue; px(g, sx, sy, fy > 0.7 ? P[4] : P[6]); }
}
/* (e) VẦNG SÁNG ĐẤT: ellipse dither nhạt dưới chân (lớp nền) + 2 chấm sáng nhỏ hai bên — tối giản nhất */
function selE(g, ni, P, u, cx, cy) {   /* bản chốt: vầng sáng đất (ellipse) dưới chân — viền tối 1 px ngoài cùng + vành sáng dither đặc + lòng nhạt; xuất hiện nở ra 0,28 s rồi đứng yên */
  const e = ease(u), mx = (ni.x0 + ni.x1) / 2 - cx, fy = ni.y1 - cy, rx = Math.max(7, (ni.x1 - ni.x0) / 2 + 3) * (0.7 + 0.3 * e), ry = Math.max(3, rx * 0.38), ro = rx + 1, ryo = ry + 1;
  for (let yy = -ryo; yy <= ryo; yy += 0.5) for (let xx = -ro; xx <= ro; xx += 0.5) {
    const X = Math.round((mx + xx) * 2), Y = Math.round((fy + yy) * 2), qo = (xx * xx) / (ro * ro) + (yy * yy) / (ryo * ryo), q = (xx * xx) / (rx * rx) + (yy * yy) / (ry * ry);
    if (qo > 1) continue;
    if (q > 1) { if (e > 0.25) hpx(g, X / 2, Y / 2, P[1]); continue; }   /* viền tối 1 px: nổi trên cỏ / đất */
    const a = (q > 0.68 ? 1 : q > 0.4 ? 0.5 : 0.18) * e;
    if (dith(X, Y, a)) hpx(g, X / 2, Y / 2, q > 0.68 ? (q > 0.85 ? P[6] : P[5]) : P[4]);
  }
  if (e > 0.7) { px(g, Math.round(mx - rx - 2), Math.round(fy), P[7]); px(g, Math.round(mx + rx + 1), Math.round(fy), P[7]); }
}
function selWorld(g, ctx, cx, cy, layer) {
  const ni = ST.ni; if (!ni || SEL.v === 'saiyan') return;
  if (SEL.ref !== ni.ref) { SEL.ref = ni.ref; SEL.t0 = ctx.S.time; SEL.seed = (SEL.seed || 0) + 1; }
  const u = (ctx.S.time - SEL.t0) / 0.28, P = palOf(ni);
  g.save();
  if (SEL.v === 'a') selA(g, ni, P, u, cx, cy, layer); else if (SEL.v === 'c') selC(g, ni, P, u, cx, cy, ctx.S.time, layer);
  else if (layer === 'ground') { if (SEL.v === 'e' || SEL.v === 'f') selE(g, ni, P, u, cx, cy); }
  else { if (SEL.v === 'b') selB(g, ni, P, u, cx, cy, SEL.seed); else if (SEL.v === 'd') selD(g, ni, P, u, cx, cy, ctx); else if (SEL.v === 'f') selD(g, ni, P, u, cx, cy, ctx, true); }
  g.restore();
}

export const noprompt91 = {
  id: 'noprompt91',
  onZoneEnter(ctx) {
    for (const k of ['hover', 'key', 'act_hand', 'act_talk', 'act_fight', 'act_tool', 'act_read']) img(k);
    if (typeof window !== 'undefined') window.__np91 = { sel: v => { if (v) { SEL.v = v; SEL.ref = null; } return SEL.v; }, near: () => (ST.near ? { ...ST.near, box: ST.nearBox } : null), lblHidden: () => !!globalThis.__lbl91(), dropped: () => ST.drop.slice() };
  },
  update(dt, ctx) {   /* thứ tương tác gần nhất (bỏ con đang khoá — đã có vòng cam + tên) */
    let ni = ctx.S.mode === 'play' && !ctx.S.fish91 ? nearInfo(ctx) : null;   /* đang câu: không dấu chọn */ const lk = TGT.get ? TGT.get() : null, lref = lk ? (lk.mo || lk.ref) : null; if (ni && ni.mon && ni.ref === lref) ni = null; ST.ni = ni;
  },
  drawGround(g, ctx, cx, cy) { if (ctx.S.mode === 'play') selWorld(g, ctx, cx, cy, 'ground'); },
  draw(g, ctx, cx, cy) { if (ctx.S.mode === 'play') selWorld(g, ctx, cx, cy, 'top'); },
  drawUI(ug, ctx, cx, cy, scale) {
    ST.nearBox = null; ST.near = null; if (ctx.S.mode !== 'play') return;
    const su = ctx.scaleUI || scale, lk = TGT.get ? TGT.get() : null, lref = lk ? (lk.mo || lk.ref) : null;
    drawNear(ug, ctx, cx, cy, scale, su, null, lref);
  },
};
