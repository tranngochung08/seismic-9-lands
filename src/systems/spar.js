// spar.js — 2026-10-11 (anh yêu cầu): BẠN TẬP. Gặp Xealist (cả 2 phe; phe Noxx: Xealist đứng ở Làng) → "Gọi bạn tập" → bảng chọn
// 39 nhân vật PixelLab cao to vạm vỡ (≈ 1,25× người chơi), mỗi người 1 đòn đặc trưng (lấy cảm hứng từ ảnh Higgsfield, nhân vật gốc, tên mới).
// Luật trận tập: không mất đồ, không ngất (còn 1 máu = CHỊU THUA, hồi 50 %); bạn tập có thanh máu + khóa mục tiêu được (đi qua monsters.js);
// thắng → ít kinh nghiệm + ghi 'đã tập với X' + mở khóa người kế tiếp; bạn tập cúi chào rồi đi; ra khỏi vòng sàn tập = kết thúc.
// Mọi đòn báo trước bằng DẤU TĨNH trên đất (ảnh PixelLab warn_*) + tư thế lấy đà 0,6–0,9 s; không hiệu ứng lặp/nhấp nháy.
// Ảnh: assets/px/spar/<id>.png (sheet 4 hàng S W E N × [idle | walk | atk]), <id>_face.png, bow_<id>; danh mục assets/px/spar/spar.json (tools/px-spar.py).
// Lưu: save.sys.spar = { unlocked, rec: { <id>: { w, l, last } }, trained: [id…] }.
import { maxHp, baseAtk } from './hero.js';
import { winLoot } from './roadloot.js';   /* plan-28: thắng bạn tập → đồ rơi ra đất + Ngọc Rồng (cả Sàn Đấu lẫn đường đèo) */
import { ART } from '../art.js';
const ART_VFX = n => ART.vfx && ART.vfx[n];

const N0 = 1, RING_DRAW = 240; let RING_R = 86;   /* 2026-10-11: ở Sàn Đấu Ngầm RING_R = bán kính sàn cát (m.sparRing.r), đặt lúc gọi trận */   /* ảnh vòng sàn 320 px (2×) vẽ 240 logic: lòng cát bán kính ≈ 86 */
/* id, tên vi, tên en, kiểu đòn, tên đòn vi/en, mô tả vi/en — thứ tự = thứ tự mở khóa (khớp tools/px-spar.py) */
const R = [
  ['dauvuong', 'Đầu Vuông', 'Blockhead', 'slam', 'Giáng Khối Vuông', 'Block Drop', 'Nhảy tới, giáng khối tóc vuông xuống vùng đã đánh dấu — bị trúng là bay lên trời.', 'Leaps in and drops the square hair block on the marked area — get hit and you fly.'],
  ['riatrau', 'Ria Trâu', 'Buffalo Stache', 'lash', 'Quất Ria', 'Stache Whip', 'Bộ ria sừng trâu cứng lại rồi quất thẳng một đường dài ~4 ô — trúng là bị hất lùi; quất xong ria rối, đứng gỡ ~1,2 s.', 'The buffalo-horn moustache stiffens, then lashes a long straight line (~4 tiles) — get hit and you are knocked back; then it tangles for ~1.2 s.'],
  ['sungbo', 'Sừng Bò', 'Bull Horns', 'charge', 'Húc Sừng Bò', 'Bull Rush', 'Cào đất, cúi sừng tóc húc thẳng theo làn đã báo — né để nó húc trượt vào tường là choáng.', 'Paws the ground and rushes down the marked lane — dodge so it rams a wall and gets stunned.'],
  ['bonggon', 'Bông Gòn', 'Cotton Puff', 'ring', 'Sóng Bông', 'Puff Wave', 'Nhảy dậm cho mái afro nảy ra sóng vòng — đứng sát hoặc ra xa để né.', 'Bounces the afro into a ring wave — hug close or step far to dodge.'],
  ['bittai', 'Ông Bịt Tai', 'Earmuff Ed', 'peck', 'Mổ Cổ Dài', 'Long Neck Peck', 'Vươn cổ dài mổ xa hơn bạn tưởng.', 'Stretches the long neck to peck further than you think.'],
  ['cambua', 'Cằm Búa', 'Hammer Chin', 'knock', 'Hất Cằm', 'Chin Bump', 'Huých cằm búa văng bạn ra xa.', 'Bumps you away with the hammer chin.'],
  ['lucsi', 'Lực Sĩ Kính Đen', 'Shades Hulk', 'barbell', 'Ném Tạ', 'Barbell Toss', 'Ném tạ bay vòng cung — đất đánh dấu chỗ tạ rơi.', 'Throws barbells in arcs — landing spots are marked.'],
  ['biker', 'Biker Kính Đen', 'Shades Biker', 'dash', 'Phóng Xế', 'Throttle Dash', 'Lao một mạch dài theo đường thẳng.', 'Dashes a long straight line.'],
  ['bimbac', 'Bà Bím Bạc', 'Silver Pigtails', 'spin', 'Bím Xoay', 'Pigtail Spin', 'Xoay tròn tại chỗ, hai bím tóc quất quanh người.', 'Spins on the spot, pigtails whipping all around.'],
  ['dautrung', 'Đầu Trứng', 'Egghead', 'ricochet', 'Trứng Lăn', 'Egg Roll', 'Cuộn tròn thành quả trứng, lăn dội tường 3 lần.', 'Curls into an egg and ricochets off the walls three times.'],
  ['sungbac', 'Sừng Bạc', 'Silver Horns', 'drill', 'Khoan Bạc', 'Silver Drill', 'Đôi sừng xoay thành mũi khoan, chui xuống đất — vết nứt bò theo bạn rồi trồi lên ngay dưới chân.', 'The horns spin into a drill and burrow — a crack chases you, then erupts under your feet.'],
  ['mutim', 'Ông Mũ Tím', 'Purple Hat', 'decoy', 'Mũ Ảo Thuật', 'Magic Hat', 'Rút ra 2 bản sao — chỉ một là thật.', 'Pulls out two decoy clones — only one is real.'],
  ['toong', 'Bà Tổ Ong', 'Beehive Bea', 'swarm', 'Ong Vỡ Tổ', 'Hive Burst', 'Thả đàn ong đuổi theo bạn một lúc.', 'Releases a bee swarm that chases you for a moment.'],
  ['kinhhong', 'Cầu Thủ Kính Hồng', 'Pink Shades', 'lash', 'Sút Xa', 'Long Kick', 'Vung chân sút mạnh theo một đường thẳng.', 'Swings a powerful kick along a straight line.'],
  ['nonhong', 'Nữ Hoàng Nón Hồng', 'Pink Cone Queen', 'boomerang', 'Nón Bay', 'Hat Boomerang', 'Phóng chiếc nón bay ra rồi quay về như boomerang.', 'Flings the hat out and back like a boomerang.'],
  ['daoco', 'Đầu Cỏ', 'Hedgehead', 'root', 'Cỏ Trói', 'Grass Snare', 'Rễ cỏ trồi lên trói chân bạn 1 giây.', 'Grass roots burst up and root you for 1 s.'],
  ['bimdoi', 'Bím Đôi', 'Twin Buns', 'flurry', 'Đấm Liên Thanh', 'Rapid Fists', 'Đấm liên hoàn rất nhanh trong hình nón ngắn trước mặt.', 'A rapid flurry of punches in a short cone.'],
  ['ria_bac', 'Chú Ria Bạc', 'Silver Stache', 'lash', 'Tát Trái Tay', 'Backhand', 'Vung tay tát ngang một đường dài.', 'A long sweeping backhand.'],
  ['giaosu', 'Giáo Sư Hói', 'Prof Baldy', 'flash', 'Đầu Gương', 'Mirror Dome', 'Cái đầu hói lóe sáng hình nón — nhìn thẳng là chói mắt — rồi lao tới húc đầu.', 'The bald head flashes a blinding cone — face it and the screen dims — then a headbutt dash.'],
  ['rockerran', 'Rocker Rằn Ri', 'Camo Rocker', 'beat', 'Solo Guitar', 'Guitar Solo', 'Sóng âm dội theo nhịp — né đúng nhịp.', 'Rhythmic sound pulses — dodge on the beat.'],
  ['bobvang', 'Cụ Bob Vàng', 'Gramps Bob', 'knock', 'Lắc Hông', 'Hip Bump', 'Lắc hông hất bạn văng sang bên.', 'Hip-bumps you aside.'],
  ['caoboi', 'Cao Bồi Ria', 'Cowboy Stache', 'lasso', 'Thòng Lọng', 'Lasso', 'Quăng thòng lọng từ xa kéo bạn lại rồi tung một cú đấm.', 'Throws a lasso from range, pulls you in, then punches.'],
  ['maoga', 'Mào Gà', 'Rooster Quiff', 'crow', 'Gà Gáy', 'Rooster Crow', 'Ưỡn ngực gáy vang — sóng âm hình nón đẩy bạn văng ra và làm chậm; đứng sát/sau lưng thì ăn cú quét tay. Gáy xong thở dốc.', 'Puffs up and crows — a sonic cone blasts you back and slows you; stand close or behind and he spins a backhand. Pants after.'],
  ['caro', 'Ca Rô', 'Checkers', 'multi', 'Bàn Cờ', 'Checkmate', 'Nhảy điệu ca rô — đất rung theo từng ô quanh bạn.', 'A checkered dance — tiles quake around you.'],
  ['batup', 'Tóc Bát Úp', 'Bowl Cut', 'grab', 'Ôm Quật', 'Grab & Slam', 'Khom người dang tay rồi lao tới ôm — bị tóm là bị nhấc bổng quật ra sau (bấm E liên tục để vùng ra); hụt thì loạng choạng.', 'Crouches arms wide and lunges — caught, you get lifted and slammed behind (mash E to break free); miss and he stumbles.'],
  ['munoi', 'Ria Mũ Nồi', 'Beret Stache', 'knock', 'Ưỡn Bụng', 'Belly Bump', 'Chống nạnh, ưỡn bụng hất bạn lùi.', 'Hands on hips — a belly bump.'],
  ['bongvang', 'Bông Lúa', 'Golden Afro', 'vortex', 'Gió Lúa', 'Wheat Whirl', 'Xoáy gió kéo bạn vào giữa.', 'A whirlwind that pulls you in.'],
  ['sungquy', 'Sừng Quỷ', 'Devil Buns', 'firetrail', 'Lửa Quỷ', 'Devil Fire', 'Phun một vệt lửa cháy trên đất theo hình vòng cung — đứng vào là bỏng vài giây.', 'Breathes a burning arc of fire on the ground — stand in it and you burn for a few seconds.'],
  ['trumda', 'Trùm Áo Da', 'Leather Boss', 'slam', 'Đập Tay Khoanh', 'Arm Smash', 'Giơ hai tay khoanh lên rồi đập xuống chỗ bạn.', 'Raises crossed arms and smashes them down on you.'],
  ['bobbach', 'Bob Bạch Kim', 'Platinum Bob', 'drift', 'Drift Vòng', 'Donut Drift', 'Drift một vòng quanh bạn, vệt lốp để lại làm chậm.', 'Drifts a circle around you, leaving tire marks that slow you down.'],
  ['muikeo', 'Mũi Kéo', 'Spike Bun', 'lash', 'Đá Gót Nhọn', 'Spike Kick', 'Đá xoay bằng chiếc bốt nhọn theo một đường.', 'A spinning pointed-boot kick along a line.'],
  ['aocam', 'Áo Cam Gắt', 'Angry Orange', 'ball', 'Bóng Cam', 'Orange Ball', 'Ném quả bóng cam nảy tưng tưng về phía bạn.', 'Hurls a bouncing orange ball at you.'],
  ['taivenh', 'Tai Vểnh', 'Big Ears', 'pulse', 'Siêu Âm', 'Ultrasound', 'Phát sóng dội lan ra: soi chỗ bạn trốn và đẩy lùi.', 'Echo pulses that reveal you and push you back.'],
  ['dovat', 'Nữ Đô Vật', 'Wrestler Wren', 'splash', 'Bay Người', 'Body Splash', 'Bật thật cao rồi đổ ập thân xuống chỗ đã đánh dấu.', 'Leaps high and body-splashes onto a marked spot.'],
  ['motocross', 'Hàm Thép', 'Steel Jaw', 'exhaust', 'Nẹt Pô', 'Exhaust Blast', 'Nẹt pô phun khói sau lưng rồi bốc đầu dậm mạnh phía trước.', 'Blasts an exhaust cloud behind, then wheelie-stomps in front.'],
  ['aodo', 'Tóc Xù Áo Đỏ', 'Red Jacket', 'fan', 'Gai Tóc', 'Hair Spikes', 'Lắc mái tóc xù bắn 5 gai tóc xòe hình quạt.', 'Shakes the wild hair and fires five spikes in a fan.'],
  ['riacong', 'Ria Cong', 'Curly Stache', 'hook', 'Ria Móc', 'Stache Hook', 'Móc ria vào bạn rồi giật mạnh về.', 'Hooks you with the moustache and yanks you in.'],
  ['maibang', 'Mái Bằng', 'Flat Bangs', 'shield', 'Khiên Mái Bằng', 'Bangs Shield', 'Mái tóc bằng hóa khiên, phản đòn 1,5 giây rồi phản công.', 'The flat bangs become a shield that reflects hits for 1.5 s, then counters.'],
  ['angten', 'Ăng-ten', 'Antenna', 'multi', 'Sét Ăng-ten', 'Antenna Bolt', 'Giơ tay bắt sóng — 3 chỗ đất bị giáng lần lượt.', 'Raises the arms — three spots get struck in turn.'],
];
const FIRST = ['caro', 'dauvuong', 'sungbo', 'maoga', 'batup', 'riatrau', 'bonggon', 'bittai', 'cambua'];   /* 2026-10-11 anh: làm trọn 1 người (Ca Rô, thân lực sĩ) để duyệt; ai chưa có ảnh trong spar.json hiện 'Sắp có' */
R.sort((a, b) => ((FIRST.indexOf(a[0]) + 1 || 99) - (FIRST.indexOf(b[0]) + 1 || 99)));
/* 2026-10-11 anh: mỗi người một đòn riêng — 21 người chưa làm đổi sang kiểu đòn MỚI (plan). Kiểu chưa lập trình thì tạm chạy bằng kiểu gần nhất (KFALL)
   cho tới khi làm tới người đó; bảng chọn vẫn hiện tên + mô tả đòn mới. */
const KIMPL = new Set(['slam', 'multi', 'spin', 'ring', 'lash', 'peck', 'knock', 'grab', 'crow', 'charge', 'dash', 'barbell']);
const KFALL = { drill: 'slam', firetrail: 'lash', ricochet: 'charge', flash: 'dash', drift: 'dash', exhaust: 'knock', ball: 'lash', fan: 'crow', shield: 'knock', lasso: 'grab', splash: 'slam', barbell: 'multi',
  boomerang: 'lash', vortex: 'ring', pulse: 'ring', decoy: 'slam', swarm: 'multi', hook: 'grab', beat: 'ring', root: 'slam', flurry: 'crow' };
const ROSTER = R.map(([id, vi, en, k, svi, sen, dvi, den], i) => ({ id, i, vi, en, k: KIMPL.has(k) ? k : (KFALL[k] || 'lash'), plan: k, svi, sen, dvi, den }));
/* 2026-10-11 anh: DẠNG BIẾN HÌNH (bạn tập mạnh) — đầu tiên Sừng Bò: Cơ bản → Bò Tót (Trung cấp, ≤ 66 % máu) → Ngưu Ma (Cao cấp, ≤ 33 % máu).
   Ngưu Ma Vương (Tối thượng) chỉ có ở thử thách riêng 'sungbo_king' — mở khi thắng Sừng Bò đã lên Cao cấp. Mỗi dạng = bộ ảnh PixelLab v3 riêng
   (spar.json: sungbo_t1/t2/t3, tools/px-spar-form.py). Đổi dạng giữa trận = cảnh ngắn: chậm thời gian + phóng to vào hắn + cột lửa PixelLab
   spar_transform + sóng chấn + gầm + rung; người chơi miễn sát thương suốt cảnh. */
