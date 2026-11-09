/* fieldct.js — plan-74 ĐỢT 0 (p74, 01/11/2026, anh duyệt "Anh chốt"): QUÁI THƯỜNG → CHẤN THÚ trên map. Mẫu: LÀNG — Chuột Chũi (Chấn, loài phá hoại) + Cóc (Triều).
   · Mỗi thú là 1 mục ctx.monsters (monsters.js: SP.village = FIELD_SP.village, c.aiFn / c.drawFn / c.onFall) → kiếm, Rocky, linh thú đánh trúng như quái cũ; giữ id đồ rơi (gel → kiếm 2).
   · Ngày: TRUNG LẬP (đi lang thang). Bị đánh (kiếm / Rocky / linh thú) → nó + đồng loại trong 3 ô quay sang đánh lại.
     Đêm: loài PHÁ HOẠI (Chuột Chũi) hung + KHÓ hơn rõ (máu ×1,7, sức ×1,4, hồi chiêu ×0,7, nhanh ×1,3, cấp +2), gặm cây trồng / săn dân như quái cũ; Cóc vẫn trung lập.
   · Chiêu "y chang sàn đấu": cùng id chiêu + clip PixelLab + cảnh VFX code (duelfx / pxfx_full) — bản ngoài map: vạch báo trước ≥ 0,5 s trên đất (tuyệt chiêu: vòng / dải ĐỎ 1 s),
     hồi chiêu ×1,5, sát thương theo % máu tối đa người chơi (trần 35 % mỗi 3 s), đòn mạnh hất BAY cả người chơi lẫn Rocky (knock 'fly'), đòn thường lảo đảo.
     Trúng theo VỊ TRÍ (không xét hướng mặt) → người đứng sau lưng / hai bên / sau vật cản vẫn trúng chiêu vùng; AI không có vùng chết (tiến lại khi > 18 px, đánh khi ≤ 22 px).
   · ≤ 8 thú chạy AI đầy đủ (gần người chơi nhất, trong 1,5 màn), ≤ 2 cảnh VFX chiêu cùng lúc, 1 tuyệt chiêu một lúc; thú ngoài màn không ra chiêu.
   · Máu ≤ 30 % → choáng 4 s (1 lần) + nút nhỏ "Ấn Thu" dưới chân (phím E / nút A) — bắt ngay trên map (ảnh Ấn Thu PixelLab như trong trận).
     Thú chưa nổi giận: đến gần bấm E → trận Chấn Thú 1v1 như cũ (luồng p52c, sân tạm).
   · TIỀM NĂNG (phương án A): hạ thú → +Tiềm Năng của HỆ thú đó (cấp ÷ 2, đêm ×1,5) lưu save.sys.chanthu.tn = { chan, trieu, … } (save cũ thiếu → 0);
     bảng Tiềm Năng (chip nổi sau khi nhận / nút trong bảng Đội ở bệ Ấn Chấn / phím T): rót vào Chấn Thú CÙNG HỆ trong đội + kho để lên 1 cấp. */
import { SPECIES, MOVES, TYPE_NAME, TYPE_COLOR, TYPES, LT_UNLOCK, SPECIES_EN, TYPE_EN, MOVE_NAME_EN } from './duel-data.js';
import * as DFX from './duelfx.js';
import { PAL_SRC } from './pxfx.js';
import { SHADOW, shadowFor } from './shadow.js';
import * as LV from './petlv.js';
import { T as TT } from '../gfx.js';
import { learnedOf, LEARN as LEARN78 } from './duel-data.js';   /* p78 */
import { evoStart, evoUpdate, evoBody, evoGround, evoDrawables, fxPowerOf, fxPower } from './fieldevo.js';   /* cảnh tiến hoá vẽ code */

const BASE = 'assets/px/';
const TS = 16;

/* ---------- loài trên map (đợt 0: Làng) ---------- */
const FSP = {
  chuichui: { he: 'chan', pest: true, en: 'Amethyst Mole', hp: 40, xp: 7, sp: 30, w: 14, h: 15, shw: 11, moves: ['huc', 'mua_da_lo', 'manh_pha_le', 'don_tho'], ult: 'dai_dia_chan' },
  coc: { he: 'trieu', pest: false, en: 'Rain-Call Toad', hp: 36, xp: 6, sp: 26, w: 12, h: 15, shw: 10, aqua: true, moves: ['huc', 'luoi_dinh', 'bong_giam', 'dap_vung'], ult: 'thuy_phao' },
};
/* chiêu ngoài map: kind melee | area (vùng ở chỗ người chơi) | line (đạn / lưỡi / tia từ miệng) | dig (chui đất, trồi dưới chân) | hop (nhảy dập) ; frac = phần máu tối đa người chơi */
const MV = {
  huc: { kind: 'melee', range: 22, tel: 0.32, frac: 0.06, knock: 'stagger', cd: 1.3, clip: 'atk' },
  mua_da_lo: { kind: 'area', range: 120, r: 22, tel: 0.75, frac: 0.12, knock: 'stagger', clip: 'cast' },
  manh_pha_le: { kind: 'line', range: 120, wid: 12, tel: 0.55, frac: 0.11, knock: 'stagger', clip: 'cast' },
  don_tho: { kind: 'dig', range: 110, r: 20, tel: 0.85, frac: 0.15, knock: 'fly', clip: 'dig' },
  dai_dia_chan: { kind: 'area', ult: true, range: 115, r: 42, tel: 1.0, frac: 0.21, knock: 'fly', clip: 'ult' },
  luoi_dinh: { kind: 'line', range: 100, wid: 12, tel: 0.55, frac: 0.10, knock: 'stagger', pull: true, clip: 'cast' },
  bong_giam: { kind: 'line', range: 115, wid: 14, tel: 0.6, frac: 0.10, knock: 'stagger', clip: 'cast' },
  dap_vung: { kind: 'hop', range: 100, r: 28, tel: 0.6, frac: 0.14, knock: 'stagger', clip: 'atk' },
  thuy_phao: { kind: 'line', ult: true, range: 130, wid: 22, tel: 1.0, frac: 0.21, knock: 'fly', clip: 'ult' },
  /* p78: kho chiêu hệ Chấn ngoài map — VFX ở fx78 (kho78.fieldCast / fieldResolve) */
  da_vun_ban: { kind: 'line', range: 120, wid: 12, tel: 0.55, frac: 0.12, knock: 'stagger', clip: 'cast', fx78: 1 },
  dao_ham_vo: { kind: 'dig', range: 120, r: 18, tel: 1.1, frac: 0.16, knock: 'fly', clip: 'dig', fx78: 1 },
  cat_lun: { kind: 'area', range: 120, r: 24, tel: 0.65, frac: 0.05, knock: 'stagger', clip: 'cast', fx78: 1 },
  son_bang: { kind: 'line', ult: true, range: 150, wid: 24, tel: 1.0, frac: 0.22, knock: 'fly', clip: 'ult', fx78: 1 },
};
const ZLV = { village: [2, 4] };
const NIGHT = { hp: 1.7, dmg: 1.4, cd: 0.7, gcd: 0.6, sp: 1.3, tel: 0.85, lv: 2, aggro: 110, tn: 1.5 };
const AWAKE_MAX = 8, SCENE_MAX = 2, CAP = { frac: 0.35, win: 3 }, STUN_T = 4, CATCH_AT = 0.3;
const FPSD = { idle: 8, run: 14, atk: 14, cast: 12, ult: 12, dig: 12, faint: 10 }, IMPACT = { atk: 3, cast: 4, ult: 8, dig: 3 };
const OLD2NEW_MAP = { slime: 'chuichui' };   /* save cũ: khoá quái cũ trong skyRoster (monsters.restoreRoster) */
export const OLD2NEW = k => OLD2NEW_MAP[k] || k;

const STR = {
  vi: { duel: (n, lv) => `⚔ Đấu ${n} Lv${lv}`, anthu: n => `◉ Ấn Thu (${n})`, noBall: 'Hết Ấn Thu — mua ở Thương nhân', caught: n => `Bắt được ${n}!`, fail: n => `${n} thoát khỏi Ấn Thu!`,
    tn: (n, h) => `+${n} Tiềm Năng ${h}`, tnT: '✦ Tiềm Năng', tnLead: 'Hạ Chấn Thú hoang → Tiềm Năng của đúng hệ nó. Rót vào Chấn Thú CÙNG HỆ để lên cấp.', up: (lv, c, h) => `▲ Lv${lv} · ${c} ${h}`,
    none: 'Chưa có Chấn Thú nào — chọn con khởi đầu ở bệ Ấn Chấn (Làng) hoặc bắt thú hoang.', close: 'Đóng', upd: (n, lv) => `${n} lên Lv${lv}!`, chip: '✦ Tiềm Năng', crop: n => `${n} đang gặm cây trồng!`,
    angry: n => `${n} nổi giận!`, stun: 'CHOÁNG', noStarter: 'Chưa có Chấn Thú — về Làng chọn con khởi đầu (3 Ấn Chấn cạnh lối vào).', btnTN: '✦ Tiềm Năng', newMove: (n, m) => `✦ ${n} mở chiêu mới: ${m}!`, moves: (k, n) => `Chiêu ${k}/${n}`, next: (lv, m) => `Lv${lv}: ${m}` },
  en: { duel: (n, lv) => `⚔ Battle ${n} Lv${lv}`, anthu: n => `◉ Seal Stone (${n})`, noBall: 'No Seal Stones — buy at the Merchant', caught: n => `Caught ${n}!`, fail: n => `${n} broke free!`,
    tn: (n, h) => `+${n} ${h} Potential`, tnT: '✦ Potential', tnLead: 'Defeat wild beasts → Potential of their type. Spend it on beasts of the SAME type to level up.', up: (lv, c, h) => `▲ Lv${lv} · ${c} ${h}`,
    none: 'No beasts yet — pick a starter at the Seal pad (Village) or catch a wild one.', close: 'Close', upd: (n, lv) => `${n} reached Lv${lv}!`, chip: '✦ Potential', crop: n => `${n} is gnawing your crops!`,
    angry: n => `${n} is angry!`, stun: 'DAZED', noStarter: 'No beasts yet — go back to the Village and pick a starter (3 orbs by the entrance).', btnTN: '✦ Potential', newMove: (n, m) => `✦ ${n} learned a new move: ${m}!`, moves: (k, n) => `Moves ${k}/${n}`, next: (lv, m) => `Lv${lv}: ${m}` },
};
const L = ctx => STR[ctx.lang() === 'en' ? 'en' : 'vi'];
const spName = (ctx, sp) => (ctx.lang() === 'en' ? SPECIES_EN[sp] || sp : (SPECIES[sp] ? SPECIES[sp].name : sp));
const nmOf = (ctx, m) => (m.name && !(SPECIES[m.sp] && m.name === SPECIES[m.sp].name) ? m.name : spName(ctx, m.sp));   /* tên mặc định (tên loài tiếng Việt) → theo ngôn ngữ */
const heName = (ctx, he) => (ctx.lang() === 'en' ? TYPE_EN[he] || he : TYPE_NAME[he] || he);
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

/* ---------- cấu hình monsters.js ---------- */
function mkCfg(sp) {
  const F = FSP[sp], s = SPECIES[sp];
  return { key: sp, fct: sp, vi: s ? s.name : sp, en: SPECIES_EN[sp] || F.en, hp: F.hp, dmg: 9, armor: 0, sp: F.sp, xp: F.xp, drop: 'gel', w: F.w, h: F.h, c: [TYPE_COLOR[F.he], '#352022', '#fff6c8'], aqua: !!F.aqua,
    aiFn: aiCT, drawFn: drawCT, onFall: onFallCT, promptDy: 16 };   /* nhãn 'E · Đánh …' xuống dưới chân — không che thú (điện thoại) */
}
const CFG = { chuichui: mkCfg('chuichui'), coc: mkCfg('coc') };
export const FIELD_CFG = CFG;
export const FIELD_SP = { village: { ...CFG.chuichui, vi: 'Chuột Chũi', en: 'Amethyst Moles', mix: [CFG.chuichui, CFG.chuichui, CFG.coc], day: 6, night: 12, steal: null } };

