// underwater.js — plan-26 thế giới dưới nước (B0 + B1):
//  · Heathcliff (CM thật của Seismic như Noxx — anh chốt 2026-10-10; thiết kế riêng: nửa mặt đen nhầy răng nanh, nửa mặt nạ đỏ vân sóng địa chấn, áo da cổ lông,
//    huy hiệu sóng vàng) đứng chân cầu tàu Làng ở Biển, bán viên thở: nhỏ 60 s / 20 đá, lớn 180 s / 50 đá (items.js PILLS).
//    Ảnh PixelLab: manifest `chars.fixed.heathcliff` + chân dung `ui.port_heathcliff`; thiếu ảnh thì rơi về dáng dân thường + khung chữ "H".
//  · Hơi thở = save.sys.underwater.breath (giây), CHỈ trừ khi đang ở vùng dưới nước (ZONES[id].under) và đang chơi. Uống thêm thì cộng dồn, tối đa 600 s.
//    Lặn khi còn < 10 s → tự uống 1 viên trong túi (báo); không có viên → không lặn được, nhắc gặp Heathcliff.
//    ≤ 10 s: thanh hơi thở đỏ + bọt khí trồi lên; 0 s: mất máu mỗi giây (ctx.hero.hit); ngất → nổi lên bến cảng Làng (Biển 'back'), không mất đồ.
//  · Điểm lặn: vòng xoáy phát sáng sát cầu tàu (S.map.dive, world.js) → E. B1: đã tới tầng nào (save.underwater.reached) thì bảng chọn tầng → lặn thẳng xuống đó.
//  · 4 tầng nối bằng cổng xoáy (world.js buildU1..U4): hạ trùm canh cổng (monsters.js gọi ctx.onBossDown) → cổng mở, lưu save, trùm không hồi sinh;
//    cổng ra phía dưới lên tầng trên (entry 'back' = cạnh cổng xoáy đã mở). Cổng cuối (u4) dẫn tới Vực Kraken = B2 → "sắp mở".
//  · Cơ chế riêng: u2 tảo cao che người + quái (ctx.uwHide), u3 dòng chảy đẩy người (m.current) + mực của Mực Ma làm tối nhẹ ngắn (ctx.uwInk),
//    u4 hang tối đen — chỉ sáng quanh người, pha lê, lỗ phun khí, mồi Cá Đèn Lồng (mo.lure). Chảy máu / trúng độc = mất máu theo nhịp (ctx.uwDot).
//  · Mỗi tầng: lỗ phun khí (+12 s, cạn 45 s), 1–3 rương (loot riêng, lưu), góc bí mật (báo lần đầu), đồ rải dưới đáy (m.pickups → rơi 1 lần / save).
//  · Dưới nước: bơi chậm 0,75×, dáng bơi PixelLab (clip 'swim' của hung_b), bọt khi bơi; sức đánh ×0,5 (main.js ctx.atkMul, monsters.strike).
import { obj as defObj } from '../gfx.js';
import { ART } from '../art.js';
import { PILLS, BREATH_CAP } from '../items.js';
import { ZONES } from '../world.js';

const TAU = Math.PI * 2, TS = 16;
const SWIM_SPEED = 0.75, LOW = 10, DIVE_MIN = 10, DROWN_EVERY = 1, DROWN_PCT = 0.1;
const VENT_GIVE = 12, VENT_CD = 45, VENT_R = 18, STUN_MAX = 1.2, HC_KEY = 'heathcliff';
const CURRENT_SP = 34, LAMP_R = 66, INK_A = 0.5, INK_IN = 0.35, INK_OUT = 0.9;
const SWIM_LOOP = [1, 2, 3, 4, 5, 6, 5, 4, 3, 2], SWIM_IDLE = [2, 3, 4, 3];   /* khung 0 của clip AI = tư thế đứng tham chiếu → bỏ */
const FLOOR_IDS = ['u1', 'u2', 'u3', 'u4'];
const FLOORS = {
  u1: { n: 1, boss: { vi: 'Cua Hoàng Đế', en: 'Emperor Crab' } }, u2: { n: 2, boss: { vi: 'Lươn Mẹ', en: 'Mother Eel' } },
  u3: { n: 3, boss: { vi: 'Cá Mập Bọc Giáp', en: 'Armored Shark' } }, u4: { n: 4, boss: { vi: 'Rắn Biển Khổng Lồ', en: 'Giant Sea Serpent' } },
};
const vi = ctx => ctx.lang() === 'vi';
const zname = (ctx, id) => { const z = ZONES[id]; return z ? (vi(ctx) ? z.name.vi : z.name.en) : id; };
const bossName = (ctx, id) => { const f = FLOORS[id]; return f ? (vi(ctx) ? f.boss.vi : f.boss.en) : ''; };
const L = ctx => (vi(ctx) ? {
  talk: 'Nói chuyện với Heathcliff',
  first: ['Định lặn xuống rạn san hô à? Không có viên thở của tôi thì ở dưới đó chưa nổi một phút đâu.', 'Viên nhỏ 60 giây, viên lớn 180 giây. Đồng hồ thở chỉ chạy khi cậu ở dưới nước — uống thêm thì cộng dồn, tối đa 10 phút.', 'Dưới nước tay chân nặng lắm: đòn đánh chỉ còn một nửa sức. Cẩn thận Cua Hoàng Đế canh cổng xoáy.'],
  again: ['Cần thêm viên thở không?', 'Hết hơi là mất máu từng giây. Ngất thì tôi kéo cậu lên bến, đồ đạc vẫn còn đủ.', 'Lỗ phun khí dưới đáy cho thêm vài giây thở — nhớ ghé.', 'Tầng nào cậu đã tới thì vòng xoáy đưa thẳng xuống đó. Càng xuống sâu càng tối, nhớ mang viên lớn.'],
  shopTitle: 'Heathcliff · Viên thở', lead: 'Viên thở cho thợ lặn. Đồng hồ thở chỉ chạy khi ở dưới nước.', buy: 'Mua', close: 'Đóng', secs: n => `+${n} giây thở`,
  have: s => `Hơi thở đang có: ${s} giây (tối đa ${BREATH_CAP})`, poor: 'Không đủ đá Seismic', bought: n => `Đã mua ${n}`,
  dive: n => `Lặn xuống ${n}`, diveAny: 'Lặn xuống · chọn tầng', needPill: 'Cần viên thở để lặn — mua ở Heathcliff (chân cầu tàu)', autoPill: n => `Tự uống 1 ${n} trước khi lặn`,
  menuTitle: 'Lặn xuống tầng nào?', menuLead: 'Vòng xoáy đưa thẳng xuống tầng bạn đã tới.', floor: n => `Tầng ${n}`, lv: (a, b) => `cấp ${a}–${b}`, go: 'Lặn', bossDown: b => `✓ ${b}`, bossUp: b => `👑 ${b}`,
  drink: n => `Uống ${n}`, drank: (n, s) => `Đã uống ${n} · hơi thở ${s} giây`, full: `Hơi thở đã đầy (tối đa ${BREATH_CAP / 60} phút)`,
  low: 'Sắp hết hơi! Uống viên thở hoặc bơi về cổng ra', lowNo: 'Sắp hết hơi! Bơi về cổng ra phía dưới', out: 'Hết hơi! Mất máu mỗi giây',
  up: 'Bạn được kéo lên bến cảng Làng — không mất đồ. Heathcliff ở chân cầu tàu bán thêm viên thở.',
  vent: s => `Lỗ phun khí · +${s} giây thở`, chest: 'Mở rương', chestGot: 'Rương:', gateSealed: 'Cổng xoáy bị phong ấn', gateHint: b => `Hạ ${b} canh cổng thì cổng xoáy mới mở`,
  gateOpen: 'Cổng xoáy đã mở!', gateGo: (n, name) => `Xuống tầng ${n} · ${name}`, gateKraken: 'Cổng xoáy · Vực Kraken', soon: 'Vực Kraken — sắp mở! Dòng xoáy dưới kia còn bị chặn.',
  atk: 'Dưới nước: −50% sức mạnh', breath: 'Hơi thở', stunned: 'Bị điện giật — tê người!', secret: 'Góc bí mật! Có rương và ngọc trai giấu ở đây',
  current: 'Dòng chảy mạnh đẩy bạn đi — bơi ngược dòng thì chậm', dark: 'Hang tối đen — đèn của bạn chỉ soi quanh người. Pha lê và lỗ phun khí cho chút ánh sáng',
  inked: 'Mực phun — tối mắt một lúc!', bleed: 'Bị cắn — chảy máu!', poison: 'Trúng độc rắn biển!', lured: 'Ánh sáng lạ đang dụ bạn lại gần… bơi ra xa!',
  kelp: 'Tảo cao che khuất — quái có thể núp trong đó',
} : {
  talk: 'Talk to Heathcliff',
  first: ['Diving down to the reef? Without my breath pills you will not last a minute down there.', 'Small pill: 60 seconds. Large: 180. The breath clock only runs while you are underwater — they stack, up to 10 minutes.', 'Everything is heavy underwater: your strikes land with half the power. Mind the Emperor Crab at the whirl gate.'],
  again: ['Need more breath pills?', 'Out of breath means losing health every second. Faint and I pull you back to the pier — you keep your things.', 'The vents on the seabed give you a few extra seconds — use them.', 'The whirl takes you straight down to any layer you have reached. The deeper, the darker — bring large pills.'],
  shopTitle: 'Heathcliff · Breath pills', lead: 'Breath pills for divers. The breath clock only runs underwater.', buy: 'Buy', close: 'Close', secs: n => `+${n} s of breath`,
  have: s => `Breath stored: ${s} s (max ${BREATH_CAP})`, poor: 'Not enough Seismic stones', bought: n => `Bought ${n}`,
  dive: n => `Dive to the ${n}`, diveAny: 'Dive · pick a layer', needPill: 'You need a breath pill to dive — buy one from Heathcliff (foot of the pier)', autoPill: n => `Took 1 ${n} before diving`,
  menuTitle: 'Dive to which layer?', menuLead: 'The whirl takes you straight down to any layer you have reached.', floor: n => `Layer ${n}`, lv: (a, b) => `level ${a}–${b}`, go: 'Dive', bossDown: b => `✓ ${b}`, bossUp: b => `👑 ${b}`,
  drink: n => `Take ${n}`, drank: (n, s) => `Took ${n} · breath ${s} s`, full: `Breath is full (max ${BREATH_CAP / 60} minutes)`,
  low: 'Almost out of breath! Take a pill or swim to the exit', lowNo: 'Almost out of breath! Swim to the exit at the bottom', out: 'Out of breath! Losing health every second',
  up: 'You were pulled up to the Harbor Village pier — nothing lost. Heathcliff sells more pills at the foot of the pier.',
  vent: s => `Air vent · +${s} s of breath`, chest: 'Open the chest', chestGot: 'Chest:', gateSealed: 'The whirl gate is sealed', gateHint: b => `Defeat the ${b} guarding it to open the whirl gate`,
  gateOpen: 'The whirl gate is open!', gateGo: (n, name) => `Down to layer ${n} · ${name}`, gateKraken: 'Whirl gate · Kraken Trench', soon: 'Kraken Trench — coming soon! The whirl below is still blocked.',
  atk: 'Underwater: −50% power', breath: 'Breath', stunned: 'Zapped — you are stunned!', secret: 'Secret corner! A chest and pearls are hidden here',
  current: 'A strong current pushes you — swimming against it is slow', dark: 'Pitch-dark cave — your lamp only lights around you. Crystals and vents give a little light',
  inked: 'Ink cloud — you can barely see!', bleed: 'Bitten — you are bleeding!', poison: 'Sea snake venom — poisoned!', lured: 'A strange light is luring you closer… swim away!',
  kelp: 'Tall kelp hides things — monsters may lurk inside',
});

