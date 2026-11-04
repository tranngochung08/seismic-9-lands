// hopthe.js — plan-50 HỢP THỂ người + Rocky (nháp _wip/p50).
//  · Hợp thể THƯỜNG: nút "Hợp thể" trong bảng lệnh Rocky (.rk-cmds) / thẻ Rocky; tối đa 15 phút rồi tự tách; hết giờ phải chờ 10 phút mới hợp lại.
//  · Hợp thể VĨNH VIỄN: Bông Tai Hợp Thể (Heathcliff, 3.000 đá, cần Rocky cấp 40). Đeo = hợp, tháo = tách; không mất bông tai, không giới hạn giờ.
//  · Ngoại hình: ảnh PixelLab assets/px/hopthe/{n,p}_{idle,walk}.png (5 hàng S/SE/E/N/NE × 8 khung; Tây = lật Đông), đổi màu da theo save.outfit.skin
//    trên canvas NGUỒN không __hi (CLAUDE.md 2026-09-25), canvas kết quả gắn __hi = 2, vẽ 1:1 (9 tham số, toạ độ logic).
//  · Sức mạnh: máu = người + Rocky (sát thương nhận vào nhân hệ số người/(người+Rocky), trừ ½ thủ Rocky), công = người + Rocky (ctx.atkMul), tốc độ của người.
//  · Rocky biến mất khỏi bản đồ khi hợp thể (pet.js nháp: ctx.hopthe.on()).
//  · Thanh chiêu: năng lượng + 4 ô + 1 tuyệt chiêu trên hotbar, chỉ hiện khi hợp thể; phím 1–4 + R; điện thoại bấm ô. Mỗi ô mở khi hạ trùm tương ứng.
//    Mẫu: CHỈ ô 1 "Hắc-ha Cong" (mượn đường cong + đạn tím của Hắc Rocky hacrocky.js), các ô khác 'sắp có'.
//  · Không hợp thể khi đang cưỡi bè / cá voi, đang bơi / lặn; đang hợp thể mà lên bè / xuống nước → tự tách (không tính hồi chờ).
//  · Save MỚI: save.sys.hopthe = { on, left, cd, earring, worn } (save cũ không có → mặc định, không lỗi).
import { ART } from '../art.js';
import { WATER, waterDraw } from '../anim.js';
import { levelFromXp, maxHpOf, atkOf, defOf } from './petlv.js';

const NORMAL_SECS = 15 * 60, COOLDOWN_SECS = 10 * 60, EARRING_PRICE = 3000, EARRING_LV = 40;
const E_MAX = 100, E_REGEN = 12;
const BASE_SKIN = [246, 211, 181];
const ARMOR_SKIN = {   /* các sắc da mặt đo từ ảnh bộ giáp (màu đầu = màu chuẩn); chỉ pixel gần đúng các sắc này mới đổi theo da save → giáp cam / vàng / mũ / tóc không bị đổi */
  n: [[238, 200, 178], [252, 223, 195], [248, 193, 153], [231, 180, 148], [243, 219, 200], [213, 148, 115], [231, 196, 171]],
  p: [[252, 193, 141], [239, 195, 173], [253, 231, 202], [251, 226, 199], [236, 172, 113], [247, 197, 147]] };   /* SKINS[0] #f6d3b5 — màu da gốc của ảnh */
const ROWS = { S: 0, SE: 1, E: 2, N: 3, NE: 4 };
const DIR4TO8 = [2, 4, 0, 6];   /* p.dir (0 xuống,1 trái,2 phải,3 lên) → khu 8 hướng (0 Đông … theo góc màn hình, y xuống) */
const V8 = [[1, 0], [0.7071, 0.7071], [0, 1], [-0.7071, 0.7071], [-1, 0], [-0.7071, -0.7071], [0, -1], [0.7071, -0.7071]];
/* hướng 8 khi hợp thể: theo phím / cần đang giữ (hoặc quãng vừa đi), đổi khu phải giữ ≥ 0,07 s (không nhấp nháy); đứng yên mà p.dir bị hệ khác quay → theo p.dir */
function face8(ctx, dt) {
  const p = ctx.S.player, I = ctx.input || {}; let dx = (I.right ? 1 : 0) - (I.left ? 1 : 0), dy = (I.down ? 1 : 0) - (I.up ? 1 : 0);
  if (!dx && !dy && p.moving && ST.lastP) { dx = p.x - ST.lastP.x; dy = p.y - ST.lastP.y; if (Math.hypot(dx, dy) < 0.05) dx = dy = 0; }
  ST.lastP = { x: p.x, y: p.y };
  if (dx || dy) {
    const k = ((Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) % 8) + 8) % 8;
    if (ST.f8 == null) ST.f8 = k;
    if (k !== ST.f8) { if (k === ST.f8c) { ST.f8t += dt; if (ST.f8t >= 0.07) { ST.f8 = k; ST.f8t = 0; } } else { ST.f8c = k; ST.f8t = 0; } } else ST.f8t = 0;
    ST.p4 = p.dir;
  } else if (ST.p4 !== p.dir) { ST.f8 = DIR4TO8[p.dir || 0]; ST.p4 = p.dir; }
}
const SLOTS = [
  { id: 'hacha', key: 'Digit1', k: '1', boss: 'hacrocky', vi: 'Hắc-ha Cong', en: 'Curved Shadow-ha', bvi: 'Hắc Rocky', ben: 'Shadow Rocky', cost: 25, cd: 4 },   /* 2026-10-29 anh: hồi 4 s */
  { id: 'nhipchan', key: 'Digit2', k: '2', boss: 'trongdong', vi: 'Nhịp Chấn', en: 'Quake Beat', bvi: 'Trống Đồng', ben: 'Bronze Drum' },
  { id: 'tiaguong', key: 'Digit3', k: '3', boss: 'guong', vi: 'Tia Gương', en: 'Mirror Ray', bvi: 'Nữ Hoàng Pha Lê', ben: 'Crystal Queen' },
  { id: 'trongluc', key: 'Digit4', k: '4', boss: 'hoden', vi: 'Trọng Lực', en: 'Gravity', bvi: 'Lão Thợ Mỏ', ben: 'Old Miner' },
  { id: 'longmach', key: 'KeyR', k: 'R', boss: 'bakunawa', ult: true, vi: 'Long Mạch Lôi Thần', en: 'Dragon-Vein Thunder', bvi: 'Ngô Công', ben: 'Great Centipede' },
];
const vi = ctx => ctx.lang() === 'vi';
const sv = ctx => { const s = ctx.S.save; s.sys ||= {}; const h = (s.sys.hopthe ||= {}); h.on ??= false; h.left ??= 0; h.cd ??= 0; h.earring ??= 0; h.worn ??= false; if (h.on || h.worn) { h.on = false; h.worn = false; h.left = 0; } return h; };   /* c33-bohopthe (anh 04/11): bỏ Hợp Thể — save cũ đang hợp thể / đeo bông tai → tắt an toàn khi nạp */
const petOf = ctx => (((ctx.S.save.sys || {}).pet || {}).pet) || null;
const rkLv = ctx => { const p = petOf(ctx); return p ? levelFromXp(p.xp || 0).lv : 0; };
const ST = { e: E_MAX, cds: {}, shots: [], fx: [], el: null, sig: '', saveT: 0, fusedDraw: null, log: [], hitN: 0, lastSplit: null };
const log = s => { ST.log.push(s); if (ST.log.length > 60) ST.log.shift(); };

