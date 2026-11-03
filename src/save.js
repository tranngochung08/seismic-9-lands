// save.js — localStorage persistence
let KEY = 'seismic9.save.v1';
export function useSlot(name) { KEY = 'seismic9.test.' + name; }   /* ?preset=<tên>: ô lưu test riêng, save thật không bị đụng */
export function defaultSave() {
  return {
    lang: 'en', name: '', zone: 'sea', entry: 'default', // every new game starts adrift at sea
    met: [], shards: 0, badges: [], seenGuide: false, tasks: {}, flags: {}, owned: [], outfit: null, target: null, self: null, achievements: [], music: true,
    // economy & systems (animals / vehicles / trees / rocky control)
    inv: { wood: 0, stone: 0, fish: 0, cow: 0, chicken: 0, bird: 0 }, tools: { axe: true, net: true, rod: false }, toolTier: { axe: 1 }, cards: [], sys: {},
    diff: 'normal', diffLoss: null,   /* plan-44 C2: Độ khó 'easy' | 'normal' (save cũ thiếu → Thường); diffLoss = { k, n, w } chuỗi thua cùng 1 đối thủ (systems/diff.js) */
    stats: null,   /* plan-44 P2: { v, sec, faints, tiles, since } — systems/stats.js tạo khi thiếu (save cũ) */
    clock: null,   /* F01: { day, season, year, hour, minute, min, today } — src/clock.js chuẩn hoá khi nạp; save cũ thiếu → Xuân · Ngày 1 · 6:00 */
    // the "Friend at Sea" storyline (normalized by story.js on load): act 1 prologue → 2 gather → 3 dive → 4 rescued
    story: { act: 1, step: 0, items: { divebell: false, trenchmap: false, greatcrystal: false }, rescued: false, attempts: 0, flashback: false, seaDone: false, keepsake: false }
  };
}
export function loadSave() { try { const s = JSON.parse(localStorage.getItem(KEY)); return s ? dropBucket({ ...defaultSave(), ...s }) : null; } catch (e) { return null; } }
/* 2026-10-11 anh bỏ hẳn XÔ và LỒNG: save cũ có xô/lồng → gỡ khỏi dụng cụ / túi / thanh công cụ; cá đang đựng trong xô (hoặc trên tay) → vào túi
   ('a_fish' | 'a_fishbig' | 'a_goldfish' | 'a_squid'); bỏ nước trong xô của ruộng. Thú nhỏ trong lồng: 1 con lên tay (nếu tay trống), còn lại vào TÚI
   ('a_chicken'…, không mất con nào); loài không có mã túi (bướm đêm) thì thả ra + báo (animals.js đọc sys.animals.migr). Chạy nhiều lần không sao.
   Cùng ngày (đợt 3) anh bỏ thêm THÒNG LỌNG, XE CHỞ VẬT NUÔI, YÊN NGỰA, BẪY: gỡ cấp/dụng cụ/túi/thanh công cụ; bò/cừu trong xe chở → cũng chỉ 1 con
   trên tay (chung luật với thú nhỏ: tay bế đúng 1 con), còn lại vào túi ('a_cow', 'a_sheep'). */
