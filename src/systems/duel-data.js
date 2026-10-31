// duel-data.js — plan-48 Đấu Linh Thú: dữ liệu hệ, bảng khắc, chiêu, loài (thú tự sáng tạo, KHÔNG dùng tên/hình Pokémon).
// Cơ chế chiêu theo kiểu Pokémon nhưng chạy thời gian thực: pow (sức), acc (% trúng), cat 'vat' (vật lý: atk/def) | 'dac' (đặc biệt: spa/spd) | 'tt' (trạng thái, không gây sát thương),
// cd = hồi chiêu (giây, thay cho PP), prio = ra trước (ngắt đòn đang gồng), shape: 'can' cận chiến · 'dan' đạn bay · 'tia' tia thẳng · 'vung' vùng quanh mục tiêu · 'quanh' vùng quanh mình · 'minh' tự buff,
// eff: { st: trạng thái, p: xác suất } | { stat: {atk:+1…}, who: 'minh'|'dich' } | { heal: tỉ lệ máu } | { weather } | { protect: giây } | { lock: giây } (khoá 1 chiêu đối thủ).
// Trạng thái: 'bong' (bỏng: −6 %/3 s, sức vật lý ×0,5) · 'te' (tê: tốc ×0,5, 20 % khựng) · 'ngu' (ngủ 2–4 s) · 'dong' (đóng băng tới khi trúng đòn Nham hoặc 3 s) · 'doc' (độc: −8 %/3 s) · 'roi' (rối: 30 % tự đánh mình, 4 s).
// Thời tiết: 'mua' (Triều ×1,3, Nham ×0,7) · 'nang' (Nham ×1,3, Triều ×0,7) · 'cat' (bão cát: −4 %/3 s trừ Chấn/Tinh) · 'tuyet' (Sương ×1,3, −4 %/3 s trừ Sương) · 'nhieu' (nhiễu Mã: mọi chiêu acc −10 trừ Mã).

export const TYPES = ['chan', 'nham', 'trieu', 'loi', 'phong', 'moc', 'suong', 'tinh', 'ma', 'am', 'anh', 'quang'];
export const TYPE_NAME = { chan: 'Chấn', nham: 'Nham', trieu: 'Triều', loi: 'Lôi', phong: 'Phong', moc: 'Mộc', suong: 'Sương', tinh: 'Tinh', ma: 'Mã', am: 'Âm', anh: 'Ảnh', quang: 'Quang' };
export const TYPE_COLOR = { chan: '#a07a4c', nham: '#e0632c', trieu: '#3f8fd8', loi: '#f2c335', phong: '#9fd6c8', moc: '#5aa64a', suong: '#a9e1f2', tinh: '#d79be8', ma: '#46d39a', am: '#c9a2ff', anh: '#5b4a7a', quang: '#ffe9a3' };
/* mỗi hệ khắc đúng 2, bị khắc đúng 2 (plan-48 mục 6) */
export const STRONG = { chan: ['loi', 'nham'], nham: ['moc', 'suong'], trieu: ['nham', 'chan'], loi: ['trieu', 'phong'], phong: ['moc', 'am'], moc: ['trieu', 'chan'],
  suong: ['phong', 'anh'], tinh: ['suong', 'quang'], ma: ['tinh', 'loi'], am: ['tinh', 'ma'], anh: ['am', 'quang'], quang: ['anh', 'ma'] };
export function typeMul(atk, defTypes) {   /* ×1,5 mỗi hệ bị khắc, ×0,67 mỗi hệ khắc lại; 2 hệ thì nhân dồn */
  let m = 1; for (const d of defTypes) { if (STRONG[atk].includes(d)) m *= 1.5; else if (STRONG[d].includes(atk)) m *= 0.67; } return m;
}