/* ---------------- trạng thái hợp thể ---------------- */
const isOn = ctx => false;   /* c33-bohopthe: không còn Hợp Thể với người chơi */
/* 29/10: bộ giáp Rocky là ảnh Hợp Thể chính thức (n_* thường, p_* vĩnh viễn) — bỏ cờ ?armor=1 */
const form = ctx => (sv(ctx).worn ? 'p' : 'n');   /* 29/10 anh: Hợp Thể = BỘ GIÁP ROCKY (ảnh n_* / p_* = giáp; ảnh cơ bắp cũ để NPC Ở Dơ) */
function blockReason(ctx) {
  const S = ctx.S, p = S.player, pt = petOf(ctx), V = vi(ctx);
  if (!pt) return V ? 'Chưa có Rocky.' : 'No Rocky yet.';
  if ((pt.koT || 0) > 0) return V ? 'Rocky đang nghỉ ở ổ — chưa hợp thể được.' : 'Rocky is resting — can\'t fuse now.';
  if (S.sea && S.sea.riding) return V ? 'Đang cưỡi bè / cá voi — không hợp thể được.' : 'Can\'t fuse while riding.';
  if (S.sea && S.sea.diving) return V ? 'Đang lặn — không hợp thể được.' : 'Can\'t fuse while diving.';
  if (ctx.isUnderwater && ctx.isUnderwater()) return V ? 'Dưới nước — không hợp thể được.' : 'Can\'t fuse underwater.';
  if (p.custom && p.custom !== ST.fusedDraw) return V ? 'Đang bận (bơi / bay / cưỡi) — không hợp thể được.' : 'Busy (swimming / flying / riding) — can\'t fuse.';
  return null;
}
const bodyMid = ctx => { const M = meta()[form(ctx)]; return Math.round((M.foot - (M.top || 0)) / 2); };   /* nửa chiều cao thân (logic) */
function burst(ctx) { const p = ctx.S.player; if (!(ctx.wfx && ctx.wfx('fuse', p.x, p.y + 1, {}))) ST.fx.push({ k: 'burst', x: p.x, y: p.y + 2 - bodyMid(ctx), t: 0 });   /* plan-69 */ ctx.sfx('spar_charge'); if (ctx.quake) ctx.quake(0.12); }
function fuse(ctx, perm = false) { return false; }   /* c33-bohopthe: chặn mọi đường kích hoạt */
function fuse0(ctx, perm = false) {
  const h = sv(ctx), V = vi(ctx);
  if (isOn(ctx) && !perm) return false;
  const why = blockReason(ctx); if (why) { ctx.toast(why); ctx.sfx('poor'); log('block ' + why); return false; }
  if (!perm) {
    if (h.cd > 0) { const m = Math.ceil(h.cd / 60); ctx.toast(V ? `Rocky còn mệt — ${m} phút nữa mới hợp thể lại được.` : `Rocky is tired — fuse again in ${m} min.`); ctx.sfx('poor'); return false; }
    h.on = true; h.left = NORMAL_SECS;
  }
  ST.e = E_MAX; burst(ctx); ctx.toast(V ? (perm ? 'Đeo Bông Tai — HỢP THỂ vĩnh viễn!' : 'HỢP THỂ! (15 phút)') : (perm ? 'Earring on — permanent FUSION!' : 'FUSION! (15 min)'), true);
  log('fuse ' + (perm ? 'perm' : 'normal')); ctx.persist(); return true;
}
function split(ctx, why = 'manual') {
  const h = sv(ctx), V = vi(ctx), was = isOn(ctx); if (!was) return false;
  if (why === 'timeout') h.cd = COOLDOWN_SECS;
  else if (why === 'manual' && !h.worn && h.on) h.cd = Math.max(60, COOLDOWN_SECS * Math.min(1, (NORMAL_SECS - Math.max(0, h.left)) / NORMAL_SECS));   /* 2026-10-29 anh: tách tay cũng phải chờ — 10 phút × (thời gian đã dùng / 15 phút), ít nhất 1 phút; vĩnh viễn không tính */
  h.on = false; h.left = 0; if (why === 'unwear') h.worn = false;
  const p = ctx.S.player; if (p.custom === ST.fusedDraw) p.custom = null;
  if (!(ctx.wfx && ctx.wfx('fuse', p.x, p.y + 1, {}))) ST.fx.push({ k: 'burst', x: p.x, y: p.y + 2 - bodyMid(ctx), t: 0 }); ST.shots.length = 0;   /* plan-69 */ ST.lastSplit = why;
  if (why === 'timeout') ctx.toast(V ? 'Hết 15 phút — Rocky tách ra. Chờ 10 phút để hợp thể lại.' : '15 min up — Rocky splits off. Wait 10 min to fuse again.', true);
  else if (why === 'ride') ctx.toast(V ? 'Lên bè / xuống nước — Rocky tách ra.' : 'Boarding / entering water — Rocky splits off.');
  else if (why === 'unwear') ctx.toast(V ? 'Tháo Bông Tai — Rocky tách ra.' : 'Earring off — Rocky splits off.');
  else { const m = Math.ceil(h.cd / 60); ctx.toast(h.cd > 0 ? (V ? `Rocky tách ra — nghỉ ${m} phút rồi mới hợp lại được.` : `Rocky splits off — fuse again in ${m} min.`) : (V ? 'Rocky tách ra.' : 'Rocky splits off.')); }
  ctx.sfx('rocky_chirp'); log('split ' + why); ctx.persist(); return true;
}
function toggle(ctx) { return false; }
function toggle0(ctx) { if (sv(ctx).worn) { ctx.toast(vi(ctx) ? 'Đang đeo Bông Tai — tháo bông tai (thẻ Rocky) để tách.' : 'Wearing the Earring — take it off (Rocky tab) to split.'); return false; } return isOn(ctx) ? split(ctx, 'manual') : fuse(ctx); }
function buyEarring(ctx) { return false; }
function buyEarring0(ctx) {
  const h = sv(ctx), inv = ctx.S.save.inv || (ctx.S.save.inv = {}), V = vi(ctx);
  if (h.earring) { ctx.toast(V ? 'Đã có Bông Tai Hợp Thể.' : 'You already own the Fusion Earring.'); return false; }
  if (rkLv(ctx) < EARRING_LV) { ctx.toast(V ? `Rocky cần cấp ${EARRING_LV} mới dùng được bông tai này.` : `Rocky must be Lv ${EARRING_LV}.`); ctx.sfx('poor'); return false; }
  if ((inv.stone || 0) < EARRING_PRICE) { ctx.toast(V ? 'Không đủ đá.' : 'Not enough stone.'); ctx.sfx('poor'); return false; }
  inv.stone -= EARRING_PRICE; h.earring = 1; ctx.bag.add('ht_earring', 1); ctx.sfx('buy'); ctx.toast(V ? 'Đã mua Bông Tai Hợp Thể! Đeo ở thẻ Rocky (B).' : 'Bought the Fusion Earring! Wear it in the Rocky tab (B).', true); ctx.persist(); log('buy earring'); return true;
}
function wear(ctx, on) { return false; }
function wear0(ctx, on) {
  const h = sv(ctx), V = vi(ctx); if (!h.earring && !(ctx.S.save.inv || {}).ht_earring) { ctx.toast(V ? 'Chưa có Bông Tai Hợp Thể.' : 'No Fusion Earring.'); return false; }
  if (on) { if (h.worn) return false; const why = blockReason(ctx); if (why) { ctx.toast(why); return false; } if (h.on) { h.on = false; h.left = 0; } h.worn = true; return fuse(ctx, true); }
  if (!h.worn) return false; return split(ctx, 'unwear');
}

