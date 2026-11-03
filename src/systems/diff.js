/* diff.js — plan-44 đợt C (C2 / plan-43 Y3, 2026-10-18): ĐỘ KHÓ Dễ / Thường.
   save.diff = 'easy' | 'normal' (thiếu = Thường — save cũ không đổi gì). Đổi trong ⚙ Cài đặt (menu.js).
   Dễ: máu địch ×0,6 (quái thường: monsters.js newMo; bạn tập: spar.js summon; trùm: bossHp/… của từng trùm — vì trùm tự đo lại máu sau màn mở đầu)
       sát thương lên người chơi ×0,6 (một chỗ chung: hero.js hit()). Phần thưởng giữ nguyên.
   Gợi ý: thua CÙNG một bạn tập / trùm 2 lần liền (không thắng gì ở giữa) → 1 dòng thông báo nhỏ "Có thể đổi Độ khó: Dễ trong ⚙". Không tự đổi.
   Dấu "Dễ" tĩnh cạnh thanh máu (trùm: vẽ ở drawUI của hệ này theo khung bosscam.bossBarBox gần nhất; bạn tập / trùm canh cổng / máu người chơi: tự gọi easyTag). */
import { lastBossBar } from './bosscam.js';

export const EASY = { hp: 0.6, dmg: 0.6 };
let S0 = null;
const cur = () => (S0 && S0.save) || (typeof window !== 'undefined' && window.__S && window.__S.save) || null;
export function isEasy(save) { const s = save || cur(); return !!(s && s.diff === 'easy'); }
export const hpMul = save => (isEasy(save) ? EASY.hp : 1);
export const dmgMul = save => (isEasy(save) ? EASY.dmg : 1);
export const easyHp = (n, save) => (isEasy(save) ? Math.max(1, Math.round(n * EASY.hp)) : n);
export const easyDmg = (n, save) => (isEasy(save) ? Math.max(1, Math.round(n * EASY.dmg)) : n);
export function setDiff(save, v) { if (!save) return; save.diff = v === 'easy' ? 'easy' : 'normal'; save.diffLoss = null; }

const STR = {
  vi: { tag: 'Dễ', easy: 'Dễ', normal: 'Thường', label: 'Độ khó', tip: 'Thua 2 lần liền? Có thể đổi Độ khó: Dễ trong ⚙ Cài đặt (máu & đòn của đối thủ ×0,6).' },
  en: { tag: 'Easy', easy: 'Easy', normal: 'Normal', label: 'Difficulty', tip: 'Lost twice in a row? You can switch Difficulty to Easy in ⚙ Settings (foes have ×0.6 HP & damage).' },
};
const L = vi => (vi ? STR.vi : STR.en);
export function diffLabel(vi, save) { const t = L(vi); return `${t.label}: ${isEasy(save) ? t.easy : t.normal}`; }

/* ---- đếm thua liền ---- */
const BOSSY = /^(kraken|xealistboss|serpent|armorshark|momeel|crabking|lyron_)/;
function winsTotal(s) {   /* tổng số trận đã thắng (mọi trùm + bạn tập + huy hiệu) — đổi giữa 2 lần thua = chuỗi thua bị ngắt */
  let n = (s.badges || []).length; const sys = s.sys || {};
  for (const k in sys) { const v = sys[k]; if (v && typeof v.wins === 'number') n += v.wins; }
  const rec = sys.spar && sys.spar.rec; if (rec) for (const k in rec) n += (rec[k] && rec[k].w) || 0;
  return n;
}
export function bossKey(ctx) {   /* ngất lúc đang có trùm trong vùng → khoá 'b:<vùng>' (trùm nhiều pha cùng 1 vùng = cùng 1 đối thủ) */
  const list = ctx.monsters && ctx.monsters.list ? ctx.monsters.list() : [];
  const b = list.find(m => m && m.c && m.hp > 0 && (m.c.boss || m.c.noXpTag || m.c.lyBoss || m.c.lyRtt || BOSSY.test(m.c.key || '')));
  return b ? 'b:' + ((ctx.S.zone && ctx.S.zone.id) || '?') : null;
}
let pend = null;
export function noteLoss(ctx, key) {
  const s = ctx.S && ctx.S.save; if (!s || !key) return;
  const w = winsTotal(s), o = s.diffLoss, n = o && o.k === key && o.w === w ? (o.n || 0) + 1 : 1;
  s.diffLoss = { k: key, n, w }; if (!isEasy(s) && (n === 2 || n === 5)) pend = { t: 0, n, k: key };
  if (typeof window !== 'undefined') (window.__diffLog ||= []).push({ k: key, n, w, tip: !!pend });
}
export function noteWin(ctx, key) { const s = ctx.S && ctx.S.save; if (s && s.diffLoss && (!key || s.diffLoss.k === key)) s.diffLoss = null; }

