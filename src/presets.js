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
  cuu_lyron: { vi: 'Cứu Lyron — đủ 3 món, lặn tới Hang Ổ Kraken', en: 'Save Lyron — all three items, dive to the Kraken\'s Lair', desc: 'Màn 3 mới (2026-10-15, bỏ Vực Kraken cốt truyện): đã có Chuông Lặn, Bản Đồ, Đại Pha Lê. Đứng ở cầu tàu Biển cạnh vòng xoáy lặn. Lặn qua 4 tầng (bản đồ chỉ cổng xoáy, chuông giúp thở lâu gấp đôi, pha lê soi sáng hang tối) → Hang Ổ: hạ Kraken → E ở lồng = phá bằng Đại Pha Lê → cứu Lyron. Cấp 20, kiếm cấp 4, đã mở sẵn cổng tầng 1–4 (chọn tầng bằng phím 1–4 khi lặn).',
    save: d => ({ ...d, name: 'Hùng', nation: 'Vietnamese', zone: 'sea', entry: 'whirl', story: { ...STORY('noxx'), items: { divebell: true, trenchmap: true, greatcrystal: true } }, hero: { lv: 20, xp: 0, hp: null }, sys: { pet: ROCKY(), underwater: { breath: 300, met: true, reached: ['u1', 'u2', 'u3', 'u4'], gates: { u1: true, u2: true, u3: true, u4: true } } } }),
    after: async C => { kit(C, 500, { sword: 4 }); C.bag.add('pill_l', 3); if (C.hold) C.hold('sword'); if (C.hotbarPut) C.hotbarPut(1, 'pill_l'); } },
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
  /* plan-34: thử Ki — M2, người cấp 20, kiếm cấp 3, Ki đầy */
  ki_test: { vi: 'Ki — nhào lộn né + lướt tới đánh (M2)', en: 'Ki — dodge roll + dash strike (M2)', desc: 'M2, người cấp 20, kiếm cấp 3, 10 viên hồi máu. Thanh Ki 7 viên ngọc cạnh thanh máu. Khóa 1 con quái ở xa 3–7 ô rồi bấm E / A: lướt tới chém (1 viên). Đòn tầm xa có báo trước của trùm: tự nhào lộn né (2 viên). Menu ⚙ đổi Tự động / Dùng tay (Shift hoặc nút Ki). Muốn thử né: dùng preset Hắc Rocky / Trống Đồng vào thẳng trận.',
    save: d => ({ ...d, name: 'Hùng', nation: 'Vietnamese', zone: 'm2', entry: 'default', story: STORY('noxx'), badges: [1, 2, 3], hero: { lv: 20, xp: 0, hp: null }, sys: { pet: ROCKY(), ki: { auto: true, ki: 7 } } }),
    after: async C => { kit(C, 200, { sword: 3 }); C.bag.add('pill_hp', 10); if (C.hold) C.hold('sword'); } },
  /* plan-30 trùm 2: Trống Đồng Thiên Lôi — người cấp 32 kiếm 4, Rocky cấp 38 (Đấm 5 · Rocky-ha 4 · Siêu Cấp 1), đã qua đèo road1–3; đứng cạnh khe nứt M2 */
  trongdong: { vi: 'Trống Đồng — đứng cạnh khe nứt (M2)', en: 'Bronze Drum — at the rift (M2)', desc: 'M2 Làng Rung Khẽ, ngay dưới Khe Nứt Magnitude phía Đông quảng trường. Người cấp 32, kiếm cấp 4, 10 viên hồi máu. Rocky cấp 38 (Đấm 5, Rocky-ha 4, Siêu Cấp 1). Đã qua đèo tới M2. Bấm E ở khe nứt để vào đánh Trống Đồng Thiên Lôi. Mẹo: đánh mép trống đúng lúc ánh sáng tới dấu ‹•› trên thanh nhịp.',
    save: d => ({ ...d, name: 'Hùng', nation: 'Vietnamese', zone: 'm2', entry: 'rift', story: STORY('noxx'), badges: [1, 2, 3], hero: { lv: 32, xp: 0, hp: null },
      sys: { pet: { pet: { name: 'Rocky', hunger: 100, bond: 25, born: Date.now(), xp: xpForLevel(38), hp: maxHpOf(38), cmd: 'protect', skills: { punch: 5, ha: 4, super: 1 }, lvMig: 1 } }, road: { maxZ: 3, won: { road1: true, road2: true, road3: true } } } }),
    after: async C => { kit(C, 300, { sword: 4 }); C.bag.add('pill_hp', 10); C.bag.add('berry', 20); if (C.hold) C.hold('sword'); } },
  trongdong_fight: { vi: 'Trống Đồng — vào thẳng trận', en: 'Bronze Drum — straight into the fight', desc: 'Như "Trống Đồng — đứng cạnh khe nứt" nhưng vào thẳng Khe Nứt: Trống Đồng Thiên Lôi hạ xuống ngay.',
    save: d => ({ ...d, name: 'Hùng', nation: 'Vietnamese', zone: 'rift2', entry: 'default', story: STORY('noxx'), badges: [1, 2, 3], hero: { lv: 32, xp: 0, hp: null },
      sys: { pet: { pet: { name: 'Rocky', hunger: 100, bond: 25, born: Date.now(), xp: xpForLevel(38), hp: maxHpOf(38), cmd: 'protect', skills: { punch: 5, ha: 4, super: 1 }, lvMig: 1 } }, road: { maxZ: 3, won: { road1: true, road2: true, road3: true } } } }),
    after: async C => { kit(C, 300, { sword: 4 }); C.bag.add('pill_hp', 10); C.bag.add('berry', 20); if (C.hold) C.hold('sword'); } },
  /* plan-30 trùm 3: Gương Địa Chấn — người cấp 38 kiếm 5, Rocky cấp 46 (Đấm 5 · Rocky-ha 5 · Siêu Cấp 1), đã qua đèo road1–6; đứng cạnh khe nứt M6 */
  guong: { vi: 'Gương Địa Chấn — đứng cạnh khe nứt (M6)', en: 'Quake Mirror — at the rift (M6)', desc: 'M6 Thành Nghiêng, ngay dưới Khe Nứt Magnitude phía Đông quảng trường thư viện. Người cấp 38, kiếm cấp 5, 10 viên hồi máu. Rocky cấp 46 (Đấm 5, Rocky-ha 5, Siêu Cấp 1). Đã qua đèo tới M6. Bấm E ở khe nứt để vào đánh Nữ Hoàng Pha Lê Vạn Kính. Mẹo: đập 6 mảnh gương bay theo thứ tự cầu vồng (đỏ → tím) để Rocky-ha xuyên được gương.',
    save: d => ({ ...d, name: 'Hùng', nation: 'Vietnamese', zone: 'm6', entry: 'rift', story: STORY('noxx'), badges: [1, 2, 3, 4, 5, 6], hero: { lv: 38, xp: 0, hp: null },
      sys: { pet: { pet: { name: 'Rocky', hunger: 100, bond: 30, born: Date.now(), xp: xpForLevel(46), hp: maxHpOf(46), cmd: 'protect', skills: { punch: 5, ha: 5, super: 1 }, lvMig: 1 } }, road: { maxZ: 6, won: { road1: true, road2: true, road3: true, road4: true, road5: true, road6: true } } } }),
    after: async C => { kit(C, 300, { sword: 5 }); C.bag.add('pill_hp', 10); C.bag.add('berry', 20); if (C.hold) C.hold('sword'); } },
  guong_fight: { vi: 'Gương Địa Chấn — vào thẳng trận', en: 'Quake Mirror — straight into the fight', desc: 'Như "Gương Địa Chấn — đứng cạnh khe nứt" nhưng vào thẳng Khe Nứt: Nữ Hoàng bước ra từ gương ngay.',
    save: d => ({ ...d, name: 'Hùng', nation: 'Vietnamese', zone: 'rift3', entry: 'default', story: STORY('noxx'), badges: [1, 2, 3, 4, 5, 6], hero: { lv: 38, xp: 0, hp: null },
      sys: { pet: { pet: { name: 'Rocky', hunger: 100, bond: 30, born: Date.now(), xp: xpForLevel(46), hp: maxHpOf(46), cmd: 'protect', skills: { punch: 5, ha: 5, super: 1 }, lvMig: 1 } }, road: { maxZ: 6, won: { road1: true, road2: true, road3: true, road4: true, road5: true, road6: true } } } }),
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
  /* plan-30 trùm 6: Bakunawa Nuốt Nhật — người cấp 48 kiếm 6, Rocky cấp 50 (Đấm 7 · Rocky-ha 7 · Siêu Cấp 1), đủ 9 huy hiệu + đã hạ 5 trùm Vết Nứt; đang bay ngay dưới Cổng Trời (trời M9) */
  bakunawa: { vi: 'Ngô Công Lôi Thần — bay cạnh Cổng Trời (trời M9)', en: 'Thunder Centipede God — at the Sky Gate (M9 sky)', desc: 'Đang bay bằng chong chóng tre trên trời M9, ngay dưới Cổng Trời (đã đủ điều kiện: huy hiệu M9 + hạ đủ 5 trùm Vết Nứt). Người cấp 48, kiếm cấp 6, 10 viên hồi máu, 400 Đá Seismic. Rocky cấp 50 (Đấm 7, Rocky-ha 7, Siêu Cấp 1). Bay lên cổng → bấm E để vào sân Bakunawa trên mây. Mẹo: Nhật Thực thì đi cạnh Rocky (Rocky soi sáng) và gõ 3 trống ĐÚNG NHỊP ‹•›; tuyệt chiêu thì đánh đốt sáng gần bạn, Rocky lo đốt bên kia.',
    save: d => ({ ...d, inv: { ...(d.inv || {}), copter: 2 }, name: 'Hùng', nation: 'Vietnamese', zone: 'sky_m9', entry: 'gate', story: { ...STORY('noxx'), act: 4, rescued: true }, badges: [1, 2, 3, 4, 5, 6, 7, 8, 9], achievements: [...(d.achievements || []), 'hacrocky', 'trongdong', 'guong', 'hoden', 'dongho'], hero: { lv: 48, xp: 0, hp: null },
      sys: { seaRaft: { seen: true }, pet: { pet: { name: 'Rocky', hunger: 100, bond: 30, born: Date.now(), xp: xpForLevel(50), hp: maxHpOf(50), cmd: 'protect', skills: { punch: 7, ha: 7, super: 1 }, lvMig: 1 } }, road: { maxZ: 9, won: { road1: true, road2: true, road3: true, road4: true, road5: true, road6: true, road7: true, road8: true, road9: true } } } }),
    after: async C => { kit(C, 400, { sword: 6 }); C.bag.add('pill_hp', 10); C.bag.add('berry', 20); if (C.hold) C.hold('sword'); if (C.clock && C.clock.set) C.clock.set({ hour: 10, minute: 0 }); } },
  bakunawa_fight: { vi: 'Ngô Công Lôi Thần — vào thẳng trận', en: 'Thunder Centipede God — straight into the fight', desc: 'Vào thẳng sân trên mây: Vua Rết trồi lên. Ở 80 / 52 / 22 % máu nó NGOẠM người chơi THA bay sang vùng đất khác (bấm A / E liên tục để giãy thoát sớm → bung chong chóng), đánh tiếp ở đó với chiêu địa hình.',
    save: d => ({ ...d, inv: { ...(d.inv || {}), copter: 2 }, name: 'Hùng', nation: 'Vietnamese', zone: 'sky_bakunawa', entry: 'default', story: { ...STORY('noxx'), act: 4, rescued: true }, badges: [1, 2, 3, 4, 5, 6, 7, 8, 9], achievements: [...(d.achievements || []), 'hacrocky', 'trongdong', 'guong', 'hoden', 'dongho'], hero: { lv: 48, xp: 0, hp: null },
      sys: { seaRaft: { seen: true }, pet: { pet: { name: 'Rocky', hunger: 100, bond: 30, born: Date.now(), xp: xpForLevel(50), hp: maxHpOf(50), cmd: 'protect', skills: { punch: 7, ha: 7, super: 1 }, lvMig: 1 } }, road: { maxZ: 9, won: { road1: true, road2: true, road3: true, road4: true, road5: true, road6: true, road7: true, road8: true, road9: true } } } }),
    after: async C => { kit(C, 400, { sword: 6 }); C.bag.add('pill_hp', 10); C.bag.add('berry', 20); if (C.hold) C.hold('sword'); if (C.clock && C.clock.set) C.clock.set({ hour: 10, minute: 0 }); } },
  /* plan-33 mục 9: PLOT TWIST LYRON (lyron_finale.js) — sân 'sky_lyron' trên bão mây M9 */
  lyron_finale: { vi: 'Twist Lyron — gặp ở cầu tàu (đêm lồng đèn)', en: 'Lyron twist — meeting on the pier (lantern night)', desc: 'Vừa hạ Ngô Công Lôi Thần (trùm 6) — mũ trùm rỗng, sợi lụa đỏ. ĐÊM LỒNG ĐÈN ở bến cảng của Làng: Lyron đứng một mình cuối cầu tàu. Lại gần bấm E → tiết lộ (Esc bỏ qua, E tiếp) → khăn đỏ trói Rocky → Màn A trong tâm trí Rocky: chém NÚT KHĂN, Gọi Rocky; khăn đứt → Màn B 2 đánh 1. Người cấp 50, kiếm 6, Rocky cấp 50.',
    save: d => ({ ...d, inv: { ...(d.inv || {}), copter: 2 }, name: 'Hùng', nation: 'Vietnamese', zone: 'sea', entry: 'back', story: { ...STORY('noxx'), act: 4, rescued: true }, badges: [1, 2, 3, 4, 5, 6, 7, 8, 9], achievements: [...(d.achievements || []), 'hacrocky', 'trongdong', 'guong', 'hoden', 'dongho', 'bakunawa'], hero: { lv: 50, xp: 0, hp: null },
      sys: { pet: { pet: { name: 'Rocky', hunger: 100, bond: 30, born: Date.now(), xp: xpForLevel(50), hp: maxHpOf(50), cmd: 'protect', skills: { punch: 7, ha: 8, super: 1 }, lvMig: 1 } }, bakunawa: { wins: 1, tries: 1 }, lyron: { stage: 'meet', wins: 0, tries: 1 }, seaRaft: { seen: true }, road: { maxZ: 9, won: { road1: true, road2: true, road3: true, road4: true, road5: true, road6: true, road7: true, road8: true, road9: true } } } }),
    after: async C => { kit(C, 400, { sword: 6 }); C.bag.add('pill_hp', 10); C.bag.add('berry', 20); if (C.hold) C.hold('sword'); if (C.clock && C.clock.set) C.clock.set({ hour: 10, minute: 0 }); } },
  lyron_cautau: { vi: 'Twist Lyron — gặp ở cầu tàu (đêm lồng đèn)', en: 'Lyron twist — meeting on the pier (lantern night)', desc: 'Vừa hạ Ngô Công Lôi Thần (trùm 6) — mũ trùm rỗng, sợi lụa đỏ. ĐÊM LỒNG ĐÈN ở bến cảng của Làng: Lyron đứng một mình cuối cầu tàu. Lại gần bấm E → tiết lộ (Esc bỏ qua, E tiếp) → khăn đỏ trói Rocky → Màn A trong tâm trí Rocky: chém NÚT KHĂN, Gọi Rocky; khăn đứt → Màn B 2 đánh 1. Người cấp 50, kiếm 6, Rocky cấp 50.',
    save: d => ({ ...d, inv: { ...(d.inv || {}), copter: 2 }, name: 'Hùng', nation: 'Vietnamese', zone: 'sea', entry: 'back', story: { ...STORY('noxx'), act: 4, rescued: true }, badges: [1, 2, 3, 4, 5, 6, 7, 8, 9], achievements: [...(d.achievements || []), 'hacrocky', 'trongdong', 'guong', 'hoden', 'dongho', 'bakunawa'], hero: { lv: 50, xp: 0, hp: null },
      sys: { pet: { pet: { name: 'Rocky', hunger: 100, bond: 30, born: Date.now(), xp: xpForLevel(50), hp: maxHpOf(50), cmd: 'protect', skills: { punch: 7, ha: 8, super: 1 }, lvMig: 1 } }, bakunawa: { wins: 1, tries: 1 }, lyron: { stage: 'meet', wins: 0, tries: 1 }, seaRaft: { seen: true }, road: { maxZ: 9, won: { road1: true, road2: true, road3: true, road4: true, road5: true, road6: true, road7: true, road8: true, road9: true } } } }),
    after: async C => { kit(C, 400, { sword: 6 }); C.bag.add('pill_hp', 10); C.bag.add('berry', 20); if (C.hold) C.hold('sword'); if (C.clock && C.clock.set) C.clock.set({ hour: 10, minute: 0 }); } },
  lyron_mindA: { vi: 'Twist Lyron — Màn A: tâm trí Rocky', en: "Lyron twist — Act A: Rocky's mind", desc: 'Vào thẳng TÂM TRÍ Rocky (cõi mơ ấm ghép từ mảnh ký ức, đi bộ): Rocky Tối Thượng bị khăn đỏ khống chế — chém NÚT KHĂN (sau lưng / lúc nút khăn rực sáng), mốc 75/50/25 % có ký ức + Gọi Rocky.',
    save: d => ({ ...d, inv: { ...(d.inv || {}), copter: 2 }, name: 'Hùng', nation: 'Vietnamese', zone: 'mind_rocky', entry: 'default', story: { ...STORY('noxx'), act: 4, rescued: true }, badges: [1, 2, 3, 4, 5, 6, 7, 8, 9], achievements: [...(d.achievements || []), 'hacrocky', 'trongdong', 'guong', 'hoden', 'dongho', 'bakunawa'], hero: { lv: 50, xp: 0, hp: null },
      sys: { pet: { pet: { name: 'Rocky', hunger: 100, bond: 30, born: Date.now(), xp: xpForLevel(50), hp: maxHpOf(50), cmd: 'protect', skills: { punch: 7, ha: 8, super: 1 }, lvMig: 1 } }, bakunawa: { wins: 1, tries: 1 }, lyron: { stage: 'fightA', wins: 0, tries: 1 }, road: { maxZ: 9, won: { road1: true, road2: true, road3: true, road4: true, road5: true, road6: true, road7: true, road8: true, road9: true } } } }),
    after: async C => { kit(C, 400, { sword: 6 }); C.bag.add('pill_hp', 10); C.bag.add('berry', 20); if (C.hold) C.hold('sword'); if (C.clock && C.clock.set) C.clock.set({ hour: 10, minute: 0 }); } },
  starter_test: { vi: 'Chấn Thú — chọn con khởi đầu (Làng)', en: 'Chấn Thú — pick a starter (Village)', desc: 'plan-58 C.2. Làng Xuất Phát, save CHƯA có Chấn Thú. Cạnh lối vào có 3 Ấn Chấn (Lôi Hồ · Vịt Bão · Bánh Bao Thánh): E → bảng chọn, đặt tên → nhận 3 Ấn Thu. Sau đó E ở 2 viên còn lại = bảng Đội (đổi tên, chọn con ra trận). Huấn luyện viên cạnh lối vào sẽ đấu bằng con của bạn.',
    save: d => ({ ...d, name: 'Hùng', nation: 'Vietnamese', zone: 'village', entry: 'default', story: STORY('noxx'), sys: { pet: ROCKY() } }),
    after: async C => { kit(C, 200); const pd = C.chanthu && C.chanthu.pad(); if (pd) { C.S.player.x = pd.x + 22; C.S.player.y = pd.y + 4; C.S.player.dir = 1; } } },
  catch_test: { vi: 'Chấn Thú — bắt thú hoang bằng Ấn Thu (M1)', en: 'Chấn Thú — catch a wild one with Seal Stones (M1)', desc: 'plan-58 C.2. M1 Bãi Bồi Yên, đã có Lôi Hồ (tên "Tia Chớp", Lv20) + 5 Ấn Thu + 200 đá. Đứng cạnh 1 Chấn Thú hoang (Bạch Kình / Vịt Bão lang thang). E → trận 1 đấu 1 (thú hoang đứng sẵn). Máu nó ≤ 30 % → nó choáng 2,4 s, hiện nút Ấn Thu (phím C hoặc E) → ném: hút vào ấn, lắc 1–3 lần → bắt được (vào đội) hoặc bung ra và bỏ chạy (lát sau mới hiện lại). Mua thêm Ấn Thu ở quầy Thương nhân.',
    save: d => ({ ...d, name: 'Hùng', nation: 'Vietnamese', zone: 'm1', entry: 'default', story: STORY('noxx'), badges: [1], hero: { lv: 12, xp: 0, hp: null }, sys: { pet: ROCKY(), chanthu: { v: 1, starter: 'loiho', team: [{ id: 1, sp: 'loiho', lv: 20, name: 'Tia Chớp' }], box: [], anThu: 5, nextId: 2, caught: 0 } } }),
    after: async C => { kit(C, 200); const w = C.chanthu && C.chanthu.wild()[0]; if (w) { C.S.player.x = w.x - 24; C.S.player.y = w.y; C.S.player.dir = 2; } } },
  rare_test: { vi: 'Chấn Thú hiếm theo giờ / thời tiết (M2)', en: 'Rare Chấn Thú by time / weather (M2)', desc: 'plan-58 C.4 (p52d). M2, đã có Lôi Hồ Lv20 + Bánh Bao Lv20 + 5 Ấn Thu. Chọn điều kiện bằng tham số wx trong link: wx=night (21:00, Cười Thố / Tinh Miêu), wx=dawn (6:30, Bánh Bao Thánh), wx=rain (Bạch Kình — ngoài preset thì do Gọi Mưa của Cóc), wx=storm (Lôi Hồ — ngoài preset là vùng có sét M8). Con hiếm hiện cách 6–14 ô: 1 dòng thông báo + biểu tượng tĩnh trên đầu + ghim tím trên bản đồ Vùng này (M). E cạnh nó → trận 1v1, độ hiếm Hiếm.',
    save: d => { let w = 'night'; try { w = new URLSearchParams(location.search).get('wx') || 'night'; } catch (e) { } const min = /night/.test(w) ? 900 : /dawn/.test(w) ? 30 : 360; return { ...d, name: 'Hùng', nation: 'Vietnamese', zone: 'm2', entry: 'default', story: STORY('noxx'), badges: [1, 2], hero: { lv: 14, xp: 0, hp: null }, clock: { season: 'spring', day: 1, year: 1, min }, sys: { pet: ROCKY(), chanthu: { v: 1, starter: 'loiho', team: [{ id: 1, sp: 'loiho', lv: 20, name: 'Tia Chớp' }, { id: 2, sp: 'banhbao', lv: 20, name: 'Bánh Bao' }], box: [], anThu: 5, nextId: 3, caught: 0 } } }; },
    after: async C => { kit(C, 200); let w = 'night'; try { w = new URLSearchParams(location.search).get('wx') || 'night'; } catch (e) { } if (C.clock && C.clock.set) C.clock.set(/night/.test(w) ? { hour: 21, minute: 0 } : /dawn/.test(w) ? { hour: 6, minute: 30 } : { hour: 12, minute: 0 }); if (C.chanthu && C.chanthu.setWx) C.chanthu.setWx({ night: /night/.test(w), dawn: /dawn/.test(w), rain: /rain/.test(w), storm: /storm/.test(w) }); } },
  team_test: { vi: 'Chấn Thú — đội của mình ra trận 3v3 / 6v6 (Làng)', en: 'Chấn Thú — your own team in 3v3 / 6v6 (Village)', desc: 'plan-58 (p52d). Làng, save có đội 4 con: Bánh Bao · Lôi Hồ · Bạch Kình · Vịt Bão. Bệ Ấn Chấn cạnh lối vào → E: bảng Đội, ▲▼ xếp thứ tự ra trận (1–3 đánh 3v3). Huấn luyện viên cạnh lối vào: link có &team=3v3 → trận 3 đấu 3 bằng 3 con đầu đội của bạn (&team=6v6: cả 4 con + bù 2).',
    save: d => ({ ...d, name: 'Hùng', nation: 'Vietnamese', zone: 'village', entry: 'default', story: STORY('noxx'), sys: { pet: ROCKY(), chanthu: { v: 1, starter: 'banhbao', team: [{ id: 1, sp: 'banhbao', lv: 20, name: 'Bánh Bao' }, { id: 2, sp: 'loiho', lv: 18, name: 'Tia Chớp' }, { id: 3, sp: 'bachkinh', lv: 17, name: 'Kình Nhỏ' }, { id: 4, sp: 'vitbao', lv: 16, name: 'Vịt Gió' }], box: [], anThu: 3, nextId: 5, caught: 3 } } }),
    after: async C => { kit(C, 200); } },
  duel_test: { vi: 'Đấu Linh Thú — thử 1 đấu 1', en: 'Spirit Duel — 1v1 test', desc: 'Làng Xuất Phát, cạnh lối vào có 1 huấn luyện viên Seismic. E → "Đấu linh thú?" → Đồng ý: khoanh sân NGAY TẠI CHỖ, Thạch Chấn Vương (của bạn) đấu Xích Long Lv 20. Hai thú tự chạy, né, ra chiêu khắp map; bạn xem + cổ vũ, đi lại tự do.',
    save: d => ({ ...d, name: 'Hùng', nation: 'Vietnamese', zone: 'village', entry: 'default', story: STORY('noxx'), sys: { pet: ROCKY() } }),
    after: async C => { kit(C, 50); } },
  lyron_free: { vi: 'Twist Lyron — Màn B: 2 đánh 1', en: 'Lyron twist — Act B: two on one', desc: 'Trong TÂM TRÍ Lyron (cõi lạnh, đi bộ). Khăn đã đứt, Rocky về phe bạn: đánh Lyron 2 đánh 1 (Quất Khăn, Vạn Túc Trồi, Lôi Rết, Lướt Khăn, tuyệt chiêu Vạn Túc Lôi Trận ở 30 % và 12 %). Hạ Lyron → hoá đá, chìm vào mây, khăn bay về, thưởng + màn kết.',
    save: d => ({ ...d, inv: { ...(d.inv || {}), copter: 2 }, name: 'Hùng', nation: 'Vietnamese', zone: 'mind_lyron', entry: 'default', story: { ...STORY('noxx'), act: 4, rescued: true }, badges: [1, 2, 3, 4, 5, 6, 7, 8, 9], achievements: [...(d.achievements || []), 'hacrocky', 'trongdong', 'guong', 'hoden', 'dongho', 'bakunawa'], hero: { lv: 50, xp: 0, hp: null },
      sys: { pet: { pet: { name: 'Rocky', hunger: 100, bond: 30, born: Date.now(), xp: xpForLevel(50), hp: maxHpOf(50), cmd: 'protect', skills: { punch: 7, ha: 8, super: 1 }, lvMig: 1 } }, bakunawa: { wins: 1, tries: 1 }, lyron: { stage: 'fightB', wins: 0, tries: 1 }, road: { maxZ: 9, won: { road1: true, road2: true, road3: true, road4: true, road5: true, road6: true, road7: true, road8: true, road9: true } } } }),
    after: async C => { kit(C, 400, { sword: 6 }); C.bag.add('pill_hp', 10); C.bag.add('berry', 20); if (C.hold) C.hold('sword'); if (C.clock && C.clock.set) C.clock.set({ hour: 10, minute: 0 }); } },
  rocky40: { vi: 'Rocky cấp 40 — Rocky-ha + Siêu Cấp', en: 'Rocky Lv 40 — Rocky-ha + Super', desc: 'Như mốc "Rocky cấp 19" nhưng Rocky cấp 40: đã mở Đấm, Rocky-ha và Siêu Cấp Rocky (20 giây). Có mục tiêu là Rocky dùng chiêu mạnh nhất đã hồi: Siêu Cấp → Rocky-ha (nhắm mục tiêu, xuyên cả hàng) → Đấm. 6000 đá để mua sách bậc cao ở Heathcliff (Biển, chân cầu tàu).',
    save: d => ({ ...d, name: 'Hùng', nation: 'Vietnamese', zone: 'village', story: STORY('noxx'), hero: { lv: 14, xp: 0, hp: null }, sys: { pet: { pet: { name: 'Rocky', hunger: 100, bond: 30, born: Date.now(), xp: xpForLevel(40), hp: maxHpOf(40), cmd: 'protect', skills: { punch: 1, ha: 1, super: 1 }, lvMig: 1 } } } }),
    after: async C => { kit(C, 6000, { sword: 3 }); if (C.hold) C.hold('sword'); if (C.clock && C.clock.set) C.clock.set({ hour: 9, minute: 0 }); await wait(400); if (window.__monsters) { window.__monsters.spawnKind('slime', 60, 0); window.__monsters.spawnKind('slime', 90, 0); window.__monsters.spawnKind('slime', -70, 10); } } },
  /* plan-50: HỢP THỂ — bến cảng Biển cạnh Heathcliff, Rocky cấp 42, 5000 đá, đã hạ Hắc Rocky (mở chiêu 1 Hắc-ha Cong), 2 slime cạnh bên */
  fuse_test: { vi: 'Hợp Thể — thử nghiệm', en: 'Fusion — test', desc: 'Bến cảng Biển cạnh Heathcliff. Người cấp 30, kiếm 4, 5000 đá; Rocky cấp 42 (đã hạ Hắc Rocky → mở Hắc-ha Cong). Hợp thể: nút Rocky trên thanh công cụ / phím / (điện thoại 💬) → nút ⚡ Hợp thể, hoặc thẻ Rocky (B). Khi hợp thể: phím 1 = Hắc-ha Cong (điện thoại bấm ô chiêu). Bông Tai Hợp Thể: nói chuyện Heathcliff (E) → quầy, 3000 đá → đeo ở thẻ Rocky.',
    save: d => ({ ...d, name: 'Hùng', nation: 'Vietnamese', zone: 'sea', entry: 'back', story: STORY('noxx'), badges: [1, 2, 3, 4, 5, 6, 7, 8, 9], hero: { lv: 30, xp: 0, hp: null }, sys: { pet: { pet: { name: 'Rocky', hunger: 100, bond: 30, born: Date.now(), xp: xpForLevel(42), hp: maxHpOf(42), cmd: 'protect', skills: { punch: 6, ha: 6, super: 1 }, lvMig: 1 } }, hacrocky: { wins: 1, tries: 1 } } }),
    after: async C => { kit(C, 5000, { sword: 4 }); if (C.clock && C.clock.set) C.clock.set({ hour: 10, minute: 0 }); if (C.hold) C.hold('sword'); await wait(500); if (window.__monsters) { window.__monsters.spawnKind('slime', 70, 20); window.__monsters.spawnKind('slime', 100, 30); } } },
  /* plan-31 v2 (2026-10-13 anh): bay bằng CHONG CHÓNG TRE — mỗi vùng một khoảng trời */
  may: { vi: 'Chong chóng tre — mua ở Heathcliff', en: 'Bamboo copter — buy from Heathcliff', desc: 'Bến cảng Biển, cạnh Heathcliff (chân cầu tàu). 800 đá, người cấp 30, kiếm cấp 5, Rocky cấp 42 (Siêu Cấp). Nói chuyện với Heathcliff (E) → quầy → mục 🚁 Chong chóng tre: mua 2 cái (bạn + Rocky). Rồi về Làng / bất kỳ vùng M1–M9: cầm chong chóng (thanh công cụ) + E, hoặc phím X (điện thoại 🚁) để bay lên khoảng trời của vùng đó.',
    save: d => ({ ...d, name: 'Hùng', nation: 'Vietnamese', zone: 'sea', entry: 'back', story: STORY('noxx'), badges: [1, 2, 3, 4, 5, 6, 7, 8, 9], hero: { lv: 30, xp: 0, hp: null }, sys: { pet: { pet: { name: 'Rocky', hunger: 100, bond: 30, born: Date.now(), xp: xpForLevel(42), hp: maxHpOf(42), cmd: 'protect', skills: { punch: 6, ha: 6, super: 1 }, lvMig: 1 } } } }),
    after: async C => { kit(C, 800, { sword: 5 }); if (C.hold) C.hold('sword'); if (C.clock && C.clock.set) C.clock.set({ hour: 9, minute: 0 }); } },
  catcanh: { vi: 'Chong chóng tre — sẵn sàng cất cánh ở Làng', en: 'Bamboo copter — ready to take off in the Village', desc: 'Làng, giữa trưa, đã có 2 chong chóng tre (đang cầm). Người cấp 30, kiếm cấp 5, 800 đá; Rocky cấp 42 bên cạnh. Bấm E (hoặc X / 🚁): cả hai đội chong chóng, bay vọt lên Quần Đảo Mây (trời của Làng). Trên trời dùng lại để hạ xuống đúng chỗ.',
    save: d => ({ ...d, name: 'Hùng', nation: 'Vietnamese', zone: 'village', story: STORY('noxx'), badges: [1, 2, 3, 4, 5, 6, 7, 8, 9], hero: { lv: 30, xp: 0, hp: null }, sys: { pet: { pet: { name: 'Rocky', hunger: 100, bond: 30, born: Date.now(), xp: xpForLevel(42), hp: maxHpOf(42), cmd: 'protect', skills: { punch: 6, ha: 6, super: 1 }, lvMig: 1 } } } }),
    after: async C => { kit(C, 800, { sword: 5 }); C.bag.add('copter', 2); if (C.clock && C.clock.set) C.clock.set({ hour: 12, minute: 0 }); await wait(300); if (C.hold) C.hold('copter'); } },
  odo_test: { vi: 'Ở Dơ — kẻ rình hút KN', en: 'Grubby — the XP thief', desc: 'M3 Rừng Nứt, giữa trưa. Người cấp 15, kiếm cấp 3, 300 đá; Rocky cấp 20. Vài giây sau Ở Dơ (gã trọc bẩn thỉu lè lưỡi) xuất hiện ngoài màn hình rồi rình bạn, nấp sau cây. Hạ quái khi gã ở gần (≤ 200 px) → gã hút 20 % KN. Đánh gã (E / chạm gã) để đòi lại toàn bộ +10 %; gã còn < 30 % máu sẽ bỏ chạy.',
    save: d => ({ ...d, name: 'Hùng', nation: 'Vietnamese', zone: 'm3', story: STORY('noxx'), badges: [1, 2, 3], hero: { lv: 15, xp: 0, hp: null }, sys: { pet: { pet: { name: 'Rocky', hunger: 100, bond: 20, born: Date.now(), xp: xpForLevel(20), hp: maxHpOf(20), cmd: 'protect', skills: { punch: 3, ha: 3 }, lvMig: 1 } } } }),
    after: async C => { kit(C, 300, { sword: 3 }); if (C.clock && C.clock.set) C.clock.set({ hour: 12, minute: 0 }); if (C.hold) C.hold('sword'); for (let i = 0; i < 40 && !window.__odo; i++) await wait(150); if (window.__odo) window.__odo.soon(4); } },   /* plan-57 */
  bay: { vi: 'Đang bay trên trời Làng', en: 'Flying in the Village sky', desc: 'Lơ lửng bằng chong chóng tre trên trời Làng (cùng toạ độ với Làng, nhìn xuyên sương xuống bản đồ thật), Rocky cấp 46 bay cạnh. Bay tự do; bay qua CỔNG MÂY giữa mép BẮC → trời Đèo 1 → trời M1 → …, cổng giữa mép NAM → trời Biển (đúng như lối dưới đất; ngoài cổng là tường sương). X / nút 🚁 hạ xuống đúng chỗ (E không bao giờ hạ cánh). Có đủ 9 huy hiệu nên bay qua được mọi mép.',
    save: d => ({ ...d, inv: { ...(d.inv || {}), copter: 2 }, name: 'Hùng', nation: 'Vietnamese', zone: 'sky', entry: 'default', story: STORY('noxx'), badges: [1, 2, 3, 4, 5, 6, 7, 8, 9], hero: { lv: 32, xp: 0, hp: null }, sys: { pet: { pet: { name: 'Rocky', hunger: 100, bond: 30, born: Date.now(), xp: xpForLevel(46), hp: maxHpOf(46), cmd: 'attack', skills: { punch: 6, ha: 6, super: 1 }, lvMig: 1 } } } }),
    after: async C => { kit(C, 800, { sword: 5 }); if (C.hold) C.hold('sword'); if (C.clock && C.clock.set) C.clock.set({ hour: 9, minute: 0 }); } },
  cong_may: { vi: 'Cổng Mây mở — trời Đèo 8, trước cổng lên M8', en: 'Cloud Gate (open) — Pass 8 sky, facing the gate to M8', desc: 'plan-41: đang bay 850 m ở trời Đèo 8, đứng ngay trước CỔNG MÂY giữa mép Bắc (bảng ↑ M8 · Đỉnh Tâm Chấn), Rocky bay cạnh. Bay thẳng lên qua khe vòm → sương bung → sang trời M8, hiện ở cổng Nam bên đó. Bay ra mép ngoài cổng → tường sương đẩy lại. Cổng Nam (↓ M7) ở cuối trời. Đủ 9 huy hiệu.',
    save: d => ({ ...d, inv: { ...(d.inv || {}), copter: 2 }, name: 'Hùng', nation: 'Vietnamese', zone: 'sky_road8', entry: 'default', story: STORY('noxx'), badges: [1, 2, 3, 4, 5, 6, 7, 8, 9], hero: { lv: 32, xp: 0, hp: null }, sys: { ki: { v: 3, auto: true, tut: 1 }, pet: { pet: { name: 'Rocky', hunger: 100, bond: 30, born: Date.now(), xp: xpForLevel(46), hp: maxHpOf(46), cmd: 'attack', skills: { punch: 6, ha: 6, super: 1 }, lvMig: 1 } } } }),
    after: async C => { kit(C, 800, { sword: 5 }); if (C.hold) C.hold('sword'); if (C.clock && C.clock.set) C.clock.set({ hour: 9, minute: 0 }); const p = C.S.player, m = C.S.map; if (m && m.sky) { p.x = (m.w >> 1) * 16 + 8; p.y = 24 + 52; p.dir = 3; } } },
  cong_may_khoa: { vi: 'Cổng Mây khoá — trời M8 thiếu huy hiệu M8', en: 'Cloud Gate (locked) — M8 sky without the M8 badge', desc: 'plan-41: đang bay 850 m ở trời M8, chưa có huy hiệu M8 → CỔNG MÂY lên Đèo 9 đang KHOÁ (mây xám + xích + ổ khoá, nhãn hồng Cần huy hiệu M8). Bay vào khe → báo lý do + bị đẩy lại; ra mép ngoài cổng → tường sương. Cổng Nam (↓ Đèo 8) vẫn mở.',
    save: d => ({ ...d, inv: { ...(d.inv || {}), copter: 2 }, name: 'Hùng', nation: 'Vietnamese', zone: 'sky_m8', entry: 'default', story: STORY('noxx'), badges: [1, 2, 3, 4, 5, 6, 7], hero: { lv: 32, xp: 0, hp: null }, sys: { ki: { v: 3, auto: true, tut: 1 }, pet: { pet: { name: 'Rocky', hunger: 100, bond: 30, born: Date.now(), xp: xpForLevel(46), hp: maxHpOf(46), cmd: 'attack', skills: { punch: 6, ha: 6, super: 1 }, lvMig: 1 } } } }),
    after: async C => { kit(C, 800, { sword: 5 }); if (C.hold) C.hold('sword'); if (C.clock && C.clock.set) C.clock.set({ hour: 9, minute: 0 }); const p = C.S.player, m = C.S.map; if (m && m.sky) { p.x = (m.w >> 1) * 16 + 8; p.y = 24 + 52; p.dir = 3; } } },
  cu: { vi: 'Save cũ (trước plan-25)', en: 'Old save (before plan-25)', desc: 'Save kiểu cũ: đã qua biển nhưng chưa có phe, chưa có Rocky. Game phải tự chuyển sang phe Noxx và Rocky bơi vào bờ tìm bạn.',
    save: d => ({ ...d, name: 'Hùng', nation: 'Vietnamese', zone: 'village', story: { act: 2, step: 127, seaDone: true, keepsake: true }, inv: { ...d.inv, stone: 60, wood: 10 } }) },
};
/* plan-38 (2026-10-15): Rocky cấp 50 đã ăn đủ 6 mảnh lõi trùm (mọi chiêu học được bậc 7), đứng vào thẳng trận từng trùm; mỗi mốc mang sẵn 2 chiêu khác nhau (đổi ở thẻ Rocky). */
{ const CORE_ALL = ['hacrocky', 'trongdong', 'guong', 'hoden', 'dongho', 'bakunawa'];
  const RK38 = eq => ({ name: 'Rocky', hunger: 100, bond: 40, born: Date.now(), xp: xpForLevel(50), hp: maxHpOf(50), cmd: 'protect', skills: { punch: 7, ha: 7, super: 1, clash: 7, quake: 7, mirror: 7, magnet: 7, petrify: 7, thunder: 7 }, lvMig: 1, cores: CORE_ALL.slice(), coreMig: 1, corePend: [], eq });
  const R38 = [['hacrocky', 'Hắc Rocky', 'Shadow Rocky', ['quake', 'thunder']], ['trongdong', 'Trống Đồng', 'Bronze Drum', ['mirror', 'thunder']], ['guong', 'Gương Địa Chấn', 'Quake Mirror', ['mirror', 'petrify']],
    ['hoden', 'Hố Đen Địa Tâm', 'Void Devourer', ['magnet', 'quake']], ['dongho', 'Đồng Hồ Đứt Dây', 'Broken-Spring Clock', ['clash', 'petrify']], ['bakunawa', 'Ngô Công Lôi Thần', 'Thunder Centipede God', ['thunder', 'quake']]];
  for (const [b, nv, ne, eq] of R38) { const base = PRESETS[b + '_fight']; if (!base) continue;
    PRESETS['rocky38_' + b] = { vi: `Rocky học chiêu trùm — đánh ${nv}`, en: `Rocky boss skills — vs ${ne}`, desc: `Như "${base.vi}" nhưng Rocky cấp 50 đã ăn đủ 6 mảnh lõi trùm (6 chiêu học được bậc 7), mang sẵn 2 chiêu (đổi ở Túi đồ → thẻ Rocky). Rocky tự dùng chiêu khi đánh; gõ tên chiêu ở ô chat (vd 'địa chấn', 'khiên') để gọi ngay.`,
      save: d => { const sv = base.save(d); const pk = (((sv.sys || {}).pet || {}).pet) || {}; return { ...sv, achievements: [...new Set([...(sv.achievements || []), ...CORE_ALL])], sys: { ...(sv.sys || {}), pet: { ...((sv.sys || {}).pet || {}), pet: { ...pk, ...RK38(eq) } } } }; },
      after: base.after }; }
  PRESETS.rocky38_eat = { vi: 'Rocky ăn mảnh lõi trùm (Làng)', en: 'Rocky eats a boss core (Village)', desc: 'Làng ban ngày, Rocky cấp 30. Vừa hạ Trống Đồng Thiên Lôi (thành tựu có, Rocky chưa ăn) → sau ~1 giây mảnh lõi rơi cạnh bạn, Rocky chạy tới ăn và học chiêu Địa Chấn. Có 3 con slime để thử chiêu.',
    save: d => ({ ...d, name: 'Hùng', nation: 'Vietnamese', zone: 'village', story: STORY('noxx'), achievements: [...(d.achievements || []), 'trongdong'], hero: { lv: 30, xp: 0, hp: null },
      sys: { pet: { pet: { name: 'Rocky', hunger: 100, bond: 30, born: Date.now(), xp: xpForLevel(30), hp: maxHpOf(30), cmd: 'protect', skills: { punch: 4, ha: 3, super: 0 }, lvMig: 1, cores: [], coreMig: 1, corePend: [], eq: [] } } } }),
    after: async C => { kit(C, 3000, { sword: 4 }); if (C.hold) C.hold('sword'); if (C.clock && C.clock.set) C.clock.set({ hour: 9, minute: 0 }); await wait(5000); if (window.__monsters) { window.__monsters.spawnKind('slime', 60, 0); window.__monsters.spawnKind('slime', 80, 14); window.__monsters.spawnKind('slime', 70, -12); } } };
}

