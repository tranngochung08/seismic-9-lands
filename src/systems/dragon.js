// dragon.js — plan-29: gom đủ 7 Ngọc Rồng → gọi RỒNG THẦN, chọn 1 trong 5 điều ước.
//  · Gọi: nút "Gọi Rồng Thần" ở ô Ngọc Rồng trong túi, hoặc chat "goi rong" (ô chat Rocky, ctx.chatHooks).
//    Không gọi được: dưới nước, đang đánh trùm, đang đấu bạn tập, đang trong cảnh khác → "Rồng Thần không xuất hiện ở đây".
//  · Cảnh (chỉ trong cảnh này mới có hiệu ứng lặp): ngọc bay vòng quanh người chơi phát sáng → trời tối, mưa, sấm chớp → cột sáng,
//    Rồng Thần (ảnh PixelLab 480×288 = 240×144 logic, vẽ 1:1) vút lên, uốn mình → khung thoại + bảng 5 điều ước → gầm, ban điều ước
//    → rồng tan biến, 7 viên ngọc bay tản 7 hướng (mất khỏi túi, rơi lại từ 7 sao) → trời sáng lại. Người chơi bất tử, quái đứng yên (mode 'dragon').
//  · Điều ước: chad (ngoại hình Chad) · power (cấp 50, đầy máu, Kiếm Seismic) · rocky (Rocky cấp 50, 3 chiêu bậc 7)
//    · treasure (9.999 đá, 20 viên hồi máu, 10 viên thở lớn, dụng cụ lên bậc cao nhất — ước lại được) · skill (chiêu Rồng Thần Giáng, phím G / nút 🐉, hồi 90 s).
//  · Ngoại hình Chad: mặc vào → pha ÁO POLO (đi/đứng); 30 s sau (hoặc làm bất kỳ động tác nào khác) → cảnh XÉ ÁO 11 khung + gồng
//    → thân cơ bắp (lưu 'ripped', tải lại vẫn giữ). Thẻ Nhân vật có mục "Ngoại hình" để mặc / bỏ. Sheet người chơi = bản sao sheet thường
//    (các hệ vẽ phần thân 16×20 vẫn chạy) + .actions = clip Chad + .skin = sheet đi Chad (entities.js vẽ 1:1, chân thẳng hàng).
//  · Lưu: save.sys.dragon = { got:{chad,power,rocky,skill}, treasure, summons, chad:{owned,worn,ripped,poloT}, skillAt }.
import { ART } from '../art.js';
import { mkCanvas } from '../gfx.js';
import { clipFps } from '../anim.js';
import { BALL_IDS } from './roadloot.js';
import { maxHp, MAX_LV } from './hero.js';
import * as LV from './petlv.js';

const WISHES = ['chad', 'power', 'rocky', 'treasure', 'skill'];
const TOOL_MAX = { sword: 6, axe: 3, pickaxe: 3, rod: 3, knife: 3, shovel: 1, scythe: 1, torch: 1 };
const SKILL_CD = 90, POLO_SECS = 30;
const STR = {
  vi: {
    call: 'Gọi Rồng Thần', need: n => `Cần đủ 7 viên Ngọc Rồng (đang có ${n}/7)`, nohere: 'Rồng Thần không xuất hiện ở đây',
    speak: 'Hãy nói điều ước của ngươi. Ta chỉ ban MỘT điều.', who: 'Rồng Thần', later: 'Để lần sau', got: 'Đã nhận', again: 'Ước lại được', noRocky: 'Chưa có Rocky',
    w: {
      chad: ['Đẹp trai nhất vũ trụ', 'Mở ngoại hình Chad — mặc / bỏ ở thẻ Nhân vật.'],
      power: ['Sức mạnh tối đa', `Lên cấp ${MAX_LV}, đầy máu, Kiếm Seismic (cấp 6).`],
      rocky: ['Rocky mạnh nhất', 'Rocky cấp 50; Đấm, Rocky-ha, Siêu Cấp lên bậc 7.'],
      treasure: ['Kho báu Rồng Thần', '9.999 đá Seismic, 20 viên hồi máu, 10 viên thở lớn, mọi dụng cụ đang có lên bậc cao nhất.'],
      skill: ['Chiêu "Rồng Thần Giáng"', 'Bóng rồng lao xuống đánh mọi quái trong màn hình. Phím G / nút rồng, hồi 90 giây.'],
    },
    sure: 'Ngươi chắc chắn muốn ước điều này? Ước rồi không đổi được.', yes: 'Chắc chắn', no: 'Chọn lại',
    short: { chad: 'Đẹp trai nhất', power: 'Sức mạnh', rocky: 'Rocky mạnh', treasure: 'Kho báu', skill: 'Rồng Giáng' },
    granted: { chad: '✨ Điều ước thành sự thật: bạn là người đẹp trai nhất vũ trụ!', power: '✨ Sức mạnh tối đa! Cấp ' + MAX_LV, rocky: '✨ Rocky đã mạnh nhất!', treasure: '✨ Kho báu Rồng Thần đã vào túi!', skill: '✨ Học được chiêu Rồng Thần Giáng! (phím G)' },
    bye: 'Điều ước đã thành. Ta đi đây… 7 viên ngọc sẽ tản khắp thế gian.', byeNo: 'Khi nào nghĩ xong, hãy gọi ta lần nữa.',
    look: 'Ngoại hình', normal: 'Thường', chad: 'Chad', wearOn: 'Mặc ngoại hình Chad', wearOff: 'Về ngoại hình thường',
    cd: s => `Rồng Thần Giáng còn hồi ${s} giây`, cast: '🐉 RỒNG THẦN GIÁNG!', none: 'Không có quái nào trong tầm nhìn',
  },
  en: {
    call: 'Summon the Divine Dragon', need: n => `You need all 7 Dragon Balls (you have ${n}/7)`, nohere: 'The Divine Dragon will not appear here',
    speak: 'Speak your wish. I shall grant only ONE.', who: 'Divine Dragon', later: 'Not now', got: 'Received', again: 'Can wish again', noRocky: 'No Rocky yet',
    w: {
      chad: ['Most handsome in the universe', 'Unlock the Chad look — wear / remove it in the Character tab.'],
      power: ['Maximum power', `Reach level ${MAX_LV}, full health, Seismic Sword (tier 6).`],
      rocky: ['Strongest Rocky', 'Rocky level 50; Punch, Rocky-ha and Super Rocky reach tier 7.'],
      treasure: ["Dragon's treasure", '9,999 Seismic stones, 20 healing pills, 10 large breath pills, every tool you own at its best tier.'],
      skill: ['"Divine Dragon Dive" skill', 'A spirit dragon dives across the screen, hitting every monster in view. Key G / dragon button, 90 s cooldown.'],
    },
    sure: 'Are you sure this is your wish? It cannot be undone.', yes: 'I am sure', no: 'Choose again',
    short: { chad: 'Handsome', power: 'Max power', rocky: 'Top Rocky', treasure: 'Treasure', skill: 'Dragon Dive' },
    granted: { chad: '✨ Wish granted: you are the most handsome in the universe!', power: '✨ Maximum power! Level ' + MAX_LV, rocky: '✨ Rocky is now the strongest!', treasure: "✨ The dragon's treasure is in your bag!", skill: '✨ You learned Divine Dragon Dive! (key G)' },
    bye: 'Your wish is granted. I depart… the 7 balls will scatter across the world.', byeNo: 'When you have decided, call me again.',
    look: 'Look', normal: 'Normal', chad: 'Chad', wearOn: 'Wearing the Chad look', wearOff: 'Back to your normal look',
    cd: s => `Divine Dragon Dive recharging: ${s} s`, cast: '🐉 DIVINE DRAGON DIVE!', none: 'No monsters in view',
  },
};
const L = ctx => STR[ctx.lang() === 'vi' ? 'vi' : 'en'];
const sv = ctx => { const s = ctx.S.save; s.sys ||= {}; const d = (s.sys.dragon ||= {}); d.got ||= {}; d.chad ||= {}; d.treasure ||= 0; d.summons ||= 0; return d; };
const ST = { sc: null, dive: null, fx: [], rip: null, base: null, proxies: new Map(), el: null, btn: null, btnSig: '', ctx: null, sel: 0 };
const HI = () => ART.hi || 2;

