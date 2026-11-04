// cloud82.js — c1-p82: nối cloud.js (plan-82 Bậc 0) vào game. CHỈ nạp khi URL có ?cloud82=1 (mặc định TẮT → game y như cũ).
//   ?cloud82=1&cloud=mock          backend giả trong localStorage (không mạng). Thêm &mockuser=<khoá>&mockname=<tên> để giả tài khoản Google khác (email: bấm nút email, mã mock ở __cloud82.cloud.mock.lastCode),
//                                  &mocklag=<ms> độ trễ, &mockoff=1 mất mạng.
//   ?cloud82=1 (không cloud=mock)  dùng CONFIG.SUPABASE_URL / SUPABASE_ANON_KEY; rỗng → 'off' (không làm gì).
// Không chạy khi: ?preset / ?promo / ?demo / ?showcase / ?find / ?auto / ?zone (ô save test hoặc game đã tự vào trước khi kịp đồng bộ).
// Luật an toàn: mọi lỗi bị nuốt (try/catch) → game chạy ngoại tuyến; không bao giờ chặn 'Loading…'; nút tiêu đề chỉ khoá tối đa RESOLVE_MAX ms.
// Đăng nhập: Google (nút chính) + email nhận mã 6 số — anh chốt 2026-11-03, BỎ Discord (không còn khớp roster tự động).
// c24 (04/11): thêm "Tên đăng nhập & mật khẩu" (Đăng nhập | Đăng ký) — email nội bộ <tên>@players.seismic9.app, xem cloud.js. ?cloud=mock&mockconfirm=1 giả Supabase còn bật xác nhận email.
import { createCloud, createSync, bumpMeta, deviceId, emailOk, cleanUser, userOk, PW_MIN } from './cloud.js';
import { setWriteHook, isSyncSlot, saveKey, writeSave } from './save.js';

const RESOLVE_MAX = 8000;      /* ms: quá lâu thì mở khoá nút, coi như ngoại tuyến */
const TICK = 10000;            /* ms: soát "bẩn" để đẩy (cloud.js tự giới hạn 1 lần / 60 s) */
const HEART = 120000;          /* ms: nhịp tim khi tab hiện */
const SKIP_Q = ['preset', 'promo', 'demo', 'showcase', 'find', 'auto', 'zone'];