/* ---- vật thể mới (bản vẽ code chỉ để dự phòng ?art=code; ảnh PixelLab ở assets/px/zones/u1..u4.json) ---- */
const px = (g, x, y, c, w = 1, h = 1) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
const chestArt = open => g => { px(g, 1, 6, '#352022', 14, 10); px(g, 2, 7, '#8a5a2b', 12, 8); px(g, 2, 10, '#d9a23a', 12, 1); px(g, 7, 9, '#ffd45e', 2, 2); if (open) { px(g, 1, 1, '#352022', 14, 6); px(g, 2, 2, '#5f3d1c', 12, 4); px(g, 3, 7, '#2a1a10', 10, 2); } else { px(g, 1, 3, '#352022', 14, 4); px(g, 2, 4, '#a8733c', 12, 2); } };
const ringArt = open => g => { g.strokeStyle = '#352022'; g.lineWidth = 6; g.beginPath(); g.ellipse(16, 15, 11, 11, 0, 0, TAU); g.stroke(); g.strokeStyle = open ? '#7fb8c8' : '#5a6878'; g.lineWidth = 4; g.beginPath(); g.ellipse(16, 15, 11, 11, 0, 0, TAU); g.stroke(); px(g, 3, 26, '#352022', 26, 6); px(g, 4, 27, '#6a7a88', 24, 4); };
defObj('uchest', 16, 16, 1, 1, chestArt(false)); defObj('uchest_open', 16, 16, 1, 1, chestArt(true));
defObj('uwgate_sealed', 32, 32, 2, 1, ringArt(false)); defObj('uwgate', 32, 32, 2, 1, ringArt(true));
defObj('vent_spent', 16, 16, 1, 1, g => { px(g, 2, 8, '#352022', 12, 8); px(g, 3, 9, '#74747e', 10, 6); px(g, 6, 6, '#352022', 4, 3); }, { solid: false });
defObj('tallkelp', 24, 24, 1, 1, g => { for (let i = 0; i < 3; i++) for (let y = 2 + i * 3; y < 22; y++) px(g, 7 + i * 4 + Math.round(Math.sin(y / 3 + i) * 1.5), y, i % 2 ? '#8a7a2a' : '#b09a3a', 2, 1); px(g, 6, 21, '#5a5560', 12, 3); }, { solid: false });
defObj('wreckwall', 16, 16, 1, 1, g => { px(g, 0, 2, '#352022', 16, 14); px(g, 1, 3, '#6a4a2a', 14, 12); for (const y of [6, 10]) px(g, 1, y, '#4a3018', 14, 1); });
const rockArt = flip => g => { px(g, 1, 3, '#352022', 14, 13); px(g, 2, 4, '#3a4a66', 12, 11); px(g, flip ? 4 : 9, 6, '#5fe0e8', 2, 2); px(g, flip ? 10 : 4, 11, '#5fe0e8', 1, 1); };
defObj('caverock', 16, 16, 1, 1, rockArt(false)); defObj('caverock2', 16, 16, 1, 1, rockArt(true));

const ST = { ctx: null, t: 0, hc: null, placed: false, shopEl: null, menuEl: null, drownT: 0, lowWarned: false, outWarned: false, bubT: 0, lowBubT: 0, stun: 0, stunMsgT: 0, full: 60, saveT: 0, surfaced: false, fx: [], icon: null,
  ink: 0, inkDur: 0, dots: [], darkCv: null, curWarn: false, secretIn: false, msgT: {} };
