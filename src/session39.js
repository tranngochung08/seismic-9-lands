/* c39-mot-phien (anh 04/11): MỖI TÀI KHOẢN CHỈ 1 PHIÊN CHƠI.
   - Mỗi lần mở trang = 1 phiên (sid). Đăng nhập / mở game → phát 'claim' trên kênh Supabase Realtime broadcast `s39-<uid>` (kênh công khai, chỉ cần anon key, không cần bảng mới).
   - Phiên đang chơi nhận 'claim' → trả 'here' → lưu save + đẩy lên mây ngay → DỪNG (không lưu / đồng bộ, game đứng, ngắt chơi chung) → trả 'handed'.
   - Phiên mới chờ 'handed' (tối đa ~9 s) rồi mới đồng bộ → tải ĐÚNG bản vừa đẩy.
   - Đường lùi khi lỡ tin (điện thoại ngủ, Realtime bị chặn): mọi lần đẩy ghi meta.s39 = sid; phiên đang chơi định kỳ / lúc quay lại tab đọc nhẹ saves (rev + meta.s39); thấy phiên khác đã đẩy bản mới hơn → dừng.
   - "Chơi tiếp ở đây" → khôi phục save máy về đúng lúc dừng, nạp lại trang (phiên mới giành lại, máy kia dừng), tự vào game. */
import { SUPABASE_JS } from './cloud.js';

const TX = {
  vi: { title: 'Tài khoản đang chơi ở thiết bị khác', body: 'Tiến độ đã lưu lên mây. Máy này tạm dừng lưu để không ghi đè.', go: 'Chơi tiếp ở đây', wait: 'Đang nhận save từ thiết bị khác…' },
  en: { title: 'This account is playing on another device', body: 'Progress was saved to the cloud. Saving is paused here so nothing gets overwritten.', go: 'Play here instead', wait: 'Getting the save from your other device…' }
};
const WAIT_HERE = 1500, WAIT_HAND = 9000, PEEK_EVERY = 30000;

