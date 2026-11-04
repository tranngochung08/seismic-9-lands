// cloud.js — plan-82 Bậc 0: lớp mạng của game (đăng nhập Google hoặc email nhận mã 6 số qua Supabase — anh chốt 2026-11-03, bỏ Discord; save mây, xếp hạng, đội bóng, đấu bóng, online).
// c1-p82 (cloud, 2026-11-03): bản chép từ _wip/p82 + mock khớp SQL đã chạy thật (prune tách bản 'conflict', stash ≤ 3/giờ, my_rank tab lạ, publish mode lạ).
// Móc vào game qua src/cloud82.js (cờ URL ?cloud82=1, mặc định TẮT).
//
// 3 chế độ:
//   'off'      — không cấu hình (SUPABASE_URL / SUPABASE_ANON_KEY rỗng) hoặc ?cloud=off → mọi hàm trả { ok:false, err:'off' }, game chạy ngoại tuyến y như cũ.
//   'mock'     — ?cloud=mock: backend GIẢ trong localStorage (khoá riêng seismic9.cloudmock.*), giả lập độ trễ / mất mạng / mất phản hồi để test.
//   'supabase' — gọi Supabase thật (supabase-js nạp LƯỜI, ghim bản) + RPC trong server/supabase/migrations/0001_bac0.sql.
// Không có khoá bí mật nào ở đây: chỉ đọc URL + khoá công khai (anon/publishable) từ CONFIG. Khoá service_role KHÔNG BAO GIỜ vào client.
// Mọi hàm async, KHÔNG ném lỗi ra ngoài: luôn trả { ok, err? , ... } — lỗi mạng không được chặn game ('Loading…').
//
// Phần đồng bộ save (createSync) theo plan-82 §3.3: save.meta = { rev, srev, base, upd, dev, cloud, pid }
//   rev  = số lần ghi cục bộ (tăng mỗi writeSave)      srev = rev cục bộ lúc đồng bộ cuối  → cục bộ đã đổi khi rev > srev
//   base = rev MÂY lúc đồng bộ cuối                       → mây đã tiến khi cloud.rev > base
//   dev  = id ngẫu nhiên của máy   cloud = user_id đã gắn   pid = mã lần đẩy cuối, pids = các lần đẩy CHƯA được xác nhận (nhận ra lần đẩy đã vào nhưng mất phản hồi)

export const SUPABASE_JS = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm';   /* ghim bản [CC kiểm lại bản mới nhất ≥ 2 tuần tuổi lúc đợt 1] */
export const SAVE_MAX = 1000000;          /* byte JSON — khớp push_save phía server */
export const KEEPALIVE_MAX = 60000;       /* fetch keepalive giới hạn ~64 KB thân → lớn hơn thì để lần mở sau */
export const PUSH_EVERY = 60;             /* giây: đẩy tối đa 1 lần / phút (trừ flushNow) */
export const BACKUP_KEEP = 5;
export const CONFLICT_KEEP = 3;          /* bản 'conflict' (stash) giữ riêng — khớp _prune_backups SQL */
export const BAK_SUFFIX = '.bak';
const DEV_KEY = 'seismic9.device';
const MOCK_DB = 'seismic9.cloudmock.v1';
const MOCK_SESS = 'seismic9.cloudmock.session';
const MOCK_OTP = 'seismic9.cloudmock.otp';
export const OTP_TTL = 600;               /* giây: mã email hết hạn (mock; Supabase mặc định 1 giờ, chỉnh được) */
export const OTP_TRIES = 5;
export const emailOk = e => typeof e === 'string' && e.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());
export const maskEmail = e => { const [a, b] = String(e || '').split('@'); return b ? a.slice(0, 1) + '***@' + b : null; };

const nowS = () => Date.now() / 1000;
const rid = (n = 10) => { let s = ''; const A = 'abcdefghijklmnopqrstuvwxyz0123456789'; for (let i = 0; i < n; i++) s += A[(Math.random() * A.length) | 0]; return s; };
const clone = o => (o == null ? o : JSON.parse(JSON.stringify(o)));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const lenOf = (o, k) => (o && Array.isArray(o[k]) ? o[k].length : 0);
function sget(st, k) { try { const v = st && st.getItem(k); return v == null ? null : v; } catch (e) { return null; } }
function sset(st, k, v) { try { st && st.setItem(k, v); return true; } catch (e) { return false; } }
function sdel(st, k) { try { st && st.removeItem(k); } catch (e) { } }
function jget(st, k) { try { const v = sget(st, k); return v ? JSON.parse(v) : null; } catch (e) { return null; } }

/* ---------- kiểm save (khớp checkSave của save.js + _save_problem phía server) ---------- */
export function saveProblem(s) {
  if (!s || typeof s !== 'object' || Array.isArray(s)) return 'notobj';
  if (typeof s.zone !== 'string' || !s.zone) return 'zone';
  if (!Array.isArray(s.met)) return 'met';
  if (!s.inv || typeof s.inv !== 'object') return 'inv';
  if (s.badges != null && !Array.isArray(s.badges)) return 'badges';
  return null;
}
export const cleanName = t => { const n = String(t == null ? '' : t).replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 32); return n || null; };   /* khớp check profiles.name ≤ 32, không ký tự điều khiển */
export function deviceId(storage) { let d = sget(storage, DEV_KEY); if (!d) { d = 'd' + rid(9); sset(storage, DEV_KEY, d); } return d; }
/* save.js gọi trước mỗi writeSave (đợt 2): tăng rev, ghi giờ + máy. Save cũ thiếu meta → tạo mới (coi như khách chưa gắn tài khoản). */
export function bumpMeta(save, dev) {
  const m = (save.meta && typeof save.meta === 'object') ? save.meta : (save.meta = {});
  m.rev = (m.rev | 0) + 1; if (m.srev == null) m.srev = 0; if (m.base == null) m.base = 0;
  m.upd = Math.round(nowS()); if (dev) m.dev = dev; if (m.cloud === undefined) m.cloud = null;
  return save;
}
export function summary(save, extra = {}) {   /* tóm tắt cho bảng xung đột: giờ chơi, vùng, huy hiệu, số thú, lần lưu cuối, máy */
  if (!save) return null;
  const ct = save.sys && save.sys.chanthu, m = save.meta || {};
  return { play_sec: (save.stats && save.stats.sec) | 0, zone: save.zone, badges: lenOf(save, 'badges'), caught: ct ? ct.caught | 0 : 0,
    team: ct && Array.isArray(ct.team) ? ct.team.length : 0, upd: m.upd || null, dev: m.dev || null, ...extra };
}

