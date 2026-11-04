/* pk.js — c17 (04/11/2026): PK TỰ DO giữa người chơi (chơi chung ở Làng) + BẢNG THÔNG TIN người chơi khác. Anh chốt 04/11: PK tự do, không cần mời.
   · Công tắc PK: nút tròn nhỏ (ring.png + act_fight.png PixelLab) cạnh thanh máu (máy tính: bên trái thanh; điện thoại: dưới cột máu) + phím Y.
     Đổi BẬT/TẮT có hồi 5 s; vừa đánh / bị đánh PvP trong 5 s thì không TẮT được (không bỏ chạy giữa trận). Không lưu save — vào game luôn TẮT.
     Tên người đang bật PK đổi ĐỎ (cả tên mình — main.js, lẫn tên người khác — coop.js).
   · Luật: chỉ đánh được / bị đánh bởi người CŨNG đang bật PK. Đòn: kiếm (combo 3 đòn) / Đấm tay không (Quyền) / Chưởng (quyen.js gọi ctx.pk.palmHit).
     Chấn Thú KHÔNG đánh người. Máy NGƯỜI BỊ ĐÁNH tự quyết: cả 2 đang bật PK, cùng ở Làng, khoảng cách hợp lý, giới hạn nhịp + trần sát thương → ctx.hero.hit.
     Sát thương PvP = sát thương thường × 0,5 (trận dài hơn). Hết máu = ngất theo cơ chế ngất sẵn có (hero.js) — KHÔNG mất đồ.
   · Mạng: trạng thái PK / cấp / máu đi kèm tin 'st' (coop.js stMsg gọi ctx.pk.st()); đòn = tin 'pvp' gửi riêng (to: id); trả lời 'pvpok'. Máy chủ không phải sửa.
   · Bấm (click / chạm) vào người chơi khác → bảng NHỎ bám trên đầu họ (khung pixel ui.npick.tile): tên, cấp, máu, Chấn Thú đang thả, trạng thái PK.
     Đóng: bấm lại người đó / bấm chỗ khác / Esc / họ rời đi. Bảng không bắt chuột (pointer-events none) → không cản chơi.
   Móc test: window.__pk. */
import { NET } from './farm106.js';
import { SPECIES, SPECIES_EN } from './duel-data.js';

const CF = { tog: 5, lock: 5, reach: 28, mul: 0.5, meleeMax: 46, palmMax: 160, meleeGap: 0.22, palmGap: 1.0, meleeCap: 220, palmCap: 420, warnT: 6 };
const TX = {
  vi: { on: 'PK: BẬT — đánh được người cũng bật PK (phím Y)', off: 'PK: TẮT — không ai đánh được bạn', wait: s => `Đợi ${s} giây nữa mới đổi PK được`,
    lock: s => `Đang giao chiến PK — ${s} giây nữa mới tắt được`, tip: on => `PK tự do: ${on ? 'BẬT' : 'TẮT'} · phím Y`, lbl: 'PK',
    lv: 'Cấp', hp: 'Máu', pet: 'Chấn Thú', none: 'chưa thả', pkOn: 'PK: BẬT', pkOff: 'PK: TẮT', ko: 'đang ngất',
    hitBy: n => `⚔ ${n} đang tấn công bạn (PK)`, koBy: n => `${n} đã hạ gục bạn (PK) — không mất đồ`, koYou: n => `Bạn đã hạ gục ${n}!`,
    theyOff: n => `${n} không bật PK`, youOff: 'Bật PK (phím Y) mới đánh được người khác', hit: n => `⚔ ${n}`, solo: 'PK chỉ có khi chơi chung ở Làng' },
  en: { on: 'PK: ON — you can fight players who also have PK on (key Y)', off: 'PK: OFF — nobody can attack you', wait: s => `Wait ${s}s before switching PK again`,
    lock: s => `In a PK fight — you can turn it off in ${s}s`, tip: on => `Free PK: ${on ? 'ON' : 'OFF'} · key Y`, lbl: 'PK',
    lv: 'Lv', hp: 'HP', pet: 'Partner', none: 'none out', pkOn: 'PK: ON', pkOff: 'PK: OFF', ko: 'fainted',
    hitBy: n => `⚔ ${n} is attacking you (PK)`, koBy: n => `${n} knocked you out (PK) — nothing lost`, koYou: n => `You knocked out ${n}!`,
    theyOff: n => `${n} has PK off`, youOff: 'Turn PK on (key Y) to fight other players', hit: n => `⚔ ${n}`, solo: 'PK only works in Village co-op' },
};
const T = ctx => TX[ctx.lang && ctx.lang() === 'en' ? 'en' : 'vi'];
const A = { ctx: null, on: false, togT: -99, fightT: -99, cd: 0, combo: 0, comboT: 0, q: [], sel: null, palm: new Map(), palmT: 0, last: new Map(), warnT: -99,
  n: { tx: 0, rx: 0, ok: 0, rej: 0, dmgIn: 0, dmgOut: 0, ko: 0, koBy: 0, palmTx: 0 }, log: [], el: null, panel: null, sig: '', psig: '', layT: 0 };