/* ---------- ảnh (cùng gói sprite trận) ---------- */
const IMG = {}; let SPR = null, sprP = null; const ANTM = {}; let antP = null;
function img(src) { if (!IMG[src]) { const i = new Image(); i.src = BASE + src; IMG[src] = i; } const i = IMG[src]; return i.complete && i.naturalWidth ? i : null; }
function loadSpr() {
  if (!sprP) sprP = fetch(BASE + 'linhduel/duel_sprites.json').then(r => r.json()).then(j => { SPR = j; for (const sp of Object.keys(FSP)) for (const c of Object.values(j[sp] || {})) if (c && c.file) img(c.file); }).catch(() => { sprP = null; });
  if (!antP) antP = Promise.all(['anthu_spin', 'anthu_shake', 'anthu_ok', 'anthu_fail'].map(id => fetch(BASE + 'duel/anthu/' + id + '.json').then(r => (r.ok ? r.json() : null)).then(j => { if (!j) return; ANTM[id] = { n: j.n, w: j.fw, h: j.fh, ax: j.ax, ay: j.ay, fps: j.fps || 12, file: 'duel/anthu/' + id + '.png' }; img(ANTM[id].file); }).catch(() => { })));
  img('duel/anthu/anthu_icon.png');
}
const WHITE = new Map();
function whiteOf(im) {   /* bản trắng của sheet (chớp trúng đòn) — canvas KHÔNG __hi (luật 25/09) */
  let c = WHITE.get(im); if (c) return c; c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight; const x = c.getContext('2d');
  x.drawImage(im, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = '#ffffff'; x.fillRect(0, 0, c.width, c.height); WHITE.set(im, c); return c;
}
const GOLD = new Map();
function goldOf(im) { let c = GOLD.get(im); if (c) return c; c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight; const x = c.getContext('2d'); x.drawImage(im, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = '#ffe7a8'; x.fillRect(0, 0, c.width, c.height); GOLD.set(im, c); return c; }
function rowOf(c, fx, fy) {   /* hàng theo hướng nhìn (8 hướng; W = lật E; thiếu hàng chéo → hàng gần nhất) */
  const ax = Math.abs(fx), rows = c.rows; let d, flip = fx < -0.05;
  if (fy > 0.38 && ax < 0.92) d = ax > 0.38 ? 'south-east' : 'south'; else if (fy < -0.38 && ax < 0.92) d = ax > 0.38 ? 'north-east' : 'north'; else d = 'east';
  let r = rows.indexOf(d); if (r < 0) { d = d === 'south-east' ? (ax > 0.6 ? 'east' : 'south') : d === 'north-east' ? (ax > 0.6 ? 'east' : 'north') : d; r = rows.indexOf(d); }
  if (r < 0) r = 0; if (d === 'south' || d === 'north') flip = false; return { r, flip };
}
function clipOf(mo, cl) { const S0 = SPR && SPR[mo.sp]; return S0 && (S0[cl] || S0.idle); }
function clipLen(mo, cl) { const c = clipOf(mo, cl); return c ? c.n / (c.fps || FPSD[cl] || 12) : 0.5; }
function impactT(mo, cl) { const c = clipOf(mo, cl); return ((IMPACT[cl] ?? 3) + 0.5) / ((c && c.fps) || FPSD[cl] || 12); }

/* ---------- trạng thái chung ---------- */
const ST = { ctx: null, awake: new Set(), casts: [], marks: [], dmgLog: [], catch: null, log: [], stats: {}, ultBusy: null, chipT: 0, panel: false, warnT: -99, prewarmed: false, errs: 0 };
const vi = ctx => ctx.lang() !== 'en';
const night = ctx => !!(ctx.clock && ctx.clock.isNight && ctx.clock.isNight());
const duelOn = ctx => !!(ctx.duel && ctx.duel.active && ctx.duel.active());
function log(o) { ST.log.push({ t: +(ST.ctx ? ST.ctx.S.time : 0).toFixed(2), ...o }); if (ST.log.length > 400) ST.log.shift(); }
function stat(k) { ST.stats[k] = (ST.stats[k] || 0) + 1; }
function walkPx(ctx, x, y, aqua) {
  const m = ctx.S.map, tx = Math.floor(x / TS), ty = Math.floor(y / TS); if (tx < 1 || ty < 1 || tx >= m.w - 1 || ty >= m.h - 1) return false;
  const g = ctx.getG(m, tx, ty);
  if (g === TT.DEEP || g === TT.LAVA) return false;
  if (g === TT.WATER) return !!aqua && !(ctx.hasObjectAt && ctx.hasObjectAt(m, tx, ty));   /* Cóc lội nước nông (chìm nửa người — waterDraw của monsters.js) */
  return !ctx.isSolid(m, tx, ty);
}
function nearWalk(ctx, x, y, aqua) { if (walkPx(ctx, x, y, aqua)) return { x, y }; for (let r = 6; r <= 48; r += 6) for (let a = 0; a < 8; a++) { const nx = x + Math.cos(a * Math.PI / 4) * r, ny = y + Math.sin(a * Math.PI / 4) * r; if (walkPx(ctx, nx, ny, aqua)) return { x: nx, y: ny }; } return null; }

/* ---------- khởi tạo thú (lần đầu AI chạy) ---------- */
function initMo(ctx, mo) {
  const sp = mo.c.fct, F = FSP[sp], z = ZLV[ctx.S.zone.id] || [2, 4];
  mo.sp = sp; mo.clip = 'idle'; mo.ct = Math.random() * 2; mo.fx = Math.random() < 0.5 ? -1 : 1; mo.fy = 0.3; mo.alt = 0;
  const lv = mo.c.lv78 || (z[0] + ((Math.random() * (z[1] - z[0] + 1)) | 0));   /* p78: thú hoang cấp đặt sẵn (link thử / vùng sau) */
  mo.F = { lv0: lv, lv, nt: false, base: Math.round(mo.max * (1 + 0.12 * (lv - 2))), cds: {}, gcd: 1 + Math.random(), cast: null, stunT: 0, stunDone: false, ultUsed: false, angryT: 0, calmT: 0, hp0: 0, home: { x: mo.x, y: mo.y }, wait: Math.random() * 2, goal: null, stuck: 0, lastXY: { x: mo.x, y: mo.y }, eat: 0, wcd: 0 };
  const k0 = Math.max(0.05, Math.min(1, mo.hp / (mo.max || 1))); mo.max = mo.F.base; mo.hp = Math.max(1, Math.round(mo.max * k0)); mo.F.hp0 = mo.hp;
  for (const id of F.moves) mo.F.cds[id] = id === 'huc' ? 0 : 1.5 + Math.random() * 3;
  { const L78 = learnedOf(sp, lv); mo.F.mvs = F.moves.concat(L78.filter(id => MV[id] && MV[id].fx78 && !MV[id].ult && !F.moves.includes(id))); mo.F.ult78 = L78.filter(id => MV[id] && MV[id].ult).pop() || F.ult; for (const id of mo.F.mvs) if (mo.F.cds[id] == null) mo.F.cds[id] = 1.5 + Math.random() * 3; }   /* p78: thú hoang cấp cao biết thêm chiêu kho */
}
function nightTune(ctx, mo) {   /* đêm: loài phá hoại khó hơn (máu / cấp); ngày trở lại thì về như cũ (giữ tỉ lệ máu) */
  const F = mo.F, on = night(ctx) && FSP[mo.sp].pest; if (on === F.nt) return; F.nt = on;
  const k = mo.hp / mo.max; mo.max = Math.round(F.base * (on ? NIGHT.hp : 1)); mo.hp = Math.max(1, Math.round(mo.max * k)); F.hp0 = mo.hp; F.lv = F.lv0 + (on ? NIGHT.lv : 0);
  log({ ev: on ? 'night_on' : 'night_off', id: mo.id, sp: mo.sp, max: mo.max });
}
const K = (mo, k) => (mo.F.nt ? NIGHT[k] : 1);

/* ---------- AI (gọi từ monsters.update qua c.aiFn) ---------- */
function aiCT(ctx, mo, dt, p, dp, canHit) {
  try { aiCT0(ctx, mo, dt, p, dp, canHit); } catch (e) { ST.errs++; if (ST.errs < 5) console.error('fieldct ai', e); }
}
function aiCT0(ctx, mo, dt, p, dp, canHit) {
  if (!mo.F) initMo(ctx, mo);
  const F = mo.F; if (duelOn(ctx)) return;
  mo.ct += dt; nightTune(ctx, mo);
  for (const k in F.cds) if (F.cds[k] > 0) F.cds[k] -= dt; if (F.gcd > 0) F.gcd -= dt; if (F.wcd > 0) F.wcd -= dt;
  if (mo.hp < F.hp0 - 0.01) { provoke(ctx, mo, true); }   /* trúng đòn (kiếm / Rocky / linh thú qua ctx.monsters.damage) */
  F.hp0 = mo.hp;
  if (ST.catch && ST.catch.mo === mo) { mo.clip = 'idle'; return; }
  if (!F.stunDone && mo.hp <= mo.max * CATCH_AT && mo.hp > 0) { F.stunDone = true; F.stunT = STUN_T; cancelCast(mo, 'stun'); mo.angry = true; log({ ev: 'stun', id: mo.id }); stat('stun'); if (ctx.pop) ctx.pop(mo.x, mo.y - 24, L(ctx).stun, '#ffe08a'); }
  if (F.stunT > 0) { F.stunT -= dt; mo.clip = 'idle'; return; }
  if (F.cast) { updCast(ctx, mo, dt, p); return; }
  const awake = ST.awake.has(mo), hostile = canHit && (mo.angry || (F.nt && dp < NIGHT.aggro)) && !(ctx.knocked && ctx.knocked() && dp > 60);
  if (mo.angry) { if (dp > 240) { F.calmT += dt; if (F.calmT > 4) { mo.angry = false; F.calmT = 0; log({ ev: 'calm', id: mo.id }); } } else F.calmT = 0; }
  if (hostile && awake) { fight(ctx, mo, dt, p, dp); return; }
  if (F.nt && awake && pest(ctx, mo, dt)) return;
  wander(ctx, mo, dt, awake ? 1 : 0.6);
}
function provoke(ctx, mo, spread) {
  const was = mo.angry; mo.angry = true; mo.F.calmT = 0; if (!was) { log({ ev: 'angry', id: mo.id, sp: mo.sp }); stat('angry'); }
  if (!spread) return;
  const L0 = ctx.monsters && ctx.monsters.list ? ctx.monsters.list() : [];
  for (const o of L0) if (o !== mo && o.c && o.c.fct === mo.c.fct && !o.angry && dist(o, mo) <= 48 && o.F) { o.angry = true; o.F.calmT = 0; log({ ev: 'ally', id: o.id, from: mo.id }); stat('ally'); }   /* đồng loại trong 3 ô quay sang đánh */
}
function face(mo, x, y) { const dx = x - mo.x, dy = y - mo.y, d = Math.hypot(dx, dy); if (d > 0.5) { mo.fx = dx / d; mo.fy = dy / d; mo.dir = dx >= 0 ? 1 : -1; } }
function step(ctx, mo, tx, ty, sp, dt) {   /* đi 8 hướng có va chạm (chặn trục nào bỏ trục đó); trả quãng đi được */
  const dx = tx - mo.x, dy = ty - mo.y, d = Math.hypot(dx, dy); if (d < 0.8) return 0; const s = Math.min(d, sp * dt), vx = dx / d * s, vy = dy / d * s, aq = !!mo.c.aqua; let moved = 0;
  if (walkPx(ctx, mo.x + vx, mo.y, aq)) { mo.x += vx; moved += Math.abs(vx); } if (walkPx(ctx, mo.x, mo.y + vy, aq)) { mo.y += vy; moved += Math.abs(vy); }
  mo.fx = dx / d; mo.fy = dy / d; mo.dir = dx >= 0 ? 1 : -1; mo.clip = moved > 0.05 ? 'run' : 'idle'; return moved;
}
function wander(ctx, mo, dt, k) {
  const F = mo.F; if (F.wait > 0) { F.wait -= dt; mo.clip = 'idle'; return; }
  if (!F.goal) { const a = Math.random() * Math.PI * 2, r = 16 + Math.random() * 56, gx = F.home.x + Math.cos(a) * r, gy = F.home.y + Math.sin(a) * r * 0.7; if (walkPx(ctx, gx, gy, mo.c.aqua)) F.goal = { x: gx, y: gy }; else { F.wait = 0.4; return; } }
  const mv = step(ctx, mo, F.goal.x, F.goal.y, mo.c.sp * 0.45 * k, dt);
  if (dist(mo, F.goal) < 2 || mv < 0.01) { F.goal = null; F.wait = 1.2 + Math.random() * 2.6; mo.clip = 'idle'; }
}
function pest(ctx, mo, dt) {   /* đêm, loài phá hoại: gặm cây trồng → không có cây thì săn dân (như quái cũ) */
  const F = mo.F, sp = mo.c.sp * NIGHT.sp;
  if (!F.goal || F.goal.kind === 'wander' || (F.goalT = (F.goalT || 0) - dt) <= 0) {
    F.goalT = 3; F.goal = null;
    if (ctx.farmCrops) { const cr = ctx.farmCrops(); let best = null, bd = 520; for (const t of cr) { const d = Math.hypot(t.tx * 16 + 8 - mo.x, t.ty * 16 + 10 - mo.y); if (d < bd) { bd = d; best = t; } } if (best) F.goal = { kind: 'crop', tx: best.tx, ty: best.ty }; }
    if (!F.goal && ctx.villagers && ctx.villagers.alive) { let best = null, bd = 420; for (const n of ctx.villagers.alive()) { if (n.hurtSit) continue; const d = dist(mo, n); if (d < bd) { bd = d; best = n; } } if (best) F.goal = { kind: 'npc', n: best }; }
  }
  const g = F.goal; if (!g) return false;
  if (g.kind === 'crop') {
    const x = g.tx * 16 + 8, y = g.ty * 16 + 12; if (Math.hypot(x - mo.x, y - mo.y) > 6) { step(ctx, mo, x, y, sp, dt); F.eat = 0; F.goalT = 3; return true; }
    mo.clip = 'atk'; F.eat += dt; if (F.eat > 3 && ctx.farmSteal) { if (ctx.farmSteal(g.tx, g.ty)) { stat('crop'); log({ ev: 'crop', id: mo.id }); if (ctx.S.time - ST.warnT > 8) { ST.warnT = ctx.S.time; ctx.toast(L(ctx).crop(spName(ctx, mo.sp))); } } F.goal = null; F.eat = 0; }
    return true;
  }
  if (g.kind === 'npc') {
    if (!ctx.S.npcs.includes(g.n) || g.n.hurtSit) { F.goal = null; return false; }
    if (dist(mo, g.n) > 12) { step(ctx, mo, g.n.x, g.n.y, sp, dt); return true; }
    face(mo, g.n.x, g.n.y); mo.clip = 'idle'; if (F.wcd <= 0) { F.wcd = 1.5; mo.clip = 'atk'; mo.ct = 0; if (ctx.villagers) ctx.villagers.hurt(g.n, 3, mo); stat('npc'); }
    return true;
  }
  return false;
}

/* ---------- chọn & ra chiêu ---------- */
function fight(ctx, mo, dt, p, dp) {
  const F = mo.F, S0 = FSP[mo.sp], MS0 = F.mvs || S0.moves, US0 = F.ult78 || S0.ult;   /* p78 */
  /* chiêu đường thẳng (đạn / lưỡi / cột nước): cảnh VFX sàn đấu dựng theo trục NGANG → thú bước sang cùng hàng với người chơi trước (≤ 2,5 s) rồi mới bắn */
  const wantUlt = !F.ultUsed && mo.hp < mo.max * 0.4 && !ST.ultBusy, lineR = MS0.concat(wantUlt ? [US0] : []).filter(id => MV[id].kind === 'line' && (MV[id].ult ? wantUlt : (F.cds[id] || 0) <= 0) && dp <= MV[id].range + 30);
  const al = aligned(mo, p); if (al || !lineR.length) F.alignT = 0;
  let gx = p.x, gy = p.y, near = 18; if (lineR.length && !al && (F.alignT || 0) < 2.5) { F.alignT = (F.alignT || 0) + dt; const sd = mo.x >= p.x ? 1 : -1, ax = p.x + sd * 58; gx = walkPx(ctx, ax, p.y, mo.c.aqua) ? ax : p.x - sd * 58; gy = p.y; near = 3; }
  if (Math.hypot(gx - mo.x, gy - mo.y) > near) { const mv = step(ctx, mo, gx, gy, mo.c.sp * 1.1 * K(mo, 'sp'), dt); F.stuck = mv < mo.c.sp * dt * 0.25 ? F.stuck + dt : Math.max(0, F.stuck - dt); if (dp <= 22) face(mo, p.x, p.y); }
  else { face(mo, p.x, p.y); mo.clip = 'idle'; F.stuck = 0; }
  if (F.gcd > 0 || !onScreen(ctx, mo)) return;
  /* tuyệt chiêu: máu < 40 %, 1 lần mỗi trận, 1 tuyệt chiêu một lúc trên cả map */
  if (wantUlt && dp <= MV[US0].range && (MV[US0].kind !== 'line' || al || (F.alignT || 0) >= 2.5)) { startCast(ctx, mo, US0, p); return; }
  const ready = MS0.filter(id => id !== 'huc' && (F.cds[id] || 0) <= 0 && dp <= MV[id].range && (MV[id].kind !== 'line' || al || (F.alignT || 0) >= 2.5));
  if (ready.length && (dp > 22 || Math.random() < 0.55 || F.stuck > 0.6)) { const pool = ready.flatMap(id => (MV[id].kind === 'dig' && dp < 30 ? [id] : [id, id, id])); startCast(ctx, mo, pool[(Math.random() * pool.length) | 0], p); return; }   /* chui đất khi đã sát người: ít hơn */
  if (dp <= 22 && (F.cds.huc || 0) <= 0) { startCast(ctx, mo, 'huc', p); return; }
  if (F.stuck > 1.2) { const any = MS0.filter(id => id !== 'huc' && dp <= MV[id].range); if (any.length) { const id = any.sort((a, b) => (F.cds[a] || 0) - (F.cds[b] || 0))[0]; F.cds[id] = 0; startCast(ctx, mo, id, p); F.stuck = 0; } }   /* bị vật cản chặn lâu → chiêu vùng tới chỗ người chơi (không đứng chết) */
}
function aligned(mo, p) { const dx = Math.abs(p.x - mo.x), dy = Math.abs(p.y - mo.y); return dx >= 26 && dy <= Math.max(8, dx * 0.4); }
function onScreen(ctx, mo) { const c = ctx.cam, VW = ctx.VW || 320, VH = ctx.VH || 200; if (!c) return true; return mo.x > c.cx - 8 && mo.x < c.cx + VW + 8 && mo.y > c.cy - 4 && mo.y < c.cy + VH + 24; }
function sceneCount() { return DFX.list().filter(s => !s.dead).length; }
function startCast(ctx, mo, id, p) {
  const M = MV[id], F = mo.F, nt = F.nt, tel = Math.max(id === 'huc' ? 0.25 : 0.5, M.tel * (nt && !M.ult ? NIGHT.tel : 1));
  let tgt = { x: p.x, y: p.y };
  if (M.kind === 'line') { const d = dist(mo, p) || 1, L0 = Math.min(M.range, d + 18); tgt = { x: mo.x + (p.x - mo.x) / d * L0, y: mo.y + (p.y - mo.y) / d * L0 }; }
  face(mo, p.x, p.y);
  const c = { id, M, t: 0, tel, tgt, aim: { x: p.x, y: p.y }, o: { x: mo.x, y: mo.y }, he: MOVES[id] ? MOVES[id].type : FSP[mo.sp].he, sc: null, done: false, clipAt: Math.max(0, tel - impactT(mo, M.clip)), hop: null, dig: null };
  if (M.kind === 'hop') { const dx = p.x - mo.x, dy = p.y - mo.y, d = Math.hypot(dx, dy) || 1, land = nearWalk(ctx, p.x - dx / d * 12, p.y - dy / d * 5, mo.c.aqua) || nearWalk(ctx, p.x, p.y, mo.c.aqua) || { x: p.x, y: p.y };   /* sát mép bản đồ: không tìm được ô cạnh người chơi → đáp ngay chỗ người chơi (trước: đứng yên tại chỗ, hụt) */ c.hop = { x0: mo.x, y0: mo.y, x1: land.x, y1: land.y }; c.tgt = { x: land.x, y: land.y }; }
  if (M.kind === 'dig') { const e = nearWalk(ctx, p.x, p.y + 2, mo.c.aqua) || { x: p.x, y: p.y }; c.dig = { x0: mo.x, y0: mo.y, ex: e.x, ey: e.y }; }
  F.cast = c; F.gcd = (nt ? NIGHT.gcd : 1) * (1.4 + Math.random() * 0.9) + tel;
  const cd0 = id === 'huc' ? M.cd : (MOVES[id] ? MOVES[id].cd : 5) * 1.5; F.cds[id] = cd0 * (nt ? NIGHT.cd : 1);
  if (M.ult) { F.ultUsed = true; ST.ultBusy = mo; ultTag(ctx, mo, id); }
  /* cảnh VFX code của sàn đấu: hẹn sao cho cú trúng chính của cảnh rơi đúng lúc hết vạch báo */
  const kind = !M.fx78 && DFX.CODE && DFX.sceneOf(id); if (M.fx78 && ctx.kho78) try { ctx.kho78.fieldCast(mo, c, p); } catch (e) { if (ST.errs++ < 5) console.error('k78 cast', e); }   /* p78 */
  if (kind && M.kind !== 'dig' && M.kind !== 'hop' && sceneCount() < SCENE_MAX) {
    try { const I = DFX.info(kind), mainT = I && I.main >= 0 ? I.hits[I.main].t : 0.4, P = ctx.S.player, foe = { get x() { return P.x; }, get y() { return P.y; }, dead: false };
      const ahead = mainT - tel; c.sc = DFX.spawn(id, mo, foe, ahead, { hooks: { hit: () => { }, knock: () => { } } });
      if (c.sc) DFX.fired(c.sc, { at: M.kind === 'line' ? c.aim : c.tgt }); c.mainT = mainT; } catch (e) { c.sc = null; if (ST.errs++ < 5) console.error('fieldct scene', id, e); }
  }
  if (M.kind !== 'melee') ST.marks.push(c);
  try { if (ctx.duelSfx) ctx.duelSfx(M.ult ? 'ult_cast' : 'move_start', { id, type: c.he }); } catch (e) { }
  log({ ev: 'cast', id: mo.id, sp: mo.sp, mv: id, nt, sc: c.sc ? c.sc.kind : null, d: Math.round(dist(mo, p)) }); stat('cast_' + id);
  if (M.kind === 'dig') { mo.clip = 'dig'; mo.ct = 0; try { if (ctx.duelSfx) ctx.duelSfx('dig_down', { id }); } catch (e) { } }
}
function ultTag(ctx, mo, id) {   /* tên tuyệt chiêu nhỏ bay lên trên đầu (không cắt cảnh) — tránh chồng chữ: lệch dần nếu vừa có tên khác gần đó */
  const now = ctx.S.time; ST.tags = (ST.tags || []).filter(q => now - q.t < 1); let dy = 0; for (const q of ST.tags) if (Math.abs(q.x - mo.x) < 60 && Math.abs(q.y - dy - mo.y) < 14) dy += 9;
  ST.tags.push({ x: mo.x, y: mo.y - dy, t: now }); (ctx.S.pops ||= []).push({ x: mo.x, y: mo.y - 30 - dy, text: mvName(ctx, id) + '!', color: '#ffd45e', t: 0 }); stat('ult_tag');
}
function fights() { let n = 0; for (const m of ST.awake) if (m.angry || (m.F && m.F.nt)) n++; return n; }
function punch(ctx, mo, p) {   /* zoom-punch ngắn theo độ lực — không zoom khi ≥ 3 thú đang đánh trên màn (khỏi loạn) */
  const S = ctx.S; if (fights() >= 3 || S.camZoom > 1.01 || ST.punch) return; ST.punch = { t: 0, k: p.zoom * 0.7, x: mo.x, y: mo.y - 8 };
}
function cancelCast(mo, why) { const c = mo.F && mo.F.cast; if (!c) return; c.done = true; mo.F.cast = null; ST.marks = ST.marks.filter(q => q !== c); if (ST.ultBusy === mo) ST.ultBusy = null; mo.alt = 0; mo.hide = false; if (c.dig && ST.ctx) { const w = nearWalk(ST.ctx, mo.x, mo.y, mo.c.aqua); if (w) { mo.x = w.x; mo.y = w.y; } } log({ ev: 'cancel', id: mo.id, mv: c.id, why }); }
function updCast(ctx, mo, dt, p) {
  const c = mo.F.cast; c.t += dt;
  if (c.M.kind === 'hop') { const k = Math.min(1, c.t / c.tel), h = c.hop; mo.x = h.x0 + (h.x1 - h.x0) * k; mo.y = h.y0 + (h.y1 - h.y0) * k; mo.alt = Math.sin(Math.PI * k) * 24; face(mo, p.x, p.y); mo.clip = 'atk'; mo.ct = Math.min(impactT(mo, 'atk') - 0.02, k * impactT(mo, 'atk')); }
  else if (c.M.kind === 'dig') {   /* chui xuống (clip dig) → ẩn, ụ đất chạy ngầm tới chỗ người chơi → trồi lên dưới chân */
    const dn = Math.min(c.tel * 0.4, clipLen(mo, 'dig') * 0.6); if (c.t < dn) { mo.clip = 'dig'; }
    else { mo.hide = true; const k = Math.min(1, (c.t - dn) / Math.max(0.05, c.tel - dn)), D = c.dig; c.mx = D.x0 + (D.ex - D.x0) * k; c.my = D.y0 + (D.ey - D.y0) * k; mo.x = c.mx; mo.y = c.my; if (Math.random() < dt * 14) DFX.dust(c.mx, c.my, 1, 0); }
  }
  else if (c.t >= c.clipAt && mo.clip !== c.M.clip) { mo.clip = c.M.clip; mo.ct = Math.max(0, c.t - c.clipAt); }
  else if (c.t < c.clipAt) { mo.clip = 'idle'; face(mo, c.M.kind === 'melee' ? p.x : c.tgt.x, c.M.kind === 'melee' ? p.y : c.tgt.y); }
  if (!c.done && c.t >= c.tel) { c.done = true; resolve(ctx, mo, c, p); }
  const after = c.M.kind === 'dig' ? 0.45 : Math.max(0.25, clipLen(mo, c.M.clip) - impactT(mo, c.M.clip));
  if (c.done && c.t >= c.tel + after) { mo.F.cast = null; ST.marks = ST.marks.filter(q => q !== c); if (ST.ultBusy === mo) ST.ultBusy = null; mo.alt = 0; mo.hide = false; mo.clip = 'idle'; }
  else if (c.done && c.t >= c.tel + 0.12) ST.marks = ST.marks.filter(q => q !== c);
}
function segD(px, py, ax, ay, bx, by) { const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l2)); return Math.hypot(px - (ax + dx * t), py - (ay + dy * t)); }
function inZone(c, q) {
  const M = c.M; if (!q) return false;
  if (M.kind === 'line') return segD(q.x, q.y, c.o.x, c.o.y, c.tgt.x, c.tgt.y) <= M.wid / 2 + 5;
  if (M.kind === 'dig') return Math.hypot(q.x - c.dig.ex, q.y - c.dig.ey) <= M.r + 4;
  return Math.hypot(q.x - c.tgt.x, q.y - c.tgt.y) <= M.r + 4;
}
function resolve(ctx, mo, c, p) {
  const M = c.M, he = c.he; if (M.fx78 && ctx.kho78) try { ctx.kho78.fieldResolve(mo, c, p); } catch (e) { if (ST.errs++ < 5) console.error('k78 res', e); }   /* p78 */
  if (M.kind === 'melee') { if (walkPx(ctx, mo.x + mo.fx * 4, mo.y + mo.fy * 2, mo.c.aqua)) { mo.x += mo.fx * 4; mo.y += mo.fy * 2; } c.tgt = { x: p.x, y: p.y }; }
  if (M.kind === 'hop') { mo.alt = 0; ctx.quake && ctx.quake(0.14); if (DFX.CODE) { DFX.burst(mo.x, mo.y - 2, 'trieu', 1.2, mo.y + 0.5); DFX.burst(mo.x + 10, mo.y, 'trieu', 0.7, mo.y + 0.6); DFX.burst(mo.x - 10, mo.y, 'trieu', 0.7, mo.y + 0.6); DFX.ring(mo.x, mo.y + 1, 'trieu', M.r); } c.tgt = { x: mo.x, y: mo.y }; }
  if (M.kind === 'dig') { const D = c.dig, back = nearWalk(ctx, D.ex - mo.fx * 10, D.ey - 2, mo.c.aqua) || { x: D.ex, y: D.ey }; mo.x = back.x; mo.y = back.y; mo.hide = false; mo.clip = 'dig'; mo.ct = clipLen(mo, 'dig') * 0.55; face(mo, p.x, p.y); ctx.quake && ctx.quake(0.18); if (DFX.CODE && !M.fx78) { DFX.boom(D.ex, D.ey, 'chan', 0.8); DFX.dust(D.ex, D.ey, 6, 0); } try { if (ctx.duelSfx) ctx.duelSfx('dig_up', { id: c.id }); } catch (e) { } }
  if (!c.sc && !M.fx78 && M.kind !== 'hop' && M.kind !== 'dig' && DFX.CODE) {   /* không có cảnh (đánh thường / đã đủ 2 cảnh) → chớp trúng nhỏ */
    if (M.kind === 'melee') DFX.burst((mo.x + p.x) / 2, p.y - 6, he, 0.6, p.y + 0.5); else if (M.kind === 'line') DFX.burst(c.tgt.x, c.tgt.y - 6, he, 0.9, c.tgt.y + 0.5); else DFX.boom(c.tgt.x, c.tgt.y, he, M.ult ? 1 : 0.6);
  }
  const hitP = M.kind === 'melee' ? dist(mo, p) <= 26 : inZone(c, p);
  const from = M.kind === 'line' ? c.o : M.kind === 'melee' ? { x: mo.x, y: mo.y } : (M.kind === 'hop' || M.kind === 'dig') ? { x: mo.x, y: mo.y } : c.tgt;
  let didP = false;
  if (hitP) didP = hurtPlayer(ctx, mo, c, from, p);
  /* Rocky + linh thú đi cùng cũng trúng (đòn mạnh hất bay) */
  try { const rp = ctx.rocky && ctx.rocky.pos && ctx.rocky.pos(); if (rp && (M.kind === 'melee' ? dist(mo, rp) <= 26 : inZone(c, rp))) hurtRocky(ctx, mo, c, from, rp); } catch (e) { }
  try { for (const q of (ctx.ltPets ? ctx.ltPets() : [])) if (M.kind === 'melee' ? dist(mo, q) <= 26 : inZone(c, q)) { ctx.ltHit(M.frac * K(mo, 'dmg') * 1.1, from, M.knock === 'fly' ? 'fly' : null, q.id); stat('lt_hit'); } } catch (e) { }
  if (M.ult) { const pw = fxPower(fxPowerOf(SPECIES[mo.sp], mo.F.lv) + 0.25); if (ctx.quake) ctx.quake(pw.shake * 0.6); punch(ctx, mo, pw); }
  log({ ev: didP ? 'hit' : hitP ? 'hit_blocked' : 'miss', id: mo.id, mv: c.id, pd: Math.round(Math.hypot(p.x - c.tgt.x, p.y - c.tgt.y)), m: [Math.round(mo.x), Math.round(mo.y)], p: [Math.round(p.x), Math.round(p.y)], tg: [Math.round(c.tgt.x), Math.round(c.tgt.y)], hop: c.hop ? [Math.round(c.hop.x1), Math.round(c.hop.y1)] : null }); stat(didP ? 'hit_' + c.id : 'miss_' + c.id);
}
function capFrac(ctx, frac) {   /* trần sát thương: ≤ 35 % máu tối đa người chơi trong mỗi 3 s */
  const now = ctx.S.time; ST.dmgLog = ST.dmgLog.filter(e => now - e.t < CAP.win); const used = ST.dmgLog.reduce((s, e) => s + e.f, 0), f = Math.max(0, Math.min(frac, CAP.frac - used)); return f;
}
function hurtPlayer(ctx, mo, c, from, p) {
  const h = ctx.hero; if (!h || h.fainted) return false; const M = c.M;
  const f = capFrac(ctx, M.frac * K(mo, 'dmg')); if (f <= 0.004) { stat('capped'); return false; }
  const ok = h.hit(Math.max(1, Math.round(h.max * f))); if (!ok) return false; ST.dmgLog.push({ t: ctx.S.time, f }); mo.__rkP = ctx.S.time;
  if (M.pull) { const d = dist(p, mo) || 1, k = Math.max(0, d - 16) / d; let nx = p.x + (mo.x - p.x) * k, ny = p.y + (mo.y - p.y) * k; const w = nearWalk(ctx, nx, ny, false); if (w && !ctx.isSolid(ctx.S.map, Math.floor(w.x / TS), Math.floor(w.y / TS))) { p.x = w.x; p.y = w.y; } stat('pull'); }   /* Lưỡi Dính: kéo về sát Cóc (dừng ở ô đi được) */
  if (ctx.knockPlayer && M.knock) { const d = Math.hypot(p.x - from.x, p.y - from.y) || 1; let dx = (p.x - from.x) / d, dy = (p.y - from.y) / d; if (d < 3) { dx = mo.fx || 1; dy = mo.fy || 0; } ctx.knockPlayer({ type: M.knock, power: M.knock === 'fly' ? 1 : 0.8, dir: { x: dx, y: dy }, src: { x: from.x, y: from.y } }); }
  try { if (ctx.duelSfx) ctx.duelSfx(M.knock === 'fly' ? 'hit_big' : 'hit', { id: c.id, type: c.he }); } catch (e) { }
  if (!(ctx.duelSfx)) ctx.sfx('hit');
  stat('phit_' + M.knock); return true;
}
function hurtRocky(ctx, mo, c, from, rp) {
  if (!ctx.rocky.hitBy) return; const pt = ctx.rocky.pet && ctx.rocky.pet(); const lv = pt ? LV.levelFromXp(pt.xp || 0).lv : 1, M = c.M;
  const raw = Math.max(1, Math.round(LV.maxHpOf(lv) * M.frac * K(mo, 'dmg'))), d = Math.hypot(rp.x - from.x, rp.y - from.y) || 1;
  if (ctx.rocky.hitBy(raw, mo, (rp.x - from.x) / d, (rp.y - from.y) / d, M.knock === 'fly' ? 60 : 30, M.knock === 'fly' ? 'fly' : null)) { stat('rk_' + M.knock); mo.__rkR = ctx.S.time; }
}

