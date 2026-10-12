// pet.js — the Rocky pet: a crystal egg found in the Encrypted Core (M9) hatches into a mini Rocky
// that follows you everywhere, fetches sparkles, gets hungry, can be fed, petted and named. See systems/API.md.
// plan-27 (2026-10-11): cấp 1–50 + kinh nghiệm, máu/công/thủ, đánh quái (Đấm · Rocky-ha · Siêu Cấp, 7 bậc), 4 lệnh qua ô chat
// (Bảo vệ mặc định · Tấn công · Đi theo · Về nhà), ổ của Rocky (đất của bạn / bến cảng cạnh Heathcliff), gục → về ổ nghỉ 60 s.
// Số liệu thuần ở petlv.js. Rocky CHỈ nhắm quái (ctx.monsters.list(), bỏ tượng đá) + bạn tập ĐANG đấu (ctx.sparFoe, anh 2026-10-12) — không bao giờ dân, Leader, thú, NPC.
import { mkCanvas, FLAG_COLORS, TS, HOOK } from '../gfx.js';
import { WATER, waterDraw } from '../anim.js';   /* lội nước: che phần dưới như NPC */
import * as LV from './petlv.js';

// ---------------------------------------------------------------- strings
const STR = {
  en: {
    takeEgg: 'Take the core crystal for Rocky', needCrystals: 'Needs 3 crystals to wake it — mine crystals in M9 with Pickaxe II', eggTaken: 'The core crystal hums in your bag — keep walking, Rocky can feel it',
    swam: 'Rocky swam ashore and found you! Lyron asked it to look after you', grown: n => `${n} grew up — a grown Rocky now! It finds rarer things`,
    eggHud: p => `🔮 Core: ${p}%`, hatched: 'A Rocky hatched!', nameTitle: 'A Rocky hatched!', nameHint: 'Give it a name (max 12)',
    renameTitle: 'Rename your Rocky', ok: 'OK', cancel: 'Cancel', named: n => `${n} is now your buddy`, renamed: n => `Renamed to ${n}`,
    takeFrom: n => `Take from ${n}`, feed: n => `Feed ${n}`, pet: n => `Pet ${n}`,
    got: (n, s) => `${n} brought ${s}`, fed: n => `${n} munches happily`, petted: n => `${n} wiggles`,
    hud: (n, lv, c) => `🪨 ${n} Lv ${lv} · ${c}`, hudHome: (n, lv) => `🪨 ${n} Lv ${lv} · at the nest`, hudKo: (n, s) => `🪨 ${n} resting · ${s}s`, hungry: ' · 🍖',
    lv: ['Hatchling', 'Buddy', 'Best friend'], renameKey: 'N · rename',
    cmd: { protect: 'Protect', attack: 'Attack', follow: 'Follow', home: 'Home' },
    say: { protect: 'Got it! Anyone who touches you gets punched!', attack: 'Charge! Every monster in range is mine!', follow: "Right behind you — no fighting.", home: "Heading to my nest. Type 'follow' to call me!", unk: '??' },
    hint: 'Rocky tilts its head… Try: protect · attack · follow · home', far: n => `${n} (at the nest): `, ko: n => `${n} is knocked out — back to the nest to rest`,
    koWait: (n, s) => `${n} is still resting at the nest — ${s}s left`, koDone: n => `${n} is rested! Type "follow" to call it back`, appear: n => `${n} pops out right next to you!`,
    lvUp: (n, l) => `⬆ ${n} reached level ${l}!`, bigger: n => `${n} grew bigger!`, unlock: s => `New skill: ${s}!`,
    superOn: n => `⚡ SUPER ${n.toUpperCase()}!`, superOff: n => `${n} is back to normal`, chatPh: 'Talk to Rocky: protect · attack · follow · home', send: 'Send',
    nestHome: n => `${n}'s nest`, read: (n, s, t) => `${n} read the book — ${s} tier ${t}!`,
  },
  vi: {
    takeEgg: 'Lấy tinh thể Lõi cho Rocky', needCrystals: 'Cần 3 tinh thể để đánh thức — đào tinh thể ở M9 bằng Cuốc II', eggTaken: 'Tinh thể Lõi đang ngân trong túi — cứ đi tiếp, Rocky cảm nhận được',
    swam: 'Rocky bơi vào bờ và tìm thấy bạn! Lyron đã dặn nó trông chừng bạn', grown: n => `${n} đã lớn — giờ là Rocky trưởng thành! Hay mang về đồ hiếm`,
    eggHud: p => `🔮 Tinh thể Lõi: ${p}%`, hatched: 'Một Rocky đã nở!', nameTitle: 'Một Rocky đã nở!', nameHint: 'Đặt tên cho bé (tối đa 12 ký tự)',
    renameTitle: 'Đổi tên Rocky', ok: 'Xong', cancel: 'Hủy', named: n => `${n} giờ là bạn của bạn`, renamed: n => `Đã đổi tên thành ${n}`,
    takeFrom: n => `Nhận từ ${n}`, feed: n => `Cho ${n} ăn`, pet: n => `Vuốt ve ${n}`,
    got: (n, s) => `${n} mang về ${s}`, fed: n => `${n} ăn ngon lành`, petted: n => `${n} ngoáy đuôi`,
    hud: (n, lv, c) => `🪨 ${n} Lv ${lv} · ${c}`, hudHome: (n, lv) => `🪨 ${n} Lv ${lv} · ở ổ`, hudKo: (n, s) => `🪨 ${n} đang nghỉ · ${s}s`, hungry: ' · 🍖',
    lv: ['Rocky con', 'Bạn thân', 'Tri kỷ'], renameKey: 'N · đổi tên',
    cmd: { protect: 'Bảo vệ', attack: 'Tấn công', follow: 'Đi theo', home: 'Về nhà' },
    say: { protect: 'Rõ! Ai đụng bạn là Rocky đấm!', attack: 'Xông lên! Quái nào trong tầm là Rocky xử!', follow: 'Rocky theo bạn, không đánh nhau nữa.', home: "Rocky về ổ nghỉ đây. Gõ 'đi theo' là Rocky tới!", unk: '??' },
    hint: 'Rocky nghiêng đầu… Thử gõ: bảo vệ · tấn công · đi theo · về nhà', far: n => `${n} (ở ổ): `, ko: n => `${n} bị đánh gục — về ổ nghỉ một lát`,
    koWait: (n, s) => `${n} còn đang nghỉ ở ổ — ${s} giây nữa`, koDone: n => `${n} khỏe lại rồi! Gõ "đi theo" để gọi`, appear: n => `${n} xuất hiện ngay cạnh bạn!`,
    lvUp: (n, l) => `⬆ ${n} lên cấp ${l}!`, bigger: n => `${n} lớn hơn rồi!`, unlock: s => `Chiêu mới: ${s}!`,
    superOn: n => `⚡ SIÊU CẤP ${n.toUpperCase()}!`, superOff: n => `${n} trở lại dạng thường`, chatPh: 'Nói với Rocky: bảo vệ · tấn công · đi theo · về nhà', send: 'Gửi',
    nestHome: n => `Ổ của ${n}`, read: (n, s, t) => `${n} đọc sách — ${s} lên bậc ${t}!`,
  }
};
const L = ctx => STR[ctx.lang() === 'vi' ? 'vi' : 'en'];
const isVi = ctx => ctx.lang() === 'vi';
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// ---------------------------------------------------------------- tuning
const HATCH_TILES = 400;          // tiles walked before the egg hatches
const FOLLOW_MIN = 20, FOLLOW_MAX = 28;
const PLAYER_SPEED = 84;          // entities.js Player
const PET_SPEED = PLAYER_SPEED * 1.1;
const TELEPORT_PX = 8 * TS;
const HUNGER_EVERY = 60;          // s of play per hunger point
const HUNGRY_AT = 30;
const FEED_AMOUNT = 40;
const FOODS = ['berry', 'egg', 'meat', 'mushroom', 'honey'];
const PET_CD = 20;
const FETCH_MIN = 40, FETCH_MAX = 70, FETCH_RANGE = 6;
const MATERIALS = ['wood', 'rock', 'leaf', 'flower', 'berry', 'shell'];
const DIRV = [[0, 1], [-1, 0], [1, 0], [0, -1]];   // player dir: 0 down, 1 left, 2 right, 3 up
const TAU = Math.PI * 2;
const bondLevel = b => b >= 15 ? 2 : b >= 5 ? 1 : 0;
/* plan-27: chiến đấu */
const LEASH = 150;                 /* Rocky không rời người chơi quá xa khi đánh */
const ATTACK_R = 120;              /* lệnh Tấn công: quái trong tầm này quanh người chơi */
const REACH = 14;                  /* tầm đấm */
const THREAT_T = 6;                /* giây: quái vừa đánh bạn / Rocky còn tính là 'kẻ tấn công' */
const MON_HIT_CD = 1.4;            /* quái đánh trả Rocky */

// ---------------------------------------------------------------- save
function sv(ctx) {
  const s = ctx.S.save; s.sys = s.sys || {};
  const p = (s.sys.pet = s.sys.pet || {});
  if (p.pet) {
    if (typeof p.pet.hunger !== 'number') p.pet.hunger = 100; if (typeof p.pet.bond !== 'number') p.pet.bond = 0; if (!p.pet.name) p.pet.name = 'Rocky';
    if (!p.pet.lvMig) LV.migrate(p.pet);   /* plan-27: save cũ — độ thân quy ra kinh nghiệm khởi điểm */
    if (!p.pet.skills) p.pet.skills = { punch: 1, ha: 0, super: 0 };
    if (!LV.CMDS.includes(p.pet.cmd)) p.pet.cmd = 'protect';
  }
  if (p.egg && typeof p.egg.walked !== 'number') p.egg.walked = 0;
  return p;
}
const petOf = ctx => sv(ctx).pet || null;
const lvOf = pt => LV.levelFromXp(pt.xp || 0).lv;
function statsOf(pt) {
  const lv = lvOf(pt), sup = (pt.superT || 0) > 0, st = LV.superOf(Math.max(1, LV.tierOf(pt, 'super')));
  return { lv, max: LV.maxHpOf(lv), atk: Math.round(LV.atkOf(lv) * (sup ? st.atk : 1)), def: Math.round(LV.defOf(lv) * (sup ? st.def : 1)), spd: sup ? st.spd : 1, sup };
}

// ---------------------------------------------------------------- sprites (cached)
const px = (g, x, y, c, w = 1, h = 1) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
const RP = { body: '#f2a081', shade: '#d97c5c', light: '#f8bfa6', out: '#5a3222' };
const PINK = ['#ff5aa5', '#ffd6ea'];
const spriteCache = new Map();   // key → [stand, walkA, walkB, sit] canvases (12×14, facing right, no eyes)

// frame: 0 stand, 1 walk A, 2 walk B, 3 sit. Eyes are drawn live (blink / facing).
function rockyFrame(g, frame, scarf) {
  const sit = frame === 3, dy = sit ? 2 : 0;
  const box = (x, y, w, h, c = RP.body) => { px(g, x - 1, y - 1, RP.out, w + 2, h + 2); px(g, x, y, c, w, h); };
  if (!sit) {
    const la = frame === 1 ? 1 : 0, lb = frame === 2 ? 1 : 0;
    box(3, 12 - la, 2, 1, RP.shade); box(7, 12 - lb, 2, 1, RP.shade);
  }
  box(4, 8 + dy, 4, sit ? 2 : 3); px(g, 4, 8 + dy, RP.shade, 4, 1);
  const fh = sit ? 3 : 4;
  box(1, 8 + dy, 2, fh); box(9, 8 + dy, 2, fh);
  px(g, 1, 10 + dy, RP.shade, 2, 1); px(g, 9, 10 + dy, RP.shade, 2, 1);
  px(g, 1, 8 + dy, RP.light, 1, 1); px(g, 9, 8 + dy, RP.light, 1, 1);
  box(2, 1 + dy, 8, 7);
  for (const [cx, cy] of [[1, dy], [10, dy], [1, 8 + dy], [10, 8 + dy]]) g.clearRect(cx, cy, 1, 1);
  px(g, 2, 1 + dy, RP.shade, 8, 1); px(g, 3, 2 + dy, RP.light, 2, 1);
  if (scarf) {
    px(g, 3, 8 + dy, RP.out, 6, 1);
    px(g, 3, 8 + dy, scarf[0], 6, 1);
    if (scarf[1]) px(g, 5, 8 + dy, scarf[1], 2, 1);
    px(g, 8, 9 + dy, RP.out, 2, 2); px(g, 8, 9 + dy, scarf[0], 1, 2); px(g, 9, 9 + dy, scarf[1] || scarf[0], 1, 1);
  }
}
function flipC(src) { const c = mkCanvas(src.width, src.height), g = c.getContext('2d'); g.translate(src.width, 0); g.scale(-1, 1); g.drawImage(src, 0, 0); return c; }
function frames(scarf) {
  const key = scarf ? scarf.join(',') : '-';
  if (spriteCache.has(key)) return spriteCache.get(key);
  const hk = HOOK.petFrames && HOOK.petFrames(scarf);   // ảnh PixelLab (art.js) nếu có — đã có mắt sẵn (set.px = true)
  const set = hk || [0, 1, 2, 3].map(f => { const c = mkCanvas(12, 14); rockyFrame(c.getContext('2d'), f, scarf); return [c, flipC(c)]; });
  spriteCache.set(key, set); return set;
}
/* plan-27: bộ hình theo cỡ — 'rockypet' (gốc), 'rockybig' (cấp 5+), 'rockysup' (Siêu Cấp). Mỗi bộ: <pre> ngang [đứng, bước A, bước B, ngồi] ·
   <pre>_ds xuống · <pre>_dn lên · <pre>_hop · <pre>_punch_e/_s/_n · <pre>_ha_e/_s/_n (gồng Rocky-ha). Ảnh PixelLab ở gói village (creatures), vẽ 1:1. */