const FORMS = { sungbo: [
  { id: 'sungbo' },
  { id: 'sungbo_t1', at: 0.66, vi: 'Bò Tót', en: 'Raging Bull', tvi: 'Trung cấp', ten: 'Intermediate', bar: '#e8602a', move: 'charge2', sp: 1.12, dmg: 1.15 },
  { id: 'sungbo_t2', at: 0.33, vi: 'Ngưu Ma', en: 'Bull Demon', tvi: 'Cao cấp', ten: 'Advanced', bar: '#c02a20', move: 'firecharge', sp: 1.22, dmg: 1.3 },
  { id: 'sungbo_t3', vi: 'Ngưu Ma Vương', en: 'Bull Demon King', tvi: 'Tối thượng', ten: 'Ultimate', bar: '#8a1010', move: 'king', sp: 1.3, dmg: 1.45, big: true } ] };   /* 2026-10-11 anh: to nhờ ảnh SINH Ở CỠ THẬT (canvas 84, ô 120×108), vẽ 1:1 — cấm scale > 1 (pixel to lệch mật độ) */
/* 2026-10-11 anh: dạng biến hình cho các bạn tập khác (chỉ Trung cấp + Cao cấp; Tối thượng để sau). cfg = ghép đè SKILLCFG khi ở dạng đó:
   twice = ra đòn đặc trưng 2 lần liền (lần 2 báo lại 0,6 s) · fire = đòn rơi xuống để lại lửa cháy ~3 s (spar_firepatch). Ảnh: tools/px-spar-evo.py. */
const EVO = (id, a, b, ca, cb) => { FORMS[id] = [{ id }, { id: id + '_t1', at: 0.66, vi: a[0], en: a[1], tvi: 'Trung cấp', ten: 'Intermediate', bar: a[2], sp: 1.1, dmg: 1.15, cfg: { twice: true, ...(ca || {}) } },
  { id: id + '_t2', at: 0.33, vi: b[0], en: b[1], tvi: 'Cao cấp', ten: 'Advanced', bar: b[2], sp: 1.18, dmg: 1.3, cfg: { twice: true, fire: true, ...(cb || {}) } }]; };
EVO('dauvuong', ['Khối Thép', 'Steel Block', '#8fa3b8'], ['Khối Hắc Thạch', 'Obsidian Block', '#c0441a'], { alt: 'dash' }, { alt: 'dash', ult: 'rain', rainImg: 'ult_rock_obsidian', rainHit: 'ult_magmahit', ultStart: 'ult_quakering' });   /* Trung cấp: Giáng ×2 + Húc Khối Thép (lao thẳng); Cao cấp: + lửa + tuyệt chiêu Mưa Hắc Thạch (đá rơi khắp sàn) */
EVO('maoga', ['Gà Chọi', 'Fighting Rooster', '#d2302a'], ['Phượng Lửa', 'Fire Phoenix', '#ff8a1a'], { alt: 'peck' }, { alt: 'peck', ult: 'rain', rainImg: 'ult_feather_fire', rainHit: 'ult_firehit', ultStart: 'ult_firering' });   /* Trung cấp: Gáy ×2 + Mổ Cựa; Cao cấp: + lửa + tuyệt chiêu MƯA LÔNG LỬA */
EVO('batup', ['Bát Đồng', 'Bronze Bowl', '#c87a3a'], ['Bát Hắc Kim', 'Black-Gold Bowl', '#d8a820'], { alt: 'knock', r: 20, off: 18 }, { alt: 'knock', r: 22, off: 18, ult: 'rain', rainImg: 'ult_bowl_iron', rainHit: 'ult_magmahit', ultStart: 'ult_quakering' });   /* Trung cấp: vòng ôm to hơn + Húc Bát Đồng; Cao cấp: quật xuống để lửa + tuyệt chiêu MƯA BÁT ÚP */
EVO('riatrau', ['Trâu Điên', 'Mad Buffalo', '#b0402a'], ['Trâu Thần Sấm', 'Thunder Buffalo', '#3a7ae8'], { alt: 'charge' }, { alt: 'charge', ult: 'rain', rainHit: 'ult_bolt', rainLead: 0.28, ultStart: 'ult_thunderring' });   /* Trung cấp: Quất Ria ×2 + Húc Trâu; Cao cấp: + lửa + tuyệt chiêu SẤM SÉT GIÁNG khắp sàn */
EVO('caro', ['Vua Cờ', 'Chess King', '#e8e8e8'], ['Đại Kiện Tướng', 'Grandmaster', '#8a5ad8'], { alt: 'spin' }, { alt: 'spin', ult: 'rain', rainImg: 'ult_chess_king', ultStart: 'ult_quakering' });   /* Trung cấp: Bàn Cờ ×2 + Xoay Quân; Cao cấp: + lửa + tuyệt chiêu CHIẾU TƯỚNG (quân cờ đá rơi khắp sàn) */
EVO('cambua', ['Cằm Thép', 'Steel Jaw', '#8fa3b8'], ['Cằm Thiên Thạch', 'Meteor Chin', '#e0461a'], { alt: 'slam' }, { alt: 'slam', ult: 'fissure', rainHit: 'ult_magmahit', ultStart: 'ult_firering' });   /* Trung cấp: Hất Cằm ×2 + Giáng Cằm (nhảy giáng); Cao cấp: + lửa + tuyệt chiêu ĐỊA CHẤN NỨT TOÁC (8 làn nứt dung nham xuyên sàn) */
EVO('lucsi', ['Lực Sĩ Thép', 'Steel Hulk', '#8fa3b8'], ['Titan Vàng', 'Golden Titan', '#e8b020'], { alt: 'charge' }, { alt: 'charge', ult: 'rain', rainImg: 'barbell', rainHit: 'ult_magmahit', ultStart: 'ult_quakering' });   /* Trung cấp: Ném Tạ ×2 + Húc Vai; Cao cấp: + lửa + tuyệt chiêu MƯA TẠ (tạ PixelLab rơi khắp sàn) */
EVO('biker', ['Kỵ Sĩ Lửa', 'Flame Rider', '#ff6a1a'], ['Bão Thép', 'Chrome Storm', '#9ad8ff'], { alt: 'slam' }, { alt: 'slam', ult: 'fissure', rainHit: 'ult_firehit', ultStart: 'ult_thunderring' });   /* Trung cấp: Phóng Xế ×2 (vẫn quay đầu) + Đạp Bốc Đầu; Cao cấp: + vệt lửa + tuyệt chiêu ĐƯỜNG ĐUA TỬ THẦN (8 vệt lốp cháy toả khắp sàn) */
EVO('bonggon', ['Bông Tuyết', 'Frost Puff', '#8ad0ff'], ['Vua Bão Tuyết', 'Blizzard King', '#4a9ad8'], { alt: 'multi' }, { alt: 'multi', fire: false, ult: 'rain', rainImg: 'ult_ice_chunk', rainHit: 'ult_icehit', ultStart: 'ult_frostring' });   /* Trung cấp: Sóng Bông ×2 + Gai Băng (3 chỗ); Cao cấp: + lửa + tuyệt chiêu BÃO TUYẾT (băng rơi khắp sàn) */
EVO('bittai', ['Cổ Thép', 'Steel Neck', '#8fa3b8'], ['Hạc Vương', 'Crane Master', '#e8c040'], { alt: 'charge', neck: 'bittai_t1_neck' }, { alt: 'charge', neck: 'bittai_t2_neck', ult: 'fissure', rainHit: 'ult_magmahit', ultStart: 'ult_quakering' });   /* Trung cấp: Mổ Cổ Dài ×2 + Lao Cổ; Cao cấp: + lửa + tuyệt chiêu BÁT PHƯƠNG HẠC MỔ (8 làn mổ nứt đất toả khắp sàn) */
ROSTER.push({ id: 'sungbo_king', i: 900, chal: 'sungbo', form: 3, vi: 'Ngưu Ma Vương', en: 'Bull Demon King', k: 'charge', plan: 'charge', svi: 'Thiên Thạch Dậm', sen: 'Meteor Stomp',
  dvi: 'Thử thách: Sừng Bò ở dạng Tối thượng — húc liên hoàn 3 lần, rồi bật lên cao giáng như thiên thạch xuống vòng tròn lớn đã báo. Thưởng gấp đôi.', den: 'Challenge: Bull Horns in his Ultimate form — a triple bull rush, then a leaping meteor slam onto a big marked ring. Double rewards.' });
const BYID = Object.fromEntries(ROSTER.map(r => [r.id, r]));
const formsOf = r => FORMS[r.chal || r.id] || null;
const dataId = id => id === 'sungbo_king' ? 'sungbo_t3' : id;
const sheetId = mo => mo.formId || (mo.spar && (mo.spar.chal ? 'sungbo_t3' : mo.spar.id));
/* kiểu đòn: tele = thời gian báo trước (dấu tĩnh + tư thế lấy đà), go = thời gian ra đòn, range = khoảng cách muốn đứng để ra đòn */
const K = {
  slam: { tele: 0.85, go: 0.45, r: 22, range: 70, mul: 1.1, leap: 0.36 },   /* leap: nhảy tới rồi giáng xuống ĐÚNG lúc 0,36 s (vẫn trong vùng đã báo) */
  multi: { tele: 0.85, go: 0.6, r: 15, n: 3, gap: 0.2, range: 80, mul: 0.8 },
  spin: { tele: 0.8, go: 0.45, r: 34, range: 26, mul: 1 },
  ring: { tele: 0.9, go: 0.4, r0: 16, r1: 58, range: 34, mul: 1 },
  lash: { tele: 0.7, go: 0.35, len: 58, w: 12, range: 46, mul: 1 },
  peck: { tele: 0.6, go: 0.3, len: 46, w: 9, range: 40, mul: 0.9 },
  knock: { tele: 0.6, go: 0.3, r: 16, off: 15, kb: 46, range: 24, mul: 1 },
  grab: { tele: 0.8, go: 0.32, r: 15, off: 14, kb: 60, range: 34, mul: 1.3, lunge: 120, hold: 1.2, need: 5, whiff: 1.05 },   /* Ôm Quật: lao tới ôm; trúng → nhấc bổng hold giây (bấm E need lần để vùng ra) → quật ra sau; hụt → loạng choạng whiff giây */
  crow: { tele: 0.8, go: 0.5, len: 64, half: 0.6, range: 48, mul: 0.8, rec: 1.05, hitAt: 0.12 },   /* Mào Gà: nón sóng âm (len px, nửa góc half rad); gáy xong thở dốc rec giây */
  charge: { tele: 0.9, go: 0.6, len: 96, w: 14, sp: 190, kb: 30, range: 86, mul: 1.1 },
  dash: { tele: 0.7, go: 0.6, len: 120, w: 12, sp: 240, kb: 24, range: 104, mul: 1 },
  fissure: { tele: 1.1, go: 0.9, n: 8, len: 170, w: 16, range: 999, mul: 1.2, anim: 0.5 },   /* tuyệt chiêu 'nứt toác': 8 làn nứt toả ra từ hắn xuyên cả sàn, khe giữa các làn là chỗ an toàn */
  rain: { tele: 1.0, go: 2.8, r: 18, n: 15, gap: 0.12, sep: 46, range: 999, mul: 1.2, fall: 0.4, anim: 0.5 },   /* tuyệt chiêu Cao cấp 'mưa' khắp sàn: N vòng đỏ, vật rơi lần lượt, khe giữa các vòng là chỗ an toàn */
  barbell: { tele: 1.0, go: 1.35, r: 17, n: 2, gap: 0.35, fly: 0.62, spread: 34, range: 96, mul: 1.1, anim: 0.45 },   /* Ném Tạ (Lực Sĩ): 2 quả tạ bay vòng cung, đất báo chỗ rơi; rơi trúng = hất tung */
};
const vi = ctx => ctx.lang() === 'vi';
const L = ctx => (vi(ctx) ? {
  call: 'Gọi bạn tập', talk: 'Nói chuyện', close: 'Đóng', title: 'Gọi bạn tập', sub: 'Chọn một người để tập đấu. Không mất đồ, không ngất — còn 1 máu là chịu thua.',
  locked: 'Chưa mở — thắng người trước để mở', wins: n => `Thắng ${n}`, pick: 'Gọi', ask: 'Xealist: "Muốn nói chuyện, hay muốn đổ mồ hôi?"',
  start: n => `🥊 Tập với ${n}! Ra khỏi vòng sàn tập là kết thúc.`, startR: n => `🥊 ${n} chặn đường đèo! Thắng mới qua — thua thì về chân đèo, hồi máu, đánh lại.`, startA: n => `🥊 Tập với ${n}! Đấu tự do khắp Sàn Đấu Ngầm — đuối thì tự nhận thua, không mất đồ.`, win: (n, x) => `🏆 Thắng ${n} — +${x} kinh nghiệm`, unlock: n => `Mở khóa bạn tập mới: ${n}`,
  yield: n => `🏳 Bạn chịu thua ${n} — hồi lại một nửa máu. Tập tiếp nhé!`, out: 'Ra khỏi vòng sàn tập — trận tập kết thúc', gun: 'Trận tập: không dùng Súng Hóa Đá',
  busy: 'Đang có trận tập rồi', kingOpen: '🔥 Thử thách mới: NGƯU MA VƯƠNG (dạng Tối thượng của Sừng Bò)', formCall: (n, t) => `${n} — ${t}!`, goArena: 'Muốn đấu tập thì ra Sàn Đấu Ngầm — phía đông Làng Xuất Phát', grabbed: n => `Bị ôm nhấc bổng! Bấm E liên tục (${n} lần) để vùng ra`, brokeFree: 'Vùng ra được!', mash: (a, n) => `Vùng ra! (${a}/${n})`, stunned: n => `${n} húc trượt — CHOÁNG! Đánh ngay!`, hi: ['Vào sàn nào!', 'Tới đây!', 'Chuẩn bị chưa?', 'Tập thôi!'], bye: 'Cảm ơn trận đấu!', hp: 'Bạn tập', water: 'Dưới nước không tập được', soon: 'Bạn tập này sắp có', soonName: 'Sắp có', soonCard: 'Đang vẽ — sắp ra mắt',
} : {
  call: 'Call a sparring partner', talk: 'Talk', close: 'Close', title: 'Call a sparring partner', sub: 'Pick someone to spar with. No item loss, no fainting — at 1 HP you yield.',
  locked: 'Locked — beat the previous partner to unlock', wins: n => `Wins ${n}`, pick: 'Call', ask: 'Xealist: "Want to talk, or want to sweat?"',
  start: n => `🥊 Sparring with ${n}! Leave the ring to end the bout.`, startR: n => `🥊 ${n} blocks the pass! Win to get through — lose and you go back down, healed, to try again.`, startA: n => `🥊 Sparring with ${n}! Fight anywhere in the Underground Ring — you yield at 1 HP, no items lost.`, win: (n, x) => `🏆 You beat ${n} — +${x} XP`, unlock: n => `New sparring partner unlocked: ${n}`,
  yield: n => `🏳 You yield to ${n} — healed back to half. Keep training!`, out: 'You left the ring — the bout is over', gun: 'Sparring: no Petrify Gun',
  busy: 'A bout is already on', kingOpen: '🔥 New challenge: BULL DEMON KING (Bull Horns, Ultimate form)', formCall: (n, t) => `${n} — ${t}!`, goArena: 'Sparring happens in the Underground Ring — east side of Harbor Village', grabbed: n => `Grabbed and lifted! Mash E (${n}x) to break free`, brokeFree: 'You broke free!', mash: (a, n) => `Break free! (${a}/${n})`, stunned: n => `${n} missed and is STUNNED — hit now!`, hi: ['Into the ring!', 'Come on!', 'Ready?', "Let's train!"], bye: 'Thanks for the bout!', hp: 'Partner', water: 'No sparring underwater', soon: 'This partner is coming soon', soonName: 'Coming soon', soonCard: 'Being drawn — coming soon',
});
const nm = (ctx, r) => (vi(ctx) ? r.vi : r.en);
const ST = { ctx: null, data: null, imgs: {}, fx: {}, b: null, leave: null, loading: null };
function sv(ctx) { const s = ctx.S.save; s.sys ||= {}; const d = (s.sys.spar ||= {}); if (!(d.unlocked >= N0)) d.unlocked = N0; d.rec ||= {}; d.trained ||= []; return d; }   /* save cũ: thiếu → tạo, mở sẵn 6 người */
function img(src) { if (!ST.imgs[src]) { const i = new Image(); i.src = 'assets/px/' + src; ST.imgs[src] = i; } const i = ST.imgs[src]; return i.complete && i.naturalWidth ? i : null; }
function loadData() {
  if (ST.loading) return ST.loading;
  ST.loading = fetch('assets/px/spar/spar.json').then(r => r.json()).then(js => { ST.data = js; for (const [k, v] of Object.entries(js)) { if (k === '_fx') { for (const f of Object.values(v)) img(f.file || f); } else { img(v.file); img(v.face); if (v.bow) img(v.bow.file); } } }).catch(() => { ST.data = {}; });
  return ST.loading;
}
const fxImg = k => { const f = ST.data && ST.data._fx && ST.data._fx[k]; return f ? img(f.file || f) : null; };
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const snap8 = a => Math.round(a / (Math.PI / 4)) * (Math.PI / 4);
const faceOf = (dx, dy) => (Math.abs(dx) >= Math.abs(dy) ? (dx >= 0 ? 2 : 1) : (dy >= 0 ? 0 : 3));   /* 0 S · 1 W · 2 E · 3 N (giống monsters) */
const segDist = (px, py, x0, y0, a, len) => { const ux = Math.cos(a), uy = Math.sin(a), t = Math.max(0, Math.min(len, (px - x0) * ux + (py - y0) * uy)); return Math.hypot(px - (x0 + ux * t), py - (y0 + uy * t)); };

