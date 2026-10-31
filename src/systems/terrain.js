/* terrain.js — 2026-10-14 (anh): GÓI KỸ NĂNG THEO ĐỊA HÌNH cho trùm bay đuổi theo (dùng chung — Vua Rết / Bakunawa là trùm đầu tiên).
   Trùm gọi ctx.terrain.pick(ad) → tên kỹ năng hợp địa hình dưới chân người chơi / trùm (hoặc null), ctx.terrain.start(name, ad), rồi mỗi khung ctx.terrain.tick(dt, ad)
   → { done, head: {x, y, z} } (tư thế đầu trùm mong muốn). ad = adapter của trùm: { head(), hurtP(frac, src, react, pw, key), hurtR(frac, src, kb, kind), stun(s), dmg(f), hitN(), banner(txt), name }.
   ĐỊA HÌNH (terrainAt): water (biển / ao) · sand (bãi cát) · forest (rừng — nhiều cây quanh) · rock (đèo / đá) · village (Làng / nhà) · under (dưới biển) · sky (trời) · plain.
   KỸ NĂNG (mỗi chiêu có báo trước rõ, hiệu ứng CHỈ lúc sự kiện; ảnh = VFX PixelLab vfx_workbench tr_* + ảnh vật thật của game):
     · BIỂN: 'plunge' Lao Xuống Biển (cột nước + sóng vòng lan ra hất lùi, cát ướt sẫm một lúc) · 'spout' Vòi Rồng (hút cột nước 1,8 s — đánh trùm ≥ 3 phát = NGẮT:
       nước đổ ụp lên nó, choáng; không ngắt → pháo nước + 3 quả cầu nước) · 'seabolt' Sét Xuống Biển (điện lan khắp vùng nước nối liền: ai đứng / bơi / trên bè dưới
       nước bị giật + choáng, ĐỨNG TRÊN CÁT KHÔ thì an toàn; cá choáng nhảy lên bờ = nhặt được, Rocky tự chộp 1 con; trùm đang lơ lửng trên vùng nước đó cũng tự lãnh sét).
     · DƯỚI BIỂN: 'whirl' Xoáy Nước hút vào tâm · 'bubbles' Phun Bong Bóng (nón) · 'uwshock' Sét Lan Khắp Nước (nấp sát đá / vách = an toàn) · 'silt' Bùn Đục (tầm nhìn tối 5 s).
     · RỪNG: 'uproot' Nhổ Cây Ném (cây đổ thật + chính ảnh cây bay tới) · 'blaze' Sét Đốt Rừng (cây cháy 6 s đốt MỌI THỨ đứng sát — kể cả trùm; cháy xong còn gốc).
     · CÁT: 'burrow' Độn Thổ (gợn cát bám theo người rồi trồi lên ngay dưới chân) · 'sandstorm' Bão Cát (tầm nhìn hẹp 6 s) · 'glass' Sét Hoá Thuỷ Tinh (gai thuỷ tinh 8 s, giẫm bị đâm; tan ra rơi 'Thuỷ tinh sét').
     · ĐÈO / ĐÁ: 'rockslide' Lở Đá (đuôi đập vách → đá lăn xuống, bóng báo trước). · LÀNG: 'hurl' Quăng Đồ (chộp xe / thùng / rào… ném) · 'roof' Đập Phá (quầy, giếng, bảng, chuồng… — đuôi gai quật nát).
     · THỜI TIẾT: ban đêm → Nhật Thực tối lâu hơn, sét mạnh hơn (trùm đọc ctx.terrain.night()).
   Dân bỏ chạy la hét khi trùm tới vùng có dân (flee); bị trúng thì KO (aircombat.js). */
import { ART } from '../art.js';
import { T } from '../gfx.js';
import { smashObj, solidObjAt } from './blast.js';
import { fogTint } from './sky.js';

const TS = 16, TAU = Math.PI * 2;
const STR = {
  vi: { plunge: 'Lao Xuống Biển!', spout: 'VÒI RỒNG — hút nước! Đánh ngắt (3 đòn)!', spoutCut: 'NGẮT! Cột nước đổ ụp lên nó!', cannon: 'Pháo Nước!', seabolt: 'SÉT XUỐNG BIỂN — lên chỗ CÁT KHÔ!', shocked: 'Bị giật điện!', selfZap: 'Nó tự lãnh sét của mình!',
    fish: n => `Cá choáng nhảy lên bờ (${n})!`, rkFish: 'Rocky chộp được 1 con cá!', whirl: 'Xoáy Nước!', bubbles: 'Phun Bong Bóng!', uwshock: 'SÉT LAN KHẮP NƯỚC — nấp sát đá!', silt: 'Bùn đục mù mịt!',
    uproot: 'Nhổ Cây Ném!', blaze: 'Sét Đốt Rừng!', burnBoss: 'Lửa cháy cả vào nó!', burrow: 'Độn Thổ — gợn cát đang đuổi theo bạn!', sandstorm: 'BÃO CÁT!', glass: 'Sét Hoá Thuỷ Tinh!', rockslide: 'Lở Đá!', hurl: 'Quăng Đồ!', roof: 'Đập Phá Nhà Cửa!', flee: 'Cứu với!' },
  en: { plunge: 'Sea Plunge!', spout: 'WATERSPOUT — it sucks the sea! Interrupt it (3 hits)!', spoutCut: 'INTERRUPTED! The water crashes onto it!', cannon: 'Water Cannon!', seabolt: 'SEA LIGHTNING — get onto DRY SAND!', shocked: 'Shocked!', selfZap: 'It got hit by its own lightning!',
    fish: n => `Stunned fish leap ashore (${n})!`, rkFish: 'Rocky snatched a fish!', whirl: 'Whirlpool!', bubbles: 'Bubble Breath!', uwshock: 'LIGHTNING THROUGH THE WATER — hide by a rock!', silt: 'Murky silt!',
    uproot: 'Uprooted Tree Throw!', blaze: 'Forest Fire Bolt!', burnBoss: 'The fire burns it too!', burrow: 'Burrow — a sand ripple is chasing you!', sandstorm: 'SANDSTORM!', glass: 'Glass Lightning!', rockslide: 'Rockslide!', hurl: 'Hurl!', roof: 'Wrecking Slam!', flee: 'Help!' },
};
const L = ctx => STR[ctx.lang() === 'vi' ? 'vi' : 'en'];
const say = (ctx, txt) => { if (ctx.bkCallout) ctx.bkCallout(txt); else ctx.toast(txt); };   /* 2026-10-14: trong trận trùm mọi câu báo đi qua 1 ô callout duy nhất (không chồng chữ) */
const VX = n => ART.vfx && ART.vfx[n];
const WOODY = /^(tree|palm|pine|pine_s|deadtree)$/;
const HURLABLE = /cart|barrel|crate|hay|box|bench|stall|fence|post|sign|lamp|pot|basket|log/;
const zid = ctx => (ctx.S.zone && ctx.S.zone.id) || '';
const tileOf = (m, x, y) => { const tx = Math.floor(x / TS), ty = Math.floor(y / TS); return tx >= 0 && ty >= 0 && tx < m.w && ty < m.h ? m.ground[ty * m.w + tx] : 0; };
const isWaterT = t => t === T.WATER || t === T.DEEP || t === T.REEF;
const isSandT = t => t === T.SAND || t === T.SAND2;
const isRockT = t => t === T.STONE || t === T.ROCK || t === T.GRAVEL || t === T.CRACKG || t === T.CRACKD;
const TS_ = { act: null, haz: [], fx: [], proj: [], fishes: [], wet: [], fires: [], storm: 0, silt: 0, shockP: 0, cd: {}, stats: { skills: {}, shocked: 0, safe: 0, selfZap: 0, fish: 0, rkFish: 0, cut: 0, burnBoss: 0, flee: 0, glass: 0 }, log: [], ctx: null };
const log = s => { TS_.log.push(Math.round(((TS_.ctx && TS_.ctx.S.time) || 0) * 10) / 10 + ' ' + s); if (TS_.log.length > 60) TS_.log.shift(); };
const SOFT = { tr_splash: 'tr_splash_px', tr_sand: 'tr_sand_soft', tr_silt: 'tr_silt_soft', tr_spout: 'tr_spout_soft', ac_dustring: 'ac_dustsoft' };   /* 2026-10-14 anh: hiệu ứng môi trường MỀM (bản mờ Gauss của VFX PixelLab) */
function fx(name, x, y, o = {}) { const s = VX(SOFT[name]) || VX(name); if (!s) return false; TS_.fx.push({ s, x, y, t: 0, dur: o.dur || s.n / (s.fps || 12), rev: !!o.rev, hold: o.hold, alpha: o.alpha || 1, top: !!o.top, scr: !!o.scr }); return true; }
function sheetAt(g, s, f, x, y, alpha = 1, piv = 'c') { if (!s || !s.img) return; const hi = s.img.__hi ? 1 : 2; f = Math.max(0, Math.min(s.n - 1, f)); g.save(); g.imageSmoothingEnabled = false; g.globalAlpha = alpha;
  const anc = piv === 'c' && s.ax != null && s.ay != null, ox = anc ? -s.ax : -s.w / 2, oy = anc ? -s.ay : piv === 'b' ? -s.h : -Math.round(s.h / 2); g.drawImage(s.img, f * s.w * hi, 0, s.w * hi, s.h * hi, Math.round(x + ox), Math.round(y + oy), s.w, s.h);   /* sheet có gốc (sét trời td_sky: gốc ở chân tia) → đặt đúng gốc */
  if (anc && f < 4 && s.h > 200) { g.globalCompositeOperation = 'lighter'; g.globalAlpha = alpha * 0.6; g.drawImage(s.img, f * s.w * hi, 0, s.w * hi, s.h * hi, Math.round(x + ox), Math.round(y + oy), s.w, s.h); }
  g.restore(); }

