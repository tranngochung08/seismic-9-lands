// blast.js — 2026-10-12 tối (anh): luồng Rocky-ha (pet.js beamTick) PHÁ VẬT CHẮN trên đường đi. Không phải hệ (system) — hàm tiện ích pet.js gọi.
//  · Luồng đi từ Rocky theo hướng bắn, gặp vật cứng đầu tiên:
//      – vật KHÔNG phá được (cổng / biển lối ra / cổng đèo chưa thắng / bia Leader / mộ / cần gạt / thư viện câu đố / hải đăng / xác tàu / giường /
//        vành 2 ô sát mép bản đồ / vật chưa có ảnh hư + đổ nát PixelLab riêng) → luồng DỪNG tại đó;
//      – vật phá được → trừ HA_POW máu (petlv.js); sập thì luồng đi tiếp nếu còn lượt xuyên (HA_PIERCE), chưa sập / hết lượt → dừng ở vật đó.
//  · 9 đoạn đèo: dùng road.js (ctx.roadHitObj) — ảnh hư / đổ nát riêng (manifest.ruins), đổ nát đi xuyên được, vành ngoài không vỡ, unstick lo phần kẹt.
//  · Vùng thường: cây đổ như bị chặt (trees.js ctx.treeFell → rơi gỗ), đá / mỏ vỡ như bị đục (gather.js ctx.gatherBreak → rơi đá / quặng);
//    nhà / đình / giếng / bàn chế tạo / biển / thùng / rào / tượng / đèn… → HƯ rồi ĐỔ NÁT bằng ảnh PixelLab của CHÍNH vật đó (manifest.ruins).
//    Đổ nát vẫn CỨNG như cũ (không mở lối tắt qua rào/tường, không ai bị kẹt mới) và CHỈ TẠM: vào lại vùng = lành (bản đồ dựng mới, không ghi save —
//    main.js saveDistricts bỏ qua o.rkMax). Vật đang sập thì tương tác của nó tạm tắt (main.js findNear bỏ o.rkRuin).
//  · Vùng có danh sách hệ riêng (dưới nước, Sàn Đấu Ngầm, vực): không phá gì, luồng chỉ dừng ở vật cứng.
//  · NPC / người bán (quầy = NPC đứng, o.ghost) / thú không phải vật thể → không bị phá; quái vẫn trúng sát thương như cũ (pet.js lineHits).
const TS = 16;
const PROTECT_T = /^(exit_sign|exit_sign_lock|arena_sign|arena_door|monument|memorial|tomb|lever|lever_off|lever_on|lighthouse|wreck|bed|library|pass_gate|pass_gate_open|gate|lock|seal|crystal_egg|elder_mark|land_post|land_sign|sumo_ring|stall|ore|veh_\w+)$/;
const PROTECT_F = ['exit', 'passGate', 'lock', 'seal', 'hall', 'memorial', 'lever', 'quiz', 'lighthouse', 'wreck', 'bed', 'tomb', 'requires', 'puzzle', 'story', 'door', 'boss', 'trader', 'dealer', 'shop', 'staff', 'nest', 'egg'];
const WOODY = /^(tree|palm|pine|pine_s|deadtree)$/;
const ST = { log: [] };
/* máu vật theo cỡ (pow mỗi phát ở petlv.js HA_POW 1→5) */
export function hpOf(ctx, o) {
  const d = ctx.O[o.type] || { fw: 1, fh: 1 }, t = o.orig || o.type;
  if (WOODY.test(t)) return 3; if (t === 'boulder') return 4; if (/rock|vein|crystal/.test(t)) return 2;
  return Math.max(2, Math.min(12, 2 * d.fw * d.fh));
}
const normalZone = ctx => !(ctx.S.zone && ctx.S.zone.systems);
function objAt(ctx, tx, ty) {
  const m = ctx.S.map;
  for (const o of m.objects) { if (o.ghost || o.ruined) continue; const d = ctx.O[o.type]; if (!d || d.solid === false) continue; if (tx >= o.x && tx < o.x + d.fw && ty >= o.y && ty < o.y + d.fh) return o; }
  return null;
}
/* vật này có phá được không (vùng thường) — trả kiểu: 'tree' | 'node' | 'ruin' | null */
export function kindOf(ctx, o) {
  const m = ctx.S.map, d = ctx.O[o.type]; if (!d) return null;
  if (o.x < 2 || o.y < 2 || o.x + d.fw > m.w - 2 || o.y + d.fh > m.h - 2) return null;   /* vành mép bản đồ */
  if (PROTECT_T.test(o.type) || PROTECT_F.some(k => o[k] != null && o[k] !== false)) return null;
  if (WOODY.test(o.type) && ctx.treeFell) return 'tree';
  if (ctx.gatherBreak && ctx.gatherBreak.can(o)) return 'node';
  if (ctx.ART && ctx.ART.ruinOf && ctx.ART.ruinOf(o.type, 'dmg') && ctx.ART.ruinOf(o.type, 'ruin')) return 'ruin';
  return null;
}
function fx(ctx, o, wood, big) {
  const d = ctx.O[o.orig || o.type] || { fw: 1, fh: 1 }, x = o.x * TS + d.fw * 8, y = (o.y + d.fh) * TS - 4;
  if (ctx.vfx) { ctx.vfx(wood ? 'wood_chips' : 'rock_debris', x, y); if (big) { ctx.vfx(wood ? 'wood_chips' : 'rock_debris', x - 6, y - 6); if (wood) ctx.vfx('leaf_fall', x, y - 18); ctx.vfx('dirt_puff', x, y + 2); } }
  ctx.sfx(big ? 'smash' : 'knock_wall'); if (ctx.quake) ctx.quake(big ? 0.18 : 0.08);   /* rung NGẮN, chỉ lúc trúng (luật 2026-09-22) */
}
/* 1 phát trúng vật o (vùng thường). Trả { gone } — gone = vật đã sập / đổ / vỡ (luồng được đi tiếp) */
function hitNormal(ctx, o, pow, kind, face) {
  if (o.rkMax == null) { o.rkPrev = o.hp; o.rkMax = hpOf(ctx, o); }   /* rkPrev: máu khu cũ (main.js saveDistricts giữ nguyên, Rocky chỉ hư tạm) */ o.rkHp = (o.rkHp ?? o.rkMax) - pow; const wood = WOODY.test(o.type) || /bush|crate|bench|loom|sign|boat|cart|fence|post|beam/.test(o.type);
  if (kind === 'tree') { if (o.rkHp > 0) { fx(ctx, o, true, false); if (ctx.treeShake) ctx.treeShake(o); return { gone: false }; } fx(ctx, o, true, true); ctx.treeFell(o, face); return { gone: true }; }
  if (kind === 'node') { if (o.rkHp > 0) { fx(ctx, o, false, false); return { gone: false }; } fx(ctx, o, false, true); ctx.gatherBreak(o); return { gone: true }; }
  /* công trình / vật trang trí: hư → đổ nát (ảnh PixelLab riêng), vẫn cứng, chỉ tạm */
  o.hpMax = o.rkMax; o.hp = Math.max(0, o.rkHp);
  if (o.rkHp > 0) { fx(ctx, o, wood, false); return { gone: false }; }
  o.orig = o.type; o.ruined = true; o.rkRuin = true; o.hp = 0; const m = ctx.S.map; (m.rkRuins ||= []).push(o);
  { const d = ctx.O[o.type] || { fw: 1, fh: 1 }; m.rkRuinTiles ||= new Set(); for (let j = 0; j < d.fh; j++) for (let i = 0; i < d.fw; i++) { m.rkRuinTiles.add((o.y + j) * m.w + o.x + i); if (ctx.setSolid) ctx.setSolid(m, o.x + i, o.y + j, 0); } }   /* 2026-10-12 tối anh: đống đổ nát ĐI XUYÊN ĐƯỢC với cả người chơi (chấp nhận mở lối tắt qua rào/tường) — đào dọn bằng xẻng (hệ rubble bên dưới) */
  fx(ctx, o, wood, true); return { gone: true };
}
/* luồng Rocky-ha: (x0, y0) gốc luồng px, ang = GÓC THẬT (rad, 0 phải · π/2 xuống — 2026-10-12 tối anh: bắn mọi góc), range px, pierce lượt xuyên, pow sức phá
   → { len: luồng thật dài bao nhiêu px, hits: [...] }. Dò từng bước 4 px dọc đường thẳng (chéo cũng vậy) → vật nào nằm trên đường đều bị xét theo thứ tự gần → xa. */