/* ---------- chiêu ---------- */
const M = (id, name, type, cat, pow, acc, cd, shape, extra = {}) => ({ id, name, type, cat, pow, acc, cd, shape, ...extra });
export const MOVES = Object.fromEntries([
  /* chung (mọi loài học được) */
  M('huc', 'Húc', 'chan', 'vat', 40, 100, 1.2, 'can', { common: true }),
  M('cao', 'Cào', 'anh', 'vat', 40, 100, 1.2, 'can', { common: true }),
  M('lao', 'Lao Nhanh', 'phong', 'vat', 35, 100, 2.5, 'can', { prio: 1, common: true }),
  M('gam', 'Gầm Doạ', 'am', 'tt', 0, 100, 6, 'quanh', { eff: { stat: { atk: -1 }, who: 'dich' }, common: true }),
  M('chan_khien', 'Thủ Thế', 'tinh', 'tt', 0, 100, 10, 'minh', { eff: { protect: 1.2 }, prio: 2, common: true }),
  /* Chấn */
  M('dam_chan', 'Dậm Chấn', 'chan', 'vat', 60, 100, 3, 'quanh'),
  M('nut_dat', 'Nứt Đất', 'chan', 'vat', 75, 95, 4, 'tia'),
  M('cot_da', 'Cột Đá Trồi', 'chan', 'vat', 90, 85, 6, 'vung', { eff: { st: 'roi', p: 0.2 } }),
  M('bao_cat', 'Gọi Bão Cát', 'chan', 'tt', 0, 100, 14, 'minh', { eff: { weather: 'cat' } }),
  M('dai_dia_chan', 'Đại Địa Chấn', 'chan', 'vat', 130, 90, 18, 'quanh', { ult: true }),
  /* Nham */
  M('phun_than', 'Phun Than', 'nham', 'dac', 55, 100, 2.5, 'dan', { eff: { st: 'bong', p: 0.1 } }),
  M('vung_nham', 'Vũng Dung Nham', 'nham', 'dac', 70, 95, 5, 'vung', { eff: { st: 'bong', p: 0.3 } }),
  M('lao_lua', 'Lao Lửa', 'nham', 'vat', 80, 100, 4, 'can', { eff: { stat: { spe: 1 }, who: 'minh' } }),
  M('troi_nang', 'Nắng Gắt', 'nham', 'tt', 0, 100, 14, 'minh', { eff: { weather: 'nang' } }),
  M('nui_lua', 'Núi Lửa Con', 'nham', 'dac', 130, 85, 18, 'vung', { ult: true, eff: { st: 'bong', p: 0.4 } }),
  /* Triều */
  M('thuy_cham', 'Phi Thuỷ Châm', 'trieu', 'dac', 50, 100, 2, 'dan', { prio: 1 }),
  M('song_cuon', 'Sóng Cuộn', 'trieu', 'dac', 75, 100, 4, 'tia'),
  M('bong_giam', 'Bong Bóng Giam', 'trieu', 'tt', 0, 85, 8, 'dan', { eff: { stat: { spe: -2 }, who: 'dich' } }),
  M('goi_mua', 'Gọi Mưa', 'trieu', 'tt', 0, 100, 14, 'minh', { eff: { weather: 'mua' } }),
  M('trieu_dang', 'Thuỷ Triều Dâng', 'trieu', 'dac', 130, 90, 18, 'quanh', { ult: true }),
  /* Lôi */
  M('phong_tia', 'Phóng Tia', 'loi', 'dac', 70, 100, 3, 'tia', { eff: { st: 'te', p: 0.1 } }),
  M('xung_vong', 'Xung Vòng', 'loi', 'dac', 55, 100, 3, 'quanh', { eff: { st: 'te', p: 0.2 } }),
  M('loi_cau', 'Lôi Cầu', 'loi', 'dac', 85, 90, 5, 'dan'),
  M('tich_dien', 'Tích Điện', 'loi', 'tt', 0, 100, 9, 'minh', { eff: { stat: { spa: 2 }, who: 'minh' } }),
  M('set_troi', 'Sét Trời Giáng', 'loi', 'dac', 135, 80, 18, 'vung', { ult: true, eff: { st: 'te', p: 0.3 } }),
  /* Phong */
  M('luoi_gio', 'Lưỡi Gió', 'phong', 'dac', 55, 95, 2.5, 'dan', { crit: 1 }),
  M('loc_xoay', 'Lốc Xoáy', 'phong', 'dac', 70, 90, 5, 'vung', { eff: { st: 'roi', p: 0.2 } }),
  M('bo_nhao', 'Bổ Nhào', 'phong', 'vat', 85, 95, 5, 'can'),
  M('gio_xuoi', 'Gió Xuôi', 'phong', 'tt', 0, 100, 10, 'minh', { eff: { stat: { spe: 2 }, who: 'minh' } }),
  M('bao_loc', 'Bão Lốc', 'phong', 'dac', 125, 90, 18, 'quanh', { ult: true }),
  /* Mộc */
  M('bao_tu', 'Bào Tử Ngủ', 'moc', 'tt', 0, 75, 9, 'vung', { eff: { st: 'ngu', p: 1 } }),
  M('roi_re', 'Roi Rễ', 'moc', 'vat', 65, 100, 3, 'tia'),
  M('hut_nhua', 'Hút Nhựa', 'moc', 'dac', 60, 100, 5, 'dan', { eff: { drain: 0.5 } }),
  M('phan_doc', 'Phấn Độc', 'moc', 'tt', 0, 90, 8, 'vung', { eff: { st: 'doc', p: 1 } }),
  M('rung_troi', 'Rừng Trồi', 'moc', 'vat', 125, 90, 18, 'quanh', { ult: true }),
  /* Sương */
  M('gai_bang', 'Gai Băng', 'suong', 'vat', 55, 100, 2.5, 'dan', { prio: 1 }),
  M('hoi_lanh', 'Hơi Lạnh', 'suong', 'dac', 65, 100, 4, 'tia', { eff: { st: 'dong', p: 0.1 } }),
  M('guong_bang', 'Gương Băng', 'suong', 'tt', 0, 100, 12, 'minh', { eff: { reflect: 0.5, dur: 3 } }),
  M('goi_tuyet', 'Gọi Tuyết', 'suong', 'tt', 0, 100, 14, 'minh', { eff: { weather: 'tuyet' } }),
  M('bao_tuyet', 'Bão Tuyết', 'suong', 'dac', 120, 85, 18, 'quanh', { ult: true, eff: { st: 'dong', p: 0.3 } }),
  /* Tinh */
  M('manh_pha_le', 'Mảnh Pha Lê', 'tinh', 'vat', 60, 95, 2.5, 'dan', { crit: 1 }),
  M('khuc_xa', 'Khúc Xạ', 'tinh', 'dac', 80, 100, 4, 'tia'),
  M('giap_tinh', 'Giáp Tinh Thể', 'tinh', 'tt', 0, 100, 10, 'minh', { eff: { stat: { def: 2 }, who: 'minh' } }),
  M('mua_kim_cuong', 'Mưa Kim Cương', 'tinh', 'vat', 125, 90, 18, 'vung', { ult: true }),
  /* Mã */
  M('nhieu_song', 'Nhiễu Sóng', 'ma', 'dac', 60, 100, 3, 'tia', { eff: { st: 'roi', p: 0.2 } }),
  M('ma_hoa', 'Mã Hoá', 'ma', 'tt', 0, 90, 10, 'dan', { eff: { lock: 6 } }),
  M('dich_loi', 'Dịch Chuyển Lỗi', 'ma', 'tt', 0, 100, 6, 'minh', { eff: { blink: true }, prio: 2 }),
  M('goi_nhieu', 'Phát Nhiễu', 'ma', 'tt', 0, 100, 14, 'minh', { eff: { weather: 'nhieu' } }),
  M('sap_he', 'Sập Hệ Thống', 'ma', 'dac', 130, 85, 18, 'quanh', { ult: true, eff: { lock: 4 } }),
  /* Âm */
  M('song_am', 'Sóng Âm', 'am', 'dac', 60, 100, 2.5, 'tia', { pierce: true }),
  M('dap_am', 'Đập Âm', 'am', 'vat', 70, 90, 5, 'can', { eff: { st: 'roi', p: 0.3 } }),
  M('hu_vang', 'Hú Vang', 'am', 'tt', 0, 100, 9, 'quanh', { eff: { stat: { spa: -1, atk: -1 }, who: 'dich' } }),
  M('cong_huong', 'Cộng Hưởng', 'am', 'dac', 125, 95, 18, 'quanh', { ult: true }),
  /* Ảnh */
  M('vuot_bong', 'Vuốt Bóng', 'anh', 'vat', 65, 100, 2.5, 'can', { crit: 1 }),
  M('lan_bong', 'Lẩn Bóng', 'anh', 'tt', 0, 100, 9, 'minh', { eff: { stealth: 1.5 }, prio: 2 }),
  M('den_me', 'Đèn Mê', 'anh', 'tt', 0, 80, 9, 'dan', { eff: { st: 'ngu', p: 1 } }),
  M('dem_den', 'Đêm Đen', 'anh', 'dac', 125, 90, 18, 'quanh', { ult: true }),
  /* Quang */
  M('tia_sang', 'Tia Sáng', 'quang', 'dac', 65, 100, 2.5, 'tia'),
  M('chop_loa', 'Chớp Loá', 'quang', 'tt', 0, 100, 8, 'quanh', { eff: { stat: { acc: -1 }, who: 'dich' } }),
  M('chan_quang', 'Lá Chắn Quang', 'quang', 'tt', 0, 100, 12, 'minh', { eff: { shield: 0.25 } }),
  M('tu_lanh', 'Tự Lành', 'quang', 'tt', 0, 100, 14, 'minh', { eff: { heal: 0.4 } }),
  M('phan_quyet', 'Phán Quyết', 'quang', 'dac', 135, 85, 18, 'tia', { ult: true }),
  /* p57 — BẢN GỘP plan-55 §15 / plan-56: chiêu MỚI cho bộ 5 mỗi hệ */
  M('nem_da', 'Ném Tảng Đá', 'chan', 'vat', 80, 95, 4, 'lob', { eff: { st: 'roi', p: 0.15 } }),
  M('don_tho', 'Khoan Đất', 'chan', 'vat', 75, 100, 7, 'can'),
  M('cau_no_lua', 'Cầu Nổ Lửa', 'nham', 'dac', 80, 90, 4, 'dan', { eff: { st: 'bong', p: 0.2 } }),
  M('roi_nuoc', 'Roi Nước', 'trieu', 'vat', 60, 100, 2.5, 'tia'),
  M('luot_dien', 'Lao Tích Điện', 'loi', 'vat', 80, 95, 4.5, 'can', { eff: { st: 'te', p: 0.2 } }),
  M('bao_la', 'Bão Lá', 'moc', 'dac', 70, 95, 3, 'dan'),
  M('san_bang', 'Xoáy Băng', 'suong', 'dac', 55, 100, 7, 'vung', { eff: { stat: { spe: -1 }, who: 'dich' } }),
  M('tru_pha_le', 'Trụ Pha Lê', 'tinh', 'vat', 80, 90, 4, 'vung'),
  M('tuong_lua', 'Tường Lửa', 'ma', 'dac', 60, 100, 8, 'hang'),
  M('tieng_vong', 'Tiếng Vọng', 'am', 'tt', 0, 100, 12, 'minh'),
  M('ham_bong', 'Hàm Bóng', 'anh', 'vat', 75, 95, 3, 'can'),
  M('cau_bong', 'Cầu Bóng', 'anh', 'dac', 70, 100, 2.5, 'dan'),
  M('cau_trang', 'Cầu Trăng', 'quang', 'dac', 85, 95, 4, 'dan', { eff: { stat: { spa: -1 }, who: 'dich' } }),
].map(m => [m.id, m]));
/* p57: tên theo bản gộp (plan-55 §15) */
for (const [id, n] of Object.entries({ nut_dat: 'Gai Đá Trồi', dam_chan: 'Địa Chấn Vòng', dai_dia_chan: 'Địa Long Trỗi Dậy', phun_than: 'Phun Lửa Xoắn', vung_nham: 'Phun Dung Nham', nui_lua: 'Mưa Thiên Thạch',
  thuy_cham: 'Lưỡi Nước', song_cuon: 'Sóng Dâng', trieu_dang: 'Hải Cầu Vỡ', phong_tia: 'Chuỗi Sét', xung_vong: 'Xả Điện', set_troi: 'Bão Sét', bo_nhao: 'Lao Rút Về', gio_xuoi: 'Thoát Ảnh', bao_loc: 'Tốc Vô Cực',
  roi_re: 'Rễ Trói', bao_tu: 'Phấn Ngủ', rung_troi: 'Rừng Gai Mọc', hoi_lanh: 'Gió Tuyết', gai_bang: 'Cột Băng Rơi', guong_bang: 'Giáp Giá', bao_tuyet: 'Băng Phong', manh_pha_le: 'Mưa Mảnh', giap_tinh: 'Khiên Tinh',
  nhieu_song: 'Pháo Khối', ma_hoa: 'Ngắt Kết Nối', song_am: 'Âm Vọng', hu_vang: 'Gào Quạt', cong_huong: 'Hợp Xướng', den_me: 'Mê Bóng', dem_den: 'Ác Mộng Đêm', chop_loa: 'Quét Sáng', tu_lanh: 'Màn Sáng', phan_quyet: 'Nguyệt Thực Giáng' })) if (MOVES[id]) MOVES[id].name = n;