/* ---------- hạ thú → Tiềm Năng (c.onFall: trả false để monsters.killMonster làm tiếp: đồ rơi gel, KN, Rocky KN) ---------- */
function onFallCT(mo) {
  const ctx = ST.ctx; if (!ctx || !mo.F) return false;
  try { cancelCast(mo, 'down'); const n = tnGain(mo); tnAdd(ctx, FSP[mo.sp].he, n, mo); log({ ev: 'down', id: mo.id, sp: mo.sp, lv: mo.F.lv, tn: n }); stat('down'); } catch (e) { console.error('fieldct down', e); }
  return false;
}
const tnGain = mo => Math.max(1, Math.ceil(Math.max(1, Math.round(mo.F.lv / 2)) * (mo.F.nt ? NIGHT.tn : 1)));
function tnData(ctx) { const c = ctx.chanthu; if (!c || !c.ensure) return null; const d = c.ensure(); if (!d.tn || typeof d.tn !== 'object' || Array.isArray(d.tn)) d.tn = {}; for (const k of Object.keys(d.tn)) if (!(d.tn[k] >= 0)) d.tn[k] = 0; return d; }
function tnAdd(ctx, he, n, mo) {
  const d = tnData(ctx); if (!d || !n) return; d.tn[he] = (d.tn[he] | 0) + n; ctx.persist();
  if (mo) (ctx.S.pops ||= []).push({ x: mo.x, y: mo.y - 36, text: L(ctx).tn(n, heName(ctx, he)), color: TYPE_COLOR[he] || '#ffe08a', t: 0 });
  ST.chipT = tnCanUp(ctx) ? 45 : 8; chip(ctx); stat('tn_' + he);   /* c70-detho (plan-121 A5): nút cũ tự ẩn sau 8 s nên bấm trễ là 'không có gì' → còn nâng được thì giữ 45 s */
}
function tnCanUp(ctx) { const d = tnData(ctx); if (!d) return false; return d.team.concat(d.box).some(m => { const s = m && SPECIES[m.sp]; return !!s && (m.lv | 0) < 100 && s.types.some(h => (d.tn[h] | 0) >= tnCost(m.lv | 0)); }); }   /* c70-detho */
export const tnCost = lv => 2 + Math.floor(lv / 5);
const unlocked = m => (SPECIES[m.sp] && SPECIES[m.sp].lt ? LT_UNLOCK(m.lv | 0) : (SPECIES[m.sp] ? SPECIES[m.sp].moves.length : 0));   /* linh thú: 2 chiêu khi bắt · chiêu 3 Lv10 · chiêu 4 Lv15 · tuyệt chiêu Lv20 */
const MV_EN = { bot_op: 'Croak Bubbles', bung_phe: 'Belly Flop', kinh_den: 'Cool Shades', coc_lu: 'Bottomless Mug Flood', luoi_keo: 'Tongue Yank', vong_khoi: 'Pipe Rings',  don_tho: 'Drill Dig', mua_da_lo: 'Rockfall Rain', manh_pha_le: 'Shard Rain', nut_dat: 'Spike Rise', dai_dia_chan: 'Earth Dragon Rises', vong_du_chan: 'Aftershock Ring', luoi_dinh: 'Sticky Tongue', dap_vung: 'Puddle Slam', goi_mua: 'Rain Call', bong_giam: 'Bubble Jail', thuy_phao: 'Water Cannon' };
const mvName = (ctx, id) => (ctx.lang() === 'en' ? MOVE_NAME_EN[id] || MV_EN[id] || id : (MOVES[id] && MOVES[id].name) || id);
function nextUnlock(m) { const s = SPECIES[m.sp]; if (!s || !s.lt) return null; const k = LT_UNLOCK(m.lv | 0); if (k >= s.moves.length) return null; const at = k === 2 ? 10 : k === 3 ? 15 : 20; return { at, mv: s.moves[k] }; }
function tnLevel(ctx, id) {   /* rót Tiềm Năng cùng hệ → +1 cấp (đội hoặc kho) */
  const d = tnData(ctx); if (!d) return false; const m = d.team.concat(d.box).find(q => q.id === id); if (!m || !SPECIES[m.sp]) return false; if ((m.lv | 0) >= 100) return false;
  const cost = tnCost(m.lv | 0), he = SPECIES[m.sp].types.find(t => (d.tn[t] | 0) >= cost); if (!he) return false;
  const k0 = unlocked(m); d.tn[he] -= cost; m.lv = (m.lv | 0) + 1; ctx.persist(); if (ctx.kho78) try { ctx.kho78.onLevel(m); } catch (e) { }   /* p78: học chiêu kho theo cấp */ const k1 = unlocked(m); try { ctx.toast(L(ctx).upd(nmOf(ctx, m), m.lv)); ctx.sfx('coin'); } catch (e) { }
  const evo = SPECIES[m.sp].evo; if (evo && SPECIES[evo] && m.lv >= (SPECIES[m.sp].evoLv || 20)) { const old = m.sp, defName = !m.name || m.name === SPECIES[old].name; m.sp = evo; if (defName) m.name = SPECIES[evo].name; ctx.persist(); log({ ev: 'evolve', id, from: old, to: evo }); stat('evolve'); closeTN(ctx); showStart(ctx, old, evo); return true; }   /* đủ Lv20 → TIẾN HOÁ (đổi loài trong đội) + cảnh tiến hoá ngay cạnh người chơi */
  if (k1 > k0) { const mv = SPECIES[m.sp].moves[k1 - 1], nmv = mvName(ctx, mv); try { ctx.toast(L(ctx).newMove(nmOf(ctx, m), nmv), true); } catch (e) { } log({ ev: 'unlock', id, sp: m.sp, lv: m.lv, mv }); stat('unlock'); }
  log({ ev: 'tn_up', id, sp: m.sp, lv: m.lv, he, cost }); stat('tn_up'); return true;
}

