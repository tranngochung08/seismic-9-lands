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
/* p100:moves:begin */
/* p100: dòng Chog (Mã) — 5 chiêu riêng mỗi dạng (dạng tiến hoá = chiêu nâng sức); cơ chế linhduel.js chgFire, VFX code pxfx_full.js ma_chg* */
Object.assign(MOVES, {
  tin_nong: M('tin_nong', 'Tin Nóng Lướt Tới', 'ma', 'vat', 60, 95, 4, 'can', { chg: 'tin_nong', prio: 1 }),
  bom_gai: M('bom_gai', 'Bờm Gai Nhiễu Sóng', 'ma', 'dac', 50, 100, 5, 'quanh', { chg: 'bom_gai' }),
  phong_van: M('phong_van', 'Phỏng Vấn Bất Ngờ', 'ma', 'tt', 0, 100, 9, 'dan', { chg: 'phong_van' }),
  cuoi_tit: M('cuoi_tit', 'Cười Tít Lách Mã', 'ma', 'tt', 0, 100, 11, 'minh', { chg: 'cuoi_tit', prio: 2 }),
  ban_tin: M('ban_tin', 'Bản Tin Lịch Sử', 'ma', 'dac', 125, 90, 18, 'vung', { chg: 'ban_tin', ult: true }),
  tin_nong2: M('tin_nong2', 'Tin Nóng Lướt Tới', 'ma', 'vat', 70, 95, 4, 'can', { chg: 'tin_nong', prio: 1 }),
  bom_gai2: M('bom_gai2', 'Bờm Gai Nhiễu Sóng', 'ma', 'dac', 55, 100, 5, 'quanh', { chg: 'bom_gai' }),
  phong_van2: M('phong_van2', 'Phỏng Vấn Bất Ngờ', 'ma', 'tt', 0, 100, 9, 'dan', { chg: 'phong_van' }),
  cuoi_tit2: M('cuoi_tit2', 'Cười Tít Lách Mã', 'ma', 'tt', 0, 100, 11, 'minh', { chg: 'cuoi_tit', prio: 2 }),
  ban_tin2: M('ban_tin2', 'Bản Tin Lịch Sử', 'ma', 'dac', 135, 90, 18, 'vung', { chg: 'ban_tin', ult: true }),
  tin_nong3: M('tin_nong3', 'Tin Nóng Lướt Tới', 'ma', 'vat', 80, 95, 4, 'can', { chg: 'tin_nong', prio: 1 }),
  bom_gai3: M('bom_gai3', 'Bờm Gai Nhiễu Sóng', 'ma', 'dac', 60, 100, 5, 'quanh', { chg: 'bom_gai' }),
  phong_van3: M('phong_van3', 'Phỏng Vấn Bất Ngờ', 'ma', 'tt', 0, 100, 9, 'dan', { chg: 'phong_van' }),
  cuoi_tit3: M('cuoi_tit3', 'Cười Tít Lách Mã', 'ma', 'tt', 0, 100, 11, 'minh', { chg: 'cuoi_tit', prio: 2 }),
  ban_tin3: M('ban_tin3', 'Bản Tin Lịch Sử', 'ma', 'dac', 145, 90, 18, 'vung', { chg: 'ban_tin', ult: true }),
});
/* p100:moves:end */
/* p99:moves:begin */
/* p99: dòng Moyaki (Triều) — 5 chiêu riêng mỗi dạng (dạng tiến hoá = chiêu nâng sức); cơ chế linhduel.js mykFire, VFX code pxfx_full.js trieu_myk* */
Object.assign(MOVES, {
  quay_vay: M('quay_vay', 'Quẫy Vây Lướt', 'trieu', 'vat', 65, 95, 4, 'can', { myk: 'quay_vay', prio: 1 }),
  bong_bong: M('bong_bong', 'Bong Bóng Trề Môi', 'trieu', 'dac', 55, 100, 3, 'dan', { myk: 'bong_bong' }),
  liec_mat: M('liec_mat', 'Liếc Khinh Khỉnh', 'trieu', 'tt', 0, 100, 9, 'quanh', { myk: 'liec_mat' }),
  nguoc_dong: M('nguoc_dong', 'Bơi Ngược Dòng', 'trieu', 'tt', 0, 100, 12, 'minh', { myk: 'nguoc_dong' }),
  vuot_thac: M('vuot_thac', 'Cá Chép Vượt Vũ Môn', 'trieu', 'dac', 130, 90, 18, 'vung', { myk: 'vuot_thac', ult: true }),
  quay_vay2: M('quay_vay2', 'Quẫy Vây Lướt', 'trieu', 'vat', 75, 95, 4, 'can', { myk: 'quay_vay', prio: 1 }),
  bong_bong2: M('bong_bong2', 'Bong Bóng Trề Môi', 'trieu', 'dac', 60, 100, 3, 'dan', { myk: 'bong_bong' }),
  liec_mat2: M('liec_mat2', 'Liếc Khinh Khỉnh', 'trieu', 'tt', 0, 100, 9, 'quanh', { myk: 'liec_mat' }),
  nguoc_dong2: M('nguoc_dong2', 'Bơi Ngược Dòng', 'trieu', 'tt', 0, 100, 12, 'minh', { myk: 'nguoc_dong' }),
  vuot_thac2: M('vuot_thac2', 'Cá Chép Vượt Vũ Môn', 'trieu', 'dac', 140, 90, 18, 'vung', { myk: 'vuot_thac', ult: true }),
  quay_vay3: M('quay_vay3', 'Quẫy Vây Lướt', 'trieu', 'vat', 85, 95, 4, 'can', { myk: 'quay_vay', prio: 1 }),
  bong_bong3: M('bong_bong3', 'Bong Bóng Trề Môi', 'trieu', 'dac', 65, 100, 3, 'dan', { myk: 'bong_bong' }),
  liec_mat3: M('liec_mat3', 'Liếc Khinh Khỉnh', 'trieu', 'tt', 0, 100, 9, 'quanh', { myk: 'liec_mat' }),
  nguoc_dong3: M('nguoc_dong3', 'Bơi Ngược Dòng', 'trieu', 'tt', 0, 100, 12, 'minh', { myk: 'nguoc_dong' }),
  vuot_thac3: M('vuot_thac3', 'Cá Chép Vượt Vũ Môn', 'trieu', 'dac', 150, 90, 18, 'vung', { myk: 'vuot_thac', ult: true }),
});
/* p99:moves:end */
/* p96:moves:begin */
/* p96: dòng Molandak (Chấn) — 5 chiêu riêng mỗi dạng (dạng tiến hoá = chiêu nâng sức); cơ chế linhduel.js mdkFire, VFX code pxfx_full.js chan_mdk* */
Object.assign(MOVES, {
  lan_gai: M('lan_gai', 'Lăn Gai Húc', 'chan', 'vat', 70, 95, 4, 'can', { mdk: 'lan_gai', prio: 1 }),
  ban_gai: M('ban_gai', 'Bắn Gai Quạt', 'chan', 'vat', 55, 100, 3, 'dan', { mdk: 'ban_gai' }),
  tre_moi: M('tre_moi', 'Trề Môi Khinh Khỉnh', 'chan', 'tt', 0, 100, 9, 'quanh', { mdk: 'tre_moi' }),
  cuon_thu: M('cuon_thu', 'Cuộn Gai Thủ', 'chan', 'tt', 0, 100, 10, 'minh', { mdk: 'cuon_thu', prio: 2 }),
  cau_gai: M('cau_gai', 'Cầu Gai Vượt Ải', 'chan', 'vat', 130, 90, 18, 'vung', { mdk: 'cau_gai', ult: true }),
  lan_gai2: M('lan_gai2', 'Lăn Gai Húc', 'chan', 'vat', 80, 95, 4, 'can', { mdk: 'lan_gai', prio: 1 }),
  ban_gai2: M('ban_gai2', 'Bắn Gai Quạt', 'chan', 'vat', 60, 100, 3, 'dan', { mdk: 'ban_gai' }),
  tre_moi2: M('tre_moi2', 'Trề Môi Khinh Khỉnh', 'chan', 'tt', 0, 100, 9, 'quanh', { mdk: 'tre_moi' }),
  cuon_thu2: M('cuon_thu2', 'Cuộn Gai Thủ', 'chan', 'tt', 0, 100, 10, 'minh', { mdk: 'cuon_thu', prio: 2 }),
  cau_gai2: M('cau_gai2', 'Cầu Gai Vượt Ải', 'chan', 'vat', 140, 90, 18, 'vung', { mdk: 'cau_gai', ult: true }),
  lan_gai3: M('lan_gai3', 'Lăn Gai Húc', 'chan', 'vat', 90, 95, 4, 'can', { mdk: 'lan_gai', prio: 1 }),
  ban_gai3: M('ban_gai3', 'Bắn Gai Quạt', 'chan', 'vat', 65, 100, 3, 'dan', { mdk: 'ban_gai' }),
  tre_moi3: M('tre_moi3', 'Trề Môi Khinh Khỉnh', 'chan', 'tt', 0, 100, 9, 'quanh', { mdk: 'tre_moi' }),
  cuon_thu3: M('cuon_thu3', 'Cuộn Gai Thủ', 'chan', 'tt', 0, 100, 10, 'minh', { mdk: 'cuon_thu', prio: 2 }),
  cau_gai3: M('cau_gai3', 'Cầu Gai Vượt Ải', 'chan', 'vat', 150, 90, 18, 'vung', { mdk: 'cau_gai', ult: true }),
});
/* p96:moves:end */
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
/* p96:species:begin */
  S('molandak', 'Molandak', ['chan'], [70, 85, 90, 45, 60, 55], ["lan_gai", "ban_gai", "tre_moi", "cuon_thu", "cau_gai"], {"size": "s", "evo": "molandak2", "evoLv": 20, "rare": "noi", "where": "M4"}),   /* p96 Chấn Thú từ mascot cộng đồng Monad (plan-94, anh duyệt 02/11): nhím gai tím mặt khinh khỉnh, bậc Nhỏ (cao 23 px ≈ 66 % người chơi), Hiếm (M4 ban ngày) */
  S('molandak2', 'Molandak Lão Luyện', ['chan'], [80, 98, 104, 52, 69, 63], ["lan_gai2", "ban_gai2", "tre_moi2", "cuon_thu2", "cau_gai2"], {"size": "m", "evo": "molandak3", "evoLv": 30}),   /* p96 tiến hoá 1 (Lv20): gai dài răng cưa, tai nghe Nads News — Bắn Gai 2 loạt, Trề Môi 40 % rối */
  S('molandak3', 'Molandak Vương', ['chan'], [92, 112, 118, 58, 78, 70], ["lan_gai3", "ban_gai3", "tre_moi3", "cuon_thu3", "cau_gai3"], {"size": "l"}),   /* p96 tiến hoá 2 (Lv30): giáp gai tím sẫm ánh ngọc, vuốt trắng to, vương miện nhỏ (tĩnh) — 2 loạt 7 kim, Trề Môi hạ cả công đặc biệt; cao ≤ người chơi */