/* ---------------- sức mạnh: máu / công cộng dồn ---------------- */
function setOvr(clip, dur) { if (ST.ovr && ST.ovr.clip === 'faint') return; ST.ovr = { clip, t: 0, dur }; }
function rkStats(ctx) { const lv = Math.max(1, rkLv(ctx)); return { lv, max: maxHpOf(lv), atk: atkOf(lv), def: defOf(lv) }; }
function wrapStats(ctx) {
  if (!ctx.__htAtk) { const o = ctx.atkMul || (() => 1); ctx.atkMul = () => { const m = o(); if (!isOn(ctx) || !ctx.hero) return m; const ha = Math.max(1, ctx.hero.atk); return m * (ha + rkStats(ctx).atk) / ha; }; ctx.__htAtk = true; }
  const H = ctx.hero; if (H && !H.__ht) {
    const o = H.hit.bind(H); H.hit = dmg => { if (!isOn(ctx)) return o(dmg); const r = rkStats(ctx), hm = Math.max(1, H.max); const d = Math.max(1, Math.round(dmg * hm / (hm + r.max) - r.def * 0.5)); log('hit ' + dmg + '->' + d); const ok = o(d); if (ok && !H.fainted) setOvr('hurt', 0.4); return ok; };
    H.__ht = true;
  }
}

