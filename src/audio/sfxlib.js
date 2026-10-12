// audio/sfxlib.js — thư viện tiếng động (công thức cho audio/dsp.js). Tên cũ (hit, chop, pickup, coin, craft, build, squeak, roar, splash, alarm, fail, win) giữ nguyên, tiếng mới hay hơn.
// Mỗi mục: [nhóm, nhãn tiếng Việt, công thức]. Công thức = { v: [giọng…], vary (lệch cao độ khi phát), seeds (số bản khác nhau), rev (vang), vol }.
// Giọng: w sóng (sq/tri/sin/saw/noise/pn/brown/pink), f→f2 (hoặc fr = tỉ lệ), a/h/d giây, v âm lượng, lp/hp/bp lọc (+lp2… quét), lq/bq cộng hưởng, vib [Hz, nửa cung], am [Hz, sâu], t trễ, grains/span/dens hạt.

/* ---- khối dựng lặp lại ---- */
const sxNote = (f, t, d, v, w = 'sq', o = {}) => ({ w, duty: 0.25, f, t, a: 0.002, d, v, lp: 4200, ...o });
const sxSplash = (t = 0, k = 1) => [
  { w: 'noise', t, a: 0.002, d: 0.22 * k, v: 0.24, bp: 1500, bp2: 3000, bq: 0.9 },
  { w: 'sin', t: t + 0.01, f: 420, f2: 950, a: 0.002, d: 0.07, v: 0.14 },
  { grains: 4, t: t + 0.05, span: 0.2 * k, w: 'sin', f: [700, 1600], fr: 1.5, a: 0.001, d: [0.02, 0.04], v: [0.04, 0.07] }];
const sxBubbles = (t, n, lo = 250, hi = 700, v = [0.05, 0.1], span = 0.6) => ({ grains: n, t, span, w: 'sin', f: [lo, hi], fr: [1.6, 2.4], a: 0.002, d: [0.03, 0.07], v });
const sxSparkle = (t, n = 5, span = 0.4, v = [0.03, 0.06]) => ({ grains: n, t, span, w: 'sin', f: [1800, 3600], a: 0.001, d: [0.05, 0.14], v });
const sxKnock = (t, f = 220, v = 0.3) => [
  { w: 'tri', t, f, f2: f * 0.72, a: 0.001, d: 0.08, v },
  { w: 'noise', t, a: 0.001, d: 0.03, v: v * 0.6, bp: 1500, bq: 1.5 },
  { w: 'sin', t, f: f * 0.45, f2: f * 0.32, a: 0.001, d: 0.06, v: v * 0.5 }];
const sxCrumble = (t, n, span, lo = 600, hi = 2400, v = [0.06, 0.14]) => ({ grains: n, t, span, dens: 1.4, w: 'noise', a: 0.001, d: [0.015, 0.05], v, bp: [lo, hi], bq: 1.2 });
const sxChirp = (t, f, k = 1.45, v = 0.14, d = 0.07) => ({ w: 'sin', t, f, fr: k, sl: d * 0.8, a: 0.003, d, v, vib: [30, 0.35] });

export const SFX_GROUPS = [
  ['step', 'Bước chân'], ['farm', 'Nông trại'], ['gather', 'Chặt · đào · hái'], ['water', 'Nước · câu cá · bè'], ['fight', 'Đánh nhau · quái'],
  ['magic', 'Hóa đá · phép'], ['item', 'Đồ vật · đá Seismic · mua bán'], ['ui', 'Giao diện'], ['event', 'Sự kiện · ngày đêm'], ['pet', 'Rocky · thú'], ['story', 'Trùm · cốt truyện']];