/* p96:species:end */
/* p99:species:begin */
  S('moyaki', 'Moyaki', ['trieu'], [65, 60, 60, 80, 70, 75], ["quay_vay", "bong_bong", "liec_mat", "nguoc_dong", "vuot_thac"], {"size": "s", "evo": "moyaki2", "evoLv": 20, "rare": "noi", "where": "M1"}),   /* p99 Chấn Thú từ mascot cộng đồng Monad (plan-94 §8, anh duyệt 02/11): mèo-cá tím mặt khinh khỉnh, bậc Nhỏ (S cao 20 px ≈ 57 % người chơi), Hiếm (M1 ven nước ban ngày) */
  S('moyaki2', 'Moyaki Vượt Thác', ['trieu'], [76, 70, 70, 94, 82, 88], ["quay_vay2", "bong_bong2", "liec_mat2", "nguoc_dong2", "vuot_thac2"], {"size": "m", "evo": "moyaki3", "evoLv": 30}),   /* p99 tiến hoá 1 (Lv20): thân dài, vây buồm, vảy ánh bạc, đuôi chẻ dài — Bong Bóng thêm 10 % ướt, Bơi Ngược Dòng hồi 30 % */
  S('moyaki3', 'Moyaki Long Ngư', ['trieu'], [88, 80, 80, 108, 94, 100], ["quay_vay3", "bong_bong3", "liec_mat3", "nguoc_dong3", "vuot_thac3"], {"size": "l"}),   /* p99 tiến hoá 2 (Lv30): râu cá chép, sừng nhỏ cạnh tai, viền vảy vàng nhạt — 4 bóng, Liếc hạ cả chính xác; cao ≤ người chơi */