/* 2026-10-11 anh báo Sừng Bò đứng im ở mép sàn: bước đi hợp lệ = không vào ô cứng VÀ (còn trong vòng HOẶC gần tâm hơn) — bị hất/húc ra sát/ngoài mép vẫn đi về được;
   bước thẳng bị chặn thì thử trượt theo trục x / y. */
function stepMo(ctx, b, mo, nx, ny) {
  const m = ctx.S.map, r0 = Math.hypot(mo.x - b.ring.x, mo.y - b.ring.y);
  const inS = ctx.isSolid(m, Math.floor(mo.x / 16), Math.floor(mo.y / 16));   /* đang lọt trong ô cứng (bị hất vào) → bước nào cũng được để thoát ra */
  const ok = (x, y) => (inS || !ctx.isSolid(m, Math.floor(x / 16), Math.floor(y / 16))) && (Math.hypot(x - b.ring.x, y - b.ring.y) < RING_R || Math.hypot(x - b.ring.x, y - b.ring.y) < r0);
  if (ok(nx, ny)) { mo.x = nx; mo.y = ny; return true; }
  const dx = nx - mo.x, dy = ny - mo.y, l = Math.hypot(dx, dy) || 1;
  if (!(b.sideN > 0)) {
    if (ok(nx, mo.y) && Math.abs(dx) > 0.05 * l) { mo.x = nx; return true; }
    if (ok(mo.x, ny) && Math.abs(dy) > 0.05 * l) { mo.y = ny; return true; }
  } else b.sideN--;
  for (const sd of [b.side || 1, -(b.side || 1)]) { const sx = mo.x - dy * sd, sy = mo.y + dx * sd; if (ok(sx, sy)) { if (!(b.sideN > 0)) b.sideN = 20; b.side = sd; mo.x = sx; mo.y = sy; return true; } }   /* thẳng mặt vào cột / đồ: bước ngang ~20 nhịp cùng một phía để vòng qua (không lắc qua lại) */
  return false;
}
function applyForm(mo, F, s) { { const bid = mo.spar && (mo.spar.chal || mo.spar.id); if (bid) SKILLCFG[bid] = { ...(SKILLBASE[bid] || {}), ...(F.cfg || {}) }; } mo.formId = F.id;   /* đòn đặc trưng nâng cấp theo dạng (FORMS[].cfg) */
 mo.c = { ...mo.c, sp: 48 * (F.sp || 1), dmg: Math.round((s ? s.dmg : mo.c.dmg) * (F.dmg || 1)) }; mo.scale = 1; mo.big = !!F.big; mo.rage = F.bar || null; const k = bodyK(F.id); mo.c.w = Math.round(16 * k); mo.c.h = Math.round(28 * k); }