const PRE = ['rockypet', 'rockybig', 'rockysup'];
function cre(ctx, name) { const vp = ctx.ART && ctx.ART.packs && ctx.ART.packs.village, c = vp && vp.creatures && vp.creatures[name]; return c && c.length ? c : null; }
function setPre(ctx, pt) { const k = pt.superT > 0 ? 2 : LV.sizeStage(lvOf(pt)); for (let i = k; i >= 0; i--) if (i === 0 || cre(ctx, PRE[i])) return i; return 0; }

// the crystal egg map object: pink faceted egg in a small crystal nest, with a soft glow baked in
function eggArt(g) {
  g.fillStyle = 'rgba(255,90,165,.18)'; g.beginPath(); g.ellipse(8, 10, 7.5, 5, 0, 0, TAU); g.fill();
  g.fillStyle = 'rgba(0,0,0,.28)'; g.beginPath(); g.ellipse(8, 14, 5, 2, 0, 0, TAU); g.fill();
  px(g, 3, 12, '#2a1a44', 10, 2); px(g, 2, 13, '#3d2a63', 3, 1); px(g, 11, 13, '#3d2a63', 3, 1); px(g, 4, 11, '#5a3fa8', 2, 1); px(g, 10, 11, '#5a3fa8', 2, 1);
  const rows = [[7, 2], [6, 4], [5, 6], [4, 8], [4, 8], [4, 8], [4, 8], [5, 6], [6, 4]];
  rows.forEach(([x, w], i) => px(g, x - 1, 3 + i, '#7a2a5a', w + 2, 1));
  px(g, 6, 2, '#7a2a5a', 4, 1); px(g, 5, 12, '#7a2a5a', 6, 1);
  rows.forEach(([x, w], i) => px(g, x, 3 + i, '#ff7fc0', w, 1));
  px(g, 5, 6, '#ff5aa5', 2, 3); px(g, 9, 5, '#ff5aa5', 2, 2); px(g, 7, 9, '#e0408a', 3, 2); px(g, 4, 9, '#e0408a', 2, 1);
  px(g, 6, 4, '#ffd6ea', 2, 2); px(g, 9, 8, '#ffd6ea', 1, 1); px(g, 7, 3, '#ffffff', 1, 1);
}
let eggDefined = false;
function defineEgg(ctx) { if (!eggDefined) { ctx.defineObject('crystal_egg', 16, 16, 1, 1, eggArt, { solid: false }); eggDefined = true; } }

// ---------------------------------------------------------------- module state
const ST = {
  ent: null,            // { x, y, dir(1 right / -1 left), fr, ft, state, hop, ghost, blocked, sit, blink, blinkT, bounceT, tx, ty }
  eggObj: null,         // the placed egg object in this zone
  lastP: null,          // last player position (walk tracking)
  fx: [],               // particles: hearts, notes, dust
  sparkle: null,        // { x, y, t } world px
  fetchT: 0,            // countdown to the next sparkle
  holding: null,        // { id, n } the pet carries back
  idleT: 0, petCd: 0, hungerAcc: 0, persistT: 0,
  panelEl: null, closerSet: false, naming: false, digT: 0,
  /* plan-27 */
  nest: null,           // { x, y } px của ổ trong vùng này (null = ổ ở vùng khác)
  tgt: null, punchCd: 0, combo: 0, hitQ: [], haCd: 0, beam: null, bubble: null, regenT: 0, lastHurtT: -99, cine: null, chatEl: null, chatBtn: null, chatOpen: false,
  pops: [],             // số bay (lên cấp)
  stats: { punches: 0, kills: 0, beams: 0, supers: 0, hurt: 0, log: [] },
};
const tileOf = v => Math.floor(v / TS);
function passable(ctx, x, y) {   // 8×4 feet box, same tile rule as the player's default
  const map = ctx.S.map;
  for (const [ox, oy] of [[-4, -4], [3, -4], [-4, -1], [3, -1]]) if (ctx.isSolid(map, tileOf(x + ox), tileOf(y + oy))) return false;
  return true;
}
function freeNear(ctx, x, y) {   // nearest walkable px spot around (x,y)
  if (passable(ctx, x, y)) return { x, y };
  for (let r = 8; r <= 48; r += 8) for (let a = 0; a < TAU; a += TAU / 8) { const nx = x + Math.cos(a) * r, ny = y + Math.sin(a) * r; if (passable(ctx, nx, ny)) return { x: nx, y: ny }; }
  return { x, y };
}
function behindPoint(ctx, d = 24) {
  const p = ctx.S.player, [vx, vy] = DIRV[p.dir & 3];
  return { x: p.x - vx * d, y: p.y - vy * d };
}
function spawnEnt(ctx) {
  const p = ctx.S.player, bp = behindPoint(ctx, 16), b = freeNear(ctx, bp.x, bp.y);
  ST.ent = { x: b.x, y: b.y, dir: p.dir === 1 ? -1 : 1, fr: 0, ft: 0, state: 'follow', hop: 0, ghost: 0, blocked: 0, sit: false, blink: 0, blinkT: 2, bounceT: 6, moving: false };
  return ST.ent;
}
function teleport(ctx) { const bp = behindPoint(ctx, 16), b = freeNear(ctx, bp.x, bp.y); ST.ent.x = b.x; ST.ent.y = b.y; ST.ent.blocked = 0; ST.ent.ghost = 0; }

// ---------------------------------------------------------------- particles
function hearts(x, y, n = 6) {
  for (let i = 0; i < n; i++) ST.fx.push({ k: 'heart', x: x + (Math.random() - 0.5) * 14, y: y - 8 - Math.random() * 6, vx: (Math.random() - 0.5) * 8, vy: -14 - Math.random() * 12, t: 0.9 + Math.random() * 0.4, life: 1.3, c: Math.random() < 0.5 ? '#ff5aa5' : '#ff8fc8' });
}
function note(x, y) { ST.fx.push({ k: 'note', x: x + 5, y: y - 16, vx: 4, vy: -12, t: 0.9, life: 0.9 }); }
function dust(x, y, n = 6) {
  for (let i = 0; i < n; i++) ST.fx.push({ k: 'dust', x: x + (Math.random() - 0.5) * 8, y: y - 1, vx: (Math.random() - 0.5) * 40, vy: -18 - Math.random() * 20, g: 90, t: 0.35 + Math.random() * 0.25, life: 0.6, c: Math.random() < 0.5 ? '#6b5a78' : '#a898b8' });
}
function updateFx(dt) {
  for (let i = ST.fx.length - 1; i >= 0; i--) {
    const p = ST.fx[i]; p.t -= dt;
    if (p.t <= 0) { ST.fx.splice(i, 1); continue; }
    p.x += p.vx * dt; p.y += p.vy * dt; if (p.g) p.vy += p.g * dt;
    if (p.k === 'heart') p.x += Math.sin(p.t * 9) * 6 * dt;
  }
  if (ST.fx.length > 60) ST.fx.splice(0, ST.fx.length - 60);
  for (let i = ST.pops.length - 1; i >= 0; i--) { const q = ST.pops[i]; q.t -= dt; q.y -= 14 * dt; if (q.t <= 0) ST.pops.splice(i, 1); }
}
function drawHeart(g, x, y, c) { px(g, x, y, c, 2, 1); px(g, x + 3, y, c, 2, 1); px(g, x, y + 1, c, 5, 1); px(g, x + 1, y + 2, c, 3, 1); px(g, x + 2, y + 3, c, 1, 1); }
const vfx1 = (ctx, name, x, y, fb, top) => { if (!ctx.vfx) return false; if (ctx.vfx(name, x, y, 0, !!top)) return true; return fb ? ctx.vfx(fb, x, y, 0, !!top) : false; };

// ---------------------------------------------------------------- egg
function placeEgg(ctx) {
  const s = sv(ctx), map = ctx.S.map; ST.eggObj = null;
  if (s.egg || s.eggTaken || (s.pet && s.pet.grown)) return;
  defineEgg(ctx);
  const ok = (x, y) => x > 2 && y > 2 && x < map.w - 3 && y < map.h - 3 && !ctx.isSolid(map, x, y) && !ctx.hasObjectAt(map, x, y);
  let at = s.eggAt && ok(s.eggAt.x, s.eggAt.y) ? s.eggAt : null;
  if (!at) {
    const cx = map.w >> 1, cy = map.h >> 1, rng = ctx.rngFrom(ctx.hashStr('pet-egg') ^ 0x77);
    for (let r = 2; r <= 14 && !at; r += 2) {
      const c = ctx.freeTiles(map, rng, { x: cx - r, y: cy - r, w: r * 2 + 1, h: r * 2 + 1 }, 1, Object.values(map.entries), 3, 1);
      if (c.length && ok(c[0].x, c[0].y)) at = { x: c[0].x, y: c[0].y };
    }
    if (!at) return;
    s.eggAt = at; ctx.persist();
  }
  ST.eggObj = ctx.place(map, 'crystal_egg', at.x, at.y, { petEgg: true });
}
function takeEgg(ctx) {
  const t = L(ctx), s = sv(ctx);
  if (!ctx.bag.has('crystal', 3)) { ctx.toast(t.needCrystals); ctx.sfx('fail'); return; }
  ctx.bag.remove('crystal', 3);
  if (ST.eggObj) { ctx.removeObject(ctx.S.map, ST.eggObj); ST.eggObj = null; }
  s.egg = { warmth: 0, walked: 0 }; s.eggTaken = true;
  ctx.sfx('pickup'); ctx.toast(t.eggTaken, true); ctx.persist();
  hearts(ctx.S.player.x, ctx.S.player.y - 10, 4);
}
function newPet(extra) { const p = { name: 'Rocky', hunger: 100, bond: 0, born: Date.now(), xp: 0, cmd: 'protect', skills: { punch: 1, ha: 0, super: 0 }, lvMig: 1, ...extra }; p.hp = LV.maxHpOf(1); return p; }
function hatch(ctx) {
  const t = L(ctx), s = sv(ctx);
  if (s.pet) { grow(ctx); return; }   /* plan-23 D: Rocky đã đi cùng từ đầu game → tinh thể Lõi làm Rocky lớn lên */
  s.egg = null; s.eggTaken = true;
  s.pet = newPet();
  const sav = ctx.S.save; sav.achievements = sav.achievements || []; if (!sav.achievements.includes('pet')) sav.achievements.push('pet');
  ctx.persist();
  spawnEnt(ctx); hearts(ST.ent.x, ST.ent.y, 8); dust(ST.ent.x, ST.ent.y, 8);
  ctx.sfx('rocky_happy'); ctx.toast(t.hatched, true);
  openName(ctx, false);
}

/* plan-23 D: Rocky đi cùng Lyron từ đầu game. Gặp Lyron trên biển → có Rocky; save cũ đã qua hồi 1 mà chưa có → Rocky bơi vào bờ tìm bạn. */
function giveRocky(ctx, swamIn) {
  const s = sv(ctx); if (s.pet) return;
  s.pet = newPet({ withLyron: true });
  const sav = ctx.S.save; sav.achievements = sav.achievements || []; if (!sav.achievements.includes('pet')) sav.achievements.push('pet');
  ctx.persist(); spawnEnt(ctx); hearts(ST.ent.x, ST.ent.y, 6);
  if (swamIn) { ctx.toast(L(ctx).swam, true); ctx.sfx('splash'); dust(ST.ent.x, ST.ent.y, 8); }
}
function grow(ctx) {   /* tinh thể Lõi M9: Rocky trưởng thành — plan-27: ít nhất cấp 5 (dáng lớn PixelLab, không phóng ảnh) */
  const t = L(ctx), s = sv(ctx); s.egg = null; s.eggTaken = true; s.pet.grown = true; s.pet.bond = Math.max(s.pet.bond, 60);
  const need = LV.xpForLevel(5); if ((s.pet.xp || 0) < need) gainXp(ctx, need - (s.pet.xp || 0), true);
  ctx.persist();
  if (ST.ent) { hearts(ST.ent.x, ST.ent.y, 10); dust(ST.ent.x, ST.ent.y, 10); if (ctx.vfx) ctx.vfx('level_up', ST.ent.x, ST.ent.y + 2, 0, true); }
  ctx.sfx('rocky_happy'); ctx.toast(t.grown(s.pet.name), true);
}

