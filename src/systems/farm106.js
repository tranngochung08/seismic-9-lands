/* farm106.js — plan-106 (anh 02/11): THẢ BẦY THÚ RA TỪNG VÙNG của Làng mới (p88/p89) để FARM XP bằng Chấn Thú Huyền Thoại.
   · 7 vùng con có bầy (Quảng Trường an toàn). Mỗi bầy = 3–4 QUÁI THƯỜNG có sẵn (Nhầy, Cua, Cá Nóc, Sói, Quạ, Mòng Biển, Yêu Đá — sprite / AI vẽ của monsters.js)
     + 1 CHẤN THÚ THỦ LĨNH hợp vùng (sprite đấu duel_sprites.json, đúng cỡ loài, không phóng), cấp cao hơn; quái thường lang thang QUANH thủ lĩnh, mọi con ở TRONG vùng (regionAt).
   · Mỗi con = 1 mục ctx.monsters (c.fct → mọi hệ có sẵn coi là "thú hoang hiền khi chưa giận": Elyziuma / comp79 / Rocky chỉ đánh con ĐANG GIẬN; c.sky → không vào skyRoster).
   · QUẤY RỐI → ĐUỔI: bị người chơi / Chấn Thú của người chơi đánh, hoặc người chơi đứng < 28 px quá 0,7 s → nổi giận ("!" TĨNH nhỏ), kéo 1–2 con gần;
     THỦ LĨNH nổi giận → CẢ BẦY đuổi. Đuổi + cắn (tầm 20 px, bước tới khi > 16 px → không vùng chết); thủ lĩnh thêm chiêu tầm xa THẬT của loài (tên chiêu + đạn VFX code màu hệ, 30–90 px).
     Ưu tiên Chấn Thú vừa đánh nó (5 s); ra khỏi ranh vùng > 56 px / cách chỗ sinh > 300 px → bỏ về, về tới vùng thì hồi máu.
   · THỦ LĨNH BỊ HẠ → bầy TAN: quái thường bỏ chạy 4 s rồi về vùng, trung tính. Thủ lĩnh: vương miện TĨNH + khung tên vàng "Thủ lĩnh", thanh máu đỏ dài hơn; XP ×2,5, rơi đồ nhiều; hồi sinh 180 s (quái thường 60 s).
   · FARM XP: hạ được → mỗi Chấn Thú đã gây sát thương nhận base (quái thường 2 + 1,2 × cấp · thủ lĩnh (3 + 2,2 × cấp) × 2,5), đòn cuối +50 %; người chơi 30 % (đòn cuối thì đủ).
     Lưu team[i].xp106 / xpT106, đủ needXp (petlv) thì +1 cấp. Số "+N XP" nổi lên bằng S.pops (cỡ chữ theo scaleUI p89).
   · AN TOÀN: có Chấn Thú Huyền Thoại đang thả → đòn của bầy không kéo máu người chơi dưới 35 %; Chấn Thú của mình có sàn 25 %.
   · Thanh máu: thú hoang ĐỎ, Chấn Thú của người chơi XANH LÁ (cùng kiểu overBar p91, khung ui/hud91/obar_s.png).
   · Bấm E cạnh THỦ LĨNH chưa giận → đấu chính thức (ctx.duel.start như fieldct). Tắt cả hệ: &f106=0.
   Móc test: window.__f106. */
import { REGIONS, regionAt } from '../village88.js';
import { SPECIES, SPECIES_EN, TYPE_COLOR, MOVES, MOVE_NAME_EN } from './duel-data.js';
import * as FX from './fx78.js';
import { PAL_SRC } from './pxfx.js';
import { SHADOW, shadowFor } from './shadow.js';
import * as LV from './petlv.js';
import { T as TT } from '../gfx.js';
import * as S108 from '../sfx108.js';   /* p108: cổng tiếng chung (tiếng hệ <he>_cast / <he>_hit) */

const TS = 16;
const ZR = {   /* vùng → cấp quái thường + thủ lĩnh (loài có sprite đấu) + quái thường (khoá monsters.js) */
  /* anh chốt 02/11: mỗi vùng ĐÚNG 1 Chấn Thú = THỦ LĨNH (2–4 chiêu thật), 7 vùng = 7 loài khác nhau, không trùng Chấn Thú trong đội (Rocky golem, Elyziuma); còn lại là quái thường (1–2 chiêu nhỏ).
     Bỏ Yêu Đá (khối đá nâu giống Rocky golem) → Bọ Cạp Cát. */
  stream: { lv: [3, 5], lead: { sp: 'bachkinh', lv: 9, lead: true }, cts: [], mins: ['crab', 'puffer', 'eel'] },
  camp_coc: { lv: [4, 6], lead: { sp: 'coc2', lv: 10, lead: true }, cts: [], mins: ['crab', 'slime', 'slime'] },
  south: { lv: [2, 4], lead: { sp: 'saola', lv: 7, lead: true }, cts: [], mins: ['slime', 'wolf', 'crow', 'slime', 'wolf', 'crow', 'slime'] },   /* p121: anh 03/11 tăng quái đầu bãi 3 → 7 */
  camp_chui: { lv: [6, 8], lead: { sp: 'chuichui2', lv: 13, lead: true }, cts: [], mins: ['scorpion', 'slime', 'wolf'] },
  cliff: { lv: [5, 7], lead: { sp: 'utchan', lv: 11, lead: true }, cts: [], mins: ['scorpion', 'scorpion', 'wolf'] },
  plateau: { lv: [8, 10], lead: { sp: 'daibang', lv: 14, lead: true }, cts: [], mins: ['crow', 'crow', 'gull'] },
  north: { lv: [9, 11], lead: { sp: 'loiho', lv: 15, lead: true }, cts: [], mins: ['wolf', 'wolf', 'scorpion'] },
};
const AQUA = { cachep: 1, bachkinh: 1, puffer: 1, eel: 1 }, WADE = { coc: 1, coc2: 1 }, AMPH = { crab: 1 }, FLY = { daibang: 1, hac: 1, crow: 1, gull: 1 };
const SHOT_CLIPS = ['cast', 'spit', 'zap', 'spout', 'flap', 'beam', 'shine', 'shout', 'blow', 'gaze', 'tongue', 'pulse', 'wave', 'throw'];
const HGT = { xs: 15, s: 18, m: 24, l: 30 };
const CF = { aggroR: 28, aggroT: 0.7, packR: 80, packN: 2, bite: 20, near: 16, shotMin: 30, shotMax: 90, shotV: 105, leashOut: 56, leashHome: 300, tauntT: 5, respawn: 60, respawnLead: 180, sleepR: 520, floorP: 0.35, floorC: 0.25, fleeT: 5, roam: 72, sepR: 18, respawnCt: 90, ctXp: 1.5, gcd: [1.6, 2.6], leadXp: 2.5 };
const ST = { ctx: null, on: false, mons: [], rq: [], shots: [], dying: [], fx6: [], tiles: {}, log: [], n: { spawn: 0, kill: 0, killLead: 0, angry: 0, pack: 0, calm: 0, back: 0, shot: 0, bite: 0, hitP: 0, hitC: 0, floor: 0, duel: 0, respawn: 0, scatter: 0 }, xp: { ely: 0, c79: 0, pl: 0 }, errs: 0, vanT: 0, im: null };
/* c10-coop (chơi chung): NET.role 'solo' | 'host' (mô phỏng quái, phát cho mọi người) | 'guest' (quái = bóng theo chủ phòng). coop.js gắn hàm vào NET. */
export const NET = { role: 'solo', peerObj: null, peers: null, nearest: null, hurt: null, onKill: null, fx: null, take: null, guestFall: null };
const isR = w => typeof w === 'string' && w.slice(0, 2) === 'r:';
const vi = ctx => !ctx.lang || ctx.lang() !== 'en';
const now = () => (ST.ctx ? ST.ctx.S.time : 0);
const hyp = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const duelOn = ctx => !!(ctx.duel && ctx.duel.active && ctx.duel.active());
const R = (a, b) => a + Math.random() * (b - a);
const pick = a => a[(Math.random() * a.length) | 0];
function log(e) { ST.log.push({ t: +now().toFixed(2), ...e }); if (ST.log.length > 400) ST.log.shift(); }
const off = () => { try { return new URLSearchParams(location.search).get('f106') === '0'; } catch (e) { return false; } };
const heOf = sp => (SPECIES[sp] && SPECIES[sp].types && SPECIES[sp].types[0]) || 'chan';
const spName = (ctx, sp) => (vi(ctx) ? (SPECIES[sp] ? SPECIES[sp].name : sp) : SPECIES_EN[sp] || (SPECIES[sp] ? SPECIES[sp].name : sp));
let SPR6 = null, sprP6 = null;   /* cao thân đo từ ảnh đấu (idle.ay / 2) — theo cỡ mới plan-98, không đoán theo bậc */
function loadSpr6() { if (!sprP6 && typeof fetch !== 'undefined') sprP6 = fetch('assets/px/linhduel/duel_sprites.json').then(r => r.json()).then(j => { SPR6 = j; }).catch(() => { sprP6 = null; }); }
const hOf = mo => { const F = mo.f6; if (F && F.sp) { const c = SPR6 && SPR6[F.sp] && (SPR6[F.sp].idle || SPR6[F.sp].hover); return c && c.ay ? Math.round(c.ay / 2) : HGT[(SPECIES[F.sp] && SPECIES[F.sp].size) || 's'] || 18; } return (mo.c.h || 12) + 2; };
const kindOf = k => (AQUA[k] ? 'aqua' : FLY[k] ? 'fly' : WADE[k] ? 'wade' : AMPH[k] ? 'amph' : 'land');
const leaderOf = rid => ST.mons.find(m => m.f6 && m.f6.lead && m.f6.rid === rid && m.hp > 0) || null;
/* p121 (anh 03/11): thủ lĩnh / thú hiếm ở HANG riêng cuối bãi (xa quảng trường / lối vào); quái thường không lại gần hang, đánh quái thường không kéo thủ lĩnh → người chơi ngó lơ được, chỉ vào hang mới đánh */
const LAIR_R = 40, LAIR_AVOID = 120;
function lairOf(rid) { ST.lair = ST.lair || {}; if (ST.lair[rid] !== undefined) return ST.lair[rid]; const L0 = tileList(rid, 'land'), S0 = ST.ctx && ST.ctx.S, m = S0 && S0.map, g = S0 && S0.guide, e = m && m.entries && m.entries.default; if (!L0.length || (!g && !e)) return (ST.lair[rid] = null); const rx = g ? g.x : e.x * TS + 8, ry = g ? g.y : e.y * TS + 14, K = new Set(L0.map(t => t[0] + ',' + t[1])), dense = t => { let n = 0; for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if (K.has((t[0] + dx) + ',' + (t[1] + dy))) n++; return n; }; const S1 = L0.map(t => ({ t, d: Math.hypot(t[0] * TS + 8 - rx, t[1] * TS + 12 - ry) })).sort((a, c) => c.d - a.d); let b = null; for (const q of S1) if (dense(q.t) >= 15) { b = q.t; break; } if (!b) b = S1[0].t; return (ST.lair[rid] = { x: b[0] * TS + 8, y: b[1] * TS + 12 }); }
const nearLair = (rid, x, y, r) => { const L = lairOf(rid); return !!L && Math.hypot(x - L.x, y - L.y) < r; };
const FRONT_R = 170; function frontOf(rid) { ST.front = ST.front || {}; if (ST.front[rid] !== undefined) return ST.front[rid]; const L0 = tileList(rid, 'land'), S0 = ST.ctx && ST.ctx.S, m = S0 && S0.map, g = S0 && S0.guide, e = m && m.entries && m.entries.default; if (!L0.length || (!g && !e)) return (ST.front[rid] = null); const rx = g ? g.x : e.x * TS + 8, ry = g ? g.y : e.y * TS + 14, K = new Set(L0.map(t => t[0] + ',' + t[1])), dense = t => { let n = 0; for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if (K.has((t[0] + dx) + ',' + (t[1] + dy))) n++; return n; }; const S1 = L0.map(t => ({ t, d: Math.hypot(t[0] * TS + 8 - rx, t[1] * TS + 12 - ry) })).sort((a, c) => a.d - c.d); let b = null; for (const q of S1) if (dense(q.t) >= 15) { b = q.t; break; } if (!b) b = S1[0].t; return (ST.front[rid] = { x: b[0] * TS + 8, y: b[1] * TS + 12 }); }   /* p121: ĐẦU BÃI — chỗ gần quảng trường nhất; quái thường tụ ở đây cho người mới farm */
const inFront = (rid, x, y) => { const F0 = frontOf(rid); return !F0 || Math.hypot(x - F0.x, y - F0.y) < FRONT_R; };

/* ---------- ô đi được ---------- */
function walkPx(ctx, x, y, kind) {
  const m = ctx.S.map, tx = Math.floor(x / TS), ty = Math.floor(y / TS); if (tx < 1 || ty < 1 || tx >= m.w - 1 || ty >= m.h - 1) return false;
  if (kind === 'fly') return true;
  const g = ctx.getG(m, tx, ty);
  if (kind === 'aqua') return g === TT.WATER;
  if (g === TT.DEEP || g === TT.LAVA) return false;
  if (g === TT.WATER) return (kind === 'wade' || kind === 'amph') && !(ctx.hasObjectAt && ctx.hasObjectAt(m, tx, ty));
  if (kind === 'amph' && !nearWater(ctx, tx, ty)) return false;   /* Cua: lên bờ tối đa 2 ô cạnh nước */
  return !ctx.isSolid(m, tx, ty);
}
const NW = new Map();
function nearWater(ctx, tx, ty) { const m = ctx.S.map, key = ty * 4096 + tx; let v = NW.get(key); if (v !== undefined && NW.map === m) return v; if (NW.map !== m) { NW.clear(); NW.map = m; }
  v = false; for (let j = -2; j <= 2 && !v; j++) for (let i = -2; i <= 2; i++) if (ctx.getG(m, tx + i, ty + j) === TT.WATER) { v = true; break; } NW.set(key, v); return v; }
const body = (ctx, x, y, k) => walkPx(ctx, x, y, k) && walkPx(ctx, x - 4, y, k) && walkPx(ctx, x + 4, y, k) && walkPx(ctx, x, y - 3, k);
function buildTiles(ctx) {   /* ô sinh / ô đích lang thang của từng vùng: land (đất) · water (nước) — ô và 8 ô quanh cùng loại */
  const m = ctx.S.map, out = {};
  for (const rid of Object.keys(ZR)) out[rid] = { land: [], water: [], shore: [] };
  for (let ty = 2; ty < m.h - 2; ty++) for (let tx = 2; tx < m.w - 2; tx++) {
    const r = regionAt(tx, ty), o = out[r.id]; if (!o) continue;
    let land = true, water = true;
    for (let j = -1; j <= 1 && (land || water); j++) for (let i = -1; i <= 1; i++) { const g = ctx.getG(m, tx + i, ty + j); if (g !== TT.WATER) water = false; if (g === TT.WATER || g === TT.DEEP || ctx.isSolid(m, tx + i, ty + j)) land = false; }
    if (land) { o.land.push([tx, ty]); if (nearWater(ctx, tx, ty)) o.shore.push([tx, ty]); } if (water) o.water.push([tx, ty]);
  }
  return out;
}
function tileList(rid, kind) { const o = ST.tiles[rid]; if (!o) return []; return kind === 'aqua' ? o.water : kind === 'amph' ? (o.shore.length ? o.shore : o.land) : o.land; }
function rectOf(rid) { const r = REGIONS.find(q => q.id === rid); return r ? { x0: r.x * TS, y0: r.y * TS, x1: (r.x + r.w) * TS, y1: (r.y + r.h) * TS } : null; }
function outDist(mo) {   /* khoảng cách (px) từ thú tới ranh vùng của nó, 0 nếu đang trong vùng */
  const F = mo.f6, tx = Math.floor(mo.x / TS), ty = Math.floor(mo.y / TS); if (regionAt(tx, ty).id === F.rid) return 0;
  const q = F.rect; if (!q) return 0; const dx = Math.max(q.x0 - mo.x, 0, mo.x - q.x1), dy = Math.max(q.y0 - mo.y, 0, mo.y - q.y1); return Math.max(8, Math.hypot(dx, dy));
}
const inRegion = (rid, x, y) => regionAt(Math.floor(x / TS), Math.floor(y / TS)).id === rid;

/* ---------- Chấn Thú của người chơi ---------- */
function elyE(ctx) { try { const e = ctx.elyz95; if (!e || !e.on || !e.on()) return null; const E = e.E && e.E(); return E && !E.ko ? E : null; } catch (e) { return null; } }
function c79F(ctx) { try { const c = ctx.comp79; if (!c || !c.out || !c.out() || !c.f) return null; return c.f() || null; } catch (e) { return null; } }
function team(ctx) { try { const d = ctx.chanthu && ctx.chanthu.ensure && ctx.chanthu.ensure(); return (d && d.team) || []; } catch (e) { return []; } }
function memberOf(ctx, who) { const t = team(ctx); if (typeof who === 'string' && who.slice(0, 2) === 'u:') return t.find(m => m && String(m.id) === who.slice(2)) || null; if (who === 'ely') return t.find(m => m && m.sp === 'elyziuma') || null; if (who === 'c79') { const f = c79F(ctx); return (f && t.find(m => m && m.sp === f.sp)) || t[0] || null; } return null; }
function legendOut(ctx) { if (elyE(ctx)) return true; const q = SQ(ctx); if (q && q.units().some(u => u.onField() && (u.sp === 'rocky' || u.sp === 'elyziuma' || (SPECIES[u.sp] && SPECIES[u.sp].rarity === 'huyen')))) return true; const f = c79F(ctx); if (!f) return false; const s = SPECIES[f.sp]; return f.sp === 'rocky' || !!(s && (s.rarity === 'huyen' || s.rare === 'huyen')); }
/* p104 squad104 (bộ quản lý nhiều Chấn Thú) có thì dùng API chung: units() · u.id / u.sp / u.pos() / u.onField() · hurt(u, d, src). Khoá công: 'u:<id>' */
const SQ = ctx => (ctx.squad104 && ctx.squad104.units ? ctx.squad104 : null);
function unitOf(ctx, who) { const q = SQ(ctx); if (!q || typeof who !== 'string' || who.slice(0, 2) !== 'u:') return null; const id = who.slice(2); return q.units().find(u => String(u.id) === id && u.onField()) || null; }
function unitAt(ctx, src) { const q = SQ(ctx); if (!q || !src) return null; for (const u of q.units()) { if (!u.onField()) continue; const P = u.pos(); if (P && Math.hypot(P.x - src.x, P.y - src.y) < 1.5) return u; } return null; }
function whoOfUnit(ctx, u) { return u.sp === 'elyziuma' ? 'ely' : 'u:' + u.id; }
function objOf(ctx, who) { if (isR(who)) return NET.peerObj ? NET.peerObj(who.slice(2)) : null; if (who === 'ely') return elyE(ctx); if (who === 'c79') return c79F(ctx); const u = unitOf(ctx, who); if (u) return u.f || u.pos(); if (typeof who === 'string' && who.slice(0, 2) === 'u:') return null; return ctx.S.player; }
const isComp = who => who !== 'pl';