function bodyK(id) { const d = ST.data && ST.data[id]; return d && d.h ? Math.max(1, d.h / 54) : 1; }   /* thân cao hơn bạn tập thường (~54 px ảnh = 27 px logic) bao nhiêu lần — bóng, hộp chọn, nhãn đầu */
function fallForm(ctx, mo) {   /* anh 2026-10-11: bị đánh bại HẲN (hết máu) mới lên dạng kế, hồi đầy máu ở dạng mới */
  const b = ST.b; if (!b || b.mo !== mo || b.cine) return false; if (b.maxForm != null && b.form >= b.maxForm) return false;   /* plan-28: đường đèo giới hạn dạng tối đa theo đoạn */
  const FS = formsOf(b.r), nx = FS && FS[b.form + 1]; if (!nx || !(ST.data && ST.data[nx.id]) || (!b.r.chal && nx.at == null)) return false;   /* dạng chưa có ảnh → không biến hình */   /* trận thường dừng ở Cao cấp; Tối thượng chỉ ở thử thách */
  mo.hp = 1; mo.state = mo.state === 'dead' ? 'idle' : mo.state; startCine(ctx, b, mo, b.form + 1); b.cine.refill = true; return true;
}
function startCine(ctx, b, mo, idx) {   /* cảnh biến hình ~1,2 s (thời gian thật): chậm + phóng to + gầm; người chơi miễn sát thương */
  b.cine = { t: 0, idx, swapped: false }; b.atk = null; mo.moving = false; if (ctx.knockRelease) ctx.knockRelease();
  if (ctx.hero && ctx.hero.iframes) ctx.hero.iframes(2.2); ctx.S.timeScale = 0.2; ctx.S.camFocus = { x: mo.x, y: mo.y - 14 }; ctx.S.camZoom = 1;
  ctx.sfx('spar_roar'); if (ctx.quake) ctx.quake(0.2);
}
function cineTick(ctx, rdt) {
  const b = ST.b, c = b && b.cine; if (!c) return; const mo = b.mo, F = formsOf(b.r)[c.idx]; c.t += rdt;
  ctx.S.camZoom = 1 + 0.7 * Math.min(1, c.t / 0.35) * (c.t > 1.0 ? Math.max(0, 1 - (c.t - 1.0) / 0.25) : 1); ctx.S.camFocus = { x: mo.x, y: mo.y - 14 };
  if (!c.swapped && c.t >= 0.45) { c.swapped = true; b.form = c.idx; b.skN = 0; applyForm(mo, F, b.s); if (c.refill) mo.hp = mo.max; if (ctx.vfx) { ctx.vfx('spar_transform', mo.x, mo.y + 4, 0, true); ctx.vfx('spar_shock', mo.x, mo.y + 10); } if (ctx.quake) ctx.quake(0.45); ctx.sfx('spar_thud'); }
  if (c.t >= 1.25) { b.cine = null; ctx.S.timeScale = 1; ctx.S.camZoom = 1; ctx.S.camFocus = null; b.cd = 0.5; b.st = 'fight'; ctx.toast(L(ctx).formCall(vi(ctx) ? F.vi : F.en, vi(ctx) ? F.tvi : F.ten), true); }
}
function formNext(ctx, b, mo, p, A) {   /* sau một cú húc của dạng biến hình */
  if (A.mv === 'charge2' && A.chain < 1) { b.atk = null; startAtk(ctx, b, mo, p, 'charge', { chain: 1 }); return true; }   /* Bò Tót: húc 2 làn liên tiếp */
  if (A.mv === 'king' && A.chain < 2) { b.atk = null; startAtk(ctx, b, mo, p, 'charge', { chain: A.chain + 1 }); return true; }   /* Ngưu Ma Vương: húc liên hoàn 3 lần */
  if (A.mv === 'firecharge' && !A.stomped) { b.atk = null; startAtk(ctx, b, mo, p, 'ring', { tele: 0.6 }); const S2 = b.atk; if (S2) { S2.shapes[0].r0 = 6; S2.shapes[0].r1 = 54; S2.stomp = true; } return true; }   /* Ngưu Ma: dậm sóng chấn sau cú húc */
  return false;
}
/* ---------------- trận tập ---------------- */
function stats(ctx, r) {
  const h = ctx.hero, lv = h ? h.lv : 1, tier = ctx.tool ? ctx.tool.tier('sword') : 0;
  const atk = h ? h.atk + h.weaponBonus(tier) : 10, mul = ctx.atkMul ? ctx.atkMul() : 1;   /* sức đánh thật của người chơi → ~9–12 nhát mới hạ (công bằng ở mọi cấp) */
  return { hp: Math.round(atk * mul * (9 + r.i * 0.08)), dmg: Math.max(4, Math.round(maxHp(lv) * (0.1 + r.i * 0.0015))), xp: 8 + 4 * lv };
}
const ready = id => !!(ST.data && ST.data[dataId(id)]);
const isOn = (ctx, r) => ready(r.id) && (r.chal ? !!(sv(ctx).kings || {})[r.chal] : r.i < sv(ctx).unlocked);   /* có ảnh PixelLab trong spar.json mới gọi được */
function summon(ctx, id, force, opt = null) {   /* opt (plan-28, đường đèo): { at:{x,y}, ring:{x,y,r}, rect:{x0,y0,x1,y1} px, max, lv, sword, mul, outFn(p), onEnd(why, b) } */
  const r = BYID[id], p = ctx.S.player; if (!r || !ctx.monsters || !ctx.monsters.add) return false;
  if (opt) force = true;
  if (!force && !ready(id)) { ctx.toast(L(ctx).soon); return false; }
  if (!force && (r.chal ? !(sv(ctx).kings || {})[r.chal] : r.i >= sv(ctx).unlocked)) { ctx.toast(L(ctx).locked); return false; }   /* thử thách: thắng bản thường đã lên Cao cấp mới mở */   /* chưa mở (thắng người trước mới mở) */
  if (ST.b) { ctx.toast(L(ctx).busy); return false; }
  if (ctx.isUnderwater && ctx.isUnderwater()) { ctx.toast(L(ctx).water); return false; }
  const s = stats(ctx, r.chal ? BYID[r.chal] : r), m = ctx.S.map; if (r.chal) { s.hp = Math.round(s.hp * 1.8); s.dmg = Math.round(s.dmg * 1.2); s.xp = Math.round(s.xp * 2.5); }
  if (opt) {   /* plan-28: sức bạn tập đường đèo theo CẤP VÙNG (không yếu đi khi người chơi yếu), ×mul tăng dần theo đoạn */
    const h = ctx.hero, atkZ = baseAtk(opt.lv || 1) + (h ? h.weaponBonus(opt.sword || 0) : 0), atkP = h ? h.atk + h.weaponBonus(ctx.tool ? ctx.tool.tier('sword') : 0) : 10, mu = opt.mul || 1;
    s.hp = Math.round(Math.max(atkZ, atkP) * (9 + r.i * 0.08) * mu); s.dmg = Math.round(Math.max(s.dmg, maxHp(opt.lv || 1) * (0.1 + r.i * 0.0015)) * mu); s.xp = Math.round(Math.max(s.xp, 8 + 4 * (opt.lv || 1)) * (1 + 0.1 * mu));
  }
  const ar = opt ? null : m.sparRing;   /* 2026-10-11 anh: chỉ đấu ở Sàn Đấu Ngầm; đấu TỰ DO khắp vùng (RING_R rất lớn: không còn 'ra khỏi vòng là hết trận') — hết trận khi thua/thắng/rời vùng */
  if (!ar && !force) { ctx.toast(L(ctx).goArena); return false; }
  let px = p.x + 34, py = p.y, ring;
  if (opt) { RING_R = 9999; px = opt.at.x; py = opt.at.y; ring = { x: opt.ring.x, y: opt.ring.y }; }   /* đường đèo: bạn tập đứng tại chỗ chờ, tường thật của đèo giữ trận trong đèo */
  else if (ar) { RING_R = 9999; p.x = ar.x - 40; p.y = ar.y; p.dir = 2; p.autoPath = null; px = ar.x + 40; py = ar.y; ring = { x: ar.x, y: ar.y }; if (ctx.vfx) ctx.vfx('dirt_puff', p.x, p.y + 2); }   /* bước vào giữa sàn, bạn tập đứng đối diện */
  else { RING_R = 86; for (const [dx, dy] of [[34, 0], [-34, 0], [0, 26], [0, -26], [24, 20], [-24, 20]]) { const tx = Math.floor((p.x + dx) / 16), ty = Math.floor((p.y + dy) / 16); if (!ctx.isSolid(m, tx, ty)) { px = p.x + dx; py = p.y + dy; break; } } }
  const c = { key: 'spar_' + id, vi: r.vi, en: r.en, hp: s.hp, dmg: s.dmg, armor: 0, sp: 48, xp: 0, w: 16, h: 28, spar: true, c: ['#e8d0b0', '#4a3324', '#ffd45e'], aiFn: ai, drawFn: draw, onDown: mo => end(ctx, 'win', mo), onFall: mo => fallForm(ctx, mo) };
  const mo = ctx.monsters.add(c, px, py); mo.face = faceOf(p.x - px, p.y - py); mo.spar = r; mo.pose = 'idle'; mo.angry = true;
  const FS = formsOf(r), f0 = r.chal ? r.form : 0; SKILLCFG[r.chal || r.id] = SKILLBASE[r.chal || r.id]; if (FS) { mo.formId = FS[f0].id; if (f0) applyForm(mo, FS[f0], s); }   /* về đòn gốc mỗi trận */
  ST.b = { r, mo, ring: ring || { x: p.x + (px - p.x) / 2, y: p.y + (py - p.y) / 2 }, arena: !!ar || !!opt, form: r.chal ? r.form : 0, st: 'intro', t: 1.1, cd: 0.8, atk: null, s, hits: 0, road: opt, maxForm: opt ? opt.max : null, area: opt ? { ...opt.ring, rect: opt.rect } : null };
  if (ctx.hold) { const w = ctx.tool.tier('sword') > 0 ? 'sword' : 'axe'; if (!(ctx.holding && ctx.holding(w))) ctx.hold(w); }
  ctx.bubble && ctx.bubble(mo, L(ctx).hi[r.i % 4], 1.6); ctx.sfx('spar_bell'); ctx.toast(opt ? L(ctx).startR(nm(ctx, r)) : L(ctx)[ar ? 'startA' : 'start'](nm(ctx, r)), true);
  if (ctx.vfx) ctx.vfx('dirt_puff', px, py + 2);
  return true;
}
function end(ctx, why, moDead) {
  const b = ST.b; if (!b) return; ST.b = null; if (ctx.knockRelease) ctx.knockRelease(); if (b.cine || ctx.S.timeScale !== undefined) { ctx.S.timeScale = 1; ctx.S.camZoom = 1; ctx.S.camFocus = null; } const t = L(ctx), d = sv(ctx), r = b.r, mo = b.mo, rec = (d.rec[r.id] ||= { w: 0, l: 0 });
  if (!moDead && ctx.monsters && ctx.monsters.remove) ctx.monsters.remove(mo);
  rec.last = ctx.clock ? ctx.clock.dayIndex : 0;
  if (why === 'win') {
    if (!b.road) { rec.w++; if (!d.trained.includes(r.id)) d.trained.push(r.id); }   /* plan-28: thắng trên đường đèo KHÔNG đụng tiến trình mở khóa Sàn Đấu (anh chốt) */
    const xp = b.s.xp; ctx.toast(t.win(nm(ctx, r), xp), true); ctx.sfx('win'); if (ctx.hero) ctx.hero.gainXp(xp);
    try { ST.lastLoot = winLoot(ctx, r.chal ? r.id : r.id, b.form, mo.x, mo.y + 4); } catch (e) { console.error('roadloot', e); }   /* plan-28: đồ rơi ra đất + Ngọc Rồng */
    if (ctx.onMonsterDown) { try { ctx.onMonsterDown(mo, Math.round(xp * 0.8)); } catch (e) { } }   /* Rocky cùng nhận kinh nghiệm (pet.js) */
    if (!b.road && formsOf(r) && formsOf(r).length > 3 && !r.chal && b.form >= 2 && !(d.kings || {})[r.id]) { (d.kings ||= {})[r.id] = true; setTimeout(() => ctx.toast(t.kingOpen, true), 2200); }   /* thắng Sừng Bò đã lên Cao cấp → mở thử thách Ngưu Ma Vương */
    if (!b.road && !r.chal && r.i === d.unlocked - 1 && d.unlocked < ROSTER.length) { d.unlocked++; if (ready(ROSTER[d.unlocked - 1].id)) setTimeout(() => ctx.toast(t.unlock(nm(ctx, ROSTER[d.unlocked - 1]))), 1400); }
  } else if (why === 'yield') {
    if (!b.road) rec.l++; const h = ctx.hero; if (h) h.heal(Math.max(0, Math.round(h.max * 0.5 - h.hp))); ctx.toast(t.yield(nm(ctx, r)), true); ctx.sfx('spar_bow');
  } else if (why === 'out') { ctx.toast(t.out); ctx.sfx('spar_bow'); }
  ctx.persist();
  if (why !== 'zone') { ST.leave = { r, x: mo.x, y: mo.y, face: 0, t: 0, flash: 0 }; ctx.bubble && ctx.bubble(ST.leave, t.bye, 1.6); }   /* cúi chào 1,2 s rồi đi khỏi */
  ST.last = { why, id: r.id, t: ctx.S.time, road: !!b.road, form: b.form };
  if (b.road && b.road.onEnd) { try { b.road.onEnd(why, b); } catch (e) { console.error('road onEnd', e); } }   /* road.js: mở cổng / về chân đèo / hồi sinh sau 60 s */
}
/* VFX PixelLab riêng cho đòn đặc trưng (vfx_workbench → px-vfx.py): [tên, dời y của điểm đáy] */
const SKILLFX = { dauvuong: ['spar_blockslam', 16] };
/* chỉnh riêng đòn đặc trưng từng người: Sừng Bò húc dài + nhanh; đường húc chạm ô cứng / mép vòng → húc trượt vào đó thì CHOÁNG (sơ hở lớn) */
const SKILLCFG = { biker: { len: 150, sp: 265, tele: 0.8, back: true, trail: 'spar_chargedust', power: 1.1, impact: 'spar_heavyhit', tangle: 1.0 }, lucsi: { tangle: 1.0 }, cambua: { tele: 0.8, r: 19, off: 17, lunge: 8, react: ['uppercut', 1.3], impact: 'spar_heavyhit', shake: 0.2, col: 'r', tangle: 1.2 }, bittai: { len: 88, w: 10, tele: 0.8, go: 0.5, hitAt: 0.13, ext: 0.14, hold: 0.18, ret: 0.18, neck: 'bittai_neck', range: 84, react: ['stagger', 1.5], tangle: 1.0 }, bonggon: { wave: 'spar_afrowave', react: ['fly', 0.75], tangle: 1.1, tele: 0.9, go: 0.7, land: 0.32, hopH: 18, col: 'r' },riatrau: { len: 64, tele: 0.8, whip: 'spar_whip', react: ['stagger', 1.7], tangle: 1.2 }, sungbo: { len: 150, sp: 235, stun: 1.5, power: 1.25, trail: 'spar_chargedust', impact: 'spar_hornhit' } };
const SKILLBASE = Object.fromEntries(Object.entries(SKILLCFG).map(([k, v]) => [k, { ...v }]));   /* bản gốc; dạng biến hình ghép thêm F.cfg */
function fireAt(sh) {   /* dạng Cao cấp: đòn rơi xuống để lại lửa cháy ~3 s (ảnh PixelLab spar_firepatch, đứng vào là bỏng) */
  const F = (ST.fires ||= []), add = (x, y) => F.push({ x, y, t: 0, life: 3 });
  if (sh.type === 'c') { add(sh.x, sh.y); for (let i = 0; i < 5; i++) { const a = i * 1.2566; add(sh.x + Math.cos(a) * sh.r * 0.7, sh.y + Math.sin(a) * sh.r * 0.6); } }
  else if (sh.type === 'r') { for (let i = 0; i < 8; i++) { const a = i * 0.7854, r = sh.r1 * 0.8; add(sh.x + Math.cos(a) * r, sh.y + Math.sin(a) * r / 1.15); } }
  else if (sh.type === 'cone') { for (let i = -1; i <= 1; i++) for (const f of [0.5, 0.9]) { const a = sh.a + i * sh.half * 0.7; add(sh.x + Math.cos(a) * sh.len * f, sh.y + Math.sin(a) * sh.len * f); } }
  else if (sh.type === 'l') { for (let d = 14; d <= sh.len; d += 14) add(sh.x + Math.cos(sh.a) * d, sh.y + 4 + Math.sin(sh.a) * d); }
}
/* phản ứng trúng đòn theo kiểu đòn (knock.js): jab lảo đảo · móc nặng / húc / lao văng bay lộn vòng · Bàn Cờ / giáng xuống hất tung lên · tóm ném theo cung */
const REACT = { fissure: ['uppercut', 1.2], rain: ['launch', 1.1], barbell: ['launch', 1.1], crow: ['fly', 0.55], slam: ['launch', 1], multi: ['launch', 1], spin: ['fly', 0.7], ring: ['fly', 0.7], lash: ['stagger', 1], peck: ['stagger', 1], knock: ['fly', 0.8], grab: ['throw', 1], charge: ['fly', 1], dash: ['fly', 1] };
function hitRocky(ctx, b, A, key, test, mul, kbx, kby, kb) {   /* anh 2026-10-12: đòn trúng cả Rocky (1 lần mỗi đòn/cú) */
  const R = ctx.rocky, rp = R && R.pos && R.pos(); if (!rp || !A || A[key] || !test(rp)) return false;
  A[key] = true; return R.hitBy(b.s.dmg * mul, b.mo, kbx, kby, Math.max(30, kb || 0));
}
function hitPlayer(ctx, b, mul, kbx, kby, kb, shake = 0.12, react = null) {
  const p = ctx.S.player; if (!ctx.hero) return false;
  const ok = ctx.hero.hit(Math.max(1, Math.round(b.s.dmg * mul)));
  (ST.log ||= []).push({ k: b.atk && b.atk.k, ok, hp: Math.round(ctx.hero.hp), t: +ctx.S.time.toFixed(2) }); if (ST.log.length > 20) ST.log.shift();
  const rx = react || (b.atk && REACT[b.atk.k]);
  if (ok && rx && ctx.knockPlayer) { b.hits++; ctx.knockPlayer({ type: rx[0], power: rx[1], dir: { x: kbx, y: kby }, bound: (x, y) => Math.hypot(x - b.ring.x, y - b.ring.y) < RING_R - 8, src: b.mo }); if (shake && ctx.quake) ctx.quake(shake); return ok; }
  if (ok) { b.hits++; if (kb) { const l = Math.hypot(kbx, kby) || 1, n = 6; for (let i = 0; i < n; i++) { const sx = kbx / l * kb / n, sy = kby / l * kb / n; if (Math.hypot(p.x + sx - b.ring.x, p.y + sy - b.ring.y) > RING_R - 10) break; p.tryMove(sx, sy, ctx.S.map, ctx.allNpcs()); } }   /* bị hất không văng ra khỏi vòng (ra vòng = kết thúc trận) */ if (shake && ctx.quake) ctx.quake(shake); }
  return ok;
}
function startAtk(ctx, b, mo, p, kk, opt = {}) {
  const FS = formsOf(b.r), mv = FS && FS[b.form] && FS[b.form].move;
  if (!kk && mv === 'king' && (b.kingN = (b.kingN || 0) + 1) % 2 === 0) { kk = 'slam'; opt = { meteor: true }; }   /* Ngưu Ma Vương: xen kẽ húc liên hoàn 3 lần ↔ Thiên Thạch Dậm */
  if (!kk) { const cfS = SKILLCFG[b.r.id] || {}, n = (b.skN = (b.skN || 0) + 1); if (cfS.ult && n % 3 === 0) kk = cfS.ult; else if (cfS.alt && n % 2 === 0) kk = cfS.alt; }   /* dạng biến hình: xen đòn giữa (alt, Trung cấp+) và tuyệt chiêu (ult, Cao cấp) */
  kk = kk || b.r.k;
  const k = K[kk], a = Math.atan2(p.y - mo.y, p.x - mo.x), A = { k: kk, ph: 'wind', t: opt.tele || k.tele, shapes: [], chain: opt.chain || 0, mv };
  if (A.k === 'slam') { A.shapes.push({ type: 'c', x: p.x, y: p.y, r: opt.meteor ? 44 : k.r, d: k.leap, meteor: !!opt.meteor }); if (opt.meteor) { A.t = 1.0; A.meteor = true; } const dd = Math.hypot(p.x - mo.x, p.y - mo.y) || 1, back = Math.min(dd, 14); A.leap = { x0: mo.x, y0: mo.y, x1: p.x - (p.x - mo.x) / dd * back, y1: p.y - (p.y - mo.y) / dd * back }; }   /* nhảy tới đáp cạnh tâm vùng giáng */
  else if (A.k === 'multi') { const base = Math.random() * Math.PI * 2; A.shapes.push({ type: 'c', x: p.x, y: p.y, r: k.r, d: 0 }); for (let i = 1; i < k.n; i++) { const aa = base + i * Math.PI; A.shapes.push({ type: 'c', x: p.x + Math.cos(aa) * 26, y: p.y + Math.sin(aa) * 18, r: k.r, d: i * k.gap }); } }
  else if (A.k === 'crow') {   /* đứng sát (≤ 20 px) → quét tay xoay người (lảo đảo); xa hơn → gáy: nón sóng âm về phía người chơi */
    const d = Math.hypot(p.x - mo.x, p.y - mo.y);
    if (d <= 20) { A.bh = true; A.t = 0.35; A.shapes.push({ type: 'c', x: mo.x, y: mo.y, r: 22, light: true, own: true }); }
    else { const aa = snap8(a); A.shapes.push({ type: 'cone', x: mo.x, y: mo.y - 2, a: aa, len: k.len, half: k.half, own: true }); A.a = aa; }
  }
  else if (A.k === 'spin') A.shapes.push({ type: 'c', x: mo.x, y: mo.y, r: k.r });
  else if (A.k === 'fissure') { const a0 = snap8(a); for (let i = 0; i < k.n; i++) { const aa = a0 + i * (Math.PI * 2 / k.n); let len = k.len; for (let d = 8; d <= k.len; d += 6) if (ctx.isSolid(ctx.S.map, Math.floor((mo.x + Math.cos(aa) * d) / 16), Math.floor((mo.y + Math.sin(aa) * d) / 16))) { len = d - 4; break; } A.shapes.push({ type: 'l', x: mo.x, y: mo.y - 2, a: aa, len, w: k.w, d: 0.12 + i * 0.03, fis: true }); } A.ult = true; }   /* làn đầu nhắm đúng người chơi; nứt dừng ở vách */
  else if (A.k === 'rain') { const ar = b.area || ctx.S.map.sparRing || { x: b.ring.x, y: b.ring.y, r: 110 }, inR = (x, y) => !(ar.rect && (x < ar.rect.x0 || x > ar.rect.x1 || y < ar.rect.y0 || y > ar.rect.y1)), R0 = Math.max(60, (ar.r || 110) - 16), pts = [{ x: p.x, y: p.y }]; let n = 0;
    while (pts.length < k.n && n++ < 600) { const aa = Math.random() * 6.283, rr = Math.sqrt(Math.random()) * R0, x = ar.x + Math.cos(aa) * rr, y = ar.y + Math.sin(aa) * rr * 0.9; if (pts.every(q => Math.hypot(q.x - x, q.y - y) > k.sep) && inR(x, y) && !ctx.isSolid(ctx.S.map, Math.floor(x / 16), Math.floor(y / 16))) pts.push({ x, y }); }
    pts.forEach((q, i) => A.shapes.push({ type: 'c', x: q.x, y: q.y, r: k.r, d: 0.25 + i * k.gap + Math.random() * 0.1, rain: true })); A.ult = true; }   /* vòng đầu ngay chỗ người chơi; các vòng cách nhau ≥ sep px → khe an toàn đọc được */
  else if (A.k === 'barbell') { const aa = Math.random() < 0.5 ? 1 : -1, px0 = -Math.sin(a) * aa, py0 = Math.cos(a) * aa; for (let i = 0; i < k.n; i++) { const o = i ? k.spread : 0; A.shapes.push({ type: 'c', x: p.x + px0 * o + Math.cos(a) * o * 0.4, y: p.y + py0 * o * 0.8 + Math.sin(a) * o * 0.4, r: k.r, d: i * k.gap + k.fly, t0: i * k.gap }); } A.a = a; A.shapes = A.shapes.filter((q, i) => !i || !ctx.isSolid(ctx.S.map, Math.floor(q.x / 16), Math.floor(q.y / 16))); }   /* quả 1 rơi đúng chỗ đứng, quả 2 lệch ngang ~2 ô (chặn lối né) */
  else if (A.k === 'ring') A.shapes.push({ type: 'r', x: mo.x, y: mo.y, r0: k.r0, r1: k.r1, d: (SKILLCFG[b.r.id] || {}).wave ? ((SKILLCFG[b.r.id] || {}).land || 0) + 0.15 : 0 });   /* Sóng Bông: nhảy lên, đáp đất lúc land giây → sóng loang tới sau 0,15 s */   /* có VFX sóng: trúng khi sóng loang tới (0,15 s) */
  else if (A.k === 'lash' || A.k === 'peck' || A.k === 'charge' || A.k === 'dash') {
    const aa = snap8(a), cf = SKILLCFG[b.r.id] || {}; let len = cf.len || k.len, wallEnd = false;
    if (A.k === 'lash' || A.k === 'peck') for (let d = 6; d <= len; d += 4) if (ctx.isSolid(ctx.S.map, Math.floor((mo.x + Math.cos(aa) * d) / 16), Math.floor((mo.y - 4 + Math.sin(aa) * d) / 16))) { len = Math.max(10, d - 4); break; }   /* plan-28: quất / mổ dừng ở vách */
    if (A.k === 'charge' || A.k === 'dash') for (let d = 4; d <= len; d += 4) { const x = mo.x + Math.cos(aa) * d, y = mo.y + Math.sin(aa) * d; if (ctx.isSolid(ctx.S.map, Math.floor(x / 16), Math.floor(y / 16)) || Math.hypot(x - b.ring.x, y - b.ring.y) >= RING_R) { len = Math.max(8, d - 6); wallEnd = true; break; } }   /* đường húc dừng ở tường / mép vòng (vẽ đúng chỗ dừng) */
    if ((A.k === 'charge' || A.k === 'dash') && len < 30) { b.cd = 0.4; b.recenter = 0.5; return; }
    if (A.chain) A.t = 0.6;   /* húc nối (Bò Tót / Ngưu Ma Vương): báo ngắn hơn nhưng vẫn ≥ 0,6 s */   /* đường húc bị mép/tường cắt cụt → không húc, lùi vào sàn rồi tính lại */
    A.shapes.push({ type: 'l', x: mo.x, y: mo.y - 4, a: aa, len, w: cf.w || k.w, d: cf.hitAt || 0 }); A.a = aa; A.wallEnd = wallEnd; if (cf.tele && !opt.tele) A.t = cf.tele; }
  else if (A.k === 'knock' || A.k === 'grab') { const aa = snap8(a), cf = SKILLCFG[b.r.id] || {}, off = cf.off || k.off; A.shapes.push({ type: 'c', x: mo.x + Math.cos(aa) * off, y: mo.y + Math.sin(aa) * off, r: cf.r || k.r, front: true }); A.a = aa; }
  { const cf0 = SKILLCFG[b.r.id] || {}; if (cf0.col) A.col = cf0.col; if ((A.k === 'ring' || A.k === 'knock') && cf0.tele && !opt.tele) A.t = cf0.tele; }   /* màu báo + thời gian báo riêng từng người */
  A.T0 = A.t; mo.face = faceOf(p.x - mo.x, p.y - mo.y); mo.pose = 'wind'; mo.pt = 0; b.atk = A; ctx.sfx('spar_charge');
}
/* 2026-10-11 anh: bạn tập 'máu chiến' — COMBO ĐẤM jab → jab → móc nặng khi đứng gần, xen giữa đòn đặc trưng.
   Mỗi cú: lấy đà TĨNH 0,25–0,35 s (vùng đấm nhỏ trước mặt) → ra đòn 0,12 s; lùi khỏi vùng lúc lấy đà là né được.
   Cú nặng: hất văng + khựng hình 0,08 s + rung màn ngắn (chỉ cú này); đánh xong HỞ 0,9 s = lúc người chơi phản đòn. */
