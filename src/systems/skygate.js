/* skygate.js — 2026-10-14 (anh): CỔNG TRỜI mới = xoáy sương bão khổng lồ trên biển mây trời M9 (thay vòm đá + mây hoạt hình).
   Không phải hệ (không đăng ký index.js) — sky.js gọi:
     drawSkyGate(g, ctx, { x, y, cx, cy, state, t, near })   lớp sau mọi thứ (đĩa xoáy nằm trên biển mây, người bay ngang qua)
     drawSkyGateFront(g, ctx, { x, y, cx, cy, state, t })    lớp trên người chơi (chỉ dùng trong cảnh vào cổng)
     playGateEnter(ctx, onDone, { rk, lift })                cảnh hút người + Rocky vào xoáy → onDone() (đổi vùng)
     skyGateState(ctx)                                       'locked' | 'open' | 'calm'
   x, y = gatePos(map) (điểm bấm E). Tâm xoáy nằm cao hơn 26 px; tượng Lyron (x + 44, y + 34) ở ngoài mép dưới-phải.
   Ảnh: assets/px/zones/sky/gate/ — PixelLab (tools/px-skygate.py): storm.png (xoáy bão), mist.png / mist2.png (tay xoáy sương),
   bolts.png (vfx_workbench sg_core_bolts, 12 khung 71×83), pull.png (vfx_workbench sg_enter_pull, 18 khung 104×103).
   Xoáy / sương là LỚP SƯƠNG MỀM (được xoay + hoà trộn lúc chạy, như fogTint của sky.js); sét + hạt sáng vẽ 1:1 không co giãn. */
import { fogTint } from './sky.js';

const DIR = 'assets/px/zones/sky/gate/';
const IM = {};
function img(n) { let i = IM[n]; if (!i) { i = new Image(); i.src = DIR + n + '.png'; IM[n] = i; } return i.complete && i.naturalWidth ? i : null; }
const TAU = Math.PI * 2, FLAT = 0.62, LIFT = 26;
const BOSSES = ['hacrocky', 'trongdong', 'guong', 'hoden', 'dongho'];

/* bảng màu theo trạng thái: khoá = xám tím tối, mở = tím bão sáng, yên = vàng nhạt */
const PAL = {
  locked: { tint: 'rgb(92,90,112)', tk: 0.62, mist: 'rgb(200,198,214)', core: 'rgb(214,212,226)', halo: 'rgb(84,82,104)', spin: 0.05, alpha: 0.78, coreA: 0.35 },
  open: { tint: 'rgb(150,86,255)', tk: 0.34, mist: 'rgb(236,224,255)', core: 'rgb(248,240,255)', halo: 'rgb(62,44,112)', spin: 0.16, alpha: 0.95, coreA: 0.85 },
  calm: { tint: 'rgb(255,190,80)', tk: 0.55, mist: 'rgb(255,238,200)', core: 'rgb(255,240,190)', halo: 'rgb(214,172,104)', spin: 0.07, alpha: 0.72, coreA: 0.8 },
};
const TC = {};
function tinted(n, col, k) {   /* bản tô màu (tạo 1 lần): giữ alpha + sáng tối của ảnh, phủ màu k */
  const src = img(n); if (!src) return null; if (!col) return src; const key = n + col + k; if (TC[key]) return TC[key];
  const c = document.createElement('canvas'); c.width = src.naturalWidth; c.height = src.naturalHeight; const x = c.getContext('2d');
  x.drawImage(src, 0, 0); x.globalCompositeOperation = 'source-atop'; x.globalAlpha = k; x.fillStyle = col; x.fillRect(0, 0, c.width, c.height);
  x.globalCompositeOperation = 'saturation'; x.globalAlpha = 0.5 * k; x.fillStyle = '#808080'; x.fillRect(0, 0, c.width, c.height);
  x.globalCompositeOperation = 'destination-in'; x.globalAlpha = 1; x.drawImage(src, 0, 0); return (TC[key] = c);
}

export function skyGateState(ctx) {
  const s = ctx.S.save || {}, ly = (s.sys || {}).lyron;
  if (ly && ly.stage === 'done') return 'calm';
  return (s.badges || []).includes(9) && BOSSES.every(b => (s.achievements || []).includes(b)) ? 'open' : 'locked';
}

