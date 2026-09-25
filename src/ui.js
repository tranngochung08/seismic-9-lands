// ui.js — strings (EN/VI), dialog box, HUD, hall, world map, shop, quiz, codex, end screen
import { LEVEL_COLORS, nationOf, isLeader, isBooster, membersOfLevel, byId } from './data.js';
import { SKINS, HAIRS, O, FLAG_COLORS, hashStr } from './gfx.js';
import * as AUDIO from './audio.js';

export const STR = {
  en: {
    tagline: 'Journey through the 9 Lands of Magnitude', play: 'New game', cont: 'Continue', lang: 'Tiếng Việt', namePh: 'Your name (optional)',
    controls: 'Move: WASD / arrows · Interact: E or Space · Map: M · Codex: C · Menu: Esc · Fullscreen: F', fs: '⛶ Fullscreen',
    talk: 'Talk', sleep: 'Sleep (end the day)', read: 'Read', hall: 'Hall of Magnitude', shop: 'Market', light: 'Light the fire', mine: 'Mine', pull: 'Pull the lever', study: 'Study', pickup: 'Pick up',
    shards: 'shards', met: 'met', questMeet: (n, t) => `Meet ${n}/${t} artists`, questDone: 'Land complete — north gate is open',
    badge: lv => `Magnitude ${lv}.0 badge earned!`, locked: lv => `This gate needs the Magnitude ${lv}.0 badge — finish the M${lv} land quest (press Q to see it).`,
    shardGet: '+1 Tremor shard', next: '▶', close: 'Close', hallDesc: (n, lv) => lv < 0 ? `${n} artists without a Magnitude role yet` : `All ${n} artists holding Magnitude ${lv}.0`,
    search: 'Search username or nickname…', imgs: 'artworks', posts: 'posts', reacts: 'reactions', active: 'active', noLevel: 'no role',
    resume: 'Resume', toTitle: 'Save & quit to title', menu: 'Paused', newConfirm: 'Start a new game? Your progress will be erased.',
    guideName: 'Noxx · CM', hi: ['Hi there!', 'Oh, hello!', 'Nice day to draw.', 'Hey, new face!', 'Careful, the ground shakes.', 'Seen my brush?'],
    guideFirst: ['Welcome, newcomer — I am Noxx, community manager of Seismic. This is Harbor Village — the quiet edge of the Seismic world.', 'Nine lands lie ahead, one for each Magnitude, 1.0 to 9.0. The deeper you go, the harder the ground shakes.', 'Every person you meet here is a real artist from the Seismic community. Talk to them — each gives you a Tremor shard.', 'Meet 5 artists in M1 to earn its badge and open the next gate. The east gate takes you there. Good luck.'],
    guideAgain: ['The east gate leads to M1 · Calm Shoals. Talk to people — each one gives a shard.', 'The monument in the plaza lists everyone from this land. Nobody is forgotten here.', 'Press M for the world map, C for your codex of everyone you have met.'],
    npcM1: ['The ground is calm here.'],
    map: 'World map', mapHint: 'Click an unlocked land to travel there.', mapLocked: lv => `Locked — earn the Magnitude ${lv}.0 badge first: finish the M${lv} land quest (press Q).`,
    questLeaders: (n, t) => `Find the Leaders: ${n}/${t}`, coreOpen: 'The Core is open. Walk through the north gate.',
    endTitle: 'You reached the Encrypted Core', endBody: (met, total) => `You crossed nine lands and met ${met} of ${total} Seismic artists.\nThank you for playing — and thank you, Seismic community.`, endBtn: 'Keep exploring', credits: 'Roll the credits',
    tasks: { fires: (n, t) => `Campfires lit ${n}/${t}`, ore: (n, t) => `Ore mined ${n}/${t}`, levers: (n, t) => `Levers pulled ${n}/${t}`, quiz: (n, t) => n >= t ? 'Library exam passed' : 'Pass the library exam', obsidian: (n, t) => `Obsidian ${n}/${t}`, elders: (n, t) => `Elders answered ${n}/${t}` },
    fireLit: 'Campfire lit', oreMined: '+1 shard — ore mined', leverPulled: 'Lever pulled', bridgeUp: 'The bridge rises across the fault!', bridgeNeed: 'One more lever…', itemGot: 'Obsidian shard picked up',
    hazardHit: 'Ouch! −1 shard', hazardHitNoShard: 'Ouch!',
    shopTitle: 'Trembling Market', shopDesc: 'Trade tremor shards for a new look. Click a colour to buy or wear it.', shirt: 'Shirt', hair: 'Hair', skin: 'Skin', free: 'free', cost: c => `${c} ◆`, notEnough: 'Not enough shards', bought: 'Bought & worn', worn: 'Worn',
    quizLibrary: 'Library exam', quizElder: 'The Elder\'s riddle', quizQ: (i, n) => `Question ${i} of ${n}`, correct: 'Correct!', wrong: 'Not quite.', source: 'Source', quizNext: 'Next', quizFinish: 'Finish',
    quizPass: (s, n) => `${s}/${n} correct — exam passed!`, quizFail: (s, n, need) => `${s}/${n} correct. You need ${need}. Study and try again.`, elderOk: 'The Elder nods. One riddle solved.', elderWrong: 'The Elder shakes their head. Come back and try again.', elderIntro: 'Answer my riddle and I will count you worthy.',
    codex: 'Codex', codexMet: (n, t) => `${n} of ${t} artists met`, achievements: 'Achievements', metList: 'Artists met', nobody: 'Nobody yet — go say hello.',
    achGot: name => `Achievement: ${name}`,
    findLabel: 'Find an artist', findPh: 'Discord username…', findBtn: 'Find me', notFound: 'No artist with that name in the roster.', targetWaiting: (name, zone) => `${name} is waiting near the entrance of ${zone}.`, targetHere: name => `➤ ${name} is in this land`,
    discordBtn: 'Play as yourself (Discord)', discordNote: 'Verify with Discord to play with your own avatar.', discordOk: name => `Welcome back, ${name}! Playing as yourself.`, discordNotMember: 'That Discord account is not in the #artwork roster.', discordFail: 'Discord sign-in failed.',
    music: 'Music', on: 'on', off: 'off',
    nationBoard: 'Read the board', nationAt: lv => lv < 0 ? 'in Harbor Village' : `at Magnitude ${lv}.0`, nArtists: 'artists here', nArtworks: 'artworks', nPosts: 'posts', nReacts: 'reactions',
    nRank: (r, n) => `#${r} of ${n} nations`, nLeaders: 'Leaders', nBoosters: 'Boosters', nPioneer: 'Pioneer', nPioneerDesc: d => `first post ${d}`, nOverall: 'Whole community', nTotal: 'artists in the roster', nAt9: 'at Magnitude 9.0', nShare: 'of all artists', nTop: 'Top artists here',
    medalTitles: { count: 'Most artists', art: 'Most artworks', react: 'Most reactions' },
    tiers: ['Camp', 'Yard', 'Court', 'Estate', 'Citadel', 'Sanctum'], tierNote: 'Districts grow grander with every Magnitude.', rocky: 'Admire Rocky',
    // the storyline: Lyron, the Kraken, the three things, the trench
    storyGather: s => `Save Lyron: ${s}`, storyDive: 'Save Lyron: dive at the pier of the Sea of Origins', storyInTrench: 'Save Lyron: reach the bubble cage',
    guideStory: ['The Kraken keeps what it takes in the Kraken Trench, under the reef. Nobody goes down there empty-handed.', 'You will need three things: a diving bell forged at the Rockfall Mine furnace (M4), the map of the trench from the Leaning City library (M6), and the Great Crystal that the fifteen Leaders keep at the Core (M9).', 'Walk the nine lands, meet the artists, gather the three. Then come back to the pier and dive. And if a nation lets you pilot its Rocky, keep that trust — only Rocky can stand up to the Kraken.'],
    guideFlashback: ['You were adrift, once. A raft with a torn sail found you — Lyron, the founder himself, pulled you aboard.', 'You crossed the whole sea together. Then, in sight of the lighthouse, the Kraken rose and took him down with the raft. You reached the pier on a plank.', 'I have his scarf. It floated back. Keep it — and listen.'],
    guideGather: left => `Still missing: ${left}. Lyron is waiting.`, guideDive: 'You have all three. Go to the pier of the Sea of Origins and dive. Take a Rocky that trusts you.', guideAfter: 'Lyron is home. The whole village is lit tonight because of you.',
    ach: { first: ['First hello', 'Meet your first artist'], ten: ['Ten friends', 'Meet 10 artists'], hundred: ['Community', 'Meet 100 artists'], leaders: ['Council of Fifteen', 'Meet all 15 Leaders'], boosters: ['Lights on', 'Meet every server Booster'], badges: ['Nine badges', 'Earn every Magnitude badge'], nations: ['World tour', 'Meet artists from 10 countries'], shop: ['New look', 'Buy something at the market'], scholar: ['Scholar', 'Pass the library exam'], photographer: ['Say cheese', 'Take your first photo (P)'], captain: ['Captain', "Finish the hermit's buoy race under 150 s"], sumo: ['Sumo champion', 'Push another nation\'s Rocky out of the ring'], pet: ['Rock parent', 'Hatch the crystal egg from the Core'], keepsake: ['The scarf', "Pick up Lyron's scarf from the water"], rescue: ['The friend returns', 'Bring Lyron back from the Kraken Trench'] },
    endRescue: { title: 'Lyron is home', body: 'You went down into the Kraken Trench and came back up with your friend.\nHarbor Village hangs its lanterns tonight. Thank you — and thank you, Seismic community.' }
  },
  vi: {
    tagline: 'Hành trình qua 9 Vùng Đất Magnitude', play: 'Chơi mới', cont: 'Chơi tiếp', lang: 'English', namePh: 'Tên của bạn (không bắt buộc)',
    controls: 'Di chuyển: WASD / mũi tên · Tương tác: E hoặc Space · Bản đồ: M · Sổ tay: C · Menu: Esc · Toàn màn hình: F', fs: '⛶ Toàn màn hình',
    talk: 'Nói chuyện', sleep: 'Ngủ (hết ngày)', read: 'Đọc', hall: 'Bia Vinh Danh', shop: 'Chợ', light: 'Đốt lửa', mine: 'Đào', pull: 'Gạt cần', study: 'Đọc sách', pickup: 'Nhặt',
    shards: 'mảnh', met: 'đã gặp', questMeet: (n, t) => `Gặp ${n}/${t} nghệ sĩ`, questDone: 'Xong vùng — cổng Bắc đã mở',
    badge: lv => `Nhận huy hiệu Magnitude ${lv}.0!`, locked: lv => `Cổng này cần huy hiệu Magnitude ${lv}.0 — hoàn thành nhiệm vụ vùng M${lv} (bấm Q xem việc).`,
    shardGet: '+1 mảnh dư chấn', next: '▶', close: 'Đóng', hallDesc: (n, lv) => lv < 0 ? `${n} nghệ sĩ chưa có role Magnitude` : `Toàn bộ ${n} nghệ sĩ cấp Magnitude ${lv}.0`,
    search: 'Tìm username hoặc nickname…', imgs: 'ảnh', posts: 'bài', reacts: 'reaction', active: 'hoạt động', noLevel: 'chưa có cấp',
    resume: 'Tiếp tục', toTitle: 'Lưu & về màn hình chính', menu: 'Tạm dừng', newConfirm: 'Chơi mới? Tiến trình cũ sẽ bị xóa.',
    guideName: 'Noxx · CM', hi: ['Chào bạn!', 'Ơ, xin chào!', 'Hôm nay vẽ đẹp ghê.', 'Ê, người mới hả?', 'Cẩn thận, đất hay rung.', 'Thấy cây cọ của mình đâu không?'],
    guideFirst: ['Chào người mới, mình là Noxx — CM của Seismic. Đây là Làng Xuất Phát — rìa yên tĩnh của thế giới Seismic.', 'Phía trước là chín vùng đất, mỗi vùng một cấp Magnitude từ 1.0 đến 9.0. Càng vào sâu, đất càng rung mạnh.', 'Mỗi người bạn gặp là một nghệ sĩ thật của cộng đồng Seismic. Nói chuyện với họ — mỗi người tặng bạn một mảnh dư chấn.', 'Gặp 5 nghệ sĩ ở M1 để nhận huy hiệu và mở cổng kế tiếp. Cổng phía Đông dẫn tới đó. Chúc may mắn.'],
    guideAgain: ['Cổng Đông dẫn tới M1 · Bãi Bồi Yên. Nói chuyện với mọi người — mỗi người một mảnh.', 'Tượng đài ở quảng trường ghi tên tất cả mọi người của vùng này. Không ai bị bỏ quên.', 'Bấm M mở bản đồ, C mở sổ tay những người bạn đã gặp.'],
    npcM1: ['Đất ở đây còn lặng lắm.'],
    map: 'Bản đồ thế giới', mapHint: 'Bấm vào vùng đã mở để dịch chuyển tới đó.', mapLocked: lv => `Chưa mở — cần huy hiệu Magnitude ${lv}.0: hoàn thành nhiệm vụ vùng M${lv} (bấm Q xem việc).`,
    questLeaders: (n, t) => `Tìm các Leader: ${n}/${t}`, coreOpen: 'Lõi đã mở. Đi qua cổng Bắc.',
    endTitle: 'Bạn đã tới Lõi Mã Hóa', endBody: (met, total) => `Bạn đã đi qua chín vùng đất và gặp ${met} trong ${total} nghệ sĩ Seismic.\nCảm ơn bạn đã chơi — và cảm ơn cộng đồng Seismic.`, endBtn: 'Khám phá tiếp', credits: 'Xem credits',
    tasks: { fires: (n, t) => `Đốt lửa ${n}/${t}`, ore: (n, t) => `Đào quặng ${n}/${t}`, levers: (n, t) => `Gạt cần ${n}/${t}`, quiz: (n, t) => n >= t ? 'Đã qua bài thi thư viện' : 'Qua bài thi thư viện', obsidian: (n, t) => `Obsidian ${n}/${t}`, elders: (n, t) => `Trưởng lão ${n}/${t}` },
    fireLit: 'Đã đốt lửa', oreMined: '+1 mảnh — đào được quặng', leverPulled: 'Đã gạt cần', bridgeUp: 'Cầu nâng lên qua đứt gãy!', bridgeNeed: 'Còn một cần nữa…', itemGot: 'Nhặt được mảnh obsidian',
    hazardHit: 'Đau! −1 mảnh', hazardHitNoShard: 'Đau!',
    shopTitle: 'Chợ Rung Khẽ', shopDesc: 'Đổi mảnh dư chấn lấy diện mạo mới. Bấm màu để mua hoặc mặc.', shirt: 'Áo', hair: 'Tóc', skin: 'Da', free: 'miễn phí', cost: c => `${c} ◆`, notEnough: 'Không đủ mảnh', bought: 'Đã mua & mặc', worn: 'Đang mặc',
    quizLibrary: 'Bài thi thư viện', quizElder: 'Câu đố của Trưởng lão', quizQ: (i, n) => `Câu ${i}/${n}`, correct: 'Đúng!', wrong: 'Chưa đúng.', source: 'Nguồn', quizNext: 'Tiếp', quizFinish: 'Xong',
    quizPass: (s, n) => `${s}/${n} đúng — qua bài thi!`, quizFail: (s, n, need) => `${s}/${n} đúng. Cần ${need}. Đọc thêm rồi thử lại.`, elderOk: 'Trưởng lão gật đầu. Giải được một câu đố.', elderWrong: 'Trưởng lão lắc đầu. Quay lại thử lần nữa.', elderIntro: 'Trả lời câu đố của ta, ta sẽ công nhận ngươi.',
    codex: 'Sổ tay', codexMet: (n, t) => `Đã gặp ${n}/${t} nghệ sĩ`, achievements: 'Thành tựu', metList: 'Nghệ sĩ đã gặp', nobody: 'Chưa gặp ai — đi chào hỏi thôi.',
    achGot: name => `Thành tựu: ${name}`,
    findLabel: 'Tìm một nghệ sĩ', findPh: 'Username Discord…', findBtn: 'Tìm tôi', notFound: 'Không có nghệ sĩ nào tên đó trong danh sách.', targetWaiting: (name, zone) => `${name} đang đợi gần lối vào ${zone}.`, targetHere: name => `➤ ${name} đang ở vùng này`,
    discordBtn: 'Chơi bằng chính mình (Discord)', discordNote: 'Xác minh qua Discord để chơi bằng avatar của bạn.', discordOk: name => `Chào mừng trở lại, ${name}! Đang chơi bằng chính bạn.`, discordNotMember: 'Tài khoản Discord này không có trong danh sách #artwork.', discordFail: 'Đăng nhập Discord thất bại.',
    music: 'Nhạc', on: 'bật', off: 'tắt',
    nationBoard: 'Đọc bảng', nationAt: lv => lv < 0 ? 'ở Làng Xuất Phát' : `ở Magnitude ${lv}.0`, nArtists: 'nghệ sĩ ở đây', nArtworks: 'tranh', nPosts: 'bài', nReacts: 'reaction',
    nRank: (r, n) => `hạng ${r}/${n} quốc gia`, nLeaders: 'Leader', nBoosters: 'Booster', nPioneer: 'Người tiên phong', nPioneerDesc: d => `đăng bài đầu ${d}`, nOverall: 'Toàn cộng đồng', nTotal: 'nghệ sĩ trong danh sách', nAt9: 'đạt Magnitude 9.0', nShare: 'tổng số nghệ sĩ', nTop: 'Nghệ sĩ nổi bật ở đây',
    medalTitles: { count: 'Đông nhất', art: 'Nhiều tranh nhất', react: 'Nhiều reaction nhất' },
    tiers: ['Trại', 'Sân', 'Dinh', 'Điền trang', 'Thành trì', 'Thánh điện'], tierNote: 'Khu quốc gia càng lên Magnitude cao càng bề thế.', rocky: 'Ngắm tượng Rocky',
    storyGather: s => `Cứu Lyron: ${s}`, storyDive: 'Cứu Lyron: lặn ở cầu tàu Biển Khởi Nguồn', storyInTrench: 'Cứu Lyron: tới lồng bong bóng',
    guideStory: ['Kraken giữ thứ nó bắt trong Vực Kraken, dưới rạn san hô. Không ai xuống đó tay không.', 'Bạn cần ba thứ: chuông lặn đúc ở lò nung Mỏ Đá Lở (M4), bản đồ vực trong thư viện Thành Nghiêng (M6), và Đại tinh thể mà mười lăm Leader giữ ở Lõi (M9).', 'Đi qua chín vùng đất, gặp các nghệ sĩ, gom đủ ba thứ. Rồi quay lại cầu tàu mà lặn. Và nếu nước nào cho bạn điều khiển Rocky của họ, hãy giữ lòng tin đó — chỉ Rocky mới đương đầu nổi với Kraken.'],
    guideFlashback: ['Ngày trước bạn từng lênh đênh ngoài kia. Một chiếc bè buồm rách tìm thấy bạn — Lyron, chính nhà sáng lập, kéo bạn lên.', 'Hai người vượt cả biển. Rồi ngay khi thấy hải đăng, Kraken trồi lên, kéo cậu ấy cùng chiếc bè xuống vực. Bạn dạt vào cầu tàu trên một mảnh ván.', 'Mình giữ chiếc khăn của cậu ấy. Nó nổi lại. Bạn cầm lấy — và nghe mình nói này.'],
    guideGather: left => `Còn thiếu: ${left}. Lyron đang đợi.`, guideDive: 'Đủ ba thứ rồi. Ra cầu tàu Biển Khởi Nguồn mà lặn. Dẫn theo một Rocky tin bạn.', guideAfter: 'Lyron về rồi. Đêm nay cả làng treo đèn là nhờ bạn.',
    ach: { first: ['Lời chào đầu', 'Gặp nghệ sĩ đầu tiên'], ten: ['Mười người bạn', 'Gặp 10 nghệ sĩ'], hundred: ['Cộng đồng', 'Gặp 100 nghệ sĩ'], leaders: ['Hội đồng 15', 'Gặp đủ 15 Leader'], boosters: ['Giữ đèn sáng', 'Gặp tất cả Booster'], badges: ['Chín huy hiệu', 'Nhận đủ huy hiệu Magnitude'], nations: ['Vòng quanh thế giới', 'Gặp nghệ sĩ từ 10 quốc gia'], shop: ['Diện mạo mới', 'Mua gì đó ở chợ'], scholar: ['Học giả', 'Qua bài thi thư viện'], photographer: ['Cười lên nào', 'Chụp tấm ảnh đầu tiên (P)'], captain: ['Thuyền trưởng', 'Đua phao của ẩn sĩ dưới 150 giây'], sumo: ['Vô địch sumo', 'Đẩy Rocky nước khác ra khỏi sàn'], pet: ['Cha mẹ đá', 'Ấp nở trứng tinh thể ở Lõi'], keepsake: ['Chiếc khăn', 'Nhặt khăn của Lyron trên mặt nước'], rescue: ['Người bạn trở về', 'Đưa Lyron về từ Vực Kraken'] },
    endRescue: { title: 'Lyron đã về nhà', body: 'Bạn đã xuống Vực Kraken và trở lên cùng người bạn của mình.\nĐêm nay Làng Xuất Phát treo đèn. Cảm ơn bạn — và cảm ơn cộng đồng Seismic.' }
  }
};
export let L = STR.en;
export function setLang(l) { L = STR[l] || STR.en; document.documentElement.lang = l; }
export const lang = () => (L === STR.vi ? 'vi' : 'en');

