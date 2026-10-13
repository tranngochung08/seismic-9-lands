// presets.js — 2026-10-10 anh yêu cầu: "điểm lưu sẵn" để CHƠI THẬT từ giữa game (không kịch bản tự chạy).
//   ?preset=<tên>         mở game ở mốc đó, ô lưu RIÊNG 'seismic9.test.<tên>' (save thật không bị đụng); chơi tiếp, tải lại vẫn còn tiến độ
//   ?preset=<tên>&reset   dựng lại mốc từ đầu
// Mỗi mốc = save dựng từ defaultSave() + vài bước chạy 1 lần sau khi vào vùng (cấp đồ, cấp đất…).
import { useSlot, loadSave, clearSave } from './save.js';
import { xpForLevel, maxHpOf } from './systems/petlv.js';   /* plan-27: preset Rocky cấp cao */

const wait = ms => new Promise(r => setTimeout(r, ms));
const TOOLS = ['axe', 'pickaxe', 'shovel', 'rod', 'sword', 'scythe', 'knife', 'torch'];   /* bỏ thòng lọng + bẫy 2026-10-11 */
const ROCKY = () => ({ pet: { name: 'Rocky', hunger: 100, bond: 5, born: Date.now() } });
const STORY = path => ({ act: 2, step: 127, seaDone: true, keepsake: true, flashback: false, guideStoryTold: true, ...(path ? { path } : {}) });
function kit(C, stones, extra = {}) {   /* đồ nghề cơ bản: đủ công cụ cấp 1, đá, hạt, bùi nhùi */
  for (const id of TOOLS) if (!C.tool.tier(id)) C.tool.set(id, extra[id] || 1);
  C.bag.add('stone', stones);
  for (const id of Object.keys(C.ITEMS)) if (id.startsWith('seed_')) { C.bag.add(id, 5); break; }
  C.bag.add('revive', 1);
}