const lg = e => { A.log.push({ t: +((A.ctx && A.ctx.S.time) || 0).toFixed(2), ...e }); if (A.log.length > 200) A.log.shift(); };
const api = () => NET.pkApi || null;
const live = () => { const a = api(); return !!(a && a.on()); };
const peers = () => { const a = api(); return a ? a.peers() : []; };
const peerOf = id => peers().find(P => P.id === id) || null;
const pkOf = P => !!(P && P.st && P.st.pk);
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const now = () => (A.ctx ? A.ctx.S.time : 0);
const toast = (ctx, t) => { try { ctx.toast(t); } catch (e) { } };
const spName = (ctx, sp) => (ctx.lang && ctx.lang() === 'en' && SPECIES_EN[sp]) || (SPECIES[sp] ? SPECIES[sp].name : sp);
const fainted = ctx => !!(ctx.hero && ctx.hero.fainted);

/* ---------- bật / tắt ---------- */
function toggle(ctx, force) {
  const t = T(ctx);
  if (!live()) { toast(ctx, t.solo); return false; }
  if (!force) {
    const w = CF.tog - (now() - A.togT); if (w > 0) { toast(ctx, t.wait(Math.ceil(w))); ctx.sfx && ctx.sfx('fail'); return false; }
    const l = CF.lock - (now() - A.fightT); if (A.on && l > 0) { toast(ctx, t.lock(Math.ceil(l))); ctx.sfx && ctx.sfx('fail'); return false; }
  }
  A.on = !A.on; A.togT = now(); toast(ctx, A.on ? t.on : t.off); ctx.sfx && ctx.sfx(A.on ? 'swing' : 'pickup'); lg({ ev: 'toggle', on: A.on }); A.sig = '';
  return true;
}