export const SFX_LIB = {
  /* ================= BƯỚC CHÂN (rất nhỏ, mỗi bước hơi khác) ================= */
  step_grass: ['step', 'Bước trên cỏ', R => ({ seeds: 4, vary: 0.06, v: [
    { w: 'noise', a: 0.004, d: 0.07, v: 0.2, bp: 2400 + R() * 900, bq: 0.9 },
    { w: 'noise', t: 0.012, a: 0.003, d: 0.05, v: 0.1, bp: 4200, bq: 1.2 },
    { w: 'sin', f: 90, f2: 70, a: 0.002, d: 0.03, v: 0.05 }] })],
  step_dirt: ['step', 'Bước trên đất / đất cày', R => ({ seeds: 4, vary: 0.06, v: [
    { w: 'noise', a: 0.002, d: 0.06, v: 0.21, lp: 900 + R() * 300, lq: 0.8 },
    { w: 'sin', f: 110 + R() * 20, f2: 70, a: 0.002, d: 0.05, v: 0.11 },
    { grains: 2, t: 0.01, span: 0.03, w: 'noise', a: 0.001, d: [0.006, 0.012], v: [0.03, 0.05], bp: [1500, 2600], bq: 1.5 }] })],
  step_stone: ['step', 'Bước trên đá / đường lát', R => ({ seeds: 4, vary: 0.05, v: [
    { w: 'noise', a: 0.001, d: 0.028, v: 0.2, bp: 2200 + R() * 700, bq: 2 },
    { w: 'tri', f: 420 + R() * 70, f2: 300, a: 0.001, d: 0.035, v: 0.09 },
    { w: 'noise', a: 0.002, d: 0.05, v: 0.12, lp: 600 }] })],
  step_sand: ['step', 'Bước trên cát', R => ({ seeds: 4, vary: 0.06, v: [
    { w: 'noise', a: 0.018, d: 0.09, v: 0.18, bp: 3000 + R() * 900, bq: 0.7 },
    { w: 'noise', a: 0.006, d: 0.06, v: 0.1, lp: 650 }] })],
  step_gravel: ['step', 'Bước trên sỏi', R => ({ seeds: 4, vary: 0.05, v: [
    { grains: 5, span: 0.05, w: 'noise', a: 0.001, d: [0.008, 0.02], v: [0.1, 0.19], bp: [1300, 2600], bq: 1.5 },
    { w: 'noise', a: 0.004, d: 0.06, v: 0.1, lp: 900 }] })],
  step_snow: ['step', 'Bước trên tuyết', R => ({ seeds: 4, vary: 0.05, v: [
    { grains: 6, span: 0.07, w: 'noise', a: 0.001, d: [0.008, 0.02], v: [0.08, 0.16], bp: [1800, 3200], bq: 1.5 },
    { w: 'noise', a: 0.012, d: 0.08, v: 0.09, lp: 1300 }] })],
  step_wood: ['step', 'Bước trên cầu gỗ / bến', R => ({ seeds: 4, vary: 0.05, v: [
    { w: 'tri', f: 185 + R() * 25, f2: 140, a: 0.001, d: 0.08, v: 0.16 },
    { w: 'noise', a: 0.001, d: 0.03, v: 0.1, bp: 1100, bq: 1.5 },
    { w: 'sin', f: 95, f2: 80, a: 0.001, d: 0.06, v: 0.09 }] })],
  step_water: ['step', 'Lội nước nông', R => ({ seeds: 4, vary: 0.07, v: [
    { w: 'noise', a: 0.006, d: 0.12, v: 0.2, bp: 1300 + R() * 600, bp2: 2600, bq: 1.2 },
    { w: 'sin', t: 0.02, f: 500 + R() * 200, fr: 1.7, a: 0.003, d: 0.06, v: 0.08 }] })],

  /* ================= NÔNG TRẠI ================= */
  till: ['farm', 'Cuốc đất (cày)', R => ({ seeds: 3, vary: 0.05, v: [
    { w: 'noise', a: 0.04, d: 0.04, v: 0.06, bp: 800, bp2: 2000, bq: 1.5 },
    { w: 'sin', t: 0.07, f: 120, f2: 55, a: 0.002, d: 0.11, v: 0.34 },
    { w: 'noise', t: 0.07, a: 0.002, d: 0.1, v: 0.26, lp: 1100, lp2: 400 },
    sxCrumble(0.09, 4, 0.08, 1500, 3000, [0.04, 0.08])] })],
  sow: ['farm', 'Gieo hạt', { seeds: 3, vary: 0.06, v: [
    { w: 'noise', a: 0.01, d: 0.06, v: 0.06, bp: 2500 },
    { grains: 4, t: 0.04, span: 0.15, w: 'sin', f: [2400, 3600], a: 0.001, d: [0.01, 0.025], v: [0.04, 0.07] },
    { w: 'sin', t: 0.02, f: 150, f2: 90, a: 0.002, d: 0.05, v: 0.12 }] }],
  water: ['farm', 'Tưới nước', { seeds: 3, vary: 0.05, v: [
    { w: 'noise', a: 0.05, h: 0.22, d: 0.18, v: 0.12, bp: 2600, bq: 0.9, am: [14, 0.5] },
    { grains: 6, t: 0.05, span: 0.4, w: 'sin', f: [900, 1800], fr: 1.4, a: 0.001, d: [0.02, 0.04], v: [0.03, 0.06] }] }],
  bucket_fill: ['farm', 'Múc đầy xô nước', { seeds: 2, vary: 0.04, v: [
    { w: 'noise', a: 0.05, h: 0.28, d: 0.15, v: 0.12, bp: 600, bp2: 1800, bq: 1.5, am: [18, 0.4] },
    sxBubbles(0.02, 7, 300, 700, [0.06, 0.1], 0.45)] }],
  harvest: ['farm', 'Thu hoạch', { seeds: 3, vary: 0.04, rev: 0.12, v: [
    { w: 'sin', f: 260, f2: 820, sl: 0.05, a: 0.002, d: 0.08, v: 0.26 },
    { w: 'noise', a: 0.01, d: 0.12, v: 0.08, bp: 3500, bq: 0.8 },
    sxNote(1319, 0.09, 0.18, 0.1, 'tri', { lp: 0 }), sxNote(1760, 0.15, 0.26, 0.09, 'tri', { lp: 0 })] }],
  pull: ['farm', 'Nhổ cây / cỏ', { seeds: 3, vary: 0.06, v: [
    { w: 'noise', a: 0.02, d: 0.12, v: 0.13, bp: 2200, bq: 0.8 },
    { w: 'sin', t: 0.08, f: 200, f2: 620, a: 0.002, d: 0.06, v: 0.2 }] }],
  place: ['farm', 'Đặt đồ xuống', { seeds: 2, vary: 0.05, v: [
    { w: 'sin', f: 150, f2: 80, a: 0.002, d: 0.08, v: 0.3 },
    { w: 'noise', a: 0.001, d: 0.04, v: 0.13, lp: 1200 }] }],

  /* ================= CHẶT · ĐÀO · HÁI ================= */
  chop: ['gather', 'Bổ rìu vào gỗ', R => ({ seeds: 3, vary: 0.05, v: [
    { w: 'noise', a: 0.0005, d: 0.025, v: 0.22, bp: 2200, bq: 1.2 },
    { w: 'tri', f: 210 + R() * 30, f2: 150, a: 0.001, d: 0.11, v: 0.26 },
    { w: 'noise', a: 0.001, d: 0.09, v: 0.15, bp: 650, bq: 2.5 },
    { w: 'sin', f: 90, f2: 60, a: 0.001, d: 0.07, v: 0.15 }] })],
  leaves: ['gather', 'Lá xào xạc', { seeds: 3, vary: 0.05, v: [
    { w: 'noise', a: 0.06, h: 0.08, d: 0.3, v: 0.06, bp: 3800, bq: 0.7, am: [11, 0.6] },
    { grains: 5, span: 0.4, w: 'noise', a: 0.005, d: [0.02, 0.05], v: [0.025, 0.05], bp: [2500, 5000], bq: 1.5 }] }],
  tree_fall: ['gather', 'Cây đổ', { seeds: 2, vary: 0.04, rev: 0.12, v: [
    { w: 'saw', f: 95, f2: 70, a: 0.05, h: 0.3, d: 0.15, v: 0.09, bp: 500, bq: 4, vib: [7, 0.6] },
    { w: 'noise', t: 0.2, a: 0.3, d: 0.22, v: 0.1, bp: 600, bp2: 2400, bq: 0.8 },
    { w: 'sin', t: 0.62, f: 75, f2: 38, a: 0.003, d: 0.35, v: 0.45 },
    { w: 'noise', t: 0.62, a: 0.003, d: 0.4, v: 0.26, lp: 900, lp2: 200 },
    { grains: 6, t: 0.66, span: 0.3, w: 'noise', a: 0.002, d: [0.02, 0.06], v: [0.04, 0.08], bp: [2000, 4000] }] }],
  mine: ['gather', 'Cuốc chim vào đá', R => ({ seeds: 3, vary: 0.05, v: [
    { w: 'sq', f: 1900 + R() * 300, a: 0.0005, d: 0.06, v: 0.06, lp: 6000 },
    { w: 'sin', f: 2850 + R() * 200, a: 0.0005, d: 0.1, v: 0.07 },
    { w: 'noise', a: 0.0005, d: 0.05, v: 0.24, bp: 2600, bq: 1 },
    { w: 'noise', a: 0.001, d: 0.1, v: 0.12, lp: 700 },
    { w: 'tri', f: 160, f2: 110, a: 0.001, d: 0.06, v: 0.14 }] })],
  rock_hit: ['gather', 'Đá vụn văng', { seeds: 3, vary: 0.06, v: [
    { w: 'noise', a: 0.001, d: 0.08, v: 0.24, bp: 1600, bq: 0.9 },
    { w: 'sin', f: 140, f2: 80, a: 0.001, d: 0.07, v: 0.2 },
    sxCrumble(0.02, 4, 0.12)] }],
  rock_break: ['gather', 'Đá vỡ vụn', { seeds: 2, vary: 0.05, v: [
    { w: 'noise', a: 0.001, d: 0.25, v: 0.3, lp: 1800, lp2: 300 },
    { w: 'sin', f: 90, f2: 45, a: 0.002, d: 0.2, v: 0.32 },
    sxCrumble(0, 8, 0.35)] }],
  dig: ['gather', 'Xúc đất (xẻng)', { seeds: 3, vary: 0.06, v: [
    { w: 'noise', a: 0.02, d: 0.12, v: 0.15, bp: 1500, bp2: 700, bq: 1.2 },
    { w: 'sin', t: 0.05, f: 100, f2: 60, a: 0.002, d: 0.09, v: 0.28 },
    sxCrumble(0.08, 4, 0.1, 1200, 2500, [0.05, 0.09])] }],
  dirt: ['gather', 'Đất bung nhẹ', { seeds: 3, vary: 0.07, v: [
    { w: 'noise', a: 0.003, d: 0.09, v: 0.19, lp: 1000, lp2: 400 },
    sxCrumble(0.01, 3, 0.08, 1200, 2500, [0.03, 0.06])] }],
  pond_dig: ['gather', 'Đào ao (đất bung, nước trào)', { seeds: 2, vary: 0.04, v: [
    { w: 'noise', a: 0.02, d: 0.12, v: 0.15, bp: 1500, bp2: 700, bq: 1.2 },
    { w: 'sin', t: 0.05, f: 100, f2: 60, a: 0.002, d: 0.09, v: 0.28 },
    { w: 'noise', t: 0.26, a: 0.03, d: 0.3, v: 0.12, bp: 900, bp2: 1800, bq: 1.2, am: [16, 0.5] },
    sxBubbles(0.3, 5, 350, 800, [0.06, 0.1], 0.3)] }],
  pick_berry: ['gather', 'Hái quả / nấm', { seeds: 3, vary: 0.05, v: [
    { w: 'noise', a: 0.01, d: 0.08, v: 0.08, bp: 3000 },
    { w: 'sin', t: 0.03, f: 500, f2: 1200, a: 0.001, d: 0.05, v: 0.18 },
    { w: 'sin', t: 0.12, f: 600, f2: 1400, a: 0.001, d: 0.05, v: 0.14 }] }],
  cut_leaf: ['gather', 'Cắt lá / lấy nhựa (dao)', { seeds: 3, vary: 0.05, v: [
    { w: 'noise', a: 0.008, d: 0.08, v: 0.16, hp: 2500, bp: 5000, bq: 0.8 },
    { w: 'noise', t: 0.05, a: 0.05, d: 0.2, v: 0.05, bp: 3800, bq: 0.7, am: [11, 0.6] }] }],
  ice_crack: ['gather', 'Đập băng', { seeds: 2, vary: 0.05, rev: 0.1, v: [
    { w: 'noise', a: 0.0005, d: 0.04, v: 0.16, hp: 3000 },
    { grains: 6, span: 0.15, w: 'sin', f: [2500, 5000], a: 0.0005, d: [0.03, 0.08], v: [0.03, 0.06] },
    { w: 'sin', f: 180, f2: 100, a: 0.001, d: 0.08, v: 0.15 }] }],
  sand_scoop: ['gather', 'Xúc cát', { seeds: 2, vary: 0.05, v: [
    { w: 'noise', a: 0.03, d: 0.15, v: 0.15, bp: 3000, bp2: 1800, bq: 0.6 },
    { w: 'noise', a: 0.01, d: 0.08, v: 0.08, lp: 600 }] }],
  lava_scoop: ['gather', 'Múc dung nham (xèo xèo)', { seeds: 2, vary: 0.04, v: [
    { w: 'noise', a: 0.01, h: 0.15, d: 0.3, v: 0.1, hp: 3500 },
    { grains: 4, span: 0.3, w: 'sin', f: [150, 300], fr: 1.6, a: 0.002, d: [0.04, 0.08], v: [0.1, 0.15] }] }],
  honey: ['gather', 'Lấy mật ong', { seeds: 2, vary: 0.04, v: [
    { w: 'sin', f: 300, f2: 180, a: 0.01, d: 0.15, v: 0.18, vib: [18, 0.8] },
    { w: 'noise', a: 0.01, d: 0.1, v: 0.05, lp: 900 },
    { grains: 3, t: 0.1, span: 0.2, w: 'sin', f: [600, 900], fr: 0.8, a: 0.004, d: [0.04, 0.06], v: [0.05, 0.08] }] }],

  /* ================= NƯỚC · CÂU CÁ · BÈ ================= */
  splash_small: ['water', 'Bõm nhỏ', { seeds: 4, vary: 0.07, v: sxSplash(0, 1) }],
  splash_big: ['water', 'Bõm lớn', { seeds: 2, vary: 0.05, rev: 0.1, v: [
    { w: 'noise', a: 0.004, d: 0.6, v: 0.3, lp: 3000, lp2: 600 },
    { w: 'sin', f: 110, f2: 55, a: 0.004, d: 0.25, v: 0.3 },
    { w: 'noise', a: 0.01, d: 0.4, v: 0.12, bp: 2500, bq: 0.7 },
    { grains: 8, t: 0.1, span: 0.5, dens: 1.4, w: 'sin', f: [500, 1400], fr: 1.6, a: 0.001, d: [0.02, 0.05], v: [0.04, 0.08] }] }],
  cast: ['water', 'Quăng cần câu', { seeds: 2, vary: 0.04, v: [
    { w: 'noise', a: 0.06, d: 0.12, v: 0.12, bp: 700, bp2: 3200, bq: 1.5 },
    { w: 'sq', t: 0.08, f: 2800, rep: 0.03, reps: 7, a: 0.001, d: 0.008, v: 0.025, lp: 6000 },
    { w: 'sin', t: 0.5, f: 620, f2: 300, a: 0.001, d: 0.08, v: 0.16 },
    { w: 'noise', t: 0.5, a: 0.002, d: 0.12, v: 0.1, bp: 1800, bq: 1 }] }],
  bite: ['water', 'Cá cắn phao', { seeds: 2, vary: 0.03, v: [
    { w: 'sin', f: 900, f2: 400, a: 0.001, d: 0.08, v: 0.2 },
    { w: 'noise', a: 0.002, d: 0.12, v: 0.1, bp: 1600 },
    { w: 'sin', t: 0.13, f: 900, f2: 420, a: 0.001, d: 0.06, v: 0.13 }] }],
  hook: ['water', 'Giật cần', { seeds: 2, vary: 0.04, v: [
    { w: 'noise', a: 0.01, d: 0.08, v: 0.13, bp: 1200, bp2: 4000, bq: 2 },
    { w: 'sq', f: 600, f2: 1200, a: 0.001, d: 0.06, v: 0.07, lp: 3000 },
    ...sxSplash(0.04, 0.6)] }],
  reel: ['water', 'Tiếng quay cuộn dây (mỗi lần kéo)', { seeds: 3, vary: 0.03, v: [
    { w: 'sq', duty: 0.25, f: 2200, a: 0.0005, d: 0.012, v: 0.06, lp: 6000 },
    { w: 'sq', duty: 0.25, t: 0.035, f: 2350, a: 0.0005, d: 0.012, v: 0.05, lp: 6000 },
    { w: 'noise', a: 0.0005, d: 0.01, v: 0.04, bp: 4000, bq: 2 }] }],
  catch: ['water', 'Câu được cá', { seeds: 2, vary: 0.02, rev: 0.12, v: [
    ...sxSplash(0, 1.2),
    sxNote(784, 0.12, 0.1, 0.11), sxNote(988, 0.2, 0.1, 0.11), sxNote(1319, 0.28, 0.32, 0.12, 'sq', { h: 0.05 })] }],
  catch_rare: ['water', 'Câu được cá hiếm', { seeds: 1, vary: 0, rev: 0.2, v: [
    ...sxSplash(0, 1.2),
    sxNote(784, 0.12, 0.09, 0.1), sxNote(988, 0.19, 0.09, 0.1), sxNote(1175, 0.26, 0.09, 0.1), sxNote(1568, 0.33, 0.45, 0.12, 'sq', { h: 0.08 }),
    sxSparkle(0.33, 8, 0.6)] }],
  line_snap: ['water', 'Đứt dây câu', { seeds: 2, vary: 0.03, v: [
    { w: 'saw', f: 1400, f2: 180, sl: 0.25, a: 0.0005, d: 0.3, v: 0.1, lp: 3500, lp2: 800 },
    { w: 'noise', a: 0.0005, d: 0.04, v: 0.2, hp: 2500 },
    { w: 'sin', t: 0.05, f: 300, f2: 150, a: 0.002, d: 0.2, v: 0.1 }] }],
  fish_escape: ['water', 'Cá sổng mất', { seeds: 2, vary: 0.03, v: [
    ...sxSplash(0, 0.8),
    sxNote(523, 0.14, 0.12, 0.12, 'tri', { lp: 0 }), sxNote(392, 0.26, 0.22, 0.12, 'tri', { lp: 0 })] }],
  paddle: ['water', 'Chèo bè', R => ({ seeds: 4, vary: 0.08, v: [
    { w: 'noise', a: 0.08, d: 0.25, v: 0.14, lp: 900, lp2: 500 },
    { w: 'noise', a: 0.05, d: 0.2, v: 0.05, bp: 1400 + R() * 300, bq: 1 },
    sxBubbles(0.15, 3, 300, 600, [0.025, 0.045], 0.15)] })],
  swim: ['water', 'Sải tay bơi', { seeds: 4, vary: 0.08, v: [
    { w: 'noise', a: 0.07, d: 0.2, v: 0.14, lp: 1100, lp2: 600 },
    { w: 'noise', a: 0.03, d: 0.15, v: 0.06, bp: 2000, bq: 1 }] }],
  dive: ['water', 'Lặn xuống', { seeds: 1, vary: 0.02, rev: 0.15, v: [
    { w: 'noise', a: 0.004, d: 0.4, v: 0.3, lp: 3000, lp2: 500 },
    { w: 'sin', f: 110, f2: 50, a: 0.004, d: 0.25, v: 0.28 },
    { w: 'noise', t: 0.25, a: 0.15, d: 0.6, v: 0.12, lp: 500, lp2: 200 },
    sxBubbles(0.3, 7, 200, 500, [0.05, 0.08], 0.7)] }],
  surface: ['water', 'Trồi lên mặt nước', { seeds: 1, vary: 0.02, v: [
    sxBubbles(0, 6, 300, 700, [0.05, 0.08], 0.3),
    { w: 'noise', t: 0.25, a: 0.003, d: 0.2, v: 0.18, bp: 1800, bp2: 3200 },
    { w: 'noise', t: 0.3, a: 0.05, d: 0.25, v: 0.05, bp: 1500, bq: 0.5 }] }],
  bubbles: ['water', 'Bong bóng nước', R => ({ seeds: 4, vary: 0.05, v: [sxBubbles(0, 4 + Math.round(R() * 3), 250, 700)] })],
  drip: ['water', 'Giọt nước rơi (trong hầm)', { seeds: 4, vary: 0.12, rev: 0.45, v: [
    { w: 'sin', f: 900, f2: 1800, sl: 0.03, a: 0.001, d: 0.06, v: 0.1 }] }],
  whirl: ['water', 'Bị xoáy nước cuốn', { seeds: 1, vary: 0.02, v: [
    { w: 'noise', a: 0.2, h: 0.3, d: 0.5, v: 0.16, bp: 400, bp2: 1200, bq: 2, am: [4, 0.5] },
    sxBubbles(0.2, 6, 200, 500, [0.04, 0.07], 0.6)] }],

  /* ================= ĐÁNH NHAU · QUÁI ================= */
  swing: ['fight', 'Vung kiếm', { seeds: 3, vary: 0.06, v: [
    { w: 'noise', a: 0.03, d: 0.1, v: 0.18, bp: 500, bp2: 2800, bq: 1.8 },
    { w: 'noise', a: 0.02, d: 0.08, v: 0.05, hp: 4000 }] }],
  hit: ['fight', 'Va chạm (chung)', { seeds: 3, vary: 0.06, v: [
    { w: 'noise', a: 0.0008, d: 0.05, v: 0.18, bp: 1800, bq: 0.9 },
    { w: 'sin', f: 160, f2: 70, a: 0.001, d: 0.1, v: 0.22 },
    { w: 'tri', f: 300, f2: 160, a: 0.001, d: 0.05, v: 0.1 }] }],
  sword_hit: ['fight', 'Kiếm chém trúng', { seeds: 3, vary: 0.06, v: [
    { w: 'noise', a: 0.0005, d: 0.05, v: 0.28, hp: 1500, bp: 3000, bq: 0.8 },
    { w: 'sq', f: 260, f2: 90, a: 0.001, d: 0.09, v: 0.15, lp: 1800 },
    { w: 'sin', f: 1800, a: 0.001, d: 0.12, v: 0.05 },
    { w: 'noise', a: 0.001, d: 0.08, v: 0.15, lp: 700 }] }],
  crit: ['fight', 'Đòn chí mạng', { seeds: 2, vary: 0.04, rev: 0.1, v: [
    { w: 'noise', a: 0.0005, d: 0.07, v: 0.3, hp: 1500, bp: 3000, bq: 0.8 },
    { w: 'sq', f: 300, f2: 70, a: 0.001, d: 0.14, v: 0.17, lp: 1800 },
    { w: 'sin', f: 70, f2: 40, a: 0.001, d: 0.2, v: 0.32 },
    { w: 'sin', t: 0.02, f: 1568, a: 0.001, d: 0.3, v: 0.08 }, { w: 'sin', t: 0.02, f: 2349, a: 0.001, d: 0.25, v: 0.05 }] }],
  /* 2026-10-11 spar.js — trận tập với bạn tập */
  spar_bell: ['fight', 'Chuông vào trận tập (2 tiếng)', { seeds: 1, vary: 0, rev: 0.3, v: [
    { w: 'sin', f: 1320, a: 0.001, d: 0.7, v: 0.11 }, { w: 'sin', f: 3310, a: 0.001, d: 0.3, v: 0.03 },
    { w: 'sin', t: 0.2, f: 1320, a: 0.001, d: 0.9, v: 0.1 }, { w: 'sin', t: 0.2, f: 3310, a: 0.001, d: 0.35, v: 0.03 }] }],
  spar_charge: ['fight', 'Bạn tập lấy đà (báo trước đòn)', { seeds: 2, vary: 0.05, v: [
    { w: 'tri', f: 180, f2: 420, a: 0.03, d: 0.45, v: 0.08 }, { w: 'noise', a: 0.1, d: 0.3, v: 0.05, bp: 500, bp2: 1400, bq: 2 }] }],
  spar_thud: ['fight', 'Đòn bạn tập giáng xuống đất', { seeds: 3, vary: 0.06, v: [
    { w: 'sin', f: 110, f2: 42, a: 0.001, d: 0.28, v: 0.3 }, { w: 'noise', a: 0.001, d: 0.12, v: 0.18, lp: 900 }] }],
  spar_whoosh: ['fight', 'Bạn tập lao / quất (vút)', { seeds: 3, vary: 0.06, v: [
    { w: 'noise', a: 0.04, d: 0.2, v: 0.2, bp: 500, bp2: 2600, bq: 1.6 }, { w: 'sin', f: 220, f2: 120, a: 0.01, d: 0.15, v: 0.06 }] }],
  punch_light: ['fight', 'Cú đấm nhẹ (jab) trúng', { seeds: 3, vary: 0.07, v: [
    { w: 'noise', a: 0.0005, d: 0.04, v: 0.2, bp: 1200, bq: 1 }, { w: 'sin', f: 190, f2: 90, a: 0.001, d: 0.07, v: 0.18 }] }],
  punch_heavy: ['fight', 'Cú đấm nặng (móc) trúng — bịch trầm', { seeds: 2, vary: 0.05, rev: 0.08, v: [
    { w: 'noise', a: 0.0005, d: 0.09, v: 0.3, lp: 1600 }, { w: 'sin', f: 120, f2: 38, a: 0.001, d: 0.3, v: 0.38 },
    { w: 'sq', f: 160, f2: 60, a: 0.001, d: 0.12, v: 0.1, lp: 900 }] }],
  knock_whoosh: ['fight', 'Bị đánh bay (vút gió)', { seeds: 2, vary: 0.05, v: [
    { w: 'noise', a: 0.02, d: 0.35, v: 0.22, bp: 300, bp2: 2200, bq: 1.4 }, { w: 'sin', f: 260, f2: 520, a: 0.01, d: 0.25, v: 0.05 }] }],
  knock_land: ['fight', 'Rơi bịch xuống đất', { seeds: 3, vary: 0.06, v: [
    { w: 'sin', f: 95, f2: 40, a: 0.001, d: 0.25, v: 0.34 }, { w: 'noise', a: 0.001, d: 0.14, v: 0.2, lp: 700 }] }],
  knock_wall: ['fight', 'Đập vào tường', { seeds: 2, vary: 0.05, rev: 0.06, v: [
    { w: 'noise', a: 0.0005, d: 0.1, v: 0.3, lp: 1400 }, { w: 'sin', f: 140, f2: 55, a: 0.001, d: 0.22, v: 0.3 }, { w: 'tri', f: 420, f2: 200, a: 0.001, d: 0.06, v: 0.06 }] }],
  spar_crow: ['fight', 'Mào Gà gáy (ò ó o — kiểu gà trống, giọng khàn)', { seeds: 1, vary: 0.03, rev: 0.15, v: [
    { w: 'sq', duty: 0.25, f: 520, f2: 780, a: 0.01, d: 0.12, v: 0.12, lp: 2600 },
    { w: 'sq', duty: 0.25, t: 0.13, f: 820, f2: 980, a: 0.01, d: 0.14, v: 0.13, lp: 2800 },
    { w: 'sq', duty: 0.3, t: 0.3, f: 1040, f2: 620, a: 0.02, d: 0.5, v: 0.13, lp: 2600, vib: [9, 0.35] },
    { w: 'noise', t: 0.3, a: 0.02, d: 0.45, v: 0.05, bp: 1400, bq: 2 }] }],
  spar_grunt: ['fight', 'Bạn tập rặn sức (hự!) khi nhấc / quật', { seeds: 2, vary: 0.06, v: [
    { w: 'sq', duty: 0.3, f: 180, f2: 120, a: 0.01, d: 0.22, v: 0.14, lp: 900, vib: [18, 0.4] }, { w: 'noise', a: 0.01, d: 0.18, v: 0.08, bp: 500, bq: 1.5 }] }],
  spar_roar: ['fight', 'Gầm biến hình (bò quỷ)', { seeds: 2, vary: 0.04, v: [
    { w: 'saw', a: 0.06, d: 0.9, v: 0.22, f: 95, f2: 60, lp: 900, vib: [7, 0.5] }, { w: 'noise', a: 0.05, d: 0.8, v: 0.2, bp: 380, bp2: 220, bq: 1.2 }, { w: 'sq', a: 0.08, d: 0.7, v: 0.07, f: 140, f2: 80, lp: 700 }] }],
  spar_whipcrack: ['fight', 'Ria quất (vút + tách roi)', { seeds: 2, vary: 0.05, v: [
    { w: 'noise', a: 0.03, d: 0.16, v: 0.16, bp: 700, bp2: 3200, bq: 1.6 }, { w: 'noise', t: 0.15, a: 0.0005, d: 0.04, v: 0.32, hp: 2500 }, { w: 'sq', t: 0.15, f: 1900, f2: 900, a: 0.0005, d: 0.05, v: 0.06, lp: 5000 }] }],
  spar_bow: ['fight', 'Kết thúc trận tập (cúi chào)', { seeds: 1, vary: 0, rev: 0.2, v: [
    sxNote(659, 0, 0.14, 0.1, 'tri', { lp: 0 }), sxNote(523, 0.13, 0.32, 0.1, 'tri', { lp: 0 })] }],
  hurt: ['fight', 'Người chơi bị đánh', { seeds: 3, vary: 0.05, v: [
    { w: 'sq', f: 420, f2: 200, a: 0.002, d: 0.14, v: 0.12, lp: 1600, vib: [30, 0.5] },
    { w: 'noise', a: 0.001, d: 0.06, v: 0.17, lp: 1500 },
    { w: 'sin', f: 120, f2: 60, a: 0.002, d: 0.1, v: 0.2 }] }],
  faint: ['fight', 'Ngất xỉu', { seeds: 1, vary: 0, rev: 0.2, v: [
    sxNote(523, 0, 0.18, 0.16, 'tri', { lp: 0 }), sxNote(440, 0.16, 0.18, 0.16, 'tri', { lp: 0 }), sxNote(349, 0.32, 0.18, 0.16, 'tri', { lp: 0 }),
    sxNote(262, 0.48, 0.55, 0.17, 'tri', { lp: 0, vib: [5, 0.3] }),
    { w: 'sin', t: 0.5, f: 80, f2: 40, a: 0.005, d: 0.3, v: 0.24 }, { w: 'noise', t: 0.5, a: 0.003, d: 0.2, v: 0.1, lp: 500 }] }],
  eat: ['fight', 'Ăn (hồi máu)', { seeds: 2, vary: 0.05, v: [
    ...[0, 0.13, 0.26].map(t => ({ w: 'noise', t, a: 0.001, d: 0.05, v: 0.15, bp: 1500, bq: 1.2 })),
    ...[0, 0.13, 0.26].map(t => ({ w: 'sin', t, f: 140, f2: 90, a: 0.001, d: 0.04, v: 0.12 })),
    sxNote(880, 0.4, 0.08, 0.09, 'tri', { lp: 0 }), sxNote(1175, 0.47, 0.16, 0.09, 'tri', { lp: 0 })] }],
  heal: ['fight', 'Hồi phục', { seeds: 1, vary: 0, rev: 0.25, v: [
    { w: 'sin', f: 660, f2: 1320, sl: 0.4, a: 0.05, d: 0.4, v: 0.1, vib: [6, 0.2] },
    sxSparkle(0.05, 5, 0.4)] }],
  growl_small: ['fight', 'Quái nhỏ gầm gừ', { seeds: 3, vary: 0.08, v: [
    { w: 'saw', f: 300, f2: 230, a: 0.02, d: 0.25, v: 0.1, lp: 1400, am: [28, 0.7] },
    { w: 'noise', a: 0.02, d: 0.15, v: 0.03, bp: 1200 }] }],
  roar: ['fight', 'Quái gầm (vừa)', { seeds: 2, vary: 0.06, rev: 0.1, v: [
    { w: 'saw', f: 110, f2: 85, a: 0.06, h: 0.2, d: 0.35, v: 0.13, lp: 900, lq: 1.5, am: [24, 0.6] },
    { w: 'saw', f: 112.5, f2: 86, a: 0.06, h: 0.2, d: 0.35, v: 0.09, lp: 700, am: [19, 0.5] },
    { w: 'noise', a: 0.08, h: 0.15, d: 0.3, v: 0.08, lp: 700 }] }],
  roar_big: ['fight', 'Trùm gầm (lớn)', { seeds: 1, vary: 0.03, rev: 0.2, v: [
    { w: 'saw', f: 70, f2: 52, a: 0.1, h: 0.4, d: 0.6, v: 0.15, lp: 700, lq: 1.8, am: [20, 0.6] },
    { w: 'saw', f: 71.5, f2: 53, a: 0.1, h: 0.4, d: 0.6, v: 0.1, lp: 500, am: [15, 0.5] },
    { w: 'brown', a: 0.1, h: 0.4, d: 0.6, v: 0.25, lp: 300 },
    { w: 'noise', a: 0.12, h: 0.3, d: 0.5, v: 0.07, bp: 700, bq: 1.2 }] }],
  poof: ['fight', 'Quái tan biến (chung)', { seeds: 2, vary: 0.05, v: [
    { w: 'noise', a: 0.005, d: 0.25, v: 0.15, bp: 1200, bp2: 400, bq: 0.8 },
    { w: 'sin', f: 600, f2: 200, a: 0.003, d: 0.2, v: 0.1 },
    sxSparkle(0.15, 4, 0.2)] }],
  mon_hurt_blob: ['fight', 'Nhầy / cá nóc bị đánh', { seeds: 3, vary: 0.07, v: [
    { w: 'sin', f: 320, f2: 160, a: 0.002, d: 0.12, v: 0.18, vib: [22, 1.5] },
    { w: 'noise', a: 0.003, d: 0.08, v: 0.1, lp: 800 }] }],
  mon_die_blob: ['fight', 'Nhầy tan chảy', { seeds: 2, vary: 0.05, v: [
    { w: 'sin', f: 500, f2: 90, sl: 0.3, a: 0.003, d: 0.35, v: 0.24, vib: [18, 1] },
    { w: 'noise', a: 0.01, d: 0.25, v: 0.1, lp: 1200, lp2: 300 }, sxSparkle(0.2, 4, 0.2)] }],
  mon_hurt_crab: ['fight', 'Cua / bọ cạp bị đánh', { seeds: 3, vary: 0.07, v: [
    { grains: 4, span: 0.08, w: 'noise', a: 0.0005, d: [0.005, 0.012], v: [0.2, 0.32], bp: [2500, 3500], bq: 3 },
    { w: 'sq', duty: 0.25, f: 700, f2: 500, a: 0.001, d: 0.06, v: 0.1, lp: 2500 }] }],
  mon_die_crab: ['fight', 'Cua / bọ cạp gục', { seeds: 2, vary: 0.05, v: [
    { grains: 6, span: 0.15, w: 'noise', a: 0.0005, d: [0.005, 0.012], v: [0.1, 0.18], bp: [2500, 3500], bq: 3 },
    { w: 'sq', duty: 0.25, f: 800, f2: 250, a: 0.002, d: 0.28, v: 0.07, lp: 2200 },
    { w: 'sin', t: 0.25, f: 120, f2: 70, a: 0.002, d: 0.1, v: 0.2 }, sxSparkle(0.3, 3, 0.2)] }],
  mon_hurt_bird: ['fight', 'Chim bị đánh (quác)', { seeds: 3, vary: 0.07, v: [
    { w: 'saw', f: 950, f2: 700, a: 0.004, d: 0.12, v: 0.16, bp: 1400, bq: 2, vib: [40, 1] },
    { w: 'noise', a: 0.002, d: 0.05, v: 0.1, bp: 3000 }] }],
  mon_die_bird: ['fight', 'Chim gục', { seeds: 2, vary: 0.05, v: [
    { w: 'saw', f: 900, f2: 300, a: 0.004, d: 0.3, v: 0.14, bp: 1300, bq: 2, vib: [35, 1] },
    { w: 'noise', t: 0.05, a: 0.05, d: 0.3, v: 0.05, hp: 3000 }, sxSparkle(0.3, 3, 0.2)] }],
  mon_hurt_beast: ['fight', 'Sói bị đánh', { seeds: 3, vary: 0.07, v: [
    { w: 'saw', f: 260, f2: 180, a: 0.003, d: 0.15, v: 0.18, lp: 1200, am: [35, 0.6] },
    { w: 'noise', a: 0.002, d: 0.08, v: 0.12, lp: 900 }] }],
  mon_die_beast: ['fight', 'Sói gục', { seeds: 2, vary: 0.05, v: [
    { w: 'saw', f: 420, f2: 160, a: 0.01, d: 0.45, v: 0.15, lp: 1400, vib: [6, 0.8] },
    { w: 'noise', t: 0.35, a: 0.005, d: 0.15, v: 0.1, lp: 600 }, sxSparkle(0.4, 3, 0.2)] }],
  mon_hurt_golem: ['fight', 'Yêu đá / imp bị đánh', { seeds: 3, vary: 0.07, v: [
    { w: 'noise', a: 0.001, d: 0.12, v: 0.24, lp: 900 },
    { w: 'sin', f: 110, f2: 60, a: 0.001, d: 0.12, v: 0.24 },
    { grains: 3, span: 0.08, w: 'noise', a: 0.001, d: [0.01, 0.03], v: [0.06, 0.1], bp: [1500, 2500] }] }],
  mon_die_golem: ['fight', 'Yêu đá vỡ vụn', { seeds: 2, vary: 0.05, v: [
    { w: 'noise', a: 0.001, d: 0.3, v: 0.28, lp: 1600, lp2: 250 },
    { w: 'sin', f: 85, f2: 40, a: 0.002, d: 0.25, v: 0.3 },
    sxCrumble(0.02, 8, 0.35), { w: 'saw', f: 140, f2: 90, a: 0.02, d: 0.2, v: 0.04, lp: 600 }] }],
  mon_hurt_ghost: ['fight', 'Bóng ma / đốm mã hóa bị đánh', { seeds: 3, vary: 0.07, rev: 0.3, v: [
    { w: 'sin', f: 700, f2: 450, a: 0.005, d: 0.18, v: 0.14, vib: [9, 1] },
    { w: 'sin', f: 1050, f2: 675, a: 0.005, d: 0.18, v: 0.05 }] }],
  mon_die_ghost: ['fight', 'Bóng ma tan biến', { seeds: 2, vary: 0.05, rev: 0.4, v: [
    { w: 'sin', f: 900, f2: 200, sl: 0.5, a: 0.01, d: 0.55, v: 0.14, vib: [7, 1.5] },
    { w: 'noise', a: 0.1, d: 0.4, v: 0.06, bp: 2000, bp2: 500 }] }],

  /* ================= HÓA ĐÁ · PHÉP ================= */
  petrify: ['magic', 'Hóa đá (đá rạn răng rắc)', { seeds: 2, vary: 0.03, rev: 0.25, v: [
    { w: 'brown', a: 0.1, h: 0.4, d: 0.4, v: 0.22, lp: 300 },
    { grains: 28, span: 0.8, dens: 0.7, w: 'noise', a: 0.0005, d: [0.004, 0.015], v: [0.05, 0.14], bp: [1500, 5000], bq: 2 },
    { w: 'saw', f: 220, f2: 110, a: 0.05, h: 0.3, d: 0.4, v: 0.05, lp: 800, vib: [5, 0.3] },
    { w: 'sin', t: 0.75, f: 90, f2: 50, a: 0.005, d: 0.3, v: 0.28 }] }],
  /* 2026-10-11 Súng Hóa Đá (systems/petgun.js) */
  petgun_fire: ['magic', 'Súng Hóa Đá bắn (vút pha lê)', { seeds: 3, vary: 0.05, rev: 0.2, v: [
    { w: 'sq', duty: 0.25, f: 1400, f2: 380, a: 0.002, d: 0.16, v: 0.13, lp: 3800 },
    { w: 'sin', f: 2200, f2: 900, a: 0.002, d: 0.12, v: 0.08 },
    { w: 'noise', a: 0.002, d: 0.1, v: 0.1, bp: 3000, bp2: 1200, bq: 1 }, sxSparkle(0.03, 3, 0.15, [0.02, 0.04])] }],
  petrify_hit: ['magic', 'Tia hóa đá trúng (đá đông cứng ngắn)', { seeds: 3, vary: 0.05, rev: 0.15, v: [
    { w: 'noise', a: 0.001, d: 0.06, v: 0.2, bp: 2600, bq: 1.6 },
    { w: 'tri', f: 520, f2: 260, a: 0.001, d: 0.09, v: 0.12 },
    sxCrumble(0.02, 8, 0.18, 1500, 4500, [0.03, 0.08])] }],
  stone_crumble: ['magic', 'Tượng đá vỡ vụn', { seeds: 2, vary: 0.05, rev: 0.2, v: [
    { w: 'noise', a: 0.002, d: 0.35, v: 0.22, lp: 1400, lp2: 300 },
    { w: 'sin', f: 95, f2: 45, a: 0.002, d: 0.22, v: 0.24 },
    sxCrumble(0.03, 16, 0.5), ...sxKnock(0.12, 180, 0.16)] }],
  unstone: ['magic', 'Giải đá (pha lê vỡ + chuông)', { seeds: 2, vary: 0.02, rev: 0.35, v: [
    { w: 'noise', a: 0.0005, d: 0.12, v: 0.24, hp: 3000 },
    { grains: 14, span: 0.5, dens: 1.6, w: 'sin', f: [2500, 6000], a: 0.0005, d: [0.04, 0.15], v: [0.03, 0.07] },
    { w: 'sin', t: 0.15, f: 1047, a: 0.002, d: 0.8, v: 0.1 }, { w: 'sin', t: 0.22, f: 1319, a: 0.002, d: 0.8, v: 0.09 },
    { w: 'sin', t: 0.29, f: 1568, a: 0.002, d: 1.0, v: 0.09 }, { w: 'sin', t: 0.36, f: 2093, a: 0.002, d: 1.0, v: 0.06 }] }],
  zap: ['magic', 'Sứa điện giật', { seeds: 2, vary: 0.04, v: [
    { w: 'saw', f: 70, a: 0.003, h: 0.25, d: 0.1, v: 0.11, lp: 2500, am: [45, 0.8], vib: [13, 2] },
    { grains: 10, span: 0.35, w: 'noise', a: 0.0005, d: [0.003, 0.01], v: [0.05, 0.12], hp: 2500 }] }],
  puff: ['magic', 'Cá nóc phồng gai', { seeds: 2, vary: 0.05, v: [
    { w: 'sin', f: 180, f2: 520, sl: 0.25, a: 0.02, d: 0.25, v: 0.2 },
    { w: 'noise', a: 0.05, d: 0.2, v: 0.08, bp: 800, bp2: 2000 }] }],
  shield: ['magic', 'Khiên bảo vệ', { seeds: 1, vary: 0, rev: 0.3, v: [
    { w: 'sin', f: 440, f2: 880, sl: 0.2, a: 0.02, h: 0.1, d: 0.4, v: 0.12, vib: [12, 0.15] },
    { w: 'sin', f: 660, f2: 1320, sl: 0.2, a: 0.02, d: 0.4, v: 0.07 }, sxSparkle(0.1, 5, 0.4)] }],
  sparkle: ['magic', 'Lấp lánh', { seeds: 3, vary: 0.05, rev: 0.25, v: [sxSparkle(0, 6, 0.35, [0.04, 0.08])] }],
  gate_open: ['magic', 'Cổng phong ấn mở', { seeds: 1, vary: 0, rev: 0.35, v: [
    { w: 'brown', a: 0.1, h: 0.5, d: 0.6, v: 0.28, lp: 250 },
    { w: 'sin', f: 55, a: 0.2, h: 0.4, d: 0.5, v: 0.14, am: [8, 0.4] },
    sxNote(523, 0.5, 0.6, 0.09, 'sin', { lp: 0 }), sxNote(784, 0.62, 0.6, 0.08, 'sin', { lp: 0 }), sxNote(1047, 0.74, 0.9, 0.08, 'sin', { lp: 0 })] }],

  /* ================= ĐỒ VẬT · ĐÁ SEISMIC · MUA BÁN ================= */
  pickup: ['item', 'Nhặt đồ (chung)', { seeds: 2, vary: 0.02, v: [
    sxNote(784, 0, 0.04, 0.15, 'sq', { h: 0.03, lp: 3800 }), sxNote(1175, 0.06, 0.09, 0.14, 'sq', { h: 0.03 })] }],
  pop: ['item', 'Đồ bật ra', { seeds: 3, vary: 0.06, v: [
    { w: 'sin', f: 380, f2: 1100, sl: 0.05, a: 0.002, d: 0.07, v: 0.24 },
    { w: 'noise', a: 0.001, d: 0.02, v: 0.05, bp: 4000 }] }],
  magnet: ['item', 'Đồ bị hút về người', { seeds: 3, vary: 0.05, v: [
    { w: 'noise', a: 0.1, d: 0.1, v: 0.06, bp: 900, bp2: 3200, bq: 2 },
    { w: 'sin', f: 600, f2: 1400, a: 0.09, d: 0.08, v: 0.04 }] }],
  slot: ['item', 'Đồ rơi vào ô', { seeds: 3, vary: 0.04, v: [
    { w: 'tri', f: 1568, a: 0.001, d: 0.06, v: 0.1 },
    { w: 'sq', duty: 0.125, t: 0.03, f: 2093, a: 0.001, d: 0.07, v: 0.05, lp: 5000 },
    { w: 'noise', a: 0.001, d: 0.015, v: 0.05, bp: 2500 }] }],
  coin: ['item', 'Leng keng (xu)', { seeds: 2, vary: 0.01, v: [
    sxNote(988, 0, 0.02, 0.12, 'sq', { h: 0.05, lp: 5000 }), sxNote(1319, 0.06, 0.28, 0.12, 'sq', { h: 0.02, lp: 5000 }),
    { w: 'sin', t: 0.06, f: 2637, a: 0.001, d: 0.2, v: 0.035 }] }],
  stone_gain: ['item', 'Nhận đá Seismic', { seeds: 3, vary: 0.03, rev: 0.15, v: [
    { w: 'sin', f: 1760, a: 0.001, d: 0.25, v: 0.13 }, { w: 'sin', t: 0.04, f: 2637, a: 0.001, d: 0.3, v: 0.09 },
    { w: 'sin', t: 0.04, f: 3530, a: 0.001, d: 0.2, v: 0.04 }, { w: 'noise', a: 0.001, d: 0.02, v: 0.07, hp: 5000 }] }],
  buy: ['item', 'Mua (ka-ching)', { seeds: 1, vary: 0, rev: 0.1, v: [
    sxNote(1319, 0, 0.05, 0.11, 'sq', { h: 0.04, lp: 5000 }), sxNote(1760, 0.07, 0.25, 0.11, 'sq', { h: 0.03, lp: 5000 }),
    { w: 'sin', t: 0.14, f: 2093, a: 0.001, d: 0.35, v: 0.07 }, { w: 'noise', a: 0.001, d: 0.05, v: 0.05, bp: 6000 }] }],
  sell: ['item', 'Bán (xu rơi vào túi)', { seeds: 2, vary: 0.02, rev: 0.1, v: [
    { grains: 5, span: 0.35, dens: 0.8, w: 'sq', duty: 0.25, f: [1500, 2400], a: 0.001, d: [0.05, 0.12], v: [0.05, 0.09], lp: 5000 },
    { w: 'sin', t: 0.38, f: 1047, a: 0.002, d: 0.3, v: 0.1 }, { w: 'sin', t: 0.42, f: 1568, a: 0.002, d: 0.35, v: 0.08 }] }],
  poor: ['item', 'Không đủ đá', { seeds: 1, vary: 0, v: [
    { w: 'tri', f: 392, f2: 370, a: 0.003, d: 0.1, v: 0.2 }, { w: 'tri', t: 0.12, f: 311, f2: 294, a: 0.003, d: 0.18, v: 0.2 },
    { w: 'noise', a: 0.001, d: 0.04, v: 0.04, bp: 3000 }] }],
  steal: ['item', 'Móc túi', { seeds: 2, vary: 0.04, v: [
    { w: 'sq', duty: 0.125, f: 1200, f2: 1800, a: 0.001, d: 0.05, v: 0.07, lp: 4000 },
    { w: 'sq', duty: 0.125, t: 0.07, f: 1500, f2: 2200, a: 0.001, d: 0.05, v: 0.07, lp: 4000 },
    { w: 'noise', a: 0.03, d: 0.08, v: 0.05, bp: 2500, bp2: 5000 },
    { w: 'sin', t: 0.16, f: 1760, a: 0.001, d: 0.2, v: 0.07 }] }],
  gift: ['item', 'Tặng quà', { seeds: 1, vary: 0, rev: 0.2, v: [
    sxNote(784, 0, 0.15, 0.13, 'tri', { lp: 0 }), sxNote(1047, 0.08, 0.2, 0.12, 'tri', { lp: 0 }), { w: 'sin', t: 0.16, f: 1568, a: 0.002, d: 0.3, v: 0.07 }] }],
  craft: ['item', 'Chế tạo', { seeds: 2, vary: 0.02, rev: 0.15, v: [
    { w: 'noise', a: 0.001, d: 0.04, v: 0.17, bp: 1800, bq: 2 }, { w: 'tri', f: 330, f2: 250, a: 0.001, d: 0.05, v: 0.14 },
    { w: 'noise', t: 0.14, a: 0.001, d: 0.04, v: 0.17, bp: 1900, bq: 2 }, { w: 'tri', t: 0.14, f: 350, f2: 260, a: 0.001, d: 0.05, v: 0.14 },
    { w: 'sin', t: 0.28, f: 1568, a: 0.002, d: 0.25, v: 0.09 }, { w: 'sin', t: 0.34, f: 2093, a: 0.002, d: 0.3, v: 0.07 }, { w: 'sin', t: 0.4, f: 2637, a: 0.002, d: 0.35, v: 0.05 }] }],
  build: ['item', 'Xây / đóng gỗ (2 nhát)', { seeds: 3, vary: 0.04, v: [...sxKnock(0, 240, 0.28), ...sxKnock(0.16, 225, 0.25)] }],
  hammer: ['item', 'Gõ búa sửa nhà', { seeds: 3, vary: 0.05, v: [...sxKnock(0, 250, 0.19), { w: 'sin', f: 1900, a: 0.001, d: 0.05, v: 0.04 }] }],
  smash: ['item', 'Công trình bị đập', { seeds: 3, vary: 0.05, v: [
    { w: 'noise', a: 0.001, d: 0.12, v: 0.24, bp: 1200, bq: 0.8 }, { w: 'tri', f: 180, f2: 120, a: 0.001, d: 0.1, v: 0.2 },
    { grains: 4, span: 0.15, w: 'tri', f: [180, 320], fr: 0.7, a: 0.001, d: [0.03, 0.06], v: [0.06, 0.1] }] }],
  collapse: ['item', 'Công trình sập', { seeds: 1, vary: 0.03, rev: 0.12, v: [
    { w: 'noise', a: 0.005, d: 0.7, v: 0.28, lp: 2500, lp2: 300 }, { w: 'sin', f: 80, f2: 35, a: 0.003, d: 0.5, v: 0.38 },
    { grains: 12, span: 0.7, dens: 1.3, w: 'noise', a: 0.001, d: [0.02, 0.06], v: [0.05, 0.11], bp: [500, 2500] },
    { grains: 4, span: 0.2, w: 'tri', f: [150, 300], fr: 0.7, a: 0.001, d: [0.03, 0.06], v: [0.07, 0.12] }] }],

  /* ================= GIAO DIỆN ================= */
  click: ['ui', 'Bấm nút', { seeds: 2, vary: 0.02, v: [
    { w: 'sq', duty: 0.25, f: 1300, f2: 1100, a: 0.001, d: 0.025, v: 0.1, lp: 4000 },
    { w: 'tri', f: 220, f2: 180, a: 0.001, d: 0.03, v: 0.1 }] }],
  hover: ['ui', 'Rê chuột qua nút', { seeds: 2, vary: 0.03, v: [{ w: 'sin', f: 2400, a: 0.001, d: 0.015, v: 0.055 }] }],
  tab: ['ui', 'Đổi thẻ', { seeds: 1, vary: 0, v: [
    { w: 'sq', duty: 0.25, f: 880, a: 0.001, d: 0.03, v: 0.07, lp: 3500 }, { w: 'sq', duty: 0.25, t: 0.045, f: 1320, a: 0.001, d: 0.04, v: 0.07, lp: 3500 }] }],
  target_lock: ['ui', 'Khóa mục tiêu (2 nốt lên, gọn)', { seeds: 2, vary: 0.02, v: [{ w: 'sq', duty: 0.125, f: 988, a: 0.001, d: 0.04, v: 0.06, lp: 4200 }, { w: 'sq', duty: 0.125, t: 0.045, f: 1480, a: 0.001, d: 0.06, v: 0.06, lp: 4200 }, { w: 'tri', f: 494, a: 0.001, d: 0.05, v: 0.04 }] }],
  target_clear: ['ui', 'Bỏ khóa mục tiêu (1 nốt xuống)', { seeds: 1, vary: 0.02, v: [{ w: 'sq', duty: 0.125, f: 880, f2: 587, a: 0.001, d: 0.06, v: 0.05, lp: 3600 }] }],
  slot_select: ['ui', 'Chọn ô thanh công cụ', { seeds: 2, vary: 0.02, v: [{ w: 'sq', duty: 0.125, f: 1760, a: 0.001, d: 0.02, v: 0.05, lp: 5000 }, { w: 'tri', f: 440, a: 0.001, d: 0.02, v: 0.04 }] }],
  menu_open: ['ui', 'Mở túi / bảng', { seeds: 1, vary: 0, v: [
    { w: 'noise', a: 0.04, d: 0.12, v: 0.05, bp: 1200, bp2: 3500, bq: 1.2 },
    { w: 'tri', t: 0.03, f: 660, a: 0.003, d: 0.12, v: 0.13 }, { w: 'tri', t: 0.09, f: 990, a: 0.003, d: 0.18, v: 0.11 }] }],
  menu_close: ['ui', 'Đóng túi / bảng', { seeds: 1, vary: 0, v: [
    { w: 'tri', f: 990, a: 0.003, d: 0.1, v: 0.1 }, { w: 'tri', t: 0.06, f: 660, a: 0.003, d: 0.14, v: 0.1 },
    { w: 'noise', a: 0.02, d: 0.1, v: 0.04, bp: 3000, bp2: 1200 }] }],
  fail: ['ui', 'Lỗi / không làm được', { seeds: 1, vary: 0, v: [
    { w: 'sq', f: 220, a: 0.003, h: 0.06, d: 0.06, v: 0.12, lp: 1200 }, { w: 'sq', t: 0.11, f: 165, a: 0.003, h: 0.08, d: 0.1, v: 0.12, lp: 1000 }] }],
  error: ['ui', 'Báo lỗi nhẹ', { seeds: 1, vary: 0, v: [{ w: 'sq', f: 247, a: 0.003, h: 0.05, d: 0.08, v: 0.1, lp: 1100 }, { w: 'sq', t: 0.09, f: 247, a: 0.003, h: 0.05, d: 0.08, v: 0.1, lp: 1100 }] }],

  /* ================= SỰ KIỆN · NGÀY ĐÊM ================= */
  win: ['event', 'Thành công (ngắn)', { seeds: 1, vary: 0, rev: 0.12, v: [
    sxNote(523, 0, 0.1, 0.11), sxNote(659, 0.1, 0.1, 0.11), sxNote(784, 0.2, 0.1, 0.11), sxNote(1047, 0.3, 0.38, 0.12, 'sq', { h: 0.05 }),
    sxNote(262, 0.3, 0.38, 0.12, 'tri', { lp: 0 })] }],
  level_up: ['event', 'Lên cấp', { seeds: 1, vary: 0, rev: 0.2, v: [
    sxNote(523, 0, 0.09, 0.1), sxNote(659, 0.07, 0.09, 0.1), sxNote(784, 0.14, 0.09, 0.1), sxNote(1047, 0.21, 0.45, 0.12, 'sq', { h: 0.06 }),
    { w: 'sin', t: 0.21, f: 2093, a: 0.002, d: 0.5, v: 0.04 }, sxSparkle(0.25, 6, 0.5)] }],
  quest_step: ['event', 'Xong 1 bước nhiệm vụ', { seeds: 1, vary: 0, rev: 0.15, v: [sxNote(784, 0, 0.1, 0.11, 'tri', { lp: 0 }), sxNote(1047, 0.09, 0.25, 0.11, 'tri', { lp: 0 }), { w: 'sin', t: 0.09, f: 2093, a: 0.002, d: 0.25, v: 0.03 }] }],
  quest_done: ['event', 'Hoàn thành nhiệm vụ', { seeds: 1, vary: 0, rev: 0.18, v: [
    sxNote(392, 0, 0.1, 0.1), sxNote(523, 0.1, 0.1, 0.1), sxNote(659, 0.2, 0.1, 0.1), sxNote(784, 0.3, 0.16, 0.11), sxNote(659, 0.46, 0.08, 0.1), sxNote(784, 0.54, 0.5, 0.12, 'sq', { h: 0.08 }),
    sxNote(131, 0.54, 0.5, 0.14, 'tri', { lp: 0 }), sxNote(196, 0.54, 0.5, 0.1, 'tri', { lp: 0 })] }],
  alarm: ['event', 'Cảnh báo', { seeds: 1, vary: 0, v: [
    { w: 'tri', f: 880, a: 0.005, h: 0.08, d: 0.05, v: 0.17 }, { w: 'tri', t: 0.16, f: 660, a: 0.005, h: 0.08, d: 0.05, v: 0.17 },
    { w: 'tri', t: 0.32, f: 880, a: 0.005, h: 0.08, d: 0.05, v: 0.17 },
    { w: 'sq', duty: 0.125, f: 880, a: 0.005, h: 0.08, d: 0.05, v: 0.035, lp: 3000 }, { w: 'sq', duty: 0.125, t: 0.32, f: 880, a: 0.005, h: 0.08, d: 0.05, v: 0.035, lp: 3000 }] }],
  warn: ['event', 'Nhắc nhẹ (sắp hết sức / hơi thở)', { seeds: 1, vary: 0, v: [{ w: 'tri', f: 740, a: 0.005, h: 0.06, d: 0.06, v: 0.14 }, { w: 'tri', t: 0.14, f: 740, a: 0.005, h: 0.06, d: 0.08, v: 0.12 }] }],
  sad: ['event', 'Buồn (dân ngã xuống)', { seeds: 1, vary: 0, rev: 0.3, v: [sxNote(440, 0, 0.25, 0.12, 'tri', { lp: 0 }), sxNote(415, 0.2, 0.25, 0.12, 'tri', { lp: 0 }), sxNote(349, 0.4, 0.65, 0.12, 'tri', { lp: 0, vib: [5, 0.2] })] }],
  door: ['event', 'Cửa / cổng gỗ', { seeds: 2, vary: 0.04, v: [
    { w: 'saw', f: 140, f2: 190, a: 0.05, h: 0.15, d: 0.1, v: 0.06, bp: 700, bq: 5, vib: [9, 0.8] },
    { w: 'noise', t: 0.3, a: 0.001, d: 0.04, v: 0.18, bp: 2000, bq: 2 }, { w: 'tri', t: 0.3, f: 220, f2: 160, a: 0.001, d: 0.06, v: 0.14 }] }],
  campfire: ['event', 'Nhóm lửa trại', { seeds: 2, vary: 0.03, v: [
    { w: 'noise', a: 0.08, d: 0.4, v: 0.15, bp: 400, bp2: 1500, bq: 0.7 },
    { grains: 10, t: 0.2, span: 0.8, w: 'noise', a: 0.0005, d: [0.004, 0.012], v: [0.05, 0.11], bp: [1500, 4000], bq: 2 },
    { w: 'brown', t: 0.1, a: 0.1, h: 0.4, d: 0.4, v: 0.1, lp: 400 }] }],
  night: ['event', 'Màn đêm buông', { seeds: 1, vary: 0, rev: 0.5, v: [
    { w: 'sin', f: 784, a: 0.005, d: 1.0, v: 0.08 }, { w: 'sin', f: 1571, a: 0.005, d: 0.5, v: 0.02 },
    { w: 'sin', t: 0.38, f: 659, a: 0.005, d: 1.0, v: 0.08 }, { w: 'sin', t: 0.76, f: 523, a: 0.005, d: 1.7, v: 0.09 }, { w: 'sin', t: 0.76, f: 262, a: 0.01, d: 1.7, v: 0.05 }] }],
  morning: ['event', 'Chuông buổi sáng', { seeds: 1, vary: 0, rev: 0.35, v: [
    { w: 'sin', f: 523, a: 0.005, d: 0.8, v: 0.08 }, { w: 'sin', t: 0.16, f: 659, a: 0.005, d: 0.8, v: 0.08 },
    { w: 'sin', t: 0.32, f: 784, a: 0.005, d: 0.9, v: 0.08 }, { w: 'sin', t: 0.48, f: 1047, a: 0.005, d: 1.3, v: 0.08 },
    sxChirp(0.9, 2300, 1.3, 0.04, 0.05), sxChirp(1.0, 2500, 1.25, 0.035, 0.05)] }],
  rumble: ['event', 'Đất rung (dư chấn)', { seeds: 2, vary: 0.05, v: [
    { w: 'brown', a: 0.15, h: 0.4, d: 0.8, v: 0.34, lp: 160 },
    { w: 'sin', f: 42, a: 0.2, h: 0.3, d: 0.7, v: 0.12, am: [6, 0.5] },
    sxCrumble(0.2, 6, 0.8, 400, 1500, [0.02, 0.05])] }],
  lava_bloop: ['event', 'Dung nham sủi bọt (âm nền M7)', { seeds: 4, vary: 0.1, rev: 0.2, v: [
    { w: 'sin', f: 70, f2: 140, sl: 0.08, a: 0.01, d: 0.18, v: 0.3 },
    { w: 'noise', t: 0.06, a: 0.01, d: 0.25, v: 0.05, hp: 3000 }] }],
  thunder: ['event', 'Sấm xa (Đỉnh Tâm Chấn)', { seeds: 3, vary: 0.08, rev: 0.3, v: [
    { w: 'brown', a: 0.05, h: 0.3, d: 1.6, v: 0.28, lp: 400, lp2: 120, am: [3, 0.4] },
    { w: 'noise', a: 0.01, d: 0.4, v: 0.05, lp: 1500, lp2: 300 }] }],

  /* ================= ROCKY · THÚ ================= */
  rocky_chirp: ['pet', 'Rocky ríu rít', { seeds: 3, vary: 0.05, v: [sxChirp(0, 1300, 1.45, 0.14, 0.07), sxChirp(0.1, 1500, 1.45, 0.12, 0.08)] }],
  rocky_happy: ['pet', 'Rocky vui (líu lo)', { seeds: 2, vary: 0.03, rev: 0.15, v: [
    sxChirp(0, 1200, 1.3, 0.11, 0.06), sxChirp(0.07, 1350, 1.3, 0.11, 0.06), sxChirp(0.14, 1500, 1.3, 0.11, 0.06), sxChirp(0.21, 1700, 1.3, 0.11, 0.06), sxChirp(0.28, 1900, 1.4, 0.12, 0.1),
    sxSparkle(0.3, 4, 0.3)] }],
  squeak: ['pet', 'Thú kêu chíp (chung)', { seeds: 3, vary: 0.06, v: [
    { w: 'sin', f: 900, f2: 1500, sl: 0.04, a: 0.002, d: 0.08, v: 0.16, vib: [25, 0.5] },
    { w: 'sq', duty: 0.125, f: 1800, a: 0.002, d: 0.03, v: 0.025, lp: 4000 }] }],

  /* ================= TRÙM · CỐT TRUYỆN ================= */
  xealist: ['story', 'Xealist (nốt nhạc u tối)', { seeds: 1, vary: 0, rev: 0.4, v: [
    { w: 'saw', f: 73.4, a: 0.3, h: 0.6, d: 1.0, v: 0.1, lp: 500, lp2: 1400, vib: [4, 0.15] },
    { w: 'saw', f: 77.8, a: 0.3, h: 0.6, d: 1.0, v: 0.07, lp: 500, lp2: 1200 },
    { w: 'saw', f: 103.8, a: 0.35, h: 0.5, d: 1.0, v: 0.06, lp: 600, lp2: 1300 },
    { w: 'noise', a: 0.6, d: 0.15, v: 0.09, bp: 300, bp2: 2000 },
    { w: 'sin', t: 0.6, f: 55, f2: 35, a: 0.005, d: 0.8, v: 0.32 }] }],
  kraken_roar: ['story', 'Kraken gầm', { seeds: 1, vary: 0.02, rev: 0.35, v: [
    { w: 'saw', f: 55, f2: 42, a: 0.15, h: 0.8, d: 0.8, v: 0.17, lp: 400, lq: 2, am: [17, 0.7], vib: [3, 0.5] },
    { w: 'saw', f: 82, f2: 62, a: 0.2, h: 0.7, d: 0.7, v: 0.09, lp: 600, am: [23, 0.6] },
    { w: 'brown', a: 0.1, h: 0.8, d: 0.8, v: 0.28, lp: 300 },
    { w: 'noise', a: 0.2, h: 0.6, d: 0.6, v: 0.06, bp: 500, bq: 1.5, am: [11, 0.5] }] }],
  kraken_hurt: ['story', 'Kraken trúng đòn', { seeds: 2, vary: 0.04, rev: 0.25, v: [
    { w: 'saw', f: 90, f2: 60, a: 0.03, h: 0.2, d: 0.4, v: 0.15, lp: 700, am: [21, 0.6] },
    { w: 'noise', a: 0.005, d: 0.3, v: 0.15, lp: 900 }, { w: 'sin', f: 70, f2: 40, a: 0.003, d: 0.3, v: 0.28 }] }],
  boss_hit: ['story', 'Đánh trúng xúc tu', { seeds: 3, vary: 0.05, v: [
    { w: 'noise', a: 0.001, d: 0.15, v: 0.3, lp: 2000, lp2: 400 }, { w: 'sin', f: 90, f2: 40, a: 0.002, d: 0.3, v: 0.36 },
    { w: 'noise', a: 0.01, d: 0.2, v: 0.1, lp: 900, lp2: 300, lq: 3 }] }],
  slam: ['story', 'Xúc tu đập xuống', { seeds: 2, vary: 0.05, rev: 0.15, v: [
    { w: 'brown', a: 0.002, d: 0.6, v: 0.36, lp: 300 }, { w: 'sin', f: 70, f2: 30, a: 0.002, d: 0.4, v: 0.4 },
    { w: 'noise', a: 0.004, d: 0.5, v: 0.18, lp: 2500, lp2: 500 }, sxBubbles(0.1, 6, 200, 500, [0.04, 0.07], 0.5)] }],
  whoosh_big: ['story', 'Xúc tu quét ngang', { seeds: 2, vary: 0.05, v: [{ w: 'noise', a: 0.15, d: 0.25, v: 0.2, bp: 300, bp2: 1800, bq: 1.2 }, { w: 'brown', a: 0.1, d: 0.3, v: 0.12, lp: 250 }] }],
  bubble_trap: ['story', 'Bị nhốt trong bong bóng', { seeds: 1, vary: 0.03, v: [{ w: 'sin', f: 200, f2: 600, a: 0.05, d: 0.3, v: 0.18, vib: [8, 1] }, sxBubbles(0.05, 6, 250, 600)] }],
  bubble_pop: ['story', 'Bong bóng vỡ', { seeds: 2, vary: 0.05, v: [
    { w: 'sin', f: 400, f2: 1500, sl: 0.03, a: 0.001, d: 0.06, v: 0.24 }, { w: 'noise', a: 0.001, d: 0.05, v: 0.12, hp: 2000 }, sxBubbles(0.04, 4, 400, 900, [0.03, 0.06], 0.3)] }],
  squelch: ['story', 'Xúc tu co rút (nhầy nhụa)', { seeds: 2, vary: 0.05, v: [
    { w: 'noise', a: 0.01, d: 0.2, v: 0.18, lp: 1200, lp2: 300, lq: 3 }, { w: 'sin', f: 200, f2: 120, a: 0.005, d: 0.15, v: 0.15, vib: [20, 1] }] }],
  ink: ['story', 'Phun mực', { seeds: 2, vary: 0.05, v: [{ w: 'noise', a: 0.01, d: 0.3, v: 0.15, lp: 800, lp2: 200, lq: 4 }, { w: 'sin', f: 300, f2: 100, a: 0.005, d: 0.25, v: 0.14 }] }],
  pound: ['story', 'Rocky dậm đất', { seeds: 2, vary: 0.04, v: [
    { w: 'sin', f: 100, f2: 35, a: 0.002, d: 0.35, v: 0.42 }, { w: 'brown', a: 0.002, d: 0.5, v: 0.28, lp: 250 }, sxCrumble(0.05, 6, 0.3, 500, 2000)] }],
};

