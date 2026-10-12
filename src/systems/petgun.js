// petgun.js — Súng Hóa Đá (anh yêu cầu 2026-10-11): theo phe Xealist được Xealist tặng súng; CHỈ bắn được khi đang cầm súng trên hotbar.
//  · Bắn: E / Space (theo hướng mặt) hoặc click / chạm (về phía điểm bấm). Tia PixelLab (vfx petgun_bolt) bay tối đa 6 ô, hồi 2 giây (ô hotbar tối dần rồi sáng lại).
//  · Sức súng = (40 + 10 × cấp) × ctx.atkMul() (dưới nước −50 %). Trúng thứ ĐẦU TIÊN trên đường bay:
//    - YẾU → hóa đá VĨNH VIỄN: dân thường (villagers.petrify: tượng + 3 ngày giải đá, dân khác thấy → nghi ngờ, tính vào nhiệm vụ đen 'hóa đá'),
//      thú (bò, gà, chim, cá) — tượng đứng 12 s rồi vỡ vụn; quái có máu tối đa ≤ sức súng — tượng xám 10 s (đánh vào là vỡ sớm) rồi vỡ ra đồ rơi + kinh nghiệm.
//    - MẠNH → hóa đá TẠM: quái khác đứng im (không AI, không gây sát thương) clamp(3 s × sức / máu tối đa, 0,15 s, 3 s); trùm tối đa 0,4 s;
//      người không hóa đá được (Leader, trưởng lão, người giao việc, Xealist, Lyron…) 2,5 s.
//    - VẬT (cây, đá, tường, đồ đạc): xám đá 4 s rồi trở lại, không hư gì.
//  · Hiệu ứng chỉ chạy lúc bắn / trúng (anh ghét VFX lặp). Tô xám = bộ lọc canvas trên chính ảnh PixelLab của vật đó.
// Lưu: save.inv.petgun (1) + save.sys.petgun = { given }. Phe Noxx không bao giờ có; hối cải về Noxx → Xealist lấy lại súng.
import { ART } from '../art.js';

export const STONE_FILTER = 'grayscale(1) brightness(1.04) contrast(1.18)';
const AIM_T = 0.15, RANGE = 6 * 16, CD = 2, SPEED = 320, MON_STATUE = 10, ANI_STATUE = 12, OBJ_T = 4, PPL_T = 2.5;
const vi = ctx => ctx.lang() === 'vi';
const pathOf = ctx => ((ctx.story && ctx.story()) || {}).path;
const sv = ctx => ((ctx.S.save.sys ||= {}).petgun ||= { given: false });
const nmM = (ctx, c) => (vi(ctx) ? c.vi : c.en);
const nmN = n => (n.m && (n.m.k || n.m.n || n.m.id)) || '?';
const L = ctx => (vi(ctx) ? {
  give: ['Cầm lấy — Súng Hóa Đá. Kẻ yếu chạm tia là thành đá mãi mãi.', 'Kẻ mạnh chỉ đứng hình một chốc thôi. Muốn súng mạnh hơn thì lên cấp đi.'],
  got: '🔫 Xealist tặng bạn Súng Hóa Đá — chọn súng trên thanh công cụ rồi bấm E / click để bắn',
  taken: 'Bạn đã hối cải — Xealist lấy lại Súng Hóa Đá',
  fire: 'Bắn tia hóa đá', cd: s => `Súng đang nạp… ${s} giây`,
  monPerm: n => `🗿 ${n} hóa đá vĩnh viễn!`, monTemp: (n, s) => `${n} quá mạnh — chỉ hóa đá ${s} giây`,
  aniPerm: n => `🗿 ${n} hóa thành tượng đá`, pplTemp: n => `${n} quá mạnh — chỉ đứng hình một chốc`, obj: 'Vật hóa đá một lúc rồi trở lại như cũ',
  ani: { cow: 'Bò', chicken: 'Gà', bird: 'Chim', fish: 'Cá', sheep: 'Cừu', rabbit: 'Thỏ' },
} : {
  give: ['Take this — the Petrify Gun. The weak turn to stone for good the moment the beam touches them.', 'The strong only freeze for a moment. Want it stronger? Level up.'],
  got: '🔫 Xealist gave you the Petrify Gun — select it on the hotbar, then press E / click to fire',
  taken: 'You repented — Xealist took the Petrify Gun back',
  fire: 'Fire the petrify beam', cd: s => `Recharging… ${s} s`,
  monPerm: n => `🗿 ${n} is stone for good!`, monTemp: (n, s) => `${n} is too strong — frozen for only ${s} s`,
  aniPerm: n => `🗿 The ${n} turned into a stone statue`, pplTemp: n => `${n} is too strong — frozen only for a moment`, obj: 'Turned to stone for a moment — it will change back',
  ani: { cow: 'cow', chicken: 'chicken', bird: 'bird', fish: 'fish', sheep: 'sheep', rabbit: 'rabbit' },
});
const ST = { ctx: null, ready: 0, shots: [], objs: new Set(), ppl: new Set(), pathAtEnter: null, toastT: -9, last: null, cdEl: null };
const now = ctx => ctx.S.time;
const holding = ctx => !!(ctx.holding && ctx.holding('petgun'));