const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const nf = n => (n || 0).toLocaleString('en-US');

export function levelBadge(lv) {
  if (lv < 0) return `<span class="lvb" style="background:#9a9a9a">${L.noLevel}</span>`;
  return `<span class="lvb" style="background:${LEVEL_COLORS[lv]}">M ${lv.toFixed(1)}</span>`;
}
export function avatarHTML(m, cls = 'av') {
  const init = esc((m.n || '?')[0].toUpperCase());
  return m.a ? `<img class="${cls}" loading="lazy" src="${esc(m.a)}" alt="" onerror="this.outerHTML='<div class=&quot;${cls} avf&quot;>${init}</div>'">` : `<div class="${cls} avf">${init}</div>`;
}

// ---- dialogue text generation ----
function pick(arr, rng) { return arr[(rng() * arr.length) | 0]; }
export function linesFor(m, zone, first, rng, lg) {
  const nat = nationOf(m), name = m.k || m.n, vi = lg === 'vi';
  const greet = vi
    ? [`Chào! Mình là ${name}. Chào mừng tới ${zone.name.vi}.`, `Ồ, người mới. ${name} đây — mình đăng tranh ở #artwork.`, `${name}, Magnitude ${m.lv < 0 ? 'chưa có' : m.lv.toFixed(1)}. Rất vui được gặp.`]
    : [`Hey! I'm ${name}. Welcome to ${zone.name.en}.`, `Oh, a new face. ${name} here — I post in #artwork.`, `${name}. Magnitude ${m.lv < 0 ? 'none yet' : m.lv.toFixed(1)}. Nice to meet you.`];
  const stats = [vi ? `Mình đã đăng ${nf(m.i)} bức trong ${nf(m.p)} bài ở #artwork.` : `I've posted ${nf(m.i)} artworks across ${nf(m.p)} posts in #artwork.`];
  if (m.r >= 100) stats.push(vi ? `Tranh mình nhận ${nf(m.r)} reaction. Cộng đồng dễ thương lắm.` : `They've pulled in ${nf(m.r)} reactions. The community's been kind.`);
  else if (m.r < 10) stats.push(vi ? 'Reaction à? Chưa nhiều. Mình vẽ vì thích.' : 'Reactions? Not many yet. I draw for myself.');
  if (m.l >= '2026-09') stats.push(vi ? 'Tháng 9/2026 mình vẫn ở đây. Seismic không bao giờ dừng.' : 'Still here in September 2026. Seismic never stops.');
  if (m.f <= '2025-03-20') stats.push(vi ? 'Mình có mặt từ những ngày đầu — tháng 3/2025.' : "I've been around since the very first days — March 2025.");
  const flavor = [];
  if (isLeader(m)) flavor.push(vi ? 'Mình là một trong 15 Leader. Tới được Lõi Mã Hóa thì tìm mình nhé.' : "I'm one of the fifteen Leaders. If you reach the Encrypted Core, come find me.");
  if (isBooster(m)) flavor.push(vi ? 'Mình boost server. Phải có ai đó giữ đèn sáng chứ.' : 'I boost the server. Someone has to keep the lights on.');
  if (/encrypt/i.test(m.k || '')) flavor.push(vi ? '<Encrypted>… bạn chỉ được biết tới đó thôi.' : "<Encrypted>… that's all you'll get out of me.");
  if (nat) flavor.push(vi ? `Gửi lời chào từ ${nat.name} ${nat.flag}!` : `Greetings from ${nat.name} ${nat.flag}!`);
  flavor.push(pick(zone.flavor ? zone.flavor[vi ? 'vi' : 'en'] : L.npcM1, rng));
  if (first) return [pick(greet, rng), stats[0], stats.length > 1 ? stats[1] : pick(flavor, rng), pick(flavor, rng)];
  return [pick(greet.concat(stats, flavor), rng)];
}