/* p99:species:end */
/* p100:species:begin */
  S('chog', 'Chog', ['ma'], [60, 50, 55, 85, 75, 85], ["tin_nong", "bom_gai", "phong_van", "cuoi_tit", "ban_tin"], {"size": "m", "evo": "chog2", "evoLv": 20, "rare": "noi", "where": "M6"}),   /* p100 Chấn Thú từ mascot cộng đồng Monad (plan-94 §9, anh duyệt 02/11): mặt trắng bờm gai tím đứng 2 chân, cao 35 px = người chơi, Hiếm (M6 giờ bản tin sáng 6–10 h) */
  S('chog2', 'Chog Phóng Viên', ['ma'], [70, 58, 64, 98, 86, 98], ["tin_nong2", "bom_gai2", "phong_van2", "cuoi_tit2", "ban_tin2"], {"size": "m", "evo": "chog3", "evoLv": 30}),   /* p100 tiến hoá 1 (Lv20): tai nghe Nads News, bờm dài hơn, cao ≈ 38 px — Phỏng Vấn thêm câu hỏi 2 (chính xác −1) */
  S('chog3', 'Chog Đại Mưu', ['ma'], [80, 66, 72, 112, 98, 110], ["tin_nong3", "bom_gai3", "phong_van3", "cuoi_tit3", "ban_tin3"], {"size": "l"}),   /* p100 tiến hoá 2 (Lv30): vương miện 5 gai, áo khoác tổng biên tập, kính một mắt, cao ≈ 42 px — 8 gai, màn bản tin to hơn */
/* p100:species:end */
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
/* p72:lt:begin */
/* ===== p72 (plan-51, anh duyệt 29/10): 11 LINH THÚ (+ 11 dạng tiến hoá) GỘP VÀO DANH MỤC CHẤN THÚ — giữ id cũ của save (coc, coc2…).
   · Hệ linh thú đổi sang 12 hệ: nuoc→trieu, lua→nham, moc→moc, dat→chan, set→loi, gio→phong, am→am, anh→quang, tam→tinh (bong→anh: chỉ trùm).
   · Bậc cỡ 'xs' = "Tí" (anh chốt §8): giữ cỡ ảnh hiện tại, bậc cỡ chỉ đổi tốc / né (TIER.xs trong linhduel.js).
   · Độ hiếm: Thường coc cachep tete de · Hiếm saola chuichui daibang tacke · Rất hiếm kylan hac kimquy.
   · Mở chiêu (§3): 2 chiêu khi bắt · chiêu 3 Lv10 · chiêu 4 Lv15 · tuyệt chiêu Lv20 (LT_UNLOCK). Thứ tự moves = 4 chiêu thường rồi tuyệt chiêu.
   · Chiêu ký hiệu A (chép số liệu chiêu gốc, đổi tên + VFX): khai ở đây với base = id chiêu gốc; cảnh VFX code riêng ở pxfx_full (lt_scenes). */