function sv(ctx) {
  const s = ctx.S.save; s.sys ||= {}; const u = (s.sys.underwater ||= {});
  if (typeof u.breath !== 'number' || !isFinite(u.breath)) u.breath = 0;
  u.gates ||= {}; u.chests ||= {}; u.reached ||= []; u.seeded ||= {}; u.secrets ||= {};
  return u;
}
const under = ctx => !!(ctx.S.zone && ctx.S.zone.under);
const zid = ctx => (ctx.S.zone && ctx.S.zone.id) || '';
const pickPill = ctx => ['pill_s', 'pill_l'].find(id => ctx.bag.has(id, 1)) || null;
const pillName = (ctx, id) => `${ctx.itemIcon(id)} ${ctx.itemName(id)}`;
const afterPrologue = ctx => { const st = ctx.story && ctx.story(); return !st || st.seaDone || st.act >= 2; };
const vfx = (ctx, name, x, y, top) => !!(ctx.vfx && ctx.vfx(name, x, y, 0, top));
const once = (ctx, key, txt, big, gap = 12) => { if (ST.t - (ST.msgT[key] ?? -99) < gap) return; ST.msgT[key] = ST.t; ctx.toast(txt, big); };
const reachedFloors = ctx => { const r = sv(ctx).reached; return FLOOR_IDS.filter(id => id === 'u1' || r.includes(id)); };
function bubbles(ctx, x, y, n = 3) {   /* bọt khí: sheet VFX PixelLab 'u_bubbles'; chưa có thì vẽ hạt code (dự phòng) */
  if (vfx(ctx, 'u_bubbles', x, y, true)) return;
  for (let i = 0; i < n; i++) ST.fx.push({ x: x + (Math.random() - 0.5) * 8, y: y - Math.random() * 4, vy: -18 - Math.random() * 14, t: 0, life: 0.9 + Math.random() * 0.6, r: Math.random() < 0.3 ? 2 : 1, ph: Math.random() * 6 });
  if (ST.fx.length > 80) ST.fx.splice(0, ST.fx.length - 80);
}
function sheetFrame(g, sh, f, dx, dy, flip, alpha = 1) {   /* vẽ 1 khung sheet VFX manifest (w,h logic; ảnh __hi thì shim tự nhân toạ độ nguồn) */
  const hi = sh.img.__hi ? 1 : 2, w = sh.w, h = sh.h;
  g.save(); g.globalAlpha = alpha;
  if (flip) { g.translate(dx + w, dy); g.scale(-1, 1); g.drawImage(sh.img, f * w * hi, 0, w * hi, h * hi, 0, 0, w, h); }
  else g.drawImage(sh.img, f * w * hi, 0, w * hi, h * hi, dx, dy, w, h);
  g.restore();
}

/* ---------------- viên thở ---------------- */
function drink(ctx, id, auto) {
  const u = sv(ctx), P = PILLS[id], t = L(ctx); if (!P || !ctx.bag.has(id, 1)) return false;
  if (u.breath >= BREATH_CAP - 1) { ctx.toast(t.full); ctx.sfx('error'); return false; }
  ctx.bag.remove(id, 1); u.breath = Math.min(BREATH_CAP, u.breath + P.secs); ST.full = Math.max(ST.full, u.breath);
  ST.lowWarned = false; ST.outWarned = false; ctx.persist(); if (ctx.hotbarSync) ctx.hotbarSync();
  const p = ctx.S.player; ctx.sfx('heal'); ctx.sfx('bubbles'); bubbles(ctx, p.x, p.y - 14, 5);
  ctx.toast(auto ? t.autoPill(pillName(ctx, id)) : t.drank(pillName(ctx, id), Math.ceil(u.breath)));
  return true;
}
function ensureBreath(ctx) {   /* trước khi lặn / qua cổng: còn < 10 s thì tự uống 1 viên; không có viên → false */
  const u = sv(ctx); if (u.breath >= DIVE_MIN) return true;
  const id = pickPill(ctx); if (!id) { ctx.toast(L(ctx).needPill, true); ctx.sfx('fail'); return false; }
  drink(ctx, id, true); return true;
}

/* ---------------- Heathcliff ---------------- */
function hcSheet(ctx) { return ctx.charSheetOf(ART.fixed && ART.fixed[HC_KEY] ? { hero: HC_KEY } : { shirt: '#3b3550', pants: '#2a2633', hair: '#1f1a20' }); }   /* sheet PixelLab chars.fixed.heathcliff; thiếu thì dáng dân thường */
function hcPortrait() { const f = ART.man && ART.man.ui && ART.man.ui.port_heathcliff; return typeof f === 'string' ? 'assets/px/' + f : null; }
function placeHc(ctx) {
  ST.hc = null; const S = ctx.S, m = S.map; if (!m || !m.sea || !m.dock || !ctx.NPC || !afterPrologue(ctx)) return;
  let at = null; for (const [dx, dy] of [[2, 2], [3, 2], [-2, 2], [2, 1], [3, 1]]) { const x = m.dock.x + dx, y = m.dock.y + dy; if (!ctx.isSolid(m, x, y) && !ctx.hasObjectAt(m, x, y)) { at = { x, y }; break; } }   /* bãi cát chân cầu tàu */
  if (!at) return;
  const n = new ctx.NPC({ staff: 'heathcliff', n: 'Heathcliff', tag: 'Heathcliff · CM' }, at.x * TS + 8, at.y * TS + 14, hcSheet(ctx), () => 0.5);   /* bảng tên kiểu 'Noxx · CM' */
  n.busy = true; n.radius = 0; n.staffStill = true; n.dir = 1;
  ST.hc = n; (S.staff ||= []).push(n);
}
function hcDialog(ctx, pages, onClose) {
  ctx.setMode('dialog');
  ctx.openDialog({ m: { n: 'Heathcliff · CM', k: 'Heathcliff · CM', id: 'heathcliff', friend: true, a: hcPortrait() || undefined, title: { vi: 'CM của Seismic · bán viên thở', en: 'Seismic CM · breath pills' }, ro: [] }, pages, onClose: () => { ctx.setMode('play'); if (onClose) onClose(); } });   /* chân dung PixelLab ui.port_heathcliff (thiếu thì khung chữ "H") */
}
function talkHc(ctx) {
  const u = sv(ctx), t = L(ctx), p = ctx.S.player; if (ST.hc) { p.faceTo(ST.hc.x, ST.hc.y); ST.hc.faceTo(p.x, p.y); }
  const pages = u.met ? [t.again[(u.talks = (u.talks || 0) + 1) % t.again.length]] : t.first;
  u.met = true; ctx.persist();
  hcDialog(ctx, pages, () => openShop(ctx));
}
const BS = 'width:auto;margin:0;padding:6px 10px;font-size:13px';
function renderShop(ctx) {
  const t = L(ctx), inv = ctx.S.save.inv || {}, u = sv(ctx), port = hcPortrait();
  const row = id => { const P = PILLS[id], can = (inv.stone || 0) >= P.price, ic = ART.man && ART.man.ui && ART.man.ui.items && ART.man.ui.items[id];
    return `<div class="hrow"><span class="hwho">${ic ? `<img src="assets/px/${ic}" alt="" style="width:32px;height:32px;image-rendering:pixelated;vertical-align:middle">` : ''} <b>${ctx.itemName(id)}</b> <span class="chip">${P.price} 🪨</span> <span class="dim">${t.secs(P.secs)}</span></span>`
      + `<span class="hnum"><b>×${inv[id] || 0}</b></span><button class="btn primary" data-pill="${id}" style="${BS}${can ? '' : ';opacity:.35;cursor:default'}"${can ? '' : ' disabled'}>${t.buy}</button></div>`; };
  const html = `<h2>${t.shopTitle}<span class="chip">🪨 ${inv.stone || 0}</span></h2>
    <div class="shopw"><div class="shop-side"><div class="shop-port">${port ? `<img src="${port}" alt="">` : `<img src="assets/px/ui/items/pill_l.png" alt="" style="image-rendering:pixelated">`}</div><p class="shop-say">${t.lead}</p></div>
    <div class="scroll shop-main">${row('pill_s')}${row('pill_l')}<p class="dim" style="margin:10px 0 4px">${t.have(Math.ceil(u.breath))}</p></div></div>
    <button class="btn" id="uw-close">${t.close}</button>`;
  const el = ctx.panel('uwshop', html); ST.shopEl = el; el.panel.classList.add('wide', 'shop'); el.hidden = false;
  el.querySelector('#uw-close').onclick = () => closeShop(ctx);
  for (const b of el.querySelectorAll('[data-pill]')) b.onclick = () => buyPill(ctx, b.dataset.pill);
}
function openShop(ctx) { ctx.setMode('uwshop'); ctx.registerCloser('uwshop', () => closeShop(ctx)); renderShop(ctx); }
function closeShop(ctx) { if (ST.shopEl) ST.shopEl.hidden = true; if (ctx.S.mode === 'uwshop') ctx.setMode('play'); }
function buyPill(ctx, id) {
  const t = L(ctx), inv = ctx.S.save.inv, P = PILLS[id]; if (!P) return;
  if ((inv.stone || 0) < P.price) { ctx.toast(t.poor); ctx.sfx('poor'); return; }
  inv.stone -= P.price; const h = ST.hc, p = ctx.S.player;
  ctx.give(id, 1, h ? (h.x + p.x) / 2 : undefined, h ? (h.y + p.y) / 2 + 4 : undefined);   /* rơi giữa Heathcliff và người chơi → tự hút vào thanh / túi */
  ctx.persist(); ctx.sfx('buy'); ctx.toast(t.bought(pillName(ctx, id)));
  renderShop(ctx);
}

