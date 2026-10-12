// villagers.js — plan-21: dân làng bị quái tấn công, bị giết, được cứu / hồi sinh; Đài Tưởng Niệm ở Làng.
//  · Dân có máu (30 + 6 × bậc vùng). Bị đánh → chạy ngược quái, bong bóng "Cứu với!", mũi tên đỏ ở mép màn hình chỉ tới.
//  · Đánh đuổi quái đang tấn công dân → "cứu được": + kinh nghiệm, dân tặng 1–3 đá.
//  · Chết → bia mộ + đốm hồn ở chỗ ngã (save.dead[id]); trong 3 ngày game mang 🕯 Bùi nhùi hồi sinh tới → sống lại (+ kinh nghiệm lớn).
//  · Quá 3 ngày → CHẾT HẲN (anh chốt): chuyển sang save.fallen, không còn xuất hiện; tên khắc ở Đài Tưởng Niệm (Làng) + sổ tay.
//  · Không bao giờ chết (chỉ ngồi gục tới sáng): nhân vật cốt truyện, Leader, Trưởng lão, hướng dẫn viên, người đang giao nhiệm vụ.
const REVIVE_DAYS = 3, ARM_MAX = 10;   /* dân chỉ chiến đấu khi được tặng đá Seismic (anh chốt 2026-10-10); tối đa 10 viên */
const SWORD = typeof Image !== 'undefined' ? Object.assign(new Image(), { src: 'assets/px/ui/items/sword.png' }) : null;   /* icon kiếm PixelLab trên đầu dân có đá */
const L = ctx => (ctx.lang() === 'vi' ? {
  help: 'Cứu với!', fell: (n, z) => `🗿 ${n} đã bị hóa đá ở ${z}… còn ${REVIVE_DAYS} ngày để giải đá bằng 🕯 Bùi nhùi hồi sinh`,
  saved: (n, k) => `🛡 Bạn đã cứu ${n}! Tặng bạn ${k} 🪨`, tomb: n => `🕯 Giải đá cho ${n}`, tombNeed: n => `🗿 ${n} — cần 🕯 Bùi nhùi hồi sinh để giải đá (chế ở Bàn mộc: 2 hoa, 1 mật, 1 tinh hồn)`,
  revived: n => `✨ ${n} đã được giải đá!`, gone: n => `${n} đã thành tượng đá vĩnh viễn — tên ở Vườn Tượng Đá (Làng)`, hurt: n => `${n} bị thương, ngồi nghỉ tới sáng`,
  mem: n => `🗿 Vườn Tượng Đá (${n} người)`, memTitle: 'Vườn Tượng Đá', memEmpty: 'Chưa ai bị hóa đá. Hãy giữ cho dân làng an toàn.', memSub: 'Những thành viên bị hóa đá — không được giải đá kịp.',
  day: d => `ngày ${d}`, close: 'Đóng',
  gift: (n, k) => `🪨 Tặng đá Seismic cho ${n}${k ? ` (đã có ${k})` : ''}`, gifted: (n, k) => `🪨 ${n} nhận đá Seismic (${k}/${ARM_MAX}) — giờ có thể chiến đấu! Sức đánh ${armAtk(k)}`, full: n => `${n} đã đủ ${ARM_MAX} đá — mạnh nhất rồi`,
} : {
  help: 'Help!', fell: (n, z) => `🗿 ${n} was turned to stone in ${z}… ${REVIVE_DAYS} days left to free them with 🕯 Revival tinder`,
  saved: (n, k) => `🛡 You saved ${n}! They give you ${k} 🪨`, tomb: n => `🕯 Free ${n} from the stone`, tombNeed: n => `🗿 ${n} — needs 🕯 Revival tinder to break the stone (Workbench: 2 flowers, 1 honey, 1 soul spark)`,
  revived: n => `✨ ${n} is free from the stone!`, gone: n => `${n} is stone forever — their name stands in the Statue Garden (Village)`, hurt: n => `${n} is hurt and rests until morning`,
  mem: n => `🗿 Statue Garden (${n})`, memTitle: 'Statue Garden', memEmpty: 'Nobody has been turned to stone. Keep the villagers safe.', memSub: 'Members turned to stone and not freed in time.',
  day: d => `day ${d}`, close: 'Close',
  gift: (n, k) => `🪨 Give a Seismic stone to ${n}${k ? ` (has ${k})` : ''}`, gifted: (n, k) => `🪨 ${n} took a Seismic stone (${k}/${ARM_MAX}) — they can fight now! Power ${armAtk(k)}`, full: n => `${n} already has ${ARM_MAX} stones — as strong as it gets`,
});
const armAtk = k => 4 + 3 * k;
const ST = { ctx: null, tombs: [], mem: null };
const t2 = ctx => L(ctx);
const sv = ctx => { const s = ctx.S.save; s.dead ||= {}; s.fallen ||= []; s.armed ||= {}; return s; };
const armsOf = (ctx, n) => (n && n.m ? sv(ctx).armed[n.m.id] || 0 : 0);
const zoneName = ctx => (ctx.S.zone && (ctx.S.zone.name ? (ctx.S.zone.name[ctx.lang()] || ctx.S.zone.name.en || ctx.S.zone.name) : ctx.S.zone.id)) || '';
export function immune(ctx, n) {
  const m = n.m || {};
  if (n.chief) return false;   /* 2026-10-11 anh: Leader khu (vương miện) trúng súng phải hóa đá thật — kể cả thành viên có ★ (friend/elder) */
  if (n.lyron || n.hermit || n.custom || m.friend || m.elder || n.guide || n === ctx.S.guide) return true;
  /* 2026-10-11 anh: bắn Súng Hóa Đá vào Leader (người đội vương miện) mà chỉ đứng hình rồi chạy tiếp → Leader KHÔNG còn được miễn hóa đá */
  try { const q = typeof window !== 'undefined' && window.__quests && window.__quests.list(); if (q && q.active && q.active.some(a => a.npcId === m.id)) return true; } catch (e) { /* bỏ qua */ }
  return false;
}
const npcMax = (ctx, n) => 40 + 10 * Math.max(0, (ctx.S.zone && ctx.S.zone.lv) || 0) + (n ? 8 * armsOf(ctx, n) : 0);   /* plan-23: 1 quái đơn độc mất ~30 s mới hạ 1 dân */

