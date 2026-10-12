// target.js — CHỌN MỤC TIÊU + CON TRỎ + LUẬT CLICK (anh yêu cầu 2026-10-11).
//  · KHÓA (chỉ CHỈ ĐỊNH, không tự làm gì): click / chạm thẳng vào quái, xúc tu Kraken đang kẹt, dân / NPC, thú, hoặc vật phá được
//    (xác tàu, san hô… dưới nước; vật trong đất của mình; cầm súng: mọi vật cứng). Tab = mục tiêu kế tiếp trong ~10 ô (gần → xa), Shift+Tab lùi;
//    điện thoại: nút '🎯 Đổi mục tiêu' cạnh nút A (chỉ hiện khi có ≥ 2 mục tiêu hợp lệ).
//  · Khóa GIỮ NGUYÊN cho tới khi: người chơi hạ / hóa đá vĩnh viễn mục tiêu, khóa sang mục tiêu khác (click / Tab / 🎯), mục tiêu biến mất, hoặc đổi vùng.
//    Đi xa, bấm Esc, click đất trống KHÔNG bỏ khóa (anh chốt).
//  · KHÔNG tự đi tới / tự đánh: người chơi tự đi, tự bấm E; món đang cầm áp vào ĐÚNG mục tiêu đã khóa nếu trong tầm, xa thì nhãn E báo "xa quá" (E không làm gì).
//    Món cầm quyết định khóa có dùng không (appliesTo): súng → quái/dân/thú/vật; kiếm·rìu·cuốc → quái, xúc tu, vật phá được, dân (phe Xealist);
//    tay không / đồ ăn / đá → quái (tự cầm vũ khí), dân/NPC (nói chuyện); món khác (xẻng, hạt…) → khóa không chiếm phím E.
//    Các hệ hỏi ctx.target.*: petgun.js (ngắm + bắn, bị chắn / xa thì báo), monsters.js (chém, xúc tu Kraken), xealist.js (hóa đá bằng E),
//    underwater.js (đập vật cản), land.js (phá vật trong đất), main.findNear (nói chuyện).
//  · DẤU: CHỈ 1 mũi tên vàng PixelLab (ui.target.arrow) trên đầu mục tiêu + số máu "35/60" — tĩnh, không khung, không viền.
//  · KHÔNG khóa → mọi thứ y như cũ (findNear, ưu tiên, INFO_KINDS…). Không lưu gì vào save.
//  · Bảng luật click + con trỏ: xem khối chú thích lớn ở cuối file.
import { ART } from '../art.js';
import { isWreck } from './monsters.js';
import { krNearTent } from './kraken.js';

const RANGE = 160;   /* Tab tìm trong 10 ô */
const WEAPONS = ['sword', 'axe', 'pickaxe'];
let D = null;   /* { S, CTX, allNpcs, interactNow, talkTo, mouseOn } — main.js */
const ST = { t: null, hover: null, btnT: 0, nCand: 0, img: null, toastT: -9, noT: -9, farT: -9, conf: null, cur: null };
const vi = () => D.CTX.lang() === 'vi';
const ANI = { cow: ['Bò', 'Cow'], chicken: ['Gà', 'Chicken'], bird: ['Chim', 'Bird'], fish: ['Cá', 'Fish'], sheep: ['Cừu', 'Sheep'], rabbit: ['Thỏ', 'Rabbit'], horse: ['Ngựa', 'Horse'], pig: ['Heo', 'Pig'], duck: ['Vịt', 'Duck'], goat: ['Dê', 'Goat'] };
const OBJN = [[/^wreck/, 'Xác tàu', 'Shipwreck'], [/^coral/, 'San hô', 'Coral'], [/^caverock/, 'Đá hang', 'Cave rock'], [/^xwall/, 'Tường pháo đài', 'Fortress wall'], [/tree|palm|pine/, 'Cây', 'Tree'], [/rock|boulder/, 'Tảng đá', 'Rock'], [/fence/, 'Hàng rào', 'Fence'], [/bush/, 'Bụi cây', 'Bush'], [/crate/, 'Thùng gỗ', 'Crate'], [/statue/, 'Bức tượng', 'Statue'], [/house/, 'Nhà', 'House'], [/wall/, 'Tường', 'Wall']];
export const TXT = () => (vi() ? {
  locked: n => `🎯 Khóa mục tiêu: ${n}`, hint: ' (Tab đổi mục tiêu)', hintTouch: ' (nút Đổi mục tiêu để đổi)', none: 'Không có mục tiêu nào gần',
  far: n => `${n} ở xa quá — lại gần hơn`, blocked: 'Đường bắn bị chắn — đổi chỗ đứng', outRange: 'Mục tiêu ngoài tầm bắn (6 ô) — lại gần hơn', btn: '🎯 Đổi mục tiêu', obj: 'Vật thể', guide: 'Noxx',
} : {
  locked: n => `🎯 Target locked: ${n}`, hint: ' (Tab: next target)', hintTouch: ' (Next target button to switch)', none: 'No targets nearby',
  far: n => `${n} is too far — get closer`, blocked: 'Line of fire blocked — move to a clear spot', outRange: 'Target out of range (6 tiles) — get closer', btn: '🎯 Next target', obj: 'Object', guide: 'Noxx',
});

