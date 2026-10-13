// guong.js — plan-30 TRÙM 3: GƯƠNG ĐỊA CHẤN "Nữ Hoàng Pha Lê Vạn Kính" (Vết Nứt Magnitude) — agent trùm 3, 2026-10-13.
//  · Khe nứt (ảnh PixelLab rift_crack dùng chung) ở M6 Thành Nghiêng, phía Đông quảng trường thư viện (world.js riftCrackM2(m, 'rift3')). Mở khi: đã qua đèo
//    tới M6 (save.sys.road.won.road6 / maxZ ≥ 6 / save cũ có huy hiệu M6) + Rocky ≥ cấp 40. Chưa đủ → khe mờ + nhãn điều kiện ✔/✘.
//  · Vào khe → vùng 'rift3' (world.js buildRift3): sàn gạch thư viện + sàn gương pha lê (Wang PixelLab), 4 cột gương + 2 kệ sách PHÁ ĐƯỢC (arena.js BREAK,
//    ảnh hư / đổ nát PixelLab riêng), gương lớn ở vách Bắc, lối ra Nam LUÔN mở. Ngất → bảng ngất (hồi sinh tại chỗ thì đánh tiếp) / về M6 cạnh khe.
//  · Trùm = 1 quái trong ctx.monsters (aiFn / drawFn / onDown). NHÂN VẬT PixelLab v3 (tools/px-guong.py): cao 70 px ảnh = 35 logic ≈ 2× người chơi, 4 hướng (tây = lật đông),
//    clip idle / walk (lướt) / control (vung tay điều khiển gương) / cast (phóng) / vanish (tan thành mảnh gương — chạy ngược = bước ra) / stun / shatter (vỡ). Vẽ 1:1.
//  · 6 MẢNH GƯƠNG bay quanh người (ảnh PixelLab 6 màu cầu vồng boss/guong/shards). Đập theo thứ tự ĐỎ → CAM → VÀNG → LỤC → LAM → TÍM (sai → mảnh lành lại + phạt nhẹ)
//    → GƯƠNG THẬT trên mặt LỘ 9 s (choáng 2,5 s): Rocky-ha xuyên được (×1,5), kiếm ×1,3. Bình thường đòn Rocky chỉ 30 %, Rocky-ha bị PHẢN.
//  · PHẢN CHIẾU (khắc chế Rocky — móc ctx.haFilter trong pet.js): luồng Rocky-ha chạm mặt gương (mảnh gương bay = gương phẳng pháp tuyến hướng ra ngoài vòng;
//    thân nữ hoàng = gương lồi pháp tuyến từ tâm thân; mặt gương cột gm_pillar = gương phẳng hướng Nam) → luồng dừng ở mặt gương và PHẢN XẠ thật r = d − 2(d·n)n,
//    nảy tối đa 3 lần, trúng người chơi / Rocky trên đường đi, va cột / kệ thì làm hư. Mỗi điểm nảy: tia phổ màu (gm_prism) + vệt phổ màu ngắn.
//  · Chiêu (báo trước ≥ 0,5–1 s, nhắm đúng chỗ mục tiêu ở MỌI phía; không vùng chết: đi tới ≤ 30 px, quét tay ≤ 36 px):
//    Quét Gương (control: vòng báo quanh người → trúng mọi phía), Tia Gương (cast: vạch báo → tia sáng phóng thẳng), Mảnh Gương Lao (6 mảnh bay quỹ đạo hoa hồng
//    r = A·cos 3θ quanh chỗ mục tiêu đứng — chấm báo trước 1 s, vệt cầu vồng ngắn), Gương Soi Hồn (bản sao người chơi lặp lại đường đi 3 s trước — vệt chân báo
//    trước đoạn sắp đi), Dịch Chuyển Gương (tan vào mảnh gương, vòng báo ở gương đích 0,8 s, bước ra + sóng sáng), Lướt Né (bị chém liên tiếp).
//    TUYỆT CHIÊU Vạn Kính Lao: 12 gương xoay (ảnh td8 8 hướng PixelLab gm_turn) vòng quanh sân, lưới tia sáng hình sao {12/k} đổi hình mỗi giây (vạch mờ báo 0,45 s
//    → tia bật 0,55 s); đánh vào gương → gương xoay, bẻ tia vào trùm (trúng 2 lần → tuyệt chiêu vỡ, trùm choáng + LỘ).
//  · PHA 2: Nữ Hoàng hết máu → vỡ (clip shatter + mảnh văng) → gương lớn nứt → "BÓNG GƯƠNG" của chính người chơi bước ra (sheet người chơi hiện tại, tô màu pha lê
//    âm bản lúc vẽ — không đụng canvas nguồn, không vướng shim __hi): chém kiếm (clip attack của người chơi), lướt áp sát; hạ được → vỡ thành mảnh gương → thắng.
//  · Mục tiêu theo THÙ HẬN (như Hắc Rocky): Rocky là đối thủ nền; người chơi chém trúng / đập gương / đứng sát lâu → nhắm người chơi; Rocky gục → người chơi.
//  · Thưởng lần đầu: sách Rocky bậc 8 (ctx.hrBook.add), Ngọc Rồng, thành tựu 'guong', XP + đá; đánh lại giảm. Lưu save.sys.guong = { wins, tries, best }.
import { obj as defObj } from '../gfx.js';
import { ART } from '../art.js';
import * as LV from './petlv.js';
import { bossCam, bossCamReset, bossBarBox } from './bosscam.js';
import { beamKey, sheet as bSheet, drawAt as bDraw, frameAt as bFrame } from './beamfx.js';

const TS = 16;
const STR = {
  vi: {
    name: 'Nữ Hoàng Pha Lê Vạn Kính', sub: 'Gương Địa Chấn', enter: 'Vào Khe Nứt Magnitude', ph2name: 'Bóng Gương', ph2sub: 'chính bạn trong gương',
    locked: (a, b, lv) => `Khe nứt còn khép — cần: ${a ? '✔' : '✘'} qua đèo tới M6 · ${b ? '✔' : '✘'} Rocky cấp 40 (đang ${lv})`, noRocky: 'Khe nứt chỉ mở khi có Rocky đi cùng',
    intro: 'Bóng của bạn trong gương… mỉm cười.', rise: 'NỮ HOÀNG PHA LÊ VẠN KÍNH bước ra từ gương!', skip: 'Bỏ qua',
    colors: ['ĐỎ', 'CAM', 'VÀNG', 'LỤC', 'LAM', 'TÍM'], hitShard: (c, n) => `Đập mảnh gương ${c} (${n}/6)`, turn: 'Đánh xoay gương',
    good: (c, n) => `Vỡ mảnh ${c}! (${n}/6)`, wrong: 'Sai thứ tự! Các mảnh gương lành lại', order: 'Thứ tự: ĐỎ → CAM → VÀNG → LỤC → LAM → TÍM',
    exposed: 'GƯƠNG THẬT LỘ RA! Rocky-ha xuyên được', exposedT: s => `GƯƠNG THẬT LỘ (${s}s) — Rocky-ha xuyên qua!`, reflect: 'Rocky-ha bị PHẢN CHIẾU — đập 6 mảnh gương theo màu cầu vồng trước!',
    lance: 'Mảnh Gương Lao! Ra khỏi đường hoa', soul: 'Gương Soi Hồn — đừng đi lại đường cũ!', warp: 'Dịch chuyển gương!', sweep: 'Quét Gương!', bolt: 'Tia Gương!',
    ult: 'TUYỆT CHIÊU — VẠN KÍNH LAO!', ultHint: 'Đánh vào gương đứng để bẻ tia sáng sang Nữ Hoàng!', ultHit: 'Tia sáng bẻ trúng Nữ Hoàng!', ultBreak: 'Vạn Kính Lao vỡ tan!',
    aimYou: 'Nữ Hoàng nhắm vào BẠN!', aimRk: 'Nữ Hoàng quay sang Rocky', shardsAway: 'Mảnh gương đang bay — chờ chúng quay về',
    burst: 'Nữ Hoàng vỡ tan… mảnh gương lớn nhất rạn nứt!', ph2: 'BÓNG GƯƠNG — chính bạn bước ra từ gương!', die: 'Bóng Gương vỡ thành muôn mảnh…',
    phase: n => `Pha ${n}/2`, won: 'VẠN KÍNH ĐÃ VỠ!', again: 'Mảnh gương chìm vào khe nứt… (đánh lại được, thưởng giảm)', title: 'Danh hiệu: Người Phá Vạn Kính', exit: '← Thành Nghiêng',
  },
  en: {
    name: 'Myriad Mirror Crystal Queen', sub: 'Quake Mirror', enter: 'Enter the Magnitude Rift', ph2name: 'Mirror Shadow', ph2sub: 'yourself in the glass',
    locked: (a, b, lv) => `The rift is sealed — needs: ${a ? '✔' : '✘'} cross the pass to M6 · ${b ? '✔' : '✘'} Rocky Lv 40 (now ${lv})`, noRocky: 'The rift only opens with Rocky at your side',
    intro: 'Your reflection in the mirror… smiles.', rise: 'THE MYRIAD MIRROR QUEEN steps out of the glass!', skip: 'Skip',
    colors: ['RED', 'ORANGE', 'YELLOW', 'GREEN', 'BLUE', 'VIOLET'], hitShard: (c, n) => `Smash the ${c} shard (${n}/6)`, turn: 'Strike to turn the mirror',
    good: (c, n) => `${c} shard shattered! (${n}/6)`, wrong: 'Wrong order! The shards mend', order: 'Order: RED → ORANGE → YELLOW → GREEN → BLUE → VIOLET',
    exposed: 'THE TRUE MIRROR IS EXPOSED! Rocky-ha pierces it', exposedT: s => `TRUE MIRROR EXPOSED (${s}s) — Rocky-ha pierces!`, reflect: 'Rocky-ha is REFLECTED — smash the 6 shards in rainbow order first!',
    lance: 'Mirror Shard Lance! Get off the flower path', soul: 'Soul Mirror — do not retrace your steps!', warp: 'Mirror warp!', sweep: 'Mirror Sweep!', bolt: 'Mirror Ray!',
    ult: 'ULTIMATE — MYRIAD MIRROR LANCE!', ultHint: 'Strike the standing mirrors to bend the light onto the Queen!', ultHit: 'The light bends into the Queen!', ultBreak: 'The Myriad Mirror Lance shatters!',
    aimYou: 'The Queen is targeting YOU!', aimRk: 'The Queen turns on Rocky', shardsAway: 'The shards are flying — wait for them to return',
    burst: 'The Queen shatters… the great mirror cracks!', ph2: 'MIRROR SHADOW — you step out of the glass!', die: 'The Mirror Shadow breaks into a thousand pieces…',
    phase: n => `Phase ${n}/2`, won: 'THE MYRIAD MIRRORS ARE BROKEN!', again: 'The shards sink into the rift… (rematch any time, smaller reward)', title: 'Title: Mirror Breaker', exit: '← Leaning City',
  },
};
const L = ctx => STR[ctx.lang() === 'vi' ? 'vi' : 'en'];

/* vật cản sân Gương (ảnh PixelLab gói rift3 — tools/px-guong-env.py; vẽ code chỉ dự phòng). Cỡ logic = ½ ảnh, chân = phần ảnh thật. */
const px = (g, x, y, c, w = 1, h = 1) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
defObj('gm_pillar', 16, 32, 1, 1, g => { px(g, 3, 4, '#7a6aa0', 10, 28); px(g, 5, 10, '#cfe6ff', 6, 14); });
defObj('gm_shelf', 16, 24, 1, 1, g => { px(g, 1, 4, '#4a2a18', 14, 20); px(g, 3, 7, '#8a3a2a', 10, 3); });
defObj('gm_bigmirror', 24, 40, 2, 1, g => { px(g, 1, 2, '#9aa0b8', 22, 36); px(g, 4, 5, '#cfe6ff', 16, 28); });

/* ---------------- số liệu ---------------- */
const COL = ['red', 'orange', 'yellow', 'green', 'blue', 'violet'];
const HEX = ['#ff5a6a', '#ffa040', '#ffe060', '#60e070', '#5aa0ff', '#b070ff'];
const RK_MUL = 0.3, RK_EXPOSED = 1.5, SW_EXPOSED = 1.3, EXPOSE_T = 9, STUN_T = 2.5;
const DMG = { sweep: 0.09, bolt: 0.07, lance: 0.05, soul: 0.06, warp: 0.08, laser: 0.07, reflect: 0.06, wrong: 0.04, shSlash: 0.08, shDash: 0.09 };   /* × máu tối đa người chơi */
const CD = { lance: 11, soul: 17, warp: 13, bolt: 3.2, sweep: 1.4, ult: 32 };   /* hồi chiêu riêng từng chiêu (s) */
const SPD = [62, 74];   /* lướt (px/s) pha thường / nổi giận (< 50 %) */
const AG = { rk: 10, hit: 4.5, shard: 6, near: 3, decay: 2.5, back: 6, hold: 4, gap: 3, restless: [9, 13], burst: 12 };
const ORB = { rx: 26, ry: 15, lift: 18, sp: 1.15 };   /* quỹ đạo mảnh gương quanh người (elip trên mặt đất, nâng lên lift px khi vẽ) */
function bossHp(ctx) {
  const h = ctx.hero, per = h ? h.atk + h.weaponBonus(h.swordTier) : 100, pt = rk(ctx), st = pt ? LV.atkOf(LV.levelFromXp(pt.xp || 0).lv) : 40;
  return Math.round(per * 140 + st * 50);
}
function shHp(ctx) { const h = ctx.hero, per = h ? h.atk + h.weaponBonus(h.swordTier) : 100, pt = rk(ctx), st = pt ? LV.atkOf(LV.levelFromXp(pt.xp || 0).lv) : 40; return Math.round(per * 36 + st * 18); }
const sv = ctx => { const s = ctx.S.save; s.sys ||= {}; const h = (s.sys.guong ||= {}); h.wins ||= 0; h.tries ||= 0; return h; };
const rk = ctx => (ctx.rocky && ctx.rocky.pet && ctx.rocky.pet()) || (((ctx.S.save.sys || {}).pet || {}).pet) || null;
const rkLv = ctx => { const p = rk(ctx); return p ? LV.levelFromXp(p.xp || 0).lv : 0; };
function roadOk(ctx) { const s = ctx.S.save, r = (s.sys || {}).road || {}; return !!((r.won || {}).road6 || (r.maxZ || 0) >= 6 || (s.badges || []).includes(6)); }   /* save cũ không có cờ đèo mà đã có huy hiệu M6 → coi như đã qua */
const riftOpen = ctx => roadOk(ctx) && rkLv(ctx) >= 40;
const inGm = ctx => !!(ctx.S.zone && ctx.S.zone.id === 'rift3');
const inM6 = ctx => !!(ctx.S.zone && ctx.S.zone.id === 'm6');
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const angD = (a, b) => { let d = a - b; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d; };
const DIR8 = ['east', 'south-east', 'south', 'south-west', 'west', 'north-west', 'north', 'north-east'];
const faceOf = (dx, dy) => DIR8[((Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) % 8) + 8) % 8];   /* 2026-10-13 anh: Nữ Hoàng quay mặt 8 hướng (chéo = ảnh PixelLab riêng SE/NE, tây = lật) */
function rowOf(c, d) {   /* hướng cần vẽ → { row, flip } theo các hàng clip có (S, SE, E, NE, N); thiếu hàng chéo thì lấy hướng gần nhất */
  if (c.rows.length === 1) return { row: 0, flip: false };
  const flip = /west/.test(d), m = d.replace('west', 'east'); let r = c.rows.indexOf(m);
  if (r < 0) r = c.rows.indexOf(m === 'south-east' ? 'south' : m === 'north-east' ? 'north' : m); if (r < 0) r = 0;
  return { row: r, flip: flip && c.rows.length > 1 };
}
const DIRN = { south: 0, west: 1, east: 2, north: 3 };
/* khoảng cách điểm → đoạn thẳng */
function segD(px_, py, x0, y0, x1, y1) { const dx = x1 - x0, dy = y1 - y0, l2 = dx * dx + dy * dy || 1, u = Math.max(0, Math.min(1, ((px_ - x0) * dx + (py - y0) * dy) / l2)); return Math.hypot(px_ - x0 - dx * u, py - y0 - dy * u); }

/* ---------------- ảnh ---------------- */
const IM = {};
function img(src) { if (!IM[src]) { const i = new Image(); i.src = 'assets/px/' + src; IM[src] = i; } const i = IM[src]; return i.complete && i.naturalWidth ? i : null; }
const SHARD = k => img(`boss/guong/shards/small/shard_${COL[k]}.png`);
const TURN8 = ['east', 'south-east', 'south', 'south-west', 'west', 'north-west', 'north', 'north-east'];
const TURN = a => { const i = ((Math.round(a / (Math.PI / 4)) % 8) + 8) % 8; return img(`zones/rift3/td8/gm_turn_${TURN8[i]}.png`); };   /* gương xoay: hướng mặt gương (pháp tuyến) → ảnh td8 */
const VX = n => ART.vfx && ART.vfx[n];
let QM = null;
if (typeof fetch !== 'undefined') fetch('assets/px/boss/guong/q.json').then(r => r.json()).then(j => { QM = j; for (const c of Object.values(j.clips)) img(c.file); for (const k of COL.keys()) SHARD(k); for (const d of TURN8) img(`zones/rift3/td8/gm_turn_${d}.png`); img('ui/guong/bossbar.png'); img('ui/hacrocky/target.png'); }).catch(() => {});
const Q_FPS = { idle: 6, walk: 10, control: 12, cast: 12, vanish: 12, stun: 6, shatter: 10 };
const Q_LOOP = { idle: 1, walk: 1, stun: 1 };
function qFrame(Q) { const c = QM && QM.clips[Q.clip]; if (!c) return 0; const n = Q.clip === 'vanish' ? c.n - 1 : c.n, f = Math.floor(Q.t * Q_FPS[Q.clip]); let k = Q_LOOP[Q.clip] ? f % n : Math.min(n - 1, f); if (Q.rev) k = n - 1 - k; return k; }   /* vanish: bỏ khung cuối (đổi dáng); rev = chạy ngược (bước ra khỏi gương) */
function drawQ(g, Q, x, y) {
  if (!QM) return false; let c = QM.clips[Q.clip] || QM.clips.idle, im = c && img(c.file); if (!im) { c = QM.clips.idle; im = c && img(c.file); if (!im) return false; }
  const RF = rowOf(c, Q.dir || 'south'), row = RF.row, flip = RF.flip, f = qFrame(Q) % c.n;
  const cw = QM.cw, ch = QM.ch, dw = cw / 2, dh = ch / 2, X = Math.round(x), Y = Math.round(y);
  g.save(); g.imageSmoothingEnabled = false; if (Q.alpha != null && Q.alpha < 1) g.globalAlpha = Math.max(0, Q.alpha);
  if (Q.flash > 0) g.filter = 'brightness(2)'; else if (Q.exposed) g.filter = 'brightness(1.15) saturate(1.4)';
  if (flip) { g.translate(X, 0); g.scale(-1, 1); g.drawImage(im, f * cw, row * ch, cw, ch, -dw / 2, Y - dh + 1, dw, dh); }
  else g.drawImage(im, f * cw, row * ch, cw, ch, X - dw / 2, Y - dh + 1, dw, dh);
  g.restore(); return true;
}
/* ảnh 2× (PixelLab) vẽ 1:1 = cỡ đích ½, tâm tại (x, y) */
function blitC(g, im, x, y, alpha = 1) { const w = im.naturalWidth / 2, h = im.naturalHeight / 2; g.save(); g.imageSmoothingEnabled = false; if (alpha < 1) g.globalAlpha = alpha; g.drawImage(im, Math.round(x - w / 2), Math.round(y - h / 2), w, h); g.restore(); }
function drawSheet(g, s, f, x, y, alpha = 1) {
  const hi = s.img.__hi ? 1 : 2, ax = s.ax != null ? s.ax : s.w / 2, ay = s.ay != null ? s.ay : s.h;
  g.save(); g.imageSmoothingEnabled = false; g.globalAlpha = alpha; g.drawImage(s.img, f * s.w * hi, 0, s.w * hi, s.h * hi, Math.round(x - ax), Math.round(y - ay), s.w, s.h); g.restore();
}
/* tia sáng trắng (tuyệt chiêu + Tia Gương): đổi màu theo độ sáng của CHÍNH sheet luồng Rocky-ha PixelLab (rk_ha2_s) sang trắng-tím nhạt — canvas nguồn giữ __hi (bài học shim 2026-09-25) */
let LIGHT = null;
function lightSheet() {
  if (LIGHT) return LIGHT; const s = VX('rk_ha2_s'); if (!s || !s.img || typeof document === 'undefined') return null;
  const src = s.img, c = document.createElement('canvas'); c.width = src.width; c.height = src.height; const q = c.getContext('2d'); q.drawImage(src, 0, 0, src.width, src.height);
  const d = q.getImageData(0, 0, c.width, c.height), a = d.data;
  for (let i = 0; i < a.length; i += 4) { if (!a[i + 3]) continue; const Lm = (0.3 * a[i] + 0.55 * a[i + 1] + 0.15 * a[i + 2]) / 255; if (Lm <= 0.45) { a[i + 3] = 0; continue; } const col = Lm > 0.72 ? [255, 255, 255] : [214, 200, 255]; a[i] = col[0]; a[i + 1] = col[1]; a[i + 2] = col[2]; }   /* chỉ giữ lõi sáng của luồng → tia mảnh (12 tia cùng lúc không rối mắt) */
  q.putImageData(d, 0, 0); c.__hi = src.__hi; LIGHT = { ...s, img: c }; return LIGHT;
}
/* vẽ 1 đoạn luồng (x0,y0)→(x1,y1) bằng sheet s (cắt theo độ dài, nối nhiều khúc nếu dài hơn sheet) */
function drawSeg(g, s, f, x0, y0, x1, y1, alpha = 1, filter = null) {
  if (!s) return; const a = Math.atan2(y1 - y0, x1 - x0), len = Math.hypot(x1 - x0, y1 - y0), ax = s.ax != null ? s.ax : s.w / 2, step = Math.max(20, s.w - ax - 8);
  if (filter) { g.save(); g.filter = filter; }
  for (let o = 0; o < len; o += step) bDraw(g, s, f, x0 + Math.cos(a) * o, y0 + Math.sin(a) * o, a, Math.min(step + 2, len - o), alpha);
  if (filter) g.restore();
}

