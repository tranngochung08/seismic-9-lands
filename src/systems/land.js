// land.js — plan-25 B1 (anh duyệt 2026-10-10): phe Noxx MUA ĐẤT từ Leader các quốc gia.
//  · Mỗi quốc gia ở mỗi vùng bán 1 mảnh ~6×6 ô trong khu của họ (tự tìm chỗ trống). Giá đá Seismic theo cấp vùng; thân thiện (≥5 lần nói chuyện) giảm 20%.
//  · Đứng cạnh Leader của quốc gia (đã gặp ít nhất 1 lần) → 'Mua đất khu …'. Phe Xealist bị từ chối.
//  · Đất đã mua: ctx.ownsTile(tx, ty) → cày / trồng / dựng chuồng / đào ao như khu nhà; không bị dân khu đó đuổi.
//  · Cọc ranh 4 góc + biển tên người chơi (ảnh PixelLab land_post / land_sign). Lưu save.lands[vùng] = [{ nation, x, y, w, h }].
const W = 6, H = 6, FRIEND = 5;
import { ART } from '../art.js';   /* ô vuông đất phá/đào (ART.soilSq) */
const ST = { list: [], objs: [], chiefs: [], placed: false };
const vi = ctx => ctx.lang() === 'vi';
const zid = ctx => (ctx.S.zone && ctx.S.zone.id) || '';
const lands = ctx => { const s = ctx.S.save; return ((s.lands ||= {})[zid(ctx)] ||= []); };
const price = (ctx, key) => { const lv = Math.max(0, (ctx.S.zone && ctx.S.zone.lv) || 0), base = 30 + 20 * lv; return ((ctx.S.save.talks || {})[key] || 0) >= FRIEND ? Math.round(base * 0.8) : base; };
const natName = (ctx, n) => (n && (n.name || n.key)) || '';
const L = ctx => (vi(ctx) ? {
  buy: (nat, p) => `Mua đất khu ${nat} — ${p} 🪨`, poor: p => `Cần ${p} 🪨 đá Seismic để mua đất`, full: 'Khu này không còn chỗ trống 6×6 để bán',
  bought: (nat, z, w, h) => `Bạn đã sở hữu ${w}×${h} ô đất ở khu ${nat} (${z})! Cày, trồng, đào ao, dựng chuồng tùy ý`,
  dark: 'Leader nhìn bạn đầy nghi ngờ: "Người của Xealist? Không bán."', mine: 'Đất của tôi', none: 'Chưa có mảnh đất nào — gặp Leader các quốc gia để mua.',
  sign: n => (n ? `Đất của ${n}` : 'Đất của bạn'),
} : {
  buy: (nat, p) => `Buy land in the ${nat} district — ${p} 🪨`, poor: p => `Need ${p} 🪨 Seismic stones to buy land`, full: 'No free 6×6 spot left to sell here',
  bought: (nat, z, w, h) => `You now own a ${w}×${h} plot in the ${nat} district (${z})! Till, plant, dig a pond, build pens — your call`,
  dark: 'The leader eyes you warily: "One of Xealist\'s people? Not for sale."', mine: 'My land', none: 'No land yet — meet the leaders of each nation to buy some.',
  sign: n => (n ? `${n}'s land` : 'Your land'),
});
function inParcel(l, tx, ty) { return tx >= l.x && ty >= l.y && tx < l.x + l.w && ty < l.y + l.h; }
export function ownsTile(ctx, tx, ty) { return lands(ctx).some(l => inParcel(l, tx, ty)); }
function defineObjs(ctx) {
  ctx.defineObject('land_post', 16, 16, 1, 1, g => { g.fillStyle = '#352022'; g.fillRect(6, 3, 4, 13); g.fillStyle = '#9c6b3a'; g.fillRect(7, 4, 2, 11); g.fillStyle = '#e84a3a'; g.fillRect(9, 3, 5, 3); }, { solid: false });
  ctx.defineObject('land_sign', 16, 16, 1, 1, g => { g.fillStyle = '#352022'; g.fillRect(2, 2, 12, 8); g.fillRect(7, 9, 2, 7); g.fillStyle = '#f6e7c8'; g.fillRect(3, 3, 10, 6); g.fillStyle = '#4caa4f'; g.fillRect(7, 5, 2, 2); }, { solid: false });
}
function free(ctx, tx, ty) { const m = ctx.S.map; return !ctx.isSolid(m, tx, ty) && !ctx.hasObjectAt(m, tx, ty) && !(m.roads && m.roads[ty * m.w + tx] === 1); }
function findSpot(ctx, plot) {   /* luôn 6×6 trong khu (không đè rào biên); chọn chỗ ít vật cản nhất — vật trên đó người chơi tự PHÁ được */
  let best = null, bs = -1; const w = Math.min(W, plot.w - 2), h = Math.min(H, plot.h - 2), m = ctx.S.map;
  for (let y = plot.y + 1; y + h <= plot.y + plot.h - 1; y++) for (let x = plot.x + 1; x + w <= plot.x + plot.w - 1; x++) {
    if (lands(ctx).some(l => x < l.x + l.w && x + w > l.x && y < l.y + l.h && y + h > l.y)) continue;
    let sc = 0; for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const tx = x + i, ty = y + j; if (m.roads && m.roads[ty * m.w + tx] === 1) sc -= 5; else if (free(ctx, tx, ty)) sc++; }
    if (sc > bs) { bs = sc; best = { x, y, w, h }; }
  }
  return best;
}
/* PHÁ & ĐÀO (anh: 'mua xong phá đào chỗ nào không ưng tùy thích — phá = làm hư rồi đào đất chỗ đó lên'):
   · vật trên đất mình (trừ cọc/biển của mình): cầm cuốc/rìu + E → 3 nhát (bụi gỗ/đá, nhát 2 hiện bản hư hỏng PixelLab nếu có) → sập, rơi gỗ/đá xây, ô thành ĐẤT.
   · nền lát (gạch, đá, đá hoa, lục giác…) trên đất mình: cầm xẻng + E → đào thành đất.
   · lưu l.cleared / l.dug = { 'x,y': 1 } → vào vùng áp lại (gỡ vật, đặt đất). */
