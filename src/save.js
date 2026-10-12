// save.js — localStorage persistence
let KEY = 'seismic9.save.v1';
export function useSlot(name) { KEY = 'seismic9.test.' + name; }   /* ?preset=<tên>: ô lưu test riêng, save thật không bị đụng */
export function defaultSave() {
  return {
    lang: 'en', name: '', zone: 'sea', entry: 'default', // every new game starts adrift at sea
    met: [], shards: 0, badges: [], seenGuide: false, tasks: {}, flags: {}, owned: [], outfit: null, target: null, self: null, achievements: [], music: true,
    // economy & systems (animals / vehicles / trees / rocky control)
    inv: { wood: 0, stone: 0, fish: 0, cow: 0, chicken: 0, bird: 0 }, tools: { axe: true, net: true, rod: false }, toolTier: { axe: 1 }, cards: [], sys: {},
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
export function dropBucket(s) {
  if (!s || typeof s !== 'object') return s;
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
