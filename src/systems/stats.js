// stats.js — plan-44 P2 (2026-10-17): THỐNG KÊ CHƠI cho thẻ Nhân vật + "Tổng kết hành trình".
//  · save.stats = { v, sec, faints, tiles, since } — sec: giây chơi (chỉ đếm khi tab đang hiện), faints: số lần ngất (mode 'faint' bật lên),
//    tiles: quãng đường đi (ô, đo theo vị trí người chơi, bỏ qua bước nhảy > 3 ô = dịch chuyển / đổi vùng), since: ngày bắt đầu đếm (save cũ: lúc nạp bản này).
//  · Các số khác (trùm đã hạ, nghệ sĩ đã gặp, ảnh chụp, linh thú, Ngọc Rồng…) TÍNH TỪ save sẵn có (src/journey.js) — không đếm trùng.
//  · Save cũ không có save.stats → tạo mới khi vào vùng đầu tiên. Lưu cùng ctx.persist() của game (+ tự persist mỗi 60 s).
export function statsOf(save) {
  const s = (save.stats && typeof save.stats === 'object') ? save.stats : (save.stats = {});
  if (s.v !== 1) { s.v = 1; s.sec = +s.sec || 0; s.faints = +s.faints || 0; s.tiles = +s.tiles || 0; s.since = s.since || Date.now(); }
  return s;
}
const ST = { last: null, mode: null, saveT: 0 };
export const stats = {
  id: 'stats', always: true,   /* chạy cả ở vùng giới hạn hệ (trùm, khe nứt…) */
  onZoneEnter(ctx) { statsOf(ctx.S.save); ST.last = null; },
  update(dt, ctx) {
    const S = ctx.S; if (!S.save || !S.player) return;
    const s = statsOf(S.save), vis = typeof document === 'undefined' || document.visibilityState !== 'hidden';
    if (vis && dt > 0 && dt < 1) s.sec += dt;
    const m = S.mode; if (m === 'faint' && ST.mode !== 'faint') s.faints++; ST.mode = m;
    const p = S.player; if (ST.last) { const d = Math.hypot(p.x - ST.last.x, p.y - ST.last.y) / 16; if (d < 3) s.tiles += d; } ST.last = { x: p.x, y: p.y };
    ST.saveT += dt; if (ST.saveT > 60) { ST.saveT = 0; if (m === 'play') ctx.persist(); }
    if (typeof window !== 'undefined' && !window.__stats) window.__stats = { get: () => ({ ...statsOf(ctx.S.save) }) };
  },
};