// ---- dialog box ----
let dlg = { pages: [], i: 0, onClose: null, typing: null };
/* ---- plan-12: chân dung pixel ---- avatar Discord → thu 16×16 rồi phóng 64 (pixel hóa, không đọc pixel nên ảnh cross-origin vẫn vẽ được);
   nhân vật không avatar (hướng dẫn viên, bảng) → chân dung PixelLab 2 khung (miệng) qua UI.dialogArt, hoặc chữ cái đầu bằng font pixel. */
let dialogArt = null;                                   // { guide: [img0, img1], bubble, tail } do main.js đặt sau khi art nạp
export function setDialogArt(a) { dialogArt = a; }
let port = { kind: 'none', frames: null, img: null, letter: '?' };
function drawPortrait(talk) {
  const c = $('#d-port'), g = c.getContext('2d'); g.imageSmoothingEnabled = false; g.clearRect(0, 0, 64, 64);
  if (port.kind === 'frames' && port.frames) { const im = port.frames[talk ? 1 : 0] || port.frames[0]; if (im && im.complete) g.drawImage(im, 0, 0, 64, 64); return; }
  if (port.kind === 'avatar' && port.img && port.img.complete && port.img.naturalWidth) {
    const t = port.tmp || (port.tmp = document.createElement('canvas')); t.width = 16; t.height = 16; const tg = t.getContext('2d'); tg.imageSmoothingEnabled = true; tg.clearRect(0, 0, 16, 16);
    try { tg.drawImage(port.img, 0, 0, 16, 16); g.drawImage(t, 0, 0, 64, 64); } catch (e) { port.kind = 'letter'; }
    if (port.kind === 'avatar') { if (talk) { g.fillStyle = 'rgba(255,255,255,.08)'; g.fillRect(0, 0, 64, 64); } return; }
  }
  g.fillStyle = '#2b2440'; g.fillRect(0, 0, 64, 64); g.fillStyle = port.color || '#ffd45e'; g.font = '48px VT323, monospace'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(port.letter, 32, 36);
}
function setPortrait(m, guide, title) {
  port = { kind: 'letter', letter: esc((title || (m && m.n) || 'S')[0].toUpperCase()), color: guide ? '#8fd3ff' : '#ffd45e' };
  if (guide && dialogArt && dialogArt.guide) port = { kind: 'frames', frames: dialogArt.guide };
  else if (m && m.a) { const im = new Image(); im.crossOrigin = 'anonymous'; im.onload = () => drawPortrait(!!dlg.typing); im.onerror = () => { port.kind = 'letter'; drawPortrait(false); }; im.src = m.a; port = { kind: 'avatar', img: im, letter: port.letter }; }
  drawPortrait(false);
}
const PUNCT_PAUSE = { '.': 9, '!': 9, '?': 9, '…': 9, ',': 3, ';': 3, ':': 3, '\n': 6 };
let voice = 500;
export function openDialog({ m, guide, title, pages, onClose }) {
  const d = $('#dialog');
  d.querySelector('.dlg').classList.toggle('px', !!(dialogArt && dialogArt.px));
  voice = guide ? 330 : m && m.friend ? 260 : m ? 380 + (hashStr('v' + (m.id || m.n)) % 240) : 440;
  setPortrait(m, guide, title);
  if (guide || !m) {
    $('#d-av').innerHTML = '';
    $('#d-name').textContent = title || L.guideName; $('#d-nick').textContent = ''; $('#d-chips').innerHTML = ''; $('#d-badge').innerHTML = ''; $('#d-stats').innerHTML = '';
  } else {
    const nat = nationOf(m);
    $('#d-av').innerHTML = avatarHTML(m);
    $('#d-name').textContent = m.n; $('#d-nick').textContent = m.k && m.k !== m.n ? m.k : '';
    if (m.friend) { $('#d-chips').innerHTML = `<span class="chip elder">♥ ${esc(m.title ? m.title[lang()] : '')}</span>`; $('#d-badge').innerHTML = ''; $('#d-stats').innerHTML = ''; }   // the story friend: a title instead of roster stats
    else {
      $('#d-chips').innerHTML = (m.ro || []).filter(r => r !== 'Verified').map(r => `<span class="chip">${nat && nat.key === r ? nat.flag + ' ' : ''}${esc(r)}</span>`).join('') + (m.elder ? '<span class="chip elder">☆ Elder</span>' : '');
      $('#d-badge').innerHTML = levelBadge(m.lv);
      $('#d-stats').innerHTML = `<span><b>${nf(m.i)}</b> ${L.imgs}</span><span><b>${nf(m.p)}</b> ${L.posts}</span><span><b>${nf(m.r)}</b> ${L.reacts}</span><span class="dim">${L.active} ${m.f} → ${m.l}</span>`;
    }
  }
  dlg = { pages, i: 0, onClose, typing: null };
  d.hidden = false; showPage();
}
function showPage() {
  /* plan-12: chữ chạy 1 ký tự / 22 ms, dừng nhịp sau dấu câu, blip mỗi 2 ký tự có chữ, chân dung "nói" khi đang chạy */
  const el = $('#d-text'), text = dlg.pages[dlg.i]; el.textContent = '';
  let k = 0, wait = 0, n = 0, mouth = 0; clearInterval(dlg.typing);
  $('#d-more').hidden = dlg.i >= dlg.pages.length - 1;
  dlg.typing = setInterval(() => {
    if (wait > 0) { wait--; return; }
    const ch = text[k] || ''; k++; el.textContent = text.slice(0, k);
    if (ch.trim()) { n++; if (n % 2 === 0) AUDIO.blip(voice + ((ch.charCodeAt(0) * 7) % 5) * 12); }
    if (PUNCT_PAUSE[ch]) wait = PUNCT_PAUSE[ch];
    if (++mouth % 5 === 0) drawPortrait(mouth % 10 < 5);
    if (k >= text.length) { clearInterval(dlg.typing); dlg.typing = null; drawPortrait(false); }
  }, 22);
  $('#d-hint').textContent = (dlg.i < dlg.pages.length - 1 ? L.next : L.close) + '  ·  E';
}
export function dialogAdvance() {
  if (dlg.typing) { clearInterval(dlg.typing); dlg.typing = null; $('#d-text').textContent = dlg.pages[dlg.i]; drawPortrait(false); return; }
  if (dlg.i < dlg.pages.length - 1) { dlg.i++; showPage(); return; }
  $('#dialog').hidden = true; const cb = dlg.onClose; dlg.onClose = null; cb && cb();
}