/* ---------------- địa hình ---------------- */
function treesNear(ctx, x, y, r) { const m = ctx.S.map, out = []; for (const o of m.objects) { if (o.ghost || o.ruined || !WOODY.test(o.type)) continue; const ox = o.x * TS + 8, oy = o.y * TS + 8; if (Math.hypot(ox - x, oy - y) < r) out.push(o); } return out; }
export function terrainAt(ctx, x, y) {
  const m = ctx.S.map; if (!m) return 'plain'; if (m.air || m.sky) return 'sky'; if (ctx.isUnderwater && ctx.isUnderwater()) return 'under';
  const t = tileOf(m, x, y), z = zid(ctx);
  if (isWaterT(t) || (ctx.S.sea && ctx.S.sea.riding) || ctx.S.swimming) return 'water';
  if (isSandT(t)) return 'sand';
  if (z === 'village') return 'village';
  if (treesNear(ctx, x, y, 90).length >= 3 || z === 'm3') return 'forest';
  if (isRockT(t) || /^road[1-9]$/.test(z) || z === 'm4' || z === 'm5' || z === 'm8') return 'rock';
  return 'plain';
}
function waterNear(ctx, x, y, r) {   /* điểm nước gần nhất (≤ r) */
  const m = ctx.S.map; let best = null, bd = 1e9; const tx0 = Math.floor(x / TS), ty0 = Math.floor(y / TS), R = Math.ceil(r / TS);
  for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) { const tx = tx0 + dx, ty = ty0 + dy; if (tx < 0 || ty < 0 || tx >= m.w || ty >= m.h) continue; if (!isWaterT(m.ground[ty * m.w + tx])) continue; const d = Math.hypot(dx, dy); if (d < bd) { bd = d; best = { x: tx * TS + 8, y: ty * TS + 8 }; } }
  return best && bd * TS <= r ? best : null;
}
function landNear(ctx, x, y) { const m = ctx.S.map; for (let r = 0; r < 8; r++) for (let a = 0; a < 8; a++) { const px = x + Math.cos(a * TAU / 8) * r * TS, py = y + Math.sin(a * TAU / 8) * r * TS, t = tileOf(m, px, py); if (!isWaterT(t) && !ctx.isSolid(m, Math.floor(px / TS), Math.floor(py / TS))) return { x: px, y: py }; } return null; }
function waterRegion(ctx, x, y, maxR = 200, cap = 500) {   /* vùng nước NỐI LIỀN quanh điểm sét (BFS, giới hạn bán kính) */
  const m = ctx.S.map, sx = Math.floor(x / TS), sy = Math.floor(y / TS), set = new Set(), q = [[sx, sy]];
  if (!isWaterT(tileOf(m, x, y))) return set;
  set.add(sy * m.w + sx);
  while (q.length && set.size < cap) { const [cx, cy] = q.shift(); for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = cx + a, ny = cy + b, k = ny * m.w + nx; if (nx < 0 || ny < 0 || nx >= m.w || ny >= m.h || set.has(k)) continue; if (!isWaterT(m.ground[k])) continue; if (Math.hypot(nx * TS - x, ny * TS - y) > maxR) continue; set.add(k); q.push([nx, ny]); } }
  return set;
}
const inRegion = (m, set, x, y) => set.has(Math.floor(y / TS) * m.w + Math.floor(x / TS));
const playerWet = (ctx, set) => { const p = ctx.S.player, m = ctx.S.map; return inRegion(m, set, p.x, p.y) || !!ctx.S.swimming || !!(ctx.S.sea && (ctx.S.sea.riding || ctx.S.sea.diving)); };

/* ---------------- chọn chiêu ---------------- */
const SK = {
  water: [['seabolt', 14, 80], ['spout', 16, 70], ['plunge', 9, 60]],
  under: [['uwshock', 15, 80], ['whirl', 11, 70], ['bubbles', 7, 55], ['silt', 18, 40]],
  forest: [['blaze', 15, 75], ['uproot', 9, 65]],
  sand: [['burrow', 10, 75], ['glass', 14, 65], ['sandstorm', 22, 50]],
  rock: [['rockslide', 10, 70]],
  village: [['hurl', 8, 70], ['roof', 14, 50]],
};
function pick(ctx, ad) {
  const p = ctx.S.player, H = ad.head(); if (!H || TS_.act) return null;
  let ter = terrainAt(ctx, p.x, p.y); if (ter === 'plain' || ter === 'sky') { const t2 = terrainAt(ctx, H.x, H.y); if (t2 !== 'plain' && t2 !== 'sky') ter = t2; }
  if (ter === 'plain' && waterNear(ctx, p.x, p.y, 110)) ter = 'water';   /* bờ biển: người đứng trên cát cạnh nước → vẫn dùng chiêu biển */
  const L0 = SK[ter]; if (!L0) return null;
  const ok = L0.filter(([k]) => (TS_.cd[k] || 0) <= 0 && can(ctx, k, ad)).sort((a, b) => b[2] - a[2]);
  return ok.length ? ok[0][0] : null;
}
function can(ctx, k, ad) {
  const p = ctx.S.player, H = ad.head();
  if (k === 'plunge' || k === 'seabolt') return !!waterNear(ctx, p.x, p.y, 120);
  if (k === 'spout') return !!waterNear(ctx, H.x, H.y, 140) || !!waterNear(ctx, p.x, p.y, 100);
  if (k === 'uproot') return treesNear(ctx, H.x, H.y, 170).length > 0 || treesNear(ctx, p.x, p.y, 140).length > 0;
  if (k === 'blaze') return treesNear(ctx, p.x, p.y, 110).length > 0;
  if (k === 'hurl') return !!hurlTarget(ctx, H);
  if (k === 'roof') return !!houseNear(ctx, p.x, p.y, 260);
  return true;
}
function hurlTarget(ctx, H) { let best = null, bd = 170; for (const o of ctx.S.map.objects) { if (o.ghost || o.ruined || !HURLABLE.test(o.type)) continue; const d = Math.hypot(o.x * TS + 8 - H.x, o.y * TS + 8 - H.y); if (d < bd) { bd = d; best = o; } } return best; }
function houseNear(ctx, x, y, r) { let best = null, bd = r; for (const o of ctx.S.map.objects) { if (o.ghost || o.ruined || !/house|hut|home|shop|hall|inn|stall|well|fountain|board|coop|craft_bench|campfire/.test(o.type)) continue; const d = ctx.O[o.type] || { fw: 1, fh: 1 }, cx = (o.x + d.fw / 2) * TS, cy = (o.y + d.fh / 2) * TS, dd = Math.hypot(cx - x, cy - y); if (dd < bd) { bd = dd; best = o; } } return best; }

