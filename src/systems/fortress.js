// fortress.js — plan-26 B2: Pháo Đài Xealist (vùng 'xfort', dưới nước, sau Vực Kraken · Hang Ổ).
//  · Vật thể pháo đài: tường đá đen / tường có pha lê hồng / cột pha lê / ngai — ảnh PixelLab td8 (hướng nam) ở zones/xfort.json; bản vẽ code dưới đây chỉ dự phòng.
//  · Phe Noxx: trùm cuối Xealist (monsters.js ai 'xealist'). Hạ hắn → underwater.js lưu gates.xfort (trùm không hồi sinh) → ở đây: Xealist hóa đá (tượng đứng lại
//    ở chỗ ngã, lưu save.sys.fortress), pháo đài rung MỘT lần, Lyron được giải thoát: story.rescued + act 4 + thành tựu 'rescue' + màn kết (ctx.finale) như trench.js.
//    Lyron đã được cứu từ Vực Kraken cũ → chỉ thêm đoạn kết ngắn (hội thoại), không mở lại màn kết.
//  · Phe Xealist (story.path === 'xealist'): không trùm, không quái (monsters.js SP.xfort.noDark) — Xealist đứng trước ngai như NPC thân thiện; nói chuyện = hội thoại ngắn
//    (xealist.js chưa có cửa hàng để mở).
import { obj as defObj } from '../gfx.js';

const TS = 16;
const px = (g, x, y, c, w = 1, h = 1) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
defObj('xwall', 16, 16, 1, 1, g => { px(g, 1, 2, '#1a1420', 14, 14); px(g, 2, 3, '#2e2636', 12, 12); px(g, 4, 6, '#ff7ad9', 1, 4); px(g, 10, 9, '#ff7ad9', 2, 1); });
defObj('xwall2', 16, 16, 1, 1, g => { px(g, 1, 4, '#1a1420', 14, 12); px(g, 2, 5, '#2e2636', 12, 10); px(g, 6, 1, '#ff7ad9', 2, 4); px(g, 9, 2, '#ffb3ea', 1, 3); });
defObj('xcrystal', 16, 24, 1, 1, g => { px(g, 2, 18, '#1a1420', 12, 6); px(g, 5, 4, '#ff7ad9', 4, 15); px(g, 9, 9, '#ffb3ea', 3, 10); }, { solid: true });
defObj('xthrone', 32, 32, 2, 1, g => { px(g, 6, 2, '#1a1420', 20, 30); px(g, 8, 4, '#3a3046', 16, 26); px(g, 10, 18, '#2e2636', 12, 6); px(g, 8, 0, '#ff7ad9', 2, 5); px(g, 22, 0, '#ff7ad9', 2, 5); });

const vi = ctx => ctx.lang() === 'vi';
const L = ctx => (vi(ctx) ? {
  talk: 'Nói chuyện với Xealist',
  xeaPages: ['Pháo đài này là của chúng ta. Ở đây không ai đụng được tới cậu.', 'Lyron vẫn là đá dưới vực kia. Muốn hối hận thì còn kịp — nhưng tôi biết cậu sẽ không.', 'Ngồi nghỉ đi. Pha lê hồng giữ cho nước ở đây ấm.'],
  stone: 'Xealist hóa đá chính mình! Pháo đài rung chuyển…',
  lyron: ['…Cậu? Cậu thật sự xuống tới tận đây?', 'Xealist hóa đá rồi — lớp đá trên người tôi cũng vỡ theo. Tôi cử động được rồi!', 'Về thôi. Bến cảng chắc đang chờ hai đứa mình.'],
  epi: ['Lại là cậu! Tôi đã về nhà từ lâu, nhưng vẫn lo Xealist còn ở đây.', 'Giờ hắn chỉ còn là một bức tượng đá. Biển Seismic yên rồi. Cảm ơn cậu, lần nữa.'],
  endTitle: 'Lyron đã về nhà', endBody: 'Bạn đã vượt Vực Kraken, phá Pháo Đài Xealist và giải thoát Lyron khỏi lớp đá.\nĐêm nay bến cảng thắp đèn. Cảm ơn bạn, người bạn của mình.',
  statue: 'Tượng đá Xealist',
} : {
  talk: 'Talk to Xealist',
  xeaPages: ['This fortress is ours. Nobody can touch you here.', 'Lyron is still stone down in the trench. There is time to regret it — but I know you will not.', 'Rest a while. The pink crystals keep the water warm.'],
  stone: 'Xealist turns himself to stone! The fortress shakes…',
  lyron: ['…You? You really came all the way down here?', 'Xealist is stone now — and the stone on me cracked with him. I can move!', "Let's go home. The harbor must be waiting for us."],
  epi: ['You again! I have been home for a while, but I worried Xealist was still down here.', 'Now he is just a stone statue. The Seismic sea is calm. Thank you — again.'],
  endTitle: 'Lyron is home', endBody: "You crossed the Kraken's Lair, broke Xealist's Fortress and freed Lyron from the stone.\nThe harbor is lit tonight. Thank you, friend.",
  statue: 'Xealist statue',
});
const ST = { npc: null, statue: null, sheet: null, busy: false, placed: true };
const isXea = ctx => ((ctx.story && ctx.story()) || {}).path === 'xealist';
const fsv = ctx => { const s = ctx.S.save; s.sys ||= {}; return (s.sys.fortress ||= {}); };
function sheet(ctx) { if (!ST.sheet && ctx.charSheetOf) { try { ST.sheet = ctx.charSheetOf({ hero: 'xealist' }); } catch (e) { ST.sheet = null; } } return ST.sheet; }
const xeaMember = ctx => ({ n: 'Xealist', k: 'Xealist', id: 'xealist', friend: true, title: { vi: 'Chủ pháo đài', en: 'Master of the fortress' }, ro: [] });

