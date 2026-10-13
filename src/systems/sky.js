/* sky.js — plan-31 v2 (2026-10-13, anh đổi cơ chế): BAY BẰNG CHONG CHÓNG TRE + MỖI VÙNG MỘT KHOẢNG TRỜI.
   · Chong chóng tre (vật phẩm 'copter', mua ở quầy Heathcliff): 1 cái cho người chơi, cái thứ 2 cho Rocky (thiếu → Rocky ở lại, có báo).
     Dùng: cầm trên thanh công cụ + E/A, hoặc phím X (điện thoại 🚁) — đứng NGOÀI TRỜI ở Làng / M1…M9 → bay lên khoảng trời của CHÍNH vùng đó
     (Làng → 'sky' = Quần Đảo Mây, Mx → 'sky_mx'), hiện ở chỗ tương ứng; trên trời dùng lại → hạ xuống đúng chỗ tương ứng dưới đất.
     Cảnh cất cánh ~3 s: đội chong chóng ('pặc') → chong chóng quay nhanh dần, bụi lá dưới chân → bật lên lắc lư, camera theo lên, mặt đất mờ dần,
     chim bay ngang, xuyên tầng mây → trồi lên biển mây. Hạ cánh ngược lại. E / A bỏ qua.
   · Trên trời: người chơi + Rocky lơ lửng có chong chóng quay — lõi bay giữ nguyên: tầng Thấp / Cao (Space · ⇅, 0,4 s), đòn địch theo tầng
     (vạch ĐỎ thấp / XANH cao — đổi tầng = NÉ), gió ngang, luồng gió lên, mây che tầm nhìn; bị đánh rơi → về vùng dưới đúng chỗ, −10 % máu, giữ đồ.
     Kiếm qua monsters.strike (CÙNG tầng), Z / 🪨 ném đá Seismic (mọi tầng); Rocky bay cạnh, tự đánh theo lệnh (đấm lao + Rocky-ha mọi góc).
   · Mỗi trời: màu / mây theo vùng dưới, vật mốc PixelLab riêng, quái trời phân bậc theo vùng (trời Làng yếu nhất → trời M9 mạnh nhất),
     khe mây nhìn xuống = ẢNH THU NHỎ của chính bản đồ vùng dưới. Trời M9: Cổng Trời (Bakunawa, đang khoá).
   Hệ chạy ở MỌI vùng (always): cất cánh / chỗ đáp / đổi save cũ (sách Bay → 2 chong chóng). */
import { ART, enterZone as artEnterZone, mapBuilt as artMapBuilt } from '../art.js';
import { tiles as TILES } from '../gfx.js';
import { drawBody } from '../entities.js';
import * as LV from './petlv.js';
import { SKYMON, skyMonInit, EXTRA } from './skymon.js';
import { ZONES, ROADS } from '../world.js';
import { planRoster, rosterInfo, ROSTER_LIFE } from './monsters.js';

const TS = 16, TAU = Math.PI * 2;
const LAND = /^(village|sea|m[1-9]|road[1-9])$/;   /* vùng ngoài trời có khoảng trời riêng (cùng cỡ, cùng toạ độ) */
export const SKY_OF = z => (z === 'village' ? 'sky' : LAND.test(z || '') ? 'sky_' + z : null);
export const BELOW_OF = s => (s === 'sky' ? 'village' : /^sky_(sea|m[1-9]|road[1-9])$/.test(s || '') ? s.slice(4) : null);
/* LIÊN KẾT TRỜI = đúng lối đi dưới đất: mép Bắc (n) / Nam (s) của vùng → vùng kề. Làng ↑ đèo 1 ↑ M1 ↑ đèo 2 … ↑ M9; Làng ↓ Biển (lối Biển → Làng nằm ở mép Nam của Biển).
   Mọi lối đất đều là đường 3 ô ở CỘT GIỮA bản đồ → sang trời kề giữ nguyên độ lệch so với cột giữa. */
export function SKY_LINK(z) {
  if (z === 'village') return { n: 'road1', s: 'sea' }; if (z === 'sea') return { s: 'village' };
  let r = /^road([1-9])$/.exec(z || ''); if (r) { const R = ROADS[+r[1] - 1]; return { n: R.upper, s: R.lower }; }
  r = /^m([1-9])$/.exec(z || ''); if (r) { const n = +r[1]; return { n: n < 9 ? 'road' + (n + 1) : null, s: 'road' + n }; }
  return {};
}
const themeOf = s => { if (THEME[s]) return THEME[s]; const b = BELOW_OF(s); if (b === 'sea') return THEME.sky_sea; const r = /^road([1-9])$/.exec(b || ''); if (r) return THEME[SKY_OF(ROADS[+r[1] - 1].lower)] || THEME.sky; return THEME.sky; };
const MID_LIFT = 26, TALL_H = 28, ALT_SW = 0.4, LIFT = [14, 32], FLY_SPD = 1.45, BOOST = 2, BOOST_MUL = 1.7, FALL_HP = 0.10;
/* chủ đề từng trời: màu nền biển mây, màu phủ mây, hệ số sức quái (k), xoay màu quái (hue), mây gần dày hơn (fog) */
export const THEME = {
  sky: { col: '#b1e0f9', tint: null, k: 0.22, hue: 100 },
  sky_m1: { col: '#8bedda', tint: 'rgba(120,220,220,.18)', k: 0.3, hue: 100 },
  sky_m2: { col: '#fedcb3', tint: 'rgba(255,150,70,.30)', k: 0.38, hue: 100 },
  sky_m3: { col: '#a0b997', tint: 'rgba(120,190,110,.22)', k: 0.46, hue: 0 },
  sky_m4: { col: '#dddfd9', tint: 'rgba(90,90,100,.32)', k: 0.54, hue: 0, fog: 1 },
  sky_m5: { col: '#93baf7', tint: 'rgba(80,150,255,.20)', k: 0.62, hue: 0 },
  sky_m6: { col: '#cabff9', tint: 'rgba(160,110,230,.26)', k: 0.7, hue: 0 },
  sky_m7: { col: '#fad3d0', tint: 'rgba(200,60,40,.30)', k: 0.8, hue: -35 },
  sky_m8: { col: '#c2ebfa', tint: 'rgba(200,225,255,.22)', k: 0.9, hue: -35 },
  sky_m9: { col: '#baadfe', tint: 'rgba(60,40,110,.38)', k: 1.0, hue: -35, fog: 1 },
  sky_sea: { col: '#a8d8f0', tint: null, k: 0.22, hue: 100 },
};
const STR = {
  vi: { alt: ['Thấp', 'Cao'], chip: a => `🚁 ${a}`, help: 'Bay tự do · mép Bắc / Nam sang trời vùng kề · chấm đỏ = quái dưới đất (L / 🔭 ghim — cần ống nhòm) · Z / 🪨 thả đá · 🚁 / X hạ xuống', batLow: n => `🔋 Chong chóng sắp mỏi — còn ${n} s (Trạm Mây ☁ nạp đầy · lông chim nạp ½)`, batOut: 'Chong chóng mỏi rồi — tự hạ xuống', batTired: 'Chong chóng còn mỏi — nghỉ dưới đất chút (hoặc mang lông chim)', feather: '🪶 Dùng 1 lông chim nạp chong chóng (+½ pin)', station: '☁ Trạm Mây — nạp đầy chong chóng!', bat: (m, s2) => `🔋 Pin chong chóng ${m}:${String(s2).padStart(2, '0')}`, stationTag: 'Trạm Mây',
    postTag: 'Bưu Tá Mây', postTitle: '📮 Bưu Tá Mây', postOffer: (z, m, r) => `Gửi gấp một bưu kiện tới <b>${z}</b>. Hạn ${m} phút — đi bộ qua đèo không kịp, BAY đường trời mới kịp! Thưởng ${r} 🪨 + 1 danh tiếng.`, postTake: 'Nhận bưu kiện', postClose: 'Để sau', postBusy: (z, t) => `Đang giao bưu kiện tới ${z} — còn ${t}. Mang tới hòm thư Bưu Tá Mây ở đó.`, postCancel: 'Bỏ đơn', postDone: (r, rep) => `📦 Giao xong! +${r} 🪨 · danh tiếng Bưu Tá ${rep}`, postFail: z => `📦 Hết giờ — bưu kiện tới ${z} bị trễ (mất đơn)`, postNone: 'Chưa có vùng nào khác mở để gửi', postHud: (z, t) => `📦 Bưu kiện → ${z} · ${t}`, postRep: n => `Danh tiếng Bưu Tá: ${n}`,
    evMeteor: '🌠 MƯA SAO BĂNG! Bay chặn sao trước khi chạm đất để bắt Mảnh Sao', gotStar: n => `🌠 Bắt được Mảnh Sao! (${n})`, evStorm: '⛈ Có MÂY BÃO trên trời này — mang Chai thu sét (Heathcliff) bay vào giữ ~2 s', zap: 'Sét đánh! Cần CHAI THU SÉT (quầy Heathcliff) mới thu được sét', charging: s2 => `⚡ Đang thu sét… ${s2}`, gotBolt: '⚡ Sét đóng chai!', evFlock: '🕊 Đàn chim di cư bay ngang — bay CÙNG đàn ~3 s để nhận lông quý', evWhale: '🐋 Cá Voi Mây đi ngang — bay cạnh nó ~3 s', gotFlock: '🪶 Đàn chim tặng 1 Lông quý!', gotWhale: '🐋 Cá Voi Mây để lại 2 Sợi mây!', book: n => `📖 Sách Bầu Trời: trang mới (${n}/4)`, chipMeteor: '🌠 Mưa sao băng', chipStorm: '⛈ Mây bão gần đây',
    gateTag: 'Cổng Trời', gateNeed: miss => `🔒 Cổng Trời còn KHOÁ — cần: ${miss.join(' · ')}`, gateOpened: '🌈 CỔNG TRỜI ĐÃ MỞ! Sân Bakunawa trên mây đang chờ… (trận trùm 6 sắp có)', gatePrep: '🐉 Sân Bakunawa đang được dựng trên mây — trận trùm 6 sắp có. Quay lại sau nhé!', gateHint: '🌈 Phía Bắc trời M9 có CỔNG TRỜI', needBadge9: 'huy hiệu M9', needBoss: n => `hạ ${n} trùm còn lại`,
    tiers: ['Đất', 'Trung', 'Trời'], tierChip: n => `🚁 Tầng: ${n}`, midUp: '🚁 Bay tầng TRUNG — bay qua rào / bụi / nước, không qua nhà / cây cao · Z ném đá chéo xuống · Rocky bắn / bổ nhào · X lên trời · ⇧X (giữ 🚁) hạ', midSlash: 'Đang bay tầng Trung — hạ xuống (⇧X) để chém, hoặc Z ném đá', onGround: 'Đang ở mặt đất', btnMid: 'Trung', btnUp: 'Lên', btnDown: 'Hạ',
    needBinoc: 'Cần ỐNG NHÒM (quầy Heathcliff) để ghim dấu sáng', noMark: 'Bay sát một dấu (chấm đỏ = quái · cam = Ngọc Rồng · vàng = đồ hiếm) rồi bấm L', pinned: (a, z) => `📍 Đã ghim: ${a} (${z}) — hạ cánh xuống đó sẽ có mũi tên chỉ đường`, reached: a => `📍 Đã tới chỗ ghim: ${a}`, scout: (n, r) => `Dưới kia: ${n} quái${r ? ` · ${r} ⭐hiếm` : ''}`, noStone2: 'Hết đá Seismic để thả', dropped: z => `🪨 Đá Seismic rơi xuống ${z} — quái đứng ở chỗ đá rơi sẽ trúng đòn khi bạn xuống (5 phút)`, tiles: n => `${n} ô`, edge: 'Mép trời — dưới đất không có lối sang đây', lockB: n => `Cần huy hiệu M${n} mới bay sang được (như lối dưới đất)`, lockR: n => `Phải qua cổng đèo ${n} dưới đất trước (thắng bạn tập)`,
    noCopter: 'Cần CHONG CHÓNG TRE — mua ở quầy Heathcliff (chân cầu tàu Biển)', notHere: 'Chỉ bay được NGOÀI TRỜI (Biển, Làng, M1–M9, đèo) — trong nhà / hang / khe trùm / dưới biển sâu không có trời',
    busy: 'Đang bận (xe / bè / bơi) — xuống trước rồi mới bay', rkStay1: 'Chỉ có 1 chong chóng — Rocky ở lại dưới đất (mua thêm 1 cái ở Heathcliff)',
    rkStay2: 'Rocky đang nghỉ / ở ổ — Rocky ở lại dưới đất', up: v => `🚁 Bay lên ${v}!`, down: v => `🚁 Hạ xuống ${v}`, skip: 'E / A: bỏ qua',
    fell: v => `☁ Bạn bị đánh rơi xuống ${v}! −10% máu (không mất đồ)`, knocked: 'Bị đánh rơi khỏi trời!', gate: 'Cổng Trời đang KHOÁ — sắp mở: trùm thứ 6 (Bakunawa) đang thức giấc trên mây…',
    shrine: 'Đền Gió: "Gió đưa ai có chong chóng tre lên mọi khoảng trời."', map: 'Bản Đồ Mây', mapTip: 'Bay sang khoảng trời của vùng đã mở', locked: 'chưa mở',
    useUp: 'Bay lên', useDown: 'Hạ xuống', noStone: 'Hết đá Seismic để ném', diff: a => `Khác tầng! Quái đang ở tầng ${a} — Space đổi tầng`,
    dodge: 'Né!', hooked: 'Bị móc kéo xuống tầng thấp!', windUp: 'Luồng gió lên — tăng tốc!', conv: '📘→🚁 Sách Bay cũ đổi thành 2 CHONG CHÓNG TRE (luật bay mới)' },
  en: { alt: ['Low', 'High'], chip: a => `🚁 ${a}`, help: 'Free flight · North / South edge → next sky · red dots = monsters below (L / 🔭 pins — needs binoculars) · Z / 🪨 drop a stone · X / 🚁 land', batLow: n => `🔋 Copter getting tired — ${n} s left (Cloud Station ☁ refills · a feather gives ½)`, batOut: 'The copter is worn out — landing', batTired: 'The copter is still tired — rest on the ground a bit (or carry a feather)', feather: '🪶 Used 1 feather to recharge the copter (+½)', station: '☁ Cloud Station — copter fully charged!', bat: (m, s2) => `🔋 Copter ${m}:${String(s2).padStart(2, '0')}`, stationTag: 'Cloud Station',
    postTag: 'Cloud Courier', postTitle: '📮 Cloud Courier', postOffer: (z, m, r) => `Rush a parcel to <b>${z}</b>. ${m} minutes — walking over the passes is too slow, FLY the sky road! Reward ${r} 🪨 + 1 reputation.`, postTake: 'Take parcel', postClose: 'Later', postBusy: (z, t) => `Delivering to ${z} — ${t} left. Bring it to the Cloud Courier box there.`, postCancel: 'Drop job', postDone: (r, rep) => `📦 Delivered! +${r} 🪨 · courier reputation ${rep}`, postFail: z => `📦 Time's up — the parcel to ${z} was late (job lost)`, postNone: 'No other land is open yet', postHud: (z, t) => `📦 Parcel → ${z} · ${t}`, postRep: n => `Courier reputation: ${n}`,
    evMeteor: '🌠 METEOR SHOWER! Fly into the falling stars before they land to catch Star Shards', gotStar: n => `🌠 Caught a Star Shard! (${n})`, evStorm: '⛈ STORM CLOUDS in this sky — bring a Lightning jar (Heathcliff) and hold inside ~2 s', zap: 'Zapped! You need a LIGHTNING JAR (Heathcliff) to bottle it', charging: s2 => `⚡ Bottling lightning… ${s2}`, gotBolt: '⚡ Lightning bottled!', evFlock: '🕊 A migrating flock passes — fly WITH it ~3 s for a rare feather', evWhale: '🐋 A Cloud Whale drifts by — fly beside it ~3 s', gotFlock: '🪶 The flock left you a Rainbow feather!', gotWhale: '🐋 The Cloud Whale left 2 Cloud silk!', book: n => `📖 Sky Book: new page (${n}/4)`, chipMeteor: '🌠 Meteor shower', chipStorm: '⛈ Storm cloud nearby',
    gateTag: 'Sky Gate', gateNeed: miss => `🔒 The Sky Gate is SEALED — needs: ${miss.join(' · ')}`, gateOpened: '🌈 THE SKY GATE IS OPEN! Bakunawa’s arena above the clouds awaits… (boss 6 fight coming soon)', gatePrep: '🐉 Bakunawa’s arena is being built above the clouds — boss 6 coming soon. Come back later!', gateHint: '🌈 The SKY GATE stands at the north of the M9 sky', needBadge9: 'the M9 badge', needBoss: n => `defeat the ${n} remaining bosses`,
    tiers: ['Ground', 'Mid', 'Sky'], tierChip: n => `🚁 Tier: ${n}`, midUp: '🚁 MID tier — over fences / bushes / water, not houses / tall trees · Z throws stones down · Rocky shoots / dives · X to the sky · ⇧X (hold 🚁) down', midSlash: 'Flying at mid tier — go down (⇧X) to slash, or Z to throw', onGround: 'You are on the ground', btnMid: 'Mid', btnUp: 'Up', btnDown: 'Down',
    needBinoc: 'You need BINOCULARS (Heathcliff) to pin a mark', noMark: 'Fly right over a mark (red = monsters · orange = Dragon Ball · gold = rare item) and press L', pinned: (a, z) => `📍 Pinned: ${a} (${z}) — land there and an arrow shows the way`, reached: a => `📍 Reached the pin: ${a}`, scout: (n, r) => `Below: ${n} monsters${r ? ` · ${r} ⭐rare` : ''}`, noStone2: 'No Seismic stones left to drop', dropped: z => `🪨 A Seismic stone fell on ${z} — monsters standing there get hit when you land (5 min)`, tiles: n => `${n} tiles`, edge: 'Edge of the sky — no path this way on the ground', lockB: n => `Needs the M${n} badge to fly over (same as the ground path)`, lockR: n => `Clear pass gate ${n} on the ground first (beat the sparring partner)`,
    noCopter: 'Needs a BAMBOO COPTER — buy one from Heathcliff (foot of the Sea pier)', notHere: 'You can only fly OUTDOORS (Sea, Village, M1–M9, passes) — indoors / caves / rifts / the deep sea have no sky',
    busy: 'Busy (vehicle / raft / swimming) — get off first', rkStay1: 'Only 1 copter — Rocky stays on the ground (buy one more from Heathcliff)',
    rkStay2: 'Rocky is resting / at the nest — Rocky stays on the ground', up: v => `🚁 Up to ${v}!`, down: v => `🚁 Down to ${v}`, skip: 'E / A: skip',
    fell: v => `☁ You were knocked down to ${v}! −10% HP (nothing lost)`, knocked: 'Knocked out of the sky!', gate: 'The Sky Gate is SEALED — opening soon: the sixth boss (Bakunawa) stirs above the clouds…',
    shrine: 'Wind Shrine: "The wind lifts anyone with a bamboo copter to every sky."', map: 'Cloud Map', mapTip: 'Fly over to the sky of any land you have opened', locked: 'locked',
    useUp: 'Fly up', useDown: 'Land', noStone: 'No Seismic stones left to throw', diff: a => `Different tier! It is on the ${a} tier — Space to switch`,
    dodge: 'Dodged!', hooked: 'Hooked down to the low tier!', windUp: 'Updraft — speed up!', conv: '📘→🚁 Your old Fly book became 2 BAMBOO COPTERS (new flying rules)' },
};
const L = ctx => STR[ctx.lang() === 'vi' ? 'vi' : 'en'];
const ST = { landImg: {}, landMap: {}, reach: {}, tgt: null, scout: [], falls: [], dropCd: 0, craters: [], ctx: null, fly: null, pending: null, cut: null, marks: [], shots: [], threat: new Map(), punchCd: 0, haCd: 0, throwCd: 0, lunge: null, rk: null,
  btns: null, spawnT: 0, log: [], mini: null, holes: null, tints: {}, monCfg: {} };
const sv = ctx => (ctx.S.save.sys.sky ||= {});
const petOf = ctx => ctx.S.save.sys && ctx.S.save.sys.pet && ctx.S.save.sys.pet.pet;
const inSky = ctx => !!(ctx.S.map && ctx.S.map.sky);
const zid = ctx => (ctx.S.zone && ctx.S.zone.id) || '';
const copters = ctx => (ctx.S.save.inv && ctx.S.save.inv.copter) || 0;
const altNow = () => (ST.fly ? (ST.fly.z >= 0.5 ? 1 : 0) : 0);
const liftNow = () => (ST.fly ? (ST.fly.mid ? MID_LIFT : LIFT[0] + (LIFT[1] - LIFT[0]) * ST.fly.z) : 0);
const isMid = () => !!(ST.fly && ST.fly.mid);
const log = s => { ST.log.push(s); if (ST.log.length > 40) ST.log.shift(); };
const zname = (ctx, z) => { const Z = ZONES[z]; return Z ? (ctx.lang() === 'vi' ? Z.name.vi : Z.name.en) : z; };
const ease = u => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u));
export const flyLearned = ctx => copters(ctx) > 0;   /* giữ tên cũ cho menu.js / test: 'biết bay' = có chong chóng */