/* ---------------- bắt đầu chiêu ---------------- */
const thr = (ctx, o) => { if (ctx.threat && ctx.threat.add) { try { ctx.threat.add(o); } catch (e) { /* bỏ qua */ } } };   /* Ki: khai báo vòng rơi có báo trước */
function start(ctx, k, ad) {
  if (!ad.head() || !can(ctx, k, ad)) { log('cannot ' + k); return null; }   /* thiếu mục tiêu (không cây / không nhà / không nước) → không ra chiêu */
  const p = ctx.S.player, H = ad.head(), t = L(ctx), A = { k, t: 0, hits0: ad.hitN ? ad.hitN() : 0 }; TS_.act = A; TS_.cd[k] = (SK_CD[k] || 10); TS_.stats.skills[k] = (TS_.stats.skills[k] || 0) + 1; log('start ' + k);
  if (ad.banner && t[k]) ad.banner(t[k]); ctx.sfx('spar_charge');
  setTimeout(() => {   /* sau khi A đã gán toạ độ (cuối hàm) → khai báo vòng trúng cho Ki */
    if (TS_.act !== A) return; const id0 = 'tr_' + k + '_' + Math.round(ctx.S.time * 10);
    if (k === 'plunge') thr(ctx, { id: id0, kind: 'slam', from: { x: A.x, y: A.y - 60 }, to: { x: A.x, y: A.y - 6 }, in: Math.max(0.1, A.T - A.t), radius: 26 });
    else if (k === 'blaze') thr(ctx, { id: id0, kind: 'bolt', from: { x: A.x, y: A.y - 80 }, to: { x: A.x, y: A.y - 6 }, in: Math.max(0.1, A.T - A.t), radius: 40 });
    else if (k === 'glass') A.pts.forEach((q, i) => thr(ctx, { id: id0 + '_' + i, kind: 'bolt', from: { x: q.x, y: q.y - 80 }, to: { x: q.x, y: q.y - 6 }, in: Math.max(0.1, A.T - A.t), radius: 14 }));
    else if (k === 'rockslide') A.rocks.forEach((r, i) => thr(ctx, { id: id0 + '_' + i, kind: 'slam', from: { x: r.x, y: r.y - 60 }, to: { x: r.x, y: r.y - 6 }, in: Math.max(0.1, r.at - A.t), radius: 15 }));
    else if (k === 'seabolt') thr(ctx, { id: id0, kind: 'bolt', from: { x: A.x, y: A.y - 80 }, to: { x: A.x, y: A.y - 6 }, in: Math.max(0.1, A.T - A.t), radius: 40 });
  }, 0);
  if (k === 'plunge') { const w = waterNear(ctx, p.x, p.y, 120) || { x: p.x, y: p.y }; Object.assign(A, { x: w.x, y: w.y, T: 1.0, dur: 2.2 }); }
  else if (k === 'spout') { const w = waterNear(ctx, H.x, H.y, 140) || waterNear(ctx, p.x, p.y, 100) || { x: H.x, y: H.y }; Object.assign(A, { x: w.x, y: w.y, T: 1.8, dur: 3.4 }); }
  else if (k === 'seabolt') { const w = waterNear(ctx, p.x, p.y, 120) || { x: p.x, y: p.y }; Object.assign(A, { x: w.x, y: w.y, T: 1.3, dur: 2.4, region: waterRegion(ctx, w.x, w.y) }); }
  else if (k === 'whirl') Object.assign(A, { x: p.x + 20, y: p.y + 10, T: 0.7, dur: 3.8 });
  else if (k === 'bubbles') Object.assign(A, { T: 0.8, dur: 1.8, a: Math.atan2(p.y - H.y, p.x - H.x) });
  else if (k === 'uwshock') Object.assign(A, { T: 1.6, dur: 2.4 });
  else if (k === 'silt') Object.assign(A, { T: 0.4, dur: 1.2 });
  else if (k === 'uproot') { const tr = treesNear(ctx, H.x, H.y, 170).concat(treesNear(ctx, p.x, p.y, 140)).sort((a, b) => Math.hypot(a.x * TS - H.x, a.y * TS - H.y) - Math.hypot(b.x * TS - H.x, b.y * TS - H.y))[0]; Object.assign(A, { o: tr, x: tr.x * TS + 8, y: tr.y * TS + 12, tx: p.x, ty: p.y, T: 0.9, dur: 2.0 }); }
  else if (k === 'blaze') { const tr = treesNear(ctx, p.x, p.y, 110)[0]; Object.assign(A, { x: tr.x * TS + 8, y: tr.y * TS + 12, T: 1.1, dur: 1.5 }); }
  else if (k === 'burrow') Object.assign(A, { x: H.x, y: H.y, T: 0.5, dur: 3.1, lockT: 2.1 });
  else if (k === 'sandstorm') Object.assign(A, { T: 0.3, dur: 1.0 });
  else if (k === 'glass') Object.assign(A, { T: 1.1, dur: 1.6, pts: [0, 1, 2].map(i => ({ x: p.x + Math.cos(i * 2.1 + Math.random()) * (i ? 40 : 6), y: p.y + Math.sin(i * 2.1 + Math.random()) * (i ? 30 : 4) })) });
  else if (k === 'rockslide') Object.assign(A, { T: 0.5, dur: 2.4, rocks: Array.from({ length: 6 }, (_, i) => ({ x: p.x + (Math.random() - 0.5) * 150, y: p.y + (Math.random() - 0.5) * 100, at: 0.6 + i * 0.22, done: false })).concat([{ x: p.x, y: p.y, at: 0.9, done: false }]) });
  else if (k === 'hurl') { const o = hurlTarget(ctx, H); Object.assign(A, { o, x: o.x * TS + 8, y: o.y * TS + 12, tx: p.x, ty: p.y, T: 0.8, dur: 1.9 }); }
  else if (k === 'roof') { const o = houseNear(ctx, p.x, p.y, 260); const d = ctx.O[o.type] || { fw: 2, fh: 2 }; Object.assign(A, { o, x: (o.x + d.fw / 2) * TS, y: (o.y + d.fh / 2) * TS, T: 0.9, dur: 1.6 }); }
  return A;
}
const SK_CD = { plunge: 9, spout: 16, seabolt: 14, whirl: 11, bubbles: 7, uwshock: 15, silt: 18, uproot: 9, blaze: 15, burrow: 10, glass: 14, sandstorm: 22, rockslide: 10, hurl: 8, roof: 14 };