const TXT = {
  vi: {
    signIn: 'Đăng nhập Google', signInMock: 'Đăng nhập Google (thử)', emailBtn: 'Đăng nhập bằng email', signOut: 'Đăng xuất',
    emTitle: 'Đăng nhập bằng email', emBody: 'Nhập email, game gửi mã 6 số. Không cần mật khẩu.', emPh: 'email của bạn', send: 'Gửi mã', cancel: 'Huỷ',
    codeTitle: 'Nhập mã 6 số', codeBody: e => `Mã đã gửi tới ${e}. Không thấy thì xem cả hộp Thư rác.`, verify: 'Xác nhận', resend: 'Gửi lại mã', sending: 'Đang gửi…',
    errs: { bad_email: 'Email không hợp lệ', bad_code: n => 'Mã sai' + (n ? ` — còn ${n} lần` : ''), expired: 'Mã đã hết hạn — bấm Gửi lại mã', too_many: 'Sai quá nhiều lần — bấm Gửi lại mã', rate_limit: 'Gửi mã quá nhiều — chờ vài phút rồi thử lại', network: 'Không có mạng — thử lại sau', auth: 'Không đăng nhập được — thử lại',
      bad_user: 'Tên đăng nhập 3–20 ký tự, chỉ gồm a-z, 0-9, dấu _ và dấu . (không để dấu chấm ở đầu/cuối)', weak_pw: `Mật khẩu cần ít nhất ${PW_MIN} ký tự`, pw_mismatch: 'Hai lần nhập mật khẩu không khớp',
      bad_login: 'Sai tên đăng nhập hoặc mật khẩu', taken: 'Tên này đã có người dùng — chọn tên khác',
      confirm_on: 'Máy chủ còn bật "xác nhận email" nên chưa dùng được tên + mật khẩu — báo quản trị tắt "Confirm email" trong Supabase',
      signup_off: 'Máy chủ đang tạm khoá đăng ký tài khoản mới', pw_off: 'Máy chủ chưa bật đăng nhập bằng mật khẩu' }, mock: 'thử', offline: 'Đang chơi ngoại tuyến',
    userBtn: 'Tên đăng nhập & mật khẩu', pwTitle: 'Tên đăng nhập & mật khẩu', tabIn: 'Đăng nhập', tabUp: 'Đăng ký',
    pwBodyIn: 'Không cần email. Nhập tên đăng nhập và mật khẩu bạn đã đăng ký.', pwBodyUp: 'Tạo tài khoản chỉ với tên + mật khẩu, không cần email.',
    userPh: 'tên đăng nhập (a-z 0-9 _ .)', pwPh: `mật khẩu (ít nhất ${PW_MIN} ký tự)`, pw2Ph: 'nhập lại mật khẩu', goIn: 'Đăng nhập', goUp: 'Tạo tài khoản', working: 'Đang xử lý…',
    pwWarn: 'Quên mật khẩu sẽ không lấy lại được — nên liên kết Google/email sau.',
    guest: 'Chưa đăng nhập — save chỉ ở máy này', syncing: 'Đang đồng bộ…', synced: rev => `Đã lưu trên mây · bản ${rev}`, as: n => `Đăng nhập: ${n}`,
    online: (a, b) => `● ${a} đang chơi · ${b} người chơi`, conflictWait: 'Có 2 bản save khác nhau — chọn ở màn tiêu đề',
    upTitle: 'Đưa save máy này lên tài khoản?', upBody: 'Save trên máy này sẽ được lưu trên mây, chơi tiếp được ở máy khác.', yes: 'Có, đưa lên', no: 'Để sau',
    otherTitle: 'Save máy này thuộc tài khoản khác', otherBody: 'Không trộn 2 tài khoản. Dùng save của tài khoản đang đăng nhập (bản máy này cất vào sao lưu .bak) hay giữ nguyên?',
    useCloud: 'Dùng save tài khoản', keep: 'Giữ save máy này',
    cfTitle: 'Hai bản save khác nhau', cfBody: 'Bạn đã chơi ở 2 nơi khi chưa đồng bộ. Chọn bản để chơi tiếp — bản kia vẫn được cất vào sao lưu.',
    here: 'Bản máy này', cloud: 'Bản trên mây', pick: 'Chọn bản này', later: 'Chọn sau',
    play: 'Giờ chơi', zone: 'Vùng', badges: 'Huy hiệu', caught: 'Chấn Thú đã bắt', team: 'Trong đội', upd: 'Lưu lần cuối', dev: 'Máy',
    loaded: 'Đã tải save từ mây', pushed: 'Đã đưa save lên mây', player: 'Người chơi',
    rnTitle: 'Đổi tên nhân vật', rnBody: 'Tên hiện trong game và khi chơi chung. Tên đăng nhập giữ nguyên.', rnPh: 'tên mới (2–16 ký tự)', rnOk: 'Lưu tên', rnBad: 'Tên cần 2–16 ký tự, không có < >', rnDone: n => `Đã đổi tên: ${n}`, login: 'tên đăng nhập'
  },
  en: {
    signIn: 'Sign in with Google', signInMock: 'Sign in with Google (test)', emailBtn: 'Sign in with email', signOut: 'Sign out',
    emTitle: 'Sign in with email', emBody: 'Enter your email and we will send a 6-digit code. No password needed.', emPh: 'your email', send: 'Send code', cancel: 'Cancel',
    codeTitle: 'Enter the 6-digit code', codeBody: e => `Code sent to ${e}. Check your Spam folder too.`, verify: 'Confirm', resend: 'Resend code', sending: 'Sending…',
    errs: { bad_email: 'Invalid email', bad_code: n => 'Wrong code' + (n ? ` — ${n} tries left` : ''), expired: 'Code expired — tap Resend code', too_many: 'Too many wrong tries — tap Resend code', rate_limit: 'Too many codes sent — wait a few minutes', network: 'No connection — try again later', auth: 'Could not sign in — try again',
      bad_user: 'Username must be 3–20 characters: a-z, 0-9, _ and . (no dot at the start or end)', weak_pw: `Password needs at least ${PW_MIN} characters`, pw_mismatch: 'The two passwords do not match',
      bad_login: 'Wrong username or password', taken: 'That username is taken — pick another one',
      confirm_on: 'The server still has "email confirmation" on, so username sign-in cannot work yet — ask the admin to turn off "Confirm email" in Supabase',
      signup_off: 'New sign-ups are temporarily closed', pw_off: 'Password sign-in is not enabled on the server' }, mock: 'test', offline: 'Playing offline',
    userBtn: 'Username & password', pwTitle: 'Username & password', tabIn: 'Sign in', tabUp: 'Sign up',
    pwBodyIn: 'No email needed. Enter the username and password you signed up with.', pwBodyUp: 'Create an account with just a username + password, no email needed.',
    userPh: 'username (a-z 0-9 _ .)', pwPh: `password (at least ${PW_MIN} characters)`, pw2Ph: 'repeat password', goIn: 'Sign in', goUp: 'Create account', working: 'Working…',
    pwWarn: 'A forgotten password cannot be recovered — consider linking Google/email later.',
    guest: 'Not signed in — save stays on this device', syncing: 'Syncing…', synced: rev => `Saved to cloud · rev ${rev}`, as: n => `Signed in: ${n}`,
    online: (a, b) => `● ${a} playing · ${b} players`, conflictWait: 'Two different saves — choose on the title screen',
    upTitle: 'Upload this device\'s save to your account?', upBody: 'Your save on this device will be stored in the cloud so you can continue on other devices.', yes: 'Yes, upload', no: 'Later',
    otherTitle: 'This save belongs to another account', otherBody: 'Accounts are never mixed. Use the signed-in account\'s save (this device\'s save goes to the .bak backup) or keep it?',
    useCloud: 'Use account save', keep: 'Keep this device\'s save',
    cfTitle: 'Two different saves', cfBody: 'You played in two places without syncing. Pick the save to continue — the other one is kept as a backup.',
    here: 'This device', cloud: 'Cloud', pick: 'Use this one', later: 'Decide later',
    play: 'Play time', zone: 'Zone', badges: 'Badges', caught: 'Caught', team: 'In team', upd: 'Last saved', dev: 'Device',
    loaded: 'Save loaded from the cloud', pushed: 'Save uploaded to the cloud', player: 'Player',
    rnTitle: 'Rename character', rnBody: 'Shown in game and in co-op. Your username stays the same.', rnPh: 'new name (2–16 characters)', rnOk: 'Save name', rnBad: 'Name needs 2–16 characters, no < >', rnDone: n => `Renamed: ${n}`, login: 'username'
  }
};

