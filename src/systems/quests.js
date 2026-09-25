// quests.js — personal requests from the artists who walk each land.
//
// Every day each land picks 4–6 of its NPCs (seeded by hashStr(zone + day number), so the set
// rotates daily) and gives each of them ONE small request: fetch some bag items, carry an animal
// on your head, go say hello to a friend of theirs, rebuild their nation's yard, or cut trees.
// A yellow "!" floats over someone with an offer, a grey "?" while their request is running and a
// green "✓" when you can hand it in. E opens a small panel (Accept / Decline); handing in pays
// Seismic stones and, one time in four, one of that artist's cards.
//
// Owns: save.sys.quests = { active: [{npcId, zone, type, item, n, base, reward, day, …}], done, declined }
// See systems/API.md. Only this file + the two registration lines in systems/index.js.
import { getCarry, removeCarry } from './animals.js';
import { ZONES } from '../world.js';

const TILE = 16;
const MAX_ACTIVE = 3;          // you may juggle three requests at a time
const REACH = 24;              // px around the artist
const BOARD_REACH = 30;        // px around a notice board (fallback hand-in)
const CHOP_WOOD = 6;           // "cut 3 trees" = +6 🪵 gathered since you accepted
const CARD_CHANCE = 0.25;
const MIRROR = ['cow', 'chicken', 'bird', 'fish', 'sheep', 'rabbit', 'crab', 'bat']; // head-carry mirrors in save.inv

// ---------------------------------------------------------------- text
const STR = {
  en: {
    accept: 'Accept request', handIn: 'Hand in', handBoard: 'Hand in at the board',
    title: 'A personal request', logTitle: 'Quest log', none: 'No requests running. Look for a yellow ! over an artist.',
    reward: 'Reward', stones: 'Seismic stones', cardMaybe: 'a chance of their art card',
    btnAccept: 'Accept', btnDecline: 'Decline', btnClose: 'Close',
    full: 'Three requests already — finish one first.', declined: 'Maybe another day.',
    taken: 'Request accepted. Check the log with Q.', gotCard: 'Art card: ', paid: n => `+${n} 🪨 stones`,
    birdNote: '🐦 The bird will find you — hand this in at any notice board in this land.',
    completed: 'Completed', progress: 'Progress', land: 'Land', questFor: 'Request from',
    notReady: 'Not ready yet.', gone: 'they are not walking here today', atBoard: 'hand in at a notice board',
    tFetch: (n, ic, it) => `Bring ${n} ${ic} ${it}`, tCarry: (ic, it) => `Carry ${ic} ${it} on your head`,
    tFriend: who => `Say hello to ${who}`, tHelp: nat => `Rebuild the ${nat} yard`, tChop: `Cut 3 trees (+6 🪵)`,
    hint: 'E · talk to them again to hand it in'
  },
  vi: {
    accept: 'Nhận việc', handIn: 'Giao', handBoard: 'Giao ở bảng tin',
    title: 'Lời nhờ riêng', logTitle: 'Sổ việc', none: 'Chưa nhận việc nào. Tìm dấu ! vàng trên đầu nghệ sĩ nhé.',
    reward: 'Thưởng', stones: 'đá Seismic', cardMaybe: 'có cơ hội nhận thẻ tranh',
    btnAccept: 'Nhận', btnDecline: 'Từ chối', btnClose: 'Đóng',
    full: 'Đang có ba việc rồi — xong một cái đã.', declined: 'Thôi để hôm khác.',
    taken: 'Đã nhận việc. Bấm Q để xem sổ.', gotCard: 'Thẻ tranh: ', paid: n => `+${n} 🪨 đá`,
    birdNote: '🐦 Chim sẽ tìm bạn — giao ở bất kỳ bảng tin nào trong vùng này.',
    completed: 'Đã xong', progress: 'Tiến độ', land: 'Vùng', questFor: 'Nhờ bởi',
    notReady: 'Chưa xong.', gone: 'hôm nay họ không ở đây', atBoard: 'giao ở bảng tin',
    tFetch: (n, ic, it) => `Mang ${n} ${ic} ${it}`, tCarry: (ic, it) => `Đội ${ic} ${it} trên đầu`,
    tFriend: who => `Chào hỏi ${who}`, tHelp: nat => `Dựng lại khu ${nat}`, tChop: `Chặt 3 cây (+6 🪵)`,
    hint: 'E · nói chuyện lại để giao'
  }
};
const L = ctx => STR[ctx.lang() === 'vi' ? 'vi' : 'en'];
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const nf = n => (n || 0).toLocaleString('en-US');