const WOODY = /fence|post|board|wood|crate|bench|bush|stall|pen|scare|tree|stump|lantern|torch|camp|sign|flag/;
const tkey = (x, y) => `${x},${y}`;
function parcelAt(ctx, tx, ty) { return lands(ctx).find(l => inParcel(l, tx, ty)) || null; }
function objAt(ctx, tx, ty) {
  for (const o of ctx.S.map.objects) { if (o.ghost || o.landOf) continue; const d = ctx.O && ctx.O[o.type]; const fw = d ? d.fw : 1, fh = d ? d.fh : 1; if (tx >= o.x && tx < o.x + fw && ty >= o.y && ty < o.y + fh) return o; }
  return null;
}
const PAVED = ctx => [ctx.T.STONE, ctx.T.COBBLE, ctx.T.MARBLE, ctx.T.HEX, ctx.T.HEXLIT, ctx.T.ROCK, ctx.T.BRIDGE].filter(v => v !== undefined);
function clearTile(ctx, l, o) {
  const m = ctx.S.map, d = ctx.O && ctx.O[o.type], fw = d ? d.fw : 1, fh = d ? d.fh : 1;
  ctx.removeObject(m, o);
  l.cleared ||= {}; for (let j = 0; j < fh; j++) for (let i = 0; i < fw; i++) { const x = o.x + i, y = o.y + j; if (!inParcel(l, x, y)) continue; l.cleared[tkey(x, y)] = 1; sqMark(m, x, y); ctx.setG(m, x, y, ctx.T.DIRT, false); }
}
/* ô đất do phá/đào trên đất mua: đánh dấu để nền Wang không bo tròn, rồi vẽ ô vuông PixelLab ở drawGround (anh chọn 2026-10-10) */
function sqMark(m, x, y) { (m.sqSoil ||= new Set()).add(y * m.w + x); }
const OBJ_VI = { tree: ['cây', 'tree'], palm: ['cây dừa', 'palm'], pine: ['cây thông', 'pine'], deadtree: ['cây khô', 'dead tree'], fence: ['hàng rào', 'fence'], rock: ['tảng đá', 'rock'], boulder: ['tảng đá lớn', 'boulder'], bush: ['bụi cây', 'bush'],
  sign: ['biển báo', 'sign'], board: ['bảng tin', 'notice board'], lantern: ['đèn lồng', 'lantern'], light: ['cột đèn', 'lamp post'], torch: ['đuốc', 'torch'], campfire: ['đống lửa', 'campfire'], well: ['giếng', 'well'], crate: ['thùng gỗ', 'crate'],
  statue: ['bức tượng', 'statue'], rocky: ['tượng Rocky', 'Rocky statue'], pillar: ['cột đá', 'pillar'], hexpillar: ['cột lục giác', 'hex pillar'], post: ['cọc', 'post'], wall: ['tường', 'wall'], corner: ['góc tường', 'wall corner'], turret: ['tháp canh', 'turret'],
  pavilion: ['đình', 'pavilion'], fountain: ['đài phun nước', 'fountain'], altar: ['bệ thờ', 'altar'], scaffold: ['giàn giáo', 'scaffold'], flag: ['cột cờ', 'flagpole'], house: ['nhà', 'house'], stall: ['quầy hàng', 'stall'], cart: ['xe goòng', 'cart'],
  beam: ['xà gỗ', 'beam'], ore: ['quặng', 'ore'], obsidian: ['đá obsidian', 'obsidian'], debris: ['mảnh vụn', 'debris'], scarecrow: ['bù nhìn', 'scarecrow'], pen: ['chuồng', 'pen'], bed: ['giường', 'bed'], cage: ['lồng', 'cage'] };