/* ---------- mô tả một mục tiêu ---------- */
const O = () => D.CTX.O;
function objBox(o) { const d = O()[o.type] || { fw: 1, fh: 1, h: 16 }; const fw = d.fw || 1, fh = d.fh || 1; return { x0: o.x * 16, y0: o.y * 16, x1: (o.x + fw) * 16, y1: (o.y + fh) * 16, h: Math.max(d.h || 16, fh * 16), fw, fh }; }
export function pos(t) {
  const r = t.ref;
  if (t.kind === 'obj') { const b = objBox(r); return { x: (b.x0 + b.x1) / 2, y: b.y1 - 2 }; }
  return { x: r.x, y: r.y };
}
function height(t) {
  const r = t.ref;
  if (t.kind === 'mon') return Math.max(10, (r.c.h || 12) + (r.c.fly ? 8 : r.c.float ? 6 : 0) + (r.c.boss ? 8 : 0));
  if (t.kind === 'tent') return 34;
  if (t.kind === 'npc') return 27;   /* sát trên đầu (người cao ~24) */
  if (t.kind === 'ani') return 14;
  return objBox(r).h;
}
export function nameOf(t) {
  const r = t.ref, v = vi();
  if (t.kind === 'mon' || t.kind === 'tent') { const c = (t.mo || r).c; const n = v ? c.vi : c.en; return t.kind === 'tent' ? (v ? `Xúc tu ${n}` : `${n} tentacle`) : n; }
  if (t.kind === 'npc') { const m = r.m || {}; if (m.guide) return TXT().guide; return m.n || m.k || m.tag || '?'; }
  if (t.kind === 'ani') { const a = ANI[r.kind]; return a ? a[v ? 0 : 1] : String(r.kind || '?'); }
  for (const [re, a, b] of OBJN) if (re.test(r.type || '')) return v ? a : b;
  return TXT().obj;
}
const same = (a, b) => !!a && !!b && a.kind === b.kind && a.ref === b.ref;
function npcPool() { const S = D.S; return D.allNpcs().concat(S.staff || []).filter(n => n && n !== S.player); }
function monList() { const m = D.CTX.monsters; return m && m.list ? m.list() : []; }
function aniList() { const a = D.CTX.animals; return a && a.list ? a.list() : []; }

export function alive(t) {
  if (!t || !D.S.map) return false; const r = t.ref, S = D.S;
  if (t.kind === 'mon') return monList().includes(r) && !r.statue && r.state !== 'dead' && r.hp > 0;
  if (t.kind === 'tent') return monList().includes(t.mo) && (t.mo.slams || []).includes(r) && r.st === 'stuck';
  if (t.kind === 'npc') return npcPool().includes(r) && !r.hurtSit;
  if (t.kind === 'ani') return aniList().includes(r) && !r.stoneT;
  if (t.kind === 'obj') return S.map.objects.includes(r) && !r.ruined && !r.ghost && !r.tomb;
  return false;
}