/* ---------------- ảnh ---------------- */
const IMG = {};
function loadImg(key, file) {
  if (IMG[key] !== undefined || typeof Image === 'undefined') return; IMG[key] = null;
  const im = new Image(); im.onload = () => { const c = mkCanvas(im.width, im.height); c.getContext('2d').drawImage(im, 0, 0); c.__hi = HI(); IMG[key] = c; }; im.src = 'assets/px/' + file;
}
function loadAll() {
  const d = ART.man && ART.man.dragon && ART.man.dragon.images; if (d) for (const [k, f] of Object.entries(d)) loadImg(k, f);
  for (let n = 1; n <= 7; n++) loadImg('ball' + n, `ui/items/dball${n}.png`);
}
const vfxS = name => ART.vfx && ART.vfx[name];
/* vẽ 1 khung VFX (manifest.vfx, ảnh 2× logic) — (x, y) = điểm neo của sheet (ax, ay; mặc định đáy-giữa) theo toạ độ màn hình logic */
function drawVfx(g, name, f, x, y, alpha = 1) {
  const s = vfxS(name); if (!s) return;
  const fr = ((f % s.n) + s.n) % s.n, ax = s.ax ?? s.w / 2, ay = s.ay ?? s.h;
  if (alpha < 1) { g.save(); g.globalAlpha = alpha; }
  g.drawImage(s.img, fr * s.w, 0, s.w, s.h, Math.round(x - ax), Math.round(y - ay), s.w, s.h);
  if (alpha < 1) g.restore();
}
const vfxFrame = (name, t, fps) => { const s = vfxS(name); return s ? Math.floor(t * (fps || s.fps || 12)) : 0; };
const vfxDone = (name, t, fps) => { const s = vfxS(name); return !s || t * (fps || s.fps || 12) >= s.n; };

/* ---------------- ngọc ---------------- */
const ballCount = ctx => BALL_IDS.filter(id => ctx.bag.count(id) > 0).length;
const hasAll = ctx => ballCount(ctx) >= 7;
function blockReason(ctx) {
  const S = ctx.S, z = S.zone || {};
  if (!hasAll(ctx)) return L(ctx).need(ballCount(ctx));
  if (ST.sc || ST.rip && ST.rip.timed) return L(ctx).nohere;
  if (S.mode !== 'play') return L(ctx).nohere;
  if ((ctx.isUnderwater && ctx.isUnderwater()) || z.under || z.id === 'trench' || (S.sea && S.sea.diving)) return L(ctx).nohere;
  if (ctx.sparOn && ctx.sparOn()) return L(ctx).nohere;
  if (ctx.monsters && ctx.monsters.boss && ctx.monsters.boss()) return L(ctx).nohere;
  return null;
}

/* ---------------- điều ước ---------------- */
function rockyPet(ctx) { return ctx.rocky && ctx.rocky.pet ? ctx.rocky.pet() : ((ctx.S.save.sys || {}).pet || {}).pet || null; }
function wishState(ctx, id) {   /* → { off: bool, note: string } */
  const d = sv(ctx), t = L(ctx);
  if (id === 'chad') return d.got.chad ? { off: true, note: t.got } : { off: false };
  if (id === 'power') { const h = ctx.S.save.hero || {}; return d.got.power || ((h.lv || 1) >= MAX_LV && ctx.tool.tier('sword') >= 6) ? { off: true, note: t.got } : { off: false }; }
  if (id === 'rocky') { const pt = rockyPet(ctx); if (!pt) return { off: true, note: t.noRocky }; const lv = LV.levelFromXp(pt.xp || 0).lv; return d.got.rocky || (lv >= LV.LV_CAP && LV.SKILL_IDS.every(k => LV.tierOf(pt, k) >= LV.TIER_MAX)) ? { off: true, note: t.got } : { off: false }; }
  if (id === 'skill') return d.got.skill ? { off: true, note: t.got } : { off: false };
  return { off: false, note: t.again };
}
function grant(ctx, id) {
  const d = sv(ctx), S = ctx.S, p = S.player;
  if (id === 'chad') { d.got.chad = true; d.chad.owned = true; wear(ctx, true, true); }
  else if (id === 'power') {
    const h = (S.save.hero ||= { lv: 1, xp: 0, hp: null }); h.lv = MAX_LV; h.xp = 0; h.hp = maxHp(MAX_LV); d.got.power = true;
    ctx.tool.set('sword', Math.max(6, ctx.tool.tier('sword'))); if (ctx.hotbarSync) ctx.hotbarSync();
    if (ctx.vfx) ctx.vfx('level_up', p.x, p.y + 2, 0, true);
  } else if (id === 'rocky') {
    const pt = rockyPet(ctx); if (pt) { pt.xp = LV.xpForLevel(LV.LV_CAP); pt.hp = LV.maxHpOf(LV.LV_CAP); pt.skills = { ...(pt.skills || {}), punch: LV.TIER_MAX, ha: LV.TIER_MAX, super: LV.TIER_MAX }; pt.koT = 0; }
    d.got.rocky = true;
  } else if (id === 'treasure') {
    ctx.bag.add('stone', 9999); ctx.bag.add('pill_hp', 20); ctx.bag.add('pill_l', 10);
    for (const [k, mx] of Object.entries(TOOL_MAX)) if (ctx.TOOLS && ctx.TOOLS[k] && ctx.tool.tier(k) > 0 && ctx.tool.tier(k) < mx) ctx.tool.set(k, mx);
    if (ctx.hotbarSync) ctx.hotbarSync(); d.treasure++;
  } else if (id === 'skill') { d.got.skill = true; d.skillAt = 0; }
  (d.log ||= []).push({ id, at: Date.now() }); if (d.log.length > 20) d.log.shift();
  ctx.persist();
}

