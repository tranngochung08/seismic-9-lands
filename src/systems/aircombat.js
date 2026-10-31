/* aircombat.js — 2026-10-14 (anh): KHÔNG CHIẾN + TRÙM ĐUỔI THEO. Dùng chung cho mọi trùm biết bay (Bakunawa là trùm đầu tiên).
   A. SÂN TRỜI KHÔNG SÀN (vùng có map.air = { cx, cy, rx, ry, below, tint }):
      · Người chơi lơ lửng bằng chong chóng tre (vẽ thân thật nâng lên AIR_LIFT + chong chóng trên đỉnh đầu) → kiếm / mọi đòn / clip động tác chạy như mặt đất.
      · Cả bản đồ là trời mở (không ô cứng); biên = TƯỜNG MÂY BÃO mềm: ra quá mép → bị gió đẩy về (không tường tàng hình, không rơi).
      · Đòn mạnh (knockPlayer 'fly' / 'launch' / 'throw' / 'uppercut') giữa trời = LỘN NHÀO văng ngang rồi chong chóng giữ thăng bằng lại (không 'rơi xuống đất');
        đòn nhẹ = lảo đảo (knock.js đẩy lùi). Dừng ở biên sân. Rocky cũng vậy (pet.js nhánh ctx.air).
      · Ngất giữa trời: chong chóng giữ xác lơ lửng; giao diện ngất (đếm ngược + 2 nút) giữ nguyên.
      · Chiều sâu: nhiều lớp mây trôi phía dưới (ảnh mây / sương PixelLab), bóng người / Rocky / trùm in trên biển mây; vệt gió CHỈ khi có sự kiện.
      · Nút 🚁 / X trong sân = HẠ XUỐNG tầng Trung của vùng đất bên dưới (map.air.below) — có cảnh chuyển tầng.
   B. TRÙM ĐUỔI THEO (ctx.chase — hệ trùm đăng ký adapter): trận KHÔNG kết thúc khi người chơi rời vùng / đổi tầng.
      · Đổi tầng (trời ↔ trung ↔ đất) hay sang vùng khác (đèo, mép trời, cửa…) → trùm theo tới sau cảnh báo (bóng lớn dần + gầm + khung phim),
        lao xuống xuyên trần mây (sét + loé + rung NGẮN đúng lúc chạm) → đánh tiếp, MÁU / PHA GIỮ NGUYÊN.
      · KHÔNG có vùng an toàn: mọi vùng ngoài trời (Làng, Biển, M1–M9, đèo) + mọi khoảng trời + sân trời + tầng nước u1–u4. Vùng KHÔNG chứa được trùm (trong nhà, hang,
        Sàn Đấu Ngầm, khe trùm khác, Vực Kraken) → trùm lượn chờ NGAY BÊN NGOÀI: bước ra vùng ngoài trời là nó lao xuống tấn công liền (cảnh ngắn).
      · Đòn trùm (ctx.chase.impact) trúng cả DÂN / NPC (văng + nằm choáng có sao — KHÔNG chết, đứng dậy khi trận kết thúc / rời vùng), THÚ (văng),
        QUÁI (mất máu + văng), và PHÁ VẬT trên đường (blast.smashObj: cây đổ như bị chặt, công trình HƯ → ĐỔ NÁT bằng ảnh PixelLab của chính vật).
        Luật phục hồi: đổ nát đi xuyên được (không kẹt); trận kết thúc → vật đổ nát không ai đứng trên được dựng lại sau 3 s; còn lại lành khi vào lại vùng.
      · Trận chỉ kết thúc khi trùm bị hạ hoặc người chơi ngất → về nhà (trùm về hang, máu đặt lại theo luật thường). Trạng thái trận sống trong bộ nhớ (không ghi save).
*/
import { ART } from '../art.js';
import { drawCopter, topOf, drawPlayer, fogTint, mixHex, fogLayer, copterAt, pxCloudTint, toBmp } from './sky.js';
import { smashObj, solidObjAt } from './blast.js';
import { ZONES } from '../world.js';
import { monsters as SYS_MON } from './monsters.js';
import { knock as SYS_KNOCK } from './knock.js';
import { drops as SYS_DROPS } from './drops.js';
const EXTRA_SYS = { monsters: SYS_MON, knock: SYS_KNOCK, drops: SYS_DROPS };

const TS = 16, TAU = Math.PI * 2;
export const AIR_LIFT = 16;
const STR = {
  vi: { down: v => `🚁 Hạ xuống tầng Trung ${v}`, wall: 'Tường mây bão — gió đẩy bạn về!', retreat: 'Rút lui ↓ Trời M9', follow: n => `${n} đuổi theo bạn!`, wait: n => `${n} lượn vòng chờ ngay bên ngoài…`, back: n => `${n} lao xuống!`,
    end: 'Dân làng tỉnh lại, đổ nát được dựng lại', ko: 'Bị hất văng — choáng!', noBelow: 'Bên dưới không có đất để hạ' },
  en: { down: v => `🚁 Down to the Mid tier over ${v}`, wall: 'Storm-cloud wall — the wind pushes you back!', retreat: 'Retreat ↓ M9 sky', follow: n => `${n} is chasing you!`, wait: n => `${n} circles right outside, waiting…`, back: n => `${n} dives in!`,
    end: 'Villagers come round, the ruins are rebuilt', ko: 'Flung — dazed!', noBelow: 'No land below to go down to' },
};
const L = ctx => STR[ctx.lang() === 'vi' ? 'vi' : 'en'];
const zid = ctx => (ctx.S.zone && ctx.S.zone.id) || '';
const ease = u => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u));
const LANDZ = /^(village|sea|m[1-9]|road[1-9])$/;
/* vùng chứa được trùm bay: ngoài trời / trời / sân trời */
export function hostable(id, ZS) { const Z = ZS && ZS[id]; return LANDZ.test(id || '') || /^u[1-4]$/.test(id || '') || !!(Z && (Z.sky || Z.skyArena)); }   /* u1–u4: rết bơi theo xuống biển (terrain.js: xoáy / bong bóng / sét lan / bùn) */
const AC = { air: null, tum: null, chase: null, cine: null, ko: [], fx: [], tier: null, ctx: null, log: [], wallCd: 0, bob: 0, restoreT: 0, stats: { tumbles: 0, rkTumbles: 0, wall: 0, impacts: 0, smashed: 0, npcKo: 0, animals: 0, mons: 0, cines: {} } };
const log = s => { AC.log.push(Math.round(((AC.ctx && AC.ctx.S.time) || 0) * 10) / 10 + ' ' + s); if (AC.log.length > 80) AC.log.shift(); };
export const airOn = ctx => !!(ctx.S.map && ctx.S.map.air);
export function tierOf(ctx) { const m = ctx.S.map; if (!m) return 'ground'; if (m.air) return 'air'; if (m.sky) return 'sky'; if (ctx.isUnderwater && ctx.isUnderwater()) return 'under'; if (ctx.alt) { const h = ctx.alt.h(); return h <= 0.5 ? 'ground' : h < 120 ? 'mid' : 'high'; } if (ctx.playerAir && ctx.playerAir()) return 'mid'; return 'ground'; }

