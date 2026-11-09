/* mapfog120.js — c67-world (plan-120 #10): ghi danh sách vùng ĐÃ TỚI cho bản đồ M có mây che (ui.js openMap đọc save.sys.mapfog120.seen).
   · Save cũ chưa có danh sách → gieo 1 lần từ dấu vết sẵn có: vùng đang đứng, vùng có huy hiệu (badges = lv), vùng có tiến độ nhiệm vụ (save.tasks), Làng.
   · Mỗi lần vào vùng (kể cả vùng ẩn) → thêm id. Đang bay trên trời → thêm cả vùng đất bên dưới.
   · save.sys.mapfog120.flt = trạng thái hàng nút lọc ghim (zonemap.js ghi). Móc test: window.__fog120. */
import { ZONES } from '../world.js';

function sv(ctx) {
  const s = ctx.S.save; s.sys ||= {}; const f = (s.sys.mapfog120 ||= {});
  if (!Array.isArray(f.seen)) {
    const seen = new Set(['village']); const badges = s.badges || [];
    for (const [id, z] of Object.entries(ZONES)) { if (z && typeof z.lv === 'number' && z.lv > 0 && badges.includes(z.lv) && !z.hidden) seen.add(id); }
    for (const id of Object.keys(s.tasks || {})) if (ZONES[id]) seen.add(id);
    if (s.zone && ZONES[s.zone]) seen.add(s.zone);
    f.seen = [...seen]; f.seeded = 1;
  }
  return f;
}
function mark(ctx, id) { if (!id || !ZONES[id]) return false; const f = sv(ctx); if (f.seen.includes(id)) return false; f.seen.push(id); return true; }

export const mapfog120 = {
  id: 'mapfog120',
  always: true,
  onZoneEnter(ctx) {
    const S = ctx.S; if (!S.save || !S.zone) return;
    let ch = mark(ctx, S.zone.id); if (S.map && S.map.sky && S.map.below) ch = mark(ctx, S.map.below) || ch;
    if (ch) { try { ctx.persist(); } catch (e) { } }
    if (typeof window !== 'undefined') window.__fog120 = { seen: () => sv(ctx).seen.slice(), flt: () => ({ ...(sv(ctx).flt || {}) }), set: a => { sv(ctx).seen = a.slice(); ctx.persist(); }, reset: () => { delete ctx.S.save.sys.mapfog120; sv(ctx); ctx.persist(); } };
  },
};