/* ---------------- cảnh gọi rồng ---------------- */
const HIDE = () => {};
function restorePlayer(ctx) { const p = ctx.S.player; if (p && p.custom === HIDE) p.custom = ST.savedCustom || null; ST.savedCustom = null; }
function summon(ctx) {
  const why = blockReason(ctx); if (why) { ctx.toast(why, true); if (ctx.sfx) ctx.sfx('fail'); return false; }
  const p = ctx.S.player; p.autoPath = null; p.action = null; p.moving = false; p.frame = 0; p.dir = 0;
  ST.sc = { t: 0, ph: 'gather', pt: 0, bolts: [1.8, 2.5, 3.1, 4.9].map(at => ({ at })), fx: [], balls: BALL_IDS.map((id, i) => ({ n: 7 - i, a: -Math.PI / 2 + i * Math.PI * 2 / 7 })), cam: 0, dark: 0, rain: 0, dr: null, choice: null, wishAt: 0 };
  ST.savedCustom = p.custom; p.custom = HIDE;   /* thân thật ẩn suốt cảnh, vẽ ở sân khấu */
  css(); document.body.classList.add('dr-scene'); if (ctx.input) for (const k in ctx.input) ctx.input[k] = false;   /* ẩn mọi HUD / nút cảm ứng suốt cảnh (cần điều khiển, nút A không nhận nhầm chạm) */
  sv(ctx).summons++; ctx.setMode('dragon'); if (ctx.sfx) ctx.sfx('sparkle'); ctx.persist();
  return true;
}
function setPh(sc, ph) { sc.ph = ph; sc.pt = 0; }
function commit(ctx, id) {   /* ban điều ước (đã xác nhận) hoặc id = null → rồng đi, không mất gì */
  const sc = ST.sc; if (!sc || sc.ph !== 'ask') return false;
  if (id !== null && (!WISHES.includes(id) || wishState(ctx, id).off)) return false;
  hideConfirm(); sc.confirm = null; hidePanel(); sc.choice = id; setPh(sc, id === null ? 'leave' : 'roar');
  if (id !== null) { if (ctx.sfx) ctx.sfx('roar_big'); ctx.quake(0.6); ctx.S.flash = 0.45; }
  return true;
}
/* anh 2026-10-12: chọn thẻ → hỏi XÁC NHẬN ("Chắc chắn" / "Chọn lại") rồi mới ban; "Chọn lại" quay về bảng thẻ, không mất gì */
function choose(ctx, id) {
  const sc = ST.sc; if (!sc || sc.ph !== 'ask') return false;
  if (id === null) return commit(ctx, null);
  if (!WISHES.includes(id) || wishState(ctx, id).off) return false;
  ST.sel = WISHES.indexOf(id); moveSel(ctx, 0); sc.confirm = id; showConfirm(ctx, id); if (ctx.sfx) ctx.sfx('click'); return true;
}
function confirmYes(ctx) { const sc = ST.sc; if (!sc || !sc.confirm) return false; return commit(ctx, sc.confirm); }
function confirmBack(ctx) { const sc = ST.sc; if (!sc || !sc.confirm) return false; sc.confirm = null; hideConfirm(); return true; }
function selectCard(ctx, i) { if (i < 0 || wishState(ctx, WISHES[i]).off) return false; ST.sel = i; moveSel(ctx, 0); return true; }
function scatterBalls(ctx) {   /* 7 viên rời túi; thứ tự rơi trở lại từ 7 sao */
  for (const id of BALL_IDS) { const n = ctx.bag.count(id); if (n > 0) ctx.bag.remove(id, n); }
  const r = ((ctx.S.save.sys ||= {}).road ||= {}); r.balls = [];
  if (ctx.hotbarSync) ctx.hotbarSync(); ctx.persist();
}
function endScene(ctx) {
  restorePlayer(ctx); const sc = ST.sc; ST.sc = null; ctx.S.camDY = 0; ctx.S.hideLabels = false; ctx.S.camFree = false; if (typeof document !== 'undefined') document.body.classList.remove('dr-scene'); hidePanel();
  if (ctx.S.mode === 'dragon') ctx.setMode('play');
  if (sc && sc.choice) ctx.toast(L(ctx).granted[sc.choice], true);
  ctx.persist();
}
const portrait = ctx => ctx.VH > ctx.VW * 1.1;   /* điện thoại dọc: thẻ ở TRÊN (dưới lời rồng), rồng + người chơi ngay dưới */
function targetPsy(ctx) {
  if (portrait(ctx) && ST.el && !ST.el.hidden && typeof document !== 'undefined') {
    const cv = document.getElementById('c'), r = cv && cv.getBoundingClientRect(), b = ST.el.querySelector('.dr-desc') || ST.el;
    if (r && r.height) { const toL = y => (y - r.top) * ctx.VH / r.height, yb = toL(b.getBoundingClientRect().bottom), lt = ST.el.querySelector('.dr-later'), ye = lt ? toL(lt.getBoundingClientRect().top) : ctx.VH;
      const mid = (yb + ye) / 2; return Math.round(Math.max(yb + 6 + 72, Math.min(mid - 45 + 72, ye - 34)));   /* khối rồng + người chơi nằm giữa khoảng trống giữa dải mô tả và nút 'Để lần sau' (cân màn dọc) */ }
  }
  return Math.round(ctx.VH * (portrait(ctx) ? 0.5 : 0.6));
}
function updScene(dt, ctx) {
  const sc = ST.sc, S = ctx.S, p = S.player; sc.t += dt; sc.pt += dt;
  if (ctx.hero && ctx.hero.iframes) ctx.hero.iframes(0.4);   /* bất tử suốt cảnh */
  p.moving = false; p.autoPath = null;
  for (const b of sc.balls) b.a += dt * (sc.ph === 'gather' ? 2.2 : 0.9);
  for (const f of sc.fx) f.t += dt; sc.fx = sc.fx.filter(f => !vfxDone(f.name, f.t, f.fps) || f.loop);
  const lerp = (a, b, k) => a + (b - a) * Math.max(0, Math.min(1, k));
  if (sc.ph === 'gather') { sc.cam = lerp(0, 1, sc.pt / 1.2); sc.dark = lerp(0, 0.35, sc.pt / 1.6); if (sc.pt >= 1.6) { setPh(sc, 'storm'); if (ctx.sfx) ctx.sfx('rumble'); } }
  else if (sc.ph === 'storm') { sc.dark = lerp(0.35, 0.68, sc.pt / 1.2); sc.rain = lerp(0, 1, sc.pt / 0.8); if (sc.pt >= 1.8) { setPh(sc, 'rise'); sc.fx.push({ name: 'dr_pillar', t: 0, fps: 8, pillar: true }); if (ctx.sfx) ctx.sfx('whoosh_big'); } }
  else if (sc.ph === 'rise') { if (sc.pt >= 1.9) { setPh(sc, 'coil'); if (ctx.sfx) ctx.sfx('roar_big'); ctx.quake(0.5); } }
  else if (sc.ph === 'coil') { if (sc.pt >= 0.9) { setPh(sc, 'ask'); ST.sel = WISHES.findIndex(id => !wishState(ctx, id).off); showPanel(ctx); } }
  else if (sc.ph === 'roar') {
    if (!sc.granted && sc.pt >= 0.5) { sc.granted = true; grant(ctx, sc.choice); sc.fx.push({ name: 'dr_grant', t: 0, onP: true }); if (ctx.sfx) ctx.sfx('level_up'); }
    if (sc.pt >= 1.7) { setPh(sc, 'vanish'); scatterBalls(ctx); sc.balls.forEach((b, i) => { b.fly = { a: b.a + 0.3, v: 30 + i * 4 }; }); if (ctx.sfx) ctx.sfx('whoosh_big'); ctx.toast(L(ctx).bye); }
  } else if (sc.ph === 'leave') { if (sc.pt >= 1.4) setPh(sc, 'clear'); }
  else if (sc.ph === 'vanish') { for (const b of sc.balls) if (b.fly) { b.fly.v += dt * 420; b.fly.d = (b.fly.d || 0) + b.fly.v * dt; } if (sc.pt >= 1.6) setPh(sc, 'clear'); }
  else if (sc.ph === 'clear') { sc.dark = lerp(0.68, 0, sc.pt / 1.3); sc.rain = lerp(1, 0, sc.pt / 0.8); sc.cam = lerp(1, 0, sc.pt / 1.3); if (sc.pt >= 1.4) { endScene(ctx); return; } }
  if (sc.ph === 'ask' && sc.t >= (sc.nextBolt || 0)) { sc.nextBolt = sc.t + 2.5 + Math.random() * 3.5; if (sc.nextBolt > 0 && sc.t > 1) sc.bolts.push({ at: sc.t, soft: true }); }   /* sấm trong mây lúc chờ ước */
  for (const b of sc.bolts) if (!b.done && sc.t >= b.at) { b.done = true; S.flash = b.soft ? 0.18 : 0.55; if (ctx.sfx) ctx.sfx('thunder'); const side = Math.random() < 0.5; sc.fx.push({ name: 'dr_bolt', t: 0, sx: b.soft ? (side ? 20 + Math.random() * ctx.VW * 0.22 : ctx.VW * 0.78 + Math.random() * (ctx.VW * 0.22 - 20)) : 30 + Math.random() * (ctx.VW - 60), sy: 10 + Math.random() * 40 }); }
  if (sc.ph === 'roar' && !sc.bolt2) { sc.bolt2 = true; sc.fx.push({ name: 'dr_bolt', t: 0, sx: ctx.VW * 0.2, sy: 70 }, { name: 'dr_bolt', t: 0, sx: ctx.VW * 0.8, sy: 60 }); }
  S.hideLabels = true; S.camDY = 0; S.camFree = false;
  /* 'Sân khấu' (anh chốt bố cục 2026-10-12): người chơi bay lên vị trí cố định trên MÀN (dưới mặt rồng, trên/dưới hàng thẻ) bất kể đang đứng sát mép bản đồ;
     vị trí thật không đổi — hết cảnh thì hạ xuống đúng chỗ cũ. Không cuộn máy quay qua mép bản đồ → không còn khoảng trống tối. */
  { const want = targetPsy(ctx); sc.stY = sc.stY == null ? want : sc.stY + (want - sc.stY) * Math.min(1, dt * 5); }
}
/* vị trí rồng (màn hình) */
function dragonPose(ctx, sc, psx, psy) {   /* rồng 128×84 logic (PixelLab, vẽ 1:1); mặt (~64, 30) ngay trên đầu người chơi — bố cục anh chốt 2026-10-12 */
  const top = psy - 72, x0 = psx - 64;
  let y = top, a = 1, clip = null;
  if (sc.ph === 'gather' || sc.ph === 'storm') return null;
  if (sc.ph === 'rise') { const k = Math.min(1, sc.pt / 1.7), e = 1 - Math.pow(1 - k, 3); y = Math.round(top + (1 - e) * 120); a = Math.min(1, sc.pt / 0.5); clip = true; }
  if (sc.ph === 'vanish' || sc.ph === 'leave') { const k = Math.min(1, sc.pt / 1.2); a = 1 - k; y = Math.round(top - k * 20); }
  if (sc.ph === 'clear') return null;
  const roar = sc.ph === 'roar' ? sc.pt : (sc.ph === 'coil' && sc.pt < 0.9 ? sc.pt : -1);
  return { x: x0, y: y + Math.round(Math.sin(sc.t * 1.1) * 1.5), a, clip, roar };
}
const DFR = name => (ART.man && ART.man.dragon && ART.man.dragon.frames && ART.man.dragon.frames[name]) || { n: 9, w: 128, h: 84, fps: 8 };
function drawDragon(g, ctx, sc, pose, horizon) {
  const useRoar = pose.roar >= 0 && IMG.dragon_roar8, img = useRoar ? IMG.dragon_roar8 : IMG.dragon_idle; if (!img) return;
  const fr = DFR(useRoar ? 'dragon_roar8' : 'dragon_idle'), f = useRoar ? Math.min(fr.n - 1, Math.floor(pose.roar * fr.fps)) : Math.floor(sc.t * fr.fps) % fr.n;   /* chờ điều ước: clip thở/uốn/râu bay PixelLab lặp; gầm: clip gầm 1 lần */
  g.save(); g.globalAlpha = Math.max(0, Math.min(1, pose.a));
  if (pose.clip) { g.beginPath(); g.rect(0, 0, ctx.VW, horizon); g.clip(); }
  g.drawImage(img, f * fr.w, 0, fr.w, fr.h, pose.x, pose.y, fr.w, fr.h);
  g.restore();
}
function ballPos(sc, b, p) { const r = 30, cx = p.x, cy = p.y - 6; let x = cx + Math.cos(b.a) * r, y = cy + Math.sin(b.a) * 9;   /* vòng ngọc quanh chân (nửa sau vẽ sau lưng người chơi) */
  if (sc.ph === 'gather') { const k = Math.min(1, sc.pt / 0.8); x = p.x + (x - p.x) * k; y = (p.y - 10) + (y - (p.y - 10)) * k; }
  if (b.fly) { x += Math.cos(b.fly.a) * b.fly.d; y += Math.sin(b.fly.a) * b.fly.d * 0.8; }
  return { x, y };
}
function drawScene(g, ctx, cx, cy) {
  const sc = ST.sc, p = ctx.S.player, VW = ctx.VW, VH = ctx.VH;
  if (sc.dark > 0) { g.fillStyle = `rgba(8,10,32,${sc.dark.toFixed(3)})`; g.fillRect(0, 0, VW, VH); }
  const rs = vfxS('dr_rain');
  if (rs && sc.rain > 0) { const f = vfxFrame('dr_rain', sc.t); for (let ty = 0; ty < VH + rs.h; ty += rs.h) for (let tx = 0; tx < VW + rs.w; tx += rs.w) drawVfx(g, 'dr_rain', f + ((tx / rs.w + ty / rs.h) | 0) * 3, tx + (rs.ax ?? rs.w / 2), ty + (rs.ay ?? rs.h) - 10, 0.85 * sc.rain); }
  for (const f of sc.fx) if (f.name === 'dr_bolt') drawVfx(g, 'dr_bolt', vfxFrame('dr_bolt', f.t), f.sx, f.sy + 150);
  const rx = p.x - cx, ry = p.y - cy, m = Math.max(0, Math.min(1, sc.cam)), ease = m * m * (3 - 2 * m);
  const psx = Math.round(rx + (VW / 2 - rx) * ease), psy = Math.round(ry + ((sc.stY ?? ry) - ry) * ease);   /* vị trí sân khấu trên màn */
  ST.stage = { x: psx, y: psy, VH, VW };
  const vp = { x: psx + cx, y: psy + cy };   /* người chơi 'ảo' ở sân khấu (toạ độ thế giới) cho vòng ngọc */
  ST.pfrac = psy / VH;   /* vị trí người chơi trên màn (bản đồ chạm mép → máy quay không cuộn được) */
  if (ST.el && !ST.el.hidden) ST.el.classList.toggle('top', portrait(ctx));
  { const mb = ctx.S.map.h * 16 - cy, mt = -cy;   /* ngoài mép bản đồ: sương bão tối mờ dần (không để khoảng đen trống) */
    if (mb < VH) { const gr = g.createLinearGradient(0, mb - 28, 0, mb + 40); gr.addColorStop(0, 'rgba(10,14,34,0)'); gr.addColorStop(1, 'rgba(10,14,34,.96)'); g.fillStyle = gr; g.fillRect(0, mb - 28, VW, VH - mb + 28); }
    if (mt > 0) { const gr = g.createLinearGradient(0, mt + 28, 0, mt - 40); gr.addColorStop(0, 'rgba(10,14,34,0)'); gr.addColorStop(1, 'rgba(10,14,34,.96)'); g.fillStyle = gr; g.fillRect(0, 0, VW, mt + 28); } }
  for (const f of sc.fx) if (f.pillar) drawVfx(g, 'dr_pillar', vfxFrame('dr_pillar', f.t, f.fps), psx, psy - 4);
  if (sc.dark > 0.3) {   /* tâm điểm: mép màn tối dần quanh rồng + người chơi (rừng trống xung quanh lùi vào bóng tối) */
    const fx = psx, fy = psy - 34, R = Math.max(VW, VH) * 0.62, gr = g.createRadialGradient(fx, fy, R * 0.32, fx, fy, R);
    gr.addColorStop(0, 'rgba(4,6,18,0)'); gr.addColorStop(1, `rgba(4,6,18,${Math.min(0.72, (sc.dark - 0.3) * 2).toFixed(2)})`); g.fillStyle = gr; g.fillRect(0, 0, VW, VH);
  }
  const pose = dragonPose(ctx, sc, psx, psy), calm = pose && (sc.ph === 'ask' || sc.ph === 'coil' || sc.ph === 'roar');
  if (pose && calm) drawVfx(g, 'dr_aura', vfxFrame('dr_aura', sc.t), pose.x + 64, pose.y + 30, 0.35 + 0.15 * Math.sin(sc.t * 2.4));   /* hào quang vàng mờ sau đầu rồng — CHỈ trong cảnh này */
  if (pose) drawDragon(g, ctx, sc, pose, psy - 6);
  if (pose && calm) drawVfx(g, 'dr_motes', vfxFrame('dr_motes', sc.t), pose.x + 64, pose.y + 42, 0.9);   /* đốm sáng lơ lửng quanh rồng */
  const drawBall = b => {
    const q = ballPos(sc, b, vp), x = Math.round(q.x - cx), y = Math.round(q.y - cy), img = IMG['ball' + b.n];
    if (b.fly) { const s = vfxS('dr_trail'); if (s) { g.save(); g.translate(x, y); g.rotate(b.fly.a); drawVfx(g, 'dr_trail', vfxFrame('dr_trail', sc.t), 0, 0); g.restore(); } }
    else drawVfx(g, 'dr_ballglow', vfxFrame('dr_ballglow', sc.t) + b.n, x, y, sc.ph === 'leave' || sc.ph === 'clear' ? Math.max(0, 1 - sc.pt) : 1);
    if (img && !(b.fly && (x < -20 || x > VW + 20 || y < -20 || y > VH + 20))) { g.save(); if (sc.ph === 'leave' || sc.ph === 'clear') g.globalAlpha = Math.max(0, 1 - sc.pt); g.drawImage(img, 0, 0, 16, 16, x - 8, y - 8, 16, 16); g.restore(); }

  };
  const behind = b => !b.fly && Math.sin(b.a) < 0;
  for (const b of sc.balls) if (behind(b)) drawBall(b);
  { const own = p.custom; p.custom = ST.savedCustom || null; g.save(); g.translate(psx - p.x, psy - p.y); try { p.draw(g); } finally { p.custom = own; } g.restore(); }   /* người chơi (ở sân khấu) luôn đứng trước rồng */
  for (const b of sc.balls) if (!behind(b)) drawBall(b);
  for (const f of sc.fx) if (f.onP) drawVfx(g, 'dr_grant', vfxFrame('dr_grant', f.t), psx, psy + 2);
}

