// linhduel.js — plan-48 Đ1: ĐẤU LINH THÚ (trận mẫu 1 đấu 1, thời gian thực). Anh Hùng chốt 2026-10-28:
//  · Người chơi là HUẤN LUYỆN VIÊN: thú tự chạy / né / đánh thường trên sân; người chơi gọi chiêu bằng phím 1–4 (điện thoại: 4 nút dưới màn).
//  · Thú đối thủ (của 1 NPC Seismic) do AI điều khiển, tự dùng chiêu. Trận mẫu: Ụt Chấn (hệ Chấn) vs Than Hồng (hệ Nham), Lv 20.
//  · Sát thương / chỉ số: duel-data.js (calcDamage, statsOf); máu ×HP_MUL để mỗi thú trụ ~30–60 s. Khắc hệ, chí mạng, bỏng, rối, thời tiết.
//  · Trình bày như video tham khảo (chỉ học dàn dựng): HUD 2 phía, ô tên chiêu bật ra phía người ra chiêu, chữ nổi, thẻ VS, cắt cảnh tuyệt chiêu ~0,8 s,
//    vết nứt / vết cháy lưu trên đất tới hết trận, '… THẮNG!'.
//  · Ảnh: thú = PixMiniMax (tools/px-p48duel.py → assets/px/linhduel/<thú>_<clip>.png + duel_sprites.json); VFX = vfx_workbench (tools/px-p48vfx.py →
//    assets/px/linhduel/vfx/*.png + vfx.json); decal / biểu tượng hệ / chữ VS = pixflux (tools/px-p48ui.py → assets/px/linhduel/ui/*). Ảnh gói là 2× logic.
//  · Anh chốt lại lần 2 (2026-10-28 tối): BỎ VÒNG CỌC — 2 thú đấu KHẮP MAP (vẫn tránh ô cứng / nước), đi xa người chơi quá thì tự kéo trận về gần;
//    camera giữ 2 thú + người chơi khi được. THÚ TỰ RA CHIÊU cả 2 phe (AI chọn theo khắc hệ / tầm / hồi chiêu; tuyệt chiêu khi đối thủ yếu hoặc quanh nó đông mục tiêu);
//    người chơi chỉ xem + cổ vũ, đi lại tự do (chế độ 'play'). CHIÊU ẢNH HƯỞNG MỌI THỨ trong vùng đánh (aoe): dân lảo đảo / bay ngã (không chết),
//    người chơi bị hất (knock.js) + mất ít máu (không ngất), Rocky bị hất (ctx.rocky.hitBy), quái trúng đòn thật (ctx.monsters.damage),
//    cây rung / đổ + vật phá được hư / đổ nát theo ảnh của chính nó (blast.js smashObj), đất để vết nứt / vết cháy, rơi xuống nước thì bắn nước.
//  · (lần 1, đã bỏ) ĐẤU MỌI LÚC MỌI NƠI — xác nhận thách đấu (E vào huấn luyện viên → 'Đấu linh thú?' → Đồng ý) là khoanh 1 vòng sân
//    ngay tại chỗ trên map hiện tại (bầu dục ~15×10 ô, viền = cọc cờ PixelLab), người chơi + đối thủ đứng ngoài mép; dân bị đẩy ra ngoài + đứng yên, Rocky ngồi chờ
//    ngoài mép (ctx.petWait), quái đứng yên (mode 'duel'); ô cứng / vật trong vòng vẫn là vật cản thật (thú đi vòng, đạn / đường nứt bị chặn); địa hình trong vòng
//    đổi sức hệ (nước gần → Triều ↑ Nham ↓, cỏ → Mộc ↑, dung nham / hầm → Nham ↑, đá / đất / cát → Chấn ↑). Hết trận: vòng biến mất, mọi thứ chạy lại.
//    Móc cho Sàn Đấu từng map (Leader, có thưởng): ctx.linhDuel.start({ foe: npc, foeSp, mySp, lv, reward }) — làm sau.
//  · VFX chỉ bật khi có sự kiện (chiêu, trúng đòn); không có hiệu ứng lặp quanh thú.
import { T } from '../gfx.js';
import { WATER as WATER105, waterDraw as waterDraw105 } from '../anim.js';   /* p105: Chấn Thú lội nước chìm nửa người */
import { ZONES, makeMap, setG, place } from '../world.js';
import { solidObjAt } from './blast.js';
import { ART } from '../art.js';
import { MOVES, SPECIES, TYPE_NAME, TYPE_COLOR, RARITY_NAME, calcDamage, statsOf, STAGE, typeMul, LT_SPECIES, LT_READY, LT_UNLOCK, P73_SWAP } from './duel-data.js';
import { SPECIES_EN, TYPE_EN as TYPE_EN74, MOVE_NAME_EN } from './duel-data.js';
import { fxPower, fxPowerOf } from './fieldevo.js';
import { MOVE_EN78, MOVE_EN97, P78_CHUNG } from './duel-data.js';   /* p78 */   /* p74: độ lực theo sức mạnh thú */   /* p74: tên tiếng Anh */   /* p72: linh thú trong danh mục chung */
import { smashObj, kindOf } from './blast.js';
import * as DFX from './duelfx.js';
import * as P73 from './chieu73.js';
import * as P78 from './chieu97.js'; import { PAL_SRC as PAL84 } from './pxfx.js';   /* p78: kho chiêu hệ Chấn + Chung (cơ chế trong trận) */   /* p73: 8 chiêu độc lạ ★ (cơ chế + VFX code) */   /* p52e: VFX chiêu vẽ code hoàn toàn (pxfx_full, p61); ?vfx=old = ảnh PixelLab cũ */

const HP_MUL = 12;                       /* máu thời gian thực = máu thể loại × HP_MUL (Lv 20: ~620–650) */
const LOAD = { utchan: ['dam_chan', 'nut_dat', 'cot_da', 'dai_dia_chan'], thanhong: ['phun_than', 'lao_lua', 'gam', 'nui_lua'] };
LOAD.golem = LOAD.utchan; LOAD.rongdo = LOAD.thanhong;
/* đợt 2 (p48c, anh 2026-10-28): Bạch Kình (Triều) · Lôi Hồ (Lôi) · Vịt Bão (Phong) · Diệp Nhẫn Giả (Mộc) — bộ chiêu như Bọt Bơi / Dây Dí / Mây Bông / Nấm Lắc */
LOAD.bachkinh = ['thuy_cham', 'bong_giam', 'song_cuon', 'trieu_dang']; LOAD.loiho = ['phong_tia', 'loi_cau', 'xung_vong', 'set_troi'];
LOAD.vitbao = ['luoi_gio', 'gio_xuoi', 'lao', 'bao_loc']; LOAD.diepnhan = ['roi_re', 'hut_nhua', 'bao_tu', 'rung_troi'];
/* p49c đợt 3 (p48c): Tuyết Kỳ Lân (Sương) · Tinh Miêu (Tinh) · Cười Thố (Âm) · Bánh Bao Thánh (Quang) — bộ chiêu như Đông Châu / Lăng Kính / Kèn Kẹn / Đom Sáng */
LOAD.tuyetky = ['gai_bang', 'hoi_lanh', 'guong_bang', 'bao_tuyet']; LOAD.tinhmieu = ['manh_pha_le', 'khuc_xa', 'giap_tinh', 'mua_kim_cuong'];
LOAD.cuoitho = ['song_am', 'hu_vang', 'dap_am', 'cong_huong']; LOAD.banhbao = ['tia_sang', 'chop_loa', 'tu_lanh', 'phan_quyet'];
const CLIP_SP = { bachkinh: { thuy_cham: 'spout', bong_giam: 'spout', song_cuon: 'wave', trieu_dang: 'ult' }, loiho: { phong_tia: 'zap', loi_cau: 'zap', xung_vong: 'pulse', set_troi: 'ult' },
  vitbao: { luoi_gio: 'flap', gio_xuoi: 'flap', lao: 'dash', bao_loc: 'ult' }, diepnhan: { roi_re: 'cast', hut_nhua: 'cast', bao_tu: 'seal', rung_troi: 'ult' },
  tuyetky: { gai_bang: 'raise', hoi_lanh: 'blow', guong_bang: 'raise', bao_tuyet: 'ult' }, tinhmieu: { manh_pha_le: 'shine', khuc_xa: 'shine', giap_tinh: 'curl', mua_kim_cuong: 'ult' },
  cuoitho: { song_am: 'shout', hu_vang: 'shout', dap_am: 'stomp', cong_huong: 'ult' }, banhbao: { tia_sang: 'beam', chop_loa: 'glow', tu_lanh: 'glow', phan_quyet: 'ult' } };   /* duel_sprites_p48c.json _clip_of */
/* p57 (plan-55 §15 BẢN GỘP plan-55/56): mỗi hệ 4 chiêu thường + 1 tuyệt chiêu — loài dùng bộ của hệ chính. Hệ Mã / Ảnh chưa có loài (bộ sẵn cho loài sau, test gán tạm). */
const SET5 = { chan: ['nut_dat', 'nem_da', 'dam_chan', 'don_tho', 'dai_dia_chan'], nham: ['phun_than', 'cau_no_lua', 'vung_nham', 'lao_lua', 'nui_lua'], trieu: ['roi_nuoc', 'thuy_cham', 'song_cuon', 'bong_giam', 'trieu_dang'],
  loi: ['phong_tia', 'loi_cau', 'xung_vong', 'luot_dien', 'set_troi'], phong: ['luoi_gio', 'loc_xoay', 'bo_nhao', 'gio_xuoi', 'bao_loc'], moc: ['roi_re', 'bao_tu', 'bao_la', 'hut_nhua', 'rung_troi'],
  suong: ['hoi_lanh', 'gai_bang', 'san_bang', 'guong_bang', 'bao_tuyet'], tinh: ['manh_pha_le', 'khuc_xa', 'giap_tinh', 'tru_pha_le', 'mua_kim_cuong'], ma: ['dich_loi', 'nhieu_song', 'tuong_lua', 'ma_hoa', 'sap_he'],
  am: ['song_am', 'dap_am', 'hu_vang', 'tieng_vong', 'cong_huong'], anh: ['ham_bong', 'cau_bong', 'lan_bong', 'den_me', 'dem_den'], quang: ['tia_sang', 'chop_loa', 'tu_lanh', 'cau_trang', 'phan_quyet'] };
for (const sp of ['golem', 'rongdo', 'bachkinh', 'loiho', 'vitbao', 'diepnhan', 'tuyetky', 'tinhmieu', 'cuoitho', 'banhbao', 'culibong', 'bovimach', 'macuu', 'hacgiac', 'hoahung', 'nguuson']) { const t = SPECIES[sp] && SPECIES[sp].types[0]; if (SET5[t]) LOAD[sp] = SET5[t].slice(); }
CLIP_SP.golem = { ...(CLIP_SP.golem || {}), nut_dat: 'slam', nem_da: 'slam', dam_chan: 'stomp', don_tho: 'stomp', dai_dia_chan: 'ult' }; CLIP_SP.rongdo = { ...(CLIP_SP.rongdo || {}), cau_no_lua: 'spit', vung_nham: 'spit' };
Object.assign(CLIP_SP.bachkinh, { roi_nuoc: 'spout' }); Object.assign(CLIP_SP.loiho, { luot_dien: 'pulse' }); Object.assign(CLIP_SP.vitbao, { loc_xoay: 'flap', bo_nhao: 'dash' }); Object.assign(CLIP_SP.diepnhan, { bao_la: 'cast' });
/* p64:bovimach */ CLIP_SP.bovimach = {"dich_loi": "atk", "nhieu_song": "zap", "ma_hoa": "zap", "tuong_lua": "stomp", "sap_he": "ult"};   /* Chấn Thú mới hệ ma — clip riêng theo chiêu */ /* p64:culibong */ CLIP_SP.culibong = {"ham_bong": "atk", "cau_bong": "cast", "den_me": "cast", "lan_bong": "curl", "dem_den": "ult"};   /* Chấn Thú mới hệ anh — clip riêng theo chiêu */ Object.assign(CLIP_SP.tuyetky, { san_bang: 'raise' }); Object.assign(CLIP_SP.tinhmieu, { tru_pha_le: 'curl' }); Object.assign(CLIP_SP.cuoitho, { tieng_vong: 'shout' }); Object.assign(CLIP_SP.banhbao, { cau_trang: 'beam' });
const HITFX = { trieu: 'splash', loi: 'hit_loi', phong: 'hit_phong', moc: 'hit_moc', chan: 'hit', nham: 'fireboom', suong: 'hit_suong', tinh: 'hit_tinh', am: 'hit_am', quang: 'hit_quang' };
/* huấn luyện viên mỗi vùng dùng 1 cặp khác nhau (cả 6 thú đều xuất hiện) */
const PAIRS = { village: ['golem', 'rongdo'], m1: ['bachkinh', 'loiho'], m2: ['vitbao', 'diepnhan'], m3: ['diepnhan', 'rongdo'], m4: ['golem', 'loiho'], m5: ['bachkinh', 'rongdo'],
  m6: ['cuoitho', 'banhbao'], m7: ['tuyetky', 'tinhmieu'], m8: ['banhbao', 'vitbao'], m9: ['cuoitho', 'rongdo'],   /* p49c: đợt 3 vào cặp m6–m9 */ arena: ['golem', 'bachkinh'] };   /* p48c: Golem Đá (Chấn) · Rồng Đỏ (Nham) — clip trùng tên bộ Ụt Chấn / Than Hồng */
const BASIC = MOVES.huc;                 /* đánh thường tự động */
const CLIP_OF = { dam_chan: 'stomp', nut_dat: 'slam', cot_da: 'slam', dai_dia_chan: 'ult', phun_than: 'spit', lao_lua: 'dash', gam: 'spit', nui_lua: 'ult' };
const FPS = { fly: 12, flydash: 14, idle: 8, run: 14, atk: 14, stomp: 12, slam: 12, ult: 12, spit: 12, dash: 14, hurt: 12, faint: 10, spout: 12, wave: 12, zap: 14, pulse: 12, flap: 12, cast: 12, seal: 12, raise: 12, blow: 12, shine: 12, curl: 12, shout: 12, beam: 12, glow: 12 };
const IMPACT = { flydash: 1, atk: 3, stomp: 4, slam: 4, ult: 8, spit: 4, dash: 2, spout: 4, wave: 4, zap: 3, pulse: 4, flap: 4, cast: 4, seal: 4, raise: 4, blow: 4, shine: 4, curl: 4, shout: 4, beam: 4, glow: 4 };   /* khung chạm (0-based, sau khi bỏ khung gốc) */
const RANGE = { huc: 22, dam_chan: 24, nut_dat: 105, cot_da: 120, dai_dia_chan: 46, phun_than: 135, lao_lua: 115, gam: 58, nui_lua: 140,
  thuy_cham: 125, bong_giam: 115, song_cuon: 110, trieu_dang: 62, phong_tia: 120, loi_cau: 120, xung_vong: 40, set_troi: 140, luoi_gio: 120, gio_xuoi: 999, lao: 115, bao_loc: 110, roi_re: 90, hut_nhua: 110, bao_tu: 110, rung_troi: 62,
  gai_bang: 120, hoi_lanh: 100, guong_bang: 999, bao_tuyet: 62, manh_pha_le: 120, khuc_xa: 110, giap_tinh: 999, mua_kim_cuong: 130, song_am: 105, hu_vang: 50, dap_am: 24, cong_huong: 62, tia_sang: 115, chop_loa: 50, tu_lanh: 999, phan_quyet: 130 };
Object.assign(RANGE, { nut_dat: 150, nem_da: 120, don_tho: 130, cau_no_lua: 130, vung_nham: 140, roi_nuoc: 80, thuy_cham: 130, song_cuon: 100, phong_tia: 152, luot_dien: 130, loc_xoay: 120, bo_nhao: 120,
  roi_re: 100, bao_la: 130, hut_nhua: 130, hoi_lanh: 90, gai_bang: 130, san_bang: 120, tru_pha_le: 120, khuc_xa: 150, dich_loi: 140, nhieu_song: 140, tuong_lua: 120, ma_hoa: 150,
  song_am: 150, hu_vang: 85, tieng_vong: 999, dam_chan: 40, dai_dia_chan: 140, nui_lua: 140, trieu_dang: 140, set_troi: 140, bao_loc: 140, rung_troi: 140, bao_tuyet: 140, mua_kim_cuong: 140, sap_he: 140, cong_huong: 140, dem_den: 140, ham_bong: 70, cau_bong: 150, lan_bong: 999, den_me: 140, cau_trang: 140, tia_sang: 156 });   /* p57: tầm theo bản gộp; chiêu dải ảnh cố định (SK.fix) không giãn theo sân rộng */
const PREF = { utchan: 18, culibong: 36, bovimach: 44, thanhong: 48, golem: 18, rongdo: 40, bachkinh: 46, loiho: 52, vitbao: 34, diepnhan: 28, tuyetky: 40, tinhmieu: 44, cuoitho: 30, banhbao: 48 };   /* áp sát hơn */   /* khoảng cách ưa thích khi chờ hồi chiêu */
const STR = {
  vi: { zone: 'Sân Đấu Linh Thú', start: 'BẮT ĐẦU!', win: n => `${n} THẮNG!`, miss: 'TRƯỢT', crit: 'CHÍ MẠNG!', sup: 'KHẮC HỆ!', weak: 'KHÔNG HIỆU QUẢ', burn: 'BỎNG!', conf: 'RỐI!', selfhit: 'Rối quá, tự đánh mình!',
    atkDown: 'CÔNG ↓', speUp: 'TỐC ĐỘ ↑', faint: n => `${n} kiệt sức!`, again: 'Đấu lại', leave: 'Rời sân', done: 'Xong', yes: 'Đồng ý', no: 'Thôi', askQ: (n, a, b) => `<b>${n}</b> muốn đấu linh thú với bạn!<br>${a} của bạn đấu ${b} — đấu ngay tại đây?`, terr: 'Địa hình', talk: '⚔ Đấu Linh Thú', trainer: 'Huấn luyện viên', you: 'Bạn',
    cdHint: 'Phím 1–4: gọi chiêu', ultReady: 'TUYỆT CHIÊU', sandstorm: 'BÃO CÁT', st: { bong: 'BỎNG', roi: 'RỐI', te: 'TÊ', ngu: 'NGỦ', dong: 'BĂNG' }, te: 'TÊ LIỆT!', dong: 'ĐÓNG BĂNG!', thaw: 'TAN BĂNG!', refl: 'GƯƠNG PHẢN ĐÒN', shield: 'LÁ CHẮN', ngu: 'NGỦ!', wake: 'TỈNH!', speDown: 'TỐC ĐỘ ↓', heal: n => `+${n}`, back: n => `${n}, quay về!`, wildN: 'Thú hoang', dazed: 'KIỆT SỨC! NÉM ẤN THU!', caught: n => `BẮT ĐƯỢC ${n}!`, fled: n => `${n} chạy mất!`, ball: n => `Ấn Thu ×${n}`, noBall: 'Hết Ấn Thu', toTeam: 'vào đội', toBox: 'vào kho', go: n => `Ra trận, ${n}!` },
  en: { zone: 'Spirit Duel Field', start: 'FIGHT!', win: n => `${n} WINS!`, miss: 'MISS', crit: 'CRITICAL!', sup: 'SUPER EFFECTIVE!', weak: 'NOT EFFECTIVE', burn: 'BURNED!', conf: 'CONFUSED!', selfhit: 'It hurt itself in confusion!',
    atkDown: 'ATK ↓', speUp: 'SPEED ↑', faint: n => `${n} fainted!`, again: 'Rematch', leave: 'Leave', done: 'Done', yes: 'Accept', no: 'Not now', askQ: (n, a, b) => `<b>${n}</b> challenges you to a spirit duel!<br>Your ${a} vs ${b} — fight right here?`, terr: 'Terrain', talk: '⚔ Spirit Duel', trainer: 'Trainer', you: 'You',
    cdHint: 'Keys 1–4: call a move', ultReady: 'ULTIMATE', sandstorm: 'SANDSTORM', st: { bong: 'BURN', roi: 'CONF', te: 'PARA', ngu: 'SLEEP', dong: 'FROZEN' }, te: 'PARALYZED!', dong: 'FROZEN!', thaw: 'THAWED!', refl: 'REFLECT', shield: 'SHIELD', ngu: 'ASLEEP!', wake: 'WOKE UP!', speDown: 'SPEED ↓', heal: n => `+${n}`, back: n => `${n}, come back!`, wildN: 'Wild', dazed: 'EXHAUSTED! THROW A SEAL!', caught: n => `CAUGHT ${n}!`, fled: n => `${n} ran away!`, ball: n => `Seal Stone ×${n}`, noBall: 'No Seal Stones', toTeam: 'to team', toBox: 'to storage', go: n => `Go, ${n}!` },
};
const MOVE_EN = { thuy_cham: 'Water Needle', bong_giam: 'Bubble Jail', song_cuon: 'Rolling Wave', trieu_dang: 'Rising Tide', phong_tia: 'Spark Beam', loi_cau: 'Thunder Orb', xung_vong: 'Shock Ring', set_troi: 'Sky Bolt',
  luoi_gio: 'Wind Blade', gio_xuoi: 'Tailwind', lao: 'Quick Rush', bao_loc: 'Cyclone', roi_re: 'Root Whip', hut_nhua: 'Sap Drain', bao_tu: 'Sleep Spores', rung_troi: 'Forest Rise', dam_chan: 'Quake Stomp', nut_dat: 'Fissure Line', cot_da: 'Rock Pillar', dai_dia_chan: 'Great Earthquake', phun_than: 'Ember Spit', lao_lua: 'Flame Rush', gam: 'Scary Roar', nui_lua: 'Mini Volcano', huc: 'Tackle',
  gai_bang: 'Ice Spike', hoi_lanh: 'Frost Breath', guong_bang: 'Ice Mirror', bao_tuyet: 'Blizzard', manh_pha_le: 'Crystal Shard', khuc_xa: 'Refraction', giap_tinh: 'Crystal Armor', mua_kim_cuong: 'Diamond Rain',
  song_am: 'Sound Wave', hu_vang: 'Howl', dap_am: 'Sonic Slam', cong_huong: 'Resonance', tia_sang: 'Light Ray', chop_loa: 'Flash', tu_lanh: 'Self Heal', chan_quang: 'Light Shield', phan_quyet: 'Judgment' };
Object.assign(MOVE_EN, { nut_dat: 'Rock Spikes', nem_da: 'Boulder Toss', dam_chan: 'Quake Ring', don_tho: 'Drill Burrow', dai_dia_chan: 'Earth Dragon Rises', phun_than: 'Spiral Flame', cau_no_lua: 'Blast Orb', vung_nham: 'Lava Geysers', nui_lua: 'Meteor Rain',
  roi_nuoc: 'Water Whip', thuy_cham: 'Water Blades', song_cuon: 'Surging Wave', trieu_dang: 'Bursting Sphere', phong_tia: 'Chain Lightning', xung_vong: 'Static Field', luot_dien: 'Charged Rush', set_troi: 'Storm Cage',
  bo_nhao: 'Hit and Return', gio_xuoi: 'Ghost Step', loc_xoay: 'Vortex', bao_loc: 'Endless Gale', roi_re: 'Binding Roots', bao_tu: 'Sleep Dust', bao_la: 'Leaf Storm', rung_troi: 'Thorn Forest',
  hoi_lanh: 'Frost Gust', gai_bang: 'Falling Icicles', san_bang: 'Ice Swirl', guong_bang: 'Frost Guard', bao_tuyet: 'Frozen Tomb', manh_pha_le: 'Shard Rain', giap_tinh: 'Crystal Shield', tru_pha_le: 'Crystal Spire',
  dich_loi: 'Glitch Step', nhieu_song: 'Cube Cannon', tuong_lua: 'Firewall', ma_hoa: 'Disconnect', sap_he: 'System Crash', song_am: 'Echo Boom', hu_vang: 'Fan Roar', tieng_vong: 'Echo', cong_huong: 'Chorus',
  ham_bong: 'Shadow Jaws', cau_bong: 'Shadow Orb', lan_bong: 'Shadow Sink', den_me: 'Dazing Lantern', dem_den: 'Nightmare', chop_loa: 'Sweeping Light', tu_lanh: 'Light Veil', cau_trang: 'Moon Orb', phan_quyet: 'Eclipse Judgment' });   /* p57 */
/* TÊN HIỂN THỊ TẠM (anh 2026-10-28 tối: chờ duyệt — đổi tên chỉ ở đây) */
const NAME_TMP = { culibong: { vi: 'Cu Li Bóng', en: 'Shade Loris' }, bovimach: { vi: 'Bọ Vi Mạch', en: 'Chip Beetle' }, golem: { vi: 'Thạch Chấn Vương', en: 'Thạch Chấn Vương' }, rongdo: { vi: 'Xích Long', en: 'Xích Long' }, bachkinh: { vi: 'Bạch Kình', en: 'Bạch Kình' }, loiho: { vi: 'Lôi Hồ', en: 'Lôi Hồ' },
  vitbao: { vi: 'Vịt Bão', en: 'Vịt Bão' }, diepnhan: { vi: 'Diệp Nhẫn Giả', en: 'Diệp Nhẫn Giả' },
  tuyetky: { vi: 'Tuyết Kỳ Lân', en: 'Tuyết Kỳ Lân' }, tinhmieu: { vi: 'Tinh Miêu', en: 'Tinh Miêu' }, cuoitho: { vi: 'Cười Thố', en: 'Cười Thố' }, banhbao: { vi: 'Bánh Bao Thánh', en: 'Bánh Bao Thánh' } };
const SPN_EN = { utchan: 'Ut Chan', thanhong: 'Than Hong', golem: 'Stone Golem', rongdo: 'Red Dragon' };
/* miệng phun (px logic so với chân, hướng chưa lật) — lửa / đạn than do engine vẽ từ đây (clip spit không có lửa) */
const MOUTH = { culibong: {"south": [0.2, -5.2], "east": [11.2, -10.2], "north": [0.2, -4.2], "south-east": [12.2, -6.2], "north-east": [10.8, -18.2]},   /* p64: đo trên khung chạm clip cast (tools/px-p64mouth.py) */
  bovimach: {"south": [0.2, -0.8], "east": [10.8, -9.2], "north": [0.2, -24.8], "south-east": [10.2, -3.8], "north-east": [10.8, -17.2]},   /* p64: đo trên khung chạm clip zap (tools/px-p64mouth.py) */
  thanhong: { south: [0, -9], east: [9, -9], north: [0, -12], 'south-east': [6, -9], 'north-east': [7, -11] },
  rongdo: { south: [-5, -12], east: [12, -17], north: [2, -20], 'south-east': [3, -12], 'north-east': [9, -20] },
  /* p53 (anh: tia / luồng / đạn phải BẮT ĐẦU ở miệng hoặc tay, không hở): đo bằng tools/px-p53-mouth.py trên khung chạm (IMPACT) của clip bắn sprite đã thu, soát ảnh assets/px/test/p53/mouth/mouth_<loài>.png.
     Giá trị = px logic so với chân, hướng chưa lật (W = lật E). _c: điểm riêng của clip khác (tư thế khác). Diệp Nhẫn Giả + Bánh Bao: TAY; Thạch Chấn Vương: giữa ngực. */
  golem: { south: [0.2, -17.2], east: [4.8, -18.2], north: [1.2, -18.2], 'south-east': [12.8, -15.2], 'north-east': [8.8, -18.8] },   /* stomp */
  bachkinh: { south: [0.2, -12.2], east: [10.2, -15.8], north: [-0.8, -17.2], 'south-east': [8.2, -8.8], 'north-east': [10.2, -10.8], _c: { wave: { south: [0.8, -9.8], east: [12.8, -6.8], north: [0.2, -14.2], 'south-east': [11.8, -6.8], 'north-east': [10.8, -8.2] } } },   /* spout */
  loiho: { south: [-0.8, -10.8], east: [7.2, -4.2], north: [0.8, -7.2], 'south-east': [3.8, -8.2], 'north-east': [7.2, -5.8] },   /* zap */
  vitbao: { south: [0.2, -7.2], east: [7.2, -7.2], north: [0.2, -11.2], 'south-east': [6.8, -6.2], 'north-east': [6.2, -9.8] },   /* flap */
  diepnhan: { south: [0.2, -11.8], east: [11.2, -8.8], north: [-0.2, -14.2], 'south-east': [10.2, -8.2], 'north-east': [9.2, -9.2] },   /* cast (tay) */
  tuyetky: { south: [0.2, -13.8], east: [9.8, -15.8], north: [1.2, -13.8], 'south-east': [7.8, -8.8], 'north-east': [3.8, -17.2], _c: { raise: { south: [0.2, -14.2], east: [6.2, -12.2], north: [0.2, -20.2], 'south-east': [5.2, -9.8], 'north-east': [10.2, -19.8] } } },   /* blow */
  tinhmieu: { south: [0.2, -7.8], east: [6.2, -7.8], north: [0.2, -14.2], 'south-east': [5.8, -7.2], 'north-east': [4.8, -12.2] },   /* shine */
  cuoitho: { south: [-0.2, -6.8], east: [4.2, -8.2], north: [-0.2, -8.8], 'south-east': [4.2, -5.8], 'north-east': [3.8, -9.8] },   /* shout */
  banhbao: { south: [0.2, -8.8], east: [7.8, -9.2], north: [0.2, -12.8], 'south-east': [7.8, -7.8], 'north-east': [9.8, -12.2], _c: { ult: { south: [0.2, -7.8], east: [9.8, -6.2], north: [0.2, -12.2], 'south-east': [8.2, -7.8], 'north-east': [9.2, -7.8] } } } };   /* beam (tay) */   /* p49c: đo lại trên khung há miệng của sprite đã thu ×0,786 (tools: chấm điểm trên rongdo_spit.png khung 4) */

/* p67:b1:begin */
/* p67 (khối 1): chiêu riêng mỗi loài mới + loài sticker đợt 4 — sau MOUTH (mọi bảng đã khai) */
const SIG = {"bovimach": "ghi_de", "culibong": "mat_dem", "macuu": "thu_bom", "hacgiac": "luoi_bong", "hoahung": "om_hoa", "nguuson": "nguu_xung"};
for (const [sp, id] of Object.entries(SIG)) if (LOAD[sp] && MOVES[id] && !LOAD[sp].includes(id)) LOAD[sp].splice(LOAD[sp].length - 1, 0, id);   /* trước tuyệt chiêu */
Object.assign(MOVE_EN, {"ghi_de": "Overwrite", "mat_dem": "Night Gaze", "thu_bom": "Packet Drop", "luoi_bong": "Shadow Tongue", "om_hoa": "Inferno Hug", "nguu_xung": "Mountain Gore"});
Object.assign(RANGE, {"ghi_de": 140, "mat_dem": 120, "thu_bom": 140, "luoi_bong": 105, "om_hoa": 64, "nguu_xung": 150});
Object.assign(FPS, {"drop": 12, "tongue": 12, "sink": 12, "hug": 12, "gore": 14, "throw": 12, "gaze": 12, "hover": 10, "flymove": 14, "land": 8}); Object.assign(IMPACT, {"drop": 5, "tongue": 4, "sink": 4, "hug": 5, "gore": 4, "throw": 4, "gaze": 4});
for (const [sp, s] of Object.entries({"bovimach": "zap", "culibong": "gaze", "macuu": "drop", "hacgiac": "tongue", "hoahung": "hug", "nguuson": "gore"})) CLIP_SP[sp] = { ...(CLIP_SP[sp] || {}), [SIG[sp]]: s };
MOUTH.culibong._c = { ...(MOUTH.culibong._c || {}), gaze: { south: [0, -8.8], east: [7, -9.2], north: [0, -10], 'south-east': [4, -8.8], 'north-east': [3.5, -11] } };   /* Ánh Mắt Đêm: điểm bắn = đôi MẮT vàng (đo pixel vàng khung chạm clip cast) */
CLIP_SP.macuu = { ...{"dich_loi": "atk", "nhieu_song": "cast", "tuong_lua": "cast", "ma_hoa": "cast", "sap_he": "ult", "thu_bom": "drop"}, ...(CLIP_SP.macuu || {}) }; PREF.macuu = 40; NAME_TMP.macuu = { vi: 'Mã Cưu', en: 'Cipher Dove' }; MOUTH.macuu = {"south": [0, -10.8], "east": [9.5, -10.8], "north": [0, -12.8], "south-east": [4, -8], "north-east": [4.2, -13.8], "_c": {"ult": {"south": [0, -16], "east": [3.3, -14.8], "north": [0, -13.5], "south-east": [2, -13.3], "north-east": [3.8, -12.8]}, "atk": {"south": [0, -9.2], "east": [9, -9.5], "north": [0, -14], "south-east": [9, -3.8], "north-east": [1.2, -13.8]}}};   /* p67: Mã Cưu (pyth_bocau) */
CLIP_SP.hacgiac = { ...{"ham_bong": "atk", "cau_bong": "cast", "lan_bong": "sink", "den_me": "cast", "dem_den": "ult", "luoi_bong": "tongue"}, ...(CLIP_SP.hacgiac || {}) }; PREF.hacgiac = 34; NAME_TMP.hacgiac = { vi: 'Hắc Giác Thú', en: 'Black Horn Beast' }; MOUTH.hacgiac = {"south": [0.2, -7.8], "east": [11.2, -9.2], "north": [0.2, -12.8], "south-east": [12.2, -7.2], "north-east": [11.2, -13.2], "_c": {"tongue": {"south": [0.2, -7.8], "east": [7.8, -9.2], "north": [0.2, -12.2], "south-east": [6.2, -8.2], "north-east": [6.2, -15.8]}}};   /* p67: Hắc Giác Thú (raiku_thuden) */
CLIP_SP.hoahung = { ...{"phun_than": "spit", "cau_no_lua": "spit", "vung_nham": "stomp", "lao_lua": "dash", "nui_lua": "ult", "om_hoa": "hug"}, ...(CLIP_SP.hoahung || {}) }; PREF.hoahung = 30; NAME_TMP.hoahung = { vi: 'Hoả Hùng', en: 'Blaze Bear' }; MOUTH.hoahung = {"south": [0.2, -11.8], "east": [8.8, -13.8], "north": [0.2, -13.2], "south-east": [7.8, -9.2], "north-east": [9.8, -14.2], "_c": {"hug": {"south": [0.2, -12.8], "east": [6.2, -10.8], "north": [0.2, -13.2], "south-east": [7.2, -8.2], "north-east": [8.8, -14.8]}}};   /* p67: Hoả Hùng (fogo_gau) */
CLIP_SP.nguuson = { ...{"nut_dat": "stomp", "nem_da": "throw", "dam_chan": "stomp", "don_tho": "stomp", "dai_dia_chan": "ult", "nguu_xung": "gore"}, ...(CLIP_SP.nguuson || {}) }; PREF.nguuson = 22; NAME_TMP.nguuson = { vi: 'Ngưu Sơn', en: 'Mountain Ox' }; MOUTH.nguuson = {"south": [0.2, -12.2], "east": [13.8, -13.8], "north": [0.2, -17.8], "south-east": [13.2, -9.8], "north-east": [15.2, -21.8], "_c": {"gore": {"south": [0.2, -9.8], "east": [17.2, -11.2], "north": [0.2, -18.8], "south-east": [13.8, -10.2], "north-east": [18.8, -26.2]}}};   /* p67: Ngưu Sơn (eclipse_bo) */
/* p67:b1:end */
/* p72:b1:begin */
/* p72 (plan-51) khối 1 — LINH THÚ đấu như Chấn Thú: bảng riêng từng dạng (sau MOUTH). Miệng (MOUTH.<dạng>) do patch-p72.py chèn từ gói ảnh đã đo.
   clip: chiêu → tư thế PixelLab (cast / atk / ult; 'hurt' vẽ code: chớp trắng + nảy lùi). pref: khoảng ưa thích. shoot: tư thế bắn mặc định. */
const LTD = {
  kylan: { pref: 40, en: 'Fire Qilin', shoot: 'cast', clip: { phun_than: 'cast', loc_lua: 'cast', lao_lua: 'atk', troi_nang: 'cast', nui_lua: 'ult' } },
  kylan2: { pref: 40, en: 'Qilin Emperor', shoot: 'cast', clip: { phun_than: 'cast', loc_lua: 'cast', lao_lua: 'atk', troi_nang: 'cast', nui_lua: 'ult' } },
  tete: { pref: 26, en: 'Sand Pangolin', shoot: 'cast', clip: { cuon_lan: 'roll', loc_cat: 'cast', dam_chan: 'stomp', giap_chan: 'cast', dai_dia_chan: 'ult' } },
  tete2: { pref: 26, en: 'Stone-Plate Pangolin', shoot: 'cast', clip: { cuon_lan: 'roll', loc_cat: 'cast', dam_chan: 'stomp', giap_chan: 'cast', dai_dia_chan: 'ult' } },
  hac: { pref: 40, en: 'Thunder Crane', shoot: 'cast', fly: 6, clip: { mo_set: 'atk', loi_cau: 'cast', xung_vong: 'cast', tich_dien: 'cast', set_troi: 'ult' } },
  hac2: { pref: 40, en: 'Heaven-Bolt Crane', shoot: 'cast', fly: 6, clip: { mo_set: 'atk', loi_cau: 'cast', xung_vong: 'cast', tich_dien: 'cast', set_troi: 'ult' } },
  saola: { pref: 30, en: 'Jade Saola', shoot: 'cast', clip: { huc_sung: 'atk', roi_re: 'cast', hut_nhua: 'cast', bao_tu: 'cast', rung_troi: 'ult' } },
  saola2: { pref: 30, en: 'Forest God Saola', shoot: 'cast', clip: { huc_sung: 'atk', roi_re: 'cast', hut_nhua: 'cast', bao_tu: 'cast', rung_troi: 'ult' } },
  daibang: { pref: 34, en: 'Canyon Eagle', shoot: 'cast', fly: 7, clip: { bo_nhao: 'atk', nem_dia_chan: 'atk', luoi_gio: 'cast', gio_xuoi: 'cast', bao_loc: 'ult' } },
  daibang2: { pref: 34, en: 'Storm Eagle', shoot: 'cast', fly: 7, clip: { bo_nhao: 'atk', nem_dia_chan: 'atk', luoi_gio: 'cast', gio_xuoi: 'cast', bao_loc: 'ult' } },
  de: { pref: 32, en: 'Quake Cricket', shoot: 'cast', clip: { gay_rung: 'cast', hoa_am: 'cast', dap_am: 'atk', hu_vang: 'cast', cong_huong: 'ult' } },
  de2: { pref: 32, en: 'Bronze King Cricket', shoot: 'cast', clip: { gay_rung: 'cast', hoa_am: 'cast', dap_am: 'atk', hu_vang: 'cast', cong_huong: 'ult' } },
  tacke: { pref: 40, en: 'Mirror Gecko', shoot: 'cast', clip: { phan_than: 'cast', lang_kinh: 'cast', tia_sang: 'cast', chan_quang: 'cast', phan_quyet: 'ult' } },
  tacke2: { pref: 40, en: 'Prism Gecko', shoot: 'cast', clip: { phan_than: 'cast', lang_kinh: 'cast', tia_sang: 'cast', chan_quang: 'cast', phan_quyet: 'ult' } },
  kimquy: { pref: 44, en: 'Golden Turtle', shoot: 'cast', clip: { cau_tam: 'cast', khuc_xa: 'cast', giap_tinh: 'cast', manh_pha_le: 'cast', than_luc: 'ult' } },
  kimquy2: { pref: 44, en: 'Guardian Golden Turtle', shoot: 'cast', clip: { cau_tam: 'cast', khuc_xa: 'cast', giap_tinh: 'cast', manh_pha_le: 'cast', than_luc: 'ult' } },
  chuichui: { pref: 26, en: 'Amethyst Mole', shoot: 'cast', clip: { don_tho: 'dig', mua_da_lo: 'cast', nut_dat: 'atk', manh_pha_le: 'cast', dai_dia_chan: 'ult' } },
  chuichui2: { pref: 26, en: 'Crystal Mole King', shoot: 'cast', clip: { don_tho: 'dig', mua_da_lo: 'cast', nut_dat: 'atk', manh_pha_le: 'cast', dai_dia_chan: 'ult' } },
  cachep: { pref: 40, en: 'Dragon-Gate Carp', shoot: 'cast', clip: { voi_xoay: 'cast', vu_mon: 'atk', song_cuon: 'cast', bong_giam: 'cast', trieu_dang: 'ult' } },
  cachep2: { pref: 40, en: 'Dragon Carp', shoot: 'cast', clip: { voi_xoay: 'cast', vu_mon: 'atk', song_cuon: 'cast', bong_giam: 'cast', trieu_dang: 'ult' } },
  coc: { pref: 36, en: 'Rain-Call Toad', shoot: 'cast', clip: { luoi_dinh: 'cast', dap_vung: 'atk', goi_mua: 'cast', bong_giam: 'cast', thuy_phao: 'ult' } },
  rocky: { pref: 36, en: 'Rocky', shoot: 'cast', clip: { rk_fist: 'atk', rk_quake: 'atk', rk_storm: 'cast', rk_shield: 'cast', rk_dash: 'atk', rk_ult: 'cast' } },   /* plan-90 */
  coc2: { pref: 36, en: 'Rain God Toad', shoot: 'cast', clip: { luoi_dinh: 'cast', dap_vung: 'atk', goi_mua: 'cast', bong_giam: 'cast', thuy_phao: 'ult' } },
};
for (const sp of LT_SPECIES) { const s = SPECIES[sp], d = LTD[sp] || {}; LOAD[sp] = s.moves.slice(); CLIP_SP[sp] = { ...(d.clip || {}) }; PREF[sp] = d.pref || 36; NAME_TMP[sp] = { vi: s.name, en: d.en || s.name }; }
Object.assign(RANGE, { loc_lua: 120, troi_nang: 999, cuon_lan: 130, loc_cat: 120, giap_chan: 999, mo_set: 110, tich_dien: 999, huc_sung: 120, nem_dia_chan: 120, gay_rung: 150, hoa_am: 60, lang_kinh: 150, phan_than: 999, chan_quang: 999, cau_tam: 140, than_luc: 140, voi_xoay: 130, vu_mon: 120, luoi_dinh: 100, mua_da_lo: 130, dap_vung: 110, goi_mua: 999, thuy_phao: 130 });
Object.assign(FPS, { roll: 14 }); Object.assign(IMPACT, { roll: 2 });
Object.assign(RANGE, { rk_fist: 150, rk_quake: 46, rk_storm: 120, rk_shield: 999, rk_dash: 110, rk_ult: 120 });   /* plan-90: Rocky golem */
Object.assign(MOVE_EN, { rk_fist: 'Flying Rock Fist', rk_quake: 'Block Quake', rk_storm: 'Rockstorm Split', rk_shield: 'Seismic Chest Shield', rk_dash: 'Boulder Charge', rk_ult: 'Giant Stone Fist' });
MOUTH.rocky = { south: [0, -10.8], east: [14, -22.6], north: [0, -17.2], 'south-east': [9.7, -16.2], 'north-east': [9.7, -20.5] };   /* plan-90 cỡ = Elyziuma (K 1.077) */   /* gốc chiêu = 2 bàn tay chụm / nắm tay vươn (đo khung bắn clip ha / đấm) */
Object.assign(MOVE_EN, { loc_lua: 'Fire Tornado', troi_nang: 'Harsh Sun', cuon_lan: 'Rolling Ram', loc_cat: 'Sand Twister', giap_chan: 'Quake Shield', mo_set: 'Thunder Peck', tich_dien: 'Charge Up', huc_sung: 'Leaf Horn Charge', nem_dia_chan: 'Seismic Toss', gay_rung: 'Shriek Wave', hoa_am: 'Quake Chorus', lang_kinh: 'Prism', phan_than: 'Mirror Decoys', cau_tam: 'Mind Orb', than_luc: 'Divine Lift', voi_xoay: 'Whirl Jet', vu_mon: 'Dragon Gate Leap', luoi_dinh: 'Sticky Tongue', mua_da_lo: 'Rockslide Rain', dap_vung: 'Puddle Slam', thuy_phao: 'Water Cannon' });

MOUTH.kylan = {"south": [-0.2, -6.2], "east": [6.2, -6.8], "north": [0.2, -10.2], "south-east": [4.8, -8.2], "north-east": [7.2, -8.8], "_c": {"atk": {"south": [-0.2, -6.8], "east": [7.2, -7.8], "north": [-0.2, -11.2], "south-east": [5.8, -8.8], "north-east": [5.8, -9.2]}, "ult": {"south": [-0.2, -6.2], "east": [4.2, -8.2], "north": [0.2, -12.2], "south-east": [4.2, -8.2], "north-east": [5.2, -10.8]}}};   /* p72: đo trên gói ảnh assets/px/test/p51/pack */
MOUTH.kylan2 = {"south": [0.0, -9.8], "east": [6.0, -8.0], "north": [0.0, -14.5], "south-east": [6.5, -7.0], "north-east": [4.0, -13.0], "_c": {"atk": {"south": [0.0, -9.5], "east": [7.5, -8.5], "north": [0.0, -16.0], "south-east": [7.0, -8.0], "north-east": [5.5, -13.5]}, "ult": {"south": [0.0, -10.6], "east": [4.5, -10.0], "north": [0.0, -15.5], "south-east": [6.0, -9.5], "north-east": [5.0, -10.5]}}};   /* p72: đo trên gói ảnh assets/px/test/p72/kylan2/pack */
MOUTH.tete = {"south": [0.0, -5.1], "east": [10.0, -3.0], "north": [0.0, -11.0], "_c": {"atk": {"south": [0.0, -7.8], "east": [9.0, -3.5], "north": [0.0, -12.0]}, "ult": {"south": [0.0, -6.9], "east": [8.0, -3.5], "north": [0.0, -11.0]}}};   /* p72: đo trên gói ảnh assets/px/test/p72/tete/pack */
MOUTH.tete2 = {"south": [0.0, -7.6], "east": [8.0, -4.0], "north": [0.0, -13.0], "_c": {"atk": {"south": [0.0, -8.7], "east": [7.5, -4.5], "north": [0.0, -13.5]}, "ult": {"south": [0.0, -7.8], "east": [7.5, -4.5], "north": [0.0, -13.5]}}};   /* p72: đo trên gói ảnh assets/px/test/p72/tete2/pack */
MOUTH.hac = {"south": [0.0, -9.3], "east": [6.8, -8.0], "north": [0.0, -14.0], "south-east": [6.2, -7.0], "north-east": [4.2, -10.5], "_c": {"atk": {"south": [0.0, -9.6], "east": [5.8, -10.5], "north": [0.0, -14.0], "south-east": [6.8, -8.0], "north-east": [4.8, -9.0]}, "ult": {"south": [0.0, -10.1], "east": [4.8, -10.5], "north": [0.0, -15.0], "south-east": [4.8, -10.0], "north-east": [4.8, -12.5]}}};   /* p72: đo trên gói ảnh assets/px/test/p72/hac/pack */
MOUTH.saola = {"south": [0.0, -9.8], "east": [9.0, -7.5], "north": [0.0, -15.0], "south-east": [6.0, -11.5], "north-east": [6.5, -9.0], "_c": {"atk": {"south": [0.0, -10.2], "east": [8.5, -10.0], "north": [0.0, -15.5], "south-east": [4.5, -12.0], "north-east": [4.5, -11.0]}, "ult": {"south": [0.0, -10.1], "east": [6.0, -9.5], "north": [0.0, -16.0], "south-east": [4.5, -9.5], "north-east": [5.0, -9.0]}}};   /* p72: đo trên gói ảnh assets/px/test/p72/saola/pack */
MOUTH.saola2 = {"south": [0.0, -10.2], "east": [9.5, -9.5], "north": [0.0, -16.5], "_c": {"atk": {"south": [0.0, -10.6], "east": [8.5, -7.0], "north": [0.0, -15.0]}, "ult": {"south": [0.0, -10.5], "east": [7.0, -9.5], "north": [0.0, -16.5]}}};   /* p72: đo trên gói ảnh assets/px/test/p72/saola2/pack */
MOUTH.daibang = {"south": [0.0, -9.4], "east": [5.5, -8.0], "north": [0.0, -13.5], "south-east": [6.5, -9.5], "north-east": [7.5, -8.0], "_c": {"atk": {"south": [0.0, -8.9], "east": [6.0, -6.0], "north": [0.0, -14.0], "south-east": [7.5, -8.5], "north-east": [6.0, -8.5]}, "ult": {"south": [0.0, -9.1], "east": [5.0, -9.5], "north": [0.0, -14.0], "south-east": [6.5, -9.5], "north-east": [5.0, -12.0]}}};   /* p72: đo trên gói ảnh assets/px/test/p72/daibang/pack */
MOUTH.de = {"south": [0.0, -6.6], "east": [7.2, -6.5], "north": [0.0, -6.5], "_c": {"atk": {"south": [0.0, -6.8], "east": [7.8, -7.5], "north": [0.0, -8.0]}, "ult": {"south": [0.0, -7.1], "east": [6.8, -4.5], "north": [0.0, -8.0]}}};   /* p72: đo trên gói ảnh assets/px/test/p72/de/pack */
MOUTH.tacke = {"south": [0.0, -6.4], "east": [7.0, -6.0], "north": [0.0, -9.0], "_c": {"atk": {"south": [0.0, -6.3], "east": [6.5, -7.0], "north": [0.0, -8.0]}, "ult": {"south": [0.0, -7.5], "east": [6.5, -6.5], "north": [0.0, -11.0]}}};   /* p72: đo trên gói ảnh assets/px/test/p72/tacke/pack */
MOUTH.kimquy = {"south": [0.0, -6.9], "east": [7.8, -5.0], "north": [0.0, -12.5], "_c": {"atk": {"south": [0.0, -6.5], "east": [6.2, -8.0], "north": [0.0, -10.5]}, "ult": {"south": [0.0, -6.9], "east": [7.2, -6.5], "north": [0.0, -12.5]}}};   /* p72: đo trên gói ảnh assets/px/test/p72/kimquy/pack */
MOUTH.chuichui = {"south": [0.0, -5.1], "east": [7.5, -3.0], "north": [0.0, -8.5], "_c": {"atk": {"south": [0.0, -7.5], "east": [9.5, -3.0], "north": [0.0, -8.5]}, "ult": {"south": [0.0, -6.7], "east": [5.5, -4.5], "north": [0.0, -9.0]}}};   /* p72: đo trên gói ảnh assets/px/test/p72/chuichui/pack */
MOUTH.cachep = {"south": [0.0, -5.9], "east": [5.0, -5.0], "north": [0.0, -8.5], "_c": {"atk": {"south": [0.0, -8.6], "east": [4.0, -5.5], "north": [0.0, -9.5]}, "ult": {"south": [0.0, -8.0], "east": [4.5, -6.0], "north": [0.0, -9.5]}}};   /* p72: đo trên gói ảnh assets/px/test/p72/cachep/pack */
MOUTH.coc = {"south": [0.0, -5.1], "east": [2.5, -8.5], "north": [0.0, -11.0], "_c": {"atk": {"south": [0.0, -7.0], "east": [3.5, -8.0], "north": [0.0, -11.5]}, "ult": {"south": [0.0, -6.7], "east": [1.5, -10.5], "north": [0.0, -11.5]}}};   /* p72: đo trên gói ảnh assets/px/test/p72/coc/pack */
MOUTH.de2 = {"south": [0.0, -6.6], "east": [7.2, -6.5], "north": [0.0, -6.5], "_c": {"atk": {"south": [0.0, -6.8], "east": [7.8, -7.5], "north": [0.0, -8.0]}, "ult": {"south": [0.0, -7.1], "east": [6.8, -4.5], "north": [0.0, -8.0]}}};   /* p72: đo trên gói ảnh assets/px/test/p72/de2/pack */
MOUTH.chuichui2 = {"south": [0.0, -5.1], "east": [7.5, -3.0], "north": [0.0, -8.5], "_c": {"atk": {"south": [0.0, -7.5], "east": [9.5, -3.0], "north": [0.0, -8.5]}, "ult": {"south": [0.0, -6.7], "east": [5.5, -4.5], "north": [0.0, -9.0]}}};   /* p72: đo trên gói ảnh assets/px/test/p72/chuichui2/pack */
MOUTH.tacke2 = {"south": [0.0, -6.4], "east": [7.0, -6.0], "north": [0.0, -9.0], "_c": {"atk": {"south": [0.0, -6.3], "east": [6.5, -7.0], "north": [0.0, -8.0]}, "ult": {"south": [0.0, -7.5], "east": [6.5, -6.5], "north": [0.0, -11.0]}}};   /* p72: đo trên gói ảnh assets/px/test/p72/tacke2/pack */
MOUTH.hac2 = {"south": [0.0, -10.4], "east": [7.0, -9.5], "north": [0.0, -15.0], "south-east": [4.5, -10.0], "north-east": [3.5, -12.0], "_c": {"atk": {"south": [0.0, -8.8], "east": [6.0, -6.5], "north": [0.0, -14.0], "south-east": [7.5, -8.0], "north-east": [4.5, -12.0]}, "ult": {"south": [0.0, -10.1], "east": [4.5, -9.0], "north": [0.0, -14.5], "south-east": [6.0, -6.5], "north-east": [6.0, -8.5]}}};   /* p72: đo trên gói ảnh assets/px/test/p72/hac2/pack */
MOUTH.daibang2 = {"south": [0.0, -10.4], "east": [4.5, -11.0], "north": [0.0, -14.5], "south-east": [4.5, -9.0], "north-east": [4.0, -9.0], "_c": {"atk": {"south": [0.0, -10.9], "east": [5.5, -7.0], "north": [0.0, -16.0], "south-east": [4.0, -13.5], "north-east": [3.0, -15.0]}, "ult": {"south": [0.0, -10.4], "east": [5.5, -10.0], "north": [0.0, -14.0], "south-east": [4.0, -10.5], "north-east": [4.5, -9.0]}}};   /* p72: đo trên gói ảnh assets/px/test/p72/daibang2/pack */
MOUTH.kimquy2 = {"south": [0.0, -8.0], "east": [6.5, -7.0], "north": [0.0, -10.5], "south-east": [5.5, -6.5], "north-east": [7.0, -9.5], "_c": {"atk": {"south": [0.0, -7.5], "east": [7.0, -7.0], "north": [0.0, -11.0], "north-east": [6.5, -10.0]}, "ult": {"south": [0.0, -8.5], "east": [6.5, -6.0], "north": [0.0, -13.5], "south-east": [8.0, -8.0], "north-east": [6.5, -9.0]}}};   /* p72: đo trên gói ảnh assets/px/test/p72/kimquy2/pack */
MOUTH.cachep2 = {"south": [0.0, -7.7], "east": [4.8, -6.5], "north": [0.0, -13.0], "south-east": [2.8, -7.5], "north-east": [3.8, -11.0], "_c": {"atk": {"south": [0.0, -8.7], "east": [3.2, -7.5], "north": [0.0, -14.0], "south-east": [3.2, -8.0], "north-east": [4.2, -11.0]}, "ult": {"south": [0.0, -9.0], "east": [3.8, -7.5], "north": [0.0, -13.5], "south-east": [2.2, -9.5], "north-east": [4.2, -11.0]}}};   /* p72: đo trên gói ảnh assets/px/test/p72/cachep2/pack */
MOUTH.coc2 = {"south": [0.0, -6.9], "east": [4.8, -6.0], "north": [0.0, -10.5], "_c": {"atk": {"south": [0.0, -6.9], "east": [4.2, -7.5], "north": [0.0, -11.5]}, "ult": {"south": [0.0, -7.2], "east": [5.2, -5.5], "north": [0.0, -11.0]}}};   /* p72: đo trên gói ảnh assets/px/test/p72/coc2/pack */
/* p72:b1:end */
/* p96:b1:begin */
/* p96 (khối 1): dòng Molandak — bộ chiêu, clip riêng (m*), miệng (mcast = đỉnh lưng bắn kim, mpout = môi), tầm, tên EN */
LOAD.molandak = ["lan_gai", "ban_gai", "tre_moi", "cuon_thu", "cau_gai"]; CLIP_SP.molandak = {"lan_gai": "mroll", "ban_gai": "mcast", "tre_moi": "mpout", "cuon_thu": "mcurl", "cau_gai": "mroll"}; PREF.molandak = 24; NAME_TMP.molandak = { vi: 'Molandak', en: 'Molandak' }; MOUTH.molandak = {"south": [0.0, -2.9], "east": [3.8, -4.3], "north": [0.0, -6.5], "south-east": [2.9, -4.2], "north-east": [4.8, -5.2], "_c": {"mpout": {"south": [0.0, -2.9], "east": [4.9, -6.8], "north": [0.0, -6.5], "south-east": [4.0, -6.5], "north-east": [4.4, -7.3]}, "mcast": {"south": [0.0, -16.5], "east": [0.8, -14.0], "north": [0.0, -12.0], "south-east": [-0.8, -16.0], "north-east": [-1.3, -15.5]}}};
LOAD.molandak2 = ["lan_gai2", "ban_gai2", "tre_moi2", "cuon_thu2", "cau_gai2"]; CLIP_SP.molandak2 = {"lan_gai2": "mroll", "ban_gai2": "mcast", "tre_moi2": "mpout", "cuon_thu2": "mcurl", "cau_gai2": "mroll"}; PREF.molandak2 = 26; NAME_TMP.molandak2 = { vi: 'Molandak Lão Luyện', en: 'Veteran Molandak' }; MOUTH.molandak2 = {"south": [0.0, -3.6], "east": [3.8, -4.4], "north": [0.0, -8.5], "south-east": [3.2, -4.3], "north-east": [5.6, -6.4], "_c": {"mpout": {"south": [0.0, -7.8], "east": [5.6, -6.6], "north": [0.0, -8.5], "south-east": [5.9, -7.3], "north-east": [5.2, -9.0]}, "mcast": {"south": [0.0, -15.5], "east": [-0.4, -18.5], "north": [0.0, -14.5], "south-east": [-0.6, -19.5], "north-east": [-1.6, -16.5]}}};
LOAD.molandak3 = ["lan_gai3", "ban_gai3", "tre_moi3", "cuon_thu3", "cau_gai3"]; CLIP_SP.molandak3 = {"lan_gai3": "mroll", "ban_gai3": "mcast", "tre_moi3": "mpout", "cuon_thu3": "mcurl", "cau_gai3": "mroll"}; PREF.molandak3 = 28; NAME_TMP.molandak3 = { vi: 'Molandak Vương', en: 'Molandak King' }; MOUTH.molandak3 = {"south": [0.0, -8.7], "east": [5.1, -8.6], "north": [0.0, -14.2], "south-east": [4.5, -7.1], "north-east": [6.0, -9.4], "_c": {"mpout": {"south": [0.0, -15.5], "east": [5.9, -9.5], "north": [0.0, -14.2], "south-east": [5.5, -11.1], "north-east": [6.6, -10.0]}, "mcast": {"south": [0.0, -25.5], "east": [-1.0, -21.0], "north": [0.0, -21.0], "south-east": [0.6, -25.0], "north-east": [-0.7, -19.0]}}};
Object.assign(MOVE_EN, {"lan_gai": "Quill Roll", "ban_gai": "Quill Spray", "tre_moi": "Smug Pout", "cuon_thu": "Spike Ball Guard", "cau_gai": "Head-On Quill Comet", "lan_gai2": "Quill Roll", "ban_gai2": "Quill Spray", "tre_moi2": "Smug Pout", "cuon_thu2": "Spike Ball Guard", "cau_gai2": "Head-On Quill Comet", "lan_gai3": "Quill Roll", "ban_gai3": "Quill Spray", "tre_moi3": "Smug Pout", "cuon_thu3": "Spike Ball Guard", "cau_gai3": "Head-On Quill Comet"});
Object.assign(RANGE, {"lan_gai": 130, "ban_gai": 130, "tre_moi": 80, "cuon_thu": 999, "cau_gai": 140, "lan_gai2": 130, "ban_gai2": 130, "tre_moi2": 80, "cuon_thu2": 999, "cau_gai2": 140, "lan_gai3": 130, "ban_gai3": 130, "tre_moi3": 80, "cuon_thu3": 999, "cau_gai3": 140});
Object.assign(FPS, {"mroll": 14, "mcurl": 12, "mcast": 12, "mpout": 10, "mult": 12}); Object.assign(IMPACT, {"mroll": 3, "mcurl": 2, "mcast": 4, "mpout": 4, "mult": 4});
/* p96:b1:end */
/* p99:b1:begin */
/* p99 (khối 1): dòng Moyaki — bộ chiêu, clip riêng (y*), miệng (yblow = môi thổi bóng), tầm, tên EN */
LOAD.moyaki = ["quay_vay", "bong_bong", "liec_mat", "nguoc_dong", "vuot_thac"]; CLIP_SP.moyaki = {"quay_vay": "ydash", "bong_bong": "yblow", "liec_mat": "yeye", "nguoc_dong": "yswim", "vuot_thac": "yult"}; PREF.moyaki = 34; NAME_TMP.moyaki = { vi: 'Moyaki', en: 'Moyaki' }; MOUTH.moyaki = {"south": [0.2, -4.8], "east": [5.8, -5.8], "north": [0.2, -9.2], "south-east": [7.2, -4.2], "north-east": [3.2, -8.8]};
LOAD.moyaki2 = ["quay_vay2", "bong_bong2", "liec_mat2", "nguoc_dong2", "vuot_thac2"]; CLIP_SP.moyaki2 = {"quay_vay2": "ydash", "bong_bong2": "yblow", "liec_mat2": "yeye", "nguoc_dong2": "yswim", "vuot_thac2": "yult"}; PREF.moyaki2 = 36; NAME_TMP.moyaki2 = { vi: 'Moyaki Vượt Thác', en: 'Rapids Moyaki' }; MOUTH.moyaki2 = {"south": [0.2, -5.2], "east": [12.2, -4.8], "north": [0.2, -13.8], "south-east": [11.2, -3.8], "north-east": [13.2, -5.2]};
LOAD.moyaki3 = ["quay_vay3", "bong_bong3", "liec_mat3", "nguoc_dong3", "vuot_thac3"]; CLIP_SP.moyaki3 = {"quay_vay3": "ydash", "bong_bong3": "yblow", "liec_mat3": "yeye", "nguoc_dong3": "yswim", "vuot_thac3": "yult"}; PREF.moyaki3 = 38; NAME_TMP.moyaki3 = { vi: 'Moyaki Long Ngư', en: 'Dragonfin Moyaki' }; MOUTH.moyaki3 = {"south": [0.2, -5.8], "east": [12.8, -6.8], "north": [0.2, -15.8], "south-east": [11.8, -4.2], "north-east": [14.8, -8.8]};
Object.assign(MOVE_EN, {"quay_vay": "Fin-Flop Dash", "bong_bong": "Pout Bubbles", "liec_mat": "Smug Side-Eye", "nguoc_dong": "Upstream Grit", "vuot_thac": "Leap the Dragon Gate", "quay_vay2": "Fin-Flop Dash", "bong_bong2": "Pout Bubbles", "liec_mat2": "Smug Side-Eye", "nguoc_dong2": "Upstream Grit", "vuot_thac2": "Leap the Dragon Gate", "quay_vay3": "Fin-Flop Dash", "bong_bong3": "Pout Bubbles", "liec_mat3": "Smug Side-Eye", "nguoc_dong3": "Upstream Grit", "vuot_thac3": "Leap the Dragon Gate"});
Object.assign(RANGE, {"quay_vay": 130, "bong_bong": 130, "liec_mat": 90, "nguoc_dong": 999, "vuot_thac": 140, "quay_vay2": 130, "bong_bong2": 130, "liec_mat2": 90, "nguoc_dong2": 999, "vuot_thac2": 140, "quay_vay3": 130, "bong_bong3": 130, "liec_mat3": 90, "nguoc_dong3": 999, "vuot_thac3": 140});
Object.assign(FPS, {"ydash": 14, "yblow": 12, "yeye": 10, "yswim": 12, "yult": 12}); Object.assign(IMPACT, {"ydash": 2, "yblow": 4, "yeye": 4, "yswim": 4, "yult": 4});
/* p99:b1:end */
/* p100:b1:begin */
/* p100 (khối 1): dòng Chog — bộ chiêu, clip riêng (g*), điểm bắn (gmane = giữa bờm, gmic = tay cầm micro), tầm, tên EN */
LOAD.chog = ["tin_nong", "bom_gai", "phong_van", "cuoi_tit", "ban_tin"]; CLIP_SP.chog = {"tin_nong": "gdash", "bom_gai": "gmane", "phong_van": "gmic", "cuoi_tit": "glaugh", "ban_tin": "gult"}; PREF.chog = 40; NAME_TMP.chog = { vi: 'Chog', en: 'Chog' }; MOUTH.chog = {"_c": {"gmane": {"south": [0.2, -13.2], "east": [-1.2, -12.2], "north": [0.2, -13.2], "south-east": [0.8, -11.8], "north-east": [1.2, -11.2]}, "gmic": {"south": [3.2, -7.8], "east": [12.2, -7.2], "north": [0.2, -8.8], "south-east": [9.2, -5.2], "north-east": [12.2, -7.2]}}, "south": [0.2, -13.2], "east": [-1.2, -12.2], "north": [0.2, -13.2], "south-east": [0.8, -11.8], "north-east": [1.2, -11.2]};
LOAD.chog2 = ["tin_nong2", "bom_gai2", "phong_van2", "cuoi_tit2", "ban_tin2"]; CLIP_SP.chog2 = {"tin_nong2": "gdash", "bom_gai2": "gmane", "phong_van2": "gmic", "cuoi_tit2": "glaugh", "ban_tin2": "gult"}; PREF.chog2 = 42; NAME_TMP.chog2 = { vi: 'Chog Phóng Viên', en: 'Reporter Chog' }; MOUTH.chog2 = {"_c": {"gmane": {"south": [0.2, -12.8], "east": [-0.8, -13.8], "north": [0.2, -14.2], "south-east": [1.2, -11.2], "north-east": [0.8, -11.8]}, "gmic": {"south": [3.2, -8.8], "east": [12.8, -7.2], "north": [0.2, -9.8], "south-east": [10.2, -5.2], "north-east": [12.2, -8.8]}}, "south": [0.2, -12.8], "east": [-0.8, -13.8], "north": [0.2, -14.2], "south-east": [1.2, -11.2], "north-east": [0.8, -11.8]};
LOAD.chog3 = ["tin_nong3", "bom_gai3", "phong_van3", "cuoi_tit3", "ban_tin3"]; CLIP_SP.chog3 = {"tin_nong3": "gdash", "bom_gai3": "gmane", "phong_van3": "gmic", "cuoi_tit3": "glaugh", "ban_tin3": "gult"}; PREF.chog3 = 44; NAME_TMP.chog3 = { vi: 'Chog Đại Mưu', en: 'Mastermind Chog' }; MOUTH.chog3 = {"_c": {"gmane": {"south": [0.2, -13.8], "east": [0.8, -13.2], "north": [0.2, -15.2], "south-east": [0.8, -14.2], "north-east": [1.2, -13.8]}, "gmic": {"south": [3.2, -9.2], "east": [11.8, -6.8], "north": [0.2, -9.8], "south-east": [10.2, -5.8], "north-east": [11.2, -7.2]}}, "south": [0.2, -13.8], "east": [0.8, -13.2], "north": [0.2, -15.2], "south-east": [0.8, -14.2], "north-east": [1.2, -13.8]};
Object.assign(MOVE_EN, {"tin_nong": "Breaking-News Dash", "bom_gai": "Static Quills", "phong_van": "Hot-Mic Question", "cuoi_tit": "Giggle Glitch", "ban_tin": "History in the Making", "tin_nong2": "Breaking-News Dash", "bom_gai2": "Static Quills", "phong_van2": "Hot-Mic Question", "cuoi_tit2": "Giggle Glitch", "ban_tin2": "History in the Making", "tin_nong3": "Breaking-News Dash", "bom_gai3": "Static Quills", "phong_van3": "Hot-Mic Question", "cuoi_tit3": "Giggle Glitch", "ban_tin3": "History in the Making"});
Object.assign(RANGE, {"tin_nong": 130, "bom_gai": 50, "phong_van": 90, "cuoi_tit": 999, "ban_tin": 140, "tin_nong2": 130, "bom_gai2": 50, "phong_van2": 90, "cuoi_tit2": 999, "ban_tin2": 140, "tin_nong3": 130, "bom_gai3": 50, "phong_van3": 90, "cuoi_tit3": 999, "ban_tin3": 140});
Object.assign(FPS, {"gdash": 14, "gmane": 12, "gmic": 12, "glaugh": 12, "gult": 12}); Object.assign(IMPACT, {"gdash": 2, "gmane": 4, "gmic": 4, "glaugh": 4, "gult": 4});
/* p100:b1:end */
const LEASH = 120;
/* ===== anh chốt 2026-10-28 khuya (phương án a): THÁCH ĐẤU MỌI NƠI → CHUYỂN CẢNH SANG SÂN ĐẤU TẠM 'duel_field' (không lưu) =====
   Nền sân theo địa hình nơi đang đứng: cỏ/rừng → sân cỏ (gói m3: bụi, đá, cây viền) · biển/bờ nước → sân cát có hồ (gói m1) · hầm/dung nham → sân đá hầm
   (gói arena = hầm Sàn Đấu Ngầm) · đá/tuyết → sân đá (gói m4). Sân 30×20 ô, vài vật cản phá được (đá / cây), 2 huấn luyện viên 2 đầu sân, không có dân.
   Hết trận chuyển cảnh về ĐÚNG chỗ cũ (vùng, vị trí, hướng). Đấu Trường Leader: opts.field === 'leader_arena' → đấu tại chỗ trong sân của nó (móc). */
const FW = 40, FH = 25, FIELD_TOP = 100, FIELD_BOT = FH * 16 - 40, FIELD_PACK = { grass: 'm3', sand: 'm1', cave: 'arena', rock: 'm4', sea: 'm1' };
let GRASS_PACK = null;   /* anh 2026-10-28: sân cỏ bỏ lá thu — gói m3 (cỏ PixelLab) nhưng decor chỉ giữ cụm cỏ thấp, bỏ lá rơi / nấm / vết nứt */
function fieldPack() {
  const k = FIELD.kind, p = ART.packs[FIELD_PACK[k]] || ART.packs.m3; if (!p) return p;   /* review7: mọi loại sân bỏ hết decor (cụm cỏ, sỏi, sao biển…) — sân sạch để hiệu ứng nổi */
  if (!GRASS_PACK || GRASS_PACK.src !== p) GRASS_PACK = { ...p, decor: {}, src: p };
  return GRASS_PACK;
}
const FIELD = { kind: 'grass', seed: 1 };
function rnd2(seed) { let x = seed | 0 || 1; return () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return ((x >>> 0) % 10000) / 10000; }; }
function buildField() {
  const k = FIELD.kind, R = rnd2(FIELD.seed), base = { grass: T.GRASS, sand: T.SAND, cave: T.ROCK, rock: T.ROCK, sea: T.SAND }[k];
  const m = makeMap(FW, FH, base);
  for (let y = 0; y < FH; y++) for (let x = 0; x < FW; x++) {
    const e = Math.min(x, y, FW - 1 - x, FH - 1 - y);
    /* review7 (video Pokémon Arena 2D): SÂN SẠCH — nền trơn 1 loại ô (cỏ trơn / cát / đá), không lốm đốm; vạch sân phấn vẽ ở drawGround */
    if (e < 1) setG(m, x, y, k === 'cave' ? T.DARK : base, true);   /* viền cứng */
  }
  if (k === 'sand') { const cx = (FW >> 1) + Math.round(R() * 4 - 2), cy = Math.round(FH * 0.62), rx = 3.6, ry = 2.4; for (let y = 0; y < FH; y++) for (let x = 0; x < FW; x++) if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1) setG(m, x, y, T.WATER, true); m.pond = { x: cx * 16 + 8, y: cy * 16 + 8 }; }
  if (k === 'sea') {   /* review7 SÂN BIỂN: nước giữa sân, 2 bờ cát 2 đầu (huấn luyện viên), 7 bè gỗ 2×2 ô đi được; thú không bơi nhảy giữa các bè */
    for (let y = 1; y < FH - 1; y++) for (let x = 4; x < FW - 4; x++) setG(m, x, y, T.WATER, true);
    m.rafts = [[7, 9], [11, 5], [11, 13], [15, 9], [19, 5], [19, 13], [23, 9]].map(([x, y]) => [Math.round(x * FW / 30), Math.round(y * FH / 20)]).map(([x, y]) => {   /* p54: bè giãn theo sân rộng */ for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) setG(m, x + i, y + j, T.WATER, false); return { x: x * 16 + 16, y: y * 16 + 16 }; });
    m.entries = { default: { x: 2, y: FH >> 1 } }; m.duelFoe = { x: (FW - 3) * 16 + 8, y: (FH >> 1) * 16 + 14 }; m.duelCenter = { x: FW * 8, y: FH * 8 };
    m.reserved.push(m.entries.default); m.npcArea = null; m.gates = []; return m;
  }
  const border = { grass: 'tree', sand: 'palm', cave: 'boulder', rock: 'boulder' }[k], inner = { grass: ['rock', 'bush', 'rock_s'], sand: ['rock', 'rock_s'], cave: ['boulder', 'rock'], rock: ['boulder', 'rock', 'rock_s'] }[k];
  for (let x = 1; x < FW - 1; x += 3) { place(m, border, x, 1); place(m, border, x, FH - 2); }
  for (let y = 4; y < FH - 3; y += 4) { place(m, border, 1, y); place(m, border, FW - 2, y); }
  const spots = [[10, 8], [29, 17], [30, 8]];   /* p54: giãn theo sân 40×25 (tránh 2 đầu sân có huấn luyện viên) */   /* review7: chỉ 3 vật cản (đá to đầu tiên — test hất văng đập đá cần 1 tảng) để sân thoáng, hiệu ứng nổi */
  spots.forEach(([x, y], i) => { if (m.solid[y * FW + x]) return; place(m, i === 0 ? (k === 'cave' || k === 'rock' ? 'boulder' : 'rock') : inner[Math.floor(R() * inner.length)], x, y, { duelProp: true }); });
  m.entries = { default: { x: 3, y: FH >> 1 } }; m.duelFoe = { x: (FW - 4) * 16 + 8, y: (FH >> 1) * 16 + 14 }; m.duelCenter = { x: FW * 8, y: FH * 8 };   /* p54: 2 huấn luyện viên 2 đầu sân rộng */
  m.reserved.push(m.entries.default); m.npcArea = null; m.gates = [];
  for (let x = 28; x <= 52; x++) m.reserved.push({ x, y: 8 });   /* p54: sân rộng 40 ô — chặn quầy Nhà buôn tranh của trees.js (đặt ở x 30–50, y 7–9 mọi vùng) mọc giữa sân */
  return m;
}
ZONES.duel_field = { id: 'duel_field', lv: -2, order: 0.44, hidden: true, name: { en: 'Spirit Duel', vi: 'Sân Đấu Linh Thú' }, tremor: 0, build: () => buildField(),
  systems: ['linhduel', 'trees', 'gather', 'drops', 'vfx', 'photo'], flavor: { en: ['Two trainers. Two spirits.'], vi: ['Hai huấn luyện viên. Hai linh thú.'] } };
try { if (!Object.getOwnPropertyDescriptor(ART.packs, 'duel_field')) Object.defineProperty(ART.packs, 'duel_field', { get: () => fieldPack(), configurable: true, enumerable: false }); } catch (e) { }
function fieldKindAt(ctx) {   /* địa hình nơi đang đứng → loại sân */
  const z = ctx.S.zone || {}, id = z.id || ''; if (/^(arena|rift)/.test(id) || z.under) return 'cave';
  const m = ctx.S.map, p = ctx.S.player, c = { water: 0, grass: 0, lava: 0, rock: 0, n: 0 };
  for (let y = -6; y <= 6; y++) for (let x = -8; x <= 8; x++) { const t = ctx.getG(m, Math.floor(p.x / 16) + x, Math.floor(p.y / 16) + y); c.n++;
    if (t === T.WATER || t === T.DEEP || t === T.REEF || t === T.SAND || t === T.SAND2) c.water++; else if (t === T.GRASS || t === T.GRASS2 || t === T.FLOWER || t === T.MOSS) c.grass++;
    else if (t === T.LAVA || t === T.ASH || t === T.DARK) c.lava++; else if (t === T.ROCK || t === T.STONE || t === T.SNOW || t === T.ICE || t === T.GRAVEL) c.rock++; }
  if (c.lava / c.n > 0.08) return 'cave'; if (c.water / c.n > 0.12) return 'sand'; if (c.grass / c.n > 0.3) return 'grass'; if (c.rock / c.n > 0.3) return 'rock'; return 'grass';
}
function startDuel(ctx, opts = {}) { opts = normOpts(opts, ctx); if (ctx.linhthu && ctx.linhthu.duelBegin) try { ctx.linhthu.duelBegin(); } catch (e) { }   /* p72: thu linh thú đi cùng vào Ấn Linh */   /* E → Đồng ý: sân Leader → đấu tại chỗ; còn lại → chuyển cảnh sang sân tạm */
  if (opts.field === 'leader_arena') return loadDuel().then(() => startBattle(ctx, opts));
  if (opts.wild && opts.wildAt) { hideAsk(); return loadDuel().then(() => startBattle(ctx, opts)); }   /* p79 (plan-79): thú hoang đánh TẠI CHỖ trên map, không chuyển sân tạm */
  const p = ctx.S.player, z = ctx.S.zone; if (z.id === 'duel_field') return loadDuel().then(() => startBattle(ctx, opts));
  ST.ret = { zone: z.id, entry: ctx.S.save.entry || 'default', x: p.x, y: p.y, dir: p.dir };
  FIELD.kind = opts.kind || fieldKindAt(ctx); FIELD.seed = (Date.now() & 0xffff) | 1;
  const n = opts.foe; ST.pending = { ...opts, foeM: n && n.m, foeSheet: n && n.sheet }; hideAsk();
  const pr = ST.pair || DEF_SP; ST.pending.mySp = ST.pending.mySp || spOfE((opts.team || [])[0]) || pr[0]; ST.pending.foeSp = ST.pending.foeSp || spOfE((opts.foeTeam || [])[0]) || pr[1];   /* plan-58: đội → con đầu */
  if (!opts.kind && FIELD.kind === 'sand' && [ST.pending.mySp, ST.pending.foeSp].some(sp => SWIM[sp])) FIELD.kind = 'sea';   /* review7: có thú bơi + gần nước → sân biển có bè */
  loadDuel().then(() => wipe('in', [ST.pending.mySp, ST.pending.foeSp], () => { if (!ctx.travel('duel_field', 'default', FAST)) ST.pending = null; }));
}
const FAST = { speed: 40 };   /* màn đen của travel gần như tức thì — che bằng màn chuyển cảnh riêng (wipe) */
function leaveField(ctx) {   /* về đúng chỗ cũ */
  const r = ST.ret; ST.restore = r; ST.ret = null; const sp = ST.lastSp || DEF_SP;
  wipe('out', sp, () => { if (!r || !ctx.travel(r.zone, r.entry, FAST)) { ST.restore = null; if (!r) ctx.travel('village', 'default', FAST); } });
}
/* anh 2026-10-28: CHUYỂN CẢNH RIÊNG vào / ra sân ~0,7 s: dải vệt tốc độ chéo quét kín màn → 2 chân dung chớp kiểu VS → mở ra; ra sân thì quét ngược. Không lặp. */
const WIPE_T = 0.72, WIPE_MID = 0.3;
function wipe(kind, sp, cb) { ST.wipe = { t0: performance.now(), kind, sp, cb, fired: false }; }
function drawWipe(ug, W, H) {
  const w = ST.wipe; if (!w) return; const t = (performance.now() - w.t0) / 1000;
  if (!w.fired && t >= WIPE_MID) { w.fired = true; try { w.cb && w.cb(); } catch (e) { console.error('wipe', e); } }
  if (t >= WIPE_T) { ST.wipe = null; return; }
  const rev = w.kind === 'out', sl = H * 0.55, span = W + sl;
  const cover = t < WIPE_MID ? (t / WIPE_MID) : 1, open = t < WIPE_MID + 0.12 ? 0 : Math.min(1, (t - WIPE_MID - 0.12) / (WIPE_T - WIPE_MID - 0.12));
  const e0 = -sl + span * (1 - Math.pow(1 - cover, 2)), e1 = -sl + span * open * open;   /* mép trước / mép sau của dải (theo trục x, nghiêng sl) */
  const X = x => rev ? W - x : x;
  ug.save(); ug.beginPath(); ug.moveTo(X(e1), 0); ug.lineTo(X(e0 + sl), 0); ug.lineTo(X(e0), H); ug.lineTo(X(e1 - sl), H); ug.closePath(); ug.clip();
  ug.fillStyle = '#120d1a'; ug.fillRect(0, 0, W, H);
  const c0 = TYPE_COLOR[(SPECIES[w.sp[0]] || {}).types?.[0]] || '#6aa8e0', c1 = TYPE_COLOR[(SPECIES[w.sp[1]] || {}).types?.[0]] || '#e06a6a';
  const slm = VFXM && VFXM.speedlines, sim = slm && img(slm.file); ug.imageSmoothingEnabled = false;
  if (sim) { const f = Math.floor(t * slm.fps) % slm.n, sw = sim.naturalWidth / slm.n, sh = sim.naturalHeight, bh = H / 3, kk = bh / sh;
    for (let r = 0; r < 3; r++) { ug.globalAlpha = 0.5; const off = ((t * 1400 * (r % 2 ? 1.3 : 1)) % (sw * kk)); for (let x = -off; x < W; x += sw * kk) ug.drawImage(sim, f * sw, 0, sw, sh, rev ? W - x - sw * kk : x, r * bh, sw * kk, bh); } ug.globalAlpha = 1; }
  ug.fillStyle = c0; ug.fillRect(0, H * 0.47, W, Math.max(3, H * 0.012)); ug.fillStyle = c1; ug.fillRect(0, H * 0.51, W, Math.max(3, H * 0.012));
  const pk = t < WIPE_MID - 0.08 ? 0 : t > WIPE_T - 0.18 ? Math.max(0, (WIPE_T - t) / 0.1) : Math.min(1, (t - WIPE_MID + 0.08) / 0.08);   /* chân dung chớp ra giữa lúc kín màn */
  if (pk > 0) { const ps = Math.min(W * 0.3, H * 0.42), P = SPR && SPR._port, cy = H * 0.49;
    for (let i = 0; i < 2; i++) { const pi = P && P[w.sp[i]] && img(P[w.sp[i]]); const x = i ? W * 0.72 + (1 - pk) * W * 0.2 : W * 0.28 - (1 - pk) * W * 0.2;
      ug.globalAlpha = pk; ug.fillStyle = i ? c1 : c0; ug.beginPath(); ug.arc(x, cy, ps * 0.5, 0, Math.PI * 2); ug.fill(); ug.fillStyle = '#120d1a'; ug.beginPath(); ug.arc(x, cy, ps * 0.45, 0, Math.PI * 2); ug.fill();
      if (pi) { const k = ps * 0.8 / Math.max(pi.naturalWidth, pi.naturalHeight); ug.save(); ug.translate(x, cy); if (i) ug.scale(-1, 1); ug.drawImage(pi, -pi.naturalWidth * k / 2, -pi.naturalHeight * k / 2, pi.naturalWidth * k, pi.naturalHeight * k); ug.restore(); } }
    const vs = img('linhduel/ui/vs.png'); if (vs) { const vw = Math.min(W * 0.22, ps * 0.8), vh = vw * vs.naturalHeight / vs.naturalWidth; ug.drawImage(vs, W / 2 - vw / 2, cy - vh / 2, vw, vh); } ug.globalAlpha = 1; }
  ug.restore();
  ug.save(); ug.strokeStyle = '#fff3d6'; ug.lineWidth = Math.max(3, W / 200); ug.beginPath(); if (cover < 1) { ug.moveTo(X(e0 + sl), 0); ug.lineTo(X(e0), H); } if (open > 0 && open < 1) { ug.moveTo(X(e1), 0); ug.lineTo(X(e1 - sl), H); } ug.stroke(); ug.restore();
}
/* anh 2026-10-28 tối: 'rồng mà không biết bay à?' — thú BAY: độ cao alt (px logic), bóng elip trên đất, bay qua mọi thứ trừ mép bản đồ;
   hạ thấp khi cắn / lao / tuyệt chiêu; chiêu mặt đất của Chấn (Dậm Chấn, Nứt Đất) ×0,5 khi đang bay cao ('BAY NÉ ĐẤT'). */
const FLY = { rongdo: { alt: 6 } };   /* p49c: thân nhỏ đi ×0,79 → bay thấp hơn tương ứng (8 → 6) */   /* clip 'fly' đã tự nâng thân ~6 px → engine thêm 8 (tổng ~12–14 trên bóng) */
const GROUND_MV = { dam_chan: 1, nut_dat: 1 };
/* anh 2026-10-28 tối: Xích Long PHUN LỬA KÉO DÀI (như video tham khảo) — Phun Than của loài có BREATH = luồng lửa liên tục ~1,8 s, dài ≤ 76 px (~4,7 ô),
   quét chậm theo mục tiêu, 6 nhịp sát thương nhỏ (tổng ≈ chiêu cũ), có tỉ lệ bỏng; dọc luồng: dân / Rocky / người chơi bị hất nhẹ, cỏ / đất để vết cháy,
   cây bén lửa ngắn, gặp nước thì xì hơi nước; vật cứng chặn thì luồng dừng ở đó. Hình: chuỗi khối lửa vfx_workbench (breath_blob) + đầu bùng (breath_head) + hơi nước (steam). */
const BREATH = { rongdo: { dur: 1.8, len: 76, ticks: 6, turn: 1.3 } };
const WIDE = { R: 1.6, P: 2.2 };   /* p54: sân rộng — tầm chiêu xa ×1,6 / khoảng ưa thích ×2,2 (≤ bề ngang khung nhìn − 40 px) */
const wideCap = () => Math.max(60, ((ST.ctx && ST.ctx.VW) || 320) - 50);
const rangeOf = (f, id) => { const r = id === 'phun_than' && BREATH[f.sp] ? 66 : RANGE[id]; if (SK[id] && SK[id].fix) return r; return ST.inField && r >= 90 && r < 900 ? Math.max(r, Math.min(r * WIDE.R, wideCap())) : r; };
const prefOf = f => ST.inField ? Math.max(PREF[f.sp], Math.min(PREF[f.sp] * (PREF[f.sp] >= 40 ? WIDE.P : 1.6), wideCap() * 0.8)) : PREF[f.sp];
const DEF_SP = ['golem', 'rongdo'];   /* trận thử mặc định (anh 2026-10-28 tối): 2 thú sticker; Ụt Chấn / Than Hồng TẠM DỪNG (giữ dữ liệu, không dùng) */   /* thú cách người chơi quá xa → tự kéo trận về gần */
const CRACK = 'linhduel/ui/crack2.png', SCORCH = 'linhduel/ui/scorch.png';
/* ---------- ảnh ---------- */
const BASE = 'assets/px/';
const IMG = {}; let SPR = null, VFXM = null, metaP = null;
function img(src) { if (!IMG[src]) { const i = new Image(); i.src = BASE + src; IMG[src] = i; } const i = IMG[src]; return i.complete && i.naturalWidth ? i : null; }
function loadMeta() {
  if (metaP) return metaP;
  metaP = Promise.all([fetch(BASE + 'linhduel/duel_sprites.json').then(r => r.json()), fetch(BASE + 'linhduel/vfx.json').then(r => r.json())])
    .then(([s, v]) => { SPR = s; VFXM = v; for (const [k, sp] of Object.entries(s)) { if (k[0] === '_') { for (const f of Object.values(sp)) if (typeof f === 'string') img(f); continue; } for (const c of Object.values(sp)) if (c && c.file) img(c.file); } for (const e of Object.values(v)) img(e.file); for (const u of ['ko_frame', 'ko_frame_tall', 'warn_edge_land', 'warn_edge_tall', 'beam_trench', 'victory_banner']) img('linhduel/ui/' + u + '.png'); for (const t of ['chan', 'nham', 'trieu', 'loi', 'phong', 'moc', 'suong', 'tinh', 'am', 'quang']) img('linhduel/vfx/beam3_' + t + '.png'); })   /* plan-52: nạp sẵn ảnh UI dùng 1 lần (img() lần đầu trả null khi chưa tải) */.catch(e => console.error('linhduel meta', e));
  return metaP;
}
const loadDuel = () => loadMeta().then(() => Promise.all([x2Load(), orbLoad(), antLoad()]));   /* p57: thư viện vfx2 (~120 json + ảnh) chỉ tải khi sắp đấu — không làm chậm lúc vào game / đổi vùng */
const WHITE = new Map();   /* bản trắng của sheet (lóe khi trúng đòn) */
function whiteOf(im) {
  let c = WHITE.get(im); if (c) return c;
  c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight; const x = c.getContext('2d');
  x.drawImage(im, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = '#fff6e8'; x.fillRect(0, 0, c.width, c.height); WHITE.set(im, c); return c;
}
const DARK = new Map();
function darkOf(im) {
  let c = DARK.get(im); if (c) return c;
  c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight; const x = c.getContext('2d');
  x.drawImage(im, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = '#16101c'; x.fillRect(0, 0, c.width, c.height); DARK.set(im, c); return c;
}

/* ---------- trạng thái trận ---------- */
const ST = { trenches: [], ko: null, zCur: 1, zHold: 0, scars: [], waves: [], knocks: [], wrap: new Map(), crowdT: 0, on: false, ph: 'off', t: 0, ctx: null, F: [], fx: [], gfx: [], decals: [], shots: [], runners: [], timers: [], texts: [], calls: [null, null], log: [], auto: [true, true], speed: 1,
  hitstop: 0, cut: null, end: null, weather: null, wxT: 0, foe: null, el: null, panel: null, cam: { x: 0, y: 0 }, stats: { acts: {}, hits: 0 },
  team: [[], []], multi: false, mode: '1v1', sw: [null, null], swCd: [0, 0], swLast: [-99, -99], swBan: [null, null], swQ: [null, null], aiSw: [false, true], aiT: [0, 0], orbs: [], streaks: [], fxo: [], teamRects: [] };   /* plan-58: đội nhiều thú + Ấn Chấn */
const L = ctx => STR[ctx.lang() === 'en' ? 'en' : 'vi'];
const mvName = (ctx, id) => ctx.lang() === 'en' ? (MOVE_EN[id] || MOVES[id].name) : MOVES[id].name;
const spName = (ctx, sp) => ctx.lang() === 'en' && SPECIES_EN[sp] ? SPECIES_EN[sp] : NAME_TMP[sp] ? NAME_TMP[sp][ctx.lang() === 'en' ? 'en' : 'vi'] : ctx.lang() === 'en' ? (SPN_EN[sp] || SPECIES[sp].name) : SPECIES[sp].name;
const rnd = () => Math.random();
const fName = (ctx, f) => (f && f.nick && !(SPECIES[f.sp] && f.nick === SPECIES[f.sp].name)) ? f.nick : spName(ctx, f.sp);   /* p74: biệt danh trùng tên loài tiếng Việt → tên theo ngôn ngữ */   /* plan-58 C.2: biệt danh Chấn Thú của người chơi */

/* p49c — BẬC CỠ (plan-50 §G): thú nhỏ nhanh + né giỏi (máu / sức hơi thấp), thú to chậm + máu trâu + đánh đau. Hệ số nhỏ (≤ ±18 %) để khắc hệ (×1,5 / ×0,67) vẫn quyết định. */
const TIER = { s: { hp: 0.9, atk: 0.95, spe: 1.18, dodge: 0.15 }, m: { hp: 1, atk: 1, spe: 1, dodge: 0 }, l: { hp: 1.15, atk: 1.08, spe: 0.85, dodge: -0.08 } };
function tierStats(st, size) { const k = TIER[size] || TIER.m; return { ...st, hp: Math.round(st.hp * k.hp), atk: Math.round(st.atk * k.atk), spa: Math.round(st.spa * k.atk), spe: Math.round(st.spe * k.spe) }; }
const ACC_STAGE = s => (s >= 0 ? (3 + s) / 3 : 3 / (3 - s));
const dodgeB = f => (TIER[f.tier] || TIER.m).dodge;
const stunned = f => !!(f.status && (f.status.id === 'ngu' || f.status.id === 'dong'));
function mkFighter(side, sp, lv, x, y, e) { return ltLock(P78.equip(mkFighter0(side, sp, lv, x, y), e)); }   /* p78: bộ mang theo (save mv / tự xếp) */   /* p72: mở chiêu linh thú theo cấp */
function mkFighter0(side, sp, lv, x, y) {
  const s = SPECIES[sp], st = tierStats(statsOf(s, lv), s.size), max = st.hp * HP_MUL;
  return { side, sp, lv, tier: s.size || 'm', types: s.types, st, max, hp: max, x, y, fx: 0, fy: side ? 1 : -1, clip: 'idle', ct: 0, act: null, cds: Object.fromEntries(LOAD[sp].map(m => [m, MOVES[m].ult ? MOVES[m].cd : 1.5 + side * 0.8])),
    basicT: 1, stage: { atk: 0, def: 0, spa: 0, spd: 0, spe: 0, acc: 0 }, status: null, kb: null, flash: 0, plan: null, rethink: 0, orbit: rnd() < 0.5 ? 1 : -1, orbitT: 2, dodge: null, queued: null, moving: false, hurtT: 0, dead: false };
}
const foeReal = f => ST.F[1 - f.side];   /* p73 */
const MV78 = q => (q && q.moves) || LOAD[q.sp];   /* p78: bộ mang theo của từng con (save mv / tự xếp) — thiếu thì bộ cũ của loài */
const foeOf = f => { const o = ST.F[1 - f.side]; return (o && o.p73dec && P73.decoyFor(f, o)) || o; };   /* p73: Hình Nhân Lá — AI đối thủ nhắm hình nhân */
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const speedOf = f => (34 + f.st.spe * 1.0) * STAGE(f.stage.spe) * (f.slowT > 0 ? 0.55 : 1) * P73.spdMul(f);   /* p73: ƯỚT −1 bậc · Khúc Tàn Canh +1 bậc */   /* p57: đứng trên Xoáy Băng thì chậm */
function statsFor(f) {   /* chỉ số hiệu lực (bậc + trạng thái) cho calcDamage */
  const k = n => Math.max(1, Math.round(f.st[n] * STAGE(f.stage[n] || 0)));
  return { atk: k('atk'), def: k('def'), spa: k('spa'), spd: k('spd'), types: f.types, st: f.status && f.status.id };
}

/* ---------- âm thanh / chữ nổi / ô tên chiêu ---------- */
function sfx(n) { try { if (ST.ctx && ST.ctx.duelSfx && (n === 'hit' || n === 'smash')) return; ST.ctx && ST.ctx.sfx(n); } catch (e) { } }   /* p49c: đã có tiếng file (duelSfx) thì bỏ tiếng tổng hợp hit / smash trùng */
/* plan-49a: MÓC ÂM THANH ĐẤU THÚ — mỗi sự kiện gọi duelSfx(tên, dữ liệu) đúng 1 lần. Hiện KHÔNG phát gì (no-op); sau này gắn: ctx.duelSfx = (tên, d) => …
   Tên: move_start, ult_cast, hit, hit_big, clash_start, beam_fire, clash_boom, ko_freeze, ko_burst, ko_bounce, ko_land, dig_down, dig_up, lightning_strike, boulder_land, wave_crash */
function duelSfx(name, d) { if (d && !d.type && (d.id || d.mv) !== 'huc') { const m0 = MOVES[d.id || d.mv]; if (m0) d.type = m0.type; }   /* p49c: kèm hệ chiêu cho tiếng <hệ>_cast / <hệ>_hit (đánh thường 'huc' thì không — dùng tiếng hit chung) */
  (ST.hooks = ST.hooks || []).push(name); if (ST.hooks.length > 80) ST.hooks.shift(); try { const h = ST.ctx && ST.ctx.duelSfx; if (h) h(name, d || null); } catch (e) { } }
const STAND_H = {};   /* chiều cao dáng đứng (đỉnh bbox khung đứng đầu tiên, px logic) — neo mũi tên / chữ nổi; KHÔNG theo clip cao nhất (anh: mũi tên Xích Long cao trên điện thoại) */
function standH(f) {
  if (STAND_H[f.sp] != null) return STAND_H[f.sp]; const c = SPR && SPR[f.sp] && SPR[f.sp].idle, im = c && img(c.file); if (!im) return 22;
  try { const cv = document.createElement('canvas'); cv.width = c.cw; cv.height = c.ch; const x = cv.getContext('2d'); x.drawImage(im, 0, 0, c.cw, c.ch, 0, 0, c.cw, c.ch); const d = x.getImageData(0, 0, c.cw, c.ch).data;
    let top = c.ch; for (let y = 0; y < c.ch && top === c.ch; y++) for (let xx = 0; xx < c.cw; xx++) if (d[(y * c.cw + xx) * 4 + 3] > 40) { top = y; break; }
    STAND_H[f.sp] = (c.ay - top) / 2; } catch (e) { STAND_H[f.sp] = c.ay / 2; }
  return STAND_H[f.sp];
}
function headY(f) { return f.y - standH(f) - (f.alt || 0); }
function text(x, y, s, col = '#fff', size = 1, life = 1.1) {   /* anh: gom tối đa 2 dòng mỗi thú, xếp TRÊN đầu thú (không đè thân) */
  const who = ST.F.find(f => Math.abs(f.x - x) < 14 && y < f.y + 4 && y > f.y - 70);
  if (who) { const mine = ST.texts.filter(o => o.who === who); while (mine.length >= 2) { const o = mine.shift(); ST.texts.splice(ST.texts.indexOf(o), 1); }
    x = who.x; y = headY(who) - 14 - (mine.length ? 9 : 0); for (const o of mine) o.y = Math.min(o.y, y - 9); }
  else for (const o of ST.texts) if (o.t < 0.5 && Math.abs(o.x - x) < 30 && Math.abs(o.y - y) < 7) y = Math.min(y, o.y - 8);
  ST.texts.push({ x, y, s, col, size: size * 1.15, t: 0, life, dx: who ? 0 : (rnd() - 0.5) * 6, who }); if (ST.texts.length > 24) ST.texts.shift(); }
function callout(f, id) { ST.calls[f.side] = { s: mvName(ST.ctx, id) + '!', t: 0, ult: !!MOVES[id].ult, type: MOVES[id].type }; }

/* ---------- VFX ---------- */
function vfx(name, x, y, opt = {}) { if (DFX.CODE && (ST.noVfx > 0 || name === 'dust')) { if (name === 'dust') DFX.dust(x, y, 3); return null; }
  if (DFX.CODE && VSUB[name]) { const [he, k] = VSUB[name]; if (he === 'steam') DFX.steam(x, y); else DFX.burst(x, y, he, k, opt.ky ?? y + 6); return null; }   /* p52f: chớp trúng / trạng thái (tê, bỏng, khiên…) ngoài chiêu có cảnh → vẽ code */   /* p52e: chiêu có cảnh code → không vẽ ảnh PixelLab; bụi = bụi vẽ code */
  if (!VFXM || !VFXM[name]) return null; const e = { name, x, y, t: -(opt.delay || 0), flip: !!opt.flip, ground: !!opt.ground, ky: opt.ky ?? y, loop: opt.loop || 0, crop: opt.crop || 0, flipY: !!opt.flipY, a: opt.a ?? 1, follow: opt.follow || null, ox: opt.ox || 0, oy: opt.oy || 0, dky: opt.dky ?? 0, hold: opt.hold || 0, hA: opt.hA ?? 0, hB: opt.hB ?? 0 }; if (e.follow) { e.ox = x - e.follow.x; e.oy = y - e.follow.y; } (e.ground ? ST.gfx : ST.fx).push(e); return e; }   /* p57: follow (bám thú) · hold + hA..hB (lặp khung giữa tới hết giờ) · crop (cắt dài từ neo theo +x) · flipY · a */
function vfxDone(e) { const m = VFXM[e.name]; if (e.hold) return e.t >= e.hold + (m.n - e.hB - 1) / m.fps; return !e.loop && e.t * m.fps >= m.n; }
function drawVfx(g, e, cx, cy) {
  const m = VFXM[e.name], im = img(m.file); if (!im || e.t < 0) return; let f = Math.floor(e.t * m.fps) % m.n;
  if (e.hold) { const tb = (e.hB + 1) / m.fps; f = e.t < tb ? Math.floor(e.t * m.fps) : e.t < e.hold ? e.hA + Math.floor((e.t - tb) * m.fps) % (e.hB - e.hA + 1) : Math.min(m.n - 1, e.hB + 1 + Math.floor((e.t - e.hold) * m.fps)); }
  const sw = im.naturalWidth / m.n, sh = im.naturalHeight, k = sw / m.w, cw = e.crop ? Math.min(m.w, e.crop + m.ax) : m.w, x = (globalThis.__R89||Math.round)(e.x - cx - (e.flip ? cw - m.ax : m.ax)), y = (globalThis.__R89||Math.round)(e.y - cy - (e.flipY ? m.h - m.ay : m.ay));
  if (e.a < 1) g.globalAlpha = e.a;
  if (e.flip || e.flipY) { g.save(); g.translate(x + (e.flip ? cw : 0), y + (e.flipY ? m.h : 0)); g.scale(e.flip ? -1 : 1, e.flipY ? -1 : 1); g.drawImage(im, f * sw, 0, cw * k, sh, 0, 0, cw, m.h); g.restore(); }
  else g.drawImage(im, f * sw, 0, cw * k, sh, x, y, cw, m.h);
  if (e.a < 1) g.globalAlpha = 1;
}
const VSUB = { hit: ['chan', 0.55], hit_loi: ['loi', 0.45], hit_phong: ['phong', 0.45], hit_moc: ['moc', 0.45], hit_suong: ['suong', 0.45], hit_tinh: ['tinh', 0.45], hit_am: ['am', 0.45], hit_quang: ['quang', 0.45], hit_ma: ['ma', 0.45], x2_hit_ma: ['ma', 0.45], fireboom: ['nham', 0.7], firepuff: ['nham', 0.22], steam: ['steam', 1] };   /* p52f */
const isWater = (x, y) => { const c = ST.ctx, m = c && c.S.map; if (!m) return false; const t = c.getG(m, Math.floor(x / 16), Math.floor(y / 16)); return t === T.WATER || t === T.DEEP || t === T.REEF; };
const isGrass = (x, y) => { const c = ST.ctx, m = c && c.S.map; if (!m) return false; const t = c.getG(m, Math.floor(x / 16), Math.floor(y / 16)); return t === T.GRASS || t === T.GRASS2 || t === T.FLOWER || t === T.MOSS; };
function ground(x, y, src, a, sz = 'mid') {   /* nước: bắn nước · cỏ: hố đất lộ (vết nứt mảnh trên cỏ trông như cành củi — anh chê) · đất / cát / đá: vết nứt / vết cháy */
  if (isWater(x, y)) { vfx('splash', x, y, { ky: y + 0.5 }); sfx('splash'); return; }
  if (src === CRACK && isGrass(x, y)) { if (sz !== 'big') { decal('linhduel/ui/crack_dirt1.png', x, y, 0, Math.min(0.8, a + 0.1)); return; } const cr = ST.decals.filter(d => d.src === 'spar/fx/crater_sand.png'); if (cr.length >= 3) ST.decals.splice(ST.decals.indexOf(cr[0]), 1); decal('spar/fx/crater_sand.png', x, y, 0, Math.min(0.85, a + 0.1)); return; }   /* hố tròn chỉ cho cú to, tối đa 3 hố */   /* plan-49a: vết nhỏ không còn là hố tròn (tổ ong) */
  if (src === CRACK) src = { big: 'linhduel/ui/crack_dirt0.png', mid: 'linhduel/ui/crack_dirt2.png', small: 'linhduel/ui/crack_dirt1.png' }[sz] || src;   /* đất / cát: vết nứt PixelLab edit_image trên chính ô đường đất Làng (anh chê bản cũ giống cành cây) */
  decal(src, x, y, 0, a);
}   /* đất: vết nứt / cháy · nước: bắn nước */
function wrapNpc(n) {   /* ghi đè TẠM n.draw (luật 14/10: ghi đè trên chính đối tượng rồi delete): mờ alpha + nhấc độ cao z */
  if (ST.wrap.has(n)) return ST.wrap.get(n);
  if (Object.prototype.hasOwnProperty.call(n, 'draw')) return null;   /* hệ khác đang ghi đè → không đụng */
  const st = { z: 0, a: 1 }, d0 = Object.getPrototypeOf(n).draw;
  n.draw = function (g) { const q = ST.wrap.get(this) || st; if (q.a >= 0.99 && q.z <= 0.5) return d0.call(this, g); g.save(); if (q.a < 0.99) g.globalAlpha *= q.a; if (q.z > 0.5) g.translate(0, -Math.round(q.z)); d0.call(this, g); g.restore(); };
  ST.wrap.set(n, st); return st;
}
function unwrapAll() { for (const [n, st] of ST.wrap) { delete n.draw; if (st.sm !== undefined) n.speedMul = st.sm; } ST.wrap.clear(); }
function crowdCtl(ctx, dt) {   /* dân trong vùng trận (~120 px quanh 2 thú): mờ nhẹ 0,75 để thú nổi; ai sát thú (< 72 px) thì đi chậm lùi ra ~3 ô */
  if ((ST.crowdT -= dt) > 0) return; ST.crowdT = 0.4;
  for (const n of ctx.allNpcs()) {
    if (n === ST.foe || n === ST.villager || n.m && n.m.friend) continue;
    let near = null, nd = 1e9; for (const f of ST.F) { const d = Math.hypot(n.x - f.x, n.y - f.y); if (d < nd) { nd = d; near = f; } }
    let st = ST.wrap.get(n);
    if (nd < 120) { st = st || wrapNpc(n); if (!st) continue; st.a = 0.75;
      if (nd < 72 && !ST.knocks.some(k => k.n === n) && !n.busy) { const dx = n.x - near.x, dy = n.y - near.y, d = Math.hypot(dx, dy) || 1, q = nearWalk(ctx, near.x + dx / d * 124, near.y + dy / d * 124);
        if (st.sm === undefined) st.sm = n.speedMul; n.speedMul = 0.7; n.goal = { x: q.x, y: q.y }; n.path = null; ST.stats.npcBack = (ST.stats.npcBack || 0) + 1; }
    } else if (st) { st.a = 1; if (st.sm !== undefined) { n.speedMul = st.sm; delete st.sm; } }
  }
}
function knockNpc(n, dx, dy, pw) {   /* dân / NPC: lảo đảo (nhẹ) hoặc bay rồi ngã (mạnh) — KHÔNG mất máu, không chết; clip PixelLab stagger / knockfly / knockdown của thân */
  if (ST.knocks.some(k => k.n === n)) return;
  const fly = pw >= 1, sp = fly ? 95 * Math.min(1.5, pw) : 55;
  const k = { n, vx: dx * sp, vy: dy * sp, t: 0, T: fly ? 0.42 : 0.22, z: 0, vz: fly ? 120 : 0, down: fly ? 0.9 : 0, busy: n.busy, landed: false };
  ST.knocks.push(k); n.busy = true; n.goal = null; n.path = null; n.moving = false;
  if (fly && n.hasAct && n.hasAct('knockfly')) n.act('knockfly', k.T); else if (n.hasAct && n.hasAct('stagger')) n.act('stagger', 0.3);
  k.st = wrapNpc(n);
  ST.stats.npcKnock = (ST.stats.npcKnock || 0) + 1;
}
function updKnocks(dt) {
  for (const k of ST.knocks) {
    const n = k.n; k.t += dt;
    if (k.t < k.T) { const ox = n.x, oy = n.y; const nx = n.x + k.vx * dt, ny = n.y + k.vy * dt; if (walkable(nx, n.y)) n.x = nx; if (walkable(n.x, ny)) n.y = ny; if (n.x === ox && n.y === oy) k.t = k.T;
      if (k.vz) { k.vz -= 560 * dt; k.z = Math.max(0, k.z + k.vz * dt); } if (k.st) k.st.z = k.z; }
    else if (!k.landed) { k.landed = true; k.z = 0; if (k.st) k.st.z = 0; if (k.down > 0) { if (n.hasAct && n.hasAct('knockdown')) n.act('knockdown', k.down); vfx('dust', n.x, n.y, { ground: true }); }   /* bụi nhỏ dưới chân (không dùng knock_land to) */ }
    else if ((k.down -= dt) <= 0) k.done = true;
  }
  for (const k of ST.knocks) if (k.done) { k.n.busy = k.busy; if (k.n.action && /knock|stagger/.test(k.n.action.name)) k.n.action = null; }
  ST.knocks = ST.knocks.filter(k => !k.done);
}
function aoe(f, x, y, r, pw, o = {}) {   /* chiêu trúng mọi thứ quanh (x, y) bán kính r — pw: 0,4 nhẹ … 1,5 tuyệt chiêu */
  const ctx = ST.ctx; if (!ctx || !ctx.S.map) return; if (ctx.envfx) { try { ctx.envfx.hitF(f, x, y, r, pw, o); } catch (e) { } }   /* p105: hoa cỏ / cây phản ứng theo hệ chiêu */
  const hit = o.seen || new Set(), dir = (ex, ey) => { const dx = ex - x, dy = ey - y, d = Math.hypot(dx, dy) || 1; return [dx / d, dy / d]; };
  for (const n of ctx.allNpcs().concat(ctx.S.staff || [])) {   /* dân / NPC (không tính 2 huấn luyện viên) */
    if (n === ST.foe || n === ST.villager || hit.has(n) || Math.hypot(n.x - x, n.y - y) > r + 6) continue; hit.add(n); const [dx, dy] = dir(n.x, n.y); knockNpc(n, dx, dy, pw);
  }
  const p = ctx.S.player;
  if (!hit.has(p) && !o.noPlayer && !ST.inField && Math.hypot(p.x - x, p.y - y) <= r + 4) {   /* người chơi: bị hất + mất ít máu (không ngất) */
    hit.add(p); const [dx, dy] = dir(p.x, p.y);
    if (ctx.knockPlayer && !(ctx.knocked && ctx.knocked())) ctx.knockPlayer({ type: pw >= 1 ? 'fly' : 'stagger', power: Math.min(1.4, 0.6 + pw * 0.5), dir: { x: dx, y: dy }, lite: true, src: 'linhduel' });
    const h = ctx.hero; if (h && h.hp > 1 && pw >= 0.6) { const dmg = Math.min(Math.max(1, Math.round(h.max * (pw >= 1.2 ? 0.08 : 0.04))), Math.ceil(h.hp) - 1); if (dmg > 0) h.hit(dmg); }
    ST.stats.player = (ST.stats.player || 0) + 1;
  }
  if (!ST.inField && ctx.rocky && ctx.rocky.pos && !hit.has('rocky')) { const rp = ctx.rocky.pos(); if (rp && Math.hypot(rp.x - x, rp.y - y) <= r + 4) { hit.add('rocky'); const [dx, dy] = dir(rp.x, rp.y); try { ctx.rocky.hitBy(1, null, dx, dy, 40, null);   /* Rocky chỉ bị đẩy lùi (không bay) — tránh sao nổ / bụi vòng to giữa cảnh đông */ ST.stats.rocky = (ST.stats.rocky || 0) + 1; } catch (e) { } } }
  if (ctx.monsters && !o.noMon) for (const mo of ctx.monsters.list().slice()) {   /* quái thường: trúng đòn thật */
    if (hit.has(mo) || mo.c.spar || mo.c.boss || (ST.wild && ST.wild.key === 'fct:' + ctx.S.zone.id + ':' + mo.id) || Math.hypot(mo.x - x, mo.y - y) > r + 8) continue; hit.add(mo);
    try { ctx.monsters.damage(mo, Math.max(1, Math.round((mo.max || 10) * 0.22 * pw)), { x, y }, 0.3, 40 + 50 * pw); ST.stats.mon = (ST.stats.mon || 0) + 1; } catch (e) { }
  }
  if (!o.noObj) { let n = 0;   /* cây rung / đổ, vật phá được hư → đổ nát (ảnh PixelLab của chính vật, blast.js) */
    for (const ob of ctx.S.map.objects.slice()) {
      if (n >= (pw >= 1.2 ? 6 : 3) || ob.ruined || hit.has(ob)) continue; const d = ctx.O[ob.type]; if (!d) continue;
      const cx = (ob.x + d.fw / 2) * 16, cy = (ob.y + d.fh) * 16 - 4; if (Math.hypot(cx - x, cy - y) > r + 6) continue;
      const kd = kindOf(ctx, ob); if (!kd) continue; hit.add(ob); n++;
      if (kd === 'tree' && pw < 1.2) { if (ctx.treeShake) ctx.treeShake(ob); if (o.fire) vfx('firepuff', cx, cy - 4, { ky: cy + 0.5 }); ST.stats.shake = (ST.stats.shake || 0) + 1; continue; }   /* luồng lửa: cây bén lửa ngắn rồi tắt */
      try { const r2 = smashObj(ctx, ob, pw >= 1.2 ? 9 : pw >= 0.9 ? 2 : 1, cx < x ? -1 : 1); ST.stats.smash = (ST.stats.smash || 0) + 1; if (r2 && r2.gone) ST.stats.broke = (ST.stats.broke || 0) + 1; } catch (e) { }
    }
  }
  return hit;
}
function decal(src, x, y, rot = 0, a = 0.92, cv = null) { ST.decals.push({ src, x, y, rot, a, t: 0, cv }); if (ST.decals.length > 18) ST.decals.shift(); }   /* plan-49a: trần 18 (cũ hơn 10 cái mới nhất thì mờ 55 %, xem drawGround) */

/* ---------- trúng đòn ---------- */
function applyStatus(def, id) {
  if (def.status || def.dead) return false;
  if (id === 'bong' && def.types.includes('nham')) return false;
  if (id === 'te' && def.types.includes('loi')) return false;
  if (id === 'dong' && def.types.includes('suong')) return false;
  def.status = { id, t: { bong: 10, roi: 4, te: 6, ngu: 2.6, dong: 2.2 }[id] || 4, tick: id === 'bong' ? 3 : 0 };
  const lt = L(ST.ctx), s = { bong: lt.burn, roi: lt.conf, te: lt.te, ngu: lt.ngu, dong: lt.dong }[id] || id, col = { bong: '#ff9a4a', roi: '#d8a0ff', te: '#ffe066', ngu: '#a8b4ff', dong: '#bfefff' }[id] || '#fff';
  text(def.x, def.y - 26, s, col, 1.05); if (id === 'ngu') { def.act = null; def.dodge = null; def.clip = 'idle'; def.ct = 0; }
  if (id === 'dong') { def.act = null; def.dodge = null; vfx('hit_suong', def.x, def.y - 6, { ky: def.y + 0.5 }); ST.stats.freeze = (ST.stats.freeze || 0) + 1; }   /* đóng băng: đứng im giữ nguyên dáng (phủ màu băng lúc vẽ) */
  return true;
}
function applyTT(att, def, mv) {   /* chiêu trạng thái (không sát thương): giảm tốc / ngủ / tự tăng tốc */
  if (def.dead || ST.ph !== 'fight') return false; const e = mv.eff || {}, lt = L(ST.ctx);
  if (ST.F[att.side] !== att || att.absent) return false; if ((def.absent || def.inv > 0 || ST.F[def.side] !== def) && !(e.who === 'minh' || e.heal || e.shield || e.reflect)) return false;   /* plan-58 */
  if (rnd() * 100 > mv.acc) { text(def.x, def.y - 22, lt.miss, '#d8d8e8', 0.95); ST.log.push({ t: +ST.t.toFixed(1), side: att.side, mv: mv.id, miss: true }); return false; }
  if (e.st) applyStatus(def, e.st);
  if (e.heal) { const hv = Math.round(att.max * e.heal); att.hp = Math.min(att.max, att.hp + hv); text(att.x, att.y - 26, lt.heal(hv), '#7ee08a', 1); vfx('hit_quang', att.x, att.y - 8, { ky: att.y + 0.5 }); ST.stats.heal = (ST.stats.heal || 0) + 1; }   /* p49c */
  if (e.shield) { att.shield = Math.round(att.max * e.shield); text(att.x, att.y - 26, lt.shield, '#ffe9a3', 0.9); ST.stats.shield = (ST.stats.shield || 0) + 1; }
  if (e.weather) wxSet(att, e.weather);   /* p72 */
  if (e.reflect) { att.reflect = { k: e.reflect, t: e.dur || 3 }; text(att.x, att.y - 26, lt.refl, '#bfefff', 0.9); }
  if (e.stat) { const who = e.who === 'minh' ? att : def; for (const [k, v] of Object.entries(e.stat)) { who.stage[k] = Math.max(-6, Math.min(6, (who.stage[k] || 0) + v)); text(who.x, who.y - 26, k === 'spe' ? (v > 0 ? lt.speUp : lt.speDown) : k.toUpperCase() + (v > 0 ? ' ↑' : ' ↓'), v > 0 ? '#9fe8ff' : '#ff8a6a', 0.9); } }
  ST.log.push({ t: +ST.t.toFixed(1), side: att.side, mv: mv.id, tt: true }); return true;
}
function hit(att, def, mv, o = {}) {
  if (DFX.CODE && !o._now) { const sc = DFX.pending(att, mv.id); if (sc) { const qx = def.x, qy = def.y; DFX.defer(sc, () => { if (!o.noMiss && Math.hypot(def.x - qx, def.y - qy) > 16 && !def.dead) { text(def.x, def.y - 22, L(ST.ctx).miss, '#d8d8e8', 0.85); ST.hitTry = (ST.hitTry || 0) + 1; ST.stats.dodgeLate = (ST.stats.dodgeLate || 0) + 1; return false; } return hit(att, def, mv, { ...o, _now: 1 }); }); return true; } }   /* p52e: hoãn tới khung trúng của cảnh code · p52f: phép thử lại ở khung trúng — đã chạy khỏi chỗ (> 16 px) thì trượt */
  ST.hitTry = (ST.hitTry || 0) + 1;
  if (def && def.p73decoy) return P73.decoyHit(att, def, mv, o);   /* p73 Hình Nhân Lá */
  if (def.dead || ST.ph !== 'fight') return false;
  if (def.absent || def.inv > 0 || ST.F[def.side] !== def || ST.F[att.side] !== att || att.absent) return false;   /* plan-58: con đang gọi ra / thu về / ngồi ghế không trúng đòn; con mới miễn đòn 0,5 s */
  if (def.hide) { text(def.x, def.y - 12, L(ST.ctx).miss, '#d8d8e8', 0.85); return false; }
  if (def.decoy && att !== def && decoyHit(def)) return false;   /* p72 Phân Thân */   /* p57: Lẩn Bóng — đang chìm trong bóng */
  if (def.dig && def.dig.ph === 'under') { text(def.x, def.y - 12, L(ST.ctx).miss, '#d8d8e8', 0.85); return false; }   /* đang đi ngầm: né mọi đòn */
  if ((def.chgDodge > ST.t || att.chgJam > ST.t) && chgGuard(att, def, mv) === false) return false;   /* p100: Lách Mã / Nhiễu Sóng */
  if (!P78.preHit(att, def, mv)) return false;
  { const g96 = def.mdkG ? mdkGuard(att, def, mv, o) : null; if (g96 === false) return false; if (g96) o = g96; }   /* p96: Cuộn Gai Thủ */   /* p78: Thủ Thế chặn · Đào Hầm Vồ dưới đất */
  const acc = mv.acc * ACC_STAGE(att.stage.acc || 0);   /* p49c: bậc chính xác theo công thức chính xác của thể loại (3/(3−s)): −1 → 75 %, −2 → 60 % (trước dùng STAGE: −1 → 67 %, Chớp Loá của Bánh Bao áp đảo) */
  if (!o.noMiss && rnd() * 100 > acc) { text(def.x, def.y - 22, L(ST.ctx).miss, '#d8d8e8', 0.95); ST.log.push({ t: +ST.t.toFixed(1), side: att.side, mv: mv.id, miss: true }); return false; }
  const r = calcDamage(att.lv, mv, statsFor(att), statsFor(def), { weather: ST.weather });
  const big = mv.ult || r.crit || mv.pow >= 75 || ((o.mul || 1) > 0.9 && mv.pow >= 60);   /* đòn mạnh: khựng dài + rung + hất văng (khai TRƯỚC chỗ dùng — tránh lỗi TDZ) */
  const air = GROUND_MV[mv.id] && (def.alt || 0) > 6, tm = ((ST.terr && ST.terr.mul[mv.type]) || 1) * (air ? 0.5 : 1), dmg = Math.max(1, Math.round(r.dmg * (o.mul || 1) * tm * P73.dmgMul(att, def, mv) * P78.dmgMul(att, def, mv) * (ST.ctx && ST.ctx.envfx && ST.ctx.envfx.flMul ? ST.ctx.envfx.flMul(mv.type, att.x, att.y) : 1)));   /* p105w-dmg: trong vùng ngập Triều ×1,25, Hoả ×0,75 */   /* p73 Gương Hồi Quang */
  if (air) { text(def.x, def.y - 30, ST.ctx.lang() === 'en' ? 'FLYING: HALF' : 'BAY NÉ ĐẤT', '#bfe6ff', 0.8); ST.stats.airHalf = (ST.stats.airHalf || 0) + 1; }
  let dmg2 = dmg; if (def.shield > 0) { const ab = Math.min(def.shield, dmg2); def.shield -= ab; dmg2 -= ab; if (ab > 0) { if (DFX.CODE) DFX.burst(def.x, def.y - 8, 'quang', 0.55, def.y + 0.5, 'shield'); else vfx('hit_quang', def.x, def.y - 8, { ky: def.y + 0.5 }); } }   /* p49c Lá Chắn Quang */
  def.hp = Math.max(0, def.hp - dmg2);
  if (ST.wild && def.side === 1 && !def.dead) { if (!ST.wildDazed && def.hp <= def.max * CATCH.AT) { ST.wildDazed = true; def.hp = Math.max(def.hp, Math.ceil(def.max * 0.12)); def.daze = CATCH.DAZE; text(def.x, def.y - 50, L(ST.ctx).dazed, '#ffe680', 1.1, 1.8); ST.stats.daze = (ST.stats.daze || 0) + 1; }   /* plan-58 C.2: lần đầu xuống ≤ 30 % — choáng 2,4 s, không gục ngay (kịp ném Ấn Thu) */
    if (def.daze > 0) def.hp = Math.max(def.hp, Math.ceil(def.max * 0.05)); }
  if (def.reflect && def.reflect.t > 0 && att !== def && !att.dead && mv.cat !== 'tt') { const rd = Math.max(1, Math.round(dmg2 * def.reflect.k)); att.hp = Math.max(0, att.hp - rd); text(att.x, att.y - 26, String(rd), '#bfefff', 1); if (DFX.CODE) DFX.burst(att.x, att.y - 6, 'suong', 0.55, att.y + 0.5); else vfx('hit_suong', att.x, att.y - 6, { ky: att.y + 0.5 }); ST.stats.refl = (ST.stats.refl || 0) + 1; if (att.hp <= 0) faint(att); }   /* p49c Gương Băng: phản 50 % */
  if (!o.noFlash) def.flash = DFX.CODE ? 0.034 : 0.14; else def.tint = 0.16; ST.stats.hits++;   /* p52e: chớp trắng ngắn (khựng giữ khung trắng) */
  if (def.status && def.status.id === 'ngu') { def.status = null; text(def.x, def.y - 34, L(ST.ctx).wake, '#a8b4ff', 0.8); }
  if (def.status && def.status.id === 'dong' && mv.type === 'nham') { def.status = null; text(def.x, def.y - 34, L(ST.ctx).thaw, '#bfefff', 0.8); if (DFX.CODE) DFX.steam(def.x, def.y); else vfx('steam', def.x, def.y, { ky: def.y + 0.5 }); }   /* p49c: trúng đòn Nham thì tan băng */   /* trúng đòn thì tỉnh */
  if (mv.eff && mv.eff.drain && !att.dead) { const hv = Math.max(1, Math.round(dmg * mv.eff.drain)); att.hp = Math.min(att.max, att.hp + hv); text(att.x, att.y - 26, L(ST.ctx).heal(hv), '#7ee08a', 0.95); }
  text(def.x, def.y - 26, String(dmg), r.crit ? '#ffd45e' : '#ffffff', r.crit ? 1.35 : (mv.ult ? 1.3 : 1.05)); combo85(att, def, o);   /* p85: chữ combo */
  { const sk = att.side + ':' + mv.id, k0 = (ST.supT || (ST.supT = {}))[sk]; if (Math.abs(r.mul - 1) > 0.01 && !(k0 != null && ST.t - k0 < 1.6)) { ST.supT[sk] = ST.t; if (r.mul > 1.01) text(def.x, def.y - 38, L(ST.ctx).sup, '#ffb347', 0.95, 1.3); else text(def.x, def.y - 38, L(ST.ctx).weak, '#9fb4c8', 0.85, 1.3); } }   /* p67b: KHẮC HỆ / KHÔNG HIỆU QUẢ chỉ hiện 1 lần mỗi chiêu (các nhịp trúng liền trong 1,6 s không lặp chữ) */
  if (r.crit) text(def.x, def.y - 48, L(ST.ctx).crit, '#ffd45e', 0.95, 1.3);
  ST.log.push({ t: +ST.t.toFixed(1), side: att.side, mv: mv.id, dmg, mul: +r.mul.toFixed(2), crit: r.crit });
  if (mv.eff && mv.eff.st && rnd() < mv.eff.p) applyStatus(def, mv.eff.st);
  const kd = Math.hypot(def.x - att.x, def.y - att.y) || 1, kp = o.kb ?? (mv.ult ? 150 : mv.pow >= 75 ? 95 : 60);
  def.kb = { vx: (def.x - att.x) / kd * kp, vy: (def.y - att.y) / kd * kp, t: mv.ult ? 0.3 : 0.16 };
  if (big && !def.dead) { const sp = mv.ult ? 330 : 250; def.kb = { vx: (def.x - att.x) / kd * sp, vy: (def.y - att.y) / kd * sp, t: mv.ult ? 0.32 : 0.24, fly: true, rut: 0, bounced: false }; ST.stats.kbFly = (ST.stats.kbFly || 0) + 1; }   /* 3–6 ô */
  if (def.pin > 0) def.kb = null;
  if (def.mykSteady > ST.t && att !== def && def.kb) { def.kb = null; ST.stats.mykSteadyKb = (ST.stats.mykSteadyKb | 0) + 1; }   /* p99: Bơi Ngược Dòng — VỨNG, không bị hất */   /* p57: đang bị ghim giữa tuyệt chiêu / bong bóng — không bị hất ra khỏi hiệu ứng */
  if (!def.act || !def.act.ult) { def.act = null; def.clip = 'hurt'; def.ct = 0; def.hurtT = 0.32; }
  if (!o.noFlash) { ST.hitstop = Math.max(ST.hitstop, big ? HS.big : HS.hit); def.flash = DFX.CODE ? 0.034 : big ? 0.18 : 0.12; }   /* plan-52: khựng như video — thường 40 ms, mạnh 67 ms (trước 100–120 ms) */   /* luồng phun nhịp giữa: không chớp trắng / không khựng (anh: chớp 6 lần nhức mắt) */   /* khựng cả cảnh: đòn mạnh 100–120 ms, đòn thường 40 ms */
  if (big && ST.ctx.quake) ST.ctx.quake(Math.min(0.35, 0.08 + mv.pow / 600));   /* rung ngắn tỉ lệ sức đòn — chỉ lúc trúng */
  sfx(mv.ult ? 'smash' : 'hit');
  duelSfx(big ? 'hit_big' : 'hit', { mv: mv.id, dmg, crit: !!r.crit, side: def.side });
  if (ST.warn && ST.warn.f === att) warnOff('hit');   /* plan-52 #2: viền đỏ tắt ĐÚNG lúc trúng */
  { const why = IMP85() ? (o.imp ? 'clash' : r.crit ? 'crit' : mv.ult ? 'ult' : null) : o.imp ? 'clash' : r.crit ? 'crit' : r.mul > 1.01 ? 'sup' : mv.ult && att.ultFirst ? 'ult' : null;   /* p85: chỉ đòn MẠNH (tuyệt chiêu / chí mạng / hất bay) */ if (mv.ult) att.ultFirst = false;   /* plan-52 #1: khung impact 2 khung cho đòn LỚN không-KO */
    if (why && def.hp > 0 && !o.noFlash) impact(att, def, mv, DASH_MV[mv.id] || mv.id === 'phan_quyet' ? 'B' : 'A', why); }
  P78.afterHit(att, def, mv);   /* p78: Gồng Chịu · Địa Từ giảm bay văng */
  P73.afterHit(att, def, mv);   /* p73 */
  if (def.hp <= 0) faint(def);
  return true;
}
function faint(f) {
  if (ST.wild && f.side === 1 && !f.dead && (!ST.wildDazed || f.daze > 0) && ST.ph === 'fight') { if (!ST.wildDazed) { ST.wildDazed = true; f.daze = CATCH.DAZE; text(f.x, f.y - 50, L(ST.ctx).dazed, '#ffe680', 1.1, 1.8); ST.stats.daze = (ST.stats.daze || 0) + 1; f.hp = Math.ceil(f.max * 0.12); } else f.hp = Math.ceil(f.max * 0.05); return; }   /* plan-58 C.2: thú hoang không gục ngay ở lần đầu (mọi đường mất máu: bỏng, rối…) — kịp ném Ấn Thu */
  if (ST.ph === 'ko' || ST.ph === 'done') { f.hp = Math.max(1, f.hp); return; }   /* đã có người ngã: không hoà 2 bên cùng ngất */
  f.dead = true; f.act = null; f.clip = 'hurt'; f.ct = 0; f.kb = null; f.status = null; f.dig = null;
  const nx = ST.multi ? ST.team[f.side].findIndex(q => q !== f && !q.dead) : -1; ST.ph = 'ko'; ST.end = { t: 0, win: 1 - f.side, mid: nx >= 0, next: nx, side: f.side };   /* plan-58: còn con trong ghế → không hết trận (mid) */ ST.zoomOn = f; ST.camZoomT = 2.2; ST.hitstop = 0;
  const at = foeReal(f), dx = f.x - at.x, dy = f.y - at.y, dd = Math.hypot(dx, dy) || 1; ST.ko = { t: 0, f, at, go: false, ux: dx / dd, uy: dy / dd, snap: ST.F.map(q => ({ q, clip: q.clip, ct: q.ct, x: q.x, y: q.y - (q.alt || 0) })) };   /* plan-49a M1: khung kết liễu (đóng băng ~0,2 s) */
  ST.stats.ko = (ST.stats.ko || 0) + 1; sfx('smash'); duelSfx('ko_freeze', { side: f.side });   /* kết liễu: khựng + zoom */ ST.log.push({ t: +ST.t.toFixed(1), ko: f.side });
}

/* ---------- chiêu ---------- */
function canUse(f, id) { return !f.dead && !f.act && f.hurtT <= 0 && (f.cds[id] || 0) <= 0; }
function startAct(f, id) {
  if (f.p73decoy) return;   /* p73 */
  const mv = MOVES[id], foe = foeOf(f);
  if (f.status && f.status.id === 'roi' && rnd() < 0.3) {   /* rối: 30 % tự đánh mình */
    text(f.x, f.y - 30, L(ST.ctx).selfhit, '#d8a0ff', 0.75, 1.4); const r = calcDamage(f.lv, { pow: 40, cat: 'vat', type: f.types[0] }, { ...statsFor(f), types: [] }, { ...statsFor(f), types: [] });   /* tự đánh mình: không hệ (typeMul cần hệ thật — bản trước truyền 'none' gây lỗi) */
    f.hp = Math.max(0, f.hp - r.dmg); text(f.x, f.y - 20, String(r.dmg), '#e0c0ff', 1); f.flash = 0.14; f.clip = 'hurt'; f.ct = 0; f.hurtT = 0.4; f.cds[id] = Math.max(f.cds[id] || 0, 1.2);
    ST.log.push({ t: +ST.t.toFixed(1), side: f.side, mv: id, self: r.dmg }); if (f.hp <= 0) faint(f); return;
  }
  if (f.status && f.status.id === 'te' && rnd() < 0.22) { text(f.x, f.y - 30, L(ST.ctx).te, '#ffe066', 0.8); vfx('hit_loi', f.x, f.y - 10, { ky: f.y + 0.5 }); f.hurtT = 0.45; f.clip = 'hurt'; f.ct = 0; f.cds[id] = Math.max(f.cds[id] || 0, 0.8); return; }   /* tê: 22 % khựng không ra đòn */
  if (id !== 'huc' && P73.onCast(f, id)) return;   /* p73: Bẫy Lò Than nổ / Rình Sơ Hở bật — chiêu bị huỷ (vẫn tính hồi) */
  face(f, foe.x, foe.y);
  let clip = id === 'huc' ? 'atk' : (CLIP_SP[f.sp] && CLIP_SP[f.sp][id]) || CLIP_OF[id]; if (!SPR || !SPR[f.sp] || !SPR[f.sp][clip]) clip = 'atk'; if (id === 'lao_lua' && FLY[f.sp] && SPR && SPR[f.sp] && SPR[f.sp].flydash) clip = 'flydash';
  f.act = { id, mv, clip, t: 0, fired: false, ult: !!mv.ult, mark: null, dash: null }; f._mvT105 = mv.common ? null : mv.type;   /* p105: hệ chiêu cho đạn / tia bay sau khi hết động tác */
  f.clip = clip; f.ct = 0; f.moving = false;
  if (id === 'huc') { f.combo = (f.combo || 0) + 1; f.basicT = f.combo % 3 ? 0.32 : 0.75 + rnd() * 0.3; }   /* chuỗi 2–3 nhát rồi mới nghỉ ngắn */ else { f.cds[id] = mv.cd; callout(f, id); }
  ST.stats.acts[f.side + ':' + id] = (ST.stats.acts[f.side + ':' + id] || 0) + 1; { const S0 = ST.stats.p84sh = ST.stats.p84sh || {}, k0 = f.side + ':' + (mv.shape === 'can' ? 'can' : 'xa'); S0[k0] = (S0[k0] | 0) + 1; }   /* p84: đếm cận chiến / xa */
  if (id === 'bao_tu' || id === 'bao_loc') { f.act.mark = { x: foe.x + (foe.vx || 0) * 0.2, y: foe.y + (foe.vy || 0) * 0.2 }; clampField(f.act.mark); }
  if (id === 'cot_da') { const lead = 0.25; f.act.mark = { x: foe.x + (foe.vx || 0) * lead, y: foe.y + (foe.vy || 0) * lead }; clampField(f.act.mark); }
  if (mv.ult) { f.ultFirst = true; f.ultWarned = false; }   /* plan-52: đòn đầu tuyệt chiêu → impact; viền đỏ 1 lần / tuyệt chiêu */
  if (DFX.sceneOf(id)) { f.act.nv = true; if (id !== 'don_tho' && id !== 'phan_quyet' && !(id === 'phun_than' && BREATH[f.sp])) DFX.spawn(id, f, foe, (mv.ult ? 0.4 : 0.3) - impactT(clip), { act: f.act, fixC: (SK[id] && SK[id].m === 'dash') || id === 'lao_lua' || !!(SK[id] && SK[id].fixC) }); }   /* p52e: cảnh code tạo lúc gồng — tung chiêu (khung chạm) = 0,3 s của cảnh (tuyệt chiêu 0,4 s) */
  duelSfx('move_start', { id, side: f.side, ult: !!mv.ult });
  if (mv.ult && ST.ph === 'fight') { const pw = fxPower(fxPowerOf(SPECIES[f.sp], f.lv)); ST.hitstop = Math.max(ST.hitstop, pw.hitstop * 0.6); if (ST.ctx && ST.ctx.quake) ST.ctx.quake(pw.shake * 0.45); if (!P78.ownTag(id) && !BUB85()) text(f.x, headY(f) - 8, mvName(ST.ctx, id) + '!', '#ffd45e', 0.85, 1.0);   /* p85: tên tuyệt chiêu lên bong bóng góc trên, bỏ chữ trên đầu */ ST.stats.ultTag = (ST.stats.ultTag || 0) + 1; sfx('roar'); duelSfx('ult_cast', { id, side: f.side }); }   /* p74 (anh Hùng): BỎ dải cắt cảnh tuyệt chiêu — không dừng trận / che màn; tên chiêu nhỏ trên đầu + khựng + rung theo độ lực */   /* chỉ cắt cảnh khi trận đang đánh (trước đây: tuyệt chiêu ra đúng lúc đối thủ vừa ngất → trận kẹt 'fight') */
  telegraph(f, id); P73.onStart(f, id); P78.onStart(f, id);   /* p73 · p78 */
}
function telegraph(f, id) {   /* đối thủ (AI) có thể né khi thấy chiêu báo trước */
  const o = foeOf(f); if (o.dead || o.absent || o.act || o.dodge) return;
  const p = { dam_chan: 0.3, nut_dat: 0.35, cot_da: 0.5, dai_dia_chan: 0.25, gam: 0.1, phun_than: 0.0, lao_lua: 0.25, nui_lua: 0.25, huc: 0.12,
    thuy_cham: 0.25, loi_cau: 0.25, luoi_gio: 0.2, hut_nhua: 0.2, song_cuon: 0.3, phong_tia: 0.15, roi_re: 0.3, lao: 0.25, bao_tu: 0.4, set_troi: 0.3, bao_loc: 0.3,
    gai_bang: 0.2, manh_pha_le: 0.2, hoi_lanh: 0.25, khuc_xa: 0.25, song_am: 0.2, tia_sang: 0.2, dap_am: 0.15, mua_kim_cuong: 0.3, phan_quyet: 0.3, bao_tuyet: 0.25, cong_huong: 0.25 }[id] || 0;
  if (rnd() < p + dodgeB(o) + tel84(id)) { const dx = o.x - f.x, dy = o.y - f.y, d = Math.hypot(dx, dy) || 1, s = rnd() < 0.5 ? 1 : -1; o.dodge = { vx: (-dy / d * s * 0.8 + dx / d * 0.6), vy: (dx / d * s * 0.8 + dy / d * 0.6), t: id === 'cot_da' ? 0.45 : 0.36, delay: 0.12 + rnd() * 0.12, p84c: 1 }; ST.stats.p84dodgeTel = (ST.stats.p84dodgeTel | 0) + 1; if (MOVES[id] && MOVES[id].shape === 'tia') ST.stats.p84dodgeTia = (ST.stats.p84dodgeTia | 0) + 1; }
}
function face(f, x, y) { const dx = x - f.x, dy = y - f.y, d = Math.hypot(dx, dy); if (d > 0.5) { f.fx = dx / d; f.fy = dy / d; } }
function clipLen(f, clip) { const c = SPR && SPR[f.sp] && SPR[f.sp][clip]; return (c ? c.n : 8) / (c && c.fps || FPS[clip]); }   /* p64 */
function impactT(clip) { return (IMPACT[clip] + 0.5) / FPS[clip]; }

function breathEnd(f, b) {   /* dò luồng trên mặt đất: dừng ở vật cứng / mép; gặp nước thì dừng + xì hơi */
  const ux = Math.cos(b.ang), uy = Math.sin(b.ang); let x = f.x + ux * 6, y = f.y + uy * 6, water = false, blocked = false, L = 6;
  for (; L < b.len; L += 4) { const nx = f.x + ux * L, ny = f.y + uy * L; if (isWater(nx, ny)) { water = true; x = nx; y = ny; break; } if (!walkable(nx, ny)) { blocked = true; break; } x = nx; y = ny; }
  return { x, y, water, blocked, L };
}
function segDist(px, py, ax, ay, bx, by) { const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l2)); return Math.hypot(px - ax - dx * t, py - ay - dy * t); }
/* p84 (anh 02/11): ĐỐI CHƯỞNG HIẾM, CÓ LÝ DO — 2 tia cùng lúc → giằng co; tối đa 1 lần / trận, chỉ pha cuối (cả hai < 40 % máu) hoặc tuyệt chiêu đấu tuyệt chiêu */
const isTia84 = a => !!(a && a.mv && a.mv.shape === 'tia' && !a.fired);
const fin84 = (A, B) => A.hp / A.max < 0.4 && B.hp / B.max < 0.4;
function clash84(dt) {
  const [A, B] = ST.F; if (!A || !B || A.dead || B.dead || ST.t < Math.max(6, ST.clashNext || 0) || (ST.beamN84 | 0) >= 1) return; const d = dist(A, B), fin = fin84(A, B);
  const ultBoth = !!(A.act && B.act && A.act.ult && B.act.ult && !A.act.fired && !B.act.fired);
  if (((isTia84(A.act) && isTia84(B.act) && fin) || ultBoth) && Math.abs(A.act.t - B.act.t) <= 0.35 && d > 50 && d < 220) { ST.clash84 = (ST.clash84 || 0) + 1; startClash(A, B); ST.clashNext = Math.max(ST.clashNext || 0, ST.t + 12 + BEAM_T.align + 4.5 + BEAM_T.push); return; }
  if (!fin) return;   /* đáp chưởng chỉ ở pha cuối */
  for (const [f, o] of [[A, B], [B, A]]) {   /* đáp chưởng: đối thủ vừa bắt đầu gồng tia (≤ 0,2 s), mình rảnh + có tia đã hồi */
    if (!isTia84(o.act) || o.act.t > 0.2 || o.act.p84seen || !ST.auto[f.side] || !freeFor(f) || d < 50 || d > 220) continue; o.act.p84seen = true;
    const tia = (MV78(f) || []).filter(id => MOVES[id] && MOVES[id].shape === 'tia' && !MOVES[id].ult && (f.cds[id] || 0) <= 0); if (!tia.length || rnd() >= 0.6) continue;
    face(f, o.x, o.y); startAct(f, tia[0]); ST.answer84 = (ST.answer84 || 0) + 1; }
}
function clashCheck(f, b) {   /* luồng lửa gặp đường nứt / cột đá của đối thủ → giằng co */
  if (ST.clash || ST.t < (ST.clashNext || 0)) return; const e = b.end; if (!e) return; const foe = foeOf(f);   /* đối chưởng cách nhau ≥ 8 s (bản trước 11 lần / trận) */
  for (const r of ST.runners) if (r.f === foe && r.mv.id === 'nut_dat' && segDist(r.x, r.y, f.x, f.y, e.x, e.y) < 10) { startClash(f, foe, r.x, r.y, 'nut_dat'); r.done = true; return; }
  if (foe.act && foe.act.id === 'cot_da' && foe.act.mark && !foe.act.clashed && segDist(foe.act.mark.x, foe.act.mark.y, f.x, f.y, e.x, e.y) < 12) { foe.act.clashed = true; startClash(f, foe, foe.act.mark.x, foe.act.mark.y, 'cot_da'); }
}
/* ===== p84 đợt 2 (anh 02/11, theo video pokemonbattlegrounds) =====
   CLASH cận chiến: 2 đòn 'can' cùng ở pha vung / lao → ghìm 0,24 s + tia lửa 2 màu hệ → bật lùi 18–24 px, không mất máu, hồi 7–10 s (video: ~5 lần / 5 phút).
   Nhịp AI: cận chiến khi gần → lướt lùi → bắn xa; né tia / đạn → phản đòn ≤ 0,6 s. */
function reset84() { ST.clash84 = 0; ST.answer84 = 0; ST.beamN84 = 0; ST.mclash84 = 0; ST.mclashNext = 0; ST.mclashLog = []; ST.p84fx = []; ST.p84mforce = 0; }
const tel84 = id => { const s = MOVES[id] && MOVES[id].shape; return s === 'tia' ? 0.3 : s === 'dan' ? 0.08 : 0; };   /* thấy gồng TIA → dễ lướt ngang né hơn */
function w84(f, id, k, d) { if (!(k > 0)) return k; const sh = MOVES[id] && MOVES[id].shape;
  if (sh === 'can') k *= d <= 60 ? 2.4 : 1.25;
  { const D = MOVES[id] && MOVES[id].p84d; if (D) k *= d <= 70 ? (D.kd ? 2 : 1.5) : d > 130 ? 0.4 : 1; }   /* p84 đợt 3: chiêu lao / Lao Thân — dùng khi đã gần */
  if ((f.p84after || 0) > 0) { if (sh === 'can') k *= 0.35; else if (sh === 'dan' || sh === 'tia' || sh === 'vung' || sh === 'lob') k *= 1.8; }
  return k; }
function huc84(f, d) { return !((f.p84after || 0) > 0) && f.basicT <= 0.25 && d <= 90 && (!ST.inField || f.melee) && rnd() < 0.75; }
function mWin84(f) {   /* đòn cận chiến đang ở pha vung (≤ 0,15 s trước khung chạm) hoặc đang lao tới, chưa trúng */
  const a = f.act; if (!a || !a.mv || a.mv.shape !== 'can' || a.ult || f.dead || f.absent || f.dig || f.hide) return false; const K = SK[a.id], T0 = impactT(a.clip);
  if (K && K.m === 'dash') return a.dash2 ? (a.dash2.ph === 'go' && !a.dash2.hit) : (!a.fired && a.t >= T0 - 0.15);
  if (K) return false;   /* đào / vùng / chiêu riêng: không tính */
  return !a.fired && a.t >= T0 - 0.15;
}
function melee84() {
  const [A, B] = ST.F; if (!A || !B || ST.ph !== 'fight' || ST.clash || ST.t < (ST.mclashNext || 0) || A.p84lk > 0 || B.p84lk > 0 || A.p84bo || B.p84bo) return;
  if (!mWin84(A) || !mWin84(B)) return; const d = dist(A, B), dsh = q => !!(q.act.dash || q.act.dash2 || q.act.id === 'lao' || q.act.id === 'lao_lua' || q.act.mv.p84d); if (d > Math.max(30, sepNeed(A, B) + 8) + (dsh(A) || dsh(B) ? 10 : 0)) return;   /* đang lao: cộng quãng đi 1 khung để không lọt qua ngưỡng chạm */
  if (!ST.p84mforce) { if (A.act.p84r === B.act) return; A.act.p84r = B.act; B.act.p84r = A.act; if (rnd() >= (A.act.id === 'huc' && B.act.id === 'huc' ? 0.25 : 0.7)) return; }   /* mỗi cặp đòn chỉ gieo 1 lần */
  ST.p84mforce = 0; const mx = (A.x + B.x) / 2, my = (A.y + B.y) / 2, L0 = A.x <= B.x ? A : B, R0 = L0 === A ? B : A;
  const e = { t: +ST.t.toFixed(2), a: A.act.id, b: B.act.id, d: Math.round(d), hp0: [Math.round(A.hp), Math.round(B.hp)], hp1: null, mv: [null, null] };
  for (const f of [A, B]) { const o = f === A ? B : A, clip = f.act.clip; f.act = null; f.dodge = null; f.plan = null; f.queued = null; f.kb = null; f.p84was = null; f.p84lk = 0.24; f.p84e = e; f.clip = clip; f.ct = impactT(clip); face(f, o.x, o.y); }
  ST.mclash84 = (ST.mclash84 | 0) + 1; ST.mclashNext = ST.t + 7 + rnd() * 3; (ST.mclashLog = ST.mclashLog || []).push(e); if (ST.mclashLog.length > 20) ST.mclashLog.shift();
  ST.hitstop = Math.max(ST.hitstop, 0.06); if (ST.ctx && ST.ctx.quake) ST.ctx.quake(0.07); sfx('smash');
  const ty = Math.min(headY(A), headY(B)) - 13; ST.texts.push({ x: mx, y: ty, s: 'CLASH!', col: '#ffe680', size: 1.15 * 1.15, t: 0, life: 0.9, dx: 0, who: null });   /* vi / en như nhau (như video) */
  const ky = Math.max(A.y, B.y) + 0.6, hy = my - Math.round((standH(A) + standH(B)) / 4);
  DFX.burst(mx - 2, hy, L0.types[0], 0.7, ky); DFX.burst(mx + 2, hy, R0.types[0], 0.7, ky);
  (ST.p84fx = ST.p84fx || []).push({ x: mx, y: hy, ky, t: 0, T: 0.4, hl: L0.types[0], hr: R0.types[0], seed: (ST.mclash84 * 7919 + 13) | 0, d: Math.round(d) });
}
function lock84(f, dt) {   /* ghìm nhau ở khung chạm rồi bật lùi (f.kb thường — knock / hất của hệ khác vẫn chạy như cũ) */
  f.p84lk -= dt; f.moving = false; f.ct = impactT(f.clip); if (f.p84lk > 0) return;
  f.p84lk = 0; const o = foeReal(f), dx = f.x - o.x, dy = f.y - o.y, d = Math.hypot(dx, dy) || 1, ux = d > 0.5 ? dx / d : (f.side ? 1 : -1), uy = d > 0.5 ? dy / d : 0, v = (18 + rnd() * 6) / 0.2;
  f.p84bo = { vx: ux * v, vy: uy * v, t: 0.2, gT: 0 }; f.clip = 'idle'; f.ct = 0; f.basicT = Math.max(f.basicT || 0, 0.45); f.p84after = 1.6; f.rethink = 0; f.p84kb0 = { x: f.x, y: f.y }; DFX.dust(f.x, f.y, 3, Math.sign(ux));
}
function bounce84(f, dt) {   /* bật lùi thẳng 0,2 s (không lái / không ra chiêu xen giữa) + bóng mờ */
  const B = f.p84bo; moveBy(f, B.vx * dt, B.vy * dt); clampField(f); f.moving = true; f.ct += dt; if ((B.gT -= dt) <= 0) { B.gT = 0.05; ghostPush(f); } if ((B.t -= dt) <= 0) f.p84bo = null;
}
function ctr84(f, dt) {   /* phản đòn ngay sau khi né (≤ 0,6 s): chiêu sẵn sàng trong tầm, gần thì ưu tiên cận chiến */
  f.p84ctr -= dt; const o = foeOf(f); if (!o || o.dead || o.absent || ST.ph !== 'fight' || f.act) return false; const d = dist(f, o);
  const ids = (MV78(f) || []).filter(id => MOVES[id] && !MOVES[id].ult && MOVES[id].pow > 0 && (f.cds[id] || 0) <= 0 && d <= rangeOf(f, id));
  let id = (d <= 60 && ids.find(q => MOVES[q].shape === 'can')) || (f.basicT <= 0 && d <= RANGE.huc + 6 ? 'huc' : null) || ids[0] || null;
  if (!id) return false; f.p84ctr = 0; f.plan = null; f.queued = null; face(f, o.x, o.y); startAct(f, id); ST.stats.p84ctr = (ST.stats.p84ctr | 0) + 1; return true;
}
function tick84(dt) {
  if (ST.p84fx && ST.p84fx.length) { for (const e of ST.p84fx) e.t += dt; ST.p84fx = ST.p84fx.filter(e => e.t < e.T); }
  melee84();
  for (const f of ST.F) { if (!f) continue; if (f.p84after > 0) f.p84after = Math.max(0, f.p84after - dt);
    if (f.p84kb0 && !f.p84bo) { if (f.p84e) { const i = f === ST.F[0] ? 0 : 1; f.p84e.mv[i] = Math.round(Math.hypot(f.x - f.p84kb0.x, f.y - f.p84kb0.y)); f.p84e.hp1 = ST.F.map(q => Math.round(q.hp)); } f.p84kb0 = null; f.p84e = null; }
    const w = f.act && f.act.mv && f.act.mv.shape === 'can' && !f.act.ult ? f.act.id : null;
    if (f.p84was && !f.act && !w && ST.ph === 'fight' && ST.auto[f.side] && freeFor(f) && !f.dead) {   /* vừa xong đòn cận chiến → lướt lùi rồi bắn xa */
      const o = foeReal(f), dx = f.x - o.x, dy = f.y - o.y, d = Math.hypot(dx, dy) || 1, endCombo = f.p84was !== 'huc' || f.basicT > 0.5;
      if (endCombo && d < 48 && !o.dead && rnd() < 0.65) { const s = rnd() < 0.5 ? 1 : -1, vx = dx / d * 0.85 - dy / d * s * 0.5, vy = dy / d * 0.85 + dx / d * s * 0.5; f.dodge = { vx, vy, t: 0.3, delay: 0.04 }; f.p84after = 1.6; f.rethink = 0; f.plan = null; ST.stats.p84back = (ST.stats.p84back | 0) + 1; }
    }
    f.p84was = w; }
}
const BY84 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5], bay84 = (x, y) => (BY84[((y & 3) << 2) | (x & 3)] + 0.5) / 16;
function draw84(out, g, cx, cy) { for (const e of ST.p84fx || []) out.push({ y: e.ky, f: () => e.k === 'tr' ? tr84(g, e, cx, cy) : MC84 === 'old' ? star84(g, e, cx, cy) : mc84(g, e, cx, cy) }); }
function star84(g, e, cx, cy) {   /* chớp + tia lửa chữ thập vẽ code (2 điểm / px logic): nửa trái màu hệ bên trái, nửa phải màu hệ bên phải; ≤ 12 px logic; tắt bằng dither Bayer */
  const k = e.t / e.T; if (k >= 1) return; const PA = PAL84[e.hl] || PAL84.chan, PB = PAL84[e.hr] || PAL84.chan, X = Math.round((e.x - cx) * 2), Y = Math.round((e.y - cy) * 2);
  const dot = (x, y, c) => { g.fillStyle = c; g.fillRect(x / 2, y / 2, 0.5, 0.5); }, fade = k < 0.45 ? 1 : 1 - (k - 0.45) / 0.55, white = k < 0.12;
  const rc = k < 0.15 ? 3 + k / 0.15 * 4 : Math.max(0, 7 * (1 - (k - 0.15) / 0.45));
  for (let y = -Math.ceil(rc); y <= Math.ceil(rc); y++) for (let x = -Math.ceil(rc); x <= Math.ceil(rc); x++) { const q = x * x + y * y; if (q > rc * rc || fade < bay84(X + x, Y + y)) continue; const P = x < 0 ? PA : PB; dot(X + x, Y + y, white ? '#fffbe8' : q < rc * rc * 0.35 ? '#fffbe8' : P[q < rc * rc * 0.7 ? 1 : 3]); }
  const Lm = k < 0.2 ? 10 + k / 0.2 * 14 : 24 * (1 - (k - 0.2) / 0.8), Ld = Lm * 0.55, rot = 0.26;
  for (let i = 0; i < 8; i++) { const an = rot + i * Math.PI / 4, ca = Math.cos(an), sa = Math.sin(an) * 0.75, L = i % 2 ? Ld : Lm, P = ca < -0.01 ? PA : ca > 0.01 ? PB : (i < 4 ? PB : PA);
    for (let s = Math.max(2, rc * 0.8); s <= L; s += 1) { const px = Math.round(X + ca * s), py = Math.round(Y + sa * s), u = s / Math.max(1, L); if (fade * (1.15 - u * 0.6) < bay84(px, py)) continue;
      const c = white && u < 0.6 ? '#ffffff' : u < 0.35 ? P[0] : u < 0.7 ? P[2] : P[4]; dot(px, py, c); if (u < 0.4 && i % 2 === 0) dot(px + (Math.abs(sa) > 0.5 ? 1 : 0), py + (Math.abs(sa) > 0.5 ? 0 : 1), P[1]); } }
}
/* ===== p84 đợt 3 (02/11): CHIÊU LAO TỚI + LAO THÂN + CHỚP CLASH làm lại =====
   dash84: lao thẳng tới đối thủ (như Lao Nhanh), vệt hạt màu hệ sau lưng (vẽ code), bóng mờ; trúng → hất bay (đòn ≥ 75 tự hất 'fly').
   Lao Thân (kd): trúng → hất bay xa hơn + NGÃ 0,6 s (đứng dậy chậm); giá nhỏ: chính nó loạng choạng 0,35 s; hụt → chúi 0,7 s. */
function dash84(f, a, foe, dt, T0) {
  const K = a.mv.p84d, D = a.dash = a.dash || { t: 0, gT: 0, pT: 0, seen: null }, he = f.types[0];
  if (!D.t) { skLog({ side: f.side, id: a.id, m: 'dash84' }); sfx('knock_whoosh'); }
  D.t += dt; face(f, foe.x, foe.y); f.moving = true;
  if (!moveBy(f, f.fx * K.v * dt, f.fy * K.v * dt)) D.t = 9; clampField(f);
  if ((D.gT -= dt) <= 0) { D.gT = 0.05; ghostPush(f); }
  if ((D.pT -= dt) <= 0) { D.pT = 0.03; const P = ST.p84fx = ST.p84fx || []; for (let i = 0; i < 2; i++) P.push({ k: 'tr', he, x: f.x - f.fx * (5 + rnd() * 4) + (rnd() - 0.5) * 6, y: f.y - f.fy * 4 + (rnd() - 0.5) * 2, z: 2 + rnd() * Math.max(4, standH(f) * 0.6), vx: -f.fx * (20 + rnd() * 20), vz: 6 + rnd() * 10, t: 0, T: 0.2 + rnd() * 0.12, ky: f.y - 0.5 }); }
  D.seen = aoe(f, f.x, f.y, 12, K.kd ? 1.1 : 0.9, { seen: D.seen, noObj: true });
  const lg = q => { (ST.p84dLog = ST.p84dLog || []).push({ t: +ST.t.toFixed(2), side: f.side, id: a.id, ...q }); if (ST.p84dLog.length > 60) ST.p84dLog.shift(); };
  if (dist(f, foe) < Math.max(18, sepNeed(f, foe) + 3)) { a.fired = true;
    const hp0 = foe.hp, stab = a.mv.noStab && f.types.includes(a.mv.type) ? 1 / 1.5 : 1, ok = hit(f, foe, a.mv, { _now: 1, kb: 140, mul: stab }), mx = (f.x + foe.x) / 2, my = Math.max(f.y, foe.y);
    DFX.burst(mx, (f.y + foe.y) / 2 - Math.max(6, standH(foe) * 0.45), he, K.kd ? 0.95 : 0.75, my + 1);
    if (ok && K.kd && !foe.dead && !(foe.pin > 0)) { const dx = foe.x - f.x, dy = foe.y - f.y, dd = Math.hypot(dx, dy) || 1; foe.kb = { vx: dx / dd * 290, vy: dy / dd * 290, t: 0.3, fly: true, rut: 0, bounced: false }; foe.act = null; foe.dodge = null; foe.clip = 'hurt'; foe.ct = 0; foe.hurtT = 0.62;
      text(foe.x, foe.y - 34, ST.ctx.lang() === 'en' ? 'KNOCKED DOWN!' : 'NGÃ!', '#ffd0a0', 0.95, 1.1); DFX.dust(foe.x, foe.y, 7, Math.sign(dx)); if (ST.ctx.quake) ST.ctx.quake(0.14); ST.stats.p84kd = (ST.stats.p84kd | 0) + 1; }
    if (K.kd && !f.dead) { f.act = null; f.clip = 'idle'; f.ct = 0; f.hurtT = ok ? 0.35 : 0.7; f.kb = { vx: -f.fx * 70, vy: -f.fy * 40, t: 0.12 }; DFX.dust(f.x, f.y, 3, -Math.sign(f.fx)); }   /* giá: loạng choạng (trượt / bị chặn: chúi lâu hơn) */
    lg({ hit: !!ok, dmg: Math.round(hp0 - foe.hp), kd: !!(ok && K.kd), fly: !!(foe.kb && foe.kb.fly), hurt: +(foe.hurtT || 0).toFixed(2), self: K.kd ? (ok ? 0.35 : 0.7) : 0, whiff: ok ? 0 : 1 }); return; }
  if (D.t > (ST.inField ? 0.9 : 0.5)) { a.fired = true; lg({ hit: false, whiff: 1 });
    if (K.kd && !f.dead) { f.act = null; f.clip = 'idle'; f.ct = 0; f.hurtT = 0.7; text(f.x, f.y - 30, ST.ctx.lang() === 'en' ? 'WHIFF' : 'HỤT', '#d8d8e8', 0.85); DFX.dust(f.x, f.y, 5, Math.sign(f.fx)); return; }
    a.t = Math.max(a.t, T0 + 0.01); return; }
  f.ct = T0;   /* giữ khung lao */
}
function tr84(g, e, cx, cy) {   /* hạt vệt lao: 2 điểm / px logic, màu hệ sáng → tối, tắt bằng dither */
  const k = e.t / e.T; if (k >= 1) return; const P = PAL84[e.he] || PAL84.chan, x = Math.round((e.x + e.vx * e.t - cx) * 2), y = Math.round((e.y - (e.z + e.vz * e.t) - cy) * 2);
  g.fillStyle = k < 0.3 ? P[1] : k < 0.65 ? P[3] : P[5]; if (1 - k < bay84(x, y)) return; g.fillRect(x / 2, y / 2, 1, 0.5);
}
/* ---- CHỚP CLASH bản mới: 2 màu hệ tách bạch (nửa trái / phải), viền tối + đường trắng ở giữa; ≤ vùng 2 thú; 0,4 s; không lặp ---- */
const MC84V = ['a', 'b', 'c', 'd', 'old'];
let MC84 = (() => { try { const v = new URLSearchParams(location.search).get('mclash84'); return MC84V.includes(v) ? v : 'd'; } catch (e) { return 'd'; } })();
const rgb84 = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
function pp84(hl, hr) {   /* 2 bảng gần tông (cùng hệ / nâu–cam / xanh–xanh) → bên trái nhạt 1 bậc, bên phải đậm 1 bậc */
  const A = PAL84[hl] || PAL84.chan, B = PAL84[hr] || PAL84.chan, a = rgb84(A[2]), c = rgb84(B[2]);
  if (hl !== hr && Math.hypot(a[0] - c[0], a[1] - c[1], a[2] - c[2]) >= 120) return [A, B];
  return [['#ffffff'].concat(A.slice(0, 7)), B.slice(1).concat([B[7]])];
}
function rng84(s) { let x = (s >>> 0) || 1; return () => { x = (x * 1664525 + 1013904223) >>> 0; return x / 4294967296; }; }
function mc84(g, e, cx, cy) {
  const k = e.t / e.T; if (k >= 1) return; const [PA, PB] = pp84(e.hl, e.hr), X = Math.round((e.x - cx) * 2), Y = Math.round((e.y - cy) * 2);
  const buf = new Map(), put = (x, y, c, p) => { const q = x + ',' + y, o = buf.get(q); if (!o || o.p <= p) buf.set(q, { x, y, c, p }); };
  const side = x => (x < X ? PA : x > X ? PB : null), fade = k < 0.5 ? 1 : 1 - (k - 0.5) / 0.5, white = k < 0.1, sc = (k < 0.15 ? 0.5 + k / 0.15 * 0.5 : 1) * (k < 0.55 ? 1 : 1 - (k - 0.55) / 0.45 * 0.6);
  const V = MC84, wide = Math.min(1, Math.max(0.75, (e.d || 26) / 30));   /* 2 thú sát nhau thì thu nhỏ chút */
  if (V === 'a' || V === 'd') star3(put, side, X, Y, sc * wide, white);
  if (V === 'b') slash3(put, side, X, Y, k, PA, PB, wide);
  if (V === 'c' || V === 'd') ring3(put, side, X, Math.round((e.ky - 1 - cy) * 2), k, wide, V === 'd');   /* vòng sóng nằm trên MẶT ĐẤT dưới chân 2 thú (bản 1 vòng ngang ngực trông như cái vòng tròng qua thân) */
  if (V !== 'a') sparks3(put, X, Y, e, k, PA, PB, V === 'c' ? 5 : 7, wide);
  if (k < 0.3) { const r = (V === 'c' ? 9 : 6) * (1 - k / 0.3) + 2; for (let y = -Math.ceil(r); y <= r; y++) for (let x = -Math.ceil(r); x <= r; x++) { const q = x * x + y * y * 1.6; if (q > r * r) continue; put(X + x, Y + y, q < r * r * 0.45 || white ? '#ffffff' : x < 0 ? PA[0] : PB[0], 5); } }   /* lõi chớp */
  for (const o of buf.values()) { if (o.p < 9 && fade < bay84(o.x, o.y)) continue; let c = o.c; if (typeof c === 'number') { const P = side(o.x) || PA; c = P[c]; } g.fillStyle = c; g.fillRect(o.x / 2, o.y / 2, 0.5, 0.5); }
}
function star3(put, side, X, Y, s, white) {   /* chữ thập tách đôi: 8 tia nhọn; mỗi tia = viền tối (bậc 6) · thân (bậc 2) · lõi (bậc 0 / trắng); đường giữa trắng */
  const R = [[0, 46, 8], [Math.PI, 46, 8], [-Math.PI / 2, 32, 7], [Math.PI / 2, 22, 5.5], [-Math.PI / 4, 22, 5], [-3 * Math.PI / 4, 22, 5], [Math.PI / 4, 16, 4], [3 * Math.PI / 4, 16, 4]];   /* mài vòng 1: tia dày hơn ~35 % (bản 1 mảnh, khó đọc trên điện thoại) */
  for (const [an, len, w0] of R) { const L = len * s, ca = Math.cos(an), sa = Math.sin(an); if (L < 2) continue;
    for (let u = 0; u <= L; u += 0.5) { const w = w0 * s * Math.pow(1 - u / L, 0.85) + 0.4;
      for (let v = -w - 1; v <= w + 1; v += 0.5) { const x = Math.round(X + ca * u - sa * v), y = Math.round(Y + (sa * u + ca * v) * 0.85), av = Math.abs(v);
        if (x === X && av <= w) { put(x, y, '#ffffff', 4); continue; }   /* đường phân cách trắng */
        put(x, y, av > w ? 6 : av < w * 0.38 ? (white ? '#ffffff' : 0) : 2, av > w ? 1 : av < w * 0.38 ? 3 : 2); } } }
}
function slash3(put, side, X, Y, k, PA, PB, wide) {   /* 2 lưỡi chém chéo cắt nhau (mỗi bên 1 màu): mép trước trắng, thân bậc 2, mép sau bậc 5 */
  const grow = Math.min(1, k / 0.14), thin = k < 0.4 ? 1 : Math.max(0, 1 - (k - 0.4) / 0.6);
  for (const [P, dir] of [[PA, 1], [PB, -1]]) { const x0 = X - 30 * wide * dir, y0 = Y - 20, x1 = X + 30 * wide * dir, y1 = Y + 15;   /* mài vòng 1: ngắn lại (bản 1 che kín đầu 2 thú) */
    for (let s = 0; s <= grow; s += 0.008) { const bx = x0 + (x1 - x0) * s, by = y0 + (y1 - y0) * s - Math.sin(Math.PI * s) * 8, w = (3.6 * Math.sin(Math.PI * s) + 0.6) * thin, nx = (y1 - y0), ny = -(x1 - x0), nl = Math.hypot(nx, ny);
      for (let v = -w - 1; v <= w + 1; v += 0.5) { const x = Math.round(bx + nx / nl * v * dir), y = Math.round(by + ny / nl * v * dir), c = v > w || v < -w ? P[7] : v > w * 0.45 ? '#ffffff' : v > -w * 0.4 ? P[2] : P[5]; put(x, y, c, v > w || v < -w ? 1 : 3); } } }
}
function ring3(put, side, X, Y, k, wide, thin) {   /* vòng xung kích 2 nửa: trong trắng · giữa bậc 2 · ngoài bậc 6; chỗ 2 nửa gặp nhau trắng */
  const e = 1 - Math.pow(1 - Math.min(1, k / 0.7), 3), rx = (10 + 44 * e) * wide, ry = rx * 0.32, th = (thin ? 2 : 4) * (1 - k * 0.6) + 1;
  for (let a = 0; a < Math.PI * 2; a += 0.02) { const ca = Math.cos(a), sa = Math.sin(a);
    for (let d = -th; d <= th; d += 0.5) { const x = Math.round(X + ca * (rx + d)), y = Math.round(Y + sa * (ry + d * 0.5)); if (Math.abs(x - X) <= 1) { put(x, y, '#ffffff', 4); continue; } put(x, y, d < -th * 0.35 ? '#ffffff' : d > th * 0.6 ? 6 : 2, 2); } }
}
function sparks3(put, X, Y, e, k, PA, PB, n, wide) {   /* tia lửa văng về phía chủ (trái màu trái, phải màu phải), trọng lực, vệt 3 điểm */
  const R = rng84(e.seed || 1), t = e.t;
  for (const [P, sgn] of [[PA, -1], [PB, 1]]) for (let i = 0; i < n; i++) { const an = -0.95 + R() * 1.2, sp = (130 + R() * 120) * wide, vx = Math.cos(an) * sp * sgn, vy = Math.sin(an) * sp - 30 - R() * 40, life = 0.22 + R() * 0.16;
    if (t > life) continue; const q = t / life;
    for (let j = 0; j < 3; j++) { const tt = Math.max(0, t - j * 0.012), x = Math.round(X + vx * tt * 0.5), y = Math.round(Y + (vy * tt + 260 * tt * tt) * 0.5); put(x, y, j === 0 ? (q < 0.4 ? '#ffffff' : P[1]) : P[q < 0.5 ? 2 : 4], 9 - j); } }
}
/* startClash / updClash: xem mục review7 (đối chưởng tia dài chung mọi hệ) */
function updBreath(f, a, foe, dt) {   /* trả true khi còn đang phun */
  if (ST.clash && ST.clash.a === f) { f.clip = 'spit'; f.ct = (3 + Math.floor(ST.t * 10) % 3 + 0.5) / FPS.spit; return ST.clash.t < ST.clash.dur; }
  const b = a.breath, B = BREATH[f.sp]; b.t += dt; if (b.t >= b.dur || f.dead) return false;
  if (!foe.dead) { const want = Math.atan2(foe.y - f.y, foe.x - f.x); let d = want - b.ang; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; b.ang += Math.max(-B.turn * dt, Math.min(B.turn * dt, d)); }   /* quét chậm theo mục tiêu */
  f.fx = Math.cos(b.ang); f.fy = Math.sin(b.ang);
  moveBy(f, -f.fx * 6 * dt, -f.fy * 6 * dt);   /* giật lùi nhẹ */
  f.clip = 'spit'; f.ct = (3 + Math.floor(b.t * 10) % 3 + 0.5) / FPS.spit;   /* giữ khung há miệng lặp trong lúc phun */
  b.end = breathEnd(f, b); clashCheck(f, b);
  if ((b.tick -= dt) <= 0 && b.n < B.ticks) { b.tick = B.dur / B.ticks; b.n++;
    const e = b.end; if (!foe.dead && segDist(foe.x, foe.y, f.x, f.y, e.x, e.y) < 13) hit(f, foe, a.mv, { mul: 0.21, noMiss: b.n > 1, kb: 22, noFlash: b.n > 1 && b.n < B.ticks });
    for (let L = 14; L < e.L; L += 14) aoe(f, f.x + f.fx * L, f.y + f.fy * L, 10, 0.45, { seen: b.seen, noObj: true });
    aoe(f, e.x, e.y, 14, 0.6, { seen: b.seen, fire: true });
    if (e.water) { vfx('steam', e.x, e.y, { ky: e.y + 0.5 }); sfx('splash'); ST.stats.steam = (ST.stats.steam || 0) + 1; } else if (b.n % 2) ground(e.x, e.y + 1, SCORCH, 0.3);
  }
  return true;
}
function drawBreath(g, f, cx, cy) {   /* chuỗi khối lửa từ miệng tới điểm chạm (không xoay ảnh pixel) + đầu bùng ở điểm chạm */
  const b = f.act && f.act.breath; if (!b || !b.end) return;
  if (DFX.CODE) { const mo = mouthOf(f), k = Math.min(1, b.t / 0.15); DFX.codeBeam(g, 'nham', mo.x, mo.y, b.end.x, b.end.y - 4, 3, 12, cx, cy, ST.t, { wave: 1.6, wob: 0.18, len: k, head: !b.end.water && k >= 1 }); return; }   /* p52e: luồng lửa vẽ code */
  const mb = VFXM && VFXM.breath_blob, mh = VFXM && VFXM.breath_head, ib = mb && img(mb.file), ih = mh && img(mh.file); if (!ib) return;
  const mo = mouthOf(f), ex = b.end.x, ey = b.end.y - 4, dx = ex - mo.x, dy = ey - mo.y, D = Math.hypot(dx, dy), n = Math.max(2, Math.floor(D / 4)), sw = ib.naturalWidth / mb.n, k = Math.min(1, b.t / 0.15);
  for (let i = 0; i <= n * k; i++) { const t = i / n, x = mo.x + dx * t, y = mo.y + dy * t, fr = (Math.floor(b.t * mb.fps) + i * 2) % mb.n;   /* p53: i = 0 → khối đầu ở miệng (trước hở ~4 px) */
    g.drawImage(ib, fr * sw, 0, sw, ib.naturalHeight, (globalThis.__R89||Math.round)(x - cx - mb.ax), (globalThis.__R89||Math.round)(y - cy - mb.ay), mb.w, mb.h); }
  if (ih && !b.end.water && k >= 1) { const fr = Math.floor(b.t * mh.fps) % mh.n, w2 = ih.naturalWidth / mh.n; g.drawImage(ih, fr * w2, 0, w2, ih.naturalHeight, (globalThis.__R89||Math.round)(b.end.x - cx - mh.ax), (globalThis.__R89||Math.round)(b.end.y - cy - mh.ay), mh.w, mh.h); }
}
function updAct(f, dt) {   /* p52e: chiêu có cảnh code — tắt ảnh PixelLab trong lúc chạy động tác; đánh dấu lúc tung chiêu */
  const a = f.act; if (!a || !a.nv) return updAct0(f, dt);
  if (!a.dfxF && a.t + dt >= impactT(a.clip)) { a.dfxF = 1; const sc = DFX.find(f, a.id); if (sc) DFX.fired(sc); }
  ST.noVfx = (ST.noVfx || 0) + 1; try { return updAct0(f, dt); } finally { ST.noVfx--; }
}
function updAct0(f, dt) {
  const a = f.act, foe = foeOf(f); a.t += dt; f.ct = a.t;
  const T0 = impactT(a.clip), len = clipLen(f, a.clip);
  if (a.id === 'huc' && a.t < T0) moveBy(f, f.fx * 30 * dt, f.fy * 30 * dt);   /* nhích tới khi húc */
  { const K = SK[a.id]; if (K && K.align && !a.fired && !foe.dead) { const dy = foe.y - f.y; if (Math.abs(dy) > 1) moveBy(f, 0, Math.sign(dy) * Math.min(Math.abs(dy), 160 * dt)); const dir = foe.x >= f.x ? 1 : -1; f.fx = dir; f.fy = 0; }   /* p57: chiêu dải ngang (ảnh nhìn ngang) — trượt vào hàng đối thủ lúc gồng */
    if (K && K.m === 'dash' && a.t >= T0) { if (!a.fired) { a.fired = true; skDashStart(f, a, foe); } if (a.dash2) { if (skDash(f, a, foe, dt)) { f.ct = T0; return; } a.dash2 = null; a.t = Math.max(a.t, T0 + 0.01); } } }
  if (a.mv.p84d && a.t >= T0 && !a.fired) { dash84(f, a, foe, dt, T0); return; }   /* p84 đợt 3: chiêu lao tới mới + Lao Thân */
  if ((a.id === 'lao_lua' || a.id === 'lao') && a.t >= T0 && !a.fired) {   /* lao: chạy thật nhanh tới đối thủ (Lao Lửa để lại vệt lửa) + tia tốc độ */
    const fire = a.id === 'lao_lua';
    if (!a.dash) skLog({ side: f.side, id: a.id, m: 'dash' });   /* p52f: nhật ký chiêu (test 'đã tung chiêu') */
    if (!a.dash && fire && Math.abs(f.fx) > 0.5) vfx('x2_nham_vet_lua', f.x, f.y + 1, { ground: true, flip: f.fx < 0 });   /* p57: vệt lửa trên đất dọc đường lao */
    a.dash = a.dash || { t: 0, puff: 0, sc: 0 }; a.dash.t += dt; face(f, foe.x, foe.y);
    if (!a.warned && !foe.dead && foe.hp / foe.max <= 0.3) { const left = (dist(f, foe) - Math.max(18, sepNeed(f, foe) + 3)) / 235; if (left > 0 && left <= P52.WARN) { a.warned = true; warnEdge(f, left, a.id); } }   /* plan-52 #2: cú lao sắp hạ gục */
    const sp = 235; if (!moveBy(f, f.fx * sp * dt, f.fy * sp * dt)) a.dash.t = 9; clampField(f);
    if ((a.dash.puff -= dt) <= 0) { a.dash.puff = fire ? 0.045 : 0.09; if (fire) vfx('firepuff', f.x - f.fx * 6, f.y + 1, { ky: f.y - 0.5 }); else vfx('dust', f.x - f.fx * 6, f.y, { ground: true }); }
        a.seen = aoe(f, f.x, f.y, 12, 0.9, { seen: a.seen, noObj: true });
    if (dist(f, foe) < Math.max(18, sepNeed(f, foe) + 3)) { a.fired = true;   /* p49c: ngưỡng chạm theo khoảng tách mới (thú to không bao giờ tới < 18 px) */ vfx(fire ? 'fireboom' : HITFX[a.mv.type] || 'hit', foe.x, foe.y - 5, { ky: foe.y + 0.5 }); hit(f, foe, a.mv, { kb: 140 }); if (fire) { f.stage.spe = Math.min(6, f.stage.spe + 1); text(f.x, f.y - 30, L(ST.ctx).speUp, '#9fe8ff', 0.8); } }
    else if (a.dash.t > (ST.inField ? 0.9 : 0.5)) { a.fired = true; }   /* p54: lao xa hơn trên sân rộng */
    if (!a.fired) { f.ct = T0; return; }   /* giữ khung lao */
    a.t = Math.max(a.t, T0 + 0.01); return;
  }
  if (a.ult && !a.fired && !f.ultWarned && WARN_IMM[a.id] != null) { const left = T0 - a.t + WARN_IMM[a.id]; if (left <= P52.WARN) { f.ultWarned = true; warnEdge(f, left, a.id); } }   /* plan-52 #2: tuyệt chiêu trúng ngay lúc ra đòn */
  if (!a.fired && a.t >= T0) { a.fired = true; fire(f, a, foe); }
  if (a.sigU) { if (a.sigU(dt)) return; a.sigU = null; }   /* p67: chiêu riêng có động tác dài (lao / ôm) */
  if (a.breath) { if (updBreath(f, a, foe, dt)) return; a.breath = null; a.t = Math.max(a.t, len - 0.15); }
  if (a.pierce) { if (updPierce(f, a, foe, dt)) return; a.pierce = null; a.t = Math.max(a.t, len - 0.15); }   /* plan-52 #5 */
  if (a.t >= len) { f.act = null; f.clip = 'idle'; f.ct = 0; }
}
function fire(f, a, foe) {
  const id = a.id, mv = a.mv;
  const sc = a.nv ? DFX.find(f, id) : null, T0 = ST.timers.length;
  if (SK[id] && skFire(f, a, foe)) { if (sc && sc.I.main >= 0 && SK[id].m !== 'ult' && SK[id].m !== 'sig' && SK[id].m !== 'ltn' && SK[id].m !== 'p73' && SK[id].m !== 'p78') for (const t of ST.timers.splice(T0)) DFX.defer(sc, t.fn); echoRepeat(f, a, foe); return; }   /* p57 · p52e: hẹn giờ trúng → khung trúng của cảnh */
  if (id === 'huc') { if (dist(f, foe) <= 28) { if (DFX.CODE) DFX.burst((f.x + foe.x) / 2, (f.y + foe.y) / 2 - 7, f.types[0], 0.6, Math.max(f.y, foe.y) + 1); else vfx('hit', (f.x + foe.x) / 2, (f.y + foe.y) / 2 - 7, { ky: Math.max(f.y, foe.y) + 1 });   /* p52f: đánh thường — chớp + tia lửa vẽ code theo hệ */ hit(f, foe, mv); } else sfx('knock_whoosh'); return; }
  if (id === 'dam_chan') { vfx('damchan', f.x, f.y, { ground: true }); vfx('dust', f.x, f.y, { ground: true }); ground(f.x, f.y + 1, CRACK, 0.75); aoe(f, f.x, f.y, 40, 0.8, { noPlayer: false }); ST.ctx.quake(0.12); sfx('smash');
    if (dist(f, foe) <= 46) hit(f, foe, mv); return; }   /* p57: Địa Chấn Vòng r 40 (bản gộp) */
  if (id === 'nut_dat') { const dx = foe.x - f.x, dy = foe.y - f.y, d = Math.hypot(dx, dy) || 1;
    ST.runners.push({ f, mv, x: f.x + dx / d * 8, y: f.y + dy / d * 8, vx: dx / d, vy: dy / d, len: 0, max: 130, step: 0, dec: 0, hit: false }); sfx('smash'); ST.ctx.quake(0.08); return; }
  if (id === 'cot_da') { const m = a.mark; ST.timers.push({ t: 0.32, fn: () => { vfx('cotda', m.x, m.y + 2, { ky: m.y + 2 }); ST.ctx.quake(0.1); sfx('smash'); ground(m.x, m.y + 2, CRACK, 0.7); aoe(f, m.x, m.y, 22, 1.0);
    if (Math.hypot(foe.x - m.x, foe.y - m.y) <= 16) hit(f, foe, mv, { kb: 110 }); else text(m.x, m.y - 18, L(ST.ctx).miss, '#d8d8e8', 0.85); } }); return; }
  if (id === 'dai_dia_chan') { vfx('daidiachan', f.x, f.y, { ground: true }); ST.ctx.quake(0.4); sfx('smash');
        for (const [dx, dy, z] of [[0, 0, 'big'], [-36, -6, 'mid'], [36, 8, 'mid']]) ground(f.x + dx, f.y + dy, CRACK, 0.9, z);
    bigUlt(f, foe, mv, 'chan');   /* review7: thêm 3 tảng đá khổng lồ từ trời giáng */
    aoe(f, f.x, f.y, 84, 1.5);   /* tuyệt chiêu: vùng rộng — dân bay ngã, cây đổ, vật vỡ */
    if (dist(f, foe) <= 58) hit(f, foe, mv); else text(foe.x, foe.y - 22, L(ST.ctx).miss, '#d8d8e8', 0.95); return; }
  if (id === 'phun_than' && BREATH[f.sp]) { { const o = foeReal(f); if (!o.act && !o.dead && rnd() < 0.55) { const cm = ['nut_dat', 'cot_da'].find(m => MV78(o).includes(m) && (o.cds[m] || 0) <= 0); if (cm) startAct(o, cm); } }   /* đáp trả → đối chưởng */
    const B = BREATH[f.sp]; a.breath = { t: 0, dur: B.dur, len: B.len, ang: Math.atan2(foe.y - f.y, foe.x - f.x), tick: 0, n: 0, seen: new Set(), end: null, steam: 0 }; sfx('knock_whoosh'); ST.stats.breath = (ST.stats.breath || 0) + 1; return; }
  if (id === 'phun_than') { const mo = mouthOf(f), sx = mo.x, sy = mo.y, tx = foe.x + (foe.vx || 0) * 0.3, ty = foe.y - 12 + (foe.vy || 0) * 0.3, d = Math.hypot(tx - sx, ty - sy) || 1;
    { const h0 = Math.max(7, f.y - sy); ST.shots.push({ f, mv, x: sx, y: sy, vx: (tx - sx) / d * 155, vy: (ty - sy) / d * 155, h: h0, h0, T: d / 155, t: 0, life: 1.1, puff: 0, kind: 'ball' }); }   /* từ trên cao: độ cao giảm dần → đạn chúi xuống đất */ sfx('knock_whoosh'); return; }
  if (id === 'gam') { vfx('roar', f.x, f.y - 6, { ky: f.y + 0.5 }); sfx('roar'); aoe(f, f.x, f.y, 56, 0.4, { noObj: true, noMon: true });
    if (dist(f, foe) <= 64) { if (rnd() * 100 <= mv.acc) { foe.stage.atk = Math.max(-6, foe.stage.atk - 1); text(foe.x, foe.y - 26, L(ST.ctx).atkDown, '#ff8a6a', 0.9); ST.log.push({ t: +ST.t.toFixed(1), side: f.side, mv: id, stat: 'atk-1' }); } } else text(foe.x, foe.y - 22, L(ST.ctx).miss, '#d8d8e8', 0.9);
    return; }
  if (generic(f, a, foe)) return;
  if (id === 'nui_lua') { vfx('nuiluajet', f.x, f.y + 1, { ky: f.y - 0.5 }); ST.ctx.quake(0.2); sfx('smash'); aoe(f, f.x, f.y, 26, 1.0, { noObj: true });
    let first = true;
    for (let i = 0; i < 11; i++) {   /* review7: 11 thiên thạch, rải rộng hơn */
      const lead = i < 3 ? 6 : 56, ang = rnd() * Math.PI * 2;
      ST.timers.push({ t: 0.25 + i * 0.16, fn: () => {
        const lx = foe.x + Math.cos(ang) * lead * rnd() + (foe.vx || 0) * 0.3, ly = foe.y + Math.sin(ang) * lead * 0.7 * rnd() + (foe.vy || 0) * 0.3, mk = { x: lx, y: ly }; clampField(mk);
        ST.shots.push({ f, mv, x: mk.x, y: mk.y, h: 120, vh: 0, t: 0, life: 0.5, kind: 'meteor', warn: true, onLand: s => {
          vfx('meteorboom', s.x, s.y - 4, { ky: s.y + 0.5 }); ground(s.x, s.y + 1, SCORCH, 0.55); aoe(f, s.x, s.y, 26, 1.3); ST.ctx.quake(0.1); sfx('smash');
          if (Math.hypot(foe.x - s.x, foe.y - s.y) <= 18) { const m2 = first ? 0.55 : 0.25; if (hit(f, foe, mv, { mul: m2, noMiss: !first, kb: 90 })) first = false; }
        } });
      } });
    }
    return; }
}

/* ---------- chiêu chung theo dạng (đợt 2: Triều / Lôi / Phong / Mộc) — VFX vfx_workbench theo hệ: proj_<hệ> · hit_<hệ> · wave_<hệ> · ult_<hệ> ---------- */
function hitFx(type, x, y) { vfx(HITFX[type] || 'hit', x, y - 6, { ky: y + 0.5 }); }
function generic(f, a, foe) {
  const id = a.id, mv = a.mv, t = mv.type; if (!MV78(f) || ['huc', 'dam_chan', 'nut_dat', 'cot_da', 'dai_dia_chan', 'phun_than', 'lao_lua', 'gam', 'nui_lua'].includes(id)) return false;
  const sh = mv.shape;
  if (id === 'phan_quyet') { pierceStart(f, a, foe); return true; }   /* plan-52 #5: tia xuyên tới mép màn (thay 3 cột sáng p49c) */
  if (id === 'mua_kim_cuong' || id === 'phan_quyet') {   /* p49c: tuyệt chiêu Tinh (mưa pha lê) / Quang (cột sáng) giáng xuống chỗ đối thủ, vòng báo bám theo rồi khoá 0,1 s */
    const tinh = id === 'mua_kim_cuong'; let first = true; vfx('wave_' + t, f.x, f.y, { ground: true });
    for (let i = 0; i < (tinh ? 5 : 3); i++) ST.timers.push({ t: 0.15 + i * (tinh ? 0.2 : 0.32), fn: () => {
      const ox = i ? (rnd() - 0.5) * 34 : 0, oy = i ? (rnd() - 0.5) * 18 : 0, mk = { x: foe.x + ox, y: foe.y + oy }; clampField(mk);
      ST.shots.push({ f, mv, x: mk.x, y: mk.y, h: 0, t: 0, life: 0.4, kind: 'strike', warn: true, follow: foe, lock: 0.1, ox, oy, onLand: s => {
        vfx(tinh ? 'ult_tinh' : 'ult_quang', s.x, s.y + 1, { ky: s.y + 1 }); hitFx(t, s.x, s.y); aoe(f, s.x, s.y, tinh ? 22 : 26, 1.3); ST.ctx.quake(tinh ? 0.12 : 0.2); sfx('smash'); ST.stats.strikes = (ST.stats.strikes || 0) + 1;
        if (Math.hypot(foe.x - s.x, foe.y - s.y) <= (tinh ? 18 : 22)) { if (hit(f, foe, mv, { mul: first ? (tinh ? 0.45 : 0.6) : (tinh ? 0.2 : 0.3), noMiss: !first, kb: 110 })) first = false; } } }); } });
    return true; }
  if (sh === 'can') {   /* p49c: cận chiến riêng (Đập Âm) */
    if (dist(f, foe) <= 30) { hitFx(t, foe.x, foe.y); vfx('wave_' + t, foe.x, foe.y, { ground: true }); hit(f, foe, mv, { kb: 120 }); ST.ctx.quake(0.08); sfx('smash'); } else { sfx('knock_whoosh'); text(foe.x, foe.y - 22, L(ST.ctx).miss, '#d8d8e8', 0.85); } return true; }
  if (sh === 'quanh' && !mv.pow) {   /* p49c: chiêu trạng thái vòng quanh (Hú Vang, Chớp Loá) — không sát thương */
    vfx('wave_' + t, f.x, f.y, { ground: true }); hitFx(t, f.x, f.y); sfx('knock_whoosh'); aoe(f, f.x, f.y, 40, 0.4, { noObj: true, noMon: true });
    if (dist(f, foe) <= 52) { hitFx(t, foe.x, foe.y); applyTT(f, foe, mv); } else text(foe.x, foe.y - 22, L(ST.ctx).miss, '#d8d8e8', 0.85); return true; }
  if (sh === 'minh') { vfx(HITFX[t] || 'hit', f.x, f.y - 6, { ky: f.y + 0.5 }); vfx('wave_' + t, f.x, f.y, { ground: true }); applyTT(f, f, mv); sfx('knock_whoosh'); return true; }
  if (sh === 'dan') {   /* đạn bay nhanh có vệt đuôi */
    const mo = beamMouth(f), sx = mo.x, sy = mo.y, tx = foe.x + (foe.vx || 0) * 0.25, ty = foe.y - 10 - (foe.alt || 0) + (foe.vy || 0) * 0.25, d = Math.hypot(tx - sx, ty - sy) || 1, v = id === 'loi_cau' ? 190 : 260;   /* review7: đạn nhanh hơn */
    ST.shots.push({ f, mv, x: sx, y: sy, vx: (tx - sx) / d * v, vy: (ty - sy) / d * v, h: f.y - sy, t: 0, life: 1.0, kind: 'proj', fx: 'proj_' + t, trail: [], ox: sx, oy: sy });   /* p53: tâm đạn = miệng (đạn che kín điểm miệng ở khung đầu) */ sfx('knock_whoosh'); return true; }
  if (sh === 'tia') {   /* tia / sóng chạy dọc mặt đất tới đối thủ */
    const dx = foe.x - f.x, dy = foe.y - f.y, d = Math.hypot(dx, dy) || 1, P = { trieu: ['splash', 16, 190], loi: ['hit_loi', 18, 330], moc: ['hit_moc', 15, 210], suong: ['hit_suong', 16, 230], tinh: ['hit_tinh', 16, 250], am: ['hit_am', 18, 220], quang: ['hit_quang', 14, 330] }[t] || ['hit', 16, 200];
    const mo = beamMouth(f); ST.runners.push({ f, mv, x: mo.x, y: f.y, vx: dx / d, vy: dy / d, len: 0, max: rangeOf(f, id) + 10, step: 0, dec: 0, hit: false, fx: P[0], every: P[1], sp: P[2], nodec: true, h0: f.y - mo.y, h1: Math.max(4, standH(foe) * 0.45), D: Math.max(12, d), ox: mo.x, oy: mo.y });   /* p53: tia bắt đầu ở MIỆNG / TAY (trước: cách thân 10 px trên mặt đất) */   /* tia / sóng / rễ không để hố trên cỏ (bản trước rễ để cả dãy hố) */ sfx(t === 'loi' ? 'smash' : 'knock_whoosh'); return true; }
  if (sh === 'quanh' && !mv.ult) {   /* vòng quanh mình */
    vfx('wave_' + t, f.x, f.y, { ground: true }); hitFx(t, f.x, f.y); sfx('smash'); ST.ctx.quake(0.08); aoe(f, f.x, f.y, 40, 0.8);
    if (dist(f, foe) <= 46) hit(f, foe, mv, { kb: 110 }); else text(foe.x, foe.y - 22, L(ST.ctx).miss, '#d8d8e8', 0.85); return true; }
  if (id === 'bao_tu') { const m = a.mark; ST.timers.push({ t: 0.3, fn: () => { vfx('wave_moc', m.x, m.y, { ground: true }); vfx('hit_phong', m.x, m.y, { ky: m.y + 0.5 }); vfx('hit_moc', m.x, m.y, { ky: m.y + 0.5 }); sfx('knock_whoosh');
      if (Math.hypot(foe.x - m.x, foe.y - m.y) <= 24) applyTT(f, foe, mv); else text(m.x, m.y - 18, L(ST.ctx).miss, '#d8d8e8', 0.85); } }); return true; }
  if (id === 'set_troi') {   /* tuyệt chiêu Lôi: 3 tia sét trời giáng có vòng báo trước */
    let first = true;
    for (let i = 0; i < 4; i++) ST.timers.push({ t: 0.15 + i * 0.3, fn: () => {
      const ox = i > 1 ? (rnd() - 0.5) * 10 : 0, oy = i > 1 ? (rnd() - 0.5) * 6 : 0, mk = { x: foe.x + (foe.vx || 0) * 0.4 + ox, y: foe.y + (foe.vy || 0) * 0.4 + oy }; clampField(mk);
      ST.shots.push({ f, mv, x: mk.x, y: mk.y, h: 0, t: 0, life: 0.4, kind: 'strike', warn: true, follow: foe, lock: 0.1, ox, oy, onLand: s => {   /* plan-49a: vòng báo bám theo chỗ đối thủ SẼ tới, khoá 0,1 s trước khi giáng */
        vfx('pillar_loi', s.x, s.y + 1, { ky: s.y + 1 }); vfx('ult_loi', s.x, s.y, { ky: s.y + 0.5 }); ground(s.x, s.y + 1, SCORCH, 0.6); aoe(f, s.x, s.y, 28, 1.3); ST.ctx.quake(0.18); sfx('smash');
        if (Math.hypot(foe.x - s.x, foe.y - s.y) <= 22) { if (hit(f, foe, mv, { mul: first ? 0.6 : 0.3, noMiss: !first, kb: 120 })) first = false; } ST.stats.strikes = (ST.stats.strikes || 0) + 1; duelSfx('lightning_strike'); ST.stats.strikeD = (ST.stats.strikeD || []).concat(Math.round(Math.hypot(foe.x - s.x, foe.y - s.y))); } }); } });
    return true; }
  if (id === 'bao_loc') {   /* tuyệt chiêu Phong: lốc xoáy trồi lên chỗ đối thủ (đã báo trước) */
    const m = a.mark; vfx('wave_phong', f.x, f.y, { ground: true });
    ST.timers.push({ t: 0.35, fn: () => { vfx('ult_phong', m.x, m.y, { ky: m.y + 0.5 }); for (const [ox, oy] of [[-34, -10], [34, 8]]) vfx('ult_phong', m.x + ox, m.y + oy, { ky: m.y + oy + 0.5, delay: 0.12 });   /* review7: 3 cột lốc */ vfx('wave_phong', m.x, m.y, { ground: true }); aoe(f, m.x, m.y, 40, 1.5); ST.ctx.quake(0.3); sfx('smash');
      if (Math.hypot(foe.x - m.x, foe.y - m.y) <= 30) hit(f, foe, mv, { kb: 170 }); else text(m.x, m.y - 22, L(ST.ctx).miss, '#d8d8e8', 0.95); } }); return true; }
  if (mv.ult && t === 'trieu') { bigUlt(f, foe, mv, 'trieu'); return true; }   /* review7: TƯỜNG SÓNG cao ~nửa màn quét ngang sân rồi đổ xuống */
  if (mv.ult && t === 'suong') for (const [ox, oy] of [[0, 0], [-30, -12], [30, 12]]) vfx('ult_suong', foe.x + ox, foe.y + oy, { ky: foe.y + oy + 0.5, delay: 0.1 + Math.abs(ox) / 300 });   /* p49c: bão tuyết — gai băng trồi cả chỗ đối thủ */
  if (mv.ult && t === 'moc') for (const [ox, oy] of [[0, 0], [-40, -16], [40, 14]]) vfx('ult_moc', foe.x + ox, foe.y + oy, { ground: true, delay: 0.15 + Math.abs(ox) / 300 });   /* review7: rừng trồi cả chỗ đối thủ */
  if (mv.ult) {   /* trieu_dang / rung_troi: vùng lớn quanh mình */
    vfx('wave_' + t, f.x, f.y, { ground: true }); vfx('ult_' + t, f.x, f.y + 1, { ky: f.y + 1, ground: t === 'moc' || t === 'am' });   /* p49c: vòng âm thanh nằm dưới đất (đĩa sáng khung đầu che kín thân Cười Thố) */ ST.ctx.quake(0.4); sfx('smash');
    if (t === 'trieu') for (let i = 0; i < 4; i++) { const an = i * Math.PI / 2 + 0.6; ST.timers.push({ t: 0.12 + i * 0.1, fn: () => { const gx = f.x + Math.cos(an) * 34, gy = f.y + Math.sin(an) * 22; vfx('ult_trieu', gx, gy, { ky: gy + 0.5 }); vfx('splash', gx, gy, { ky: gy + 0.5 }); } }); }
    if (t === 'moc') ground(f.x, f.y + 2, CRACK, 0.85, 'big');
    aoe(f, f.x, f.y, 76, 1.5);
    if (dist(f, foe) <= rangeOf(f, id) + 8) hit(f, foe, mv); else text(foe.x, foe.y - 22, L(ST.ctx).miss, '#d8d8e8', 0.95); return true; }
  return false;
}

/* ---------- AI ---------- */
function crowd(x, y, r) { const c = ST.ctx; let n = 0; for (const q of c.allNpcs().concat(c.monsters ? c.monsters.list() : [])) if (Math.hypot(q.x - x, q.y - y) < r) n++; return n; }
function choose(f) {   /* chọn chiêu: khắc hệ, đang trong tầm, hồi chiêu; tuyệt chiêu khi đối thủ yếu / quanh nó đông mục tiêu / sắp hết giờ chờ */
  const foe = foeOf(f), d = dist(f, foe), ready = MV78(f).filter(id => (f.cds[id] || 0) <= 0);
  if (!ready.length) return null;
  if (P73.holdMoves(f)) return null;   /* p73: ngậm than / thấy thế rình → nhịn chiêu */
  { const sg = SIG[f.sp]; if (sg && !f.sigDone && ready.includes(sg) && (f.fightT || 0) > 1.2 && !foe.dead) return sg; }   /* p67b: chiêu riêng tung SỚM 1 lần mỗi trận cho thấy rõ */
  const ult = ready.find(id => MOVES[id].ult);
  if (ult && (foe.hp / foe.max < 0.55 || crowd(foe.x, foe.y, 70) >= 2 || f.hp / f.max < 0.35 || rnd() < 0.35)) return ult;
  if (huc84(f, d)) return null;   /* p84: đang ở thế áp sát → nhường chỗ cho chuỗi đòn cận chiến (huc) thay vì đứng xa bắn */
  const w = ready.filter(id => !MOVES[id].ult).map(id => {
    const mv = MOVES[id]; let k = mv.pow ? (mv.pow / 70) * typeMul(mv.type, foe.types) * (f.types.includes(mv.type) ? 1.5 : 1) : 0.5;
    if (d <= rangeOf(f, id)) k *= 1.6; else k *= Math.max(0.3, 1 - (d - rangeOf(f, id)) / 120);   /* ưu tiên chiêu đánh được ngay */
    if (id === 'gam' && foe.stage.atk <= -2) k = 0;
    if (id === 'bong_giam' && foe.stage.spe <= -2) k = 0; if (id === 'gio_xuoi' && f.stage.spe >= 2) k = 0; if (id === 'bao_tu' && foe.status) k = 0;
    if (id === 'tieng_vong' && f.echo) k = 0; if (id === 'lan_bong' && f.hide) k = 0; if (id === 'tieng_vong' || id === 'lan_bong') k = Math.max(k, 0.6);   /* p57 */
    if (mv.eff && mv.eff.weather && ST.weather === mv.eff.weather) k = 0;   /* p72: thời tiết đang có thì không gọi lại */
    if (id === 'tu_lanh' && f.hp / f.max > 0.65) k = 0; if (id === 'chan_quang' && f.shield > 0) k = 0; if (id === 'guong_bang' && f.reflect) k = 0; if (id === 'giap_tinh' && f.stage.def >= 2) k = 0;   /* p49c */
    if ((id === 'hu_vang' || id === 'chop_loa') && d > 60) k *= 0.3; if (id === 'chop_loa' && foe.stage.acc <= -1) k = 0; if (id === 'hu_vang' && foe.stage.atk <= -2) k = 0;
    if (id === 'dam_chan' && d > 60) k *= 0.5;
    if (MOVES[id].chg) k = chgW(f, id, k, foe, d);   /* p100 */
    if (MOVES[id].myk) k = mykW(f, id, k, foe, d);   /* p99 */
    if (MOVES[id].mdk) k = mdkW(f, id, k, foe, d);   /* p96 */
    if (P73.IDS[id]) k = P73.weight(f, id, k, foe, d);   /* p73 */
    if (P78.IDS[id]) k = P78.weight(f, id, k, foe, d);   /* p78 */ k = w84(f, id, k, d);   /* p84: cận chiến khi gần, bắn xa sau khi lùi */
    return [id, k];
  }).filter(q => q[1] > 0);
  if (!w.length) return ult || null;
  let s0 = w.reduce((a, b) => a + b[1], 0) * rnd(); for (const [id, k] of w) { if ((s0 -= k) <= 0) return id; } return w[0][0];
}
function steer(f, dt) {   /* di chuyển khi rảnh: tới tầm chiêu đã định, không thì giữ khoảng ưa thích + đi vòng */
  const foe = foeOf(f), d = dist(f, foe), dx = foe.x - f.x, dy = foe.y - f.y, nx = dx / (d || 1), ny = dy / (d || 1);
  if (ST.inField && (f.meleeT = (f.meleeT ?? 0) - dt) <= 0) { f.meleeT = 1.6 + rnd() * 1.6; f.melee = (f.p84after || 0) > 0 ? false : PREF[f.sp] < 40 ? rnd() < 0.8 : rnd() < 0.6; }   /* p84: thú đánh xa cũng xen áp sát (video: cận chiến ≈ 55 %) */   /* p54: sân rộng — thú đánh xa chỉ ~30 % lần lao vào cận chiến, còn lại giữ khoảng trung / xa */
  let want = f.plan ? rangeOf(f, f.plan) * 0.8 : (f.basicT <= 0.25 && (!ST.inField || f.melee) ? RANGE.huc - 2 : prefOf(f));
  if (f.plan === 'phun_than' || f.plan === 'cot_da' || f.plan === 'nui_lua') want = Math.max(40, Math.min(want, ST.inField ? 140 : 80));
  const sp = speedOf(f) * 1.25 * (f.status && f.status.id === 'te' ? 0.5 : 1);   /* hăng hơn */
  let vx = 0, vy = 0;
  if (d > want + 4) { vx = nx; vy = ny; }
  else if (d < want - 8 && (PREF[f.sp] >= 46 || (ST.inField && PREF[f.sp] >= 40)) && !FLY[f.sp] && !f.plan) { vx = -nx; vy = -ny; }   /* thú đánh xa lùi giữ khoảng */
  if ((f.orbitT -= dt) <= 0) { f.orbitT = 1.2 + rnd() * 2; if (rnd() < 0.4) f.orbit = -f.orbit; }
  const orb = d <= want + 10 ? 0.75 : 0.3; vx += -ny * f.orbit * orb; vy += nx * f.orbit * orb;
  { const c = ST.ctx;   /* đẩy khỏi cây / vật cao / ô cứng / mép bản đồ (giữ trận ở chỗ thoáng, không chui sau hàng cây) */
    for (let a = 0; a < 8; a++) { const ux = Math.cos(a * Math.PI / 4), uy = Math.sin(a * Math.PI / 4); for (const r of [18, 32]) { const ex = f.x + ux * r, ey = f.y + uy * r; if ((!FLY[f.sp] && !walkable(ex, ey) && !swimOK(f, ex, ey)) || tallAt(c, ex, ey, 8)) { vx -= ux * (r === 18 ? 0.45 : 0.25); vy -= uy * (r === 18 ? 0.45 : 0.25); } } }
    const m = c.S.map, tx = f.x / 16, ty = f.y / 16; if (tx < 5) vx += (5 - tx) * 0.4; if (tx > m.w - 5) vx -= (tx - m.w + 5) * 0.4; if (ty < 5) vy += (5 - ty) * 0.4; if (ty > m.h - 5) vy -= (ty - m.h + 5) * 0.4;
    if (f.relocate) { const rx = f.relocate.x - f.x, ry = f.relocate.y - f.y, rd = Math.hypot(rx, ry); f.relocate.t -= dt; if (rd < 6 || f.relocate.t <= 0) f.relocate = null; else { vx = rx / rd * 2 + vx * 0.2; vy = ry / rd * 2 + vy * 0.2; } } }
  { const p = ST.ctx.S.player, dpx = p.x - f.x, dpy = p.y - f.y, dp = Math.hypot(dpx, dpy);   /* đi quá xa người chơi → kéo trận về gần */
    if (!ST.inField && !(ST.opts && ST.opts.field === 'leader_arena') && dp > LEASH) { const k = Math.min(2.5, (dp - LEASH) / 40); vx += dpx / dp * k; vy += dpy / dp * k; } }   /* p54: sân tạm — không kéo về người chơi (người chơi đứng đầu sân) */
  { const b73 = P73.steer(f); if (b73) { vx = vx * (1 - b73.w) + b73.x * b73.w * 2; vy = vy * (1 - b73.w) + b73.y * b73.w * 2; } }
  { const b78 = P78.steer(f); if (b78) { vx = vx * (1 - b78.w) + b78.x * b78.w * 2; vy = vy * (1 - b78.w) + b78.y * b78.w * 2; } }   /* p78: né vũng cát lún */   /* p73: chạy khỏi tâm chấn / khỏi Dế / tới điểm lưu */
  const n = Math.hypot(vx, vy);
  if (n > 0.05) { f.vx = vx / n * sp; f.vy = vy / n * sp; if (!moveBy(f, f.vx * dt, f.vy * dt)) { f.blockT = (f.blockT || 0) + dt; if (f.blockT > 0.4) { f.blockT = 0; f.orbit = -f.orbit; } } f.moving = true; if (d > 10) face(f, foe.x, foe.y); if (Math.abs(vx) + Math.abs(vy) > 0.2 && d > want + 4) face(f, f.x + vx, f.y + vy); }
  else { f.vx = f.vy = 0; f.moving = false; face(f, foe.x, foe.y); if ((f.stillT = (f.stillT || 0) + dt) > 0.35) { f.stillT = 0; f.orbit = -f.orbit; f.orbitT = 0.8; } }   /* không đứng yên quá ~0,4 s */
  if (f.moving) f.stillT = 0;
}
function inRange(f, id) { return dist(f, foeOf(f)) <= rangeOf(f, id); }

function altTarget(f) {
  const F0 = FLY[f.sp]; if (!F0 || f.dead || P78.grounded(f)) return 0;   /* p78 Địa Từ: thú bay bị kéo xuống */ const a = f.act;
  if (a) { if (a.ult) return 0; if (a.id === 'huc') return 3; if (a.id === 'lao_lua') return 4; }
  if (f.hurtT > 0) return F0.alt * 0.7; return F0.alt;
}
function updFighter(f, dt) {
  if (f.decoy && (f.decoy.t -= dt) <= 0) f.decoy = null;   /* p72 Phân Thân */
  P73.tick(f, dt); P78.tick(f, dt);   /* p73 · p78 */
  if (f.ltId && !f.absent && !f.hidden) f.fought = true;   /* p72: linh thú đã ra sân (tính KN) */
  f.flash = Math.max(0, f.flash - dt);
  if (f.inv > 0) f.inv = Math.max(0, f.inv - dt); if (!f.absent && ST.ph === 'fight') f.fightT = (f.fightT || 0) + dt; if (f.absent) { f.moving = false; f.ct += dt; return; }   /* plan-58: đang gọi ra / thu về — đứng ngoài trận */
  { const ta = altTarget(f); f.alt = f.alt == null ? ta : f.alt + Math.sign(ta - f.alt) * Math.min(Math.abs(ta - f.alt), (f.dead ? 60 : 34) * dt); }
  if ((f.stageT = (f.stageT ?? 10) - dt) <= 0) { f.stageT = 10; for (const k in f.stage) if (f.stage[k]) f.stage[k] -= Math.sign(f.stage[k]); }   /* bậc chỉ số tự hồi dần về 0 (thời gian thực) */
  for (const k in f.cds) f.cds[k] = Math.max(0, f.cds[k] - dt);
  if (f.reflect && (f.reflect.t -= dt) <= 0) f.reflect = null;
  if (DIG[f.sp]) f.digCd = (f.digCd ?? DIG[f.sp].first) - dt;   /* hồi chiêu đào đất chạy cả lúc đang làm việc khác */
  f.basicT = Math.max(0, f.basicT - dt);
  if (f.status) {
    f.status.t -= dt;
    if (f.status.id === 'bong' && (f.status.tick -= dt) <= 0 && !f.dead) { f.status.tick = 3; const dmg = Math.max(1, Math.round(f.max * 0.06)); f.hp = Math.max(0, f.hp - dmg); text(f.x, f.y - 20, String(dmg), '#ff9a4a', 0.9); vfx('firepuff', f.x, f.y - 2, { ky: f.y + 0.5 }); f.flash = 0.08; if (f.hp <= 0) faint(f); }
    if (f.status && f.status.t <= 0) f.status = null;
  }
  if (f.dead) { f.ct += dt; if (f.koFly) koFly(f, dt); return; }
  if (f.ghosts) { for (const q of f.ghosts) q.t += dt; if (f.ghosts.length && f.ghosts[0].t > 0.4) f.ghosts = null; }
  if (ST.clash && (ST.clash.a === f || ST.clash.b === f)) return;
  if (f.p84lk > 0) { lock84(f, dt); return; } if (f.p84bo) { bounce84(f, dt); return; }   /* p84: CLASH cận chiến — ghìm nhau rồi bật lùi (không ghi speedMul) */   /* đang đối chưởng: updClash điều khiển */
  if (f.dig) { if (updDig(f, dt)) return; }
  if (f.jump) { const J = f.jump; J.t += dt; const k = Math.min(1, J.t / J.T); f.x = J.x0 + (J.x1 - J.x0) * k; f.y = J.y0 + (J.y1 - J.y0) * k; f.alt = Math.sin(Math.PI * k) * 22; f.clip = 'run'; f.ct += dt; face(f, J.x1, J.y1);
    if (k >= 1) { f.jump = null; f.alt = 0; vfx('dust', f.x, f.y, { ground: true }); vfx('swim_ripple', f.x, f.y + 3, { ground: true }); } return; }   /* nhảy giữa các bè */
  if (inSwim(f)) { if ((f.ripT = (f.ripT || 0) - dt) <= 0) { f.ripT = f.moving || f.dodge ? 0.28 : 0.8; vfx('swim_ripple', f.x, f.y + 1, { ground: true }); } if ((f.bubT = (f.bubT || 0) - dt) <= 0) { f.bubT = 2 + rnd() * 1.5; vfx('swim_bubbles', f.x + 6, f.y - 1, { ky: f.y + 0.5 }); } }
  if (f.toss > 0) { f.toss = Math.max(0, f.toss - dt); if (!f.toss) { f.tossT = 0; f.tossH = 0; } }
  if (f.kb && f.kb.fly) {   /* bay văng: cày rãnh + bụi dọc đường; đập vật cản → vật vỡ (ảnh của chính nó) + nảy lại */
    const K = f.kb, ox = f.x, oy = f.y, okm = moveBy(f, K.vx * dt, K.vy * dt);
    if ((K.rut -= Math.hypot(f.x - ox, f.y - oy)) <= 0) { K.rut = 14; if (!FLY[f.sp]) { ground(f.x, f.y + 1, CRACK, 0.55, 'small'); vfx('dust', f.x, f.y, { ground: true }); } }
    if (!okm && !K.bounced) { K.bounced = true; const tx = Math.floor((f.x + Math.sign(K.vx) * 10) / 16), ty = Math.floor((f.y + Math.sign(K.vy) * 6) / 16), ob = solidObjAt(ST.ctx, tx, ty);
      if (ob) { aoe(foeOf(f), tx * 16 + 8, ty * 16 + 12, 10, 1.3, { noPlayer: true }); ST.stats.kbBreak = (ST.stats.kbBreak || 0) + 1; }
      vfx('hit', f.x + Math.sign(K.vx) * 8, f.y - 8, { ky: f.y + 1 }); sfx('smash'); if (ST.ctx.quake) ST.ctx.quake(0.12); K.vx *= -0.4; K.vy *= -0.4; K.t = Math.min(K.t, 0.12); }
    K.t -= dt; if (K.t <= 0) f.kb = null; clampField(f);
  }
  if (f.kb) { moveBy(f, f.kb.vx * dt, f.kb.vy * dt); f.kb.t -= dt; if (f.kb.t <= 0) f.kb = null; clampField(f); }
  f.tint = Math.max(0, (f.tint || 0) - dt);
  if (f.hurtT > 0) { f.hurtT -= dt; f.ct += dt; if (f.hurtT <= 0) { f.clip = 'idle'; f.ct = 0; } return; }
  if (f.daze > 0) { f.daze -= dt; f.act = null; f.dodge = null; f.moving = false; f.plan = null; if (f.clip !== 'idle') { f.clip = 'idle'; f.ct = 0; } else f.ct += dt; return; }   /* plan-58 C.2: thú hoang kiệt sức — đứng im */
  if (f.status && f.status.id === 'dong') { f.act = null; f.dodge = null; f.moving = false; return; }   /* p49c: đóng băng — đứng im (không đổi khung) */
  if (f.status && f.status.id === 'ngu') { f.act = null; f.dodge = null; f.clip = 'idle'; f.moving = false; if ((f.zzT = (f.zzT || 0) - dt) <= 0) { f.zzT = 0.8; text(f.x + 6, f.y - 20, 'z', '#a8b4ff', 0.8, 0.8); } return; }   /* ngủ: đứng im (khung đầu), trúng đòn thì tỉnh */
  if (f.slowT > 0) f.slowT -= dt; if (f.echo && (f.echo.t -= dt) <= 0) f.echo = null; if (f.echoFlash > 0) f.echoFlash -= dt;
  if (f.testHold && !f.act && !f.pin && !f.kb) { f.moving = false; if (f.clip !== 'idle' && f.hurtT <= 0) { f.clip = 'idle'; f.ct = 0; } else f.ct += dt; if (f.hurtT > 0) f.hurtT -= dt; return; }   /* chỉ test: đứng yên làm bia */
  if (f.hide) { f.hide.t += dt; f.moving = false; if (f.hide.t >= f.hide.T) skEmerge(f); return; }   /* p57 Lẩn Bóng */
  if (f.chgFrz > ST.t) { chgFrzU(f, dt); return; }   /* p100: Phỏng Vấn Bất Ngờ — đứng hình */
  if (f.hyp) { updHyp(f, dt); return; }   /* p67 Ánh Mắt Đêm */
  if (f.pin > 0) { f.pin -= dt; f.moving = false; f.act = null; f.dodge = null; if (f.clip !== 'hurt') { f.clip = 'hurt'; f.ct = 0; } f.ct = Math.min(f.ct + dt, 0.15); return; }   /* p57: bị nhốt trong bong bóng / trong tuyệt chiêu — đứng giữa hiệu ứng */
  if (f.act) { updAct(f, dt); clampField(f); return; }
  if (f.dodge) {   /* né: lướt ngang ngắn */
    if (f.dodge.delay > 0) f.dodge.delay -= dt;
    else { if (!f.dodge.puffed) { f.dodge.puffed = true; vfx('dust', f.x, f.y, { ground: true }); }
      const sp = speedOf(f) * (f.dodge.slide ? 2.8 : 2.4) * P78.dodgeMul(f);   /* p78 Địa Từ: lướt ×0,6 */ moveBy(f, f.dodge.vx * sp * dt, f.dodge.vy * sp * dt); if ((f.dodge.gT = (f.dodge.gT || 0) - dt) <= 0) { f.dodge.gT = 0.035; ghostPush(f); }   /* review7: lướt nhanh + bóng mờ */ f.dodge.t -= dt; f.clip = 'run'; f.ct += dt; f.moving = true; clampField(f);
      if (f.dodge.t <= 0) { if (f.dodge.p84c) f.p84ctr = 0.6; f.dodge = null; } return; }   /* p84: né xong → phản đòn trong 0,6 s */
  }
  if (ST.ph !== 'fight' || foeOf(f).dead || foeOf(f).absent) { f.plan = null; f.queued = null; if (f.clip !== 'idle') { f.clip = 'idle'; f.ct = 0; } else f.ct += dt; return; }   /* hết trận / đối thủ đã ngất: không ra chiêu mới */
  /* quyết định */
  const auto = ST.auto[f.side];
  if (f.queued && (f.cds[f.queued] || 0) > 0) f.queued = null;
  if (DIG[f.sp]) { if (f.digCd <= 0 && dist(f, foeOf(f)) > sepNeed(f, foeOf(f)) + (f.digCd < -3 ? 0 : 5) && rnd() < dt * 2.5 && auto) { startDig(f); return; } }   /* plan-49b: Thạch Chấn Vương áp sát cận chiến (< 40 px) nên ngưỡng cũ 40 px hiếm khi mở → 28 px, hồi xong > 3 s thì 16 px */   /* review7: đào đất */
  if (auto && f.p84ctr > 0 && ctr84(f, dt)) return;   /* p84: phản đòn sau khi né */
  if (auto) { if ((f.rethink -= dt) <= 0) { f.rethink = 0.5 + rnd() * 0.6; if (!f.plan || (f.cds[f.plan] || 0) > 0) f.plan = choose(f); } }
  else f.plan = f.queued;
  if (f.plan && (f.cds[f.plan] || 0) <= 0 && inRange(f, f.plan) && (f.plan !== 'phun_than' || dist(f, foeOf(f)) > 26 || rnd() < 0.02)) { const id = f.plan; f.plan = null; f.queued = null; startAct(f, id); return; }
  if (f.plan && (f.cds[f.plan] || 0) > 0) f.plan = null;
  if (!f.plan && f.basicT <= 0 && dist(f, foeOf(f)) <= RANGE.huc) { startAct(f, 'huc'); return; }
  if (seaJump(f, dt)) return;
  steer(f, dt);
  const want = FLY[f.sp] && SPR && SPR[f.sp] && SPR[f.sp].fly ? (f.moving && SPR[f.sp].flymove ? 'flymove' : 'fly') : f.moving ? 'run' : 'idle'; if (f.clip !== want) { f.clip = want; f.ct = 0; } else f.ct += dt;   /* thú bay: luôn clip 'fly' (đập cánh lơ lửng) */
  clampField(f);
}
function walkable(x, y) {   /* ô cứng của map (vật, tường, nước sâu…) là vật cản thật trong vòng sân */
  const c = ST.ctx, m = c && c.S.map; if (!m) return true; const tx = Math.floor(x / 16), ty = Math.floor(y / 16);
  return !c.isSolid(m, tx, ty);
}
const SWIM = { bachkinh: 1 };   /* review7: thú bơi được trên ô nước của sân tạm */
function swimOK(f, x, y) { const m = ST.ctx && ST.ctx.S.map; return !!(SWIM[f.sp] && ST.inField && m && isWater(x, y) && x > 20 && y > 20 && x < m.w * 16 - 20 && y < m.h * 16 - 20); }
function inSwim(f) { return SWIM[f.sp] && ST.inField && isWater(f.x, f.y) && !walkable(f.x, f.y); }
const passShot = (x, y) => walkable(x, y) || (ST.inField && FIELD.kind === 'sea' && isWater(x, y));
function flyable(x, y) { const m = ST.ctx && ST.ctx.S.map; return !m || (x > 40 && y > 40 && x < m.w * 16 - 40 && y < m.h * 16 - 32); }
function moveBy(f, dx, dy) {   /* đi có va chạm: chặn trục nào thì bỏ trục đó; trả false khi bị chặn cả hai */
  if (FLY[f.sp] && !f.dead) { let ok = true; if (dx && flyable(f.x + dx, f.y)) f.x += dx; else if (dx) ok = false; if (dy && flyable(f.x, f.y + dy)) f.y += dy; else if (dy) ok = false; return ok; }
  let ok = true;
  const W = (x, y) => walkable(x, y) || swimOK(f, x, y);
  if (dx && W(f.x + dx + Math.sign(dx) * 4, f.y)) f.x += dx; else if (dx) ok = false;
  if (dy && W(f.x, f.y + dy + Math.sign(dy) * 2)) f.y += dy; else if (dy) ok = false;
  return ok;
}
function clampField(p) {   /* không vòng sân: chỉ giữ trong bản đồ (ô cứng do moveBy lo) */
  const m = ST.ctx && ST.ctx.S.map; if (!m) return; p.x = Math.max(24, Math.min(m.w * 16 - 24, p.x)); p.y = Math.max(ST.inField ? FIELD_TOP : 24, Math.min(ST.inField ? FIELD_BOT : m.h * 16 - 16, p.y)); return;
  const fld = null; if (!fld) return;
  const ex = (p.x - fld.x) / fld.rx, ey = (p.y - fld.y) / fld.ry, e = Math.hypot(ex, ey);
  if (e > 1) { p.x = fld.x + ex / e * fld.rx; p.y = fld.y + ey / e * fld.ry; }
}
const BODY_W = {};   /* p49c: bề ngang thân (bbox khung đứng hướng nam, px logic) */
function bodyW(f) {
  if (BODY_W[f.sp] != null) return BODY_W[f.sp]; const c = SPR && SPR[f.sp] && SPR[f.sp].idle, im = c && img(c.file); if (!im) return 20;
  try { const cv = document.createElement('canvas'); cv.width = c.cw; cv.height = c.ch; const x = cv.getContext('2d'); x.drawImage(im, 0, 0, c.cw, c.ch, 0, 0, c.cw, c.ch); const d = x.getImageData(0, 0, c.cw, c.ch).data; let x0 = c.cw, x1 = -1;
    for (let y = 0; y < c.ch; y++) for (let xx = 0; xx < c.cw; xx++) if (d[(y * c.cw + xx) * 4 + 3] > 40) { x0 = Math.min(x0, xx); x1 = Math.max(x1, xx); }
    BODY_W[f.sp] = x1 >= x0 ? (x1 - x0 + 1) / 2 : 20; } catch (e) { BODY_W[f.sp] = c.cw / 2; }
  return BODY_W[f.sp];
}
function sepNeed(a, b) { return Math.max(16, (bodyW(a) + bodyW(b)) * 0.42); }   /* khoảng tối thiểu 2 thân (dùng chung: tách, chạm khi lao, ngưỡng đào) */
function separate() {   /* p49c: khoảng tối thiểu theo bề ngang 2 thân (trước cố định 20 px → 2 thú to chồng nhau khi phóng nấc 2 điện thoại); chỉ đẩy khi lệch dọc < 10 px (đứng trước / sau thì cho xếp lớp) */
  const [a, b] = ST.F; if (!a || !b || a.dead || b.dead || a.absent || b.absent || a.dig || b.dig || ST.clash || a.hugFront || b.hugFront) return;   /* p67b: đang ôm thì cho chồng thân */ const d = dist(a, b), need = sepNeed(a, b);
  if (d < need && d > 0.01 && Math.abs(a.y - b.y) < 10 + need * 0.25) { const k = (need - d) / 2, nx = (b.x - a.x) / d, ny = (b.y - a.y) / d; moveBy(a, -nx * k, -ny * k); moveBy(b, nx * k, ny * k); ST.stats.sep = (ST.stats.sep || 0) + 1; }
}

/* ---------- đạn / đường nứt / hẹn giờ ---------- */
function updShots(dt) {
  for (const s of ST.shots) {
    s.t += dt; const foe = foeOf(s.f);
    if (s.mv && s.mv.ult && s.onLand && !s.f.ultWarned && s.life - s.t > 0 && s.life - s.t <= P52.WARN) { s.f.ultWarned = true; warnEdge(s.f, s.life - s.t, s.mv.id); }   /* plan-52 #2: đá / sét / thiên thạch đầu tiên của tuyệt chiêu */
    if (s.kind === 'ball') {
      s.x += s.vx * dt; s.y += s.vy * dt; if (s.h0 > 7) { const k = Math.min(1, s.t / Math.max(0.1, s.T)); s.h = s.h0 + (7 - s.h0) * k; }
      if ((s.puff -= dt) <= 0) { s.puff = 0.07; vfx('firepuff', s.x, s.y + s.h - 4, { ky: s.y + s.h }); }
      if (!passShot(s.x, s.y + s.h)) { s.done = true; vfx('fireboom', s.x, s.y + 2, { ky: s.y + s.h }); aoe(s.f, s.x, s.y + s.h, 16, 0.8); continue; }   /* đạn trúng vật cản */
      if (!foe.dead && Math.hypot(foe.x - s.x, foe.y - 12 - (foe.alt || 0) - s.y) < 13) { s.done = true; vfx('fireboom', s.x, s.y + 2, { ky: foe.y + 0.5 }); hit(s.f, foe, s.mv); aoe(s.f, foe.x, foe.y, 14, 0.7); }
      else if (s.t > s.life) { s.done = true; vfx('fireboom', s.x, s.y + 2, { ky: s.y + s.h }); ground(s.x, s.y + s.h, SCORCH, 0.35); aoe(s.f, s.x, s.y + s.h, 14, 0.7); }
    } else if (s.kind === 'proj') {
      s.trail.unshift({ x: s.x, y: s.y }); if (s.trail.length > 16) s.trail.pop();   /* review7: vệt đuôi dài */
      s.x += s.vx * dt; s.y += s.vy * dt; const t = s.mv.type;
      if (!passShot(s.x, s.y + s.h)) { s.done = true; hitFx(t, s.x, s.y + s.h); aoe(s.f, s.x, s.y + s.h, 14, 0.6); continue; }
      if (!foe.dead && Math.hypot(foe.x - s.x, foe.y - 10 - (foe.alt || 0) - s.y) < 12) { s.done = true; hitFx(t, foe.x, foe.y); if (s.mv.pow) hit(s.f, foe, s.mv); else applyTT(s.f, foe, s.mv); aoe(s.f, foe.x, foe.y, 12, 0.6, { noObj: true }); }
      else if (s.t > s.life) { s.done = true; hitFx(t, s.x, s.y + s.h); }
    } else if (s.kind === 'p73') { if (P73.shot(s, foe, dt)) s.done = true;   /* p73 */
    } else if (s.kind === 'proj2' || s.kind === 'lob') { if (skShot(s, foe, dt)) s.done = true;   /* p57 */
    } else if (s.kind === 'strike') {
      const F0 = s.follow; if (F0 && !F0.dead && s.t < s.life - (s.lock || 0)) { const tl = s.life - s.t, q = { x: F0.x + (F0.vx || 0) * tl + (s.ox || 0), y: F0.y + (F0.vy || 0) * tl + (s.oy || 0) }; clampField(q); const kk = Math.min(1, dt * 16); s.x += (q.x - s.x) * kk; s.y += (q.y - s.y) * kk; }
      if (s.t >= s.life) { s.done = true; s.onLand(s); }
    } else if (s.kind === 'boulder') {
      s.h = Math.max(0, 170 * (1 - (s.t / s.life) ** 2)); if (s.t >= s.life) { s.done = true; s.onLand(s); }
    } else if (s.kind === 'meteor') {
      s.h = Math.max(0, 120 * (1 - s.t / s.life)); if (s.t >= s.life) { s.done = true; s.onLand(s); }
    }
  }
  ST.shots = ST.shots.filter(s => !s.done);
  for (const r of ST.runners) {
    const step = (r.sp || 170) * dt, rf = r.fx || 'nutdat'; r.x += r.vx * step; r.y += r.vy * step; r.len += step; r.step -= step; r.dec -= step;
    if (!passShot(r.x, r.y)) { aoe(r.f, r.x, r.y, 16, 1.0, { seen: r.seen }); r.len = r.max; vfx(rf, r.x, r.y + 2, { ky: r.y + 2 }); }
    if (r.step <= 0) { r.step = r.every || 14; const hh = r.h0 != null ? r.h0 + (r.h1 - r.h0) * Math.min(1, r.len / r.D) : 0, ky = r.vy < 0 && Math.abs(r.y - r.f.y) < 12 ? r.f.y - 0.5 : r.y + 2; vfx(rf, r.x, r.y + 2 - hh - (r.h0 != null ? 2 : 0), { ky }); if (!r.first) { r.first = { x: r.x, y: r.y - hh }; ST.lastOrigin = { sp: r.f.sp, kind: 'tia', ...r.first, mx: r.ox, my: r.oy }; } }   /* p53: luật 16/10 — lên thì sau lưng */
    if (r.dec <= 0 && !r.nodec) { r.dec = 60; ground(r.x, r.y + 1, CRACK, 0.85, 'small'); }
    r.seen = aoe(r.f, r.x, r.y, 14, 0.8, { seen: r.seen });
    const foe = foeOf(r.f); if (!r.hit && !foe.dead && Math.hypot(foe.x - r.x, foe.y - r.y) < 12) { r.hit = true; hit(r.f, foe, r.mv, { kb: 100 }); }
    if (r.len >= r.max) r.done = true;
  }
  if (ST.runners.some(r => r.done && !r.hit)) for (const r of ST.runners) if (r.done && !r.hit && !r.missed) { r.missed = true; }
  ST.runners = ST.runners.filter(r => !r.done);
  for (const t of ST.timers) { t.t -= dt; if (t.t <= 0 && !t.done) { t.done = true; try { t.fn(); } catch (e) { console.error('duel timer', e); } } }
  ST.timers = ST.timers.filter(t => !t.done);
}

/* ---------- vòng đời trận ---------- */
function tallAt(ctx, x, y, r) {   /* có cây / vật cao (ảnh cao ≥ 20 px logic) hoặc ô cứng trong bán kính r quanh (x, y) */
  const m = ctx.S.map; let n = 0;
  for (const o of m.objects) { if (o.ruined) continue; const d = ctx.O[o.type]; if (!d || d.h < 20) continue; const bx = o.x * 16 + (d.ox || 0), by = (o.y + d.fh) * 16;   /* cả vùng ảnh vật (đứng SAU cây cũng tính) */
    if (x > bx - r && x < bx + d.w + r && y > by - d.h - r && y < by + r) n++; }
  return n;
}
function openScore(ctx, x, y) {   /* điểm thoáng: càng cao càng tốt */
  const m = ctx.S.map, tx = x / 16, ty = y / 16; if (!walkable(x, y)) return -99;
  let sc = -tallAt(ctx, x, y, 32) * 2; for (let a = 0; a < 8; a++) { const ex = x + Math.cos(a * Math.PI / 4) * 24, ey = y + Math.sin(a * Math.PI / 4) * 24; if (!walkable(ex, ey)) sc -= 0.6; }
  const e = Math.min(tx, m.w - tx, ty, m.h - ty); if (e < 4) sc -= (4 - e) * 1.5; return sc;
}
function occludedBy(ctx, f) {   /* phần thân thú bị vật cao vẽ ĐÈ (đáy vật thấp hơn chân thú) che bao nhiêu (0–1) */
  const m = ctx.S.map, x0 = f.x - 11, x1 = f.x + 11, y0 = f.y - 26, y1 = f.y, A = (x1 - x0) * (y1 - y0); let cov = 0;
  for (const o of m.objects) { if (o.ruined) continue; const d = ctx.O[o.type]; if (!d || d.h < 20) continue; const bx = o.x * 16 + (d.ox || 0), by = (o.y + d.fh) * 16; if (by <= f.y) continue;
    const ix = Math.max(0, Math.min(x1, bx + d.w) - Math.max(x0, bx)), iy = Math.max(0, Math.min(y1, by) - Math.max(y0, by - d.h)); cov += ix * iy; }
  return Math.min(1, cov / A);
}
function occl(ctx, dt) {
  if ((ST.occT = (ST.occT || 0) - dt) > 0) return; ST.occT = 0.2;
  for (const f of ST.F) { f.occ = f.dead ? 0 : occludedBy(ctx, f); ST.stats.occN = (ST.stats.occN || 0) + 1; if (f.occ > 0.4) ST.stats.occHi = (ST.stats.occHi || 0) + 1;
    if (f.occ > 0.25 && !f.relocate) { let best = null; for (let r = 1; r <= 6; r++) for (let a = 0; a < 12; a++) { const x = f.x + Math.cos(a / 12 * Math.PI * 2) * r * 16, y = f.y + Math.sin(a / 12 * Math.PI * 2) * r * 16; const sc = openScore(ctx, x, y); if (sc < -3) continue; const o = occludedBy(ctx, { x, y }); if (o > 0.15) continue; const v = sc - r * 0.4; if (!best || v > best.v) best = { x, y, v }; }
      if (best) f.relocate = { x: best.x, y: best.y, t: 2 }; } }
}
function nearWalk(ctx, x, y) {   /* ô đi được gần nhất (đủ chỗ cho thân thú) */
  for (let r = 0; r < 10; r++) for (let a = 0; a < 16; a++) {
    const px = x + Math.cos(a / 16 * Math.PI * 2) * r * 12, py = y + Math.sin(a / 16 * Math.PI * 2) * r * 12;
    if (!walkable(px, py) || !walkable(px - 7, py) || !walkable(px + 7, py) || !walkable(px, py - 4) || !walkable(px, py + 3)) continue; return { x: px, y: py };
  }
  return { x, y };
}
function terrainOf(ctx) {   /* địa hình quanh 2 thú (bán kính ~7 ô) → sức hệ (luật Cóc: hệ Nước mạnh khi có nước) */
  const m = ctx.S.map, [a, b] = ST.F, cx = a && b ? (a.x + b.x) / 2 : ctx.S.player.x, cy = a && b ? (a.y + b.y) / 2 : ctx.S.player.y, R = 144, c = { water: 0, grass: 0, lava: 0, earth: 0, n: 0 };
  for (let y = -R; y <= R; y += 16) for (let x = -R; x <= R; x += 16) {
    if (x * x + y * y > R * R) continue; const t = ctx.getG(m, Math.floor((cx + x) / 16), Math.floor((cy + y) / 16)); c.n++;
    if (t === T.WATER || t === T.DEEP || t === T.REEF) c.water++; else if (t === T.GRASS || t === T.GRASS2 || t === T.FLOWER || t === T.MOSS) c.grass++;
    else if (t === T.LAVA || t === T.ASH) c.lava++; else c.earth++;
  }
  const k = c.lava / c.n >= 0.06 ? 'lava' : c.water / c.n >= 0.06 ? 'water' : c.grass / c.n >= 0.4 ? 'grass' : 'earth';
  const MUL = { water: { trieu: 1.2, nham: 0.85 }, grass: { moc: 1.2 }, lava: { nham: 1.2, suong: 0.85 }, earth: { chan: 1.1 } }[k];
  return { k, mul: MUL, counts: c };
}
const TERR_NAME = { vi: { water: 'Gần nước', grass: 'Bãi cỏ', lava: 'Dung nham', earth: 'Đất đá' }, en: { water: 'Waterside', grass: 'Grassland', lava: 'Lava', earth: 'Rock & dirt' } };
function startBattle(ctx, opts = {}) { reset84();   /* p84 */   /* bắt đầu NGAY TẠI CHỖ: thú mình nhảy ra trước mặt người chơi, thú đối thủ trước mặt huấn luyện viên */
  const p = ctx.S.player; ST.wild = opts.wild || null; const foeNpc = ST.wild ? null : (opts.foe || ST.foe); ST.foe = foeNpc; ST.inField = ctx.S.zone.id === 'duel_field'; ST.catch = null; ST.wildDazed = false; ST.catchRes = null; catchBtn(null);   /* plan-58 C.2 */
  if (foeNpc) { foeNpc.busy = true; foeNpc.goal = null; foeNpc.path = null; foeNpc.moving = false; foeNpc.dir = Math.abs(p.x - foeNpc.x) > Math.abs(p.y - foeNpc.y) ? (p.x < foeNpc.x ? 1 : 2) : (p.y < foeNpc.y ? 3 : 0); }
  const anc = foeNpc || (ST.wild && (opts.wildAt || ctx.S.map.duelFoe)) || null, fx0 = anc ? anc.x : p.x, fy0 = anc ? anc.y : p.y - 80, dx = fx0 - p.x, dy = fy0 - p.y, d = Math.hypot(dx, dy) || 1, ux = dx / d, uy = dy / d, gap = ctx.S.zone.id === 'duel_field' ? Math.min(Math.max(90, (ctx.VW || 320) - 120), 260, d * 0.7) : Math.max(48, Math.min(90, d * 0.8));   /* p54: sân rộng — 2 thú mở màn cách xa */
  const mx = (p.x + fx0) / 2, my = (p.y + fy0) / 2;
  const openNear = (x, y) => { let best = null; for (let r = 0; r <= 5; r++) for (let a = 0; a < (r ? 12 : 1); a++) { const qx = x + Math.cos(a / 12 * Math.PI * 2) * r * 16, qy = y + Math.sin(a / 12 * Math.PI * 2) * r * 16; const v = openScore(ctx, qx, qy) - r * 0.3; if (!best || v > best.v) best = { x: qx, y: qy, v }; } return best ? nearWalk(ctx, best.x, best.y) : nearWalk(ctx, x, y); };
  const DF = opts.field === 'leader_arena' && ctx.S.map.duelField, s0 = DF ? nearWalk(ctx, DF.x - 56, DF.y + 6) : openNear(mx - ux * gap / 2, my - uy * gap / 2), s1 = DF ? nearWalk(ctx, DF.x + 56, DF.y - 6) : openNear(mx + ux * gap / 2, my + uy * gap / 2);   /* p81: sàn Leader — giữa sân cỏ */
  const lv = opts.lv || 20; makeTeams(opts, lv, s0, s1); if (ST.wild) { const w = ST.F[1]; if (opts.wildAt && !ST.inField) { const q = nearWalk(ctx, opts.wildAt.x, opts.wildAt.y); w.x = q.x; w.y = q.y; ST.spawn[1] = { x: q.x, y: q.y }; const pp = ctx.S.player, dx = pp.x - q.x, dy = pp.y - q.y, dl = Math.hypot(dx, dy) || 1, s = nearWalk(ctx, q.x + dx / dl * 60 - dy / dl * 22, q.y + dy / dl * 60 + dx / dl * 22); ST.spawn[0] = { x: s.x, y: s.y }; for (const f of ST.team[0]) { f.x = s.x; f.y = s.y; } }   /* thú mình cách thú hoang ~60 px, lệch khỏi chỗ người chơi (không đứng chồng lên người) */ w.absent = false; w.hidden = false; face(w, s0.x, s0.y); }   /* p79: thú hoang đứng ĐÚNG chỗ nó đang ở trên map */   /* thú hoang đã đứng sẵn trên sân */   /* plan-58: đội nhiều thú (1v1 = đội 1 con) — mọi con ẩn tới khi được ném Ấn Chấn ra */
  ST.fx = []; ST.gfx = []; ST.decals = []; ST.shots = []; ST.runners = []; ST.timers = []; ST.waves = []; ST.scars = []; ST.trenches = []; ST.ko = null; ST.zCur = 1; ST.zHold = 0; ST.texts = []; ST.calls = [null, null]; ST.cb85 = [null, null]; ST.cb85Log = []; ST.imp85N = 0; ST.bub85R = [null, null];   /* p85 */ ST.log = []; ST.cut = null; ST.end = null; ST.weather = null; ST.knocks = ST.knocks || [];
  ST.clash = null; ST.zoomOn = null; ST.camZoomT = 0; ST.zones = []; ST.beams2 = []; ST.skLog = []; DFX.clear(); P73.reset(); P78.reset(); ST.warmQ = 0; ST.noVfx = 0;   /* p52e */
  ST.t = 0; ST.ph = 'intro'; ST.introT = 0; ST.on = true; ST.stats = { acts: {}, hits: 0 }; ST.hitstop = 0; ST.imp = null; ST.impLast = -99; ST.impLog = []; ST.warn = null; ST.warnLog = []; ST.dimA = 0; ST.dimOn = false; ST.dimLog = []; ST.flashW = 0; ST.slowOn = false; ST.opts = opts; ST.terr = terrainOf(ctx); ST.terrT = 2;
  /* plan-58: bụi mở màn chuyển sang lúc Ấn Chấn rơi / bung */
  ctx.S.camZoomUI = !!ST.inField;   /* review7: camera gần (camZoom) mà lớp UI vẫn vẽ mỗi khung — main.js bản nháp */
  ctx.setMode(ST.inField ? 'duel' : 'play'); hidePanel(); showMoves(ctx, true); hideAsk(); zoom(ctx, true);   /* sân tạm: người chơi đứng xem ở đầu sân (không đi vào) */
  camCut(ctx);   /* plan-52 #10: đổi thú (trận mới / đấu lại) = cắt cứng */
}
function zoom(ctx, on) {   /* chỉ trong trận: máy tính (khung ngang) phóng thêm 1 bậc pixel nguyên (nét vẫn sắc) nếu vẫn thấy trọn vòng sân */
  const S = ctx.S;
  if (on ? ST.inField : ST.zoomed === 'wide') {   /* p54 SÂN RỘNG (video fan-game): bớt bậc pixel nguyên (main.js S.zoomOut = k: scale − hi·k, ≥ 2, khung ≤ 760 px) tới bậc nhỏ nhất thấy trọn sân 640 px; không bậc nào thì giữ gốc */
    const fire = () => { try { window.dispatchEvent(new Event('resize')); } catch (e) { } };
    if (!on) { ST.zoomed = false; S.zoomOut = 0; fire(); return; }
    if (S.zoomOut) return; let best = 0, bw = ctx.VW || 0; const tried = [];
    for (let k = 1; k <= 3; k++) { S.zoomOut = k; fire(); tried.push([k, ctx.VW, ctx.VH]); if ((ctx.VW || 0) > bw + 1) { best = k; bw = ctx.VW; if (bw >= FW * 16 - 40) break; } }
    S.zoomOut = best; fire(); ST.zoomed = best ? 'wide' : false; ST.wideTry = tried; return;
  }
  if (on) { if (S.zoomOut) return; const sc = ctx.scale || 3, hi = ART.hi || 1, vw = (ctx.VW || 320) * sc / (sc + hi), vh = (ctx.VH || 200) * sc / (sc + hi);
    if (vw < 300 || vh < 190) return; S.zoomOut = -1; ST.zoomed = true; }
  else { if (!ST.zoomed) return; ST.zoomed = false; if (S.zoomOut === -1) S.zoomOut = 0; }
  try { window.dispatchEvent(new Event('resize')); } catch (e) { }
}
function endBattle(ctx) {   /* xong trận: vòng biến mất, trả dân / huấn luyện viên / Rocky / điều khiển */
  ST.on = false; ST.ph = 'off'; ST.catch = null; catchBtn(null); ST.orbs = []; ST.streaks = []; ST.fxo = []; ST.sw = [null, null]; ST.sendQ = null; ST.team = [[], []]; ST.multi = false; ST.teamRects = []; ST.waves = []; ST.scars = []; ST.trenches = []; ST.ko = null; ST.F = []; ST.fx = []; ST.gfx = []; ST.decals = []; ST.shots = []; ST.runners = []; ST.timers = []; ST.texts = [];
  for (const k of ST.knocks || []) k.n.busy = k.busy; ST.knocks = []; unwrapAll();

  if (ST.foe) { ST.foe.busy = true; ST.foe.dir = 0; }
  showMoves(ctx, false); hidePanel(); zoom(ctx, false); ctx.S.camZoomUI = false; ctx.S.camZoomSnap = false; ctx.S.camDX = 0; ctx.S.camDY = 0; ctx.S.camZoom = 1; ctx.S.camFocus = null; if (ctx.S.mode !== 'play') ctx.setMode('play');
  if (ctx.S.zone.id === 'duel_field') leaveField(ctx);
}
function endPanel(ctx) {
  const t = L(ctx); let el = document.getElementById('ld-end');
  if (!el) { el = document.createElement('div'); el.id = 'ld-end'; document.body.appendChild(el); }
  el.innerHTML = (ST.wild ? '' : `<button data-a="again">↻ ${t.again}</button>`) + `<button data-a="leave">✓ ${t.done}</button>`; el.hidden = false;   /* thú hoang: không đấu lại */
  el.onclick = e => { const b = e.target.closest('button'); if (!b) return; if (b.dataset.a === 'again') startBattle(ctx, { ...(ST.opts || {}) }); else endBattle(ctx); };
}
/* hỏi xác nhận thách đấu */
function ask(ctx, npc) {
  css(); const t = L(ctx); let el = document.getElementById('ld-ask');
  if (!el) { el = document.createElement('div'); el.id = 'ld-ask'; document.body.appendChild(el); }
  const nm = npc && npc.m ? (npc.m.k || npc.m.n) : 'NPC';
  const pr = ST.pair || DEF_SP, my = myLead(ctx), ut = urlTeam(); if (my && !ut.urlMy) delete ut.team; el.innerHTML = `<div>${t.askQ(nm, my ? my.name || spName(ctx, my.sp) : spName(ctx, pr[0]), spName(ctx, pr[1]))}</div><div class="r"><button data-a="y">✓ ${t.yes}</button><button data-a="n">✕ ${t.no}</button></div>`; el.hidden = false;
  ST.asking = npc; ctx.setMode('duelask'); ctx.registerCloser('duelask', () => { hideAsk(); ctx.setMode('play'); });
  el.onclick = e => { const b = e.target.closest('button'); if (!b) return; if (b.dataset.a === 'y') startDuel(ctx, { foe: npc, ...myOpts(ctx), ...ut });   /* p52d: có đội trong save → đội save (link ?team= chỉ đổi thể thức + đội đối thủ) */ else { hideAsk(); ctx.setMode('play'); } };
}
function urlTeam() {   /* p58 + p67b: link thử trên điện thoại ?team=1v1|3v3|6v6&my=a,b,c&foe=d,e,f (loài có bộ chiêu; thiếu thì bù) */
  let q = null; try { q = new URLSearchParams(location.search); } catch (e) { /* noop */ } if (!q) return {};
  const m = q.get('team'), pick = k => (q.get(k) || '').split(',').map(s => s.trim()).filter(s => SPECIES[s] && LOAD[s]), my = pick('my'), foe = pick('foe'), N = m === '6v6' ? 6 : m === '3v3' ? 3 : 1;
  if (m === '3v3' && !my.length && !foe.length) return { team: ['golem', 'bachkinh', 'loiho'], foeTeam: ['rongdo', 'vitbao', 'diepnhan'], mode: '3v3' };
  const o = {}; if (m === '3v3' || m === '6v6') o.mode = m; if (my.length) { o.team = my.slice(0, N); o.urlMy = 1; } if (foe.length) o.foeTeam = foe.slice(0, N); P78url(q, o); return o; }
function myLead(ctx) { const T0 = saveTeam(ctx); return T0.length ? T0[0] : null; }   /* p72: con đầu đội gộp (Chấn Thú + linh thú) */   /* plan-58 C.2: con đầu đội trong save */
function saveTeam(ctx) { const ct = ctTeam(ctx), lt = ltTeam(ctx); let out = (lt.length && (!ct.length || (ctx.linhthu && ctx.linhthu.isOut && ctx.linhthu.isOut()))) ? lt.concat(ct) : ct.concat(lt); return out.slice(0, 6); }   /* p72 */
function ctTeam(ctx) { try { const T0 = ctx.chanthu && ctx.chanthu.team(); return (T0 || []).filter(m => m && SPECIES[m.sp] && LOAD[m.sp]).slice(0, 6).map(m => ({ sp: m.sp, lv: m.lv, name: m.name, mv: m.mv || null, ult: m.ult || null })); } catch (e) { return []; } }   /* p52d: đội của người chơi theo thứ tự bảng Đội (bệ Làng) */
function myOpts(ctx) { const m = myLead(ctx); return m ? { myTeam: saveTeam(ctx), lv: m.lv } : {}; }   /* p52d: normOpts cắt đội theo thể thức (1v1 = con đầu) */
function hideAsk() { const el = document.getElementById('ld-ask'); if (el) el.hidden = true; ST.asking = null; }
function askKey(code, ctx) {
  if (ctx.S.mode !== 'duelask' || !ST.asking) return false;
  if (code === 'KeyE' || code === 'Enter' || code === 'Space' || code === 'KeyY') { const n = ST.asking, ut = urlTeam(); if (myLead(ctx) && !ut.urlMy) delete ut.team; startDuel(ctx, { foe: n, ...myOpts(ctx), ...ut }); return true; }   /* p72: phím E như nút Đồng ý — có đội trong save thì link ?team= chỉ đổi thể thức (trước: đội mặc định đè đội của mình) */
  if (code === 'KeyN') { hideAsk(); ctx.setMode('play'); return true; }
  return false;
}
function hidePanel() { const el = document.getElementById('ld-end'); if (el) el.hidden = true; }

/* ---------- nút chiêu (DOM, cả máy tính lẫn điện thoại) ---------- */
function css() {
  if (document.getElementById('ld-css')) return; const s = document.createElement('style'); s.id = 'ld-css';
  s.textContent = `body.ld-on #hud,body.ld-on #herobar,body.ld-on #lt-orb,body.ld-on #px-clock,body.ld-on #px-status,body.ld-on #px-money,body.ld-on #seis,body.ld-on #rk-chat,body.ld-on #altw{display:none!important}
#ld-moves{position:fixed;left:50%;transform:translateX(-50%);bottom:10px;display:flex;gap:6px;z-index:40;font-family:VT323,monospace;pointer-events:auto}
#ld-moves button{position:relative;overflow:hidden;min-width:112px;padding:5px 10px 5px 30px;border-radius:9px;border:2px solid var(--c);background:rgba(20,16,28,.86);color:#f5ecdc;font:20px VT323,monospace;text-align:left;text-shadow:1px 1px 0 #000;cursor:pointer;touch-action:manipulation}
#ld-moves button b{position:absolute;left:7px;top:50%;transform:translateY(-50%);width:17px;height:17px;border-radius:50%;background:var(--c);color:#1a1420;font-size:16px;line-height:17px;text-align:center;text-shadow:none}
#ld-moves button img{position:absolute;left:5px;top:50%;transform:translateY(-50%);width:20px;height:20px;image-rendering:pixelated}
#ld-moves button i{position:absolute;left:0;right:0;bottom:0;background:rgba(0,0,0,.62);pointer-events:none}
#ld-moves button u{position:absolute;right:6px;top:2px;font-size:15px;text-decoration:none;color:#cfc4b4}
#ld-moves button.ult{border-color:#ffd45e;box-shadow:0 0 0 1px #6a4a10 inset}
#ld-moves button.q{background:rgba(70,52,20,.92)}
#ld-moves button.off{opacity:.55}
#ld-end{position:fixed;left:50%;top:62%;transform:translateX(-50%);display:flex;gap:10px;z-index:41}
#ld-end button{font:24px VT323,monospace;padding:6px 16px;border-radius:9px;border:2px solid #ffd45e;background:rgba(20,16,28,.9);color:#ffe9b0;cursor:pointer}
#ld-ask{position:fixed;left:50%;top:58%;transform:translateX(-50%);z-index:42;background:rgba(20,16,28,.94);border:2px solid #ffd45e;border-radius:12px;padding:10px 16px;color:#f5ecdc;font:22px VT323,monospace;text-align:center;max-width:min(92vw,460px)}#ld-ask b{color:#ffd45e}#ld-ask .r{display:flex;gap:10px;justify-content:center;margin-top:8px}#ld-ask button{font:22px VT323,monospace;padding:5px 16px;border-radius:9px;border:2px solid #ffd45e;background:#2a2234;color:#ffe9b0;cursor:pointer}
#ld-catch{position:fixed;left:50%;bottom:14px;transform:translateX(-50%);z-index:41;display:flex;align-items:center;gap:6px;font:22px VT323,monospace;padding:4px 14px 4px 8px;border-radius:10px;border:2px solid #ffd45e;background:rgba(20,16,28,.9);color:#ffe9b0;cursor:pointer;touch-action:manipulation;animation:ldc .25s ease-out}#ld-catch img{width:28px;height:28px;image-rendering:pixelated}#ld-catch.off{opacity:.5;border-color:#8a7a5a}@keyframes ldc{from{transform:translate(-50%,12px);opacity:0}}
@media (pointer:coarse){#ld-moves{bottom:12px;gap:5px;flex-wrap:wrap;justify-content:center;width:min(96vw,520px)}#ld-moves button{min-width:0;flex:1 1 44%;font-size:21px;padding:9px 6px 9px 30px}#ld-moves button b{display:none}}`;
  document.head.appendChild(s);
}
function showMoves(ctx, on) { css(); document.body.classList.toggle('ld-on', !!on); const el = document.getElementById('ld-moves'); if (el) el.remove(); }   /* anh: người chơi không điều khiển chiêu — không còn nút */
function syncMoves() { }
function order(i) {
  const f = ST.F[0]; if (!f || ST.ph !== 'fight' || f.dead) return; const id = MV78(f)[i]; if (!id) return;
  if ((f.cds[id] || 0) > 0) return; f.queued = id; ST.log.push({ t: +ST.t.toFixed(1), side: 0, order: id });
}

/* ---------- vẽ ---------- */
function rowOf(c, f) {   /* hàng theo hướng nhìn (8 hướng; W = lật E) */
  const ax = Math.abs(f.fx), rows = c.rows; let d, flip = f.fx < -0.05;
  if (f.fy > 0.38 && ax < 0.92) d = ax > 0.38 ? 'south-east' : 'south';
  else if (f.fy < -0.38 && ax < 0.92) d = ax > 0.38 ? 'north-east' : 'north';
  else d = 'east';
  let r = rows.indexOf(d);
  if (r < 0) { d = d === 'south-east' ? (ax > 0.6 ? 'east' : 'south') : d === 'north-east' ? (ax > 0.6 ? 'east' : 'north') : d; r = rows.indexOf(d); }
  if (r < 0) r = 0; if (d === 'south' || d === 'north') flip = false;
  return { r, flip };
}
function mouthOf(f, clip) {   /* điểm miệng / tay theo hướng đang vẽ (cùng hàng / lật như drawFighter); clip: tư thế đang vẽ (mặc định f.clip) */
  const S0 = SPR && SPR[f.sp], cl = clip || f.clip, c = S0 && (S0[cl] || S0.spit || S0.idle), T0 = MOUTH[f.sp];
  if (!c || !T0) return { x: f.x + f.fx * 9, y: f.y - 9 + f.fy * 3 };
  const { r, flip } = rowOf(c, f), d = c.rows[r] || 'south', TC = (T0._c && T0._c[cl]) || T0, o = TC[d] || T0[d] || T0.south; return { x: f.x + (flip ? -o[0] : o[0]), y: f.y + o[1] - (f.alt || 0) };
}
function recoilOf(f) {   /* p52f: gồng — thân lùi 1–2 px ngược hướng đánh rồi bật tới 1 px lúc tung chiêu (chỉ khi vẽ, không đổi vị trí thật) */
  const a = f.act; if (!DFX.CODE || !a || !a.clip || f.dead || a.pierce || a.breath || a.dash || a.dash2) return 0; const T0 = impactT(a.clip), s = (f.fx || 1) >= 0 ? 1 : -1;
  if (a.t < T0) { const k = a.t / T0; return -s * (k < 0.35 ? (k > 0.12 ? 1 : 0) : 2); } return a.t < T0 + 0.1 ? s : 0; }
function drawFighter(g, f, cx, cy, sil, toss) {
  const S0 = SPR && SPR[f.sp]; if (!S0) return; const c = S0[f.clip] || S0.idle, im = img(c.file); if (!im) return;
  const loop = f.clip === 'idle' || f.clip === 'run' || f.clip === 'fly' || f.clip === 'flymove';
  let fr = Math.floor(f.ct * (c.fps || FPS[f.clip]));   /* p64: clip fps rieng (duel_sprites.json) */ fr = loop ? fr % c.n : Math.min(c.n - 1, fr);
  const { r, flip } = rowOf(c, f), sw = c.cw, sh = c.ch, w = sw / 2, h = sh / 2, ax = c.ax / 2, ay = c.ay / 2;
  const tz = toss > 0 ? Math.round(Math.sin(Math.PI * (1 - toss / (f.tossT || 0.5))) * (f.tossH || 22)) : 0;   /* hất tung khi bị trồi lên dưới chân */
  const rc = recoilOf(f) + hurtDX(f), x = (globalThis.__R89||Math.round)(f.x - cx) + rc, y = (globalThis.__R89||Math.round)(f.y - (f.alt || 0) - tz - hurtDY(f) - cy), src = sil ? darkOf(im) : f.flash > 0 ? whiteOf(im) : im;
  const one = s2 => { if (flip) { g.save(); g.translate(x, y); g.scale(-1, 1); g.drawImage(s2, fr * sw, r * sh, sw, sh, -ax, -ay, w, h); g.restore(); } else g.drawImage(s2, fr * sw, r * sh, sw, sh, x - ax, y - ay, w, h); };
  if (!sil && !toss && !((f.alt || 0) > 1) && WATER105.depth) waterDraw105(g, f.x, f.y, x, (globalThis.__R89||Math.round)(f.y - cy), () => one(src)); else one(src);   /* p105w: đứng trong nước → che phần dưới + mép nước (như Rocky, luật Cóc 15/10) */
  if (!sil && f.decoy) decoyDraw(g, f, src, fr, r, sw, sh, w, h, ax, ay, x, y, flip);   /* p72 */
  if (!sil && f.status && f.status.id === 'dong') { g.save(); g.globalAlpha = 0.5; one(colorOf(im, '#bfefff')); g.restore(); }   /* p49c: phủ màu băng khi đóng băng */
  if (!sil && !(f.flash > 0) && f.tint > 0) { g.save(); g.globalAlpha = 0.3 * Math.min(1, f.tint / 0.08); one(tintOf(im)); g.restore(); }   /* nhịp lửa giữa: ánh đỏ cam nhẹ thay vì chớp trắng */
}
const TINT = new Map();
function tintOf(im) {
  let c = TINT.get(im); if (c) return c;
  c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight; const x = c.getContext('2d');
  x.drawImage(im, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = '#ff7a3a'; x.fillRect(0, 0, c.width, c.height); TINT.set(im, c); return c;
}
function dashDir(f) {   /* đang lao / bị hất bay / né / áp sát → hướng chuyển động (để vẽ tia tốc độ phía sau) */
  if (f.dead) return null; const a = f.act;
  if (f.kb && f.kb.fly) return [f.kb.vx, f.kb.vy];
  if (a && (a.id === 'lao_lua' || a.id === 'lao' || a.mv.p84d) && a.dash && !a.fired) return [f.fx, f.fy];
  if (a && a.id === 'huc' && a.t < impactT(a.clip)) return [f.fx, f.fy];
  if (f.dodge && f.dodge.delay <= 0) return [f.dodge.vx, f.dodge.vy];
  return null;
}
function drawDash(g, f, d, cx, cy) {
  const m = VFXM && VFXM.dashlines, im = m && img(m.file); if (!im) return; const fr = Math.floor(ST.t * m.fps) % m.n, sw = im.naturalWidth / m.n;
  const left = d[0] < -0.05 || (Math.abs(d[0]) <= 0.05 && f.fx < 0), hy = (globalThis.__R89||Math.round)(f.y - (f.alt || 0) - Math.max(6, standH(f) * 0.45) - cy), x = (globalThis.__R89||Math.round)(f.x - cx);
  g.save(); g.translate(x, hy); if (left) g.scale(-1, 1);
  for (const oy of [0, 0.5]) { g.drawImage(im, fr * sw, 0, sw, im.naturalHeight, -m.ax - 4, -m.ay + oy, m.w, m.h); g.globalAlpha = 0.8; g.drawImage(im, ((fr + 3) % m.n) * sw, 0, sw, im.naturalHeight, -m.ax - 9, -m.ay - 5 + oy, m.w, m.h); g.globalAlpha = 1; }   /* nét đôi (0,5 px logic) cho dày, rõ */
  g.restore();
}

/* ===== p85 = plan-84 đợt 4 (anh 02/11): bong bóng tên chiêu 2 góc trên · impact frame 1 khung · chữ combo ===== */
const Q85 = (() => { try { return new URLSearchParams(location.search); } catch (e) { return null; } })();
const BUB85 = () => !(Q85 && Q85.get('bub85') === '0'), IMP85 = () => !(Q85 && Q85.get('impact85') === '0');
const IMP85_T = 0.042, IMP85_GAP = 8,   /* 02/11 em tự sửa: chỉ tuyệt chiêu / chí mạng / va chạm tia, ≥ 8 s (bản đầu tính cả đòn hất bay → 7 lần / 40 s, phủ kín màn, dễ nhức mắt) */ BUB85_T = 1.4, BUB85_TU = 1.6, CB85_GAP = 1.2;
/* ui/bubble.png 48×48: thân x5..42 · y5..38 (viền 1 px tối + 5 px kem), đuôi y39..42 ở x9..16 → 9 mảnh: trên / giữa 6 px mỗi bên; hàng đáy cao 10 (gồm đuôi), mảnh đáy trái rộng 13 */
function bubFrame85(ug, im, x, y, w, h, s, flip) {
  ug.save(); ug.translate(Math.round(x + (flip ? w : 0)), Math.round(y)); if (flip) ug.scale(-1, 1);
  const d = (sx, sy, sw, sh, dx, dy, dw, dh) => { if (dw > 0 && dh > 0) ug.drawImage(im, sx, sy, sw, sh, dx, dy, dw, dh); };
  const L = 6 * s, R = 6 * s, T = 6 * s, BL = 13 * s, BH = 10 * s, mh = h - T - 6 * s;
  d(5, 5, 6, 6, 0, 0, L, T); d(11, 5, 26, 6, L, 0, w - L - R, T); d(37, 5, 6, 6, w - R, 0, R, T);
  d(5, 11, 6, 22, 0, T, L, mh); d(11, 11, 26, 22, L, T, w - L - R, mh); d(37, 11, 6, 22, w - R, T, R, mh);
  d(5, 33, 13, 10, 0, T + mh, BL, BH); d(18, 33, 19, 10, BL, T + mh, w - BL - R, BH); d(37, 33, 6, 10, w - R, T + mh, R, BH);
  ug.restore();
}
function bub85(ug, ctx, side, y, W, u) {   /* bong bóng trắng chữ đen nghiêng (như video), khung pixel ui/bubble.png; trả true = đã lo phần vẽ */
  if (!BUB85()) return false; const im = img('ui/bubble.png'); if (!im) return false;
  const c = ST.calls[side], T = c && c.ult ? BUB85_TU : BUB85_T; ST.bub85R = ST.bub85R || [null, null];
  if (!c || c.t > T) { ST.bub85R[side] = null; return true; }
  const right = side === 1, pad = Math.round(u * 1.6), maxW = W / 2 - pad * 1.5; let fs = Math.round(u * (c.ult ? 5.2 : 4.4));
  ug.save(); ug.imageSmoothingEnabled = false; const font = q => `bold italic ${q}px VT323, monospace`; ug.font = font(fs);
  let s = Math.max(2, Math.round(fs / 9)), tw = ug.measureText(c.s).width, bw = Math.ceil(tw + 14 * s);
  while (bw > maxW && fs > 12) { fs--; ug.font = font(fs); s = Math.max(2, Math.round(fs / 9)); tw = ug.measureText(c.s).width; bw = Math.ceil(tw + 14 * s); }
  const bh = Math.max(14 * s, Math.round(fs * 0.95) + 7 * s), k = Math.min(1, c.t / 0.1), out = c.t > T - 0.2 ? (c.t - (T - 0.2)) / 0.2 : 0;
  const sl = Math.round((1 - k) * (1 - k) * 40), x = right ? W - pad - bw + sl : pad - sl; ug.globalAlpha = Math.max(0, 1 - out);
  bubFrame85(ug, im, x, y, bw, bh, s, right);
  const col = TYPE_COLOR[c.type] || '#9a8a70';
  if (c.ult) { ug.fillStyle = col; const i = 2 * s; ug.fillRect(x + i, y + i, bw - 2 * i, s); ug.fillRect(x + i, y + bh - i - s, bw - 2 * i, s); ug.fillRect(x + i, y + i, s, bh - 2 * i); ug.fillRect(x + bw - i - s, y + i, s, bh - 2 * i); }   /* tuyệt chiêu: viền trong màu hệ */
  else { ug.fillStyle = col; ug.fillRect(right ? x + bw - 4 * s : x + 3 * s, y + 3 * s, s, bh - 6 * s); }   /* chiêu thường: vạch màu hệ */
  ug.textAlign = 'center'; ug.textBaseline = 'middle'; const tx = x + bw / 2 + (c.ult ? 0 : right ? -s / 2 : s / 2), ty = y + bh / 2 + 1;
  if (c.ult) { ug.lineWidth = Math.max(2, Math.round(fs / 7)); ug.lineJoin = 'round'; ug.strokeStyle = col; ug.strokeText(c.s, tx, ty); }
  ug.fillStyle = '#1e1622'; ug.fillText(c.s, tx, ty); ug.restore();
  ST.bub85R[side] = { x: Math.round(x), y: Math.round(y), w: bw, h: bh + 4 * s, fs, W, s: c.s, ult: !!c.ult, t: +c.t.toFixed(2) };
  return true;
}
function drawImp85(ug, ctx, cx, cy, scale, W, H, K) {   /* 1 khung manga: nền 1 màu + tia tốc độ vẽ code (lưới px logic, tâm = thú trúng đòn, chừa khoảng trống giữa) + 2 bóng thú */
  const inv = K.kind === 'B', bg = inv ? '#140e1a' : '#f4ecd8', ln = inv ? '#f4ecd8' : '#140e1a';
  const zv = ctx.zoomView && ctx.zoomView(), px = Math.max(1, Math.round((globalThis.__u89?globalThis.__u89(scale):scale) * (zv ? zv.z : 1))), lw = Math.ceil(W / px), lh = Math.ceil(H / px);
  if (!K.c85) { const c = document.createElement('canvas'); c.width = lw; c.height = lh; const g = c.getContext('2d'); g.fillStyle = bg; g.fillRect(0, 0, lw, lh); g.fillStyle = ln;
    const [fx, fy] = toUI(ctx, K.f.x, K.f.y - standH(K.f) * 0.5, cx, cy, scale), ox = fx / px, oy = fy / px, Rm = Math.hypot(lw, lh), R0 = Math.min(lw, lh) * 0.2;
    let sd = (Math.floor(K.t0 * 1000) % 9973) + 7; const rr = () => { sd = (sd * 16807) % 2147483647; return sd / 2147483647; };
    const N = 40; for (let i = 0; i < N; i++) { const an = (i + rr() * 0.7) / N * Math.PI * 2, ca = Math.cos(an), sa = Math.sin(an), r0 = R0 * (1 + rr() * 0.9), w0 = 1 + Math.floor(rr() * 3);
      for (let r = r0; r < Rm; r += 0.7) { const q = (r - r0) / (Rm - r0), w = Math.max(1, Math.round(q * w0 * 2.6)), x = Math.round(ox + ca * r - w / 2), y = Math.round(oy + sa * r - w / 2); if (x > lw || y > lh || x + w < 0 || y + w < 0) { if (r > Rm * 0.2) break; continue; } g.fillRect(x, y, w, w); } }
    K.c85 = c; ST.imp85N = (ST.imp85N | 0) + 1; }
  ug.save(); ug.imageSmoothingEnabled = false; ug.drawImage(K.c85, 0, 0, K.c85.width * px, K.c85.height * px); ug.restore();
  drawSilFrame(ug, ctx, cx, cy, scale, W, H, K, false, inv);
}
function combo85(att, def, o) {   /* cùng 1 bên trúng liên tiếp cùng đối thủ (mỗi nhát cách ≤ 1,2 s) → 'n HITS!' cạnh thú bị đánh; nhịp giữa của luồng phun (noFlash) không đếm */
  if (o && o.noFlash) return; const C = ST.cb85 = ST.cb85 || [null, null], c = C[att.side];
  if (c && c.def === def && ST.t - c.t <= CB85_GAP) { c.n++; c.t = ST.t; } else { C[att.side] = { n: 1, t: ST.t, def }; return; }
  const n = c.n; (ST.cb85Log = ST.cb85Log || []).push({ t: +ST.t.toFixed(2), side: att.side, n }); if (ST.cb85Log.length > 60) ST.cb85Log.shift();
  for (let i = ST.texts.length - 1; i >= 0; i--) if (ST.texts[i].c85 === def) ST.texts.splice(i, 1);
  const dir = def.x >= att.x ? 1 : -1;
  ST.texts.push({ x: def.x + dir * (bodyW(def) / 2 + 10), y: def.y - Math.round(standH(def) * 0.55), s: n + ' HITS!', col: n >= 4 ? '#ff9a3c' : '#ffe680', size: 0.8 * 1.15, t: 0, life: 0.7, dx: 0, who: null, c85: def });   /* vi / en như nhau ('HITS!' như video) */
}
/* ---------- HUD (lớp UI độ phân giải đầy đủ) ---------- */
function rr(g, x, y, w, h, r) { g.beginPath(); g.roundRect(x, y, w, h, r); }
function hudSide(ug, ctx, f, side, W, u) {
  const t = L(ctx), right = side === 1, pw = Math.round(u * 13), pad = Math.round(u * 1.6), x0 = right ? W - pad - pw : pad, y0 = pad;
  const bw = Math.round(Math.min(W * 0.3, u * 46)), fs = Math.round(u * 4.6), sfs = Math.round(u * 2.9);
  ug.save(); ug.imageSmoothingEnabled = false;
  /* chân dung thú: khung + ảnh hướng nam (PixelLab) */
  ug.fillStyle = 'rgba(16,12,22,.82)'; rr(ug, x0, y0, pw, pw, 8); ug.fill(); ug.lineWidth = 2; ug.strokeStyle = TYPE_COLOR[f.types[0]]; ug.stroke();
  const pp = SPR && SPR._port && SPR._port[f.sp], pim = pp && img(pp), c = SPR && SPR[f.sp] && SPR[f.sp].idle, im = c && img(c.file);
  if (pim) { const k = (pw - 6) / Math.max(pim.naturalWidth, pim.naturalHeight); ug.drawImage(pim, x0 + (pw - pim.naturalWidth * k) / 2, y0 + (pw - pim.naturalHeight * k) / 2, pim.naturalWidth * k, pim.naturalHeight * k); }
  else if (im) { const k = (pw - 6) / Math.max(c.cw, c.ch); ug.drawImage(im, 0, 0, c.cw, c.ch, x0 + (pw - c.cw * k) / 2, y0 + (pw - c.ch * k) / 2 + 2, c.cw * k, c.ch * k); }
  /* tên + hệ */
  const tx = right ? x0 - Math.round(u * 1.6) : x0 + pw + Math.round(u * 1.6), al = right ? 'right' : 'left';
  ug.font = `bold ${fs}px VT323, monospace`; ug.textAlign = al; ug.textBaseline = 'top'; ug.lineWidth = Math.max(2, fs / 7); ug.strokeStyle = '#120e18'; ug.fillStyle = '#fff6e4';
  const nm = fName(ctx, f).toUpperCase() + ` Lv${f.lv}`, room = W / 2 - pw - pad * 3 - 30;   /* tên dài (Thạch Chấn Vương) trên điện thoại dọc: thu chữ cho vừa nửa màn, không đè đồng hồ */
  { let f2 = fs; while (f2 > 10 && ug.measureText(nm).width > room) { f2 -= 1; ug.font = `bold ${f2}px VT323, monospace`; } }
  ug.strokeText(nm, tx, y0 - 2); ug.fillText(nm, tx, y0 - 2); ug.font = `bold ${fs}px VT323, monospace`;
  const ty = y0 + fs * 0.92, ic = img(`linhduel/ui/icon_${f.types[0]}.png`), isz = Math.round(sfs * 1.25);
  const tn = (ctx.lang() === 'en' ? TYPE_EN74 : TYPE_NAME)[f.types[0]].toUpperCase(); ug.font = `bold ${sfs}px VT323, monospace`; const tw = ug.measureText(tn).width + isz + 12;
  const bx = right ? tx - tw : tx; ug.fillStyle = TYPE_COLOR[f.types[0]]; rr(ug, bx, ty, tw, sfs + 4, 5); ug.fill();
  if (ic) ug.drawImage(ic, bx + 2, ty + (sfs + 4 - isz) / 2, isz, isz);
  ug.fillStyle = '#1a1210'; ug.textAlign = 'left'; ug.fillText(tn, bx + isz + 6, ty + 2);
  if (f.status) { const sn = t.st[f.status.id] || f.status.id, sw = ug.measureText(sn).width + 10, sx = right ? bx - sw - 6 : bx + tw + 6; ug.fillStyle = { bong: '#e0632c', roi: '#9a6ad0', te: '#c9a21a', ngu: '#5a64b0', dong: '#3f8fb8' }[f.status.id] || '#9a6ad0'; rr(ug, sx, ty, sw, sfs + 4, 5); ug.fill(); ug.fillStyle = '#fff'; ug.fillText(sn, sx + 5, ty + 2); }
  /* thanh máu có số */
  const by = ty + sfs + 9, bh = Math.round(u * 3.2), bxx = right ? tx - bw : tx, k = Math.max(0, f.hp / f.max);
  ug.fillStyle = '#1b1622'; rr(ug, bxx - 2, by - 2, bw + 4, bh + 4, 5); ug.fill();
  ug.fillStyle = k > 0.5 ? '#5fd35a' : k > 0.22 ? '#f2c335' : '#e8503a'; const fw = Math.max(0, Math.round(bw * k)); if (fw > 0) { rr(ug, right ? bxx + bw - fw : bxx, by, fw, bh, 3); ug.fill(); }
  const ghost = f.ghost == null ? f.hp : f.ghost; f.ghost = ghost + (f.hp - ghost) * 0.08; const gk = Math.max(0, f.ghost / f.max);
  if (gk > k) { ug.fillStyle = 'rgba(255,240,200,.55)'; const gw = Math.round(bw * (gk - k)); ug.fillRect(right ? bxx + bw - Math.round(bw * gk) : bxx + fw, by, gw, bh); }
  ug.font = `bold ${Math.round(bh * 1.05)}px VT323, monospace`; ug.textBaseline = 'middle'; ug.textAlign = right ? 'right' : 'left'; ug.lineWidth = 3; ug.strokeStyle = '#120e18'; ug.fillStyle = '#fff';
  const hs = `${Math.ceil(f.hp)}/${f.max}`; const hx = right ? bxx + bw - 5 : bxx + 5; ug.strokeText(hs, hx, by + bh / 2 + 1); ug.fillText(hs, hx, by + bh / 2 + 1);
  /* huấn luyện viên: chân dung nhỏ + tên */
  const ty2 = by + bh + Math.round(u * 1.4), ps = Math.round(u * 6.5), px0 = right ? tx - ps : tx;
  const noTr = side && ST.wild;   /* plan-58 C.2: thú hoang — không ô huấn luyện viên, chỉ nhãn 'Thú hoang · độ hiếm' */
  if (!noTr) { ug.fillStyle = 'rgba(16,12,22,.82)'; rr(ug, px0, ty2, ps, ps, 5); ug.fill(); ug.strokeStyle = side ? '#e06a6a' : '#6aa8e0'; ug.lineWidth = 2; ug.stroke(); }
  const tr = noTr ? null : side ? ST.foe : ctx.S.player; if (tr && tr.sheet) { try { ug.drawImage(tr.sheet, 0, 0, 16, 14, px0 + 2, ty2 + 2, ps - 4, (ps - 4) * 14 / 16); } catch (e) { } }
  ug.font = `bold ${sfs}px VT323, monospace`; ug.textBaseline = 'middle'; ug.textAlign = al; ug.fillStyle = side ? '#ff9c8a' : '#9fd0ff'; ug.strokeStyle = '#120e18'; ug.lineWidth = 3;
  const rar = noTr && SPECIES[f.sp] && RARITY_NAME[rarOf(f)], tnm = noTr ? t.wildN + (rar ? ' · ' + rar[ctx.lang() === 'en' ? 'en' : 'vi'] : '') : side ? (ST.foe && ST.foe.m ? (ST.foe.m.k || ST.foe.m.n) : 'NPC') : (ctx.S.save.name || t.you); const nx = noTr ? tx : right ? px0 - 6 : px0 + ps + 6; ug.strokeText(tnm, nx, ty2 + ps / 2); ug.fillText(tnm, nx, ty2 + ps / 2);
  ug.restore();
  return { y: ty2 + ps, x0, right };
}
function drawCallout(ug, ctx, side, y, W, u) {
  if (bub85(ug, ctx, side, y, W, u)) return;   /* p85: bong bóng pixel (ui/bubble.png) */
  const c = ST.calls[side]; if (!c || c.t > 1.6) return; const right = side === 1;
  const fs = Math.round(u * (c.ult ? 5.6 : 4.6)); ug.save(); ug.font = `bold italic ${fs}px VT323, monospace`; const tw = ug.measureText(c.s).width + fs * 1.2, th = fs * 1.35;
  const k = Math.min(1, c.t / 0.12), out = c.t > 1.35 ? (c.t - 1.35) / 0.25 : 0, pad = Math.round(u * 1.6);
  const x = right ? W - pad - tw + (1 - k) * 60 + out * 60 : pad - (1 - k) * 60 - out * 60; ug.globalAlpha = Math.max(0, 1 - out);
  ug.fillStyle = c.ult ? '#fff1c4' : '#fbf7ee'; rr(ug, x, y, tw, th, th / 2); ug.fill(); ug.lineWidth = 3; ug.strokeStyle = c.ult ? '#c88a10' : '#2a2030'; ug.stroke();
  ug.fillStyle = TYPE_COLOR[c.type]; rr(ug, x + 4, y + 4, 6, th - 8, 3); ug.fill();
  ug.fillStyle = '#1e1622'; ug.textAlign = 'center'; ug.textBaseline = 'middle'; ug.fillText(c.s, x + tw / 2 + 3, y + th / 2 + 1); ug.restore();
}
function drawCut(ug, ctx, W, H) {   /* cắt cảnh tuyệt chiêu ~0,85 s: nền sáng + vệt tốc độ (PixelLab) + bóng 2 thú lao vào nhau */
  const c = ST.cut, k = c.t / 0.85, a = k < 0.12 ? k / 0.12 : k > 0.85 ? (1 - k) / 0.15 : 1; ug.save(); ug.globalAlpha = Math.max(0, a);
  const band = H * 0.42, y0 = (H - band) / 2; ug.fillStyle = '#fff3d6'; ug.fillRect(0, y0, W, band);
  const sl = VFXM && VFXM.speedlines, sim = sl && img(sl.file);
  if (sim) { const f = Math.floor(c.t * sl.fps) % sl.n, sw = sim.naturalWidth / sl.n, sh = sim.naturalHeight, kk = band / sh; ug.imageSmoothingEnabled = false; for (let x = -((c.t * 900) % (sw * kk)); x < W; x += sw * kk) ug.drawImage(sim, f * sw, 0, sw, sh, x, y0, sw * kk, band); }
  ug.fillStyle = '#16101c'; ug.fillRect(0, y0 - 6, W, 6); ug.fillRect(0, y0 + band, W, 6);
  const att = c.f, def = foeReal(att), K = Math.round(band / 34), move = (1 - Math.pow(1 - Math.min(1, k * 1.4), 2));
  const draw = (f, x, y, faceR) => { const S0 = SPR && SPR[f.sp]; if (!S0) return; const cc = S0.idle, im = img(cc.file); if (!im) return; const r = cc.rows.indexOf('east'); ug.save(); ug.imageSmoothingEnabled = false; ug.translate(x, y); if (!faceR) ug.scale(-1, 1);
    const o = Math.max(2, K >> 1); ug.globalAlpha *= 0.35; ug.drawImage(darkOf(im), 0, Math.max(0, r) * cc.ch, cc.cw, cc.ch, -cc.ax / 2 * K + o, -cc.ay / 2 * K + o, cc.cw / 2 * K, cc.ch / 2 * K); ug.globalAlpha /= 0.35;
    ug.drawImage(im, 0, Math.max(0, r) * cc.ch, cc.cw, cc.ch, -cc.ax / 2 * K, -cc.ay / 2 * K, cc.cw / 2 * K, cc.ch / 2 * K); ug.restore(); };   /* thú màu thật + bóng đổ (thú tròn, bóng đen thuần nhìn như cục đá) */
  const yb = y0 + band * 0.86; draw(att, W * (0.08 + 0.3 * move), yb, true); draw(def, W * (0.92 - 0.12 * move), yb, false);
  const fs = Math.round(band * 0.2); ug.font = `bold italic ${fs}px VT323, monospace`; ug.textAlign = 'center'; ug.textBaseline = 'middle'; ug.lineWidth = Math.max(3, fs / 8); ug.strokeStyle = '#16101c'; ug.fillStyle = TYPE_COLOR[MOVES[c.id].type];
  const s = mvName(ctx, c.id).toUpperCase() + '!'; ug.strokeText(s, W / 2, y0 + band * 0.2); ug.fillText(s, W / 2, y0 + band * 0.2); ug.restore();
}
/* ---------- plan-49a M1 KHUNG KẾT LIỄU: 2 khung nền kem + vạch tốc độ đen (PixelLab ui/ko_lines.png) + 2 bóng đen đặc → chớp trắng 1 lần + 2 vòng sóng (vfx ko_ring) + thú thua bay văng nảy 1 lần.
   Chỉ chạy 1 lần mỗi cú hạ gục (không lặp — luật 22/09, 10/10). ---------- */
const KO_FRAME = 0.067, KO_HOLD = 7 / 60, KO_T0 = KO_FRAME + KO_HOLD;   /* p52: khung bóng kết liễu ~67 ms; p57 (góp ý người xem): rồi ĐỨNG HÌNH cả 2 thú 7 khung 60 fps (~117 ms) ở tư thế trúng / ra đòn, xong mới bay văng */
function koGo(ctx) {
  const K = ST.ko, f = K.f; K.go = true; K.t = KO_T0;
  vfx('ko_burst', f.x, f.y, { ky: f.y + 3 }); vfx('meteorboom', f.x, f.y - 8, { ky: f.y + 3 });   /* chớp trắng + 2 vòng sóng = 1 hiệu ứng vfx_workbench (ko_burst) */ duelSfx('ko_burst', { side: f.side });
  if (ctx.quake) ctx.quake(0.3); f.koFly = { vx: K.ux * 175, vy: K.uy * 105, vh: 170, h: (f.alt || 0), b: 0 }; f.clip = 'hurt'; f.ct = 0; ST.stats.koFly = (ST.stats.koFly || 0) + 1;
  if (ST.end && ST.end.mid) text(f.x, f.y - 30, L(ctx).faint(fName(ctx, f)), '#ffb0a0', 1.05, 1.4);   /* plan-58: con giữa đội ngất — chữ nhỏ, K.O.! to chỉ cho con cuối */
}
/* ---------- plan-52 đợt 1 (học video combat, anh duyệt 29/10): impact không-KO · viền đỏ báo đòn · tối sân khi tích · tia xuyên + rãnh · nhịp cuối trận ---------- */
const HS = { hit: 0.04, big: 0.067 };   /* khựng: thường ≤ 50 ms, mạnh ≤ 67 ms */
const DASH_MV = { lao: 1, lao_lua: 1, bo_nhao: 1, kinh_lao: 1, diep_tram: 1, sung_bang: 1, vo_pha_le: 1, xung_loi: 1, lao_than: 1 };   /* p84 đợt 3 */   /* đòn lao → impact nghịch (nền đen, bóng trắng) */
const P52 = { IMP_GAP: 2.5, IMP_FR: 2, IMP_T: 0.066, WARN: 0.25, DIM: 0.42, SLOW: 0.35, SLOW_T: 1.5, BAN_AT: 1.7, BAN_T: 0.2 };
const WARN_IMM = { dai_dia_chan: 0, rung_troi: 0, bao_tuyet: 0, sap_he: 0, cong_huong: 0, dem_den: 0, bao_loc: 0.35, phan_quyet: 0.45 };   /* tuyệt chiêu trúng lúc ra đòn (+ trễ s) */
function impact(att, def, mv, kind, why) {   /* chỉ gắn 1 cú trúng thật; cách nhau ≥ 2,5 s (giờ thật); không khi đang kết liễu */
  if (ST.imp || ST.ko || ST.ph !== 'fight' || ST.rt - (ST.impLast ?? -99) < (IMP85() ? IMP85_GAP : P52.IMP_GAP)) { ST.stats.impSkip = (ST.stats.impSkip || 0) + 1; return false; }
  const dx = def.x - att.x, dy = def.y - att.y, d = Math.hypot(dx, dy) || 1; ST.impLast = ST.rt;
  ST.imp = { p85: IMP85(), kind, why, mv: mv.id, t: 0, t0: ST.rt, drawn: 0, f: def, at: att, ux: dx / d, uy: dy / d, snap: ST.F.map(q => ({ q, clip: q.clip, ct: q.ct, x: q.x, y: q.y - (q.alt || 0) })) };
  ST.stats.imp = (ST.stats.imp || 0) + 1; duelSfx('impact_frame', { kind, why, side: def.side }); return true;
}
function impEnd() { const I = ST.imp; ST.imp = null; if (!I) return; (ST.impLog = ST.impLog || []).push({ at: +I.t0.toFixed(2), kind: I.kind, why: I.why, mv: I.mv, drawn: I.drawn, pics: I.flip ? 2 : 1, ms: Math.round(I.t * 1000) }); if (ST.impLog.length > 40) ST.impLog.shift(); }
const INV = new Map();
function invOf(im) {   /* bản nghịch 2 tông của ảnh khung PixelLab (ko_frame*): nền kem → đen tím, vạch đen → kem */
  let c = INV.get(im); if (c) return c; c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight; const x = c.getContext('2d'); x.drawImage(im, 0, 0);
  try { const D = x.getImageData(0, 0, c.width, c.height), d = D.data; for (let i = 0; i < d.length; i += 4) { const l = d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11; if (l > 128) { d[i] = 20; d[i + 1] = 14; d[i + 2] = 26; } else { d[i] = 244; d[i + 1] = 236; d[i + 2] = 216; } } x.putImageData(D, 0, 0); } catch (e) { }
  INV.set(im, c); return c;
}
function warnEdge(f, left, why) { if (ST.warn || left < 0.1) { ST.stats.warnSkip = (ST.stats.warnSkip || 0) + 1; return; }   /* < 0,1 s (khung giật): không kịp đọc → bỏ */ ST.warn = { f, left, T: left, why, t0: ST.rt }; ST.stats.warn = (ST.stats.warn || 0) + 1; duelSfx('warn_edge', { side: f.side, id: why }); }
function warnOff(how) { const w = ST.warn; if (!w) return; ST.warn = null; (ST.warnLog = ST.warnLog || []).push({ why: w.why, T: +w.T.toFixed(3), dur: +(ST.rt - w.t0).toFixed(3), left: +w.left.toFixed(3), how }); if (ST.warnLog.length > 40) ST.warnLog.shift(); }
function drawWarn(ug, W, H) {   /* viền đỏ PixelLab (ui/warn_edge_*): góc + mép lát lặp, phóng bội NGUYÊN; đậm dần tới lúc trúng */
  const w = ST.warn, k = Math.max(0, Math.min(1, 1 - w.left / w.T)), im = img(H > W * 1.15 ? 'linhduel/ui/warn_edge_tall.png' : 'linhduel/ui/warn_edge_land.png'); if (!im) return;
  const iw = im.naturalWidth, ih = im.naturalHeight, s = Math.max(2, Math.round(Math.min(W, H) / 260)), C = 20, c = C * s, mw = iw - 2 * C, mh = ih - 2 * C;
  ug.save(); ug.imageSmoothingEnabled = false; ug.globalAlpha = 0.3 + 0.6 * k;
  const d = (sx, sy, sw, sh, dx, dy) => ug.drawImage(im, sx, sy, sw, sh, dx, dy, sw * s, sh * s);
  d(0, 0, C, C, 0, 0); d(iw - C, 0, C, C, W - c, 0); d(0, ih - C, C, C, 0, H - c); d(iw - C, ih - C, C, C, W - c, H - c);
  for (let x = c; x < W - c; x += mw * s) { const n = Math.min(mw, Math.ceil((W - c - x) / s)); d(C, 0, n, C, x, 0); d(C, ih - C, n, C, x, H - c); }
  for (let y = c; y < H - c; y += mh * s) { const n = Math.min(mh, Math.ceil((H - c - y) / s)); d(0, C, C, n, 0, y); d(iw - C, C, C, n, W - c, y); }
  ug.restore();
}
function charging() { if (ST.ph === 'cut') return true; return ST.F.some(f => !f.dead && f.act && f.act.ult && (!f.act.fired || (f.act.pierce && f.act.pierce.ph === 'charge'))); }
function dimTick(ctx, dt0) {   /* tối sân trong lúc tích tuyệt chiêu (≤ 42 % — vẫn đọc được đòn, luật 14/10), tắt bằng 1 khung trắng đúng lúc xả */
  const on = (ST.ph === 'cut' || ST.ph === 'fight') && charging();
  if (on) { if (!ST.dimOn) { ST.dimOn = true; ST.dimT0 = ST.rt; ST.stats.dim = (ST.stats.dim || 0) + 1; duelSfx('ult_dim'); } ST.dimA = Math.min(P52.DIM, (ST.dimA || 0) + dt0 / 0.2 * P52.DIM); }
  else if (ST.dimOn) { ST.dimOn = false; ST.dimA = 0; ST.flashW = 1; (ST.dimLog = ST.dimLog || []).push({ dur: +(ST.rt - ST.dimT0).toFixed(2) }); }
}
function drawDim(g, ctx, cx, cy, sys) {   /* phủ tối cả cảnh rồi vẽ LẠI thú + VFX + tia lên trên (sáng); HUD ở lớp UI nên không bị tối */
  g.save(); g.fillStyle = `rgba(22,14,36,${ST.dimA.toFixed(3)})`; g.fillRect(0, 0, ctx.VW || 320, ctx.VH || 200); g.restore();
  for (const e of ST.gfx) drawVfx(g, e, cx, cy);
  const L0 = sys.drawables(ctx, cx, cy); if (ST.villager) L0.shift(); L0.sort((a, b) => a.y - b.y); for (const d of L0) { try { d.f(); } catch (e) { } }
}
/* #5 TIA XUYÊN (Phán Quyết): tích 0,45 s (trượt ngang vào hàng đối thủ, sân tối) → 1 khung trắng → tia dày beam2_<hệ> từ miệng XUYÊN qua đối thủ tới mép màn,
   giữ 1,6 s (đối thủ còn đứng trong tia thì trúng nhẹ mỗi 0,4 s), mảnh dần 0,3 s; rãnh cháy PixelLab (ui/beam_trench) dọc CẢ đoạn tia trên đất = 1 decal canvas (tính vào trần decal 18). */
const PIERCE = { charge: 0.45, hold: 1.6, fade: 0.3 };
function pierceStart(f, a, foe) { a.pierce = { ph: 'charge', t: 0, dir: foe.x >= f.x ? 1 : -1, tick: 0.4, spk: 0 }; ST.stats.pierce = (ST.stats.pierce || 0) + 1; }
function inBeam(f, P, foe) { return (foe.x - f.x) * P.dir > 4 && Math.abs(foe.y - f.y) < 15; }
function updPierce(f, a, foe, dt) {
  const P = a.pierce; P.t += dt; f.clip = a.clip; f.ct = impactT(a.clip); f.fx = P.dir; f.fy = 0;
  if (P.ph === 'charge') {
    if (!foe.dead) { const dy = foe.y - f.y; if (Math.abs(dy) > 1) moveBy(f, 0, Math.sign(dy) * Math.min(Math.abs(dy), 150 * dt)); P.dir = foe.x >= f.x ? 1 : -1; f.fx = P.dir; }
    if ((P.spk -= dt) <= 0) { P.spk = 0.15; const m = beamMouth(f); if (DFX.CODE) DFX.glint(m.x, m.y, 'quang'); else vfx(HITFX[a.mv.type] || 'hit', m.x, m.y + 4, { ky: f.y + 0.6 }); }
    if (P.t >= PIERCE.charge) pierceFire(f, a, foe); return true;
  }
  if (P.ph === 'hold') { if ((P.tick -= dt) <= 0) { P.tick = 0.4; if (!foe.dead && inBeam(f, P, foe)) hit(f, foe, a.mv, { mul: 0.12, noMiss: true, noFlash: true, kb: 40 }); } if (P.t >= PIERCE.hold) { P.ph = 'fade'; P.t = 0; } return true; }
  return P.ph === 'fade' && P.t < PIERCE.fade;
}
function pierceFire(f, a, foe) {
  const P = a.pierce, c = ST.ctx, m = beamMouth(f), VW = c.VW || 320, map = c.S.map, cam = c.cam; P.ph = 'hold'; P.t = 0; P.mx = m.x - f.x; P.my = m.y - f.y;
  P.edge = P.dir > 0 ? Math.min(map.w * 16 - 4, (cam ? cam.cx : f.x - VW / 2) + VW + 8) : Math.max(4, (cam ? cam.cx : f.x + VW / 2) - 8);
  sfx('knock_whoosh'); duelSfx('beam_fire', { id: a.id, side: f.side }); if (c.quake) c.quake(0.3);
  const qsc = DFX.CODE && !foe.dead && inBeam(f, P, foe) ? DFX.spawn('phan_quyet', f, foe, Math.max(0, DFX.info('quang_ult').hits[0].t - 0.06), { noDefer: true }) : null;   /* p52e: vòng thánh + chốt loé vẽ code, tia xuyên giữ nguyên cơ chế */
  if (qsc) ultCode(f, a, foe, 'quang', qsc, P);
  else if (!foe.dead && inBeam(f, P, foe)) { skUltLayers('quang', foe); hitFx(a.mv.type, foe.x, foe.y); if (hit(f, foe, a.mv, { kb: 0, noMiss: true }) && !foe.dead) foe.kb = { vx: P.dir * 330, vy: 0, t: 0.32, fly: true, rut: 0, bounced: false }; }
  else text(foe.x, foe.y - 22, L(c).miss, '#d8d8e8', 0.95);
  const gy = f.y + 2; let x1 = m.x; for (let x = m.x; P.dir > 0 ? x <= P.edge : x >= P.edge; x += P.dir * 4) { if (isWater(x, gy)) break; x1 = x; }   /* rãnh chạy dưới cả đá / vật (vẽ ở lớp nền, vật vẽ đè), chỉ dừng ở nước / mép bản đồ */
  let seen = null, i = 0; for (let x = m.x; P.dir > 0 ? x <= x1 : x >= x1; x += P.dir * 24, i++) seen = aoe(f, x, gy, 16, 1.3, { seen, noObj: i % 3 !== 0 });
  pierceTrench(Math.min(m.x, x1), Math.max(m.x, x1), gy);
}
function pierceTrench(xa, xb, y) {   /* canvas KHÔNG __hi (luật 25/09): lát ảnh rãnh PixelLab 1:1 (lật gương xen kẽ để liền mạch), 2 đầu mờ dither; dán ở ½ cỡ */
  const im = img('linhduel/ui/beam_trench.png'), L = Math.round(xb - xa); if (!im || L < 12) return;
  const IW = im.naturalWidth, IH = im.naturalHeight, c = document.createElement('canvas'); c.width = L * 2; c.height = IH; const x = c.getContext('2d'); x.imageSmoothingEnabled = false;
  for (let p = 0, k = 0; p < c.width; p += IW, k++) { if (k % 2) { x.save(); x.translate(p + IW, 0); x.scale(-1, 1); x.drawImage(im, 0, 0); x.restore(); } else x.drawImage(im, p, 0); }
  x.globalCompositeOperation = 'destination-out'; for (let i = 0; i < 24; i++) for (let yy = 0; yy < IH; yy++) if ((i * 7 + yy * 13) % 24 >= i) { x.fillRect(i, yy, 1, 1); x.fillRect(c.width - 1 - i, yy, 1, 1); }
  decal(null, (xa + xb) / 2, y, 0, 1, c); ST.stats.trench52 = { L, x0: Math.round(xa), x1: Math.round(xb) };
}
function drawPierce(g, f, cx, cy) {
  const P = f.act && f.act.pierce; if (!P || P.ph === 'charge') return; const VW = ST.ctx.VW || 320;
  const th = P.ph === 'fade' ? Math.max(0.15, 1 - P.t / PIERCE.fade) : Math.min(1, 0.6 + P.t / 0.1), mx = f.x + P.mx, y = f.y + P.my, edge = P.dir > 0 ? cx + VW + 8 : cx - 8;
  if (DFX.CODE) { DFX.codeBeam(g, 'quang', mx, y, P.dir > 0 ? Math.max(mx + 1, edge) : Math.min(mx - 1, edge), y, 3, 30 * th, cx, cy, ST.t, { len: Math.min(1, P.ph === 'hold' ? P.t / 0.06 : 1) }); return; }   /* p52e: tia xuyên vẽ code */
  if (P.dir > 0) beam2(g, f, mx - 1, Math.max(mx + 1, edge), y, y, false, cx, cy, th, 'u'); else beam2(g, f, Math.min(mx - 1, edge), mx + 2, y, y, true, cx, cy, th, 'u');   /* p53: lấn 1 px vào tay, thon tới mép */
}
function drawBanner(ug, ctx, W, H, u) {   /* banner thắng PixelLab (ui/victory_banner) trượt từ trái vào giữa trong 0,2 s, bội nguyên */
  const w = ST.end.win, nm = w === 0 ? (ctx.S.save.name || L(ctx).you) : ST.wild && ST.F[1] ? fName(ctx, ST.F[1]) : (ST.foe && ST.foe.m ? (ST.foe.m.k || ST.foe.m.n) : 'NPC'), s = L(ctx).win(nm).toUpperCase();
  const k = Math.min(1, (ST.end.t - P52.BAN_AT) / P52.BAN_T), e = 1 - (1 - k) * (1 - k), bi = img('linhduel/ui/victory_banner.png'); let bw = Math.round(W * 0.8), bh = Math.round(u * 12);
  if (bi) { const sc = Math.max(1, Math.floor(Math.min(W * 0.92 / bi.naturalWidth, H * 0.2 / bi.naturalHeight))); bw = bi.naturalWidth * sc; bh = bi.naturalHeight * sc; }
  const x = Math.round(-bw + ((W + bw) / 2) * e), yc = Math.round(H * 0.74);   /* dưới 2 thú (giữa màn che thú thắng) */ ug.save(); ug.imageSmoothingEnabled = false;
  if (bi) ug.drawImage(bi, x, yc - bh / 2, bw, bh); else { ug.fillStyle = '#e8b830'; ug.fillRect(x, yc - bh / 2, bw, bh); }
  let fs = Math.round(Math.min(u * 9, bh * 0.46)); ug.font = `bold italic ${fs}px VT323, monospace`; const tw = ug.measureText(s).width; if (tw > bw * 0.72) { fs = Math.floor(fs * bw * 0.72 / tw); ug.font = `bold italic ${fs}px VT323, monospace`; }
  ug.textAlign = 'center'; ug.textBaseline = 'middle'; ug.lineJoin = 'round'; ug.lineWidth = Math.max(4, fs / 6); ug.strokeStyle = '#4a2a08'; ug.fillStyle = w === 0 ? '#ffffff' : '#ffd8d0';
  ug.strokeText(s, x + bw / 2, yc + 1); ug.fillText(s, x + bw / 2, yc + 1); ug.restore();
}
function camCut(ctx) { if (!ST.F[0] || !ST.F[1]) return; const t = ST.camZoomT, h = ST.zHold; camera(ctx, 10); ST.camZoomT = t; ST.zHold = h; ST.stats.camCut = (ST.stats.camCut || 0) + 1; }   /* #10: đặt camera thẳng vào chỗ mới trong 1 khung (không tween) */
/* ---------- p53: KIỂM ĐIỂM BẮN (test) — mọi loài × 6 hướng: điểm miệng nằm trong / chạm bbox sprite (khung chạm clip bắn), đứng trên (hoặc sát 1 px) pixel đặc;
   tia ngang (E / W) vẽ thử vào canvas riêng: pixel tia đầu tiên phía thân cách miệng ≤ 1 px và lấn vào miệng ≥ 1 px ---------- */
const SHOOT_CLIP = { culibong: 'cast', bovimach: 'zap', golem: 'stomp', rongdo: 'spit', bachkinh: 'spout', loiho: 'zap', vitbao: 'flap', diepnhan: 'cast', tuyetky: 'blow', tinhmieu: 'shine', cuoitho: 'shout', banhbao: 'beam' };
function mouthCheck() {
  const out = [], DIRS = { south: [0, 1], east: [1, 0], north: [0, -1], 'south-east': [0.7, 0.7], 'north-east': [0.7, -0.7], west: [-1, 0] };
  for (const sp of Object.keys(SHOOT_CLIP)) { const S0 = SPR && SPR[sp]; if (!S0) continue;
    for (const clip of [SHOOT_CLIP[sp]].concat(Object.keys((MOUTH[sp] && MOUTH[sp]._c) || {}))) { const c = S0[clip], im = c && img(c.file); if (!im) { out.push({ sp, clip, err: 'no img' }); continue; }
      for (const [dn, [fx, fy]] of Object.entries(DIRS)) {
        const f = { sp, x: 100, y: 100, fx, fy, alt: 0, clip, types: SPECIES[sp].types }, m = beamMouth(f, clip), { r, flip } = rowOf(c, f), fr = Math.min(c.n - 1, IMPACT[clip] ?? 4);
        const cv = document.createElement('canvas'); cv.width = c.cw; cv.height = c.ch; const x = cv.getContext('2d'); x.drawImage(im, fr * c.cw, r * c.ch, c.cw, c.ch, 0, 0, c.cw, c.ch); const D = x.getImageData(0, 0, c.cw, c.ch).data;
        const op = (lx, ly) => { let px = Math.floor((lx - f.x) * 2 + c.ax), py = Math.floor((ly - f.y) * 2 + c.ay); if (flip) px = c.cw - 1 - px; return px >= 0 && py >= 0 && px < c.cw && py < c.ch && D[(py * c.cw + px) * 4 + 3] > 40; };
        let bx0 = 1e9, by0 = 1e9, bx1 = -1e9, by1 = -1e9; for (let py = 0; py < c.ch; py++) for (let px = 0; px < c.cw; px++) if (D[(py * c.cw + px) * 4 + 3] > 40) { const lx = f.x + ((flip ? c.cw - 1 - px : px) - c.ax) / 2, ly = f.y + (py - c.ay) / 2; bx0 = Math.min(bx0, lx); by0 = Math.min(by0, ly); bx1 = Math.max(bx1, lx + 0.5); by1 = Math.max(by1, ly + 0.5); }
        const inBox = m.x >= bx0 - 1 && m.x <= bx1 + 1 && m.y >= by0 - 1 && m.y <= by1 + 1;
        let solid = false; for (const [ox, oy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) if (op(m.x + ox, m.y + oy)) solid = true;
        const row = { sp, clip, dir: dn, m: [+(m.x - 100).toFixed(1), +(m.y - 100).toFixed(1)], inBox, solid, bbox: [+(bx0 - 100).toFixed(1), +(by0 - 100).toFixed(1), +(bx1 - 100).toFixed(1), +(by1 - 100).toFixed(1)] };
        if (dn === 'east' || dn === 'west') {   /* vẽ tia thật (cùng hàm game) vào canvas logic không __hi, tìm pixel tia đầu tiên phía thân */
          const bc = document.createElement('canvas'); bc.width = 240; bc.height = 200; const bg = bc.getContext('2d'); bg.imageSmoothingEnabled = false; const dir = fx > 0 ? 1 : -1, mx = Math.round(m.x), my = m.y, far = mx + dir * 90;
          if (dir > 0) beam2(bg, f, mx - 1, far, my, my, false, 0, 0, 1, 'n'); else beam2(bg, f, far, mx + 2, my, my, true, 0, 0, 1, 'n');
          const B = bg.getImageData(0, 0, 240, 200).data, yy = Math.round(my); let first = null;
          for (let k2 = -12; k2 <= 12 && first == null; k2++) { const xx = mx - dir * 12 + dir * (k2 + 12); for (let dy = -2; dy <= 2; dy++) if (B[((yy + dy) * 240 + xx) * 4 + 3] > 40) { first = xx; break; } }
          row.beamFirst = first == null ? null : first - mx; row.beamOK = first != null && Math.abs(first - mx) <= 1 && (first - mx) * dir <= -1 + 1e-6;
          row.wNear = ST.beamLast && ST.beamLast.w0; row.wFar = ST.beamLast && ST.beamLast.w1; row.art = ST.beamLast && ST.beamLast.art; }
        out.push(row); } } }
  return out;
}
/* ===================== p57 — CHIÊU BẢN GỘP (plan-55 §15) + THƯ VIỆN VFX assets/px/vfx2 =====================
   Cơ chế mới: dải ngang từ miệng / chân (hàng gai, mạch dung nham, chuỗi sét nảy, khúc xạ, roi, nón hơi lạnh, quạt âm, vòng nổ xuyên) · ném bổng (lob) ·
   vùng bền (điện trường, phấn ngủ, xoáy băng, tường lửa) · kéo (rễ trói, lốc hút) · bản vọng (Tiếng Vọng) · ẩn bóng (Lẩn Bóng) · lao mới (xuyên / rút về / dịch chuyển) ·
   tuyệt chiêu 2 lớp: ult_<hệ>_back vẽ TRƯỚC thú, ult_<hệ>_front SAU thú, thú bị đánh bị ghim GIỮA hiệu ứng (che ≤ 40 % — đo ở plan-55 §16). */
const X2PATH = { ham_anh: 'linhduel/vfxlib/ham_anh/' };
const X2IDS = ['chan_gai_hang', 'chan_tang_da', 'chan_da_no', 'chan_nut_sao', 'chan_go_dat', 'chan_trong', 'nham_cau_no', 'nham_vuc_phun', 'nham_vet_lua', 'proj_nham', 'trieu_roi', 'trieu_luoi', 'xuyen_trieu', 'trieu_bong_giam', 'proj_trieu',
  'loi_chuoi', 'proj_loi', 'tia_set', 'loi_truong', 'loi_luot', 'phong_luoi', 'phong_loc', 'phong_anhdu', 'phong_quan', 'moc_roi', 'moc_bao_tu', 'moc_la', 'moc_hat', 'moc_hat_mam',
  'suong_non', 'suong_gai_roi', 'suong_san', 'suong_guong', 'canh_bao_tron', 'tinh_quat', 'tinh_khucxa', 'tinh_khien_back', 'tinh_khien_front', 'tinh_tru', 'ma_khoi', 'ma_tuong', 'ma_khoa', 'proj_ma', 'hit_ma',
  'am_vong_no', 'am_cong_huong', 'am_nhip', 'am_hu', 'am_vong', 'ham_anh', 'cau_anh', 'anh_vung', 'anh_den', 'quang_chop', 'quang_lanh', 'quang_cau']
  .concat(...['chan', 'nham', 'trieu', 'loi', 'phong', 'moc', 'suong', 'tinh', 'ma', 'am', 'anh', 'quang'].map(t => ['ult_' + t + '_back', 'ult_' + t + '_front']));
let X2P = null;
function x2Load() { if (X2P) return X2P; X2P = Promise.all(X2IDS.map(id => { const base = X2PATH[id] || ('vfx2/' + id + '/'); return fetch(BASE + base + id + '.json').then(r => r.ok ? r.json() : null).then(j => { if (!j || !VFXM) return; VFXM['x2_' + id] = { file: base + id + '.png', n: j.n, w: j.fw, h: j.fh, ax: j.ax, ay: j.ay, fps: typeof j.fps === 'number' ? j.fps : 12, x: j }; img(base + id + '.png'); }).catch(() => { }); }).concat(Object.values(CONE).flatMap(o => Object.values(o)).map(id => { coneMeta(id); return null; }))); return X2P; }
const has2 = id => !!(VFXM && VFXM['x2_' + id]);
/* SK[id]: m = cơ chế · fx = ảnh vfx2 · fix = tầm bằng chiều dài ảnh (không giãn) · align = trượt vào hàng ngang lúc gồng */
const SK = {
  nut_dat: { m: 'strip', fx: 'chan_gai_hang', at: 'feet', fix: 1, align: 1, spikes: 1 }, nem_da: { m: 'lob', fx: 'chan_tang_da', boom: 'chan_da_no', r: 22 }, dam_chan: { m: 'aug' }, don_tho: { m: 'dig' },
  cau_no_lua: { m: 'proj', fx: 'proj_nham', boom: 'nham_cau_no', v: 200 }, vung_nham: { m: 'strip', fx: 'nham_vuc_phun', at: 'feet', fix: 1, align: 1, geysers: 1 },
  roi_nuoc: { m: 'strip', fx: 'trieu_roi', fix: 1, align: 1, hitF: 3, band: 20, cut: 1 }, thuy_cham: { m: 'proj', fx: 'trieu_luoi', v: 240, rad: 16 }, song_cuon: { m: 'strip', fx: 'xuyen_trieu', at: 'feet', fix: 1, align: 1, hitF: 4, band: 30, kb: 220 },
  bong_giam: { m: 'proj', fx: 'proj_trieu', v: 150, bubble: 1 },
  phong_tia: { m: 'strip', fx: 'loi_chuoi', fix: 1, align: 1, hitF: 2, band: 18, cut: 1, bounce: 1 }, loi_cau: { m: 'proj', fx: 'proj_loi', v: 150, boom: 'tia_set' }, xung_vong: { m: 'zone', fx: 'loi_truong', r: 37, T: 2.5, self: 1, tick: 0.5 },
  luot_dien: { m: 'dash', kind: 'through', fx: 'loi_luot' },
  luoi_gio: { m: 'proj', fx: 'phong_luoi', v: 250, rad: 16 }, loc_xoay: { m: 'area', fx: 'phong_loc', r: 30, pull: 1, after: 1 }, bo_nhao: { m: 'dash', kind: 'uturn', fx: 'phong_anhdu' }, gio_xuoi: { m: 'self', fx: 'phong_quan', T: 1.2, after: 1, a: 0.6 },
  roi_re: { m: 'strip', fx: 'moc_roi', fix: 1, align: 1, hitF: 3, band: 16, cut: 1, pullBack: 40 }, bao_tu: { m: 'zone', fx: 'moc_bao_tu', r: 34, T: 2, tick: 0.4, sleep: 1 }, bao_la: { m: 'proj', fx: 'moc_la', v: 230, rad: 16 },
  hut_nhua: { m: 'lob', fx: 'moc_hat', boom: 'moc_hat_mam', r: 20 },
  hoi_lanh: { m: 'strip', fx: 'suong_non', fix: 1, align: 1, hits: [2, 5], cone: 20, cut: 1 }, gai_bang: { m: 'area', fx: 'suong_gai_roi', r: 22, warn: 0.3, hitF: 5 }, san_bang: { m: 'zone', fx: 'suong_san', r: 40, T: 3, tick: 0.25, slow: 1, ground: 1 },
  guong_bang: { m: 'self', fx: 'suong_guong', T: 3, hA: 3, hB: 7, front: 16, after: 1 },
  manh_pha_le: { m: 'proj', fx: 'tinh_quat', v: 240, rad: 18 }, khuc_xa: { m: 'strip', fx: 'tinh_khucxa', fix: 1, hitF: 3, bent: 1 }, giap_tinh: { m: 'self', fx: 'tinh_khien_back', fx2: 'tinh_khien_front', T: 4 },
  tru_pha_le: { m: 'area', fx: 'tinh_tru', r: 16, warn: 0.35, hitF: 1, toss: 1 },
  dich_loi: { m: 'dash', kind: 'blink' }, nhieu_song: { m: 'proj', fx: 'ma_khoi', v: 220, rad: 18 }, tuong_lua: { m: 'zone', fx: 'ma_tuong', wall: 1, T: 3, tick: 0.5 }, ma_hoa: { m: 'proj', fx: 'proj_ma', v: 220, lock: 6 },
  song_am: { m: 'strip', fx: 'am_vong_no', fix: 1, align: 1, travel: 1, band: 18 }, dap_am: { m: 'aug' }, hu_vang: { m: 'strip', fx: 'am_hu', fix: 1, hitF: 3, cone: 35 }, tieng_vong: { m: 'self', fx: 'am_vong', T: 4, echo: 1, ground: 1 },
  ham_bong: { m: 'area', fx: 'ham_anh', r: 26, bites: [4, 8], after: 1 }, cau_bong: { m: 'proj', fx: 'cau_anh', v: 210 }, lan_bong: { m: 'hide' }, den_me: { m: 'proj', fx: 'anh_den', v: 170 },
  tia_sang: { m: 'beam', fix: 1, align: 1 }, chop_loa: { m: 'aug' }, tu_lanh: { m: 'self', fx: 'quang_lanh', T: 0.7, after: 1 }, cau_trang: { m: 'proj', fx: 'quang_cau', v: 200 },
};
for (const t of ['chan', 'nham', 'trieu', 'loi', 'phong', 'moc', 'suong', 'tinh', 'ma', 'am', 'anh']) SK[SET5[t][4]] = { m: 'ult', t };   /* Quang: Phán Quyết giữ tia xuyên (p52, đã duyệt) + vòng thánh ult_quang ở đối thủ */
for (const id of ['dai_dia_chan', 'nui_lua', 'trieu_dang', 'set_troi', 'bao_loc', 'rung_troi', 'bao_tuyet', 'mua_kim_cuong', 'sap_he', 'cong_huong', 'dem_den']) delete WARN_IMM[id];   /* tuyệt chiêu 2 lớp: viền đỏ hẹn giờ trong skUlt (cú chạm khung 5 sau khi ra đòn) */
DFX.init(SET5, { ST, mouth: f => beamMouth(f), hitstop: s => { ST.hitstop = Math.max(ST.hitstop, s); }, quake: s => { if (ST.ctx && ST.ctx.quake) ST.ctx.quake(s); }, flashW: k => { if (ST.ctx && ST.ctx.S) ST.ctx.S.flash = Math.max(ST.ctx.S.flash || 0, k); },
  ground: (x, y, he, p, big) => ground(x, y, he === 'nham' ? SCORCH : CRACK, big ? 0.85 : 0.7, big ? 'big' : p >= 1.3 ? 'mid' : 'small') });   /* p52e */
/* p67:b2:begin */
/* p67 (khối 2): chiêu riêng = chế độ 'sig' (linhduel sigFire) + cảnh VFX code */
Object.assign(SK, {ghi_de: { m: 'sig', align: 1 }, mat_dem: { m: 'sig' }, thu_bom: { m: 'sig' }, luoi_bong: { m: 'sig', align: 1, fix: 1 }, om_hoa: { m: 'sig', fix: 1 }, nguu_xung: { m: 'sig', fixC: 1 }});
for (const [sp, s] of Object.entries({"bovimach": ["ghi_de", "ma_sigbo"], "culibong": ["mat_dem", "anh_sigcu"], "macuu": ["thu_bom", "ma_sigcuu"], "hacgiac": ["luoi_bong", "anh_sighac"], "hoahung": ["om_hoa", "nham_sighoa"], "nguuson": ["nguu_xung", "chan_signs"]})) DFX.addScene(s[0], s[1]);
SHOOT_CLIP.macuu = 'cast';
FLY.macuu = {"alt": 8};   /* thú bay: clip fly (lơ lửng) / flymove (bay đi) */
SHOOT_CLIP.hacgiac = 'cast';
SHOOT_CLIP.hoahung = 'spit';
SHOOT_CLIP.nguuson = 'throw';
/* p67:b2:end */
/* p72:b2:begin */
/* p72 (plan-51) khối 2 — sau TIER / SK / SHOOT_CLIP: bậc Tí, chiêu A (cảnh code riêng), mở chiêu theo cấp, thời tiết, bị trúng vẽ code, đội linh thú */
TIER.xs = { hp: 1, atk: 1, spe: 1.3, dodge: 0.22 };   /* anh chốt §8: bậc "Tí" — cỡ chỉ đổi tốc / né (không đổi máu / sức) */
Object.assign(SK, { loc_lua: { m: 'area', fx: 'phong_loc', r: 30, pull: 1, after: 1 }, loc_cat: { m: 'area', fx: 'phong_loc', r: 30, pull: 1, after: 1 },
  cuon_lan: { m: 'dash', kind: 'through' }, mo_set: { m: 'dash', kind: 'uturn' }, huc_sung: { m: 'dash', kind: 'through' }, nem_dia_chan: { m: 'ltn', fixC: 1 },
  gay_rung: SK.song_am, hoa_am: { m: 'ltn' }, lang_kinh: SK.khuc_xa, phan_than: { m: 'ltn' }, chan_quang: { m: 'self', fx: 'tinh_khien_back', fx2: 'tinh_khien_front', T: 3 },
  cau_tam: SK.cau_trang, than_luc: { m: 'ltn' }, voi_xoay: SK.thuy_cham, vu_mon: { m: 'dash', kind: 'uturn' }, luoi_dinh: SK.roi_re, mua_da_lo: SK.gai_bang, dap_vung: { m: 'ltn', fixC: 1 }, thuy_phao: { m: 'ltn' }, giap_chan: { m: 'self', fx: 'tinh_khien_back', fx2: 'tinh_khien_front', T: 4 } });
DFX.addScene('loc_lua', 'nham_loclua'); DFX.addScene('troi_nang', 'nham_sun'); DFX.addScene('loc_cat', 'chan_loccat');
DFX.addScene('cuon_lan', 'chan_cuonlan'); DFX.addScene('mo_set', 'loi_sk4'); DFX.addScene('tich_dien', 'loi_tich'); DFX.addScene('huc_sung', 'phong_sk3', 'moc'); DFX.addScene('nem_dia_chan', 'phong_sk3');
DFX.addScene('gay_rung', 'am_sk1'); DFX.addScene('hoa_am', 'am_sk4'); DFX.addScene('lang_kinh', 'tinh_sk2', 'quang'); DFX.addScene('phan_than', 'quang_sk2'); DFX.addScene('chan_quang', 'tinh_sk3', 'quang');
DFX.addScene('cau_tam', 'quang_sk4', 'tinh'); DFX.addScene('than_luc', 'tinh_ult'); DFX.addScene('voi_xoay', 'trieu_sk2'); DFX.addScene('vu_mon', 'phong_sk3', 'trieu'); DFX.addScene('luoi_dinh', 'trieu_tongue'); DFX.addScene('mua_da_lo', 'suong_sk2', 'chan'); DFX.addScene('goi_mua', 'trieu_rain'); DFX.addScene('thuy_phao', 'trieu_phao'); DFX.addScene('giap_chan', 'tinh_sk3', 'chan');   /* Chấn Khiên: cảnh Khiên Tinh tô bảng màu Chấn (vảy đá) */
for (const sp of LT_SPECIES) { SHOOT_CLIP[sp] = (LTD[sp] && LTD[sp].shoot) || 'cast'; if (LTD[sp] && LTD[sp].fly) FLY[sp] = { alt: LTD[sp].fly }; }   /* thú bay (Hạc, Đại Bàng): clip fly = idle vỗ cánh, flymove = run */
function ltLock(f) {   /* §3: 2 chiêu khi bắt · chiêu 3 Lv10 · chiêu 4 Lv15 · tuyệt chiêu Lv20 — chiêu chưa mở = hồi chiêu vô hạn (AI không chọn) */
  const s = SPECIES[f.sp]; if (!s || !s.lt || f.p78lo) return f;   /* p78: bộ từ kho học chiêu đã lọc theo cấp */ const n = LT_UNLOCK(f.lv); (MV78(f) || []).forEach((id, i) => { if (i >= n) f.cds[id] = 1e9; }); f.ltOpen = n; return f;
}
const WX_TXT = { nang: ['NẮNG GẮT! Nham ↑', 'HARSH SUN! Magma ↑', '#ffd45e'], mua: ['TRỜI MƯA! Triều ↑', 'RAIN! Tide ↑', '#9fd8ff'],
  cat: ['BÃO CÁT!', 'SANDSTORM!', '#e8c07a'], tuyet: ['TUYẾT RƠI! Sương ↑', 'SNOW! Frost ↑', '#bfefff'], nhieu: ['NHIỄU SÓNG!', 'STATIC!', '#46d39a'] };
function wxSet(f, w) {   /* chiêu thời tiết (Nắng Gắt / Gọi Mưa …): đổi sức hệ 14 s — trước đây eff.weather chưa được áp (ST.weather luôn null) */
  ST.weather = w; ST.wxT = 14; const q = WX_TXT[w]; if (q) text(f.x, f.y - 34, ST.ctx.lang() === 'en' ? q[1] : q[0], q[2], 0.9, 1.8);
  ST.stats.wx = (ST.stats.wx || 0) + 1; (ST.wxLog = ST.wxLog || []).push({ t: +ST.t.toFixed(1), w, side: f.side });
}
function hurtK(f) { const S0 = SPR && SPR[f.sp]; if (f.clip !== 'hurt' || f.dead || (S0 && S0.hurt)) return 0; return Math.max(0, Math.min(1, (f.hurtT || 0) / 0.32)); }
function hurtDX(f) { const k = hurtK(f); return k ? -Math.round((f.fx >= 0 ? 1 : -1) * 2 * k) : 0; }   /* bị trúng (dạng chưa có clip hurt): thân nảy lùi 1–2 px ngược hướng nhìn + nhún lên 1 px, cùng chớp trắng của engine */
function hurtDY(f) { const k = hurtK(f); return k ? Math.round(Math.sin(Math.PI * k) * 1.5) : 0; }
function ltTeam(ctx) { try { const A = ctx.linhthu && ctx.linhthu.duelTeam ? ctx.linhthu.duelTeam() : []; return A.filter(m => m && LT_READY.has(m.sp) && SPECIES[m.sp] && LOAD[m.sp]).map(m => ({ sp: m.sp, lv: m.lv, name: m.name, lt: m.lt })); } catch (e) { return []; } }
function ltDuelEnd() {   /* hết trận: kinh nghiệm + thắng / thua cho linh thú đã ra sân (linhthu.duelEnd cộng KN, tiến hoá, thả thú ra lại) */
  const c = ST.ctx; if (!c || !c.linhthu || !c.linhthu.duelEnd || !ST.team || !ST.team[0]) return; const win = !!(ST.end && ST.end.win === 0);
  const res = ST.team[0].filter(f => f.ltId).map(f => ({ lt: f.ltId, win, fought: !!f.fought, ko: !!f.dead }));   /* rỗng vẫn gọi: thả lại linh thú đã thu lúc vào trận */
  try { ST.ltRes = c.linhthu.duelEnd(res); } catch (e) { console.error('lt duelEnd', e); }
}
/* ---- p72 chiêu N (cơ chế mới) của linh thú: SK m 'ltn' → ltNFire (động tác dài qua a.sigU như chiêu riêng p67) ---- */
function ltNFire(f, a, foe, K) {
  skLog({ side: f.side, id: a.id, m: 'ltn' }); ST.stats.ltn = (ST.stats.ltn || 0) + 1;
  if (a.id === 'nem_dia_chan') return grabToss(f, a, foe);
  if (a.id === 'phan_than') { f.decoy = { t: 5, n: 2 }; text(f.x, f.y - 30, ST.ctx.lang() === 'en' ? 'MIRROR DECOYS!' : 'PHÂN THÂN!', '#fff3b0', 0.95); ST.stats.ltDecoy = (ST.stats.ltDecoy || 0) + 1; return true; }
  if (a.id === 'than_luc') return liftDrop(f, a, foe);
  if (a.id === 'hoa_am') return chorus(f, a, foe);
  if (a.id === 'dap_vung') return hopSlam(f, a, foe);
  if (a.id === 'thuy_phao') return waterCannon(f, a, foe);
  return false;
}
function grabToss(f, a, foe) {   /* Ném Địa Chấn (Đại Bàng): lao quắp đối thủ → cả hai bay vút lên → ném cắm xuống đất: rung, nứt, sóng bụi, hất văng */
  const st = { t: 0, ph: 'go' }, vi = ST.ctx.lang() !== 'en'; sfx('knock_whoosh');
  a.sigU = dt => { st.t += dt;
    if (st.ph === 'go') { const dx = foe.x - f.x, dy = foe.y - f.y, d = Math.hypot(dx, dy) || 1; face(f, foe.x, foe.y); f.ct = impactT(a.clip);
      if (!foe.dead && d > sepNeed(f, foe) + 2 && st.t < 0.7) { moveBy(f, dx / d * 300 * dt, dy / d * 300 * dt); clampField(f); return true; }
      if (foe.dead || foe.absent || d > sepNeed(f, foe) + 12 || foe.inv > 0) { text(foe.x, foe.y - 22, L(ST.ctx).miss, '#d8d8e8', 0.85); return false; }
      st.ph = 'lift'; st.t = 0; foe.kb = null; foe.dodge = null; if (!(foe.act && foe.act.ult)) { foe.act = null; foe.clip = 'hurt'; } foe.pin = 1.0; foe.toss = 0.85; foe.tossT = 0.85; foe.tossH = 44; f.toss = 0.85; f.tossT = 0.85; f.tossH = 50;
      text(foe.x, foe.y - 30, vi ? 'QUẮP!' : 'GRABBED!', '#d8f4ff', 0.95); ST.stats.ltGrab = (ST.stats.ltGrab || 0) + 1; return true; }
    if (st.ph === 'lift') { f.x += (foe.x - f.fx * 3 - f.x) * Math.min(1, dt * 12); f.y += (foe.y - 1 - f.y) * Math.min(1, dt * 12); f.ct = impactT(a.clip);
      if (st.t < 0.84) return true;
      ST.ctx.quake(0.32); sfx('smash'); ground(foe.x, foe.y + 1, CRACK, 0.9, 'big'); aoe(f, foe.x, foe.y, 44, 1.2);
      if (DFX.CODE) { DFX.burst(foe.x, foe.y - 4, 'chan', 1.4, foe.y + 0.5); DFX.burst(foe.x, foe.y - 2, 'phong', 1.0, foe.y + 0.6); DFX.steam && DFX.steam(foe.x, foe.y); } else { vfx('damchan', foe.x, foe.y, { ground: true }); vfx('dust', foe.x, foe.y, { ground: true }); }
      foe.pin = 0; hit(f, foe, a.mv, { kb: 150, _now: 1 }); ST.stats.ltToss = (ST.stats.ltToss || 0) + 1; return false; }
    return false; };
  return true;
}
function liftDrop(f, a, foe) {   /* Thần Lực (Kim Quy, tuyệt chiêu): tâm lực nâng bổng đối thủ lên cao, giữ lơ lửng rồi THẢ RƠI cắm đất — 2 nhịp: nâng (nhẹ) + rơi (chốt) */
  const st = { t: 0, hit1: false }, vi = ST.ctx.lang() !== 'en'; if (foe.dead || foe.absent) return false;
  foe.kb = null; foe.dodge = null; if (!(foe.act && foe.act.ult)) { foe.act = null; foe.clip = 'hurt'; } foe.pin = 1.5; foe.toss = 1.3; foe.tossT = 1.3; foe.tossH = 58; text(foe.x, foe.y - 40, vi ? 'THẦN LỰC!' : 'DIVINE LIFT!', '#d79be8', 1.05);
  a.sigU = dt => { st.t += dt; f.ct = Math.min(f.ct, impactT(a.clip) + 0.2);
    if (!st.hit1 && st.t > 0.25) { st.hit1 = true; hit(f, foe, a.mv, { mul: 0.35, kb: 0, _now: 1, noMiss: true }); if (DFX.CODE) DFX.burst(foe.x, foe.y - 30, 'tinh', 0.8, foe.y + 0.5); }
    if (st.t < 1.28) return true;
    ST.ctx.quake(0.4); sfx('smash'); ground(foe.x, foe.y + 1, CRACK, 0.95, 'big'); aoe(f, foe.x, foe.y, 60, 1.5); if (DFX.CODE) { DFX.burst(foe.x, foe.y - 4, 'tinh', 1.5, foe.y + 0.5); DFX.burst(foe.x, foe.y - 2, 'chan', 1.2, foe.y + 0.6); }
    foe.pin = 0; hit(f, foe, a.mv, { mul: 0.75, kb: 170, _now: 1, noMiss: true }); ST.stats.ltLift = (ST.stats.ltLift || 0) + 1; return false; };
  return true;
}
function chorus(f, a, foe) {   /* Hoà Âm (Dế): 3 vòng âm địa chấn nở quanh mình, mỗi vòng 1 nhịp (vòng sau rộng hơn) */
  for (let i = 0; i < 3; i++) ST.timers.push({ t: 0.05 + i * 0.28, fn: () => { const r = 30 + i * 14; if (DFX.CODE) DFX.burst(f.x, f.y - 2, 'am', 0.6 + i * 0.2, f.y + 0.5); ST.ctx.quake(0.06); aoe(f, f.x, f.y, r, 0.6);
    if (!foe.dead && dist(f, foe) <= r + 6) hit(f, foe, a.mv, { mul: i ? 0.35 : 0.5, kb: 50 + i * 30, _now: 1, noMiss: i > 0 }); else if (!i) text(foe.x, foe.y - 22, L(ST.ctx).miss, '#d8d8e8', 0.85); } });
  return true;
}
function decoyHit(def) {   /* Phân Thân: đòn trúng thân có bóng gương → 50 % trúng bóng (vỡ bóng, không mất máu) */
  if (!def.decoy || def.decoy.n <= 0 || def.decoy.t <= 0 || rnd() > 0.5) return false; def.decoy.n--; const ox = def.decoy.n ? -12 : 12;
  text(def.x + ox, def.y - 22, ST.ctx.lang() === 'en' ? 'DECOY!' : 'TRÚNG BÓNG!', '#fff3b0', 0.85); if (DFX.CODE) DFX.burst(def.x + ox, def.y - 8, 'quang', 0.7, def.y + 0.5); ST.stats.ltDecoyHit = (ST.stats.ltDecoyHit || 0) + 1; return true;
}
function decoyDraw(g, f, im, fr, r, sw, sh, w, h, ax, ay, x, y, flip) {   /* 2 bóng gương mờ hai bên thân (hình tĩnh theo thân, chỉ trong 5 s sau chiêu) */
  if (!f.decoy || f.decoy.n <= 0 || f.dead) return; g.save(); g.globalAlpha = 0.42;
  for (let i = 0; i < f.decoy.n; i++) { const ox = (i ? -1 : 1) * 13; if (flip) { g.save(); g.translate(x + ox, y); g.scale(-1, 1); g.drawImage(im, fr * sw, r * sh, sw, sh, -ax, -ay, w, h); g.restore(); } else g.drawImage(im, fr * sw, r * sh, sw, sh, x + ox - ax, y - ay, w, h); }
  g.restore();
}
function hopSlam(f, a, foe) {   /* Dập Vũng (Cóc): nhảy cong tới sát đối thủ, DẬP xuống tạo vũng nước — toé vòng nước, hất nhẹ; trên sân có nước mạnh hơn */
  const st = { t: 0, x0: f.x, y0: f.y }, dx = foe.x - f.x, dy = foe.y - f.y, d = Math.hypot(dx, dy) || 1, land = d > 22 ? { x: foe.x - dx / d * 14, y: foe.y - dy / d * 6 } : { x: f.x, y: f.y };
  f.toss = 0.5; f.tossT = 0.5; f.tossH = 26; sfx('knock_whoosh');
  a.sigU = dt => { st.t += dt; const k = Math.min(1, st.t / 0.5); f.x = st.x0 + (land.x - st.x0) * k; f.y = st.y0 + (land.y - st.y0) * k; clampField(f); face(f, foe.x, foe.y); f.ct = impactT(a.clip) - 0.02;
    if (k < 1) return true;
    ST.ctx.quake(0.14); sfx('smash'); const wet = isWater(f.x, f.y) || (ST.terr && ST.terr.mul && ST.terr.mul.trieu > 1);
    if (DFX.CODE) { DFX.burst(f.x, f.y - 2, 'trieu', 1.2, f.y + 0.5); DFX.burst(f.x + 10, f.y, 'trieu', 0.7, f.y + 0.6); DFX.burst(f.x - 10, f.y, 'trieu', 0.7, f.y + 0.6); } else vfx('splash', f.x, f.y, { ky: f.y + 0.5 });
    aoe(f, f.x, f.y, 34, 0.9); if (!foe.dead && dist(f, foe) <= 34) hit(f, foe, a.mv, { mul: wet ? 1.2 : 1, kb: 120, _now: 1 }); else text(foe.x, foe.y - 22, L(ST.ctx).miss, '#d8d8e8', 0.85);
    ST.stats.ltSlam = (ST.stats.ltSlam || 0) + 1; return false; };
  return true;
}
function waterCannon(f, a, foe) {   /* Thuỷ Pháo (Cóc, tuyệt chiêu): cột nước 3 nhịp đúng nhịp cảnh trieu_phao (0,5 / 0,7 / 0,9 s giờ cảnh = tung + 0,2 / 0,4 / 0,6) */
  [[0.2, 0.3], [0.4, 0.3], [0.6, 0.55]].forEach(([t, mul], i) => ST.timers.push({ t, fn: () => { if (foe.dead) return; if (Math.abs(foe.y - f.y) < 26 && dist(f, foe) <= rangeOf(f, a.id) + 10) { hit(f, foe, a.mv, { mul, kb: i === 2 ? 180 : 0, _now: 1, noMiss: i > 0 }); ST.ctx.quake(0.12 + i * 0.06); } else if (!i) text(foe.x, foe.y - 22, L(ST.ctx).miss, '#d8d8e8', 0.85); } }));
  aoe(f, foe.x, foe.y, 40, 1.4); return true;
}
/* p72:b2:end */
/* p96:b2:begin */
/* p96 (khối 2): chế độ 'sig' + cảnh VFX code từng dạng */
Object.assign(SK, {lan_gai: { m: 'sig', fixC: 1 }, ban_gai: { m: 'sig' }, tre_moi: { m: 'sig' }, cuon_thu: { m: 'sig', fixC: 1 }, cau_gai: { m: 'sig', fixC: 1 }, lan_gai2: { m: 'sig', fixC: 1 }, ban_gai2: { m: 'sig' }, tre_moi2: { m: 'sig' }, cuon_thu2: { m: 'sig', fixC: 1 }, cau_gai2: { m: 'sig', fixC: 1 }, lan_gai3: { m: 'sig', fixC: 1 }, ban_gai3: { m: 'sig' }, tre_moi3: { m: 'sig' }, cuon_thu3: { m: 'sig', fixC: 1 }, cau_gai3: { m: 'sig', fixC: 1 }});
for (const [id, k] of Object.entries({"lan_gai": "chan_mdk1", "ban_gai": "chan_mdk2", "tre_moi": "chan_mdk3", "cuon_thu": "chan_mdk4", "cau_gai": "chan_mdkult", "lan_gai2": "chan_mdk12", "ban_gai2": "chan_mdk22", "tre_moi2": "chan_mdk32", "cuon_thu2": "chan_mdk42", "cau_gai2": "chan_mdk2ult", "lan_gai3": "chan_mdk13", "ban_gai3": "chan_mdk23", "tre_moi3": "chan_mdk33", "cuon_thu3": "chan_mdk43", "cau_gai3": "chan_mdk3ult"})) DFX.addScene(id, k);
SHOOT_CLIP.molandak = 'mcast';
SHOOT_CLIP.molandak2 = 'mcast';
SHOOT_CLIP.molandak3 = 'mcast';
/* p96:b2:end */
/* p99:b2:begin */
/* p99 (khối 2): chế độ 'sig' + cảnh VFX code từng dạng */
Object.assign(SK, {quay_vay: { m: 'sig', fixC: 1 }, bong_bong: { m: 'sig' }, liec_mat: { m: 'sig' }, nguoc_dong: { m: 'sig', fixC: 1 }, vuot_thac: { m: 'sig', fixC: 1 }, quay_vay2: { m: 'sig', fixC: 1 }, bong_bong2: { m: 'sig' }, liec_mat2: { m: 'sig' }, nguoc_dong2: { m: 'sig', fixC: 1 }, vuot_thac2: { m: 'sig', fixC: 1 }, quay_vay3: { m: 'sig', fixC: 1 }, bong_bong3: { m: 'sig' }, liec_mat3: { m: 'sig' }, nguoc_dong3: { m: 'sig', fixC: 1 }, vuot_thac3: { m: 'sig', fixC: 1 }});
for (const [id, k] of Object.entries({"quay_vay": "trieu_myk1", "bong_bong": "trieu_myk2", "liec_mat": "trieu_myk3", "nguoc_dong": "trieu_myk4", "vuot_thac": "trieu_mykult", "quay_vay2": "trieu_myk12", "bong_bong2": "trieu_myk22", "liec_mat2": "trieu_myk32", "nguoc_dong2": "trieu_myk42", "vuot_thac2": "trieu_myk2ult", "quay_vay3": "trieu_myk13", "bong_bong3": "trieu_myk23", "liec_mat3": "trieu_myk33", "nguoc_dong3": "trieu_myk43", "vuot_thac3": "trieu_myk3ult"})) DFX.addScene(id, k);
SHOOT_CLIP.moyaki = 'yblow';
SHOOT_CLIP.moyaki2 = 'yblow';
SHOOT_CLIP.moyaki3 = 'yblow';
/* p99:b2:end */
/* p100:b2:begin */
/* p100 (khối 2): chế độ 'sig' + cảnh VFX code từng dạng */
Object.assign(SK, {tin_nong: { m: 'sig', fixC: 1 }, bom_gai: { m: 'sig', fixC: 1 }, phong_van: { m: 'sig' }, cuoi_tit: { m: 'sig', fixC: 1 }, ban_tin: { m: 'sig', fixC: 1 }, tin_nong2: { m: 'sig', fixC: 1 }, bom_gai2: { m: 'sig', fixC: 1 }, phong_van2: { m: 'sig' }, cuoi_tit2: { m: 'sig', fixC: 1 }, ban_tin2: { m: 'sig', fixC: 1 }, tin_nong3: { m: 'sig', fixC: 1 }, bom_gai3: { m: 'sig', fixC: 1 }, phong_van3: { m: 'sig' }, cuoi_tit3: { m: 'sig', fixC: 1 }, ban_tin3: { m: 'sig', fixC: 1 }});
for (const [id, k] of Object.entries({"tin_nong": "ma_chg1", "bom_gai": "ma_chg2", "phong_van": "ma_chg3", "cuoi_tit": "ma_chg4", "ban_tin": "ma_chgult", "tin_nong2": "ma_chg12", "bom_gai2": "ma_chg22", "phong_van2": "ma_chg32", "cuoi_tit2": "ma_chg42", "ban_tin2": "ma_chg2ult", "tin_nong3": "ma_chg13", "bom_gai3": "ma_chg23", "phong_van3": "ma_chg33", "cuoi_tit3": "ma_chg43", "ban_tin3": "ma_chg3ult"})) DFX.addScene(id, k);
SHOOT_CLIP.chog = 'gmane';
SHOOT_CLIP.chog2 = 'gmane';
SHOOT_CLIP.chog3 = 'gmane';
/* p100:b2:end */
function skLog(o) { (ST.skLog = ST.skLog || []).push({ t: +ST.t.toFixed(2), ...o }); if (ST.skLog.length > 80) ST.skLog.shift(); }
const x2 = (id, x, y, o) => vfx('x2_' + id, x, y, o || {});
function skAnchor(f, at) { return at === 'feet' ? { x: f.x + (f.fx >= 0 ? 6 : -6), y: f.y + 1 } : beamMouth(f); }
function skFire(f, a, foe) {
  const id = a.id, mv = a.mv, K = SK[id], t = mv.type, dir = foe.x >= f.x ? 1 : -1; if (!K) return false; skLog({ side: f.side, id, m: K.m });
  if (K.m === 'aug') {   /* chiêu cũ + ảnh vfx2 thêm, rồi chạy tiếp code cũ */
    if (id === 'dam_chan') x2('chan_nut_sao', f.x, f.y + 1, { ground: true });
    if (id === 'dap_am' && dist(f, foe) <= 32) { x2('am_cong_huong', foe.x, foe.y - Math.max(18, standH(foe) + 6), { follow: foe, dky: 0.6 }); x2('am_nhip', foe.x, foe.y + 1, { ground: true }); }
    if (id === 'chop_loa') x2('quang_chop', f.x, f.y - Math.round(standH(f) * 0.5), { ky: f.y + 0.6 });
    return false; }
  if (K.m === 'dig') { if (DIG[f.sp] || f.sp === 'golem') { startDig(f); return true; } return false; }
  if (K.m === 'ult') { skUlt(f, a, foe, K.t); return true; }
  const dsc = DFX.CODE ? DFX.find(f, id) : null;   /* p52e */
  if (K.m === 'p78') return P78.fire(f, a, foe);   /* p78 */
  if (K.m === 'p73') return P73.fire(f, a, foe);   /* p73 */
  if (K.m === 'ltn') return ltNFire(f, a, foe, K);   /* p72: chiêu N linh thú */
  if (K.m === 'sig') return sigFire(f, a, foe, K);   /* p67 */
  if (K.m === 'beam') { skBeam(f, a, foe); return true; }
  if (K.m === 'strip') { skStrip(f, a, foe, K, dir); return true; }
  if (K.m === 'proj') { const mo = beamMouth(f), tx = foe.x + (foe.vx || 0) * 0.25, ty = foe.y - Math.max(6, standH(foe) * 0.45) - (foe.alt || 0), d = Math.hypot(tx - mo.x, ty - mo.y) || 1, v = K.v || 220;
    ST.shots.push({ kind: 'proj2', sk: id, f, mv, x: mo.x, y: mo.y, vx: (tx - mo.x) / d * v, vy: (ty - mo.y) / d * v, h: f.y - mo.y, gy: f.y, t: 0, life: rangeOf(f, id) / v + 0.35, fx: K.fx, rad: K.rad || 12, ox: mo.x, oy: mo.y });
    if (dsc) { const s = ST.shots[ST.shots.length - 1], T = DFX.untilMain(dsc); s.hide = 1; if (T > 0.08) { const v2 = Math.max(80, Math.min(600, d / T)); s.vx = (tx - mo.x) / d * v2; s.vy = (ty - mo.y) / d * v2; s.life = Math.max(T + 0.3, rangeOf(f, id) / v2 + 0.35); } DFX.fired(dsc, { at: { x: tx, y: foe.y + (foe.vy || 0) * 0.25 } }); }   /* p52e: engine giữ đường bay + va chạm, tới đúng lúc cảnh nổ */
    sfx('knock_whoosh'); return true; }
  if (K.m === 'lob') { const mo = beamMouth(f), lx = foe.x + (foe.vx || 0) * 0.35, ly = foe.y + (foe.vy || 0) * 0.35, D = Math.hypot(lx - mo.x, ly - f.y), T = Math.max(0.55, Math.min(1.0, D / 150));
    ST.shots.push({ kind: 'lob', sk: id, f, mv, x0: mo.x, y0: f.y, h0: f.y - mo.y, tx: lx, ty: ly, x: mo.x, y: f.y, gy: f.y, T, t: 0, H: 34 + D * 0.12, fx: K.fx, ox: mo.x, oy: mo.y }); x2('canh_bao_tron', lx, ly, { ground: true, a: 0.7 });
    if (dsc) { const s = ST.shots[ST.shots.length - 1], T2 = DFX.untilMain(dsc); s.hide = 1; if (T2 > 0.1) s.T = Math.max(0.3, Math.min(1.2, T2)); DFX.fired(dsc, { at: { x: lx, y: ly } }); }   /* p52e */
    sfx('knock_whoosh'); return true; }
  if (K.m === 'area') { const px = foe.x + (foe.vx || 0) * 0.2, py = foe.y + (foe.vy || 0) * 0.2, w = K.warn || 0; if (dsc) DFX.fired(dsc, { at: { x: px, y: py } }); if (w) x2('canh_bao_tron', px, py, { ground: true, a: 0.75 });
    ST.timers.push({ t: w, fn: () => { const m = VFXM['x2_' + K.fx]; if (!m) return; const e = x2(K.fx, px, id === 'ham_bong' ? py - Math.round(standH(foe) * 0.5) : py, { ky: py + (K.after ? 0.6 : -0.6) });
      const hitAt = (fr, mul, first) => ST.timers.push({ t: fr / m.fps, fn: () => { if (!foe.dead && Math.hypot(foe.x - px, foe.y - py) <= (K.r || 20) + 4) { if (hit(f, foe, mv, { mul, noMiss: !first, kb: K.pull ? 0 : 90 }) && K.toss && !foe.dead) { foe.toss = 0.5; foe.kb = null; } } else if (first) text(px, py - 22, L(ST.ctx).miss, '#d8d8e8', 0.85); } });
      if (K.bites) K.bites.forEach((fr, i) => hitAt(fr, i ? 0.5 : 0.7, !i)); else hitAt(K.hitF || 2, 1, true);
      if (K.pull) ST.zones.push({ k: 'pull', x: px, y: py, r: 46, t: 0, T: 1.0, f, mv, tick: 99 }); } }); return true; }
  if (K.m === 'zone') { const self = !!K.self, zx = self ? f.x : foe.x, zy = self ? f.y : foe.y, lw = K.wall ? 96 : 0; if (dsc && !self) DFX.fired(dsc, { at: { x: zx, y: zy } });
    const e = K.wall ? x2(K.fx, foe.x - 48, foe.y + 2, { ky: foe.y - 0.6, hold: K.T, hA: 3, hB: 6 }) : x2(K.fx, zx, zy + (K.ground ? 1 : 0), { ground: !!K.ground || self, ky: zy - 0.6, follow: self ? f : null, hold: K.T, hA: Math.min(4, (VFXM['x2_' + K.fx] || { n: 8 }).n - 3), hB: Math.min((VFXM['x2_' + K.fx] || { n: 8 }).n - 2, 6) });
    ST.zones.push({ k: id, x: zx, y: zy, r: K.r || 30, w: lw, t: 0, T: K.T, f, mv, K, tick: 0.05, follow: self ? f : null, hits: 0 }); if (dsc) DFX.zone({ x: zx, y: zy + (K.ground ? 1 : 0), r: K.r || 30, T: K.T, he: t, follow: self ? f : null, wall: lw, delay: Math.min(0.5, DFX.untilMain(dsc) ?? 0.3) });   /* p52f: hình vùng kéo dài đúng thời gian gây sát thương */
    sfx('knock_whoosh'); return true; }
  if (K.m === 'self') {
    if (K.echo) { f.echo = { t: K.T }; x2(K.fx, f.x, f.y + 1, { ground: true, follow: f }); text(f.x, f.y - 30, ST.ctx.lang() === 'en' ? 'ECHO!' : 'TIẾNG VỌNG!', '#c9a2ff', 0.9); return true; }
    const n = (VFXM['x2_' + K.fx] || { n: 8 }).n; x2(K.fx, f.x + (K.front ? f.fx * K.front : 0), f.y, { follow: f, dky: K.after ? 0.6 : -0.6, a: K.a || 1, hold: K.T, hA: K.hA ?? 1, hB: K.hB ?? (n - 2) }); if (K.fx2) x2(K.fx2, f.x, f.y, { follow: f, dky: 0.6, hold: K.T, hA: 1, hB: n - 2 });
    applyTT(f, f, mv); sfx('knock_whoosh'); return true; }
  if (K.m === 'hide') { f.hide = { t: 0, T: 1.0 }; x2('anh_vung', f.x, f.y + 1, { ground: true }); text(f.x, f.y - 26, ST.ctx.lang() === 'en' ? 'HIDDEN' : 'LẨN BÓNG', '#b38bff', 0.85); f.act = null; ST.stats.hide = (ST.stats.hide || 0) + 1; return true; }
  return false;
}
/* p67:sig:begin */
/* ===== p67: CHIÊU RIÊNG (signature) — mỗi Chấn Thú mới 1 chiêu đúng bản sắc loài (anh 30/10: 'làm các skill cho các Chấn Thú mới').
   VFX vẽ code hoàn toàn: pxfx_full.js FS.<hệ>_sig<loài> (tạo lúc gồng, như mọi chiêu) + cảnh trúng *2 tạo lúc chạm (lao / ôm).
   Sát thương theo ĐỒNG HỒ RIÊNG khớp các mốc của cảnh (giờ cảnh 0,3 = lúc tung chiêu) — không đi qua hàng đợi hoãn của duelfx. ===== */
function sigAt(t, fn) { ST.timers.push({ t: Math.max(0, t - 0.3), fn }); }
function sigSay(x, y, vi, en, col) { text(x, y, ST.ctx.lang() === 'en' ? en : vi, col, 0.95, 1.5); }
function sigMiss(foe) { text(foe.x, foe.y - 22, L(ST.ctx).miss, '#d8d8e8', 0.85); }
function sigScene(id, f, foe, kind) {   /* cảnh trúng lúc chạm: 2 thân sát nhau làm đoạn nén miệng→đối thủ âm (cảnh lệch ~16 px) → đặt neo người ra chiêu ẢO cách 78 px như khung mẫu (cảnh trúng chỉ vẽ quanh đối thủ) */
  if (!DFX.CODE) return; const sc = DFX.spawn(id, f, foe, 0, { kind, noDefer: true, fixC: true }); if (!sc) return;
  sc.Fpt = { x: foe.x, y: foe.y }; sc.C = { x: sc.F.x - 78, y: sc.F.y };   /* neo ở chỗ chạm: nổ cuối không bay theo đối thủ bị hất */ sc.M = { x: sc.F.x - 70, y: sc.F.y }; sc.bx0 = Math.round(sc.C.x - 100); }
function sigFire(f, a, foe, K) { if (a.mv && a.mv.chg && CHG100[a.mv.chg]) { skLog({ side: f.side, id: a.id, m: 'sig' }); return chgFire(f, a, foe, K); }   /* p100 Chog */ if (a.mv && a.mv.myk && MYK99[a.mv.myk]) { skLog({ side: f.side, id: a.id, m: 'sig' }); return mykFire(f, a, foe, K); }   /* p99 Moyaki */ if (a.mv && a.mv.mdk && MDK96[a.mv.mdk]) { skLog({ side: f.side, id: a.id, m: 'sig' }); return mdkFire(f, a, foe, K); }   /* p96 Molandak */
  const id = a.id, mv = a.mv, dir = foe.x >= f.x ? 1 : -1; f.sigDone = true; skLog({ side: f.side, id, m: 'sig' }); ST.stats.sig = (ST.stats.sig || 0) + 1;
  const inLine = (band, reach) => !foe.dead && (foe.x - f.x) * dir > -4 && Math.abs(foe.y - f.y) <= band && dist(f, foe) <= reach;
  if (id === 'ghi_de') {   /* Bọ Vi Mạch: tia mạch in từ sừng -> trúng thì GHI ĐÈ: khoá MỌI chiêu của đối thủ 3 s (chỉ còn đánh thường) */
    sigAt(0.40, () => { if (f.dead) return; if (!inLine(26, rangeOf(f, id) + 16)) return sigMiss(foe);
      if (hit(f, foe, mv, { kb: 50, mul: 0.9, _now: 1 }) && !foe.dead) { const T = 3.0; foe.pin = 0.6; foe.kb = null; for (const m of MV78(foe) || []) foe.cds[m] = Math.max(foe.cds[m] || 0, T); foe.plan = null; foe.queued = null; foe.lockAll = T; sigSay(foe.x, foe.y - 40, 'GHI ĐÈ! KHOÁ CHIÊU', 'OVERWRITTEN! MOVES LOCKED', '#46d39a'); ST.stats.sigLock = (ST.stats.sigLock || 0) + 1; } });
    sfx('knock_whoosh'); duelSfx('beam_fire', { id, side: f.side }); return true; }
  if (id === 'mat_dem') {   /* Cu Li Bóng: tia nhìn từ đôi mắt -> THÔI MIÊN: đối thủ lừ đừ bước về phía Cu Li 1 s, không ra đòn, rồi ngủ */
    sigAt(0.40, () => { if (f.dead) return; if (foe.dead || dist(f, foe) > rangeOf(f, id) + 16) return sigMiss(foe);
      if (hit(f, foe, mv, { kb: 0, _now: 1 }) && !foe.dead) { foe.hyp = { t: 1.0, by: f }; foe.act = null; foe.dodge = null; foe.kb = null; foe.plan = null; sigSay(foe.x, foe.y - 40, 'THÔI MIÊN!', 'HYPNOTIZED!', '#ffe680'); ST.stats.sigHyp = (ST.stats.sigHyp || 0) + 1; } });
    sfx('knock_whoosh'); return true; }
  if (id === 'thu_bom') {   /* Mã Cưu: 3 phong bì dữ liệu vút lên rồi rơi lần lượt xuống đối thủ; gói cuối to nhất, 40 % gây rối */
    let first = true; [[0.48, 0.4], [0.64, 0.35], [0.82, 0.6]].forEach(([t, mul], i) => sigAt(t, () => { if (f.dead || foe.dead) return; if (dist(f, foe) > rangeOf(f, id) + 30) { if (first) sigMiss(foe); return; }
      if (hit(f, foe, mv, { mul, noMiss: !first, kb: i === 2 ? 120 : 40, noFlash: i === 1, _now: 1 })) { first = false; if (i === 2 && !foe.dead && rnd() < 0.4) applyStatus(foe, 'roi'); } else if (first) first = false; }));
    sfx('knock_whoosh'); return true; }
  if (id === 'luoi_bong') {   /* Hắc Giác Thú: lưỡi bóng quấn đối thủ -> giật kéo về -> đớp, hút 1 bậc công (đối thủ −1, mình +1) */
    sigAt(0.40, () => { if (f.dead) return; if (!inLine(24, rangeOf(f, id) + 14)) return sigMiss(foe);
      if (hit(f, foe, mv, { mul: 0.55, kb: 0, noFlash: false, _now: 1 }) && !foe.dead) { a.sigHit = 1; const dd = Math.abs(f.x - foe.x) || 1, need = sepNeed(f, foe) + 2; foe.kb = { vx: (f.x - foe.x) / dd * 300, vy: (f.y - foe.y) * 3, t: Math.max(0.04, Math.min(0.3, (dd - need) / 300)), fly: false }; foe.act = null; sigSay(foe.x, foe.y - 40, 'BỊ KÉO!', 'PULLED IN!', '#f590b8'); } });
    sigAt(0.675, () => { if (!a.sigHit) return; const sc = DFX.CODE && DFX.find(f, id); if (sc) DFX.fired(sc, { at: { x: foe.x, y: foe.y } }); });   /* hàm đớp ở lại chỗ đớp (không bay theo khi đối thủ bị hất) */
    sigAt(0.68, () => { if (!a.sigHit || f.dead || foe.dead) return; if (dist(f, foe) > sepNeed(f, foe) + 22) return;
      if (hit(f, foe, mv, { mul: 0.65, noMiss: true, kb: 130, _now: 1 }) && !foe.dead) { foe.stage.atk = Math.max(-6, foe.stage.atk - 1); f.stage.atk = Math.min(6, f.stage.atk + 1); sigSay(f.x, f.y - 40, 'HÚT SỨC! CÔNG ↑', 'POWER DRAINED! ATK ↑', '#d27cff'); ST.stats.sigSteal = (ST.stats.sigSteal || 0) + 1; } });
    sfx('knock_whoosh'); return true; }
  if (id === 'om_hoa') {   /* Hoả Hùng: lao vào ÔM CHẶT -> lốc lửa siết 2 nhịp -> nổ tung hất bay, 60 % bỏng */
    const L0 = { t: 0, ph: 'go' }; a.sigU = dt => sigHug(f, a, foe, L0, dt); sfx('knock_whoosh'); return true; }
  if (id === 'nguu_xung') {   /* Ngưu Sơn: cúi sừng LAO thẳng, đường lao nứt đất -> chạm thì cột đá trồi hất đối thủ lên cao -> rơi đập đất */
    const L0 = { t: 0, ph: 'go', tx: foe.x, ty: foe.y, rut: 0 }; a.sigU = dt => sigGore(f, a, foe, L0, dt); sfx('knock_whoosh'); ST.ctx.quake && ST.ctx.quake(0.1); return true; }
  return false;
}
function sigHug(f, a, foe, S, dt) {   /* trả true khi còn giữ động tác */
  S.t += dt; const T0 = impactT(a.clip);
  if (S.ph === 'go') { a.t = T0; f.ct = T0; if (foe.dead) return false; const need = Math.max(10, sepNeed(f, foe) * 0.8), d = dist(f, foe);
    if (d > need) { const sp = 300; moveBy(f, (foe.x - f.x) / d * sp * dt, (foe.y - f.y) / d * sp * dt); clampField(f); face(f, foe.x, foe.y); if ((S.g = (S.g || 0) - dt) <= 0) { S.g = 0.035; ghostPush(f); } }
    if (dist(f, foe) <= need + 2 && !foe.dead && !foe.hide && !(foe.dig && foe.dig.ph === 'under')) { S.ph = 'hold'; S.t = 0; S.dir = foe.x >= f.x ? 1 : -1; f.hugFront = foe; foe.pin = 0.95; foe.kb = null; foe.dodge = null; foe.act = null; sigScene(a.id, f, foe, 'nham_sighoa2'); sigSay(foe.x, foe.y - 40, 'ÔM CHẶT!', 'BEAR HUG!', '#ffb52e');
      hit(f, foe, a.mv, { mul: 0.25, noMiss: false, kb: 0, noFlash: true, _now: 1 }); ST.stats.sigHug = (ST.stats.sigHug || 0) + 1; return true; }
    if (S.t > 0.22) { sigMiss(foe); S.ph = 'end'; } return true; }
  if (S.ph === 'hold') { const fr = Math.min(9, 6 + Math.floor(S.t * 8)) + 0.5; a.t = fr / FPS.hug; f.ct = a.t; f.fx = S.dir; f.fy = 0;
    if (!foe.dead) { const k = Math.min(1, S.t / 0.08), tx = foe.x - S.dir * Math.max(7, bodyW(f) * 0.5), ty = foe.y - 0.5; f.x += (tx - f.x) * k; f.y += (ty - f.y) * k; }   /* ÔM THẬT: 2 thân chồng nhau, gấu đứng sau đối thủ nửa thân, tay vòng qua (lớp trước: drawHugArms) */
    if (!S.b1 && S.t >= 0.42) { S.b1 = 1; if (!foe.dead) hit(f, foe, a.mv, { mul: 0.25, noMiss: true, kb: 0, noFlash: true, _now: 1 }); }
    if (S.t >= 0.78) { S.ph = 'end'; f.hugFront = null; const back = Math.max(10, sepNeed(f, foe) * 0.7); moveBy(f, -S.dir * back, 0); if (!foe.dead) { foe.pin = 0; hit(f, foe, a.mv, { mul: 0.6, noMiss: true, _now: 1 }); if (!foe.dead) { if (rnd() < 0.6) applyStatus(foe, 'bong'); const kd = dist(f, foe) || 1, ux = (foe.x - f.x) / kd || f.fx || 1, uy = (foe.y - f.y) / kd; foe.kb = { vx: ux * 300, vy: uy * 300, t: 0.32, fly: true, rut: 0, bounced: false }; } } }
    return true; }
  f.hugFront = null; a.t = Math.max(a.t, 10 / FPS.hug); return false;
}
function drawHugArms(g, f, cx, cy) {   /* tay gấu vòng qua TRƯỚC thân đối thủ: vẽ lại phần thân gấu phía trước (vùng ngực–tay) đè lên đối thủ */
  const foe = f.hugFront; if (!foe || f.dead) return; const s = f.fx >= 0 ? 1 : -1, h = standH(f), x0 = (globalThis.__R89||Math.round)(Math.min(f.x + s * 1, f.x + s * (bodyW(f) * 0.6 + 4)) - cx), x1 = (globalThis.__R89||Math.round)(Math.max(f.x + s * 1, f.x + s * (bodyW(f) * 0.6 + 4)) - cx), y0 = (globalThis.__R89||Math.round)(f.y - h * 0.78 - cy), y1 = (globalThis.__R89||Math.round)(f.y - h * 0.18 - cy);
  g.save(); g.beginPath(); g.rect(x0, y0, x1 - x0, y1 - y0); g.clip(); drawFighter(g, f, cx, cy); g.restore(); ST.stats.hugArms = (ST.stats.hugArms || 0) + 1;
}
function sigGore(f, a, foe, S, dt) {
  S.t += dt; const T0 = impactT(a.clip);
  if (S.ph === 'go') { a.t = T0; f.ct = T0; if (S.t < 0.12 && !foe.dead) { S.tx = foe.x; S.ty = foe.y; }
    const dx = S.tx - f.x, dy = S.ty - f.y, d = Math.hypot(dx, dy) || 1, sp = 330; if (!moveBy(f, dx / d * sp * dt, dy / d * sp * dt)) S.t = 9; clampField(f); face(f, f.x + dx, f.y + dy);
    if ((S.g = (S.g || 0) - dt) <= 0) { S.g = 0.035; ghostPush(f); DFX.dust(f.x - f.fx * 8, f.y, 2, -f.fx); }
    if ((S.rut -= sp * dt) <= 0) { S.rut = 16; ground(f.x - f.fx * 6, f.y + 1, CRACK, 0.6, 'small'); }
    S.seen = aoe(f, f.x, f.y, 14, 1.0, { seen: S.seen, noObj: false });
    if (!foe.dead && dist(f, foe) < Math.max(18, sepNeed(f, foe) + 3) && !foe.hide && !(foe.dig && foe.dig.ph === 'under')) {
      S.ph = 'toss'; S.t = 0; if (hit(f, foe, a.mv, { mul: 0.55, kb: 0, _now: 1 }) && !foe.dead) { foe.toss = 0.7; foe.tossT = 0.7; foe.tossH = 34; foe.pin = 0.72; foe.kb = null; S.hit = 1; sigScene(a.id, f, foe, 'chan_signs2'); sigSay(foe.x, foe.y - 46, 'HẤT TUNG!', 'TOSSED!', '#f6d29a'); ST.stats.sigToss = (ST.stats.sigToss || 0) + 1; } return true; }
    if (S.t > 0.62 || d < 4) { S.ph = 'end'; sigMiss(foe); DFX.dust(f.x, f.y, 5, f.fx); } return true; }
  if (S.ph === 'toss') { a.t = Math.min(clipLen(f, a.clip) - 0.05, T0 + S.t * 0.6); f.ct = a.t;
    if (S.hit && !S.land && S.t >= 0.7) { S.land = 1; if (!foe.dead) { foe.pin = 0; ground(foe.x, foe.y + 1, CRACK, 0.85, 'big'); aoe(f, foe.x, foe.y, 30, 1.2); hit(f, foe, a.mv, { mul: 0.55, noMiss: true, kb: 140, _now: 1 }); } }
    if (S.t > 0.8 || !S.hit) { S.ph = 'end'; } return true; }
  return false;
}
function updHyp(f, dt) {   /* đang bị thôi miên: lừ đừ bước về phía người thôi miên, không ra đòn; hết giờ thì ngủ */
  const H = f.hyp, by = H.by; H.t -= dt; f.act = null; f.dodge = null; f.plan = null; f.queued = null;
  const d = dist(f, by), need = sepNeed(f, by) + 6; if (!by.dead && d > need) { moveBy(f, (by.x - f.x) / d * 34 * dt, (by.y - f.y) / d * 34 * dt); face(f, by.x, by.y); f.moving = true; } else f.moving = false;
  const want = f.moving ? 'run' : 'idle'; if (f.clip !== want) { f.clip = want; f.ct = 0; } else f.ct += dt * 0.45;
  if (H.t <= 0 || by.dead) { f.hyp = null; f.moving = false; if (!by.dead) applyStatus(f, 'ngu'); }
}
/* p67:sig:end */
/* p96:engine:begin */
/* ===== p96: MOLANDAK (mascot Monad, hệ Chấn, Hiếm) — 5 chiêu riêng chạy qua sigFire (a.mv.mdk = id gốc), 3 dạng (độ lực MDKQ).
   Lăn Gai Húc: cuộn tròn LAO tới (cầu gai lăn, khung quả cầu lặp) → chạm: hất + cảnh *b. Bắn Gai Quạt: kim từ đỉnh lưng (MOUTH._c.mcast), dạng 2–3 bắn 2 loạt.
   Trề Môi: hơi 'hừ' từ môi (MOUTH._c.mpout) → đối thủ CÔNG −1 (+ rối). Cuộn Gai Thủ: cầu gai thủ (chặn đòn; cận chiến bị phản; tuyệt chiêu xuyên 50 %).
   Cầu Gai Vượt Ải: lăn xuyên đối thủ, dội 3 lần trong khung ±72 px quanh đối thủ, rồi bật cao đập xuống (cảnh ult2). Sát thương theo đồng hồ riêng (_now). ===== */
const MDKF = { molandak: 1, molandak2: 2, molandak3: 3 }, MDKQ = { 1: 1, 2: 1.35, 3: 1.75 }, MDKS = { 1: '', 2: '2', 3: '3' };
const mdkForm = f => MDKF[f.sp] || 1;
const MDKB = { mroll: [3, 5], mcurl: [1, 6] };   /* khung quả cầu (lặp khi lăn / giữ khi thủ) — đo trên gói ảnh */
function mdkBall(f, clip, k) { const [b0, b1] = MDKB[clip], n = b1 - b0 + 1, fr = b0 + (Math.floor(k) % n); f.clip = clip; f.ct = (fr + 0.5) / (FPS[clip] || 14); return f.ct; }
function mdkSay(x, y, vi, en, col) { text(x, y, ST.ctx.lang() === 'en' ? en : vi, col, 0.9, 1.3); }
function mdkFire(f, a, foe, K) {
  const b = a.mv.mdk, P = mdkForm(f), Q = MDKQ[P], S0 = MDKS[P]; ST.stats.mdk = ST.stats.mdk || {}; ST.stats.mdk[b] = (ST.stats.mdk[b] | 0) + 1;
  if (b === 'lan_gai') { const L0 = { t: 0, ph: 'go', k: 0, v: 280 + 25 * (P - 1) }; a.sigU = dt => mdkRoll(f, a, foe, L0, dt); sfx('knock_whoosh'); return true; }
  if (b === 'ban_gai') {
    const volley = (first) => { const hits = P === 3 ? [[0.44, 0.45], [0.48, 0.25], [0.52, 0.25]] : [[0.44, 0.5], [0.49, 0.25], [0.53, 0.25]]; let ok = false;
      hits.forEach(([t, mul], i) => sigAt(t, () => { if (f.dead || foe.dead) return; if (dist(f, foe) > rangeOf(f, a.id) + 18 || Math.abs(foe.y - (a.aimY ?? foe.y)) > 16 + i * 4) { if (!i && first) sigMiss(foe); return; }
        if (hit(f, foe, a.mv, { mul: mul * (first ? 1 : 0.7), noMiss: i > 0 || !first, kb: i === 2 ? 70 : 25, noFlash: i === 1, _now: 1 })) { ok = true; if (i === 2 && rnd() < 0.2 + 0.1 * (P - 1) && !foe.dead) { foe.stage.def = Math.max(-6, foe.stage.def - 1); mdkSay(foe.x, foe.y - 34, 'THỦ ↓', 'DEF ↓', '#ff8a6a'); } } })); };
    a.aimY = foe.y; volley(true); { const sc = DFX.CODE && DFX.find(f, a.id); if (sc) DFX.fired(sc, { at: { x: foe.x, y: foe.y } }); }
    if (P >= 2) ST.timers.push({ t: 0.36, fn: () => { if (f.dead || foe.dead) return; a.aimY = foe.y; if (DFX.CODE) { const sc2 = DFX.spawn(a.id, f, foe, 0.3, { noDefer: true }); if (sc2) DFX.fired(sc2, { at: { x: foe.x, y: foe.y } }); } volley(false); } });
    sfx('knock_whoosh'); duelSfx('beam_fire', { id: a.id, side: f.side }); return true; }
  if (b === 'tre_moi') {
    sigAt(0.48, () => { if (f.dead || foe.dead) return; if (dist(f, foe) > rangeOf(f, a.id) + 16) return sigMiss(foe);
      foe.stage.atk = Math.max(-6, foe.stage.atk - 1); mdkSay(foe.x, foe.y - 30, 'TỨC ĐIÊN! CÔNG ↓', 'FUMING! ATK ↓', '#ff8a6a');
      if (P === 3) foe.stage.spa = Math.max(-6, foe.stage.spa - 1);
      if (rnd() < 0.3 + 0.1 * (P - 1)) applyStatus(foe, 'roi'); ST.log.push({ t: +ST.t.toFixed(1), side: f.side, mv: a.id, stat: 'atk-1' }); ST.stats.mdkPout = (ST.stats.mdkPout | 0) + 1; });
    return true; }
  if (b === 'cuon_thu') { const T = 1.5 + 0.25 * (P - 1); f.mdkG = { until: ST.t + T, refl: 0.3 + 0.1 * (P - 1), n: 0 }; mdkSay(f.x, f.y - 30, 'CUỘN GAI THỦ!', 'SPIKE GUARD!', '#e7b8ee');
    const G = { t: 0, T }; a.sigU = dt => { G.t += dt; if (f.dead) return false; mdkBall(f, 'mcurl', G.t * 10); a.t = f.ct; if (G.t < T && f.mdkG) return true; f.mdkG = null; a.t = (MDKB.mcurl[1] + 1) / (FPS.mcurl || 12); f.ct = a.t; return false; };
    return true; }
  if (b === 'cau_gai') { const L0 = { t: 0, ph: 'roll', k: 0, n: 0, hitT: 0, cx: foe.x, cy: foe.y, dir: foe.x >= f.x ? 1 : -1, W: 66 + 6 * P, v: 330 + 20 * (P - 1), first: true };
    foe.pin = 3; foe.kb = null; foe.dodge = null; a.sigU = dt => mdkUlt(f, a, foe, L0, dt); sfx('knock_whoosh'); return true; }
  return false;
}
function mdkRoll(f, a, foe, S, dt) {   /* Lăn Gai Húc — trả true khi còn lăn */
  S.t += dt; S.k += dt * 16;
  if (S.ph === 'go') { mdkBall(f, 'mroll', S.k); a.t = f.ct; if (S.t < 0.1 && !foe.dead) { S.tx = foe.x; S.ty = foe.y; }
    const dx = S.tx - f.x, dy = S.ty - f.y, d = Math.hypot(dx, dy) || 1; if (!moveBy(f, dx / d * S.v * dt, dy / d * S.v * dt)) S.t = 9; clampField(f); face(f, f.x + dx, f.y + dy);
    if ((S.g = (S.g || 0) - dt) <= 0) { S.g = 0.04; ghostPush(f); }
    S.seen = aoe(f, f.x, f.y, 12, 0.9, { seen: S.seen, noObj: true });
    if (!foe.dead && dist(f, foe) < Math.max(18, sepNeed(f, foe) + 3) && !foe.hide && !(foe.dig && foe.dig.ph === 'under')) { S.ph = 'back'; S.t = 0;
      if (hit(f, foe, a.mv, { kb: 150, _now: 1 })) { sigScene(a.id, f, foe, 'chan_mdk1b' + MDKS[mdkForm(f)]); ST.stats.mdkRollHit = (ST.stats.mdkRollHit | 0) + 1; } return true; }
    if (S.t > 0.75 || d < 4) { S.ph = 'back'; S.t = 0; if (!foe.dead) sigMiss(foe); DFX.dust(f.x, f.y, 4, f.fx); } return true; }
  if (S.ph === 'back') { mdkBall(f, 'mroll', S.k * 0.6); a.t = f.ct; if (S.t < 0.14) moveBy(f, -f.fx * 90 * dt, 0); clampField(f); if (S.t < 0.22) return true;
    a.t = (MDKB.mroll[1] + 1) / (FPS.mroll || 14); f.ct = a.t; return false; }
  return false;
}
function mdkUlt(f, a, foe, S, dt) {   /* Cầu Gai Vượt Ải */
  S.t += dt; S.k += dt * 20; const P = mdkForm(f), suf = MDKS[P];
  if (S.ph === 'roll') { mdkBall(f, 'mroll', S.k); a.t = f.ct; foe.pin = Math.max(foe.pin || 0, 0.5);
    const tx = S.cx + S.dir * S.W, ty = foe.dead ? S.cy : foe.y, dx = tx - f.x, dy = (ty - f.y) * 4, d = Math.hypot(dx, dy) || 1;
    const blocked = !moveBy(f, dx / d * S.v * dt, dy / d * S.v * dt); clampField(f); face(f, f.x + S.dir, f.y);
    if ((S.g = (S.g || 0) - dt) <= 0) { S.g = 0.035; ghostPush(f); DFX.dust(f.x - S.dir * 6, f.y, 1, -S.dir); }
    if ((S.rut = (S.rut || 0) - S.v * dt) <= 0) { S.rut = 18; ground(f.x - S.dir * 4, f.y + 1, CRACK, 0.5, 'small'); }
    if ((S.hitT -= dt) <= 0 && !foe.dead && dist(f, foe) < Math.max(16, sepNeed(f, foe) + 2)) { S.hitT = 0.3;
      if (hit(f, foe, a.mv, { mul: 0.16, noMiss: !S.first, kb: 0, noFlash: !S.first, _now: 1 })) { S.first = false; if (DFX.CODE) DFX.burst(foe.x, foe.y - 8, 'chan', 0.6 + 0.1 * P, foe.y + 0.5); foe.pin = 1.2; } }
    if (blocked || Math.abs(f.x - tx) < 5 || S.t > 0.9) { S.n++; S.t = 0; S.dir = -S.dir; if (DFX.CODE) DFX.dust(f.x, f.y, 5, S.dir); if (ST.ctx.quake) ST.ctx.quake(0.06); sfx('knock_whoosh');
      if (S.n >= 3) { S.ph = 'leap'; S.t = 0; S.x0 = f.x; S.y0 = f.y; if (!f.ultWarned) { f.ultWarned = true; warnEdge(f, 0.42, a.id); } } }
    return true; }
  if (S.ph === 'leap') { const T = 0.42, k = Math.min(1, S.t / T), tx = foe.dead ? S.cx : foe.x, ty = foe.dead ? S.cy : foe.y;
    f.x = S.x0 + (tx - S.x0) * k; f.y = S.y0 + (ty + 0.5 - S.y0) * k; f.alt = Math.sin(Math.PI * k) * (30 + 4 * P);
    mdkBall(f, 'mcurl', S.k * 0.5); a.t = f.ct; if (!foe.dead) foe.pin = Math.max(foe.pin || 0, 0.5); if ((S.g = (S.g || 0) - dt) <= 0) { S.g = 0.05; ghostPush(f); }
    if (k < 1) return true;
    f.alt = 0; S.ph = 'slam'; S.t = 0; const px = f.x, py = f.y; { const q = nearWalk(ST.ctx, f.x - S.dir * 10, f.y); f.x = q.x; f.y = q.y; }
    ground(px, py + 1, CRACK, 0.95, 'big'); aoe(f, px, py, 46 + 6 * P, 1.4); if (ST.ctx.quake) ST.ctx.quake(0.35 + 0.05 * P); sfx('smash');
    if (!foe.dead) { foe.pin = 0; sigScene(a.id, f, foe, 'chan_mdk' + suf + 'ult2'); if (hit(f, foe, a.mv, { mul: 0.62, noMiss: true, kb: 170, _now: 1 }) && !foe.dead) mdkSay(foe.x, foe.y - 44, 'VƯỢT ẢI!', 'NO SHORTCUTS!', '#e7b8ee'); }
    ST.stats.mdkUlt = (ST.stats.mdkUlt | 0) + 1; f.clip = 'mult'; return true; }
  if (S.ph === 'slam') { const fr = 8 + Math.min(3, Math.floor(S.t * 10)); f.clip = 'mult'; a.clip = 'mult'; a.t = (fr + 0.5) / (FPS.mult || 12); f.ct = a.t; if (S.t < 0.3) return true; return false; }
  return false;
}
function mdkGuard(att, def, mv, o) {   /* gọi trong hit(): false = chặn hẳn · object = o mới (xuyên 50 %) · null = bình thường */
  const G = def.mdkG; if (!G || ST.t > G.until || att === def || def.dead) return null;
  if (mv.ult) { mdkSay(def.x, def.y - 30, 'GIẢM ĐÒN!', 'GUARDED!', '#e7b8ee'); return { ...o, mul: (o.mul || 1) * 0.5 }; }
  G.n++; mdkSay(def.x, def.y - 30, 'CHẶN!', 'BLOCKED!', '#e7b8ee'); if (DFX.CODE) DFX.burst(def.x, def.y - 6, 'chan', 0.45, def.y + 0.5); ST.stats.mdkBlock = (ST.stats.mdkBlock | 0) + 1;
  const melee = mv.id === 'huc' || mv.shape === 'can' || !!(att.act && (att.act.dash || att.act.dash2 || (att.act.mv && att.act.mv.p84d))) || dist(att, def) < 30;
  if (melee && !att.dead) { const r = calcDamage(att.lv, mv.pow ? mv : MOVES.huc, statsFor(att), statsFor(def), { weather: ST.weather }), rd = Math.max(1, Math.round(r.dmg * G.refl)); att.hp = Math.max(0, att.hp - rd); att.flash = 0.034;
    text(att.x, att.y - 26, String(rd), '#e7b8ee', 1); mdkSay(att.x, att.y - 40, 'BỊ GAI ĐÂM!', 'SPIKED!', '#ff8a6a'); sigScene('cuon_thu', def, att, 'chan_mdk4b' + MDKS[mdkForm(def)]); ST.stats.mdkRefl = (ST.stats.mdkRefl | 0) + 1;
    const kd = dist(att, def) || 1; if (!(att.pin > 0)) att.kb = { vx: (att.x - def.x) / kd * 110, vy: (att.y - def.y) / kd * 110, t: 0.16 }; if (att.act && !att.act.ult) { att.act = null; att.clip = 'hurt'; att.ct = 0; att.hurtT = 0.3; } if (att.hp <= 0) faint(att); }
  return false;
}
function mdkW(f, id, k, foe, d) {   /* AI: trọng số chiêu Molandak */
  const b = MOVES[id].mdk;
  if (b === 'cuon_thu') return f.mdkG ? 0 : (foe.act && !foe.act.fired && d < 90 && foe.act.id !== 'huc') ? 3.2 : (foe.act && d < 40) ? 1.4 : d < 50 ? 0.5 : 0.12;
  if (b === 'tre_moi') return foe.stage.atk <= -2 ? 0.08 : d > rangeOf(f, id) ? 0.15 : 0.9;
  if (b === 'lan_gai') return d < 40 ? k * 0.6 : k * 1.2;
  if (b === 'ban_gai') return d < 40 ? k * 0.6 : k;
  return k;
}
const MDK96 = { lan_gai: 1, ban_gai: 1, tre_moi: 1, cuon_thu: 1, cau_gai: 1 };
/* p96:engine:end */
/* p99:engine:begin */
/* ===== p99: MOYAKI (mascot Monad, mèo-cá tím, hệ Triều, Hiếm) — 5 chiêu riêng chạy qua sigFire (a.mv.myk = id gốc), 3 dạng (độ lực theo dạng).
   Quẫy Vây Lướt: nằm bụng trượt LAO tới (khung trượt lặp) → chạm: hất + cảnh *b; đường trượt để vệt nước 1 s làm chậm (vùng 'myk_trail').
   Bong Bóng Trề Môi: 3 bóng (dạng 3: 4) từ MÔI (MOUTH._c.yblow) bay lượn tới; bóng cuối 30 % làm ƯỚT (chậm 2 s).
   Liếc Khinh Khỉnh: thủ đặc biệt đối thủ −1, tốc Moyaki +1. Bơi Ngược Dòng: hồi 25 % máu + VỮNG (không bị hất) 2 s; máu < 1/3 thì công đặc biệt +1.
   Cá Chép Vượt Vũ Môn: thác nước dâng (cảnh code) → vọt lên cao → bổ nhào xuống đối thủ thành vòi nước nện vùng. Sát thương theo đồng hồ riêng (_now). ===== */
const MYKF = { moyaki: 1, moyaki2: 2, moyaki3: 3 }, MYKS = { 1: '', 2: '2', 3: '3' };
const mykForm = f => MYKF[f.sp] || 1;
const MYKB = { ydash: [3, 5] };   /* khung trượt bụng (lặp khi lướt) — đo trên gói ảnh */
const MYKU = { rise: 1, leap: [2, 5], dive: 6, slam: [7, 11] };   /* tuyệt chiêu: khung vọt lên / bổ nhào / nện — đo trên gói ảnh yult */
function mykLoop(f, clip, k) { const [b0, b1] = MYKB[clip], n = b1 - b0 + 1, fr = b0 + (Math.floor(k) % n); f.clip = clip; f.ct = (fr + 0.5) / (FPS[clip] || 14); return f.ct; }
function mykFr(f, clip, fr) { f.clip = clip; f.ct = (fr + 0.5) / (FPS[clip] || 12); return f.ct; }
function mykSay(x, y, vi, en, col) { text(x, y, ST.ctx.lang() === 'en' ? en : vi, col, 0.9, 1.3); }
function mykFire(f, a, foe, K) {
  const b = a.mv.myk, P = mykForm(f); ST.stats.myk = ST.stats.myk || {}; ST.stats.myk[b] = (ST.stats.myk[b] | 0) + 1;
  if (b === 'quay_vay') { const L0 = { t: 0, ph: 'go', k: 0, v: 290 + 20 * (P - 1), tr: 0 }; a.sigU = dt => mykDash(f, a, foe, L0, dt); sfx('knock_whoosh'); return true; }
  if (b === 'bong_bong') {
    const MUL = P === 3 ? [0.32, 0.22, 0.22, 0.34] : [0.42, 0.26, 0.4], T = MUL.map((_, i) => 0.58 + 0.12 * i); let first = true;
    a.aimY = foe.y; { const sc = DFX.CODE && DFX.find(f, a.id); if (sc) DFX.fired(sc, { at: { x: foe.x, y: foe.y } }); }
    MUL.forEach((mul, i) => sigAt(T[i], () => { if (f.dead || foe.dead) return; if (dist(f, foe) > rangeOf(f, a.id) + 18 || Math.abs(foe.y - (a.aimY ?? foe.y)) > 18 + i * 4) { if (first) { first = false; sigMiss(foe); } return; }
      const last = i === MUL.length - 1; if (hit(f, foe, a.mv, { mul, noMiss: !first, kb: last ? 70 : 20, noFlash: !first && !last, _now: 1 })) { first = false;
        if (last && !foe.dead && rnd() < 0.3 + 0.1 * (P - 1)) { foe.slowT = Math.max(foe.slowT || 0, 2); mykSay(foe.x, foe.y - 34, 'ƯỚT SŨNG! CHẬM ↓', 'SOAKED! SLOWED', '#9fe0ff'); ST.stats.mykWet = (ST.stats.mykWet | 0) + 1; } } }));
    sfx('knock_whoosh'); duelSfx('beam_fire', { id: a.id, side: f.side }); return true; }
  if (b === 'liec_mat') {
    sigAt(0.46, () => { if (f.dead || foe.dead) return; if (dist(f, foe) > rangeOf(f, a.id) + 16) return sigMiss(foe);
      foe.stage.spd = Math.max(-6, (foe.stage.spd || 0) - 1); f.stage.spe = Math.min(6, (f.stage.spe || 0) + 1); if (P === 3) foe.stage.acc = Math.max(-6, (foe.stage.acc || 0) - 1);
      mykSay(foe.x, foe.y - 30, 'BỊ COI THƯỜNG! THỦ Đ.B ↓', 'SNUBBED! SP.DEF ↓', '#ff8a6a'); mykSay(f.x, f.y - 30, 'TỐC ↑', 'SPEED ↑', '#9fe8ff');
      ST.log.push({ t: +ST.t.toFixed(1), side: f.side, mv: a.id, stat: 'spd-1' }); ST.stats.mykEye = (ST.stats.mykEye | 0) + 1; });
    return true; }
  if (b === 'nguoc_dong') {
    sigAt(0.42, () => { if (f.dead) return; const low = f.hp < f.max / 3, hv = Math.round(f.max * (0.25 + 0.05 * (P - 1))); f.hp = Math.min(f.max, f.hp + hv); text(f.x, f.y - 26, L(ST.ctx).heal(hv), '#7ee08a', 1);
      f.mykSteady = ST.t + 2 + 0.5 * (P - 1); f.kb = null; mykSay(f.x, f.y - 40, 'BƠI NGƯỢC DÒNG! VỮNG', 'UPSTREAM GRIT! STEADY', '#9fe0ff');
      if (low) { f.stage.spa = Math.min(6, (f.stage.spa || 0) + 1); mykSay(f.x, f.y - 52, 'CÔNG Đ.B ↑', 'SP.ATK ↑', '#ffd45e'); }
      ST.stats.mykHeal = (ST.stats.mykHeal | 0) + 1; });
    return true; }
  if (b === 'vuot_thac') { const L0 = { t: 0, ph: 'rise', k: 0, x0: f.x, y0: f.y, cx: foe.x, cy: foe.y };
    a.sigU = dt => mykUlt(f, a, foe, L0, dt); sfx('knock_whoosh'); return true; }
  return false;
}
function mykDash(f, a, foe, S, dt) {   /* Quẫy Vây Lướt — trả true khi còn trượt */
  S.t += dt; S.k += dt * 14;
  if (S.ph === 'go') { mykLoop(f, 'ydash', S.k); a.t = f.ct; if (S.t < 0.1 && !foe.dead) { S.tx = foe.x; S.ty = foe.y; }
    const dx = S.tx - f.x, dy = S.ty - f.y, d = Math.hypot(dx, dy) || 1; if (!moveBy(f, dx / d * S.v * dt, dy / d * S.v * dt)) S.t = 9; clampField(f); face(f, f.x + dx, f.y + dy);
    if ((S.g = (S.g || 0) - dt) <= 0) { S.g = 0.045; ghostPush(f); }
    if ((S.tr -= S.v * dt) <= 0) { S.tr = 12; (ST.zones = ST.zones || []).push({ k: 'myk_trail', x: f.x, y: f.y, r: 9, t: 0, T: 1.0, f, mv: { pow: 0 }, K: { slow: 1, tick: 9 }, tick: 9 }); }   /* vệt nước: đối thủ dẫm vào chậm (vẽ: cảnh code) */
    S.seen = aoe(f, f.x, f.y, 12, 0.9, { seen: S.seen, noObj: true });
    if (!foe.dead && dist(f, foe) < Math.max(18, sepNeed(f, foe) + 3) && !foe.hide && !(foe.dig && foe.dig.ph === 'under')) { S.ph = 'back'; S.t = 0;
      if (hit(f, foe, a.mv, { kb: 140, _now: 1 })) { sigScene(a.id, f, foe, 'trieu_myk1b' + MYKS[mykForm(f)]); ST.stats.mykDashHit = (ST.stats.mykDashHit | 0) + 1; } return true; }
    if (S.t > 0.75 || d < 4) { S.ph = 'back'; S.t = 0; if (!foe.dead) sigMiss(foe); } return true; }
  if (S.ph === 'back') { if (S.t < 0.14) moveBy(f, -f.fx * 80 * dt, 0); clampField(f); const fr = Math.min(7, 6 + Math.floor(S.t * 10)); a.t = mykFr(f, 'ydash', fr); if (S.t < 0.22) return true;
    a.t = clipLen(f, 'ydash'); f.ct = a.t; return false; }
  return false;
}
function mykUlt(f, a, foe, S, dt) {   /* Cá Chép Vượt Vũ Môn */
  S.t += dt; const P = mykForm(f), suf = MYKS[P];
  if (S.ph === 'rise') { const T = 0.5; a.t = mykFr(f, 'yult', Math.min(MYKU.rise, Math.floor(S.t / T * 2))); if (!foe.dead) { foe.pin = Math.max(foe.pin || 0, 0.3); S.cx = foe.x; S.cy = foe.y; }
    if (S.t < T) return true; S.ph = 'leap'; S.t = 0; S.x0 = f.x; S.y0 = f.y; if (ST.ctx.quake) ST.ctx.quake(0.08); sfx('knock_whoosh'); return true; }
  if (S.ph === 'leap') { const T = 0.5, k = Math.min(1, S.t / T), tx = foe.dead ? S.cx : foe.x, ty = foe.dead ? S.cy : foe.y;
    f.x = S.x0 + (tx - S.x0) * k; f.y = S.y0 + (ty + 0.5 - S.y0) * k; f.alt = Math.sin(Math.PI * Math.min(1, k * 1.15)) * (10 + 2 * P) * (k < 0.87 ? 1 : (1 - k) / 0.13);   /* clip yult đã tự vọt cao trong khung — chỉ nhấc thêm ít */
    const [l0, l1] = MYKU.leap; a.t = mykFr(f, 'yult', k < 0.75 ? l0 + Math.min(l1 - l0, Math.floor(k * 4)) : MYKU.dive); face(f, tx, ty);
    if (!foe.dead) foe.pin = Math.max(foe.pin || 0, 0.4); if ((S.g = (S.g || 0) - dt) <= 0) { S.g = 0.05; ghostPush(f); }
    if (!f.ultWarned && T - S.t <= 0.3) { f.ultWarned = true; warnEdge(f, Math.max(0.1, T - S.t), a.id); }
    if (k < 1) return true;
    f.alt = 0; S.ph = 'slam'; S.t = 0; const px = f.x, py = f.y; { const q = nearWalk(ST.ctx, f.x, f.y + 6); f.x = q.x; f.y = q.y; }
    ground(px, py + 1, CRACK, 0.6, 'small'); aoe(f, px, py, 44 + 6 * P, 1.4); if (ST.ctx.quake) ST.ctx.quake(0.32 + 0.05 * P); sfx('smash');
    if (!foe.dead) { foe.pin = 0; sigScene(a.id, f, foe, 'trieu_myk' + suf + 'ult2'); if (hit(f, foe, a.mv, { mul: 1, noMiss: true, kb: 170, _now: 1 }) && !foe.dead) mykSay(foe.x, foe.y - 44, 'VƯỢT VŨ MÔN!', 'DRAGON GATE!', '#9fe0ff'); }
    ST.stats.mykUlt = (ST.stats.mykUlt | 0) + 1; return true; }
  if (S.ph === 'slam') { const [s0, s1] = MYKU.slam; a.t = mykFr(f, 'yult', Math.min(s1, s0 + Math.floor(S.t * 12))); if (S.t < 0.32) return true; a.t = clipLen(f, 'yult'); f.ct = a.t; return false; }
  return false;
}
function mykW(f, id, k, foe, d) {   /* AI: trọng số chiêu Moyaki */
  const b = MOVES[id].myk;
  if (b === 'nguoc_dong') return f.mykSteady > ST.t ? 0 : f.hp < f.max * 0.5 ? 2.6 : f.hp < f.max * 0.8 ? 0.45 : 0.04;
  if (b === 'liec_mat') return (foe.stage.spd || 0) <= -2 ? 0.08 : d > rangeOf(f, id) ? 0.15 : 0.8;
  if (b === 'quay_vay') return d < 40 ? k * 0.6 : k * 1.2;
  if (b === 'bong_bong') return d < 40 ? k * 0.6 : k;
  return k;
}
const MYK99 = { quay_vay: 1, bong_bong: 1, liec_mat: 1, nguoc_dong: 1, vuot_thac: 1 };
/* p99:engine:end */
/* p100:engine:begin */
/* ===== p100: CHOG (mascot Monad, mặt trắng bờm gai tím, ĐỨNG 2 CHÂN, hệ Mã, Hiếm) — 5 chiêu riêng chạy qua sigFire (a.mv.chg = id gốc), 3 dạng (độ lực theo dạng).
   Tin Nóng Lướt Tới: chúi đầu LAO tới (khung lao lặp) → chạm: hất + đối thủ KHỰNG 0,4 s + cảnh *b.
   Bờm Gai Nhiễu Sóng: xù bờm, 6 gai (dạng 3: 8) toả tròn từ BỜM (MOUTH._c.gmane) — đối thủ trong vòng r trúng; 25 % NHIỄU: đòn kế của đối thủ trượt.
   Phỏng Vấn Bất Ngờ: chìa micro (MOUTH._c.gmic = tay) — đối thủ ĐỨNG HÌNH 1 s (đứng im, khung giật) rồi thủ đặc biệt −1; dạng 2–3: câu hỏi thứ 2 (chính xác −1).
   Cười Tít Lách Mã: thân nhoè 2 bóng ảo 1,5 s, NÉ TRỌN đòn kế tiếp (kể cả tuyệt chiêu); tốc +1.
   Bản Tin Lịch Sử (tuyệt chiêu): màn hình bản tin LIVE dựng sau lưng đối thủ, 3 dải tin chạy quét qua (3 nhịp), màn vỡ thành điểm ảnh nổ vùng. Sát thương theo đồng hồ riêng (_now). ===== */
const CHGF = { chog: 1, chog2: 2, chog3: 3 }, CHGS = { 1: '', 2: '2', 3: '3' };
const chgForm = f => CHGF[f.sp] || 1;
const CHGB = { gdash: [2, 4] };   /* khung lao (lặp khi lướt) — đo trên gói ảnh */
const CHGU = { wide: [3, 6], point: [7, 9] };   /* tuyệt chiêu: khung dang tay dẫn tin / khung chỉ tay — đo trên gói ảnh gult */
function chgLoop(f, clip, k) { const [b0, b1] = CHGB[clip], n = b1 - b0 + 1, fr = b0 + (Math.floor(k) % n); f.clip = clip; f.ct = (fr + 0.5) / (FPS[clip] || 14); return f.ct; }
function chgFr(f, clip, fr) { f.clip = clip; f.ct = (fr + 0.5) / (FPS[clip] || 12); return f.ct; }
function chgSay(x, y, vi, en, col) { text(x, y, ST.ctx.lang() === 'en' ? en : vi, col, 0.9, 1.3); }
function chgFire(f, a, foe, K) {
  const b = a.mv.chg, P = chgForm(f); ST.stats.chg = ST.stats.chg || {}; ST.stats.chg[b] = (ST.stats.chg[b] | 0) + 1;
  if (b === 'tin_nong') { const L0 = { t: 0, ph: 'go', k: 0, v: 300 + 20 * (P - 1) }; a.sigU = dt => chgDash(f, a, foe, L0, dt); sfx('knock_whoosh'); return true; }
  if (b === 'bom_gai') {
    const R = rangeOf(f, a.id); sigAt(0.42, () => { if (f.dead) return; aoe(f, f.x, f.y, R, 0.6, { noObj: true }); if (foe.dead) return; if (dist(f, foe) > R + 8) return sigMiss(foe);
      if (hit(f, foe, a.mv, { kb: 80, _now: 1 }) && !foe.dead) { ST.stats.chgMane = (ST.stats.chgMane | 0) + 1;
        if (rnd() < 0.25 + 0.05 * (P - 1)) { foe.chgJam = ST.t + 5; chgSay(foe.x, foe.y - 34, 'NHIỄU SÓNG!', 'STATIC!', '#86ffc8'); ST.stats.chgJamOn = (ST.stats.chgJamOn | 0) + 1; } } });
    sfx('knock_whoosh'); return true; }
  if (b === 'phong_van') {
    sigAt(0.5, () => { if (f.dead || foe.dead) return; if (dist(f, foe) > rangeOf(f, a.id) + 16) return sigMiss(foe);
      if (rnd() * 100 > a.mv.acc) return sigMiss(foe);
      const T = 1 + 0.15 * (P - 1); foe.chgFrz = ST.t + T; foe.act = null; foe.dodge = null; foe.kb = null; foe.plan = null; foe.queued = null; foe.moving = false;
      chgSay(foe.x, foe.y - 30, 'ĐỨNG HÌNH!', 'FROZEN ON AIR!', '#86ffc8'); ST.stats.chgFrz = (ST.stats.chgFrz | 0) + 1;
      ST.timers.push({ t: T, fn: () => { if (foe.dead) return; foe.stage.spd = Math.max(-6, (foe.stage.spd || 0) - 1); chgSay(foe.x, foe.y - 30, 'THỦ Đ.B ↓', 'SP.DEF ↓', '#ff8a6a');
        if (P >= 2) { foe.stage.acc = Math.max(-6, (foe.stage.acc || 0) - 1); chgSay(foe.x, foe.y - 42, 'CÂU HỎI 2: CHÍNH XÁC ↓', 'FOLLOW-UP: ACC ↓', '#ff8a6a'); }
        ST.log.push({ t: +ST.t.toFixed(1), side: f.side, mv: a.id, stat: 'spd-1' }); ST.stats.chgSpd = (ST.stats.chgSpd | 0) + 1; } }); });
    return true; }
  if (b === 'cuoi_tit') {
    sigAt(0.36, () => { if (f.dead) return; const T = 1.5 + 0.25 * (P - 1); f.chgDodge = ST.t + T; f.stage.spe = Math.min(6, (f.stage.spe || 0) + 1);
      chgSay(f.x, f.y - 34, 'LÁCH MÃ! TỐC ↑', 'GLITCH DODGE! SPEED ↑', '#86ffc8'); ST.stats.chgGig = (ST.stats.chgGig | 0) + 1;
      for (let i = 0; i < Math.round(T / 0.1); i++) ST.timers.push({ t: i * 0.1, fn: () => { if (f.chgDodge > ST.t && !f.dead) ghostPush(f); } }); });
    return true; }
  if (b === 'ban_tin') { const L0 = { t: 0, ph: 'show', cx: foe.x, cy: foe.y, n: 0, first: true };
    foe.pin = Math.max(foe.pin || 0, 0.6); foe.kb = null; foe.dodge = null; a.sigU = dt => chgUlt(f, a, foe, L0, dt); sfx('knock_whoosh'); return true; }
  return false;
}
function chgDash(f, a, foe, S, dt) {   /* Tin Nóng Lướt Tới — trả true khi còn lao */
  S.t += dt; S.k += dt * 16;
  if (S.ph === 'go') { chgLoop(f, 'gdash', S.k); a.t = f.ct; if (S.t < 0.1 && !foe.dead) { S.tx = foe.x; S.ty = foe.y; }
    const dx = S.tx - f.x, dy = S.ty - f.y, d = Math.hypot(dx, dy) || 1; if (!moveBy(f, dx / d * S.v * dt, dy / d * S.v * dt)) S.t = 9; clampField(f); face(f, f.x + dx, f.y + dy);
    if ((S.g = (S.g || 0) - dt) <= 0) { S.g = 0.04; ghostPush(f); }
    S.seen = aoe(f, f.x, f.y, 12, 0.9, { seen: S.seen, noObj: true });
    if (!foe.dead && dist(f, foe) < Math.max(18, sepNeed(f, foe) + 3) && !foe.hide && !(foe.dig && foe.dig.ph === 'under')) { S.ph = 'back'; S.t = 0;
      if (hit(f, foe, a.mv, { kb: 120, _now: 1 })) { sigScene(a.id, f, foe, 'ma_chg1b' + CHGS[chgForm(f)]); ST.stats.chgDashHit = (ST.stats.chgDashHit | 0) + 1;
        if (!foe.dead && !(foe.act && foe.act.ult)) { foe.hurtT = Math.max(foe.hurtT || 0, 0.4 + 0.05 * (chgForm(f) - 1)); chgSay(foe.x, foe.y - 40, 'TIN NÓNG!', 'BREAKING!', '#86ffc8'); } } return true; }
    if (S.t > 0.75 || d < 4) { S.ph = 'back'; S.t = 0; if (!foe.dead) sigMiss(foe); } return true; }
  if (S.ph === 'back') { if (S.t < 0.12) moveBy(f, -f.fx * 70 * dt, 0); clampField(f); const n = (SPR[f.sp] && SPR[f.sp].gdash && SPR[f.sp].gdash.n) || 8; a.t = chgFr(f, 'gdash', Math.min(n - 1, 6 + Math.floor(S.t * 10))); if (S.t < 0.22) return true;
    a.t = clipLen(f, 'gdash'); f.ct = a.t; return false; }
  return false;
}
function chgUlt(f, a, foe, S, dt) {   /* Bản Tin Lịch Sử — mốc khớp cảnh ma_chg*ult (giờ cảnh = 0,4 + S.t): màn dựng 0,5 · dải tin 0,8 / 1,05 / 1,3 · vỡ màn 1,6 */
  S.t += dt; const P = chgForm(f), suf = CHGS[P], T = 0.4 + S.t;
  if (!foe.dead && S.ph !== 'end') { foe.pin = Math.max(foe.pin || 0, 0.3); foe.kb = null; face(f, foe.x, foe.y); }
  const [w0, w1] = CHGU.wide, [p0, p1] = CHGU.point;
  a.t = T < 1.5 ? chgFr(f, 'gult', w0 + (Math.floor(S.t * 6) % (w1 - w0 + 1))) : chgFr(f, 'gult', Math.min(p1, p0 + Math.floor((T - 1.5) * 12)));
  for (const [i, tt] of [[0, 0.8], [1, 1.05], [2, 1.3]]) if (S.n === i && T >= tt) { S.n++;
    if (!foe.dead && Math.abs(foe.y - S.cy) < 26 && Math.abs(foe.x - S.cx) < 60) { if (hit(f, foe, a.mv, { mul: 0.17, noMiss: !S.first, kb: 0, noFlash: !S.first && i !== 2, _now: 1 })) { S.first = false; foe.pin = Math.max(foe.pin || 0, 0.5); } }
    if (i === 0 && !f.ultWarned) { f.ultWarned = true; warnEdge(f, 0.8, a.id); } }
  if (S.ph === 'show' && T >= 1.6) { S.ph = 'end'; aoe(f, S.cx, S.cy, 46 + 6 * P, 1.4); if (ST.ctx.quake) ST.ctx.quake(0.32 + 0.05 * P); sfx('smash');
    if (!foe.dead) { foe.pin = 0; if (hit(f, foe, a.mv, { mul: 0.62, noMiss: true, kb: 170, _now: 1 }) && !foe.dead) chgSay(foe.x, foe.y - 44, 'LỊCH SỬ!', 'HISTORY!', '#86ffc8'); }
    ST.stats.chgUlt = (ST.stats.chgUlt | 0) + 1; }
  if (S.ph === 'end' && T >= 1.9) { a.t = clipLen(f, 'gult'); f.ct = a.t; return false; }
  return true;
}
function chgGuard(att, def, mv) {   /* gọi trong hit() trước P78: false = đòn trượt (Lách Mã / Nhiễu Sóng) · null = bình thường */
  if (att === def || def.dead) return null;
  if (def.chgDodge > ST.t) { def.chgDodge = 0; chgSay(def.x, def.y - 30, 'LÁCH MÃ!', 'GLITCHED OUT!', '#86ffc8'); if (DFX.CODE) DFX.burst(def.x, def.y - 8, 'ma', 0.5, def.y + 0.5); ST.stats.chgDodged = (ST.stats.chgDodged | 0) + 1; return false; }
  if (att.chgJam > ST.t) { att.chgJam = 0; chgSay(att.x, att.y - 30, 'NHIỄU! TRƯỢT', 'STATIC! MISSED', '#86ffc8'); if (DFX.CODE) DFX.burst(att.x, att.y - 8, 'ma', 0.35, att.y + 0.5); ST.stats.chgJammed = (ST.stats.chgJammed | 0) + 1; return false; }
  return null;
}
function chgFrzU(f, dt) {   /* Phỏng Vấn Bất Ngờ: đứng hình — đứng im, khung giật (nhảy khung qua lại) */
  f.act = null; f.dodge = null; f.plan = null; f.moving = false; if (f.clip !== 'hurt' && f.clip !== 'idle') f.clip = 'idle';
  if ((f.frzJ = (f.frzJ || 0) - dt) <= 0) { f.frzJ = 0.09; f.ct = (f.ct > 0.2 ? 0 : 0.26); }
}
function chgW(f, id, k, foe, d) {   /* AI: trọng số chiêu Chog */
  const b = MOVES[id].chg;
  if (b === 'cuoi_tit') return f.chgDodge > ST.t ? 0 : (foe.act && !foe.act.fired && d < 120) ? 2.8 : 0.35;
  if (b === 'phong_van') return foe.chgFrz > ST.t ? 0 : (foe.stage.spd || 0) <= -2 ? 0.15 : d > rangeOf(f, id) ? 0.2 : 1.0;
  if (b === 'bom_gai') return d > rangeOf(f, id) ? 0.05 : k * 1.3;
  if (b === 'tin_nong') return d < 40 ? k * 0.5 : k * 1.2;
  return k;
}
const CHG100 = { tin_nong: 1, bom_gai: 1, phong_van: 1, cuoi_tit: 1, ban_tin: 1 };
/* p100:engine:end */
function skEmerge(f) {   /* trồi lên từ bóng của đối thủ, đánh ×1,5 */
  const foe = foeOf(f); f.hide = null; if (foe.dead) return; const side = foe.x >= f.x ? -1 : 1, q = nearWalk(ST.ctx, foe.x + side * 18, foe.y); f.x = q.x; f.y = q.y; face(f, foe.x, foe.y);
  if (DFX.CODE) DFX.boom(foe.x, foe.y, 'anh', 0.7); else { x2('anh_vung', foe.x, foe.y + 1, { ground: true }); hitFx('anh', foe.x, foe.y); } hit(f, foe, MOVES.vuot_bong || MOVES.huc, { mul: 1.5, noMiss: true, kb: 120 }); f.clip = 'atk'; f.ct = 0; f.act = { id: 'huc', mv: MOVES.huc, clip: 'atk', t: impactT('atk'), fired: true, ult: false }; skLog({ side: f.side, id: 'emerge' });
}
function echoRepeat(f, a, foe) {   /* Tiếng Vọng: đòn gây sát thương kế tiếp được 2 bản vọng lặp lại 50 % sau 0,35 s */
  if (!f.echo || !a.mv.pow || a.mv.ult) return; const mv = a.mv; f.echo = null; f.echoFlash = 0.35;
  ST.timers.push({ t: 0.35, fn: () => { if (foe.dead || f.dead) return; if (dist(f, foe) <= rangeOf(f, mv.id) + 24) { if (DFX.CODE) DFX.boom(foe.x, foe.y, 'am', 0.5); else hitFx(mv.type, foe.x, foe.y); hit(f, foe, mv, { mul: 0.5, noMiss: true, kb: 60 }); skLog({ side: f.side, id: 'echo', mv: mv.id }); } } });
}
function skStrip(f, a, foe, K, dir) {   /* dải ảnh ngang từ miệng / chân (lật khi quay trái); trúng theo khung (hitF / hits), gai lần lượt (spikes / geysers), vòng chạy (travel), gãy khúc (bent) */
  f.fx = dir; f.fy = 0; const o = skAnchor(f, K.at), m = VFXM['x2_' + K.fx]; if (!m) return; const L = m.x.target_x_logic || (m.w - m.ax), dx = (foe.x - o.x) * dir, cut = K.cut ? Math.max(24, Math.min(L, dx + 8)) : 0;
  const flipY = K.bent && foe.y > f.y; x2(K.fx, o.x, o.y, { flip: dir < 0, crop: cut, flipY, ky: f.y + (K.at === 'feet' ? -0.6 : 0.5) }); sfx('knock_whoosh'); duelSfx('beam_fire', { id: a.id, side: f.side });
  const inBand = (x0, x1, band) => { const ddx = (foe.x - o.x) * dir; if (ddx < x0 || ddx > x1) return false; const by = K.cone ? Math.tan(K.cone * Math.PI / 180) * Math.max(0, ddx) + 8 : band; return Math.abs(foe.y - (K.at === 'feet' ? o.y : f.y)) <= by + (K.bent ? 34 : 0); };
  const ev = (time, x0, x1, mul, first, extra) => ST.timers.push({ t: time, fn: () => { if (foe.dead || f.dead) return; if (inBand(x0, x1, K.band || 16)) { if (hit(f, foe, a.mv, { mul, noMiss: !first, kb: K.kb ?? 70, noFlash: !first && !K.spikes }) && extra) extra(); ST.stats.skHit = (ST.stats.skHit || 0) + 1; } } });
  const xs = K.spikes ? m.x.spike_x_logic : K.geysers ? m.x.x_logic : null;
  if (xs) { let done = false; xs.forEach((x, i) => ST.timers.push({ t: (1 + 2 * i) / m.fps + 0.02, fn: () => { if (done || foe.dead) return; if (inBand(x - 14, x + 14, 14)) { done = true; hit(f, foe, a.mv, { kb: 110 }); if (K.geysers) ground(foe.x, foe.y + 1, SCORCH, 0.6); } } })); return; }
  if (K.travel) { const T = m.n / m.fps; ST.timers.push({ t: Math.max(0.05, Math.min(1, Math.max(0, dx) / L)) * T, fn: () => { if (inBand(0, L + 6, K.band)) hit(f, foe, a.mv, { kb: 80 }); } }); return; }
  if (K.hits) { K.hits.forEach((fr, i) => ev(fr / m.fps, 0, L + 6, 0.55, !i)); return; }
  ev((K.hitF || 2) / m.fps, 0, L + 6, 1, true, () => {
    if (K.pullBack && !foe.dead) { const ddx = f.x - foe.x, dd = Math.abs(ddx) || 1; foe.kb = { vx: ddx / dd * 160, vy: 0, t: Math.min(0.3, (dd - sepNeed(f, foe)) / 160), fly: false }; text(foe.x, foe.y - 30, ST.ctx.lang() === 'en' ? 'PULLED!' : 'BỊ KÉO!', '#7ee08a', 0.8); }
    if (K.bounce) ST.timers.push({ t: 0.18, fn: () => { if (!foe.dead) { vfx('hit_loi', foe.x + dir * 10, foe.y - 30, { ky: foe.y + 0.5 }); hit(f, foe, a.mv, { mul: 0.5, noMiss: true, noFlash: true, kb: 30 }); ST.stats.bounce = (ST.stats.bounce || 0) + 1; } } }); });
}
function skBeam(f, a, foe) {   /* Tia Sáng: tia thon từ miệng / tay (nón PixelLab beam_<hệ>_w) tới đối thủ, giữ 0,4 s */
  const dir = foe.x >= f.x ? 1 : -1; f.fx = dir; f.fy = 0; const m = beamMouth(f), BL = Math.max(24, Math.min(rangeOf(f, a.id), Math.abs(foe.x - m.x) + 10));
  ST.beams2 = (ST.beams2 || []).filter(b => b.t < b.T); if (!DFX.find(f, a.id)) ST.beams2.push({ f, dir, mx: m.x - f.x, my: m.y - f.y, L: BL, t: 0, T: 0.42, tier: beamTier(a.mv) }); sfx('knock_whoosh'); duelSfx('beam_fire', { id: a.id, side: f.side });
  ST.timers.push({ t: 0.06, fn: () => { if (!foe.dead && (foe.x - f.x) * dir > 0 && Math.abs(foe.x - f.x) <= BL + 12 && Math.abs(foe.y - f.y) < 16) { hitFx(a.mv.type, foe.x, foe.y); hit(f, foe, a.mv, { kb: 80 }); } else text(foe.x, foe.y - 22, L(ST.ctx).miss, '#d8d8e8', 0.85); } });
}
function skDrawBeams2(g, cx, cy) { for (const b of ST.beams2 || []) { if (b.t >= b.T) continue; const f = b.f, x = f.x + b.mx, y = f.y + b.my, th = b.t > b.T - 0.12 ? Math.max(0.2, (b.T - b.t) / 0.12) : Math.min(1, 0.5 + b.t / 0.05);
  if (b.dir > 0) beam2(g, f, x - 1, x + b.L, y, y, false, cx, cy, th, b.tier); else beam2(g, f, x - b.L, x + 2, y, y, true, cx, cy, th, b.tier); } }
function skDashStart(f, a, foe) { const K = SK[a.id]; a.dash2 = { t: 0, x0: f.x, y0: f.y, ph: 'go', hit: false, gT: 0 };
  if (K.kind === 'blink') { a.dash2.ph = 'blink'; vfx('hit_ma' in (VFXM || {}) ? 'hit_ma' : 'x2_hit_ma', f.x, f.y - 8, { ky: f.y + 0.5 }); }
  if (K.fx && K.kind === 'through' && Math.abs(foe.x - f.x) > 10) x2(K.fx, f.x, f.y - Math.round(standH(f) * 0.45), { flip: foe.x < f.x, ky: f.y - 0.6 });
  sfx('knock_whoosh'); }
function skDash(f, a, foe, dt) {   /* trả true khi còn đang lao */
  const D = a.dash2, K = SK[a.id]; D.t += dt; const sp = 300;
  if ((D.gT -= dt) <= 0) { D.gT = 0.035; ghostPush(f); }
  if (D.ph === 'blink') { if (D.t < 0.14) { f.blink = true; return true; } f.blink = false; if (!foe.dead) { const side = foe.x >= D.x0 ? 1 : -1, q = nearWalk(ST.ctx, foe.x + side * 18, foe.y); f.x = q.x; f.y = q.y; face(f, foe.x, foe.y); x2('hit_ma', foe.x, foe.y - 8, { ky: foe.y + 0.6 }); hit(f, foe, a.mv, { kb: 110 }); } return false; }
  if (D.ph === 'go') { const tx = K.kind === 'through' ? D.tx ?? (D.tx = foe.x + Math.sign(foe.x - D.x0 || 1) * 40) : foe.x, ty = K.kind === 'through' ? D.ty ?? (D.ty = foe.y) : foe.y, dx = tx - f.x, dy = ty - f.y, d = Math.hypot(dx, dy) || 1;
    if (!moveBy(f, dx / d * sp * dt, dy / d * sp * dt)) D.t = 9; clampField(f); face(f, f.x + dx, f.y + dy);
    if (!D.hit && !foe.dead && dist(f, foe) < Math.max(16, sepNeed(f, foe) + 2)) { D.hit = true; hitFx(a.mv.type, foe.x, foe.y); hit(f, foe, a.mv, { kb: 120 }); if (K.kind === 'uturn') { D.ph = 'back'; x2(K.fx, f.x, f.y - 8, { flip: D.x0 < f.x, ky: f.y - 0.6 }); return true; } }
    if (K.kind === 'through' && d < 6) return false; return D.t < 0.9; }
  if (D.ph === 'back') { const dx = D.x0 - f.x, dy = D.y0 - f.y, d = Math.hypot(dx, dy); if (d < 6 || D.t > 1.6) return false; moveBy(f, dx / d * sp * dt, dy / d * sp * dt); clampField(f); face(f, foeOf(f).x, foeOf(f).y); return true; }
  return false;
}
function skUltLayers(t, foe) { const B = 'ult_' + t; if (!has2(B + '_back')) return false; x2(B + '_back', foe.x, foe.y, { ky: foe.y - 0.6 }); x2(B + '_front', foe.x, foe.y, { ky: foe.y + 0.6 }); return true; }
function skUlt(f, a, foe, t) {   /* tuyệt chiêu 2 lớp quanh đối thủ (bị ghim giữa) — cú chạm khung 5 + 10 */
  { const sc = DFX.CODE && DFX.find(f, a.id); if (sc) return ultCode(f, a, foe, t, sc); }   /* p52e: cảnh code */
  if (!skUltLayers(t, foe)) return; foe.pin = 1.05; foe.kb = null; foe.dodge = null; const m = VFXM['x2_ult_' + t + '_back'], x = foe.x, y = foe.y; ST.stats.ult2 = (ST.stats.ult2 || 0) + 1; skLog({ side: f.side, id: a.id, ult: t });
  if (ST.ctx.quake) ST.ctx.quake(0.25); sfx('smash');
  { const tw = 5 / m.fps, lead = Math.min(0.25, tw); ST.timers.push({ t: tw - lead, fn: () => { if (!f.ultWarned) { f.ultWarned = true; warnEdge(f, lead, a.id); } } }); }   /* viền đỏ 0,25 s trước cú chạm khung 5 */
  ST.timers.push({ t: 5 / m.fps, fn: () => { aoe(f, x, y, 70, 1.5); ground(x, y + 1, t === 'nham' ? SCORCH : CRACK, 0.85, 'big'); if (!foe.dead) hit(f, foe, a.mv, { mul: 0.6, kb: 0 }); } });
  ST.timers.push({ t: 10 / m.fps, fn: () => { if (!foe.dead) { hit(f, foe, a.mv, { mul: 0.45, noMiss: true, kb: 0 }); if (!foe.dead) { const kd = Math.hypot(foe.x - f.x, foe.y - f.y) || 1; foe.kb = { vx: (foe.x - f.x) / kd * 260, vy: (foe.y - f.y) / kd * 260, t: 0.3, fly: true, rut: 0, bounced: false }; foe.pin = 0; } } } });
}
function ultCode(f, a, foe, t, sc, pierce) {   /* p52e: tuyệt chiêu code — cú trúng 1 = nhịp trúng đầu của cảnh (vùng 70 px + vết đất), cú chốt = lúc cảnh hất (ghim tới đó, rồi hất bay) */
  DFX.fired(sc); sc.mv = null; const now = DFX.sceneTime(sc), hs = sc.I.hits, tH = Math.max(0.05, (hs.length ? hs[0].t : 0.4) - now), tK = Math.max(tH + 0.1, (sc.I.knock >= 0 ? sc.I.knock : hs.length ? hs[hs.length - 1].t : 1) - now);
  foe.pin = tK + 0.12; foe.kb = null; foe.dodge = null; ST.stats.ult2 = (ST.stats.ult2 || 0) + 1; skLog({ side: f.side, id: a.id, ult: t, code: 1 }); if (ST.ctx.quake) ST.ctx.quake(0.12);
  ST.timers.push({ t: Math.max(0, tH - 0.25), fn: () => { if (!f.ultWarned) { f.ultWarned = true; warnEdge(f, Math.min(0.25, tH), a.id); } } });   /* viền đỏ 0,25 s trước cú chạm đầu */
  const x = foe.x, y = foe.y; let done1 = false;
  sc.hooks = {
    hit: (i) => { if (!done1) { done1 = true; if (!pierce) { aoe(f, x, y, 70, 1.5); ground(x, y + 1, t === 'nham' ? SCORCH : CRACK, 0.85, 'big'); } if (!foe.dead) hit(f, foe, a.mv, { mul: 0.6, kb: 0, noMiss: !!pierce, _now: 1 }); }
      else if (!foe.dead) { foe.tint = Math.max(foe.tint || 0, 0.16); duelSfx('hit', { mv: a.mv.id, dmg: 0, side: foe.side }); } },
    knock: () => { sfx('smash'); if (foe.dead) return; if (!done1) { done1 = true; hit(f, foe, a.mv, { mul: 0.6, kb: 0, _now: 1 }); } if (foe.dead) return; hit(f, foe, a.mv, { mul: 0.45, noMiss: true, kb: 0, _now: 1 }); if (!foe.dead) { const dir = pierce ? pierce.dir : 0, kd = Math.hypot(foe.x - f.x, foe.y - f.y) || 1; foe.kb = dir ? { vx: dir * 330, vy: 0, t: 0.32, fly: true, rut: 0, bounced: false } : { vx: (foe.x - f.x) / kd * 290, vy: (foe.y - f.y) / kd * 290, t: 0.32, fly: true, rut: 0, bounced: false }; foe.pin = 0; } },
  };
}
function updZones(dt) {   /* vùng bền: điện trường (bám người ra chiêu), phấn ngủ, xoáy băng (chậm), tường lửa, lốc hút */
  for (const z of ST.zones || []) { z.t += dt; if (z.follow) { z.x = z.follow.x; z.y = z.follow.y; } const foe = foeOf(z.f); if (foe.dead || foe.absent) continue;
    const inside = z.w ? Math.abs(foe.y - z.y) < 10 && foe.x > z.x - 50 && foe.x < z.x + 50 : Math.hypot(foe.x - z.x, (foe.y - z.y) * 1.4) <= z.r;
    if (z.k === 'pull') { if (inside) { const dx = z.x - foe.x, dy = z.y - foe.y, d = Math.hypot(dx, dy); if (d > 2) moveBy(foe, dx / d * Math.min(d, 70 * dt), dy / d * Math.min(d, 70 * dt)); foe.moving = false; ST.stats.pull = (ST.stats.pull || 0) + 1; } continue; }
    if (z.K && z.K.slow && inside) { foe.slowT = 0.3; ST.stats.slow = (ST.stats.slow || 0) + 1; }
    if ((z.tick -= dt) <= 0) { z.tick = z.K ? z.K.tick : 0.5; if (!inside) continue;
      if (z.K && z.K.sleep) { if (!z.hits && applyTT(z.f, foe, z.mv)) z.hits++; continue; }
      if (z.mv.pow) { hit(z.f, foe, z.mv, { mul: z.hits ? 0.3 : 0.7, noMiss: z.hits > 0, noFlash: z.hits > 0, kb: 20 }); z.hits++; } } }
  ST.zones = (ST.zones || []).filter(z => z.t < z.T); for (const b of ST.beams2 || []) b.t += dt;
}
function skShot(s, foe, dt) { if (!s.hide) return skShot0(s, foe, dt); ST.noVfx = (ST.noVfx || 0) + 1; try { return skShot0(s, foe, dt); } finally { ST.noVfx--; } }   /* p52e */
function skShot0(s, foe, dt) {   /* đạn bay thẳng (proj2) / ném bổng (lob); trả true khi xong */
  s.t += dt; const K = SK[s.sk] || {};
  if (s.kind === 'lob') { const k = Math.min(1, s.t / s.T); s.x = s.x0 + (s.tx - s.x0) * k; s.y = s.y0 + (s.ty - s.y0) * k; s.gy = s.y; s.h = s.h0 * (1 - k) + 4 * s.H * k * (1 - k); s.vy = s.ty - s.y0;
    if (k >= 1) { x2(K.boom, s.x, s.y, { ky: s.y - 0.6 }); aoe(s.f, s.x, s.y, K.r + 4, 0.9); ground(s.x, s.y + 1, CRACK, 0.6, 'small'); if (!foe.dead && Math.hypot(foe.x - s.x, foe.y - s.y) <= K.r + 6) hit(s.f, foe, s.mv, { kb: 90 }); else text(s.x, s.y - 20, L(ST.ctx).miss, '#d8d8e8', 0.8); return true; }
    return false; }
  s.x += s.vx * dt; s.y += s.vy * dt; s.gy = s.y + s.h;
  if (!passShot(s.x, s.y + s.h)) { hitFx(s.mv.type, s.x, s.y + s.h); return true; }
  if (!foe.dead && Math.hypot(foe.x - s.x, foe.y - Math.max(6, standH(foe) * 0.45) - (foe.alt || 0) - s.y) < s.rad) {
    if (K.boom) x2(K.boom, foe.x, foe.y, { ky: foe.y - 0.6 }); else hitFx(s.mv.type, foe.x, foe.y);
    const ok = s.mv.pow ? hit(s.f, foe, s.mv) : applyTT(s.f, foe, s.mv);
    if (ok && K.bubble && !foe.dead) { foe.pin = 1.5; x2('trieu_bong_giam', foe.x, foe.y - Math.round(standH(foe) * 0.4), { follow: foe, dky: 0.6, hold: 1.5, hA: 3, hB: 7 }); text(foe.x, foe.y - 30, ST.ctx.lang() === 'en' ? 'TRAPPED!' : 'BỊ NHỐT!', '#9fd0ff', 0.85); }
    if (ok && K.lock && !foe.dead) { const ids = (MV78(foe) || []).filter(m => !MOVES[m].ult); const lk = ids[Math.floor(rnd() * ids.length)]; if (lk) { foe.cds[lk] = Math.max(foe.cds[lk] || 0, K.lock); x2('ma_khoa', foe.x, foe.y - standH(foe) - 10, { follow: foe, dky: 0.7 }); text(foe.x, foe.y - 34, (ST.ctx.lang() === 'en' ? 'LOCKED: ' : 'KHOÁ: ') + mvName(ST.ctx, lk), '#46d39a', 0.8, 1.6); } }
    return true; }
  return s.t > s.life;
}
function skDrawShot(g, s, cx, cy) { const m = VFXM && VFXM['x2_' + s.fx], im = m && img(m.file); if (!im) return; const fr = Math.floor(s.t * m.fps) % m.n, sw = im.naturalWidth / m.n, flip = (s.kind === 'lob' ? s.tx - s.x0 : s.vx) < 0, x = (globalThis.__R89||Math.round)(s.x - cx), y = Math.round(s.y - (s.kind === 'lob' ? s.h : 0) - cy);
  if (flip) { g.save(); g.translate(x, y); g.scale(-1, 1); g.drawImage(im, fr * sw, 0, sw, im.naturalHeight, -m.ax, -m.ay, m.w, m.h); g.restore(); } else g.drawImage(im, fr * sw, 0, sw, im.naturalHeight, x - m.ax, y - m.ay, m.w, m.h); }
function skDrawEcho(g, f, cx, cy) {   /* 2 bản vọng mờ: bản sao sprite của chính thú, tô màu hệ Âm, lệch 2 bên */
  const S0 = SPR && SPR[f.sp]; if (!S0) return; const c = S0[f.clip] || S0.idle, im = img(c.file); if (!im) return; const { r, flip } = rowOf(c, f), fr = Math.floor(f.ct * (FPS[f.clip] || 8)) % c.n, src = colorOf(im, '#c9a2ff'), w = c.cw / 2, h = c.ch / 2;
  for (const s of [-1, 1]) { g.save(); g.globalAlpha = (f.echoFlash > 0 ? 0.7 : 0.32) * (0.8 + 0.2 * Math.sin(ST.t * 6 + s)); const x = (globalThis.__R89||Math.round)(f.x - cx + s * 11), y = (globalThis.__R89||Math.round)(f.y - (f.alt || 0) - cy - 1);
    if (flip) { g.translate(x, y); g.scale(-1, 1); g.drawImage(src, fr * c.cw, r * c.ch, c.cw, c.ch, -c.ax / 2, -c.ay / 2, w, h); } else g.drawImage(src, fr * c.cw, r * c.ch, c.cw, c.ch, x - c.ax / 2, y - c.ay / 2, w, h); g.restore(); } }
function skDrawHidden(g, f, cx, cy) { g.save(); g.globalAlpha = 0.18; drawFighter(g, f, cx, cy, true); g.restore(); }
function hudTopW() {   /* p49c: toạ độ thế giới (y) của mép dưới HUD trên màn hiện tại — nghịch đảo ĐÚNG toUI (3 nhánh: khung cắt main.js / camZoom + camFocus / thường) */
  const H0 = ST.hudUI, c = ST.ctx; if (!H0 || !c) return null; const S = c.S, VH = c.VH || 200, uy = H0.y + 8, zv = c.zoomView && c.zoomView();
  if (zv) return uy / (H0.scale * zv.z) + zv.Y0 + H0.cy;
  if (S.camZoom > 1.01 && S.camFocus) { const z = S.camZoom, fy = Math.max(VH / (2 * z), Math.min(VH - VH / (2 * z), S.camFocus.y - H0.cy)); return uy / (H0.scale * z) + fy - VH / (2 * z) + H0.cy; }
  return uy / H0.scale + H0.cy;
}
function koFly(f, dt) {   /* bay văng (độ cao h, trọng lực) → nảy 1 lần → trượt dừng, rồi nằm (clip faint) */
  const K = f.koFly, ox = f.x, oy = f.y; if (!moveBy(f, K.vx * dt, K.vy * dt)) { K.vx *= -0.35; K.vy *= -0.35; } clampField(f);
  K.vh -= 640 * dt; K.h = Math.max(0, K.h + K.vh * dt); f.alt = K.h;
  { const lim = hudTopW(); if (lim != null) { const top = f.y - K.h - standH(f); if (top < lim) { const hMax = Math.max(6, f.y - standH(f) - lim); if (K.h > hMax) { K.h = hMax; f.alt = K.h; if (K.vh > 0) K.vh = 0; } if (K.vy < 0) K.vy = 0; ST.stats.koClamp = (ST.stats.koClamp || 0) + 1; }   /* trần độ cao; nếu thú đã sát HUD ngay trên đất vẫn cho nảy thấp 6 px (không đông cứng) và không bay lên thêm */ } }   /* p49c: đỉnh đầu luôn dưới HUD */
  if (K.h <= 0 && K.vh < 0) { vfx('dust', f.x, f.y, { ground: true }); if (!FLY[f.sp]) ground(f.x, f.y + 1, CRACK, 0.6, 'small');
    if (K.b === 0) { K.b = 1; K.vh = 95; K.vx *= 0.5; K.vy *= 0.5; sfx('hit'); duelSfx('ko_bounce'); } else { duelSfx('ko_land'); f.koFly = null; f.alt = 0; f.clip = 'faint'; f.ct = 0; ST.stats.koBounce = (ST.stats.koBounce || 0) + 1; } }
  f.toss = 0; if (Math.hypot(f.x - ox, f.y - oy) > 0.1) f.ct = Math.min(f.ct, 0.2);
}
const CREAM = new Map();
function creamOf(im) {   /* plan-49b: bản kem của sheet (viền mảnh tách 2 bóng đen trong khung kết liễu) */
  let c = CREAM.get(im); if (c) return c;
  c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight; const x = c.getContext('2d');
  x.drawImage(im, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = '#f4ecd8'; x.fillRect(0, 0, c.width, c.height); CREAM.set(im, c); return c;
}
function drawKoFrame(ug, ctx, cx, cy, scale, W, H) { const K = ST.ko; drawSilFrame(ug, ctx, cx, cy, scale, W, H, K, K.t >= (KO_FRAME + (ST.koHold || 0)) / 2, false); }
function drawSilFrame(ug, ctx, cx, cy, scale, W, H, K, two, inv) {   /* plan-52: khung bóng chung cho kết liễu + impact không-KO; inv = nền đen, vạch + bóng trắng (đòn lao / tia xuyên) */   /* ST.koHold: chỉ test chụp ảnh (mặc định 0) */ ug.save(); ug.imageSmoothingEnabled = false;
  const [fx, fy] = toUI(ctx, K.f.x, K.f.y - standH(K.f) * 0.5, cx, cy, scale), tall = H > W * 1.15, li = K.p85 ? null : img(tall ? 'linhduel/ui/ko_frame_tall.png' : 'linhduel/ui/ko_frame.png') || img('linhduel/ui/ko_frame.png');   /* plan-49b: màn dọc dùng ảnh dọc (PixelLab ko_frame_tall 216×384) → phóng bội nguyên nhỏ hơn, vạch không thô */
  if (!li && !K.p85) { ug.fillStyle = inv ? '#140e1a' : '#f4ecd8'; ug.fillRect(0, 0, W, H); }
  if (li) { const iw = li.naturalWidth, ih = li.naturalHeight; let sx = Math.ceil(Math.max(W / iw, H / ih)), sy = sx; if (tall) { sx = Math.max(1, Math.round(W / iw)); if (iw * sx < W) sx++; sy = Math.max(1, Math.ceil(H / ih)); }   /* p49c: màn dọc — bội nguyên RIÊNG từng trục, ngang ≈ vừa khít bề rộng và tâm giữa màn → vạch tốc độ 2 bên không bị cắt (p49b lệch theo thú thua nên hở 2 bên) */
    const s = Math.max(sx, sy), w = iw * sx, h = ih * sy, ox = tall ? W / 2 : Math.max(W - w / 2, Math.min(w / 2, fx)), oy = Math.max(H - h / 2, Math.min(h / 2, tall ? (fy + H / 2) / 2 : fy)); ug.save(); ug.translate(Math.round(ox), Math.round(oy));   /* bội nguyên, phủ kín màn, tâm gần thú thua */ if (two) ug.scale(-1, 1); ug.drawImage(inv ? invOf(li) : li, -w / 2, -h / 2, w, h); ug.restore(); if (K === ST.ko) ST.koFrameS = s; else K.frameS = s; }
  const zv = ctx.zoomView && ctx.zoomView(), px = scale * (zv ? zv.z : 1);   /* điểm ảnh màn / px logic */
  /* plan-49b: 2 bóng đen đứng sát nhau bị dính thành 1 cục → tính chỗ vẽ trước, đẩy tách theo trục nối 2 thú cho tới khi thân (≈ 60 % khung) không chồng, rồi viền kem 1 px logic quanh mỗi bóng */
  const LS = []; for (const sn of K.snap) { const f = sn.q, S0 = SPR && SPR[f.sp]; if (!S0) continue; const c = S0[sn.clip] || S0.idle, im = img(c.file); if (!im) continue;
    const loop = sn.clip === 'idle' || sn.clip === 'run' || sn.clip === 'fly'; let fr = Math.floor(sn.ct * FPS[sn.clip]); fr = loop ? fr % c.n : Math.min(c.n - 1, fr);
    const { r, flip } = rowOf(c, f), [sx, sy] = toUI(ctx, sn.x + (two && f === K.f ? K.ux * 2 : 0), sn.y, cx, cy, scale); LS.push({ f, c, im, fr, r, flip, sx, sy, bw: c.cw / 2 * px * 0.6, bh: c.ch / 2 * px * 0.75 }); }
  if (LS.length === 2) { const [A, B] = LS; let dx = B.sx - A.sx, dy = B.sy - A.sy; const need = (A.bw + B.bw) / 2, needY = (A.bh + B.bh) / 2;
    if (Math.abs(dx) < need && Math.abs(dy) < needY * 1.35) {   /* p49c: đứng trước / sau (lệch dọc) đầu vẫn chồng thân → nới ngưỡng dọc */ let ux = Math.sign(dx) || (A.f === K.f ? -Math.sign(K.ux) || -1 : Math.sign(K.ux) || 1); const push = (need - Math.abs(dx)) / 2 + px; A.sx -= ux * push; B.sx += ux * push; }
    K.sep = Math.round(Math.abs(B.sx - A.sx) / px); }   /* test đọc K.sep (px logic giữa 2 chân) */
  const rim = Math.max(1, Math.round(px)); LS.sort((p, q) => p.sy - q.sy);
  for (const o of LS) { const { c, im, fr, r, flip } = o, w = Math.round(c.cw / 2 * px), h = Math.round(c.ch / 2 * px), x0 = Math.round(-c.ax / 2 * px), y0 = Math.round(-c.ay / 2 * px);
    ug.save(); ug.translate(Math.round(o.sx), Math.round(o.sy)); if (flip) ug.scale(-1, 1);
    const cr = inv ? darkOf(im) : creamOf(im); for (const [ox, oy] of [[-rim, 0], [rim, 0], [0, -rim], [0, rim]]) ug.drawImage(cr, fr * c.cw, r * c.ch, c.cw, c.ch, x0 + ox, y0 + oy, w, h);
    ug.drawImage(inv ? creamOf(im) : darkOf(im), fr * c.cw, r * c.ch, c.cw, c.ch, x0, y0, w, h); ug.restore(); }
  ug.restore();
}
function drawKoText(ug, ctx, W, H, u) {   /* M2: 'K.O.!' to nghiêng viền đậm + tên thú kiệt sức, bật vào rồi mờ — 1 lần */
  const t = ST.ko.t - KO_T0, pop = t < 0.12 ? 1.6 - 0.6 * (t / 0.12) : 1, a = t > 1.55 ? Math.max(0, 1 - (t - 1.55) / 0.3) : 1, fs = Math.round(u * 16 * pop);   /* plan-52 #10: đứng ~1,6 s (video 213.8–215.4) */
  ug.save(); ug.globalAlpha = a; ug.translate(W / 2, H * 0.3); ug.rotate(-0.16); ug.textAlign = 'center'; ug.textBaseline = 'middle'; ug.lineJoin = 'round';
  ug.font = `bold italic ${fs}px VT323, monospace`; ug.lineWidth = Math.max(10, fs / 4.2); ug.strokeStyle = '#140e1a'; ug.strokeText('K.O.!', 0, 0); ug.lineWidth = Math.max(5, fs / 8); ug.strokeStyle = '#ffffff'; ug.strokeText('K.O.!', 0, 0); ug.fillStyle = '#e8303a'; ug.fillText('K.O.!', 0, 0);   /* plan-52: đỏ, viền trắng + viền tối ngoài */
  const s2 = L(ctx).faint(fName(ctx, ST.ko.f)).toUpperCase(), f2 = Math.round(u * 4.6); ug.font = `bold italic ${f2}px VT323, monospace`; ug.lineWidth = Math.max(4, f2 / 5); ug.strokeStyle = '#140e1a'; ug.strokeText(s2, 0, fs * 0.62); ug.fillStyle = '#ffffff'; ug.fillText(s2, 0, fs * 0.62);
  ug.restore();
}
function drawIntro(ug, ctx, W, H, u) {
  const t = ST.introT, a = t < 1.9 ? 1 : Math.max(0, 1 - (t - 1.9) / 0.35); ug.save(); ug.globalAlpha = a * 0.78; ug.fillStyle = '#100c18'; ug.fillRect(0, 0, W, H); ug.globalAlpha = a; ug.imageSmoothingEnabled = false;
  const sl = Math.min(1, t / 0.35), cy = H * 0.45, K = Math.max(3, Math.round(Math.min(W, H) / 70));
  const card = (f, x, right, tr, name) => {
    const cc = SPR && SPR[f.sp] && SPR[f.sp].idle, im = cc && img(cc.file);
    if (im) { const r = right ? 0 : Math.max(0, cc.rows.indexOf('north')); ug.drawImage(im, 0, r * cc.ch, cc.cw, cc.ch, x - cc.cw / 4 * K, cy - cc.ch / 2 * K + K * 4, cc.cw / 2 * K, cc.ch / 2 * K); }
    if (tr && tr.sheet) { try { ug.drawImage(tr.sheet, 0, right ? 0 : 60, 16, 20, x + (right ? -1 : 1) * 15 * K - 8 * K * 0.8, cy - 2 * K, 16 * K * 0.8, 20 * K * 0.8); } catch (e) { } }
    const fs = Math.round(u * 5.5); ug.font = `bold ${fs}px VT323, monospace`; ug.textAlign = 'center'; ug.textBaseline = 'top'; ug.lineWidth = 4; ug.strokeStyle = '#100c18'; ug.fillStyle = right ? '#ff9c8a' : '#9fd0ff';
    ug.strokeText(name, x, cy + 15 * K); ug.fillText(name, x, cy + 15 * K);
    ug.font = `${Math.round(fs * 0.75)}px VT323, monospace`; ug.fillStyle = '#f5ecdc'; const s2 = fName(ctx, f) + ' · ' + (ctx.lang() === 'en' ? TYPE_EN74 : TYPE_NAME)[f.types[0]]; ug.strokeText(s2, x, cy + 15 * K + fs * 1.05); ug.fillText(s2, x, cy + 15 * K + fs * 1.05);
  };
  card(ST.F[0], W * 0.25 - (1 - sl) * W * 0.3, false, ctx.S.player, ctx.S.save.name || L(ctx).you);
  card(ST.F[1], W * 0.75 + (1 - sl) * W * 0.3, true, ST.wild ? null : ST.foe, ST.wild ? L(ctx).wildN : ST.foe && ST.foe.m ? (ST.foe.m.k || ST.foe.m.n) : 'NPC');
  const vs = img('linhduel/ui/vs.png'); if (vs) { const s = Math.min(1.15, 0.6 + t * 1.6), w = vs.naturalWidth * K * 0.55 * s, h = vs.naturalHeight * K * 0.55 * s; ug.drawImage(vs, W / 2 - w / 2, cy - h / 2, w, h); }
  if (t > 1.55) { const fs = Math.round(u * 9); ug.font = `bold italic ${fs}px VT323, monospace`; ug.textAlign = 'center'; ug.textBaseline = 'middle'; ug.lineWidth = 6; ug.strokeStyle = '#100c18'; ug.fillStyle = '#ffd45e'; ug.strokeText(L(ctx).start, W / 2, H * 0.24); ug.fillText(L(ctx).start, W / 2, H * 0.24); }
  ug.restore();
}

/* ---------- review7 (2026-10-28, video Pokémon Arena 2D): sân sạch có vạch phấn · né lướt bóng mờ · đối chưởng tia dài · tuyệt chiêu cực lớn ---------- */
function stillAt(g, name, x, y, a = 1) { const m = VFXM && VFXM[name], im = m && img(m.file); if (!im) return; if (a < 1) g.globalAlpha = a; g.drawImage(im, 0, 0, im.naturalWidth / m.n, im.naturalHeight, Math.round(x - m.ax), Math.round(y - m.ay), m.w, m.h); if (a < 1) g.globalAlpha = 1; }
function drawCourt(g, ctx, cx, cy) {   /* sân biển: vẽ bè thay vạch */
  if (FIELD.kind === 'sea') { const im = img('linhduel/ui/raft.png'), m = ctx.S.map; if (im && m.rafts) for (const r of m.rafts) g.drawImage(im, (globalThis.__R89||Math.round)(r.x - cx - im.naturalWidth / 4), (globalThis.__R89||Math.round)(r.y - cy - im.naturalHeight / 4) + 1, im.naturalWidth / 2, im.naturalHeight / 2); return; }
  /* vạch sân phấn (vfx_workbench court_*): khung chữ nhật + vạch giữa + vòng tròn giữa — sân cát có hồ thì chỉ khung */
  const k = FIELD.kind, x0 = 40, x1 = FW * 16 - 40, y0 = FIELD_TOP - 12, y1 = FIELD_BOT + 4, mx = FW * 8;   /* p54: vạch trên nằm dưới HUD */
  for (let x = x0; x < x1; x += 16) { stillAt(g, 'court_hline', x + 8 - cx, y0 - cy, 0.8); stillAt(g, 'court_hline', x + 8 - cx, y1 - cy, 0.8); }
  for (let y = y0; y < y1; y += 16) { stillAt(g, 'court_vline', x0 - cx, y + 8 - cy, 0.8); stillAt(g, 'court_vline', x1 - cx, y + 8 - cy, 0.8); if (k !== 'sand') stillAt(g, 'court_vline', mx - cx, y + 8 - cy, 0.8); }
  if (k !== 'sand') stillAt(g, 'court_circle', mx - cx, Math.round((y0 + y1) / 2) - cy, 0.8);
}
function toUI(ctx, wx, wy, cx, cy, scale) {   /* toạ độ thế giới → lớp UI, tính cả camZoom (cắt giữa canvas rồi kéo giãn — main.js) */
  const S = ctx.S, VW = ctx.VW || 320, VH = ctx.VH || 200; let sx = wx - cx, sy = wy - cy; const zv = ctx.zoomView && ctx.zoomView();
  if (zv) { sx = (sx - zv.X0) * zv.z; sy = (sy - zv.Y0) * zv.z; }   /* plan-49a: dùng đúng khung cắt main.js vừa vẽ */
  else if (S.camZoom > 1.01 && S.camFocus) { const z = S.camZoom, fx = Math.max(VW / (2 * z), Math.min(VW - VW / (2 * z), S.camFocus.x - cx)), fy = Math.max(VH / (2 * z), Math.min(VH - VH / (2 * z), S.camFocus.y - cy)); sx = (sx - (fx - VW / (2 * z))) * z; sy = (sy - (fy - VH / (2 * z))) * z; }
  return [sx * scale, sy * scale];
}
/* né lướt: lưu vị trí + khung để vẽ 4 bóng mờ phía sau (ảnh của chính thú, phủ màu hệ) */
function ghostPush(f) { const c = SPR && SPR[f.sp] && (SPR[f.sp][f.clip] || SPR[f.sp].idle); if (!c) return; const { r, flip } = rowOf(c, f); (f.ghosts = f.ghosts || []).unshift({ x: f.x, y: f.y - (f.alt || 0), clip: f.clip, fr: Math.floor(f.ct * FPS[f.clip]) % c.n, r, flip, t: 0 }); if (f.ghosts.length > 5) f.ghosts.pop(); }
function drawGhosts(g, f, cx, cy) {
  const S0 = SPR && SPR[f.sp]; if (!S0 || !f.ghosts) return; const col = TYPE_COLOR[f.types[0]] || '#9fd0ff';
  f.ghosts.forEach((q, i) => { if (i === 0 || q.t > 0.32) return; const c = S0[q.clip] || S0.idle, im = img(c.file); if (!im) return; const src = colorOf(im, col), w = c.cw / 2, h = c.ch / 2, x = (globalThis.__R89||Math.round)(q.x - cx), y = (globalThis.__R89||Math.round)(q.y - cy);
    g.save(); g.globalAlpha = 0.55 * (1 - i / 5) * (1 - q.t / 0.32); if (q.flip) { g.translate(x, y); g.scale(-1, 1); g.drawImage(src, q.fr * c.cw, q.r * c.ch, c.cw, c.ch, -c.ax / 2, -c.ay / 2, w, h); } else g.drawImage(src, q.fr * c.cw, q.r * c.ch, c.cw, c.ch, x - c.ax / 2, y - c.ay / 2, w, h); g.restore(); });
}
const COLR = new Map();
function colorOf(im, col) { const key = im.src + col; let c = COLR.get(key); if (c) return c; c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight; const x = c.getContext('2d'); x.drawImage(im, 0, 0); x.globalCompositeOperation = 'source-atop'; x.globalAlpha = 0.65; x.fillStyle = col; x.fillRect(0, 0, c.width, c.height); COLR.set(key, c); return c; }
function dodgeShots(dt) {   /* đạn bay tới trong ~0,35 s → thú rảnh lướt ngang né (vệt mờ + tia tốc độ) */
  const list = ST.shots.filter(s => s.kind === 'proj' || s.kind === 'ball' || (s.kind === 'p73' && !s.p73refl)).concat(ST.runners.map(r => { if (r.vx2 === undefined) { r.vx2 = r.vx * (r.sp || 170); r.vy2 = r.vy * (r.sp || 170); } return r; }));
  for (const s of list) { if (s.dodgeChk) continue; const vx = s.vx2 ?? s.vx, vy = s.vy2 ?? s.vy, o0 = foeOf(s.f); if (o0.queued || (FLY[o0.sp] && s.mv && GROUND_MV[s.mv.id])) continue;   /* thú bay không cần né đường nứt đất; đang có lệnh chiêu thì không né */ const o = foeOf(s.f); if (o.dead || o.absent || o.act || o.dodge || o.hurtT > 0 || (stunned(o))) continue;
    const d = Math.hypot(o.x - s.x, o.y - s.y), v = Math.hypot(vx, vy) || 1; if (d > v * 0.38) continue; s.dodgeChk = true; if (rnd() > 0.5 + dodgeB(o)) continue;   /* đạn / tia chạy đất (runner) đều né được */
    const sd = rnd() < 0.5 ? 1 : -1; o.dodge = { vx: -vy / v * sd, vy: vx / v * sd, t: 0.22, delay: 0, slide: true, p84c: 1 }; ST.stats.dodge = (ST.stats.dodge || 0) + 1; }
}
/* ĐỐI CHƯỞNG TIA DÀI (chung mọi hệ): 2 thú dàn hàng ngang → 2 luồng xoắn dày bắn thẳng vào nhau → gặp giữa: khối nổ sáng + cột hơi bốc cao, giằng co →
   bên mạnh đẩy luồng sang → NỔ cột sáng trắng khổng lồ ở bên thua. Cách nhau ≥ 8 s. Hình: beam_<hệ> (vfx_workbench, ô lặp ngang), clashbig, clash_steam, pillar_white. */
const BEAM_T = { align: 0.35, fight: 1.8, push: 0.35 };
function beamMove(f) { const ids = MV78(f).filter(id => !MOVES[id].ult && MOVES[id].pow > 0); return ids.find(id => MOVES[id].type === f.types[0]) || ids[0] || 'huc'; }
function freeFor(f) { return !f.dig && !f.dead && !f.absent && !(f.inv > 0) && !f.act && f.hurtT <= 0 && !f.kb && !f.dodge && !stunned(f); }
function startClash(a, b, x, y, mvB) {   /* a, b: 2 thú (gọi từ va chạm luồng lửa / Nứt Đất cũ hoặc tự nhiên) */
  if (ST.clash) return; const c = ST.ctx; if ((ST.beamN84 | 0) >= 1 && !ST.p84force) return; ST.beamN84 = (ST.beamN84 | 0) + 1;   /* p84: tối đa 1 lần / trận (API test vẫn ép được) */
  for (const f of [a, b]) { if (f.act && f.act.breath) f.act.breath = null; f.act = null; f.dodge = null; f.kb = null; f.queued = null; f.plan = null; }
  const pw = (f, o) => typeMul(f.types[0], o.types) * ((statsFor(f).spa + statsFor(f).atk) / 2) * (0.75 + 0.25 * f.hp / f.max) * (0.95 + rnd() * 0.1), pa = pw(a, b), pb = pw(b, a);   /* p57: sức tia = khắc hệ × chỉ số × máu (±5 %) */
  const L0 = a.x <= b.x ? a : b, R0 = L0 === a ? b : a, my = (a.y + b.y) / 2, gap = ST.inField && FIELD.kind !== 'sea' ? Math.max(96, Math.min(240, wideCap() - 20)) :   /* sân biển: giữ khoảng cũ (dàn hàng không lướt qua mặt nước giữa các bè) */ Math.max(96, Math.min(150, Math.abs(a.x - b.x))), mx = (a.x + b.x) / 2;
  const tl = nearWalk(c, mx - gap / 2, my), tr = nearWalk(c, mx + gap / 2, my);
  ST.clash = { a, b, L: L0, R: R0, tl, tr, x: mx, y: my, x0: mx, y0: my, t: 0, ph: 'align', win: null, pa, pb, off: 0, nv: 0, mvA: beamMove(a), mvB: beamMove(b), puffT: 0 };
  ST.clashT0 = ST.t; ST.clashNext = ST.t + 8 + BEAM_T.align + 4.5 + BEAM_T.push;
  text(mx, my - 30, c.lang() === 'en' ? 'CLASH!' : 'ĐỐI CHƯỞNG!', '#ffe680', 1.3, 1.6); sfx('roar'); ST.stats.clash = (ST.stats.clash || 0) + 1; ST.stats.beam = (ST.stats.beam || 0) + 1;
  ST.camZoomT = 0; ST.zoomOn = null; duelSfx('clash_start');
}
function beamMouth(f, clip) {   /* điểm bắn: miệng / tay (MOUTH đủ 10 loài — p53), loài lạ mới lấy giữa thân phía trước */
  if (MOUTH[f.sp]) return mouthOf(f, clip); return { x: f.x + Math.sign(f.fx || 1) * 9, y: f.y - Math.max(8, standH(f) * 0.5) - (f.alt || 0) };
}
function beamPose(f) { const id = beamMove(f), c = (CLIP_SP[f.sp] && CLIP_SP[f.sp][id]) || CLIP_OF[id] || 'atk'; return SPR && SPR[f.sp] && SPR[f.sp][c] ? c : 'atk'; }
function updClash(dt) { if (!DFX.CODE || !ST.clash) return updClash0(dt); ST.noVfx = (ST.noVfx || 0) + 1; const W0 = ST.clash; try { return updClash0(dt); } finally { ST.noVfx--; if (W0 && !ST.clash && ST.clashLast) { const Lz = W0.win === W0.L ? W0.R : W0.L; DFX.boom(Lz.x, Lz.y, W0.win.types[0], 1.6); } } }   /* p52e: nổ cuối đối chưởng vẽ code */
function updClash0(dt) {
  const C = ST.clash; if (!C) return; C.t += dt; const c = ST.ctx, { L, R } = C;
  for (const f of [L, R]) { f.act = null; f.hurtT = 0; f.dodge = null; }
  if (C.ph === 'align') {   /* dàn hàng ngang, quay mặt vào nhau */
    const k = Math.min(1, dt * 10); for (const [f, q] of [[L, C.tl], [R, C.tr]]) { if (ST.inField && FIELD.kind === 'sea' && !SWIM[f.sp] && !FLY[f.sp]) { f.clip = 'idle'; continue; } f.x += (q.x - f.x) * k; f.y += (q.y - f.y) * k; f.clip = 'run'; f.ct += dt; }   /* sân biển: thú không bơi đứng yên trên bè (không lướt qua mặt nước) */
    L.fx = 1; L.fy = 0; R.fx = -1; R.fy = 0;
    if (C.t >= BEAM_T.align) { C.ph = 'fight'; C.t = 0; const ma = beamMouth(L), mb = beamMouth(R); C.y0 = C.y = (ma.y + mb.y) / 2; C.x0 = C.x = (ma.x + mb.x) / 2; C.grow = 0; sfx('knock_whoosh'); duelSfx('beam_fire'); }
    return;
  }
  for (const f of [L, R]) { const p = beamPose(f), cl = SPR[f.sp][p]; f.clip = p; f.ct = (Math.min(cl.n - 1, IMPACT[p] || 3) + 0.5) / FPS[p]; f.fx = f === L ? 1 : -1; f.fy = 0; }
  const ma = beamMouth(L), mb = beamMouth(R);
  if (C.ph === 'fight') {
    /* p57 (góp ý người xem): ĐIỂM VA TRƯỢT về phía bên YẾU — tốc độ theo chênh sức (khắc hệ × chỉ số), cộng rung nhỏ qua lại; tia bên mạnh dài ra, bên yếu ngắn lại; tới cách miệng bên yếu ~20 px thì nổ. Không có thanh sức. */
    C.grow = Math.min(1, C.t / 0.25); const pL = C.a === L ? C.pa : C.pb, pR = C.a === L ? C.pb : C.pa, adv = (pL - pR) / (pL + pR), half = Math.max(10, (mb.x - ma.x) / 2 - 20);
    if (C.grow >= 1) { C.nv += ((rnd() - 0.5) * 260 - C.nv * 2.2) * dt; let v = 150 * adv + C.nv; if (C.t > 3) v += Math.sign(C.off || adv || 1) * 90 * (C.t - 3); C.off = Math.max(-half, Math.min(half, C.off + v * dt)); }
    const sw = Math.sin(C.t * 11) * 2.5 + Math.sin(C.t * 27) * 1.2; C.x = (ma.x + mb.x) / 2 + C.off + sw; C.y = (ma.y + mb.y) / 2; C.adv = +adv.toFixed(3);
    if (Math.abs(C.off) >= half - 0.5) { C.win = C.off > 0 ? L : R; C.ph = 'push'; C.t = 0; C.px = C.x; sfx('smash'); return; }   /* điểm va ở sát miệng bên thua */
    if ((C.puffT -= dt) <= 0 && C.grow >= 1) { C.puffT = 0.12; vfx('hit', C.x + (rnd() - 0.5) * 20, C.y + (rnd() - 0.5) * 16, { ky: C.y + 12 }); if (rnd() < 0.4) vfx(HITFX[(rnd() < 0.5 ? L : R).types[0]] || 'hit', C.x + (rnd() - 0.5) * 16, C.y + 6, { ky: C.y + 12 }); }
    if (Math.floor(C.t / 0.9) !== Math.floor((C.t - dt) / 0.9)) { ground(C.x + (rnd() - 0.5) * 12, (L.y + R.y) / 2 + 2, CRACK, 0.75, 'small'); if (c.quake) c.quake(0.06); }
    return;
  }
  if (C.ph === 'push') {   /* bên thắng đẩy luồng sang tới người bên kia */
    const Lz = C.win === L ? R : L, tgt = C.win === L ? mb.x : ma.x, k = Math.min(1, C.t / BEAM_T.push); C.x = C.px + (tgt - C.px) * k * k;
    if (C.t >= BEAM_T.push) {
      const W = C.win; ST.clashLast = { win: W.sp, lose: (W === L ? R : L).sp, adv: C.adv, T: +(ST.t - ST.clashT0).toFixed(2) }; ST.clash = null; vfx('pillar_white', Lz.x, Lz.y + 2, { ky: Lz.y + 3 }); vfx('daidiachan', Lz.x, Lz.y, { ground: true }); vfx('meteorboom', Lz.x, Lz.y - 8, { ky: Lz.y + 4 });
      ground(Lz.x, Lz.y + 2, CRACK, 0.95, 'big'); if (c.quake) c.quake(0.45); vfx('ko_burst', Lz.x, Lz.y, { ky: Lz.y + 3 }); sfx('smash'); duelSfx('clash_boom');   /* plan-49a: chớp = VFX PixelLab ko_burst (bỏ tô trắng cả màn bằng code) */
      W.act = null; Lz.act = null; hit(W, Lz, MOVES[W === C.a ? C.mvA : C.mvB], { mul: 1.5, noMiss: true, imp: true }); aoe(W, Lz.x, Lz.y, 34, 1.4, { noPlayer: true });
      ST.zoomOn = Lz; ST.camZoomT = 1.2; ST.stats.beamBoom = (ST.stats.beamBoom || 0) + 1;
    }
  }
}
function drawBeams(g, cx, cy) {   /* 2 luồng: ô lặp ngang từ miệng tới điểm va (bên phải lật), + khối nổ sáng ở điểm va */
  const C = ST.clash; if (!C || C.ph === 'align') return; const { L, R } = C, ma = beamMouth(L), mb = beamMouth(R), gr = C.ph === 'fight' ? C.grow : 1;
  const seg = (f, x0, x1, y, flip, yF) => { if (DFX.CODE) { const mo = flip ? x1 : x0, en = flip ? x0 : x1, mv = MOVES[f === C.a ? C.mvA : C.mvB], tw = BEAM_W[beamTier(mv)] || 22; DFX.codeBeam(g, f.types[0], mo, y, en, yF ?? y, 3, tw, cx, cy, ST.t, { wave: 0.6 }); ST.beamLast = { sp: f.sp, x0: Math.round(Math.min(x0, x1)), x1: Math.round(Math.max(x0, x1)), flip, y, w0: 3, w1: tw, art: 'code_' + f.types[0] }; return; }   /* p52e: luồng vẽ code */
    if (flip) x1 += 2; else x0 -= 1; if (beam2(g, f, x0, x1, y, yF ?? y, flip, cx, cy, 1, beamTier(MOVES[f === C.a ? C.mvA : C.mvB]))) return;   /* p53: lấn 1 px vào miệng, thon theo sức chiêu */ const m = VFXM && VFXM['beam_' + f.types[0]] || VFXM && VFXM.beam_nham, im = m && img(m.file); if (!im || x1 - x0 < 1) return; const sw = im.naturalWidth / m.n, fr = Math.floor(ST.t * m.fps) % m.n, k = sw / m.w;
    for (let x = x0; x < x1; x += m.w) { const w = Math.min(m.w, x1 - x); const sx = flip ? fr * sw + (m.w - w) * k : fr * sw;
      if (flip) { g.save(); g.translate((globalThis.__R89||Math.round)(x - cx) + w, 0); g.scale(-1, 1); g.drawImage(im, sx, 0, w * k, im.naturalHeight, 0, (globalThis.__R89||Math.round)(y - cy - m.ay), w, m.h); g.restore(); }
      else g.drawImage(im, sx, 0, w * k, im.naturalHeight, (globalThis.__R89||Math.round)(x - cx), (globalThis.__R89||Math.round)(y - cy - m.ay), w, m.h); } };
  const px = C.x, lx1 = ma.x + (px - ma.x) * gr, rx0 = mb.x - (mb.x - px) * gr;
  if (C.ph === 'push') { if (C.win === L) seg(L, ma.x, px, ma.y, false, mb.y); else seg(R, px, mb.x, mb.y, true, ma.y); }   /* plan-49a: 2 miệng lệch cao → tia đi bậc thang tới điểm va (không xoay ảnh) */
  else { seg(L, ma.x, lx1, ma.y, false, ma.y + (C.y - ma.y) * gr); seg(R, rx0, mb.x, mb.y, true, mb.y + (C.y - mb.y) * gr); }
  if (gr >= 1 && DFX.CODE) { DFX.clashBurst(g, L.types[0], R.types[0], px, C.y, cx, cy, ST.t, Math.max(fxPowerOf(SPECIES[L.sp], L.lv), fxPowerOf(SPECIES[R.sp], R.lv))); return; }   /* p79: điểm va vẽ lại (clash79.js), độ lực theo con mạnh hơn */   /* p52e: nổ ở điểm va vẽ code */
  if (gr >= 1) { const m = VFXM && (VFXM.clashbig || VFXM.clash), im = m && img(m.file); if (im) { const fr = Math.floor(C.t * m.fps) % m.n, w2 = im.naturalWidth / m.n; g.drawImage(im, fr * w2, 0, w2, im.naturalHeight, (globalThis.__R89||Math.round)(px - cx - m.ax), (globalThis.__R89||Math.round)(C.y - cy - m.ay), m.w, m.h); } }
}
/* plan-49a: thân tia = 1 dải PixelLab dài (beam2_<hệ>, ~156 px logic, dày 21–29 px) cuộn chảy ra xa miệng; lát gương nối tiếp (chu kỳ 2 dải ≈ 312 px) nên không thấy lặp;
   đầu miệng thon (10 px đầu cắt bớt hàng trên/dưới theo bậc 2 px — cắt ảnh, không phóng). */
const BEAM_W = { w: 12, n: 22, u: 36 };   /* p53: bề to ĐẦU XA (px logic) theo sức: yếu / thường / tuyệt chiêu */
const beamTier = mv => !mv ? 'n' : mv.ult ? 'u' : (mv.pow || 0) >= 60 ? 'n' : 'w';
const CONE = Object.fromEntries(['chan', 'nham', 'trieu', 'loi', 'phong', 'moc', 'suong', 'tinh', 'ma', 'am', 'anh', 'quang'].map(t => [t, { w: 'beam_' + t + '_w', n: 'beam_' + t + '_n', u: 'beam_' + t + '_u' }]));   /* p57: thư viện vfx2 đủ 12 hệ (nón 4 px ở miệng → 12 / 22 / 36 px) */   /* ảnh nón PixelLab theo hệ (assets/px/vfx2/<id>/<id>.png + .json) — hệ chưa có thì dùng beam2_<hệ> */
const CONEM = {};
function coneMeta(id) { if (CONEM[id] !== undefined) return CONEM[id]; CONEM[id] = null; try { fetch(BASE + 'vfx2/' + id + '/' + id + '.json').then(r => r.ok ? r.json() : null).then(j => { CONEM[id] = j; if (j) img('vfx2/' + id + '/' + id + '.png'); }).catch(() => { }); } catch (e) { } return null; }
function beamCone(g, f, x0, x1, y, yF, flip, cx, cy, th, tier) {   /* nón PixelLab: miệng = cột 0 (mảnh 4 px) → cột 156 (to nhất). Dài hơn 156: lặp khúc mảnh ở gần miệng rồi cả nón ở xa; ngắn hơn: lấy khúc 6 px rải đều trên nón (mỗi khúc vẽ 1:1, không phóng) → đầu xa luôn to nhất */
  const set = CONE[f.types[0]], id = set && set[tier || 'n'], m = id && coneMeta(id), im = m && img('vfx2/' + id + '/' + id + '.png'); if (!im) return false;
  x0 = Math.round(x0); x1 = Math.round(x1); const L = x1 - x0; if (L < 1) return true; const FW = m.fw, k = im.naturalWidth / m.n / FW, fr = Math.floor(ST.t * m.fps) % m.n, IH = im.naturalHeight, CH = 6;
  for (let d = 0; d < L; d += CH) { const len = Math.min(CH, L - d), s = L <= FW ? Math.min(FW - len, Math.round(d * (FW - len) / Math.max(1, L - len))) : Math.max(0, d - (L - FW)) || (d % 12), by = (globalThis.__R89||Math.round)(y + (yF - y) * (d + len / 2) / L - cy);
    const sh = Math.max(2, Math.round(IH * th / 2) * 2), sy = (IH - sh) >> 1, dh = sh / k, dx = flip ? x1 - d - len : x0 + d;
    if (flip) { g.save(); g.translate((globalThis.__R89||Math.round)(dx - cx) + len, 0); g.scale(-1, 1); g.drawImage(im, fr * FW * k + s * k, sy, len * k, sh, 0, by - dh / 2, len, dh); g.restore(); }
    else g.drawImage(im, fr * FW * k + s * k, sy, len * k, sh, (globalThis.__R89||Math.round)(dx - cx), by - dh / 2, len, dh); }
  ST.beamLast = { sp: f.sp, x0, x1, flip, y, w0: 4, w1: m.end_width_logic || m.fh, art: id }; return true;
}
function beam2(g, f, x0, x1, y, yF, flip, cx, cy, th = 1, tier = 'n') {
  if (beamCone(g, f, x0, x1, y, yF, flip, cx, cy, th, tier)) return true;
  const im3 = img('linhduel/vfx/beam3_' + f.types[0] + '.png'), m = im3 ? { w: im3.naturalWidth / 2 } : VFXM && (VFXM['beam2_' + f.types[0]] || VFXM.beam2_nham), im = im3 || (m && img(m.file)); if (!im) return false;   /* p53: dải DÀY beam3_<hệ> (PixelLab, 28–38 px logic — tools/px-p53-beam3.py) để đầu xa tới 36 px; chưa tải thì dùng beam2 */
  x0 = Math.round(x0); x1 = Math.round(x1); const L = x1 - x0; if (L < 1) return true;
  const W = m.w, k = im.naturalWidth / W, IH = im.naturalHeight, u = Math.floor(ST.t * 80) % (2 * W), slope = Math.abs(yF - y) > 1, W0 = 3, W1 = Math.max(W0 + 2, Math.min(IH / k, BEAM_W[tier] || 22) * th);   /* p53: THON tam giác — 3 px ở miệng → W1 ở đầu xa (cắt hàng giữa dải PixelLab, không phóng; dải hệ chỉ dày IH/2 px nên W1 ≤ bề dày ảnh) */
  let d = 0;
  while (d < L) {
    let p = ((d - u) % (2 * W) + 2 * W) % (2 * W); const mir = p >= W, q = mir ? p - W : p;
    let len = Math.min(L - d, W - q, 4); if (slope) len = Math.min(len, 3); const by = (globalThis.__R89||Math.round)(y + (yF - y) * (d + len / 2) / L - cy);
    const wl = W0 + (W1 - W0) * Math.min(1, (d + len) / L), sh = Math.max(2, Math.min(IH, Math.round(wl * k / 2) * 2)), sy = (IH - sh) >> 1, dh = sh / k;
    const sx = mir ? (W - q - len) * k : q * k, hflip = mir !== flip, dx = flip ? x1 - d - len : x0 + d;
    if (hflip) { g.save(); g.translate((globalThis.__R89||Math.round)(dx - cx) + len, 0); g.scale(-1, 1); g.drawImage(im, sx, sy, len * k, sh, 0, by - dh / 2, len, dh); g.restore(); }
    else g.drawImage(im, sx, sy, len * k, sh, (globalThis.__R89||Math.round)(dx - cx), by - dh / 2, len, dh);
    d += len;
  }
  ST.beamLast = { sp: f.sp, x0, x1, flip, y, w0: W0, w1: +W1.toFixed(1), art: (im3 ? 'beam3_' : 'beam2_') + f.types[0] }; return true;
}
function drawSteam(g, cx, cy) { const C = ST.clash; if (!C || C.ph !== 'fight' || C.grow < 1 || DFX.CODE) return; const m = VFXM && VFXM.clash_steam, im = m && img(m.file); if (!im) return; const fr = Math.floor(C.t * m.fps) % m.n, w2 = im.naturalWidth / m.n; g.globalAlpha = Math.min(1, (C.t - 0.25) / 0.2); g.drawImage(im, fr * w2, 0, w2, im.naturalHeight, (globalThis.__R89||Math.round)(C.x - cx - m.ax), (globalThis.__R89||Math.round)(C.y + 6 - cy - m.ay), m.w, m.h); g.globalAlpha = 1; }

function bigUlt(f, foe, mv, kind) {
  if (kind === 'trieu') {   /* 3 khúc tường sóng xếp dọc (front rộng ~1 màn), chạy ngang qua đối thủ ~1,1 s rồi đổ (bắn nước) */
    const dir = foe.x >= f.x ? 1 : -1, x0 = f.x - dir * 6, x1 = foe.x + dir * 70, ys = [-48, 0, 48];
    ST.waves.push({ f, mv, dir, x: x0, x0, x1, y: foe.y, ys, t: 0, T: 1.1, hit: false, seen: null }); ST.ctx.quake(0.25); sfx('splash'); return; }
  if (kind === 'chan') {   /* tảng đá khổng lồ rơi: vòng báo dưới đất, rơi 0,55 s, nện → nứt to + bụi + rung */
    let first = true;
    for (let i = 0; i < 3; i++) ST.timers.push({ t: 0.1 + i * 0.28, fn: () => {
      const mk = { x: foe.x + (foe.vx || 0) * 0.3 + (i ? (rnd() - 0.5) * 60 : 0), y: foe.y + (foe.vy || 0) * 0.3 + (i ? (rnd() - 0.5) * 30 : 0) }; clampField(mk);
      ST.shots.push({ f, mv, x: mk.x, y: mk.y, h: 170, t: 0, life: 0.55, kind: 'boulder', warn: true, onLand: s => {
        vfx('daidiachan', s.x, s.y, { ground: true }); vfx('meteorboom', s.x, s.y - 6, { ky: s.y + 1 }); vfx('dust', s.x - 14, s.y, { ground: true }); vfx('dust', s.x + 14, s.y, { ground: true });
        ground(s.x, s.y + 2, CRACK, 0.95, 'big'); aoe(f, s.x, s.y, 34, 1.4); ST.ctx.quake(0.3); sfx('smash'); duelSfx('boulder_land');
        if (Math.hypot(foe.x - s.x, foe.y - s.y) <= 26) { if (hit(f, foe, mv, { mul: first ? 0.45 : 0.25, noMiss: !first, kb: 140 })) first = false; } } }); } });
  }
}
function updWaves(dt) {
  for (const w of ST.waves) { w.t += dt; const k = Math.min(1, w.t / w.T); w.x = w.x0 + (w.x1 - w.x0) * k;
    { const fo = foeOf(w.f); if (!w.f.ultWarned && !w.hit && !fo.dead && Math.abs(fo.y - w.y) < 72) { const left = (Math.abs(fo.x - w.x) - 14) / (Math.abs(w.x1 - w.x0) / w.T || 1); if (left > 0 && left <= P52.WARN) { w.f.ultWarned = true; warnEdge(w.f, left, 'trieu_dang'); } } }   /* plan-52 #2 */
    if ((w.sp = (w.sp || 0) - dt) <= 0) { w.sp = 0.09; for (const oy of w.ys) vfx('splash', w.x + w.dir * 4, w.y + oy + 2, { ky: w.y + oy + 3 }); }
    for (const oy of w.ys) w.seen = aoe(w.f, w.x, w.y + oy, 22, 1.2, { seen: w.seen, noPlayer: true });
    const foe = foeOf(w.f); if (!w.hit && !foe.dead && Math.abs(foe.x - w.x) < 14 && Math.abs(foe.y - w.y) < 72) { w.hit = true; hit(w.f, foe, w.mv, { kb: 0 }); if (!foe.dead) foe.kb = { vx: w.dir * 300, vy: 0, t: 0.34, fly: true, rut: 0, bounced: false }; }
    if (w.t >= w.T) { w.done = true; for (const oy of w.ys) { vfx('ult_trieu', w.x, w.y + oy, { ky: w.y + oy + 0.5 }); vfx('splash', w.x, w.y + oy, { ky: w.y + oy + 1 }); } ST.ctx.quake(0.35); sfx('smash'); duelSfx('wave_crash'); if (!w.hit) text(foe.x, foe.y - 22, L(ST.ctx).miss, '#d8d8e8', 0.95); } }
  ST.waves = ST.waves.filter(w => !w.done);
}
function drawWave(g, w, oy, cx, cy) { const m = VFXM && VFXM.wave_wall, im = m && img(m.file); if (!im) return; const fr = Math.floor(w.t * m.fps + oy) % m.n, sw = im.naturalWidth / m.n, a = Math.min(1, w.t / 0.12, (w.T + 0.05 - w.t) / 0.15), x = (globalThis.__R89||Math.round)(w.x - cx), y = (globalThis.__R89||Math.round)(w.y + oy - cy);
  g.save(); g.globalAlpha = Math.max(0, a); g.translate(x, y); if (w.dir < 0) g.scale(-1, 1); g.drawImage(im, Math.abs(fr) * sw, 0, sw, im.naturalHeight, -m.ax, -m.ay, m.w, m.h); g.restore(); }

/* ĐÀO ĐẤT (Thạch Chấn Vương, review7): chui xuống tạo hố → đi ngầm để lại rãnh đất nổi → trồi lên dưới đối thủ hất tung. Hố / rãnh lưu tới hết trận (ST.scars, drawGround).
   Ảnh: linhduel/ui/dig_hole.png, dig_mound.png (pixflux). Đang ngầm: không trúng đòn. */
const DIG = { golem: { cd: 7, first: 4 } };
/* plan-49a: rãnh = chuỗi dấu tròn (gờ đất → lòng rãnh, 2 lượt vẽ) dựng từ ảnh PixelLab trench (ui/trench_ridge*, trench_groove*), vẽ sẵn vào canvas riêng rồi dán ở drawGround.
   Tối đa TRENCH_MAX rãnh; rãnh cũ mờ dần về 0,45; rãnh thứ 4 xoá rãnh cũ nhất. */
const TRENCH_MAX = 3;
function trenchStart(f) { for (const T of ST.trenches) T.old = true; const T = { pts: [{ x: Math.round(f.x), y: Math.round(f.y + 1) }], a: 0.95, cv: null, n: 0, seed: Math.floor(rnd() * 900) }; ST.trenches.push(T); while (ST.trenches.length > TRENCH_MAX) ST.trenches.shift(); f.dig.tr = T; }
function trenchPt(f, force) { const T = f.dig && f.dig.tr; if (!T || T.pts.length >= 120) return; const q = T.pts[T.pts.length - 1], x = Math.round(f.x), y = Math.round(f.y + 1); if (force || Math.hypot(x - q.x, y - q.y) >= 2) T.pts.push({ x, y }); }
function trHash(i) { let x = Math.imul(i + 1, 2654435761) >>> 0; x ^= x >>> 15; x = Math.imul(x, 2246822519) >>> 0; x ^= x >>> 13; return ((x >>> 0) % 1000) / 1000; }   /* >>> 0: XOR trả số có dấu → chỉ số âm (lỗi undefined.naturalWidth) */
function trenchCanvas(T) {   /* canvas KHÔNG có __hi (luật 25/09) — vẽ ảnh 1:1 điểm ảnh gốc, dán lại ở ½ cỡ.
   plan-49b: rãnh rộng ~18 px logic (gờ đất PixelLab 36 px ảnh), gờ đặt thưa + lệch ngẫu nhiên + xoay 90° → mép đất vỡ (trước: dấu tròn dày đặc thành ống trơn); lòng rãnh tối liền; cục đất văng 2 bên */
  if (T.cv && T.n === T.pts.length) return T.cv; const R = [0, 1, 2].map(i => img('linhduel/ui/trench_ridge' + i + '.png')), G = [0, 1, 2].map(i => img('linhduel/ui/trench_groove' + i + '.png')), K = [];
  for (let i = 0; i < 18; i++) K.push(img('linhduel/ui/trench_clod' + i + '.png')); if (R.some(i => !i) || G.some(i => !i) || K.some(i => !i)) return null;
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const p of T.pts) { x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y); x1 = Math.max(x1, p.x); y1 = Math.max(y1, p.y); }
  const pad = 26, c = T.cv || document.createElement('canvas'); c.width = (x1 - x0 + pad * 2) * 2; c.height = (y1 - y0 + pad * 2) * 2; const x = c.getContext('2d'); x.imageSmoothingEnabled = false;
  const P = T.pts, at = (p, dx, dy) => [Math.round((p.x - x0 + pad + dx) * 2), Math.round((p.y - y0 + pad + dy) * 2)], sd = T.seed || 0;
  P.forEach((p, i) => { if (i % 3 && i !== P.length - 1) return; const h = k => trHash(sd + i * 7 + k), im = R[[0, 1, 0, 1, 2][Math.floor(h(0) * 5)]], rot = Math.floor(h(1) * 4), [X, Y] = at(p, (h(2) - 0.5) * 4, (h(3) - 0.5) * 4);
    x.save(); x.translate(X, Y); x.rotate(rot * Math.PI / 2); x.drawImage(im, -(im.naturalWidth >> 1), -(im.naturalHeight >> 1)); x.restore(); });
  P.forEach((p, i) => { const im = G[i % 3], [X, Y] = at(p, (trHash(sd + i * 7 + 4) - 0.5), (trHash(sd + i * 7 + 5) - 0.5)); x.drawImage(im, X - (im.naturalWidth >> 1), Y - (im.naturalHeight >> 1)); });
  P.forEach((p, i) => { const h = k => trHash(sd + i * 13 + 50 + k); if (h(0) >= 0.16) return; const q = P[Math.min(i + 1, P.length - 1)], o = P[Math.max(i - 1, 0)], dx = q.x - o.x, dy = q.y - o.y, l = Math.hypot(dx, dy) || 1, s = h(1) < 0.5 ? 1 : -1, off = 11 + h(2) * 6;
    const im = K[h(3) < 0.3 ? Math.floor(h(4) * 6) : 6 + Math.floor(h(4) * 12)], [X, Y] = at(p, -dy / l * off * s, dx / l * off * s); x.drawImage(im, X - (im.naturalWidth >> 1), Y - (im.naturalHeight >> 1)); });
  T.cv = c; T.n = T.pts.length; T.ox = x0 - pad; T.oy = y0 - pad; return c;
}
function drawTrenches(g, cx, cy) { for (const T of ST.trenches) { const c = trenchCanvas(T); if (!c) continue; g.globalAlpha = T.a; g.drawImage(c, (globalThis.__R89||Math.round)(T.ox - cx), (globalThis.__R89||Math.round)(T.oy - cy), c.width / 2, c.height / 2); } g.globalAlpha = 1; }
function scar(src, x, y, a = 0.95) { ST.scars.push({ src, x, y, a, t: 0 }); if (ST.scars.length > 90) ST.scars.shift(); }
function startDig(f) { f.dig = { ph: 'down', t: 0, sink: 0, x0: f.x, y0: f.y, step: 0, nv: !!DFX.sceneOf('don_tho') }; f.digCd = DIG[f.sp].cd; f.clip = 'run'; f.ct = 0; f.moving = false;
  trenchStart(f); duelSfx('dig_down');   /* plan-49a: 1 rãnh liền mỗi lần đào (thay hố to + ụ rời — anh chê tổ ong) */ vfx('dust', f.x - 8, f.y, { ground: true }); vfx('dust', f.x + 8, f.y, { ground: true }); sfx('smash'); if (ST.ctx.quake) ST.ctx.quake(0.08);
  ST.calls[f.side] = { s: (ST.ctx.lang() === 'en' ? 'Dig' : 'Đào Đất') + '!', t: 0, ult: false, type: 'chan' }; ST.stats.dig = (ST.stats.dig || 0) + 1; ST.stats.acts[f.side + ':dao_dat'] = (ST.stats.acts[f.side + ':dao_dat'] || 0) + 1; }
function updDig(f, dt) { const D0 = f.dig; if (!D0 || !D0.nv) return updDig0(f, dt); ST.noVfx = (ST.noVfx || 0) + 1; try { return updDig0(f, dt); } finally { ST.noVfx--; } }   /* p52e */
function updDig0(f, dt) {   /* trả true khi đang đào (updFighter dừng ở đây) */
  const D = f.dig; if (!D) return false; D.t += dt; const foe = foeOf(f); f.clip = 'run'; f.ct += dt;   /* đang đào: không tính là đứng yên (clip chạy) */
  if (f.dead || ST.ph !== 'fight' && ST.ph !== 'ko') { f.dig = null; return false; }
  if (D.ph === 'down') { D.sink = Math.min(1, D.t / 0.45); if ((D.dq = (D.dq || 0) - dt) <= 0) { D.dq = 0.1; vfx('dust', f.x + (rnd() - 0.5) * 14, f.y, { ground: true }); } if (D.t >= 0.45) { D.ph = 'under'; D.t = 0; } return true; }
  if (D.ph === 'under') {   /* đi ngầm tới chân đối thủ, mỗi ~9 px để 1 ụ đất */
    const dx = foe.x - f.x, dy = foe.y - f.y, d = Math.hypot(dx, dy) || 1, sp = 135; f.fx = dx / d; f.fy = dy / d;
    const ox = f.x, oy = f.y; moveBy(f, dx / d * sp * dt, dy / d * sp * dt); clampField(f); D.step -= Math.hypot(f.x - ox, f.y - oy);
    trenchPt(f); if (D.step <= 0) { D.step = 14; if (rnd() < 0.5) vfx('dust', f.x, f.y, { ground: true }); }
    if (d < 8 || D.t > 1.6) { D.ph = 'up'; D.t = 0; trenchPt(f, true); duelSfx('dig_up'); if (D.nv) DFX.spawn('don_tho', f, foe, Math.max(0, DFX.info('chan_sk4').hits[0].t - 0.04), { noDefer: true });   /* p52e: trồi lên — đất đá phun vẽ code */ vfx('x2_chan_trong', f.x, f.y + 1, { ky: f.y - 0.5 });   /* p57: cột đất phun dưới đối thủ */ vfx('daidiachan', f.x, f.y, { ground: true }); vfx('meteorboom', f.x, f.y - 6, { ky: f.y + 1 }); vfx('dust', f.x - 12, f.y, { ground: true }); vfx('dust', f.x + 12, f.y, { ground: true });
      if (ST.ctx.quake) ST.ctx.quake(0.25); sfx('smash'); aoe(f, f.x, f.y, 26, 1.2, { noPlayer: true });
      if (!foe.dead && Math.hypot(foe.x - f.x, foe.y - f.y) < 20) { D.hitFoe = true; hit(f, foe, MOVES.nut_dat, { mul: 1.2, noMiss: true }); if (!foe.dead) { const a = Math.atan2(foe.y - f.y, foe.x - f.x) || (rnd() * 6.28); foe.kb = { vx: Math.cos(a) * 260, vy: Math.sin(a) * 260, t: 0.3, fly: true, rut: 0, bounced: false }; foe.toss = 0.5; } ST.stats.digHit = (ST.stats.digHit || 0) + 1; } }
    return true; }
  if (D.ph === 'up') { D.sink = Math.max(0, 1 - D.t / 0.3); if (D.t >= 0.3) { f.dig = null; f.clip = 'run'; f.ct = 0; } return true; }
  return false;
}
function drawDig(g, f, cx, cy) {   /* chui / trồi: chỉ vẽ phần thân trên mặt đất (cắt theo vạch chân) · đang ngầm: 1 ụ đất nhô nhúc nhích */
  const D = f.dig;
  if (D.ph === 'under' && VFXM && VFXM.x2_chan_go_dat) { const m = VFXM.x2_chan_go_dat, im = img(m.file); if (im) { const fr = Math.floor(ST.t * m.fps) % m.n, sw = im.naturalWidth / m.n; g.drawImage(im, fr * sw, 0, sw, im.naturalHeight, (globalThis.__R89||Math.round)(f.x - cx - m.ax), (globalThis.__R89||Math.round)(f.y - cy - m.ay), m.w, m.h); return; } }   /* p57: gò đất chạy (chan_go_dat) */
  if (D.ph === 'under') { const im = img('linhduel/ui/dig_mound.png'); if (im) g.drawImage(im, (globalThis.__R89||Math.round)(f.x - cx - im.naturalWidth / 4), (globalThis.__R89||Math.round)(f.y - cy - im.naturalHeight / 2 + 2 - (Math.floor(ST.t * 12) % 2)), im.naturalWidth / 2, im.naturalHeight / 2); return; }
  const S0 = SPR && SPR[f.sp], c = S0 && S0.idle; if (!c) return; const hh = c.ay / 2, gy = (globalThis.__R89||Math.round)(f.y - cy) + 1;
  g.save(); g.beginPath(); g.rect((globalThis.__R89||Math.round)(f.x - cx) - 60, gy - 120, 120, 120); g.clip(); g.translate(0, Math.round(D.sink * hh)); drawFighter(g, f, cx, cy); g.restore();
}

function seaJump(f, dt) {   /* sân biển: thú không bơi / không bay đứng trên bè, đối thủ xa thì nhảy sang bè (hoặc bờ) gần đối thủ hơn */
  if (!ST.inField || FIELD.kind !== 'sea' || FLY[f.sp] || SWIM[f.sp] || f.jump) return false; if ((f.jumpCd = (f.jumpCd || 0) - dt) > 0) return false; f.jumpCd = 0.5;
  const m = ST.ctx.S.map, foe = foeOf(f), d = dist(f, foe); if (d < 46) return false;
  const pts = (m.rafts || []).concat([{ x: 3 * 16 + 8, y: f.y }, { x: (FW - 3) * 16 + 8, y: f.y }]); let best = null;
  for (const c of pts) { const dc = Math.hypot(c.x - f.x, c.y - f.y); if (dc < 24 || dc > 96) continue; const v = Math.hypot(c.x - foe.x, c.y - foe.y); if (v < d - 12 && (!best || v + dc * 0.3 < best.v)) best = { c, v: v + dc * 0.3 }; }
  if (!best) return false; const q = nearWalk(ST.ctx, best.c.x + (rnd() - 0.5) * 6, best.c.y + (rnd() - 0.5) * 6);
  f.jump = { x0: f.x, y0: f.y, x1: q.x, y1: q.y, t: 0, T: 0.42 + Math.hypot(q.x - f.x, q.y - f.y) / 400 }; f.moving = true; vfx('dust', f.x, f.y, { ground: true }); ST.stats.jump = (ST.stats.jump || 0) + 1; return true;
}
function drawSwim(g, f, cx, cy) {   /* Bạch Kình trong nước: chìm nửa dưới (cắt theo mặt nước), lặn sâu hơn khi né */
  const S0 = SPR && SPR[f.sp], c = S0 && S0.idle; if (!c) return; const sink = f.dodge ? 9 : 4, gy = (globalThis.__R89||Math.round)(f.y - cy) - 1;
  g.save(); g.beginPath(); g.rect((globalThis.__R89||Math.round)(f.x - cx) - 60, gy - 120, 120, 120); g.clip(); g.translate(0, sink); drawFighter(g, f, cx, cy); g.restore();
}

/* ---------- hệ ---------- */
/* ===== plan-58 C.1 + D + E (29/10): ĐỘI NHIỀU THÚ lần lượt (3v3 / 6v6) · ĐỔI THÚ CHỦ ĐỘNG · GỌI / THU HỒI BẰNG ẤN CHẤN =====
   · ctx.duel.start({ team, foeTeam, mode: '3v3' | '6v6' }): mỗi bên 1 thú trên sân; con ngất → con kế được ném ra (Ấn Chấn), con cuối ngất mới K.O.! + banner thắng.
   · Đổi chủ động: bấm chân dung (điện thoại) / phím 1–6 (máy tính); hồi 3 s mỗi lần đổi; con thu về giữ nguyên máu + trạng thái (đối tượng thú giữ nguyên, không cập nhật khi ngồi ghế);
     con mới miễn đòn 0,5 s; đối thủ (AI) tự đổi khi con đang đánh bị khắc hệ và có con hợp hơn.
   · Gọi ra: huấn luyện viên ném Ấn Chấn (đá Seismic tròn, phù văn + vết nứt sáng theo MÀU HỆ con bên trong) bay vòng cung → nảy 2 lần → bung (PixelLab assets/px/duel/orb/) → thú hiện (chớp trắng).
     Thu về: thú phủ trắng xám + cột sáng (recall_glow) → co lại → vệt sáng (recall_streak) bay về tay huấn luyện viên. Dùng đầu trận, khi đổi, cuối trận.
   · Tư thế ném: clip 'throw' PixelLab của người chơi (p52d; 4 hướng S/W/E/N như mọi clip người chơi), NPC chưa có thì 'pick'. Tiếng: duelSfx orb_throw / orb_pop / recall. */
const ROSTER = ['golem', 'rongdo', 'bachkinh', 'loiho', 'vitbao', 'diepnhan', 'tuyetky', 'tinhmieu', 'cuoitho', 'banhbao', 'culibong', 'bovimach'];
const TEAM_N = { '1v1': 1, '3v3': 3, '6v6': 6 };
const SW = { CD: 3, INV: 0.5, RECALL: 0.42, STREAK: 0.3, THROW: 0.55, BOUNCE: 0.26, POP: 0.3, MID_T: 1.5, AI_EVERY: 1.2, AI_GAP: 6, ARC: 34, SEND2: 0.22 };
const spOfE = e => (typeof e === 'string' ? e : e && e.sp);
/* p67:b3:begin */
/* p67 (khối 3): sau ROSTER / DIG */
for (const sp of ["macuu", "hacgiac", "hoahung", "nguuson"]) if (!ROSTER.includes(sp)) ROSTER.push(sp);
DIG.nguuson = {"cd": 7, "first": 4};
/* p67:b3:end */
/* p72:b3:begin */
DIG.chuichui = { cd: 7, first: 4 }; DIG.chuichui2 = { cd: 7, first: 4 };   /* p72 Chuột Chũi: Đào Hầm = đào ngầm có sẵn (don_tho) — SAU khai báo DIG (tránh TDZ) */
/* p72:b3:end */
/* p96:b3:begin */
/* p96 (khối 3) */
for (const sp of ["molandak", "molandak2", "molandak3"]) if (!ROSTER.includes(sp)) ROSTER.push(sp);
/* p96:b3:end */
/* p99:b3:begin */
/* p99 (khối 3) */
for (const sp of ["moyaki", "moyaki2", "moyaki3"]) if (!ROSTER.includes(sp)) ROSTER.push(sp);
/* p99:b3:end */
/* p100:b3:begin */
/* p100 (khối 3) */
for (const sp of ["chog", "chog2", "chog3"]) if (!ROSTER.includes(sp)) ROSTER.push(sp);
/* p100:b3:end */
function teamList(arr, n, avoid, lv) {   /* đội từ opts (chuỗi loài hoặc { sp, lv }); thiếu thì bù từ ROSTER (không trùng loài, tránh loài bên kia nếu còn chỗ) */
  const out = (arr || []).map(e => ({ sp: spOfE(e), lv: (e && e.lv) || lv, name: (e && e.name) || null, lt: (e && e.lt) || null, mv: (e && e.mv) || null, ult: (e && e.ult) || null, auto78: !!(e && e.auto78) })).filter(e => SPECIES[e.sp] && LOAD[e.sp]).slice(0, Math.max(1, Math.min(6, n)));   /* p52d: đội save 6 con vào trận 3v3 → 3 con đầu */
  for (const pass of [0, 1]) for (const sp of ROSTER) { if (out.length >= n) break; if (!out.some(e => e.sp === sp) && (pass || !avoid.includes(sp))) out.push({ sp, lv }); }
  return out;
}
const ORBM = {}; let ORBP = null;
const ORB_IDS = ['orb_spin', 'orb_pop', 'recall_glow', 'recall_streak'];
function orbLoad() { if (ORBP) return ORBP; ORBP = Promise.all(ORB_IDS.map(id => fetch(BASE + 'duel/orb/' + id + '.json').then(r => (r.ok ? r.json() : null)).then(j => { if (!j) return; ORBM[id] = { n: j.n, w: j.fw, h: j.fh, ax: j.ax, ay: j.ay, fps: j.fps || 14, file: 'duel/orb/' + id + '.png' }; img(ORBM[id].file); }).catch(() => { }))); return ORBP; }
const hexRgb = h => { const s = (h || '#9fe8ff').replace('#', ''); return [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)]; };
const ORBC = new Map();
function orbTint(id, type) {   /* vết nứt / phù văn cyan của ảnh PixelLab → màu hệ (giữ độ sáng: lõi sáng thì gần trắng); đá xám giữ nguyên. Canvas KHÔNG __hi, vẽ bằng drawImage 9 tham số */
  const m = ORBM[id], im = m && img(m.file); if (!im) return null; if (!type) return im; const key = id + ':' + type; let c = ORBC.get(key); if (c) return c;
  c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight; const x = c.getContext('2d'); x.drawImage(im, 0, 0);
  try { const D = x.getImageData(0, 0, c.width, c.height), d = D.data, tc = hexRgb(TYPE_COLOR[type]);
    for (let i = 0; i < d.length; i += 4) { if (!d[i + 3]) continue; const r = d[i], g2 = d[i + 1], b = d[i + 2]; if (!(b > r + 25 && g2 > r + 10)) continue;
      const lum = (r * 0.3 + g2 * 0.59 + b * 0.11) / 255, w = 0.18 + 0.82 * Math.max(0, Math.min(1, (lum - 0.6) / 0.35)); for (let k = 0; k < 3; k++) d[i + k] = Math.round(tc[k] + (255 - tc[k]) * w); }
    x.putImageData(D, 0, 0); } catch (e) { }
  ORBC.set(key, c); return c;
}
function orbDraw(g, id, type, fr, x, y, flip, a = 1) {
  const m = ORBM[id]; if (!m) return false; const src = orbTint(id, type); if (!src) return false; const sw = (src.naturalWidth || src.width) / m.n, sh = src.naturalHeight || src.height; fr = Math.max(0, Math.min(m.n - 1, fr | 0));
  const X = Math.round(x - (flip ? m.w - m.ax : m.ax)), Y = Math.round(y - m.ay); if (a < 1) g.globalAlpha = a;
  if (flip) { g.save(); g.translate(X + m.w, Y); g.scale(-1, 1); g.drawImage(src, fr * sw, 0, sw, sh, 0, 0, m.w, m.h); g.restore(); } else g.drawImage(src, fr * sw, 0, sw, sh, X, Y, m.w, m.h);
  if (a < 1) g.globalAlpha = 1; return true;
}
const SILC = new Map();
function silOf(im, col) { const key = im.src + col; let c = SILC.get(key); if (c) return c; c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight; const x = c.getContext('2d'); x.drawImage(im, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = col; x.fillRect(0, 0, c.width, c.height); SILC.set(key, c); return c; }
const GRAYC = new Map();
function grayOf(im) { let c = GRAYC.get(im); if (c) return c; c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight; const x = c.getContext('2d'); x.drawImage(im, 0, 0);
  try { const D = x.getImageData(0, 0, c.width, c.height), d = D.data; for (let i = 0; i < d.length; i += 4) { const l = Math.round((d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11) * 0.7 + 20); d[i] = d[i + 1] = d[i + 2] = l; } x.putImageData(D, 0, 0); } catch (e) { }
  GRAYC.set(im, c); return c; }   /* chân dung thú đã ngất (không dùng CSS / ctx.filter — Safari điện thoại) */
/* p52e (anh 30/10): BÓNG dưới chân để biết tiếp đất hay lơ lửng. Ảnh flyshadow PixelLab (36×16, 2 tông) — KHÔNG phóng to: cỡ khác ghép từ 4 góc của chính ảnh
   + lặp cột / hàng giữa (cùng mật độ điểm ảnh), dựng sẵn vào canvas KHÔNG __hi (luật 25/09) rồi dán ở ½ cỡ. Bóng luôn ở y đất (không theo độ cao);
   lên cao thì nhỏ lại + nhạt dần, tiếp đất đầy đặn; trên nước nhạt hơn. */
const SHC = new Map();
function shadowCv(W, H) {   /* W, H: điểm ảnh gốc (2× logic) */
  const key = W + 'x' + H; let c = SHC.get(key); if (c) return c; const m = VFXM && VFXM.flyshadow, im = m && img(m.file); if (!im) return null;
  const X0 = 4, X1 = 32, Y0 = 2, Y1 = 14, CW = X1 - X0, CH = Y1 - Y0, hw = Math.min(W >> 1, CW >> 1), hh = Math.min(H >> 1, CH >> 1);
  c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d'); x.imageSmoothingEnabled = false;
  const cols = [[X0, 0, hw], [X1 - hw, W - hw, hw]], rows = [[Y0, 0, hh], [Y1 - hh, H - hh, hh]];
  for (const [sx, dx, w] of cols) for (const [sy, dy, h] of rows) x.drawImage(im, sx, sy, w, h, dx, dy, w, h);
  if (W > 2 * hw) for (const [sy, dy, h] of rows) x.drawImage(im, X0 + (CW >> 1), sy, 1, h, hw, dy, W - 2 * hw, h);   /* cột giữa (đặc 1 tông + viền) lặp ngang */
  if (H > 2 * hh) { x.drawImage(c, 0, hh - 1, W, 1, 0, hh, W, H - 2 * hh); }
  SHC.set(key, c); return c;
}
function drawShadow(g, x, y, w, z, cx, cy, a0 = 0.5) {   /* w: bề ngang bóng lúc tiếp đất (logic) · z: độ cao thân trên đất */
  const k = Math.max(0.42, 1 - Math.max(0, z) / 55), W = Math.max(8, Math.round(w * k) * 2), H = Math.max(4, Math.min(14, Math.round(W * 0.3 / 2) * 2)), c = shadowCv(W, H); if (!c) return;
  g.globalAlpha = a0 * (0.35 + 0.65 * k) * (isWater(x, y) ? 0.45 : 1); g.drawImage(c, 0, 0, W, H, (globalThis.__R89||Math.round)(x - cx - W / 4), (globalThis.__R89||Math.round)(y - cy - H / 4), W / 2, H / 2); g.globalAlpha = 1;
}
function shadowZ(f) { const tz = f.toss > 0 ? Math.sin(Math.PI * (1 - f.toss / (f.tossT || 0.5))) * (f.tossH || 22) : 0; return (f.alt || 0) + tz; }
function drawShadows(g, cx, cy) {
  for (const f of ST.F) { if (f.hidden || f.absent || f.dig || f.hide || f.recall || f.suck) continue; if (inSwim(f) && !f.dead) continue;   /* đang bơi: gợn nước sẵn có */
    drawShadow(g, f.x, f.y, Math.max(10, Math.min(44, bodyW(f) * 0.8)), shadowZ(f), cx, cy, f.fade != null ? 0.72 * Math.max(0, f.fade) : 0.72); }
  for (const side of [0, 1]) { const t = trainerOf(side); if (t && t.x != null && !t.hidden) drawShadow(g, t.x, t.y, 12, 0, cx, cy, 0.55); }
  for (const o of ST.orbs || []) drawShadow(g, o.x, o.y, 8, (o.h || 0) + 6, cx, cy, 0.45);
  const C = ST.catch; if (C && !C.gone && C.x != null && C.ph !== 'ok') drawShadow(g, C.x, C.y, 8, (C.h || 0) + 4, cx, cy, 0.45);
  ST.shadowN = (ST.shadowN || 0) + 1;
}
function trainerOf(side) { const c = ST.ctx; return side ? (ST.foe && typeof ST.foe === 'object' ? ST.foe : ST.villager) : c && c.S.player; }
function handOf(side) {   /* tay huấn luyện viên (điểm ném / điểm vệt sáng bay về) — phía hướng vào sân */
  const tr = trainerOf(side), o = ST.F[1 - side]; if (!tr) { const f = ST.F[side]; return { x: f ? f.x : 0, y: f ? f.y - 12 : 0, gy: f ? f.y : 0 }; }
  const tx = ST.inField ? FW * 8 : (o ? o.x : tr.x), s = tx >= tr.x ? 1 : -1; return { x: tr.x + s * 6, y: tr.y - 11, gy: tr.y + 1 };
}
function landFor(side, from) {   /* chỗ cầu rơi: chỗ con cũ đứng (đổi giữa trận) / chỗ mở màn; không sát đối thủ */
  const c = ST.ctx, o = ST.F[1 - side], sp = (ST.spawn && ST.spawn[side]) || { x: FW * 8, y: FH * 8 }; let x = from ? from.x : sp.x, y = from ? from.y : sp.y;
  if (o && o !== from && !o.absent && Math.hypot(x - o.x, y - o.y) < 60) { const h = handOf(side), dx = h.x - o.x, dy = h.gy - o.y, d = Math.hypot(dx, dy) || 1; x = o.x + dx / d * 70; y = o.y + dy / d * 70; }
  if (ST.inField) { x = Math.max(56, Math.min(FW * 16 - 56, x)); y = Math.max(FIELD_TOP + 16, Math.min(FIELD_BOT - 8, y)); }
  const q = nearWalk(c, x, y); return { x: q.x, y: q.y };
}
function pose(side, x, y) { const tr = trainerOf(side); if (!tr) return; try { if (tr.faceTo) tr.faceTo(x, y); const cl = tr.hasAct && (tr.hasAct('throw') ? 'throw' : tr.hasAct('pick') ? 'pick' : null); if (cl) { tr.act(cl, 0.42); if (!side) ST.poseP = ((tr.action && tr.action.dur) || 0.42) + 0.05; } } catch (e) { } }   /* p52d: clip NÉM PixelLab 'throw' (người chơi c0 / hung_b / chad — tools/px-p52d-throw.py); NPC chưa có thì 'pick' */
function benchReset(f) {   /* thu về: bỏ mọi việc đang làm; GIỮ máu, trạng thái (bỏng / tê…), bậc chỉ số, hồi chiêu */
  P73.bench(f); P78.bench(f); f.act = null; f.dodge = null; f.kb = null; f.plan = null; f.queued = null; f.pin = 0; f.hyp = null; f.dig = null; f.hide = null; f.echo = null; f.ghosts = null; f.jump = null; f.relocate = null; f.koFly = null; f.toss = 0; f.hurtT = 0; f.moving = false; f.clip = 'idle'; f.ct = 0; f.alt = 0; f.flash = 0; f.tint = 0;
}
function purgeOwned(f) { ST.shots = ST.shots.filter(s => s.f !== f); ST.runners = ST.runners.filter(r => r.f !== f); ST.zones = (ST.zones || []).filter(z => z.f !== f); ST.beams2 = (ST.beams2 || []).filter(b => b.f !== f); ST.waves = ST.waves.filter(w => w.f !== f); if (ST.warn && ST.warn.f === f) warnOff('swap'); if (ST.zoomOn === f) { ST.zoomOn = null; ST.camZoomT = 0; } }
function swBanner(side, s, col) { ST.swBan[side] = { s, t: 0, col: col || '#fff6e4' }; }
function startSwap(side, to, why) {   /* why: start (mở màn) · faint (con trước ngất) · manual / key / tap / ai / api (đổi chủ động) · end (cuối trận: chỉ thu về) */
  const from = why === 'start' ? null : ST.F[side], S = { side, why, t: 0, ph: from ? 'recall' : 'throw', from, to, land: null };
  ST.sw[side] = S; (ST.swLog = ST.swLog || []).push({ t: +ST.t.toFixed(2), rt: +(ST.rt || 0).toFixed(2), side, from: from && from.sp, to: to && to.sp, why, hpFrom: from ? Math.round(from.hp) : null, stFrom: from && from.status ? from.status.id : null }); if (ST.swLog.length > 60) ST.swLog.shift();
  if (from) { const dead = from.dead; benchReset(from); from.dead = dead; from.absent = true; from.recall = { t: 0 }; purgeOwned(from); ST.fxo.push({ id: 'recall_glow', x: from.x, y: from.y, t: 0, ky: from.y - 0.4 });   /* cột sáng sau lưng — thấy thú hoá trắng xám co lại phía trước */ duelSfx('recall', { side, sp: from.sp }); if (why !== 'end' || !dead) swBanner(side, L(ST.ctx).back(fName(ST.ctx, from)), '#e8e8f0'); ST.stats.recall = (ST.stats.recall || 0) + 1; }
  else throwStart(S);
}
function throwStart(S) {
  const side = S.side, to = S.to, c = ST.ctx; S.ph = 'throw'; S.t = 0; const land = landFor(side, S.from || null); S.land = land;
  benchReset(to); to.x = land.x; to.y = land.y; to.vx = to.vy = 0; to.absent = true; to.hidden = true; to.recall = null; to.inv = 0; face(to, ST.F[1 - side] ? ST.F[1 - side].x : FW * 8, ST.F[1 - side] ? ST.F[1 - side].y : land.y); if (Math.abs(to.fx) < 0.3) to.fx = side ? -1 : 1;
  ST.F[side] = to; const h = handOf(side); ST.orbs.push({ side, type: to.types[0], x0: h.x, y0: h.y, gy0: h.gy, x1: land.x, y1: land.y, t: 0, ph: 'fly', x: h.x, y: h.y, h: 0 });
  pose(side, land.x, land.y); duelSfx('orb_throw', { side, sp: to.sp }); swBanner(side, L(c).go(fName(c, to)), TYPE_COLOR[to.types[0]]); ST.stats.orbThrow = (ST.stats.orbThrow || 0) + 1;
  if (ST.ph !== 'intro') camCut(c);   /* plan-52 #10: đổi thú = cắt camera 1 khung */
}
function updSwaps(dt) {
  for (let i = 0; i < 2; i++) { if (ST.swCd[i] > 0) ST.swCd[i] = Math.max(0, ST.swCd[i] - dt); const b = ST.swBan[i]; if (b && (b.t += dt) > 1.5) ST.swBan[i] = null;
    const q = ST.swQ[i]; if (q) { if ((ST.rt || 0) - q.t > 2.5 || ST.swCd[i] > 0) ST.swQ[i] = null; else if (!swapBlock(i, q.idx)) requestSwap(i, q.idx, q.why + '_q'); } }
  if (ST.sendQ && ST.sendQ.length) { ST.sendT = (ST.sendT || 0) + dt; while (ST.sendQ.length && ST.sendT >= ST.sendQ[0].at) { const q = ST.sendQ.shift(); startSwap(q.side, q.to, 'start'); } }
  if (ST.ph === 'send' || ST.ph === 'done') for (const f of ST.F) { if (f.flash > 0) f.flash = Math.max(0, f.flash - dt); if (!f.dead) f.ct += dt; }   /* ngoài lúc đánh updFighter không chạy: chớp trắng lúc hiện phải tự tắt */
  for (const e of ST.fxo) e.t += dt; ST.fxo = ST.fxo.filter(e => { const m = ORBM[e.id]; return m ? e.t < m.n / m.fps : e.t < 0.6; });
  for (const s of ST.streaks) s.t += dt; ST.streaks = ST.streaks.filter(s => s.t < s.T);
  for (const o of ST.orbs) {
    o.t += dt;
    if (o.ph === 'fly') { const k = Math.min(1, o.t / SW.THROW), gy = o.gy0 + (o.y1 - o.gy0) * k; o.x = o.x0 + (o.x1 - o.x0) * k; o.y = gy; o.h = (o.gy0 - o.y0) * (1 - k) + Math.sin(Math.PI * k) * SW.ARC; if (k >= 1) { o.ph = 'bounce'; o.t = 0; vfx('dust', o.x1, o.y1, { ground: true }); } }
    else if (o.ph === 'bounce') { const k = Math.min(1, o.t / SW.BOUNCE); o.x = o.x1; o.y = o.y1; o.h = k < 0.62 ? Math.sin(Math.PI * k / 0.62) * 7 : Math.sin(Math.PI * (k - 0.62) / 0.38) * 2.5; if (k >= 1) { o.ph = 'pop'; o.t = 0; o.h = 0; ST.fxo.push({ id: 'orb_pop', type: o.type, x: o.x1, y: o.y1 - 6, t: 0, ky: o.y1 + 0.6 }); duelSfx('orb_pop', { side: o.side }); ST.stats.orbPop = (ST.stats.orbPop || 0) + 1; } }
  }
  ST.orbs = ST.orbs.filter(o => o.ph !== 'pop');
  for (let i = 0; i < 2; i++) {
    const S = ST.sw[i]; if (!S) continue; S.t += dt;
    if (S.ph === 'recall') { const f = S.from; f.recall.t = S.t; if (S.t >= SW.RECALL) { f.hidden = true; f.recall = null; const h = handOf(i); ST.streaks.push({ x0: f.x, y0: f.y - Math.max(6, standH(f) * 0.5), x1: h.x, y1: h.y, t: 0, T: SW.STREAK }); S.ph = 'streak'; S.t = 0; } continue; }
    if (S.ph === 'streak') { if (S.t >= SW.STREAK) { if (S.to) throwStart(S); else { ST.sw[i] = null; } } continue; }
    if (S.ph === 'throw') { const o = ST.orbs.find(q => q.side === i); if (!o) { S.ph = 'pop0'; S.t = 0; } continue; }
    if (S.ph === 'pop0') { if (S.t >= 0.12) { S.ph = 'pop'; S.t = 0; const f = S.to; f.hidden = false; f.flash = 0.14; vfx('dust', f.x, f.y, { ground: true }); } continue; }   /* thú hiện khi cầu đã nứt bung (khung loé lớn), không hiện cùng lúc với cầu còn nguyên */
    if (S.ph === 'pop' && S.t >= SW.POP) { const f = S.to; f.absent = false; f.inv = SW.INV; ST.sw[i] = null; ST.stats.popIn = (ST.stats.popIn || 0) + 1; (ST.swLog[ST.swLog.length - 1] || {}).done = +ST.t.toFixed(2); }
  }
  if ((ST.ph === 'send' || (ST.ph === 'ko' && ST.end && ST.end.mid && ST.end.sent)) && !ST.sw[0] && !ST.sw[1] && !(ST.sendQ && ST.sendQ.length) && ST.F.every(f => !f.absent)) {   /* mở màn / con kế đã ra sân → đánh tiếp */
    const was = ST.ph; ST.ph = 'fight'; ST.ko = null; ST.end = null; ST.zoomOn = null; ST.camZoomT = 0; ST.slowOn = false; if (was === 'send') sfx('alarm'); camCut(ST.ctx);
  }
}
const narrow = ctx => ST.inField && ((ctx && ctx.VW) || 320) < FW * 16 - 40;   /* khung không thấy trọn sân (điện thoại dọc) */
function sendOut() { ST.sendQ = ST.wild ? [{ side: 0, to: ST.F[0], at: 0 }] : [{ side: 0, to: ST.F[0], at: 0 }, { side: 1, to: ST.F[1], at: narrow(ST.ctx) ? 1.3 : SW.SEND2 }]; ST.sendT = 0; }   /* plan-58 C.2: thú hoang không ném cầu */   /* khung hẹp: 2 bên ném lần lượt để camera bám từng quả */
function camFollowOrb(ctx) {
  if (!narrow(ctx)) return null; const o = ST.orbs[ST.orbs.length - 1]; if (o) return { x: (o.x + o.x1) / 2, y: (o.y - o.h * 0.5 + o.y1) / 2 - 10 };
  const s = ST.streaks[ST.streaks.length - 1]; if (s) { const k = Math.min(1, s.t / s.T); return { x: s.x0 + (s.x1 - s.x0) * k * 0.6, y: s.y0 - 6 }; } return null;
}
function swapBlock(side, idx) {
  if (!ST.multi) return 'single'; if (ST.ph !== 'fight') return 'phase'; if (ST.sw[side] || ST.sw[1 - side]) return 'busy'; if (ST.swCd[side] > 0) return 'cd';
  const T0 = ST.team[side], to = T0 && T0[idx], f = ST.F[side]; if (!to) return 'none'; if (to === f) return 'active'; if (to.dead) return 'fainted';
  if (!f || f.dead) return 'dead'; if (ST.clash && (ST.clash.a === f || ST.clash.b === f || ST.clash.L === f || ST.clash.R === f)) return 'clash';
  if (f.pin > 0 || f.dig || f.hide || (f.kb && f.kb.fly) || (f.act && f.act.ult)) return 'locked'; if (ST.cut || ST.ko || ST.imp) return 'phase'; return '';
}
function requestSwap(side, idx, why = 'manual') {
  const r = swapBlock(side, idx); if (r && !/_q$/.test(why) && (['phase', 'locked', 'clash'].includes(r) || (r === 'busy' && !ST.sw[side]))) { ST.swQ[side] = { idx, why, t: ST.rt || 0 }; }   /* đang cắt cảnh / tuyệt chiêu / đối thủ đang đổi: nhớ lệnh, đổi ngay khi được (≤ 2,5 s); đang đổi chính mình / đang hồi thì bỏ */
  if (r) { ST.swDeny = { side, idx, r, t: +ST.t.toFixed(2) }; (ST.swDenyLog = ST.swDenyLog || []).push(ST.swDeny); if (ST.swDenyLog.length > 40) ST.swDenyLog.shift(); return false; }
  ST.swQ[side] = null; ST.swCd[side] = SW.CD; ST.swLast[side] = ST.t; startSwap(side, ST.team[side][idx], why); return true;
}
function aiSwap(side, dt) {   /* AI (Leader / đối thủ): con đang đánh bị hệ đối thủ KHẮC (×1,5) và trong ghế có con hợp hơn rõ → thu về, ném con đó */
  if (!ST.multi || !ST.aiSw[side] || ST.ph !== 'fight' || ST.sw[side]) return;
  if ((ST.aiT[side] = (ST.aiT[side] ?? SW.AI_EVERY) - dt) > 0) return; ST.aiT[side] = SW.AI_EVERY;
  const f = ST.F[side], o = ST.F[1 - side]; if (!f || !o || f.dead || o.dead || o.absent || f.absent) return;
  if (ST.t - (ST.swLast[side] ?? -99) < SW.AI_GAP || f.hp / f.max < 0.15) return;
  if (typeMul(o.types[0], f.types) < 1.4) return;
  const score = c => typeMul(c.types[0], o.types) / Math.max(0.5, typeMul(o.types[0], c.types)) * (0.4 + 0.6 * c.hp / c.max);
  let best = -1, bs = score(f) * 1.15; ST.team[side].forEach((c, i) => { if (c !== f && !c.dead) { const s = score(c); if (s > bs) { bs = s; best = i; } } });
  ST.aiLog = (ST.aiLog || []); ST.aiLog.push({ t: +ST.t.toFixed(2), side, cur: f.sp, vs: o.sp, best: best >= 0 ? ST.team[side][best].sp : null }); if (ST.aiLog.length > 40) ST.aiLog.shift();
  if (best < 0 || rnd() > 0.85) return;
  if (requestSwap(side, best, 'ai')) ST.stats.aiSwap = (ST.stats.aiSwap || 0) + 1;
}
function drawRecall(g, f, cx, cy) {   /* thu về: phủ trắng xám dần (0–45 %) rồi bóng trắng xám co lại về giữa thân */
  const S0 = SPR && SPR[f.sp]; if (!S0) return; const c = S0[f.clip] || S0.idle, im = img(c.file); if (!im) return; const k = Math.min(1, f.recall.t / SW.RECALL);
  let fr = Math.floor(f.ct * (c.fps || FPS[f.clip]));   /* p64: clip fps rieng (duel_sprites.json) */ fr = (f.clip === 'idle' || f.clip === 'run' || f.clip === 'fly') ? fr % c.n : Math.min(c.n - 1, fr);
  const { r, flip } = rowOf(c, f), w = c.cw / 2, h = c.ch / 2, ax = c.ax / 2, ay = c.ay / 2, x = (globalThis.__R89||Math.round)(f.x - cx), y = (globalThis.__R89||Math.round)(f.y - (f.alt || 0) - cy), mid = Math.round(standH(f) * 0.5);
  const one = (src, s, a) => { g.save(); g.globalAlpha *= a; g.translate(x, y - mid); g.scale(flip ? -s : s, s); g.drawImage(src, fr * c.cw, r * c.ch, c.cw, c.ch, -ax, -ay + mid, w, h); g.restore(); };
  if (k < 0.45) { one(im, 1, 1); one(silOf(im, '#ecebf2'), 1, Math.min(1, k / 0.45) * 0.9); }
  else { const s = Math.max(0.12, 1 - (k - 0.45) / 0.55 * 0.88); one(silOf(im, '#ecebf2'), s, 1); }
}
function drawStreak(g, s, cx, cy) { const k = s.t / s.T, e = 1 - (1 - k) * (1 - k), x = s.x0 + (s.x1 - s.x0) * e, y = s.y0 + (s.y1 - s.y0) * e - Math.sin(Math.PI * k) * 10, m = ORBM.recall_streak; if (!m) return; orbDraw(g, 'recall_streak', null, Math.floor(s.t * m.fps) % m.n, x - cx, y - cy, s.x1 < s.x0); }
function drawOrb(g, o, cx, cy) { const m = ORBM.orb_spin; if (!m) return; const fr = o.ph === 'fly' ? Math.floor(o.t * m.fps) % m.n : o.ph === 'bounce' ? Math.floor(o.t * m.fps * 0.6) % m.n : 0; orbDraw(g, 'orb_spin', o.type, fr, o.x - cx, o.y - o.h - 6 - cy, false); }
function orbDrawables(out, cx, cy) {
  const g = ST.ctx.g;
  for (const o of ST.orbs) out.push({ y: o.y + 0.7, f: () => drawOrb(g, o, cx, cy) });
  for (const s of ST.streaks) out.push({ y: Math.max(s.y0, s.y1) + 40, f: () => drawStreak(g, s, cx, cy) });   /* vệt sáng bay ngang trên đầu mọi thứ */
  for (const e of ST.fxo) { const m = ORBM[e.id]; if (!m) continue; out.push({ y: e.ky, f: () => orbDraw(g, e.id, e.type || null, Math.floor(e.t * m.fps), e.x - cx, e.y - cy, false) }); }
}
function drawSwapBanner(ug, ctx, W, u, y0, side) {   /* banner đổi thú: trượt ra từ mép phía phe đó (dưới HUD, cạnh hàng chân dung) */
  const b = ST.swBan[side]; if (!b) return; const right = side === 1, fs = Math.round(u * 4), k = Math.min(1, b.t / 0.15), out = b.t > 1.3 ? (b.t - 1.3) / 0.2 : 0, ps = ST.multi ? Math.round(u * 7.2) + Math.round(u * 2.6) : Math.round(u * 1.6);
  ug.save(); ug.font = `bold italic ${fs}px VT323, monospace`; const tw = ug.measureText(b.s).width + fs * 1.4, th = Math.round(fs * 1.4);
  const x = right ? W - ps - tw + (1 - k) * u * 3 : ps - (1 - k) * u * 3; ug.globalAlpha = Math.max(0, Math.min(k, 1 - out));   /* hiện dần ngay cạnh hàng chân dung (không quét qua chân dung) */
  ug.fillStyle = 'rgba(16,12,22,.88)'; rr(ug, x, y0, tw, th, th / 2); ug.fill(); ug.lineWidth = 2; ug.strokeStyle = b.col; ug.stroke();
  ug.fillStyle = b.col; rr(ug, right ? x + tw - 10 : x + 4, y0 + 4, 6, th - 8, 3); ug.fill();
  ug.fillStyle = '#fff6e4'; ug.textAlign = 'center'; ug.textBaseline = 'middle'; ug.fillText(b.s, x + tw / 2, y0 + th / 2 + 1); ug.restore();
}
const COARSE = (() => { try { return matchMedia('(pointer:coarse)').matches; } catch (e) { return false; } })();
function drawTeam(ug, ctx, W, H, u, y0) {   /* hàng chân dung đội ở 2 mép: con đang đánh viền vàng, con ngất xám, hồi đổi (3 s) phủ tối từ trên xuống + số giây; máy tính có số phím */
  ST.teamRects = []; ST.uiCv = ug.canvas; if (!ST.multi) return;
  const pad = Math.round(u * 1.6);
  for (const side of [0, 1]) { const T0 = ST.team[side], n = T0.length, ps = Math.round(u * (n > 3 ? 5.2 : 7.2)), gap = Math.round(u * (n > 3 ? 0.8 : 1.1)), x = side ? W - pad - ps : pad;
    T0.forEach((f, i) => { const y = y0 + i * (ps + gap), on = ST.F[side] === f, pp = SPR && SPR._port && SPR._port[f.sp], pim = pp && img(pp);
      ug.save(); ug.imageSmoothingEnabled = false; ug.fillStyle = on ? 'rgba(48,36,16,.9)' : 'rgba(16,12,22,.82)'; rr(ug, x, y, ps, ps, 6); ug.fill();
      if (pim) { const k = (ps - 6) / Math.max(pim.naturalWidth, pim.naturalHeight), src = f.dead ? grayOf(pim) : pim; ug.save(); if (side) { ug.translate(x + ps, 0); ug.scale(-1, 1); ug.drawImage(src, (ps - pim.naturalWidth * k) / 2, y + (ps - pim.naturalHeight * k) / 2 - 1, pim.naturalWidth * k, pim.naturalHeight * k); } else ug.drawImage(src, x + (ps - pim.naturalWidth * k) / 2, y + (ps - pim.naturalHeight * k) / 2 - 1, pim.naturalWidth * k, pim.naturalHeight * k); ug.restore(); }
      if (f.dead) { ug.fillStyle = 'rgba(10,8,14,.45)'; rr(ug, x, y, ps, ps, 6); ug.fill(); }
      const hk = Math.max(0, f.hp / f.max), bh = Math.max(3, Math.round(u * 0.9)); ug.fillStyle = '#1b1622'; ug.fillRect(x + 3, y + ps - bh - 3, ps - 6, bh); if (hk > 0) { ug.fillStyle = hk > 0.5 ? '#5fd35a' : hk > 0.22 ? '#f2c335' : '#e8503a'; ug.fillRect(x + 3, y + ps - bh - 3, Math.max(1, Math.round((ps - 6) * hk)), bh); }
      const busy = !side && !on && !f.dead && (ST.swCd[0] > 0 || ST.sw[0] || ST.sw[1] || ST.ph !== 'fight');
      if (busy) { const cdk = ST.swCd[0] > 0 ? ST.swCd[0] / SW.CD : 1; ug.fillStyle = 'rgba(8,6,12,.6)'; ug.fillRect(x + 1, y + 1, ps - 2, Math.round((ps - 2) * cdk)); if (ST.swCd[0] > 0) { ug.font = `bold ${Math.round(ps * 0.42)}px VT323, monospace`; ug.textAlign = 'center'; ug.textBaseline = 'middle'; ug.lineWidth = 3; ug.strokeStyle = '#120e18'; ug.fillStyle = '#fff'; const s = String(Math.ceil(ST.swCd[0])); ug.strokeText(s, x + ps / 2, y + ps / 2); ug.fillText(s, x + ps / 2, y + ps / 2); } }
      ug.lineWidth = on ? 3 : 2; ug.strokeStyle = on ? '#ffd45e' : f.dead ? '#4a4452' : TYPE_COLOR[f.types[0]]; rr(ug, x, y, ps, ps, 6); ug.stroke();
      if (!side && !COARSE) { const r0 = Math.round(ps * 0.2); ug.fillStyle = on ? '#ffd45e' : '#2a2234'; ug.beginPath(); ug.arc(x + r0 + 1, y + r0 + 1, r0, 0, Math.PI * 2); ug.fill(); ug.font = `bold ${Math.round(r0 * 1.6)}px VT323, monospace`; ug.textAlign = 'center'; ug.textBaseline = 'middle'; ug.fillStyle = on ? '#1a1420' : '#f5ecdc'; ug.fillText(String(i + 1), x + r0 + 1, y + r0 + 2); }
      ug.restore(); ST.teamRects.push({ side, i, x, y, w: ps, h: ps }); });
  }
}
function teamTap(e) {   /* điện thoại / chuột: bấm chân dung đội mình để đổi (nuốt sự kiện — không đi tới chỗ bấm) */
  if (!ST.on || !ST.multi || !ST.teamRects || !ST.uiCv) return; const cv = ST.uiCv, r = cv.getBoundingClientRect(); if (!r.width || !r.height) return;
  const px = (e.clientX - r.left) * cv.width / r.width, py = (e.clientY - r.top) * cv.height / r.height;
  for (const q of ST.teamRects) if (px >= q.x - 4 && px <= q.x + q.w + 4 && py >= q.y - 4 && py <= q.y + q.h + 4) { e.preventDefault(); e.stopPropagation(); if (!q.side) { const ok = requestSwap(0, q.i, 'tap'); ST.stats.tap = (ST.stats.tap || 0) + 1; ST.lastTap = { i: q.i, ok }; } return; }
}
if (typeof window !== 'undefined') { if (window.__ldTeamTap) window.removeEventListener('pointerdown', window.__ldTeamTap, true); window.__ldTeamTap = e => { try { teamTap(e); } catch (er) { } }; window.addEventListener('pointerdown', window.__ldTeamTap, true); }
function normOpts(o, ctx) {   /* p48b leaderarena: { foe: id, foeNpc, team: đội LEADER } → foeTeam; team của người chơi = myTeam (chưa có thì bù) */
  o = { ...(o || {}) }; if (o.foeNpc && typeof o.foeNpc === 'object') { if (!o.foeTeam && o.team && o.field === 'leader_arena') { o.foeTeam = o.team; o.team = o.myTeam || null; if (!o.mode) o.mode = o.foeTeam.length >= 6 ? '6v6' : o.foeTeam.length > 1 ? '3v3' : '1v1'; } o.foe = o.foeNpc; }
  if (o.foe != null && typeof o.foe !== 'object') delete o.foe;
  /* p52d (plan-58 C.6 phần đội): chưa có team → đội save.sys.chanthu.team (myTeam) cắt theo thể thức: 3v3 ≤ 3, 6v6 ≤ 6, đấu thường 1 con đầu; thiếu con thì teamList bù như cũ */
  if (!o.wild && !(o.team && o.team.length)) { const mt = o.myTeam && o.myTeam.length ? o.myTeam : ctx ? saveTeam(ctx) : []; const fl = (o.foeTeam || []).length, N = TEAM_N[o.mode] || (fl >= 6 ? 6 : fl > 1 ? 3 : 1); if (!o.mode && fl > 1) o.mode = N + 'v' + N; if (mt.length) o.team = mt.slice(0, N); }
  return o;
}
function makeTeams(opts, lv, s0, s1) {
  const N = TEAM_N[opts.mode] || Math.max((opts.team || []).length, (opts.foeTeam || []).length, 1);
  const avoidA = (opts.foeTeam || []).map(spOfE).concat(opts.foeSp ? [opts.foeSp] : []);
  const tA = teamList(opts.team && opts.team.length ? opts.team : [opts.mySp || DEF_SP[0]], N, avoidA, lv), tB = teamList(opts.foeTeam && opts.foeTeam.length ? opts.foeTeam : [opts.foeSp || DEF_SP[1]], N, tA.map(e => e.sp), lv);
  const mk = (side, e, i, s) => Object.assign(mkFighter(side, e.sp, e.lv || lv, s.x, s.y, e), { slot: i, absent: true, hidden: true, nick: e.name || null, ltId: e.lt || null });
  ST.team = [tA.map((e, i) => mk(0, e, i, s0)), tB.map((e, i) => mk(1, e, i, s1))]; ST.F = [ST.team[0][0], ST.team[1][0]];
  ST.multi = ST.team[0].length > 1 || ST.team[1].length > 1; ST.mode = opts.mode || (ST.multi ? N + 'v' + N : '1v1'); ST.lastSp = [tA[0].sp, tB[0].sp]; ST.spawn = [{ x: s0.x, y: s0.y }, { x: s1.x, y: s1.y }];
  ST.sw = [null, null]; ST.swCd = [0, 0]; ST.swLast = [-99, -99]; ST.swBan = [null, null]; ST.aiT = [SW.AI_EVERY, SW.AI_EVERY]; ST.orbs = []; ST.streaks = []; ST.fxo = []; ST.sendQ = null; ST.sendT = 0;
  ST.swQ = [null, null]; ST.swLog = []; ST.swDenyLog = []; ST.aiLog = []; ST.endRc = 0; ST.poseP = 0; ST.cbDone = false; ST.teamRects = []; ST.aiSw = opts.aiSwap ? [!!opts.aiSwap[0], !!opts.aiSwap[1]] : [false, true];
}
function koMid(dt0) {   /* con giữa đội ngất: khung KO + bay văng như cũ (không chậm cảnh / không K.O.! / không banner) → 1,5 s sau thu về + ném con kế */
  const E = ST.end; E.t += dt0 * ST.speed; for (const f of ST.F) if (!f.dead && !f.act && !f.absent) f.clip = 'idle';
  if (E.t >= SW.MID_T && !E.sent && !ST.sw[E.side]) { E.sent = true; const to = ST.team[E.side][E.next]; if (to && !to.dead) startSwap(E.side, to, 'faint'); }
}
function endRecalls() {   /* cuối trận: thu con thua (đã ngất) rồi con thắng về Ấn Chấn */
  const E = ST.end; if (!E || E.mid) return; const lose = 1 - E.win;
  if (E.t >= 1.95 && !(ST.endRc & 1) && ST.F[lose] && !ST.sw[lose] && !(ST.wild && lose === 1)) { ST.endRc |= 1; startSwap(lose, null, 'end'); }
  if (E.t >= 2.35 && !(ST.endRc & 2) && ST.F[E.win] && !ST.sw[E.win] && !ST.F[E.win].dead && !(ST.wild && E.win === 1)) { ST.endRc |= 2; startSwap(E.win, null, 'end'); }
}
function endCb() { if (ST.cbDone) return; ST.cbDone = true; ltDuelEnd();   /* p72 */ const o = ST.opts || {}; try { if (ST.catchRes === 'ok') { if (o.onCatch) ST.catchWhere = o.onCatch(); } else if (ST.catchRes === 'fled') { if (o.onFlee) o.onFlee(); } else if (ST.end && ST.end.win === 0) { if (o.onWin) o.onWin(); } else if (o.onLose) o.onLose(); } catch (e) { console.error('duel cb', e); } }

/* ===== plan-58 C.2 (2026-10-30): ẤN THU — bắt Chấn Thú hoang =====
   Máu thú hoang ≤ 30 % → nút / phím (C hoặc E) ném Ấn Thu. Tỉ lệ p = gốc theo độ hiếm × (1,6 − 2 × máu%) (thường 0,6 · hiếm 0,35 · huyền thoại 0,1), kẹp 3–95 %.
   Lắc tối đa 3 lần, mỗi lần qua với xác suất p^(1/3): qua đủ 3 = bắt được; hụt ở lần thứ k → bung ra, thú bỏ chạy (lát sau mới hiện lại — chanthu.js).
   Ảnh: assets/px/duel/anthu/ (PixelLab: _wip/p52c/_gen/px-p52catch-anthu.py + px-p52catch-build.py). Tiếng: catch_shake / catch_ok / catch_fail (tools/el-sfx.py). */
const CATCH = { AT: 0.3, DAZE: 2.4, THROW: 0.5, SUCK: 0.42, DROP: 0.3, SHAKE: 0.5, GAP: 0.32, OK: 1.9, FAIL: 0.5, FLEE: 1.2 };
const CATCH_BASE = { thuong: 0.6, hiem: 0.35, huyen: 0.1 };
const ANTM = {}; let ANTP = null; const ANT_IDS = ['anthu_spin', 'anthu_shake', 'anthu_ok', 'anthu_fail'];
function antLoad() { if (ANTP) return ANTP; ANTP = Promise.all(ANT_IDS.map(id => fetch(BASE + 'duel/anthu/' + id + '.json').then(r => (r.ok ? r.json() : null)).then(j => { if (!j) return; ANTM[id] = { n: j.n, w: j.fw, h: j.fh, ax: j.ax, ay: j.ay, fps: j.fps || 12, file: 'duel/anthu/' + id + '.png' }; img(ANTM[id].file); }).catch(() => { }))); img('duel/anthu/anthu_icon.png'); return ANTP; }
function antDraw(g, id, fr, x, y, a = 1) { const m = ANTM[id], im = m && img(m.file); if (!im) return; const sw = im.naturalWidth / m.n; if (a < 1) { g.save(); g.globalAlpha = a; } g.drawImage(im, (fr % m.n) * sw, 0, sw, im.naturalHeight, Math.round(x - m.ax), Math.round(y - m.ay), m.w, m.h); if (a < 1) g.restore(); }   /* ảnh 2× → vẽ cỡ logic */
const rarOf = f => (ST.wild && f && f.side === 1 && ST.wild.rarity) || (SPECIES[f.sp] && SPECIES[f.sp].rarity);   /* p52d: thú hiếm theo giờ / thời tiết mang độ hiếm 'hiem' của lần xuất hiện */
function catchP(f) { const k = f.hp / f.max, base = CATCH_BASE[rarOf(f)] ?? 0.4; return Math.max(0.03, Math.min(0.95, base * (1.6 - 2 * k))); }
function ballsLeft() { const c = ST.ctx && ST.ctx.chanthu; return c ? c.balls() : 0; }
function catchWindow() { const f = ST.F[1]; return !!(ST.wild && ST.on && ST.ph === 'fight' && !ST.catch && f && !f.dead && !f.absent && f.hp <= f.max * CATCH.AT); }
function canCatch() { return catchWindow() && !ST.cut && !(ST.ko && !ST.ko.go) && !ST.imp && !ST.clash && ballsLeft() > 0; }
function startCatch(ctx) {
  if (!canCatch()) return false; const c = ctx.chanthu; if (!c || !c.useBall()) return false;
  const f = ST.F[1], p = catchP(f), q = Math.pow(p, 1 / 3); let n = 0;
  if (ST.catchForce === true) n = 3; else if (ST.catchForce === false) n = 2; else while (n < 3 && rnd() < q) n++;
  const ok = n === 3, h = handOf(0);
  for (const x of ST.F) { x.act = null; x.kb = null; x.dodge = null; x.moving = false; x.queued = null; x.plan = null; x.hurtT = 0; x.pin = 0; x.hide = null; if (x.clip !== 'idle') { x.clip = 'idle'; x.ct = 0; } }
  ST.shots = []; ST.runners = []; ST.zones = []; ST.beams2 = []; ST.waves = []; if (ST.warn) warnOff('catch'); ST.dimOn = false;
  ST.catch = { ph: 'throw', t: 0, x0: h.x, y0: h.y, gy0: h.gy, x1: f.x, y1: f.y + 1, mid: Math.max(6, Math.round(standH(f) * 0.5)), x: h.x, y: h.gy, h: h.gy - h.y, ok, shakes: ok ? 3 : Math.max(1, n), done: 0, p };
  ST.ph = 'catch'; pose(0, f.x, f.y); duelSfx('orb_throw', { side: 0, anthu: true }); ST.stats.catchThrow = (ST.stats.catchThrow || 0) + 1;
  (ST.catchLog = ST.catchLog || []).push({ t: +ST.t.toFixed(2), sp: f.sp, hpK: +(f.hp / f.max).toFixed(3), p: +p.toFixed(3), n, ok }); catchBtn(ctx); return true;
}
function updCatch(dt, ctx) {
  const C = ST.catch; if (!C) return; C.t += dt; const f = ST.F[1], me = ST.F[0];
  for (const x of ST.F) if (!x.dead && !x.hidden) x.ct += dt;
  if (C.ph === 'throw') { const k = Math.min(1, C.t / CATCH.THROW); C.x = C.x0 + (C.x1 - C.x0) * k; C.y = C.gy0 + (C.y1 - C.gy0) * k; C.h = (C.gy0 - C.y0) * (1 - k) + C.mid * k + Math.sin(Math.PI * k) * 26;
    if (k >= 1) { C.ph = 'suck'; C.t = 0; f.suck = { t: 0 }; f.flash = 0.12; duelSfx('recall', { side: 1, anthu: true }); } return; }
  if (C.ph === 'suck') { f.suck.t = C.t; if (C.t >= CATCH.SUCK) { f.suck = null; f.hidden = true; C.ph = 'drop'; C.t = 0; } return; }
  if (C.ph === 'drop') { const k = Math.min(1, C.t / CATCH.DROP); C.h = k < 0.7 ? C.mid * (1 - k / 0.7) : Math.sin(Math.PI * (k - 0.7) / 0.3) * 3; if (k >= 1) { C.h = 0; C.ph = 'wait'; C.t = 0; if (isWater(C.x, C.y)) vfx('swim_ripple', C.x, C.y + 2, { ground: true }); else vfx('dust', C.x, C.y, { ground: true }); } return; }   /* rơi xuống nước (sân biển): gợn nước thay bụi */
  if (C.ph === 'wait') { if (C.t >= CATCH.GAP) { if (C.done < C.shakes) { C.ph = 'shake'; C.t = 0; duelSfx('catch_shake', { n: C.done + 1 }); if (isWater(C.x, C.y)) vfx('swim_ripple', C.x, C.y + 2, { ground: true }); } else if (C.ok) catchOK(ctx); else catchFail(ctx); } return; }
  if (C.ph === 'shake') { if (C.t >= CATCH.SHAKE) { C.done++; C.ph = 'wait'; C.t = 0; } return; }
  if (C.ph === 'ok') { if (C.t >= CATCH.OK && ST.ph === 'catch') { ST.ph = 'done'; ST.end = { t: 0, win: 0, caught: true }; sfx('win'); endCb(); endPanel(ctx); catchBtn(ctx); if (ST.catchWhere) text(C.x, C.y - 26, ST.catchWhere === 'box' ? L(ctx).toBox : L(ctx).toTeam, '#bfefff', 0.9, 2); } return; }
  if (C.ph === 'fail') { if (C.t >= CATCH.FAIL) { C.ph = 'flee'; C.t = 0; f.fade = 1; text(f.x, f.y - 34, L(ctx).fled(fName(ctx, f)), '#ffb0a0', 1.05, 1.8); } return; }
  if (C.ph === 'flee') { const ux = f.x >= me.x ? 1 : -1; f.fx = ux; f.fy = 0.2; f.clip = SPR && SPR[f.sp] && SPR[f.sp].run ? 'run' : 'idle'; moveBy(f, ux * 95 * dt, -12 * dt); f.fade = Math.max(0, 1 - C.t / CATCH.FLEE);
    if (C.t >= CATCH.FLEE && ST.ph === 'catch') { f.hidden = true; f.fade = null; ST.ph = 'done'; ST.end = { t: 0, win: 0, fled: true }; endCb(); endPanel(ctx); catchBtn(ctx); } }
}
function catchOK(ctx) { const C = ST.catch, f = ST.F[1]; C.ph = 'ok'; C.t = 0; ST.catchRes = 'ok'; ST.fxo.push({ id: 'anthu_ok', ant: true, x: C.x, y: C.y - 8, t: 0, ky: C.y + 0.6 }); duelSfx('catch_ok', { sp: f.sp }); text(C.x, C.y - 40, L(ctx).caught(fName(ctx, f)).toUpperCase(), '#ffd45e', 1.3, 2.2); ST.stats.caught = (ST.stats.caught || 0) + 1; }
function catchFail(ctx) { const C = ST.catch, f = ST.F[1]; C.ph = 'fail'; C.t = 0; ST.catchRes = 'fled'; C.gone = true; ST.fxo.push({ id: 'anthu_fail', ant: true, x: C.x, y: C.y - 8, t: 0, ky: C.y + 0.6 }); duelSfx('catch_fail', { sp: f.sp });
  f.hidden = false; f.flash = 0.14; f.daze = 0; face(f, f.x + (f.x >= ST.F[0].x ? 1 : -1) * 20, f.y); ST.stats.catchFail = (ST.stats.catchFail || 0) + 1; }
function drawSuck(g, f, cx, cy) {   /* bị hút vào Ấn Thu: phủ vàng nhạt dần rồi bóng vàng co lại về phía viên ấn (như thu về Ấn Chấn, màu khác) */
  const S0 = SPR && SPR[f.sp]; if (!S0) return; const c = S0[f.clip] || S0.idle, im = img(c.file); if (!im) return; const k = Math.min(1, f.suck.t / CATCH.SUCK), C = ST.catch;
  const fr = Math.floor(f.ct * FPS[f.clip]) % c.n, { r, flip } = rowOf(c, f), w = c.cw / 2, h = c.ch / 2, ax = c.ax / 2, ay = c.ay / 2, mid = Math.round(standH(f) * 0.5);
  const px = f.x + ((C ? C.x : f.x) - f.x) * Math.max(0, k - 0.45) / 0.55, py = f.y, x = (globalThis.__R89||Math.round)(px - cx), y = (globalThis.__R89||Math.round)(py - cy);
  const one = (src, s, a) => { g.save(); g.globalAlpha *= a; g.translate(x, y - mid); g.scale(flip ? -s : s, s); g.drawImage(src, fr * c.cw, r * c.ch, c.cw, c.ch, -ax, -ay + mid, w, h); g.restore(); };
  if (k < 0.45) { one(im, 1, 1); one(silOf(im, '#ffe7a8'), 1, Math.min(1, k / 0.45) * 0.9); } else one(silOf(im, '#ffe7a8'), Math.max(0.1, 1 - (k - 0.45) / 0.55 * 0.9), 1);
}
function catchDrawables(out, g, cx, cy) {
  for (const e of ST.fxo) if (e.ant) { const m = ANTM[e.id]; if (m) out.push({ y: e.ky, f: () => antDraw(g, e.id, Math.min(m.n - 1, Math.floor(e.t * m.fps)), e.x - cx, e.y - cy) }); }
  const C = ST.catch; if (!C || C.gone) return; if (C.ph === 'ok') { if (C.t > 0.56) out.push({ y: C.y + 0.4, f: () => antDraw(g, 'anthu_shake', 0, C.x - cx, C.y - cy) }); return; }   /* đã bắt được: 0,56 s đầu khung 'anthu_ok' vẽ cả viên ấn, sau đó viên ấn nằm yên */
  if (C.ph === 'throw') { const m = ANTM.anthu_spin; out.push({ y: C.y + 0.4, f: () => antDraw(g, 'anthu_spin', Math.floor(C.t * (m ? m.fps : 14)), C.x - cx, C.y - C.h - cy) }); return; }
  const fr = C.ph === 'shake' ? [0, 1, 0, 3, 0][Math.min(4, Math.floor(C.t / CATCH.SHAKE * 5))] : 0;
  out.push({ y: C.y + 0.4, f: () => antDraw(g, 'anthu_shake', fr, C.x - cx, C.y - (C.h || 0) - cy) });
}
function catchBtn(ctx) {   /* nút nhỏ giữa đáy màn: chỉ hiện trong cửa sổ bắt (thú hoang ≤ 30 % máu) */
  let el = document.getElementById('ld-catch'); const on = !!(ctx && catchWindow());
  if (!on) { if (el && !el.hidden) el.hidden = true; return; }
  if (!el) { css(); el = document.createElement('button'); el.id = 'ld-catch'; document.body.appendChild(el); el.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); if (ST.ctx && canCatch()) startCatch(ST.ctx); }); }
  const n = ballsLeft(), s = (n > 0 ? L(ctx).ball(n) : L(ctx).noBall) + (COARSE ? '' : ' · C'); if (el.dataset.s !== s) { el.dataset.s = s; el.innerHTML = `<img src="${BASE}duel/anthu/anthu_icon.png" alt="">${s}`; }
  el.classList.toggle('off', n <= 0); el.hidden = false;
}
const upd0 = (dt, ctx) => linhduel.upd0x(dt, ctx);
export const linhduel = {
  id: 'linhduel',
  always: true,
  onZoneEnter(ctx) {
    ST.ctx = ctx; loadMeta();
    if (ST.on) endBattle(ctx);
    if (typeof window !== 'undefined') window.__duel = api(ctx);
    ctx.linhDuel = { start: o => startDuel(ctx, o || {}), on: () => ST.on, ask: n => ask(ctx, n) };
    ctx.duelLead = () => myLead(ctx); ctx.ltDuelTeam = () => ltTeam(ctx);   /* p72: chanthu (thú hoang) dùng đội gộp */
    ctx.ldKit = { mk: (sp, lv, e, x, y) => mkFighter(0, sp, lv, x, y, e), draw: (g, f, cx, cy) => drawFighter(g, f, cx, cy, false), load: () => loadDuel(), ready: () => !!SPR, has: (f, c) => !!(SPR && SPR[f.sp] && SPR[f.sp][c]), clipT: (f, c) => { const s = SPR && SPR[f.sp] && SPR[f.sp][c]; return s ? s.n / (s.fps || FPS[c] || 10) : 0.5; }, impT: c => (FPS[c] && IMPACT[c] != null ? impactT(c) : 0.25), move: (f, dx, dy) => { const k105 = ctx.envfx && ctx.envfx.inFlood && ctx.envfx.inFlood(f.x, f.y) ? 0.7 : 1; return moveBy(f, dx * k105, dy * k105); },   /* p105w-move: lội vùng ngập chậm 30 % */ near: (x, y) => nearWalk(ctx, x, y), name: sp => spName(ctx, sp) };   /* p79: comp79 (thả Chấn Thú) dùng chung sprite + va chạm của trận */
    ctx.duel = { wildKey: () => (ST.on && ST.wild ? ST.wild.key || null : null), start: o => startDuel(ctx, o || {}), active: () => ST.on, swap: i => requestSwap(0, i, 'api') };   /* plan-58 C.1: khớp p48b (leaderarena: ctx.duel.start({ foe, foeNpc, team, field, onWin, onLose })) */   /* móc: Sàn Đấu từng map (Leader) gọi start({ foe, foeSp, mySp, lv, reward }) */
    if (!ctx.__ldPet) { ctx.__ldPet = true; }
    ctx.registerCloser('duel', () => { });
    ctx.lblHide = (x, y) => ST.on && !ST.inField && ST.F.some(f => Math.hypot(f.x - x, f.y - y) < 120);   /* main.js (bản nháp): chỉ dùng khi đấu tại chỗ (Đấu Trường Leader) */
    const p = ctx.S.player;
    if (ctx.S.zone.id === 'duel_field') {
      const P0 = ST.pending; ST.pending = null; if (!P0) { leaveField(ctx); return; }   /* tải lại game giữa sân tạm → về chỗ cũ / Làng */
      if (P0.wild) { ST.villager = null; ST.foe = null; ST.fieldKind = FIELD.kind; p.dir = 2; loadDuel().then(() => startBattle(ctx, { ...P0, foe: null })); return; }   /* plan-58 C.2: thú hoang đứng sẵn — không có huấn luyện viên đối thủ */
      const m = ctx.S.map; p.dir = 2; const fm = P0.foeM || pickFoe(ctx), n = new ctx.NPC(fm, m.duelFoe.x, m.duelFoe.y, P0.foeSheet || ctx.npcSheet(fm), () => 0.5); n.busy = true; n.dir = 1; n.duelHost = true; ST.villager = n;
      ST.fieldKind = FIELD.kind; loadDuel().then(() => startBattle(ctx, { ...P0, foe: n }));
      return;
    }
    if (ST.restore && ST.restore.zone === ctx.S.zone.id) { const r = ST.restore; p.x = r.x; p.y = r.y; p.dir = r.dir; ST.restore = null; ctx.S.camDX = 0; ctx.S.camDY = 0; }   /* về ĐÚNG chỗ cũ */
    if (P79HOST()) hostTrainer(ctx);   /* p79 (anh chốt 02/11): bỏ huấn luyện viên ngoài map — đấu chính thức ở Sàn Leader; link &host=1 bật lại để thử */
  },
  onZoneLeave(ctx) { catchBtn(null); ctx.S.camZoomUI = false; ST.multi = false; ST.teamRects = []; ST.orbs = []; ST.streaks = []; ST.fxo = []; ST.sw = [null, null]; ST.sendQ = null; ctx.S.camZoomSnap = false; if (ST.on) { ST.on = false; ST.ph = 'off'; ST.F = []; showMoves(ctx, false); hidePanel(); zoom(ctx, false); ctx.S.camZoom = 1; ctx.S.camFocus = null; } hideAsk(); ST.villager = null; },
  near(ctx) {
    const v = ST.villager; if (!v || ST.on) return null; const p = ctx.S.player, d = Math.hypot(p.x - v.x, p.y - v.y);
    return d < 30 ? { label: L(ctx).talk, x: v.x, y: v.y - 2, limit: 30, priority: true, data: 'duel' } : null;
  },
  interact(ctx, cand) { if (cand && cand.data === 'duel') ask(ctx, ST.villager); },
  key(code, ctx) {
    if (!ST.on) return askKey(code, ctx);
    if (ST.multi && /^Digit[1-6]$/.test(code)) { requestSwap(0, +code[5] - 1, 'key'); return true; }   /* plan-58: phím 1–6 đổi thú */
    if ((code === 'KeyC' || code === 'KeyE') && canCatch()) { startCatch(ctx); return true; }   /* plan-58 C.2: ném Ấn Thu */
    if (code === 'KeyR' && ST.ph === 'done' && !ST.wild) { startBattle(ctx, { ...(ST.opts || {}) }); return true; }
    if ((code === 'KeyE' || code === 'Enter' || code === 'Escape') && ST.ph === 'done') { endBattle(ctx); return true; }
    return false;
  },
  update(dt0, ctx) {
    try { upd0(dt0, ctx); } catch (e) { ST.err = String(e && e.stack || e).slice(0, 600); throw e; }
  },
  upd0x(dt0, ctx) {
    if (ST.villager) { try { ST.villager.update(dt0, ctx.S.map, [], null); } catch (e) { } }
    if (!ST.on) return;
    let dt = dt0 * ST.speed; ST.ctx = ctx; ST.rt = (ST.rt || 0) + dt0; dimTick(ctx, dt0);
    if (DFX.CODE) { if (!ST.warmQ && ST.team) { ST.warmQ = 1; const ids = new Set(); for (const T0 of ST.team) for (const q of T0 || []) for (const id of MV78(q) || []) ids.add(id); const ks = [...ids].map(id => DFX.sceneOf(id)).filter(Boolean); DFX.prewarm(ks.filter(k => k.endsWith('ult')).concat(ks.filter(k => !k.endsWith('ult')))); } if (DFX.warmLeft()) DFX.warmTick(ST.ph === 'intro' || ST.ph === 'send' ? 4 : DFX.list().length ? 0.4 : 1.2); }   /* p52e: vẽ sẵn hình tĩnh cảnh code của 2 đội (tuyệt chiêu trước), rải theo khung */   /* plan-52: ST.rt = giờ thật (giới hạn impact); tối sân khi tích tuyệt chiêu */
    if (ST.weather && (ST.wxT -= dt) <= 0) { ST.weather = null; ST.wxT = 0; }   /* p72: thời tiết hết hạn */
    for (const c of ST.calls) if (c) c.t += dt;
    for (const x of ST.texts) x.t += dt; ST.texts = ST.texts.filter(x => x.t < x.life);
    updKnocks(dt0); if (!ST.inField) crowdCtl(ctx, dt0); occl(ctx, dt0);
    if ((ST.terrT -= dt0) <= 0) { ST.terrT = 2; ST.terr = terrainOf(ctx); }
    if (ST.ph === 'intro') { ST.introT += dt; if (ST.introT > 2.25) { ST.ph = 'send'; sendOut(); }   /* plan-58: 2 huấn luyện viên ném Ấn Chấn rồi mới đánh (alarm + cắt camera khi cả 2 đã ra sân) */   /* plan-52 #10: cắt cứng 1 khung khi vào trận */ camera(ctx, dt); syncMoves(); return; }
    if (ST.ph === 'cut') { ST.cut.t += dt; if (ST.cut.t >= 0.85) { ST.zoomOn = SK[ST.cut.id] && SK[ST.cut.id].m === 'ult' ? foeOf(ST.cut.f) : ST.cut.f;   /* p57: tuyệt chiêu 2 lớp giáng lên đối thủ → camera vào đối thủ */ ST.camZoomT = 1.6; ST.ph = 'fight'; ST.cut = null; } syncMoves(); return; }
    if (ST.ko && !ST.ko.go) { ST.ko.t += dt0; if (ST.ko.t < KO_T0 + (ST.koHold || 0)) return; koGo(ctx); }   /* p57: khung bóng KO_FRAME rồi đứng hình KO_HOLD (cảnh vẽ thường, không cập nhật) */   /* plan-49a M1: đóng băng cả cảnh trong 2 khung kết liễu */
    if (ST.ko) ST.ko.t += dt0;
    if (ST.imp) { ST.imp.t += dt0; if ((ST.imp.drawn < (ST.imp.p85 ? 1 : P52.IMP_FR) || ST.imp.t < Math.max(ST.imp.p85 ? IMP85_T : P52.IMP_T, ST.impHold || 0)) && ST.imp.t < 0.25 + (ST.impHold || 0)) { ST.hitstop = Math.max(0, ST.hitstop - dt0); return; } impEnd(); }   /* plan-52 #1: đóng băng đúng 2 khung vẽ impact (khựng tính chung) */
    if (ST.ko && ST.ko.go && !(ST.end && ST.end.mid)) { const k = ST.ko.t - KO_T0; ST.slowOn = k < P52.SLOW_T; if (ST.slowOn) dt *= k < P52.SLOW_T - 0.3 ? P52.SLOW : P52.SLOW + (1 - P52.SLOW) * (k - P52.SLOW_T + 0.3) / 0.3; }   /* plan-52 #10: chậm cảnh ~1,5 s sau kết liễu */
    if (ST.p84slow) dt *= ST.p84slow;   /* p84 đợt 3: chậm cảnh — chỉ API test (GIF so chớp CLASH) */
    if (ST.hitstop > 0) { ST.hitstop -= dt; camera(ctx, dt); return; }
    ST.t += dt;
    if (ST.ph === 'catch') updCatch(dt, ctx); catchBtn(ctx);   /* plan-58 C.2 */
    updSwaps(dt); if (ST.poseP > 0) { ST.poseP -= dt; const p0 = ctx.S.player; if (ctx.S.mode !== 'play' && p0.tickAct) p0.tickAct(dt); }   /* plan-58: gọi / thu hồi / cầu bay; tư thế ném của người chơi (mode duel không tự chạy act) */
    if (ST.warn && (ST.warn.left -= dt) <= 0) warnOff('time');
    DFX.update(dt);   /* p52e: cảnh code (dừng khi khựng — nhánh khựng return ở trên) */
    for (const e of ST.fx) { e.t += dt; if (e.follow) { e.x = e.follow.x + e.ox; e.y = e.follow.y + e.oy - (e.follow.alt || 0); e.ky = e.follow.y + e.dky; } } for (const e of ST.gfx) { e.t += dt; if (e.follow) { e.x = e.follow.x + e.ox; e.y = e.follow.y + e.oy; } } ST.fx = ST.fx.filter(e => !vfxDone(e)); ST.gfx = ST.gfx.filter(e => !vfxDone(e));
    for (const d of ST.decals) d.t += dt; for (const T of ST.trenches) if (T.old && T.a > 0.45) T.a = Math.max(0.45, T.a - dt * 0.15);   /* rãnh cũ mờ dần */
    if (ST.ph === 'fight' || ST.ph === 'ko') {
      for (const f of ST.F) { const ox = f.x, oy = f.y; updFighter(f, dt); if (!f.act) { f.vx = (f.x - ox) / Math.max(dt, 1e-3); f.vy = (f.y - oy) / Math.max(dt, 1e-3); } }
      separate(); P73.update(dt); P78.update(dt); dodgeShots(dt); updShots(dt);   /* p73: trước dodgeShots — gương phản xạ */ updZones(dt); updWaves(dt); updClash(dt); aiSwap(0, dt); aiSwap(1, dt);
      if (ST.ph === 'fight' && !ST.clash) clash84(dt);   /* p84: đối chưởng chỉ khi 2 bên cùng tung TIA (trước: tự bật ~15 s một lần) */
      if (ST.ph === 'fight' || ST.ph === 'ko') tick84(dt);   /* p84 đợt 2: CLASH cận chiến + nhịp AI (lùi sau cận chiến, phản đòn sau né) */   /* review7: đối chưởng tự nhiên (≥ 8 s một lần) */
    }
    if (ST.ph === 'ko' && ST.end && ST.end.mid) koMid(dt0); else if (ST.ph === 'ko') { ST.end.t += dt0 * ST.speed; endRecalls(); for (const f of ST.F) if (!f.dead && !f.act) { f.clip = 'idle'; } if (ST.end.t >= P52.BAN_AT && !ST.end.ban) { ST.end.ban = true; duelSfx('victory_banner', { win: ST.end.win }); } if (ST.end.t > 2.6) {   /* plan-52: giờ thật (cảnh chậm không kéo dài bảng) */ ST.ph = 'done'; sfx('win'); endCb(); endPanel(ctx); showMoves(ctx, true); } }
    if (ST.ph === 'done') { ST.end.t += dt; for (const f of ST.F) if (!f.dead) { f.ct += dt; f.clip = 'idle'; } }
    camera(ctx, dt); syncMoves();
  },
  drawGround(g, ctx, cx, cy) {
    if (!ST.on) return;
    if (ST.inField) drawCourt(g, ctx, cx, cy);
    drawTrenches(g, cx, cy);   /* plan-49a: rãnh đào liền */
    for (const d of ST.scars) { const im = img(d.src); if (!im) continue; g.globalAlpha = d.a; g.drawImage(im, (globalThis.__R89||Math.round)(d.x - cx - im.naturalWidth / 4), (globalThis.__R89||Math.round)(d.y - cy - im.naturalHeight / 4), im.naturalWidth / 2, im.naturalHeight / 2); } g.globalAlpha = 1;   /* hố / rãnh đào đất: lưu tới hết trận */
    for (const d of ST.decals) {
      const im = d.cv || img(d.src); if (!im) continue; const w = (im.naturalWidth || im.width) / 2, h = (im.naturalHeight || im.height) / 2;   /* plan-52: d.cv = canvas dựng sẵn (rãnh tia xuyên) */ g.globalAlpha = d.a * Math.min(1, d.t / 0.15) * (!d.cv && ST.decals.length - ST.decals.indexOf(d) > 10 ? 0.55 : 1);   /* plan-52: rãnh tia xuyên không mờ theo tuổi (chỉ rời khi quá trần 18) */
      if (d.rot) { g.save(); g.translate((globalThis.__R89||Math.round)(d.x - cx), (globalThis.__R89||Math.round)(d.y - cy)); g.rotate(Math.PI / 2); g.drawImage(im, -Math.round(w / 2), -Math.round(h / 2), w, h); g.restore(); }
      else g.drawImage(im, (globalThis.__R89||Math.round)(d.x - cx - w / 2), (globalThis.__R89||Math.round)(d.y - cy - h / 2), w, h);
    }
    g.globalAlpha = 1;
    for (const s of ST.shots) if (s.kind === 'meteor' || s.kind === 'strike' || s.kind === 'boulder') { const wi = img('spar/fx/warn_circle.png'); if (wi) { g.globalAlpha = 0.45 + 0.4 * (s.t / s.life); g.drawImage(wi, (globalThis.__R89||Math.round)(s.x - cx - 12), (globalThis.__R89||Math.round)(s.y - cy - 8), 24, 16); g.globalAlpha = 1; } }
    for (const f of ST.F) if (f.act && f.act.mark && !f.act.fired2) { const wi = img('spar/fx/warn_circle.png'); if (wi && f.act.t < impactT(f.act.clip) + 0.34) { g.globalAlpha = 0.75; g.drawImage(wi, (globalThis.__R89||Math.round)(f.act.mark.x - cx - 12), (globalThis.__R89||Math.round)(f.act.mark.y - cy - 6), 24, 16); g.globalAlpha = 1; } }
    drawShadows(g, cx, cy);   /* p52e: bóng dưới chân MỌI thú + huấn luyện viên + Ấn Chấn / Ấn Thu đang bay (thay bóng chỉ cho thú bay) */
    for (const f of ST.F) { if (f.dead || f.absent || f.hidden) continue; const nm = 'ring_' + f.types[0], m = VFXM && (VFXM[nm] || VFXM.ring_chan), im = m && img(m.file); if (im) { g.globalAlpha = 0.8; g.drawImage(im, (globalThis.__R89||Math.round)(f.x - cx - m.ax), (globalThis.__R89||Math.round)(f.y - cy - m.ay + 1), m.w, m.h); g.globalAlpha = 1; } }   /* vòng màu hệ dưới chân: tĩnh, mảnh (luật 22/09, 10/10) */
    for (const e of ST.gfx) drawVfx(g, e, cx, cy);
    if (DFX.CODE) DFX.drawGround(g, cx, cy);   /* p52e: sóng xung kích trên đất */
    P73.drawGround(g, cx, cy); P78.drawGround(g, cx, cy);   /* p73 · p78 */
  },
  drawables(ctx, cx, cy) {
    const g = ctx.g, out = [], v = ST.villager;
    if (v) out.push({ y: v.y, f: () => { g.save(); g.translate(-cx, -cy); v.draw(g); g.restore(); } });
    if (!ST.on) return out;
    for (const s of ST.shots) if ((s.kind === 'proj2' || s.kind === 'lob') && !s.hide) out.push({ y: s.gy + (s.vy < 0 ? -0.5 : 0.5), f: () => skDrawShot(g, s, cx, cy) });   /* p57 (luật 16/10: bay lên sau lưng, xuống trước) */
    for (const f of ST.F) if (f.echo && !f.dead) out.push({ y: f.y - 0.45, f: () => skDrawEcho(g, f, cx, cy) });
    for (const f of ST.F) if (!f.hidden && (f.suck || f.fade != null)) out.push({ y: f.y + f.side * 0.01, f: () => f.suck ? drawSuck(g, f, cx, cy) : (g.save(), g.globalAlpha = Math.max(0, f.fade), drawFighter(g, f, cx, cy, false), g.restore()) });   /* plan-58 C.2: bị hút vào Ấn Thu / bỏ chạy mờ dần */
    for (const f of ST.F) if (f.hugFront && !f.hidden) out.push({ y: f.hugFront.y + 0.6, f: () => drawHugArms(g, f, cx, cy) });   /* p67b: tay ôm vòng qua trước đối thủ */
    for (const f of ST.F) if (!f.hidden && !f.suck && f.fade == null) out.push({ y: f.y + f.side * 0.01, f: () => f.recall ? drawRecall(g, f, cx, cy) : f.hide ? skDrawHidden(g, f, cx, cy) : f.dig ? drawDig(g, f, cx, cy) : inSwim(f) && !f.dead ? drawSwim(g, f, cx, cy) : P78.drawF(g, f, cx, cy, (g2, f2, x2, y2) => P73.drawF(g2, f2, x2, y2, drawFighter)) });   /* p73: chìm / mờ / giật lỗi */
    for (const f of ST.F) { const d = dashDir(f); if (d) out.push({ y: f.y - 0.3, f: () => drawDash(g, f, d, cx, cy) }); }
    for (const b of ST.beams2 || []) if (b.t < b.T) out.push({ y: b.f.y + 0.5, f: () => skDrawBeams2(g, cx, cy) });   /* p57 */
    for (const f of ST.F) if (f.act && f.act.pierce && f.act.pierce.ph !== 'charge') out.push({ y: f.y + 0.5, f: () => drawPierce(g, f, cx, cy) });   /* plan-52 #5: tia ngang vẽ trước người bắn (luật 16/10) */   /* tia tốc độ sau lưng khi lao / bị hất */
    if (ST.clash) { const C = ST.clash, ky = Math.max(C.L.y, C.R.y) + 0.5; out.push({ y: ky, f: () => drawBeams(g, cx, cy) }); out.push({ y: ky + 0.1, f: () => drawSteam(g, cx, cy) }); }   /* luồng ngang: vẽ trước người bắn (luật 16/10: không hướng lên) */
    for (const f of ST.F) if (f.ghosts && f.ghosts.length) out.push({ y: f.y - 0.4, f: () => drawGhosts(g, f, cx, cy) });   /* bóng mờ né lướt (sau thân) */
    for (const f of ST.F) if (f.act && f.act.breath) out.push({ y: f.y + (Math.sin(f.act.breath.ang) < 0 ? -0.5 : 0.5), f: () => drawBreath(g, f, cx, cy) });   /* luật 16/10 */
    for (const f of ST.F) { if (f.dead || f.absent || ST.ph === 'done') continue; const m = VFXM && VFXM[f.side ? 'arrow_foe' : 'arrow_me'], im = m && img(m.file); if (!im) continue;   /* mũi tên phe trên đầu: xanh = mình, đỏ = đối thủ (tĩnh) */
      out.push({ y: f.y + 0.6, f: () => g.drawImage(im, (globalThis.__R89||Math.round)(f.x - cx - m.ax), (globalThis.__R89||Math.round)(headY(f) - 4 - cy - m.h), m.w, m.h) }); }   /* cách đỉnh đầu 4 px */
    for (const e of ST.fx) out.push({ y: e.ky, f: () => drawVfx(g, e, cx, cy) });
    if (DFX.CODE) DFX.drawables(out, g, cx, cy);   /* p52e */ draw84(out, g, cx, cy);   /* p84: tia lửa CLASH cận chiến */
    P73.drawables(out, g, cx, cy); P78.drawables(out, g, cx, cy);   /* p73 · p78 */
    for (const w of ST.waves) for (const oy of w.ys) out.push({ y: w.y + oy, f: () => drawWave(g, w, oy, cx, cy) });
    for (const s of ST.shots) {
      if (s.kind === 'strike' || s.kind === 'p73' || s.p73refl || s.kind === 'proj2' || s.kind === 'lob') continue;   /* p73: đạn p73 / bị gương bật vẽ ở chieu73; proj2 / lob đã vẽ ở skDrawShot (hoặc cảnh code) — trước đây rơi xuống nhánh cuối, vẽ thêm quả cầu lửa thanball lên MỌI đạn proj2 */
      if (s.kind === 'boulder') { const im = img('linhduel/vfx/boulder.png'); if (im) out.push({ y: s.y + 1, f: () => g.drawImage(im, (globalThis.__R89||Math.round)(s.x - cx - im.naturalWidth / 4), (globalThis.__R89||Math.round)(s.y - s.h - cy - im.naturalHeight / 2 + 6), im.naturalWidth / 2, im.naturalHeight / 2) }); continue; }
      if (s.kind === 'proj') { const m = VFXM && VFXM[s.fx], im = m && img(m.file); if (!im) continue; const fr = Math.floor(s.t * m.fps) % m.n, sw = im.naturalWidth / m.n;
        out.push({ y: s.y + s.h + (s.vy < 0 ? -0.5 : 0.5), f: () => { for (let i = s.trail.length - 1; i >= 1; i--) { const q = s.trail[i]; g.globalAlpha = 0.6 * Math.pow(1 - i / s.trail.length, 1.4); g.drawImage(im, fr * sw, 0, sw, im.naturalHeight, (globalThis.__R89||Math.round)(q.x - cx - m.ax), (globalThis.__R89||Math.round)(q.y - cy - m.ay), m.w, m.h); }
          g.globalAlpha = 1; g.drawImage(im, fr * sw, 0, sw, im.naturalHeight, (globalThis.__R89||Math.round)(s.x - cx - m.ax), (globalThis.__R89||Math.round)(s.y - cy - m.ay), m.w, m.h); } }); continue; }   /* vệt đuôi: 6 bản mờ dần */
      const m = VFXM && VFXM.thanball, im = m && img(m.file); if (!im) continue;
      const gy = s.kind === 'meteor' ? s.y : s.y + s.h, f = Math.floor(s.t * m.fps) % m.n, sw = im.naturalWidth / m.n;
      out.push({ y: gy, f: () => g.drawImage(im, f * sw, 0, sw, im.naturalHeight, (globalThis.__R89||Math.round)(s.x - cx - m.ax), Math.round((s.kind === 'meteor' ? s.y - s.h - 6 : s.y) - cy - m.ay), m.w, m.h) });
    }
    orbDrawables(out, cx, cy);   /* plan-58: Ấn Chấn bay / nảy, bung, cột sáng thu về, vệt sáng */
    catchDrawables(out, g, cx, cy);   /* plan-58 C.2: Ấn Thu */
    return out;
  },
  draw(g, ctx, cx, cy) {   /* thú bị cây / vật cao che → bóng mờ của thú vẽ đè lên (chỉ khi bị che) */
    if (!ST.on) return; if (ST.dimA > 0.005) drawDim(g, ctx, cx, cy, this);   /* plan-52 #3 */
    for (const f of ST.F) if (f.occ > 0.15 && !f.hidden && !f.recall) { g.save(); g.globalAlpha = 0.38; drawFighter(g, f, cx, cy, true); g.restore(); }
  },
  drawUI(ug, ctx, cx, cy, scale) {
    if (ST.wipe) { const W0 = ug.canvas.width, H0 = ug.canvas.height; if (ST.on && ST.F.length) this.drawUI2(ug, ctx, cx, cy, scale); drawWipe(ug, W0, H0); return; }
    this.drawUI2(ug, ctx, cx, cy, scale);
  },
  drawUI2(ug, ctx, cx, cy, scale) {
    if (!ST.on || !ST.F.length) return;
    const W = ug.canvas.width, H = ug.canvas.height, u = W > H ? Math.min(W / 160, H / 95) : W / 100;
    if (ST.ko && !ST.ko.go && ST.ko.t < KO_FRAME + (ST.koHold || 0)) drawKoFrame(ug, ctx, cx, cy, scale, W, H);
    if (ST.imp && !ST.ko && ST.imp.p85) { drawImp85(ug, ctx, cx, cy, scale, W, H, ST.imp); ST.imp.drawn++; }   /* p85: 1 khung manga (không lật) */
    else if (ST.imp && !ST.ko) { drawSilFrame(ug, ctx, cx, cy, scale, W, H, ST.imp, ST.impHold ? ST.imp.t >= ST.impHold / 2 : ST.imp.t >= P52.IMP_T / 2 || ST.imp.drawn >= 2, ST.imp.kind === 'B'); ST.imp.drawn++; ST.imp.flip = ST.imp.flip || (ST.imp.t >= P52.IMP_T / 2 || ST.imp.drawn >= 2); }   /* plan-52 #1: đúng 2 khung hình (ảnh thường rồi ảnh lật) trong ~67 ms — màn 60 Hz vẽ mỗi khung hình 2 lần */
    else if (ST.flashW > 0) { ST.flashW = 0; ug.save(); ug.fillStyle = 'rgba(255,250,236,0.6)'; ug.fillRect(0, 0, W, H); ug.restore(); ST.stats.flashW = (ST.stats.flashW || 0) + 1; }   /* plan-52 #3: 1 khung trắng lúc xả */   /* plan-49a M1: vẽ TRƯỚC chữ nổi + HUD (số sát thương vẫn hiện trên khung) */
    /* chữ nổi (số sát thương, KHẮC HỆ!, …) bám theo thế giới */
    ug.save(); ug.textAlign = 'center'; ug.textBaseline = 'middle';
    for (const x of ST.texts) {
      const k = x.t / x.life, pop = x.t < 0.1 ? 0.6 + x.t * 4 : 1, fs = Math.round(Math.max(13, (globalThis.__u89?globalThis.__u89(scale):scale) * 5.2) * x.size * pop), [sx, sy] = toUI(ctx, x.x + x.dx, x.y - 4 * Math.min(1, x.t * 3) - k * 4, cx, cy, scale);   /* review7: theo camZoom */
      const word = isNaN(+x.s) && x.size >= 1.05; ug.globalAlpha = k > 0.75 ? (1 - k) / 0.25 : 1; ug.font = `bold ${word ? 'italic ' : ''}${word ? Math.round(fs * 1.15) : fs}px VT323, monospace`; ug.lineWidth = Math.max(4, fs / 4.5); ug.lineJoin = 'round'; ug.strokeStyle = '#140e1a';
      if (word) { ug.save(); ug.translate(sx, sy); ug.rotate(-0.1); ug.strokeText(x.s, 0, 0); ug.fillStyle = x.col; ug.fillText(x.s, 0, 0); ug.restore(); } else { ug.strokeText(x.s, sx, sy); ug.fillStyle = x.col; ug.fillText(x.s, sx, sy); }   /* plan-49a M2: chữ kết quả nghiêng */
    }
    ug.restore();
    if (ST.ph === 'intro') { drawIntro(ug, ctx, W, H, u); return; }
    if (ST.warn) drawWarn(ug, W, H);   /* plan-52 #2: dưới HUD */
    const a = hudSide(ug, ctx, ST.F[0], 0, W, u), b = hudSide(ug, ctx, ST.F[1], 1, W, u); ST.hudUI = { y: Math.max(a.y, b.y), scale, cy };
    drawCallout(ug, ctx, 0, a.y + Math.round(u * 1.4), W, u); drawCallout(ug, ctx, 1, b.y + Math.round(u * 1.4), W, u);
    { const ty = Math.max(a.y, b.y) + Math.round(u * 9); drawSwapBanner(ug, ctx, W, u, ty, 0); drawSwapBanner(ug, ctx, W, u, ty + Math.round(u * 6.5), 1); drawTeam(ug, ctx, W, H, u, ty); }   /* plan-58: hàng chân dung đội + banner đổi thú */
    { const s = `${Math.floor(ST.t / 60)}:${String(Math.floor(ST.t % 60)).padStart(2, '0')}`, fs = Math.round(u * 4.2); ug.save(); ug.font = `bold ${fs}px VT323, monospace`; const tw = ug.measureText(s).width + 18;
      if (W > H) { ug.fillStyle = 'rgba(16,12,22,.8)'; rr(ug, W / 2 - tw / 2, Math.round(u * 1.6), tw, fs + 6, 8); ug.fill(); ug.fillStyle = '#fff'; ug.textAlign = 'center'; ug.textBaseline = 'top'; ug.fillText(s, W / 2, Math.round(u * 1.6) + 3); } ug.restore(); }
    if (ST.terr) { const t = L(ctx), tn = TERR_NAME[ctx.lang() === 'en' ? 'en' : 'vi'][ST.terr.k], ups = Object.entries(ST.terr.mul).map(([k, v]) => (ctx.lang() === 'en' ? TYPE_EN74 : TYPE_NAME)[k] + (v > 1 ? '↑' : '↓')).join(' '), s = `${tn} · ${ups}`, fs = Math.round(u * 2.9);
      ug.save(); ug.font = `bold ${fs}px VT323, monospace`; const tw = ug.measureText(s).width + 14, ty = Math.round(u * 1.6) + (W > H ? Math.round(u * 4.2) + 10 : 0), tx = W > H ? W / 2 : W / 2;
      const yy = W > H ? ty : Math.round(H - u * 30); ug.fillStyle = 'rgba(16,12,22,.72)'; rr(ug, tx - tw / 2, yy, tw, fs + 6, 7); ug.fill(); ug.fillStyle = '#e8dcc0'; ug.textAlign = 'center'; ug.textBaseline = 'top'; ug.fillText(s, tx, yy + 3); ug.restore(); }
    if (ST.ph === 'cut' && ST.cut) drawCut(ug, ctx, W, H);
    if (ST.ko && ST.ko.go && ST.ko.t < KO_T0 + 1.9 && !(ST.end && ST.end.mid)) drawKoText(ug, ctx, W, H, u);
    if ((ST.ph === 'ko' || ST.ph === 'done') && ST.end && !ST.end.mid && !ST.end.caught && !ST.end.fled && ST.end.t > P52.BAN_AT) drawBanner(ug, ctx, W, H, u);   /* plan-52 #10: banner thắng trượt từ trái 0,2 s */
  },
};
function camera(ctx, dt) {   /* camera giữ cả 2 thú (giữa 2 thú, hơi lệch xuống để HUD không che) */
  const p = ctx.S.player, [a, b] = ST.F; if (!a || !b) return;
  let mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2 - 10;
  if (!ST.inField) { const x0 = Math.min(a.x, b.x, p.x), x1 = Math.max(a.x, b.x, p.x), y0 = Math.min(a.y, b.y, p.y) - 24, y1 = Math.max(a.y, b.y, p.y);   /* giữ cả người chơi khi vừa khung */
    if (x1 - x0 < (ctx.VW || 320) - 60 && y1 - y0 < (ctx.VH || 200) - 90) { mx = (x0 + x1) / 2; my = (y0 + y1) / 2; } }
  const dash = (ST.ko && ST.ko.go) ? null : ST.F.find(f => f.act && (f.act.id === 'lao_lua' || f.kb && f.kb.fly)); if (dash) { mx = mx * 0.5 + dash.x * 0.5; my = my * 0.5 + dash.y * 0.5; }
  /* plan-49b: kết liễu — không bám thú thua bay ra mép: lấy thú thắng làm gốc, chỉ nghiêng 40 % về thú thua khi còn gần, xa thì giữ thú thắng giữa khung */
  const KO = ST.ko && ST.ko.go && ST.ko.at && ST.ko.f ? ST.ko : null, koD = KO ? Math.hypot(KO.f.x - KO.at.x, KO.f.y - KO.at.y) : 0, koLim = (ctx.VW || 320) * 0.42;
  if (KO) { const w = KO.at, l = KO.f, k = ST.inField && koD >= koLim * 0.6 ? 1 : koD < koLim ? 0.4 : 0.4 * koLim / koD; mx = w.x + (l.x - w.x) * k; my = w.y + (l.y - w.y) * k - 10; }   /* p54: sân rộng — 2 thú xa thì phóng vào thú thua */
  if (ST.clash) { const C = ST.clash; mx = (C.L.x + C.R.x) / 2; my = (C.L.y + C.R.y) / 2 - 22; }
  const camOrb = camFollowOrb(ctx); if (camOrb) { mx = camOrb.x; my = camOrb.y; }   /* plan-58: khung hẹp (điện thoại) — bám Ấn Chấn đang bay / vệt sáng thu về (huấn luyện viên ở đầu sân ngoài khung) */   /* đối chưởng: lấy cả cột hơi bốc lên */
  if (ST.inField) {   /* review7: CAMERA GẦN theo cặp thú — phóng vừa đủ 2 thú (+ lề), cắt cảnh / kết liễu thì gần hơn nữa */
    const S = ctx.S, VW = ctx.VW || 320, VH = ctx.VH || 200, w = Math.abs(a.x - b.x) + 120, h = Math.abs(a.y - b.y) + (ST.clash ? 150 : 96), MW = FW * 16, MH = FH * 16;
    if (!(ST.camZoomT > 0)) { mx = VW >= MW - 16 ? MW / 2 : Math.max(VW / 2, Math.min(MW - VW / 2, mx)); my = VH >= MH - 8 ? MH / 2 : Math.max(VH / 2 - 30, Math.min(MH - VH / 2, my)); }   /* p54: thấy trọn sân / lia nhẹ */
    const zc = (ST.camZoomT = Math.max(0, (ST.camZoomT || 0) - dt)) > 0 && (!KO || ST.inField || koD < koLim * 0.6) ? 1.5 : 1, zt = 1;   /* p54: không phóng gần theo cặp thú (trước: vừa khít 2 thú, ≤ 1,55) — chỉ sự kiện ngắn (zc) mới phóng */
    /* plan-49a: phóng theo NẤC để 1 điểm ảnh sprite = số nguyên điểm ảnh màn (main.js: nấc nguyên vẽ lại canvas, nấc lẻ = CSS scale) — không trượt mượt (pixel lệch) */
    let zs = Math.max(zoomStep(ctx, zt, false), zc > 1 ? zoomStep(ctx, zc, true) : 1); ST.zHold = Math.max(0, (ST.zHold || 0) - dt);
    /* plan-49b: điện thoại (m = 1, chỉ có nấc nguyên 1 / 2) gần như không phóng → cho nấc 2 khi cặp thú đủ gần (vào: vừa khung + lề rộng; ở lại: lề hẹp hơn = trễ) */
    if (false && (ctx.zoomM || 1) === 1 && !ST.clash) {   /* p54: bỏ nấc 2 điện thoại khi cặp gần (sân rộng xem toàn cảnh) */ const ax = Math.abs(a.x - b.x), ay = Math.abs(a.y - b.y), inZ = VW / (ax + 64) >= 2 && VH / (ay + 84) >= 2, stay = VW / (ax + 40) >= 2 && VH / (ay + 60) >= 2; if (ST.zCur >= 2 ? stay : inZ) zs = Math.max(zs, 2); }

    if (zs < ST.zCur || (zs > ST.zCur && (ST.zHold <= 0 || zc > 1))) { ST.zCur = zs; ST.zHold = 1.2; }
    S.camZoom = ST.zCur; S.camZoomSnap = true;
    const fo = ST.camZoomT > 0 && ST.zoomOn && !KO ? { x: ST.zoomOn.x, y: ST.zoomOn.y - 12 } : { x: mx, y: my }; S.camFocus = S.camFocus ? { x: S.camFocus.x + (fo.x - S.camFocus.x) * Math.min(1, dt * 6), y: S.camFocus.y + (fo.y - S.camFocus.y) * Math.min(1, dt * 6) } : fo;
  } else
  { const S = ctx.S, zt = (ST.camZoomT = Math.max(0, (ST.camZoomT || 0) - dt)) > 0 ? 1.45 : 1; S.camZoom = (S.camZoom || 1) + (zt - (S.camZoom || 1)) * Math.min(1, dt * 6); if (S.camZoom < 1.01) { S.camZoom = 1; if (zt === 1) S.camFocus = null; } else if (!ST.clash) { const fo = (!KO && ST.zoomOn) || { x: mx, y: my }; S.camFocus = { x: fo.x, y: fo.y - 10 }; } }   /* zoom điện ảnh */
  const wx = mx - p.x, wy = my - (p.y - 8), k = Math.min(1, dt * (dash || camOrb ? 7 : 3.5));
  ctx.S.camDX = (ctx.S.camDX || 0) + (wx - (ctx.S.camDX || 0)) * k; ctx.S.camDY = (ctx.S.camDY || 0) + (wy - (ctx.S.camDY || 0)) * k;
}
function zoomStep(ctx, z, near) {   /* nấc k/m (m = điểm ảnh màn / điểm ảnh canvas, từ main.js) trong [1, 2]; near: làm tròn gần nhất (cảnh kết liễu), không thì làm tròn xuống (vẫn vừa 2 thú) */
  const m = Math.max(1, ctx.zoomM || 1), v = near ? Math.round(z * m) / m : Math.floor(z * m + 1e-6) / m; return Math.max(1, Math.min(2, v)); }
function P79HOST() { try { return new URLSearchParams(location.search).has('host'); } catch (e) { return false; } }
function pickFoe(ctx) {   /* NPC Seismic thật làm huấn luyện viên đối thủ: người cấp cao nhất có mặt trong roster */
  let arr = []; try { for (let lv = 9; lv >= 1 && arr.length < 5; lv--) arr = arr.concat(ctx.membersOfLevel(lv).slice(0, 5)); } catch (e) { }
  return arr[0] || { id: 'duel_npc', n: 'Seismic', k: 'Seismic', lv: 3 };
}
function hostTrainer(ctx) {   /* bản thử: 1 huấn luyện viên đứng gần lối vào Làng → E: 'Đấu linh thú?' (đấu ngay tại chỗ) */
  ST.villager = null; ST.pair = PAIRS[ctx.S.zone.id] || DEF_SP; if (!/^(village|m[1-9]|arena)$/.test(ctx.S.zone.id)) return;   /* thách đấu mọi nơi: 1 huấn luyện viên cạnh lối vào mỗi vùng */
  const m = ctx.S.map, e = m.entries.default; if (!e) return;
  const mem = pickFoe(ctx); let at = null;
  for (const [dx, dy] of [[3, 0], [-3, 0], [3, 2], [-3, 2], [2, -2], [4, 1]]) { const tx = e.x + dx, ty = e.y + dy; if (!ctx.isSolid(m, tx, ty)) { at = { x: tx * 16 + 8, y: ty * 16 + 14 }; break; } }
  if (!at) return; const n = new ctx.NPC(mem, at.x, at.y, ctx.npcSheet(mem), () => 0.5); n.busy = true; n.dir = 0; n.duelHost = true; ST.villager = n;   /* không vào S.npcs: lời nói mặc định của dân không giành phím E */
}
function api(ctx) {
  return {
    state: () => ({ ph: ST.ph, t: +ST.t.toFixed(2), F: ST.F.map(f => ({ sp: f.sp, hp: Math.round(f.hp), max: f.max, x: Math.round(f.x), y: Math.round(f.y), clip: f.clip, act: f.act && f.act.id, st: f.status && f.status.id, dead: f.dead, cds: Object.fromEntries(Object.entries(f.cds).map(([k, v]) => [k, +v.toFixed(1)])) })), win: ST.end && ST.end.win, decals: ST.decals.length, fx: ST.fx.length + ST.gfx.length }),
    log: () => ST.log.slice(), stats: () => ST.stats, order: i => order(i), auto: (side, on) => { ST.auto[side] = !!on; }, speed: k => { ST.speed = k; },
    dig: side => { const f = ST.F[side]; if (f && DIG[f.sp]) { startDig(f); return true; } return false; }, scars: () => ST.scars.length + ST.trenches.reduce((n, T) => n + T.pts.length, 0), trenches: () => ST.trenches.map(T => ({ n: T.pts.length, a: +T.a.toFixed(2) })), decals: () => ST.decals.length, waves: () => ST.waves.length,
    restart: () => startBattle(ctx, { ...(ST.opts || {}) }), hudTop: () => hudTopW(), tier: () => ST.F.map(f => ({ sp: f.sp, tier: f.tier, spe: f.st.spe, hp: f.max, bw: bodyW(f), sh: standH(f) })), loads: () => LOAD, freeze: side => { const f = ST.F[side]; return f && applyStatus(f, 'dong'); }, koHold: s => { ST.koHold = s; }, hooks: () => (ST.hooks || []).slice(), ko: () => ST.ko && { t: +ST.ko.t.toFixed(2), go: ST.ko.go, sep: ST.ko.sep, frameS: ST.koFrameS, side: ST.ko.f.side, alt: +(ST.ko.f.alt || 0).toFixed(1), fly: !!ST.ko.f.koFly, x: Math.round(ST.ko.f.x), y: Math.round(ST.ko.f.y) }, zoomStep: () => ({ z: ctx.S.camZoom, m: ctx.zoomM, snap: !!ctx.S.camZoomSnap, zv: ctx.zoomView && ctx.zoomView() }), killFoe: (side = 1) => { const f = ST.F[side]; if (f) { f.hp = 1; hit(foeOf(f), f, MOVES.huc, { noMiss: true, mul: 50 }); } }, swim: () => ST.F.map(f => !!inSwim(f)), rafts: () => (ctx.S.map.rafts || []).length, zone: () => ctx.S.zone.id, field: () => FIELD.kind, inField: () => !!ST.inField, startDuel: o => startDuel(ctx, { foe: ST.villager, ...(o || {}) }), clashNow: () => ST.clash && { x: Math.round(ST.clash.x), y: Math.round(ST.clash.y), off: Math.round(ST.clash.off || 0), ph: ST.clash.ph, adv: ST.clash.adv, L: ST.clash.L.sp, R: ST.clash.R.sp, win: ST.clash.win && ST.clash.win.sp, t: +ST.clash.t.toFixed(2) }, clashLast: () => ST.clashLast || null, err: () => ST.err || null, challenge: (x, y) => { const v = ST.villager; if (v && x != null) { v.x = x; v.y = y; } startDuel(ctx, { foe: v }); return Promise.resolve(true); }, end: () => endBattle(ctx), knocks: () => ST.knocks.length, alt: () => ST.F.map(f => +(f.alt || 0).toFixed(1)), wrapped: () => ST.wrap.size, occ: () => ST.F.map(f => +(f.occ || 0).toFixed(2)), ring: () => null, terr: () => ST.terr && { k: ST.terr.k, mul: ST.terr.mul }, host: () => ST.villager && { x: ST.villager.x, y: ST.villager.y }, spawnHost: (x, y) => { const mem = pickFoe(ctx), n = new ctx.NPC(mem, x, y, ctx.npcSheet(mem), () => 0.5); n.busy = true; n.dir = 0; n.duelHost = true; ST.villager = n; return true; }, ask: () => ST.villager && ask(ctx, ST.villager), ready: () => !!(SPR && VFXM), fighters: () => ST.F, cdAll: () => { for (const f of ST.F) for (const k in f.cds) f.cds[k] = 0; },
    pair: (a, b) => { ST.pair = [a, b]; return ST.pair; }, wx: () => ({ w: ST.weather, t: +(ST.wxT || 0).toFixed(1), log: (ST.wxLog || []).slice() }), ltRes: () => ST.ltRes || null,   /* p72 */ wipeOn: () => !!ST.wipe,
    clash: () => { if (ST.F.length === 2) { ST.clashNext = 0; ST.p84force = 1; try { startClash(ST.F[0], ST.F[1]); } finally { ST.p84force = 0; } } return !!ST.clash; }, clash84: () => ({ n: ST.clash84 | 0, answer: ST.answer84 | 0, beamBoom: (ST.stats && ST.stats.beamBoom) | 0, beamN: ST.beamN84 | 0 }),
    p84: () => ({ mclash: ST.mclash84 | 0, mlog: (ST.mclashLog || []).slice(), beamN: ST.beamN84 | 0, clash84: ST.clash84 | 0, answer: ST.answer84 | 0, dodgeTia: ST.stats.p84dodgeTia | 0, dodgeTel: ST.stats.p84dodgeTel | 0, dodgeShot: ST.stats.dodge | 0, ctr: ST.stats.p84ctr | 0, back: ST.stats.p84back | 0, sh: ST.stats.p84sh || {}, fx: (ST.p84fx || []).length, lk: ST.F.map(f => +(f.p84lk || 0).toFixed(2)) }),
    p84roster: () => Object.keys(LOAD).filter(sp => SPECIES[sp]).map(sp => { const one = side => { try { return MV78(mkFighter(side, sp, 40, 0, 0, null)); } catch (e) { return LOAD[sp]; } };
      const pack = L => (L || []).map(id => id + ':' + (MOVES[id] ? MOVES[id].shape : '?') + (SK[id] ? '/' + SK[id].m : '') + (MOVES[id] && MOVES[id].ult ? '/U' : '')), nCan = L => (L || []).filter(id => MOVES[id] && MOVES[id].shape === 'can' && !MOVES[id].ult).length, L0 = one(0), L1 = one(1);
      return { sp, t: SPECIES[sp].types[0], mv: pack(L0), can: nCan(L0) + 1, mv1: L1 === L0 ? null : pack(L1), can1: nCan(L1) + 1, clips: SPR && SPR[sp] ? Object.keys(SPR[sp]).filter(k => k[0] !== '_') : null }; }),   /* p84 đợt 3: rà loài thiếu cận chiến (+1 = húc) */
    p84d3: () => ({ log: (ST.p84dLog || []).slice(-30), mc: MC84 }), p84mc: v => { if (MC84V.includes(v)) MC84 = v; return MC84; }, p84slow: k => { ST.p84slow = k > 0 && k < 1 ? k : 0; return ST.p84slow; },   /* p84 đợt 3: nhật ký chiêu lao · đổi bản chớp CLASH · chậm cảnh (chỉ test GIF) */
    p84melee: (a, b, gap) => { const [A, B] = ST.F; if (!A || !B) return null; for (const f of [A, B]) { f.act = null; f.hurtT = 0; f.dodge = null; f.kb = null; f.plan = null; f.queued = null; f.pin = 0; f.p84lk = 0; f.p84bo = null; f.alt = 0; }   /* test: 2 thú lao vào nhau cùng lúc */
      const q = nearWalk(ST.ctx, A.x + (gap || 26), A.y); B.x = q.x; B.y = A.y; ST.mclashNext = 0; ST.p84mforce = 1; face(A, B.x, B.y); face(B, A.x, A.y); startAct(A, a || 'huc'); startAct(B, b || 'huc'); return { hp: [A.hp, B.hp], d: Math.round(dist(A, B)), x: [Math.round(A.x), Math.round(B.x)] }; }, clashPh: () => ST.clash && ST.clash.ph, clashNextT: () => ST.clashNext || 0, clashT0: () => ST.clashT0 || 0, ghosts: () => ST.F.map(f => (f.ghosts || []).length), cam: () => ({ z: +(ctx.S.camZoom || 1).toFixed(2), VW: ctx.VW, VH: ctx.VH }),
    p85: () => ({ bub: BUB85(), imp: IMP85(), calls: ST.calls.map(c => c && { s: c.s, t: +c.t.toFixed(2), ult: c.ult, type: c.type }), R: (ST.bub85R || []).map(r => r && { ...r }), cb: (ST.cb85Log || []).slice(), impN: ST.imp85N | 0, impLog: (ST.impLog || []).slice(), cur: ST.imp && { p85: ST.imp.p85, why: ST.imp.why, drawn: ST.imp.drawn }, tx: ST.texts.map(x => x.s), hudY: ST.hudUI && ST.hudUI.y, uiW: ST.bub85R && ST.bub85R.W }),
    p85cast: (side, id) => { const f = ST.F[side], o = ST.F[1 - side]; if (!f || !o || !MOVES[id]) return false; f.act = null; f.hurtT = 0; f.dodge = null; f.kb = null; f.plan = null; f.queued = null; f.cds[id] = 0; face(f, o.x, o.y); startAct(f, id); return !!f.act; },   /* p85 test: ép ra chiêu */
    p85hit: (side, id) => { const f = ST.F[side], o = ST.F[1 - side]; if (!f || !o || !MOVES[id]) return null; const n0 = ST.log.length, ok = hit(f, o, MOVES[id], { noMiss: true }), L = ST.log[ST.log.length - 1]; return { ok, crit: !!(ST.log.length > n0 && L && L.crit), fly: !!(o.kb && o.kb.fly) }; },   /* p85 test: 1 nhát trúng thẳng */
    setHp: (side, k) => { const f = ST.F[side]; f.hp = Math.max(1, Math.round(f.max * k)); },
    p52: () => ({ imp: ST.imp && { kind: ST.imp.kind, why: ST.imp.why, drawn: ST.imp.drawn }, impLog: (ST.impLog || []).slice(), impSkip: ST.stats.impSkip || 0, warn: ST.warn && { why: ST.warn.why, left: +ST.warn.left.toFixed(3), T: +ST.warn.T.toFixed(3) }, warnLog: (ST.warnLog || []).slice(), dimA: +(ST.dimA || 0).toFixed(2), dimOn: !!ST.dimOn, dimLog: (ST.dimLog || []).slice(), flashW: ST.stats.flashW || 0, slow: !!ST.slowOn, camCut: ST.stats.camCut || 0, pierce: ST.stats.pierce || 0, trench: ST.stats.trench52 || null, decals: ST.decals.length, ban: !!(ST.end && ST.end.ban), endT: ST.end ? +ST.end.t.toFixed(2) : null, ko: ST.ko && { t: +ST.ko.t.toFixed(2), go: ST.ko.go } }),
    impHold: s => { ST.impHold = s; },
    catchInfo: () => ({ wild: ST.wild, can: canCatch(), ph: ST.ph, c: ST.catch && { ph: ST.catch.ph, t: +ST.catch.t.toFixed(2), done: ST.catch.done, shakes: ST.catch.shakes, ok: ST.catch.ok, p: +ST.catch.p.toFixed(3), x: Math.round(ST.catch.x), y: Math.round(ST.catch.y), h: Math.round(ST.catch.h) }, res: ST.catchRes, where: ST.catchWhere || null, log: (ST.catchLog || []).slice(), daze: ST.F[1] ? +(ST.F[1].daze || 0).toFixed(2) : 0, hpK: ST.F[1] ? +(ST.F[1].hp / ST.F[1].max).toFixed(3) : null, hidden: ST.F[1] ? !!ST.F[1].hidden : null, fade: ST.F[1] ? ST.F[1].fade ?? null : null, btn: (() => { const el = document.getElementById('ld-catch'); return el && !el.hidden ? el.textContent : null; })(), antReady: ANT_IDS.every(id => ANTM[id] && img(ANTM[id].file)) }),
    catchForce: v => { ST.catchForce = v; }, throwCatch: () => startCatch(ctx), catchP: () => ST.F[1] ? catchP(ST.F[1]) : null,
    team: () => ({ mode: ST.mode, multi: !!ST.multi, ph: ST.ph, act: ST.F.map(f => f ? ST.team[f.side].indexOf(f) : -1), T: ST.team.map(T0 => T0.map(f => ({ sp: f.sp, hp: Math.round(f.hp), max: f.max, dead: !!f.dead, st: f.status && f.status.id, absent: !!f.absent, hidden: !!f.hidden, recall: !!f.recall, inv: +(f.inv || 0).toFixed(2), x: Math.round(f.x), y: Math.round(f.y) }))), swCd: ST.swCd.map(v => +v.toFixed(2)), sw: ST.sw.map(S => S && { ph: S.ph, why: S.why, t: +S.t.toFixed(2), to: S.to && S.to.sp }), orbs: ST.orbs.map(o => ({ side: o.side, ph: o.ph, x: Math.round(o.x), y: Math.round(o.y), h: Math.round(o.h), type: o.type })), streaks: ST.streaks.length, fxo: ST.fxo.map(e => e.id), ban: ST.swBan.map(b => b && b.s), rects: (ST.teamRects || []).map(r => ({ ...r })), uiW: ST.uiCv ? ST.uiCv.width : 0, end: ST.end && { mid: !!ST.end.mid, win: ST.end.win, t: +ST.end.t.toFixed(2) } }),
    swap: (side, i) => requestSwap(side, i, 'api'), swLog: () => (ST.swLog || []).slice(), swDeny: () => (ST.swDenyLog || []).slice(), aiLog: () => (ST.aiLog || []).slice(), aiSwap: (side, on) => { ST.aiSw[side] = !!on; }, swCdSet: (side, v) => { ST.swCd[side] = v; }, orbReady: () => ORB_IDS.every(id => ORBM[id] && img(ORBM[id].file)), hurtNow: (side, k) => { const f = ST.F[side], o = ST.F[1 - side]; if (!f || !o) return null; const h0 = f.hp; hit(o, f, MOVES.huc, { noMiss: true, mul: k || 1 }); return { before: Math.round(h0), after: Math.round(f.hp), inv: +(f.inv || 0).toFixed(2), absent: !!f.absent }; },   /* plan-58 (test) */
    p73: () => P73.dbg(),   /* p73 */
    p78: () => P78.dbg(), moves: side => (ST.F[side] ? MV78(ST.F[side]).slice() : null),   /* p78 */
    noClash: () => { ST.clashNext = 1e9; }, hold: (side, on) => { const f = ST.F[side]; if (f) f.testHold = !!on; }, skLogReset: () => { ST.skLog = []; },
    dfx: () => ({ code: DFX.CODE, act: DFX.active(), warm: DFX.warmLeft(), hs: +ST.hitstop.toFixed(3), shadowN: ST.shadowN || 0, zones: DFX.zonesNow(), dodgeLate: ST.stats.dodgeLate || 0, shZ: ST.F.map(f => +shadowZ(f).toFixed(1)) }),   /* p52e */
    fxNames: () => ST.fx.concat(ST.gfx).map(e => e.name), mouthCheck: () => mouthCheck(), sk: () => ({ zones: (ST.zones || []).map(z => ({ k: z.k, t: +z.t.toFixed(2), T: z.T })), shots: ST.shots.map(q => q.kind + ':' + (q.sk || '')), skLog: (ST.skLog || []).slice(-40), x2: Object.keys(VFXM || {}).filter(k => k.startsWith('x2_')).length, pins: ST.F.map(f => +(f.pin || 0).toFixed(2)), hide: ST.F.map(f => !!f.hide), echo: ST.F.map(f => !!f.echo) }), setLoad: (side, t) => { const f = ST.F[side]; if (!f || !SET5[t]) return false; f.moves = null; LOAD[f.sp] = SET5[t].slice(); f.cds = Object.fromEntries(LOAD[f.sp].map(m => [m, 0])); f.types = [t]; return true; }, cast: (side, id) => { const f = ST.F[side]; if (!f) return false; f.act = null; f.hurtT = 0; f.pin = 0; f.cds[id] = 0; f.queued = id; f.plan = id; return true; }, wide: () => ({ FW, FH, VW: ctx.VW, VH: ctx.VH, scale: ctx.scale, zoomOut: ctx.S.zoomOut, zoomed: ST.zoomed, tried: ST.wideTry || null, cam: ctx.cam, camZoom: ctx.S.camZoom, d: ST.F.length === 2 ? Math.round(dist(ST.F[0], ST.F[1])) : null }), lastOrigin: () => ST.lastOrigin || null, lastOriginReset: () => { ST.lastOrigin = null; }, shotsNow: () => ST.shots.map(q => ({ kind: q.kind, fx: q.fx || null, sp: q.f.sp, ox: q.ox, oy: q.oy, x: +q.x.toFixed(1), y: +q.y.toFixed(1) })), runnersNow: () => ST.runners.length, beamLast: () => ST.beamLast || null, mouth: side => { const f = ST.F[side]; return f && beamMouth(f); }, impTest: (side = 1, kind = 'A') => { const d = ST.F[side], a = foeOf(d); ST.impLast = -99; return impact(a, d, MOVES.huc, kind, 'test'); },
    pierceNow: () => { const f = ST.F.find(q => MV78(q).includes('phan_quyet')); if (!f || (f.act && f.act.ult) || f.dead) return false; if (f.act) { f.act = null; f.clip = 'idle'; } f.hurtT = 0; f.dodge = null; f.cds.phan_quyet = 0; f.queued = 'phan_quyet'; f.plan = 'phan_quyet'; return true; },
  };
}
/* p73:b:begin */
/* ===== p73: 8 CHIÊU ĐỘC LẠ ★ (systems/chieu73.js) — gắn chiêu vào loài + móc engine. Chấn Thú lấy bộ SET5 → đổi trong LOAD; linh thú đã đổi ở duel-data (SPECIES.moves). ===== */
for (const id of Object.keys(P73.IDS)) SK[id] = { m: 'p73', fix: 1 };
Object.assign(RANGE, { vong_du_chan: 120, bay_lo_than: 125, doi_dong: 150, hinh_nhan_la: 999, hoan_tac: 999, khuc_tan_canh: 95, rinh_so_ho: 130, guong_hoi_quang: 999 });
Object.assign(MOVE_EN, { vong_du_chan: 'Aftershock Ring', bay_lo_than: 'Coal Snare', doi_dong: 'Current Swap', hinh_nhan_la: 'Leaf Effigy', hoan_tac: 'Undo', khuc_tan_canh: 'Last Watch Song', rinh_so_ho: 'Opening Ambush', guong_hoi_quang: 'Recall Mirror' });
MOVE_EN.nem_dia_chan = 'Quake Hurl';   /* p73: tên tiếng Anh cũ trùng tên chiêu của game khác — đổi */
{ const CL = { bay_lo_than: 'spit', hinh_nhan_la: 'cast', hoan_tac: 'zap', rinh_so_ho: 'cast' };
  for (const [sp, [o, n]] of Object.entries(P73_SWAP)) { const L0 = LOAD[sp]; if (L0) { const i = L0.indexOf(o); if (i >= 0) L0[i] = n; }
    const c0 = CL[n] || (CLIP_SP[sp] && CLIP_SP[sp][o]) || CLIP_OF[o] || 'cast'; CLIP_SP[sp] = { ...(CLIP_SP[sp] || {}), [n]: c0 }; } }
P73.init({ ST, MOVES, LOAD, MV78, grounded: q => P78.grounded(q), SK, FLY, HS, DFX, SPR: () => SPR, img, rowOf, colorOf, whiteOf, text, aoe, hit, applyTT, applyStatus, faint, startAct, freeFor, dodgeB, walkable, swimOK, flyable, isWater, passShot,
  clampField, moveBy, nearWalk: (x, y) => nearWalk(ST.ctx, x, y), face, beamMouth, standH, headY, bodyW, statsFor, calcDamage, ACC_STAGE, impactT, skLog, sfx, speedOf, foeReal,
  L: () => L(ST.ctx), FIELD_TOP: () => FIELD_TOP, FIELD_BOT: () => FIELD_BOT });
/* p73:b:end */
/* p74:en:begin */
/* p84 đợt 3 (anh 02/11, video: cận chiến ≈ 55 %): loài < 2 chiêu cận chiến (tính cả Húc) → đổi 1 chiêu TRÙNG VAI thành chiêu lao tới hợp hệ (chép Lao Lửa 80 / 100 / hồi 4, bỏ hiệu ứng phụ).
   Lao Thân = Chung (như Lăn Xả: hệ Chấn, không cộng cùng hệ): trúng → hất bay + NGÃ 0,6 s; giá: tự loạng choạng. p84d: v tốc lao · kd hất ngã · pw lực rung. */
{ const D3 = (id, name, type, pow, acc, cd, x) => [id, { id, name, type, cat: 'vat', pow, acc, cd, shape: 'can', ...x }];
  Object.assign(MOVES, Object.fromEntries([D3('kinh_lao', 'Kình Lao Sóng', 'trieu', 80, 100, 4, { p84d: { v: 235 } }), D3('diep_tram', 'Diệp Trảm Lướt', 'moc', 80, 100, 4, { p84d: { v: 250 } }),
    D3('sung_bang', 'Sừng Băng Xung', 'suong', 80, 100, 4, { p84d: { v: 235 } }), D3('vo_pha_le', 'Vồ Pha Lê', 'tinh', 80, 100, 4, { p84d: { v: 250 } }), D3('xung_loi', 'Xung Lỗi', 'ma', 80, 100, 4, { p84d: { v: 245 } }),
    D3('lao_than', 'Lao Thân', 'chan', 85, 95, 6, { p84d: { v: 225, kd: 1 }, chung: 1, noStab: 1 })]));
  Object.assign(MOVE_EN, { kinh_lao: 'Breaching Charge', diep_tram: 'Gliding Leaf Cut', sung_bang: 'Frost Horn Charge', vo_pha_le: 'Prism Pounce', xung_loi: 'Glitch Ram', lao_than: 'Body Crash' });
  Object.assign(RANGE, { kinh_lao: 115, diep_tram: 115, sung_bang: 115, vo_pha_le: 115, xung_loi: 115, lao_than: 100 }); for (const id of ['kinh_lao', 'diep_tram', 'sung_bang', 'vo_pha_le', 'xung_loi', 'lao_than']) CLIP_OF[id] = 'dash';   /* không có clip dash → atk (startAct) */
  for (const [sp, o, n] of [['bachkinh', 'roi_nuoc', 'kinh_lao'], ['diepnhan', 'hut_nhua', 'diep_tram'], ['tuyetky', 'san_bang', 'sung_bang'], ['tinhmieu', 'tru_pha_le', 'vo_pha_le'], ['banhbao', 'cau_trang', 'lao_than'], ['bovimach', 'nhieu_song', 'xung_loi'], ['macuu', 'nhieu_song', 'xung_loi'], ['rongdo', 'cau_no_lua', 'lao_lua']]) {
    const L0 = LOAD[sp]; if (!L0 || L0.includes(n)) continue; const i = L0.indexOf(o); if (i >= 0) L0[i] = n; }
  if (!P78_CHUNG.includes('lao_than')) P78_CHUNG.push('lao_than'); }
Object.assign(MOVE_NAME_EN, MOVE_EN);   /* p74: tên chiêu tiếng Anh cho hệ khác */
/* p74:en:end */
/* p78:b:begin */
/* ===== p78: KHO CHIÊU đợt mẫu (systems/chieu78.js + fx78.js) — chiêu id → chế độ 'p78'; tầm, clip, tên tiếng Anh; link thử &lv78=30 (cả 2 đội tự xếp theo cấp) &mv78=a,b,c,d,ult ===== */
for (const id of Object.keys(P78.IDS)) SK[id] = { m: 'p78', fix: 1 };
Object.assign(RANGE, { da_vun_ban: 130, dao_ham_vo: 150, cat_lun: 140, son_bang: 150, dia_tu: 90, thu_the: 999, gong_chiu: 999, ngu_bu: 999, lan_xa: 120 });
Object.assign(CLIP_OF, { da_vun_ban: 'cast', dao_ham_vo: 'dig', cat_lun: 'stomp', son_bang: 'ult', dia_tu: 'stomp', thu_the: 'cast', gong_chiu: 'stomp', ngu_bu: 'cast', lan_xa: 'roll' });
for (const [k, fp, im] of [['dig', 12, 3], ['roll', 14, 1], ['throw', 12, 4], ['gore', 12, 4]]) if (FPS[k] == null) { FPS[k] = fp; IMPACT[k] = im; }   /* clip có trong gói ảnh nhưng thiếu nhịp → impactT ra NaN */
Object.assign(MOVE_EN, MOVE_EN78); Object.assign(MOVE_NAME_EN, MOVE_EN78);
function P78url(q, o) {
  const lv = +(q.get('lv78') || 0); if (!(lv > 0)) return; const mk = sp => ({ sp: typeof sp === 'string' ? sp : sp.sp, lv: Math.min(100, lv), auto78: 1 });
  if (o.team) o.team = o.team.map(mk); if (o.foeTeam) o.foeTeam = o.foeTeam.map(mk);
  const mv = (q.get('mv78') || '').split(',').map(s => s.trim()).filter(s => MOVES[s]); if (mv.length && o.team && o.team[0]) { o.team[0].mv = mv.filter(s => !MOVES[s].ult); o.team[0].ult = mv.find(s => MOVES[s].ult) || null; }
}
P78.init({ ST, MOVES, LOAD, MV78, SK, FLY, text, aoe, hit, startAct, freeFor, dodgeB, walkable, swimOK, flyable, isWater, nearWalk: (x, y) => nearWalk(ST.ctx, x, y), face, beamMouth, standH, headY, bodyW, impactT, skLog, sfx, moveBy, clampField, foeReal,
  FIELD_TOP: () => FIELD_TOP, FIELD_BOT: () => FIELD_BOT });
/* p78:b:end */

/* p98:scale:begin — plan-98 (anh chốt + duyệt 2026-11-02): Chấn Thú CŨ thu nhỏ theo dáng (2 chân ≈ cao người chơi 35 px ảnh gói, 4 chân / có cánh ≈ 23, tiến hoá 28).
   Ảnh mới ở _wip/p98/assets/px/linhduel (duel_sprites.json mục '_p98'.K = tỉ lệ ảnh mới / cũ). standH / bodyW / headY / thanh máu / va chạm tự đo lại từ ảnh;
   ở đây nhân cùng tỉ lệ cho số đo tay: điểm miệng / tay MOUTH (px logic so với chân, cả _c theo clip) và độ cao bay FLY.alt. */
const P98K = {"utchan": 0.6053, "thanhong": 0.5897, "golem": 0.614, "rongdo": 0.7955, "bachkinh": 0.5227, "loiho": 0.7667, "vitbao": 0.7667, "diepnhan": 0.8333, "banhbao": 0.7667, "tinhmieu": 0.7667, "tuyetky": 0.7955, "bovimach": 0.6572, "culibong": 0.7931, "hacgiac": 0.8518, "hoahung": 0.8536, "macuu": 0.7667, "nguuson": 0.6481, "kylan": 0.7931, "kylan2": 0.8485, "hac": 0.7667, "saola": 0.6765, "saola2": 0.8235, "daibang": 0.7667, "hac2": 0.9333, "daibang2": 0.9333};
for (const [sp, k] of Object.entries(P98K)) {
  const sc = o => { if (o) for (const d of Object.keys(o)) if (Array.isArray(o[d])) o[d] = [Math.round(o[d][0] * k * 10) / 10, Math.round(o[d][1] * k * 10) / 10]; };
  const m = MOUTH[sp]; if (m) { sc(m); if (m._c) for (const c of Object.keys(m._c)) sc(m._c[c]); }
  if (FLY[sp] && FLY[sp].alt) FLY[sp].alt = Math.max(3, Math.round(FLY[sp].alt * k * 2) / 2);
}
/* p98:scale:end */
/* p97:b:begin */
/* ===== p97: Chấn Thú ẾCH OA LÌ (systems/chieu97.js bọc chieu78 + fx97.js) — chiêu id → chế độ 'p78'; tầm, clip, bộ chiêu, miệng (đo tools: _wip/p97/_gen/measure.py), tên tiếng Anh ===== */
for (const id of ['bot_op', 'bung_phe', 'kinh_den', 'coc_lu', 'luoi_keo', 'vong_khoi']) SK[id] = { m: 'p78', fix: 1 };
Object.assign(RANGE, { bot_op: 140, bung_phe: 125, kinh_den: 999, coc_lu: 150, luoi_keo: 118, vong_khoi: 130 });
Object.assign(FPS, { flop: 12 }); Object.assign(IMPACT, { flop: 2 });
{ const CL = { bot_op: 'spit', bung_phe: 'flop', kinh_den: 'cast', coc_lu: 'ult', luoi_keo: 'tongue', vong_khoi: 'spit' };
  for (const sp of ['oali', 'oalipho', 'laooa']) { CLIP_SP[sp] = { ...(CLIP_SP[sp] || {}), ...CL }; PREF[sp] = 42; }
  LOAD.oali = ['bot_op', 'bung_phe', 'kinh_den', 'luoi_keo', 'coc_lu']; LOAD.oalipho = LOAD.oali.slice(); LOAD.laooa = ['bot_op', 'bung_phe', 'kinh_den', 'vong_khoi', 'coc_lu'];
  SIG.oali = 'luoi_keo'; SIG.oalipho = 'luoi_keo';   /* chiêu riêng tung sớm 1 lần mỗi trận (chieu97 đặt sigDone) */
  NAME_TMP.oali = { vi: 'Oa Lì', en: 'Croaksmug' }; NAME_TMP.oalipho = { vi: 'Oa Lì Phố', en: 'Street Croak' }; NAME_TMP.laooa = { vi: 'Lão Oa Đại Ca', en: 'Don Croak' };
  MOUTH.oali = {"south": [0.0, -11.3], "east": [4.8, -12.1], "north": [0.0, -11.2], "south-east": [7.2, -10.6], "north-east": [6.8, -11.2], "_c": {"tongue": {"south": [0.0, -10.3], "east": [4.8, -11.8], "north": [0.0, -11.8], "south-east": [9.2, -12.9], "north-east": [7.8, -13.1]}, "idle": {"south": [0.0, -10.3], "east": [4.8, -10.2], "north": [0.0, -11.2], "south-east": [5.8, -10.2], "north-east": [5.2, -10.9]}}}; MOUTH.oalipho = {"south": [0.0, -15.4], "east": [11.8, -13.1], "north": [0.0, -13.3], "south-east": [10.8, -12.5], "north-east": [7.2, -13.1], "_c": {"tongue": {"south": [0.0, -14.1], "east": [9.2, -12.0], "north": [0.0, -14.3], "south-east": [9.2, -11.4], "north-east": [6.8, -13.2]}, "idle": {"south": [0.0, -10.9], "east": [6.8, -11.1], "north": [0.0, -13.6], "south-east": [7.2, -11.7], "north-east": [6.8, -12.7]}}}; MOUTH.laooa = {"south": [-1.5, -15.4], "east": [11.2, -13.1], "north": [0.0, -14.6], "south-east": [11.8, -14.9], "north-east": [10.8, -14.8], "_c": {"tongue": {"south": [-1.5, -15.0], "east": [4.2, -13.9], "north": [0.0, -14.6], "south-east": [8.2, -11.9], "north-east": [4.2, -13.2]}, "idle": {"south": [0.0, -11.7], "east": [7.2, -10.9], "north": [0.0, -15.2], "south-east": [5.8, -11.1], "north-east": [8.2, -11.7]}}}; }
Object.assign(MOVE_EN, MOVE_EN97); Object.assign(MOVE_NAME_EN, MOVE_EN97);
{ const X97 = { applyStatus, faint, img, impact, DFX, sepNeed, eye: { oali: {"south": [-1.0, -13.5], "east": [2.2, -12.8], "north": null, "south-east": [-0.2, -13.4], "north-east": null}, oalipho: {"south": null, "east": [4.0, -13.1], "north": null, "south-east": [0.5, -14.0], "north-east": null}, laooa: {"south": null, "east": null, "north": null, "south-east": [-5.2, -14.0], "north-east": null} } }; P78.init97(X97);
  fetch(BASE + 'linhduel/oali_items.json').then(r => r.json()).then(j => P78.init97({ ...X97, meta: j })).catch(() => { }); try { window.__p97 = () => P78.dbg(); window.__p97origin = () => { const o = P78.dbg().p97.orig; return { n: o.length, maxErr: o.reduce((a, q) => Math.max(a, q.err), 0), last: o.slice(-4) }; }; } catch (e) { } }
/* p97:b:end */