/* ---------------- điểm lặn ở Biển + bảng chọn tầng (B1: lặn thẳng xuống tầng đã tới) ---------------- */
const diveAt = ctx => { const d = ctx.S.map && ctx.S.map.dive; return d && afterPrologue(ctx) ? { x: d.x * TS + 8, y: d.y * TS + 8 } : null; };
function whirlImg(ctx) {
  const sp = ctx.ART && ctx.ART.packs && ctx.ART.packs.sea, w = sp && sp.creatures && sp.creatures.whirl; if (!w || !w[0]) return null;
  return Array.isArray(w[0]) ? w[0][0] : w[0];
}
function drawWhirl(g, ctx, x, y, r, spin, glow) {   /* ảnh xoáy PixelLab (gói Biển) xoay chậm + quầng sáng tĩnh (không nhấp nháy) */
  const im = whirlImg(ctx);
  if (glow) { g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = 'rgba(90,220,255,.20)'; g.beginPath(); g.ellipse(x, y, r * 1.25, r * 0.8, 0, 0, TAU); g.fill(); g.restore(); }
  if (im) { g.save(); g.translate(x, y); g.scale(1, 0.7); g.rotate(-spin); const s = (r * 2) / (im.width || 32); g.drawImage(im, -im.width * s / 2, -im.height * s / 2, im.width * s, im.height * s); g.restore(); }
  else { g.strokeStyle = 'rgba(200,245,255,.8)'; g.lineWidth = 1; for (let k = 0; k < 3; k++) { g.beginPath(); g.ellipse(x, y, r * (0.4 + k * 0.25), r * (0.25 + k * 0.17), spin + k, 0, TAU); g.stroke(); } }
  if (glow) { g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = 'rgba(120,240,255,.16)'; g.beginPath(); g.ellipse(x, y, r * 0.55, r * 0.35, 0, 0, TAU); g.fill(); g.restore(); }
}
function diveTo(ctx, id) {
  if (!ZONES[id] || !ensureBreath(ctx)) return false;
  closeMenu(ctx); ctx.sfx('dive'); ctx.travel(id, 'default'); return true;
}
function dive(ctx) { const fl = reachedFloors(ctx); if (fl.length <= 1) diveTo(ctx, 'u1'); else openMenu(ctx); }
function renderMenu(ctx) {
  const t = L(ctx), u = sv(ctx), inv = ctx.S.save.inv || {};
  const rows = reachedFloors(ctx).map((id, i) => { const z = ZONES[id], b = bossName(ctx, id), down = !!u.gates[id];
    return `<div class="hrow"><span class="hwho"><b>${t.floor(FLOORS[id].n)} · ${zname(ctx, id)}</b> <span class="dim">${t.lv(z.uLv[0], z.uLv[1])}</span> <span class="chip">${down ? t.bossDown(b) : t.bossUp(b)}</span></span>`
      + `<button class="btn primary" data-floor="${id}" style="${BS}">${t.go} (${i + 1})</button></div>`; }).join('');   /* ✓ = đã hạ trùm canh cổng, 👑 = trùm còn canh */
  const html = `<h2>${t.menuTitle}<span class="chip">🫧 ${Math.ceil(u.breath)}s · 💊 ${(inv.pill_s || 0) + (inv.pill_l || 0)}</span></h2>
    <p class="dim" style="margin:0 0 8px">${t.menuLead}</p><div class="scroll">${rows}</div><button class="btn" id="uw-mclose">${t.close}</button>`;
  const el = ctx.panel('uwdive', html); ST.menuEl = el; el.hidden = false;
  el.querySelector('#uw-mclose').onclick = () => closeMenu(ctx);
  for (const b of el.querySelectorAll('[data-floor]')) b.onclick = () => diveTo(ctx, b.dataset.floor);
}
function openMenu(ctx) { ctx.setMode('uwdive'); ctx.registerCloser('uwdive', () => closeMenu(ctx)); renderMenu(ctx); }
function closeMenu(ctx) { if (ST.menuEl) ST.menuEl.hidden = true; if (ctx.S.mode === 'uwdive') ctx.setMode('play'); }

/* ---------------- dưới nước: người chơi bơi ---------------- */
function drawSwim(g, ent) {
  const x = Math.round(ent.x), y = Math.round(ent.y), tm = ST.t, bob = Math.round(Math.sin(tm * 2.4) * 1.2) - 3;
  g.fillStyle = 'rgba(0,25,45,.22)'; g.beginPath(); g.ellipse(x, y + 1, 7, 2.5, 0, 0, TAU); g.fill();   /* bóng trên đáy cát */
  const a = ent.action, acts = ent.sheet && ent.sheet.actions;
  if (a && acts && acts[a.name] && a.name !== 'swim') { const c = ent.custom; ent.custom = null; g.save(); g.translate(0, bob); ent.draw(g); g.restore(); ent.custom = c; return; }   /* chém / bị đánh vẫn hiện clip PixelLab dưới nước */
  const sw = acts && acts.swim;
  if (sw && sw.n >= 7) {
    const seq = ent.moving ? SWIM_LOOP : SWIM_IDLE, f = seq[Math.floor(tm * (ent.moving ? 9 : 3)) % seq.length], cw = sw.cw || 32, ch = sw.ch || 24;
    g.drawImage(sw.img, f * cw, (ent.dir & 3) * ch, cw, ch, x - (cw >> 1), y - 18 - (ch - 20) + bob, cw, ch); return;
  }
  g.drawImage(ent.sheet, (ent.moving ? ent.frame : 0) * 16, (ent.dir & 3) * 20, 16, 20, x - 8, y - 18 + bob, 16, 20);   /* dự phòng: sheet đi */
}
function applySwim(ctx) { const p = ctx.S.player; p.custom = drawSwim; p.passable = null; p.ghost = false; p.boxW = 10; p.boxH = 6; p.speedMul = ST.stun > 0 ? 0 : SWIM_SPEED; }
function restore(p) { if (p.custom === drawSwim) p.custom = null; p.speedMul = 1; p.passable = null; p.ghost = false; p.boxW = 10; p.boxH = 6; }