/* ---------- số liệu: sức súng, thời gian đứng hình ---------- */
export function gunPower(ctx) { const lv = ctx.hero ? ctx.hero.lv : 1, mul = ctx.atkMul ? ctx.atkMul() : 1; return Math.round((40 + 10 * lv) * mul); }
export function freezeFor(power, max, boss) { const d = Math.max(0.15, Math.min(3, 3 * power / Math.max(1, max))); return boss ? Math.min(0.4, d) : d; }

/* ---------- cấp / thu súng ---------- */
function grant(ctx, talk) {
  const s = sv(ctx); s.given = true; if (!ctx.bag.has('petgun', 1)) ctx.bag.add('petgun', 1);
  if (ctx.hotbarSync) ctx.hotbarSync(); ctx.persist();
  const t = L(ctx), p = ctx.S.player;
  if (ctx.vfx) ctx.vfx('item_pickup_pop', p.x, p.y - 18, 0, true); ctx.sfx('petgun_fire');
  if (talk && ctx.openDialog) {
    ctx.setMode('dialog');
    ctx.openDialog({ m: { n: 'Xealist', k: 'Xealist', id: 'xealist', friend: true, a: 'assets/px/ui/port_xealist.png', title: { vi: 'Thủ lĩnh phe Xealist', en: 'Head of the Xealist faction' }, ro: [] }, pages: t.give, onClose: () => { ctx.setMode('play'); ctx.toast(t.got, true); } });
  } else ctx.toast(t.got, true);
}
function checkOwnership(ctx) {
  const path = pathOf(ctx), s = sv(ctx);
  if (path === 'xealist') { if ((!s.given || !ctx.bag.has('petgun', 1)) && ctx.S.mode === 'play') grant(ctx, !s.given && ST.pathAtEnter !== 'xealist'); return; }
  if (ctx.bag.has('petgun', 1)) { ctx.bag.remove('petgun', ctx.bag.count('petgun')); s.given = false; if (ctx.hotbarSync) ctx.hotbarSync(); ctx.persist(); if (path === 'noxx') ctx.toast(L(ctx).taken); }   /* phe Noxx không giữ súng */
}