// ---------------------------------------------------------------- naming panel (mode 'petname')
function openName(ctx, rename) {
  const t = L(ctx), s = sv(ctx); if (!s.pet) return;
  const cur = rename ? s.pet.name : 'Rocky';
  const html = `<h2>🪨 ${esc(rename ? t.renameTitle : t.nameTitle)}</h2><p class="dim">${esc(t.nameHint)}</p>
    <input id="pet-nm" maxlength="12" value="${esc(cur)}" autocomplete="off" spellcheck="false">
    <div style="display:flex;gap:8px"><button class="btn primary" id="pet-ok" style="margin:6px 0">${esc(t.ok)}</button>${rename ? `<button class="btn" id="pet-cancel" style="margin:6px 0">${esc(t.cancel)}</button>` : ''}</div>`;
  ST.panelEl = ctx.panel('petname', html); ST.panelEl.hidden = false; ST.naming = true;
  const el = ST.panelEl.panel, inp = el.querySelector('#pet-nm');
  const done = () => confirmName(ctx, inp.value, rename);
  el.querySelector('#pet-ok').onclick = done;
  const cancel = el.querySelector('#pet-cancel'); if (cancel) cancel.onclick = () => closeName(ctx);
  inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); done(); } });
  ctx.setMode('petname');
  ctx.onAction('petname', done);
  if (!ST.closerSet) { ctx.registerCloser('petname', () => closeName(ctx)); ST.closerSet = true; }
  setTimeout(() => { try { inp.focus(); inp.select(); } catch (e) { } }, 60);
}
function confirmName(ctx, raw, rename) {
  const t = L(ctx), s = sv(ctx);
  const name = String(raw || '').trim().slice(0, 12) || 'Rocky';
  if (s.pet) { s.pet.name = name; ctx.persist(); ctx.toast(rename ? t.renamed(name) : t.named(name)); }
  closeName(ctx);
}
function closeName(ctx) {
  ST.naming = false;
  if (ST.panelEl) ST.panelEl.hidden = true;
  if (ctx.S.mode === 'petname') ctx.setMode('play');
}

// ---------------------------------------------------------------- fetch
function spawnSparkle(ctx) {
  const p = ctx.S.player, map = ctx.S.map;
  for (let i = 0; i < 30; i++) {
    const a = Math.random() * TAU, r = (2 + Math.random() * (FETCH_RANGE - 2)) * TS;
    const x = p.x + Math.cos(a) * r, y = p.y + Math.sin(a) * r, tx = tileOf(x), ty = tileOf(y);
    if (tx < 2 || ty < 2 || tx >= map.w - 2 || ty >= map.h - 2) continue;
    if (ctx.isSolid(map, tx, ty) || ctx.hasObjectAt(map, tx, ty)) continue;
    if (!passable(ctx, tx * TS + 8, ty * TS + 12)) continue;
    ST.sparkle = { x: tx * TS + 8, y: ty * TS + 12, t: 0, life: 30 };
    if (ST.ent) { ST.ent.state = 'fetch'; ST.ent.sit = false; }
    return true;
  }
  return false;
}
function rollLoot() {
  const r = Math.random();
  if (rollLoot.grown && r < 0.12) return { id: ['crystal', 'pearl', 'seagem'][(Math.random() * 3) | 0], n: 1 };   /* Rocky trưởng thành: hay mang về đồ hiếm */
  if (r < 0.60) return { id: 'stone', n: 1 + (Math.random() < 0.5 ? 1 : 0) };
  if (r < 0.95) return { id: MATERIALS[(Math.random() * MATERIALS.length) | 0], n: 1 };
  return { id: 'pearl', n: 1 };
}
function cancelFetch() { ST.sparkle = null; if (ST.ent && (ST.ent.state === 'fetch' || ST.ent.state === 'dig')) ST.ent.state = 'follow'; }
function giveLoot(ctx) {
  const t = L(ctx), s = sv(ctx), h = ST.holding; if (!h || !s.pet) return;
  const got = ctx.give(h.id, h.n, ST.ent ? ST.ent.x : undefined, ST.ent ? ST.ent.y : undefined);   /* plan-24: Rocky đặt đồ xuống đất */
  if (got <= 0) return;
  ST.holding = null; s.pet.bond += 1; ctx.persist();
  ctx.sfx('rocky_chirp'); ctx.toast(t.got(s.pet.name, `+${got} ${ctx.itemIcon(h.id)} ${ctx.itemName(h.id)}`));
  hearts(ST.ent.x, ST.ent.y, 3);
}

// ---------------------------------------------------------------- level / XP (plan-27)
function gainXp(ctx, n, quiet) {
  const pt = petOf(ctx); if (!pt || n <= 0) return;
  const before = lvOf(pt); pt.xp = Math.round((pt.xp || 0) + n); const after = lvOf(pt);
  if (after > before) {
    const t = L(ctx); pt.hp = LV.maxHpOf(after);
    const e = ST.ent; if (e) { ST.pops.push({ x: e.x, y: e.y - 22, t: 1.6, txt: `Lv ${after}!`, c: '#ffd45e' }); hearts(e.x, e.y, 6); vfx1(ctx, 'level_up', e.x, e.y + 2, null, true); }
    ctx.sfx('rocky_happy'); if (!quiet) ctx.toast(t.lvUp(pt.name, after), true);
    if (LV.sizeStage(before) === 0 && LV.sizeStage(after) === 1) { if (e) dust(e.x, e.y, 10); setTimeout(() => ctx.toast(t.bigger(pt.name)), 900); }
    for (const id of LV.SKILL_IDS) if (before < LV.SKILLS[id].unlock && after >= LV.SKILLS[id].unlock) { const S2 = LV.SKILLS[id]; setTimeout(() => ctx.toast(t.unlock(isVi(ctx) ? S2.vi : S2.en), true), 1600); }
  }
  ctx.persist();
}

// ---------------------------------------------------------------- feeding / petting
function foodInBag(ctx) { if (ctx.held) { const h = ctx.held(); return FOODS.includes(h) && ctx.bag.has(h, 1) ? h : null; } return FOODS.find(id => ctx.bag.has(id, 1)) || null; }   /* plan-20: món đang CẦM */
function feed(ctx) {
  const t = L(ctx), s = sv(ctx), id = foodInBag(ctx); if (!s.pet || !id) return false;
  ctx.bag.remove(id, 1);
  s.pet.hunger = Math.min(100, s.pet.hunger + FEED_AMOUNT); s.pet.bond += 1;
  const st = statsOf(s.pet); s.pet.hp = Math.min(st.max, (s.pet.hp ?? st.max) + Math.round(st.max * 0.3));   /* ăn → hồi 30 % máu */
  gainXp(ctx, LV.XP_FEED); ctx.persist();
  if (ST.ent) { hearts(ST.ent.x, ST.ent.y, 7); note(ST.ent.x, ST.ent.y); ST.ent.hop = 0.45; }
  ctx.sfx('eat'); ctx.toast(t.fed(s.pet.name));
  return true;
}
function petIt(ctx) {
  const t = L(ctx), s = sv(ctx); if (!s.pet || ST.petCd > 0) return;
  s.pet.bond = Math.round((s.pet.bond + 0.2) * 10) / 10; ST.petCd = PET_CD; gainXp(ctx, LV.XP_PET); ctx.persist();
  if (ST.ent) { hearts(ST.ent.x, ST.ent.y, 5); ST.ent.hop = 0.4; }
  ctx.sfx('rocky_chirp'); ctx.toast(t.petted(s.pet.name));
}
function scarfFor(ctx) {
  const s = sv(ctx); if (!s.pet || bondLevel(s.pet.bond) < 2) return null;
  const self = ctx.S.save.self, id = self && (typeof self === 'object' ? self.id : self);
  const m = id != null && ctx.byId ? ctx.byId.get(id) : null;
  const n = m ? ctx.nationOf(m) : null;
  return (n && FLAG_COLORS[n.key]) || PINK;
}

// ---------------------------------------------------------------- home nest (plan-27)
/* ổ: trên mảnh đất đầu tiên của bạn (save.lands[vùng]); chưa có đất → bãi cát bến cảng (vùng Biển, cạnh chỗ Heathcliff đứng) */
function homeOf(ctx) {
  const s = ctx.S.save, lands = s.lands || {};
  for (const z of Object.keys(lands)) { const l = (lands[z] || [])[0]; if (l) return { zone: z, tx: l.x, ty: l.y + (l.h || 6) - 1, land: true }; }
  const n = sv(ctx).nestSea; return { zone: 'sea', tx: n ? n.x : null, ty: n ? n.y : null, land: false };
}
function findNest(ctx) {   /* gọi khi vào vùng: tính chỗ ổ trong vùng này (px) hoặc null */
  ST.nest = null; const m = ctx.S.map, z = ctx.S.zone && ctx.S.zone.id, h = homeOf(ctx); if (!m || h.zone !== z) return;
  let tx = h.tx, ty = h.ty;
  if (!h.land) {   /* bến cảng: ô cát trống sát chân cầu tàu (Heathcliff đứng ở dock+(2,2)) */
    const d = m.dock; if (!d) return;
    const ok = (x, y) => x > 1 && y > 1 && x < m.w - 2 && y < m.h - 2 && !ctx.isSolid(m, x, y) && !ctx.hasObjectAt(m, x, y);
    if (tx == null || !ok(tx, ty)) { tx = null; for (const [dx, dy] of [[-2, 2], [-2, 3], [-3, 2], [4, 3], [4, 2], [-1, 3], [1, 3], [-3, 3], [5, 3]]) if (ok(d.x + dx, d.y + dy)) { tx = d.x + dx; ty = d.y + dy; break; } }
    if (tx == null) return; sv(ctx).nestSea = { x: tx, y: ty };
  }
  ST.nest = { x: tx * TS + 8, y: ty * TS + 13, tx, ty };
}
const isHome = pt => pt.cmd === 'home' || (pt.koT || 0) > 0;

/* ---------------------------------------------------------------- commands (plan-27) */
function say(ctx, text, secs = 2.6) {
  const pt = petOf(ctx); if (!pt) return;
  if (ST.ent) ST.bubble = { text, t: secs };
  else ctx.toast(L(ctx).far(pt.name) + text);
}
function appearNext(ctx) {   /* gọi từ ổ / vùng khác: hiện ngay cạnh người chơi, có hiệu ứng xuất hiện */
  const e = spawnEnt(ctx); e.hop = 0.45; dust(e.x, e.y, 8); hearts(e.x, e.y, 4);
  vfx1(ctx, 'stone_free', e.x, e.y + 2, 'dirt_puff'); ctx.sfx('rocky_happy');
}
function goHome(ctx) {   /* biến về ổ */
  const e = ST.ent; if (e) { dust(e.x, e.y, 8); vfx1(ctx, 'monster_poof', e.x, e.y + 2, 'dirt_puff'); }
  ST.tgt = null; ST.beam = null; ST.hitQ.length = 0; cancelFetch();
  if (ST.nest) { if (!e) spawnEnt(ctx); Object.assign(ST.ent, { x: ST.nest.x, y: ST.nest.y, state: 'home', sit: true, moving: false }); }
  else ST.ent = null;
}
function setCmd(ctx, k) {
  const pt = petOf(ctx), t = L(ctx); if (!pt || !LV.CMDS.includes(k)) return false;
  const wasHome = isHome(pt) || !ST.ent || (ST.ent && ST.ent.state === 'home');
  pt.cmd = k; ctx.persist();
  if (k === 'home') { if (!wasHome || (ST.ent && ST.ent.state !== 'home')) goHome(ctx); say(ctx, t.say.home); return true; }
  if ((pt.koT || 0) > 0) { ctx.toast(t.koWait(pt.name, Math.ceil(pt.koT))); return true; }
  ST.tgt = null;
  if (wasHome) {
    const p = ctx.S.player, e = ST.ent;
    if (e && e.state === 'home' && Math.hypot(e.x - p.x, e.y - p.y) < 20 * TS) { e.state = 'follow'; e.sit = false; e.hop = 0.45; }   /* cùng vùng, gần → chạy ra chỗ bạn */
    else { appearNext(ctx); ctx.toast(t.appear(pt.name)); }
  }
  if (ST.ent) ST.ent.hop = 0.4;
  say(ctx, t.say[k]); return true;
}
function chatSend(ctx, raw) {
  { const s0 = String(raw || '').trim(); if (s0 && ctx.chatHooks) for (const h of ctx.chatHooks) { try { if (h(s0)) return 'hook'; } catch (e) { console.error('chatHook', e); } } }   /* plan-29: lệnh chat của hệ khác (vd 'goi rong' → dragon.js) */
  const pt = petOf(ctx); if (!pt) return null; const t = L(ctx), s = String(raw || '').trim(); if (!s) return null;
  const k = LV.parseCmd(s);
  if (!k) { say(ctx, t.say.unk, 2.2); if (ST.ent) { ST.ent.hop = 0.3; ST.ent.tilt = 1.2; } ctx.toast(t.hint); ctx.sfx('rocky_chirp'); return 'unknown'; }
  setCmd(ctx, k); ctx.sfx('rocky_chirp'); return k;
}

