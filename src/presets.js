// presets.js — 2026-10-10 anh yêu cầu: "điểm lưu sẵn" để CHƠI THẬT từ giữa game (không kịch bản tự chạy).
//   ?preset=<tên>         mở game ở mốc đó, ô lưu RIÊNG 'seismic9.test.<tên>' (save thật không bị đụng); chơi tiếp, tải lại vẫn còn tiến độ
//   ?preset=<tên>&reset   dựng lại mốc từ đầu
// Mỗi mốc = save dựng từ defaultSave() + vài bước chạy 1 lần sau khi vào vùng (cấp đồ, cấp đất…).
import { useSlot, loadSave, clearSave } from './save.js';

const wait = ms => new Promise(r => setTimeout(r, ms));
const TOOLS = ['axe', 'pickaxe', 'shovel', 'rod', 'sword', 'bucket', 'scythe', 'knife', 'cage', 'lasso', 'trap', 'torch'];
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
