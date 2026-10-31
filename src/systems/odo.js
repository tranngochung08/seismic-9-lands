// odo.js — plan-57 "Ở Dơ" (nháp _wip/p57): gã trọc cơ bắp lè lưỡi, người bẩn thỉu, rình người chơi để HÚT KINH NGHIỆM.
//  · Thỉnh thoảng hiện ở vùng có quái (M1–M9, đèo) khi người chơi cấp ≥ 5; tối đa 1 gã; sinh ngoài màn hình rồi RÌNH ở xa:
//    bị nhìn / bị lại gần → chạy nấp sau cây, đá (phía bắc vật cao → vật che người), lâu lâu ló ra cười khúc khích.
//  · Người chơi hạ quái khi Ở Dơ cách xác ≤ STEAL_R px → gã hút STEAL_PCT số KN (người chơi vẫn nhận phần còn lại):
//    viên KN bay từ xác tới gã, '+X' trên đầu gã, tên 'Ở Dơ · đã hút N KN'. Kho tối đa STASH_CAP (save.sys.odo.stash).
//  · Đánh gã → gã đánh lại bằng clip Hợp Thể (combo 3 đòn, lướt đấm, dậm đất); máu theo cấp người chơi; < FLEE_AT máu → bỏ chạy,
//    chạy thoát (FLEE_T) thì biến mất, GIỮ kho cho lần sau. Hạ gã → trả HẾT kho + PAYOUT_BONUS, nổ viên KN, chữ 'Đòi lại N KN!'.
//  · Ảnh: tools/px-p57odo.py đổi màu da ảnh Hợp Thể dạng thường (n_*) sang tông bẩn → assets/px/odo/o_<clip>.png (5 hàng S/SE/E/N/NE × 8 khung,
//    52 px thật = 26 px logic; Tây = lật Đông); ảnh thô KHÔNG __hi → vẽ 9 tham số, toạ độ nguồn THẬT, đích logic.
//    VFX PixelLab (vfx_workbench): orb.png (viên KN 8 khung 35×17), burst.png (nổ trả KN 10 khung 50×58) — vẽ ½ cỡ (cùng mật độ pixel sprite 2×).
//  · Móc: ctx.xpTax(mo, xp) → số KN bị hút (monsters.js killMonster gọi trước khi cộng KN). Save MỚI: save.sys.odo (save cũ không có → mặc định).
//  · Hiệu ứng chỉ theo sự kiện (hút, trúng đòn, dậm, trả KN); không có VFX lặp.
import { WATER } from '../anim.js';

/* ---------------- hằng số chỉnh được ---------------- */
const MIN_LV = 5;                 /* cấp người chơi tối thiểu để Ở Dơ xuất hiện */
const ZONES_OK = /^(m[1-9]|road[1-9])$/;   /* vùng có quái (không Làng, Biển, sân đấu, khe nứt trùm, dưới nước, trời) */
const FIRST_DELAY = [50, 110];    /* giây sau khi vào vùng mới bắt đầu thử cho hiện */
const CHECK_EVERY = 30, APPEAR_P = 0.3, APPEAR_P_STASH = 0.45;   /* mỗi 30 s thử 1 lần; có kho thì hay quay lại hơn */
const STAY_T = 240;               /* rình tối đa 4 phút rồi tự bỏ đi (giữ kho) */
const STEAL_PCT = 0.2, STEAL_R = 200, STASH_CAP = 3000, PAYOUT_BONUS = 0.1, KILL_XP_PER_LV = 4;   /* KILL_XP: thưởng nhỏ khi hạ gã (kể cả kho rỗng), 0 = tắt */
const HP_BASE = 200, HP_PER_LV = 170, DMG_BASE = 6, DMG_PER_LV = 0.6;   /* đo p57_ttk (cấp 15, kiếm 3, Rocky 20, không hồi máu): mục tiêu hạ trong 25–35 s mà không ngất */
const HIDE_MIN = 80, HIDE_MAX = 185, TOO_CLOSE = 70, SPOT_R = 200, CAUGHT_D = 34;   /* khoảng cách chỗ nấp tới người chơi; lại gần < 70 px → đổi chỗ nấp */
const SNEAK_SP = 46, SCAMPER_SP = 64, FIGHT_SP = 92, FLEE_SP = 66, DASH_SP = 280;   /* người chơi đi 84 px/s: chạy trốn chậm hơn → đuổi kịp */
const FLEE_AT = 0.3, FLEE_T = 16, FLEE_GONE_D = 150, FLEE_RUN = 2.4, FLEE_REST = 0.8;   /* chạy trốn FLEE_SP 66 < người 84: đuổi riết thì kịp */
const REACH = 20, COMBO_DUR = [0.32, 0.32, 0.48], DASH_WIND = 0.42, DASH_GO = 0.34, STOMP_WIND = 0.42, STOMP_R = 36;
const DASH_CD = 3.2, STOMP_CD = 4.5, COMBO_CD = 0.8;
const BUBBLE_T = 1.8, PEEK_T = 1.3, HEAD_H = 12;   /* ló đầu 1,3 s; phần đầu + vai cao 12 px logic */

const ROWS = { S: 0, SE: 1, E: 2, N: 3, NE: 4 }, CELL = 52, L = 26, FOOT = 24;
const ROW8 = [ROWS.E, ROWS.SE, ROWS.S, ROWS.SE, ROWS.E, ROWS.NE, ROWS.N, ROWS.NE];   /* khu 8 hướng: 0 Đ,1 ĐN,2 N,3 TN,4 T,5 TB,6 B,7 ĐB (Tây = lật Đông) */
const vi = ctx => ctx.lang() === 'vi';
const STR = {
  vi: { name: 'Ở Dơ', stolen: n => `đã hút ${n} KN`, back: n => `Đòi lại ${n} KN!`, appear: 'Có ai đó đang rình bạn… người bốc mùi lắm.', gone: 'Ở Dơ chuồn mất — mang theo số KN đã hút!',
    left: 'Ở Dơ lủi đi chỗ khác (vẫn giữ số KN đã hút).', down: n => `💥 Hạ Ở Dơ! Đòi lại ${n} kinh nghiệm`, empty: 'Ở Dơ chưa kịp hút gì… lần sau nhé!',
    steal: ['Hí hí, cảm ơn nha!', 'Ngon quá~', 'Của chùa!', 'Hút hút…', 'Ăn chực tí nha~'], hide: ['Ối!', 'Suỵt…', 'Không thấy tui đâu…', 'Tui là cái cây…'],
    peek: ['Hí hí…', 'Khè khè…', '(ló đầu)'], fight: ['Đánh tui hả?!', 'Ui da!', 'Ê ê ê!'], flee: ['Chuồn thôi!', 'Không chơi nữa!'], pant: ['Hộc… hộc…', 'Mệt quá…', 'Tha tui đi!'], taunt: ['Hê hê, yếu xìu!'] },
  en: { name: 'Grubby', stolen: n => `sucked ${n} XP`, back: n => `Took back ${n} XP!`, appear: 'Someone is stalking you… and they smell awful.', gone: 'Grubby got away — with the XP he sucked!',
    left: 'Grubby wandered off (still holding the XP he sucked).', down: n => `💥 Defeated Grubby! Took back ${n} XP`, empty: 'Grubby had not stolen anything yet… next time!',
    steal: ['Hee hee, thanks!', 'Yummy~', 'Free snacks!', 'Slurp…', 'Just a little bite~'], hide: ['Eep!', 'Shh…', 'You can\'t see me…', 'I am a tree…'],
    peek: ['Hee hee…', 'Snrk…', '(peeks)'], fight: ['You hit ME?!', 'Ouch!', 'Hey hey hey!'], flee: ['I\'m outta here!', 'Not fun anymore!'], pant: ['Huff… puff…', 'So tired…', 'Spare me!'], taunt: ['Heh, so weak!'] },
};
const tr = ctx => STR[vi(ctx) ? 'vi' : 'en'];
const pick = a => a[(Math.random() * a.length) | 0];
const sv = ctx => { const s = ctx.S.save; s.sys ||= {}; const o = (s.sys.odo ||= {}); o.stash ??= 0; o.steals ??= 0; o.beaten ??= 0; o.met ??= 0; o.escaped ??= 0; return o; };
const ST = { mo: null, orbs: [], fx: [], downs: [], bub: null, nextT: 0, log: [], ctx: null, cfgFast: 0 };
const log = s => { ST.log.push(s); if (ST.log.length > 80) ST.log.shift(); };
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const heroLv = ctx => (ctx.hero ? ctx.hero.lv : 1);