/* ---------- Ấn Thu ngay trên map ---------- */
const CATCH = { THROW: 0.5, SUCK: 0.42, DROP: 0.3, SHAKE: 0.5, GAP: 0.32, OK: 1.4, FAIL: 0.5 }, CATCH_BASE = { thuong: 0.6, hiem: 0.35, rathiem: 0.15, huyen: 0.1 };
function catchP(mo) { const k = mo.hp / mo.max, base = CATCH_BASE[(SPECIES[mo.sp] || {}).rarity] ?? 0.4; return Math.max(0.03, Math.min(0.95, base * (1.6 - 2 * k) * (mo.F.stunT > 0 ? 1.2 : 1))); }
function canCatch(ctx, mo) { return !!(mo && mo.F && mo.hp > 0 && mo.hp <= mo.max * CATCH_AT && !ST.catch && ctx.chanthu && !duelOn(ctx)); }
function startCatch(ctx, mo) {
  if (!canCatch(ctx, mo)) return false; if (!ctx.chanthu.useBall()) { ctx.toast(L(ctx).noBall); return false; }
  cancelCast(mo, 'catch'); const p = ctx.S.player, P0 = catchP(mo), q = Math.pow(P0, 1 / 3); let n = 0; if (ST.force === true) n = 3; else if (ST.force === false) n = 2; else while (n < 3 && Math.random() < q) n++;
  ST.catch = { mo, ph: 'throw', t: 0, x0: p.x, y0: p.y - 14, x1: mo.x, y1: mo.y + 1, x: p.x, y: p.y, h: 14, ok: n === 3, shakes: n === 3 ? 3 : Math.max(1, n), done: 0, p: P0 };
  if (p.faceTo) p.faceTo(mo.x, mo.y); try { if (ctx.duelSfx) ctx.duelSfx('orb_throw', { side: 0, anthu: true }); } catch (e) { }
  log({ ev: 'catch_throw', id: mo.id, p: +P0.toFixed(3), n }); stat('catch_throw'); return true;
}
function updCatch(ctx, dt) {
  const C = ST.catch; if (!C) return; C.t += dt; const mo = C.mo;
  if (C.ph === 'throw') { const k = Math.min(1, C.t / CATCH.THROW); C.x = C.x0 + (C.x1 - C.x0) * k; C.y = C.y0 + 14 + (C.y1 - C.y0 - 14) * k; C.h = 14 * (1 - k) + 8 * k + Math.sin(Math.PI * k) * 24; if (k >= 1) { C.ph = 'suck'; C.t = 0; mo.flash = 0.12; } return; }
  if (C.ph === 'suck') { if (C.t >= CATCH.SUCK) { C.ph = 'drop'; C.t = 0; mo.hide = true; } return; }
  if (C.ph === 'drop') { const k = Math.min(1, C.t / CATCH.DROP); C.h = k < 0.7 ? 8 * (1 - k / 0.7) : Math.sin(Math.PI * (k - 0.7) / 0.3) * 3; if (k >= 1) { C.h = 0; C.ph = 'wait'; C.t = 0; DFX.dust(C.x, C.y, 3, 0); } return; }
  if (C.ph === 'wait') { if (C.t >= CATCH.GAP) { if (C.done < C.shakes) { C.ph = 'shake'; C.t = 0; try { if (ctx.duelSfx) ctx.duelSfx('catch_shake', { n: C.done + 1 }); } catch (e) { } } else if (C.ok) catchOK(ctx); else catchFail(ctx); } return; }
  if (C.ph === 'shake') { if (C.t >= CATCH.SHAKE) { C.done++; C.ph = 'wait'; C.t = 0; } return; }
  if (C.ph === 'ok') { if (C.t >= CATCH.OK) ST.catch = null; return; }
  if (C.ph === 'fail') { if (C.t >= CATCH.FAIL) ST.catch = null; }
}
function catchOK(ctx) {
  const C = ST.catch, mo = C.mo; C.ph = 'ok'; C.t = 0; const lv = mo.F.lv, sp = mo.sp; let where = 'team';
  try { where = ctx.chanthu.add(sp, lv); const d = ctx.chanthu.ensure(); d.caught = (d.caught | 0) + 1; ctx.persist(); } catch (e) { console.error('fieldct catch', e); }
  if (ctx.monsters && ctx.monsters.remove) ctx.monsters.remove(mo); if (ST.ultBusy === mo) ST.ultBusy = null;
  tnAdd(ctx, FSP[sp].he, Math.max(1, Math.ceil(tnGain(mo) / 2)), null);
  try { ctx.toast(L(ctx).caught(spName(ctx, sp)) + (where === 'box' ? (vi(ctx) ? ' → kho' : ' → storage') : (vi(ctx) ? ' → đội' : ' → team'))); if (ctx.duelSfx) ctx.duelSfx('catch_ok', { sp }); } catch (e) { }
  log({ ev: 'catch_ok', sp, lv, where }); stat('catch_ok');
}
function catchFail(ctx) {
  const C = ST.catch, mo = C.mo; C.ph = 'fail'; C.t = 0; mo.hide = false; mo.flash = 0.14; if (mo.F) { mo.F.stunT = 0; mo.F.gcd = 0.6; } provoke(ctx, mo, false);
  try { ctx.toast(L(ctx).fail(spName(ctx, mo.sp))); if (ctx.duelSfx) ctx.duelSfx('catch_fail', { sp: mo.sp }); } catch (e) { } log({ ev: 'catch_fail', sp: mo.sp }); stat('catch_fail');
}
function antDraw(g, id, fr, x, y) { const m = ANTM[id], im = m && img(m.file); if (!im) { const ic = img('duel/anthu/anthu_icon.png'); if (ic) g.drawImage(ic, 0, 0, ic.naturalWidth, ic.naturalHeight, Math.round(x - 5), Math.round(y - 10), 10, 10); return; } const sw = im.naturalWidth / m.n; g.drawImage(im, (fr % m.n) * sw, 0, sw, im.naturalHeight, Math.round(x - m.ax), Math.round(y - m.ay), m.w, m.h); }