function defineObjs(ctx) {
  ctx.defineObject('tomb', 16, 20, 1, 1, g => {   /* dự phòng vẽ code — B1 thay ảnh PixelLab */
    g.fillStyle = '#352022'; g.fillRect(3, 4, 10, 15); g.fillStyle = '#9a9aa6'; g.fillRect(4, 5, 8, 13); g.fillStyle = '#c8c8d2'; g.fillRect(4, 5, 8, 2);
    g.fillStyle = '#352022'; g.fillRect(7, 8, 2, 6); g.fillRect(5, 10, 6, 2);
  }, { solid: false });
  ctx.defineObject('memorial', 32, 40, 2, 1, g => {
    g.fillStyle = '#352022'; g.fillRect(2, 30, 28, 9); g.fillRect(9, 2, 14, 30); g.fillStyle = '#8a8478'; g.fillRect(3, 31, 26, 7); g.fillStyle = '#b8b2a4'; g.fillRect(10, 3, 12, 28);
    g.fillStyle = '#ffd45e'; g.fillRect(14, 0, 4, 4); g.fillStyle = '#5a5246'; for (let y = 8; y < 28; y += 4) g.fillRect(12, y, 8, 1);
  }, { solid: true });
}
/* tượng đá = hình chính người đó (hướng nam, khung đứng) tô màu đá xám tím; cache theo id */
const STONE = {};
function stoneOf(ctx, id) {
  if (STONE[id] !== undefined) return STONE[id];
  const m = ctx.byId && ctx.byId.get ? ctx.byId.get(id) : null; if (!m || !ctx.npcSheet) return (STONE[id] = null);
  const sh = ctx.npcSheet(m); if (!sh) return (STONE[id] = null);
  const hi = sh.__hi || 1, W = 16 * hi, H = 20 * hi, c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(sh, 0, 0, 16, 20, 0, 0, W, H);   /* sheet __hi: shim tự nhân toạ độ nguồn */
  const im = g.getImageData(0, 0, W, H), a = im.data;
  for (let i = 0; i < a.length; i += 4) { if (!a[i + 3]) continue; const l = (a[i] * 0.3 + a[i + 1] * 0.59 + a[i + 2] * 0.11), v = Math.round(52 + l * 0.62), q = Math.round(v / 14) * 14;   /* đá: xám hơi tím, bậc màu như pixel */
    a[i] = Math.min(255, q); a[i + 1] = Math.min(255, q - 4); a[i + 2] = Math.min(255, q + 10); }
  g.putImageData(im, 0, 0);
  if (hi > 1) { c.__w = W; c.__h = H; c.__hi = hi; Object.defineProperty(c, 'width', { value: 16 }); Object.defineProperty(c, 'height', { value: 20 }); }
  return (STONE[id] = c);
}
function placeTomb(ctx, id, d) {
  const map = ctx.S.map, tx = Math.floor(d.x / 16), ty = Math.floor(d.y / 16);
  const o = ctx.place(map, 'tomb', tx, ty, { tomb: id, ghost: true }); if (o) ST.tombs.push({ id, o, d });   /* plan-25: hóa đá → vẽ tượng (drawables), mộ chỉ còn là điểm tương tác */
}
function expire(ctx) {   /* quá hạn → chết hẳn */
  const s = sv(ctx), day = ctx.clock ? ctx.clock.dayIndex : 0;
  for (const [id, d] of Object.entries(s.dead)) {
    if (day - d.day < REVIVE_DAYS) continue;
    delete s.dead[id]; s.fallen.push({ id, name: d.name, zone: d.zone, zoneName: d.zoneName, day: d.day, nation: d.nation });
    if (ctx.S.zone && d.zone === ctx.S.zone.id) { const t = ST.tombs.find(t => t.id === id); if (t) { ctx.removeObject(ctx.S.map, t.o); ST.tombs = ST.tombs.filter(x => x !== t); } }
    ctx.toast(L(ctx).gone(d.name));
  }
}