/* ---------- món đang cầm → loại hành động ---------- */
export function mode() {
  const C = D.CTX; if (!C.held) return 'hand';   /* hotbar tắt (demo) */
  const h = C.held(); if (h === 'petgun') return 'gun';
  if (WEAPONS.includes(h)) return 'weapon';
  const k = C.heldKind ? C.heldKind() : null;
  if (!h || k === 'food' || h === 'stone') return 'hand';
  return null;   /* cầm dụng cụ khác / hạt / đồ đặt → khóa không chiếm phím E */
}
function breakable(o) { const C = D.CTX, m = D.S.map; if (isWreck(m, o)) return true; return !!(C.landBreakable && C.landBreakable(o)); }
function solidObj(o) { const d = O()[o.type]; return !!d && d.solid !== false && !o.ghost && !o.ruined && !o.tomb; }
function darkVillager(n) { const C = D.CTX; return !!(C.isDarkPath && C.isDarkPath() && C.villagers && ((C.villagers.alive && C.villagers.alive().includes(n)) || (n.chief && (D.S.staff || []).includes(n) && !(n.stoneT > D.S.time)))); }   /* Leader khu (S.staff, n.chief) cũng hóa đá được */
export function appliesTo(t, md = mode()) {
  if (!t || !md) return false;
  if (md === 'gun') return t.kind === 'mon' || t.kind === 'npc' || t.kind === 'ani' || (t.kind === 'obj' && solidObj(t.ref));
  if (md === 'weapon') return t.kind === 'mon' || t.kind === 'tent' || (t.kind === 'obj' && breakable(t.ref)) || (t.kind === 'npc' && darkVillager(t.ref));
  return t.kind === 'mon' || t.kind === 'tent' || t.kind === 'npc';   /* tay không: quái (tự cầm vũ khí) / nói chuyện */
}

/* ---------- API cho các hệ: ctx.target ---------- */
export function get() {
  if (ST.t && !alive(ST.t)) {   /* 2026-10-11 anh: hạ quái đang khóa → tự khóa con GẦN NHẤT còn sống (≤ 7 ô), khỏi bấm nhầm sang thứ khác */
    const was = ST.t; ST.t = null;
    if (was.kind === 'mon' && D.S && D.S.player) { const p = D.S.player; let best = null, bd = 112;
      for (const mo of monList()) { if (mo.statue || mo.state === 'dead' || mo.hp <= 0 || (mo.c && mo.c.spar)) continue; const d = Math.hypot(mo.x - p.x, mo.y - p.y); if (d < bd) { bd = d; best = mo; } }
      if (best) lock({ kind: 'mon', ref: best }, true); }
  }
  return ST.t && alive(ST.t) ? ST.t : null;
}
export function active() { const t = get(); return t && appliesTo(t) ? t : null; }
export const locked = () => !!get();
export function is(ref) { const t = get(); return !!t && t.ref === ref; }
export function mon() { const t = active(); return t && (t.kind === 'mon' || t.kind === 'tent') ? t : null; }
export function npc() { const t = active(); return t && t.kind === 'npc' ? t.ref : null; }
export function obj() { const t = active(); return t && t.kind === 'obj' ? t.ref : null; }
export function forGun() { const t = get(); return t && appliesTo(t, 'gun') ? t : null; }
export function tag(label) { const t = active(); return t ? `${label} → ${nameOf(t)}` : label; }
export function dist(t = get()) { if (!t) return Infinity; const p = D.S.player, q = pos(t); return Math.hypot(q.x - p.x, q.y - p.y); }
export function objGap(o) { const p = D.S.player, b = objBox(o), dx = Math.max(b.x0 - p.x, 0, p.x - b.x1), dy = Math.max(b.y0 - (p.y - 4), 0, (p.y - 4) - b.y1); return Math.hypot(dx, dy); }
export function aimPoint(t) {   /* điểm ngắm theo chân (tia petgun bay sát đất) */
  const q = pos(t); if (t.kind === 'obj') { const b = objBox(t.ref); const p = D.S.player; return { x: Math.max(b.x0 + 3, Math.min(b.x1 - 3, p.x)), y: Math.max(b.y0 + 3, Math.min(b.y1 - 3, p.y - 2)) }; }
  return { x: q.x, y: q.y - 2 };
}
export function faceTarget(t = get()) { if (!t) return; const p = D.S.player, q = t.kind === 'obj' ? aimPoint(t) : pos(t); if (p.faceTo) p.faceTo(q.x, q.y); }