/* ---------- sinh / hồi sinh ---------- */
function leadCfg(sp, rid) {
  const s = SPECIES[sp], he = heOf(sp);
  return { key: 'f106_' + sp, fct: sp, f106: rid, sky: true, vi: s ? s.name : sp, en: SPECIES_EN[sp] || (s ? s.name : sp), hp: 60, dmg: 0, armor: 0, sp: FLY[sp] ? 46 : AQUA[sp] ? 34 : 42, xp: 0, drop: 'stone',
    w: 16, h: HGT[(s && s.size) || 's'] || 18, c: [TYPE_COLOR[he] || '#9a6c48', '#352022', '#fff6c8'], aqua: !!(AQUA[sp] || WADE[sp]), fly: !!FLY[sp], shortHit: true,
    aiFn: aiF, drawFn: drawLead, onFall: onFallF, promptDy: 16 };
}
const CFG6 = {};   /* cấu hình quái thường đã lấy (hồi sinh dùng lại — spawnKind có lúc trả null giữa trận) */
function minCfg(ctx, key) { if (CFG6[key]) return { ...CFG6[key] }; const c = minCfg0(ctx, key); if (c) CFG6[key] = c; return c ? { ...c } : null; }
function minCfg0(ctx, key) {   /* cấu hình gốc của quái thường lấy qua monsters.spawnKind (như farm103), thay AI bằng AI bầy */
  const L = typeof window !== 'undefined' && window.__monsters; if (!L || !L.spawnKind) return null;
  const id = L.spawnKind(key, 0, 0); if (id == null) return null; const mo = ctx.monsters.list().find(o => o.id === id); if (!mo) return null;
  const c0 = mo.c; ctx.monsters.remove(mo);
  return { ...c0, ai: undefined, aiFn: aiF, drawFn: undefined, onFall: onFallF, steal: null, lurk: false, float: false, swim: false, boss: false, fct: key, f106m: true, sky: true, shortHit: true, aqua: !!(AQUA[key] || WADE[key]), fly: !!FLY[key] };
}
function hpOf(spec, lv, c) { if (spec.sp) { const s = SPECIES[spec.sp], b = s && s.base ? s.base[0] : 60; return Math.round((b * 0.6 + 12) * (1 + 0.12 * lv) * (spec.lead ? 1.6 : 1.15)); } return Math.round(Math.max(30, Math.min(110, (c.hp || 40) * 0.7)) * (1 + 0.06 * lv)); }
function spawnOne(ctx, rid, spec, avoidP) {
  const Z = ZR[rid], ct = !!spec.sp, lead = !!spec.lead, k = kindOf(spec.sp || spec.key), p = ctx.S.player; if (!ctx.monsters || !ctx.monsters.add) return null;
  const L0 = tileList(rid, k === 'aqua' ? 'aqua' : k === 'amph' ? 'amph' : 'land'); if (!L0.length) return null;
  const near = lead ? (t => nearLair(rid, t[0] * TS + 8, t[1] * TS + 12, LAIR_R)) : (t => !nearLair(rid, t[0] * TS + 8, t[1] * TS + 12, LAIR_AVOID) && inFront(rid, t[0] * TS + 8, t[1] * TS + 12));   /* p121: hang thủ lĩnh cuối bãi; quái thường ở đầu bãi */
  let q = null; const cand = near ? L0.filter(near) : L0, pool = cand.length >= 4 ? cand : L0;
  for (let i = 0; i < 50 && !q; i++) { const t = pick(pool), x = t[0] * TS + 8, y = t[1] * TS + 12; if (avoidP && Math.hypot(x - p.x, y - p.y) < 130) continue; if (k !== 'fly' && !body(ctx, x, y, k)) continue; if (ST.mons.some(o => Math.hypot(o.x - x, o.y - y) < 18)) continue; q = { x, y }; }
  if (!q) { ST.spFail = (ST.spFail || 0) + 1; log({ ev: 'spawnfail', rid, sp: spec.sp || spec.key, why: 'tile', pool: pool.length }); return null; }
  let c = ct ? leadCfg(spec.sp, rid) : minCfg(ctx, spec.key);
  if (!c && !ct) { const alt = (Z.mins || []).find(k2 => CFG6[k2]); if (alt) { c = minCfg(ctx, alt); spec = { key: alt }; } }   /* khoá lạ / spawnKind trả null → lấy loài quái thường khác của bầy đã có cấu hình */
  if (!c) { log({ ev: 'spawnfail', rid, spec: JSON.stringify(spec), why: 'cfg' }); return null; }
  const lv = ct ? spec.lv : Z.lv[0] + ((Math.random() * (Z.lv[1] - Z.lv[0] + 1)) | 0), mo = ctx.monsters.add(c, q.x, q.y), max = hpOf(spec, lv, c);
  mo.max = max; mo.hp = max; mo.fx = Math.random() < 0.5 ? -1 : 1; mo.angry = false;
  mo.f6 = { rid, sp: spec.sp || null, key: spec.key || null, lead, ct, lv, kind: k, he: ct ? heOf(spec.sp) : (MHE[spec.key] || 'chan'), mvs: ct ? movesOf(spec.sp) : (MKEY[spec.key] || []).slice(), mcd: ct ? {} : Object.fromEntries((MKEY[spec.key] || []).map(id => [id, R(2, 6)])), gcd: R(1, 2.5), tel: null, home: { x: q.x, y: q.y }, rect: rectOf(rid), mode: 'calm', goal: null, wait: R(0.3, 2.5), cd: { bite: 0, shot: R(1, 3) }, act: null, tg: 'pl', tgT: 0,
    prevHp: max, acc: 0, cr: {}, last: null, nearT: 0, stuck: 0, calmT: 0, backT: 0, fleeT: 0, fx: mo.fx, fy: 0.4, alt: lead && k === 'fly' ? 9 : 0, e: null, shotClip: null, ct0: Math.random() * 2, regen: 0 };   /* ct0: đồng hồ hoạt ảnh (khoá 'ct' là cờ Chấn Thú hoang) */
  ST.mons.push(mo); ST.n.spawn++; log({ ev: 'spawn', id: mo.id, sp: spec.sp || spec.key, lead, rid, lv, x: Math.round(q.x), y: Math.round(q.y) });
  return mo;
}
function spawnAll(ctx) { for (const [rid, Z] of Object.entries(ZR)) { spawnOne(ctx, rid, Z.lead, false); for (const s of Z.cts || []) spawnOne(ctx, rid, s, false); for (const key of Z.mins) spawnOne(ctx, rid, { key }, false); } }
function clearVanilla(ctx) {   /* Chũi / Cóc hoang cũ của fieldct + quái thường tự sinh của monsters.js trên Làng mới → thay bằng bầy theo vùng */
  if (!ctx.monsters) return; for (const o of ctx.monsters.list().slice()) if (o && o.c && !o.c.f106 && !o.c.f106m && !o.c.spar && !o.c.boss && !o.c.gang95 && !o.farm103 && !o.f6) { try { ctx.monsters.remove(o); } catch (e) { } }
}

/* ---------- ghi công sát thương (bọc ctx.monsters.damage; elyz95 / comp79 đặt mo.__by trước khi gọi — vá p106) ---------- */
function credit(mo, who, d) { const F = mo.f6; if (!F || !(d > 0)) return; F.cr[who] = (F.cr[who] || 0) + d; F.last = who; }
const WR106 = new WeakSet();   /* c2-raloi f106 */
function wrapDamage(ctx) {
  const M = ctx.monsters; if (!M || !M.damage || M.damage.__f106 || WR106.has(M)) return; WR106.add(M);
  const orig = M.damage, w = function (mo, dmg, src, ...r) {
    if (!(mo && mo.f6 && mo.hp > 0) || mo.__in106) return orig.call(this, mo, dmg, src, ...r);   /* c10-coop: đang trong 1 lớp bọc farm106 → lớp lồng chỉ cho đi qua (giữ đúng người ra đòn) */
    let by = mo.__by || null; mo.__by = null; if (!by) { const u = unitAt(ctx, src); by = u ? whoOfUnit(ctx, u) : 'pl'; }
    const hp0 = mo.hp; mo.__hp0 = hp0; mo.__by106 = by; mo.__in106 = true;
    try { provoke(ctx, mo, by, true); } catch (e) { }
    try { return orig.call(this, mo, dmg, src, ...r); } finally {
      mo.__in106 = false;
      if (!mo.dead && mo.f6) { const d = Math.max(0, hp0 - Math.max(0, mo.hp)); credit(mo, by, d); mo.f6.acc += d; }   /* máu mất THẬT của đòn này (hệ bọc damage có thể nhân sát thương) */
    }
  };
  w.__f106 = true; M.damage = w;
}
function residual(mo) {   /* máu mất mà không qua damage (kiếm người chơi đi qua monsters.strike) → công người chơi */
  const F = mo.f6, drop = F.prevHp - Math.max(0, mo.hp), res = drop - F.acc; F.acc = 0; F.prevHp = Math.max(0, mo.hp);
  if (res > 0.5) { credit(mo, 'pl', res); return true; } return false;
}

/* ---------- nổi giận / bầy / bỏ về / tan bầy ---------- */
function anger(o, tg, tgT, from) { const F = o.f6; if (F.mode === 'angry' || F.mode === 'flee') return false; F.mode = 'angry'; F.tg = tg; F.tgT = tgT; F.goal = null; F.wait = 0; F.calmT = 0; o.angry = true; ST.n.angry++; log({ ev: from ? 'pack' : 'angry', id: o.id, sp: F.sp || F.key, from }); return true; }
function provoke(ctx, mo, who, spread) {
  const F = mo.f6; if (!F || F.mode === 'flee') return;
  if (who !== 'pl') { F.tg = who; F.tgT = now() + CF.tauntT; } else if (!(F.tgT > now())) F.tg = 'pl';
  if (F.mode === 'return' && !inRegion(F.rid, mo.x, mo.y) && outDist(mo) > CF.leashOut) return;   /* đang bỏ về, còn ngoài ranh → không quay lại đuổi */
  F.calmT = 0; const was = F.mode === 'angry'; anger(mo, F.tg, F.tgT, null);
  if (!spread || was) return;
  if (F.lead) {   /* thủ lĩnh nổi giận → cả bầy */
    for (const o of ST.mons) if (o !== mo && o.f6 && o.hp > 0 && o.f6.rid === F.rid && anger(o, F.tg, F.tgT, mo.id)) ST.n.pack++;
    return;
  }
  let n = 0;
  for (const o of ST.mons.slice().sort((a, b) => hyp(a, mo) - hyp(b, mo))) {
    if (n >= CF.packN) break; if (o === mo || !o.f6 || o.hp <= 0 || o.f6.rid !== F.rid || hyp(o, mo) > CF.packR) continue;
    if (o.f6.lead) { const P = ctx.S.player; if (!(P && nearLair(F.rid, P.x, P.y, LAIR_AVOID))) continue; provoke(ctx, o, F.tg, true); n++; ST.n.pack++; continue; }   /* p121: ngoài hang → thủ lĩnh không bị kéo */   /* thủ lĩnh ở gần thấy đàn em bị đánh → nổi giận, kéo cả bầy */
    if (anger(o, F.tg, F.tgT, mo.id)) { n++; ST.n.pack++; }
  }
}
function calm(mo, why) { const F = mo.f6; F.mode = 'return'; F.goal = { x: F.home.x, y: F.home.y }; F.act = null; F.backT = 0; mo.angry = false; ST.n.back++; log({ ev: 'giveup', id: mo.id, why }); }
function scatter(ctx, rid, at) {   /* thủ lĩnh ngã → bầy tan: bỏ chạy khỏi chỗ thủ lĩnh ngã rồi về vùng, trung tính */
  let n = 0; for (const o of ST.mons) { const F = o.f6; if (!F || F.lead || F.rid !== rid || o.hp <= 0) continue; log({ ev: 'flee', id: o.id, x: Math.round(o.x), y: Math.round(o.y) }); F.mode = 'flee'; F.fleeT = CF.fleeT; F.act = null; F.from = { x: at.x, y: at.y }; F.cr = F.cr || {}; o.angry = true; n++;
    const L0 = tileList(rid, F.kind === 'aqua' ? 'aqua' : 'land').filter(q => Math.hypot(q[0] * TS + 8 - at.x, q[1] * TS + 12 - at.y) > 140 && !nearLair(rid, q[0] * TS + 8, q[1] * TS + 12, LAIR_AVOID)); const h = L0.length ? pick(L0) : null; if (h) F.home = { x: h[0] * TS + 8, y: h[1] * TS + 12 }; }   /* chỗ ở mới xa chỗ thủ lĩnh ngã */
  ST.n.scatter += n; log({ ev: 'scatter', rid, n });
  if (n) { try { FX.shout(at.x, at.y - 30, vi(ctx) ? 'BẦY TAN!' : 'PACK SCATTERS!', '#ffe9a0', 1, 0.9); } catch (e) { } }
}

/* ---------- di chuyển ---------- */
function setClip(F, c) { const e = F.e; if (e && e.clip !== c) { e.clip = c; e.ct = 0; } }
function face(F, x, y, mo) { const dx = x - mo.x, dy = y - mo.y, d = Math.hypot(dx, dy); if (d > 0.5) { F.fx = dx / d; F.fy = dy / d; mo.dir = dx >= 0 ? 1 : -1; } }
function hasClip(ctx, F, c) { const k = ctx && ctx.ldKit; return !!(k && F.e && k.has(F.e, c)); }
function idleClip(F) { return F.kind === 'fly' && hasClip(ST.ctx, F, 'fly') ? 'fly' : 'idle'; }
function step(ctx, mo, tx, ty, sp, dt) {
  const F = mo.f6, dx = tx - mo.x, dy = ty - mo.y, d = Math.hypot(dx, dy); if (d < 0.8) return 0;
  const s = Math.min(d, sp * dt), vx = dx / d * s, vy = dy / d * s; let mv = 0;
  if (body(ctx, mo.x + vx, mo.y, F.kind)) { mo.x += vx; mv += Math.abs(vx); } if (body(ctx, mo.x, mo.y + vy, F.kind)) { mo.y += vy; mv += Math.abs(vy); }
  F.fx = dx / d; F.fy = dy / d; mo.dir = dx >= 0 ? 1 : -1;
  if (!F.act) setClip(F, mv > 0.05 ? (F.kind === 'fly' && hasClip(ST.ctx, F, 'flymove') ? 'flymove' : 'run') : idleClip(F));
  return mv;
}
function wander(ctx, mo, dt) {
  const F = mo.f6; if (F.wait > 0) { F.wait -= dt; setClip(F, idleClip(F)); return; }
  if (!F.goal) {
    const L0 = tileList(F.rid, F.kind === 'aqua' || F.kind === 'amph' ? F.kind : 'land'), ld = null, c = F.lead ? (lairOf(F.rid) || mo) : (F.home || mo), rr = F.lead ? LAIR_R : 96;   /* p121: thủ lĩnh ở hang; quái thường không lang thang quanh thủ lĩnh */   /* quái thường lang thang quanh thủ lĩnh */
    for (let i = 0; i < 16 && !F.goal; i++) { const t = pick(L0); if (!t) break; const x = t[0] * TS + 8, y = t[1] * TS + 12; if (Math.hypot(x - c.x, y - c.y) > rr || Math.hypot(x - mo.x, y - mo.y) > 120) continue; if (!F.lead && nearLair(F.rid, x, y, LAIR_AVOID)) continue; if (F.kind !== 'fly' && !body(ctx, x, y, F.kind)) continue; F.goal = { x, y }; }
    if (!F.goal) { if (ld && hyp(mo, ld) > CF.roam && F.kind !== 'aqua') F.goal = { x: ld.x + R(-20, 20), y: ld.y + R(-12, 12) }; else { F.wait = 0.5; return; } }
  }
  const mv = step(ctx, mo, F.goal.x, F.goal.y, mo.c.sp * 0.45, dt);
  if (hyp(mo, F.goal) < 2 || mv < 0.01) { F.goal = null; F.wait = R(1.2, 3.6); setClip(F, idleClip(F)); }
}