/* ---------- ngắm + dò trúng (tia đi sát mặt đất, tính theo chân) ---------- */
function npcsAll(ctx) { const a = (ctx.allNpcs ? ctx.allNpcs() : ctx.S.npcs).concat(ctx.S.staff || []); return a.filter(n => n && n !== ctx.S.player); }
function scan(ctx, x0, y0, ang) {
  const m = ctx.S.map, cos = Math.cos(ang), sin = Math.sin(ang), mons = ctx.monsters ? ctx.monsters.list() : [], ppl = npcsAll(ctx), anis = ctx.animals ? ctx.animals.list() : [];
  let lastT = -1;
  for (let s = 6; s <= RANGE; s += 3) {
    const x = x0 + cos * s, y = y0 + sin * s;
    for (const mo of mons) { if (mo.statue) continue; const c = mo.c; if (Math.abs(x - mo.x) < c.w * 0.55 + 4 && y > mo.y - Math.max(10, c.h * 0.7) && y < mo.y + 5) return { kind: 'mon', ref: mo, x: mo.x, y: mo.y, s }; }
    for (const n of ppl) { if (n.stoneT > now(ctx)) continue; if (Math.abs(x - n.x) < 7 && y > n.y - 12 && y < n.y + 4) return { kind: 'npc', ref: n, x: n.x, y: n.y, s }; }
    for (const a of anis) { if (a.stoneT) continue; if (Math.abs(x - a.x) < 8 && y > a.y - 10 && y < a.y + 5) return { kind: 'ani', ref: a, x: a.x, y: a.y, s }; }
    const tx = Math.floor(x / 16), ty = Math.floor(y / 16), k = ty * m.w + tx;
    if (k !== lastT) { lastT = k;
      if (ctx.isSolid(m, tx, ty)) for (const o of m.objects) { if (o.ghost || o.tomb || o.ruined) continue; const d = ctx.O[o.type]; if (!d || d.solid === false) continue;
        if (tx >= o.x && tx < o.x + (d.fw || 1) && ty >= o.y && ty < o.y + (d.fh || 1)) return { kind: 'obj', ref: o, x, y, s }; }
    }
  }
  return null;
}
function fire(ctx, ang) {
  if (!holding(ctx) || !ctx.bag.has('petgun', 1)) return false;
  const t = L(ctx), p = ctx.S.player;
  if (now(ctx) < ST.ready) { if (now(ctx) - ST.toastT > 1.2) { ST.toastT = now(ctx); ctx.toast(t.cd((ST.ready - now(ctx)).toFixed(1))); ctx.sfx('fail'); } return true; }
  ST.ready = now(ctx) + CD;
  const x0 = p.x, y0 = p.y - 2, hit = scan(ctx, x0, y0, ang), len = hit ? hit.s : RANGE;
  ST.shots.push({ x0, y0, ang, len, d: 0, hit, ft: 0, w: AIM_T, mx: Math.cos(ang) * 9 });   /* w: đợi tay giơ súng ngang (khung 2 clip shoot) rồi tia mới rời nòng; mx: đầu nòng lệch về phía ngắm */
  p.faceTo && p.faceTo(x0 + Math.cos(ang) * 20, y0 + Math.sin(ang) * 20);
  if (p.act) { if (p.hasAct && p.hasAct('shoot')) p.act('shoot', 0.35); else if (p.hasAct && p.hasAct('attack')) p.act('attack', 0.35); }   /* 2026-10-11 anh: động tác bắn (clip PixelLab shoot), thân thiếu clip thì dùng attack */
  ctx.sfx('petgun_fire');
  return true;
}
const DIRA = [Math.PI / 2, Math.PI, 0, -Math.PI / 2];
/* ---------- khóa mục tiêu (target.js, 2026-10-11): ngắm ĐÚNG thứ đã khóa; xa quá → tự đi lại gần rồi bắn; vật cứng chắn giữa → báo, không bắn ---------- */
function blockedBy(ctx, x0, y0, x1, y1, t) {   /* vật cứng (khác mục tiêu) nằm trên đường bắn → trả về vật đó */
  const m = ctx.S.map, d = Math.hypot(x1 - x0, y1 - y0), n = Math.max(1, Math.ceil(d / 3)), mine = t.kind === 'obj' ? t.ref : null;
  for (let i = 2; i < n; i++) {
    const x = x0 + (x1 - x0) * i / n, y = y0 + (y1 - y0) * i / n, tx = Math.floor(x / 16), ty = Math.floor(y / 16);
    if (!ctx.isSolid(m, tx, ty)) continue;
    for (const o of m.objects) { if (o === mine || o.ghost || o.tomb || o.ruined) continue; const dd = ctx.O[o.type]; if (!dd || dd.solid === false) continue; if (tx >= o.x && tx < o.x + (dd.fw || 1) && ty >= o.y && ty < o.y + (dd.fh || 1)) return o; }
  }
  return null;
}
function fireAtLock(ctx, t) {
  if (!t || !holding(ctx) || !ctx.bag.has('petgun', 1)) return false;
  const p = ctx.S.player, a = ctx.target.aimPoint(t), x0 = p.x, y0 = p.y - 2, d = Math.hypot(a.x - x0, a.y - y0);
  if (d > RANGE - 6) { if (now(ctx) - ST.toastT > 1.2) { ST.toastT = now(ctx); ctx.toast(ctx.target.txt().outRange); } ctx.sfx('fail'); return true; }   /* ngoài tầm 6 ô: KHÔNG tự đi tới (anh chốt) — chỉ báo */
  if (t.kind === 'npc' && ctx.target.petrifiable(t.ref) && now(ctx) >= ST.ready && ctx.target.confirmPetrify(t.ref)) return true;   /* dân thường → hóa đá VĨNH VIỄN: bấm 2 lần xác nhận */
  if (blockedBy(ctx, x0, y0, a.x, a.y, t)) { if (now(ctx) - ST.toastT > 1.2) { ST.toastT = now(ctx); ctx.toast(ctx.target.txt().blocked); } ctx.sfx('fail'); return true; }
  return fire(ctx, Math.atan2(a.y - y0, a.x - x0));
}   /* p.dir 0 nam · 1 tây · 2 đông · 3 bắc */