/* ---------- trận 1v1 (bấm E khi thú chưa nổi giận) ---------- */
function canDuel(ctx) { const LT0 = ctx.ltDuelTeam ? ctx.ltDuelTeam() : []; return !!((ctx.chanthu && ctx.chanthu.hasStarter && ctx.chanthu.hasStarter()) || LT0.length); }
function duelWild(ctx, mo) {
  if (!ctx.duel || !ctx.duel.start || duelOn(ctx)) return; if (!canDuel(ctx)) { ctx.toast(L(ctx).noStarter); return; }
  if (ctx.comp79 && !ctx.comp79.out()) { ctx.comp79.need(); return; }   /* p79 */
  const d = ctx.chanthu.ensure(), me = (ctx.comp79 && ctx.comp79.out() && d.team[0]) || (ctx.duelLead && ctx.duelLead()) || d.team[0], sp = mo.sp, lv = mo.F.lv, he = FSP[sp].he, n = tnGain(mo);
  log({ ev: 'duel', sp, lv }); stat('duel');
  const gone = () => { try { if (ctx.monsters && ctx.monsters.remove) ctx.monsters.remove(mo); } catch (e) { } };   /* p79: đấu tại chỗ — con thua / bị bắt rời map (trước đây vào lại vùng mới dựng lại) */
  ctx.duel.start({ wildAt: { x: mo.x, y: mo.y }, wild: { sp, lv, key: 'fct:' + ctx.S.zone.id + ':' + mo.id }, mode: '1v1', lv: me.lv, team: [{ sp: me.sp, lv: me.lv, name: me.name, lt: me.lt || null }], foeTeam: [{ sp, lv }],
    onCatch: () => { const where = ctx.chanthu.add(sp, lv); const dd = ctx.chanthu.ensure(); dd.caught = (dd.caught | 0) + 1; tnAdd(ctx, he, Math.max(1, Math.ceil(n / 2)), null); ctx.persist(); gone(); return where; },
    onWin: () => { tnAdd(ctx, he, n, null); gone(); }, onFlee: () => { }, onLose: () => { } });
}