/* ---------- đánh ---------- */
function lvDmg(F) { return (3 + F.lv * 0.6) * (F.lead ? 1.3 : F.ct ? 1.1 : 0.8); }
function hurtTarget(ctx, mo, who, d) {
  d = Math.max(1, d);
  if (isR(who)) { if (NET.hurt) NET.hurt(who.slice(2), Math.round(d), mo); ST.n.hitR = (ST.n.hitR || 0) + 1; return true; }   /* c10-coop */
  if (who === 'pl') {
    const h = ctx.hero; if (!h || h.fainted) return false;
    if (legendOut(ctx)) { const max = h.max || 100, hp = h.hp == null ? max : h.hp, fl = Math.ceil(max * CF.floorP); const d2 = Math.min(d, Math.max(0, hp - fl)); if (d2 < d) ST.n.floor++; d = d2; }
    if (d >= 1) { try { h.hit(Math.round(d)); } catch (e) { } } ST.n.hitP++; return true;
  }
  const u = unitOf(ctx, who);
  if (u && who !== 'ely') { const max = u.max || (u.f && u.f.max) || 100, hp = u.hp == null ? max : u.hp,   /* c2-raloi f106: máu ngoài map */  d2 = Math.min(Math.round(d * 1.5), Math.max(0, hp - Math.round(max * CF.floorC))); if (d2 >= 1) { try { SQ(ctx).hurt(u, d2, mo); } catch (e) { } } ST.n.hitC++; return true; }   /* squad104: đòn vào Chấn Thú qua hurt() chung, giữ sàn 25 % */
  const o = objOf(ctx, who); if (!o) return false; const max = o.max || o.hp || 100;
  o.hp = Math.max(Math.round(max * CF.floorC), (o.hp == null ? max : o.hp) - Math.round(d * 1.5)); o.flash = 0.12; ST.n.hitC++; return true;
}
function startAct(mo, id, T0, imp, extra) { const F = mo.f6; F.act = { id, t: 0, T: T0, imp, done: false, ...extra }; if (NET.fx) NET.fx(mo, F.act); }
function shotClip(ctx, F) { if (!F.sp) return null; if (F.shotClip !== null) return F.shotClip; if (!ctx.ldKit || !ctx.ldKit.ready() || !F.e) return null; F.shotClip = SHOT_CLIPS.find(c => ctx.ldKit.has(F.e, c)) || (ctx.ldKit.has(F.e, 'atk') ? 'atk' : 'idle'); return F.shotClip; }
function skin(F) { return FX.skinOf(F.sp || 'utchan', F.he); }
function updAct(ctx, mo, dt) {
  const F = mo.f6, A = F.act, T = objOf(ctx, A.who); A.t += dt;
  if (T && !(A.id === 'mv' && A.P)) face(F, T.x, T.y, mo); else if (A.P && !A.dash) face(F, A.P.x, A.P.y, mo);
  if (!A.done && A.t >= A.imp) {
    A.done = true;
    if (A.id === 'bite') { if (T && hyp(T, mo) <= CF.bite + 6) { hurtTarget(ctx, mo, A.who, lvDmg(F)); try { FX.bite(T.x, T.y, 8, skin(F), FX.power(F.lead ? 0.3 : 0.18)); } catch (e) { } ST.n.bite++; } }
    else if (A.id === 'shot' && T) fire(ctx, mo, A.who, T);
    else if (A.id === 'mv') resolveMv(ctx, mo, A);
  }
  if (A.id === 'mv' && A.dash) dashTick(ctx, mo, A, dt);
  if (A.t >= A.T) { F.act = null; setClip(F, idleClip(F)); }
}
function mvName(ctx, sp) { const s = SPECIES[sp], id = s && s.moves && s.moves[0]; if (!id) return null; return vi(ctx) ? (MOVES[id] && MOVES[id].name) || id : MOVE_NAME_EN[id] || (MOVES[id] && MOVES[id].name) || id; }
function fire(ctx, mo, who, T, isMv, slow) {
  const F = mo.f6, H = hOf(mo), o = { x: mo.x + F.fx * 6, y: mo.y, z: F.alt + H * 0.5 }, dx = T.x - o.x, dy = T.y - o.y, d = Math.hypot(dx, dy) || 1, tz = who === 'pl' ? 10 : 12;   /* gốc đạn ở miệng (≈ nửa thân, phía trước) */
  ST.shots.push({ small: !F.sp, slow: !!slow, x: o.x, y: o.y, z: o.z, vx: dx / d * CF.shotV, vy: dy / d * CF.shotV, vz: (tz - o.z) / (d / CF.shotV), t: 0, T: Math.min(1.6, d / CF.shotV + 0.5), he: F.he, sp: F.sp, who, mo, ky: dy < 0 ? -0.5 : 0.5, sy: mo.y });
  try { FX.muzzle(o.x, o.y, o.z, skin(F), FX.power(0.2), dx / d, dy / d); } catch (e) { }
  const nm = isMv ? null : mvName(ctx, F.sp); if (nm && (F.shoutT || 0) < now()) { F.shoutT = now() + 6; try { FX.shout(mo.x, mo.y - H - 10, nm.toUpperCase(), '#ffe9a0', 0.8, 0.8); } catch (e) { } }   /* tên chiêu thật, tối đa 1 lần / 6 s */
  try { if (globalThis.__sfx108) globalThis.__sfx108.move(ctx, SPECIES[F.sp] && SPECIES[F.sp].moves[0], 'cast', mo.x, mo.y, { type: F.he, vol: 0.7 }); } catch (e) { }   /* p108 */
  ST.n.shot++; log({ ev: 'shot', id: mo.id, mv: (SPECIES[F.sp] && SPECIES[F.sp].moves[0]) || 'shot', who });
}
function slowP(ctx) {   /* Phun Nhớt: chậm 1,5 s — ghi đè tạm p.update (luật 14/10: không ghi p.speedMul) */
  const p = ctx.S.player; if (!p || p.__slow106) { if (p) p.__slow106 = now() + 1.5; return; } p.__slow106 = now() + 1.5; const ox = p.x, oy = p.y; let lx = ox, ly = oy;
  const tick = () => { if (!p.__slow106 || now() > p.__slow106 || !ST.on) { delete p.__slow106; return; } const dx = p.x - lx, dy = p.y - ly; if (Math.hypot(dx, dy) < 20) { p.x = lx + dx * 0.55; p.y = ly + dy * 0.55; } lx = p.x; ly = p.y; requestAnimationFrame(tick); };
  void ox; void oy; requestAnimationFrame(tick); ST.n.slow = (ST.n.slow || 0) + 1; try { FX.shout(p.x, p.y - 30, vi(ctx) ? 'chậm' : 'slowed', '#a3de5f', 0.6, 0.6); } catch (e) { } }
function updShots(ctx, dt) {
  for (const b of ST.shots) {
    b.t += dt; b.x += b.vx * dt; b.y += b.vy * dt; b.z = Math.max(1, b.z + b.vz * dt);
    const T = objOf(ctx, b.who), P = ctx.S.player;
    const hitT = T && Math.hypot(T.x - b.x, T.y - b.y) < 9 ? b.who : (b.who !== 'pl' && Math.hypot(P.x - b.x, P.y - b.y) < 7 ? 'pl' : null);
    if (hitT && b.vis) { b.dead = true; try { FX.impact(b.x, b.y, b.z, FX.skinOf(b.sp, b.he), FX.power(0.2), { n: 3 }); } catch (e) { } continue; }   /* c10-coop: đạn bóng của khách */
    if (hitT) { b.dead = true; if (b.mo && b.mo.f6) hurtTarget(ctx, b.mo, hitT, lvDmg(b.mo.f6) * 1.2); try { if (globalThis.__sfx108) globalThis.__sfx108.move(ctx, SPECIES[b.sp] && SPECIES[b.sp].moves[0], 'hit', b.x, b.y, { type: b.he, vol: 0.7 }); } catch (e) { } if (b.slow && hitT === 'pl') slowP(ctx); try { FX.impact(b.x, b.y, b.z, FX.skinOf(b.sp, b.he), FX.power(0.25), { n: 4 }); } catch (e) { } try { if (ctx.envfx) ctx.envfx.hit(b.x, b.y, 9, b.he, 0.6); } catch (e) { }   /* p105w-hit */ continue; }
    const tx = Math.floor(b.x / TS), ty = Math.floor(b.y / TS);
    if (b.t > b.T || (ctx.isSolid(ctx.S.map, tx, ty) && ctx.getG(ctx.S.map, tx, ty) !== TT.WATER)) { b.dead = true; try { FX.impact(b.x, b.y, b.z, FX.skinOf(b.sp, b.he), FX.power(0.12), { n: 2 }); } catch (e) { } try { if (ctx.envfx) ctx.envfx.hit(b.x, b.y, 8, b.he, 0.4); } catch (e) { }   /* p105w-miss */ }
  }
  ST.shots = ST.shots.filter(b => !b.dead);
}
function fight(ctx, mo, dt, canHit) {
  const F = mo.f6;
  if (isR(F.tg)) { const q = objOf(ctx, F.tg); if (q && hyp(q, mo) < 220) F.tgT = Math.max(F.tgT || 0, now() + 1); }   /* c10-coop */
  if (F.tg !== 'pl' && !(F.tgT > now() && objOf(ctx, F.tg))) F.tg = 'pl';
  const who = F.tg, T = objOf(ctx, who);
  if (!T || (who === 'pl' && !canHit)) { F.calmT += dt; if (F.calmT > 2) calm(mo, 'notarget'); else setClip(F, idleClip(F)); return; }
  const od = outDist(mo), dh = hyp(mo, F.home), d = hyp(mo, T);
  if (od > CF.leashOut || dh > CF.leashHome) { calm(mo, od > CF.leashOut ? 'out' : 'far'); return; }
  if (d > 220) { F.calmT += dt; if (F.calmT > 3) { calm(mo, 'lost'); return; } } else F.calmT = 0;
  if (F.mvs.length && F.gcd <= 0 && tryCast(ctx, mo, T, who, d)) return;   /* Chấn Thú: chiêu thật của loài (báo trước trên đất) */
  const sc = shotClip(ctx, F), canShot = !F.mvs.length && F.cd.shot <= 0 && sc && ((d >= CF.shotMin && d <= CF.shotMax) || (F.stuck > 1.2 && d <= CF.shotMax + 20) || (F.kind === 'aqua' && d > CF.bite && d <= CF.shotMax + 20));
  if (canShot) { F.cd.shot = R(3.2, 4.6); F.stuck = 0; startAct(mo, 'shot', 0.75, 0.4, { who }); setClip(F, sc); face(F, T.x, T.y, mo); return; }
  if (d <= CF.bite && F.cd.bite <= 0) { F.cd.bite = R(1.3, 1.7) * (F.lead ? 1 : 1.2); startAct(mo, 'bite', 0.6, 0.32, { who }); setClip(F, hasClip(ctx, F, 'atk') ? 'atk' : idleClip(F)); face(F, T.x, T.y, mo); return; }
  if (F.kind === 'aqua' && d > CF.bite) {   /* cá: không lên bờ được → bơi dọc nước về phía mục tiêu (không có chiêu xa: chờ ở mép nước) */
    step(ctx, mo, T.x, T.y, mo.c.sp, dt); return;
  }
  if (d > CF.near) {   /* bước tới (> 16 px) — đánh khi ≤ 20 px → không vùng chết */
    const sp = F.lead ? Math.max(mo.c.sp * 1.25, 64) : Math.max(mo.c.sp * 1.3, 58), want = sp * dt, mv = step(ctx, mo, T.x - (T.x > mo.x ? 10 : -10), T.y + 1, sp, dt);
    F.stuck = mv < want * 0.25 ? F.stuck + dt : Math.max(0, F.stuck - dt);
    if (F.stuck > 2.5 && !F.lead) { const a = Math.random() * Math.PI * 2; F.goal = null; mo.x += Math.cos(a) * 2; mo.y += Math.sin(a) * 2; if (!body(ctx, mo.x, mo.y, F.kind)) { mo.x -= Math.cos(a) * 2; mo.y -= Math.sin(a) * 2; } }
  } else { face(F, T.x, T.y, mo); setClip(F, idleClip(F)); F.stuck = 0; }
}
function goHome(ctx, mo, dt) {
  const F = mo.f6; F.backT += dt;
  const mv = step(ctx, mo, F.home.x, F.home.y, mo.c.sp * 1.2, dt);
  if (hyp(mo, F.home) < 12 || (inRegion(F.rid, mo.x, mo.y) && F.backT > 2.5) || (mv < 0.01 && F.backT > 4)) {
    if (!inRegion(F.rid, mo.x, mo.y) || (F.kind === 'aqua' && !walkPx(ctx, mo.x, mo.y, 'aqua'))) { mo.x = F.home.x; mo.y = F.home.y; }
    F.mode = 'calm'; F.goal = null; F.wait = R(0.5, 1.5); F.regen = 4; F.cr = {}; F.tg = 'pl'; F.tgT = 0; ST.n.calm++; log({ ev: 'calm', id: mo.id });
  }
}
function flee(ctx, mo, dt) {
  const F = mo.f6; F.fleeT -= dt; const s = F.from || ctx.S.player, dx = mo.x - s.x, dy = mo.y - s.y, d = Math.hypot(dx, dy) || 1;
  const hx = F.home.x - mo.x, hy = F.home.y - mo.y, hd = Math.hypot(hx, hy) || 1, ux = dx / d * 0.6 + hx / hd * 0.4, uy = dy / d * 0.6 + hy / hd * 0.4;   /* chạy khỏi chỗ thủ lĩnh ngã, lệch về chỗ ở mới */
  const sp = Math.max(mo.c.sp * 1.6, 62), mv = step(ctx, mo, mo.x + ux * 40, mo.y + uy * 40, sp, dt);
  if (mv < sp * dt * 0.2) step(ctx, mo, F.home.x, F.home.y, sp, dt);   /* bị chặn → chạy thẳng về chỗ ở mới */
  if (F.fleeT <= 0) calm(mo, 'scatter');
}