/* plan-39 (2026-10-15): LINH THÚ — mốc thử. Đứng cạnh ổ linh thú của vùng (có sẵn món nó thích) / đánh trùm có linh thú đi cùng. */
{ const LTS = (owned, active) => ({ linhthu: { v: 1, owned, active, food: {} } });
  const RKP = lv => ({ pet: { name: 'Rocky', hunger: 100, bond: 30, born: Date.now(), xp: xpForLevel(lv), hp: maxHpOf(lv), cmd: 'protect', skills: { punch: 4, ha: 3, super: 0 }, lvMig: 1, cores: [], coreMig: 1, corePend: [], eq: [] } });
  const nearDen = async C => { for (let i = 0; i < 40 && !(window.__lt && window.__lt.den()); i++) await wait(150); const d = window.__lt && window.__lt.den(), p = C.S && C.S.player; if (d && p) { p.x = d.x; p.y = d.y + 40; p.dir = 3; } };
  const DEN = [['coc', 'village', 'Cóc Gọi Mưa', 'Rain-Call Toad', 'lt_food_coc', 12], ['cachep', 'sea', 'Cá Chép Vũ Môn', 'Dragon-Gate Carp', 'lt_food_cachep', 12], ['tete', 'm1', 'Tê Tê Cát', 'Sand Pangolin', 'lt_food_tete', 14],
    ['de', 'm2', 'Dế Mèn Chấn', 'Quake Cricket', 'lt_food_de', 16], ['saola', 'm3', 'Sao La Ngọc', 'Jade Saola', 'lt_food_saola', 18], ['chuichui', 'm4', 'Chuột Chũi Thạch Anh', 'Amethyst Mole', 'lt_food_chuichui', 20],
    ['daibang', 'm5', 'Đại Bàng Vực', 'Canyon Eagle', 'lt_food_daibang', 22], ['tacke', 'm6', 'Tắc Kè Gương', 'Mirror Gecko', 'lt_food_tacke', 24], ['kylan', 'm7', 'Kỳ Lân Lửa', 'Fire Qilin', 'lt_food_kylan', 26],
    ['hac', 'm8', 'Hạc Sấm', 'Thunder Crane', 'lt_food_hac', 28], ['kimquy', 'm9', 'Kim Quy', 'Golden Turtle', 'lt_food_kimquy', 30]];
  const raftOpen = C => {   /* 2026-10-15: ổ Cá Chép (lt_cachep) đặt bè sát đảo → bè kẹt, bấm hướng không đi được; dời bè ra ô nước THOÁNG gần nhất (3×3 quanh nó đều là nước) */
    const m = C.S && C.S.map, T = C.T || {}, p = C.S && C.S.player; if (!m || !p || !C.getG || !window.__raft || !(C.S.sea && C.S.sea.riding)) return; const W = [T.WATER, T.DEEP, T.REEF].filter(v => v != null), wet = (x, y) => W.includes(C.getG(m, x, y));
    const tx0 = Math.floor(p.x / 16), ty0 = Math.floor(p.y / 16); let best = null, bd = 1e9;
    for (let dy = -7; dy <= 7; dy++) for (let dx = -7; dx <= 7; dx++) { const x = tx0 + dx, y = ty0 + dy; let ok = true; for (let a = -1; a <= 1 && ok; a++) for (let b = -1; b <= 1; b++) if (!wet(x + a, y + b)) { ok = false; break; } if (ok && dx * dx + dy * dy < bd) { bd = dx * dx + dy * dy; best = { x, y }; } }
    if (best && bd > 0) window.__raft.warp(best.x, best.y); };
  for (const [id, z, nv, ne, food, lv] of DEN) PRESETS['lt_' + id] = { vi: `Linh thú — ổ ${nv} (${z})`, en: `Spirit beast — ${ne} nest (${z})`, desc: `Đứng cạnh ổ ${nv}: đánh nó cho đuối (≤ 30 % máu, nó nằm thở) rồi bấm E / A cạnh nó để cho ăn món nó thích (có sẵn 3 trong túi) — đứng yên ~2 giây là thu phục. Người cấp ${lv}, kiếm cấp 3, Rocky đi cùng.`,
    save: d => ({ ...d, name: 'Hùng', nation: 'Vietnamese', zone: z, story: STORY('noxx'), badges: [1, 2, 3, 4, 5, 6, 7, 8, 9].slice(0, Math.max(0, +(z.slice(1)) || 0)), hero: { lv, xp: 0, hp: null }, sys: { ...RKP(Math.min(50, lv + 5)), ...LTS({}, null) } }),
    after: async C => { kit(C, 2000, { sword: 3 }); if (C.hold) C.hold('sword'); C.bag.add(food, 3); if (C.clock && C.clock.set) C.clock.set({ hour: 9, minute: 0 }); await nearDen(C); if (z === 'sea') raftOpen(C); } };
  PRESETS.coc_vung = { vi: 'Cóc — thử chiêu 2 Nhảy Vũng Dập Nước (3 vũng + slime)', en: 'Toad — skill 2 Pool Hop Splash test (3 pools + slimes)', desc: 'Làng, cạnh ổ Cóc: đã có Cóc cấp 12 trong Ấn Linh, 3 vũng nước 2×2 vừa đào quanh đây và vài slime. Bấm Gọi để ném Cóc ra — Cóc nhảy qua các vũng dập nước. (2026-10-15 bản thử)',
    save: d => ({ ...d, name: 'Hùng', nation: 'Vietnamese', zone: 'village', story: STORY('noxx'), hero: { lv: 20, xp: 0, hp: null }, sys: { ...RKP(25), ...LTS({ coc: { lv: 12, xp: 0, evo: 0, lk: 0 } }, 'coc') } }),
    after: async C => { kit(C, 2000, { sword: 3 }); if (C.hold) C.hold('sword'); if (C.clock && C.clock.set) C.clock.set({ hour: 9, minute: 0 }); await nearDen(C); const dn = window.__lt && window.__lt.den(), m = C.S && C.S.map; if (!dn || !m) return; const spot = { x: dn.tx, y: dn.ty + 3 }; for (const [dx, dy] of [[-5, 0], [-2, 3], [-6, 4]]) for (let a = -1; a <= 0; a++) for (let b = -1; b <= 0; b++) { const x = spot.x + dx + a, y = spot.y + dy + b; if (window.__ponds && window.__ponds.dig) window.__ponds.dig(x, y); if (C.setG && C.T) C.setG(m, x, y, C.T.WATER, true); } const p = C.S.player; p.x = (spot.x - 4) * 16 + 8; p.y = (spot.y + 2) * 16 + 10; await wait(1500); if (window.__monsters) { window.__monsters.spawnKind('slime', -40, -10); window.__monsters.spawnKind('slime', 10, 40); window.__monsters.spawnKind('slime', -60, 60); } } };   /* 2026-10-15: mốc thử chiêu 2 Cóc cho anh (ao đào sẵn) */
  PRESETS.coc_thuyphao = { vi: 'Cóc Thần Vũ — thử TUYỆT CHIÊU Thuỷ Pháo Địa Chấn (cấp 20)', en: 'Rain God Toad — ultimate Quake Water Cannon test (lv 20)', desc: 'Làng, cạnh ổ Cóc: Cóc Thần Vũ cấp 20 đầy Linh Khí trong Ấn Linh, 3 vũng nước đào sẵn, 5 slime xếp hàng phía đông. Bấm Gọi để ném Cóc ra — thân rung tụ nước rồi phun tia nước ≤ 6 ô, chỗ tia đập đất toả 2 vòng sóng bùn làm khựng quái. Gõ chat "thuỷ pháo địa chấn" để gọi lại khi đầy Linh Khí (hồi 60 s). (2026-10-16 bản thử)',
    save: d => ({ ...d, name: 'Hùng', nation: 'Vietnamese', zone: 'village', story: STORY('noxx'), hero: { lv: 20, xp: 0, hp: null }, sys: { ...RKP(25), ...LTS({ coc: { lv: 20, xp: 0, evo: 1, lk: 100 } }, 'coc') } }),
    after: async C => { kit(C, 2000, { sword: 3 }); if (C.hold) C.hold('sword'); if (C.clock && C.clock.set) C.clock.set({ hour: 9, minute: 0 }); await nearDen(C); const dn = window.__lt && window.__lt.den(), m = C.S && C.S.map; if (!dn || !m) return; const spot = { x: dn.tx, y: dn.ty + 3 }; for (const [dx, dy] of [[-5, 0], [-2, 3], [-6, 4]]) for (let a = -1; a <= 0; a++) for (let b = -1; b <= 0; b++) { const x = spot.x + dx + a, y = spot.y + dy + b; if (window.__ponds && window.__ponds.dig) window.__ponds.dig(x, y); if (C.setG && C.T) C.setG(m, x, y, C.T.WATER, true); } const p = C.S.player; p.x = (spot.x - 4) * 16 + 8; p.y = (spot.y + 2) * 16 + 10; await wait(1500); if (window.__monsters) for (const dx of [40, 56, 72, 88, 104]) window.__monsters.spawnKind('slime', dx, 4); } };   /* 2026-10-16: mốc thử tuyệt chiêu Cóc cho anh */
  PRESETS.coc_mua = { vi: 'Cóc — thử chiêu 3 Gọi Mưa (sân khô + slime)', en: 'Toad — skill 3 Rain Call test (dry field + slimes)', desc: 'Vùng 2 (cạnh ổ Dế), chỗ khô không có nước: Cóc cấp 12 đầy Linh Khí trong Ấn Linh, vài slime quanh đây. Bấm Gọi để ném Cóc ra — Cóc ngửa mặt kêu gọi mưa (6 s), mưa hồi máu phe mình, để lại vũng tạm cho Nhảy Vũng Dập Nước. Gõ chat "gọi mưa" để gọi lại khi đầy Linh Khí. (2026-10-15 bản thử)',
    save: d => ({ ...d, name: 'Hùng', nation: 'Vietnamese', zone: 'm2', story: STORY('noxx'), hero: { lv: 20, xp: 0, hp: null }, sys: { ...RKP(25), ...LTS({ coc: { lv: 12, xp: 0, evo: 0, lk: 100 } }, 'coc') } }),
    after: async C => { kit(C, 2000, { sword: 3 }); if (C.hold) C.hold('sword'); if (C.clock && C.clock.set) C.clock.set({ hour: 10, minute: 0 }); await nearDen(C); const p = C.S.player, dn = window.__lt && window.__lt.den(); if (dn) { p.x = (dn.tx + 5) * 16 + 8; p.y = (dn.ty + 4) * 16 + 10; } if (window.__lt && window.__lt.lk) window.__lt.lk(100); await wait(1500); if (window.__monsters) { window.__monsters.spawnKind('slime', 50, -10); window.__monsters.spawnKind('slime', 60, 30); window.__monsters.spawnKind('slime', -50, 40); window.__monsters.spawnKind('slime', 20, 60); } } };   /* 2026-10-15: mốc thử chiêu 3 Gọi Mưa cho anh chơi trên điện thoại */
  const D1 = { coc: { lv: 22, xp: 0, evo: 1, lk: 60 }, cachep: { lv: 21, xp: 0, evo: 1, lk: 60 }, tete: { lv: 22, xp: 0, evo: 1, lk: 60 } };
  const ALL = {}; for (const [id, , , , , lv] of DEN) ALL[id] = { lv: Math.max(22, lv), xp: 0, evo: 1, lk: 80 };
  const boss = (key, owned, active, nv, ne, note) => { const base = PRESETS['rocky38_' + key] || PRESETS[key + '_fight']; if (!base) return;
    PRESETS['lt_' + key + '_' + active] = { vi: `Linh thú ${nv} — đánh trùm (${key})`, en: `${ne} — boss fight (${key})`, desc: `Như "${base.vi}" nhưng có linh thú ${nv} (đã tiến hoá) đi cùng. ${note}`,
      save: d => { const sv = base.save(d); return { ...sv, sys: { ...(sv.sys || {}), ...LTS(owned, active) } }; }, after: base.after }; };
  boss('trongdong', D1, 'tete', 'Tê Tê Giáp Đá', 'Stone-Plate Pangolin', 'Đã bắt đủ 3 loài đợt 1 (Cóc, Cá Chép, Tê Tê) — đổi con đi cùng ở Túi đồ → thẻ Rocky.');
  boss('hacrocky', D1, 'coc', 'Cóc Thần Vũ', 'Rain God Toad', 'Hệ Nước: chỉ ra chiêu khi có nước gần (sân Hắc Rocky không có nước → thử chat “gọi mưa”).');
  boss('dongho', ALL, 'kylan', 'Lân Hoàng', 'Qilin Emperor', 'Đã bắt đủ 11 loài (đều tiến hoá).');
  boss('bakunawa', ALL, 'hac', 'Hạc Thiên Lôi', 'Heaven-Bolt Crane', 'Đã bắt đủ 11 loài (đều tiến hoá).');
  /* 2026-10-15 Ấn Linh nâng cấp: đội 3 con + thẻ Ấn Linh trong Túi đồ */
  const SIX = {}; for (const [id, , , , , lv] of DEN.slice(0, 6)) SIX[id] = { lv: Math.max(22, lv), xp: 0, evo: id === 'tete' ? 1 : 0, lk: 80 };
  const slimes = async () => { await wait(4000); if (window.__monsters) { window.__monsters.spawnKind('slime', 70, 0); window.__monsters.spawnKind('slime', 90, 18); window.__monsters.spawnKind('slime', 80, -16); window.__monsters.spawnKind('slime', -80, 10); } };
  PRESETS.anlinh_test = { vi: 'Ấn Linh cấp 3 — gọi cả đội 3 linh thú', en: 'Spirit Seal level 3 — call a team of 3', desc: 'Làng ban ngày. Ấn Linh cấp 3, đã bắt 6 loài, đội: Cóc · Tê Tê · Sao La. Bấm “Gọi” (máy tính: U) để ném cả đội ra đánh 4 con slime gần đó, bấm “Thu” để thu cả đội. Túi đồ → thẻ Ấn Linh: xem / đổi đội hình.',
    save: d => ({ ...d, name: 'Hùng', nation: 'Vietnamese', zone: 'village', story: STORY('noxx'), hero: { lv: 30, xp: 0, hp: null }, sys: { ...RKP(35), linhthu: { v: 1, owned: SIX, active: 'coc', team: ['coc', 'tete', 'saola'], orbLv: 3, food: {} } } }),
    after: async C => { kit(C, 2000, { sword: 4 }); if (C.hold) C.hold('sword'); C.bag.add('ngoc_linh', 4); if (C.clock && C.clock.set) C.clock.set({ hour: 9, minute: 0 }); await slimes(); } };
  PRESETS.anlinh_up = { vi: 'Ấn Linh cấp 1 — thử nâng cấp', en: 'Spirit Seal level 1 — try upgrading', desc: 'Làng. Ấn Linh cấp 1 (1 ô), đã bắt 6 loài, có 1500 đá + 12 Ngọc Linh: Túi đồ → thẻ Ấn Linh → Nâng cấp lên 2 rồi 3, thêm linh thú vào đội, rồi bấm “Gọi” đánh slime.',
    save: d => ({ ...d, name: 'Hùng', nation: 'Vietnamese', zone: 'village', story: STORY('noxx'), hero: { lv: 30, xp: 0, hp: null }, sys: { ...RKP(35), linhthu: { v: 1, owned: SIX, active: 'coc', team: ['coc'], orbLv: 1, food: {} } } }),
    after: async C => { kit(C, 1500, { sword: 4 }); if (C.hold) C.hold('sword'); C.bag.add('ngoc_linh', 12); if (C.clock && C.clock.set) C.clock.set({ hour: 9, minute: 0 }); await slimes(); } };
}
function chip(id, p, vi) {   /* nhãn ô lưu test: đang ở điểm lưu nào + nút làm lại.
   2026-10-15 anh: KHÔNG được che nút điều khiển (đã che nút Gọi linh thú) → mở 5 s rồi thu thành huy hiệu 🧪 (bấm để mở lại 6 s), luôn tự tìm chỗ trống không đè nút / thanh nào */
  const el = document.createElement('div'); el.id = 'preset-chip';
  el.style.cssText = 'position:fixed;z-index:9;background:rgba(13,11,20,.88);border:2px solid #ffd45e;border-radius:8px;padding:4px 8px;color:#f2ebe0;font:12px VT323,monospace;cursor:pointer;user-select:none';
  const full = `🧪 <b>${vi ? p.vi : p.en}</b><br><span style="opacity:.75">${vi ? 'Ô lưu test riêng · save thật không đổi' : 'Separate test slot · real save untouched'}</span><br><a href="?preset=${id}&reset" style="color:#ffd45e">${vi ? '↺ Làm lại từ đầu mốc này' : '↺ Restart this checkpoint'}</a>`;
  let open = true, tm = 0;
  const SEL = '#herobar, #hotbar, #lt-orb, #touch button, #touch .dpad, .dpad, #joy, #mslots > *, #btn-a, #btn-chat, #btn-tgt, #btn-menu, #btn-photo, #btn-rot, #btn-map, #btn-codex, #btn-fs, #btn-dragon, #btn-copter, .sky-btn, #altw, #px-clock, #px-status, #px-money, #seis, #hud .hud-tl, #hud .hud-tr, #touch-skills, #rk-chat, #faint-ui, #px-notes .pn';   /* p52d: không đè thông báo */
  const imp = (k, v) => el.style.setProperty(k, v, 'important');
  function place() {
    if (!el.isConnected) return; const W = innerWidth, H = innerHeight, w = el.offsetWidth, h = el.offsetHeight, taken = [];
    for (const e of document.querySelectorAll(SEL)) { if (e === el || e.hidden || e.closest('[hidden]')) continue; const cs = getComputedStyle(e); if (cs.display === 'none' || cs.visibility === 'hidden') continue; const q = e.getBoundingClientRect(); if (q.width > 1 && q.height > 1) taken.push(q); }
    const free = (x, y) => x >= 4 && y >= 4 && x + w <= W - 4 && y + h <= H - 4 && !taken.some(q => !(x + w <= q.left - 4 || x >= q.right + 4 || y + h <= q.top - 4 || y >= q.bottom + 4));
    const cx = Math.round((W - w) / 2), cands = [];
    for (let y = 6; y < H * 0.45; y += 30) for (const x of [cx, cx - 160, cx + 160, 6, W - w - 6]) cands.push([x, y]);
    for (let y = Math.round(H * 0.45); y < H - h; y += 30) for (const x of [6, W - w - 6]) cands.push([x, y]);
    const at = cands.find(([x, y]) => free(x, y)) || [cx, 6];
    imp('left', at[0] + 'px'); imp('top', at[1] + 'px'); imp('right', 'auto'); imp('bottom', 'auto'); imp('max-width', Math.min(260, W - 12) + 'px'); imp('width', 'auto');
  }
  function set(o) {
    open = o; clearTimeout(tm); el.innerHTML = o ? full : '🧪'; el.title = o ? '' : (vi ? `Ô lưu test: ${p.vi} — bấm để xem` : `Test slot: ${p.en} — tap to show`);
    imp('padding', o ? '4px 8px' : '1px 5px'); place(); if (o) tm = setTimeout(() => set(false), 6000);
  }
  el.addEventListener('pointerdown', e => { if (e.target.closest('a')) return; e.preventDefault(); e.stopPropagation(); set(!open); });
  document.body.appendChild(el); set(true); clearTimeout(tm); tm = setTimeout(() => set(false), 5000);
  setInterval(place, 1000);   /* HUD đổi (thanh công cụ hiện / ẩn, bay, xoay máy) → tìm lại chỗ */
  window.__chip = { open: () => open, set, place };   /* móc test */
}