/* ---------------- ảnh ---------------- */
const IM = {};
function img(src) { if (!IM[src]) { const i = new Image(); i.src = 'assets/px/' + src; IM[src] = i; if (i.decode) i.decode().then(() => { i.__dec = 1; }, () => { i.__dec = 1; }); else i.__dec = 1; } const i = IM[src]; return i.__dec && i.complete && i.naturalWidth ? i : null; }   /* plan-37: giải mã ảnh ngoài luồng chính (decode()) trước lần vẽ đầu — tránh giật giữa trận */
const TINT = {};
function tinted(src, col) { const k = src + col; if (TINT[k]) return TINT[k]; const im = img(src); if (!im || typeof document === 'undefined') return null; const c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight; const g = c.getContext('2d'); g.drawImage(im, 0, 0); g.globalCompositeOperation = 'source-atop'; g.fillStyle = col; g.fillRect(0, 0, c.width, c.height); return (TINT[k] = c); }   /* canvas KHÔNG __hi → luôn vẽ kèm kích thước đích */
const VX = n => ART.vfx && ART.vfx[n];
function sheetAt(g, s, f, x, y, alpha = 1, rot = 0) { if (!s || !s.img) return; const hi = s.img.__hi ? 1 : 2; f = Math.max(0, Math.min(s.n - 1, f)); g.save(); g.imageSmoothingEnabled = false; g.globalAlpha = alpha; g.translate(Math.round(x), Math.round(y)); if (rot) g.rotate(rot); g.drawImage(s.img, f * s.w * hi, 0, s.w * hi, s.h * hi, -Math.round(s.w / 2), -Math.round(s.h / 2), s.w, s.h); g.restore(); }
/* 2026-10-14 anh: bỏ ảnh mây đám / bụi hoạt hình cứng → bản MỀM (làm mờ Gauss từ chính VFX PixelLab) + SƯƠNG mềm (zones/sky/fog) cho mọi mây */
const SOFT = { ac_dustring: 'ac_dustsoft', tr_splash: 'tr_splash_px', tr_sand: 'tr_sand_soft', tr_silt: 'tr_silt_soft' };
const FOGB = [];
function fogBurst(x, y, o = {}) { while (FOGB.length > 70) FOGB.shift();   /* giữ tối đa ~70 khối sương bung (hiệu năng điện thoại) */ for (let i = 0; i < (o.n || 5); i++) { const a = Math.random() * TAU; FOGB.push({ x: x + Math.cos(a) * 6, y: y + Math.sin(a) * 4, vx: Math.cos(a) * (40 + Math.random() * 40), vy: Math.sin(a) * (24 + Math.random() * 20) - 8, t: 0, dur: o.dur || 1.1, i: i % 4, s: (o.s || 0.5) + Math.random() * 0.25, col: o.col || '#eef2ff', top: o.top !== false }); } }
function fx(name, x, y, o = {}) { if (name === 'ac_cloudburst') { if (!VX('bk_burst_cloud')) { fogBurst(x, y + 20, { s: 0.6, n: 6 }); return true; } name = 'bk_burst_cloud'; y += 20; o = { ...o, top: false }; }   /* 2026-10-15 anh: lao / đáp qua mặt mây = mây BUNG pixel thay sương mềm */ const s = VX(SOFT[name]) || VX(name); if (!s) return false; AC.fx.push({ s, x, y, t: 0, dur: o.dur || s.n / (s.fps || 12), top: o.top !== false, screen: !!o.screen, rot: o.rot || 0, alpha: o.alpha || 1 }); return true; }

/* ---------------- người chơi giữa trời ---------------- */
const bob = ctx => Math.round(Math.sin(ctx.S.time * 2.6) * 1.2);
function airDraw(g, ent) {
  const ctx = AC.ctx; if (!ctx) return; const x = Math.round(ent.x), y = Math.round(ent.y), t = ctx.S.time, T = AC.tum, lift = AIR_LIFT + (T ? 0 : bob(ctx)) + (AC.cine && AC.cine.pdy ? AC.cine.pdy : 0);
  shadowSoft(g, x, y + 1, 1);
  if (T) {   /* LỘN NHÀO: clip knockfly (PixelLab) xoay quanh giữa thân + chong chóng xoay theo, vệt gió sau thân */
    const sp = Math.hypot(T.vx, T.vy);
    if (sp > 60) { const im = fogTint(1, '#e8eeff'); if (im) { const sm = g.imageSmoothingEnabled; g.imageSmoothingEnabled = true; g.globalAlpha = Math.min(0.35, sp / 600); const w = 34, hh = 10; g.drawImage(im, x - Math.sign(T.vx || 1) * 20 - w / 2, y - lift - 9 - hh / 2, w, hh); g.globalAlpha = 1; g.imageSmoothingEnabled = sm; } }   /* vệt gió mềm (sương) sau thân, không cục mây */
    const acts = ent.sheet && ent.sheet.actions, c = acts && (acts.knockfly || acts.hurt), cy = y - lift - 9;
    g.save(); g.translate(x, cy); g.rotate(T.ang); g.translate(-x, -cy);
    let hx = x, hy = y - lift - 19;
    if (c) { const ch = c.ch || 20, cw = c.cw || 16, f = Math.min(c.n - 1, 2 + Math.floor(T.t * 9) % Math.max(1, c.n - 2)), row = T.row ?? ent.dir, X0 = x - (cw >> 1), Y0 = y - lift - 18 - (ch - 20); g.drawImage(c.img, f * cw, row * ch, cw, ch, X0, Y0, cw, ch); const tp = topOf(c.img, f * cw, row * ch, cw, ch); hx = X0 + tp.cx; hy = Y0 + tp.top; }
    else { const cc = ent.custom; ent.custom = null; g.save(); g.translate(0, -lift); try { ent.draw(g); } finally { ent.custom = cc; g.restore(); } }
    drawCopter(g, hx, hy, t, 26); g.restore();   /* chong chóng xoay CÙNG góc với thân, gắn ở đỉnh đầu */
    ent.labelUp = lift + 14; return;
  }
  let hd; const sp = ent.kiSpin; if (sp) { g.save(); g.translate(x, y - lift - 10); g.rotate(sp.ang || 0); g.translate(-x, -(y - lift - 10)); }   /* ki.js lộn nhào né: chỉ xoay NGƯỜI + chong chóng quanh giữa thân (Rocky không xoay) */
  if (ent.action || (ent.sheet && !(ent.sheet.actions && ent.sheet.actions.hover))) {   /* đang có động tác (chém, ăn, ngất…) → thân thật nâng lên */
    const cc = ent.custom; ent.custom = null; g.save(); g.translate(0, -lift); try { ent.draw(g); } finally { ent.custom = cc; } g.restore();
    const sk = ent.sheet && ent.sheet.skin; if (sk) { const X = x - Math.floor(sk.cw / 2), Y = y + 2 - sk.ch - lift, tp = topOf(sk.img, 0, (ent.dir & 3) * sk.ch, sk.cw, sk.ch); hd = { hx: X + tp.cx, hy: Y + tp.top }; }
    else { const X = x - 8, Y = y - 18 - lift, tp = topOf(ent.sheet, 0, (ent.dir & 3) * 20, 16, 20); hd = { hx: X + tp.cx, hy: Y + tp.top }; }
    if (ent.action && ent.action.name === 'knockdown') hd = { hx: x, hy: y - lift - 6 };   /* nằm ngất: chong chóng giữ xác */
  } else hd = drawPlayer(g, ent, x, y - lift, 'hover', t);
  copterAt(g, hd, t, AC.tum ? 26 : 18); if (sp) g.restore();
  ent.labelUp = lift + 14;   /* tên ở trên chong chóng */
}
function shadowSoft(g, x, y, k) { for (const [m, al] of [[1.4, 0.12], [1.0, 0.16], [0.6, 0.22]]) { g.fillStyle = `rgba(14,10,40,${(al * k).toFixed(3)})`; g.beginPath(); g.ellipse(x, y, 9 * m, 3 * m, 0, 0, TAU); g.fill(); } }
function enterAir(ctx) {
  const p = ctx.S.player, A = ctx.S.map.air; AC.air = A;
  p.custom = airDraw; p.airBody = true; p.ghost = true; p.speedMul = 1.35; p.boxW = 10; p.boxH = 6; p.passable = (m, tx, ty) => tx >= 0 && ty >= 0 && tx < m.w && ty < m.h;
  log('air on ' + zid(ctx));
}
function leaveAir(ctx) {
  const p = ctx.S.player; AC.air = null; AC.tum = null;
  if (p.custom === airDraw) p.custom = null; p.airBody = false; p.ghost = false; p.speedMul = 1; p.passable = null; p.labelUp = 0;
}
/* biên mềm: chuẩn hoá elip (≤ 1 = trong sân) */
function norm(A, x, y) { return Math.hypot((x - A.cx) / A.rx, (y - A.cy) / A.ry); }
export function airBound(x, y) { const A = AC.air; return !A || norm(A, x, y) < 1.02; }
function softWall(ctx, ent, dt, isP) {
  const A = AC.air; if (!A || !ent) return; const d = norm(A, ent.x, ent.y); if (d <= 0.96) return;
  const k = Math.min(1, dt * (d > 1.05 ? 10 : 4)), tx = A.cx + (ent.x - A.cx) * 0.96 / d, ty = A.cy + (ent.y - A.cy) * 0.96 / d;
  ent.x += (tx - ent.x) * k; ent.y += (ty - ent.y) * k;
  if (isP && AC.wallCd <= 0) { AC.wallCd = 1.6; AC.stats.wall++; if (!fx('bk_kick_cloud', ent.x, ent.y, { top: false })) fogBurst(ent.x, ent.y - 10, { s: 0.3, n: 3, dur: 0.8, col: '#cfd6f0' }); if (AC.ctx) { AC.ctx.sfx('whoosh'); AC.ctx.toast(L(AC.ctx).wall); } log('wall'); }
}