export function lock(t, quiet) {
  if (!t) return;
  if (same(t, ST.t)) return;
  ST.t = t;
  if (!quiet) {
    D.CTX.sfx('target_lock');
    const touch = !D.mouseOn(); const first = !ST.taught; ST.taught = true;
    if (D.S.time - ST.toastT > 0.6 || first) { ST.toastT = D.S.time; D.CTX.toast(TXT().locked(nameOf(t)) + (first ? (touch ? TXT().hintTouch : TXT().hint) : '')); }
  }
}
export function clear() { const had = !!ST.t; ST.t = null; return had; }   /* chỉ dùng nội bộ / test — người chơi không có thao tác "bỏ khóa" */

/* ---------- trỏ chuột / chạm: thứ gì nằm dưới điểm trỏ ---------- */
export function pickAt(mt) {
  if (!mt || !D.S.map) return null;
  const S = D.S, md = mode();
  for (const mo of monList()) if (mo.c.ai === 'kraken') { const k = krNearTent(mo, S.player, mt); if (k && k.under) return { kind: 'tent', ref: k.s, mo }; }
  let best = null, bd = 1e9;
  const take = (t, d) => { if (d < bd) { bd = d; best = t; } };
  for (const mo of monList()) { if (mo.statue || mo.state === 'dead') continue; if (Math.abs(mt.wx - mo.x) < mo.c.w * 0.7 + 3 && mt.wy > mo.y - mo.c.h - 8 && mt.wy < mo.y + 5) take({ kind: 'mon', ref: mo }, Math.hypot(mt.wx - mo.x, mt.wy - (mo.y - mo.c.h / 2))); }
  if (best) return best;
  for (const n of npcPool()) if (Math.abs(mt.wx - n.x) < 9 && mt.wy > n.y - 22 && mt.wy < n.y + 4) take({ kind: 'npc', ref: n }, Math.hypot(mt.wx - n.x, mt.wy - (n.y - 9)));
  for (const a of aniList()) if (!a.stoneT && Math.abs(mt.wx - a.x) < 9 && mt.wy > a.y - 14 && mt.wy < a.y + 4) take({ kind: 'ani', ref: a }, Math.hypot(mt.wx - a.x, mt.wy - (a.y - 6)) + 2);
  if (best) return best;
  if (md === 'gun' || md === 'weapon') {
    for (const o of S.map.objects) {
      if (Math.abs(o.x - mt.tx) > 4 || Math.abs(o.y - mt.ty) > 6) continue;
      const ok = md === 'gun' ? solidObj(o) : breakable(o); if (!ok) continue;
      const b = objBox(o); if (mt.wx >= b.x0 && mt.wx < b.x1 && mt.wy < b.y1 && mt.wy >= b.y1 - b.h) take({ kind: 'obj', ref: o }, Math.hypot(mt.wx - (b.x0 + b.x1) / 2, mt.wy - (b.y1 - b.h / 2)) + 4);
    }
  }
  return best;
}