// ---------------------------------------------------------------- dialogue templates (6–8 per type, EN + VI)
const TPL = {
  fetch: {
    en: [
      v => `I've posted ${v.i} artworks and I'm starving — bring me ${v.n} ${v.icon} ${v.item}?`,
      v => `${v.name} here. The studio ran out of ${v.item}. ${v.n} ${v.icon} would save my week.`,
      v => `Fellow artist! ${v.n} ${v.icon} ${v.item} and I'll sketch you something nice.`,
      v => `Greetings from ${v.nat}. My next piece needs ${v.n} ${v.icon} ${v.item} and I have none.`,
      v => `Magnitude ${v.lv} and still begging for ${v.item}. ${v.n} ${v.icon}, please?`,
      v => `${v.i} artworks, zero ${v.item}. Fix that for me: ${v.n} ${v.icon}.`,
      v => `I trade in pixels, not errands — but ${v.n} ${v.icon} ${v.item}? I'd owe you one.`,
      v => `My palette is dry. ${v.n} ${v.icon} ${v.item} and the stones are yours.`
    ],
    vi: [
      v => `Mình đăng ${v.i} bức rồi mà bụng vẫn đói — mang giúp ${v.n} ${v.icon} ${v.item} nhé?`,
      v => `${v.name} đây. Xưởng hết sạch ${v.item}. Có ${v.n} ${v.icon} là mình sống lại.`,
      v => `Đồng nghiệp ơi! ${v.n} ${v.icon} ${v.item} thôi, mình vẽ tặng bạn một bức.`,
      v => `Chào từ ${v.nat}. Bức tới cần ${v.n} ${v.icon} ${v.item} mà mình không có gì cả.`,
      v => `Magnitude ${v.lv} rồi vẫn phải xin ${v.item}. ${v.n} ${v.icon} nha?`,
      v => `${v.i} bức tranh, không một ${v.item} nào. Giúp mình ${v.n} ${v.icon} đi.`,
      v => `Mình chỉ giỏi vẽ chứ không giỏi chạy việc — ${v.n} ${v.icon} ${v.item} được không? Mình nợ bạn.`,
      v => `Bảng màu khô cong rồi. ${v.n} ${v.icon} ${v.item} thì đá là của bạn.`
    ]
  },
  carry: {
    en: [
      v => `Could you carry me ${v.a} ${v.icon} ${v.item}? On your head. ${v.i} artworks and I still can't catch one.`,
      v => `${v.name} here — a live ${v.icon} ${v.item}, balanced on your head, right to this spot.`,
      v => `In ${v.nat} we say a borrowed ${v.item} draws better lines. Bring me one ${v.icon}?`,
      v => `I want to draw ${v.a} ${v.icon} ${v.item} from life. Carry one over and hold still.`,
      v => `Magnitude ${v.lv} artist, terrible at catching things. ${v.icon} ${v.item}, on your head, please.`,
      v => `My reference folder has no ${v.item} ${v.icon}. Walk one here and I'll fix that.`,
      v => `Bring me ${v.a} ${v.icon} ${v.item} — alive, on your head. Don't ask why.`,
      v => `${v.i} artworks and not one ${v.item}. Head-carry me one ${v.icon} and we're even.`
    ],
    vi: [
      v => `Đội giúp mình một ${v.icon} ${v.item} được không? Trên đầu ấy. ${v.i} bức tranh mà mình vẫn không bắt nổi.`,
      v => `${v.name} đây — một ${v.icon} ${v.item} còn sống, đội trên đầu, mang tới đúng chỗ này.`,
      v => `Ở ${v.nat} người ta bảo mượn ${v.item} thì nét vẽ đẹp hơn. Mang cho mình một ${v.icon} nhé?`,
      v => `Mình muốn vẽ ${v.icon} ${v.item} từ mẫu thật. Đội một con tới rồi đứng yên giúp.`,
      v => `Nghệ sĩ Magnitude ${v.lv}, bắt con gì cũng trượt. ${v.icon} ${v.item}, trên đầu, làm ơn.`,
      v => `Thư mục tham khảo của mình chưa có ${v.item} ${v.icon} nào. Mang một con tới đi.`,
      v => `Mang cho mình một ${v.icon} ${v.item} — còn sống, đội trên đầu. Đừng hỏi vì sao.`,
      v => `${v.i} bức tranh mà không có nổi một ${v.item}. Đội cho mình một ${v.icon} là huề.`
    ]
  },
  friend: {
    en: [
      v => `Find my friend ${v.who} and say hello for me. We post in the same thread.`,
      v => `${v.who} is somewhere in this land. Say hello — tell them ${v.name} sent you.`,
      v => `I owe ${v.who} a hello and I'm too shy. ${v.i} artworks, zero courage. Go for me?`,
      v => `We came from ${v.nat} together, ${v.who} and I. Go greet them, please.`,
      v => `Do me a kindness: find ${v.who} and introduce yourself. They need new faces.`,
      v => `${v.who} has not heard from me since my last post. Say hello on my behalf.`,
      v => `Magnitude ${v.lv} and still bad at small talk. Say hello to ${v.who} for me.`,
      v => `Go meet ${v.who}. Best artist I know. Tell them I said so.`
    ],
    vi: [
      v => `Tìm bạn mình là ${v.who} rồi chào giúp nhé. Tụi mình đăng chung một thớt.`,
      v => `${v.who} đang ở đâu đó trong vùng này. Chào một tiếng — bảo là ${v.name} nhờ.`,
      v => `Mình nợ ${v.who} một lời chào mà ngại quá. ${v.i} bức tranh, không một chút can đảm. Đi giúp nhé?`,
      v => `Tụi mình cùng từ ${v.nat} qua đây, ${v.who} và mình. Qua chào bạn ấy giúp.`,
      v => `Làm ơn: tìm ${v.who} rồi giới thiệu bản thân. Bạn ấy cần gặp người mới.`,
      v => `${v.who} chưa nghe tin mình từ bài đăng trước. Chào giúp mình nhé.`,
      v => `Magnitude ${v.lv} rồi mà vẫn dở khoản bắt chuyện. Chào ${v.who} giùm mình.`,
      v => `Đi gặp ${v.who} đi. Nghệ sĩ giỏi nhất mình biết. Nói là mình khen đấy.`
    ]
  },
  helpDistrict: {
    en: [
      v => `The ${v.nat} yard is in pieces. Put every stone back and I'll pay you properly.`,
      v => `I can't paint next to rubble. Rebuild our ${v.nat} district — all of it.`,
      v => `${v.i} artworks and my own yard is a ruin. Help me fix ${v.nat}, please.`,
      v => `Raiders took our walls. ${v.nat} needs every piece standing again.`,
      v => `${v.name} here. Our district is broken. Mend it and the stones are yours.`,
      v => `I sleep badly while ${v.nat} lies in rubble. Rebuild it for us?`,
      v => `Magnitude ${v.lv} means nothing with a broken yard. Repair ${v.nat}.`,
      v => `Fix our ${v.nat} walls. Every single ruined piece. Then come back to me.`
    ],
    vi: [
      v => `Khu ${v.nat} nát hết rồi. Xếp lại từng viên đá giúp mình, mình trả công tử tế.`,
      v => `Cạnh đống đổ nát thì vẽ sao nổi. Dựng lại khu ${v.nat} — dựng hết.`,
      v => `${v.i} bức tranh mà sân nhà thì hoang tàn. Giúp mình sửa ${v.nat} nhé.`,
      v => `Quân cướp phá tường rồi. ${v.nat} cần dựng lại đủ từng mảnh.`,
      v => `${v.name} đây. Khu của tụi mình hỏng rồi. Sửa xong thì đá là của bạn.`,
      v => `Mình ngủ không yên khi ${v.nat} còn là đống gạch. Dựng lại giúp nhé?`,
      v => `Magnitude ${v.lv} mà sân nhà tan hoang thì cũng vô nghĩa. Sửa ${v.nat} đi.`,
      v => `Sửa tường khu ${v.nat}. Từng mảnh đổ một. Xong quay lại tìm mình.`
    ]
  },
  chop: {
    en: [
      v => `Cut 3 trees for me — six 🪵 wood is all I ask. I need a new frame.`,
      v => `${v.name} here. My canvas needs a stretcher: chop 3 trees, bring 6 🪵.`,
      v => `${v.i} artworks and every one of them needs a frame. Three trees, 6 🪵. Go.`,
      v => `An axe, three trees, six 🪵 wood. I'd do it myself but my hands are painted.`,
      v => `We burn a lot of wood in ${v.nat}. Cut 3 trees and bring the 6 🪵 here.`,
      v => `Magnitude ${v.lv} and no firewood. Three trees, six 🪵, that's the whole job.`,
      v => `Chop 3 trees. Six 🪵 wood. Then I'll show you what I'm painting.`,
      v => `Six 🪵 from three trees — for the studio wall. Then we talk about stones.`
    ],
    vi: [
      v => `Chặt giúp mình 3 cây — sáu 🪵 gỗ thôi. Mình cần đóng khung mới.`,
      v => `${v.name} đây. Toan cần khung căng: chặt 3 cây, mang về 6 🪵.`,
      v => `${v.i} bức tranh, bức nào cũng cần khung. Ba cây, 6 🪵. Đi nào.`,
      v => `Một cây rìu, ba cái cây, sáu 🪵 gỗ. Mình tự làm nhưng tay dính sơn hết rồi.`,
      v => `Dân ${v.nat} đốt gỗ dữ lắm. Chặt 3 cây rồi mang 6 🪵 về đây.`,
      v => `Magnitude ${v.lv} mà không có củi. Ba cây, sáu 🪵, xong việc.`,
      v => `Chặt 3 cây. Sáu 🪵 gỗ. Rồi mình cho xem mình đang vẽ gì.`,
      v => `Sáu 🪵 từ ba cái cây — để đóng vách xưởng. Rồi tính chuyện đá.`
    ]
  }
};
const THANKS = {
  en: [
    v => `Perfect. That's exactly what I needed — here, take the stones.`,
    v => `You actually did it. ${v.i} artworks and nobody has ever helped me like this.`,
    v => `Thank you. ${v.nat} remembers kindness. So do I.`,
    v => `That saved my next post. Stones for you, and my thanks.`,
    v => `Beautiful. I'll put you in the background of the next piece.`,
    v => `Done and done. Come find me tomorrow — I'll have something else.`,
    v => `You're quicker than my deadlines. Take this.`,
    v => `Magnitude ${v.lv} thanks you. Sincerely.`
  ],
  vi: [
    v => `Chuẩn luôn. Đúng thứ mình cần — cầm đá này.`,
    v => `Bạn làm thật à. ${v.i} bức tranh mà chưa ai giúp mình kiểu này.`,
    v => `Cảm ơn nhé. Dân ${v.nat} nhớ ơn lắm. Mình cũng vậy.`,
    v => `Cứu bài đăng tới của mình rồi. Đá cho bạn, kèm lời cảm ơn.`,
    v => `Tuyệt. Mình sẽ vẽ bạn vào hậu cảnh bức sau.`,
    v => `Xong xuôi. Mai ghé lại nhé — mình có việc khác.`,
    v => `Bạn nhanh hơn cả deadline của mình. Cầm lấy này.`,
    v => `Magnitude ${v.lv} xin cảm ơn. Thật lòng.`
  ]
};