/* ---------- vẽ ---------- */
function drawCT(g, mo, x, y) {   /* x, y: chân trên màn (monsters.drawables; trong waterDraw → lội nước chìm nửa dưới) */
  if (!mo.F) return; const z = mo.alt || 0;
  if (SHADOW.on && !mo.hide) shadowFor(g, mo.x, mo.y, x, y + 1, FSP[mo.sp].shw, z);
  if (mo.hide) return;
  const cl = mo.clip || 'idle', c = clipOf(mo, cl); if (!c) { g.fillStyle = TYPE_COLOR[FSP[mo.sp].he]; g.fillRect(x - 5, y - 10 - z, 10, 10); return; }
  const im = img(c.file); if (!im) return; const loop = cl === 'idle' || cl === 'run', fps = c.fps || FPSD[cl] || 12; let fr = Math.floor(mo.ct * fps); fr = loop ? fr % c.n : Math.min(c.n - 1, fr);
  const { r, flip } = rowOf(c, mo.fx, mo.fy), sw = c.cw, sh = c.ch, w = sw / 2, h = sh / 2, ax = c.ax / 2, ay = c.ay / 2, X = Math.round(x), Y = Math.round(y - z);
  const C = ST.catch && ST.catch.mo === mo && ST.catch.ph === 'suck' ? ST.catch : null, src = C ? goldOf(im) : mo.flash > 0 ? whiteOf(im) : im;
  if (C) { g.save(); g.globalAlpha = 1 - Math.min(1, C.t / CATCH.SUCK) * 0.5; }
  if (flip) { g.save(); g.translate(X, Y); g.scale(-1, 1); g.drawImage(src, fr * sw, r * sh, sw, sh, -ax, -ay, w, h); g.restore(); } else g.drawImage(src, fr * sw, r * sh, sw, sh, X - ax, Y - ay, w, h);
  if (C) g.restore();
  const top = Y - ay + 6, F = mo.F;
  mo.__bt = Math.max(top - 5 - y, -(mo.c.h || 15) - 7 - z); if (!globalThis.__t91 && (mo.hp < mo.max || mo.angry)) { const bw = 14, l = X - bw / 2; g.fillStyle = '#352022'; g.fillRect(l - 1, top - 5, bw + 2, 3); g.fillStyle = mo.angry || F.nt ? '#e84a3a' : '#9fd86a'; g.fillRect(l, top - 4, Math.max(1, Math.round(bw * mo.hp / mo.max)), 1); }
  if (F.stunT > 0) { g.fillStyle = '#ffe066'; for (let i = 0; i < 3; i++) { const a = i * 2.09 + 0.6, sx = Math.round(X + Math.cos(a) * 6), sy = Math.round(top - 9 + Math.sin(a) * 2); g.fillRect(sx, sy - 1, 1, 3); g.fillRect(sx - 1, sy, 3, 1); } }   /* sao choáng TĨNH (luật 10/10: không VFX lặp) */
}
function drawGround(g, ctx, cx, cy) {   /* vạch báo trước trên đất (lớp nền) */
  for (const c of ST.marks) {
    const M = c.M, k = Math.min(1, c.t / c.tel), P = M.ult ? ['#ffd0c8', '#ff6a50', '#e8341e', '#a01810'] : (PAL_SRC[c.he] || PAL_SRC.chan).slice(1, 5);
    if (M.kind === 'line') lineMark(g, c.o.x - cx, c.o.y - cy, c.tgt.x - cx, c.tgt.y - cy, M.wid, k, P);
    else { const at = M.kind === 'dig' ? { x: c.dig.ex, y: c.dig.ey } : c.tgt; ringMark(g, at.x - cx, at.y - cy, M.r, k, P, M.ult); }
    if (M.kind === 'dig' && !M.fx78 && c.mx != null && c.t < c.tel) mound(g, c.mx - cx, c.my - cy, c.t);
  }
  if (DFX.CODE && !duelOn(ctx)) DFX.drawGround(g, cx, cy);
}
function ringMark(g, X, Y, R, k, P, ult) {   /* elip báo: viền đậm + lõi dither lớn dần theo thời gian còn lại (đọc rõ trên điện thoại) */
  const RY = R * 0.5, n = Math.max(28, Math.round(R * 2.2));
  g.fillStyle = P[3]; for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; g.fillRect(Math.round((X + Math.cos(a) * R) * 2) / 2, Math.round((Y + Math.sin(a) * RY) * 2) / 2, 1, 1); }
  g.fillStyle = P[1]; for (let i = 0; i < n; i += 2) { const a = i / n * Math.PI * 2; g.fillRect(Math.round((X + Math.cos(a) * (R - 1)) * 2) / 2, Math.round((Y + Math.sin(a) * (RY - 0.5)) * 2) / 2, 0.5, 0.5); }
  const r = R * (0.25 + 0.75 * k), ry = r * 0.5; g.fillStyle = P[ult ? 2 : 2];
  for (let yy = -ry; yy <= ry; yy += 1) { const hw = r * Math.sqrt(Math.max(0, 1 - (yy * yy) / (ry * ry))); if (hw < 0.5) continue; const row = Math.round((Y + yy) * 2); if (row % 2) continue; g.fillRect(Math.round((X - hw) * 2) / 2, row / 2, Math.round(hw * 4) / 2, 0.5); }
  if (ult) { g.fillStyle = P[0]; g.fillRect(Math.round(X) - 0.5, Math.round(Y - RY * k) - 4, 1, 3); g.fillRect(Math.round(X) - 0.5, Math.round(Y - RY * k), 1, 1); }   /* dấu ! tĩnh giữa vòng đỏ */
}
function lineMark(g, X0, Y0, X1, Y1, W, k, P) {
  const L = Math.hypot(X1 - X0, Y1 - Y0) || 1, ux = (X1 - X0) / L, uy = (Y1 - Y0) / L, nx = -uy, ny = ux, hw = W / 2, fillL = L * (0.2 + 0.8 * k);
  g.fillStyle = P[3]; for (let s = 0; s <= L; s += 1) for (const sd of [-1, 1]) g.fillRect(Math.round((X0 + ux * s + nx * hw * sd) * 2) / 2, Math.round((Y0 + uy * s + ny * hw * sd * 0.6) * 2) / 2, 1, 0.5);
  g.fillStyle = P[2]; for (let s = 0; s <= fillL; s += 1) for (let o = -hw + 1; o < hw - 0.5; o += 1) { const px = Math.round((X0 + ux * s + nx * o) * 2), py = Math.round((Y0 + uy * s + ny * o * 0.6) * 2); if ((px + py) % 2) continue; g.fillRect(px / 2, py / 2, 0.5, 0.5); }
  g.fillStyle = P[0]; g.fillRect(Math.round(X1 * 2) / 2 - 1, Math.round(Y1 * 2) / 2 - 1, 2, 2);
}
function mound(g, X, Y, t) { const P = PAL_SRC.chan; const b = Math.round(Math.sin(t * 20)); g.fillStyle = P[5]; g.fillRect(Math.round(X) - 4, Math.round(Y) - 2 + b * 0.5, 8, 3); g.fillStyle = P[3]; g.fillRect(Math.round(X) - 3, Math.round(Y) - 3 + b * 0.5, 6, 2); g.fillStyle = P[1]; g.fillRect(Math.round(X) - 1, Math.round(Y) - 3.5, 2, 1); }