const PUNCH = { hits: [{ wind: 0.2, mul: 0.4, kb: 6 }, { wind: 0.18, mul: 0.4, kb: 6 }, { wind: 0.3, mul: 1.0, kb: 44, heavy: true }], go: 0.1, rec: 0.8, r: 13, off: 15, range: 24, cd: 0.8 };   /* 2026-10-11 anh: nhanh hơn — jab ~0,2 s, móc nặng 0,3 s */
function punchShape(mo, p) { const a = snap8(Math.atan2(p.y - mo.y, p.x - mo.x)); return { type: 'c', x: mo.x + Math.cos(a) * PUNCH.off, y: mo.y + Math.sin(a) * PUNCH.off, r: PUNCH.r, light: true, a }; }
function startCombo(ctx, b, mo, p) {
  const sh = punchShape(mo, p); b.atk = { k: 'punch', ph: 'wind', i: 0, t: PUNCH.hits[0].wind, T0: PUNCH.hits[0].wind, shapes: [sh], a: sh.a };
  mo.face = faceOf(p.x - mo.x, p.y - mo.y); mo.pose = 'pwind'; mo.pi = 0; mo.pt = 0;
}
function comboTick(ctx, b, mo, p, dt, canHit) {
  const A = b.atk, H = PUNCH.hits[A.i]; A.t -= dt;
  if (A.ph === 'wind') {
    if (A.t > 0) return;
    A.ph = 'go'; A.t = PUNCH.go; mo.pose = 'pgo'; mo.pt = 0;
    const sh = A.shapes[0], ux = Math.cos(sh.a), uy = Math.sin(sh.a);
    stepMo(ctx, b, mo, mo.x + ux * 5, mo.y + uy * 5);   /* bước dấn tới mỗi cú */
    if (canHit) hitRocky(ctx, b, A, 'rk' + A.i, pt => inShape(sh, pt), H.mul, ux, uy, H.kb);
    if (canHit && inShape(sh, p)) {
      if (hitPlayer(ctx, b, H.mul, ux, uy, H.kb, H.heavy ? 0.16 : 0, H.heavy ? ['fly', 1.1] : ['stagger', 0.5])) {
        ctx.sfx(H.heavy ? 'punch_heavy' : 'punch_light');
        if (H.heavy) { b.stop = 0.08; if (ctx.vfx) { ctx.vfx('spar_heavyhit', p.x + ux * 2, p.y - 6, 0, true); ctx.vfx('dirt_puff', p.x, p.y + 2); } }   /* sao va chạm PixelLab (chỉ cú nặng) */   /* khựng hình 1–2 khung, chỉ cú nặng */
      } else ctx.sfx('spar_whoosh');
    } else ctx.sfx('spar_whoosh');
    return;
  }
  if (A.ph === 'go') {
    if (A.t > 0) return;
    if (A.i < PUNCH.hits.length - 1) { A.i++; A.ph = 'wind'; A.t = A.T0 = PUNCH.hits[A.i].wind; const sh = punchShape(mo, p); sh.heavy = !!PUNCH.hits[A.i].heavy; A.shapes = [sh]; A.a = sh.a; mo.face = faceOf(p.x - mo.x, p.y - mo.y); mo.pose = 'pwind'; mo.pi = A.i; mo.pt = 0; }
    else { A.ph = 'rec'; A.t = PUNCH.rec; A.shapes = []; mo.pose = 'prec'; mo.pt = 0; }   /* HỞ sau cú nặng */
    return;
  }
  if (A.t <= 0) { b.atk = null; b.pcd = PUNCH.cd + Math.random() * 0.5; b.after = true; b.cd = Math.min(b.cd, 0.35); mo.pose = 'idle'; }
}
/* Ôm Quật (kiểu 'grab'): lao tới (vùng ôm trước mặt đi theo thân) → trúng: nhấc bổng (knock 'hold'), bấm E đủ lần thì vùng ra → hết giờ: quật ra SAU lưng (knock 'throw' cung dài + VFX PixelLab spar_bodyslam lúc rơi); hụt → loạng choạng (sơ hở) */
function grabTick(ctx, b, mo, p, dt, canHit, k) {
  const A = b.atk, sh = A.shapes[0], ux = Math.cos(A.a || 0), uy = Math.sin(A.a || 0);
  if (A.ph === 'go') {
    const st = k.lunge * dt, nx = mo.x + ux * st, ny = mo.y + uy * st;
    if (!ctx.isSolid(ctx.S.map, Math.floor(nx / 16), Math.floor(ny / 16)) && Math.hypot(nx - b.ring.x, ny - b.ring.y) < RING_R - 4) { mo.x = nx; mo.y = ny; }
    sh.x = mo.x + ux * k.off; sh.y = mo.y + uy * k.off;
    if (canHit && !(ctx.knocked && ctx.knocked()) && Math.hypot(p.x - sh.x, (p.y - sh.y) * 1.15) < sh.r + 4) {   /* tóm được */
      A.ph = 'hold'; A.t = k.hold; A.mash = 0; A.hit = true; mo.pose = 'hold'; mo.pt = 0; ctx.sfx('spar_grunt');
      if (ctx.knockPlayer) ctx.knockPlayer({ type: 'hold', dir: { x: -ux, y: -uy }, follow: () => (ST.b && ST.b.atk === A ? { x: mo.x, y: mo.y + 1, z: 28 * Math.min(1, (k.hold - A.t) / 0.3) } : null) });
      if (ctx.toast) ctx.toast(L(ctx).grabbed(k.need));
      return;
    }
    if (A.t <= 0) { A.ph = 'stumble'; A.t = k.whiff; mo.pose = 'stumble'; mo.pt = 0; ctx.sfx('spar_whoosh'); }   /* ôm hụt → loạng choạng */
    return;
  }
  if (A.ph === 'hold') {
    if (A.mash >= k.need) {   /* vùng ra được: rơi xuống trước mặt nó, nó loạng choạng */
      if (ctx.knockRelease) ctx.knockRelease(); if (ctx.knockPlayer) ctx.knockPlayer({ type: 'stagger', dir: { x: ux, y: uy }, power: 1 });
      A.ph = 'stumble'; A.t = 1.0; mo.pose = 'stumble'; mo.pt = 0; ctx.sfx('spar_bow'); if (ctx.toast) ctx.toast(L(ctx).brokeFree);
      return;
    }
    if (A.t <= 0) {   /* quật ra sau lưng */
      if (ctx.knockRelease) ctx.knockRelease(); if (ctx.hero && ctx.hero.iframes) ctx.hero.iframes(0);
      const ok = ctx.hero ? ctx.hero.hit(Math.max(1, Math.round(b.s.dmg * k.mul))) : false;
      (ST.log ||= []).push({ k: 'grab', ok, hp: Math.round(ctx.hero ? ctx.hero.hp : 0), t: +ctx.S.time.toFixed(2) });
      if (ctx.knockPlayer) ctx.knockPlayer({ type: 'throw', dir: { x: -ux, y: -uy }, power: 1.35, bound: (x, y) => Math.hypot(x - b.ring.x, y - b.ring.y) < RING_R - 8,
        onLand: (x, y) => { if ((SKILLCFG[b.r.id] || {}).fire) fireAt({ type: 'c', x, y, r: 18 }); if (ctx.vfx) ctx.vfx('spar_bodyslam', x, y + 8, 0, false); ctx.sfx('spar_thud'); if (ctx.quake) ctx.quake(0.2); } });
      ctx.sfx('spar_grunt'); A.ph = 'rec'; A.t = 0.6; mo.pose = 'throw'; mo.pt = 0; b.hits++;
    }
    return;
  }
  if (A.t <= 0) { b.atk = null; b.cd = 0.8 + Math.random() * 0.5; mo.pose = 'idle'; }
}
function inShape(sh, p) {
  if (sh.type === 'cone') { const dx = p.x - sh.x, dy = (p.y - sh.y) * 1.15, d = Math.hypot(dx, dy); if (d > sh.len + 3) return false; let da = Math.atan2(dy, dx) - sh.a; da = Math.atan2(Math.sin(da), Math.cos(da)); return d < 10 || Math.abs(da) < sh.half; }
  if (sh.type === 'c') return Math.hypot(p.x - sh.x, (p.y - sh.y) * 1.15) < sh.r + 3;
  if (sh.type === 'r') { const d = Math.hypot(p.x - sh.x, (p.y - sh.y) * 1.15); return d > sh.r0 && d < sh.r1 + 3; }
  return segDist(p.x, p.y, sh.x, sh.y, sh.a, sh.len) < sh.w / 2 + 3;
}
function ai(ctx, mo, dt, p, dp, canHit) {   /* gọi từ monsters.update (c.aiFn) */
  const b = ST.b; if (!b || b.mo !== mo) return; mo.pt = (mo.pt || 0) + dt;
  if (mo.statue || mo.stoneT) { mo.statue = null; mo.stoneT = 0; ctx.toast(L(ctx).gun); }
  if (b.st === 'intro') { mo.face = faceOf(p.x - mo.x, p.y - mo.y); mo.pose = 'idle'; mo.moving = false; b.t -= dt; if (b.t <= 0) b.st = 'fight'; return; }
  if (b.stop > 0) { b.stop -= dt; return; }   /* khựng hình sau cú đấm nặng */
  if (b.cine) { mo.moving = false; mo.pose = 'idle'; return; }   /* đang cảnh biến hình: đứng yên (cineTick chạy ở update) */
  const FS = formsOf(b.r); if (FS && !b.atk && b.st === 'fight') { const nx = FS[b.form + 1]; if (false && nx) { startCine(ctx, b, mo, b.form + 1); return; } }
  const k = K[(b.atk && b.atk.k !== 'punch' && b.atk.k) || b.r.k], A = b.atk;
  if (A && A.k === 'punch') { mo.moving = false; comboTick(ctx, b, mo, p, dt, canHit); return; }
  if (!A) {
    if (b.cd > 0) b.cd -= dt; if (b.pcd > 0) b.pcd -= dt;
    const dx = p.x - mo.x, dy = p.y - mo.y, d = Math.hypot(dx, dy) || 1, wantPunch = !(b.pcd > 0);
    const kr = (SKILLCFG[b.r.id] || {}).range || k.range, want = wantPunch ? 16 : Math.min(kr, 60);   /* máu chiến: muốn đấm thì áp sát, không thì giữ tầm đòn đặc trưng */
    let mx = 0, my = 0; if (d > want) { mx = dx / d; my = dy / d; } else if (d < 12) { mx = -dx / d; my = -dy / d; }
    mo.moving = !!(mx || my); mo.face = faceOf(dx, dy); mo.pose = mo.moving ? 'walk' : 'idle';
    if (b.recenter > 0) b.recenter -= dt;
    { const rc = Math.hypot(mo.x - b.ring.x, mo.y - b.ring.y); if (rc >= RING_R - 2 && !(b.recenter > 0)) b.recenter = 0.35; }   /* sát/ngoài mép (bị hất, húc tới mép) → bước về phía tâm một nhịp */
    if (b.recenter > 0) { const rc = Math.hypot(mo.x - b.ring.x, mo.y - b.ring.y) || 1; mx = (b.ring.x - mo.x) / rc; my = (b.ring.y - mo.y) / rc; mo.moving = true; mo.pose = 'walk'; mo.face = faceOf(mx, my); }
    mo.fast = d > 48 || b.recenter > 0; if (mo.moving) { const sp = mo.c.sp * (mo.fast ? 1.9 : 1.15) * dt;   /* > 3 ô: lướt tới */ stepMo(ctx, b, mo, mo.x + mx * sp, mo.y + my * sp); }   /* xa thì lao tới nhanh */
    if (b.recenter > 0) return;
    if (!canHit || (ctx.knocked && ctx.knocked())) return;   /* đang hất bay người chơi → đợi chạm đất, không đánh hội đồng */
    if (b.cd <= 0 && d <= kr + 6 && (d > 30 || b.after || !wantPunch)) { b.after = false; startAtk(ctx, b, mo, p); }   /* người chơi giữ khoảng cách / vừa xong combo → đòn đặc trưng */
    else if (wantPunch && d <= PUNCH.range) startCombo(ctx, b, mo, p);
    return;
  }
  mo.moving = false; A.t -= dt;
  if (A.k === 'grab' && A.ph !== 'wind') { grabTick(ctx, b, mo, p, dt, canHit, k); return; }
  if (A.ph === 'wind') { if (A.t <= 0 && A.ult) { const cu = SKILLCFG[b.r.id] || {}; if (cu.ultStart && ctx.vfx) ctx.vfx(cu.ultStart, mo.x, mo.y + 33); if (ctx.quake) ctx.quake(0.45); ctx.sfx('spar_roar'); }   /* tuyệt chiêu: sóng chấn PixelLab cỡ cả sàn lúc ra chiêu */
    if (A.t <= 0) { A.ph = 'go'; A.t = A.bh ? 0.25 : ((SKILLCFG[b.r.id] || {}).go || k.go); A.el = 0; mo.pose = 'go'; mo.pt = 0; if (A.k === 'crow' && !A.bh) { ctx.sfx('spar_crow'); (ST.sfxv ||= []).push({ name: 'spar_crow', x: A.shapes[0].x, y: A.shapes[0].y, a: A.a, t: 0 }); if (ctx.quake) ctx.quake(0.1); } ctx.sfx(A.k === 'charge' || A.k === 'dash' || A.k === 'lash' || A.k === 'peck' ? 'spar_whoosh' : 'spar_thud'); } return; }
  if (A.ph === 'go') {
    A.el += dt;
    if (A.k === 'charge' || A.k === 'dash') {   /* lướt theo đường đã báo; trúng người khi lướt qua */
      const cf = SKILLCFG[b.r.id] || {}, sh = A.shapes[0], ux = Math.cos(sh.a), uy = Math.sin(sh.a), step = (cf.sp || k.sp) * dt, gone = Math.hypot(mo.x - sh.x, mo.y - sh.y);
      const ox = mo.x, oy = mo.y;
      if (!A.arr) A.t = Math.max(A.t, 0.02); let blocked = false;   /* húc tới hết đường đã báo (không tự dừng giữa chừng) */
      if ((A.mv === 'firecharge' || cf.fire) && (!A.lastFire || Math.hypot(mo.x - A.lastFire.x, mo.y - A.lastFire.y) > 14)) { A.lastFire = { x: mo.x, y: mo.y }; (ST.fires ||= []).push({ x: mo.x, y: mo.y + 2, t: 0, life: 3 }); }   /* Ngưu Ma: húc để lại vệt lửa cháy ~3 s */
      if (gone < sh.len) { const st2 = Math.min(step, sh.len - gone), nx = mo.x + ux * st2, ny = mo.y + uy * st2; if (!ctx.isSolid(ctx.S.map, Math.floor(nx / 16), Math.floor(ny / 16))) { mo.x = nx; mo.y = ny; } else blocked = true; }
      const arrived = blocked || Math.hypot(mo.x - sh.x, mo.y - sh.y) >= sh.len - 0.5;
      if (canHit) hitRocky(ctx, b, A, 'rkC', pt => segDist(pt.x, pt.y, ox, oy, sh.a, Math.hypot(mo.x - ox, mo.y - oy)) < sh.w + 4, k.mul, ux, uy, k.kb);
      if (!A.hit && canHit && segDist(p.x, p.y, ox, oy, sh.a, Math.hypot(mo.x - ox, mo.y - oy)) < sh.w + 4) {   /* quét cả đoạn vừa lướt (khung giật vẫn không lọt) */
        A.hit = true; if (hitPlayer(ctx, b, k.mul, ux, uy, k.kb, 0.14, cf.power ? ['fly', cf.power] : null) && cf.impact && ctx.vfx) ctx.vfx(cf.impact, p.x, p.y + 6, 0, true); }
      if (arrived) {
        if (!A.hit && cf.stun && (A.wallEnd || blocked)) {   /* húc trượt vào tường / mép vòng → CHOÁNG: sơ hở lớn, sao quay trên đầu (sheet PixelLab knock_dizzy) */
          A.ph = 'stun'; A.t = cf.stun; mo.pose = 'idle'; mo.stunT = cf.stun; ctx.sfx('knock_wall'); if (ctx.quake) ctx.quake(0.16); if (ctx.arenaImpact) ctx.arenaImpact(mo.x + ux * 12, mo.y + uy * 8, 1.3, 'wall');
          if (ctx.vfx && cf.impact) ctx.vfx(cf.impact, mo.x + ux * 10, mo.y + 4, 0, true); if (ctx.toast) ctx.toast(L(ctx).stunned(nm(ctx, b.r)));
          return;
        }
        A.arr = true; A.t = 0;
      }
    } else {
      if (A.k === 'crow') {   /* sóng âm tới người sau hitAt giây; quét tay thì trúng ngay */
        const sh = A.shapes[0];
        if (!sh.done && A.el >= (A.bh ? 0.05 : k.hitAt)) { sh.done = true; if (!A.bh && (SKILLCFG[b.r.id] || {}).fire) fireAt(sh);
          if (canHit) hitRocky(ctx, b, A, 'rkW', pt => inShape(sh, pt), A.bh ? 0.7 : k.mul, Math.cos(A.a || 0), Math.sin(A.a || 0), 40);
          if (canHit && inShape(sh, p)) { A.hit = true; const kx = A.bh ? p.x - mo.x : Math.cos(A.a), ky = A.bh ? p.y - mo.y : Math.sin(A.a);
            if (hitPlayer(ctx, b, A.bh ? 0.7 : k.mul, kx, ky, 0, A.bh ? 0 : 0.1, A.bh ? ['stagger', 1] : REACT.crow)) { ctx.sfx(A.bh ? 'punch_heavy' : 'knock_whoosh'); if (!A.bh) ST.slowT = 1.6; } } else if (A.bh) ctx.sfx('spar_whoosh'); }
      }
      if (A.leap) {   /* cú nhảy: thân bay theo cung (mo.hop), bóng trên đất; giáng xuống đúng lúc vùng đánh nổ */
        const u = Math.min(1, A.el / k.leap), L = A.leap, nx = L.x0 + (L.x1 - L.x0) * u, ny = L.y0 + (L.y1 - L.y0) * u;
        if (!ctx.isSolid(ctx.S.map, Math.floor(nx / 16), Math.floor(ny / 16)) && Math.hypot(nx - b.ring.x, ny - b.ring.y) < RING_R) { mo.x = nx; mo.y = ny; }
        mo.hop = u < 1 ? Math.sin(Math.PI * u) * 18 : 0;
      }
      const cfw = SKILLCFG[b.r.id] || {};
      if (cfw.land && A.k === 'ring') mo.hop = A.el < cfw.land ? Math.sin(Math.PI * A.el / cfw.land) * (cfw.hopH || 16) : 0;   /* Sóng Bông: bật nhảy tại chỗ (bóng ở đất), sóng nổ lúc đáp */
      if (cfw.lunge && A.k === 'knock' && !A.lunged) { A.lunged = true; stepMo(ctx, b, mo, mo.x + Math.cos(A.a || 0) * cfw.lunge, mo.y + Math.sin(A.a || 0) * cfw.lunge); ctx.sfx('punch_heavy'); }   /* Hất Cằm: dấn tới một bước khi hất */
      if (cfw.wave && !A.waved && A.el >= (cfw.land || 0)) { A.waved = true; if (cfw.land && ctx.arenaImpact) ctx.arenaImpact(mo.x, mo.y, 1, 'land'); (ST.sfxv ||= []).push({ name: cfw.wave, x: mo.x, y: mo.y, a: 0, t: 0, center: true }); ctx.sfx('spar_thud'); if (ctx.quake) ctx.quake(0.15); }   /* Sóng Bông: vòng sóng PixelLab loang từ chân */
      if (cfw.whip && !A.whipped) { A.whipped = true; (ST.sfxv ||= []).push({ name: cfw.whip, x: mo.x, y: mo.y - 6, a: A.a, t: 0, w: A.shapes[0].len }); ctx.sfx('spar_whipcrack'); }   /* Quất Ria: vệt ria PixelLab dọc làn */
      if (cfw.rainLead && ctx.vfx) for (const sh of A.shapes) if (sh.rain && !sh.led && A.el >= sh.d - cfw.rainLead) { sh.led = true; ctx.vfx(cfw.rainHit, sh.x, sh.y + 12); }   /* sét giáng: phát VFX sớm để tia chạm đất đúng lúc vòng nổ */
      for (const sh of A.shapes) { if (sh.own || sh.done || A.el < (sh.d || 0)) continue; sh.done = true; if (cfw.fire && !sh.rain && !sh.fis) fireAt(sh); if (sh.fis) { if (ctx.vfx && cfw.rainHit) for (let d = 18; d <= sh.len; d += 30) ctx.vfx(cfw.rainHit, sh.x + Math.cos(sh.a) * d, sh.y + 12 + Math.sin(sh.a) * d); if (ctx.quake) ctx.quake(0.1); }
        if (sh.rain) { if (ctx.vfx && cfw.rainHit && !cfw.rainLead) ctx.vfx(cfw.rainHit, sh.x, sh.y + 10); if (ctx.quake) ctx.quake(0.14); ctx.sfx('spar_thud'); } if (sh.type === 'c' && !sh.light && (A.k === 'slam' || A.k === 'multi' || A.k === 'barbell')) { if (ctx.vfx) { ctx.vfx('spar_shock', sh.x, sh.y + 10); if (sh.meteor) { ctx.vfx('spar_transform', sh.x, sh.y + 4, 0, true); ctx.vfx('spar_shock', sh.x - 20, sh.y + 12); ctx.vfx('spar_shock', sh.x + 20, sh.y + 12); if (ctx.quake) ctx.quake(0.35); ctx.sfx('spar_roar'); } } if (ctx.arenaImpact) ctx.arenaImpact(sh.x, sh.y, A.k === 'slam' ? 1.3 : 1, 'land'); } const sfx = !sh.rain && SKILLFX[b.r.id]; if (sfx && ctx.vfx && ctx.vfx(sfx[0], sh.x, sh.y + sfx[1])) { ctx.sfx('spar_thud'); if (ctx.quake) ctx.quake(0.18); } else if (ctx.vfx) ctx.vfx(sh.type === 'l' ? 'dirt_puff' : 'rock_debris', sh.type === 'l' ? sh.x + Math.cos(sh.a) * sh.len * 0.6 : sh.x, sh.type === 'l' ? sh.y + Math.sin(sh.a) * sh.len * 0.6 : sh.y); if (sh.d) ctx.sfx('spar_thud');
        if (canHit) { const rp = ctx.rocky && ctx.rocky.pos && ctx.rocky.pos(); if (rp) hitRocky(ctx, b, A, 'rkS', pt => inShape(sh, pt), k.mul, A.a != null ? Math.cos(A.a) : rp.x - sh.x, A.a != null ? Math.sin(A.a) : rp.y - sh.y, k.kb || 40); }
        if (!A.hit && canHit && inShape(sh, p)) { A.hit = true; const kx = A.a != null ? Math.cos(A.a) : p.x - sh.x, ky = A.a != null ? Math.sin(A.a) : p.y - sh.y; if (hitPlayer(ctx, b, k.mul, kx, ky, k.kb || 0, cfw.shake || 0.12, cfw.react || null) && cfw.impact && ctx.vfx) ctx.vfx(cfw.impact, p.x, p.y - 6, 0, true); } }
    }
    if (A.t <= 0 && A.k === 'charge' && A.mv && formNext(ctx, b, mo, p, A)) return;
    { const cfx = SKILLCFG[b.r.id] || {}; if (A.t <= 0 && cfx.twice && !A.again && !A.ult && A.k !== 'dash' && A.k !== 'charge' && !(ctx.knocked && ctx.knocked())) { const kk = A.k; b.atk = null; startAtk(ctx, b, mo, p, kk, { tele: cfx.twiceTele || 0.6 }); if (b.atk) b.atk.again = true; return; } }   /* dạng Trung cấp trở lên: ra đòn đặc trưng lần 2 liền (báo lại ≥ 0,6 s) */
    if (A.t <= 0 && A.k === 'dash' && (SKILLCFG[b.r.id] || {}).back && !A.back && !A.hit) { b.atk = null; startAtk(ctx, b, mo, p, 'dash', { tele: 0.6 }); if (b.atk) b.atk.back = true; else b.cd = 0.6; return; }   /* Phóng Xế: phanh trượt, quay đầu xe phóng lại về phía người chơi (làn mới báo 0,6 s) */   /* chiêu dạng biến hình nối tiếp */
    if (A.t <= 0) { const cft = (SKILLCFG[b.r.id] || {}).tangle; A.ph = 'rec'; A.t = A.ult ? 1.6 : (cft || (A.k === 'crow' && !A.bh ? k.rec : 0.45));   /* sau tuyệt chiêu: hở 1,6 s */ if (cft) { mo.pose = 'tangle'; mo.pt = 0; } else { mo.pose = 'idle'; } mo.hop = 0; if (A.k === 'crow' && !A.bh) mo.pant = k.rec; }   /* gáy xong thở dốc (sơ hở) */
    return;
  }
  if (A.ph === 'stun') { mo.stunT = Math.max(0, A.t); if (A.t > 0) return; mo.stunT = 0; }
  if (A.t <= 0) { b.atk = null; b.cd = 0.8 + Math.random() * 0.5; }
}
/* ---------------- vẽ ---------------- */
function sheetFor(id) { const d = ST.data && ST.data[id]; if (!d) return null; const im = img(d.file); return im ? { d, im } : null; }
function frame(mo, sh) {
  const d = sh.d, row = mo.face ?? 0, pose = mo.pose || 'idle';
  if (pose === 'walk') return [d.walk[0] + Math.floor(mo.pt * (mo.moving && mo.fast ? 12 : 10)) % d.walk[1], row];   /* chân khớp tốc độ mới (10–12 fps) */
  if (pose === 'pwind' || pose === 'pgo' || pose === 'prec') {   /* clip đấm PixelLab: 3 cú ở ~28 % / 52 % / 75 % clip; lấy đà = khung ngay trước */
    const c = d.punch || d.atk, n = c[1], hf = [0.28, 0.52, 0.75].map(v => Math.min(n - 1, Math.max(1, Math.round(n * v)))), i = mo.pi || 0;
    if (pose === 'pwind') return [c[0] + hf[i] - 1, row];
    if (pose === 'pgo') return [c[0] + hf[i], row];
    return [c[0] + Math.min(n - 1, hf[2] + 1 + Math.floor(mo.pt * 14)), row];
  }
  if (pose === 'tangle' && d.atk) { const n = d.atk[1]; return [d.atk[0] + n - 2 + (Math.floor(mo.pt * 6) % 2), row]; }   /* ria rối: lắc đầu gỡ (2 khung cuối clip quất) */
  const ga = ST.b && ST.b.mo === mo && ST.b.atk && ST.b.atk.k === 'grab' && ST.b.atk;
  if (ga && d.atk) { const n = d.atk[1], at = f => [d.atk[0] + Math.min(n - 1, Math.max(0, f)), row];   /* Ôm Quật: khom dang tay · lao · nhấc · quật · loạng choạng */
    if (pose === 'wind') return at(1); if (pose === 'go') return at(Math.round(n * 0.38)); if (pose === 'hold') return at(Math.round(n * 0.62)); if (pose === 'throw') return at(Math.round(n * 0.62) + 1 + Math.floor(mo.pt * 8)); if (pose === 'stumble') return at(Math.round(n * 0.38) + (Math.floor(mo.pt * 4) % 2)); }
  const bh = ST.b && ST.b.mo === mo && ST.b.atk && ST.b.atk.bh;
  if (bh && (pose === 'wind' || pose === 'go') && d.punch) { const n = d.punch[1], hf = Math.min(n - 1, Math.max(1, Math.round(n * 0.75))); return [d.punch[0] + (pose === 'wind' ? hf - 1 : hf), row]; }   /* quét tay: khung móc nặng của clip đấm */
  if (pose === 'wind') return [d.atk[0] + Math.min(d.atk[1] - 1, Math.max(1, d.impact - 2)), row];   /* tư thế lấy đà: GIỮ 1 khung (tĩnh) */
  if (pose === 'go') { const k = ST.b && ST.b.atk ? K[ST.b.atk.k] : K.slam, kg = k.anim || (SKILLCFG[mo.spar && mo.spar.id] || {}).go || k.go, f = Math.max(1, d.impact - 1) + Math.floor(mo.pt / kg *(d.atk[1] - d.impact + 1)); return [d.atk[0] + Math.min(d.atk[1] - 1, f), row]; }
  return [d.idle[0] + Math.floor(mo.pt * 5) % d.idle[1], row];
}
let BLIT_SCALE = 1;
function blitChar(g, sh, col, row, x, y, alpha = 1) {
  const d = sh.d, dw = d.cw / 2 * BLIT_SCALE, dh = d.ch / 2 * BLIT_SCALE; if (alpha < 1) g.globalAlpha = alpha;
  g.drawImage(sh.im, col * d.cw, row * d.ch, d.cw, d.ch, Math.round(x - dw / 2), Math.round(y - dh + 1), dw, dh); g.globalAlpha = 1;
}
let GLOW = null;
function glowChar(g, sh, col, row, x, y, rgb) {   /* viền màu mảnh quanh thân lúc lấy đà (bóng màu của chính khung hình, lệch 1 px 4 phía) */
  const d = sh.d, w = d.cw, h = d.ch; if (!GLOW) GLOW = document.createElement('canvas'); if (GLOW.width !== w || GLOW.height !== h) { GLOW.width = w; GLOW.height = h; }
  const q = GLOW.getContext('2d'); q.clearRect(0, 0, w, h); q.globalCompositeOperation = 'source-over'; q.drawImage(sh.im, col * w, row * h, w, h, 0, 0, w, h);
  q.globalCompositeOperation = 'source-in'; q.fillStyle = `rgb(${rgb})`; q.fillRect(0, 0, w, h); q.globalCompositeOperation = 'source-over';
  const dw = w / 2 * BLIT_SCALE, dh = h / 2 * BLIT_SCALE; g.globalAlpha = 0.7; for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) g.drawImage(GLOW, 0, 0, w, h, Math.round(x - dw / 2) + ox, Math.round(y - dh + 1) + oy, dw, dh); g.globalAlpha = 1;
}
function neckLen(A, cf) { const e = A.el || 0, t1 = cf.ext || 0.14, h = cf.hold || 0.16, t3 = cf.ret || 0.15, u = e < t1 ? e / t1 : e < t1 + h ? 1 : Math.max(0, 1 - (e - t1 - h) / t3); return u * (A.shapes[0] ? A.shapes[0].len : 0); }
function drawNeck(g, im, m, x0, y0, a, L) {   /* dải cổ ảnh 2× (đầu ở mút phải, tâm đầu cách mép phải hx, trục cổ ở hàng ty — đơn vị logic); hiện phần mút dài L + hx */
  const w = im.naturalWidth / 2, h = im.naturalHeight / 2, hx = m.hx || 8, ty = m.ty || h / 2, V = Math.min(w, L + hx);
  g.save(); g.translate(Math.round(x0), Math.round(y0)); g.rotate(a); if (Math.cos(a) < -0.01) g.scale(1, -1);
  g.drawImage(im, (w - V) * 2, 0, V * 2, h * 2, Math.round(L + hx - V), -ty, V, h); g.restore();
}
function draw(g, mo, x, y) {   /* c.drawFn: monsters.drawables gọi */
  const bk = bodyK(sheetId(mo)), ex = Math.round(27 * (bk - 1));   /* ex: đầu cao hơn bạn tập thường bao nhiêu px logic */
  g.fillStyle = 'rgba(0,0,0,.28)'; g.beginPath(); g.ellipse(x, y + 1, Math.round(8 * bk), 2.5 * bk, 0, 0, 7); g.fill();
  const A = ST.b && ST.b.mo === mo && ST.b.atk, cf = SKILLCFG[mo.spar.id] || {}, tr = cf.trail && ART_VFX(cf.trail);
  if (tr && A && (A.k === 'charge' || A.k === 'dash') && A.ph === 'go') {   /* bụi tung sau lưng lúc húc (sheet vẽ cho hướng phải → xoay theo hướng húc) */
    const f = Math.floor(mo.pt * (tr.fps || 12)) % tr.n, hi = tr.img.__hi ? 1 : 2; g.save(); g.translate(x, y - 2); g.rotate(A.a || 0); g.drawImage(tr.img, f * tr.w * hi, 0, tr.w * hi, tr.h * hi, -tr.w - 4, -tr.h + 3, tr.w, tr.h); g.restore();
  }
  const sh = sheetFor(sheetId(mo)); if (mo.flash > 0) g.filter = 'brightness(2.2)';
  /* 2026-10-11: bỏ hào quang spar_kingaura (ảnh 14×8 bị phóng 2,8× = lệch mật độ pixel, lại là VFX lặp) */
  const wind = A && ((A.ph === 'wind' && A.k !== 'punch') || (A.k === 'punch' && A.ph === 'wind' && A.shapes[0] && A.shapes[0].heavy)), wcol = wind ? colOf(A, A.shapes[0] || {}) : null;
  BLIT_SCALE = mo.scale || 1;
  const nk = cf.neck && A && A.k === 'peck' && A.ph === 'go' && fxImg(cf.neck), nkL = nk ? neckLen(A, cf) : 0;   /* Mổ Cổ Dài: cổ vươn ra theo làn (ảnh cổ + đầu ghép từ khung PixelLab của chính hắn) */
  if (sh) { const [c, r] = frame(mo, sh); if (wind) glowChar(g, sh, c, r, x, y - Math.round(mo.hop || 0), TRGB[wcol]);
    if (nkL > 2) { const ny = y - (sh.d.neckY || 20); g.save(); g.beginPath(); g.rect(x - 60, ny, 120, 80); g.clip(); blitChar(g, sh, c, r, x, y); g.restore(); drawNeck(g, nk, ST.data._fx[cf.neck], x, ny, A.a || 0, nkL); }
    else blitChar(g, sh, c, r, x, y - Math.round(mo.hop || 0)); }
  if (wind) { const ic = fxImg(A.k === 'grab' ? 'tg_hand' : 'tg_bang'); if (ic) g.drawImage(ic, 0, 0, ic.naturalWidth, ic.naturalHeight, Math.round(x - 6), Math.round(y - 46 - ex - (mo.hop || 0)), 12, 12); }   /* dấu nguy hiểm TĨNH trên đầu lúc lấy đà */   /* hop: đang nhảy (bóng vẫn ở đất) */
   /* chưa có ảnh (người 'Sắp có', chỉ test gọi bằng force): chỉ vẽ bóng — không bao giờ vẽ khối giữ chỗ */
  BLIT_SCALE = 1;
  const dz = mo.stunT > 0 && ART_VFX('knock_dizzy');
  if (dz) { const f = Math.floor(mo.pt * (dz.fps || 12)) % dz.n, hi = dz.img.__hi ? 1 : 2; g.drawImage(dz.img, f * dz.w * hi, 0, dz.w * hi, dz.h * hi, Math.round(x - dz.w / 2), Math.round(y - 34 - ex - dz.h / 2), dz.w, dz.h); }   /* choáng: sao quay trên đầu (chỉ trong lúc choáng) */
  g.filter = 'none';
}
function drawLeave(g, lv, cx, cy) {
  const sh = sheetFor(lv.r.id), x = lv.x - cx, y = lv.y - cy; if (!sh) return;
  const a = lv.t < 1.3 ? 1 : Math.max(0, 1 - (lv.t - 1.3) / 1.2);
  g.fillStyle = `rgba(0,0,0,${0.28 * a})`; g.beginPath(); g.ellipse(x, y + 1, 8, 2.5, 0, 0, 7); g.fill();
  const bw = sh.d.bow, bim = bw && img(bw.file);
  if (lv.t < 1.3 && bim) { const n = bw.n, f = Math.min(n - 1, Math.floor(lv.t / 0.9 * n)); g.drawImage(bim, f * bw.cw, 0, bw.cw, bw.ch, Math.round(x - bw.cw / 4), Math.round(y - bw.ch / 2 + 1), bw.cw / 2, bw.ch / 2); return; }   /* cúi chào (clip PixelLab hướng nam) */
  if (lv.t < 1.3) { blitChar(g, sh, sh.d.idle[0], 0, x, y); return; }
  blitChar(g, sh, sh.d.walk[0] + Math.floor(lv.t * 8) % sh.d.walk[1], lv.face, x, y, a);
}
function decal(g, im, x, y, w, h, alpha) { g.globalAlpha = alpha; if (im) g.drawImage(im, 0, 0, im.naturalWidth, im.naturalHeight, Math.round(x - w / 2), Math.round(y - h / 2), Math.round(w), Math.round(h)); g.globalAlpha = 1; }
/* 2026-10-11 anh: dấu báo đòn MỚI (cùng một ngôn ngữ cho mọi bạn tập, ảnh PixelLab spar/fx/tg_*):
   viền đậm (vòng tg_ring / làn tg_lane có mũi tên) + lòng sọc cảnh báo tg_fill NẠP ĐẦY DẦN theo thời gian lấy đà (đầy = đánh).
   Màu: đỏ = đòn nặng (giáng, húc, đập, bàn cờ, móc nặng) · cam = đòn thường · tím = tóm (Ôm Quật). Không nhấp nháy, không lặp. */