export function dialogClose() { clearInterval(dlg.typing); dlg.typing = null; $('#dialog').hidden = true; const cb = dlg.onClose; dlg.onClose = null; cb && cb(); }

/* ---- plan-12: bong bóng nổi trên đầu NPC (câu ngắn) ---- n.bubble = { text, until }; main.js vẽ trong drawLabels qua drawBubble */
export function bubble(n, text, sec = 3) { if (!n || !text) return; n.bubble = { text: String(text).slice(0, 48), until: performance.now() + sec * 1000, born: performance.now() }; }
export function drawBubble(ug, n, sx, sy, fs) {
  const b = n.bubble; if (!b) return; const now = performance.now(); if (now > b.until) { n.bubble = null; return; }
  ug.save(); ug.font = `${Math.round(fs * 1.5)}px VT323, monospace`; ug.textAlign = 'center'; ug.textBaseline = 'middle';
  const pad = 8, w = Math.ceil(ug.measureText(b.text).width) + pad * 2, h = Math.round(fs * 1.5) + pad, x = Math.round(sx - w / 2), y = Math.round(sy - h - 10), a = Math.min(1, (now - b.born) / 120, (b.until - now) / 250);
  ug.globalAlpha = a;
  const art = dialogArt && dialogArt.bubble && dialogArt.bubble.complete ? dialogArt.bubble : null;
  if (art) { const s = 12, S9 = art.width / 3;   /* 9 mảnh từ ảnh 48×48 */
    const cut = (sxx, syy, dxx, dyy, dw, dh) => ug.drawImage(art, sxx * S9, syy * S9, S9, S9, dxx, dyy, dw, dh);
    cut(0, 0, x, y, s, s); cut(1, 0, x + s, y, w - 2 * s, s); cut(2, 0, x + w - s, y, s, s);
    cut(0, 1, x, y + s, s, h - 2 * s); cut(1, 1, x + s, y + s, w - 2 * s, h - 2 * s); cut(2, 1, x + w - s, y + s, s, h - 2 * s);
    cut(0, 2, x, y + h - s, s, s); cut(1, 2, x + s, y + h - s, w - 2 * s, s); cut(2, 2, x + w - s, y + h - s, s, s);
    if (dialogArt.tail && dialogArt.tail.complete && dialogArt.tail.naturalWidth) ug.drawImage(dialogArt.tail, Math.round(sx - 6), y + h - 2, 12, 9);
    else { ug.fillStyle = '#fff7e6'; ug.strokeStyle = '#1a1626'; ug.lineWidth = 2; ug.beginPath(); ug.moveTo(sx - 5, y + h - 2); ug.lineTo(sx + 5, y + h - 2); ug.lineTo(sx, y + h + 6); ug.closePath(); ug.fill(); ug.stroke(); }
    ug.fillStyle = '#1a1626';
  } else {
    ug.fillStyle = '#fff7e6'; ug.strokeStyle = '#1a1626'; ug.lineWidth = 2; ug.beginPath(); ug.roundRect(x, y, w, h, 4); ug.fill(); ug.stroke();
    ug.beginPath(); ug.moveTo(sx - 5, y + h); ug.lineTo(sx + 5, y + h); ug.lineTo(sx, y + h + 7); ug.closePath(); ug.fill(); ug.stroke(); ug.fillStyle = '#1a1626';
  }
  ug.fillText(b.text, sx, y + h / 2 + 1); ug.restore();
}