/* p72:preset:begin */
/* p72 (plan-51 S3): linh thú đấu như Chấn Thú — đội Ấn Linh (Kỳ Lân Lửa Lv19 dạng gốc, 4 chiêu) + Chấn Thú bệ Làng; linh thú được gọi ra đi cùng nên ra trận trước.
   Link thử: ?preset=lt_duel_test&reset&lang=vi (thêm &team=3v3 → đấu 3 con linh thú; &team=6v6 → 3 linh thú + 2 Chấn Thú + bù). Huấn luyện viên đứng cạnh lối vào Làng. */
PRESETS.lt_duel_test = { vi: 'Linh thú đấu như Chấn Thú (Kỳ Lân Lửa)', en: 'Spirit beasts battle as Chấn Thú (Fire Qilin)', desc: 'plan-51 (p72). Làng, có đủ 11 linh thú (đổi đội ở thẻ Ấn Linh — mỗi con có khối ⚔ Chấn Thú); đội Ấn Linh: Kỳ Lân Lửa Lv19 · Tê Tê Lv20 · Hạc Lv20 (đang đi cùng bạn) + đội Chấn Thú 2 con (Bánh Bao, Lôi Hồ). Con Lv20 chưa hoá sẽ TIẾN HOÁ sau trận. E cạnh huấn luyện viên ở lối vào → Đồng ý: Kỳ Lân được thu vào Ấn Linh rồi ra sân đấu (4 chiêu: Phun Lửa · Lốc Lửa · Lao Lửa · Nắng Gắt; tuyệt chiêu Núi Lửa mở ở Lv20). Hết trận: cộng kinh nghiệm, thắng / thua ghi vào thẻ Ấn Linh, thú tự ra lại. &team=3v3 → đấu 3 đấu 3.',
  save: d => ({ ...d, name: 'Hùng', nation: 'Vietnamese', zone: 'village', entry: 'default', story: STORY('noxx'), hero: { lv: 20, xp: 0, hp: null },
    sys: { pet: ROCKY(), linhthu: { v: 1, owned: { kylan: { lv: 19, xp: 0, evo: 0, lk: 0 }, tete: { lv: 20, xp: 0, evo: 0, lk: 0 }, hac: { lv: 20, xp: 0, evo: 0, lk: 0 }, coc: { lv: 18, xp: 0, evo: 0, lk: 0 }, cachep: { lv: 22, xp: 0, evo: 1, lk: 0 }, de: { lv: 16, xp: 0, evo: 0, lk: 0 }, saola: { lv: 21, xp: 0, evo: 1, lk: 0 }, chuichui: { lv: 20, xp: 0, evo: 0, lk: 0 }, daibang: { lv: 20, xp: 0, evo: 0, lk: 0 }, tacke: { lv: 20, xp: 0, evo: 0, lk: 0 }, kimquy: { lv: 24, xp: 0, evo: 1, lk: 0 } }, active: 'kylan', team: ['kylan', 'tete', 'hac'], orbLv: 3, food: {} },
      chanthu: { v: 1, starter: 'banhbao', team: [{ id: 1, sp: 'banhbao', lv: 19, name: 'Bánh Bao' }, { id: 2, sp: 'loiho', lv: 19, name: 'Tia Chớp' }], box: [], anThu: 3, nextId: 3, caught: 0 } } }),
  after: async C => { kit(C, 200); await wait(500); if (C.linhthu && C.linhthu.press) C.linhthu.press(); } };
