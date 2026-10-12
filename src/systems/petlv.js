// petlv.js — plan-27: số liệu thuần của Rocky (không vẽ, không DOM): cấp / kinh nghiệm / chỉ số / 3 chiêu × 7 bậc / sách luyện / phân tích lệnh chat.
// pet.js (thực thể + AI), menu.js (thẻ Rocky), underwater.js (quầy Heathcliff) cùng dùng file này.

export const LV_CAP = 50;
export const needXp = lv => 12 + 8 * lv + lv * lv;   /* XP để lên từ lv → lv+1: Lv1 21 · Lv5 77 · Lv20 572 · Lv40 1932 */
export const XP_FEED = 8, XP_PET = 2;                 /* cho ăn / vuốt ve (vuốt có hồi 20 s trong pet.js) */
export const KO_SECS = 60;                            /* gục → nghỉ ở ổ ~60 s */

/* chỉ số theo cấp */
export const maxHpOf = lv => 60 + 14 * (lv - 1);
export const atkOf = lv => Math.round(6 + 1.6 * (lv - 1));
export const defOf = lv => 1 + Math.floor(0.5 * (lv - 1));
export const sizeStage = lv => (lv >= 5 ? 1 : 0);     /* 0 = Rocky gốc · 1 = cỡ lớn (cấp 5–50) · Siêu Cấp vẽ riêng */

/* 3 chiêu, mỗi chiêu 7 bậc */
export const SKILLS = {
  punch: { unlock: 1, icon: '👊', vi: 'Đấm', en: 'Punch' },
  ha: { unlock: 20, icon: '💥', vi: 'Rocky-ha', en: 'Rocky-ha' },
  super: { unlock: 40, icon: '⚡', vi: 'Siêu Cấp Rocky', en: 'Super Rocky' },
};
export const SKILL_IDS = ['punch', 'ha', 'super'];
export const TIER_MAX = 7;
export const vfxTier = t => (t >= 7 ? 7 : t >= 4 ? 4 : 1);   /* VFX 3 kiểu: bậc 1–3 · 4–6 · 7 */

export const punchOf = t => ({ mul: 1 + 0.15 * (t - 1), cd: +(0.95 - 0.07 * (t - 1)).toFixed(2), combo: t >= 4 ? 3 : 2, launch: t >= 4, shock: t >= 7 });
/* tầm luồng sáng theo nhóm VFX: bậc 1–3 = 96 px · 4–6 = 128 px · 7 = 160 px (khớp chiều dài ảnh VFX PixelLab, vẽ 1:1) */
export const haRange = t => (t >= 7 ? 160 : t >= 4 ? 128 : 96);
export const haOf = t => ({ mul: 2.2 + 0.45 * (t - 1), range: haRange(t), w: 6 + (t - 1), cd: +(10 - 0.9 * (t - 1)).toFixed(1), charge: 0.8 });
export const superOf = t => ({ dur: Math.round(20 + (25 * (t - 1)) / 6), cd: 150 - 15 * (t - 1), atk: 1.6 + 0.1 * (t - 1), def: 1.5 + 0.1 * (t - 1), spd: 1.3 });

/* sách luyện ở Heathcliff: bậc N cần chiêu đang ở N−1 + Rocky đủ cấp; giá đá tăng dần */
export const BOOK_LV = {
  punch: [0, 1, 3, 8, 14, 22, 32, 45],
  ha: [0, 20, 22, 26, 30, 35, 40, 45],
  super: [0, 40, 41, 42, 43, 44, 45, 45],
};
export const BOOK_PRICE = {
  punch: [0, 0, 40, 90, 160, 260, 400, 600],
  ha: [0, 0, 150, 250, 380, 520, 700, 950],
  super: [0, 0, 400, 550, 700, 880, 1080, 1300],
};
export const bookNeedLv = (id, n) => BOOK_LV[id][n];
export const bookPrice = (id, n) => BOOK_PRICE[id][n];

