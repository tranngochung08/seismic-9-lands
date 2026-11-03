/* kho78.js — p78 (plan-78 đợt MẪU, 01/11/2026): hệ thống "KHO CHIÊU" ngoài trận.
   · SẮP CHIÊU (bảng pixel như bảng Tiềm Năng: ui/frame · dlg_plate · dlg_port · title/btn): chọn Chấn Thú → chạm chiêu đã học → chạm ô (4 ô thường + 1 ô tuyệt chiêu).
     Save: thêm m.mv = [4 id] · m.ult = id trên mục đội / kho của chanthu. Thiếu → bộ cũ y hệt (save cũ đánh như hôm nay).
   · HỌC CHIÊU theo cấp (LEARN trong duel-data): lên cấp bằng Tiềm Năng → học chiêu mới; chưa có bộ riêng thì máy tự xếp (autoLoad) để chiêu mới dùng được ngay.
     Bắt thú hoang hệ Chấn → bộ tự xếp theo cấp của nó.
   · VFX ngoài map của chiêu kho (fx78) cho thú hoang (fieldct gọi fieldCast / fieldResolve) + vẽ / cập nhật fx78 khi KHÔNG có trận.
   · ROCKY (Chấn Thú Nguyên Sơ): học 3 chiêu Chấn đầu tiên theo cấp (Đá Vụn Bắn Lv5 · Vòng Dư Chấn Lv15 · Đào Hầm Vồ Lv22), mang ở 4 ô chung với chiêu lõi trùm
     (ô theo cấp: 2 · Lv30 3 · Lv40 4 — petlv.eqMaxOf), TỰ dùng khi đủ điều kiện (không tốn Ki), gọi được bằng chat; sát thương = sức đánh Rocky × (sức chiêu ÷ 40).
   · SAIYAN A: Rocky Siêu Cấp → cảnh Thức Tỉnh (fx78.awaken) — tiến hoá con mạnh nối ở fieldevo.js. */
import * as FX from './fx78.js';
import { SPECIES, MOVES, TYPE_NAME, TYPE_EN, TYPE_COLOR, LEARN, learnedOf, autoLoad, cleanLoad, MOVE_EN78, MOVE_NAME_EN, SPECIES_EN } from './duel-data.js';
import { FIELD_CFG } from './fieldct.js';
import * as LV from './petlv.js';

const BASE = 'assets/px/';
const ST = { ctx: null, timers: [], pits: [], panel: null, rk: { cast: null, cd: {}, stats: {}, log: [] }, log: [], n: {} };
const vi = ctx => ctx.lang() !== 'en';
const rnd = () => Math.random();
const duelOn = ctx => !!(ctx.duel && ctx.duel.active && ctx.duel.active());
function log(o) { ST.log.push({ t: +(ST.ctx ? ST.ctx.S.time : 0).toFixed(2), ...o }); if (ST.log.length > 300) ST.log.shift(); ST.n[o.ev] = (ST.n[o.ev] || 0) + 1; }
const mvName = (ctx, id) => (vi(ctx) ? (MOVES[id] && MOVES[id].name) || id : MOVE_EN78[id] || MOVE_NAME_EN[id] || (MOVES[id] && MOVES[id].name) || id);
const spName = (ctx, sp) => (vi(ctx) ? (SPECIES[sp] ? SPECIES[sp].name : sp) : SPECIES_EN[sp] || sp);
const nmOf = (ctx, m) => (m.name && !(SPECIES[m.sp] && m.name === SPECIES[m.sp].name) ? m.name : spName(ctx, m.sp));
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const at = (t, fn) => ST.timers.push({ t, fn });
function pop(ctx, x, y, text, color) { (ctx.S.pops ||= []).push({ x, y, text, color, t: 0 }); }