/* ---------------- lộn nhào giữa trời (thay knock 'fly' khi đang bay: sân trời / trời / tầng Trung) ---------------- */
function tumble(ctx, o) {
  const p = ctx.S.player, pw = Math.max(0.5, Math.min(1.6, o.power || 1)), l = Math.hypot(o.dir && o.dir.x || 0, o.dir && o.dir.y || 0) || 1;
  let ux = (o.dir ? o.dir.x : 1) / l, uy = (o.dir ? o.dir.y : 0) / l; if (Math.abs(ux) < 0.35) { ux = (ux >= 0 ? 1 : -1) * 0.5; const n = Math.hypot(ux, uy); ux /= n; uy /= n; }   /* văng NGANG là chính */
  const sp = 230 * pw;
  AC.tum = { vx: ux * sp, vy: uy * sp * 0.8, t: 0, ang: 0, spin: (ux >= 0 ? 1 : -1) * TAU * (pw >= 1 ? 1.4 : 0.9), stab: 0, prev: { custom: p.custom, sm: p.speedMul }, row: Math.abs(ux) >= Math.abs(uy) ? (ux > 0 ? 2 : 1) : (uy > 0 ? 0 : 3), x0: p.x, y0: p.y, maxD: 0 };
  if (p.custom !== airDraw) p.custom = airDraw; p.speedMul = 0; p.autoPath = null; if (p.endAct) p.endAct();
  if (ctx.hero && ctx.hero.iframes) ctx.hero.iframes(2.2);
  ctx.sfx('knock_whoosh'); if (ctx.quake) ctx.quake(0.1); fx('knock_heavy', p.x - ux * 4, p.y - AIR_LIFT - 4); if (!fx('bk_kick_cloud', p.x, p.y, { top: false })) fogBurst(p.x, p.y - 10, { s: 0.28, n: 3, dur: 0.7, col: '#dfe6ff' });
  AC.stats.tumbles++; log('tumble ' + (o.type || '') + ' pw ' + pw.toFixed(2));
}
function tumbleTick(ctx, dt) {
  const T = AC.tum, p = ctx.S.player; if (!T) return; T.t += dt; p.speedMul = 0; p.moving = false;
  const f = Math.exp(-2.6 * dt); T.vx *= f; T.vy *= f; const sp = Math.hypot(T.vx, T.vy);
  const n = Math.max(1, Math.ceil(sp * dt / 3)), m = ctx.S.map;
  for (let i = 0; i < n; i++) { const nx = p.x + T.vx * dt / n, ny = p.y + T.vy * dt / n;
    const okB = AC.air ? airBound(nx, ny) : (nx > 12 && ny > 12 && nx < m.w * TS - 12 && ny < m.h * TS - 12 && (!p.passable || p.passable(m, Math.floor(nx / TS), Math.floor(ny / TS))));
    if (!okB) { T.vx *= -0.2; T.vy *= -0.2; if (!T.wall) { T.wall = true; if (!fx('bk_kick_cloud', p.x, p.y, { top: false })) fogBurst(p.x, p.y - 10, { s: 0.28, n: 3, dur: 0.7, col: '#dfe6ff' }); ctx.sfx('knock_wall'); log('tumble wall'); } break; }
    p.x = nx; p.y = ny; }
  T.maxD = Math.max(T.maxD, Math.hypot(p.x - T.x0, p.y - T.y0));
  if (sp > 40) T.ang += T.spin * dt * Math.min(1, sp / 160);
  else { T.stab += dt; const a = ((T.ang % TAU) + TAU) % TAU, back = a > Math.PI ? a - TAU : a; T.ang = back * Math.exp(-9 * dt) + Math.sin(T.stab * 22) * 0.08 * Math.max(0, 1 - T.stab / 0.4); }   /* chong chóng giữ thăng bằng lại: lắc nhỏ tắt dần */
  if (T.stab >= 0.4 || T.t > 2.4) { AC.tum = null; p.speedMul = T.prev.sm == null ? 1 : T.prev.sm; if (p.custom === airDraw && T.prev.custom && T.prev.custom !== airDraw) p.custom = T.prev.custom; else if (!AC.air && p.custom === airDraw) p.custom = T.prev.custom || null;
    if (ctx.hero && ctx.hero.iframes) ctx.hero.iframes(0.6); AC.last = { dx: Math.round(p.x - T.x0), dy: Math.round(p.y - T.y0), maxD: Math.round(T.maxD), t: +T.t.toFixed(2), wall: !!T.wall }; log('tumble end ' + JSON.stringify(AC.last)); }
}
const FLY_TYPES = { fly: 1, launch: 1, throw: 1, uppercut: 1 };
/* đòn theo PHƯƠNG ĐỨNG (sky.js ctx.alt.knockV): hất → lên · đập → xuống · cú mạnh khi đang bay thấp → ĐẬP XUỐNG ĐẤT. o.vert ('up' | 'down' | 'slam' | 'none') ghi đè */
function vertKnock(ctx, o, tr) {
  if (!ctx.alt || !ctx.alt.knockV) return; const pw = Math.max(0.5, Math.min(1.6, o.power || 1)), h = ctx.alt.h(), v = o.vert || (o.type === 'launch' || o.type === 'uppercut' ? 'up' : o.type === 'throw' ? 'down' : 'side');
  if (v === 'none') return;
  if (v === 'up') ctx.alt.knockV(Math.round(70 * pw)); else if (v === 'slam' || (v !== 'up' && tr === 'mid' && pw >= 1.05 && h < 120)) ctx.alt.knockV(-h, { slam: true }); else if (v === 'down') ctx.alt.knockV(-Math.round(60 * pw)); else ctx.alt.knockV(-Math.round(25 * pw));
}

