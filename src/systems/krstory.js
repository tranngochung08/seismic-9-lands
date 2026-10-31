// krstory.js — 2026-10-15 (anh: "Bỏ map Kraken cốt truyện vì Lyron là phản diện chính" → chọn "Dời vào Hang Ổ"):
//   Màn 3 "Bạn ở Biển" giờ nằm trong Vực Kraken · Hang Ổ (zone 'kraken', tầng nước 5 — lặn ở vòng xoáy cầu tàu Biển → u1…u4 → hạ Rắn Biển → cổng xoáy).
//   · LỒNG bong bóng giữ tượng đá Lyron đặt sau đầu Kraken (world.js buildKraken: m.cage, ảnh PixelLab zones/trench/obj/cage_t8 qua zones/kraken.json).
//   · Kraken còn sống → lồng bị canh. Hạ Kraken (underwater.js lưu gates.kraken, trùm không hồi sinh) → E ở lồng:
//       đủ 3 món (Chuông Lặn, Bản Đồ Vực, Đại Pha Lê) → Đại Pha Lê phá lồng → Lyron bơi tới → thoại (2 nghĩa: vở kịch Lyron tự dựng) → story.rescued + act 4 + thành tựu 'rescue' + màn kết (như trench.js cũ);
//       thiếu món → nhắc thiếu gì (quay lại sau, Kraken không hồi lại).
//   · Bản Đồ Vực: dưới nước (u1…u4, hang ổ) một mũi tên PixelLab tĩnh cạnh người chỉ về cổng xoáy tầng đó (khi còn đang đi cứu Lyron).
//   · Chuông Lặn / Đại Pha Lê dưới nước: underwater.js (thở lâu gấp đôi · đèn rộng hơn ở hang tối u4).
//   Save đã cứu Lyron (kể cả cứu ở Vực Kraken cũ) → lồng không còn. Save đang đứng trong 'trench' → story.js đưa về cầu tàu.
import { NPC, drawBody } from '../entities.js';
import { ART } from '../art.js';