/* ---------- thú của người chơi hiện ra: TIẾN HOÁ (fieldevo.js) rồi dạng mới tung TUYỆT CHIÊU (cảnh duelfx sàn đấu) ---------- */
const ULT_OF = sp => { const s = SPECIES[sp]; return s ? s.moves[s.moves.length - 1] : null; };
function showStart(ctx, sp0, sp1, v) {
  const p = ctx.S.player, w = nearWalk(ctx, p.x + 22, p.y + 4, false) || { x: p.x + 14, y: p.y }, he = SPECIES[sp0].types[0];
  const o = { sp: sp0, sp1, he, x: w.x, y: w.y, fx: -0.3, fy: 1, alt: 0, clip: 'idle', ct: 0, flash: 0, ph: 'pop', t: 0, E: null };
  ST.show = o; if (DFX.CODE) { DFX.burst(o.x, o.y - 6, he, 1, o.y + 0.5); DFX.ring(o.x, o.y + 1, he, 20); } log({ ev: 'show', sp0, sp1 }); return o;
}
function showUpdate(ctx, dt) {
  const o = ST.show; if (!o) return; o.t += dt; o.ct += dt;
  if (o.ph === 'pop' && o.t > 0.5) { o.ph = 'evo'; o.t = 0; o.E = evoStart({ ctx, he: o.he, x: o.x, y: o.y, h: 20, power: fxPowerOf(SPECIES[o.sp1], o.lv || 20), sp: o.sp1, name: spName(ctx, o.sp1), onSwap: () => { o.sp = o.sp1; o.ct = 0; o.clip = 'idle'; } }); }
  if (o.ph === 'evo') { evoUpdate(o.E, dt); if (o.E.done) { o.ph = 'ult'; o.t = 0; showUlt(ctx, o); } }
  if (o.ph === 'ult') { if (o.clipAt != null && o.t >= o.clipAt && o.clip !== 'ult') { o.clip = 'ult'; o.ct = 0; } if (!o.hitDone && o.t >= o.hitAt) { o.hitDone = true; showHit(ctx, o); } if (o.t > o.hitAt + 1.2) { o.ph = 'out'; o.t = 0; } }
  if (o.ph === 'out') { o.clip = 'idle'; if (o.t > 0.6) { if (DFX.CODE) DFX.burst(o.x, o.y - 8, o.he, 0.8, o.y + 0.5); ST.show = null; log({ ev: 'show_end' }); } }
}
function showUlt(ctx, o) {
  const L0 = (ctx.monsters ? ctx.monsters.list() : []).filter(m => m.c && m.c.fct && m.hp > 0 && !m.hide); let tg = null, bd = 140; for (const m of L0) { const d = dist(m, o); if (d < bd) { bd = d; tg = m; } }
  const id = ULT_OF(o.sp), at = tg ? { x: tg.x, y: tg.y } : { x: o.x + 70, y: o.y }; o.tg = tg; o.at = at; o.ult = id; const dx = at.x - o.x, dy = at.y - o.y, d = Math.hypot(dx, dy) || 1; o.fx = dx / d; o.fy = dy / d;
  let mainT = 0.6; const kind = DFX.CODE && DFX.sceneOf(id);
  if (kind) { try { const I = DFX.info(kind); mainT = I && I.main >= 0 ? I.hits[I.main].t : 0.6; const foe = tg ? { get x() { return tg.x; }, get y() { return tg.y; }, dead: false } : { x: at.x, y: at.y, dead: false }; const sc = DFX.spawn(id, o, foe, 0, { hooks: { hit: () => { }, knock: () => { } } }); if (sc) DFX.fired(sc, { at }); o.sc = !!sc; } catch (e) { console.error('fieldct show ult', e); } }
  o.hitAt = mainT; o.clipAt = Math.max(0, mainT - impactT(o, 'ult')); try { if (ctx.duelSfx) ctx.duelSfx('ult_cast', { id, type: o.he }); } catch (e) { } log({ ev: 'show_ult', mv: id, sc: kind || null, tg: tg ? tg.id : null });
}
function showHit(ctx, o) {
  if (ctx.quake) ctx.quake(0.5); if (DFX.CODE) { DFX.boom(o.at.x, o.at.y, o.he, 1.2); DFX.ring(o.at.x, o.at.y + 1, o.he, 50); }
  if (o.tg && ctx.monsters && ctx.monsters.damage && ctx.monsters.list().includes(o.tg)) { ctx.monsters.damage(o.tg, Math.max(30, Math.round(o.tg.max * 0.8)), o, 1, 140, true); }
  log({ ev: 'show_hit', tg: o.tg ? o.tg.id : null });
}
function drawShow(g, o, cx, cy) {
  const S0 = SPR && SPR[o.sp], cl = (S0 && (S0[o.clip] || S0.idle)); if (!cl) return; const im = img(cl.file); if (!im) return;
  const loop = o.clip === 'idle', fps = cl.fps || FPSD[o.clip] || 12; let fr = Math.floor(o.ct * fps); fr = loop ? fr % cl.n : Math.min(cl.n - 1, fr);
  const B = o.E && o.ph === 'evo' ? evoBody(o.E) : { white: o.ph === 'pop' ? Math.max(0, 1 - o.t * 2) : 0, shake: 0 }, { r, flip } = rowOf(cl, o.fx, o.fy), sw = cl.cw, sh = cl.ch, X = (globalThis.__R89||Math.round)(o.x - cx + (B.shake ? (Math.random() < 0.5 ? -1 : 1) : 0)), Y = (globalThis.__R89||Math.round)(o.y - cy), al = o.ph === 'out' ? Math.max(0, 1 - o.t / 0.6) : 1;
  if (SHADOW.on) shadowFor(g, o.x, o.y, (globalThis.__R89||Math.round)(o.x - cx), Y + 1, 12, 0);
  const one = src => { if (flip) { g.save(); g.translate(X, Y); g.scale(-1, 1); g.drawImage(src, fr * sw, r * sh, sw, sh, -cl.ax / 2, -cl.ay / 2, sw / 2, sh / 2); g.restore(); } else g.drawImage(src, fr * sw, r * sh, sw, sh, X - cl.ax / 2, Y - cl.ay / 2, sw / 2, sh / 2); };
  g.save(); g.globalAlpha = al; one(im); if (B.white > 0.02) { g.globalAlpha = al * Math.min(1, B.white); one(whiteOf(im)); } g.restore();
}

/* ---------- bảng Tiềm Năng (DOM nhỏ) ---------- */
function css() {
  if (document.getElementById('fct-css')) return; const s = document.createElement('style'); s.id = 'fct-css';
  s.textContent = `#tn-panel{position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:46;border:20px solid transparent;border-image:url(${BASE}ui/frame.png) 20 / 20px round;border-radius:0;background:#1c1424;background-clip:padding-box;image-rendering:pixelated;padding:2px 6px 6px;color:#fff6d8;font:20px VT323,monospace;width:min(94vw,440px);max-height:84vh;overflow:auto;box-sizing:border-box;text-shadow:1px 1px 0 #10241a}
#tn-panel h3{margin:0 auto 4px;font:bold 24px VT323,monospace;color:#ffd45e;text-align:center;width:max-content;border:8px solid transparent;border-image:url(${BASE}ui/dlg_plate.png) 8 / 8px round;background:#4a3324;background-clip:padding-box;padding:0 10px;image-rendering:pixelated}
#tn-panel p{margin:0 0 6px;text-align:center;color:#e8dcc0;font-size:17px;line-height:1.05}
#tn-panel .pts{display:flex;flex-wrap:wrap;gap:4px;justify-content:center;margin-bottom:6px}
#tn-panel .chip{display:inline-flex;align-items:center;gap:3px;border:6px solid transparent;border-image:url(${BASE}ui/dlg_port.png) 8 / 6px round;background:#2a1f38;background-clip:padding-box;padding:0 3px;color:#fff6d8;font-size:17px;line-height:16px;image-rendering:pixelated}#tn-panel .chip img{width:16px;height:16px;image-rendering:pixelated}
#tn-panel .tm{display:flex;align-items:center;gap:6px;border:8px solid transparent;border-image:url(${BASE}ui/dlg_port.png) 8 / 8px round;background:#2a1f38;background-clip:padding-box;padding:0 2px;margin-bottom:3px;image-rendering:pixelated}
#tn-panel .tm img.p{width:48px;height:48px;image-rendering:pixelated;flex:none;background:#120f1c}
#tn-panel .tm .i{flex:1;min-width:0;display:flex;flex-direction:column}#tn-panel .tm b{color:#ffe9b0;font-size:20px;line-height:1}#tn-panel .tm small{color:#d8ccb8;font-size:16px;line-height:1.05}#tn-panel .tm small.mv{color:#ffd45e;font-size:15px}
#tn-panel .tm .chip{border-width:4px;font-size:15px;padding:0 2px}#tn-panel .tm .chip img{width:13px;height:13px}
#tn-panel button{font:19px VT323,monospace;color:#fff6c8;border:9px solid transparent;border-image:url(${BASE}ui/title/btn.png) 9 / 9px round;border-radius:0;background:#3a2718;background-clip:padding-box;padding:0 6px;cursor:pointer;touch-action:manipulation;white-space:nowrap;image-rendering:pixelated;text-shadow:1px 1px 0 #10241a}
#tn-panel button:hover:not([disabled]){border-image-source:url(${BASE}ui/title/btn_hi.png);background:#4d3421;color:#ffd45e}#tn-panel button[disabled]{filter:grayscale(1) brightness(.7);cursor:default}
#tn-panel .r{display:flex;justify-content:center;margin-top:6px}
#tn-chip{position:fixed;left:50%;bottom:24%;transform:translateX(-50%);z-index:12;font:19px VT323,monospace;color:#fff6c8;border:9px solid transparent;border-image:url(${BASE}ui/title/btn.png) 9 / 9px round;border-radius:0;background:#3a2718;background-clip:padding-box;padding:0 8px;cursor:pointer;touch-action:manipulation;white-space:nowrap;image-rendering:pixelated;text-shadow:1px 1px 0 #10241a}`;
  document.head.appendChild(s);
}
const port = sp => (SPR && SPR._port && SPR._port[sp]) ? BASE + SPR._port[sp] : BASE + 'linhduel/ui/port_' + sp + '.png';
const PCROP = {};
function portCrop(sp, cb) {   /* cắt sát phần có điểm ảnh rồi vẽ vuông (canvas KHÔNG __hi) → dataURL; CSS phóng pixelated */
  if (PCROP[sp]) { cb(PCROP[sp]); return; } const im = new Image();
  im.onload = () => { try { const W = im.naturalWidth, H = im.naturalHeight, c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d'); x.drawImage(im, 0, 0); const d = x.getImageData(0, 0, W, H).data; let x0 = W, y0 = H, x1 = -1, y1 = -1;
    for (let y = 0; y < H; y++) for (let i = 0; i < W; i++) if (d[(y * W + i) * 4 + 3] > 8) { if (i < x0) x0 = i; if (i > x1) x1 = i; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    if (x1 < 0) return; const bw = x1 - x0 + 1, bh = y1 - y0 + 1, S = Math.max(bw, bh) + 2, o = document.createElement('canvas'); o.width = S; o.height = S; o.getContext('2d').drawImage(c, x0, y0, bw, bh, ((S - bw) / 2) | 0, ((S - bh) / 2) | 0, bw, bh);
    PCROP[sp] = o.toDataURL(); cb(PCROP[sp]); } catch (e) { } };
  im.src = port(sp);
}
const chipH = (ctx, he, n) => `<span class="chip" style="background:${TYPE_COLOR[he]}"><img src="${BASE}linhduel/ui/icon_${he}.png" alt="">${heName(ctx, he)}${n != null ? ' ' + n : ''}</span>`;
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function openTN(ctx) {
  const d = tnData(ctx); if (!d) return false; css(); const t = L(ctx); let el = document.getElementById('tn-panel'); if (!el) { el = document.createElement('div'); el.id = 'tn-panel'; document.body.appendChild(el); }
  const mons = d.team.concat(d.box), hs = new Set(Object.keys(d.tn).filter(k => d.tn[k] > 0)); for (const m of mons) if (SPECIES[m.sp]) SPECIES[m.sp].types.forEach(h => hs.add(h));
  const pts = TYPES.filter(h => hs.has(h)).map(h => chipH(ctx, h, d.tn[h] | 0)).join('');
  const row = m => { const s = SPECIES[m.sp]; if (!s) return ''; const cost = tnCost(m.lv | 0), he = s.types.find(h => (d.tn[h] | 0) >= cost) || s.types[0], can = (d.tn[he] | 0) >= cost && (m.lv | 0) < 100;
    const nx = nextUnlock(m), mvs = s.lt ? `<small class="mv">${t.moves(unlocked(m), s.moves.length)}${nx ? ' · ' + t.next(nx.at, esc(mvName(ctx, nx.mv))) : ''}</small>` : '';
    return `<div class="tm"><img class="p" data-sp="${m.sp}" src="${port(m.sp)}" alt=""><div class="i"><b>${esc(nmOf(ctx, m))}</b><small>Lv${m.lv} ${s.types.map(h => chipH(ctx, h)).join(' ')}</small>${mvs}</div>${ctx.kho78 && LEARN78[m.sp] ? `<button data-sap="${m.id}">${vi(ctx) ? '⚙ Chiêu' : '⚙ Moves'}</button>` : ''}<button data-up="${m.id}"${can ? '' : ' disabled'}>${t.up((m.lv | 0) + 1, cost, heName(ctx, he))}</button></div>`; };
  el.innerHTML = `<h3>${t.tnT}</h3><p>${t.tnLead}</p><div class="pts">${pts}</div>${mons.length ? mons.map(row).join('') : `<p>${t.none}</p>`}<div class="r"><button class="b" data-a="x">${t.close}</button></div>`;   /* khung pixel ui/frame · tiêu đề dlg_plate · hàng dlg_port · nút title/btn (như bảng menu / hội thoại) */
  el.hidden = false; ST.panel = true;
  for (const e of el.querySelectorAll('img.p[data-sp]')) portCrop(e.dataset.sp, u => { e.src = u; });   /* chân dung sát khung (ảnh port 48 px của linh thú chỉ có thân nhỏ ở đáy) */
  el.onclick = e => { const sp78 = e.target.closest('button[data-sap]'); if (sp78) { closeTN(ctx); ctx.kho78.openSap(+sp78.dataset.sap); return; }   /* p78: Sắp Chiêu */ const u = e.target.closest('button[data-up]'); if (u) { if (tnLevel(ctx, +u.dataset.up) && !ST.show) openTN(ctx); return; }   /* tiến hoá → bảng đóng để xem cảnh */ if (e.target.closest('button[data-a]')) closeTN(ctx); };
  if (ctx.S.mode === 'play') ctx.setMode('ctpick'); ctx.registerCloser('tnpanel', () => closeTN(ctx)); chipHide(); return true;
}
function closeTN(ctx) { const el = document.getElementById('tn-panel'); if (el) el.hidden = true; if (ST.panel && ctx.S.mode === 'ctpick') ctx.setMode('play'); ST.panel = false; }
function chip(ctx) {
  if (typeof document === 'undefined') return; css(); let el = document.getElementById('tn-chip');
  if (!el) { el = document.createElement('button'); el.id = 'tn-chip'; document.body.appendChild(el); el.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); if (ST.ctx && !openTN(ST.ctx)) chipHide(); }); el.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); }); }   /* c70-detho: nuốt cả click (không lọt xuống màn chơi) */
  el.textContent = L(ctx).chip + (tnCanUp(ctx) ? (vi(ctx) ? ' — chạm để nâng cấp' : ' — tap to level up') : (vi(ctx) ? ' — chạm để xem' : ' — tap to view')); el.hidden = false;   /* c70-detho: chỉ ghi 'nâng cấp' khi thật sự nâng được */
}
function chipHide() { const el = document.getElementById('tn-chip'); if (el) el.hidden = true; ST.chipT = 0; }