/* ---------------- ảnh ---------------- */
const IMG = {};
function img(src) { if (!IMG[src]) { const i = new Image(); i.src = 'assets/px/odo/' + src; IMG[src] = i; } const i = IMG[src]; return i.complete && i.naturalWidth ? i : null; }
const CLIPS = ['idle', 'walk', 'attack1', 'attack2', 'attack3', 'dash', 'stomp', 'cast', 'hurt', 'faint'];
function preload() { for (const c of CLIPS) img(`o_${c}.png`); img('orb.png'); img('burst.png'); img('icon.png'); img('stink.png'); img('flies.png'); }
const face8 = (dx, dy) => ((Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) % 8) + 8) % 8;

/* ---------------- vùng / chỗ nấp ---------------- */
function eligible(ctx) {
  const S = ctx.S, z = S.zone && S.zone.id; if (!z || !ZONES_OK.test(z) || !ctx.monsters || !ctx.monsters.add) return false;
  if (S.map.sky || S.map.under || S.map.sea || S.map.arena || S.map.dungeon) return false;
  if (heroLv(ctx) < MIN_LV) return false;
  if (ctx.sparFoe && ctx.sparFoe()) return false;   /* đang đấu bạn tập ở đèo */
  return true;
}
const TS = 16;
function walkable(ctx, x, y) { const m = ctx.S.map, tx = Math.floor(x / TS), ty = Math.floor(y / TS); if (tx < 1 || ty < 1 || tx >= m.w - 1 || ty >= m.h - 1) return false; if (ctx.isSolid(m, tx, ty)) return false; if (WATER.depth && WATER.depth(x, y) > 0) return false; return true; }
const inPlot = (ctx, x, y) => !!(ctx.plotOf && ctx.plotOf(Math.floor(x / TS), Math.floor(y / TS)));
function spots(ctx) {   /* chỗ nấp: ngay phía bắc chân vật cao (cây, đá to…) → vật vẽ sau, che người */
  const m = ctx.S.map; if (ST.spotMap === m) return ST.spots; const out = [];
  for (const o of m.objects) {
    const d = ctx.O[o.type]; if (!d || o.ruined || d.solid === false || (d.h || 0) < 28 || (d.w || 0) < 20) continue;
    const x = o.x * TS + d.fw * 8, y = o.y * TS - 1; if (!walkable(ctx, x, y) || inPlot(ctx, x, y)) continue;
    if (ctx.isSolid(m, o.x - 1, o.y) || ctx.isSolid(m, o.x + d.fw, o.y) || ctx.isSolid(m, o.x - 1, o.y - 1) || ctx.isSolid(m, o.x + d.fw, o.y - 1)) continue;   /* hai bên phải trống: ló ra là thấy (không nấp giữa rừng rậm viền) */
    out.push({ x, y, o, w: d.w, base: (o.y + d.fh) * TS });
  }
  const tall = m.objects.map(o => ({ o, d: ctx.O[o.type] })).filter(q => q.d && (q.d.h || 0) >= 24);   /* bỏ chỗ có vật cao NGAY PHÍA NAM (che luôn cái đầu ló ra) */
  const ok = out.filter(s => !tall.some(q => q.o !== s.o && (q.o.y + q.d.fh) * TS > s.base && (q.o.y + q.d.fh) * TS <= s.base + 40 && Math.abs(q.o.x * TS + q.d.fw * 8 - s.x) < (q.d.w || 16) / 2 + s.w / 2 + 6));
  ST.spotMap = m; ST.spots = ok; return ok;
}
function view(ctx) {   /* khung nhìn (toạ độ thế giới): gã rình TRONG khung để người chơi thấy được trò nấp / ló */
  const c = ctx.cam || { cx: ctx.S.player.x - (ctx.VW || 320) / 2, cy: ctx.S.player.y - (ctx.VH || 200) / 2 };
  const W = ctx.VW || 320, H = ctx.VH || 200, tall = H > W * 1.2;   /* điện thoại dọc: nửa trên khung bị bảng HUD (vùng, nhiệm vụ, đồng hồ, máu) che → rình ở dải giữa */
  return { x0: c.cx + (tall ? 22 : 14), x1: c.cx + W - (tall ? 40 : 14), y0: c.cy + (tall ? Math.max(FOOT + 10, H * 0.36) : FOOT + 10), y1: c.cy + H - 26 };   /* chừa mép: thanh công cụ dưới, đầu gã trên */
}
const inView = (v, x, y) => x > v.x0 && x < v.x1 && y > v.y0 && y < v.y1;
function pickSpot(ctx, mo, opt = {}) {
  const p = ctx.S.player, v = view(ctx), small = Math.min(ctx.VW || 320, ctx.VH || 200) < 240; let best = null, bs = 1e9;
  for (const s of spots(ctx)) {
    if (s.o.ruined || !ctx.S.map.objects.includes(s.o)) continue;
    const dp = dist(s, p); if (dp < (opt.min || HIDE_MIN) * (small ? 0.8 : 1) || dp > HIDE_MAX || !inView(v, s.x, s.y)) continue;
    if (opt.not && s === opt.not) continue;
    const dm = dist(s, mo), away = (s.x - p.x) * (mo.x - p.x) + (s.y - p.y) * (mo.y - p.y) < 0 ? 60 : 0;   /* đừng chạy vòng qua người chơi */
    const sc = dm + away + Math.abs(dp - 120) * 0.6 + Math.random() * 20; if (sc < bs) { bs = sc; best = s; }
  }
  return best;
}
function openSpot(ctx, mo) {   /* không có chỗ nấp: đứng ngoài trống, cách người chơi ~130 px, phía của gã */
  const p = ctx.S.player, a0 = Math.atan2(mo.y - p.y, mo.x - p.x), v = view(ctx);
  for (const R of [125, 100, 80]) for (let k = 0; k < 16; k++) { const a = a0 + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * 0.35, x = p.x + Math.cos(a) * R, y = p.y + Math.sin(a) * R; if (walkable(ctx, x, y) && !inPlot(ctx, x, y) && inView(v, x, y)) return { x, y, open: true }; }
  return null;
}
function goTo(ctx, mo, tgt) {   /* đường đi theo ô (ctx.pathTo), đi tới từng điểm */
  mo.goal = tgt; mo.path = null; if (!tgt) return;
  const pth = ctx.pathTo && ctx.pathTo(Math.floor(mo.x / TS), Math.floor(mo.y / TS), Math.floor(tgt.x / TS), Math.floor(tgt.y / TS), 8);
  mo.path = pth && pth.length ? pth.slice(1).concat([{ x: tgt.x, y: tgt.y }]) : [{ x: tgt.x, y: tgt.y }];
}
function stepTo(ctx, mo, x, y, sp, dt) {   /* đi thẳng, trượt theo trục khi vướng; true = tới nơi */
  const dx = x - mo.x, dy = y - mo.y, d = Math.hypot(dx, dy); if (d < 1.5) return true;
  const s = Math.min(d, sp * dt), nx = mo.x + dx / d * s, ny = mo.y + dy / d * s; mo.vx = dx / d; mo.vy = dy / d;
  if (walkable(ctx, nx, ny)) { mo.x = nx; mo.y = ny; } else if (walkable(ctx, nx, mo.y)) mo.x = nx; else if (walkable(ctx, mo.x, ny)) mo.y = ny; else { mo.stuckT = (mo.stuckT || 0) + dt; return false; }
  mo.moving = true; return false;
}
function followPath(ctx, mo, sp, dt) {
  if (!mo.path || !mo.path.length) return true; const w = mo.path[0];
  if (stepTo(ctx, mo, w.x, w.y, sp, dt) || dist(mo, w) < 3) mo.path.shift();
  if (mo.stuckT > 0.8) { mo.stuckT = 0; mo.path.shift(); }
  return !mo.path.length;
}