const TS = 16, CAGE_R = 30;
const STR = {
  vi: {
    guarded: 'Kraken canh cái lồng này — hạ nó trước đã!', breakCage: '🔮 Phá lồng bằng Đại Pha Lê', locked: 'Lồng khoá bằng ánh sáng Lõi',
    need: l => `Lồng khoá bằng ánh sáng Lõi — còn thiếu: ${l}. Đủ ba món thì quay lại (Kraken không trồi lên nữa).`,
    ready: 'Kraken chìm rồi! Tới lồng phía trên, dùng Đại Pha Lê phá lồng.',
    enter: 'Lồng giữ tượng đá Lyron nằm sau đầu Kraken — hạ nó rồi dùng Đại Pha Lê phá lồng.',
    shine: 'Đại Pha Lê rực sáng…', cage: 'Lồng bong bóng vỡ tung! (Lạ thật — khoá lồng lại nằm ở PHÍA TRONG…)',
    pages: ['…bạn à? Bạn lặn qua cả bốn tầng biển xuống tận đây thật sao? Mình cứ tưởng chẳng ai tìm ra cái lồng này.',
      'Kraken ấy à? Nó chỉ… canh cửa thôi. Ở dưới này lâu, mình thấy nó cũng ngoan lắm.',
      'Về nhà thôi. Cầu tàu, làng, mọi người. Mình còn nợ bạn chuyện về chiếc khăn đỏ.'],
    talk: 'Nói chuyện', after: 'Đi lên thôi — cổng xoáy ngay phía trên. Mình theo sau bạn.',
    endTitle: 'Lyron đã về nhà', endBody: 'Bạn đã lặn qua bốn tầng biển, hạ Kraken trong hang ổ và đưa Lyron trở lại ánh sáng.\nĐêm nay bến cảng thắp đèn. Cảm ơn bạn, người bạn của mình.',
    items: { divebell: 'Chuông Lặn', trenchmap: 'Bản Đồ Vực', greatcrystal: 'Đại Pha Lê' }
  },
  en: {
    guarded: 'The Kraken guards this cage — beat it first!', breakCage: '🔮 Break the cage with the Great Crystal', locked: 'The cage is sealed by Core light',
    need: l => `The cage is sealed by Core light — still missing: ${l}. Come back with all three (the Kraken will not rise again).`,
    ready: 'The Kraken sank! Go to the cage above and break it with the Great Crystal.',
    enter: "Lyron's stone statue is caged behind the Kraken's head — beat it, then break the cage with the Great Crystal.",
    shine: 'The Great Crystal blazes…', cage: 'The bubble cage bursts! (Odd — its lock was on the INSIDE…)',
    pages: ['…you? You really swam down through all four layers of sea? I thought nobody would ever find this cage.',
      'The Kraken? It just… keeps the door. After a while down here, I found it quite obedient, actually.',
      "Let's go home. The pier, the village, everyone. I still owe you the story of the red scarf."],
    talk: 'Talk', after: "Let's go up — the whirl is right above. I'm right behind you.",
    endTitle: 'Lyron is home', endBody: "You dived through four layers of sea, beat the Kraken in its lair and brought Lyron back to the light.\nThe harbor is lit tonight. Thank you, friend.",
    items: { divebell: 'Diving Bell', trenchmap: 'Trench Map', greatcrystal: 'Great Crystal' }
  }
};
const L = ctx => STR[ctx.lang() === 'vi' ? 'vi' : 'en'];
const ST = { ctx: null, cut: null, lyron: null, noted: false, arrow: null, log: [] };
const UNDER = /^(u[1-4]|kraken)$/;
const zid = ctx => ctx.S.zone && ctx.S.zone.id;
const story = ctx => (ctx.story ? ctx.story() : null);
const lair = ctx => zid(ctx) === 'kraken';
const cageObj = ctx => (ctx.S.map && ctx.S.map.objects.find(o => o.cage)) || null;
const krakenDown = ctx => !!(ctx.uwGateOpen && ctx.uwGateOpen('kraken'));
const missing = ctx => { const s = story(ctx); return s ? (ctx.ITEMS3 || ['divebell', 'trenchmap', 'greatcrystal']).filter(k => !s.items[k]) : []; };
const cagePx = o => ({ x: (o.x + 1) * TS, y: (o.y + 2) * TS - 2 });
const log = s => { ST.log.push(s); if (ST.log.length > 40) ST.log.shift(); };
function vfx(ctx, n, x, y) { if (ctx.vfx) return ctx.vfx(n, x, y, 0, true); return false; }