/* ---------------- va chạm môi trường: dân / thú / quái / vật (không vùng an toàn) ---------------- */
function koDraw(g, n) {
  const k = n.ko; if (!k) return; const x = Math.round(n.x), y = Math.round(n.y) - Math.round(k.z || 0), cc = n.custom;
  g.save(); g.translate(x, y - 5); g.rotate((k.side || 1) * Math.PI / 2 * Math.min(1, (k.t || 0) / 0.25)); g.translate(-x, -(y - 5)); n.custom = null; try { n.draw(g); } finally { n.custom = cc; } g.restore();
  const sh = VX('knock_dizzy'); if (sh && k.t > 0.3 && !k.up) { const f = Math.floor(k.t * (sh.fps || 12)) % sh.n; sheetAt(g, sh, f, x, y - 12, 0.9); }
}
function koNpc(ctx, n, src, pw) {
  if (!n || n.ko || n === ctx.S.player) return false;
  const d = Math.hypot(n.x - src.x, n.y - src.y) || 1, ux = (n.x - src.x) / d, uy = (n.y - src.y) / d;
  n.ko = { t: 0, vx: ux * 150 * pw, vy: uy * 120 * pw, z: 0, vz: 120, side: ux >= 0 ? 1 : -1, prevCustom: n.custom || null };
  n.goal = null; n.path = null; n.busy = true; n.moving = false; n.walking = false; n.custom = koDraw; AC.ko.push(n); AC.stats.npcKo++;
  if (ctx.bubble && Math.random() < 0.6) try { ctx.bubble(n, ctx.lang() === 'vi' ? 'Áaa!' : 'Aaah!', 1.2); } catch (e) { /* bỏ qua */ }
  return true;
}
function koTick(ctx, dt) {
  const m = ctx.S.map;
  for (const n of AC.ko) { const k = n.ko; if (!k) continue; k.t += dt;
    if (k.vz || k.z > 0) { k.vz -= 520 * dt; k.z = Math.max(0, k.z + k.vz * dt); if (k.z <= 0 && k.vz < 0) { k.vz = 0; k.z = 0; if (ctx.vfx) ctx.vfx('dirt_puff', n.x, n.y + 2); } }
    const sp = Math.hypot(k.vx, k.vy); if (sp > 5) { const nx = n.x + k.vx * dt, ny = n.y + k.vy * dt; if (!ctx.isSolid(m, Math.floor(nx / TS), Math.floor((ny - 2) / TS)) && nx > 20 && ny > 20 && nx < m.w * TS - 20 && ny < m.h * TS - 20) { n.x = nx; n.y = ny; } else { k.vx = 0; k.vy = 0; } k.vx *= Math.exp(-5 * dt); k.vy *= Math.exp(-5 * dt); }
    if (k.up) { k.upT -= dt; if (k.upT <= 0) { n.custom = k.prevCustom; n.busy = false; n.ko = null; } } }
  AC.ko = AC.ko.filter(n => n.ko);
}
function wakeAll(ctx) { for (const n of AC.ko) if (n.ko && !n.ko.up) { n.ko.up = true; n.ko.upT = 0.3 + Math.random() * 0.8; } }
function flingAnimal(ctx, a, src, pw) {
  const m = ctx.S.map, d = Math.hypot(a.x - src.x, a.y - src.y) || 1, ux = (a.x - src.x) / d, uy = (a.y - src.y) / d;
  for (let s = 0; s < 6; s++) { const nx = a.x + ux * 5 * pw, ny = a.y + uy * 4 * pw; if (ctx.isSolid(m, Math.floor(nx / TS), Math.floor(ny / TS))) break; a.x = nx; a.y = ny; }
  a.scared = 3; if (ctx.vfx) ctx.vfx('knock_dizzy', a.x, a.y - 6, 1); AC.stats.animals++;
}
/* đòn trùm trúng vùng (x, y, r): pw 1…5 sức phá vật; src = điểm phát đòn; skip = quái trùm (không tự trúng) */
function impact(ctx, x, y, r, o = {}) {
  const pw = o.pw || 2, src = o.src || { x, y }, m = ctx.S.map; if (!m) return 0; let n = 0; AC.stats.impacts++;
  for (const nn of (ctx.S.npcs || []).concat(ctx.S.staff || [], ctx.S.guide ? [ctx.S.guide] : [])) if (nn && !nn.ko && Math.hypot(nn.x - x, nn.y - y) < r + 6 && koNpc(ctx, nn, src, Math.min(1.4, 0.6 + pw * 0.15))) n++;
  if (ctx.animals) for (const a of ctx.animals.list()) if (a && Math.hypot(a.x - x, a.y - y) < r + 6) { flingAnimal(ctx, a, src, pw); n++; }
  if (ctx.monsters) for (const mo of ctx.monsters.list().slice()) { if (!mo || mo.hp <= 0 || (o.skip && o.skip(mo)) || mo.c.bkBoss || mo.c.bkP2 || mo.c.chaseBoss) continue; if (Math.hypot(mo.x - x, mo.y - y) < r + 8) { ctx.monsters.damage(mo, Math.max(4, Math.round((o.dmg || 30) * (0.6 + pw * 0.2))), src, 0, 160, true); AC.stats.mons++; n++; } }
  if (!m.air && !m.sky && o.smash !== false) {   /* phá vật: cùng luật Rocky-ha (blast.js) — ảnh hư / đổ nát của CHÍNH vật */
    const seen = new Set(), x0 = Math.floor((x - r) / TS), x1 = Math.floor((x + r) / TS), y0 = Math.floor((y - r) / TS), y1 = Math.floor((y + r) / TS);
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) { if (tx < 0 || ty < 0 || tx >= m.w || ty >= m.h) continue; if (Math.hypot(tx * TS + 8 - x, ty * TS + 8 - y) > r + 6) continue;
      const ob = solidObjAt(ctx, tx, ty); if (!ob || seen.has(ob)) continue; seen.add(ob); let res = null; try { res = smashObj(ctx, ob, pw, tx * TS + 8 >= src.x ? 1 : -1); } catch (e) { console.error('smash', e); } if (res) { AC.stats.smashed++; if (res.gone) { if (ob.ruined) ob.bossSmash = true; log('smash ' + (ob.orig || ob.type)); } } }
  }
  return n;
}
/* sau trận: vật đổ nát dựng lại (không ai đứng trên chân vật), dân tỉnh dậy */
function restoreRuins(ctx) {
  const m = ctx.S.map, p = ctx.S.player; if (!m || !m.rkRuins) return 0; let k = 0; const ents = [p]; const rp = ctx.rocky && ctx.rocky.pos && ctx.rocky.pos(); if (rp) ents.push(rp);   /* người chơi / Rocky đứng trên → đợi; dân đứng trên → dời ra ô trống ngay dưới */
  for (const o of m.rkRuins) { if (!o.ruined || o.ghost || !o.bossSmash) continue; const d = ctx.O[o.orig || o.type] || { fw: 1, fh: 1 };
    if (ents.some(e => e && e.x >= o.x * TS - 6 && e.x < (o.x + d.fw) * TS + 6 && e.y >= o.y * TS - 2 && e.y < (o.y + d.fh) * TS + 8)) continue;
    for (const n of ctx.S.npcs || []) if (n.x >= o.x * TS - 4 && n.x < (o.x + d.fw) * TS + 4 && n.y >= o.y * TS - 2 && n.y < (o.y + d.fh) * TS + 6) { for (let dy = 1; dy < 5; dy++) { const ty = o.y + d.fh + dy - 1, tx = Math.floor(n.x / TS); if (!ctx.isSolid(m, tx, ty)) { n.y = ty * TS + 12; break; } } }
    o.ruined = false; o.rkRuin = false; o.hp = o.rkPrev; delete o.hpMax; delete o.rkHp; delete o.rkMax; delete o.bossSmash;
    for (let j = 0; j < d.fh; j++) for (let i = 0; i < d.fw; i++) { if (m.rkRuinTiles) m.rkRuinTiles.delete((o.y + j) * m.w + o.x + i); if (ctx.setSolid && d.solid !== false) ctx.setSolid(m, o.x + i, o.y + j, 1); }
    if (ctx.vfx) ctx.vfx('dirt_puff', (o.x + d.fw / 2) * TS, (o.y + d.fh) * TS); k++; }
  m.rkRuins = m.rkRuins.filter(o => o.ruined); log('restore ' + k); return k;
}

