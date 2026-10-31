// journey.js — plan-44 P1 + P2 + R3 + R4 (2026-10-17): số liệu BỘ SƯU TẬP & HÀNH TRÌNH dùng chung cho menu (thẻ Nhân vật, sổ Nhiệm vụ → Hậu truyện,
// khung "Tổng kết hành trình"). Chỉ ĐỌC save — không ghi gì (thống kê giờ chơi / ngất / quãng đường do systems/stats.js đếm).
import { ZONE_LIST } from './world.js';
import { membersOfLevel, ROSTER, isLeader } from './data.js';
import { LT_IDS, LT_INFO } from './systems/linhthu.js';
import { statsOf } from './systems/stats.js';

/* 6 trùm Khe Nứt (chỗ vào lấy từ systems/index.js + từng file trùm) */
export const BOSSES = [
  { id: 'hacrocky', vi: 'Hắc Rocky', en: 'Shadow Rocky', wvi: 'khe nứt ở Sàn Đấu Ngầm (biển chỉ đường ở Làng)', wen: 'the rift in the Underground Arena (signpost in the Village)' },
  { id: 'trongdong', vi: 'Trống Đồng Thiên Lôi', en: 'Thunder Bronze Drum', wvi: 'khe nứt M2', wen: 'the M2 rift' },
  { id: 'guong', vi: 'Gương Địa Chấn', en: 'Quake Mirror', wvi: 'khe nứt M6', wen: 'the M6 rift' },
  { id: 'hoden', vi: 'Hố Đen Địa Tâm', en: 'Void Devourer', wvi: 'khe nứt M4', wen: 'the M4 rift' },
  { id: 'dongho', vi: 'Đồng Hồ Đứt Dây', en: 'Broken Clock', wvi: 'khe nứt M7', wen: 'the M7 rift' },
  { id: 'bakunawa', vi: 'Ngô Công Lôi Thần', en: 'Thunder Centipede God', wvi: 'Cổng Trời M9 (trên mây)', wen: 'the Sky Gate above M9' },
];
const ZN = { vi: { village: 'Làng', sea: 'Biển' }, en: { village: 'Village', sea: 'Sea' } };
const zname = (z, vi) => (ZN[vi ? 'vi' : 'en'][z] || String(z).toUpperCase());
export const rescued = save => { const st = save.story || {}; return !!(st.rescued || (st.act || 0) >= 4); };
export const ballsHave = save => { const inv = save.inv || {}; let n = 0; for (let i = 1; i <= 7; i++) if ((inv['dball' + i] || 0) > 0) n++; return n; };
export const badgeSet = save => new Set((save.badges || []).filter(b => b >= 1 && b <= 9));

export function collect(save, achIds) {
  const sys = save.sys || {}, met = new Set(save.met || []);
  const inLands = new Set(); for (const z of ZONE_LIST) for (const m of membersOfLevel(z.lv)) inLands.add(m.id);
  let artists = 0; for (const id of inLands) if (met.has(id)) artists++;
  const L = ROSTER.filter(isLeader), leaders = L.filter(m => met.has(m.id)).length;
  const owned = ((sys.linhthu || {}).owned) || {}, lt = LT_IDS.filter(id => owned[id]).length;
  const ach = (achIds || []).filter(a => (save.achievements || []).includes(a)).length;
  const bosses = BOSSES.map(b => ({ ...b, wins: ((sys[b.id] || {}).wins) || 0 }));
  const st = statsOf(save);
  return {
    artists: { n: artists, of: inLands.size }, leaders: { n: leaders, of: L.length || 15 }, linhthu: { n: lt, of: LT_IDS.length },
    balls: { n: ballsHave(save), of: 7 }, badges: { n: badgeSet(save).size, of: 9 }, ach: { n: ach, of: (achIds || []).length },
    bosses: { n: bosses.filter(b => b.wins > 0).length, of: bosses.length, wins: bosses.reduce((a, b) => a + b.wins, 0), list: bosses },
    photos: ((sys.photo || {}).count) || 0, sec: st.sec || 0, faints: st.faints || 0, tiles: Math.round(st.tiles || 0), since: st.since,
    lv: (save.hero && save.hero.lv) || 1,
  };
}
export function fmtTime(sec, vi) { const h = Math.floor(sec / 3600), m = Math.floor(sec % 3600 / 60); return h ? (vi ? `${h} giờ ${m} phút` : `${h} h ${m} min`) : (vi ? `${m} phút` : `${m} min`); }

