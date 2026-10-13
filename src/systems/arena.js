// arena.js — 2026-10-11 anh: Sàn Đấu Ngầm (vùng 'arena', world.js buildArena) — chỗ đấu tập riêng, tách khỏi lối vào Làng.
//  · Vật thể: cột đá chậu lửa, bao cát, giá tạ, hình nhân gỗ, ghế, bóng khán giả (zones/arena.json) + biển chỉ đường ở Làng (zones/village.json)
//    — ảnh PixelLab td8 hướng nam (tools/px-arena.py). Ảnh gói là 2× → cỡ logic = ½ ảnh; chân vật (ô cứng) khớp đúng phần ảnh (anh báo kẹt cạnh cột).
//    Bản vẽ code dưới đây chỉ dự phòng khi chưa tải ảnh.
//  · Anh 2026-10-11: đấu tự do khắp sàn (không giới hạn vòng); văng / húc / giáng trúng đồ ở đâu thì đồ đó HƯ → ĐỔ NÁT (ảnh PixelLab riêng của từng
//    vật, manifest.ruins — tools/px-arena-fx.py), đổ nát thì đi xuyên được; cột lửa đổ thì tắt lửa (khói PixelLab arena_fireout).
//    Chỗ rơi mạnh để lại hố cát / vết nứt đá (PixelLab spar/fx/crater_*). Rời vùng rồi quay lại = Sàn Đấu Ngầm dựng lại nguyên vẹn (bản đồ dựng mới mỗi lần vào).
//  · Cột lửa (anh duyệt hiệu ứng lặp nhẹ): ngọn lửa PixelLab arena_flame 9 fps (mỗi cột lệch khung), quầng sáng ấm tĩnh dưới đất (thở ±5 %, không nháy),
//    thỉnh thoảng vài đốm than bay lên (arena_embers, thưa).
//  · Trong sàn / đang đấu: Rocky không giành phím E (ctx.petHush); đang đấu thì Rocky ra ngồi chờ ở mép sàn (ctx.petWait → pet.js).
import { obj as defObj } from '../gfx.js';
import { ART } from '../art.js';

const px = (g, x, y, c, w = 1, h = 1) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
const half = fn => g => { g.save(); g.scale(0.5, 0.5); fn(g); g.restore(); };   /* bản dự phòng vẽ ở toạ độ 2× */
defObj('arena_pillar', 16, 32, 1, 1, half(g => { px(g, 8, 20, '#3a3440', 16, 44); px(g, 10, 22, '#6a6470', 12, 40); px(g, 5, 12, '#2a2026', 22, 9); }));
defObj('arena_bag', 16, 24, 1, 1, half(g => { px(g, 2, 2, '#4a3324', 28, 4); px(g, 3, 2, '#4a3324', 3, 46); px(g, 26, 2, '#4a3324', 3, 46); px(g, 10, 12, '#8a1f1f', 12, 26); }));
defObj('arena_weights', 24, 16, 1, 1, half(g => { px(g, 2, 18, '#4a3324', 44, 4); px(g, 2, 12, '#9a9aa0', 44, 3); px(g, 4, 6, '#2a2a30', 5, 14); px(g, 39, 6, '#2a2a30', 5, 14); }));
defObj('arena_dummy', 16, 24, 1, 1, half(g => { px(g, 11, 6, '#7a5230', 10, 42); px(g, 4, 16, '#7a5230', 8, 3); px(g, 20, 16, '#7a5230', 8, 3); }));
defObj('arena_bench', 24, 16, 1, 1, half(g => { px(g, 2, 14, '#5a3a20', 44, 6); px(g, 5, 20, '#4a3324', 3, 12); px(g, 40, 20, '#4a3324', 3, 12); }));
defObj('arena_crowd', 32, 24, 2, 1, half(g => { for (const x of [6, 26, 46]) { px(g, x, 10, '#1c1424', 12, 26); px(g, x + 3, 2, '#1c1424', 7, 8); } px(g, 0, 30, '#4a3324', 64, 4); }));
defObj('arena_door', 24, 24, 2, 1, half(g => { px(g, 2, 8, '#3a3440', 44, 40); px(g, 8, 16, '#120e18', 32, 32); }), { solid: false });   /* (không còn dùng — anh bỏ cửa) */
defObj('arena_sign', 16, 16, 1, 1, half(g => { px(g, 7, 14, '#4a3324', 3, 18); px(g, 1, 4, '#2a1a10', 22, 12); px(g, 2, 5, '#a07040', 20, 10); px(g, 8, 7, '#c03030', 7, 6); }));