/* p72:preset:end */
/* p73:preset:begin */
/* p73 (8 chiêu độc lạ ★): trận thử từng loài có chiêu mới — đứng cạnh huấn luyện viên ở lối vào Làng, E → Đồng ý. Đổi loài bằng &my=…&foe=… trên link:
   chuichui (Vòng Dư Chấn) · rongdo (Bẫy Lò Than) · cachep (Đổi Dòng) · diepnhan (Hình Nhân Lá) · bovimach (Hoàn Tác) · de (Khúc Tàn Canh) · culibong (Rình Sơ Hở) · tacke (Gương Hồi Quang).
   Link: ?preset=chieumoi_test&reset&lang=vi&team=1v1&my=chuichui&foe=golem — phím 1–5 (điện thoại: nút dưới màn) gọi chiêu theo thứ tự bộ chiêu. */
PRESETS.chieumoi_test = { vi: 'Chiêu độc lạ — thử 8 chiêu mới', en: 'Odd moves — try the 8 new moves', desc: 'p73. Làng, huấn luyện viên đứng cạnh lối vào (bạn đứng ngay trước mặt). E → Đồng ý → đấu 1v1 với loài trên link (&my=…). Loài có chiêu mới: Chuột Chũi (Vòng Dư Chấn), Xích Long / Hoả Hùng (Bẫy Lò Than), Cá Chép (Đổi Dòng), Diệp Nhẫn Giả (Hình Nhân Lá), Bọ Vi Mạch (Hoàn Tác), Dế (Khúc Tàn Canh), Cu Li Bóng (Rình Sơ Hở), Tắc Kè (Gương Hồi Quang).',
  save: d => ({ ...d, name: 'Hùng', nation: 'Vietnamese', zone: 'village', entry: 'default', story: STORY('noxx'), sys: { pet: ROCKY() } }),
  after: async C => { kit(C, 50); await wait(400); try { const p = C.S.player; if (window.__duel && __duel.host) { const h = __duel.host(); if (h) { p.x = h.x - 14; p.y = h.y + 2; p.dir = 2; } } } catch (e) { } } };