/* ================= 2026-10-13 (anh Hùng duyệt làm đẹp) — TÁN XẠ ĐỘNG · MẢNH VỠ · PHA LÊ ================= */
/* Tia sáng: ảnh luồng PixelLab rk_ha2_s đổi màu (canvas nguồn giữ __hi — bài học shim): lõi trắng mảnh (lightSheet) + quầng màu (specSheet).
   Tia MỌC DẦN từ nguồn ra, hạt sáng chảy dọc tia (vẽ code nhẹ 2×1 px), đầu tia tóe tia lửa (gm_glint), khi tắt thì RÚT lại + vỡ thành hạt (gm_prism).
   Chỉ tồn tại trong lúc chiêu đang ra. */
const SPEC = ['#ff4848', '#ff9a30', '#ffe040', '#50e060', '#40b0ff', '#5a64ff', '#b464ff'];
const SPEC_RGB = SPEC.map(h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)));
const SPECS = {};
function specSheet(k, wide = false) {   /* k: 0..6 màu phổ · 'w' trắng sáng · wide: QUẦNG RỘNG mờ (cả bề dày luồng, 1 màu) */
  const key = k + (wide ? 'W' : ''); if (SPECS[key]) return SPECS[key]; const s = VX('rk_ha2_s'); if (!s || !s.img || typeof document === 'undefined') return null;
  const src = s.img, c = document.createElement('canvas'); c.width = src.width; c.height = src.height; const q = c.getContext('2d'); q.drawImage(src, 0, 0, src.width, src.height);
  const d = q.getImageData(0, 0, c.width, c.height), a = d.data, col = k === 'w' ? [236, 232, 255] : SPEC_RGB[k];
  const fh = c.height, lo = wide ? 0 : Math.round(fh * 9 / 32), hi = wide ? fh : Math.round(fh * 22 / 32), edge = k === 'w' ? [120, 84, 220] : col.map(v => Math.round(v * 0.62));   /* chỉ giữ dải lõi ~6 px logic của luồng → tia MẢNH, mép rõ */
  for (let i = 0; i < a.length; i += 4) { if (!a[i + 3]) continue; const yy = Math.floor(i / 4 / c.width); if (yy < lo || yy >= hi) { a[i + 3] = 0; continue; }
    const Lm = (0.3 * a[i] + 0.55 * a[i + 1] + 0.15 * a[i + 2]) / 255; let o;
    if (wide) { o = k === 'w' ? [200, 186, 255] : col; a[i + 3] = Math.round(a[i + 3] * (Lm > 0.55 ? 0.55 : 0.38)); }
    else if (Lm > 0.7) o = [255, 255, 255]; else if (Lm > 0.58) o = col.map(v => Math.round(v + (255 - v) * 0.55)); else if (Lm > 0.5) o = col; else { o = edge; a[i + 3] = 225; }   /* lõi trắng ~4 px logic */
    a[i] = o[0]; a[i + 1] = o[1]; a[i + 2] = o[2]; }
  q.putImageData(d, 0, 0); c.__hi = src.__hi; SPECS[key] = { ...s, img: c }; return SPECS[key];
}
/* tia: { x0,y0 → x1,y1 (toạ độ VẼ), col: 0..6 | 'w', t, grow, life, fade, bright, noTip } */
function addRay(o) { const r = { t: 0, grow: 0.16, life: 0.5, fade: 0.16, seed: Math.random() * 100, ...o }; ST.rays.push(r); return r; }
function raysTick(dt) {
  for (const r of ST.rays) {
    r.t += dt;
    if (!r.burst && r.t >= r.life) { r.burst = true; const L0 = Math.hypot(r.x1 - r.x0, r.y1 - r.y0); if (L0 > 30 && !r.quiet) { fx('gm_prism', r.x1, r.y1, { top: true }); fx('gm_glint', (r.x0 + r.x1) / 2, (r.y0 + r.y1) / 2, { top: true, alpha: 0.8 }); } }   /* tắt: vỡ thành hạt */
  }
  ST.rays = ST.rays.filter(r => r.t < r.life + r.fade);
}
function raySpan(r) { const L0 = Math.hypot(r.x1 - r.x0, r.y1 - r.y0), head = L0 * Math.min(1, r.t / r.grow), tail = r.t > r.life ? L0 * Math.min(1, (r.t - r.life) / r.fade) : 0; return { L0, head, tail }; }
function drawRay(g, r, cx, cy) {
  const { L0, head, tail } = raySpan(r); if (head - tail < 1) return;
  const ux = (r.x1 - r.x0) / (L0 || 1), uy = (r.y1 - r.y0) / (L0 || 1), ax = r.x0 + ux * tail - cx, ay = r.y0 + uy * tail - cy, bx = r.x0 + ux * head - cx, by = r.y0 + uy * head - cy;
  const halo = specSheet(r.col), core = lightSheet(), fr = Math.floor((ST.t + r.seed) * 14) % 3;
  const glow = specSheet(r.col, true); if (glow) drawSeg(g, glow, fr, ax, ay, bx, by, r.bright ? 0.95 : 0.7);   /* quầng rộng mờ (lớp 1) */
  if (halo) drawSeg(g, halo, fr, ax, ay, bx, by, 1);   /* dải lõi màu mép rõ + lõi trắng (lớp 2) */
  if (r.bright && halo) { g.save(); g.globalCompositeOperation = 'lighter'; drawSeg(g, halo, (fr + 1) % 3, ax, ay, bx, by, 0.3); g.restore(); }   /* tuyệt chiêu: chói thêm 1 lớp */
  void core;
  /* năng lượng chảy dọc tia: hạt sáng 2×1 px trôi từ nguồn ra (vẽ code nhẹ, chỉ lúc tia sống) */
  g.save(); const n = Math.max(2, Math.floor((head - tail) / 16)), sp = 190, col = r.col === 'w' ? '#ffffff' : SPEC[r.col];
  for (let i = 0; i < n; i++) { const d = tail + ((ST.t * sp + i * 16 + r.seed * 7) % Math.max(1, head - tail)); const x = r.x0 + ux * d - cx, y = r.y0 + uy * d - cy; g.globalAlpha = 0.9; g.fillStyle = i % 2 ? '#ffffff' : col; g.fillRect(Math.round(x), Math.round(y), 2, 1); }
  g.restore();
  if (!r.noTip && r.t < r.grow + 0.08) { const gl = VX('gm_glint'); if (gl) drawSheet(g, gl, Math.min(gl.n - 1, Math.floor(r.t * 18) % gl.n), bx, by, 0.95); }   /* đầu tia tóe sáng lúc đang mọc */
}
/* chùm phổ (lăng kính): tia trắng chạm gương tách thành 7 tia màu toả quanh hướng a */
function prismFan(x, y, a, len, spread = 0.36, opt = {}) { const out = []; for (let i = 0; i < 7; i++) out.push(addRay({ x0: x, y0: y, x1: x + Math.cos(a + (i - 3) * spread / 3) * len, y1: y + Math.sin(a + (i - 3) * spread / 3) * len, col: i, ...opt })); return out; }

/* MẢNH VỠ: chính khung hình PixelLab đang hiện cắt thành tam giác → bay xoáy vào mặt gương (into) / ghép lại từ mặt gương (out) / nổ tung (burst) */
const ALPHA = {};
function alphaOf(im) {   /* bản đồ alpha của ảnh (nguồn ảnh <img>, không __hi) */
  const k = im.src || ''; if (ALPHA[k]) return ALPHA[k]; if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas'); c.width = im.naturalWidth || im.width; c.height = im.naturalHeight || im.height; const q = c.getContext('2d'); q.drawImage(im, 0, 0, c.width, c.height);
  ALPHA[k] = { w: c.width, d: q.getImageData(0, 0, c.width, c.height).data }; return ALPHA[k];
}
function qCell(Q) {   /* khung hiện tại của Nữ Hoàng: ảnh + ô nguồn (px ảnh) + lật */
  if (!QM) return null; const c = QM.clips[Q.clip] || QM.clips.idle, im = c && img(c.file); if (!im) return null;
  const RF = rowOf(c, Q.dir || 'south'), f = qFrame(Q) % c.n;
  return { im, sx: f * QM.cw, sy: RF.row * QM.ch, sw: QM.cw, sh: QM.ch, flip: RF.flip };
}
function makeFrags(cell, x, y, mode, T, opt = {}) {   /* x,y = chân nhân vật (thế giới); T = điểm gương (thế giới) */
  if (!cell) return; const A = alphaOf(cell.im), dw = cell.sw / 2, dh = cell.sh / 2, G = opt.grid || 7, out = [];
  for (let gy = 0; gy < dh; gy += G) for (let gx = 0; gx < dw; gx += G) for (let tri = 0; tri < 2; tri++) {
    const cxL = gx + (tri ? G * 0.66 : G * 0.33), cyL = gy + (tri ? G * 0.66 : G * 0.33), px = Math.round(cell.sx + Math.min(cell.sw - 1, cxL * 2)), py = Math.round(cell.sy + Math.min(cell.sh - 1, cyL * 2));
    if (A && !A.d[(py * A.w + px) * 4 + 3]) continue;
    const hx = x - dw / 2 + (cell.flip ? dw - cxL : cxL), hy = y - dh + 1 + cyL;   /* vị trí mảnh trên thân (thế giới) */
    const ang = Math.atan2(hy - T.y, hx - T.x), r0 = Math.hypot(hx - T.x, hy - T.y);
    out.push({ gx, gy, tri, hx, hy, ang, r0, spin: (Math.random() - 0.5) * 9, delay: Math.random() * 0.22, vx: (hx - x) * 3 + (Math.random() - 0.5) * 60, vy: -40 - Math.random() * 70 + (hy - (y - dh / 2)) * 1.5, hue: (Math.random() * 300) | 0 });
  }
  ST.frags.push({ cell, x, y, mode, T, t: 0, dur: opt.dur || (mode === 'burst' ? 1.3 : 0.75), pieces: out, G, dw, dh });
}
function fragPos(F, P) {
  const u = Math.max(0, Math.min(1, (F.t - P.delay) / (F.dur - 0.22)));
  if (F.mode === 'burst') { const t = Math.max(0, F.t - P.delay * 0.3); return { x: P.hx + P.vx * t, y: P.hy + P.vy * t + 150 * t * t, rot: P.spin * t, a: Math.max(0, 1 - Math.max(0, F.t - 0.7) / 0.6) }; }
  const k = F.mode === 'into' ? u * u : 1 - (1 - u) * (1 - u), w = F.mode === 'into' ? k : 1 - k;   /* w: 0 trên thân → 1 trong gương */
  const r = P.r0 * (1 - w), ang = P.ang + w * 4.2;   /* xoáy: vừa thu bán kính vừa quay */
  return { x: F.T.x + Math.cos(ang) * r, y: F.T.y + Math.sin(ang) * r, rot: P.spin * w * 0.4, a: w > 0.92 ? (1 - w) / 0.08 : 1 };
}
function fragsTick(dt) { for (const F of ST.frags) F.t += dt; ST.frags = ST.frags.filter(F => F.t < F.dur + 0.05); }
function drawFrags(g, F, cx, cy) {
  const c = F.cell, G = F.G;
  for (const P of F.pieces) {
    const q = fragPos(F, P); if (q.a <= 0.02) continue;
    g.save(); g.imageSmoothingEnabled = false; g.globalAlpha = Math.min(1, q.a); g.translate(Math.round(q.x - cx), Math.round(q.y - cy)); if (q.rot) g.rotate(q.rot);
    const ox = P.tri ? G * 0.66 : G * 0.33, oy = ox;   /* tâm mảnh trong ô */
    g.beginPath(); if (P.tri) { g.moveTo(G - ox, -oy); g.lineTo(G - ox, G - oy); g.lineTo(-ox, G - oy); } else { g.moveTo(-ox, -oy); g.lineTo(G - ox, -oy); g.lineTo(-ox, G - oy); } g.closePath(); g.clip();
    if (F.mode === 'burst') g.filter = `hue-rotate(${P.hue}deg) brightness(1.25)`;   /* mảnh gương phản chiếu màu */
    if (c.flip) g.scale(-1, 1);
    g.drawImage(c.im, c.sx, c.sy, c.sw, c.sh, -P.gx - ox, -P.gy - oy, F.dw, F.dh);
    g.restore();
  }
}

/* PHA LÊ: tô sheet người chơi thành thân pha lê (nền lam-tím trong, mặt cắt lục giác, viền sáng, vệt phản quang chéo) — canvas MỚI, nguồn vẽ 5 tham số, __hi chép từ nguồn */
const CRY = new Map();
function crystalImg(src, alpha = 0.93) {
  if (!src || typeof document === 'undefined') return src; if (CRY.has(src)) return CRY.get(src);
  const w = src.width || src.naturalWidth, h = src.height || src.naturalHeight; if (!w || !h) return src;
  const c = document.createElement('canvas'); c.width = w; c.height = h; const q = c.getContext('2d'); q.drawImage(src, 0, 0, w, h);
  const d = q.getImageData(0, 0, w, h), a = d.data, A0 = new Uint8Array(w * h); for (let i = 0; i < w * h; i++) A0[i] = a[i * 4 + 3];
  const PAL = [[0.22, [42, 30, 96]], [0.4, [70, 90, 190]], [0.58, [112, 160, 236]], [0.78, [176, 222, 255]], [2, [236, 248, 255]]];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x, o = i * 4; if (!A0[i]) continue;
    const Lm = (0.3 * a[o] + 0.55 * a[o + 1] + 0.15 * a[o + 2]) / 255, tint = PAL.find(P => Lm < P[0])[1];
    let col = [0, 1, 2].map(j => Math.round(a[o + j] * 0.5 + tint[j] * 0.5));   /* GIỮ màu trang phục gốc (55 %) — chỉ nhuốm sắc pha lê lam-tím */
    const edge = x === 0 || y === 0 || x === w - 1 || y === h - 1 || !A0[i - 1] || !A0[i + 1] || !A0[i - w] || !A0[i + w];
    if (edge) col = [Math.round(a[o] * 0.3 + 30), Math.round(a[o + 1] * 0.3 + 22), Math.round(a[o + 2] * 0.3 + 78)];   /* viền TỐI chàm (giữ nét như người chơi) */
    else {
      const facet = ((x + Math.round(y * 0.577)) % 11 === 0) || ((x - Math.round(y * 0.577) + 990) % 11 === 0);   /* mặt cắt pha lê thưa, nhẹ */
      if (facet) col = col.map(v => Math.round(v + (236 - v) * 0.22));
      if (((x + y) % 30) < 2) col = col.map(v => Math.round(v + (255 - v) * 0.3));   /* vệt phản quang chéo nhẹ */
    }
    a[o] = col[0]; a[o + 1] = col[1]; a[o + 2] = col[2]; a[o + 3] = Math.round(A0[i] * (edge ? 1 : alpha));
  }
  q.putImageData(d, 0, 0); if (src.__hi) c.__hi = src.__hi; CRY.set(src, c); return c;
}
function crystalSheet(sheet) {   /* sheet đi + mọi clip động tác + ngoại hình to (skin) → bản pha lê, cùng bố cục */
  if (!sheet) return sheet; if (CRY.has('S:' + (sheet.__cid ||= Math.random()))) return CRY.get('S:' + sheet.__cid);
  const c = crystalImg(sheet); const out = c === sheet ? sheet : c;
  if (sheet.actions) { out.actions = {}; for (const [k, v] of Object.entries(sheet.actions)) out.actions[k] = v && v.img ? { ...v, img: crystalImg(v.img) } : v; }
  if (sheet.skin) out.skin = { ...sheet.skin, img: crystalImg(sheet.skin.img) };
  CRY.set('S:' + sheet.__cid, out); return out;
}

/* ---------------- trạng thái ---------------- */
const ST = {};
function reset() { Object.assign(ST, { boss: null, sh: null, t: 0, cd: { lance: 4, soul: 9, warp: 7, bolt: 1.5, sweep: 0, ult: 24 }, shards: COL.map((c, k) => ({ k, alive: true, mend: 0 })), next: 0, orbA: 0, away: false,
  exposed: 0, lance: null, soul: null, warp: null, ult: null, refl: [], fx: [], tele: [], hist: [], banner: null, won: false, ultAt: [0.6, 0.25], log: [], startT: 0, swingQ: [],
  stats: { rkRaw: 0, rkDealt: 0, reflects: 0, reflHitP: 0, reflHitR: 0, hits: {}, good: 0, wrong: 0, exposes: 0, ultHits: 0, turned: 0, shHits: 0 }, absorbT: -99, reflT: -99,
  tgt: 'r', tgtT: 0, agP: 0, restT: 10, nearT: 0, tgtLog: {}, lastHitSeen: null, burst: null, death: null, falling: [], rays: [], frags: [], hop: null, scatter: false, skills: [], skillT: [], outT: 0, watch: [], hold: false, introDone: false, recent: [], mirrorO: null, lastFire: null }); }
reset();
const log = s => { ST.log.push(Math.round(ST.t * 10) / 10 + ' ' + s); if (ST.log.length > 60) ST.log.shift(); };
function fx(name, x, y, opt = {}) { const s = VX(name); if (!s) return false; ST.fx.push({ s, x, y, t: 0, dur: opt.dur || s.n / (s.fps || 12), top: !!opt.top, ground: !!opt.ground, alpha: opt.alpha || 1 }); return true; }