/* ---------- đánh ---------- */
function weapon(ctx) {
  if (ctx.holding && ctx.holding('sword')) return 'sword';
  if (ctx.quyen && ctx.quyen.on() && ctx.held && !ctx.held()) return 'fist';
  return null;
}
function canFight(ctx, P) { return A.on && live() && P && pkOf(P) && !P.ko && !fainted(ctx) && ctx.S.mode === 'play'; }
function swing(ctx, P) {
  const p = ctx.S.player; if (!p || A.cd > 0 || !canFight(ctx, P)) return false;
  const w = weapon(ctx); if (!w) return false;
  const e = P.ent; if (p.faceTo) p.faceTo(e.x, e.y);
  const step = A.comboT > 0 ? (A.combo + 1) % 3 : 0, want = ['attack', 'attack2', 'attack3'][step]; A.combo = step; A.comboT = 0.8;
  const clip = w === 'fist' ? ctx.quyen.clip(step) : (p.hasAct && p.hasAct(want) ? want : p.hasAct && p.hasAct('attack') ? 'attack' : null);
  if (clip && !p.custom) p.act(clip, 0);
  const sh = clip && p.sheet && p.sheet.actions[clip], at = sh && sh.impact != null ? sh.impact / (sh.fps || 12) : 0.18;
  const fin = clip === 'attack3' || clip === 'q_punch3';
  A.cd = (fin ? 0.62 : 0.45) * (w === 'fist' ? ctx.quyen.cdMul() : 1);
  A.q.push({ id: P.id, t: at, fin, w, step }); A.sel = P.id; A.psig = '';
  return true;
}
function rawDmg(ctx, w) {
  const h = ctx.hero; if (!h) return 10;
  const add = w === 'fist' ? ctx.quyen.bonus() : h.weaponBonus(ctx.tool ? ctx.tool.tier('sword') : 0);
  return (h.atk + add) * (ctx.atkMul ? ctx.atkMul() : 1);
}
function landMelee(ctx, Q) {
  const P = peerOf(Q.id), p = ctx.S.player; if (!P || !canFight(ctx, P)) return;
  if (dist(P.ent, p) > CF.reach + 12) { lg({ ev: 'miss', id: Q.id, d: Math.round(dist(P.ent, p)) }); return; }
  let d = rawDmg(ctx, Q.w); if (Q.fin) d *= 1.5; d = Math.max(1, Math.round(d));
  const a = api(); if (!a.send({ t: 'pvp', to: P.id, k: Q.w, d, fin: Q.fin ? 1 : 0, x: Math.round(p.x), y: Math.round(p.y) })) return;
  A.n.tx++; A.fightT = now(); lg({ ev: 'tx', id: P.id, k: Q.w, d });
  const e = P.ent, tier = Q.w === 'sword' ? (ctx.tool ? ctx.tool.tier('sword') : 0) : ctx.quyen.tier();
  try { if (ctx.wfx) ctx.wfx('hit', e.x, e.y, { dir: { x: e.x - p.x, y: e.y - p.y }, fin: Q.fin, fist: Q.w === 'fist', step: Q.step, tier, h: 22, follow: () => ({ x: P.ent.x, y: P.ent.y }) }); } catch (er) { }
  ctx.sfx && ctx.sfx('hit');
}
/* Chưởng (quyen.js onHit gọi mỗi nhịp phun 'tick' và lúc nổ 'boom'): cùng hình học với quái; cộng dồn, gửi 1 tin / người / lần chưởng lúc nổ */
function palmHit(ctx, h, o, a, ca, sa, pw) {
  if (!A.on || !live()) return;
  for (const P of peers()) {
    if (!canFight(ctx, P)) continue; const e = P.ent;
    const dx = e.x - o.x, dy = e.y - 6 - o.y, al = dx * ca + dy * sa, pe = Math.abs(-dx * sa + dy * ca);
    const hit = h.k === 'tick' ? (al > -2 && al < 96 && pe < 7 + al * 0.35) : Math.hypot(e.x - a.x, e.y - 8 - a.y) < 18;
    if (!hit) continue;
    const r = A.palm.get(P.id) || { d: 0 }; r.d += pw * (h.k === 'tick' ? 0.3 : 1.4); A.palm.set(P.id, r);
  }
  A.palmT = 1.6;
  if (h.k === 'boom') flushPalm(ctx);
}
function flushPalm(ctx) {
  const p = ctx.S.player, a = api();
  for (const [id, r] of A.palm) { const d = Math.max(1, Math.round(r.d)); if (a && a.send({ t: 'pvp', to: id, k: 'palm', d, fin: 1, x: Math.round(p.x), y: Math.round(p.y) })) { A.n.tx++; A.n.palmTx++; A.fightT = now(); lg({ ev: 'tx', id, k: 'palm', d }); } }
  A.palm.clear(); A.palmT = 0;
}
/* proxy mục tiêu Chưởng: người chơi PK gần nhất (đang chọn được ưu tiên) — quyen.js pickTarget hỏi */
function aim(ctx, p, maxD) {
  if (!A.on || !live()) return null; let best = null, bd = maxD;
  for (const P of peers()) { if (!canFight(ctx, P)) continue; const d = dist(P.ent, p) - (P.id === A.sel ? 30 : 0); if (d < bd) { bd = d; best = P; } }
  if (!best) return null; const id = best.id;
  return { __pk: id, hp: 1, c: {}, get x() { const Q = peerOf(id); return Q ? Q.ent.x : best.ent.x; }, get y() { const Q = peerOf(id); return Q ? Q.ent.y : best.ent.y; }, live: () => !!peerOf(id) };
}