/* p73:preset:end */
/* p97:preset:begin */
/* p97 (plan-93): Chấn Thú ẾCH OA LÌ. Link:
   ?preset=p97_bat&reset&lang=vi   — M1, trời MƯA, đứng cạnh ao: Oa Lì hiếm hiện → E → trận 1v1 → ≤ 30 % máu ném Ấn Thu (5 viên).
   ?preset=p97_dau&reset&lang=vi&team=1v1&my=oali&foe=bachkinh — Làng: đấu thử Oa Lì Lv20 (đổi &my=oalipho / laooa để xem 2 dạng tiến hoá).
   ?preset=p97_tienhoa&reset&lang=vi — Làng: Oa Lì Lv15 + 200 Tiềm Năng Triều → phím T (✦ Tiềm Năng) rót 1 lần → Lv16 TIẾN HOÁ thành Oa Lì Phố; rót tiếp tới Lv32 → Lão Oa Đại Ca. */
const EN97 = () => { try { return new URLSearchParams(location.search).get('lang') === 'en'; } catch (e) { return false; } };
function pondSpot97(C) {   /* ô đất khô cách ô nước gần lối vào nhất 2–3 ô */
  const m = C.S.map, T = C.T || {}, e = (m.entries && m.entries.default) || { x: m.w >> 1, y: m.h >> 1 }; let best = null; if (T.WATER == null) return null;
  const dry = (x, y) => x > 0 && y > 0 && x < m.w - 1 && y < m.h - 1 && !C.isSolid(m, x, y) && C.getG(m, x, y) !== T.WATER && C.getG(m, x, y) !== T.DEEP;
  for (let y = 1; y < m.h - 1; y++) for (let x = 1; x < m.w - 1; x++) { const g = C.getG(m, x, y); if (g !== T.WATER) continue; const d = Math.hypot(x - e.x, y - e.y); if (best && d >= best.d) continue;
    for (const [i, j] of [[0, 3], [3, 0], [-3, 0], [0, -3], [2, 2], [-2, 2]]) if (dry(x + i, y + j) && dry(x + i, y + j + 1)) { best = { d, x: x + i, y: y + j }; break; } }
  return best;
}
PRESETS.p97_bat = { vi: 'Ếch Oa Lì — bắt ở ao lúc mưa (M1)', en: 'Croaksmug — catch it by a pond in the rain (M1)', desc: 'p97 (plan-93). M1, trời mưa, bạn đứng cạnh ao. Oa Lì (Hiếm, hệ Triều) chỉ hiện ở ao / đầm khi mưa: 1 dòng thông báo + biểu tượng hiếm trên đầu. E cạnh nó → trận 1v1 (Lôi Hồ Lv20 của bạn). Còn ≤ 30 % máu → ném Ấn Thu (5 viên).',
  save: d => ({ ...d, name: 'Hùng', nation: 'Vietnamese', zone: 'm1', entry: 'default', story: STORY('noxx'), badges: [1], hero: { lv: 12, xp: 0, hp: null }, clock: { season: 'spring', day: 1, year: 1, min: 360 },
    sys: { pet: ROCKY(), chanthu: { v: 1, starter: 'loiho', team: [{ id: 1, sp: 'loiho', lv: 20, name: EN97() ? 'Volt Fox' : 'Lôi Hồ' }], box: [], anThu: 5, nextId: 2, caught: 0, tn: {} } } }),
  after: async C => { kit(C, 200); const s = pondSpot97(C); if (s) { C.S.player.x = s.x * 16 + 8; C.S.player.y = s.y * 16 + 12; } if (C.clock && C.clock.set) C.clock.set({ hour: 12, minute: 0 }); await wait(300);
    if (C.chanthu && C.chanthu.setWx) C.chanthu.setWx({ night: false, dawn: false, rain: true, storm: false }); } };
PRESETS.p97_dau = { vi: 'Ếch Oa Lì — đấu thử 5 chiêu', en: 'Croaksmug — try its 5 moves', desc: 'p97 (plan-93). Làng, huấn luyện viên cạnh lối vào. E → Đồng ý → 1v1: Oa Lì đấu loài trên link (&foe=…). 5 chiêu: Bọt Ộp · Bụng Phệ Đè (lao tới) · Kính Đen Lì Đòn · Lưỡi Kéo Về (chiêu riêng) · Cốc Lũ Vô Đáy (tuyệt chiêu). &my=oalipho / laooa: 2 dạng tiến hoá.',
  save: d => ({ ...d, name: 'Hùng', nation: 'Vietnamese', zone: 'village', entry: 'default', story: STORY('noxx'), sys: { pet: ROCKY() } }),
  after: async C => { kit(C, 50); await wait(400); try { const p = C.S.player; if (window.__duel && __duel.host) { const h = __duel.host(); if (h) { p.x = h.x - 14; p.y = h.y + 2; p.dir = 2; } } } catch (e) { } } };
PRESETS.p97_tienhoa = { vi: 'Ếch Oa Lì — nâng cấp + tiến hoá', en: 'Croaksmug — level up + evolve', desc: 'p97 (plan-93). Làng. Đội: Oa Lì Lv15 (ra đầu) + 200 Tiềm Năng Triều. Phím T / chạm ✦ Tiềm Năng → rót vào Oa Lì: Lv16 TIẾN HOÁ thành Oa Lì Phố (mũ đỏ + khăn), rót tiếp tới Lv32 → Lão Oa Đại Ca (mũ phớt, kính đen, tẩu; thêm hệ Âm, chiêu Vòng Khói Tẩu).',
  save: d => ({ ...d, name: 'Hùng', nation: 'Vietnamese', zone: 'village', entry: 'default', story: STORY('noxx'), hero: { lv: 6, xp: 0, hp: null },
    sys: { pet: ROCKY(), chanthu: { v: 1, starter: 'oali', team: [{ id: 1, sp: 'oali', lv: 15, name: EN97() ? 'Croaksmug' : 'Oa Lì' }, { id: 2, sp: 'loiho', lv: 20, name: EN97() ? 'Volt Fox' : 'Lôi Hồ' }], box: [], anThu: 5, nextId: 3, caught: 1, tn: { trieu: 200 } } } }),
  after: async C => { kit(C, 200); } };
/* p97:preset:end */
/* p74:preset:begin */
/* p74 (plan-74 đợt 0): Làng có Chấn Thú hoang thay quái — Chuột Chũi (Chấn, phá hoại: đêm hung + khó) + Cóc (Triều).
   Đội: Lôi Hồ Lv20 (khởi đầu) + Chuột Chũi Lv3 + Cóc Lv3 (đã bắt, để thử Tiềm Năng cùng hệ), 5 Ấn Thu, kiếm cấp 2. Cạnh bạn sẵn 1 Chuột Chũi + 1 Cóc.
   Link: ?preset=p74_lang&reset&lang=vi (ban ngày 9:00) · ?preset=p74_dem&reset&lang=vi (ban đêm 21:00). */
const EN = () => { try { return new URLSearchParams(location.search).get('lang') === 'en'; } catch (e) { return false; } };   /* tên đặt sẵn theo ngôn ngữ link */
const P74 = (hour) => ({
  save: d => ({ ...d, name: 'Hùng', nation: 'Vietnamese', zone: 'village', entry: 'default', story: STORY('noxx'), hero: { lv: 6, xp: 0, hp: null },
    sys: { pet: ROCKY(), chanthu: { v: 1, starter: 'loiho', team: [{ id: 1, sp: 'loiho', lv: 20, name: EN() ? 'Volt Fox' : 'Lôi Hồ' }, { id: 2, sp: 'chuichui', lv: 3, name: EN() ? 'Molly' : 'Chũi Con' }, { id: 3, sp: 'coc', lv: 3, name: EN() ? 'Toadie' : 'Cóc Con' }], box: [], anThu: 5, nextId: 4, caught: 2, tn: {} } } }),
  after: async C => { kit(C, 300, { sword: 2 }); if (C.hold) C.hold('sword'); if (C.clock && C.clock.set) C.clock.set({ hour, minute: 0 }); await wait(900);
    if (window.__fct) { window.__fct.spawn('chuichui', 56, -10); window.__fct.spawn('coc', -60, 14); } } });
