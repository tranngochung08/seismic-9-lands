/* village88.js — plan-88 đợt 1 (02/11/2026): hệ đi kèm LÀNG MỚI (world.js buildVillage88 · bố cục src/village88.js).
   1. HOÀN ĐÁ ĐẤT CŨ (anh chốt 'Bỏ hẳn mua đất'): save có lô đất ở Làng (save.lands.village) → mỗi lô hoàn 30 🪨 = giá gốc ở Làng
      (land.js: 30 + 20·max(0, lv), Làng lv −1 → 30; ai được giảm còn 24 vẫn nhận 30 — không ai thiệt). Khu chiếm bằng hoá đá (save.conq.village) không mất đá → chỉ xoá.
      Xoá luôn dữ liệu khu theo chỉ số lô của Làng (save.districts.village, save.sys.districts.village) để lô cũ không áp lên bản đồ mới.
      Chạy 1 lần (save.sys.p88.done), ở vùng nào cũng chạy (hệ always, đứng ĐẦU danh sách → trước land / pet đọc save.lands).
   2. LỚP NỀN: bậc thang vách, cầu gỗ, xương ở trại (ảnh PixelLab td8, đi được → vẽ ở drawGround dưới người / thú).
   3. BĂNG TÊN VÙNG CON (research-saiyan-video.md mục 1): bước sang vùng con khác → băng gỗ nhỏ giữa trên màn (ui/dlg_plate.png):
      'LÀNG XUẤT PHÁT' · tên vùng con · ◆ An toàn / ◆ Thú hoang — 2,6 s rồi mờ; chỉ hiện khi ĐỔI vùng con (vào Làng lần đầu cũng hiện).
   Móc test: window.__v88 = { refund(), regions(), banner(), decals(), camps(), at(tx,ty) }. */