/* ---------- trúng ---------- */
function stoneWrap(n) {   /* tô xám NPC đang đứng hình: bọc hàm draw của chính NPC đó */
  if (n.__pgWrap) return; n.__pgWrap = true; const d = n.draw;
  n.draw = function (g, ...a) { if (this.stoneT > (ST.ctx ? ST.ctx.S.time : 0)) { const f = g.filter; g.filter = STONE_FILTER; try { return d.call(this, g, ...a); } finally { g.filter = f; } } return d.call(this, g, ...a); };
}
function toastT(ctx, s) { ctx.toast(s); }
function apply(ctx, h) {
  const t = L(ctx), T = now(ctx), pw = gunPower(ctx);
  if (ctx.vfx) ctx.vfx('petgun_hit', h.x, h.y + 2, 0, true);
  if (h.kind === 'mon') {
    const mo = h.ref; if (!ctx.monsters || !ctx.monsters.list().includes(mo)) return;
    const c = mo.c, boss = !!c.boss;
    if (!boss && mo.max <= pw) {
      mo.statue = { until: T + MON_STATUE, hp0: mo.hp }; mo.stoneT = Infinity; mo.kb = null; mo.angry = false;
      if (ctx.vfx) ctx.vfx('petrify', mo.x, mo.y + 4, 0, true); ctx.sfx('petrify');
      toastT(ctx, t.monPerm(nmM(ctx, c))); ST.last = { kind: 'mon', key: c.key, perm: true, power: pw, max: mo.max };
    } else {
      const d = freezeFor(pw, mo.max, boss); mo.stoneT = T + d; mo.kb = null;
      ctx.sfx('petrify_hit'); if (ctx.pop) ctx.pop(mo.x, mo.y - 18, `🗿 ${d.toFixed(d < 1 ? 2 : 1)}s`, '#d8d0e0');
      toastT(ctx, t.monTemp(nmM(ctx, c), d.toFixed(d < 1 ? 2 : 1))); ST.last = { kind: 'mon', key: c.key, perm: false, dur: d, power: pw, max: mo.max, boss };
    }
    return;
  }
  if (h.kind === 'npc') {
    const n = h.ref, vl = ctx.villagers;
    if (vl && (ctx.S.npcs.includes(n) || n.chief) && !n.custom && !n.lyron && !vl.immune(n) && vl.petrify(n)) {
      if (ctx.xealistDeed) ctx.xealistDeed('petrify', n); ST.last = { kind: 'npc', perm: true, id: n.m && n.m.id }; return;
    }
    n.stoneT = T + PPL_T; n.__pgBusy = n.busy; n.busy = true; n.goal = null; n.path = null; stoneWrap(n); ST.ppl.add(n);
    ctx.sfx('petrify_hit'); toastT(ctx, t.pplTemp(nmN(n))); if (ctx.xealistDeed && ctx.S.npcs.includes(n)) ctx.xealistDeed(null, n);
    ST.last = { kind: 'npc', perm: false, dur: PPL_T, id: n.m && n.m.id }; return;
  }
  if (h.kind === 'ani') {
    const a = h.ref; a.stoneT = T + ANI_STATUE; a.st = 'idle';
    if (ctx.vfx) ctx.vfx('petrify', a.x, a.y + 4, 0, true); ctx.sfx('petrify');
    toastT(ctx, t.aniPerm(t.ani[a.kind] || a.kind)); ST.last = { kind: 'ani', perm: true, ak: a.kind }; return;
  }
  if (h.kind === 'obj') {
    const o = h.ref; o.stoneT = T + OBJ_T; ST.objs.add(o); ctx.sfx('petrify_hit');
    if (now(ctx) - ST.toastT > 3) { ST.toastT = now(ctx); toastT(ctx, t.obj); } ST.last = { kind: 'obj', type: o.type, dur: OBJ_T };
  }
}
function crumble(ctx, x, y) { if (ctx.vfx) ctx.vfx('rock_debris', x, y + 2); ctx.sfx('stone_crumble'); }