const ST = { ang: 0, last: 0, mix: null, bolt: -1, boltAt: 0, boltX: 0, boltY: 0, wasNear: false, enter: null };
const radius = ctx => Math.max(72, Math.min(104, (ctx.VW || 640) * 0.41));

function disc(g, im, cxp, cyp, size, ang, a, op) {   /* lớp sương tròn xoay quanh tâm, ép dẹt theo góc nhìn */
  if (!im || a <= 0) return; g.save(); g.translate(cxp, cyp); g.scale(1, FLAT); g.rotate(ang); g.globalAlpha = a; if (op) g.globalCompositeOperation = op;
  g.drawImage(im, -size / 2, -size / 2, size, size); g.restore();
}
function puff(g, i, col, x, y, w, h, a) { const im = fogTint(i % 4, col); if (!im || a <= 0) return; g.globalAlpha = a; g.drawImage(im, x - w / 2, y - h / 2, w, h); g.globalAlpha = 1; }

export function drawSkyGate(g, ctx, o) {
  const st = o.state || 'open', P = PAL[st] || PAL.open, R = radius(ctx), cxp = o.x - o.cx, cyp = o.y - LIFT - o.cy;
  if (cxp < -R * 2 || cxp > ctx.VW + R * 2 || cyp < -R * 2 || cyp > ctx.VH + R * 2) return;
  const now = performance.now() / 1000, dt = ST.last ? Math.min(0.1, now - ST.last) : 0; ST.last = now;
  const E = ST.enter, boost = E ? Math.min(3, 1 + (now - E.t0) * 2.2) : 1;
  ST.ang += dt * P.spin * boost * (o.near && st === 'open' ? 1.35 : 1);
  const A = ST.ang, sm = g.imageSmoothingEnabled; g.imageSmoothingEnabled = true;
  /* 0. bóng sâu: xoáy là một 'hố' trên biển mây → nền tối mềm cho nổi khối */
  puff(g, 0, P.halo, cxp, cyp, R * 2.5, R * 2.5 * FLAT, 0.42);
  /* 1. quầng sương tối quanh mép: 8 khối fog xoay chậm → mép xoáy tan vào biển mây */
  for (let i = 0; i < 8; i++) { const a = -A * 0.6 + i * TAU / 8, rr = R * 0.92; puff(g, i, P.halo, cxp + Math.cos(a) * rr, cyp + Math.sin(a) * rr * FLAT, R * 1.05, R * 0.62, 0.26); }
  /* 2. thân xoáy bão + 2 lớp tay sương (tốc độ khác nhau → cảm giác cuộn vào trong) */
  disc(g, tinted('storm', P.tint, P.tk), cxp, cyp, R * 2.15, -A, P.alpha);
  disc(g, tinted('mist2', P.tint, P.tk), cxp, cyp, R * 1.9, -A * 1.35 + 1.1, 0.38, 'screen');
  disc(g, tinted('mist', P.tint, P.tk), cxp, cyp, R * 1.62, -A * 1.9 + 0.4, st === 'locked' ? 0.3 : 0.55, 'screen');
  /* 3. lõi sáng thở chậm (chu kỳ 5 s) */
  const br = 0.82 + 0.18 * Math.sin(now * TAU / 5), bl = ST.bolt >= 0 ? 0.35 : 0;
  g.save(); g.globalCompositeOperation = 'screen';
  puff(g, 2, P.core, cxp, cyp, R * 1.1, R * 1.1 * FLAT, P.coreA * br * 0.8 + bl);
  puff(g, 1, '#ffffff', cxp, cyp, R * 0.55, R * 0.55 * FLAT, P.coreA * br + bl);
  g.restore();
  puff(g, 3, '#ffffff', cxp, cyp, R * 0.3, R * 0.3 * FLAT, (st === 'locked' ? 0.25 : 0.7) * br);
  /* 4. cột sáng mờ hướng lên (cổng dẫn lên tầng trên) — mở/yên */
  if (st !== 'locked') { g.save(); g.globalCompositeOperation = 'screen'; puff(g, 3, P.core, cxp, cyp - R * 0.55, R * 0.42, R * 1.25, 0.22 * br); g.restore(); }
  g.imageSmoothingEnabled = false;
  /* 5. hạt sáng: đã có sẵn trên tay sương mist.png (bỏ lớp hạt charge_up riêng — chấm lõi xám lộ giữa xoáy) */
  /* 6. sét trong lõi: chỉ khi có sự kiện (ngẫu nhiên 5–9 s, hoặc lúc người vừa bay tới gần), 1 lượt ~0,9 s */
  if (st === 'open') {
    if (o.near && !ST.wasNear) ST.boltAt = 0; ST.wasNear = !!o.near;
    if (ST.bolt < 0 && now >= ST.boltAt) { ST.bolt = 0; ST.boltT = now; ST.boltX = (Math.random() - 0.5) * R * 0.5; ST.boltY = (Math.random() - 0.5) * R * 0.25; ST.boltAt = now + 5 + Math.random() * 4; if (o.near && ctx.sfx) try { ctx.sfx('zap'); } catch (e) { /* không có tiếng */ } }
    const bolts = img('bolts');
    if (ST.bolt >= 0) { const f = Math.floor((now - ST.boltT) * 12); if (f >= 11) ST.bolt = -1; else if (bolts) { g.globalAlpha = f > 8 ? 0.5 : 0.95; g.drawImage(bolts, f * 71, 0, 71, 83, Math.round(cxp + ST.boltX - 35), Math.round(cyp + ST.boltY - 44), 71, 83); g.globalAlpha = 1; } }
  } else { ST.bolt = -1; ST.wasNear = false; }
  g.imageSmoothingEnabled = true;
  /* 7. khoá: màn sương xám phủ kín lõi + chữ nhỏ khi tới gần */
  if (st === 'locked') {
    for (let i = 0; i < 5; i++) { const a = A * 0.4 + i * TAU / 5; puff(g, i + 1, 'rgb(206,204,218)', cxp + Math.cos(a) * R * 0.22, cyp + Math.sin(a) * R * 0.22 * FLAT, R * 0.9, R * 0.5, 0.42); }
    if (o.near) { g.imageSmoothingEnabled = sm; const vi = !ctx.lang || ctx.lang() === 'vi', s = vi ? 'Cổng Trời đang khoá' : 'The Sky Gate is sealed'; g.font = '8px monospace'; g.textAlign = 'center'; g.fillStyle = 'rgba(30,26,46,.6)'; const w = g.measureText(s).width + 8; g.fillRect(Math.round(cxp - w / 2), Math.round(cyp - 6), Math.round(w), 11); g.fillStyle = '#e8e4f4'; g.fillText(s, Math.round(cxp), Math.round(cyp + 2)); g.textAlign = 'left'; }
  }
  g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.imageSmoothingEnabled = sm;
}