/* ---------------- bong bóng lời / pop ---------------- */
function say(ctx, lines, force) { const now = ctx.S.time; if (!force && ST.bub && now - ST.bub.t0 < BUBBLE_T + 1.2) return; ST.bub = { text: pick(lines), t0: now }; }
const pop = (ctx, x, y, text, col) => { if (ctx.pop) ctx.pop(x, y, text, col); else (ctx.S.pops ||= []).push({ x, y, text, color: col, t: 0 }); };

/* ---------------- sinh / mất ---------------- */
function statsFor(ctx) { const lv = heroLv(ctx); return { hp: Math.round(HP_BASE + HP_PER_LV * lv), dmg: Math.round(DMG_BASE + DMG_PER_LV * lv) }; }
function spawn(ctx, opt = {}) {
  if (ST.mo || !ctx.monsters || !ctx.monsters.add) return null;
  const p = ctx.S.player, m = ctx.S.map, s = statsFor(ctx); let at = null;
  if (opt.x != null) at = { x: opt.x, y: opt.y };
  else for (let k = 0; k < 60 && !at; k++) {   /* ngoài màn hình: ~ nửa khung + 40 px */
    const r = Math.max(ctx.VW || 320, ctx.VH || 200) * 0.55 + 30 + Math.random() * 60, a = Math.random() * Math.PI * 2, x = p.x + Math.cos(a) * r, y = p.y + Math.sin(a) * r;
    if (x < 24 || y < 24 || x > m.w * TS - 24 || y > m.h * TS - 24) continue; if (walkable(ctx, x, y) && !inPlot(ctx, x, y)) at = { x, y };
  }
  if (!at) return null;
  const c = { key: 'odo', promptDy: 26, shortHit: true, vi: STR.vi.name, en: STR.en.name, hp: s.hp, dmg: s.dmg, armor: 0, sp: FIGHT_SP, xp: 0, w: 16, h: 24, spar: true, odo: true, c: ['#b4946a', '#5a3f2a', '#ffd45e'],
    aiFn: ai, drawFn: draw, onDown: mo => down(ctx, mo) };
  const mo = ctx.monsters.add(c, at.x, at.y);
  Object.assign(mo, { st: 'enter', t: 0, life: 0, f8: 2, clip: 'walk', ct: 0, lastHp: mo.hp, cdDash: 1.5, cdStomp: 2.5, cdCombo: 0, peekT: 2 + Math.random() * 3, peek: 0, seenT: 0 });
  ST.mo = mo; sv(ctx).met++; ctx.persist(); log('spawn ' + Math.round(at.x) + ',' + Math.round(at.y) + ' hp ' + mo.hp);
  const sp = pickSpot(ctx, mo) || openSpot(ctx, mo); goTo(ctx, mo, sp); mo.spot = sp;
  if (!opt.quiet) ctx.toast(tr(ctx).appear);
  return mo;
}
function despawn(ctx, why) {
  const mo = ST.mo; if (!mo) return; ST.mo = null; if (ctx.monsters && ctx.monsters.remove) ctx.monsters.remove(mo);
  log('despawn ' + why); if (why === 'flee') { sv(ctx).escaped++; ctx.toast(tr(ctx).gone); } else if (why === 'leave') ctx.toast(tr(ctx).left);
  ST.nextT = CHECK_EVERY * 2; ctx.persist();
}
function down(ctx, mo) {   /* monsters.killMonster → c.onDown (đã gỡ khỏi danh sách quái) */
  const o = sv(ctx), base = KILL_XP_PER_LV * heroLv(ctx), back = Math.round(o.stash * (1 + PAYOUT_BONUS)), give = back + base, p = ctx.S.player;
  if (give > 0 && ctx.hero) ctx.hero.gainXp(give);
  log('down stash ' + o.stash + ' give ' + give);
  const n = Math.min(14, 4 + Math.round(o.stash / 150));
  for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; ST.orbs.push({ x: mo.x, y: mo.y - 14, sx: mo.x + Math.cos(a) * 26, sy: mo.y - 14 + Math.sin(a) * 18, to: 'player', t: -i * 0.04, T: 0.75 + Math.random() * 0.2 }); }
  ST.fx.push({ k: 'burst', x: mo.x, y: mo.y - 10, t: 0 });
  pop(ctx, mo.x, mo.y - 30, back > 0 ? tr(ctx).back(back) : tr(ctx).empty, '#9dff7a');
  ctx.toast(back > 0 ? tr(ctx).down(give) : tr(ctx).empty, true); ctx.sfx('win'); if (ctx.quake) ctx.quake(0.15);
  ST.lastPay = { stash: o.stash, back, give, t: ctx.S.time };
  o.stash = 0; o.beaten++; ST.downs.push({ x: mo.x, y: mo.y, f8: mo.f8, t: 0 }); ST.mo = null; ST.nextT = CHECK_EVERY * 4; ctx.persist();
}