export function hurtNpc(ctx, n, dmg, from) {
  const t = L(ctx); n.hpMax ||= npcMax(ctx); if (n.hp == null) n.hp = n.hpMax;
  n.underAttack = ctx.S.time; n.attacker = from || null;
  if (ctx.S.time - (n.helpT || -9) > 4) { n.helpT = ctx.S.time; ctx.bubble && ctx.bubble(n, t.help, 2); }
  if (from && !armsOf(ctx, n)) { const dx = n.x - from.x, dy = n.y - from.y, d = Math.hypot(dx, dy) || 1; n.goal = { x: n.x + dx / d * 48, y: n.y + dy / d * 48 }; n.busy = false; }   /* chưa có đá → chạy ngược quái; có đá → đứng lại đánh (update) */
  n.hp -= dmg;
  if (ctx.pop) ctx.pop(n.x, n.y - 22, `-${dmg}`, '#ff8a6b');
  if (n.hp > 0) return false;
  if (immune(ctx, n) || (ctx.wreck && !ctx.wreck.allowDeath())) { n.hp = 1; n.goal = null; n.busy = true; n.hurtSit = true;   /* plan-23: tối đa 2 dân chết / đêm / vùng */ if (!n.hurtToast) { n.hurtToast = true; ctx.toast(t.hurt(n.m.k || n.m.n || n.m.id)); } return false; }
  killNpc(ctx, n); if (ctx.wreck) ctx.wreck.noteDeath(); return true;
}
function killNpc(ctx, n) {
  const s = sv(ctx), id = n.m.id, nm = n.m.k || n.m.n || id, zn = zoneName(ctx), nat = ctx.nationOf ? (ctx.nationOf(n.m) || {}).name : '';
  const d = { name: nm, zone: ctx.S.zone.id, zoneName: zn, x: n.x, y: n.y, day: ctx.clock ? ctx.clock.dayIndex : 0, nation: nat };
  s.dead[id] = d;
  const i = ctx.S.npcs.indexOf(n); if (i >= 0) ctx.S.npcs.splice(i, 1);
  if (ctx.S.staff) { const j = ctx.S.staff.indexOf(n); if (j >= 0) ctx.S.staff.splice(j, 1); }   /* Leader khu nằm trong S.staff */
  placeTomb(ctx, id, d); if (ctx.vfx && !ctx.vfx('petrify', n.x, n.y + 4, 0, true)) ctx.vfx('dirt_puff', n.x, n.y); if (ctx.quake) ctx.quake(0.3);   /* plan-25: sóng hóa đá */
  ctx.toast(L(ctx).fell(nm, zn), true); ctx.sfx('sad'); ctx.persist();
}
/* đánh đuổi quái đang tấn công dân → cứu được */
export function rescued(ctx, monster) {
  for (const n of ctx.S.npcs) {
    if (n.attacker !== monster || ctx.S.time - (n.underAttack || -99) > 6) continue;
    n.attacker = null; n.underAttack = -99; if (n.hp != null) n.hp = Math.max(n.hp, Math.ceil((n.hpMax || 30) * 0.5));
    const k = 1 + ((Math.random() * 3) | 0); ctx.give('stone', k, n.x, n.y);   /* dân cảm ơn: ném đá Seismic */
    ctx.toast(L(ctx).saved(n.m.k || n.m.n || n.m.id, k), true); if (ctx.hero) ctx.hero.gainXp(10 + 4 * Math.max(0, ctx.S.zone.lv || 0));
    if (ctx.vfx) ctx.vfx('crop_sparkle', n.x, n.y + 2);
  }
}
function revive(ctx, t) {
  const s = sv(ctx), d = s.dead[t.id]; if (!d || !ctx.bag.has('revive', 1)) return;
  ctx.bag.remove('revive', 1); delete s.dead[t.id]; ctx.removeObject(ctx.S.map, t.o); ST.tombs = ST.tombs.filter(x => x !== t);
  if (ctx.vfx) ctx.vfx('stone_free', t.o.x * 16 + 8, (t.o.y + 1) * 16, 0, true);   /* plan-25: vỏ đá vỡ, ánh sáng loé */
  const m = ctx.byId ? (typeof ctx.byId.get === 'function' ? ctx.byId.get(t.id) : ctx.byId(t.id)) : null;   /* byId là Map */ if (m && ctx.respawnNpc) ctx.respawnNpc(m, d.x, d.y);
  if (ctx.vfx) { ctx.vfx('level_up', d.x, d.y + 2, 0, true); }
  ctx.toast(L(ctx).revived(d.name), true); ctx.sfx('unstone'); if (ctx.hero) ctx.hero.gainXp(40 + 10 * Math.max(0, ctx.S.zone.lv || 0)); ctx.persist();
}
function openMemorial(ctx) {
  const t = L(ctx), s = sv(ctx), esc = x => String(x).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const rows = s.fallen.slice().reverse().map(f => `<li><b>${esc(f.name)}</b>${f.nation ? ` · ${esc(f.nation)}` : ''} · ${esc(f.zoneName || f.zone)} · ${t.day(f.day + 1)}</li>`).join('');
  const el = ctx.panel('memorial', `<h2>🗿 ${t.memTitle}</h2><p class="dim">${t.memSub}</p>${rows ? `<ol class="mem-list">${rows}</ol>` : `<p>${t.memEmpty}</p>`}<button class="btn" id="mem-close">${t.close}</button>`);
  const close = () => { el.hidden = true; ctx.setMode('play'); };
  el.hidden = false; ctx.setMode('memorial'); ctx.registerCloser('memorial', close);
  const b = el.querySelector('#mem-close'); if (b) b.onclick = close;
}

