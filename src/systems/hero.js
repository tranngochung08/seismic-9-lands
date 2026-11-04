// hero.js — c27-chet (04/11): chết = ngã + hồn bay → về cạnh Noxx (chet27.js), bỏ nút hồi sinh / về nhà. — plan-21: chỉ số người chơi — cấp, kinh nghiệm, máu, sức đánh; bị đánh / ngất / hồi sinh (anh chốt: chết KHÔNG mất gì).
// Cấp 1: 100 máu, sức 10; mỗi cấp +15 máu, +3 sức; lên cấp cần 50 × cấp hiện tại kinh nghiệm.
// API cho hệ khác: ctx.hero = { lv, hp, max, atk, swordTier, weaponBonus, hit(dmg, from), heal(n), gainXp(n, why), fainted }.
// Hồi máu: tự hồi khi 6 s không bị đánh (2 %/s), ăn đồ (+25), sang ngày mới (ngủ) đầy máu.
import { isEasy, easyDmg, noteLoss, bossKey } from './diff.js';   /* plan-44 C2: Độ khó Dễ — sát thương lên người chơi ×0,6 (một chỗ chung: hit) */
const BONUS = [0, 5, 12, 22, 35, 50, 70];   // sát thương thêm theo cấp kiếm 0..6 (0 = rìu / tay)
const L = ctx => (ctx.lang() === 'vi'
  ? { lv: 'Cấp', up: n => `⬆ Lên cấp ${n}! Máu và sức đánh tăng`, faint: 'Bạn ngất đi… tỉnh lại ở chỗ an toàn (không mất gì)', xp: n => `+${n} kinh nghiệm` }
  : { lv: 'Lv', up: n => `⬆ Level ${n}! More health and power`, faint: 'You fainted… you wake up somewhere safe (nothing lost)', xp: n => `+${n} XP` });

const ST = { el: null, lastHit: -99, inv: 0, faintT: 0, day: null, sig: '' };
const sv = ctx => { const s = ctx.S.save; s.hero ||= { lv: 1, xp: 0, hp: null }; return s.hero; };
export const maxHp = lv => 100 + 15 * (lv - 1);
export const baseAtk = lv => 10 + 3 * (lv - 1);
export const needXp = lv => 50 * lv;
export const MAX_LV = 50;   /* plan-29: cấp tối đa (điều ước 'Sức mạnh tối đa' của Rồng Thần) */