// ---- hall of magnitude ----
export function openHall(lv) {
  const list = membersOfLevel(lv), p = $('#hall');
  $('#h-title').innerHTML = `${L.hall} ${levelBadge(lv)}`; $('#h-desc').textContent = L.hallDesc(nf(list.length), lv);
  const q = $('#h-q'); q.value = ''; q.placeholder = L.search;
  const render = () => {
    const s = q.value.trim().toLowerCase();
    const rows = (s ? list.filter(m => m.n.toLowerCase().includes(s) || (m.k || '').toLowerCase().includes(s)) : list).slice(0, 400);
    $('#h-list').innerHTML = rows.map(memberRow).join('') || `<div class="dim" style="padding:20px;text-align:center">—</div>`;
  };
  q.oninput = render; render(); p.hidden = false; setTimeout(() => q.focus(), 50);
}
function memberRow(m) {
  const nat = nationOf(m);
  return `<div class="hrow">${avatarHTML(m, 'av sm')}<div class="hwho"><b>${esc(m.n)}</b> <span class="dim">${esc(m.k && m.k !== m.n ? m.k : '')}</span><div class="dim">${nat ? nat.flag + ' ' : ''}${isLeader(m) ? '★ Leader ' : ''}${isBooster(m) ? '⚡ Booster' : ''}</div></div><div class="hnum"><b>${nf(m.i)}</b><small>${L.imgs}</small></div></div>`;
}
export function closeHall() { $('#hall').hidden = true; }

