// roadloot.js — plan-28: phần thưởng khi THẮNG bạn tập cơ bắp (cả trên đường đèo lẫn ở Sàn Đấu Ngầm) + NGỌC RỒNG.
// Không phải 'system' (không có id/update): spar.js gọi winLoot(); road.js + test đọc bảng tỷ lệ.
//  · Đồ rơi RA ĐẤT (ctx.give → drops.js, plan-24): đá Seismic, viên hồi máu, vật liệu vùng phía trên; đoạn càng sau càng nhiều.
//  · Ngọc Rồng: 7 viên, rơi viên SAO CAO NHẤT còn thiếu (7 sao trước … 1 sao). Tỷ lệ theo thứ tự đoạn đường của người đó
//    (Ca Rô ~5 % → Lực Sĩ / Biker 35 %), thắng ở dạng Cao cấp ×1,5. Đủ 7 viên thì thôi rơi. Công dụng khi gom đủ: CHỜ ANH CHỐT.
//  · Lưu: save.sys.road.balls = [7, 6, …] (các viên đã rơi — tính cả khi chưa nhặt, khỏi rơi trùng).
export const ORDER = { caro: 1, dauvuong: 2, maoga: 3, batup: 4, riatrau: 5, bonggon: 6, bittai: 7, cambua: 8, lucsi: 9, biker: 9, sungbo: 6, sungbo_king: 9 };   /* Sừng Bò chỉ ở Sàn Đấu (anh chốt) → xếp ngang Bông Gòn; Ngưu Ma Vương ngang đoạn cuối */
export const BALL_CHANCE = { caro: 0.05, dauvuong: 0.08, maoga: 0.11, batup: 0.15, riatrau: 0.19, bonggon: 0.23, bittai: 0.27, cambua: 0.31, lucsi: 0.35, biker: 0.35, sungbo: 0.23, sungbo_king: 0.35 };
export const UPPER_MAT = { 1: ['shell', 'claw'], 2: ['feather', 'flower'], 3: ['fang', 'wood'], 4: ['core', 'ore'], 5: ['stinger', 'rock'], 6: ['ink', 'glass'], 7: ['ember', 'obsidian'], 8: ['fur', 'ice'], 9: ['shard', 'crystal'] };   /* vật liệu của vùng phía trên đoạn đó */
export const BALL_IDS = ['dball7', 'dball6', 'dball5', 'dball4', 'dball3', 'dball2', 'dball1'];
const store = ctx => { const s = ctx.S.save; s.sys ||= {}; const r = (s.sys.road ||= {}); r.won ||= {}; r.balls ||= []; return r; };
export function ballChance(id, form) { const c = BALL_CHANCE[id] ?? 0.05; return Math.min(1, c * (form >= 2 ? 1.5 : 1)); }
export function nextBall(ctx) { const got = store(ctx).balls; for (let n = 7; n >= 1; n--) if (!got.includes(n)) return n; return 0; }
/* thắng bạn tập id ở dạng form (0 Cơ bản · 1 Trung · 2 Cao), rơi đồ tại (x, y). rnd: số ngẫu nhiên (test truyền vào). Trả về danh sách đồ đã rơi. */
export function winLoot(ctx, id, form, x, y, rnd = Math.random) {
  const k = ORDER[id] || 3, out = [], give = (it, n) => { if (n > 0 && ctx.ITEMS[it]) { ctx.give(it, n, x, y); out.push([it, n]); } };
  give('stone', 8 + 5 * k + (form >= 2 ? 6 : 0));
  give('pill_hp', 1 + Math.floor(k / 4));
  const mats = UPPER_MAT[Math.min(9, k)] || []; mats.forEach((m, i) => give(m, i === 0 ? 1 + Math.floor(k / 3) : 1 + Math.floor(k / 5)));
  if (rnd() < 0.15 + k * 0.03) give('soul', 1);
  const st = store(ctx), n = nextBall(ctx);
  if (n && rnd() < ballChance(id, form)) { st.balls.push(n); ctx.give('dball' + n, 1, x, y, { beam: true }); out.push(['dball' + n, 1]); if (ctx.toast) setTimeout(() => ctx.toast(ctx.lang() === 'vi' ? `🐉 NGỌC RỒNG ${n} SAO rơi ra!` : `🐉 The ${n}-STAR DRAGON BALL dropped!`, true), 1600); if (ctx.sfx) ctx.sfx('win'); }
  if (ctx.persist) ctx.persist();
  return out;
}