/* ---------------- sát thương ---------------- */
function hurtPlayer(ctx, frac, from, react = 'stagger', power = 1, key = '') {
  const h = ctx.hero, p = ctx.S.player; if (!h || h.fainted) return false;
  const ok = h.hit(Math.max(1, Math.round(h.max * frac))); if (!ok) return false;
  ST.stats.hits[key] = (ST.stats.hits[key] || 0) + 1; log('hit ' + key);
  if (ctx.knockPlayer && react) { const d = Math.hypot(p.x - from.x, p.y - from.y) || 1; ctx.knockPlayer({ type: react, power, dir: { x: (p.x - from.x) / d, y: (p.y - from.y) / d }, src: from, bound: (x, y) => !inGm(ctx) || y < (ctx.S.map.h - 3) * TS }); }
  return true;
}
const rkPos = ctx => (ctx.rocky && ctx.rocky.pos && ctx.rocky.pos()) || null;
const rkEnt = ctx => (ctx.rocky && ctx.rocky.ent && ctx.rocky.ent()) || null;
const rkAway = ctx => { const pt = rk(ctx); return !pt || (pt.koT || 0) > 0 || !rkPos(ctx); };
function hurtRocky(ctx, frac, from, kb = 50) {
  const pos = rkPos(ctx); if (!pos) return false; const pt = rk(ctx); if (!pt || !ctx.rocky.hitBy) return false;
  const d = Math.hypot(pos.x - from.x, pos.y - from.y) || 1, raw = Math.round(LV.maxHpOf(rkLv(ctx)) * frac * 1.1);
  ctx.rocky.hitBy(raw, ST.boss || ST.sh, (pos.x - from.x) / d, (pos.y - from.y) / d, kb); return true;
}
/* đòn vùng: trúng người chơi + Rocky trong bán kính r quanh (x, y) */
function areaHit(ctx, x, y, r, frac, key, react = 'stagger', pw = 1) {
  const p = ctx.S.player; let n = 0;
  if (Math.hypot(p.x - x, p.y - y) < r) n += hurtPlayer(ctx, frac, { x, y }, react, pw, key) ? 1 : 0;
  const rp = rkPos(ctx); if (rp && Math.hypot(rp.x - x, rp.y - y) < r) n += hurtRocky(ctx, frac, { x, y }, react === 'fly' ? 70 : 50) ? 1 : 0;
  return n;
}

/* ---------------- va chạm / kẹt ---------------- */
const solidAt = (ctx, x, y) => ctx.isSolid(ctx.S.map, Math.floor(x / TS), Math.floor(y / TS));
const interior = ctx => { const m = ctx.S.map; return { x0: 3 * TS, y0: 4 * TS, x1: (m.w - 3) * TS, y1: (m.h - 4) * TS }; };
function clampIn(ctx, x, y) { const I = interior(ctx); return { x: Math.max(I.x0 + 6, Math.min(I.x1 - 6, x)), y: Math.max(I.y0 + 8, Math.min(I.y1 + 8, y)) }; }
function nearestFree(ctx, x, y) {
  const m = ctx.S.map, reach = m._gmReach || (m._gmReach = ctx.computeReach(m, m.entries.default)), sx = Math.floor(x / TS), sy = Math.floor(y / TS);
  if (!ctx.isSolid(m, sx, sy) && reach[sy * m.w + sx]) return null;
  const seen = new Set([sx + ',' + sy]), q = [[sx, sy]];
  while (q.length) { const [cx, cy] = q.shift(); for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = cx + a, ny = cy + b, k = nx + ',' + ny; if (seen.has(k) || nx < 0 || ny < 0 || nx >= m.w || ny >= m.h) continue; seen.add(k); if (!ctx.isSolid(m, nx, ny) && reach[ny * m.w + nx]) return { x: nx * TS + 8, y: ny * TS + 12 }; q.push([nx, ny]); } }
  return null;
}
function unstick(ctx) { const p = ctx.S.player; if (ctx.knocked && ctx.knocked()) return; const s = nearestFree(ctx, p.x, p.y); if (s) { p.x = s.x; p.y = s.y; log('unstick player'); } }
function moveMo(ctx, mo, dx, dy, sp, dt) {   /* lướt có va chạm; kẹt > 0,6 s → đi xuyên (không đứng kẹt sau cột) */
  const d = Math.hypot(dx, dy) || 1, s = sp * dt, q = clampIn(ctx, mo.x + dx / d * s, mo.y + dy / d * s);
  if ((mo.stuckT || 0) > 0.6 || !solidAt(ctx, q.x, q.y)) { mo.x = q.x; mo.y = q.y; if (!solidAt(ctx, q.x, q.y)) mo.stuckT = 0; }
  else if (!solidAt(ctx, q.x, mo.y)) mo.x = q.x; else if (!solidAt(ctx, mo.x, q.y)) mo.y = q.y; else mo.stuckT = (mo.stuckT || 0) + dt;
}

/* ---------------- mảnh gương bay ---------------- */
function shardPos(k) {   /* vị trí mặt đất của mảnh k (đang quay quanh trùm) + điểm vẽ (nâng lift) */
  const b = ST.boss || { x: 0, y: 0 }, S = ST.shards[k];
  if (S.fly) return { x: S.fly.x, y: S.fly.y, dy: S.fly.lift || 10 };
  const a = ST.orbA + k * Math.PI / 3; return { x: b.x + Math.cos(a) * ORB.rx, y: b.y + Math.sin(a) * ORB.ry, dy: ORB.lift, a };
}
const shardsHome = () => !ST.lance && !ST.warp && !ST.ult && !ST.hop && !ST.shards.some(S => S.fly && S.fly.out);
function hitShard(ctx, k) {
  const S = ST.shards[k], t = L(ctx), b = ST.boss; if (!S.alive || !b || !shardsHome() || ST.exposed > 0) return false;
  const q = shardPos(k); ST.agP += AG.shard;
  if (k === ST.next) {
    S.alive = false; ST.next++; ST.stats.good++; fx('gm_shatter', q.x, q.y - q.dy, { top: true }); fx('gm_prism', q.x, q.y - q.dy); ctx.sfx('smash'); ctx.sfx('spar_bell');
    if (ctx.pop) ctx.pop(q.x, q.y - q.dy - 8, t.good(t.colors[k], ST.next), HEX[k]);
    for (let i = 0; i < 4; i++) ST.falling.push({ k, x: q.x, y: q.y, z: q.dy, vx: (Math.random() - 0.5) * 70, vz: 30 + Math.random() * 40, t: 0, small: true });
    log('shard ok ' + COL[k]);
    if (ST.next >= 6) expose(ctx, EXPOSE_T, 'rainbow');
  } else {
    ST.stats.wrong++; ST.next = 0; for (const s of ST.shards) { if (!s.alive) s.mend = 0.6; s.alive = true; }
    fx('gm_glint', q.x, q.y - q.dy, { top: true }); ctx.sfx('fail'); ctx.toast(t.wrong);
    hurtPlayer(ctx, DMG.wrong, { x: q.x, y: q.y }, 'stagger', 0.6, 'wrong'); log('shard WRONG ' + COL[k]);
  }
  return true;
}
function expose(ctx, sec, why) {
  const b = ST.boss; if (!b) return; ST.exposed = sec; ST.stats.exposes++; b.act = null; b.stunT = STUN_T; ST.tele = ST.tele.filter(q => q.keep);
  ST.banner = { txt: L(ctx).exposed, t: 2.4 }; fx('gm_shatter', b.x, b.y - 22, { top: true }); fx('gm_glint', b.x, b.y - 30, { top: true }); ctx.sfx('gate_open'); if (ctx.quake) ctx.quake(0.25); log('EXPOSED ' + why);
}
function mendAll(ctx) { ST.next = 0; for (const s of ST.shards) { s.alive = true; s.mend = 0.8; } const b = ST.boss; if (b) fx('gm_arrive', b.x, b.y, {}); log('shards mend'); }

/* ---------------- PHẢN CHIẾU: gương chặn + phản xạ luồng Rocky-ha (ctx.haFilter ← pet.js) ---------------- */
function mirrors(ctx) {   /* danh sách mặt gương: {kind, x0,y0,x1,y1 (đoạn) | cx,cy,r (lồi)} — toạ độ VẼ (đã nâng) */
  const out = [], b = ST.boss;
  if (b && !ST.won && !(ST.warp && ST.warp.ph !== 'in') && !(b.intro > 0)) {
    if (!(ST.exposed > 0)) out.push({ kind: 'queen', cx: b.x, cy: b.y - 20, r: 11 });
    if (shardsHome()) for (const S of ST.shards) { if (!S.alive) continue; const q = shardPos(S.k), ta = Math.atan2(Math.sin(q.a) * ORB.ry, Math.cos(q.a) * ORB.rx) + Math.PI / 2, hx = Math.cos(ta) * 7, hy = Math.sin(ta) * 7; out.push({ kind: 'shard', k: S.k, x0: q.x - hx, y0: q.y - q.dy - hy, x1: q.x + hx, y1: q.y - q.dy + hy, nx: Math.cos(q.a), ny: Math.sin(q.a) }); }
  }
  for (const o of ctx.S.map.objects) if (o.type === 'gm_pillar' && !o.ruined) { const y = (o.y + 1) * TS - 14; out.push({ kind: 'pillar', o, x0: o.x * TS + 3, y0: y, x1: o.x * TS + 13, y1: y, nx: 0, ny: 1 }); }   /* mặt gương cột hướng Nam */
  return out;
}
function rayHit(ms, x, y, dx, dy, maxL, skip) {   /* giao điểm gần nhất của tia (x,y)+t(dx,dy) với các mặt gương → {t, n, m} */
  let best = null;
  for (const m of ms) {
    if (m === skip) continue;
    if (m.kind === 'queen') { const ox = x - m.cx, oy = y - m.cy, bq = ox * dx + oy * dy, c = ox * ox + oy * oy - m.r * m.r, D = bq * bq - c; if (D < 0) continue; const t = -bq - Math.sqrt(D); if (t > 1 && t < maxL && (!best || t < best.t)) { const hx = x + dx * t, hy = y + dy * t, l = Math.hypot(hx - m.cx, hy - m.cy) || 1; best = { t, n: { x: (hx - m.cx) / l, y: (hy - m.cy) / l }, m }; } continue; }
    const ex = m.x1 - m.x0, ey = m.y1 - m.y0, den = dx * ey - dy * ex; if (Math.abs(den) < 1e-6) continue;
    const t = ((m.x0 - x) * ey - (m.y0 - y) * ex) / den, u = ((m.x0 - x) * dy - (m.y0 - y) * dx) / den;
    if (t > 1 && t < maxL && u >= -0.05 && u <= 1.05 && (!best || t < best.t)) { let nx = m.nx, ny = m.ny; if (nx * dx + ny * dy > 0) { if (m.kind === 'pillar') continue; nx = -nx; ny = -ny; } best = { t, n: { x: nx, y: ny }, m }; }   /* mặt sau cột (đá) không phản */
  }
  return best;
}
/* tia phản xạ: đi tiếp từ (x,y) theo (dx,dy) dài L, nảy tiếp ≤ bounce lần; dừng ở ô cứng (cột / kệ bị hư) */
function traceReflect(ctx, ms, x, y, dx, dy, L0, bounce, skip, segs) {
  let L = L0;
  for (let b = 0; b <= bounce && L > 4; b++) {
    const h = rayHit(ms, x, y, dx, dy, L, skip); let end = h ? h.t : L, wall = null;
    for (let a = 4; a < end; a += 3) { const qx = x + dx * a, qy = y + dy * a + 14; if (solidAt(ctx, qx, qy)) { end = a; wall = { x: qx, y: qy }; break; } }   /* (y + 14: luồng bay cao ~ ngang ngực → chân ô) */
    segs.push({ x0: x, y0: y, x1: x + dx * end, y1: y + dy * end, wall });
    if (wall || !h || end < h.t) { if (wall && ctx.arenaImpact) ctx.arenaImpact(wall.x, wall.y, 1.3, 'land'); break; }
    const nx = h.n.x, ny = h.n.y, dd = dx * nx + dy * ny; x += dx * h.t; y += dy * h.t; dx -= 2 * dd * nx; dy -= 2 * dd * ny; L -= h.t; skip = h.m;
    segs.push({ bounce: true, x, y, m: h.m.kind }); fx('gm_prism', x, y, { top: true }); fx('gm_glint', x, y, { top: true }); prismFan(x, y, Math.atan2(dy - 2 * dd * ny, dx - 2 * dd * nx), 26, 0.9, { grow: 0.1, life: 0.3, fade: 0.14, noTip: true, quiet: true });
  }
}
function haFilter(ctx, ox, oy, ang, len, w, tier) {
  if (!inGm(ctx) || ST.won) return null;
  const ms = mirrors(ctx), dx = Math.cos(ang), dy = Math.sin(ang), h = rayHit(ms, ox, oy, dx, dy, len, null);
  ST.lastFire = { ox: Math.round(ox), oy: Math.round(oy), ang: +ang.toFixed(4), len: Math.round(len), hit: h ? h.m.kind : null };
  if (!h) return null;
  const cut = Math.max(6, h.t - 16), hx = ox + dx * h.t, hy = oy + dy * h.t, dd = dx * h.n.x + dy * h.n.y, rx = dx - 2 * dd * h.n.x, ry = dy - 2 * dd * h.n.y;
  const segs = [{ pre: true, x0: ox + dx * cut, y0: oy + dy * cut, x1: hx, y1: hy }, { bounce: true, x: hx, y: hy, m: h.m.kind }];   /* pet.js lineHits cộng thêm 12 px cho trùm → trả về độ dài lùi 16 px trước mặt gương (luồng Rocky không chạm trùm); đoạn 'pre' vẽ nốt tới mặt gương */
  fx('gm_prism', hx, hy, { top: true }); fx('gm_glint', hx, hy, { top: true }); prismFan(hx, hy, Math.atan2(ry, rx), 30, 0.9, { grow: 0.1, life: 0.32, fade: 0.14, noTip: true, quiet: true });   /* chạm gương: tách chùm phổ ngắn */
  traceReflect(ctx, ms, hx, hy, rx, ry, Math.max(60, len - h.t + 40), 2, h.m, segs);
  const R = { t: 0, life: 0.62, tier, w: w || 10, segs, hitP: false, hitR: false, n: { x: +h.n.x.toFixed(4), y: +h.n.y.toFixed(4) }, din: { x: +dx.toFixed(4), y: +dy.toFixed(4) }, dout: { x: +rx.toFixed(4), y: +ry.toFixed(4) }, at: { x: Math.round(hx), y: Math.round(hy) }, kind: h.m.kind };
  ST.refl.push(R); ST.stats.reflects++; ST.lastRefl = R; ctx.sfx('spar_bell');
  if (ST.t - ST.reflT > 6) { ST.reflT = ST.t; ctx.toast(L(ctx).reflect); }
  /* trúng người / Rocky trên các đoạn phản xạ (luồng rộng w) */
  const p = ctx.S.player, rp = rkPos(ctx), hw = (w || 10) / 2 + 5;
  for (const s of segs) { if (s.bounce || s.pre) continue;
    if (!R.hitP && segD(p.x, p.y - 10, s.x0, s.y0, s.x1, s.y1) < hw) { R.hitP = true; ST.stats.reflHitP++; hurtPlayer(ctx, DMG.reflect, { x: s.x0, y: s.y0 + 10 }, 'fly', 0.9, 'reflect'); }
    if (!R.hitR && rp && segD(rp.x, rp.y - 10, s.x0, s.y0, s.x1, s.y1) < hw) { R.hitR = true; ST.stats.reflHitR++; hurtRocky(ctx, 0.07, { x: s.x0, y: s.y0 + 10 }, 40); }
  }
  log('reflect ' + h.m.kind + ' hp ' + R.hitP + ' hr ' + R.hitR);
  return cut;
}

/* ---------------- hình vẽ trùm ---------------- */
function qPlay(clip, hold = 0) { const Q = ST.q; if (!Q) return; const c = QM && QM.clips[clip]; Q.clip = clip; Q.t = 0; Q.rev = false; Q.busy = (c ? c.n : 7) / Q_FPS[clip] + hold; }
function qClip(clip) { const Q = ST.q; if (Q && Q.clip !== clip) { Q.clip = clip; Q.t = 0; Q.rev = false; } }
function drawBoss(g, mo, x, y) {
  const Q = ST.q; if (!Q || Q.hidden) return;
  if (ST.warp && (ST.warp.ph === 'gone' || Q.alpha <= 0)) return;
  Q.flash = mo.flash || 0; Q.exposed = ST.exposed > 0;
  g.fillStyle = 'rgba(20,10,40,.32)'; g.beginPath(); g.ellipse(Math.round(x), Math.round(y), 12, 4, 0, 0, 7); g.fill();
  drawQ(g, Q, x, y);
  if (ST.exposed > 0 && !(Q.alpha < 0.5)) { const gl = VX('gm_glint'); if (gl && ST.t % 1.6 < 0.35) drawSheet(g, gl, Math.min(gl.n - 1, Math.floor((ST.t % 1.6) * 16)), x + 1, y - 29, 0.9); }   /* mặt gương thật lóe 1 lần / 1,6 s CHỈ khi đang lộ */
}

/* ---------------- tạo trùm ---------------- */
const INTRO = 3.5;
function spawnBoss(ctx) {
  const m = ctx.S.map, b = m.gmBoss || { x: 15, y: 6 }, hp = bossHp(ctx), t = L(ctx);
  const cfg = { key: 'guong', vi: STR.vi.name, en: STR.en.name, hp, dmg: 12, armor: 0, sp: 60, xp: 0, w: 22, h: 34, c: ['#7a6aa0', '#cfe6ff', '#ffffff'], gmBoss: true, noXpTag: true,
    aiFn: (c2, mo, dt, p, dp, canHit) => bossAi(c2, mo, dt, p, dp, canHit), drawFn: (g, mo, x, y) => drawBoss(g, mo, x, y), onDown: mo => queenDown(ctx, mo), tip: { vi: STR.vi.reflect, en: STR.en.reflect } };
  const mo = ctx.monsters.add(cfg, b.x * TS + 8, b.y * TS + 10);
  Object.assign(mo, { phase: 1, angry: true, warned: true, intro: INTRO, act: null, stunT: 0 });
  ST.boss = mo; ST.q = { clip: 'idle', t: 0, dir: 'south', hidden: true, alpha: 1 }; ST.startT = ST.t; ST.mirrorO = m.objects.find(o => o.bigMirror) || null;
  ST.banner = { txt: t.intro, t: 2.0 }; ctx.sfx('whirl'); log('spawn hp ' + hp);
  return mo;
}
function skipIntro(ctx) { const mo = ST.boss; if (!mo || !(mo.intro > 0)) return; mo.intro = 0.001; log('intro skip'); }
function introTick(ctx, mo, dt) {   /* 0–1,2 s bóng người chơi trong gương · 1,2–2 s bóng bước ra · 2 s bóng vỡ → Nữ Hoàng bước ra (clip tan chạy ngược) */
  const it = INTRO - mo.intro, Q = ST.q;
  if (it >= 2.0 && Q.hidden && !ST.introFr) { ST.introFr = true; const o = ST.mirrorO, T = o ? { x: o.x * TS + 12, y: (o.y + 1) * TS + 6 } : { x: mo.x, y: mo.y - 40 }; Q.clip = 'idle'; Q.t = 0; Q.dir = 'south'; makeFrags(qCell(Q), mo.x, mo.y, 'out', T, { dur: 0.75 }); fx('gm_shatter', T.x, T.y - 14, { top: true }); fx('gm_ripple', T.x, T.y, { ground: true }); ctx.sfx('smash'); ST.banner = { txt: L(ctx).rise, t: 2 }; log('queen out'); }   /* bóng vỡ → mảnh bay từ gương ra ghép thành Nữ Hoàng */
  if (ST.introFr && Q.hidden && it >= 2.75) { Q.hidden = false; Q.alpha = 1; fx('gm_glint', mo.x, mo.y - 30, { top: true }); fx('gm_arrive', mo.x, mo.y, {}); if (ctx.quake) ctx.quake(0.2); }
}