/* ---------- CHIÊU THẬT của Chấn Thú hoang (anh 02/11): 2–4 chiêu / loài, báo trước trên đất ---------- */
const SH = { dan: 'dan', doi: 'dan', tia: 'tia', hang: 'tia', vung: 'vung', lob: 'vung', quanh: 'quanh', can: 'lao', hu: 'hu' };
const TEL = { dan: 0.45, tia: 0.65, vung: 0.85, quanh: 0.75, lao: 0.6, hu: 0.5 }, MUL = { dan: 1.2, tia: 1.4, vung: 1.4, quanh: 1.2, lao: 1.5, hu: 0 };
const RNG = { dan: [30, 115], tia: [26, 120], vung: [0, 105], quanh: [0, 38], lao: [24, 90], hu: [0, 200] };
/* chiêu nhỏ của quái thường (anh 02/11): dạng dùng chung engine (dan / vung / quanh / lao) + 'hu' (hú gọi bầy); r = bán kính vùng nhỏ */
const MM = {
  m_nhot: { vi: 'Phun Nhớt', en: 'Slime Spit', shape: 'dan', type: 'moc', cd: 9, slow: 1 },
  m_lao_can: { vi: 'Lao Cắn', en: 'Lunge Bite', shape: 'can', type: 'anh', cd: 9, len: 70 }, m_hu: { vi: 'Hú Gọi Bầy', en: 'Pack Howl', shape: 'hu', type: 'anh', cd: 15 },
  m_bo_nhao: { vi: 'Bổ Nhào Mổ', en: 'Dive Peck', shape: 'can', type: 'phong', cd: 9, len: 80 },
  m_tha_trung: { vi: 'Thả Trứng', en: 'Egg Drop', shape: 'vung', type: 'phong', cd: 10, r: 14 }, m_lao_xuong: { vi: 'Lao Xuống', en: 'Swoop', shape: 'can', type: 'phong', cd: 12, len: 80 },
  m_bot: { vi: 'Bắn Bọt', en: 'Bubble Shot', shape: 'dan', type: 'trieu', cd: 8 }, m_kep: { vi: 'Kẹp Càng', en: 'Pincer', shape: 'can', type: 'trieu', cd: 10, len: 44 },
  m_no_gai: { vi: 'Phồng Gai Nổ', en: 'Spike Burst', shape: 'quanh', type: 'trieu', cd: 11, r: 26 }, m_gai_ban: { vi: 'Bắn Gai', en: 'Spine Shot', shape: 'dan', type: 'trieu', cd: 10 },
  m_dien_vong: { vi: 'Phóng Điện Vòng', en: 'Shock Ring', shape: 'quanh', type: 'loi', cd: 10, r: 30 }, m_tia_dien: { vi: 'Tia Điện', en: 'Zap', shape: 'dan', type: 'loi', cd: 12 },
  m_nem_da: { vi: 'Ném Đá', en: 'Rock Toss', shape: 'vung', type: 'chan', cd: 10, r: 16 }, m_dam_dat: { vi: 'Dậm Đất', en: 'Stomp', shape: 'quanh', type: 'chan', cd: 13, r: 28 },
  m_chich: { vi: 'Chích Độc', en: 'Venom Sting', shape: 'can', type: 'chan', cd: 10, len: 50 }, m_phun_cat: { vi: 'Phun Cát', en: 'Sand Spit', shape: 'dan', type: 'chan', cd: 11 },
};
const MKEY = { slime: ['m_nhot'], wolf: ['m_lao_can', 'm_hu'], crow: ['m_bo_nhao'], gull: ['m_tha_trung', 'm_lao_xuong'], crab: ['m_kep', 'm_bot'], puffer: ['m_gai_ban', 'm_no_gai'], eel: ['m_dien_vong', 'm_tia_dien'], rockimp: ['m_nem_da', 'm_dam_dat'], scorpion: ['m_chich', 'm_phun_cat'] };
const MHE = { slime: 'moc', wolf: 'anh', crow: 'phong', gull: 'phong', crab: 'trieu', puffer: 'trieu', eel: 'loi', rockimp: 'chan', scorpion: 'chan' };
const mvOf = id => MOVES[id] || (MM[id] && { ...MM[id], name: MM[id].vi });
function movesOf(sp) { const s = SPECIES[sp]; if (!s || !s.moves) return []; const out = []; for (const id of s.moves) { const m = MOVES[id]; if (!m || !SH[m.shape]) continue; out.push(id); if (out.length >= 4) break; } return out; }
function mvCd(id) { if (MM[id]) return MM[id].cd * R(0.9, 1.2); const m = MOVES[id]; return Math.max(3, Math.min(m && m.ult ? 16 : 10, ((m && m.cd) || 4) * 1.3)); }
function targets(ctx) { const out = [{ who: 'pl', o: ctx.S.player }]; if (NET.role === 'host' && NET.peers) for (const q of NET.peers()) out.push(q); const q = SQ(ctx); if (q) { for (const u of q.units()) if (u.onField()) { const w = whoOfUnit(ctx, u), o = objOf(ctx, w); if (o) out.push({ who: w, o }); } } else { const E = elyE(ctx), f = c79F(ctx); if (E) out.push({ who: 'ely', o: E }); if (f) out.push({ who: 'c79', o: f }); } return out; }
function tryCast(ctx, mo, T, who, d) {
  const F = mo.f6; if (!F.mvs.length) return false;
  const wet = F.he === 'trieu', big = id => F.lead && wet && mvOf(id).ult, shOf = id => (big(id) ? 'vung' : SH[mvOf(id).shape]), ex = wet ? 25 : 0, mn = !F.sp;   /* hệ Triều (anh 02/11): chiêu nước nhiều, tầm xa hơn; tuyệt chiêu của thủ lĩnh nước = CỘT NƯỚC lớn tại chỗ mục tiêu */
  const p = ctx.S.player, dp = hyp(mo, p), inR = (q, id) => { const s = shOf(id), r = RNG[s], m = mvOf(id), rq = s === 'quanh' && m.r ? m.r + 6 : r[1] + (s === 'quanh' ? 0 : ex); return q.d >= r[0] && q.d <= (mn && s !== 'quanh' ? Math.min(rq, 95) : rq) && !(F.kind === 'aqua' && s === 'lao'); };
  F.castN = (F.castN || 0) + 1; const toP = { who: 'pl', T: p, d: dp }, toT = { who, T, d }, wantP = who === 'pl' || (dp <= 150 && F.castN % 2 === 1);   /* luân phiên: 1 chiêu nhắm thẳng người chơi, 1 chiêu nhắm kẻ đang đánh nó */
  const pref = wantP && F.mvs.some(id => (F.mcd[id] || 0) <= 0 && inR(toP, id)) ? toP : toT;
  const ok0 = F.mvs.filter(id => (F.mcd[id] || 0) <= 0 && inR(pref, id)), okW = ok0.filter(id => mvOf(id).type === 'trieu'), ok = wet && okW.length ? okW.sort((a, b) => (big(b) ? 1 : 0) - (big(a) ? 1 : 0)) : ok0;
  if (!ok.length) { F.castN--; return false; }
  const lk = pref.who === 'pl' ? 'lastP' : 'lastO', id = (ok[0] && big(ok[0]) ? ok[0] : null) || ok.find(x => x !== F[lk]) || ok[0], s = shOf(id), bigMv = big(id), tg = pref.T, P = s === 'quanh' ? { x: mo.x, y: mo.y } : { x: tg.x, y: tg.y };
  F[lk] = id; F.mcd[id] = mvCd(id); F.gcd = R(CF.gcd[0], CF.gcd[1]) * (F.lead ? 0.85 : 1) * (wet ? 0.8 : 1) * (mn ? 1.6 : 1);
  const tel = bigMv ? 1.1 : TEL[s] * (F.lead ? 0.9 : mn ? 0.85 : 1), dx = P.x - mo.x, dy = P.y - mo.y, dd = Math.hypot(dx, dy) || 1;
  const M0 = mvOf(id), A = { id: 'mv', mv: id, shape: s, who: pref.who, P, ux: dx / dd, uy: dy / dd, t: 0, imp: tel, T: tel + (s === 'lao' ? 0.45 : 0.35), done: false, len: s === 'tia' ? 128 : s === 'lao' ? Math.min(M0.len || 110, dd + 16) : 0, r: bigMv ? 38 : M0.r || (s === 'vung' ? 24 : s === 'quanh' ? 38 : s === 'hu' ? 20 : 0), big: bigMv, wet, mn, slow: !!M0.slow };
  F.act = A; F.tel = A; if (NET.fx) NET.fx(mo, A); setClip(F, s === 'lao' ? (hasClip(ctx, F, 'atk') ? 'atk' : 'run') : (shotClip(ctx, F) || 'idle')); if (F.e) F.e.ct = 0; face(F, P.x, P.y, mo);
  const nm = MM[id] ? (vi(ctx) ? MM[id].vi : MM[id].en) : vi(ctx) ? (MOVES[id].name || id) : (MOVE_NAME_EN[id] || MOVES[id].name || id);
  if ((F.shoutT || 0) < now()) { F.shoutT = now() + 3.5; try { FX.shout(mo.x, mo.y - hOf(mo) - 10, mn ? nm : nm.toUpperCase(), F.lead ? '#ffe9a0' : mn ? '#f0e0d0' : '#ffd0b0', mn ? 0.6 : 0.75, mn ? 0.6 : 0.75); } catch (e) { } }   /* quái thường: tên chiêu nhỏ hơn */
  try { S108.at(ctx, F.he + '_cast', mo.x, mo.y, { vol: mn ? 0.45 : 0.7 }); } catch (e) { }
  ST.n.cast = (ST.n.cast || 0) + 1; log({ ev: 'cast', id: mo.id, sp: F.sp || F.key, mn, he: F.he, mv: id, ty: mvOf(id).type, shape: s, big: bigMv, who: pref.who, tel: +tel.toFixed(2), lead: F.lead });
  return true;
}
function inArea(A, mo, o) {
  if (A.shape === 'vung' || A.shape === 'quanh') { const c = A.shape === 'quanh' ? mo : A.P; return Math.hypot((o.x - c.x) / A.r, (o.y - c.y) / (A.r * 0.7)) <= 1; }
  if (A.shape === 'tia') { const ax = A.ox, ay = A.oy, bx = ax + A.ux * A.len, by = ay + A.uy * A.len, dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy || 1, k = Math.max(0, Math.min(1, ((o.x - ax) * dx + (o.y - ay) * dy) / l2)); return Math.hypot(o.x - (ax + dx * k), o.y - (ay + dy * k)) <= 10; }
  return false;
}
function resolveMv(ctx, mo, A) {
  const F = mo.f6, sk = skin(F), dm = lvDmg(F) * MUL[A.shape] * (A.big ? 1.6 : 1);
  if (A.shape === 'dan') { const T = A.who === 'pl' ? ctx.S.player : objOf(ctx, A.who); if (T) fire(ctx, mo, A.who, T, true, A.slow); return; }
  if (A.shape === 'lao') { A.dash = { t: 0, hit: false, x0: mo.x, y0: mo.y }; return; }
  if (A.shape === 'hu') { let n = 0; for (const o of ST.mons) if (o !== mo && o.f6 && o.hp > 0 && o.f6.rid === F.rid && hyp(o, mo) < 160 && anger(o, F.tg, F.tgT, mo.id)) n++; ST.fx6.push({ k: 'burst', t: 0, T: 0.4, x: mo.x, y: mo.y, r: 20, he: F.he }); try { FX.shockRing(mo.x, mo.y, 26, sk, 0.35, 2); } catch (e) { } log({ ev: 'mvhit', id: mo.id, mv: A.mv, shape: 'hu', n }); return; }   /* Hú Gọi Bầy: gọi con cùng bầy trong 160 px */
  if (A.shape === 'tia') { const H = hOf(mo); A.ox = mo.x + A.ux * 6; A.oy = mo.y; A.oz = (F.alt || 0) + H * 0.5; ST.fx6.push({ k: 'beam', t: 0, T: A.wet ? 0.42 : 0.3, wet: A.wet, x: A.ox, y: A.oy, z: A.oz, ux: A.ux, uy: A.uy, len: A.len, he: F.he, sy: mo.y, ky: A.uy < 0 ? -0.5 : 0.5 }); try { FX.muzzle(A.ox, A.oy, A.oz, sk, FX.power(0.3), A.ux, A.uy); } catch (e) { } }
  else { const c = A.shape === 'quanh' ? { x: mo.x, y: mo.y } : A.P; if (ctx.envfx && ctx.envfx.floodMv) { try { ctx.envfx.floodMv(A.mv, SPECIES[F.sp] && SPECIES[F.sp].types ? SPECIES[F.sp].types[0] : F.he, c.x, c.y, 88, 24, 'f106:' + F.sp + ':' + A.mv); } catch (e) { } }   /* p105w-flood: CHỈ chiêu nước lớn trong danh sách (Thuỷ Triều Dâng…) của loài hệ Triều → NGẬP (anh chốt 02/11) */ ST.fx6.push({ k: 'burst', t: 0, T: A.big ? 0.6 : 0.35, x: c.x, y: c.y, r: A.r, he: F.he, wet: A.wet, big: A.big }); try { FX.impact(c.x, c.y, 2, sk, FX.power(A.big ? 0.9 : A.wet ? 0.55 : 0.35), { n: A.wet ? 9 : 5, big: A.big }); if (A.wet) FX.shockRing(c.x, c.y, A.r, sk, A.big ? 0.5 : 0.32, A.big ? 4 : 3); if (A.big && ctx.quake) ctx.quake(0.25); } catch (e) { } }
  let n = 0; for (const tg of targets(ctx)) if (inArea(A, mo, tg.o)) { hurtTarget(ctx, mo, tg.who, dm); n++; if (tg.who === 'pl') ST.n.mvHitP = (ST.n.mvHitP || 0) + 1; }
  if (n) { try { S108.at(ctx, F.he + '_hit', A.P ? A.P.x : mo.x, A.P ? A.P.y : mo.y, { vol: A.mn ? 0.4 : 0.65 }); } catch (e) { } }
  log({ ev: 'mvhit', id: mo.id, mv: A.mv, shape: A.shape, n });
}
function dashTick(ctx, mo, A, dt) {
  const F = mo.f6, D = A.dash; D.t += dt; if (D.t > 0.32 || Math.hypot(mo.x - D.x0, mo.y - D.y0) >= A.len) { if (!D.end) { D.end = true; if (F.e) { F.e.clip = idleClip(F); F.e.ct = 0; } } return; }
  const st = 340 * dt, nx = mo.x + A.ux * st, ny = mo.y + A.uy * st; if (body(ctx, nx, ny, F.kind)) { mo.x = nx; mo.y = ny; } else D.t = 1;
  if ((D.n = (D.n || 0) + 1) % 2) ST.fx6.push({ k: 'trail', t: 0, T: 0.25, x: mo.x, y: mo.y, he: F.he });
  if (!D.hit) for (const tg of targets(ctx)) if (Math.hypot(tg.o.x - mo.x, tg.o.y - mo.y) < 14) { D.hit = true; hurtTarget(ctx, mo, tg.who, lvDmg(F) * MUL.lao); try { FX.impact(tg.o.x, tg.o.y, 9, skin(F), FX.power(0.35), { n: 5 }); } catch (e) { } if (tg.who === 'pl') ST.n.mvHitP = (ST.n.mvHitP || 0) + 1; log({ ev: 'mvhit', id: mo.id, mv: A.mv, shape: 'lao', n: 1 }); break; }
}
/* báo trước trên đất (lớp nền): vòng / dải / mũi tên dither đỏ cam lấp dần theo thời gian — đọc rõ để né (điện thoại) */
const WARN = ['#ffd0a0', '#ff8a4a', '#e84a3a', '#7a1c16'];
function drawTel(g, mo, A, cx, cy) {
  const k = Math.min(1, A.t / A.imp), P = PAL_SRC[mo.f6.he] || PAL_SRC.chan;
  if (A.shape === 'vung' || A.shape === 'quanh' || A.shape === 'hu') {
    const c = A.shape === 'vung' ? A.P : mo, X = Math.round((c.x - cx) * 2), Y = Math.round((c.y - cy) * 2), R = A.r * 2, Ry = R * 0.7;
    for (let j = -Ry - 1; j <= Ry + 1; j++) for (let i = -R - 1; i <= R + 1; i++) { const e = Math.hypot(i / R, j / Ry); if (e > 1.02) continue; const X2 = X + i, Y2 = Y + j;
      if (e > 0.9) dot(g, X2, Y2, (X2 + Y2) & 1 ? WARN[2] : WARN[3]); else if (e < k && bay(X2, Y2) < 0.38) dot(g, X2, Y2, e > k - 0.12 ? WARN[1] : P[3]); }
    return;
  }
  const ox = mo.x + A.ux * 6, oy = mo.y, L = A.shape === 'tia' ? A.len : A.len, W = A.shape === 'tia' ? 9 : 7, nx = -A.uy, ny = A.ux;
  for (let s = 0; s <= L * 2; s++) for (let w = -W; w <= W; w++) { const X2 = (globalThis.__R89||Math.round)((ox - cx) * 2 + A.ux * s + nx * w), Y2 = (globalThis.__R89||Math.round)((oy - cy) * 2 + A.uy * s + ny * w * 0.7); const edge = Math.abs(w) >= W - 0.5;
    if (edge) { if ((s & 3) < 2) dot(g, X2, Y2, WARN[2]); } else if (s / (L * 2) < k && bay(X2, Y2) < 0.32) dot(g, X2, Y2, s / (L * 2) > k - 0.1 ? WARN[1] : P[3]); }
  if (A.shape === 'lao') { const tx = Math.round((ox - cx) * 2 + A.ux * L * 2), ty = Math.round((oy - cy) * 2 + A.uy * L * 2); for (let i = 0; i < 7; i++) for (const sgn of [-1, 1]) dot(g, Math.round(tx - A.ux * i + nx * sgn * i * 0.8), Math.round(ty - A.uy * i + ny * sgn * i * 0.56), WARN[2]); }   /* mũi tên đầu dải lao */
}
function updFx6(dt) { for (const f of ST.fx6) f.t += dt; ST.fx6 = ST.fx6.filter(f => f.t < f.T); }
function drawFx6(g, f, cx, cy) {
  const P = PAL_SRC[f.he] || PAL_SRC.chan, k = f.t / f.T, a = 1 - k;
  if (f.k === 'beam') { const X0 = (f.x - cx) * 2, Y0 = (f.y - f.z - cy) * 2, L = f.len * 2 * Math.min(1, f.t / 0.08), nx = -f.uy, ny = f.ux;   /* tia mọc từ miệng ra (0,08 s) rồi tắt bằng dither */
    const WW = f.wet ? 6 : 4; for (let s = 0; s <= L; s++) for (let w = -WW; w <= WW; w++) { const X2 = Math.round(X0 + f.ux * s + nx * w), Y2 = Math.round(Y0 + f.uy * s + ny * w * 0.7 + (f.z * 2) * (s / Math.max(1, f.len * 2)) * 0); const aw = Math.abs(w); if (a < bay(X2, Y2) * (aw > 2 ? 1.6 : 1)) continue; dot(g, X2, Y2, aw <= 1 ? P[0] : aw <= (f.wet ? 3 : 2) ? P[2] : P[4]); }
    if (f.wet) for (let i = 0; i < 10; i++) { const s = (i * 37 % 100) / 100 * L, sp = (k * 14 + i * 3) % 9, X2 = Math.round(X0 + f.ux * s + nx * (i % 2 ? sp : -sp)), Y2 = Math.round(Y0 + f.uy * s - sp * 0.8); if (a > bay(X2, Y2)) { dot(g, X2, Y2, P[1]); dot(g, X2 + 1, Y2, P[0]); } }   /* giọt nước bắn ra hai bên tia */
    return; }
  if (f.k === 'burst') { const X = Math.round((f.x - cx) * 2), Y = Math.round((f.y - cy) * 2), R = f.r * 2 * (0.5 + 0.5 * k), Ry = R * 0.7;
    for (let j = -Ry; j <= Ry; j++) for (let i = -R; i <= R; i++) { const e = Math.hypot(i / R, j / Ry); if (e > 1 || e < 0.55 * k) continue; if (a < bay(X + i, Y + j)) continue; dot(g, X + i, Y + j, e > 0.85 ? P[5] : e > 0.6 ? P[2] : P[0]); }
    if (f.wet) { const H = (f.big ? 70 : 34) * Math.sin(Math.PI * Math.min(1, k * 1.4)), W = f.big ? 9 : 5;   /* CỘT NƯỚC dựng lên giữa vùng rồi đổ xuống (dither, không trong suốt) */
      for (let y = 0; y <= H; y++) for (let x = -W; x <= W; x++) { const X2 = X + x, Y2 = Y - y, ax = Math.abs(x) / W; if (a * (1 - y / (H + 6)) * 1.3 < bay(X2, Y2) + ax * 0.3) continue; dot(g, X2, Y2, ax < 0.35 ? P[0] : ax < 0.7 ? P[2] : P[4]); }
      for (let i = 0; i < (f.big ? 16 : 8); i++) { const an = i / (f.big ? 16 : 8) * Math.PI * 2, rr = R * (0.6 + 0.6 * k), X2 = Math.round(X + Math.cos(an) * rr), Y2 = Math.round(Y + Math.sin(an) * rr * 0.6 - Math.sin(Math.PI * k) * 10); if (a > bay(X2, Y2)) { dot(g, X2, Y2, P[1]); dot(g, X2, Y2 - 1, P[0]); } } }
    return; }
  if (f.k === 'trail') { const X = Math.round((f.x - cx) * 2), Y = Math.round((f.y - cy) * 2); for (let j = -2; j <= 0; j++) for (let i = -3; i <= 3; i++) if (a > bay(X + i, Y + j)) dot(g, X + i, Y + j, P[4]); }
}