PRESETS.p74_lang = { vi: 'Chấn Thú hoang ở Làng (ban ngày)', en: 'Wild Chấn Thú in the Village (day)', desc: 'p74 (plan-74 đợt 0). Làng 9:00: quái thường đã thành Chấn Thú hoang — Chuột Chũi + Cóc. Ban ngày trung lập: chém nó thì nó (và đồng loại gần đó) đánh lại bằng chiêu như sàn đấu. Còn ≤ 30 % máu → choáng, nút Ấn Thu dưới chân. Thú chưa nổi giận: đến gần bấm E → đấu 1v1. Hạ thú → Tiềm Năng theo hệ (chạm ✦ Tiềm Năng / phím T) để nâng cấp Chấn Thú cùng hệ.', ...P74(9) };
PRESETS.p74_dem = { vi: 'Chấn Thú hoang ở Làng (ban đêm)', en: 'Wild Chấn Thú in the Village (night)', desc: 'p74 (plan-74 đợt 0). Làng 21:00: Chuột Chũi (loài phá hoại) hung và khó hơn rõ (máu ×1,7, sức ×1,4, ra chiêu dày hơn, cấp +2), tự lao vào đánh, gặm cây trồng, săn dân. Cóc vẫn trung lập.', ...P74(21) };
/* p74:preset:end */
/* p78:preset:begin */
/* p78 (plan-78 đợt mẫu): KHO CHIÊU hệ Chấn. Đội Chấn Thú đã xếp bộ (mv / ult), Rocky Lv25 biết 3 chiêu Chấn, 30 Tiềm Năng Chấn, Chũi Lv19 sắp tiến hoá.
   ?preset=p78_chan&reset&lang=en — Làng 9:00, huấn luyện viên cạnh lối vào (E → đấu), Chũi hoang Lv30 gần đó (biết Đào Hầm Vồ + Đá Vụn Bắn).
   ?preset=p78_duel&reset&lang=vi&team=1v1&my=chuichui2&foe=tete2&lv78=32 — trận thử: cả 2 đội tự xếp bộ theo cấp (đứng trước huấn luyện viên → E, E). */
const EN78 = () => { try { return new URLSearchParams(location.search).get('lang') === 'en'; } catch (e) { return false; } };
const P78T = () => [
  { id: 1, sp: 'chuichui2', lv: 32, name: EN78() ? 'Crystal Mole King' : 'Chũi Vương Pha Lê', mv: ['da_vun_ban', 'dao_ham_vo', 'vong_du_chan', 'thu_the'], ult: 'dai_dia_chan' },
  { id: 2, sp: 'nguuson', lv: 40, name: EN78() ? 'Mountain Ox' : 'Ngưu Sơn', mv: ['nem_da', 'lan_xa', 'dia_tu', 'gam'], ult: 'son_bang' },
  { id: 3, sp: 'tete2', lv: 36, name: EN78() ? 'Stone-Plate Pangolin' : 'Tê Tê Giáp Đá', mv: ['cat_lun', 'dao_ham_vo', 'lan_xa', 'gong_chiu'], ult: 'dai_dia_chan' },
  { id: 4, sp: 'golem', lv: 40, name: EN78() ? 'Quake Golem' : 'Thạch Chấn Vương', mv: ['da_vun_ban', 'dia_tu', 'ngu_bu', 'cot_da'], ult: 'son_bang' },
  { id: 5, sp: 'chuichui', lv: 19, name: EN78() ? 'Molly' : 'Chũi Con' } ];
const ROCKY78 = () => ({ pet: { name: 'Rocky', hunger: 100, bond: 30, born: Date.now(), xp: xpForLevel(40), hp: maxHpOf(40), cmd: 'protect', skills: { punch: 5, ha: 5, super: 3 }, lvMig: 1, eq: ['da_vun_ban', 'vong_du_chan', 'dao_ham_vo'], hoc: ['da_vun_ban', 'vong_du_chan', 'dao_ham_vo'] } });   /* Rocky Lv40: 4 ô chung, Siêu Cấp bậc 3 */
PRESETS.p78_chan = { vi: 'Kho chiêu hệ Chấn (Sắp Chiêu · chiêu mới · Rocky)', en: 'Quake move pool (Moves · new moves · Rocky)', desc: 'p78 (plan-78 đợt mẫu). Làng 9:00. Đội 5 Chấn Thú hệ Chấn đã xếp bộ chiêu mới (bảng Đội → ⚙ Sắp Chiêu). Huấn luyện viên cạnh lối vào: E → đấu. Chũi hoang Lv30 gần đó ra Đào Hầm Vồ / Đá Vụn Bắn. Rocky Lv25 tự dùng Đá Vụn Bắn · Vòng Dư Chấn · Đào Hầm Vồ. Có 30 Tiềm Năng Chấn: rót cho Chũi Con Lv19 → Lv20 tiến hoá (cảnh Thức Tỉnh).',
  save: d => ({ ...d, name: 'Hùng', nation: 'Vietnamese', zone: 'village', entry: 'default', story: STORY('noxx'), hero: { lv: 12, xp: 0, hp: null }, sys: { pet: ROCKY78(), chanthu: { v: 1, starter: 'chuichui', team: P78T(), box: [], anThu: 8, nextId: 6, caught: 3, tn: { chan: 30 } } } }),
  after: async C => { kit(C, 300, { sword: 3 }); if (C.hold) C.hold('sword'); if (C.clock && C.clock.set) C.clock.set({ hour: 9, minute: 0 }); await wait(900);
    try { const p = C.S.player; if (window.__duel && __duel.spawnHost) { __duel.spawnHost(p.x + 30, p.y - 4); } if (window.__k78) __k78.spawnLv('chuichui', 30, -70, 26); } catch (e) { } } };
PRESETS.p78_duel = { vi: 'Thử trận kho chiêu (cấp theo link)', en: 'Move-pool battle test (level from link)', desc: 'p78. Làng, huấn luyện viên ngay trước mặt: E, E → trận. Link: &team=1v1&my=<loài>&foe=<loài>&lv78=<cấp> (cả 2 bên tự xếp bộ theo cấp) &mv78=<4 chiêu>,<tuyệt chiêu> (ép bộ bên mình).',
  save: d => ({ ...d, name: 'Hùng', nation: 'Vietnamese', zone: 'village', entry: 'default', story: STORY('noxx'), sys: { pet: ROCKY() } }),
  after: async C => { kit(C, 50); await wait(400); try { const p = C.S.player; if (window.__duel && __duel.spawnHost) { __duel.spawnHost(p.x + 18, p.y - 2); const h = __duel.host(); if (h) { p.x = h.x - 14; p.y = h.y + 2; p.dir = 2; } } } catch (e) { } } };
/* p78:preset:end */
/* p79:preset:begin */
/* p79 (plan-79 đợt 1): ?preset=p79_lang&reset&lang=vi — Làng 9:00, đội 5 Chấn Thú (p78), KHÔNG còn huấn luyện viên; Chũi + Cóc hoang gần lối vào.
   Phím J / ô Ấn Chấn: thả Chũi Vương ra (đi theo, tự cắn quái thường). Gặp Chũi / Cóc hoang: bấm E → đấu TẠI CHỖ. */
PRESETS.p79_lang = { vi: 'Thả Chấn Thú · đấu tại chỗ (Làng)', en: 'Send out your Quake Beast · battle on the spot (Village)', desc: 'p79 (plan-79 đợt 1). Làng 9:00. Phím J / ô Ấn Chấn: thả con đầu đội ra đi theo bạn, tự đánh quái thường. Gặp Chũi / Cóc hoang: lại gần bấm E → đấu ngay tại chỗ, không chuyển sân. Không còn huấn luyện viên ngoài map.',
  save: d => ({ ...PRESETS.p78_chan.save(d) }),
  after: async C => { kit(C, 300, { sword: 3 }); if (C.hold) C.hold('sword'); if (C.clock && C.clock.set) C.clock.set({ hour: 9, minute: 0 }); await wait(900);
    try { if (window.__fct) { window.__fct.spawn('chuichui', 70, -10); window.__fct.spawn('coc', -70, 16); } } catch (e) { } } };
/* p79:preset:end */
/* p80:preset:begin */
/* p80 (plan-80 đợt 1): ?preset=p80_old&reset&lang=vi — save CŨ: Rìu 2, Cuốc 3, Xẻng 1, Liềm 1, Dao 1, Đuốc 1 + Kiếm 2 + Cần câu 1, thanh công cụ xếp theo kiểu cũ.
   Vào game: 6 món gộp thành 1 Búa Seismic cấp 3 (cấp cao nhất cũ), Kiếm / Cần câu giữ nguyên. Chặt cây / đập đá / cày đất / cắt cỏ đều bằng Búa. */
PRESETS.p80_old = { vi: 'Búa Seismic — save cũ có 6 dụng cụ', en: 'Seismic Hammer — old save with 6 tools', desc: 'p80 (plan-80 đợt 1). Làng 9:00. Save kiểu cũ có Rìu 2, Cuốc 3, Xẻng, Liềm, Dao, Đuốc → vào game tự gộp thành 1 Búa Seismic cấp 3. Đi tới cây / đá / đất bấm E: Búa tự làm đúng việc.',
  save: d => ({ ...PRESETS.p78_chan.save(d), toolTier: { axe: 2, pickaxe: 3, shovel: 1, scythe: 1, knife: 1, torch: 1, sword: 2, rod: 1 }, tools: { axe: true, rod: true, rodBought: true },
    hotbar: ['sword', 'axe', 'pickaxe', 'shovel', 'scythe', 'knife', 'torch', 'rod', null, null, null, null], hotSel: 1, hbSeen: ['sword', 'axe', 'pickaxe', 'shovel', 'scythe', 'knife', 'torch', 'rod'] }),
  after: async C => { C.bag.add('stone', 100); if (C.clock && C.clock.set) C.clock.set({ hour: 9, minute: 0 }); } };
/* p80:preset:end */
/* p81:preset:begin */
/* p81 (plan-79 đợt 3): ?preset=p81_san&reset&lang=vi — Đấu Trường Leader (lối mép Tây Làng), đội 5 Chấn Thú p78, đứng giữa cổng Nam. E cạnh Leader → thách đấu 3v3 trên sân cỏ; Bạn tập cạnh cổng → đấu luyện tập. */
PRESETS.p81_san = { vi: 'Đấu Trường Leader — thách đấu + bạn tập', en: 'Leader Arena — challenges + sparring partner', desc: 'p81 (plan-79 đợt 3). Sân vận động bầu dục (lối mép Tây Làng), 15 Leader đứng quanh sân: E → thách đấu Chấn Thú 3v3, thắng lần đầu được đá + huy hiệu. Bạn tập cạnh cổng Nam: đấu luyện tập, thắng thua không mất gì.',
  save: d => ({ ...PRESETS.p78_chan.save(d), zone: 'leader_arena', entry: 'default' }),
  after: async C => { kit(C, 300, { sword: 3 }); if (C.clock && C.clock.set) C.clock.set({ hour: 15, minute: 0 }); } };
/* p81:preset:end */
/* p100:preset:begin */
/* p100 (plan-94 §9): CHOG — Chấn Thú từ mascot cộng đồng Monad (mặt trắng bờm gai tím, đứng 2 chân, hệ Mã, Hiếm) + 2 dạng tiến hoá.
   ?preset=chog_duel&reset&lang=vi&team=1v1&my=chog&foe=hacgiac — trận thử (huấn luyện viên ngay trước mặt: E, E). my=chog2 / chog3 cho 2 dạng sau.
   ?preset=chog_bat&reset&lang=vi — M6 Thành Nghiêng 8:00 (giờ bản tin sáng): Chog HIẾM hiện trong khung nhìn, có Lôi Hồ Lv24 + 5 Ấn Thu (E → đấu, ≤ 30 % máu → ném Ấn Thu).
   ?preset=chog_evo&reset&lang=vi — Làng: Chog Lv19 + Chog Phóng Viên Lv29 trong đội, 40 Tiềm Năng Mã (phím T → rót → tiến hoá). */
const EN100 = () => { try { return new URLSearchParams(location.search).get('lang') === 'en'; } catch (e) { return false; } };
PRESETS.chog_duel = { vi: 'Chog — thử trận Chấn Thú mới (Monad)', en: 'Chog — new Quake Beast battle test (Monad)', desc: 'p100. Làng, huấn luyện viên ngay trước mặt: E, E → trận 1v1. Link: &team=1v1&my=chog&foe=hacgiac (my=chog2 / chog3: 2 dạng tiến hoá). Chog tự ra 5 chiêu: Tin Nóng Lướt Tới, Bờm Gai Nhiễu Sóng, Phỏng Vấn Bất Ngờ, Cười Tít Lách Mã, tuyệt chiêu Bản Tin Lịch Sử.',
  save: d => ({ ...d, name: 'Hùng', nation: 'Vietnamese', zone: 'village', entry: 'default', story: STORY('noxx'), sys: { pet: ROCKY() } }),
  after: async C => { kit(C, 50); await wait(400); try { const p = C.S.player; if (window.__duel && __duel.spawnHost) { __duel.spawnHost(p.x + 18, p.y - 2); const h = __duel.host(); if (h) { p.x = h.x - 14; p.y = h.y + 2; p.dir = 2; } } } catch (e) { } } };
PRESETS.chog_bat = { vi: 'Chog hiếm — bắt ở M6 Thành Nghiêng (bản tin sáng)', en: 'Rare Chog — catch it in M6 Leaning City (morning news)', desc: 'p100. M6 8:00 (giờ bản tin sáng 6–10 h): Chog HIẾM hiện trong khung nhìn (biểu tượng ✦ trên đầu, ghim bản đồ M). Có Lôi Hồ Lv24 + 5 Ấn Thu: lại gần bấm E → đấu, máu nó ≤ 30 % → ném Ấn Thu (phím C / E).',
  save: d => ({ ...d, name: 'Hùng', nation: 'Vietnamese', zone: 'm6', entry: 'default', story: STORY('noxx'), badges: [1, 2, 3, 4, 5], hero: { lv: 18, xp: 0, hp: null }, sys: { pet: ROCKY(), chanthu: { v: 1, starter: 'loiho', team: [{ id: 1, sp: 'loiho', lv: 24, name: EN100() ? 'Volt Fox' : 'Tia Chớp' }], box: [], anThu: 5, nextId: 2, caught: 0, tn: {} } } }),
  after: async C => { kit(C, 200); if (C.clock && C.clock.set) C.clock.set({ hour: 8, minute: 0 }); await wait(900);
    try { if (C.chanthu) { C.chanthu.setWx({}); C.chanthu.rareTick(); const r = C.chanthu.rare().find(x => x.sp === 'chog'); if (r) { C.S.player.x = r.x - 30; C.S.player.y = r.y; C.S.player.dir = 2; } } } catch (e) { } } };
PRESETS.chog_evo = { vi: 'Chog — tiến hoá (Tiềm Năng Mã)', en: 'Chog — evolution (Code Potential)', desc: 'p100. Làng 9:00. Đội: Chog Lv19 + Chog Phóng Viên Lv29, 40 Tiềm Năng Mã. Phím T (hoặc bảng Đội → ✦ Tiềm Năng) → rót cho Chog → Lv20 tiến hoá thành Chog Phóng Viên; rót cho Phóng Viên → Lv30 thành Chog Đại Mưu.',
  save: d => ({ ...d, name: 'Hùng', nation: 'Vietnamese', zone: 'village', entry: 'default', story: STORY('noxx'), hero: { lv: 12, xp: 0, hp: null },
    sys: { pet: ROCKY(), chanthu: { v: 1, starter: 'chog', team: [{ id: 1, sp: 'chog', lv: 19, name: 'Chog' }, { id: 2, sp: 'chog2', lv: 29, name: EN100() ? 'Reporter Chog' : 'Chog Phóng Viên' }], box: [], anThu: 5, nextId: 3, caught: 1, tn: { ma: 40 } } } }),
  after: async C => { kit(C, 300); if (C.clock && C.clock.set) C.clock.set({ hour: 9, minute: 0 }); await wait(600); } };