/* ô chat: Enter (máy tính) hoặc nút 💬 (điện thoại) → gõ → Enter gửi; Esc đóng. Ô nằm GIỮA màn (không che nút cảm ứng nào). */
function chatUI(ctx) {
  if (ST.chatEl || typeof document === 'undefined') return;
  if (!document.getElementById('rk-style')) {
    const st = document.createElement('style'); st.id = 'rk-style';
    st.textContent = `#rk-chat{position:fixed;left:calc(var(--vvl,0px) + var(--vvw,100vw) / 2);top:calc(var(--vvt,0px) + var(--vvh,100vh) * .7);transform:translate(-50%,-50%);z-index:40;display:flex;gap:6px;align-items:center;
      width:min(400px,calc(var(--vvw,100vw) - 32px));box-sizing:border-box;padding:6px 8px;background:#f4e3c4;border:3px solid #6b3416;border-radius:6px;box-shadow:0 3px 0 #3a1c0c;font:18px VT323,monospace;color:#3a1c0c}
      #rk-chat[hidden]{display:none} #rk-chat .rk-ic{font-size:18px} #rk-chat input{flex:1;min-width:0;font:20px VT323,monospace;background:#fff8e8;border:2px solid #a0703a;border-radius:4px;padding:3px 6px;color:#3a1c0c;outline:none}
      #rk-chat button{font:18px VT323,monospace;background:#ff9426;color:#fff6c8;border:2px solid #6b3416;border-radius:4px;padding:3px 10px;text-shadow:1px 1px 0 #6b3416;cursor:pointer}
      @media (pointer:coarse){#rk-chat{top:calc(var(--vvt,0px) + var(--vvh,100vh) * .44)}}   
      #btn-chat{position:fixed;width:40px!important;height:40px!important;font-size:18px!important;z-index:6}`;
    document.head.appendChild(st);
  }
  const el = document.createElement('div'); el.id = 'rk-chat'; el.hidden = true;
  el.innerHTML = `<span class="rk-ic">🪨</span><input id="rk-chat-in" maxlength="40" autocomplete="off" spellcheck="false" enterkeyhint="send"><button id="rk-chat-send" type="button"></button>`;
  document.body.appendChild(el); ST.chatEl = el;
  const inp = el.querySelector('input');
  const send = () => { const v = inp.value; inp.value = ''; closeChat(ctx); chatSend(ctx, v); };
  inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); send(); } else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeChat(ctx); } });
  el.querySelector('#rk-chat-send').addEventListener('pointerdown', e => { e.preventDefault(); send(); });
  ctx.registerCloser('chat', () => closeChat(ctx));
  const tc = document.getElementById('touch');
  if (tc) { const b = document.createElement('button'); b.id = 'btn-chat'; b.type = 'button'; b.textContent = '💬'; b.title = 'Rocky'; tc.appendChild(b); ST.chatBtn = b;
    b.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); if (ctx.S.mode === 'play') openChat(ctx); else if (ctx.S.mode === 'chat') closeChat(ctx); }); }
}
function openChat(ctx) {
  const pt = petOf(ctx); if (!pt || ctx.S.mode !== 'play') return false; chatUI(ctx); const t = L(ctx);
  const el = ST.chatEl, inp = el.querySelector('input'); inp.placeholder = t.chatPh; el.querySelector('#rk-chat-send').textContent = t.send;
  el.hidden = false; ST.chatOpen = true; ctx.setMode('chat'); placeChat(); setTimeout(() => { try { inp.focus(); } catch (e) { } }, 30); return true;
}
function closeChat(ctx) { if (ST.chatEl) { ST.chatEl.hidden = true; const i = ST.chatEl.querySelector('input'); try { i.blur(); } catch (e) { } } ST.chatOpen = false; if (ctx.S.mode === 'chat') ctx.setMode('play'); }
/* các nút / khung HUD đang hiện (để ô chat và nút 💬 né) */
function uiRects(skip) {
  const vis = e => { if (!e || e === skip) return null; const r = e.getBoundingClientRect(); return r.width && r.height && getComputedStyle(e).display !== 'none' && getComputedStyle(e).visibility !== 'hidden' ? r : null; };
  return ['btn-a', 'joy', 'btn-tgt', 'herobar', 'btn-menu', 'btn-photo', 'btn-rot', 'btn-chat', 'px-clock', 'px-status', 'px-money', 'seis', 'h-quest', 'hotbar', 'preset-chip'].map(id => vis(document.getElementById(id)))
    .concat([...document.querySelectorAll('#mslots .ms-eat, #mslots .ms-bag, #touch-skills')].map(vis)).filter(Boolean);
}
const overlaps = (x, y, w, h, rs) => rs.some(r => x < r.right + 2 && x + w > r.left - 2 && y < r.bottom + 2 && y + h > r.top - 2);
function placeChat() {   /* ô chat: thử vài độ cao (máy tính: dưới nhân vật; cảm ứng: giữa màn) tới khi không che nút / khung HUD nào */
  const el = ST.chatEl; if (!el || el.hidden) return;
  let touch = false; try { touch = matchMedia('(pointer:coarse)').matches; } catch (e) { }
  const rs = uiRects(el), prefs = touch ? [0.44, 0.52, 0.36, 0.6, 0.3, 0.66, 0.24] : [0.7, 0.62, 0.78, 0.55];
  for (const w of [400, 340, 280]) for (const f of prefs) {   /* rộng nhất trước; chật (máy ngang thấp) thì thu hẹp */
    el.style.width = `min(${w}px,calc(var(--vvw,100vw) - 32px))`; el.style.top = `calc(var(--vvt,0px) + var(--vvh,100vh) * ${f})`;
    const r = el.getBoundingClientRect(); if (!overlaps(r.left, r.top, r.width, r.height, rs)) return; }
  el.style.width = ''; el.style.top = `calc(var(--vvt,0px) + var(--vvh,100vh) * ${prefs[0]})`;
}
/* nút 💬: đặt cạnh nút 📷 / ☰; thử vài chỗ tới khi không chồng nút / khung HUD nào */
function placeChatBtn() {
  const b = ST.chatBtn; if (!b || typeof document === 'undefined') return;
  const others = uiRects(b), byId = id => { const e = document.getElementById(id), r = e && e.getBoundingClientRect(); return r && r.width ? r : null; };
  const ph = byId('btn-photo') || byId('btn-menu'), W = 40, gap = 6;
  const vw = window.innerWidth, vh = window.innerHeight, c = [];
  if (ph) { c.push([ph.left - gap - W, ph.top], [ph.left, ph.bottom + gap], [ph.left - gap - W, ph.bottom + gap], [ph.left - 2 * (gap + W), ph.top], [ph.left, ph.bottom + 2 * gap + W]); }
  c.push([vw - 60, vh * 0.42], [vw - 60, vh * 0.3], [12, vh * 0.3]);
  const hit = (x, y) => overlaps(x, y, W, W, others) || x < 0 || y < 0 || x + W > vw || y + W > vh;
  const at = c.find(([x, y]) => !hit(x, y)) || c[0];
  b.style.left = Math.round(at[0]) + 'px'; b.style.top = Math.round(at[1]) + 'px'; b.style.right = 'auto';
}

// ---------------------------------------------------------------- combat (plan-27)
const now = ctx => ctx.S.time;
function monsters(ctx) {
  const L0 = ctx.monsters && ctx.monsters.list ? ctx.monsters.list() : [];
  const foe = ctx.sparFoe && ctx.sparFoe();
  return L0.filter(mo => mo && mo.hp > 0 && mo.state !== 'dead' && (!(mo.c && mo.c.spar) || mo === foe) && !mo.statue && !(mo.stoneT > now(ctx)) && !mo.dead);   /* chỉ quái: bỏ bạn tập (spar), tượng đá / đang hóa đá */
}
const dst = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
function isThreat(ctx, mo) {   /* lệnh Bảo vệ: chỉ kẻ ĐANG tấn công bạn hoặc Rocky */
  const p = ctx.S.player, t = now(ctx);
  if (t - (mo.__rkP ?? -99) < THREAT_T || t - (mo.__rkR ?? -99) < THREAT_T) return true;   /* vừa đánh bạn / vừa đánh Rocky / Rocky đang đấm nó */
  if (mo.angry && dst(mo, p) < 220) return true;                                         /* bạn đã đánh nó → nó đuổi đánh bạn */
  if (mo.c.boss) return !!mo.warned && dst(mo, p) < 170;                                  /* trùm đã vào trận */
  return dst(mo, p) < 48;                                                                  /* đang áp sát đánh bạn (tầm gây sự của quái 44 px) */
}
function eligible(ctx, pt) {   /* quái Rocky được phép nhắm theo lệnh đang bật */
  if (!ST.ent || ST.ent.state === 'home' || pt.cmd === 'follow' || pt.cmd === 'home') return [];
  if (ctx.petWait && ctx.petWait()) return [];
  const p = ctx.S.player, list = monsters(ctx).filter(mo => dst(mo, p) < LEASH + 10);
  const foe = ctx.sparFoe && ctx.sparFoe();   /* anh 2026-10-12: bạn tập cơ bắp đang đấu = mục tiêu của Rocky ở cả Bảo vệ lẫn Tấn công */
  if (foe) return [foe, ...list.filter(mo => mo !== foe && (pt.cmd === 'attack' || isThreat(ctx, mo)))];
  return pt.cmd === 'attack' ? list.filter(mo => dst(mo, p) < ATTACK_R || dst(mo, ST.ent) < 70 || isThreat(ctx, mo)) : list.filter(mo => isThreat(ctx, mo));
}
function onPlayerHurt(ctx) {   /* bọc ctx.hero.hit: quái gần nhất lúc bạn trúng đòn = kẻ tấn công */
  const p = ctx.S.player; let best = null, bd = 1e9;
  for (const mo of monsters(ctx)) { const d = dst(mo, p) - (mo.c.boss ? 40 : 0); if (d < 60 && d < bd) { bd = d; best = mo; } }
  if (best) best.__rkP = now(ctx);
}
function wrapHero(ctx) {
  const h = ctx.hero; if (!h || h.__rk) return;
  const orig = h.hit; h.hit = function (d, f) { const r = orig.call(this, d, f); if (r) { try { onPlayerHurt(ctx); } catch (e) { } } return r; }; h.__rk = true;
}
function shellK(mo) { return mo.c.shell && !mo.open ? 0.25 : 1; }
function dealDmg(ctx, mo, dmg, kb, fx) {
  if (!ctx.monsters || !ctx.monsters.damage) return; mo.__rkR = now(ctx); mo.__rkHit = now(ctx);
  ctx.monsters.damage(mo, Math.max(1, Math.round(dmg * shellK(mo))), ST.ent || ctx.S.player, 1, mo.c.boss ? 0 : kb, true);
  if (fx) vfx1(ctx, fx, mo.x, mo.y + 3, 'wood_chips');
}
function punchHit(ctx, pt, h) {
  const mo = h.mo, e = ST.ent; if (!e || !monsters(ctx).includes(mo)) return;
  if (dst(mo, e) > REACH + 12 + (mo.c.boss ? 14 : 0)) return;
  const st = statsOf(pt), tier = LV.tierOf(pt, 'punch'), P = LV.punchOf(tier), fin = h.fin;
  const dmg = st.atk * P.mul * (fin && P.launch ? 1.5 : 1);
  dealDmg(ctx, mo, dmg, fin && P.launch ? 170 : 55, `rk_punch_t${LV.vfxTier(tier)}`); ST.stats.punches++;
  ctx.sfx('hit');
  if (fin && P.shock) {   /* bậc 7: sóng chấn nhỏ quanh mục tiêu */
    vfx1(ctx, 'rk_shock', mo.x, mo.y + 6, 'spar_shock');
    for (const o of monsters(ctx)) if (o !== mo && dst(o, mo) < 26) dealDmg(ctx, o, st.atk * P.mul * 0.5, 90);
  }
}
function lineHits(ctx, e, dir, range, w, pool) {   /* quái nằm trên đường thẳng từ Rocky theo hướng dir (0 xuống, 1 trái, 2 phải, 3 lên) */
  const [vx, vy] = DIRV[dir], out = [];
  for (const mo of pool) { const dx = mo.x - e.x, dy = (mo.y - 4) - (e.y - 6), al = dx * vx + dy * vy, pe = Math.abs(dx * vy - dy * vx); if (al > 4 && al < range + (mo.c.boss ? 12 : 4) && pe < w / 2 + 7 + (mo.c.boss ? 10 : 0)) out.push(mo); }
  return out;
}
/* 2026-10-11 anh chốt (thay điều kiện hẹp của plan-27): có mục tiêu hợp lệ trong tầm → luôn dùng chiêu bậc cao nhất đã mở + hết hồi chiêu:
   Siêu Cấp (nếu chưa biến hình) > Rocky-ha > Đấm. Rocky-ha nhắm thẳng mục tiêu (hướng trục chính), vẫn xuyên mọi quái trên đường. */