const TCOL = { fissure: 'r', rain: 'r', barbell: 'r', slam: 'r', multi: 'r', charge: 'r', dash: 'r', knock: 'r', grab: 'p' };
const TRGB = { o: '255,154,26', r: '232,64,42', p: '176,74,224' };
const colOf = (A, sh) => A.k === 'punch' ? (sh.heavy ? 'r' : 'o') : (A.col || TCOL[A.k] || 'o');   /* A.col: màu riêng theo SKILLCFG.col (vd Sóng Bông = đỏ) */
let PAT = {};
function pat(g, c) { const im = fxImg('tg_fill_' + c); if (!im) return `rgba(${TRGB[c]},.5)`; if (!PAT[c] || PAT[c].im !== im) PAT[c] = { im, p: g.createPattern(im, 'repeat') }; return PAT[c].p; }
function drawShape(g, sh, cx, cy, a, prog = 1, col = 'o') {
  const x = Math.round(sh.x - cx), y = Math.round(sh.y - cy), ring = fxImg('tg_ring_' + col), lane = fxImg('tg_lane_' + col), rgb = TRGB[col];
  const pr = Math.max(0.08, Math.min(1, prog));
  g.save();
  const border = (path) => { g.lineJoin = 'miter'; g.strokeStyle = `rgba(40,16,10,${0.9 * a})`; g.lineWidth = 3; path(); g.stroke(); g.strokeStyle = `rgba(${rgb},${a})`; g.lineWidth = 1.5; path(); g.stroke(); };
  if (sh.type === 'c') {
    const ry = sh.r / 1.15;
    g.globalAlpha = 0.18 * a; g.fillStyle = `rgb(${rgb})`; g.beginPath(); g.ellipse(x, y, sh.r, ry, 0, 0, 7); g.fill();   /* nền nhạt cả vùng */
    g.globalAlpha = 0.6 * a; g.fillStyle = pat(g, col); g.beginPath(); g.ellipse(x, y, sh.r * pr, ry * pr, 0, 0, 7); g.fill();   /* nạp đầy từ tâm */
    g.globalAlpha = a; if (ring && sh.r <= 36) g.drawImage(ring, 0, 0, ring.naturalWidth, ring.naturalHeight, Math.round(x - sh.r - 2), Math.round(y - ry - 2), Math.round(sh.r * 2 + 4), Math.round(ry * 2 + 4));   /* vòng lớn: viền đậm cùng màu (ảnh phóng to quá thô) */
    else border(() => { g.beginPath(); g.ellipse(x, y, sh.r, ry, 0, 0, 7); });
  } else if (sh.type === 'cone') {
    const path = r => { g.beginPath(); g.moveTo(x, y); g.arc(x, y, r, sh.a - sh.half, sh.a + sh.half); g.closePath(); };
    g.globalAlpha = 0.18 * a; g.fillStyle = `rgb(${rgb})`; path(sh.len); g.fill();
    g.globalAlpha = 0.6 * a; g.fillStyle = pat(g, col); path(sh.len * pr); g.fill();   /* nạp từ miệng ra */
    g.globalAlpha = 1; border(() => path(sh.len));
  } else if (sh.type === 'r') {
    const e = (r, rev) => g.ellipse(x, y, r, r / 1.15, 0, 0, 7, rev);
    g.globalAlpha = 0.18 * a; g.fillStyle = `rgb(${rgb})`; g.beginPath(); e(sh.r1); e(sh.r0, true); g.fill('evenodd');
    g.globalAlpha = 0.6 * a; g.fillStyle = pat(g, col); g.beginPath(); e(sh.r0 + (sh.r1 - sh.r0) * pr); e(sh.r0, true); g.fill('evenodd');   /* nạp từ trong ra */
    g.globalAlpha = a; for (const r of [sh.r1, sh.r0]) { if (ring && r <= 36) g.drawImage(ring, 0, 0, ring.naturalWidth, ring.naturalHeight, Math.round(x - r - 2), Math.round(y - r / 1.15 - 2), Math.round(r * 2 + 4), Math.round(r / 1.15 * 2 + 4)); else border(() => { g.beginPath(); e(r); }); }
  } else {   /* làn: ảnh làn PixelLab mờ cả chiều dài, phần đã nạp đậm dần về phía trước */
    const w = Math.max(10, sh.w + 4);
    g.translate(x, y); g.rotate(sh.a);
    if (lane) { g.globalAlpha = 0.35 * a; g.drawImage(lane, 0, 0, lane.naturalWidth, lane.naturalHeight, 0, -w / 2, sh.len, w);
      g.globalAlpha = a; g.beginPath(); g.rect(0, -w / 2 - 1, sh.len * pr, w + 2); g.clip(); g.drawImage(lane, 0, 0, lane.naturalWidth, lane.naturalHeight, 0, -w / 2, sh.len, w); }
    else { g.globalAlpha = 0.6 * a; g.fillStyle = pat(g, col); g.fillRect(0, -w / 2, sh.len * pr, w); g.globalAlpha = 1; border(() => { g.beginPath(); g.rect(0.5, -w / 2 + 0.5, sh.len - 1, w - 1); }); }
  }
  g.restore();
}