export function blastBeam(ctx, x0, y0, ang, range, pierce, pow) {
  const m = ctx.S.map, vx = Math.cos(ang), vy = Math.sin(ang), hits = [], seen = new Set(), road = !!(m && m.road && ctx.roadHitObj), normal = normalZone(ctx) && !road;
  if (!m) return { len: range, hits };
  let left = pierce;
  for (let a = 6; a <= range; a += 4) {
    const x = x0 + vx * a, y = y0 + vy * a, tx = Math.floor(x / TS), ty = Math.floor(y / TS);
    if (tx < 0 || ty < 0 || tx >= m.w || ty >= m.h) return { len: a, hits };
    const o = objAt(ctx, tx, ty); if (!o || seen.has(o)) continue; seen.add(o);
    let res = null;
    if (road) res = ctx.roadHitObj(o, pow);   /* null = không phá được (vành ngoài / cổng / biển) */
    else if (normal) { const k = kindOf(ctx, o); if (k) res = hitNormal(ctx, o, pow, k, vx >= 0 ? 1 : -1); }
    hits.push({ type: o.orig || o.type, x: o.x, y: o.y, broke: !!(res && res.gone), stop: !res || !res.gone });
    if (!res) return { len: Math.max(6, a - 2), hits };   /* vật không phá được: luồng dừng sát mặt vật */
    left--; if (!res.gone || left <= 0) return { len: Math.max(6, a + 4), hits };
  }
  return { len: range, hits };
}
/* 2026-10-12 tối anh (phe Xealist): Rocky đuổi quái vướng vật → ĐẤM VỠ vật trước mặt (pet.js). Cùng luật Rocky-ha: null = không phá được. */
export function smashObj(ctx, o, pow, face = 1) {
  const m = ctx.S.map; if (!m || !o || o.ruined || o.ghost) return null;
  if (m.road && ctx.roadHitObj) return ctx.roadHitObj(o, pow);
  if (!normalZone(ctx)) return null;
  const k = kindOf(ctx, o); return k ? hitNormal(ctx, o, pow, k, face) : null;
}
export function solidObjAt(ctx, tx, ty) { return objAt(ctx, tx, ty); }
/* phe Noxx: Rocky NHẢY QUA vật — không nhảy qua vật khóa tiến trình / biển lối ra / vành mép bản đồ */
export function jumpBlocked(ctx, o) {
  const m = ctx.S.map, d = ctx.O[o.type] || { fw: 1, fh: 1 };
  return o.x < 2 || o.y < 2 || o.x + d.fw > m.w - 2 || o.y + d.fh > m.h - 2 || !!(o.exit || o.passGate || o.lock || o.seal || o.requires) || /^(pass_gate|gate|lock|seal|exit_sign_lock|arena_door)$/.test(o.type);
}
export const blastLog = ST.log;

