/* zonebanner120.js — c65-hud (plan-120 việc 2, học Saiyan): BANNER KHI VÀO VÙNG.
   onZoneEnter → chờ 0,4 s (màn mờ xong, quái đã thả) → tấm ván PixelLab (ui/dlg_plate.png, cùng kiểu băng vùng con của village88) giữa trên ~2,5 s:
     dòng nhỏ = khu vực / cấp (MAGNITUDE 3, ĐÈO 2, KHE NỨT…), dòng to = tên vùng, dòng nhỏ = ◆ An toàn / Có quái / PvP + giờ trong game (ctx.clock.label).
   Trượt xuống khi hiện, mờ dần khi tắt; KHÔNG lặp. Vào lại cùng vùng trong < 60 s → không hiện. Đứng trong menu / hội thoại → dừng đếm.
   Làng mới (map.decals88): village88 đã có băng tên vùng con ở đúng chỗ này → không hiện thêm (tránh 2 băng chồng nhau).
   Móc test: window.__zb120 = { state(), show(id) }. Dấu build: ZB120_BANNER */
import { img, plank, ol, uiS, isVi, bannerTop } from './hud120lib.js';

const T_ALL = 2.5, T_IN = 0.3, T_OUT = 0.6, DELAY = 0.4, AGAIN = 60;
const ST = { ban: null, pend: null, last: {}, log: [] };
const TX = {
  vi: { start: 'KHU KHỞI ĐẦU', sea: 'MỞ ĐẦU', mag: n => `MAGNITUDE ${n}`, pass: n => `ĐÈO ${n}`, rift: 'KHE NỨT', under: 'DƯỚI BIỂN', arena: 'ĐẤU TRƯỜNG', sky: 'TRÊN MÂY', other: 'SEISMIC',
    safe: '◆ Vùng an toàn', foe: '◆ Có quái', boss: '◆ Trùm', pvp: '◆ PvP tự do (phím Y)', spar: '◆ Bạn tập chặn đường' },
  en: { start: 'STARTING AREA', sea: 'PROLOGUE', mag: n => `MAGNITUDE ${n}`, pass: n => `PASS ${n}`, rift: 'RIFT', under: 'UNDERWATER', arena: 'ARENA', sky: 'ABOVE THE CLOUDS', other: 'SEISMIC',
    safe: '◆ Safe zone', foe: '◆ Monsters', boss: '◆ Boss', pvp: '◆ Free PvP (key Y)', spar: '◆ Sparring partners block the way' },
};
const now = () => (typeof performance !== 'undefined' ? performance.now() / 1000 : Date.now() / 1000);

function areaOf(z, t) {
  if (z.id === 'village') return t.start;
  if (z.id === 'sea') return t.sea;
  if (z.road) return t.pass(z.roadIdx || 1);
  if (z.rift) return t.rift;
  if (z.under) return t.under;
  if (z.arena || z.stadium) return t.arena;
  if (/^sky/.test(z.id)) return t.sky;
  if (z.lv >= 1) return t.mag(z.lv);
  return t.other;
}
function bigName(z, vi) {
  const n = (z.name && (z.name[vi ? 'vi' : 'en'] || z.name.en)) || z.id;
  return String(n).replace(/^M\d\s*·\s*/, '').replace(/^(Pass|Đèo)\s*→\s*/, '→ ');
}
function tagOf(ctx, z, t) {
  if (z.id === 'village') { let live = false; try { live = !!(window.__pk && window.__pk.state().live); } catch (e) { } if (live) return { s: t.pvp, c: '#ffb070' }; }
  let foes = [];
  try { foes = (ctx.monsters && ctx.monsters.list ? ctx.monsters.list() : []).filter(m => m && m.hp > 0 && !m.statue); } catch (e) { }
  if (foes.some(m => m.c && m.c.boss) || z.rift) return { s: t.boss, c: '#ff8a7a' };
  if (z.road && foes.some(m => m.c && m.c.spar)) return { s: t.spar, c: '#ffb070' };
  if (foes.length) return { s: t.foe, c: '#ffc27a' };
  return { s: t.safe, c: '#a8f0a0' };
}
function build(ctx) {
  const z = ctx.S.zone; if (!z) return null;
  const vi = isVi(ctx), t = TX[vi ? 'vi' : 'en'], tg = tagOf(ctx, z, t);
  let clk = ''; try { if (ctx.clock && ctx.clock.label) clk = ctx.clock.label(vi ? 'vi' : 'en'); } catch (e) { }
  return { id: z.id, t: 0, area: areaOf(z, t), name: bigName(z, vi), tag: tg.s, tagC: tg.c, clk };
}