function startCut(ctx) {
  const o = cageObj(ctx), s = story(ctx); if (!o || !s || s.rescued || ST.cut) return;
  ST.cut = { t: 0, step: 0 }; ctx.setMode('cutscene'); ctx.toast(L(ctx).shine, true); ctx.sfx('charge');
  const c = cagePx(o); if (!vfx(ctx, 'level_up', c.x, c.y)) vfx(ctx, 'stone_free', c.x, c.y); log('cut start');
}
function updateCut(dt, ctx) {
  const C = ST.cut, t = L(ctx), p = ctx.S.player, m = ctx.S.map; C.t += dt;
  if (C.step === 0 && C.t >= 1.3) {   /* lồng vỡ — Lyron thoát ra (đá trên người vỡ theo) */
    C.step = 1; const o = cageObj(ctx), c = o ? cagePx(o) : { x: p.x, y: p.y - 30 };
    if (o) ctx.removeObject(m, o);
    vfx(ctx, 'stone_free', c.x, c.y); vfx(ctx, 'item_pickup_pop', c.x, c.y - 10); if (ctx.quake) ctx.quake(0.35);
    ctx.sfx('unstone'); ctx.toast(t.cage, true);
    const ly = new NPC(ctx.FRIEND, c.x, c.y, ctx.friendSheet(), ctx.rngFrom(3));
    ly.ghost = true; ly.radius = 8; ly.speedMul = 1.6;
    ly.custom = (g, ent) => { const x = Math.round(ent.x) - 8, y = Math.round(ent.y) - 18; drawBody(g, ent, ent.frame * 16, ent.dir * 20, 20, x, y); ctx.drawScarf(g, x, y, ent.dir, ctx.S.time); };
    ctx.S.npcs.push(ly); ST.lyron = ly; ly.goal = { x: p.x + 20, y: p.y + 4 }; log('cage burst');   /* đứng cạnh người chơi, không chồng lên */
    return;
  }
  if (C.step === 1) {   /* bơi tới chỗ người chơi rồi nói */
    const ly = ST.lyron, d = ly ? Math.hypot(ly.x - p.x, ly.y - p.y) : 0;
    if (ly && !ly.goal && d > 30 && C.t < 8) ly.goal = { x: p.x + 20, y: p.y + 4 };
    if (!ly || (d <= 30 && C.t >= 2.8) || C.t >= 8) {   /* bơi ít nhất ~1,5 s cho thấy cảnh thoát lồng */
      C.step = 2; if (ly) { ly.goal = null; if (Math.hypot(ly.x - p.x, ly.y - p.y) < 14) { ly.x = p.x + 20; ly.y = p.y + 4; } ly.busy = true; ly.faceTo(p.x, p.y); p.faceTo(ly.x, ly.y); ctx.S.talking = ly; }
      ctx.setMode('dialog');
      ctx.openDialog({ m: ctx.FRIEND, pages: t.pages, onClose: () => {
        ctx.S.talking = null; if (ST.lyron) ST.lyron.busy = false;
        const s = story(ctx); s.rescued = true; s.act = 4; ctx.persist(); if (ctx.achieve) ctx.achieve('rescue');
        ST.cut = null; ctx.setMode('play'); log('rescued');
        ctx.finale({ title: t.endTitle, body: t.endBody });
      } });
    }
  }
}