/* ---------------- diễn chiêu (mỗi khung) ---------------- */
function areaHurt(ctx, ad, x, y, r, frac, key, react = 'stagger', pw = 1, smash = 0) {
  const p = ctx.S.player; let n = 0; if (Math.hypot(p.x - x, p.y - y) < r && ad.hurtP(frac, { x, y }, react, pw, key)) n++;
  const rp = ctx.rocky && ctx.rocky.pos && ctx.rocky.pos(); if (rp && Math.hypot(rp.x - x, rp.y - y) < r && ad.hurtR(frac, { x, y }, react === 'stagger' ? 40 : 62, react === 'fly' || react === 'launch' ? react : undefined)) n++;
  if (ctx.chase) ctx.chase.impact(x, y, r, { pw: smash || 2, src: { x, y } }); return n;
}
function shock(ctx, ad, who) {   /* giật điện: sát thương + choáng ngắn + nháy điện (VFX tr_shock 1 s) */
  const p = ctx.S.player;
  if (who === 'p') { if (ad.hurtP(0.08, { x: p.x, y: p.y - 10 }, 'stagger', 0.8, 'shock')) { if (ctx.stunPlayer) ctx.stunPlayer(1.0); TS_.shockP = 1.0; TS_.stats.shocked++; say(ctx, L(ctx).shocked); } }
  else { const rp = ctx.rocky && ctx.rocky.pos && ctx.rocky.pos(); if (rp && ad.hurtR(0.06, rp, 20)) fx(VX('bk_zap') ? 'bk_zap' : 'tr_shock', rp.x, rp.y - 10, { dur: 0.9 }); }
}
function tick(ctx, dt, ad) {
  const A = TS_.act; if (!A) return { done: true }; A.t += dt; const p = ctx.S.player, H = ad.head(), t = L(ctx), m = ctx.S.map; let head = null;
  switch (A.k) {
    case 'plunge': {   /* lao xuống: đầu vút lên rồi cắm xuống điểm nước */
      head = A.t < A.T ? { x: A.x, y: A.y - 10, z: 60 * (1 - A.t / A.T) + 10 } : { x: A.x, y: A.y, z: -30 };
      if (!A.hit && A.t >= A.T) { A.hit = true; fx('tr_splash', A.x, A.y - 30); ctx.sfx('smash'); if (ctx.quake) ctx.quake(0.25); areaHurt(ctx, ad, A.x, A.y, 26, 0.09, 'plunge', 'fly', 1.05, 3); A.R = 0; for (let k2 = 0; k2 < 18; k2++) TS_.wet.push({ x: A.x + (Math.random() - 0.5) * 180, y: A.y + (Math.random() - 0.5) * 130, t: 6 }); }
      if (A.hit) { A.R += dt * 150; if (!A.ringFx) { A.ringFx = true; fx(VX('bk_bigsplash') ? 'bk_bigsplash' : 'tr_ring', A.x, A.y, { dur: 1.0 }); }   /* sóng vòng lan ra: chạm vành sóng = lảo đảo + đẩy ra */
        for (const [who, e] of [['p', p], ['r', ctx.rocky && ctx.rocky.pos && ctx.rocky.pos()]]) { if (!e || A['w' + who] || A.R > 140) continue; const d = Math.hypot(e.x - A.x, e.y - A.y); if (Math.abs(d - A.R) < 12) { A['w' + who] = true; if (who === 'p') ad.hurtP(0.04, { x: A.x, y: A.y }, 'stagger', 1.2, 'wave'); else ad.hurtR(0.04, { x: A.x, y: A.y }, 45); } } }
      break; }
    case 'spout': {   /* hút nước: cột nước từ mặt biển lên miệng; đánh ≥ 3 đòn = ngắt */
      head = { x: A.x + 10, y: A.y + 6, z: 70 };
      if (!A.res && A.t < A.T && ad.hitN && ad.hitN() - A.hits0 >= 3) { A.res = 'cut'; A.rt = A.t; fx('tr_splash', H.x, H.y - 20); ad.stun(3.2); ad.dmg(0.035); TS_.stats.cut++; say(ctx, t.spoutCut, true); if (ctx.quake) ctx.quake(0.2); log('spout CUT'); }
      if (!A.res && A.t >= A.T) { A.res = 'fire'; A.rt = A.t; A.a = Math.atan2(p.y - A.y, p.x - A.x); say(ctx, t.cannon); ctx.sfx('whoosh_big');
        A.balls = [0, 1, 2].map(i => ({ x0: A.x, y0: A.y, x: p.x + (Math.random() - 0.5) * 70, y: p.y + (Math.random() - 0.5) * 50, t: -0.25 * i })); }
      if (A.res === 'fire') { const u = A.t - A.rt;
        if (!A.beamHit && u > 0.5) { A.beamHit = true; for (let i = 1; i <= 8; i++) { const bx = A.x + Math.cos(A.a) * i * 18, by = A.y + Math.sin(A.a) * i * 18; fx('tr_splash', bx, by - 20, { dur: 0.6 }); }
          const segD = (x, y) => { const dx = Math.cos(A.a), dy = Math.sin(A.a), u2 = Math.max(0, Math.min(150, (x - A.x) * dx + (y - A.y) * dy)); return Math.hypot(x - A.x - dx * u2, y - A.y - dy * u2); };
          if (segD(p.x, p.y) < 14) ad.hurtP(0.08, { x: A.x, y: A.y }, 'fly', 1.0, 'cannon'); const rp = ctx.rocky && ctx.rocky.pos && ctx.rocky.pos(); if (rp && segD(rp.x, rp.y) < 14) ad.hurtR(0.07, { x: A.x, y: A.y }, 60, 'fly'); }
        for (const b of A.balls) { b.t += dt; if (!b.done && b.t >= 0.9) { b.done = true; fx('tr_splash', b.x, b.y - 30, { dur: 0.7 }); areaHurt(ctx, ad, b.x, b.y, 18, 0.05, 'ball', 'stagger', 1, 2); } } }
      break; }
    case 'seabolt': {
      head = { x: H.x, y: H.y, z: 50 };
      if (!A.hit && A.t >= A.T) { A.hit = true; if (!(ad.boltFx && ad.boltFx(A.x, A.y))) { const n = (Math.random() * 4) | 0; fx('td_sky' + n, A.x, A.y) || fx('dr_bolt', A.x, A.y); } ctx.sfx('smash'); if (ctx.quake) ctx.quake(0.2); A.st = 0;
        const R = A.region, wet = playerWet(ctx, R); if (wet) shock(ctx, ad, 'p'); else { TS_.stats.safe++; log('seabolt: on dry land — safe'); }
        const rp = ctx.rocky && ctx.rocky.pos && ctx.rocky.pos(); if (rp && inRegion(m, R, rp.x, rp.y)) shock(ctx, ad, 'r');
        const lowL = (ad.body ? ad.body() : []).concat(H ? [H] : []).filter(q => q && q.z < 32 && inRegion(m, R, q.x, q.y)), lowOver = lowL.length; if (lowOver >= 2) {   /* thân trùm nằm sát vùng nước đó */ const q0 = lowL.slice().sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[0];   /* đốt gần người nhất → tia sét thứ 2 nằm trong khung nhìn */ setTimeout(() => { if (ad.boltFx) ad.boltFx(q0.x, q0.y); else fx('td_sky1', q0.x, q0.y); }, 180);   /* tia sét thứ 2 đánh thẳng xuống THÂN rết (sét dày chói, không tia mảnh) */ ad.dmg(0.05); ad.stun(2.2); TS_.stats.selfZap++; say(ctx, t.selfZap, true); log('SELF ZAP'); }   /* phản đòn: dụ trùm xuống sát nước rồi để nó gọi sét */
        const keys = [...R], kNear = keys.filter(k3 => Math.hypot((k3 % m.w) * TS + 8 - A.x, Math.floor(k3 / m.w) * TS + 8 - A.y) < 56); for (let i = 0; i < Math.min(4, kNear.length); i++) { const k2 = kNear[(Math.random() * kNear.length) | 0];   /* tia điện chỉ quanh chỗ sét đánh, 4 tia (không rải khắp biển thành mảnh vụn) */ fx(VX('bk_crackle') ? 'bk_crackle' : 'tr_shock', (k2 % m.w) * TS + 8, Math.floor(k2 / m.w) * TS + 8, { dur: 0.7 }); }   /* điện lan mặt nước: tia tím nhỏ chập chờn (bỏ dải sóng điện dài trông như con giun) */
        let nf = Math.min(6, 2 + Math.floor(keys.length / 40)); const nf0 = nf; for (let i = 0; i < nf0 && keys.length; i++) { const k2 = keys[(Math.random() * keys.length) | 0], fx0 = (k2 % m.w) * TS + 8, fy0 = Math.floor(k2 / m.w) * TS + 8, land = landNear(ctx, fx0, fy0); if (!land) continue; TS_.fishes.push({ x0: fx0, y0: fy0, x1: land.x, y1: land.y, t: -i * 0.12, dur: 0.9, flip: Math.random() < 0.5 }); }
        nf = TS_.fishes.filter(f => f.t < 0 || f.t === 0).length;   /* chỉ đếm cá thật sự nhảy lên bờ */
        if (nf) { TS_.stats.fish += nf; say(ctx, t.fish(nf)); } }
      break; }
    case 'whirl': {   /* xoáy hút vào tâm (vòng nước chạy NGƯỢC = cuộn vào) */
      head = { x: A.x + 40, y: A.y - 30, z: 10 };
      if (A.t >= A.T) { if (!A.fx1) { A.fx1 = true; fx(VX('bk_whirl') ? 'bk_whirl' : 'tr_ring', A.x, A.y, { dur: A.dur - A.T, rev: true }); }   /* 2026-10-14: xoáy PixelLab (vòng gợn + bong bóng) chạy ngược = cuộn vào tâm */
        const d = Math.hypot(p.x - A.x, p.y - A.y); if (d < 90 && d > 3 && !(ctx.knocked && ctx.knocked())) { const k2 = 46 * dt / d; p.x += (A.x - p.x) * k2; p.y += (A.y - p.y) * k2; }
        if (d < 16 && (A.dmgT = (A.dmgT || 0) - dt) <= 0) { A.dmgT = 0.8; ad.hurtP(0.04, { x: A.x, y: A.y }, 'stagger', 0.6, 'whirl'); } }
      break; }
    case 'bubbles': { head = { x: H.x, y: H.y, z: 6 }; if (!A.hit && A.t >= A.T) { A.hit = true; for (let i = 1; i <= 3; i++) fx('tr_bubbles', H.x + Math.cos(A.a) * i * 26, H.y + Math.sin(A.a) * i * 26 + 30, { dur: 1.0 });
        const inCone = e => e && Math.hypot(e.x - H.x, e.y - H.y) < 90 && Math.abs(((Math.atan2(e.y - H.y, e.x - H.x) - A.a + Math.PI * 3) % TAU) - Math.PI) < 0.55;
        if (inCone(p)) ad.hurtP(0.06, H, 'stagger', 1.1, 'bubbles'); const rp = ctx.rocky && ctx.rocky.pos && ctx.rocky.pos(); if (inCone(rp)) ad.hurtR(0.05, H, 45); } break; }
    case 'uwshock': { head = { x: H.x, y: H.y, z: 20 };
      if (!A.hit && A.t >= A.T) { A.hit = true; const covered = coverNear(ctx, p.x, p.y); if (covered) { TS_.stats.safe++; log('uwshock: behind rock — safe'); } else shock(ctx, ad, 'p'); const rp = ctx.rocky && ctx.rocky.pos && ctx.rocky.pos(); if (rp && !coverNear(ctx, rp.x, rp.y)) shock(ctx, ad, 'r');
        for (let i = 0; i < 16; i++) fx('tr_shock', p.x + (Math.random() - 0.5) * 300, p.y + (Math.random() - 0.5) * 200, { dur: 0.7 }); ctx.sfx('smash'); if (ctx.quake) ctx.quake(0.15); } break; }
    case 'silt': { head = { x: H.x, y: H.y, z: 0 }; if (!A.hit && A.t >= A.T) { A.hit = true; TS_.silt = 5; for (let i = 0; i < 5; i++) fx(VX('bk_silt') ? 'bk_silt' : 'tr_silt', H.x + (Math.random() - 0.5) * 120, H.y + (Math.random() - 0.5) * 80, { dur: 0.9 + Math.random() * 0.4 }); }   /* bùn PixelLab (smoke_puff tông bùn) */ break; }
    case 'uproot': {   /* nhổ cây: cây đổ thật (trees.js), chính ảnh cây bay về phía người chơi */
      head = { x: A.x, y: A.y - 6, z: 30 };
      if (!A.lift && A.t >= A.T) { A.lift = true; const img = objImg(ctx, A.o); try { smashObj(ctx, A.o, 99, 1); } catch (e) { /* bỏ qua */ } thr(ctx, { kind: 'slam', from: { x: A.x, y: A.y - 40 }, to: { x: p.x, y: p.y - 6 }, in: 0.7, radius: 22 }); TS_.proj.push({ img, x0: A.x, y0: A.y, x1: p.x, y1: p.y, t: 0, dur: 0.7, rot: 0, onHit: (x, y) => { areaHurt(ctx, ad, x, y, 22, 0.08, 'tree', 'fly', 1.0, 4); fx('tr_sand', x, y, { dur: 0.6 }); if (ctx.vfx) ctx.vfx('wood_chips', x, y); } }); ctx.sfx('whoosh_big'); }
      break; }
    case 'blaze': { head = { x: H.x, y: H.y, z: 50 };
      if (!A.hit && A.t >= A.T) { A.hit = true; const n = (Math.random() * 4) | 0; fx('td_sky' + n, A.x, A.y) || fx('dr_bolt', A.x, A.y); ctx.sfx('smash');
        for (const o of treesNear(ctx, A.x, A.y, 64)) TS_.fires.push({ o, x: o.x * TS + 8, y: o.y * TS + 14, t: 6 + Math.random(), hitT: 0 }); log('blaze ' + TS_.fires.length); } break; }
    case 'burrow': {   /* độn thổ: đầu lặn xuống cát, gợn cát bám theo người, khoá vị trí 0,6 s trước khi trồi */
      if (A.t < A.T) head = { x: H.x, y: H.y, z: -10 - 40 * A.t };
      else if (A.t < A.lockT) { const k2 = Math.min(1, dt * 2.2); A.x += (p.x - A.x) * k2; A.y += (p.y - A.y) * k2; head = { x: A.x, y: A.y, z: -40 }; if ((A.dT = (A.dT || 0) - dt) <= 0) { A.dT = 0.12; if (ctx.vfx) ctx.vfx('dirt_puff', A.x + (Math.random() - 0.5) * 10, A.y + 2); } }
      else if (!A.hit && A.t >= A.lockT + 0.6) { A.hit = true; fx(VX('bk_sandgeyser') ? 'bk_sandgeyser' : 'tr_sand', A.x, A.y, { dur: 1.0 }); ctx.sfx('smash'); if (ctx.quake) ctx.quake(0.25); areaHurt(ctx, ad, A.x, A.y, 24, 0.1, 'burrow', 'launch', 1.2, 3); head = { x: A.x, y: A.y, z: 40 }; }
      else head = { x: A.x, y: A.y, z: A.hit ? 40 : -40 };
      break; }
    case 'sandstorm': { head = { x: H.x, y: H.y, z: 30 }; if (!A.hit && A.t >= A.T) { A.hit = true; TS_.storm = 6; ctx.sfx('whoosh_big'); } break; }
    case 'glass': { head = { x: H.x, y: H.y, z: 50 };
      if (!A.hit && A.t >= A.T) { A.hit = true; ctx.sfx('smash'); for (const q of A.pts) { const n = (Math.random() * 4) | 0; fx('td_sky' + n, q.x, q.y) || fx('dr_bolt', q.x, q.y); TS_.haz.push({ k: 'glass', x: q.x, y: q.y, t: 8, r: 14, hitT: 0, v: Math.random() < 0.5 ? 'glass_a' : 'glass_b', flip: Math.random() < 0.5 }); fx('dirt_puff', q.x, q.y); } TS_.stats.glass += A.pts.length; } break; }
    case 'rockslide': { head = { x: H.x, y: H.y, z: A.t < A.T ? 40 : 4 };
      if (!A.slam && A.t >= A.T) { A.slam = true; if (ctx.quake) ctx.quake(0.3); ctx.sfx('smash'); fx(VX('bk_dustring') ? 'bk_dustring' : 'ac_dustring', H.x, H.y); }
      for (const r of A.rocks) if (!r.done && A.t >= r.at) { r.done = true; if (ctx.vfx) ctx.vfx('rock_debris', r.x, r.y); areaHurt(ctx, ad, r.x, r.y, 15, 0.06, 'rock', 'stagger', 1.0, 3); } break; }
    case 'hurl': { head = { x: A.x, y: A.y - 4, z: 24 };
      if (!A.lift && A.t >= A.T && A.o) { A.lift = true; const img = objImg(ctx, A.o); try { for (let i = 0; i < 4 && !A.o.ruined; i++) smashObj(ctx, A.o, 99, 1); } catch (e) { /* bỏ qua */ } thr(ctx, { kind: 'slam', from: { x: A.x, y: A.y - 40 }, to: { x: p.x, y: p.y - 6 }, in: 0.6, radius: 20 }); TS_.proj.push({ img, x0: A.x, y0: A.y, x1: p.x, y1: p.y, t: 0, dur: 0.6, rot: 0, onHit: (x, y) => { areaHurt(ctx, ad, x, y, 20, 0.07, 'hurl', 'fly', 0.95, 3); if (ctx.vfx) ctx.vfx('wood_chips', x, y); } }); ctx.sfx('whoosh_big'); } break; }
    case 'roof': { head = { x: A.x, y: A.y - 20, z: 40 }; if (!A.hit && A.t >= A.T && A.o) { A.hit = true; try { smashObj(ctx, A.o, 6, 1); } catch (e) { /* bỏ qua */ } if (ctx.vfx) { ctx.vfx('wood_chips', A.x, A.y); ctx.vfx('rock_debris', A.x + 10, A.y - 4); } ctx.sfx('smash'); areaHurt(ctx, ad, A.x, A.y + 20, 26, 0.05, 'roof', 'stagger', 1, 0); } break; }
  }
  if (A.t >= A.dur) { TS_.act = null; log('end ' + A.k); return { done: true, head }; }
  return { done: false, head };
}
function coverNear(ctx, x, y) { const m = ctx.S.map; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const tx = Math.floor((x + dx * 14) / TS), ty = Math.floor((y - 6 + dy * 16) / TS);   /* sát đá / vách trong 1 ô quanh thân */ if (ctx.isSolid(m, tx, ty) || solidObjAt(ctx, tx, ty)) return true; } return false; }
function objImg(ctx, o) { const d = o && ctx.O[o.type]; if (!d) return null; return o.artImg || (d.frames ? d.frames[0] : d.img) || null; }

