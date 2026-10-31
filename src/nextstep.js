// nextstep.js — plan-44 D3 (= ý Y1 plan-43): dòng "Việc kế tiếp" nhỏ dưới tên vùng.
//   Đọc tiến trình THẬT trong save (đá, kiếm, đèo đã thắng, huy hiệu, nghệ sĩ đã gặp, việc vùng, 3 món cứu Lyron, trùm cuối, Khe Nứt)
//   rồi trả 1 việc chính + (có thể) 1 việc phụ. main.js gọi ~1 lần / giây, ui.js vẽ vào #h-next.
//   Thứ tự chính: kiếm đá → mua Kiếm → qua Đèo 1 → việc vùng M1 (gặp 5 nghệ sĩ) → Đèo 2 → … → M9 (15 Leader) → 3 món cứu Lyron → lặn Hang Ổ Kraken
//   → trùm cuối trên mây M9 → Lyron → sưu tầm (nghệ sĩ, Ngọc Rồng, trùm Khe Nứt). Phụ: Khe Nứt đã đủ điều kiện mà chưa hạ trùm.
import { membersOfLevel, isLeader, ROSTER } from './data.js';
import { ZONES, ROADS } from './world.js';
import { levelFromXp } from './systems/petlv.js';

const SWORD_PRICE = 30;
const ROAD_LV = [0, 2, 3, 5, 6, 8, 10, 12, 14, 16];   /* = road.js ROAD_LV (cấp đề nghị khi tới đoạn i) */
/* Khe Nứt: thành tựu khi hạ trùm · vùng có khe · cấp Rocky cần (theo riftOpen của từng hệ trùm) */
const RIFTS = [
  { ach: 'hacrocky', z: 'arena', lv: 0, rk: 30, vi: 'Khe Nứt dưới Sàn Đấu Ngầm (Hắc Rocky)', en: 'Rift under the Underground Ring (Shadow Rocky)' },
  { ach: 'trongdong', z: 'm2', lv: 2, rk: 30, vi: 'Khe Nứt M2 (Trống Đồng)', en: 'M2 Rift (Bronze Drum)' },
  { ach: 'hoden', z: 'm4', lv: 4, rk: 40, vi: 'Khe Nứt M4 (Hố Đen)', en: 'M4 Rift (Void Devourer)' },
  { ach: 'guong', z: 'm6', lv: 6, rk: 45, vi: 'Khe Nứt M6 (Gương)', en: 'M6 Rift (Mirror Queen)' },
  { ach: 'dongho', z: 'm7', lv: 7, rk: 48, vi: 'Khe Nứt M7 (Đồng Hồ)', en: 'M7 Rift (Clock God)' },
];

function rockyLv(sv) { const p = ((sv.sys || {}).pet || {}).pet; try { return p ? levelFromXp(p.xp || 0).lv : 0; } catch (e) { return 0; } }
function metIn(sv, lv, leaders) { const ids = new Set(sv.met || []); let list = membersOfLevel(lv); if (leaders) list = list.filter(isLeader); return list.filter(m => ids.has(m.id)).length; }
function taskV(sv, zid, id) { const z = (sv.tasks || {})[zid]; return z ? (z[id] || 0) : 0; }

const TASK = {
  vi: { fires: (n, t) => `đốt lửa ${n}/${t}`, ore: (n, t) => `đào quặng ${n}/${t}`, levers: (n, t) => `gạt cần ${n}/${t}`, quiz: () => 'qua bài thi thư viện', obsidian: (n, t) => `nhặt obsidian ${n}/${t}`, elders: (n, t) => `giải đố trưởng lão ${n}/${t}` },
  en: { fires: (n, t) => `campfires ${n}/${t}`, ore: (n, t) => `ore ${n}/${t}`, levers: (n, t) => `levers ${n}/${t}`, quiz: () => 'pass the library exam', obsidian: (n, t) => `obsidian ${n}/${t}`, elders: (n, t) => `elder riddles ${n}/${t}` },
};