/* ---------------- hút KN (monsters.js gọi ctx.xpTax) ---------------- */
function xpTax(ctx, corpse, xp) {
  const mo = ST.mo, o = sv(ctx); if (!mo || !(mo.hp > 0) || mo.st === 'gone' || !corpse || corpse === mo) return 0;
  if (dist(mo, corpse) > STEAL_R) return 0;
  const cut = Math.min(Math.round(xp * STEAL_PCT), STASH_CAP - o.stash); if (cut <= 0) { log('cap'); return 0; }
  o.stash += cut; o.steals++; log('steal ' + cut + ' of ' + xp + ' -> ' + o.stash);
  ST.orbs.push({ x: corpse.x, y: corpse.y - 8, sx: corpse.x, sy: corpse.y - 8, to: 'odo', t: 0, T: 0.6, amt: cut });
  ctx.persist(); return cut;
}

/* ---------------- AI (monsters.update → c.aiFn) ---------------- */
function setClip(mo, clip, dur) { if (mo.clip !== clip || dur) { mo.clip = clip; mo.ct = 0; mo.cdur = dur || 0; } }
function faceTo(mo, x, y) { mo.f8 = face8(x - mo.x, y - mo.y); }
function lookedAt(p, mo) {   /* người chơi đang quay mặt về phía gã */
  const V = [[0, 1], [-1, 0], [1, 0], [0, -1]][p.dir || 0], dx = mo.x - p.x, dy = mo.y - p.y, d = Math.hypot(dx, dy) || 1;
  return (dx * V[0] + dy * V[1]) / d > 0.55 && d < 210;
}
function hitPlayer(ctx, mo, mul, type, power) {
  if (!ctx.hero) return false; const p = ctx.S.player, c = mo.c;
  const ok = ctx.hero.hit(Math.max(1, Math.round(c.dmg * mul)));
  log('hitP ' + (mo.act && mo.act.k) + ' ok ' + ok);
  if (ok && ctx.knockPlayer && type) { const dx = p.x - mo.x, dy = p.y - mo.y, l = Math.hypot(dx, dy) || 1; ctx.knockPlayer({ type, power, dir: { x: dx / l, y: dy / l }, src: mo }); }
  return ok;
}
function hitRocky(ctx, mo, mul, R, kb) {
  const rk = ctx.rocky, rp = rk && rk.pos && rk.pos(); if (!rp || dist(rp, mo) > R) return false;
  const dx = rp.x - mo.x, dy = rp.y - mo.y, l = Math.hypot(dx, dy) || 1; return rk.hitBy && rk.hitBy(mo.c.dmg * mul, mo, dx / l, dy / l, kb);
}
function startFight(ctx, mo) {
  if (mo.st === 'fight' || mo.st === 'flee') return; mo.st = 'fight'; mo.c.spar = false; mo.angry = true; mo.path = null; mo.act = null; mo.peek = 0;
  say(ctx, tr(ctx).fight, true); log('fight');
}
function ai(ctx, mo, dt, p, dp, canHit) {
  const s = ST; if (mo !== s.mo) return;
  mo.t += dt; mo.life += dt; mo.ct += dt; mo.moving = false;
  for (const k of ['cdDash', 'cdStomp', 'cdCombo', 'flinchCd', 'back']) if (mo[k] > 0) mo[k] -= dt;
  if (mo.statue || mo.stoneT) { mo.statue = null; mo.stoneT = 0; }
  if (mo.hp < mo.lastHp) {   /* bị đánh: đang rình → vào trận; trúng đòn khi không ra đòn → clip trúng đòn */
    if (mo.st !== 'fight' && mo.st !== 'flee') startFight(ctx, mo); else if (Math.random() < 0.3) say(ctx, tr(ctx).fight);
    if (!mo.act && mo.st === 'fight' && dp <= REACH + 8 && Math.random() < 0.45) mo.counter = true;   /* bị đánh sát người → hay phản đòn ngay */
    else if (!mo.act && !(mo.flinchCd > 0)) { setClip(mo, 'hurt', 0.28); mo.hurtT = 0.28; mo.flinchCd = 2; }   /* khựng tối đa 1 lần / 2 s; đang ra đòn thì không bị ngắt (không khoá đòn liên tục) */
    mo.lastHp = mo.hp;
  }
  if (mo.hurtT > 0) { mo.hurtT -= dt; return; }
  if (ctx.hero && ctx.hero.fainted && (mo.st === 'fight' || mo.st === 'flee')) { say(ctx, tr(ctx).taunt, true); mo.st = 'leave'; mo.c.spar = true; mo.angry = false; }
  if (mo.st === 'fight' && mo.hp < mo.max * FLEE_AT && !mo.fled) { mo.fled = true; mo.st = 'flee'; mo.act = null; mo.fleeT = 0; say(ctx, tr(ctx).flee, true); log('flee'); }
  if (mo.st === 'fight') return fightTick(ctx, mo, dt, p, dp, canHit);
  if (mo.st === 'flee') {
    mo.fleeT += dt; const d = dp || 1; let tx = mo.x + (mo.x - p.x) / d * 40, ty = mo.y + (mo.y - p.y) / d * 40;
    { const a0 = Math.atan2(mo.y - p.y, mo.x - p.x), sd = (mo.fleeSide ||= Math.random() < 0.5 ? 1 : -1);   /* hướng xa người chơi; vướng thì xoay dần sang bên (thử 2 điểm trên đường) */
      for (let k = 0; k < 9; k++) { const a = a0 + sd * (k % 2 ? 1 : -1) * Math.ceil(k / 2) * 0.4, cx1 = mo.x + Math.cos(a) * 14, cy1 = mo.y + Math.sin(a) * 14, cx2 = mo.x + Math.cos(a) * 30, cy2 = mo.y + Math.sin(a) * 30;
        if (walkable(ctx, cx1, cy1) && walkable(ctx, cx2, cy2)) { tx = cx2; ty = cy2; break; } } }
    const cyc = mo.fleeT % (FLEE_RUN + FLEE_REST);
    if (cyc > FLEE_RUN) { faceTo(mo, p.x, p.y); setClip(mo, 'idle'); if (!mo.panted) { mo.panted = true; say(ctx, tr(ctx).pant); } }   /* chạy một quãng lại đứng thở dốc → đuổi kịp được */
    else { mo.panted = false; stepTo(ctx, mo, tx, ty, FLEE_SP, dt); faceTo(mo, tx, ty); setClip(mo, 'walk'); }
    if (mo.stuckT > 0.6 && dp < REACH + 6) { mo.stuckT = 0; mo.st = 'fight'; mo.act = null; mo.fled = true; mo.cornered = 1.5; }   /* bị dồn vào góc → quay lại đánh 1 lúc */
    if ((mo.fleeT > FLEE_T && dp > FLEE_GONE_D) || mo.fleeT > FLEE_T + 8) despawn(ctx, 'flee');
    return;
  }
  if (mo.st === 'leave') {   /* bỏ đi: đi xa khỏi người chơi rồi biến mất */
    const d = dp || 1; stepTo(ctx, mo, mo.x + (mo.x - p.x) / d * 40, mo.y + (mo.y - p.y) / d * 40, SCAMPER_SP, dt); faceTo(mo, mo.x + (mo.x - p.x), mo.y + (mo.y - p.y)); setClip(mo, 'walk');
    if (dp > 260 || mo.t > 12) despawn(ctx, 'leave'); return;
  }
  /* ---- rình ---- */
  if (mo.life > STAY_T) { mo.st = 'leave'; mo.t = 0; return; }
  if (dp < CAUGHT_D) { mo.caughtT = (mo.caughtT || 0) + dt; if (mo.caughtT > 0.4) { startFight(ctx, mo); return; } } else mo.caughtT = 0;   /* bị đuổi kịp sát người → hết đường, quay lại đánh */
  const seen = lookedAt(p, mo) && !(mo.st === 'hide' && !mo.peek);
  mo.seenT = seen ? mo.seenT + dt : 0;
  if (mo.st === 'enter' || mo.st === 'move') {
    const fast = mo.st === 'move' && mo.hurry, arrived = followPath(ctx, mo, fast ? SCAMPER_SP : SNEAK_SP, dt);
    const g = mo.goal; if (g) faceTo(mo, mo.path && mo.path[0] ? mo.path[0].x : g.x, mo.path && mo.path[0] ? mo.path[0].y : g.y); setClip(mo, mo.moving ? 'walk' : 'idle');
    if (mo.st === 'enter' && seen && mo.seenT > 0.3 && dp < 200) { say(ctx, tr(ctx).hide); mo.hurry = true; mo.st = 'move'; }
    if (arrived || !g) { mo.st = g && !g.open ? 'hide' : 'lurk'; mo.t = 0; mo.hurry = false; mo.peekT = 2 + Math.random() * 3; faceTo(mo, p.x, p.y); }
    if (mo.t > 14) { mo.t = 0; const sp = pickSpot(ctx, mo) || openSpot(ctx, mo); goTo(ctx, mo, sp); mo.spot = sp; }
    return;
  }
  /* đang nấp ('hide') hoặc đứng ngoài trống ('lurk') */
  faceTo(mo, p.x, p.y); setClip(mo, 'idle');
  const relocate = (hurry, min) => { const sp = pickSpot(ctx, mo, { min, not: mo.spot }) || openSpot(ctx, mo); if (!sp) return; goTo(ctx, mo, sp); mo.spot = sp; mo.st = 'move'; mo.hurry = hurry; mo.t = 0; mo.peek = 0; };
  if (dp < TOO_CLOSE) { say(ctx, tr(ctx).hide); relocate(true, 110); return; }
  if (dp > SPOT_R || (mo.t > 1.5 && !inView(view(ctx), mo.x, mo.y))) { relocate(false); return; }   /* người chơi đi xa / gã ra khỏi khung → bám theo */
  if (mo.st === 'lurk') { if (seen && mo.seenT > 0.6) { say(ctx, tr(ctx).hide); relocate(true); } else if (mo.t > 6) { mo.t = 0; relocate(false); } return; }
  /* hide: ló ra rồi thụt vào */
  if (mo.peek > 0) { mo.peek -= dt; if (seen && mo.seenT > 0.35) { mo.peek = 0; say(ctx, tr(ctx).hide); } }
  else if ((mo.peekT -= dt) <= 0) { mo.peekT = 3 + Math.random() * 4; mo.peek = PEEK_T; mo.peekSide = Math.random() < 0.5 ? -1 : 1; if (Math.random() < 0.5) say(ctx, tr(ctx).peek); }
  if (mo.t > 18 && !seen) { mo.t = 0; relocate(false); }
}
function fightTick(ctx, mo, dt, p, dp, canHit) {
  const A = mo.act, busyP = !canHit || (ctx.knocked && ctx.knocked());
  if (mo.cornered > 0) { mo.cornered -= dt; if (mo.cornered <= 0 && !A) { mo.st = 'flee'; mo.fleeT = Math.max(mo.fleeT || 0, 0); return; } }
  if (!A) {
    faceTo(mo, p.x, p.y);
    if (busyP) { setClip(mo, 'idle'); return; }   /* người chơi đang bị hất bay → chờ chạm đất */
    if (dp > 44 && dp < 170 && mo.cdDash <= 0) {   /* lướt đấm (có báo trước) */
      const dx = p.x - mo.x, dy = p.y - mo.y, l = Math.hypot(dx, dy) || 1, len = Math.min(170, l + 20);
      mo.act = { k: 'dash', ph: 'wind', t: 0, ux: dx / l, uy: dy / l, len, x0: mo.x, y0: mo.y, hit: false }; setClip(mo, 'dash', DASH_WIND + DASH_GO); mo.cdDash = DASH_CD;
      if (ctx.threat) mo.act.tid = ctx.threat.add({ kind: 'dash', from: { x: mo.x, y: mo.y - 6 }, to: { x: mo.x + dx / l * len, y: mo.y + dy / l * len - 6 }, in: DASH_WIND, width: 8 });
      log('act dash'); return;
    }
    if (mo.back > 0) { const d = dp || 1; stepTo(ctx, mo, mo.x - (p.x - mo.x) / d * 30, mo.y - (p.y - mo.y) / d * 30, FIGHT_SP * 0.8, dt); setClip(mo, 'walk'); return; }   /* lùi lấy đà sau combo → mở đường cho lướt đấm */
    const close = dp <= REACH + 6 && (mo.cdCombo <= 0 || mo.counter);
    if (mo.nextMv == null) mo.nextMv = mo.cdStomp <= 0 && Math.random() < 0.4 ? 'stomp' : 'combo';   /* chọn đòn 1 lần cho mỗi lượt áp sát (không tung xúc xắc mỗi khung) */
    if (close && mo.nextMv === 'stomp' && mo.cdStomp <= 0) {   /* dậm đất (có báo trước) */
      mo.nextMv = null; mo.counter = false;
      mo.act = { k: 'stomp', t: 0, done: false }; setClip(mo, 'stomp', STOMP_WIND + 0.35); mo.cdStomp = STOMP_CD;
      if (ctx.threat) ctx.threat.add({ kind: 'slam', from: { x: mo.x, y: mo.y - 6 }, to: { x: mo.x, y: mo.y - 6 }, in: STOMP_WIND, radius: STOMP_R });
      mo.cdCombo = COMBO_CD; log('act stomp'); return;
    }
    if (close && (dp <= REACH || mo.counter)) { mo.nextMv = null; mo.counter = false; mo.act = { k: 'combo', i: 0, t: 0, hit: false }; setClip(mo, 'attack1', COMBO_DUR[0]); log('act combo'); return; }
    if (dp > 14) { const d = dp || 1; stepTo(ctx, mo, p.x - (p.x - mo.x) / d * 12, p.y - (p.y - mo.y) / d * 12, FIGHT_SP, dt); setClip(mo, 'walk'); } else setClip(mo, 'idle');   /* tiến lại khi > 14 px (< tầm đánh 20): không có vùng chết */
    return;
  }
  A.t += dt;
  if (A.k === 'combo') {
    const D = COMBO_DUR[A.i]; faceTo(mo, p.x, p.y);
    if (!A.hit && A.t >= D * 0.5) { A.hit = true; if (!busyP && dist(mo, p) <= REACH + 6) { const last = A.i === 2; hitPlayer(ctx, mo, last ? 1.2 : 0.7, last ? 'stagger' : null, 0.8); if (ctx.vfx) ctx.vfx('knock_jab', (mo.x + p.x) / 2, p.y - 8, 0, true); ctx.sfx('hit'); } hitRocky(ctx, mo, 0.6, REACH + 6, 20); }
    if (A.t >= D) { A.i++; A.t = 0; A.hit = false; if (A.i > 2 || dist(mo, p) > REACH + 14) { mo.act = null; mo.cdCombo = COMBO_CD; setClip(mo, 'idle'); if (Math.random() < 0.55) mo.back = 0.55; } else setClip(mo, 'attack' + (A.i + 1), COMBO_DUR[A.i]); }
    return;
  }
  if (A.k === 'dash') {
    if (A.ph === 'wind') { if (A.t >= DASH_WIND) { A.ph = 'go'; A.t = 0; ctx.sfx('spar_whoosh'); } return; }
    const ox = mo.x, oy = mo.y, nx = mo.x + A.ux * DASH_SP * dt, ny = mo.y + A.uy * DASH_SP * dt, gone = Math.hypot(mo.x - A.x0, mo.y - A.y0);
    let stop = gone >= A.len || A.t >= DASH_GO; if (!stop) { if (walkable(ctx, nx, ny)) { mo.x = nx; mo.y = ny; } else stop = true; }
    if (!A.hit && !busyP) { const t = Math.max(0, Math.min(1, ((p.x - ox) * A.ux + (p.y - oy) * A.uy) / (Math.hypot(mo.x - ox, mo.y - oy) || 1))), qx = ox + (mo.x - ox) * t, qy = oy + (mo.y - oy) * t;
      if (Math.hypot(p.x - qx, p.y - qy) < 12 || dist(mo, p) < 14) { A.hit = true; hitPlayer(ctx, mo, 1.5, 'fly', 1); if (ctx.vfx) ctx.vfx('knock_heavy', p.x, p.y - 8, 0, true); if (ctx.quake) ctx.quake(0.1); } }
    if (!A.rk && hitRocky(ctx, mo, 1.2, 16, 60)) A.rk = true;
    if (stop) { mo.act = null; setClip(mo, 'idle'); if (ctx.threat && A.tid != null && ctx.threat.remove) ctx.threat.remove(A.tid); }
    return;
  }
  if (A.k === 'stomp') {
    if (!A.done && A.t >= STOMP_WIND) { A.done = true; ctx.sfx('spar_thud'); if (ctx.quake) ctx.quake(0.12); if (ctx.vfx) ctx.vfx('knock_land', mo.x, mo.y + 2, 0, false);
      if (!busyP && dist(mo, p) <= STOMP_R) hitPlayer(ctx, mo, 1.6, 'fly', 0.9); hitRocky(ctx, mo, 1.3, STOMP_R, 70); }
    if (A.t >= STOMP_WIND + 0.35) { mo.act = null; setClip(mo, 'idle'); if (Math.random() < 0.5) mo.back = 0.55; }
  }
}