/* ---------------- ảnh ---------------- */
function cre(name) { const vp = ART.packs && ART.packs.village, c = vp && vp.creatures && vp.creatures[name]; return c && c.length ? c : null; }
function skyImg(name) { const pk = ART.packs && ART.packs.sky; return pk && pk.images && pk.images[name] || null; }
const dirKey = d => (d === 0 ? 's' : d === 3 ? 'n' : 'e');
/* chong chóng = LỚP RIÊNG nhỏ gọn đặt trên ĐỈNH đầu (không che tóc mái / mắt): điểm neo = hàng điểm ảnh cao nhất của chính khung đang vẽ (quét 1 lần, nhớ đệm) */
function copterFrame(t, fps) { const c = cre('copter2_s') || cre('copter_s'); if (!c) return null; const f = c[Math.floor(t * fps) % c.length]; return f ? f[0] : null; }
const COPB = new WeakMap();
function copBottom(im) {   /* hàng đáy (logic) của núm chong chóng trong ảnh */
  let v = COPB.get(im); if (v != null) return v; v = im.height;
  try { const hi = im.__hi || 1, w = Math.round(im.width * hi), h = Math.round(im.height * hi), d = im.getContext('2d').getImageData(0, 0, w, h).data; for (let y = h - 1; y >= 0; y--) { let any = false; for (let x = 0; x < w; x++) if (d[(y * w + x) * 4 + 3] > 40) { any = true; break; } if (any) { v = (y + 1) / hi; break; } } } catch (e) { }
  COPB.set(im, v); return v;
}
function drawCopter(g, hx, hy, t, fps, alpha = 1) {   /* hx, hy = đỉnh đầu (màn hình): đáy núm chong chóng chạm tóc */
  const im = copterFrame(t, fps); if (!im) return;
  if (alpha < 1) g.globalAlpha = alpha; g.drawImage(im, Math.round(hx - im.width / 2), Math.round(hy - copBottom(im) + 1)); g.globalAlpha = 1;
}
const TOPC = new Map();
function topOf(img, sx, sy, sw, sh) {   /* {top, cx} (logic, tính trong ô) của phần thân cao nhất trong ô sx,sy,sw,sh */
  const key = (img.__tid || (img.__tid = Math.random().toString(36).slice(2))) + ':' + sx + ':' + sy; let v = TOPC.get(key); if (v) return v; v = { top: 2, cx: sw / 2 };
  try { const hi = img.__hi || 1, X = Math.round(sx * hi), Y = Math.round(sy * hi), W = Math.round(sw * hi), H = Math.round(sh * hi), d = img.getContext('2d').getImageData(X, Y, W, H).data;
    for (let y = 0; y < H; y++) { let a = -1, b = -1; for (let x = 0; x < W; x++) if (d[(y * W + x) * 4 + 3] > 60) { if (a < 0) a = x; b = x; }
      if (a >= 0) { let a2 = a, b2 = b; for (let yy = y; yy < Math.min(H, y + Math.round(3 * hi)); yy++) for (let x = 0; x < W; x++) if (d[(yy * W + x) * 4 + 3] > 60) { a2 = Math.min(a2, x); b2 = Math.max(b2, x); } v = { top: y / hi, cx: (a2 + b2 + 1) / 2 / hi }; break; } }
  } catch (e) { }
  TOPC.set(key, v); return v;
}
function rkPre(ctx) { const pt = petOf(ctx); if (!pt) return 'rockypet'; if (pt.superT > 0 && cre('rockysup_hover_s')) return 'rockysup'; return LV.levelFromXp(pt.xp || 0).lv >= 5 ? 'rockybig' : 'rockypet'; }
function rkFrames(ctx, clip, dir) {
  const pre = rkPre(ctx), k = dirKey(dir);
  return cre(`${pre}_${clip}_${k}`) || (clip === 'cheer' ? cre(`${pre}_cheer_s`) : null) || cre(`${pre}_hover_${k}`) || cre(`${pre}_idle_${k}`) || cre(pre + (k === 's' ? '_ds' : k === 'n' ? '_dn' : '')) || cre(pre) || cre('rockypet');
}
/* người chơi: clip 'hover' (chân đung đưa) nếu thân có; không thì dáng đứng gốc. Trả điểm neo đỉnh đầu (màn hình) để đặt chong chóng */
function drawPlayer(g, p, x, y, clip, t) {
  const acts = p.sheet && p.sheet.actions, a = clip === 'hover' && acts && acts.hover, d = p.dir & 3;
  if (a) { const ch = a.ch || 20, cw = a.cw || 16, f = Math.floor(t * 7) % a.n, X = Math.round(x) - (cw >> 1), Y = Math.round(y) - 18 - (ch - 20);
    g.drawImage(a.img, f * cw, d * ch, cw, ch, X, Y, cw, ch); const tp = topOf(a.img, f * cw, d * ch, cw, ch); return { hx: X + tp.cx, hy: Y + tp.top }; }
  const sk = p.sheet && p.sheet.skin;
  if (sk) { const X = Math.round(x) - Math.floor(sk.cw / 2), Y = Math.round(y) + 2 - sk.ch; g.drawImage(sk.img, 0, d * sk.ch, sk.cw, sk.ch, X, Y, sk.cw, sk.ch); const tp = topOf(sk.img, 0, d * sk.ch, sk.cw, sk.ch); return { hx: X + tp.cx, hy: Y + tp.top }; }
  const X = Math.round(x) - 8, Y = Math.round(y) - 18; g.drawImage(p.sheet, 0, d * 20, 16, 20, X, Y, 16, 20); const tp = topOf(p.sheet, 0, d * 20, 16, 20); return { hx: X + tp.cx, hy: Y + tp.top };
}
function shadowH(g, x, y, h) {   /* h = độ cao 0 (sát đất) … 1 (rất cao): bóng ở cao TO + MỜ, sát đất NHỎ + ĐẬM */
  h = Math.max(0, Math.min(1, h)); const sz = 0.75 + h * 0.9, a = 1.25 - h * 0.85;
  for (const [m, al] of [[1.35, 0.08], [1.0, 0.1], [0.62, 0.13]]) { g.fillStyle = `rgba(20,30,70,${(al * a).toFixed(3)})`; g.beginPath(); g.ellipse(x, y + 1, 9 * sz * m, 3 * sz * m, 0, 0, TAU); g.fill(); }
}
function shadow(g, x, y, k) { for (const [m, al] of [[1.35, 0.08], [1.0, 0.1], [0.62, 0.12]]) { g.fillStyle = `rgba(20,30,70,${(al * (0.4 + k * 0.7)).toFixed(3)})`; g.beginPath(); g.ellipse(x, y + 1, (8 * k + 3) * m, (2.6 * k + 1.2) * m, 0, 0, TAU); g.fill(); } }
function drawRocky(g, ctx, x, y, dir, clip, t, cop, copFps, copA = 1) {   /* x, y = chân Rocky (màn hình); cop: chong chóng trên đỉnh đầu theo khung */
  const set = rkFrames(ctx, clip, dir); if (!set) return 0;
  const fr = set[Math.floor(t * 8) % set.length], fl = dir === 1 ? 1 : 0, im = fr[fl], X = Math.round(x - im.width / 2), Y = Math.round(y - im.height);
  g.drawImage(im, X, Y); if (cop) { const tp = topOf(fr[0], 0, 0, im.width, im.height), cxp = fl ? im.width - tp.cx : tp.cx; drawCopter(g, X + cxp, Y + tp.top, t, copFps, copA); } return im.height;
}

/* ---------------- trạng thái bay (trên trời) ---------------- */
function drawHover(g, ent) {
  const ctx = ST.ctx, f = ST.fly; if (!ctx || !f) return;
  const t = ctx.S.time, x = Math.round(ent.x), y = Math.round(ent.y), lift = Math.round(liftNow()), bob = Math.round(Math.sin(t * 3) * 1.5), cut = ST.cut, zc = cut && cut.z ? cut.z : 0;
  shadow(g, x, y, 1 - f.z * 0.45);
  const rk = ST.rk; if (rk && rk.with && rk.y <= y) drawRkHover(g, ctx, t);
  const py = y - lift + bob + zc, dir = ent.dir & 3, trail = ART.vfx && ART.vfx.sky_trail;
  if (trail && trail.img && ent.moving) { const hi = trail.img.__hi ? 1 : 2, fi = Math.floor(t * (trail.fps || 12)) % trail.n, inp = ctx.input || {};
    const vx = (inp.right ? 1 : 0) - (inp.left ? 1 : 0) || (dir === 2 ? 1 : dir === 1 ? -1 : 0), vy = (inp.down ? 1 : 0) - (inp.up ? 1 : 0) || (dir === 0 ? 1 : dir === 3 ? -1 : 0);
    g.save(); g.globalAlpha = 0.7; g.translate(x, py - 8); g.rotate(Math.atan2(vy, vx)); g.drawImage(trail.img, fi * trail.w * hi, 0, trail.w * hi, trail.h * hi, -trail.w + 6, -Math.round(trail.h / 2), trail.w, trail.h); g.restore(); }
  const hd = drawPlayer(g, ent, x, py, 'hover', t);
  drawCopter(g, hd.hx, hd.hy, t, cut ? cut.fps || 18 : 18);
  if (rk && rk.with && rk.y > y) drawRkHover(g, ctx, t);
  ent.labelUp = Math.max(0, lift + 10 - zc);
}
function drawRkHover(g, ctx, t) {
  const rk = ST.rk, cut = ST.cut, x = Math.round(rk.x + (ST.lunge ? ST.lunge.dx : 0)), y = Math.round(rk.y + (ST.lunge ? ST.lunge.dy : 0)), lift = Math.round(liftNow() + 2), zc = cut && cut.z ? cut.z : 0;
  shadow(g, x, y, 0.8 - (ST.fly ? ST.fly.z * 0.35 : 0));
  drawRocky(g, ctx, x, y - lift + Math.round(Math.sin(t * 3 + 1.3) * 1.5) + zc, rk.dir, rk.cheer > 0 ? 'cheer' : 'hover', t, true, cut ? cut.fps || 18 : 18);
}
function startFly(ctx, alt = 0, x, y) {
  const p = ctx.S.player; if (x != null) { p.x = x; p.y = y; }
  ST.fly = { alt, z: alt, sw: 0, boost: 0, hook: 0 };
  p.custom = drawHover; p.ghost = true; p.speedMul = FLY_SPD; p.boxW = 10; p.boxH = 6;
  p.passable = (m, tx, ty) => tx >= 0 && ty >= 0 && tx < m.w && ty < m.h;
  log('fly');
}
function stopFly(ctx) {
  const p = ctx.S.player; ST.fly = null; ST.lunge = null; p.labelUp = 0; if (p.custom === drawHover || p.custom === drawCut) p.custom = null; p.ghost = false; p.speedMul = 1; p.passable = null; p.boxW = 10; p.boxH = 6;
}
function switchAlt(ctx) {
  const f = ST.fly; if (!f || f.hook > 0 || ST.cut) return false;
  f.alt = 1 - f.alt; f.sw = ALT_SW; ctx.sfx('whoosh'); if (ctx.vfx && ART.vfx && ART.vfx.sky_gust) ctx.vfx('sky_gust', ctx.S.player.x, ctx.S.player.y + 2);
  log('alt ' + f.alt); return true;
}

/* ---------------- dùng chong chóng tre ---------------- */
function rkCanCome(ctx) {
  const pt = petOf(ctx), e = ctx.rocky && ctx.rocky.ent && ctx.rocky.ent();
  if (!pt) return { ok: false, why: '' }; if (copters(ctx) < 2) return { ok: false, why: L(ctx).rkStay1 };
  if (pt.koT > 0 || pt.cmd === 'home' || !e || e.state === 'home') return { ok: false, why: L(ctx).rkStay2 };
  return { ok: true };
}
function mapXY(x, y, from, to) { return { x: x * (to.w / from.w), y: y * (to.h / from.h) }; }
const LAND_SIZE = { w: 80, h: 64 };
function useCopter(ctx) {
  const t = L(ctx), p = ctx.S.player, z = zid(ctx);
  if (ST.cut || ctx.S.mode !== 'play') return false;
  if (inSky(ctx)) { startDown(ctx); return true; }
  if (!copters(ctx)) { ctx.toast(t.noCopter); ctx.sfx('fail'); return true; }
  if (!LAND.test(z) || !SKY_OF(z)) { ctx.toast(t.notHere); ctx.sfx('fail'); return true; }
  const fromMid = isMid(); if (fromMid) { const keep = ST.rk; stopFly(ctx); ST.rk = keep; }
  if (batOf(ctx) < 15 && !useFeather(ctx)) { ctx.toast(t.batTired); ctx.sfx('fail'); return true; }
  if (p.custom || ctx.S.swimming) { ctx.toast(t.busy); ctx.sfx('fail'); return true; }
  const rc = rkCanCome(ctx), e = ctx.rocky && ctx.rocky.ent && ctx.rocky.ent();
  if (!rc.ok && rc.why) ctx.toast(rc.why);
  if (!(fromMid && ST.rk)) ST.rk = rc.ok && e ? { with: true, x: e.x, y: e.y, dir: 0, cheer: 0.8 } : (petOf(ctx) ? { with: false, x: -9999, y: -9999, dir: 0, cheer: 0 } : null);
  const toZ = SKY_OF(z);
  ST.cut = { kind: 'up', t: 0, fps: 4, z: 0, gx: p.x, gy: p.y, to: toZ, from: z, rk: !!(ST.rk && ST.rk.with), popped: false, dustT: 0, land: landImage(ctx, z), base: fromMid ? MID_LIFT : 0 }; if (fromMid) { ST.cut.t = 1.5; ST.cut.cop = true; ST.cut.popped = true; ST.cut.fps = 26; }
  p.dir = 0; p.custom = drawCut; ctx.setMode('copter'); ctx.registerCloser('copter', () => skipCut(ctx));
  ctx.onAction('copter', () => skipCut(ctx));
  ctx.toast(t.up(zname(ctx, toZ)) + ' · ' + t.skip); log('takeoff ' + z + '→' + toZ);
  return true;
}
function startDown(ctx, toMid = false) {
  const t = L(ctx), below = BELOW_OF(zid(ctx)); if (!below) return; const tg = landTarget(ctx); ST.toMid = toMid;
  ST.cut = tg && !tg.ok && !tg.none ? { kind: 'drift', t: 0, fps: 18, z: 0, to: below, from: zid(ctx), rk: !!(ST.rk && ST.rk.with), tx: tg.x, ty: tg.y } : { kind: 'down', t: 0, fps: 18, z: 0, to: below, from: zid(ctx), rk: !!(ST.rk && ST.rk.with) };
  ctx.setMode('copter'); ctx.registerCloser('copter', () => skipCut(ctx)); ctx.onAction('copter', () => skipCut(ctx));
  ctx.toast(t.down(zname(ctx, below)) + ' · ' + t.skip); ctx.sfx('whoosh'); log('down ' + zid(ctx) + '→' + below);
}
function goTravel(ctx, to, pend) {
  ST.pending = pend; if (ctx.S.mode !== 'play') ctx.setMode('play');
  if (typeof window !== 'undefined' && window.__enterZone && ZONES[to]) { ST.leaving = true; setTimeout(() => { try { window.__enterZone(to, 'default'); } catch (e) { console.error('sky travel', e); ST.leaving = false; } }, 0); return; }   /* màn đã trắng xoá → đổi vùng ngay, không qua màn đen của travel */
  if (ctx.travel(to, 'default')) ST.leaving = true; else { ST.pending = null; ST.cut = null; }
}
function skipCut(ctx) {
  const C = ST.cut; if (!C) { if (ctx.S.mode === 'copter') ctx.setMode('play'); return; }
  if (C.kind === 'up') { C.t = 99; } else if (C.kind === 'down') { C.t = 99; } else { C.t = 99; }
  log('skip ' + C.kind);
}
/* ô đáp được: không cứng, không vật, nối tới lối vào chính; cả hộp chân người (±5, ±3 px) nằm trên ô đi được */
function walkAt(ctx, m, reach, x, y) { for (const [dx, dy] of [[-5, -3], [5, -3], [-5, 3], [5, 3]]) { const tx = Math.floor((x + dx) / TS), ty = Math.floor((y + dy) / TS);
  if (tx < 1 || ty < 1 || tx >= m.w - 1 || ty >= m.h - 1 || ctx.isSolid(m, tx, ty) || (ctx.hasObjectAt && ctx.hasObjectAt(m, tx, ty)) || (reach && !reach[ty * m.w + tx])) return false; } return true; }
const reachStart = (z, m) => (z === 'sea' ? m.entries.back : m.entries.default);   /* Biển: 'default' là giữa biển → tính vùng đi được từ cầu tàu */
function reachOf(ctx, z, m) { if (!ST.reach[z] || ST.reach[z].m !== m) ST.reach[z] = { m, r: ctx.computeReach && m.entries && reachStart(z, m) ? ctx.computeReach(m, reachStart(z, m)) : null }; return ST.reach[z].r; }
/* ĐIỂM ĐÁP (trên trời): đúng chỗ dưới bóng người (cùng toạ độ đất) nếu đáp được; không thì tâm ô đi được gần nhất (trôi ngang tới đó rồi mới hạ) */
function landTarget(ctx) {
  const z = BELOW_OF(zid(ctx)); if (!z) return null; if (!ST.landMap[z]) landImage(ctx, z); const m = ST.landMap[z]; if (!m) return null;
  const p = ctx.S.player, key = z + ':' + Math.round(p.x) + ':' + Math.round(p.y); if (ST.tgt && ST.tgt.key === key) return ST.tgt;
  const reach = reachOf(ctx, z, m); let t = null;
  if (walkAt(ctx, m, reach, p.x, p.y)) t = { ok: true, x: p.x, y: p.y };
  else { const tx0 = Math.floor(p.x / TS), ty0 = Math.floor(p.y / TS);
    for (let r = 1; r < 30 && !t; r++) { let best = null, bd = 1e9; for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
      const x = (tx0 + dx) * TS + 8, y = (ty0 + dy) * TS + 10; if (!walkAt(ctx, m, reach, x, y)) continue; const d = Math.hypot(x - p.x, y - p.y); if (d < bd) { bd = d; best = { ok: false, x, y }; } } t = best; } }
  ST.tgt = t ? { ...t, key } : { ok: false, x: p.x, y: p.y, none: true, key }; return ST.tgt;
}
function drawTarget(g, ctx, cx, cy) {   /* vòng ngắm TĨNH trên bóng: xanh = đáp được · đỏ = ô cứng / nước → mũi tên tới ô đáp gần nhất */
  const t = landTarget(ctx), p = ctx.S.player; if (!t) return; const px = Math.round(p.x - cx), py = Math.round(p.y - cy) + 1;
  const ring = (x, y, col) => { g.strokeStyle = col; g.lineWidth = 1; g.beginPath(); g.ellipse(x + 0.5, y + 0.5, 7, 3.5, 0, 0, TAU); g.stroke(); g.fillStyle = col; g.fillRect(x - 10, y, 3, 1); g.fillRect(x + 8, y, 3, 1); g.fillRect(x, y - 6, 1, 2); g.fillRect(x, y + 5, 1, 2); };
  if (t.ok) { ring(px, py, 'rgba(110,255,140,.9)'); return; }
  ring(px, py, 'rgba(255,80,70,.9)'); if (t.none) return; const qx = Math.round(t.x - cx), qy = Math.round(t.y - cy) + 1; ring(qx, qy, 'rgba(110,255,140,.9)');
  const a = Math.atan2(qy - py, qx - px), d = Math.hypot(qx - px, qy - py); if (d < 14) return; const sx = px + Math.cos(a) * 9, sy = py + Math.sin(a) * 5, ex = qx - Math.cos(a) * 10, ey = qy - Math.sin(a) * 5;
  g.strokeStyle = 'rgba(110,255,140,.85)'; g.beginPath(); g.moveTo(sx, sy); g.lineTo(ex, ey); g.lineTo(ex - Math.cos(a - 0.5) * 4, ey - Math.sin(a - 0.5) * 4); g.moveTo(ex, ey); g.lineTo(ex - Math.cos(a + 0.5) * 4, ey - Math.sin(a + 0.5) * 4); g.stroke();
}
/* chỗ đáp dưới đất: ô đi được gần nhất, nối tới lối vào chính */
function landSpot(ctx, at) {
  const m = ctx.S.map, reach = reachOf(ctx, zid(ctx), m);
  const tx0 = Math.max(1, Math.min(m.w - 2, Math.floor(at.x / TS))), ty0 = Math.max(1, Math.min(m.h - 2, Math.floor(at.y / TS)));
  for (let r = 0; r < 40; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue; const x = tx0 + dx, y = ty0 + dy; if (x < 1 || y < 1 || x >= m.w - 1 || y >= m.h - 1) continue;
    if (ctx.isSolid(m, x, y) || (ctx.hasObjectAt && ctx.hasObjectAt(m, x, y)) || (reach && !reach[y * m.w + x])) continue;
    return { x: x * TS + 8, y: y * TS + 14, tx: x, ty: y };
  }
  return null;
}