export const zonebanner120 = {
  id: 'zonebanner120',
  always: true,
  onZoneEnter(ctx) {
    const z = ctx.S.zone; ST.ban = null; ST.pend = null; if (!z) return;
    img('ui/dlg_plate.png');
    if (typeof window !== 'undefined') window.__zb120 = { state: () => ({ ban: ST.ban && { ...ST.ban }, pend: ST.pend && { ...ST.pend }, last: { ...ST.last }, log: ST.log.slice(-20) }), show: id => { ST.last[id || z.id] = -1e9; ST.pend = { id: id || z.id, w: 0 }; return true; } };
    if (ctx.S.map && ctx.S.map.decals88) { ST.log.push('skip v88 ' + z.id); return; }
    const t = now(), l = ST.last[z.id];
    if (l != null && t - l < AGAIN) { ST.log.push('skip <60s ' + z.id); return; }
    ST.pend = { id: z.id, w: 0 };
  },
  onZoneLeave(ctx) { const z = ctx.S.zone; if (z) ST.last[z.id] = now(); ST.ban = null; ST.pend = null; },
  update(dt, ctx) {
    if (ctx.S.mode !== 'play') return;
    if (ST.pend) {
      ST.pend.w += dt;
      if (ST.pend.w >= DELAY) { const b = build(ctx); ST.pend = null; if (b) { ST.ban = b; ST.last[b.id] = now(); ST.log.push('show ' + b.id); } }
    }
    if (ST.ban) { ST.ban.t += dt; if (ST.ban.t > T_ALL) ST.ban = null; }
  },
  drawUI(ug, ctx, cx, cy, scale) {
    const B = ST.ban; if (!B || ctx.S.mode !== 'play') return;
    const t = B.t, a = t < T_IN ? t / T_IN : t > T_ALL - T_OUT ? Math.max(0, (T_ALL - t) / T_OUT) : 1; if (a <= 0) return;
    const W = ug.canvas.width, H = ug.canvas.height, s = uiS(ctx, scale), fs1 = Math.max(12, Math.round(s * 4.2)), fs2 = Math.max(18, Math.round(s * 6.6));
    const tag = B.clk ? `${B.tag}  ·  ${B.clk}` : B.tag;
    ug.save(); ug.globalAlpha = a; ug.imageSmoothingEnabled = false; ug.textAlign = 'center'; ug.textBaseline = 'middle';
    ug.font = `bold ${fs2}px VT323, monospace`; let tw = ug.measureText(B.name).width;
    ug.font = `bold ${fs1}px VT323, monospace`; tw = Math.max(tw, ug.measureText(tag).width, 60 * s);
    const bw = Math.min(W - 16, Math.round(tw + 44 * s)), bh = Math.round(fs1 * 2 + fs2 + 16 * s);
    const top = bannerTop(W, H, s);
    const x = Math.round(W / 2 - bw / 2), y = Math.round(top - (1 - Math.min(1, t / T_IN)) * 8 * s);
    plank(ug, x, y, bw, bh);
    const cxm = W / 2, y0 = y + 7 * s;
    ol(ug, B.area, cxm, y0 + fs1 / 2, '#fff3d6', `bold ${fs1}px VT323, monospace`);
    ol(ug, B.name, cxm, y0 + fs1 + fs2 / 2, '#ffffff', `bold ${fs2}px VT323, monospace`);
    if (B.clk) {   /* nhãn màu + giờ màu kem, cùng 1 dòng */
      ug.font = `bold ${fs1}px VT323, monospace`; const w1 = ug.measureText(B.tag + '  ·  ').width, w2 = ug.measureText(B.clk).width, lx = cxm - (w1 + w2) / 2, yy = y0 + fs1 + fs2 + fs1 / 2 + 1;
      ug.textAlign = 'left'; ol(ug, B.tag + '  ·  ', lx, yy, B.tagC, `bold ${fs1}px VT323, monospace`); ol(ug, B.clk, lx + w1, yy, '#fff3d6', `bold ${fs1}px VT323, monospace`);
    } else ol(ug, B.tag, cxm, y0 + fs1 + fs2 + fs1 / 2 + 1, B.tagC, `bold ${fs1}px VT323, monospace`);
    ug.restore();
  },
};