MOVES.dich_loi.pow = 60; MOVES.dich_loi.cat = 'vat';   /* p57: Dịch Chuyển Lỗi = hiện sau lưng + 1 nhát */
MOVES.lan_bong.cd = 8;
/* p67:moves:begin */
/* p67: CHIÊU RIÊNG mỗi Chấn Thú mới (1 chiêu đúng bản sắc loài; cơ chế + VFX code ở linhduel.js sigFire / pxfx_full.js FS.*_sig*) */
Object.assign(MOVES, {
  ghi_de: M('ghi_de', 'Ghi Đè', 'ma', 'dac', 70, 95, 10, 'tia', { sig: 'bovimach' }),
  mat_dem: M('mat_dem', 'Ánh Mắt Đêm', 'anh', 'dac', 55, 90, 11, 'tia', { sig: 'culibong' }),
  thu_bom: M('thu_bom', 'Thả Gói Tin', 'ma', 'dac', 70, 90, 9, 'vung', { sig: 'macuu' }),
  luoi_bong: M('luoi_bong', 'Lưỡi Bóng', 'anh', 'vat', 80, 95, 9, 'tia', { sig: 'hacgiac' }),
  om_hoa: M('om_hoa', 'Ôm Hoả Ngục', 'nham', 'vat', 95, 95, 11, 'can', { sig: 'hoahung' }),
  nguu_xung: M('nguu_xung', 'Ngưu Giác Phá Sơn', 'chan', 'vat', 100, 90, 11, 'can', { sig: 'nguuson' }),
});
/* p67:moves:end */