/* ---------- Tab: danh sách mục tiêu hợp lệ trong tầm ---------- */
export function candidates(md = mode() || 'hand') {
  const S = D.S, p = S.player, out = [], add = t => { const d = dist(t); if (d <= RANGE) out.push({ t, d }); };
  if (!S.map || !p) return [];
  for (const mo of monList()) { if (mo.statue || mo.state === 'dead') continue; add({ kind: 'mon', ref: mo }); if (md !== 'gun') for (const s of mo.slams || []) if (s.st === 'stuck') add({ kind: 'tent', ref: s, mo }); }
  if (md === 'gun') { for (const n of npcPool()) if (!n.hurtSit) add({ kind: 'npc', ref: n }); for (const a of aniList()) if (!a.stoneT) add({ kind: 'ani', ref: a }); }
  else if (md === 'weapon') {
    if (D.CTX.isDarkPath && D.CTX.isDarkPath() && D.CTX.villagers) for (const n of D.CTX.villagers.alive().concat((S.staff || []).filter(x => x.chief))) if (!n.hurtSit && darkVillager(n)) add({ kind: 'npc', ref: n });
    for (const o of S.map.objects) if (Math.abs(o.x * 16 - p.x) < RANGE && Math.abs(o.y * 16 - p.y) < RANGE && breakable(o)) add({ kind: 'obj', ref: o });
  } else for (const n of npcPool()) if (!n.hurtSit && !(n.m && n.m.friend)) add({ kind: 'npc', ref: n });
  out.sort((a, b) => a.d - b.d);
  return out.map(o => o.t);
}
export function cycle(dir = 1) {
  const list = candidates(); if (!list.length) { D.CTX.toast(TXT().none); D.CTX.sfx('fail'); return null; }
  const cur = get(), i = cur ? list.findIndex(t => same(t, cur)) : -1;
  const t = list[i < 0 ? (dir > 0 ? 0 : list.length - 1) : (i + dir + list.length) % list.length];
  lock(t); return t;
}

/* ---------- khóa mà ở xa: E KHÔNG tự đi tới — nhãn báo xa quá ---------- */
export function tooFar(near) {
  const t = active(); if (!t) return false;
  if (near && near.isLock) return false;   /* hệ đã nhận đúng mục tiêu (trong tầm) */
  if (mode() === 'gun') return false;      /* petgun.js tự báo (bị chắn / ngoài tầm) */
  /* 2026-10-11 anh: khóa người ở xa mà đứng cạnh cây muốn chặt lại bị báo 'xa quá' → khóa CHỈ giữ đòn nhắm vào sinh vật
     (quái, người, thú, xúc tu). Việc thường bên cạnh (chặt cây, hái, đào, cày, mở rương…) vẫn làm được như không khóa. */
  if (!near) return true;
  const d = (near.cand && near.cand.data) || near.data || {};   /* ứng viên của hệ: S.near = { kind: 'sys', cand: { data } } */
  return near.kind === 'npc' || !!(d.mo || d.animal || d.talk || d.pet || d.gift || d.fire || d.grab);
}
export function farLabel() { const t = active(); return t ? TXT().far(nameOf(t)) : null; }
export function sayFar() { const t = active(); if (!t) return; if (D.S.time - ST.farT > 1) { ST.farT = D.S.time; D.CTX.toast(TXT().far(nameOf(t))); D.CTX.sfx('fail'); } }

/* ---------- vòng lặp ---------- */
export function init(deps) { D = deps; }
export function onZoneEnter() { ST.t = null; ST.hover = null; ST.conf = null; }
export function update(dt) {
  const S = D.S;
  if (ST.t && !alive(ST.t)) get();   /* bị hạ / hóa đá / biến mất → get() bỏ khóa, quái thì tự khóa con gần nhất (KHÔNG theo khoảng cách) */
  if ((ST.btnT -= dt) <= 0) {   /* nút 🎯 trên điện thoại: chỉ hiện khi có ≥ 2 mục tiêu */
    ST.btnT = 0.3; ST.nCand = S.mode === 'play' ? candidates().length : 0;
    const b = typeof document !== 'undefined' && document.getElementById('btn-tgt');
    if (b) { const show = ST.nCand >= 2; if (b.hidden === show) b.hidden = !show; const tx = TXT().btn; if (b.textContent !== tx) b.textContent = tx; }
  }
}
export function hoverAt(mt) { ST.hover = mt && D.S.mode === 'play' ? pickAt(mt) : null; return ST.hover; }