/* việc kế tiếp sau khi cứu Lyron (hoặc bất cứ lúc nào) — tối đa n dòng, theo thứ tự ưu tiên; dữ liệu thật từ save */
export function nextSteps(save, c, vi, n = 4) {
  const out = [], bs = badgeSet(save);
  if (c.badges.n < 9) { const miss = []; for (let i = 1; i <= 9; i++) if (!bs.has(i)) miss.push('M' + i); out.push(vi ? `🏅 Lấy nốt huy hiệu: ${miss.join(', ')} (gặp nghệ sĩ + xong việc vùng)` : `🏅 Finish the badges: ${miss.join(', ')} (meet artists + land tasks)`); }
  const nb = c.bosses.list.find(b => !b.wins);
  if (nb) out.push(vi ? `⚔ Hạ ${nb.vi} ở ${nb.wvi} (lần đầu chắc chắn rơi 1 Ngọc Rồng)` : `⚔ Defeat ${nb.en} at ${nb.wen} (first win always drops a Dragon Ball)`);
  if (c.balls.n >= 7) out.push(vi ? '🐉 Đủ 7 Ngọc Rồng — mở túi, chọn 1 viên → Gọi Rồng Thần' : '🐉 All 7 Dragon Balls — open the bag, pick one → Summon the Divine Dragon');
  else out.push(vi ? `🐉 Ngọc Rồng ${c.balls.n}/7: đánh lại trùm Khe Nứt (20 %) hoặc thắng bạn tập ở đoạn đèo xa / Sàn Đấu Ngầm` : `🐉 Dragon Balls ${c.balls.n}/7: rematch Rift bosses (20%) or beat sparring partners on far passes / the Underground Arena`);
  if (c.linhthu.n < c.linhthu.of) { const owned = (((save.sys || {}).linhthu || {}).owned) || {}, id = LT_IDS.find(i => !owned[i]), f = LT_INFO(id);
    if (f) out.push(vi ? `🔮 Thu phục ${f.vi} ở ổ ${zname(f.zone, vi)} — đánh cho đuối rồi cho ăn ${f.food}` : `🔮 Befriend the ${f.en} at its ${zname(f.zone, vi)} nest — wear it out, then feed it ${f.foodEn}`); }
  if (c.leaders.n < c.leaders.of) out.push(vi ? `👑 Gặp đủ Leader (${c.leaders.n}/${c.leaders.of}) — Leader có vương miện, đứng ở sân quốc gia` : `👑 Meet every Leader (${c.leaders.n}/${c.leaders.of}) — crowned, in the nation yards`);
  if (c.artists.n < c.artists.of) out.push(vi ? `🎨 Gặp thêm nghệ sĩ (${c.artists.n}/${c.artists.of}) — bấm E nói chuyện, Bia Vinh Danh ở Làng có danh sách` : `🎨 Meet more artists (${c.artists.n}/${c.artists.of}) — press E to talk; the Hall of Fame in the Village lists them`);
  if (c.ach.n < c.ach.of) out.push(vi ? `🏆 Thành tựu ${c.ach.n}/${c.ach.of} — xem Sổ tay (phím C)` : `🏆 Achievements ${c.ach.n}/${c.ach.of} — see the Codex (C)`);
  return out.slice(0, n);
}