/* ---------------- cổng xoáy / rương / lỗ phun / đồ rải ---------------- */
const gateObj = ctx => ctx.S.map && ctx.S.map.objects.find(o => o.uwgate);
const gateOpen = (ctx, z = zid(ctx)) => !!sv(ctx).gates[z];
function openGate(ctx, quiet) {
  const u = sv(ctx), g = gateObj(ctx), t = L(ctx); u.gates[zid(ctx)] = true; ctx.persist();
  if (!g || g.type === 'uwgate') return;
  g.type = 'uwgate'; if (quiet) return;
  const cx = (g.x + 1) * TS, cy = (g.y + 1) * TS - 14;
  if (!vfx(ctx, 'u_gate', cx, cy + 14, true)) vfx(ctx, 'level_up', cx, cy + 14, true);
  ctx.quake && ctx.quake(0.4); ctx.sfx('gate_open'); ctx.toast(t.gateOpen, true);
}
function useGate(ctx) {
  const g = gateObj(ctx), t = L(ctx); if (!g) return;
  if (g.type !== 'uwgate') { ctx.toast(t.gateHint(bossName(ctx, zid(ctx)))); ctx.sfx('fail'); return; }
  const next = g.uwgate;
  if (!ZONES[next]) { ctx.toast(t.soon, true); ctx.sfx('splash'); return; }
  if (!ensureBreath(ctx)) return;
  ctx.sfx('dive'); bubbles(ctx, (g.x + 1) * TS, (g.y + 1) * TS - 6, 6); ctx.travel(next, 'default');
}
const DEFAULT_LOOT = { c1: [['stone', 8], ['pearl', 1], ['seagem', 1]], c2: [['stone', 10], ['pill_s', 1], ['shell', 2]] };
function openChest(ctx, o) {
  const u = sv(ctx), z = zid(ctx), t = L(ctx), list = (u.chests[z] ||= []); if (list.includes(o.uchest)) return;
  list.push(o.uchest); o.type = 'uchest_open'; ctx.persist();
  const x = o.x * TS + 8, y = (o.y + 1) * TS + 6, loot = o.loot || DEFAULT_LOOT[o.uchest] || DEFAULT_LOOT.c1;
  for (const [id, n] of loot) ctx.give(id, n, x, y);
  vfx(ctx, 'item_pickup_pop', x, y - 6, true); ctx.sfx('coin');
  ctx.toast(`${t.chestGot} ${loot.map(([id, n]) => `${ctx.itemIcon(id)}${n}`).join(' ')}`);
}
function seedPickups(ctx) {   /* đồ rải dưới đáy: ghi thẳng vào save.sys.drops[vùng] TRƯỚC khi hệ drops nạp (underwater đứng trước drops trong SYSTEMS) → nằm sẵn, 1 lần / save */
  const u = sv(ctx), z = zid(ctx), m = ctx.S.map; if (u.seeded[z] || !m.pickups || !m.pickups.length) return;
  const s = ctx.S.save, D = (s.sys.drops ||= {}), list = (D[z] ||= []);
  for (const [id, n, x, y] of m.pickups) { let tx = x, ty = y; if (ctx.isSolid(m, tx, ty)) { for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1]]) if (!ctx.isSolid(m, x + dx, y + dy)) { tx = x + dx; ty = y + dy; break; } }
    list.push({ id, n, x: tx * TS + 8, y: ty * TS + 10, b: 0 }); }
  u.seeded[z] = true;
}
function updateVents(dt, ctx) {
  const p = ctx.S.player, u = sv(ctx), t = L(ctx);
  for (const o of ctx.S.map.objects) {
    if (!o.vent) continue;
    if (o.spent > 0) { o.spent -= dt; if (o.spent <= 0) { o.spent = 0; o.type = 'vent'; } continue; }
    if (Math.hypot(o.x * TS + 8 - p.x, o.y * TS + 10 - p.y) > VENT_R || u.breath >= BREATH_CAP) continue;
    u.breath = Math.min(BREATH_CAP, u.breath + VENT_GIVE); ST.full = Math.max(ST.full, u.breath); o.spent = VENT_CD; o.type = 'vent_spent';
    ST.lowWarned = false; ST.outWarned = false; ctx.persist();
    bubbles(ctx, o.x * TS + 8, o.y * TS + 8, 8); ctx.sfx('bubbles'); ctx.toast(t.vent(VENT_GIVE));
  }
}

/* ---------------- cơ chế riêng từng tầng ---------------- */
const tileOf = v => Math.floor(v / TS);
function inKelp(ctx, x, y) { const m = ctx.S.map; if (!m || !m.kelp) return false; const tx = tileOf(x), ty = tileOf(y); return tx >= 0 && ty >= 0 && tx < m.w && ty < m.h && !!m.kelp[ty * m.w + tx]; }
function currentAt(ctx, x, y) { const m = ctx.S.map; if (!m || !m.current) return 0; const tx = tileOf(x), ty = tileOf(y); return tx >= 0 && ty >= 0 && tx < m.w && ty < m.h ? m.current[ty * m.w + tx] : 0; }
function updateCurrent(dt, ctx) {   /* u3: dòng chảy đẩy người (1 phải · 2 trái); bơi ngược dòng chậm hơn hẳn */
  const p = ctx.S.player, f = currentAt(ctx, p.x, p.y - 2); if (!f) return;
  p.tryMove((f === 1 ? 1 : -1) * CURRENT_SP * dt, 0, ctx.S.map, ctx.allNpcs());
  if (!ST.curWarn) { ST.curWarn = true; ctx.toast(L(ctx).current); }
}
function updateDots(dt, ctx) {   /* chảy máu / trúng độc: mất máu theo nhịp 1 s */
  for (let i = ST.dots.length - 1; i >= 0; i--) { const d = ST.dots[i]; d.t -= dt; if (d.t > 0) continue; d.t = 1; d.left--; if (ctx.hero) ctx.hero.hit(d.dmg); if (d.left <= 0) ST.dots.splice(i, 1); }
}