function tryHa(ctx, pt, pool, tg) {
  const tier = LV.tierOf(pt, 'ha'); if (!tier || ST.haCd > 0 || ST.beam || !tg) return false;
  const H = LV.haOf(tier), e = ST.ent, dx = tg.x - e.x, dy = (tg.y - 4) - (e.y - 6);
  const d = Math.abs(dx) >= Math.abs(dy) ? (dx > 0 ? 2 : 1) : (dy > 0 ? 0 : 3);
  if (!lineHits(ctx, e, d, H.range, H.w, [tg]).length) return false;   /* chưa thẳng hàng / ngoài tầm → cứ áp sát (sát bên là thẳng hàng) */
  ST.beam = { dir: d, t: 0, fired: false, tier, range: H.range, w: H.w, show: 0 }; e.moving = false; e.sit = false;
  e.face = d === 0 ? 'ds' : d === 3 ? 'dn' : 'side'; if (d === 1) e.dir = -1; if (d === 2) e.dir = 1;
  vfx1(ctx, `rk_charge_t${LV.vfxTier(tier)}`, e.x, e.y + 2, null); ctx.sfx('rocky_happy');
  return true;
}
function beamTick(ctx, pt, dt) {
  const b = ST.beam, e = ST.ent; if (!b || !e) { ST.beam = null; return; }
  b.t += dt;
  if (!b.fired && b.t >= LV.haOf(b.tier).charge) {
    b.fired = true; b.show = 0.42; ST.stats.beams++; ST.stats.log.push('ha');
    const st = statsOf(pt), H = LV.haOf(b.tier), [vx, vy] = DIRV[b.dir];
    for (const mo of lineHits(ctx, e, b.dir, b.range, b.w, monsters(ctx))) { dealDmg(ctx, mo, st.atk * H.mul, 0); if (!mo.c.boss) mo.kb = { vx: vx * 120, vy: vy * 120, t: 0.15 }; b.hits = (b.hits || 0) + 1; }
    ST.haCd = H.cd; if (ctx.quake) ctx.quake(0.15); ctx.sfx('hit');
  }
  if (b.fired) { b.show -= dt; if (b.show <= 0) ST.beam = null; }
}
function startSuper(ctx, pt) {
  const tier = LV.tierOf(pt, 'super'); if (!tier || (pt.superCd || 0) > 0 || pt.superT > 0 || ST.cine || ctx.S.camFocus) return false;
  const e = ST.ent; if (!e) return false;
  ST.cine = { t: 0, last: performance.now(), swapped: false, tier }; ST.beam = null; e.moving = false; e.sit = false; e.face = 'ds';
  if (ctx.hero && ctx.hero.iframes) ctx.hero.iframes(2);
  ctx.S.timeScale = 0.25; ctx.S.camFocus = { x: e.x, y: e.y - 10 }; ctx.S.camZoom = 1; ctx.sfx('rocky_happy'); if (ctx.quake) ctx.quake(0.15);
  return true;
}
function cineTick(ctx, pt) {   /* cảnh biến hình ngắn ~1,3 s thời gian thật (kiểu Sừng Bò): chậm + phóng to + đổi bộ hình */
  const c = ST.cine, e = ST.ent; if (!c) return; const tn = performance.now(), rdt = Math.min(0.05, (tn - c.last) / 1000); c.last = tn; c.t += rdt;
  if (!e) { endCine(ctx); return; }
  ctx.S.camZoom = 1 + 0.6 * Math.min(1, c.t / 0.35) * (c.t > 1.05 ? Math.max(0, 1 - (c.t - 1.05) / 0.25) : 1); ctx.S.camFocus = { x: e.x, y: e.y - 10 };
  if (!c.swapped && c.t >= 0.5) {
    c.swapped = true; const S2 = LV.superOf(c.tier); pt.superT = S2.dur; pt.superMax = S2.dur; ST.stats.supers++; ST.stats.log.push('super');
    const st = statsOf(pt); pt.hp = st.max; e.hop = 0.45; dust(e.x, e.y, 12);
    vfx1(ctx, `rk_super_t${LV.vfxTier(c.tier)}`, e.x, e.y + 4, 'spar_transform', true); vfx1(ctx, 'rk_shock', e.x, e.y + 8, 'spar_shock');
    if (ctx.quake) ctx.quake(0.35); ctx.sfx('win');
  }
  if (c.t >= 1.3) { endCine(ctx); ctx.toast(L(ctx).superOn(pt.name), true); }
}
function endCine(ctx) { ST.cine = null; ctx.S.timeScale = 1; ctx.S.camZoom = 1; ctx.S.camFocus = null; }
function endSuper(ctx, pt) {
  const tier = Math.max(1, LV.tierOf(pt, 'super')); pt.superT = 0; pt.superCd = LV.superOf(tier).cd;
  const st = statsOf(pt); pt.hp = Math.min(pt.hp, st.max);
  if (ST.ent) { dust(ST.ent.x, ST.ent.y, 10); vfx1(ctx, 'monster_poof', ST.ent.x, ST.ent.y + 2, 'dirt_puff'); }
  ctx.toast(L(ctx).superOff(pt.name)); ctx.persist();
}
function knockOut(ctx, pt) {
  const t = L(ctx); pt.hp = 0; pt.koT = LV.KO_SECS; pt.superT = 0; ST.tgt = null; ST.beam = null; ST.hitQ.length = 0; if (ST.cine) endCine(ctx);
  ctx.toast(t.ko(pt.name), true); ctx.sfx('fail'); goHome(ctx); ctx.persist();
}
function rockyHurt(ctx, pt, raw, mo) {
  const st = statsOf(pt), d = Math.max(1, Math.round(raw) - st.def); pt.hp = Math.max(0, (pt.hp ?? st.max) - d); ST.lastHurtT = now(ctx); ST.stats.hurt += d;
  if (ST.ent) { ST.ent.hurt = 0.2; if (ctx.pop) ctx.pop(ST.ent.x, ST.ent.y - 18, `-${d}`, '#ff8a8a'); }
  if (mo) mo.__rkR = now(ctx);
  if (pt.hp <= 0) knockOut(ctx, pt);
}
function combatTick(ctx, pt, dt, e, spd) {   /* true = Rocky đang bận đánh (không đi theo) */
  if (ST.punchCd > 0) ST.punchCd -= dt; if (ST.haCd > 0) ST.haCd -= dt;
  for (let i = ST.hitQ.length - 1; i >= 0; i--) { const h = ST.hitQ[i]; h.t -= dt; if (h.t <= 0) { ST.hitQ.splice(i, 1); punchHit(ctx, pt, h); } }
  if (e.punchT > 0) e.punchT -= dt;
  /* quái đánh trả Rocky: quái đang 'dính' với Rocky (Rocky vừa đấm) ở sát bên */
  for (const mo of monsters(ctx)) {
    if (mo.__rkCd > 0) mo.__rkCd -= dt;
    if (now(ctx) - (mo.__rkHit ?? -99) < 5 && dst(mo, e) < 18 + (mo.c.boss ? 16 : 0) && !(mo.__rkCd > 0)) { mo.__rkCd = MON_HIT_CD; rockyHurt(ctx, pt, (mo.c.dmg || 8) * (mo.c.boss ? 1 : 0.8), mo); if (!ST.ent) return true; }
  }
  if (ST.beam) { beamTick(ctx, pt, dt); e.moving = false; return true; }
  const pool = eligible(ctx, pt), p = ctx.S.player;
  if (ST.tgt && (!pool.includes(ST.tgt))) ST.tgt = null;
  if (!ST.tgt && pool.length) { let bd = 1e9; for (const mo of pool) { const d = dst(mo, e) + (mo.c.boss ? 30 : 0); if (d < bd) { bd = d; ST.tgt = mo; } } }
  /* chiêu bậc cao nhất đã mở + sẵn sàng: Siêu Cấp (mục tiêu trong ~100 px) > Rocky-ha > Đấm */
  if (ST.tgt && dst(ST.tgt, e) < 100 && LV.tierOf(pt, 'super') && !(pt.superT > 0) && !((pt.superCd || 0) > 0)) { if (startSuper(ctx, pt)) return true; }
  if (ST.tgt && tryHa(ctx, pt, pool, ST.tgt)) return true;
  const tg = ST.tgt; if (!tg) return false;
  if (dst(e, p) > LEASH) { ST.tgt = null; return false; }
  e.sit = false; cancelFetch();
  const reach = REACH + (tg.c.boss ? 12 : 0), d = dst(tg, e);
  if (d > reach) { stepToward(ctx, e, tg.x - Math.sign(tg.x - e.x) * 6, tg.y, spd * 1.2, dt); e.moving = true; return true; }
  e.moving = false; if (Math.abs(tg.x - e.x) > 2) e.dir = tg.x > e.x ? 1 : -1;
  const dy = tg.y - e.y; e.face = Math.abs(dy) > Math.abs(tg.x - e.x) * 1.2 ? (dy > 0 ? 'ds' : 'dn') : 'side';
  if (ST.punchCd <= 0) {
    const P = LV.punchOf(LV.tierOf(pt, 'punch')), sup = pt.superT > 0; ST.combo = (ST.combo % P.combo) + 1; const fin = ST.combo === P.combo;
    ST.punchCd = (P.cd + (fin ? 0.45 : 0)) * (sup ? 0.7 : 1); e.punchT = 0.26; e.punchN = (e.punchN || 0) + 1;
    stepToward(ctx, e, tg.x, tg.y, 40, 0.05);   /* nhích tới một chút */
    ST.hitQ.push({ mo: tg, t: 0.1, fin });
  }
  return true;
}