/* ---------- ô hotbar: lớp tối khi đang nạp ---------- */
function cdOverlay(ctx) {
  if (typeof document === 'undefined') return;
  const bar = ctx.S.save.hotbar || [], i = bar.indexOf('petgun'), slot = document.querySelector('#mslots:not([hidden]) .ms-slot[data-id="petgun"]') || (i >= 0 ? document.querySelector(`#hotbar .hb-slot[data-i="${i}"]`) : null);   /* điện thoại: ô tròn */
  const k = Math.max(0, Math.min(1, (ST.ready - now(ctx)) / CD));
  if (!slot) return;
  let el = slot.querySelector('.pg-cd');
  if (!k) { if (el) el.remove(); return; }
  if (!el) { el = document.createElement('i'); el.className = 'pg-cd'; el.style.cssText = 'position:absolute;left:-6px;right:-6px;bottom:-6px;background:rgba(10,6,16,.72);border-top:2px solid #ff7ad9;box-sizing:border-box;pointer-events:none'; slot.appendChild(el); }
  el.style.height = `calc(${Math.round(k * 100)}% + ${Math.round(12 * k)}px)`;
}

export const petgun = {
  id: 'petgun',
  onZoneEnter(ctx) {
    ST.ctx = ctx; ST.shots = []; ST.objs.clear(); ST.ppl.clear(); ST.pathAtEnter = pathOf(ctx); if (!(ST.ready < now(ctx) + CD)) ST.ready = 0;
    if (typeof window !== 'undefined') window.__petgun = {
      state: () => ({ given: sv(ctx).given, has: ctx.bag.has('petgun', 1), holding: holding(ctx), power: gunPower(ctx), ready: Math.max(0, +(ST.ready - now(ctx)).toFixed(2)), last: ST.last, shots: ST.shots.length }),
      fire: ang => fire(ctx, ang == null ? DIRA[ctx.S.player.dir || 0] : ang),
      lockFire: () => fireAtLock(ctx, ctx.target && ctx.target.forGun()),
      at: (wx, wy) => { const p = ctx.S.player; return fire(ctx, Math.atan2(wy - (p.y - 2), wx - p.x)); },
      reset: () => { ST.ready = 0; }, freezeFor, power: () => gunPower(ctx),
    };
  },
  onZoneLeave() { ST.shots = []; ST.objs.clear(); for (const n of ST.ppl) { n.stoneT = 0; n.busy = n.__pgBusy || false; } ST.ppl.clear(); },
  update(dt, ctx) {
    checkOwnership(ctx);
    const T = now(ctx);
    for (let i = ST.shots.length - 1; i >= 0; i--) { const s = ST.shots[i]; if (s.w > 0) { s.w -= dt; continue; } s.d += SPEED * dt; s.ft += dt; if (s.d >= s.len) { ST.shots.splice(i, 1); if (s.hit) apply(ctx, s.hit); } }
    if (ctx.monsters) for (const mo of ctx.monsters.list().slice()) {   /* tượng quái: hết giờ hoặc bị đánh trúng → vỡ ra đồ rơi */
      if (!mo.statue) continue;
      if (T >= mo.statue.until || mo.hp < mo.statue.hp0) { crumble(ctx, mo.x, mo.y); if (ctx.monsters.kill) ctx.monsters.kill(mo); else { mo.statue = null; mo.stoneT = 0; } }
    }
    if (ctx.animals) for (const a of ctx.animals.list().slice()) if (a.stoneT && T >= a.stoneT) { crumble(ctx, a.x, a.y); ctx.animals.remove(a); }
    for (const o of ST.objs) if (!(o.stoneT > T)) { o.stoneT = 0; ST.objs.delete(o); }
    for (const n of ST.ppl) if (!(n.stoneT > T)) { n.busy = n.__pgBusy || false; ST.ppl.delete(n); }
    for (const n of ST.ppl) { n.goal = null; n.moving = false; }
    cdOverlay(ctx);
  },
  near(ctx) {
    if (!holding(ctx) || !ctx.bag.has('petgun', 1) || ctx.S.mode !== 'play') return null;
    const p = ctx.S.player, a = DIRA[p.dir || 0], tg = ctx.target && ctx.target.forGun(), quiet = ST.shots.length > 0;   /* tia đang bay: ẩn nhãn 'E · Bắn' cho khỏi che tia rời nòng (E vẫn bấm được) */
    if (tg) return { label: quiet ? '' : `🔫 ${L(ctx).fire} → ${ctx.target.nameOf(tg)}`, x: p.x, y: p.y - 4, limit: 999, priority: 4.5, mouse: false, cursor: 'tool', isLock: true, data: { fire: true, lock: true } };   /* đã khóa: E = bắn đúng mục tiêu */
    return { label: quiet ? '' : `🔫 ${L(ctx).fire}`, x: p.x + Math.cos(a) * 4, y: p.y + Math.sin(a) * 4, limit: 30, priority: 3, mouse: false, cursor: 'tool', data: { fire: true } };
  },
  interact(ctx, cand) { if (cand && cand.data && cand.data.lock) { fireAtLock(ctx, ctx.target && ctx.target.forGun()); return; } if (cand && cand.data && cand.data.fire) fire(ctx, DIRA[ctx.S.player.dir || 0]); },
  onClick(ctx, mt) {   /* 2026-10-11 luật click (target.js): click KHÔNG bắn — click vào thứ bắn được = khóa, bắn bằng E / nút A */
    if (!holding(ctx) || !mt || ctx.S.mode !== 'play') return false;
    return false;   /* 2026-10-11 luật click (target.js): súng chỉ bắn thứ click TRÚNG (đã khóa); đất trống bị chặn trước, bảng/quầy… để main xử lý như cũ */
  },
  drawables(ctx, cx, cy) {
    const out = [], g = ctx.g, T = now(ctx);
    for (const o of ST.objs) {   /* vật hóa đá: vẽ lại chính ảnh của vật, phủ bộ lọc đá, ngay trên lớp vật */
      if (!(o.stoneT > T)) continue; const d = ctx.O[o.type]; if (!d) continue;
      const by = (o.y + d.fh) * 16, im = o.artImg || (d.frames ? d.frames[0] : d.img); if (!im) continue;
      out.push({ y: by + 0.01, f: () => { g.save(); g.filter = STONE_FILTER; g.drawImage(im, o.x * 16 - cx + (o.artImg ? 0 : (d.ox || 0)), by - (o.artImg ? im.height / (ART.hi || 1) : d.h) - cy + (o.artImg ? 0 : (d.oy || 0))); g.restore(); } });
    }
    const sh = ART.vfx && ART.vfx.petgun_bolt;
    for (const s of ST.shots) {   /* tia: quả cầu PixelLab bay ở tầm tay (cao 9 px), 2 bóng mờ phía sau */
      if (s.w > 0) continue;   /* chưa rời nòng */
      const x = s.x0 + (s.mx || 0) + Math.cos(s.ang) * s.d, y = s.y0 + Math.sin(s.ang) * s.d;
      out.push({ y: Math.sin(s.ang) < -0.5 ? y + 1 : Math.max(y + 1, s.y0 + 3), f: () => {   /* vừa rời nòng: vẽ trên người bắn (không bị thân che); bắn lên bắc thì nằm sau người */
        for (let k = Math.min(2, Math.floor(s.d / 6)); k >= 0; k--) {   /* bóng mờ không lùi ra sau nòng súng */
          const tx = x - Math.cos(s.ang) * k * 6, ty = y - Math.sin(s.ang) * k * 6, sx = Math.round(tx - cx), sy = Math.round(ty - 9 - cy);
          g.save(); g.globalAlpha = k ? 0.35 / k : 1;
          if (sh) { const f = Math.floor(s.ft * (sh.fps || 12)) % sh.n, w = k ? sh.w * 0.7 : sh.w, hh = k ? sh.h * 0.7 : sh.h; g.drawImage(sh.img, f * sh.w, 0, sh.w, sh.h, Math.round(sx - w / 2), Math.round(sy - hh / 2), w, hh); }
          else { g.fillStyle = '#ffb8e8'; g.fillRect(sx - 2, sy - 2, 4, 4); }
          g.restore();
        }
      } });
    }
    return out;
  },
};