const TS = 16;
const BREAK = { arena_pillar: 2, arena_bag: 2, arena_weights: 2, arena_dummy: 2, arena_bench: 1, arena_crowd: 2, crate: 1, crystal_p: 2, crystal_b: 2, hexpillar: 3, td_pillar: 3, td_stele: 2, gm_pillar: 3, gm_shelf: 2 };   /* plan-30 trùm 3: cột gương / kệ sách sân Gương (rift3) — ảnh hư + đổ nát PixelLab (tools/px-guong-env.py ruin) */   /* plan-30 trùm 2: cột đồng / bệ thu lôi sân Trống Đồng (rift2) — ảnh hư + đổ nát PixelLab riêng (tools/px-td-ruin.py) */   /* plan-30: cột pha lê / cột lục giác trong Khe Nứt (rift1) — ảnh hư + đổ nát PixelLab sẵn của gói m9 */   /* số cú mạnh để đổ nát (cú ≥ 1.2 tính 2) */
const ST = { decals: [], embers: [], smokes: [], imgs: {}, t: 0, emberT: 2, walls: new Map(), wallFx: 0 };
const isA = ctx => !!(ctx.S.zone && (ctx.S.zone.id === 'arena' || ctx.S.zone.rift));   /* plan-30: Khe Nứt Hắc Rocky dùng chung vách nứt / vật vỡ của Sàn Đấu Ngầm */
const inRing = ctx => { const m = ctx.S.map, r = m && m.sparRing, p = ctx.S.player; return !!(r && p && Math.hypot(p.x - r.x, p.y - r.y) < r.r + 8); };
const VFX = n => ART.vfx && ART.vfx[n];
function img(src) { if (!ST.imgs[src]) { const i = new Image(); i.src = 'assets/px/' + src; ST.imgs[src] = i; } const i = ST.imgs[src]; return i.complete && i.naturalWidth ? i : null; }
const hash = o => ((o.x * 73856093) ^ (o.y * 19349663)) >>> 0;
function sheetFrame(g, sh, f, x, y) { const hi = sh.img.__hi ? 1 : 2; g.drawImage(sh.img, f * sh.w * hi, 0, sh.w * hi, sh.h * hi, Math.round(x - sh.w / 2), Math.round(y - sh.h), sh.w, sh.h); }
const fireTop = o => ({ x: o.x * TS + 8, y: (o.y + 1) * TS - 25 });   /* miệng chậu lửa trên đỉnh cột (ảnh cột 16×32 logic) */

function ruin(ctx, o) {   /* đổ nát: ảnh PixelLab 'ruin' của chính vật (main.js ruinStage → ART.ruinOf), đi xuyên được */
  const m = ctx.S.map; o.orig = o.orig || o.type; o.ruined = true; o.hp = 0;
  const d = { fw: o.type === 'arena_crowd' ? 2 : 1, fh: 1 }; for (let j = 0; j < d.fh; j++) for (let i = 0; i < d.fw; i++) ctx.setSolid(m, o.x + i, o.y + j, 0);
  if (o.type === 'arena_pillar') { const f = fireTop(o); if (ctx.vfx) ctx.vfx('arena_fireout', f.x, f.y + 6, 0, true); ctx.sfx('knock_whoosh'); }   /* lửa tắt: phụt khói */
  if (ctx.vfx) ctx.vfx('rock_debris', o.x * TS + 8, (o.y + 1) * TS - 4); ctx.sfx('smash'); if (ctx.quake) ctx.quake(0.14);
}
/* 2026-10-11 anh: VÁCH HANG nứt khi bị đập vào ('cho chất'). Vách = ô T.DARK (ảnh PixelLab wang 'cavewall' zones/arena/wang/w3).
   3 nấc ảnh PixelLab (zones/arena/wall/crack_1..3 = phần edit_image đã sửa so với ô vách gốc — tools/px-arena-wall.py): nứt chân chim → nứt sâu → vỡ toác có hố;
   nấc 3 thêm đống đá vụn (wall/rubble) ở chân vách phía sàn. Điểm cú: lực < 1 → 1 · < 1,25 → 1,5 · còn lại 2,2; nấc = điểm ≥ 4 → 3 · ≥ 2 → 2 · > 0 → 1.
   Mỗi cú: bụi + sỏi rơi (VFX vfx_workbench arena_wall_dust) + rung nhẹ — chỉ theo sự kiện. Vách vẫn cứng. Vẽ ở drawGround (dưới mọi nhân vật). Vào lại vùng = lành. */