/* ---------------- bảng chọn ---------------- */
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
function openRoster(ctx) {
  loadData(); const t = L(ctx), d = sv(ctx), v = vi(ctx);
  const card = r => { const soon = !ready(r.id), on = isOn(ctx, r), rec = d.rec[r.id], face = ST.data && ST.data[dataId(r.id)] ? ST.data[dataId(r.id)].face : null;
    return `<button class="spc${on ? '' : ' off'}" data-id="${r.id}" ${on ? '' : 'disabled'} style="display:flex;gap:8px;align-items:center;text-align:left;padding:6px;background:${on ? '#2b2032' : '#16121c'};border:2px solid ${on ? '#6b4a2e' : '#2b2238'};color:#f2ebe0;font:15px VT323,monospace;cursor:${on ? 'pointer' : 'default'};min-height:74px">`
      + `<span style="flex:none;width:60px;height:60px;background:#120f1c;border:2px solid #4a3324;display:flex;align-items:center;justify-content:center">${face ? `<img src="assets/px/${face}" alt="" style="width:56px;height:56px;image-rendering:pixelated;${on ? '' : 'filter:brightness(.15) contrast(.8)'}">` : ''}</span>`
      + `<span style="flex:1;min-width:0"><b style="font-size:19px;color:${on ? '#ffd45e' : '#8a7f95'}">${on ? esc(v ? r.vi : r.en) : soon ? t.soonName : '???'}</b>${rec && rec.w ? ` <span style="color:#9fe08a">✓ ${t.wins(rec.w)}</span>` : ''}<br>`
      + `<span style="color:#ffb86b">${on ? esc(v ? r.svi : r.sen) : '🔒'}</span><br><span style="opacity:.85;font-size:14px;line-height:1.05">${on ? esc(v ? r.dvi : r.den) : soon ? t.soonCard : t.locked}</span></span></button>`; };
  const html = `<h2 style="margin:0 0 2px;font-family:VT323,monospace;font-size:32px;color:#ffd45e">🥊 ${t.title}</h2><p class="dim" style="margin:0 0 8px">${t.sub} (${ROSTER.filter(r => isOn(ctx, r) && r.i < 900 && r.i < d.unlocked).length}/${ROSTER.length})</p>`
    + `<div id="spar-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:6px;max-height:62vh;overflow:auto">${ROSTER.map(card).join('')}</div>`
    + `<div style="text-align:right;margin-top:8px"><button class="btn" id="spar-close">${t.close}</button></div>`;
  const el = ctx.panel('spar', html); el.panel.classList.add('wide');
  el.panel.style.cssText = 'border:20px solid transparent;border-image:url(assets/px/ui/frame.png) 20 / 20px round;border-radius:0;image-rendering:pixelated;background:#1c1424;background-clip:padding-box;max-width:880px;width:94vw';
  el.hidden = false; ctx.setMode('spar'); ctx.sfx('menu_open');
  const close = () => { el.hidden = true; ctx.setMode('play'); };
  ctx.registerCloser('spar', () => { close(); ctx.sfx('menu_close'); });
  el.panel.querySelector('#spar-close').onclick = () => { close(); ctx.sfx('menu_close'); };
  el.panel.querySelectorAll('.spc:not(.off)').forEach(bt => { bt.onclick = () => { ctx.sfx('click'); close(); summon(ctx, bt.dataset.id); }; });
  ST.panel = el; return el;
}
function openAsk(ctx, talk, label) {   /* Xealist: nói chuyện (hội thoại cũ) hay gọi bạn tập */
  const t = L(ctx), html = `<div style="display:flex;gap:12px;align-items:center"><img src="assets/px/ui/port_xealist.png" alt="" style="width:72px;height:72px;image-rendering:pixelated;border:2px solid #4a3324;background:#120f1c"><p style="margin:0;font:20px VT323,monospace">${t.ask}</p></div>`
    + `<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:10px;flex-wrap:wrap"><button class="btn" id="sa-talk">💬 ${esc(label || t.talk)}</button><button class="btn primary" id="sa-spar">🥊 ${t.call}</button><button class="btn" id="sa-x">${t.close}</button></div>`;
  const el = ctx.panel('sparask', html); el.panel.style.cssText = 'border:20px solid transparent;border-image:url(assets/px/ui/frame.png) 20 / 20px round;border-radius:0;image-rendering:pixelated;background:#1c1424;background-clip:padding-box;max-width:520px';
  el.hidden = false; ctx.setMode('sparask');
  const close = () => { el.hidden = true; ctx.setMode('play'); };
  ctx.registerCloser('sparask', close);
  el.panel.querySelector('#sa-x').onclick = close;
  el.panel.querySelector('#sa-talk').onclick = () => { close(); talk(); };
  el.panel.querySelector('#sa-spar').onclick = () => { close(); openRoster(ctx); };
  return el;
}