/* lớp trên người chơi: chỉ khi đang vào cổng — sương cuốn quanh người (+ Rocky), hạt sáng hút vào tâm, bừng sương trắng tím */
export function drawSkyGateFront(g, ctx, o) {
  if (!ST.enter && ST.hold && performance.now() / 1000 < ST.hold) { g.fillStyle = 'rgb(244,238,255)'; g.fillRect(0, 0, ctx.VW, ctx.VH); return; }   /* giữ màn trắng tới khi đổi vùng (khỏi lộ lại cảnh cũ trước màn chuyển) */
  const E = ST.enter; if (!E) return; const now = performance.now() / 1000, k = now - E.t0, p = ctx.S.player, sm = g.imageSmoothingEnabled, L = E.lift;
  const cxp = o.x - o.cx, cyp = o.y - LIFT - o.cy; g.imageSmoothingEnabled = true;
  const wrap = Math.min(1, Math.max(0, (k - 0.2) / 0.8));   /* sương cuộn kín dần quanh người + Rocky (che bằng sương, không co sprite) */
  const who = [[p.x, p.y - L]]; if (E.rk && E.rk.x > -999) who.push([E.rk.x, E.rk.y - L]);
  for (const [wx, wy] of who) { const px = wx - o.cx, py = wy - o.cy;
    for (let i = 0; i < 7; i++) { const a = -k * 4.6 + i * TAU / 7, r = 16 * (1 - wrap * 0.6); puff(g, i, i % 2 ? 'rgb(232,222,255)' : 'rgb(176,152,228)', px + Math.cos(a) * r, py + Math.sin(a) * r * 0.75, 40 + wrap * 14, 32 + wrap * 10, 0.92 * wrap); } }
  const pull = img('pull'); if (pull) { const f = Math.floor((k - 0.15) * 14); if (f >= 1 && f < 12) { g.imageSmoothingEnabled = false; g.globalAlpha = 0.85; g.drawImage(pull, f * 104, 0, 104, 103, Math.round(cxp - 52), Math.round(cyp - 52), 104, 103); g.globalAlpha = 1; g.imageSmoothingEnabled = true; } }   /* chỉ khung hạt hút (bỏ vòng loé hoạt hình) */
  const bloom = Math.min(1, Math.max(0, (k - 0.85) / 0.45));   /* sương trắng tím bừng ra từ tâm xoáy rồi phủ kín màn */
  if (bloom > 0) { const R = radius(ctx) * (0.6 + bloom * 3.2); for (let i = 0; i < 6; i++) { const a = i * TAU / 6 + k; puff(g, i, i % 2 ? '#ffffff' : 'rgb(226,212,255)', cxp + Math.cos(a) * R * 0.3, cyp + Math.sin(a) * R * 0.2, R * 1.4, R * 1.0, Math.min(1, bloom * 1.4)); } }
  const wh = Math.min(1, Math.max(0, (k - 1.15) / 0.3));
  if (wh > 0) { g.globalAlpha = wh; g.fillStyle = 'rgb(244,238,255)'; g.fillRect(0, 0, ctx.VW, ctx.VH); g.globalAlpha = 1; }
  g.imageSmoothingEnabled = sm;
}