RARITY_NAME.rathiem = { vi: 'Rất Hiếm', en: 'Very Rare' };
const MA = (id, name, base, extra = {}) => { const b = MOVES[base]; return M(id, name, extra.type || b.type, extra.cat || b.cat, extra.pow ?? b.pow, extra.acc ?? b.acc, extra.cd ?? b.cd, extra.shape || b.shape, { ...(b.eff ? { eff: b.eff } : {}), ...(b.prio ? { prio: b.prio } : {}), ...(b.crit ? { crit: b.crit } : {}), ...extra, base }); };
Object.assign(MOVES, Object.fromEntries([
  MA('loc_lua', 'Lốc Lửa', 'loc_xoay', { type: 'nham', eff: { st: 'bong', p: 0.2 } }),   /* Kỳ Lân: phễu lửa xoay quanh đối thủ (cơ chế Lốc Xoáy: hút + 3 nhịp) */
  MA('cuon_lan', 'Cuộn Lăn', 'luot_dien', { type: 'chan', eff: { st: 'roi', p: 0.15 } }),   /* Tê Tê: cuộn tròn lăn xuyên qua đối thủ */
  MA('loc_cat', 'Lốc Cát', 'loc_xoay', { type: 'chan' }),   /* Tê Tê: phễu cát xoay quanh đối thủ (hút + 3 nhịp, rối) */
  MA('giap_chan', 'Chấn Khiên', 'giap_tinh', { type: 'chan' }),   /* Tê Tê: vảy đá dựng thành khiên (phòng +2) */
  /* các loài còn lại (S5…S13) — số liệu khai trước, cơ chế + cảnh làm theo từng loài; N = cơ chế mới (ghi ở linhduel khối p72) */
  MA('luoi_dinh', 'Lưỡi Dính', 'roi_re', { type: 'trieu', pow: 60, n: 1 }),   /* Cóc N: lưỡi bắn ra dính đối thủ, kéo về sát mình */
  MA('dap_vung', 'Dập Vũng', 'dam_chan', { type: 'trieu', pow: 65, n: 1 }),   /* Cóc N: nhảy cong tới cạnh đối thủ, dập tạo vũng nước toé vòng */
  MA('thuy_phao', 'Thuỷ Pháo', 'trieu_dang', { shape: 'tia' }),   /* Cóc tuyệt chiêu: cột nước từ miệng */
  MA('voi_xoay', 'Vòi Xoáy', 'thuy_cham', { pow: 60 }),   /* Cá Chép: vòi nước xoáy */
  MA('vu_mon', 'Vũ Môn', 'bo_nhao', { type: 'trieu' }),   /* Cá Chép: vọt cột nước lao bổ tới rồi về */
  MA('gay_rung', 'Gáy Rung', 'song_am', {}),   /* Dế */
  MA('hoa_am', 'Hoà Âm', 'dam_chan', { type: 'am', cat: 'dac', pow: 65 }),   /* Dế: 3 vòng âm địa chấn quanh mình */
  MA('huc_sung', 'Húc Sừng Lá', 'lao', { type: 'moc', pow: 80, cd: 4 }),   /* Sao La */
  MA('nem_dia_chan', 'Ném Địa Chấn', 'bo_nhao', { type: 'phong', pow: 90, cd: 6, n: 1 }),   /* Đại Bàng N: quắp đối thủ bay lên rồi ném xuống đất */
  MA('phan_than', 'Phân Thân', 'lan_bong', { type: 'quang', n: 1 }),   /* Tắc Kè N: 2 bóng gương đánh lạc hướng (đòn trúng bóng thì trượt) */
  MA('lang_kinh', 'Lăng Kính', 'khuc_xa', { type: 'quang' }),   /* Tắc Kè */
  MA('mo_set', 'Mổ Sét', 'luot_dien', { pow: 70, cd: 3.5 }),   /* Hạc */
  MA('mua_da_lo', 'Mưa Đá Lở', 'gai_bang', { type: 'chan', pow: 70, eff: { st: 'roi', p: 0.15 } }),   /* Chuột Chũi: đá thạch anh rơi xuống chỗ đối thủ (cơ chế Cột Băng Rơi) */
  MA('cau_tam', 'Cầu Tâm Lực', 'cau_trang', { type: 'tinh' }),   /* Kim Quy */
  MA('than_luc', 'Thần Lực', 'mua_kim_cuong', { n: 1 }),   /* Kim Quy N tuyệt chiêu: nâng đối thủ lên không rồi thả rơi */
].map(m => [m.id, m])));
const LTF = (id, lt, evo, name, types, base, moves, rarity, extra = {}) => S(id, name, types, base, moves, { size: 'xs', lt, evo2: evo, rarity, ...extra });
/* plan-90 (anh 02/11): 6 chiêu ROCKY golem (loài 'rocky') — cơ chế ngoài map + VFX code ở rktk.js; trong trận dùng khung chung theo shape */
Object.assign(MOVES, Object.fromEntries([
  M('rk_fist', 'Nắm Đấm Đá Bay', 'chan', 'vat', 70, 100, 2.5, 'dan'),
  M('rk_quake', 'Địa Chấn Khối', 'chan', 'vat', 80, 100, 7, 'quanh', { eff: { st: 'te', p: 0.25 } }),
  M('rk_storm', 'Tách Khối Bão Đá', 'chan', 'vat', 75, 95, 12, 'vung'),
  M('rk_shield', 'Khiên Ngực Seismic', 'tinh', 'tt', 0, 100, 14, 'minh', { eff: { protect: 2.5 }, prio: 2 }),
  M('rk_dash', 'Lao Thạch Cự', 'chan', 'vat', 85, 100, 8, 'can', { prio: 1 }),
  M('rk_ult', 'Nắm Đấm Đá Khổng Lồ', 'chan', 'vat', 140, 95, 22, 'vung', { ult: true }),
].map(m => [m.id, m])));
const LT_LIST = [
  LTF('kylan', 'kylan', 0, 'Kỳ Lân Lửa', ['nham'], [65, 75, 60, 80, 60, 75], ['phun_than', 'loc_lua', 'lao_lua', 'troi_nang', 'nui_lua'], 'rathiem', { evo: 'kylan2' }),
  LTF('kylan2', 'kylan', 1, 'Lân Hoàng', ['nham'], [85, 95, 75, 105, 80, 90], ['phun_than', 'loc_lua', 'lao_lua', 'troi_nang', 'nui_lua'], 'rathiem'),
  LTF('tete', 'tete', 0, 'Tê Tê Cát', ['chan'], [65, 75, 90, 40, 60, 45], ['cuon_lan', 'loc_cat', 'dam_chan', 'giap_chan', 'dai_dia_chan'], 'thuong', { evo: 'tete2' }),
  LTF('tete2', 'tete', 1, 'Tê Tê Giáp Đá', ['chan'], [85, 100, 115, 50, 75, 55], ['cuon_lan', 'loc_cat', 'dam_chan', 'giap_chan', 'dai_dia_chan'], 'thuong'),
  LTF('hac', 'hac', 0, 'Hạc Sấm', ['loi'], [60, 70, 55, 85, 60, 85], ['mo_set', 'loi_cau', 'xung_vong', 'tich_dien', 'set_troi'], 'rathiem', { evo: 'hac2' }),
  LTF('hac2', 'hac', 1, 'Hạc Thiên Lôi', ['loi'], [80, 85, 70, 110, 80, 100], ['mo_set', 'loi_cau', 'xung_vong', 'tich_dien', 'set_troi'], 'rathiem'),
  LTF('saola', 'saola', 0, 'Sao La Ngọc', ['moc'], [70, 80, 65, 60, 65, 70], ['huc_sung', 'roi_re', 'hut_nhua', 'bao_tu', 'rung_troi'], 'hiem', { evo: 'saola2' }),
  LTF('saola2', 'saola', 1, 'Sao La Thần Rừng', ['moc'], [90, 105, 80, 80, 85, 85], ['huc_sung', 'roi_re', 'hut_nhua', 'bao_tu', 'rung_troi'], 'hiem'),
  LTF('daibang', 'daibang', 0, 'Đại Bàng Vực', ['phong'], [60, 85, 55, 60, 55, 95], ['bo_nhao', 'nem_dia_chan', 'luoi_gio', 'gio_xuoi', 'bao_loc'], 'hiem', { evo: 'daibang2' }),
  LTF('daibang2', 'daibang', 1, 'Đại Bàng Bão Tố', ['phong'], [80, 110, 70, 75, 70, 110], ['bo_nhao', 'nem_dia_chan', 'luoi_gio', 'gio_xuoi', 'bao_loc'], 'hiem'),
  LTF('de', 'de', 0, 'Dế Mèn Chấn', ['am'], [50, 60, 50, 75, 55, 85], ['gay_rung', 'hoa_am', 'dap_am', 'hu_vang', 'cong_huong'], 'thuong', { evo: 'de2' }),
  LTF('de2', 'de', 1, 'Dế Chúa Đồng', ['am'], [70, 75, 65, 100, 70, 100], ['gay_rung', 'hoa_am', 'dap_am', 'hu_vang', 'cong_huong'], 'thuong'),
  LTF('tacke', 'tacke', 0, 'Tắc Kè Gương', ['quang'], [55, 60, 55, 80, 65, 85], ['phan_than', 'lang_kinh', 'tia_sang', 'chan_quang', 'phan_quyet'], 'hiem', { evo: 'tacke2' }),
  LTF('tacke2', 'tacke', 1, 'Tắc Kè Lăng Kính', ['quang'], [70, 75, 70, 105, 85, 100], ['phan_than', 'lang_kinh', 'tia_sang', 'chan_quang', 'phan_quyet'], 'hiem'),
  LTF('kimquy', 'kimquy', 0, 'Kim Quy', ['tinh'], [85, 50, 95, 80, 90, 40], ['cau_tam', 'khuc_xa', 'giap_tinh', 'manh_pha_le', 'than_luc'], 'rathiem', { evo: 'kimquy2' }),
  LTF('kimquy2', 'kimquy', 1, 'Kim Quy Hộ Quốc', ['tinh'], [110, 60, 120, 105, 115, 50], ['cau_tam', 'khuc_xa', 'giap_tinh', 'manh_pha_le', 'than_luc'], 'rathiem'),
  LTF('chuichui', 'chuichui', 0, 'Chuột Chũi Thạch Anh', ['chan'], [60, 80, 70, 50, 55, 60], ['don_tho', 'mua_da_lo', 'nut_dat', 'manh_pha_le', 'dai_dia_chan'], 'hiem', { evo: 'chuichui2' }),
  LTF('chuichui2', 'chuichui', 1, 'Chũi Vương Pha Lê', ['chan'], [80, 105, 90, 70, 70, 70], ['don_tho', 'mua_da_lo', 'nut_dat', 'manh_pha_le', 'dai_dia_chan'], 'hiem'),
  LTF('cachep', 'cachep', 0, 'Cá Chép Vũ Môn', ['trieu'], [55, 50, 55, 70, 65, 80], ['voi_xoay', 'vu_mon', 'song_cuon', 'bong_giam', 'trieu_dang'], 'thuong', { evo: 'cachep2' }),
  LTF('cachep2', 'cachep', 1, 'Long Ngư', ['trieu'], [75, 70, 70, 95, 80, 95], ['voi_xoay', 'vu_mon', 'song_cuon', 'bong_giam', 'trieu_dang'], 'thuong'),
  LTF('coc', 'coc', 0, 'Cóc Gọi Mưa', ['trieu'], [60, 55, 55, 70, 60, 55], ['luoi_dinh', 'dap_vung', 'goi_mua', 'bong_giam', 'thuy_phao'], 'thuong', { evo: 'coc2' }),
  LTF('coc2', 'coc', 1, 'Cóc Thần Vũ', ['trieu'], [80, 70, 70, 95, 80, 65], ['luoi_dinh', 'dap_vung', 'goi_mua', 'bong_giam', 'thuy_phao'], 'thuong'),
  LTF('rocky', 'rocky', 0, 'Rocky', ['chan'], [95, 120, 120, 60, 85, 60], ['rk_fist', 'rk_quake', 'rk_storm', 'rk_shield', 'rk_dash', 'rk_ult'], 'rathiem', { size: 'l' }),   /* plan-90: golem đá = ROCKY (anh 02/11) */
];
for (const s of LT_LIST) SPECIES[s.id] = s;
export const LT_SPECIES = LT_LIST.map(s => s.id);
/* dạng đã có ảnh đấu (duel_sprites.json) — loài chưa có thì thẻ Ấn Linh ghi 'Chưa đấu được' và không vào đội trận */
export const LT_READY = new Set(['kylan', 'kylan2', 'tete', 'tete2', 'hac', 'saola', 'saola2', 'daibang', 'de', 'de2', 'tacke', 'tacke2', 'kimquy', 'chuichui', 'chuichui2', 'cachep', 'coc', 'hac2', 'daibang2', 'kimquy2', 'cachep2', 'coc2', 'rocky']);
export const LT_UNLOCK = lv => (lv >= 20 ? 5 : lv >= 15 ? 4 : lv >= 10 ? 3 : 2);
export const LT_FORM = (id, evo) => id + (evo ? '2' : '');
export const TYPE_EN = { chan: 'Quake', nham: 'Magma', trieu: 'Tide', loi: 'Thunder', phong: 'Wind', moc: 'Wood', suong: 'Frost', tinh: 'Crystal', ma: 'Code', am: 'Sound', anh: 'Shadow', quang: 'Light' };
export const SIZE_NAME = { xs: { vi: 'Tí', en: 'Tiny' }, s: { vi: 'Nhỏ', en: 'Small' }, m: { vi: 'Vừa', en: 'Medium' }, l: { vi: 'To', en: 'Large' } };
/* p72:lt:end */
/* p73:moves:begin */
/* ===== p73 (01/11/2026, anh duyệt "theo ý em"): 8 CHIÊU ĐỘC LẠ ★ — tên / số liệu / cơ chế của Seismic (chieumoi/plan.md). Chiêu mới THAY 1 chiêu thường của loài,
   giữ đúng ô (mốc mở chiêu Lv10 / Lv15 của linh thú không đổi; save chỉ lưu loài + cấp nên không vỡ). Cơ chế + VFX code: systems/chieu73.js. */