const WALL_IMG = ['', 'zones/arena/wall/crack_1.png', 'zones/arena/wall/crack_2.png', 'zones/arena/wall/crack_3.png'], RUBBLE = 'zones/arena/wall/rubble.png';
const isWall = (ctx, m, tx, ty) => tx >= 0 && ty >= 0 && tx < m.w && ty < m.h && ctx.getG(m, tx, ty) === ctx.T.DARK && ctx.isSolid(m, tx, ty);
const isFloor = (ctx, m, tx, ty) => tx >= 0 && ty >= 0 && tx < m.w && ty < m.h && !ctx.isSolid(m, tx, ty);
function wallHit(ctx, x, y, power) {
  const m = ctx.S.map, X = Math.floor(x / TS), Y = Math.floor(y / TS); let best = null, bd = 15;
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    const tx = X + dx, ty = Y + dy; if (!isWall(ctx, m, tx, ty)) continue;
    const cx = Math.max(tx * TS, Math.min((tx + 1) * TS, x)), cy = Math.max(ty * TS, Math.min((ty + 1) * TS, y)), d = Math.hypot(x - cx, y - cy);
    const face = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => isFloor(ctx, m, tx + a, ty + b));   /* ưu tiên ô vách giáp sàn (mặt vách) */
    if (d - (face ? 2 : 0) < bd) { bd = d - (face ? 2 : 0); best = { tx, ty }; }
  }
  if (!best) return null;
  const k = best.tx + ',' + best.ty; let c = ST.walls.get(k);
  if (!c) { c = { x: best.tx, y: best.ty, pts: 0, stage: 0, hits: 0, flip: (hash({ x: best.tx, y: best.ty }) & 1) === 1, fl: null }; ST.walls.set(k, c); }
  c.fl = c.fl || [[0, 1], [1, 0], [-1, 0], [0, -1]].map(([a, b]) => ({ x: c.x + a, y: c.y + b })).find(q => isFloor(ctx, m, q.x, q.y)) || null;   /* ô sàn trước mặt vách (chỗ đá vụn rơi) */
  const st0 = c.stage; c.hits++; c.pts += power < 1 ? 1 : power < 1.25 ? 1.5 : 2.2; c.stage = c.pts >= 4 ? 3 : c.pts >= 2 ? 2 : 1; c.t = 0;
  const fx = c.fl ? (c.x + c.fl.x) / 2 * TS + 8 : c.x * TS + 8, fy = c.fl ? (c.y + c.fl.y) / 2 * TS + 8 : c.y * TS + 8;   /* mép vách giáp sàn */
  if (ctx.vfx && ctx.vfx('arena_wall_dust', fx, fy + 10, 0, true)) ST.wallFx++;
  if (ctx.quake) ctx.quake(0.06 + 0.04 * c.stage);
  if (c.stage === 3 && st0 < 3) { ctx.sfx('smash'); if (ctx.vfx) ctx.vfx('rock_debris', fx, fy + 6); }
  return c;
}
function impact(ctx, x, y, power, kind) {   /* knock.js (văng trúng tường / rơi xuống) + spar.js (húc, giáng) gọi */
  if (!isA(ctx)) return 0; const m = ctx.S.map; let n = 0;
  if (kind === 'wall') wallHit(ctx, x, y, power);
  for (const o of m.objects) {
    if (o.ruined || !BREAK[o.type]) continue; const fw = o.type === 'arena_crowd' ? 2 : 1;
    const cx = Math.max(o.x * TS, Math.min((o.x + fw) * TS, x)), cy = Math.max(o.y * TS, Math.min((o.y + 1) * TS, y));
    if (Math.hypot(x - cx, y - cy) > (kind === 'land' ? 10 : 14)) continue;
    o.hpMax = BREAK[o.type]; o.hp = (o.hp ?? o.hpMax) - (power >= 1.2 ? 2 : 1); n++;
    if (o.hp <= 0) ruin(ctx, o); else { if (ctx.vfx) ctx.vfx('dirt_puff', o.x * TS + 8, (o.y + 1) * TS - 4); ctx.sfx('knock_wall'); }   /* hư (ảnh 'dmg') */
  }
  if (kind !== 'wall' && power >= 1) {   /* rơi mạnh / giáng: hố cát hoặc vết nứt đá ở chỗ chạm đất (lớp nền) */
    const t = m.ground[Math.floor(y / TS) * m.w + Math.floor(x / TS)], sand = t === 5 || t === 8;
    ST.decals.push({ x, y: y + 2, im: sand ? 'spar/fx/crater_sand.png' : 'spar/fx/crater_stone.png', s: 0.5 + Math.min(0.3, (power - 1) * 0.4), t: 0 }); if (ST.decals.length > 12) ST.decals.shift();
  }
  return n;
}
export const arena = {
  id: 'arena',
  onZoneEnter(ctx) {
    ST.decals = []; ST.embers = []; ST.t = 0; ST.walls = new Map(); ST.wallFx = 0;   /* vào lại vùng: vách lành */
    ctx.inArena = () => isA(ctx);
    ctx.arenaImpact = (x, y, power = 1, kind = 'land') => impact(ctx, x, y, power, kind);
    ctx.petHush = () => isA(ctx) && (inRing(ctx) || !!(ctx.sparOn && ctx.sparOn()));   /* pet.js: trong sàn / đang đấu → không mời 'Vuốt ve / Nhận từ Rocky' */
    ctx.petWait = () => {   /* pet.js: đang có trận → Rocky ra ngồi chờ ở mép sàn */
      if (!isA(ctx) || !(ctx.sparOn && ctx.sparOn())) return null; const s = ctx.S.map.petSpot; return s ? { x: s.x * 16 + 8, y: s.y * 16 + 12 } : null;
    };
    if (typeof window !== 'undefined') window.__arena = { inRing: () => inRing(ctx), ring: () => ctx.S.map && ctx.S.map.sparRing, promoter: () => ctx.S.map && ctx.S.map.promoter, petSpot: () => ctx.S.map && ctx.S.map.petSpot,
      impact: (x, y, pw, k) => impact(ctx, x, y, pw, k), decals: () => ST.decals.length,
      walls: () => [...ST.walls.values()].map(c => ({ x: c.x, y: c.y, stage: c.stage, hits: c.hits, pts: +c.pts.toFixed(1), solid: ctx.isSolid(ctx.S.map, c.x, c.y) })), wallFx: () => ST.wallFx, props: () => ctx.S.map.objects.filter(o => BREAK[o.type]).map(o => ({ type: o.type, x: o.x, y: o.y, hp: o.hp ?? null, ruined: !!o.ruined, solid: ctx.isSolid(ctx.S.map, o.x, o.y) })) };
  },
  update(dt, ctx) {
    if (!isA(ctx)) return; ST.t += dt;
    for (const d of ST.decals) d.t += dt; ST.decals = ST.decals.filter(d => d.t < 14);   /* hố / vết nứt mờ dần rồi mất sau ~14 s */
    for (const e of ST.embers) e.t += dt; ST.embers = ST.embers.filter(e => { const sh = VFX('arena_embers'); return sh && e.t * (sh.fps || 8) < sh.n; });
    if ((ST.emberT -= dt) <= 0) {   /* thưa: cứ 2,5–5 s một cột bất kỳ (đang trong màn hình) bay vài đốm than */
      ST.emberT = 2.5 + Math.random() * 2.5; const ps = ctx.S.map.objects.filter(o => o.type === 'arena_pillar' && !o.ruined);
      if (ps.length) { const o = ps[Math.floor(Math.random() * ps.length)], f = fireTop(o); ST.embers.push({ x: f.x, y: f.y - 4, t: 0 }); }
    }
  },
  drawGround(g, ctx, cx, cy) {
    if (!isA(ctx)) return;
    for (const d of ST.decals) { const im = img(d.im); if (!im) continue; const w = im.naturalWidth * d.s, h = im.naturalHeight * d.s; g.globalAlpha = 0.9 * Math.min(1, (14 - d.t) / 4); g.drawImage(im, Math.round(d.x - cx - w / 2), Math.round(d.y - cy - h / 2), Math.round(w), Math.round(h)); g.globalAlpha = 1; }
    for (const c of ST.walls.values()) {   /* vết nứt vách (ảnh 32 px không __hi → vẽ kèm cỡ đích 16×16) + đá vụn ở chân vách (nấc 3) */
      const sx = c.x * TS - cx, sy = c.y * TS - cy; if (sx < -32 || sy < -32 || sx > ctx.VW + 32 || sy > ctx.VH + 32) continue;
      const im = img(WALL_IMG[c.stage]); if (im) { if (c.flip) { g.save(); g.translate(sx + TS, sy); g.scale(-1, 1); g.drawImage(im, 0, 0, 16, 16); g.restore(); } else g.drawImage(im, sx, sy, 16, 16); }
      const spr = c.stage >= 3 && c.fl && img(WALL_IMG[1]);   /* vỡ toác: vết nứt lan sang 2 ô vách hai bên dọc mặt vách */
      if (spr) for (const s of (c.fl.x !== c.x ? [-1, 1].map(d => ({ x: c.x, y: c.y + d })) : [-1, 1].map(d => ({ x: c.x + d, y: c.y })))) {
        const o2 = ST.walls.get(s.x + ',' + s.y); if ((o2 && o2.stage >= 1) || !isWall(ctx, ctx.S.map, s.x, s.y)) continue;
        g.save(); g.globalAlpha = 0.85; g.translate(s.x * TS - cx + (s.x + s.y) % 2 * TS, s.y * TS - cy); if ((s.x + s.y) % 2) g.scale(-1, 1); g.drawImage(spr, 0, 0, 16, 16); g.restore();
      }
      const rb = c.stage >= 3 && c.fl && img(RUBBLE);
      if (rb) { const ox = (c.fl.x - c.x) * 9, oy = (c.fl.y - c.y) * 9; g.drawImage(rb, Math.round(sx + ox), Math.round(sy + oy + (c.fl.y < c.y ? -4 : 0)), 16, 16); }
    }
    const br = 1 + 0.05 * Math.sin(ST.t * 1.3);   /* quầng sáng ấm dưới chân cột: tĩnh, chỉ 'thở' rất chậm ±5 % */
    g.save(); g.globalCompositeOperation = 'lighter';
    for (const o of ctx.S.map.objects) {
      if (o.type !== 'arena_pillar' || o.ruined) continue; const x = o.x * TS + 8 - cx, y = (o.y + 1) * TS - 4 - cy, r = 34 * br;
      if (x < -60 || y < -60 || x > ctx.VW + 60 || y > ctx.VH + 60) continue;
      const gr = g.createRadialGradient(x, y, 2, x, y, r); gr.addColorStop(0, 'rgba(255,150,60,.22)'); gr.addColorStop(1, 'rgba(255,120,40,0)');
      g.fillStyle = gr; g.beginPath(); g.ellipse(x, y, r, r * 0.6, 0, 0, 7); g.fill();
    }
    g.restore();
  },
  drawables(ctx, cx, cy) {
    if (!isA(ctx)) return []; const out = [], g = ctx.g, fl = VFX('arena_flame'), em = VFX('arena_embers');
    if (fl) for (const o of ctx.S.map.objects) {
      if (o.type !== 'arena_pillar' || o.ruined) continue; const f = fireTop(o), off = hash(o) % fl.n;
      out.push({ y: (o.y + 1) * TS + 0.5, f: () => sheetFrame(g, fl, (Math.floor(ST.t * (fl.fps || 9)) + off) % fl.n, f.x - cx, f.y - cy + 2) });   /* ngay trên ảnh cột */
    }
    if (em) for (const e of ST.embers) out.push({ y: e.y + 40, f: () => sheetFrame(g, em, Math.min(em.n - 1, Math.floor(e.t * (em.fps || 8))), e.x - cx, e.y - cy) });
    return out;
  },
};