/* ---------- bảng quyết định §3.3 (hàm thuần — test được không cần mạng) ----------
   local: save cục bộ | null ; cloud: { rev, data } | null ; uid: user đang đăng nhập
   → 'new' | 'ask_upload' | 'download' | 'push' | 'same' | 'conflict' | 'other_account' */
export function decide(local, cloud, uid) {
  const m = (local && local.meta) || {};
  if (!local && !cloud) return 'new';
  if (local && m.cloud && m.cloud !== uid) return 'other_account';
  if (!local) return 'download';
  if (!cloud) return 'ask_upload';
  if (!m.cloud) return 'conflict';                          /* save khách ở máy này + tài khoản đã có save mây → hỏi, không đè */
  const changed = (m.rev | 0) > (m.srev | 0), ahead = (cloud.rev | 0) > (m.base | 0);
  if (!changed && !ahead) return 'same';
  if (changed && !ahead) return 'push';
  if (!changed && ahead) return 'download';
  return 'conflict';
}

/* ---------- luật đội bóng (bản JS khớp check_team trong SQL; rules = server/supabase/rules82.json) ---------- */
export function checkTeam(rules, team, mode = '3v3') {
  const max = rules && rules.team_max && rules.team_max[mode];
  if (!max) return { ok: false, why: 'mode' };
  if (!Array.isArray(team)) return { ok: false, why: 'notarray' };
  if (team.length < 1 || team.length > max) return { ok: false, why: 'size' };
  const out = [], ids = new Set(); let power = 0, huyen = 0;
  const learnAt = (sp, lv, ult) => { const L = rules.learn[sp] || []; return new Set(L.filter(q => q[0] <= lv && !!q[2] === ult).map(q => q[1])); };
  for (let i = 0; i < team.length; i++) {
    const e = team[i], n = i + 1;
    if (!e || typeof e !== 'object' || Array.isArray(e)) return { ok: false, why: 'entry:' + n };
    if (e.id != null) { if (ids.has(e.id)) return { ok: false, why: 'dup:' + n }; ids.add(e.id); }
    const rs = rules.species[e.sp];
    if (!rs) return { ok: false, why: 'sp:' + n + ':' + (e.sp || '?') };
    if (!rs.battle) return { ok: false, why: 'nobattle:' + n + ':' + e.sp };
    if (typeof e.lv !== 'number' || !Number.isInteger(e.lv) || e.lv < 1 || e.lv > (rs.max_lv || rules.max_lv)) return { ok: false, why: 'lv:' + n };
    if (rs.rarity === 'huyen') huyen++;
    let mv = [], ult = null;
    if (rs.learn) {
      if (e.mv != null) {
        if (!Array.isArray(e.mv) || e.mv.length > (rules.mv_max || 4)) return { ok: false, why: 'mv:' + n };
        const ok = learnAt(e.sp, e.lv, false);
        for (const id of e.mv) { if (typeof id !== 'string' || mv.includes(id)) return { ok: false, why: 'mv:' + n }; if (!ok.has(id)) return { ok: false, why: 'mv:' + n + ':' + id }; mv.push(id); }
      }
      if (e.ult != null) { if (!learnAt(e.sp, e.lv, true).has(e.ult)) return { ok: false, why: 'ult:' + n + ':' + e.ult }; ult = e.ult; }
    }
    if (e.lt != null && !/^[a-z0-9_]{1,24}$/.test(String(e.lt))) return { ok: false, why: 'lt:' + n };
    const name = String(e.name == null ? '' : e.name).replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, rules.name_max || 14) || null;
    out.push({ sp: e.sp, lv: e.lv, mv: mv.length ? mv : null, ult, lt: e.lt == null ? null : String(e.lt), name, shiny: !!e.shiny });
    power += e.lv * (rs.rarity === 'huyen' ? 13 : 10);
  }
  if (huyen > 1) return { ok: false, why: 'huyen' };
  return { ok: true, team: out, power };
}
export const teamPower = (rules, team) => { const c = checkTeam(rules, team); return c.ok ? c.power : 0; };

/* =====================================================================================================
   Backend GIẢ (mock) — cùng hợp đồng trả về như RPC SQL. db = storage dùng CHUNG giữa các "máy" giả.
   ===================================================================================================== */
