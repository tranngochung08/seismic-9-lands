/* ubam121.js — lớp c21-ubam (anh 04/11): Rocky KIỂU CŨ (Rocky cam thú cưng) = Chấn Thú HIẾM "Ubam", skill y chang bản cũ.
   · Dữ liệu loài 'ubam' (hệ Chấn, Hiếm, bậc Nhỏ) + 5 chiêu trận ở duel-data.js (vá c21); sprite trận ghép từ ảnh Rocky cam có sẵn.
   · NGOÀI MAP: Ubam KHÔNG dùng bộ não chung squad104 — nó chính là thú cưng Rocky cam của pet.js (đi theo, Đấm, Rocky-ha Lv20,
     Siêu Cấp Lv40, chiêu lõi trùm, Hợp Thể, lệnh chat…). Hệ này chỉ NỐI con 'ubam' trong đội với save.sys.pet.pet:
       – đội có Ubam mà save chưa có thú cưng → tạo thú cưng tên Ubam (đánh dấu pet.ubam = id con trong đội);
       – J thả / thu (save.sys.p104.out) ↔ thú cưng ra theo / về ổ (lệnh cũ của pet.js);
       – tên đổi ở bảng Đội → tên thú cưng; cấp của thú cưng (xp pet.js) → cấp hiện ở bảng Đội.
   · Save cũ có Rocky cam (pet không có cờ ubam) → KHÔNG đụng gì. Móc test: window.__ubam. */
import * as LV from './petlv.js';

const ST = { ctx: null, t: 0, prevOut: null, n: { link: 0, out: 0, back: 0 }, log: [] };
const log = (ev, o) => { ST.log.push({ t: +(performance.now() / 1000).toFixed(1), ev, ...(o || {}) }); if (ST.log.length > 60) ST.log.shift(); };
function teamUb(ctx) { const d = ctx.S.save && ctx.S.save.sys && ctx.S.save.sys.chanthu; if (!d) return null; return (d.team || []).find(m => m && m.sp === 'ubam') || null; }
function boxUb(ctx) { const d = ctx.S.save && ctx.S.save.sys && ctx.S.save.sys.chanthu; if (!d) return null; return (d.box || []).find(m => m && m.sp === 'ubam') || null; }
function petSv(ctx) { const s = ctx.S.save; s.sys = s.sys || {}; return (s.sys.pet = s.sys.pet || {}); }
function linked(ctx) { const ps = ctx.S.save && ctx.S.save.sys && ctx.S.save.sys.pet; return ps && ps.pet && ps.pet.ubam ? ps.pet : null; }
function isOut(ctx, m) { const k = ctx.S.save.sys && ctx.S.save.sys.p104; return !!(k && Array.isArray(k.out) && k.out.includes(m.id)); }
function cmd(ctx, pt, k) {   /* lệnh cũ của pet.js (có hiệu ứng ra / về ổ); thiếu móc thì đặt thẳng */
  try { if (typeof window !== 'undefined' && window.__pet && window.__pet.cmd && window.__pet.cmd(k)) return; } catch (e) { }
  pt.cmd = k;
}
function link(ctx, m) {
  const ps = petSv(ctx); if (ps.pet) return ps.pet.ubam ? ps.pet : null;   /* đã có Rocky cam (save cũ) → không thay */
  const lv = Math.max(1, m.lv | 0);
  ps.pet = { name: m.name || 'Ubam', hunger: 100, bond: 0, born: Date.now(), xp: LV.xpForLevel(lv), cmd: 'home', skills: { punch: 1, ha: 0, super: 0 }, lvMig: 1, ubam: m.id, hp: LV.maxHpOf(lv) };
  ps.eggTaken = true; ST.n.link++; log('link', { id: m.id, lv }); try { ctx.persist(); } catch (e) { }
  return ps.pet;
}
function tick(ctx) {
  const m = teamUb(ctx); let pt = linked(ctx);
  if (!m) { if (pt && pt.cmd !== 'home') { pt.ubCmd = pt.cmd; cmd(ctx, pt, 'home'); log('box', { box: !!boxUb(ctx) }); } ST.prevOut = null; return; }   /* Ubam cất vào kho / thả đi → thú cưng về ổ */
  if (!pt) pt = link(ctx, m); if (!pt) return;
  if (pt.ubam !== m.id) pt.ubam = m.id;
  if (m.name && pt.name !== m.name) pt.name = String(m.name).slice(0, 14);
  const lv = LV.levelFromXp(pt.xp || 0).lv; if (m.lv !== lv) m.lv = lv;
  const out = isOut(ctx, m);
  if (ST.prevOut === null) {   /* vào vùng / nạp save: khớp im lặng */
    if (!out && pt.cmd !== 'home') { pt.ubCmd = pt.cmd; pt.cmd = 'home'; }
    else if (out && pt.cmd === 'home' && !(pt.koT > 0)) pt.cmd = pt.ubCmd || 'protect';
  } else if (out !== ST.prevOut) {   /* J thả / thu */
    if (out) { ST.n.out++; if (pt.cmd === 'home') cmd(ctx, pt, pt.ubCmd && pt.ubCmd !== 'home' ? pt.ubCmd : 'protect'); log('out'); }
    else { ST.n.back++; if (pt.cmd !== 'home') { pt.ubCmd = pt.cmd; cmd(ctx, pt, 'home'); } log('back'); }
  }
  ST.prevOut = out;
}

export const ubam121 = {
  id: 'ubam121',
  always: true,
  onZoneEnter(ctx) {
    ST.ctx = ctx; ST.prevOut = null; ST.t = 0;
    try { tick(ctx); } catch (e) { console.warn('ubam121', e); }
    ctx.ubam = { pet: () => linked(ctx), member: () => teamUb(ctx) };
    if (typeof window !== 'undefined') window.__ubam = {
      state: () => { const m = teamUb(ctx), pt = linked(ctx); return { member: m ? { id: m.id, lv: m.lv, name: m.name } : null, pet: pt ? { name: pt.name, cmd: pt.cmd, xp: pt.xp, lv: LV.levelFromXp(pt.xp || 0).lv, ubam: pt.ubam } : null, out: m ? isOut(ctx, m) : false, n: { ...ST.n }, log: ST.log.slice(-20) }; },
      tick: () => tick(ctx) };
  },
  update(dt, ctx) { ST.t -= dt; if (ST.t > 0) return; ST.t = 0.2; try { tick(ctx); } catch (e) { console.warn('ubam121', e); ST.t = 5; } },
};