export const PRESETS = {
  moi: { vi: 'Ván mới từ đầu', en: 'Brand-new game', desc: 'Ván mới hoàn toàn: chọn tên + quốc gia, trôi trên ván, gặp Lyron và Rocky, cảnh Kraken, lên bến, chọn phe.',
    save: d => ({ ...d }) },
  ben: { vi: 'Vừa lên bến — chọn phe', en: 'Just landed — pick a side', desc: 'Lyron vừa hóa đá. Bạn và Rocky đã lên bến, bảng chọn phe Noxx / Xealist hiện ra.',
    save: d => ({ ...d, name: 'Hùng', nation: 'Vietnamese', zone: 'sea', entry: 'default', story: { ...STORY(null), keepsake: false }, sys: { pet: ROCKY() } }) },
  noxx: { vi: 'Phe Noxx — chưa có đất', en: 'Noxx — no land yet', desc: 'Phe Noxx ở Làng, 300 đá, đủ công cụ. Đi tìm Leader (có vương miện) ở M2 hoặc vùng khác để mua đất.',
    save: d => ({ ...d, name: 'Hùng', nation: 'Vietnamese', zone: 'village', story: STORY('noxx'), sys: { pet: ROCKY() } }),
    after: async C => { kit(C, 300); } },
  dat: { vi: 'Phe Noxx — đã có đất M2', en: 'Noxx — owns land in M2', desc: 'Đã mua 1 mảnh 6×6 ở M2 (cọc đỏ + biển tên). Thử cày, gieo, đào ao, thả cá, phá đồ trên đất.',
    save: d => ({ ...d, name: 'Hùng', nation: 'Vietnamese', zone: 'm2', story: STORY('noxx'), sys: { pet: ROCKY() } }),
    after: async C => { kit(C, 200); await wait(800); const l = window.__land && window.__land.grant(); if (l) { const p = C.S.player; p.x = (l.x + 3) * 16; p.y = (l.y + 3) * 16 + 14; p.dir = 0;   /* đứng giữa mảnh đất */ } } },
  xea: { vi: 'Phe Xealist — đang giả vờ', en: 'Xealist — undercover', desc: 'Phe Xealist, Bóng tối 40, nghi ngờ 1/3, đang làm dở nhiệm vụ móc túi (1/2). Xealist đứng gần lối vào Làng.',
    save: d => ({ ...d, name: 'Hùng', nation: 'Vietnamese', zone: 'village', story: STORY('xealist'), sys: { pet: ROCKY() },
      dark: { pts: 40, sus: 1, quest: { type: 'steal', need: 2, got: 1 }, done: 2, revealed: false, broken: {} } }),
    after: async C => { kit(C, 80); } },
  lomat: { vi: 'Xealist đã lộ mặt — sắp kết', en: 'Xealist unmasked — near the end', desc: 'Đã lộ mặt, 8 bia đã vỡ (M1–M8). Bạn đứng ở M9: đập bia cuối (cầm kiếm, E ×5) để xem màn kết.',
    save: d => ({ ...d, name: 'Hùng', nation: 'Vietnamese', zone: 'm9', story: STORY('xealist'), sys: { pet: ROCKY() }, badges: [1, 2, 3, 4, 5, 6, 7, 8],
      dark: { pts: 160, sus: 3, quest: null, done: 8, revealed: true, broken: { m1: 0, m2: 0, m3: 0, m4: 0, m5: 0, m6: 0, m7: 0, m8: 0 } } }),
    after: async C => { kit(C, 500, { sword: 4 }); C.hold && C.hold('sword'); } },
  nuoc: { vi: 'Dưới nước — ở điểm lặn', en: 'Underwater — at the dive point', desc: 'Phe Noxx, 120 đá, đủ công cụ (kiếm cấp 1), 2 viên thở nhỏ trên thanh. Đứng trên cầu tàu cạnh vòng xoáy lặn ở Biển (E để lặn xuống Rạn San Hô Nông); Heathcliff ở chân cầu tàu bán thêm viên thở.',
    save: d => ({ ...d, name: 'Hùng', nation: 'Vietnamese', zone: 'sea', entry: 'whirl', story: STORY('noxx'), sys: { pet: ROCKY() } }),
    after: async C => { kit(C, 120); C.bag.add('pill_s', 2); if (C.hold) C.hold('sword'); if (C.hotbarPut) C.hotbarPut(1, 'pill_s'); } },   /* plan-26 B0 — hold() trước: nó dựng thanh công cụ (hotbarPut không tự dựng → lỗi lúc máy chậm) */
  /* plan-26 B1: đứng ngay lối vào từng tầng nước, cấp + kiếm hợp tầng, đã có hơi thở + viên thở; các tầng trên đã qua (lặn thẳng xuống được) */
  nuoc2: { vi: 'Tầng nước 2 — Rừng Tảo Bẹ', en: 'Water layer 2 — Kelp Forest', desc: 'Cấp 8, kiếm cấp 2, 150 giây thở + 2 viên lớn. Đứng ở lối vào Rừng Tảo Bẹ (đã hạ Cua Hoàng Đế). Tảo cao che người và Lươn Điện; Lươn Mẹ canh cổng xoáy xuống tầng 3.',
    save: d => ({ ...d, name: 'Hùng', nation: 'Vietnamese', zone: 'u2', entry: 'default', story: STORY('noxx'), hero: { lv: 8, xp: 0, hp: null }, sys: { pet: ROCKY(), underwater: { breath: 150, met: true, reached: ['u1', 'u2'], gates: { u1: true } } } }),
    after: async C => { kit(C, 200, { sword: 2 }); C.bag.add('pill_l', 2); if (C.hold) C.hold('sword'); if (C.hotbarPut) C.hotbarPut(1, 'pill_l'); } },
  nuoc3: { vi: 'Tầng nước 3 — Nghĩa Địa Tàu Đắm', en: 'Water layer 3 — Shipwreck Graveyard', desc: 'Cấp 12, kiếm cấp 3, 150 giây thở + 2 viên lớn. Đứng ở lối vào mê cung xác tàu (đã qua tầng 1–2). Dòng chảy đẩy người, Mực Ma phun mực; Cá Mập Bọc Giáp canh cổng — dụ nó húc vào xác tàu.',
    save: d => ({ ...d, name: 'Hùng', nation: 'Vietnamese', zone: 'u3', entry: 'default', story: STORY('noxx'), hero: { lv: 12, xp: 0, hp: null }, sys: { pet: ROCKY(), underwater: { breath: 150, met: true, reached: ['u1', 'u2', 'u3'], gates: { u1: true, u2: true } } } }),
    after: async C => { kit(C, 300, { sword: 3 }); C.bag.add('pill_l', 2); if (C.hold) C.hold('sword'); if (C.hotbarPut) C.hotbarPut(1, 'pill_l'); } },
  nuoc4: { vi: 'Tầng nước 4 — Hang Phát Sáng', en: 'Water layer 4 — Glowing Cave', desc: 'Cấp 16, kiếm cấp 4, 150 giây thở + 3 viên lớn. Đứng ở lối vào hang tối (đã qua tầng 1–3). Chỉ sáng quanh người + pha lê; Cá Đèn Lồng dụ bằng ánh sáng; Rắn Biển Khổng Lồ canh cổng cuối (đánh vào đầu).',
    save: d => ({ ...d, name: 'Hùng', nation: 'Vietnamese', zone: 'u4', entry: 'default', story: STORY('noxx'), hero: { lv: 16, xp: 0, hp: null }, sys: { pet: ROCKY(), underwater: { breath: 150, met: true, reached: ['u1', 'u2', 'u3', 'u4'], gates: { u1: true, u2: true, u3: true } } } }),
    after: async C => { kit(C, 400, { sword: 4 }); C.bag.add('pill_l', 3); if (C.hold) C.hold('sword'); if (C.hotbarPut) C.hotbarPut(1, 'pill_l'); } },
  /* plan-26 B2: Vực Kraken · Hang Ổ (trùm giữa) + Pháo Đài Xealist (trùm cuối phe Noxx / căn cứ phe Xealist) */
  nuoc5: { vi: 'Vực Kraken · Hang Ổ', en: "Kraken's Lair", desc: 'Cấp 18, kiếm cấp 4, 300 giây thở + 3 viên lớn. Đứng ở lối vào hang ổ Kraken (đã qua tầng 1–4). Kraken trồi từ khe vực phía trên, 3 pha: xúc tu đập chỗ đất nứt rồi KẸT (chém xúc tu) · < 66 % gầm, phun mực, quét ngang cả hàng · < 33 % gọi cá mập, xúc tu túm người (bấm E vùng ra, Rocky cắn giúp), đá rơi. Hạ nó → cổng xoáy tới Pháo Đài Xealist.',
    save: d => ({ ...d, name: 'Hùng', nation: 'Vietnamese', zone: 'kraken', entry: 'default', story: STORY('noxx'), hero: { lv: 18, xp: 0, hp: null }, sys: { pet: ROCKY(), underwater: { breath: 300, met: true, reached: ['u1', 'u2', 'u3', 'u4', 'kraken'], gates: { u1: true, u2: true, u3: true, u4: true } } } }),
    after: async C => { kit(C, 500, { sword: 4 }); C.bag.add('pill_l', 3); if (C.hold) C.hold('sword'); if (C.hotbarPut) C.hotbarPut(1, 'pill_l'); } },
  phaodai: { vi: 'Pháo Đài Xealist — trùm cuối (phe Noxx)', en: "Xealist's Fortress — final boss (Noxx)", desc: 'Cấp 19, kiếm cấp 5, 300 giây thở + 3 viên lớn, Rocky theo cùng. Đứng ở sảnh Pháo Đài (đã hạ Kraken). Xealist 3 pha: tia hóa đá (Rocky ở gần thì đập vỡ đá cho bạn) · gọi Bóng Tối + xúc tu Kraken · dưới 30 % pha lê hồng bừng sáng, tia bắn vòng tròn. Thắng → Lyron thoát đá.',
    save: d => ({ ...d, name: 'Hùng', nation: 'Vietnamese', zone: 'xfort', entry: 'default', story: STORY('noxx'), hero: { lv: 19, xp: 0, hp: null }, sys: { pet: ROCKY(), underwater: { breath: 300, met: true, reached: ['u1', 'u2', 'u3', 'u4', 'kraken', 'xfort'], gates: { u1: true, u2: true, u3: true, u4: true, kraken: true } } } }),
    after: async C => { kit(C, 600, { sword: 5 }); C.bag.add('pill_l', 3); if (C.hold) C.hold('sword'); if (C.hotbarPut) C.hotbarPut(1, 'pill_l'); } },
  phaodaixea: { vi: 'Pháo Đài Xealist — phe Xealist', en: "Xealist's Fortress — Xealist side", desc: 'Phe Xealist, cấp 19. Pháo Đài là căn cứ an toàn: không trùm, không quái. Xealist đứng trước ngai — lại gần nói chuyện (E).',
    save: d => ({ ...d, name: 'Hùng', nation: 'Vietnamese', zone: 'xfort', entry: 'default', story: STORY('xealist'), hero: { lv: 19, xp: 0, hp: null }, sys: { pet: ROCKY(), underwater: { breath: 300, met: true, reached: ['u1', 'u2', 'u3', 'u4', 'kraken', 'xfort'], gates: { u1: true, u2: true, u3: true, u4: true, kraken: true } } },
      dark: { pts: 120, sus: 0, quest: null, done: 6, revealed: false, broken: {} } }),
    after: async C => { kit(C, 300, { sword: 5 }); C.bag.add('pill_l', 2); if (C.hold) C.hold('sword'); } },
  /* 2026-10-11: Súng Hóa Đá (systems/petgun.js) */
  sung: { vi: 'Phe Xealist — Súng Hóa Đá', en: 'Xealist — Petrify Gun', desc: 'Phe Xealist ở Làng, cấp 1 (sức súng 50), đang cầm Súng Hóa Đá. Cạnh bạn: 1 Nhầy Mầm (yếu → hóa đá vĩnh viễn rồi vỡ ra đồ) và 1 Cua Trộm (mạnh → chỉ đứng hình ~2,5 s), dân làng gần đó. E / click để bắn (hồi 2 s).',
    save: d => ({ ...d, name: 'Hùng', nation: 'Vietnamese', zone: 'village', story: STORY('xealist'), sys: { pet: ROCKY() },
      dark: { pts: 20, sus: 0, quest: { type: 'petrify', need: 1, got: 0 }, done: 2, revealed: false, broken: {} } }),
    after: async C => {
      kit(C, 100); for (let i = 0; i < 20 && !C.bag.has('petgun', 1); i++) await wait(150);
      if (C.hold) C.hold('petgun');
      const p = C.S.player, v = C.villagers && C.villagers.alive().find(n => !C.villagers.immune(n));
      if (v) { p.x = v.x - 40; p.y = v.y; p.dir = 2; }
      if (window.__monsters) { window.__monsters.spawnKind('slime', 0, 40); window.__monsters.spawnKind('crab', 0, -40); }
    } },
  /* 2026-10-11: bạn tập (systems/spar.js) */
  vuong: { vi: 'Đấu Ngưu Ma Vương', en: 'Fight the Bull Demon King', desc: 'Sàn Đấu Ngầm, đứng cạnh Xealist, cấp 12, kiếm cấp 3, đã mở thử thách Ngưu Ma Vương (dạng Tối thượng của Sừng Bò: vẽ đúng cỡ thật, húc liên hoàn 3 lần, Thiên Thạch Dậm). E cạnh Xealist → Gọi bạn tập → chọn Ngưu Ma Vương. Mở sẵn cả 11 bạn tập: hạ hết máu lần 1 → Trung cấp, lần 2 → Cao cấp (tuyệt chiêu khắp sàn), lần 3 mới thắng.',
    save: d => ({ ...d, name: 'Hùng', nation: 'Vietnamese', zone: 'arena', entry: 'default', story: STORY('noxx'), hero: { lv: 12, xp: 0, hp: null }, sys: { pet: ROCKY(), spar: { unlocked: 11, rec: {}, trained: [], kings: { sungbo: true } } } }),
    after: async C => { kit(C, 300, { sword: 3 }); C.bag.add('pill_l', 3); if (C.hold) C.hold('sword'); if (C.hotbarPut) C.hotbarPut(1, 'pill_l'); } },
  tap: { vi: 'Gọi bạn tập ở Sàn Đấu Ngầm', en: 'Sparring in the Underground Ring', desc: 'Phe Noxx ở Sàn Đấu Ngầm (lối hầm phía đông Làng), đứng cạnh Xealist, cấp 6, kiếm cấp 2. Bản duyệt: Ca Rô (mũ ca rô, đòn Bàn Cờ — 3 ô đất rung lần lượt) + Đầu Vuông (Giáng Khối Vuông — nhảy tới giáng xuống vùng đã báo, hất tung) + Sừng Bò (Húc Sừng Bò — báo làn, húc thẳng; húc trượt vào tường/mép vòng thì choáng) + Mào Gà (Gà Gáy — nón sóng âm đẩy văng + làm chậm, đứng sát thì quét tay) + Tóc Bát Úp (Ôm Quật — tóm nhấc bổng quật ra sau, bấm E liên tục để vùng ra) + Ria Trâu (Quất Ria — ria sừng trâu quất thẳng ~4 ô, quất xong ria rối) + Bông Gòn (Sóng Bông — bật nhảy dậm, mái afro tỏa sóng vòng; đứng sát chân hoặc ra xa để né) + Ông Bịt Tai (Mổ Cổ Dài — cổ dài vươn mổ xa ~5 ô theo làn báo, mổ xong mỏi cổ) + Cằm Búa (Hất Cằm — vòng đỏ trước mặt, hất cằm búa tung người chơi lên cao văng xa; hụt thì chúi người) + Lực Sĩ Kính Đen (Ném Tạ — 2 vòng đỏ báo chỗ tạ rơi, tạ bay vòng cung rơi xuống hất tung) + Biker Kính Đen (Phóng Xế — làn đỏ dài, phóng một mạch rồi quay đầu phóng lại), 28 người khác "Sắp có". Mỗi người (trừ Sừng Bò đã có riêng) có 2 dạng BIẾN HÌNH: hạ hết máu lần 1 → Trung cấp (đòn đặc trưng ×2 + đòn mới), lần 2 → Cao cấp (vệt lửa + TUYỆT CHIÊU khắp sàn, màn tối sầm); hạ lần 3 mới thắng. Đứng ngay cạnh Xealist: E → "Gọi bạn tập" → chọn người. Không mất đồ, không ngất (còn 1 máu = chịu thua); ra khỏi vòng sàn tập là kết thúc.',
    save: d => ({ ...d, name: 'Hùng', nation: 'Vietnamese', zone: 'arena', entry: 'default', story: STORY('noxx'), hero: { lv: 6, xp: 0, hp: null }, sys: { pet: ROCKY(), spar: { unlocked: 11, rec: {}, trained: [] } } }),   /* mở sẵn 6 bạn tập để thử (game thật: thắng người trước mới mở người sau) */
    after: async C => { kit(C, 150, { sword: 2 }); if (C.hold) C.hold('sword'); for (let i = 0; i < 30 && !(window.__xea && window.__xea.npc()); i++) await wait(150); const x = window.__xea && window.__xea.npc(); if (x) { const p = C.S.player; p.x = x.x; p.y = x.y + 16; p.dir = 3; } } },
  /* plan-28: đường đèo — đứng ở CHÂN đèo, cổng còn đóng (chưa thắng), cấp hợp đoạn */
  duong: { vi: 'Đèo M3 → M4 — Tóc Bát Úp chặn đường', en: 'Pass M3 → M4 — Bowl Cut blocks the way', desc: 'Chân đèo M3 → M4 (rừng nứt), cấp 6, kiếm cấp 2, có Rocky. Đi lên: 5 Sói Bóng (mạnh hơn ở M3, chết hồi sinh sau 10 s). Giữa đèo Tóc Bát Úp đứng chắn cổng — bước vào sân là đấu (tới Trung cấp: hạ 2 lần). Thua → về chân đèo, hồi máu. Thắng → cổng mở, rơi đồ (có cơ hội Ngọc Rồng); hắn quay lại bên lề sau 1 phút để đấu tiếp kiếm đồ.',
    save: d => ({ ...d, name: 'Hùng', nation: 'Vietnamese', zone: 'road4', entry: 'default', story: STORY('noxx'), badges: [1, 2, 3], hero: { lv: 6, xp: 0, hp: null }, sys: { pet: ROCKY(), road: { maxZ: 3 } } }),
    after: async C => { kit(C, 150, { sword: 2 }); C.bag.add('pill_hp', 2); if (C.hold) C.hold('sword'); } },
  duongall: { vi: 'Thử hết 9 đèo — từ Làng lên M9', en: 'All 9 passes — Village to M9', desc: 'Đứng ở chân đèo đầu tiên (Làng → M1), cấp 25, kiếm cấp 4, Rocky cấp 40 (Đấm/Rocky-ha bậc 5, Siêu Cấp bậc 3), đủ huy hiệu để qua các vùng. Chế độ thử: mọi đèo đều còn chặn, phải thắng bạn tập mới qua. Đi hết đèo → vào vùng → theo đường Bắc lên đèo kế: Ca Rô → Đầu Vuông → Mào Gà → Bát Úp → Ria Trâu → Bông Gòn → Bịt Tai → Cằm Búa → Lực Sĩ + Biker.',
    save: d => ({ ...d, name: 'Hùng', nation: 'Vietnamese', zone: 'road1', entry: 'default', story: STORY('noxx'), badges: [1, 2, 3, 4, 5, 6, 7, 8], hero: { lv: 25, xp: 0, hp: null }, sys: { pet: { pet: { name: 'Rocky', hunger: 100, bond: 30, born: Date.now(), xp: xpForLevel(40), hp: maxHpOf(40), cmd: 'protect', skills: { punch: 5, ha: 5, super: 3 }, lvMig: 1 } }, road: { maxZ: 0, tour: true } } }),   /* anh 2026-10-12: buff — người cấp 25, Rocky cấp 40 */
    after: async C => { kit(C, 400, { sword: 4 }); C.bag.add('pill_hp', 12); if (C.hold) C.hold('sword'); } },
  duong9: { vi: 'Đèo M8 → M9 — Lực Sĩ rồi Biker', en: 'Pass M8 → M9 — Shades Hulk, then Biker', desc: 'Chân đèo cuối (đá tuyết M8), cấp 16, kiếm cấp 4. 6 Sói Tuyết trên đường. Giữa đèo 2 bạn tập đánh LẦN LƯỢT: Lực Sĩ Kính Đen rồi Biker Kính Đen (tới Cao cấp: hạ 3 lần, có tuyệt chiêu). Thắng cả hai mới mở cổng lên M9; tỷ lệ Ngọc Rồng cao nhất (35 %, Cao cấp ×1,5).',
    save: d => ({ ...d, name: 'Hùng', nation: 'Vietnamese', zone: 'road9', entry: 'default', story: STORY('noxx'), badges: [1, 2, 3, 4, 5, 6, 7, 8], hero: { lv: 16, xp: 0, hp: null }, sys: { pet: ROCKY(), road: { maxZ: 8 } } }),
    after: async C => { kit(C, 400, { sword: 4 }); C.bag.add('pill_hp', 4); if (C.hold) C.hold('sword'); } },
  /* plan-29: Rồng Thần */
  rong: { vi: 'Đủ 7 Ngọc Rồng — gọi Rồng Thần', en: 'All 7 Dragon Balls — summon the Divine Dragon', desc: 'Ở Làng ban ngày, cấp 15, kiếm cấp 3, Rocky cấp 20, 500 đá; trong túi đủ 7 viên Ngọc Rồng (7 sao → 1 sao). Mở túi (B) → chọn 1 viên Ngọc Rồng → nút "Gọi Rồng Thần"; hoặc Enter (điện thoại: 💬) gõ "goi rong". Trời tối, mưa sấm, Rồng Thần hiện lên → chọn 1 trong 5 điều ước (phím 1–5 hoặc chạm). Ước xong ngọc bay tản, rơi lại từ 7 sao.',
    save: d => ({ ...d, name: 'Hùng', nation: 'Vietnamese', zone: 'village', story: STORY('noxx'), badges: [1, 2, 3], hero: { lv: 15, xp: 0, hp: null }, sys: { pet: { pet: { name: 'Rocky', hunger: 100, bond: 20, born: Date.now(), xp: xpForLevel(20), hp: maxHpOf(20), cmd: 'protect', skills: { punch: 3, ha: 1, super: 0 }, lvMig: 1 } }, road: { maxZ: 3, balls: [7, 6, 5, 4, 3, 2, 1] } } }),
    after: async C => { kit(C, 500, { sword: 3 }); for (let n = 1; n <= 7; n++) C.bag.add('dball' + n, 1); C.bag.add('pill_hp', 3); if (C.clock && C.clock.set) C.clock.set({ hour: 10, minute: 0 }); if (C.hold) C.hold('sword'); } },
  /* 2026-10-13 anh: link có 5 bộ Ngọc Rồng */
  rong5: { vi: '5 bộ Ngọc Rồng — gọi Rồng Thần 5 lần', en: '5 sets of Dragon Balls — summon 5 times', desc: 'Ở Làng ban ngày, cấp 15, kiếm cấp 3, Rocky cấp 20, 500 đá; trong túi đủ 7 viên Ngọc Rồng (7 sao → 1 sao). Mở túi (B) → chọn 1 viên Ngọc Rồng → nút "Gọi Rồng Thần"; hoặc Enter (điện thoại: 💬) gõ "goi rong". Trời tối, mưa sấm, Rồng Thần hiện lên → chọn 1 trong 5 điều ước (phím 1–5 hoặc chạm). Ước xong ngọc bay tản, rơi lại từ 7 sao.',
    save: d => ({ ...d, name: 'Hùng', nation: 'Vietnamese', zone: 'village', story: STORY('noxx'), badges: [1, 2, 3], hero: { lv: 15, xp: 0, hp: null }, sys: { pet: { pet: { name: 'Rocky', hunger: 100, bond: 20, born: Date.now(), xp: xpForLevel(20), hp: maxHpOf(20), cmd: 'protect', skills: { punch: 3, ha: 1, super: 0 }, lvMig: 1 } }, road: { maxZ: 3, balls: [7, 6, 5, 4, 3, 2, 1] } } }),
    after: async C => { kit(C, 500, { sword: 3 }); for (let n = 1; n <= 7; n++) C.bag.add('dball' + n, 5); C.bag.add('pill_hp', 3); if (C.clock && C.clock.set) C.clock.set({ hour: 10, minute: 0 }); if (C.hold) C.hold('sword'); } },
  chad: { vi: 'Ngoại hình Chad — vừa mặc (áo polo)', en: 'Chad look — just put on (polo)', desc: 'Đã ước "Đẹp trai nhất vũ trụ" và đang mặc ngoại hình Chad ở Làng: 30 giây đầu mặc áo polo; hết 30 giây (hoặc làm bất kỳ động tác nào: chặt, đào, đánh…) thì xé áo khoe cơ rồi dùng thân cơ bắp. Túi đồ (B) → thẻ Nhân vật → mục Ngoại hình để mặc / bỏ. Có đủ dụng cụ, cấp 10.',
    save: d => ({ ...d, name: 'Hùng', nation: 'Vietnamese', zone: 'village', story: STORY('noxx'), hero: { lv: 10, xp: 0, hp: null }, sys: { pet: ROCKY(), dragon: { got: { chad: true }, treasure: 0, summons: 1, chad: { owned: true, worn: true, ripped: false, poloT: 0 } } } }),
    after: async C => { kit(C, 200, { sword: 2 }); if (C.clock && C.clock.set) C.clock.set({ hour: 10, minute: 0 }); } },
  /* plan-27: Rocky có cấp / chiêu / lệnh chat */
  rocky: { vi: 'Rocky cấp 19 — đánh quái, ra lệnh, mua sách', en: 'Rocky Lv 19 — fights, chat commands, books', desc: 'Phe Noxx ở Làng ban ngày, cấp 10, kiếm cấp 2, 3000 đá. Rocky cấp 19 (sắp mở Rocky-ha ở cấp 20), lệnh Bảo vệ; khi được đánh Rocky luôn dùng chiêu mạnh nhất đã hồi (Siêu Cấp → Rocky-ha → Đấm). Cạnh bạn có 3 quái. Nút Rocky trên thanh công cụ / phím / (điện thoại: nút 💬) mở ô chat: gõ "tan cong" / "bao ve" / "di theo" / "ve nha". Túi đồ (B) → thẻ Rocky xem chỉ số. Sách luyện Rocky: ra Biển gặp Heathcliff ở chân cầu tàu.',
    save: d => ({ ...d, name: 'Hùng', nation: 'Vietnamese', zone: 'village', story: STORY('noxx'), hero: { lv: 10, xp: 0, hp: null }, sys: { pet: { pet: { name: 'Rocky', hunger: 100, bond: 12, born: Date.now(), xp: xpForLevel(19), hp: maxHpOf(19), cmd: 'protect', skills: { punch: 1, ha: 0, super: 0 }, lvMig: 1 } } } }),
    after: async C => { kit(C, 3000, { sword: 2 }); if (C.hold) C.hold('sword'); if (C.clock && C.clock.set) C.clock.set({ hour: 9, minute: 0 }); await wait(400); if (window.__monsters) { window.__monsters.spawnKind('slime', 70, 0); window.__monsters.spawnKind('slime', 100, 10); window.__monsters.spawnKind('slime', -80, 20); } } },
  /* plan-30 trùm 1: Hắc Rocky — người cấp 30 kiếm 4, Rocky cấp 35 (Đấm 5 · Rocky-ha 4, độ thân 15 → Xích kéo Rocky đổi phe), đã thắng đèo road1; đứng cạnh khe nứt vách Bắc Sàn Đấu Ngầm */
  hacrocky: { vi: 'Hắc Rocky — đứng cạnh khe nứt', en: 'Shadow Rocky — at the rift', desc: 'Sàn Đấu Ngầm, ngay dưới Khe Nứt Magnitude (vách Bắc). Người cấp 30, kiếm cấp 4, 10 viên hồi máu, 20 quả mọng (cho Rocky ăn khi bị Xích Tình Bạn kéo sang phe địch). Rocky cấp 35 (Đấm 5, Rocky-ha 4), độ thân 15. Đã thắng đèo Làng → M1. Bấm E ở khe nứt để vào đánh Hắc Rocky.',
    save: d => ({ ...d, name: 'Hùng', nation: 'Vietnamese', zone: 'arena', entry: 'rift', story: STORY('noxx'), badges: [1, 2, 3], hero: { lv: 30, xp: 0, hp: null },
      sys: { pet: { pet: { name: 'Rocky', hunger: 100, bond: 15, born: Date.now(), xp: xpForLevel(35), hp: maxHpOf(35), cmd: 'protect', skills: { punch: 5, ha: 4, super: 0 }, lvMig: 1 } }, road: { maxZ: 3, won: { road1: true, road2: true, road3: true } } } }),
    after: async C => { kit(C, 300, { sword: 4 }); C.bag.add('pill_hp', 10); C.bag.add('berry', 20); if (C.hold) C.hold('sword'); } },
  hacrocky_fight: { vi: 'Hắc Rocky — vào thẳng trận', en: 'Shadow Rocky — straight into the fight', desc: 'Như "Hắc Rocky — đứng cạnh khe nứt" nhưng vào thẳng Khe Nứt: Hắc Rocky trồi lên ngay.',
    save: d => ({ ...d, name: 'Hùng', nation: 'Vietnamese', zone: 'rift1', entry: 'default', story: STORY('noxx'), badges: [1, 2, 3], hero: { lv: 30, xp: 0, hp: null },
      sys: { pet: { pet: { name: 'Rocky', hunger: 100, bond: 15, born: Date.now(), xp: xpForLevel(35), hp: maxHpOf(35), cmd: 'protect', skills: { punch: 5, ha: 4, super: 0 }, lvMig: 1 } }, road: { maxZ: 3, won: { road1: true, road2: true, road3: true } } } }),
    after: async C => { kit(C, 300, { sword: 4 }); C.bag.add('pill_hp', 10); C.bag.add('berry', 20); if (C.hold) C.hold('sword'); } },
  /* plan-30 trùm 2: Trống Đồng Thiên Lôi — người cấp 32 kiếm 4, Rocky cấp 38 (Đấm 5 · Rocky-ha 4 · Siêu Cấp 1), đã qua đèo road1–3; đứng cạnh khe nứt M2 */
  trongdong: { vi: 'Trống Đồng — đứng cạnh khe nứt (M2)', en: 'Bronze Drum — at the rift (M2)', desc: 'M2 Làng Rung Khẽ, ngay dưới Khe Nứt Magnitude phía Đông quảng trường. Người cấp 32, kiếm cấp 4, 10 viên hồi máu. Rocky cấp 38 (Đấm 5, Rocky-ha 4, Siêu Cấp 1). Đã qua đèo tới M2. Bấm E ở khe nứt để vào đánh Trống Đồng Thiên Lôi. Mẹo: đánh mép trống đúng lúc ánh sáng tới dấu ‹•› trên thanh nhịp.',
    save: d => ({ ...d, name: 'Hùng', nation: 'Vietnamese', zone: 'm2', entry: 'rift', story: STORY('noxx'), badges: [1, 2, 3], hero: { lv: 32, xp: 0, hp: null },
      sys: { pet: { pet: { name: 'Rocky', hunger: 100, bond: 25, born: Date.now(), xp: xpForLevel(38), hp: maxHpOf(38), cmd: 'protect', skills: { punch: 5, ha: 4, super: 1 }, lvMig: 1 } }, road: { maxZ: 3, won: { road1: true, road2: true, road3: true } } } }),
    after: async C => { kit(C, 300, { sword: 4 }); C.bag.add('pill_hp', 10); C.bag.add('berry', 20); if (C.hold) C.hold('sword'); } },
  trongdong_fight: { vi: 'Trống Đồng — vào thẳng trận', en: 'Bronze Drum — straight into the fight', desc: 'Như "Trống Đồng — đứng cạnh khe nứt" nhưng vào thẳng Khe Nứt: Trống Đồng Thiên Lôi hạ xuống ngay.',
    save: d => ({ ...d, name: 'Hùng', nation: 'Vietnamese', zone: 'rift2', entry: 'default', story: STORY('noxx'), badges: [1, 2, 3], hero: { lv: 32, xp: 0, hp: null },
      sys: { pet: { pet: { name: 'Rocky', hunger: 100, bond: 25, born: Date.now(), xp: xpForLevel(38), hp: maxHpOf(38), cmd: 'protect', skills: { punch: 5, ha: 4, super: 1 }, lvMig: 1 } }, road: { maxZ: 3, won: { road1: true, road2: true, road3: true } } } }),
    after: async C => { kit(C, 300, { sword: 4 }); C.bag.add('pill_hp', 10); C.bag.add('berry', 20); if (C.hold) C.hold('sword'); } },
  /* plan-30 trùm 3: Gương Địa Chấn — người cấp 38 kiếm 5, Rocky cấp 42 (Đấm 5 · Rocky-ha 5 · Siêu Cấp 1), đã qua đèo road1–6; đứng cạnh khe nứt M6 */
  guong: { vi: 'Gương Địa Chấn — đứng cạnh khe nứt (M6)', en: 'Quake Mirror — at the rift (M6)', desc: 'M6 Thành Nghiêng, ngay dưới Khe Nứt Magnitude phía Đông quảng trường thư viện. Người cấp 38, kiếm cấp 5, 10 viên hồi máu. Rocky cấp 42 (Đấm 5, Rocky-ha 5, Siêu Cấp 1). Đã qua đèo tới M6. Bấm E ở khe nứt để vào đánh Nữ Hoàng Pha Lê Vạn Kính. Mẹo: đập 6 mảnh gương bay theo thứ tự cầu vồng (đỏ → tím) để Rocky-ha xuyên được gương.',
    save: d => ({ ...d, name: 'Hùng', nation: 'Vietnamese', zone: 'm6', entry: 'rift', story: STORY('noxx'), badges: [1, 2, 3, 4, 5, 6], hero: { lv: 38, xp: 0, hp: null },
      sys: { pet: { pet: { name: 'Rocky', hunger: 100, bond: 30, born: Date.now(), xp: xpForLevel(42), hp: maxHpOf(42), cmd: 'protect', skills: { punch: 5, ha: 5, super: 1 }, lvMig: 1 } }, road: { maxZ: 6, won: { road1: true, road2: true, road3: true, road4: true, road5: true, road6: true } } } }),
    after: async C => { kit(C, 300, { sword: 5 }); C.bag.add('pill_hp', 10); C.bag.add('berry', 20); if (C.hold) C.hold('sword'); } },
  guong_fight: { vi: 'Gương Địa Chấn — vào thẳng trận', en: 'Quake Mirror — straight into the fight', desc: 'Như "Gương Địa Chấn — đứng cạnh khe nứt" nhưng vào thẳng Khe Nứt: Nữ Hoàng bước ra từ gương ngay.',
    save: d => ({ ...d, name: 'Hùng', nation: 'Vietnamese', zone: 'rift3', entry: 'default', story: STORY('noxx'), badges: [1, 2, 3, 4, 5, 6], hero: { lv: 38, xp: 0, hp: null },
      sys: { pet: { pet: { name: 'Rocky', hunger: 100, bond: 30, born: Date.now(), xp: xpForLevel(42), hp: maxHpOf(42), cmd: 'protect', skills: { punch: 5, ha: 5, super: 1 }, lvMig: 1 } }, road: { maxZ: 6, won: { road1: true, road2: true, road3: true, road4: true, road5: true, road6: true } } } }),
    after: async C => { kit(C, 300, { sword: 5 }); C.bag.add('pill_hp', 10); C.bag.add('berry', 20); if (C.hold) C.hold('sword'); } },
  /* plan-30 trùm 4: Hố Đen Địa Tâm — người cấp 42 kiếm 6, Rocky cấp 46 (Đấm 6 · Rocky-ha 6 · Siêu Cấp 1), đã qua đèo road1–4; đứng cạnh khe nứt M4 */
  hoden: { vi: 'Hố Đen Địa Tâm — đứng cạnh khe nứt (M4)', en: 'Void Devourer — at the rift (M4)', desc: 'M4 Mỏ Đá Lở, ngay dưới Khe Nứt Magnitude phía Đông quảng trường. Người cấp 42, kiếm cấp 6, 10 viên hồi máu, 300 Đá Seismic. Rocky cấp 46 (Đấm 6, Rocky-ha 6, Siêu Cấp 1). Đã qua đèo tới M4. Bấm E ở khe nứt để vào đánh Lão Thợ Mỏ Hư Không. Mẹo: hố đen NUỐT Rocky-ha — đẩy cục đá vào hố cho no để lộ lõi; tuyệt chiêu thì núp sau khối đá lớn.',
    save: d => ({ ...d, name: 'Hùng', nation: 'Vietnamese', zone: 'm4', entry: 'rift', story: STORY('noxx'), badges: [1, 2, 3, 4], hero: { lv: 42, xp: 0, hp: null },
      sys: { pet: { pet: { name: 'Rocky', hunger: 100, bond: 30, born: Date.now(), xp: xpForLevel(46), hp: maxHpOf(46), cmd: 'protect', skills: { punch: 6, ha: 6, super: 1 }, lvMig: 1 } }, road: { maxZ: 4, won: { road1: true, road2: true, road3: true, road4: true } } } }),
    after: async C => { kit(C, 300, { sword: 6 }); C.bag.add('pill_hp', 10); C.bag.add('berry', 20); if (C.hold) C.hold('sword'); } },
  hoden_fight: { vi: 'Hố Đen Địa Tâm — vào thẳng trận', en: 'Void Devourer — straight into the fight', desc: 'Như "Hố Đen Địa Tâm — đứng cạnh khe nứt" nhưng vào thẳng Khe Nứt: Lão Thợ Mỏ nâng hố đen lên ngay.',
    save: d => ({ ...d, name: 'Hùng', nation: 'Vietnamese', zone: 'rift4', entry: 'default', story: STORY('noxx'), badges: [1, 2, 3, 4], hero: { lv: 42, xp: 0, hp: null },
      sys: { pet: { pet: { name: 'Rocky', hunger: 100, bond: 30, born: Date.now(), xp: xpForLevel(46), hp: maxHpOf(46), cmd: 'protect', skills: { punch: 6, ha: 6, super: 1 }, lvMig: 1 } }, road: { maxZ: 4, won: { road1: true, road2: true, road3: true, road4: true } } } }),
    after: async C => { kit(C, 300, { sword: 6 }); C.bag.add('pill_hp', 10); C.bag.add('berry', 20); if (C.hold) C.hold('sword'); } },
  /* plan-30 trùm 5: Đồng Hồ Đứt Dây — người cấp 45 kiếm 6, Rocky cấp 48 (Đấm 6 · Rocky-ha 6 · Siêu Cấp 1), đã qua đèo road1–7; đứng cạnh khe nứt M7 */
  dongho: { vi: 'Đồng Hồ Đứt Dây — đứng cạnh khe nứt (M7)', en: 'Broken-Spring Clock — at the rift (M7)', desc: 'M7 Núi Lửa Ngủ, ngay dưới Khe Nứt Magnitude phía Đông quảng trường. Người cấp 45, kiếm cấp 6, 10 viên hồi máu, 300 Đá Seismic. Rocky cấp 48 (Đấm 6, Rocky-ha 6, Siêu Cấp 1). Đã qua đèo tới M7. Bấm E ở khe nứt để vào đánh Thần Bánh Răng Ngược Thời. Mẹo: mỗi 20 giây hắn TUA LẠI 3 giây và hồi máu — vòng ra SAU LƯNG đập vỡ bánh răng để chặn hồi máu; khung hổ phách nhốt Rocky thì đập khung cứu.',
    save: d => ({ ...d, name: 'Hùng', nation: 'Vietnamese', zone: 'm7', entry: 'rift', story: STORY('noxx'), badges: [1, 2, 3, 4, 5, 6, 7], hero: { lv: 45, xp: 0, hp: null },
      sys: { pet: { pet: { name: 'Rocky', hunger: 100, bond: 30, born: Date.now(), xp: xpForLevel(48), hp: maxHpOf(48), cmd: 'protect', skills: { punch: 6, ha: 6, super: 1 }, lvMig: 1 } }, road: { maxZ: 7, won: { road1: true, road2: true, road3: true, road4: true, road5: true, road6: true, road7: true } } } }),
    after: async C => { kit(C, 300, { sword: 6 }); C.bag.add('pill_hp', 10); C.bag.add('berry', 20); if (C.hold) C.hold('sword'); } },
  dongho_fight: { vi: 'Đồng Hồ Đứt Dây — vào thẳng trận', en: 'Broken-Spring Clock — straight into the fight', desc: 'Như "Đồng Hồ Đứt Dây — đứng cạnh khe nứt" nhưng vào thẳng Khe Nứt: Thần Bánh Răng tự ráp lại ngay.',
    save: d => ({ ...d, name: 'Hùng', nation: 'Vietnamese', zone: 'rift5', entry: 'default', story: STORY('noxx'), badges: [1, 2, 3, 4, 5, 6, 7], hero: { lv: 45, xp: 0, hp: null },
      sys: { pet: { pet: { name: 'Rocky', hunger: 100, bond: 30, born: Date.now(), xp: xpForLevel(48), hp: maxHpOf(48), cmd: 'protect', skills: { punch: 6, ha: 6, super: 1 }, lvMig: 1 } }, road: { maxZ: 7, won: { road1: true, road2: true, road3: true, road4: true, road5: true, road6: true, road7: true } } } }),
    after: async C => { kit(C, 300, { sword: 6 }); C.bag.add('pill_hp', 10); C.bag.add('berry', 20); if (C.hold) C.hold('sword'); } },
  rocky40: { vi: 'Rocky cấp 40 — Rocky-ha + Siêu Cấp', en: 'Rocky Lv 40 — Rocky-ha + Super', desc: 'Như mốc "Rocky cấp 19" nhưng Rocky cấp 40: đã mở Đấm, Rocky-ha và Siêu Cấp Rocky (20 giây). Có mục tiêu là Rocky dùng chiêu mạnh nhất đã hồi: Siêu Cấp → Rocky-ha (nhắm mục tiêu, xuyên cả hàng) → Đấm. 6000 đá để mua sách bậc cao ở Heathcliff (Biển, chân cầu tàu).',
    save: d => ({ ...d, name: 'Hùng', nation: 'Vietnamese', zone: 'village', story: STORY('noxx'), hero: { lv: 14, xp: 0, hp: null }, sys: { pet: { pet: { name: 'Rocky', hunger: 100, bond: 30, born: Date.now(), xp: xpForLevel(40), hp: maxHpOf(40), cmd: 'protect', skills: { punch: 1, ha: 1, super: 1 }, lvMig: 1 } } } }),
    after: async C => { kit(C, 6000, { sword: 3 }); if (C.hold) C.hold('sword'); if (C.clock && C.clock.set) C.clock.set({ hour: 9, minute: 0 }); await wait(400); if (window.__monsters) { window.__monsters.spawnKind('slime', 60, 0); window.__monsters.spawnKind('slime', 90, 0); window.__monsters.spawnKind('slime', -70, 10); } } },
  /* plan-31 v2 (2026-10-13 anh): bay bằng CHONG CHÓNG TRE — mỗi vùng một khoảng trời */
  may: { vi: 'Chong chóng tre — mua ở Heathcliff', en: 'Bamboo copter — buy from Heathcliff', desc: 'Bến cảng Biển, cạnh Heathcliff (chân cầu tàu). 800 đá, người cấp 30, kiếm cấp 5, Rocky cấp 42 (Siêu Cấp). Nói chuyện với Heathcliff (E) → quầy → mục 🚁 Chong chóng tre: mua 2 cái (bạn + Rocky). Rồi về Làng / bất kỳ vùng M1–M9: cầm chong chóng (thanh công cụ) + E, hoặc phím X (điện thoại 🚁) để bay lên khoảng trời của vùng đó.',
    save: d => ({ ...d, name: 'Hùng', nation: 'Vietnamese', zone: 'sea', entry: 'back', story: STORY('noxx'), badges: [1, 2, 3, 4, 5, 6, 7, 8, 9], hero: { lv: 30, xp: 0, hp: null }, sys: { pet: { pet: { name: 'Rocky', hunger: 100, bond: 30, born: Date.now(), xp: xpForLevel(42), hp: maxHpOf(42), cmd: 'protect', skills: { punch: 6, ha: 6, super: 1 }, lvMig: 1 } } } }),
    after: async C => { kit(C, 800, { sword: 5 }); if (C.hold) C.hold('sword'); if (C.clock && C.clock.set) C.clock.set({ hour: 9, minute: 0 }); } },
  catcanh: { vi: 'Chong chóng tre — sẵn sàng cất cánh ở Làng', en: 'Bamboo copter — ready to take off in the Village', desc: 'Làng, giữa trưa, đã có 2 chong chóng tre (đang cầm). Người cấp 30, kiếm cấp 5, 800 đá; Rocky cấp 42 bên cạnh. Bấm E (hoặc X / 🚁): cả hai đội chong chóng, bay vọt lên Quần Đảo Mây (trời của Làng). Trên trời dùng lại để hạ xuống đúng chỗ.',
    save: d => ({ ...d, name: 'Hùng', nation: 'Vietnamese', zone: 'village', story: STORY('noxx'), badges: [1, 2, 3, 4, 5, 6, 7, 8, 9], hero: { lv: 30, xp: 0, hp: null }, sys: { pet: { pet: { name: 'Rocky', hunger: 100, bond: 30, born: Date.now(), xp: xpForLevel(42), hp: maxHpOf(42), cmd: 'protect', skills: { punch: 6, ha: 6, super: 1 }, lvMig: 1 } } } }),
    after: async C => { kit(C, 800, { sword: 5 }); C.bag.add('copter', 2); if (C.clock && C.clock.set) C.clock.set({ hour: 12, minute: 0 }); await wait(300); if (C.hold) C.hold('copter'); } },
  bay: { vi: 'Đang bay trên trời Làng', en: 'Flying in the Village sky', desc: 'Lơ lửng bằng chong chóng tre trên trời Làng (cùng toạ độ với Làng, nhìn xuyên sương xuống bản đồ thật), Rocky cấp 46 bay cạnh. Bay tự do; bay ra mép BẮC → trời Đèo 1 → trời M1 → …, mép NAM → trời Biển (đúng như lối dưới đất). X / nút 🚁 hạ xuống đúng chỗ (E không bao giờ hạ cánh). Có đủ 9 huy hiệu nên bay qua được mọi mép.',
    save: d => ({ ...d, inv: { ...(d.inv || {}), copter: 2 }, name: 'Hùng', nation: 'Vietnamese', zone: 'sky', entry: 'default', story: STORY('noxx'), badges: [1, 2, 3, 4, 5, 6, 7, 8, 9], hero: { lv: 32, xp: 0, hp: null }, sys: { pet: { pet: { name: 'Rocky', hunger: 100, bond: 30, born: Date.now(), xp: xpForLevel(46), hp: maxHpOf(46), cmd: 'attack', skills: { punch: 6, ha: 6, super: 1 }, lvMig: 1 } } } }),
    after: async C => { kit(C, 800, { sword: 5 }); if (C.hold) C.hold('sword'); if (C.clock && C.clock.set) C.clock.set({ hour: 9, minute: 0 }); } },
  cu: { vi: 'Save cũ (trước plan-25)', en: 'Old save (before plan-25)', desc: 'Save kiểu cũ: đã qua biển nhưng chưa có phe, chưa có Rocky. Game phải tự chuyển sang phe Noxx và Rocky bơi vào bờ tìm bạn.',
    save: d => ({ ...d, name: 'Hùng', nation: 'Vietnamese', zone: 'village', story: { act: 2, step: 127, seaDone: true, keepsake: true }, inv: { ...d.inv, stone: 60, wood: 10 } }) },
};