/* ---------------- AI ---------------- */
function tgPos(ctx, w) { if (w === 'r') { if (rkAway(ctx)) return null; return rkPos(ctx); } return ctx.S.player; }
function aggroTick(ctx, mo, dt) {
  const p = ctx.S.player, gone = rkAway(ctx); ST.tgtT += dt; ST.tgtLog[ST.tgt] = (ST.tgtLog[ST.tgt] || 0) + dt;
  if (dist(mo, p) < 34) { ST.nearT += dt; if (ST.nearT > 2) ST.agP += AG.near * dt; } else ST.nearT = 0;
  if (ST.tgt === 'r' && !gone) { ST.restT -= dt; if (ST.restT <= 0) { ST.agP = Math.max(ST.agP, AG.burst); ST.restT = 99; } }
  ST.agP = Math.max(0, ST.agP - AG.decay * dt * (ST.tgt === 'p' ? 1 : 0.6));
  let want = ST.tgt;
  if (gone) want = 'p'; else if (ST.tgt === 'r' && ST.agP > AG.rk) want = 'p'; else if (ST.tgt === 'p' && ST.agP < AG.back && ST.tgtT >= AG.hold) want = 'r';
  if (want !== ST.tgt && (ST.tgtT >= AG.gap || gone)) { ST.tgt = want; ST.tgtT = 0; if (want === 'p') ST.agP = Math.max(ST.agP, AG.burst); else ST.restT = AG.restless[0] + Math.random() * (AG.restless[1] - AG.restless[0]); if (!gone) ctx.toast(want === 'p' ? L(ctx).aimYou : L(ctx).aimRk); log('aim ' + want); }
}
function bossAi(ctx, mo, dt, p, dp, canHit) {
  mo.kb = null; mo.angry = true; mo.warned = true; const Q = ST.q; if (!Q) return;
  { const lh = ctx.monsters.lastHitT ? ctx.monsters.lastHitT() : -99; if (lh !== ST.lastHitSeen) { if (ST.lastHitSeen != null && lh > 0 && !(mo.intro > 0)) { ST.agP += AG.hit; ST.recent.push(ST.t); } ST.lastHitSeen = lh; } }
  if (mo.justHit) { mo.justHit = false; if (ST.exposed > 0) { const lh = ctx.monsters.lastHit && ctx.monsters.lastHit(); const extra = Math.round((lh ? lh.dmg : 0) * (SW_EXPOSED - 1)); if (extra > 0) mo.hp -= extra; } }
  if (mo.intro > 0) { mo.intro -= dt; introTick(ctx, mo, dt); if (mo.intro <= 0) { const k = mo.hp / mo.max, nh = bossHp(ctx); mo.max = nh; mo.hp = Math.max(1, Math.round(nh * k)); Q.hidden = false; Q.alpha = 1; qClip('idle'); ST.introDone = true; log('fight hp ' + nh); } return; }
  if (ST.ult) { mo.hp = Math.max(mo.hp, ST.ult.hp0); return; }   /* tuyệt chiêu: trùm giữa sân, chỉ tia bẻ mới trúng (ultTick lo) */
  if (mo.phase === 1 && mo.hp <= mo.max * 0.5) { mo.phase = 2; ctx.sfx('roar_big'); log('angry'); }
  for (const k in ST.cd) if (ST.cd[k] > 0) ST.cd[k] -= dt;
  if (mo.stunT > 0) { mo.stunT -= dt; qClip('stun'); return; }
  if (!ST.hold) aggroTick(ctx, mo, dt);   /* thù hận chạy cả lúc đang ra chiêu */
  if (ST.warp) return warpTick(ctx, mo, dt, p);
  if (ST.hop) return hopTick(ctx, mo, dt, p);
  if (mo.act) return actTick(ctx, mo, mo.act, dt, p);
  if (!canHit || ST.hold) { qClip('idle'); return; }
  ST.recent = ST.recent.filter(t => ST.t - t < 1.6);
  const tp = tgPos(ctx, ST.tgt) || p, dtp = dist(mo, tp), frac = mo.hp / mo.max, fast = mo.phase === 2;
  if (ST.recent.length >= 3 && !(mo.dodgeCd > ST.t)) return startDodge(ctx, mo, p);
  /* 2026-10-13 anh: mỗi chiêu HỒI CHIÊU RIÊNG (ST.cd) + ƯU TIÊN: tuyệt chiêu > chiêu mạnh (Nhảy Gương, Mảnh Gương Lao, Gương Soi Hồn) > chiêu thường (Tia Gương) > đòn cơ bản (Quét Gương).
     Mỗi lần chọn: chiêu mạnh nhất đã hồi xong + đủ điều kiện (khoảng cách, mảnh gương đang ở nhà…); không chiêu nào quá 2 lần liền (fresh). */
  const home = !ST.lance && shardsBack(), ultReady = !(ST.exposed > 0) && home && (ST.cd.ult <= 0 || (ST.ultAt.length && frac <= ST.ultAt[0] && ST.cd.ult < CD.ult - 8));
  if (ultReady && fresh('ult')) { if (ST.ultAt.length && frac <= ST.ultAt[0]) ST.ultAt.shift(); return startUlt(ctx, mo); }
  const STRONG = [['hop', () => ST.cd.warp <= 0 && dtp > 30 && home, () => startHop(ctx, mo)], ['lance', () => ST.cd.lance <= 0 && !(ST.exposed > 0) && home, () => start(ctx, mo, 'lance', tp)], ['soul', () => ST.cd.soul <= 0 && !ST.soul, () => start(ctx, mo, 'soul', p)]];
  for (const [k, ok, go] of STRONG) if (ok() && fresh(k)) return go();
  if (ST.cd.bolt <= 0 && dtp > 40 && fresh('bolt')) return start(ctx, mo, 'bolt', tp);
  if (dtp < 36 && ST.cd.sweep <= 0 && fresh('sweep')) return start(ctx, mo, 'sweep', tp);
  if (ST.cd.bolt <= 0 && dtp > 30 && !fresh('sweep') && fresh('bolt')) return start(ctx, mo, 'bolt', tp);   /* quét 2 lần liền rồi → đổi sang tia */
  /* đi tới ≤ 30 px (trong tầm quét 36 px → không có vùng chết khoảng cách) */
  if (dtp > 30) {   /* lướt theo vector tự do: tiến về mục tiêu + lượn vòng (thành phần tiếp tuyến đổi chiều 2–3 s) → đi chéo / cong, không chỉ theo trục */
    if (!(ST.sideT > ST.t)) { ST.side = Math.random() < 0.5 ? -1 : 1; ST.sideT = ST.t + 2 + Math.random(); }
    const ux = (tp.x - mo.x) / dtp, uy = (tp.y - mo.y) / dtp, k = dtp > 90 ? 0.35 : 0.75, vx = ux - uy * k * ST.side, vy = uy + ux * k * ST.side;
    moveMo(ctx, mo, vx, vy, SPD[fast ? 1 : 0], dt); qClip('walk'); Q.dir = faceOf(vx, vy);
  }
  else { qClip('idle'); Q.dir = faceOf(tp.x - mo.x, tp.y - mo.y); }
}
/* ĐỒNG HỒ AN TOÀN (anh chơi thật thấy 'mảnh gương đang bay' kẹt): mảnh rải ngoài sân mà không có chiêu nào giữ → gọi về sau 1,5 s, cưỡng bức về chỗ sau 3,5 s;
   chiêu kéo dài bất thường (Lao > 6 s, Nhảy gương > 9 s, Vạn Kính Lao > 16 s) → kết thúc + gọi mảnh về. Ghi lại vào ST.watch. */
function watchdog(ctx, dt) {
  const b = ST.boss;
  if (S_OUT() && !ST.ult && !ST.hop) { ST.outT += dt; if (ST.outT > 1.5 && !ST.shards.some(S => S.fly && S.fly.back)) { recallShards(); ST.watch.push('recall'); }
    if (ST.outT > 3.5) { for (const S of ST.shards) if (S.fly && S.fly.out) S.fly = null; ST.outT = 0; ST.watch.push('snap'); } } else ST.outT = 0;
  if (ST.lance && ST.t - (ST.lance.t0 ?? ST.t) > 6) { for (const S of ST.shards) if (S.fly && !S.fly.out) S.fly = null; ST.lance = null; ST.watch.push('lance'); }
  if (ST.hop && b && ST.t - (ST.hop.t0 ?? ST.t) > 9) { hopEnd(ctx, b); ST.watch.push('hop'); }
  if (ST.ult && b && ST.t - (ST.ult.t0 ?? ST.t) > 16) { ultEnd(ctx, b, false); ST.watch.push('ult'); }
  if (!b && S_OUT()) for (const S of ST.shards) if (S.fly && S.fly.out) S.fly = null;
}
/* chuỗi chiêu đã dùng (chống lặp: không chiêu nào quá 2 lần liền) */
const skill = k => { ST.skills.push(k); ST.skillT.push([k, +ST.t.toFixed(1)]); if (ST.skills.length > 80) { ST.skills.shift(); ST.skillT.shift(); } };
const fresh = k => { const n = ST.skills.length; return !(n >= 2 && ST.skills[n - 1] === k && ST.skills[n - 2] === k); };
function start(ctx, mo, k, tp) {
  skill(k);
  const t = L(ctx), Q = ST.q, fast = mo.phase === 2; Q.dir = faceOf(tp.x - mo.x, tp.y - mo.y);
  if (k === 'sweep') { const T = fast ? 0.5 : 0.6; mo.act = { k, t: 0, T }; ST.tele.push({ type: 'c', x: mo.x, y: mo.y, r: 36, t: T, T0: T, col: '#cfe6ff' }); qPlay('control'); ctx.sfx('spar_charge'); }
  else if (k === 'bolt') {   /* Tia Gương: tia trắng bắn vào 1 mảnh gương trước mặt (lăng kính) → tách thành 7 tia phổ toả ra phía mục tiêu */
    const a = Math.atan2(tp.y - mo.y, tp.x - mo.x), T = fast ? 0.6 : 0.75, px0 = mo.x + Math.cos(a) * 24, py0 = mo.y + Math.sin(a) * 24;
    mo.act = { k, t: 0, T, a, px: px0, py: py0 }; ST.tele.push({ type: 'fan', x: px0, y: py0, a, len: 240, spread: BOLT_SPREAD, t: T, T0: T }); qPlay('cast', 0.2); ctx.sfx('spar_charge'); if (ctx.pop) ctx.pop(mo.x, mo.y - 40, t.bolt, '#e8dcff'); }
  else if (k === 'lance') { startLance(ctx, mo, tp); }
  else if (k === 'soul') { startSoul(ctx, mo); }
  log('act ' + k);
}
function actTick(ctx, mo, A, dt, p) {
  A.t += dt; const fast = mo.phase === 2;
  if (A.k === 'sweep') {
    if (!A.hit && A.t >= A.T) { A.hit = true; ctx.sfx('whoosh_big'); fx('gm_prism', mo.x, mo.y - 12, { top: true }); areaHit(ctx, mo.x, mo.y, 38, DMG.sweep, 'sweep', 'fly', 1); }
    if (A.t >= A.T + 0.3) { mo.act = null; ST.cd.sweep = fast ? 1.1 : 1.4; }
    return;
  }
  if (A.k === 'bolt') {
    if (!A.fired && A.t >= A.T) { A.fired = true; A.ft = 0; ctx.sfx('hit'); fireBolt(ctx, mo, A); }
    if (A.fired) A.ft += dt;
    if (A.t >= A.T + 0.4) { mo.act = null; ST.cd.bolt = CD.bolt * (fast ? 0.75 : 1); }
    return;
  }
  if (A.k === 'dodge') { const u = Math.min(1, A.t / A.T); mo.x = A.x0 + (A.x1 - A.x0) * u; mo.y = A.y0 + (A.y1 - A.y0) * u; qClip('walk'); ST.q.dir = faceOf(A.x1 - A.x0, A.y1 - A.y0); if (u >= 1) { mo.act = null; ST.recent = []; } return; }
  if (A.k === 'cast') { if (A.t >= A.T) mo.act = null; return; }
}
function startDodge(ctx, mo, p) {   /* lướt né sang ngang / lùi 56 px tới chỗ trống */
  const d = dist(mo, p) || 1, s = Math.random() < 0.5 ? 1 : -1; let best = null;
  for (const [ax, ay] of [[-(p.y - mo.y) / d * s, (p.x - mo.x) / d * s], [(p.y - mo.y) / d * s, -(p.x - mo.x) / d * s], [(mo.x - p.x) / d, (mo.y - p.y) / d]]) { const q = clampIn(ctx, mo.x + ax * 56, mo.y + ay * 56); if (!solidAt(ctx, q.x, q.y) && !solidAt(ctx, (q.x + mo.x) / 2, (q.y + mo.y) / 2)) { best = q; break; } }
  mo.dodgeCd = ST.t + 3.2; if (!best) return; mo.act = { k: 'dodge', t: 0, T: 0.26, x0: mo.x, y0: mo.y, x1: best.x, y1: best.y }; fx('gm_glint', mo.x, mo.y - 20); ctx.sfx('whoosh_big'); log('dodge');
}

const BOLT_SPREAD = 0.62;   /* góc toả chùm 7 tia (rad) */
function fireBolt(ctx, mo, A) {
  const H0 = 14, pp = ctx.S.player, rp = rkPos(ctx); let hitP = false, hitR = false;
  addRay({ x0: mo.x, y0: mo.y - H0 - 4, x1: A.px, y1: A.py - H0, col: 'w', grow: 0.08, life: 0.5, noTip: true, quiet: true });   /* tia trắng từ tay vào lăng kính */
  fx('gm_glint', A.px, A.py - H0, { top: true }); fx('gm_prism', A.px, A.py - H0, { top: true });
  for (let i = 0; i < 7; i++) {
    const a = A.a + (i - 3) * BOLT_SPREAD / 6, ux = Math.cos(a), uy = Math.sin(a); let len = 240;
    for (let s = 6; s < 240; s += 4) if (solidAt(ctx, A.px + ux * s, A.py + uy * s)) { len = s; if (i === 3 && ctx.arenaImpact) ctx.arenaImpact(A.px + ux * s, A.py + uy * s, 1.2, 'land'); break; }
    addRay({ x0: A.px, y0: A.py - H0, x1: A.px + ux * len, y1: A.py + uy * len - H0, col: i, grow: 0.12 + i * 0.012, life: 0.5, delay: 0 });
    if (!hitP && segD(pp.x, pp.y, A.px, A.py, A.px + ux * len, A.py + uy * len) < 7) { hitP = true; hurtPlayer(ctx, DMG.bolt, { x: A.px, y: A.py }, 'fly', 0.85, 'bolt'); }
    if (!hitR && rp && segD(rp.x, rp.y, A.px, A.py, A.px + ux * len, A.py + uy * len) < 8) { hitR = true; hurtRocky(ctx, DMG.bolt, mo, 40); }
  }
  A.len = 240;
}
/* Mảnh Gương Lao: 6 mảnh bay theo hoa hồng r = A·cos(3θ) quanh chỗ mục tiêu đứng (chấm báo trước 1 s) */
function roseAt(L0, th) { const r = L0.A * Math.cos(3 * th); return { x: L0.cx + Math.cos(th) * r, y: L0.cy + Math.sin(th) * r * 0.8 }; }
function startLance(ctx, mo, tp) {
  const I = interior(ctx), cx = Math.max(I.x0 + 40, Math.min(I.x1 - 40, tp.x)), cy = Math.max(I.y0 + 30, Math.min(I.y1 - 10, tp.y)), rot = Math.random() * Math.PI;
  ST.lance = { t0: ST.t, ph: 'tele', t: 0, cx, cy, A: 72, rot, T1: 1.0, T2: 0.35, T3: 1.9, hitP: {}, hitR: {} };
  const pts = []; for (let i = 0; i < 90; i++) { const th = i / 90 * Math.PI; const q = roseAt(ST.lance, th + rot); pts.push(q); }
  ST.tele.push({ type: 'rose', pts, t: 1.0, T0: 1.0 }); qPlay('control', 0.4); mo.act = { k: 'cast', t: 0, T: 1.2 };
  ST.banner = { txt: L(ctx).lance, t: 1.5 }; ctx.sfx('warn'); log('lance');
}
function lanceTick(ctx, dt) {
  const La = ST.lance; if (!La) return; La.t += dt; const b = ST.boss;
  if (La.ph === 'tele') { if (La.t >= La.T1) { La.ph = 'out'; La.t = 0; for (const S of ST.shards) if (S.alive) { const q = shardPos(S.k); S.fly = { x: q.x, y: q.y, lift: q.dy, x0: q.x, y0: q.y, trail: [] }; } ctx.sfx('whoosh_big'); } return; }
  const th0 = k => La.rot + k * Math.PI / 6;
  for (const S of ST.shards) {
    if (!S.fly) continue; const F = S.fly; let q;
    if (La.ph === 'out') { const s0 = roseAt(La, th0(S.k)), u = Math.min(1, La.t / La.T2); q = { x: F.x0 + (s0.x - F.x0) * u, y: F.y0 + (s0.y - F.y0) * u }; }
    else if (La.ph === 'fly') { q = roseAt(La, th0(S.k) + Math.PI * Math.min(1, La.t / La.T3)); }
    else { const bh = b ? { x: b.x, y: b.y } : F, u = Math.min(1, La.t / 0.4); q = { x: F.x1 + (bh.x - F.x1) * u, y: F.y1 + (bh.y - F.y1) * u }; }
    F.trail.push({ x: F.x, y: F.y, t: 0 }); if (F.trail.length > 6) F.trail.shift(); F.x = q.x; F.y = q.y; F.lift = 8;
    if (La.ph === 'fly') {
      const p = ctx.S.player, rp = rkPos(ctx);
      const pv = F.trail[F.trail.length - 1] || F;   /* va chạm QUÉT theo đoạn di chuyển trong khung (mảnh bay nhanh, không lọt qua người khi khung hình thưa) */
      if (!La.hitP[S.k] && segD(p.x, p.y - 4, pv.x, pv.y, F.x, F.y) < 9) { La.hitP[S.k] = hurtPlayer(ctx, DMG.lance, { x: F.x, y: F.y }, 'stagger', 0.7, 'lance'); }
      if (!La.hitR[S.k] && rp && segD(rp.x, rp.y - 4, pv.x, pv.y, F.x, F.y) < 9) { La.hitR[S.k] = true; hurtRocky(ctx, DMG.lance, F, 30); }
    }
  }
  for (const S of ST.shards) if (S.fly) for (const tr of S.fly.trail) tr.t += dt;
  if (La.ph === 'out' && La.t >= La.T2) { La.ph = 'fly'; La.t = 0; }
  else if (La.ph === 'fly' && La.t >= La.T3) { La.ph = 'back'; La.t = 0; for (const S of ST.shards) if (S.fly) { S.fly.x1 = S.fly.x; S.fly.y1 = S.fly.y; } }
  else if (La.ph === 'back' && La.t >= 0.4) { for (const S of ST.shards) S.fly = null; ST.lance = null; ST.cd.lance = CD.lance * (b && b.phase === 2 ? 0.8 : 1); log('lance end'); }
}

/* Gương Soi Hồn: bản sao người chơi lặp lại đường đi 3 s trước (vệt chân báo trước đoạn sắp đi) */
const SOUL_LAG = 3, SOUL_DUR = 6.5;
function histAt(t) { const H = ST.hist; if (!H.length) return null; let lo = 0; while (lo < H.length - 1 && H[lo + 1].t <= t) lo++; return H[lo]; }
function startSoul(ctx, mo) {
  ST.soul = { t: 0, hitCd: 0.7, hits: 0, trace: [] }; qPlay('cast', 0.3); mo.act = { k: 'cast', t: 0, T: 0.8 };
  const h = histAt(ST.t - SOUL_LAG); if (h) fx('gm_arrive', h.x, h.y, {});
  ST.banner = { txt: L(ctx).soul, t: 1.8 }; ctx.sfx('whirl'); log('soul');
}
function soulTick(ctx, dt) {
  const So = ST.soul; if (!So) return; So.t += dt; if (So.hitCd > 0) So.hitCd -= dt;
  const h = histAt(ST.t - SOUL_LAG); if (!h) return; So.x = h.x; So.y = h.y; So.dir = h.dir; So.moving = h.moving; So.trace.push({ t: ST.t, x: h.x, y: h.y });
  const p = ctx.S.player;
  const pv = So.trace.length > 1 ? So.trace[So.trace.length - 2] : h;
  if (So.hitCd <= 0 && So.t > 0.6 && So.t < SOUL_DUR - 0.3 && segD(p.x, p.y, pv.x, pv.y, h.x, h.y) < 9) { So.hitCd = 1.0; So.hits++; hurtPlayer(ctx, DMG.soul, { x: h.x, y: h.y - 2 }, 'stagger', 0.6, 'soul'); fx('gm_glint', h.x, h.y - 10, { top: true }); }
  if (So.t >= SOUL_DUR) { fx('gm_shatter', h.x, h.y - 10, { top: true }); ST.soul = null; ST.cd.soul = CD.soul; log('soul end'); }
}