// ---- world map (spiral) ----
export function openMap(zoneList, save, currentId, onTravel) {
  const lg = lang(), p = $('#map'); $('#m-title').textContent = L.map; $('#m-hint').textContent = L.mapHint; $('#m-close').textContent = L.close;
  const c = $('#m-cv'), g = c.getContext('2d'), W = c.width, H = c.height;
  const nodes = zoneList.map((z, i) => { const k = i - 1, a = -Math.PI / 2 + k * 0.95, r = 150 - k * 13.5; const prev = zoneList[i - 1]; /* k = -1 puts the sea on the outer rim, before the village */ return { z, i, x: W / 2 + r * Math.cos(a), y: H / 2 + r * Math.sin(a), unlocked: !prev || prev.lv < 1 || save.badges.includes(prev.lv) }; });
  g.clearRect(0, 0, W, H);
  g.lineWidth = 5; g.strokeStyle = '#33294a'; g.beginPath(); nodes.forEach((n, i) => i ? g.lineTo(n.x, n.y) : g.moveTo(n.x, n.y)); g.stroke();
  g.lineWidth = 2; g.strokeStyle = '#ffd45e'; g.beginPath(); nodes.forEach((n, i) => { if (!n.unlocked) return; i ? g.lineTo(n.x, n.y) : g.moveTo(n.x, n.y); }); g.stroke();
  g.textAlign = 'center'; g.textBaseline = 'middle';
  for (const n of nodes) {
    g.beginPath(); g.arc(n.x, n.y, 15, 0, 7); g.fillStyle = n.unlocked ? (LEVEL_COLORS[n.z.lv] || '#3f8fd6') : '#2b2440'; g.fill();
    if (n.z.id === currentId) { g.lineWidth = 3; g.strokeStyle = '#fff'; g.stroke(); }
    g.fillStyle = n.unlocked ? '#140a02' : '#6f6585'; g.font = 'bold 11px sans-serif'; g.fillText(n.z.sea ? '🌊' : n.z.lv < 0 ? '⌂' : 'M' + n.z.lv, n.x, n.y);
    if (save.badges.includes(n.z.lv)) { g.fillStyle = '#ffd45e'; g.font = 'bold 12px sans-serif'; g.fillText('★', n.x + 14, n.y - 12); }
  }
  const hit = (mx, my) => nodes.find(n => Math.hypot(n.x - mx, n.y - my) < 18);
  const go = n => { if (!n) return; if (!n.unlocked) { toast(L.mapLocked(zoneList[n.i - 1].lv)); return; } if (n.z.id === currentId) { closeMap(); return; } closeMap(); onTravel(n.z.id); };
  c.onclick = e => { const r = c.getBoundingClientRect(); go(hit((e.clientX - r.left) * W / r.width, (e.clientY - r.top) * H / r.height)); };
  $('#m-list').innerHTML = nodes.map(n => `<div class="mrow${n.unlocked ? '' : ' lk'}${n.z.id === currentId ? ' cur' : ''}" data-i="${n.i}"><span class="lvb" style="background:${n.unlocked ? (LEVEL_COLORS[n.z.lv] || '#3f8fd6') : '#2b2440'};color:${n.unlocked ? '#140a02' : '#6f6585'}">${n.z.sea ? '🌊' : n.z.lv < 0 ? '⌂' : 'M' + n.z.lv}</span><span>${esc(n.z.name[lg])}</span>${save.badges.includes(n.z.lv) ? '<span class="star">★</span>' : ''}</div>`).join('');
  $('#m-list').onclick = e => { const r = e.target.closest('.mrow'); if (r) go(nodes[+r.dataset.i]); };
  p.hidden = false;
}
export function closeMap() { $('#map').hidden = true; }