function hud(ctx) {
  if (!ST.el) {
    ST.el = document.createElement('div'); ST.el.id = 'herobar'; document.body.appendChild(ST.el);
  }
  const h = sv(ctx), max = maxHp(h.lv), hide = ctx.S.mode !== 'play' && ctx.S.mode !== 'menu';
  const ez = isEasy(ctx.S.save), sig = [h.lv, Math.ceil(h.hp), max, h.xp, hide, ctx.lang(), ez].join('|'); if (sig === ST.sig) return; ST.sig = sig;
  ST.el.hidden = hide; if (hide) return;
  const t = L(ctx), hp = Math.max(0, Math.ceil(h.hp)), xpN = needXp(h.lv);
  ST.el.innerHTML = `<b class="hb-lv">${t.lv} ${h.lv}</b>${ez ? `<b class="hb-lv hb-easy" style="font-size:13px;color:#1f6a30" title="${ctx.lang() === 'vi' ? 'Độ khó: Dễ' : 'Difficulty: Easy'}">${ctx.lang() === 'vi' ? 'Dễ' : 'Easy'}</b>` : ''}<div class="hb-bars"><div class="hb-hp" title="${hp}/${max}"><div class="hb-slot"><i style="height:${Math.round(hp / max * 100)}%"></i></div></div>`
    + `<div class="hb-xp" title="${h.xp}/${xpN}"><i style="height:${Math.round(h.xp / xpN * 100)}%"></i></div><span class="hb-num">${hp}/${max}</span></div>`;   /* plan-22: thanh dọc góc dưới phải kiểu Stardew */
  if (ctx.kiMount) ctx.kiMount(ST.el);   /* plan-34: thanh Ki 7 viên ngọc gắn vào .hb-bars (ki.js) */
}
function respawnSpot(ctx) {   /* giường gần nhất → khu nhà mình → điểm vào vùng */
  const S = ctx.S, p = S.player, bed = S.map.objects.filter(o => o.bed).sort((a, b) => Math.hypot(a.x * 16 - p.x, a.y * 16 - p.y) - Math.hypot(b.x * 16 - p.x, b.y * 16 - p.y))[0];
  if (bed) return { x: bed.x * 16 + 8, y: (bed.y + 2) * 16 + 6 };
  const my = ctx.myPlot && ctx.myPlot(); if (my) { const sp = my.spawn || my; return { x: (sp.x + 1) * 16 + 8, y: (sp.y + 1) * 16 + 12 }; }
  const e = S.map.entries.default; return { x: e.x * 16 + 8, y: e.y * 16 + 14 };
}
function goHome(ctx) {   /* c27-chet: luật thua riêng (trùm / sân / dưới nước: faintTravel) giữ nguyên → còn lại về thẳng cạnh Noxx ở Làng (chet27) → cuối cùng chỗ cũ */
  const h = sv(ctx), p = ctx.S.player; h.hp = maxHp(h.lv);
  if (ctx.faintTravel && ctx.faintTravel()) { ctx.persist(); return 'rule'; }   /* plan-26: ngất dưới nước → hệ underwater đưa lên bến Làng (không mất đồ); trùm: về cửa khe */
  if (ctx.chet27 && ctx.chet27.toNoxx(ctx)) { ctx.persist(); return 'noxx'; }
  const s = respawnSpot(ctx); p.x = s.x; p.y = s.y; ctx.persist(); return 'spot';
}
/* c27-chet (anh 04/11): hết máu → NGÃ (knockdown giữ khung nằm) + HỒN bay lên (chet27.js) → ~2,15 s tự về cạnh Noxx, máu đầy, không mất gì.
   Không còn bảng đếm ngược, nút hồi sinh (Đá Seismic) / về nhà; E / Esc không làm gì trong lúc chết. Không hình phạt (như cũ: chết KHÔNG mất gì). */
const DIE_T = 2.15;
function faint(ctx) {
  const S = ctx.S, p = S.player; ST.faintT = 999; ctx.sfx('fail');
  try { noteLoss(ctx, bossKey(ctx)); } catch (e) { }   /* plan-44 C2: ngất trước cùng 1 trùm 2 lần liền → gợi ý Độ khó Dễ */
  try { if (ctx.chet27) ctx.chet27.start(ctx, p); } catch (e) { console.error('chet27', e); }   /* chụp hồn từ dáng đứng TRƯỚC khi đặt clip ngã */
  p.autoPath = null; p.action = null; if (p.hasAct && p.hasAct('knockdown')) p.action = { name: 'knockdown', t: 0, dur: 0.55, hold: true, walk: false, loop: false };   /* ngã ngửa rồi giữ khung nằm */
  const prevMode = S.mode === 'faint' ? 'play' : (S.mode || 'play');
  const F = ST.fa = { left: DIE_T, done: false, prevMode, how: null };
  F.finish = () => {
    if (F.done) return; F.done = true; ST.fa = null;
    if (p.endAct) p.endAct(); p.action = null; ctx.setMode(F.prevMode === 'faint' ? 'play' : F.prevMode);
    ST.faintT = 0; ST.inv = 2.0; F.how = goHome(ctx);   /* miễn đòn 2 s sau khi hồi */
  };
  ctx.setMode('faint');
  ctx.registerCloser('faint', () => { });
  ctx.onAction('faint', () => { });
  if (typeof window !== 'undefined') window.__faint = { pick: () => F.finish(), left: () => Math.max(0, F.left), open: () => !F.done, how: () => F.how };   /* móc test (pick = bỏ qua phần còn lại của cảnh chết) */
}