/* ---------- AI (monsters.update gọi c.aiFn) ---------- */
function aiF(ctx, mo, dt, p, dp, canHit) { try { ai0(ctx, mo, dt, p, dp, canHit); } catch (e) { ST.errs++; if (ST.errs < 5) console.error('farm106 ai', e); } }
function fighter(ctx, mo) {
  const F = mo.f6, kit = ctx.ldKit; if (!F.sp || F.e || !kit || !kit.ready()) return F.e;
  F.e = kit.mk(F.sp, F.lv, null, mo.x, mo.y); F.e.clip = idleClip(F); F.e.ct = F.ct0; return F.e;
}
function ai0(ctx, mo, dt, p, dp, canHit) {
  const F = mo.f6; if (!F || duelOn(ctx)) return;
  const e = fighter(ctx, mo); if (e) e.ct += dt;
  for (const k in F.cd) if (F.cd[k] > 0) F.cd[k] -= dt; for (const k in F.mcd) if (F.mcd[k] > 0) F.mcd[k] -= dt; if (F.gcd > 0) F.gcd -= dt;
  if (residual(mo)) provoke(ctx, mo, 'pl', true);
  if (F.regen > 0) { F.regen -= dt; mo.hp = Math.min(mo.max, mo.hp + mo.max * 0.25 * dt); F.prevHp = mo.hp; }
  if ((F.kind === 'aqua' || F.kind === 'amph') && !walkPx(ctx, mo.x, mo.y, F.kind)) { const L0 = tileList(F.rid, F.kind); let b = null, bd = 1e9; for (const t of L0) { const x = t[0] * TS + 8, y = t[1] * TS + 12, d = Math.hypot(x - mo.x, y - mo.y); if (d < bd) { bd = d; b = { x, y }; } } if (b) { mo.x = b.x; mo.y = b.y; mo.kb = null; ST.n.wetFix = (ST.n.wetFix || 0) + 1; } }   /* cá bị hất lên bờ → trượt về nước */
  const q10 = NET.role === 'host' && NET.nearest ? NET.nearest(mo.x, mo.y) : null;   /* c10-coop: người chơi khác gần nhất {id, d} */
  if (F.mode === 'calm' && dp > CF.sleepR && !(q10 && q10.d <= CF.sleepR)) { setClip(F, idleClip(F)); return; }   /* ngủ khi xa người chơi */
  if (F.act) { updAct(ctx, mo, dt); return; }
  if (F.mode === 'flee') { flee(ctx, mo, dt); return; }
  if (F.mode === 'angry') { fight(ctx, mo, dt, canHit); return; }
  if (F.mode === 'return') { goHome(ctx, mo, dt); return; }
  if (q10 && q10.d < CF.aggroR && !(canHit && dp < q10.d)) { F.nearR = (F.nearR || 0) + dt; if (F.nearR > CF.aggroT) { F.nearR = 0; provoke(ctx, mo, 'r:' + q10.id, true); return; } } else F.nearR = 0;   /* c10-coop */
  if (canHit && dp < CF.aggroR) { F.nearT += dt; if (F.nearT > CF.aggroT) { provoke(ctx, mo, 'pl', true); F.nearT = 0; return; } } else F.nearT = Math.max(0, F.nearT - dt);
  wander(ctx, mo, dt);
}

/* ---------- hạ thú → XP (c.onFall trả true: hệ này tự lo, monsters.killMonster dừng) ---------- */
function addXp(ctx, m, n, at) {
  if (!m || !(n > 0)) return 0; m.xpT106 = (m.xpT106 || 0) + n; m.xp106 = (m.xp106 || 0) + n; let up = false;
  while ((m.lv | 0) < LV.LV_CAP && m.xp106 >= LV.needXp(m.lv | 0)) { m.xp106 -= LV.needXp(m.lv | 0); m.lv = (m.lv | 0) + 1; up = true; }
  if (at) (ctx.S.pops ||= []).push({ x: at.x, y: at.y - 30, text: `+${n} XP`, color: '#9dff7a', t: 0 });
  if (up) { try { ctx.toast(vi(ctx) ? `▲ ${m.name || spName(ctx, m.sp)} lên Lv${m.lv}!` : `▲ ${m.name || spName(ctx, m.sp)} reached Lv${m.lv}!`); } catch (e) { } log({ ev: 'lvup', sp: m.sp, lv: m.lv }); }
  return n;
}
export const baseXp = (lead, lv, ct) => (lead ? Math.round((3 + 2.2 * lv) * CF.leadXp) : ct ? Math.round((3 + 2.2 * lv) * CF.ctXp) : Math.round(2 + 1.2 * lv));
function onFallF(mo) {
  const ctx = ST.ctx; if (!ctx || !mo.f6) return false;
  if (NET.role === 'guest' && NET.guestFall) return NET.guestFall(mo);   /* c10-coop: khách không tự hạ quái — gửi đòn cuối cho chủ phòng */
  try {
    const F = mo.f6; if (!mo.__in106) residual(mo); else credit(mo, mo.__by106 || 'pl', Math.max(0, mo.__hp0 || 0));   /* đòn kết liễu: phần máu còn lại về đúng kẻ ra đòn */
    const last = mo.__in106 ? (mo.__by106 || F.last) : 'pl', base = baseXp(F.lead, F.lv, F.ct), got = {};
    const mine106 = NET.role !== 'host' || Object.keys(F.cr).some(w => !isR(w) && F.cr[w] > 0);   /* c10-coop: chủ phòng không ăn công quái người khác hạ một mình */
    if (mine106) for (const who of Object.keys(F.cr).filter(w => isComp(w) && !isR(w))) if ((F.cr[who] || 0) > 0) { const m = memberOf(ctx, who), o = objOf(ctx, who), n = Math.round(base * (last === who ? 1.5 : 1)); if (m) { got[who] = addXp(ctx, m, n, o); ST.xp[who] = (ST.xp[who] || 0) + n; } }
    if (mine106) { const pn = last === 'pl' ? base : Math.max(1, Math.round(base * 0.3)); if (ctx.hero && ctx.hero.gainXp) ctx.hero.gainXp(pn); ST.xp.pl += pn; got.pl = pn;
    (ctx.S.pops ||= []).push({ x: ctx.S.player.x, y: ctx.S.player.y - 34, text: `+${pn} XP`, color: '#c8ff9a', t: 0 }); }
    if (!mine106) { } else if (F.lead) { ctx.give('stone', 2 + ((Math.random() * 2) | 0), mo.x, mo.y); if (Math.random() < 0.35) ctx.give('soul', 1, mo.x, mo.y); }
    else if (F.ct) { ctx.give('stone', 1, mo.x, mo.y); if (Math.random() < 0.15) ctx.give('soul', 1, mo.x, mo.y); }   /* thủ lĩnh rơi nhiều hơn */
    else { if (Math.random() < 0.12) ctx.give('stone', 1, mo.x, mo.y); if (Math.random() < 0.15 && mo.c.drop) ctx.give(mo.c.drop, 1, mo.x, mo.y); }
    ST.n.kill++; if (F.lead) ST.n.killLead++;
    try { if (NET.onKill) NET.onKill(mo, last); } catch (e) { }   /* c10-coop */
    log({ ev: 'kill', id: mo.id, sp: F.sp || F.key, lead: F.lead, ct: F.ct, rid: F.rid, lv: F.lv, base, last, cr: Object.fromEntries(Object.entries(F.cr).map(([k, v]) => [k, Math.round(v)])), got });
    if (F.e) { F.e.clip = hasClip(ctx, F, 'faint') ? 'faint' : 'idle'; F.e.ct = 0; ST.dying.push({ e: F.e, x: mo.x, y: mo.y, alt: F.alt, t: 0, fx: F.fx, fy: F.fy }); }
    faintAdd(ctx, mo, F, isR(last) ? 'r' : 'me', mo.id);   /* c10: Chấn Thú hoang ngất → người hạ bắt được */
    if (ctx.wfx && ctx.wfx('kill', mo.x, mo.y + 1, { w: mo.c.w || 16, h: mo.c.h || 16, col: mo.c.c })) { } else { try { FX.sink(mo.x, mo.y, skin(F), FX.power(0.3)); } catch (e) { } }
    ST.rq.push({ rid: F.rid, spec: F.lead ? ZR[F.rid].lead : F.ct ? { sp: F.sp, lv: F.lv } : { key: F.key || mo.c.fct || mo.c.key }, lead: F.lead, ct: F.ct, t: F.lead ? CF.respawnLead : F.ct ? CF.respawnCt : CF.respawn });
    mo.dead = true; mo.hp = 0; mo.angry = false; ST.mons = ST.mons.filter(o => o !== mo); try { ctx.monsters.remove(mo); } catch (e) { }
    if (F.lead) scatter(ctx, F.rid, mo);
    try { ctx.persist && ctx.persist(); } catch (e) { }
  } catch (e) { console.error('farm106 fall', e); mo.dead = true; try { ctx.monsters.remove(mo); } catch (e2) { } ST.mons = ST.mons.filter(o => o !== mo); }
  return true;
}

/* ---------- đấu chính thức (E) — chỉ thủ lĩnh (Chấn Thú) ---------- */
function duel(ctx, mo) {
  if (!ctx.duel || !ctx.duel.start || duelOn(ctx) || !mo || !mo.f6 || !mo.f6.sp) return;
  if (NET.role === 'guest' && NET.take && !mo.__took) { NET.take(mo, () => { mo.__took = true; duel(ctx, mo); }); return; }   /* c10-coop */
  const d = ctx.chanthu && ctx.chanthu.ensure && ctx.chanthu.ensure(); if (!d || !d.team || !d.team.length) { try { ctx.toast(vi(ctx) ? 'Chưa có Chấn Thú — nhận con đầu tiên ở bệ Chấn Thú trong Làng' : 'No Quake Beast yet — get your first one at the beast stand in the Village'); } catch (e) { } return; }
  if (ctx.comp79 && !ctx.comp79.out()) { ctx.comp79.need(); return; }
  const me = d.team[0], F = mo.f6, sp = F.sp, lv = F.lv, he = F.he;
  const gone = () => { try { ctx.monsters.remove(mo); } catch (e) { } ST.mons = ST.mons.filter(o => o !== mo); if (mo.__took) return; ST.rq.push({ rid: F.rid, spec: F.lead ? ZR[F.rid].lead : { sp: F.sp, lv: F.lv }, lead: F.lead, ct: true, t: F.lead ? CF.respawnLead : CF.respawnCt }); if (F.lead) scatter(ctx, F.rid, mo); };
  ST.n.duel++; log({ ev: 'duel', sp, lv });
  ctx.duel.start({ wildAt: { x: mo.x, y: mo.y }, wild: { sp, lv, key: 'f106:' + mo.id }, mode: '1v1', lv: me.lv, team: [{ sp: me.sp, lv: me.lv, name: me.name, lt: me.lt || null }], foeTeam: [{ sp, lv }],
    onCatch: () => { const where = ctx.chanthu.add(sp, lv); const dd = ctx.chanthu.ensure(); dd.caught = (dd.caught | 0) + 1; ctx.persist(); gone(); return where; },
    onWin: () => { try { if (ctx.fieldct && ctx.fieldct.tnAdd) ctx.fieldct.tnAdd(he, Math.max(1, Math.round(lv / 2)), null); } catch (e) { } gone(); }, onFlee: () => { }, onLose: () => { } });
}

/* ---------- vẽ ---------- */
function onWater(ctx, x, y) { const m = ctx.S.map; return ctx.getG(m, Math.floor(x / TS), Math.floor(y / TS)) === TT.WATER; }
function dot(g, X, Y, c) { g.fillStyle = c; g.fillRect(X / 2, Y / 2, 0.5, 0.5); }
const B4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5], bay = (X, Y) => (B4[(Y & 3) * 4 + (X & 3)] + 0.5) / 16;
function crown(g, X, Y) {   /* vương miện TĨNH 9×5 px logic (viền tối, vàng 2 bậc, 3 ngọc) — dấu nhận diện thủ lĩnh, không hiệu ứng lặp */
  const P = { k: '#2a1a0a', g: '#ffd45e', d: '#e0a030', r: '#ff6a5a' }, M = ['.k..k..k.', 'kgkkrkkgk', 'kgggggggk', 'kdrdddrdk', 'kkkkkkkkk'];
  for (let j = 0; j < 5; j++) for (let i = 0; i < 9; i++) { const c = M[j][i]; if (c === '.') continue; g.fillStyle = P[c]; g.fillRect(X - 4 + i, Y + j, 1, 1); }
}
function drawLead(g, mo, x, y) {
  const ctx = ST.ctx, F = mo.f6; if (!ctx || !F) return; const e = fighter(ctx, mo), H = hOf(mo);
  if (SHADOW.on && !onWater(ctx, mo.x, mo.y)) shadowFor(g, mo.x, mo.y, Math.round(x), Math.round(y) + 1, (globalThis.__fw110 ? globalThis.__fw110((mo.f6 && (mo.f6.sp || mo.f6.key)) || (mo.c && mo.c.key), H >= 24 ? 15 : 12) : H >= 24 ? 15 : 12), F.alt || 0);   /* bóng dưới chân (trên nước thì bỏ) */
  if (!e) { g.fillStyle = TYPE_COLOR[F.he] || '#9a6c48'; g.fillRect(Math.round(x) - 5, Math.round(y) - 10 - F.alt, 10, 10); return; }
  e.x = mo.x; e.y = mo.y; e.alt = F.alt || 0; e.fx = F.fx; e.fy = F.fy; e.flash = mo.flash > 0 ? mo.flash : 0;
  ctx.ldKit.draw(g, e, mo.x - x, mo.y - y);
  if (F.lead) crown(g, Math.round(x), Math.round(y - H - (F.alt || 0) - 4));
}
function drawShot(g, b, cx, cy) {
  const P = PAL_SRC[b.he] || PAL_SRC.chan, X = Math.round((b.x - cx) * 2), Y = Math.round((b.y - b.z - cy) * 2), sp = Math.hypot(b.vx, b.vy) || 1, ux = b.vx / sp, uy = b.vy / sp, RR = b.small ? 2.2 : 3.2;
  for (let k = 1; k <= 4; k++) { const tx = Math.round(X - ux * k * 3), ty = Math.round(Y - uy * k * 3), a = 1 - k / 5; for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) if (Math.abs(i) + Math.abs(j) <= 1 && a > bay(tx + i, ty + j)) dot(g, tx + i, ty + j, P[k < 3 ? 3 : 5]); }   /* đuôi mờ dần bằng dither */
  for (let j = -3; j <= 3; j++) for (let i = -3; i <= 3; i++) { const d = Math.hypot(i, j); if (d > RR) continue; dot(g, X + i, Y + j, d > RR - 0.8 ? P[6] : d > 1.4 ? P[2] : P[0]); }
}
/* thanh máu trên đầu: cùng kiểu overBar p91 (khung PixelLab obar_s.png) — ĐỎ thú hoang, XANH LÁ phe mình */
function img() { if (ST.im) return ST.im.complete && ST.im.naturalWidth ? ST.im : null; if (typeof Image === 'undefined') return null; ST.im = new Image(); ST.im.src = 'assets/px/ui/hud91/obar_s.png'; return null; }
function overBar(ug, sx, sy, w, k, ally, su) {
  const h = Math.max(8, Math.round(su * 2.6)), x = Math.round(sx - w / 2), y = Math.round(sy - h), im = img(), q = Math.max(0, Math.min(1, k));
  const fill = ally ? (q > 0.5 ? '#7bd04a' : q > 0.25 ? '#ffd45e' : '#ff5a5a') : '#e84a3a', dark = ally ? '#2f5a1c' : '#7a1c16';
  ug.save(); ug.imageSmoothingEnabled = false;
  if (im) {
    const sw = im.width, sh = im.height, c = 3, dc = Math.max(2, Math.round(c * h / sh)), ix = Math.max(1, Math.round(3 * h / sh)), iy = Math.max(1, Math.round(3 * h / sh));
    ug.drawImage(im, 0, 0, c, sh, x, y, dc, h); ug.drawImage(im, c, 0, sw - 2 * c, sh, x + dc, y, w - 2 * dc, h); ug.drawImage(im, sw - c, 0, c, sh, x + w - dc, y, dc, h);
    const iw = w - 2 * ix, ih = h - 2 * iy; ug.fillStyle = fill; ug.fillRect(x + ix, y + iy, Math.round(iw * q), ih); ug.fillStyle = dark; ug.fillRect(x + ix, y + iy + ih - Math.max(1, Math.round(ih / 3)), Math.round(iw * q), Math.max(1, Math.round(ih / 3)));
  } else { ug.fillStyle = '#352022'; ug.fillRect(x, y, w, h); ug.fillStyle = fill; ug.fillRect(x + 1, y + 1, Math.round((w - 2) * q), h - 2); }
  ug.restore(); return { x, y, w, h };
}
function bang(ug, x, y, h) {   /* dấu "!" TĨNH: thân + chấm đỏ cam, viền tối — cạnh trái thanh máu */
  const u = Math.max(2, Math.round(h / 5)); ug.save(); ug.fillStyle = '#2a0e0a'; ug.fillRect(x - u, y - u, u * 3, u * 6); ug.fillStyle = '#ff7a3a'; ug.fillRect(x, y, u, u * 3); ug.fillRect(x, y + u * 4, u, u); ug.restore();
}
function tag(ug, txt, cx, by, fs) {   /* khung tên vàng "Thủ lĩnh" TĨNH trên thanh máu thủ lĩnh */
  ug.save(); ug.font = `bold ${fs}px VT323, monospace`; ug.textAlign = 'center'; ug.textBaseline = 'middle';
  const w = Math.round(ug.measureText(txt).width + fs * 0.9), h = Math.round(fs * 1.1), x = (globalThis.__R89||Math.round)(cx - w / 2), y = Math.round(by - h - 2);
  ug.fillStyle = '#2a1a0a'; ug.fillRect(x - 1, y - 1, w + 2, h + 2); ug.fillStyle = '#b8862a'; ug.fillRect(x, y, w, h); ug.fillStyle = '#ffd45e'; ug.fillRect(x, y, w, Math.max(1, Math.round(h / 6)));
  ug.fillStyle = '#2a1a0a'; ug.fillText(txt, cx + 1, y + h / 2 + 1); ug.fillStyle = '#fff3c8'; ug.fillText(txt, cx, y + h / 2); ug.restore();
}
function drawUI(ug, ctx, cx, cy, scale) {
  if (ctx.S.mode !== 'play' || duelOn(ctx)) return; const su = ctx.scaleUI || scale, p = ctx.S.player, W = ug.canvas.width, H = ug.canvas.height, out = [];
  for (const mo of ST.mons) { const F = mo.f6; if (!F || mo.hp <= 0) continue; if (!(F.mode === 'angry' || mo.hp < mo.max - 0.5 || hyp(mo, p) < (F.sp ? 110 : 72))) continue; out.push({ x: mo.x, top: mo.y - hOf(mo) - (F.alt || 0) - (F.lead ? 7 : 2), k: mo.hp / mo.max, ally: false, ang: F.mode === 'angry', lv: F.lv, lead: F.lead, ct: F.ct }); }
  const busy = ST.mons.some(mo => mo.f6 && mo.f6.mode === 'angry' && hyp(mo, p) < 200);
  const E = SQ(ctx) ? null : elyE(ctx); if (E && (busy || E.hp < E.max - 0.5)) out.push({ x: E.x, top: E.y - 46, k: E.hp / E.max, ally: true });
  const f = SQ(ctx) || globalThis.__ob91 ? null : c79F(ctx); if (f && (busy || f.hp < f.max - 0.5)) out.push({ x: f.x, top: f.y - (f.sp === 'rocky' ? 38 : 26), k: f.hp / (f.max || f.hp || 1), ally: true });
  const fs = Math.max(10, Math.round(su * 3));
  for (const b of out) {
    const sx = (b.x - cx) * scale, sy = (b.top - cy) * scale; if (sx < -60 || sx > W + 60 || sy < -60 || sy > H + 60) continue;
    const w = b.ally ? Math.round(su * 14) : b.lead ? Math.round(su * 19) : b.ct ? Math.round(su * 13) : Math.round(su * 10), r = overBar(ug, sx, sy, w, b.k, b.ally, su);
    if (b.ang) bang(ug, r.x - Math.max(5, Math.round(su * 2.2)), r.y - Math.round(r.h * 0.3), r.h);
    if (b.lead) tag(ug, vi(ctx) ? 'Thủ lĩnh' : 'Leader', sx, r.y, fs);
    if (!b.ally && b.lv != null) { ug.save(); ug.font = `bold ${fs}px VT323, monospace`; ug.textAlign = 'left'; ug.textBaseline = 'middle'; ug.fillStyle = '#2a1a10'; ug.fillText('Lv' + b.lv, r.x + r.w + 3, r.y + r.h / 2 + 1); ug.fillStyle = b.lead ? '#ffd45e' : '#ffe9d6'; ug.fillText('Lv' + b.lv, r.x + r.w + 2, r.y + r.h / 2); ug.restore(); }
  }
}