/* ---------- nhận đòn (máy người bị đánh tự kiểm) ---------- */
function onMsg(ctx, m) {
  const a = api(); if (!a) return;
  if (m.t === 'pvpok') { const P = peerOf(m.f); A.n.ok++; if (m.ok && P) { if (ctx.pop) ctx.pop(P.ent.x, P.ent.y - 22, `-${m.d}`, '#ffb36a'); if (m.ko) { A.n.ko++; toast(ctx, T(ctx).koYou(P.name)); } }
    else if (!m.ok && m.why === 'off' && P && now() - A.warnT > 3) { A.warnT = now(); toast(ctx, T(ctx).theyOff(P.name)); } return; }
  if (m.t !== 'pvp') return;
  A.n.rx++;
  const P = peerOf(m.f), p = ctx.S.player, k = m.k === 'palm' ? 'palm' : m.k === 'fist' ? 'fist' : 'sword';
  const rej = why => { A.n.rej++; lg({ ev: 'rej', f: m.f, why }); a.send({ t: 'pvpok', to: m.f, ok: 0, why }); };
  if (!P || !p) return rej('gone');
  if (!A.on || !pkOf(P)) return rej('off');
  if (P.ko || fainted(ctx) || (ctx.S.mode !== 'play' && ctx.S.mode !== 'faint')) return rej('state');
  const far = Math.min(dist(P.ent, p), Number.isFinite(+m.x) ? Math.hypot(+m.x - p.x, +m.y - p.y) : 1e9);
  if (far > (k === 'palm' ? CF.palmMax : CF.meleeMax)) return rej('far');
  const L = A.last.get(m.f) || { m: -99, p: -99 }, gap = k === 'palm' ? CF.palmGap : CF.meleeGap;
  if (now() - (k === 'palm' ? L.p : L.m) < gap) return rej('rate');
  if (k === 'palm') L.p = now(); else L.m = now(); A.last.set(m.f, L);
  const raw = Math.min(k === 'palm' ? CF.palmCap : CF.meleeCap, Math.max(1, +m.d || 0)), d = Math.max(1, Math.round(raw * CF.mul));
  const ok = !!(ctx.hero && ctx.hero.hit(d)); A.fightT = now();
  if (ok) {
    A.n.dmgIn += d; const ko = fainted(ctx);
    if (!ko && (m.fin || k === 'palm') && ctx.knockPlayer) { const dd = Math.hypot(p.x - P.ent.x, p.y - P.ent.y) || 1; try { ctx.knockPlayer({ type: 'stagger', power: 0.6, lite: true, dir: { x: (p.x - P.ent.x) / dd, y: (p.y - P.ent.y) / dd }, src: { x: P.ent.x, y: P.ent.y } }); } catch (e) { } }
    if (ko) { A.n.koBy++; toast(ctx, T(ctx).koBy(P.name)); } else if (now() - A.warnT > CF.warnT) { A.warnT = now(); toast(ctx, T(ctx).hitBy(P.name)); }
    lg({ ev: 'rx', f: m.f, k, d, ko });
    a.send({ t: 'pvpok', to: m.f, ok: 1, d, ko: ko ? 1 : 0, hp: Math.max(0, Math.ceil(ctx.hero.hp)) });
  } else { lg({ ev: 'rx-inv', f: m.f, k }); a.send({ t: 'pvpok', to: m.f, ok: 0, why: 'inv' }); }
}