export const hero = {
  id: 'hero',
  onZoneEnter(ctx) {
    const h = sv(ctx); if (h.hp == null || h.hp <= 0) h.hp = maxHp(h.lv);
    const self = {
      get lv() { return sv(ctx).lv; }, get hp() { return sv(ctx).hp; }, get max() { return maxHp(sv(ctx).lv); },
      get atk() { return baseAtk(sv(ctx).lv) + (ctx.darkAtk ? ctx.darkAtk() : 0); },   /* plan-25: Bóng tối tăng sức đánh (phe Xealist) */ get swordTier() { return ctx.tool.tier('sword'); },
      weaponBonus: tier => BONUS[Math.max(0, Math.min(6, tier))],
      get fainted() { return ST.faintT > 0; },
      hit(dmg) {
        const hh = sv(ctx); if (ST.inv > 0 || ST.faintT > 0) return false;
        dmg = easyDmg(dmg, ctx.S.save);   /* plan-44 C2: Độ khó Dễ → ×0,6 (tối thiểu 1) */
        if (ctx.sparOn && ctx.sparOn()) dmg = Math.min(dmg, Math.max(0, Math.ceil(hh.hp) - 1));   /* spar.js: trận tập không ngất — còn 1 máu là chịu thua */
        hh.hp -= dmg; ST.lastHit = ctx.S.time; ST.inv = 0.6;
        const p = ctx.S.player; if (p.hasAct && p.hasAct('hurt') && (!p.custom || p.airBody || (ctx.isUnderwater && ctx.isUnderwater())) && !p.action) p.act('hurt', 0);   /* plan-26: dưới nước người chơi vẽ kiểu bơi (custom) nhưng vẫn hiện clip bị đánh */
        if (ctx.pop) ctx.pop(p.x, p.y - 22, `-${dmg}`, '#ff6b6b');
        ctx.sfx('hit'); if (hh.hp <= 0) { hh.hp = 0; faint(ctx); } return true;
      },
      iframes(sec, keep) { ST.inv = keep ? Math.max(ST.inv, sec) : sec; },   /* plan-34: keep = không rút ngắn miễn đòn đang có (ki.js nhào lộn) */   /* knock.js: miễn sát thương khi đang bị hất bay / vừa chạm đất */
      heal(n) { const hh = sv(ctx); hh.hp = Math.min(maxHp(hh.lv), hh.hp + n); },
      gainXp(n) {
        const hh = sv(ctx); hh.xp += n; let up = false;
        while (hh.lv < MAX_LV && hh.xp >= needXp(hh.lv)) { hh.xp -= needXp(hh.lv); hh.lv++; up = true; }
        if (hh.lv >= MAX_LV) hh.xp = 0;
        if (up) { hh.hp = maxHp(hh.lv); ctx.toast(L(ctx).up(hh.lv), true); ctx.sfx('coin'); if (ctx.vfx) ctx.vfx('level_up', ctx.S.player.x, ctx.S.player.y + 2, 0, true); }
        ctx.persist();
      },
    };
    ctx.hero = self;
    if (typeof window !== 'undefined') window.__hero = { state: () => { const mul = ctx.atkMul ? ctx.atkMul() : 1; return { ...sv(ctx), max: maxHp(sv(ctx).lv), atk: Math.max(1, Math.round(self.atk * mul)), atkBase: self.atk, atkMul: mul }; }, hit: d => self.hit(d), xp: n => self.gainXp(n), heal: n => self.heal(n) };   /* móc test; plan-26: atk = sức đánh THẬT lúc này (gồm Bóng tối, ×0,5 dưới nước), atkBase = chưa nhân */
  },
  update(dt, ctx) {
    const h = sv(ctx); if (ST.inv > 0) ST.inv -= dt; if (ST.faintT > 0) ST.faintT -= dt;
    if (ST.fa) { const F = ST.fa; F.left -= dt; if (ctx.S.player.tickAct) ctx.S.player.tickAct(dt); if (F.left <= 0) F.finish(); }   /* c27-chet: cảnh chết ~2,15 s rồi tự hồi cạnh Noxx */   /* 2026-10-13: đếm ngược ngất theo thời gian game */
    if (ctx.S.time - ST.lastHit > 6 && h.hp < maxHp(h.lv)) h.hp = Math.min(maxHp(h.lv), h.hp + maxHp(h.lv) * 0.02 * dt);
    const day = ctx.clock && ctx.clock.dayIndex; if (ST.day != null && day !== ST.day) h.hp = maxHp(h.lv); ST.day = day;   /* ngủ / sang ngày mới → đầy máu */
    hud(ctx);
  },
  drawUI(ug, ctx) {   /* c27-chet: màn ngả sáng NHẸ lúc về cạnh Noxx (chet27.ui) — bỏ màn tối cũ */
    if (ctx.chet27 && ctx.chet27.ui) ctx.chet27.ui(ug, ctx);
  },
};