/* tên cũ → tiếng mới (gọi tên cũ vẫn chạy) */
export const SFX_ALIAS = { splash: 'splash_small' };

/* trống cho nhạc (dựng 1 lần thành buffer) */
export const DRUMS = {
  k: { v: [{ w: 'sin', f: 130, f2: 42, sl: 0.09, a: 0.001, d: 0.2, v: 0.62 }, { w: 'noise', a: 0.0005, d: 0.012, v: 0.12, lp: 2500 }] },
  s: { v: [{ w: 'noise', a: 0.001, d: 0.14, v: 0.32, bp: 1900, bq: 0.7 }, { w: 'tri', f: 190, f2: 150, a: 0.001, d: 0.08, v: 0.22 }, { w: 'noise', a: 0.001, d: 0.06, v: 0.1, hp: 5000 }] },
  h: { v: [{ w: 'noise', a: 0.0005, d: 0.03, v: 0.16, hp: 7000 }] },
  o: { v: [{ w: 'noise', a: 0.001, d: 0.18, v: 0.12, hp: 6500 }] },
  x: { v: [{ w: 'noise', a: 0.008, d: 0.045, v: 0.12, bp: 5500, bq: 1.2 }] },
  r: { v: [{ w: 'sq', duty: 0.5, f: 1250, a: 0.0005, d: 0.022, v: 0.12, lp: 5000 }, { w: 'noise', a: 0.0005, d: 0.015, v: 0.12, bp: 3000, bq: 2 }] },
  t: { v: [{ w: 'sin', f: 190, f2: 120, a: 0.001, d: 0.2, v: 0.42 }, { w: 'noise', a: 0.001, d: 0.03, v: 0.06, lp: 1500 }] },
  T: { v: [{ w: 'sin', f: 115, f2: 70, a: 0.001, d: 0.32, v: 0.5 }, { w: 'noise', a: 0.001, d: 0.04, v: 0.06, lp: 1000 }] },
  c: { v: [{ grains: 3, span: 0.02, w: 'noise', a: 0.001, d: 0.02, v: 0.14, bp: 1600, bq: 0.8 }, { w: 'noise', t: 0.02, a: 0.001, d: 0.12, v: 0.16, bp: 1400, bq: 0.8 }] },
  m: { v: [{ w: 'tri', f: 784, a: 0.001, d: 0.06, v: 0.12 }, { w: 'sin', f: 2100, a: 0.001, d: 0.04, v: 0.05 }] },   /* mõ / chuông nhỏ */
  b: { v: [{ w: 'sin', f: 62, f2: 46, a: 0.004, d: 0.5, v: 0.5 }, { w: 'noise', a: 0.002, d: 0.06, v: 0.05, lp: 600 }] },   /* trống trầm (timpani) */
  z: { v: [{ w: 'noise', a: 0.02, d: 0.9, v: 0.09, hp: 4500 }] },   /* chập cheng nhẹ */
};