/* ---------------- cảnh điện ảnh (dùng chung) ----------------
   kind 'descend' : người chơi lao xuống xuyên biển mây (sân trời → tầng Trung bên dưới) · 'arriveP': trồi ra khỏi mây ở vùng dưới
   kind 'boss'    : trùm lao tới (bóng lớn dần · gầm · khung phim · sét + loé + rung NGẮN lúc chạm · vòng bụi / mây bung) — adapter tự vẽ thân trùm
   kind 'tier'    : trùm đổi tầng theo người (ngắn hơn)  · 'up' / 'down' phủ lên cảnh cất / hạ cánh của sky.js khi đang bị đuổi */
function cineStart(ctx, kind, o = {}) { AC.cine = { kind, t: 0, dur: o.dur || 1.6, x: o.x, y: o.y, hitAt: o.hitAt ?? 1.15, hit: false, onHit: o.onHit || null, onEnd: o.onEnd || null, from: o.from || 'above', ground: o.ground ?? !(ctx.S.map && (ctx.S.map.air || ctx.S.map.sky)), bars: o.bars ?? true, roar: false, name: o.name || '' }; AC.stats.cines[kind] = (AC.stats.cines[kind] || 0) + 1; log('cine ' + kind); return AC.cine; }
function cineTick(ctx, dt) {
  const C = AC.cine; if (!C) return; C.t += dt; const p = ctx.S.player;
  if (C.kind === 'boss' || C.kind === 'tier') {
    if (!C.roar && C.t > 0.15) { C.roar = true; ctx.sfx('roar_big'); }
    if (!C.hit && C.t >= C.hitAt) { C.hit = true;
      if (C.from === 'above') { const n = (Math.random() * 4) | 0; fx('td_sky' + n, C.x, C.y) || fx('dr_bolt', C.x, C.y); }
      if (C.ground && VX('bk_dustring')) fx('bk_dustring', C.x, C.y + 23, { top: false }); else fx(C.ground ? 'ac_dustring' : 'ac_cloudburst', C.x, C.y - (C.ground ? 20 : 30));   /* 2026-10-14: vòng bụi đất PixelLab (crater_dust) lúc trùm đáp */ if (ctx.quake) ctx.quake(0.22); C.flash = 0.14; ctx.sfx('smash');
      if (C.onHit) try { C.onHit(C); } catch (e) { console.error('cine hit', e); } }
    if (C.flash > 0) C.flash -= dt;
  }
  if (C.kind === 'descend') { C.pdy = -ease(Math.min(1, C.t / 0.9)) * 70; if (ctx.S.camDY != null) ctx.S.camDY = (ctx.S.camDY || 0) + dt * 60; if (!C.burst && C.t > 0.55) { C.burst = true; fx('ac_cloudburst', p.x, p.y + 30); ctx.sfx('whoosh_big'); } }
  if (C.kind === 'arriveP') { C.pdy = (1 - ease(Math.min(1, C.t / 0.8))) * 80; if (!C.burst) { C.burst = true; fx('ac_cloudburst', p.x, p.y - 40); } }
  if (C.t >= C.dur) { AC.cine = null; if (C.kind === 'descend' || C.kind === 'arriveP') { if (ctx.S.camDY) ctx.S.camDY = 0; } if (C.onEnd) try { C.onEnd(C); } catch (e) { console.error('cine end', e); } }
}
function drawCineWorld(g, ctx, cx, cy) {   /* bóng trùm lớn dần trên mặt đất / biển mây trước khi lao xuống */
  const C = AC.cine; if (!C || (C.kind !== 'boss' && C.kind !== 'tier') || C.x == null) return; if (C.t > C.hitAt + 0.1) return;
  const u = Math.min(1, C.t / C.hitAt), X = Math.round(C.x - cx), Y = Math.round(C.y - cy);
  for (const [mm, al] of [[1.6, 0.1], [1.15, 0.14], [0.7, 0.2]]) { g.fillStyle = `rgba(8,4,24,${(al * (0.3 + 0.7 * u)).toFixed(3)})`; g.beginPath(); g.ellipse(X, Y, (8 + 30 * u) * mm, (3 + 11 * u) * mm, 0, 0, TAU); g.fill(); }
}
function drawCineUI(ug, ctx) {
  const C = AC.cine, W = ug.canvas.width, H = ug.canvas.height, sk = ctx.skyCut ? ctx.skyCut() : null, chase = !!AC.chase;
  const speed = (dirUp, a) => { const s = VX('ac_speedlines'); if (!s) return; const k = W / (ctx.VW || 480), f = Math.floor(ctx.S.time * (s.fps || 12)) % s.n, hi = s.img.__hi ? 1 : 2; ug.save(); ug.imageSmoothingEnabled = false; ug.globalAlpha = a;
    for (let i = -1; i <= 1; i++) { ug.save(); ug.translate(W / 2 + i * s.h * k * 0.95, H / 2); ug.rotate(dirUp ? -Math.PI / 2 : Math.PI / 2); ug.drawImage(s.img, f * s.w * hi, 0, s.w * hi, s.h * hi, -s.w * k / 2, -s.h * k / 2, s.w * k, s.h * k); ug.restore(); } ug.restore(); };
  const fogRush = (dirUp, u, a) => { const k = W / (ctx.VW || 480); ug.save(); ug.globalAlpha = a; for (let i = 0; i < 6; i++) { const im = fogTint(i % 4, '#f2f5ff'); if (!im) continue; const w = im.width / 2 * k, h = im.height / 2 * k, x = ((i * 0.37) % 1) * W - w / 2 + (i % 2 ? 40 : -40) * k, y0 = (i / 6) * H, y = (dirUp ? (y0 - u * H * 1.6) : (y0 + u * H * 1.6)) % (H + h); ug.drawImage(im, x, (y < -h ? y + H + h : y) - h / 2, w, h); } ug.restore(); };
  if (C && (C.kind === 'descend' || C.kind === 'arriveP')) { const u = Math.min(1, C.t / C.dur); speed(C.kind === 'descend', 0.75 * (C.kind === 'descend' ? Math.min(1, C.t * 3) : 1 - u)); fogRush(C.kind === 'descend', u, C.kind === 'descend' ? Math.min(0.9, C.t * 1.4) : 0.9 * (1 - u));
    const wa = C.kind === 'descend' ? Math.max(0, (C.t - 0.6) / 0.4) : Math.max(0, 1 - C.t / 0.45); if (wa > 0) { ug.save(); ug.globalAlpha = Math.min(1, wa); ug.fillStyle = '#f4f6ff'; ug.fillRect(0, 0, W, H); ug.restore(); } }
  if (ctx.alt && ctx.alt.fast && ctx.alt.fast() && !ctx.alt.falling()) { const vz = ctx.alt.vz(), k = Math.min(1, (Math.abs(vz) - 110) / 140), hh = ctx.alt.h(), inC = hh > 480 && hh < 760; speed(vz < 0, 0.15 + 0.4 * k); fogRush(vz < 0, (ctx.S.time * (0.4 + 0.9 * k)) % 1, (inC ? 0.75 : 0.3) * (0.4 + 0.6 * k)); }   /* 2026-10-14: bổ nhào / vút lên nhanh theo cần gạt → vệt tốc độ + sương lao qua (mạnh theo tốc độ) */
  if (ctx.alt && ctx.alt.falling && ctx.alt.falling()) { speed(true, 0.8); const hh = ctx.alt.h(); if (hh > 520 && hh < 720) fogRush(true, (ctx.S.time * 0.9) % 1, 0.7); }   /* bị ĐẬP rơi: vệt tốc độ + sương lao vút lên khi xuyên tầng mây */
  if (chase && sk && /^(up|down|touch|arrive|midup|middown)$/.test(sk)) { const up = sk === 'up' || sk === 'midup'; speed(up, sk === 'midup' || sk === 'middown' ? 0.35 : 0.6); }   /* cảnh cất / hạ cánh của sky.js khi đang bị đuổi: thêm vệt tốc độ */
  if (C && (C.kind === 'boss' || C.kind === 'tier') && C.bars) {   /* khung phim: 2 dải đen trượt vào rồi ra */
    const a = Math.min(1, C.t / 0.25, Math.max(0, (C.dur - C.t) / 0.3)), bh = Math.round(H * 0.085 * a); ug.fillStyle = '#05040a'; ug.fillRect(0, 0, W, bh); ug.fillRect(0, H - bh, W, bh);
    if (C.name && a > 0.6) { ug.save(); ug.font = `${Math.max(16, Math.round(H * 0.035))}px VT323, monospace`; ug.textAlign = 'center'; ug.textBaseline = 'middle'; ug.fillStyle = '#ffe9a8'; ug.globalAlpha = a; ug.fillText(C.name, W / 2, H - bh / 2); ug.restore(); }
    if (C.flash > 0) { ug.save(); ug.globalAlpha = Math.min(0.85, C.flash / 0.14 * 0.85); ug.fillStyle = '#ffffff'; ug.fillRect(0, 0, W, H); ug.restore(); } }
}