Object.assign(MOVES, Object.fromEntries([
  M('vong_du_chan', 'Vòng Dư Chấn', 'chan', 'vat', 80, 100, 6, 'vung', { n: 1, p73: 1 }),   /* tâm chấn dưới chân đối thủ → 1,2 s sau vòng sóng đất 0 → 90 px; thú bay miễn */
  M('bay_lo_than', 'Bẫy Lò Than', 'nham', 'tt', 0, 90, 10, 'dan', { n: 1, p73: 1 }),   /* ngậm than 4 s: ra chiêu → nổ 12 % máu tối đa, huỷ chiêu, 30 % bỏng */
  M('doi_dong', 'Đổi Dòng', 'trieu', 'dac', 40, 100, 8, 'doi', { n: 1, p73: 1 }),   /* 2 cột nước → đổi chỗ, đối thủ ƯỚT 3 s (tốc −1 bậc) */
  M('hinh_nhan_la', 'Hình Nhân Lá', 'moc', 'tt', 0, 100, 14, 'minh', { n: 1, p73: 1 }),   /* trả 20 % máu → hình nhân 24 % máu hút đòn 5 s */
  M('hoan_tac', 'Hoàn Tác', 'ma', 'tt', 0, 100, 14, 'minh', { n: 1, p73: 1 }),   /* lưu điểm → 3 s sau về đúng chỗ, hồi 60 % máu đã mất (trần 25 %) */
  M('khuc_tan_canh', 'Khúc Tàn Canh', 'am', 'tt', 0, 100, 16, 'quanh', { n: 1, p73: 1 }),   /* đếm 3 nhịp: ai còn trong 110 px mất máu cố định (đối thủ 28 %, Dế 18 %) */
  M('rinh_so_ho', 'Rình Sơ Hở', 'anh', 'vat', 90, 100, 6, 'can', { n: 1, p73: 1 }),   /* thế rình 1 s: đối thủ bắt đầu chiêu → hiện sau lưng cắn + huỷ chiêu */
  M('guong_hoi_quang', 'Gương Hồi Quang', 'quang', 'tt', 0, 100, 9, 'minh', { n: 1, p73: 1, prio: 2 }),   /* gương 0,8 s: đạn bật về người bắn, tia / sóng đất ×0,5 */
].map(m => [m.id, m])));
/* linh thú: đổi đúng ô trong bộ chiêu (LOAD của linh thú lấy từ SPECIES.moves) */
export const P73_SWAP = { chuichui: ['nut_dat', 'vong_du_chan'], chuichui2: ['nut_dat', 'vong_du_chan'], cachep: ['song_cuon', 'doi_dong'], cachep2: ['song_cuon', 'doi_dong'],
  de: ['hu_vang', 'khuc_tan_canh'], de2: ['hu_vang', 'khuc_tan_canh'], tacke: ['lang_kinh', 'guong_hoi_quang'], tacke2: ['lang_kinh', 'guong_hoi_quang'],
  rongdo: ['lao_lua', 'bay_lo_than'], hoahung: ['lao_lua', 'bay_lo_than'], diepnhan: ['bao_la', 'hinh_nhan_la'], bovimach: ['tuong_lua', 'hoan_tac'], culibong: ['lan_bong', 'rinh_so_ho'] };