/* ---------------- cảnh cất / hạ cánh ---------------- */
function drawCut(g, ent) {   /* p.custom trong lúc cảnh: người (+ Rocky) đội chong chóng, bay lên / xuống theo C.z */
  const ctx = ST.ctx, C = ST.cut; if (!ctx || !C) return;
  const t = ctx.S.time, x = Math.round(ent.x), y = Math.round(ent.y), z = Math.round(C.lift || 0), sway = Math.round(C.sway || 0);
  const rz = Math.round(C.rlift ?? z); shadowH(g, x, y, z / 90);
  const rk = ST.rk && ST.rk.with ? ST.rk : null, rx = rk ? Math.round(rk.x) : 0, ry = rk ? Math.round(rk.y) : 0;
  if (rk) shadowH(g, rx, ry, rz / 90);
  const clip = C.lift > 2 ? 'hover' : 'stand', py = y - z + Math.round(C.hop || 0) + (C.knee || 0);   /* knee: khuỵu gối nhẹ lúc chạm đất */
  const pdraw = () => { const hd = drawPlayer(g, ent, x + sway, py, clip, t); if (C.cop) drawCopter(g, hd.hx, hd.hy - (C.drop || 0), t, C.fps || 4, C.copA ?? 1); };
  const rdraw = () => { if (!rk) return; const rclip = (C.kind === 'up' && C.t < 1.5) || (C.kind === 'touch' && C.t > 1.5) ? 'cheer' : 'hover'; drawRocky(g, ctx, rx - sway, ry - rz + Math.round(C.hop || 0) + (C.rknee || 0), 0, rclip, t, !!C.cop, C.fps || 4, C.copA ?? 1); };
  if (rk && ry <= y) { rdraw(); pdraw(); } else { pdraw(); rdraw(); }
  ent.labelUp = Math.max(0, z + 4);
}
function cutTick(ctx, dt) {
  if (midCutTick(ctx, dt)) return;
  const C = ST.cut, p = ctx.S.player, t = L(ctx); C.t += dt;
  const rk = ST.rk && ST.rk.with ? ST.rk : null;
  if (rk && C.kind !== 'arrive' && C.kind !== 'down' && C.kind !== 'touch') { rk.x += (p.x - 18 - rk.x) * Math.min(1, dt * 4); rk.y += (p.y + 2 - rk.y) * Math.min(1, dt * 4); }
  if (C.kind === 'up') {   /* 0–0.8 đội chong chóng · 0.8–1.5 quay nhanh dần + bụi · 1.5–3.0 bay lên, camera theo, mây xuyên qua */
    if (C.t >= 0.15 && C.t < 0.45) { C.cop = true; C.drop = Math.round((0.45 - C.t) / 0.3 * 26); } else C.drop = 0;   /* chong chóng rơi từ trên xuống đỉnh đầu */
    if (C.t >= 0.45 && !C.popped) { C.popped = true; C.cop = true; ctx.sfx('pickup'); if (ctx.vfx) { ctx.vfx('item_pickup_pop', p.x, p.y - 18, 0, true); if (rk) ctx.vfx('item_pickup_pop', rk.x, rk.y - 22, 0, true); } }
    C.fps = C.t < 0.8 ? 4 : C.t < 1.5 ? 4 + (C.t - 0.8) / 0.7 * 22 : 26;
    if (C.t > 0.8 && C.t < 1.7) { C.dustT -= dt; C.hop = C.t > 1.1 ? -Math.abs(Math.sin(C.t * 18)) * 1.5 : 0; if (C.dustT <= 0) { C.dustT = 0.18; if (ctx.vfx) { ctx.vfx('dirt_puff', p.x + (Math.random() - 0.5) * 14, p.y + 2); if (!C.leaf) { C.leaf = true; ctx.vfx('leaf_fall', p.x, p.y, 1.2); } } ctx.sfx && C.t < 0.9 && ctx.sfx('whoosh'); } }
    const u = (C.t - 1.5) / 1.5; C.lift = (C.base || 0) + (190 - (C.base || 0)) * ease(u) * (u > 0 ? 1 : 0); C.sway = u > 0 ? Math.sin(C.t * 7) * 2.5 : 0; if (u > 0) C.hop = 0;
    ctx.S.camDY = -C.lift * 0.95; C.shrink = 0; C.zx = C.gx; C.zy = C.gy; C.zoom = u > 0 ? 1 - 0.5 * ease(u / 0.9) : 1; C.zA = u > 0 && C.land ? 1 : 0; C.haze = Math.max(0, Math.min(0.6, (C.t - 1.6) / 1.1));   /* mặt đất thu nhỏ dần quanh chỗ cất cánh */   /* mặt đất 1× (camera theo lên) → bản đồ thật thu nhỏ NGUYÊN LẦN 1/2 + lớp không khí → mây phủ: liền với nền trời */ C.clouds = Math.max(0, (C.t - 2.1) / 0.9); C.white = Math.max(0, (C.t - 2.7) / 0.3);
    if (C.t >= 3.0 && !C.gone) { C.gone = true; ctx.S.camDY = 0;
      const to = ZONES[C.to] ? C.to : null; if (!to) { ST.cut = null; return; }
      goTravel(ctx, to, { kind: 'arrive', x: C.gx, y: C.gy, rk: C.rk }); }
    return;
  }
  if (C.kind === 'arrive' && C.edge) {   /* sang trời kề qua mép: sương trắng lướt qua rồi tan, không màn đen */
    C.white = Math.max(0, 0.85 - C.t / 0.4); C.clouds = Math.max(0, 1 - C.t / 0.7); C.z = 0; C.fps = 18;
    if (C.t >= 0.7) { ST.cut = null; ctx.setMode('play'); log('edge in ' + zid(ctx)); }
    return;
  }
  if (C.kind === 'arrive') {   /* trồi lên trên biển mây: màn trắng tan, mây trôi xuống, người + Rocky bay lên vào chỗ, chong chóng chậm lại */
    C.white = Math.max(0, 1 - C.t / 0.5); C.clouds = Math.max(0, 1 - C.t / 1.1); C.z = 70 * (1 - ease(C.t / 1.0)); C.fps = 26 - Math.min(1, C.t / 1.2) * 8;
    if (C.t > 1.2 && rk) rk.cheer = 0.9;
    if (C.t >= 1.3) { ST.cut = null; ctx.setMode('play'); const h = L(ctx).help; ctx.toast(h); log('arrived'); }
    return;
  }
  if (C.kind === 'drift') {   /* điểm dưới bóng là ô cứng / nước: trôi ngang nhẹ tới ô đáp gần nhất rồi mới hạ thẳng */
    const dx = C.tx - p.x, dy = C.ty - p.y, d = Math.hypot(dx, dy), st = 80 * dt;
    if (d <= st || C.t > 4) { p.x = C.tx; p.y = C.ty; ST.cut = C.next === 'middown' ? { kind: 'middown', t: 0, fps: 16, cop: true, lift: MID_LIFT } : { kind: 'down', t: 0, fps: 18, z: 0, to: C.to, from: C.from, rk: C.rk }; if (C.next === 'middown') p.custom = drawCut; log('drift done'); }
    else { p.x += dx / d * st; p.y += dy / d * st; if (Math.abs(dx) > Math.abs(dy)) p.dir = dx > 0 ? 2 : 1; else p.dir = dy > 0 ? 0 : 3; }
    if (ST.rk && ST.rk.with) rockyTick(ctx, dt); return;
  }
  if (C.kind === 'down') {   /* chìm xuống xuyên mây, màn trắng → xuống vùng dưới */
    C.z = 0; C.clouds = Math.min(1, C.t / 0.9);   /* trên trời: đứng yên tại điểm đáp, sương cuộn lên che (rơi thẳng ở cảnh dưới đất) */ C.white = Math.max(0, (C.t - 0.8) / 0.4); C.up = true;
    if (C.t >= 1.2 && !C.gone) { C.gone = true; const below = C.to, at = { x: p.x, y: p.y };   /* cùng toạ độ: 1 ô trời = 1 ô đất */
      ST.landing = below; goTravel(ctx, below, { kind: 'touch', x: at.x, y: at.y, rk: C.rk, fell: !!C.fell, exact: true, toMid: !!ST.toMid && !C.fell }); ST.toMid = false; }
    return;
  }
  if (C.kind === 'touch') {   /* HẠ CÁNH THẲNG ĐỨNG xuống đúng điểm dưới bóng (anh vẽ): mặt đất từ thu nhỏ lớn dần ĐÚNG TÂM là điểm đáp, sương tan,
     chong chóng chậm dần như dù, đung đưa nhỏ dần, bóng nhỏ + đậm dần; chạm đất: khuỵu gối + bụi; Rocky đáp cạnh sau 0,3 s; chong chóng dừng rồi cất */
    const T0 = 0.9, T1 = 1.55, liftAt = tt => (tt < T0 ? 84 - 38 * (tt / T0) : tt < T1 ? 46 * (1 - ease((tt - T0) / (T1 - T0))) : 0);   /* màn chỉ cao ~176 px logic */
    C.white = Math.max(0, 1 - C.t / 0.25); C.clouds = Math.max(0, 1 - C.t / 0.6); C.up = true; C.haze = Math.max(0, 0.45 * (1 - C.t / T0));
    C.zx = p.x; C.zy = p.y; C.zoom = C.t < T0 ? 0.5 + 0.5 * ease(C.t / T0) : 1; C.zA = C.land ? (C.t < T0 ? 1 : Math.max(0, 1 - (C.t - T0) / 0.2)) : 0;
    C.lift = liftAt(C.t); C.rlift = liftAt(Math.max(0, C.t - 0.3)); if (C.toMid) { C.lift = Math.max(MID_LIFT, C.lift); C.rlift = Math.max(MID_LIFT, C.rlift); if (C.t >= T1) { ST.cut = null; ctx.S.camDY = 0; ctx.setMode('play'); startMid(ctx); ctx.toast(L(ctx).midUp); log('sky→mid'); return; } } const hgt = C.lift / 84;
    C.sway = C.lift > 1 ? Math.sin(C.t * 6) * 2.5 * hgt : 0; ctx.S.camDY = -C.lift * 0.5; C.fps = C.t < T1 ? 26 - 16 * Math.min(1, C.t / T1) : Math.max(0, 10 - (C.t - T1) * 30);
    C.knee = C.t >= T1 && C.t < T1 + 0.16 ? 2 : 0; C.rknee = C.t >= T1 + 0.3 && C.t < T1 + 0.46 ? 2 : 0;
    if (C.t >= T1 && !C.landed) { C.landed = true; ctx.sfx('build'); if (ctx.vfx) { ctx.vfx('dirt_puff', p.x - 5, p.y + 2); ctx.vfx('dirt_puff', p.x + 5, p.y + 2); } if (C.fell && ctx.quake) ctx.quake(0.25); log('touch at ' + Math.round(p.x) + ',' + Math.round(p.y)); }
    if (rk && C.t >= T1 + 0.3 && !C.rlanded) { C.rlanded = true; if (ctx.vfx) ctx.vfx('dirt_puff', rk.x, rk.y + 2); }
    if (C.t > T1 + 0.35) C.copA = Math.max(0, 1 - (C.t - T1 - 0.35) / 0.2);
    if (C.t >= T1 + 0.55 && !C.popOff) { C.popOff = true; C.cop = false; ctx.sfx('pickup'); }
    if (C.t >= T1 + 0.65) { ST.cut = null; ctx.S.camDY = 0; stopFly(ctx); p.custom = null; p.labelUp = 0; ctx.setMode('play');
      if (rk) { const e = ctx.rocky && ctx.rocky.ent && ctx.rocky.ent(); if (e) { e.x = rk.x; e.y = rk.y; e.hop = 0.45; } } ST.rk = null; log('touched'); }
  }
}
/* lớp phủ của cảnh: sương che đất, chim bay ngang, mây lướt qua (xuống khi bay lên · lên khi hạ xuống), màn trắng giữa 2 vùng */
function drawCutOverlay(g, ctx, cx, cy) {
  const C = ST.cut; if (!C) return; const VW = ctx.VW, VH = ctx.VH, th = themeOf(C.kind === 'up' ? C.to : C.kind === 'touch' ? SKY_OF(zid(ctx)) : zid(ctx));
  if (C.zA > 0 && C.land && C.zoom < 1.001) { const Lc = C.land, s2 = C.zoom, ax = C.zx - cx, ay = C.zy - cy, sm = g.imageSmoothingEnabled;   /* mặt đất thu nhỏ — TÂM là điểm cất / đáp (đứng yên trên màn) */
    g.globalAlpha = C.zA; g.fillStyle = th.col; g.fillRect(0, 0, VW, VH); g.imageSmoothingEnabled = false; g.drawImage(Lc, Math.round(ax - C.zx * s2), Math.round(ay - C.zy * s2), Math.round(Lc.width * s2), Math.round(Lc.height * s2)); g.imageSmoothingEnabled = sm; g.globalAlpha = 1; }
  if (C.haze > 0) { g.fillStyle = th.col; g.globalAlpha = Math.min(0.85, C.haze); g.fillRect(0, 0, VW, VH); g.globalAlpha = 1; }
  const gull = ART.monsters && ART.monsters.gull;
  if (gull && C.kind === 'up' && C.t > 1.7 && C.t < 2.9) { const u = (C.t - 1.7) / 1.2, fr = Math.floor(C.t * 10) % gull.n;
    for (const [oy, sp, s] of [[0.32, 1, 0], [0.42, 0.8, 30]]) g.drawImage(gull.img, fr * gull.cw, 2 * gull.ch, gull.cw, gull.ch, Math.round(-40 + u * (VW + 80) * sp + s), Math.round(VH * oy), gull.cw, gull.ch); }
  if ((C.haze > 0.05 || C.zA > 0) && ctx.S.player.custom === drawCut) { g.save(); g.translate(-cx, -cy); drawCut(g, ctx.S.player); g.restore(); }   /* người + Rocky vẽ lại TRÊN lớp sương (mặt đất mờ dần, nhân vật vẫn rõ) — mây vẫn lướt qua trước mặt */
  if (C.clouds > 0) { const dir = C.up ? -1 : 1, col = mixHex(th.col, 'w', 0.6), sm = g.imageSmoothingEnabled; g.imageSmoothingEnabled = true;   /* xuyên qua biển sương: khối sương mềm lướt qua màn */
    for (let i = 0; i < 8; i++) { const im = fogTint(i % 4, col); if (!im) continue; const w = im.width * 1.6, h = im.height * 1.6, x = ((i * 137) % (VW + 120)) - 140, sp = 0.7 + (i % 3) * 0.35;
      const y = dir > 0 ? -h + ((C.clouds * VH * 1.6 * sp + i * 53) % (VH + h * 2)) : VH - ((C.clouds * VH * 1.6 * sp + i * 53) % (VH + h * 2));
      g.globalAlpha = Math.min(0.95, 0.5 + C.clouds); g.drawImage(im, x, y, w, h); } g.globalAlpha = 1; g.imageSmoothingEnabled = sm; }
  if (C.white > 0) { g.fillStyle = '#f4fbff'; g.globalAlpha = Math.min(1, C.white); g.fillRect(0, 0, VW, VH); g.globalAlpha = 1; }
}
function tinted(im, th) {   /* mây PixelLab phủ màu chủ đề trời (tạo 1 lần) */
  if (!th || !th.tint || !im) return im; const key = th.tint + '|' + im.width + 'x' + im.height + (im.__id || (im.__id = Math.random().toString(36).slice(2)));
  if (ST.tints[key]) return ST.tints[key];
  const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const g = c.getContext('2d'); g.drawImage(im, 0, 0);
  g.globalCompositeOperation = 'source-atop'; g.fillStyle = th.tint; g.fillRect(0, 0, c.width, c.height); return (ST.tints[key] = c);
}

/* ---------------- rơi (bị đánh rơi khỏi trời) ---------------- */
function fall(ctx, why) {
  if (!inSky(ctx) || (ST.cut && ST.cut.kind === 'down')) return false;
  ST.cut = { kind: 'down', t: 0.3, fps: 30, z: 0, to: BELOW_OF(zid(ctx)), from: zid(ctx), rk: !!(ST.rk && ST.rk.with), fell: true };
  ctx.setMode('copter'); ctx.sfx('whoosh'); ctx.toast(L(ctx).knocked, true); log('fall ' + why); return true;
}

/* ---------------- đòn theo tầng (dùng chung cho 5 quái) ---------------- */
function hitPlayer(ctx, mo, mul, tier, kind) {
  const p = ctx.S.player; if (!ctx.hero || ctx.hero.fainted || ST.cut || ctx.S.mode !== 'play' || ctx.S.time < (ST.graceT || 0)) return false;   /* vừa lên trời: 5 s ân hạn */
  if (tier !== altNow()) { (ctx.S.pops ||= []).push({ x: p.x, y: p.y - 30, text: L(ctx).dodge, color: '#bfe8ff', t: 0 }); ST.dodges = (ST.dodges || 0) + 1; return false; }
  ctx.hero.hit(Math.round(mo.c.dmg * mul)); ST.threat.set(mo, ctx.S.time); ST.hits = (ST.hits || 0) + 1;
  if (kind === 'knockoff' && ST.fly) fall(ctx, 'knock');
  return true;
}
function shove(ctx, ux, uy, d) {
  const p = ctx.S.player, l = Math.hypot(ux, uy) || 1, n = Math.ceil(d / 3), m = ctx.S.map;
  for (let i = 0; i < n; i++) { const nx = p.x + ux / l * d / n, ny = p.y + uy / l * d / n; if (nx > 8 && ny > 8 && nx < m.w * TS - 8 && ny < m.h * TS - 8) { p.x = nx; p.y = ny; } }
}
const API = { L, hitPlayer, shove, tier: () => altNow(), flying: () => !!ST.fly, mark: m => { ST.marks.push(m); }, log, setHook: t => { if (ST.fly) { ST.fly.alt = 0; ST.fly.sw = Math.max(ST.fly.sw, 0.15); ST.fly.hook = t; } } };
skyMonInit(API);

/* ---------------- Rocky bay cạnh người chơi + tự đánh (lệnh Bảo vệ / Tấn công) ---------------- */
function rockyTick(ctx, dt) {
  const rk = ST.rk, p = ctx.S.player; if (!rk || !rk.with) return;
  if (rk.cheer > 0) rk.cheer -= dt;
  const inp = ctx.input || {}, side = (p.dir & 3) === 1 ? 1 : -1, tx = p.x + side * 20, ty = p.y + 4;
  rk.x += (tx - rk.x) * Math.min(1, dt * 5); rk.y += (ty - rk.y) * Math.min(1, dt * 5); rk.dir = p.dir & 3; void inp;
  const pt = petOf(ctx); if (!pt || !ctx.monsters) return;
  if (ST.punchCd > 0) ST.punchCd -= dt; if (ST.haCd > 0) ST.haCd -= dt;
  if (ST.lunge) { ST.lunge.t -= dt; const k = Math.sin((1 - ST.lunge.t / 0.26) * Math.PI) * 10; ST.lunge.dx = ST.lunge.ux * k; ST.lunge.dy = ST.lunge.uy * k; if (ST.lunge.t <= 0) ST.lunge = null; }
  if (pt.cmd !== 'protect' && pt.cmd !== 'attack') return;
  const now = ctx.S.time; let best = null, bd = 1e9;
  for (const mo of ctx.monsters.list()) {
    if ((inSky(ctx) ? !mo.c.sky : !!mo.c.sky) || mo.hp <= 0) continue; const d = Math.hypot(mo.x - rk.x, mo.y - rk.y);
    if (pt.cmd === 'protect' && !(now - (ST.threat.get(mo) ?? -99) < 6 || d < 40)) continue;
    if (d < (pt.cmd === 'attack' ? 150 : 170) && d < bd) { bd = d; best = mo; }
  }
  if (!best) return;
  const stats = ctx.rocky && ctx.rocky.stats ? ctx.rocky.stats() : null, atk = stats ? stats.atk : 20, lift = best.lift ?? 10, ang = Math.atan2(best.y - lift - (rk.y - liftNow() - 10), best.x - rk.x);
  if (bd < 46 && ST.punchCd <= 0 && (best.alt ?? 0) === altNow()) {
    const t = Math.max(1, LV.tierOf(pt, 'punch')), P = LV.punchOf(t), dmg = Math.max(1, Math.round(atk * P.mul * 1.2 * (isMid() ? 0.8 : 1)));
    ST.punchCd = Math.max(0.6, P.cd + 0.3); ST.lunge = { t: 0.26, ux: Math.cos(ang), uy: Math.sin(ang), dx: 0, dy: 0 };
    best.__rkDmg = (best.__rkDmg || 0) + dmg; ctx.monsters.damage(best, dmg, rk, 1, 90, true);
    if (ctx.vfx) ctx.vfx(`rk_punch_t${LV.vfxTier(t)}`, best.x, best.y + 2 - lift); ctx.sfx('hit'); ST.punches = (ST.punches || 0) + 1; log('rk punch ' + best.c.key); return;
  }
  const ht = LV.tierOf(pt, 'ha');
  if (ht > 0 && ST.haCd <= 0 && bd < LV.haRange(ht) && ctx.rocky && ctx.rocky.haFire && ctx.rocky.haReady && ctx.rocky.haReady()) {
    if (ctx.rocky.haFire(ang)) { ST.haCd = LV.haOf(ht).cd; ST.has = (ST.has || 0) + 1; log('rk ha ' + Math.round(ang * 57)); }
  }
}