/* trả { main, sub } (chuỗi, đã theo ngôn ngữ) hoặc null */
export function nextStep(S, CTX, lg) {
  const sv = S.save; if (!sv || !S.zone || !S.map) return null;
  const vi = lg === 'vi', st = sv.story || {}, zid = S.zone.id, badges = sv.badges || [], ach = sv.achievements || [];
  if (S.bossFight || (CTX.sparRoad && CTX.sparRoad.active && CTX.sparRoad.active())) return null;   /* đang đánh: không làm rối */
  if (st.act === 1 || !st.seaDone) return null;   /* Biển (hồi 1) có dòng mục tiêu riêng của Lyron */
  const ly = (sv.sys || {}).lyron || {}; if (ly.stage === 'meet') return null;   /* main.js storyText đã nói 'Về Làng — có ai đó đợi ở cầu tàu' */
  const road = (sv.sys || {}).road || {}, won = road.won || {}, maxZ = Math.max(road.maxZ || 0, ...badges, 0);
  const sword = CTX.tool ? CTX.tool.tier('sword') : 0, stone = (sv.inv || {}).stone || 0, hlv = CTX.hero ? CTX.hero.lv : 1;
  const touch = CTX.touchA && CTX.touchA();
  const open = i => !!won['road' + i] || maxZ >= i || badges.some(b => b >= i);
  const zName = lv => { const z = ZONES[lv <= 0 ? 'village' : 'm' + lv]; return z ? z.name[vi ? 'vi' : 'en'] : 'M' + lv; };
  const zoneQuest = lv => {
    const z = ZONES['m' + lv], q = z && z.quest; if (!q) return null;
    const n = metIn(sv, lv, q.leaders), parts = [];
    if (n < q.meet) parts.push(q.leaders ? (vi ? `tìm Leader ${n}/${q.meet}` : `find Leaders ${n}/${q.meet}`) : (vi ? `gặp ${n}/${q.meet} nghệ sĩ` : `meet ${n}/${q.meet} artists`));
    for (const t of q.tasks || []) { const v = taskV(sv, 'm' + lv, t.id); if (v < t.n) parts.push(TASK[vi ? 'vi' : 'en'][t.id](Math.min(v, t.n), t.n)); }
    if (!parts.length) parts.push(vi ? 'nhận huy hiệu' : 'claim the badge');
    const here = S.zone.lv === lv && zid === 'm' + lv;
    return (here ? `M${lv}: ` : (vi ? `Tới ${zName(lv)}: ` : `Go to ${zName(lv)}: `)) + parts.join(' · ');
  };
  let main = null;
  /* 1) chuỗi Đèo ↔ huy hiệu: đoạn đèo đầu tiên còn chặn */
  let fr = 0; for (let i = 1; i <= 9; i++) if (!open(i)) { fr = i; break; }
  if (fr) {
    const lower = fr - 1;
    let miss = 0; for (let lv = 1; lv <= lower; lv++) if (!badges.includes(lv)) { miss = lv; break; }   /* huy hiệu thấp nhất còn thiếu trước đoạn đèo này */
    if (miss) main = zoneQuest(miss);
    else if (fr === 1 && sword < 1) {
      main = stone < SWORD_PRICE
        ? (vi ? `Gom ${SWORD_PRICE} 🪨 mua Kiếm (đang có ${stone}): đào mỏ tím · chặt cây bán gỗ · gặp nghệ sĩ` : `Gather ${SWORD_PRICE} 🪨 for a Sword (have ${stone}): mine purple veins · chop & sell wood · meet artists`)
        : (vi ? `Mua Kiếm cấp I: ${touch ? 'Túi → Mua nhanh' : 'bấm O (Mua nhanh)'} · ${SWORD_PRICE} 🪨` : `Buy a Sword tier I: ${touch ? 'Bag → Quick buy' : 'press O (Quick buy)'} · ${SWORD_PRICE} 🪨`);
    } else {
      const R = ROADS[fr - 1], who = (R && R.who) || [], nm = who.map(id => (CTX.sparRoad && CTX.sparRoad.name ? CTX.sparRoad.name(id) : id)).join(vi ? ' rồi ' : ' then '), rec = ROAD_LV[fr];
      main = (vi ? `Qua Đèo ${fr} → M${fr}: thắng ${nm}` : `Cross Pass ${fr} → M${fr}: beat ${nm}`) + (hlv < rec ? (vi ? ` (nên cấp ${rec}, bạn cấp ${hlv})` : ` (aim for Lv ${rec}, you are ${hlv})`) : '');
    }
  }
  /* 2) đủ đèo: huy hiệu còn thiếu theo thứ tự */
  if (!main) for (let lv = 1; lv <= 9; lv++) if (!badges.includes(lv)) { main = zoneQuest(lv); break; }
  /* 3) cứu Lyron */
  if (!main && st.act === 2 && st.items) {
    if (!st.items.divebell) main = vi ? 'Cứu Lyron: rèn Chuông Lặn ở lò nung M4 (4 kính + 3 sắt)' : 'Save Lyron: forge the Diving Bell at the M4 furnace (4 glass + 3 iron)';
    else if (!st.items.trenchmap) main = vi ? 'Cứu Lyron: qua bài thi thư viện M6 rồi xin Bản Đồ Vực' : 'Save Lyron: pass the M6 library exam, then ask for the Trench Map';
    else if (!st.items.greatcrystal) main = vi ? 'Cứu Lyron: gặp đủ 15 Leader ở M9, nhận Đại Pha Lê' : 'Save Lyron: meet all 15 Leaders in M9 for the Great Crystal';
  }
  if (!main && st.act === 3) main = vi ? 'Cứu Lyron: lặn ở vòng xoáy cầu tàu Biển → Hang Ổ Kraken' : 'Save Lyron: dive at the pier whirl of the Sea → Kraken\'s Lair';
  /* 4) trùm cuối + Lyron */
  if (!main && !ach.includes('bakunawa')) main = vi ? 'Trùm cuối: bay lên Cổng Trời trên mây M9 — Ngô Công Lôi Thần' : 'Final boss: fly to the Sky Gate above M9 — the Thunder Centipede';
  if (!main && !ach.includes('lyron') && ly.stage !== 'done') main = vi ? 'Cổng Trời M9: Lyron đang chờ — giành lại Rocky' : 'Sky Gate above M9: Lyron is waiting — win Rocky back';
  /* 5) sau cuối game: sưu tầm */
  if (!main) {
    const balls = (road.balls || []).length, rifts = RIFTS.filter(r => ach.includes(r.ach)).length;
    main = vi ? `Sưu tầm: nghệ sĩ ${(sv.met || []).length}/${ROSTER.length} · Ngọc Rồng ${balls}/7 · trùm Khe Nứt ${rifts}/${RIFTS.length}` : `Collect: artists ${(sv.met || []).length}/${ROSTER.length} · Dragon Balls ${balls}/7 · Rift bosses ${rifts}/${RIFTS.length}`;
  }
  /* phụ: Khe Nứt đủ điều kiện (đã tới vùng, Rocky đủ cấp) mà chưa hạ trùm */
  let sub = null; const rk = rockyLv(sv);
  for (const r of RIFTS) if (!ach.includes(r.ach) && maxZ >= r.lv && rk >= r.rk) { sub = (vi ? 'Phụ: ' : 'Side: ') + r[vi ? 'vi' : 'en']; break; }
  return { main, sub };
}