/* ---------------- bầu trời sân không chiến: nhiều lớp mây trôi bên dưới + tường mây bão ---------------- */
const WRC = {};
function wallRing(A, col) {   /* 2026-10-15: VÒNG TƯỜNG MÂY PIXEL quanh sân trời — 3 vòng elip (trong mỏng → ngoài dày) mây pixel PixelLab xếp chồng, dựng 1 lần / sân + màu */
  const key = A.cx + '|' + A.cy + '|' + A.rx + '|' + A.ry + '|' + col; if (WRC[key]) return WRC[key]; if (typeof document === 'undefined') return null;
  const ims = ['sky-cl-wall', 'sky-cl-big-a', 'sky-cl-big-b', 'sky-cl-wall', 'sky-cl-band'].map((n, i) => pxCloudTint(n, col, i === 4 ? 0.35 : 0.3)); if (ims.some(q => !q)) return null;
  const M = 90, W = Math.ceil(A.rx * 2.5 + M * 2), H = Math.ceil(A.ry * 2.5 + M * 2), c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d'); x.imageSmoothingEnabled = false; const ox = W / 2, oy = H / 2;
  let s = 7; const R = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
  for (const [rr, al, step] of [[0.97, 0.55, 34], [1.06, 0.8, 30], [1.16, 0.95, 26], [1.24, 1, 24]]) { const L = Math.PI * (A.rx + A.ry) * rr, N = Math.ceil(L / step); x.globalAlpha = al;
    for (let i = 0; i < N; i++) { const a = (i + R() * 0.6) / N * Math.PI * 2, im = ims[(i + Math.floor(rr * 10)) % ims.length], px = ox + Math.cos(a) * A.rx * rr - im.width / 2, py = oy + Math.sin(a) * A.ry * rr - im.height * 0.6; x.drawImage(im, Math.round(px), Math.round(py)); } }
  WRC[key] = toBmp({ c, x: Math.round(A.cx - ox), y: Math.round(A.cy - oy) }); return WRC[key];
}
function drawAirSky(g, ctx, cx, cy) {
  const A = AC.air, VW = ctx.VW || 480, VH = ctx.VH || 270, t = ctx.S.time, red = !!(A.red && A.red());
  const gr = g.createLinearGradient(0, 0, 0, VH); gr.addColorStop(0, red ? '#9a5a78' : '#5f86cc'); gr.addColorStop(0.55, red ? '#c88a94' : '#97b6e4'); gr.addColorStop(1, red ? '#e8b8a8' : '#cddcf2'); g.fillStyle = gr; g.fillRect(-2, -2, VW + 4, VH + 4);   /* 2026-10-14: trời sáng có chiều sâu (sẫm trên, nhạt dưới) */
  const sm = g.imageSmoothingEnabled; g.imageSmoothingEnabled = true;
  { const th = { col: red ? '#d89aa8' : '#a8c4ec' };   /* biển mây BÊN DƯỚI như các tầng trời (sky.js fogLayer): lớp xa trôi chậm = sâu, lớp gần nhanh + to */
    fogLayer(g, ctx, th, 'dark', 0.26, 9, 0.55, 2, 1.35, 3, cx, cy, t); fogLayer(g, ctx, th, 'light', 0.55, 12, 0.75, 4, 1.5, 7, cx, cy, t); fogLayer(g, ctx, th, 'light', 0.32, 6, 1.12, 7, 1.8, 21, cx, cy, t); }
  g.globalAlpha = 1;
  /* BIÊN = TƯỜNG SƯƠNG DÀY dần ra ngoài (anh 2026-10-14: bỏ dải bão cong tối) — map.air.edge: 'fog' (mặc định; vùng có lối kề thì hệ khác xử lý chuyển vùng) */
  if ((A.edge || 'fog') === 'fog') { const ex = Math.round(A.cx - cx), ey = Math.round(A.cy - cy), fc = red ? '196,150,160' : '158,172,214';
    g.save(); g.translate(ex, ey); g.scale(1, A.ry / A.rx); const gr2 = g.createRadialGradient(0, 0, A.rx * 0.82, 0, 0, A.rx * 1.22); gr2.addColorStop(0, `rgba(${fc},0)`); gr2.addColorStop(0.45, `rgba(${fc},.45)`); gr2.addColorStop(1, `rgba(${fc},.97)`); g.fillStyle = gr2; g.fillRect(-VW * 4, -VH * 6, VW * 8, VH * 12); g.restore();
    const wallC = red ? '#d8b0b8' : '#b8c4e8', WR = wallRing(A, wallC); if (WR) { const sm2 = g.imageSmoothingEnabled; g.imageSmoothingEnabled = false; g.globalAlpha = 1; const x0 = Math.max(0, WR.x - cx), y0 = Math.max(0, WR.y - cy), x1 = Math.min(VW, WR.x - cx + WR.c.width), y1 = Math.min(VH, WR.y - cy + WR.c.height); if (x1 > x0 && y1 > y0) g.drawImage(WR.bmp || WR.c, Math.round(x0 - (WR.x - cx)), Math.round(y0 - (WR.y - cy)), Math.round(x1 - x0), Math.round(y1 - y0), Math.round(x0), Math.round(y0), Math.round(x1 - x0), Math.round(y1 - y0)); g.imageSmoothingEnabled = sm2; }   /* 2026-10-15 anh: tường MÂY PIXEL dựng sẵn (trước: 3 vòng × 40 khối sương mềm vẽ lại mỗi khung) */ else { const N = 40; for (const [rr, al, sc] of [[0.96, 0.45, 1.0], [1.06, 0.7, 1.25], [1.18, 0.9, 1.5]]) for (let i = 0; i < N; i++) { const a2 = (i + rr * 7) / N * TAU + t * 0.004, x = A.cx + Math.cos(a2) * A.rx * rr, y = A.cy + Math.sin(a2) * A.ry * rr; if (x - cx < -160 || x - cx > VW + 160 || y - cy < -140 || y - cy > VH + 140) continue; const im = fogTint((i + Math.round(rr * 10)) % 4, wallC); if (!im) continue; const w = im.width * sc, h = im.height * sc * 0.8; g.globalAlpha = al; g.drawImage(im, x - cx - w / 2, y - cy - h / 2, w, h); } }
    g.globalAlpha = 1; }
  if (AC.flash > 0) { const f2 = AC.flash; g.globalCompositeOperation = 'lighter'; for (let i = 0; i < 6; i++) { const a2 = (i * 1.7 + AC.flashSeed) % TAU, x = A.cx + Math.cos(a2) * (A.rx + 10), y = A.cy + Math.sin(a2) * (A.ry + 8), im = fogTint(i % 4, '#9a8cff'); if (im && !(x - cx < -120 || x - cx > VW + 120 || y - cy < -100 || y - cy > VH + 100)) { g.globalAlpha = 0.4 * f2; g.drawImage(im, x - cx - im.width * 0.6, y - cy - im.height * 0.5, im.width * 1.2, im.height); } } g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1; }   /* chớp trong sương bão — chỉ khi có sét */
  g.imageSmoothingEnabled = sm;
  /* cổng mây rút lui (ảnh PixelLab cổng trời) */
  const pt = A.portal; void tinted; if (pt) mistVortex(g, pt.x - cx, pt.y - cy - 10, t);   /* 2026-10-14 anh: bỏ vòm đá + cổng tím hoạt hình → XOÁY SƯƠNG nhỏ (cùng ảnh PixelLab với Cổng Trời mới skygate.js) */
}