function objNameOf(o, vi) {   /* tên đồ vật cho nhãn 'Phá …' (trước đây hiện mã tiếng Anh, vd 'Phá lantern') */
  const k = o.piece || o.type || ''; let best = null;
  for (const key of Object.keys(OBJ_VI)) if ((k === key || k.startsWith(key)) && (!best || key.length > best.length)) best = key;
  return best ? OBJ_VI[best][vi ? 0 : 1] : (vi ? 'đồ vật' : 'object');
}
function applyCleared(ctx, l) {
  const m = ctx.S.map;
  for (const k of Object.keys(l.cleared || {})) { const [x, y] = k.split(',').map(Number); let o; while ((o = objAt(ctx, x, y))) ctx.removeObject(m, o); sqMark(m, x, y); ctx.setG(m, x, y, ctx.T.DIRT, false); }
  for (const k of Object.keys(l.dug || {})) { const [x, y] = k.split(',').map(Number); if (!(ctx.S.save.sys && ctx.S.save.sys.ponds && (ctx.S.save.sys.ponds[zid(ctx)] || {})[k])) { sqMark(m, x, y); ctx.setG(m, x, y, ctx.T.DIRT, false); } }
}
function clearCand(ctx) {
  const p = ctx.S.player, under = { tx: Math.floor(p.x / 16), ty: Math.floor((p.y - 2) / 16) }, d = [[0, 1], [-1, 0], [1, 0], [0, -1]][p.dir & 3];
  const fr = { tx: under.tx + d[0], ty: under.ty + d[1] }, vi2 = vi(ctx);
  for (const f of [fr, under]) {
    const l = parcelAt(ctx, f.tx, f.ty); if (!l) continue;
    const o = objAt(ctx, f.tx, f.ty);
    if (o) {
      const tool = WOODY.test(o.type) ? 'axe' : 'pickaxe', hold = ctx.holding ? (ctx.holding('axe') || ctx.holding('pickaxe')) : true;
      const nm = objNameOf(o, vi2), label = vi2 ? `Phá ${nm} (${o.chp ?? 3}/3)` : `Break ${nm} (${o.chp ?? 3}/3)`;
      if (!hold && ctx.needHold) return { label: ctx.needHold(ctx.tool.tier(tool) ? tool : 'pickaxe'), x: f.tx * 16 + 8, y: f.ty * 16 + 8, limit: 30, priority: 0.7, need: true, needId: ctx.tool.tier(tool) ? tool : 'pickaxe', data: { need: true } };
      return { label, x: f.tx * 16 + 8, y: f.ty * 16 + 8, limit: 30, priority: 0.7, data: { brk: { o, l } } };
    }
    const g = ctx.getG(ctx.S.map, f.tx, f.ty);
    if (PAVED(ctx).includes(g) && (ctx.holding ? ctx.holding('shovel') : ctx.tool.tier('shovel') > 0))
      return { label: vi2 ? 'Đào lên thành đất' : 'Dig up into soil', x: f.tx * 16 + 8, y: f.ty * 16 + 8, limit: 30, priority: 0.7, data: { dig: { ...f, l } } };
  }
  return null;
}
function doClear(ctx, c) {
  const m = ctx.S.map, p = ctx.S.player;
  if (c.brk) {
    const { o, l } = c.brk; if (!m.objects.includes(o)) return;
    const woody = WOODY.test(o.type), cx = o.x * 16 + 8, cy = o.y * 16 + 12;
    if (p.hasAct) { if (woody && p.hasAct('chop')) p.act('chop', 0.4); else if (p.hasAct('mine')) p.act('mine', 0.4); }
    o.chp = (o.chp ?? 3) - 1; o.hp = o.chp; ctx.sfx(o.chp <= 0 ? (woody ? 'smash' : 'rock_break') : woody ? 'chop' : 'mine');   /* o.hp → main.ruinStage vẽ bản hư hỏng (wreck.maxOf = 3) */
    if (ctx.vfx) ctx.vfx(woody ? 'wood_chips' : 'rock_debris', cx, cy);
    if (o.chp <= 0) {
      if (ctx.vfx) { ctx.vfx('dirt_puff', cx, cy + 2); ctx.vfx('monster_poof', cx, cy + 4, 0, true); } ctx.quake && ctx.quake(0.15);
      clearTile(ctx, l, o); ctx.give(woody ? 'wood' : 'rock', 1 + ((Math.random() * 2) | 0), cx, cy); ctx.persist();
    }
  } else if (c.dig) {
    const { tx, ty, l } = c.dig; sqMark(m, tx, ty); ctx.setG(m, tx, ty, ctx.T.DIRT, false); (l.dug ||= {})[tkey(tx, ty)] = 1; ctx.persist();
    if (p.hasAct && p.hasAct('hoe')) p.act('hoe', 0.4);
    if (ctx.vfx) { ctx.vfx('rock_debris', tx * 16 + 8, ty * 16 + 12); ctx.vfx('dirt_puff', tx * 16 + 8, ty * 16 + 12); } ctx.sfx('dig');
  }
}
function markParcel(ctx, l) {
  const m = ctx.S.map, put = (type, x, y) => { if (!ctx.hasObjectAt(m, x, y)) { const o = ctx.place(m, type, x, y, { landOf: true }); if (o) ST.objs.push(o); } };
  put('land_post', l.x, l.y); put('land_post', l.x + l.w - 1, l.y); put('land_post', l.x, l.y + l.h - 1); put('land_post', l.x + l.w - 1, l.y + l.h - 1);
  put('land_sign', l.x + 1, l.y);
}
/* người có quyền nhất của mỗi quốc gia: Leader thật trong roster, không có thì người được tương tác nhiều nhất — đứng trong khu của nước đó */
function placeChiefs(ctx) {
  ST.chiefs = []; const plots = ctx.S.map.plots || []; if (!plots.length || !ctx.byId || !ctx.NPC) return;
  const best = {}; for (const m of ctx.byId.values()) { const nat = ctx.nationOf(m); if (!nat) continue; const k = nat.key, sc = (ctx.isLeader(m) ? 1e9 : 0) + (m.r || 0); if (!best[k] || sc > best[k].sc) best[k] = { m, sc, nat }; }
  for (const p of plots) {
    const b = best[p.nation]; if (!b) continue;
    let at = null; for (let r = 1; r < 4 && !at; r++) for (let dy = 0; dy <= r && !at; dy++) for (let dx = 0; dx <= r && !at; dx++) { const x = p.x + 2 + dx, y = p.y + 2 + dy; if (free(ctx, x, y)) at = { x, y }; }
    if (!at) continue;
    const n = new ctx.NPC({ ...b.m, staff: 'chief', tag: `Leader · ${b.nat.name}` }, at.x * 16 + 8, at.y * 16 + 14, ctx.npcSheet(b.m), () => 0.5);
    n.busy = true; n.radius = 0; n.staffStill = true; n.chief = { nat: b.nat, m: b.m }; ST.chiefs.push(n); (ctx.S.staff ||= []).push(n);
  }
}
function leaderNear(ctx) {
  const p = ctx.S.player; let best = null, bd = 30;
  for (const n of ST.chiefs) {
    const nat = n.chief.nat;
    const d = Math.hypot(n.x - p.x, n.y - p.y); if (d < bd) { bd = d; best = { n, nat }; }
  }
  return best;
}
export const land = {
  drawGround(g, ctx, cx, cy) {   /* ô đất trống sau khi phá/đào: ô vuông PixelLab; ô đã cày thì farm vẽ, ô thành ao thì ponds vẽ */
    const S0 = ART.soilSq, m = ctx.S.map; if (!ART.sqSoil || !m || !m.sqSoil || !m.sqSoil.size) return;
    const x0 = Math.floor(cx / 16) - 1, y0 = Math.floor(cy / 16) - 1, x1 = x0 + Math.ceil(ctx.VW / 16) + 2, y1 = y0 + Math.ceil(ctx.VH / 16) + 2;
    for (const i of m.sqSoil) { const x = i % m.w, y = (i / m.w) | 0; if (x < x0 || x > x1 || y < y0 || y > y1) continue; if (ctx.getG(m, x, y) !== ctx.T.DIRT) continue; g.drawImage((ART.soilTile && ART.soilTile(false, ART.soilMask(m, x, y))) || S0.dry, x * 16 - cx, y * 16 - cy, 16, 16); }   /* nối liền ô đất kề; ảnh 32 px (2×) → đúng 1 ô */
  },
  id: 'land',
  onZoneEnter(ctx) {
    ST.objs = []; ST.chiefs = []; ST.placed = false; defineObjs(ctx);
    ctx.ownsTile = (tx, ty) => ownsTile(ctx, tx, ty);
    for (const l of lands(ctx)) { applyCleared(ctx, l); markParcel(ctx, l); }
    ctx.myLands = () => { const all = ctx.S.save.lands || {}, out = []; for (const [z, arr] of Object.entries(all)) for (const l of arr) out.push({ zone: z, ...l }); return out; };
    if (typeof window !== 'undefined') window.__land = { buyNear: () => { const b = leaderNear(ctx); if (b) buy(ctx, b); return lands(ctx); }, list: () => lands(ctx), grant: key => { const plot = (ctx.S.map.plots || []).find(q => q.nation === (key || (ctx.S.map.plots[0] || {}).nation)); if (!plot) return null; const sp = findSpot(ctx, plot); if (!sp) return null; const l = { nation: plot.nation, ...sp }; lands(ctx).push(l); markParcel(ctx, l); ctx.persist(); return l; } };
  },
  update(dt, ctx) { if (!ST.placed && ctx.S.map) { ST.placed = true; try { placeChiefs(ctx); } catch (e) { console.error('land chiefs', e); } } },   /* sau setupStaff (main) mới thêm được vào S.staff */
  near(ctx) {
    const cc = clearCand(ctx); if (cc) return cc;   /* phá / đào trên đất mình */
    const b = leaderNear(ctx); if (!b) return null;
    const plot = (ctx.S.map.plots || []).find(q => q.nation === b.nat.key); if (!plot) return null;
    if (lands(ctx).some(l => l.nation === b.nat.key)) return null;   /* mỗi quốc gia / vùng 1 mảnh */
    const t = L(ctx);
    return { label: t.buy(natName(ctx, b.nat), price(ctx, b.nat.key)), x: b.n.x, y: b.n.y - 4, limit: 30, priority: true, data: { b } };
  },
  interact(ctx, cand) {
    const d = cand && cand.data; if (!d) return; if (d.brk || d.dig) { doClear(ctx, d); return; }
    const b = d.b; if (b) buy(ctx, b);
  },
  drawUI(ug, ctx, cx, cy, scale) {   /* tên chủ đất trên biển */
    if (!lands(ctx).length) return;
    const t = L(ctx), nm = ctx.S.save.name || '', fs = Math.max(10, Math.round(scale * 3.2));
    ug.save(); ug.font = `${fs}px VT323, monospace`; ug.textAlign = 'center'; ug.textBaseline = 'middle';
    for (const l of lands(ctx)) {
      const sx = Math.round(((l.x + 1) * 16 + 8 - cx) * scale), sy = Math.round((l.y * 16 - 4 - cy) * scale), txt = t.sign(nm), w = ug.measureText(txt).width + 8;
      if (sx < -100 || sy < -30 || sx > ug.canvas.width + 100 || sy > ug.canvas.height + 30) continue;
      ug.fillStyle = '#352022'; ug.fillRect(sx - w / 2 - 2, sy - fs / 2 - 2, w + 4, fs + 4); ug.fillStyle = '#f6e7c8'; ug.fillRect(sx - w / 2, sy - fs / 2, w, fs);
      ug.fillStyle = '#3b2412'; ug.fillText(txt, sx, sy + 1);
    }
    ug.restore();
  },
};
function buy(ctx, b) {
  const t = L(ctx), st = ctx.story ? ctx.story() || {} : {};
  if (st.path === 'xealist') { ctx.toast(t.dark); ctx.sfx('fail'); return; }
  const key = b.nat.key, plot = (ctx.S.map.plots || []).find(q => q.nation === key); if (!plot) return;
  const pr = price(ctx, key);
  if (!ctx.bag.has('stone', pr)) { ctx.toast(t.poor(pr)); ctx.sfx('poor'); return; }
  const sp = findSpot(ctx, plot); if (!sp) { ctx.toast(t.full); return; }
  ctx.bag.remove('stone', pr);
  const l = { nation: key, ...sp, day: ctx.clock ? ctx.clock.dayIndex : 0 }; lands(ctx).push(l); markParcel(ctx, l); ctx.persist();
  const cx = (sp.x + sp.w / 2) * 16, cy = (sp.y + sp.h / 2) * 16;
  if (ctx.vfx) { ctx.vfx('stone_free', cx, cy + 8, 0, true); ctx.vfx('level_up', ctx.S.player.x, ctx.S.player.y + 2, 0, true); }   /* hiệu ứng: ánh vàng bung giữa mảnh đất + cột sáng */
  ctx.sfx('quest_done'); ctx.toast(t.bought(natName(ctx, b.nat), ctx.S.zone.name ? (ctx.S.zone.name[ctx.lang()] || ctx.S.zone.name.en) : zid(ctx), sp.w, sp.h), true);
  ctx.bubble && ctx.bubble(b.n, vi(ctx) ? 'Chúc mừng hàng xóm mới!' : 'Welcome, neighbour!', 3);
  setTimeout(() => ctx.toast(vi(ctx) ? 'Trên đất của bạn: cầm XẺNG + E = cày (ô cỏ) / đào ao (ô đã cày) / đào nền lát; cầm CUỐC hay RÌU + E = phá vật (3 nhát); cầm HẠT + E = gieo' : 'On your land: hold SHOVEL + E = till (grass) / dig pond (tilled) / dig up paving; hold PICKAXE or AXE + E = break things (3 hits); hold SEEDS + E = sow'), 3500);   /* hướng dẫn 1 lần (anh hỏi cách thao tác) */
}