/* ---------- loài ----------
   base: hp atk def spa spd spe (thang ~40–130 như thể loại); dạng Thức Tỉnh cộng ~25 %. moves: 4 chiêu mặc định (chiêu cuối = tuyệt chiêu).
   rare: 'noi' (hiếm theo nơi/giờ) | 'huyen' (Huyền Thoại: +30 %, 1/đội) ; size: 's' nhỏ | 'm' | 'l' lớn. */
const S = (id, name, types, base, moves, extra = {}) => ({ id, name, types, base, moves, ...extra });
export const SPECIES = Object.fromEntries([
  S('utchan', 'Ụt Chấn', ['chan'], [60, 75, 85, 40, 50, 35], ['dam_chan', 'nut_dat', 'huc', 'dai_dia_chan'], { evo: 'dinhchan', size: 's' }),
  S('golem', 'Thạch Chấn Vương', ['chan'], [60, 75, 85, 40, 50, 35], ['dam_chan', 'nut_dat', 'huc', 'dai_dia_chan'], { size: 'l' }),   /* p49c: bậc To (plan-50 §G) · plan-48 p48c: thú sticker — chỉ số & chiêu như Ụt Chấn */
  S('rongdo', 'Xích Long', ['nham'], [55, 65, 50, 80, 55, 65], ['phun_than', 'lao_lua', 'gam', 'nui_lua'], { size: 'm' }),   /* chỉ số & chiêu như Than Hồng */
  S('bachkinh', 'Bạch Kình', ['trieu'], [80, 55, 70, 85, 75, 45], ['thuy_cham', 'bong_giam', 'song_cuon', 'trieu_dang'], { size: 'm' }),   /* p48c đợt 2 */
  S('loiho', 'Lôi Hồ', ['loi'], [55, 60, 50, 85, 55, 95], ['phong_tia', 'loi_cau', 'xung_vong', 'set_troi'], { size: 's' }),
  S('vitbao', 'Vịt Bão', ['phong'], [60, 70, 55, 70, 60, 90], ['luoi_gio', 'gio_xuoi', 'lao', 'bao_loc'], { size: 's' }),
  S('diepnhan', 'Diệp Nhẫn Giả', ['moc'], [65, 85, 60, 60, 65, 80], ['roi_re', 'hut_nhua', 'bao_tu', 'rung_troi'], { size: 'm' }),
  /* p49c đợt 3 (p48c): bậc cỡ plan-50 §G — Tuyết Kỳ Lân Vừa; Tinh Miêu, Cười Thố, Bánh Bao Thánh Nhỏ */
  S('tuyetky', 'Tuyết Kỳ Lân', ['suong'], [75, 65, 70, 80, 70, 55], ['gai_bang', 'hoi_lanh', 'guong_bang', 'bao_tuyet'], { size: 'm' }),
  S('tinhmieu', 'Tinh Miêu', ['tinh'], [55, 70, 70, 70, 60, 80], ['manh_pha_le', 'khuc_xa', 'giap_tinh', 'mua_kim_cuong'], { size: 's' }),
  S('cuoitho', 'Cười Thố', ['am'], [60, 60, 55, 80, 55, 85], ['song_am', 'hu_vang', 'dap_am', 'cong_huong'], { size: 's' }),
  S('bovimach', 'Bọ Vi Mạch', ['ma'], [65, 70, 80, 90, 70, 60], ["nhieu_song", "dich_loi", "ma_hoa", "sap_he"], { size: 'm' }),   /* p64:bovimach */ /* p64 Chấn Thú mới hệ Mã (thiết kế gốc, bậc Vừa): bọ hung tê giác vỏ mạch điện — chiêu theo SET5.ma */
  S('culibong', 'Cu Li Bóng', ['anh'], [55, 85, 50, 75, 60, 90], ["ham_bong", "cau_bong", "den_me", "dem_den"], { size: 's' }),   /* p64:culibong */ /* p64 Chấn Thú mới hệ Ảnh (thiết kế gốc, bậc Nhỏ): cu li (culi chậm) lông chàm tối, mắt to phát sáng, cắn có nọc — chiêu theo SET5.anh */
/* p67:species:begin */
  S('macuu', 'Mã Cưu', ['ma'], [55, 60, 55, 85, 65, 95], ["nhieu_song", "dich_loi", "ma_hoa", "sap_he"], { size: 's' }),   /* p67 Chấn Thú sticker pyth_bocau (plan-48 §16), hệ Mã, bậc Nhỏ, THÚ BAY (p60_fly): bồ câu đội mũ sọc tím — chiêu SET5.ma + chiêu riêng Thả Gói Tin */
  S('hacgiac', 'Hắc Giác Thú', ['anh'], [55, 85, 55, 75, 60, 85], ["ham_bong", "cau_bong", "den_me", "dem_den"], { size: 's' }),   /* p67 Chấn Thú sticker raiku_thuden (plan-48 §16), hệ Ảnh, bậc Nhỏ: thú đen tròn sừng xanh chanh, mắt lồi, lè lưỡi — chiêu SET5.anh + chiêu riêng Lưỡi Bóng */
  S('hoahung', 'Hoả Hùng', ['nham'], [75, 90, 70, 75, 65, 55], ["phun_than", "cau_no_lua", "lao_lua", "nui_lua"], { size: 'm' }),   /* p67 Chấn Thú sticker fogo_gau (plan-48 §16), hệ Nham, bậc Vừa: gấu túi xanh đen vương miện lửa trên đầu — chiêu SET5.nham + chiêu riêng Ôm Hoả Ngục */
  S('nguuson', 'Ngưu Sơn', ['chan'], [85, 100, 90, 45, 60, 40], ["dam_chan", "nut_dat", "nem_da", "dai_dia_chan"], { size: 'l' }),   /* p67 Chấn Thú sticker eclipse_bo (plan-48 §16), hệ Chấn, bậc To: bò Tây Nguyên lông xù mặc áo khoác xanh, sừng kem lớn — chiêu SET5.chan + chiêu riêng Ngưu Giác Phá Sơn */
/* p67:species:end */
  S('banhbao', 'Bánh Bao Thánh', ['quang'], [70, 45, 65, 85, 80, 65], ['tia_sang', 'chop_loa', 'tu_lanh', 'phan_quyet'], { size: 's' }),
  S('dinhchan', 'Đỉnh Chấn', ['chan'], [80, 100, 110, 55, 65, 45], ['dam_chan', 'cot_da', 'bao_cat', 'dai_dia_chan'], { size: 'm' }),
  S('thanhong', 'Than Hồng', ['nham'], [55, 65, 50, 80, 55, 65], ['phun_than', 'lao_lua', 'gam', 'nui_lua'], { evo: 'hoagiap', size: 's' }),
  S('hoagiap', 'Hoả Giáp', ['nham', 'chan'], [75, 90, 75, 100, 65, 75], ['phun_than', 'vung_nham', 'troi_nang', 'nui_lua'], { size: 'm' }),
  S('botboi', 'Bọt Bơi', ['trieu'], [60, 45, 60, 75, 70, 55], ['thuy_cham', 'song_cuon', 'bong_giam', 'trieu_dang'], { evo: 'trieudang', size: 's' }),
  S('trieudang', 'Triều Đăng', ['trieu', 'quang'], [80, 55, 80, 100, 95, 60], ['song_cuon', 'goi_mua', 'tia_sang', 'trieu_dang'], { size: 'm' }),
  S('daydi', 'Dây Dí', ['loi'], [45, 50, 45, 80, 50, 90], ['phong_tia', 'xung_vong', 'lao', 'set_troi'], { evo: 'cotloi', size: 's' }),
  S('cotloi', 'Cột Lôi', ['loi'], [65, 60, 65, 110, 70, 105], ['phong_tia', 'loi_cau', 'tich_dien', 'set_troi'], { size: 'm' }),
  S('maybong', 'Mây Bông', ['phong'], [55, 45, 55, 65, 65, 85], ['luoi_gio', 'gio_xuoi', 'lao', 'bao_loc'], { evo: 'locvuong', size: 's' }),
  S('locvuong', 'Lốc Vương', ['phong'], [75, 70, 70, 90, 80, 105], ['luoi_gio', 'loc_xoay', 'bo_nhao', 'bao_loc'], { size: 'm' }),
  S('namlac', 'Nấm Lắc', ['moc'], [65, 55, 65, 60, 70, 35], ['roi_re', 'bao_tu', 'hut_nhua', 'rung_troi'], { evo: 'rungmang', size: 's' }),
  S('rungmang', 'Rừng Mang', ['moc', 'chan'], [95, 85, 95, 70, 85, 40], ['roi_re', 'phan_doc', 'hut_nhua', 'rung_troi'], { size: 'l' }),
  S('dongchau', 'Đông Châu', ['suong'], [50, 45, 55, 75, 70, 65], ['gai_bang', 'hoi_lanh', 'guong_bang', 'bao_tuyet'], { evo: 'bangthap', size: 's' }),
  S('bangthap', 'Băng Tháp', ['suong', 'tinh'], [70, 55, 90, 100, 90, 60], ['hoi_lanh', 'goi_tuyet', 'manh_pha_le', 'bao_tuyet'], { size: 'l' }),
  S('langkinh', 'Lăng Kính', ['tinh'], [50, 60, 75, 70, 60, 55], ['manh_pha_le', 'khuc_xa', 'giap_tinh', 'mua_kim_cuong'], { evo: 'tinhhoang', size: 's' }),
  S('tinhhoang', 'Tinh Hoàng', ['tinh', 'quang'], [70, 75, 100, 95, 85, 70], ['khuc_xa', 'giap_tinh', 'tia_sang', 'mua_kim_cuong'], { size: 'm' }),
  S('bitbit', 'Bít Bít', ['ma'], [50, 50, 55, 75, 55, 80], ['nhieu_song', 'ma_hoa', 'dich_loi', 'sap_he'], { evo: 'matmaxa', size: 's', rare: 'noi', where: 'M9' }),
  S('matmaxa', 'Mật Mã Xà', ['ma', 'loi'], [75, 65, 70, 105, 75, 100], ['nhieu_song', 'goi_nhieu', 'phong_tia', 'sap_he'], { size: 'l' }),
  S('kenken', 'Kèn Kẹn', ['am'], [60, 50, 50, 70, 55, 60], ['song_am', 'hu_vang', 'dap_am', 'cong_huong'], { evo: 'loavuong', size: 's' }),
  S('loavuong', 'Loa Vương', ['am'], [90, 70, 75, 95, 75, 60], ['song_am', 'dap_am', 'hu_vang', 'cong_huong'], { size: 'l' }),
  S('bongle', 'Bóng Lẻ', ['anh'], [45, 70, 45, 60, 50, 85], ['vuot_bong', 'lan_bong', 'den_me', 'dem_den'], { evo: 'dadang', size: 's', rare: 'noi', where: 'đêm' }),
  S('dadang', 'Dạ Đăng', ['anh', 'nham'], [65, 95, 60, 85, 65, 105], ['vuot_bong', 'den_me', 'phun_than', 'dem_den'], { size: 'm' }),
  S('domsang', 'Đom Sáng', ['quang'], [50, 40, 55, 75, 70, 75], ['tia_sang', 'chop_loa', 'tu_lanh', 'phan_quyet'], { evo: 'thienkinh', size: 's', rare: 'noi', where: 'bình minh' }),
  S('thienkinh', 'Thiên Kính', ['quang', 'phong'], [75, 50, 75, 110, 95, 85], ['tia_sang', 'chan_quang', 'luoi_gio', 'phan_quyet'], { size: 'm' }),
  /* Huyền Thoại (plan-48 mục 10) */
  S('tamchan', 'Tâm Chấn', ['chan', 'ma'], [110, 125, 110, 110, 95, 90], ['cot_da', 'nhieu_song', 'ma_hoa', 'dai_dia_chan'], { rare: 'huyen', size: 'l', passive: 'du_chan' }),
  S('nhatthuc', 'Nhật Thực', ['quang', 'anh'], [100, 100, 95, 130, 100, 105], ['tia_sang', 'vuot_bong', 'chop_loa', 'phan_quyet'], { rare: 'huyen', size: 'l', passive: 'doi_ngay' }),
  S('haitam', 'Hải Tâm', ['trieu', 'tinh'], [120, 85, 115, 115, 120, 75], ['song_cuon', 'khuc_xa', 'tu_lanh', 'trieu_dang'], { rare: 'huyen', size: 'l', passive: 'luon_nuoc' }),
  S('loigoc', 'Lỗi Gốc', ['ma'], [100, 110, 100, 110, 100, 110], ['nhieu_song', 'ma_hoa', 'dich_loi', 'sap_he'], { rare: 'huyen', size: 'm', passive: 'chep_chieu', secret: true }),
].map(s => [s.id, s]));
/* p49c: độ hiếm (rarity) cho MỌI loài — 'thuong' thường · 'hiem' hiếm · 'huyen' huyền thoại (rare: 'huyen' → huyen, rare: 'noi' → hiem; thú sticker theo bảng dưới) */
export const RARITY_NAME = { thuong: { vi: 'Thường', en: 'Common' }, hiem: { vi: 'Hiếm', en: 'Rare' }, huyen: { vi: 'Huyền Thoại', en: 'Legendary' } };
const RARITY_OF = { golem: 'hiem', rongdo: 'hiem', bachkinh: 'hiem', tuyetky: 'hiem', banhbao: 'hiem', loiho: 'thuong', vitbao: 'thuong', diepnhan: 'thuong', tinhmieu: 'thuong', cuoitho: 'thuong' };
for (const s of Object.values(SPECIES)) s.rarity = RARITY_OF[s.id] || (s.rare === 'huyen' ? 'huyen' : s.rare === 'noi' ? 'hiem' : 'thuong');