const esc = t => String(t == null ? '' : t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const hm = s => { s = s | 0; const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60); return h + ':' + String(m).padStart(2, '0'); };

export function wantCloud82(search) {
  const q = new URLSearchParams(search || '');
  if (q.get('cloud82') === '0') return { on: false, why: 'flag' };   /* anh 04/11: đăng nhập BẬT MẶC ĐỊNH cho mọi người (?cloud82=0 để tắt) */
  for (const k of SKIP_Q) if (q.has(k)) return { on: false, why: k };
  return { on: true, q };
}

/* opts: { S, CTX, UI, $, byId, CONFIG, loadSave, persist, search, storage, rules } */
export async function initCloud82(o) {
  const st = { log: [], mode: 'init', ready: false, last: null };
  const W = typeof window !== 'undefined' ? window : {};
  const dbg = W.__cloud82 = { st, log: st.log };
  const log = (k, v) => { try { st.log.push({ t: Date.now(), k, v }); if (st.log.length > 200) st.log.shift(); } catch (e) { } };
  try {
    const w = wantCloud82(o.search != null ? o.search : (W.location ? W.location.search : ''));
    if (!w.on) { log('skip', w.why); st.mode = 'skip:' + w.why; return dbg; }
    const q = w.q, $ = o.$ || (s => document.querySelector(s)), UI = o.UI || {};
    const T = () => TXT[(UI.lang && UI.lang()) === 'vi' ? 'vi' : 'en'];
    const storage = o.storage || (typeof localStorage !== 'undefined' ? localStorage : null);
    let rules = o.rules || null;
    if (!rules && q.get('cloud') === 'mock' && typeof fetch !== 'undefined') { try { rules = await (await fetch('server/supabase/rules82.json')).json(); } catch (e) { rules = null; } }
    const mu = q.get('mockuser');
    const cloud = createCloud({ config: o.CONFIG || {}, search: q, storage, rules, mock: mu ? { user: { key: mu, provider: 'google', name: q.get('mockname') || ('Mock ' + mu.slice(-4)) } } : undefined });
    st.mode = cloud.mode; dbg.cloud = cloud; log('mode', cloud.mode);
    if (cloud.mode === 'off') return dbg;

    /* ---------- giao diện: nút đăng nhập + dòng trạng thái (dùng ô #t-discord-wrap sẵn có ở màn tiêu đề) ---------- */
    const wrap = $('#t-discord-wrap'), btn = $('#t-discord'), note = $('#t-discord-note');
    if (btn) btn.classList.remove('discord');   /* không còn màu Discord */
    let ebtn = null;
    try { if (wrap && btn && !document.getElementById('t-email82')) { ebtn = document.createElement('button'); ebtn.id = 't-email82'; ebtn.className = btn.className; btn.insertAdjacentElement('afterend', ebtn); } } catch (e) { ebtn = null; }
    let ubtn = null;   /* c24: nút "Tên đăng nhập & mật khẩu" ngay sau nút email */
    try { if (wrap && btn && !document.getElementById('t-user82')) { ubtn = document.createElement('button'); ubtn.id = 't-user82'; ubtn.className = btn.className; (ebtn || btn).insertAdjacentElement('afterend', ubtn); } } catch (e) { ubtn = null; }
    let statusTxt = '', onlineTxt = '';
    const paint = () => {
      try {
        const u = cloud.status().user, t = T();
        if (btn) { btn.textContent = u ? t.signOut : (cloud.mode === 'mock' ? t.signInMock : t.signIn); btn.dataset.cloud82 = u ? 'out' : 'in'; }
        if (ebtn) { ebtn.textContent = t.emailBtn; ebtn.hidden = !!u; }
        if (ubtn) { ubtn.textContent = t.userBtn; ubtn.hidden = !!u; }
        if (note) note.textContent = [u ? t.as(u.username || u.name || u.email || t.player) : t.guest, statusTxt, onlineTxt, cloud.mode === 'mock' ? '[' + t.mock + ']' : ''].filter(Boolean).join(' · ');
      } catch (e) { }
    };
    if (wrap) wrap.hidden = false;
    try { const fr = document.querySelector('#title .findrow'); if (fr) fr.style.display = 'none'; } catch (e) { }   /* c30: bỏ ô "Discord username / Find me" (Discord đã bỏ từ 03/11) */
    function afterFlush(r) {   /* c30: sau mỗi lần đẩy → dòng trạng thái báo đúng bản đã lưu trên mây */
      log('flush', r);
      try { if (r && r.ok && r.rev) { statusTxt = T().synced(r.rev); paint(); } else if (r && r.ok === false && r.err === 'conflict') { statusTxt = T().conflictWait; paint(); } } catch (e) { }
    }
    const lock = on => { for (const id of ['#t-cont', '#t-play']) { const b = $(id); if (b) b.disabled = !!on; } };

    /* ---------- bảng hỏi khung pixel (frame.png như leaderarena / menu) ---------- */
    let askOpen = null;
    function askPanel(qq) {
      return new Promise(res => {
        try {
          const t = T(), col = (title, s, pickVal) => !s ? '' : `<div class="c82col" style="flex:1;min-width:140px;padding:4px 6px;background:#2a1f38">
              <b style="color:#ffd96a">${esc(title)}</b>
              <div class="tiny">${s.name ? esc(s.name) + '<br>' : ''}${esc(t.play)}: ${hm(s.play_sec)}<br>${esc(t.zone)}: ${esc(s.zone)}<br>${esc(t.badges)}: ${s.badges | 0}<br>${esc(t.caught)}: ${s.caught | 0} · ${esc(t.team)}: ${s.team | 0}<br>${esc(t.upd)}: ${s.upd ? esc(new Date(s.upd * 1000).toLocaleString()) : '—'}<br>${esc(t.dev)}: ${esc(s.dev || '—')}</div>
              <button class="btn px" data-v="${pickVal}" style="margin-top:4px;width:100%">${esc(t.pick)}</button></div>`;
          let title, body, inner;
          if (qq.kind === 'upload') { title = t.upTitle; body = t.upBody; inner = `<button class="btn px primary" data-v="yes">${esc(t.yes)}</button> <button class="btn px" data-v="no">${esc(t.no)}</button>`; }
          else if (qq.kind === 'other_account') { title = t.otherTitle; body = t.otherBody; inner = `<button class="btn px primary" data-v="cloud">${esc(t.useCloud)}</button> <button class="btn px" data-v="keep">${esc(t.keep)}</button>`; }
          else { title = t.cfTitle; body = t.cfBody; inner = `<div style="display:flex;gap:8px;flex-wrap:wrap">${col(t.here, qq.local, 'local')}${col(t.cloud, qq.cloud, 'cloud')}</div><button class="btn px" data-v="later" style="margin-top:6px">${esc(t.later)}</button>`; }
          const el = document.createElement('div');
          el.id = 'cloud82-ask';
          el.style.cssText = 'position:fixed;inset:0;display:flex;align-items:center;justify-content:center;z-index:60;background:rgba(10,6,16,.55);padding:16px;box-sizing:border-box';
          el.innerHTML = `<div style="border:20px solid transparent;border-image:url(assets/px/ui/frame.png) 20 / 20px round;image-rendering:pixelated;background:#1c1424;background-clip:padding-box;max-width:520px;width:100%;color:#f3e6c6;font:18px VT323,monospace;padding:4px 8px 8px;box-sizing:border-box">
            <div style="font-size:22px;color:#ffd96a;margin-bottom:4px">${esc(title)}</div><div class="tiny" style="margin-bottom:8px">${esc(body)}</div>${inner}</div>`;
          const done = v => { try { el.remove(); } catch (e) { } askOpen = null; log('answer', { kind: qq.kind, v }); res(qq.kind === 'upload' ? v === 'yes' : (v === 'later' || v === 'keep' ? null : v)); };
          el.addEventListener('click', e => { const b = e.target.closest && e.target.closest('button[data-v]'); if (b) done(b.dataset.v); });
          askOpen = { el, done, kind: qq.kind };
          (document.getElementById('title') || document.body).appendChild(el);
          log('ask', qq.kind);
        } catch (e) { res(null); }
      });
    }
    dbg.answer = v => { if (askOpen) askOpen.done(v); return !!askOpen; };   /* test: trả lời bảng đang mở */
    dbg.asking = () => (askOpen ? askOpen.kind : null);
    dbg.ask = askPanel;   /* test / ảnh: mở đúng bảng thật với tóm tắt tuỳ ý */

    /* ---------- móc save.js: mỗi writeSave → giữ trường đồng bộ mới nhất từ localStorage rồi tăng meta.rev ---------- */
    const dev = deviceId(storage), KEY = () => saveKey();
    const sync = createSync({ cloud, storage, key: KEY(), isSyncSlot: () => isSyncSlot(), ver: 'c1-p82', ask: askPanel });
    dbg.sync = sync;
    let lastZone = null;
    setWriteHook(s => {
      if (!isSyncSlot() || !s || typeof s !== 'object') return;
      try {
        const old = JSON.parse(storage.getItem(KEY()) || 'null'), om = old && old.meta;
        const m = (s.meta && typeof s.meta === 'object') ? s.meta : (s.meta = {});
        if (om && (om.rev | 0) >= (m.rev | 0)) for (const k of ['rev', 'srev', 'base', 'cloud', 'pid', 'pids', 'ssec', 'ssig', 'ppid', 'karev', 'kas']) if (om[k] !== undefined) m[k] = om[k];   /* createSync ghi thẳng localStorage → S.save trong RAM phải nhận lại base/srev, không thì đẩy sau bị xung đột giả */
        if (!om && !m.cloud) { const L = sync.linkInfo(), u = cloud.status().user; if (L && u && L.uid === u.id) { m.cloud = L.uid; m.base = L.base | 0; m.srev = 0; } }   /* c30: ván mới (đã xoá save) khi đang đăng nhập → nối tiếp tài khoản, đẩy đè được, không thành xung đột */
      } catch (e) { }
      bumpMeta(s, dev);
    }, s => {
      if (!isSyncSlot() || !cloud.status().user) return;
      const z = s && s.zone;
      if (lastZone && z && z !== lastZone) sync.flushNow('zone').then(afterFlush); else { const p = sync.markDirty(); if (p && p.then) p.then(afterFlush); }
      lastZone = z || lastZone;
    });

    const runResolve = async why => {
      lock(true); statusTxt = T().syncing; paint();
      let r;
      /* hẹn giờ chỉ tính lúc CHỜ MẠNG: đang mở bảng hỏi người chơi thì không tính (không báo ngoại tuyến / mở khoá giữa chừng) */
      let tk = null;
      const limit = new Promise(z => { let left = RESOLVE_MAX; tk = setInterval(() => { if (!askOpen) left -= 250; if (left <= 0) { clearInterval(tk); z({ action: 'timeout' }); } }, 250); });
      try { r = await Promise.race([sync.resolve(), limit]); }
      catch (e) { r = { action: 'offline', err: String(e && e.message || e) }; }
      finally { clearInterval(tk); lock(false); }
      st.last = r; log('resolve:' + why, r && { action: r.action, err: r.err });
      const t = T();
      if (r && r.save) {   /* bản mây đã ghi vào localStorage → nút Chơi tiếp đọc lại */
        const c = $('#t-cont'); if (c) c.hidden = false;
        const n = $('#t-name'); if (n && r.save.name) n.value = r.save.name;
        try { UI.toast && UI.toast(t.loaded); } catch (e) { }
      } else if (r && (r.action === 'uploaded' || r.action === 'push' || r.action === 'conflict_local')) { try { UI.toast && UI.toast(t.pushed); } catch (e) { } }
      const ss = sync.state(), cur = (() => { try { return JSON.parse(storage.getItem(KEY()) || 'null'); } catch (e) { return null; } })();
      statusTxt = !cloud.status().online || (r && (r.action === 'offline' || r.action === 'timeout')) ? t.offline
        : ss.state === 'conflict' || (r && r.action === 'conflict_pending') ? t.conflictWait
        : cur && cur.meta && cur.meta.base ? t.synced(cur.meta.base) : '';
      paint();
      return r;
    };
    dbg.resolve = runResolve;
    /* c39-mot-phien: mỗi tài khoản 1 phiên chơi — giành phiên TRƯỚC khi đồng bộ (máy đang chơi đẩy save + dừng, máy này tải đúng bản đó) */
    let S39 = null;
    try { S39 = await (await import('./session39.js')).initSession39({ cloud, sync, storage, key: KEY, S: o.S, persist: o.persist, CONFIG: o.CONFIG || {}, lang: () => (UI.lang && UI.lang()), log }); } catch (e) { log('s39', String(e && e.message || e)); }
    dbg.s39 = S39;
    const s39Claim = async why => { if (!S39 || !cloud.status().user) return; lock(true); statusTxt = T().syncing; paint(); try { await S39.claim(why); } catch (e) { log('s39', String(e)); } finally { lock(false); } };
    const s39After = why => { try { if (S39) S39.after(why); } catch (e) { } };

    const afterSignIn = async () => {   /* email không có tên → đặt tên theo save / ô tên ở màn tiêu đề (không bao giờ hiện email làm tên công khai) */
      const u = cloud.status().user; if (!u) return;
      try {
        if (u.provider === 'email' && !u.name) {
          const sv = o.loadSave ? o.loadSave() : null, tn = $('#t-name'), nm = (sv && sv.name) || (tn && tn.value.trim()) || '';
          if (nm) { const r = await cloud.setName(nm); if (r && r.ok) u.name = r.name; }
        } else if (u.provider === 'username') {   /* c24: tên hiển thị = tên trong save / ô tên; chưa có tên game → dùng tên đăng nhập (profile đã mang tên đăng nhập từ lúc đăng ký) */
          const sv = o.loadSave ? o.loadSave() : null, tn = $('#t-name'), nm = (sv && sv.name) || (tn && tn.value.trim()) || '';
          if (nm && nm !== u.name) { const r = await cloud.setName(nm); if (r && r.ok) u.name = r.name; }
          else if (!nm && tn && u.username) tn.value = u.username;
        }
      } catch (e) { }
    };

    /* ---------- bảng đăng nhập email: bước 1 nhập email → gửi mã; bước 2 nhập mã 6 số ---------- */
    let emOpen = null;
    const inSt = 'display:block;width:100%;box-sizing:border-box;margin:4px 0 6px;padding:4px 8px;background:#f3e6c6;color:#3b2412;border:3px solid #5a3a20;border-radius:0;font:22px VT323,monospace';
    function emailPanel() {
      if (emOpen) return emOpen.p;
      const t = T(), el = document.createElement('div');
      el.id = 'cloud82-email';
      el.style.cssText = 'position:fixed;inset:0;display:flex;align-items:center;justify-content:center;z-index:60;background:rgba(10,6,16,.55);padding:16px;box-sizing:border-box';
      el.innerHTML = `<div style="border:20px solid transparent;border-image:url(assets/px/ui/frame.png) 20 / 20px round;image-rendering:pixelated;background:#1c1424;background-clip:padding-box;max-width:460px;width:100%;color:#f3e6c6;font:18px VT323,monospace;padding:4px 8px 8px;box-sizing:border-box">
        <div data-k="title" style="font-size:22px;color:#ffd96a;margin-bottom:4px"></div><div data-k="body" class="tiny"></div>
        <input data-k="email" type="email" inputmode="email" autocomplete="email" autocapitalize="off" spellcheck="false" style="${inSt}">
        <input data-k="code" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="8" style="${inSt};letter-spacing:6px;text-align:center" hidden>
        <div data-k="err" class="tiny" style="color:#ff8a7a;min-height:1.2em"></div>
        <button class="btn px primary" data-v="go" style="width:100%"></button>
        <div style="display:flex;gap:6px;margin-top:6px"><button class="btn px" data-v="resend" style="flex:1" hidden></button><button class="btn px" data-v="cancel" style="flex:1"></button></div></div>`;
      const $$ = k => el.querySelector(`[data-k="${k}"]`), go = el.querySelector('[data-v="go"]'), rs = el.querySelector('[data-v="resend"]');
      let step = 'email', email = '', busy = false;
      const show = () => {
        $$('title').textContent = step === 'email' ? t.emTitle : t.codeTitle;
        $$('body').textContent = step === 'email' ? t.emBody : t.codeBody(email);
        $$('email').hidden = step !== 'email'; $$('code').hidden = step !== 'code'; rs.hidden = step !== 'code';
        $$('email').placeholder = t.emPh; $$('code').placeholder = '______';
        go.textContent = busy ? t.sending : step === 'email' ? t.send : t.verify; rs.textContent = t.resend;
        el.querySelector('[data-v="cancel"]').textContent = t.cancel;
      };
      const err = (k, n) => { const f = t.errs[k] || t.errs.auth; $$('err').textContent = typeof f === 'function' ? f(n) : f; log('emailErr', k); };
      const send = async () => {
        const em = $$('email').value.trim().toLowerCase(); if (!emailOk(em)) return err('bad_email');
        busy = true; show(); const r = await cloud.signIn({ email: em }); busy = false; log('emailSend', { ok: r.ok, err: r.err });
        if (!r.ok) { show(); return err(r.err); }
        email = em; step = 'code'; $$('err').textContent = ''; $$('code').value = ''; show(); try { $$('code').focus(); } catch (e) { }
      };
      const verify = async () => {
        const c = $$('code').value.replace(/\D/g, ''); if (c.length < 6) return err('bad_code');
        busy = true; show(); const r = await cloud.verifyOtp(email, c); busy = false; show(); log('emailVerify', { ok: r.ok, err: r.err });
        if (!r.ok) return err(r.err, r.left);
        close(true);
      };
      let res;
      const close = v => { try { el.remove(); } catch (e) { } emOpen = null; res(v); };
      el.addEventListener('click', e => {
        const b = e.target.closest && e.target.closest('button[data-v]'); if (!b || busy) return;
        if (b.dataset.v === 'cancel') return close(false);
        if (b.dataset.v === 'resend') { step = 'email'; $$('email').value = email; $$('err').textContent = ''; show(); return send(); }
        if (step === 'email') send(); else verify();
      });
      el.addEventListener('keydown', e => { if (e.key === 'Enter' && !busy) { e.preventDefault(); if (step === 'email') send(); else verify(); } e.stopPropagation(); });   /* phím gõ không lọt xuống game */
      const p = new Promise(z => { res = z; });
      emOpen = { el, p };
      show(); (document.getElementById('title') || document.body).appendChild(el);
      try { $$('email').focus(); } catch (e) { }
      log('emailOpen', 1);
      return p;
    }
    dbg.emailPanel = emailPanel;

    /* ---------- c24: bảng tên đăng nhập + mật khẩu — 2 thẻ Đăng nhập | Đăng ký, cùng khung pixel với bảng email ---------- */
    let pwOpen = null;
    function pwPanel(startTab) {
      if (pwOpen) return pwOpen.p;
      const t = T(), el = document.createElement('div');
      el.id = 'cloud82-pw';
      el.style.cssText = 'position:fixed;inset:0;display:flex;align-items:center;justify-content:center;z-index:60;background:rgba(10,6,16,.55);padding:16px;box-sizing:border-box';
      el.innerHTML = `<div style="border:20px solid transparent;border-image:url(assets/px/ui/frame.png) 20 / 20px round;image-rendering:pixelated;background:#1c1424;background-clip:padding-box;max-width:460px;width:100%;color:#f3e6c6;font:18px VT323,monospace;padding:4px 8px 8px;box-sizing:border-box">
        <div data-k="title" style="font-size:22px;color:#ffd96a;margin-bottom:4px"></div>
        <div style="display:flex;gap:6px;margin-bottom:6px"><button class="btn px" data-v="tab-in" style="flex:1"></button><button class="btn px" data-v="tab-up" style="flex:1"></button></div>
        <div data-k="body" class="tiny"></div>
        <form data-k="form" autocomplete="on" onsubmit="return false" style="margin:0">
        <input data-k="user" type="text" name="username" autocomplete="username" autocapitalize="off" autocorrect="off" spellcheck="false" maxlength="20" style="${inSt}">
        <input data-k="pw" type="password" name="password" autocomplete="current-password" maxlength="72" style="${inSt}">
        <input data-k="pw2" type="password" name="password2" autocomplete="new-password" maxlength="72" style="${inSt}" hidden>
        </form>
        <div data-k="err" class="tiny" style="color:#ff8a7a;min-height:1.2em"></div>
        <button class="btn px primary" data-v="go" style="width:100%"></button>
        <div data-k="warn" class="tiny" style="color:#e8c37a;margin-top:6px"></div>
        <div style="display:flex;gap:6px;margin-top:6px"><button class="btn px" data-v="cancel" style="flex:1"></button></div></div>`;
      const $$ = k => el.querySelector(`[data-k="${k}"]`), go = el.querySelector('[data-v="go"]');
      let tab = startTab === 'up' ? 'up' : 'in', busy = false;
      const show = () => {
        const up = tab === 'up';
        $$('title').textContent = t.pwTitle;
        $$('body').textContent = up ? t.pwBodyUp : t.pwBodyIn;
        for (const [v, on, txt] of [['tab-in', !up, t.tabIn], ['tab-up', up, t.tabUp]]) { const b = el.querySelector(`[data-v="${v}"]`); b.textContent = txt; b.classList.toggle('primary', on); b.setAttribute('aria-pressed', on ? 'true' : 'false'); }
        $$('user').placeholder = t.userPh; $$('pw').placeholder = t.pwPh; $$('pw2').placeholder = t.pw2Ph;
        $$('pw2').hidden = !up; $$('pw').autocomplete = up ? 'new-password' : 'current-password';
        $$('warn').textContent = t.pwWarn;
        go.textContent = busy ? t.working : up ? t.goUp : t.goIn;
        el.querySelector('[data-v="cancel"]').textContent = t.cancel;
      };
      const err = k => { const f = t.errs[k] || t.errs.auth; $$('err').textContent = typeof f === 'function' ? f() : f; log('pwErr', k); };
      $$('user').addEventListener('input', () => { const i = $$('user'), v = cleanUser(i.value).slice(0, 20); if (v !== i.value) i.value = v; });   /* lọc ký tự lạ ngay khi gõ, viết thường */
      const submit = async () => {
        const un = cleanUser($$('user').value), pw = $$('pw').value, up = tab === 'up';
        $$('user').value = un;
        if (!userOk(un)) return err(up ? 'bad_user' : 'bad_login');
        if (pw.length < PW_MIN) return err(up ? 'weak_pw' : 'bad_login');
        if (up && pw !== $$('pw2').value) return err('pw_mismatch');
        busy = true; show(); $$('err').textContent = '';
        const r = up ? await cloud.signUpPassword(un, pw) : await cloud.signInPassword(un, pw);
        busy = false; show(); log(up ? 'pwSignUp' : 'pwSignIn', { ok: r.ok, err: r.err, detail: r.detail });
        if (!r.ok) return err(r.err);
        close(true);
      };
      let res;
      const close = v => { try { el.remove(); } catch (e) { } pwOpen = null; res(v); };
      el.addEventListener('click', e => {
        const b = e.target.closest && e.target.closest('button[data-v]'); if (!b || busy) return;
        const v = b.dataset.v;
        if (v === 'cancel') return close(false);
        if (v === 'tab-in' || v === 'tab-up') { tab = v === 'tab-up' ? 'up' : 'in'; $$('err').textContent = ''; $$('pw2').value = ''; show(); try { $$('user').focus(); } catch (x) { } return; }
        if (v === 'go') submit();
      });
      el.addEventListener('keydown', e => { if (e.key === 'Enter' && !busy) { e.preventDefault(); submit(); } e.stopPropagation(); });   /* phím gõ không lọt xuống game */
      const p = new Promise(z => { res = z; });
      pwOpen = { el, p, tab: () => tab };
      show(); (document.getElementById('title') || document.body).appendChild(el);
      try { $$('user').focus(); } catch (e) { }
      log('pwOpen', tab);
      return p;
    }
    dbg.pwPanel = pwPanel;

    /* ---------- c30: ĐỔI TÊN hiển thị (save.name + hồ sơ mây), độc lập với tên đăng nhập ---------- */
    const cleanDisp = v => String(v == null ? '' : v).replace(/[\u0000-\u001f\u007f-\u009f<>]/g, '').replace(/\s+/g, ' ').trim();
    const dispOk = n => { const k = [...n].length; return k >= 2 && k <= 16; };
    const curName = () => { try { if (o.S && o.S.save && o.S.save.name) return o.S.save.name; const s = JSON.parse(storage.getItem(KEY()) || 'null'); if (s && s.name) return s.name; } catch (e) { } const u = cloud.status().user; return (u && (u.name || u.username)) || ''; };
    async function rename(v) {
      const n = cleanDisp(v); if (!dispOk(n)) return { ok: false, err: 'bad_name' };
      try {
        if (o.S && o.S.save) { o.S.save.name = n; if (o.persist) o.persist(); else writeSave(o.S.save); }
        else { const s = JSON.parse(storage.getItem(KEY()) || 'null'); if (s && typeof s === 'object') { s.name = n; writeSave(s); } }
        const tn = $('#t-name'); if (tn) tn.value = n;
      } catch (e) { }
      let r = { ok: true, name: n, cloud: false };
      const u = cloud.status().user;
      if (u) { const c = await cloud.setName(n); if (c && c.ok) { u.name = c.name; r.cloud = true; } const f = await sync.flushNow('rename'); afterFlush(f); r.flush = f && f.ok; }
      log('rename', r); paint(); return r;
    }
    dbg.rename = rename;
    let rnOpen = null;
    function renamePanel() {
      if (rnOpen) return rnOpen.p;
      const t = T(), el = document.createElement('div');
      el.id = 'cloud82-rename';
      el.style.cssText = 'position:fixed;inset:0;display:flex;align-items:center;justify-content:center;z-index:200;background:rgba(10,6,16,.55);padding:16px;box-sizing:border-box';
      el.innerHTML = `<div style="border:20px solid transparent;border-image:url(assets/px/ui/frame.png) 20 / 20px round;image-rendering:pixelated;background:#1c1424;background-clip:padding-box;max-width:420px;width:100%;color:#f3e6c6;font:18px VT323,monospace;padding:4px 8px 8px;box-sizing:border-box">
        <div data-k="title" style="font-size:22px;color:#ffd96a;margin-bottom:4px"></div><div data-k="body" class="tiny"></div>
        <input data-k="name" type="text" autocomplete="off" autocorrect="off" spellcheck="false" maxlength="24" style="${inSt}">
        <div data-k="err" class="tiny" style="color:#ff8a7a;min-height:1.2em"></div>
        <div style="display:flex;gap:6px"><button class="btn px primary" data-v="go" style="flex:1"></button><button class="btn px" data-v="cancel" style="flex:1"></button></div></div>`;
      const $$ = k => el.querySelector(`[data-k="${k}"]`), go = el.querySelector('[data-v="go"]');
      $$('title').textContent = t.rnTitle; $$('body').textContent = t.rnBody; $$('name').placeholder = t.rnPh; $$('name').value = curName();
      go.textContent = t.rnOk; el.querySelector('[data-v="cancel"]').textContent = t.cancel;
      let res, busy = false;
      const close = v => { try { el.remove(); } catch (e) { } rnOpen = null; res(v); };
      const submit = async () => {
        const n = cleanDisp($$('name').value); if (!dispOk(n)) { $$('err').textContent = t.rnBad; return; }
        busy = true; go.textContent = t.working; const r = await rename(n); busy = false;
        if (!r.ok) { go.textContent = t.rnOk; $$('err').textContent = t.rnBad; return; }
        try { UI.toast && UI.toast(t.rnDone(r.name)); } catch (e) { }
        close(r);
      };
      el.addEventListener('pointerdown', e => e.stopPropagation());
      el.addEventListener('click', e => { e.stopPropagation(); const b = e.target.closest && e.target.closest('button[data-v]'); if (!b || busy) return; if (b.dataset.v === 'cancel') return close(null); submit(); });
      el.addEventListener('keydown', e => { if (e.key === 'Enter' && !busy) { e.preventDefault(); submit(); } else if (e.key === 'Escape') { e.preventDefault(); close(null); } e.stopPropagation(); });
      el.addEventListener('keyup', e => e.stopPropagation());
      const p = new Promise(z => { res = z; });
      rnOpen = { el, p };
      document.body.appendChild(el);
      try { $$('name').focus(); $$('name').select(); } catch (e) { }
      log('renameOpen', 1);
      return p;
    }
    dbg.renamePanel = renamePanel;
    dbg.displayName = curName;

    const signedIn = async why => { await s39Claim(why); await runResolve(why); await afterSignIn(); paint(); s39After(why); };
    if (ebtn) ebtn.onclick = async () => { try { if (cloud.status().user) return; if (await emailPanel()) await signedIn('email'); } catch (e) { log('err', String(e)); } };
    if (ubtn) ubtn.onclick = async () => { try { if (cloud.status().user) return; if (await pwPanel()) await signedIn('password'); } catch (e) { log('err', String(e)); } };

    if (btn) btn.onclick = async () => {
      try {
        if (cloud.status().user) { await sync.flushNow('signout'); try { if (S39) await S39.leave(); } catch (e) { } await cloud.signOut(); statusTxt = ''; paint(); return; }
        const r = await cloud.signIn({ provider: 'google' }); log('signIn', r);   /* bản thật: chuyển sang Google rồi quay về ?code= → lần mở sau tự đồng bộ */
        if (r.ok && !r.redirect) await signedIn('signin');
      } catch (e) { log('err', String(e)); }
    };

    /* ---------- nhịp: đẩy khi bẩn, ẩn tab, nhịp tim + đếm online ---------- */
    setInterval(() => { try { const s = sync.state(); if (s.dirty && cloud.status().user && Date.now() - s.lastPush >= 60000) sync.flushNow('timer').then(afterFlush); } catch (e) { } }, TICK);
    const beat = async () => {
      try {
        if (typeof document !== 'undefined' && document.hidden) return;
        if (cloud.status().user) await cloud.heartbeat();
        const oc = await cloud.onlineCount(); onlineTxt = oc && oc.ok ? T().online(oc.online | 0, oc.total | 0) : ''; paint();
      } catch (e) { }
    };
    setInterval(beat, HEART);
    if (typeof document !== 'undefined') document.addEventListener('visibilitychange', () => {
      try {
        if (!document.hidden) return;
        if (typeof o.persist === 'function' && o.S && o.S.save && o.S.mode !== 'title') { try { o.persist(); } catch (x) { } }   /* c30: ẩn tab / tắt màn → ghi save mới nhất trước khi đẩy */
        const r = cloud.mode === 'supabase' ? sync.flushHidden() : null;
        if (!r || !r.ok) sync.flushNow('hidden').then(afterFlush);
      } catch (e) { }
    });
    if (W.addEventListener) W.addEventListener('pagehide', () => { try { if (cloud.mode === 'supabase') sync.flushHidden(); else sync.flushNow('pagehide'); } catch (e) { } });

    /* ---------- lúc mở game: đã có phiên → đồng bộ ngay ---------- */
    paint();
    const ss = await cloud.session();
    if (ss && ss.ok && ss.user) { await s39Claim('boot'); await runResolve('boot'); await afterSignIn(); s39After('boot'); }
    else { statusTxt = ss && ss.ok ? '' : T().offline; paint(); }
    beat();
    st.ready = true; log('ready', cloud.mode);
  } catch (e) { log('fatal', String(e && e.message || e)); try { const b = document.querySelector('#t-cont'); if (b) b.disabled = false; const p = document.querySelector('#t-play'); if (p) p.disabled = false; } catch (x) { } }
  return dbg;
}