/* Dịch Chuyển Gương: tan vào mảnh gương → vòng báo ở gương đích (0,8 s) → bước ra + sóng sáng quanh gương */
function warpSpots(ctx) {
  const out = [];
  for (const o of ctx.S.map.objects) { if (o.type === 'gm_pillar' && !o.ruined) out.push({ x: o.x * TS + 8, y: (o.y + 1) * TS + 10, o }); if (o.bigMirror && !o.ruined) out.push({ x: o.x * TS + 16, y: (o.y + 1) * TS + 14, o }); }
  return out.filter(q => !solidAt(ctx, q.x, q.y));
}
function startWarp(ctx, mo, tp) {
  if (ST.skills[ST.skills.length - 1] !== 'hop') skill('warp');
  const sp = warpSpots(ctx).filter(q => dist(q, mo) > 60).sort((a, b) => dist(a, tp) - dist(b, tp));
  const dst = sp[0] || clampIn(ctx, tp.x + 50, tp.y); ST.warp = { ph: 'out', t: 0, x: dst.x, y: dst.y }; ST.cd.warp = CD.warp;
  qPlay('vanish'); ST.banner = { txt: L(ctx).warp, t: 1.2 }; ctx.sfx('whirl'); log('warp → ' + Math.round(dst.x) + ',' + Math.round(dst.y));
}
function warpTick(ctx, mo, dt, p) {
  const W = ST.warp, Q = ST.q; W.t += dt;
  if (W.ph === 'out') {   /* 0,25 s gồng (clip tan) → thân vỡ thành mảnh, xoáy hút vào mặt gương sàn dưới chân (gợn sóng) */
    if (!W.shat && W.t >= 0.25) { W.shat = true; makeFrags(qCell(Q), mo.x, mo.y, 'into', { x: mo.x, y: mo.y - 2 }); Q.alpha = 0; fx('gm_ripple', mo.x, mo.y, { ground: true, dur: 0.9 }); ctx.sfx('whirl'); }
    if (W.t >= 0.95) { W.ph = 'gone'; W.t = 0; Q.alpha = 0; ST.tele.push({ type: 'c', x: W.x, y: W.y, r: 32, t: 0.85, T0: 0.85, col: '#cfa8ff' }); fx('gm_glint', W.x, W.y - 24, { top: true }); fx('gm_ripple', W.x, W.y, { ground: true, dur: 1.2 }); } return; }
  if (W.ph === 'gone') { if (W.t >= 0.85) { W.ph = 'in'; W.t = 0; mo.x = W.x; mo.y = W.y; Q.clip = 'idle'; Q.t = 0; Q.rev = false; Q.alpha = 0; Q.dir = 'south'; makeFrags(qCell(Q), mo.x, mo.y, 'out', { x: mo.x, y: mo.y - 2 }, { dur: 0.6 }); ctx.sfx('smash'); } return; }   /* mảnh từ mặt gương bay ra, ghép lại thành người */
  if (!W.land && W.t >= 0.6) { W.land = true; Q.alpha = 1; fx('gm_arrive', mo.x, mo.y, {}); fx('gm_glint', mo.x, mo.y - 30, { top: true }); if (ctx.quake) ctx.quake(0.15); areaHit(ctx, mo.x, mo.y, 34, DMG.warp, 'warp', 'fly', 0.9); }
  if (W.t >= 0.9) { ST.warp = null; Q.alpha = 1; qClip('idle'); ST.cd.lance = Math.min(ST.cd.lance, 1.5); log('warp done'); }
}

/* ---------------- TUYỆT CHIÊU: Vạn Kính Lao (2026-10-13 v5 — anh: dùng CHÍNH 6 mảnh gương của Nữ Hoàng, rải ngẫu nhiên để DẪN LỐI tia tới người chơi) ----------------
   Các mảnh gương CÒN LÀNH bay vút ra (vệt màu) tới chỗ ngẫu nhiên quanh người chơi (trong khung nhìn, cách nhau ≥ 46–60 px), Nữ Hoàng đứng giữa bắn tia trắng
   vào mảnh đầu → tia nảy CHUỖI qua các mảnh (đổi màu theo màu mảnh, mỗi lần nảy tách chùm phổ) → chặng cuối nhắm chỗ người chơi đang đứng / đón đầu.
   Chuỗi đổi mỗi 1,3 s (vạch báo vẽ dần 0,5 s). Chỉ chọn chuỗi còn VÙNG AN TOÀN thật (≥ 30 % sàn + chỗ an toàn ≤ 40 px quanh người — kiểm bằng số).
   Đánh vào mảnh → mảnh xoay: chuỗi tới mảnh đó bẻ thẳng vào Nữ Hoàng (trúng 2 lần → vỡ chiêu + LỘ). Mảnh đã vỡ (thứ tự cầu vồng) không dùng → chuỗi ngắn hơn.
   Xong chiêu các mảnh bay về quanh Nữ Hoàng. */
const U_WARN = 0.5, U_ON = 0.8, U_PATS = 7, U_HOP = 0.11, FLY_SP = 420;
/* khung camera khi mảnh rải ngoài sân: tâm X,Y sao cho Nữ Hoàng (c) nằm DƯỚI thanh máu và người chơi vẫn trong khung */
function ultView(ctx, c, p) {
  const VW = ctx.VW || 480, VH = ctx.VH || 270, top = Math.max(30, (ST.uiTopL || 60)) + 10;
  let X = c.x, Y = c.y - 40 - top + VH / 2;
  const mx = VW / 2 - 20, myT = VH / 2 - top, myB = VH / 2 - 26;
  if (p.x < X - mx) X = p.x + mx; if (p.x > X + mx) X = p.x - mx; if (p.y - 18 < Y - myT) Y = p.y - 18 + myT; if (p.y > Y + myB) Y = p.y - myB;
  return { X, Y, x0: X - VW / 2 + 22, x1: X + VW / 2 - 22, y0: Y - VH / 2 + top + 26, y1: Y + VH / 2 - 18 };
}
function spotsNear(ctx, n, c, p) {   /* n chỗ ngẫu nhiên quanh người chơi (40–150 px), trong khung nhìn, không đè vật / lối ra / trùm */
  const m = ctx.S.map, out = [], I = interior(ctx), V = ultView(ctx, c, p), ok = (x, y) => !solidAt(ctx, x, y) && !solidAt(ctx, x - 8, y) && !solidAt(ctx, x + 8, y) && !(y > (m.h - 6) * TS && Math.abs(x - m.w * TS / 2) < 40);
  const x0 = Math.max(I.x0 + 10, V.x0), x1 = Math.min(I.x1 - 10, V.x1), y0 = Math.max(I.y0 + 16, V.y0), y1 = Math.min(I.y1 + 8, V.y1), small = (x1 - x0) * (y1 - y0) < 40000;
  for (let gap = small ? 46 : 60; gap >= 30 && out.length < n; gap -= 8) for (let tries = 0; tries < 500 && out.length < n; tries++) {
    const a = Math.random() * Math.PI * 2, r = 40 + Math.random() * 110, x = Math.max(x0, Math.min(x1, p.x + Math.cos(a) * r)), y = Math.max(y0, Math.min(y1, p.y + Math.sin(a) * r * 0.8));
    if (!ok(x, y) || Math.hypot(x - p.x, y - p.y) < 36 || Math.hypot(x - c.x, y - c.y) < 36 || out.some(q => Math.hypot(q.x - x, q.y - y) < gap)) continue;
    out.push({ x: Math.round(x), y: Math.round(y) });
  }
  return out;
}
/* rải các mảnh còn lành ra chỗ mới (bay vút, để vệt màu) · gọi mảnh về quanh trùm */
function scatterShards(ctx, c, p) {
  const live = ST.shards.filter(S => S.alive), sp = spotsNear(ctx, live.length, c, p), M = [];
  live.forEach((S, i) => { const q = sp[i]; if (!q) return; const s0 = shardPos(S.k); S.fly = { x: s0.x, y: s0.y, lift: 14, trail: [], tx: q.x, ty: q.y, out: true }; M.push({ i: M.length, k: S.k, S, turned: false, face: Math.PI / 2, get x() { return S.fly ? S.fly.x : 0; }, get y() { return S.fly ? S.fly.y : 0; } }); });
  ST.scatter = true; ctx.sfx('whoosh_big'); return M;
}
function recallShards() { ST.scatter = false; for (const S of ST.shards) if (S.fly && S.fly.out) { S.fly.back = true; } }
function shardsFlyTick(dt) {   /* mảnh đang rải: bay tới đích; mảnh gọi về: bay về chỗ quỹ đạo rồi nhập lại vòng */
  for (const S of ST.shards) {
    const F = S.fly; if (!F || !F.out) continue;
    let tx = F.tx, ty = F.ty; if (F.back) { const b = ST.boss; if (!b) { S.fly = null; continue; } const a = ST.orbA + S.k * Math.PI / 3; tx = b.x + Math.cos(a) * ORB.rx; ty = b.y + Math.sin(a) * ORB.ry; }
    const d = Math.hypot(tx - F.x, ty - F.y), st = FLY_SP * dt;
    if (d > 0.5) { F.trail.push({ x: F.x, y: F.y, t: 0 }); if (F.trail.length > 7) F.trail.shift(); }
    if (d <= st) { F.x = tx; F.y = ty; if (F.back) S.fly = null; else F.trail.length = Math.max(0, F.trail.length - 1); } else { F.x += (tx - F.x) / d * st; F.y += (ty - F.y) / d * st; }
  }
}
const S_OUT = () => ST.shards.some(S => S.fly && S.fly.out);
const shardsSettled = () => ST.shards.every(S => !S.fly || !S.fly.out || (Math.hypot(S.fly.x - S.fly.tx, S.fly.y - S.fly.ty) < 1 && !S.fly.back));
const shardsBack = () => ST.shards.every(S => !S.fly || !S.fly.out);
function startUlt(ctx, mo) {
  skill('ult');
  const c0 = ctx.S.map.gmCenter || { x: mo.x, y: mo.y }, p = ctx.S.player, VW = ctx.VW || 480, VH = ctx.VH || 270, top = Math.max(30, (ST.uiTopL || 60)) + 10, I = interior(ctx);
  const c = { x: Math.max(I.x0 + 40, Math.min(I.x1 - 40, Math.max(p.x - (VW / 2 - 50), Math.min(p.x + (VW / 2 - 50), c0.x)))), y: Math.max(I.y0 + 40, Math.min(I.y1 - 20, Math.max(p.y - (VH - top - 40 - 40), Math.min(p.y - 40, c0.y)))) };   /* màn nhỏ: Nữ Hoàng đứng gần người chơi để cả hai + mảnh gương cùng lọt khung */
  if (solidAt(ctx, c.x, c.y)) { const f = nearestFree(ctx, c.x, c.y); if (f) { c.x = f.x; c.y = f.y; } }
  ST.ult = { t0: ST.t, ph: 'gather', t: 0, cx: c.x, cy: c.y, M: [], pat: -1, on: false, segs: [], chain: [], hits: 0, hp0: mo.hp, hitP: false, hitR: false, trail: [], safe: [] };
  mo.act = null; ST.lastUlt = ST.t; ST.cd.ult = 12; ST.banner = { txt: L(ctx).ult, t: 2.4 }; qPlay('control', 1); ctx.sfx('spar_roar'); if (ctx.quake) ctx.quake(0.3); log('ult');
}
function chainSegs(U, chain, aim) {   /* Nữ Hoàng → mảnh … → chặng cuối nhắm người chơi (aim); gặp mảnh đã xoay → bẻ vào trùm */
  const out = []; let x = U.cx, y = U.cy - 20, col = 'w';
  for (const i of chain) { const m = U.M[i]; out.push({ x0: x, y0: y, x1: m.x, y1: m.y - 14, to: m, col }); x = m.x; y = m.y - 14; col = m.k; if (m.turned) { out.push({ x0: x, y0: y, x1: U.cx, y1: U.cy - 20, toQ: true, from: m, col }); return out; } }
  if (aim && chain.length) { const L0 = Math.hypot(aim.x - x, aim.y - 10 - y) || 1, ux = (aim.x - x) / L0, uy = (aim.y - 10 - y) / L0, len = Math.min(240, L0 + 50); out.push({ x0: x, y0: y, x1: x + ux * len, y1: y + uy * len, col, last: true }); }   /* chặng cuối: qua chỗ người chơi thêm 50 px */
  return out;
}
function safeInfo(ctx, segs, p) {
  const I = interior(ctx); let n = 0, safe = 0, near = false;
  for (let y = I.y0; y <= I.y1 + 8; y += 8) for (let x = I.x0; x <= I.x1; x += 8) {
    if (solidAt(ctx, x, y)) continue; n++; const hit = segs.some(sg => segD(x, y - 10, sg.x0, sg.y0, sg.x1, sg.y1) < 12);
    if (!hit) { safe++; if (Math.hypot(x - p.x, y - p.y) < 40) near = true; }
  }
  return { frac: n ? safe / n : 0, near };
}
function pickChain(ctx, U) {
  const p = ctx.S.player, n = U.M.length, v = ST.pv || { x: 0, y: 0 }, aim = { x: p.x + v.x * 0.35, y: p.y + v.y * 0.35 }; let best = null;   /* đón đầu nhẹ theo hướng đang chạy */
  for (let k = 0; k < 30; k++) {
    const idx = [...Array(n).keys()].sort(() => Math.random() - 0.5).slice(0, Math.min(4, n));
    if (n > 1 && U.chain.length && idx.join() === U.chain.join()) continue;
    const segs = chainSegs(U, idx, aim), S = safeInfo(ctx, segs, p), score = S.frac + (S.near ? 1 : 0);
    if (!best || score > best.score) best = { idx, S, score, aim };
    if (S.near && S.frac >= 0.3) break;
  }
  return best;
}
function ultTick(ctx, mo, dt) {
  const U = ST.ult; U.t += dt; const Q = ST.q;
  if (U.ph === 'gather') {   /* trùm lướt về chỗ đứng chiêu; mảnh gương bay vút ra quanh người chơi */
    const d = Math.hypot(U.cx - mo.x, U.cy - mo.y); if (d > 1) { const s2 = Math.min(d, 160 * dt); mo.x += (U.cx - mo.x) / d * s2; mo.y += (U.cy - mo.y) / d * s2; }
    if (!U.M.length && U.t >= 0.3) { U.M = scatterShards(ctx, { x: U.cx, y: U.cy }, ctx.S.player); if (!U.M.length) return ultEnd(ctx, mo, false); }
    if (U.M.length && U.t >= 0.6 && shardsSettled()) { U.ph = 'grid'; U.t = 0; ST.banner = { txt: L(ctx).ultHint, t: 2.6 }; for (const m of U.M) fx('gm_glint', m.x, m.y - 20, { top: true }); }
    return;
  }
  if (U.ph === 'grid') {
    Q.dir = 'south'; if (Q.clip !== 'control') qClip('control');
    const per = U_WARN + U_ON, pi = Math.floor(U.t / per), ph = U.t - pi * per;
    if (pi >= U_PATS || U.hits >= 2) return ultEnd(ctx, mo, U.hits >= 2);
    if (pi !== U.pat) { U.pat = pi; const B = pickChain(ctx, U); U.chain = B ? B.idx : []; U.aim = B ? B.aim : null; U.safe.push({ frac: +(B ? B.S.frac : 0).toFixed(3), near: !!(B && B.S.near) }); U.hitP = false; U.hitR = false; U.qHit = false; U.on = false; U.fans = {}; }
    U.segs = chainSegs(U, U.chain, U.aim); U.onT = ph - U_WARN; U.warnT = ph;
    for (let k = 0; k < U.segs.length; k++) { const a = U.segs[k], b = U.segs[k + 1]; if (!a.to || !b) continue; const din = Math.atan2(a.y1 - a.y0, a.x1 - a.x0), dout = Math.atan2(b.y1 - b.y0, b.x1 - b.x0), nx = Math.cos(dout) - Math.cos(din), ny = Math.sin(dout) - Math.sin(din); a.to.face = Math.hypot(nx, ny) > 0.01 ? Math.atan2(ny, nx) : dout; }
    const was = U.on; U.on = ph >= U_WARN;
    if (U.on && !was) ctx.sfx('hit');
    if (U.on) {
      const p = ctx.S.player, rp = rkPos(ctx);
      U.segs.forEach((sg, k) => {
        const tk = U.onT - k * U_HOP; if (tk <= 0) return; const L0 = Math.hypot(sg.x1 - sg.x0, sg.y1 - sg.y0), head = L0 * Math.min(1, tk / 0.12), ux = (sg.x1 - sg.x0) / (L0 || 1), uy = (sg.y1 - sg.y0) / (L0 || 1), hx = sg.x0 + ux * head, hy = sg.y0 + uy * head;
        if (head >= L0 - 0.5 && !U.fans[k] && sg.to) { U.fans[k] = true; const nb = U.segs[k + 1]; prismFan(sg.x1, sg.y1, nb ? Math.atan2(nb.y1 - nb.y0, nb.x1 - nb.x0) : Math.atan2(uy, ux), 26, 1.0, { grow: 0.08, life: 0.28, fade: 0.12, noTip: true, quiet: true }); }
        if (!U.hitP && segD(p.x, p.y - 10, sg.x0, sg.y0, hx, hy) < 7) U.hitP = hurtPlayer(ctx, DMG.laser, { x: p.x - uy * 10, y: p.y + ux * 10 }, 'fly', 0.8, 'laser') || U.hitP;
        if (!U.hitR && rp && segD(rp.x, rp.y - 10, sg.x0, sg.y0, hx, hy) < 7) { U.hitR = true; hurtRocky(ctx, DMG.laser, { x: sg.x0, y: sg.y0 + 10 }, 30); }
        if (sg.last && head >= L0 - 0.5 && !U.wallHit) { U.wallHit = true; if (ctx.arenaImpact && solidAt(ctx, sg.x1, sg.y1 + 14)) ctx.arenaImpact(sg.x1, sg.y1 + 14, 1.1, 'wall'); }   /* chỉ khi chạm vật cứng (không để hố trên sàn trống) */
        if (sg.toQ && head >= L0 - 0.5 && !U.qHit) { U.qHit = true; U.hits++; ST.stats.ultHits++; mo.hp = Math.max(1, mo.hp - Math.round(mo.max * 0.035)); U.hp0 = mo.hp; mo.flash = 0.2; U.trail.push({ ...sg, t: 0 }); fx('gm_glint', mo.x, mo.y - 22, { top: true }); prismFan(U.cx, U.cy - 20, Math.atan2(uy, ux), 34, 1.2, { grow: 0.1, life: 0.3, fade: 0.15, quiet: true }); ctx.toast(L(ctx).ultHit, true); ctx.sfx('smash'); log('ult hit queen ' + U.hits); }
      });
      if (U.onT > U_ON - 0.05) U.wallHit = false;
    }
    for (const tr of U.trail) tr.t += dt; U.trail = U.trail.filter(tr => tr.t < 0.4);
    return;
  }
}
function ultEnd(ctx, mo, broke) {
  ST.ult = null; ST.cd.ult = CD.ult; ST.lastUlt = ST.t; recallShards();   /* mảnh gương bay về quanh Nữ Hoàng */
  if (broke) { ST.banner = { txt: L(ctx).ultBreak, t: 2 }; expose(ctx, 6, 'ult'); } else { mo.cd = 1; qClip('idle'); }
  log('ult end ' + (broke ? 'broken' : 'timeout'));
}

/* ---------------- NHẢY GƯƠNG (2026-10-13 v5 — anh: boss di chuyển GIỮA CÁC GƯƠNG của boss) ----------------
   Rải mảnh gương ra quanh người chơi → Nữ Hoàng tan vào mảnh (mảnh xoáy + gợn) → vòng báo ở mảnh đích 0,4 s → bước ra từ mảnh đó + đòn ngắn
   (quét quanh mình hoặc tia gương ngắn nhắm người chơi) — 2–4 lần liền → mảnh bay về. Thiếu mảnh (< 2 mảnh lành) → dịch chuyển cột gương kiểu cũ. */