// ---------------------------------------------------------------- land tables
const ORDER = { village: 0, m1: 1, m2: 2, m3: 3, m4: 4, m5: 5, m6: 6, m7: 7, m8: 8, m9: 9 };
const GROUP = z => (z === 'village' || z === 'm1') ? 0 : (z === 'm2' || z === 'm3') ? 1 : (z === 'm4' || z === 'm5') ? 2 : (z === 'm6' || z === 'm7') ? 3 : 4;
// fetch pools per land group — only ctx.ITEMS ids. A land may ask for its own tier or anything lower.
const TIER_ITEMS = [
  [['wood', 5], ['berry', 3], ['flower', 3], ['sand', 4], ['leaf', 3]],
  [['hay', 4], ['egg', 2], ['mushroom', 3], ['honey', 1], ['wool', 2], ['resin', 2]],
  [['rock', 4], ['ore', 3], ['charcoal', 2], ['iron', 1]],
  [['glass', 2], ['obsidian', 2], ['lava', 1]],
  [['ice', 2], ['crystal', 1]]
];
// which head-carry animals actually live in each land (animals.js THEME + ecology.js TH)
const CARRY_ZONE = {
  village: ['chicken', 'cow'],
  m1: ['fish', 'fishbig', 'crab', 'chicken'],
  m2: ['sheep', 'chicken', 'cow'],
  m3: ['rabbit', 'bird', 'chicken'],
  m4: ['bat', 'bird'], m5: ['bird'], m6: ['bird'], m7: ['bird'], m8: ['bird'], m9: ['bird']
};
const W_FETCH = [4, 4, 5, 5, 4], W_CARRY = [3, 3, 1, 1, 1], W_FRIEND = [2, 2, 2, 2, 3], W_CHOP = [3, 3, 1, 1, 1], W_HELP = [2, 2, 3, 3, 3];
const WOODY = { tree: 1, pine: 1, pine_s: 1, palm: 1, deadtree: 1 };   // trees.js chops these — no trees here, no chop request