/* ================================================================ rubble — 2026-10-12 tối anh: dọn đống đổ nát / gốc cây do Rocky-ha / Rocky phe Xealist (hoặc cú văng ở đèo) để lại.
   · GỐC CÂY (trees.js ctx.treeStumps — cây bị bắn đổ / bị chặt còn gốc; ở đèo: cây viền đổ nát) → BỨNG GỐC bằng XẺNG: 3 nhát, rơi 1 gỗ, ô sạch.
   · ĐỔ NÁT công trình / rào / đá (o.rkRuin ở vùng thường; o.ruined đi qua được ở đèo) → ĐÀO DỌN bằng XẺNG: mỗi E / click = 1 nhát, 'Đào dọn (n/m)',
     m = 2 + số ô của vật (tối đa 6); bụi + dăm gỗ / đá vụn (VFX PixelLab sẵn có), rơi 1 gỗ / đá; xong → vật biến mất (o.ghost: không vẽ, không cứng, save khu không ghi — rkMax giữ nguyên).
   · Cần CẦM xẻng (luật hotbar: nhãn 'cần cầm Xẻng', click / nút A tự cầm); chưa có xẻng → nhãn bảo chế ở Bàn mộc.
   · Vào lại vùng = mọi thứ lành lại (bản đồ dựng mới) như luật cũ. Đèo: vành ngoài + hàng cổng khi còn chặn (vẫn cứng) KHÔNG đào được. */