/* xoáy sương nhỏ = cổng rút lui: 2 lớp tay sương PixelLab (zones/sky/gate/mist*.png) xoay ngược nhau, tô màu sương trời, bóng hố mềm + lõi sáng thở chậm (không nhấp nháy) */
const GTC = {};
function gateTint(n, col) { const k = n + col; if (GTC[k]) return GTC[k]; const im = img('zones/sky/gate/' + n + '.png'); if (!im || typeof document === 'undefined') return null; const c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight; const x = c.getContext('2d'); x.drawImage(im, 0, 0); x.globalCompositeOperation = 'source-atop'; x.globalAlpha = 0.55; x.fillStyle = col; x.fillRect(0, 0, c.width, c.height); return (GTC[k] = c); }
function mistVortex(g, X, Y, t) {
  const sm = g.imageSmoothingEnabled; g.save(); g.imageSmoothingEnabled = true; const R = 26;
  const hole = fogTint(0, '#5c5f8e'); if (hole) { g.globalAlpha = 0.45; g.drawImage(hole, X - R * 1.6, Y - R * 0.6, R * 3.2, R * 1.2); }
  for (const [n, sp, a0, al, sc] of [['mist2', -0.5, 1.1, 0.75, 2.1], ['mist', -0.9, 0.4, 0.85, 1.7]]) { const im = gateTint(n, '#dfe3ff'); if (!im) continue; g.save(); g.translate(X, Y); g.scale(1, 0.55); g.rotate(t * sp + a0); g.globalAlpha = al; g.drawImage(im, -R * sc / 2, -R * sc / 2, R * sc, R * sc); g.restore(); }
  const core = fogTint(1, '#ffffff'); if (core) { g.globalCompositeOperation = 'screen'; g.globalAlpha = 0.55 + 0.15 * Math.sin(t * Math.PI * 2 / 5); g.drawImage(core, X - R * 0.6, Y - R * 0.25, R * 1.2, R * 0.5); }
  g.restore(); g.imageSmoothingEnabled = sm;
}
/* ---------------- hạ xuống từ sân trời ---------------- */
function descend(ctx) {
  const A = AC.air, t = L(ctx), p = ctx.S.player; if (!A || AC.cine || AC.tum || ctx.S.mode !== 'play') return false;
  const below = A.below; if (!below || typeof window === 'undefined' || !window.__enterZone) { ctx.toast(t.noBelow); return false; }
  const ZS = ZONES; const nm = ZS && ZS[below] ? (ctx.lang() === 'vi' ? ZS[below].name.vi : ZS[below].name.en) : below;
  ctx.toast(t.down(nm)); ctx.sfx('whoosh');
  const dx = (p.x - A.cx) / A.rx, dy = (p.y - A.cy) / A.ry;
  ctx.setMode('aircine');
  cineStart(ctx, 'descend', { dur: 1.05, onEnd: () => { ctx.setMode('play'); ctx.S.airPend = { dx, dy, at: A.belowAt || null, arrive: true }; AC.pendArrive = true; try { window.__enterZone(below, 'default'); } catch (e) { console.error('descend', e); } } });
  log('descend → ' + below); return true;
}