/* tính cấp từ tổng XP */
export function levelFromXp(xp) {
  let lv = 1, left = Math.max(0, xp);
  while (lv < LV_CAP && left >= needXp(lv)) { left -= needXp(lv); lv++; }
  return { lv, into: left, need: lv >= LV_CAP ? 0 : needXp(lv) };
}
export const xpForLevel = lv => { let s = 0; for (let l = 1; l < lv; l++) s += needXp(l); return s; };

/* bậc chiêu đang có (0 = chưa mở). Bậc 1 tự có khi đủ cấp mở; sách nâng 2→7 */
export function tierOf(p, id) {
  const lv = levelFromXp(p.xp || 0).lv, sk = (p.skills || {})[id] || 0;
  return lv >= SKILLS[id].unlock ? Math.max(1, sk) : 0;
}
/* có mua được sách bậc n của chiêu id không → { ok, why } */
export function canBook(p, id, n) {
  const lv = levelFromXp(p.xp || 0).lv, cur = tierOf(p, id);
  if (n > TIER_MAX) return { ok: false, why: 'max' };
  if (cur !== n - 1) return { ok: false, why: cur >= n ? 'have' : 'prev' };
  if (lv < bookNeedLv(id, n)) return { ok: false, why: 'lv', lv: bookNeedLv(id, n) };
  return { ok: true };
}

/* save cũ: độ thân → XP khởi điểm (không tụt về cấp 1 vô lý). Rocky trưởng thành (tinh thể Lõi) ít nhất cấp 5. */
export function migrate(p) {
  if (!p || p.lvMig) return false;
  const bond = +p.bond || 0;
  let xp = Math.round(bond * 15);
  if (p.grown) xp = Math.max(xp, xpForLevel(5) + 10);
  p.xp = Math.max(p.xp || 0, xp);
  if (!p.skills) p.skills = { punch: 1, ha: 0, super: 0 };
  if (!p.cmd) p.cmd = 'protect';
  if (p.hp == null) p.hp = maxHpOf(levelFromXp(p.xp).lv);
  p.lvMig = 1;
  return true;
}

/* ---- lệnh chat: có / không dấu, tiếng Anh, gõ tắt ---- */
export const fold = s => String(s || '').toLowerCase().replace(/đ/g, 'd').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
const CMD_WORDS = {
  protect: ['bao ve', 'bve', 'bv', 'protect', 'guard', 'defend', 'def', 'pro', 'p', 'giu', 'che', 'bao ve toi', 'bao ve anh'],
  attack: ['tan cong', 'tcong', 'tc', 'attack', 'atk', 'att', 'fight', 'danh', 'dam', 'kill', 'a', 'go', 'xong len', 'xung phong'],
  follow: ['di theo', 'dtheo', 'dt', 'follow', 'fol', 'fl', 'f', 'theo', 'come', 'come here', 'lai day', 'den day', 'toi day', 'ra day', 'heel', 'stop', 'dung'],
  home: ['ve nha', 'vnha', 'vn', 'home', 'go home', 'h', 'nha', 've', 've o', 'nghi', 'rest', 'back home'],
};
export function parseCmd(raw) {
  let s = fold(raw).replace(/^(rocky|rock|rk|em|oi|hey|nay|ey)( |$)/, '').replace(/ (di|nhe|nha|nao|em|rocky|please|pls|now|ngay)$/, '').trim();
  s = s.replace(/^(hay|mau|lam on) /, '').trim();
  if (!s) return null;
  for (const [k, list] of Object.entries(CMD_WORDS)) if (list.includes(s)) return k;
  for (const [k, list] of Object.entries(CMD_WORDS)) if (list.some(w => w.length >= 4 && (s.startsWith(w + ' ') || s.endsWith(' ' + w)))) return k;
  return null;
}
export const CMDS = ['protect', 'attack', 'follow', 'home'];