// ---------------------------------------------------------------- state (rebuilt on every zone enter)
let offers = new Map();     // npcId → offer spec for today, in this land
let panelEl = null, logEl = null;
let openWho = null;         // npcId whose panel is open
let closers = false;
let bob = 0;

// ---------------------------------------------------------------- persisted state
function sysS(ctx) {
  const sv = ctx.S.save; sv.sys = sv.sys || {}; if (ctx.clock) clockRef = ctx.clock;
  const s = (sv.sys.quests = sv.sys.quests || {});
  if (!Array.isArray(s.active)) s.active = [];
  if (typeof s.done !== 'number') s.done = 0;
  if (!Array.isArray(s.declined)) s.declined = [];
  const day = dayNum();                                   // yesterday's refusals are forgotten
  if (s.declined.length && s.declined.some(d => !d || d.day !== day)) s.declined = s.declined.filter(d => d && d.day === day);
  return s;
}
/* F01: 'ngày' = ngày game tuyệt đối (ctx.clock.dayIndex); chưa có clock → ngày lịch máy như cũ */
let clockRef = null;
const dayNum = () => clockRef ? clockRef.dayIndex : Math.floor(Date.now() / 864e5);
const zoneName = (ctx, id) => { const z = ZONES[id]; return z ? (z.name[ctx.lang()] || z.name.en) : id; };
const memberOf = (ctx, id) => ctx.byId.get(id) || null;
const nickOf = m => (m && (m.k || m.n)) || '?';
const lvOf = m => (!m || m.lv < 0) ? '—' : m.lv.toFixed(1);
const natOf = (ctx, m) => { const n = m && ctx.nationOf(m); return n ? n.name : (ctx.lang() === 'vi' ? 'nơi xa' : 'far away'); };

