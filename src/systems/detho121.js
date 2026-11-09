/* detho121.js — c70-detho (plan-121 đợt A4/A5, 09/11): "5 phút đầu dễ thở" — hàm chung NGƯỜI MỚI cho các hệ khác.
   · isNewbie(S): đang trong chuỗi Nhập môn. Có cờ S.save.sys.nhapmon121 (hệ Nhập môn của tác nhân khác) → người mới = chưa .done;
     chưa có cờ → người mới = cấp nhân vật < 3 VÀ chưa có Kiếm.
   · Dùng: worldboss44 (ẩn trùm thế giới ở máy người mới), farm106 (không đặt quái Lv > 2 sát chỗ xuất phát — luật chung, không cần cờ).
     Hệ khác: ctx.isNewbie121() (gắn ở onZoneEnter). Không lưu gì vào save.
   Móc test: window.__detho121. */
export function isNewbie(S) {
  const sv = S && S.save; if (!sv) return false;
  const nm = sv.sys && sv.sys.nhapmon121;
  if (nm && typeof nm === 'object') return !nm.done;
  const lv = (sv.hero && sv.hero.lv) || 1;
  const sw = ((sv.toolTier && sv.toolTier.sword) || 0) > 0 || !!(sv.tools && sv.tools.sword);
  return lv < 3 && !sw;
}
const FORCE = { v: null };   /* test: __detho121.force(true / false / null) */
export function newbieNow(S) { return FORCE.v != null ? FORCE.v : isNewbie(S); }

export const detho121 = {
  id: 'detho121',
  always: true,
  onZoneEnter(ctx) {
    ctx.isNewbie121 = () => newbieNow(ctx.S);
    if (typeof window !== 'undefined') window.__detho121 = { newbie: () => newbieNow(ctx.S), raw: () => isNewbie(ctx.S), force: v => { FORCE.v = v == null ? null : !!v; return newbieNow(ctx.S); } };
  },
};