/* ---------------- bảng điều ước (DOM, hợp điện thoại) ---------------- */
/* Bảng điều ước — bố cục anh chốt 2026-10-12 (bản 2: thẻ nhỏ, đẹp hơn): rồng trên, người chơi giữa, 5 THẺ nhỏ 1 HÀNG NGANG (1→5) ở dưới,
   tên ngắn dưới thẻ, mô tả CHỈ của thẻ đang chọn trên dải lụa (nút ngọc), lời rồng ở bảng trên cùng, "Để lần sau" = nút ngọc PixelLab.
   Ảnh PixelLab (assets/px/dragon/ui): khung thẻ ngọc-vàng (vẽ NGUYÊN cỡ, không kéo giãn), huy hiệu số (khung PixelLab + chữ số pixel 5×7 tự vẽ cùng tông),
   nút ngọc (9-slice ngang), icon. 1 pixel ảnh = k px màn (k = scale game / 2: máy tính 2, điện thoại 1). Thẻ đang chọn / rê chuột: viền vàng phát sáng nhịp thở. */
const UIP = 'assets/px/dragon/ui/';
function css() {
  if (document.getElementById('dr-style')) return;
  const st = document.createElement('style'); st.id = 'dr-style';
  st.textContent = `
    body.dr-scene #hud,body.dr-scene #seis,body.dr-scene #prompt,body.dr-scene #touch,body.dr-scene #touch-skills,body.dr-scene #herobar,body.dr-scene #hotbar,body.dr-scene #mslots,body.dr-scene #pxhud,
    body.dr-scene #btn-chat,body.dr-scene #btn-dragon,body.dr-scene #preset-chip,body.dr-scene #rk-chat,body.dr-scene #sys-trees-hud,body.dr-scene #show19,body.dr-scene #joy,body.dr-scene #btn-a{display:none!important;pointer-events:none!important}
    #dr-say{position:fixed;left:50%;top:calc(6px + env(safe-area-inset-top,0px));transform:translateX(-50%);z-index:45;max-width:calc(100vw - 16px);box-sizing:border-box;
      border-style:solid;border-width:calc(var(--k) * 12px);border-image:url(${UIP}card.png) 12 fill / calc(var(--k) * 12px) stretch;image-rendering:pixelated;
      padding:0 calc(var(--k) * 3px);color:#fff6d8;font:calc(9px + var(--k) * 4px) VT323,monospace;text-align:center;line-height:1.05;text-shadow:1px 1px 0 #10241a;pointer-events:none}
    #dr-say[hidden],#dr-wish[hidden]{display:none} #dr-say b{color:#ffd45e;font-weight:normal}
    #dr-wish{position:fixed;left:50%;bottom:calc(var(--k) * 3px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);z-index:45;width:max-content;max-width:calc(100vw - 8px);
      display:flex;flex-direction:column;align-items:center;gap:calc(var(--k) * 2px);color:#fff6d8;font-family:VT323,monospace}
    #dr-wish.top{bottom:auto;top:calc(var(--k) * 34px + 18px + env(safe-area-inset-top,0px));left:0;right:0;margin:0 auto;transform:none}
    #dr-wish.top .dr-later{position:fixed;left:50%;transform:translateX(-50%);bottom:calc(10px + env(safe-area-inset-bottom,0px))} #dr-wish.top .dr-later span{width:94px;height:28px;font-size:17px}
    #dr-wish .dr-cards{display:flex;flex-wrap:wrap;justify-content:center;gap:calc(var(--k) * 5px)}
    #dr-wish .dr-w{position:relative;display:flex;flex-direction:column;align-items:center;gap:calc(var(--k) * 1px);background:none;border:0;padding:calc(var(--k) * 5px) 0 0;cursor:pointer;color:#fff6d8;font-family:VT323,monospace;min-width:44px}
    #dr-wish .dr-w .fr{position:relative;width:calc(var(--k) * 64px);height:calc(var(--k) * 46px);background:url(${UIP}card.png) 0 0/100% 100% no-repeat;image-rendering:pixelated;display:flex;align-items:center;justify-content:center;transition:transform .12s}
    #dr-wish .dr-w .fr img{image-rendering:pixelated;display:block}
    #dr-wish .dr-w b{font-weight:normal;color:#ffd45e;font-size:calc(9px + var(--k) * 4px);line-height:1;text-shadow:1px 1px 0 #10241a,0 0 3px #000;white-space:nowrap}
    #dr-wish .dr-w em{font-style:normal;font-size:calc(8px + var(--k) * 3px);color:#bff5d0;text-shadow:1px 1px 0 #000;line-height:1;white-space:nowrap}
    #dr-wish .dr-n{position:absolute;left:calc(var(--k) * -4px);top:calc(var(--k) * -1px);width:calc(var(--k) * 15px);height:calc(var(--k) * 15px);image-rendering:pixelated;z-index:2}
    @keyframes drGlow{0%,100%{filter:drop-shadow(0 0 calc(var(--k) * 1px) #ffd45e) brightness(1.05)}50%{filter:drop-shadow(0 0 calc(var(--k) * 4px) #ffe9a0) brightness(1.18)}}
    #dr-wish .dr-w.sel .fr,#dr-wish .dr-w:hover:not([disabled]) .fr{animation:drGlow 1.1s ease-in-out infinite;transform:translateY(calc(var(--k) * -2px))}
    #dr-wish .dr-w.sel b{color:#fff3b0}
    #dr-wish .dr-w[disabled]{cursor:default} #dr-wish .dr-w[disabled] .fr,#dr-wish .dr-w[disabled] .dr-n{filter:grayscale(1) brightness(.55)} #dr-wish .dr-w[disabled] b{color:#9a9a8a}
    #dr-wish .dr-desc{border-style:solid;border-width:calc(var(--k) * 6px) calc(var(--k) * 12px);border-image:url(${UIP}button.png) 6 12 fill / calc(var(--k) * 6px) calc(var(--k) * 12px) stretch;image-rendering:pixelated;
      max-width:min(calc(var(--k) * 340px), calc(100vw - 16px));box-sizing:border-box;padding:0 calc(var(--k) * 2px);text-align:center;font-size:calc(8px + var(--k) * 4px);color:#fff6d8;text-shadow:1px 1px 0 #10241a;line-height:1.05}
    #dr-wish .dr-desc:empty{display:none}
    #dr-wish .dr-later{background:none;border:0;padding:calc((44px - var(--k) * 14px) / 2) 4px;cursor:pointer;min-height:44px;display:flex;align-items:center}
    #dr-wish .dr-later span{display:flex;align-items:center;justify-content:center;width:calc(var(--k) * 47px);height:calc(var(--k) * 14px);background:url(${UIP}button.png) 0 0/100% 100% no-repeat;image-rendering:pixelated;
      color:#e8dcb0;font:calc(7px + var(--k) * 4px) VT323,monospace;text-shadow:1px 1px 0 #10241a;line-height:1}
    #dr-wish .dr-later:hover span{filter:brightness(1.2)}
    #dr-confirm{position:fixed;inset:0;z-index:47;display:flex;align-items:center;justify-content:center;background:rgba(4,8,16,.45)} #dr-confirm[hidden]{display:none}
    #dr-confirm .cf-box{max-width:min(calc(var(--k) * 200px + 40px), calc(100vw - 24px));box-sizing:border-box;border-style:solid;border-width:calc(var(--k) * 12px);
      border-image:url(${UIP}card.png) 12 fill / calc(var(--k) * 12px) stretch;image-rendering:pixelated;padding:calc(var(--k) * 2px);color:#fff6d8;font-family:VT323,monospace;text-shadow:1px 1px 0 #10241a;animation:drPop .16s ease-out}
    @keyframes drPop{from{transform:scale(.92);opacity:0}to{transform:none;opacity:1}}
    #dr-confirm .cf-say{font-size:calc(9px + var(--k) * 4px);line-height:1.05;text-align:center;margin-bottom:calc(var(--k) * 4px)} #dr-confirm .cf-say b{color:#ffd45e;font-weight:normal}
    #dr-confirm .cf-row{display:flex;gap:calc(var(--k) * 4px);align-items:center} #dr-confirm .cf-ic{flex:none;width:calc(var(--k) * 64px);height:calc(var(--k) * 46px);display:flex;align-items:center;justify-content:center;background:url(${UIP}card.png) 0 0/100% 100% no-repeat;image-rendering:pixelated}
    #dr-confirm .cf-ic img{image-rendering:pixelated} #dr-confirm .cf-tx b{display:block;color:#ffd45e;font-weight:normal;font-size:calc(10px + var(--k) * 4px)} #dr-confirm .cf-tx i{display:block;font-style:normal;font-size:calc(8px + var(--k) * 4px);line-height:1.05;color:#e8f4dc}
    #dr-confirm .cf-btns{display:flex;justify-content:center;gap:calc(var(--k) * 6px);margin-top:calc(var(--k) * 4px)}
    #dr-confirm .cf-b{background:none;border:0;padding:0;min-height:44px;display:flex;align-items:center;cursor:pointer}
    #dr-confirm .cf-b span{display:flex;align-items:center;justify-content:center;width:max(94px, calc(var(--k) * 47px));height:max(28px, calc(var(--k) * 14px));background:url(${UIP}button.png) 0 0/100% 100% no-repeat;image-rendering:pixelated;color:#e8dcb0;font:calc(9px + var(--k) * 4px) VT323,monospace;text-shadow:1px 1px 0 #10241a}
    #dr-confirm .cf-b.yes span{color:#ffe27a;animation:drGlow 1.1s ease-in-out infinite} #dr-confirm .cf-b:hover span{filter:brightness(1.2)}
    #btn-dragon{position:fixed;right:70px;bottom:130px;z-index:7;width:46px;height:46px;padding:0;border:2px solid #c9a23a;border-radius:50%;background:rgba(20,26,22,.8);cursor:pointer;display:flex;align-items:center;justify-content:center}
    #btn-dragon[hidden]{display:none} #btn-dragon img{width:32px;height:32px;image-rendering:pixelated} #btn-dragon.cd img{filter:grayscale(1) brightness(.6)}
    #btn-dragon b{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#fff6c8;font:bold 16px VT323,monospace;text-shadow:1px 1px 0 #000}
    #btn-dragon i{position:absolute;right:-4px;bottom:-6px;font:12px VT323,monospace;font-style:normal;color:#ffd45e;text-shadow:1px 1px 0 #000}
    @media (pointer:coarse){#btn-dragon{right:104px;bottom:132px;width:54px;height:54px} #btn-dragon i{display:none}}`;
  document.head.appendChild(st);
}
const ICON = { chad: 'icon_chad.png', power: 'icon_power.png', rocky: 'icon_rocky.png', treasure: 'icon_treasure.png', skill: 'icon_skill.png' };
const ICON_PX = { chad: [32, 32], power: [24, 24], rocky: [22, 24], treasure: [24, 24], skill: [32, 32] };
function uiK(ctx) { const k = Math.max(1, Math.round((ctx.scale || 4) / HI())); return (typeof innerWidth !== 'undefined' && innerWidth < 640) ? 1 : Math.min(k, 3); }
function descOf(ctx, i) { const id = WISHES[i]; return id ? L(ctx).w[id][1] : ''; }
function showPanel(ctx) {
  css(); const t = L(ctx), k = uiK(ctx);
  if (!ST.el) {
    ST.el = document.createElement('div'); ST.el.id = 'dr-wish'; document.body.appendChild(ST.el);
    ST.say = document.createElement('div'); ST.say.id = 'dr-say'; document.body.appendChild(ST.say);
    addEventListener('resize', () => { if (ST.el && !ST.el.hidden && ST.ctx) showPanel(ST.ctx); });   /* xoay máy / đổi cỡ cửa sổ → đổi k */
    ST.el.addEventListener('pointerdown', e => { const b = e.target.closest('[data-w]'); if (b && !b.disabled) { e.preventDefault(); const i = WISHES.indexOf(b.dataset.w);   /* chạm: hỏi xác nhận ngay; chuột: lần 1 chỉ chọn, bấm lại đúng thẻ đó mới hỏi */
      if (e.pointerType === 'mouse' && ST.sel !== i) selectCard(ST.ctx, i); else choose(ST.ctx, b.dataset.w); } const l = e.target.closest('[data-later]'); if (l) { e.preventDefault(); choose(ST.ctx, null); } });
  }
  for (const el of [ST.el, ST.say]) el.style.setProperty('--k', k);
  ST.say.innerHTML = `<b>${t.who}:</b> ${t.speak}`;
  const cards = WISHES.map((id, i) => { const s = wishState(ctx, id), [iw, ih] = ICON_PX[id];
    return `<button type="button" class="dr-w${i === ST.sel ? ' sel' : ''}" data-w="${id}"${s.off ? ' disabled' : ''} title="${t.w[id][1]}"><img class="dr-n" src="${UIP}badge${i + 1}.png" alt="${i + 1}">`
      + `<span class="fr"><img src="${UIP}${ICON[id]}" width="${iw * k}" height="${ih * k}" alt=""></span><b>${t.short[id]}</b>${s.note ? `<em>${s.note}</em>` : ''}</button>`; }).join('');
  ST.el.innerHTML = `<div class="dr-cards">${cards}</div><div class="dr-desc">${ST.sel >= 0 ? descOf(ctx, ST.sel) : ''}</div><button type="button" class="dr-later" data-later="1"><span>${t.later}</span></button>`;
  ST.el.hidden = false; ST.say.hidden = false; ST.el.classList.remove('top'); ST.elH = ST.el.getBoundingClientRect().height;
}
function showConfirm(ctx, id) {
  const t = L(ctx), k = uiK(ctx), [iw, ih] = ICON_PX[id];
  if (!ST.cf) { ST.cf = document.createElement('div'); ST.cf.id = 'dr-confirm'; document.body.appendChild(ST.cf);
    ST.cf.addEventListener('pointerdown', e => { const y = e.target.closest('[data-yes]'), n = e.target.closest('[data-no]'); if (y) { e.preventDefault(); confirmYes(ST.ctx); } else if (n) { e.preventDefault(); confirmBack(ST.ctx); } }); }
  ST.cf.style.setProperty('--k', k);
  ST.cf.innerHTML = `<div class="cf-box"><div class="cf-say"><b>${t.who}:</b> ${t.sure}</div><div class="cf-row"><span class="cf-ic"><img src="${UIP}${ICON[id]}" width="${iw * k}" height="${ih * k}" alt=""></span>`
    + `<span class="cf-tx"><b>${t.w[id][0]}</b><i>${t.w[id][1]}</i></span></div><div class="cf-btns"><button type="button" class="cf-b yes" data-yes="1"><span>${t.yes}</span></button><button type="button" class="cf-b" data-no="1"><span>${t.no}</span></button></div></div>`;
  ST.cf.hidden = false;
}
function hideConfirm() { if (ST.cf) ST.cf.hidden = true; }
function hidePanel() { hideConfirm(); if (ST.el) ST.el.hidden = true; if (ST.say) ST.say.hidden = true; }
function moveSel(ctx, d) {
  if (d) for (let k = 1; k <= WISHES.length; k++) { const i = (ST.sel + d * k + WISHES.length * 3) % WISHES.length; if (!wishState(ctx, WISHES[i]).off) { ST.sel = i; break; } }
  if (ST.el) { ST.el.querySelectorAll('.dr-w').forEach((b, i) => b.classList.toggle('sel', i === ST.sel)); const d2 = ST.el.querySelector('.dr-desc'); if (d2) d2.textContent = ST.sel >= 0 ? descOf(ctx, ST.sel) : ''; }
}