function mockBackend(o) {
  const dbSt = o.db, devSt = o.storage, rules = o.rules || null;
  const ctl = { latency: o.latency | 0, offline: !!o.offline, failNext: null, calls: 0 };   /* failNext: 'before' (mất mạng trước khi tới server) | 'after' (server đã làm, mất phản hồi) */
  const load = () => { const d = jget(dbSt, MOCK_DB) || {}; for (const k of ['profiles', 'saves', 'stats', 'ghosts']) d[k] ||= {}; for (const k of ['backups', 'duels']) d[k] ||= []; d.seq ||= 1; return d; };
  const store = d => sset(dbSt, MOCK_DB, JSON.stringify(d));
  const sess = () => jget(devSt, MOCK_SESS);
  const clock = () => (o.now ? o.now() : Date.now());
  async function call(name, fn) {
    ctl.calls++;
    if (ctl.latency) await sleep(ctl.latency);
    if (ctl.offline) return { ok: false, err: 'network' };
    const f = ctl.failNext; ctl.failNext = null;
    if (f === 'before') return { ok: false, err: 'network' };
    let r; try { const d = load(); r = fn(d); store(d); } catch (e) { return { ok: false, err: e && e.message === 'auth' ? 'auth' : 'mock:' + (e && e.message) }; }
    if (f === 'after') return { ok: false, err: 'network' };
    return r;
  }
  const uidOf = () => { const s = sess(); return s && s.user ? s.user.id : null; };
  const needU = (d) => { const u = uidOf(); if (!u) throw new Error('auth'); return u; };
  function prune(d, uid) {
    const all = d.backups.filter(b => b.user_id === uid).sort((a, b) => b.created_at - a.created_at || b.id - a.id);
    const mine = all.filter(b => b.reason !== 'conflict'), cf = all.filter(b => b.reason === 'conflict');   /* khớp SQL: bản conflict tính riêng, không đẩy mất lịch sử push */
    const keep = new Set(mine.slice(0, BACKUP_KEEP).map(b => b.id).concat(cf.slice(0, CONFLICT_KEEP).map(b => b.id))), days = new Set(), wk = clock() - 7 * 86400e3;
    for (const b of mine) { const day = Math.floor(b.created_at / 86400e3); if (b.created_at > wk && !days.has(day)) { days.add(day); keep.add(b.id); } }
    d.backups = d.backups.filter(b => b.user_id !== uid || keep.has(b.id));
  }
  function statsFrom(d, uid, data, play) {
    const st = d.stats[uid] ||= { arena_pts: 1000, flags: [] }, ct = (data.sys && data.sys.chanthu) || {};
    st.zone_badges = lenOf(data, 'badges'); st.leader_badges = lenOf(data.sys && data.sys.leaderArena, 'badges'); st.caught = typeof ct.caught === 'number' ? Math.max(0, Math.min(1e6, Math.trunc(ct.caught))) : 0;
    st.tn_total = ct.tn && typeof ct.tn === 'object' ? Math.min(2e9, Object.values(ct.tn).reduce((a, v) => a + (typeof v === 'number' && v > 0 ? Math.min(1e9, v) : 0), 0)) : 0;   /* khớp trigger SQL: kẹp từng hệ 1e9, tổng 2e9 */
    st.play_sec = play; st.updated_at = clock();
  }
  const api = {
    ctl,
    async session() { const s = sess(); return { ok: true, user: s ? s.user : null }; },
    /* signIn({ provider: 'google' }) → vào ngay (mock không chuyển trang) · signIn({ email }) → "gửi" mã 6 số (ctl.lastCode), rồi verifyOtp(email, mã) */
    async signIn(x = {}) {
      if (x.email != null) {
        const em = String(x.email).trim().toLowerCase(); if (!emailOk(em)) return { ok: false, err: 'bad_email' };
        if (ctl.offline) return { ok: false, err: 'network' };
        const code = String(100000 + Math.floor(Math.random() * 900000)); ctl.lastCode = code;
        sset(devSt, MOCK_OTP, JSON.stringify({ email: em, code, exp: clock() + OTP_TTL * 1000, tries: 0 }));
        return { ok: true, sent: true, email: maskEmail(em) };
      }
      const u = o.user || { key: 'g1', name: 'Mock Player', provider: 'google' };
      const user = { id: u.id || 'mock-' + (u.key || u.email), provider: u.provider || 'google', name: u.name || null, avatar: u.avatar || null };
      sset(devSt, MOCK_SESS, JSON.stringify({ user, at: clock() }));
      return { ok: true, user, redirect: false };
    },
    async verifyOtp(email, code) {
      const p = jget(devSt, MOCK_OTP), em = String(email || '').trim().toLowerCase();
      if (!p || p.email !== em) return { ok: false, err: 'bad_code' };
      if (clock() > p.exp) { sdel(devSt, MOCK_OTP); return { ok: false, err: 'expired' }; }
      if (p.tries >= OTP_TRIES) return { ok: false, err: 'too_many' };
      if (String(code || '').trim() !== p.code) { p.tries++; sset(devSt, MOCK_OTP, JSON.stringify(p)); return { ok: false, err: 'bad_code', left: OTP_TRIES - p.tries }; }
      sdel(devSt, MOCK_OTP);
      const user = { id: 'mock-' + em, provider: 'email', name: null, avatar: null, email: maskEmail(em) };
      sset(devSt, MOCK_SESS, JSON.stringify({ user, at: clock() }));
      return { ok: true, user };
    },
    async signOut() { sdel(devSt, MOCK_SESS); return { ok: true }; },
    ensureProfile: () => call('ensure_profile', d => {
      const s = sess(); if (!s) return { ok: false, err: 'auth' };
      const u = s.user, p = d.profiles[u.id] ||= { id: u.id, provider: u.provider || 'email', name: u.name || 'Player', avatar: u.avatar || null, roster_id: null, public: true, banned: false, created_at: clock() };   /* khớp ensure_profile SQL: email → 'Player' */
      p.last_seen = clock(); d.stats[u.id] ||= { arena_pts: 1000, flags: [] };
      return { ok: true, ...p };
    }),
    setName: name => call('set_name', d => { const u = needU(d), p = d.profiles[u], n = cleanName(name); if (!n) return { ok: false, err: 'bad_name' }; if (p) p.name = n; return { ok: true, name: n }; }),
    pullSave: () => call('pull', d => { const u = needU(d), s = d.saves[u]; return s ? { ok: true, rev: s.rev, data: clone(s.data), play_sec: s.play_sec, updated_at: s.updated_at, device: s.device } : { ok: true, rev: 0, data: null }; }),
    pushSave: (data, baseRev, x = {}) => call('push_save', d => {
      const u = needU(d), txt = JSON.stringify(data), size = new TextEncoder().encode(txt).length;
      if (size > SAVE_MAX) return { ok: false, err: 'too_big', size };
      const bad = saveProblem(data); if (bad) return { ok: false, err: 'bad:' + bad };
      const cur = d.saves[u], sec = data.stats && typeof data.stats.sec === 'number' ? data.stats.sec : (x.playSec | 0), play = Math.max(0, Math.min(2e9, Math.trunc(sec) || 0));   /* khớp SQL: kẹp trước khi ép số nguyên */
      if (!cur) {
        if ((baseRev | 0) !== 0) return { ok: false, err: 'conflict', cloud: null };
        d.saves[u] = { rev: 1, data: JSON.parse(txt), size, play_sec: play, device: x.device || null, client_ver: x.ver || null, updated_at: clock() };
        statsFrom(d, u, data, play); return { ok: true, rev: 1 };
      }
      if (cur.rev !== (baseRev == null ? -1 : baseRev | 0)) return { ok: false, err: 'conflict', cloud: { rev: cur.rev, play_sec: cur.play_sec, updated_at: cur.updated_at, device: cur.device, zone: cur.data.zone, badges: lenOf(cur.data, 'badges'), pid: cur.data.meta ? cur.data.meta.pid || null : null } };
      d.backups.push({ id: d.seq++, user_id: u, rev: cur.rev, data: cur.data, play_sec: cur.play_sec, device: cur.device, reason: 'push', created_at: clock() }); prune(d, u);
      d.saves[u] = { rev: cur.rev + 1, data: JSON.parse(txt), size, play_sec: play, device: x.device || null, client_ver: x.ver || null, updated_at: clock() };
      statsFrom(d, u, data, play); return { ok: true, rev: cur.rev + 1 };
    }),
    listBackups: () => call('list_backups', d => { const u = needU(d); return { ok: true, list: d.backups.filter(b => b.user_id === u).sort((a, b) => b.created_at - a.created_at || b.id - a.id).map(b => ({ id: b.id, rev: b.rev, play_sec: b.play_sec, device: b.device, reason: b.reason, created_at: b.created_at, zone: b.data.zone, badges: lenOf(b.data, 'badges') })) }; }),
    getBackup: id => call('get_backup', d => { const u = needU(d), b = d.backups.find(q => q.id === id && q.user_id === u); return b ? { ok: true, data: clone(b.data), rev: b.rev } : { ok: false, err: 'notfound' }; }),
    restoreBackup: id => call('restore_backup', d => {
      const u = needU(d), b = d.backups.find(q => q.id === id && q.user_id === u); if (!b) return { ok: false, err: 'notfound' };
      const cur = d.saves[u]; if (cur) { d.backups.push({ id: d.seq++, user_id: u, rev: cur.rev, data: cur.data, play_sec: cur.play_sec, device: cur.device, reason: 'restore', created_at: clock() }); prune(d, u); }
      const rev = cur ? cur.rev + 1 : 1; d.saves[u] = { rev, data: clone(b.data), size: JSON.stringify(b.data).length, play_sec: b.play_sec, device: 'restore', updated_at: clock() };
      statsFrom(d, u, b.data, b.play_sec); return { ok: true, rev };
    }),
    stashBackup: (data, rev, x = {}) => call('stash_backup', d => { const u = needU(d); if (saveProblem(data)) return { ok: false, err: 'bad' };
      if (d.backups.filter(b => b.user_id === u && b.reason === 'conflict' && b.created_at > clock() - 3600e3).length >= CONFLICT_KEEP) return { ok: false, err: 'limit' }; d.backups.push({ id: d.seq++, user_id: u, rev: rev | 0, data: clone(data), play_sec: x.playSec | 0, device: x.device || null, reason: 'conflict', created_at: clock() }); prune(d, u); return { ok: true }; }),
    leaderboard: (tab, limit = 50) => call('leaderboard', d => {
      const rows = Object.entries(d.stats).filter(([u]) => d.profiles[u] && d.profiles[u].public && !d.profiles[u].banned && d.stats[u][tab] != null)
        .map(([u, s]) => ({ user_id: u, name: d.profiles[u].name, avatar: d.profiles[u].avatar, roster_id: d.profiles[u].roster_id, value: s[tab] })).sort((a, b) => b.value - a.value).slice(0, Math.min(100, limit));
      rows.forEach((r, i) => { r.rank = i && rows[i - 1].value === r.value ? rows[i - 1].rank : i + 1; }); return { ok: true, rows };
    }),
    myRank: tab => call('my_rank', d => { const u = needU(d), v = d.stats[u] && d.stats[u][tab] != null ? d.stats[u][tab] : null; if (v == null) return { ok: true, value: null, rank: null }; const rank = 1 + Object.entries(d.stats).filter(([q, s]) => d.profiles[q] && d.profiles[q].public && !d.profiles[q].banned && s[tab] > v).length; return { ok: true, value: v, rank }; }),
    publishTeam: (team, look, ver, mode = '3v3') => call('publish_team', d => {
      const u = needU(d), c = rules ? checkTeam(rules, team, mode) : { ok: true, team, power: 0, why: 'norules' };
      if (c.why === 'mode') return { ok: false, why: 'mode', power: 0 };   /* khớp SQL: mode lạ không ghi */
      d.ghosts[u + ':' + mode] = { user_id: u, mode, team: c.ok ? c.team : team, power: c.power || 0, look: look || null, client_ver: ver || null, ok: !!c.ok, why: c.why || null, updated_at: clock() };
      return { ok: !!c.ok, why: c.why || null, power: c.power || 0 };
    }),
    pickOpponents: (n = 5, power = null, mode = '3v3') => call('pick_opponents', d => {
      const u = needU(d), mine = d.ghosts[u + ':' + mode], P = Math.max(1, power || (mine && mine.ok ? mine.power : 300)), day0 = Math.floor(clock() / 86400e3) * 86400e3;
      const band = g => { const x = Math.abs(g.power - P); return x <= P * 0.25 ? 0 : x <= P * 0.5 ? 1 : x <= P ? 2 : 3; };
      const rows = Object.values(d.ghosts).filter(g => g.mode === mode && g.ok && g.user_id !== u && d.profiles[g.user_id] && d.profiles[g.user_id].public && !d.profiles[g.user_id].banned
        && d.duels.filter(q => q.challenger === u && q.defender === g.user_id && q.created_at > day0).length < 3)
        .sort((a, b) => band(a) - band(b) || b.updated_at - a.updated_at).slice(0, Math.min(10, Math.max(1, n)))
        .map(g => ({ user_id: g.user_id, name: d.profiles[g.user_id].name, avatar: d.profiles[g.user_id].avatar, roster_id: d.profiles[g.user_id].roster_id, arena_pts: (d.stats[g.user_id] || {}).arena_pts || 1000, team: clone(g.team), look: clone(g.look), power: g.power, updated_at: g.updated_at }));
      return { ok: true, rows };
    }),
    reportDuel: (defender, win, dur_s, myTeam, foeRev, ver) => call('report_duel', d => {
      const u = needU(d), t = clock(), day0 = Math.floor(t / 86400e3) * 86400e3;
      if (!defender || defender === u) return { ok: false, err: 'target' };
      if (!Object.values(d.ghosts).some(g => g.user_id === defender && g.ok)) return { ok: false, err: 'noghost' };
      const mineD = d.duels.filter(q => q.challenger === u);
      if (mineD.some(q => q.created_at > t - 15e3)) return { ok: false, err: 'too_fast' };
      if (mineD.filter(q => q.created_at > day0).length >= 30) return { ok: false, err: 'limit_day' };
      if (mineD.filter(q => q.created_at > day0 && q.defender === defender).length >= 3) return { ok: false, err: 'limit_foe' };
      const A = d.stats[u] ||= { arena_pts: 1000, flags: [] }, B = d.stats[defender] ||= { arena_pts: 1000, flags: [] };
      const ea = 1 / (1 + Math.pow(10, (B.arena_pts - A.arena_pts) / 400)), delta = Math.round(24 * ((win ? 1 : 0) - ea));
      const first = !!win && !mineD.some(q => q.win && q.created_at > day0), flag = (dur_s || 0) < 20 ? 'short' : null;
      A.arena_pts = Math.max(0, A.arena_pts + delta); B.arena_pts = Math.max(0, B.arena_pts - delta);
      if (flag) (A.flags ||= []).push({ k: 'duel_short', t, i: { dur: dur_s } });
      d.duels.push({ id: d.seq++, challenger: u, defender, win: !!win, dur_s, my_team: myTeam || null, foe_rev: foeRev || null, pts_delta: delta, client_ver: ver || null, flag, created_at: t });
      return { ok: true, delta, pts: A.arena_pts, foe_pts: B.arena_pts, first_win_today: first };
    }),
    defenseSummary: since => call('defense_summary', d => { const u = needU(d), s0 = since || clock() - 30 * 86400e3, L = d.duels.filter(q => q.defender === u && q.created_at > s0); return { ok: true, n: L.length, won: L.filter(q => !q.win).length, lost: L.filter(q => q.win).length, pts: L.reduce((a, q) => a - q.pts_delta, 0) }; }),
    heartbeat: () => call('heartbeat', d => { const u = needU(d); if (d.profiles[u]) d.profiles[u].last_seen = clock(); return { ok: true }; }),
    onlineCount: () => call('online_count', d => { const t = clock(), P = Object.values(d.profiles).filter(p => !p.banned); return { ok: true, online: P.filter(p => p.last_seen > t - 300e3).length, total: P.length }; }),
    reportUser: (target, reason) => call('report_user', d => { needU(d); return d.profiles[target] ? { ok: true } : { ok: false, err: 'target' }; }),
    deleteAccount: () => call('delete_account', d => { const u = needU(d); delete d.profiles[u]; delete d.saves[u]; delete d.stats[u]; d.backups = d.backups.filter(b => b.user_id !== u); for (const k of Object.keys(d.ghosts)) if (d.ghosts[k].user_id === u) delete d.ghosts[k]; sdel(devSt, MOCK_SESS); return { ok: true }; })
  };
  return api;
}