export const villagers = {
  id: 'villagers',
  onZoneEnter(ctx) {
    ST.ctx = ctx; ST.tombs = []; ST.mem = null; defineObjs(ctx); expire(ctx);
    const s = sv(ctx);
    for (const [id, d] of Object.entries(s.dead)) if (d.zone === ctx.S.zone.id) placeTomb(ctx, id, d);
    if (ctx.S.zone.id === 'village') {   /* Đài Tưởng Niệm cạnh điểm vào Làng */
      const map = ctx.S.map, e = map.entries.default;
      for (let r = 2; r < 9 && !ST.mem; r++) for (let dx = -r; dx <= r && !ST.mem; dx++) { const x = e.x + dx, y = e.y - r; if (x < 1 || y < 1) continue; if (!ctx.isSolid(map, x, y) && !ctx.isSolid(map, x + 1, y) && !ctx.hasObjectAt(map, x, y) && !ctx.hasObjectAt(map, x + 1, y) && !ctx.isSolid(map, x, y + 1)) ST.mem = ctx.place(map, 'memorial', x, y, { memorial: true }); }
    }
    for (const n of ctx.S.npcs) { n.hpMax = npcMax(ctx, n); n.hp = n.hpMax; n.hurtSit = false; }
    ctx.villagers = { petrify: n => { if ((ctx.S.npcs.includes(n) || (n.chief && (ctx.S.staff || []).includes(n))) && !immune(ctx, n)) { killNpc(ctx, n); return true; } return false; },   /* plan-25 B3: đòn hóa đá của phe Xealist */
      hurt: (n, dmg, from) => hurtNpc(ctx, n, dmg, from), immune: n => immune(ctx, n), rescued: m => rescued(ctx, m), alive: () => ctx.S.npcs.filter(n => !n.custom && !n.lyron) };
    if (typeof window !== 'undefined') window.__villagers = { dead: () => sv(ctx).dead, fallen: () => sv(ctx).fallen, kill: i => { const n = ctx.S.npcs.filter(x => !immune(ctx, x))[i || 0]; if (n) killNpc(ctx, n); return n && n.m.id; }, tombs: () => ST.tombs.map(t => t.id), expireNow: () => { for (const d of Object.values(sv(ctx).dead)) d.day -= REVIVE_DAYS; expire(ctx); } };
  },
  onZoneLeave() { ST.tombs = []; ST.mem = null; },
  update(dt, ctx) {
    /* dân có đá Seismic: đánh quái đang tấn công mình hoặc quái trong 40 px */
    const mons = ctx.monsters && ctx.monsters.list();
    if (mons && mons.length) for (const n of ctx.S.npcs) {
      const k = armsOf(ctx, n); if (!k || n.hurtSit || n.custom) continue;
      let tg = n.attacker && mons.includes(n.attacker) ? n.attacker : null;
      if (!tg) { let bd = 40; for (const mo of mons) { if (mo.c && mo.c.spar) continue;   /* spar.js: bạn tập không phải quái */ const d = Math.hypot(mo.x - n.x, mo.y - n.y); if (d < bd) { bd = d; tg = mo; } } }
      if (!tg) continue;
      const d = Math.hypot(tg.x - n.x, tg.y - n.y); n.faceTo && n.faceTo(tg.x, tg.y);
      if (d > 16) { n.goal = { x: tg.x, y: tg.y }; n.busy = false; continue; }
      n.goal = null; n.atkCd = (n.atkCd || 0) - dt;
      if (n.atkCd <= 0) { n.atkCd = 1.1; ctx.monsters.damage(tg, armAtk(k), n); }
    }
    if (ctx.clock && ST.day !== ctx.clock.dayIndex) { if (ST.day != null) { expire(ctx); for (const n of ctx.S.npcs) { if (n.hurtSit) { n.hurtSit = false; n.busy = false; } n.hp = n.hpMax; } } ST.day = ctx.clock.dayIndex; }   /* sáng: dân bị thương hồi lại */
  },
  near(ctx) {
    const p = ctx.S.player, t = L(ctx); let best = null, bd = 26;
    if (ctx.holding && ctx.holding('stone') && ctx.bag.has('stone', 1)) {   /* cầm đá Seismic → click dân = tặng (thắng 'nói chuyện') */
      for (const n of ctx.S.npcs) { if (n.custom || n.lyron || (n.m && n.m.friend)) continue; const d = Math.hypot(n.x - p.x, n.y - p.y); if (d < 26 && d < bd) { bd = d; const k = armsOf(ctx, n); best = { label: t.gift(n.m.k || n.m.n || n.m.id, k), x: n.x, y: n.y - 10, limit: 26, priority: 1, data: { gift: n } }; } }
      if (best) return best;
    }
    for (const tb of ST.tombs) {
      const x = tb.o.x * 16 + 8, y = tb.o.y * 16 + 12, d = Math.hypot(x - p.x, y - p.y); if (d >= bd) continue; bd = d;
      const nm = tb.d.name, holds = ctx.holding ? ctx.holding('revive') : ctx.bag.has('revive', 1);
      best = ctx.bag.has('revive', 1) ? (holds ? { label: t.tomb(nm), x, y, limit: 26, priority: true, data: { tomb: tb } } : { label: ctx.needHold('revive'), x, y, limit: 26, priority: true, need: true, needId: 'revive', data: { need: true } })
        : { label: t.tombNeed(nm), x, y, limit: 26, data: { info: t.tombNeed(nm) } };
    }
    if (ST.mem && ctx.S.map.objects.includes(ST.mem)) {
      const x = ST.mem.x * 16 + 16, y = ST.mem.y * 16 + 14, d = Math.hypot(x - p.x, y - p.y);
      if (d < 30 && d < bd) best = { label: t.mem(sv(ctx).fallen.length), x, y, limit: 30, data: { mem: true } };
    }
    return best;
  },
  interact(ctx, cand) {
    const d = cand && cand.data; if (!d) return;
    if (d.gift) { const n = d.gift, s = sv(ctx), k = armsOf(ctx, n), nm = n.m.k || n.m.n || n.m.id; if (k >= ARM_MAX) { ctx.toast(t2(ctx).full(nm)); return; } ctx.bag.remove('stone', 1); s.armed[n.m.id] = k + 1; n.hpMax = npcMax(ctx, n); n.hp = Math.min(n.hpMax, (n.hp ?? n.hpMax) + 8); ctx.toast(t2(ctx).gifted(nm, k + 1)); ctx.sfx('gift'); if (ctx.vfx) ctx.vfx('item_pickup_pop', n.x, n.y - 18, 0, true); if (n.faceTo) n.faceTo(ctx.S.player.x, ctx.S.player.y); ctx.persist(); return; }
    if (d.tomb) revive(ctx, d.tomb); else if (d.mem) openMemorial(ctx); else if (d.info) ctx.toast(d.info);
  },
  drawables(ctx, cx, cy) {   /* icon kiếm trên đầu dân có đá + tượng đá dân bị hóa đá */
    const out = [], g = ctx.g;
    for (const tb of ST.tombs) { const st = stoneOf(ctx, tb.id); if (!st) continue; const x = tb.o.x * 16 + 8 - cx, y = (tb.o.y + 1) * 16 - cy;
      out.push({ y: (tb.o.y + 1) * 16, f: () => { g.fillStyle = 'rgba(0,0,0,.22)'; g.fillRect(x - 5, y - 2, 10, 2); g.drawImage(st, x - 8, y - 20, 16, 20); } }); }   /* tượng đứng thẳng trên đất, bóng nhỏ (anh bỏ bệ 2026-10-10) */
    if (!SWORD || !SWORD.complete) return out;
    for (const n of ctx.S.npcs) { if (!armsOf(ctx, n)) continue; const x = Math.round(n.x - cx) + 4, y = Math.round(n.y - cy) - 17;   /* ngang vai phải, như đeo kiếm — không đè nhãn tên */ out.push({ y: n.y + 0.5, f: () => g.drawImage(SWORD, 0, 0, SWORD.width, SWORD.height, x, y, 8, 8) }); }
    return out;
  },
  drawUI(ug, ctx, cx, cy, scale) {   /* mũi tên đỏ ở mép màn hình chỉ tới dân đang bị tấn công */
    const W = ug.canvas.width, H = ug.canvas.height;
    for (const n of ctx.S.npcs) {
      if (ctx.S.time - (n.underAttack || -99) > 4) continue;
      const sx = (n.x - cx) * scale, sy = (n.y - 10 - cy) * scale;
      if (sx > 20 && sy > 20 && sx < W - 20 && sy < H - 20) continue;
      const mx = W / 2, my = H / 2, a = Math.atan2(sy - my, sx - mx), r = Math.min(W, H) / 2 - 34, ax = mx + Math.cos(a) * r * (W / Math.min(W, H)) * 0.95, ay = my + Math.sin(a) * r;
      const x = Math.max(28, Math.min(W - 28, ax)), y = Math.max(28, Math.min(H - 28, ay)), k = 9 * Math.max(1, scale / 3) * (1 + 0.15 * Math.sin(ctx.S.time * 8));
      ug.save(); ug.translate(x, y); ug.rotate(a); ug.fillStyle = '#e84a3a'; ug.strokeStyle = '#352022'; ug.lineWidth = 2;
      ug.beginPath(); ug.moveTo(k * 1.6, 0); ug.lineTo(-k, k); ug.lineTo(-k * 0.4, 0); ug.lineTo(-k, -k); ug.closePath(); ug.fill(); ug.stroke(); ug.restore();
      const dist = Math.round(Math.hypot(n.x - ctx.S.player.x, n.y - ctx.S.player.y) / 16);
      ug.font = `${Math.round(15 * Math.max(1, scale / 3))}px VT323, monospace`; ug.fillStyle = '#fff'; ug.textAlign = 'center'; ug.fillText(`${dist}m`, x, y - 14 * Math.max(1, scale / 3));
    }
  },
};