/* ---------------- mô tả 1 dòng (vi / en) cho bảng Sắp Chiêu ---------------- */
const DESC = {
  vi: { da_vun_ban: 'Bắn 2–5 viên đá vụn liền nhau, mỗi viên 18.', dao_ham_vo: 'Chui đất 1 s (chỉ chiêu vùng đất trúng được, ×2), trồi lên cắn 85.', cat_lun: '3 vũng cát lún 10 s: bước vào chậm −1 và mắc 0,6 s.',
    son_bang: 'Gồng rồi đổ dòng đá lở thẳng hàng 135, xuyên mọi thứ trên đường. Sau đó phòng −2 trong 6 s.', dia_tu: 'Sân từ 100 px trong 8 s: kéo thú bay xuống đất, lướt né yếu đi, chiêu Chấn của mình ×1,15.',
    thu_the: 'Chặn trọn 1 đòn trong 0,7 s. Dùng liền lần 2 chỉ còn 50 %.', gong_chiu: 'Trong 2 s, đòn chí tử để lại 1 máu (1 lần / trận).', ngu_bu: 'Hồi 50 % máu, xoá trạng thái rồi ngủ 2,5 s.', lan_xa: 'Cuộn tròn lăn húc 100, tự mất 25 % sát thương gây ra.' },
  en: { da_vun_ban: 'Fires 2–5 rubble shots in a row, 18 power each.', dao_ham_vo: 'Burrows for 1 s (only ground area moves hit it, ×2), then bursts up biting for 85.', cat_lun: '3 quicksand pits for 10 s: stepping in slows −1 and traps for 0.6 s.',
    son_bang: 'Charges, then pours a straight rockslide for 135 that pierces everything in line. Defense −2 for 6 s after.', dia_tu: 'A 100 px lodestone field for 8 s: pulls flyers down, weakens dodges, own Quake moves ×1.15.',
    thu_the: 'Blocks one hit fully within 0.7 s. Spamming it only works 50 %.', gong_chiu: 'For 2 s a finishing blow leaves 1 HP (once per battle).', ngu_bu: 'Heals 50 %, clears status, then sleeps 2.5 s.', lan_xa: 'Curls up and rams for 100, taking 25 % of the damage dealt.' },
};
const KIND = { vi: { ult: 'Tuyệt chiêu', sup: 'Hỗ trợ', tt: 'Trạng thái', can: 'Gần', ban: 'Bắn', vung: 'Vùng' }, en: { ult: 'Ultimate', sup: 'Support', tt: 'Status', can: 'Melee', ban: 'Ranged', vung: 'Area' } };
const kindOf = mv => (mv.ult ? 'ult' : mv.cat === 'tt' ? (mv.shape === 'minh' ? 'sup' : 'tt') : mv.shape === 'can' || mv.shape === 'dig' ? 'can' : mv.shape === 'quanh' || mv.shape === 'vung' ? 'vung' : 'ban');
const T = {
  vi: { title: '⚙ Sắp Chiêu', lead: 'Chạm 1 chiêu đã học → chạm 1 ô để mang. Ô ★ chỉ nhận tuyệt chiêu. Trận vẫn do thú tự đánh.', slots: 'Bộ mang theo', learned: 'Đã học', next: 'Sắp học', auto: '✦ Tự xếp', save: '✓ Lưu', close: 'Đóng', none: 'Chưa có Chấn Thú hệ Chấn nào trong đội (đợt mẫu: kho chiêu mới mở cho hệ Chấn).', old: 'Bộ cũ (chưa xếp) — chạm “Tự xếp” để dùng chiêu mới', pow: 'Sức', cd: 'Hồi', empty: '— trống —', saved: n => `Đã lưu bộ chiêu của ${n}`, learnT: (n, m) => `✦ ${n} học được chiêu mới: ${m}!`, autoT: 'Máy đã tự xếp vào bộ — đổi ở ⚙ Sắp Chiêu', rkLearn: m => `✦ Rocky học được chiêu Chấn: ${m}! (thẻ Rocky → mang theo)`, rkTitle: 'Chiêu Chấn (Rocky là Chấn Thú)', rkHint: n => `Mang chung ô với chiêu lõi trùm (${n} ô). Rocky tự dùng khi đánh; gõ <b>đá vụn</b> · <b>dư chấn</b> · <b>đào hầm</b> trong ô chat để gọi.`, rkLv: lv => `Cần cấp ${lv}`, rkFull: 'Hết ô mang theo — bỏ bớt một chiêu trước', rkEq: m => `Rocky mang: ${m}`, worn: 'Đang mang' },
  en: { title: '⚙ Moves', lead: 'Tap a learned move → tap a slot to carry it. The ★ slot takes ultimates only. Battles are still fought by the beasts.', slots: 'Loadout', learned: 'Learned', next: 'Coming up', auto: '✦ Auto', save: '✓ Save', close: 'Close', none: 'No Quake-type beast in your team yet (sample batch: the new move pool opens for Quake type).', old: 'Old set (not arranged) — tap “Auto” to use new moves', pow: 'Pow', cd: 'CD', empty: '— empty —', saved: n => `Saved ${n}'s moves`, learnT: (n, m) => `✦ ${n} learned a new move: ${m}!`, autoT: 'Auto-arranged into the loadout — change it in ⚙ Moves', rkLearn: m => `✦ Rocky learned a Quake move: ${m}! (Rocky tab → carry it)`, rkTitle: 'Quake moves (Rocky is a beast too)', rkHint: n => `Shares slots with boss-core skills (${n} slots). Rocky uses them on its own; type <b>rubble</b> · <b>aftershock</b> · <b>burrow</b> in chat to call one.`, rkLv: lv => `Needs Lv ${lv}`, rkFull: 'No free slot — drop a skill first', rkEq: m => `Rocky carries: ${m}`, worn: 'Carried' },
};
const t_ = ctx => T[vi(ctx) ? 'vi' : 'en'];