/* ---------------- ném đá Seismic (tầm xa, mọi tầng) ---------------- */
const hitY = mo => mo.y - (mo.lift ?? 10) - Math.round((mo.c.vh || 16) / 2);
function throwStone(ctx) {
  const p = ctx.S.player, t = L(ctx); if (ST.throwCd > 0 || !ctx.monsters || !ST.fly) return false;
  if (!ctx.bag.has('stone', 1)) { ctx.toast(t.noStone); ctx.sfx('fail'); return false; }
  let tg = null, bd = 190;
  const lk = ctx.target && ctx.target.mon && ctx.target.mon(); if (lk && (lk.mo || lk.ref) && ctx.monsters.list().includes(lk.mo || lk.ref)) tg = lk.mo || lk.ref;
  if (!tg) for (const mo of ctx.monsters.list()) { const d = Math.hypot(mo.x - p.x, mo.y - p.y); if (d < bd) { bd = d; tg = mo; } }
  const DV = [[0, 1], [-1, 0], [1, 0], [0, -1]][p.dir & 3], oy = p.y - liftNow() - 12;
  const tx = tg ? tg.x : p.x + DV[0] * 150, ty = tg ? hitY(tg) : oy + DV[1] * 150, l = Math.hypot(tx - p.x, ty - oy) || 1;
  ctx.bag.remove('stone', 1); ST.throwCd = 0.55;
  ST.shots.push({ x: p.x, y: oy, vx: (tx - p.x) / l * 240, vy: (ty - oy) / l * 240, t: 0.8 }); ctx.sfx('whoosh'); log('throw'); return true;
}
function shotsTick(ctx, dt) {
  if (ST.throwCd > 0) ST.throwCd -= dt;
  for (const s of ST.shots) { s.t -= dt; s.x += s.vx * dt; s.y += s.vy * dt;
    for (const mo of ctx.monsters ? ctx.monsters.list() : []) { if (s.done) break;
      if (Math.hypot(mo.x - s.x, hitY(mo) - s.y) < Math.max(10, (mo.c.w || 14) * 0.45)) { const dmg = Math.max(1, Math.round((ctx.hero ? ctx.hero.atk : 10) * 0.9)); s.done = true;
        ctx.monsters.damage(mo, dmg, ctx.S.player, 1, 50, true); if (ctx.vfx) ctx.vfx('rock_debris', s.x, s.y + 4); ctx.sfx('hit'); ST.stoneHits = (ST.stoneHits || 0) + 1; } } }
  ST.shots = ST.shots.filter(s => s.t > 0 && !s.done);
}

/* ---------------- quái trời phân bậc theo vùng ---------------- */
function recolorSheet(key, hue) {   /* bản xoay màu (bậc) của sheet quái PixelLab — đọc / ghi pixel thẳng (không qua shim __hi), tạo 1 lần */
  const id = key + '@' + hue; if (!hue || !ART.monsters) return key; if (ART.monsters[id]) return id; const b = ART.monsters[key]; if (!b || !b.img || !b.img.getContext) return key;
  const w = b.img.width, h = b.img.height, src = b.img.getContext('2d').getImageData(0, 0, w, h), a = src.data, rot = hue / 360;
  for (let i = 0; i < a.length; i += 4) { if (!a[i + 3]) continue; let r = a[i] / 255, g = a[i + 1] / 255, bb = a[i + 2] / 255; const mx = Math.max(r, g, bb), mn = Math.min(r, g, bb), l = (mx + mn) / 2; let H = 0, S = 0;
    if (mx !== mn) { const d = mx - mn; S = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn); H = mx === r ? (g - bb) / d + (g < bb ? 6 : 0) : mx === g ? (bb - r) / d + 2 : (r - g) / d + 4; H /= 6; }
    if (S < 0.12) continue; H = (H + rot + 1) % 1; const q = l < 0.5 ? l * (1 + S) : l + S - l * S, pp = 2 * l - q, f = tt => { tt = (tt + 1) % 1; return tt < 1 / 6 ? pp + (q - pp) * 6 * tt : tt < 0.5 ? q : tt < 2 / 3 ? pp + (q - pp) * (2 / 3 - tt) * 6 : pp; };
    a[i] = f(H + 1 / 3) * 255; a[i + 1] = f(H) * 255; a[i + 2] = f(H - 1 / 3) * 255; }
  const c = document.createElement('canvas'); c.width = w; c.height = h; c.getContext('2d').putImageData(src, 0, 0); c.__hi = b.img.__hi;
  ART.monsters[id] = { ...b, img: c }; return id;
}
function monCfg(ctx, key) {   /* cấu hình quái theo trời: sức × k, tên theo bậc, sheet xoay màu */
  const z = zid(ctx), th = THEME[z] || THEME.sky, id = z + ':' + key; if (ST.monCfg[id]) return ST.monCfg[id];
  const c = SKYMON[key], k = th.k, vi = ctx.lang() === 'vi', suf = k < 0.4 ? { vi: ' Non', en: 'Young ' } : k >= 0.8 ? { vi: ' Cổ', en: 'Elder ' } : { vi: '', en: '' };
  return (ST.monCfg[id] = { ...c, hp: Math.max(40, Math.round(c.hp * k)), dmg: Math.max(4, Math.round(c.dmg * (0.3 + 0.7 * k))), xp: Math.max(6, Math.round(c.xp * k)), armor: Math.round((c.armor || 0) * k),
    vi: c.vi + suf.vi, en: suf.en + c.en, sheet: recolorSheet(c.sheet, th.hue), tier: k, aiKey: key }); void vi;
}
function spawnSky(ctx, key, x, y) { const c = SKYMON[key] && monCfg(ctx, key); if (!c || !ctx.monsters) return null; const mo = ctx.monsters.add(c, x, y); mo.alt = c.alt0 ?? 0; mo.home = { x, y }; return mo; }
function popOf(ctx) {
  const k = (themeOf(zid(ctx))).k, big = ctx.S.map.w >= 70;
  return big ? [['thunder', 3], ['jelly', 3], ['hawk', 2], ['pirate', 1], ['whale', 1]] : [['thunder', 2], ['jelly', 2], ['hawk', 1], ['pirate', k >= 0.45 ? 1 : 0], ['whale', k >= 0.6 ? 1 : 0]];
}
function voidSpot(ctx, far) {
  const m = ctx.S.map, p = ctx.S.player;
  for (let i = 0; i < 60; i++) { const x = 3 + Math.floor(Math.random() * (m.w - 6)), y = 3 + Math.floor(Math.random() * (m.h - 6)), wx = x * TS + 8, wy = y * TS + 8;
    if (ctx.getG(m, x, y) === ctx.T.CHASM && Math.hypot(wx - p.x, wy - p.y) > far) return { x: wx, y: wy }; }
  return { x: m.w * 8, y: m.h * 8 };
}
function populate(ctx) { for (const [k, n] of popOf(ctx)) for (let i = 0; i < n; i++) { const s = voidSpot(ctx, 150); spawnSky(ctx, k, s.x, s.y); } }
function respawnTick(ctx, dt) {
  ST.spawnT -= dt; if (ST.spawnT > 0) return; ST.spawnT = 25;
  for (const [k, n] of popOf(ctx)) { const have = ctx.monsters.list().filter(m => m.c.sky && m.c.aiKey === k).length; if (have < n) { const s = voidSpot(ctx, 200); spawnSky(ctx, k, s.x, s.y); return; } }
}

/* ---------------- NỀN TRỜI = BẢN ĐỒ THẬT CỦA VÙNG DƯỚI (ô tile Wang + vật thể PixelLab), vẽ 1 lần ra đệm ở 1/2 (giữ nét, nearest) ---------------- */
function renderLandMap(ctx, m) {
  const W = m.w * TS, H = m.h * TS, c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d'); g.imageSmoothingEnabled = false;   /* 1:1 — cùng toạ độ với trời */
  for (let ty = 0; ty < m.h; ty++) for (let tx = 0; tx < m.w; tx++) { const sx = tx * TS, sy = ty * TS, t = m.ground[ty * m.w + tx];
    if (!(ART.ground && ART.ground(g, m, tx, ty, sx, sy))) { const fr = TILES[t]; if (fr) g.drawImage(fr.pick ? fr.pick(tx, ty) : fr[0], sx, sy); } }
  if (ART.groundDone) ART.groundDone(g);
  for (const o of m.objects.slice().sort((p, q) => (p.y + (ctx.O[p.type] ? ctx.O[p.type].fh : 1)) - (q.y + (ctx.O[q.type] ? ctx.O[q.type].fh : 1)))) {
    const d = ctx.O[o.type]; if (!d || o.ghost) continue; const im = o.artImg || (d.frames ? d.frames[0] : d.img); if (!im) continue; const by = (o.y + d.fh) * TS;
    try { g.drawImage(im, o.x * TS + (o.artImg ? 0 : (d.ox || 0)), by - (o.artImg ? im.height / (ART.hi || 1) : d.h) + (o.artImg ? 0 : (d.oy || 0))); } catch (e) { } }
  return c;
}
function landImage(ctx, z) {   /* đệm bản đồ vùng đất z (cache) — đang ở vùng khác thì mượn gói ảnh của z trong chốc lát rồi trả lại */
  if (!z || !ZONES[z]) return null; if (ST.landImg[z]) return ST.landImg[z];
  try {
    if (zid(ctx) === z) { ST.landImg[z] = renderLandMap(ctx, ctx.S.map); ST.landMap[z] = ctx.S.map; }
    else { const Z = ZONES[z], saved = (ctx.S.save.districts || {})[z] || {}, ng = ctx.nationGroups ? ctx.nationGroups(Z.lv) : [];
      const m = Z.build(ctx.rngFrom(ctx.hashStr(z)), { nations: ng.map((gg, i) => ({ key: gg.key, size: gg.members.length, tier: saved[i] && saved[i].tier })) }); ST.landMap[z] = m;
      const cur = zid(ctx); artEnterZone(z); artMapBuilt(m); try { ST.landImg[z] = renderLandMap(ctx, m); } finally { artEnterZone(cur); artMapBuilt(ctx.S.map); } }
  } catch (e) { console.error('sky landImage', e); ST.landImg[z] = null; }
  return ST.landImg[z];
}
function pickHoles(ctx) {
  const m = ctx.S.map, out = [], want = m.w >= 70 ? 5 : 3, ok = (x, y) => { for (let dy = -2; dy <= 2; dy++) for (let dx = -3; dx <= 3; dx++) if (ctx.getG(m, x + dx, y + dy) !== ctx.T.CHASM) return false; return true; };
  for (let y = 4; y < m.h - 3 && out.length < want; y += 3) for (let x = 4; x < m.w - 4 && out.length < want; x += 3) if (ok(x, y) && !out.some(o => Math.hypot(o.x - (x * TS + 8), o.y - (y * TS + 8)) < 200)) out.push({ x: x * TS + 8, y: y * TS + 8, r: 40 + ((x * 7 + y * 3) % 3) * 6 });
  return out;
}

/* ---------------- nền mây parallax + mặt dưới đảo ---------------- */
function layer(g, imgs, n, f, drift, FW, FH, cx, cy, t, VW, VH, alpha, seed) {
  g.globalAlpha = alpha;
  for (let i = 0; i < n; i++) { const im = imgs[i % imgs.length]; if (!im) continue; const w = im.width / 2, h = im.height / 2, hx = ((i + seed) * 977) % FW, hy = ((i + seed) * 613 + i * 131) % FH;
    const x = ((hx - cx * f + t * drift * (1 + (i % 3) * 0.3)) % FW + FW) % FW - w, y = ((hy - cy * f) % FH + FH) % FH - h;
    for (let rx = x; rx < VW + w; rx += FW) for (let ry = y; ry < VH + h; ry += FH) g.drawImage(im, Math.round(rx), Math.round(ry), w, h); }
  g.globalAlpha = 1;
}
const WMASK = {};
function wangMasked(ctx) {   /* lớp Wang 0 của gói trời này: bỏ phần 'sương' (gần màu ô biển thuần) → trong suốt; đọc pixel thẳng (không qua shim) */
  const z = zid(ctx); if (WMASK[z] !== undefined) return WMASK[z]; const pk = ART.packs && ART.packs[z]; WMASK[z] = null; if (!pk || !pk.layers || !pk.layers.length) return null;
  const L0 = pk.layers[0], base = L0.byKey['0000']; if (!base || !base.getContext) return null; const bd = base.getContext('2d').getImageData(0, 0, base.width, base.height).data;
  let r = 0, gg = 0, b = 0, n = 0; for (let i = 0; i < bd.length; i += 4) if (bd[i + 3]) { r += bd[i]; gg += bd[i + 1]; b += bd[i + 2]; n++; } r /= n; gg /= n; b /= n;
  const thr = z === 'sky_m8' ? 22 : 48, out = {};
  for (const [k, img] of Object.entries(L0.byKey)) { if (k.endsWith('v') || k === '0000' || !img.getContext) continue; const id = img.getContext('2d').getImageData(0, 0, img.width, img.height), a = id.data;
    for (let i = 0; i < a.length; i += 4) if (Math.abs(a[i] - r) + Math.abs(a[i + 1] - gg) + Math.abs(a[i + 2] - b) < thr) a[i + 3] = 0;
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; c.getContext('2d').putImageData(id, 0, 0); c.__hi = img.__hi; out[k] = c; }
  const clsOf = {}, name = {}; for (const [k, v] of Object.entries(ctx.T)) name[v] = k; const classes = pk.classes || {};
  const cls = (x, y) => { const m = ctx.S.map, v = ctx.getG(m, Math.max(0, Math.min(m.w - 1, x)), Math.max(0, Math.min(m.h - 1, y))); return clsOf[v] || (clsOf[v] = classes[name[v]] || classes.__base || 'sky'); };
  return (WMASK[z] = { L0: out, layers: pk.layers, cls });
}
const FOGC = {};
function mixHex(hex, to, k) { const n = parseInt(hex.slice(1), 16), r = n >> 16, g2 = (n >> 8) & 255, b = n & 255, t = to === 'w' ? 255 : 0; return `rgb(${Math.round(r + (t - r) * k)},${Math.round(g2 + (t - g2) * k)},${Math.round(b + (t - b) * k)})`; }
function fogTint(i, col) {   /* khối sương mềm (zones/sky/fog — mờ Gauss) tô màu theo trời; tạo 1 lần */
  const key = i + '|' + col; if (FOGC[key]) return FOGC[key]; const im = skyImg('fog_' + i); if (!im) return null;
  const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const x = c.getContext('2d'); x.drawImage(im, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = col; x.fillRect(0, 0, c.width, c.height); return (FOGC[key] = c);
}
function fogLayer(g, ctx, th, tone, alpha, n, f, drift, sc, seed, cx, cy, t) {
  const col = tone === 'dark' ? mixHex(th.col, 'k', 0.32) : mixHex(th.col, 'w', 0.68), VW = ctx.VW, VH = ctx.VH, FW = 760, FH = 560, sm = g.imageSmoothingEnabled; g.imageSmoothingEnabled = true; g.globalAlpha = alpha;
  for (let i = 0; i < n; i++) { const im = fogTint((i + seed) % 4, col); if (!im) continue; const w = im.width * sc, h = im.height * sc, hx = ((i + seed) * 977) % FW, hy = ((i + seed) * 613 + i * 131) % FH;
    const x = ((hx - cx * f + t * drift * (1 + (i % 3) * 0.3)) % FW + FW) % FW - w * 0.6, y = ((hy - cy * f) % FH + FH) % FH - h * 0.6;
    for (let rx = x; rx < VW + w; rx += FW) for (let ry = y; ry < VH + h; ry += FH) g.drawImage(im, rx, ry, w, h); }
  g.globalAlpha = 1; g.imageSmoothingEnabled = sm;
}
let BLUR = null;
function blurLand(im) {   /* đất rất xa dưới sương: làm mờ nhẹ 1 lần (cảm giác chiều sâu, như mẫu) */
  if (!im) return null; if (BLUR && BLUR.src === im) return BLUR.c; const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const x = c.getContext('2d');
  try { x.filter = 'blur(1.2px)'; } catch (e) { /* trình duyệt cũ: bỏ */ } x.drawImage(im, 0, 0); BLUR = { src: im, c }; return c;
}
const RIMC = new Map();
function rimOf(im) {   /* viền sáng 1px ở mép trên ảnh đảo (pixel có alpha mà phía trên trống) — tạo 1 lần */
  if (RIMC.has(im)) return RIMC.get(im); const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const x = c.getContext('2d'); x.drawImage(im, 0, 0);
  try { const d = x.getImageData(0, 0, c.width, c.height), p = d.data, W = c.width, H = c.height, o = new Uint8ClampedArray(p);
    for (let yy = 2; yy < H; yy++) for (let xx = 0; xx < W; xx++) { const i = (yy * W + xx) * 4; if (p[i + 3] < 200 || p[i - W * 8 + 3] > 40 || p[i - W * 4 + 3] < 200) continue;
      for (let k = 0; k < 2; k++) { const j = i + W * 4 * k; o[j] = Math.min(255, p[j] + (255 - p[j]) * 0.45); o[j + 1] = Math.min(255, p[j + 1] + (255 - p[j + 1]) * 0.45); o[j + 2] = Math.min(255, p[j + 2] + (255 - p[j + 2]) * 0.4); } }
    d.data.set(o); x.putImageData(d, 0, 0); } catch (e) { /* canvas bẩn: bỏ viền */ }
  RIMC.set(im, c); return c;
}
function fogOver(g, cxp, cyp, w, h, th, a) {   /* 1 khối sương mềm đặt tại (tâm) — phủ đáy đảo / đáy khúc gỗ */
  const im = fogTint(2, mixHex(th.col, 'w', 0.55)); if (!im) return; const sm = g.imageSmoothingEnabled; g.imageSmoothingEnabled = true; g.globalAlpha = a; g.drawImage(im, cxp - w / 2, cyp - h / 2, w, h); g.globalAlpha = 1; g.imageSmoothingEnabled = sm;
}
function drawSkyGround(g, ctx, cx, cy) {   /* nhìn xuyên xuống bản đồ THẬT của vùng dưới (cùng toạ độ, mờ nhẹ vì rất xa) qua biển sương mềm nhiều lớp */
  const VW = ctx.VW, VH = ctx.VH, t = ctx.S.time, th = themeOf(zid(ctx));
  g.fillStyle = th.col; g.fillRect(0, 0, VW, VH);
  const land = blurLand(landImage(ctx, BELOW_OF(zid(ctx))));
  if (land) { const sm = g.imageSmoothingEnabled; g.imageSmoothingEnabled = false; g.drawImage(land, Math.round(-cx), Math.round(-cy)); g.imageSmoothingEnabled = sm;
    g.fillStyle = mixHex(th.col, 'w', 0.25); g.globalAlpha = 0.5; g.fillRect(0, 0, VW, VH); g.globalAlpha = 1; }   /* lớp không khí theo màu trời */
  /* BIỂN SƯƠNG MÂY mềm (mẫu Romestead anh gửi): khối sương mờ Gauss, 3 lớp trôi lệch nhau — lớp sâu tối, lớp trên sáng; đất lộ ra ở chỗ sương mỏng */
  fogLayer(g, ctx, th, 'dark', 0.34, 9, 1, 2, 1.35, 3, cx, cy, t);
  fogLayer(g, ctx, th, 'light', 0.72, 13, 1, 4, 1.5, 7, cx, cy, t);
  fogLayer(g, ctx, th, 'light', 0.4, 6, 1.12, 7, 1.7, 21, cx, cy, t);
}

/* ---------------- Bản Đồ Mây (trời Làng): bay sang trời của vùng khác ---------------- */
function zoneOpen(ctx, z) { if (z === 'village') return true; const n = +z.slice(1); const b = ctx.S.save.badges || []; return n === 1 || b.includes(n - 1) || b.includes(n) || !!(ctx.S.save.sys.road && ctx.S.save.sys.road.won && ctx.S.save.sys.road.won['road' + n]); }
const DESTS = ['village', 'm1', 'm2', 'm3', 'm4', 'm5', 'm6', 'm7', 'm8', 'm9'];
function openMap(ctx) {
  const t = L(ctx), vi = ctx.lang() === 'vi', el = ctx.panel('skymap', '');
  el.panel.innerHTML = `<h2>☁ ${t.map}</h2><p class="dim">${t.mapTip}</p><div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">${DESTS.map(z => {
    const ok = zoneOpen(ctx, z) && SKY_OF(z) !== zid(ctx); return `<button class="btn ${ok ? 'primary' : ''}" data-skyto="${z}" ${ok ? '' : 'disabled'}>${zname(ctx, SKY_OF(z))}${zoneOpen(ctx, z) ? '' : ' · ' + t.locked}</button>`; }).join('')}</div>
    <p style="text-align:center;margin-top:8px"><button class="btn" data-skyto="x">${vi ? 'Đóng' : 'Close'}</button></p>`;
  el.hidden = false; ctx.setMode('skymap');
  el.onclick = ev => { const b = ev.target.closest('[data-skyto]'); if (!b || b.disabled) return; el.hidden = true; ctx.setMode('play'); const z = b.dataset.skyto; if (z === 'x') return; flyTo(ctx, z); };
}
function flyTo(ctx, z) {
  if (!DESTS.includes(z) || !zoneOpen(ctx, z) || !inSky(ctx)) return false; const to = SKY_OF(z);
  ST.cut = { kind: 'down', t: 0, fps: 26, z: 0, to: null, cross: to, rk: !!(ST.rk && ST.rk.with) }; ctx.setMode('copter'); log('cross ' + to);
  return true;
}

/* ---------------- đổi save cũ: sách 'Bay' / chiêu fly → 2 chong chóng tre ---------------- */
function migrate(ctx) {
  const s = sv(ctx), inv = ctx.S.save.inv || {}, pt = petOf(ctx); let give = 0;
  if ((inv.rkbook_fly || 0) > 0) { ctx.bag.remove('rkbook_fly', inv.rkbook_fly); give = 2; }
  if (pt && pt.skills && pt.skills.fly && !s.flyConv) { give = Math.max(give, 2); delete pt.skills.fly; }
  if (give) { s.flyConv = true; const need = Math.max(0, give - copters(ctx)); if (need) ctx.bag.add('copter', need); setTimeout(() => ctx.toast(L(ctx).conv, true), 900); ctx.persist(); log('migrate +' + need); }
}

/* ---------------- nút điện thoại ---------------- */
function flyWhy(ctx) {   /* '' = bấm được; còn lại = lý do (nút mờ) */
  const t = L(ctx), p = ctx.S.player, z = zid(ctx);
  if (ST.cut) return ' '; if (inSky(ctx)) return '';
  if (!copters(ctx)) return t.noCopter; if (!LAND.test(z) || !SKY_OF(z)) return t.notHere; if (p.custom || ctx.S.swimming) return t.busy; if (batOf(ctx) < 15 && !((ctx.S.save.inv || {}).feather || (ctx.S.save.inv || {}).tfeather)) return t.batTired; return '';
}
function pressFly(ctx) {   /* NÚT RIÊNG (X · 🚁): cất / hạ cánh — E / A không bao giờ làm việc này */
  if (ctx.S.mode === 'copter') { skipCut(ctx); return; } if (ctx.S.mode !== 'play') return;
  const why = flyWhy(ctx); if (why && why.trim()) { ctx.toast(why); ctx.sfx('fail'); return; } if (!why) useCopter(ctx);
}
function copIcon() { const it = ART.man && ART.man.ui && ART.man.ui.items; return it && it.copter ? 'assets/px/' + it.copter : ''; }
function btns(ctx) {
  if (ST.btns || typeof document === 'undefined') return ST.btns;
  if (!document.getElementById('sky-style')) { const s = document.createElement('style'); s.id = 'sky-style'; s.textContent = `.sky-btn{position:fixed;width:46px!important;height:46px!important;font-size:20px!important;z-index:6;border-radius:50%!important;padding:0!important;display:flex;align-items:center;justify-content:center}
    .sky-btn[hidden],#btn-copter[hidden]{display:none!important} .sky-btn img{width:30px;height:30px;image-rendering:pixelated} .sky-btn.off,#btn-copter.off{opacity:.45;filter:grayscale(.6)}
    #btn-copter{position:fixed;z-index:7;display:flex;align-items:center;gap:4px;padding:3px 8px 3px 4px;background:#f4e3c4;border:3px solid #6b3416;border-radius:6px;box-shadow:0 3px 0 #3a1c0c;font:16px VT323,monospace;color:#3a1c0c;cursor:pointer}
    #btn-copter img{width:32px;height:32px;image-rendering:pixelated} #btn-copter b{font-weight:normal} #btn-copter i{font-style:normal;background:#6b3416;color:#fff6c8;border-radius:3px;padding:0 4px;margin-left:2px}`; document.head.appendChild(s); }
  const tc = document.getElementById('touch'), coarse = (() => { try { return matchMedia('(pointer:coarse)').matches; } catch (e) { return false; } })();
  const mk = (id, txt, fn, parent) => { const b = document.createElement('button'); b.id = id; b.type = 'button'; b.className = 'sky-btn'; b.innerHTML = txt; b.hidden = true; (parent || document.body).appendChild(b);
    b.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); if (ST.ctx && (ST.ctx.S.mode === 'play' || ST.ctx.S.mode === 'copter')) fn(ST.ctx); }); return b; };
  const ic = copIcon(), fly = coarse && tc ? mk('btn-skyfly', ic ? `<img src="${ic}" alt="">` : '🚁', () => {}, tc) : null;
  if (fly) { let held = null, fired = false; const down = e => { e.preventDefault(); e.stopPropagation(); fired = false; clearTimeout(held); held = setTimeout(() => { fired = true; if (ST.ctx) pressDown(ST.ctx); }, 450); };   /* chạm = lên · giữ 0,45 s = xuống */
    const up = e => { e.preventDefault(); clearTimeout(held); if (!fired && ST.ctx) pressUp(ST.ctx); fired = true; }; fly.addEventListener('pointerdown', down); fly.addEventListener('pointerup', up); fly.addEventListener('pointercancel', () => clearTimeout(held)); }
  let desk = null;
  if (!coarse) { desk = document.createElement('button'); desk.id = 'btn-copter'; desk.type = 'button'; desk.hidden = true; desk.innerHTML = `${ic ? `<img src="${ic}" alt="">` : '🚁'}<b></b><i>X</i>`; document.body.appendChild(desk);
    desk.addEventListener('mousedown', e => { e.preventDefault(); e.stopPropagation(); if (!ST.ctx) return; if (e.shiftKey || e.button === 2) pressDown(ST.ctx); else pressUp(ST.ctx); }); desk.addEventListener('contextmenu', e => e.preventDefault()); }
  ST.btns = { fly, desk, alt: tc ? mk('btn-skyalt', '🔭', c => pressPin(c), tc) : null, thr: tc ? mk('btn-skythrow', '🪨', c => (isMid() ? midThrow(c) : pressDrop(c)), tc) : null };
  return ST.btns;
}
function placeBtns(ctx) {
  const B = btns(ctx); if (!B) return; const play = ctx.S.mode === 'play' || ctx.S.mode === 'copter', show = play && (inSky(ctx) || isMid() || copters(ctx) > 0), why = flyWhy(ctx), t = L(ctx);
  if (B.desk) { B.desk.hidden = !show; B.desk.classList.toggle('off', !!why && !ST.cut); B.desk.title = why.trim(); B.desk.querySelector('b').textContent = ST.cut ? t.skip : inSky(ctx) ? t.useDown : isMid() ? `${t.btnMid} · X ${t.btnUp} / ⇧X ${t.btnDown}` : t.useUp;
    const hb = document.getElementById('hotbar'), r = hb && hb.getBoundingClientRect(), bw = B.desk.offsetWidth || 150, bh = B.desk.offsetHeight || 44;
    if (r && r.width) { let x = r.right + 8; if (x + bw > window.innerWidth - 70) x = r.left - bw - 8; B.desk.style.left = Math.round(x) + 'px'; B.desk.style.top = Math.round(r.top + (r.height - bh) / 2) + 'px'; }
    else { B.desk.style.left = (window.innerWidth - bw - 90) + 'px'; B.desk.style.top = (window.innerHeight - bh - 16) + 'px'; } }
  if (!B.fly) return;
  B.fly.hidden = !show; B.fly.classList.toggle('off', !!why && !ST.cut); B.thr.hidden = !(ctx.S.mode === 'play' && (inSky(ctx) || isMid()) && !ST.cut); B.alt.hidden = B.thr.hidden || !binoc(ctx) || !inSky(ctx);   /* plan-32 A: 🔭 ghim (có ống nhòm) · 🪨 thả đá */
  const a = document.getElementById('btn-a'), r = a && a.getBoundingClientRect(); if (!r || !r.width) return;
  const vis = id => { const e = document.getElementById(id), q = e && e.getBoundingClientRect(); return q && q.width && getComputedStyle(e).display !== 'none' ? q : null; };
  const others = ['joy', 'btn-tgt', 'herobar', 'btn-menu', 'btn-photo', 'btn-chat', 'px-clock', 'px-status', 'px-money', 'hotbar'].map(vis).filter(Boolean)
    .concat([...document.querySelectorAll('#mslots .ms-eat, #mslots .ms-bag')].map(e => e.getBoundingClientRect()).filter(q => q.width));
  const W = 46, gap = 8, used = [], hit = (x, y) => x < 0 || y < 0 || x + W > window.innerWidth || y + W > window.innerHeight || others.concat(used).some(q => x < q.right + 2 && x + W > q.left - 2 && y < q.bottom + 2 && y + W > q.top - 2);
  const cand = []; for (let i = 1; i <= 4; i++) cand.push([r.left - i * (W + gap), r.top + (r.height - W) / 2], [r.left + (r.width - W) / 2, r.top - i * (W + gap)], [r.left - i * (W + gap), r.top - (W + gap)]);
  for (const b of [B.fly, B.alt, B.thr]) { if (b.hidden) continue; const at = cand.find(([x, y]) => !hit(x, y)) || cand[0]; b.style.left = Math.round(at[0]) + 'px'; b.style.top = Math.round(at[1]) + 'px'; used.push({ left: at[0], top: at[1], right: at[0] + W, bottom: at[1] + W }); }
}