/* ---------------- trạng thái chung (cá, lửa, gai, bão, bùn, cát ướt) ---------------- */
function envTick(ctx, dt, ad) {
  const p = ctx.S.player, t = L(ctx);
  for (const f of TS_.fx) f.t += dt; TS_.fx = TS_.fx.filter(f => f.t < f.dur);
  for (const w of TS_.wet) w.t -= dt; TS_.wet = TS_.wet.filter(w => w.t > 0);
  if (TS_.storm > 0) TS_.storm -= dt; if (TS_.silt > 0) TS_.silt -= dt; if (TS_.shockP > 0) TS_.shockP -= dt;
  for (const q of TS_.proj) { q.t += dt; q.rot += dt * 9; if (!q.hit && q.t >= q.dur) { q.hit = true; try { q.onHit(q.x1, q.y1); } catch (e) { console.error('terrain proj', e); } } } TS_.proj = TS_.proj.filter(q => !q.hit);
  for (const f of TS_.fishes) { f.t += dt; if (!f.landed && f.t >= f.dur) { f.landed = true; ctx.give('a_fish', 1, f.x1, f.y1); } }   /* cá choáng nằm trên bờ → đồ nhặt (drops) */
  if (TS_.fishes.some(f => f.landed && !f.taken) && ctx.rocky && ctx.rocky.pos && ctx.rocky.pos()) { const f = TS_.fishes.find(q => q.landed && !q.taken); f.taken = true; TS_.stats.rkFish++; const pt = ctx.S.save.sys && ctx.S.save.sys.pet && ctx.S.save.sys.pet.pet; if (pt) pt.hunger = Math.min(100, (pt.hunger || 0) + 20); if (!TS_.rkSaid) { TS_.rkSaid = true; say(ctx, t.rkFish); } }   /* Rocky chộp cá (no thêm) */
  TS_.fishes = TS_.fishes.filter(f => !f.landed || f.t < f.dur + 1.2);
  for (const F of TS_.fires) { if (!F.out && ctx.rainAt && ctx.rainAt(F.x, F.y)) { F.out = true; F.doused = true; TS_.stats.doused = (TS_.stats.doused || 0) + 1; if (ctx.vfx) ctx.vfx('water_splash', F.x, F.y); continue; }   /* 2026-10-15 Gọi Mưa của Cóc dập lửa */
    F.t -= dt; F.hitT -= dt; if (F.hitT <= 0) { F.hitT = 0.8;
      if (Math.hypot(p.x - F.x, p.y - F.y) < 20) ad.hurtP(0.03, F, 'stagger', 0.5, 'fire'); const rp = ctx.rocky && ctx.rocky.pos && ctx.rocky.pos(); if (rp && Math.hypot(rp.x - F.x, rp.y - F.y) < 20) ad.hurtR(0.03, F, 25);
      const H = ad.head && ad.head(); if (H && ad.body && ad.body().concat([H]).some(q => q && q.z < 30 && Math.hypot(q.x - F.x, q.y - F.y) < 26)) { ad.dmg(0.012); TS_.stats.burnBoss++; if (!TS_.burnSaid) { TS_.burnSaid = true; say(ctx, t.burnBoss); } }   /* cây cháy đốt cả trùm */
      if (ctx.chase) ctx.chase.impact(F.x, F.y, 18, { pw: 1, smash: false }); }
    if (F.t <= 0 && !F.out) { F.out = true; try { if (!F.o.ruined && !F.o.ghost) smashObj(ctx, F.o, 99, 1); } catch (e) { /* bỏ qua */ } if (ctx.vfx) ctx.vfx('rock_debris', F.x, F.y); } }
  TS_.fires = TS_.fires.filter(F => !F.out);
  for (const h of TS_.haz) { h.t -= dt; h.hitT -= dt; if (h.k === 'glass') { if (h.hitT <= 0 && Math.hypot(p.x - h.x, p.y - h.y) < h.r) { h.hitT = 1; ad.hurtP(0.04, h, 'stagger', 0.7, 'glass'); }
      if (h.t < 0.5 && !h.crumble) { h.crumble = true; fx('dirt_puff', h.x, h.y); }
      if (h.t <= 0 && !h.drop) { h.drop = true; if (Math.random() < 0.6) ctx.give('boltglass', 1, h.x, h.y); } } }
  TS_.haz = TS_.haz.filter(h => h.t > 0);
}
/* dân bỏ chạy khi trùm tới vùng (ngoài trời có dân) */
function flee(ctx, x, y) {
  let n = 0; for (const nn of ctx.S.npcs || []) { if (nn.ko || Math.hypot(nn.x - x, nn.y - y) > 200) continue; const d = Math.hypot(nn.x - x, nn.y - y) || 1; nn.goal = { x: nn.x + (nn.x - x) / d * 70, y: nn.y + (nn.y - y) / d * 50 }; nn.speedMul = 2.2; if (n < 3 && ctx.bubble) try { ctx.bubble(nn, L(ctx).flee, 1.6); } catch (e) { /* bỏ qua */ } n++; }
  TS_.stats.flee += n; log('flee ' + n); return n;
}