// ---------------------------------------------------------------- movement
function stepToward(ctx, e, tx, ty, sp, dt) {
  const dx = tx - e.x, dy = ty - e.y, d = Math.hypot(dx, dy); if (d < 0.5) return true;
  const mx = dx / d * sp * dt, my = dy / d * sp * dt; let moved = false;
  const ok = (x, y) => e.ghost > 0 || passable(ctx, x, y);
  if (mx && ok(e.x + mx, e.y)) { e.x += mx; moved = true; }
  if (my && ok(e.x, e.y + my)) { e.y += my; moved = true; }
  if (Math.abs(dx) > 1) e.dir = dx > 0 ? 1 : -1;
  if (!moved) { e.blocked += dt; if (e.blocked > 1) { e.blocked = 0; e.ghost = 0.5; e.hop = 0.5; dust(e.x, e.y, 4); } }
  else e.blocked = 0;
  return moved;
}
function updatePet(dt, ctx) {
  const s = sv(ctx), pt = s.pet, p = ctx.S.player, playing = ctx.S.mode === 'play';
  /* hồi chiêu / Siêu Cấp / gục chạy cả khi Rocky ở ổ */
  if ((pt.superCd || 0) > 0) pt.superCd = Math.max(0, pt.superCd - dt);
  if (pt.superT > 0) { pt.superT -= dt; if (pt.superT <= 0) endSuper(ctx, pt); }
  if ((pt.koT || 0) > 0) { pt.koT -= dt; const st = statsOf(pt); pt.hp = Math.min(st.max, (pt.hp || 0) + st.max * dt / LV.KO_SECS); if (pt.koT <= 0) { pt.koT = 0; pt.hp = st.max; if (pt.cmd !== 'home') { appearNext(ctx); say(ctx, L(ctx).say[pt.cmd] || ''); } else ctx.toast(L(ctx).koDone(pt.name)); ctx.persist(); } }
  { const st = statsOf(pt); if (pt.hp == null) pt.hp = st.max; if (!((pt.koT || 0) > 0) && now(ctx) - ST.lastHurtT > 6 && pt.hp < st.max) pt.hp = Math.min(st.max, pt.hp + st.max * 0.03 * dt); }
  if (ST.cine) cineTick(ctx, pt);
  if (ST.bubble) { ST.bubble.t -= dt; if (ST.bubble.t <= 0) ST.bubble = null; }
  if (isHome(pt)) {   /* ở ổ: ngồi trong ổ (vùng có ổ) hoặc không có mặt */
    if (!ST.nest) { ST.ent = null; return; }
    const e = ST.ent || spawnEnt(ctx); if (e.state !== 'home') { Object.assign(e, { x: ST.nest.x, y: ST.nest.y }); }
    e.state = 'home'; e.sit = true; e.moving = false; e.face = 'ds'; if (e.hop > 0) e.hop -= dt;
    e.blinkT -= dt; if (e.blinkT <= 0) { e.blink = 0.14; e.blinkT = 2 + Math.random() * 3; } if (e.blink > 0) e.blink -= dt;
    return;
  }
  const e = ST.ent || spawnEnt(ctx);
  if (e.state === 'home') { e.state = 'follow'; e.sit = false; }
  const hungry = pt.hunger < HUNGRY_AT;
  const riding = !!(ctx.S.sea && ctx.S.sea.riding && !ctx.S.sea.diving);   /* anh báo 2026-10-10: chỉ ngồi khi đang trên bè/ván, không phải cả vùng Biển */
  if (e.ghost > 0) e.ghost -= dt;
  if (e.hop > 0) e.hop -= dt;
  if (e.hurt > 0) e.hurt -= dt;
  if (e.tilt > 0) e.tilt -= dt;
  if (ST.petCd > 0) ST.petCd -= dt;
  ST.hungerAcc += dt;
  if (ST.hungerAcc >= HUNGER_EVERY) { ST.hungerAcc -= HUNGER_EVERY; pt.hunger = Math.max(0, pt.hunger - 1); ctx.persist(); }
  if (p.moving) ST.idleT = 0; else ST.idleT += dt;

  if (riding) {
    if (ST.sparkle) cancelFetch(); ST.tgt = null;
    const ly = ctx.S.npcs.find(n => n.m && n.m.friend && Math.hypot(n.x - p.x, n.y - p.y) < 40);
    const side = ly ? (ly.x < p.x ? 1 : -1) : p.dir === 2 ? -1 : 1, behind = p.dir === 3 ? 1 : p.dir === 0 ? -1 : 0;
    const small = ctx.S.sea.riding === 'plank', tx = p.x + side * (small ? 9 : 14), ty = p.y + (small ? 6 : 4) + behind * 3;
    e.state = 'ride'; e.x += (tx - e.x) * Math.min(1, dt * 10); e.y += (ty - e.y) * Math.min(1, dt * 10); e.moving = false;
    e.rideT = (e.rideT || 0) + dt;
    if (p.moving) { e.sit = false; e.face = p.dir === 0 ? 'ds' : p.dir === 3 ? 'dn' : 'side'; e.dir = p.dir === 1 ? -1 : 1; e.ft += dt * 6; e.fr = 1 + ((e.ft | 0) % 2); }
    else { e.sit = true; if ((e.lookT = (e.lookT ?? 2) - dt) <= 0) { e.lookT = 2 + Math.random() * 3; const r = Math.random(); e.face = r < 0.4 ? 'ds' : 'side'; e.dir = r < 0.7 ? -e.dir || 1 : e.dir; if (r > 0.8) { e.hop = 0.45; note(e.x, e.y); } } }
  } else {
    if (e.state === 'ride') e.state = 'follow';
    const dp = Math.hypot(p.x - e.x, p.y - e.y);
    const wait = ctx.petWait ? ctx.petWait() : null;   /* 2026-10-11 Sàn Đấu Ngầm: đang đấu → ra mép sàn ngồi chờ, không chạy theo vào vòng */
    const busyFight = !!(ST.tgt || ST.beam);
    if (dp > TELEPORT_PX && !wait && !(busyFight && dp < LEASH + 20)) { teleport(ctx); cancelFetch(); ST.tgt = null; }
    const spd = PET_SPEED * (hungry ? 0.7 : 1) * Math.min(2, Math.max(1, p.speedMul || 1)) * statsOf(pt).spd;
    e.moving = false;
    let fighting = false;
    if (!wait && !ST.cine && e.state !== 'dig') fighting = combatTick(ctx, pt, dt, e, spd);
    if (!ST.ent) return;   /* vừa gục → đã về ổ */
    if (ST.cine) { e.moving = false; }
    else if (fighting) { e.state = 'follow'; }
    else if (e.state === 'fetch' && ST.sparkle) {
      const sp = ST.sparkle; sp.t += dt;
      if (sp.t > sp.life || Math.hypot(sp.x - p.x, sp.y - p.y) > 14 * TS) cancelFetch();
      else {
        const d = Math.hypot(sp.x - e.x, sp.y - e.y);
        if (d < 5) { e.state = 'dig'; ST.digT = 1; }
        else { stepToward(ctx, e, sp.x, sp.y, spd, dt); e.moving = true; }
      }
    } else if (e.state === 'dig') {
      ST.digT -= dt; e.sit = false;
      if (Math.random() < dt * 9) dust(e.x, e.y, 2);
      if (ST.digT <= 0) { ST.holding = rollLoot(); ST.sparkle = null; e.state = 'follow'; e.hop = 0.5; ctx.sfx('dig'); note(e.x, e.y); }
    } else if (wait) {
      if (ST.sparkle) cancelFetch(); e.state = 'follow'; ST.tgt = null;
      const dw = Math.hypot(wait.x - e.x, wait.y - e.y);
      if (dw > 3) { stepToward(ctx, e, wait.x, wait.y, spd * 1.3, dt); e.moving = true; e.sit = false; }
      else { e.sit = true; if (Math.abs(p.x - e.x) > 2) e.dir = p.x > e.x ? 1 : -1; }
    } else {
      e.state = 'follow';
      const tgt = behindPoint(ctx, FOLLOW_MAX - 4);
      const dt2 = Math.hypot(tgt.x - e.x, tgt.y - e.y);
      if (dp > FOLLOW_MAX || (dp > FOLLOW_MIN && dt2 > 6 && p.moving)) { stepToward(ctx, e, tgt.x, tgt.y, spd, dt); e.moving = true; e.sit = false; }
      else if (dp < FOLLOW_MIN - 6 && p.moving) { stepToward(ctx, e, e.x - (p.x - e.x), e.y - (p.y - e.y), spd * 0.6, dt); e.moving = true; }
      else if (Math.abs(p.x - e.x) > 2) e.dir = p.x > e.x ? 1 : -1;
    }
    if (!e.moving && ST.idleT >= 3 && e.state === 'follow' && playing && !fighting && !ST.cine) {
      if (!e.sit) { e.sit = true; e.bounceT = 4 + Math.random() * 5; }
    } else if (e.moving || ST.idleT < 3 || fighting) e.sit = false;
  }
  e.blinkT -= dt;
  if (e.blinkT <= 0) { e.blink = 0.14; e.blinkT = (e.sit ? 1.6 : 3) + Math.random() * 3; }
  if (e.blink > 0) e.blink -= dt;
  if (e.sit) { e.bounceT -= dt; if (e.bounceT <= 0) { e.bounceT = 5 + Math.random() * 5; e.hop = 0.45; note(e.x, e.y); } }
  if (!riding && !ST.beam && !(e.punchT > 0)) {
    const mx = e.x - (e.px ?? e.x), my = e.y - (e.py ?? e.y);
    if (e.moving && Math.hypot(mx, my) > 0.05) e.face = Math.abs(my) > Math.abs(mx) * 1.2 ? (my > 0 ? 'ds' : 'dn') : 'side';
    else if (e.sit) e.face = 'ds';
  }
  e.px = e.x; e.py = e.y;
  if (!riding) { e.ft += dt * (e.moving ? 9 : 0); e.fr = e.moving ? 1 + ((e.ft | 0) % 2) : 0; }
  if (!riding && playing && !ST.sparkle && !ST.holding && pt.bond >= 1 && !ST.tgt && !ST.beam) {
    ST.fetchT -= dt;
    if (ST.fetchT <= 0) { ST.fetchT = FETCH_MIN + Math.random() * (FETCH_MAX - FETCH_MIN); spawnSparkle(ctx); }
  }
  if (ST.sparkle) ST.sparkle.ph = (ST.sparkle.ph || 0) + dt;
}

// ---------------------------------------------------------------- drawing helpers (plan-27)
function sheetFrame(ctx, name, t) {   /* sheet VFX PixelLab (manifest.vfx) → { img, sx, sw, sh, w, h, n } khung theo thời gian t */
  const v = ctx.ART && ctx.ART.vfx && ctx.ART.vfx[name]; if (!v || !v.img) return null;
  const n = v.n || 1, hi = v.img.__hi ? 1 : 2, f = Math.min(n - 1, Math.floor(t * (v.fps || 12)));   /* sheet có __hi: shim tự nhân đôi toạ độ nguồn */
  return { img: v.img, f, n, hi, w: v.w, h: v.h, loopF: Math.floor(t * (v.fps || 12)) % n };
}
function pickImg(ctx, pt, e, scarfSet) {   /* chọn khung ảnh theo bộ cỡ + hướng + động tác */
  const k = setPre(ctx, pt), pre = PRE[k], face = e.face || 'side', fx = face === 'ds' ? 's' : face === 'dn' ? 'n' : 'e', flip = e.dir < 0 ? 1 : 0;
  const side = k === 0 ? scarfSet : (cre(ctx, pre) || scarfSet), fr = e.sit ? 3 : e.fr;
  const clip = name => { const c = cre(ctx, `${pre}_${name}_${fx}`) || (fx !== 'e' ? null : null); return c; };
  if (ST.cine && ST.cine.swapped) { const c = cre(ctx, `${pre}_transform_s`); if (c) { const i = Math.min(c.length - 1, Math.floor(Math.max(0, ST.cine.t - 0.5) / 0.8 * c.length)); return { img: c[i][0], px: true }; } }   /* cảnh biến hình: dáng gồng hai tay (PixelLab) */
  if (e.punchT > 0) { const c = clip('punch'); if (c) { const i = Math.min(c.length - 1, Math.floor((1 - e.punchT / 0.26) * c.length)); return { img: c[i][fx === 'e' ? flip : 0], px: true }; } }
  if (ST.beam) { const c = clip('ha'); if (c) { const prog = ST.beam.fired ? 1 : Math.min(1, ST.beam.t / 0.8); const i = Math.min(c.length - 1, Math.floor(prog * (c.length - 1))); return { img: c[i][fx === 'e' ? flip : 0], px: true }; } }
  const hopSet = e.hop > 0 && (e.sit || face === 'ds') ? cre(ctx, `${pre}_hop`) : null;
  if (!e.moving && !e.sit && !(e.hop > 0)) { const c = clip('idle'); if (c) { const i = Math.floor(ctx.S.time * 5) % c.length; return { img: c[i][fx === 'e' ? flip : 0], px: true }; } }   /* đứng thở (Siêu Cấp có clip idle) */
  if (hopSet) return { img: hopSet[Math.max(0, Math.min(hopSet.length - 1, Math.floor((1 - e.hop / 0.45) * hopSet.length)))][0], px: true };
  if (face !== 'side') { const ds = cre(ctx, `${pre}_${face}`); if (ds) return { img: ds[Math.min(ds.length - 1, e.sit ? 3 : fr)][0], px: true }; }
  return { img: side[Math.min(side.length - 1, fr)][flip], px: !!side.px || k > 0 };
}