/* Sát thương (công thức kiểu thể loại, chia nhỏ cho thời gian thực):
   dmg = ((2*lv/5+2) * pow * A/D / 50 + 2) * STAB(1,5 nếu cùng hệ) * typeMul * crit(1,5; 1/16, crit:1 → 1/8) * rand(0,85–1) * weather */
export function calcDamage(lv, move, att, def, opts = {}) {
  if (!move.pow) return { dmg: 0, mul: 1, crit: false };
  const A = move.cat === 'vat' ? att.atk * (att.st === 'bong' ? 0.5 : 1) : att.spa, D = move.cat === 'vat' ? def.def : def.spd;
  const stab = att.types.includes(move.type) ? 1.5 : 1, mul = typeMul(move.type, def.types);
  const crit = (opts.rnd ? opts.rnd() : Math.random()) < (move.crit ? 1 / 8 : 1 / 16);
  const rand = 0.85 + (opts.rnd ? opts.rnd() : Math.random()) * 0.15;
  let w = 1; const wx = opts.weather;
  if (wx === 'mua') w = move.type === 'trieu' ? 1.3 : move.type === 'nham' ? 0.7 : 1;
  if (wx === 'nang') w = move.type === 'nham' ? 1.3 : move.type === 'trieu' ? 0.7 : 1;
  if (wx === 'tuyet' && move.type === 'suong') w = 1.3;
  const dmg = Math.max(1, Math.floor(((2 * lv / 5 + 2) * move.pow * A / D / 50 + 2) * stab * mul * (crit ? 1.5 : 1) * rand * w));
  return { dmg, mul, crit };
}
/* chỉ số thật từ base (thang thể loại, bỏ IV/EV): hp = base*2*lv/100 + lv + 10 ; khác = base*2*lv/100 + 5 ; Huyền Thoại ×1,3 ; Dị Sắc ×1,1 */
export function statsOf(sp, lv, shiny = false) {
  const k = (sp.rare === 'huyen' ? 1.3 : 1) * (shiny ? 1.1 : 1), b = sp.base;
  const f = (x, hp) => Math.floor((Math.floor(x * 2 * lv / 100) + (hp ? lv + 10 : 5)) * k);
  return { hp: f(b[0], true), atk: f(b[1]), def: f(b[2]), spa: f(b[3]), spd: f(b[4]), spe: f(b[5]) };
}
export const STAGE = s => (s >= 0 ? (2 + s) / 2 : 2 / (2 - s));   /* bậc chỉ số −6…+6 như thể loại */