/* ---------- giao diện: nút PK + bảng thông tin ---------- */
const BASE = 'assets/px/';
const CSS = `#pk17b{position:fixed;z-index:8;width:44px;height:44px;padding:0;border:none;border-radius:50%;background:url(${BASE}ui/mslots/ring.png) no-repeat center/100% 100%;image-rendering:pixelated;cursor:pointer;touch-action:manipulation;display:flex;align-items:center;justify-content:center;box-sizing:border-box}
#pk17b.on{background-image:url(${BASE}ui/mslots/ring_on.png)}
#pk17b img{width:24px;height:24px;image-rendering:pixelated;pointer-events:none;opacity:.5;margin-top:-2px}
#pk17b.on img{opacity:1}
#pk17b i{position:absolute;left:-8px;right:-8px;bottom:-8px;font:15px/1 VT323,monospace;font-style:normal;color:#cfc4b4;text-align:center;pointer-events:none;text-shadow:1px 1px 0 #1a1020,-1px 0 0 #1a1020,0 -1px 0 #1a1020,1px 0 0 #1a1020}
#pk17b.on i{color:#ff6a5a}
#pk17b s{position:absolute;inset:4px;border-radius:50%;pointer-events:none;background:conic-gradient(rgba(20,12,10,.6) calc(var(--cd,0) * 360deg),transparent 0)}
#pk17b:active{transform:translateY(2px)}
#pk17b[hidden],#pk17i[hidden]{display:none}
#pk17i{position:fixed;z-index:7;pointer-events:none;box-sizing:border-box;min-width:112px;max-width:190px;border:8px solid transparent;border-image:var(--np-tile) 6 / 8px round;background:#2a1f38;background-clip:padding-box;color:#f5ecdc;font:16px/15px VT323,monospace;padding:0 3px 1px;image-rendering:pixelated;white-space:nowrap;transform:translate(-50%,-100%)}
#pk17i b{display:block;font-size:17px;color:#9fe0ff;overflow:hidden;text-overflow:ellipsis}
#pk17i b.pk{color:#ff6a5a}
#pk17i .r{display:flex;gap:4px;align-items:center;overflow:hidden;text-overflow:ellipsis}
#pk17i .hp{height:4px;background:#352022;margin:1px 0 2px;box-shadow:0 0 0 1px #120a10}
#pk17i .hp i{display:block;height:100%;background:#e84a3a}
#pk17i img{width:12px;height:12px;image-rendering:pixelated}
#pk17i .on{color:#ff6a5a}#pk17i .off{color:#a79a86}#pk17i .ko{color:#a79a86}`;
function ensureDom(ctx) {
  if (typeof document === 'undefined') return;
  if (!document.getElementById('pk17-css')) { const s = document.createElement('style'); s.id = 'pk17-css'; s.textContent = CSS; document.head.appendChild(s); }
  if (!A.el) {
    const b = document.createElement('button'); b.id = 'pk17b'; b.type = 'button'; b.hidden = true;
    b.innerHTML = `<img src="${BASE}ui/hud91/act_fight.png" alt=""><s></s><i>PK</i>`;
    b.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); const c = A.ctx || ctx; if (c.S.mode === 'play') toggle(c); });
    document.body.appendChild(b); A.el = b;
  }
  if (!A.panel) {
    const d = document.createElement('div'); d.id = 'pk17i'; d.hidden = true;
    const U = (ctx.ART && ctx.ART.man && ctx.ART.man.ui) || {}, NP = U.npick || null;
    if (NP && NP.tile) d.style.setProperty('--np-tile', `url(${BASE}${NP.tile})`);
    document.body.appendChild(d); A.panel = d;
    /* bấm / chạm trúng người chơi khác: xử lý TRƯỚC main.js (bắt ở window, pha capture) — không thì target.js có thể khoá nhầm Chấn Thú / dân đứng sát họ */
    window.addEventListener('pointerdown', e => {
      const c = A.ctx || ctx, cv = document.getElementById('c');
      if (!cv || e.target !== cv || e.button !== 0 || c.S.mode !== 'play' || !live() || !c.cam || !c.VW) return;
      const r = cv.getBoundingClientRect(), k = r.width / c.VW, mt = { wx: c.cam.cx + (e.clientX - r.left) / k, wy: c.cam.cy + (e.clientY - r.top) / k };
      if (!peerAt(c, mt)) return;
      e.preventDefault(); e.stopImmediatePropagation(); clickPeer(c, mt);
    }, true);
    window.addEventListener('keydown', e => { if (e.code === 'Escape' && A.sel) { A.sel = null; A.psig = ''; } }, true);
  }
}
const coarse = () => { try { return matchMedia('(pointer: coarse)').matches; } catch (e) { return false; } };
function placeBtn(ctx, dt) {
  const b = A.el; if (!b) return;
  const show = ctx.S.mode === 'play' && live() && !fainted(ctx) && !document.body.classList.contains('photo');
  if (b.hidden === show) b.hidden = !show; if (!show) return;
  const t = T(ctx), w = Math.max(0, CF.tog - (now() - A.togT)), sig = [A.on, Math.ceil(w * 10), ctx.lang && ctx.lang()].join('|');
  if (sig !== A.sig) { A.sig = sig; b.classList.toggle('on', A.on); b.title = t.tip(A.on); b.style.setProperty('--cd', (w > 0 ? w / CF.tog : 0).toFixed(3)); }
  if ((A.layT -= dt) > 0) return; A.layT = 0.4;
  const hb = document.getElementById('herobar'), S0 = 44; const taken = [];
  for (const e of document.querySelectorAll('#touch button, #mslots > *, #joy, #hotbar, #herobar, #btn-chat, #px-clock, #btn-menu, #btn-photo, #sq104, .c79-btn, #c10-ball, #btn-palm, #toast, .toast')) {
    if (e === b || e.hidden || e.closest('[hidden]')) continue; const cs = getComputedStyle(e); if (cs.display === 'none' || cs.visibility === 'hidden') continue;
    const q = e.getBoundingClientRect(); if (q.width && q.height) taken.push(q); }
  const free = (x, y) => x >= 4 && y >= 4 && x + S0 <= innerWidth - 4 && y + S0 <= innerHeight - 4 && !taken.some(q => !(x + S0 <= q.left - 3 || x >= q.right + 3 || y + S0 <= q.top - 3 || y >= q.bottom + 3));
  const C = [];
  if (hb && hb.getBoundingClientRect().width) {
    const r = hb.getBoundingClientRect();
    if (r.width >= r.height) { const y = Math.round(r.top + (r.height - S0) / 2); C.push([r.left - S0 - 10, y], [r.left - S0 - 10, y - 30], [r.right + 10, y], [r.left - S0 - 10, r.top - S0 - 12]); }
    else { const ch = document.getElementById('btn-chat') || ['btn-rot', 'btn-photo', 'btn-menu'].map(i => document.getElementById(i)).filter(e => e && !e.hidden && e.getBoundingClientRect().width).sort((p, q) => p.getBoundingClientRect().left - q.getBoundingClientRect().left)[0], cr = ch && ch.getBoundingClientRect();   /* c33-bohopthe: nút 💬 Rocky đã bỏ → mốc = nút trái nhất hàng góc trên phải */ if (cr && cr.width) C.push([cr.left - S0 - 12, Math.round(cr.top + (cr.height - S0) / 2)]);   /* điện thoại: cạnh trái nút chat (hàng nút góc trên phải) — chừa giữa màn cho bảng thông tin */
      const x = Math.round(r.left + (r.width - S0) / 2); C.push([x, r.bottom + 14], [x, r.bottom + 40], [r.left - S0 - 10, r.bottom - S0], [x, r.top - S0 - 22]); }
  }
  C.push([innerWidth - S0 - 12, Math.round(innerHeight * 0.45)], [12, Math.round(innerHeight * 0.45)]);
  let at = C.find(([x, y]) => free(x, y)) || C[0];
  b.style.left = Math.round(at[0]) + 'px'; b.style.top = Math.round(at[1]) + 'px';
}
function panelHTML(ctx, P) {
  const t = T(ctx), s = P.st || {}, lv = s.lv | 0, hp = Math.max(0, s.hp | 0), hm = Math.max(1, s.hm | 0), pk = !!s.pk;
  const U = Array.isArray(s.u) ? s.u : []; const pet = U.length ? U.slice(0, 2).map(r => `${esc(spName(ctx, r[0]))} ${t.lv} ${r[5] | 0}`).join(', ') : t.none;
  return `<b class="${pk ? 'pk' : ''}">${esc(P.name)}</b>`
    + `<div class="r">${t.lv} ${lv || '?'} · ${t.hp} ${s.hm ? `${hp}/${hm}` : '?'}</div>`
    + `<div class="hp"><i style="width:${s.hm ? Math.round(hp / hm * 100) : 0}%"></i></div>`
    + `<div class="r">${t.pet}: ${pet}</div>`
    + `<div class="r ${pk ? 'on' : 'off'}"><img src="${BASE}ui/hud91/act_fight.png" alt="">${pk ? t.pkOn : t.pkOff}${P.ko ? ` · <span class="ko">${t.ko}</span>` : ''}</div>`;
}
function placePanel(ctx) {
  const d = A.panel; if (!d) return;
  const P = A.sel ? peerOf(A.sel) : null, cv = document.getElementById('c');
  if (!P || ctx.S.mode !== 'play' && ctx.S.mode !== 'faint' || !cv || !ctx.cam || !ctx.VW) { if (!d.hidden) d.hidden = true; if (A.sel && !P) A.sel = null; return; }
  const sig = panelHTML(ctx, P); if (sig !== A.psig) { A.psig = sig; d.innerHTML = sig; }
  const r = cv.getBoundingClientRect(), k = r.width / ctx.VW, X = wx => r.left + (wx - ctx.cam.cx) * k, Y = wy => r.top + (wy - ctx.cam.cy) * k;
  const px = X(P.ent.x), py = Y(P.ent.y);
  if (px < r.left - 40 || px > r.right + 40 || py < r.top - 120 || py > r.bottom + 160) { if (!d.hidden) d.hidden = true; return; }
  d.hidden = false; const w = d.offsetWidth || 140, h = d.offsetHeight || 70, me = ctx.S.player;
  /* chỗ đặt (tâm x, đáy y): trên tên họ → bên phải → bên trái → dưới chân. Bỏ chỗ ra ngoài màn, bị HUD cố định đè (thanh nhiệm vụ…), hoặc che chính mình */
  const C = [[px, Y(P.ent.y - 30) - 14], [px + 14 * k + w / 2, Y(P.ent.y - 12) + h / 2], [px - 14 * k - w / 2, Y(P.ent.y - 12) + h / 2], [px, Y(P.ent.y + 8) + h]];
  const hud = (x, y) => { const e = document.elementFromPoint(x, y); return !!e && e !== cv && !e.closest('#pk17i'); };
  const mx = me ? X(me.x) : -1e4, my = me ? Y(me.y) : -1e4;
  const clampX = cx => Math.max(w / 2 + 4, Math.min(innerWidth - w / 2 - 4, cx));
  for (const c0 of C) c0[0] = clampX(c0[0]);
  /* điểm phạt: ra ngoài màn 1000 · che chính mình 6 · đè nút PK 3 · mỗi điểm (lưới 3×3) bị HUD cố định đè 1 → chọn chỗ ít phạt nhất (bằng nhau: theo thứ tự) */
  const score = ([cx, by]) => { const l = cx - w / 2, t = by - h; if (t < 4 || by > innerHeight - 4) return 1000; let s = 0;
    if (!(l + w < mx - 8 * k || l > mx + 8 * k || by < my - 24 * k || t > my + 2 * k)) s += 6;
    for (const fx of [0.02, 0.5, 0.98]) for (const fy of [0.03, 0.5, 0.97]) if (hud(l + w * fx, t + h * fy)) s += 1;
    const bb = A.el && !A.el.hidden ? A.el.getBoundingClientRect() : null; if (bb && !(l + w < bb.left - 4 || l > bb.right + 4 || by < bb.top - 4 || t > bb.bottom + 4)) s += 3;
    return s; };
  const tnow = performance.now(); if (!(tnow - (A.pT || 0) < 250) || A.pSel !== P.id) { A.pT = tnow; A.pSel = P.id; let bi = 0, bs = 1e9; C.forEach((c0, j) => { const v = score(c0); if (v < bs) { bs = v; bi = j; } }); A.pIdx = bi; A.pScore = bs; }   /* dò chỗ đặt 4 lần / giây (elementFromPoint), vị trí vẫn bám theo mỗi khung */
  const at = C[A.pIdx] || C[0];
  d.style.left = Math.round(at[0]) + 'px'; d.style.top = Math.round(at[1]) + 'px';
}
function peerAt(ctx, mt) {
  let best = null, bd = 1e9;
  for (const P of peers()) { const e = P.ent; if (Math.abs(mt.wx - e.x) < 10 && mt.wy > e.y - 26 && mt.wy < e.y + 5) { const d = Math.hypot(mt.wx - e.x, mt.wy - (e.y - 10)); if (d < bd) { bd = d; best = P; } } }
  return best;
}