/* ---------------- vẽ (monsters.drawables → c.drawFn, toạ độ màn hình = chân) ---------------- */
function frameOf(mo) {
  const c = mo.clip; if (c === 'idle') return Math.floor(mo.ct * 8) % 8; if (c === 'walk') return Math.floor(mo.ct * (mo.st === 'move' && !mo.hurry || mo.st === 'enter' ? 7 : 11)) % 8;
  if (c === 'dash' && mo.act && mo.act.k === 'dash' && mo.act.ph === 'wind') return Math.min(2, Math.floor(mo.act.t / DASH_WIND * 3));   /* thu tay chờ lướt */
  if (c === 'dash' && mo.act && mo.act.k === 'dash') return Math.min(7, 3 + Math.floor(mo.act.t / DASH_GO * 5));
  return Math.min(7, Math.floor(mo.ct / Math.max(0.05, mo.cdur || 0.4) * 8));
}
function blit(g, clip, fr, f8, x, y, alpha = 1) {
  const im = img(`o_${clip}.png`) || img('o_idle.png'); if (!im) return false;
  const row = ROW8[f8], flip = f8 === 3 || f8 === 4 || f8 === 5, top = Math.round(y + 2 - FOOT); x = Math.round(x);
  g.save(); g.imageSmoothingEnabled = false; if (alpha < 1) g.globalAlpha = alpha;
  if (flip) { g.translate(x, 0); g.scale(-1, 1); g.drawImage(im, fr * CELL, row * CELL, CELL, CELL, -L / 2, top, L, L); }   /* ảnh thô không __hi: nguồn toạ độ thật, đích logic */
  else g.drawImage(im, fr * CELL, row * CELL, CELL, CELL, x - L / 2, top, L, L);
  g.restore(); return true;
}
function draw(g, mo, x, y) {
  if (mo.st === 'hide') {   /* nấp: cả người khuất sau vật; chỉ lúc ló mới thò ĐẦU ra một bên (nghiêng), thân vẫn khuất */
    if (!(mo.peek > 0)) mo.drawX = x; return;   /* cái đầu ló ra vẽ ở odo.drawables (trên lớp cây); lúc ló nhãn theo cái đầu */
  }
  g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(Math.round(x), y + 1, 7, 2.5, 0, 0, 7); g.fill();
  if (!blit(g, mo.clip, frameOf(mo), mo.f8 ?? 2, x, y)) { g.fillStyle = '#b4946a'; g.fillRect(Math.round(x) - 6, y - 20, 12, 20); }
  if (mo.st !== 'fight' && mo.st !== 'flee') stinkOverlay(g, x, y, mo.f8 ?? 2);   /* mùi + 2 con ruồi: ảnh TĨNH bám theo gã (không nhấp nháy) */
  mo.drawX = x;
}
function stinkOverlay(g, x, y, f8) {
  const st = img('stink.png'), fl = img('flies.png'), top = Math.round(y + 2 - FOOT), side = f8 === 3 || f8 === 4 || f8 === 5 ? 1 : -1;   /* mùi bốc lên sau gáy (phía ngược hướng nhìn) */
  g.save(); g.imageSmoothingEnabled = false;
  if (st) { g.globalAlpha = 0.85; g.drawImage(st, 0, 0, 16, 18, Math.round(x + side * 9) - 4, top - 4, 8, 9); g.globalAlpha = 1; }   /* PixelLab 2× → ½ cỡ, cùng mật độ pixel với sprite */
  if (fl) { g.drawImage(fl, 0, 0, 6, 4, Math.round(x - side * 8), top + 1, 3, 2); g.drawImage(fl, 6, 0, 6, 4, Math.round(x + side * 12), top + 9, 3, 2); }
  g.restore();
}