/* ---------- vẽ: CHỈ mũi tên vàng PixelLab + số máu (tĩnh) ---------- */
function arrowImg() {
  if (ST.img) return ST.img.a;
  const f = ART.man && ART.man.ui && ART.man.ui.target; ST.img = { a: null };
  if (f && f.arrow && typeof Image !== 'undefined') { const im = new Image(); im.onload = () => { ST.img.a = im; }; im.src = 'assets/px/' + f.arrow; }
  return ST.img.a;
}
function arrowTop(t) { const q = pos(t); return { x: q.x, y: q.y - height(t) - (t.kind === 'mon' ? 6 : 1) }; }   /* quái: chừa thanh máu sẵn có của nó */
const arrowSize = t => Math.max(5, Math.min(8, Math.round(height(t) * 0.2)));   /* người ≈ 6, quái nhỏ 5, trùm to ≤ 8 (logic px) */
export function drawWorld(g, cx, cy) {
  const t = get(); if (!t || D.S.mode !== 'play') return;
  const a = arrowTop(t), im = arrowImg(), sz = arrowSize(t), x = Math.round(a.x - cx - sz / 2), y = Math.round(a.y - cy) - sz;   /* 2026-10-11 anh: mũi tên nhỏ, cân đối với mục tiêu */
  if (im) g.drawImage(im, 0, 0, 16, 16, x, y, sz, sz);   /* ảnh 16 px gốc (không __hi) → vẽ sz×sz logic */
  else { g.fillStyle = '#5a3a1c'; g.fillRect(x, y, sz, Math.ceil(sz / 2)); g.fillStyle = '#ffd45e'; g.fillRect(x + 1, y + 1, sz - 2, Math.max(1, Math.ceil(sz / 2) - 2)); }
}
function tagAt(ug, txt, sx, sy, fs, color) {
  ug.save(); ug.font = `bold ${fs}px VT323, monospace`; ug.textAlign = 'center'; ug.textBaseline = 'bottom';
  const w = ug.measureText(txt).width + 8, bh = fs + 2;
  ug.fillStyle = 'rgba(13,11,20,.6)'; ug.beginPath(); ug.roundRect(sx - w / 2, sy - bh, w, bh, 3); ug.fill();
  ug.fillStyle = color; ug.fillText(txt, sx, sy - 1); ug.restore();
}
function hpText(t) { const r = t.mo || t.ref; if (t.kind === 'mon' || t.kind === 'tent') return `${Math.max(0, Math.ceil(r.hp))}/${r.max}`; if (t.kind === 'obj' && t.ref.hp != null && t.ref.hpMax) return `${t.ref.hp}/${t.ref.hpMax}`; return null; }
export function drawUI(ug, cx, cy, scale) {
  if (D.S.mode !== 'play') return;
  const fs = Math.max(10, Math.round(scale * 2.8)), t = get(), hv = ST.hover;
  if (!t) return;
  const hp = hpText(t); if (!hp) return;   /* số máu ngay trên mũi tên */
  const a = arrowTop(t); tagAt(ug, hp, Math.round((a.x - cx) * scale), Math.round((a.y - arrowSize(t) - 1 - cy) * scale), fs, '#ffd45e');
}

/* =====================================================================================================
   CON TRỎ + LUẬT CLICK (anh yêu cầu 2026-10-11: chống bấm nhầm). MỌI click / chạm vào thế giới đi qua clickVerdict() TRƯỚC các hệ.
   Con trỏ = 1 mũi tên PixelLab (ui.cursor, tools/px-cursor2.py) + huy hiệu: arrow (không có gì) · attack (kiếm) · talk (bong bóng)
   · hand (bàn tay) · tool (dụng cụ) · gun (súng) · no (biển cấm). Menu / tiêu đề / HUD: mũi tên trơn.
   Món cầm → lớp: gun = Súng Hóa Đá · weapon = kiếm/rìu/cuốc · hand = tay không / đồ ăn · item = món khác (đá, hạt, xẻng, cần câu…)
     cầm \ click | quái / xúc tu  | dân / NPC                                   | thú         | vật phá được / vật cứng (súng)
     gun         | KHÓA           | KHÓA (bắn bằng E; dân hóa đá VĨNH VIỄN → E 2 lần xác nhận) | KHÓA | KHÓA
     weapon      | KHÓA           | CẤM: không khóa, không đánh, không hóa đá    | CẤM         | KHÓA (đập bằng E)
     hand        | KHÓA           | KHÓA; trong tầm → nói chuyện (click không móc túi) | KHÓA  | như cũ (bảng, quầy…)
     item        | KHÓA           | KHÓA; như cũ (tặng đá…) nếu trong tầm        | KHÓA        | như cũ (cày, gieo…)
   · Click vào mục tiêu = CHỈ KHÓA: không tự đi tới, không tự đánh / bắn. Người chơi tự đi, bấm E để làm vào thứ đã khóa.
   · Súng + click đất trống / thứ không bắn được → KHÔNG làm gì (không bắn bừa, không đi, không quay người).
   · Việc PHÁ (phá vật trong đất, đập vật cản dưới nước, đập công trình, đập bia, hóa đá dân) chỉ nhận khi con trỏ nằm TRONG hình/hộp của
     chính vật đó (main.findNear → preciseOK), không nhận kiểu "gần gần".
   · Việc KHÔNG HOÀN TÁC (súng bắn dân thường bằng E, đập bia Magnitude): lần 1 = "Bấm lần nữa để xác nhận", lần 2 vào ĐÚNG thứ đó trong 1,5 s mới làm.
   · CẤM → không đi, không quay, chỉ báo 1 dòng. Click trên HUD / thanh công cụ / menu không lọt xuống thế giới (chỉ canvas #c nhận click).
   · Gợi ý "cần cầm X" (need) KHÔNG BAO GIỜ thắng việc làm được ngay bằng món đang cầm (main.findNear); chỉ thắng khi quái đang đánh sát (urgent).
   · Điện thoại: chạm = trỏ + click, cùng luật. Phím E: findNear + mục tiêu đã khóa.
   ===================================================================================================== */