/* ---------------- ngoại hình Chad ---------------- */
function proxy(kind, base) {
  const f = ART.fixed && ART.fixed[kind], mus = ART.fixed && ART.fixed.chad; if (!f || !mus || !base) return null;
  const key = kind; const old = ST.proxies.get(key); if (old && old.__base === base) return old;
  const c = mkCanvas(base.width, base.height); c.getContext('2d').drawImage(base, 0, 0, base.width, base.height); c.__hi = base.__hi;   /* bản sao sheet thường (5 tham số: shim không nhân đôi) */
  const acts = { ...(mus.img.actions || {}) }; if (acts.fish) { acts.cast ||= acts.fish; acts.reel ||= acts.fish; }   /* Chad không có clip vung/giật cần riêng → dùng clip câu */
  if (kind === 'chad_polo') Object.assign(acts, f.img.actions || {});   /* pha áo polo: idle + rip của polo; động tác khác → xé áo ngay (update) */
  c.actions = acts; c.skin = { img: f.img, cw: f.cell[0], ch: f.cell[1], headUp: 9 }; c.__drProxy = kind; c.__base = base;
  ST.proxies.set(key, c); return c;
}
function baseSheet(ctx) { const p = ctx.S.player; if (p && p.sheet && !p.sheet.__drProxy) ST.base = p.sheet; if (!ST.base && ctx.charSheet) ST.base = ctx.charSheet(ctx.S.save.outfit); return ST.base; }
function wantSheet(ctx) { const c = sv(ctx).chad; if (!c.owned || !c.worn) return null; return proxy(c.ripped ? 'chad' : 'chad_polo', baseSheet(ctx)); }
function applySheet(ctx) {
  const p = ctx.S.player; if (!p) return; const want = wantSheet(ctx);
  if (want) { if (p.sheet !== want) p.sheet = want; }
  else if (p.sheet && p.sheet.__drProxy) p.sheet = p.sheet.__base || baseSheet(ctx);
}
function wear(ctx, on, quiet) {
  const c = sv(ctx).chad; if (on && !c.owned) return false;
  c.worn = !!on; c.ripped = false; c.poloT = 0; ST.rip = null;
  const p = ctx.S.player; if (p && p.action && p.action.name === 'rip') p.action = null;
  if (ctx.S.mode === 'chadrip') ctx.setMode('play');
  applySheet(ctx); ctx.persist();
  if (!quiet) ctx.toast(on ? L(ctx).wearOn : L(ctx).wearOff);
  return true;
}
function startRip(ctx, prev, timed) {
  const p = ctx.S.player, sh = p.sheet && p.sheet.actions && p.sheet.actions.rip; if (!sh) { finishRip(ctx); return; }
  if (p.dir === 3) p.dir = 0;
  const dur = sh.n / clipFps('rip', sh) + 0.7;
  p.action = { name: 'rip', t: 0, dur, hold: false, walk: false, loop: false };
  ST.rip = { t: 0, dur, prev: prev && prev.hold ? prev : null, timed: !!timed, popped: false };
  if (timed) { p.moving = false; p.autoPath = null; ctx.setMode('chadrip'); }
  if (ctx.sfx) ctx.sfx('spar_grunt');
}
function finishRip(ctx) {
  const c = sv(ctx).chad, p = ctx.S.player, r = ST.rip; ST.rip = null; c.ripped = true; c.poloT = POLO_SECS; applySheet(ctx);
  if (p.action && p.action.name === 'rip') p.action = null;
  if (r && r.prev) { r.prev.t = 0; p.action = r.prev; }
  if (ctx.S.mode === 'chadrip') ctx.setMode('play');
  ctx.persist();
}
function updChad(dt, ctx) {
  const c = sv(ctx).chad, p = ctx.S.player; if (!p) return;
  applySheet(ctx);
  if (!c.owned || !c.worn || c.ripped) { ST.rip = null; return; }
  if (ST.rip) {
    const r = ST.rip; r.t += dt; if (ctx.hero && ctx.hero.iframes && r.timed) ctx.hero.iframes(0.3);
    if (!r.popped && r.t > 0.45) { r.popped = true; if (ctx.sfx) ctx.sfx('pop'); }
    if (r.timed && (!p.action || p.action.name !== 'rip')) p.action = { name: 'rip', t: 0, dur: r.dur + 1, hold: false, walk: false, loop: false };   /* cảnh xé áo hẹn giờ: giữ clip tới hết */
    if (p.action && p.action.name === 'rip') { p.action.t = Math.min(r.t, r.dur - 0.01); p.action.dur = r.dur + 1; }   /* khung clip theo đồng hồ riêng (không phụ thuộc ai khác tick) */
    if (r.t >= r.dur) finishRip(ctx); return;
  }
  const a = p.action;
  if (a && a.name !== 'idle' && a.name !== 'rip') { startRip(ctx, a, false); return; }   /* làm động tác khác lúc còn áo polo → xé áo ngay */
  if (ctx.S.mode === 'play') { c.poloT = (c.poloT || 0) + dt; if (c.poloT >= POLO_SECS && !p.custom) startRip(ctx, null, true); }
}
function lookHTML(ctx) {
  const c = sv(ctx).chad, t = L(ctx); if (!c.owned) return '';
  return `<h3>${t.look}</h3><div class="mgrid" style="gap:6px"><button class="btn${!c.worn ? ' primary' : ''}" data-look="normal">${t.normal}</button><button class="btn${c.worn ? ' primary' : ''}" data-look="chad"><img class="pxi" src="assets/px/chars/chad_polo/rot_south.png" style="height:22px;vertical-align:middle;image-rendering:pixelated" alt=""> ${t.chad}</button></div>`;
}