for (const [sp, [o, n]] of Object.entries(P73_SWAP)) { const s = SPECIES[sp]; if (s) { const i = s.moves.indexOf(o); if (i >= 0) s.moves[i] = n; } }
/* p73:moves:end */
/* p74:en:begin */
/* p74 (anh Hùng 01/11): tên tiếng Anh cho MỌI Chấn Thú / linh thú khi lang=en — tên nguyên bản (không dùng tên Pokémon); linh thú theo đúng tên en đã có ở linhthu.js. Bảng vi↔en: _wip/p74/_gen/touch-p74.md */
export const SPECIES_EN = { utchan: 'Thudlet', golem: 'Quake Golem', rongdo: 'Crimson Wyrm', bachkinh: 'Pale Whale', loiho: 'Volt Fox', vitbao: 'Storm Duck', diepnhan: 'Leaf Ninja', tuyetky: 'Snow Qilin',
  tinhmieu: 'Crystal Cat', cuoitho: 'Giggle Hare', bovimach: 'Chip Beetle', culibong: 'Shade Loris', macuu: 'Cipher Dove', hacgiac: 'Shadowhorn', hoahung: 'Blaze Bear', nguuson: 'Mountain Ox', banhbao: 'Holy Bun',
  dinhchan: 'Peakquake', thanhong: 'Emberling', hoagiap: 'Magma Shell', botboi: 'Bubblet', trieudang: 'Tide Lantern', daydi: 'Sparkwire', cotloi: 'Thunder Pillar', maybong: 'Cotton Cloud', locvuong: 'Gale King',
  namlac: 'Wobble Shroom', rungmang: 'Mossback', dongchau: 'Frost Pearl', bangthap: 'Ice Spire', langkinh: 'Prismlet', tinhhoang: 'Crystal Queen', bitbit: 'Bitbit', matmaxa: 'Cipher Serpent', kenken: 'Tootle',
  loavuong: 'Blare King', bongle: 'Lone Shade', dadang: 'Night Lamp', domsang: 'Glowbug', thienkinh: 'Sky Mirror', tamchan: 'Epicenter', nhatthuc: 'Eclipse', haitam: 'Sea Heart', loigoc: 'Root Glitch',
  kylan: 'Fire Qilin', kylan2: 'Qilin Emperor', tete: 'Sand Pangolin', tete2: 'Stone-Plate Pangolin', hac: 'Thunder Crane', hac2: 'Heaven-Bolt Crane', saola: 'Jade Saola', saola2: 'Forest God Saola',
  daibang: 'Canyon Eagle', daibang2: 'Storm Eagle', de: 'Quake Cricket', de2: 'Bronze King Cricket', tacke: 'Mirror Gecko', tacke2: 'Prism Gecko', kimquy: 'Golden Turtle', kimquy2: 'Guardian Golden Turtle',
  chuichui: 'Amethyst Mole', chuichui2: 'Crystal Mole King', cachep: 'Dragon-Gate Carp', cachep2: 'Dragon Carp', coc: 'Rain-Call Toad', coc2: 'Rain God Toad' };
export const MOVE_NAME_EN = {};   /* tên chiêu tiếng Anh (linhduel đổ MOVE_EN vào lúc nạp) — thẻ Ấn Linh / Tiềm Năng dùng chung */
/* p96:en:begin */
/* p96: tên tiếng Anh dòng Molandak */
Object.assign(SPECIES_EN, {"molandak": "Molandak", "molandak2": "Veteran Molandak", "molandak3": "Molandak King"});
for (const sp of ["molandak", "molandak2", "molandak3"]) if (SPECIES[sp]) SPECIES[sp].rarity = 'hiem';   /* p96: cả dòng Molandak là Hiếm (độ lực VFX theo độ hiếm) */
/* p96:en:end */
/* p99:en:begin */
/* p99: tên tiếng Anh dòng Moyaki */
Object.assign(SPECIES_EN, {"moyaki": "Moyaki", "moyaki2": "Rapids Moyaki", "moyaki3": "Dragonfin Moyaki"});
/* p99:en:end */
/* p100:en:begin */
/* p100: tên tiếng Anh dòng Chog */
Object.assign(SPECIES_EN, {"chog": "Chog", "chog2": "Reporter Chog", "chog3": "Mastermind Chog"});
/* p100:en:end */
export const spNameL = (en, sp) => (en && SPECIES_EN[sp]) || (SPECIES[sp] ? SPECIES[sp].name : sp);
/* p74:en:end */
/* p78:moves:begin */
/* ===== p78 (plan-78 đợt MẪU, anh duyệt 01/11): KHO CHIÊU — hệ Chấn (4 mới + Địa Từ Độc Lạ) + nhóm Chung 4 chiêu. Tên / số liệu của Seismic (chỉ học cơ chế).
   Cơ chế + AI trong trận: systems/chieu78.js · VFX vẽ code: systems/fx78.js (nét riêng từng loài) · Sắp Chiêu / học chiêu / Rocky: systems/kho78.js.
   Chung: không cộng cùng hệ (Lăn Xả noStab) — loài nào cũng học được, mỗi loài ≤ 2. */