export async function initSession39(o) {
  const W = typeof window !== 'undefined' ? window : {};
  const { cloud, sync, storage } = o, CF = o.CONFIG || {};
  const KEY = typeof o.key === 'function' ? o.key : () => o.key;
  const sid = 's' + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-5);
  const st = { sid, active: false, stopped: false, by: null, why: null, uid: null, ch: null, rt: null, claimT: 0, waiting: null, log: [], last: null };
  const lg = (k, v) => { try { st.log.push({ t: Date.now(), k, v }); if (st.log.length > 120) st.log.shift(); if (o.log) o.log('s39:' + k, v); } catch (e) { } };
  const api = { st, sid };
  W.__s39 = api;
  if (cloud.mode !== 'supabase' || !CF.SUPABASE_URL || !CF.SUPABASE_ANON_KEY) { lg('off', cloud.mode); api.claim = async () => ({ skip: 'mode' }); api.after = async () => { }; api.leave = () => { }; return api; }
  const url = String(CF.SUPABASE_URL).replace(/\/+$/, ''), akey = CF.SUPABASE_ANON_KEY;
  const lang = () => (o.lang && o.lang() === 'vi' ? 'vi' : 'en'), T = () => TX[lang()];
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const readLocal = () => { try { return JSON.parse(storage.getItem(KEY()) || 'null'); } catch (e) { return null; } };
  const ss = W.sessionStorage || null;
  const sget = k => { try { return ss ? ss.getItem(k) : null; } catch (e) { return null; } };
  const sset = (k, v) => { try { if (ss) { if (v == null) ss.removeItem(k); else ss.setItem(k, v); } } catch (e) { } };

  /* ---------- chặn lưu / đồng bộ khi phiên này bị dừng ---------- */
  const orig = { flushNow: sync.flushNow, markDirty: sync.markDirty, flushHidden: sync.flushHidden, pushSave: cloud.pushSave, pushKeepalive: cloud.pushKeepalive };
  const stamp = d => { try { if (d && typeof d === 'object') d.meta = { ...(d.meta || {}), s39: sid }; } catch (e) { } return d; };
  cloud.pushSave = (d, b, x) => (st.stopped ? Promise.resolve({ ok: false, err: 's39_stopped' }) : orig.pushSave(stamp(d), b, x));
  cloud.pushKeepalive = (d, b, x) => (st.stopped ? { ok: false, err: 's39_stopped' } : orig.pushKeepalive(stamp(d), b, x));
  sync.markDirty = () => (st.stopped ? null : orig.markDirty());
  sync.flushHidden = () => (st.stopped ? { ok: false, skipped: 's39' } : orig.flushHidden());
  sync.flushNow = async why => {
    if (st.stopped) return { ok: false, skipped: 's39' };
    const r = await orig.flushNow(why);
    if (r && !r.ok && r.err === 'conflict') { try { const c = await peek(); if (c && c.s39 && c.s39 !== sid) stop(c.s39, 'conflict'); } catch (e) { } }   /* phiên khác đã đẩy → mình là bản cũ, dừng */
    return r;
  };

  /* ---------- đọc nhẹ saves: chỉ rev + meta.s39 (REST, token phiên Supabase trong localStorage) ---------- */
  function token() {
    try { for (let i = 0; i < W.localStorage.length; i++) { const k = W.localStorage.key(i); if (/^sb-.*-auth-token$/.test(k)) { const j = JSON.parse(W.localStorage.getItem(k) || 'null'); const t = j && (j.access_token || (j.currentSession && j.currentSession.access_token)); if (t) return t; } } } catch (e) { }
    return null;
  }
  async function peek() {
    const t = token(); if (!t || typeof fetch === 'undefined') return null;
    const r = await fetch(url + '/rest/v1/saves?select=rev,s39:data->meta->>s39', { headers: { apikey: akey, Authorization: 'Bearer ' + t } });
    if (!r.ok) return null;
    const a = await r.json(); return Array.isArray(a) && a[0] ? a[0] : null;
  }
  async function check(why) {
    if (!st.active || st.stopped || !cloud.status().user || st.waiting) return null;
    if (typeof document !== 'undefined' && document.hidden) return null;
    let c = null; try { c = await peek(); } catch (e) { return null; }
    st.last = { why, c, t: Date.now() };
    if (!c || !c.s39 || c.s39 === sid) return c;
    const L = readLocal(), base = L && L.meta ? L.meta.base | 0 : 0;
    if ((c.rev | 0) > base) stop(c.s39, 'peek:' + why);
    return c;
  }
  api.check = check; api.peek = peek;

  /* ---------- kênh Realtime ---------- */
  async function chan(uid) {
    if (st.ch && st.uid === uid && st.chOk) return st.ch;
    if (st.ch) { try { await st.rt.removeChannel(st.ch); } catch (e) { } st.ch = null; st.chOk = false; }
    if (!st.rt) { const mod = await import(/* @vite-ignore */ SUPABASE_JS); st.rt = mod.createClient(url, akey, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storageKey: 'seismic9.s39' } }); }
    const ch = st.rt.channel('s39-' + uid, { config: { broadcast: { self: false, ack: false } } });
    ch.on('broadcast', { event: 'm' }, ({ payload }) => { try { onMsg(payload || {}); } catch (e) { lg('err', String(e)); } });
    const s = await new Promise(res => { let done = false; const fin = v => { if (!done) { done = true; res(v); } }; ch.subscribe(x => { if (x === 'SUBSCRIBED' || x === 'CHANNEL_ERROR' || x === 'TIMED_OUT' || x === 'CLOSED') fin(x); }); setTimeout(() => fin('timeout'), 7000); });
    st.ch = ch; st.uid = uid; st.chOk = s === 'SUBSCRIBED'; lg('chan', s);
    return ch;
  }
  const send = p => { try { if (st.ch && st.chOk) return st.ch.send({ type: 'broadcast', event: 'm', payload: { ...p, f: sid } }); } catch (e) { } return null; };

  function onMsg(p) {
    if (!p || p.f === sid) return;
    if (p.t === 'claim') {
      if (st.stopped) return;   /* phiên đã dừng không giữ gì để giao */
      if (st.waiting && (p.t0 | 0) < st.claimT) return;   /* 2 máy cùng giành: ai giành SAU thắng */
      if (!st.active && !st.waiting) return;
      send({ t: 'here', to: p.f });
      yieldTo(p.f);
      return;
    }
    const w = st.waiting; if (!w || p.to !== sid) return;
    if (p.t === 'here') { w.here.add(p.f); return; }
    if (p.t === 'handed') { w.here.add(p.f); w.handed.add(p.f); w.rev = Math.max(w.rev | 0, p.rev | 0); if ([...w.here].every(x => w.handed.has(x))) w.done(); }
  }

  async function yieldTo(other) {
    lg('yield', other);
    try { const S = o.S; if (typeof o.persist === 'function' && S && S.save && S.mode !== 'title') o.persist(); } catch (e) { }
    let r = null;
    for (let i = 0; i < 30; i++) { r = await orig.flushNow('s39-yield'); if (!(r && r.skipped === 'busy')) break; await sleep(150); }
    const L = readLocal();
    stop(other, 'claim');
    send({ t: 'handed', to: other, rev: L && L.meta ? L.meta.base | 0 : 0, ok: !!(r && r.ok) });
    lg('handed', { other, r: r && { ok: r.ok, rev: r.rev, skipped: r.skipped, err: r.err } });
  }

  /* ---------- dừng: chụp save máy lúc dừng, đứng game, ngắt chơi chung, hiện bảng ---------- */
  let panel = null, holdT = null, oldScale;
  function stop(by, why) {
    if (st.stopped) return;
    st.stopped = true; st.active = false; st.by = by; st.why = why; lg('stop', { by, why });
    try { const cur = storage.getItem(KEY()); if (cur) sset('s39.snap', cur); } catch (e) { }
    try { if (W.__coop) { if (W.__coop.url) W.__coop.url(null); if (W.__coop.close) W.__coop.close(); } } catch (e) { }
    const S = o.S;
    try { if (S) { oldScale = S.timeScale; S.timeScale = 0; holdT = setInterval(() => { try { if (st.stopped) S.timeScale = 0; } catch (e) { } }, 250); } } catch (e) { }
    showPanel();
  }
  function showPanel() {
    try {
      if (typeof document === 'undefined') return;
      if (panel) panel.remove();
      const t = T(), el = document.createElement('div');
      el.id = 's39-panel';
      el.style.cssText = 'position:fixed;inset:0;display:flex;align-items:center;justify-content:center;z-index:9990;background:rgba(10,6,16,.55);padding:16px;box-sizing:border-box';
      el.innerHTML = `<div style="border:20px solid transparent;border-image:url(assets/px/ui/frame.png) 20 / 20px round;image-rendering:pixelated;background:#1c1424;background-clip:padding-box;max-width:340px;width:100%;color:#f3e6c6;font:18px VT323,monospace;padding:2px 8px 8px;box-sizing:border-box;text-align:center">
        <div style="font-size:21px;color:#ffd96a;margin-bottom:4px;line-height:1.05">${t.title}</div><div style="font-size:16px;margin-bottom:8px;line-height:1.1">${t.body}</div>
        <button class="btn px primary" id="s39-go" style="width:100%">${t.go}</button></div>`;
      el.addEventListener('pointerdown', e => e.stopPropagation());
      el.addEventListener('keydown', e => e.stopPropagation());
      el.querySelector('#s39-go').addEventListener('click', resume);
      document.body.appendChild(el); panel = el;
    } catch (e) { lg('err', String(e)); }
  }
  function resume() {
    lg('resume');
    sset('s39.go', '1');
    const snap = sget('s39.snap'); if (snap) { try { storage.setItem(KEY(), snap); } catch (e) { } }
    try { const b = document.getElementById('s39-go'); if (b) { b.disabled = true; b.textContent = T().wait; } } catch (e) { }
    W.location.reload();
  }
  api.stop = stop; api.resume = resume; api.showPanel = showPanel;

  /* ---------- giành phiên (lúc mở game đã đăng nhập / vừa đăng nhập / bấm Chơi tiếp ở đây) ---------- */
  api.claim = async why => {
    const u = cloud.status().user; if (!u) return { skip: 'guest' };
    const snap = sget('s39.snap'); if (snap) { try { storage.setItem(KEY(), snap); } catch (e) { } sset('s39.snap', null); }   /* trang trước bị dừng: bỏ mọi lần ghi sau lúc dừng (unload cũng ghi) */
    try { await chan(u.id); } catch (e) { lg('chan_err', String(e)); }
    if (!st.chOk) { st.active = true; lg('claim_nochan', why); return { rt: 'fail' }; }
    st.claimT = Date.now();
    const w = { here: new Set(), handed: new Set(), rev: 0, done: null };
    const p = new Promise(r => { w.done = r; });
    st.waiting = w;
    send({ t: 'claim', t0: st.claimT, why });
    await sleep(WAIT_HERE);
    if (w.here.size && ![...w.here].every(x => w.handed.has(x))) await Promise.race([p, sleep(WAIT_HAND)]);
    st.waiting = null; st.active = true;
    const res = { here: [...w.here], handed: [...w.handed], rev: w.rev };
    lg('claimed', res); st.claimRes = res;
    return res;
  };
  api.after = async why => {
    if (sget('s39.go') !== '1') return;
    sset('s39.go', null);
    for (let i = 0; i < 60; i++) {   /* tự vào game (đúng nút "Chơi tiếp" của màn tiêu đề) */
      const b = document.getElementById('t-cont');
      if (b && !b.hidden && !b.disabled && o.S && o.S.mode === 'title') { b.click(); lg('auto_cont', why); return; }
      await sleep(250);
    }
  };
  api.leave = async () => { st.active = false; try { if (st.ch && st.rt) await st.rt.removeChannel(st.ch); } catch (e) { } st.ch = null; st.chOk = false; };

  setInterval(() => { check('timer'); }, PEEK_EVERY);
  if (typeof document !== 'undefined') document.addEventListener('visibilitychange', () => { if (!document.hidden) setTimeout(() => check('visible'), 400); });
  return api;
}