function startHop(ctx, mo) {
  skill('hop');
  const live = ST.shards.filter(S => S.alive).length; if (live < 2 || ST.lance) return startWarp(ctx, mo, ctx.S.player);
  ST.hop = { t0: ST.t, ph: 'scatter', t: 0, n: 2 + Math.floor(Math.random() * 3), done: 0, M: scatterShards(ctx, { x: mo.x, y: mo.y }, ctx.S.player), last: -1 }; ST.cd.warp = CD.warp;
  qPlay('control', 0.3); ST.banner = { txt: L(ctx).warp, t: 1.2 }; log('hop start ' + ST.hop.n);
}
function hopTick(ctx, mo, dt, p) {
  const H = ST.hop, Q = ST.q; H.t += dt;
  if (H.ph === 'scatter') { if (H.t >= 0.35 && shardsSettled()) { H.ph = 'out'; H.t = 0; } return; }
  if (H.ph === 'out') {   /* tan vào mảnh gần nhất (hoặc mặt gương sàn lần đầu) */
    if (!H.shat) { H.shat = true; const near = H.cur ? { x: H.cur.x, y: H.cur.y } : { x: mo.x, y: mo.y - 2 }; makeFrags(qCell(Q), mo.x, mo.y, 'into', near, { dur: 0.45 }); Q.alpha = 0; fx('gm_ripple', mo.x, mo.y, { ground: true, dur: 0.6 }); ctx.sfx('whirl');
      const cand = H.M.filter((m, i) => i !== H.last && m.S.alive && m.S.fly); const tgt = cand.sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[Math.min(cand.length - 1, Math.floor(Math.random() * 2))];
      H.dst = tgt || null; if (H.dst) { H.last = H.M.indexOf(H.dst); ST.tele.push({ type: 'c', x: H.dst.x, y: H.dst.y + 6, r: 30, t: 0.4 + 0.3, T0: 0.7, col: '#cfa8ff' }); } }
    if (H.t >= 0.3) { H.ph = 'gone'; H.t = 0; if (!H.dst) return hopEnd(ctx, mo); } return; }
  if (H.ph === 'gone') { if (H.t >= 0.4) { H.ph = 'in'; H.t = 0; const d = H.dst; mo.x = d.x; mo.y = d.y + 6; Q.clip = 'idle'; Q.t = 0; Q.alpha = 0; Q.dir = faceOf(p.x - mo.x, p.y - mo.y); makeFrags(qCell(Q), mo.x, mo.y, 'out', { x: d.x, y: d.y - 4 }, { dur: 0.35 }); fx('gm_ripple', mo.x, mo.y, { ground: true, dur: 0.6 }); ctx.sfx('smash'); H.cur = d; } return; }
  if (H.ph === 'in') { if (H.t >= 0.35) { H.ph = 'atk'; H.t = 0; Q.alpha = 1; fx('gm_glint', mo.x, mo.y - 30, { top: true });
      if (Math.hypot(p.x - mo.x, p.y - mo.y) < 40) { qPlay('control'); fx('gm_prism', mo.x, mo.y - 12, { top: true }); areaHit(ctx, mo.x, mo.y, 32, DMG.sweep * 0.8, 'hop', 'fly', 0.85); }
      else { qPlay('cast'); const a = Math.atan2(p.y - mo.y, p.x - mo.x); prismFan(mo.x + Math.cos(a) * 14, mo.y - 14 + Math.sin(a) * 14, a, 90, 0.4, { grow: 0.1, life: 0.3, fade: 0.12 }); for (let i = 0; i < 7; i++) { const aa = a + (i - 3) * 0.4 / 6; if (segD(p.x, p.y, mo.x, mo.y, mo.x + Math.cos(aa) * 104, mo.y + Math.sin(aa) * 104) < 7) { hurtPlayer(ctx, DMG.bolt * 0.8, mo, 'stagger', 0.7, 'hop'); break; } } }
      H.done++; log('hop in ' + H.done); }
    return; }
  if (H.ph === 'atk') { if (H.t >= 0.3) { if (H.done >= H.n) return hopEnd(ctx, mo); H.ph = 'out'; H.t = 0; H.shat = false; } return; }
}
function hopEnd(ctx, mo) { ST.hop = null; ST.q.alpha = 1; recallShards(); qClip('idle'); ST.cd.lance = Math.max(ST.cd.lance, 2); log('hop done'); }
function turnMirror(ctx, m) { const U = ST.ult; if (!U || U.ph !== 'grid' || m.turned) return false; m.turned = true; ST.stats.turned++; ST.agP += AG.shard; fx('gm_glint', m.x, m.y - 16, { top: true }); ctx.sfx('spar_bell'); log('turn ' + m.i); return true; }

/* ---------------- người chơi đập mảnh gương / xoay gương (E / A / click) ---------------- */
function swingAt(ctx, target) {
  const p = ctx.S.player; if (ST.swingCd > ST.t) return; ST.swingCd = ST.t + 0.45;
  if (p.faceTo) p.faceTo(target.x, target.y);
  const clip = p.hasAct && p.hasAct('attack') ? 'attack' : p.hasAct && p.hasAct('chop') ? 'chop' : null; if (clip) p.act(clip, 0);
  const sh = clip && p.sheet.actions[clip], at = sh && sh.impact != null ? sh.impact / (sh.fps || 12) : 0.18;
  ST.swingQ.push({ t: at, target });
}
function swingTick(ctx, dt) {
  for (const s of ST.swingQ) { s.t -= dt; if (s.t > 0) continue; s.done = true; const p = ctx.S.player, T = s.target;
    if (T.shard != null) { const q = shardPos(T.shard); if (Math.hypot(q.x - p.x, q.y - p.y) < 36) hitShard(ctx, T.shard); }
    else if (T.mirror) { if (Math.hypot(T.mirror.x - p.x, T.mirror.y - p.y) < 34) turnMirror(ctx, T.mirror); } }
  ST.swingQ = ST.swingQ.filter(s => !s.done);
}
function shardCand(ctx, p) {
  const b = ST.boss; if (!b || !ST.introDone || ST.ult || ST.exposed > 0 || !shardsHome()) return null; let best = null, bd = 30;
  for (const S of ST.shards) { if (!S.alive) continue; const q = shardPos(S.k), d = Math.hypot(q.x - p.x, q.y - p.y); if (d < bd && d < dist(b, p) - 2) { bd = d; best = { k: S.k, q }; } }
  return best;
}
function mirrorCand(p) { const U = ST.ult; if (!U || U.ph !== 'grid') return null; let best = null, bd = 28; for (const m of U.M) { if (m.turned) continue; const d = Math.hypot(m.x - p.x, m.y - p.y); if (d < bd) { bd = d; best = m; } } return best; }

/* ================= PHA 2: Nữ Hoàng vỡ → BÓNG GƯƠNG của người chơi ================= */
function queenDown(ctx, mo) {
  ST.boss = null; ST.lance = null; ST.ult = null; ST.warp = null; ST.hop = null; ST.soul = null; ST.tele = []; ST.exposed = 0;
  for (const S of ST.shards) { if (S.alive) { const a = ST.orbA + S.k * Math.PI / 3; ST.falling.push({ k: S.k, x: mo.x + Math.cos(a) * ORB.rx, y: mo.y + Math.sin(a) * ORB.ry, z: ORB.lift, vx: Math.cos(a) * 40, vz: 40, t: 0 }); } S.alive = false; S.fly = null; }
  ST.burst = { t: 0, x: mo.x, y: mo.y }; ST.q = { clip: 'shatter', t: 0, dir: 'south', alpha: 1 };
  ST.banner = { txt: L(ctx).burst, t: 2.4 }; ctx.sfx('smash'); if (ctx.quake) ctx.quake(0.4); fx('gm_shatter', mo.x, mo.y - 20, { top: true }); log('queen down');
}
function burstTick(ctx, dt) {
  const B = ST.burst, Q = ST.q; B.t += dt; Q.t += dt;
  if (B.t > 0.5 && !B.boom) { B.boom = true; makeFrags(qCell(Q), B.x, B.y, 'burst', { x: B.x, y: B.y }, { dur: 1.4, grid: 6 }); Q.alpha = 0; fx('gm_shatter', B.x, B.y - 20, { top: true }); fx('gm_prism', B.x, B.y - 24, { top: true }); prismFan(B.x, B.y - 22, -Math.PI / 2, 60, Math.PI * 1.7, { grow: 0.12, life: 0.35, fade: 0.2, quiet: true }); ctx.sfx('smash'); if (ctx.quake) ctx.quake(0.3); }   /* nổ tung: mảnh pha lê phản chiếu màu + chùm phổ toả tròn */
  if (B.t > 0.9 && !B.crack) { B.crack = true; fx('gm_shatter', B.x, B.y - 18, { top: true }); const o = ST.mirrorO; if (o) { o.hpMax = 2; o.hp = 1; fx('gm_glint', o.x * TS + 16, o.y * TS - 6, { top: true }); } ctx.sfx('smash'); if (ctx.quake) ctx.quake(0.2); log('mirror cracks'); }
  if (B.t > 1.6 && !ST.sh && !ST.won) spawnShadow(ctx);
  if (B.t > 2.4) ST.burst = null;
}
/* bóng gương = bản sao thực thể người chơi (cùng sheet, cùng clip), vẽ bằng bộ lọc pha lê âm bản lúc vẽ */
function mkGhost(ctx) { const p = ctx.S.player, E = Object.create(Object.getPrototypeOf(p)); Object.assign(E, { x: p.x, y: p.y, sheet: crystalSheet(p.sheet), dir: 0, frame: 0, animT: 0, moving: false, idleT: 0, action: null, custom: null, speedMul: 1, passable: null, boxW: 10, boxH: 6, ghost: true }); return E; }
const SH_FILTER = 'none', SOUL_FILTER = 'brightness(1.12)';   /* thân pha lê đã tô sẵn trên sheet (crystalSheet) */
function drawGhost(g, E, x, y, filter, alpha, glow) {
  const ox = E.x, oy = E.y; E.x = x; E.y = y; g.save(); g.imageSmoothingEnabled = false; g.globalAlpha = alpha; g.filter = filter; try { E.draw(g); } catch (e) { /* bỏ qua */ }
  if (glow) { g.filter = 'brightness(2.2) saturate(0.4)'; g.globalCompositeOperation = 'lighter'; g.globalAlpha = alpha * glow; try { E.draw(g); } catch (e) { /* bỏ qua */ } }
  g.restore(); E.x = ox; E.y = oy;
}
function spawnShadow(ctx) {
  const o = ST.mirrorO, x = o ? o.x * TS + 16 : ctx.S.map.gmCenter.x, y = o ? (o.y + 1) * TS + 14 : ctx.S.map.gmCenter.y, t = L(ctx);
  const cfg = { key: 'gmshadow', vi: STR.vi.ph2name, en: STR.en.ph2name, hp: shHp(ctx), dmg: 0, armor: 0, sp: 80, xp: 0, w: 12, h: 20, noXpTag: true, gmShadow: true, c: ['#2a1a4a', '#9a8ad8', '#ffffff'],
    aiFn: (c2, mo, dt, p, dp, canHit) => shAi(c2, mo, dt, p, dp, canHit), drawFn: (g, mo, X, Y) => drawSh(g, mo, X, Y), onDown: mo => shDown(ctx, mo) };
  const mo = ctx.monsters.add(cfg, x, y); Object.assign(mo, { angry: true, warned: true, act: null, cd: { slash: 0.6, dash: 2.2, dodge: 0 }, recent: [], E: mkGhost(ctx), fade: 0 });
  mo.E.x = x; mo.E.y = y; ST.sh = mo; ST.shStart = ST.t; fx('gm_arrive', x, y, {}); ST.banner = { txt: t.ph2, t: 2.2 }; ctx.sfx('roar_big'); log('shadow spawn hp ' + mo.max);
}
/* Bóng Gương hướng CHÉO: ảnh PixelLab riêng (boss/guong/shadow8, sinh từ người chơi mặc định c0 — tools/px-guong-shadow.py), tô pha lê lúc chạy (crystalImg, nguồn <img> không __hi).
   Người chơi mặc ngoại hình to (skin) → không có ảnh chéo → dùng hướng gần nhất (4 hướng của sheet người chơi). */
let S8 = null; const USE_S8 = false;   /* 2026-10-13 anh: Bóng Gương phải giống HỆT người chơi (đúng trang phục) → không dùng ảnh chéo c0; đi chéo mượt, mặt theo hướng gần nhất của sheet người chơi */
if (typeof fetch !== 'undefined') fetch('assets/px/boss/guong/shadow8/s8.json').then(r => r.json()).then(j => { S8 = j; for (const c of Object.values(j.clips)) img(c.file); }).catch(() => {});
function drawSh8(g, mo, x, y, alpha) {
  const d = mo.face8 || 'south'; if (!USE_S8 || !S8 || !/-/.test(d) || (ST.ctx && ST.ctx.S.player.sheet && ST.ctx.S.player.sheet.skin)) return false;
  const A = mo.act, clip = A && A.k === 'slash' && A.sw ? 'attack' : 'walk', c = S8.clips[clip], im0 = c && img(c.file); if (!im0) return false;
  const im = crystalImg(im0), row = Math.max(0, c.rows.indexOf(d.replace('west', 'east'))), flip = /west/.test(d);
  const f = clip === 'attack' ? Math.min(c.n - 1, Math.floor((A.t - (A.T - 0.12)) * 14)) : (mo.E && mo.E.moving ? Math.floor(ST.t * 8) % Math.min(4, c.n) : 0)   /* 4 khung đầu (các khung sau của clip AI xoay dần mặt về nam) */;
  const cw = S8.cw, ch = S8.ch, X = Math.round(x), Y = Math.round(y);
  g.save(); g.imageSmoothingEnabled = false; g.globalAlpha = alpha; if (mo.flash > 0) g.filter = 'brightness(2.2)';
  if (flip) { g.translate(X, 0); g.scale(-1, 1); g.drawImage(im, f * cw, row * ch, cw, ch, -cw / 4, Y - ch / 2 + 1, cw / 2, ch / 2); } else g.drawImage(im, f * cw, row * ch, cw, ch, X - cw / 4, Y - ch / 2 + 1, cw / 2, ch / 2);
  if (mo.glow > 0) { g.globalCompositeOperation = 'lighter'; g.globalAlpha = alpha * 0.35 * mo.glow; g.filter = 'brightness(2.2) saturate(0.4)'; if (flip) g.drawImage(im, f * cw, row * ch, cw, ch, -cw / 4, Y - ch / 2 + 1, cw / 2, ch / 2); else g.drawImage(im, f * cw, row * ch, cw, ch, X - cw / 4, Y - ch / 2 + 1, cw / 2, ch / 2); }
  g.restore(); ST.sh8n = (ST.sh8n || 0) + 1; return true;
}
function drawSh(g, mo, x, y) { const E = mo.E; if (!E) return; g.fillStyle = 'rgba(20,10,40,.3)'; g.beginPath(); g.ellipse(Math.round(x), Math.round(y), 6, 2.2, 0, 0, 7); g.fill(); const al = Math.min(1, 0.4 + mo.fade); if (drawSh8(g, mo, x, y, al)) return; drawGhost(g, E, x, y, mo.flash > 0 ? 'brightness(2.2)' : SH_FILTER, al, mo.glow > 0 ? 0.35 * mo.glow : 0); }   /* lấp lánh dọc thân CHỈ lúc ra đòn (mo.glow) */
function shAi(ctx, mo, dt, p, dp, canHit) {
  const E = mo.E; E.x = mo.x; E.y = mo.y; mo.fade = Math.min(1, mo.fade + dt);   /* đồng bộ vị trí thực thể bóng (faceTo tính theo E.x/E.y) */ if (mo.glow > 0) mo.glow = Math.max(0, mo.glow - dt * 2.5); for (const k in mo.cd) if (mo.cd[k] > 0) mo.cd[k] -= dt;
  if (mo.justHit) { mo.justHit = false; mo.recent.push(ST.t); } mo.recent = mo.recent.filter(t => ST.t - t < 1.2);
  E.animate(dt);
  const A = mo.act;
  if (A) { A.t += dt;
    if (A.k === 'slash') { mo.face8 = faceOf(Math.cos(A.a), Math.sin(A.a)); if (!A.sw && A.t >= A.T - 0.12) { A.sw = true; if (E.hasAct('attack')) E.act('attack', 0); mo.glow = 1; for (let i = 0; i < 3; i++) fx('gm_glint', mo.x + (Math.random() - 0.5) * 8, mo.y - 4 - i * 6, { top: true, alpha: 0.85 }); } if (!A.hit && A.t >= A.T) { A.hit = true; ctx.sfx('hit'); const ax = mo.x + Math.cos(A.a) * 12, ay = mo.y + Math.sin(A.a) * 8; areaHit(ctx, ax, ay, 18, DMG.shSlash, 'sh_slash', (mo.combo = (mo.combo || 0) + 1) % 3 ? 'stagger' : 'fly', 0.9); } if (A.t >= A.T + 0.3) { mo.act = null; mo.cd.slash = 0.55; } return; }
    if (A.k === 'dash') { mo.face8 = faceOf(Math.cos(A.a), Math.sin(A.a)); if (A.t < A.T) { E.faceTo(mo.x + Math.cos(A.a) * 10, mo.y + Math.sin(A.a) * 10); return; } const u = Math.min(1, (A.t - A.T) / 0.22), nx = A.x0 + (A.x1 - A.x0) * u, ny = A.y0 + (A.y1 - A.y0) * u; mo.x = nx; mo.y = ny; E.moving = true;
      if (!A.hit) { const pp = ctx.S.player; if (Math.hypot(pp.x - mo.x, pp.y - mo.y) < 11) { A.hit = true; hurtPlayer(ctx, DMG.shDash, mo, 'fly', 0.9, 'sh_dash'); } } if (u >= 1) { mo.act = null; mo.cd.dash = 3.2; E.moving = false; } return; }
    if (A.k === 'dodge') { const u = Math.min(1, A.t / A.T); mo.x = A.x0 + (A.x1 - A.x0) * u; mo.y = A.y0 + (A.y1 - A.y0) * u; E.moving = true; if (u >= 1) { mo.act = null; mo.recent = []; } return; }
  }
  if (!canHit || ST.hold) { E.moving = false; return; }
  const a = Math.atan2(p.y - mo.y, p.x - mo.x);
  if (mo.recent.length >= 2 && mo.cd.dodge <= 0) { mo.cd.dodge = 2.6; const s = Math.random() < 0.5 ? 1 : -1, q = clampIn(ctx, mo.x - Math.sin(a) * 40 * s, mo.y + Math.cos(a) * 40 * s); if (!solidAt(ctx, q.x, q.y)) { mo.act = { k: 'dodge', t: 0, T: 0.2, x0: mo.x, y0: mo.y, x1: q.x, y1: q.y }; fx('gm_glint', mo.x, mo.y - 12); ctx.sfx('whoosh_big'); return; } }
  if (dp > 50 && dp < 150 && mo.cd.dash <= 0) { let len = Math.min(dp + 16, 150); for (let s = 8; s < len; s += 4) if (solidAt(ctx, mo.x + Math.cos(a) * s, mo.y + Math.sin(a) * s)) { len = s - 6; break; } const q = { x: mo.x + Math.cos(a) * len, y: mo.y + Math.sin(a) * len }; mo.act = { k: 'dash', t: 0, T: 0.38, a, x0: mo.x, y0: mo.y, x1: q.x, y1: q.y }; ST.tele.push({ type: 'l', x: mo.x, y: mo.y, a, len, t: 0.38, T0: 0.38, col: '#b8a0ff' }); ctx.sfx('spar_charge'); log('sh dash'); return; }
  if (dp < 26 && mo.cd.slash <= 0) { E.faceTo(p.x, p.y); mo.act = { k: 'slash', t: 0, T: 0.34, a }; ST.tele.push({ type: 'arc', x: mo.x, y: mo.y, a, r: 22, t: 0.34, T0: 0.34, col: '#d8c8ff' }); log('sh slash'); return; }
  if (dp > 18) { const sp = 80 * (mo.hp < mo.max * 0.5 ? 1.1 : 1), ux = (p.x - mo.x) / dp, uy = (p.y - mo.y) / dp;
    if (!(mo.sideT > ST.t)) { mo.side = Math.random() < 0.5 ? -1 : 1; mo.sideT = ST.t + 1.5 + Math.random(); }
    const k = mo.cd.slash > 0.15 && dp < 60 ? 1.6 : dp > 80 ? 0.3 : 0.6, vx = ux - uy * k * mo.side, vy = uy + ux * k * mo.side;   /* hồi chiêu thì lượn vòng quanh người chơi, rồi áp sát chéo */
    moveMo(ctx, mo, vx, vy, sp, dt); E.moving = true; E.faceTo(mo.x + vx * 10, mo.y + vy * 10); mo.vdir = Math.atan2(vy, vx); mo.face8 = faceOf(vx, vy); } else { E.moving = false; E.faceTo(p.x, p.y); mo.face8 = faceOf(p.x - mo.x, p.y - mo.y); }   /* đuổi tới 18 px < tầm chém 26 px: không vùng chết */
}
function shDown(ctx, mo) {
  ST.sh = null; ST.tele = []; ST.death = { t: 0, x: mo.x, y: mo.y, E: mo.E };
  fx('gm_shatter', mo.x, mo.y - 10, { top: true }); fx('gm_prism', mo.x, mo.y - 10, { top: true });
  for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; ST.falling.push({ k: i % 6, x: mo.x, y: mo.y, z: 12, vx: Math.cos(a) * 60, vz: 50 + Math.random() * 30, t: 0 }); }
  ST.banner = { txt: L(ctx).die, t: 2.4 }; ctx.sfx('smash'); if (ctx.quake) ctx.quake(0.25); log('shadow down');
}
function deathTick(ctx, dt) { const D = ST.death; D.t += dt; if (D.t >= 0.6 && !D.won) { D.won = true; const o = ST.mirrorO; if (o) { o.ruined = true; o.orig = o.type; } onWin(ctx, D); } if (D.t > 3) ST.death = null; }