/* ---- dấu "Dễ" (tĩnh) ---- */
export function easyTag(ug, xRight, yTop, fs, vi) {
  if (!isEasy()) return;
  const t = L(vi == null ? (cur() && cur().lang === 'vi') : vi).tag, f = Math.max(10, Math.round(fs));
  ug.save(); ug.font = `bold ${f}px VT323, monospace`; const w = Math.ceil(ug.measureText(t).width) + 8, h = f + 2;
  ug.fillStyle = 'rgba(30,70,40,.92)'; ug.strokeStyle = '#8fe0a0'; ug.lineWidth = 1; ug.beginPath(); ug.roundRect(Math.round(xRight - w) + 0.5, Math.round(yTop) + 0.5, w, h, 3); ug.fill(); ug.stroke();
  ug.fillStyle = '#c8ffd2'; ug.textAlign = 'center'; ug.textBaseline = 'middle'; ug.fillText(t, Math.round(xRight - w / 2), Math.round(yTop + h / 2 + 1)); ug.restore();
}

export const diff = {
  id: 'diff', always: true,
  onZoneEnter(ctx) {
    S0 = ctx.S;
    ctx.diff = { easy: () => isEasy(ctx.S.save), hpMul: () => hpMul(ctx.S.save), dmgMul: () => dmgMul(ctx.S.save), set: v => { setDiff(ctx.S.save, v); ctx.persist(); }, loss: k => noteLoss(ctx, k), win: k => noteWin(ctx, k), EASY };
    if (typeof window !== 'undefined') window.__diff = { get: () => ctx.S.save.diff || 'normal', set: v => ctx.diff.set(v), loss: () => ctx.S.save.diffLoss || null, pend: () => pend, log: () => window.__diffLog || [], tagAt: () => window.__diffTag || null };
  },
  update(dt, ctx) {
    if (!pend) return; if (ctx.S.mode !== 'play' || (ctx.hero && ctx.hero.fainted)) { pend.t = 0; return; }
    pend.t += dt; if (pend.t < 1.2) return;
    pend = null; ctx.toast(L(ctx.lang() === 'vi').tip); if (typeof window !== 'undefined') window.__diffTipShown = (window.__diffTipShown || 0) + 1;
  },
  drawUI(ug, ctx, cx, cy, scale) {   /* dấu "Dễ" dưới mép phải thanh máu trùm (khung bosscam vừa dùng trong ~0,8 s) */
    if (!isEasy(ctx.S.save) || ctx.S.mode !== 'play') { if (typeof window !== 'undefined') window.__diffTag = null; return; }
    const B = lastBossBar(); if (!B || !B.box) { if (typeof window !== 'undefined') window.__diffTag = null; return; }
    const now = typeof performance !== 'undefined' ? performance.now() : 0; if (now - B.t > 800) { if (typeof window !== 'undefined') window.__diffTag = null; return; }
    const b = B.box, fs = Math.max(11, Math.round((globalThis.__u89?globalThis.__u89(scale):scale) * 3)), y = b.y + (b.h || 24) + 2;
    easyTag(ug, b.x + b.w - 6, y, fs, ctx.lang() === 'vi'); if (typeof window !== 'undefined') window.__diffTag = { x: b.x + b.w - 6, y };
  },
};