/* ---------------- chiêu Rồng Thần Giáng ---------------- */
const skillLeft = ctx => Math.max(0, Math.ceil(((sv(ctx).skillAt || 0) - Date.now()) / 1000));
function useSkill(ctx) {
  const d = sv(ctx), t = L(ctx); if (!d.got.skill || ST.dive || ST.sc || ctx.S.mode !== 'play') return false;
  const left = skillLeft(ctx); if (left > 0) { ctx.toast(t.cd(left)); if (ctx.sfx) ctx.sfx('fail'); return false; }
  const cam = ctx.cam || { cx: ctx.S.player.x - ctx.VW / 2, cy: ctx.S.player.y - ctx.VH / 2 }, VW = ctx.VW, VH = ctx.VH;
  const list = (ctx.monsters && ctx.monsters.list ? ctx.monsters.list() : []).filter(mo => mo.hp > 0 && mo.x >= cam.cx - 8 && mo.x <= cam.cx + VW + 8 && mo.y >= cam.cy - 8 && mo.y <= cam.cy + VH + 24);
  d.skillAt = Date.now() + SKILL_CD * 1000; ctx.persist();
  ST.dive = { t: 0, hits: list.map(mo => ({ mo, at: 0.3 + 0.45 * Math.max(0, Math.min(1, (mo.x - cam.cx) / VW)), done: false })) };
  ctx.toast(list.length ? t.cast : t.cast + ' — ' + t.none, true); if (ctx.sfx) ctx.sfx('roar_big'); ctx.quake(0.3);
  return true;
}
function updDive(dt, ctx) {
  const dv = ST.dive; dv.t += dt; const p = ctx.S.player;
  const atk = ctx.hero ? ctx.hero.atk : 30, dmg = Math.max(80, Math.round(atk * 5));
  for (const h of dv.hits) if (!h.done && dv.t >= h.at) {
    h.done = true; const mo = h.mo, list = ctx.monsters && ctx.monsters.list ? ctx.monsters.list() : [];
    if (!list.includes(mo) || mo.hp <= 0) continue;
    ST.fx.push({ name: 'dr_hit', x: mo.x, y: mo.y + 1, t: 0 }); if (ctx.sfx) ctx.sfx('slam');
    try { ctx.monsters.damage(mo, dmg, p, 0.5, 70, true); } catch (e) { console.error('dragon dive', e); }
  }
  if (dv.t > 1.5) ST.dive = null;
}
function drawDive(g, ctx) {
  const dv = ST.dive, img = IMG.dragon_spirit; if (!dv || !img) return;
  const W = img.width / HI(), H = img.height / HI(), k = Math.min(1, dv.t / 1.0), VW = ctx.VW, VH = ctx.VH;
  const pos = q => ({ x: Math.round(-W + q * (VW + W * 1.2)), y: Math.round(-H + q * (VH + H * 0.6)) });
  if (dv.t > 1.1) return;
  for (const [dq, al] of [[-0.12, 0.25], [-0.06, 0.45], [0, 1]]) { const q = k + dq; if (q < 0) continue; const ps = pos(q); g.save(); g.globalAlpha = al; g.drawImage(img, 0, 0, W, H, ps.x, ps.y, W, H); g.restore(); }
}
function syncBtn(ctx) {
  if (typeof document === 'undefined') return;
  const d = sv(ctx), show = !!d.got.skill && ctx.S.mode === 'play' && !ST.sc;
  if (!ST.btn) {
    if (!show) return; css();
    const b = document.createElement('button'); b.id = 'btn-dragon'; b.type = 'button'; b.title = 'Rồng Thần Giáng (G)';
    b.innerHTML = '<img src="assets/px/dragon/skill_icon.png" alt=""><b></b><i>G</i>'; document.body.appendChild(b); ST.btn = b;
    b.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); if (ST.ctx) useSkill(ST.ctx); });
  }
  const left = skillLeft(ctx), sig = show + '|' + left; if (sig === ST.btnSig) return; ST.btnSig = sig;
  ST.btn.hidden = !show; ST.btn.classList.toggle('cd', left > 0); ST.btn.querySelector('b').textContent = left > 0 ? String(left) : '';
}