/* ---------------- hệ ---------------- */
export const underwater = {
  id: 'underwater',
  onZoneEnter(ctx) {
    ST.ctx = ctx; ST.placed = false; ST.hc = null; ST.drownT = 0.5; ST.lowWarned = false; ST.outWarned = false; ST.stun = 0; ST.fx = []; ST.saveT = 0;
    ST.ink = 0; ST.dots = []; ST.curWarn = false; ST.secretIn = false;
    if (ctx.S.mode === 'uwshop' || ctx.S.mode === 'uwdive') ctx.setMode('play');
    const u = sv(ctx); ST.full = Math.max(60, u.breath);
    ctx.uwGateOpen = z => gateOpen(ctx, z);
    ctx.onBossDown = key => { if (under(ctx)) openGate(ctx); };
    ctx.stunPlayer = sec => { if (!under(ctx)) return; ST.stun = Math.max(ST.stun, Math.min(STUN_MAX, sec)); ctx.S.player.autoPath = null; if (ST.t - ST.stunMsgT > 3) { ST.stunMsgT = ST.t; ctx.toast(L(ctx).stunned); } };
    ctx.faintTravel = () => { if (!under(ctx)) return false; ST.surfaced = true; restore(ctx.S.player); if (!ctx.travel('sea', 'back')) { ST.surfaced = false; return false; } return true; };
    /* B1: móc cho monsters.js — núp trong tảo (độ mờ), mực tối mắt, mất máu theo nhịp, câu chữ báo một lần */
    ctx.uwHide = mo => { const p = ctx.S.player; if (!under(ctx) || !inKelp(ctx, mo.x, mo.y)) return 1; return mo.angry || mo.st2 || Math.hypot(mo.x - p.x, mo.y - p.y) < 40 ? 0.9 : 0.16; };
    ctx.uwInk = sec => { if (!under(ctx)) return; ST.inkDur = Math.max(ST.ink > 0 ? ST.inkDur : 0, sec); ST.ink = Math.max(ST.ink, sec); once(ctx, 'ink', L(ctx).inked, false, 6); };
    ctx.uwDot = (kind, dmg, ticks) => { if (!under(ctx)) return; const d = ST.dots.find(o => o.kind === kind); if (d) { d.left = Math.max(d.left, ticks); d.dmg = Math.max(d.dmg, dmg); } else ST.dots.push({ kind, dmg: Math.max(1, Math.round(dmg)), left: ticks, t: 1 }); once(ctx, kind, kind === 'poison' ? L(ctx).poison : L(ctx).bleed, false, 6); };
    ctx.uwSay = (key, txt, big, gap) => once(ctx, key, txt, big, gap);
    if (!ST.icon && typeof Image !== 'undefined') { const f = ART.man && ART.man.ui && ART.man.ui.items && ART.man.ui.items.st_breath; if (f) { ST.icon = new Image(); ST.icon.src = 'assets/px/' + f; } }
    if (under(ctx)) {
      applySwim(ctx);
      const m = ctx.S.map, z = zid(ctx), opened = u.chests[z] || [];
      if (FLOORS[z] && !u.reached.includes(z)) { u.reached.push(z); ctx.persist(); }
      for (const o of m.objects) { if (o.uchest && opened.includes(o.uchest)) o.type = 'uchest_open'; }
      if (gateOpen(ctx) || ctx.S.save.entry === 'back') openGate(ctx, true);   /* từ tầng dưới lên (entry back) thì cổng luôn mở — không bao giờ kẹt */
      seedPickups(ctx);
      if (m.cave) setTimeout(() => once(ctx, 'dark', L(ctx).dark, false, 60), 1400);
      else if (m.kelp) setTimeout(() => once(ctx, 'kelp', L(ctx).kelp, false, 60), 1400);
    } else if (ST.surfaced && ctx.S.map && ctx.S.map.sea) { ST.surfaced = false; setTimeout(() => ctx.toast(L(ctx).up, true), 900); }
    if (typeof window !== 'undefined') window.__uw = {
      state: () => ({ zone: zid(ctx), under: under(ctx), breath: +sv(ctx).breath.toFixed(2), gates: { ...sv(ctx).gates }, chests: JSON.parse(JSON.stringify(sv(ctx).chests)), reached: reachedFloors(ctx), secrets: { ...sv(ctx).secrets }, stun: +ST.stun.toFixed(2), mode: ctx.S.mode, speedMul: ctx.S.player.speedMul, swim: ctx.S.player.custom === drawSwim, atkMul: ctx.atkMul ? ctx.atkMul() : 1, ink: +ST.ink.toFixed(2), dots: ST.dots.map(d => ({ ...d })) }),
      hc: () => ST.hc && { x: ST.hc.x, y: ST.hc.y }, dive: () => diveAt(ctx), setBreath: s => { sv(ctx).breath = s; ST.full = Math.max(60, s); return s; }, drink: id => drink(ctx, id), openGate: () => openGate(ctx), diveTo: id => diveTo(ctx, id),
      gate: () => { const g = gateObj(ctx); return g && { x: g.x, y: g.y, type: g.type, open: gateOpen(ctx), to: g.uwgate }; },
      vents: () => ctx.S.map.objects.filter(o => o.vent).map(o => ({ x: o.x, y: o.y, spent: +(o.spent || 0).toFixed(1), type: o.type })),
      chests: () => ctx.S.map.objects.filter(o => o.uchest).map(o => ({ id: o.uchest, x: o.x, y: o.y, type: o.type })),
      secret: () => ctx.S.map.secret || null, current: (x, y) => currentAt(ctx, x, y), kelp: (x, y) => inKelp(ctx, x, y), pickups: () => (ctx.S.map.pickups || []).slice(),
      darkness: () => !!(ctx.S.map && ctx.S.map.cave), lamp: () => LAMP_R,
    };
  },
  onZoneLeave(ctx) { if (ctx.S.mode === 'uwshop') closeShop(ctx); if (ctx.S.mode === 'uwdive') closeMenu(ctx); restore(ctx.S.player); ST.hc = null; ST.stun = 0; ST.fx = []; ST.ink = 0; ST.dots = []; ctx.persist(); },
  update(dt, ctx) {
    ST.t += dt; ST.ctx = ctx;
    if (!ST.placed && ctx.S.map) { ST.placed = true; try { placeHc(ctx); } catch (e) { console.error('underwater hc', e); } }
    for (let i = ST.fx.length - 1; i >= 0; i--) { const b = ST.fx[i]; b.t += dt; b.y += b.vy * dt; if (b.t >= b.life) ST.fx.splice(i, 1); }
    if (!under(ctx)) return;
    const p = ctx.S.player, u = sv(ctx), t = L(ctx), play = ctx.S.mode === 'play', m = ctx.S.map;
    if (ST.stun > 0) ST.stun -= dt;
    if (ST.ink > 0) ST.ink -= dt;
    applySwim(ctx);   /* hệ khác (chụp ảnh…) có thể vừa gỡ dáng bơi → gắn lại mỗi khung */
    if (!play || (ctx.hero && ctx.hero.fainted)) return;
    u.breath = Math.max(0, u.breath - dt);
    if ((ST.saveT -= dt) <= 0) { ST.saveT = 3; ctx.persist(); }
    if (u.breath <= LOW && u.breath > 0 && !ST.lowWarned) { ST.lowWarned = true; ctx.toast(pickPill(ctx) ? t.low : t.lowNo, true); ctx.sfx('warn'); }
    if (u.breath <= LOW && (ST.lowBubT -= dt) <= 0) { ST.lowBubT = 0.35; bubbles(ctx, p.x + (Math.random() - 0.5) * 6, p.y - 16, 2); }   /* ≤ 10 s: bọt khí trồi lên */
    if (u.breath <= 0) {
      if (!ST.outWarned) { ST.outWarned = true; ctx.toast(t.out, true); }
      if ((ST.drownT -= dt) <= 0) { ST.drownT = DROWN_EVERY; if (ctx.hero) ctx.hero.hit(Math.max(5, Math.round(ctx.hero.max * DROWN_PCT))); }
    } else ST.drownT = Math.min(ST.drownT, 0.5);
    if (p.moving && (ST.bubT -= dt) <= 0) { ST.bubT = 0.55; bubbles(ctx, p.x + (p.dir === 1 ? 5 : p.dir === 2 ? -5 : 0), p.y - 12, 1); }   /* bọt khi bơi */
    updateVents(dt, ctx);
    if (m.current) updateCurrent(dt, ctx);
    if (ST.dots.length) updateDots(dt, ctx);
    const sc = m.secret, z = zid(ctx);   /* góc bí mật: báo lần đầu bơi vào */
    if (sc) { const tx = tileOf(p.x), ty = tileOf(p.y), inside = tx >= sc.x && ty >= sc.y && tx < sc.x + sc.w && ty < sc.y + sc.h;
      if (inside && !ST.secretIn) { ST.secretIn = true; if (!u.secrets[z]) { u.secrets[z] = true; ctx.persist(); ctx.toast(t.secret, true); ctx.sfx('win'); vfx(ctx, 'item_pickup_pop', p.x, p.y - 8, true); } }
      else if (!inside) ST.secretIn = false; }
  },
  near(ctx) {
    const p = ctx.S.player, t = L(ctx), u = sv(ctx), m = ctx.S.map; if (!p || !m) return null;
    if (ST.hc && Math.hypot(ST.hc.x - p.x, ST.hc.y - p.y) < 26) return { label: t.talk, x: ST.hc.x, y: ST.hc.y, limit: 28, priority: 4, data: { hc: true } };   /* x,y = điểm lõi tính khoảng cách → khớp đúng phép thử ở trên */
    const d = m.sea && diveAt(ctx); if (d && Math.hypot(d.x - p.x, d.y - p.y) < 40) { const fl = reachedFloors(ctx); return { label: `${fl.length > 1 ? t.diveAny : t.dive(zname(ctx, 'u1'))} · 🫧 ${Math.ceil(u.breath)}s`, x: d.x, y: d.y, limit: 42, priority: 2, data: { dive: true } }; }
    if (under(ctx)) {
      const g = gateObj(ctx);
      if (g) { const gx = (g.x + 1) * TS, gy = (g.y + 1) * TS + 6; if (Math.hypot(gx - p.x, gy - p.y) < 30) { const nx = g.uwgate, lbl = g.type !== 'uwgate' ? t.gateSealed : FLOORS[nx] ? t.gateGo(FLOORS[nx].n, zname(ctx, nx)) : t.gateKraken; return { label: lbl, x: gx, y: gy, limit: 32, priority: 1.5, data: { gate: true } }; } }
      let best = null, bd = 26; for (const o of m.objects) { if (!o.uchest || o.type !== 'uchest') continue; const dd = Math.hypot(o.x * TS + 8 - p.x, (o.y + 1) * TS + 4 - p.y); if (dd < bd) { bd = dd; best = o; } }
      if (best) return { label: t.chest, x: best.x * TS + 8, y: (best.y + 1) * TS + 4, limit: 28, priority: 1.5, data: { chest: best } };
    }
    const held = ctx.held ? ctx.held() : null;   /* cầm viên thở (hoặc dưới nước sắp hết hơi mà túi còn viên) → E vào chỗ trống = uống */
    const id = held && PILLS[held] ? held : under(ctx) && u.breath <= 20 ? pickPill(ctx) : null;
    if (id && ctx.bag.has(id, 1)) return { label: `${t.drink(pillName(ctx, id))} (+${PILLS[id].secs}s)`, x: p.x, y: p.y - 10, limit: 999, priority: -1, mouse: false, data: { drink: id } };
    return null;
  },
  interact(ctx, cand) {
    const d = cand && cand.data; if (!d || ctx.S.mode !== 'play') return;
    if (d.hc) talkHc(ctx);
    else if (d.dive) dive(ctx);
    else if (d.drink) drink(ctx, d.drink);
    else if (d.chest) openChest(ctx, d.chest);
    else if (d.gate) useGate(ctx);
  },
  onKey(ctx, code) {   /* bảng chọn tầng: phím 1–4 */
    if (ctx.S.mode !== 'uwdive') return false;
    const k = /^Digit([1-4])$/.exec(code || ''); if (!k) return false;
    const fl = reachedFloors(ctx), id = fl[+k[1] - 1]; if (id) diveTo(ctx, id); return true;
  },
  drawGround(g, ctx, cx, cy) {
    const m = ctx.S.map; if (!m) return;
    const d = m.sea && diveAt(ctx);   /* vòng xoáy lặn: nằm trên mặt nước, dưới mọi nhân vật */
    if (d) { const x = d.x - cx, y = d.y - cy; if (x > -40 && y > -40 && x < ctx.VW + 40 && y < ctx.VH + 40) drawWhirl(g, ctx, x, y, 13, ST.t * 0.8, true); }
    const cur = m.current && ART.vfx && ART.vfx.u_current;   /* u3: vệt dòng chảy PixelLab trôi theo hướng, rất nhạt, thưa (không nhấp nháy) */
    if (cur) {
      const x0 = Math.max(0, tileOf(cx) - 2), y0 = Math.max(0, tileOf(cy)), x1 = Math.min(m.w - 1, tileOf(cx + ctx.VW) + 1), y1 = Math.min(m.h - 1, tileOf(cy + ctx.VH) + 1);
      for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
        if ((tx + ty * 2) % 4 || ty % 2) continue; const f = m.current[ty * m.w + tx]; if (!f) continue;
        const fr = (Math.floor(ST.t * (cur.fps || 12)) + tx * 3 + ty) % cur.n;
        sheetFrame(g, cur, fr, tx * TS + 8 - cur.w / 2 - cx, ty * TS + 8 - cur.h / 2 - cy, f === 2, 0.32);
      }
    }
  },
  drawables(ctx, cx, cy) {
    if (!under(ctx)) return [];
    const out = [], m = ctx.S.map, g = ctx.g, p = ctx.S.player;
    const g0 = gateObj(ctx);
    if (g0 && g0.type === 'uwgate') {
      const by = (g0.y + 1) * TS, x = g0.x * TS + 16 - cx, y = by - 32 + 17 - cy;   /* tâm lỗ vòng đá (đo trên ảnh PixelLab 64×64: x 15,5 · y 17 logic) */
      out.push({ y: by + 0.5, f: () => { g.save(); g.beginPath(); g.ellipse(x, y, 6.5, 5.6, 0, 0, TAU); g.clip(); drawWhirl(g, ctx, x, y + 0.5, 9, ST.t * 0.8, true); g.restore(); } });
    }
    if (m.kelp) {   /* u2: tảo cao tự vẽ — người chơi bơi ra sau tảo thì tảo mờ đi cho thấy mình */
      const d = ctx.O && ctx.O.tallkelp; if (!d || !d.img) return out;
      const w = d.w, h = d.h, psx = p.x, psy = p.y;
      for (const o of m.objects) {
        if (!o.kelp) continue; const bx = o.x * TS + 8, by = (o.y + 1) * TS;
        if (bx < cx - 20 || bx > cx + ctx.VW + 20 || by < cy - 4 || by - h > cy + ctx.VH) continue;
        const behind = psy < by && psy > by - h - 4 && Math.abs(psx - bx) < w / 2 + 4, flip = (o.x * 7 + o.y * 3) % 2 === 1;
        out.push({ y: by - 1, f: () => { g.save(); g.globalAlpha = behind ? 0.42 : 1; const dx = Math.round(bx - w / 2 - cx), dy = Math.round(by - h - cy) + 2;
          if (flip) { g.translate(dx + w, dy); g.scale(-1, 1); g.drawImage(d.img, 0, 0, w, h); } else g.drawImage(d.img, dx, dy, w, h); g.restore(); } });
      }
    }
    return out;
  },
  draw(g, ctx, cx, cy) {
    if (ST.fx.length) { g.strokeStyle = 'rgba(230,248,255,.85)'; g.lineWidth = 1; for (const b of ST.fx) { g.globalAlpha = Math.max(0, 1 - b.t / b.life); g.beginPath(); g.arc(Math.round(b.x + Math.sin(b.t * 6 + b.ph) * 2) - cx, Math.round(b.y) - cy, b.r, 0, TAU); g.stroke(); } g.globalAlpha = 1; }
    if (!under(ctx)) return;
    const VW = ctx.VW, VH = ctx.VH, m = ctx.S.map, p = ctx.S.player;
    if (!m.cave) {   /* tia nắng xiên rất nhạt, trôi chậm (không nhấp nháy); hang tối thì không có */
      g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = m.kelp ? 'rgba(200,255,170,.035)' : 'rgba(160,240,255,.045)';
      for (let i = 0; i < 4; i++) { const x = ((ST.t * 2.5 + i * 113) % (VW + 120)) - 60; g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 30, 0); g.lineTo(x - 18, VH); g.lineTo(x - 48, VH); g.closePath(); g.fill(); }
      g.restore();
    }
    if (m.kelp) { const gr = g.createRadialGradient(VW / 2, VH / 2, VH * 0.35, VW / 2, VH / 2, VH * 0.85); gr.addColorStop(0, 'rgba(10,40,20,0)'); gr.addColorStop(1, 'rgba(10,40,20,.38)'); g.fillStyle = gr; g.fillRect(0, 0, VW, VH); }   /* u2: tảo che bớt tầm nhìn ở rìa */
    if (m.cave) {   /* u4: bóng tối với các lỗ sáng (đèn người chơi, pha lê, lỗ phun khí, cổng xoáy đã mở, mồi Cá Đèn Lồng) */
      if (!ST.darkCv || ST.darkCv.width !== VW || ST.darkCv.height !== VH) { ST.darkCv = document.createElement('canvas'); ST.darkCv.width = VW; ST.darkCv.height = VH; }
      const d = ST.darkCv.getContext('2d');
      d.globalCompositeOperation = 'source-over'; d.clearRect(0, 0, VW, VH); d.fillStyle = 'rgba(3,5,18,.88)'; d.fillRect(0, 0, VW, VH);
      d.globalCompositeOperation = 'destination-out';
      const hole = (x, y, r, soft = 0.5) => { const sx = x - cx, sy = y - cy; if (sx < -r || sy < -r || sx > VW + r || sy > VH + r) return; const gr = d.createRadialGradient(sx, sy, r * 0.12, sx, sy, r); gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(soft, 'rgba(0,0,0,.8)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); d.fillStyle = gr; d.fillRect(sx - r, sy - r, r * 2, r * 2); };
      hole(p.x, p.y - 10, LAMP_R, 0.55);
      for (const o of m.objects) { const r = o.type === 'gcrystal' ? 58 : o.glow ? 40 : o.vent ? (o.type === 'vent' ? 22 : 12) : o.type === 'uwgate' ? 34 : 0; if (!r) continue; const def = ctx.O && ctx.O[o.type], fw = def ? def.fw : 1; hole(o.x * TS + fw * 8, (o.y + 1) * TS - 8, r, 0.45); }
      for (const mo of (ctx.monsters && ctx.monsters.list()) || []) { if (mo.lure) hole(mo.lure.x, mo.lure.y, mo.lure.r || 24, 0.4); if (mo.c && mo.c.boss && mo.c.glowR) hole(mo.x, mo.y - 10, mo.c.glowR, 0.4); }
      g.drawImage(ST.darkCv, 0, 0);
    }
    if (ST.ink > 0) {   /* mực Mực Ma: tối dần rất nhanh, giữ, rồi sáng lại chậm — một lần, không nhấp nháy */
      const el = ST.inkDur - ST.ink, a = INK_A * Math.min(1, el / INK_IN, ST.ink / INK_OUT);
      const gr = g.createRadialGradient(VW / 2, VH / 2, VH * 0.12, VW / 2, VH / 2, VH * 0.75); gr.addColorStop(0, `rgba(14,6,26,${(a * 0.55).toFixed(3)})`); gr.addColorStop(1, `rgba(14,6,26,${Math.min(0.85, a * 1.45).toFixed(3)})`);
      g.fillStyle = gr; g.fillRect(0, 0, VW, VH);
    }
  },
  drawUI(ug, ctx, cx, cy, scale) {
    if (!under(ctx) || (ctx.S.mode !== 'play' && ctx.S.mode !== 'menu')) return;
    const u = sv(ctx), t = L(ctx), W = ug.canvas.width, fs = Math.max(12, Math.round(scale * 4)), bw = Math.min(W * 0.36, 300), bh = Math.max(10, Math.round(scale * 3.2));
    const bx = Math.round((W - bw) / 2), by = Math.max(58, Math.round(scale * 19)), low = u.breath <= LOW, k = Math.max(0, Math.min(1, u.breath / Math.max(1, ST.full))), isz = Math.round(fs * 1.5);
    ug.save(); ug.imageSmoothingEnabled = false;
    ug.fillStyle = 'rgba(13,11,20,.75)'; ug.beginPath(); ug.roundRect(bx - 12, by - fs * 1.5, bw + 24, bh + fs * 2.9, 8); ug.fill();
    if (low) { ug.strokeStyle = '#ff4d4d'; ug.lineWidth = 2; ug.stroke(); }
    ug.font = `bold ${Math.round(fs * 0.95)}px VT323, monospace`; ug.textAlign = 'center'; ug.textBaseline = 'middle';
    const label = `${t.breath} · ${Math.ceil(u.breath)}s`, tw = ug.measureText(label).width;
    if (ST.icon && ST.icon.complete && ST.icon.naturalWidth) ug.drawImage(ST.icon, Math.round(W / 2 - tw / 2 - isz - 4), Math.round(by - fs * 0.75 - isz / 2), isz, isz);
    ug.fillStyle = low ? '#ff6b6b' : '#dff6ff'; ug.fillText(label, W / 2, by - fs * 0.7);
    ug.fillStyle = '#2b2440'; ug.beginPath(); ug.roundRect(bx, by, bw, bh, bh / 2); ug.fill();
    ug.fillStyle = low ? '#ff4d4d' : k > 0.5 ? '#5cd6ff' : '#ffb347'; ug.beginPath(); ug.roundRect(bx, by, Math.max(bh, bw * k), bh, bh / 2); ug.fill();
    ug.font = `${Math.max(10, Math.round(scale * 2.8))}px VT323, monospace`; ug.fillStyle = '#ffb3a0'; ug.fillText(t.atk, W / 2, by + bh + fs * 0.75);
    ug.restore();
  },
  hudLines(ctx) {
    const u = sv(ctx), t = L(ctx);
    if (under(ctx)) return [`🫧 ${Math.ceil(u.breath)}s`, `⚔ ${t.atk}`];   /* 🫧 → icon PixelLab st_breath (hud.js) */
    return u.breath > 0 && zid(ctx) !== 'trench' ? [`🫧 ${Math.ceil(u.breath)}s`] : [];
  },
};

/* chuột phải khi đang cầm viên thở = uống (hotbar.js chỉ ăn đồ 'food'; bắt sự kiện ở pha capture trước canvas) */
if (typeof window !== 'undefined' && !window.__uwRC) {
  window.__uwRC = true;
  window.addEventListener('contextmenu', e => { const c = ST.ctx; if (!c || !c.S || c.S.mode !== 'play' || !c.held) return; const id = c.held(); if (!PILLS[id]) return; e.preventDefault(); e.stopPropagation(); drink(c, id); }, true);
  window.addEventListener('keydown', e => { const c = ST.ctx; if (!c || !c.S || c.S.mode !== 'uwdive') return; if (underwater.onKey(c, e.code)) { e.preventDefault(); e.stopPropagation(); } }, true);   /* bảng chọn tầng: phím 1–4 */
}