// ---- shop ----
export const SHOP = {
  shirt: { cost: 3, colors: ['#ffffff', '#e04b4b', '#3d6db5', '#5a9c58', '#8a5cff', '#ffd45e', '#1f1f1f', '#ff9426', '#4fc7a8', '#ff1f4b'] },
  hair: { cost: 2, colors: HAIRS },
  skin: { cost: 0, colors: SKINS }
};
export function openShop(save, onPick) {
  $('#s-title').textContent = L.shopTitle; $('#s-desc').textContent = L.shopDesc; $('#s-close').textContent = L.close;
  const render = () => {
    $('#s-shards').textContent = `◆ ${save.shards}`;
    $('#s-body').innerHTML = Object.entries(SHOP).map(([part, d]) => `<div class="srow"><div class="slabel">${L[part]} <span class="dim">${d.cost ? L.cost(d.cost) : L.free}</span></div><div class="swatches">${d.colors.map(c => { const owned = d.cost === 0 || save.owned.includes(part + ':' + c), worn = save.outfit[part] === c; return `<button class="sw${owned ? ' owned' : ''}${worn ? ' worn' : ''}" data-part="${part}" data-c="${c}" style="background:${c}" title="${worn ? L.worn : owned ? '' : L.cost(d.cost)}">${worn ? '✓' : ''}</button>`; }).join('')}</div></div>`).join('');
  };
  $('#s-body').onclick = e => { const b = e.target.closest('.sw'); if (!b) return; onPick(b.dataset.part, b.dataset.c); render(); };
  render(); $('#shop').hidden = false;
}
export function closeShop() { $('#shop').hidden = true; }

// ---- quiz ----
let quiz = null;
export function openQuiz({ title, questions, sources, onDone }) {
  quiz = { questions, sources, i: 0, score: 0, answered: false, onDone };
  $('#q-title').textContent = title; $('#quiz').hidden = false; renderQuiz();
}
function renderQuiz() {
  const lg = lang(), q = quiz.questions[quiz.i];
  quiz.perm = [0, 1, 2, 3].sort(() => Math.random() - 0.5); // answers shown in random order; perm[shown] = original index
  $('#q-prog').textContent = L.quizQ(quiz.i + 1, quiz.questions.length);
  $('#q-text').textContent = q.q[lg];
  $('#q-opts').innerHTML = quiz.perm.map((orig, i) => `<button class="btn qopt" data-i="${i}"><span class="qn">${i + 1}</span>${esc(q.a[orig][lg])}</button>`).join('');
  $('#q-fb').innerHTML = ''; $('#q-next').hidden = true;
  $('#q-opts').onclick = e => { const b = e.target.closest('.qopt'); if (b) quizAnswer(+b.dataset.i); };
  $('#q-next').onclick = quizNext; quiz.answered = false;
}
export function quizAnswer(i) {
  if (!quiz || quiz.answered) return; quiz.answered = true;
  const q = quiz.questions[quiz.i], ok = quiz.perm[i] === q.c; if (ok) quiz.score++;
  for (const b of document.querySelectorAll('.qopt')) { const k = +b.dataset.i; b.classList.add(quiz.perm[k] === q.c ? 'ok' : (k === i ? 'bad' : 'off')); b.disabled = true; }
  const src = quiz.sources[q.src] || q.src;
  $('#q-fb').innerHTML = `<b class="${ok ? 'good' : 'badt'}">${ok ? L.correct : L.wrong}</b> <a href="${esc(src)}" target="_blank" rel="noopener">${L.source} ↗</a>`;
  $('#q-next').textContent = quiz.i < quiz.questions.length - 1 ? L.quizNext : L.quizFinish; $('#q-next').hidden = false;
}
export function quizNext() {
  if (!quiz || !quiz.answered) return;
  if (quiz.i < quiz.questions.length - 1) { quiz.i++; renderQuiz(); return; }
  const { score, questions, onDone } = quiz; quiz = null; $('#quiz').hidden = true; onDone(score, questions.length);
}
export function quizKey(code) { if (!quiz) return; if (/^Digit[1-4]$/.test(code)) quizAnswer(+code[5] - 1); else if (code === 'Enter' || code === 'Space' || code === 'KeyE') quizNext(); }

// ---- codex (met list + achievements) ----
export function openCodex(save, zoneList, achievements, total) {
  const lg = lang();
  $('#c-title').textContent = L.codex; $('#c-close').textContent = L.close; $('#c-ach-title').textContent = L.achievements; $('#c-met-title').textContent = L.metList;
  $('#c-prog').innerHTML = `<div class="pbar"><div style="width:${(save.met.length / total * 100).toFixed(1)}%"></div></div><div>${L.codexMet(nf(save.met.length), nf(total))}</div>`;
  const ids = new Set(save.met);
  $('#c-zones').innerHTML = zoneList.map(z => { const all = membersOfLevel(z.lv), n = all.filter(m => ids.has(m.id)).length; return `<div class="zrow"><span class="lvb" style="background:${LEVEL_COLORS[z.lv]}">${z.lv < 0 ? '⌂' : 'M' + z.lv}</span><div class="pbar sm"><div style="width:${all.length ? (n / all.length * 100).toFixed(1) : 0}%;background:${LEVEL_COLORS[z.lv]}"></div></div><span class="dim tnum">${n}/${all.length}</span>${save.badges.includes(z.lv) ? '<span class="star">★</span>' : ''}</div>`; }).join('');
  $('#c-ach').innerHTML = achievements.map(a => `<div class="arow${a.done ? ' done' : ''}"><span class="aicon">${a.done ? '🏆' : '🔒'}</span><div><b>${esc(L.ach[a.id][0])}</b><div class="dim">${esc(L.ach[a.id][1])}</div></div></div>`).join('');
  const q = $('#c-q'); q.value = ''; q.placeholder = L.search;
  const list = save.met.slice().reverse().map(id => byId.get(id)).filter(Boolean);
  const render = () => { const s = q.value.trim().toLowerCase(); const rows = (s ? list.filter(m => m.n.toLowerCase().includes(s) || (m.k || '').toLowerCase().includes(s)) : list).slice(0, 300); $('#c-list').innerHTML = rows.map(m => memberRow(m).replace('<div class="hnum">', `<div class="hnum">${levelBadge(m.lv)}`)).join('') || `<div class="dim" style="padding:14px;text-align:center">${L.nobody}</div>`; };
  q.oninput = render; render(); $('#codex').hidden = false;
}
export function closeCodex() { $('#codex').hidden = true; }

