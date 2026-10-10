// hero.js — plan-21: chỉ số người chơi — cấp, kinh nghiệm, máu, sức đánh; bị đánh / ngất / hồi sinh (anh chốt: chết KHÔNG mất gì).
// Cấp 1: 100 máu, sức 10; mỗi cấp +15 máu, +3 sức; lên cấp cần 50 × cấp hiện tại kinh nghiệm.
// API cho hệ khác: ctx.hero = { lv, hp, max, atk, swordTier, weaponBonus, hit(dmg, from), heal(n), gainXp(n, why), fainted }.
// Hồi máu: tự hồi khi 6 s không bị đánh (2 %/s), ăn đồ (+25), sang ngày mới (ngủ) đầy máu.
const BONUS = [0, 5, 12, 22, 35, 50, 70];   // sát thương thêm theo cấp kiếm 0..6 (0 = rìu / tay)
const L = ctx => (ctx.lang() === 'vi'
  ? { lv: 'Cấp', up: n => `⬆ Lên cấp ${n}! Máu và sức đánh tăng`, faint: 'Bạn ngất đi… tỉnh lại ở chỗ an toàn (không mất gì)', xp: n => `+${n} kinh nghiệm` }
  : { lv: 'Lv', up: n => `⬆ Level ${n}! More health and power`, faint: 'You fainted… you wake up somewhere safe (nothing lost)', xp: n => `+${n} XP` });

const ST = { el: null, lastHit: -99, inv: 0, faintT: 0, day: null, sig: '' };
const sv = ctx => { const s = ctx.S.save; s.hero ||= { lv: 1, xp: 0, hp: null }; return s.hero; };
export const maxHp = lv => 100 + 15 * (lv - 1);
export const baseAtk = lv => 10 + 3 * (lv - 1);
export const needXp = lv => 50 * lv;

function hud(ctx) {
  if (!ST.el) {
    ST.el = document.createElement('div'); ST.el.id = 'herobar'; document.body.appendChild(ST.el);
  }
  const h = sv(ctx), max = maxHp(h.lv), hide = ctx.S.mode !== 'play' && ctx.S.mode !== 'menu';
  const sig = [h.lv, Math.ceil(h.hp), max, h.xp, hide, ctx.lang()].join('|'); if (sig === ST.sig) return; ST.sig = sig;
  ST.el.hidden = hide; if (hide) return;
  const t = L(ctx), hp = Math.max(0, Math.ceil(h.hp)), xpN = needXp(h.lv);
  ST.el.innerHTML = `<b class="hb-lv">${t.lv} ${h.lv}</b><div class="hb-bars"><div class="hb-hp" title="${hp}/${max}"><div class="hb-slot"><i style="height:${Math.round(hp / max * 100)}%"></i></div></div>`
    + `<div class="hb-xp" title="${h.xp}/${xpN}"><i style="height:${Math.round(h.xp / xpN * 100)}%"></i></div><span class="hb-num">${hp}/${max}</span></div>`;   /* plan-22: thanh dọc góc dưới phải kiểu Stardew */
}
function respawnSpot(ctx) {   /* giường gần nhất → khu nhà mình → điểm vào vùng */
  const S = ctx.S, p = S.player, bed = S.map.objects.filter(o => o.bed).sort((a, b) => Math.hypot(a.x * 16 - p.x, a.y * 16 - p.y) - Math.hypot(b.x * 16 - p.x, b.y * 16 - p.y))[0];
  if (bed) return { x: bed.x * 16 + 8, y: (bed.y + 2) * 16 + 6 };
  const my = ctx.myPlot && ctx.myPlot(); if (my) { const sp = my.spawn || my; return { x: (sp.x + 1) * 16 + 8, y: (sp.y + 1) * 16 + 12 }; }
  const e = S.map.entries.default; return { x: e.x * 16 + 8, y: e.y * 16 + 14 };
}
function faint(ctx) {
  const h = sv(ctx); ST.faintT = 1.2; ctx.toast(L(ctx).faint, true); ctx.sfx('fail');
  const p = ctx.S.player; p.autoPath = null; p.action = null;
  setTimeout(() => {
    if (ctx.faintTravel && ctx.faintTravel()) { h.hp = maxHp(h.lv); ctx.persist(); return; }   /* plan-26: ngất dưới nước → hệ underwater đưa lên bến Làng (không mất đồ) */
    const s = respawnSpot(ctx); p.x = s.x; p.y = s.y; h.hp = maxHp(h.lv); ctx.persist();
  }, 700);
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
        hh.hp -= dmg; ST.lastHit = ctx.S.time; ST.inv = 0.6;
        const p = ctx.S.player; if (p.hasAct && p.hasAct('hurt') && (!p.custom || (ctx.isUnderwater && ctx.isUnderwater())) && !p.action) p.act('hurt', 0);   /* plan-26: dưới nước người chơi vẽ kiểu bơi (custom) nhưng vẫn hiện clip bị đánh */
        if (ctx.pop) ctx.pop(p.x, p.y - 22, `-${dmg}`, '#ff6b6b');
        ctx.sfx('hit'); if (hh.hp <= 0) { hh.hp = 0; faint(ctx); } return true;
      },
      heal(n) { const hh = sv(ctx); hh.hp = Math.min(maxHp(hh.lv), hh.hp + n); },
      gainXp(n) {
        const hh = sv(ctx); hh.xp += n; let up = false;
        while (hh.xp >= needXp(hh.lv)) { hh.xp -= needXp(hh.lv); hh.lv++; up = true; }
        if (up) { hh.hp = maxHp(hh.lv); ctx.toast(L(ctx).up(hh.lv), true); ctx.sfx('coin'); if (ctx.vfx) ctx.vfx('level_up', ctx.S.player.x, ctx.S.player.y + 2, 0, true); }
        ctx.persist();
      },
    };
    ctx.hero = self;
    if (typeof window !== 'undefined') window.__hero = { state: () => { const mul = ctx.atkMul ? ctx.atkMul() : 1; return { ...sv(ctx), max: maxHp(sv(ctx).lv), atk: Math.max(1, Math.round(self.atk * mul)), atkBase: self.atk, atkMul: mul }; }, hit: d => self.hit(d), xp: n => self.gainXp(n), heal: n => self.heal(n) };   /* móc test; plan-26: atk = sức đánh THẬT lúc này (gồm Bóng tối, ×0,5 dưới nước), atkBase = chưa nhân */
  },
  update(dt, ctx) {
    const h = sv(ctx); if (ST.inv > 0) ST.inv -= dt; if (ST.faintT > 0) ST.faintT -= dt;
    if (ctx.S.time - ST.lastHit > 6 && h.hp < maxHp(h.lv)) h.hp = Math.min(maxHp(h.lv), h.hp + maxHp(h.lv) * 0.02 * dt);
    const day = ctx.clock && ctx.clock.dayIndex; if (ST.day != null && day !== ST.day) h.hp = maxHp(h.lv); ST.day = day;   /* ngủ / sang ngày mới → đầy máu */
    hud(ctx);
  },
  drawUI(ug, ctx) {   /* ngất: màn tối dần */
    if (ST.faintT <= 0) return; ug.save(); ug.globalAlpha = Math.min(0.85, (1.2 - Math.abs(ST.faintT - 0.6)) * 0.9); ug.fillStyle = '#0d0b14'; ug.fillRect(0, 0, ug.canvas.width, ug.canvas.height); ug.restore();
  },
};