/* ---------- giãn cách: Chấn Thú phe mình không đứng chồng lên người chơi / lên nhau (điều phối 02/11) ---------- */
function compList(ctx) {
  const out = [], q = SQ(ctx);
  if (q) { for (const u of q.units()) { if (!u.onField()) continue; const o = u.sp === 'elyziuma' ? elyE(ctx) : u.f; if (o && !out.includes(o)) out.push(o); } }
  const E = elyE(ctx), f = c79F(ctx); if (E && !out.includes(E)) out.push(E); if (f && !out.includes(f)) out.push(f); return out;
}
function separate(ctx, dt) {
  const L0 = compList(ctx); if (!L0.length) return; const p = ctx.S.player, R0 = CF.sepR, mx = 160 * dt;
  for (let i = 0; i < L0.length; i++) {
    const a = L0[i], others = [p, ...L0.filter((_, j) => j !== i)];
    const big = a.sp === 'rocky' || a.sp === 'golem' ? 12 : 0;   /* con to (Rocky golem ~2× người) cần khoảng cách rộng hơn */
    for (const b of others) {
      const R1 = R0 + big + (b.sp === 'rocky' || b.sp === 'golem' ? 12 : 0), dx = a.x - b.x, dy = a.y - b.y, d = Math.hypot(dx, dy); if (d >= R1) continue;
      const k = Math.min(mx, (R1 - d) * (b === p ? 1 : 0.5)), ux = d > 0.01 ? dx / d : (i % 2 ? 1 : -1), uy = d > 0.01 ? dy / d : 0.3;
      const nx = a.x + ux * k, ny = a.y + uy * k * 0.6;
      if (body(ctx, nx, ny, 'land')) { a.x = nx; a.y = ny; ST.sepN = (ST.sepN || 0) + 1; }
      else if (body(ctx, nx, a.y, 'land')) { a.x = nx; ST.sepN = (ST.sepN || 0) + 1; }
    }
    const dx = a.x - p.x, dy = a.y - p.y;   /* đứng ngay TRƯỚC (phía dưới) người chơi → che mất người (Rocky cao 2×): né sang bên */
    if (dy > 0 && dy < 34 + big && Math.abs(dx) < 24 + big) { const sx = dx !== 0 ? Math.sign(dx) : (i % 2 ? 1 : -1), nx = a.x + sx * 90 * dt; if (body(ctx, nx, a.y, 'land')) { a.x = nx; ST.sepN = (ST.sepN || 0) + 1; } }
  }
}

/* ---------- hệ ---------- */
export const farm106 = {
  id: 'farm106',
  always: true,
  onZoneEnter(ctx) {
    ST.ctx = ctx; ST.mons = []; ST.rq = []; ST.fz = []; ST.balls = []; ctx.ballThrow = () => ballThrow(ctx); ctx.ballInfo = () => ballInfo(ctx);   /* c10: quả cầu thanh công cụ = ném Ấn Thu */ ST.shots = []; ST.dying = []; ST.fx6 = []; loadSpr6();
    ST.on = !off() && !!(ctx.S.zone && ctx.S.zone.id === 'village' && ctx.S.map && ctx.S.map.decals88 && ctx.monsters);
    if (typeof window !== 'undefined') window.__f106 = {
      on: () => ST.on, baseXp, onW: (x, y) => onWater(ctx, x, y), nearW: (x, y) => nearWater(ctx, Math.floor(x / TS), Math.floor(y / TS)), landNear: (x, y, rid) => { let b = null, bd = 1e9; for (const [r, o] of Object.entries(ST.tiles)) { if (rid && r !== rid) continue; for (const q of o.land) { const X = q[0] * TS + 8, Y = q[1] * TS + 12, d = Math.hypot(X - x, Y - y); if (d < bd && d > 30) { bd = d; b = { x: X, y: Y }; } } } return b; }, castNow: (id, mv) => { const m = ST.mons.find(q => q.id === id); if (!m || !m.f6.ct) return false; if (mv) for (const k of m.f6.mvs) m.f6.mcd[k] = k === mv ? 0 : 99; m.f6.gcd = 0; m.f6.act = null; return true; }, sepN: () => ST.sepN || 0,
      overlap: () => { const p = ctx.S.player, L0 = compList(ctx); let m = 1e9; for (const a of L0) { m = Math.min(m, Math.hypot(a.x - p.x, a.y - p.y)); for (const b of L0) if (a !== b) m = Math.min(m, Math.hypot(a.x - b.x, a.y - b.y)); } return L0.length ? Math.round(m) : null; },
      state: () => ({ on: ST.on, n: { ...ST.n }, xp: { ...ST.xp }, rq: ST.rq.map(q => ({ rid: q.rid, lead: q.lead, t: +q.t.toFixed(1) })), shots: ST.shots.length, errs: ST.errs, legend: legendOut(ctx),
        team: team(ctx).map(m => ({ sp: m.sp, lv: m.lv, xp106: m.xp106 || 0, xpT106: m.xpT106 || 0 })) }),
      list: () => ST.mons.filter(m => m.f6 && m.hp > 0).map(m => ({ id: m.id, sp: m.f6.sp || m.f6.key, lead: m.f6.lead, ct: !!m.f6.ct, mvs: m.f6.mvs, rid: m.f6.rid, lv: m.f6.lv, x: Math.round(m.x), y: Math.round(m.y), hp: Math.round(m.hp), max: m.max, mode: m.f6.mode, tg: m.f6.tg, act: m.f6.act && m.f6.act.id, inR: inRegion(m.f6.rid, m.x, m.y), out: Math.round(outDist(m)), home: { x: Math.round(m.f6.home.x), y: Math.round(m.f6.home.y) }, kind: m.f6.kind, clip: m.f6.e && m.f6.e.clip })),
      mo: id => ST.mons.find(m => m.id === id) || null, provoke: (id, who = 'pl') => { const m = ST.mons.find(q => q.id === id); if (m) provoke(ctx, m, who, true); return !!m; },
      calmAll: () => { for (const m of ST.mons) if (m.f6 && m.f6.mode !== 'calm') { m.f6.mode = 'calm'; m.angry = false; m.f6.act = null; m.f6.cr = {}; } },
      respawnIn: s => { for (const q of ST.rq) q.t = Math.min(q.t, s); return ST.rq.length; }, setCfg: o => Object.assign(CF, o), cfg: () => ({ ...CF }),
      lair: rid => lairOf(rid), front: rid => frontOf(rid), regions: () => Object.fromEntries(Object.entries(ZR).map(([k, v]) => [k, { lv: v.lv, lead: v.lead, mins: v.mins, rect: rectOf(k), land: (ST.tiles[k] || { land: [] }).land.length, water: (ST.tiles[k] || { water: [] }).water.length }])),
      log: () => ST.log.slice(), logReset: () => { ST.log = []; for (const k in ST.n) ST.n[k] = 0; for (const k in ST.xp) ST.xp[k] = 0; },
      kill: (id, who = 'ely') => { const m = ST.mons.find(q => q.id === id); if (!m) return false; m.__by = who; ctx.monsters.damage(m, m.hp + 1, m, 0, 0, true); return true; },
      duel: id => duel(ctx, ST.mons.find(q => q.id === id)), at: (x, y) => regionAt(Math.floor(x / TS), Math.floor(y / TS)).id };
    if (!ST.on) return;
    try { wrapDamage(ctx); ST.tiles = buildTiles(ctx); ST.lair = {}; ST.front = {}; clearVanilla(ctx); if (NET.role !== 'guest') spawnAll(ctx); log({ ev: 'start', n: ST.mons.length, net: NET.role }); } catch (e) { console.error('farm106 start', e); }
  },
  onZoneLeave() { for (const m of ST.mons) { try { ST.ctx && ST.ctx.monsters && ST.ctx.monsters.remove(m); } catch (e) { } } ST.mons = []; ST.rq = []; ST.shots = []; ST.dying = []; ST.on = false; },
  update(dt, ctx) {
    if (!ST.on) return; ST.ctx = ctx; dt = Math.min(dt, 0.05);
    if (ctx.ldKit && !ctx.ldKit.ready() && ctx.ldKit.load) { try { ctx.ldKit.load(); } catch (e) { } }
    if (ctx.S.mode !== 'play' || duelOn(ctx)) return;
    wrapDamage(ctx);
    ST.vanT -= dt; if (ST.vanT <= 0) { ST.vanT = 1; clearVanilla(ctx); const L0 = ctx.monsters.list(); ST.mons = ST.mons.filter(m => L0.includes(m)); }
    updShots(ctx, dt); updFx6(dt); separate(ctx, dt);
    faintTick(ctx, dt);   /* c10 */
    for (const d of ST.dying) { d.t += dt; d.e.ct += dt; } ST.dying = ST.dying.filter(d => d.t < 0.9);
    for (const q of ST.rq) q.t -= dt;
    for (const q of ST.rq.slice().sort((a, b) => b.lead - a.lead)) if (q.t <= 0) { const mo = spawnOne(ctx, q.rid, q.spec, true); if (mo) { ST.rq.splice(ST.rq.indexOf(q), 1); ST.n.respawn++; try { FX.erupt(mo.x, mo.y, skin(mo.f6), FX.power(0.2), 'b'); } catch (e) { } } else q.t = 0.5; }
  },
  near(ctx) {
    if (!ST.on || ctx.S.mode !== 'play' || duelOn(ctx)) return null; const p = ctx.S.player; let best = null, bd = 40;
    { const z = faintNear(ctx); if (z) return z; }   /* c10: Chấn Thú ngất của mình → Bắt */
    for (const mo of ST.mons) { const F = mo.f6; if (!F || !F.sp || mo.hp <= 0 || F.mode === 'angry') continue; const d = hyp(mo, p); if (d >= bd) continue; bd = d;
      best = { label: vi(ctx) ? `⚔ Đấu ${spName(ctx, F.sp)} Lv${F.lv}` : `⚔ Battle ${spName(ctx, F.sp)} Lv${F.lv}`, x: mo.x, y: mo.y + 18, limit: 52, priority: true, data: { f106: mo } }; }
    return best;
  },
  interact(ctx, cand) { const d = cand && cand.data; if (d && d.f106c) { ballThrow(ctx, d.f106c); return; } if (d && d.f106) duel(ctx, d.f106); },
  drawables(ctx, cx, cy) {
    if (!ST.on || duelOn(ctx)) return []; const g = ctx.g, out = [];
    for (const b of ST.shots) out.push({ y: b.sy + b.ky, f: () => drawShot(g, b, cx, cy) });
    for (const f of ST.fx6) out.push({ y: f.k === 'beam' ? f.sy + f.ky : f.k === 'burst' ? f.y - 40 : f.y - 0.5, f: () => drawFx6(g, f, cx, cy) });   /* tia: lên → sau lưng, xuống → trước (luật 16/10) */   /* chiêu bắn lên: sau lưng người ra chiêu · bắn xuống: trước (luật 16/10) */
    for (const z of ST.fz || []) out.push({ y: z.y, f: () => faintDraw(ctx, g, z, cx, cy) });   /* c10 */
    for (const b of ST.balls || []) out.push({ y: b.z.y + 1, f: () => ballDraw(ctx, g, b, cx, cy) });   /* c10: Ấn Thu đang bay / lắc */
    for (const d of ST.dying) out.push({ y: d.y, f: () => { const e = d.e; e.x = d.x; e.y = d.y; e.alt = d.alt; e.fx = d.fx; e.fy = d.fy; e.flash = 0; if (d.t > 0.55) { g.save(); g.globalAlpha = Math.max(0, 1 - (d.t - 0.55) / 0.35); ctx.ldKit.draw(g, e, cx, cy); g.restore(); } else ctx.ldKit.draw(g, e, cx, cy); } });
    return out;
  },
  drawGround(g, ctx, cx, cy) { if (!ST.on || duelOn(ctx)) return; for (const mo of ST.mons) { const A = mo.f6 && mo.f6.act; if (A && A.id === 'mv' && !A.done) drawTel(g, mo, A, cx, cy); } },
  drawUI(ug, ctx, cx, cy, scale) { if (ST.on) drawUI(ug, ctx, cx, cy, scale); },
};

/* ================= c10-coop: API MẠNG (patch-c10.py nối vào cuối farm106.js) =================
   CHỦ PHÒNG: netSnap() ảnh chụp gọn mọi con · netDefs()/netDef(mo) định nghĩa để khách dựng bóng · netHit() nhận đòn người khác · netTake() nhường thủ lĩnh để khách đấu · netFxPack() gói động tác.
   KHÁCH: netBecomeGuest() bỏ bầy tự sinh · netSpawn(def) dựng bóng · netApply(snap) áp vị trí / máu / trạng thái · netHits() đòn mình gây ra (gửi chủ phòng) · netFall(mo) đòn cuối
          · netKilled(mo, mineLast) quái chết (thưởng theo công của mình) · netAct(n, A) vẽ báo trước / đạn / tia · netHurt(d) mình bị đánh · netTakeOver() khách lên làm chủ phòng (chủ cũ rời / mất mạng). */