// ---------------------------------------------------------------- helpers
function pickW(rng, entries) {
  let tot = 0; for (const e of entries) tot += e[1];
  if (tot <= 0) return entries.length ? entries[0][0] : null;
  let r = rng() * tot;
  for (const e of entries) { r -= e[1]; if (r <= 0) return e[0]; }
  return entries[entries.length - 1][0];
}
function shuffle(arr, rng) { for (let i = arr.length - 1; i > 0; i--) { const j = (rng() * (i + 1)) | 0;[arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; }
function plotOfNation(ctx, m) {
  const map = ctx.S.map; if (!map || !map.plots) return -1;
  const nat = ctx.nationOf(m); if (!nat) return -1;
  return map.plots.findIndex(p => p.nation === nat.key);
}
function districtSafe(ctx, i) { try { return ctx.districtState(i); } catch (e) { return { ruined: 0, total: 0, condition: 1 }; } }
function hasTrees(ctx) {
  const map = ctx.S.map; if (!map || !map.objects) return false;
  let n = 0; for (const o of map.objects) if (WOODY[o.type] && ++n >= 8) return true;
  return false;
}
function carryIndex(ctx, q) {
  let c = []; try { c = getCarry(ctx); } catch (e) { return -1; }
  for (let i = 0; i < c.length; i++) { if (c[i].kind !== q.kind) continue; if (q.big && !c[i].big) continue; return i; }
  return -1;
}
// animals.js owns the stack; after its removeCarry we re-sync every mirror (ecology adds four more kinds)
function takeCarry(ctx, i) {
  removeCarry(ctx, i);
  const inv = (ctx.S.save.inv = ctx.S.save.inv || {});
  for (const k of MIRROR) inv[k] = 0;
  for (const it of getCarry(ctx)) if (MIRROR.includes(it.kind)) inv[it.kind]++;
  ctx.persist();
}
const npcById = (ctx, id) => ctx.S.npcs.find(n => n.m && n.m.id === id) || null;
const activeOf = (ctx, id) => sysS(ctx).active.find(q => q.npcId === id) || null;

// ---------------------------------------------------------------- generation
function rewardFor(ctx, rng) {
  const ord = ORDER[ctx.S.zone.id] ?? 0;
  return Math.min(20, 6 + Math.round(ord * 1.1) + ((rng() * 4) | 0));
}
function makeQuest(ctx, npc, rng, pool) {
  const zid = ctx.S.zone.id, grp = GROUP(zid), m = npc.m;
  const opts = [];
  opts.push(['fetch', W_FETCH[grp]]);
  if ((CARRY_ZONE[zid] || []).length) opts.push(['carry', W_CARRY[grp]]);
  if (pool.length > 1) opts.push(['friend', W_FRIEND[grp]]);
  if (hasTrees(ctx)) opts.push(['chop', W_CHOP[grp]]);
  const pi = plotOfNation(ctx, m);
  if (pi >= 0 && districtSafe(ctx, pi).ruined > 0) opts.push(['helpDistrict', W_HELP[grp]]);
  const type = pickW(rng, opts);
  const q = { npcId: m.id, zone: zid, type, item: null, n: 1, base: 0, reward: rewardFor(ctx, rng), day: dayNum(), ti: (rng() * 8) | 0 };
  if (type === 'fetch') {
    const bag = [];
    for (let g = 0; g <= grp; g++) for (const e of TIER_ITEMS[g]) if (ctx.ITEMS[e[0]]) bag.push([e, g === grp ? 3 : 1]);
    const e = pickW(rng, bag); if (!e) return null;
    q.item = e[0]; q.n = e[1];
  } else if (type === 'carry') {
    const kinds = CARRY_ZONE[zid] || []; const k = kinds[(rng() * kinds.length) | 0];
    q.kind = k === 'fishbig' ? 'fish' : k; q.big = k === 'fishbig'; q.item = q.kind; q.n = 1;
  } else if (type === 'friend') {
    const others = pool.filter(n => n.m.id !== m.id);
    if (!others.length) return null;
    const nat = ctx.nationOf(m);
    const same = nat ? others.filter(n => (ctx.nationOf(n.m) || {}).key === nat.key) : [];  // a friend from home, when there is one
    const base = same.length ? same : others;
    const unmet = base.filter(n => !ctx.S.save.met.includes(n.m.id));
    const src = unmet.length ? unmet : base;
    const f = src[(rng() * src.length) | 0];
    q.friendId = f.m.id; q.n = 1;
  } else if (type === 'helpDistrict') {
    q.plot = pi; q.n = districtSafe(ctx, pi).ruined || 1;
  } else if (type === 'chop') {
    q.n = CHOP_WOOD;
  }
  return q;
}
function generate(ctx) {
  offers = new Map();
  const S = ctx.S; if (!S.zone || !S.npcs) return;
  const zid = S.zone.id, st = sysS(ctx), day = dayNum();
  const rng = ctx.rngFrom(ctx.hashStr(zid + ':' + day));
  const met = ctx.metIds();
  const declined = new Set(st.declined.filter(d => d.day === day).map(d => d.id));
  const activeIds = new Set(st.active.map(q => q.npcId));
  let pool = S.npcs.filter(n => n.m && !n.m.guide && !n.m.elder && !n.hermit);   // the sea hermit runs the buoy race instead
  if (zid === 'm9') { const plain = pool.filter(n => !ctx.isLeader(n.m)); if (plain.length >= 4) pool = plain; }
  if (!pool.length) return;
  const metPool = shuffle(pool.filter(n => met.has(n.m.id)), rng);
  const rest = shuffle(pool.filter(n => !met.has(n.m.id)), rng);
  const ordered = metPool.concat(rest);
  const count = Math.min(ordered.length, 4 + ((rng() * 3) | 0));   // 4..6 artists a day
  const chosen = ordered.slice(0, count);
  for (const npc of chosen) {
    if (declined.has(npc.m.id) || activeIds.has(npc.m.id)) continue;
    let q = null; try { q = makeQuest(ctx, npc, rng, ordered); } catch (e) { q = null; }
    if (q) offers.set(npc.m.id, q);
  }
}

// ---------------------------------------------------------------- progress
function progressOf(ctx, q) {
  switch (q.type) {
    case 'fetch': return { have: Math.min(q.n, ctx.bag.count(q.item)), need: q.n };
    case 'carry': return { have: carryIndex(ctx, q) >= 0 ? 1 : 0, need: 1 };
    case 'friend': return { have: q.ok || ctx.S.save.met.includes(q.friendId) ? 1 : 0, need: 1 };
    case 'chop': return { have: Math.min(q.n, q.gain || 0), need: q.n };
    case 'helpDistrict': {
      if (q.ok) return { have: q.n, need: q.n };
      if (ctx.S.zone && ctx.S.zone.id === q.zone && q.plot >= 0) {
        const d = districtSafe(ctx, q.plot);
        return { have: Math.max(0, q.n - d.ruined), need: q.n };
      }
      return { have: 0, need: q.n };
    }
  }
  return { have: 0, need: q.n || 1 };
}
const isReady = (ctx, q) => { const p = progressOf(ctx, q); return p.have >= p.need; };

// ---------------------------------------------------------------- request text
function varsFor(ctx, q, m) {
  const lg = ctx.lang() === 'vi' ? 'vi' : 'en';
  const v = { lg, name: nickOf(m), i: nf(m ? m.i : 0), nat: natOf(ctx, m), lv: lvOf(m), n: q.n, item: '', icon: '', a: lg === 'vi' ? 'một' : 'a', who: '' };
  if (q.type === 'fetch') { v.item = ctx.itemName(q.item); v.icon = ctx.itemIcon(q.item); }
  if (q.type === 'carry') {
    v.icon = ctx.itemIcon(q.kind);
    const base = ctx.itemName(q.kind);
    v.item = q.big ? (lg === 'vi' ? 'cá to' : 'big fish') : base;
  }
  if (q.type === 'friend') { const f = memberOf(ctx, q.friendId); v.who = f ? f.n : '???'; }
  return v;
}
function requestText(ctx, q) {
  const m = memberOf(ctx, q.npcId), lg = ctx.lang() === 'vi' ? 'vi' : 'en';
  const list = (TPL[q.type] || TPL.fetch)[lg];
  const f = list[(q.ti || 0) % list.length];
  let s = '';
  try { s = f(varsFor(ctx, q, m)); } catch (e) { s = ''; }
  if (q.bird) s += '  ' + L(ctx).birdNote;
  return s;
}
function shortText(ctx, q) {
  const t = L(ctx);
  switch (q.type) {
    case 'fetch': return t.tFetch(q.n, ctx.itemIcon(q.item), ctx.itemName(q.item));
    case 'carry': return t.tCarry(ctx.itemIcon(q.kind), q.big ? (ctx.lang() === 'vi' ? 'cá to' : 'big fish') : ctx.itemName(q.kind));
    case 'friend': { const f = memberOf(ctx, q.friendId); return t.tFriend(f ? f.n : '???'); }
    case 'helpDistrict': { const m = memberOf(ctx, q.npcId); return t.tHelp(natOf(ctx, m)); }
    case 'chop': return t.tChop;
  }
  return '';
}
function thanksText(ctx, q) {
  const m = memberOf(ctx, q.npcId), lg = ctx.lang() === 'vi' ? 'vi' : 'en';
  const list = THANKS[lg], f = list[(q.ti || 0) % list.length];
  try { return f(varsFor(ctx, q, m)); } catch (e) { return lg === 'vi' ? 'Cảm ơn bạn!' : 'Thank you!'; }
}

// ---------------------------------------------------------------- offer panel
function rowFor(ctx, m) {
  return `<div class="hrow">${ctx.avatarHTML(m, 'av sm')}<span class="hwho"><b>${esc(m.n)}</b>` +
    `<div class="dim">${esc(m.k && m.k !== m.n ? m.k : '')}${m.k && m.k !== m.n ? ' · ' : ''}${esc(natOf(ctx, m))} · ${nf(m.i)} 🖼</div></span>` +
    `<span class="hnum">${ctx.levelBadge(m.lv)}</span></div>`;
}
function openOffer(ctx, npcId) {
  const t = L(ctx), q = offers.get(npcId), m = memberOf(ctx, npcId);
  if (!q || !m) return;
  openWho = npcId;
  const bs = 'width:auto;margin:0;padding:8px 12px';
  const html = `<h2>📜 ${t.title}</h2>${rowFor(ctx, m)}
    <p style="margin:10px 2px;line-height:1.5">${esc(requestText(ctx, q))}</p>
    <p class="dim" style="margin:6px 2px">${t.reward}: <b>🪨 ${q.reward} ${t.stones}</b> · ${t.cardMaybe}</p>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:6px">
      <button class="btn primary" id="qs-yes" style="${bs}">${t.btnAccept}</button>
      <button class="btn" id="qs-no" style="${bs}">${t.btnDecline}</button>
      <button class="btn" id="qs-x" style="${bs}">${t.btnClose}</button>
    </div>`;
  panelEl = ctx.panel('quest', html);
  panelEl.hidden = false;
  ctx.setMode('quest');
  if (!closers) { registerClosers(ctx); }
  const p = panelEl.panel;
  p.querySelector('#qs-yes').onclick = () => acceptOffer(ctx, npcId);
  p.querySelector('#qs-no').onclick = () => declineOffer(ctx, npcId);
  p.querySelector('#qs-x').onclick = () => closeOffer(ctx);
}
function closeOffer(ctx) {
  openWho = null;
  if (panelEl) panelEl.hidden = true;
  if (ctx.S.mode === 'quest') ctx.setMode('play');
}
function registerClosers(ctx) {
  ctx.registerCloser('quest', () => closeOffer(ctx));
  ctx.registerCloser('questlog', () => closeLog(ctx));
  closers = true;
}
function acceptOffer(ctx, npcId) {
  const t = L(ctx), st = sysS(ctx), q = offers.get(npcId);
  if (!q) { closeOffer(ctx); return; }
  if (st.active.length >= MAX_ACTIVE) { ctx.toast(t.full); closeOffer(ctx); return; }
  const a = { ...q };
  a.base = ctx.bag.count('wood'); a.last = a.base; a.gain = 0; a.ok = false;
  // a bird on your head becomes a messenger: hand this in at any notice board of this land.
  // (never eat the bird when the bird itself is what they asked for)
  if (!(a.type === 'carry' && a.kind === 'bird')) {
    const bi = (() => { let c = []; try { c = getCarry(ctx); } catch (e) { } return c.findIndex(x => x.kind === 'bird'); })();
    if (bi >= 0) { takeCarry(ctx, bi); a.bird = true; }
  }
  st.active.push(a);
  offers.delete(npcId);
  ctx.persist();
  ctx.sfx('craft');
  ctx.toast(t.taken, true);
  closeOffer(ctx);
}
function declineOffer(ctx, npcId) {
  const t = L(ctx), st = sysS(ctx);
  st.declined.push({ id: npcId, day: dayNum() });
  offers.delete(npcId);
  ctx.persist();
  ctx.toast(t.declined);
  closeOffer(ctx);
}

// ---------------------------------------------------------------- hand in
function handIn(ctx, q) {
  const t = L(ctx), st = sysS(ctx), m = memberOf(ctx, q.npcId);
  if (!isReady(ctx, q)) { ctx.toast(t.notReady); return; }
  if (q.type === 'fetch') ctx.bag.remove(q.item, q.n);
  else if (q.type === 'carry') { const i = carryIndex(ctx, q); if (i < 0) { ctx.toast(t.notReady); return; } takeCarry(ctx, i); }
  const i = st.active.indexOf(q); if (i >= 0) st.active.splice(i, 1);
  st.done = (st.done || 0) + 1;
  const paid = ctx.bag.add('stone', q.reward);           // stone weighs 0 — the bag never refuses it
  let card = '';
  if (m && Math.random() < CARD_CHANCE) {
    const cards = (ctx.S.save.cards = ctx.S.save.cards || []);
    if (!cards.includes(m.id)) { cards.push(m.id); card = t.gotCard + m.n; }
  }
  ctx.persist();
  ctx.sfx('win');
  ctx.toast(t.paid(paid) + (card ? ' · ' + card : ''), true);
  if (m) {
    ctx.setMode('dialog');
    ctx.openDialog({ title: m.n, pages: [thanksText(ctx, q)], onClose: () => ctx.setMode('play') });
  }
}

// ---------------------------------------------------------------- quest log (Q)
function openLog(ctx) {
  const t = L(ctx), st = sysS(ctx);
  const rows = st.active.map(q => {
    const m = memberOf(ctx, q.npcId), p = progressOf(ctx, q), done = p.have >= p.need;
    const where = q.zone === (ctx.S.zone && ctx.S.zone.id) ? '' : ` <span class="dim">· ${esc(zoneName(ctx, q.zone))}</span>`;
    const av = m ? ctx.avatarHTML(m, 'av sm') : '';
    return `<div class="hrow">${av}<span class="hwho"><b>${done ? '✓ ' : ''}${esc(m ? m.n : q.npcId)}</b>${where}` +
      `<div class="dim">${esc(shortText(ctx, q))}${q.bird ? ' · 🐦' : ''}</div></span>` +
      `<span class="hnum"><b>${p.have}/${p.need}</b><small>🪨 ${q.reward}</small></span></div>`;
  }).join('');
  const bs = 'width:auto;margin:0;padding:8px 12px';
  const html = `<h2>📜 ${t.logTitle}<span class="chip">${t.completed}: ${st.done || 0}</span></h2>
    <div class="scroll">${rows || `<div class="dim" style="padding:14px;text-align:center">${t.none}</div>`}</div>
    <div style="display:flex;gap:8px;margin-top:6px"><button class="btn" id="ql-x" style="${bs}">${t.btnClose}</button></div>`;
  logEl = ctx.panel('questlog', html);
  logEl.hidden = false;
  ctx.setMode('questlog');
  if (!closers) registerClosers(ctx);
  logEl.panel.querySelector('#ql-x').onclick = () => closeLog(ctx);
}
/* plan-10: danh sách lời nhờ đang nhận cho menu phụ */
export function questRows(ctx) {
  if (!ctx.S.save) return [];
  const st = sysS(ctx);
  return st.active.map(q => { const m = memberOf(ctx, q.npcId), p = progressOf(ctx, q); return { name: m ? m.n : q.npcId, text: shortText(ctx, q), have: p.have, need: p.need, reward: q.reward, done: p.have >= p.need, zone: zoneName(ctx, q.zone), here: q.zone === (ctx.S.zone && ctx.S.zone.id), av: m ? ctx.avatarHTML(m, 'av sm') : '' }; });
}
function closeLog(ctx) {
  if (logEl) logEl.hidden = true;
  if (ctx.S.mode === 'questlog') ctx.setMode('play');
}

// ---------------------------------------------------------------- markers
function markerFor(ctx, npcId) {
  const q = activeOf(ctx, npcId);
  if (q) return isReady(ctx, q) ? 'done' : 'busy';
  if (offers.has(npcId)) return 'offer';
  return null;
}
const MARK = { offer: ['!', '#ffd45e'], busy: ['?', '#c9c4bb'], done: ['✓', '#6fe08a'] };

// boards of this land where a "ghost" quest (giver absent, or bird-carried) may be handed in
function boardsHere(ctx) {
  const map = ctx.S.map; if (!map || !map.objects) return [];
  return map.objects.filter(o => o.piece === 'board' && !o.ruined);
}
function boardQuests(ctx) {
  const zid = ctx.S.zone && ctx.S.zone.id;
  return sysS(ctx).active.filter(q => q.zone === zid && isReady(ctx, q) && (q.bird || !npcById(ctx, q.npcId)));
}

// ---------------------------------------------------------------- the system
export const quests = {
  id: 'quests',

  onZoneEnter(ctx) {
    openWho = null;
    if (panelEl) panelEl.hidden = true;
    if (logEl) logEl.hidden = true;
    if (ctx.S.mode === 'quest' || ctx.S.mode === 'questlog') ctx.setMode('play');
    if (!closers) registerClosers(ctx);
    try { sysS(ctx); generate(ctx); } catch (e) { console.error('quests generate', e); offers = new Map(); }
    // the wood counter for chop quests must not jump because of what you already carried
    const st = sysS(ctx);
    for (const q of st.active) if (q.type === 'chop') q.last = ctx.bag.count('wood');
    exposeDebug(ctx);
  },

  onZoneLeave(ctx) {
    offers = new Map();
    openWho = null;
    if (panelEl) panelEl.hidden = true;
    if (logEl) logEl.hidden = true;
    if (ctx.S.mode === 'quest' || ctx.S.mode === 'questlog') ctx.setMode('play');
  },

  update(dt, ctx) {
    bob += dt;
    if (!ctx.S.save || !ctx.S.map) return;
    let st; try { st = sysS(ctx); } catch (e) { return; }
    let dirty = false;
    const zid = ctx.S.zone && ctx.S.zone.id;
    for (const q of st.active) {
      if (q.type === 'chop') {                      // count wood gained since you accepted, spending never sets you back
        const w = ctx.bag.count('wood');
        if (typeof q.last !== 'number') q.last = w;
        if (w > q.last) { q.gain = (q.gain || 0) + (w - q.last); dirty = true; }
        q.last = w;
      } else if (q.type === 'friend' && !q.ok) {
        if (ctx.S.save.met.includes(q.friendId)) { q.ok = true; dirty = true; ctx.sfx('coin'); }
      } else if (q.type === 'helpDistrict' && !q.ok) {
        if (zid === q.zone && q.plot >= 0 && districtSafe(ctx, q.plot).ruined === 0) { q.ok = true; dirty = true; ctx.sfx('coin'); }
      }
    }
    if (dirty) ctx.persist();
    if (openWho && ctx.S.mode !== 'quest') openWho = null;
  },

  // Only claim the prompt when there is something to do: accept a request, or hand one in.
  near(ctx) {
    if (ctx.S.mode !== 'play' || !ctx.S.map) return null;
    const t = L(ctx), p = ctx.S.player, met = ctx.S.save.met;
    // The "thing" here is a person you are standing next to, so the candidate sits at the contact point
    // between the two of you (half way). A notice board covers 40 px of yard; a face-to-face request is
    // the tighter interaction and should win when you are actually touching the artist.
    const contact = n => ({ x: (n.x + p.x) / 2, y: (n.y + p.y) / 2 });
    let best = null, bd = Infinity;
    for (const n of ctx.S.npcs) {
      if (!n.m) continue;
      const d = Math.hypot(n.x - p.x, n.y - p.y);
      if (d > REACH || d >= bd) continue;
      const q = activeOf(ctx, n.m.id);
      if (q) {
        if (!isReady(ctx, q)) continue;                          // let the normal talk dialog win
        bd = d; best = { label: t.handIn, ...contact(n), limit: REACH, priority: true, data: { act: 'hand', npcId: n.m.id } };
        continue;
      }
      if (!offers.has(n.m.id)) continue;
      if (!met.includes(n.m.id)) continue;                        // meet them the normal way first
      if (sysS(ctx).active.length >= MAX_ACTIVE) continue;
      bd = d; best = { label: t.accept, ...contact(n), limit: REACH, priority: true, data: { act: 'offer', npcId: n.m.id } };
    }
    if (best) return best;
    // fallback: the giver is not walking here today (or a bird carried word) → any notice board of this land
    const bq = boardQuests(ctx); if (!bq.length) return null;
    const boards = boardsHere(ctx);
    for (const o of boards) {
      const d0 = ctx.O[o.orig || o.type] || ctx.O[o.type]; if (!d0) continue;
      const x = o.x * TILE + d0.fw * 8, y = (o.y + d0.fh) * TILE;
      const d = Math.hypot(x - p.x, y - p.y);
      if (d > BOARD_REACH || d >= bd) continue;   // walk right up to the board to send a finished delivery
      bd = d; best = { label: t.handBoard, x: (x + p.x) / 2, y: (y + p.y) / 2, limit: BOARD_REACH, priority: true, data: { act: 'hand', npcId: bq[0].npcId } };
    }
    return best;
  },

  interact(ctx, cand) {
    const d = cand && cand.data; if (!d) return;
    if (d.act === 'offer') { openOffer(ctx, d.npcId); return; }
    if (d.act === 'hand') { const q = activeOf(ctx, d.npcId); if (q) handIn(ctx, q); }
  },

  key(code, ctx) {
    if (code !== 'KeyQ') return false;
    if (!ctx.S.save || !ctx.S.map) return false;
    if (ctx.S.mode === 'questlog') { closeLog(ctx); return true; }
    if (ctx.S.mode !== 'play') return false;
    openLog(ctx);
    return true;
  },

  hudLines(ctx) {
    try { const n = sysS(ctx).active.length; return n ? ['📜 ' + n] : []; } catch (e) { return []; }
  },

  // "!" / "?" / "✓" bobbing over the artists, and over a notice board when the giver is away
  drawUI(ug, ctx, cx, cy, scale) {
    if (!ctx.S.map || ctx.S.mode === 'title') return;
    const fs = Math.max(10, scale * 3), up = fs + 4 + 10;
    const W = ug.canvas.width, H = ug.canvas.height;
    ug.save();
    ug.font = `bold ${Math.max(13, scale * 4)}px "Segoe UI",system-ui,sans-serif`;
    ug.textAlign = 'center'; ug.textBaseline = 'middle';
    const glyph = (sx, sy, ch, col) => {
      if (sx < -60 || sx > W + 60 || sy < -40 || sy > H + 40) return;
      const r = Math.max(7, scale * 3);
      ug.fillStyle = 'rgba(13,11,20,.66)';
      ug.beginPath(); ug.arc(sx, sy, r, 0, 7); ug.fill();
      ug.strokeStyle = col; ug.lineWidth = Math.max(1, scale / 2); ug.stroke();
      ug.fillStyle = col; ug.fillText(ch, sx, sy + 1);
    };
    const dy = Math.round(Math.sin(bob * 3) * scale * 1.2);
    for (const n of ctx.S.npcs) {
      if (!n.m) continue;
      const k = markerFor(ctx, n.m.id); if (!k) continue;
      const sx = Math.round((n.x - cx) * scale);
      const sy = Math.round((n.y - 20 - cy) * scale) - up + dy;
      glyph(sx, sy, MARK[k][0], MARK[k][1]);
    }
    if (boardQuests(ctx).length) {
      for (const o of boardsHere(ctx)) {
        const d0 = ctx.O[o.orig || o.type] || ctx.O[o.type]; if (!d0) continue;
        const sx = Math.round((o.x * TILE + d0.fw * 8 - cx) * scale);
        const sy = Math.round((o.y * TILE - 8 - cy) * scale) + dy;
        glyph(sx, sy, MARK.done[0], MARK.done[1]);
      }
    }
    ug.restore();
  }
};

// ---------------------------------------------------------------- test hooks (window.__quests)
function exposeDebug(ctx) {
  if (typeof window === 'undefined') return;
  window.__quests = {
    list: () => {
      const st = sysS(ctx);
      return {
        done: st.done || 0,
        declined: st.declined.slice(),
        offers: [...offers.entries()].map(([id, q]) => ({ id, name: (memberOf(ctx, id) || {}).n, type: q.type, item: q.item, n: q.n, reward: q.reward, text: requestText(ctx, q) })),
        active: st.active.map(q => { const p = progressOf(ctx, q); return { npcId: q.npcId, name: (memberOf(ctx, q.npcId) || {}).n, zone: q.zone, type: q.type, item: q.item || q.kind, n: q.n, reward: q.reward, bird: !!q.bird, have: p.have, need: p.need, ready: p.have >= p.need, short: shortText(ctx, q) }; })
      };
    },
    // force a quest for one NPC (accepts it straight away) — used by the headless tests
    give: (npcId, type) => {
      const npc = npcById(ctx, npcId) || ctx.S.npcs[0]; if (!npc) return null;
      const id = npc.m.id;
      if (activeOf(ctx, id)) return 'already active';
      const rng = ctx.rngFrom(ctx.hashStr(id + ':' + Date.now()));
      let q = null, tries = 0;
      do { q = makeQuest(ctx, npc, rng, ctx.S.npcs.filter(n => n.m && !n.m.guide)); tries++; } while (type && q && q.type !== type && tries < 60);
      if (!q) return null;
      offers.set(id, q);
      acceptOffer(ctx, id);
      return id;
    },
    offer: (npcId, type) => {                       // put an offer on someone without accepting it
      const npc = npcById(ctx, npcId) || ctx.S.npcs[0]; if (!npc) return null;
      const rng = ctx.rngFrom(ctx.hashStr(npc.m.id + ':o:' + Date.now()));
      let q = null, tries = 0;
      do { q = makeQuest(ctx, npc, rng, ctx.S.npcs.filter(n => n.m && !n.m.guide)); tries++; } while (type && q && q.type !== type && tries < 60);
      if (!q) return null;
      offers.set(npc.m.id, q); return npc.m.id;
    },
    regen: () => { generate(ctx); return offers.size; }
  };
}