/* ---------------- thắng ---------------- */
function onWin(ctx, mo) {
  const h = sv(ctx), first = h.wins === 0, t = L(ctx), secs = Math.round(ST.t - ST.startT);
  h.wins++; h.best = h.best ? Math.min(h.best, secs) : secs; ST.won = true; ST.boss = null; ST.tele = [];
  if (ctx.quake) ctx.quake(0.3); ctx.sfx('boss_win'); ST.banner = { txt: t.won, t: 3.5 };
  const xp = first ? 1300 : 300; if (ctx.hero) ctx.hero.gainXp(xp); if (ctx.onMonsterDown) { try { ctx.onMonsterDown(mo, first ? 800 : 200); } catch (e) { /* bỏ qua */ } }
  ctx.give('stone', first ? 350 : 80, mo.x, mo.y); ctx.give('soul', first ? 3 : 1, mo.x + 8, mo.y);
  const r = ((ctx.S.save.sys ||= {}).road ||= {}); r.balls ||= []; const miss = [1, 2, 3, 4, 5, 6, 7].filter(n => !r.balls.includes(n));
  if (miss.length && (first || Math.random() < 0.2)) { const n = miss[(Math.random() * miss.length) | 0]; r.balls.push(n); ctx.give('dball' + n, 1, mo.x - 10, mo.y, { beam: true }); setTimeout(() => ctx.toast(ctx.lang() === 'vi' ? `🐉 NGỌC RỒNG ${n} SAO rơi ra!` : `🐉 The ${n}-STAR DRAGON BALL dropped!`, true), 1800); }
  if (first) { if (ctx.hrBook && ctx.hrBook.add) ctx.hrBook.add(1); h.book = 1; if (ctx.achieve) ctx.achieve('guong'); setTimeout(() => ctx.toast(t.title, true), 3200); setTimeout(() => { if (ctx.hrBook) ctx.hrBook.open(); }, 4200); }
  else setTimeout(() => ctx.toast(t.again, true), 2400);
  ctx.persist(); log('WIN ' + secs + 's first ' + first);
}

/* ---------------- hệ thống ---------------- */
export const guong = {
  id: 'guong', always: true,   /* khe nứt ở 'm6'; trận ở 'rift3' */
  onZoneEnter(ctx) {
    if (inM6(ctx)) { const o = ctx.S.map.objects.find(q => q.rift === 'rift3'); if (o) o.type = riftOpen(ctx) ? 'rift_crack' : 'rift_crack_off'; }
    if (!inGm(ctx)) { reset(); return; }
    reset(); const h = sv(ctx); h.tries++; ctx.persist();
    ctx.haFilter = (ox, oy, ang, len, w, tier) => haFilter(ctx, ox, oy, ang, len, w, tier);
    const prevHush = ctx.petHush; ctx.petHush = () => (inGm(ctx) && !!(ST.boss || ST.sh)) || (prevHush ? prevHush() : false);
    const M = ctx.monsters, dmg0 = M.damage;
    M.damage = (mo, d, src, ...rest) => {
      if (mo && mo.c && mo.c.gmBoss && inGm(ctx)) {
        if (mo.intro > 0 || ST.ult || (ST.warp && ST.warp.ph !== 'in') || (ST.hop && ST.q && ST.q.alpha < 0.5)) return false;
        const fromRk = src && src === rkEnt(ctx), mul = fromRk ? (ST.exposed > 0 ? RK_EXPOSED : RK_MUL) : 1, dd = Math.max(1, Math.round(d * mul));
        if (fromRk) { ST.stats.rkRaw += d; ST.stats.rkDealt += dd; }
        rest[1] = 0; return dmg0(mo, dd, src, ...rest);
      }
      return dmg0(mo, d, src, ...rest);
    };
    const prevFaint = ctx.faintTravel; ctx.faintTravel = () => { if (inGm(ctx)) return ctx.travel('m6', 'rift'); return prevFaint ? prevFaint() : false; };
    spawnBoss(ctx);
    if (typeof window !== 'undefined') window.__gm = hooks(ctx);
  },
  onZoneLeave(ctx) { if (inGm(ctx)) { bossCamReset(ctx); ctx.haFilter = null; ST.boss = null; ST.sh = null; ST.ult = null; ST.lance = null; ST.soul = null; ST.warp = null; ST.burst = null; ST.death = null; } },
  update(dt, ctx) {
    if (typeof window !== 'undefined' && inM6(ctx)) window.__gm = hooks(ctx);
    if (!inGm(ctx)) return; ST.t += dt; ST.ctx = ctx;
    if (ctx.S.mode !== 'play') return;
    if (ST.boss && !ctx.monsters.list().includes(ST.boss)) ST.boss = null; if (ST.sh && !ctx.monsters.list().includes(ST.sh)) ST.sh = null;
    if (ST.boss && ST.boss.kb) ST.boss.kb = null;
    if (ST.sh && ST.sh.kb && !ST.sh.kb.gm) { ST.sh.kb.vx *= 0.35; ST.sh.kb.vy *= 0.35; ST.sh.kb.gm = 1; }
    const p = ctx.S.player; ST.hist.push({ t: ST.t, x: p.x, y: p.y, dir: p.dir, moving: !!p.moving }); while (ST.hist.length && ST.hist[0].t < ST.t - 8) ST.hist.shift();
    if (ST.q) { ST.q.t += dt; if (ST.q.busy > 0) { ST.q.busy -= dt; } }
    if (ST.boss && !(ST.boss.intro > 0)) ST.orbA += dt * ORB.sp * (ST.boss.phase === 2 ? 1.3 : 1);
    if (ST.exposed > 0) { ST.exposed -= dt; if (ST.exposed <= 0 && ST.boss) { ST.exposed = 0; mendAll(ctx); } }
    for (const s of ST.shards) if (s.mend > 0) s.mend -= dt;
    if (ST.boss && ST.ult) ultTick(ctx, ST.boss, dt);
    lanceTick(ctx, dt); soulTick(ctx, dt); swingTick(ctx, dt); raysTick(dt); fragsTick(dt); shardsFlyTick(dt); watchdog(ctx, dt);
    if (ST.burst) burstTick(ctx, dt); if (ST.death) deathTick(ctx, dt);
    for (const f of ST.falling) { f.t += dt; f.x += f.vx * dt; f.vz -= 220 * dt; f.z = Math.max(0, f.z + f.vz * dt); if (f.z <= 0) { f.vx *= 0.8; f.vz = 0; } } ST.falling = ST.falling.filter(f => f.t < 2.2);
    for (const R of ST.refl) R.t += dt; ST.refl = ST.refl.filter(R => R.t < R.life + 0.35);
    for (const f of ST.fx) f.t += dt; ST.fx = ST.fx.filter(f => f.t < f.dur);
    for (const t of ST.tele) t.t -= dt; ST.tele = ST.tele.filter(t => t.t > 0);
    if (ST.banner) { ST.banner.t -= dt; if (ST.banner.t <= 0) ST.banner = null; }
    if (ST.boss && ST.boss.act && ST.boss.act.k === 'bolt' && ST.boss.act.fired) { /* tia vẽ trong drawables */ }
    unstick(ctx);
    const bb = ST.boss || ST.sh || ST.burst;
    if (ST.boss && ST.boss.intro > 0) { const S = ctx.S, k = Math.min(1, dt * 4), tx = ST.boss.x, ty = ST.boss.y - 30; S.camDX = (S.camDX || 0) + (tx - p.x - (S.camDX || 0)) * k; S.camDY = (S.camDY || 0) + (ty - (p.y - 8) - (S.camDY || 0)) * k; }   /* màn mở đầu: nhìn thẳng gương lớn */
    else if (ST.ult || ST.hop) { const bq = ST.boss || { x: p.x, y: p.y }, cq = ST.ult ? { x: ST.ult.cx, y: ST.ult.cy } : { x: bq.x, y: bq.y }, V = ultView(ctx, cq, p), S = ctx.S, k = Math.min(1, dt * 6); S.camDX = (S.camDX || 0) + (V.X - p.x - (S.camDX || 0)) * k; S.camDY = (S.camDY || 0) + (V.Y - (p.y - 8) - (S.camDY || 0)) * k; }   /* tuyệt chiêu: khung bao trọn gương + Nữ Hoàng + người chơi, Nữ Hoàng dưới thanh máu (không phóng to) */
    else bossCam(ctx, bb ? { x: bb.x, y: bb.y } : null, dt, { h: 40, top: Math.max(40, (ST.uiTopL || 60) * 0.85) });
  },
  near(ctx) {
    const p = ctx.S.player, t = L(ctx);
    if (inM6(ctx)) {
      const o = ctx.S.map.objects.find(q => q.rift === 'rift3'); if (!o) return null; const x = o.x * TS + 16, y = o.y * TS + 10;
      if (Math.hypot(p.x - x, p.y - y) > 48) return null;
      const ok = riftOpen(ctx); return { label: ok ? t.enter : t.locked(roadOk(ctx), rkLv(ctx) >= 40, rkLv(ctx)), x, y, limit: 48, priority: 5, data: { rift3: true, ok } };
    }
    if (!inGm(ctx)) return null;
    if (ST.boss && ST.boss.intro > 0 && INTRO - ST.boss.intro > 0.25) return { label: t.skip, x: p.x, y: p.y - 20, limit: 999, priority: 9, mouse: false, data: { gmSkip: true } };
    const m = mirrorCand(p); if (m) return { label: t.turn, x: m.x, y: m.y - 14, limit: 40, priority: 4, cursor: 'tool', data: { gmMirror: m } };
    const s = shardCand(ctx, p); if (s) return { label: t.hitShard(t.colors[s.k], ST.next + 1), x: s.q.x, y: s.q.y - s.q.dy, limit: 40, priority: 4, cursor: 'tool', data: { gmShard: s.k } };
    return null;
  },
  interact(ctx, cand) {
    const d = cand && cand.data; if (!d) return;
    if (d.gmSkip) { skipIntro(ctx); return; }
    if (d.gmShard != null) { swingAt(ctx, { shard: d.gmShard, x: cand.x, y: cand.y }); return; }
    if (d.gmMirror) { swingAt(ctx, { mirror: d.gmMirror, x: d.gmMirror.x, y: d.gmMirror.y }); return; }
    if (!d.rift3) return;
    if (!rk(ctx)) { ctx.toast(L(ctx).noRocky); return; }
    if (!d.ok) { ctx.toast(L(ctx).locked(roadOk(ctx), rkLv(ctx) >= 40, rkLv(ctx)), true); ctx.sfx('fail'); return; }
    ctx.sfx('whirl'); ctx.travel('rift3', 'default');
  },
  onClick(ctx, mt) {   /* click trúng mảnh gương / gương xoay trong tầm → đập */
    if (!inGm(ctx) || !mt) return false; const p = ctx.S.player;
    const U = ST.ult; if (U && U.ph === 'grid') { for (const m of U.M) if (!m.turned && Math.hypot(mt.wx - m.x, mt.wy - (m.y - 12)) < 12 && Math.hypot(m.x - p.x, m.y - p.y) < 34) { swingAt(ctx, { mirror: m, x: m.x, y: m.y }); return true; } }
    if (ST.boss && shardsHome() && !(ST.exposed > 0) && ST.introDone) for (const S of ST.shards) { if (!S.alive) continue; const q = shardPos(S.k); if (Math.hypot(mt.wx - q.x, mt.wy - (q.y - q.dy)) < 9 && Math.hypot(q.x - p.x, q.y - p.y) < 36) { swingAt(ctx, { shard: S.k, x: q.x, y: q.y }); return true; } }
    return false;
  },
  drawGround(g, ctx, cx, cy) {
    if (!inGm(ctx)) return;
    for (const f of ST.fx) if (f.ground) drawSheet(g, f.s, Math.min(f.s.n - 1, Math.floor(f.t * (f.s.fps || 12))), f.x - cx, f.y - cy, f.alpha);   /* gợn mặt gương sàn (lớp nền) */
    for (const t of ST.tele) {   /* báo trước: sáng dần tới lúc ra đòn (không nhấp nháy lặp) */
      const k = 1 - t.t / t.T0; g.save();
      if (t.type === 'c') { g.strokeStyle = t.col; g.globalAlpha = 0.4 + 0.5 * k; g.lineWidth = 1; g.beginPath(); g.arc(Math.round(t.x - cx), Math.round(t.y - cy), t.r, 0, 7); g.stroke(); g.globalAlpha = 0.1 + 0.25 * k; g.fillStyle = t.col; g.beginPath(); g.arc(Math.round(t.x - cx), Math.round(t.y - cy), t.r * k, 0, 7); g.fill(); }
      else if (t.type === 'l') { g.globalAlpha = 0.25 + 0.5 * k; g.strokeStyle = t.col; g.lineWidth = 1 + Math.round(2 * k); g.beginPath(); g.moveTo(Math.round(t.x - cx), Math.round(t.y - cy)); g.lineTo(Math.round(t.x + Math.cos(t.a) * t.len - cx), Math.round(t.y + Math.sin(t.a) * t.len - cy)); g.stroke(); }
      else if (t.type === 'arc') { g.globalAlpha = 0.35 + 0.5 * k; g.fillStyle = t.col; g.beginPath(); g.moveTo(Math.round(t.x - cx), Math.round(t.y - cy)); g.arc(Math.round(t.x - cx), Math.round(t.y - cy), t.r, t.a - 0.9, t.a + 0.9); g.closePath(); g.globalAlpha = 0.12 + 0.3 * k; g.fill(); }
      else if (t.type === 'fan') { for (let i = 0; i < 7; i++) { const a = t.a + (i - 3) * t.spread / 6; g.globalAlpha = 0.2 + 0.45 * k; g.strokeStyle = SPEC[i]; g.lineWidth = 1; g.setLineDash([2, 3]); g.beginPath(); g.moveTo(Math.round(t.x - cx), Math.round(t.y - cy)); g.lineTo(Math.round(t.x + Math.cos(a) * t.len * Math.min(1, k * 1.5) - cx), Math.round(t.y + Math.sin(a) * t.len * Math.min(1, k * 1.5) - cy)); g.stroke(); } g.setLineDash([]); }   /* báo trước: 7 vạch phổ mờ mọc dần */
      else if (t.type === 'rose') { const n = t.pts.length, upto = Math.floor(n * Math.min(1, k * 1.8)); for (let i = 0; i < upto; i += 2) { const q = t.pts[i]; g.globalAlpha = 0.45 + 0.45 * k; g.fillStyle = HEX[Math.floor(i / n * 6) % 6]; g.fillRect(Math.round(q.x - cx) - 1, Math.round(q.y - cy), 2, 2); } }   /* đường hoa: chấm cầu vồng hiện dần */
      g.restore();
    }
    if (ST.soul) {   /* Gương Soi Hồn: vệt chân báo trước đoạn đường bản sao SẮP đi (lịch sử 3 s → giờ), mờ dần theo thời gian tới */
      const now = ST.t; g.save(); g.fillStyle = '#b8d8ff';
      for (const h of ST.hist) { const ahead = h.t - (now - SOUL_LAG); if (ahead < 0 || ahead > 1.6) continue; if (Math.floor(h.t * 8) % 2) continue; g.globalAlpha = 0.6 * (1 - ahead / 1.6); g.fillRect(Math.round(h.x - cx) - 1, Math.round(h.y - cy) - 1, 3, 2); }
      g.restore();
    }
  },
  drawables(ctx, cx, cy) {
    if (!inGm(ctx)) return []; const out = [], g = ctx.g, b = ST.boss;
    for (const f of ST.fx) if (!f.ground) out.push({ y: f.top ? 1e9 : f.y + 6, f: () => drawSheet(g, f.s, Math.min(f.s.n - 1, Math.floor(f.t * (f.s.fps || 12))), f.x - cx, f.y - cy, f.alpha) });
    /* mảnh gương bay quanh người (6 màu); mảnh vừa lành lại hiện mờ dần */
    if (b && !(b.intro > 0) && !(ST.warp && ST.warp.ph === 'gone' && !S_OUT())) for (const S of ST.shards) {
      if (!S.alive) continue; const q = shardPos(S.k), im = SHARD(S.k); if (!im) continue;
      const al = (S.mend > 0 ? 1 - S.mend / 0.8 : 1) * (ST.warp && !(S.fly && S.fly.out) ? ST.q.alpha : 1), turned = !!(ST.ult && ST.ult.M.some(m => m.S === S && m.turned));
      if (S.fly) for (const [i, tr] of S.fly.trail.entries()) { const a2 = 0.12 + 0.07 * i; out.push({ y: tr.y + 1, f: () => { g.save(); g.filter = `hue-rotate(${(i * 50) % 360}deg)`; blitC(g, im, tr.x - cx, tr.y - cy - 8, a2); g.restore(); } }); }   /* vệt cầu vồng ngắn (bản mờ đổi sắc của chính ảnh mảnh gương) */
      const isNext = S.k === ST.next && !ST.exposed;
      out.push({ y: q.y + 0.4, f: () => { if (turned) { g.save(); g.filter = 'brightness(1.5) saturate(1.4)'; } blitC(g, im, q.x - cx, q.y - q.dy - cy, al); if (turned) g.restore(); if (isNext && shardsHome() && ST.introDone && !ST.ult) { g.save(); g.fillStyle = HEX[S.k]; g.globalAlpha = 0.9; const x = Math.round(q.x - cx), y = Math.round(q.y - q.dy - cy) - 11; g.fillRect(x - 1, y, 3, 1); g.fillRect(x, y + 1, 1, 1); g.restore(); } } });   /* dấu ▼ nhỏ TĨNH trên mảnh cần đập tiếp */
    }
    for (const f of ST.falling) { const im = SHARD(f.k); if (!im) continue; out.push({ y: f.y, f: () => { const w = im.naturalWidth / (f.small ? 4 : 2), h = im.naturalHeight / (f.small ? 4 : 2); g.save(); g.imageSmoothingEnabled = false; g.globalAlpha = Math.max(0, Math.min(1, (2.2 - f.t) / 0.6)); g.drawImage(im, Math.round(f.x - cx - w / 2), Math.round(f.y - cy - f.z - h / 2), w, h); g.restore(); } }); }   /* mảnh vụn rơi (nhỏ = ¼ ảnh — vụn) */
    /* màn mở đầu: bóng người chơi trong gương lớn → bước ra */
    if (b && b.intro > 0 && ST.mirrorO) { const it = INTRO - b.intro; if (it < 2.05) { const o = ST.mirrorO, gx = o.x * TS + 4 + 4, gy = (o.y + 1) * TS - 36, gw = 16, gh = 30, E = (ST.introE ||= mkGhost(ctx)); E.sheet = ctx.S.player.sheet; E.dir = 0; E.moving = it > 1.2; E.animate(1 / 60);
      const u = Math.max(0, Math.min(1, (it - 1.2) / 0.8)), fy = gy + gh - 3 + u * 22;
      out.push({ y: u < 0.5 ? (o.y + 1) * TS + 0.5 : fy, f: () => { g.save(); if (u < 0.5) { g.beginPath(); g.rect(gx - cx, gy - cy, gw + 4, gh + u * 22); g.clip(); } drawGhost(g, E, gx + 4 - cx, fy - cy, 'brightness(1.05) saturate(0.85) hue-rotate(15deg)', 0.85, 0.12); g.restore(); } }); } }
    /* Gương Soi Hồn: bản sao trong gương */
    if (ST.soul && ST.soul.x != null) { const So = ST.soul, E = (So.E ||= mkGhost(ctx)); E.sheet = ctx.S.player.sheet; E.dir = So.dir; E.moving = So.moving; E.animate(1 / 60); const al = Math.min(0.75, So.t * 1.5, (SOUL_DUR - So.t) * 1.5);
      out.push({ y: So.y, f: () => drawGhost(g, E, So.x - cx, So.y - cy, SOUL_FILTER, al, 0.25) }); }
    /* Tia Gương (tia sáng trắng — sheet luồng PixelLab đổi màu) */
    if (b && b.act && b.act.k === 'bolt' && !b.act.fired) { const A = b.act, im = SHARD(5); if (im) out.push({ y: A.py + 1, f: () => blitC(g, im, A.px - cx, A.py - 14 - cy, Math.min(1, A.t / 0.2)) }); }   /* lăng kính (mảnh gương) bay ra trước mặt */
    if (ST.rays.length) out.push({ y: 1e8 + 2, f: () => { for (const r of ST.rays) drawRay(g, r, cx, cy); } });
    for (const F of ST.frags) out.push({ y: F.mode === 'burst' ? 1e8 : F.y + 1, f: () => drawFrags(g, F, cx, cy) });
    /* luồng Rocky-ha PHẢN XẠ: vẽ bằng chính sheet Rocky-ha PixelLab theo từng đoạn + vệt phổ màu (3 bản lệch sắc) lúc tắt dần */
    for (const R of ST.refl) { const s = bSheet(beamKey(R.tier || 4)); if (!s) continue; out.push({ y: 1e8, f: () => {
      const on = R.t < R.life, fr = bFrame(s, Math.min(R.t, R.life * 0.9));
      for (const sg of R.segs) { if (sg.bounce) continue;
        if (on) drawSeg(g, s, fr, sg.x0 - cx, sg.y0 - cy, sg.x1 - cx, sg.y1 - cy, 1);
        const k = on ? 0.35 : Math.max(0, 0.45 * (1 - (R.t - R.life) / 0.35)); if (k > 0) [['hue-rotate(-60deg) saturate(2)', -1], ['hue-rotate(80deg) saturate(2)', 1]].forEach(([fl, o]) => drawSeg(g, s, fr, sg.x0 - cx, sg.y0 - cy + o * 2, sg.x1 - cx, sg.y1 - cy + o * 2, k, fl)); }
    } }); }
    /* tuyệt chiêu: chuỗi tia nảy qua CHÍNH các mảnh gương của Nữ Hoàng (mảnh vẽ ở vòng vẽ mảnh) */
    const U = ST.ult;
    if (U && U.ph === 'grid') out.push({ y: 1e8 + 1, f: () => {
      if (!U.on) {   /* báo trước: vạch mờ VẼ DẦN theo chuỗi */
        g.save(); g.globalAlpha = 0.38; g.lineWidth = 1; g.setLineDash([3, 3]); const prog = Math.min(1, (U.warnT || 0) / (U_WARN * 0.8)) * U.segs.length;
        U.segs.forEach((sg, k) => { const f2 = Math.max(0, Math.min(1, prog - k)); if (f2 <= 0) return; g.strokeStyle = sg.col === 'w' ? '#e8dcff' : SPEC[[0, 1, 2, 3, 4, 6][sg.col] ?? 0]; g.beginPath(); g.moveTo(Math.round(sg.x0 - cx), Math.round(sg.y0 - cy)); g.lineTo(Math.round(sg.x0 + (sg.x1 - sg.x0) * f2 - cx), Math.round(sg.y0 + (sg.y1 - sg.y0) * f2 - cy)); g.stroke(); }); g.restore();
      } else U.segs.forEach((sg, k) => { const tk = (U.onT || 0) - k * U_HOP; if (tk <= 0) return; drawRay(g, { x0: sg.x0, y0: sg.y0, x1: sg.x1, y1: sg.y1, col: sg.toQ ? 2 : sg.col === 'w' ? 'w' : [0, 1, 2, 3, 4, 6][sg.col], t: tk, grow: 0.12, life: U_ON - k * U_HOP - 0.12, fade: 0.12, bright: true, seed: k * 7.3 }, cx, cy); });   /* tia đổi màu theo màu mảnh vừa nảy */
      for (const tr of U.trail) for (let c2 = 0; c2 < 7; c2 += 2) drawRay(g, { x0: tr.x0, y0: tr.y0 + (c2 - 3), x1: tr.x1, y1: tr.y1 + (c2 - 3), col: c2, t: 0.2, grow: 0.1, life: 1, fade: 1, seed: c2, noTip: true }, cx, cy);
    } });
    /* Nữ Hoàng lúc vỡ (ngoài lúc đó monsters vẽ qua drawFn) */
    if (ST.burst && ST.q) { const B = ST.burst, Q = ST.q; out.push({ y: B.y, f: () => drawQ(g, Q, B.x - cx, B.y - cy) }); }
    if (ST.death && ST.death.E && ST.death.t < 0.6) { const D = ST.death; out.push({ y: D.y, f: () => drawGhost(g, D.E, D.x - cx, D.y - cy, 'brightness(2.4)', 1 - D.t / 0.6, 0) }); }
    return out;
  },
  draw(g, ctx, cx, cy) {
    if (!inGm(ctx)) return;
    const b = ST.boss, sh = ST.sh, mk = img('ui/hacrocky/target.png');   /* dấu mục tiêu TĨNH (PixelLab) trên đầu kẻ đang bị nhắm */
    if (b && mk && ST.introDone && !ST.ult && !ST.won) { const q = tgPos(ctx, ST.tgt) || ctx.S.player, isR = ST.tgt === 'r' && q !== ctx.S.player, pt = rk(ctx), hh = isR ? (pt && pt.superT > 0 ? 28 : 18) : 28, w = mk.naturalWidth / 2, h = mk.naturalHeight / 2; g.save(); g.imageSmoothingEnabled = false; g.drawImage(mk, Math.round(q.x - cx - w / 2), Math.round(q.y - cy - hh - h), w, h); g.restore(); }
    void sh;
  },
  drawUI(ug, ctx, cx, cy, scale) {
    if (!inGm(ctx) || ctx.S.mode !== 'play') return; const W = ug.canvas.width, H = ug.canvas.height, t = L(ctx), b = ST.boss || ST.sh, isSh = !!b && b === ST.sh;
    const font = px2 => `${Math.round(px2)}px VT323, monospace`;
    let yb = 60;
    if (b && !(ST.boss && ST.boss.intro > 0)) {
      const fr = img('ui/guong/bossbar.png'), narrow = W < 560, low = H < 460, bw0 = narrow ? W * 0.92 : Math.min(low ? W * 0.44 : W * 0.9, 430, Math.max(300, W * 0.4)), BB = bossBarBox(ug, bw0, bw0 * 94 / 648 + 26), bw = BB.w, bh = bw * 94 / 648, bx = BB.x, by = BB.y, tcx = BB.cx;   /* tránh nút HUD */
      const ix = bx + bw * 137 / 648, iy = by + bh * 26 / 94, iw = bw * (565 - 137) / 648, ih = bh * 34 / 94, k = Math.max(0, b.hp / b.max);
      ug.save(); ug.imageSmoothingEnabled = false; if (fr) ug.drawImage(fr, bx, by, bw, bh); else { ug.fillStyle = '#140a24'; ug.fillRect(ix, iy, iw, ih); }
      const gr = ug.createLinearGradient(0, iy, 0, iy + ih); gr.addColorStop(0, ST.exposed > 0 ? '#ffffff' : isSh ? '#d8c8ff' : '#cfe6ff'); gr.addColorStop(1, ST.exposed > 0 ? '#ffb0e0' : isSh ? '#6a4ab0' : '#7a6ad0'); ug.fillStyle = gr; ug.fillRect(ix, iy, iw * k, ih);
      ug.fillStyle = 'rgba(255,255,255,.2)'; ug.fillRect(ix, iy, iw * k, Math.max(1, ih * 0.22));
      const fs = Math.max(14, bh * 0.32); ug.font = font(fs); ug.textAlign = 'center'; ug.textBaseline = 'top';
      const nm = isSh ? (narrow ? `${t.ph2name} · ${t.phase(2)}` : `${t.ph2name} · ${t.ph2sub} · ${t.phase(2)}`) : (narrow ? `${t.name} · ${t.phase(1)}` : `${t.name} · ${t.sub} · ${t.phase(1)}`);
      ug.fillStyle = '#000'; ug.fillText(nm, tcx + 1, by + bh + 1, bw); ug.fillStyle = ST.exposed > 0 ? '#ffffff' : '#e8dcff'; ug.fillText(nm, tcx, by + bh, bw);
      yb = by + bh + fs + 6;
      if (!isSh && ST.boss) {   /* thứ tự cầu vồng: 6 ảnh mảnh gương — mảnh đã vỡ mờ, mảnh cần đập tiếp có khung sáng */
        const sz = Math.round(Math.max(18, Math.min(30, bw / 14))), gap = Math.round(sz * 0.35), tw = 6 * sz + 5 * gap, x0 = Math.round(tcx - tw / 2);
        for (let i = 0; i < 6; i++) { const im = SHARD(i), x = x0 + i * (sz + gap), done = i < ST.next || ST.exposed > 0; if (i === ST.next && !(ST.exposed > 0)) { ug.fillStyle = HEX[i]; ug.globalAlpha = 0.85; ug.fillRect(x - 2, yb - 2, sz + 4, sz + 4); ug.globalAlpha = 1; ug.fillStyle = '#140a24'; ug.fillRect(x, yb, sz, sz); } if (im) { ug.globalAlpha = done ? 0.25 : 1; ug.drawImage(im, x, yb, sz, sz); ug.globalAlpha = 1; } if (i < 5) { ug.fillStyle = '#e8dcff'; ug.font = font(sz * 0.6); ug.fillText('›', x + sz + gap / 2, yb + sz * 0.15); } }
        yb += sz + 4; const fs2 = Math.max(13, bh * 0.28); ug.font = font(fs2);
        const tip = ST.exposed > 0 ? t.exposedT(Math.ceil(ST.exposed)) : !shardsHome() ? t.shardsAway : t.order;
        ug.fillStyle = '#000'; ug.fillText(tip, tcx + 1, yb + 1, bw); ug.fillStyle = ST.exposed > 0 ? '#fff6c8' : '#e8dcff'; ug.fillText(tip, tcx, yb, bw); yb += fs2 + 4;
      }
      ST.uiTop = yb; ST.uiTopL = yb / Math.max(1, scale); ug.restore();
    }
    if (ST.banner) {
      const a = Math.min(1, ST.banner.t * 2), fs = Math.max(20, Math.min(W / 18, scale * 8.5)); ug.save(); ug.globalAlpha = a; ug.font = font(fs); ug.textAlign = 'center'; ug.textBaseline = 'middle';
      const y = Math.max(H * 0.24, yb + fs * 0.8); const tw = Math.min(W - 10, ug.measureText(ST.banner.txt).width + 24); ug.fillStyle = 'rgba(14,8,30,.7)'; ug.fillRect((W - tw) / 2, y - fs * 0.6, tw, fs * 1.2);
      ug.fillStyle = '#000'; ug.fillText(ST.banner.txt, W / 2 + 2, y + 2, W - 16); ug.fillStyle = '#efe6ff'; ug.fillText(ST.banner.txt, W / 2, y, W - 16); ug.restore();
    }
  },
};