export const terrain = {
  id: 'terrain', always: true,
  onZoneEnter(ctx) {
    TS_.ctx = ctx; TS_.act = null; TS_.haz = []; TS_.fx = []; TS_.proj = []; TS_.fishes = []; TS_.wet = []; TS_.fires = []; TS_.storm = 0; TS_.silt = 0;
    ctx.terrain = { at: (x, y) => terrainAt(ctx, x, y), pick: ad => pick(ctx, ad), start: (k, ad) => start(ctx, k, ad), tick: (dt, ad) => tick(ctx, dt, ad), busy: () => !!TS_.act, cancel: () => { TS_.act = null; },
      env: (dt, ad) => envTick(ctx, dt, ad), flee: (x, y) => flee(ctx, x, y), night: () => !!(ctx.clock && ctx.clock.isNight && ctx.clock.isNight()), cdTick: dt => { for (const k in TS_.cd) if (TS_.cd[k] > 0) TS_.cd[k] -= dt; } };
    if (typeof window !== 'undefined') window.__terrain = { st: () => ({ at: terrainAt(ctx, ctx.S.player.x, ctx.S.player.y), act: TS_.act ? { k: TS_.act.k, t: +TS_.act.t.toFixed(2), res: TS_.act.res || null } : null, stats: JSON.parse(JSON.stringify(TS_.stats)), haz: TS_.haz.length, fires: TS_.fires.length, fishes: TS_.fishes.length, storm: +TS_.storm.toFixed(1), silt: +TS_.silt.toFixed(1), cd: { ...TS_.cd }, log: TS_.log.slice(-20) }),
      cd0: () => { TS_.cd = {}; }, at: (x, y) => terrainAt(ctx, x, y), water: (x, y, r) => waterNear(ctx, x, y, r || 200) };
  },
  onZoneLeave() { TS_.act = null; TS_.haz = []; TS_.fires = []; TS_.fishes = []; TS_.proj = []; TS_.storm = 0; TS_.silt = 0; },
  drawGround(g, ctx, cx, cy) {
    if (TS_.wet.length) { g.save(); g.fillStyle = 'rgba(40,30,20,.16)'; for (const w of TS_.wet) { if (!isSandT(tileOf(ctx.S.map, w.x, w.y))) continue; g.globalAlpha = Math.min(1, w.t / 2); const im = fogTint(((Math.round(w.x) >> 4) & 3), '#3a2c1c'); if (im) { const sm = g.imageSmoothingEnabled; g.imageSmoothingEnabled = true; g.globalAlpha = Math.min(1, w.t / 2) * 0.35; g.drawImage(im, Math.round(w.x - cx - 18), Math.round(w.y - cy - 9), 36, 18); g.imageSmoothingEnabled = sm; } } g.restore(); }   /* cát ướt sẫm (tạm, mờ dần) */
    const A = TS_.act; if (!A) return;   /* vạch / vòng BÁO TRƯỚC */
    const ring = (x, y, r, col, k) => { const im = fogTint(((Math.round(x) >> 3) & 3), col); if (!im) return; const sm = g.imageSmoothingEnabled; g.save(); g.imageSmoothingEnabled = true; const w = r * (2.6 - 0.6 * k), h = w * 0.6; g.globalAlpha = 0.25 + 0.45 * k; g.drawImage(im, Math.round(x - cx - w / 2), Math.round(y - cy - h / 2), w, h); g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.12 + 0.3 * k; const w2 = w * 0.55 * k + 4; g.drawImage(im, Math.round(x - cx - w2 / 2), Math.round(y - cy - w2 * 0.3), w2, w2 * 0.6); g.imageSmoothingEnabled = sm; g.restore(); };   /* 2026-10-14 anh chê vòng vẽ code: báo trước = SƯƠNG MỀM màu tụ dần (cùng kỹ thuật fog) */
    const k = Math.min(1, A.t / (A.T || 1));
    if (A.t < (A.T || 0)) {
      if (A.k === 'plunge') ring(A.x, A.y, 26, '#9ad4ff', k);
      else if (A.k === 'seabolt') { const m = ctx.S.map, im = fogTint(2, '#fff0a0'); if (im) { const sm = g.imageSmoothingEnabled; g.save(); g.imageSmoothingEnabled = true; g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.06 + 0.16 * k; for (const kk of A.region) { const tx = kk % m.w, ty = Math.floor(kk / m.w); if ((tx + ty) & 1) continue; g.drawImage(im, tx * TS + 8 - cx - 16, ty * TS + 8 - cy - 10, 32, 20); } g.imageSmoothingEnabled = sm; g.restore(); } ring(A.x, A.y, 18, '#ffe870', k); }   /* tô vùng nước sẽ bị điện (tĩnh, sáng dần) */
      else if (A.k === 'whirl') ring(A.x, A.y, 60, '#7fc0ff', k);
      else if (A.k === 'glass') for (const q of A.pts) ring(q.x, q.y, 14, '#ffd27a', k);
      else if (A.k === 'blaze') ring(A.x, A.y, 64, '#ff8a3a', k);
      else if (A.k === 'uproot' || A.k === 'hurl') ring(A.tx, A.ty, 22, '#ffb070', k);
      else if (A.k === 'roof') ring(A.x, A.y + 20, 26, '#ffb070', k);
    }
    if (A.k === 'burrow' && A.t >= A.T && !A.hit) { const lock = A.t >= A.lockT; ring(A.x, A.y, 24, lock ? '#ff6040' : '#e8c983', lock ? Math.min(1, (A.t - A.lockT) / 0.6) : 0.4); }
    if (A.k === 'rockslide') for (const r of A.rocks) if (!r.done) { const u = Math.max(0, Math.min(1, 1 - (r.at - A.t) / 0.9)); ring(r.x, r.y, 8 + 10 * u, '#1a1028', u); }
    if (A.k === 'spout' && A.t < A.T) ring(A.x, A.y, 20, '#9ad4ff', k);
    if (A.k === 'spout' && A.res === 'fire' && A.t - A.rt < 0.5) for (let d = 20; d < 150; d += 22) ring(A.x + Math.cos(A.a) * d, A.y + Math.sin(A.a) * d, 9, '#9ad4ff', 1 - (A.t - A.rt) * 2);   /* pháo nước: dải sương nước mềm (không vạch thẳng) */
  },
  drawables(ctx, cx, cy) {
    const g = ctx.g, out = [], A = TS_.act;
    for (const f of TS_.fx) if (!f.scr) out.push({ y: f.top ? 1e9 : f.y + 20, f: () => { const n = f.s.n, fr = Math.floor(f.t * (f.s.fps || 12)), i = f.s.loop || f.rev ? (f.rev ? n - 1 - (fr % n) : fr % n) : Math.min(n - 1, fr); sheetAt(g, f.s, i, f.x - cx, f.y - cy, f.alpha * Math.min(1, (f.dur - f.t) * 3)); } });
    for (const F of TS_.fires) { const s = VX('tr_fire'); if (s) out.push({ y: F.y + 1, f: () => sheetAt(g, s, Math.floor(ctx.S.time * (s.fps || 12)) % s.n, F.x - cx, F.y - cy, Math.min(1, F.t), 'b') }); }
    for (const h of TS_.haz) if (h.k === 'glass') { const im = GLI(h.v); if (im) out.push({ y: h.y + 2, f: () => {   /* 2026-10-14 anh chê chóp nón phẳng: tinh thể FULGURITE PixelLab (decal/glass_a|b), trồi lên 0,25 s, cuối mờ dần vỡ vụn */
      const life = 8 - h.t, up = Math.min(1, life / 0.25), fade = Math.min(1, h.t / 0.6), w = im.naturalWidth / 2, hh = im.naturalHeight / 2, rise = Math.round((1 - up) * hh * 0.6);
      g.save(); g.imageSmoothingEnabled = false; g.globalAlpha = fade; g.beginPath(); g.rect(Math.round(h.x - cx - w), Math.round(h.y - cy - hh * 1.2), w * 2, hh * 1.2 + 4); g.clip(); g.drawImage(im, Math.round(h.x - cx - w / 2), Math.round(h.y - cy - hh + 4 + rise), w, hh); g.restore(); } }); }
    const fish = ART.man && ART.man.ui && ART.man.ui.items && ART.man.ui.items.fish; const fim = fish ? (FISH.im || (FISH.im = Object.assign(new Image(), { src: 'assets/px/' + fish }))) : null;
    for (const f of TS_.fishes) if (f.t >= 0 && fim && fim.complete && fim.naturalWidth) out.push({ y: f.y1, f: () => { const u = Math.min(1, f.t / f.dur), x = f.x0 + (f.x1 - f.x0) * u, y = f.y0 + (f.y1 - f.y0) * u - Math.sin(u * Math.PI) * 34, w = fim.naturalWidth / 2, hh = fim.naturalHeight / 2;   /* cá nhảy vọt lên rồi giãy trên bờ */
      g.save(); g.translate(Math.round(x - cx), Math.round(y - cy)); g.rotate(f.landed ? Math.sin(ctx.S.time * 18) * 0.5 : u * 6 * (f.flip ? -1 : 1)); g.drawImage(fim, -w / 2, -hh / 2, w, hh); g.restore(); } });
    for (const q of TS_.proj) if (q.img) out.push({ y: 1e8, f: () => { const u = Math.min(1, q.t / q.dur), x = q.x0 + (q.x1 - q.x0) * u, y = q.y0 + (q.y1 - q.y0) * u - Math.sin(u * Math.PI) * 50, w = q.img.width / (q.img.__hi ? 1 : 2), hh = q.img.height / (q.img.__hi ? 1 : 2);   /* vật bị ném: CHÍNH ảnh vật đó xoay bay */
      g.save(); g.translate(Math.round(x - cx), Math.round(y - cy)); g.rotate(q.rot); g.drawImage(q.img, -w / 2, -hh / 2, w, hh); g.restore(); } });
    if (A && A.k === 'spout' && !A.res && VX('bk_spout')) { const s = VX('bk_spout'); out.push({ y: A.y + 2, f: () => sheetAt(g, s, Math.floor(ctx.S.time * 12) % s.n, A.x - cx, A.y - cy, Math.min(1, A.t / 0.3)) }); }   /* 2026-10-14: Vòi Rồng = cột nước xoáy PixelLab (steam_vent tông nước + gợn chân), gốc ở mặt biển */
    else if (A && A.k === 'spout' && !A.res) { const s = VX('tr_spout_soft') || VX('tr_spout'); if (s) out.push({ y: A.y + 2, f: () => { const top = A.y - 70 - 40 * Math.min(1, A.t / 0.6), y0 = A.y; for (let y = y0; y > top + 10; y -= s.h * 0.6) sheetAt(g, s, Math.floor(ctx.S.time * 12 + y) % s.n, A.x - cx, y - cy, 0.9, 'b'); } }); }   /* cột nước từ mặt biển lên tới miệng */
    if (TS_.shockP > 0) { const s = VX('bk_zap') || VX('tr_shock'), p = ctx.S.player; if (s) out.push({ y: 1e8, f: () => sheetAt(g, s, Math.floor(ctx.S.time * 14) % s.n, p.x - cx, p.y - cy - 14, 1) }); }
    return out;
  },
  draw(g, ctx, cx, cy) {
    const VW = ctx.VW || 480, VH = ctx.VH || 270, p = ctx.S.player, fog = (col, a, R) => { g.save(); const X = p.x - cx, Y = p.y - 10 - cy, gr = g.createRadialGradient(X, Y, R * 0.4, X, Y, R * 1.6); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, col); g.globalAlpha = a; g.fillStyle = gr; g.fillRect(0, 0, VW, VH); g.restore(); };
    const sfog = (col, a, R, drift) => { const sm = g.imageSmoothingEnabled; g.imageSmoothingEnabled = true; const t = ctx.S.time;   /* sương / bụi MỀM trôi ngang (zones/sky/fog) + tầm nhìn hẹp quanh người */
      for (let i = 0; i < 9; i++) { const im = fogTint(i % 4, col); if (!im) continue; const w = im.width * 1.3, hh = im.height * 1.2, x = ((i * 211 + t * drift * (1 + (i % 3) * 0.4)) % (VW + w)) - w * 0.6, y = ((i * 97) % (VH + hh * 0.5)) - hh * 0.4; g.globalAlpha = a * 0.75; g.drawImage(im, x, y, w, hh); }
      g.globalAlpha = 1; g.imageSmoothingEnabled = sm; fog(col, a, R); };
    if (TS_.storm > 0) sfog('rgba(170,128,72,1)', Math.min(1, TS_.storm, (6 - TS_.storm) * 2), 70, 120);   /* bão cát: bụi cát mềm cuộn ngang */
    if (TS_.silt > 0) sfog('rgba(46,58,42,1)', Math.min(1, TS_.silt, (5 - TS_.silt) * 2), 60, 18);   /* bùn đục dưới nước */
  },
};
const FISH = {};
const GLIM = {}; function GLI(n) { if (!n) return null; let i = GLIM[n]; if (!i) { i = new Image(); i.src = 'assets/px/boss/bakunawa/decal/' + n + '.png'; GLIM[n] = i; } return i.complete && i.naturalWidth ? i : null; }