/* ---------------- plan-32 A: TRINH SÁT TỪ TRÊN CAO ----------------
   Trên trời thấy cả map dưới → DẤU SÁNG tĩnh (không nhấp nháy) ở: nghệ sĩ chưa gặp ★ (chỗ đứng thật — main.js placeNpcs dùng chung), Leader 👑,
   Ngọc Rồng / đồ hiếm còn nằm dưới đất (save.sys.drops). Ống nhòm (Heathcliff): L / 🔭 ghim dấu gần nhất → 📍 trên bản đồ thế giới + mũi tên khi xuống vùng đó.
   Thả đá (Z / 🪨, 1 đá, hồi 2,5 s): đá rơi xuống sương → để lại hố đá ở đúng chỗ dưới đất 5 phút; quái đứng / đi qua hố khi bạn ở dưới đó trúng đòn 1 lần. */
const SCI = {};
function scImg(src) { const c = SCI[src]; if (c) return c.naturalWidth ? c : null; const im = new Image(); im.src = src; SCI[src] = im; return null; }
const mkImg = k => scImg('assets/px/zones/sky/scout/' + k + '.png');
function itemImg(id) { const it = ART.man && ART.man.ui && ART.man.ui.items && ART.man.ui.items[id]; return it ? scImg('assets/px/' + it) : null; }
const binoc = ctx => ((ctx.S.save.inv || {}).binoc || 0) > 0;
/* plan-32 A v2 (anh: bỏ dấu nghệ sĩ — hiện QUÁI): bảng quái dưới đất của vùng dưới (monsters.js planRoster / chụp lúc rời vùng), lưu save.sys.skyRoster → hạ cánh đúng những con đó.
   Dấu NHỎ tinh tế (chấm đỏ nhạt ~60 %, quái mạnh viền vàng, đàn gộp 1 dấu + số); Ngọc Rồng / đồ hiếm = chấm cam / vàng nhỏ; tên chỉ hiện khi bay sát. */
function rosterOf(ctx, below, m) {
  const R = (ctx.S.save.sys.skyRoster ||= {}); let r = R[below];
  if (!r || (Date.now() - r.at) / 1000 > ROSTER_LIFE) { r = R[below] = { at: Date.now(), list: m ? planRoster(ctx, below, m) : [], planned: true }; log('roster plan ' + below + ' ' + r.list.length); }
  return r;
}
function scoutBuild(ctx) {
  const below = BELOW_OF(zid(ctx)); ST.scout = []; if (!below) return;
  if (!ST.landMap[below]) landImage(ctx, below); const m = ST.landMap[below], vi = ctx.lang() === 'vi';
  const r = rosterOf(ctx, below, m), groups = [];
  for (const q of r.list) { const info = rosterInfo(below, q); if (!info) continue; const g = groups.find(o => o.strong === info.strong && o.k === q.k && Math.hypot(o.x - q.x, o.y - q.y) < 36);
    if (g) { g.n++; g.x += (q.x - g.x) / g.n; g.y += (q.y - g.y) / g.n; } else groups.push({ kind: 'mon', k: q.k, x: q.x, y: q.y, n: 1, strong: info.strong, name: (vi ? info.vi : info.en) + ' · Lv ' + info.lv }); }
  for (const g of groups) { g.label = g.name + (g.n > 1 ? ' ×' + g.n : ''); ST.scout.push(g); }
  for (const d of ((ctx.S.save.sys.drops || {})[below] || [])) { if (/^dball/.test(d.id)) ST.scout.push({ kind: 'ball', x: d.x, y: d.y, label: ctx.itemName ? ctx.itemName(d.id) : d.id, item: d.id }); else if (d.b) ST.scout.push({ kind: 'rare', x: d.x, y: d.y, label: ctx.itemName ? ctx.itemName(d.id) : d.id, item: d.id }); }
  log('scout ' + below + ' ' + ST.scout.length);
}
function label(g, txt, x, y) { g.font = '8px VT323, monospace'; const w = Math.ceil(g.measureText(txt).width) + 6; g.fillStyle = 'rgba(20,14,30,.78)'; g.fillRect(Math.round(x - w / 2), Math.round(y - 9), w, 10); g.fillStyle = '#fff6c8'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, Math.round(x), Math.round(y - 4)); g.textAlign = 'left'; g.textBaseline = 'alphabetic'; }
function dot(g, x, y, r, fill, ring) { g.fillStyle = fill; g.beginPath(); g.arc(x + 0.5, y + 0.5, r, 0, TAU); g.fill(); if (ring) { g.strokeStyle = ring; g.lineWidth = 1; g.stroke(); } }
function pinMark(g, x, y) { g.fillStyle = 'rgba(220,60,50,.9)'; g.beginPath(); g.arc(x + 0.5, y - 5.5, 3, Math.PI, 0); g.lineTo(x + 0.5, y + 0.5); g.closePath(); g.fill(); g.fillStyle = '#fff'; g.fillRect(x, y - 6, 1, 1); }
function drawScout(g, ctx, cx, cy) {
  const p = ctx.S.player, below = BELOW_OF(zid(ctx)), pin = sv(ctx).pin; let near = null, nd = 30;
  for (const s2 of ST.scout) { const sx = Math.round(s2.x - cx), sy = Math.round(s2.y - cy); if (sx < -10 || sx > ctx.VW + 10 || sy < -10 || sy > ctx.VH + 10) continue;
    if (s2.kind === 'mon') { dot(g, sx, sy, 2.5, 'rgba(255,120,110,.6)', s2.strong ? 'rgba(255,214,90,.95)' : 'rgba(120,30,30,.55)');
      if (s2.n > 1) { g.font = '6px VT323, monospace'; g.fillStyle = 'rgba(255,240,230,.85)'; g.fillText(String(s2.n), sx + 3, sy - 2); } }
    else if (s2.kind === 'ball') dot(g, sx, sy, 2.5, 'rgba(255,150,40,.85)', 'rgba(255,220,110,.95)');
    else dot(g, sx, sy, 2, 'rgba(255,225,120,.8)', 'rgba(120,80,20,.6)');
    const d = Math.hypot(s2.x - p.x, s2.y - p.y); if (d < nd) { nd = d; near = s2; } }
  if (pin && pin.zone === below) pinMark(g, Math.round(pin.x - cx), Math.round(pin.y - cy));
  if (near) label(g, near.label, Math.round(near.x - cx), Math.round(near.y - cy) - 5);
}
function pressPin(ctx) {
  if (!inSky(ctx) || ST.cut) return; const t = L(ctx), p = ctx.S.player; if (!binoc(ctx)) { ctx.toast(t.needBinoc); ctx.sfx('fail'); return; }
  let best = null, bd = 48; for (const s of ST.scout) { const d = Math.hypot(s.x - p.x, s.y - p.y); if (d < bd) { bd = d; best = s; } }
  if (!best) { ctx.toast(t.noMark); ctx.sfx('fail'); return; }
  const below = BELOW_OF(zid(ctx)); sv(ctx).pin = { zone: below, x: best.x, y: best.y, kind: best.kind, label: best.label }; ctx.persist && ctx.persist();
  ctx.toast(t.pinned(best.label, zname(ctx, below))); ctx.sfx('pickup'); log('pin ' + best.kind + ' ' + below);
}
function pressDrop(ctx) {
  if (!inSky(ctx) || ST.cut || ST.dropCd > 0) return; const t = L(ctx), inv = ctx.S.save.inv || {}; if ((inv.stone || 0) < 1) { ctx.toast(t.noStone2); ctx.sfx('fail'); return; }
  if (ctx.bag && ctx.bag.remove) ctx.bag.remove('stone', 1); else inv.stone -= 1; ST.dropCd = 2.5; const p = ctx.S.player;
  ST.falls.push({ x: p.x, y: p.y, h: liftNow() + 14, t: 0 }); ctx.sfx('whoosh'); log('drop');
}
function fallsTick(ctx, dt) {
  if (ST.dropCd > 0) ST.dropCd -= dt;
  for (const f of ST.falls) { f.t += dt; if (f.t >= 0.75 && !f.done) { f.done = true; const below = BELOW_OF(zid(ctx)); if (!below) continue;
    const s = sv(ctx), arr = ((s.strikes ||= {})[below] ||= []); arr.push({ x: Math.round(f.x), y: Math.round(f.y), at: Date.now(), id: Math.random().toString(36).slice(2, 8) }); if (arr.length > 10) arr.shift(); ctx.persist && ctx.persist();
    if (ctx.vfx) ctx.vfx('dirt_puff', f.x, f.y); if (!ST.dropTold) { ST.dropTold = true; ctx.toast(L(ctx).dropped(zname(ctx, below))); } } }
  ST.falls = ST.falls.filter(f => f.t < 0.9);
}
function drawFalls(g, ctx, cx, cy) {   /* đá rơi thẳng xuống bóng, mờ dần vào sương */
  const im = stoneIcon(); for (const f of ST.falls) { const u = Math.min(1, f.t / 0.75), y = f.y - f.h * (1 - u * u); g.globalAlpha = 1 - u * 0.75;
    if (im) g.drawImage(im, Math.round(f.x - 4 - cx), Math.round(y - 4 - cy), 8, 8); else { g.fillStyle = '#8a8a96'; g.fillRect(Math.round(f.x - 2 - cx), Math.round(y - 2 - cy), 4, 4); } g.globalAlpha = 1; }
}
const CRATER_LIFE = 300;
function cratersOf(ctx, z) { const arr = ((sv(ctx).strikes || {})[z] || []), now = Date.now(); return arr.filter(c => (now - c.at) / 1000 < CRATER_LIFE); }
function cratersTick(ctx) {   /* dưới đất: quái đứng / đi qua hố đá trúng đòn 1 lần mỗi hố */
  if (!ctx.monsters || !ST.craters.length) return; const lv = (ctx.S.save.hero && ctx.S.save.hero.lv) || 1, dmg = 60 + lv * 6;
  for (const c of ST.craters) for (const mo of ctx.monsters.list()) { if (mo.hp <= 0 || (mo.__crHit ||= new Set()).has(c.id)) continue; if (Math.hypot(mo.x - c.x, mo.y - c.y) > 26) continue;
    mo.__crHit.add(c.id); ctx.monsters.damage(mo, dmg, { x: c.x, y: c.y - 30 }, 1, 60, true); if (ctx.vfx) ctx.vfx('rock_debris', mo.x, mo.y); ctx.sfx('hit'); ST.crHits = (ST.crHits || 0) + 1; log('crater hit ' + (mo.c && mo.c.key)); }
}
function drawCraters(g, ctx, cx, cy) { const im = mkImg('crater'), now = Date.now();
  for (const c of ST.craters) { const age = (now - c.at) / 1000, a = age > CRATER_LIFE - 30 ? Math.max(0, (CRATER_LIFE - age) / 30) : 1; g.globalAlpha = a;
    if (im) g.drawImage(im, Math.round(c.x - 12 - cx), Math.round(c.y - 8 - cy), 24, 16); else { g.fillStyle = 'rgba(60,50,40,.5)'; g.beginPath(); g.ellipse(Math.round(c.x - cx), Math.round(c.y - cy), 10, 5, 0, 0, TAU); g.fill(); } g.globalAlpha = 1; } }
function pinGroundTick(ctx) {
  const pin = sv(ctx).pin, p = ctx.S.player; if (!pin || pin.zone !== zid(ctx) || ST.cut) return;
  if (Math.hypot(pin.x - p.x, pin.y - p.y) < 22) { ctx.toast(L(ctx).reached(pin.label)); ctx.sfx('pickup'); delete sv(ctx).pin; ctx.persist && ctx.persist(); log('pin reached'); }
}
function drawPinGround(g, ctx, cx, cy) {   /* dưới đất: 📍 tĩnh ở chỗ ghim; ngoài màn → mũi tên quanh người chơi + số ô */
  const pin = sv(ctx).pin, p = ctx.S.player; if (!pin || pin.zone !== zid(ctx)) return; const sx = pin.x - cx, sy = pin.y - cy, VW = ctx.VW, VH = ctx.VH, im = mkImg('mk_pin');
  if (sx > 6 && sx < VW - 6 && sy > 14 && sy < VH - 4) { if (im) g.drawImage(im, Math.round(sx - 8), Math.round(sy - 24), 16, 16); return; }
  const px = p.x - cx, py = p.y - cy - 10, a = Math.atan2(sy - py, sx - px), r = 34, ax = Math.round(px + Math.cos(a) * r), ay = Math.round(py + Math.sin(a) * r * 0.75);
  g.save(); g.translate(ax, ay); g.rotate(a); g.fillStyle = 'rgba(30,15,10,.85)'; g.beginPath(); g.moveTo(8, 0); g.lineTo(-5, -6); g.lineTo(-2, 0); g.lineTo(-5, 6); g.closePath(); g.fill();
  g.fillStyle = '#ff5a4a'; g.beginPath(); g.moveTo(6, 0); g.lineTo(-4, -4); g.lineTo(-1, 0); g.lineTo(-4, 4); g.closePath(); g.fill(); g.restore();
  label(g, L(ctx).tiles(Math.round(Math.hypot(pin.x - p.x, pin.y - p.y) / TS)), ax, ay - 8);
}