/* ======================= SẮP CHIÊU ======================= */
function css() {
  if (document.getElementById('k78-css')) return; const s = document.createElement('style'); s.id = 'k78-css';
  s.textContent = `#k78-panel{position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:46;border:20px solid transparent;border-image:url(${BASE}ui/frame.png) 20 / 20px round;background:#1c1424;background-clip:padding-box;image-rendering:pixelated;padding:2px 6px 6px;color:#fff6d8;font:19px VT323,monospace;width:min(96vw,460px);max-height:88vh;overflow:auto;box-sizing:border-box;text-shadow:1px 1px 0 #10241a}
#k78-panel h3{margin:0 auto 3px;font:bold 24px VT323,monospace;color:#ffd45e;text-align:center;width:max-content;border:8px solid transparent;border-image:url(${BASE}ui/dlg_plate.png) 8 / 8px round;background:#4a3324;background-clip:padding-box;padding:0 10px}
#k78-panel h4{margin:6px 0 2px;font:20px VT323,monospace;color:#ffe9b0;text-align:left}
#k78-panel p{margin:0 0 4px;text-align:center;color:#e8dcc0;font-size:16px;line-height:1.05}
#k78-panel .tabs{display:flex;gap:4px;justify-content:center;flex-wrap:wrap;margin-bottom:4px}
#k78-panel .tab{display:flex;flex-direction:column;align-items:center;border:6px solid transparent;border-image:url(${BASE}ui/dlg_port.png) 8 / 6px round;background:#2a1f38;background-clip:padding-box;padding:0 2px;cursor:pointer;font-size:14px;line-height:1;min-width:52px}
#k78-panel .tab.on{background:#5a3d1c;color:#ffd45e}#k78-panel .tab img{width:36px;height:36px;image-rendering:pixelated}
#k78-panel .slots{display:grid;grid-template-columns:1fr 1fr;gap:3px}
#k78-panel .mv{display:flex;align-items:center;gap:4px;border:6px solid transparent;border-image:url(${BASE}ui/dlg_port.png) 8 / 6px round;background:#2a1f38;background-clip:padding-box;padding:0 3px;cursor:pointer;min-height:30px;touch-action:manipulation}
#k78-panel .mv img{width:16px;height:16px;image-rendering:pixelated;flex:none}#k78-panel .mv .i{flex:1;min-width:0;display:flex;flex-direction:column;line-height:1}
#k78-panel .mv b{font-size:17px;color:#fff1cc;font-weight:normal;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}#k78-panel .mv small{font-size:13px;color:#cfc2aa}
#k78-panel .mv.ult{grid-column:1 / span 2;background:#3a2410}#k78-panel .mv.sel{background:#6a4a14;outline:2px solid #ffd45e}#k78-panel .mv.new b{color:#9fe8ff}
#k78-panel .mv.off{filter:grayscale(1) brightness(.6);cursor:default}#k78-panel .mv.empty b{color:#8a7f70}
#k78-panel .list{display:grid;grid-template-columns:1fr 1fr;gap:3px}
#k78-panel .desc{min-height:34px;margin:4px 0;padding:2px 6px;border:6px solid transparent;border-image:url(${BASE}ui/dlg_port.png) 8 / 6px round;background:#14101e;background-clip:padding-box;font-size:15px;line-height:1.1;color:#e8dcc0;text-align:left}
#k78-panel button{font:19px VT323,monospace;color:#fff6c8;border:9px solid transparent;border-image:url(${BASE}ui/title/btn.png) 9 / 9px round;background:#3a2718;background-clip:padding-box;padding:0 6px;cursor:pointer;touch-action:manipulation;white-space:nowrap;text-shadow:1px 1px 0 #10241a}
#k78-panel button:hover{border-image-source:url(${BASE}ui/title/btn_hi.png);background:#4d3421;color:#ffd45e}
#k78-panel .r{display:flex;justify-content:center;gap:4px;margin-top:6px}`;
  document.head.appendChild(s);
}
const port = sp => BASE + 'linhduel/ui/port_' + sp + '.png';
function eligible(ctx) { const c = ctx.chanthu; if (!c || !c.ensure) return []; const d = c.ensure(); return d.team.concat(d.box).filter(m => m && LEARN[m.sp]); }
function curLoad(m) { const c = Array.isArray(m.mv) ? cleanLoad(m.sp, m.lv, m.mv, m.ult) : null; return c ? { mv: c.mv.slice(), ult: c.ult, old: false } : { mv: (SPECIES[m.sp].moves || []).filter(id => MOVES[id] && !MOVES[id].ult && learnedOf(m.sp, m.lv).includes(id)).slice(0, 4), ult: learnedOf(m.sp, m.lv).includes(SPECIES[m.sp].moves.slice(-1)[0]) ? SPECIES[m.sp].moves.slice(-1)[0] : null, old: true }; }
function openSap(ctx, id) {
  if (typeof document === 'undefined') return false; css(); const t = t_(ctx), list = eligible(ctx); let el = document.getElementById('k78-panel'); if (!el) { el = document.createElement('div'); el.id = 'k78-panel'; document.body.appendChild(el); }
  const P = ST.panel = ST.panel && ST.panel.el === el ? ST.panel : { el, id: null, sel: null, draft: null };
  if (id != null) { P.id = id; P.draft = null; } if (!list.find(m => m.id === P.id)) { P.id = list.length ? list[0].id : null; P.draft = null; }
  const m = list.find(q => q.id === P.id);
  if (m && !P.draft) P.draft = curLoad(m);
  const cell = (mid, cls = '', slot = null) => { if (!mid) return `<div class="mv empty ${cls}" ${slot != null ? `data-slot="${slot}"` : ''}><div class="i"><b>${t.empty}</b></div></div>`;
    const mv = MOVES[mid], he = mv.type, k = KIND[vi(ctx) ? 'vi' : 'en'][kindOf(mv)], isNew = !!(mv.p78 || mv.p73);
    return `<div class="mv ${cls}${isNew ? ' new' : ''}${P.sel === mid && slot == null ? ' sel' : ''}" ${slot != null ? `data-slot="${slot}"` : `data-mv="${mid}"`}><img src="${BASE}linhduel/ui/icon_${he}.png" alt=""><div class="i"><b>${esc(mvName(ctx, mid))}${mv.ult ? ' ★' : ''}</b><small>${k}${mv.pow ? ` · ${t.pow} ${mv.pow}` : ''} · ${t.cd} ${mv.cd}s</small></div></div>`; };
  let body = '';
  if (!m) body = `<p>${t.none}</p>`;
  else { const L = learnedOf(m.sp, m.lv), D = P.draft, nxt = (LEARN[m.sp] || []).filter(([l, mid]) => l > m.lv && MOVES[mid]).slice(0, 3);
    body = `<div class="tabs">${list.map(q => `<div class="tab${q.id === m.id ? ' on' : ''}" data-tab="${q.id}"><img src="${port(q.sp)}" alt="">${esc(nmOf(ctx, q))}<br>Lv${q.lv}</div>`).join('')}</div>`
      + `<h4>${t.slots}${D.old ? ` <small style="color:#ffb347;font-size:14px">· ${t.old}</small>` : ''}</h4><div class="slots">${[0, 1, 2, 3].map(i => cell(D.mv[i], '', i)).join('')}${cell(D.ult, 'ult', 4)}</div>`
      + `<div class="desc" id="k78-desc">${P.sel ? esc(descOf(ctx, P.sel)) : esc(t.lead)}</div>`
      + `<h4>${t.learned} (${L.length})</h4><div class="list">${L.map(mid => cell(mid, (D.mv.includes(mid) || D.ult === mid) ? 'off' : '')).join('')}</div>`
      + (nxt.length ? `<h4>${t.next}</h4><div class="list">${nxt.map(([l, mid]) => `<div class="mv off"><img src="${BASE}linhduel/ui/icon_${MOVES[mid].type}.png" alt=""><div class="i"><b>${esc(mvName(ctx, mid))}</b><small>Lv${l}</small></div></div>`).join('')}</div>` : '')
      + `<div class="r"><button data-a="auto">${t.auto}</button><button data-a="save">${t.save}</button><button data-a="x">${t.close}</button></div>`; }
  el.innerHTML = `<h3>${t.title}</h3>` + body + (m ? '' : `<div class="r"><button data-a="x">${t.close}</button></div>`); el.hidden = false;
  el.onclick = e => { const tb = e.target.closest('[data-tab]'); if (tb) { P.id = +tb.dataset.tab; P.draft = null; P.sel = null; openSap(ctx); return; }
    const mvE = e.target.closest('[data-mv]'); if (mvE && !mvE.classList.contains('off')) { P.sel = P.sel === mvE.dataset.mv ? null : mvE.dataset.mv; openSap(ctx); return; }
    const sl = e.target.closest('[data-slot]'); if (sl && m) { const i = +sl.dataset.slot, D = P.draft; D.old = false;
      if (P.sel) { const mv = MOVES[P.sel]; if (i === 4) { if (mv.ult) D.ult = P.sel; else { flash(ctx); return; } } else { if (mv.ult) { flash(ctx); return; } D.mv = D.mv.filter(q => q !== P.sel); D.mv[i] = P.sel; D.mv = D.mv.filter(Boolean); } P.sel = null; }
      else if (i < 4 && D.mv[i] && D.mv.length > 1) D.mv.splice(i, 1); else if (i === 4) D.ult = null;
      log({ ev: 'sap_edit', id: m.id, mv: D.mv.slice(), ult: D.ult }); openSap(ctx); return; }
    const b = e.target.closest('button[data-a]'); if (!b) return;
    if (b.dataset.a === 'auto' && m) { const A = autoLoad(m.sp, m.lv); P.draft = { mv: A.mv, ult: A.ult, old: false }; P.sel = null; log({ ev: 'sap_auto', id: m.id }); openSap(ctx); return; }
    if (b.dataset.a === 'save' && m) { const c = cleanLoad(m.sp, m.lv, P.draft.mv, P.draft.ult); if (c) { m.mv = c.mv; m.ult = c.ult; ctx.persist(); try { ctx.toast(t.saved(nmOf(ctx, m))); ctx.sfx('pickup'); } catch (er) { } log({ ev: 'sap_save', id: m.id, mv: c.mv, ult: c.ult }); } closeSap(ctx); return; }
    closeSap(ctx); };
  if (ctx.S.mode === 'play') ctx.setMode('ctpick'); ctx.registerCloser('k78panel', () => closeSap(ctx)); ST.panelOpen = true; return true;
}
function flash(ctx) { try { ctx.sfx('fail'); } catch (e) { } }
function descOf(ctx, id) { const d = DESC[vi(ctx) ? 'vi' : 'en'][id]; if (d) return mvName(ctx, id) + ' — ' + d; const mv = MOVES[id]; return mvName(ctx, id) + (mv.pow ? ` — ${t_(ctx).pow} ${mv.pow}` : '') + ` · ${t_(ctx).cd} ${mv.cd}s`; }
function closeSap(ctx) { const el = document.getElementById('k78-panel'); if (el) el.hidden = true; if (ST.panelOpen && ctx.S.mode === 'ctpick') ctx.setMode('play'); ST.panelOpen = false; }