/* ---------------- hệ ---------------- */
export const odo = {
  id: 'odo', always: true,
  onZoneEnter(ctx) {
    ST.ctx = ctx; ST.mo = null; ST.orbs.length = 0; ST.fx.length = 0; ST.downs.length = 0; ST.bub = null; ST.spotMap = null; sv(ctx); preload();
    ST.force = ST.cfgFast > 0; ST.nextT = ST.cfgFast > 0 ? ST.cfgFast : FIRST_DELAY[0] + Math.random() * (FIRST_DELAY[1] - FIRST_DELAY[0]); ST.cfgFast = 0;   /* móc test fastNext: vùng kế hiện chắc chắn */
    ctx.xpTax = (mo, xp) => { try { return xpTax(ctx, mo, xp); } catch (e) { console.error('xpTax', e); return 0; } };
    if (typeof window !== 'undefined') window.__odo = {
      state: () => { const mo = ST.mo, o = sv(ctx), p = ctx.S.player; return { ...o, on: !!mo, st: mo && mo.st, hp: mo && Math.round(mo.hp), max: mo && mo.max, x: mo && Math.round(mo.x), y: mo && Math.round(mo.y), d: mo ? Math.round(dist(mo, p)) : null, clip: mo && mo.clip, act: mo && mo.act && mo.act.k, spar: mo && mo.c.spar, peek: mo ? +(mo.peek || 0).toFixed(2) : 0, inList: !!(mo && ctx.monsters.list().includes(mo)), nextT: +ST.nextT.toFixed(1), orbs: ST.orbs.length, lastPay: ST.lastPay || null, eligible: eligible(ctx), spots: spots(ctx).length, bub: ST.bub && ST.bub.text, log: ST.log.slice(-30) }; },
      spawn: (o) => { const mo = spawn(ctx, o || {}); return !!mo; }, soon: s => { ST.nextT = s; ST.force = true; return s; }, fastNext: s => { ST.cfgFast = s; },
      stash: n => { sv(ctx).stash = n; ctx.persist(); return n; }, place: (dx, dy) => { const mo = ST.mo, p = ctx.S.player; if (!mo) return false; mo.x = p.x + dx; mo.y = p.y + dy; mo.path = null; mo.goal = null; mo.st = 'lurk'; mo.t = 0; return true; },
      setSt: st => { const mo = ST.mo; if (!mo) return; if (st === 'fight') startFight(ctx, mo); else mo.st = st; }, hp: f => { const mo = ST.mo; if (mo) { mo.hp = Math.max(1, Math.round(mo.max * f)); mo.lastHp = mo.hp; } }, despawn: w => despawn(ctx, w || 'test'),
      age: s => { if (ST.mo) ST.mo.life += s; },
      spots: () => spots(ctx).map(s => ({ x: s.x, y: s.y, type: s.o.type, w: s.w })),
      hideAt: (x, y) => { const mo = ST.mo; if (!mo) return false; const s = spots(ctx).find(q => Math.abs(q.x - x) < 2 && Math.abs(q.y - y) < 2); mo.x = x; mo.y = y; mo.path = null; mo.goal = null; mo.spot = s || null; mo.st = s ? 'hide' : 'lurk'; mo.t = 0; mo.peek = 0; mo.peekT = 1.5; return !!s; }, fleeAge: s => { if (ST.mo && ST.mo.st === 'flee') ST.mo.fleeT += s; }, mo: () => ST.mo, log: () => ST.log.slice(),
    };
  },
  onZoneLeave(ctx) { ST.mo = null; ST.orbs.length = 0; ST.fx.length = 0; ST.downs.length = 0; },
  update(dt, ctx) {
    ST.ctx = ctx; if (ctx.S.mode !== 'play') return;
    if (ST.mo && !ctx.monsters.list().includes(ST.mo)) ST.mo = null;   /* danh sách quái bị dọn (đổi vùng, test clear) */
    if (ST.mo && ST.mo.act && ST.mo.kb) ST.mo.kb = null;   /* đang ra đòn: giáp cứng, không bị đánh văng (odo chạy SAU monsters → chỉ trượt ≤ 1 khung) */
    if (!ST.mo) { if ((ST.nextT -= dt) <= 0) { ST.nextT = CHECK_EVERY; if (eligible(ctx) && (ST.force || Math.random() < (sv(ctx).stash > 0 ? APPEAR_P_STASH : APPEAR_P))) spawn(ctx); ST.force = false; } }
    else if (!eligible(ctx) && ST.mo.st !== 'fight' && ST.mo.st !== 'flee' && ST.mo.st !== 'leave') { ST.mo.st = 'leave'; ST.mo.t = 0; ST.mo.c.spar = true; }
    const p = ctx.S.player;
    for (const o of ST.orbs) {
      o.t += dt; if (o.t < 0) continue;
      const tg = o.to === 'odo' ? (ST.mo ? { x: ST.mo.x, y: ST.mo.y - 16 } : null) : { x: p.x, y: p.y - 10 };
      if (!tg) { o.done = true; continue; }
      const k = Math.min(1, o.t / o.T), e = k * k * (3 - 2 * k), lift = Math.sin(k * Math.PI) * 18;   /* bay cong lên rồi rơi vào */
      const nx = o.sx + (tg.x - o.sx) * e, ny = o.sy + (tg.y - o.sy) * e - lift; o.ang = Math.atan2(ny - o.y, nx - o.x); o.x = nx; o.y = ny;
      if (k >= 1 && !o.done) { o.done = true; if (o.to === 'odo' && ST.mo) { pop(ctx, ST.mo.x, ST.mo.y - 30, `+${o.amt}`, '#c6ff6a'); say(ctx, tr(ctx).steal, true); ctx.sfx('pickup'); } }
    }
    ST.orbs = ST.orbs.filter(o => !o.done);
    for (const f of ST.fx) f.t += dt; ST.fx = ST.fx.filter(f => f.t < 0.75);
    for (const d of ST.downs) d.t += dt; ST.downs = ST.downs.filter(d => d.t < 3);
    if (ST.bub && ctx.S.time - ST.bub.t0 > BUBBLE_T) ST.bub = null;
  },
  drawables(ctx, cx, cy) {
    const out = [], g = ctx.g, orb = img('orb.png'), bimg = img('burst.png');
    { const mo = ST.mo; if (mo && mo.st === 'hide' && mo.peek > 0 && ctx.monsters.list().includes(mo)) {   /* ló: chỉ ĐẦU + vai thò ra mép tán cây, nghiêng — thân vẫn khuất sau cây */
      const k = Math.min(1, Math.min(mo.peek, PEEK_T - mo.peek) / 0.25), half = Math.max(8, ((mo.spot && mo.spot.w) || 16) / 2 - 4), wx = mo.x + mo.peekSide * half * k, ky = mo.spot && mo.spot.base ? mo.spot.base + 0.5 : mo.y + 20;
      mo.drawX = wx - cx;
      out.push({ y: ky, f: () => { const x = Math.round(wx - cx), y = Math.round(mo.y - cy), top = y + 2 - FOOT, hy = top + HEAD_H;
        g.save(); g.beginPath(); g.rect(x - L / 2 - 3, top - 3, L + 6, HEAD_H + 3); g.clip(); g.translate(x, hy); g.rotate(mo.peekSide * 0.3 * k); g.translate(-x, -hy);
        blit(g, 'idle', Math.floor(mo.ct * 8) % 8, mo.peekSide > 0 ? 1 : 3, x, y); g.restore(); } });
    } }
    for (const d of ST.downs) out.push({ y: d.y, f: () => { const fr = Math.min(7, Math.floor(d.t / 0.7 * 8)), a = d.t > 2.2 ? Math.max(0, 1 - (d.t - 2.2) / 0.8) : 1; blit(g, 'faint', fr, d.f8, d.x - cx, d.y - cy, a); } });   /* nằm ngất rồi mờ dần */
    for (const o of ST.orbs) if (o.t >= 0) out.push({ y: 1e9, f: () => { const fr = Math.floor(o.t * 12) % 8, x = Math.round(o.x - cx), y = Math.round(o.y - cy);
      if (!orb) { g.fillStyle = '#9dff7a'; g.fillRect(x - 2, y - 2, 4, 4); return; }
      g.save(); g.imageSmoothingEnabled = false; g.translate(x, y); g.rotate(o.ang || 0); g.drawImage(orb, fr * 35, 0, 35, 17, -13, -4, 17.5, 8.5); g.restore(); } });   /* viên KN PixelLab ½ cỡ, xoay theo hướng bay (đầu viên ở tâm) */
    for (const f of ST.fx) out.push({ y: 1e9, f: () => { if (!bimg) return; const fr = Math.min(9, Math.floor(f.t * 14)); g.save(); g.imageSmoothingEnabled = false; g.drawImage(bimg, fr * 50, 0, 50, 58, Math.round(f.x - cx - 12), Math.round(f.y - cy - 18.5), 25, 29); g.restore(); } });
    return out;
  },
  drawUI(ug, ctx, cx, cy, scale) {
    const mo = ST.mo; if (!mo || ctx.S.mode !== 'play') return;
    const hidden = mo.st === 'hide' && !(mo.peek > 0), o = sv(ctx), T = tr(ctx);
    let x = ((mo.drawX != null ? mo.drawX + cx : mo.x) - cx) * scale; const y = (mo.y - FOOT - 3 - cy) * scale;
    if (x < -200 || x > ug.canvas.width + 200 || y < -60 || y > ug.canvas.height + 60) return;
    const fs = Math.max(12, Math.round(scale * 3.4));
    ug.save(); ug.font = `bold ${fs}px VT323, monospace`; ug.textAlign = 'center'; ug.textBaseline = 'bottom';
    { const half = (ug.measureText(`${T.name} · ${T.stolen(o.stash)}`).width + fs * 1.6) / 2 + 6; x = Math.max(half, Math.min(ug.canvas.width - half, x)); }   /* nhãn / bong bóng không tràn ra mép khung */
    if (!hidden) {
      const txt = `${T.name} · ${T.stolen(o.stash)}`, w = ug.measureText(txt).width, ic = img('icon.png'), isz = Math.round(fs * 1.9);   /* chân dung PixelLab (64×56) */
      ug.fillStyle = 'rgba(13,11,20,.62)'; ug.fillRect(Math.round(x - w / 2 - 4 - (ic ? isz / 2 + 2 : 0)), Math.round(y - fs - 2), Math.round(w + 8 + (ic ? isz + 4 : 0)), fs + 3);
      if (ic) { ug.imageSmoothingEnabled = false; const ih = Math.round(isz * ic.naturalHeight / ic.naturalWidth); ug.drawImage(ic, Math.round(x - w / 2 - isz / 2 - 6), Math.round(y - fs / 2 - 1 - ih / 2 - 2), isz, ih); }
      ug.fillStyle = o.stash > 0 ? '#c6ff6a' : '#e8dcc0'; ug.fillText(txt, Math.round(x + (ic ? isz / 2 + 2 : 0)), Math.round(y));
      if (mo.st === 'fight' || mo.st === 'flee' || mo.hp < mo.max) { const bw = Math.round(14 * scale), bh = Math.max(3, Math.round(scale * 0.9)); ug.fillStyle = '#352022'; ug.fillRect(Math.round(x - bw / 2) - 1, Math.round(y + 1), bw + 2, bh + 2); ug.fillStyle = '#e84a3a'; ug.fillRect(Math.round(x - bw / 2), Math.round(y + 2), Math.max(1, Math.round(bw * mo.hp / mo.max)), bh); }
    }
    if (ST.bub) {   /* bong bóng lời ngắn (theo sự kiện) */
      const by = y - (hidden ? 0 : fs + 6), tw = ug.measureText(ST.bub.text).width;
      ug.fillStyle = 'rgba(255,250,235,.94)'; ug.strokeStyle = '#352022'; ug.lineWidth = Math.max(1, scale * 0.4);
      ug.beginPath(); ug.roundRect(Math.round(x - tw / 2 - 6), Math.round(by - fs - 6), Math.round(tw + 12), fs + 6, 5); ug.fill(); ug.stroke();
      ug.fillStyle = '#352022'; ug.fillText(ST.bub.text, Math.round(x), Math.round(by - 3));
    }
    ug.restore();
  },
};