/* ---------------- plan-32 B: PIN CHONG CHÓNG + TRẠM MÂY + BƯU TÁ MÂY ----------------
   Pin: bay được BAT_MAX giây; dưới đất tự nghỉ đầy sau ~2 phút. Còn 20 % mà có lông chim (feather / tfeather) → tự dùng 1 cái +½. Hết → tự hạ xuống (đúng chỗ dưới bóng).
   Trạm Mây (1 cái mỗi trời, ảnh PixelLab, đứng yên): bay qua → nạp đầy.
   Bưu Tá Mây: hòm thư ở Làng + M1–M9 (cạnh lối vào). Nhận đơn → bưu kiện gửi gấp tới vùng khác đã mở, hạn giờ theo số chặng (đi bộ qua đèo không kịp) → mang tới hòm thư bên đó. */
const BAT_MAX = 180, BAT_REST = 120, POST_LANDS = ['village', 'm1', 'm2', 'm3', 'm4', 'm5', 'm6', 'm7', 'm8', 'm9'];
const batOf = ctx => { const s = sv(ctx); if (s.bat == null) s.bat = BAT_MAX; return s.bat; };
function stationOf(m) { return { x: Math.round(m.w * 0.64) * TS + 8, y: Math.round(m.h * 0.38) * TS + 8 }; }
function useFeather(ctx) { const inv = ctx.S.save.inv || {}, id = (inv.feather || 0) > 0 ? 'feather' : (inv.tfeather || 0) > 0 ? 'tfeather' : (inv.rarefeather || 0) > 0 ? 'rarefeather' : null; if (!id) return false;
  ctx.bag.remove(id, 1); const s = sv(ctx); s.bat = Math.min(BAT_MAX, batOf(ctx) + BAT_MAX / 2); ctx.toast(L(ctx).feather); ctx.sfx('pickup'); log('feather'); return true; }
function batTick(ctx, dt) {
  const s = sv(ctx); batOf(ctx);
  const mid = isMid() && !inSky(ctx); if (!inSky(ctx) && !mid) { if (!ST.cut) s.bat = Math.min(BAT_MAX, s.bat + dt * BAT_MAX / BAT_REST); return; }
  if (ST.cut || ctx.S.mode !== 'play' || ST.batFree) return;
  const st = stationOf(ctx.S.map), p = ctx.S.player;
  if (!mid && Math.hypot(p.x - st.x, p.y - st.y) < 24) { if (s.bat < BAT_MAX - 1) { s.bat = BAT_MAX; ctx.toast(L(ctx).station); ctx.sfx('pickup'); log('station'); if (ctx.vfx) ctx.vfx('item_pickup_pop', st.x, st.y - 16, 0, true); } return; }
  const b0 = s.bat; s.bat = Math.max(0, s.bat - dt * (mid ? 0.4 : 1));
  if (s.bat < BAT_MAX * 0.2 && b0 >= BAT_MAX * 0.2) useFeather(ctx);
  for (const w of [30, 10]) if (b0 > w && s.bat <= w) { ctx.toast(L(ctx).batLow(w), true); ctx.sfx('fail'); }
  if (s.bat <= 0) { ctx.toast(L(ctx).batOut, true); log('bat out'); if (mid) startMidDown(ctx); else startDown(ctx); }
}
function drawStation(ctx, cx, cy, out) {
  const im = mkImg('station'), st = stationOf(ctx.S.map), g = ctx.g; if (!im) return; const w = im.width / 2, h = im.height / 2;
  if (Math.abs(st.x - cx - ctx.VW / 2) > ctx.VW || Math.abs(st.y - cy - ctx.VH / 2) > ctx.VH) return;
  out.push({ y: st.y + 4, f: () => { g.drawImage(im, Math.round(st.x - w / 2 - cx), Math.round(st.y - h + 6 - cy), w, h); fogOver(g, st.x - cx, st.y + 6 - cy, w * 1.4, h * 0.5, themeOf(zid(ctx)), 0.45);
    if (Math.hypot(ctx.S.player.x - st.x, ctx.S.player.y - st.y) < 60) label(g, '☁ ' + L(ctx).stationTag, st.x - cx, st.y - h + 2 - cy); } });
}
/* --- Bưu Tá Mây --- */
const postSv = ctx => (sv(ctx).post ||= { job: null, rep: 0, done: 0 });
function postSpot(ctx) {
  const m = ctx.S.map, z = zid(ctx); if (!POST_LANDS.includes(z) || !m.entries || !m.entries.default) return null; const e = m.entries.default, reach = reachOf(ctx, z, m);
  for (let r = 0; r < 8; r++) for (const [dx, dy] of [[3 + r, -1], [-3 - r, -1], [3 + r, -3], [-3 - r, -3], [2, -4 - r], [-2, -4 - r]]) { const x = (e.x + dx) * TS + 8, y = (e.y + dy) * TS + 12;
    if (walkAt(ctx, m, reach, x, y) && walkAt(ctx, m, reach, x, y + 14)) return { x, y }; }
  return null;
}
const fmtT = sec => { sec = Math.max(0, Math.ceil(sec)); return Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0'); };
function postLeft(job) { return job ? job.dur - (Date.now() - job.t0) / 1000 : 0; }
function postTick(ctx) {
  const P = postSv(ctx); if (!P.job) return; if (postLeft(P.job) > 0) return;
  ctx.toast(L(ctx).postFail(zname(ctx, P.job.to)), true); ctx.sfx('fail'); if (((ctx.S.save.inv || {}).parcel || 0) > 0) ctx.bag.remove('parcel', 1); log('post fail ' + P.job.to); P.job = null; ctx.persist && ctx.persist();
}
function postOffer(ctx) {
  const z = zid(ctx), i0 = POST_LANDS.indexOf(z), opts = POST_LANDS.filter(q => q !== z && zoneOpen(ctx, q)); if (!opts.length) return null;
  opts.sort((a, b) => Math.abs(Math.abs(POST_LANDS.indexOf(a) - i0) - 3) - Math.abs(Math.abs(POST_LANDS.indexOf(b) - i0) - 3));
  const to = opts[Math.floor(Math.random() * Math.min(3, opts.length))], hops = Math.abs(POST_LANDS.indexOf(to) - i0);
  return { from: z, to, hops, dur: 75 + 55 * hops, reward: 30 + 25 * hops };
}
function openPost(ctx) {
  const t = L(ctx), P = postSv(ctx), z = zid(ctx), vi = ctx.lang() === 'vi', el = ctx.panel('skypost', ''), im = mkImg('postbox'), img = im ? `<img src="${im.src}" alt="" style="width:48px;height:48px;image-rendering:pixelated;float:left;margin-right:8px">` : '';
  if (P.job && P.job.to === z) {   /* giao hàng */
    if (((ctx.S.save.inv || {}).parcel || 0) > 0) ctx.bag.remove('parcel', 1); const r = P.job.reward; ctx.S.save.inv.stone = (ctx.S.save.inv.stone || 0) + r; P.rep += 1; P.done += 1; log('post done ' + z); P.job = null; ctx.persist && ctx.persist();
    ctx.toast(t.postDone(r, P.rep), true); ctx.sfx('buy'); if (ctx.vfx) ctx.vfx('item_pickup_pop', ctx.S.player.x, ctx.S.player.y - 20, 0, true); return; }
  let body;
  if (P.job) body = `<p>${t.postBusy(zname(ctx, P.job.to), fmtT(postLeft(P.job)))}</p><p style="text-align:center"><button class="btn" data-post="cancel">${t.postCancel}</button> <button class="btn primary" data-post="x">${t.postClose}</button></p>`;
  else { ST.offer = postOffer(ctx); body = ST.offer ? `<p>${t.postOffer(zname(ctx, ST.offer.to), Math.round(ST.offer.dur / 60 * 10) / 10, ST.offer.reward)}</p><p style="text-align:center"><button class="btn primary" data-post="take">${t.postTake}</button> <button class="btn" data-post="x">${t.postClose}</button></p>` : `<p>${t.postNone}</p><p style="text-align:center"><button class="btn" data-post="x">${t.postClose}</button></p>`; }
  el.panel.innerHTML = `<h2>${t.postTitle}</h2>${img}<p class="dim">${t.postRep(P.rep)}</p>${body}`;
  el.hidden = false; ctx.setMode('skypost');
  el.onclick = ev => { const b = ev.target.closest('[data-post]'); if (!b) return; const k = b.dataset.post; el.hidden = true; ctx.setMode('play');
    if (k === 'take' && ST.offer) { P.job = { ...ST.offer, t0: Date.now() }; ctx.bag.add('parcel', 1); ctx.sfx('pickup'); ctx.toast(t.postHud(zname(ctx, P.job.to), fmtT(P.job.dur)), true); log('post take ' + P.job.to); ctx.persist && ctx.persist(); }
    else if (k === 'cancel' && P.job) { if (((ctx.S.save.inv || {}).parcel || 0) > 0) ctx.bag.remove('parcel', 1); P.job = null; ctx.persist && ctx.persist(); } };
}
function drawPost(ctx, cx, cy, out) {
  const s2 = ST.post, im = mkImg('postbox'), g = ctx.g; if (!s2 || !im) return; const w = im.width / 2, h = im.height / 2;
  if (Math.abs(s2.x - cx - ctx.VW / 2) > ctx.VW || Math.abs(s2.y - cy - ctx.VH / 2) > ctx.VH) return;
  out.push({ y: s2.y + 2, f: () => { g.drawImage(im, Math.round(s2.x - w / 2 - cx), Math.round(s2.y - h + 4 - cy), w, h); } });
}

/* ---------------- plan-32 C: SỰ KIỆN BẦU TRỜI (đẹp, chỉ động khi có sự kiện) ----------------
   · MƯA SAO BĂNG (đêm, ~50 % khi lên trời + 25 % mỗi phút): 75 s, sao băng PixelLab rơi chéo từ trên xuống (~5 s mỗi sao) → bay chặn trước khi chạm đất = Mảnh Sao.
   · BÃO SÉT (trời M2 / M8 / M9: 70 % — trời khác 15 %): 2 mây bão PixelLab trôi chậm, thỉnh thoảng loé sáng; có Chai thu sét → bay vào giữ ~2 s = Sét đóng chai; không có chai → bị sét đánh (−5 % máu, bật ra).
   · ĐÀN CHIM DI CƯ / CÁ VOI MÂY (ban ngày, mỗi ~70–110 s): dùng lại ảnh quái trời (Chim Sấm / Cá Voi Mây) làm sinh vật HIỀN bay ngang; bay cùng ~3 s = Lông quý / Sợi mây.
   · Sách Bầu Trời (save.sys.sky.book): trang meteor / storm / flock / whale. */
const EV = { met: null, storms: [], pass: null, passT: 15, metT: 60 };
const evBook = (ctx, k) => { const s = sv(ctx), b = (s.book ||= {}); const first = !b[k]; b[k] = (b[k] || 0) + 1; if (first) { const n = Object.keys(b).length; setTimeout(() => ctx.toast(L(ctx).book(n), true), 1200); } };
const isNight = ctx => (ctx.darkness ? ctx.darkness() : 0) > 0.2;
function evEnter(ctx) {
  EV.met = null; EV.storms = []; EV.pass = null; EV.passT = 15; EV.metT = 60; if (!inSky(ctx) || EV.off) return; const z = zid(ctx), m = ctx.S.map;   /* EV.off: móc test tắt sự kiện tự phát */
  if (isNight(ctx) && Math.random() < 0.5) evStart(ctx, 'meteor');
  if (Math.random() < (/^sky_m[289]$/.test(z) ? 0.7 : 0.15)) evStart(ctx, 'storm');
  void m;
}
function evStart(ctx, k) {
  const t = L(ctx), p = ctx.S.player, m = ctx.S.map, now = ctx.S.time;
  if (k === 'meteor') { EV.met = { until: now + 75, next: now + 1, stars: [] }; ctx.toast(t.evMeteor, true); log('ev meteor'); }
  if (k === 'storm') { EV.storms = [0, 1].map(i => ({ x: Math.max(60, Math.min(m.w * TS - 60, p.x + (i ? -140 : 150))), y: Math.max(60, Math.min(m.h * TS - 60, p.y + (i ? 90 : -70))), vx: (i ? -1 : 1) * 7, flash: 0, nextF: now + 2 + i * 1.5, cd: 0, ch: 0 })); ctx.toast(t.evStorm, true); log('ev storm'); }
  if (k === 'flock' || k === 'whale') { const dir = Math.random() < 0.5 ? 1 : -1, y = p.y + (Math.random() - 0.5) * 80, sp = k === 'whale' ? 18 : 30;
    EV.pass = { k, dir, x: p.x - dir * (ctx.VW / 2 + 60), y, sp, with: 0, done: false, ft: 0 }; ctx.toast(k === 'whale' ? t.evWhale : t.evFlock); log('ev ' + k); }
}
function evTick(ctx, dt) {
  if (!inSky(ctx) || ST.cut || ctx.S.mode !== 'play') return; const p = ctx.S.player, now = ctx.S.time, t = L(ctx), m = ctx.S.map;
  /* mưa sao băng */
  if (!EV.off && !EV.met && isNight(ctx) && (EV.metT -= dt) <= 0) { EV.metT = 60; if (Math.random() < 0.25) evStart(ctx, 'meteor'); }
  const M = EV.met;
  if (M) { if (now < M.until && now >= M.next) { M.next = now + 2.5 + Math.random() * 1.5; const tx = p.x + (Math.random() - 0.5) * 220, ty = p.y + (Math.random() - 0.3) * 140; M.stars.push({ x0: tx + 130, y0: ty - 170, tx, ty, t: 0, dur: 5 }); }
    for (const st of M.stars) { st.t += dt; const u = Math.min(1, st.t / st.dur); st.x = st.x0 + (st.tx - st.x0) * u; st.y = st.y0 + (st.ty - st.y0) * u;
      if (!st.gone && Math.hypot(st.x - p.x, st.y - (p.y - liftNow() - 8)) < 16) { st.gone = 'caught'; ctx.bag.add('starshard', 1); ST.stars = (ST.stars || 0) + 1; ctx.toast(t.gotStar((ctx.S.save.inv || {}).starshard || 1)); ctx.sfx('pickup'); evBook(ctx, 'meteor'); if (ctx.vfx) ctx.vfx('item_pickup_pop', st.x, st.y, 0, true); log('star caught'); }
      if (!st.gone && u >= 1) { st.gone = 'landed'; if (ctx.vfx) ctx.vfx('dirt_puff', st.tx, st.ty); } }
    M.stars = M.stars.filter(st => !st.gone); if (now >= M.until && !M.stars.length) EV.met = null; }
  /* bão sét */
  for (const c of EV.storms) { c.x += c.vx * dt; if (c.x < 40 || c.x > m.w * TS - 40) c.vx *= -1; if (c.flash > 0) c.flash -= dt; if (now >= c.nextF) { c.nextF = now + 3 + Math.random() * 3; c.flash = 0.15; }
    if (c.cd > 0) { c.cd -= dt; continue; } const d = Math.hypot(c.x - p.x, c.y - p.y);
    if (d > 26) { c.ch = 0; continue; }
    if (((ctx.S.save.inv || {}).jar || 0) > 0) { c.ch += dt; ST.charge = c.ch; if (c.ch >= 2) { c.ch = 0; c.cd = 20; ctx.bag.remove('jar', 1); ctx.bag.add('boltjar', 1); c.flash = 0.3; ctx.toast(t.gotBolt, true); ctx.sfx('zap'); evBook(ctx, 'storm'); ST.bolts = (ST.bolts || 0) + 1; log('bolt'); } }
    else { c.cd = 2; c.flash = 0.25; if (ctx.hero) ctx.hero.hit(Math.max(1, Math.round((ctx.hero.max || 100) * 0.05))); const ux = (p.x - c.x) / (d || 1), uy = (p.y - c.y) / (d || 1); p.x += ux * 30; p.y += uy * 30; ctx.toast(t.zap); ctx.sfx('zap'); ST.zaps = (ST.zaps || 0) + 1; log('zap'); } }
  /* đàn chim / cá voi mây */
  if (!EV.off && !EV.pass && !isNight(ctx) && (EV.passT -= dt) <= 0) { EV.passT = 70 + Math.random() * 40; evStart(ctx, Math.random() < 0.34 ? 'whale' : 'flock'); }
  const P = EV.pass;
  if (P) { P.ft += dt; P.x += P.dir * P.sp * dt; const R = P.k === 'whale' ? 70 : 50, near = Math.hypot(P.x - p.x, P.y - p.y) < R;
    if (!P.done) { P.with = near ? P.with + dt : Math.max(0, P.with - dt * 0.5); if (P.with >= 3) { P.done = true; if (P.k === 'whale') { ctx.bag.add('cloudsilk', 2); ctx.toast(t.gotWhale, true); } else { ctx.bag.add('rarefeather', 1); ctx.toast(t.gotFlock, true); } ctx.sfx('pickup'); evBook(ctx, P.k); log('pass ' + P.k); } }
    if (Math.abs(P.x - p.x) > ctx.VW / 2 + 260) EV.pass = null; }
}
function drawSheet(g, sh, x, y, ang, ft, fps) {   /* 1 khung sheet quái trời PixelLab (5 hàng S SE E NE N; tây lật), vẽ 1:1 */
  if (!sh) return; let a = ang * 180 / Math.PI; const flip = Math.cos(ang) < -0.2; if (flip) a = 180 - a; a = ((a + 540) % 360) - 180;
  const rows = sh.rows || ['south', 'south-east', 'east', 'north-east', 'north'], want = a > 67 ? 'south' : a > 22 ? 'south-east' : a > -22 ? 'east' : a > -67 ? 'north-east' : 'north', r = Math.max(0, rows.indexOf(want));
  const fr = Math.floor(ft * fps) % sh.n, cw = sh.cw, ch = sh.ch, dx = Math.round(x - (cw >> 1)), dy = Math.round(y - ch);
  if (flip) { g.save(); g.translate(Math.round(x) * 2, 0); g.scale(-1, 1); g.drawImage(sh.img, fr * cw, r * ch, cw, ch, dx, dy, cw, ch); g.restore(); } else g.drawImage(sh.img, fr * cw, r * ch, cw, ch, dx, dy, cw, ch);
}
function evDrawables(ctx, cx, cy, out) {
  const g = ctx.g, im = mkImg('storm');
  for (const c of EV.storms) { if (Math.abs(c.x - cx - ctx.VW / 2) > ctx.VW || Math.abs(c.y - cy - ctx.VH / 2) > ctx.VH) continue;
    out.push({ y: c.y + 10, f: () => { if (!im) return; const w = im.width / 2, h = im.height / 2; g.fillStyle = 'rgba(20,20,40,.18)'; g.beginPath(); g.ellipse(Math.round(c.x - cx), Math.round(c.y + 22 - cy), w * 0.45, 5, 0, 0, TAU); g.fill();
      if (c.flash > 0) g.filter = 'brightness(2.2)'; else if (c.cd > 2) g.filter = 'brightness(.75)'; g.drawImage(im, Math.round(c.x - w / 2 - cx), Math.round(c.y - h / 2 - 12 - cy), w, h); g.filter = 'none';
      if (c.ch > 0) label(g, L(ctx).charging((2 - c.ch).toFixed(1) + ' s'), c.x - cx, c.y - h / 2 - 14 - cy); } }); }
  const P = EV.pass; if (P) { const sh = ART.monsters && ART.monsters[P.k === 'whale' ? 'sky_whale' : 'sky_thunder'], ang = P.dir > 0 ? 0 : Math.PI;
    const pts = P.k === 'whale' ? [[0, 0]] : [[0, 0], [-16, -10], [-16, 10], [-32, -20], [-32, 20], [-48, -30]];
    for (const [ox, oy] of pts) { const x = P.x + ox * P.dir, y = P.y + oy; if (Math.abs(x - cx - ctx.VW / 2) > ctx.VW || Math.abs(y - cy - ctx.VH / 2) > ctx.VH) continue;
      out.push({ y: y + 30, f: () => { g.fillStyle = 'rgba(20,30,70,.12)'; g.beginPath(); g.ellipse(Math.round(x - cx), Math.round(y - cy), P.k === 'whale' ? 26 : 7, P.k === 'whale' ? 6 : 2, 0, 0, TAU); g.fill();
        drawSheet(g, sh, x - cx, y - cy - (P.k === 'whale' ? 30 : 26), ang, P.ft + ox * 0.03, P.k === 'whale' ? 4 : 8); } }); } }
}
function evDraw(g, ctx, cx, cy) {   /* sao băng: lớp trên cùng (rơi từ trời cao xuống) */
  const M = EV.met, im = mkImg('meteor'); if (!M || !im) return; const w = im.width / 2, h = im.height / 2;
  for (const st of M.stars) { if (st.x == null) continue; const x = Math.round(st.x - cx - w * 0.25), y = Math.round(st.y - cy - h * 0.75); g.drawImage(im, x, y, w, h);
    g.fillStyle = 'rgba(255,240,180,.35)'; g.beginPath(); g.ellipse(Math.round(st.tx - cx), Math.round(st.ty - cy), 5, 2.5, 0, 0, TAU); g.fill(); }   /* chấm vàng mờ: chỗ sao sắp chạm đất */
}

/* ---------------- plan-32 E: CỔNG TRỜI (trời M9, phía Bắc) — mở khi có huy hiệu M9 + hạ đủ 5 trùm; CHƯA làm trận Bakunawa ---------------- */
const BOSSES = ['hacrocky', 'trongdong', 'guong', 'hoden', 'dongho'];
const gatePos = m => ({ x: (m.w >> 1) * TS + 8, y: 9 * TS + 8 });
function gateMiss(ctx) { const s = ctx.S.save, t = L(ctx), miss = []; if (!(s.badges || []).includes(9)) miss.push(t.needBadge9); const left = BOSSES.filter(b => !(s.achievements || []).includes(b)).length; if (left) miss.push(t.needBoss(left)); return miss; }
function gateTick(ctx) {
  if (zid(ctx) !== 'sky_m9' || ST.cut) return; const s = sv(ctx), p = ctx.S.player, gp = gatePos(ctx.S.map);
  if (!s.gateOpen && Math.hypot(p.x - gp.x, p.y - gp.y) < 60 && !gateMiss(ctx).length) { s.gateOpen = true; ctx.persist && ctx.persist(); ctx.toast(L(ctx).gateOpened, true); ctx.sfx('levelup'); if (ctx.quake) ctx.quake(0.3); ST.gateFlash = 0.6; if (ctx.vfx) ctx.vfx('item_pickup_pop', gp.x, gp.y - 20, 0, true); log('gate open'); }
}
function drawGate(ctx, cx, cy, out) {
  if (zid(ctx) !== 'sky_m9') return; const g = ctx.g, gp = gatePos(ctx.S.map), open = !!sv(ctx).gateOpen, im = open ? mkImg('gate_open') : scImg('assets/px/zones/sky/obj/sky_gate_t8.png'); if (!im) return;
  if (Math.abs(gp.x - cx - ctx.VW / 2) > ctx.VW || Math.abs(gp.y - cy - ctx.VH / 2) > ctx.VH) return; const w = im.width / 2, h = im.height / 2;
  out.push({ y: gp.y + 4, f: () => { if (ST.gateFlash > 0) { ST.gateFlash -= 1 / 60; g.filter = 'brightness(1.8)'; } g.drawImage(im, Math.round(gp.x - w / 2 - cx), Math.round(gp.y - h + 8 - cy), w, h); g.filter = 'none'; fogOver(g, gp.x - cx, gp.y + 8 - cy, w * 1.5, h * 0.5, themeOf(zid(ctx)), 0.4); } });
}

/* ---------------- 2026-10-13 khuya (anh): TẦNG TRUNG — bay thấp ngay trên map đất (không đổi vùng) ----------------
   · Điều khiển: X = lên 1 tầng (Đất → Trung → Trời; ở Trời thì X = hạ như cũ) · Shift+X = xuống 1 tầng (Trời → Trung → Đất). Điện thoại: chạm 🚁 = lên, GIỮ 🚁 = xuống. Chip HUD 'Tầng: Đất / Trung / Trời'.
   · Lơ lửng cao 26 px có bóng; bay qua vật THẤP (rào, bụi, đá, nước, biển chỉ đường) nhưng KHÔNG qua vật cao (nhà, cây, cột… ảnh cao ≥ 28 px) — lưới ST.tall.
   · Quái đất KHÔNG cận chiến trúng người đang bay (monsters.js hỏi ctx.playerAir; quái bay vẫn đánh). Kiếm không chém trúng quái đất ('hạ xuống để chém').
   · Đánh từ trên: Z ném đá Seismic chéo xuống tới vòng ngắm (máy tính: theo chuột · điện thoại: tự nhắm quái gần nhất), sát thương ×0,8, 1 đá/viên, hồi 0,5 s;
     Rocky bay cạnh: Rocky-ha chéo xuống + đấm bổ nhào (×0,8). Pin chong chóng hao 0,4× so với trời. Hạ xuống: rơi thẳng đứng ngắn (trôi tới ô đáp được nếu đang trên vật). */
let SHIFT = false;
if (typeof window !== 'undefined') { addEventListener('keydown', e => { if (e.key === 'Shift') SHIFT = true; }); addEventListener('keyup', e => { if (e.key === 'Shift') SHIFT = false; }); addEventListener('blur', () => { SHIFT = false; }); }
const tierNow = ctx => (inSky(ctx) ? 2 : isMid() ? 1 : 0);
function buildTall(ctx) {
  const m = ctx.S.map, tall = new Uint8Array(m.w * m.h);
  for (const o of m.objects) { const d = ctx.O[o.type]; if (!d || o.ghost) continue; const h = o.artImg ? o.artImg.height / (ART.hi || 1) : d.h; if (!(h >= TALL_H)) continue;
    for (let y = o.y; y < o.y + (d.fh || 1); y++) for (let x = o.x; x < o.x + (d.fw || 1); x++) if (x >= 0 && y >= 0 && x < m.w && y < m.h) tall[y * m.w + x] = 1; }
  ST.tall = { m, tall };
}
const midPassable = (m, tx, ty) => tx >= 1 && ty >= 1 && tx < m.w - 1 && ty < m.h - 1 && !(ST.tall && ST.tall.m === m && ST.tall.tall[ty * m.w + tx]);
function startMid(ctx) {
  const p = ctx.S.player; buildTall(ctx);
  ST.fly = { alt: 0, z: 0, sw: 0, boost: 0, hook: 0, mid: true }; p.custom = drawHover; p.ghost = true; p.speedMul = 1.25; p.boxW = 10; p.boxH = 6; p.passable = midPassable;
  if (ST.rk && ST.rk.with) { ST.rk.x = p.x - 18; ST.rk.y = p.y + 2; } log('mid on ' + zid(ctx));
}
function midCanUp(ctx) {   /* đất → trung: cùng luật cất cánh (có chong chóng, ngoài trời, không bận, còn pin) */
  const t = L(ctx), p = ctx.S.player, z = zid(ctx);
  if (!copters(ctx)) return t.noCopter; if (!LAND.test(z)) return t.notHere; if (p.custom || ctx.S.swimming) return t.busy; if (batOf(ctx) < 15 && !useFeather(ctx)) return t.batTired; return '';
}
function startMidUp(ctx) {
  const why = midCanUp(ctx), p = ctx.S.player; if (why) { ctx.toast(why); ctx.sfx('fail'); return false; }
  const rc = rkCanCome(ctx), e = ctx.rocky && ctx.rocky.ent && ctx.rocky.ent(); if (!rc.ok && rc.why) ctx.toast(rc.why);
  ST.rk = rc.ok && e ? { with: true, x: e.x, y: e.y, dir: 0, cheer: 0.5 } : null;
  ST.cut = { kind: 'midup', t: 0, fps: 4, cop: false, popped: false, lift: 0 }; p.custom = drawCut; ctx.setMode('copter'); ctx.registerCloser('copter', () => skipCut(ctx)); ctx.onAction('copter', () => skipCut(ctx));
  ctx.sfx('whoosh'); log('midup ' + zid(ctx)); return true;
}
function nearestWalk(ctx, m, z, x, y) {   /* ô đáp được gần nhất trên map hiện tại (cả hộp chân) */
  const reach = reachOf(ctx, z, m); if (walkAt(ctx, m, reach, x, y)) return { ok: true, x, y };
  const tx0 = Math.floor(x / TS), ty0 = Math.floor(y / TS);
  for (let r = 1; r < 30; r++) { let best = null, bd = 1e9; for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
    const qx = (tx0 + dx) * TS + 8, qy = (ty0 + dy) * TS + 10; if (!walkAt(ctx, m, reach, qx, qy)) continue; const d = Math.hypot(qx - x, qy - y); if (d < bd) { bd = d; best = { ok: false, x: qx, y: qy }; } } if (best) return best; }
  return { ok: true, x, y };
}
function startMidDown(ctx) {
  const p = ctx.S.player, tg = nearestWalk(ctx, ctx.S.map, zid(ctx), p.x, p.y);
  ST.cut = tg.ok ? { kind: 'middown', t: 0, fps: 18, cop: true, lift: MID_LIFT } : { kind: 'drift', next: 'middown', t: 0, fps: 18, z: 0, tx: tg.x, ty: tg.y };
  if (ST.cut.kind === 'middown') p.custom = drawCut; ctx.setMode('copter'); ctx.registerCloser('copter', () => skipCut(ctx)); ctx.onAction('copter', () => skipCut(ctx)); log('middown ' + (tg.ok ? 'here' : 'drift'));
}
function midCutTick(ctx, dt) {   /* trả true nếu đã xử lý */
  const C = ST.cut, p = ctx.S.player, rk = ST.rk && ST.rk.with ? ST.rk : null;
  if (C.kind === 'midup') { C.t += dt;
    if (C.t >= 0.12 && C.t < 0.42) { C.cop = true; C.drop = Math.round((0.42 - C.t) / 0.3 * 22); } else C.drop = 0;
    if (C.t >= 0.42 && !C.popped) { C.popped = true; C.cop = true; ctx.sfx('pickup'); if (ctx.vfx) ctx.vfx('dirt_puff', p.x, p.y + 2); }
    C.fps = C.t < 0.5 ? 6 : 6 + Math.min(1, (C.t - 0.5) / 0.4) * 14; const u = Math.max(0, (C.t - 0.5) / 0.45); C.lift = MID_LIFT * ease(u); C.rlift = MID_LIFT * ease(Math.max(0, u - 0.3));
    if (rk) { rk.x += (p.x - 18 - rk.x) * Math.min(1, dt * 4); rk.y += (p.y + 2 - rk.y) * Math.min(1, dt * 4); }
    if (C.t >= 1.0) { ST.cut = null; ctx.setMode('play'); startMid(ctx); ctx.toast(L(ctx).midUp); }
    return true; }
  if (C.kind === 'middown') { C.t += dt; const u = Math.min(1, C.t / 0.5); C.lift = MID_LIFT * (1 - ease(u)); C.rlift = MID_LIFT * (1 - ease(Math.max(0, Math.min(1, (C.t - 0.2) / 0.5)))); C.fps = Math.max(0, 16 - C.t * 18);
    C.knee = C.t >= 0.5 && C.t < 0.64 ? 2 : 0; if (u >= 1 && !C.landed) { C.landed = true; ctx.sfx('build'); if (ctx.vfx) ctx.vfx('dirt_puff', p.x, p.y + 2); }
    if (C.t > 0.7) C.copA = Math.max(0, 1 - (C.t - 0.7) / 0.15); if (C.t >= 0.85) { ST.cut = null; stopFly(ctx); p.custom = null; p.labelUp = 0; ctx.setMode('play');
      if (rk) { const e = ctx.rocky && ctx.rocky.ent && ctx.rocky.ent(); if (e) { e.x = rk.x; e.y = rk.y; e.hop = 0.45; } } ST.rk = null; log('mid landed'); }
    return true; }
  return false;
}
/* --- bắn từ tầng Trung --- */
const coarse = () => { try { return matchMedia('(pointer:coarse)').matches; } catch (e) { return false; } };
function midAim(ctx) {   /* điểm ngắm dưới đất: chuột (máy tính, ≤ 200 px) · quái gần nhất (điện thoại / chuột ngoài tầm) · trước mặt */
  const p = ctx.S.player, mt = !coarse() && ctx.mouseTile && ctx.mouseTile();
  if (mt && Math.hypot(mt.wx - p.x, mt.wy - p.y) < 200) return { x: mt.wx, y: mt.wy, src: 'mouse' };
  let tg = null, bd = 170; for (const mo of ctx.monsters ? ctx.monsters.list() : []) { if (mo.hp <= 0 || mo.c.sky) continue; const d = Math.hypot(mo.x - p.x, mo.y - p.y); if (d < bd) { bd = d; tg = mo; } }
  if (tg) return { x: tg.x, y: tg.y, src: 'auto', mo: tg };
  const DV = [[0, 1], [-1, 0], [1, 0], [0, -1]][p.dir & 3]; return { x: p.x + DV[0] * 60, y: p.y + DV[1] * 60, src: 'face' };
}
function midThrow(ctx) {
  const t = L(ctx), p = ctx.S.player; if (!isMid() || ST.cut || ST.throwCd > 0) return false; if (!ctx.bag.has('stone', 1)) { ctx.toast(t.noStone); ctx.sfx('fail'); return false; }
  const a = midAim(ctx), sx = p.x, sy = p.y - MID_LIFT - 10, d = Math.hypot(a.x - sx, a.y - sy) || 1, T = Math.max(0.18, d / 230);
  ctx.bag.remove('stone', 1); ST.throwCd = 0.5; (ST.mshots ||= []).push({ sx, sy, tx: a.x, ty: a.y, t: 0, T }); ctx.sfx('whoosh'); log('mid throw ' + a.src); return true;
}
function midTick(ctx, dt) {
  if (ST.throwCd > 0) ST.throwCd -= dt;
  for (const s2 of ST.mshots || []) { s2.t += dt; if (s2.t < s2.T || s2.done) continue; s2.done = true; let hit = 0;
    for (const mo of ctx.monsters ? ctx.monsters.list() : []) { if (mo.hp <= 0 || mo.c.sky || Math.hypot(mo.x - s2.tx, mo.y - s2.ty) > Math.max(14, (mo.c.w || 12) * 0.6)) continue;
      const dmg = Math.max(1, Math.round((ctx.hero ? ctx.hero.atk : 10) * 0.9 * 0.8)); ctx.monsters.damage(mo, dmg, { x: s2.sx, y: s2.sy }, 1, 40, true); hit++; ST.midHits = (ST.midHits || 0) + 1; }
    if (ctx.vfx) ctx.vfx('rock_debris', s2.tx, s2.ty); if (hit) ctx.sfx('hit'); }
  ST.mshots = (ST.mshots || []).filter(s2 => !s2.done);
  rockyTick(ctx, dt);
}
function drawMidAim(g, ctx, cx, cy) {   /* vòng ngắm TĨNH dưới đất + đá đang bay chéo xuống */
  const a = midAim(ctx), x = Math.round(a.x - cx), y = Math.round(a.y - cy) + 1;
  g.strokeStyle = a.src === 'face' ? 'rgba(255,255,255,.45)' : 'rgba(255,90,70,.85)'; g.lineWidth = 1; g.beginPath(); g.ellipse(x + 0.5, y + 0.5, 6, 3, 0, 0, TAU); g.stroke(); g.fillStyle = g.strokeStyle; g.fillRect(x - 8, y, 2, 1); g.fillRect(x + 7, y, 2, 1);
  const im = stoneIcon(); for (const s2 of ST.mshots || []) { const u = Math.min(1, s2.t / s2.T), sx = s2.sx + (s2.tx - s2.sx) * u, sy = s2.sy + (s2.ty - s2.sy) * u;
    if (im) g.drawImage(im, Math.round(sx - 4 - cx), Math.round(sy - 4 - cy), 8, 8); else { g.fillStyle = '#8a8a96'; g.fillRect(Math.round(sx - 2 - cx), Math.round(sy - 2 - cy), 4, 4); } }
}
/* điều khiển chung 3 tầng */
function pressUp(ctx) {
  if (ctx.S.mode === 'copter') { skipCut(ctx); return; } if (ctx.S.mode !== 'play') return;
  if (inSky(ctx)) { pressFly(ctx); return; }   /* ở Trời: X = hạ như cũ */
  if (isMid()) { useCopter(ctx); return; }
  startMidUp(ctx);
}
function pressDown(ctx) {
  if (ctx.S.mode === 'copter') { skipCut(ctx); return; } if (ctx.S.mode !== 'play') return;
  if (inSky(ctx)) { startDown(ctx, true); return; }
  if (isMid()) { startMidDown(ctx); return; }
  ctx.toast(L(ctx).onGround);
}