export const spar = {
  id: 'spar',
  onZoneEnter(ctx) {
    ST.ctx = ctx; ST.b = null; ST.leave = null; sv(ctx); loadData();
    ctx.sparFoe = () => (ST.b && !ST.b.cine && ST.b.mo && ST.b.mo.hp > 0 && ST.b.mo.state !== 'dead' ? ST.b.mo : null);   /* anh 2026-10-12: Rocky được đánh bạn tập đang đấu (trừ lúc cảnh biến hình) */
    ctx.sparOn = () => !!ST.b;   /* hero.js: trong trận tập máu không xuống dưới 1 */
    ctx.sparAsk = (talk, label) => openAsk(ctx, talk, label);   /* xealist.js */
    ctx.sparRoad = {   /* plan-28: road.js — bạn tập đứng chờ / chắn đường đèo */
      start: (id, opt) => summon(ctx, id, true, opt), active: () => !!ST.b, bout: () => ST.b, ready: id => ready(id), name: id => (BYID[id] ? nm(ctx, BYID[id]) : id), skill: id => (BYID[id] ? (vi(ctx) ? BYID[id].svi : BYID[id].sen) : ''),
      leaving: () => !!ST.leave, load: () => loadData(), draw: (g, id, x, y, face, t) => { const sh = sheetFor(id); if (!sh) return false; g.fillStyle = 'rgba(0,0,0,.28)'; g.beginPath(); g.ellipse(x, y + 1, 8, 2.5, 0, 0, 7); g.fill(); blitChar(g, sh, sh.d.idle[0] + Math.floor(t * 5) % sh.d.idle[1], face || 0, x, y); return true; },
    };
    if (typeof window !== 'undefined') window.__spar = {
      roster: () => ROSTER.map(r => ({ id: r.id, k: r.k, plan: r.plan, vi: r.vi, skill: r.svi, on: isOn(ctx, r), art: !!(ST.data && ST.data[dataId(r.id)]) })),
      state: () => { const b = ST.b; return { save: JSON.parse(JSON.stringify(sv(ctx))), bout: b && { id: b.r.id, form: b.form, formId: b.mo.formId, scale: b.mo.scale || 1, cine: b.cine ? +b.cine.t.toFixed(2) : null, fires: (ST.fires || []).length, ts: ctx.S.timeScale ?? 1, zoom: ctx.S.camZoom ?? 1, st: b.st, hp: b.mo.hp, max: b.mo.max, x: Math.round(b.mo.x), y: Math.round(b.mo.y), ring: b.ring, stop: b.stop || 0, atk: b.atk && { k: b.atk.k, ph: b.atk.ph, i: b.atk.i, chain: b.atk.chain || 0, stomp: !!b.atk.stomp, meteor: !!b.atk.meteor, wallEnd: !!b.atk.wallEnd, t: +b.atk.t.toFixed(2), shapes: b.atk.shapes.map(s => ({ ...s })) }, s: b.s, hits: b.hits }, last: ST.last || null, leave: !!ST.leave, log: (ST.log || []).slice(-12) }; },
      summon: (id, force) => summon(ctx, id, force), lastLoot: () => ST.lastLoot || null, fall: () => { const b = ST.b; return !!(b && fallForm(ctx, b.mo)); }, open: () => openRoster(ctx), unlockAll: () => { sv(ctx).unlocked = ROSTER.length; ctx.persist(); }, mo: () => ST.b && ST.b.mo, b: () => ST.b,
      mash: () => { const A = ST.b && ST.b.atk; if (A && A.ph === 'hold') { A.mash = (A.mash || 0) + 1; return A.mash; } return -1; }, atk: () => { const b = ST.b; if (!b) return null; b.st = 'fight'; b.atk = null; b.cd = 0; startAtk(ctx, b, b.mo, ctx.S.player); return b.atk.k; }, combo: () => { const b = ST.b; if (!b) return null; b.st = 'fight'; b.atk = null; b.stop = 0; startCombo(ctx, b, b.mo, ctx.S.player); return 'punch'; }, end: why => end(ctx, why || 'out'), data: () => ST.data, K, get RING_R() { return RING_R; },   /* đổi theo sàn (Sàn Đấu Ngầm) */
    };
  },
  onZoneLeave(ctx) { if (ST.b) end(ctx, 'zone'); ST.leave = null; },
  update(dt, ctx) {
    if (ST.leave) { const lv = ST.leave; lv.t += dt; if (lv.t > 1.3) { const p = ctx.S.player, d = Math.hypot(lv.x - p.x, lv.y - p.y) || 1; const ux = (lv.x - p.x) / d, uy = (lv.y - p.y) / d; lv.face = faceOf(ux, uy); lv.x += ux * 40 * dt; lv.y += uy * 40 * dt; } if (lv.t > 2.5) ST.leave = null; }
    if (ST.sfxv) { for (const e of ST.sfxv) e.t += dt; ST.sfxv = ST.sfxv.filter(e => { const sh = ART_VFX(e.name); return sh && e.t * (sh.fps || 12) < sh.n; }); }
    if (ST.slowT > 0 && ctx.S.player) { ST.slowT -= dt; const p0 = ctx.S.player; if (!(ctx.knocked && ctx.knocked())) p0.speedMul = ST.slowT > 0 ? 0.5 : 1; }   /* bị sóng âm: chậm ~1 s sau khi đứng vững */
    if (ST.fires && ST.fires.length) {   /* vệt lửa Ngưu Ma: cháy ~3 s; đứng trong lửa thì bỏng (mỗi 0,5 s) */
      for (const f of ST.fires) f.t += dt; ST.fires = ST.fires.filter(f => f.t < f.life);
      const p0 = ctx.S.player; ST.burnT = (ST.burnT || 0) - dt;
      if (ST.b && ST.burnT <= 0 && ST.fires.some(f => Math.hypot(f.x - p0.x, f.y - p0.y) < 9)) { ST.burnT = 0.5; if (ctx.hero && ctx.hero.hit && ctx.hero.hit(Math.max(1, Math.round(ST.b.s.dmg * 0.25)))) { ctx.sfx('knock_whoosh'); if (ctx.vfx) ctx.vfx('dirt_puff', p0.x, p0.y + 2); } }
    }
    const b = ST.b; if (b && b.cine) cineTick(ctx, dt / (ctx.S.timeScale || 1));
    if (!b || ctx.S.mode !== 'play') return;
    if (!ctx.monsters || !ctx.monsters.list().includes(b.mo)) { ST.b = null; return; }
    const p = ctx.S.player;
    if (ctx.hero && ctx.hero.hp <= 1) { end(ctx, 'yield'); return; }
    if (Math.hypot(p.x - b.ring.x, p.y - b.ring.y) > RING_R + 6) { end(ctx, 'out'); return; }
    if (b.road && b.road.outFn && b.road.outFn(p)) { end(ctx, 'out'); return; }   /* plan-28: rời sân đèo = hết trận */
  },
  near(ctx) {   /* bị Ôm Quật nhấc bổng: E = vùng ra (giống xúc tu Kraken túm) */
    const A = ST.b && ST.b.atk; if (!A || A.k !== 'grab' || A.ph !== 'hold') return null; const p = ctx.S.player, k = K.grab;
    return { label: L(ctx).mash(A.mash || 0, k.need), x: p.x, y: p.y - 30, limit: 999, priority: 5, mouse: false, data: { mash: true } };
  },
  interact(ctx, cand) { const A = ST.b && ST.b.atk; if (cand && cand.data && cand.data.mash && A && A.ph === 'hold') { A.mash = (A.mash || 0) + 1; ctx.sfx('swing'); if (ctx.quake) ctx.quake(0.05); } },
  drawGround(g, ctx, cx, cy) {   /* lớp nền: vòng sàn tập + dấu báo đòn (tĩnh) */
    const b = ST.b; if (!b) return;
    const im = b.arena ? null : fxImg('ring'); if (im) decal(g, im, b.ring.x - cx, b.ring.y - cy, RING_DRAW, RING_DRAW, 1);   /* Sàn Đấu Ngầm: sàn cát là vòng đấu, không vẽ vòng phụ */
    else if (!b.arena) { g.strokeStyle = 'rgba(255,246,200,.5)'; g.lineWidth = 2; g.beginPath(); g.ellipse(b.ring.x - cx, b.ring.y - cy, RING_R, RING_R / 1.15, 0, 0, 7); g.stroke(); }
    { const fp = ART_VFX('spar_firepatch'); if (fp) for (const f of ST.fires || []) { const fr2 = Math.floor((f.t + (f.x % 7) * 0.1) * (fp.fps || 10)) % fp.n, hi = fp.img.__hi ? 1 : 2; g.globalAlpha = Math.min(1, (f.life - f.t) / 0.6); g.drawImage(fp.img, fr2 * fp.w * hi, 0, fp.w * hi, fp.h * hi, Math.round(f.x - cx - fp.w / 2), Math.round(f.y - cy - fp.h + 2), fp.w, fp.h); g.globalAlpha = 1; } }   /* vệt lửa (lớp nền) */
    for (const e of ST.sfxv || []) { const sh = ART_VFX(e.name); if (!sh || !e.center) continue; const f = Math.min(sh.n - 1, Math.floor(e.t * (sh.fps || 12))), hi = sh.img.__hi ? 1 : 2; g.drawImage(sh.img, f * sh.w * hi, 0, sh.w * hi, sh.h * hi, Math.round(e.x - cx - sh.w / 2), Math.round(e.y - cy - sh.h / 2), sh.w, sh.h); }   /* sóng loang trên mặt đất (dưới nhân vật) */
    const A = b.atk; if (!A) return;
    const prog = A.ph === 'wind' ? 1 - Math.max(0, A.t) / (A.T0 || 1) : 1;
    if (A.ph === 'wind') for (const sh of A.shapes) drawShape(g, sh, cx, cy, 0.9, prog, colOf(A, sh));
    else if (A.ph === 'go') for (const sh of A.shapes) if (!sh.done || A.el < (sh.d || 0) + 0.12) drawShape(g, sh, cx, cy, sh.done ? 0.4 : 0.9, 1, colOf(A, sh));
  },
  drawables(ctx, cx, cy) {
    const out = [], lv = ST.leave, g = ctx.g; if (lv) out.push({ y: lv.y, f: () => drawLeave(g, lv, cx, cy) });
    { const b = ST.b, A = b && b.atk, ri = A && A.k === 'rain' && A.ph === 'go' && fxImg((SKILLCFG[b.r.id] || {}).rainImg); if (ri) for (const sh of A.shapes) { const t0 = (sh.d || 0) - K.rain.fall; if (sh.done || A.el < t0) continue; const u = Math.min(1, (A.el - t0) / K.rain.fall), z = (1 - u) * 150;   /* vật rơi từ trần hang xuống đúng vòng (ảnh PixelLab), bóng lớn dần */
      out.push({ y: sh.y + 40, f: () => { const w = ri.naturalWidth / 2, h = ri.naturalHeight / 2; g.fillStyle = `rgba(0,0,0,${0.15 + 0.25 * u})`; g.beginPath(); g.ellipse(Math.round(sh.x - cx), Math.round(sh.y - cy), 4 + 6 * u, 2 + 1.5 * u, 0, 0, 7); g.fill(); g.drawImage(ri, 0, 0, ri.naturalWidth, ri.naturalHeight, Math.round(sh.x - cx - w / 2), Math.round(sh.y - cy - z - h), w, h); } }); } }
    { const b = ST.b, A = b && b.atk, bb = A && A.k === 'barbell' && A.ph === 'go' && fxImg('barbell'); if (bb) for (const sh of A.shapes) { if (sh.done || A.el < sh.t0) continue; const k = K.barbell, u = Math.min(1, (A.el - sh.t0) / k.fly), mo = b.mo, x0 = mo.x, y0 = mo.y - 30, gx = x0 + (sh.x - x0) * u, gy = mo.y + (sh.y - mo.y) * u, z = (y0 - mo.y) * -(1 - u) + Math.sin(Math.PI * u) * 46;   /* tạ PixelLab bay vòng cung + bóng trên đất, xoay chậm */
      out.push({ y: gy + 30, f: () => { const w = bb.naturalWidth / 2, h = bb.naturalHeight / 2; g.fillStyle = 'rgba(0,0,0,.3)'; g.beginPath(); g.ellipse(Math.round(gx - cx), Math.round(gy - cy), 7 + 4 * u, 2.5, 0, 0, 7); g.fill(); g.save(); g.translate(Math.round(gx - cx), Math.round(gy - cy - z)); g.rotate(Math.sin(u * Math.PI * 1.5) * 0.5); g.drawImage(bb, 0, 0, bb.naturalWidth, bb.naturalHeight, -Math.round(w / 2), -Math.round(h / 2), w, h); g.restore(); } }); } }
    for (const e of ST.sfxv || []) { const sh = ART_VFX(e.name); if (!sh || e.center) continue; out.push({ y: e.y + 40, f: () => {   /* sóng âm Gà Gáy: sheet PixelLab (vfx_workbench) vẽ hướng phải, xoay theo hướng gáy */
      const f = Math.min(sh.n - 1, Math.floor(e.t * (sh.fps || 12))), hi = sh.img.__hi ? 1 : 2; if (e.center) { g.drawImage(sh.img, f * sh.w * hi, 0, sh.w * hi, sh.h * hi, Math.round(e.x - cx - sh.w / 2), Math.round(e.y - cy - sh.h / 2), sh.w, sh.h); return; } g.save(); g.translate(Math.round(e.x - cx), Math.round(e.y - 8 - cy)); g.rotate(e.a || 0); g.drawImage(sh.img, f * sh.w * hi, 0, sh.w * hi, sh.h * hi, -2, -Math.round(sh.h / 2), e.w || sh.w, sh.h); g.restore(); } }); }
    return out;
  },
  drawUI(ug, ctx, cx, cy, scale) {   /* thanh máu bạn tập (giữa dưới) */
    const bfs = Math.max(10, Math.round(scale * 3));
    for (const n of [ST.b && ST.b.mo, ST.leave]) if (n && n.bubble && ctx.drawBubble) ctx.drawBubble(ug, n, Math.round((n.x - cx) * scale), Math.round((n.y - 30 - (n === (ST.b && ST.b.mo) ? Math.round(27 * (bodyK(sheetId(n)) - 1)) : 0) - cy) * scale) - bfs - 6, bfs);   /* bong bóng lời bạn tập (cao hơn dân) */
    const b = ST.b; if (!b || ctx.S.mode !== 'play') return; const mo = b.mo, W = ug.canvas.width, H = ug.canvas.height;
    { const A = b.atk; if (A && A.ult) { const T0 = A.T0 || 1, dk = A.ph === 'wind' ? Math.min(1, (T0 - A.t) / 0.4) : A.ph === 'go' ? 1 : Math.max(0, A.t / 1.6 - 0.6) * 2.5;   /* tuyệt chiêu: tối sầm cả màn (chỉ trong lúc ra chiêu), lóe sáng khi kết thúc */
      ug.save(); ug.fillStyle = `rgba(14,6,22,${(0.34 * dk).toFixed(3)})`; ug.fillRect(0, 0, W, H); if (A.ph === 'rec' && A.t > 1.35) { ug.fillStyle = `rgba(255,240,210,${((A.t - 1.35) * 1.6).toFixed(3)})`; ug.fillRect(0, 0, W, H); } ug.restore(); } }
    const fs = Math.max(12, Math.round(scale * 3.4)), bw = Math.min(W * 0.42, 360), bh = Math.max(7, Math.round(scale * 2.3)), bx = Math.round((W - bw) / 2), by = H - Math.max(118, Math.round(scale * 40));
    ug.save(); ug.fillStyle = 'rgba(13,11,20,.78)'; ug.beginPath(); ug.roundRect(bx - 10, by - fs - 8, bw + 20, bh + fs + 16, 7); ug.fill();
    ug.font = `bold ${fs}px VT323, monospace`; ug.textAlign = 'center'; ug.textBaseline = 'middle'; ug.fillStyle = '#ffd45e';
    const FF = formsOf(b.r) && formsOf(b.r)[b.form]; ug.fillText(`🥊 ${FF && b.form ? (vi(ctx) ? FF.vi + ' · ' + FF.tvi : FF.en + ' · ' + FF.ten) : nm(ctx, b.r) + ' · ' + (vi(ctx) ? b.r.svi : b.r.sen)}`, W / 2, by - fs / 2 - 2);
    ug.fillStyle = '#352022'; ug.fillRect(bx, by, bw, bh); ug.fillStyle = (b.mo.rage) || '#e8a03a'; ug.fillRect(bx, by, Math.max(1, Math.round(bw * Math.max(0, mo.hp) / mo.max)), bh);
    ug.restore();
  },
};