/* p100:preset:end */
/* p99:preset:begin */
/* p99 (plan-94 §8): MOYAKI — Chấn Thú từ mascot cộng đồng Monad (mèo-cá tím, hệ Triều, Hiếm, bậc Nhỏ) + 2 dạng tiến hoá.
   ?preset=moyaki_duel&reset&lang=vi&team=1v1&my=moyaki&foe=hacgiac — trận thử (huấn luyện viên ngay trước mặt: E, E). my=moyaki2 / moyaki3 cho 2 dạng sau.
   ?preset=moyaki_bat&reset&lang=vi — M1 Bãi Bồi Yên 10:00: Moyaki HIẾM hiện ven nước trong khung nhìn, có Lôi Hồ Lv20 + 5 Ấn Thu (E → đấu, ≤ 30 % máu → ném Ấn Thu).
   ?preset=moyaki_evo&reset&lang=vi — Làng: Moyaki Lv19 + Moyaki Vượt Thác Lv29 trong đội, 40 Tiềm Năng Triều (phím T → rót → tiến hoá). */
const EN99 = () => { try { return new URLSearchParams(location.search).get('lang') === 'en'; } catch (e) { return false; } };
PRESETS.moyaki_duel = { vi: 'Moyaki — thử trận Chấn Thú mới (Monad)', en: 'Moyaki — new Quake Beast battle test (Monad)', desc: 'p99. Làng, huấn luyện viên ngay trước mặt: E, E → trận 1v1. Link: &team=1v1&my=moyaki&foe=hacgiac (my=moyaki2 / moyaki3: 2 dạng tiến hoá). Moyaki tự ra 5 chiêu: Quẫy Vây Lướt, Bong Bóng Trề Môi, Liếc Khinh Khỉnh, Bơi Ngược Dòng, tuyệt chiêu Cá Chép Vượt Vũ Môn.',
  save: d => ({ ...d, name: 'Hùng', nation: 'Vietnamese', zone: 'village', entry: 'default', story: STORY('noxx'), sys: { pet: ROCKY() } }),
  after: async C => { kit(C, 50); await wait(400); try { const p = C.S.player; if (window.__duel && __duel.spawnHost) { __duel.spawnHost(p.x + 18, p.y - 2); const h = __duel.host(); if (h) { p.x = h.x - 14; p.y = h.y + 2; p.dir = 2; } } } catch (e) { } } };
PRESETS.moyaki_bat = { vi: 'Moyaki hiếm — bắt ở M1 Bãi Bồi Yên (ven nước, ban ngày)', en: 'Rare Moyaki — catch it in M1 Calm Shoals (by the water, daytime)', desc: 'p99. M1 10:00, trời quang: Moyaki HIẾM hiện sát mép nước trong khung nhìn (biểu tượng ✦ trên đầu, ghim bản đồ M). Có Lôi Hồ Lv20 + 5 Ấn Thu: lại gần bấm E → đấu, máu nó ≤ 30 % → ném Ấn Thu (phím C / E).',
  save: d => ({ ...d, name: 'Hùng', nation: 'Vietnamese', zone: 'm1', entry: 'default', story: STORY('noxx'), badges: [1], hero: { lv: 10, xp: 0, hp: null }, sys: { pet: ROCKY(), chanthu: { v: 1, starter: 'loiho', team: [{ id: 1, sp: 'loiho', lv: 20, name: EN99() ? 'Volt Fox' : 'Tia Chớp' }], box: [], anThu: 5, nextId: 2, caught: 0, tn: {} } } }),
  after: async C => { kit(C, 200); if (C.clock && C.clock.set) C.clock.set({ hour: 10, minute: 0 }); await wait(900);
    try { if (C.chanthu) { C.chanthu.setWx({}); C.chanthu.rareTick(); const r = C.chanthu.rare().find(x => x.sp === 'moyaki'); if (r) { C.S.player.x = r.x - 30; C.S.player.y = r.y; C.S.player.dir = 2; } } } catch (e) { } } };
PRESETS.moyaki_evo = { vi: 'Moyaki — tiến hoá (Tiềm Năng Triều)', en: 'Moyaki — evolution (Tide Potential)', desc: 'p99. Làng 9:00. Đội: Moyaki Lv19 + Moyaki Vượt Thác Lv29, 40 Tiềm Năng Triều. Phím T (hoặc bảng Đội → ✦ Tiềm Năng) → rót cho Moyaki → Lv20 tiến hoá thành Moyaki Vượt Thác; rót cho Vượt Thác → Lv30 thành Moyaki Long Ngư.',
  save: d => ({ ...d, name: 'Hùng', nation: 'Vietnamese', zone: 'village', entry: 'default', story: STORY('noxx'), hero: { lv: 12, xp: 0, hp: null },
    sys: { pet: ROCKY(), chanthu: { v: 1, starter: 'moyaki', team: [{ id: 1, sp: 'moyaki', lv: 19, name: 'Moyaki' }, { id: 2, sp: 'moyaki2', lv: 29, name: EN99() ? 'Rapids Moyaki' : 'Moyaki Vượt Thác' }], box: [], anThu: 5, nextId: 3, caught: 1, tn: { trieu: 40 } } } }),
  after: async C => { kit(C, 300); if (C.clock && C.clock.set) C.clock.set({ hour: 9, minute: 0 }); await wait(600); } };
/* p99:preset:end */
/* p96:preset:begin */
/* p96 (plan-94): MOLANDAK — Chấn Thú từ mascot cộng đồng Monad (hệ Chấn, Hiếm, bậc Nhỏ) + 2 dạng tiến hoá.
   ?preset=molandak_duel&reset&lang=vi&team=1v1&my=molandak&foe=hacgiac — trận thử (huấn luyện viên ngay trước mặt: E, E). my=molandak2 / molandak3 cho 2 dạng sau.
   ?preset=molandak_bat&reset&lang=vi — M4 Mỏ Đá Lở 10:00: Molandak HIẾM hiện trong khung nhìn, có Lôi Hồ Lv20 + 5 Ấn Thu (E → đấu, ≤ 30 % máu → ném Ấn Thu).
   ?preset=molandak_evo&reset&lang=vi — Làng: Molandak Lv19 + Molandak Lão Luyện Lv29 trong đội, 40 Tiềm Năng Chấn (phím T → rót → tiến hoá). */
const EN96 = () => { try { return new URLSearchParams(location.search).get('lang') === 'en'; } catch (e) { return false; } };
PRESETS.molandak_duel = { vi: 'Molandak — thử trận Chấn Thú mới (Monad)', en: 'Molandak — new Quake Beast battle test (Monad)', desc: 'p96. Làng, huấn luyện viên ngay trước mặt: E, E → trận 1v1. Link: &team=1v1&my=molandak&foe=hacgiac (my=molandak2 / molandak3: 2 dạng tiến hoá). Molandak tự ra 5 chiêu: Lăn Gai Húc, Bắn Gai Quạt, Trề Môi Khinh Khỉnh, Cuộn Gai Thủ, tuyệt chiêu Cầu Gai Vượt Ải.',
  save: d => ({ ...d, name: 'Hùng', nation: 'Vietnamese', zone: 'village', entry: 'default', story: STORY('noxx'), sys: { pet: ROCKY() } }),
  after: async C => { kit(C, 50); await wait(400); try { const p = C.S.player; if (window.__duel && __duel.spawnHost) { __duel.spawnHost(p.x + 18, p.y - 2); const h = __duel.host(); if (h) { p.x = h.x - 14; p.y = h.y + 2; p.dir = 2; } } } catch (e) { } } };
PRESETS.molandak_bat = { vi: 'Molandak hiếm — bắt ở M4 Mỏ Đá Lở (ban ngày)', en: 'Rare Molandak — catch it in M4 Rockfall Mine (daytime)', desc: 'p96. M4 10:00, trời quang: Molandak HIẾM hiện trong khung nhìn (biểu tượng ✦ trên đầu, ghim bản đồ M). Có Lôi Hồ Lv20 + 5 Ấn Thu: lại gần bấm E → đấu, máu nó ≤ 30 % → ném Ấn Thu (phím C / E).',
  save: d => ({ ...d, name: 'Hùng', nation: 'Vietnamese', zone: 'm4', entry: 'default', story: STORY('noxx'), badges: [1, 2, 3], hero: { lv: 14, xp: 0, hp: null }, sys: { pet: ROCKY(), chanthu: { v: 1, starter: 'loiho', team: [{ id: 1, sp: 'loiho', lv: 20, name: EN96() ? 'Volt Fox' : 'Tia Chớp' }], box: [], anThu: 5, nextId: 2, caught: 0, tn: {} } } }),
  after: async C => { kit(C, 200); if (C.clock && C.clock.set) C.clock.set({ hour: 10, minute: 0 }); await wait(900);
    try { if (C.chanthu) { C.chanthu.setWx({}); C.chanthu.rareTick(); const r = C.chanthu.rare().find(x => x.sp === 'molandak'); if (r) { C.S.player.x = r.x - 30; C.S.player.y = r.y; C.S.player.dir = 2; } } } catch (e) { } } };
PRESETS.molandak_evo = { vi: 'Molandak — tiến hoá (Tiềm Năng Chấn)', en: 'Molandak — evolution (Quake Potential)', desc: 'p96. Làng 9:00. Đội: Molandak Lv19 + Molandak Lão Luyện Lv29, 40 Tiềm Năng Chấn. Phím T (hoặc bảng Đội → ✦ Tiềm Năng) → rót cho Molandak → Lv20 tiến hoá thành Molandak Lão Luyện; rót cho Lão Luyện → Lv30 thành Molandak Vương.',
  save: d => ({ ...d, name: 'Hùng', nation: 'Vietnamese', zone: 'village', entry: 'default', story: STORY('noxx'), hero: { lv: 12, xp: 0, hp: null },
    sys: { pet: ROCKY(), chanthu: { v: 1, starter: 'molandak', team: [{ id: 1, sp: 'molandak', lv: 19, name: 'Molandak' }, { id: 2, sp: 'molandak2', lv: 29, name: EN96() ? 'Veteran Molandak' : 'Molandak Lão Luyện' }], box: [], anThu: 5, nextId: 3, caught: 1, tn: { chan: 40 } } } }),
  after: async C => { kit(C, 300); if (C.clock && C.clock.set) C.clock.set({ hour: 9, minute: 0 }); await wait(600); } };
/* p96:preset:end */
export async function runPreset({ q, S, CTX, startGame, defaultSave, UI }) {
  const id = q.get('preset'), p = PRESETS[id];
  if (!p) { console.error('preset: không có mốc', id, Object.keys(PRESETS)); return false; }
  useSlot(id);
  if (q.has('reset')) { clearSave(); history.replaceState(null, '', `?preset=${id}${q.get('lang') ? '&lang=' + q.get('lang') : ''}${['team', 'my', 'foe', 'lv78', 'mv78', 'host', 'sty89', 'cam89', 'music'].filter(k => q.get(k)).map(k => '&' + k + '=' + q.get(k)).join('')}`); }   /* p67b: giữ cả my / foe (link chọn đội) */
  let sv = loadSave(), fresh = !sv;
  if (fresh) { sv = p.save(defaultSave()); sv.lang = q.get('lang') || 'vi'; }   /* 2026-10-14: defaultSave có lang 'en' → mốc mới mặc định tiếng Việt */
  { const lg = q.get('lang') || sv.lang; if ((lg === 'vi' || lg === 'en') && UI.lang() !== lg && UI.setLang) { UI.setLang(lg); if (UI.applyStaticText) UI.applyStaticText(); } }   /* ngôn ngữ theo ô lưu preset (không theo save chính) */
  startGame(sv);
  if (fresh && p.after) { await wait(600); try { await p.after(CTX); } catch (e) { console.error('preset after', e); } CTX.persist(); }
  chip(id, p, UI.lang() === 'vi');
  window.__preset = { id, fresh };
  return true;
}
/* p95:preset:begin */
/* p95 (plan-95): ELYZIUMA bảo vệ người chơi. ?preset=elyz95&reset&lang=vi — Làng mới (p89) 10:00, đội có Elyziuma Lv50 đứng đầu (đã thả ra, đi theo).
   Vài giây sau: 4 Chấn Thú côn đồ (Hắc Giác, Hoả Hùng, Lôi Hồ, Ngưu Sơn) lao vào đánh người chơi → Elyziuma tự lao vào đánh, nhiều con một lúc.
   Lệnh thử: __ely.gang(n) gọi thêm n con · __ely.cast('stamp'|'meet'|'flare'|'fire'|'ult') · __ely.state(). Phím J / ô Ấn Chấn: thu / thả. */
const ELYT = () => [{ id: 1, sp: 'elyziuma', lv: 50, name: 'Elyziuma' }, ...P78T().slice(0, 2).map((m, i) => ({ ...m, id: i + 2 }))];
PRESETS.elyz95 = { vi: 'Elyziuma bảo vệ người chơi (Làng)', en: 'Elyziuma guards you (Village)', desc: 'p95 (plan-95). Làng 10:00. Elyziuma — Chấn Thú Huyền Thoại hệ Mã + Triều — đang thả ra đi theo bạn. Vài giây sau 4 Chấn Thú côn đồ lao vào đánh bạn: Elyziuma tự xông vào, ưu tiên con đang đánh bạn, đánh nhiều con cùng lúc bằng 5 chiêu (Ký Duyệt, Họp Khẩn, Kính Lóe, Sa Thải, Tái Cấu Trúc). Phím J: thu / thả.',
  save: d => ({ ...d, name: 'Hùng', nation: 'Vietnamese', zone: 'village', entry: 'default', story: STORY('noxx'), hero: { lv: 20, xp: 0, hp: null }, sys: { pet: { ...ROCKY78(), pet: { ...ROCKY78().pet, cmd: 'follow' } }, p79: { out: true }, chanthu: { v: 1, starter: 'chuichui', team: ELYT(), box: [], anThu: 8, nextId: 9, caught: 3, tn: {} } } }),
  after: async C => { kit(C, 300, { sword: 3 }); if (C.hold) C.hold('sword'); if (C.clock && C.clock.set) C.clock.set({ hour: 10, minute: 0 }); await wait(1200);
    try { if (window.__ely) window.__ely.gang(4); } catch (e) { } } };
PRESETS.elyz95_test = { vi: 'Elyziuma (thử, không gọi côn đồ)', en: 'Elyziuma (test, no rogues)', desc: 'p95: như elyz95 nhưng không tự gọi côn đồ (bài test tự gọi bằng __ely.gang).', save: d => PRESETS.elyz95.save(d),
  after: async C => { kit(C, 300, { sword: 3 }); if (C.hold) C.hold('sword'); if (C.clock && C.clock.set) C.clock.set({ hour: 10, minute: 0 }); } };
/* p95:preset:end */
/* p104:preset:begin */
/* p104 (plan-104): gọi + ra lệnh nhiều Chấn Thú, bảo vệ người chơi. ?preset=p104&reset&lang=vi — Làng mới 10:00, đội 6 con (chưa thả).
   J thả / thu (chưa chọn: thả con kế tiếp, đủ 3 thì thu cả đội) · bấm chân dung: chọn con · G tấn công mục tiêu khoá · U chế độ · H chiêu.
   Lệnh thử: __sq.foes(n) côn đồ bắn xa · __sq.foes(n,'melee') côn đồ cận chiến · __sq.state() · __fct.spawn('chuichui') + __fct.duel(id) đấu tại chỗ. */