/* ---------------- học chiêu khi lên cấp (fieldct.tnLevel gọi) ---------------- */
function onLevel(ctx, m) {
  if (!m || !LEARN[m.sp]) return; const got = LEARN[m.sp].filter(([l, id]) => l === m.lv && MOVES[id]).map(([, id]) => id); if (!got.length) return;
  const t = t_(ctx); for (const id of got) { try { ctx.toast(t.learnT(nmOf(ctx, m), mvName(ctx, id)), true); } catch (e) { } log({ ev: 'learn', id: m.id, sp: m.sp, lv: m.lv, mv: id }); }
  if (!Array.isArray(m.mv)) { const A = autoLoad(m.sp, m.lv); m.mv = A.mv; m.ult = A.ult; try { ctx.toast(t.autoT); } catch (e) { } log({ ev: 'auto_on_learn', id: m.id }); }
  else { for (const id of got) { const mv = MOVES[id]; if (mv.ult) { if (!m.ult) m.ult = id; } else if (m.mv.length < 4 && !m.mv.includes(id)) m.mv.push(id); } }
  ctx.persist();
}

/* ======================= VFX ngoài map cho thú hoang (fieldct) ======================= */
const pwMo = mo => FX.power(FX.powerP(SPECIES[mo.sp], (mo.F && mo.F.lv) || 10));
function fieldCast(ctx, mo, c, p) {
  const sk = FX.skinOf(mo.sp), pw = pwMo(mo), id = c.id, mz = () => ({ x: mo.x + (mo.fx || 1) * 6, gy: mo.y, z: 9 });
  log({ ev: 'fcast', mv: id, sp: mo.sp });
  if (id === 'da_vun_ban') at(Math.max(0, c.tel - 0.3), () => { if (mo.F && mo.F.cast === c) FX.volley({ src: mz, tg: () => ({ x: c.aim.x, gy: c.aim.y, z: 8 }), n: 3 + (rnd() < 0.5 ? 1 : 0) + (rnd() < 0.3 ? 1 : 0), gap: 0.07, sk, pw, ky: mo.y, onArrive: () => true }); });
  else if (id === 'dao_ham_vo') { FX.sink(mo.x, mo.y, sk, pw); c.fx78b = FX.burrow({ get: () => (mo.F && mo.F.cast === c && mo.hide && c.mx != null && !c.done ? { x: c.mx, y: c.my } : null), sk, pw }); }
  else if (id === 'cat_lun') at(Math.max(0, c.tel - 0.42), () => { const dx = c.tgt.x - mo.x, dy = c.tgt.y - mo.y, d = Math.hypot(dx, dy) || 1, px = -dy / d, py = dx / d;
    [[0, 0], [px * 26, py * 14], [-px * 26, -py * 14]].forEach(([ox, oy], i) => at(i * 0.08, () => FX.lob({ x: mo.x, gy: mo.y, z: 8, tx: c.tgt.x + ox, ty: c.tgt.y + oy, T: 0.4, h: 22, sk, onLand: () => ST.pits.push({ h: FX.pit({ x: c.tgt.x + ox, y: c.tgt.y + oy, r: 13, T: 8, sk }), x: c.tgt.x + ox, y: c.tgt.y + oy, r: 13, cd: 0 }) }))); });
  else if (id === 'son_bang') { FX.chargeAura({ get: () => (mo.F && mo.F.cast === c && !c.done ? { x: mo.x, y: mo.y, h: 16, w: 14 } : null), T: c.tel, sk, pw }); FX.shout(mo.x, mo.y - 26, vi(ctx) ? 'SƠN…' : 'AVALAN…', '#ffe9a0', 1, c.tel); }
}
function fieldResolve(ctx, mo, c, p) {
  const sk = FX.skinOf(mo.sp), pw = pwMo(mo), id = c.id;
  if (id === 'dao_ham_vo') { if (c.fx78b) c.fx78b.end(); FX.erupt(c.dig.ex, c.dig.ey, sk, pw); if (Math.hypot(p.x - c.dig.ex, p.y - c.dig.ey) <= c.M.r + 4) FX.bite(p.x, p.y, 8, sk, pw); }
  if (id === 'son_bang') { const dx = c.tgt.x - c.o.x, dy = c.tgt.y - c.o.y, d = Math.hypot(dx, dy) || 1; FX.shout(mo.x, mo.y - 26, vi(ctx) ? 'BĂNG!!' : '…CHE!!', '#ffd45e', 2, 0.7); FX.slide({ x: c.o.x + dx / d * 6, gy: c.o.y, z: 6, ux: dx / d, uy: dy / d, L: c.M.range, W: 10 + 6 * pw.p, T: 0.5, sk, pw, kyC: mo.y, hitAt: Math.hypot(p.x - c.o.x, p.y - c.o.y) }); }
}