/* ---------------- mép trời: sang trời của vùng kề (đúng lối dưới đất) ---------------- */
function edgeTick(ctx) {
  const p = ctx.S.player, m = ctx.S.map, below = BELOW_OF(zid(ctx)); if (!below || ST.cut || ctx.S.mode !== 'play') return;
  const H = m.h * TS, side = p.y < 14 ? 'n' : p.y > H - 14 ? 's' : null; if (!side) return;
  const to = SKY_LINK(below)[side], t = L(ctx), bump = msg => { p.y = side === 'n' ? 22 : H - 22; if (ctx.S.time - (ST.edgeT || -9) > 1.5) { ST.edgeT = ctx.S.time; ctx.toast(msg); ctx.sfx('fail'); } log('bump ' + side); };
  if (!to || !ZONES[SKY_OF(to)]) { bump(t.edge); return; }
  const b = ctx.S.save.badges || [], mm = /^m([1-9])$/.exec(below), rr = /^road([1-9])$/.exec(below);
  if (side === 'n' && mm && !b.includes(+mm[1])) { bump(t.lockB(+mm[1])); return; }   /* như lối Bắc dưới đất: cần huy hiệu vùng này */
  if (side === 'n' && rr) { const n = +rr[1], rs = ctx.S.save.sys.road, won = rs && rs.won && rs.won['road' + n]; if (!won && !b.includes(n)) { bump(t.lockR(n)); return; } }   /* không bay vượt cổng đèo chưa qua */
  const back = SKY_LINK(to), arr = back.s === below ? 's' : 'n', rd = /^road/.test(to), tw = rd ? 32 : 80, th2 = rd ? 46 : 64;
  const ax = Math.max(24, Math.min(tw * TS - 24, p.x - ((m.w >> 1) * TS + 8) + ((tw >> 1) * TS + 8))), ay = arr === 's' ? th2 * TS - 30 : 30;
  ST.cut = { kind: 'down', cross: SKY_OF(to), edge: true, t: 0, fps: 18, z: 0, to: null, rk: !!(ST.rk && ST.rk.with), ax, ay, vy: side === 'n' ? -40 : 40 };
  ctx.setMode('copter'); ctx.sfx('whoosh'); log('edge ' + below + '>' + to + ' ' + Math.floor(ax / TS) + ',' + Math.floor(ay / TS));
}