/* ---------------- ảnh (đổi màu da, canvas nguồn không __hi) ---------------- */
const IMG = {}, CV = {};
function rawImg(src) { if (!IMG[src]) { const i = new Image(); i.src = 'assets/px/hopthe/' + src; IMG[src] = i; } const i = IMG[src]; return i.complete && i.naturalWidth ? i : null; }
function hexRgb(h) { const n = parseInt(String(h || '#f6d3b5').slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
function skinSheet(ctx, f, clip) {
  const skin = (ctx.S.save.outfit && ctx.S.save.outfit.skin) || '#f6d3b5', key = f + clip + skin;
  if (CV[key]) return CV[key]; const im = rawImg(`${f}_${clip}.png`); if (!im) return null;
  const c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight; const g = c.getContext('2d'); g.drawImage(im, 0, 0);   /* canvas mới, chưa __hi → drawImage gốc */
  const tg = hexRgb(skin);
  const M0 = meta()[f] || {}, armor = !!M0.armor, SK = armor ? (M0.skin || ARMOR_SKIN[f] || ARMOR_SKIN.n) : null, B0 = armor ? SK[0] : BASE_SKIN;
  if (tg.some((v, i) => Math.abs(v - B0[i]) > 2)) {
    const d = g.getImageData(0, 0, c.width, c.height), a = d.data, k = tg.map((v, i) => v / B0[i]);
    for (let i = 0; i < a.length; i += 4) {
      if (!a[i + 3]) continue; const r = a[i], gg = a[i + 1], b = a[i + 2], lum = 0.3 * r + 0.59 * gg + 0.11 * b;
      const tongue = r > 180 && gg < 140 && b > 90 && r - gg > 80, gold = r > 170 && gg > 120 && b < 90 && r - b > 100, cyan = b > 100 && gg > 100 && r < 130;
      if (armor) { if (!SK.some(q => (q[0] - r) ** 2 + (q[1] - gg) ** 2 + (q[2] - b) ** 2 <= 150)) continue; }   /* bộ giáp: CHỈ da mặt (nhạt, ít bão hoà) — giáp cam / mũ / tóc không bị đổi */
      else if (tongue || gold || cyan || lum < 85 || !(r >= gg && gg >= b)) continue;   /* chỉ da: ấm, không quá tối (viền, quần), không lưỡi / bông tai */
      a[i] = Math.min(255, r * k[0]); a[i + 1] = Math.min(255, gg * k[1]); a[i + 2] = Math.min(255, b * k[2]);
    }
    g.putImageData(d, 0, 0);
  }
  c.__hi = 2;   /* gắn __hi SAU khi vẽ xong (art.js) */
  return (CV[key] = c);
}
let META = null;
function meta() { if (META) return META; META = { n: { cell: 64, logic: 32, foot: 31, top: 8, armor: true }, p: { cell: 64, logic: 32, foot: 31, top: 7, armor: true }, a: { cell: 64, logic: 32, foot: 31, top: 8 } };   /* thu nhỏ 29/10 (anh: to quá): thân 21 / 23 px logic */ fetch('assets/px/hopthe/meta.json').then(r => r.json()).then(j => { META = j; }).catch(() => {}); return META; }
function drawFused(ctx) {
  return (g, p) => {
    const f = form(ctx), M = meta()[f], a = p.action;
    let atk = a && /^attack[23]?$/.test(a.name) ? (a.name === 'attack' ? 'attack1' : a.name) : null;   /* combo 3 đòn tay không — theo động tác đánh (attack/attack2/attack3) */
    if (atk === 'attack3' && ST.alt3) atk = 'stomp';   /* đòn kết luân phiên: đập 2 tay / dậm đất */
    const O = ST.ovr;   /* động tác ép: lướt (Ki), ra chiêu, trúng đòn, ngất */
    const want = (O && O.clip) || atk, moving = p.moving, clip = want || (moving ? 'walk' : 'idle'), sh = skinSheet(ctx, f, clip) || skinSheet(ctx, f, moving ? 'walk' : 'idle');
    const L = M.logic, fr = O && O.clip ? Math.min(7, Math.floor((O.t / O.dur) * 8)) : atk ? Math.min(7, Math.floor((a.t / Math.max(0.05, a.dur)) * 8)) : moving ? Math.floor((p.animT || 0) * 10) % 8 : Math.floor((p.idleT || ST.t || 0) * 8) % 8;
    const F8 = ST.f8 ?? DIR4TO8[p.dir || 0], row = [ROWS.E, ROWS.SE, ROWS.S, ROWS.SE, ROWS.E, ROWS.NE, ROWS.N, ROWS.NE][F8], flip = F8 === 3 || F8 === 4 || F8 === 5;   /* 8 hướng: 0 Đ,1 ĐN,2 N(nam),3 TN,4 T,5 TB,6 B,7 ĐB — Tây = lật Đông */
    const x = Math.round(p.x), top = Math.round(p.y + 2 - M.foot);
    if (!sh) { g.fillStyle = '#f6d3b5'; g.fillRect(x - 8, top + 4, 16, L - 6); return; }
    const body = () => { if (flip) { g.save(); g.translate(x, 0); g.scale(-1, 1); g.drawImage(sh, fr * L, row * L, L, L, -L / 2, top, L, L); g.restore(); } else g.drawImage(sh, fr * L, row * L, L, L, x - L / 2, top, L, L); };
    waterDraw(g, p.x, p.y, p.x, p.y, body);   /* lội nước nông / bơi: ngập nửa dưới như Rocky (anim.js WATER.depth) */
  };
}

/* ---------------- chiêu 1: Hắc-ha Cong (đường cong + đuổi theo, mượn hacrocky) ---------------- */
const VX = n => ART.vfx && ART.vfx[n];
function drawSheet(g, s, f, x, y, ang = 0) {
  const hi = s.img.__hi ? 1 : 2, ax = s.ax != null ? s.ax : s.w / 2, ay = s.ay != null ? s.ay : s.h;
  g.save(); g.imageSmoothingEnabled = false; g.translate(Math.round(x), Math.round(y)); if (ang) g.rotate(ang);
  g.drawImage(s.img, f * s.w * hi, 0, s.w * hi, s.h * hi, -Math.round(ax), -Math.round(ay), s.w, s.h); g.restore();
}
const alive = ctx => (ctx.monsters ? ctx.monsters.list() : []).filter(m => m.hp > 0 && !m.dead && !m.dying);
function nearestMo(ctx, R = 220) { const p = ctx.S.player; let best = null, bd = R; for (const m of alive(ctx)) { const d = Math.hypot(m.x - p.x, m.y - p.y); if (d < bd) { bd = d; best = m; } } return best; }
function curvePath(ctx, a, b, h0 = 12) {
  const d = Math.hypot(b.x - a.x, b.y - a.y) || 1, s = (Math.random() < 0.5 ? 1 : -1) * Math.min(48, d * 0.45);
  const mx = (a.x + b.x) / 2 - (b.y - a.y) / d * s, my = (a.y + b.y) / 2 + (b.x - a.x) / d * s;
  let poly = [{ x: a.x, y: a.y - h0 }, { x: mx, y: my - 10 }, { x: b.x, y: b.y - 8 }];
  for (let k = 0; k < 3; k++) { const o = [poly[0]]; for (let i = 0; i < poly.length - 1; i++) { const p0 = poly[i], p1 = poly[i + 1]; o.push({ x: p0.x * 0.75 + p1.x * 0.25, y: p0.y * 0.75 + p1.y * 0.25 }, { x: p0.x * 0.25 + p1.x * 0.75, y: p0.y * 0.25 + p1.y * 0.75 }); } o.push(poly[poly.length - 1]); poly = o; }
  return poly;
}
function dmgOf(ctx) { const ha = ctx.hero ? ctx.hero.atk : 10; return Math.round((ha + rkStats(ctx).atk) * 0.9); }   /* 2026-10-29 anh: hệ số 1,6 → 0,9 */
/* plan-69: đạn Hắc-ha Cong vẽ code (½ px logic): vệt đuôi tím nhỏ dần + quả cầu viền tối, lõi trắng-hồng; ?vfx=old → ảnh hr_orb */
const ORBP = ['#f2b4ff', '#d27cff', '#aa58ee', '#8238c8', '#5e249c', '#421a70', '#2a1048'];
const OLD69 = () => typeof window !== 'undefined' && window.__wfx && window.__wfx.old && window.__wfx.old();
function px69(g, x, y, c) { g.fillStyle = c; g.fillRect(Math.round(x * 2) / 2, Math.round(y * 2) / 2, 0.5, 0.5); }
function drawOrb69(g, s, cx, cy) {
  const tr = s.tr || [], n = tr.length >> 1;
  for (let i = 0; i < n; i++) { const k = (i + 1) / n, r = 0.5 + k * 2, x = tr[i * 2] - cx, y = tr[i * 2 + 1] - cy, c = ORBP[Math.min(6, 2 + Math.round((1 - k) * 4))]; for (let yy = -r; yy <= r; yy += 0.5) for (let xx = -r; xx <= r; xx += 0.5) if (xx * xx + yy * yy <= r * r) px69(g, x + xx, y + yy, c); }
  const x = s.x - cx, y = s.y - cy, R = 3.5 + (Math.floor(s.t * 14) % 2) * 0.5;
  for (let yy = -R; yy <= R; yy += 0.5) for (let xx = -R; xx <= R; xx += 0.5) { const d = Math.sqrt(xx * xx + yy * yy) / R; if (d > 1) continue; px69(g, x + xx, y + yy, d > 0.86 ? ORBP[5] : d > 0.62 ? ORBP[3] : d > 0.36 ? ORBP[1] : (xx < 0 && yy < 0 ? '#ffffff' : ORBP[0])); }
}
function castHacha(ctx) {
  const p = ctx.S.player, lk = ctx.target && ctx.target.get && ctx.target.get(), lm = lk && (lk.kind === 'mon' || lk.kind === 'tent') ? (lk.mo || lk.ref) : null, tg = (lm && lm.hp > 0 && Math.hypot(lm.x - p.x, lm.y - p.y) < 220 ? lm : null) || nearestMo(ctx);   /* p91 đợt C: Hắc-ha nhắm con đang khoá */
  const dir = V8[ST.f8 ?? DIR4TO8[p.dir || 0]], far = { x: p.x + dir[0] * 120, y: p.y + dir[1] * 120 };   /* không có mục tiêu → bắn theo hướng 8 đang quay */
  const pts = curvePath(ctx, p, tg || far, bodyMid(ctx) + 2);   /* đạn ra từ ngang ngực (theo chiều cao Hợp Thể mới) */
  ST.shots.push({ pts, i: 0, x: pts[0].x, y: pts[0].y, vx: dir[0] * 175, vy: dir[1] * 175, sp: 190, home: tg ? 2.5 : 0, life: tg ? 3.5 : 1.4, t: 0, tg: tg || null, born: { x: p.x, y: p.y } });
  if (ctx.wfx) ctx.wfx('hachacast', p.x + dir[0] * 4, p.y + 1, { z: bodyMid(ctx) + 2 });   /* plan-69: hút tụ ở ngực rồi chớp */
  ctx.sfx('whoosh_big'); log('cast hacha ' + (tg ? 'tg ' + Math.round(Math.hypot(tg.x - p.x, tg.y - p.y)) : 'free'));
}
function shotsTick(ctx, dt) {
  for (const s of ST.shots) {
    s.t += dt; s.life -= dt; (s.tr ||= []).push(s.x, s.y); if (s.tr.length > 14) s.tr.splice(0, 2);   /* plan-69: vệt đuôi */
    if (s.i < s.pts.length - 1) {
      let left = s.sp * dt;
      while (left > 0 && s.i < s.pts.length - 1) { const q = s.pts[s.i + 1], d = Math.hypot(q.x - s.x, q.y - s.y); if (d <= left) { s.x = q.x; s.y = q.y; s.i++; left -= d; } else { s.vx = (q.x - s.x) / d * s.sp; s.vy = (q.y - s.y) / d * s.sp; s.x += (q.x - s.x) / d * left; s.y += (q.y - s.y) / d * left; left = 0; } }
    } else if (s.home > 0 && s.tg && s.tg.hp > 0 && !s.tg.dead) {
      s.home -= dt; const tx = s.tg.x - s.x, ty = s.tg.y - 8 - s.y, ca = Math.atan2(s.vy, s.vx), ta = Math.atan2(ty, tx); let da = ta - ca; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI;
      const dd = Math.hypot(tx, ty), na = dd < 30 ? ta : ca + Math.max(-7 * dt, Math.min(7 * dt, da));   /* gần thì lao thẳng vào (không quay vòng quanh mục tiêu) */
      s.vx = Math.cos(na) * 170; s.vy = Math.sin(na) * 170; s.x += s.vx * dt; s.y += s.vy * dt;
    } else { s.x += s.vx * dt; s.y += s.vy * dt; }
    if (s.t > 0.12 && ctx.hasObjectAt && ctx.hasObjectAt(ctx.S.map, Math.floor(s.x / 16), Math.floor((s.y + 6) / 16))) {   /* đạn bay: chỉ nổ khi đâm VẬT (cây, đá, nhà); nước / vực không chặn */ ((ctx.wfx && ctx.wfx('hachahit', s.x, s.y + 8, { z: 8 })) || ctx.vfx('hr_shards', s.x, s.y + 6)); s.life = 0; log('hacha obj ' + Math.round(s.x) + ',' + Math.round(s.y)); continue; }
    for (const m of alive(ctx)) {
      const r = Math.max(13, ((m.c && m.c.w) || 12) * 0.7);
      if (Math.hypot(m.x - s.x, m.y - 8 - s.y) < r) { const d = dmgOf(ctx); ctx.monsters.damage(m, d, ctx.S.player, 1, 130); ((ctx.wfx && ctx.wfx('hachahit', s.x, s.y + 8, { z: 8 })) || ctx.vfx('hr_shards', s.x, s.y + 6)); s.life = 0; s.done = 1; ST.hitN++; log('hacha hit ' + (m.c && m.c.key) + ' ' + d); break; }
    }
  }
  for (const s of ST.shots) if (s.life <= 0 && !s.hit && !s.logged) { s.logged = 1; }
  ST.shots = ST.shots.filter(s => { if (s.life > 0) return true; if (!s.done) log('hacha end ' + Math.round(s.x) + ',' + Math.round(s.y) + (s.tg ? ' tg ' + Math.round(s.tg.x) + ',' + Math.round(s.tg.y) + ' hp ' + s.tg.hp : '')); return false; });
}
function unlocked(ctx, sl) {
  const sys = ctx.S.save.sys || {};
  if (sl.id === 'hacha') return ((sys.hacrocky || {}).wins || 0) > 0;
  return false;   /* mẫu: các chiêu khác chưa làm ('sắp có') */
}
function useSlot(ctx, idx) {
  const sl = SLOTS[idx], V = vi(ctx); if (!sl || !isOn(ctx)) return false;
  if (!unlocked(ctx, sl)) { ctx.toast(sl.id === 'hacha' ? (V ? `Hạ ${sl.bvi} để mở chiêu ${sl.vi}.` : `Defeat ${sl.ben} to unlock ${sl.en}.`) : (V ? `${sl.vi} — sắp có (mở khi hạ ${sl.bvi}).` : `${sl.en} — coming soon (defeat ${sl.ben}).`)); ctx.sfx('poor'); return true; }
  if ((ST.cds[sl.id] || 0) > 0) return true;
  if (ST.e < sl.cost) { ctx.toast(V ? 'Chưa đủ năng lượng.' : 'Not enough energy.'); return true; }
  ST.e -= sl.cost; ST.cds[sl.id] = sl.cd; setOvr('cast', 0.45); if (sl.id === 'hacha') castHacha(ctx); renderBar(ctx, true); return true;
}

/* ---------------- thanh chiêu (DOM, trên hotbar) ---------------- */
function css() {
  if (document.getElementById('ht-style')) return;
  const st = document.createElement('style'); st.id = 'ht-style';
  st.textContent = `#ht-bar{position:fixed;left:50%;transform:translateX(-50%);bottom:86px;z-index:7;display:flex;flex-direction:column;align-items:center;gap:3px;pointer-events:none;font:16px VT323,monospace;color:#ffe9c4}
  #ht-bar .ht-top{display:flex;align-items:center;gap:6px;pointer-events:none}
  #ht-bar .ht-time{background:rgba(30,16,8,.8);border:1px solid #8a5a2b;border-radius:4px;padding:0 5px;line-height:16px;font-size:15px}
  #ht-bar .ht-en{width:196px;height:8px;background:rgba(20,10,4,.8);border:1px solid #8a5a2b;border-radius:4px;overflow:hidden}
  #ht-bar .ht-en i{display:block;height:100%;background:linear-gradient(90deg,#7a3cff,#c58bff)}
  #ht-bar .ht-row{display:flex;gap:4px;pointer-events:auto}
  #ht-bar .ht-s{position:relative;width:40px;height:40px;background:rgba(30,16,8,.85);border:2px solid #8a5a2b;border-radius:6px;display:flex;align-items:center;justify-content:center;cursor:pointer;touch-action:manipulation}
  #ht-bar .ht-s.ult{width:46px;height:46px;border-color:#ffcf4a}
  #ht-bar .ht-s img{width:32px;height:32px;image-rendering:pixelated}
  #ht-bar .ht-s.off img{filter:grayscale(1) brightness(.45)} #ht-bar .ht-s .lk{position:absolute;width:16px;height:16px;right:-2px;top:-2px;image-rendering:pixelated}
  #ht-bar .ht-s .k{position:absolute;left:2px;bottom:0;font-size:13px;color:#ffe9c4;text-shadow:0 1px #000}
  #ht-bar .ht-s .cd{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.55);font-size:20px;color:#fff;border-radius:4px}
  #ht-bar{transition:opacity .15s} #ht-bar.dim{opacity:.45} #ht-bar.alt{left:auto;right:12px;transform:none;align-items:flex-end}
  @media (pointer:coarse){#ht-bar{bottom:calc(228px + env(safe-area-inset-bottom,0px));left:auto;right:6px;transform:none;align-items:flex-end;gap:2px} #ht-bar.alt{bottom:calc(380px + env(safe-area-inset-bottom,0px))} #ht-bar .ht-row{gap:3px} #ht-bar .ht-s{width:44px;height:44px;border-width:1px} #ht-bar .ht-s img{width:32px;height:32px} #ht-bar .ht-s.ult{width:48px;height:48px} #ht-bar .ht-en{width:112px;height:6px} #ht-bar .ht-time{font-size:13px} #ht-bar .k{display:none}}
  #ht-bar.arc{inset:0;left:0;right:0;top:0;bottom:0;transform:none;display:block;pointer-events:none}
  #ht-bar.arc .ht-row{display:block}
  #ht-bar.arc .ht-s{position:fixed;width:46px;height:46px;border:0;border-radius:50%;background:url(assets/px/hopthe/ui/ring_sk.png) center/100% 100% no-repeat;image-rendering:pixelated;pointer-events:auto;-webkit-tap-highlight-color:transparent}
  #ht-bar.arc .ht-s.ult{width:54px;height:54px;background-image:url(assets/px/hopthe/ui/ring_ult.png)}
  #ht-bar.arc .ht-s img{width:28px;height:28px;pointer-events:none} #ht-bar.arc .ht-s.ult img{width:32px;height:32px}
  #ht-bar.arc .ht-s .lk{width:16px;height:16px;right:1px;top:1px}
  #ht-bar.arc .ht-s .cd{inset:5px;clip-path:circle(50%);background:conic-gradient(rgba(0,0,0,.66) var(--p,100%),rgba(0,0,0,.12) 0);font-size:19px;text-shadow:0 1px #000,1px 0 #000}
  #ht-bar.arc .ht-s .k{display:none}
  #ht-bar.arc .ht-top{position:fixed;flex-direction:column;gap:1px;align-items:center;pointer-events:none}
  #ht-bar.arc .ht-en{width:100px;height:5px} #ht-bar.arc .ht-time{font-size:13px;line-height:14px}`;   /* 29/10 anh: điện thoại = nút TRÒN xếp vòng cung ôm nút Túi đồ (khung tròn PixelLab) */   /* điện thoại: ô 44 px (đủ cỡ ngón tay ≥ 40, 29/10); hai chỗ đậu (thấp trên nút A / cao hơn) — chọn chỗ không đè lên nhân vật */
  document.head.appendChild(st);
}
function scrRect(ctx, x, y, w, h) {   /* toạ độ thế giới → màn hình (CSS px) */
  const cv = document.getElementById('c'); if (!cv || !ctx.cam || !ctx.VW) return null; const r = cv.getBoundingClientRect(), k = r.width / ctx.VW;
  return { l: r.left + (x - w / 2 - ctx.cam.cx) * k, t: r.top + (y - h - ctx.cam.cy) * k, r: r.left + (x + w / 2 - ctx.cam.cx) * k, b: r.top + (y + 4 - ctx.cam.cy) * k };
}
const hit = (a, b) => a && b && a.l < b.right && a.r > b.left && a.t < b.bottom && a.b > b.top;
function placeBar(ctx) {   /* thanh chiêu KHÔNG BAO GIỜ đè lên người chơi: đè thì đổi sang chỗ đậu thứ 2; quái / dân đứng dưới thì làm mờ */
  if (!ST.el || ST.el.hidden) return; const p = ctx.S.player, M = meta()[form(ctx)], me = scrRect(ctx, p.x, p.y, M.logic * 0.7, M.foot - (M.top || 0) + 4);
  let br = ST.el.getBoundingClientRect();
  if (hit(me, br)) { ST.el.classList.toggle('alt'); br = ST.el.getBoundingClientRect(); if (hit(me, br)) ST.el.classList.toggle('alt'); br = ST.el.getBoundingClientRect(); }
  ST.barHitMe = hit(me, br);
  let under = false; const others = [...(ctx.S.npcs || []), ...(ctx.monsters ? ctx.monsters.list() : [])];
  for (const o of others) { if (o.hp != null && o.hp <= 0) continue; if (hit(scrRect(ctx, o.x, o.y, 14, 22), br)) { under = true; break; } }
  ST.el.classList.toggle('dim', under); ST.barDim = under;
}
/* ĐIỆN THOẠI: 4 chiêu + tuyệt chiêu là nút TRÒN xếp trên vòng cung quanh nút Túi đồ (#mslots .ms-bag), tuyệt chiêu (to hơn) ở cuối cung.
   Tìm bán kính nhỏ nhất + góc bắt đầu sao cho mọi nút nằm trong màn (trừ vùng an toàn), không đè nút A / Túi / Ăn / Đổi / cần điều khiển / nút khác
   và không đè người chơi. Không tìm được chỗ tránh người chơi → giữ cung gần nhất, làm mờ. */
let SAFE = null;
function safeIns() {
  if (SAFE) return SAFE; const d = document.createElement('div'); d.style.cssText = 'position:fixed;visibility:hidden;pointer-events:none;padding:env(safe-area-inset-top,0px) env(safe-area-inset-right,0px) env(safe-area-inset-bottom,0px) env(safe-area-inset-left,0px)';
  document.body.appendChild(d); const c = getComputedStyle(d); SAFE = { t: parseFloat(c.paddingTop) || 0, r: parseFloat(c.paddingRight) || 0, b: parseFloat(c.paddingBottom) || 0, l: parseFloat(c.paddingLeft) || 0 }; d.remove(); addEventListener('resize', () => { SAFE = null; }); return SAFE;
}
const circRect = (x, y, r, o, pad) => { const qx = Math.max(o.left - pad, Math.min(x, o.right + pad)), qy = Math.max(o.top - pad, Math.min(y, o.bottom + pad)); return (x - qx) ** 2 + (y - qy) ** 2 < r * r; };
function arcLayout(ctx) {
  if (!ST.el || ST.el.hidden) return; const btns = [...ST.el.querySelectorAll('.ht-s')], top = ST.el.querySelector('.ht-top'); if (!btns.length) return;
  const vis = e => { if (!e || e.hidden) return false; const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== 'hidden'; };
  const bag = document.querySelector('#mslots .ms-bag'), A = document.getElementById('btn-a'), anc = vis(bag) ? bag : vis(A) ? A : null; if (!anc) return;
  const R0 = anc.getBoundingClientRect(), cx = R0.left + R0.width / 2, cy = R0.top + R0.height / 2, rb = Math.max(R0.width, R0.height) / 2;
  const big = r => r.width * r.height > 0.4 * innerWidth * innerHeight;   /* bỏ lớp phủ toàn màn */
  const obs = [...document.querySelectorAll('#touch button, #joy, #mslots > *, #hotbar, .hud-tr, #h-alert, #pxhud > *, #lt-orb, #btn-dragon, #btn-chat, #herobar, #h-clock')].filter(e => !ST.el.contains(e) && vis(e)).map(e => e.getBoundingClientRect()).filter(r => !big(r));
  const p = ctx.S.player, M = meta()[form(ctx)] || {}, me0 = scrRect(ctx, p.x, p.y, (M.logic || 32) * 0.7, (M.foot || 31) - (M.top || 0) + 4), me = me0 && { left: me0.l, top: me0.t, right: me0.r, bottom: me0.b };
  const sz = btns.map(b => b.offsetWidth || 46), S0 = safeIns(), L = 4 + S0.l, T = 4 + S0.t, RR = innerWidth - 4 - S0.r, BB = innerHeight - 4 - S0.b;
  const key = [cx, cy, rb, innerWidth, innerHeight, me ? me.left / 6 : 0, me ? me.top / 6 : 0, sz.join(':'), obs.length].map(v => typeof v === 'number' ? Math.round(v) : v).join(',');
  if (key !== ST.arcKey) {
    ST.arcKey = key; const n = sz.length;
    const place = (useMe) => {
      for (let Rd = rb + Math.max(...sz) / 2 + 6; Rd <= rb + 130; Rd += 3) {
        let best = null;
        for (const dir of [1, -1]) for (let a0 = 0; a0 < 360; a0 += 5) {
          const pts = []; let ang = a0, ok = true;
          for (let i = 0; i < n; i++) {
            if (i) { const need = (sz[i - 1] + sz[i]) / 2 + 5; ang += dir * 2 * Math.asin(Math.min(1, need / (2 * Rd))) * 180 / Math.PI; }
            const t = ang * Math.PI / 180, x = cx + Math.cos(t) * Rd, y = cy - Math.sin(t) * Rd, r = sz[i] / 2;
            if (x - r < L || x + r > RR || y - r < T || y + r > BB || obs.some(o => circRect(x, y, r, o, 3)) || (useMe && me && circRect(x, y, r, me, 4))) { ok = false; break; }
            pts.push([x, y, r]);
          }
          if (!ok) continue;
          const mid = ((a0 + (ang - a0) / 2) % 360 + 360) % 360, sc = Math.abs(mid - 135);   /* ưu tiên cung phía trên-trái nút Túi (xa nút A, gần ngón cái) */
          if (!best || sc < best.sc) best = { pts, sc, Rd };
        }
        if (best) return best;
      }
      return null;
    };
    let b = place(true), dim = false; if (!b) { b = place(false); dim = !!b; }
    ST.arc = b ? { pts: b.pts.map(q => q.map(Math.round)), R: Math.round(b.Rd), dim } : null;
  }
  const a = ST.arc; if (!a) return;
  btns.forEach((e, i) => { const q = a.pts[i]; if (!q) return; e.style.left = Math.round(q[0] - q[2]) + 'px'; e.style.top = Math.round(q[1] - q[2]) + 'px'; });
  if (top) { const hi = a.pts.reduce((m, q) => (q[1] - q[2] < m[1] - m[2] ? q : m), a.pts[0]), w = top.offsetWidth || 104, h = top.offsetHeight || 22;
    let x = hi[0] - w / 2, y = hi[1] - hi[2] - h - 4; x = Math.max(L, Math.min(RR - w, x)); y = Math.max(T, y);
    if (me && x < me.right && x + w > me.left && y < me.bottom && y + h > me.top) y = Math.max(T, me.top - h - 4);
    top.style.left = Math.round(x) + 'px'; top.style.top = Math.round(y) + 'px'; }
  ST.barHitMe = !!(me && a.pts.some(q => circRect(q[0], q[1], q[2], me, 0))); ST.barAlt = false; ST.barDim = a.dim; ST.el.classList.toggle('dim', a.dim);
}
function renderBar(ctx, force) {
  const on = isOn(ctx) && ctx.S.mode === 'play';
  if (!ST.el) { css(); ST.el = document.createElement('div'); ST.el.id = 'ht-bar'; document.body.appendChild(ST.el);
    ST.el.addEventListener('pointerdown', e => { const b = e.target.closest('[data-hts]'); if (!b) return; e.preventDefault(); e.stopPropagation(); useSlot(ST.ctx, +b.dataset.hts); }); }
  ST.el.hidden = !on; if (!on) { ST.sig = ''; return; }
  { const hb = document.getElementById('hotbar'), coarse = matchMedia('(pointer:coarse)').matches;   /* máy tính: đặt ngay trên hotbar thật (hotbar cao thấp tuỳ màn) */
    if (!coarse && hb && !hb.hidden && hb.offsetParent !== null) { const r = hb.getBoundingClientRect(), b = Math.round(innerHeight - r.top + 4) + 'px'; if (ST.el.style.bottom !== b) ST.el.style.bottom = b; } else if (ST.el.style.bottom) ST.el.style.bottom = ''; }
  const h = sv(ctx), V = vi(ctx), mm = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  const sig = [Math.round(ST.e), h.worn ? 'w' : Math.ceil(h.left), ...SLOTS.map(s => `${unlocked(ctx, s) ? 1 : 0}${Math.ceil(ST.cds[s.id] || 0)}`), V].join('|');
  const ARC = matchMedia('(pointer:coarse)').matches; ST.el.classList.toggle('arc', ARC); if (ARC) ST.el.classList.remove('alt');
  if ((ST.placeT = (ST.placeT || 0) - 1) <= 0) { ST.placeT = 6; if (ARC) arcLayout(ctx); else placeBar(ctx); }   /* ~10 lần / s */
  if (!force && sig === ST.sig) return; ST.sig = sig;
  const slot = (s, i) => { const u = unlocked(ctx, s), cd = Math.ceil(ST.cds[s.id] || 0), name = V ? s.vi : s.en;
    const tip = u ? name : (s.id === 'hacha' ? (V ? `Hạ ${s.bvi} để mở` : `Defeat ${s.ben}`) : (V ? `Sắp có — hạ ${s.bvi}` : `Coming soon — ${s.ben}`));
    return `<div class="ht-s${s.ult ? ' ult' : ''}${u ? '' : ' off'}" data-hts="${i}" title="${name}: ${tip}"><img src="assets/px/hopthe/icons/${s.ult ? 'ult_' + s.id : 'sk_' + s.id}.png" alt="">${u ? '' : '<img class="lk" src="assets/px/hopthe/icons/lock.png" alt="">'}<span class="k">${s.k}</span>${cd > 0 ? `<span class="cd" style="--p:${Math.round(Math.min(1, (ST.cds[s.id] || 0) / (s.cd || 1)) * 100)}%">${cd}</span>` : ''}</div>`; };
  ST.el.innerHTML = `<div class="ht-top"><span class="ht-time">${h.worn ? '💍 ∞' : '⏳ ' + mm(h.left)}</span><div class="ht-en"><i style="width:${Math.round(ST.e / E_MAX * 100)}%"></i></div></div><div class="ht-row">${SLOTS.map(slot).join('')}</div>`;
  if (ST.el.classList.contains('arc')) { ST.arcKey = ''; arcLayout(ctx); }
}

/* ---------------- HTML cho menu (thẻ Rocky) + quầy Heathcliff ---------------- */
function menuHtml(ctx) { return ''; }   /* c33-bohopthe: thẻ Rocky không còn mục Hợp Thể */
function menuHtml0(ctx) {
  const h = sv(ctx), V = vi(ctx), on = isOn(ctx), have = h.earring || (ctx.S.save.inv || {}).ht_earring;
  const ic = '<img src="assets/px/hopthe/icons/earring.png" alt="" style="width:28px;height:28px;image-rendering:pixelated;vertical-align:middle">';
  const st = h.worn ? (V ? 'Vĩnh viễn (đang đeo bông tai)' : 'Permanent (earring on)') : on ? (V ? `Đang hợp thể — còn ${Math.ceil(h.left / 60)} phút` : `Fused — ${Math.ceil(h.left / 60)} min left`) : h.cd > 0 ? (V ? `Rocky mệt — ${Math.ceil(h.cd / 60)} phút nữa` : `Rocky tired — ${Math.ceil(h.cd / 60)} min`) : (V ? 'Sẵn sàng' : 'Ready');
  const b1 = h.worn ? '' : `<button class="btn primary" data-ht="toggle" style="margin:2px">${on ? (V ? 'Tách ra' : 'Split') : (V ? 'Hợp thể (15 phút)' : 'Fuse (15 min)')}</button>`;
  const b2 = have ? `<button class="btn" data-ht="${h.worn ? 'unwear' : 'wear'}" style="margin:2px">${ic} ${h.worn ? (V ? 'Tháo Bông Tai' : 'Remove Earring') : (V ? 'Đeo Bông Tai' : 'Wear Earring')}</button>` : `<span class="mhint">${ic} ${V ? 'Bông Tai Hợp Thể: Heathcliff (Biển), 3.000 đá, cần Rocky cấp 40' : 'Fusion Earring: Heathcliff (Sea), 3,000 stone, Rocky Lv 40'}</span>`;
  return `<h3>${V ? 'Hợp Thể' : 'Fusion'}</h3><div class="mhint" style="font-size:15px">${V ? 'Trạng thái' : 'Status'}: <b style="color:var(--gold)">${st}</b></div><div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;justify-content:center">${b1}${b2}</div>`;
}
function menuAct(ctx, a) { if (a === 'toggle') return toggle(ctx); if (a === 'wear') return wear(ctx, true); if (a === 'unwear') return wear(ctx, false); return false; }
function shopRow(ctx) { return ''; }   /* c33-bohopthe: quầy Heathcliff không bán Bông Tai Hợp Thể */
function shopRow0(ctx) {
  const h = sv(ctx), V = vi(ctx), inv = ctx.S.save.inv || {}, lvOk = rkLv(ctx) >= EARRING_LV, ok = !h.earring && lvOk && (inv.stone || 0) >= EARRING_PRICE;
  const BS = 'width:auto;margin:0;padding:6px 10px;font-size:13px';
  return `<h3 style="margin:12px 0 4px">${V ? '💍 Bông Tai Hợp Thể' : '💍 Fusion Earring'}</h3><p class="dim" style="margin:0 0 4px">${V ? 'Đeo vào là HỢP THỂ với Rocky mãi mãi (tháo ra là tách). Không mất bông tai. Cần Rocky cấp 40.' : 'Wear it to FUSE with Rocky for good (take it off to split). Never consumed. Needs Rocky Lv 40.'}</p>
    <div class="hrow"><span class="hwho"><img src="assets/px/hopthe/icons/earring.png" alt="" style="width:32px;height:32px;image-rendering:pixelated;vertical-align:middle"> <b>${V ? 'Bông Tai Hợp Thể' : 'Fusion Earring'}</b> <span class="chip">${EARRING_PRICE} 🪨</span> <span class="dim">${lvOk ? '' : (V ? `Rocky cấp ${rkLv(ctx)}/${EARRING_LV}` : `Rocky Lv ${rkLv(ctx)}/${EARRING_LV}`)}</span></span>
    <span class="hnum"><b>×${h.earring ? 1 : 0}</b></span><button class="btn primary" data-hterring="1" style="${BS}${ok ? '' : ';opacity:.35;cursor:default'}"${ok ? '' : ' disabled'}>${h.earring ? (V ? 'Đã có' : 'Owned') : (V ? 'Mua' : 'Buy')}</button></div>`;
}

/* ---------------- hệ ---------------- */
export const hopthe = {
  id: 'hopthe', always: true,
  onZoneEnter(ctx) {
    ST.ctx = ctx; ST.shots.length = 0; ST.fx.length = 0; sv(ctx); meta();
    if (!ST.fusedDraw) { ST.fusedDraw = drawFused(ctx); ST.fusedDraw.shadowW = 15; }   /* plan-66: bóng lớp nền (shadow.js) */
    ctx.hopthe = { on: () => isOn(ctx), form: () => (isOn(ctx) ? form(ctx) : null), toggle: () => toggle(ctx), fuse: () => fuse(ctx), split: (w) => split(ctx, w || 'manual'), wear: on => wear(ctx, on), buy: () => buyEarring(ctx), menuHtml: () => menuHtml(ctx), menuAct: a => menuAct(ctx, a), shopRow: () => shopRow(ctx), label: () => (isOn(ctx) ? (vi(ctx) ? 'Tách ra' : 'Split') : (vi(ctx) ? 'Hợp thể' : 'Fuse')), cdText: () => { const h = sv(ctx); return !isOn(ctx) && h.cd > 0 ? Math.ceil(h.cd / 60) + "'" : ''; } };
    if (isOn(ctx)) { const p = ctx.S.player; if (!p.custom) p.custom = ST.fusedDraw; }
    if (typeof window !== 'undefined') window.__hopthe = {
      state: () => { const h = sv(ctx), p = ctx.S.player; return { ...h, isOn: isOn(ctx), form: isOn(ctx) ? form(ctx) : null, e: Math.round(ST.e), cds: { ...ST.cds }, shots: ST.shots.length, hitN: ST.hitN, custom: p.custom === ST.fusedDraw, act: p.action ? p.action.name : null, ovr: ST.ovr ? ST.ovr.clip : null, f8: ST.f8 ?? null, row: (() => { const F8 = ST.f8 ?? DIR4TO8[p.dir || 0]; return { f8: F8, row: ['E', 'SE', 'S', 'SE', 'E', 'NE', 'N', 'NE'][F8], flip: F8 === 3 || F8 === 4 || F8 === 5 }; })(), labelUp: p.labelUp, otherCustom: !!(p.custom && p.custom !== ST.fusedDraw), atkMul: ctx.atkMul ? +ctx.atkMul().toFixed(3) : 1, rk: rkStats(ctx), heroMax: ctx.hero && ctx.hero.max, barShown: !!(ST.el && !ST.el.hidden), barAlt: !!(ST.el && ST.el.classList.contains('alt')), barHitMe: !!ST.barHitMe, barDim: !!ST.barDim, lastSplit: ST.lastSplit, log: ST.log.slice(-20) }; },
      fuse: () => fuse(ctx), split: () => split(ctx, 'manual'), toggle: () => toggle(ctx), buy: () => buyEarring(ctx), wear: on => wear(ctx, on), warp: s => { const h = sv(ctx); if (h.on) h.left = Math.max(0.05, h.left - s); if (h.cd > 0) h.cd = Math.max(0, h.cd - s); return { left: h.left, cd: h.cd }; },
      arc: () => (ST.arc ? { ...ST.arc } : null), use: i => useSlot(ctx, i), energy: v => { ST.e = v; return v; }, reason: () => blockReason(ctx),
    };
  },
  onZoneLeave(ctx) { ST.shots.length = 0; },
  update(dt, ctx) {
    ST.ctx = ctx; ST.t = (ST.t || 0) + dt; wrapStats(ctx); if (isOn(ctx)) face8(ctx, dt); else { ST.f8 = null; ST.lastP = null; }
    const h = sv(ctx), p = ctx.S.player, playing = ctx.S.mode === 'play';
    if (!isOn(ctx) && h.cd > 0 && playing) h.cd = Math.max(0, h.cd - dt);
    if (isOn(ctx)) {
      if ((ctx.S.sea && (ctx.S.sea.riding || ctx.S.sea.diving)) || (ctx.isUnderwater && ctx.isUnderwater())) { if (!h.worn) split(ctx, 'ride'); else if (p.custom === ST.fusedDraw) p.custom = null; }
      else {
        if (!p.custom || (p.custom !== ST.fusedDraw && WATER.depth && WATER.depth(p.x, p.y) > 0 && !p.airBody)) p.custom = ST.fusedDraw;   /* hệ khác (hất bay, Ki lộn…) tạm vẽ người thì thôi, xong tự gắn lại; lội / bơi (swim.js) → vẫn vẽ Hợp Thể, ngập nước bằng waterDraw */
        { const M = meta()[form(ctx)], up = Math.max(0, Math.round(M.foot - (M.top || 0) - 18)) + 2;   /* tên nằm trên đỉnh ảnh Hợp Thể + 2 px (đỉnh người thường ≈ chân − 18) */ if (!p.labelUp || p.labelUp === ST.myUp) { p.labelUp = up; ST.myUp = up; } }   /* tên / ảnh đại diện lên trên đầu Hợp Thể (cao hơn người thường) */
        if (!h.worn && playing) { h.left -= dt; if (h.left <= 0) split(ctx, 'timeout'); }
        if (playing) { ST.e = Math.min(E_MAX, ST.e + E_REGEN * dt); for (const k in ST.cds) ST.cds[k] = Math.max(0, ST.cds[k] - dt); }
      }
    } else { if (p.custom === ST.fusedDraw) p.custom = null; if (ST.myUp && p.labelUp === ST.myUp) { p.labelUp = 0; ST.myUp = 0; } }
    if (isOn(ctx)) {
      if (ST.ovr) { ST.ovr.t += dt; if (ST.ovr.t >= ST.ovr.dur && ST.ovr.clip !== 'faint') ST.ovr = null; }
      if (ctx.hero && ctx.hero.fainted) { if (!ST.ovr || ST.ovr.clip !== 'faint') ST.ovr = { clip: 'faint', t: 0, dur: 0.7 }; if (ST.ovr.t > ST.ovr.dur) ST.ovr.t = ST.ovr.dur - 0.001; }
      else if (ST.ovr && ST.ovr.clip === 'faint') ST.ovr = null;
      { const kb = !!(ctx.ki && ctx.ki.busy && ctx.ki.busy()); if (kb && !ST.kiBusy) setOvr('dash', 0.32); ST.kiBusy = kb; }   /* Ki lộn / lướt (ki.js không thay hình khi p.custom) → clip LƯỚT ĐẤM của Hợp Thể */
      if (p.draw && p.draw.__ki && !p.draw.__ht) { const fd = function (g) { ST.fusedDraw(g, this); }; fd.__ki = true; fd.__ht = true; p.draw = fd; setOvr('dash', 0.32); }   /* Ki lướt / lộn khi hợp thể: vẽ clip LƯỚT ĐẤM của Hợp Thể thay dáng người */
      const a = p.action; if (a && a.name === 'attack3' && a !== ST.lastA3) { ST.lastA3 = a; ST.alt3 = !ST.alt3; }
    } else ST.ovr = null;
    shotsTick(ctx, dt);
    for (const f of ST.fx) f.t += dt; ST.fx = ST.fx.filter(f => f.t < 0.6);
    if ((ST.saveT -= dt) <= 0) { ST.saveT = 5; if (isOn(ctx) || h.cd > 0) ctx.persist(); }
    renderBar(ctx);
  },
  key(code, ctx) {
    if (!isOn(ctx) || ctx.S.mode !== 'play') return false;
    const i = SLOTS.findIndex(s => s.key === code); if (i < 0) return false; useSlot(ctx, i); return true;
  },
  drawables(ctx, cx, cy) {
    const out = [], g = ctx.g, p = ctx.S.player, orb = VX('hr_orb'), bimg = rawImg('fuse_burst.png');
    for (const s of ST.shots) {
      /* QUY TẮC LỚP VẼ CHIÊU (2026-10-16): lúc còn sát người — bay lên nằm sau, bay xuống nằm trước người; xa rồi theo y của chính đạn */
      const near = Math.hypot(s.x - p.x, s.y + bodyMid(ctx) - p.y) < 18, ky = near ? p.y + (s.vy < 0 ? -0.5 : 0.5) : s.y + 8;
      out.push({ y: ky, skill: 'ht_hacha', f: () => { const a = Math.atan2(s.vy, s.vx) || 0, fr = Math.floor(s.t * 12) % (orb ? orb.n : 1); if (!OLD69()) drawOrb69(g, s, cx, cy); else if (orb) drawSheet(g, orb, fr, s.x - cx, s.y - cy, a); else { g.fillStyle = '#c050ff'; g.fillRect(Math.round(s.x - cx) - 3, Math.round(s.y - cy) - 3, 6, 6); } } });
    }
    for (const f of ST.fx) out.push({ y: 1e9, f: () => { if (!bimg) return; const n = 7, fr = Math.min(n - 1, Math.floor(f.t * 14)), W = 40; g.save(); g.imageSmoothingEnabled = false; g.drawImage(bimg, fr * 96, 0, 96, 96, Math.round(f.x - cx - W / 2), Math.round(f.y - cy - W / 2), W, W); g.restore(); } });   /* ảnh vfx_workbench 2×, vẽ 9 tham số lên ảnh KHÔNG __hi → toạ độ nguồn thật */
    return out;
  },
};