export const GONE_TOOLS = ['bucket', 'cage', 'cart', 'lasso', 'trap', 'saddle'];
const MERGED80 = ['axe', 'pickaxe', 'shovel', 'scythe', 'knife', 'torch'];
export function mergeTools80(s) {   /* p80: gỡ Rìu / Cuốc / Xẻng / Liềm / Dao / Đuốc khỏi cấp / túi / thanh / bảng thứ tự; cấp Búa = cấp cao nhất cũ (chạy nhiều lần không sao) */
  const tt = s.toolTier = s.toolTier || {}, tl = s.tools || null; let best = tt.bua || 0, any = best > 0;
  for (const id of MERGED80) { const t = tt[id] || (tl && tl[id] ? 1 : 0); if (t > 0) { any = true; best = Math.max(best, t); } delete tt[id]; if (tl) delete tl[id]; if (s.inv) delete s.inv[id]; }
  if (any) tt.bua = Math.max(1, best);
  let put = Array.isArray(s.hotbar) && s.hotbar.includes('bua'); const rep = a => (Array.isArray(a) ? a.map(id => (MERGED80.includes(id) ? (put ? null : ((put = true), 'bua')) : id)) : a);
  s.hotbar = rep(s.hotbar); if (Array.isArray(s.bagOrder)) { if (put) s.bagOrder = s.bagOrder.map(id => (id === 'bua' && s.hotbar.includes('bua') ? null : id)); s.bagOrder = rep(s.bagOrder); }
  if (Array.isArray(s.hbSeen)) { s.hbSeen = s.hbSeen.filter(id => !MERGED80.includes(id)); if (any && !s.hbSeen.includes('bua')) s.hbSeen.push('bua'); }
  if (MERGED80.includes(s.mHeld)) s.mHeld = 'bua';
  return s;
}
export function dropBucket(s) {
  if (!s || typeof s !== 'object') return s;
  mergeTools80(s);   /* p80: 6 dụng cụ → Búa Seismic */
  const gone = id => GONE_TOOLS.includes(id);
  for (const id of GONE_TOOLS) { if (s.toolTier) delete s.toolTier[id]; if (s.tools) delete s.tools[id]; if (s.inv) delete s.inv[id]; }
  if (Array.isArray(s.hotbar)) s.hotbar = s.hotbar.map(id => (gone(id) ? null : id));
  if (Array.isArray(s.bagOrder)) s.bagOrder = s.bagOrder.map(id => (gone(id) ? null : id));
  if (Array.isArray(s.hbSeen)) s.hbSeen = s.hbSeen.filter(id => !gone(id));
  if (gone(s.mHeld)) delete s.mHeld;   /* mobile: món đang cầm là dụng cụ đã bỏ */
  const f = s.sys && s.sys.farm; if (f) delete f.bucketWater;
  const a = s.sys && s.sys.animals, c = a && Array.isArray(a.carry) ? a.carry : null;
  if (c) {
    s.inv = s.inv || {}; const sp = (a.fishSp = Array.isArray(a.fishSp) ? a.fishSp : []);
    for (let i = c.length - 1; i >= 0; i--) {
      const it = c[i], k = typeof it === 'string' ? it : it && it.kind; if (k !== 'fish' && k !== 'goldfish' && k !== 'squid') continue;
      const id = k === 'fish' ? (it && it.big ? 'a_fishbig' : 'a_fish') : 'a_' + k;
      s.inv[id] = (s.inv[id] || 0) + 1; if (it && it.sp) sp.push(it.sp); c.splice(i, 1);
    }
    s.inv.fish = 0; s.inv.goldfish = 0; s.inv.squid = 0;   /* gương 'trên đầu' — không còn cá trên đầu */
    /* thú (hết lồng + xe chở): tay chỉ bế 1 con — tay đã bận (đồ lặn vượt 2, mẫu dung nham) thì không giữ con nào */
    const HELD = ['chicken', 'bird', 'rabbit', 'crab', 'bat', 'moth', 'cow', 'sheep'], BAGGABLE = ['chicken', 'bird', 'rabbit', 'crab', 'bat', 'cow', 'sheep'];
    const kindOf = it => (typeof it === 'string' ? it : it && it.kind);
    const loot = c.filter(it => !HELD.includes(kindOf(it)) && kindOf(it) !== 'sala').length;
    let handFree = Math.max(0, loot - 2) + c.filter(it => kindOf(it) === 'sala').length === 0, toBag = 0, freed = 0;
    for (let i = 0; i < c.length; i++) {
      const k = kindOf(c[i]); if (!HELD.includes(k)) continue;
      if (handFree) { handFree = false; continue; }
      c.splice(i--, 1);
      if (BAGGABLE.includes(k)) { s.inv['a_' + k] = (s.inv['a_' + k] || 0) + 1; toBag++; } else freed++;
    }
    for (const k of HELD) if (k in s.inv) s.inv[k] = c.filter(it => kindOf(it) === k).length;
    if (toBag || freed) a.migr = { bag: (a.migr && a.migr.bag || 0) + toBag, freed: (a.migr && a.migr.freed || 0) + freed };
  }
  return s;
}
export let SAVE_OFF = false; export function saveOff() { SAVE_OFF = true; }   /* ?promo: không ghi đè save thật */
export function writeSave(s) { if (SAVE_OFF) return; try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) { } }
export function clearSave() { try { localStorage.removeItem(KEY); } catch (e) { } }

/* ---- plan-44 Q6 (2026-10-17): XUẤT / NHẬP MÃ LƯU — mang save sang máy khác (máy tính ↔ điện thoại) ----
   Mã = 'S9Z1:' + base64(gzip(JSON)) (trình duyệt có CompressionStream) hoặc 'S9J1:' + base64(JSON UTF-8). Nhập: kiểm định dạng + các trường chính,
   rồi ghi vào ô lưu hiện tại (writeSave) và CHẶN mọi lần ghi sau (saveOff) để game đang chạy không đè lên trước khi tải lại. Save cũ thiếu trường mới
   vẫn chạy (loadSave trộn với defaultSave). */
const b64e = u8 => { let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); };
const b64d = s => { const bin = atob(s.replace(/\s+/g, '')); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u; };
async function pipe(u8, Stream) { const r = new Blob([u8]).stream().pipeThrough(new Stream('gzip')); return new Uint8Array(await new Response(r).arrayBuffer()); }
export async function exportCode(save) {
  const raw = new TextEncoder().encode(JSON.stringify(save));
  if (typeof CompressionStream !== 'undefined') { try { return 'S9Z1:' + b64e(await pipe(raw, CompressionStream)); } catch (e) { /* rơi xuống bản không nén */ } }
  return 'S9J1:' + b64e(raw);
}
export function checkSave(s) {   /* → null nếu hợp lệ, không thì lý do (mã ngắn) */
  if (!s || typeof s !== 'object' || Array.isArray(s)) return 'notobj';
  if (typeof s.zone !== 'string' || !s.zone) return 'zone';
  if (!Array.isArray(s.met)) return 'met';
  if (!s.inv || typeof s.inv !== 'object') return 'inv';
  if (s.badges != null && !Array.isArray(s.badges)) return 'badges';
  return null;
}
export async function parseCode(text) {   /* → { ok, save, why } */
  try {
    let t = String(text || '').trim(); if (!t) return { ok: false, why: 'empty' };
    let json;
    if (t.startsWith('{')) json = t;   /* chấp nhận cả file JSON thô */
    else if (t.startsWith('S9Z1:')) { if (typeof DecompressionStream === 'undefined') return { ok: false, why: 'nogzip' }; json = new TextDecoder().decode(await pipe(b64d(t.slice(5)), DecompressionStream)); }
    else if (t.startsWith('S9J1:')) json = new TextDecoder().decode(b64d(t.slice(5)));
    else return { ok: false, why: 'format' };
    const s = JSON.parse(json), why = checkSave(s); if (why) return { ok: false, why };
    return { ok: true, save: dropBucket({ ...defaultSave(), ...s }) };
  } catch (e) { return { ok: false, why: 'broken' }; }
}
export function importSave(s) { if (SAVE_OFF) return false; try { localStorage.setItem(KEY, JSON.stringify(s)); SAVE_OFF = true; return true; } catch (e) { return false; } }