/* cảnh vào cổng ~1,6 s: camera đứng yên, người xoắn ốc vào tâm xoáy (Rocky theo sau nếu sky.js đưa opt.rk = ST.rk), sương cuốn kín, bừng trắng → onDone
   opt.rk: đối tượng Rocky đang bay (có x, y) — được kéo theo; opt.lift: tâm thân người cao hơn p.y bao nhiêu khi bay (px logic, mặc định 32 = liftNow() ≈ 19 ở 850 m + nửa thân 12) */
export function playGateEnter(ctx, onDone, opt = {}) {
  if (ST.enter) return false; const S = ctx.S, p = S.player, m = S.map, gp = { x: (m.w >> 1) * 16 + 8, y: 9 * 16 + 8 }, lift = opt.lift == null ? 32 : opt.lift, C = { x: gp.x, y: gp.y - LIFT + lift };
  const rk = opt.rk && opt.rk.with !== false && opt.rk.x > -999 ? opt.rk : null, P0 = { x: p.x, y: p.y }, R0 = rk ? { x: rk.x, y: rk.y } : null, cam0 = { dx: S.camDX || 0, dy: S.camDY || 0 };
  const pol = q => ({ r: Math.max(16, Math.hypot(q.x - C.x, q.y - C.y)), a: Math.atan2(q.y - C.y, q.x - C.x) }), pp = pol(P0), pr = R0 ? pol(R0) : null, t0 = performance.now() / 1000;
  ST.enter = { t0, rk, lift };
  try { ctx.setMode('cutscene'); } catch (e) { /* bỏ */ } if (ctx.sfx) try { ctx.sfx('gate_open'); } catch (e) { /* bỏ */ } if (ctx.quake) try { ctx.quake(0.25); } catch (e) { /* bỏ */ }
  const at = (q, u) => { const e = u * u * (3 - 2 * u), r = q.r * (1 - e), a = q.a - e * 5.2; return { x: C.x + Math.cos(a) * r, y: C.y + Math.sin(a) * r * 0.8 }; };
  const step = () => {
    const k = performance.now() / 1000 - t0, u = Math.min(1, k / 1.2), w = at(pp, u);
    p.x = w.x; p.y = w.y; p.dir = Math.floor(k * 10) % 4;   /* xoay tròn theo xoáy */
    S.camDX = cam0.dx + (P0.x - p.x); S.camDY = cam0.dy + (P0.y - p.y);   /* camera đứng yên: thấy người bị cuốn vào tâm */
    if (rk && pr) { const v = at(pr, Math.max(0, Math.min(1, (k - 0.12) / 1.2))); rk.x = v.x; rk.y = v.y; }
    if (k < 1.55) return requestAnimationFrame(step);
    ST.enter = null; ST.hold = performance.now() / 1000 + 2.5; S.camDX = cam0.dx; S.camDY = cam0.dy; try { if (S.mode === 'cutscene') ctx.setMode('play'); } catch (e) { /* bỏ */ }
    if (onDone) onDone();
  };
  requestAnimationFrame(step); return true;
}
export const skyGateEntering = () => !!ST.enter;