// ---- nation board: a country's record in this land, pixel-style ----
const medalURL = {};
function medalImg(rank) { if (rank > 3) return ''; const k = 'medal_' + rank; medalURL[k] ||= O[k].img.toDataURL(); return `<img class="medal" src="${medalURL[k]}" alt="">`; }
export function openNation(st, save, tier = 0) {
  const c = $('#n-flag'), g = c.getContext('2d'), cols = FLAG_COLORS[st.key] || ['#888', '#aaa'];
  g.clearRect(0, 0, c.width, c.height); const h = c.height / cols.length; cols.forEach((col, i) => { g.fillStyle = col; g.fillRect(0, Math.round(i * h), c.width, Math.ceil(h)); });
  g.fillStyle = '#1c1a24'; g.fillRect(0, 0, c.width, 1); g.fillRect(0, c.height - 1, c.width, 1); g.fillRect(0, 0, 1, c.height); g.fillRect(c.width - 1, 0, 1, c.height);
  $('#n-name').textContent = `${st.flag} ${st.name}`; $('#n-sub').textContent = `${L.nationAt(st.lv)} · ${L.tiers[tier]} ${'★'.repeat(tier + 1)}`; $('#n-sub').title = L.tierNote; $('#n-close').textContent = L.close; $('#n-top-title').textContent = L.nTop; $('#n-all-title').textContent = L.nOverall;
  const medal = (title, rank, value, unit) => `<div class="mcard${rank <= 3 ? ' won' : ''}">${medalImg(rank) || '<div class="medal none">#' + rank + '</div>'}<b>${title}</b><span>${nf(value)} ${unit}</span><small>${L.nRank(rank, st.nations)}</small></div>`;
  $('#n-medals').innerHTML = medal(L.medalTitles.count, st.rankCount, st.count, L.nArtists) + medal(L.medalTitles.art, st.rankArt, st.artworks, L.nArtworks) + medal(L.medalTitles.react, st.rankReact, st.reactions, L.nReacts);
  const stat = (v, l) => `<div class="nstat"><b>${v}</b><span>${l}</span></div>`;
  $('#n-stats').innerHTML = stat(nf(st.count), L.nArtists) + stat(nf(st.posts), L.nPosts) + stat(nf(st.leaders), L.nLeaders) + stat(nf(st.boosters), L.nBoosters) + (st.pioneer ? `<div class="nstat wide">${avatarHTML(st.pioneer, 'av sm')}<div><b>${esc(st.pioneer.n)}</b><span>${L.nPioneer} · ${L.nPioneerDesc(st.pioneer.f)}</span></div></div>` : '');
  $('#n-all').innerHTML = stat(nf(st.totalAll), L.nTotal) + stat(nf(st.artworksAll), L.nArtworks) + stat(nf(st.at9), L.nAt9) + stat((st.share * 100).toFixed(1) + '%', L.nShare);
  const met = new Set(save.met);
  $('#n-top').innerHTML = st.top.map((m, i) => `<div class="hrow">${medalImg(i + 1)}${avatarHTML(m, 'av sm')}<div class="hwho"><b>${esc(m.n)}</b> <span class="dim">${esc(m.k && m.k !== m.n ? m.k : '')}</span>${met.has(m.id) ? '<span class="dim"> · ✓</span>' : ''}</div><div class="hnum"><b>${nf(m.i)}</b><small>${L.imgs}</small></div></div>`).join('');
  $('#nation').hidden = false;
}
export function closeNation() { $('#nation').hidden = true; }

// ---- end screen ----
export function openEnd(met, total, o) { $('#e-title').textContent = o && o.title || L.endTitle; $('#e-body').textContent = o && o.body || L.endBody(nf(met), nf(total)); $('#e-btn').textContent = L.endBtn; $('#e-credits').textContent = L.credits; $('#end').hidden = false; }
export function closeEnd() { $('#end').hidden = true; }

// ---- hud / toast ----
let lastHud = '';
export function updateHud({ zone, shards, metInZone, totalInZone, quest, questN, leaders, tasks, done, target, story }) {
  const key = `${zone.id}|${shards}|${metInZone}|${quest}|${questN}|${done}|${tasks}|${target}|${story}|${L === STR.vi}`; if (key === lastHud) return; lastHud = key;
  $('#h-zone').textContent = zone.name[lang()]; $('#h-zone').style.background = LEVEL_COLORS[zone.lv];
  $('#h-shards').textContent = shards; $('#h-met').textContent = `${metInZone}/${totalInZone}`;
  $('#h-quest').textContent = quest ? (done ? (zone.lv === 9 ? L.coreOpen : L.questDone) : (leaders ? L.questLeaders(questN, quest) : L.questMeet(questN, quest))) : '';
  $('#h-task').textContent = done ? '' : tasks; $('#h-target').textContent = target || ''; $('#h-story').textContent = story || '';
}
export function showPrompt(text) { const p = $('#prompt'); if (!text) { p.hidden = true; return; } p.hidden = false; p.textContent = text; }
let toastT = null;
export function toast(text, big = false) {
  const t = $('#toast'); t.textContent = text; t.className = big ? 'big' : ''; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => t.hidden = true, big ? 3200 : 1800);
}
export function applyStaticText() {
  $('#t-tag').textContent = L.tagline; $('#t-play').textContent = L.play; $('#t-cont').textContent = L.cont; $('#t-lang').textContent = L.lang;
  $('#t-name').placeholder = L.namePh; $('#t-ctl').textContent = L.controls; $('#h-close').textContent = L.close; $('#t-fs').textContent = L.fs;
  $('#p-title').textContent = L.menu; $('#p-resume').textContent = L.resume; $('#p-lang').textContent = L.lang; $('#p-quit').textContent = L.toTitle;
  $('#t-music').textContent = ''; setMusicLabel(true);
  /* các dòng này trước đây nằm lạc trong flagLabel() sau return (lỗi cũ) → nút Tìm tôi / Discord / Tour bị trống chữ */
  $('#t-find-label').textContent = L.findLabel; $('#t-find').placeholder = L.findPh; $('#t-find-btn').textContent = L.findBtn;
  $('#t-discord').textContent = L.discordBtn; $('#t-discord-note').textContent = L.discordNote;
  $('#t-demo').textContent = L === STR.vi ? '▶ Tour tự động (xem mọi tính năng)' : '▶ Auto tour (see every feature)';
}
export function setMusicLabel(on) { const t = `♪ ${L.music}: ${on ? L.on : L.off}`; $('#p-music').textContent = t; $('#t-music').textContent = t; }
export function flagLabel(key) { const n = nationOf({ ro: [key] }); return n ? `${n.flag} ${n.name}` : key; }