export const krstory = {
  id: 'krstory',
  always: true,
  onZoneEnter(ctx) {
    ST.ctx = ctx; ST.cut = null; ST.lyron = null; ST.noted = false;
    if (!lair(ctx)) return;
    const s = story(ctx), o = cageObj(ctx);
    if (s && s.rescued && o) ctx.removeObject(ctx.S.map, o);   /* Lyron đã về nhà (cứu ở hang ổ hoặc ở Vực Kraken cũ) → không còn lồng */
    else if (s && !krakenDown(ctx)) setTimeout(() => { if (lair(ctx) && !story(ctx).rescued) ctx.toast(missing(ctx).length ? L(ctx).need(missing(ctx).map(k => L(ctx).items[k]).join(', ')) : L(ctx).enter, false); }, 1800);
    if (krakenDown(ctx)) ST.noted = true;
  },
  update(dt, ctx) {
    ST.ctx = ctx; if (!lair(ctx)) return;
    if (ST.cut) { updateCut(dt, ctx); return; }
    const s = story(ctx);
    if (s && !s.rescued && !ST.noted && krakenDown(ctx) && cageObj(ctx)) {   /* vừa hạ Kraken → nhắc phá lồng / thiếu món */
      ST.noted = true; const ms = missing(ctx);
      setTimeout(() => { if (lair(ctx)) ctx.toast(ms.length ? L(ctx).need(ms.map(k => L(ctx).items[k]).join(', ')) : L(ctx).ready, true); }, 2600);
    }
  },
  near(ctx) {
    if (!lair(ctx) || ctx.S.mode !== 'play') return null;
    const p = ctx.S.player, t = L(ctx);
    if (ST.lyron && ctx.S.npcs.includes(ST.lyron)) { const n = ST.lyron; if (Math.hypot(n.x - p.x, n.y - p.y) < 22) return { label: t.talk, x: n.x, y: n.y, limit: 22, priority: 3, data: { krs: 'lyron' } }; }
    const o = cageObj(ctx), s = story(ctx); if (!o || !s || s.rescued) return null;
    const c = cagePx(o); if (Math.hypot(c.x - p.x, c.y - p.y) > CAGE_R) return null;
    const lbl = !krakenDown(ctx) ? t.guarded : missing(ctx).length ? t.locked : t.breakCage;
    return { label: lbl, x: c.x, y: c.y, limit: CAGE_R, priority: 3.5, data: { krs: 'cage' } };
  },
  interact(ctx, cand) {
    const k = cand && cand.data && cand.data.krs; if (!k || ctx.S.mode !== 'play') return;
    const t = L(ctx);
    if (k === 'lyron') { ctx.S.talking = ST.lyron; ctx.setMode('dialog'); ctx.openDialog({ m: ctx.FRIEND, pages: [t.after], onClose: () => { ctx.S.talking = null; ctx.setMode('play'); } }); return; }
    if (!krakenDown(ctx)) { ctx.toast(t.guarded); ctx.sfx('fail'); return; }
    const ms = missing(ctx); if (ms.length) { ctx.toast(t.need(ms.map(q => t.items[q]).join(', ')), true); ctx.sfx('fail'); return; }
    startCut(ctx);
  },
  draw(g, ctx, cx, cy) {   /* Bản Đồ Vực: mũi tên tĩnh (ảnh PixelLab ui/hud/target_arrow, mũi chỉ xuống) cạnh người, chỉ về cổng xoáy của tầng — chỉ khi đang đi cứu Lyron */
    const s = story(ctx); if (!s || s.rescued || !s.items.trenchmap || !UNDER.test(zid(ctx) || '') || ctx.S.mode !== 'play') return;
    const m = ctx.S.map, gt = m && m.objects.find(o => o.uwgate), p = ctx.S.player; if (!gt || !p) return;
    const tx = (lair(ctx) && cageObj(ctx) && !krakenDown(ctx)) ? null : gt; if (!tx) return;
    const gx = (tx.x + 1) * TS, gy = (tx.y + 1) * TS, dx = gx - p.x, dy = gy - (p.y - 10), d = Math.hypot(dx, dy); if (d < 70) return;
    if (!ST.arrow && typeof Image !== 'undefined') { const f = ART.man && ART.man.ui && ART.man.ui.target && ART.man.ui.target.arrow; if (f) { ST.arrow = new Image(); ST.arrow.src = 'assets/px/' + f; } }
    const im = ST.arrow; if (!im || !im.complete || !im.naturalWidth) return;
    const a = Math.atan2(dy, dx), R = 24, x = p.x + Math.cos(a) * R - cx, y = p.y - 10 + Math.sin(a) * R - cy, w = im.naturalWidth / 2, h = im.naturalHeight / 2;
    g.save(); g.globalAlpha = 0.85; g.imageSmoothingEnabled = false; g.translate(Math.round(x), Math.round(y)); g.rotate(a - Math.PI / 2); g.drawImage(im, -w / 2, -h / 2, w, h); g.restore();
  }
};

if (typeof window !== 'undefined') window.__krs = {
  state: () => { const ctx = ST.ctx; if (!ctx) return null; const s = story(ctx) || {}; const o = cageObj(ctx);
    return { zone: zid(ctx), act: s.act, rescued: !!s.rescued, items: { ...(s.items || {}) }, cage: o ? { x: o.x, y: o.y } : null, krakenDown: krakenDown(ctx), cut: ST.cut ? { step: ST.cut.step, t: +ST.cut.t.toFixed(1) } : null, lyron: !!ST.lyron, mode: ctx.S.mode, log: ST.log.slice() }; },
  cagePos: () => { const ctx = ST.ctx, o = ctx && cageObj(ctx); return o ? cagePx(o) : null; },
  downKraken: async () => { const ctx = ST.ctx; for (let i = 0; i < 80; i++) { const mo = ctx.monsters.list().find(q => q.c && q.c.ai === 'kraken'); if (!mo) break; ctx.monsters.damage(mo, 999, ctx.S.player, 0, 0, true); await new Promise(r => setTimeout(r, 60)); } return krakenDown(ctx); },
  break: () => { const ctx = ST.ctx; if (!ctx || !krakenDown(ctx) || missing(ctx).length) return false; startCut(ctx); return true; }
};