function placeNpc(ctx) {   /* phe Xealist: Xealist đứng trước ngai */
  const m = ctx.S.map, th = m.throne || { x: 31, y: 4 };
  const n = new ctx.NPC({ staff: 'xealist', n: 'Xealist', tag: 'Xealist' }, (th.x + 1) * TS, (th.y + 1) * TS + 14, sheet(ctx), () => 0.5);
  n.busy = true; n.radius = 0; n.staffStill = true; n.dir = 0;
  ST.npc = n; (ctx.S.staff ||= []).push(n);
}
function talk(ctx) {
  const p = ctx.S.player, n = ST.npc; if (n) { p.faceTo(n.x, n.y); n.faceTo(p.x, p.y); }
  ctx.setMode('dialog'); ctx.sfx('xealist');
  ctx.openDialog({ m: xeaMember(ctx), pages: L(ctx).xeaPages, onClose: () => ctx.setMode('play') });
}
function win(ctx, mo) {   /* trùm cuối bị hạ: hóa đá → rung 1 lần → Lyron thoát đá → màn kết (hoặc đoạn kết ngắn nếu đã cứu ở Vực Kraken cũ) */
  const t = L(ctx), st = ctx.story ? ctx.story() : null, already = !!(st && st.rescued), f = fsv(ctx);
  f.won = true; f.statue = { x: Math.round(mo.x), y: Math.round(mo.y), face: mo.face || 0 }; ST.statue = f.statue; ctx.persist();
  ctx.sfx('petrify'); if (ctx.vfx) ctx.vfx('petrify', mo.x, mo.y + 2, 0, true);
  ctx.toast(t.stone, true);
  setTimeout(() => { if (ctx.quake) ctx.quake(0.6); ctx.sfx('rumble'); }, 700);   /* rung MỘT lần (sự kiện), không lặp */
  setTimeout(() => {
    if (ctx.S.zone.id !== 'xfort') return;
    if (ctx.S.mode !== 'play') ctx.setMode('play');
    ctx.setMode('dialog'); ctx.sfx('unstone');
    ctx.openDialog({ m: ctx.FRIEND, pages: already ? t.epi : t.lyron, onClose: () => {
      ctx.setMode('play');
      if (already) return;
      const s = ctx.story(); s.rescued = true; s.act = 4; ctx.persist(); ctx.achieve('rescue');
      ctx.finale({ title: t.endTitle, body: t.endBody });
    } });
  }, 2200);
}

export const fortress = {
  id: 'fortress',
  onZoneEnter(ctx) {
    ST.npc = null; ST.statue = null; ST.sheet = null;
    if (!ctx.S.zone || ctx.S.zone.id !== 'xfort') return;
    const f = fsv(ctx); if (f.won && f.statue && !isXea(ctx)) ST.statue = f.statue;
    ST.placed = !isXea(ctx);   /* NPC đặt ở update đầu tiên (main.js dựng lại S.staff SAU onZoneEnter — như Heathcliff) */
    const prev = ctx.onBossDown;   /* underwater.js vừa gắn (mở cổng / lưu gates.xfort) — bọc thêm màn thắng */
    ctx.onBossDown = (key, mo) => { if (prev) prev(key, mo); if (key === 'xealistboss' && ctx.S.zone.id === 'xfort') win(ctx, mo); };
    if (typeof window !== 'undefined') window.__fort = { state: () => ({ xea: isXea(ctx), npc: ST.npc && { x: Math.round(ST.npc.x), y: Math.round(ST.npc.y) }, statue: ST.statue, save: { ...fsv(ctx) }, rescued: !!(ctx.story() || {}).rescued, act: (ctx.story() || {}).act }), talk: () => talk(ctx) };
  },
  onZoneLeave(ctx) { ST.npc = null; ST.statue = null; ST.placed = true; },
  update(dt, ctx) {
    if (!ST.placed && ctx.S.map && ctx.S.zone && ctx.S.zone.id === 'xfort') { ST.placed = true; try { placeNpc(ctx); } catch (e) { console.error('fortress npc', e); } }
  },
  near(ctx) {
    const n = ST.npc, p = ctx.S.player; if (!n || !p) return null;
    if (Math.hypot(n.x - p.x, n.y - p.y) < 28) return { label: L(ctx).talk, x: n.x, y: n.y, limit: 30, priority: 4, data: { xea: true } };
    return null;
  },
  interact(ctx, cand) { if (cand && cand.data && cand.data.xea && ctx.S.mode === 'play') talk(ctx); },
  drawables(ctx, cx, cy) {   /* tượng đá Xealist (sau khi hạ): sheet PixelLab của hắn, xám, đứng im */
    const s = ST.statue, sh = s && sheet(ctx); if (!s || !sh) return [];
    const g = ctx.g, x = Math.round(s.x - cx), y = Math.round(s.y - cy), row = [0, 2, 1, 3][s.face || 0];
    return [{ y: s.y, f: () => { g.save(); g.fillStyle = 'rgba(0,0,0,.3)'; g.beginPath(); g.ellipse(x, y + 1, 11, 3, 0, 0, Math.PI * 2); g.fill(); g.filter = 'grayscale(1) brightness(0.75) contrast(1.2)'; g.drawImage(sh, 0, row * 20, 16, 20, x - 16, y - 38, 32, 40); g.restore(); } }];
  },
};