const P104T = () => { const t = P78T(); return [t[0], t[1], t[3], t[2], { id: 6, sp: 'elyziuma', lv: 50, name: 'Elyziuma' }, t[4]]; };
const P104S = out => d => ({ ...d, name: 'Hùng', nation: 'Vietnamese', zone: 'village', entry: 'default', story: STORY('noxx'), hero: { lv: 20, xp: 0, hp: null }, sys: { pet: { ...ROCKY78(), pet: { ...ROCKY78().pet, cmd: 'follow' } }, p79: { out: false }, p104: { v: 1, out, mode: 'guard', per: {}, sel: null }, chanthu: { v: 1, starter: 'chuichui', team: P104T(), box: [], anThu: 8, nextId: 9, caught: 3, tn: {} } } });
const P104A = async C => { kit(C, 300, { sword: 3 }); if (C.hold) C.hold('sword'); if (C.clock && C.clock.set) C.clock.set({ hour: 10, minute: 0 }); };
PRESETS.p104 = { vi: 'Gọi + ra lệnh Chấn Thú (Làng)', en: 'Call + command Quake Beasts (Village)', desc: 'p104 (plan-104). Làng 10:00, đội 6 Chấn Thú chưa thả. J: thả lần lượt (tối đa 3 con) · bấm chân dung để chọn 1 con · khoá quái (Tab) rồi G: cả đội tấn công · U: Bảo vệ / Tấn công tự do / Theo sau · H: chiêu của con đang chọn. Chế độ Bảo vệ: Chấn Thú chắn và đỡ đòn cho bạn.', save: P104S([]), after: P104A };
PRESETS.p104_3 = { vi: 'Đã thả 3 Chấn Thú + côn đồ tấn công (Làng)', en: '3 Quake Beasts out + rogues attack (Village)', desc: 'p104: đã thả 3 con (Chũi Vương, Ngưu Sơn, Thạch Chấn Vương). Vài giây sau 3 côn đồ cận chiến + 2 côn đồ bắn xa lao vào đánh bạn — Chấn Thú chắn, đỡ đòn, dùng chiêu bảo vệ.', save: P104S([1, 2, 4]),
  after: async C => { await P104A(C); await wait(1500); try { if (window.__sq) { window.__sq.foes(3, 'melee'); window.__sq.foes(2, 'ranged'); } } catch (e) { } } };
PRESETS.p104_ely = { vi: 'Elyziuma + 2 Chấn Thú cùng thả (Làng)', en: 'Elyziuma + 2 beasts out (Village)', desc: 'p104: Elyziuma (bộ não riêng elyz95) đi cùng Ngưu Sơn + Thạch Chấn Vương; côn đồ lao tới sau vài giây.', save: P104S([6, 2, 4]),
  after: async C => { await P104A(C); await wait(1500); try { if (window.__sq) window.__sq.foes(4, 'melee'); } catch (e) { } } };
PRESETS.p104_test = { vi: 'p104 thử (không côn đồ)', en: 'p104 test (no rogues)', desc: 'p104: như p104 (bài test tự thả / gọi côn đồ).', save: P104S([]), after: P104A };
/* p104:preset:end */
/* p105:preset:begin */
/* p105 (plan-105): MÔI TRƯỜNG THEO HỆ. ?preset=envfx105&reset&lang=vi — Làng mới (p89) 10:00, người chơi đứng cạnh cây lẻ + bãi hoa.
   Lệnh thử: __envfx.hit(x, y, r, 'nham'|'trieu'|'suong'|…, pw) · __envfx.spot() · __envfx.state() · __envfx.set({ var: { nham: 'b' } }).
   envfx105_duel: như trên + đội Chấn Thú (đấu tại chỗ với thú hoang bằng E). */
const P105GO = async C => { kit(C, 300, { sword: 3 }); if (C.hold) C.hold('sword'); if (C.clock && C.clock.set) C.clock.set({ hour: 10, minute: 0 });
  for (let i = 0; i < 40 && !(window.__envfx && __envfx.spot); i++) await wait(100);
  try { const s = window.__envfx && __envfx.spot(); if (s) { const p = C.S.player; p.x = s.fx - 40; p.y = s.fy + 30; p.dir = 0; } } catch (e) { } };
PRESETS.envfx105 = { vi: 'Môi trường theo hệ chiêu (Làng)', en: 'Elemental terrain (Village)', desc: 'p105 (plan-105). Làng 10:00, đứng cạnh cây + bãi hoa. Chiêu Chấn Thú / linh thú trúng hoa cỏ, cây: cháy sém, ướt thẫm, đóng băng… rồi hồi lại.',
  save: d => ({ ...d, name: 'Hùng', nation: 'Vietnamese', zone: 'village', entry: 'default', story: STORY('noxx'), hero: { lv: 20, xp: 0, hp: null }, sys: { pet: ROCKY78() } }), after: P105GO };
PRESETS.envfx105_duel = { vi: 'Môi trường theo hệ + đội Chấn Thú', en: 'Elemental terrain + beast team', desc: 'p105: như envfx105, có đội Chấn Thú (thả J, gặp thú hoang bấm E đấu tại chỗ).',
  save: d => ({ ...d, name: 'Hùng', nation: 'Vietnamese', zone: 'village', entry: 'default', story: STORY('noxx'), hero: { lv: 20, xp: 0, hp: null }, sys: { pet: ROCKY78(), p79: { out: true }, chanthu: { v: 1, starter: 'chuichui', team: P78T().slice(0, 3).map((m, i) => ({ ...m, id: i + 1 })), box: [], anThu: 8, nextId: 9, caught: 3, tn: {} } } }), after: P105GO };
/* p105:preset:end */
/* p103:preset:begin */
/* p103 (plan-103): CẢNH QUAY FARM QUÁI trên Làng mới — người chơi + Rocky (golem, Chấn Thú loài 'rocky', p90, thả bằng comp79) + Elyziuma (p95, elyz95) cùng đánh quái.
   Đội: team[0] = Rocky Lv40 (comp79 lo), team[1] = Elyziuma Lv50 — cờ sys.p79.duo103 cho elyz95 chạy khi Elyziuma ở ô 2 (vá p103, tạm chờ squad104).
   Thú cưng cũ (Rocky Jr cam, pet.js) để 'home' + ẩn dòng HUD — không ra cảnh, không Siêu Cấp.
   Link quay (KHÔNG kèm &reset để giữ sty89 / cam89 trên URL — máy quay tự xoá dữ liệu trang trước khi mở):
     ?preset=video_farm&lang=vi&sty89=d&cam89=auto
   Tham số thêm: &bot103=0 (người chơi đứng yên) · &wave103=0 (không gọi quái) · &clean103=0 (HIỆN lại bảng 'E · …' / hộp hướng dẫn — mặc định ẩn theo anh 02/11).
   Phần đạo diễn (chỗ đứng bờ ao, đợt quái nước / bờ / bay, bot người chơi) ở src/farm103.js — window.__farm103. */
PRESETS.video_farm = { vi: 'Quay video: farm quái cùng Rocky + Elyziuma (Làng)', en: 'Video: farming with Rocky + Elyziuma (Village)',
  desc: 'p103 (plan-103). Làng mới 10:00, trời đẹp. Đứng bờ ao. Rocky (golem) + Elyziuma cùng thả ra đi theo. Quái đến theo đợt: dưới nước (cua, cá nóc, lươn trong ao), trên bờ (nhầy, sói, yêu đá), biết bay (quạ, mòng biển). Người chơi tự đi dọc bờ, đánh con gần nhất.',
  save: d => { const s = PRESETS.elyz95.save(d), R = ROCKY78(), ch = s.sys.chanthu;
    const team = [{ id: 1, sp: 'rocky', lv: 40, name: 'Rocky' }, { id: 2, sp: 'elyziuma', lv: 50, name: 'Elyziuma' }];
    return { ...s, hero: { lv: 30, xp: 0, hp: null }, sys: { ...s.sys, pet: { ...R, pet: { ...R.pet, cmd: 'home' } }, p79: { out: true, duo103: true }, ki: { v: 3, auto: true, tut: 1 }, chanthu: { ...ch, team, nextId: 9 } } }; },
  after: async C => { kit(C, 300, { sword: 3 }); if (C.hold) C.hold('sword'); if (C.clock && C.clock.set) C.clock.set({ hour: 10, minute: 0 });
    try { const F = await import('./farm103.js'); F.start(C); } catch (e) { console.error('farm103', e); } } };
/* p103:preset:end */
/* p110:preset:begin */
/* p110 (bản CHIẾN ĐẤU gộp): Làng mới, đội Rocky golem + Elyziuma + Ngưu Sơn thả bằng squad104 (p104), Chấn Thú hoang + thủ lĩnh theo vùng (p106),
   lao nhanh (p107), môi trường theo hệ (p105), HUD Saiyan + noprompt (p91), tiếng chiêu (p108), cỡ Chấn Thú (p98), Rocky ×2 (p90).
   Link: ?preset=farm110&reset&lang=vi&sty89=d&cam89=auto  (&reset nay giữ sty89 / cam89). Thú cưng cũ để 'home'.
   J thả / thu con đang chọn · bấm chân dung chọn con, chuột phải chân dung thả / thu · X thu cả đội · Tab khoá + G cả đội đánh · U chế độ · H chiêu. */
PRESETS.farm110 = { vi: 'Chiến đấu: đội 3 Chấn Thú farm theo vùng (Làng mới)', en: 'Battle: 3-beast squad zone farming (Village)',
  desc: 'p110 — bản gộp chiến đấu. Làng mới 10:00. Rocky (golem) + Elyziuma + Ngưu Sơn đã thả, theo bạn, tự đánh và bảo vệ bạn. Mỗi vùng con có Chấn Thú hoang + thủ lĩnh; lại gần hoặc đánh thì chúng nổi giận. J thả / thu · Tab khoá + G cả đội đánh · U đổi chế độ · H chiêu.',
  save: d => { const R = ROCKY78(), N = (P78T().find(m => m.sp === 'nguuson') || { sp: 'nguuson', lv: 30, name: 'Ngưu Sơn' });
    const team = [{ id: 1, sp: 'rocky', lv: 40, name: 'Rocky' }, { id: 2, sp: 'elyziuma', lv: 50, name: 'Elyziuma' }, { ...N, id: 3 }];
    return { ...d, name: 'Hùng', nation: 'Vietnamese', zone: 'village', entry: 'default', story: STORY('noxx'), hero: { lv: 30, xp: 0, hp: null },
      sys: { pet: { ...R, pet: { ...R.pet, cmd: 'home' } }, ki: { v: 3, auto: true, tut: 1 }, p79: { out: false }, p104: { v: 1, out: [2], mode: 'guard', per: {}, sel: null }   /* anh: khởi đầu chỉ thả Elyziuma — Rocky + Ngưu Sơn gọi ra bằng chân dung / J, X thu cả đội */,
        chanthu: { v: 1, starter: 'chuichui', team, box: [], anThu: 8, nextId: 9, caught: 3, tn: {} } } }; },
  after: async C => { kit(C, 300, { sword: 3 }); if (C.hold) C.hold('sword'); if (C.clock && C.clock.set) C.clock.set({ hour: 10, minute: 0 });
    const m = C.S.map, p = C.S.player, ok = (tx, ty) => tx > 1 && ty > 1 && tx < m.w - 1 && ty < m.h - 1 && !C.isSolid(m, tx, ty);
    let best = null; for (let r = 0; r < 12 && !best; r++) for (let j = -r; j <= r && !best; j++) for (let i = -r; i <= r && !best; i++) { const tx = 112 + i, ty = 60 + j; if (ok(tx, ty) && ok(tx - 1, ty) && ok(tx + 1, ty) && ok(tx, ty + 1)) best = [tx, ty]; }
    if (best) { p.x = best[0] * 16 + 8; p.y = best[1] * 16 + 12; p.dir = 0; p.autoPath = null; }
    try { const F = await import('./farm103.js'); if (F.spacing) F.spacing(C); } catch (e) { console.error('farm110 spacing', e); }
    try {   /* trình duyệt chỉ cho phát tiếng sau cú bấm đầu tiên → nhắc nhỏ (tiếng Anh khi lang=en), tự tắt khi bấm */
      if (!(window.__audio && __audio.state && __audio.state().ctx === 'running')) {
        const el = document.createElement('div'), en = C.lang && C.lang() === 'en'; el.id = 'snd110'; el.textContent = en ? '🔊 Click to enable sound' : '🔊 Bấm để bật âm thanh';
        el.style.cssText = 'position:fixed;left:12px;bottom:96px;z-index:50;font:14px VT323,monospace;background:rgba(20,14,26,.82);color:#ffe9a0;padding:4px 10px;border:1px solid #a0703a;border-radius:4px;pointer-events:none';
        document.body.appendChild(el); const off = () => { el.remove(); for (const ev of ['pointerup', 'touchend', 'keydown']) removeEventListener(ev, off, true); };
        for (const ev of ['pointerup', 'touchend', 'keydown']) addEventListener(ev, off, true);
      }
    } catch (e) { } } };
PRESETS.video110 = { vi: 'Quay video v6: đội 3 Chấn Thú farm bầy thú vùng + ngập (Làng mới)', en: 'Video v6: squad farming + flood (Village)',
  desc: 'p110 video v6: như farm110 nhưng có đạo diễn tự chạy (farm103.start110): đi dọc suối → khiêu khích bầy → khoá thủ lĩnh + G → Elyziuma tuyệt chiêu (ngập) → đánh trong vùng ngập → bầy tan. Khung sạch (ẩn dòng nhiệm vụ / thông báo).',
  save: d => PRESETS.farm110.save(d),
  after: async C => { await PRESETS.farm110.after(C); try { const F = await import('./farm103.js'); F.start110(C); } catch (e) { console.error('video110', e); } } };
/* p110:preset:end */
/* p106:preset:begin */
/* p106 (plan-106): FARM CHẤN THÚ THEO VÙNG trên Làng mới — Rocky golem Lv40 (đầu đội, comp79) + Elyziuma Lv50 (ô 2, elyz95, cờ duo103) cùng thả;
   người chơi đứng bờ Tây suối (vùng Bờ Suối Ao Sen), 10:00. Thú hoang theo vùng do src/systems/farm106.js (window.__f106).
   Link: ?preset=farm_vung&reset&lang=vi */
PRESETS.farm_vung = { vi: 'Farm Chấn Thú theo vùng cùng Elyziuma + Rocky (Làng mới)', en: 'Zone beast farming with Elyziuma + Rocky (Village)',
  desc: 'p106 (plan-106). Làng mới 10:00. Mỗi vùng con (trừ Quảng Trường) có 3–5 Chấn Thú hoang đi lang thang. Lại quá gần / đánh chúng → nổi giận đuổi theo, kéo bầy. Rocky golem Lv40 + Elyziuma Lv50 đang thả tự đánh thú đang giận; hạ được thì nhận XP. Đứng bờ suối (Bờ Suối Ao Sen).',
  save: d => { const s = PRESETS.video_farm.save(d); return { ...s, sys: { ...s.sys, p79: { out: true, duo103: true } } }; },
  after: async C => { kit(C, 300, { sword: 3 }); if (C.hold) C.hold('sword'); if (C.clock && C.clock.set) C.clock.set({ hour: 10, minute: 0 });
    const m = C.S.map, p = C.S.player, ok = (tx, ty) => tx > 1 && ty > 1 && tx < m.w - 1 && ty < m.h - 1 && !C.isSolid(m, tx, ty);
    let best = null; for (let r = 0; r < 12 && !best; r++) for (let j = -r; j <= r && !best; j++) for (let i = -r; i <= r && !best; i++) { const tx = 112 + i, ty = 60 + j; if (ok(tx, ty) && ok(tx - 1, ty) && ok(tx + 1, ty) && ok(tx, ty + 1) && (!window.__f106 || __f106.at(tx * 16 + 8, ty * 16 + 12) === 'stream')) best = [tx, ty]; }
    if (best) { p.x = best[0] * 16 + 8; p.y = best[1] * 16 + 12; p.dir = 0; p.autoPath = null; }
    await wait(600);
    try { const E = C.elyz95 && C.elyz95.E && C.elyz95.E(); if (E) { E.x = p.x - 22; E.y = p.y + 4; } const f = C.comp79 && C.comp79.f && C.comp79.f(); if (f) { f.x = p.x + 20; f.y = p.y + 4; } } catch (e) { } } };
/* p106:preset:end */