/* ======================= ROCKY: 3 chiêu Chấn đầu tiên ======================= */
const KR = { da_vun_ban: { lv: 5, cd: 3, pose: ['punch', 'punch'], T: 0.55 }, vong_du_chan: { lv: 15, cd: 6, pose: ['sk_quake', 'hop'], T: 0.6 }, dao_ham_vo: { lv: 22, cd: 7, pose: ['hop', 'hop'], T: 1.7 } };
const RSK = () => FX.SKIN.rocky;
const rkPet = ctx => (ctx.rocky && ctx.rocky.pet ? ctx.rocky.pet() : null);
const rkEnt = ctx => (ctx.rocky && ctx.rocky.ent ? ctx.rocky.ent() : null);
const rkLv = pt => LV.levelFromXp((pt && pt.xp) || 0).lv;
const rkAtk = ctx => { const s = ctx.rocky && ctx.rocky.stats ? ctx.rocky.stats() : null; return s ? s.atk : 10; };
const rkPw = pt => FX.power(Math.min(1, 0.3 + 0.6 * Math.min(1, rkLv(pt) / 50)));
function rkMons(ctx) { const L0 = ctx.monsters && ctx.monsters.list ? ctx.monsters.list() : []; return L0.filter(mo => mo && mo.hp > 0 && mo.state !== 'dead' && !mo.dead && !mo.statue && !(mo.c && mo.c.spar) && !(mo.c && mo.c.fct && !mo.angry && !(mo.F && mo.F.nt))); }
function rkDeal(ctx, mo, mul, kb) { if (!mo || mo.hp <= 0 || !ctx.rocky.deal) return; const dmg = Math.max(1, Math.round(rkAtk(ctx) * mul)); ctx.rocky.deal(mo, dmg, kb, null); ST.rk.stats.dmg = (ST.rk.stats.dmg || 0) + dmg; }
function rkLearn(ctx, pt) {
  pt.hoc = Array.isArray(pt.hoc) ? pt.hoc.filter(id => KR[id]) : []; const lv = rkLv(pt);
  for (const [id, K] of Object.entries(KR)) if (lv >= K.lv && !pt.hoc.includes(id)) { pt.hoc.push(id); pt.eq = pt.eq || []; let eqd = false; if (!pt.eq.includes(id) && pt.eq.length < LV.eqMaxOf(pt)) { pt.eq.push(id); eqd = true; }
    if (!ST.rk.quiet) try { ctx.toast(t_(ctx).rkLearn(mvName(ctx, id)), true); } catch (e) { } log({ ev: 'rk_learn', mv: id, lv, eqd }); if (ctx.persist) ctx.persist(); }
}
function rkThink(ctx, pt, e, pool, tg) {
  const C = ST.rk.cast; if (C) return true; if (ctx.rkMute && ctx.rkMute()) return false;
  const eq = LV.equipped(pt).filter(id => KR[id]); if (!eq.length) return false; const lv = rkLv(pt), P = (pool || []).filter(mo => !(mo.c && mo.c.spar)); if (!P.length) return false;
  const T0 = tg && P.includes(tg) ? tg : P.reduce((b, mo) => (!b || Math.hypot(mo.x - e.x, mo.y - e.y) < Math.hypot(b.x - e.x, b.y - e.y) ? mo : b), null); if (!T0) return false;
  const d = Math.hypot(T0.x - e.x, T0.y - e.y), ready = id => eq.includes(id) && lv >= KR[id].lv && !(ST.rk.cd[id] > 0), air = ctx.air && ctx.air.on && ctx.air.on();
  if (!air && ready('vong_du_chan') && d < 110 && (P.filter(mo => Math.hypot(mo.x - T0.x, mo.y - T0.y) < 70).length >= 2 || (T0.max || 0) >= 300 || rnd() < 0.5)) return rkStart(ctx, pt, e, 'vong_du_chan', T0);
  if (!air && ready('dao_ham_vo') && d >= 40 && d < 150) return rkStart(ctx, pt, e, 'dao_ham_vo', T0);
  if (ready('da_vun_ban') && d >= 24 && d < 130) return rkStart(ctx, pt, e, 'da_vun_ban', T0);
  return false;
}
function rkStart(ctx, pt, e, id, mo) {
  ST.rk.cast = { id, t: 0, T: KR[id].T, mo, done: {}, pw: rkPw(pt) }; ST.rk.stats[id] = (ST.rk.stats[id] || 0) + 1; e.moving = false; e.sit = false; if (Math.abs(mo.x - e.x) > 2) e.dir = mo.x < e.x ? -1 : 1;
  log({ ev: 'rk_cast', mv: id, d: Math.round(Math.hypot(mo.x - e.x, mo.y - e.y)) }); if (rnd() < 0.4 && ctx.rocky.say) try { ctx.rocky.say(vi(ctx) ? { da_vun_ban: 'Đá vụn nè!', vong_du_chan: 'Dư chấn!', dao_ham_vo: 'Chui nào!' }[id] : { da_vun_ban: 'Rubble!', vong_du_chan: 'Aftershock!', dao_ham_vo: 'Burrow!' }[id]); } catch (er) { }
  return true;
}
function rkTick(ctx, dt) {
  for (const k in ST.rk.cd) if (ST.rk.cd[k] > 0) ST.rk.cd[k] = Math.max(0, ST.rk.cd[k] - dt);
  const C = ST.rk.cast; if (!C) return; const e = rkEnt(ctx), pt = rkPet(ctx); if (!e || !pt || e.kfly || e.kdown > 0 || (pt.koT || 0) > 0) { if (e) e.p78under = false; ST.rk.cast = null; return; }
  C.t += dt; const once = (k, t0) => { if (!C.done[k] && C.t >= t0) { C.done[k] = 1; return true; } return false; }, sk = RSK(), pw = C.pw, mo = C.mo, alive = () => mo && mo.hp > 0 && !mo.dead;
  if (C.id === 'da_vun_ban' && once('fire', 0.14)) { const n = [2, 2, 3, 3, 4, 5][(rnd() * 6) | 0]; let hits = 0;
    FX.volley({ src: () => ({ x: e.x + (e.dir || 1) * 6, gy: e.y, z: 9 }), tg: () => ({ x: mo.x, gy: mo.y, z: 7 }), n, gap: 0.08, sk, pw, ky: e.y,
      onArrive: (i, s) => { if (!alive() || Math.hypot(mo.x - s.aim.x, mo.y - s.aim.gy) > 16) return false; rkDeal(ctx, mo, 18 / 40, 24); hits++; return true; } }); }
  if (C.id === 'vong_du_chan' && once('fire', 0.3)) { const x = mo.x, y = mo.y + 1, seen = new Set(); FX.crack(e.x, e.y + 1, sk, 7, false, 5, 1.5); if (ctx.quake) ctx.quake(0.1);
    FX.quakeRing({ x, y, sk, pw, delay: 1.2, R: 90, T: 0.6, onR: r => { for (const m of rkMons(ctx)) { if (seen.has(m) || (m.c && m.c.fly)) continue; const dE = Math.hypot(m.x - x, (m.y - y) / 0.55); if (Math.abs(dE - r) > 8) continue; seen.add(m); rkDeal(ctx, m, 80 / 40, 70); log({ ev: 'rk_vdc_hit' }); } } }); }
  if (C.id === 'dao_ham_vo') {
    if (once('sink', 0.05)) { FX.sink(e.x, e.y, sk, pw); C.B = FX.burrow({ get: () => (ST.rk.cast === C && e.p78under ? { x: e.x, y: e.y } : null), sk, pw }); }
    if (C.t >= 0.2 && C.t < 1.2) { e.p78under = true; if (alive()) { const sd = e.x <= mo.x ? -1 : 1, tx = mo.x + sd * 11, ty = mo.y + 1, dx = tx - e.x, dy = ty - e.y, d = Math.hypot(dx, dy); if (d > 2) { const s = Math.min(d, 180 * dt); e.x += dx / d * s; e.y += dy / d * s; } } }
    if (once('up', 1.2)) { e.p78under = false; if (C.B) C.B.end(); FX.erupt(e.x, e.y, sk, pw); e.hop = 0.4; if (alive() && Math.hypot(mo.x - e.x, mo.y - e.y) < 28) { FX.bite(mo.x, mo.y, 8, sk, pw); rkDeal(ctx, mo, 85 / 40, 90); log({ ev: 'rk_bite' }); }
      for (const m of rkMons(ctx)) if (m !== mo && Math.hypot(m.x - e.x, m.y - e.y) < 18) rkDeal(ctx, m, 0.6, 50); }
  }
  if (C.t >= C.T) { ST.rk.cd[C.id] = KR[C.id].cd; e.p78under = false; ST.rk.cast = null; }
}
function rkChat(s) {
  const ctx = ST.ctx; if (!ctx) return false; const q = String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd');
  const id = /da vun|rubble/.test(q) ? 'da_vun_ban' : /du chan|aftershock/.test(q) ? 'vong_du_chan' : /dao ham|burrow/.test(q) ? 'dao_ham_vo' : null; if (!id) return false;
  const pt = rkPet(ctx), e = rkEnt(ctx); if (!pt || !e) return false; rkLearn(ctx, pt); if (!LV.equipped(pt).includes(id)) { ctx.toast((vi(ctx) ? 'Rocky chưa mang ' : 'Rocky is not carrying ') + mvName(ctx, id)); return true; }
  if (ST.rk.cd[id] > 0 || ST.rk.cast) { ctx.sfx('fail'); return true; } const L0 = rkMons(ctx), mo = L0.sort((a, b) => Math.hypot(a.x - e.x, a.y - e.y) - Math.hypot(b.x - e.x, b.y - e.y))[0];
  if (!mo || Math.hypot(mo.x - e.x, mo.y - e.y) > 160) { ctx.toast(vi(ctx) ? 'Không có mục tiêu' : 'No target'); return true; } rkStart(ctx, pt, e, id, mo); return true;
}
function rkHtml(ctx) {
  const pt = rkPet(ctx); if (!pt) return ''; rkLearn(ctx, pt); const t = t_(ctx), lv = rkLv(pt), eq = LV.equipped(pt);
  const cells = Object.entries(KR).map(([id, K]) => { const has = (pt.hoc || []).includes(id), on = eq.includes(id), mv = MOVES[id];
    return `<div style="display:flex;flex-direction:column;align-items:center;gap:2px;min-width:78px"><div class="slot ${has ? '' : 'off'}" ${has ? `data-rkeq="${id}"` : ''} style="width:44px;height:44px;cursor:${has ? 'pointer' : 'default'};${on ? 'outline:3px solid var(--gold);outline-offset:1px;' : ''}"><img src="${BASE}linhduel/ui/icon_chan.png" alt="" draggable="false" style="width:28px;height:28px;image-rendering:pixelated"></div>
      <span style="font:15px VT323,monospace;color:${on ? 'var(--gold)' : has ? '#e8dcc0' : 'var(--dim)'};text-align:center;line-height:1">${esc(mvName(ctx, id))}</span><span class="mhint" style="font-size:12px;text-align:center">${on ? '★ ' + t.worn : has ? `${t.pow} ${mv.pow || '—'}` : t.rkLv(K.lv)}</span></div>`; }).join('');
  return `<h3>${t.rkTitle} <span class="mhint" style="font-size:14px">(${eq.length}/${LV.eqMaxOf(pt)})</span></h3><div style="display:flex;gap:6px;flex-wrap:wrap;justify-content:space-around">${cells}</div><p class="mhint" style="margin-top:4px">${t.rkHint(LV.eqMaxOf(pt))} · Lv${lv}</p>`;
}
function rkToggle(ctx, id) {
  const pt = rkPet(ctx); if (!pt) return false; rkLearn(ctx, pt); const t = t_(ctx); if (!(pt.hoc || []).includes(id)) { ctx.toast(t.rkLv(KR[id].lv)); return false; }
  pt.eq = LV.equipped(pt); if (pt.eq.includes(id)) pt.eq = pt.eq.filter(q => q !== id); else { if (pt.eq.length >= LV.eqMaxOf(pt)) { ctx.toast(t.rkFull); ctx.sfx('fail'); return false; } pt.eq.push(id); }
  ctx.toast(t.rkEq(pt.eq.map(q => (KR[q] ? mvName(ctx, q) : q)).join(' · ') || '—')); ctx.sfx('pickup'); if (ctx.persist) ctx.persist(); log({ ev: 'rk_toggle', id, eq: pt.eq.slice() }); return true;
}
function rkSuper(ctx, e, tier) {   /* SAIYAN A: Rocky Siêu Cấp — tối cảnh + sét + hào quang + chớp vàng + tên dạng + nứt đất + đá bay + cột sáng */
  const p = Math.min(1, 0.55 + 0.06 * (tier || 1)); FX.awaken({ get: () => (rkEnt(ctx) ? { x: rkEnt(ctx).x, y: rkEnt(ctx).y, h: 22 } : null), sk: { ...FX.SKIN.rocky, glow: ['#ffffff', '#ffe27a', '#ffb52e'] }, p, name: vi(ctx) ? 'ROCKY SIÊU CẤP' : 'SUPER ROCKY', T: 1.65, tBurst: 0.5, real: true });
  log({ ev: 'rk_super_fx', tier, p: +p.toFixed(2) });
}