/* ---------- hệ ---------- */
export const fieldct = {
  id: 'fieldct',
  always: true,
  onZoneEnter(ctx) {
    ST.ctx = ctx; loadSpr(); ST.marks = []; ST.catch = null; ST.ultBusy = null; ST.awake = new Set(); ST.dmgLog = []; closeTN(ctx); chipHide();
    if (!duelOn(ctx)) DFX.clear();
    ctx.fieldct = { tnAdd: (he, n, at) => tnAdd(ctx, he, n, at || null), openTN: () => openTN(ctx),   /* p80: feed80 cộng Tiềm Năng khi cho ăn */ tn: () => { const d = tnData(ctx); return d ? { ...d.tn } : null; }, level: id => tnLevel(ctx, id), cost: tnCost };
    if (typeof window !== 'undefined') window.__fct = {
      list: () => (ctx.monsters ? ctx.monsters.list() : []).filter(m => m.c && m.c.fct).map(m => ({ id: m.id, sp: m.sp || m.c.fct, x: Math.round(m.x), y: Math.round(m.y), hp: Math.round(m.hp), max: m.max, lv: m.F ? m.F.lv : null, nt: m.F ? m.F.nt : null, angry: !!m.angry, cast: m.F && m.F.cast ? m.F.cast.id : null, stun: m.F ? +m.F.stunT.toFixed(2) : 0, awake: ST.awake.has(m), clip: m.clip, hide: !!m.hide })),
      mo: id => (ctx.monsters ? ctx.monsters.list() : []).find(m => m.id === id) || null,
      spawn: (sp, dx = 40, dy = 0) => { if (!ctx.monsters || !ctx.monsters.add || !CFG[sp]) return null; const p = ctx.S.player, w = nearWalk(ctx, p.x + dx, p.y + dy, CFG[sp].aqua) || { x: p.x + dx, y: p.y + dy }; const mo = ctx.monsters.add(CFG[sp], w.x, w.y); return mo.id; },
      clear: () => { if (!ctx.monsters) return; for (const m of ctx.monsters.list().slice()) if (m.c && m.c.fct) ctx.monsters.remove(m); },
      provoke: id => { const m = window.__fct.mo(id); if (m) { if (!m.F) initMo(ctx, m); provoke(ctx, m, true); } return !!m; },
      cast: (id, mv) => { const m = window.__fct.mo(id); if (!m) return false; if (!m.F) initMo(ctx, m); m.F.cast = null; startCast(ctx, m, mv, ctx.S.player); return true; },
      log: () => ST.log.slice(), logReset: () => { ST.log = []; ST.stats = {}; }, stats: () => ({ ...ST.stats }), marks: () => ST.marks.map(c => ({ mv: c.id, t: +c.t.toFixed(2), tel: c.tel })), scenes: () => DFX.active(),
      catchState: () => ST.catch && { ph: ST.catch.ph, ok: ST.catch.ok }, forceCatch: v => { ST.force = v; }, catchNow: id => startCatch(ctx, window.__fct.mo(id)), duel: id => duelWild(ctx, window.__fct.mo(id)),
      evoShow: (sp0, v) => { const s = SPECIES[sp0]; if (!s || !s.evo) return false; showStart(ctx, sp0, s.evo, v); return true; }, show: () => ST.show && { ph: ST.show.ph, sp: ST.show.sp, t: +ST.show.t.toFixed(2), log: ST.show.E ? ST.show.E.log : [] }, setLv: (id, lv) => { const d = tnData(ctx); const m = d && d.team.concat(d.box).find(q => q.id === id); if (m) { m.lv = lv; ctx.persist(); } return !!m; },
      tn: () => { const d = tnData(ctx); return d ? { ...d.tn } : null; }, tnAdd: (he, n) => tnAdd(ctx, he, n, null), openTN: () => openTN(ctx), level: id => tnLevel(ctx, id), panel: () => ST.panel, errs: () => ST.errs, awake: () => [...ST.awake].map(m => m.id), dmgLog: () => ST.dmgLog.slice(),
    };
  },
  onZoneLeave(ctx) { ST.marks = []; ST.catch = null; ST.show = null; ST.ultBusy = null; closeTN(ctx); chipHide(); },
  update(dt, ctx) {
    if (ST.chipT > 0 && (ST.chipT -= dt) <= 0) chipHide();
    if (ctx.S.mode !== 'play' || duelOn(ctx)) return;
    /* ≤ 8 thú gần nhất trong 1,5 màn chạy AI đầy đủ */
    const p = ctx.S.player, VW = ctx.VW || 320, R = VW * 0.75 + 80, L0 = (ctx.monsters ? ctx.monsters.list() : []).filter(m => m.c && m.c.fct && m.hp > 0);
    ST.awake = new Set(L0.map(m => [m, dist(m, p)]).filter(([, d]) => d < R).sort((a, b) => a[1] - b[1]).slice(0, AWAKE_MAX).map(([m]) => m));
    if (DFX.CODE) { DFX.update(dt); if (!ST.prewarmed && L0.length) { ST.prewarmed = true; const ks = new Set(); for (const sp of Object.keys(FSP)) for (const id of FSP[sp].moves.concat(FSP[sp].ult)) { const k = DFX.sceneOf(id); if (k) ks.add(k); } DFX.prewarm([...ks]); } if (DFX.warmLeft && DFX.warmLeft()) DFX.warmTick(2); }
    updCatch(ctx, dt); showUpdate(ctx, dt);
    if (ST.punch) { const P = ST.punch, S = ctx.S; P.t += dt; const k = P.t / 0.3; if (k >= 1) { S.camZoom = 1; S.camFocus = null; ST.punch = null; } else { S.camZoom = 1 + P.k * Math.sin(Math.PI * k); S.camFocus = { x: P.x, y: P.y }; } }
    if (ST.ultBusy && (!L0.includes(ST.ultBusy) || !(ST.ultBusy.F && ST.ultBusy.F.cast))) ST.ultBusy = null;
  },
  near(ctx) {
    if (ctx.S.mode !== 'play' || duelOn(ctx) || ST.catch) return null; const p = ctx.S.player, t = L(ctx), L0 = (ctx.monsters ? ctx.monsters.list() : []).filter(m => m.c && m.c.fct && m.F && m.hp > 0 && !m.hide);
    let best = null, bd = 40;
    for (const mo of L0) { const d = dist(mo, p); if (d >= bd) continue;
      if (canCatch(ctx, mo)) { bd = d; const n = ctx.chanthu.balls(); best = { label: n > 0 ? t.anthu(n) : t.noBall, x: mo.x, y: mo.y + 20, limit: 64, priority: 3, mouse: false, data: { fct: mo, act: 'catch' } }; continue; }
      if (!mo.angry && !(mo.F.nt) && d < 28 && canDuel(ctx)) { bd = d; best = { label: t.duel(spName(ctx, mo.sp), mo.F.lv), x: mo.x, y: mo.y + 18, limit: 52, priority: true, data: { fct: mo, act: 'duel' } }; } }
    return best;
  },
  interact(ctx, cand) { const d = cand && cand.data; if (!d || !d.fct) return; if (d.act === 'catch') startCatch(ctx, d.fct); else if (d.act === 'duel') duelWild(ctx, d.fct); },
  key(code, ctx) { if (ST.panel && code === 'Escape') { closeTN(ctx); return true; } if (code === 'KeyT' && ctx.S.mode === 'play' && !duelOn(ctx)) return openTN(ctx); return false; },
  drawGround(g, ctx, cx, cy) { if (duelOn(ctx)) return; drawGround(g, ctx, cx, cy); if (ST.show && ST.show.E && ST.show.ph === 'evo') evoGround(g, ST.show.E, cx, cy); },
  drawables(ctx, cx, cy) {
    if (duelOn(ctx)) return []; const g = ctx.g, out = [];
    if (DFX.CODE) DFX.drawables(out, g, cx, cy);
    const sh = ST.show; if (sh) { out.push({ y: sh.y, f: () => drawShow(g, sh, cx, cy) }); if (sh.E && sh.ph === 'evo') evoDrawables(out, g, sh.E, cx, cy); }
    const C = ST.catch;
    if (C) { if (C.ph === 'throw') { const m = ANTM.anthu_spin; out.push({ y: C.y + 0.4, f: () => antDraw(g, 'anthu_spin', Math.floor(C.t * (m ? m.fps : 14)), C.x - cx, C.y - C.h - cy) }); }
      else if (C.ph === 'ok') { const m = ANTM.anthu_ok; out.push({ y: C.y + 0.4, f: () => antDraw(g, m && C.t < m.n / m.fps ? 'anthu_ok' : 'anthu_shake', m && C.t < m.n / m.fps ? Math.floor(C.t * m.fps) : 0, C.x - cx, C.y - cy) }); }
      else if (C.ph === 'fail') { const m = ANTM.anthu_fail; out.push({ y: C.y + 0.4, f: () => antDraw(g, 'anthu_fail', Math.floor(C.t * (m ? m.fps : 12)), C.x - cx, C.y - 8 - cy) }); }
      else if (C.ph !== 'suck') { const fr = C.ph === 'shake' ? [0, 1, 0, 3, 0][Math.min(4, Math.floor(C.t / CATCH.SHAKE * 5))] : 0; out.push({ y: C.y + 0.4, f: () => antDraw(g, 'anthu_shake', fr, C.x - cx, C.y - (C.h || 0) - cy) }); } }
    /* nút nhỏ Ấn Thu TĨNH dưới chân thú đang ở cửa sổ bắt (luật 13/10: UI sự kiện nhỏ, bám nhân vật) */
    for (const mo of (ctx.monsters ? ctx.monsters.list() : [])) if (mo.c && mo.c.fct && mo.F && !mo.hide && canCatch(ctx, mo)) { const ic = img('duel/anthu/anthu_icon.png'); if (ic) out.push({ y: mo.y + 0.3, f: () => g.drawImage(ic, 0, 0, ic.naturalWidth, ic.naturalHeight, (globalThis.__R89||Math.round)(mo.x - cx - 4), (globalThis.__R89||Math.round)(mo.y - cy + 2), 8, 8) }); }
    return out;
  },
};