import { regionAt, REGIONS } from '../village88.js';
const IM = {};
function img(src) { let i = IM[src]; if (!i) { i = IM[src] = new Image(); i.src = 'assets/px/' + src; } return i.complete && i.naturalWidth ? i : null; }
const ST = { ctx: null, on: false, reg: null, ban: null, log: [], refund: null };
const BAN_T = 2.6, BAN_IN = 0.25, BAN_OUT = 0.6;
const vi = ctx => !ctx.lang || ctx.lang() !== 'en';
function migrate(ctx) {
  const s = ctx.S.save; if (!s) return; s.sys ||= {}; if (s.sys.p88 && s.sys.p88.done) return;
  const lands = (s.lands && s.lands.village) || [], n = Array.isArray(lands) ? lands.length : 0, stones = n * 30;
  const conq = s.conq && s.conq.village ? Object.keys(s.conq.village).length : 0;
  if (stones) { s.inv ||= {}; if (ctx.bag && ctx.bag.add) ctx.bag.add('stone', stones); else s.inv.stone = (s.inv.stone || 0) + stones; }
  if (s.lands) delete s.lands.village; if (s.conq) delete s.conq.village; if (s.districts) delete s.districts.village; if (s.sys.districts) delete s.sys.districts.village;
  s.sys.p88 = { done: true, at: Date.now(), lands: n, conq, stones };
  ST.refund = { ...s.sys.p88 }; ST.log.push('refund ' + n + ' lô → ' + stones + ' đá, conq ' + conq);
  if (n || conq) {
    const t = vi(ctx) ? `Làng đã đổi bố cục — bỏ mua đất. Hoàn ${stones} 🪨 cho ${n} lô đất ở Làng.` : `The Village has a new layout — land plots are gone. Refunded ${stones} 🪨 for ${n} plot(s).`;
    setTimeout(() => { try { ctx.toast(t); } catch (e) { } }, 1200);
  }
}
function drawGround(g, ctx, cx, cy) {
  const m = ctx.S.map, D = m && m.decals88; if (!D) return; const VW = ctx.VW || 640, VH = ctx.VH || 400;
  for (const d of D) {
    const im = img(d.img); if (!im) continue; const x = Math.round(d.x - d.w / 2 - cx), y = Math.round(d.y - d.h - cy);
    if (x > VW || y > VH || x + d.w < 0 || y + d.h < 0) continue;
    g.drawImage(im, 0, 0, im.width, im.height, x, y, d.w, d.h);   /* ảnh 2× → vẽ kèm cỡ đích (luật 2026-10-10) */
  }
}
function drawUI(ug, ctx, cx, cy, scale) {
  const B = ST.ban; if (!B) return; const t = B.t, a = t < BAN_IN ? t / BAN_IN : t > BAN_T - BAN_OUT ? Math.max(0, (BAN_T - t) / BAN_OUT) : 1; if (a <= 0) return;
  const W = ug.canvas.width, s = Math.max(2, Math.round((globalThis.__u89?globalThis.__u89(scale):scale))), fs1 = Math.max(12, Math.round(s * 4.2)), fs2 = Math.max(16, Math.round(s * 6.2));   /* 02/11 em tự sửa: dòng khu + thẻ An toàn bản đầu nhỏ quá khó đọc */
  ug.save(); ug.globalAlpha = a; ug.imageSmoothingEnabled = false; ug.textAlign = 'center'; ug.textBaseline = 'middle';
  ug.font = `bold ${fs2}px VT323, monospace`; const tw = Math.max(ug.measureText(B.name).width, 60 * s);
  const bw = Math.round(tw + 40 * s), bh = Math.round(fs1 * 2 + fs2 + 10 * s), x = Math.round(W / 2 - bw / 2), y = Math.round(10 * s - (1 - Math.min(1, t / BAN_IN)) * 8 * s);
  const im = img('ui/dlg_plate.png');
  if (im) { const c = 14, k = bh / im.height; ug.drawImage(im, 0, 0, c, im.height, x, y, c * k, bh); ug.drawImage(im, c, 0, im.width - 2 * c, im.height, x + c * k, y, bw - 2 * c * k, bh); ug.drawImage(im, im.width - c, 0, c, im.height, x + bw - c * k, y, c * k, bh); }
  else { ug.fillStyle = '#b7834a'; ug.fillRect(x, y, bw, bh); }
  const cxm = W / 2, sh = (txt, yy, col, f) => { ug.font = f; ug.fillStyle = '#2a1a10'; ug.fillText(txt, cxm + 1, yy + 1); ug.fillStyle = col; ug.fillText(txt, cxm, yy); };
  sh(B.area, y + 4 * s + fs1 / 2, '#fff3d6', `bold ${fs1}px VT323, monospace`);
  sh(B.name, y + 4 * s + fs1 + fs2 / 2, '#ffffff', `bold ${fs2}px VT323, monospace`);
  sh(B.tag, y + 4 * s + fs1 + fs2 + fs1 / 2 + 1, B.wild ? '#ffb070' : '#a8f0a0', `bold ${fs1}px VT323, monospace`);
  ug.restore();
}
export const village88 = {
  id: 'village88',
  always: true,
  onZoneEnter(ctx) {
    ST.ctx = ctx; try { migrate(ctx); } catch (e) { console.error('village88 migrate', e); }
    ST.on = !!(ctx.S.map && ctx.S.map.decals88); ST.reg = null; ST.ban = null;
    if (typeof window !== 'undefined') window.__v88 = {
      refund: () => ST.refund || (ctx.S.save.sys && ctx.S.save.sys.p88) || null, regions: () => REGIONS.map(r => ({ ...r })), banner: () => ST.ban && { ...ST.ban }, log: () => ST.log.slice(),
      decals: () => (ctx.S.map.decals88 || []).map(d => ({ ...d })), camps: () => (ctx.S.map.camps || []).map(c => ({ k: c.k, x: c.x, y: c.y, rect: c.rect })),
      at: (tx, ty) => regionAt(tx, ty).id, reg: () => ST.reg && ST.reg.id, migrate: () => { try { migrate(ctx); } catch (e) { return String(e); } return ST.refund; } };
  },
  update(dt, ctx) {
    if (ST.ban) { ST.ban.t += dt; if (ST.ban.t > BAN_T) ST.ban = null; }
    if (!ST.on) return; const p = ctx.S.player; if (!p) return;
    const r = regionAt(Math.floor(p.x / 16), Math.floor(p.y / 16));
    if (!ST.reg || r.id !== ST.reg.id) {
      const v = vi(ctx); ST.reg = r;
      ST.ban = { id: r.id, t: 0, wild: !!r.wild, area: v ? 'LÀNG XUẤT PHÁT' : 'HARBOR VILLAGE', name: v ? r.vi : r.en, tag: r.wild ? (v ? '◆ Thú hoang' : '◆ Wild beasts') : (v ? '◆ An toàn' : '◆ Safe') };
      ST.log.push('region ' + r.id);
    }
  },
  drawGround(g, ctx, cx, cy) { if (ST.on) drawGround(g, ctx, cx, cy); },
  drawUI(ug, ctx, cx, cy, scale) { if (ST.on) drawUI(ug, ctx, cx, cy, scale); },
};