/* móc test (QA) */
function hooks(ctx) {
  return {
    st: () => { const b = ST.boss, s = ST.sh; return { phase: ST.won ? 'won' : ST.death ? 'death' : s ? 'shadow' : ST.burst ? 'burst' : b ? 'queen' : '-', inGm: inGm(ctx), open: riftOpen(ctx), road: roadOk(ctx), rkLv: rkLv(ctx),
      boss: b ? { x: Math.round(b.x), y: Math.round(b.y), hp: Math.round(b.hp), max: b.max, phase: b.phase, intro: b.intro > 0, act: b.act && b.act.k, stun: +(b.stunT || 0).toFixed(2) } : null,
      sh: s ? { x: Math.round(s.x), y: Math.round(s.y), hp: Math.round(s.hp), max: s.max, act: s.act && s.act.k, face8: s.face8 || null } : null, sh8n: ST.sh8n || 0, s8: !!S8,
      next: ST.next, alive: ST.shards.map(q => q.alive), exposed: +ST.exposed.toFixed(2), lance: ST.lance && ST.lance.ph, soul: ST.soul && { t: +ST.soul.t.toFixed(2), x: Math.round(ST.soul.x || 0), y: Math.round(ST.soul.y || 0), hits: ST.soul.hits }, warp: ST.warp && ST.warp.ph,
      ult: ST.ult && { ph: ST.ult.ph, pat: ST.ult.pat, on: ST.ult.on, hits: ST.ult.hits, turned: ST.ult.M.filter(m => m.turned).length }, refl: ST.refl.length, lastRefl: ST.lastRefl ? { n: ST.lastRefl.n, din: ST.lastRefl.din, dout: ST.lastRefl.dout, at: ST.lastRefl.at, kind: ST.lastRefl.kind, hitP: ST.lastRefl.hitP, hitR: ST.lastRefl.hitR, segs: ST.lastRefl.segs.length } : null, lastFire: ST.lastFire,
      tgt: ST.tgt, tgtLog: { ...ST.tgtLog }, won: ST.won, stats: JSON.parse(JSON.stringify(ST.stats)), save: { ...sv(ctx) }, log: ST.log.slice(-20), t: +ST.t.toFixed(1), tele: ST.tele.map(q => q.type), qmeta: !!QM, uiTopL: ST.uiTopL, q: ST.q && { clip: ST.q.clip, dir: ST.q.dir, alpha: ST.q.alpha, hidden: !!ST.q.hidden } }; },
    hold: v => { const b = ST.boss; if (b && b.intro > 0) { b.intro = 0.001; } ST.hold = !!v; if (b) b.act = null; if (v) ST.cd = { lance: 999, soul: 999, warp: 999, bolt: 999, sweep: 999, ult: 999 }; },
    free: () => { ST.hold = false; ST.cd = { lance: 999, soul: 999, warp: 999, bolt: 999, sweep: 999, ult: 999 }; ST.ultAt = []; ST.lastUlt = 1e9; },
    live: () => { ST.hold = false; ST.cd = { lance: 3, soul: 8, warp: 6, bolt: 1, sweep: 0, ult: 24 }; ST.ultAt = [0.6, 0.25]; ST.lastUlt = 0; },
    cd: o => Object.assign(ST.cd, o), place: (x, y) => { const b = ST.boss; if (b) { b.x = x; b.y = y; } }, orb: a => { ST.orbA = a; }, orbSpeed: v => { ORB.sp = v; },
    skip: () => skipIntro(ctx), shard: k => (k >= 0 && k < 6 ? shardPos(k) : null), hitShard: k => hitShard(ctx, k), swingShard: k => { ST.swingCd = 0; const q = shardPos(k); swingAt(ctx, { shard: k, x: q.x, y: q.y }); },
    expose: s => expose(ctx, s || EXPOSE_T, 'test'), mirrors: () => mirrors(ctx).map(m => ({ kind: m.kind, k: m.k, x0: m.x0, y0: m.y0, x1: m.x1, y1: m.y1, nx: m.nx, ny: m.ny, cx: m.cx, cy: m.cy, r: m.r })),
    filter: (ox, oy, deg, len) => haFilter(ctx, ox, oy, deg * Math.PI / 180, len || 160, 10, 5),
    lance: () => { const b = ST.boss; if (b) { b.act = null; startLance(ctx, b, ctx.S.player); } }, lanceInfo: () => ST.lance && { cx: ST.lance.cx, cy: ST.lance.cy, A: ST.lance.A, rot: ST.lance.rot, ph: ST.lance.ph }, shardFly: () => ST.shards.map(S => S.fly && { x: Math.round(S.fly.x), y: Math.round(S.fly.y) }),
    soul: () => { const b = ST.boss; if (b) { b.act = null; startSoul(ctx, b); } }, histAt: dt => { const h = histAt(ST.t - dt); return h && { x: Math.round(h.x), y: Math.round(h.y) }; },
    warp: () => { const b = ST.boss; if (b) { b.act = null; startWarp(ctx, b, ctx.S.player); } }, warpInfo: () => ST.warp && { ph: ST.warp.ph, x: ST.warp.x, y: ST.warp.y },
    sweep: () => { const b = ST.boss; if (b) { b.act = null; start(ctx, b, 'sweep', ctx.S.player); } }, bolt: () => { const b = ST.boss; if (b) { b.act = null; start(ctx, b, 'bolt', ctx.S.player); } },
    ult: () => { const b = ST.boss; if (b) { b.act = null; startUlt(ctx, b); } }, ultM: () => ST.ult && ST.ult.M.map(m => ({ i: m.i, k: m.k, x: Math.round(m.x), y: Math.round(m.y), turned: m.turned, face: +m.face.toFixed(2) })), ultSegs: () => ST.ult && ST.ult.segs.map(s => ({ x0: Math.round(s.x0), y0: Math.round(s.y0), x1: Math.round(s.x1), y1: Math.round(s.y1), toQ: !!s.toQ, to: s.to ? s.to.i : null })), ultChain: () => ST.ult && { chain: ST.ult.chain.slice(), pat: ST.ult.pat, on: ST.ult.on, safe: ST.ult.safe.slice(), aim: ST.ult.aim }, hop: () => { const b = ST.boss; if (b) { b.act = null; startHop(ctx, b); } }, hopInfo: () => ST.hop && { ph: ST.hop.ph, done: ST.hop.done, n: ST.hop.n }, skills: () => ST.skills.slice(), cds: () => Object.fromEntries(Object.entries(ST.cd).map(([k, v]) => [k, +Math.max(0, v).toFixed(2)])), skillT: () => ST.skillT.slice(), watch: () => ST.watch.slice(), shOut: () => S_OUT(), shardsOut: () => ST.shards.map(S => S.fly && S.fly.out ? { k: S.k, x: Math.round(S.fly.x), y: Math.round(S.fly.y), back: !!S.fly.back } : null), safeNow: () => { const U = ST.ult; return U ? safeInfo(ctx, U.segs, ctx.S.player) : null; },
    turn: i => { const U = ST.ult; return U ? turnMirror(ctx, U.M[i]) : false; }, swingMirror: i => { const U = ST.ult; ST.swingCd = 0; if (U) swingAt(ctx, { mirror: U.M[i], x: U.M[i].x, y: U.M[i].y }); },
    setHp: f => { const b = ST.boss || ST.sh; if (b) b.hp = Math.max(1, Math.round(b.max * f)); }, kill: () => { const b = ST.boss || ST.sh; if (b) ctx.monsters.kill(b); },
    shDo: k => { const m = ST.sh; if (!m) return; m.act = null; m.cd[k === 'dash' ? 'dash' : 'slash'] = 0; }, shPlace: (x, y) => { const m = ST.sh; if (m) { m.x = x; m.y = y; m.act = null; } }, shHold: v => { ST.hold = !!v; },
    boss: () => ST.boss, shadow: () => ST.sh,
    shPose: (d8, mode) => { const m = ST.sh; if (!m) return null; const E = m.E, card = { south: 0, west: 1, east: 2, north: 3 }; m.face8 = d8; E.x = m.x; E.y = m.y; const a = { east: 0, 'south-east': 1, south: 2, 'south-west': 3, west: 4, 'north-west': 5, north: 6, 'north-east': 7 }[d8] * Math.PI / 4; E.faceTo(m.x + Math.cos(a) * 10, m.y + Math.sin(a) * 10); E.moving = mode !== 'idle' && mode !== 'slash'; if (mode === 'slash' && E.hasAct('attack')) E.act('attack', 0); m.act = null; return { dir: E.dir, sheetSame: E.sheet.width === ctx.S.player.sheet.width && E.sheet.height === ctx.S.player.sheet.height, acts: Object.keys(E.sheet.actions || {}).join(',') === Object.keys(ctx.S.player.sheet.actions || {}).join(',') }; }, tgt: w => { ST.tgt = w; ST.tgtT = 0; },
  };
}