/* ---------------- hệ ---------------- */
export const sky = {
  id: 'sky', always: true,
  onZoneEnter(ctx) {
    ST.ctx = ctx; ST.leaving = false; ST.marks = []; ST.shots = []; ST.lunge = null; ST.threat = new Map(); ST.spawnT = 20; ST.monCfg = {}; ST.mini = null; ST.holes = null;
    const z = zid(ctx), pend = ST.pending, p = ctx.S.player; ST.pending = null;
    if (!pend) { if (ST.fly) stopFly(ctx); ST.cut = null; ctx.S.camDY = 0; if (!inSky(ctx)) ST.rk = null; }
    ctx.skyMount = () => { const rk = ST.rk; if (!rk || !(inSky(ctx) || ST.cut || isMid())) return null; if (!rk.with) return inSky(ctx) ? { x: -9999, y: -9999, face: 'ds', dir: 1 } : null;
      return { x: rk.x, y: rk.y - liftNow() - (ST.cut && ST.cut.lift ? ST.cut.lift : 0) + 1, face: rk.dir === 0 ? 'ds' : rk.dir === 3 ? 'dn' : 'side', dir: rk.dir === 1 ? -1 : 1 }; };
    ST.craters = inSky(ctx) ? [] : cratersOf(ctx, z); ST.falls = []; ST.scout = []; ST.post = inSky(ctx) ? null : postSpot(ctx);
    ctx.skyRoster = zz => { if (ST.landing !== zz) return null; ST.landing = null; const r = (ctx.S.save.sys.skyRoster || {})[zz]; if (!r || (Date.now() - r.at) / 1000 > ROSTER_LIFE) return null; log('roster use ' + zz + ' ' + r.list.length); return r.list; };
    ctx.skyFly = { read: () => ({ ok: false, why: L(ctx).conv }), learned: () => copters(ctx) > 0, use: () => useCopter(ctx) };
    ctx.playerAir = () => isMid() && !inSky(ctx);   /* monsters.js: quái đất không cận chiến trúng người đang bay tầng Trung */
    ctx.skyMelee = mo => { if (isMid() && mo && mo.c && !mo.c.sky && !mo.c.fly) { if (ctx.S.time - (ST.slashT || -9) > 2) { ST.slashT = ctx.S.time; ctx.toast(L(ctx).midSlash); } ST.slashBlocked = (ST.slashBlocked || 0) + 1; return false; } if (!mo || !mo.c || !mo.c.sky) return true; if ((mo.alt ?? 0) === altNow()) return true; if (ctx.S.time - (ST.diffT || -9) > 2) { ST.diffT = ctx.S.time; ctx.toast(L(ctx).diff(L(ctx).alt[mo.alt ?? 0])); } return false; };
    { const prev = ctx.onMonsterDown; ctx.onMonsterDown = (mo, xp) => { if (prev) prev(mo, xp); const ex = mo && mo.c && mo.c.sky && EXTRA[mo.c.key.split('@')[0]];
      if (ex) for (const [id, n] of ex) ctx.give(id, n, mo.x + (Math.random() - 0.5) * 12, mo.y); if (mo && mo.c && mo.c.sky) { ST.kills = (ST.kills || 0) + 1; log('kill ' + mo.c.key); } }; }
    migrate(ctx);
    if (inSky(ctx)) {
      sv(ctx).visited = true; ST.graceT = ctx.S.time + 5; const below = BELOW_OF(z);
      void below; ST.holes = null;
      let at = { x: p.x, y: p.y };
      if (pend && (pend.kind === 'arrive' || pend.kind === 'cross')) { at = pend.x != null ? { x: pend.x, y: pend.y } : { x: ctx.S.map.w * 8, y: ctx.S.map.h * 8 };
        at.x = Math.max(24, Math.min(ctx.S.map.w * TS - 24, at.x)); at.y = Math.max(24, Math.min(ctx.S.map.h * TS - 24, at.y)); }
      startFly(ctx, 0, at.x, at.y); scoutBuild(ctx); evEnter(ctx); if (z === 'sky_m9') setTimeout(() => ctx.toast(L(ctx).gateHint), 1800);
      if (!ST.rk) { const pt = petOf(ctx); ST.rk = pt ? { with: copters(ctx) >= 2 && !(pt.koT > 0) && pt.cmd !== 'home', x: at.x - 18, y: at.y + 2, dir: 0, cheer: 0 } : null; }
      if (ST.rk && ST.rk.with) { ST.rk.x = at.x - 18; ST.rk.y = at.y + 2; }
      if (pend && (pend.kind === 'arrive' || pend.kind === 'cross')) { ST.cut = pend.edge ? { kind: 'arrive', edge: true, t: 0, fps: 18, z: 0, white: 0.85, clouds: 1 } : { kind: 'arrive', t: 0, fps: 26, z: 70, white: 1, clouds: 1 }; p.custom = drawHover; ctx.setMode('copter'); ctx.registerCloser('copter', () => skipCut(ctx)); ctx.onAction('copter', () => skipCut(ctx)); }
    } else if (pend && pend.kind === 'touch') {
      const ex = pend.exact && walkAt(ctx, ctx.S.map, reachOf(ctx, z, ctx.S.map), pend.x, pend.y), s = ex ? { x: pend.x, y: pend.y } : landSpot(ctx, pend) || { x: p.x, y: p.y }; p.x = s.x; p.y = s.y; p.dir = 0; ST.lastLand = { want: { x: pend.x, y: pend.y }, got: { x: s.x, y: s.y }, exact: !!ex };
      if (pend.fell && ctx.S.save.hero) { const h = ctx.S.save.hero, mx = ctx.hero ? ctx.hero.max : 100, b = h.hp ?? mx; h.hp = Math.max(1, Math.round(b - mx * FALL_HP)); ST.lastFall = { before: Math.round(b), after: h.hp, max: mx }; ctx.toast(L(ctx).fell(zname(ctx, z)), true); }
      if (ST.rk && ST.rk.with) { ST.rk.x = p.x - 18; ST.rk.y = p.y + 2; }
      ST.fly = { alt: 0, z: 0, sw: 0, boost: 0, hook: 0 };
      ST.cut = { kind: 'touch', t: 0, fps: 26, lift: 84, white: 1, clouds: 1, haze: 0.45, cop: true, fell: !!pend.fell, toMid: !!pend.toMid, land: landImage(ctx, z), zoom: 0.5, zA: 1, zx: s.x, zy: s.y }; p.custom = drawCut; ctx.S.camDY = 0;
      ctx.setMode('copter'); ctx.registerCloser('copter', () => skipCut(ctx)); ctx.onAction('copter', () => skipCut(ctx)); log('landing ' + z + ' ' + Math.round(s.x / TS) + ',' + Math.round(s.y / TS));
    }
    if (typeof window !== 'undefined') window.__sky = {
      state: () => ({ zone: zid(ctx), fly: ST.fly ? { alt: ST.fly.alt, z: +ST.fly.z.toFixed(2), boost: +ST.fly.boost.toFixed(2), hook: +(ST.fly.hook || 0).toFixed(2) } : null, tier: altNow(), lift: Math.round(liftNow()), copters: copters(ctx), mode: ctx.S.mode,
        cut: ST.cut ? { kind: ST.cut.kind, t: +ST.cut.t.toFixed(2), lift: Math.round(ST.cut.lift || 0), zoom: ST.cut.zoom, zA: ST.cut.zA, land: !!ST.cut.land } : null, rk: ST.rk ? { with: ST.rk.with, x: Math.round(ST.rk.x), y: Math.round(ST.rk.y) } : null,
        mons: ctx.monsters ? ctx.monsters.list().filter(m => m.c.sky).map(m => ({ id: m.id, key: m.c.key, name: m.c.vi, x: Math.round(m.x), y: Math.round(m.y), hp: Math.round(m.hp), max: m.max, alt: m.alt ?? 0, st: m.st2 || null, dmg: m.c.dmg, xp: m.c.xp })) : [],
        marks: ST.marks.map(m => ({ kind: m.kind, tier: m.tier })), kills: ST.kills || 0, shots: ST.shots.length, dodges: ST.dodges || 0, hits: ST.hits || 0, punches: ST.punches || 0, has: ST.has || 0, stoneHits: ST.stoneHits || 0,
        log: ST.log.slice(-14), link: SKY_LINK(BELOW_OF(zid(ctx))), w: ctx.S.map.w, h: ctx.S.map.h, mini: !!ST.landImg[BELOW_OF(zid(ctx))], holes: 0, holeAt: [], theme: THEME[zid(ctx)] ? zid(ctx) : null }),
      use: () => useCopter(ctx), skip: () => skipCut(ctx), alt: () => switchAlt(ctx), throw: () => throwStone(ctx), fall: why => fall(ctx, why || 'test'),
      spawn: (key, dx = 40, dy = 0) => { const p2 = ctx.S.player, mo = spawnSky(ctx, key, p2.x + dx, p2.y + dy); return mo ? mo.id : null; }, clear: () => { if (!ctx.monsters) return; for (const mo of ctx.monsters.list().filter(m => m.c.sky)) ctx.monsters.remove(mo); },
      mon: id => { const mo = ctx.monsters && ctx.monsters.list().find(m => m.id === id); return mo ? { x: mo.x, y: mo.y, hp: mo.hp, max: mo.max, alt: mo.alt ?? 0, st: mo.st2 || null, lift: mo.lift } : null; },
      set: (id, o) => { const mo = ctx.monsters && ctx.monsters.list().find(m => m.id === id); if (mo) Object.assign(mo, o); return !!mo; }, freeze: v => { ST.freeze = !!v; },
      flyTo: zz => flyTo(ctx, zz), map: () => openMap(ctx), near: () => sky.near(ctx), lastFall: () => ST.lastFall || null, mini: () => { const c = ST.landImg[BELOW_OF(zid(ctx))]; return c ? [c.width, c.height] : null; },
      target: () => landTarget(ctx), up: () => pressUp(ctx), down: () => pressDown(ctx), tier: () => tierNow(ctx), mid: () => ({ on: isMid(), hits: ST.midHits || 0, slashBlocked: ST.slashBlocked || 0, aim: midAim(ctx), tall: (tx, ty) => !!(ST.tall && ST.tall.tall[ty * ctx.S.map.w + tx]) }), midThrow: () => midThrow(ctx), gate: () => ({ open: !!sv(ctx).gateOpen, miss: gateMiss(ctx), pos: gatePos(ctx.S.map) }), interact: k => sky.interact(ctx, { data: { k } }), ev: k => evStart(ctx, k), evState: () => ({ met: EV.met ? { stars: EV.met.stars.map(s => ({ x: Math.round(s.x || s.x0), y: Math.round(s.y || s.y0), tx: s.tx, ty: s.ty, t: +s.t.toFixed(2) })) } : null, storms: EV.storms.map(c => ({ x: Math.round(c.x), y: Math.round(c.y), cd: +c.cd.toFixed(1) })), pass: EV.pass ? { k: EV.pass.k, x: Math.round(EV.pass.x), y: Math.round(EV.pass.y), dir: EV.pass.dir, with: +EV.pass.with.toFixed(1), done: EV.pass.done } : null, stars: ST.stars || 0, bolts: ST.bolts || 0, zaps: ST.zaps || 0, book: sv(ctx).book || {} }), evClear: () => { EV.met = null; EV.storms = []; EV.pass = null; EV.off = true; }, evOn: () => { EV.off = false; }, bat: v => { if (v != null) sv(ctx).bat = v; return batOf(ctx); }, batFree: v => { ST.batFree = !!v; }, station: () => stationOf(ctx.S.map), post: () => ({ spot: ST.post, ...postSv(ctx), left: postLeft(postSv(ctx).job) }), postOpen: () => openPost(ctx), postSet: o => Object.assign(postSv(ctx), o), scout: () => ST.scout.map(s => ({ kind: s.kind, x: Math.round(s.x), y: Math.round(s.y), n: s.n || 1, strong: !!s.strong, label: s.label })), roster: zz => ((ctx.S.save.sys.skyRoster || {})[zz] || null), pin: () => pressPin(ctx), pinState: () => sv(ctx).pin || null, drop: () => pressDrop(ctx), craters: () => ST.craters.length, crHits: () => ST.crHits || 0, strikes: z => cratersOf(ctx, z).length, rescout: () => scoutBuild(ctx), lastLand: () => ST.lastLand || null, startFly: (alt = 0) => { if (!inSky(ctx)) return false; startFly(ctx, alt); return true; },
    };
  },
  onZoneLeave(ctx) { ST.marks = []; ST.shots = []; if (!ST.pending) { if (ST.fly) stopFly(ctx); ST.cut = null; ctx.S.camDY = 0; } },
  update(dt, ctx) {
    const p = ctx.S.player; if (!p || !ctx.S.map) return;
    if (ST.leaving) return;
    ST.btnT = (ST.btnT || 0) - dt; if (ST.btnT <= 0) { ST.btnT = 0.5; placeBtns(ctx); }
    batTick(ctx, dt); ST.postT = (ST.postT || 0) - dt; if (ST.postT <= 0) { ST.postT = 1; postTick(ctx); }
    if (ST.cut) {
      const C = ST.cut;
      if (C.kind === 'down' && C.cross) { C.t += dt; const D = C.edge ? 0.45 : 1.0; C.z = C.edge ? 0 : 140 * ease(C.t / 1.0); C.clouds = Math.min(1, C.t / (D * 0.8)); C.white = Math.max(0, (C.t - D * 0.5) / (D * 0.5)) * (C.edge ? 0.85 : 1); C.up = !C.edge;
        if (C.edge) { const p2 = ctx.S.player; p2.y += C.vy * dt; if (ST.rk && ST.rk.with) ST.rk.y += C.vy * dt; }
        if (C.t >= D && !C.gone) { C.gone = true; goTravel(ctx, C.cross, { kind: 'cross', rk: C.rk, x: C.ax, y: C.ay, edge: !!C.edge }); } return; }
      cutTick(ctx, dt); if (inSky(ctx) && ST.rk) rockyTick(ctx, dt); return;
    }
    if (ctx.S.mode !== 'play') return;
    if (!inSky(ctx)) { pinGroundTick(ctx); cratersTick(ctx); if (isMid()) midTick(ctx, dt); return; }
    if (!ST.fly) startFly(ctx, 0);
    const f = ST.fly, m = ctx.S.map;
    ST.marks = ST.marks.filter(k => (k.t -= dt) > -0.05);
    shotsTick(ctx, dt);
    if (f.sw > 0) f.sw -= dt; f.z += Math.sign(f.alt - f.z) * Math.min(Math.abs(f.alt - f.z), dt / ALT_SW);
    if (f.hook > 0) f.hook -= dt;
    for (const u of m.skyUp || []) if (Math.hypot(p.x - (u.x * TS + 8), p.y - (u.y * TS + 8)) < 20) { if (!(f.boost > 0)) { ctx.toast(L(ctx).windUp); ctx.sfx('whoosh'); log('boost'); } f.boost = BOOST; }
    if (f.boost > 0) f.boost -= dt; p.speedMul = FLY_SPD * (f.boost > 0 ? BOOST_MUL : 1);
    const ty = Math.floor(p.y / TS);
    for (const w of m.skyWind || []) if (ty >= w.y0 && ty <= w.y1) { const k = (f.z > 0.5 ? 1.3 : 1) * dt, nx = p.x + w.vx * k; if (nx > 12 && nx < m.w * TS - 12) { p.x = nx; ST.windPush = (ST.windPush || 0) + Math.abs(w.vx * k); } }
    rockyTick(ctx, dt);
    edgeTick(ctx); fallsTick(ctx, dt); evTick(ctx, dt); gateTick(ctx);
  },
  key(code, ctx) {
    if (ctx.S.mode === 'copter') { if (code === 'KeyE' || code === 'Space' || code === 'Enter' || code === 'KeyX') { skipCut(ctx); return true; } return false; }
    if (ctx.S.mode !== 'play') return false;
    if (code === 'KeyX' && (copters(ctx) > 0 || inSky(ctx) || isMid())) { if (SHIFT) pressDown(ctx); else pressUp(ctx); return true; }
    if (isMid() && !ST.cut && code === 'KeyZ') { midThrow(ctx); return true; }
    if (isMid() && !ST.cut && (code === 'KeyE' || code === 'Space') && ctx.monsters && ctx.monsters.list().some(mo => !mo.c.sky && !mo.c.fly && mo.hp > 0 && Math.hypot(mo.x - ctx.S.player.x, mo.y - ctx.S.player.y) < 40)) { if (ctx.S.time - (ST.slashT || -9) > 1.5) { ST.slashT = ctx.S.time; ctx.toast(L(ctx).midSlash); } ST.slashBlocked = (ST.slashBlocked || 0) + 1; return true; }   /* chém không với tới quái dưới đất */
    if (inSky(ctx) && !ST.cut) { if (code === 'KeyL') { pressPin(ctx); return true; } if (code === 'KeyZ') { pressDrop(ctx); return true; } }
    return false;
  },
  near(ctx) {
    if (ctx.S.mode !== 'play') return null; const p = ctx.S.player, t = L(ctx), m = ctx.S.map;
    void t;
    if (inSky(ctx) && zid(ctx) === 'sky_m9') { const gp = gatePos(m); if (Math.hypot(p.x - gp.x, p.y - gp.y) < 36) return { label: (sv(ctx).gateOpen ? '🌈 ' : '🔒 ') + t.gateTag, x: gp.x, y: gp.y - 24, limit: 32, priority: true, data: { k: 'gate9' } }; }
    if (!inSky(ctx)) { const ps = ST.post; if (ps && Math.hypot(p.x - ps.x, p.y - ps.y) < 24) return { label: '📮 ' + t.postTag, x: ps.x, y: ps.y - 12, limit: 26, priority: true, data: { k: 'post' } }; return null; }
    return null;
  },
  interact(ctx, cand) {
    const k = cand && cand.data && cand.data.k;
    if (k === 'gate9') { const miss = gateMiss(ctx); if (miss.length) { ctx.toast(L(ctx).gateNeed(miss), true); ctx.sfx('fail'); } else { if (!sv(ctx).gateOpen) gateTick(ctx); ctx.toast(L(ctx).gatePrep, true); log('gate prep'); } return; }
    if (k === 'post') openPost(ctx); else if (k === 'use') useCopter(ctx); else if (k === 'map') openMap(ctx);
    else if (k === 'gate') { ctx.toast(L(ctx).gate, true); ctx.sfx('fail'); } else if (k === 'shrine') ctx.toast(L(ctx).shrine, true);
  },
  drawGround(g, ctx, cx, cy) {
    if (inSky(ctx)) { drawSkyGround(g, ctx, cx, cy); drawScout(g, ctx, cx, cy); if (!ST.cut && ctx.S.mode === 'play' && ST.fly) drawTarget(g, ctx, cx, cy); drawFalls(g, ctx, cx, cy); }
    else { if (ST.craters.length) drawCraters(g, ctx, cx, cy); if (isMid() && !ST.cut && ctx.S.mode === 'play') drawMidAim(g, ctx, cx, cy); }
    for (const k of ST.marks) {
      const col = k.tier ? '90,170,255' : '255,70,60', a = 0.35 + 0.45 * Math.min(1, 1 - Math.max(0, k.t) / (k.dur || 1));
      g.save(); g.strokeStyle = `rgba(${col},${a.toFixed(2)})`; g.fillStyle = `rgba(${col},${(a * 0.25).toFixed(2)})`; g.lineWidth = 2;
      if (k.kind === 'ring') { g.beginPath(); g.ellipse(Math.round(k.x - cx), Math.round(k.y - cy), k.r, k.r * 0.6, 0, 0, TAU); g.fill(); g.stroke(); }
      else { const l = Math.hypot(k.x2 - k.x, k.y2 - k.y) || 1, nx = -(k.y2 - k.y) / l * (k.w || 6), ny = (k.x2 - k.x) / l * (k.w || 6);
        g.beginPath(); g.moveTo(k.x + nx - cx, k.y + ny - cy); g.lineTo(k.x2 + nx - cx, k.y2 + ny - cy); g.lineTo(k.x2 - nx - cx, k.y2 - ny - cy); g.lineTo(k.x - nx - cx, k.y - ny - cy); g.closePath(); g.fill(); g.stroke(); }
      g.restore();
    }
  },
  drawables(ctx, cx, cy) {
    const out = [], g = ctx.g;
    if (inSky(ctx)) { const up = ART.vfx && ART.vfx.sky_updraft;
      if (up && up.img) for (const u of ctx.S.map.skyUp || []) { const wx = u.x * TS + 8, wy = u.y * TS + 12; if (Math.abs(wx - cx - ctx.VW / 2) > ctx.VW || Math.abs(wy - cy - ctx.VH / 2) > ctx.VH) continue;
        out.push({ y: wy - 20, f: () => { const hi = up.img.__hi ? 1 : 2, fi = Math.floor(ctx.S.time * (up.fps || 10)) % up.n; g.globalAlpha = 0.6; g.drawImage(up.img, fi * up.w * hi, 0, up.w * hi, up.h * hi, Math.round(wx - up.w / 2 - cx), Math.round(wy - up.h + 8 - cy), up.w, up.h); g.globalAlpha = 1; } }); } }
    if (inSky(ctx)) { drawStation(ctx, cx, cy, out); evDrawables(ctx, cx, cy, out); drawGate(ctx, cx, cy, out); } else drawPost(ctx, cx, cy, out);
    for (const s of ST.shots) { const im = stoneIcon(); out.push({ y: s.y + 40, f: () => { if (im) g.drawImage(im, Math.round(s.x - 4 - cx), Math.round(s.y - 4 - cy), 8, 8); else { g.fillStyle = '#8a8a96'; g.fillRect(Math.round(s.x - 2 - cx), Math.round(s.y - 2 - cy), 4, 4); } } }); }
    return out;
  },
  draw(g, ctx, cx, cy) {
    if (inSky(ctx)) {
      const th = themeOf(zid(ctx)), wd = ART.vfx && ART.vfx.sky_wind;
      if (wd && wd.img) { const hi = wd.img.__hi ? 1 : 2; g.save(); g.globalAlpha = 0.55; for (const w of ctx.S.map.skyWind || []) for (let x = 2; x < ctx.S.map.w; x += 9) for (let yy = w.y0; yy <= w.y1; yy += 5) {
        const wx = x * TS + ((yy * 37) % 60), wy = yy * TS; if (wx - cx < -60 || wx - cx > ctx.VW + 10 || wy - cy < -40 || wy - cy > ctx.VH + 10) continue;
        const fi = (Math.floor(ctx.S.time * (wd.fps || 10)) + x + yy) % wd.n; if (w.vx < 0) { g.save(); g.translate(Math.round(wx - cx) * 2 + wd.w, 0); g.scale(-1, 1); g.drawImage(wd.img, fi * wd.w * hi, 0, wd.w * hi, wd.h * hi, Math.round(wx - cx), Math.round(wy - cy), wd.w, wd.h); g.restore(); }
        else g.drawImage(wd.img, fi * wd.w * hi, 0, wd.w * hi, wd.h * hi, Math.round(wx - cx), Math.round(wy - cy), wd.w, wd.h); } g.restore(); }
      void th;   /* mây hoạt hình gần đã bỏ — sương mềm ở drawGround (anh: mẫu biển sương) */
    }
    if (!inSky(ctx) && !ST.cut) drawPinGround(g, ctx, cx, cy);
    if (inSky(ctx)) evDraw(g, ctx, cx, cy);
    if (ST.cut) drawCutOverlay(g, ctx, cx, cy);
  },
  hudLines(ctx) { const out = [], t = L(ctx), P = postSv(ctx); if (copters(ctx) > 0 || inSky(ctx)) out.push(t.tierChip(t.tiers[tierNow(ctx)])); if (P.job) out.push(t.postHud(zname(ctx, P.job.to), fmtT(postLeft(P.job)))); if (isMid() && !ST.cut) { const b1 = Math.ceil(batOf(ctx)); out.push(t.bat(Math.floor(b1 / 60), b1 % 60)); } if (!inSky(ctx) || ST.cut) return out; const b0 = Math.ceil(batOf(ctx)); out.push(t.bat(Math.floor(b0 / 60), b0 % 60));
    const nm = ST.scout.filter(s => s.kind === 'mon').reduce((a, s) => a + s.n, 0), rr = ST.scout.filter(s => s.kind === 'ball' || s.kind === 'rare' || s.strong).length; if (nm + rr) out.push(t.scout(nm, rr)); if (EV.met) out.push(t.chipMeteor); if (EV.storms.some(c => Math.hypot(c.x - ctx.S.player.x, c.y - ctx.S.player.y) < 160)) out.push(t.chipStorm); return out; },   /* bay tự do + trinh sát */
};
let STONE = null;
function stoneIcon() { if (STONE) return STONE.naturalWidth ? STONE : null; const it = ART.man && ART.man.ui && ART.man.ui.items; if (!it || !it.stone) return null; STONE = new Image(); STONE.src = 'assets/px/' + it.stone; return null; }