function clickPeer(ctx, mt) {
  const P = peerAt(ctx, mt); if (!P) return false; const p = ctx.S.player;
  if (canFight(ctx, P) && weapon(ctx) && p && dist(P.ent, p) <= CF.reach * 1.6) { A.sel = P.id; A.psig = ''; swing(ctx, P); return true; }
  A.sel = A.sel === P.id ? null : P.id; A.psig = ''; if (p) p.autoPath = null; return true;
}

export const pk = {
  id: 'pk',
  always: true,
  onZoneEnter(ctx) {
    A.ctx = ctx; A.q.length = 0; A.palm.clear();
    ctx.pk = {
      isOn: () => A.on && live(),
      st: () => { const h = ctx.hero; return { pk: A.on ? 1 : 0, lv: h ? h.lv | 0 : 0, hp: h ? Math.max(0, Math.ceil(h.hp)) : 0, hm: h ? h.max | 0 : 0 }; },
      onMsg: m => onMsg(ctx, m), palmHit: (h, o, a, ca, sa, pw) => palmHit(ctx, h, o, a, ca, sa, pw), aim: (p, maxD) => aim(ctx, p, maxD),
    };
    if (typeof window !== 'undefined') window.__pk = {
      state: () => ({ on: A.on, live: live(), cd: +A.cd.toFixed(2), sel: A.sel, togWait: +Math.max(0, CF.tog - (now() - A.togT)).toFixed(2), n: { ...A.n },
        peers: peers().map(P => ({ id: P.id, name: P.name, pk: pkOf(P), lv: P.st && P.st.lv, hp: P.st && P.st.hp, ko: P.ko, x: Math.round(P.ent.x), y: Math.round(P.ent.y) })),
        btn: A.el ? { hidden: A.el.hidden, on: A.el.classList.contains('on'), r: A.el.getBoundingClientRect().toJSON() } : null,
        panel: A.panel ? { hidden: A.panel.hidden, html: A.panel.innerHTML, r: A.panel.getBoundingClientRect().toJSON(), at: A.pIdx, score: A.pScore } : null }),
      toggle: () => toggle(ctx), set: on => { if (!!on !== A.on) toggle(ctx, true); return A.on; }, select: id => { A.sel = id; A.psig = ''; return !!peerOf(id); },
      swing: id => swing(ctx, peerOf(id || A.sel)), log: () => A.log.slice(), cfg: CF,
      raw: m => { const a = api(); return !!(a && a.send(m)); },   /* test: gửi tin thô (tin giả / gian lận) để thử máy nhận từ chối */
    };
    ensureDom(ctx);
  },
  onZoneLeave() { A.sel = null; A.q.length = 0; A.palm.clear(); if (A.el) A.el.hidden = true; if (A.panel) A.panel.hidden = true; },
  update(dt, ctx) {
    A.ctx = ctx; if (A.cd > 0) A.cd -= dt; if (A.comboT > 0) A.comboT -= dt;
    if (A.on && !live() && api()) { /* mất mạng → PK tự tắt (chơi một mình không có PK) */ A.on = false; A.sig = ''; lg({ ev: 'off-net' }); }
    for (let i = A.q.length - 1; i >= 0; i--) { const Q = A.q[i]; Q.t -= dt; if (Q.t <= 0) { A.q.splice(i, 1); landMelee(ctx, Q); } }
    if (A.palmT > 0) { A.palmT -= dt; if (A.palmT <= 0 && A.palm.size) flushPalm(ctx); }
    if (typeof document === 'undefined') return;
    try { ensureDom(ctx); placeBtn(ctx, dt); placePanel(ctx); } catch (e) { console.error('pk ui', e); }
  },
  key(code, ctx) { if (code === 'KeyY' && ctx.S.mode === 'play' && live()) { toggle(ctx); return true; } return false; },
  /* bấm vào người chơi khác: mở / đóng bảng; cả 2 bật PK và trong tầm → đánh luôn */
  onClick(ctx, mt) {   /* dự phòng (bình thường bộ bắt pointerdown ở window đã xử lý trước); bấm chỗ khác → đóng bảng */
    if (!live() || !mt) return false;
    if (!peerAt(ctx, mt)) { if (A.sel) { A.sel = null; A.psig = ''; } return false; }
    return clickPeer(ctx, mt);
  },
  /* phím E / nút A / ô kiếm: người PK trong tầm thành mục tiêu đánh (data.fight → main coi là việc đánh) */
  near(ctx) {
    if (!A.on || !live() || fainted(ctx)) return null;
    const p = ctx.S.player; let best = null, bd = CF.reach * 1.6;
    for (const P of peers()) { if (!canFight(ctx, P)) continue; const d = dist(P.ent, p) - (P.id === A.sel ? 8 : 0); if (d < bd) { bd = d; best = P; } }
    if (!best) return null; const e = best.ent, t = T(ctx), w = weapon(ctx);
    if (!w) return { label: ctx.needHold ? ctx.needHold('sword') : t.hit(best.name), x: e.x, y: e.y - 4, limit: CF.reach * 1.6, priority: 0.85, need: true, needId: 'sword', cursor: 'tool', mouse: false, data: { need: true } };
    return { label: t.hit(best.name), x: e.x, y: e.y - 4, limit: CF.reach * 1.6, priority: best.id === A.sel ? 3.95 : 0.85, cursor: 'tool', mouse: false, data: { fight: true, pk: best.id } };
  },
  interact(ctx, cand) { const d = cand && cand.data; if (d && d.pk) swing(ctx, peerOf(d.pk)); },
};