function chip(id, p, vi) {   /* nhãn nhỏ góc dưới phải: đang ở điểm lưu nào + nút làm lại */
  const el = document.createElement('div'); el.id = 'preset-chip';
  el.style.cssText = 'position:fixed;right:8px;bottom:56px;z-index:9;background:rgba(13,11,20,.88);border:2px solid #ffd45e;border-radius:8px;padding:4px 8px;color:#f2ebe0;font:12px VT323,monospace;max-width:260px';
  el.innerHTML = `🧪 <b>${vi ? p.vi : p.en}</b><br><span style="opacity:.75">${vi ? 'Ô lưu test riêng · save thật không đổi' : 'Separate test slot · real save untouched'}</span><br><a href="?preset=${id}&reset" style="color:#ffd45e">${vi ? '↺ Làm lại từ đầu mốc này' : '↺ Restart this checkpoint'}</a>`;
  document.body.appendChild(el);
}

export async function runPreset({ q, S, CTX, startGame, defaultSave, UI }) {
  const id = q.get('preset'), p = PRESETS[id];
  if (!p) { console.error('preset: không có mốc', id, Object.keys(PRESETS)); return false; }
  useSlot(id);
  if (q.has('reset')) { clearSave(); history.replaceState(null, '', `?preset=${id}${q.get('lang') ? '&lang=' + q.get('lang') : ''}`); }
  let sv = loadSave(), fresh = !sv;
  if (fresh) { sv = p.save(defaultSave()); sv.lang = q.get('lang') || sv.lang || 'vi'; }
  startGame(sv);
  if (fresh && p.after) { await wait(600); try { await p.after(CTX); } catch (e) { console.error('preset after', e); } CTX.persist(); }
  chip(id, p, UI.lang() === 'vi');
  window.__preset = { id, fresh };
  return true;
}