export function heldClass() { const md = mode(); if (md) return md === 'hand' && D.CTX.held && D.CTX.held() === 'stone' ? 'item' : md; return 'item'; }
export function petrifiable(n) { const C = D.CTX, vl = C.villagers; return !!(vl && (D.S.npcs.includes(n) || n.chief) && !n.custom && !n.lyron && !(vl.immune && vl.immune(n)) && !(n.m && (n.m.guide || n.m.friend))); }
export function rule(t, hc = heldClass()) {   /* → { cur, act } */
  if (!t) return null;
  if (hc === 'gun') return { cur: 'gun', act: 'lock' };
  if (t.kind === 'mon' || t.kind === 'tent') return { cur: 'attack', act: 'lock' };
  if (t.kind === 'npc') return hc === 'weapon' ? { cur: 'no', act: 'no' } : { cur: 'talk', act: hc === 'hand' ? 'talk' : 'lock' };
  if (t.kind === 'ani') return hc === 'weapon' ? { cur: 'no', act: 'no' } : { cur: 'hand', act: 'lock' };
  if (t.kind === 'obj') return hc === 'weapon' ? { cur: 'tool', act: 'lock' } : { cur: 'hand', act: 'lock' };
  return null;
}
const DESTROY = ['brk', 'wreck', 'smash', 'mon', 'pet'];
function destroyRef(c) { const d = c && c.data; if (!d) return null; for (const k of DESTROY) if (d[k]) return { k, ref: k === 'brk' ? d.brk.o : d[k] }; return null; }
export function preciseOK(c, mt) {   /* việc phá: chuột phải nằm TRONG hình vật / người đó */
  const dr = destroyRef(c); if (!dr || !mt) return true; const r = dr.ref;
  if (dr.k === 'pet') return Math.abs(mt.wx - r.x) < 8 && mt.wy > r.y - 22 && mt.wy < r.y + 3;
  const b = objBox(r); return mt.wx >= b.x0 && mt.wx < b.x1 && mt.wy < b.y1 && mt.wy >= b.y1 - b.h;
}
const NOMSG = n => (vi() ? `⛔ Không dùng món đang cầm vào ${n} được` : `⛔ Can't use what you're holding on ${n}`);
const CONF = (a, n) => (vi() ? `Bấm lần nữa để xác nhận: ${a} ${n}` : `Press again to confirm: ${a} ${n}`);
export function needConfirm(ref, what, name) {   /* true = còn chờ xác nhận (lần 1) */
  const c = ST.conf, now = D.S.time;
  if (c && c.ref === ref && now - c.t <= 1.5) { ST.conf = null; return false; }
  ST.conf = { ref, t: now }; D.CTX.toast(CONF(what, name)); D.CTX.sfx('warn'); return true;
}
export function confirmPetrify(n) { return needConfirm(n, vi() ? 'Hóa đá vĩnh viễn' : 'Petrify forever', nameOf({ kind: 'npc', ref: n })); }
export function clickVerdict(mt, hoverFn) {   /* main.onClick gọi đầu tiên. { stop } = dừng hẳn · { talk: npc } = nói chuyện · {} = các hệ xử lý như cũ */
  const hc = heldClass(), ent = pickAt(mt), v = vi();
  if (ent) {
    const r = rule(ent, hc);
    if (r.act === 'no') { if (D.S.time - ST.noT > 0.8) { ST.noT = D.S.time; D.CTX.toast(NOMSG(nameOf(ent))); D.CTX.sfx('fail'); } return { stop: true, why: 'no' }; }
    lock(ent);
    if (r.act === 'talk' || (ent.kind === 'npc' && hc === 'item')) return dist(ent) <= 33 ? (r.act === 'talk' ? { talk: ent.ref } : {}) : { stop: true, why: 'lock' };   /* trong tầm: nói chuyện / tặng đá như cũ; xa: chỉ khóa */
    return { stop: true, why: 'lock' };   /* click = CHỈ KHÓA (không tự đi, không tự đánh / bắn) */
  }
  const hov = hoverFn ? hoverFn() : null;
  if (hov && hov.kind === 'sys') {
    const dr = destroyRef(hov.cand);
    if (dr && dr.k === 'mon' && needConfirm(dr.ref, v ? 'Đập bia' : 'Smash the', v ? 'Magnitude' : 'Magnitude stone')) return { stop: true, why: 'confirm' };
  }
  if (!hov && hc === 'gun') return { stop: true, why: 'gun-ground' };   /* súng + đất trống: không bắn bừa, không đi */
  return {};
}
export function cursorKind(hit, near, owns) {   /* main.applyCursor: huy hiệu theo thứ đang trỏ (ST.hover = pickAt mỗi khung) */
  const t = ST.hover;
  if (t) { const r = rule(t); return r ? r.cur : 'arrow'; }
  if (!hit || !near) return 'arrow';
  if (near.kind === 'npc') return heldClass() === 'weapon' ? 'no' : 'talk';
  if (near.kind === 'sys') {
    const c = near.cand;
    if (c.need) return owns(c.needId) ? 'tool' : 'no';
    if (destroyRef(c) || c.cursor === 'tool') return 'tool';
    return 'hand';
  }
  return 'hand';
}
export const CUR = k => `url(assets/px/ui/cur/${k || 'arrow'}.png) 1 1, ${k === 'no' ? 'not-allowed' : k && k !== 'arrow' ? 'pointer' : 'auto'}`;
export function hovering() { return ST.hover; }
/* nhãn cạnh con trỏ khi trỏ vào mục tiêu = click sẽ làm gì + TÊN thứ đó (thay thẻ tên riêng — giữ tối giản) */
export function hoverLabel() {
  const h = ST.hover; if (!h) return null; const r = rule(h), n = nameOf(h), v = vi(), t = get();
  if (!r) return null; if (r.act === 'no') return NOMSG(n);
  if (h.kind === 'npc' && heldClass() !== 'gun' && dist(h) <= 33) return null;   /* trong tầm: nhãn việc như cũ (nói chuyện / tặng đá) */
  if (t && t.ref === h.ref) return v ? `🎯 ${n} (đang khóa)` : `🎯 ${n} (locked)`;
  return v ? `🎯 Khóa mục tiêu: ${n}` : `🎯 Lock target: ${n}`;
}
export function setCur(k) { ST.cur = k; }
export function debug() { const t = get(); return { locked: !!t, kind: t && t.kind, name: t && nameOf(t), applies: !!(t && appliesTo(t)), mode: mode(), held: heldClass(), dist: t ? Math.round(dist(t)) : null, cand: candidates().map(nameOf), btn: ST.nCand, cursor: ST.cur || null, conf: !!ST.conf, far: tooFar(D.S.near) ? farLabel() : null, marker: t ? (hpText(t) ? 'arrow+hp' : 'arrow') : null }; }