/* =====================================================================================================
   Backend Supabase THẬT — KHUNG (đợt 0 chưa chạy với dự án thật nào). Gọi RPC theo 0001_bac0.sql.
   ===================================================================================================== */
function supabaseBackend(o) {
  const url = String(o.url || '').replace(/\/+$/, ''), key = o.anonKey, win = o.window || (typeof window !== 'undefined' ? window : null);
  let client = null, loading = null, lastToken = null;
  async function sb() {
    if (client) return client;
    if (!loading) loading = (async () => {
      const mod = o.loadLib ? await o.loadLib() : await import(/* @vite-ignore */ SUPABASE_JS);
      client = mod.createClient(url, key, { auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
      client.auth.onAuthStateChange((ev, s) => { lastToken = s ? s.access_token : null; for (const f of subs) try { f(ev, s ? s.user : null); } catch (e) { } });
      return client;
    })().catch(e => { loading = null; throw e; });
    return loading;
  }
  const subs = new Set();
  const wrap = async fn => { try { return await fn(await sb()); } catch (e) { return { ok: false, err: 'network', detail: String(e && e.message || e) }; } };
  const rpc = (name, args) => wrap(async c => { const { data, error } = await c.rpc(name, args || {}); if (error) return { ok: false, err: 'rpc', detail: error.message }; if (Array.isArray(data)) return { ok: true, rows: data }; if (data && typeof data === 'object') return 'ok' in data ? data : { ok: true, ...data }; return { ok: true, value: data }; });
  const mapUser = u => { if (!u) return null; const m = u.user_metadata || {}, a = u.app_metadata || {}; return { id: u.id, provider: a.provider || 'email', name: m.full_name || m.name || null, avatar: m.avatar_url || m.picture || null, email: maskEmail(u.email) }; };   /* email chỉ giữ dạng che (a***@gmail.com) */
  const otpErr = e => { const t = String(e && (e.message || e.code) || ''); return /expired/i.test(t) ? 'expired' : (e && e.status === 429) || /rate|too many/i.test(t) ? 'rate_limit' : /invalid|token/i.test(t) ? 'bad_code' : 'auth'; };
  return {
    ctl: null,
    onAuth(f) { subs.add(f); return () => subs.delete(f); },
    session: () => wrap(async c => {
      const { data } = await c.auth.getSession(); const s = data && data.session; lastToken = s ? s.access_token : null;
      if (win && win.location && /[?&]code=/.test(win.location.search) && win.history) { try { const q = new URLSearchParams(win.location.search); q.delete('code'); win.history.replaceState(null, '', win.location.pathname + (q.toString() ? '?' + q : '') + win.location.hash); } catch (e) { } }
      return { ok: true, user: s ? mapUser(s.user) : null };
    }),
    /* signIn({ provider:'google' }) → chuyển sang Google (PKCE, quay về ?code=) · signIn({ email }) → Supabase gửi mã (mẫu thư "Magic Link" phải có {{ .Token }}) */
    signIn: (x = {}) => wrap(async c => {
      if (x.email != null) {
        const em = String(x.email).trim().toLowerCase(); if (!emailOk(em)) return { ok: false, err: 'bad_email' };
        const { error } = await c.auth.signInWithOtp({ email: em, options: { shouldCreateUser: true } });
        return error ? { ok: false, err: otpErr(error), detail: error.message } : { ok: true, sent: true, email: maskEmail(em) };
      }
      const redirectTo = o.redirect || (win ? win.location.origin + win.location.pathname + win.location.search : undefined);
      const { error } = await c.auth.signInWithOAuth({ provider: 'google', options: { redirectTo, queryParams: { prompt: 'select_account' } } });
      return error ? { ok: false, err: 'auth', detail: error.message } : { ok: true, redirect: true };
    }),
    verifyOtp: (email, code) => wrap(async c => {
      const { data, error } = await c.auth.verifyOtp({ email: String(email || '').trim().toLowerCase(), token: String(code || '').trim(), type: 'email' });
      if (error) return { ok: false, err: otpErr(error), detail: error.message };
      lastToken = data && data.session ? data.session.access_token : lastToken;
      return { ok: true, user: mapUser(data && data.user) };
    }),
    setName: name => wrap(async c => { const n = cleanName(name); if (!n) return { ok: false, err: 'bad_name' }; const { data } = await c.auth.getSession(); const u = data && data.session && data.session.user; if (!u) return { ok: false, err: 'auth' }; const { error } = await c.from('profiles').update({ name: n }).eq('id', u.id); return error ? { ok: false, err: 'rpc', detail: error.message } : { ok: true, name: n }; }),
    signOut: () => wrap(async c => { await c.auth.signOut(); lastToken = null; return { ok: true }; }),
    ensureProfile: () => rpc('ensure_profile'),
    pullSave: () => wrap(async c => { const { data, error } = await c.from('saves').select('rev,data,play_sec,updated_at,device').maybeSingle(); if (error) return { ok: false, err: 'rpc', detail: error.message }; return data ? { ok: true, ...data } : { ok: true, rev: 0, data: null }; }),
    pushSave: (data, baseRev, x = {}) => rpc('push_save', { p_data: data, p_base_rev: baseRev | 0, p_play_sec: x.playSec | 0, p_ver: x.ver || null, p_device: x.device || null }),
    /* tab ẩn / tắt màn: fetch keepalive (thân ≤ ~64 KB) — gọi thẳng REST RPC bằng token phiên hiện có, không chờ kết quả */
    pushKeepalive(data, baseRev, x = {}) {
      try {
        const body = JSON.stringify({ p_data: data, p_base_rev: baseRev | 0, p_play_sec: x.playSec | 0, p_ver: x.ver || null, p_device: x.device || null });
        if (!lastToken || body.length > KEEPALIVE_MAX || typeof fetch === 'undefined') return { ok: false, err: body.length > KEEPALIVE_MAX ? 'too_big_keepalive' : 'notoken' };
        fetch(url + '/rest/v1/rpc/push_save', { method: 'POST', keepalive: true, headers: { 'Content-Type': 'application/json', apikey: key, Authorization: 'Bearer ' + lastToken }, body }).catch(() => { });
        return { ok: true, sent: true };
      } catch (e) { return { ok: false, err: 'network' }; }
    },
    listBackups: () => rpc('list_backups').then(r => (r.ok && r.rows ? { ok: true, list: r.rows } : r)),
    getBackup: id => wrap(async c => { const { data, error } = await c.from('save_backups').select('data,rev').eq('id', id).maybeSingle(); if (error || !data) return { ok: false, err: error ? 'rpc' : 'notfound' }; return { ok: true, ...data }; }),
    restoreBackup: id => rpc('restore_backup', { p_id: id }),
    stashBackup: (data, rev, x = {}) => rpc('stash_backup', { p_data: data, p_rev: rev | 0, p_play_sec: x.playSec | 0, p_device: x.device || null }),
    leaderboard: (tab, limit = 50) => rpc('leaderboard', { p_tab: tab, p_limit: limit }),
    myRank: tab => rpc('my_rank', { p_tab: tab }),
    publishTeam: (team, look, ver, mode = '3v3') => rpc('publish_team', { p_team: team, p_look: look || null, p_ver: ver || null, p_mode: mode }),
    pickOpponents: (n = 5, power = null, mode = '3v3') => rpc('pick_opponents', { p_n: n, p_power: power, p_mode: mode }),
    reportDuel: (defender, win, dur_s, myTeam, foeRev, ver) => rpc('report_duel', { p_defender: defender, p_win: !!win, p_dur_s: dur_s, p_my_team: myTeam || null, p_foe_rev: foeRev || null, p_ver: ver || null }),
    defenseSummary: since => rpc('defense_summary', { p_since: since ? new Date(since).toISOString() : null }),
    heartbeat: () => rpc('heartbeat'),
    onlineCount: () => rpc('online_count'),
    reportUser: (target, reason) => rpc('report_user', { p_target: target, p_reason: reason || '' }),
    deleteAccount: () => rpc('delete_account')
  };
}

/* ---------- chế độ OFF: mọi thứ trả 'off' ---------- */
const OFF_FNS = ['ensureProfile', 'setName', 'verifyOtp', 'pullSave', 'pushSave', 'listBackups', 'getBackup', 'restoreBackup', 'stashBackup', 'leaderboard', 'myRank', 'publishTeam', 'pickOpponents', 'reportDuel', 'defenseSummary', 'heartbeat', 'onlineCount', 'reportUser', 'deleteAccount', 'signIn', 'signOut'];
function offBackend() { const b = { ctl: null, session: async () => ({ ok: true, user: null }), pushKeepalive: () => ({ ok: false, err: 'off' }) }; for (const k of OFF_FNS) b[k] = async () => ({ ok: false, err: 'off' }); return b; }

/* =====================================================================================================
   createCloud — điểm vào. opts: { config, search, storage, db (mock: kho chung), mock: { user, latency, offline }, rules, now, window, loadLib }
   ===================================================================================================== */
export function pickMode(config, search) {
  const q = typeof search === 'string' ? new URLSearchParams(search) : (search || new URLSearchParams(''));
  const want = q.get('cloud');
  if (want === 'off') return 'off';
  if (want === 'mock') return 'mock';
  const c = config || {};
  if (c.CLOUD_ON === false) return 'off';
  if (c.SUPABASE_URL && c.SUPABASE_ANON_KEY) return 'supabase';
  return 'off';
}

export function createCloud(opts = {}) {
  const storage = opts.storage || (typeof localStorage !== 'undefined' ? localStorage : null);
  const q = typeof opts.search === 'string' ? new URLSearchParams(opts.search) : (opts.search || new URLSearchParams(''));
  let mode = opts.mode || pickMode(opts.config, q);
  let be;
  try {
    if (mode === 'mock') be = mockBackend({ db: opts.db || storage, storage, user: opts.mock && opts.mock.user, latency: (opts.mock && opts.mock.latency) || +(q.get('mocklag') || 0), offline: (opts.mock && opts.mock.offline) || q.get('mockoff') === '1', rules: opts.rules, now: opts.now });
    else if (mode === 'supabase') be = supabaseBackend({ url: opts.config.SUPABASE_URL, anonKey: opts.config.SUPABASE_ANON_KEY, redirect: opts.config.SUPABASE_REDIRECT, window: opts.window, loadLib: opts.loadLib });
    else be = offBackend();
  } catch (e) { mode = 'off'; be = offBackend(); }
  const st = { user: null, online: mode !== 'off', lastErr: null };
  const subs = new Set();
  const note = r => { if (r && r.err === 'network') { st.online = false; st.lastErr = 'network'; } else if (r && r.ok) st.online = true; return r; };
  const guard = fn => async (...a) => { try { return note(await fn(...a)); } catch (e) { return note({ ok: false, err: 'network', detail: String(e && e.message || e) }); } };
  const emit = () => { for (const f of subs) try { f(st.user); } catch (e) { } };
  if (be.onAuth) be.onAuth((ev, u) => { st.user = u; emit(); });
  const api = {
    get mode() { return mode; },
    get mock() { return be.ctl; },                          /* mock: { latency, offline, failNext, calls } — chỉnh tay khi test */
    status: () => ({ mode, online: st.online, user: st.user, err: st.lastErr }),
    onAuth(f) { subs.add(f); return () => subs.delete(f); },
    session: guard(async () => { const r = await be.session(); if (r.ok) { st.user = r.user || null; } return r; }),
    signIn: guard(async (x) => { const r = await be.signIn(x); if (r.ok && r.user) { st.user = r.user; emit(); await be.ensureProfile(); } return r; }),
    verifyOtp: guard(async (email, code) => { const r = await be.verifyOtp(email, code); if (r.ok && r.user) { st.user = r.user; emit(); await be.ensureProfile(); } return r; }),
    signOut: guard(async () => { const r = await be.signOut(); st.user = null; emit(); return r; }),
    deviceId: () => deviceId(storage),
    pushKeepalive: (data, base, x) => { try { return be.pushKeepalive ? be.pushKeepalive(data, base, x) : { ok: false, err: 'nokeepalive' }; } catch (e) { return { ok: false, err: 'network' }; } }
  };
  for (const k of OFF_FNS) if (!(k in api)) api[k] = guard((...a) => be[k](...a));
  return api;
}

/* =====================================================================================================
   createSync — đồng bộ save theo bảng quyết định §3.3. Không tự gộp từng trường: xung đột → hỏi người chơi.
   opts: { cloud, storage, key: 'seismic9.save.v1', isSyncSlot: () => bool, ask: async (q) => answer, ver, now }
     ask({ kind:'upload' })                        → true/false  (đưa save máy này lên tài khoản? mặc định Có)
     ask({ kind:'conflict', local, cloud })        → 'local' | 'cloud'   (bản không chọn vào save_backups)
     ask({ kind:'other_account', local })          → 'cloud' (thay bằng save tài khoản, bản máy vào .bak) | khác = giữ nguyên, không đồng bộ
   ===================================================================================================== */
export function createSync(opts) {
  const cloud = opts.cloud, storage = opts.storage || (typeof localStorage !== 'undefined' ? localStorage : null);
  const KEY = opts.key || 'seismic9.save.v1', BAK = KEY + BAK_SUFFIX, clock = () => (opts.now ? opts.now() : Date.now());
  const canSync = () => { try { return !opts.isSyncSlot || !!opts.isSyncSlot(); } catch (e) { return false; } };
  const ask = async (qq) => { try { return opts.ask ? await opts.ask(qq) : null; } catch (e) { return null; } };
  const st = { dirty: false, lastPush: 0, busy: false, state: 'idle', pendingConflict: null };
  const readLocal = () => jget(storage, KEY);
  const writeLocal = s => sset(storage, KEY, JSON.stringify(s));
  const backupLocal = () => { const cur = sget(storage, KEY); if (cur) sset(storage, BAK, cur); };
  const dev = () => deviceId(storage);
  const playOf = s => (s && s.stats && s.stats.sec) | 0;

  function adopt(data, rev, uid) {   /* nhận bản mây làm bản cục bộ */
    const s = clone(data); s.meta = { ...(s.meta || {}), rev: (s.meta && s.meta.rev) | 0, base: rev, cloud: uid, dev: dev() }; s.meta.srev = s.meta.rev;
    writeLocal(s); return s;
  }
  async function pushLocal(local, base, uid) {
    const m = local.meta ||= {}, pid = 'p' + rid(8), atRev = m.rev | 0;
    const body = clone(local); body.meta = { ...m, pid, cloud: uid };
    const txt = JSON.stringify(body);
    if (txt.length > SAVE_MAX) return { ok: false, err: 'too_big', size: txt.length };
    if (saveProblem(body)) return { ok: false, err: 'bad' };
    m.pid = pid; m.pids = [pid].concat(Array.isArray(m.pids) ? m.pids : []).slice(0, 4); m.cloud = uid; writeLocal(local);   /* nhớ pid TRƯỚC khi gửi (cả các lần chưa được xác nhận): mất phản hồi vẫn nhận ra được */
    const r = await cloud.pushSave(body, base, { playSec: playOf(local), ver: opts.ver || null, device: dev() });
    if (r.ok) { const cur = readLocal() || local; cur.meta = { ...(cur.meta || {}), base: r.rev, srev: atRev, cloud: uid, pid, pids: [] }; writeLocal(cur); st.lastPush = clock(); st.dirty = (cur.meta.rev | 0) > atRev; }
    return r;
  }
  /* đẩy bị báo xung đột: nếu bản mây chính là lần đẩy trước của máy này (pid khớp) → chỉ là mất phản hồi, nhận rev rồi đẩy lại */
  async function healLost(local, r, uid) {
    const c = r.cloud, m = local.meta || {};
    if (c && c.pid && Array.isArray(m.pids) && m.pids.includes(c.pid)) { m.base = c.rev; writeLocal(local); return pushLocal(local, c.rev, uid); }
    return null;
  }

  async function resolve() {
    if (!canSync()) return { action: 'skip', why: 'slot' };
    if (cloud.mode === 'off') return { action: 'skip', why: 'off' };
    const ss = await cloud.session(); if (!ss.ok) return { action: 'offline', err: ss.err };
    const u = ss.user; if (!u) return { action: 'guest' };
    await cloud.ensureProfile();
    const pull = await cloud.pullSave(); if (!pull.ok) return { action: 'offline', err: pull.err };
    const local = readLocal(), cl = pull.data ? { rev: pull.rev, data: pull.data } : null;
    const act = decide(local, cl, u.id);
    if (act === 'new' || act === 'same') return { action: act };
    if (act === 'download') { if (local) backupLocal(); const s = adopt(cl.data, cl.rev, u.id); return { action: 'download', save: s, reload: true }; }
    if (act === 'push') { const r = await pushLocal(local, local.meta.base | 0, u.id); if (r.ok) return { action: 'push', rev: r.rev }; if (r.err === 'conflict') { const h = await healLost(local, r, u.id); if (h && h.ok) return { action: 'push', rev: h.rev, healed: true }; return conflictFlow(local, null, u.id); } return { action: 'push_failed', err: r.err }; }
    if (act === 'ask_upload') {
      const yes = await ask({ kind: 'upload', local: summary(local) });
      if (yes === false) return { action: 'kept_local' };
      const r = await pushLocal(local, 0, u.id); return r.ok ? { action: 'uploaded', rev: r.rev } : { action: 'push_failed', err: r.err };
    }
    if (act === 'other_account') {
      const a = await ask({ kind: 'other_account', local: summary(local) });
      if (a === 'cloud') { backupLocal(); if (cl) { const s = adopt(cl.data, cl.rev, u.id); return { action: 'download', save: s, reload: true }; } return { action: 'other_account' }; }
      return { action: 'other_account', synced: false };
    }
    return conflictFlow(local, cl, u.id);
  }
  async function conflictFlow(local, cl, uid) {
    if (!cl) { const p = await cloud.pullSave(); if (!p.ok) return { action: 'offline', err: p.err }; cl = p.data ? { rev: p.rev, data: p.data } : null; }
    if (!cl) { const r = await pushLocal(local, 0, uid); return r.ok ? { action: 'push', rev: r.rev } : { action: 'push_failed', err: r.err }; }
    st.state = 'conflict';
    const pick = await ask({ kind: 'conflict', local: summary(local, { rev: (local.meta || {}).rev | 0 }), cloud: summary(cl.data, { rev: cl.rev }) });
    if (pick === 'local') {   /* đẩy đè lên bản mây hiện tại: bản mây cũ tự vào save_backups (trigger) */
      const r = await pushLocal(local, cl.rev, uid); st.state = r.ok ? 'idle' : 'conflict';
      return r.ok ? { action: 'conflict_local', rev: r.rev } : { action: 'push_failed', err: r.err };
    }
    if (pick === 'cloud') {   /* lấy bản mây: bản máy này cất lên save_backups + .bak cục bộ */
      await cloud.stashBackup(local, (local.meta || {}).rev | 0, { playSec: playOf(local), device: dev() });
      backupLocal(); const s = adopt(cl.data, cl.rev, uid); st.state = 'idle';
      return { action: 'conflict_cloud', save: s, reload: true };
    }
    st.pendingConflict = { cloudRev: cl.rev };            /* người chơi chưa chọn → không làm gì, hỏi lại lần sau */
    return { action: 'conflict_pending' };
  }

  async function flushNow(reason = 'manual') {
    if (!canSync()) return { ok: false, skipped: 'slot' };
    if (cloud.mode === 'off') return { ok: false, skipped: 'off' };
    if (st.busy) return { ok: false, skipped: 'busy' };
    if (st.state === 'conflict') return { ok: false, skipped: 'conflict' };
    const u = cloud.status().user; if (!u) return { ok: false, skipped: 'guest' };
    const local = readLocal(); if (!local) return { ok: false, skipped: 'nolocal' };
    const m = local.meta || {};
    if (m.cloud && m.cloud !== u.id) return { ok: false, skipped: 'other_account' };
    if ((m.rev | 0) <= (m.srev | 0) && m.cloud === u.id) { st.dirty = false; return { ok: true, skipped: 'clean' }; }
    st.busy = true;
    try {
      let r = await pushLocal(local, m.base | 0, u.id);
      if (!r.ok && r.err === 'conflict') { const h = await healLost(readLocal() || local, r, u.id); if (h) r = h; }
      if (!r.ok && r.err === 'conflict') { st.state = 'conflict'; st.pendingConflict = { cloudRev: r.cloud ? r.cloud.rev : null }; }
      if (!r.ok) st.dirty = true;
      return { ...r, reason };
    } finally { st.busy = false; }
  }
  function markDirty() { st.dirty = true; if (clock() - st.lastPush >= PUSH_EVERY * 1000) return flushNow('timer'); return null; }
  /* tab ẩn: đẩy kiểu keepalive (không chờ). Lớn hơn ~64 KB → để lần mở sau (save cục bộ vẫn còn). */
  function flushHidden() {
    if (!canSync() || cloud.mode === 'off' || st.state === 'conflict') return { ok: false, skipped: true };
    const u = cloud.status().user, local = readLocal(); if (!u || !local) return { ok: false, skipped: true };
    const m = local.meta || {}; if ((m.rev | 0) <= (m.srev | 0)) return { ok: true, skipped: 'clean' };
    return cloud.pushKeepalive(local, m.base | 0, { playSec: playOf(local), ver: opts.ver || null, device: dev() });
  }
  async function restore(id) {   /* "Khôi phục bản sao lưu": mây đổi sang bản đó rồi tải về máy */
    if (!canSync()) return { ok: false, skipped: 'slot' };
    const r = await cloud.restoreBackup(id); if (!r.ok) return r;
    const p = await cloud.pullSave(); if (!p.ok || !p.data) return { ok: false, err: p.err || 'nodata' };
    backupLocal(); const u = cloud.status().user; return { ok: true, save: adopt(p.data, p.rev, u && u.id), reload: true };
  }
  return { resolve, flushNow, markDirty, flushHidden, restore, state: () => ({ ...st }), localBak: () => jget(storage, BAK) };
}