const MODE106 = ['calm', 'angry', 'return', 'flee'];
const NETM = new Map();   /* khách: id quái của chủ phòng → bóng ở máy mình */
const r2 = v => Math.round(v * 2) / 2;
export function netSnap() {
  const l = [];
  for (const mo of ST.mons) { const F = mo.f6; if (!F || !(mo.hp > 0) || mo.dead) continue; l.push([mo.id, r2(mo.x), r2(mo.y), Math.ceil(mo.hp), Math.max(0, MODE106.indexOf(F.mode)), (F.e && F.e.clip) || '', Math.round((F.fx || 0) * 100) / 100, Math.round((F.fy || 0) * 100) / 100, Math.round(F.alt || 0)]); }
  return l;
}
export function netDef(mo) { const F = mo.f6; return { n: mo.id, rid: F.rid, sp: F.sp, key: F.key || mo.c.fct || null, lead: !!F.lead, ct: !!F.ct, lv: F.lv, max: mo.max, hp: Math.ceil(mo.hp), x: Math.round(mo.x), y: Math.round(mo.y), hx: Math.round(F.home.x), hy: Math.round(F.home.y) }; }
export function netDefs() { return ST.mons.filter(mo => mo.f6 && mo.hp > 0 && !mo.dead).map(netDef); }
export function netAlive() { return ST.mons.filter(mo => mo.f6 && mo.hp > 0 && !mo.dead); }
export function netHit(pid, nid, d, at) {
  const ctx = ST.ctx, mo = ST.mons.find(m => m.id === nid && m.hp > 0 && !m.dead); if (!ctx || !mo || !(d > 0)) return false;
  mo.__by = 'r:' + pid; try { ctx.monsters.damage(mo, Math.min(9999, Math.round(d)), at || mo, 0, 40, true); } catch (e) { mo.__by = null; return false; }
  ST.n.hitIn = (ST.n.hitIn || 0) + 1; return true;
}
export function netTake(nid) {
  const ctx = ST.ctx, mo = ST.mons.find(m => m.id === nid && m.hp > 0 && !m.dead); if (!ctx || !mo || !mo.f6 || !mo.f6.sp || mo.f6.mode === 'angry') return false;
  const F = mo.f6; try { ctx.monsters.remove(mo); } catch (e) { } ST.mons = ST.mons.filter(o => o !== mo); mo.dead = true;
  ST.rq.push({ rid: F.rid, spec: F.lead ? ZR[F.rid].lead : { sp: F.sp, lv: F.lv }, lead: F.lead, ct: true, t: F.lead ? CF.respawnLead : CF.respawnCt }); if (F.lead) scatter(ctx, F.rid, mo);
  log({ ev: 'nettake', id: nid }); return true;
}
export function netFxPack(mo, A) {
  const ctx = ST.ctx, T = A.who && ctx ? (A.who === 'pl' ? ctx.S.player : objOf(ctx, A.who)) : null, o = { id: A.id, imp: +A.imp.toFixed(2), T: +A.T.toFixed(2) };
  if (T) { o.tx = Math.round(T.x); o.ty = Math.round(T.y); }
  if (A.id === 'mv') { o.shape = A.shape; o.mv = A.mv; o.ux = +A.ux.toFixed(3); o.uy = +A.uy.toFixed(3); o.len = Math.round(A.len || 0); o.r = Math.round(A.r || 0); o.big = !!A.big; o.wet = !!A.wet; o.mn = !!A.mn; if (A.P) o.P = { x: Math.round(A.P.x), y: Math.round(A.P.y) }; }
  return o;
}
/* ---------- khách ---------- */
export function netBecomeGuest() {
  const ctx = ST.ctx; for (const m of ST.mons) { try { ctx && ctx.monsters && ctx.monsters.remove(m); } catch (e) { } } ST.mons = []; ST.rq = []; ST.shots = []; ST.fx6 = []; NETM.clear(); log({ ev: 'guest' });
}
function mkF6(def, k, max) {
  const lead = !!def.lead, ct = !!def.sp;
  return { rid: def.rid, sp: def.sp || null, key: def.key || null, lead, ct, lv: def.lv, kind: k, he: ct ? heOf(def.sp) : (MHE[def.key] || 'chan'), mvs: ct ? movesOf(def.sp) : (MKEY[def.key] || []).slice(), mcd: ct ? {} : Object.fromEntries((MKEY[def.key] || []).map(id => [id, R(2, 6)])), gcd: R(1, 2.5), tel: null, home: { x: def.hx, y: def.hy }, rect: rectOf(def.rid), mode: 'calm', goal: null, wait: R(0.3, 2.5), cd: { bite: 0, shot: R(1, 3) }, act: null, tg: 'pl', tgT: 0,
    prevHp: def.hp, acc: 0, cr: {}, last: null, nearT: 0, stuck: 0, calmT: 0, backT: 0, fleeT: 0, fx: 1, fy: 0.4, alt: lead && k === 'fly' ? 9 : 0, e: null, shotClip: null, ct0: Math.random() * 2, regen: 0 };
}
export function netSpawn(def) {
  const ctx = ST.ctx; if (!ctx || !ST.on || !ctx.monsters || !ctx.monsters.add || NETM.has(def.n)) return null;
  const ct = !!def.sp; let c = ct ? leadCfg(def.sp, def.rid) : minCfg(ctx, def.key); if (!c) { log({ ev: 'netspawnfail', def: JSON.stringify(def) }); return null; }
  c = { ...c, aiFn: aiPup, onFall: onFallF };
  const k = kindOf(def.sp || def.key), mo = ctx.monsters.add(c, def.x, def.y); mo.max = def.max; mo.hp = Math.min(def.max, def.hp); mo.fx = 1; mo.angry = false;
  mo.f6 = mkF6(def, k, def.max); mo.__net = { x: def.x, y: def.y, fx: 1, fy: 0.4, alt: mo.f6.alt, clip: '' }; mo.__nid = def.n; mo.__hpL = mo.hp; mo.__born = now();
  ST.mons.push(mo); NETM.set(def.n, mo); ST.n.netSpawn = (ST.n.netSpawn || 0) + 1; return mo;
}
function netRemove(mo) { const ctx = ST.ctx; NETM.delete(mo.__nid); mo.dead = true; ST.mons = ST.mons.filter(o => o !== mo); try { ctx && ctx.monsters.remove(mo); } catch (e) { } }
export function netApply(l) {
  if (!ST.on) return; const t0 = now(), seen = new Set();
  for (const r of l) {
    const mo = NETM.get(r[0]); if (!mo || mo.dead) continue; seen.add(r[0]);
    const N = mo.__net, F = mo.f6; N.x = r[1]; N.y = r[2]; N.fx = r[6]; N.fy = r[7]; N.alt = r[8]; N.clip = r[5];
    F.mode = MODE106[r[4]] || 'calm'; mo.angry = F.mode === 'angry' || F.mode === 'flee';
    mo.__pend = (mo.__pend || []).filter(p => t0 - p.t < 0.6); const pend = mo.__pend.reduce((a, p) => a + p.d, 0);
    if (mo.__dying && t0 - mo.__dying > 2.5) mo.__dying = 0;   /* chủ phòng không xác nhận hạ (đã hồi máu / đòn lạc) → bỏ chờ */
    if (!mo.__dying) mo.hp = Math.max(1, Math.min(mo.max, r[3] - pend));
    mo.__hpL = mo.hp; F.prevHp = mo.hp; F.acc = 0;
    if (F.mode === 'calm' && r[3] >= mo.max - 0.5) F.cr = {};   /* quái về nhà hồi đầy máu → công cũ hết hạn (như goHome của chủ phòng) */
  }
  for (const [nid, mo] of [...NETM]) if (!seen.has(nid) && t0 - (mo.__born || 0) > 0.8) netRemove(mo);
}
export function netHits() {
  const out = [];
  for (const mo of ST.mons) {
    const F = mo.f6; if (!F || !mo.__net || mo.dead) continue;
    if (mo.hp < F.prevHp - 0.01) residual(mo);   /* máu mất ngoài damage() (kiếm) → công người chơi */
    const d = mo.__hpL - mo.hp; if (d > 0.5 && !mo.__dying) { out.push([mo.__nid, Math.round(d)]); (mo.__pend ||= []).push({ d, t: now() }); }
    mo.__hpL = mo.hp;
  }
  return out;
}
export function netFall(mo) {   /* đòn cuối ở máy khách: gửi phần máu còn lại, giữ quái 1 máu chờ chủ phòng hạ */
  const F = mo.f6, d = Math.max(1, Math.round((mo.__hpL == null ? mo.max : mo.__hpL) - mo.hp), Math.ceil(mo.max));   /* máy mình thấy quái ngã → đòn cuối đủ hạ ở chủ phòng (máu dự đoán có thể lệch) */
  if (!mo.__in106) residual(mo);
  mo.hp = 1; mo.__hpL = 1; F.prevHp = 1; F.acc = 0; mo.__dying = now(); (mo.__pend ||= []).push({ d, t: now() });
  return [mo.__nid, d];
}
export function netKilled(nid, mineLast) {
  const ctx = ST.ctx, mo = NETM.get(nid); if (!ctx || !mo || !mo.f6) return false; const F = mo.f6;
  try {
    const mine = mineLast || Object.keys(F.cr).some(w => F.cr[w] > 0);
    if (mine) {
      const base = baseXp(F.lead, F.lv, F.ct), last = mineLast ? (F.last || 'pl') : null;
      for (const who of Object.keys(F.cr).filter(w => isComp(w) && !isR(w))) if ((F.cr[who] || 0) > 0) { const m = memberOf(ctx, who), o = objOf(ctx, who), n = Math.round(base * (last === who ? 1.5 : 1)); if (m) { addXp(ctx, m, n, o); ST.xp[who] = (ST.xp[who] || 0) + n; } }
      const pn = last === 'pl' ? base : Math.max(1, Math.round(base * 0.3)); if (ctx.hero && ctx.hero.gainXp) ctx.hero.gainXp(pn); ST.xp.pl += pn;
      (ctx.S.pops ||= []).push({ x: ctx.S.player.x, y: ctx.S.player.y - 34, text: `+${pn} XP`, color: '#c8ff9a', t: 0 });
      if (F.lead) { ctx.give('stone', 2 + ((Math.random() * 2) | 0), mo.x, mo.y); if (Math.random() < 0.35) ctx.give('soul', 1, mo.x, mo.y); }
      else if (F.ct) { ctx.give('stone', 1, mo.x, mo.y); if (Math.random() < 0.15) ctx.give('soul', 1, mo.x, mo.y); }
      else { if (Math.random() < 0.12) ctx.give('stone', 1, mo.x, mo.y); if (Math.random() < 0.15 && mo.c.drop) ctx.give(mo.c.drop, 1, mo.x, mo.y); }
    }
    ST.n.kill++; if (F.lead) ST.n.killLead++; log({ ev: 'netkill', nid, sp: F.sp || F.key, lead: F.lead, mine: !!mine, last: !!mineLast });
    if (F.e) { F.e.clip = hasClip(ctx, F, 'faint') ? 'faint' : 'idle'; F.e.ct = 0; ST.dying.push({ e: F.e, x: mo.x, y: mo.y, alt: F.alt, t: 0, fx: F.fx, fy: F.fy }); }
    faintAdd(ctx, mo, F, mineLast ? 'me' : 'r', nid);   /* Chấn Thú hoang ngất: chỉ người hạ (mineLast) bắt được */
    if (ctx.wfx && ctx.wfx('kill', mo.x, mo.y + 1, { w: mo.c.w || 16, h: mo.c.h || 16, col: mo.c.c })) { } else { try { FX.sink(mo.x, mo.y, skin(F), FX.power(0.3)); } catch (e) { } }
    if (F.lead) { try { FX.shout(mo.x, mo.y - 30, vi(ctx) ? 'BẦY TAN!' : 'PACK SCATTERS!', '#ffe9a0', 1, 0.9); } catch (e) { } }
    if (mine) { try { ctx.persist && ctx.persist(); } catch (e) { } }
  } catch (e) { console.error('farm106 netKilled', e); }
  netRemove(mo); return true;
}
function visShot(ctx, mo, T) {
  const F = mo.f6, H = hOf(mo), o = { x: mo.x + (F.fx || 0) * 6, y: mo.y, z: (F.alt || 0) + H * 0.5 }, dx = T.x - o.x, dy = T.y - o.y, d = Math.hypot(dx, dy) || 1;
  ST.shots.push({ vis: true, small: !F.sp, x: o.x, y: o.y, z: o.z, vx: dx / d * CF.shotV, vy: dy / d * CF.shotV, vz: (10 - o.z) / (d / CF.shotV), t: 0, T: Math.min(1.6, d / CF.shotV), he: F.he, sp: F.sp, who: 'vis', mo, ky: dy < 0 ? -0.5 : 0.5, sy: mo.y });
  try { FX.muzzle(o.x, o.y, o.z, skin(F), FX.power(0.2), dx / d, dy / d); } catch (e) { }
}
export function netAct(nid, a) {   /* khách: chủ phòng báo quái bắt đầu động tác → báo trước trên đất / đạn / tia (chỉ để nhìn; sát thương do chủ phòng tính) */
  const mo = NETM.get(nid); if (!mo || !mo.f6 || !a) return; const F = mo.f6;
  F.act = { ...a, t: 0, done: false, net: 1, who: 'vis', P: a.P || null }; if (a.id === 'mv') F.tel = F.act;
  if (a.id === 'mv' && a.mv && (F.shoutT || 0) < now()) { F.shoutT = now() + 3.5; const ctx = ST.ctx, nm = MM[a.mv] ? (vi(ctx) ? MM[a.mv].vi : MM[a.mv].en) : MOVES[a.mv] ? (vi(ctx) ? (MOVES[a.mv].name || a.mv) : (MOVE_NAME_EN[a.mv] || MOVES[a.mv].name || a.mv)) : null; if (nm) { try { FX.shout(mo.x, mo.y - hOf(mo) - 10, a.mn ? nm : nm.toUpperCase(), F.lead ? '#ffe9a0' : a.mn ? '#f0e0d0' : '#ffd0b0', a.mn ? 0.6 : 0.75, a.mn ? 0.6 : 0.75); } catch (e) { } } }
}
function pupAct(ctx, mo, dt) {
  const F = mo.f6, A = F.act; A.t += dt;
  if (!A.done && A.t >= A.imp) {
    A.done = true; const sk = skin(F), T = A.tx != null ? { x: A.tx, y: A.ty } : null;
    try {
      if (A.id === 'bite') { if (T) FX.bite(T.x, T.y, 8, sk, FX.power(F.lead ? 0.3 : 0.18)); }
      else if (A.id === 'shot') { if (T) visShot(ctx, mo, T); }
      else if (A.id === 'mv') {
        if (A.shape === 'dan') { const P = A.P || T; if (P) visShot(ctx, mo, P); }
        else if (A.shape === 'tia') { const H = hOf(mo), ox = mo.x + A.ux * 6, oy = mo.y, oz = (F.alt || 0) + H * 0.5; ST.fx6.push({ k: 'beam', t: 0, T: A.wet ? 0.42 : 0.3, wet: A.wet, x: ox, y: oy, z: oz, ux: A.ux, uy: A.uy, len: A.len, he: F.he, sy: mo.y, ky: A.uy < 0 ? -0.5 : 0.5 }); FX.muzzle(ox, oy, oz, sk, FX.power(0.3), A.ux, A.uy); }
        else if (A.shape === 'hu') { ST.fx6.push({ k: 'burst', t: 0, T: 0.4, x: mo.x, y: mo.y, r: 20, he: F.he }); FX.shockRing(mo.x, mo.y, 26, sk, 0.35, 2); }
        else if (A.shape === 'vung' || A.shape === 'quanh') { const c = A.shape === 'quanh' || !A.P ? { x: mo.x, y: mo.y } : A.P; ST.fx6.push({ k: 'burst', t: 0, T: A.big ? 0.6 : 0.35, x: c.x, y: c.y, r: A.r, he: F.he, wet: A.wet, big: A.big }); FX.impact(c.x, c.y, 2, sk, FX.power(A.big ? 0.9 : A.wet ? 0.55 : 0.35), { n: A.wet ? 9 : 5, big: A.big }); if (A.wet) FX.shockRing(c.x, c.y, A.r, sk, A.big ? 0.5 : 0.32, A.big ? 4 : 3); }
      }
    } catch (e) { }
  }
  if (A.t >= A.T) F.act = null;
}
function aiPup(ctx, mo, dt) {   /* khách: quái = bóng theo ảnh chụp của chủ phòng (nội suy vị trí, hoạt ảnh, động tác) */
  const F = mo.f6, N = mo.__net; if (!F || !N) return;
  const e = fighter(ctx, mo); if (e) e.ct += dt;
  const dx = N.x - mo.x, dy = N.y - mo.y, d = Math.hypot(dx, dy);
  if (d > 96) { mo.x = N.x; mo.y = N.y; } else if (d > 0.05) { const k = Math.min(1, dt * 10); mo.x += dx * k; mo.y += dy * k; }
  F.fx = N.fx; F.fy = N.fy; F.alt = N.alt; if (Math.abs(N.fx) > 0.05) mo.dir = N.fx >= 0 ? 1 : -1;
  if (e && N.clip && e.clip !== N.clip) { e.clip = N.clip; e.ct = 0; }
  if (F.act) pupAct(ctx, mo, dt);
}
export function netHurt(d) { const ctx = ST.ctx; if (!ctx) return false; ST.n.hurtIn = (ST.n.hurtIn || 0) + 1; return hurtTarget(ctx, null, 'pl', d); }
export function netTakeOver() {   /* khách → chủ phòng (chủ cũ rời / mất mạng): bóng thành quái thật, bầy thiếu thì hồi sinh dần */
  for (const mo of ST.mons) { if (!mo.__net) continue; mo.c.aiFn = aiF; delete mo.__net; mo.__dying = 0; mo.__pend = null; const F = mo.f6; F.act = null; F.goal = null; F.home = F.home || { x: mo.x, y: mo.y }; if (F.mode === 'angry') { F.tg = 'pl'; F.tgT = 0; } }
  NETM.clear(); ST.shots = ST.shots.filter(b => !b.vis);
  for (const [rid, Z] of Object.entries(ZR)) {
    const have = ST.mons.filter(m => m.f6 && m.f6.rid === rid && m.hp > 0 && !m.dead);
    if (!have.some(m => m.f6.lead) && !ST.rq.some(q => q.rid === rid && q.lead)) ST.rq.push({ rid, spec: Z.lead, lead: true, ct: true, t: 30 });
    const want = Z.mins.length - have.filter(m => !m.f6.ct).length - ST.rq.filter(q => q.rid === rid && !q.ct).length;
    for (let i = 0; i < want; i++) ST.rq.push({ rid, spec: { key: Z.mins[i % Z.mins.length] }, lead: false, ct: false, t: 4 + i * 2 });
  }
  log({ ev: 'takeover', n: ST.mons.length, rq: ST.rq.length });
}
export function netStat() { return { on: ST.on, role: NET.role, mons: ST.mons.length, net: NETM.size, n: { ...ST.n }, xp: { ...ST.xp } }; }

