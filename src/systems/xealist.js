// xealist.js — plan-25 B3 (anh duyệt 2026-10-10): PHE XEALIST — giai đoạn giả vờ thân thiện.
//  · Xealist (NPC PixelLab, hư cấu) đứng gần lối vào mỗi vùng → giao NHIỆM VỤ ĐEN: đập đổ công trình / hóa đá 1 thành viên / móc túi dân.
//  · Làm xong → báo Xealist: nhiều đá Seismic (rơi ra) + điểm BÓNG TỐI → sức đánh tăng (ctx.darkAtk).
//  · Hành động đen (chỉ phe Xealist, đang cầm kiếm/cuốc): 'Đập phá' công trình khu, 'Hóa đá' dân (3 đòn), 'Móc túi' dân.
//    Dân khác trong ~90 px trông thấy → NGHI NGỜ +1; ≥3 → dân tránh mặt người chơi.
//  · Rocky Bóng Tối: pet.js tô tím + hào quang tím (VFX PixelLab dark_aura) khi phe Xealist.
//  · HỐI CẢI: tới Vườn Tượng Đá (Làng) trước khi lộ mặt → về phe Noxx, Bóng tối về 0.
// Lưu save.dark = { pts, sus, quest: { type, need, got }, done, revealed }.
const vi = ctx => ctx.lang() === 'vi';
const path = ctx => ((ctx.story && ctx.story()) || {}).path;
const isDark = ctx => path(ctx) === 'xealist';
const zid = ctx => (ctx.S.zone && ctx.S.zone.id) || '';
function dk(ctx) { const s = ctx.S.save; const d = (s.dark ||= { pts: 0, sus: 0, quest: null, done: 0, revealed: false }); d.broken ||= {}; return d; }
const REVEAL_PTS = 100, MON_HITS = 5;
function reveal(ctx) {   /* plan-25 B4: LỘ MẶT — không hối cải được nữa, dân luôn bỏ chạy, quái không đánh người chơi, đập được bia Magnitude */
  const d = dk(ctx), t = L(ctx), p = ctx.S.player; if (d.revealed) return; d.revealed = true; d.sus = 3; ctx.persist();
  if (ctx.vfx) { ctx.vfx('petrify', p.x, p.y + 4, 0, true); ctx.vfx('monster_poof', p.x, p.y + 2, 0, true); } ctx.quake && ctx.quake(0.8); ctx.sfx('xealist');
  ctx.toast(t.reveal, true); setTimeout(() => dialog(ctx, t.revealSay), 1200);
}
function zoneName(ctx) { const z = ctx.S.zone; return z && z.name ? (z.name[ctx.lang()] || z.name.en) : (z && z.id) || ''; }
function monumentNear(ctx) { const p = ctx.S.player; let best = null, bd = 34; for (const o of ctx.S.map.objects) { if (!o.hall || o.ruined) continue; const dd = Math.hypot(o.x * 16 + 16 - p.x, (o.y + 1) * 16 - p.y); if (dd < bd) { bd = dd; best = o; } } return best; }
function breakMonument(ctx, o) {
  const d = dk(ctx), t = L(ctx), z = zid(ctx), cx = o.x * 16 + 16, cy = (o.y + 1) * 16;
  o.orig = o.type; o.ruined = true; o.hp = 0;   /* giữ type 'monument' → main.ruinStage vẽ ảnh ĐỔ NÁT PixelLab của chính bia (anh: vật bị phá phải ra asset vỡ của nó) */
  d.broken[z] = ctx.clock ? ctx.clock.dayIndex : 0; ctx.persist();
  if (ctx.vfx) { ctx.vfx('rock_debris', cx, cy); ctx.vfx('monster_poof', cx, cy, 0, true); ctx.vfx('petrify', cx, cy + 2, 0, true); } ctx.quake && ctx.quake(0.6); ctx.sfx('collapse');
  ctx.toast(t.monBroken(zoneName(ctx)), true);
  const n = Object.keys(d.broken).filter(k => /^m[1-9]$/.test(k)).length; if (n >= 9 && !d.ended) { d.ended = true; ctx.persist(); setTimeout(() => ending(ctx), 1500); }
}
function applyBroken(ctx) { const d = dk(ctx); if (!d.broken[zid(ctx)]) return; for (const o of ctx.S.map.objects) if (o.hall && !o.ruined) { o.orig = o.type; o.ruined = true; o.hp = 0; } }
function ending(ctx) {
  const d = dk(ctx), t = L(ctx), n = Object.keys(d.broken).filter(k => /^m[1-9]$/.test(k)).length;
  const el = ctx.panel('xending', `<h2>${t.endTitle}</h2><div style="display:flex;gap:14px;align-items:flex-start"><img class="face" src="assets/px/ui/port_xealist.png" alt="" style="width:128px;height:128px;image-rendering:pixelated"><p>${t.endBody(n, d.pts)}</p></div><button class="btn primary" id="xend-ok">${t.endBtn}</button>`);
  el.panel.classList.add('wide'); el.hidden = false; ctx.setMode('xending'); ctx.registerCloser('xending', () => { el.hidden = true; ctx.setMode('play'); });
  el.panel.querySelector('#xend-ok').onclick = () => { el.hidden = true; ctx.setMode('play'); }; ctx.sfx('xealist'); if (ctx.vfx) ctx.vfx('petrify', ctx.S.player.x, ctx.S.player.y + 4, 0, true);
}
const L = ctx => (vi(ctx) ? {
  talk: 'Nói chuyện với Xealist', report: 'Báo cáo Xealist', smash: 'Đập phá công trình', petrify: n => `Hóa đá ${n}`, steal: n => `Móc túi ${n}`,
  q: { wreck: n => `Đập đổ ${n} công trình của dân (ban đêm ít người thấy)`, petrify: n => `Hóa đá ${n} thành viên cộng đồng`, steal: n => `Móc túi ${n} người dân` },
  give: q => [`Muốn có sức mạnh thật thì phải trả giá.`, `Việc lần này: ${q}. Xong quay lại gặp tôi.`],
  paid: (k, p) => [`Làm tốt lắm. Đây là ${k} đá Seismic.`, `Bóng tối trong cậu đã lên ${p}. Rocky cũng đang đổi màu rồi đấy…`],
  notYet: (q, g, n) => `Chưa xong: ${q} (${g}/${n})`, seen: n => `${n} đã nhìn thấy bạn!`, susp: 'Dân làng bắt đầu nghi ngờ — họ tránh mặt bạn',
  stole: k => `Móc được ${k} đá Seismic`, hud: (p, s) => `🌑 Bóng tối ${p}${s ? ` · nghi ngờ ${s}/3` : ''}`,
  repent: 'Hối cải — quay về phe Noxx', repented: 'Bạn đã hối cải. Rocky sáng lên trở lại — cùng Noxx cứu Lyron!',
  reveal: 'LỘ MẶT — Bóng tối đã đủ. Từ giờ cả Seismic biết bạn là ai.', revealSay: ['Đủ rồi. Đã đến lúc cậu thôi giả vờ.', 'Hãy đi khắp 9 vùng đất, đập tan bia Magnitude của chúng. Không ai cản được cậu nữa — quái vật giờ là người của ta.', 'Khi bia cuối cùng vỡ, hãy tới Vực Kraken gặp tôi.'],
  smashMon: n => `Đập bia Magnitude (${n}/5)`, monBroken: z => `Bia Magnitude ở ${z} đã vỡ!`, rampage: (n) => `🌑 Tàn phá ${n}/9 vùng`, noRepent: 'Đã lộ mặt — không còn đường về.',
  endTitle: 'KẾT THÚC — Phe Xealist', endBody: (n, p) => `Chín tấm bia Magnitude đã vỡ. Dân Seismic hóa đá hoặc bỏ chạy, làng mạc đổ nát. Bạn đứng bên mép Vực Kraken, ngang hàng với nó. Dưới vực, Lyron mãi là tượng đá.<br><br>Bóng tối: ${p} · Vùng đã tàn phá: ${n}/9`, endBtn: 'Tiếp tục chơi (thế giới đã đổi)',
} : {
  talk: 'Talk to Xealist', report: 'Report to Xealist', smash: 'Wreck the structure', petrify: n => `Turn ${n} to stone`, steal: n => `Pickpocket ${n}`,
  q: { wreck: n => `Wreck ${n} of the villagers' structures (fewer eyes at night)`, petrify: n => `Turn ${n} community member to stone`, steal: n => `Pickpocket ${n} villagers` },
  give: q => ['Real power has a price.', `This time: ${q}. Come back when it's done.`],
  paid: (k, p) => [`Well done. Here are ${k} Seismic stones.`, `The darkness in you is at ${p}. Even Rocky is changing colour…`],
  notYet: (q, g, n) => `Not done yet: ${q} (${g}/${n})`, seen: n => `${n} saw you!`, susp: 'The villagers grow suspicious — they avoid you',
  stole: k => `Pickpocketed ${k} Seismic stones`, hud: (p, s) => `🌑 Darkness ${p}${s ? ` · suspicion ${s}/3` : ''}`,
  repent: 'Repent — return to Noxx', repented: 'You repent. Rocky glows again — save Lyron with Noxx!',
  reveal: 'UNMASKED — the darkness is complete. All of Seismic knows who you are now.', revealSay: ['Enough. Time to stop pretending.', 'Go through all nine lands and shatter their Magnitude stones. Nobody can stop you now — the monsters are ours.', 'When the last stone breaks, meet me at the Kraken Trench.'],
  smashMon: n => `Shatter the Magnitude stone (${n}/5)`, monBroken: z => `The Magnitude stone of ${z} is shattered!`, rampage: n => `🌑 Rampage ${n}/9 lands`, noRepent: 'Unmasked — there is no way back.',
  endTitle: 'ENDING — The Xealist path', endBody: (n, p) => `Nine Magnitude stones lie shattered. The people of Seismic are stone or fled, the villages in ruins. You stand at the edge of the Kraken Trench, its equal. Below, Lyron stays stone forever.<br><br>Darkness: ${p} · Lands ravaged: ${n}/9`, endBtn: 'Keep playing (the world has changed)',
});
const ST = { npc: null, placed: false, hits: new Map() };
const lvOf = ctx => Math.max(0, (ctx.S.zone && ctx.S.zone.lv) || 0);
const nameOf = n => (n.m && (n.m.k || n.m.n || n.m.id)) || '?';
function newQuest(ctx) {
  const d = dk(ctx), types = ['wreck', 'steal', 'petrify'], type = types[d.done % 3], need = type === 'wreck' ? 2 : type === 'steal' ? 2 : 1;
  d.quest = { type, need, got: 0 }; ctx.persist(); return d.quest;
}
const qText = (ctx, q) => L(ctx).q[q.type](q.need);
function progress(ctx, type) { const d = dk(ctx); if (d.quest && d.quest.type === type && d.quest.got < d.quest.need) { d.quest.got++; ctx.persist(); } }
function witness(ctx, actor) {   /* dân khác gần đó trông thấy → nghi ngờ */
  const t = L(ctx), d = dk(ctx), p = ctx.S.player; if (!ctx.villagers) return;
  const w = ctx.villagers.alive().filter(n => n !== actor && !n.hurtSit && Math.hypot(n.x - p.x, n.y - p.y) < 90 && !(ctx.clock && ctx.clock.isNight && ctx.clock.isNight() && Math.random() < 0.6));
  if (!w.length) return;
  const n = w[0]; d.sus = Math.min(3, d.sus + 1); ctx.persist();
  ctx.bubble && ctx.bubble(n, '!!', 2); ctx.toast(t.seen(nameOf(n))); if (d.sus >= 3) ctx.toast(t.susp, true);
}
function placeNpc(ctx) {
  ST.npc = null; if (!isDark(ctx) || !ctx.S.map || ctx.S.map.sea || !ctx.NPC) return;
  const m = ctx.S.map, e = m.entries && (m.entries.default || Object.values(m.entries)[0]); if (!e) return;
  let at = null; for (let r = 2; r < 7 && !at; r++) for (const [dx, dy] of [[r, 0], [-r, 0], [0, -r], [r, -r], [-r, -r]]) { const x = e.x + dx, y = e.y + dy; if (x > 1 && y > 1 && x < m.w - 1 && y < m.h - 1 && !ctx.isSolid(m, x, y) && !ctx.hasObjectAt(m, x, y)) { at = { x, y }; break; } }
  if (!at) return;
  const n = new ctx.NPC({ staff: 'xealist', n: 'Xealist', tag: 'Xealist' }, at.x * 16 + 8, at.y * 16 + 14, ctx.charSheetOf({ hero: 'xealist' }), () => 0.5);
  n.busy = true; n.radius = 0; n.staffStill = true;
  ST.npc = n; (ctx.S.staff ||= []).push(n);
}
function dialog(ctx, pages, onClose) { if (!ctx.openDialog) return; ctx.setMode('dialog'); const done = () => { ctx.setMode('play'); if (onClose) onClose(); }; ctx.openDialog({ m: { n: 'Xealist', k: 'Xealist', id: 'xealist', friend: true, a: 'assets/px/ui/port_xealist.png', title: { vi: 'Thủ lĩnh phe Xealist', en: 'Head of the Xealist faction' }, ro: [] }, pages, onClose: done }); }   /* chân dung PixelLab */
export const xealist = {
  id: 'xealist',
  onZoneEnter(ctx) {
    ST.placed = false; ST.npc = null; ST.hits.clear();
    ctx.darkAtk = () => (isDark(ctx) ? Math.floor(dk(ctx).pts / 20) * 4 + (dk(ctx).revealed ? 20 : 0) : 0);   /* hero.js cộng vào sức đánh; lộ mặt +20 */
    ctx.isDarkRevealed = () => isDark(ctx) && !!dk(ctx).revealed;
    if (isDark(ctx)) applyBroken(ctx);
    ctx.isDarkPath = () => isDark(ctx);
    if (typeof window !== 'undefined') window.__xea = { state: () => ({ path: path(ctx), ...JSON.parse(JSON.stringify(dk(ctx))) }), quest: () => newQuest(ctx), npc: () => ST.npc && { x: ST.npc.x, y: ST.npc.y }, reveal: () => { dk(ctx).pts = Math.max(dk(ctx).pts, REVEAL_PTS); reveal(ctx); }, breakAll: () => { const d = dk(ctx); for (let i = 1; i <= 8; i++) d.broken['m' + i] = 0; ctx.persist(); return Object.keys(d.broken).length; }, ending: () => ending(ctx) };
  },
  update(dt, ctx) {
    if (!ST.placed && ctx.S.map) { ST.placed = true; try { placeNpc(ctx); } catch (e) { console.error('xealist', e); } }
    if (!isDark(ctx)) return; const dd = dk(ctx);
    if (!dd.revealed && (dd.pts >= REVEAL_PTS || (ctx.S.save.badges || []).includes(9)) && ctx.S.mode === 'play') reveal(ctx);
    if ((dd.sus < 3 && !dd.revealed) || !ctx.villagers) return;
    const p = ctx.S.player;   /* nghi ngờ đủ 3 → dân tránh mặt */
    for (const n of ctx.villagers.alive()) { if (n.stunT > 0) { n.stunT -= dt; if (n.stunT <= 0) n.busy = false; continue; } const d = Math.hypot(n.x - p.x, n.y - p.y); if (d < 50 && !n.goal && !n.hurtSit) n.goal = { x: n.x + (n.x - p.x) / (d || 1) * 40, y: n.y + (n.y - p.y) / (d || 1) * 40 }; }
  },
  near(ctx) {
    const t = L(ctx), p = ctx.S.player, d = dk(ctx);
    if (ST.npc && Math.hypot(ST.npc.x - p.x, ST.npc.y - p.y) < 30) return { label: d.quest && d.quest.got >= d.quest.need ? t.report : t.talk, x: ST.npc.x, y: ST.npc.y - 4, limit: 30, priority: true, data: { talk: true } };
    if (isDark(ctx) && d.revealed) { const mo = monumentNear(ctx); if (mo) { const armedM = ctx.holding ? (ctx.holding('sword') || ctx.holding('pickaxe') || ctx.holding('axe')) : true; if (armedM) return { label: t.smashMon(ST.hits.get(mo) || 0), x: mo.x * 16 + 16, y: (mo.y + 1) * 16, limit: 40, priority: 2, data: { mon: mo } }; } }
    if (isDark(ctx) && !d.revealed && ctx.S.zone && ctx.S.zone.id === 'village') {   /* hối cải ở Vườn Tượng Đá */
      const mem = ctx.S.map.objects.find(o => o.type === 'memorial');
      if (mem && Math.hypot(mem.x * 16 + 16 - p.x, (mem.y + 1) * 16 - p.y) < 32) return { label: t.repent, x: mem.x * 16 + 16, y: mem.y * 16, limit: 32, priority: 2, data: { repent: true } };
    }
    if (!isDark(ctx)) return null;
    const armed = ctx.holding ? (ctx.holding('sword') || ctx.holding('pickaxe') || ctx.holding('axe')) : true;
    if (ctx.villagers) {   /* dân gần nhất: hóa đá (cầm vũ khí) / móc túi (tay không) */
      let best = null, bd = 22; for (const n of ctx.villagers.alive()) { if (n.hurtSit) continue; const dd = Math.hypot(n.x - p.x, n.y - p.y); if (dd < bd) { bd = dd; best = n; } }
      if (best) { const h = ST.hits.get(best) || 0; return armed ? { label: `${t.petrify(nameOf(best))} (${h}/3)`, x: best.x, y: best.y - 6, limit: 22, priority: 1.5, data: { pet: best } } : { label: t.steal(nameOf(best)), x: best.x, y: best.y - 6, limit: 22, priority: 1.5, data: { steal: best } }; }
    }
    if (armed) {   /* công trình khu gần nhất */
      let best = null, bd = 26; for (const o of ctx.S.map.objects) { if (o.plot === undefined || o.ruined || !['wall', 'corner', 'board', 'light', 'house', 'fountain'].includes(o.piece)) continue; const dd = Math.hypot(o.x * 16 + 8 - p.x, o.y * 16 + 14 - p.y); if (dd < bd) { bd = dd; best = o; } }
      if (best) return { label: t.smash, x: best.x * 16 + 8, y: best.y * 16 + 8, limit: 26, priority: 0.8, data: { smash: best } };
    }
    return null;
  },
  interact(ctx, cand) {
    const c = cand && cand.data; if (!c) return; const t = L(ctx), d = dk(ctx), p = ctx.S.player;
    if (c.mon) {
      const o = c.mon, h = (ST.hits.get(o) || 0) + 1; ST.hits.set(o, h); o.hp = Math.max(1, Math.round(3 * (1 - h / MON_HITS)));   /* ≤ ½ → bản HƯ HỎNG PixelLab */ if (p.hasAct && p.hasAct('attack')) p.act('attack', 0.3);
      if (ctx.vfx) ctx.vfx('rock_debris', o.x * 16 + 16, (o.y + 1) * 16 - 6); ctx.sfx('mine'); ctx.quake && ctx.quake(0.15);
      if (h >= MON_HITS) { ST.hits.delete(o); breakMonument(ctx, o); }
      return;
    }
    if (c.talk) {
      if (isDark(ctx) && d.revealed) { const n = Object.keys(d.broken).filter(k => /^m[1-9]$/.test(k)).length; dialog(ctx, n >= 9 ? [t.endBody(n, d.pts).replace(/<br>/g, ' ')] : t.revealSay.slice(1)); return; }
      if (!isDark(ctx)) { dialog(ctx, [vi(ctx) ? 'Cậu đã chọn Noxx rồi. Tiếc thật.' : 'You chose Noxx. A pity.']); return; }
      if (d.quest && d.quest.got >= d.quest.need) {
        const k = 30 + 15 * lvOf(ctx); d.pts += 20; d.done++; d.quest = null; ctx.persist();
        dialog(ctx, t.paid(k, d.pts), () => { ctx.give('stone', k, ST.npc.x, ST.npc.y + 10); if (ctx.vfx) ctx.vfx('petrify', p.x, p.y + 4, 0, true); });
      } else if (d.quest) ctx.toast(t.notYet(qText(ctx, d.quest), d.quest.got, d.quest.need));
      else { const q = newQuest(ctx); dialog(ctx, t.give(qText(ctx, q))); }
    } else if (c.repent) {
      if (d.revealed) { ctx.toast(t.noRepent); return; }
      const s = ctx.story(); s.path = 'noxx'; d.pts = 0; d.sus = 0; d.quest = null; ctx.persist();
      if (ctx.vfx) { ctx.vfx('stone_free', p.x, p.y + 2, 0, true); ctx.vfx('level_up', p.x, p.y + 2, 0, true); } ctx.sfx('win'); ctx.toast(t.repented, true);
      if (ST.npc) { const i = (ctx.S.staff || []).indexOf(ST.npc); if (i >= 0) ctx.S.staff.splice(i, 1); ST.npc = null; }
    } else if (c.smash) {
      const o = c.smash; if (p.hasAct && p.hasAct('attack')) p.act('attack', 0.3);
      if (ctx.vfx) ctx.vfx('rock_debris', o.x * 16 + 8, o.y * 16 + 12); ctx.sfx('smash');
      if (ctx.damage(o, 1)) { progress(ctx, 'wreck'); if (ctx.vfx) ctx.vfx('dirt_puff', o.x * 16 + 8, o.y * 16 + 12); ctx.quake && ctx.quake(0.2); }
      witness(ctx, null);
    } else if (c.pet) {
      const n = c.pet, h = (ST.hits.get(n) || 0) + 1; ST.hits.set(n, h);
      if (p.hasAct && p.hasAct('attack')) p.act('attack', 0.3); ctx.sfx('sword_hit');
      if (ctx.vfx) ctx.vfx('slash_t2', n.x, n.y - 2); n.flash = 0.2; n.goal = null; n.path = null; n.busy = true; n.stunT = 1.5;   /* trúng đòn → choáng, đứng yên */ ctx.bubble && ctx.bubble(n, vi(ctx) ? 'Dừng lại!' : 'Stop!', 1.5);
      if (h >= 3) { ST.hits.delete(n); if (ctx.villagers.petrify(n)) progress(ctx, 'petrify'); }
      witness(ctx, n);
    } else if (c.steal) {
      const n = c.steal; if (n.stolen) { ctx.toast(vi(ctx) ? 'Người này hết đá rồi' : 'Nothing left on them'); return; }
      n.stolen = true; const k = 3 + ((Math.random() * 6) | 0); ctx.give('stone', k, n.x, n.y + 8); ctx.toast(t.stole(k)); progress(ctx, 'steal'); ctx.sfx('steal');
      if (Math.random() < 0.7) witness(ctx, n);
    }
  },
  hudLines(ctx) { if (!isDark(ctx)) return []; const d = dk(ctx); if (d.revealed) return [L(ctx).rampage(Object.keys(d.broken).filter(k => /^m[1-9]$/.test(k)).length)]; return [L(ctx).hud(d.pts, d.sus)].concat(d.quest ? [`${qText(ctx, d.quest)} ${d.quest.got}/${d.quest.need}`] : []); },
};