const RB_STR = {
  vi: { uproot: (h, m) => `Bứng gốc (${h}/${m})`, dig: (h, m) => `Đào dọn (${h}/${m})`, noShovel: 'Cần xẻng — chế ở Bàn mộc (4 gỗ)', done: 'Dọn sạch!' },
  en: { uproot: (h, m) => `Uproot stump (${h}/${m})`, dig: (h, m) => `Clear rubble (${h}/${m})`, noShovel: 'Needs a shovel — craft it at the workbench (4 wood)', done: 'Cleared!' },
};
const RB_REACH = 26, RB_CD = 0.32, STUMP_HITS = 3;
const RB = { cd: 0, stat: { stumps: 0, ruins: 0, hits: 0 } };
const ruinHits = (ctx, o) => { const d = ctx.O[o.orig || o.type] || { fw: 1, fh: 1 }; return Math.min(6, 2 + d.fw * d.fh); };
function rubbleOk(ctx, o) {   /* đống đổ nát đào được: Rocky phá (vùng thường) hoặc đổ nát đi qua được ở đèo */
  if (o.ghost || !o.ruined) return false; const m = ctx.S.map, d = ctx.O[o.orig || o.type]; if (!d) return false;
  if (o.rkRuin) return true;
  if (!(m.road)) return false;
  if (o.x < 2 || o.y < 2 || o.x + d.fw > m.w - 2 || o.y + d.fh > m.h - 2) return false;
  for (let j = 0; j < d.fh; j++) for (let i = 0; i < d.fw; i++) if (ctx.isSolid(m, o.x + i, o.y + j)) return false;   /* hàng cổng khi đường còn chặn: vẫn cứng → không đào */
  return true;
}
function rubbleCands(ctx) {
  const m = ctx.S.map, out = []; if (!m) return out;
  for (const s of (ctx.treeStumps && ctx.S.sys.some(y => y.id === 'trees') ? ctx.treeStumps() : []))   /* gốc của trees.js chỉ khi hệ trees đang chạy ở vùng này (không lấy gốc cũ của vùng trước) */ out.push({ k: 'stump', s, x0: s.x * TS + 2, x1: s.x * TS + 14, y0: s.y * TS + 4, y1: s.y * TS + 16, cx: s.x * TS + 8, cy: s.y * TS + 12, h: s.dig || 0, max: STUMP_HITS, wood: true });
  for (const o of m.objects) { if (!rubbleOk(ctx, o)) continue; const d = ctx.O[o.orig || o.type], t = o.orig || o.type, wood = WOODY.test(t) || /bush|crate|bench|loom|sign|boat|cart|fence|post|beam|stall|table|coop|barrel/.test(t);
    out.push({ k: WOODY.test(t) ? 'stumpR' : 'ruin', o, x0: o.x * TS, x1: (o.x + d.fw) * TS, y0: o.y * TS, y1: (o.y + d.fh) * TS, cx: o.x * TS + d.fw * 8, cy: (o.y + d.fh) * TS - 5, h: o.dig || 0, max: WOODY.test(t) ? STUMP_HITS : ruinHits(ctx, o), wood }); }
  return out;
}
const holdsShovel = ctx => (ctx.holding ? ctx.holding('shovel') : (ctx.tool && ctx.tool.tier('shovel') > 0));
export const rubble = {
  id: 'rubble', always: true,   /* chạy cả ở đèo (vùng có danh sách hệ riêng) — không có đổ nát / gốc thì không làm gì */
  onZoneEnter() { RB.cd = 0; },
  update(dt) { if (RB.cd > 0) RB.cd -= dt; },
  near(ctx) {
    if (ctx.S.mode !== 'play') return null;
    const p = ctx.S.player; if (!p) return null;
    const mt = ctx.mouseTile && ctx.mouseTile(); let best = null, bd = 1e9;
    for (const c of rubbleCands(ctx)) {
      const nx = Math.max(c.x0, Math.min(c.x1, p.x)), ny = Math.max(c.y0, Math.min(c.y1, p.y - 3)), d0 = Math.hypot(nx - p.x, ny - (p.y - 3));   /* khoảng cách tới MÉP vật (vật to nhiều ô) */
      const under = mt && mt.wx >= c.x0 && mt.wx < c.x1 && mt.wy >= c.y0 - 8 && mt.wy < c.y1;
      const d = under && d0 < RB_REACH * 1.5 ? -1 : d0;
      if (d < RB_REACH && d < bd) { bd = d; best = c; best.under = under; }
    }
    if (!best) return null;
    const T0 = RB_STR[ctx.lang() === 'vi' ? 'vi' : 'en'], lab = (best.k === 'ruin' ? T0.dig : T0.uproot)(best.h, best.max);
    const x = best.under ? mt.wx : best.cx, y = best.under ? mt.wy : best.cy;
    if (holdsShovel(ctx)) return { label: lab, x, y, limit: RB_REACH + 6, priority: 0.6, cursor: 'tool', data: { rb: best } };
    const has = ctx.tool && ctx.tool.tier('shovel') > 0;
    return { label: has && ctx.needHold ? `${ctx.needHold('shovel')} → ${lab}` : T0.noShovel, x, y, limit: RB_REACH + 6, need: true, ...(has ? { needId: 'shovel', cursor: 'tool' } : {}), data: { need: true } };
  },
  interact(ctx, cand) {
    const c = cand && cand.data && cand.data.rb; if (!c || RB.cd > 0) return; RB.cd = RB_CD;
    const m = ctx.S.map, p = ctx.S.player, T0 = RB_STR[ctx.lang() === 'vi' ? 'vi' : 'en'];
    if (c.k === 'stump' ? !(ctx.treeStumps && ctx.treeStumps().includes(c.s)) : !m.objects.includes(c.o) || c.o.ghost) return;
    if (p.faceTo) p.faceTo(c.cx, c.cy);
    if (p.hasAct && p.hasAct('hoe')) p.act('hoe', 0.4);   /* động tác xẻng PixelLab sẵn có (như đào đất ở land.js) */
    const tgt = c.k === 'stump' ? c.s : c.o; tgt.dig = (tgt.dig || 0) + 1; RB.stat.hits++;
    if (ctx.vfx) { ctx.vfx('dirt_puff', c.cx, c.cy); ctx.vfx(c.wood ? 'wood_chips' : 'rock_debris', c.cx, c.cy - 2); }
    ctx.sfx('dig');
    if (tgt.dig < c.max) return;
    /* xong: ô sạch */
    if (ctx.vfx) { ctx.vfx('dirt_puff', c.cx - 5, c.cy + 1); ctx.vfx('dirt_puff', c.cx + 5, c.cy + 1); }
    if (c.k === 'stump') { const L0 = ctx.treeStumps(), i = L0.indexOf(c.s); if (i >= 0) L0.splice(i, 1); RB.stat.stumps++; }
    else {
      const o = c.o, d = ctx.O[o.orig || o.type] || { fw: 1, fh: 1 }; o.ghost = true; o.cleared = true; RB.stat.ruins++;
      for (let j = 0; j < d.fh; j++) for (let i = 0; i < d.fw; i++) { if (ctx.setSolid) ctx.setSolid(m, o.x + i, o.y + j, 0); if (m.rkRuinTiles) m.rkRuinTiles.delete((o.y + j) * m.w + o.x + i); }
      if (m.rkRuins) { const i = m.rkRuins.indexOf(o); if (i >= 0) m.rkRuins.splice(i, 1); }
    }
    if (ctx.give) ctx.give(c.wood ? 'wood' : 'rock', 1, c.cx, c.cy);
    ctx.sfx(c.wood ? 'chop' : 'rock_break'); ctx.toast(T0.done);
  },
};
export const rubbleStat = RB.stat;
