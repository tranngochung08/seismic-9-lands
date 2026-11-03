/* feed80.js — plan-80 ĐỢT 2 (anh duyệt 02/11): CHO CHẤN THÚ ĂN = TIỀM NĂNG THEO HỆ. Chặt cây / hái hoa / trồng trọt thành việc phụ để nuôi Chấn Thú.
   · Đang thả Chấn Thú (comp79) mà đứng cạnh nó (≤ 28 px) → E: "Cho <tên> ăn <món>". Ưu tiên món đang cầm (nếu ăn được);
     không cầm món ăn được → tự chọn món có trong túi cho NHIỀU Tiềm Năng nhất (món hợp hệ con thú trước).
   · Món → Tiềm Năng của HỆ MÓN (bảng FEED); món cùng hệ với con thú ×2. Tiềm Năng là kho chung theo hệ (fieldct), rót cho Chấn Thú cùng hệ ở bảng ✦ Tiềm Năng.
   · No bụng: mỗi con tối đa FULL món / ngày game (save.sys.p79.fed) — để không thay được việc đánh thú hoang. Đói không bị phạt.
   · Hiệu ứng: chỉ khi ăn (cắn nhỏ fx78 + chữ +Tiềm Năng nổi lên), không lặp. */
import { SPECIES, TYPE_NAME } from './duel-data.js';
import * as FX from './fx78.js';
export const FEED = {   /* món: [hệ, Tiềm Năng gốc] */
  rock: ['chan', 1], ore: ['chan', 1], turnip: ['chan', 2], yam: ['chan', 2], quakeflower: ['chan', 3],
  charcoal: ['nham', 1], ember: ['nham', 1], meat: ['nham', 2], tomato: ['nham', 2], lava: ['nham', 2], obsidian: ['nham', 2],
  fish: ['trieu', 2], shell: ['trieu', 1], gel: ['trieu', 1], pearl: ['trieu', 3], seagem: ['trieu', 3],
  berry: ['moc', 1], wood: ['moc', 1], resin: ['moc', 1], seed: ['moc', 1],
  leaf: ['phong', 1], hay: ['phong', 1], feather: ['phong', 1], egg: ['phong', 1],
  honey: ['loi', 2], wax: ['loi', 1],
  milk: ['suong', 1], ice: ['suong', 2], wool: ['suong', 1],
  crystal: ['tinh', 2], strawberry: ['tinh', 2], greatcrystal: ['tinh', 3],
  shard: ['ma', 2], core: ['ma', 1],
  pumpkin: ['am', 2], corn: ['quang', 2], flower: ['quang', 1],
  mushroom: ['anh', 1], starmush: ['anh', 3], soul: ['anh', 2],
};
const FULL = 5;
const TEN = { chan: 'Quake', nham: 'Magma', trieu: 'Tide', loi: 'Thunder', phong: 'Wind', moc: 'Wood', suong: 'Frost', tinh: 'Star', ma: 'Code', am: 'Sound', anh: 'Shadow', quang: 'Light' };
const vi = ctx => ctx.lang() !== 'en';
const ST = { ctx: null, n: { feed: 0, full: 0 }, log: [] };
const team0 = ctx => { try { const d = ctx.chanthu && ctx.chanthu.ensure && ctx.chanthu.ensure(); return (d && d.team && d.team[0]) || null; } catch (e) { return null; } };
const typesOf = m => (SPECIES[m.sp] && SPECIES[m.sp].types) || [];
const heN = (ctx, he) => (vi(ctx) ? TYPE_NAME[he] : TEN[he]) || he;
function fed(ctx, m) { const s = ctx.S.save; s.sys ||= {}; const k = (s.sys.p79 ||= { out: false }); const day = ctx.clock ? ctx.clock.dayIndex : 0; if (!k.fed || k.fed.day !== day) k.fed = { day, n: {} }; return { get: () => k.fed.n[m.id] | 0, add: () => { k.fed.n[m.id] = (k.fed.n[m.id] | 0) + 1; } }; }
export function gainOf(m, id) { const f = FEED[id]; if (!f) return null; const same = typesOf(m).includes(f[0]); return { he: f[0], n: f[1] * (same ? 2 : 1), same }; }
function pick(ctx, m) {   /* món đang cầm (nếu ăn được) → không thì món lời nhất trong túi */
  const inv = ctx.S.save.inv || {}, h = ctx.held && ctx.held(); if (h && FEED[h] && (inv[h] | 0) > 0) return h;
  let best = null, bv = -1; for (const id of Object.keys(FEED)) { if (!((inv[id] | 0) > 0)) continue; const g = gainOf(m, id), v = g.n * 10 + (g.same ? 5 : 0) - FEED[id][1] * 0.1; if (v > bv) { bv = v; best = id; } }
  return best;
}
function feed(ctx, m, id) {
  const f = fed(ctx, m), pos = ctx.comp79 && ctx.comp79.pos(), t = vi(ctx);
  if (f.get() >= FULL) { ST.n.full++; ctx.toast(t ? `${m.name || 'Chấn Thú'} no rồi — mai cho ăn tiếp` : `${m.name || 'Your beast'} is full — feed it again tomorrow`); ctx.sfx('fail'); return false; }
  if (!id || !ctx.bag.has(id, 1)) return false; const g = gainOf(m, id); if (!g) return false;
  ctx.bag.remove(id, 1); f.add(); ST.n.feed++;
  if (ctx.fieldct && ctx.fieldct.tnAdd) ctx.fieldct.tnAdd(g.he, g.n, pos ? { x: pos.x, y: pos.y + 8 } : null);
  if (pos) { const sk = FX.skinOf(m.sp, typesOf(m)[0]); FX.bite(pos.x, pos.y - 6, 4, sk, FX.power(0.05)); }
  ctx.sfx('pickup'); ST.log.push({ id, he: g.he, n: g.n, same: g.same, left: FULL - f.get() }); if (ST.log.length > 40) ST.log.shift();
  ctx.toast(t ? `${m.name || 'Chấn Thú'} ăn ${ctx.itemName ? ctx.itemName(id) : id} · +${g.n} Tiềm Năng ${heN(ctx, g.he)}${g.same ? ' (hợp hệ ×2)' : ''} · còn ${FULL - f.get()} lần hôm nay`
    : `${m.name || 'Your beast'} ate ${ctx.itemName ? ctx.itemName(id) : id} · +${g.n} ${heN(ctx, g.he)} Potential${g.same ? ' (same type ×2)' : ''} · ${FULL - f.get()} left today`);
  ctx.persist(); return true;
}
export const feed80 = {
  id: 'feed80',
  always: true,
  onZoneEnter(ctx) {
    ST.ctx = ctx;
    if (typeof window !== 'undefined') window.__feed80 = { FEED, gain: id => { const m = team0(ctx); return m ? gainOf(m, id) : null; }, pick: () => { const m = team0(ctx); return m ? pick(ctx, m) : null; }, feed: id => { const m = team0(ctx); return m ? feed(ctx, m, id || pick(ctx, m)) : false; }, n: () => ({ ...ST.n }), log: () => ST.log.slice(), left: () => { const m = team0(ctx); return m ? FULL - fed(ctx, m).get() : 0; } };
  },
  near(ctx) {
    if (ctx.S.mode !== 'play' || !ctx.comp79 || !ctx.comp79.out() || (ctx.duel && ctx.duel.active && ctx.duel.active())) return null;
    const pos = ctx.comp79.pos(), p = ctx.S.player, m = team0(ctx); if (!pos || !m) return null; const dd = Math.hypot(pos.x - p.x, pos.y - p.y); if (dd > 28) return null;
    { const fv = [[0, 1], [-1, 0], [1, 0], [0, -1]][p.dir] || [0, 1]; if (dd > 6 && ((pos.x - p.x) * fv[0] + (pos.y - p.y) * fv[1]) / dd < 0.4) return null; }   /* chỉ khi QUAY MẶT về phía con thú — nó đi sau lưng nên lúc đi / chặt cây không giành phím E */
    const id = pick(ctx, m); if (!id) return null; const g = gainOf(m, id), nm = m.name || (ctx.ldKit ? ctx.ldKit.name(m.sp) : m.sp), left = FULL - fed(ctx, m).get();
    const label = left <= 0 ? (vi(ctx) ? `${nm} no rồi` : `${nm} is full`) : (vi(ctx) ? `Cho ${nm} ăn ${ctx.itemName ? ctx.itemName(id) : id} (+${g.n} ${heN(ctx, g.he)})` : `Feed ${nm} ${ctx.itemName ? ctx.itemName(id) : id} (+${g.n} ${heN(ctx, g.he)})`);
    return { label, x: pos.x, y: pos.y - 4, limit: 28, priority: -1, data: { feed80: id } };   /* ưu tiên thấp nhất: mọi việc khác thắng */
  },
  interact(ctx, cand) { const id = cand && cand.data && cand.data.feed80; const m = team0(ctx); if (id && m) feed(ctx, m, id); },
};