// ---------------------------------------------------------------- system
export const pet = {
  id: 'pet',

  onZoneEnter(ctx) {
    const s = sv(ctx);
    ST.fx.length = 0; ST.sparkle = null; ST.lastP = null; ST.idleT = 0; ST.eggObj = null; ST.tgt = null; ST.beam = null; ST.hitQ.length = 0; ST.pops.length = 0; ST.bubble = null;
    if (ST.cine) endCine(ctx);
    if (ctx.S.mode === 'petname') closeName(ctx);
    if (ctx.S.mode === 'chat') closeChat(ctx);
    if (ctx.S.zone && ctx.S.zone.id === 'm9') placeEgg(ctx);
    findNest(ctx);
    if (s.pet) {
      if (isHome(s.pet)) { ST.ent = null; if (ST.nest) { spawnEnt(ctx); Object.assign(ST.ent, { x: ST.nest.x, y: ST.nest.y, state: 'home', sit: true }); } }
      else spawnEnt(ctx);
      if (ST.fetchT <= 0) ST.fetchT = FETCH_MIN + Math.random() * (FETCH_MAX - FETCH_MIN);
    } else ST.ent = null;
    ctx.onMonsterDown = (mo, xp) => {   /* plan-27: cùng hạ quái → Rocky nhận kinh nghiệm (phần lớn kinh nghiệm của Rocky) */
      const pt = petOf(ctx), e = ST.ent; if (!pt || !e || e.state === 'home' || isHome(pt)) return;
      const helped = now(ctx) - (mo.__rkHit ?? -99) < 8, near = dst(mo, e) < 160 || dst(mo, ctx.S.player) < 140;
      if (!helped && !near) return; ST.stats.kills += helped ? 1 : 0; if (ST.tgt === mo) ST.tgt = null;
      gainXp(ctx, Math.max(1, Math.round((xp || 5) * (helped ? 1 : 0.6))));
    };
    ctx.rocky = {   /* API cho menu.js (thẻ Rocky) / underwater.js (sách Heathcliff) */
      pet: () => petOf(ctx), stats: () => { const pt = petOf(ctx); return pt ? statsOf(pt) : null; }, cmdName: k => L(ctx).cmd[k] || k,
      readBook: (id, n) => readBook(ctx, id, n), say: txt => say(ctx, txt), openChat: () => openChat(ctx),
      /* anh 2026-10-12: đòn bạn tập cơ bắp trúng cả Rocky — spar.js gọi pos() để xét vùng đánh, hitBy() để trừ máu + hất lùi (không xuyên vật cứng) */
      pos: () => { const e = ST.ent, pt = petOf(ctx); return e && pt && e.state !== 'home' && !(pt.koT > 0) && !(e.ghost > 0) ? { x: e.x, y: e.y } : null; },
      hitBy: (raw, src, kx, ky, kb) => { const e = ST.ent, pt = petOf(ctx); if (!e || !pt || pt.koT > 0) return false; rockyHurt(ctx, pt, raw, src && src.c ? src : null);
        const l = Math.hypot(kx, ky) || 1, n = 6, push = (kb || 40) * (pt.superT > 0 ? 0.5 : 1); for (let i = 0; i < n; i++) { const nx = e.x + kx / l * push / n, ny = e.y + ky / l * push / n; if (ctx.isSolid(ctx.S.map, Math.floor(nx / 16), Math.floor(ny / 16))) break; e.x = nx; e.y = ny; }
        e.hop = 0.5; if (ctx.vfx) ctx.vfx('dirt_puff', e.x, e.y + 2); return true; },
    };
    if (typeof window !== 'undefined') window.__pet = {
      hatchNow: () => { const st = sv(ctx); if (st.pet) { if (!st.pet.grown) hatch(ctx); return st.pet; } if (ST.eggObj) { ctx.removeObject(ctx.S.map, ST.eggObj); ST.eggObj = null; } st.egg = st.egg || { warmth: 0, walked: 0 }; hatch(ctx); return st.pet; },
      state: () => ({ save: JSON.parse(JSON.stringify(sv(ctx))), ent: ST.ent && ST.ent.state !== 'home' ? { x: Math.round(ST.ent.x), y: Math.round(ST.ent.y), state: ST.ent.state, sit: ST.ent.sit, face: ST.ent.face || 'side', ghost: ST.ent.ghost > 0 } : null, sparkle: ST.sparkle && { x: ST.sparkle.x, y: ST.sparkle.y }, holding: ST.holding, egg: ST.eggObj && { x: ST.eggObj.x, y: ST.eggObj.y }, mode: ctx.S.mode, petCd: ST.petCd, fetchT: ST.fetchT }),
      warp: (tx, ty) => { if (!ST.ent) return null; ST.ent.x = tx * TS + 8; ST.ent.y = ty * TS + 12; return { x: ST.ent.x, y: ST.ent.y }; },
      fetchNow: () => { if (!sv(ctx).pet) return false; ST.holding = null; return spawnSparkle(ctx); },
      feed: () => { if (!foodInBag(ctx)) { ctx.bag.add('berry', 1); if (ctx.hold) ctx.hold('berry'); } return feed(ctx); },
      name: n => confirmName(ctx, n, true),
      /* plan-27 */
      rk: () => { const pt = petOf(ctx), e = ST.ent; if (!pt) return null; const st = statsOf(pt), lv = LV.levelFromXp(pt.xp || 0);
        return { lv: st.lv, xp: pt.xp, into: lv.into, need: lv.need, hp: Math.round(pt.hp), max: st.max, atk: st.atk, def: st.def, cmd: pt.cmd, ko: +(pt.koT || 0).toFixed(1), superT: +(pt.superT || 0).toFixed(1), superCd: +(pt.superCd || 0).toFixed(1), skills: { punch: LV.tierOf(pt, 'punch'), ha: LV.tierOf(pt, 'ha'), super: LV.tierOf(pt, 'super') },
          ent: e ? { x: Math.round(e.x), y: Math.round(e.y), state: e.state, face: e.face || 'side', set: PRE[setPre(ctx, pt)], w: Math.round(pickImg(ctx, pt, e, frames(scarfFor(ctx))).img.width), h: Math.round(pickImg(ctx, pt, e, frames(scarfFor(ctx))).img.height) } : null,
          tgt: ST.tgt ? ST.tgt.id : null, beam: ST.beam ? { dir: ST.beam.dir, fired: ST.beam.fired, hits: ST.beam.hits || 0 } : null, haCd: +ST.haCd.toFixed(1), cine: !!ST.cine, bubble: ST.bubble && ST.bubble.text, nest: ST.nest && { tx: ST.nest.tx, ty: ST.nest.ty }, home: homeOf(ctx), stats: { ...ST.stats, log: ST.stats.log.slice(-12) }, chat: ST.chatOpen }; },
      chat: txt => chatSend(ctx, txt), parse: txt => LV.parseCmd(txt), cmd: k => setCmd(ctx, k), openChat: () => openChat(ctx), closeChat: () => closeChat(ctx),
      setLv: lv => { const pt = petOf(ctx); if (!pt) return null; pt.xp = LV.xpForLevel(lv); pt.hp = LV.maxHpOf(lv); ctx.persist(); return lvOf(pt); },
      xp: n => gainXp(ctx, n), hurt: d => { const pt = petOf(ctx); if (pt) rockyHurt(ctx, pt, d, null); },
      setSkill: (id, t) => { const pt = petOf(ctx); if (pt) { pt.skills[id] = t; ctx.persist(); } return pt && LV.tierOf(pt, id); },
      superNow: () => { const pt = petOf(ctx); return pt ? startSuper(ctx, pt) : false; }, superLeft: v => { const pt = petOf(ctx); if (pt && pt.superT > 0) pt.superT = v; },
      resetCd: () => { const pt = petOf(ctx); ST.haCd = 0; ST.punchCd = 0; if (pt) { pt.superCd = 0; pt.koT = 0; } }, koLeft: v => { const pt = petOf(ctx); if (pt) pt.koT = v; },
      place: (x, y, face) => { if (!ST.ent) return null; ST.ent.x = x; ST.ent.y = y; ST.ent.px = x; ST.ent.py = y; ST.idleT = 0; ST.ent.sit = false; if (face) ST.ent.face = face; return true; },
      book: (id, n) => readBook(ctx, id, n), canBook: (id, n) => { const pt = petOf(ctx); return pt ? LV.canBook(pt, id, n) : null; },
    };
  },

  onZoneLeave(ctx) {
    ST.sparkle = null; ST.fx.length = 0; ST.eggObj = null; ST.tgt = null; ST.beam = null; ST.hitQ.length = 0;
    if (ST.cine) endCine(ctx);
    if (ST.ent && (ST.ent.state === 'fetch' || ST.ent.state === 'dig')) ST.ent.state = 'follow';
    if (ctx.S.mode === 'petname') closeName(ctx);
    if (ctx.S.mode === 'chat') closeChat(ctx);
  },

  update(dt, ctx) {
    const s = sv(ctx), p = ctx.S.player; if (!p || !ctx.S.map) return;
    wrapHero(ctx);
    if (ST.lastP) {
      const d = Math.hypot(p.x - ST.lastP.x, p.y - ST.lastP.y);
      if (d > 0 && d < 40 && s.egg && !s.pet) {
        s.egg.walked += d / TS; s.egg.warmth = Math.min(1, s.egg.walked / HATCH_TILES);
        ST.persistT += dt;
        if (s.egg.walked >= HATCH_TILES) hatch(ctx);
        else if (ST.persistT > 4) { ST.persistT = 0; ctx.persist(); }
      }
    }
    ST.lastP = { x: p.x, y: p.y };
    updateFx(dt);
    if (!s.pet && ctx.story) {
      const st = ctx.story() || {};
      if ((st.act || 0) >= 2) { if (!(ctx.S.map && ctx.S.map.sea) && ctx.S.mode === 'play') giveRocky(ctx, true); }
      else if ((st.step || 0) & 1) giveRocky(ctx, false);
    }
    rollLoot.grown = !!(s.pet && s.pet.grown);
    if (s.pet) updatePet(dt, ctx);
    if (s.pet && ST.chatBtn) { ST.btnT = (ST.btnT || 0) - dt; if (ST.btnT <= 0) { ST.btnT = 1; placeChatBtn(); if (ST.chatOpen) placeChat(); } }
    else if (s.pet && typeof document !== 'undefined' && document.getElementById('touch')) chatUI(ctx);
  },

  near(ctx) {
    if (ctx.S.mode !== 'play') return null;
    const t = L(ctx), s = sv(ctx), p = ctx.S.player;
    if (ST.eggObj && ctx.S.map.objects.includes(ST.eggObj)) {
      const x = ST.eggObj.x * TS + 8, y = ST.eggObj.y * TS + 12;
      if (Math.hypot(x - p.x, y - p.y) < 26) return { label: t.takeEgg, x, y, limit: 26, priority: true, data: { egg: true } };
    }
    if (!s.pet || !ST.ent) return null;
    if (ctx.petHush && ctx.petHush()) return null;   /* 2026-10-11 Sàn Đấu Ngầm: trong sàn cát E dành cho đòn đánh, Rocky không giành */
    const e = ST.ent, d = Math.hypot(e.x - p.x, e.y - p.y); if (d > 30 || e.state === 'fetch' || e.state === 'dig' || e.state === 'ride') return null;   /* trên bè: E dành cho câu cá / bè, không vuốt ve */
    if (ST.tgt || ST.beam || ST.cine) return null;   /* plan-27: đang đánh nhau — E dành cho đòn của bạn */
    const n = s.pet.name;
    if (ST.holding) return { label: t.takeFrom(n), x: e.x, y: e.y, limit: 30, priority: true, data: { take: true } };
    const hk = ctx.heldKind ? ctx.heldKind() : null, busy = hk === 'tool' || hk === 'seed' || hk === 'place';
    const fx0 = p.dir === 1 ? -1 : p.dir === 2 ? 1 : 0, fy0 = p.dir === 0 ? 1 : p.dir === 3 ? -1 : 0, front0 = d > 0.5 && ((e.x - p.x) * fx0 + (e.y - p.y) * fy0) / d > 0.6;
    if (ctx.touchA && ctx.touchA() && !(front0 && d < 24)) return null;
    if (s.pet.hunger < 100 && foodInBag(ctx)) return { label: t.feed(n), x: e.x, y: e.y, limit: 30, data: { feed: true }, ...(front0 && d < 24 && !busy ? { priority: 1 } : {}) };
    if (ST.petCd <= 0) {
      const chop = busy && ctx.holding && (ctx.holding('axe') || ctx.holding('pickaxe') || ctx.holding('sword'));
      const pr = front0 && d < (busy ? 14 : 24) && (!busy || chop) ? (busy ? 0.5 : 1) : busy ? -1 : 0.006;
      return { label: t.pet(n), x: e.x, y: e.y, limit: 30, data: { pet: true }, priority: pr };
    }
    return null;
  },

  interact(ctx, cand) {
    const d = cand && cand.data; if (!d) return;
    if (d.egg) takeEgg(ctx);
    else if (d.take) giveLoot(ctx);
    else if (d.feed) feed(ctx);
    else if (d.pet) petIt(ctx);
  },

  key(code, ctx) {
    if ((code === 'Enter' || code === 'NumpadEnter') && ctx.S.mode === 'play' && petOf(ctx)) return openChat(ctx);   /* plan-27: Enter mở ô chat ra lệnh cho Rocky */
    if (code !== 'KeyN' || ctx.S.mode !== 'play') return false;
    const s = sv(ctx); if (!s.pet || !ST.ent) return false;
    const p = ctx.S.player; if (Math.hypot(ST.ent.x - p.x, ST.ent.y - p.y) > 40) return false;
    openName(ctx, true); return true;
  },

  drawables(ctx, cx, cy) {
    const s = sv(ctx), e = ST.ent, out = [];
    if (ST.nest) {   /* ổ của Rocky: ảnh PixelLab ui.rocky_nest (vẽ 1:1), Rocky ngồi trong ổ vẽ đè lên */
      const im = ctx.ART && ctx.ART.uiImg && ctx.ART.uiImg('rocky_nest'), n = ST.nest;
      if (im && n.x - cx > -40 && n.x - cx < ctx.VW + 40 && n.y - cy > -40 && n.y - cy < ctx.VH + 40) {
        const hi = ctx.ART.hi || 2, w = im.width / hi, h = im.height / hi;
        out.push({ y: n.y - 3, f: () => ctx.g.drawImage(im, Math.round(n.x - w / 2) - cx, Math.round(n.y + 3 - h) - cy, w, h) });   /* 5 tham số: canvas __hi — shim không nhân đôi toạ độ nguồn (bài học 2026-09-25) */
      }
    }
    if (!s.pet || !e) return out;
    const g = ctx.g, sx = e.x - cx, sy = e.y - cy;
    if (sx < -40 || sy < -50 || sx > ctx.VW + 40 || sy > ctx.VH + 40) return out;
    const pt = s.pet, scarfSet = frames(scarfFor(ctx)), pk = pickImg(ctx, pt, e, scarfSet), img = pk.img, setPx = pk.px || !!scarfSet.px;
    const hop = e.hop > 0 ? Math.round(Math.abs(Math.sin(e.hop * Math.PI * 4)) * 3) : (e.moving ? Math.round(Math.abs(Math.sin(e.ft * 1.6)) * 1) : 0);
    const iw = setPx ? img.width : 12, ih = setPx ? img.height : 14;   /* logicalCanvas: width/height đã là cỡ logic */
    const lunge = e.punchT > 0 ? Math.round(Math.sin((1 - e.punchT / 0.26) * Math.PI) * 3) : 0, ldx = (e.face === 'side' ? e.dir : 0) * lunge, ldy = e.face === 'ds' ? lunge : e.face === 'dn' ? -lunge : 0;
    const x0 = Math.round(e.x - iw / 2) + ldx, y0 = Math.round(e.y - ih) + (setPx ? 1 : 0) - hop + ldy, ghost = e.ghost > 0;
    out.push({
      y: e.y + (e.state === 'ride' ? 0.6 : 0), f: () => {
        const wet = e.state !== 'ride' && WATER.depth && WATER.depth(e.x, e.y);
        if (!wet) g.fillStyle = 'rgba(0,0,0,.25)', g.beginPath(), g.ellipse(Math.round(e.x) - cx, Math.round(e.y) - cy, Math.max(5, iw * 0.3), 2, 0, 0, TAU), g.fill();
        if (pt.superT > 0) {   /* hào quang CHỈ trong lúc Siêu Cấp (plan-27, anh chốt) — sheet PixelLab rk_aura_t*, vẽ 1:1 sau lưng */
          const a = sheetFrame(ctx, `rk_aura_t${LV.vfxTier(Math.max(1, LV.tierOf(pt, 'super')))}`, ctx.S.time) || sheetFrame(ctx, 'rk_aura_t1', ctx.S.time);
          if (a) { g.globalAlpha = 0.6; g.drawImage(a.img, a.loopF * a.w * a.hi, 0, a.w * a.hi, a.h * a.hi, Math.round(e.x - a.w / 2) - cx, Math.round(e.y + 3 - a.h) - cy, a.w, a.h); g.globalAlpha = 1; }
        }
        waterDraw(g, e.x, e.y, Math.round(e.x) - cx, Math.round(e.y) - cy, () => {
          const dark = ctx.isDarkPath && ctx.isDarkPath(), au = dark && ctx.ART && ctx.ART.vfx && ctx.ART.vfx.dark_aura;   /* plan-25: Rocky Bóng Tối — hào quang tím PixelLab sau lưng */
          if (au && au.img) { const n = au.n || 8, f = Math.floor(ctx.S.time * (au.fps || 12)) % n, hi = au.img.__hi ? 1 : 2, w = au.w * 0.5, h = au.h * 0.5; g.globalAlpha = 0.45; g.drawImage(au.img, f * au.w * hi, 0, au.w * hi, au.h * hi, Math.round(e.x - w / 2) - cx, Math.round(e.y - h + 2) - cy, w, h); g.globalAlpha = 1; }
          if (dark) g.filter = 'hue-rotate(230deg) saturate(1.3) brightness(0.75)';
          else if (e.hurt > 0) g.filter = 'brightness(1.6) saturate(0.6)';
          if (ghost) g.globalAlpha = 0.55;
          g.drawImage(img, x0 - cx, y0 - cy);   /* plan-27: mọi bộ hình vẽ 1:1 (bỏ phóng 1,3× của Rocky trưởng thành — cấp 5+ có bộ hình PixelLab lớn riêng) */
          const dy = (e.sit ? 2 : 0) + 3, ex = x0 - cx + (e.dir < 0 ? 3 : 4);
          g.fillStyle = RP.out;
          if (setPx) { /* sprite PixelLab đã có mắt */ }
          else if (e.blink > 0) { g.fillRect(ex, y0 - cy + dy + 1, 1, 1); g.fillRect(ex + 3, y0 - cy + dy + 1, 1, 1); }
          else { g.fillRect(ex, y0 - cy + dy, 1, 2); g.fillRect(ex + 3, y0 - cy + dy, 1, 2); }
          g.globalAlpha = 1; g.filter = 'none';
        });
        const helm = lvOf(pt) < 5 && !(pt.superT > 0) && ctx.isUnderwater && ctx.isUnderwater() && ctx.ART   /* anh 2026-10-12: Rocky cấp 5+ lặn không cần mũ */ && ctx.ART.uiImg && ctx.ART.uiImg('bubble_helm');
        if (helm) { const hw = Math.round(Math.max(16, iw + 5)), hh = Math.round(hw * helm.height / helm.width); g.drawImage(helm, Math.round(e.x - hw / 2) - cx, Math.round(e.y - Math.min(hh, ih + 4) * 0.98) - hop - cy, hw, hh); }
        if (ST.holding) {
          const c = { stone: '#8a8a96', wood: '#8a5a2e', rock: '#6f6a7a', leaf: '#4caa4f', flower: '#ff8fc8', berry: '#d0304a', shell: '#f5e6d0', pearl: '#ffffff' }[ST.holding.id] || '#ffd45e';
          const hx = x0 - cx + Math.round(iw / 2) - 2, hy = y0 - cy - 4 + Math.round(Math.sin(ctx.S.time * 4) * 1);
          g.fillStyle = RP.out; g.fillRect(hx - 1, hy - 1, 5, 5); g.fillStyle = c; g.fillRect(hx, hy, 3, 3); g.fillStyle = 'rgba(255,255,255,.7)'; g.fillRect(hx, hy, 1, 1);
        }
      }
    });
    return out;
  },

  // world-space effects: egg glow, the fetch sparkle, hearts / notes / dust, Rocky-ha beam
  draw(g, ctx, cx, cy) {
    const tm = ctx.S.time;
    if (ST.eggObj && ctx.S.map.objects.includes(ST.eggObj)) {
      const x = ST.eggObj.x * TS + 8 - cx, y = ST.eggObj.y * TS + 9 - cy;
      if (x > -30 && y > -30 && x < ctx.VW + 30 && y < ctx.VH + 30) {
        const k = 0.5 + 0.5 * Math.sin(tm * 2.2), r = 14 + k * 4;
        g.save(); g.globalCompositeOperation = 'lighter';
        const gr = g.createRadialGradient(x, y, 1, x, y, r); gr.addColorStop(0, `rgba(255,120,190,${(0.28 + k * 0.18).toFixed(3)})`); gr.addColorStop(1, 'rgba(255,120,190,0)');
        g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
        g.restore();
        g.fillStyle = 'rgba(255,214,234,.9)';
        g.fillRect(x - 6 + Math.round(Math.sin(tm * 1.7) * 3), y - 9 + Math.round(Math.cos(tm * 2.3) * 2), 1, 1);
        g.fillRect(x + 5 + Math.round(Math.cos(tm * 1.3) * 2), y - 3 + Math.round(Math.sin(tm * 1.9) * 3), 1, 1);
      }
    }
    if (ST.sparkle) {
      const sp = ST.sparkle, x = Math.round(sp.x) - cx, y = Math.round(sp.y) - 3 - cy, ph = sp.ph || 0;
      const k = 0.55 + 0.45 * Math.sin(ph * 6), r = 3 + Math.round(k * 2);
      g.fillStyle = `rgba(255,240,150,${(0.25 + k * 0.2).toFixed(2)})`; g.beginPath(); g.arc(x, y, r + 3, 0, TAU); g.fill();
      g.fillStyle = '#ffd45e'; g.fillRect(x - r, y, r * 2 + 1, 1); g.fillRect(x, y - r, 1, r * 2 + 1);
      g.fillStyle = '#ffffff'; g.fillRect(x - 1, y - 1, 3, 3);
      g.fillStyle = '#ffe9a0'; g.fillRect(x + 4 + Math.round(Math.sin(ph * 3) * 2), y - 5, 1, 1); g.fillRect(x - 5, y + 3 + Math.round(Math.cos(ph * 4) * 2), 1, 1);
    }
    const b = ST.beam, e = ST.ent;
    if (b && b.fired && e) {   /* luồng Rocky-ha: sheet PixelLab ngang rk_ha_t1/t4/t7 (dài đúng tầm), xoay 90° cho hướng dọc (giữ nét pixel) */
      const sh = sheetFrame(ctx, `rk_ha_t${LV.vfxTier(b.tier)}`, 0.42 - b.show);
      const ox = e.x - cx, oy = e.y - 7 - cy;
      g.save(); g.translate(Math.round(ox), Math.round(oy)); g.rotate([Math.PI / 2, Math.PI, 0, -Math.PI / 2][b.dir]);
      if (sh) { const lw = Math.min(sh.w, b.range + 4); g.drawImage(sh.img, sh.f * sh.w * sh.hi, 0, lw * sh.hi, sh.h * sh.hi, 2, -Math.round(sh.h / 2), lw, sh.h); }   /* cắt (không co giãn) theo tầm — giữ nét pixel 1:1 */
      else { g.fillStyle = 'rgba(255,240,170,.85)'; g.fillRect(4, -Math.round(b.w / 2), b.range, b.w); g.fillStyle = '#fff'; g.fillRect(4, -1, b.range, 2); }
      g.restore();
    }
    for (const p of ST.fx) {
      const k = Math.max(0, p.t / p.life), x = Math.round(p.x) - cx, y = Math.round(p.y) - cy;
      g.globalAlpha = Math.min(1, k * 1.5);
      if (p.k === 'heart') drawHeart(g, x - 2, y - 2, p.c);
      else if (p.k === 'dust') { g.fillStyle = p.c; g.fillRect(x, y, 2, 2); }
    }
    g.globalAlpha = 1;
  },

  // crisp overlay: ♪ notes, the hungry 🍖 thought bubble, reply bubble, level-up numbers, HP bar while fighting
  drawUI(ug, ctx, cx, cy, scale) {
    const s = sv(ctx), e = ST.ent; if (!s.pet || !e) return;
    const pt = s.pet, st = statsOf(pt);
    ug.save(); ug.textAlign = 'center'; ug.textBaseline = 'middle';
    for (const p of ST.fx) {
      if (p.k !== 'note') continue;
      const k = Math.max(0, p.t / p.life);
      ug.globalAlpha = Math.min(1, k * 1.6); ug.fillStyle = '#ffd45e'; ug.font = `bold ${Math.max(11, scale * 4)}px VT323, monospace`;
      ug.fillText('♪', (p.x - cx) * scale, (p.y - cy) * scale);
    }
    ug.globalAlpha = 1;
    const ih = Math.max(14, pickImg(ctx, pt, e, frames(scarfFor(ctx))).img.height || 14);
    if (pt.hunger < HUNGRY_AT && e.state !== 'ride' && e.state !== 'home' && !ST.bubble) {
      const bx = Math.round((e.x + 8 - cx) * scale), by = Math.round((e.y - ih - 8 - cy) * scale), r = Math.max(7, scale * 3.2);
      ug.fillStyle = 'rgba(255,255,255,.92)'; ug.beginPath(); ug.arc(bx, by, r, 0, TAU); ug.fill();
      ug.beginPath(); ug.arc(bx - r * 0.7, by + r * 0.9, r * 0.28, 0, TAU); ug.fill(); ug.beginPath(); ug.arc(bx - r * 1.05, by + r * 1.35, r * 0.16, 0, TAU); ug.fill();
      ug.fillStyle = '#1c1a24'; ug.font = `${Math.max(10, scale * 3.6)}px VT323, monospace`;
      ug.fillText('🍖', bx, by + 1);
    }
    if ((tgtShown(pt) || pt.hp < st.max * 0.999) && e.state !== 'home' && e.state !== 'ride') {   /* thanh máu nhỏ khi đang đánh / bị thương */
      const w = Math.round(16 * scale), x = Math.round((e.x - cx) * scale - w / 2), y = Math.round((e.y - ih - 3 - cy) * scale), k = Math.max(0, Math.min(1, pt.hp / st.max));
      ug.fillStyle = '#3a1c0c'; ug.fillRect(x - 1, y - 1, w + 2, Math.max(4, scale) + 2); ug.fillStyle = '#5a2a2a'; ug.fillRect(x, y, w, Math.max(4, scale));
      ug.fillStyle = k > 0.5 ? '#7bd04a' : k > 0.25 ? '#ffd45e' : '#ff5a5a'; ug.fillRect(x, y, Math.round(w * k), Math.max(4, scale));
    }
    if ((pt.koT || 0) > 0 && e.state === 'home') { ug.fillStyle = '#e8f0ff'; ug.font = `bold ${Math.max(12, scale * 4)}px VT323, monospace`; ug.fillText('z Z', (e.x + 8 - cx) * scale, (e.y - ih - 4 - cy) * scale); }
    for (const q of ST.pops) { ug.globalAlpha = Math.min(1, q.t * 1.5); ug.font = `bold ${Math.max(14, scale * 5)}px VT323, monospace`; ug.lineWidth = Math.max(2, scale * 0.8); ug.strokeStyle = '#3a1c0c'; ug.strokeText(q.txt, (q.x - cx) * scale, (q.y - cy) * scale); ug.fillStyle = q.c; ug.fillText(q.txt, (q.x - cx) * scale, (q.y - cy) * scale); }
    ug.globalAlpha = 1;
    if (ST.bubble) {   /* bong bóng lời Rocky */
      const fs = Math.max(13, Math.round(scale * 4.2)); ug.font = `${fs}px VT323, monospace`;
      const txt = ST.bubble.text, tw = Math.min(ug.measureText(txt).width, 260), pad = 6, bw = tw + pad * 2, bh = fs + pad, bx = Math.round((e.x - cx) * scale - bw / 2), by = Math.round((e.y - ih - 12 - cy) * scale - bh);
      ug.globalAlpha = Math.min(1, ST.bubble.t * 3);
      ug.fillStyle = '#3a1c0c'; ug.fillRect(bx - 2, by - 2, bw + 4, bh + 4); ug.fillStyle = '#fff8e8'; ug.fillRect(bx, by, bw, bh);
      ug.fillStyle = '#3a1c0c'; ug.fillRect(Math.round(bx + bw / 2 - 3), by + bh + 2, 6, 2); ug.fillRect(Math.round(bx + bw / 2 - 1), by + bh + 4, 2, 2);
      ug.fillStyle = '#3a1c0c'; ug.fillText(txt, bx + bw / 2, by + bh / 2 + 1, 260);
      ug.globalAlpha = 1;
    }
    ug.restore();
  },

  hudLines(ctx) {
    const t = L(ctx), s = sv(ctx);
    if (s.pet) { const pt = s.pet, lv = lvOf(pt); if ((pt.koT || 0) > 0) return [t.hudKo(pt.name, Math.ceil(pt.koT))]; if (pt.cmd === 'home') return [t.hudHome(pt.name, lv)]; return [t.hud(pt.name, lv, t.cmd[pt.cmd] || pt.cmd) + (pt.hunger < HUNGRY_AT ? t.hungry : '')]; }
    if (s.egg) return [t.eggHud(Math.min(100, Math.round(s.egg.walked / HATCH_TILES * 100)))];
    return [];
  }
};
function tgtShown(pt) { return !!(ST.tgt || ST.beam || pt.superT > 0); }

/* ---------------------------------------------------------------- sách luyện (plan-27 mục 6 — quầy Heathcliff gọi ctx.rocky.readBook) */
function readBook(ctx, id, n) {
  const pt = petOf(ctx); if (!pt) return { ok: false, why: 'nopet' };
  const c = LV.canBook(pt, id, n); if (!c.ok) return c;
  pt.skills[id] = n; ctx.persist();
  const t = L(ctx), S2 = LV.SKILLS[id], e = ST.ent;
  if (e) { e.hop = 0.45; hearts(e.x, e.y, 5); vfx1(ctx, `rk_book_t${LV.vfxTier(n)}`, e.x, e.y + 2, 'level_up', true); ST.pops.push({ x: e.x, y: e.y - 22, t: 1.6, txt: `${isVi(ctx) ? S2.vi : S2.en} ${n}/7`, c: '#8fd3ff' }); }
  ctx.sfx('rocky_happy'); ctx.toast(t.read(pt.name, isVi(ctx) ? S2.vi : S2.en, n), true);
  return { ok: true };
}