Object.assign(MOVES, Object.fromEntries([
  M('da_vun_ban', 'Đá Vụn Bắn', 'chan', 'vat', 18, 95, 3, 'dan', { p78: 1, hits: [2, 5] }),   /* Bắn · nhiều nhịp: 2–5 viên × 18 */
  M('dao_ham_vo', 'Đào Hầm Vồ', 'chan', 'vat', 85, 100, 7, 'can', { p78: 1 }),   /* Gần · nửa ẩn: chui 1 s (chỉ chiêu vùng đất trúng, ×2) → trồi cắn */
  M('cat_lun', 'Cát Lún', 'chan', 'tt', 0, 100, 12, 'vung', { p78: 1 }),   /* Trạng thái · bẫy sân: 3 vũng 10 s, bước vào tốc −1 + mắc 0,6 s */
  M('son_bang', 'Sơn Băng', 'chan', 'vat', 135, 90, 18, 'tia', { p78: 1, ult: true }),   /* Tuyệt chiêu · tự hạ: 135 đường thẳng xuyên hàng, sau đòn phòng −2 trong 6 s */
  M('dia_tu', 'Địa Từ', 'chan', 'tt', 0, 100, 14, 'quanh', { p78: 1, odd: 1 }),   /* Độc Lạ · đổi sân: thú bay bị kéo xuống, lướt ×0,6, Chấn của chủ ×1,15 */
  M('thu_the', 'Thủ Thế', 'chan', 'tt', 0, 100, 6, 'minh', { p78: 1, chung: 1, prio: 3 }),   /* Chung · Ra trước · khiên: 0,7 s chặn 1 đòn, dùng liền lần 2 chỉ 50 % */
  M('gong_chiu', 'Gồng Chịu', 'chan', 'tt', 0, 100, 10, 'minh', { p78: 1, chung: 1 }),   /* Chung · Hỗ trợ: 2 s, đòn chí tử để lại 1 máu (1 lần / trận) */
  M('ngu_bu', 'Ngủ Bù', 'chan', 'tt', 0, 100, 20, 'minh', { p78: 1, chung: 1 }),   /* Chung · Hỗ trợ: ngủ 2,5 s, hồi 50 % + xoá trạng thái */
  M('lan_xa', 'Lăn Xả', 'chan', 'vat', 100, 100, 6, 'can', { p78: 1, chung: 1, noStab: 1 }),   /* Chung · Gần · giật lùi: 100, tự mất 25 % sát thương gây ra */
].map(m => [m.id, m])));
export const MOVE_EN78 = { da_vun_ban: 'Rubble Volley', dao_ham_vo: 'Burrow Pounce', cat_lun: 'Quicksand', son_bang: 'Avalanche Break', dia_tu: 'Lodestone Field', thu_the: 'Guard Stance', gong_chiu: 'Brace Up', ngu_bu: 'Catnap', lan_xa: 'Reckless Roll' };
export const P78_CHUNG = ['thu_the', 'gong_chiu', 'ngu_bu', 'lan_xa'];
/* KHO HỌC CHIÊU — [cấp, id]. Linh thú (Chũi, Tê Tê) giữ đúng LT_UNLOCK cho 5 ô đầu (bắt 2 · Lv10 · Lv15 · Lv20 tuyệt chiêu) → không ai mất chiêu.
   Khác hệ hợp sinh học: Ngưu Sơn Gầm Doạ (bò rống) · Thạch Chấn Vương Khiên Tinh (đá kết tinh). Chũi lấy lại Gai Đá Trồi (bị p73 thay). */
const LC = [[1, 'don_tho'], [1, 'mua_da_lo'], [10, 'vong_du_chan'], [12, 'thu_the'], [15, 'manh_pha_le'], [20, 'dai_dia_chan'], [25, 'dao_ham_vo'], [28, 'nut_dat'], [30, 'da_vun_ban']];
const LT = [[1, 'cuon_lan'], [1, 'loc_cat'], [10, 'dam_chan'], [15, 'giap_chan'], [18, 'gong_chiu'], [20, 'dai_dia_chan'], [25, 'cat_lun'], [30, 'dao_ham_vo'], [35, 'lan_xa']];
const LG = [[1, 'dam_chan'], [1, 'nut_dat'], [5, 'nem_da'], [10, 'don_tho'], [15, 'cot_da'], [20, 'dai_dia_chan'], [22, 'da_vun_ban'], [25, 'dia_tu'], [30, 'giap_tinh'], [33, 'ngu_bu'], [40, 'son_bang']];
export const LEARN = { chuichui: LC, chuichui2: LC, tete: LT, tete2: LT, golem: LG, utchan: LG, dinhchan: LG.concat([[12, 'bao_cat']]).sort((a, b) => a[0] - b[0]),
  nguuson: [[1, 'nut_dat'], [1, 'nem_da'], [5, 'dam_chan'], [10, 'don_tho'], [15, 'nguu_xung'], [20, 'dai_dia_chan'], [25, 'dia_tu'], [30, 'gam'], [35, 'lan_xa'], [40, 'son_bang']] };
export function learnedOf(sp, lv) { const L = LEARN[sp]; if (!L) return []; const out = []; for (const [l, id] of L) if (l <= (lv | 0) && MOVES[id] && !out.includes(id)) out.push(id); return out; }
const FAR78 = { dan: 1, tia: 1, vung: 1, lob: 1, hang: 1 };
export function autoLoad(sp, lv) {   /* plan-78 §6: ≥ 2 chiêu sát thương khác dạng (gần / xa) + ≥ 1 chiêu không sát thương, ưu tiên chiêu học sau (mạnh hơn) */
  const L = learnedOf(sp, lv), ults = L.filter(id => MOVES[id].ult), rest = L.filter(id => !MOVES[id].ult).reverse(), pick = [], add = id => { if (id && !pick.includes(id) && pick.length < 4) pick.push(id); };
  const dmg = id => MOVES[id].pow > 0, far = id => !!FAR78[MOVES[id].shape];
  add(rest.find(id => dmg(id) && far(id))); add(rest.find(id => dmg(id) && !far(id))); add(rest.find(id => !dmg(id))); for (const id of rest) add(id);
  return { mv: pick, ult: ults.length ? ults[ults.length - 1] : null };
}
export function cleanLoad(sp, lv, mv, ult) {   /* chiêu chưa học / id lạ trong save → bỏ qua (không treo) */
  const L = learnedOf(sp, lv), m = [...new Set(Array.isArray(mv) ? mv : [])].filter(id => L.includes(id) && MOVES[id] && !MOVES[id].ult).slice(0, 4);
  if (!m.length) return null; return { mv: m, ult: ult && L.includes(ult) && MOVES[ult] && MOVES[ult].ult ? ult : null };
}
export function loadFor(sp, lv, e, side) {   /* bộ của 1 con trong trận: save có mv → dùng; thú hoang / đối thủ / link thử (auto78) → máy tự xếp; còn lại → null (bộ cũ LOAD) */
  if (!LEARN[sp]) return null;
  if (e && Array.isArray(e.mv)) { const c = cleanLoad(sp, lv, e.mv, e.ult); if (c) return c.mv.concat(c.ult ? [c.ult] : []); }
  if (side === 1 || (e && e.auto78)) { const a = autoLoad(sp, lv); return a.mv.length ? a.mv.concat(a.ult ? [a.ult] : []) : null; }
  return null;
}
/* p78:moves:end */
SPECIES_EN.rocky = 'Rocky';   /* plan-90 */

