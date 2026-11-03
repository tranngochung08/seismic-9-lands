// lyron_finale.js — plan-33 mục 9: PLOT TWIST LYRON (anh chốt 2026-10-14). Hồi kết sau trùm 6 (Ngô Công Lôi Thần, id 'bakunawa').
//  · Móc: bakunawa.js gọi ctx.lyronFinale.start(ctx, { x, y, first, delegate }) khi rết chết. Trả true = hệ này lo phần còn lại.
//    delegate: true → bakunawa KHÔNG phát thưởng lần đầu của nó; hệ này gọi ctx.bkFirstReward(ctx) đúng 1 lần sau khi hạ Lyron
//    (thiếu hàm đó → tự phát bản dự phòng: sách bậc 8 + thành tựu 'bakunawa'). Chưa nối móc → hệ này tự phát hiện save.sys.bakunawa.wins tăng ở sky_bakunawa.
//  · Vùng riêng 'sky_lyron' (đăng ký vào ZONES lúc nạp module, không sửa world.js): sân trời không sàn (map.air → aircombat.js), xác rết teo giữa sân.
//  · Màn 1 TIẾT LỘ (khung phim + chân dung cận cảnh PixelLab) → Màn A ROCKY BỊ KHỐNG CHẾ: Rocky Tối Thượng (rtt_* — PixelLab edit của rockysup_*)
//    chỉ mất 'máu' ở NÚT KHĂN (đánh từ sau lưng hoặc lúc nút khăn rực sáng); đánh vào thân → Rocky chỉ khựng. Mốc 75/50/25 %: ký ức + cửa sổ 'Gọi Rocky'.
//    Khăn đứt → Rocky về phe người chơi → Màn B 2 đánh 1 với Lyron (8 hướng, PixelLab v3 import từ chars/lyron2): Quất Khăn, Vạn Túc Trồi (chân rết),
//    Lôi Rết (sét của xác rết), Lướt Khăn, tuyệt chiêu Vạn Túc Lôi Trận (30 % và 12 %). Hạ → Lyron hoá đá, chìm vào mây, khăn bay về → thưởng + màn kết.
//  · Lưu save.sys.lyron = { stage: null|'reveal'|'fightA'|'fightB'|'done', wins, tries, prevCmd, bkPending, rewarded }. Ngất / rời sân giữa chừng →
//    Lyron chờ ở Cổng Trời (trời M9): nói chuyện hoặc vào cổng → quay lại đúng màn đang dở. Save cũ đã hạ trùm 6 → Lyron cũng chờ ở đó.
import { easyHp } from './diff.js';   /* plan-44 C2: Độ khó Dễ — máu ×0,6 */
import { ART } from '../art.js';
import { ZONES, makeMap } from '../world.js';
import { T } from '../gfx.js';
import * as LV from './petlv.js';
import { bossCam, bossCamReset, bossBarBox } from './bosscam.js';
import { sheet as bSheet, drawAt as bDraw, frameAt as bFrame } from './beamfx.js';
import { AIR_LIFT } from './aircombat.js';
import { KR, tentDrawable as krTent } from './kraken.js';   /* xúc tu Kraken (tiếng vọng trùm) — chỉ dùng hàm vẽ, không sửa kraken.js */
import { pet as PET_SYS } from './pet.js';
{ const orig = PET_SYS.hudLines; if (orig && !orig.__ly) { const w = function (ctx) { const h = ctx && ctx.S && ctx.S.save && ctx.S.save.sys && ctx.S.save.sys.lyron; if (h && h.hidCmd && ctx.S.zone && /^mind_/.test(ctx.S.zone.id)) { const vi = ctx.lang() === 'vi'; return [vi ? '🪨 Rocky · bị khăn đỏ khống chế' : '🪨 Rocky · controlled by the red scarf']; } return orig.call(this, ctx); }; w.__ly = true; PET_SYS.hudLines = w; } }   /* chip HUD: không hiện 'ở ổ' khi Rocky bị giấu tạm trong Màn A */
import { gatePos, fogTint, mixHex, drawPlayer as skyDrawPlayer, copterAt, topOf as skyTopOf } from './sky.js';

const TS = 16, TAU = Math.PI * 2;
const ZID = 'sky_lyron';

/* ---------------- vùng riêng: sân trời không sàn ---------------- */
function buildSkyLyron() {
  const W = 52, H = 44, CX = 26, CY = 21;
  const m = makeMap(W, H, T.CHASM); m.solid.fill(0);
  const cx = CX * 16 + 8, cy = CY * 16 + 8;
  m.air = { cx, cy, rx: 300, ry: 250, below: 'm9', retreatTo: 'sky_m9', retreatEntry: 'gate', portal: { x: cx, y: cy + 238 } };
  m.lyCenter = { x: cx, y: cy };
  m.entries = { default: { x: CX, y: CY + 7 }, gate: { x: CX, y: CY + 12 } }; m.reserved.push(m.entries.default);
  m.npcArea = { x: CX - 6, y: CY - 6, w: 12, h: 12 }; m.theme = { tier: 0 }; m.tier = 0;
  return m;
}
if (!ZONES[ZID]) ZONES[ZID] = { id: ZID, lv: -2, order: 9.8, hidden: true, rift: true, skyArena: true, name: { en: 'Above the Storm · Lyron', vi: 'Trên Bão Mây · Lyron' }, tremor: 0, build: buildSkyLyron,
  systems: ['hero', 'monsters', 'knock', 'aircombat', 'lyronFinale', 'drops', 'vfx', 'pet', 'photo'], tint: 'rgba(40,10,40,.14)', vignette: true,
  flavor: { en: ['The storm has gone quiet. Someone is standing on the centipede.'], vi: ['Bão mây im bặt. Có ai đó đang đứng trên xác con rết.'] } };

/* ---------------- chữ ---------------- */
const STR = {
  vi: {
    me: 'Bạn', ly: 'Lyron', rk: 'Rocky', nar: '',
    beat: 'Mũ trùm của Ngô Công nứt toác… bên trong có ai đó.',
    rv: [
      ['ly', 'p_smirk', 'Bất ngờ chứ? Gương mặt trong mũ trùm ấy… là mình.'],
      ['me', null, 'Lyron?! Cậu bị hoá đá, bị nhốt trong lồng dưới hang ổ Kraken… bọn mình đã lặn qua bốn tầng nước để cứu cậu!'],
      ['ly', 'p_smirk', 'Kraken nghe lời mình. Lớp đá ấy mình tự khoác lên. Cái lồng trong hang ổ cũng do mình dựng — khoá nằm ở phía trong mà. Một vở kịch nhỏ — để cậu có lý do lên đường.'],
      ['ly', 'p_smirk', 'Rồi cậu đi khắp chín vùng. Và Rocky lớn lên. Từng bước, đúng như mình tính.'],
      ['ly', 'p_smirk', 'Hắc Rocky? Bản sao đầu tiên của mình. Thất bại — nó thiếu đúng một thứ mình không chế tạo được: một người bạn.'],
      ['ly', 'p_rage', 'Sáu trùm ở Vết Nứt Magnitude là sáu cái LÒ. Mỗi lần Rocky hạ một con, nó nuốt thêm một phần sức mạnh. Con rết này là lò cuối — mình phải chui vào trong nó để tự tay canh lửa.'],
      ['ly', 'p_rage', 'Nhìn xem, nó teo lại rồi. Mình đã rút hết. Giờ Rocky đã chín: ROCKY TỐI THƯỢNG.'],
      ['ly', 'p_smirk', 'Còn chiếc khăn đỏ mình quàng cho nó từ ngày đầu tiên… chưa bao giờ là quà.'],
    ],
    bind: [
      ['me', null, 'ROCKY!'],
      ['rk', 'p_rocky', '…GRRRAAAH!'],
      ['ly', 'p_smirk', 'Rocky, dọn dẹp giúp mình.'],
    ],
    resumeA: [['ly', 'p_smirk', 'Quay lại rồi à? Rocky vẫn là của mình. Khăn vẫn còn chặt lắm.']],
    resumeB: [['ly', 'p_rage', 'Cậu với cục đá đó… vẫn còn đứng được à? Lần này mình không nương tay.']],
    fightA: 'ROCKY TỐI THƯỢNG — đừng làm Rocky đau: chém vào NÚT KHĂN!', knotTip: 'Đánh vào thân, Rocky chỉ khựng lại. Đứng SAU LƯNG Rocky hoặc chờ lúc NÚT KHĂN rực sáng!',
    knotHit: 'Nút khăn!', bindName: 'Khăn Khống Chế', rkName: 'Rocky Tối Thượng', burst: 'Rocky Tối Thượng BÙNG NỔ!', burstEnd: 'Rocky hụt hơi — nút khăn lộ ra!',
    ha8: 'Rocky-ha bậc 8!', dash: 'Lướt Siêu Cấp!',
    recallHint: 'Đừng đánh Rocky — tìm lại ký ức của hai người: 4 vật sáng trên 4 đảo (đứng yên cạnh vật 1,5 giây)', recallLbl: n => `💗 Nhớ lại ký ức (${n}/4) — đứng yên`, recallCut: 'Bị cắt ngang — đứng yên cạnh vật sáng để nhớ lại', recallNeedGround: 'Phải đứng trên đảo mới nhớ lại được',
    hesitate: 'Rocky khựng lại, ôm đầu…', calm: 'Rocky đứng yên… lại gần ÔM Rocky (E / A)', hug: '🤗 Ôm Rocky',
    mem: ['Ngày đầu tiên — Rocky bé xíu trên chiếc bè rách buồm.', 'Những đêm chèo bè qua sóng lớn, cười như điên.', 'Lần đầu Rocky-ha — cả hai đều ngã ngửa.', 'Đêm lửa trại ở làng — hai đứa ngồi cạnh nhau, chẳng cần nói gì.'],
    call: n => `💗 Gọi Rocky (${n}/3)`, callGo: 'Rocky đang giằng co! Lại gần bấm E / A để GỌI ROCKY!', callOk: 'Rocky nhận ra bạn — sợi khăn lỏng ra!', callLate: 'Lyron giật khăn — Rocky lại bị khống chế.',
    lyCallOk: 'Lyron: “Không! Nhìn mình đây, Rocky!”',
    brk: [
      ['nar', null, 'Nút khăn đỏ đứt phựt.'],
      ['rk', 'p_rockyok', 'Ro… Rocky!! (Rocky ôm chầm lấy bạn)'],
      ['ly', 'p_rage', 'Không thể nào… cái khăn đó là sợi dây duy nhất…'],
      ['me', null, 'Cậu tính sai một chỗ thôi, Lyron. Rocky chưa bao giờ là của cậu.'],
      ['ly', 'p_rage', 'Vậy thì mình lấy lại bằng tay! Sức mạnh của con rết vẫn ở trong mình!'],
    ],
    fightB: 'LYRON — 2 đánh 1! Rocky về phe bạn.', lyName: 'Lyron', lyTitle: 'Kẻ Dựng Vở Kịch', enraged: 'Lyron nổi giận — nhanh hơn!', xform1: 'Lyron: “Trong đầu ta, ta là kẻ mạnh nhất.”', xform2: 'LYRON SIÊU CẤP!!',
    sk: { arc: 'Xích Lôi!', whip: 'Quất Khăn!', legs: 'Vạn Túc Trồi!', bolt: 'Lôi Rết!', dash: 'Lướt Khăn!', ult: 'TUYỆT CHIÊU — VẠN TÚC LÔI TRẬN!' }, tired: 'Lyron kiệt sức — đánh ngay!',
    end: [
      ['ly', 'p_beaten', 'Mình chỉ muốn… một người bạn mạnh nhất. Hoá ra thứ làm Rocky mạnh nhất lại không nằm trong lò nào.'],
      ['nar', null, 'Sức mạnh sáu lò dội ngược. Lớp đá từng là vở kịch — giờ là thật.'],
      ['ly', 'p_beaten', 'Lần này… không ai cần lặn xuống hang ổ cứu mình đâu.'],
      ['me', null, 'Ngủ đi, Lyron. Khi nào cậu muốn làm bạn thật sự… bọn mình vẫn ở đây.'],
      ['nar', null, 'Pho tượng chìm vào biển mây. Chiếc khăn đỏ bay về tay bạn.'],
    ],
    won: 'LYRON BỊ PHONG ẤN!', title: 'Danh hiệu: Người Giữ Rocky', scarfBack: '🧣 Khăn đỏ đã về tay bạn',
    endTitle: 'Vở kịch đã hạ màn', endBody: 'Lyron dựng cả một hành trình chỉ để lấy Rocky. Nhưng sức mạnh của Rocky không đến từ sáu cái lò —\nnó đến từ những ngày hai đứa đi cùng nhau.\nPho tượng Lyron ngủ dưới biển mây M9. Cảm ơn bạn đã chơi tới đây.',
    again: 'Ký ức trận cuối — Lyron tan vào mây (đánh lại được, thưởng giảm).',
    waitLbl: '⚡ Lyron đang chờ…', waitAgain: 'Đối mặt Lyron', statue: '🗿 Tượng Lyron — Ôn lại trận cuối', gone: 'Lyron đã bị phong ấn.',
    clue: '🧣 Một mẩu khăn đỏ mắc ở đây…', clueSay: ['Mẩu len đỏ, đan tay — giống hệt khăn của Lyron. Sao nó lại ở trong khe nứt này?', 'Lại một mẩu khăn đỏ. Ai đó đã tới đây TRƯỚC bạn.', 'Mẩu khăn đỏ còn ấm, như vừa có người đứng đây.', 'Khăn đỏ… vướng ngay cạnh lối vào. Như thể ai đó cố ý để lại.', 'Mẩu khăn đỏ thứ năm. Bạn bắt đầu thấy lạnh gáy.'],
    nearGate: 'Lyron đứng chờ cạnh Cổng Trời…', skip: 'Esc: bỏ qua · E: tiếp',
  },
  en: {
    me: 'You', ly: 'Lyron', rk: 'Rocky', nar: '',
    beat: "The Centipede's hood splits open… someone is inside.",
    rv: [
      ['ly', 'p_smirk', 'Surprised? The face inside that hood… was mine.'],
      ['me', null, 'Lyron?! You were turned to stone, locked in a cage in the Kraken\'s lair… we dived through four layers of sea to save you!'],
      ['ly', 'p_smirk', 'The Kraken listens to me. I put that stone on myself. I built the cage in its lair too — the lock was on the inside. A little play — so you would have a reason to set out.'],
      ['ly', 'p_smirk', 'Then you crossed nine lands. And Rocky grew. Step by step, exactly as planned.'],
      ['ly', 'p_smirk', "Shadow Rocky? My first copy. A failure — it lacked the one thing I could not build: a friend."],
      ['ly', 'p_rage', 'The six bosses of the Magnitude Rift were six FURNACES. Every time Rocky beat one, it swallowed a piece of that power. This centipede was the last one — I had to climb inside to tend the fire myself.'],
      ['ly', 'p_rage', "Look, it has shrivelled. I drained it all. Now Rocky is ready: ULTIMATE ROCKY."],
      ['ly', 'p_smirk', 'And the red scarf I tied on it on the very first day… was never a gift.'],
    ],
    bind: [
      ['me', null, 'ROCKY!'],
      ['rk', 'p_rocky', '…GRRRAAAH!'],
      ['ly', 'p_smirk', 'Rocky, tidy up for me.'],
    ],
    resumeA: [['ly', 'p_smirk', 'Back again? Rocky is still mine. The scarf is still tight.']],
    resumeB: [['ly', 'p_rage', 'You and that lump of rock… still standing? This time I hold nothing back.']],
    fightA: "ULTIMATE ROCKY — don't hurt Rocky: strike the SCARF KNOT!", knotTip: 'Hitting the body only makes Rocky flinch. Get BEHIND Rocky, or wait for the SCARF KNOT to flare!',
    knotHit: 'Scarf knot!', bindName: 'Binding Scarf', rkName: 'Ultimate Rocky', burst: 'Ultimate Rocky BURSTS!', burstEnd: 'Rocky is winded — the knot is exposed!',
    ha8: 'Tier-8 Rocky-ha!', dash: 'Super Dash!',
    recallHint: "Don't fight Rocky — find your shared memories: 4 glowing things on 4 islands (stand still next to one for 1.5 s)", recallLbl: n => `💗 Remember (${n}/4) — stand still`, recallCut: 'Interrupted — stand still by the glowing thing to remember', recallNeedGround: 'You must stand on an island to remember',
    hesitate: 'Rocky freezes, clutching his head…', calm: 'Rocky stands still… go and HUG Rocky (E / A)', hug: '🤗 Hug Rocky',
    mem: ['Day one — tiny Rocky on a raft with a torn sail.', 'Nights paddling through big waves, laughing like idiots.', 'The first Rocky-ha — you both fell flat on your backs.', 'A campfire night in the village — sitting side by side, no words needed.'],
    call: n => `💗 Call Rocky (${n}/3)`, callGo: 'Rocky is struggling! Get close and press E / A to CALL ROCKY!', callOk: 'Rocky recognises you — the scarf loosens!', callLate: 'Lyron yanks the scarf — Rocky is bound again.',
    lyCallOk: 'Lyron: "No! Look at me, Rocky!"',
    brk: [
      ['nar', null, 'The red scarf knot snaps.'],
      ['rk', 'p_rockyok', 'Ro… Rocky!! (Rocky throws its arms around you)'],
      ['ly', 'p_rage', 'Impossible… that scarf was the only leash…'],
      ['me', null, 'You got one thing wrong, Lyron. Rocky was never yours.'],
      ['ly', 'p_rage', "Then I'll take it back with my own hands! The centipede's power is still in me!"],
    ],
    fightB: 'LYRON — two on one! Rocky is on your side.', lyName: 'Lyron', lyTitle: 'The Playwright', enraged: 'Lyron is furious — faster!', xform1: 'Lyron: “In my own mind, I am the strongest.”', xform2: 'SUPER LYRON!!',
    sk: { arc: 'Chain Lightning!', whip: 'Scarf Lash!', legs: 'Thousand Legs Rise!', bolt: 'Centipede Thunder!', dash: 'Scarf Dash!', ult: 'ULTIMATE — THOUSAND-LEG THUNDER ARRAY!' }, tired: 'Lyron is spent — strike now!',
    end: [
      ['ly', 'p_beaten', 'All I wanted… was the strongest friend. Turns out what made Rocky strongest was never in any furnace.'],
      ['nar', null, 'The power of six furnaces rebounds. The stone that was once a play — is real now.'],
      ['ly', 'p_beaten', 'This time… nobody needs to dive into a lair to save me.'],
      ['me', null, 'Sleep, Lyron. Whenever you want to be a real friend… we will still be here.'],
      ['nar', null, 'The statue sinks into the sea of clouds. The red scarf drifts back into your hands.'],
    ],
    won: 'LYRON IS SEALED!', title: 'Title: Rocky\'s Keeper', scarfBack: '🧣 The red scarf is yours again',
    endTitle: 'The play is over', endBody: "Lyron staged an entire journey just to take Rocky. But Rocky's strength never came from six furnaces —\nit came from the days the two of you spent together.\nLyron's statue sleeps beneath the clouds of M9. Thank you for playing this far.",
    again: 'A memory of the last fight — Lyron fades into the clouds (rematch any time, smaller reward).',
    waitLbl: '⚡ Lyron is waiting…', waitAgain: 'Face Lyron', statue: '🗿 Lyron statue — relive the last fight', gone: 'Lyron has been sealed.',
    clue: '🧣 A scrap of red scarf is caught here…', clueSay: ["Red hand-knitted wool — just like Lyron's scarf. Why is it inside this rift?", 'Another scrap of red scarf. Someone came here BEFORE you.', 'The red scrap is still warm, as if someone just stood here.', 'Red scarf… snagged right by the entrance. As if left on purpose.', 'The fifth scrap of red scarf. A chill runs down your neck.'],
    nearGate: 'Lyron is waiting by the Sky Gate…', skip: 'Esc: skip · E: next',
  },
};
const L = ctx => STR[ctx.lang() === 'vi' ? 'vi' : 'en'];

/* ---------------- tiện ích ---------------- */
const zid = ctx => (ctx.S.zone && ctx.S.zone.id) || '';
const inArena = ctx => zid(ctx) === ZID || !!MIND_Z_ID[zid(ctx)];   /* sân Lyron = trời (tiết lộ / kết) + 2 tâm trí (2 trận) */
const inSky = ctx => zid(ctx) === ZID;
const MIND_Z_ID = { mind_rocky: 1, mind_lyron: 1 };
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const sv = ctx => { const s = ctx.S.save; s.sys ||= {}; const h = (s.sys.lyron ||= {}); h.wins ||= 0; h.tries ||= 0; if (h.stage === undefined) h.stage = null; if (h.rewarded && h.stage && h.stage !== 'done') h.stage = 'done'; return h; };   /* plan-43 C1: đã xong kết (rewarded) thì stage luôn 'done' — save cũ bị lần ôn lại ghi đè 'fightB' / 'ending' tự sửa */
const bkWins = ctx => (((ctx.S.save.sys || {}).bakunawa || {}).wins || 0);
const pending = ctx => { const st = sv(ctx).stage; return st === 'meet' || st === 'reveal' || st === 'fightA' || st === 'fightB' || st === 'ending'; };   /* 2026-10-15: + 'meet' (Lyron đợi ở cầu tàu) */
const waiting = ctx => pending(ctx) || (sv(ctx).stage == null && bkWins(ctx) > 0);   /* save cũ đã hạ trùm 6 trước khi có twist */
const rk = ctx => (ctx.rocky && ctx.rocky.pet && ctx.rocky.pet()) || (((ctx.S.save.sys || {}).pet || {}).pet) || null;
const rkLv = ctx => { const p = rk(ctx); return p ? LV.levelFromXp(p.xp || 0).lv : 1; };
const rkEnt = ctx => (ctx.rocky && ctx.rocky.ent && ctx.rocky.ent()) || null;
const rkPos = ctx => (ctx.rocky && ctx.rocky.pos && ctx.rocky.pos()) || null;
const segDist = (p, a, b) => { const dx = b.x - a.x, dy = b.y - a.y, l2 = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2)); return Math.hypot(p.x - (a.x + dx * t), p.y - (a.y + dy * t)); };
const lift = ctx => (ctx.S.map && ctx.S.map.air ? AIR_LIFT : ctx.S.map && ctx.S.map.mind ? 3 : 10);   /* tâm trí: đứng trên nền (Lyron / Rocky Tối Thượng chỉ lơ lửng nhẹ) */

const IM = {};
function img(src) { if (!IM[src]) { const i = new Image(); i.src = 'assets/px/' + src; IM[src] = i; if (i.decode) i.decode().then(() => { i.__dec = true; }).catch(() => { i.__dec = true; }); else i.__dec = true; } const i = IM[src]; return i.complete && i.naturalWidth && i.__dec !== false && (i.__dec || !i.decode) ? i : null; }   /* giải mã xong mới vẽ (tránh giật lần vẽ đầu) */
const cre = name => { const vp = ART.packs && ART.packs.village, c = vp && vp.creatures && vp.creatures[name]; return c && c.length ? c : null; };
const VX = n => ART.vfx && ART.vfx[n];
let LJ = null, LDIR = 'boss/lyron/';   /* 2026-10-14 anh chê Lyron bé: bản TO PixelLab v3 (boss/lyron_big, ≈1,7× người chơi, vẽ đúng cỡ) — thiếu thì dùng bản thường */
function loadLJ(dir, then) { return fetch('assets/px/' + dir + 'l.json').then(r => (r.ok ? r.json() : null)).then(j => { if (j) { then(j); for (const k in j.clips) img(dir + 'l_' + k + '.png'); return true; } return false; }).catch(() => false); }
let CJ = null, CJ_TRY = false; const CDIR = 'boss/lyron_chad2/',   /* 2026-10-14 anh: Siêu Cấp chỉ to bằng Rocky Siêu Cấp (~50 px ảnh) — bản to cũ ở boss/lyron_chad */ CHAD_READY = true;   /* Lyron Siêu Cấp (chad sigma) — PixelLab v3; chỉ nạp khi ảnh đã đóng gói (CHAD_READY) và chỉ lúc vào Màn B */
function loadChad() { if (CJ_TRY || !CHAD_READY || typeof fetch === 'undefined') return; CJ_TRY = true; loadLJ(CDIR, j => { CJ = j; setTimeout(prewarmRims, 800); }); }
if (typeof fetch !== 'undefined') loadLJ('boss/lyron_big/', j => { LJ = j; LDIR = 'boss/lyron_big/'; }).then(ok => { if (!ok) loadLJ('boss/lyron/', j => { LJ = j; LDIR = 'boss/lyron/'; }); });
['ui/lyron/legs_c.png', 'ui/lyron/leg.png', 'ui/lyron/knot2.png', 'ui/lyron/scarf.png', 'ui/hacrocky/bossbar.png', 'boss/lyron/corpse/deadhead_south-east.png'].forEach(img);
/* viền 1 điểm ảnh (ảnh gốc 2×) quanh ảnh PixelLab — đọc rõ trên nền trời; làm 1 lần / ảnh (canvas mới, không __hi → vẽ 9 tham số) */
function outlineCanvas(c, col) {
  const W = c.width, H = c.height, g = c.getContext('2d'), d = g.getImageData(0, 0, W, H), a = d.data, o = new Uint8ClampedArray(a), [r, gg, b, al] = col;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = (y * W + x) * 4; if (a[i + 3] > 40) continue;
    if ((x > 0 && a[i - 1] > 120) || (x < W - 1 && a[i + 7] > 120) || (y > 0 && a[i - W * 4 + 3] > 120) || (y < H - 1 && a[i + W * 4 + 3] > 120)) { o[i] = r; o[i + 1] = gg; o[i + 2] = b; o[i + 3] = al; } }
  g.putImageData(new ImageData(o, W, H), 0, 0); return c;
}
const RIM = {}, RIM_LY = [255, 226, 150, 235], RIM_RK = [196, 30, 56, 255], RIM_BLACK = [235, 50, 80, 255];   /* Hắc Hóa: viền đỏ thẫm để nổi trên sàn tối */
function prewarmRims() {   /* dựng sẵn viền cho mọi sheet của trận (lúc rảnh, từng ảnh một) — không để getImageData rơi vào khung đang đánh */
  const jobs = []; for (const [J, D, col] of [[CJ, CDIR, RIM_LY], [BJ, BDIR, RIM_BLACK]]) if (J) for (const k in J.clips) jobs.push([D + 'l_' + k + '.png', col]);
  const step = () => { const j = jobs.shift(); if (!j) return; if (!rimmed(j[0], j[1])) jobs.push(j); if (jobs.length) (typeof requestIdleCallback !== 'undefined' ? requestIdleCallback(step, { timeout: 400 }) : setTimeout(step, 60)); };
  if (jobs.length) setTimeout(step, 200);
}
function rimmed(src, col) {
  const key = src + '|' + col.join(','); if (RIM[key]) return RIM[key]; const im = img(src); if (!im || typeof document === 'undefined') return null;
  const c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight; c.getContext('2d', { willReadFrequently: true }).drawImage(im, 0, 0, c.width, c.height);   /* canvas nháp đọc pixel: không kéo canvas sprite về CPU */
  const _r0 = performance.now(); RIM[key] = outlineCanvas(c, col); PERF.b.push('rim ' + src + ' ' + Math.round(performance.now() - _r0)); return RIM[key];
}

/* ---------------- trạng thái ---------------- */
const ST = { hz: [], tents: [], callout: null, t: 0, phase: null, cs: null, ly: null, rkp: null, lyMo: null, rkMo: null, tele: [], legs: [], fx: [], banner: null, lb: 0, mem: null, call: null, stats: {}, log: [], cd: {}, seq: [], skN: {}, statue: null, corpse: true, endT: 0, waitLy: null, fast: false };
function reset() {
  Object.assign(ST, { props: [], clones: [], replays: [], beams: [], delayed: [], pages: [], voids: [], grandOn: false, grandDone: false, desp: null, finT: false, hz: [], tents: [], callout: null, comboK: null, stunP: 0, slowOn: false, t: 0, phase: null, cs: null, ly: null, rkp: null, lyMo: null, rkMo: null, tele: [], legs: [], fx: [], banner: null, lb: 0, mem: null, call: null,
    stats: { knot: 0, body: 0, calls: 0, callOk: 0, memN: 0, hitP: 0, flingP: 0, flingR: 0, rkHits: 0, lyDmgRk: 0 }, log: [], cd: {}, seq: [], skN: {}, statue: null, corpse: true, endT: 0, memAt: [0.75, 0.5, 0.25], ult: [0.3, 0.12], actMax: {}, waitLy: null, beatT: 0, replay: false, bolts: [], arcs: [], lastUse: {}, pull: null, arrive: null, bright: 0, brightGo: false, memLit: [], crumble: 0, chunks: [], scarfFly: null, statueSunk: false });
}
reset();
const log = s => { ST.log.push(Math.round(ST.t * 10) / 10 + ' ' + s); if (ST.log.length > 60) ST.log.shift(); };
function fx(name, x, y, opt = {}) { const s = opt.sheet || VX(name); if (!s) return false; ST.fx.push({ s, x, y, t: 0, dur: opt.dur || (s.loop ? 1.2 : s.n / (s.fps || 12)), top: !!opt.top, alpha: opt.alpha || 1, ang: opt.ang || 0, ky: opt.ky }); return true; }
function drawSheet(g, s, f, x, y, alpha = 1, ang = 0) {
  const hi = s.img.__hi ? 1 : 2, ax = s.ax != null ? s.ax : s.w / 2, ay = s.ay != null ? s.ay : s.h;
  g.save(); g.imageSmoothingEnabled = false; g.globalAlpha = alpha; g.translate(Math.round(x), Math.round(y)); if (ang) g.rotate(ang);
  g.drawImage(s.img, f * s.w * hi, 0, s.w * hi, s.h * hi, -Math.round(ax), -Math.round(ay), s.w, s.h); g.restore();
}
/* Rocky-ha bị khống chế: sheet Rocky-ha PixelLab (vfx_workbench) đổi màu theo độ sáng → đỏ thẫm … lõi trắng hồng (1 lần; canvas giữ __hi như beamfx.darkSheet) */
const RECOL = {};
const PAL_C = [[0.2, [44, 4, 18]], [0.38, [100, 8, 32]], [0.55, [168, 20, 50]], [0.7, [222, 52, 80]], [0.85, [250, 140, 160]], [2, [255, 232, 238]]];   /* đỏ thẫm (bớt hồng) */
const PAL_V = [[0.22, [48, 18, 96]], [0.42, [104, 52, 190]], [0.62, [168, 128, 250]], [0.8, [218, 200, 255]], [2, [255, 250, 255]]];   /* tím-trắng: sức mạnh rết / Lyron */
function recolSheet(name, pal, tag) {   /* sheet vfx PixelLab đổi màu theo độ sáng từng điểm ảnh (1 lần; canvas giữ __hi như beamfx.darkSheet) */
  const key = name + '|' + tag; if (RECOL[key]) return RECOL[key]; const s = VX(name); if (!s || !s.img || typeof document === 'undefined') return null;
  const src = s.img, c = document.createElement('canvas'); c.width = src.width; c.height = src.height; const g = c.getContext('2d'); g.drawImage(src, 0, 0, src.width, src.height);
  const d = g.getImageData(0, 0, c.width, c.height), a = d.data;
  for (let i = 0; i < a.length; i += 4) { if (!a[i + 3]) continue; const L = (0.3 * a[i] + 0.55 * a[i + 1] + 0.15 * a[i + 2]) / 255, col = pal.find(p => L < p[0])[1]; a[i] = col[0]; a[i + 1] = col[1]; a[i + 2] = col[2]; }
  g.putImageData(d, 0, 0); c.__hi = src.__hi; RECOL[key] = { ...s, img: c }; return RECOL[key];
}
const crimSheet = name => recolSheet(name, PAL_C, 'c');
const PAL_R = [[0.36, [120, 14, 36]], [0.6, [204, 34, 56]], [0.92, [255, 104, 92]], [2, [255, 236, 214]]];   /* plan-45 ND1: rk_ha2_l (4 bậc sáng 0,26/0,48/0,85/1) -> đỏ thẫm, đỏ, đỏ cam, lõi kem; không còn ống hồng bóng */
const redHa = name => recolSheet(name, PAL_R, 'r');
const violSheet = name => recolSheet(name, PAL_V, 'v');

/* ---------------- sát thương người chơi / Rocky ---------------- */
function hurtPlayer(ctx, frac, from, react = 'stagger', power = 1) {
  const h = ctx.hero, p = ctx.S.player; if (!h || h.fainted) return false;
  if (ST.phase === 'A') frac *= 0.5;   /* trong tâm trí Rocky: Rocky vẫn nương tay */
  else if (ST.phase === 'B') frac *= 0.86 * (ST.lyMo && ST.lyMo.form === 'black' ? 1.1 : 1);   /* Hắc Hóa: đòn mạnh hơn */   /* 2026-10-14: Màn B dễ thở hơn cho người chơi thật */
  const ok = h.hit(Math.max(1, Math.round(h.max * frac))); if (!ok) return false; ST.stats.hitP++;
  if (react === 'fly') ST.stats.flingP++;
  if (ctx.knockPlayer && react) { const d = Math.hypot(p.x - from.x, p.y - from.y) || 1; ctx.knockPlayer({ type: react, power, dir: { x: (p.x - from.x) / d, y: (p.y - from.y) / d }, src: from }); }
  return true;
}
/* 2026-10-15 máu linh thú: đòn trúng chỗ linh thú đang ra trận (mọi con trong đội) → trừ máu (frac như Rocky; kind 'fly' = hất bay) */
function ltHitAt(ctx, test, frac, from, kind) { let n = 0; for (const q of (ctx.ltPets ? ctx.ltPets() : [])) if (test(q) && ctx.ltHit(frac * 1.1, from, kind, q.id)) n++; return n > 0; }
function hurtRocky(ctx, frac, from, kind) {   /* Màn B: đòn Lyron trúng cả Rocky — đòn mạnh hất bay như người chơi */
  const pos = rkPos(ctx), pt = rk(ctx); if (!pos || !pt || !ctx.rocky.hitBy) return false;
  const mx = LV.maxHpOf(rkLv(ctx)), d = Math.hypot(pos.x - from.x, pos.y - from.y) || 1, raw = Math.max(0, Math.min(Math.round(mx * frac * 0.85), Math.floor((pt.hp ?? mx) - mx * 0.12)));   /* trận trùm: Rocky giữ ≥ 12 % máu (không gục nghỉ dài) */
  ctx.rocky.hitBy(raw, ST.lyMo, (pos.x - from.x) / d, (pos.y - from.y) / d, kind === 'fly' ? 70 : 40, kind === 'fly' ? 'fly' : undefined);
  if (kind === 'fly') ST.stats.flingR++; ST.stats.rkHits++; return true;
}
function hitBoth(ctx, test, frac, from, kind) {   /* test(pos) → trúng? — áp cho người chơi + Rocky (Màn B) */
  let n = 0; const p = ctx.S.player; if (test(p)) { if (hurtPlayer(ctx, frac, from, kind)) n++; }
  if (ST.phase === 'B') { const r = rkPos(ctx); if (r && test(r)) { if (hurtRocky(ctx, frac, from, kind)) n++; } } ltHitAt(ctx, test, frac, from, kind === 'fly' || kind === 'launch' ? 'fly' : 'hit');
  return n;
}

/* ---------------- hình Lyron (sheet PixelLab l_<clip>.png, 8 hướng: tây = lật đông) ---------------- */
const D8 = ['east', 'south-east', 'south', 'south-west', 'west', 'north-west', 'north', 'north-east'];
const dirOf = (dx, dy) => D8[((Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) % 8) + 8) % 8];
const FALL = { 'south-east': ['south', 'east'], 'north-east': ['north', 'east'], east: ['south-east', 'south'], north: ['north-east', 'south'], south: ['south-east'] };
const CMAP = { whip: 'lasso', cast: 'flex', slam: 'pound', sk_combo: 'punch', sk_quake: 'flex', sk_beam: 'punch', sk_summon: 'flex', sk_snap: 'stare', sk_blur: 'punch', sk_whistle: 'stare', sk_mirror: 'flex', sk_ora: 'punch', sk_upper: 'punch', sk_floor: 'pound', sk_floor2: 'sk_floor', sk_hold: 'pound', sk_blast: 'flex', sk_conduct: 'flex', sk_bite: 'stare' };   /* clip kỹ năng chưa có → clip gần nghĩa */
function lyFrame(ly) {
  const dn = ly.dir || 'south', mirror = dn.includes('west'), base = dn.replace('west', 'east');
  if (ly.form === 'black' && BJ) { const C0 = ly.clip && BJ.clips[ly.clip] ? ly.clip : CMAP[ly.clip] && BJ.clips[CMAP[ly.clip]] ? CMAP[ly.clip] : 'idle', C = BJ.clips[C0];
    if (C) { let r = C.rows.indexOf(base); if (r < 0) for (const f of (FALL[base] || [])) { r = C.rows.indexOf(f); if (r >= 0) break; } if (r < 0) r = 0; const im = rimmed(BDIR + 'l_' + C0 + '.png', RIM_BLACK);
      if (im) { const f = ly.prog != null ? Math.min(C.n - 1, Math.floor(ly.prog * C.n)) : Math.floor((ly.ft || 0) * (C0 === 'idle' ? 7 : 10)) % C.n; return { im, sx: f * BJ.cw, sy: r * BJ.ch, w: BJ.cw, h: BJ.ch, mirror: mirror && C.rows[r].includes('east') }; } } }
  if ((ly.form === 'chad' || ly.form === 'black') && CJ) {   /* Lyron Siêu Cấp: sheet riêng; clip thiếu → idle */
    let clip = ly.clip || 'idle'; if (!CJ.clips[clip]) clip = CMAP[clip] && CJ.clips[CMAP[clip]] ? CMAP[clip] : 'idle'; const C = CJ.clips[clip];
    if (C) { let r = C.rows.indexOf(base); if (r < 0) for (const f of (FALL[base] || [])) { r = C.rows.indexOf(f); if (r >= 0) break; } if (r < 0) r = 0;
      const im = rimmed(CDIR + 'l_' + clip + '.png', RIM_LY);
      if (im) { const f = ly.prog != null ? Math.min(C.n - 1, Math.floor(ly.prog * C.n)) : Math.floor((ly.ft || 0) * (clip === 'idle' ? 7 : 10)) % C.n; return { im, sx: f * CJ.cw, sy: r * CJ.ch, w: CJ.cw, h: CJ.ch, mirror: mirror && C.rows[r].includes('east') }; } }
  }
  const clip = ly.clip || 'idle', C = LJ && LJ.clips[clip];
  if (C) {
    let r = C.rows.indexOf(base); if (r < 0) for (const f of (FALL[base] || [])) { r = C.rows.indexOf(f); if (r >= 0) break; } if (r < 0) r = 0;
    const im = rimmed(LDIR + 'l_' + clip + '.png', RIM_LY);
    if (im) { const f = ly.prog != null ? Math.min(C.n - 1, Math.floor(ly.prog * C.n)) : Math.floor((ly.ft || 0) * (clip === 'idle' ? 7 : 10)) % C.n; return { im, sx: f * LJ.cw, sy: r * LJ.ch, w: LJ.cw, h: LJ.ch, mirror: mirror && C.rows[r].includes('east') }; }
  }
  const im = img(LDIR + 'rot_' + dn + '.png') || img('boss/lyron/rot_' + dn + '.png');
  return im ? { im, sx: 0, sy: 0, w: im.naturalWidth, h: im.naturalHeight, feet: im.naturalHeight - 3, mirror: false } : null;
}
let STONE = null;
function stoneImg() {   /* tượng đá: khung cuối clip quỵ gối (PixelLab) chuyển sang tông đá xám (1 lần) */
  if (STONE) return STONE; const D = LJ && LJ.clips.defeat, im = D ? img(LDIR + 'l_defeat.png') : null; if (!im) return null;
  const c = document.createElement('canvas'); c.width = LJ.cw; c.height = LJ.ch; const g = c.getContext('2d'); g.drawImage(im, (D.n - 1) * LJ.cw, 0, LJ.cw, LJ.ch, 0, 0, LJ.cw, LJ.ch);
  const d = g.getImageData(0, 0, c.width, c.height), a = d.data;
  for (let i = 0; i < a.length; i += 4) { if (!a[i + 3]) continue; const l = (a[i] * 0.3 + a[i + 1] * 0.55 + a[i + 2] * 0.15) / 255, v = Math.round(80 + l * 130); a[i] = v + 4; a[i + 1] = v; a[i + 2] = v + 10; }
  g.putImageData(d, 0, 0); STONE = outlineCanvas(c, [40, 36, 52, 255]); return STONE;
}
const FOOT = new WeakMap(); let FOOTC = null;
function footRow(F) {   /* 2026-10-15 (anh: chân + bóng boss tách khỏi sàn): hàng pixel ĐẶC thấp nhất của khung (khung clip có chừa trống phía dưới) — đo 1 lần / khung, canvas nháp willReadFrequently */
  if (!F || !F.im || typeof document === 'undefined') return null; let M = FOOT.get(F.im); if (!M) { M = new Map(); FOOT.set(F.im, M); } const k = F.sx + ',' + F.sy; if (M.has(k)) return M.get(k);
  if (!FOOTC) { FOOTC = document.createElement('canvas'); FOOTC.width = 8; FOOTC.height = 8; } const w = Math.max(1, F.w | 0), h = Math.max(1, F.h | 0); if (FOOTC.width < w) FOOTC.width = w; if (FOOTC.height < h) FOOTC.height = h; const q = FOOTC.getContext('2d', { willReadFrequently: true }); q.clearRect(0, 0, w, h);
  let r = null; try { q.drawImage(F.im, F.sx, F.sy, w, h, 0, 0, w, h); const a = q.getImageData(0, 0, w, h).data; for (let yy = h - 1; yy >= 0 && r == null; yy--) for (let xx = 0; xx < w; xx++) if (a[(yy * w + xx) * 4 + 3] > 40) { r = yy + 1; break; } } catch (e) { r = null; }
  M.set(k, r); return r;
}
function drawLy(g, ly, x, y, L0) {   /* x, y: chân (toạ độ màn hình) */
  if (!ly || ly.alpha === 0) return;
  const big = ly.form === 'chad' || ly.form === 'black', lf = Math.round((ly.lift ?? (big && L0 <= 3 ? 0 : L0)) + (ly.hop || 0) + (big ? 0 : Math.sin((ly.ft || 0) * 2.2) * 1.5));   /* 2026-10-15: dạng Chad / Hắc Hoá ĐI BỘ trên sàn (tâm trí, mặt đất) → không nâng; Lyron gốc vẫn lơ lửng nhẹ */
  g.save(); g.fillStyle = 'rgba(20,0,30,.35)'; g.beginPath(); g.ellipse(Math.round(x), Math.round(y) + 1, 9, 3, 0, 0, 7); g.fill();
  g.globalAlpha = ly.alpha ?? 1; g.imageSmoothingEnabled = false;
  if (ly.stone) { const s = stoneImg(); if (s) g.drawImage(s, 0, 0, s.width, s.height, Math.round(x - s.width / 4), Math.round(y - lf - (s.height - 2) / 2), s.width / 2, s.height / 2); g.restore(); return; }
  const F = lyFrame(ly); if (!F) { g.restore(); return; }
  if (ly.flash > 0) g.filter = 'brightness(2.2)';
  g.translate(Math.round(x), Math.round(y - lf)); if (F.mirror) g.scale(-1, 1);
  const feet = F.feet != null ? F.feet : (footRow(F) ?? F.h - 2);   /* chân = hàng pixel thật thấp nhất, không phải đáy khung */
  g.drawImage(F.im, F.sx, F.sy, F.w, F.h, -Math.round(F.w / 4), -Math.round(feet / 2), F.w / 2, F.h / 2);
  g.restore();
}
const lyTop = () => (ST.lyMo && ST.lyMo.form === 'chad' && CJ ? Math.round((CJ.ch - 10) / 2) : LJ ? Math.round((LJ.ch - 10) / 2) : 26);   /* chiều cao hình Lyron (logic) — nhãn tên / camera */

/* ---------------- hình Rocky Tối Thượng (rtt_* — PixelLab edit rockysup_*) ---------------- */
const RKC = {};
const RK_RAMP = [[30, 6, 14], [70, 12, 30], [118, 22, 44], [168, 40, 60], [214, 78, 88], [244, 140, 140]];   /* đỏ thẫm 6 bậc: bóng tối → đỏ giữa → điểm sáng hồng */
function rkCanvas(name, i) {   /* khung rtt_* (PixelLab edit) → BẢN ĐỒ MÀU theo độ sáng: kéo giãn dải sáng của chính khung (giữ cơ bắp / mặt) rồi tô ramp đỏ thẫm; đỏ tươi bão hoà (mắt rực, khăn) giữ riêng — làm 1 lần */
  const key = name + '_' + i; if (RKC[key]) return RKC[key]; const im = img('zones/village/creatures/' + key + '.png'); if (!im || typeof document === 'undefined') return null;
  const W = im.naturalWidth, H = im.naturalHeight, c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d'); g.drawImage(im, 0, 0, W, H);
  const d = g.getImageData(0, 0, W, H), a = d.data, Ls = [];
  for (let k = 0; k < a.length; k += 4) if (a[k + 3]) Ls.push((0.3 * a[k] + 0.55 * a[k + 1] + 0.15 * a[k + 2]) / 255);
  Ls.sort((x, y) => x - y); const lo = Ls[Math.floor(Ls.length * 0.03)] || 0, hi = Ls[Math.floor(Ls.length * 0.97)] || 1;
  for (let k = 0; k < a.length; k += 4) { if (!a[k + 3]) continue; const r = a[k], gg = a[k + 1], b = a[k + 2], mx = Math.max(r, gg, b), mn = Math.min(r, gg, b), sat = mx ? (mx - mn) / mx : 0;
    if (r > 170 && sat > 0.6 && r > gg * 1.8 && r > b * 1.6) { a[k] = 255; a[k + 1] = Math.min(255, gg * 1.1); a[k + 2] = Math.min(255, b * 1.1); continue; }   /* mắt rực / khăn đỏ */
    const t = Math.max(0, Math.min(1, ((0.3 * r + 0.55 * gg + 0.15 * b) / 255 - lo) / (hi - lo + 1e-6))) * (RK_RAMP.length - 1), j = Math.min(RK_RAMP.length - 2, Math.floor(t)), f = t - j, A0 = RK_RAMP[j], B0 = RK_RAMP[j + 1];
    a[k] = A0[0] + (B0[0] - A0[0]) * f; a[k + 1] = A0[1] + (B0[1] - A0[1]) * f; a[k + 2] = A0[2] + (B0[2] - A0[2]) * f; }
  g.putImageData(d, 0, 0); RKC[key] = c; return c;
}
function rkFrameTT(r) {   /* → { c, flip } khung Rocky Tối Thượng đã xử lý (null: Rocky đã tự do / chưa nạp) */
  if (r.free) return null; const dk = r.face === 'side' ? 'e' : r.face === 'dn' ? 'n' : 's', flip = r.face === 'side' && r.dir < 0;
  const pick = k => { const one = k === 'transform' || k === 'knockdown', nm = one ? 'rtt_' + k + '_s' : (cre('rtt_' + k + '_' + dk) ? 'rtt_' + k + '_' + dk : 'rtt_' + k + '_s'), cr = cre(nm); return cr ? { nm, n: cr.length, one } : null; };
  let P = null, i = 0;
  if (r.anim) { P = pick(r.anim.k); if (P) { const p = r.anim.p != null ? r.anim.p : 1 - Math.max(0, r.anim.t) / r.anim.T; i = Math.max(0, Math.min(P.n - 1, Math.floor(p * P.n))); } }
  if (!P) { P = pick('hover'); if (!P) return null; i = Math.floor((r.ft || 0) * 8) % P.n; }
  const c = rkCanvas(P.nm, i); return c ? { c, flip: flip && !P.one } : null;
}
function rkFrame(r) {   /* Rocky đã tự do (r.free): khung Siêu Cấp gốc */
  const dk = r.face === 'side' ? 'e' : r.face === 'dn' ? 'n' : 's', flip = r.face === 'side' && r.dir < 0 ? 1 : 0, pre = 'rockysup';
  const get = k => cre(pre + '_' + k + '_' + dk) || cre(pre + '_' + k + '_s');
  if (r.anim) { const one = r.anim.k === 'transform' || r.anim.k === 'knockdown', c = one ? cre(pre + '_' + r.anim.k + '_s') : get(r.anim.k);
    if (c) { const p = r.anim.p != null ? r.anim.p : 1 - Math.max(0, r.anim.t) / r.anim.T; const i = Math.min(c.length - 1, Math.floor(p * c.length)); return c[i][one ? 0 : flip] || c[i][0]; } }
  const c = get('hover'); if (!c) return null; const i = Math.floor((r.ft || 0) * 8) % c.length; return c[i][flip] || c[i][0];
}
function faceVec(r) { return r.face === 'side' ? { x: r.dir < 0 ? -1 : 1, y: 0 } : r.face === 'dn' ? { x: 0, y: -1 } : { x: 0, y: 1 }; }
function faceTo(r, x, y) { const dx = x - r.x, dy = y - r.y; if (Math.abs(dx) > Math.abs(dy) * 1.1) { r.face = 'side'; r.dir = dx < 0 ? -1 : 1; } else r.face = dy < 0 ? 'dn' : 'ds'; }
function knotPos(r) {   /* nút khăn sau gáy: phía ngược hướng mặt */
  const f = faceVec(r); return { x: r.x - f.x * 4, y: r.y - 19 - (f.y < 0 ? -2 : f.y > 0 ? 2 : 0) };
}
function drawRk(g, r, x, y, L0, ctx) {
  let TT = rkFrameTT(r); if (TT) r._tt = TT; else if (!r.free && r._tt) TT = r._tt;   /* khung TT chưa nạp → giữ khung TT trước (không loé Rocky cam) */
  const im = TT ? null : rkFrame(r), lf = Math.round(L0 + Math.sin((r.ft || 0) * 3) * 1.5), sx = r.shake ? Math.round(Math.sin(ST.t * 50) * r.shake) : 0;
  g.save(); g.imageSmoothingEnabled = false; g.fillStyle = 'rgba(30,0,20,.4)'; g.beginPath(); g.ellipse(Math.round(x), Math.round(y) + 1, 9, 3, 0, 0, 7); g.fill();
  if (r.flash > 0) g.filter = 'brightness(1.8)';
  if (TT) { const w = TT.c.width / 2, h = TT.c.height / 2; g.save(); g.translate(Math.round(x) + sx, Math.round(y + 1 - lf)); if (TT.flip) g.scale(-1, 1); g.drawImage(TT.c, 0, 0, TT.c.width, TT.c.height, -Math.round(w / 2), -h, w, h); g.restore(); }
  else if (im) g.drawImage(im, Math.round(x - im.width / 2) + sx, Math.round(y - im.height + 1 - lf));
  else { g.fillStyle = '#5a1030'; g.fillRect(Math.round(x - 8), Math.round(y - 18 - lf), 16, 18); }
  g.filter = 'none';
  if (!r.free && ctx && exposed(r)) {   /* nút khăn PixelLab (knot2) CHỈ hiện lúc LỘ (điểm yếu); vừa lộ thì loé 0,35 s rồi đứng yên */
    const k = img('ui/lyron/knot2.png'), kp = knotPos(r), kx = Math.round(kp.x - (r.x - x)) + sx, ky = Math.round(kp.y - (r.y - y) - lf + 2);
    if (k) { const w = k.naturalWidth / 2, h = k.naturalHeight / 2; g.drawImage(k, 0, 0, k.naturalWidth, k.naturalHeight, Math.round(kx - w / 2), Math.round(ky - h / 2), w, h);
      const since = ST.t - (r.expAt ?? -9); if (since < 0.35) { g.globalCompositeOperation = 'lighter'; g.globalAlpha = 1 - since / 0.35; g.drawImage(k, 0, 0, k.naturalWidth, k.naturalHeight, Math.round(kx - w / 2), Math.round(ky - h / 2), w, h); } }
  }
  g.restore();
}
const exposed = r => !!r && ((r.expT || 0) > 0 || (r.windT || 0) > 0 || !!r.callWin);

/* ---------------- cảnh phim (khung phim + chân dung cận cảnh) ---------------- */
function cine(ctx, steps, onEnd) { ST.cs = { steps, i: -1, t: 0, ch: 0, onEnd }; ctx.setMode('lycine'); nextStep(ctx); }
function nextStep(ctx) {
  const c = ST.cs; if (!c) return; c.i++; c.t = 0; c.ch = 0;
  if (c.i >= c.steps.length) { ST.cs = null; if (ctx.S.mode === 'lycine') ctx.setMode('play'); if (c.onEnd) c.onEnd(); return; }
  const s = c.steps[c.i]; if (s.act) { try { s.act(ctx); } catch (e) { console.error('lyron act', e); } }
  if (!s.text && !s.wait) nextStep(ctx);
}
function press(ctx) {
  const c = ST.cs; if (!c) { if (ST.mem) { if (ST.mem.t > 0.6) ST.mem.t = ST.mem.T; } return; }
  const s = c.steps[c.i]; if (!s || !s.text) return;
  if (c.ch < s.text.length) { c.ch = s.text.length; return; }
  if (c.t > 0.08) nextStep(ctx);
}
function skipAll(ctx) {   /* Esc: chạy nhanh mọi bước còn lại (act là gán trạng thái) */
  const c = ST.cs; if (!c) return; let guard = 0;
  while (ST.cs === c && guard++ < 200) nextStep(ctx);
}
const lines = (arr, t) => arr.map(([who, port, text]) => ({ who, port, text, name: t[who] }));
/* 2026-10-15 anh: gặp Lyron RIÊNG ở cầu tàu đêm lồng đèn (không cắt cảnh ngay khi hạ Rết) — thoại tiết lộ dùng lại rv, đổi bối cảnh */
Object.assign(STR.vi, { meetTalk: '🏮 Nói chuyện với Lyron', meetArrive: 'Đêm lồng đèn… cuối cầu tàu có ai đó đứng một mình, quay lưng ra biển.', meetHint: 'Về Làng — có ai đó đang đợi ở cầu tàu.',
  rvPier: [['ly', 'p_smirk', 'Cậu tới rồi. Đêm lồng đèn đẹp nhỉ… Chính chỗ này, ngày đầu tiên, Kraken "bắt" mình đi.'], ['me', null, 'Lyron… Trong mũ trùm con rết, mình nhặt được một sợi lụa đỏ — giống hệt khăn của cậu.'], ['ly', 'p_smirk', 'Tinh mắt đấy. Gương mặt trong mũ trùm ấy… là mình. Mình chui ra trước khi cậu kịp nhìn, rồi về đây đợi cậu.'], ['me', null, 'Cậu bị hoá đá, bị nhốt trong lồng dưới hang ổ Kraken… bọn mình đã lặn qua bốn tầng nước để cứu cậu!'],
    ...STR.vi.rv.slice(2, 6), ['ly', 'p_rage', 'Con rết cạn kiệt rồi — mình đã rút hết. Giờ Rocky đã chín: ROCKY TỐI THƯỢNG.'], STR.vi.rv[7]] });
Object.assign(STR.en, { meetTalk: '🏮 Talk to Lyron', meetArrive: 'Lantern night… someone stands alone at the end of the pier, back to the sea.', meetHint: 'Back to the Village — someone is waiting on the pier.',
  rvPier: [['ly', 'p_smirk', 'You came. Lovely lantern night… Right here, on the very first day, the Kraken "took" me.'], ['me', null, "Lyron… Inside the centipede's hood I found a strand of red silk — just like your scarf."], ['ly', 'p_smirk', 'Sharp eyes. The face inside that hood… was mine. I slipped out before you could look, and came here to wait for you.'], ['me', null, "You were turned to stone, locked in a cage in the Kraken's lair… we dived through four layers of sea to save you!"],
    ...STR.en.rv.slice(2, 6), ['ly', 'p_rage', 'The centipede is spent — I drained it all. Now Rocky is ready: ULTIMATE ROCKY.'], STR.en.rv[7]] });
/* 2026-10-15 anh: KẾT cũng ở cầu tàu (bắt đầu và kết thúc cùng một chỗ) — tượng đứng lại cuối cầu tàu, không chìm vào mây */
STR.vi.endPier = [...STR.vi.end.slice(0, 4), ['nar', null, 'Pho tượng đứng lại cuối cầu tàu, giữa những chiếc lồng đèn. Chiếc khăn đỏ bay về tay bạn.']]; STR.vi.endBody = STR.vi.endBody.replace('Pho tượng Lyron ngủ dưới biển mây M9.', 'Pho tượng Lyron đứng lại cuối cầu tàu — nơi mọi chuyện bắt đầu.');
STR.en.endPier = [...STR.en.end.slice(0, 4), ['nar', null, 'The statue stays at the end of the pier, among the lanterns. The red scarf drifts back into your hands.']]; STR.en.endBody = STR.en.endBody.replace("Lyron's statue sleeps beneath the clouds of M9.", "Lyron's statue stands at the end of the pier — where it all began.");
function csTick(ctx, dt) {
  const c = ST.cs; if (!c) return; c.t += dt; const s = c.steps[c.i]; if (!s) return;
  if (s.text) { c.ch = Math.min(s.text.length, c.ch + dt * 95);   /* chữ chạy nhanh, chạm là hiện hết */ if (ST.fast && c.t > 0.3) { c.ch = s.text.length; nextStep(ctx); } }
  else if (s.wait && c.t >= s.wait) nextStep(ctx);
}


/* ---------------- nền sân Lyron: bình minh sau bão (gradient + nhiều lớp mây PixelLab thị sai) + XÁC RẾT CHÚA nằm sâu dưới lớp mây ----------------
   2026-10-14 anh chê 'quá xấu': nền tím đục phẳng, xác rết cũ không khớp trùm mới. Xác ráp từ chính ảnh PixelLab của trùm 6 (boss/bakunawa/c9: kseg/ksegb/ktail 8 hướng)
   + đầu chết (PixelLab edit của khead: mũ trùm nứt, TRỐNG — boss/lyron/corpse/deadhead_south-east.png), tối màu 1 lần, vẽ ở lớp sâu k = 0,55 (trôi chậm hơn camera) dưới mây. */
const DARKC = {};
function darkImg(src, mul) {
  const key = src + mul.join(','); if (DARKC[key]) return DARKC[key]; const im = img(src); if (!im || typeof document === 'undefined') return null;
  const c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight; const g = c.getContext('2d'); g.drawImage(im, 0, 0, c.width, c.height);
  const d = g.getImageData(0, 0, c.width, c.height), a = d.data, hz = mul[3] || 0, H = [118, 100, 178]; for (let i = 0; i < a.length; i += 4) if (a[i + 3]) { for (let k = 0; k < 3; k++) a[i + k] = a[i + k] * mul[k] * (1 - hz) + H[k] * hz; }   /* tối + phủ sương xa (hz) */
  g.putImageData(d, 0, 0); DARKC[key] = c; return c;
}
const C9 = 'boss/bakunawa/c9s/', CORPSE_K = 0.42, CORPSE_MUL = [0.9, 0.85, 1, 0.45], CORPSE_N = 46, CORPSE_GAP = 7;   /* 2026-10-15 anh: rết dài hơn (trùm 6: 34 → 50 đốt) → xác 30 → 46 đốt; 30 đốt phía đầu giữ nguyên chỗ cũ */   /* 2026-10-14: theo bản rết đã thu nhỏ của trùm 6 (c9s: đốt top-down xoay theo thân, 30 đốt cách 7 px) — đọc lúc chạy nên ảnh mới tự cập nhật */
let CORPSE = null;
let CCK = null;
function corpseCache(pts) {   /* vẽ 30 đốt xoay + đầu chết vào canvas 2× một lần (khi đủ ảnh) */
  if (CCK) return CCK; const segs = []; for (let i = 0; i < CORPSE_N; i++) { const im = darkImg(C9 + (i === 0 ? 'ttail' : i % 2 ? 'tsegb' : 'tseg') + '.png', CORPSE_MUL); if (!im) return null; segs.push(im); }
  const hd = darkImg('boss/lyron/corpse/deadhead_s_south-east.png', CORPSE_MUL); if (!hd || typeof document === 'undefined') return null;
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const q of pts) { x0 = Math.min(x0, q.x); y0 = Math.min(y0, q.y); x1 = Math.max(x1, q.x); y1 = Math.max(y1, q.y); }
  x0 = Math.floor(x0 - 90); y0 = Math.floor(y0 - 90); x1 = Math.ceil(x1 + 90); y1 = Math.ceil(y1 + 90);   /* đầu chết mới (136 px) không bị cắt */
  const c = document.createElement('canvas'); c.width = (x1 - x0) * 2; c.height = (y1 - y0) * 2; const g = c.getContext('2d'); g.setTransform(2, 0, 0, 2, -x0 * 2, -y0 * 2); g.imageSmoothingEnabled = false;
  const ax = 0, ay = 0;
    for (let i = 0; i < CORPSE_N; i++) { const q = pts[i], im = segs[i]; if (!im) continue; const w = im.width / 2, h = im.height / 2;
      g.save(); g.translate(ax + Math.round(q.x), ay + Math.round(q.y)); g.rotate(q.a + Math.PI / 2); g.drawImage(im, 0, 0, im.width, im.height, -Math.round(w / 2), -Math.round(h / 2), w, h); g.restore(); }
    const hp = pts[CORPSE_N];
    { const w = hd.width / 2, h = hd.height / 2; g.drawImage(hd, 0, 0, hd.width, hd.height, ax + Math.round(hp.x) - Math.round(w / 2) + 6, ay + Math.round(hp.y) - Math.round(h / 2) + 4, w, h); }

  CCK = { c, x0, y0 }; PERF.b.push('corpse'); return CCK;
}
function corpsePts() {   /* thân CORPSE_N đốt vắt đường cong lỏng (toạ độ tương đối so với điểm neo), đầu cuối nghiêng xuống-phải */
  if (CORPSE) return CORPSE; const pts = []; let x = -120, y = 0, a = -0.25;
  for (let i = 0; i <= 30; i++) { pts.push({ x, y, a }); a += 0.11 * Math.sin(i * 0.45) + 0.02; x += Math.cos(a) * CORPSE_GAP; y += Math.sin(a) * CORPSE_GAP; }   /* 30 đốt phía đầu giữ y bản cũ */
  x = -120; y = 0; a = -0.25; for (let j = 1; j <= CORPSE_N - 30; j++) { a -= 0.11 * Math.sin(-j * 0.45) + 0.02; x -= Math.cos(a) * CORPSE_GAP; y -= Math.sin(a) * CORPSE_GAP; pts.unshift({ x, y, a }); }   /* 2026-10-15: phần thân thêm nối dài về phía đuôi (cùng đường cong chạy ngược) */
  for (let i = 0; i <= CORPSE_N; i++) { const p0 = pts[Math.max(0, i - 1)], p1 = pts[Math.min(CORPSE_N, i + 1)]; pts[i].a = Math.atan2(p1.y - p0.y, p1.x - p0.x); }
  CORPSE = pts; return pts;
}
/* 2026-10-14 anh: bỏ mây hoạt hình — dùng SƯƠNG MỀM như trời (sky.js fogTint: khối sương PixelLab zones/sky/fog mờ Gauss, tô màu 1 lần), nhiều lớp trôi lệch nhau */
const LY_SKY = '#8f80c8';
let GFXLOW = false;
function fogLayerLy(g, VW, VH, col, alpha, n, f, drift, sc, seed, cx, cy, t) {   /* như sky.js fogLayer (không export) — cùng kỹ thuật */
  if (GFXLOW) n = Math.max(2, Math.ceil(n / 2));   /* bậc đồ hoạ thấp: nửa số khối sương */
  const FW = 760, FH = 560, sm = g.imageSmoothingEnabled; g.imageSmoothingEnabled = true; g.globalAlpha = alpha;
  for (let i = 0; i < n; i++) { const im = fogTint((i + seed) % 4, col); if (!im) continue; const w = im.width * sc, h = im.height * sc, hx = ((i + seed) * 977) % FW, hy = ((i + seed) * 613 + i * 131) % FH;
    const x = ((hx - cx * f + t * drift * (1 + (i % 3) * 0.3)) % FW + FW) % FW - w * 0.6, y = ((hy - cy * f) % FH + FH) % FH - h * 0.6;
    for (let rx = x; rx < VW + w; rx += FW) for (let ry = y; ry < VH + h; ry += FH) g.drawImage(im, rx, ry, w, h); }
  g.globalAlpha = 1; g.imageSmoothingEnabled = sm;
}
/* TƯỜNG SƯƠNG ở biên sân: nhiều vòng khối sương dày dần ra ngoài (không vạch tối cong); loé sáng bên trong CHỈ khi có sự kiện (ST.wallGlow) */
function fogWall(g, ctx, cx, cy, VW, VH, t) {
  const A = ctx.S.map.air; if (!A) return; const sm = g.imageSmoothingEnabled; g.imageSmoothingEnabled = true;
  const rings = GFXLOW ? [[1.0, 0.45, 'w', 0.66], [1.18, 0.9, 'w', 0.64]] : [[0.97, 0.36, 'w', 0.66], [1.06, 0.55, 'k', 0.26], [1.14, 0.85, 'w', 0.58], [1.24, 1, 'w', 0.7]];   /* 4 vòng (trước 7) — nhẹ cho điện thoại */
  for (const [ri, [k, al, tone, mk]] of rings.entries()) {
    const col = mixHex(LY_SKY, tone, mk), N = 30 + ri * 4;
    for (let i = 0; i < N; i++) {
      const a = i / N * TAU + ri * 0.37 + Math.sin(t * 0.05 + i) * 0.02, x = A.cx + Math.cos(a) * A.rx * k - cx, y = A.cy + Math.sin(a) * A.ry * k - cy;
      const im = fogTint((i + ri) % 4, col); if (!im) continue; const w = im.width * (0.8 + ri * 0.08), h = im.height * (0.7 + ri * 0.07);
      if (x < -w || x > VW + w || y < -h || y > VH + h) continue;
      g.globalAlpha = al; g.drawImage(im, x - w / 2, y - h / 2, w, h);
    }
  }
  if (ST.wallGlow > 0) { const im = fogTint(1, '#fff2c8'); if (im) { g.globalCompositeOperation = 'lighter'; g.globalAlpha = Math.min(0.5, ST.wallGlow); const a = ST.wallA || 0, x = A.cx + Math.cos(a) * A.rx * 1.08 - cx, y = A.cy + Math.sin(a) * A.ry * 1.08 - cy, w = im.width * 2, h = im.height * 1.6; g.drawImage(im, x - w / 2, y - h / 2, w, h); g.globalCompositeOperation = 'source-over'; } }
  /* ngoài vòng sương: phủ kín bằng sương đặc (giới hạn tự nhiên) */
  g.globalAlpha = 0.96; g.fillStyle = mixHex(LY_SKY, 'w', 0.68); g.beginPath(); g.rect(-4, -4, VW + 8, VH + 8); g.moveTo(Math.round(A.cx - cx + A.rx * 1.24), Math.round(A.cy - cy)); g.ellipse(Math.round(A.cx - cx), Math.round(A.cy - cy), A.rx * 1.24, A.ry * 1.24, 0, 0, TAU); g.fill('evenodd');
  g.globalAlpha = 1; g.imageSmoothingEnabled = sm;
}
function drawSkyLy(g, ctx, cx, cy) {
  const VW = ctx.VW || 480, VH = ctx.VH || 270, t = ctx.S.time, m = ctx.S.map, A = m.air, c = center(ctx);
  g.save(); g.imageSmoothingEnabled = false;
  const gr = g.createLinearGradient(0, 0, 0, VH); gr.addColorStop(0, '#6a62b4'); gr.addColorStop(0.6, LY_SKY); gr.addColorStop(1, '#cfa8cc'); g.fillStyle = gr; g.fillRect(-2, -2, VW + 4, VH + 4);
  fogLayerLy(g, VW, VH, mixHex(LY_SKY, 'k', 0.3), 0.3, 6, 0.3, 2, 1.35, 3, cx, cy, t);   /* sương sâu, tối */
  if (ST.corpse) {   /* xác rết ở lớp sâu DƯỚI sương: điểm neo trôi theo thị sai k, thân vẽ đúng cỡ ảnh (đốt c9s xoay theo hướng thân như trùm 6), đuôi trước đầu sau */
    const pts = corpsePts(), ax = Math.round((c.x - 10 - cx - VW / 2) * CORPSE_K + VW / 2), ay = Math.round((c.y + 30 - cy - VH / 2) * CORPSE_K + VH / 2);
    const cc = corpseCache(pts); if (cc) g.drawImage(cc.c, 0, 0, cc.c.width, cc.c.height, ax + cc.x0, ay + cc.y0, cc.c.width / 2, cc.c.height / 2);   /* xác dựng sẵn 1 lần (30 đốt xoay) */
  }
  fogLayerLy(g, VW, VH, mixHex(LY_SKY, 'w', 0.62), 0.62, 8, 0.6, 4, 1.5, 7, cx, cy, t);   /* màn sương sáng phủ lên xác (xác nằm DƯỚI sương) */
  fogLayerLy(g, VW, VH, mixHex(LY_SKY, 'w', 0.75), 0.32, 4, 0.85, 7, 1.7, 21, cx, cy, t);
  fogWall(g, ctx, cx, cy, VW, VH, t);
  if (A) { const pt = A.portal, pim = img('zones/sky/scout/gate_open.png'); if (pt && pim) { const w = pim.naturalWidth / 2, h = pim.naturalHeight / 2; g.imageSmoothingEnabled = false; g.drawImage(pim, 0, 0, pim.naturalWidth, pim.naturalHeight, Math.round(pt.x - w / 2 - cx), Math.round(pt.y - h - cy + 6), w, h); } }
  g.restore();
}


/* ---------------- TÂM TRÍ (plan-33 mục 17, anh 2026-10-14): chỉ con rết đánh trên trời — hai trận với Lyron diễn ra TRONG TÂM TRÍ, đi bộ trên mặt đất ----------------
   mind_rocky (Màn A): cõi mơ ấm của Rocky ghép từ mảnh ký ức chung (quảng trường làng, bè gỗ, hang trùm, bãi cát) trôi trong sương hồng; sợi khăn đỏ khổng lồ trói không gian.
   mind_lyron (Màn B): cõi lạnh của Lyron — nền đá đen phấn xanh (kế hoạch), sàn kính có bóng xúc tu Kraken, đá khắc rết; bóng ma 6 trùm / Hắc Rocky / đầu rết lơ lửng trong sương.
   Nền = bộ ô Wang 16 PixelLab (lớp dưới sương, lớp trên nền mảnh) — boss/lyron/mind/<bộ>.png (mã góc NW8 NE4 SW2 SE1); mép mảnh = rơi vào sương (ô cứng, không chết). */
const MIND_Z = { mind_rocky: 'A', mind_lyron: 'B' };
/* vòng 2 (anh: 'mảnh nền như sàn ngục'): mỗi mảnh là một NƠI riêng — đảo nổi tách rời, mặt dưới đá treo, nối bằng cầu (A: cầu sợi len đỏ · B: cầu ánh sáng xanh) */
const MSET = {   /* bộ ô Wang đã chọn sau khi so biến thể (seed) — xem DAU-NAO */
  A: { main: 'A2_plaza_s21', left: 'A2_raft_s7', right: 'A2_lair_s7', down: 'A2_beach_s7' },
  B: { main: 'B2_crack_s7', left: 'B2_glass_s7', right: 'B2_crack_s7', down: 'B2_chalk_s7', wide: 'B3_stone_s7' },   /* sân chính: đá phiến sáng, ít hoa văn (phấn bản vẽ quá rối → bỏ) */   /* đá đen nứt sáng làm đảo chính (bản vẽ phấn chỉ ở đảo nhỏ — dày đặc thì lộ lưới lặp) */
};
const FRAGS = {   /* tâm (ô, so với giữa bản đồ), bán kính (ô); mem: ký ức gắn với đảo (Màn A); deco: đồ trang trí PixelLab rải trên đảo */
  A: [{ set: MSET.A.main, x: 0, y: 0, rx: 7.4, ry: 5.3, deco: ['A_d_well', 'A_d_flowers', 'A_d_flowers', 'A_d_flowers'] },
      { set: MSET.A.left, x: -15, y: 0, rx: 4.8, ry: 3.7, mem: 0, deco: ['A_d_sail', 'A_d_buoy'] },
      { set: MSET.A.down, x: 0, y: 11, rx: 6.6, ry: 3.2, mem: 1, deco: ['A_d_shells', 'A_d_shells', 'A_d_shells'] },
      { set: MSET.A.right, x: 15, y: 0, rx: 4.8, ry: 3.7, mem: 2, deco: ['A_d_crystal', 'A_d_crystal', 'A_d_crystal'] }],
  B: [{ set: MSET.B.wide, x: 0, y: 0, rx: 31, ry: 19, pw: 4, vary: true, ov: 'B2_chalk_s7', ova: 0.16, deco: ['B_d_cracks2', 'B_d_candle', 'B_d_cracks2', 'B_d_candle', 'B_d_cracks2', 'B_d_candle', 'B_d_cracks2', 'B_d_candle'] },   /* 2026-10-14 anh: sân CỰC RỘNG liền một khối (≈ 3–4 màn) */
      { set: MSET.B.main, x: -35, y: 4, rx: 7, ry: 6, deco: ['B_d_candle'] },
      { set: MSET.B.right, x: 35, y: -3, rx: 7, ry: 6, deco: ['B_d_cracks2'] },
      { set: MSET.B.main, x: 14, y: 22, rx: 9, ry: 5, deco: ['B_d_candle'] }],   /* mảnh phụ dính liền sân chính (không cầu ánh sáng) */
};
const BRIDGES = { A: [{ a: 0, b: 1, axis: 'h' }, { a: 0, b: 3, axis: 'h' }, { a: 0, b: 2, axis: 'v' }], B: [] };
const MDIM = { A: { W: 48, H: 34, CX: 24, CY: 13 }, B: { W: 92, H: 62, CX: 46, CY: 28 } };
const hash2 = (x, y, s) => { let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0; h = (h ^ (h >>> 13)) * 1274126177 | 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967295; };
function buildMind(kind) {
  return () => {
    const { W, H, CX, CY } = MDIM[kind], m = makeMap(W, H, T.CHASM); m.solid.fill(1);
    m.mind = kind; m.lyCenter = { x: CX * TS + 8, y: CY * TS + 8 }; m.reg = new Int8Array(W * H).fill(-1);
    const F = FRAGS[kind];
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
      let best = -1, bv = 9;
      F.forEach((f, i) => { const dx = (x - CX - f.x) / f.rx, dy = (y - CY - f.y) / f.ry, pw = f.pw || 2, v = Math.pow(Math.abs(dx), pw) + Math.pow(Math.abs(dy), pw) - 0.3 * (hash2(x, y, i + 3) - 0.5); if (v < 1 && v < bv) { bv = v; best = i; } });
      if (best >= 0) m.reg[y * W + x] = best;
    }
    m.bridges = [];
    BRIDGES[kind].forEach((B, bi) => { const fa = F[B.a], fb = F[B.b], cells = [];
      if (B.axis === 'h') { const y0 = CY + Math.round(fa.y), xa = CX + Math.round(Math.min(fa.x, fb.x)), xb = CX + Math.round(Math.max(fa.x, fb.x)); for (let x = xa; x <= xb; x++) for (const y of [y0, y0 + 1]) { const k = y * W + x; if (m.reg[k] < 0) { m.reg[k] = 10 + bi; cells.push({ x, y }); } } }
      else { const x0 = CX + Math.round(fa.x), ya = CY + Math.round(Math.min(fa.y, fb.y)), yb = CY + Math.round(Math.max(fa.y, fb.y)); for (let y = ya; y <= yb; y++) for (const x of [x0, x0 + 1]) { const k = y * W + x; if (m.reg[k] < 0) { m.reg[k] = 10 + bi; cells.push({ x, y }); } } }
      m.bridges.push({ axis: B.axis, cells }); });
    const seen = new Uint8Array(W * H), q = [[CX, CY + 3]]; seen[(CY + 3) * W + CX] = 1;
    while (q.length) { const [x, y] = q.pop(); for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + a, ny = y + b, k = ny * W + nx; if (nx < 0 || ny < 0 || nx >= W || ny >= H || seen[k] || m.reg[k] < 0) continue; seen[k] = 1; q.push([nx, ny]); } }
    for (let k = 0; k < W * H; k++) { if (!seen[k]) m.reg[k] = -1; m.solid[k] = m.reg[k] < 0 ? 1 : 0; }
    m.rim = []; for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { if (m.reg[y * W + x] >= 0) continue; let near = false; for (let b = -2; b <= 2 && !near; b++) for (let a = -2; a <= 2; a++) { const nx = x + a, ny = y + b; if (nx >= 0 && ny >= 0 && nx < W && ny < H && m.reg[ny * W + nx] >= 0 && m.reg[ny * W + nx] < 10) { near = true; break; } } if (near && (x + y) % 2 === 0) m.rim.push({ x: x * TS + 8, y: y * TS + 8, j: hash2(x, y, 9) }); }
    /* mặt dưới đảo: ô đảo mà ô ngay dưới không thuộc đảo */
    m.under = []; for (let y = 0; y < H - 1; y++) for (let x = 0; x < W; x++) { const r = m.reg[y * W + x]; if (r >= 0 && r < 10 && m.reg[(y + 1) * W + x] !== r) m.under.push({ x, y, r }); }
    /* đồ trang trí: ô trong lòng đảo (cách mép ≥ 1), tránh giữa đảo chính (chỗ đánh) */
    m.deco = []; F.forEach((f, i) => { (f.deco || []).forEach((name, n) => { for (let tr = 0; tr < 40; tr++) { const a = hash2(i, n, tr + 17) * TAU, rr = (f.pw ? 0.25 + 0.6 * hash2(n, i, tr + 31) : 0.45 + 0.4 * hash2(n, i, tr + 31)), x = Math.round(CX + f.x + Math.cos(a) * f.rx * rr), y = Math.round(CY + f.y + Math.sin(a) * f.ry * rr);
      let ok = true; for (const [a2, b2] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) if (m.reg[(y + b2) * W + x + a2] !== i) ok = false; if (i === 0 && Math.abs(x - CX) < 3 && Math.abs(y - CY) < 3) ok = false; if (m.deco.some(d => Math.abs(d.tx - x) < 2 && Math.abs(d.ty - y) < 2)) ok = false;
      if (ok) { m.deco.push({ name, tx: x, ty: y, x: x * TS + 8, y: y * TS + 12 }); break; } } }); });
    m.entries = { default: { x: CX, y: CY + 3 } }; m.reserved.push(m.entries.default); m.npcArea = { x: CX - 3, y: CY - 3, w: 6, h: 6 }; m.theme = { tier: 0 }; m.tier = 0;
    return m;
  };
}
for (const [id, kind] of Object.entries(MIND_Z)) if (!ZONES[id]) ZONES[id] = { id, lv: -2, order: 9.82, hidden: true, rift: true, mindArena: true,
  name: kind === 'A' ? { en: "Rocky's Mind", vi: 'Tâm Trí Rocky' } : { en: "Lyron's Mind", vi: 'Tâm Trí Lyron' }, tremor: 0, build: buildMind(kind),
  systems: ['hero', 'monsters', 'knock', 'lyronFinale', 'drops', 'vfx', 'pet', 'photo'], tint: kind === 'A' ? 'rgba(255,190,170,.06)' : 'rgba(10,20,60,.1)', vignette: true,
  flavor: kind === 'A' ? { en: ['Everything here smells like sea salt and campfire smoke.'], vi: ['Ở đây thoảng mùi muối biển và khói lửa trại.'] } : { en: ['Cold. Every thought here is a plan.'], vi: ['Lạnh. Mỗi ý nghĩ ở đây đều là một kế hoạch.'] } };
const UIL = n => 'ui/lyron/' + n + '.png';
['A_under_b', 'B_under_d', 'A_bridge_b', 'B_bridge_c', 'A_mote', 'B_ghost_centi_c', 'B_d_paper3', 'B_d_cracks2', 'A_d_well', 'A_d_flowers', 'A_d_lantern', 'A_d_shells', 'A_d_crystal', 'A_d_buoy', 'A_d_sail', 'B_d_paper', 'B_d_paper2', 'B_d_chain', 'B_d_candle', 'B_d_cracks', 'B_ghost_centipede_a', 'B_ghost_kraken_a', 'B_ghost_rocky_a', 'thread'].forEach(n => img(UIL(n)));
Object.values(MSET).forEach(o => Object.values(o).forEach(s => img('boss/lyron/mind/' + s + '.png')));
const MPICK = { underA: 'A_under_b', underB: 'B_under_d', bridgeA: 'A_bridge_b', bridgeB: 'B_bridge_c', ghosts: ['B_ghost_centi_c', 'B_ghost_kraken_a', 'B_ghost_rocky_a'] };   /* biến thể đã chọn (xem DAU-NAO: so 2–3 bản / thứ) */
const KEYC = {};
function keyed(src) {   /* ảnh PixelLab có nền phẳng (bóng ma phấn) → bỏ nền theo màu góc ảnh, làm 1 lần */
  if (KEYC[src]) return KEYC[src]; const im = img(src); if (!im || typeof document === 'undefined') return null;
  const c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight; const g = c.getContext('2d'); g.drawImage(im, 0, 0);
  const d = g.getImageData(0, 0, c.width, c.height), a = d.data, k0 = [a[0], a[1], a[2]], hasBg = a[3] > 200;
  if (hasBg) for (let i = 0; i < a.length; i += 4) { const e = Math.abs(a[i] - k0[0]) + Math.abs(a[i + 1] - k0[1]) + Math.abs(a[i + 2] - k0[2]); if (e < 60) a[i + 3] = 0; }
  g.putImageData(d, 0, 0); KEYC[src] = c; return c;
}
function drawMind(g, ctx, cx, cy) {
  const VW = ctx.VW || 480, VH = ctx.VH || 270, t = ctx.S.time, m = ctx.S.map, A = m.mind === 'A', W = m.w, br = A ? (ST.bright || 0) : 0;
  g.save(); g.imageSmoothingEnabled = false;
  const gr = gradOf(g, A ? 'A' : 'B', VH, A);
  g.fillStyle = gr; g.fillRect(-2, -2, VW + 4, VH + 4);
  const sky = A ? '#eebfae' : MIND_SKY_B;
  fogLayerLy(g, VW, VH, mixHex(sky, A ? 'w' : 'k', A ? 0.35 : 0.35), 0.4, 6, 0.25, 2, 1.4, 3, cx, cy, t);
  if (!A) {   /* bóng ma bản vẽ kế hoạch (PixelLab, nét phấn xanh) lơ lửng xa trong sương — thị sai 0,45 */
    MPICK.ghosts.forEach((n, i) => { const im = keyed(UIL(n)); if (!im) return; const a = [-2.3, -0.7, 1.6][i], wx = m.lyCenter.x + Math.cos(a) * 860, wy = m.lyCenter.y + Math.sin(a) * 560, w = im.width / 2, h = im.height / 2;
      const X = Math.round((wx - cx - VW / 2) * 0.45 + VW / 2), Y = Math.round((wy - cy - VH / 2) * 0.45 + VH / 2 + Math.sin(t * 0.4 + i) * 3); g.globalAlpha = 0.28; g.drawImage(im, 0, 0, im.width, im.height, X - Math.round(w / 2), Y - Math.round(h / 2), w, h); g.globalAlpha = 1; });
  }
  fogLayerLy(g, VW, VH, mixHex(sky, 'w', A ? 0.6 : 0.15), A ? 0.4 : 0.3, 7, 0.55, 4, 1.5, 7, cx, cy, t);
  if (A) drawThreads(g, ctx, m, cx, cy, VW, VH, br);   /* dải lụa đỏ: sau lưng đảo */
  { const cr = ST.crumble || 0, ck = mindStaticCache(ctx, m, sky, A, br);
    if (ck && !cr) { const sx = Math.max(0, cx), sy = Math.max(0, cy), dx = sx - cx, dy = sy - cy, w = Math.min(VW - dx, ck.lw - sx), h = Math.min(VH - dy, ck.lh - sy); if (w > 0 && h > 0) g.drawImage(ck.c, sx * 2, sy * 2, w * 2, h * 2, dx, dy, w, h);
      if (A && ck.dark && br <= 0.5) FRAGS.A.forEach((f, i) => { if (f.mem == null || (ST.memLit || []).includes(f.mem)) return; const b = ck.boxes[i], bx = Math.max(b.x, cx), by = Math.max(b.y, cy), bw = Math.min(b.x + b.w, cx + VW) - bx, bh = Math.min(b.y + b.h, cy + VH) - by; if (bw > 0 && bh > 0) g.drawImage(ck.dark, bx * 2, by * 2, bw * 2, bh * 2, bx - cx, by - cy, bw, bh); }); }   /* đảo ký ức chưa nhớ: lấy vùng của bản 'tối' */   /* lớp đảo tĩnh dựng sẵn 1 lần (hiệu năng điện thoại) */
    else drawMindStatic(g, ctx, m, cx, cy, VW, VH, sky, A, br, cr); }
  if (A) {   /* vệt nắng vàng (ảnh PixelLab, chồng 'lighter') + hạt ký ức lơ lửng bay lên chậm */
    const sh2 = fogTint(3, '#ffd89a'); if (sh2) { g.imageSmoothingEnabled = true; g.globalCompositeOperation = 'lighter'; for (let i = 0; i < 4; i++) { const w = 46, h = 190, X = Math.round(((i * 173 - cx * 0.85) % (VW + w * 2) + VW + w * 2) % (VW + w * 2) - w), Y = Math.round(((i * 97 - cy * 0.85) % (VH + h) + VH + h) % (VH + h) - h * 0.6); g.globalAlpha = 0.16 + 0.2 * br; g.save(); g.translate(X + w / 2, Y + h / 2); g.rotate(0.35); g.drawImage(sh2, -w / 2, -h / 2, w, h); g.restore(); } g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1; g.imageSmoothingEnabled = false; }   /* vệt nắng = khối sương PixelLab vàng kéo dọc, chồng sáng */
    const mo = img(UIL('A_mote')); if (mo) for (let i = 0; i < 18; i++) { const w = mo.naturalWidth / 2, sp = 6 + (i % 5) * 2, X = Math.round(((hash2(i, 1, 3) * 900 - cx * 0.95) % (VW + 40) + VW + 40) % (VW + 40) - 20), Y = Math.round(((hash2(i, 2, 3) * 600 - cy * 0.95 - t * sp) % (VH + 40) + VH + 40) % (VH + 40) - 20); g.globalAlpha = 0.55 + 0.35 * Math.sin(t * 0.8 + i); g.drawImage(mo, 0, 0, mo.naturalWidth, mo.naturalHeight, X, Y, w, w); g.globalAlpha = 1; }
  } else {   /* mảnh giấy bản vẽ trôi chậm trong gió lạnh */
    for (let i = 0; i < 0; i++) { const im = img(UIL('B_d_paper3')); if (!im) continue;   /* tắt: giấy trôi nhỏ trông như ô vuông xám (nhiễu) */ const w = im.naturalWidth / 2, X = Math.round(((hash2(i, 4, 5) * 900 - cx * 0.9 + t * (8 + i * 2)) % (VW + 60) + VW + 60) % (VW + 60) - 30), Y = Math.round(((hash2(i, 6, 5) * 600 - cy * 0.9) % (VH + 40) + VH + 40) % (VH + 40) - 20 + Math.sin(t + i) * 4);
      g.globalAlpha = 0.35; g.drawImage(im, 0, 0, im.naturalWidth, im.naturalHeight, X, Y, w, w); g.globalAlpha = 1; }
  }
  for (const ch of (ST.chunks || [])) { const sh = mindSheet(ch.set); if (!sh) continue; const hi = sh.width / 16; g.globalAlpha = Math.max(0, 1 - ch.t / 1.2); g.drawImage(sh, 15 * hi, 0, hi, hi, Math.round(ch.x - cx - 8), Math.round(ch.y - cy - 8 + ch.t * ch.t * 60), TS, TS); g.globalAlpha = 1; }   /* mảnh nền vỡ rơi (tuyệt chiêu) */
  g.restore();
}
/* lớp tĩnh của tâm trí (mặt dưới đảo, ô Wang, cầu, đồ trang trí, sương mép) — vẽ thẳng (lúc nền rung) hoặc dựng sẵn vào canvas 2× (mindStaticCache) */
/* ===== DẢI LỤA ĐỎ (anh 2026-10-14): lụa đỏ thẫm (vân ảnh PixelLab ui/lyron/silk_a) trải theo đường cong võng giữa các điểm neo:
   từ sương trên cao xuống đảo, đảo ↔ đảo, rủ từ đá treo xuống sương. Nằm SAU đảo (không bao giờ che người / Rocky).
   Mỗi sợi dựng 1 lần vào canvas 2× (hiệu năng); mỗi khung chỉ 1 drawImage/sợi + đung đưa nhẹ. Thanh khăn giảm → đứt dần từng sợi
   (hai nửa quật ra rồi mờ); Rocky tự do → mọi sợi tan thành cánh hoa đỏ. */
const SILK_ORDER = [6, 4, 8, 1, 5, 9, 2, 7, 3, 0];   /* thứ tự đứt */
function threadDefs(m) {
  const c = m.lyCenter, F = FRAGS.A, P = i => ({ x: c.x + F[i].x * TS, y: c.y + F[i].y * TS }), bot = i => P(i).y + F[i].ry * TS;
  const L = P(1), D = P(2), Rr = P(3), M = P(0);
  return [
    { a: { x: L.x - 30, y: c.y - 360 }, b: { x: L.x, y: L.y }, sag: 30, w: 4, fade: 'a' },
    { a: { x: Rr.x + 40, y: c.y - 380 }, b: { x: Rr.x, y: Rr.y }, sag: 30, w: 4, fade: 'a', knot: 0.45 },
    { a: { x: M.x - 70, y: c.y - 400 }, b: { x: M.x - 20, y: M.y - 20 }, sag: 24, w: 4, fade: 'a' },
    { a: { x: M.x + 160, y: c.y - 300 }, b: { x: D.x + 40, y: D.y }, sag: 50, w: 3, fade: 'a' },
    { a: L, b: D, sag: 60, w: 4, knot: 0.55 },
    { a: D, b: Rr, sag: 60, w: 4 },
    { a: L, b: Rr, sag: 130, w: 3, knot: 0.3 },
    { a: { x: L.x + 12, y: bot(1) - 6 }, b: { x: L.x + 40, y: bot(1) + 130 }, sag: 14, w: 3, fade: 'b', fray: true },
    { a: { x: Rr.x - 10, y: bot(3) - 6 }, b: { x: Rr.x - 50, y: bot(3) + 120 }, sag: 14, w: 3, fade: 'b', fray: true },
    { a: { x: D.x - 30, y: bot(2) - 6 }, b: { x: D.x - 10, y: bot(2) + 110 }, sag: 10, w: 4, fade: 'b', fray: true },
  ];
}
const bez = (d, t) => { const cx0 = (d.a.x + d.b.x) / 2, cy0 = (d.a.y + d.b.y) / 2 + d.sag * 2, u = 1 - t; return { x: u * u * d.a.x + 2 * u * t * cx0 + t * t * d.b.x, y: u * u * d.a.y + 2 * u * t * cy0 + t * t * d.b.y }; };
function buildThread(d, strip) {   /* vân lụa PixelLab rải dọc đường cong, xoắn nhẹ (bề rộng đổi theo cos) để lộ ánh bóng */
  const pts = []; const N = 220; for (let i = 0; i <= N; i++) pts.push(bez(d, i / N));
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const q of pts) { x0 = Math.min(x0, q.x); y0 = Math.min(y0, q.y); x1 = Math.max(x1, q.x); y1 = Math.max(y1, q.y); }
  x0 = Math.floor(x0 - 10); y0 = Math.floor(y0 - 10); x1 = Math.ceil(x1 + 10); y1 = Math.ceil(y1 + 10);
  const c = document.createElement('canvas'); c.width = (x1 - x0) * 2; c.height = (y1 - y0) * 2; const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
  const SX = q => (q.x - x0) * 2, SY = q => (q.y - y0) * 2, A = i => { const t = i / N; return d.fade === 'a' ? Math.min(1, t / 0.3) : d.fade === 'b' ? Math.min(1, (1 - t) / 0.3) : 1; };
  g.lineCap = 'round'; g.lineJoin = 'round';   /* quầng sáng mềm */
  for (const [lw, al] of [[d.w * 5, 0.07], [d.w * 3.2, 0.12]]) { for (let i = 0; i < N; i += 4) { g.strokeStyle = `rgba(255,70,100,${al * A(i)})`; g.lineWidth = lw; g.beginPath(); g.moveTo(SX(pts[i]), SY(pts[i])); g.lineTo(SX(pts[Math.min(N, i + 4)]), SY(pts[Math.min(N, i + 4)])); g.stroke(); } }
  let len = 0;
  for (let i = 0; i < N; i++) {
    const q = pts[i], r = pts[i + 1], ang = Math.atan2(r.y - q.y, r.x - q.x), seg = Math.hypot(r.x - q.x, r.y - q.y); len += seg;
    const tw = 0.45 + 0.55 * Math.abs(Math.cos(len / 22)), endT = d.fray ? Math.max(0, Math.min(1, (N - i) / (N * 0.12))) : 1, wpx = Math.max(2, d.w * 2.4 * tw * (0.35 + 0.65 * endT));
    const sx = Math.floor((len * 2) % strip.width); g.globalAlpha = A(i);
    g.setTransform(1, 0, 0, 1, SX(q), SY(q)); g.rotate(ang); g.drawImage(strip, sx, 0, 1, strip.height, 0, -wpx / 2, seg * 2 + 1, wpx);
    if (d.fray && endT < 1) for (const k of [-1, 1]) { const off = (1 - endT) * 9 * k; g.globalAlpha = A(i) * 0.8; g.drawImage(strip, sx, strip.height / 2, 1, 4, 0, off - 1, seg * 2 + 1, 2); }   /* đầu sợi tưa */
  }
  g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1;
  if (d.knot != null) { const k = bez(d, d.knot), k2 = bez(d, d.knot + 0.01), ang = Math.atan2(k2.y - k.y, k2.x - k.x);   /* nút thắt: hai vạt lụa chéo */
    for (const [da, l] of [[0.9, 7], [-0.9, 7], [2.4, 9]]) { g.setTransform(1, 0, 0, 1, SX(k), SY(k)); g.rotate(ang + da); g.drawImage(strip, 40, 0, 6, strip.height, -2, -d.w * 1.2, l * 2, d.w * 2.4); }
    g.setTransform(1, 0, 0, 1, 0, 0); }
  const mid = bez(d, 0.5);
  return { c, x0, y0, d, mid };
}
/* ===== BỊ HẤT KHỎI ĐẢO → CHONG CHÓNG TRE (anh 2026-10-14; thay luật cũ 'mép đảo là tường sương'):
   Mép đảo mở. Ra khỏi đảo (bị hất hoặc tự bước ra) → bật chong chóng ngay (≤ 0,3 s), BAY LƠ LỬNG ở độ cao cố định, đi lại tự do trên sương,
   đánh như thường; trùm đuổi theo được. Về trên mặt đảo → tự đáp (bụi nhỏ). Biên sân xa: sương dày (không rơi chết). Vẽ: sky.js drawPlayer + copterAt. */
const HOV_LIFT = 14;
function hovDraw(g, ent) {
  const ctx = CUR_DRAW; if (!ctx) return; const H = ST.hov, x = Math.round(ent.x), y = Math.round(ent.y), t = ctx.S.time, up = H ? Math.min(1, H.t / 0.25) : 1;
  const lift = Math.round(HOV_LIFT * up + Math.sin(t * 2.6) * 1.2 * up);
  for (const [mm, al] of [[1.3, 0.08], [0.9, 0.12]]) { g.fillStyle = `rgba(60,20,40,${al})`; g.beginPath(); g.ellipse(x, y + 1, 8 * mm, 2.6 * mm, 0, 0, TAU); g.fill(); }   /* bóng mờ trên sương */
  const kn = ctx.knocked && ctx.knocked(), acts = ent.sheet && ent.sheet.actions, kf = kn && acts && (acts.knockfly || acts.hurt);
  let hd;
  if (kf) {   /* đang bị đánh giữa trời: lộn nhẹ (clip knockfly) */
    const ch = kf.ch || 20, cw = kf.cw || 16, f = Math.min(kf.n - 1, 2 + Math.floor(t * 9) % Math.max(1, kf.n - 2)), cy = y - lift - 9;
    g.save(); g.translate(x, cy); g.rotate(Math.sin(t * 14) * 0.35); g.translate(-x, -cy);
    const X0 = x - (cw >> 1), Y0 = y - lift - 18 - (ch - 20); g.drawImage(kf.img, f * cw, (ent.dir & 3) * ch, cw, ch, X0, Y0, cw, ch);
    const tp = skyTopOf(kf.img, f * cw, (ent.dir & 3) * ch, cw, ch); copterAt(g, { hx: X0 + tp.cx, hy: Y0 + tp.top }, t, 26); g.restore(); ent.labelUp = lift + 14; return;
  }
  if (ent.action || !(acts && acts.hover)) { const cc = ent.custom; ent.custom = null; g.save(); g.translate(0, -lift); try { ent.draw(g); } finally { ent.custom = cc; g.restore(); }
    const sk = ent.sheet && ent.sheet.skin; hd = sk ? { hx: x, hy: y + 2 - sk.ch - lift + 3 } : { hx: x, hy: y - 18 - lift + 1 }; }
  else hd = skyDrawPlayer(g, ent, x, y - lift, 'hover', t);
  copterAt(g, hd, t, H && H.t < 0.3 ? 30 : 18);
  ent.labelUp = lift + 14;
}
let CUR_DRAW = null;
function hoverTick(ctx, dt) {
  const m = ctx.S.map, p = ctx.S.player; if (!m.reg) return; CUR_DRAW = ctx;
  if (p.passable !== MIND_PASS) { ST.passPrev = p.passable; p.passable = MIND_PASS; }   /* mép đảo mở; chỉ biên sân xa là chặn */
  const over = !isleAt(m, p.x, p.y);
  if (!ST.hov) {
    if (over) {   /* rời đảo → bật chong chóng ngay */
      if (ctx.knocked && ctx.knocked()) ctx.knockPlayer({ type: 'hold', follow: () => null });   /* cắt cú văng (đang văng thì vẫn bay theo đà một chút) */
      ST.hov = { t: 0, vx: 0, vy: 0 }; p.custom = hovDraw; ctx.sfx('knock_whoosh'); fx('dirt_puff', p.x, p.y + 2, { dur: 0.4, alpha: 0.7 }); ST.stats.hovers = (ST.stats.hovers || 0) + 1; log('hover on'); }
    return;
  }
  const H = ST.hov; H.t += dt; if (p.custom !== hovDraw && !(ctx.knocked && ctx.knocked())) p.custom = hovDraw;
  if (!over && H.t > 0.35 && !(ctx.knocked && ctx.knocked())) {   /* về trên mặt đảo → đáp */
    ST.hov = null; if (p.custom === hovDraw) p.custom = null; fx('dirt_puff', p.x, p.y + 2, { dur: 0.5 }); ctx.sfx('knock_land'); ST.stats.lands = (ST.stats.lands || 0) + 1; log('hover land');
  }
}
const MIND_PASS = (m, tx, ty) => tx >= 2 && ty >= 2 && tx < m.w - 2 && ty < m.h - 2;
function hoverOff(ctx) { const p = ctx.S.player; if (p.custom === hovDraw) p.custom = null; if (p.passable === MIND_PASS) p.passable = ST.passPrev || null; ST.hov = null; }
function threadTick(ctx, dt) {
  const m = ctx.S.map, T = ST.thr; if (!T || T.m !== m) return;
  const mo = ST.rkMo, br = ST.bright || 0, frac = ST.phase === 'A' && mo ? 1 - mo.hp / mo.max : 0, want = Math.min(SILK_ORDER.length - 2, Math.floor(frac * SILK_ORDER.length * 0.9));
  if (!T.init) { T.init = true; T.cut = want; }   /* vào lại từ điểm lưu: các sợi đã đứt thì không diễn lại */
  while (T.cut < want) { const j = SILK_ORDER[T.cut++], th = T.list[j]; if (!th) continue; T.snaps.push({ j, t: 0 }); fx('td_spark', th.mid.x, th.mid.y, { sheet: crimSheet('td_spark'), dur: 0.5 }); ctx.sfx('snip'); log('silk snap ' + j); }
  for (const q of T.snaps) q.t += dt; T.snaps = T.snaps.filter(q => q.t < 0.8);
  if (br > 0 && !T.petals) { T.petals = true; let n = 0;   /* tự do: các sợi còn lại tan thành cánh hoa đỏ */
    T.list.forEach((th, j) => { if (SILK_ORDER.indexOf(j) < T.cut) return; for (let k = 1; k <= 4 && n < 36; k++, n++) { const q = bez(th.d, k / 5); fx('leaf_fall', q.x, q.y, { sheet: crimSheet('leaf_fall'), dur: 1.4 + k * 0.15, alpha: 0.9 }); } }); }
}
function drawThreads(g, ctx, m, cx, cy, VW, VH, br) {
  if (br >= 1 || typeof document === 'undefined') return;
  const strip = img(UIL('silk_a')); if (!strip) return;
  if (!ST.thr || ST.thr.m !== m) ST.thr = { m, list: threadDefs(m).map(d => buildThread(d, strip)), cut: 0, snaps: [], init: false };
  const T = ST.thr, t = ST.t || 0, ctl = ST.phase === 'A' && br <= 0, pulse = ctl ? 0.86 + 0.1 * Math.sin(t * 1.3) : 1;
  g.save(); g.imageSmoothingEnabled = false;
  T.list.forEach((th, j) => {
    const w = th.c.width / 2, h = th.c.height / 2, X = th.x0 - cx, Y = th.y0 - cy + Math.round(Math.sin(t * 0.5 + j * 1.7) * 1.2);   /* đung đưa nhẹ */
    if (X > VW || Y > VH || X + w < 0 || Y + h < 0) return;
    const gone = SILK_ORDER.indexOf(j) < T.cut, sn = T.snaps.find(q => q.j === j);
    if (gone && !sn) return;
    if (!sn) { g.globalAlpha = pulse * (1 - br); g.drawImage(th.c, 0, 0, th.c.width, th.c.height, X, Y, w, h); return; }
    const k = sn.t / 0.8, mx = th.mid.x - th.x0;   /* đứt: hai nửa quật về phía điểm neo rồi mờ */
    for (const side of [0, 1]) { const piv = side ? th.d.b : th.d.a, px = piv.x - cx, py = piv.y - cy;
      g.save(); g.beginPath(); if ((side === 0) === (th.d.a.x <= th.d.b.x)) g.rect(X, Y, mx, h); else g.rect(X + mx, Y, w - mx, h); g.clip();
      g.translate(px, py); g.rotate((side ? -1 : 1) * k * 0.5); g.translate(-px, -py + k * k * 30); g.globalAlpha = (1 - k) * (1 - br);
      g.drawImage(th.c, 0, 0, th.c.width, th.c.height, X, Y, w, h); g.restore(); }
  });
  g.restore();
}
const GRADS = {};
function gradOf(g, key, VH, A) {   /* gradient nền: tạo 1 lần theo chiều cao màn (không tạo mới mỗi khung) */
  const k = key + VH; if (GRADS[k] && GRADS[k].g === g) return GRADS[k].v; const gr = g.createLinearGradient(0, 0, 0, VH);
  if (A) { gr.addColorStop(0, '#f7dcc6'); gr.addColorStop(0.55, '#f0c3b6'); gr.addColorStop(1, '#e7a9b0'); } else { gr.addColorStop(0, '#41548a'); gr.addColorStop(1, '#5d74a8'); }
  GRADS[k] = { g, v: gr }; return gr;
}
function drawMindStatic(g, ctx, m, cx, cy, VW, VH, sky, A, br, cr, force) {
  const W = m.w;
  const x0 = Math.max(0, Math.floor(cx / TS) - 2), y0 = Math.max(0, Math.floor(cy / TS) - 2), x1 = Math.min(m.w - 2, Math.ceil((cx + VW) / TS) + 1), y1 = Math.min(m.h - 2, Math.ceil((cy + VH) / TS) + 1);
  const F = FRAGS[m.mind];
  /* mặt dưới đảo (đá treo) — vẽ trước mặt trên */
  { const ui = img(UIL(A ? MPICK.underA : MPICK.underB)); if (ui) for (const u of m.under) { if (u.x < x0 || u.x > x1 || u.y < y0 - 2 || u.y > y1) continue; const sx = ((u.x * 32) % ui.naturalWidth), top = 10; g.drawImage(ui, sx, top, 32, ui.naturalHeight - top, u.x * TS - cx, (u.y + 1) * TS - cy - 3, 16, (ui.naturalHeight - top) / 2); } }   /* bỏ phần mặt trên của ảnh, chỉ lấy đá treo */
  for (let ri = 0; ri < F.length; ri++) {
    const f = F[ri], lit = force === 'lit' ? true : force === 'dark' ? (!A || f.mem == null) : (!A || br > 0.5 || f.mem == null || (ST.memLit || []).includes(f.mem)), sh = mindSheet(f.set, !lit); if (!sh) continue; const hi = sh.width / 16, ov = f.ov ? mindSheet(f.ov) : null;
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const r = k => m.reg[k] === ri, c = (r(y * W + x) ? 8 : 0) | (r(y * W + x + 1) ? 4 : 0) | (r((y + 1) * W + x) ? 2 : 0) | (r((y + 1) * W + x + 1) ? 1 : 0); if (!c) continue;
      const jx = cr ? Math.round((hash2(x, y, 5) - 0.5) * 2 * cr) : 0, jy = cr ? Math.round((hash2(x, y, 6) - 0.5) * 2 * cr) : 0;
      if (f.vary && c === 15) {   /* lòng sân: ô đầy xoay / lật ngẫu nhiên (8 kiểu) → không thấy lưới lặp; phấn bản vẽ chỉ phủ thành mảng */
        const v = (hash2(x, y, 9) * 8) | 0, X = x * TS + 16 - cx + jx, Y = y * TS + 16 - cy + jy; g.save(); g.translate(X, Y); g.rotate((v & 3) * Math.PI / 2); if (v & 4) g.scale(-1, 1);
        g.drawImage(sh, c * hi, 0, hi, hi, -TS / 2, -TS / 2, TS, TS);
        if (ov && hash2(x >> 2, y >> 2, 11) > 0.55) { g.globalAlpha = f.ova || 0.15; g.drawImage(ov, c * hi, 0, hi, hi, -TS / 2, -TS / 2, TS, TS); }
        g.restore(); continue; }
      g.drawImage(sh, c * hi, 0, hi, hi, x * TS + 8 - cx + jx, y * TS + 8 - cy + jy, TS, TS);
      if (ov && c === 15) { g.globalAlpha = f.ova || 0.15; g.drawImage(ov, c * hi, 0, hi, hi, x * TS + 8 - cx + jx, y * TS + 8 - cy + jy, TS, TS); g.globalAlpha = 1; }   /* hoa văn bản vẽ phấn MỜ phủ lòng sân (không rối) */
    }
  }
  /* cầu nối đảo */
  { const bi = img(UIL(A ? MPICK.bridgeA : MPICK.bridgeB)); if (bi) for (const B of m.bridges) { const w = bi.naturalWidth / 2, h = bi.naturalHeight / 2; if (!B.cells.length) continue;
    const xs = B.cells.map(c => c.x), ys = B.cells.map(c => c.y), xa = Math.min(...xs), xb = Math.max(...xs) + 1, ya = Math.min(...ys), yb = Math.max(...ys) + 1;
    if (B.axis === 'h') { const yc = (ya + yb) / 2 * TS; for (let x = xa * TS; x < xb * TS; x += w) { const ww = Math.min(w, xb * TS - x); g.drawImage(bi, 0, 0, ww * 2, bi.naturalHeight, Math.round(x - cx), Math.round(yc - h / 2 - cy), ww, h); } }
    else { const xc = (xa + xb) / 2 * TS; for (let y = ya * TS; y < yb * TS; y += w) { const hh = Math.min(w, yb * TS - y); g.save(); g.translate(Math.round(xc - cx), Math.round(y - cy)); g.rotate(Math.PI / 2); g.drawImage(bi, 0, 0, hh * 2, bi.naturalHeight, 0, -Math.round(h / 2), hh, h); g.restore(); } } } }
  /* đồ trang trí trên đảo */
  for (const d of m.deco) { const im = img(UIL(d.name)); if (!im) continue; const w = im.naturalWidth / 2, h = im.naturalHeight / 2, X = Math.round(d.x - cx - w / 2), Y = Math.round(d.y - cy - h + 4); if (X < -w || Y < -h || X > VW || Y > VH) continue; g.drawImage(im, 0, 0, im.naturalWidth, im.naturalHeight, X, Y, w, h); }
  /* mép đảo: sương mềm */
  { const im = fogTint(2, mixHex(sky, 'w', A ? 0.7 : 0.22)); if (im) { g.imageSmoothingEnabled = true; for (const q of m.rim) { const X = q.x - cx, Y = q.y - cy; if (X < -40 || Y < -40 || X > VW + 40 || Y > VH + 40) continue; g.globalAlpha = 0.22 + 0.18 * q.j; g.drawImage(im, X - 22, Y - 14, 44, 28); } g.globalAlpha = 1; g.imageSmoothingEnabled = false; } }
}
let MCK = null;
function mindStaticCache(ctx, m, sky, A, br) {   /* 2 bản dựng sẵn 1 lần / lần vào vùng: 'sáng' (mọi đảo sáng) + 'tối' (đảo ký ức chưa nhớ tối) — đổi trạng thái KHÔNG dựng lại (không giật) */
  if (MCK && MCK.m === m) return MCK;
  const F = FRAGS[m.mind], need = [UIL(A ? MPICK.underA : MPICK.underB), UIL(A ? MPICK.bridgeA : MPICK.bridgeB), ...m.deco.map(d => UIL(d.name))];
  if (need.some(n => !img(n)) || F.some(f => !mindSheet(f.set) || (f.ov && !mindSheet(f.ov)) || (A && !mindSheet(f.set, true))) || !fogTint(2, mixHex(sky, 'w', 0.5)) || typeof document === 'undefined') return null;
  const lw = m.w * TS, lh = m.h * TS, mk = force => { const c = document.createElement('canvas'); c.width = lw * 2; c.height = lh * 2; const g2 = c.getContext('2d'); g2.setTransform(2, 0, 0, 2, 0, 0); g2.imageSmoothingEnabled = false; drawMindStatic(g2, ctx, m, 0, 0, lw, lh, sky, A, br, 0, force); return c; };
  const _b0 = performance.now(), lit = mk('lit'), dark = A ? mk('dark') : null; PERF.b.push('mindCache ' + Math.round(performance.now() - _b0));
  const boxes = F.map((f, i) => { let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1; for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) if (m.reg[y * m.w + x] === i) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); } return { x: (x0 - 1) * TS, y: (y0 - 1) * TS, w: (x1 - x0 + 3) * TS, h: (y1 - y0 + 4) * TS }; });
  MCK = { m, c: lit, dark, boxes, lw, lh }; return MCK;
}
const MIND_SKY_B = '#5a6fa6';
let REPLAY_ON = false, PULLED = null;
const MSH = {};
function mindSheet(set, dark) {   /* sheet Wang: lớp dưới (sương phẳng) → TRONG SUỐT để lộ nền sương mềm; bản 'tối' cho mảnh ký ức chưa sáng — làm 1 lần */
  const key = set + (dark ? '|d' : ''); if (MSH[key]) return MSH[key]; const im = img('boss/lyron/mind/' + set + '.png'); if (!im || typeof document === 'undefined') return null;
  const c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight; const g = c.getContext('2d'); g.drawImage(im, 0, 0);
  const d = g.getImageData(0, 0, c.width, c.height), a = d.data, lo = [a[(4 * c.width + 4) * 4], a[(4 * c.width + 4) * 4 + 1], a[(4 * c.width + 4) * 4 + 2]];
  for (let i = 0; i < a.length; i += 4) { const e = Math.abs(a[i] - lo[0]) + Math.abs(a[i + 1] - lo[1]) + Math.abs(a[i + 2] - lo[2]); if (e < 46) a[i + 3] = 0; else if (dark) { a[i] *= 0.6; a[i + 1] *= 0.55; a[i + 2] *= 0.62; } }
  g.putImageData(d, 0, 0); MSH[key] = c; return c;
}
const inMind = ctx => !!MIND_Z[zid(ctx)];
function pullTo(ctx, zone, kind = 'pull', entry = 'default') { if (ST.pull) return; ST.pull = { t: 0, T: kind === 'shatter' ? 0.9 : 1.15, zone, kind, entry }; ctx.setMode('lycine'); ctx.sfx(kind === 'shatter' ? 'boss_win' : 'whirl'); if (ctx.quake) ctx.quake(0.3); log('pull → ' + zone); }
function drawPull(ug, ctx) {   /* 'kéo vào tâm trí': sương cuộn vào giữa màn + màn hình gợn; 'vỡ tâm trí': loé trắng + sương bung ra; tới nơi: sương tan ra mép */
  const W = ug.canvas.width, H = ug.canvas.height, P = ST.pull, R = ST.arrive; if (!P && !R) return;
  const u = P ? Math.min(1, P.t / P.T) : 1 - Math.min(1, R.t / R.T), kind = P ? P.kind : R.kind, warm = (P ? P.zone : zid(ctx)) === 'mind_rocky', col = kind === 'shatter' ? '#f4f0ff' : warm ? '#f6d8c8' : '#1c2448';
  const fog = fogTint(1, col); ug.save(); ug.imageSmoothingEnabled = true;
  if (fog) for (let i = 0; i < 18; i++) { const a = i / 18 * TAU + u * (kind === 'shatter' ? -1.2 : 1.6), rr = (kind === 'shatter' ? u : 1 - u) * Math.max(W, H) * 0.75, x = W / 2 + Math.cos(a) * rr, y = H / 2 + Math.sin(a) * rr * 0.8, s = Math.max(W, H) * (0.25 + 0.35 * u);
    ug.globalAlpha = Math.min(1, u * 1.3); ug.drawImage(fog, x - s / 2, y - s * 0.35, s, s * 0.7); }
  ug.globalAlpha = Math.pow(u, 2.2); ug.fillStyle = col; ug.fillRect(0, 0, W, H);
  if (kind === 'shatter' && P && u < 0.25) { ug.globalAlpha = 1 - u * 4; ug.fillStyle = '#ffffff'; ug.fillRect(0, 0, W, H); }
  ug.restore();
}

/* ---------------- dựng sân ---------------- */
function center(ctx) { const m = ctx.S.map; return (m && m.lyCenter) || { x: (m.w * TS) / 2, y: (m.h * TS) / 2 }; }
function petCmdHide(ctx, on) {   /* Màn A: Rocky thật vắng mặt (pet.js: cmd 'home' + vùng không có ổ → không có thực thể) — trả lại lệnh cũ sau đó */
  const h = sv(ctx), pt = rk(ctx); if (!pt) return;
  if (on) { if (pt.cmd !== 'home') h.prevCmd = pt.cmd || 'protect'; pt.cmd = 'home'; }
  else if (h.prevCmd) { pt.cmd = h.prevCmd; h.prevCmd = null; }
  else if (pt.cmd === 'home' && h.hidCmd) pt.cmd = 'protect';
  h.hidCmd = !!on; ctx.persist();
}
function placePlayer(ctx) { const c = center(ctx), p = ctx.S.player; p.x = c.x - 10; p.y = c.y + 52; p.dir = 3; }

function startReveal(ctx) {
  const t = L(ctx), c = center(ctx); ST.phase = 'reveal'; ST.corpse = true;
  ST.ly = { x: c.x, y: c.y - 18, dir: 'south', clip: 'idle', ft: 0, alpha: 0, lift: 2 };
  placePlayer(ctx); log('reveal');
  const steps = [
    { act: () => { ST.lb = 0.01; if (ctx.quake) ctx.quake(0.5); ctx.sfx('rumble'); fx('hr_morph', c.x, c.y - 14, { dur: 0.8, alpha: 0.7, sheet: crimSheet('hr_morph') }); }, wait: 1.2 },
    { act: () => { ST.ly.alpha = 1; ST.ly.rise = 1; ctx.S.flash = 0.5; fx('td_spark', c.x, c.y - 20); }, wait: 1.3 },
    ...lines(t.rv, t),
    { act: () => { ST.ly.clip = 'cast'; ST.ly.prog = 0; ST.ly.anim = { t: 0.8, T: 0.8 }; bindRocky(ctx); }, wait: 1.6 },
    ...lines(t.bind, t),
  ];
  cine(ctx, steps, () => { const h = sv(ctx); h.stage = 'fightA'; ctx.persist(); pullTo(ctx, 'mind_rocky'); });   /* khăn quất cả người chơi → bị kéo vào TÂM TRÍ Rocky */
}
function bindRocky(ctx) {   /* Rocky bị khăn kéo về phía Lyron → biến Rocky Tối Thượng (clip gồng rtt_transform_s) */
  const e = rkEnt(ctx), c = center(ctx), x = e ? e.x : c.x + 30, y = e ? e.y : c.y + 50;
  ST.rkp = { x, y, face: 'ds', dir: 1, ft: 0, anim: { k: 'transform', t: 1.4, T: 1.4 }, pull: { x: c.x + 4, y: c.y + 40 } };
  petCmdHide(ctx, true); fx('hr_morph', x, y + 2, { dur: 0.8, alpha: 0.7, sheet: crimSheet('hr_morph') }); ctx.sfx('roar'); if (ctx.quake) ctx.quake(0.4);
}
function resume(ctx, which) {
  const t = L(ctx), c = center(ctx); placePlayer(ctx); ST.corpse = true;
  ST.ly = { x: c.x, y: c.y - 18, dir: 'south', clip: 'idle', ft: 0, alpha: 1, lift: 2 };
  if (which === 'fightA') { ST.rkp = { x: c.x + 4, y: c.y + 40, face: 'ds', dir: 1, ft: 0 }; petCmdHide(ctx, true); cine(ctx, lines(t.resumeA, t), () => startFightA(ctx)); }
  else { petCmdHide(ctx, false); cine(ctx, lines(t.resumeB, t), () => startFightB(ctx)); }
}

/* ================= MÀN A — ROCKY BỊ KHỐNG CHẾ ================= */
const RA = { spd: [78, 100], dmg: { jab: 0.07, upper: 0.12, dash: 0.1, ha: 0.16 }, cd: { ha: [7, 5], dash: [4.2, 3], upper: [3.5, 2.5], jab: [0.9, 0.6] }, burst: { dur: 9, cd: 14, wind: 1.6, cast: 0.9 } };
function bindHp(ctx) { const h = ctx.hero, per = h ? h.atk + h.weaponBonus(h.swordTier) : 60; return easyHp(Math.round(per * 26)); }   /* 2026-10-14 anh: Màn A ngắn lại (~1,5 phút người chơi thường) */
function poise(mo) { Object.defineProperty(mo, 'kb', { configurable: true, get: () => null, set: () => {} }); }
function startFightA(ctx) {
  const t = L(ctx), h = sv(ctx), c = center(ctx); h.stage = 'fightA'; ctx.persist();
  ST.phase = 'A'; ST.lb = 0; ST.cd = { ha: 4, dash: 2.5, upper: 1.5, jab: 0.5, burst: 6 }; ST.seq = []; ST.skN = {};
  const r = ST.rkp || { x: c.x, y: c.y + 40, face: 'ds', dir: 1, ft: 0 }; r.anim = null;
  const hp = bindHp(ctx);
  const mo = ctx.monsters.add({ key: 'lyron_rtt', vi: STR.vi.rkName, en: STR.en.rkName, hp, dmg: 0, armor: 0, sp: 0, xp: 0, w: 22, h: 28, c: ['#5a1030', '#a02050', '#ff80b0'], lyRtt: true,
    aiFn: (c2, m2, dt, p, dp, canHit) => aiRk(c2, m2, dt, p, dp, canHit), drawFn: (g, m2, x, y) => drawRk(g, m2, x, y, lift(ctx) + Math.round(m2.fogLf || 0), ctx), onFall: () => true, tip: { vi: t.knotTip, en: STR.en.knotTip } }, r.x, r.y);
  poise(mo); Object.assign(mo, { face: r.face || 'ds', dir: r.dir || 1, ft: 0, act: null, expT: 0, windT: 0, burstT: 0, lastHp: hp, flinchT: 0 });
  if (h.cpA && h.cpA < 1) { mo.hp = mo.lastHp = Math.max(1, Math.round(hp * h.cpA)); ST.memAt = ST.memAt.filter(m => m < h.cpA - 0.001); log('checkpoint A ' + h.cpA); }   /* ngất / rời sân: đánh tiếp từ mốc ký ức gần nhất */
  ST.rkMo = mo; ST.rkp = null; ST.ly.clip = 'idle'; ST.ly.prog = null; ST.ly.x = c.x; ST.ly.y = c.y - 70; ST.ly.lift = 26;
  ST.banner = { txt: zid(ctx) === 'mind_rocky' ? t.recallHint : t.fightA, t: 4 }; ST.startA = ST.t; log('fightA hp ' + hp);
  setupRecall(ctx, mo);
  setTimeout(() => { if (ST.phase === 'A') ctx.toast(t.recallHint, true); }, 4200);
}
const SKA = [
  { k: 'burst', tier: 4, ok: (mo, d) => !(mo.burstT > 0) && ST.cd.burst <= 0 },
  { k: 'ha', tier: 3, ok: (mo, d) => ST.cd.ha <= 0 && d > 40 && d < 175 },
  { k: 'dash', tier: 2, ok: (mo, d) => ST.cd.dash <= 0 && d > 50 && d < 165 },
  { k: 'upper', tier: 2, ok: (mo, d) => ST.cd.upper <= 0 && d <= 34 },
  { k: 'jab', tier: 1, ok: (mo, d) => ST.cd.jab <= 0 && d <= 34 },
];
function pick(list, mo, d) {
  const ready = list.filter(s => s.ok(mo, d)); if (!ready.length) return null;
  const q = ST.seq, l1 = q[q.length - 1], l2 = q[q.length - 2], fresh = ready.filter(s => !(s.k === l1 && s.k === l2)); if (!fresh.length) return null; const pool = fresh, top = Math.max(...pool.map(s => s.tier));
  const k = pool.filter(s => s.tier === top).sort((a, b) => (ST.lastUse[a.k] ?? -99) - (ST.lastUse[b.k] ?? -99))[0].k; rec(k); return k;   /* cùng bậc: chiêu lâu chưa dùng nhất trước */
}
function rec(k) { ST.seq.push(k); if (ST.seq.length > 300) ST.seq.shift(); ST.skN[k] = (ST.skN[k] || 0) + 1; (ST.lastUse ||= {})[k] = ST.t; }
let CUR = null;   /* ctx hiện hành cho moveTo (va chạm trên nền tâm trí) */
const isleAt = (m, x, y) => { const tx = Math.floor(x / TS), ty = Math.floor(y / TS); return !!m.reg && tx >= 0 && ty >= 0 && tx < m.w && ty < m.h && m.reg[ty * m.w + tx] >= 0; };
const inBound = (m, x, y) => { const tx = Math.floor(x / TS), ty = Math.floor(y / TS); return tx >= 2 && ty >= 2 && tx < m.w - 2 && ty < m.h - 2; };
let WALKER = null;   /* quái đang đi (để biết nó đang ở trên sương) */
const walk = (ctx, x, y) => { const m = ctx.S.map; if (!m.reg) return !ctx.isSolid(m, Math.floor(x / TS), Math.floor(y / TS));
  return inBound(m, x, y) && (isleAt(m, x, y) || !!ST.hov || (WALKER && !isleAt(m, WALKER.x, WALKER.y))); };   /* tâm trí: đảo · khi người chơi đang bay thì trùm được đuổi qua sương */
function moveTo(mo, tx, ty, sp, dt) {   /* trời: tự do · tâm trí: chỉ đi trên mảnh nền (trượt theo trục khi vướng mép) */
  const dx = tx - mo.x, dy = ty - mo.y, d = Math.hypot(dx, dy); if (d < 1) return true; const s = Math.min(d, sp * dt), vx = dx / d * s, vy = dy / d * s; mo.moving = true;
  if (!CUR || CUR.S.map.air) { mo.x += vx; mo.y += vy; return false; }
  WALKER = mo; if (walk(CUR, mo.x + vx, mo.y + vy)) { mo.x += vx; mo.y += vy; } else { if (walk(CUR, mo.x + vx, mo.y)) mo.x += vx; if (walk(CUR, mo.x, mo.y + vy)) mo.y += vy; } WALKER = null;
  return false;
}
function keepIn(ctx, mo) {
  const m = ctx.S.map, a = m && m.air;
  if (!a && m.reg) { const over = !isleAt(m, mo.x, mo.y), tg = over ? AIR_LIFT : 0; mo.fogLf = (mo.fogLf || 0) + (tg - (mo.fogLf || 0)) * 0.15; }   /* trên sương: bay cao lên một chút */
  if (!a) { WALKER = mo; const ok = walk(ctx, mo.x, mo.y); WALKER = null; if (ok) { mo._okx = mo.x; mo._oky = mo.y; mo._blk = false; } else if (mo._okx != null) { mo.x = mo._okx; mo.y = mo._oky; mo._blk = true; } return; }
  const dx = (mo.x - a.cx) / (a.rx - 30), dy = (mo.y - a.cy) / (a.ry - 30), k = Math.hypot(dx, dy); if (k > 1) { mo.x = a.cx + (mo.x - a.cx) / k; mo.y = a.cy + (mo.y - a.cy) / k; }
}
function aiRk(ctx, mo, dt, p, dp, canHit) {
  CUR = ctx; const t = L(ctx); mo.ft += dt; mo.moving = false;
  if (mo.flash > 0) mo.flash -= dt;
  /* trúng đòn: thân → hoàn máu + khựng; nút khăn (sau lưng / đang LỘ) → khăn yếu đi */
  if (mo.hp < mo.lastHp) {
    const v = { x: p.x - mo.x, y: p.y - mo.y }, l = Math.hypot(v.x, v.y) || 1, f = faceVec(mo), behind = (f.x * v.x + f.y * v.y) / l < -0.25;
    if (exposed(mo) || behind) { ST.stats.knot++; if (ctx.pop) ctx.pop(mo.x, mo.y - 34, t.knotHit, '#ff8fb8'); }
    else { mo.hp = mo.lastHp; mo.flinchT = 0.22; ST.stats.body++; if (ST.t - (ST.tipT || -99) > 6) { ST.tipT = ST.t; ctx.toast(t.knotTip); } }
  }
  if (mo.hp <= 0) { mo.hp = 0; mo.lastHp = 0; return breakScarf(ctx, mo); }
  mo.lastHp = mo.hp;
  { const ex = exposed(mo); if (ex && !mo.wasEx) mo.expAt = ST.t; mo.wasEx = ex; }
  if (mo.calm) { mo.act = null; mo.anim = null; mo.shake = 0; faceTo(mo, p.x, p.y); mo.lastHp = mo.hp; return; }   /* đủ 4 ký ức: Rocky đứng yên chờ được ôm */
  if (mo.hesT > 0) { mo.hesT -= dt; mo.act = null; mo.anim = { k: 'knockdown', p: 0.12 + 0.08 * Math.abs(Math.sin(ST.t * 4)) }; mo.shake = 1; mo.lastHp = mo.hp; return; }   /* khựng, ôm đầu */
  if (mo.flinchT > 0) { mo.flinchT -= dt; mo.shake = 1; } else mo.shake = mo.callWin ? 1 : 0;
  /* ký ức ở mốc 75 / 50 / 25 % */
  const fr = mo.hp / mo.max; if (!mo.act && ST.memAt.length && fr <= ST.memAt[0] && !mo.callWin) { const h0 = sv(ctx); h0.cpA = ST.memAt[0]; ctx.persist(); ST.memAt.shift(); return startMemory(ctx, mo); }
  if (mo.callWin) return callTick(ctx, mo, dt, p);
  for (const k in ST.cd) if (ST.cd[k] > 0) ST.cd[k] -= dt;
  if (mo.expT > 0) mo.expT -= dt;
  if (mo.windT > 0) { mo.windT -= dt; mo.anim = null; return; }
  if (mo.burstT > 0) { mo.burstT -= dt; if (mo.burstT <= 0 && !mo.act) { mo.windT = RA.burst.wind; ST.banner = { txt: t.burstEnd, t: 1.6 }; log('burst end'); fx('hr_morph', mo.x, mo.y, { dur: 0.5, alpha: 0.6, sheet: crimSheet('hr_morph') }); return; } }
  if (mo.act) { const A = mo.act; A.age = (A.age || 0) + dt; ST.actMax[A.k] = Math.max(ST.actMax[A.k] || 0, A.age); return actA(ctx, mo, A, dt, p); }
  mo.anim = null; if (ctx.hero && ctx.hero.fainted) return;   /* sân trời: p.custom (chong chóng) làm canHit của monsters.js luôn false → tự xét ngất */
  const B = mo.burstT > 0 ? 1 : 0, d = dp;
  if (d <= 34) ST.nearT = (ST.nearT || 0) + dt; else ST.nearT = 0;
  if (ST.nearT > 2.2 && (ST.cd.ha <= 0 || ST.cd.dash <= 0)) { ST.nearT = 0; const a = Math.atan2(mo.y - p.y, mo.x - p.x) + (Math.random() - 0.5) * 1.2; mo.act = { k: 'hop', t: 0.42, a }; log('A hop'); return; }   /* người bám sát lâu → Rocky bật lùi ra rồi dùng chiêu tầm xa (như Rocky thật) */
  const k = pick(SKA, mo, d);
  if (k) return startA(ctx, mo, k, p, B);
  if (d > 26) { moveTo(mo, p.x, p.y, RA.spd[B], dt); faceTo(mo, p.x, p.y); } else faceTo(mo, p.x, p.y);
  keepIn(ctx, mo);
}
function startA(ctx, mo, k, p, B) {
  const t = L(ctx); faceTo(mo, p.x, p.y); log('A ' + k);
  if (k === 'burst') { ST.cd.burst = RA.burst.cd + RA.burst.dur; mo.act = { k, t: RA.burst.cast, T: RA.burst.cast }; mo.anim = { k: 'transform', t: RA.burst.cast, T: RA.burst.cast }; ST.banner = { txt: t.burst, t: 1.8 }; fx('hr_morph', mo.x, mo.y + 2, { dur: 0.6, alpha: 0.6, sheet: crimSheet('hr_morph') });   /* bỏ đĩa vòng tròn đỏ-trắng (anh chê) */ ctx.sfx('roar'); return; }
  if (k === 'jab') { ST.cd.jab = RA.cd.jab[B]; const T0 = B ? 0.32 : 0.45; mo.act = { k, t: T0, T: T0, x: p.x, y: p.y, r: 14, more: B ? 1 + ((Math.random() * 2) | 0) : 0 }; tpush(ctx, { type: 'c', x: p.x, y: p.y, r: 14, t: T0, T0, act: mo.act }); return; }
  if (k === 'upper') { ST.cd.upper = RA.cd.upper[B]; const T0 = 0.6; mo.act = { k, t: T0, T: T0, x: p.x, y: p.y, r: 17 }; tpush(ctx, { type: 'c', x: p.x, y: p.y, r: 17, t: T0, T0, act: mo.act, col: '#ff4070' }); return; }
  if (k === 'dash') { ST.cd.dash = RA.cd.dash[B]; const a = Math.atan2(p.y - mo.y, p.x - mo.x), T0 = 0.42; mo.act = { k, ph: 'aim', t: T0, a, len: 150, hit: false }; tpush(ctx, { type: 'l', x: mo.x, y: mo.y, a, len: 150, w: 18, t: T0, T0, act: mo.act }); ST.banner = { txt: t.dash, t: 1 }; return; }
  if (k === 'ha') { ST.cd.ha = RA.cd.ha[B]; const a = Math.atan2(p.y - mo.y, p.x - mo.x), T0 = 1.0; mo.act = { k, ph: 'wind', t: T0, T0, a, len: 158, hit: false }; mo.anim = { k: 'ha', p: 0.3 }; tpush(ctx, { type: 'l', x: mo.x, y: mo.y, a, len: 158, w: 16, t: T0, T0, act: mo.act }); ST.banner = { txt: t.ha8, t: 1.2 }; ctx.sfx('rocky_happy'); return; }
}
function actA(ctx, mo, A, dt, p) {
  A.t -= dt;
  if (A.k === 'hop') { mo.x += Math.cos(A.a) * 190 * dt; mo.y += Math.sin(A.a) * 190 * dt; keepIn(ctx, mo); if (mo._blk) A.t = 0; mo.anim = { k: 'punch', p: 0.05 }; if (A.t <= 0) { mo.act = null; const k2 = ST.cd.ha <= 0 ? 'ha' : 'dash'; rec(k2); startA(ctx, mo, k2, p, mo.burstT > 0 ? 1 : 0); } return; }   /* bật lùi xong → ra ngay chiêu tầm xa */
  if (A.k === 'burst') { mo.anim = { k: 'transform', t: Math.max(0, A.t), T: A.T }; if (A.t <= 0) { mo.act = null; mo.anim = null; mo.burstT = RA.burst.dur; } return; }
  if (A.k === 'jab' || A.k === 'upper') {
    mo.anim = { k: 'punch', p: Math.min(0.5, 1 - A.t / A.T) * (A.t > 0 ? 1 : 2) };
    if (A.t > 0) { if (dist(mo, A) > 20) moveTo(mo, A.x, A.y, 60, dt); return; }
    if (!A.done) { A.done = true; const hit = dist(p, A) < A.r + 4; if (hit) hurtPlayer(ctx, RA.dmg[A.k], mo, A.k === 'upper' ? 'fly' : 'stagger', A.k === 'upper' ? 1.2 : 0.6); fx(A.k === 'upper' ? 'knock_heavy' : 'knock_jab', A.x, A.y); ctx.sfx('punch'); A.t2 = 0.22; }
    A.t2 -= dt; if (A.t2 > 0) return;
    if (A.more > 0) { const n = A.more - 1; mo.act = null; startA(ctx, mo, 'jab', p, 1); if (mo.act) mo.act.more = n; return; }
    mo.act = null; if (A.k === 'upper') mo.expT = 0.6; return;
  }
  if (A.k === 'dash') {
    if (A.ph === 'aim') { mo.anim = { k: 'punch', p: 0.1 }; if (A.t <= 0) { A.ph = 'go'; A.go = 0; } return; }
    const sp = 330 * dt; A.go += sp; mo.x += Math.cos(A.a) * sp; mo.y += Math.sin(A.a) * sp; mo.anim = { k: 'punch', p: 0.6 }; keepIn(ctx, mo); if (mo._blk) A.go = A.len;
    if (!A.hit && dist(mo, p) < 16) { A.hit = true; hurtPlayer(ctx, RA.dmg.dash, mo, 'fly', 1.2); fx('knock_heavy', p.x, p.y); }
    if (A.go >= A.len) { mo.act = null; mo.expT = 1.2; log('dash end exp'); }
    return;
  }
  if (A.k === 'ha') {
    if (A.ph === 'wind') { mo.anim = { k: 'ha', p: 0.25 + 0.25 * (1 - A.t / A.T0) }; if (A.t > 0.25) { A.a = Math.atan2(p.y - mo.y, p.x - mo.x); const tl = ST.tele.find(q => q.act === A); if (tl) { tl.a = A.a; tl.x = mo.x; tl.y = mo.y; } } if (A.t <= 0) { A.ph = 'fire'; A.t = 0.45; A.ft = 0; ctx.sfx('beam'); const ex = mo.x + Math.cos(A.a) * A.len, ey = mo.y + Math.sin(A.a) * A.len; fx('td_spark', ex, ey - 6, { top: true, sheet: crimSheet('td_spark') }); } return; }
    A.ft = (A.ft || 0) + dt; mo.anim = { k: 'ha', p: 0.85 };
    const a0 = { x: mo.x, y: mo.y - 6 }, b0 = { x: mo.x + Math.cos(A.a) * A.len, y: mo.y - 6 + Math.sin(A.a) * A.len };
    if (!A.hit && segDist({ x: p.x, y: p.y - 6 }, a0, b0) < 11) { A.hit = true; hurtPlayer(ctx, RA.dmg.ha, mo, 'fly', 1.4); }
    if (A.t <= 0) { mo.act = null; mo.expT = 1.6; log('ha end exp'); }
  }
}

/* ký ức + cửa sổ 'Gọi Rocky' */
function startMemory(ctx, mo) {
  const i = Math.min(2, ST.stats.memN); ST.stats.memN++; mo.act = null; mo.anim = null; ST.tele = ST.tele.filter(q => !q.act);
  ST.mem = { i, t: 0, T: 3.4 }; (ST.memLit ||= []).push(i); ctx.setMode('lymem'); ctx.sfx('chime'); log('memory ' + i);
}
function memTick(ctx, dt) {
  const M = ST.mem; if (!M) return; M.t += dt * (ST.fast ? 4 : 1);
  if (M.t >= M.T) { ST.mem = null; if (ctx.S.mode === 'lymem') ctx.setMode('play'); const mo = ST.rkMo; if (mo && M.recall) afterRecall(ctx, mo); else if (mo) { mo.callWin = { t: 5.5, n: 0 }; ctx.toast(L(ctx).callGo, true); } }
}
/* ĐƯỜNG KHÔNG ĐÁNH NHAU (anh 2026-10-14): 4 vật sáng trên 4 đảo = 4 ký ức. Đứng yên cạnh vật 1,5 s → ký ức → khăn −22 %, Rocky khựng 4 s.
   Đủ 4 → Rocky đứng yên → lại gần ÔM Rocky → khăn đứt. Có thể trộn với đường chém nút khăn / Gọi Rocky (cùng một thanh). */
const RECALL = { 0: { deco: 'A_d_well', mem: 3 }, 1: { deco: 'A_d_sail', mem: 0 }, 2: { deco: 'A_d_shells', mem: 1 }, 3: { deco: 'A_d_crystal', mem: 2 } };   /* đảo → vật + ký ức (mem1..4) */
function setupRecall(ctx, mo) {
  const m = ctx.S.map; ST.mobj = []; if (!m.mind || m.mind !== 'A') return;
  const h = sv(ctx); h.recalled ||= [];
  FRAGS.A.forEach((f, i) => { const R0 = RECALL[i], d = m.deco.find(q => q.name === R0.deco && m.reg[q.ty * m.w + q.tx] === i), c = center(ctx);
    ST.mobj.push({ isl: i, mem: R0.mem, x: d ? d.x : c.x + f.x * TS, y: d ? d.y : c.y + f.y * TS, done: h.recalled.includes(R0.mem) }); });
  for (const o of ST.mobj) if (o.done) { const f = FRAGS.A[o.isl]; if (f.mem != null) (ST.memLit ||= []).push(f.mem); }
  if (ST.mobj.every(o => o.done)) mo.calm = true;
}
const onIsland = ctx => { const m = ctx.S.map, p = ctx.S.player; if (!m.reg) return true; const k = Math.floor(p.y / TS) * m.w + Math.floor(p.x / TS); return m.reg[k] >= 0; };
function startRecall(ctx, k) {
  const o = ST.mobj[k]; if (!o || o.done || ST.recall) return; if (!onIsland(ctx) || ST.hov) { ctx.toast(L(ctx).recallNeedGround); return; }
  const p = ctx.S.player; ST.recall = { k, t: 0, x0: p.x, y0: p.y, hp0: ctx.hero ? ctx.hero.hp : 0 }; ctx.sfx('chime'); log('recall start ' + k);
}
function recallTick(ctx, dt) {
  const R0 = ST.recall; if (!R0) return; const p = ctx.S.player, h = ctx.hero;
  const why = Math.hypot(p.x - R0.x0, p.y - R0.y0) > 12 ? 'move' : h && R0.hp0 - h.hp >= h.max * 0.05 ? 'hit' : ctx.knocked && ctx.knocked() && !(typeof window !== 'undefined' && window.__knock && __knock.state && (__knock.state() || {}).type === 'stagger') ? 'knock' : ST.hov ? 'hov' : null;   /* cú đánh nhẹ (jab) không cắt — chỉ đòn nặng / bị hất / bước đi */
  if (why) { ST.recall = null; ctx.toast(L(ctx).recallCut); log('recall cut ' + why); ST.stats.cuts = (ST.stats.cuts || 0) + 1; return; }
  if (h && h.hp < R0.hp0) R0.hp0 = h.hp;
  R0.t += dt * (ST.fast ? 4 : 1); if (R0.t < 1.5) return;
  const o = ST.mobj[R0.k]; ST.recall = null; o.done = true; const sh = sv(ctx); (sh.recalled ||= []).includes(o.mem) || sh.recalled.push(o.mem); ctx.persist();
  const f = FRAGS.A[o.isl]; if (f.mem != null) (ST.memLit ||= []).push(f.mem); ST.stats.recalls = (ST.stats.recalls || 0) + 1;
  const mo = ST.rkMo; if (mo) { mo.act = null; mo.anim = null; } ST.tele = ST.tele.filter(q => !q.act);
  ST.mem = { i: o.mem, t: 0, T: 3.4, recall: true }; ctx.setMode('lymem'); log('recall done ' + o.mem);
}
function afterRecall(ctx, mo) {
  const t = L(ctx); mo.hp = Math.max(1, Math.round(mo.hp - mo.max * 0.22)); mo.lastHp = mo.hp; mo.hesT = 4; mo.expT = 0;
  ST.memAt = ST.memAt.filter(x => x < mo.hp / mo.max - 0.001); const h = sv(ctx); h.cpA = Math.min(h.cpA || 1, mo.hp / mo.max); ctx.persist();
  if (ST.mobj.every(o => o.done)) { mo.calm = true; ST.banner = { txt: t.calm, t: 4 }; ctx.toast(t.calm, true); log('calm'); }
  else ST.banner = { txt: t.hesitate, t: 2.5 };
}
function callTick(ctx, mo, dt, p) {
  const W = mo.callWin; W.t -= dt; mo.anim = { k: 'knockdown', p: 0.15 + 0.1 * Math.abs(Math.sin(ST.t * 3)) };
  if (W.t <= 0) { mo.callWin = null; mo.expT = 0; ctx.toast(L(ctx).callLate); log('call late'); ST.cd.jab = 0.6; }
}
function callPress(ctx) {
  const mo = ST.rkMo; if (!mo || !mo.callWin) return; const W = mo.callWin; W.n++; ST.stats.calls++; ctx.sfx('rocky_happy');
  if (ctx.pop) ctx.pop(mo.x, mo.y - 36, '💗', '#ff9cc8');
  if (W.n >= 3) { mo.callWin = null; mo.hp = Math.max(1, mo.hp - Math.round(mo.max * 0.15)); mo.lastHp = mo.hp; mo.expT = 3; ST.stats.callOk++; ctx.toast(L(ctx).callOk, true); setTimeout(() => ctx.toast(L(ctx).lyCallOk), 1400); fx('wf_rocky_orb', mo.x, mo.y - 10) || fx('hr_shards', mo.x, mo.y - 10); log('call ok'); }
}
function breakScarf(ctx, mo) {
  const t = L(ctx); ST.phase = 'brk'; mo.act = null; ST.tele = []; ST.durA = +(ST.t - (ST.startA || 0)).toFixed(1);
  const at = { x: mo.x, y: mo.y }; ctx.monsters.remove(mo); ST.rkMo = null;
  ST.rkp = { x: at.x, y: at.y, face: 'ds', dir: 1, ft: 0, anim: { k: 'knockdown', t: 1.2, T: 1.2 } };
  fx('ly_knot_break', at.x, at.y - 20, { top: true }) || fx('hr_shards', at.x, at.y - 20, { top: true });   /* nút khăn đứt: sợi len đỏ + tia (vfx_workbench) */ ctx.S.flash = 0.6; if (ctx.quake) ctx.quake(0.4); ctx.sfx('boss_win');
  ST.scarfFly = { x: at.x, y: at.y - 22, t: 0 }; log('scarf break');
  const steps = [
    { wait: 1.2 },
    { act: () => { ST.rkp.free = true; ST.rkp.anim = null; } },
    ...lines(t.brk, t),
  ];
  { const h0 = sv(ctx); h0.cpA = null; h0.cpB = null; h0.stage = 'fightB'; ctx.persist(); }
  ST.brightGo = true;   /* tâm trí Rocky bừng sáng */
  cine(ctx, steps, () => { petCmdHide(ctx, false); ST.rkp = null; ST.scarfFly = null; pullTo(ctx, 'mind_lyron'); });
}

/* ================= MÀN B — 2 ĐÁNH 1 VỚI LYRON ================= */
const RB = { spd: [72, 96], keep: 56, dmg: { whip: 0.09, whip3: 0.12, legs: 0.14, bolt: 0.12, dash: 0.1, ult: 0.16, arc: 0.09 }, cd: { arc: 8, whip: 2.4, legs: 7.5, bolt: 9, dash: 4.5 } };
const RK_ON_LY = 0.5;
function lyHp(ctx) { const h = ctx.hero, per = h ? h.atk + h.weaponBonus(h.swordTier) : 60, ra = LV.atkOf(rkLv(ctx)); return easyHp(Math.round(per * 118 + ra * 62)); }   /* plan-36: trận ~3–4 phút */   /* 2026-10-14: thêm Siêu Cấp + tiếng vọng → máu bớt ~15 % để trận ~3–4 phút */
function startFightB(ctx) {
  loadChad(); loadBlack();
  const t = L(ctx), h = sv(ctx), c = center(ctx); if (!(ST.replay || REPLAY_ON)) { h.stage = 'fightB'; ctx.persist(); }   /* plan-43 C1: ôn lại (tượng) KHÔNG ghi stage — trước đây ghi 'fightB' nên ngất / thoát giữa lần ôn là save bị kéo về trận */
  ST.phase = 'B'; ST.lb = 0; ST.cd = { whip: 1, legs: 3, bolt: 6, dash: 2, arc: 4, ...ECHO_CD0 }; hzClear(ctx); ST.seq = []; ST.skN = {}; ST.ult = [0.3, 0.12]; ST.whipN = 0; ST.tgt = 'p'; ST.tgtT = 0; ST.agR = 0;
  const hp = lyHp(ctx), ly = ST.ly || { x: c.x, y: c.y - 40 };
  const mo = ctx.monsters.add({ key: 'lyron_boss', vi: STR.vi.lyName, en: STR.en.lyName, hp, dmg: 0, armor: 0, sp: 0, xp: 0, w: 22, h: 40, c: ['#2a1a20', '#ff1f4b', '#ffd0d8'], lyBoss: true,
    aiFn: (c2, m2, dt, p, dp, canHit) => aiLy(c2, m2, dt, p, dp, canHit), drawFn: (g, m2, x, y) => drawLy(g, m2, x, y, lift(ctx)), onFall: () => true, tip: { vi: STR.vi.fightB, en: STR.en.fightB } }, ly.x, ly.y);
  poise(mo); Object.assign(mo, { dir: 'south', clip: 'idle', ft: 0, act: null, lastHp: hp, enr: false, tiredT: 0, lift: lift(ctx) });
  ST.replay = ST.replay || REPLAY_ON; REPLAY_ON = false;
  if (h.cpB && !ST.replay) { mo.hp = mo.lastHp = Math.round(hp * 0.5); mo.enr = true; mo.form = 'black'; loadBlack(); chadBox(mo); Object.assign(ST.cd, CHAD_CD0, FU_CD0); for (const k in FU_LATE) ST.cd[k] = 2 + Math.random() * 4; log('checkpoint B 50%'); }   /* vào lại sau mốc 50 %: Siêu Cấp + nổi giận ngay */
  else ST.xformStart = true;   /* 2026-10-14 anh: bỏ đoạn Lyron thường — vào tâm trí là BIẾN HÌNH ngay, cả trận là Lyron Siêu Cấp */   /* ngất / rời sân sau mốc 50 % → đánh tiếp từ 50 % */
  if (typeof document !== 'undefined') { const bn = document.getElementById('px-banner'); if (bn) bn.hidden = true; }   /* gợi ý 'chém nút khăn' của Màn A không kéo sang Màn B */
  ST.lyMo = mo; ST.ly = null; ST.banner = { txt: t.fightB, t: 2.6 }; ST.startB = ST.t; log('fightB hp ' + hp);
  if (ST.xformStart) { ST.xformStart = false; startXform(ctx, mo); }
}
const SKB = [
  { k: 'ult', tier: 5, ok: (mo, d) => ST.ult.length && mo.hp / mo.max <= ST.ult[0] },
  { k: 'legs', tier: 3, ok: (mo, d) => ST.cd.legs <= 0 },
  { k: 'bolt', tier: 3, ok: (mo, d) => ST.cd.bolt <= 0 && d < 220 },
  { k: 'arc', tier: 3, ok: (mo, d) => ST.cd.arc <= 0 && d < 150 },
  { k: 'hha', tier: 3, ok: (mo, d) => ST.cd.hha <= 0 && d < 230 },
  { k: 'tent', tier: 3, ok: () => ST.cd.tent <= 0 },
  { k: 'dash', tier: 2, ok: (mo, d) => ST.cd.dash <= 0 && d > 70 && d < 210 },
  { k: 'whip', tier: 2, ok: (mo, d) => ST.cd.whip <= 0 && d <= 66 },
];
function tgPos(ctx) { if (ST.tgt === 'r') { const r = rkPos(ctx); if (r) return r; } return ctx.S.player; }
function aggro(ctx, dt) {
  ST.tgtT += dt; ST.agR = Math.max(0, ST.agR - dt * 1.5); const r = rkPos(ctx);
  if (!r) { if (ST.tgt !== 'p') { ST.tgt = 'p'; ST.tgtT = 0; } return; }
  if (ST.tgt === 'p' && ST.agR > 8 && ST.tgtT > 3) { ST.tgt = 'r'; ST.tgtT = 0; log('aim r'); }
  else if (ST.tgt === 'r' && ST.tgtT > 5) { ST.tgt = 'p'; ST.tgtT = 0; ST.agR = 0; log('aim p'); }
}
function aiLy(ctx, mo, dt, p, dp, canHit) {
  CUR = ctx; const t = L(ctx); mo.ft += dt; if (mo.flash > 0) mo.flash -= dt;
  if (mo.lockHp != null) { if (mo.hp < mo.lockHp) mo.hp = mo.lockHp; }
  else if (mo.tiredT > 0 && mo.hp < mo.lastHp) mo.hp -= Math.round((mo.lastHp - mo.hp) * 0.5);   /* kiệt sức: ăn thêm 50 % */
  if (mo.hp <= 0) { mo.hp = 0; return lyDown(ctx, mo); }
  mo.lastHp = mo.hp;
  if (!mo.enr && mo.hp / mo.max < 0.5) { mo.enr = true; if (!ST.replay) { sv(ctx).cpB = true; ctx.persist(); } log('enraged'); return startBlacken(ctx, mo); }   /* SỬA THEO ANH: < 50 % = HẮC HÓA */
  if (false) { ST.cd.strong = 0; for (const k of ['hole', 'clock', 'mirror', 'drum', 'burrow', 'hdash']) ST.cd[k] = Math.min(ST.cd[k] ?? 0, 1.5); let i0 = 0; for (const k in FU_LATE) ST.cd[k] = Math.min(ST.cd[k] ?? 0, 1 + 3 * i0++); log('enraged'); }   /* < 50 %: mở 4 chiêu hợp thể sau */   /* < 50 %: nổi giận — mở tiếng vọng mạnh + nối chiêu */
  for (const k in ST.cd) if (ST.cd[k] > 0) ST.cd[k] -= dt;
  aggro(ctx, dt);
  if (mo.tiredT > 0) { mo.tiredT -= dt; mo.clip = 'hurt'; mo.prog = null; return; }
  if (mo.act) { const A = mo.act; A.age = (A.age || 0) + dt; ST.actMax[A.k] = Math.max(ST.actMax[A.k] || 0, A.age); return actB(ctx, mo, A, dt, p); }
  mo.clip = 'idle'; mo.prog = null; if (ctx.hero && ctx.hero.fainted) return;   /* sân trời: p.custom (chong chóng) làm canHit của monsters.js luôn false → tự xét ngất */
  const tp = tgPos(ctx), d = dist(mo, tp); mo.dir = dirOf(tp.x - mo.x, tp.y - mo.y);
  const k = pick(isChad(mo) ? SKF : SKB, mo, d); if (k) return startB(ctx, mo, k, tp);   /* plan-36: bộ chiêu hợp thể */
  if (d > (isChad(mo) ? 34 : RB.keep)) { moveTo(mo, tp.x, tp.y, RB.spd[mo.enr ? 1 : 0] * (isBlack(mo) ? 1.25 : 1), dt); if (isChad(mo)) mo.clip = 'walk'; }
  keepIn(ctx, mo);
}
const cdm = mo => (mo.form === 'chad' ? 1.5 : mo.enr ? 0.75 : 1);   /* Siêu Cấp: chiêu cũ thưa hơn để chiêu chad nổi bật */
function startB(ctx, mo, k, tp) {
  const t = L(ctx); log('B ' + k + ' @' + ST.tgt);
  if (startEcho(ctx, mo, k, tp)) return;
  if (ECHO[k]) ST.callout = { txt: echoTxt(ctx, k), t: 2.4 }; else if (k !== 'whip') ST.banner = { txt: t.sk[k], t: 1.3 };
  if (k === 'whip') {
    ST.cd.whip = RB.cd.whip * cdm(mo); ST.whipN++; const a = Math.atan2(tp.y - mo.y, tp.x - mo.x), T0 = 0.5;
    mo.act = { k, t: T0, T0, a, len: 68, heavy: ST.whipN % 3 === 0 }; mo.clip = 'whip'; mo.prog = 0; mo.dir = dirOf(Math.cos(a), Math.sin(a));
    tpush(ctx, { type: 'l', x: mo.x, y: mo.y, a, len: 68, w: 20, t: T0, T0, act: mo.act, col: '#ff3060' }); ctx.sfx('swing'); return;
  }
  if (k === 'dash') {
    ST.cd.dash = RB.cd.dash * cdm(mo); const a = Math.atan2(tp.y - mo.y, tp.x - mo.x), T0 = 0.45, len = Math.min(220, dist(mo, tp) + 40);
    mo.act = { k, ph: 'aim', t: T0, a, len, hitP: false, hitR: false }; mo.clip = 'whip'; mo.prog = 0.1; tpush(ctx, { type: 'l', x: mo.x, y: mo.y, a, len, w: 16, t: T0, T0, act: mo.act }); return;
  }
  if (k === 'legs') {
    ST.cd.legs = RB.cd.legs * cdm(mo); mo.act = { k, t: 0.7, T: 0.7 }; mo.clip = 'slam'; mo.prog = 0;
    const p = ctx.S.player, r = rkPos(ctx), pts = [{ x: tp.x, y: tp.y }];
    const other = ST.tgt === 'r' ? p : r; if (other) pts.push({ x: other.x, y: other.y });
    const vx = (p.x - (ST.pPrev ? ST.pPrev.x : p.x)), vy = (p.y - (ST.pPrev ? ST.pPrev.y : p.y)); pts.push({ x: p.x + vx * 18 + (Math.random() - 0.5) * 30, y: p.y + vy * 18 + (Math.random() - 0.5) * 30 });
    for (let i = 0; i < 2; i++) { const a = Math.random() * TAU, rr = 30 + Math.random() * 30; pts.push({ x: tp.x + Math.cos(a) * rr, y: tp.y + Math.sin(a) * rr }); }
    pts.forEach((q, i) => spawnLeg(ctx, q.x, q.y, 1.0 + i * 0.12, RB.dmg.legs)); ctx.sfx('rumble'); return;
  }
  if (k === 'bolt') {
    ST.cd.bolt = RB.cd.bolt * cdm(mo); mo.act = { k, t: 0.8, T: 0.8 }; mo.clip = 'cast'; mo.prog = 0;
    const p0 = ctx.S.player, vx = p0.x - (ST.pPrev ? ST.pPrev.x : p0.x), vy = p0.y - (ST.pPrev ? ST.pPrev.y : p0.y);
    tpush(ctx, { type: 'c', x: tp.x, y: tp.y, r: 14, t: 1.0, T0: 1.0, bolt: true });
    const o = ST.tgt === 'r' ? p0 : rkPos(ctx); if (o) tpush(ctx, { type: 'c', x: o.x, y: o.y, r: 14, t: 1.25, T0: 1.25, bolt: true });
    tpush(ctx, { type: 'c', x: p0.x + vx * 24, y: p0.y + vy * 24, r: 14, t: 1.5, T0: 1.5, bolt: true });   /* chỗ người chơi sắp chạy tới */
    ctx.sfx('thunder'); return;
  }
  if (k === 'arc') {   /* XÍCH LÔI: sét rẽ nhánh phóng từ TAY Lyron (khăn toé điện) tới người chơi + Rocky trong tầm */
    ST.cd.arc = RB.cd.arc * cdm(mo); mo.act = { k, ph: 'wind', t: 0.6, T: 0.6 }; mo.clip = 'cast'; mo.prog = 0; ctx.sfx('thunder'); return;
  }
  if (k === 'ult') {
    ST.ult.shift(); const c = center(ctx); mo.act = { k, ph: 'go', t: 0, waves: 0, c }; mo.lockHp = mo.hp; mo.clip = 'cast'; mo.prog = 0; ctx.sfx('roar'); if (ctx.quake) ctx.quake(0.5);
    ST.lb = 0.01; ST.ultN = (ST.ultN || 0) + 1; return;
  }
}
/* ================= LYRON SIÊU CẤP + TIẾNG VỌNG TRÙM (anh 2026-10-14) =================
   Lyron là kẻ thiết kế MỌI trùm → dùng lại chiêu đặc trưng của từng trùm (đổi tông đỏ thẫm–tím), mỗi lần dùng có dòng
   'Lyron dùng: <chiêu> (<trùm>)'. Lyron thường: vài tiếng vọng nhẹ. ~50 % máu: BIẾN HÌNH 'Lyron Siêu Cấp' (chad sigma, PixelLab v3
   boss/lyron_chad) → mở khoá tiếng vọng mạnh + đôi khi nối 2 chiêu. Mọi chiêu: hồi chiêu riêng, báo trước bằng sương/ảnh, trúng mọi phía,
   đòn mạnh hất bay cả người chơi lẫn Rocky; sau tiếng vọng mạnh Lyron hụt hơi ~1,4 s (cửa sổ đánh trả). */
const ECHO = {
  legs: ['vi:Vạn Túc Trồi|en:Thousand Legs', 'vi:Ngô Công Lôi Thần|en:Thunder Centipede'],
  bolt: ['vi:Sét Trời|en:Sky Lightning', 'vi:Trống Đồng|en:Bronze Drum'],
  hha: ['vi:Hắc-ha|en:Dark-Ha', 'vi:Hắc Rocky|en:Dark Rocky'],
  tent: ['vi:Xúc Tu Trồi|en:Rising Tentacles', 'vi:Kraken|en:Kraken'],
  hole: ['vi:Hố Đen Nuốt|en:Devouring Hole', 'vi:Hố Đen|en:Black Hole'],
  clock: ['vi:Ngưng Đọng Thời Gian|en:Time Stasis', 'vi:Đồng Hồ|en:The Clock'],
  mirror: ['vi:Lăng Kính Phản Chiếu|en:Prism Mirrors', 'vi:Nữ Hoàng Pha Lê|en:Crystal Queen'],
  drum: ['vi:Trống Trận Rền|en:War Drum Waves', 'vi:Trống Đồng|en:Bronze Drum'],
  burrow: ['vi:Độn Thổ Cắn|en:Burrow Bite', 'vi:Ngô Công Lôi Thần|en:Thunder Centipede'],
  hdash: ['vi:Hắc Siêu Cấp Lướt|en:Dark Super Dash', 'vi:Hắc Rocky|en:Dark Rocky'],
};
const CHAD_NOTE = 'Lyron Siêu Cấp KHÔNG quàng khăn (anh 2026-10-14): khăn đứt lúc biến hình; Thòng Lọng Khăn = vệt khăn đỏ (VFX ly_scarf_lash)';
const CHAD_SK = { vi: { flexwave: 'Gồng Sóng Chấn!', dbl: 'Tạo Dáng Hai Tay — CHOÁNG!', pound: 'Đấm Đất!', lasso: 'Thòng Lọng Khăn!', stare: 'Ánh Nhìn Sigma!', punch: '' },
  en: { flexwave: 'Flex Shockwave!', dbl: 'Double-Bicep Stun!', pound: 'Ground Pound!', lasso: 'Scarf Lasso!', stare: 'Sigma Stare!', punch: '' } };
const pickLang = (s, vi) => { const m = s.split('|').map(x => x.split(':')); const f = m.find(x => x[0] === (vi ? 'vi' : 'en')); return f ? f.slice(1).join(':') : s; };
const echoTxt = (ctx, k) => { const e = ECHO[k], vi = ctx.lang() === 'vi'; return e ? (vi ? 'Lyron dùng: ' : 'Lyron uses: ') + pickLang(e[0], vi) + ' (' + pickLang(e[1], vi) + ')' : ''; };
const RE = { cd: { hha: 10, tent: 11, hole: 17, clock: 15, mirror: 14, drum: 12, burrow: 13, hdash: 12, flexwave: 8, dbl: 10, pound: 7, lasso: 7, stare: 10, punch: 1.6 },
  dmg: { hha: 0.11, tent: 0.1, hole: 0.1, clock: 0.07, mirror: 0.1, drum: 0.09, burrow: 0.13, hdash: 0.08, flexwave: 0.11, dbl: 0.05, pound: 0.13, lasso: 0.07, stare: 0.12, punch: 0.09 } };   /* cân bằng: bot cấp ~48 thắng trong ~3–4 phút */
const STRONG = { hole: 1, clock: 1, mirror: 1, drum: 1, burrow: 1, hdash: 1 };
const COMBO = { clock: ['pound', 'stare'], hole: ['drum', 'flexwave'], mirror: ['stare', 'hha'], drum: ['pound'], burrow: ['flexwave'], hdash: ['punch', 'lasso'] };
const SKC = [   /* Lyron Siêu Cấp */
  { k: 'ult', tier: 5, ok: (mo, d) => ST.ult.length && mo.hp / mo.max <= ST.ult[0] },
  { k: 'combo', tier: 6, ok: () => !!ST.comboK },
  { k: 'hole', tier: 4, ok: (mo) => mo.enr && !(ST.cd.strong > 0) && ST.cd.hole <= 0 },
  { k: 'clock', tier: 4, ok: (mo) => mo.enr && !(ST.cd.strong > 0) && ST.cd.clock <= 0 },
  { k: 'mirror', tier: 4, ok: (mo) => mo.enr && !(ST.cd.strong > 0) && ST.cd.mirror <= 0 },
  { k: 'drum', tier: 4, ok: (mo, d) => mo.enr && !(ST.cd.strong > 0) && ST.cd.drum <= 0 && d < 170 },
  { k: 'burrow', tier: 4, ok: (mo, d) => mo.enr && !(ST.cd.strong > 0) && ST.cd.burrow <= 0 && d > 50 },
  { k: 'hdash', tier: 4, ok: (mo, d) => mo.enr && !(ST.cd.strong > 0) && ST.cd.hdash <= 0 && d > 60 },
  { k: 'flexwave', tier: 3, ok: (mo, d) => ST.cd.flexwave <= 0 && d < 100 },
  { k: 'pound', tier: 3, ok: (mo, d) => ST.cd.pound <= 0 && d > 50 && d < 210 },
  { k: 'stare', tier: 3, ok: (mo, d) => ST.cd.stare <= 0 && d < 240 },
  { k: 'tent', tier: 3, ok: () => ST.cd.tent <= 0 },
  { k: 'hha', tier: 3, ok: (mo, d) => ST.cd.hha <= 0 && d < 240 },
  { k: 'bolt', tier: 3, ok: (mo, d) => ST.cd.bolt <= 0 && d < 220 },
  { k: 'legs', tier: 3, ok: () => ST.cd.legs <= 0 },
  { k: 'dbl', tier: 3, ok: (mo, d) => ST.cd.dbl <= 0 && d < 70 },
  { k: 'lasso', tier: 3, ok: (mo, d) => ST.cd.lasso <= 0 && d > 36 && d < 160 },
  { k: 'punch', tier: 2, ok: (mo, d) => ST.cd.punch <= 0 && d <= 42 },
];
const ECHO_CD0 = { hha: 3, tent: 6 };
const CHAD_CD0 = { hole: 3, clock: 7, mirror: 11, drum: 5, burrow: 9, hdash: 6, flexwave: 2, dbl: 4, pound: 1.5, lasso: 3, stare: 6, punch: 0.5, hha: 8, tent: 10, bolt: 12, legs: 14 };
const isChad = mo => mo && (mo.form === 'chad' || mo.form === 'black');
function chadBox(mo) { if (mo && mo.c) { mo.c.w = 24; mo.c.h = 30; } }   /* thân to hơn → vùng trúng đòn to hơn */

/* ---- biến hình ~50 % ---- */
function startXform(ctx, mo) {
  const t = L(ctx); mo.act = { k: 'xform', t: 0, T: 3.4 }; mo.lockHp = mo.hp; ST.lb = 0.01; ST.tele = ST.tele.filter(q => !q.act); ST.hz = [];
  ctx.sfx('roar'); log('xform'); ST.stats.xform = (ST.stats.xform || 0) + 1;
  hitBoth(ctx, q => dist(q, mo) < 70, 0.03, mo, 'stagger');   /* sóng gồng đẩy lùi nhẹ (không ăn gian) */
}
function tickXform(ctx, mo, A, dt) {
  const t = L(ctx), a0 = A.t; A.t += dt; const at = x => a0 < x && A.t >= x;
  mo.clip = isChad(mo) ? 'flex' : 'cast'; mo.prog = Math.min(0.99, (A.t % 1.2) / 1.2);
  if (at(0.05)) { for (let i = 0; i < 2; i++) fx('ly_scarf_lash_s', mo.x, mo.y - 14, { ang: i * Math.PI + 0.4, top: true }); ST.callout = { txt: t.xform1, t: 1.6 }; }   /* khăn quất tứ phía */
  if (at(0.7)) { fx('hr_morph', mo.x, mo.y + 2, { sheet: crimSheet('hr_morph'), dur: 1.0, alpha: 0.9 }); fx('hd_implode', mo.x, mo.y - 16, { sheet: violSheet('hd_implode'), top: true }); if (ctx.quake) ctx.quake(0.4); ctx.sfx('rumble'); }   /* hào quang đỏ-tím (sự kiện ngắn) */
  if (at(1.35)) { ST.scarfTear = { x: mo.x, y: mo.y - 30, t: 0, vx: (Math.random() < 0.5 ? -1 : 1) * 40 }; mo.form = 'chad'; chadBox(mo); fx('gm_shatter', mo.x, mo.y - 10, { sheet: violSheet('gm_shatter'), top: true }); fx('hr_shards', mo.x, mo.y - 6, { sheet: crimSheet('hr_shards'), top: true }); ctx.S.flash = 0.7; if (ctx.quake) ctx.quake(0.6); ctx.sfx('boom'); ST.banner = { txt: t.xform2, t: 2.6 }; log('chad on'); }   /* áo rách, cơ phồng */
  if (A.t >= A.T) { mo.act = null; mo.lockHp = null; ST.lb = 0; for (const k in CHAD_CD0) ST.cd[k] = CHAD_CD0[k]; Object.assign(ST.cd, FU_CD0); ST.cd.ult = 0; ST.banner = { txt: L(ctx).fightB, t: 2.2 }; log('xform done'); }
}

/* ---- khởi chiêu tiếng vọng / chiêu chad ---- */
function startEcho(ctx, mo, k, tp) {
  const t = L(ctx), p = ctx.S.player, r = rkPos(ctx);
  if (k === 'combo') { const k2 = ST.comboK; ST.comboK = null; ST.seq.pop(); rec(k2); log('combo ' + k2); return startEcho(ctx, mo, k2, tp) || (startB(ctx, mo, k2, tp), true); }
  if (startFusion(ctx, mo, k, tp)) return true;
  if (!(k in RE.cd)) return false;
  ST.cd[k] = RE.cd[k] * (isChad(mo) ? (k === 'hha' || k === 'tent' ? 1.5 : 1) : 1.15); ST.stats.echo = (ST.stats.echo || 0) + (ECHO[k] ? 1 : 0);
  if (ECHO[k]) ST.callout = { txt: echoTxt(ctx, k), t: 2.4 }; else if (CHAD_SK.vi[k]) ST.banner = { txt: CHAD_SK[ctx.lang() === 'vi' ? 'vi' : 'en'][k], t: 1.3 };
  const aim = Math.atan2(tp.y - mo.y, tp.x - mo.x); mo.dir = dirOf(Math.cos(aim), Math.sin(aim));
  if (k === 'hha' || k === 'stare') {   /* Hắc-ha (beam tối của Hắc Rocky) / Ánh Nhìn Sigma (tia tím từ mắt): ngắm → bắn thẳng */
    const T0 = k === 'stare' ? 1.0 : 0.9, len = 172; mo.act = { k, ph: 'aim', t: T0, T0, a: aim, len, hit: {} }; mo.clip = isChad(mo) ? (k === 'stare' ? 'stare' : 'punch') : 'cast'; mo.prog = 0;
    tpush(ctx, { type: 'l', x: mo.x, y: mo.y, a: aim, len, w: 22, t: T0, T0, act: mo.act, col: k === 'hha' ? '#3a1050' : '#a040ff' }); ctx.sfx('charge'); return true;
  }
  if (k === 'tent') {   /* xúc tu Kraken (ảnh/clip của Kraken) trồi dưới chân người chơi + Rocky + vòng quanh */
    const pts = [{ x: p.x, y: p.y }]; if (r) pts.push({ x: r.x, y: r.y }); const n = isChad(mo) ? 4 : 2;
    for (let i = 0; i < n; i++) { const a = Math.random() * TAU, R0 = 28 + Math.random() * 36; pts.push({ x: tp.x + Math.cos(a) * R0, y: tp.y + Math.sin(a) * R0 }); }
    for (const q of pts) { ST.tents.push({ x: q.x, y: q.y, st: 'warn', t: KR.WARN + 0.2, cx0: mo.x, hit: false }); tpush(ctx, { type: 'c', x: q.x, y: q.y, r: 16, t: KR.WARN + 0.2, T0: KR.WARN + 0.2, act: { k: 'tentTele' }, col: '#a03cc0' }); }   /* báo trước = vệt sương tím (không vẽ vòng tròn code của kraken.js) */
    mo.act = { k, t: 0.7, T: 0.7 }; mo.clip = isChad(mo) ? 'pound' : 'slam'; mo.prog = 0; ctx.sfx('rumble'); return true;
  }
  if (k === 'hole') {   /* Hố Đen: hố chính giữa người chơi–Rocky hút vào + 2 hố nhỏ */
    const c = r ? { x: (p.x + r.x) / 2, y: (p.y + r.y) / 2 } : { x: p.x + (Math.random() - 0.5) * 40, y: p.y - 30 };
    ST.hz.push({ k: 'hole', x: c.x, y: c.y, t: 0, T: 3.6, R: 12, pull: 25, big: true, hitP: false, hitR: false });
    for (let i = 0; i < 2; i++) { const a = Math.random() * TAU; ST.hz.push({ k: 'hole', x: c.x + Math.cos(a) * 70, y: c.y + Math.sin(a) * 50, t: -0.4 * (i + 1), T: 2.8, R: 9, pull: 12, big: false, hitP: false, hitR: false }); }
    fx('hd_implode', c.x, c.y, { sheet: violSheet('hd_implode') }); mo.act = { k, t: 1.0, T: 1.0 }; mo.clip = isChad(mo) ? 'flex' : 'cast'; mo.prog = 0; ctx.sfx('charge'); return true;
  }
  if (k === 'clock') {   /* Đồng Hồ: vùng mặt đồng hồ làm CHẬM dưới người chơi + Rocky, hết giờ kim quất */
    for (const q of [p, r].filter(Boolean)) ST.hz.push({ k: 'clock', x: q.x, y: q.y, t: 0, T: 3.8, R: 44, struck: false });
    mo.act = { k, t: 0.8, T: 0.8 }; mo.clip = isChad(mo) ? 'flex' : 'cast'; mo.prog = 0; ctx.sfx('chime'); return true;
  }
  if (k === 'mirror') {   /* Nữ Hoàng Pha Lê: 3 mảnh gương quanh người chơi + 1 bóng gương của Lyron; tia nối các mảnh */
    const c = { x: p.x, y: p.y }, a0 = Math.random() * TAU, sh = [0, 1, 2].map(i => ({ x: c.x + Math.cos(a0 + i * TAU / 3) * 62, y: c.y + Math.sin(a0 + i * TAU / 3) * 46 }));
    const cl = { x: c.x + Math.cos(a0 + Math.PI / 3) * 90, y: c.y + Math.sin(a0 + Math.PI / 3) * 66 };
    ST.hz.push({ k: 'mirror', sh, cl, t: 0, T: 2.25, fire: 1.45, hitP: false, hitR: false, dir: dirOf(c.x - cl.x, c.y - cl.y) });
    for (const q of sh) fx('gm_arrive', q.x, q.y + 4, { sheet: violSheet('gm_arrive') });
    for (let i = 0; i < 3; i++) { const a = sh[i], b = sh[(i + 1) % 3]; tpush(ctx, { type: 'l', x: a.x, y: a.y, a: Math.atan2(b.y - a.y, b.x - a.x), len: Math.hypot(b.x - a.x, b.y - a.y), w: 14, t: 1.45, T0: 1.45, act: { k: 'mirrorTele' }, col: '#a060ff' }); }
    mo.act = { k, t: 0.9, T: 0.9 }; mo.clip = isChad(mo) ? 'flex' : 'cast'; mo.prog = 0; ctx.sfx('glass'); return true;
  }
  if (k === 'drum' || k === 'flexwave') {   /* Trống Đồng: 3 vòng sóng rền / Gồng Sóng Chấn: 1 vòng to — nhảy qua bằng cách giữ khoảng cách */
    const n = k === 'drum' ? 3 : 1; for (let i = 0; i < n; i++) ST.hz.push({ k: 'ring', x: mo.x, y: mo.y, t: -1.0 - i * 0.7, R: 0, sp: k === 'drum' ? 120 : 150, max: k === 'drum' ? 190 : 120, dmg: RE.dmg[k], hitP: false, hitR: false });
    mo.act = { k, t: 0.85 + (n - 1) * 0.65, T: 0.85 + (n - 1) * 0.65 }; mo.clip = isChad(mo) ? 'flex' : 'cast'; mo.prog = 0; ctx.sfx(k === 'drum' ? 'drum' : 'roar'); return true;
  }
  if (k === 'burrow') {   /* Ngô Công: lặn xuống đất, vòng báo bám theo mục tiêu rồi khoá, trồi lên cắn */
    mo.act = { k, ph: 'sink', t: 0, tx: tp.x, ty: tp.y }; mo.lockHp = mo.hp; fx('bk_erupt_soil', mo.x, mo.y + 6, { dur: 0.7, alpha: 0.8 }); ctx.sfx('rumble'); return true;
  }
  if (k === 'hdash') {   /* Hắc Rocky: 3 cú lướt Siêu Cấp tối liên hoàn */
    mo.act = { k, n: 0, ph: 'aim', t: 0.4, a: aim, len: Math.min(200, dist(mo, tp) + 40), hit: {} }; tpush(ctx, { type: 'l', x: mo.x, y: mo.y, a: aim, len: mo.act.len, w: 16, t: 0.4, T0: 0.4, act: mo.act, col: '#401060' }); return true;
  }
  if (k === 'dbl') { mo.act = { k, t: 1.0, T: 1.0 }; mo.clip = 'flex'; mo.prog = 0; tpush(ctx, { type: 'c', x: mo.x, y: mo.y, r: 46, t: 1.0, T0: 1.0, act: mo.act, col: '#ff4070' }); ctx.sfx('charge'); return true; }
  if (k === 'pound') { const T0 = 0.75; mo.act = { k, ph: 'up', t: 0, T0, x0: mo.x, y0: mo.y, tx: tp.x, ty: tp.y }; mo.clip = 'pound'; mo.prog = 0; tpush(ctx, { type: 'c', x: tp.x, y: tp.y, r: 26, t: T0, T0, act: mo.act, col: '#ff4070' }); ctx.sfx('jump'); return true; }
  if (k === 'lasso') { const T0 = 0.6; mo.act = { k, ph: 'aim', t: T0, a: aim, len: 150 }; mo.clip = 'lasso'; mo.prog = 0; tpush(ctx, { type: 'l', x: mo.x, y: mo.y, a: aim, len: 150, w: 14, t: T0, T0, act: mo.act, col: '#ff3060' }); ctx.sfx('swing'); return true; }
  if (k === 'punch') { ST.punchN = (ST.punchN || 0) + 1; mo.act = { k, t: 0.38, T: 0.38, a: aim, heavy: ST.punchN % 3 === 0 }; mo.clip = 'punch'; mo.prog = 0; tpush(ctx, { type: 'l', x: mo.x, y: mo.y, a: aim, len: 40, w: 22, t: 0.38, T0: 0.38, act: mo.act, col: '#ff3060' }); return true; }
  return false;
}
function endEcho(ctx, mo, k) {   /* xong 1 chiêu: tiếng vọng mạnh → hụt hơi ngắn; Siêu Cấp đôi khi nối chiêu */
  mo.act = null;
  if (STRONG[k]) { ST.cd.strong = 6.5; mo.tiredT = 2.0;   /* giữa 2 tiếng vọng mạnh: ≥ 5,5 s cho chiêu Siêu Cấp riêng (đấm, gồng, thòng lọng, ánh nhìn) */ if (isChad(mo) && mo.enr && !ST.comboK && Math.random() < 0.3 && COMBO[k]) { const k2 = COMBO[k][(Math.random() * COMBO[k].length) | 0]; if (ST.seq.slice(-2).filter(x => x === k2).length < 2) { ST.comboK = k2; mo.tiredT = 0.25; } } }
}
function actEcho(ctx, mo, A, dt, p) {
  if (A.k === 'xform') { tickXform(ctx, mo, A, dt); return true; }
  if (A.k === 'blacken') { tickBlacken(ctx, mo, A, dt); return true; }
  if (A.fu) { actFusion(ctx, mo, A, dt, p); return true; }
  if (!(A.k in RE.cd)) return false;
  const r = rkPos(ctx);
  if (A.k === 'hha' || A.k === 'stare') {
    if (A.ph === 'aim') { A.t -= dt; mo.prog = Math.min(0.6, 1 - A.t / A.T0);
      if (A.k === 'stare' && A.t > 0.3) { const tp = tgPos(ctx), na = Math.atan2(tp.y - mo.y, tp.x - mo.x); let da = na - A.a; while (da > Math.PI) da -= TAU; while (da < -Math.PI) da += TAU; A.a += Math.max(-1, Math.min(1, da)) * dt * 0.9; const q = ST.tele.find(x => x.act === A); if (q) q.a = A.a; }   /* ánh nhìn bám chậm rồi khoá 0,3 s */
      if (A.t <= 0) { A.ph = 'fire'; A.t = 0.55; A.ft = 0; ctx.sfx(A.k === 'hha' ? 'beam' : 'zap'); ctx.S.flash = Math.max(ctx.S.flash || 0, 0.15); } return true; }
    A.t -= dt; A.ft += dt; mo.prog = 0.75;
    const h = { x: mo.x, y: mo.y - 12 }, b = { x: h.x + Math.cos(A.a) * A.len, y: h.y + Math.sin(A.a) * A.len };
    hitOnce(ctx, A.hit, q => segDist({ x: q.x, y: q.y - 8 }, h, b) < 12, RE.dmg[A.k], mo, 'fly');
    if (A.t <= 0) endEcho(ctx, mo, A.k); return true;
  }
  if (A.k === 'hdash') {
    if (A.ph === 'aim') { A.t -= dt; if (A.t <= 0) { A.ph = 'go'; A.go = 0; ctx.sfx('dash'); } return true; }
    const sp = 380 * dt; A.go += sp; mo.x += Math.cos(A.a) * sp; mo.y += Math.sin(A.a) * sp; mo.clip = isChad(mo) ? 'punch' : 'whip'; mo.prog = 0.6; keepIn(ctx, mo); if (mo._blk) A.go = A.len;
    if (Math.random() < dt * 20) fx('hr_morph', mo.x, mo.y + 2, { sheet: bSheet('hr_morph', true) || violSheet('hr_morph'), dur: 0.35, alpha: 0.6 });   /* vệt tối Siêu Cấp */
    hitOnce(ctx, A.hit, q => dist(q, mo) < 16, RE.dmg.hdash, mo, 'fly');
    if (A.go >= A.len) { A.n++; if (A.n >= 3) { endEcho(ctx, mo, 'hdash'); return true; } const tp = tgPos(ctx); A.a = Math.atan2(tp.y - mo.y, tp.x - mo.x); A.len = Math.min(200, dist(mo, tp) + 40); A.ph = 'aim'; A.t = 0.35; A.hit = {}; tpush(ctx, { type: 'l', x: mo.x, y: mo.y, a: A.a, len: A.len, w: 16, t: 0.35, T0: 0.35, act: A, col: '#401060' }); }
    return true;
  }
  if (A.k === 'burrow') {
    A.t += dt; const tp = tgPos(ctx);
    if (A.ph === 'sink') { mo.alpha = Math.max(0, 1 - A.t / 0.45); if (A.t >= 0.5) { A.ph = 'track'; A.t = 0; A.q = { type: 'c', x: tp.x, y: tp.y, r: 22, t: 1.45, T0: 1.45, act: A, col: '#f0a848' }; tpush(ctx, A.q); } return true; }
    if (A.ph === 'track') { if (A.t < 0.9) { A.q.x += (tp.x - A.q.x) * Math.min(1, dt * 4); A.q.y += (tp.y - A.q.y) * Math.min(1, dt * 4); }
      if (A.t >= 1.45) { A.ph = 'bite'; A.t = 0; mo.x = A.q.x; mo.y = A.q.y; mo.alpha = 1; fx('bk_erupt_soil', mo.x, mo.y + 6, { dur: 0.8 }); fx('bk_snap', mo.x, mo.y - 10, { top: true }); if (ctx.quake) ctx.quake(0.4); ctx.sfx('bite');
        hitBoth(ctx, q => dist(q, mo) < 24, RE.dmg.burrow, { x: mo.x, y: mo.y + 6 }, 'fly'); } return true; }
    mo.clip = isChad(mo) ? 'pound' : 'slam'; mo.prog = Math.min(0.99, A.t / 0.5); if (A.t >= 0.5) { mo.lockHp = null; endEcho(ctx, mo, 'burrow'); } return true;
  }
  if (A.k === 'pound') {
    A.t += dt; const k = Math.min(1, A.t / A.T0); mo.x = A.x0 + (A.tx - A.x0) * k; mo.y = A.y0 + (A.ty - A.y0) * k; mo.hop = Math.sin(k * Math.PI) * 26; mo.prog = Math.min(0.6, k * 0.6);
    if (k >= 1 && !A.done) { A.done = true; mo.hop = 0; keepIn(ctx, mo); fx('knock_erupt', mo.x, mo.y + 3) || fx('dirt_puff', mo.x, mo.y + 3); fx('rk_shock', mo.x, mo.y + 2, { sheet: crimSheet('rk_shock') }); if (ctx.quake) ctx.quake(0.5); ctx.sfx('knock_land');
      hitBoth(ctx, q => dist(q, mo) < 30, RE.dmg.pound, { x: mo.x, y: mo.y + 4 }, 'fly'); A.t2 = 0.45; }
    if (A.done) { mo.prog = 0.8; A.t2 -= dt; if (A.t2 <= 0) endEcho(ctx, mo, 'pound'); } return true;
  }
  if (A.k === 'lasso') {
    A.t -= dt; mo.prog = Math.min(0.5, 1 - Math.max(0, A.t) / 0.6);
    if (A.t <= 0 && !A.done) { A.done = true; const a0 = { x: mo.x, y: mo.y - 6 }, b0 = { x: mo.x + Math.cos(A.a) * A.len, y: mo.y - 6 + Math.sin(A.a) * A.len };
      fx('ly_scarf_lash_s', mo.x + Math.cos(A.a) * 40, mo.y - 8 + Math.sin(A.a) * 40, { ang: A.a, top: true, ky: mo.y + (Math.sin(A.a || 0) < 0 ? -0.5 : 0.5) }); ctx.sfx('whip');   /* 2026-10-16 (QUY TẮC LỚP VẼ CHIÊU) */
      const p0 = ctx.S.player; if (segDist({ x: p0.x, y: p0.y - 4 }, a0, b0) < 12 && hurtPlayer(ctx, RE.dmg.lasso, { x: p0.x + Math.cos(A.a) * 40, y: p0.y + Math.sin(A.a) * 40 }, 'fly', 0.9)) { log('lasso caught'); if (!ST.comboK) ST.comboK = 'punch'; }   /* kéo người chơi VỀ phía Lyron → nối cú đấm */
      if (r && segDist({ x: r.x, y: r.y - 4 }, a0, b0) < 12) hurtRocky(ctx, RE.dmg.lasso, { x: r.x + Math.cos(A.a) * 40, y: r.y + Math.sin(A.a) * 40 }, 'fly'); for (const lp of (ctx.ltPets ? ctx.ltPets() : [])) if (segDist({ x: lp.x, y: lp.y - 4 }, a0, b0) < 12) ctx.ltHit(RE.dmg.lasso * 1.1, { x: lp.x + Math.cos(A.a) * 40, y: lp.y + Math.sin(A.a) * 40 }, 'fly', lp.id);
      A.t2 = 0.35; }
    if (A.done) { mo.prog = 0.85; A.t2 -= dt; if (A.t2 <= 0) endEcho(ctx, mo, 'lasso'); } return true;
  }
  if (A.k === 'punch') {
    A.t -= dt; mo.prog = Math.min(0.99, 1 - Math.max(0, A.t) / A.T) * 0.6 + (A.t <= 0 ? 0.35 : 0);
    if (A.t <= 0 && !A.done) { A.done = true; const a0 = { x: mo.x, y: mo.y - 6 }, b0 = { x: mo.x + Math.cos(A.a) * 40, y: mo.y - 6 + Math.sin(A.a) * 40 };
      hitBoth(ctx, q => segDist({ x: q.x, y: q.y - 6 }, a0, b0) < 14 || dist(q, mo) < 18, RE.dmg.punch, mo, A.heavy ? 'fly' : 'stagger'); fx('rk_punch_t4', b0.x, b0.y + 4, { sheet: crimSheet('rk_punch_t4') }) || fx('knock_jab', b0.x, b0.y); ctx.sfx('punch'); A.t2 = 0.25; }
    if (A.done) { A.t2 -= dt; if (A.t2 <= 0) endEcho(ctx, mo, 'punch'); } return true;
  }
  if (A.k === 'dbl') {
    A.t -= dt; mo.prog = Math.min(0.99, 1 - Math.max(0, A.t) / A.T);
    if (A.t <= 0 && !A.done) { A.done = true; fx('ult_thunderring', mo.x, mo.y + 20, { sheet: crimSheet('ult_thunderring'), alpha: 0.8 }); ctx.S.flash = Math.max(ctx.S.flash || 0, 0.25); ctx.sfx('roar');
      hitBoth(ctx, q => dist(q, mo) < 48, RE.dmg.dbl, mo, 'stagger'); if (dist(ctx.S.player, mo) < 48) ST.stunP = 0.9; A.t2 = 0.5; }   /* choáng ngắn (0,9 s) */
    if (A.done) { A.t2 -= dt; if (A.t2 <= 0) endEcho(ctx, mo, 'dbl'); } return true;
  }
  /* các chiêu còn lại: Lyron chỉ niệm/gồng, nguy hiểm nằm ở ST.hz / ST.tents */
  A.t -= dt; mo.prog = Math.min(0.99, 1 - Math.max(0, A.t) / (A.T || 1)); if (A.t <= -0.15) endEcho(ctx, mo, A.k); return true;
}
function hitOnce(ctx, H, test, frac, from, kind) {   /* mỗi đòn chỉ trúng mỗi người 1 lần */
  const p = ctx.S.player, r = rkPos(ctx);
  if (!H.p && test(p) && hurtPlayer(ctx, frac, from, kind, 1.1)) H.p = true;
  if (!H.r && r && ST.phase === 'B' && test(r)) { if (hurtRocky(ctx, frac, from, kind)) H.r = true; } if (!H.l && ltHitAt(ctx, test, frac, from, kind === 'fly' || kind === 'launch' ? 'fly' : 'hit')) H.l = true;
}

/* ---- nguy hiểm kéo dài (hố đen, đồng hồ, gương, vòng sóng) + xúc tu Kraken ---- */
function hzTick(ctx, dt) {
  const p = ctx.S.player, r = rkPos(ctx), m = ctx.S.map;
  let slow = false;
  for (const h of ST.hz) {
    h.t += dt; if (h.t < 0) continue;
    if (h.k === 'hole') {
      if (h.t < h.T) { const d = dist(p, h), knocked = ctx.knocked && ctx.knocked();
        if (d > 4 && d < 150 && !knocked && !(ctx.hero && ctx.hero.fainted)) { const s = Math.min(d - 2, h.pull * dt * (1 + (150 - d) / 150)); p.tryMove((h.x - p.x) / d * s, (h.y - p.y) / d * s, m, []); }   /* hút vào */
        if (!h.hitP && d < h.R + 4) { h.hitP = true; hurtPlayer(ctx, RE.dmg.hole, { x: h.x, y: h.y - 30 }, 'fly', 1.2); }
        if (!h.hitR && r && dist(r, h) < h.R + 6) { h.hitR = true; hurtRocky(ctx, RE.dmg.hole, { x: h.x, y: h.y - 30 }, 'fly'); } if (!h.hitL && ltHitAt(ctx, q => dist(q, h) < h.R + 6, RE.dmg.hole, { x: h.x, y: h.y - 30 }, 'fly')) h.hitL = true;
      } else if (!h.end) { h.end = true; fx('hd_nova', h.x, h.y + 10, { sheet: violSheet('hd_nova') }); }
    }
    if (h.k === 'clock') {
      if (h.t < h.T && dist(p, h) < h.R) slow = true;
      if (h.t >= h.T && !h.struck && h.broken) { h.struck = true; fx('gm_shatter', h.x, h.y + 6, { sheet: violSheet('gm_shatter') }); }   /* kim bị chém: vùng tan, không quất */
      if (h.t >= h.T && !h.struck) { h.struck = true; fx('gm_shatter', h.x, h.y + 6, { sheet: violSheet('gm_shatter') }); ctx.sfx('chime'); hitBoth(ctx, q => dist(q, h) < h.R, RE.dmg.clock, { x: h.x, y: h.y }, 'stagger'); }
    }
    if (h.k === 'mirror') {
      if (h.t >= h.fire && !h.fired) { h.fired = true; ctx.sfx('beam'); ctx.S.flash = Math.max(ctx.S.flash || 0, 0.2); for (const q of h.sh) fx('gm_glint', q.x, q.y - 6, { sheet: violSheet('gm_glint'), top: true }); }
      if (h.fired && h.t < h.fire + 0.45) {
        const segs = [[h.sh[0], h.sh[1]], [h.sh[1], h.sh[2]], [h.sh[2], h.sh[0]], [h.cl, ctx.S.player]];
        const on = q => segs.some(([a, b]) => segDist({ x: q.x, y: q.y - 6 }, { x: a.x, y: a.y - 6 }, { x: b.x, y: b.y - 6 }) < 10);
        if (!h.hitP && on(p) && hurtPlayer(ctx, RE.dmg.mirror, h.cl, 'fly', 1.0)) h.hitP = true;
        if (!h.hitR && r && on(r) && hurtRocky(ctx, RE.dmg.mirror, h.cl, 'fly')) h.hitR = true; if (!h.hitL && ltHitAt(ctx, on, RE.dmg.mirror, h.cl, 'fly')) h.hitL = true;
        if (!h.aimed) { h.aimed = true; h.tgt = { x: ctx.S.player.x, y: ctx.S.player.y }; segs[3][1] = h.tgt; }
      }
      if (h.t >= h.T && !h.end) { h.end = true; for (const q of h.sh) fx('gm_shatter', q.x, q.y + 4, { sheet: violSheet('gm_shatter') }); }
    }
    if (h.k === 'ring') {
      h.R += h.sp * dt; if (Math.random() < dt * 14) { const a = Math.random() * TAU; if (!(h.gap != null && Math.abs(Math.atan2(Math.sin(a - h.gap), Math.cos(a - h.gap))) < h.gapW / 2)) fx('td_wave', h.x + Math.cos(a) * h.R, h.y + Math.sin(a) * h.R * 0.8, { sheet: violSheet('td_wave'), dur: 0.4 }); }
      const inGap = q => { if (h.gap == null) return false; let da = Math.atan2(q.y - h.y, q.x - h.x) - h.gap; while (da > Math.PI) da -= TAU; while (da < -Math.PI) da += TAU; return Math.abs(da) < h.gapW / 2; };   /* khe hở (Gồng Chấn Địa) */
      const band = q => { const d = Math.hypot(q.x - h.x, (q.y - h.y) / 0.8); return Math.abs(d - h.R) < 8 && !inGap(q); };
      if (!h.hitP && band(p) && hurtPlayer(ctx, h.dmg, { x: h.x, y: h.y }, 'fly', 1.0)) h.hitP = true;
      if (!h.hitR && r && band(r) && hurtRocky(ctx, h.dmg, { x: h.x, y: h.y }, 'fly')) h.hitR = true; if (!h.hitL && ltHitAt(ctx, band, h.dmg, { x: h.x, y: h.y }, 'fly')) h.hitL = true;
    }
  }
  ST.hz = ST.hz.filter(h => (h.k === 'ring' ? h.R < h.max : h.t < (h.T || 0) + 0.5));
  /* làm chậm (Đồng Hồ) — trả lại tốc độ cũ khi ra khỏi vùng */
  if (slow && !ST.slowOn) { ST.slowOn = true; ST.slowPrev = p.speedMul; p.speedMul = Math.max(0.2, (p.speedMul || 1) * 0.42); }
  else if (!slow && ST.slowOn) { ST.slowOn = false; if (!(ctx.knocked && ctx.knocked())) p.speedMul = ST.slowPrev ?? 1; }
  if (ST.stunP > 0) { ST.stunP -= dt; if (!(ctx.knocked && ctx.knocked())) { p.autoPath = null; if (ST.stunP > 0) { ST.stunSm ??= p.speedMul; p.speedMul = 0; } else { p.speedMul = ST.stunSm ?? 1; ST.stunSm = null; } } }
  /* xúc tu Kraken: báo (nứt) → trồi → quất (trúng) → kẹt → rút */
  for (const s of ST.tents) {
    s.t -= dt;
    if (s.st === 'warn' && s.t <= 0) { s.st = 'lash'; s.t = KR.LASH; }
    else if (s.st === 'lash' && s.t <= 0) { s.st = 'stuck'; s.t = s.t0 = 0.6; if (!s.hit) { s.hit = true; hitBoth(ctx, q => dist(q, s) < 18, RE.dmg.tent, { x: s.x, y: s.y + 8 }, 'fly'); fx('rock_debris', s.x, s.y + 2) || fx('dirt_puff', s.x, s.y + 2); ctx.sfx('knock_land'); } }
    else if (s.st === 'stuck' && s.t <= 0) { s.st = 'retract'; s.t = KR.RET; }
    else if (s.st === 'retract' && s.t <= 0) s.st = 'gone';
  }
  ST.tents = ST.tents.filter(s => s.st !== 'gone');
}
const VIMG = {};
function violImg(src, keep) {   /* ảnh của trùm khác đổi sang tông đỏ thẫm–tím của Lyron (theo độ sáng, 1 lần, canvas cache) — keep: giữ chút màu gốc (mặt đồng hồ đọc được số) */
  if (VIMG[src]) return VIMG[src]; const im = img(src); if (!im || typeof document === 'undefined') return null;
  const c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight; const g = c.getContext('2d'); g.drawImage(im, 0, 0, c.width, c.height);
  const d = g.getImageData(0, 0, c.width, c.height), a = d.data;
  for (let i = 0; i < a.length; i += 4) { if (!a[i + 3]) continue; const L = (0.3 * a[i] + 0.55 * a[i + 1] + 0.15 * a[i + 2]) / 255, col = PAL_V.find(p => L < p[0])[1], k = keep || 0;
    a[i] = Math.round(col[0] * (1 - k) + a[i] * k); a[i + 1] = Math.round(col[1] * (1 - k) + a[i + 1] * k); a[i + 2] = Math.round(col[2] * (1 - k) + a[i + 2] * k); }
  g.putImageData(d, 0, 0); VIMG[src] = c; return c;
}
let TENT_C = null;
function tentViolet(g, s, cx, cy) {   /* xúc tu Kraken vẽ vào canvas phụ 2× rồi phủ tím (source-atop) → không sửa kraken.js */
  if (typeof document === 'undefined') return; const c = TENT_C || (TENT_C = document.createElement('canvas')); c.width = 128; c.height = 176;
  const g2 = c.getContext('2d'); g2.setTransform(2, 0, 0, 2, 0, 0); g2.imageSmoothingEnabled = false; g2.clearRect(0, 0, 64, 88);
  const d = krTent(g2, s, s.x - 32, s.y - 78); if (d && d.f) d.f();
  g2.setTransform(1, 0, 0, 1, 0, 0); g2.globalCompositeOperation = 'source-atop'; g2.fillStyle = 'rgba(140,24,110,0.55)'; g2.fillRect(0, 0, 128, 176); g2.globalCompositeOperation = 'source-over';
  g.drawImage(c, 0, 0, 128, 176, Math.round(s.x - cx - 32), Math.round(s.y - cy - 78), 64, 88);
}
function hzClear(ctx) {
  fusionClear(ctx); fusion2Clear(ctx); const p = ctx.S.player; if (ST.slowOn) { p.speedMul = ST.slowPrev ?? 1; ST.slowOn = false; } if (ST.stunSm != null) { p.speedMul = ST.stunSm; ST.stunSm = null; } ST.stunP = 0; ST.hz = []; ST.tents = []; ST.comboK = null; }
function drawHzGround(g, ctx, cx, cy) {   /* vùng trên mặt đất: hố đen (ảnh Hố Đen), mặt đồng hồ (ảnh Đồng Hồ), vòng sóng (sương tím) */
  for (const h of ST.hz) {
    if (h.t < 0) continue; g.save();
    if (h.k === 'hole') { const im = violImg(h.big ? 'boss/hoden/hole80_s11.png' : 'boss/hoden/hole48_s11.png'); const fog = fogTint(2, '#4a1870'); const k = Math.min(1, h.t / 0.4) * Math.min(1, Math.max(0, (h.T - h.t) / 0.4));
      if (fog) { g.imageSmoothingEnabled = true; g.globalAlpha = 0.45 * k; const w = h.big ? 110 : 70; g.drawImage(fog, h.x - cx - w / 2, h.y - cy - w * 0.32, w, w * 0.64); }
      if (im) { g.imageSmoothingEnabled = false; g.globalAlpha = k; g.translate(Math.round(h.x - cx), Math.round(h.y - cy)); g.rotate(ST.t * 1.2); const w = im.width / 2; g.drawImage(im, 0, 0, im.width, im.height, -w / 2, -w / 2, w, w); } }
    else if (h.k === 'clock') { const k = Math.min(1, h.t / 0.3) * Math.min(1, Math.max(0, (h.T + 0.2 - h.t) / 0.3)), fog = fogTint(1, '#8a60e0');
      if (fog) { g.imageSmoothingEnabled = true; g.globalAlpha = 0.35 * k; g.drawImage(fog, h.x - cx - h.R * 1.3, h.y - cy - h.R * 0.8, h.R * 2.6, h.R * 1.6); }
      const cf = violImg('boss/dongho/clockface_s29.png', 0.35), hd = violImg('boss/dongho/hand_s22.png', 0.2);
      if (cf) { g.imageSmoothingEnabled = false; g.globalAlpha = 0.75 * k; const w = cf.width / 2; g.drawImage(cf, 0, 0, cf.width, cf.height, Math.round(h.x - cx - w / 2), Math.round(h.y - cy - w / 2), w, w);
        if (hd) { g.translate(Math.round(h.x - cx), Math.round(h.y - cy)); g.rotate(-Math.PI / 2 + (h.t / h.T) * TAU); g.drawImage(hd, 0, 0, hd.width, hd.height, -2, -hd.height / 4, hd.width / 2, hd.height / 2); } } }
    else if (h.k === 'ring') { const fog = fogTint(3, '#c070ff'), fog2 = fogTint(1, '#ffe0ff'); if (fog) { g.imageSmoothingEnabled = true; const n = Math.max(14, Math.round(h.R / 3.5)); for (let i = 0; i < n; i++) { const a = i / n * TAU; if (h.gap != null) { let da = a - h.gap; while (da > Math.PI) da -= TAU; while (da < -Math.PI) da += TAU; if (Math.abs(da) < h.gapW / 2) continue; } const X = h.x - cx + Math.cos(a) * h.R, Y = h.y - cy + Math.sin(a) * h.R * 0.8; g.globalAlpha = 0.7; g.drawImage(fog, X - 12, Y - 6, 24, 12); if (fog2) { g.globalAlpha = 0.55; g.drawImage(fog2, X - 6, Y - 3, 12, 6); } } } }   /* sóng rền: vành sương tím + lõi sáng (đọc rõ để né) */
    g.restore();
  }
}
function echoDrawables(ctx, cx, cy, out) {   /* vật đứng: xúc tu (clip Kraken), mảnh gương + bóng gương, tia Hắc-ha / ánh nhìn */
  const g = ctx.g;
  for (const s of ST.tents) out.push({ y: s.y + 0.2, f: () => tentViolet(g, s, cx, cy) });
  for (const h of ST.hz) if (h.k === 'mirror' && h.t >= 0) {
    const sh = VX('gm_prism'), vs = sh && violSheet('gm_prism');
    for (const q of h.sh) out.push({ y: q.y, f: () => { if (vs) drawSheet(g, vs, Math.floor(ST.t * 8) % vs.n, q.x - cx, q.y - cy + 4, 0.95); } });
    out.push({ y: h.cl.y, f: () => { drawLy(g, { dir: h.dir, clip: 'cast', prog: Math.min(0.99, h.t / h.T), ft: ST.t, alpha: 0.55, form: ST.lyMo && ST.lyMo.form, lift: 3 }, h.cl.x - cx, h.cl.y - cy, 3); } });   /* bóng gương của Lyron */
    if (h.fired && h.t < h.fire + 0.45) { const seg = (a, b) => { const s = bSheet('rk_ha2_s', false), vs2 = s && violSheet('rk_ha2_s'); if (!vs2) return; const fr = bFrame(vs2, h.t - h.fire), L0 = Math.hypot(b.x - a.x, b.y - a.y), ang = Math.atan2(b.y - a.y, b.x - a.x); bDraw(g, vs2, fr, a.x - cx, a.y - 6 - cy, ang, L0, 0.95); };
      out.push({ y: 1e9 - 3, f: () => { for (const [a, b] of [[h.sh[0], h.sh[1]], [h.sh[1], h.sh[2]], [h.sh[2], h.sh[0]]]) seg(a, b); } });   /* 3 đoạn gương ↔ gương: phát từ vật — giữ lớp trên cùng */
      { const tg = h.tgt || ctx.S.player; out.push({ y: h.cl.y + (tg.y < h.cl.y ? -0.5 : 0.5), skill: 'ly_mirror', f: () => seg(h.cl, tg) }); } }   /* 2026-10-16 (QUY TẮC LỚP VẼ CHIÊU): đoạn bóng gương Lyron → người chơi khoá theo chân bóng gương */
  }
  const mo = ST.lyMo, A = mo && mo.act;
  if (A && (A.k === 'hha' || A.k === 'stare') && A.ph === 'fire') out.push({ y: mo.y + (Math.sin(A.a || 0) < 0 ? -0.5 : 0.5), skill: 'ly_hha', f: () => { const s = A.k === 'hha' ? bSheet('rk_ha2_l', true) : violSheet('rk_ha2_s'); if (!s) return; bDraw(g, s, bFrame(s, A.ft), mo.x - cx, mo.y - 12 - cy, A.a, A.len, 1); } });
}

/* ================= plan-36: CHIÊU HỢP THỂ của Lyron Siêu Cấp (anh chốt 2026-10-14) =================
   2 đòn nền (Liên Hoàn Sigma, Gồng Chấn Địa) + 8 chiêu HỢP THỂ ghép chiêu mạnh nhất của 2 trùm, dùng địa hình tâm trí
   (gương phấn, sàn bản vẽ sụp, trang kịch bản) + tuyệt chiêu Đại Hợp Tấu (30 %) + Tâm Trí Sụp Đổ / Rocky-ha Song Kích (< 10 %).
   > 50 %: đòn nền + hợp thể 1–4 · < 50 %: thêm 5–8 + nối chiêu · mọi vệt báo qua tpush() → ctx.threat (Ki né được). */
const FU = {
  cd: { combo3: 2.4, quake: 6.5, prism: 15, thunderhole: 17, tentclock: 17, centdash: 12, mirrortime: 22, inkwhirl: 17, thunderjaw: 11, collapse: 22 },
  dmg: { combo3: 0.08, combo3f: 0.11, quake: 0.1, prism: 0.12, jaw: 0.1, clone: 0.09, whirl: 0.1, collapse: 0.05, glyph: 0.1 },
};
const FNAME = {
  combo3: ['Liên Hoàn Sigma', 'Sigma Combo'], quake: ['Gồng Chấn Địa', 'Flex Quake'],
  prism: ['Hắc-ha Lăng Kính', 'Prism Dark-Ha', 'Hắc Rocky + Nữ Hoàng Pha Lê', 'Dark Rocky + Crystal Queen'],
  thunderhole: ['Lôi Trận Hố Đen', 'Thunder Black Hole', 'Trống Đồng + Hố Đen', 'Bronze Drum + Black Hole'],
  tentclock: ['Xúc Tu Ngưng Thời', 'Frozen-Time Tentacles', 'Kraken + Đồng Hồ', 'Kraken + The Clock'],
  centdash: ['Rết Lôi Lướt', 'Thunder Centipede Dash', 'Ngô Công Lôi Thần + Hắc Rocky', 'Thunder Centipede + Dark Rocky'],
  mirrortime: ['Gương Thời Không', 'Mirror of Time', 'Nữ Hoàng Pha Lê + Đồng Hồ', 'Crystal Queen + The Clock'],
  inkwhirl: ['Xoáy Mực Đen', 'Black Ink Maelstrom', 'Kraken + Hố Đen', 'Kraken + Black Hole'],
  thunderjaw: ['Ngoạm Sấm Trời', 'Sky-Thunder Bite', 'Ngô Công Lôi Thần + Trống Đồng', 'Thunder Centipede + Bronze Drum'],
  collapse: ['Bản Thiết Kế Sụp Đổ', 'Blueprint Collapse', 'tâm trí Lyron', "Lyron's own mind"],
  grand: ['ĐẠI HỢP TẤU', 'GRAND ENSEMBLE', 'mọi trùm', 'every boss'],
};
const fuTxt = (ctx, k) => { const n = FNAME[k], vi = ctx.lang() === 'vi'; if (!n) return ''; return (vi ? n[0] : n[1]) + (n.length > 2 ? '' : '!'); };   /* tên chiêu ngắn; trùm gốc = icon nhỏ bên cạnh */
const FU_ICONS = { prism: ['hacrocky', 'guong'], thunderhole: ['trongdong', 'hoden'], timestop: ['dongho'], mirrortime: ['guong', 'dongho'], gravity: ['hoden'], grand: ['hacrocky', 'trongdong', 'guong', 'hoden', 'dongho', 'kraken'] };
const FU_EARLY = { prism: 1, thunderhole: 1, timestop: 1, whistle: 1 }, FU_LATE = { mirrortime: 1, gravity: 1 };   /* SỬA THEO ANH: Ngưng Đọng / Huýt Sáo thay Xúc Tu / Rết; Siêu Hấp Dẫn thay Sụp Đổ; Hắc Hóa = biến hình ở 50 %; Đấm Ki theo thanh Ki */
const FU_COMBO = { timestop: ['combo3'], prism: ['quake'], gravity: ['combo3'], thunderhole: ['quake'] };
const fuOk = (mo, k) => !ST.grandOn && !(ST.cd.strong > 0) && ST.cd[k] <= 0 && (FU_EARLY[k] || mo.enr);
const SKF = [
  { k: 'grand', tier: 7, ok: mo => !ST.grandDone && mo.hp / mo.max <= 0.3 },
  { k: 'combo', tier: 6, ok: mo => !!ST.comboK && mo.enr },
  { k: 'kiflurry', tier: 5, ok: (mo, d) => !ST.grandOn && (ST.lyKi || 0) >= 7 && d < 190 },
  ...['prism', 'thunderhole', 'timestop', 'whistle', 'mirrortime', 'gravity'].map(k => ({ k, tier: 4, ok: (mo, d) => fuOk(mo, k) && (k !== 'whistle' || !ST.summon) && (k !== 'gravity' || d < 150) })),
  { k: 'quake', tier: 3, ok: (mo, d) => !ST.grandOn && ST.cd.quake <= 0 && d < 95 },
  { k: 'combo3', tier: 2, ok: (mo, d) => !ST.grandOn && ST.cd.combo3 <= 0 && d <= 46 },
];
const FU_CD0 = { combo3: 0.5, quake: 3, prism: 4, thunderhole: 9, timestop: 13, whistle: 20, mirrortime: 2, gravity: 6 };

/* ---- vật phá được (gương phấn, kim đồng hồ, hình phấn Đại Hợp Tấu): quái tạm 1 máu, không rơi đồ ---- */
function addProp(ctx, kind, x, y, imgName, extra = {}) {
  const o = { kind, broken: false, lit: 0, img: imgName, bob: Math.random() * 6, born: ST.t, ...extra };
  const mo = ctx.monsters.add({ key: 'ly_prop_' + kind, vi: extra.vi || 'Gương phấn', en: extra.en || 'Chalk mirror', hp: 50000, dmg: 0, armor: 0, sp: 0, xp: 0, w: extra.w || 14, h: extra.h || 22, c: ['#40204a', '#a060ff', '#e0d0ff'], lyProp: true,
    aiFn: (c2, m2) => { m2.moving = false; propHit(ctx, o, m2); }, drawFn: (g, m2, X, Y) => drawProp(g, o, X, Y), onDown: () => { o.broken = true; fx('gm_shatter', o.mo.x, o.mo.y - 8, { sheet: violSheet('gm_shatter'), top: true }); ctx.sfx('glass'); log('prop broken ' + kind); ST.stats.props = (ST.stats.props || 0) + 1; if (o.onBreak) o.onBreak(); } }, x, y);
  poise(mo); o.mo = mo; (ST.props ||= []).push(o); return o;
}
function propHit(ctx, o, m2) {   /* chỉ NGƯỜI CHƠI chém vỡ được (đòn Rocky không tính) — máu ảo rất lớn, mất máu = 1 đòn */
  if (o.broken || o.gone || m2.hp >= m2.max) return;
  const byRocky = m2.__rkHit != null && Math.abs((ctx.S.time || 0) - m2.__rkHit) < 0.25 && !(ctx.monsters.lastHitT && Math.abs(ctx.monsters.lastHitT() - (ctx.S.time || 0)) < 0.25);
  if (byRocky) { m2.hp = m2.max; return; }
  m2.hp = m2.max; o.mo.c.onDown && o.mo.c.onDown(m2); ctx.monsters.remove(m2);
}
function dropProp(ctx, o) { if (!o || o.gone) return; o.gone = true; if (!o.broken && o.mo) ctx.monsters.remove(o.mo); }
function drawProp(g, o, X, Y) {
  const im0 = o.src ? violImg(o.src, 0.3) : (img(UIL(o.img)) || img(UIL(o.img.replace(/_[abc]$/, '_a')))), im = im0 && { i: im0, naturalWidth: im0.naturalWidth || im0.width, naturalHeight: im0.naturalHeight || im0.height }; g.save(); g.imageSmoothingEnabled = false;
  if (o.kind === 'glyph') {   /* hình phấn nằm trên sàn; sáng lên trước khi phóng chiêu */
    if (o.lit > 0) { const fog = fogTint(2, '#e0c0ff'); if (fog) { g.imageSmoothingEnabled = true; g.globalCompositeOperation = 'lighter'; g.globalAlpha = Math.min(1, o.lit * 1.6) * 0.8; g.drawImage(fog, X - 30, Y - 20, 60, 36); g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1; g.imageSmoothingEnabled = false; } }
    if (im) { const w = im.naturalWidth / 2, h = im.naturalHeight / 2; g.globalAlpha = 0.85; g.drawImage(im.i, 0, 0, im.naturalWidth, im.naturalHeight, Math.round(X - w / 2), Math.round(Y - h / 2), w, h); }
  } else if (im) { const w = im.naturalWidth / 2, h = im.naturalHeight / 2, by = Math.round(Math.sin(ST.t * 2 + o.bob) * 1.5); g.drawImage(im.i, 0, 0, im.naturalWidth, im.naturalHeight, Math.round(X - w / 2), Math.round(Y - h + 2 + by), w, h); }
  g.restore();
}
function tentAt(ctx, x, y, lead = 0.2) { ST.tents.push({ x, y, st: 'warn', t: KR.WARN + lead, cx0: x - 10, hit: false }); tpush(ctx, { type: 'c', x, y, r: 16, t: KR.WARN + lead, T0: KR.WARN + lead, act: { k: 'tentTele' }, col: '#a03cc0' }); }
function boltAt(ctx, x, y, T0, col, small = true) { tpush(ctx, { type: 'c', x, y, r: 13, t: T0, T0, bolt: true, small, col: col || '#c060ff' }); }
function beamSeg(a, b, T, dmg, dark, gy) { (ST.beams ||= []).push({ a: { ...a }, b: { ...b }, t: 0, T, dmg, dark: !!dark, hit: {}, gy }); }   /* gy: chân kẻ phóng (2026-10-16 QUY TẮC LỚP VẼ CHIÊU); không có = tia từ vật (gương, hình phấn) giữ lớp trên cùng */
function voidCells(ctx, pts, T) {   /* ô sàn sụp (tạm): đảo thành sương → người đứng trên đó bật chong chóng; tự hồi sau T giây */
  const m = ctx.S.map; if (!m.reg) return; const cells = [];
  for (const [tx, ty] of pts) { if (tx < 1 || ty < 1 || tx >= m.w - 1 || ty >= m.h - 1) continue; const k = ty * m.w + tx; if (m.reg[k] < 0 || m.reg[k] >= 10) continue; cells.push({ k, r: m.reg[k], s: m.solid[k] }); m.reg[k] = -1; m.solid[k] = 1; }
  if (cells.length) (ST.voids ||= []).push({ cells, t: 0, T });
}
function restoreVoids(ctx, all) { const m = ctx.S.map; if (!m || !m.reg) { ST.voids = []; return; } for (const v of (ST.voids || [])) if (all || v.t >= v.T) for (const c of v.cells) { m.reg[c.k] = c.r; m.solid[c.k] = c.s; } ST.voids = all ? [] : (ST.voids || []).filter(v => v.t < v.T); }

function startFusion(ctx, mo, k, tp) {
  const t = L(ctx), p = ctx.S.player, r = rkPos(ctx), vi = ctx.lang() === 'vi';
  if (!(k in FU.cd) && k !== 'grand' && k !== 'kiflurry') return false;
  if (k !== 'grand' && k !== 'kiflurry') ST.cd[k] = FU.cd[k] * (isBlack(mo) ? 0.8 : 1);
  ST.callout = { txt: fuTxt(ctx, k), t: 2.6, icons: FU_ICONS[k] }; ST.stats.fusion = (ST.stats.fusion || 0) + (FUSION_SET[k] ? 1 : 0);
  const aim = Math.atan2(tp.y - mo.y, tp.x - mo.x); mo.dir = dirOf(Math.cos(aim), Math.sin(aim));
  if (ST.clones && ST.clones.length && k !== 'mirrortime') (ST.replays ||= []).push({ k, at: ST.t + 2, a: aim, d: dist(mo, tp) });   /* phân thân lặp lại sau 2 s */
  if (k === 'timestop') return startTimestop(ctx, mo);
  if (k === 'whistle') return startWhistle(ctx, mo);
  if (k === 'kiflurry') return startFlurry(ctx, mo, tp);
  if (k === 'gravity') return startGravity(ctx, mo);
  if (k === 'combo3') { mo.act = { fu: 1, k, n: 0, t: 0.32, a: aim }; mo.clip = 'sk_combo'; mo.prog = 0; tpush(ctx, { type: 'l', x: mo.x, y: mo.y, a: aim, len: 42, w: 22, t: 0.32, T0: 0.32, act: mo.act, col: '#ff3060' }); return true; }
  if (k === 'quake') {   /* Gồng Chấn Địa: vòng sóng có KHE hở (lộn / đi qua khe) */
    const gap = aim + Math.PI + (Math.random() - 0.5); ST.hz.push({ k: 'ring', x: mo.x, y: mo.y, t: -0.9, R: 0, sp: 135, max: 125, dmg: FU.dmg.quake, hitP: false, hitR: false, gap, gapW: 0.75 });
    mo.act = { fu: 1, k, t: 0.9, T: 0.9 }; mo.clip = 'sk_quake'; mo.prog = 0; ctx.sfx('roar'); return true;
  }
  if (k === 'prism') {   /* Hắc-ha Lăng Kính: 3–4 gương phấn quanh người chơi → Hắc-ha bắn vào gương, tia nảy giữa các gương */
    const n = mo.enr ? 4 : 3, a0 = Math.random() * TAU, sh = [];
    for (let i = 0; i < n; i++) { const a = a0 + i * TAU / n, R0 = 72 + Math.random() * 16; sh.push(addProp(ctx, 'mirror', p.x + Math.cos(a) * R0, p.y + Math.sin(a) * R0 * 0.8, 'f_mirror_' + FPICK.mirror, { vi: 'Gương phấn (chém vỡ!)', en: 'Chalk mirror (break it!)' })); }
    for (const o of sh) fx('gm_arrive', o.mo.x, o.mo.y + 4, { sheet: violSheet('gm_arrive') });
    mo.act = { fu: 1, k, t: 0, fire: n >= 4 ? 3.2 : 2.8, sh, a: aim };   /* đủ thời gian chém vỡ gương */ mo.clip = 'sk_beam'; mo.prog = 0; ctx.sfx('glass'); return true;
  }
  if (k === 'thunderhole') {
    const c = { x: p.x + (Math.random() - 0.5) * 30, y: p.y + (Math.random() - 0.5) * 20 };
    ST.hz.push({ k: 'hole', x: c.x, y: c.y, t: 0, T: 4.6, R: 12, pull: 20, big: true, hitP: false, hitR: false });
    fx('hd_implode', c.x, c.y, { sheet: violSheet('hd_implode') });
    mo.act = { fu: 1, k, t: 0, c, waves: 0 }; mo.clip = 'sk_summon'; mo.prog = 0; ctx.sfx('drum'); return true;
  }
  if (k === 'tentclock') {
    const h = { k: 'clock', x: p.x, y: p.y, t: 0, T: 6.5, R: 58, struck: false, tentT: 0.6, slowK: 0.4 }; ST.hz.push(h);
    h.hand = addProp(ctx, 'hand', h.x, h.y + 2, 'f_mirror_' + FPICK.mirror, { src: 'boss/dongho/hand_s22.png', vi: 'Kim đồng hồ (chém để phá!)', en: 'Clock hand (break it!)', w: 12, h: 12, hand: true, onBreak: () => { h.T = h.t + 0.2; h.broken = true; ctx.sfx('chime'); } });
    mo.act = { fu: 1, k, t: 0.9, T: 0.9 }; mo.clip = 'flex'; mo.prog = 0; ctx.sfx('chime'); return true;
  }
  if (k === 'centdash') {
    mo.act = { fu: 1, k, n: 0, ph: 'aim', t: 0.45, a: aim, len: Math.min(200, dist(mo, tp) + 40), hit: {}, x0: mo.x, y0: mo.y };
    tpush(ctx, { type: 'l', x: mo.x, y: mo.y, a: aim, len: mo.act.len, w: 18, t: 0.45, T0: 0.45, act: mo.act, col: '#ffb040' }); return true;
  }
  if (k === 'mirrortime') {
    const s = Math.cos(aim + Math.PI / 2), c2 = Math.sin(aim + Math.PI / 2);
    ST.clones = [-1, 1].map(sg => ({ x: mo.x + s * 90 * sg, y: mo.y + c2 * 70 * sg, until: ST.t + 9, dir: mo.dir, ox: s * 90 * sg, oy: c2 * 70 * sg }));
    for (const c of ST.clones) fx('gm_arrive', c.x, c.y + 4, { sheet: violSheet('gm_arrive') });
    ST.replays = []; mo.act = { fu: 1, k, t: 0.8, T: 0.8 }; mo.clip = 'sk_mirror'; mo.prog = 0; ctx.sfx('glass'); return true;
  }
  if (k === 'inkwhirl') {
    const c = { x: p.x, y: p.y }; ST.hz.push({ k: 'whirl', x: c.x, y: c.y, t: 0, T: 6.5, R: 24, pull: 18, tentT: 1.0, sunk: false, hitP: false, hitR: false });
    fx('u_ink', c.x, c.y, { sheet: violSheet('u_ink') }); mo.act = { fu: 1, k, t: 0.9, T: 0.9 }; mo.clip = 'pound'; mo.prog = 0; ctx.sfx('rumble'); return true;
  }
  if (k === 'thunderjaw') {
    const len = Math.min(150, dist(mo, tp) + 30); mo.act = { fu: 1, k, ph: 'aim', t: 0.55, a: aim, len, hit: false };
    tpush(ctx, { type: 'l', x: mo.x, y: mo.y, a: aim, len, w: 22, t: 0.55, T0: 0.55, act: mo.act, col: '#ffe060' }); ctx.sfx('charge'); return true;
  }
  if (k === 'collapse') {   /* xé trang kịch bản → các dải sàn vẽ phấn sụp theo nét trên trang */
    (ST.pages ||= []).push({ x: mo.x, y: mo.y - 30, t: 0, vx: -20 }, { x: mo.x, y: mo.y - 30, t: 0, vx: 24 });
    const strips = []; for (let i = 0; i < (mo.enr ? 3 : 2); i++) { const a = Math.random() * Math.PI, off = (Math.random() - 0.5) * 50, cx0 = p.x + Math.cos(a + Math.PI / 2) * off, cy0 = p.y + Math.sin(a + Math.PI / 2) * off, len = 240;
      const q = { type: 'l', x: cx0 - Math.cos(a) * len / 2, y: cy0 - Math.sin(a) * len / 2, a, len, w: 28, t: 1.4 + i * 0.6, T0: 1.4 + i * 0.6, act: { k: 'collapseTele' }, col: '#e8f4ff' }; tpush(ctx, q); strips.push(q); }
    mo.act = { fu: 1, k, t: 0, strips, done: 0 }; mo.clip = 'lasso'; mo.prog = 0; ctx.sfx('paper'); return true;
  }
  if (k === 'grand') return startGrand(ctx, mo);
  return false;
}
const FUSION_SET = { prism: 1, thunderhole: 1, timestop: 1, whistle: 1, mirrortime: 1, gravity: 1 };
function endFusion(ctx, mo, k) {
  mo.act = null; if (!FUSION_SET[k]) return;
  ST.cd.strong = 5; mo.tiredT = 1.6;   /* sau chiêu hợp thể: hụt hơi — cửa sổ đánh trả */
  if (mo.enr && !ST.comboK && FU_COMBO[k] && Math.random() < 0.35) { const k2 = FU_COMBO[k][0]; if (ST.seq.slice(-2).filter(x => x === k2).length < 2) { ST.comboK = k2; mo.tiredT = 0.2; } }
}
function actFusion(ctx, mo, A, dt, p) {
  const r = rkPos(ctx);
  if (A.k === 'combo3') {   /* 3 cú đấm, cú cuối móc hất */
    A.t -= dt; mo.clip = 'sk_combo'; mo.prog = Math.min(0.99, (A.n + Math.min(1, 1 - Math.max(0, A.t) / 0.32)) / 3);
    if (A.t <= 0 && !A.hitDone) { A.hitDone = true; const last = A.n === 2, a0 = { x: mo.x, y: mo.y - 6 }, b0 = { x: mo.x + Math.cos(A.a) * 42, y: mo.y - 6 + Math.sin(A.a) * 42 };
      hitBoth(ctx, q => segDist({ x: q.x, y: q.y - 6 }, a0, b0) < 13 || dist(q, mo) < 16, last ? FU.dmg.combo3f : FU.dmg.combo3, mo, last ? 'fly' : 'stagger');
      fx('rk_punch_t4', b0.x, b0.y + 4, { sheet: crimSheet('rk_punch_t4') }) || fx('knock_jab', b0.x, b0.y); ctx.sfx('punch'); A.gap = 0.18; }
    if (A.hitDone) { A.gap -= dt; if (A.gap <= 0) { A.n++; if (A.n >= 3) return endFusion(ctx, mo, 'combo3'); const tp = tgPos(ctx); A.a = Math.atan2(tp.y - mo.y, tp.x - mo.x); mo.x += Math.cos(A.a) * 8; mo.y += Math.sin(A.a) * 8; keepIn(ctx, mo); A.t = 0.26; A.hitDone = false; mo.prog = 0; tpush(ctx, { type: 'l', x: mo.x, y: mo.y, a: A.a, len: 42, w: 22, t: 0.26, T0: 0.26, act: A, col: '#ff3060' }); } }
    return;
  }
  if (A.k === 'prism') {
    A.t += dt; mo.clip = 'sk_beam'; mo.prog = A.t < A.fire ? Math.min(0.5, A.t / A.fire * 0.5) : Math.min(0.99, 0.5 + (A.t - A.fire) / 0.6 * 0.5);   /* vận lực → ra tia (khung 5) → giật lùi */
    if (A.fired && !A.recoil) { A.recoil = true; mo.x -= Math.cos(A.a) * 8; mo.y -= Math.sin(A.a) * 6; keepIn(ctx, mo); }
    const alive = A.sh.filter(o => !o.broken);
    if (!A.tele && A.t >= 0.9 && alive.length) { A.tele = true; A.path = prismPath(mo, alive, p); for (let i = 0; i + 1 < A.path.length; i++) { const a = A.path[i], b = A.path[i + 1]; tpush(ctx, { type: 'l', x: a.x, y: a.y, a: Math.atan2(b.y - a.y, b.x - a.x), len: Math.hypot(b.x - a.x, b.y - a.y), w: 20, t: A.fire - 0.9, T0: A.fire - 0.9, act: { k: 'prismTele' }, col: '#5a2080' }); } }
    if (A.t >= A.fire && !A.fired) { A.fired = true;
      if (!alive.length) { ST.banner = { txt: ctx.lang() === 'vi' ? 'Gương vỡ hết — Lyron hụt đòn!' : 'All mirrors broken — Lyron misses!', t: 2 }; A.sh.forEach(o => dropProp(ctx, o)); mo.act = null; mo.tiredT = 2.6; log('prism broken all'); return; }
      const path = (A.path || prismPath(mo, alive, p)).filter(q => !q.prop || !q.prop.broken);   /* gương bị chém sau khi báo: tia bỏ qua mảnh đó */
      for (let i = 0; i + 1 < path.length; i++) beamSeg(path[i], path[i + 1], 0.55, FU.dmg.prism, i === 0, i === 0 && !path[0].prop ? path[0].y + 12 : undefined);   /* đoạn đầu: từ thân Lyron */
      ctx.sfx('beam'); ctx.S.flash = Math.max(ctx.S.flash || 0, 0.2); A.end = A.t + 0.6; }
    if (A.fired && A.t >= A.end) { A.sh.forEach(o => dropProp(ctx, o)); endFusion(ctx, mo, 'prism'); }
    return;
  }
  if (A.k === 'thunderhole') {   /* sét trống giáng theo vòng quanh hố, thu dần vào tâm (có khe) */
    A.t += dt; mo.clip = 'sk_summon'; mo.prog = A.t < 0.6 ? A.t / 0.6 * 0.5 : 0.5 + 0.45 * Math.abs(Math.sin(ST.t * 3));
    const due = [0.6, 1.6, 2.6]; if (A.waves < 3 && A.t >= due[A.waves]) { const R0 = [86, 58, 32][A.waves], n = [10, 8, 5][A.waves], g0 = Math.random() * n | 0;
      for (let i = 0; i < n; i++) { if (i === g0 || i === (g0 + 1) % n) continue; const a = i / n * TAU + A.waves * 0.4; boltAt(ctx, A.c.x + Math.cos(a) * R0, A.c.y + Math.sin(a) * R0 * 0.8, 0.95); }
      A.waves++; ctx.sfx('drum'); }
    if (A.t >= 3.9) endFusion(ctx, mo, 'thunderhole'); return;
  }
  if (A.k === 'centdash') {
    if (A.ph === 'aim') { A.t -= dt; if (A.t <= 0) { A.ph = 'go'; A.go = 0; A.x0 = mo.x; A.y0 = mo.y; ctx.sfx('dash'); } return; }
    const sp = 380 * dt; A.go += sp; mo.x += Math.cos(A.a) * sp; mo.y += Math.sin(A.a) * sp; mo.clip = 'punch'; mo.prog = 0.6; keepIn(ctx, mo); if (mo._blk) A.go = A.len;
    if (Math.random() < dt * 22) fx('td_spark', mo.x + (Math.random() - 0.5) * 10, mo.y - 4, { sheet: violSheet('td_spark'), dur: 0.3 });
    hitOnce(ctx, A.hit, q => dist(q, mo) < 16, RE.dmg.hdash, mo, 'fly');
    if (A.go >= A.len) {   /* vệt lướt: chân rết trồi dọc đường (báo trước) */
      const L0 = Math.hypot(mo.x - A.x0, mo.y - A.y0), n = Math.max(2, Math.floor(L0 / 26));
      for (let i = 0; i <= n; i++) { const f = i / n; spawnLeg(ctx, A.x0 + (mo.x - A.x0) * f, A.y0 + (mo.y - A.y0) * f, 0.55 + i * 0.05, RB.dmg.legs * 0.8); }
      A.n++; if (A.n >= 3) return endFusion(ctx, mo, 'centdash');
      const tp = tgPos(ctx); A.a = Math.atan2(tp.y - mo.y, tp.x - mo.x); A.len = Math.min(200, dist(mo, tp) + 40); A.ph = 'aim'; A.t = 0.38; A.hit = {};
      tpush(ctx, { type: 'l', x: mo.x, y: mo.y, a: A.a, len: A.len, w: 18, t: 0.38, T0: 0.38, act: A, col: '#ffb040' });
    }
    return;
  }
  if (A.k === 'thunderjaw') {   /* tay hoá hàm rết sấm lao tới đớp → cột sét giáng đúng chỗ đớp */
    if (A.ph === 'aim') { A.t -= dt; mo.prog = 0.3; if (A.t <= 0) { A.ph = 'go'; A.go = 0; ctx.sfx('dash'); } return; }
    if (A.ph === 'go') { const sp = 420 * dt; A.go += sp; mo.x += Math.cos(A.a) * sp; mo.y += Math.sin(A.a) * sp; mo.clip = 'punch'; mo.prog = 0.7; keepIn(ctx, mo); if (mo._blk) A.go = A.len;
      const bx = mo.x + Math.cos(A.a) * 14, by = mo.y + Math.sin(A.a) * 14;
      if (!A.hit) { const pp = ctx.S.player; if (Math.hypot(pp.x - bx, pp.y - by) < 16) { A.hit = true; hurtPlayer(ctx, FU.dmg.jaw, mo, 'launch', 1.0); log('jaw bite'); } if (r && Math.hypot(r.x - bx, r.y - by) < 16) hurtRocky(ctx, FU.dmg.jaw, mo, 'fly'); if (!A.hitL && ltHitAt(ctx, q => Math.hypot(q.x - bx, q.y - by) < 16, FU.dmg.jaw, mo, 'fly')) A.hitL = true; }
      if (A.go >= A.len) { A.ph = 'snap'; A.t = 0.4; fx('bk_snap', bx, by - 8, { top: true }); ctx.sfx('bite'); boltAt(ctx, bx, by, 0.85, '#ffe060'); } return; }
    A.t -= dt; mo.prog = 0.9; if (A.t <= 0) endFusion(ctx, mo, 'thunderjaw'); return;
  }
  if (A.k === 'collapse') {
    A.t += dt; mo.prog = Math.min(0.99, A.t / 1.2);
    for (const q of A.strips) if (!q.fell && q.t <= 0) { q.fell = true; A.done++;   /* dải sàn theo nét phấn sụp xuống (6 s) */
      const pts = [], m = ctx.S.map; for (let d = 0; d <= q.len; d += 6) for (const off of [-10, 0, 10]) { const x = q.x + Math.cos(q.a) * d - Math.sin(q.a) * off, y = q.y + Math.sin(q.a) * d + Math.cos(q.a) * off; pts.push([Math.floor(x / TS), Math.floor(y / TS)]); }
      voidCells(ctx, pts, 6); hitBoth(ctx, s => segDist(s, { x: q.x, y: q.y }, { x: q.x + Math.cos(q.a) * q.len, y: q.y + Math.sin(q.a) * q.len }) < 14, FU.dmg.collapse, { x: q.x, y: q.y }, 'stagger');
      for (let i = 0; i < 6; i++) { const d = Math.random() * q.len; fx('rock_debris', q.x + Math.cos(q.a) * d, q.y + Math.sin(q.a) * d) || fx('dirt_puff', q.x + Math.cos(q.a) * d, q.y + Math.sin(q.a) * d); }
      ST.crumble = Math.max(ST.crumble || 0, 1.2); if (ctx.quake) ctx.quake(0.3); ctx.sfx('rumble'); }
    if (A.done >= A.strips.length && A.t > 2.2) endFusion(ctx, mo, 'collapse'); return;
  }
  if (A.k === 'grand') return tickGrand(ctx, mo, A, dt);
  if (A.k === 'timestop') return tickTimestop(ctx, mo, A, dt);
  if (A.k === 'kiflurry') return tickFlurry(ctx, mo, A, dt);
  if (A.k === 'gravity') return tickGravity(ctx, mo, A, dt);
  /* quake / tentclock / mirrortime / inkwhirl: Lyron chỉ niệm / gồng — nguy hiểm nằm ở ST.hz / phân thân */
  A.t -= dt; mo.prog = Math.min(0.99, 1 - Math.max(0, A.t) / (A.T || 1)); if (A.t <= -0.1) endFusion(ctx, mo, A.k);
}
function prismPath(mo, alive, p) {   /* Lyron → gương 1 → gương 2 → … → người chơi (thứ tự theo góc quanh người chơi) */
  const ord = alive.slice().sort((a, b) => Math.atan2(a.mo.y - p.y, a.mo.x - p.x) - Math.atan2(b.mo.y - p.y, b.mo.x - p.x));
  return [{ x: mo.x, y: mo.y - 12 }, ...ord.map(o => ({ x: o.mo.x, y: o.mo.y - 12, prop: o })), { x: p.x, y: p.y - 6 }];
}

/* ---- Đại Hợp Tấu (30 %): 6 hình phấn của 6 trùm quanh sân, Lyron đứng giữa chỉ huy ---- */
const GLYPHS = ['hacrocky', 'trongdong', 'guong', 'hoden', 'dongho', 'kraken'];
function startGrand(ctx, mo) {
  ST.grandDone = true; hzClear(ctx); ST.grandOn = true; const c = center(ctx), vi = ctx.lang() === 'vi';   /* hzClear tắt grandOn → bật lại SAU */
  const gl = GLYPHS.map((b, i) => { const a = i / 6 * TAU - Math.PI / 2; return addProp(ctx, 'glyph', c.x + Math.cos(a) * 112, c.y + Math.sin(a) * 84, 'g_' + b + '_' + (FPICK.glyph[b] || 'a'), { boss: b, vi: 'Hình phấn ' + b + ' (chém vỡ!)', en: 'Chalk glyph (break it!)', w: 22, h: 10 }); });
  mo.act = { fu: 1, k: 'grand', t: 0, ph: 'go', c, gl, next: 1.8, idx: 0, fired: 0 }; mo.lockHp = mo.hp; ST.lb = 0.01;
  ST.banner = { txt: vi ? 'ĐẠI HỢP TẤU — chém vỡ các hình phấn!' : 'GRAND ENSEMBLE — break the chalk glyphs!', t: 3 }; ctx.sfx('roar'); log('grand start'); return true;
}
function tickGrand(ctx, mo, A, dt) {
  A.t += dt; const p = ctx.S.player, vi = ctx.lang() === 'vi';
  if (A.ph === 'go') { mo.clip = 'walk'; if (moveTo(mo, A.c.x, A.c.y - 6, 220, dt) || dist(mo, { x: A.c.x, y: A.c.y - 6 }) < 3 || A.t > 2.5) { A.ph = 'play'; A.t = 0; } return; }
  mo.clip = 'sk_conduct'; mo.prog = (ST.t * 0.8) % 1;
  for (const o of A.gl) if (o.lit > 0) o.lit -= dt;
  const alive = A.gl.filter(o => !o.broken), broken = A.gl.length - alive.length;
  if (broken >= 4 || !alive.length) { A.gl.forEach(o => dropProp(ctx, o)); mo.act = null; mo.lockHp = null; ST.grandOn = false; ST.lb = 0; mo.tiredT = 6; ST.banner = { txt: vi ? 'Lyron kiệt sức — choáng 6 giây!' : 'Lyron is spent — stunned 6 s!', t: 2.4 }; log('grand broken'); return; }
  if (A.t >= 22) { A.gl.forEach(o => dropProp(ctx, o)); mo.act = null; mo.lockHp = null; ST.grandOn = false; ST.lb = 0; mo.tiredT = 2.5; log('grand timeout'); return; }
  A.next -= dt;
  if (A.next <= 0) {
    const o = alive[A.idx % alive.length]; A.idx++; A.fired++; o.lit = 0.7; A.next = Math.max(0.9, 1.8 - A.fired * 0.1);
    const g = { x: o.mo.x, y: o.mo.y }, a = Math.atan2(p.y - g.y, p.x - g.x);
    ST.callout = { txt: (vi ? 'Đại Hợp Tấu: ' : 'Grand Ensemble: ') + o.boss, t: 1.2 };
    if (o.boss === 'hacrocky' || o.boss === 'guong') { const len = Math.min(220, Math.hypot(p.x - g.x, p.y - g.y) + 40), T0 = 0.75; const q = tpush(ctx, { type: 'l', x: g.x, y: g.y, a, len, w: 20, t: T0, T0, act: { k: 'glyphTele' }, col: o.boss === 'guong' ? '#a060ff' : '#3a1050' }); (ST.delayed ||= []).push({ at: ST.t + T0, f: () => beamSeg({ x: g.x, y: g.y - 6 }, { x: g.x + Math.cos(a) * len, y: g.y - 6 + Math.sin(a) * len }, 0.45, FU.dmg.glyph, o.boss === 'hacrocky') }); void q; }
    else if (o.boss === 'trongdong') { boltAt(ctx, p.x, p.y, 0.9); boltAt(ctx, p.x + 30, p.y + 10, 1.1); boltAt(ctx, p.x - 30, p.y - 10, 1.3); }
    else if (o.boss === 'hoden') ST.hz.push({ k: 'hole', x: p.x, y: p.y - 20, t: 0, T: 2.4, R: 10, pull: 14, big: false, hitP: false, hitR: false });
    else if (o.boss === 'dongho') ST.hz.push({ k: 'clock', x: p.x, y: p.y, t: 0, T: 3.0, R: 40, struck: false, slowK: 0.5 });
    else if (o.boss === 'kraken') { for (let i = 0; i < 3; i++) { const aa = Math.random() * TAU; tentAt(ctx, p.x + Math.cos(aa) * (i ? 26 : 0), p.y + Math.sin(aa) * (i ? 20 : 0), 0.1 * i); } }
    fx('td_spark', g.x, g.y - 6, { sheet: violSheet('td_spark'), top: true }); ctx.sfx('chime');
  }
}

/* ---- Tâm Trí Sụp Đổ (< 10 %) + Rocky-ha Song Kích ---- */
function despTick(ctx, mo, dt) {
  if (!mo || ST.phase !== 'B') return;
  if (!ST.desp && mo.hp / mo.max < 0.1 && !ST.grandOn) { ST.desp = { t: 0 }; mo.lockHp = Math.max(1, Math.round(mo.max * 0.03)); if (mo.hp < mo.lockHp) mo.hp = mo.lockHp; ST.banner = { txt: ctx.lang() === 'vi' ? 'Tâm trí Lyron sụp đổ! Cùng Rocky lại gần hắn!' : "Lyron's mind collapses! Get close with Rocky!", t: 3 }; log('desperation'); }
  if (!ST.desp) return; const D = ST.desp; D.t += dt;
  if (Math.floor(D.t / 1.8) !== D.k) { D.k = Math.floor(D.t / 1.8); ST.crumble = Math.max(ST.crumble || 0, 1); const m = ctx.S.map, f = FRAGS[m.mind] && FRAGS[m.mind][0]; if (m.rim && m.rim.length && f) for (let i = 0; i < 5; i++) { const q = m.rim[(Math.random() * m.rim.length) | 0]; (ST.chunks ||= []).push({ x: q.x, y: q.y - 8, t: 0, set: f.set }); } if (ctx.quake) ctx.quake(0.15); }
  if (D.t > 28 && mo.lockHp) { mo.lockHp = null; log('desp unlock'); }   /* chờ quá lâu (Rocky ở xa): cho hạ bằng đòn thường */
}
const finisherReady = ctx => { const mo = ST.lyMo, r = rkPos(ctx), p = ctx.S.player; return !!(ST.desp && mo && !ST.finT && r && dist(p, mo) < 64 && dist(r, mo) < 80); };
function startFinisher(ctx) {
  const mo = ST.lyMo; if (!mo) return; ST.finT = true; const vi = ctx.lang() === 'vi', r = rkPos(ctx); log('finisher');
  cine(ctx, [
    { act: () => { ST.lb = 0.01; ST.banner = { txt: vi ? 'ROCKY-HA SONG KÍCH!!' : 'ROCKY-HA DOUBLE STRIKE!!', t: 2.6 }; fx('rk_hacharge_x', r ? r.x : mo.x, (r ? r.y : mo.y) - 10, { top: true }); ctx.sfx('charge'); }, wait: 0.9 },
    { act: () => { const a = r || ctx.S.player; beamSeg({ x: a.x, y: a.y - 10 }, { x: mo.x, y: mo.y - 14 }, 0.8, 0, false, a.y); ST.beams[ST.beams.length - 1].blue = true; fx('hr_boom', mo.x, mo.y - 14, { top: true }); ctx.S.flash = 0.8; if (ctx.quake) ctx.quake(0.6); ctx.sfx('boom'); }, wait: 0.9 },
  ], () => { ST.lb = 0; mo.lockHp = null; mo.hp = 0; ST.stats.finisher = 1; });
}

/* ---- nhịp: phân thân (Gương Thời Không), tia, dải sụp, trang giấy, xoáy mực ---- */
function fusionTick(ctx, dt) {
  const mo = ST.lyMo;
  if (ST.props && ST.props.length) { for (const o of ST.props) if (!o.gone && o.kind !== 'glyph' && ST.t - o.born > 9) dropProp(ctx, o); ST.props = ST.props.filter(o => !o.gone && !o.broken || o.kind === 'glyph' && !o.gone); }   /* gương / kim sót lại (chiêu bị ngắt) tự tan sau 9 s */
  if (ST.beams && ST.beams.length) { for (const b of ST.beams) { b.t += dt; if (b.dmg > 0 && b.t < b.T) hitOnce(ctx, b.hit, q => segDist({ x: q.x, y: q.y - 6 }, b.a, b.b) < 11, b.dmg, b.a, 'fly'); } ST.beams = ST.beams.filter(b => b.t < b.T); }
  if (ST.delayed && ST.delayed.length) { const due = ST.delayed.filter(d => ST.t >= d.at); ST.delayed = ST.delayed.filter(d => ST.t < d.at); for (const d of due) d.f(); }
  if (ST.voids && ST.voids.length) { for (const v of ST.voids) v.t += dt; restoreVoids(ctx, false); }
  if (ST.pages) { for (const pg of ST.pages) { pg.t += dt; pg.x += pg.vx * dt; pg.y -= 30 * dt; } ST.pages = ST.pages.filter(pg => pg.t < 1.6); }
  if (ST.clones && ST.clones.length) {
    if (mo) for (const c of ST.clones) { c.x = mo.x + c.ox; c.y = mo.y + c.oy; c.dir = mo.dir; }   /* phân thân đứng theo Lyron (lệch 2 bên) */
    const due = (ST.replays || []).filter(q => ST.t >= q.at); ST.replays = (ST.replays || []).filter(q => ST.t < q.at);
    for (const q of due) for (const c of ST.clones) replayAt(ctx, c, q);
    if (ST.t > ST.clones[0].until) { for (const c of ST.clones) fx('gm_shatter', c.x, c.y - 8, { sheet: violSheet('gm_shatter'), top: true }); ST.clones = []; ST.replays = []; }
  }
  for (const h of ST.hz) {
    if (h.k === 'clock' && h.tentT != null && h.t >= 0 && h.t < h.T - 0.6) { h.tentT -= dt; if (h.tentT <= 0) { h.tentT = 0.95; const p = ctx.S.player, inZ = dist(p, h) < h.R; const a = Math.random() * TAU, rr = Math.random() * h.R * 0.8; tentAt(ctx, inZ ? p.x + (Math.random() - 0.5) * 20 : h.x + Math.cos(a) * rr, inZ ? p.y + (Math.random() - 0.5) * 16 : h.y + Math.sin(a) * rr * 0.8); } }
    if (h.k === 'clock' && h.t >= h.T && h.hand) { dropProp(ctx, h.hand); h.hand = null; }
    if (h.k === 'whirl') whirlTick(ctx, h, dt);
  }
}
function replayAt(ctx, c, q) {   /* phân thân lặp lại đúng động tác Lyron làm 2 giây trước (cùng hướng, từ chỗ của nó) */
  const k = q.k; fx('gm_glint', c.x, c.y - 20, { sheet: violSheet('gm_glint'), top: true });
  if (k === 'quake') { ST.hz.push({ k: 'ring', x: c.x, y: c.y, t: -0.6, R: 0, sp: 130, max: 95, dmg: FU.dmg.clone, hitP: false, hitR: false, gap: q.a + Math.PI, gapW: 0.75 }); return; }
  if (k === 'combo3' || k === 'centdash' || k === 'thunderjaw') { const len = Math.min(110, q.d + 20); tpush(ctx, { type: 'l', x: c.x, y: c.y, a: q.a, len, w: 18, t: 0.6, T0: 0.6, act: { k: 'cloneTele' }, col: '#a060ff' }); (ST.delayed ||= []).push({ at: ST.t + 0.6, f: () => beamSeg({ x: c.x, y: c.y - 6 }, { x: c.x + Math.cos(q.a) * len, y: c.y - 6 + Math.sin(q.a) * len }, 0.3, FU.dmg.clone, false, c.y) }); return; }
  if (k === 'prism') { const len = 170; tpush(ctx, { type: 'l', x: c.x, y: c.y, a: q.a, len, w: 20, t: 0.7, T0: 0.7, act: { k: 'cloneTele' }, col: '#5a2080' }); (ST.delayed ||= []).push({ at: ST.t + 0.7, f: () => beamSeg({ x: c.x, y: c.y - 12 }, { x: c.x + Math.cos(q.a) * len, y: c.y - 12 + Math.sin(q.a) * len }, 0.45, FU.dmg.clone, true, c.y) }); return; }
  const p = ctx.S.player; boltAt(ctx, p.x + c.ox * 0.3, p.y + c.oy * 0.3, 0.9);   /* chiêu vùng: sét lệch về phía phân thân */
}
function whirlTick(ctx, h, dt) {   /* Xoáy Mực Đen: hút vào giữa, xúc tu quất từ mép, đảo trong xoáy sụp dần */
  if (h.t < 0 || h.t >= h.T) { if (h.t >= h.T && !h.end) { h.end = true; fx('hd_nova', h.x, h.y + 10, { sheet: violSheet('hd_nova') }); } return; }
  const p = ctx.S.player, m = ctx.S.map, d = dist(p, h);
  if (d > 3 && d < 130 && !(ctx.knocked && ctx.knocked()) && !(ctx.hero && ctx.hero.fainted)) { const s = Math.min(d - 2, h.pull * dt * (1 + (130 - d) / 130)); p.tryMove((h.x - p.x) / d * s, (h.y - p.y) / d * s, m, []); }
  if (!h.hitP && d < h.R * 0.5) { h.hitP = true; hurtPlayer(ctx, FU.dmg.whirl, { x: h.x, y: h.y - 20 }, 'fly', 1.1); }
  const r = rkPos(ctx); if (!h.hitR && r && dist(r, h) < h.R * 0.5) { h.hitR = true; hurtRocky(ctx, FU.dmg.whirl, { x: h.x, y: h.y - 20 }, 'fly'); } if (!h.hitL && ltHitAt(ctx, q => dist(q, h) < h.R * 0.5, FU.dmg.whirl, { x: h.x, y: h.y - 20 }, 'fly')) h.hitL = true;
  h.tentT -= dt; if (h.tentT <= 0) { h.tentT = 1.1; for (let i = 0; i < 2; i++) { const a = Math.random() * TAU; tentAt(ctx, h.x + Math.cos(a) * (h.R + 20), h.y + Math.sin(a) * (h.R + 20) * 0.8); } }
  if (!h.sunk && h.t > 2.2) { h.sunk = true; const pts = []; for (let y = -2; y <= 2; y++) for (let x = -2; x <= 2; x++) if (x * x + y * y <= 5) pts.push([Math.floor(h.x / TS) + x, Math.floor(h.y / TS) + y]); voidCells(ctx, pts, h.T - h.t + 1.5); ST.crumble = Math.max(ST.crumble || 0, 1); }
}
function fightSpot(g, ctx, cx, cy) {   /* vùng đánh sáng nhẹ (đèn chiếu mềm) để Lyron + người chơi đọc rõ trên sàn tối */
  const mo = ST.lyMo, p = ctx.S.player; if (!mo) return; const fog = fogTint(2, '#d8d0ff'); if (!fog) return;
  const x = (mo.x + p.x) / 2, y = (mo.y + p.y) / 2, R0 = Math.max(150, dist(mo, p) * 0.8 + 90);
  g.save(); g.imageSmoothingEnabled = true; g.globalCompositeOperation = 'soft-light'; g.globalAlpha = 0.55; g.drawImage(fog, x - cx - R0, y - cy - R0 * 0.62, R0 * 2, R0 * 1.24); g.restore();
}
function fusionClear(ctx) {
  for (const o of (ST.props || [])) dropProp(ctx, o); ST.props = []; ST.clones = []; ST.replays = []; ST.beams = []; ST.delayed = []; ST.pages = []; ST.grandOn = false; restoreVoids(ctx, true);
}
function fusionDrawGround(g, ctx, cx, cy) {
  for (const v of (ST.voids || [])) { const fog = fogTint(1, '#1a1030'), k = Math.min(1, v.t / 0.4) * Math.min(1, (v.T - v.t) / 0.6); if (!fog) break; g.save(); g.imageSmoothingEnabled = true; g.globalAlpha = 0.85 * k; const m = ctx.S.map;
    for (const c of v.cells) { const x = (c.k % m.w) * TS, y = Math.floor(c.k / m.w) * TS; g.drawImage(fog, x - cx - 4, y - cy - 3, TS + 8, TS + 6); } g.restore(); }   /* dải sàn sụp: sương tối phủ đúng ô */
  for (const h of ST.hz) if (h.k === 'whirl' && h.t >= 0) { const im = img(UIL('f_whirl_' + FPICK.whirl)), k = Math.min(1, h.t / 0.4) * Math.min(1, Math.max(0, (h.T - h.t) / 0.5)), fog = fogTint(2, '#20103a');
    g.save(); if (fog) { g.imageSmoothingEnabled = true; g.globalAlpha = 0.6 * k; g.drawImage(fog, h.x - cx - 70, h.y - cy - 44, 140, 88); }
    if (im) { g.imageSmoothingEnabled = false; g.globalAlpha = k; g.translate(Math.round(h.x - cx), Math.round(h.y - cy)); g.rotate(-ST.t * 1.6); const w = im.naturalWidth / 2; g.drawImage(im, 0, 0, im.naturalWidth, im.naturalHeight, -w / 2, -w / 2, w, w); }
    g.restore(); }
}
function fusionDrawables(ctx, cx, cy, out) {
  const g = ctx.g;
  for (const c of (ST.clones || [])) out.push({ y: c.y, f: () => drawLy(g, { dir: c.dir, clip: 'idle', ft: ST.t, alpha: 0.5, form: 'chad', lift: 0 }, c.x - cx, c.y - cy, 3) });   /* phân thân gương (mờ) */
  for (const b of (ST.beams || [])) out.push({ y: b.gy != null ? b.gy + (b.b.y < b.a.y ? -0.5 : 0.5) : 1e9 - 3, skill: b.gy != null ? 'ly_beam' : undefined, f: () => { const s = b.blue ? VX('rk_ha2_l') : b.dark ? bSheet('rk_ha2_l', true) : violSheet('rk_ha2_s'); if (!s) return; const L0 = Math.hypot(b.b.x - b.a.x, b.b.y - b.a.y), ang = Math.atan2(b.b.y - b.a.y, b.b.x - b.a.x);
    let d = 0; while (d < L0 - 1) { const seg = Math.min(170, L0 - d); bDraw(g, s, bFrame(s, b.t), b.a.x + Math.cos(ang) * d - cx, b.a.y + Math.sin(ang) * d - cy, ang, seg, 1); d += seg; } } });   /* tia dài hơn 1 sheet: nối nhiều đoạn */
  for (const pg of (ST.pages || [])) out.push({ y: 1e9, f: () => { const im = img(UIL('f_page_' + FPICK.page)); if (!im) return; g.save(); g.imageSmoothingEnabled = false; g.globalAlpha = Math.max(0, 1 - pg.t / 1.6); g.translate(Math.round(pg.x - cx), Math.round(pg.y - cy)); g.rotate(Math.sin(pg.t * 6) * 0.5); g.drawImage(im, 0, 0, im.naturalWidth, im.naturalHeight, -im.naturalWidth / 4, -im.naturalHeight / 4, im.naturalWidth / 2, im.naturalHeight / 2); g.restore(); } });
}
const FPICK = { mirror: 'a', page: 'b', whirl: 'a', glyph: { hacrocky: 'b', trongdong: 'a', guong: 'b', hoden: 'b', dongho: 'a', kraken: 'a' } };
/* ================= plan-36 SỬA THEO ANH: Ngưng Đọng Thời Gian · Huýt Sáo Gọi Trùm · Hắc Hóa · Đấm Liên Hoàn Ki · Siêu Hấp Dẫn ================= */
const FU2_NAME = {
  timestop: ['NGƯNG ĐỌNG THỜI GIAN', 'TIME STOP', 'Đồng Hồ', 'The Clock'],
  whistle: ['Huýt Sáo Gọi Trùm', 'Boss Whistle', 'mọi trùm', 'every boss'],
  kiflurry: ['Đấm Liên Hoàn Ki', 'Ki Barrage', 'Ki của Lyron', "Lyron's Ki"],
  gravity: ['SIÊU HẤP DẪN', 'SUPER GRAVITY', 'Hố Đen', 'Black Hole'],
};
Object.assign(FNAME, FU2_NAME);
const SUMMONS = ['hacrocky', 'trongdong', 'guong', 'hoden', 'dongho', 'kraken'];
const SUMMON_NAME = { hacrocky: ['Hắc Rocky', 'Dark Rocky'], trongdong: ['Trống Đồng', 'Bronze Drum'], guong: ['Nữ Hoàng Pha Lê', 'Crystal Queen'], hoden: ['Hố Đen', 'Black Hole'], dongho: ['Đồng Hồ', 'The Clock'], kraken: ['Kraken', 'Kraken'] };
Object.assign(FU.cd, { timestop: 18, whistle: 30, gravity: 21 });
Object.assign(FU.dmg, { flurry: 0.022, flurryEnd: 0.08, gravity: 0.13, tstopHit: 0.03 });
let QJ = null; if (typeof fetch !== 'undefined') fetch('assets/px/boss/guong/q.json').then(r => (r.ok ? r.json() : null)).then(j => { QJ = j; }).catch(() => {});
const BLACK_READY = true; let BJ = null, BJ_TRY = false; const BDIR = 'boss/lyron_black/';
function loadBlack() { if (BJ_TRY || !BLACK_READY || typeof fetch === 'undefined') return; BJ_TRY = true; loadLJ(BDIR, j => { BJ = j; setTimeout(prewarmRims, 800); }); }

/* ---- Hắc Hóa (thay nổi giận ở 50 %): cắn tay, máu nhỏ, nhầy đen từ khe đá bay tới bám người → thực thể đen bóng ---- */
function startBlacken(ctx, mo) {
  loadBlack(); mo.act = { k: 'blacken', t: 0, T: 3.8, fu: 0 }; mo.lockHp = mo.hp; ST.lb = 0.01; hzClear(ctx); ST.tele = ST.tele.filter(q => !q.act);
  ST.callout = { txt: ctx.lang() === 'vi' ? 'Lyron cắn vào tay…' : 'Lyron bites his own hand…', t: 2 }; log('blacken'); ST.stats.blacken = 1;
}
function tickBlacken(ctx, mo, A, dt) {
  const a0 = A.t; A.t += dt; const at = x => a0 < x && A.t >= x, vi = ctx.lang() === 'vi';
  mo.clip = 'sk_bite'; mo.prog = Math.min(0.99, A.t / 2.5);
  if (at(0.4)) { const h = handOf(mo); for (let i = 0; i < 3; i++) (ST.drips ||= []).push({ x: h.x + (Math.random() - 0.5) * 4, y: h.y + 6, vy: 0, t: -i * 0.15 }); ctx.sfx('bite'); }
  if (at(0.9)) {   /* nhầy đen trồi từ các khe đá quanh sân, bay về Lyron */
    const m = ctx.S.map; for (let i = 0; i < 22; i++) { const a = Math.random() * TAU, R0 = 70 + Math.random() * 120; (ST.globs ||= []).push({ x0: mo.x + Math.cos(a) * R0, y0: mo.y + Math.sin(a) * R0 * 0.75, t: -Math.random() * 0.6, T: 1.0 + Math.random() * 0.4 }); }
    void m; ctx.sfx('rumble'); if (ctx.quake) ctx.quake(0.3);
  }
  if (at(2.5)) { mo.form = 'black'; mo.blackT = 0; chadBox(mo); ctx.S.flash = 0.7; if (ctx.quake) ctx.quake(0.6); fx('hd_nova', mo.x, mo.y - 10, { sheet: bSheet('hd_nova', true) || violSheet('hd_nova'), top: true }); ST.banner = { txt: vi ? 'HẮC HÓA!!' : 'BLACKENED!!', t: 2.6 }; ctx.sfx('roar'); log('black on'); }
  if (A.t >= A.T) { mo.act = null; mo.lockHp = null; ST.lb = 0; ST.cd.strong = 0; let i0 = 0; for (const k in FU_LATE) ST.cd[k] = Math.min(ST.cd[k] ?? 0, 1 + 3 * i0++); log('blacken done'); }
}
const isBlack = mo => mo && mo.form === 'black';

/* ---- Ngưng Đọng Thời Gian ---- */
function startTimestop(ctx, mo) {
  const p = ctx.S.player; mo.act = { fu: 1, k: 'timestop', ph: 'clock', t: 0, px: p.x, py: p.y, hits: 0 };
  tpush(ctx, { type: 'c', x: p.x, y: p.y, r: 26, t: 0.8, T0: 0.8, act: { k: 'tsTele' }, col: '#e0d8ff' });   /* mặt đồng hồ hiện = cửa sổ NÉ HOÀN HẢO */
  mo.clip = 'sk_snap'; mo.prog = 0; ctx.sfx('chime'); return true;
}
function tickTimestop(ctx, mo, A, dt) {
  const p = ctx.S.player, vi = ctx.lang() === 'vi';
  A.t += dt;
  if (A.ph === 'clock') {
    mo.clip = 'sk_snap'; mo.prog = Math.min(0.99, A.t / 0.8);
    const ki = ctx.ki, dodging = (ki && ((ki.busy && ki.busy()) || (ki.iframes && ki.iframes() > 0))) || Math.hypot(p.x - A.px, p.y - A.py) > 44;
    if (dodging && A.t > 0.15) { A.ph = 'miss'; A.t = 0; ST.banner = { txt: vi ? 'Né hoàn hảo — thoát Ngưng Đọng!' : 'Perfect dodge — escaped Time Stop!', t: 1.8 }; log('tstop dodged'); ST.stats.tsDodge = (ST.stats.tsDodge || 0) + 1; return; }
    if (A.t >= 0.8) { A.ph = 'freeze'; A.t = 0; A.sm = p.speedMul; p.speedMul = 0; ST.tfreeze = { t: 0, ghosts: [] }; A.hop = 0; ctx.sfx('freeze'); log('tstop freeze'); }
    return;
  }
  if (A.ph === 'miss') { mo.prog = 0.5; if (A.t > 0.6) { mo.act = null; mo.tiredT = 1.6; } return; }
  if (A.ph === 'freeze') {   /* thế giới khựng: Lyron lướt siêu thanh quanh người chơi, người chơi văng loạn xạ (sát thương dồn lại) */
    p.speedMul = 0; A.hop -= dt; const m = ctx.S.map;
    if (A.hop <= 0) { A.hop = 0.15; A.hits++;
      const F = ST.tfreeze; F.ghosts.push({ x: mo.x, y: mo.y, dir: mo.dir, t: 0 });   /* ảo ảnh siêu thanh ở chỗ cũ */
      const a = Math.random() * TAU; mo.x = p.x - Math.cos(a) * 16; mo.y = p.y - Math.sin(a) * 12; mo.dir = dirOf(Math.cos(a), Math.sin(a)); mo.clip = 'sk_blur'; mo.prog = 0.5;
      fx('rk_punch_t4', p.x, p.y - 4, { sheet: crimSheet('rk_punch_t4'), top: true });
      for (let tr = 0; tr < 6; tr++) { const b = Math.random() * TAU, d = 30 + Math.random() * 40, nx = p.x + Math.cos(b) * d, ny = p.y + Math.sin(b) * d * 0.8; if (isleAt(m, nx, ny)) { p.x = nx; p.y = ny; break; } }   /* bị đánh văng sang chỗ khác (vẫn trên đảo) */
    }
    if (A.t >= 1.7) { A.ph = 'resume'; A.t = 0; p.speedMul = A.sm ?? 1; ST.tfreeze.end = true;
      const total = Math.min(0.2, FU.dmg.tstopHit * A.hits); hurtPlayer(ctx, total, mo, 'fly', 1.3); ctx.S.flash = 0.5; if (ctx.quake) ctx.quake(0.5); ctx.sfx('boom'); log('tstop resume ' + A.hits); }
    return;
  }
  if (A.t > 0.6) { ST.tfreeze = null; endFusion(ctx, mo, 'timestop'); FUSION_SET.timestop = 1; }
}

/* ---- Huýt Sáo Gọi Trùm: 1 trùm ngẫu nhiên vào sân 20 s, phối hợp với Lyron; hạ sớm → Lyron choáng ---- */
function startWhistle(ctx, mo) {
  const b = SUMMONS[(Math.random() * SUMMONS.length) | 0], p = ctx.S.player, vi = ctx.lang() === 'vi', a = Math.random() * TAU;
  const x = mo.x + Math.cos(a) * 80, y = mo.y + Math.sin(a) * 60, hp = Math.round((ST.lyMo ? ST.lyMo.max : 1000) * 0.07);
  const S = { boss: b, t: 0, T: 20, next: 2.4, n: 0 };
  const mm = ctx.monsters.add({ key: 'ly_summon_' + b, vi: SUMMON_NAME[b][0] + ' (triệu hồi)', en: SUMMON_NAME[b][1] + ' (summoned)', hp, dmg: 0, armor: 0, sp: 0, xp: 0, w: 26, h: 30, c: ['#2a1030', '#a060ff', '#e0d0ff'], lySummon: true,
    aiFn: (c2, m2) => { m2.moving = false; }, drawFn: (g, m2, X, Y) => drawSummon(g, S, m2, X, Y),
    onDown: () => { S.dead = true; fx('gm_shatter', mm.x, mm.y - 14, { sheet: violSheet('gm_shatter'), top: true }); const ly = ST.lyMo; if (ly && !ly.act) ly.tiredT = 4; else if (ly) ly.stunAfter = 4; ST.banner = { txt: vi ? 'Hạ trùm triệu hồi — Lyron choáng!' : 'Summon defeated — Lyron is stunned!', t: 2.2 }; log('summon killed'); ST.stats.summonKill = (ST.stats.summonKill || 0) + 1; } }, x, y);
  poise(mm); S.mo = mm; ST.summon = S; fx('gm_arrive', x, y + 4, { sheet: violSheet('gm_arrive') });
  ST.callout = { txt: (vi ? 'Huýt sáo: ' : 'Whistle: ') + SUMMON_NAME[b][vi ? 0 : 1], t: 2.6, icons: [b] };
  mo.act = { fu: 1, k: 'whistle', t: 1.0, T: 1.0 }; mo.clip = 'sk_whistle'; mo.prog = 0; ctx.sfx('whistle'); log('summon ' + b); void p; return true;
}
function summonTick(ctx, dt) {
  const S = ST.summon; if (!S) return; const mo = ST.lyMo, p = ctx.S.player;
  if (S.dead || !mo) { ST.summon = null; return; }
  S.t += dt; if (S.t >= S.T) { fx('gm_shatter', S.mo.x, S.mo.y - 14, { sheet: violSheet('gm_shatter'), top: true }); ctx.monsters.remove(S.mo); ST.summon = null; log('summon gone'); return; }
  S.mo.x += (mo.x + 60 * Math.cos(S.t * 0.5) - S.mo.x) * Math.min(1, dt * 0.8); S.mo.y += (mo.y - 30 + 20 * Math.sin(S.t * 0.7) - S.mo.y) * Math.min(1, dt * 0.8);   /* lượn quanh Lyron */
  S.next -= dt; if (S.next > 0 || ST.grandOn) return; S.next = 3.4; S.n++;
  /* PHỐI HỢP: Lyron gom người chơi (kéo nhẹ) rồi trùm ra đòn đặc trưng vào chỗ người chơi bị gom tới */
  ST.hz.push({ k: 'hole', x: mo.x + (p.x - mo.x) * 0.5, y: mo.y + (p.y - mo.y) * 0.5, t: 0, T: 1.2, R: 0, pull: 30, big: false, hitP: true, hitR: true, ghost: true });
  const g = { x: p.x + (mo.x - p.x) * 0.25, y: p.y + (mo.y - p.y) * 0.25 }, sx = S.mo.x, sy = S.mo.y, a = Math.atan2(g.y - sy, g.x - sx);
  if (S.boss === 'hacrocky') { const len = Math.min(220, Math.hypot(g.x - sx, g.y - sy) + 50); tpush(ctx, { type: 'l', x: sx, y: sy, a, len, w: 20, t: 1.2, T0: 1.2, act: { k: 'sumTele' }, col: '#3a1050' }); (ST.delayed ||= []).push({ at: ST.t + 1.2, f: () => beamSeg({ x: sx, y: sy - 8 }, { x: sx + Math.cos(a) * len, y: sy - 8 + Math.sin(a) * len }, 0.45, FU.dmg.glyph, true, sy) }); }
  else if (S.boss === 'trongdong') { boltAt(ctx, g.x, g.y, 1.2, null, true); for (let i = 0; i < 5; i++) { const b = i / 5 * TAU; boltAt(ctx, g.x + Math.cos(b) * 34, g.y + Math.sin(b) * 26, 1.45, null, true); } ctx.sfx('drum'); }
  else if (S.boss === 'guong') { for (let i = 0; i < 3; i++) { const b = a + (i - 1) * 0.5, len = 200, x0 = g.x - Math.cos(b) * 100, y0 = g.y - Math.sin(b) * 100; tpush(ctx, { type: 'l', x: x0, y: y0, a: b, len, w: 16, t: 1.2, T0: 1.2, act: { k: 'sumTele' }, col: '#a060ff' }); (ST.delayed ||= []).push({ at: ST.t + 1.2, f: () => beamSeg({ x: x0, y: y0 - 6 }, { x: x0 + Math.cos(b) * len, y: y0 - 6 + Math.sin(b) * len }, 0.35, FU.dmg.glyph * 0.8, false) }); } }
  else if (S.boss === 'hoden') ST.hz.push({ k: 'hole', x: g.x, y: g.y, t: -0.6, T: 2.6, R: 11, pull: 16, big: false, hitP: false, hitR: false });
  else if (S.boss === 'dongho') { ST.hz.push({ k: 'clock', x: g.x, y: g.y, t: 0, T: 2.6, R: 40, struck: false }); if (!mo.act && !mo.tiredT) startB(ctx, mo, 'combo3', g); }
  else if (S.boss === 'kraken') { for (let i = 0; i < 3; i++) { const b = Math.random() * TAU; tentAt(ctx, g.x + Math.cos(b) * (i ? 24 : 0), g.y + Math.sin(b) * (i ? 18 : 0), 0.15 * i); } }
  fx('td_spark', sx, sy - 14, { sheet: violSheet('td_spark'), top: true });
}
function drawSummon(g, S, m2, X, Y) {
  const k = Math.min(1, S.t / 0.5) * Math.min(1, (S.T - S.t) / 0.6), bob = Math.round(Math.sin(ST.t * 2) * 2); g.save(); g.globalAlpha = k * 0.8; g.imageSmoothingEnabled = false;   /* bóng ma triệu hồi: trong mờ, tông đỏ thẫm–tím */
  const fog = fogTint(2, '#b04080'); if (fog) { g.imageSmoothingEnabled = true; g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.35 * k; g.drawImage(fog, X - 34, Y - 44, 68, 52); g.globalCompositeOperation = 'source-over'; g.globalAlpha = k * 0.8; g.imageSmoothingEnabled = false; }   /* quầng sáng mềm */
  const put = (im, sx, sy, sw, sh, w, h) => { if (im) g.drawImage(im, sx, sy, sw, sh, Math.round(X - w / 2), Math.round(Y - h - 8 + bob), w, h); };
  if (S.boss === 'hacrocky') { const c = rkCanvas('rtt_hover_s', Math.floor(ST.t * 8) % 4) || rkCanvas('rtt_hover_s', 0); if (c) put(c, 0, 0, c.width, c.height, c.width / 2, c.height / 2); }
  else if (S.boss === 'trongdong') { const im = violImg('boss/trongdong/drum_s32.png', 0.35); if (im) put(im, 0, 0, 32, 32, 32, 32); }
  else if (S.boss === 'guong') { const im = violImg('boss/guong/q_idle.png', 0.35); if (im && QJ) { const f = Math.floor(ST.t * 6) % (QJ.clips.idle.n || 6); put(im, f * QJ.cw, 0, QJ.cw, QJ.ch, QJ.cw / 2, QJ.ch / 2); } }
  else if (S.boss === 'dongho') { const im = violImg('boss/dongho/clockface_s29.png', 0.5); if (im) put(im, 0, 0, im.width, im.height, im.width / 2, im.height / 2); }
  else if (S.boss === 'hoden') { const im = violImg('boss/hoden/hole80_s11.png'); if (im) put(im, 0, 0, im.width, im.height, im.width / 2, im.height / 2); }
  else if (S.boss === 'kraken') { const im = violImg('zones/village/rem/kraken_head.png', 0.15); if (im) put(im, 0, 0, im.width, im.height, im.width / 2, im.height / 2); }   /* đầu Kraken (ảnh gốc 64×48) tô tím, cỡ vừa sân */
  g.restore();
}

/* ---- Đấm Liên Hoàn Ki: thanh Ki riêng của Lyron; đầy → lao tới đấm liên hoàn (ảo ảnh nắm đấm), cú cuối hất ---- */
function kiTick(ctx, mo, dt) {
  if (!mo || ST.phase !== 'B' || !isChad(mo) && !isBlack(mo)) return;
  ST.lyKi = Math.min(7, (ST.lyKi || 0) + dt * (isBlack(mo) ? 0.2 : 0.14));
  if (mo.hp < (ST.kiHp ?? mo.hp)) ST.lyKi = Math.min(7, ST.lyKi + 0.08); ST.kiHp = mo.hp;   /* đầy ~25–35 s một lần */
}
function startFlurry(ctx, mo, tp) {
  ST.lyKi = 0; const a = Math.atan2(tp.y - mo.y, tp.x - mo.x), len = Math.min(130, dist(mo, tp) + 10);
  mo.act = { fu: 1, k: 'kiflurry', ph: 'aim', t: 0.75, a, len, n: 0, hit: false };
  tpush(ctx, { type: 'l', x: mo.x, y: mo.y, a, len: len + 30, w: 34, t: 0.75, T0: 0.75, act: mo.act, col: '#ffe080' });
  mo.clip = 'sk_blur'; mo.prog = 0; ctx.sfx('charge'); return true;
}
function tickFlurry(ctx, mo, A, dt) {
  const p = ctx.S.player;
  if (A.ph === 'aim') { A.t -= dt; mo.prog = 0.4; if (A.t <= 0) { A.ph = 'go'; A.go = 0; ctx.sfx('dash'); } return; }
  if (A.ph === 'go') { const sp = 420 * dt; A.go += sp; mo.x += Math.cos(A.a) * sp; mo.y += Math.sin(A.a) * sp; keepIn(ctx, mo); mo.clip = 'sk_blur'; mo.prog = 0.6; if (A.go >= A.len || mo._blk) { A.ph = 'ora'; A.t = 0; A.tick = 0; } return; }
  if (A.ph === 'ora') {   /* "ora ora": nắm đấm ảo ảnh tới tấp trước mặt */
    A.t += dt; A.tick -= dt; mo.clip = 'sk_ora'; mo.prog = (A.t * 5) % 1;
    const fxp = { x: mo.x + Math.cos(A.a) * 22, y: mo.y + Math.sin(A.a) * 22 };
    if (A.tick <= 0) { A.tick = 0.08; for (let i = 0; i < 2; i++) fx('rk_punch_t4', fxp.x + (Math.random() - 0.5) * 22, fxp.y - 6 + (Math.random() - 0.5) * 18, { sheet: crimSheet('rk_punch_t4'), dur: 0.25 });
      if ((A.n++ % 2) === 0) { hitBoth(ctx, q => Math.hypot(q.x - fxp.x, q.y - fxp.y) < 24, FU.dmg.flurry, mo, 'stagger'); } ctx.sfx('punch'); }
    if (A.t >= 1.15) { A.ph = 'up'; A.t = 0.3; hitBoth(ctx, q => Math.hypot(q.x - fxp.x, q.y - fxp.y) < 28, FU.dmg.flurryEnd, mo, 'launch'); fx('knock_heavy', fxp.x, fxp.y) || fx('hr_boom', fxp.x, fxp.y - 6, { top: true }); if (ctx.quake) ctx.quake(0.4); log('flurry end'); }
    return;
  }
  A.t -= dt; mo.clip = 'sk_upper'; mo.prog = Math.min(0.99, 1 - A.t / 0.3); if (A.t <= 0) { mo.act = null; mo.tiredT = 1.4; }
}

/* ---- SIÊU HẤP DẪN: đấm sàn → không gian méo, mọi thứ bị hút về hắn → gồng → nổ văng tất cả ---- */
function startGravity(ctx, mo) {
  const c = { x: mo.x, y: mo.y }; mo.act = { fu: 1, k: 'gravity', t: 0, c, ph: 'punch' }; mo.clip = 'sk_floor2'; mo.prog = 0;
  tpush(ctx, { type: 'c', x: c.x, y: c.y, r: 120, t: 3.0, T0: 3.0, act: { k: 'gravTele' }, col: '#8040c0' });   /* vụ nổ cuối: vòng 120 px — lộn đúng lúc hắn gồng */
  ctx.sfx('charge'); return true;
}
function tickGravity(ctx, mo, A, dt) {
  const p = ctx.S.player, r = rkPos(ctx), m = ctx.S.map, c = A.c; A.t += dt;
  if (A.ph === 'punch') { mo.clip = 'sk_floor2'; mo.prog = Math.min(0.99, A.t / 0.6); if (A.t >= 0.6) { A.ph = 'pull'; fx('hd_implode', c.x, c.y - 4, { sheet: violSheet('hd_implode') }); fx('knock_erupt', c.x, c.y + 2) || fx('dirt_puff', c.x, c.y + 2); if (ctx.quake) ctx.quake(0.5); ctx.sfx('boom'); ST.warp = { x: c.x, y: c.y, t: 0, T: 2.6 };
    for (let i = 0; i < 16; i++) { const a = Math.random() * TAU, R0 = 90 + Math.random() * 120; (ST.debris ||= []).push({ x: c.x + Math.cos(a) * R0, y: c.y + Math.sin(a) * R0 * 0.75, vx: 0, vy: 0, t: 0, kind: Math.random() < 0.3 ? 'page' : 'rock', in: true }); } }
    return; }
  if (A.ph === 'pull') {   /* hút: người chơi, Rocky, đá vụn, trang kịch bản */
    mo.clip = 'sk_hold'; mo.prog = (A.t * 3) % 1;
    const d = dist(p, c); if (d > 18 && !(ctx.knocked && ctx.knocked())) { const s = Math.min(d - 16, (40 + (200 - Math.min(200, d)) * 0.25) * dt); p.tryMove((c.x - p.x) / d * s, (c.y - p.y) / d * s, m, []); }
    if (r && ctx.rocky.hitBy && Math.floor(A.t / 0.5) !== A.rk) { A.rk = Math.floor(A.t / 0.5); const dr = dist(r, c); if (dr > 24) ctx.rocky.hitBy(0, ST.lyMo, (c.x - r.x) / dr, (c.y - r.y) / dr, 26, undefined); }
    for (const o of (ST.props || [])) if (!o.gone && !o.broken && o.mo) { const dd = dist(o.mo, c); if (dd > 20) { o.mo.x += (c.x - o.mo.x) * Math.min(1, dt * 0.8); o.mo.y += (c.y - o.mo.y) * Math.min(1, dt * 0.8); } }
    if (A.t >= 2.4) { A.ph = 'flex'; mo.clip = 'sk_blast'; ctx.sfx('roar'); }
    return; }
  if (A.ph === 'flex') { mo.clip = 'sk_blast'; mo.prog = Math.min(0.99, (A.t - 2.4) / 0.6); if (A.t >= 3.0) { A.ph = 'blast';   /* nổ văng tất cả */
      hitBoth(ctx, q => dist(q, c) < 124, FU.dmg.gravity, { x: c.x, y: c.y + 4 }, 'fly'); fx('hd_nova', c.x, c.y - 6, { sheet: violSheet('hd_nova'), top: true }); fx('ult_thunderring', c.x, c.y + 20, { sheet: violSheet('ult_thunderring'), alpha: 0.85 }); ctx.S.flash = 0.6; if (ctx.quake) ctx.quake(0.7); ctx.sfx('boom');
      for (const dbr of (ST.debris || [])) { const a = Math.atan2(dbr.y - c.y, dbr.x - c.x) || Math.random() * TAU; dbr.in = false; dbr.vx = Math.cos(a) * 260; dbr.vy = Math.sin(a) * 200; dbr.t = 0; }
      if (ST.warp) { ST.warp.blast = 0; } log('gravity blast'); } return; }
  if (A.t >= 3.6) endFusion(ctx, mo, 'gravity');
}
function fusion2Tick(ctx, dt) {
  const mo = ST.lyMo;
  summonTick(ctx, dt); kiTick(ctx, mo, dt);
  if (mo && mo.stunAfter && !mo.act) { mo.tiredT = mo.stunAfter; mo.stunAfter = 0; }
  if (ST.drips) { for (const d of ST.drips) { d.t += dt; if (d.t > 0) { d.vy += 140 * dt; d.y += d.vy * dt; } } ST.drips = ST.drips.filter(d => d.t < 1.2); }
  if (ST.globs) { for (const q of ST.globs) q.t += dt; ST.globs = ST.globs.filter(q => q.t < q.T); }
  if (ST.tfreeze) { const F = ST.tfreeze; F.t += dt; for (const gh of F.ghosts) gh.t += dt; F.ghosts = F.ghosts.filter(gh => gh.t < 1.4); }
  if (ST.warp) { ST.warp.t += dt; if (ST.warp.blast != null) ST.warp.blast += dt; if (ST.warp.t > 4) ST.warp = null; }
  if (ST.debris && mo) { const c = (mo.act && mo.act.c) || mo; for (const d of ST.debris) { d.t += dt; if (d.in) { const dd = Math.hypot(c.x - d.x, c.y - d.y); if (dd > 14) { d.x += (c.x - d.x) / dd * Math.min(dd - 12, 120 * dt); d.y += (c.y - d.y) / dd * Math.min(dd - 12, 120 * dt); } } else { d.x += d.vx * dt; d.y += d.vy * dt; d.vx *= 0.96; d.vy *= 0.96; } } ST.debris = ST.debris.filter(d => d.in || d.t < 1.2); }
  if (mo && isBlack(mo) && mo.moving && Math.random() < dt * 6) fx('u_ink', mo.x, mo.y + 2, { sheet: bSheet('u_ink', true) || violSheet('u_ink'), dur: 0.5, alpha: 0.7 });   /* vệt nhầy đen khi di chuyển */
}
function fusion2Drawables(ctx, cx, cy, out) {
  const g = ctx.g, mo = ST.lyMo;
  for (const d of (ST.drips || [])) if (d.t > 0) out.push({ y: 1e9 - 4, f: () => { const s = crimSheet('u_ink'); if (s) drawSheet(g, s, Math.min(s.n - 1, Math.floor(d.t * 10)), d.x - cx, d.y - cy, 0.9); } });   /* máu nhỏ xuống */
  for (const q of (ST.globs || [])) if (q.t > 0 && mo) out.push({ y: 1e9 - 4, f: () => { const k = Math.min(1, q.t / q.T), e = k * k, x = q.x0 + (mo.x - q.x0) * e, y = q.y0 + (mo.y - 14 - q.y0) * e - Math.sin(k * Math.PI) * 30; const s = bSheet('u_ink', true); if (s) drawSheet(g, s, Math.floor(q.t * 12) % s.n, x - cx, y - cy, 0.95); } });   /* nhầy đen bay tới bám vào người */
  if (ST.tfreeze) { const F = ST.tfreeze;
    for (const gh of F.ghosts) out.push({ y: 1e9 - 5, f: () => drawLy(g, { dir: gh.dir, clip: 'punch', prog: 0.6, ft: 0, alpha: Math.max(0, 0.6 - gh.t * 0.45), form: mo ? mo.form : 'chad', lift: 3 }, gh.x - cx, gh.y - cy, 3) });   /* ảo ảnh siêu thanh */
    if (!F.end) out.push({ y: 1e9 + 1, f: () => { g.save(); g.globalCompositeOperation = 'saturation'; g.fillStyle = '#808080'; g.globalAlpha = Math.min(0.85, F.t * 4); g.fillRect(-4, -4, (ctx.VW || 480) + 8, (ctx.VH || 270) + 8); g.restore(); } });   /* thời gian ngưng: màu nhạt đi */
  }
  for (const d of (ST.debris || [])) out.push({ y: d.y, f: () => { if (d.kind === 'page') { const im = img(UIL('f_page_' + FPICK.page)); if (!im) return; g.save(); g.imageSmoothingEnabled = false; g.translate(Math.round(d.x - cx), Math.round(d.y - cy - 10)); g.rotate(d.t * 4); g.drawImage(im, 0, 0, im.naturalWidth, im.naturalHeight, -im.naturalWidth / 8, -im.naturalHeight / 8, im.naturalWidth / 4 * 1, im.naturalHeight / 4 * 1); g.restore(); }
    else { const sh = mindSheet(FRAGS.B[0].set); if (!sh) return; const hi = sh.width / 16; g.save(); g.imageSmoothingEnabled = false; g.drawImage(sh, 15 * hi + hi / 4, hi / 4, hi / 2, hi / 2, Math.round(d.x - cx - 4), Math.round(d.y - cy - 8), 8, 8); g.restore(); } } });   /* mảnh đá sàn (cắt từ ô PixelLab) */
  if (ST.warp && mo) out.push({ y: 1e9 - 7, f: () => lensWarp(g, ctx, ST.warp, cx, cy) });
  if (ST.warp && mo) { const W2 = ST.warp; out.push({ y: 1e9 - 6, f: () => { const fog = fogTint(3, '#b080ff'); if (!fog) return; g.save(); g.imageSmoothingEnabled = true; g.globalCompositeOperation = 'lighter';   /* không gian méo: các vành sương co về tâm, nổ thì toả ra */
    for (let i = 0; i < 4; i++) { const ph = ((W2.t * 0.8 + i / 4) % 1), R0 = W2.blast != null ? 20 + (W2.blast * 260) + i * 18 : 150 * (1 - ph) + 12, a = W2.blast != null ? Math.max(0, 0.5 - W2.blast) : 0.18 * ph; const n = 18; g.globalAlpha = a;
      for (let j = 0; j < n; j++) { const b = j / n * TAU + W2.t * (i % 2 ? 1 : -1); g.drawImage(fog, W2.x - cx + Math.cos(b) * R0 - 10, W2.y - cy + Math.sin(b) * R0 * 0.75 - 6, 20, 12); } }
    g.restore(); } }); }
}
let LENS = null;
function lensWarp(g, ctx, W2, cx, cy) {   /* méo không gian: chép vùng quanh tâm (1 lần / khung, canvas phụ) rồi vẽ lại thành các vành bị kéo về tâm (hút) / đẩy ra (nổ) */
  if (typeof document === 'undefined') return; const cv = g.canvas; if (!cv) return;
  const tr = g.getTransform ? g.getTransform() : { a: 1, d: 1, e: 0, f: 0 }, k = tr.a || 1;
  const X = (W2.x - cx) * k + tr.e, Y = (W2.y - cy) * k + tr.f, R0 = 130 * k, size = Math.ceil(R0 * 2);
  const blast = W2.blast != null, ph = blast ? Math.max(0, 1 - W2.blast / 0.5) : Math.min(1, W2.t / 0.4) * Math.max(0, Math.min(1, (W2.T - W2.t) / 0.4)); if (ph <= 0.01) return;
  LENS ||= document.createElement('canvas'); if (LENS.width !== size) { LENS.width = size; LENS.height = size; }
  const lg = LENS.getContext('2d'); lg.clearRect(0, 0, size, size); lg.drawImage(cv, X - R0, Y - R0, size, size, 0, 0, size, size);
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.imageSmoothingEnabled = true;
  const rings = 6; for (let i = rings - 1; i >= 0; i--) {   /* vành ngoài trước: mỗi vành phóng / thu khác nhau → ảnh cong như thấu kính */
    const r1 = R0 * (i + 1) / rings, r0 = R0 * i / rings, wob = Math.sin(W2.t * 9 + i) * 0.015;
    const sc = 1 + (blast ? -0.12 : 0.16) * ph * (1 - i / rings) + wob * ph;   /* hút: phóng to vào tâm (không gian bị kéo) · nổ: co lại */
    g.save(); g.beginPath(); g.arc(X, Y, r1, 0, TAU); g.arc(X, Y, r0, 0, TAU, true); g.clip();
    g.translate(X, Y); g.rotate((blast ? -1 : 1) * 0.06 * ph * (1 - i / rings)); g.scale(sc, sc * 0.92); g.drawImage(LENS, -R0, -R0); g.restore();
  }
  g.restore();
}
function fusion2Clear(ctx) { if (ST.summon && ST.summon.mo) ctx.monsters.remove(ST.summon.mo); ST.summon = null; ST.tfreeze = null; ST.debris = []; ST.globs = []; ST.drips = []; ST.warp = null; const p = ctx.S.player; if (p && p.speedMul === 0 && !(ctx.knocked && ctx.knocked())) p.speedMul = 1; }
   /* bản PixelLab đã chọn (a/b/c) — xem DAU-NAO */

function handOf(mo) { const w = (mo.dir || 'south').includes('west'), e = (mo.dir || '').includes('east'); return { x: mo.x + (w ? -9 : e ? 9 : 6), y: mo.y - (mo.lift ?? 16) - 24 }; }   /* tay giơ cao (clip cast) */
let TID = 0;
function tpush(ctx, q) {   /* vệt báo đòn + khai báo cho hệ Ki (né tự động) — API.md mục Ki: điểm so = (p.x, p.y − 6) */
  ST.tele.push(q);
  if (!ctx || !ctx.threat || !ctx.threat.add) return q;
  if (q.act && (q.act.k === 'burrow' || q.act.k === 'dbl' || q.act.k === 'punch' || q.act.k === 'whip')) return q;   /* cận chiến quanh trùm / vòng bám theo: không khai */
  const id = 'ly' + (++TID);
  try {
    if (q.type === 'l') ctx.threat.add({ id, kind: q.len > 140 ? 'beam' : 'lunge', from: { x: q.x, y: q.y - 6 }, to: { x: q.x + Math.cos(q.a) * q.len, y: q.y - 6 + Math.sin(q.a) * q.len }, in: q.t, dur: q.act && (q.act.k === 'hha' || q.act.k === 'stare' || q.act.k === 'ha') ? 0.5 : 0.2, width: Math.max(4, (q.w || 16) - 12) });
    else ctx.threat.add({ id, kind: 'circle', to: { x: q.x, y: q.y - 6 }, in: q.t, radius: (q.r || 14) + 3, dur: 0.2 });
  } catch (e) { /* Ki không có / lỗi: bỏ qua */ }
  return q;
}
function spawnLeg(ctx, x, y, T0, dmg, ring) { tpush(ctx, { type: 'c', x, y, r: 14, t: T0, T0, leg: true, dmg, col: '#ffb040', ring: !!ring }); }
function actB(ctx, mo, A, dt, p) {
  if (actEcho(ctx, mo, A, dt, p)) return;
  A.t -= dt;
  if (A.k === 'whip') {
    mo.prog = Math.min(0.99, 1 - Math.max(0, A.t) / A.T0) * 0.6 + (A.t <= 0 ? 0.35 : 0);
    if (A.t > 0) return;
    if (!A.done) { A.done = true; const a0 = { x: mo.x, y: mo.y - 4 }, b0 = { x: mo.x + Math.cos(A.a) * A.len, y: mo.y - 4 + Math.sin(A.a) * A.len };
      const n = hitBoth(ctx, q => segDist({ x: q.x, y: q.y - 4 }, a0, b0) < 12, A.heavy ? RB.dmg.whip3 : RB.dmg.whip, mo, A.heavy ? 'fly' : 'stagger');
      fx('ly_scarf_lash_s', mo.x + Math.cos(A.a) * 30, mo.y - 8 + Math.sin(A.a) * 30, { ang: A.a, top: true, ky: mo.y + (Math.sin(A.a || 0) < 0 ? -0.5 : 0.5) }) || fx('spar_whip', (a0.x + b0.x) / 2, (a0.y + b0.y) / 2 + 6);   /* vệt quất khăn đỏ thẫm (vfx_workbench) xoay theo hướng quất */ ctx.sfx('whip'); A.t2 = 0.3; log('whip hit ' + n + (A.heavy ? ' heavy' : '')); }
    A.t2 -= dt; if (A.t2 <= 0) mo.act = null; return;
  }
  if (A.k === 'dash') {
    if (A.ph === 'aim') { if (A.t <= 0) { A.ph = 'go'; A.go = 0; ctx.sfx('dash'); } return; }
    const sp = 340 * dt; A.go += sp; mo.x += Math.cos(A.a) * sp; mo.y += Math.sin(A.a) * sp; mo.prog = 0.6; keepIn(ctx, mo); if (mo._blk) A.go = A.len;
    const p0 = ctx.S.player, r = rkPos(ctx);
    if (!A.hitP && dist(mo, p0) < 15) { A.hitP = true; hurtPlayer(ctx, RB.dmg.dash, mo, 'fly', 1.2); }
    if (!A.hitR && r && dist(mo, r) < 15) { A.hitR = true; hurtRocky(ctx, RB.dmg.dash, mo, 'fly'); } if (!A.hitL && ltHitAt(ctx, q => dist(mo, q) < 15, RB.dmg.dash, mo, 'fly')) A.hitL = true;
    if (A.go >= A.len) mo.act = null; return;
  }
  if (A.k === 'arc') {
    mo.prog = Math.min(0.99, 1 - Math.max(0, A.t) / A.T) * 0.7 + (A.ph === 'fire' ? 0.3 : 0);
    if (A.ph === 'wind') { if (Math.random() < dt * 10) { const h = handOf(mo); fx('td_spark', h.x + (Math.random() - 0.5) * 8, h.y + (Math.random() - 0.5) * 6, { top: true, sheet: violSheet('td_spark'), dur: 0.25 }); }
      if (A.t <= 0) { A.ph = 'fire'; A.t = 0.4; const h = handOf(mo), tg = [ctx.S.player, rkPos(ctx)].filter(q => q && Math.hypot(q.x - mo.x, q.y - mo.y) < 175); let n = 0;
        for (const q of tg) { ST.arcs.push({ x0: h.x, y0: h.y, x1: q.x, y1: q.y - lift(ctx) - 8, t: 0, k: (Math.random() * 4) | 0, gy: mo.y }); fx('td_spark', q.x, q.y - lift(ctx) - 8, { top: true, sheet: violSheet('td_spark') }); n++; }
        hitBoth(ctx, s => Math.hypot(s.x - mo.x, s.y - mo.y) < 175, RB.dmg.arc, mo, 'stagger'); if (!n) ST.arcs.push({ x0: h.x, y0: h.y, x1: h.x + (mo.dir.includes('west') ? -60 : 60), y1: h.y + 20, t: 0, k: 1, gy: mo.y }); ctx.S.flash = Math.max(ctx.S.flash || 0, 0.18); log('arc ' + n); } return; }
    if (A.t <= 0) mo.act = null; return;
  }
  if (A.k === 'legs' || A.k === 'bolt') { mo.prog = Math.min(0.99, 1 - Math.max(0, A.t) / A.T); if (A.t <= -0.2) mo.act = null; return; }
  if (A.k === 'ult') {
    const c = A.c;
    if (A.ph === 'go') { mo.prog = 0.2; if (moveTo(mo, c.x, c.y - 10, 260, dt) || dist(mo, { x: c.x, y: c.y - 10 }) < 3) { A.ph = 'waves'; A.t = 0; ST.banner = { txt: L(ctx).sk.ult, t: 2.2 }; } return; }
    if (A.ph === 'waves') {
      mo.prog = 0.5 + 0.4 * Math.abs(Math.sin(ST.t * 2)); A.wt = (A.wt || 0) - dt;
      if (A.wt <= 0 && A.waves < 3) {
        const k = A.waves, R = 46 + k * 46, n = 9 + k * 5, gap = Math.random() * TAU;
        for (let i = 0; i < n; i++) { const a = gap + (i + 1) * (TAU / (n + 2)); spawnLeg(ctx, c.x + Math.cos(a) * R, c.y + Math.sin(a) * R * 0.85, 1.1, RB.dmg.ult, true); }
        const p0 = ctx.S.player, r = rkPos(ctx); tpush(ctx, { type: 'c', x: p0.x, y: p0.y, r: 13, t: 1.2, T0: 1.2, bolt: true, col: '#c060ff' }); if (r) tpush(ctx, { type: 'c', x: r.x, y: r.y, r: 13, t: 1.3, T0: 1.3, bolt: true, col: '#c060ff' });
        A.waves++; A.wt = 1.15; ctx.sfx('rumble'); ST.crumble = 1.5; const m = ctx.S.map; if (m.rim && m.rim.length) for (let i = 0; i < 8; i++) { const q = m.rim[(Math.random() * m.rim.length) | 0], f = FRAGS[m.mind] && FRAGS[m.mind][0]; if (f) (ST.chunks ||= []).push({ x: q.x, y: q.y - 8, t: 0, set: f.set }); }   /* nền tâm trí rung + vỡ vụn ở mép */
      }
      if (A.waves >= 3 && A.wt <= -0.6) { mo.act = null; mo.lockHp = null; mo.tiredT = 3; ST.lb = 0; ST.banner = { txt: L(ctx).tired, t: 1.8 }; log('ult done'); }
      return;
    }
  }
  mo.act = null;
}
function teleTick(ctx, dt) {   /* vòng báo hết giờ → nổ: chân rết trồi / sét */
  for (const q of ST.tele) {
    q.t -= dt; if (q.t > 0 || q.done) continue; q.done = true; if (q.act) continue;
    if (q.leg) { ST.legs.push({ x: q.x, y: q.y, t: 0 }); hitBoth(ctx, s => Math.hypot(s.x - q.x, s.y - q.y) < q.r + 3, q.dmg || RB.dmg.legs, { x: q.x, y: q.y + 6 }, 'fly'); fx('dirt_puff', q.x, q.y + 2) || fx('knock_erupt', q.x, q.y + 2);   /* vòng bụi (vfx_workbench) — bỏ vệt nứt 'mì sợi' anh chê */ }
    if (q.bolt) {   /* sét từ đám mây bão TRÊN CAO đánh xuyên qua điểm đích (độ cao thân người) rồi tan vào sương — không có đĩa 'mặt đất' giữa trời */
      const n = hitBoth(ctx, s => Math.hypot(s.x - q.x, s.y - q.y) < q.r + 3, RB.dmg.bolt, { x: q.x, y: q.y - 4 }, 'fly');
      const bh = ctx.S.map.air ? AIR_LIFT + 8 : 9; ST.bolts.push({ x: q.x, y: q.y - bh, t: 0, k: (Math.random() * 4) | 0, small: !!q.small }); fx('td_spark', q.x, q.y - bh, { top: true, sheet: violSheet('td_spark') });
      ctx.S.flash = Math.max(ctx.S.flash || 0, 0.32); ST.wallGlow = 0.55; ST.wallA = Math.random() * TAU; ctx.sfx('thunder'); void n; }
  }
  ST.tele = ST.tele.filter(q => (q.act ? q.t > -0.05 : !q.done));
  for (const l of ST.legs) l.t += dt; ST.legs = ST.legs.filter(l => l.t < 0.9);
  for (const b of ST.bolts) b.t += dt; ST.bolts = ST.bolts.filter(b => b.t < 0.62);
  for (const a of ST.arcs) a.t += dt; ST.arcs = ST.arcs.filter(a => a.t < 0.38);
}
function lyDown(ctx, mo) {   /* hạ Lyron trong tâm trí hắn → tâm trí vỡ vụn → về bầu trời thật trên xác rết: cảnh kết */
  const t = L(ctx); ST.phase = 'end'; mo.act = null; ST.tele = []; ST.legs = []; hzClear(ctx);
  const at = { x: mo.x, y: mo.y }; ctx.monsters.remove(mo); ST.lyMo = null;
  ST.ly = { x: at.x, y: at.y, dir: 'south', clip: 'defeat', prog: 0, ft: 0, alpha: 1, lift: lift(ctx) };
  fx('hr_boom', at.x, at.y - 8, { top: true }); ctx.S.flash = 0.6; if (ctx.quake) ctx.quake(0.5); ctx.sfx('boss_win'); log('lyron down');
  if (!ST.replay) { const h = sv(ctx); h.stage = 'ending'; ctx.persist(); }   /* plan-43 C1: ôn lại không ghi 'ending' */
  if (ST.replay) { cine(ctx, [{ act: () => { ST.ly.anim = { t: 1.4, T: 1.4 }; ST.banner = { txt: t.won, t: 2.5 }; }, wait: 1.6 }], () => finish(ctx, at)); return; }   /* ôn lại: không lặp cảnh kết */
  cine(ctx, [{ act: () => { ST.ly.anim = { t: 1.4, T: 1.4 }; ST.banner = { txt: t.won, t: 3 }; ST.crumble = 3; }, wait: 1.8 }, ...lines(t.end.slice(0, 1), t), { act: () => { fx('ly_mind_shatter', at.x, at.y - 20, { top: true }); ST.crumble = 4; if (ctx.quake) ctx.quake(0.4); }, wait: 0.7 }], () => pullTo(ctx, MEET_Z, 'shatter', 'back'));   /* tâm trí vỡ: mảnh kính tím (vfx_workbench) → 2026-10-15: tỉnh lại ở CẦU TÀU đêm (không về bầu trời) */
}
function startEnding(ctx) {   /* bầu trời thật: Lyron quỵ gối trên mây, hoá đá, chìm, khăn bay về */
  const t = L(ctx), c0 = center(ctx), at = { x: c0.x, y: c0.y - 30 }; ST.phase = 'end'; ST.corpse = true;
  { const p = ctx.S.player; p.x = at.x - 22; p.y = at.y + 44; p.dir = 3; setTimeout(() => { if (ctx.rocky && ctx.rocky.place) ctx.rocky.place(at.x + 24, at.y + 46, 'dn'); }, 60); }
  ST.ly = { x: at.x, y: at.y, dir: 'south', clip: 'defeat', prog: 0.99, ft: 0, alpha: 1, lift: lift(ctx) };
  const steps = [
    { wait: 0.6 },
    { act: () => { fx('petrify', at.x, at.y - 4, { top: true }) || fx('hr_morph', at.x, at.y); ST.ly.stoneK = 0.01; }, wait: 1.6 },
    { act: () => { ST.ly.stone = true; ST.ly.stoneK = null; ST.ly.lift = 5; ctx.sfx('rumble'); } },
    ...lines(t.end.slice(1, 4), t),
    { act: () => { ST.ly.sink = 0.01; ST.scarfFly = { x: at.x, y: at.y - 24, t: 0, home: true }; }, wait: 2.4 },
    ...lines(t.end.slice(4), t),
  ];
  cine(ctx, steps, () => finish(ctx, at));
}
function finish(ctx, at) {
  const h = sv(ctx), t = L(ctx), first = !h.rewarded; ST.ly = null; ST.scarfFly = null; ST.phase = 'done';
  h.wins++; h.stage = 'done'; h.prevCmd = null; h.cpA = null; h.cpB = null; ST.statueSunk = true;
  const xp = first ? 3000 : 500; if (ctx.hero) ctx.hero.gainXp(xp);
  ctx.give('stone', first ? 800 : 120, at.x, at.y); ctx.give('soul', first ? 5 : 1, at.x + 8, at.y);
  if (first) {
    h.rewarded = true; if (ctx.achieve) ctx.achieve('lyron');
    if (!ctx.bag.has('scarf', 1)) ctx.bag.add('scarf', 1);
    if (h.bkPending) { h.bkPending = false; if (typeof ctx.bkFirstReward === 'function') { try { ctx.bkFirstReward(ctx); } catch (e) { console.error('bkFirstReward', e); } } else { if (ctx.hrBook && ctx.hrBook.add) ctx.hrBook.add(1); if (ctx.achieve) ctx.achieve('bakunawa'); } h.bkGiven = true; }
    ctx.toast(t.scarfBack, true); setTimeout(() => ctx.toast(t.title, true), 2200);
    ctx.persist(); log('FINISH first');
    setTimeout(() => { if (ctx.finale) ctx.finale({ title: t.endTitle, body: t.endBody }); }, 4200);
  } else { ctx.toast(t.again, true); ctx.persist(); log('FINISH again'); }
  if (inMind(ctx)) setTimeout(() => { if (inMind(ctx) && !ST.pull) ctx.travel(MEET_Z, 'back'); }, 2600);   /* 2026-10-15: ôn lại xong → về tượng ở cầu tàu */
}

/* ---------------- manh mối gài ngược: mẩu khăn đỏ ở 5 hang trùm Vết Nứt (chỉ hình + chữ, không đổi cơ chế) ---------------- */
const PERF = { g: [], u: [], b: [] };   /* đo thời gian vẽ của hệ này (test hiệu năng) */
function perfAdd(k, t0) { if (typeof performance === 'undefined') return; const a = PERF[k]; a.push(performance.now() - t0); if (a.length > 240) a.shift(); }
const RIFT = /^rift([1-5])$/;
function clueSpot(ctx) {
  const m = ctx.S.map, z = zid(ctx).match(RIFT); if (!z || !m || !m.entries || !m.entries.default) return null; if (m._lyClue !== undefined) return m._lyClue;
  const e = m.entries.default; let out = null;
  for (const [dx, dy] of [[2, -1], [-2, -1], [3, 0], [-3, 0], [2, -2], [-2, -2], [1, -2]]) { const tx = e.x + dx, ty = e.y + dy; if (!ctx.isSolid(m, tx, ty)) { out = { x: tx * TS + 8, y: ty * TS + 12, i: +z[1] - 1 }; break; } }
  m._lyClue = out; return out;
}

/* ---------------- vào / ra sân ---------------- */
function goArena(ctx) { if (!rk(ctx)) { ctx.toast(ctx.lang() === 'vi' ? 'Phải có Rocky đi cùng' : 'Rocky must be with you'); return false; } ctx.sfx('whirl'); return ctx.travel(ZID, 'default'); }
function startApi(ctx, info = {}) {   /* bakunawa.js gọi khi rết chết (info: { x, y, first, delegate }) */
  const h = sv(ctx);
  if (h.stage === 'done' && !info.replay) return false;
  if (ST.phase && ST.phase !== 'done' && inArena(ctx)) return true;
  if (!pending(ctx)) { h.stage = 'reveal'; h.tries++; }
  if (info.delegate) h.bkPending = true; ctx.persist(); log('start ' + JSON.stringify({ first: info.first, delegate: !!info.delegate, auto: !!info.auto }));
  if (inArena(ctx)) { enterArena(ctx); return true; }
  /* nhịp ngắn tại chỗ (khung phim) rồi chuyển lên sân của Lyron */
  ST.beat = true; cine(ctx, [{ act: () => { ST.lb = 0.01; if (ctx.quake) ctx.quake(0.6); ctx.S.flash = 0.4; } }, { who: 'nar', text: L(ctx).beat, name: '' }, { wait: 0.3 }], () => { ST.beat = false; ST.lb = 0; goArena(ctx); });
  return true;
}
let REPLAY = false;   /* tượng Lyron ở Cổng Trời → ôn lại Màn B (thưởng giảm) */
function enterArena(ctx) {
  const h = sv(ctx), z = zid(ctx), pulled = PULLED; PULLED = null; reset(); h.tries = h.tries || 0;
  if (pulled) { ST.arrive = { t: 0, T: 1.0, kind: pulled }; ctx.setMode('lycine'); }
  if (!h.stage) { h.stage = z === 'mind_lyron' ? 'fightB' : z === 'mind_rocky' ? 'fightA' : 'reveal'; h.tries++; ctx.persist(); }
  const later = (fn, ms = 700) => setTimeout(() => { if (zid(ctx) === z) fn(); }, ms);
  const st = h.stage;
  if (z === ZID) { if (st === 'reveal') { h.stage = 'meet'; ctx.persist(); } return later(() => ctx.travel(MEET_Z, 'back'), 300); }   /* 2026-10-15: tiết lộ + KẾT + tượng đều ở cầu tàu — bầu trời Lyron không còn dùng */
  if (z === ZID) {   /* bầu trời thật: tiết lộ / kết; giữa 2 trận thì kéo thẳng vào tâm trí */
    ST.corpse = true;
    if (st === 'done') { ST.phase = 'done'; ST.statue = true; petCmdHide(ctx, false); if (REPLAY) { REPLAY = false; REPLAY_ON = true; later(() => pullTo(ctx, 'mind_lyron'), 500); } else if (pulled) ctx.setMode('play'); return; }
    if (st === 'reveal') return later(() => startReveal(ctx));
    if (st === 'ending') return later(() => startEnding(ctx), 500);
    return later(() => pullTo(ctx, st === 'fightA' ? 'mind_rocky' : 'mind_lyron'), 600);
  }
  if (z === 'mind_rocky') {
    if (st !== 'fightA') return later(() => (st === 'fightB' ? pullTo(ctx, 'mind_lyron') : ctx.travel(MEET_Z, 'back')), 300);
    petCmdHide(ctx, true); const c = center(ctx), p = ctx.S.player; p.x = c.x; p.y = c.y + 64; p.dir = 3;
    ST.ly = { x: c.x, y: c.y - 70, dir: 'south', clip: 'idle', ft: 0, alpha: 0.85, lift: 26 }; ST.rkp = { x: c.x, y: c.y - 6, face: 'ds', dir: 1, ft: 0 };
    return later(() => { if (ctx.S.mode === 'lycine' && !ST.cs) ctx.setMode('play'); startFightA(ctx); }, 1000);
  }
  if (z === 'mind_lyron') {
    if (st === 'done' && !REPLAY_ON) return later(() => ctx.travel(MEET_Z, 'back'), 300);
    if (st === 'fightA') return later(() => pullTo(ctx, 'mind_rocky'), 300);
    if (st === 'ending') return later(() => ctx.travel(MEET_Z, 'back'), 300);
    petCmdHide(ctx, false); const c = center(ctx), p = ctx.S.player; p.x = c.x - 20; p.y = c.y + 64; p.dir = 3;
    ST.ly = { x: c.x, y: c.y - 40, dir: 'south', clip: 'idle', ft: 0, alpha: 1, lift: lift(ctx) };
    return later(() => { if (ctx.S.mode === 'lycine' && !ST.cs) ctx.setMode('play'); const e = rkEnt(ctx); if (e && ctx.rocky.place) ctx.rocky.place(c.x + 20, c.y + 64, 'dn'); startFightB(ctx); }, 1000);
  }
}

/* ================= 2026-10-15 anh: GẶP LYRON RIÊNG Ở CẦU TÀU (đêm lồng đèn) =================
   Hạ Rết lần đầu → bakunawa.js gọi meet(): người chơi Ở LẠI sân (mũ trùm rỗng + sợi lụa đỏ), stage = 'meet'.
   Vào Biển (bến cảng của Làng) → trời chuyển ĐÊM, lồng đèn thắp dọc cầu tàu, Lyron đứng một mình cuối cầu tàu quay lưng ra biển.
   Lại gần bấm E → Lyron quay lại, tiết lộ (rvPier), khăn đỏ trói Rocky → kéo vào TÂM TRÍ Rocky (Màn A) như cũ.
   Ngất / rời giữa 2 trận → Lyron vẫn đứng chờ ở cầu tàu (E: vào lại đúng màn). Phần kết (ending) vẫn ở bầu trời thật. */
const MEET_Z = 'sea', MEET_DARK = 0.45, LY_GATE_STATUE = false;   /* = đêm khuya của đồng hồ game */
const pierStage = ctx => { const st = sv(ctx).stage; return st === 'meet' || st === 'fightA' || st === 'fightB' || st === 'ending'; };   /* Lyron (còn sống) ở cầu tàu, trời đêm */
const pierStatue = ctx => sv(ctx).stage === 'done';   /* sau trận cuối: TƯỢNG Lyron (quỳ, hoá đá) cuối cầu tàu — E: ôn lại trận cuối */
function meetApi(ctx, info) { const h = sv(ctx); if (h.stage === 'done') return false; if (h.stage !== 'fightA' && h.stage !== 'fightB' && h.stage !== 'ending') h.stage = 'meet'; h.meetAt = Date.now(); ctx.persist(); setTimeout(() => { try { ctx.toast(L(ctx).meetHint, true); } catch (e) { /* bỏ qua */ } }, 5200); log('meet → cầu tàu ' + JSON.stringify(info || {})); return true; }
function meetMigrate(ctx) { const h = sv(ctx); if (inArena(ctx)) return; if ((h.stage == null && bkWins(ctx) > 0) || h.stage === 'reveal') { h.stage = 'meet'; ctx.persist(); log('migrate → meet'); } }   /* save cũ: đã hạ Rết chưa tiết lộ / đang dở cảnh tiết lộ ở trời → hẹn ở cầu tàu */
function meetEnter(ctx) {
  meetMigrate(ctx); ST.meet = null; ctx.S.lyCalm = false;
  if (zid(ctx) !== MEET_Z || !(pierStage(ctx) || pierStatue(ctx))) return;
  const m = ctx.S.map; if (!m || !m.dock) return; const dx = m.dock.x;
  if (ctx.alt && ctx.alt.h && ctx.alt.h() > 0.5 && ctx.alt.set) ctx.alt.set(0, 'lymeet');   /* tới từ trời (đang bay) → hạ xuống cầu tàu để nói chuyện được */
  ST.meet = { k: 0, ly: { x: dx * TS + 8, y: 50 * TS + 12, dir: 'north', clip: 'idle', ft: 0, alpha: 1, lift: 1 }, bind: null, statue: pierStatue(ctx) };   /* cuối cầu tàu (ô cầu tàu 50…58), quay lưng ra biển */
  if (ST.meet.statue) Object.assign(ST.meet.ly, { dir: 'south', clip: 'defeat', prog: 0.99, stone: true });   /* tượng: Lyron quỳ hoá đá (khung cuối clip quỵ, tông đá) */
  if (sv(ctx).stage === 'ending') { Object.assign(ST.meet.ly, { dir: 'south', clip: 'defeat', prog: 0.99 }); if (PULLED) { ST.arrive = { t: 0, T: 1.0, kind: PULLED }; PULLED = null; ctx.setMode('lycine'); } setTimeout(() => { if (ST.meet && zid(ctx) === MEET_Z && sv(ctx).stage === 'ending') startEndingPier(ctx); }, 1300); }   /* tỉnh lại từ tâm trí vỡ → cảnh kết ngay tại cầu tàu */
  for (const [x, y] of [[dx - 1, 52], [dx + 1, 54], [dx - 1, 56]]) if (!ctx.isSolid(m, x, y) && !(ctx.hasObjectAt && ctx.hasObjectAt(m, x, y))) ctx.place(m, 'lantern', x, y, { festival: true, lyMeet: true });   /* lồng đèn dọc cầu tàu (ảnh lồng đèn sẵn có) */
  if (sv(ctx).stage === 'meet') setTimeout(() => { if (ST.meet && zid(ctx) === MEET_Z) ctx.toast(L(ctx).meetArrive, true); }, 1400);
}
function meetLeave(ctx) { ST.meet = null; ctx.S.lyCalm = false; }
function meetTick(ctx, dt) {
  const M = ST.meet; if (zid(ctx) !== MEET_Z) { ST.meet = null; ctx.S.lyCalm = false; return; }
  if (M.statue && !M.keepNight) { ctx.S.lyCalm = false; } else { M.k = Math.min(1, M.k + dt * 0.6); ctx.S.dark = Math.max(ctx.S.dark || 0, MEET_DARK * M.k); ctx.S.lyCalm = true; }   /* tượng (đã xong): ngày đêm theo đồng hồ, lồng đèn vẫn còn */   /* đêm lồng đèn: tối dần ~1,7 s (lớp đêm + quầng lồng đèn của main.js), biển yên (không tàu cướp) */
  const ly = M.ly; ly.ft += dt; if (ly.anim) { ly.anim.t -= dt; ly.prog = Math.min(0.99, 1 - Math.max(0, ly.anim.t) / ly.anim.T); if (ly.anim.t <= -0.3) { ly.anim = null; ly.clip = 'idle'; ly.prog = null; } }
  if (M.bind) M.bind.t += dt;
  if (M.lockRp) { const p = ctx.S.player; if (p && Math.hypot(p.x - ly.x, p.y - ly.y) > 72) M.lockRp = false; }   /* plan-43 C1 */
}
function meetPress(ctx) {
  const M = ST.meet, h = sv(ctx), t = L(ctx); if (!M || ST.cs || ST.pull) return; const ly = M.ly, st = h.stage;
  if (!rk(ctx)) { ctx.toast(ctx.lang() === 'vi' ? 'Phải có Rocky đi cùng' : 'Rocky must be with you'); return; }
  if (st === 'fightA') { cine(ctx, lines(t.resumeA, t), () => pullTo(ctx, 'mind_rocky')); return; }
  if (st === 'fightB') { cine(ctx, lines(t.resumeB, t), () => pullTo(ctx, 'mind_lyron')); return; }
  if (st !== 'meet') return;
  const p = ctx.S.player; if (p.faceTo) p.faceTo(ly.x, ly.y); ST.phase = 'reveal';
  const steps = [
    { act: () => { ST.lb = 0.01; ctx.sfx('whoosh'); }, wait: 0.9 },
    { act: () => { ly.dir = 'south'; }, wait: 0.5 },   /* quay lại */
    ...lines(t.rvPier, t),
    { act: () => { ly.clip = 'cast'; ly.prog = 0; ly.anim = { t: 0.8, T: 0.8 }; meetBind(ctx); }, wait: 1.5 },
    ...lines(t.bind, t),
  ];
  log('meet talk'); cine(ctx, steps, () => { const h2 = sv(ctx); h2.stage = 'fightA'; h2.tries = (h2.tries || 0) + 1; ctx.persist(); pullTo(ctx, 'mind_rocky'); });
}
function startEndingPier(ctx) {   /* 2026-10-15 anh: KẾT ở cầu tàu đêm — tỉnh lại từ tâm trí vỡ: Lyron quỵ cuối cầu tàu, hoá đá, khăn bay về; lồng đèn vẫn sáng; tượng ở lại */
  const M = ST.meet; if (!M || ST.cs) return; const t = L(ctx), ly = M.ly, at = { x: ly.x, y: ly.y }; ST.phase = 'end';
  { const p = ctx.S.player; p.x = at.x; p.y = at.y + 40; p.dir = 3; setTimeout(() => { if (ctx.rocky && ctx.rocky.place) ctx.rocky.place(at.x + 16, at.y + 42, 'dn'); }, 60); }
  petCmdHide(ctx, false); Object.assign(ly, { dir: 'south', clip: 'defeat', prog: 0.99, anim: null, stone: false, alpha: 1, lift: 1 }); log('ending @ cầu tàu');
  const steps = [
    { act: () => { ST.lb = 0.01; }, wait: 0.8 },
    { act: () => { fx('petrify', at.x, at.y - 4, { top: true }) || fx('hr_morph', at.x, at.y); }, wait: 1.6 },
    { act: () => { ly.stone = true; ctx.sfx('rumble'); } },
    ...lines(t.endPier.slice(1, 4), t),
    { act: () => { ST.scarfFly = { x: at.x, y: at.y - 24, t: 0, home: true }; }, wait: 2.4 },
    ...lines(t.endPier.slice(4), t),
  ];
  cine(ctx, steps, () => { finish(ctx, at); if (ST.meet) { ST.meet.statue = true; ST.meet.keepNight = true; ST.meet.lockRp = true; Object.assign(ST.meet.ly, { stone: true, clip: 'defeat', prog: 0.99 }); } });   /* plan-43 C1: lockRp — tượng chưa nhận E 'ôn lại' tới khi người chơi đi ra xa ≥ 72 px rồi quay lại */   /* keepNight: đêm lồng đèn giữ tới khi rời cầu tàu (không bật sáng đột ngột lúc hiện credits) */   /* finish: thưởng + credits + cờ 'done' y như cũ */
}
function meetBind(ctx) {   /* khăn đỏ quấn Rocky ngay trên cầu tàu (chớp, rung, gầm) → Màn A trong tâm trí Rocky */
  const M = ST.meet; if (!M) return; const ly = M.ly; if (rkEnt(ctx) && ctx.rocky && ctx.rocky.place) ctx.rocky.place(ly.x + 14, ly.y + 18, 'dn');
  M.bind = { t: 0 }; ctx.S.flash = 0.35; if (ctx.quake) ctx.quake(0.35); ctx.sfx('roar');
}

/* ---------------- hệ thống ---------------- */
export const lyronFinale = {
  id: 'lyronFinale', always: true,
  onZoneEnter(ctx) {
    sv(ctx); meetEnter(ctx);
    ctx.lyronFinale = { start: (c2, info) => startApi(ctx, info || {}), pending: () => pending(ctx), active: () => !!ST.phase && ST.phase !== 'done', waiting: () => waiting(ctx), meet: (c2, info) => meetApi(ctx, info || {}), version: 1 };
    ctx.onAction('lycine', () => press(ctx)); ctx.onAction('lymem', () => press(ctx));
    ctx.registerCloser('lycine', () => skipAll(ctx)); ctx.registerCloser('lymem', () => { if (ST.mem) ST.mem.t = ST.mem.T; });
    /* Cổng Trời: còn dở màn Lyron → vào thẳng sân Lyron (bọc ctx.enterBakunawa do bakunawa.js đặt lại mỗi lần vào vùng) */
    { const prev = ctx.enterBakunawa; if (prev && !prev.__lyF) { const w = () => { if (pierStage(ctx)) { ctx.toast(L(ctx).meetHint, true); return true; } return prev(); };   /* 2026-10-15: đang hẹn / dở 2 trận / dở cảnh kết → Lyron ở cầu tàu (không mở sân Rết trống) */ w.__lyF = true; ctx.enterBakunawa = w; } }
    /* ngất trên sân Lyron → về trời M9 cạnh Cổng Trời (Lyron chờ ở đó) */
    { const prevF = ctx.faintTravel; if (!(prevF && prevF.__lyF)) { const w = () => { if (inArena(ctx)) { petCmdHide(ctx, false); return ctx.travel(MEET_Z, 'back'); } return prevF ? prevF() : false; };   /* 2026-10-15: ngất giữa 2 trận → về cầu tàu (Lyron đứng chờ) */ w.__lyF = true; ctx.faintTravel = w; } }
    if (!inArena(ctx)) { const h = sv(ctx); if (h.prevCmd || (h.hidCmd && rk(ctx) && rk(ctx).cmd === 'home')) petCmdHide(ctx, false); }   /* save giữa Màn A: trả Rocky */
    ST.bkW0 = bkWins(ctx); ST.autoT = null;
    if (zid(ctx) === 'sky_bakunawa' && pending(ctx)) { setTimeout(() => { if (zid(ctx) === 'sky_bakunawa' && pending(ctx)) goArena(ctx); }, 900); }   /* rết đã chết trong cốt truyện */
    if (zid(ctx) === 'sky_m9' && LY_GATE_STATUE) {   /* 2026-10-15 anh: tượng Lyron dời về CUỐI CẦU TÀU — Cổng Trời không còn Lyron / tượng (xoáy yên vẫn do skygate.js) */ const gp = gatePos(ctx.S.map), done = sv(ctx).stage === 'done'; ST.waitLy = { x: gp.x + 44, y: gp.y + 34, dir: 'west', clip: 'idle', ft: 0, alpha: 1, lift: 18, stone: done }; if (!done) setTimeout(() => ctx.toast(L(ctx).nearGate), 2500); } else ST.waitLy = null;
    if (inArena(ctx)) {
      const M = ctx.monsters; if (M && !M.__lyW) { const d0 = M.damage; M.damage = (mo, d, src, ...rest) => { if (mo && mo.c && mo.c.lyBoss && src && src === rkEnt(ctx)) { d = Math.max(1, Math.round(d * RK_ON_LY)); ST.agR += 2.5; ST.stats.lyDmgRk += d; } return d0(mo, d, src, ...rest); };   /* Lyron thuộc lòng chiêu Rocky: đòn Rocky chỉ 50 % */ M.__lyW = true; }
      enterArena(ctx);
    }
    if (typeof window !== 'undefined') window.__ly = hooks(ctx);
  },
  onZoneLeave(ctx) {
    meetLeave(ctx); hoverOff(ctx); hzClear(ctx);
    if (inArena(ctx)) { bossCamReset(ctx); if (ST.rkMo) ctx.monsters.remove(ST.rkMo); if (ST.lyMo) ctx.monsters.remove(ST.lyMo); if (sv(ctx).stage !== 'done') petCmdHide(ctx, false); reset(); }
    if (ST.cs) { ST.cs = null; }
  },
  update(dt, ctx) {
    ST.t += dt;
    if (ST.waitLy) ST.waitLy.ft += dt;
    if (ST.meet) meetTick(ctx, dt);
    if (ST.cs) csTick(ctx, dt);
    if (ST.lb > 0) ST.lb = Math.min(1, ST.lb + dt * 2.5);
    for (const f of ST.fx) f.t += dt; ST.fx = ST.fx.filter(f => f.t < f.dur);
    if (ST.banner) { ST.banner.t -= dt; if (ST.banner.t <= 0) ST.banner = null; }
    if (ST.callout) { ST.callout.t -= dt; if (ST.callout.t <= 0) ST.callout = null; }
    if (ST.scarfTear) { const s = ST.scarfTear; s.t += dt; s.x += s.vx * dt; s.y -= 34 * dt; if (s.t > 1.6) ST.scarfTear = null; }
    if (ST.wallGlow > 0) ST.wallGlow = Math.max(0, ST.wallGlow - dt * 1.2);
    if (ST.pull) { ST.pull.t += dt; if (ST.pull.t >= ST.pull.T && !ST.pull.went) { ST.pull.went = true; PULLED = ST.pull.kind; ctx.travel(ST.pull.zone, ST.pull.entry || 'default'); } }
    if (ST.arrive) { ST.arrive.t += dt; if (ST.arrive.t >= ST.arrive.T) { ST.arrive = null; if (ctx.S.mode === 'lycine' && !ST.cs) ctx.setMode('play'); } }
    if (ST.brightGo) ST.bright = Math.min(1, (ST.bright || 0) + dt * 0.8);
    if (ST.crumble > 0) ST.crumble = Math.max(0, ST.crumble - dt * 1.5);
    if (ST.chunks) { for (const ch of ST.chunks) ch.t += dt; ST.chunks = ST.chunks.filter(ch => ch.t < 1.2); }
    /* chưa nối móc: rết bị hạ ở sky_bakunawa (wins tăng) → tự bắt đầu sau khi màn thắng của trùm 6 hiện xong */
    if (zid(ctx) === 'sky_bakunawa' && !pending(ctx) && sv(ctx).stage !== 'done' && bkWins(ctx) > (ST.bkW0 || 0)) {
      if (ST.autoT == null) ST.autoT = 4.5; ST.autoT -= dt; if (ST.autoT <= 0 && ctx.S.mode === 'play') { ST.autoT = null; ST.bkW0 = bkWins(ctx); sv(ctx).rewardByBoss = true; meetApi(ctx, { auto: true }); }   /* 2026-10-15: không cắt cảnh — hẹn gặp ở cầu tàu */
    }
    if (!inArena(ctx)) return;
    if (ST.mem) memTick(ctx, dt);
    { const pt = rk(ctx); if (pt && (pt.koT || 0) > 4) pt.koT = 4; }   /* gục (do nguồn khác) → chỉ choáng ≤ 4 s rồi quay lại */
    const ly = ST.ly || ST.lyMo; if (ly) { ly.ft = (ly.ft || 0) + dt; if (ly.anim) { ly.anim.t -= dt; ly.prog = Math.min(0.99, 1 - Math.max(0, ly.anim.t) / ly.anim.T); if (ly.anim.t <= -0.3 && ly.clip !== 'defeat') { ly.anim = null; ly.clip = 'idle'; ly.prog = null; } }
      if (ly.sink) { ly.sink += dt; ly.alpha = Math.max(0, 1 - ly.sink / 2.2); ly.lift = (ly.lift || 0) - dt * 14; } if (ly.rise) { ly.rise = Math.max(0, ly.rise - dt * 0.8); ly.lift = -24 + (1 - ly.rise) * 42; }   /* trồi lên từ dưới mây (xác rết nằm dưới) */ }
    if (ST.phase === 'A' && ST.ly) { const r = ST.rkMo; if (r) ST.ly.dir = dirOf(r.x - ST.ly.x, r.y - ST.ly.y); if (Math.floor(ST.t / 14) !== ST.yankN) { ST.yankN = Math.floor(ST.t / 14); ST.ly.clip = 'cast'; ST.ly.anim = { t: 0.7, T: 0.7 }; } }
    const rp = ST.rkp; if (rp) { rp.ft += dt; if (rp.anim && rp.anim.t != null) { rp.anim.t -= dt; if (rp.anim.t <= 0 && rp.anim.k !== 'knockdown') rp.anim = null; } if (rp.pull) { rp.x += (rp.pull.x - rp.x) * Math.min(1, dt * 1.5); rp.y += (rp.pull.y - rp.y) * Math.min(1, dt * 1.5); } }
    if (ST.scarfFly) { const s = ST.scarfFly; s.t += dt; if (s.home) { const p = ctx.S.player; s.x += (p.x - s.x) * Math.min(1, dt * 1.2); s.y += (p.y - 26 - s.y) * Math.min(1, dt * 1.2); } else s.y -= dt * 12; }
    { const b = ST.lyMo || ST.rkMo || ST.ly || ST.rkp, isLy = !!b && (b === ST.lyMo || b === ST.ly), lf = b ? (b.lift ?? lift(ctx)) : 0; bossCam(ctx, b ? { x: b.x, y: b.y - lf } : null, dt, { h: isLy ? lyTop() + 6 : 34, top: 52, dy0: ST.cs || ST.mem ? 22 + Math.sin(ST.t * 0.7) * 3 : 0, speed: 4 }); }   /* lúc thoại: camera trôi nhẹ cho đỡ 'đơ' */   /* camera giữ cả người lẫn trùm (cả lúc cảnh phim) */
    if (ctx.S.mode !== 'play') return;
    teleTick(ctx, dt);
    if (ST.phase === 'B') { hzTick(ctx, dt); fusionTick(ctx, dt); fusion2Tick(ctx, dt); despTick(ctx, ST.lyMo, dt); }
    if (ST.phase === 'A') recallTick(ctx, dt);
    if (inMind(ctx) && ctx.S.map.mind === 'A') threadTick(ctx, dt);
    if (inMind(ctx)) hoverTick(ctx, dt);
    { const p = ctx.S.player; ST.pPrev = ST.pCur || { x: p.x, y: p.y }; ST.pCur = { x: p.x, y: p.y }; }
  },
  near(ctx) {
    const p = ctx.S.player, t = L(ctx);
    if (ST.meet && zid(ctx) === MEET_Z && !ST.cs && !ST.pull && sv(ctx).stage !== 'ending' && !(ST.meet.statue && ST.meet.lockRp)) { const w = ST.meet.ly; if (Math.hypot(p.x - w.x, p.y - w.y) < 46) return ST.meet.statue ? { label: t.statue, x: w.x, y: w.y - 6, limit: 48, priority: true, data: { lyReplay: true } } : { label: sv(ctx).stage === 'meet' ? t.meetTalk : t.waitAgain, x: w.x, y: w.y - 6, limit: 48, priority: true, data: { lyMeet: true } }; }   /* điểm nhãn sát chân (main đo khoảng cách tới x, y) */
    if (ST.waitLy && zid(ctx) === 'sky_m9') { const w = ST.waitLy; if (Math.hypot(p.x - w.x, p.y - w.y) < 44) return { label: w.stone ? t.statue : sv(ctx).stage ? t.waitAgain : t.waitLbl, x: w.x, y: w.y - 30, limit: 44, priority: true, data: { lyWait: true } }; }
    { const q = clueSpot(ctx); if (q && Math.hypot(p.x - q.x, p.y - q.y) < 30) return { label: t.clue, x: q.x, y: q.y - 18, limit: 30, data: { lyClue: q.i } }; }
    if (!inArena(ctx)) return null;
    if (finisherReady(ctx)) { const ly = ST.lyMo; return { label: ctx.lang() === 'vi' ? '⚡ Rocky-ha Song Kích' : '⚡ Rocky-ha Double Strike', x: ly.x, y: ly.y - 44, limit: 999, priority: 6, data: { lyFin: true, grab: true } }; }
    { const mo = ST.rkMo; if (mo && mo.calm && dist(p, mo) < 40) return { label: t.hug, x: mo.x, y: mo.y - 40, limit: 999, priority: 5, data: { lyHug: true, grab: true } };
      if (ST.phase === 'A' && ST.mobj && !ST.recall && onIsland(ctx) && !ST.hov) { const n = ST.mobj.filter(o => o.done).length; for (let k = 0; k < ST.mobj.length; k++) { const o = ST.mobj[k]; if (!o.done && Math.hypot(p.x - o.x, p.y - o.y) < 26) return { label: t.recallLbl(n + 1), x: o.x, y: o.y - 26, limit: 999, priority: 5, data: { lyRecall: k } }; } } }
    const mo = ST.rkMo; if (mo && mo.callWin && dist(p, mo) < 60) return { label: t.call(mo.callWin.n), x: mo.x, y: mo.y - 40, limit: 999, priority: 5, mouse: false, data: { lyCall: true, grab: true } };
    if (ST.phase === 'done' && sv(ctx).stage === 'done') { const c = center(ctx); if (Math.hypot(p.x - c.x, p.y - c.y + 18) < 40) return { label: t.statue, x: c.x, y: c.y - 46, limit: 40, priority: true, data: { lyReplay: true } }; }
    return null;
  },
  interact(ctx, cand) {
    const d = cand && cand.data; if (!d) return;
    if (d.lyWait) { const h = sv(ctx); if (h.stage === 'done') REPLAY = true; else if (!h.stage) { h.stage = 'reveal'; h.tries++; ctx.persist(); } goArena(ctx); return; }
    if (d.lyClue != null) { ctx.toast(L(ctx).clueSay[d.lyClue] || L(ctx).clueSay[0], true); return; }
    if (d.lyMeet) { meetPress(ctx); return; }
    if (d.lyFin) { if (finisherReady(ctx)) startFinisher(ctx); return; }
    if (d.lyRecall != null) { startRecall(ctx, d.lyRecall); return; }
    if (d.lyHug) { const mo = ST.rkMo; if (mo) { const p = ctx.S.player; if (p.act && p.hasAct && p.hasAct('idle')) p.act('idle', 0); ctx.sfx('rocky_happy'); log('hug'); breakScarf(ctx, mo); } return; }
    if (d.lyCall) { callPress(ctx); return; }
    if (d.lyReplay) { ST.statue = false; REPLAY_ON = true; pullTo(ctx, 'mind_lyron'); return; }
  },
  drawGround(g, ctx, cx, cy) {
    const _t0 = typeof performance !== 'undefined' ? performance.now() : 0; try { this._dg(g, ctx, cx, cy); } finally { perfAdd('g', _t0); }
  },
  _dg(g, ctx, cx, cy) {
    GFXLOW = !!(ctx.gfxLow && ctx.gfxLow());
    const off = typeof window !== 'undefined' && window.__lyOff || {};   /* đo hiệu năng (test): tắt từng lớp */
    if (inSky(ctx) && !off.bg) drawSkyLy(g, ctx, cx, cy); else if (inMind(ctx) && !off.bg) drawMind(g, ctx, cx, cy);
    if (!inArena(ctx)) return;
    for (const q of ST.tele) {   /* vùng báo đòn = vệt SƯƠNG mềm (khối sương PixelLab tô màu), đậm dần tới lúc ra đòn — không vẽ vòng tròn code */
      if ((q.done && !q.act) || q.bolt) continue; const k = Math.max(0, Math.min(1, 1 - q.t / q.T0)), col = q.leg ? '#f0a848' : q.act ? '#d8284c' : '#d8284c';
      g.save(); g.imageSmoothingEnabled = true;
      if (q.type === 'c') { const im = fogTint((q.x | 0) % 4, col); if (im) { const w = q.r * 3.4, h = q.r * 2.1; g.globalAlpha = 0.22 + 0.55 * k; g.drawImage(im, q.x - cx - w / 2, q.y - cy - h / 2, w, h); } }
      else if (q.type === 'l') { const im = fogTint(1, col); if (im) { const st = 14; for (let d = 0; d <= q.len * Math.max(0.25, k); d += st) { const x = q.x + Math.cos(q.a) * d - cx, y = q.y + Math.sin(q.a) * d - cy, w = q.w * 2.2, h = q.w * 1.5; g.globalAlpha = 0.2 + 0.45 * k; g.drawImage(im, x - w / 2, y - h / 2, w, h); } } }
      g.restore();
    }
    if (ST.phase === 'B') { fightSpot(g, ctx, cx, cy); drawHzGround(g, ctx, cx, cy); fusionDrawGround(g, ctx, cx, cy); }
  },
  drawables(ctx, cx, cy) {
    const out = [], g = ctx.g, L0 = lift(ctx);
    if (inArena(ctx) && ST.phase === 'B') { echoDrawables(ctx, cx, cy, out); fusionDrawables(ctx, cx, cy, out); fusion2Drawables(ctx, cx, cy, out); }
    if (ST.scarfTear) { const s = ST.scarfTear, im = img('ui/lyron/scarf.png'); out.push({ y: 1e9, f: () => { if (!im) return; g.save(); g.imageSmoothingEnabled = false; g.globalAlpha = Math.max(0, 1 - s.t / 1.6); g.translate(Math.round(s.x - cx), Math.round(s.y - cy)); g.rotate(Math.sin(s.t * 5) * 0.5); g.drawImage(im, 0, 0, im.naturalWidth, im.naturalHeight, -im.naturalWidth / 4, -im.naturalHeight / 4, im.naturalWidth / 2, im.naturalHeight / 2); g.restore(); } }); }   /* khăn đứt văng khỏi Lyron Siêu Cấp, bay lên rồi tan */
    if (ST.waitLy && zid(ctx) === 'sky_m9') { const w = ST.waitLy; out.push({ y: w.y, f: () => drawLy(g, w, w.x - cx, w.y - cy, 18) }); }
    { const q = clueSpot(ctx), im = q && img('ui/lyron/scarf.png'); if (q && im) out.push({ y: q.y - 4, f: () => { g.save(); g.imageSmoothingEnabled = false; g.globalAlpha = 0.9; g.drawImage(im, 0, 0, im.naturalWidth, im.naturalHeight, Math.round(q.x - cx - im.naturalWidth / 4), Math.round(q.y - cy - im.naturalHeight / 2 + 2), im.naturalWidth / 2, im.naturalHeight / 2); g.restore(); } }); }   /* mẩu khăn đỏ PixelLab */
    if (ST.meet && zid(ctx) === MEET_Z) { const M = ST.meet, w = M.ly; out.push({ y: w.y + 2, f: () => drawLy(g, w, w.x - cx, w.y - cy, 1) });
      if (M.bind) { const r = rkPos(ctx), sc = img('ui/lyron/scarf.png'); if (r && sc) out.push({ y: r.y + 3, f: () => { const k = Math.min(1, M.bind.t / 0.4), wv = sc.naturalWidth / 2, hv = sc.naturalHeight / 2; g.save(); g.imageSmoothingEnabled = false; g.globalAlpha = k; g.drawImage(sc, 0, 0, sc.naturalWidth, sc.naturalHeight, Math.round(r.x - cx - wv / 2), Math.round(r.y - cy - 22 - hv / 2), wv, hv); g.restore(); } }); }   /* khăn đỏ quấn Rocky (PixelLab, tĩnh) */
      if (!inArena(ctx)) { for (const f of ST.fx) out.push({ y: f.top ? 1e9 : f.y + 4, f: () => { const n = f.s.n, fr = f.s.loop ? Math.floor(f.t * (f.s.fps || 12)) % n : Math.min(n - 1, Math.floor(f.t * (f.s.fps || 12))); drawSheet(g, f.s, fr, f.x - cx, f.y - cy, f.alpha, f.ang); } });
        if (ST.scarfFly) { const s = ST.scarfFly, im = img('ui/lyron/scarf.png'); out.push({ y: 1e9, f: () => { if (im) { g.save(); g.imageSmoothingEnabled = false; g.drawImage(im, 0, 0, im.naturalWidth, im.naturalHeight, Math.round(s.x - cx - im.naturalWidth / 4), Math.round(s.y - cy - im.naturalHeight / 4), im.naturalWidth / 2, im.naturalHeight / 2); g.restore(); } } }); } } }   /* cảnh kết ở cầu tàu: hoá đá + khăn bay về */
    if (!inArena(ctx)) return out;
    if (ST.ly) { const ly = ST.ly; out.push({ y: ly.y + 2, f: () => drawLy(g, ly, ly.x - cx, ly.y - cy, L0) }); }
    if (ST.statue && !ST.statueSunk) { const c = center(ctx), s = { x: c.x, y: c.y - 18, stone: true, ft: 0, lift: 6 }; out.push({ y: s.y, f: () => drawLy(g, s, s.x - cx, s.y - cy, 6) }); }
    if (ST.rkp) { const r = ST.rkp; out.push({ y: r.y, f: () => drawRk(g, r, r.x - cx, r.y - cy, L0, null) }); }
    const leg = img('ui/lyron/legs_c.png') || img('ui/lyron/leg.png');   /* chân rết giáp tím đầu vàng trồi khỏi nền nứt (PixelLab, chọn bản c/3) */
    for (const l of ST.legs) out.push({ y: l.y + 1, f: () => { if (!leg) return; const w = leg.naturalWidth / 2, h = leg.naturalHeight / 2, up = l.t < 0.2 ? l.t / 0.2 : l.t > 0.65 ? Math.max(0, 1 - (l.t - 0.65) / 0.25) : 1, hh = Math.max(1, Math.round(h * up));
      g.save(); g.imageSmoothingEnabled = false; g.drawImage(leg, 0, 0, leg.naturalWidth, Math.round(leg.naturalHeight * up), Math.round(l.x - cx - w / 2), Math.round(l.y - cy - hh + 2), w, hh); g.restore(); } });
    for (const f of ST.fx) out.push({ y: f.ky != null ? f.ky : f.top ? 1e9 : f.y + 4, skill: f.ky != null ? 'ly_fx' : undefined, f: () => { const n = f.s.n, fr = f.s.loop ? Math.floor(f.t * (f.s.fps || 12)) % n : Math.min(n - 1, Math.floor(f.t * (f.s.fps || 12))); drawSheet(g, f.s, fr, f.x - cx, f.y - cy, f.alpha, f.ang); } });
    if (ST.scarfFly) { const s = ST.scarfFly, im = img('ui/lyron/scarf.png'); out.push({ y: 1e9, f: () => { if (im) { g.save(); g.imageSmoothingEnabled = false; g.drawImage(im, 0, 0, im.naturalWidth, im.naturalHeight, Math.round(s.x - cx - im.naturalWidth / 4), Math.round(s.y - cy - im.naturalHeight / 4 - L0), im.naturalWidth / 2, im.naturalHeight / 2); g.restore(); } } }); }
    for (const q of ST.tele) if (q.bolt && !q.done) out.push({ y: 1e9 - 2, f: () => {   /* Lôi Rết báo trước: đám mây bão tụ TRÊN đầu mục tiêu (sương tối, chớp nhá bên trong) + dấu ngắm mảnh đúng độ cao thân người */
      const k = Math.max(0, Math.min(1, 1 - q.t / q.T0)), bx = q.x - cx, by = q.y - (ctx.S.map.air ? AIR_LIFT + 8 : 9) - cy, sy = by - 58; g.save(); g.imageSmoothingEnabled = true;
      const dk = fogTint(((q.x | 0) + 1) % 4, '#2c1f5c'); if (dk) { const w = 54 + 30 * k, h = 26 + 14 * k; g.globalAlpha = 0.25 + 0.6 * k; g.drawImage(dk, bx - w / 2, sy - h / 2, w, h); }
      const lt = fogTint(2, '#c8b0ff'); if (lt && k > 0.35 && ((ST.t * 23 + q.x) % 1) > 0.62) { g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.35 * k; g.drawImage(lt, bx - 20, sy - 9, 40, 18); g.globalCompositeOperation = 'source-over'; }
      g.imageSmoothingEnabled = false; g.globalAlpha = 0.3 + 0.6 * k; g.fillStyle = '#efe4ff'; const r = Math.round(9 - 3 * k);
      g.fillRect(Math.round(bx - r - 3), Math.round(by), 3, 1); g.fillRect(Math.round(bx + r), Math.round(by), 3, 1); g.fillRect(Math.round(bx), Math.round(by - r - 3), 1, 3); g.fillRect(Math.round(bx), Math.round(by + r), 1, 3);
      g.restore(); } });
    for (const b of ST.bolts) out.push({ y: 1e9 - 1, f: () => {   /* sét trời PixelLab của Trống Đồng (td_sky, dày + chói) đổi màu tím-trắng; cắt bỏ đĩa chạm đất, đuôi sét tan vào sương dưới điểm đích */
      if (b.small) { const s3 = violSheet('td_bolt'); if (s3) { drawSheet(g, s3, Math.min(s3.n - 1, Math.floor(b.t * (s3.fps || 14))), b.x - cx, b.y - cy + 9, Math.max(0, 1 - b.t / 0.62)); const fg = fogTint(3, '#d8ccff'); if (fg) { g.save(); g.imageSmoothingEnabled = true; g.globalAlpha = 0.6 * (1 - b.t / 0.62); g.drawImage(fg, b.x - cx - 16, b.y - cy + 2, 32, 14); g.restore(); } } return; }   /* sét cỡ vừa (Lôi Trận Hố Đen) */
      const s2 = violSheet('td_sky' + b.k); if (!s2) return; const hi = s2.img.__hi ? 1 : 2, f = Math.min(s2.n - 1, Math.floor(b.t * (s2.fps || 20))), cut = (s2.ay ?? s2.h) - 12, X = Math.round(b.x - cx), Y = Math.round(b.y - cy) + 14;
      g.save(); g.imageSmoothingEnabled = false; g.drawImage(s2.img, f * s2.w * hi, 0, s2.w * hi, cut * hi, X - Math.round(s2.ax ?? s2.w / 2), Y - cut, s2.w, cut);
      g.imageSmoothingEnabled = true; const u = 1 - b.t / 0.62, fg = fogTint(3, '#d8ccff'); if (fg) { g.globalAlpha = 0.9 * u; g.drawImage(fg, X - 30, Y - 12, 60, 30); }
      const hl = fogTint(2, '#ffffff'); if (hl && b.t < 0.4) { g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.7 * (1 - b.t / 0.4); g.drawImage(hl, X - 22, Y - 14 - 22, 44, 44); }
      g.restore(); } });
    for (const a of ST.arcs) out.push({ y: a.gy != null ? a.gy + (a.y1 < a.y0 ? -0.5 : 0.5) : 1e9 - 1, skill: 'ly_arc', f: () => {   /* Xích Lôi: cùng sheet sét PixelLab, xoay từ tay Lyron tới mục tiêu, cắt đúng độ dài */
      const s2 = violSheet('td_sky' + a.k); if (!s2) return; const hi = s2.img.__hi ? 1 : 2, L = Math.hypot(a.x1 - a.x0, a.y1 - a.y0), ang = Math.atan2(a.y1 - a.y0, a.x1 - a.x0), top = 40, Lc = Math.min(L, (s2.ay ?? s2.h) - 12 - top);
      g.save(); g.imageSmoothingEnabled = false; g.globalAlpha = Math.max(0, 1 - a.t / 0.38); g.translate(Math.round(a.x0 - cx), Math.round(a.y0 - cy)); g.rotate(ang - Math.PI / 2);
      g.drawImage(s2.img, 2 * s2.w * hi, top * hi, s2.w * hi, Lc * hi, -Math.round(s2.ax ?? s2.w / 2), 0, s2.w, Lc); g.restore(); } });   /* khung 2: tia mảnh rẽ nhánh (không phải cột dày) */
    { const mo = ST.rkMo, A = mo && mo.act; if (A && A.k === 'ha') {   /* Rocky-ha bậc 8 bị khống chế: tụ năng → luồng Rocky-ha PixelLab đổi màu đỏ thẫm lõi trắng hồng (crimSheet), cắt theo độ dài thật */
      const ox = mo.x, oy = mo.y - 8 - L0;
      if (A.ph === 'wind') { const cs = crimSheet('rk_hacharge_x'); if (cs) out.push({ y: mo.y + (Math.sin(A.a || 0) < 0 ? -0.5 : 0.5), skill: 'ly_rkcharge', f: () => bDraw(g, cs, Math.min(cs.n - 1, Math.floor((1 - Math.max(0, A.t) / A.T0) * cs.n)), ox - cx, oy - cy) }); }   /* 2026-10-16 (QUY TẮC LỚP VẼ CHIÊU) */
      else { const s2 = redHa('rk_ha2_l'); if (s2) out.push({ y: mo.y + (Math.sin(A.a || 0) < 0 ? -0.5 : 0.5), skill: 'ly_rkha', f: () => bDraw(g, s2, bFrame(s2, 0.12 + (A.ft || 0) * 1.3), ox - cx, oy - cy, A.a, A.len || 158) }); }   /* luồng Rocky-ha bậc cao PixelLab mép êm, 2 đầu tròn (rk_ha_t7) đổi màu đỏ thẫm */
    } }
    return out;
  },
  draw(g, ctx, cx, cy) {
    if (!inArena(ctx)) return;
    if (ST.lb > 0 || ST.mem) { /* khung phim vẽ ở drawUI */ }
  },
  drawUI(ug, ctx, cx, cy, scale) {
    const _t0 = typeof performance !== 'undefined' ? performance.now() : 0; try { this._du(ug, ctx, cx, cy, scale); } finally { perfAdd('u', _t0); }
  },
  _du(ug, ctx, cx, cy, scale) {
    const W = ug.canvas.width, H = ug.canvas.height, t = L(ctx), font = px => `${Math.round(px)}px VT323, monospace`;
    if (ST.pull || ST.arrive) drawPull(ug, ctx);
    if (ST.hov && inMind(ctx)) {   /* chip nhỏ 🚁 khi đang bay lơ lửng */
      const fs = Math.max(12, Math.round((globalThis.__u89?globalThis.__u89(scale):scale) * 2.8)), pl = ctx.S.player, y = Math.round((pl.y - 34 - cy) * scale), tx = '🚁';   /* gắn cạnh người chơi, không trôi giữa màn */
      ug.save(); ug.font = `bold ${fs}px VT323, monospace`; const w = ug.measureText(tx).width + 14; ug.fillStyle = 'rgba(20,14,30,.62)'; const X0 = Math.round((pl.x - cx) * scale + 12 * scale); ug.beginPath(); ug.roundRect(X0, y, w, fs + 6, 6); ug.fill();
      ug.fillStyle = '#ffe3a0'; ug.textAlign = 'left'; ug.textBaseline = 'top'; ug.fillText(tx, X0 + 7, y + 3); ug.restore(); }
    if (typeof document !== 'undefined') {   /* tâm trí: đi bộ — ẩn nút chong chóng / độ cao của sky.js bằng 1 lớp CSS trên body (không sửa sky.js) */
      if (!document.getElementById('ly-mind-css')) { const st = document.createElement('style'); st.id = 'ly-mind-css'; st.textContent = 'body.ly-mind #btn-copter,body.ly-mind #btn-skyfly,body.ly-mind #btn-skyalt,body.ly-mind #btn-skythrow{display:none!important}'; document.head.appendChild(st); }
      { const on = inMind(ctx); if (ST._cssOn !== on) { ST._cssOn = on; document.body.classList.toggle('ly-mind', on); } }   /* chỉ đổi khi cần (tránh tính lại layout mỗi khung) */
    }
    const cine = ST.cs || ST.mem || ST.lb > 0;
    if (cine) {   /* khung phim: 2 dải đen trên / dưới */
      const k = ST.cs || ST.mem ? Math.min(1, Math.max(ST.lb, 0.0001) * 1 + 0.6) : ST.lb, bh = Math.round(H * 0.11 * Math.min(1, k));
      ug.save(); ug.fillStyle = '#000'; ug.fillRect(0, 0, W, bh); ug.fillRect(0, H - bh, W, bh); ug.restore();
    }
    if (ST.mem) {   /* ký ức: ảnh PixelLab sepia giữa màn + chú thích */
      const M = ST.mem, im = img('ui/lyron/mem' + (M.i + 1) + '.png'), a = Math.min(1, M.t * 2, (M.T - M.t) * 2);
      ug.save(); ug.globalAlpha = 0.55 * a; ug.fillStyle = '#1a0c06'; ug.fillRect(0, 0, W, H); ug.globalAlpha = a; ug.imageSmoothingEnabled = false;
      if (im) { const z = Math.max(1, Math.floor(Math.min(W * 0.7 / im.naturalWidth, H * 0.55 / im.naturalHeight))), w = im.naturalWidth * z, h = im.naturalHeight * z, x = (W - w) / 2, y = H * 0.42 - h / 2;
        ug.fillStyle = '#f4e4c0'; ug.fillRect(x - 6, y - 6, w + 12, h + 12); ug.drawImage(im, x, y, w, h);
        const fs = Math.max(16, (globalThis.__u89?globalThis.__u89(scale):scale) * 6); ug.font = font(fs); ug.textAlign = 'center'; ug.textBaseline = 'top'; ug.fillStyle = '#000'; ug.fillText(t.mem[M.i], W / 2 + 1, y + h + 13, W - 20); ug.fillStyle = '#ffe9c0'; ug.fillText(t.mem[M.i], W / 2, y + h + 12, W - 20); }
      ug.restore(); return;
    }
    if (ST.cs) {   /* hộp thoại + chân dung cận cảnh */
      const c = ST.cs, s = c.steps[c.i];
      if (s && s.text) {   /* plan-45 CD1: cùng khung gỗ với hộp thoại chung (style.css .dlg.px: dlg_frame viền 24 / 14 px, nền --panel, bảng tên dlg_plate, chân dung bên PHẢI trong dlg_port) */
        const k = W / Math.max(1, ug.canvas.clientWidth || W), cssW = W / k, fs = Math.max(16, Math.min(W / 30, (globalThis.__u89?globalThis.__u89(scale):scale) * 6.2)), bh = Math.round(H * 0.11), bw = Math.round((cssW <= 640 ? 14 : 24) * k), pb = Math.round((cssW <= 640 ? 6 : 8) * k), PW = Math.round((cssW <= 640 ? 72 : 128) * k), pw = s.port ? PW : 0,   /* khung chân dung 128 / 72 px như #d-port */ boxH = Math.max(fs * 4.2, PW + 2 * pb + 2 * bw - 8 * k), y0 = H > W * 1.2 ? Math.round(H * 0.66 - boxH) : H - bh - boxH - 6,   /* điện thoại dọc: hộp thoại nằm TRÊN cần điều khiển */ X0 = 8, BW = W - 16;
        ug.save(); ug.imageSmoothingEnabled = false; ug.fillStyle = '#1a1626'; ug.fillRect(X0 + bw / 2, y0 + bw / 2, BW - bw, boxH - bw); nine(ug, img('ui/dlg_frame.png'), 20, X0, y0, BW, boxH, bw);
        if (s.port) { const im = img('ui/lyron/' + (PORT_C[s.port] || s.port) + '.png'); const px0 = X0 + BW - bw - pw - 2 * pb, py0 = y0 + (boxH - pw - 2 * pb) / 2; ug.fillStyle = '#120f1c'; ug.fillRect(px0 + pb, py0 + pb, pw, pw); nine(ug, img('ui/dlg_port.png'), 8, px0, py0, pw + 2 * pb, pw + 2 * pb, pb);
          if (im) { const z = Math.max(1, Math.floor(pw / im.naturalWidth)), w = im.naturalWidth * z, sl = Math.max(0, 1 - c.t / 0.18), same = c.i > 0 && c.steps[c.i - 1] && c.steps[c.i - 1].port === s.port; ug.globalAlpha = same ? 1 : 1 - sl; ug.save(); ug.beginPath(); ug.rect(px0 + pb, py0 + pb, pw, pw); ug.clip(); ug.drawImage(im, Math.round(px0 + pb + (pw - w) / 2 + (same ? 0 : sl * 30)), Math.round(py0 + pb + (pw - w) / 2), w, w); ug.restore(); ug.globalAlpha = 1; } }   /* chân dung trượt vào khi đổi người nói */
        const tx = X0 + bw + 8 * k, tw = BW - 2 * bw - 16 * k - (s.port ? pw + 2 * pb + 8 * k : 0); ug.textAlign = 'left'; ug.textBaseline = 'top';
        if (s.name) { const nf = fs * 0.95, pbw = Math.round(8 * k); ug.font = font(nf); const nw = ug.measureText(s.name).width + 2 * pbw + 16 * k, nh = Math.round(nf * 1.15 + 2 * pbw), nx = X0 + 14 * k, ny = Math.max(2, y0 - nh * 0.62); ug.fillStyle = '#4a3324'; ug.fillRect(nx + pbw / 2, ny + pbw / 2, nw - pbw, nh - pbw); nine(ug, img('ui/dlg_plate.png'), 8, nx, ny, nw, nh, pbw); ug.fillStyle = '#ffd45e'; ug.fillText(s.name, nx + pbw + 8 * k, ny + pbw + nf * 0.05); }
        ug.font = font(fs); ug.fillStyle = '#fff6c8'; const txt = s.text.slice(0, Math.floor(c.ch)); wrap(ug, txt, tx, y0 + bw + (s.name ? fs * 0.25 : 0), tw, fs * 1.0);
        ug.font = font(fs * 0.7); ug.fillStyle = 'rgba(255,246,200,.5)'; ug.textAlign = 'right'; ug.fillText(t.skip, X0 + BW - bw - (s.port ? pw + 2 * pb + 8 * k : 0) - 4 * k, y0 + boxH - bw - fs * 0.75);
        ug.restore();
      }
      return;
    }
    if (!inArena(ctx) || ctx.S.mode !== 'play') return;
    const b = ST.rkMo || ST.lyMo;
    if (b) {   /* thanh máu trùm (khung PixelLab của Vết Nứt) */
      const fr = img('ui/hacrocky/bossbar.png'), narrow = W < 560, bw0 = narrow ? W * 0.92 : Math.min(W * 0.9, 430, Math.max(300, W * 0.4)), BB = barBox(ug, bw0, bw0 * 74 / 481 + 26, W, H), bw = BB.w, bh = bw * 74 / 481, bx = BB.x, by = BB.y;
      const ix = bx + bw * 72 / 481, iy = by + bh * 24 / 74, iw = bw * (440 - 72) / 481, ih = bh * 28 / 74, k = Math.max(0, b.hp / b.max), isR = b === ST.rkMo;
      ug.save(); ug.imageSmoothingEnabled = false; if (fr) ug.drawImage(fr, bx, by, bw, bh); else { ug.fillStyle = '#12061c'; ug.fillRect(ix, iy, iw, ih); }
      const gr = ug.createLinearGradient(0, iy, 0, iy + ih); gr.addColorStop(0, isR ? '#ff6a9a' : '#ff4a5a'); gr.addColorStop(1, isR ? '#8a1040' : '#7a0a20'); ug.fillStyle = gr; ug.fillRect(ix, iy, iw * k, ih);
      if (isR) for (const m of ST.memAt) { ug.fillStyle = 'rgba(255,255,255,.6)'; ug.fillRect(Math.round(ix + iw * m), iy, Math.max(1, (globalThis.__u89?globalThis.__u89(scale):scale) * 0.4), ih); }
      else for (const m of ST.ult) { ug.fillStyle = 'rgba(255,230,120,.7)'; ug.fillRect(Math.round(ix + iw * m), iy, Math.max(1, (globalThis.__u89?globalThis.__u89(scale):scale) * 0.4), ih); }
      const fs = Math.max(14, bh * 0.36); ug.font = font(fs); ug.textAlign = 'center'; ug.textBaseline = 'top';
      const nm = isR ? `${t.rkName} · ${t.bindName}${exposed(b) ? ' · ' + (ctx.lang() === 'vi' ? 'NÚT KHĂN LỘ' : 'KNOT EXPOSED') : ''}` : `${t.lyName} · ${t.lyTitle}${b.tiredT > 0 ? ' · ' + (ctx.lang() === 'vi' ? 'KIỆT SỨC' : 'SPENT') : ''}`;
      ug.fillStyle = '#000'; ug.fillText(nm, BB.cx + 1, by + bh + 1, bw); ug.fillStyle = '#ffd0e0'; ug.fillText(nm, BB.cx, by + bh, bw); ST.uiTop = by + bh + fs + 4; ug.restore();
    }
    { const ly = ST.lyMo || ST.ly; if (ly && !ly.stone) {   /* nhãn tên nhỏ trên đầu Lyron (bám nhân vật) */
      const lf = (ly.lift ?? lift(ctx)), sx = (ly.x - cx) * scale, sy = (ly.y - lf - lyTop() - 4 - cy) * scale, fs = Math.max(12, (globalThis.__u89?globalThis.__u89(scale):scale) * 4.2); const pl = ctx.S.player; if (sy - fs < (ST.uiTop || 0) + 2 || Math.hypot(pl.x - ly.x, pl.y - ly.y) < 56) { /* nhãn sẽ đè thanh máu / tên người chơi → bỏ */ } else {
      ug.save(); ug.font = font(fs); ug.textAlign = 'center'; ug.textBaseline = 'bottom'; const tx = '⚡ Lyron', tw = ug.measureText(tx).width + 10;
      ug.fillStyle = 'rgba(30,6,20,.72)'; ug.fillRect(sx - tw / 2, sy - fs, tw, fs + 2); ug.fillStyle = '#ffd36a'; ug.fillText(tx, sx, sy + 1); ug.restore(); } } }
    if (ST.rkMo && ST.rkMo.callWin) {   /* cửa sổ gọi Rocky: vạch thời gian nhỏ trên đầu Rocky (bám nhân vật) */
      const mo = ST.rkMo, k = Math.max(0, mo.callWin.t / 5.5), sx = (mo.x - cx) * scale, sy = (mo.y - cy - 46) * scale, w = scale * 26, h = Math.max(4, (globalThis.__u89?globalThis.__u89(scale):scale) * 1.4);
      ug.save(); ug.fillStyle = 'rgba(20,6,16,.8)'; ug.fillRect(sx - w / 2 - 2, sy - 2, w + 4, h + 4); ug.fillStyle = '#ff8fc0'; ug.fillRect(sx - w / 2, sy, w * k, h); ug.restore();
    }
    if (ST.callout) {   /* 'Lyron dùng: <chiêu> (<trùm>)' — dòng nhỏ ngay dưới thanh máu */
      const fs = H > W * 1.2 ? Math.max(16, Math.min(W / 19, (globalThis.__u89?globalThis.__u89(scale):scale) * 6)) : Math.max(13, Math.min(W / 26, (globalThis.__u89?globalThis.__u89(scale):scale) * 4.2)), v = BBC && BBC.v; let y = v ? v.y + v.h + fs * 0.9 : (ST.uiTop || 60) + fs;
      for (const r of domBlocks(ug)) if (r.y0 < y + fs * 0.62 && r.y1 > y - fs * 0.62) y = r.y1 + fs * 0.8;   /* thông báo to của game (vd 'SIÊU CẤP ROCKY!') đang hiện → dòng 'Lyron dùng' xuống dưới, không chồng */ ug.save(); ug.globalAlpha = Math.min(1, ST.callout.t * 3); ug.font = font(fs); ug.textAlign = 'center'; ug.textBaseline = 'middle';
      const ic = (ST.callout.icons || []).map(b => img(UIL('g_' + b + '_' + ((FPICK.glyph || {})[b] || 'a')))).filter(Boolean), isz = Math.round(fs * 1.15), iw = ic.length ? ic.length * (isz + 2) + 6 : 0;
      const tw = Math.min(W - 10, ug.measureText(ST.callout.txt).width + 18 + iw), cxx = v ? v.cx : W / 2; ug.fillStyle = 'rgba(30,8,44,.72)'; ug.fillRect(cxx - tw / 2, y - fs * 0.7, tw, fs * 1.4); ug.fillStyle = '#e8c8ff'; ug.fillText(ST.callout.txt, cxx + iw / 2, y, W - 20 - iw);
      ug.imageSmoothingEnabled = false; let ix = cxx - tw / 2 + 8; for (const im of ic) { ug.drawImage(im, 0, 0, im.naturalWidth, im.naturalHeight, ix, y - isz / 2, isz, isz); ix += isz + 2; }   /* icon hình phấn của trùm gốc */
      ug.restore();
    }
    if (ST.banner) {
      const a = Math.min(1, ST.banner.t * 2), fs = Math.max(20, Math.min(W / 18, (globalThis.__u89?globalThis.__u89(scale):scale) * 8.5)); ug.save(); ug.globalAlpha = a; ug.font = font(fs); ug.textAlign = 'center'; ug.textBaseline = 'middle';
      const y = H > W * 1.2 ? Math.max(H * 0.47, (ST.uiTop || 60) + fs) : Math.max(H * 0.2, (ST.uiTop || 60) + fs * 0.8);   /* điện thoại dọc: băng chữ giữa màn, tránh cột nút HUD bên phải */ ug.fillStyle = 'rgba(20,4,14,.65)'; const tw = Math.min(W - 10, ug.measureText(ST.banner.txt).width + 24); ug.fillRect((W - tw) / 2, y - fs * 0.6, tw, fs * 1.2);
      ug.fillStyle = '#000'; ug.fillText(ST.banner.txt, W / 2 + 2, y + 2, W - 20); ug.fillStyle = '#ffc8d8'; ug.fillText(ST.banner.txt, W / 2, y, W - 20); ug.restore();
    }
  },
};
let DOMB = { t: -1, v: [] };
function domBlocks(ug) {   /* ô thông báo DOM (#px-banner, #toast) đang hiện, toạ độ canvas — đo lại mỗi 0,25 s */
  const now = typeof performance !== 'undefined' ? performance.now() : 0; if (now - DOMB.t < 250 || typeof document === 'undefined') return DOMB.v;
  const cv = ug.canvas, cr = cv.getBoundingClientRect(), ky = cv.height / (cr.height || cv.height), out = [];
  for (const id of ['px-banner', 'toast']) { const el = document.getElementById(id); if (!el || el.hidden || el.offsetParent === null) continue; const r = el.getBoundingClientRect(); if (r.height) out.push({ y0: (r.top - cr.top) * ky - 4, y1: (r.bottom - cr.top) * ky + 4 }); }
  DOMB = { t: now, v: out }; return out;
}
let BBC = null;
function barBox(ug, w, h, W, H) {   /* bossBarBox đọc getBoundingClientRect của 12 nút HUD (ép tính layout) → chỉ đo lại mỗi 0,5 s / khi đổi cỡ màn */
  const now = typeof performance !== 'undefined' ? performance.now() : 0;
  if (!BBC || BBC.W !== W || BBC.H !== H || BBC.w !== w || now - BBC.t > 500) {
    let v = bossBarBox(ug, w, h);
    if (H > W * 1.2 && typeof document !== 'undefined') {   /* điện thoại dọc: thanh máu nằm DƯỚI nhãn vùng + cụm đồng hồ (không đè) */
      const cv = ug.canvas, cr = cv.getBoundingClientRect(), ky = H / (cr.height || H); let bot = 0;
      for (const id of ['hud-tl', 'px-clock']) { const el = document.getElementById(id); if (el && el.offsetParent !== null) { const r = el.getBoundingClientRect(); bot = Math.max(bot, (r.bottom - cr.top) * ky); } }
      const rects = ((typeof window !== 'undefined' && window.__bossBar && window.__bossBar.rects) || []).slice();
      for (const id of ['px-status', 'px-notes']) { const el = document.getElementById(id); if (!el || el.offsetParent === null) continue; for (const e of [el, ...el.children]) { const r = e.getBoundingClientRect(); if (r.width && r.height) rects.push({ x0: (r.left - cr.left) * ky - 4, x1: (r.right - cr.left) * ky + 4, y0: (r.top - cr.top) * ky - 3, y1: (r.bottom - cr.top) * ky + 3 }); } }   /* chip trạng thái (Rocky…) */
      for (let y = Math.round(Math.max(v.y, bot + 6)); y < H * 0.5; y += 4) {   /* tìm dải ngang trống dưới nhãn vùng + đồng hồ (né cả cột nút bên phải) */
        const band = rects.filter(r => r.y0 < y + h && r.y1 > y).sort((a2, b2) => a2.x0 - b2.x0); let best = null, cur = 8;
        for (const r of band) { if (r.x0 > cur && (!best || r.x0 - cur > best.w)) best = { x: cur, w: r.x0 - cur }; cur = Math.max(cur, r.x1); }
        if (W - 8 > cur && (!best || W - 8 - cur > best.w)) best = { x: cur, w: W - 8 - cur };
        if (best && best.w >= Math.min(w, W * 0.6)) { const ww = Math.min(w, best.w); v = { ...v, x: Math.round(best.x + (best.w - ww) / 2), y, w: Math.round(ww), cx: Math.round(best.x + best.w / 2) }; break; }
      }
    }
    BBC = { W, H, w, t: now, v };
  }
  return BBC.v;
}
/* plan-45 CD1/ND3: chân dung cảnh Lyron chibi cùng kiểu Noxx / Xealist (PixelLab); Rocky = Rocky đá cam thường, bị khăn đỏ trói */
const PORT_C = { p_smirk: 'c_smirk', p_rage: 'c_rage', p_beaten: 'c_beaten', p_rocky: 'c_rocky', p_rockyok: 'c_rockyok' };
function nine(g, im, sl, x, y, w, h, b) {   /* như CSS border-image <sl> / <b>px round: 4 góc + 4 cạnh lặp (không kéo dãn vân gỗ) */
  if (!im || w < 2 * b || h < 2 * b) return; const S = im.naturalWidth, T = im.naturalHeight, mw = S - 2 * sl, mh = T - 2 * sl; x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
  g.drawImage(im, 0, 0, sl, sl, x, y, b, b); g.drawImage(im, S - sl, 0, sl, sl, x + w - b, y, b, b); g.drawImage(im, 0, T - sl, sl, sl, x, y + h - b, b, b); g.drawImage(im, S - sl, T - sl, sl, sl, x + w - b, y + h - b, b, b);
  const iw = w - 2 * b, ih = h - 2 * b, nx = Math.max(1, Math.round(iw / (mw * b / sl))), ny = Math.max(1, Math.round(ih / (mh * b / sl))), sx = iw / nx, sy = ih / ny;
  for (let q = 0; q < nx; q++) { const X = Math.round(x + b + q * sx), X2 = Math.round(x + b + (q + 1) * sx); g.drawImage(im, sl, 0, mw, sl, X, y, X2 - X, b); g.drawImage(im, sl, T - sl, mw, sl, X, y + h - b, X2 - X, b); }
  for (let q = 0; q < ny; q++) { const Y = Math.round(y + b + q * sy), Y2 = Math.round(y + b + (q + 1) * sy); g.drawImage(im, 0, sl, sl, mh, x, Y, b, Y2 - Y); g.drawImage(im, S - sl, sl, sl, mh, x + w - b, Y, b, Y2 - Y); }
}
function wrap(g, txt, x, y, w, lh) {
  const words = txt.split(' '); let line = '', yy = y;
  for (const wd of words) { const tst = line ? line + ' ' + wd : wd; if (g.measureText(tst).width > w && line) { g.fillText(line, x, yy); line = wd; yy += lh; } else line = tst; }
  if (line) g.fillText(line, x, yy);
}

/* ---------------- móc test (QA) ---------------- */
function hooks(ctx) {
  return {
    st: () => { const r = ST.rkMo, l = ST.lyMo; return { zone: zid(ctx), mode: ctx.S.mode, phase: ST.phase, stage: sv(ctx).stage, save: { ...sv(ctx) }, cs: ST.cs ? { i: ST.cs.i, n: ST.cs.steps.length, port: ST.cs.steps[ST.cs.i] && ST.cs.steps[ST.cs.i].port || null, who: ST.cs.steps[ST.cs.i] && ST.cs.steps[ST.cs.i].who || null } : null, mem: ST.mem && { i: ST.mem.i }, grandOn: !!ST.grandOn, grandDone: !!ST.grandDone, desp: !!ST.desp, finReady: finisherReady(ctx), props: (ST.props || []).filter(o => !o.gone && !o.broken).map(o => ({ kind: o.kind, x: Math.round(o.mo.x), y: Math.round(o.mo.y), boss: o.boss })), clones: (ST.clones || []).length, voids: (ST.voids || []).reduce((a, v) => a + v.cells.length, 0), teleQ: ST.tele.filter(q => !q.done || q.act).map(q => ({ type: q.type, x: Math.round(q.x), y: Math.round(q.y), r: q.r, a: q.a, len: q.len, w: q.w })).concat(ST.hz.filter(h => h.k === 'hole' || h.k === 'clock').map(h => ({ type: 'c', x: Math.round(h.x), y: Math.round(h.y), r: h.k === 'clock' ? h.R : 40 }))), callout: ST.callout && ST.callout.txt, form: l ? l.form || 'normal' : null, mobj: (ST.mobj || []).map(o => ({ x: Math.round(o.x), y: Math.round(o.y), done: o.done, isl: o.isl })), recall: ST.recall && { k: ST.recall.k, t: +ST.recall.t.toFixed(2) }, hov: ST.hov && { t: +ST.hov.t.toFixed(2) }, calm: !!(r && r.calm), hes: r ? +(r.hesT || 0).toFixed(2) : 0, thr: ST.thr ? { cut: ST.thr.cut, n: ST.thr.list.length, snaps: ST.thr.snaps.length } : null, isle: ctx.S.map && ctx.S.map.reg ? isleAt(ctx.S.map, ctx.S.player.x, ctx.S.player.y) : null,
      rk: r ? { x: Math.round(r.x), y: Math.round(r.y), hp: Math.round(r.hp), max: r.max, act: r.act && r.act.k, exp: exposed(r), burst: +(r.burstT || 0).toFixed(1), call: r.callWin && { t: +r.callWin.t.toFixed(1), n: r.callWin.n }, face: r.face } : null,
      ly: l ? { x: Math.round(l.x), y: Math.round(l.y), hp: Math.round(l.hp), max: l.max, act: l.act && l.act.k, dir: l.dir, enr: !!l.enr, tired: +(l.tiredT || 0).toFixed(1), lock: l.lockHp != null } : null,
      pet: rk(ctx) && { cmd: rk(ctx).cmd, ko: +(rk(ctx).koT || 0).toFixed(1) }, petPos: rkPos(ctx), tgt: ST.tgt, stats: { ...ST.stats }, skN: { ...ST.skN }, seq: ST.seq.slice(-30), actMax: Object.fromEntries(Object.entries(ST.actMax).map(([k, v]) => [k, +v.toFixed(1)])), memAt: ST.memAt.slice(), ult: ST.ult.slice(), tele: ST.tele.length, log: ST.log.slice(-25), t: +ST.t.toFixed(1), achieved: (ctx.S.save.achievements || []).includes('lyron'), durA: ST.durA || null }; },
    start: info => startApi(ctx, info || {}), fast: v => { ST.fast = v !== false; }, skip: () => { if (ST.cs) skipAll(ctx); if (ST.mem) ST.mem.t = ST.mem.T; }, press: () => press(ctx),
    setFrac: f => { const m = ST.rkMo || ST.lyMo; if (m && m === ST.lyMo && f < 0.5 && !m.enr) { m.enr = true; if (m.act && m.act.k === 'xform') { m.act = null; m.lockHp = null; ST.lb = 0; } m.form = 'black'; loadBlack(); chadBox(m); if (!ST.replay) { sv(ctx).cpB = true; ctx.persist(); } }   /* test: nhảy thẳng xuống < 50 % = đã biến hình */
      if (m && m === ST.lyMo && f < 0.1) ST.grandDone = true;   /* test: nhảy thẳng dưới 10 % = coi như đã qua Đại Hợp Tấu */
      if (m) { m.hp = Math.max(0, Math.round(m.max * f)); if (m.lockHp == null) m.lastHp = m.hp; } },
    call: () => callPress(ctx), cd: o => Object.assign(ST.cd, o), force: k => { const m = ST.rkMo || ST.lyMo; if (!m) return false; m.act = null; m.windT = 0; m.tiredT = 0; if (ST.rkMo) startA(ctx, m, k, ctx.S.player, 0); else startB(ctx, m, k, tgPos(ctx)); return m.act && m.act.k; },
    goArena: () => goArena(ctx), meetSt: () => (ST.meet ? { x: Math.round(ST.meet.ly.x), y: Math.round(ST.meet.ly.y), k: +ST.meet.k.toFixed(2), dir: ST.meet.ly.dir, bind: !!ST.meet.bind, statue: !!ST.meet.statue, stone: !!ST.meet.ly.stone, clip: ST.meet.ly.clip } : null), stage: () => sv(ctx).stage, enterBk: () => ctx.enterBakunawa && ctx.enterBakunawa(), waitLy: () => ST.waitLy && { x: ST.waitLy.x, y: ST.waitLy.y },
    clue: () => clueSpot(ctx),
    fxN: () => ({ bolts: ST.bolts.length, arcs: ST.arcs.length }),
    kill: () => { const m = ST.lyMo; if (m) { m.act = null; m.lockHp = null; m.tiredT = 0; m.hp = 0; } },   /* test: hạ Lyron ngay (bỏ qua Song Kích) */
    form: () => ST.lyMo && ST.lyMo.form, chad: () => { const m = ST.lyMo; if (m) { m.hp = m.lastHp = Math.round(m.max * 0.49); } }, echo: k => { const m = ST.lyMo; if (m && !m.act) { ST.tgt = 'p'; ST.tgtT = 0; startB(ctx, m, k, tgPos(ctx)); } },   /* test: nhắm người chơi */
    perf: () => { const st = a => { if (!a.length) return null; const b = a.slice().sort((x, y) => x - y); return { avg: +(a.reduce((x, y) => x + y, 0) / a.length).toFixed(2), p95: +b[Math.floor(b.length * 0.95)].toFixed(2), max: +b[b.length - 1].toFixed(2) }; }; return { ground: st(PERF.g), ui: st(PERF.u), build: PERF.b.slice(-12) }; }, perfReset: () => { PERF.g.length = 0; PERF.u.length = 0; },
    warm: () => !!(inMind(ctx) && mindStaticCache(ctx, ctx.S.map, ctx.S.map.mind === 'A' ? '#eebfae' : MIND_SKY_B, ctx.S.map.mind === 'A', ST.bright || 0)),
    dbg: () => ({ pull: ST.pull, arrive: ST.arrive, mode: ctx.S.mode, zone: zid(ctx), phase: ST.phase, bright: ST.bright, PULLED }),
    lyPup: () => ST.ly && { x: ST.ly.x, y: ST.ly.y, stone: !!ST.ly.stone, clip: ST.ly.clip },
    expose: s => { const m = ST.rkMo; if (m) m.expT = s; }, hold: v => { const m = ST.rkMo || ST.lyMo; if (m) { m.act = null; m.windT = v ? 999 : 0; m.tiredT = v ? 999 : 0; } },
  };
}