/* ================= c10: BẮT CHẤN THÚ HOANG BỊ HẠ — NÉM ẤN THU (anh 04/11) =================
   Chấn Thú hoang (F.ct — thủ lĩnh các vùng) ngã → nằm NGẤT tại chỗ CATCH_T giây (clip faint). AI CŨNG ném Ấn Thu được (bấm quả cầu trên thanh công cụ,
   hoặc E / nút A khi đứng gần), mỗi lần tốn 1 Ấn Thu: người HẠ nó (đòn cuối của chính họ hoặc Chấn Thú của họ; chơi chung: chủ phòng ghi 'r:<id>' → máy người đó)
   tỉ lệ cao (RATE.mine), người khác thấp (RATE.other). Trượt → nó vẫn nằm, ném tiếp được tới hết giờ. Trúng → con đó vào đội (đầy thì kho), cấp giữ nguyên.
   Chơi chung: trúng phải xin chủ phòng XÁC NHẬN (ai xin trước được) → không 2 người cùng bắt 1 con; xong mọi máy bỏ xác. */
const CATCH_T = 14, RATE = { mine: 0.85, mineLead: 0.75, other: 0.3, otherLead: 0.2 }, BALL_R = 90;
const CT = { THROW: 0.45, SUCK: 0.35, DROP: 0.28, GAP: 0.3, SHAKE: 0.42 };   /* nhịp như trận đấu (linhduel CATCH): bay xoay → hút → rơi → [chờ · lắc] × tối đa 3 → loé / bung */
/* Ấn Thu PixelLab dùng chung với trận đấu: assets/px/duel/anthu/{anthu_spin,anthu_shake,anthu_ok,anthu_fail}.png + .json (ảnh 2× → vẽ cỡ logic fw×fh, neo ax/ay) */
const ANT = {}, ANT_IDS = ['anthu_spin', 'anthu_shake', 'anthu_ok', 'anthu_fail']; let ANTP = null;
function antLoad() { if (ANTP || typeof fetch === 'undefined') return; ANTP = 1; for (const id of ANT_IDS) fetch('assets/px/duel/anthu/' + id + '.json').then(r => (r.ok ? r.json() : null)).then(j => { if (!j || typeof Image === 'undefined') return; const im = new Image(); im.src = 'assets/px/duel/anthu/' + id + '.png'; ANT[id] = { n: j.n, w: j.fw, h: j.fh, ax: j.ax, ay: j.ay, fps: j.fps || 12, im }; }).catch(() => { }); }
function antDraw(g, id, fr, x, y, a = 1) { const m = ANT[id], im = m && m.im; if (!im || !im.complete || !im.naturalWidth) return false; const sw = im.naturalWidth / m.n; g.save(); g.globalAlpha *= a; g.imageSmoothingEnabled = false; g.drawImage(im, (fr % m.n) * sw, 0, sw, im.naturalHeight, Math.round(x - m.ax), Math.round(y - m.ay), m.w, m.h); g.restore(); return true; }
const ballImg = antLoad;   /* faintAdd gọi sẵn để ảnh nạp trước khi ném */
const dsfx = (ctx, n, d) => { try { if (ctx.duelSfx) ctx.duelSfx(n, d || null); } catch (e) { } };
const CLAIMED = new Set();   /* chủ phòng / chơi một mình: xác đã có người bắt */
function faintAdd(ctx, mo, F, who, key) {
  if (!F || !F.sp || !F.ct) return null;
  const i = ST.dying.findIndex(d => d.e === F.e); if (i >= 0) ST.dying.splice(i, 1);   /* không mờ dần — nằm lại chờ bắt */
  let e = F.e; if (!e && ctx.ldKit && ctx.ldKit.ready()) { try { e = ctx.ldKit.mk(F.sp, F.lv, null, mo.x, mo.y); } catch (er) { e = null; } }
  if (e) { e.clip = hasClip(ctx, F, 'faint') ? 'faint' : 'idle'; e.ct = 0; }
  const z = { key, sp: F.sp, lv: F.lv, he: F.he, x: mo.x, y: mo.y, alt: 0, fx: F.fx, fy: F.fy, e, mine: who === 'me', t: 0, T: CATCH_T, lead: !!F.lead, busy: false };
  (ST.fz ||= []).push(z); ballImg(); ST.n.faint = (ST.n.faint || 0) + 1; log({ ev: 'faint', key, sp: F.sp, lv: F.lv, mine: z.mine });
  if (z.mine) { try { ctx.toast(vi(ctx) ? `${spName(ctx, F.sp)} ngất! Ném Ấn Thu để bắt` : `${spName(ctx, F.sp)} fainted! Throw a Seal Orb to catch it`); } catch (er) { } }
  return z;
}
function faintTick(ctx, dt) {
  for (const b of ST.balls || []) ballTick(ctx, b, dt); ST.balls = (ST.balls || []).filter(b => !b.end2);
  if (!ST.fz || !ST.fz.length) return;
  for (const z of ST.fz) { if (!z.busy) z.t += dt; if (z.e) z.e.ct += dt; if (z.t >= z.T && z.e) ST.dying.push({ e: z.e, x: z.x, y: z.y, alt: 0, t: 0.55, fx: z.fx, fy: z.fy }); }   /* hết giờ → mờ dần biến mất */
  ST.fz = ST.fz.filter(z => z.t < z.T);
}
function faintNear(ctx) {
  const p = ctx.S.player; let best = null, bd = 40;
  for (const z of ST.fz || []) { if (z.busy) continue; const d = Math.hypot(z.x - p.x, z.y - p.y); if (d >= bd) continue; bd = d;
    best = { label: vi(ctx) ? `◉ Ném Ấn Thu · ${spName(ctx, z.sp)} Lv${z.lv}` : `◉ Throw Seal Orb · ${spName(ctx, z.sp)} Lv${z.lv}`, x: z.x, y: z.y + 18, limit: 52, priority: true, data: { f106c: z } }; }
  return best;
}
const rateOf = z => (z.mine ? (z.lead ? RATE.mineLead : RATE.mine) : (z.lead ? RATE.otherLead : RATE.other));
export function ballInfo(ctx) {   /* nút Ấn Thu điện thoại: số Ấn Thu + có con ngất trong tầm ném không */
  ctx = ctx || ST.ctx; if (!ctx || !ST.on) return { on: false }; let n = 0; try { const d = ctx.chanthu && ctx.chanthu.ensure(); n = d ? d.anThu | 0 : 0; } catch (e) { }
  const p = ctx.S.player, near = (ST.fz || []).some(z => !z.busy && Math.hypot(z.x - p.x, z.y - p.y) < BALL_R); return { on: true, n, near };
}
export function ballThrow(ctx, z) {   /* quả cầu trên thanh công cụ / E / A: ném Ấn Thu vào Chấn Thú ngất gần nhất trong BALL_R */
  ctx = ctx || ST.ctx; if (!ctx) return false; const p = ctx.S.player, V = vi(ctx);
  if (!z) { let bd = BALL_R; for (const q of ST.fz || []) { if (q.busy) continue; const d = Math.hypot(q.x - p.x, q.y - p.y); if (d < bd) { bd = d; z = q; } } }
  if (!z || !(ST.fz || []).includes(z)) { try { ctx.toast(V ? 'Không có Chấn Thú nào đang ngất gần đây — hạ Chấn Thú hoang rồi ném Ấn Thu' : 'No fainted beast nearby — defeat a wild beast, then throw a Seal Orb'); } catch (e) { } return false; }
  if (z.busy || (ST.balls || []).some(b => b.z === z)) return false;
  if (!ctx.chanthu || !ctx.chanthu.useBall || !ctx.chanthu.useBall()) { try { ctx.toast(V ? 'Hết Ấn Thu — mua ở Thương nhân' : 'Out of Seal Orbs — buy more from the Merchant'); } catch (e) { } return false; }
  const P0 = rateOf(z), q = Math.pow(P0, 1 / 3); let shakes = 0; while (shakes < 3 && Math.random() < q) shakes++;   /* như trận đấu: mỗi lần lắc qua với xác suất p^(1/3); qua đủ 3 = bắt được */
  const ok = shakes >= 3; z.busy = true; if (p.faceTo) p.faceTo(z.x, z.y); antLoad();
  const b = { z, x0: p.x, y0: p.y - 10, x: p.x, y: p.y, h: 10, t: 0, ph: 'throw', shakes: Math.min(3, shakes), done: 0, ok, res: ok ? null : 'fail', fin: false, ask: false };
  (ST.balls ||= []).push(b); if (ok) { b.ask = true; claim(z.key, ok2 => { b.res = ok2 ? 'ok' : 'taken'; }); }   /* xin xác nhận ngay lúc ném → trả lời về trong lúc cầu đang lắc */
  dsfx(ctx, 'orb_throw', { side: 0, anthu: true });
  try { if (p.act && p.hasAct && p.hasAct('throw')) p.act('throw', 0.4); } catch (e) { }
  ST.n.ball = (ST.n.ball || 0) + 1; log({ ev: 'ball', key: z.key, sp: z.sp, mine: z.mine, rate: rateOf(z), ok, shakes: b.shakes }); return true;
}
function ballTick(ctx, b, dt) {
  b.t += dt; const z = b.z, V = vi(ctx), nm = spName(ctx, z.sp), ph = b.ph;
  const go = n => { b.ph = n; b.t = 0; };
  if (ph === 'throw') { const k = Math.min(1, b.t / CT.THROW); b.x = b.x0 + (z.x - b.x0) * k; b.y = b.y0 + 10 + (z.y - b.y0 - 10) * k; b.h = 10 * (1 - k) + 12 * k + Math.sin(Math.PI * k) * 24; if (k >= 1) { go('suck'); dsfx(ctx, 'recall', { side: 1, anthu: true }); } return; }
  if (ph === 'suck') { if (b.t >= CT.SUCK) go('drop'); return; }
  if (ph === 'drop') { const k = Math.min(1, b.t / CT.DROP); b.h = k < 0.7 ? 12 * (1 - k / 0.7) : Math.sin(Math.PI * (k - 0.7) / 0.3) * 3; if (k >= 1) { b.h = 0; go('wait'); try { FX.dust && FX.dust(z.x, z.y, 4, 0); } catch (e) { } } return; }
  if (ph === 'wait') {
    if (b.t < CT.GAP) return;
    if (b.done < b.shakes) { go('shake'); dsfx(ctx, 'catch_shake', { n: b.done + 1 }); return; }
    if (b.res == null) return;   /* đủ 3 lần lắc mà chủ phòng chưa xác nhận → nằm yên chờ */
    if (b.res === 'ok') {
      go('ok'); b.fin = true; z.busy = false;
      const where = ctx.chanthu.add(z.sp, z.lv); try { const d = ctx.chanthu.ensure(); d.caught = (d.caught | 0) + 1; } catch (e) { } try { ctx.persist(); } catch (e) { }
      ST.fz = ST.fz.filter(q => q !== z); ST.n.caught = (ST.n.caught || 0) + 1; log({ ev: 'caught', key: z.key, sp: z.sp, lv: z.lv, where, mine: z.mine });
      try { ctx.toast(V ? `Đã bắt ${nm} Lv${z.lv}! → ${where === 'team' ? 'vào đội' : 'vào kho'}` : `Caught ${nm} Lv${z.lv}! → ${where === 'team' ? 'joined your team' : 'sent to storage'}`); } catch (e) { }
      try { FX.shout(z.x, z.y - 30, V ? 'BẮT ĐƯỢC!' : 'CAUGHT!', '#ffd45e', 0.9, 0.9); } catch (e) { }
      dsfx(ctx, 'catch_ok', { sp: z.sp }); try { ctx.sfx && ctx.sfx('level_up'); } catch (e) { }
      try { if (NET.caught) NET.caught(z.key); } catch (e) { }   /* máy khác bỏ xác */
    } else {
      go('fail'); b.fin = true; z.busy = false; z.flash = 0.14;
      if (b.res === 'taken') { try { ctx.toast(V ? `${nm} đã bị người khác bắt mất` : `Someone else caught ${nm} first`); } catch (e) { } ST.fz = ST.fz.filter(q => q !== z); }
      else { try { FX.shout(z.x, z.y - 30, V ? 'THOÁT!' : 'BROKE FREE!', '#ffd0b0', 0.8, 0.8); } catch (e) { } log({ ev: 'ballfail', key: z.key, shakes: b.shakes }); }
      dsfx(ctx, 'catch_fail', { sp: z.sp });
    }
    return;
  }
  if (ph === 'shake') { if (b.t >= CT.SHAKE) { b.done++; go('wait'); } return; }
  if (ph === 'ok') { const m = ANT.anthu_ok; if (b.t >= Math.max(0.6, m ? m.n / m.fps : 0.6) + 0.5) b.done2 = true; }
  if (ph === 'fail') { const m = ANT.anthu_fail; if (b.t >= (m ? m.n / m.fps : 0.5)) b.done2 = true; }
  if (b.done2) b.end2 = true;
}
function claim(key, cb) {   /* chủ phòng / một mình: tự quyết; khách: xin chủ phòng (ai xin trước được) */
  if (NET.role === 'guest' && NET.claim) { NET.claim(key, cb); return; }
  const ok = !CLAIMED.has(key); CLAIMED.add(key); cb(ok);   /* giữ chỗ cho người ném trước; xác chỉ biến mất ở máy khác khi bắt XONG (NET.caught ở pha ok) */
}
export function netClaim(key) { if (CLAIMED.has(key)) return false; CLAIMED.add(key); return true; }   /* chủ phòng nhận lời xin của khách */
export function faintGone(key) { const n0 = (ST.fz || []).length; ST.fz = (ST.fz || []).filter(z => z.key !== key || (ST.balls || []).some(b => b.z === z && !b.fin)); return n0 !== ST.fz.length; }   /* người khác đã bắt → bỏ xác (trừ xác mình đang ném dở: kết quả 'taken' tự bỏ) */
function faintDraw(ctx, g, z, cx, cy) {
  if (SHADOW.on) shadowFor(g, z.x, z.y, (globalThis.__R89 || Math.round)(z.x - cx), (globalThis.__R89 || Math.round)(z.y - cy) + 1, globalThis.__fw110 ? globalThis.__fw110(z.sp, 13) : 13, 0);
  const e = z.e; if (!e || !ctx.ldKit) return; const B = (ST.balls || []).find(b => b.z === z && !b.end2);
  if (B && B.ph !== 'throw' && B.ph !== 'suck' && B.ph !== 'fail') return;   /* đang nằm trong Ấn Thu */
  e.x = z.x; e.y = z.y; e.alt = 0; e.fx = z.fx; e.fy = z.fy; e.flash = B && B.ph === 'fail' && B.t < 0.15 ? 0.14 : 0;
  if (B && B.ph === 'suck') { const k = Math.min(1, B.t / CT.SUCK); e.flash = 0.2; g.save(); g.globalAlpha = Math.max(0, 1 - k); ctx.ldKit.draw(g, e, cx, cy); g.restore(); return; }   /* bị hút vào Ấn Thu: loé sáng rồi tan về viên ấn */
  const left = z.T - z.t; if (left < 1.5) { g.save(); g.globalAlpha = Math.max(0.25, left / 1.5); ctx.ldKit.draw(g, e, cx, cy); g.restore(); } else ctx.ldKit.draw(g, e, cx, cy);
}
function ballDraw(ctx, g, b, cx, cy) {   /* Ấn Thu như trận đấu: bay = anthu_spin (xoay), nằm / lắc = anthu_shake (khung 0,1,0,3,0), bắt được = anthu_ok, bung = anthu_fail */
  const z = b.z, X = b.ph === 'throw' ? b.x : z.x, Y = b.ph === 'throw' ? b.y : z.y, H = b.ph === 'throw' || b.ph === 'drop' ? b.h : 0, sx = X - cx, sy = Y - cy;
  if (SHADOW.on && b.ph !== 'fail' && !(b.ph === 'ok' && b.t < 0.56)) shadowFor(g, X, Y, Math.round(sx), Math.round(sy) + 1, 6, H);
  if (b.ph === 'throw') { const m = ANT.anthu_spin; if (!antDraw(g, 'anthu_spin', Math.floor(b.t * (m ? m.fps : 14)), sx, sy - H)) { g.fillStyle = '#ffd45e'; g.fillRect(Math.round(sx) - 3, Math.round(sy - H) - 3, 6, 6); } return; }
  if (b.ph === 'ok') { const m = ANT.anthu_ok; if (b.t < 0.56 && m) antDraw(g, 'anthu_ok', Math.min(m.n - 1, Math.floor(b.t * m.fps)), sx, sy - 8); else { antDraw(g, 'anthu_shake', 0, sx, sy, Math.max(0, Math.min(1, (1.1 - b.t) / 0.4))); if (m && b.t < m.n / m.fps) antDraw(g, 'anthu_ok', Math.min(m.n - 1, Math.floor(b.t * m.fps)), sx, sy - 8); } return; }
  if (b.ph === 'fail') { const m = ANT.anthu_fail; if (m) antDraw(g, 'anthu_fail', Math.min(m.n - 1, Math.floor(b.t * m.fps)), sx, sy - 8); return; }
  const fr = b.ph === 'shake' ? [0, 1, 0, 3, 0][Math.min(4, Math.floor(b.t / CT.SHAKE * 5))] : 0;
  antDraw(g, 'anthu_shake', fr, sx, sy - H);
}
if (typeof window !== 'undefined') window.__f106c = { list: () => (ST.fz || []).map(z => ({ key: z.key, sp: z.sp, lv: z.lv, mine: z.mine, busy: z.busy, x: Math.round(z.x), y: Math.round(z.y), left: +(z.T - z.t).toFixed(1) })), throwKey: key => { const z = (ST.fz || []).find(q => q.key === key); return ballThrow(ST.ctx, z || null); }, rate: o => Object.assign(RATE, o || {}), rates: () => ({ ...RATE }), near: () => { const c = ST.ctx && faintNear(ST.ctx); return c ? c.label : null; }, balls: () => (ST.balls || []).length, ballSt: () => (ST.balls || []).map(b => ({ ph: b.ph, t: +b.t.toFixed(2), shakes: b.shakes, done: b.done, res: b.res })), ant: () => Object.fromEntries(Object.entries(ANT).map(([k, m]) => [k, !!(m.im && m.im.naturalWidth)])) };