/* ---------------- lệnh chat ---------------- */
const fold = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
function chatHook(s) { const f = fold(s); if (/^(oi )?(goi|keu|trieu hoi) rong( than)?( oi)?$|^summon( the)?( divine)? dragon$|^shenron$/.test(f)) { const ctx = ST.ctx; if (ctx) summon(ctx); return true; } return false; }

export const dragon = {
  id: 'dragon', always: true,
  onZoneEnter(ctx) {
    ST.ctx = ctx; loadAll(); ST.fx.length = 0; ST.dive = null; ST.base = null;
    if (!(ctx.chatHooks ||= []).includes(chatHook)) ctx.chatHooks.push(chatHook);
    ctx.registerCloser('dragon', () => { if (ST.sc && ST.sc.ph === 'ask') { if (ST.sc.confirm) confirmBack(ctx); else choose(ctx, null); } });
    ctx.registerCloser('chadrip', () => { });
    ctx.dragon = { summon: () => summon(ctx), hasAll: () => hasAll(ctx), label: () => L(ctx).call, wear: on => wear(ctx, on), worn: () => !!sv(ctx).chad.worn, lookHTML: () => lookHTML(ctx), useSkill: () => useSkill(ctx) };
    applySheet(ctx);
    if (typeof window !== 'undefined') window.__dragon = {
      state: () => { const d = sv(ctx), sc = ST.sc, p = ctx.S.player; return { ph: sc ? sc.ph : null, t: sc ? +sc.t.toFixed(2) : 0, mode: ctx.S.mode, balls: ballCount(ctx), roadBalls: (((ctx.S.save.sys || {}).road || {}).balls || []).slice(), got: { ...d.got }, treasure: d.treasure, summons: d.summons,
        chad: { ...d.chad }, sheet: p && p.sheet ? p.sheet.__drProxy || 'normal' : null, act: p && p.action ? p.action.name : null, rip: ST.rip ? { t: +ST.rip.t.toFixed(2), timed: ST.rip.timed } : null,
        skillLeft: skillLeft(ctx), dive: ST.dive ? { t: +ST.dive.t.toFixed(2), n: ST.dive.hits.length } : null, panel: !!(ST.el && !ST.el.hidden), stage: ST.stage || null, confirm: (sc && sc.confirm) || null, confirmShown: !!(ST.cf && !ST.cf.hidden), sel: ST.sel, btn: !!(ST.btn && !ST.btn.hidden), camDY: ctx.S.camDY || 0,
        wishes: WISHES.map(id => ({ id, ...wishState(ctx, id) })), imgs: Object.keys(IMG).filter(k => IMG[k]) }; },
      give7: () => { for (const id of BALL_IDS) if (!ctx.bag.count(id)) ctx.bag.add(id, 1); const r = ((ctx.S.save.sys ||= {}).road ||= {}); r.balls = [7, 6, 5, 4, 3, 2, 1]; ctx.persist(); return ballCount(ctx); },
      summon: () => summon(ctx), why: () => blockReason(ctx), choose: id => choose(ctx, id), confirm: () => confirmYes(ctx), back: () => confirmBack(ctx), select: i => selectCard(ctx, i), ff: sec => { if (ST.sc) { ST.sc.t += sec; ST.sc.pt += sec; } },
      wear: on => wear(ctx, on, true), polo: sec => { sv(ctx).chad.poloT = sec; }, skill: () => useSkill(ctx), resetCd: () => { sv(ctx).skillAt = 0; },
      chat: s => chatHook(s),
    };
  },
  onZoneLeave(ctx) {
    if (ST.sc) { restorePlayer(ctx); const sc = ST.sc; if (sc.granted && !['vanish', 'clear'].includes(sc.ph)) scatterBalls(ctx); ST.sc = null; ctx.S.camDY = 0; ctx.S.hideLabels = false; ctx.S.camFree = false; if (typeof document !== 'undefined') document.body.classList.remove('dr-scene'); hidePanel(); if (ctx.S.mode === 'dragon') ctx.setMode('play'); }
    if (ST.rip && ST.rip.timed) finishRip(ctx);
    ST.dive = null; ST.fx.length = 0;
  },
  update(dt, ctx) {
    ST.ctx = ctx;
    if (ST.sc) updScene(dt, ctx);
    updChad(dt, ctx);
    if (ST.dive) updDive(dt, ctx);
    for (const f of ST.fx) f.t += dt; if (ST.fx.length) ST.fx = ST.fx.filter(f => !vfxDone(f.name, f.t));
    syncBtn(ctx);
  },
  key(code, ctx) {
    if (ST.sc && ST.sc.ph === 'ask' && ST.sc.confirm) {   /* hộp xác nhận: Enter = chắc chắn, Esc / Backspace = chọn lại */
      if (code === 'Enter' || code === 'Space' || code === 'KeyE' || code === 'KeyY') { confirmYes(ctx); return true; }
      if (code === 'Backspace' || code === 'KeyN') { confirmBack(ctx); return true; }
      return code !== 'Escape';
    }
    if (ST.sc && ST.sc.ph === 'ask') {
      if (/^Digit[1-5]$/.test(code)) { selectCard(ctx, +code[5] - 1); return true; }
      if (code === 'ArrowUp' || code === 'KeyW' || code === 'ArrowLeft' || code === 'KeyA') { moveSel(ctx, -1); return true; }
      if (code === 'ArrowDown' || code === 'KeyS' || code === 'ArrowRight' || code === 'KeyD') { moveSel(ctx, 1); return true; }
      if (code === 'Enter' || code === 'Space' || code === 'KeyE') { if (ST.sel >= 0) choose(ctx, WISHES[ST.sel]); return true; }
      return false;
    }
    if (ST.sc && ctx.S.mode === 'dragon') return code !== 'Escape';   /* nuốt phím trong cảnh */
    if (code === 'KeyG' && ctx.S.mode === 'play' && sv(ctx).got.skill) { useSkill(ctx); return true; }
    return false;
  },
  draw(g, ctx, cx, cy) {
    if (ST.sc) drawScene(g, ctx, cx, cy);
    for (const f of ST.fx) drawVfx(g, f.name, vfxFrame(f.name, f.t), Math.round(f.x - cx), Math.round(f.y - cy));
    if (ST.dive) drawDive(g, ctx);
  },
};