/* p95:species:begin — Elyziuma (plan-95): Chấn Thú Huyền Thoại hệ Mã + Triều, chỉ số đề xuất, ẩn khỏi danh sách (secret) tới khi có bộ trận.
   Ngoài map dùng hệ đi theo riêng elyz95.js (5 chiêu đánh nhiều mục tiêu). Chưa có sprite trận (duel_sprites) → linhduel tự bỏ qua trong đội (LOAD thiếu). */
SPECIES.elyziuma = { id: 'elyziuma', name: 'Elyziuma', types: ['ma', 'trieu'], base: [115, 85, 100, 120, 105, 60], moves: ['nhieu_song', 'ma_hoa', 'song_cuon', 'sap_he'], rare: 'huyen', size: 'm', passive: 'hoi_dong', secret: true, rarity: 'huyen' };
/* p95:species:end */
/* p97:species:begin */
/* ===== p97 (plan-93, 02/11/2026): Chấn Thú ẾCH OA LÌ — mascot ếch áo xanh anh gửi; tên / hệ / mắt liếc THEO ĐỀ XUẤT plan-93 (anh có thể đổi).
   Hệ Triều · bậc Vừa (ĐỨNG 2 CHÂN → cao bằng người chơi 35 px, luật anh chốt 02/11) · Hiếm theo nơi: ao / đầm khi trời MƯA (chanthu.js RARE rain).
   Tiến hoá 2 nấc bằng Tiềm Năng: Lv16 → Oa Lì Phố (mũ đỏ quay ngược + khăn đỏ, thân ×1,04) · Lv32 → Lão Oa Đại Ca (mũ phớt, kính đen, áo khoác, tẩu; Triều + Âm, bậc To, thân ×1,09).
   Cơ chế + AI: systems/chieu97.js (bọc chieu78) · VFX vẽ code: systems/fx97.js · đồ vật trong chiêu (kính, cốc) PixelLab: assets/px/linhduel/oali_items.png. */
Object.assign(MOVES, Object.fromEntries([
  M('bot_op', 'Bọt Ộp', 'trieu', 'dac', 50, 100, 2, 'dan', { prio: 1, p78: 1, p97: 1 }),   /* phồng má → 3 bong bóng nối đuôi (Oa Lì Phố 5), mỗi quả 42 % (5 quả: 30 %) */
  M('bung_phe', 'Bụng Phệ Đè', 'trieu', 'vat', 85, 95, 5, 'can', { p78: 1, p97: 1 }),   /* CHIÊU LAO TỚI (plan-84): nhảy vồng ≤ 130 px, đáp bụng → NGÃ 0,6 s; hụt nằm sấp 0,7 s */
  M('kinh_den', 'Kính Đen Lì Đòn', 'trieu', 'tt', 0, 100, 12, 'minh', { p78: 1, p97: 1 }),   /* 3 s: nhận ×0,5 sát thương, bật lại viên đạn đầu tiên về người bắn */
  M('coc_lu', 'Cốc Lũ Vô Đáy', 'trieu', 'dac', 130, 90, 18, 'quanh', { ult: true, p78: 1, p97: 1 }),   /* tuyệt chiêu: cốc to nghiêng đổ → tường sóng 175 px, cuốn + hất bay */
  M('luoi_keo', 'Lưỡi Kéo Về', 'trieu', 'vat', 80, 95, 9, 'tia', { sig: 'oali', p78: 1, p97: 1 }),   /* chiêu riêng: lưỡi từ MIỆNG ≤ 128 px, dính → giật về sát người → tát hất văng */
  M('vong_khoi', 'Vòng Khói Tẩu', 'am', 'dac', 60, 95, 6, 'dan', { p78: 1, p97: 1 }),   /* Lão Oa Đại Ca: 2 vòng khói chậm, tốc −1 + chính xác −1 */
].map(m => [m.id, m])));
export const MOVE_EN97 = { bot_op: 'Croak Bubbles', bung_phe: 'Belly Flop', kinh_den: 'Cool Shades', coc_lu: 'Bottomless Mug Flood', luoi_keo: 'Tongue Yank', vong_khoi: 'Pipe Rings' };
Object.assign(SPECIES, Object.fromEntries([
  S('oali', 'Oa Lì', ['trieu'], [80, 70, 75, 75, 70, 55], ['bot_op', 'bung_phe', 'kinh_den', 'luoi_keo', 'coc_lu'], { evo: 'oalipho', evoLv: 16, size: 'm', rare: 'noi', where: 'ao đầm khi mưa', rarity: 'hiem' }),
  S('oalipho', 'Oa Lì Phố', ['trieu'], [92, 84, 86, 88, 80, 66], ['bot_op', 'bung_phe', 'kinh_den', 'luoi_keo', 'coc_lu'], { evo: 'laooa', evoLv: 32, size: 'm', rarity: 'hiem' }),
  S('laooa', 'Lão Oa Đại Ca', ['trieu', 'am'], [105, 96, 100, 104, 92, 70], ['bot_op', 'bung_phe', 'kinh_den', 'vong_khoi', 'coc_lu'], { size: 'l', rarity: 'hiem' }),
].map(s => [s.id, s])));
Object.assign(SPECIES_EN, { oali: 'Croaksmug', oalipho: 'Street Croak', laooa: 'Don Croak' });
Object.assign(MOVE_NAME_EN, MOVE_EN97);
/* p97:species:end */