/* ======================= hệ thống ======================= */
function fieldHooks(ctx) { FX.setHooks({ quake: s => { try { if (ctx.quake) ctx.quake(s); } catch (e) { } }, stop: () => { }, flash: k => { ctx.S.flash = Math.max(ctx.S.flash || 0, k); }, zoom: null, sfx: n => { try { ctx.sfx(n === 'shot' ? 'whoosh' : n); } catch (e) { } } }); }
export const kho78 = {
  id: 'kho78',
  always: true,
  onZoneEnter(ctx) {
    ST.ctx = ctx; ST.timers = []; ST.pits = []; ST.rk.cast = null; ST.lastT = performance.now(); if (!duelOn(ctx)) { FX.clear(); fieldHooks(ctx); } closeSap(ctx);
    ctx.kho78 = { openSap: id => openSap(ctx, id), onLevel: m => onLevel(ctx, m), fieldCast: (mo, c, p) => fieldCast(ctx, mo, c, p), fieldResolve: (mo, c, p) => fieldResolve(ctx, mo, c, p) };
    if (ctx.chanthu && ctx.chanthu.add && !ctx.chanthu.add.__k78) { const add0 = ctx.chanthu.add; const add = (sp, lv, nm) => { const r = add0(sp, lv, nm); try { const d = ctx.chanthu.ensure(), m = d.team.concat(d.box).find(q => q.id === d.nextId - 1); if (m && LEARN[m.sp] && !Array.isArray(m.mv)) { const A = autoLoad(m.sp, m.lv); m.mv = A.mv; m.ult = A.ult; ctx.persist(); log({ ev: 'catch_auto', sp: m.sp, lv: m.lv, mv: A.mv, ult: A.ult }); } } catch (e) { } return r; }; add.__k78 = 1; ctx.chanthu.add = add; }
    if (ctx.rkSkill && !ctx.rkSkill.__k78) { const s0 = ctx.rkSkill; const f = (pt, e, pool, tg, dt) => { if (ST.rk.cast) return true; try { rkLearn(ctx, pt); if (rnd() < 0.55 && rkThink(ctx, pt, e, pool, tg)) return true; } catch (er) { console.error('k78 rk0', er); } if (s0(pt, e, pool, tg, dt)) return true; try { return rkThink(ctx, pt, e, pool, tg); } catch (er) { console.error('k78 rk', er); return false; } }; f.__k78 = 1; ctx.rkSkill = f; }
    if (ctx.rkPose && !ctx.rkPose.__k78) { const p0 = ctx.rkPose; const f = () => { const C = ST.rk.cast; if (C) { const P = KR[C.id].pose; return { clip: P[0], fb: P[1], prog: Math.min(1, C.t / C.T) }; } return p0(); }; f.__k78 = 1; ctx.rkPose = f; }
    if (ctx.rkCore && !ctx.rkCore.__k78) { const c0 = ctx.rkCore; ctx.rkCore = { ...c0, __k78: 1, html: () => c0.html() + rkHtml(ctx), toggle: id => (KR[id] ? rkToggle(ctx, id) : c0.toggle(id)) }; }
    ctx.rkSuperFx = (e, tier) => rkSuper(ctx, e, tier);
    if (!(ctx.chatHooks ||= []).includes(rkChat)) ctx.chatHooks.push(rkChat);
    if (typeof window !== 'undefined') window.__k78 = {
      open: id => openSap(ctx, id), close: () => closeSap(ctx), panel: () => { const el = document.getElementById('k78-panel'); return { open: !!ST.panelOpen, id: ST.panel && ST.panel.id, draft: ST.panel && ST.panel.draft, sel: ST.panel && ST.panel.sel, html: el ? el.innerText.slice(0, 600) : '' }; },
      team: () => eligible(ctx).map(m => ({ id: m.id, sp: m.sp, lv: m.lv, mv: m.mv || null, ult: m.ult || null, learned: learnedOf(m.sp, m.lv) })), log: () => ST.log.slice(), n: () => ({ ...ST.n }), fx: () => FX.stats(), vfx: (id, v) => FX.setVar(id, v),
      spawnLv: (sp, lv, dx = 50, dy = 0) => { if (!ctx.monsters || !FIELD_CFG[sp]) return null; const p = ctx.S.player; const mo = ctx.monsters.add({ ...FIELD_CFG[sp], lv78: lv }, p.x + dx, p.y + dy); return mo && mo.id; },
      rk: { state: () => { const pt = rkPet(ctx); return { lv: pt ? rkLv(pt) : 0, hoc: pt ? pt.hoc || [] : [], eq: pt ? LV.equipped(pt) : [], max: pt ? LV.eqMaxOf(pt) : 0, cast: ST.rk.cast && { id: ST.rk.cast.id, t: +ST.rk.cast.t.toFixed(2) }, cd: { ...ST.rk.cd }, stats: { ...ST.rk.stats } }; },
        learn: () => { const pt = rkPet(ctx); if (pt) rkLearn(ctx, pt); return pt && pt.hoc; }, eq: list => { const pt = rkPet(ctx); if (!pt) return null; pt.eq = list.slice(0, LV.eqMaxOf(pt)); if (ctx.persist) ctx.persist(); return LV.equipped(pt); },
        cast: id => { const pt = rkPet(ctx), e = rkEnt(ctx); if (!pt || !e) return false; const L0 = rkMons(ctx).sort((a, b) => Math.hypot(a.x - e.x, a.y - e.y) - Math.hypot(b.x - e.x, b.y - e.y)); if (!L0[0]) return false; ST.rk.cast = null; ST.rk.cd[id] = 0; return rkStart(ctx, pt, e, id, L0[0]); }, clearCd: () => { ST.rk.cd = {}; }, html: () => rkHtml(ctx), toggle: id => rkToggle(ctx, id) },
      superFx: () => { const e = rkEnt(ctx); if (e) rkSuper(ctx, e, 4); return !!e; }, awaken: (sp, p) => { const P0 = ctx.S.player; FX.awaken({ get: () => ({ x: P0.x + 30, y: P0.y, h: 18 }), sk: FX.skinOf(sp), p, name: spName(ctx, sp).toUpperCase() }); return true; },
    };
  },
  onZoneLeave(ctx) { closeSap(ctx); ST.rk.cast = null; const e = rkEnt(ctx); if (e) e.p78under = false; },
  update(dt, ctx) {
    ST.ctx = ctx; const now = performance.now(), rdt = Math.min(0.05, (now - (ST.lastT || now)) / 1000); ST.lastT = now;
    if (duelOn(ctx)) return; fieldHooks(ctx);
    FX.update(ctx.S.mode === 'play' ? dt : 0, rdt);
    if (ctx.S.mode !== 'play') return;
    for (const T0 of ST.timers) { T0.t -= dt; if (T0.t <= 0) { T0.done = true; try { T0.fn(); } catch (e) { console.error('k78 timer', e); } } } ST.timers = ST.timers.filter(T0 => !T0.done);
    const p = ctx.S.player; for (const P of ST.pits) { if (!P.h.alive()) { P.dead = true; continue; } if (P.cd > 0) P.cd -= dt; const ex = (p.x - P.x) / P.r, ey = (p.y - P.y) / (P.r * 0.55);
      if (ex * ex + ey * ey <= 1 && P.cd <= 0) { P.cd = 1.5; P.h.trig(); pop(ctx, p.x, p.y - 26, vi(ctx) ? 'MẮC CÁT!' : 'STUCK!', '#f4d8a0'); try { if (ctx.knockPlayer) ctx.knockPlayer({ type: 'stagger', power: 0.35, dir: { x: (P.x - p.x) || 0.01, y: (P.y - p.y) || 0 }, lite: true, src: 'p78' }); } catch (e) { } log({ ev: 'fpit_trap' }); } }
    ST.pits = ST.pits.filter(P => !P.dead);
    rkTick(ctx, dt);
    const pt = rkPet(ctx); if (pt && (ST.learnT = (ST.learnT || 0) - dt) <= 0) { ST.learnT = 1; rkLearn(ctx, pt); }
  },
  key(code, ctx) { if (ST.panelOpen && code === 'Escape') { closeSap(ctx); return true; } return false; },
  drawGround(g, ctx, cx, cy) { if (!duelOn(ctx)) FX.drawGround(g, cx, cy); },
  drawables(ctx, cx, cy) { if (duelOn(ctx)) return []; const out = []; FX.drawables(out, ctx.g, cx, cy); return out; },
  draw(g, ctx, cx, cy) { if (!duelOn(ctx)) FX.drawTop(g, cx, cy, ctx.VW, ctx.VH); },
};