function wrapHooks(ctx) {
    { const prevK = ctx.knockPlayer; if (prevK && !prevK.__air) { const w = o => { const tr = tierOf(ctx); if (o && FLY_TYPES[o.type] && (tr === 'air' || tr === 'sky' || tr === 'mid' || tr === 'high') && !(ctx.hero && ctx.hero.fainted)) { tumble(ctx, o); vertKnock(ctx, o, tr); return AC.tum; } return prevK(o); }; w.__air = true; w.__prev = prevK; ctx.knockPlayer = w; } }
    { const prevKd = ctx.knocked; if (!(prevKd && prevKd.__air)) { const w = () => !!AC.tum || (prevKd ? prevKd() : false); w.__air = true; ctx.knocked = w; } }
    { const prevF = ctx.faintTravel; if (!(prevF && prevF.__air)) { const w = () => { if (AC.chase) chaseEnd(ctx, 'faint'); return prevF ? prevF() : false; }; w.__air = true; ctx.faintTravel = w; } }
}
/* ---------------- hệ ---------------- */
export const aircombat = {
  id: 'aircombat', always: true,
  onZoneEnter(ctx) {
    AC.ctx = ctx; AC.fx = []; AC.ko = []; AC.tum = null; AC.tier = null; ctx.airKiSpin = true;   /* báo ki.js: airDraw tự xoay theo ent.kiSpin */
    if (AC.cine && AC.cine.kind !== 'descend') AC.cine = null;
    /* hệ cần cho trận đuổi (vùng có danh sách hệ riêng, vd trời: không có monsters / knock / drops) → bật thêm khi đang bị đuổi */
    if (AC.chase && hostable(zid(ctx), ZONES)) { const need = ['monsters', 'knock', 'drops']; for (const id of need) if (!ctx.S.sys.some(s => s.id === id)) { const sy = EXTRA_SYS[id]; if (sy) { ctx.S.sys.push(sy); log('sys+ ' + id); } } }
    wrapHooks(ctx);
    ctx.air = { flash: () => { AC.flash = 1; AC.flashSeed = Math.random() * 6; }, fogBurst: (x, y, o) => fogBurst(x, y, o), on: () => airOn(ctx), lift: () => AIR_LIFT, bound: airBound, tier: () => tierOf(ctx), descend: () => descend(ctx), copter: (g, hx, hy) => drawCopter(g, hx, hy, ctx.S.time, 18), topOf, shadow: shadowSoft, tumbling: () => !!AC.tum };
    ctx.chase = {
      begin: (id, ad) => { AC.chase = { id, ad, t0: ctx.S.time }; log('chase begin ' + id); },
      active: () => !!AC.chase, is: id => !!(AC.chase && AC.chase.id === id), end: r => chaseEnd(ctx, r || 'end'),
      hostable: id => hostable(id || zid(ctx), ZONES), tier: () => tierOf(ctx), impact: (x, y, r, o) => impact(ctx, x, y, r, o),
      cine: (kind, o) => cineStart(ctx, kind, o), cineOn: () => !!AC.cine, fx: (n, x, y, o) => fx(n, x, y, o), say: (k, n) => { const f = L(ctx)[k]; if (f) ctx.toast(typeof f === 'function' ? f(n) : f, true); },
    };
    if (airOn(ctx)) enterAir(ctx); else if (AC.air || ctx.S.player.custom === airDraw) leaveAir(ctx);
    if (AC.pendArrive) { AC.pendArrive = false; cineStart(ctx, 'arriveP', { dur: 0.9 }); }
    if (typeof window !== 'undefined') window.__air = {
      st: () => { const p = ctx.S.player, A = AC.air; return { on: airOn(ctx), tier: tierOf(ctx), zone: zid(ctx), norm: A ? +norm(A, p.x, p.y).toFixed(3) : null, tum: AC.tum ? { t: +AC.tum.t.toFixed(2), ang: +AC.tum.ang.toFixed(2), vx: Math.round(AC.tum.vx) } : null, last: AC.last || null, cine: AC.cine ? { kind: AC.cine.kind, t: +AC.cine.t.toFixed(2) } : null, chase: AC.chase ? AC.chase.id : null, ko: AC.ko.length, stats: JSON.parse(JSON.stringify(AC.stats)), log: AC.log.slice(-30), custom: p.custom === airDraw, airBody: !!p.airBody, mode: ctx.S.mode }; },
      descend: () => descend(ctx), tumble: o => tumble(ctx, o || { type: 'fly', dir: { x: 1, y: 0 }, power: 1 }), impact: (x, y, r, o) => impact(ctx, x, y, r, o), restore: () => restoreRuins(ctx), wake: () => wakeAll(ctx),
      koList: () => AC.ko.map(n => ({ x: Math.round(n.x), y: Math.round(n.y), up: !!(n.ko && n.ko.up) })), ruins: () => (ctx.S.map.rkRuins || []).filter(o => o.ruined).map(o => ({ type: o.orig || o.type, x: o.x, y: o.y, boss: !!o.bossSmash })),
    };
  },
  onZoneLeave(ctx) { AC.tum = null; for (const n of AC.ko) if (n.ko) { n.custom = n.ko.prevCustom; n.busy = false; n.ko = null; } AC.ko = []; if (AC.air) leaveAir(ctx); },
  update(dt, ctx) {
    AC.ctx = ctx; const p = ctx.S.player; if (!p || !ctx.S.map) return; wrapHooks(ctx);
    if (AC.cine) cineTick(ctx, dt);
    for (const f of AC.fx) f.t += dt; AC.fx = AC.fx.filter(f => f.t < f.dur);
    for (const b of FOGB) { b.t += dt; b.x += b.vx * dt; b.y += b.vy * dt; b.vx *= Math.exp(-1.6 * dt); b.vy *= Math.exp(-1.6 * dt); } for (let i = FOGB.length - 1; i >= 0; i--) if (FOGB[i].t >= FOGB[i].dur) FOGB.splice(i, 1);
    if (AC.wallCd > 0) AC.wallCd -= dt; if (AC.flash > 0) AC.flash -= dt * 2.2;
    koTick(ctx, dt);
    if (AC.restoreT > 0) { AC.restoreT -= dt; if (AC.restoreT <= 0) { restoreRuins(ctx); wakeAll(ctx); if (!AC.chase && ((ctx.S.map.rkRuins || []).some(o => o.ruined && o.bossSmash)) && (AC.restoreN = (AC.restoreN || 0) + 1) < 30) AC.restoreT = 2; else AC.restoreN = 0; } }   /* còn vật bị ai đứng trên → thử lại mỗi 2 s */
    if (ctx.S.mode !== 'play' && ctx.S.mode !== 'faint') return;
    if (AC.tum) tumbleTick(ctx, dt);
    if (AC.air) {
      if (p.custom !== airDraw && !AC.tum && ctx.S.mode === 'play') p.custom = airDraw;   /* hệ khác lỡ gỡ → gắn lại */
      if (!AC.tum) softWall(ctx, p, dt, true);
      const e = ctx.rocky && ctx.rocky.ent && ctx.rocky.ent(); if (e && !e.kfly) softWall(ctx, e, dt, false);
      const pt = AC.air.portal; if (pt && !AC.tum && Math.abs(p.x - pt.x) < 20 && p.y > pt.y - 16 && ctx.input && (ctx.input.down || !p.moving)) {   /* đứng / bay xuống trong cổng mây 0,7 s = rút lui */ AC.portalT = (AC.portalT || 0) + dt; if (AC.portalT > 0.7) { AC.portalT = 0; retreat(ctx); } } else AC.portalT = 0;
    }
    const tr = tierOf(ctx); if (AC.tier && tr !== AC.tier && AC.chase && AC.chase.ad && AC.chase.ad.tier) { try { AC.chase.ad.tier(tr, AC.tier); } catch (e) { console.error('chase tier', e); } } AC.tier = tr;
  },
  near(ctx) {
    const A = AC.air, p = ctx.S.player; if (!A || !A.portal || ctx.S.mode !== 'play') return null;
    if (Math.hypot(p.x - A.portal.x, p.y - A.portal.y) < 30) return { label: '☁ ' + L(ctx).retreat, x: A.portal.x, y: A.portal.y - 30, limit: 30, priority: 3, data: { acRetreat: true } };
    return null;
  },
  interact(ctx, cand) { if (cand && cand.data && cand.data.acRetreat) retreat(ctx); },
  key(code, ctx) {
    if (!AC.air || ctx.S.mode !== 'play') return false;
    if (code === 'KeyX' && !ctx.alt) { descend(ctx); return true; }   /* có độ cao liền mạch (sky.js): X = hạ mục tiêu → xuống dưới 640 m tự hạ xuống vùng dưới */
    return false;
  },
  drawGround(g, ctx, cx, cy) { if (AC.air) drawAirSky(g, ctx, cx, cy); drawCineWorld(g, ctx, cx, cy); },
  drawables(ctx, cx, cy) {
    const g = ctx.g, out = [];
    for (const f of AC.fx) if (!f.screen) out.push({ y: f.top ? 1e9 : f.y, f: () => sheetAt(g, f.s, Math.floor(f.t * (f.s.fps || 12)), f.x - cx, f.y - cy - f.s.h / 2 + 6, f.alpha, f.rot) });
    for (const b of FOGB) out.push({ y: b.top ? 1e9 : b.y, f: () => { const im = fogTint(b.i, b.col); if (!im) return; const u = b.t / b.dur, sc = b.s * (0.6 + u * 0.9), w = im.width * sc, h = im.height * sc, sm = g.imageSmoothingEnabled; g.imageSmoothingEnabled = true; g.globalAlpha = Math.max(0, 0.85 * (1 - u) * Math.min(1, u * 6)); g.drawImage(im, b.x - cx - w / 2, b.y - cy - h / 2, w, h); g.globalAlpha = 1; g.imageSmoothingEnabled = sm; } });   /* bung sương mềm */
    return out;
  },
  drawUI(ug, ctx) { if (AC.cine || (AC.chase && ctx.skyCut && ctx.skyCut()) || (ctx.alt && ctx.alt.falling && (ctx.alt.falling() || (ctx.alt.fast && ctx.alt.fast())))) drawCineUI(ug, ctx); },
};
function retreat(ctx) {
  const A = AC.air; if (!A || !A.retreatTo) return; ctx.sfx('whoosh'); log('retreat');
  if (typeof window !== 'undefined' && window.__enterZone) { ctx.S.airPend = null; setTimeout(() => window.__enterZone(A.retreatTo, A.retreatEntry || 'default'), 0); } else ctx.travel(A.retreatTo, A.retreatEntry || 'default');
}
function chaseEnd(ctx, reason) {
  const c = AC.chase; if (!c) return; AC.chase = null; log('chase end ' + reason);
  if (c.ad && c.ad.end) try { c.ad.end(reason); } catch (e) { console.error('chase end', e); }
  AC.restoreT = 3;   /* 3 s sau: dựng lại đổ nát (không ai đứng trên) + dân tỉnh dậy */
}
