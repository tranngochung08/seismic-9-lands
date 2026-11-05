/* coop.js — c10-coop: CHƠI CHUNG — nhiều người cùng vào Làng mới farm quái (bầy farm106) với nhau.
   · Nối máy chủ chuyển tiếp (server/coop: Node hoặc Cloudflare) bằng WebSocket, phòng 'village'. Chỉ hoạt động ở Làng (bãi farm); ra vùng khác = rời phòng.
   · Người vào sớm nhất = CHỦ PHÒNG: máy họ chạy AI bầy quái (farm106) rồi phát ảnh chụp 10 lần/giây; người khác thấy quái là BÓNG theo ảnh chụp.
     Đánh quái ở máy khách → gửi sát thương cho chủ phòng; quái chết → ai có góp sát thương thì nhận XP + đồ rơi ở máy mình (không chia, không giành).
     Quái đánh người chơi khác: chủ phòng tính trúng → gửi 'hurt' tới đúng người đó.
     Chủ phòng rời / ẩn tab / vào trận đấu → máy chủ đổi chủ (người vào sớm nhất còn lại), bóng quái ở máy chủ mới thành quái thật.
   · Thấy người chơi khác (trang phục của họ, tên nhỏ trên đầu, bóng dưới chân) + Chấn Thú họ đang thả.
   · BẬT: ?coop=wss://…  (hoặc ?coop=1 → COOP_URL bên dưới / ws://<máy này>:8787). TẮT: ?coop=0. COOP_URL rỗng + không tham số = TẮT (như bản cũ).
   Móc test: window.__coop. */
import { NET, netSnap, netDefs, netAlive, netHit, netTake, netFxPack, netBecomeGuest, netSpawn, netApply, netHits, netFall, netKilled, netAct, netHurt, netTakeOver, netStat, faintGone, netClaim } from './farm106.js';
import { Entity } from '../entities.js';
import { SHADOW, shadowFor } from './shadow.js';

const COOP_URL = 'wss://seismic-coop.trngochung08.workers.dev/coop';   /* điền sau khi deploy máy chủ, vd 'wss://seismic-coop.<tai-khoan>.workers.dev/coop' → mọi người mặc định vào chơi chung */
const ROOM = 'village', ZONE = 'village';
const CF = { stHz: 10, snapHz: 10, lerp: 12, snap: 64, retry: [1, 2, 4, 8, 15], nameW: 14, yieldT: 1.2 };
const C = { claims: new Map(), url: null, ws: null, st: 'off', id: null, host: null, peers: new Map(), known: new Set(), stT: 0, snapT: 0, retryN: 0, retryAt: 0, take: null, offPlay: 0, log: [], n: { tx: 0, rx: 0, hitTx: 0, hitRx: 0, hurtTx: 0, hurtRx: 0, kill: 0, ms: 0 }, ctx: null, joinedT: 0 };
const vi = ctx => !ctx.lang || ctx.lang() !== 'en';
const lg = e => { C.log.push({ t: +((C.ctx && C.ctx.S.time) || 0).toFixed(2), ...e }); if (C.log.length > 300) C.log.shift(); };

const Q0 = (() => { try { const v = new URLSearchParams(location.search).get('coop'); if (v != null) sessionStorage.setItem('coop10', v); return v != null ? v : sessionStorage.getItem('coop10'); } catch (e) { return null; } })();   /* đọc lúc nạp module (preset / main.js có thể xoá tham số khỏi thanh địa chỉ); giữ trong phiên tab khi tải lại */
function cfgURL() {
  const v = Q0;
  if (v === '0' || v === 'off') return null;
  let u = v && /^wss?:\/\//.test(v) ? v : (v === '1' || v === '') ? (COOP_URL || `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.hostname || '127.0.0.1'}:8787/coop`) : COOP_URL || null;
  if (!u) return null; if (!/\/coop(\?|$)/.test(u)) u = u.replace(/\/?(\?|$)/, '/coop$1');
  return u + (u.includes('?') ? '&' : '?') + 'room=' + ROOM;
}
const inZone = ctx => !!(ctx.S.zone && ctx.S.zone.id === ZONE && ctx.S.player);
const isHost = () => NET.role === 'host';
function send(o) { const w = C.ws; if (!w || w.readyState !== 1) return false; try { w.send(JSON.stringify(o)); C.n.tx++; return true; } catch (e) { return false; } }
const nm29 = v => String(v == null ? '' : v).replace(/[\u0000-\u001f\u007f-\u009f<>]/g, '').trim().slice(0, 16);   /* c29-vat: lọc tên — ≤ 16 ký tự, bỏ ký tự điều khiển / < > */
function acct29() { try { const c = typeof window !== 'undefined' && window.__cloud82 && window.__cloud82.cloud, u = c && c.status && c.status().user; return u ? (u.username || (u.provider !== 'email' && u.name) || '') : ''; } catch (e) { return ''; } }   /* c29-vat: tên đăng nhập tài khoản (không bao giờ email) */
function myName(ctx) { const s = ctx.S.save || {}; return nm29(s.name || (s.self && (s.self.n || s.self.name)) || acct29()) || 'Player'; }   /* c29-vat: save chưa có tên → tên tài khoản */
let NM29 = { t: -1e9, v: '' }; const myNameC = ctx => { const now = Date.now(); if (now - NM29.t > 1000) NM29 = { t: now, v: myName(ctx) }; return NM29.v; };   /* c29-vat: đọc lại tên mỗi 1 s (đặt tên ở Noxx sau khi vào phòng vẫn cập nhật) */
function myLook(ctx) { const o = (ctx.S.save && ctx.S.save.outfit) || {}, out = {}; for (const k of ['skin', 'hair', 'shirt', 'pants']) if (typeof o[k] === 'string') out[k] = o[k]; out.hero = typeof o.hero === 'string' && o.hero ? o.hero : 'none'; return out; }   /* c10-coop sửa 04/11: hero null (chọn Nam/Nữ) gửi rõ 'none' — thiếu khoá thì máy khác vẽ nhầm */

/* ---------- người chơi khác ---------- */
function mkPeer(ctx, id, name, look) {
  let sheet = null; try { sheet = ctx.charSheetOf ? ctx.charSheetOf(look || {}) : null; } catch (e) { sheet = null; }
  const ent = new Entity(-999, -999, sheet); ent.ghost = true;
  const P = { id, name: nm29(name) || 'Player', look: look || {}, ent, tx: null, ty: null, dir: 0, mov: false, diag: null, act: '', ko: false, zone: null, units: new Map(), seen: ctx.S.time };   /* c31-ghost: tính giờ im từ lúc tạo */
  C.peers.set(id, P); return P;
}
function onSt(ctx, m) {
  const P = C.peers.get(m.f) || mkPeer(ctx, m.f, 'Player', {}); P.seen = ctx.S.time;
  P.st = m;   /* c17-pk: giữ tin 'st' cuối (pk / lv / hp / hm) cho pk.js */
  if (typeof m.n === 'string') { const n29 = nm29(m.n); if (n29 && n29 !== P.name) P.name = n29; }   /* c29-vat: tên đi kèm tin 'st' → đổi tên trên đầu khi người kia đặt / đổi tên */
  P.zone = m.z || null; P.h49 = Math.max(0, Math.min(60, +m.h || 0)); P.ko = !!m.k;   /* c49-bay: độ cao người kia đang bay */ P.mov = !!m.m; P.dir = m.d | 0; P.diag = m.g == null ? null : m.g | 0;
  if (P.tx == null || Math.hypot(m.x - P.ent.x, m.y - P.ent.y) > CF.snap) { P.ent.x = m.x; P.ent.y = m.y; }
  P.tx = m.x; P.ty = m.y;
  const a = m.a || ''; if (a !== P.act) { P.act = a; if (a === 'knockdown' && m.k) P.ent.action = { name: a, t: 0, dur: 0.55, hold: true, walk: false, loop: false }; else if (a) P.ent.act(a, 0.4); else P.ent.endAct(); }   /* c27-chet: người khác chết → ngã rồi NẰM (giữ khung) tới khi hồi */
  const U = Array.isArray(m.u) ? m.u.slice(0, 4) : [], keep = new Set();
  U.forEach((r, i) => { const [sp, x, y, clip, fx, lv] = r; if (typeof sp !== 'string') return; const k = i + ':' + sp; keep.add(k); let u = P.units.get(k);
    if (!u) { let e = null; try { e = ctx.ldKit && ctx.ldKit.ready() ? ctx.ldKit.mk(sp, lv || 5, null, x, y) : null; } catch (er) { e = null; } if (!e) return; u = { e, tx: x, ty: y }; P.units.set(k, u); }
    u.tx = x; u.ty = y; if (clip && u.e.clip !== clip) { u.e.clip = clip; u.e.ct = 0; } if (typeof fx === 'number') u.e.fx = fx; u.sp = sp; if (r.length > 7) { u.hp = +r[6] || 0; u.hm = +r[7] || 0; u.uid = r[8]; } });   /* c32-pkthu: máu + id Chấn Thú người khác */
  for (const k of [...P.units.keys()]) if (!keep.has(k)) P.units.delete(k);
}
const peerHere = (P, ctx) => P.zone === ZONE && P.tx != null && inZone(ctx);
function peerObj(id) { const P = C.peers.get(id), ctx = C.ctx; return P && ctx && peerHere(P, ctx) && !P.ko ? P.ent : null; }

/* ---------- vai trò ---------- */
function setHost(ctx, hid) {
  const was = NET.role; C.hostPrev = C.host; C.host = hid;
  if (hid && hid === C.id) {
    if (was === 'guest') netTakeOver();
    NET.role = 'host'; C.known = new Set(); lg({ ev: 'host', was });
    if (C.peers.size) { send({ t: 'mdef', full: 1, l: netDefs() }); for (const mo of netAlive()) C.known.add(mo.id); }
  } else {
    if (was !== 'guest' || hid !== C.hostPrev) netBecomeGuest();   /* đổi chủ → bỏ bóng cũ (id quái theo máy chủ cũ), chờ danh sách đầy đủ của chủ mới */
    NET.role = 'guest'; lg({ ev: 'guest', host: hid });
  }
}
function toSolo(why) {   /* mất mạng: khách → tự chạy bầy ở máy mình (không bỏ trống bãi) */
  if (NET.role === 'guest') { try { netTakeOver(); } catch (e) { } }
  NET.role = 'solo'; C.host = null; C.id = null; C.peers.clear(); C.known = new Set(); lg({ ev: 'solo', why });
}

/* ---------- mạng ---------- */
function connect(ctx) {
  if (C.ws || !C.url) return; C.st = 'conn'; lg({ ev: 'conn', url: C.url });
  let ws; try { ws = new WebSocket(C.url); } catch (e) { C.st = 'off'; retry(); return; }
  C.ws = ws;
  ws.onopen = () => { const L0 = myLook(ctx); C.lookSig = JSON.stringify(L0); send({ t: 'hello', room: ROOM, name: myName(ctx), look: L0, v: 1 }); };
  ws.onmessage = ev => { C.n.rx++; let m; try { m = JSON.parse(ev.data); } catch (e) { return; } try { onMsg(C.ctx || ctx, m); } catch (e) { console.error('coop msg', m && m.t, e); } };
  ws.onclose = () => { if (C.ws !== ws) return; C.ws = null; const had = C.st === 'on'; C.st = 'off'; toSolo('close'); if (had) toast(ctx, vi(ctx) ? 'Mất kết nối chơi chung — đang chơi một mình' : 'Co-op disconnected — playing solo'); retry(); };
  ws.onerror = () => { };
}
function retry() { const s = CF.retry[Math.min(C.retryN, CF.retry.length - 1)]; C.retryN++; C.retryAt = ((C.ctx && C.ctx.S.time) || 0) + s; }
function close(why) { const w = C.ws; C.ws = null; C.st = 'off'; if (w) { try { w.close(); } catch (e) { } } toSolo(why); }
function toast(ctx, t) { try { ctx.toast(t); } catch (e) { } }
function onMsg(ctx, m) {
  switch (m.t) {
    case 'welcome': {
      C.id = m.id; C.st = 'on'; C.retryN = 0; C.joinedT = ctx.S.time; C.peers.clear();
      for (const q of m.peers || []) { const P = mkPeer(ctx, q.id, q.name, q.look); if (q.st) { q.st.f = q.id; onSt(ctx, q.st); } void P; }
      setHost(ctx, m.host);
      const n = C.peers.size + 1; toast(ctx, vi(ctx) ? `Chơi chung: ${n} người ở Làng` : `Co-op: ${n} player${n > 1 ? 's' : ''} in the Village`);
      lg({ ev: 'welcome', id: m.id, host: m.host, peers: C.peers.size }); return;
    }
    case 'join': { mkPeer(ctx, m.id, m.name, m.look); toast(ctx, vi(ctx) ? `${m.name} vào Làng` : `${m.name} joined`); lg({ ev: 'join', id: m.id }); return; }
    case 'leave': { const P = C.peers.get(m.id); C.peers.delete(m.id); if (P) toast(ctx, vi(ctx) ? `${P.name} rời Làng` : `${P.name} left`); lg({ ev: 'leave', id: m.id }); return; }
    case 'look': { const P = C.peers.get(m.f); if (P) { P.look = m.look || {}; try { P.ent.sheet = ctx.charSheetOf(P.look); } catch (e) { } } return; }
    case 'host': setHost(ctx, m.id); return;
    case 'need': if (isHost()) { send({ t: 'mdef', to: m.id, full: 1, l: netDefs() }); lg({ ev: 'need', id: m.id }); } return;
    case 'st': onSt(ctx, m); return;
    case 'ms': if (NET.role === 'guest' && m.f === C.host) { netApply(m.l || []); C.n.ms++; } return;
    case 'mdef': if (NET.role === 'guest' && m.f === C.host) for (const d of m.l || []) netSpawn(d); return;
    case 'mkill': if (NET.role === 'guest') { netKilled(m.n, m.last === 'r:' + C.id); C.n.kill++; } return;
    case 'mfx': if (NET.role === 'guest') netAct(m.n, m.a); return;
    case 'hit': if (isHost()) { const P = C.peers.get(m.f), at = P ? { x: P.ent.x, y: P.ent.y } : null; for (const h of (m.l || []).slice(0, 40)) { if (Array.isArray(h) && netHit(m.f, h[0], Math.min(500, +h[1] || 0), at)) C.n.hitRx++; } } return;
    case 'hurt': if (m.f === C.host && inZone(ctx)) { netHurt(Math.min(200, +m.d || 0)); C.n.hurtRx++; } return;
    case 'take': if (isHost()) { const ok = netTake(m.n); send({ t: 'took', to: m.f, n: m.n, ok }); } return;
    case 'took': { const T = C.take; if (T && T.n === m.n) { C.take = null; if (m.ok) T.cb(); else toast(ctx, vi(ctx) ? 'Thủ lĩnh đang bận đánh nhau' : 'That leader is busy fighting'); } return; }
    case 'mcaught': { faintGone(m.n); if (isHost()) netClaim(m.n); const P = C.peers.get(m.f); lg({ ev: 'mcaught', n: m.n, by: m.f }); void P; return; }
    case 'claim': if (isHost()) { const ok = netClaim(m.n); send({ t: 'claimed', to: m.f, n: m.n, ok }); lg({ ev: 'claim', n: m.n, by: m.f, ok }); } return;
    case 'claimed': { const Q = C.claims.get(m.n); if (Q) { C.claims.delete(m.n); Q.cb(!!m.ok); } return; }
    case 'pvu': case 'pvuok': if (ctx.pkthu && ctx.pkthu.onMsg) ctx.pkthu.onMsg(m); return;   /* c32-pkthu: đòn lên Chấn Thú */
    case 'pvp': case 'pvpok': if (ctx.pk && ctx.pk.onMsg) ctx.pk.onMsg(m); return;   /* c17-pk: đòn PvP gửi riêng (to) — máy nhận tự kiểm */
    case 'wb': case 'wbhit': case 'wbend': case 'wbn': if (ctx.wb44 && ctx.wb44.onMsg) ctx.wb44.onMsg(m, m.f === C.host); return;   /* c44-boss: boss the gioi (khach chi nhan wb / wbend tu chu phong) */
    case 'full': toast(ctx, vi(ctx) ? 'Phòng chơi chung đã đầy' : 'Co-op room is full'); return;
  }
}

/* ---------- gửi trạng thái mình ---------- */
function stMsg(ctx) {
  const p = ctx.S.player, a = p.action && !p.action.walk ? p.action.name : '', units = [];
  const q = ctx.squad104 && ctx.squad104.units ? ctx.squad104 : null;
  if (q) { try { for (const u of q.units()) { if (!u.onField() || !u.f || units.length >= 3) continue; const f = u.f; units.push([f.sp || u.sp, Math.round(f.x), Math.round(f.y), f.clip || 'idle', Math.round((f.fx || 0) * 100) / 100, f.lv | 0, Math.max(0, Math.ceil(u.hp || 0)), u.max | 0, u.id]); } } catch (e) { } }   /* c32-pkthu: + máu / máu tối đa / id Chấn Thú */
  return { t: 'st', x: Math.round(p.x * 2) / 2, y: Math.round(p.y * 2) / 2, d: p.dir | 0, m: p.moving ? 1 : 0, g: p.diag == null ? null : p.diag, a, k: ctx.hero && ctx.hero.fainted ? 1 : 0, z: ctx.S.zone ? ctx.S.zone.id : null, u: units, n: myNameC(ctx), h: ctx.b49Lift ? ctx.b49Lift() : 0, ...(ctx.pk && ctx.pk.st ? ctx.pk.st() : {}) };   /* c29-vat: + n (tên) */   /* c17-pk: + pk, lv, hp, hm */
}

export const coop = {
  id: 'coop',
  always: true,
  onZoneEnter(ctx) {
    C.ctx = ctx; C.url = cfgURL();
    NET.peerObj = peerObj;
    NET.pkApi = { on: () => C.st === 'on' && inZone(C.ctx || ctx), id: () => C.id, send, peers: () => { const c0 = C.ctx || ctx, out = []; for (const P of C.peers.values()) if (peerHere(P, c0)) out.push(P); return out; } };   /* c17-pk */
    NET.peers = () => { const out = []; for (const P of C.peers.values()) if (peerHere(P, ctx) && !P.ko) out.push({ who: 'r:' + P.id, o: P.ent }); return out; };
    NET.nearest = (x, y) => { let b = null, bd = 1e9; for (const P of C.peers.values()) { if (!peerHere(P, ctx) || P.ko) continue; const d = Math.hypot(P.ent.x - x, P.ent.y - y); if (d < bd) { bd = d; b = P; } } return b ? { id: b.id, d: bd } : null; };
    NET.hurt = (pid, d, mo) => { if (send({ t: 'hurt', to: pid, d, n: mo && mo.id })) C.n.hurtTx++; };
    NET.onKill = (mo, last) => { if (!isHost()) return; C.known.delete(mo.id); send({ t: 'mkill', n: mo.id, last: typeof last === 'string' ? last : null }); };
    NET.fx = (mo, A) => { if (isHost() && C.peers.size) { try { send({ t: 'mfx', n: mo.id, a: netFxPack(mo, A) }); } catch (e) { } } };
    NET.take = (mo, cb) => { if (!send({ t: 'take', host: 1, n: mo.__nid })) { cb(); return; } C.take = { n: mo.__nid, cb, t: ctx.S.time }; };
    NET.caught = key => { send({ t: 'mcaught', n: key }); };   /* mình bắt Chấn Thú ngất → máy khác bỏ xác */
    NET.claim = (key, cb) => { if (!send({ t: 'claim', host: 1, n: key })) { cb(true); return; } C.claims.set(key, { cb, t: ctx.S.time }); };   /* khách ném Ấn Thu trúng → xin chủ phòng (ai xin trước được) */
    NET.guestFall = mo => { const h = netFall(mo); if (send({ t: 'hit', host: 1, l: [h] })) C.n.hitTx++; return true; };
    if (typeof window !== 'undefined') window.__coop = {
      state: () => ({ st: C.st, url: C.url, id: C.id, host: C.host, role: NET.role, peers: [...C.peers.values()].map(P => ({ id: P.id, name: P.name, zone: P.zone, x: Math.round(P.ent.x), y: Math.round(P.ent.y), ko: P.ko, units: P.units.size, look: P.look })), n: { ...C.n }, f106: netStat() }),
      log: () => C.log.slice(), close: () => close('test'), yieldHost: () => send({ t: 'yield' }), url: u => { C.url = u; },
    };
    if (typeof window !== 'undefined') window.__coopCtx = () => C.ctx;   /* móc test */
    if (!C.url) return;
    if (inZone(ctx)) { if (!C.ws) { C.retryN = 0; C.retryAt = 0; } }
    else if (C.ws) close('zone');
  },
  onZoneLeave() { if (C.ws) close('leave'); },
  update(dt, ctx) {
    C.ctx = ctx; if (!C.url) return;
    const here = inZone(ctx);
    if (!here) { if (C.ws) close('zone'); return; }
    if (!C.ws && ctx.S.time >= C.retryAt) connect(ctx);
    for (const P of C.peers.values()) {   /* nội suy người chơi khác + Chấn Thú của họ */
      if (P.tx == null) continue; const e = P.ent, dx = P.tx - e.x, dy = P.ty - e.y, k = Math.min(1, dt * CF.lerp);
      e.x += dx * k; e.y += dy * k; e.moving = P.mov || Math.hypot(dx, dy) > 1.5; e.dir = P.dir; e.diag = P.diag; e.diagFor = P.diag == null ? null : P.dir; e.animate(dt);
      for (const u of P.units.values()) { u.e.x += (u.tx - u.e.x) * k; u.e.y += (u.ty - u.e.y) * k; u.e.ct += dt; }
    }
    if (C.st !== 'on') return;
    for (const [k, Q] of [...C.claims]) if (ctx.S.time - Q.t > 3) { C.claims.delete(k); Q.cb(true); }   /* chủ phòng không trả lời → coi như bắt được */
    if (C.take && ctx.S.time - C.take.t > 3) { const T = C.take; C.take = null; T.cb(); }   /* chủ phòng không trả lời → đấu luôn */
    /* chủ phòng đang không chơi (menu / trận đấu / tab ẩn) → nhường chủ phòng cho người khác */
    const away = ctx.S.mode !== 'play' || (ctx.duel && ctx.duel.active && ctx.duel.active()) || (typeof document !== 'undefined' && document.hidden);
    C.offPlay = away ? C.offPlay + dt : 0;
    if (isHost() && C.peers.size && C.offPlay > CF.yieldT) { send({ t: 'yield' }); C.offPlay = -5; lg({ ev: 'yield' }); }
    C.stT -= dt; if (C.stT <= 0) { C.stT = 1 / CF.stHz; send(stMsg(ctx)); }
    C.ghT = (C.ghT || 0) - dt; if (C.ghT <= 0) { C.ghT = 1; for (const [id, P] of C.peers) if (ctx.S.time - (P.seen || 0) > 10) { C.peers.delete(id); lg({ ev: 'ghost', id }); } }   /* c31-ghost: người chơi im > 10 s (tắt ngang, mất mạng) → bỏ khỏi map */
    C.lookT = (C.lookT || 0) - dt; if (C.lookT <= 0 && C.st === 'on') { C.lookT = 0.5; const L1 = myLook(ctx), sg = JSON.stringify(L1); if (sg !== C.lookSig && send({ t: 'look', look: L1 })) C.lookSig = sg; }   /* c10-coop sửa 04/11 (anh: 2 máy thấy đồ khác nhau): đổi nhân vật / đồ sau khi vào phòng → gửi lại cho mọi người */
    if (isHost()) {
      C.snapT -= dt;
      if (C.snapT <= 0 && C.peers.size) {
        C.snapT = 1 / CF.snapHz; const fresh = [];
        for (const mo of netAlive()) if (!C.known.has(mo.id)) { C.known.add(mo.id); fresh.push(mo); }
        if (fresh.length) { const all = netDefs(); send({ t: 'mdef', l: all.filter(d => fresh.some(mo => mo.id === d.n)) }); }
        send({ t: 'ms', l: netSnap() });
      }
    } else if (NET.role === 'guest') {
      const h = netHits(); if (h.length) { if (send({ t: 'hit', host: 1, l: h })) C.n.hitTx += h.length; }
    }
  },
  drawGround(g, ctx, cx, cy) {
    if (!C.peers.size || !SHADOW.on || !inZone(ctx)) return;
    for (const P of C.peers.values()) {
      if (!peerHere(P, ctx)) continue; const e = P.ent;
      shadowFor(g, e.x, e.y, (globalThis.__R89 || Math.round)(e.x - cx), (globalThis.__R89 || Math.round)(e.y - cy) + 1, 12, (P.hd || 0) * 0.8, P.ko ? 0.5 : 1);   /* c49-bay: bóng nhỏ + nhạt theo độ cao */
      for (const u of P.units.values()) shadowFor(g, u.e.x, u.e.y, (globalThis.__R89 || Math.round)(u.e.x - cx), (globalThis.__R89 || Math.round)(u.e.y - cy) + 1, globalThis.__fw110 ? globalThis.__fw110(u.e.sp, 13) : 13, 0);
    }
  },
  drawables(ctx, cx, cy) {
    if (!C.peers.size || !inZone(ctx)) return []; const g = ctx.g, out = [], VW = ctx.VW || 480, VH = ctx.VH || 270;
    for (const P of C.peers.values()) {
      if (!peerHere(P, ctx)) continue; const e = P.ent;
      if (e.x > cx - 48 && e.x < cx + VW + 48 && e.y > cy - 16 && e.y < cy + VH + 72 && e.sheet) out.push({ y: e.y + ((P.h49 || 0) > 0 ? 1e5 : 0), f: () => { P.hd = (P.hd || 0) + ((P.h49 || 0) - (P.hd || 0)) * 0.2; if (Math.abs(P.hd - (P.h49 || 0)) < 0.3) P.hd = P.h49 || 0; g.save(); g.translate(-cx, -cy - Math.round(P.hd)); if (P.ko) g.globalAlpha = 0.5; const t52 = (P.hd || 0) > 0.5 && globalThis.__tilt52 ? globalThis.__tilt52(P, P.dir, P.diag, P.mov, ctx.S.time) : null, mv52 = e.moving;   /* c52-tuthebay: người khác đang bay nghiêng theo hướng + nhấp nhô nhẹ */ if (t52) { const by = Math.round(Math.sin(ctx.S.time * 3) * 1.5); g.translate(e.x, e.y - 9 + by); g.rotate(t52.a); g.scale(1, t52.s); g.translate(-e.x, -(e.y - 9)); if (Math.abs(t52.a) > 0.01 || t52.s < 0.995) e.moving = false; } try { e.draw(g); } catch (er) { } e.moving = mv52; g.restore(); } });
      if (ctx.ldKit) for (const u of P.units.values()) out.push({ y: u.e.y, f: () => { try { ctx.ldKit.draw(g, u.e, cx, cy); } catch (er) { } } });
    }
    return out;
  },
  drawUI(ug, ctx, cx, cy, scale) {   /* tên nhỏ trên đầu người chơi khác (màu xanh nhạt, khác tên mình vàng) — không bảng to */
    if (!C.peers.size || !inZone(ctx) || ctx.S.mode !== 'play') return; const su = ctx.scaleUI || scale, fs = Math.max(10, Math.round(su * 3));
    ug.save(); ug.font = `bold ${fs}px VT323, monospace`; ug.textAlign = 'center'; ug.textBaseline = 'bottom';
    for (const P of C.peers.values()) {
      if (!peerHere(P, ctx)) continue; const sx = (P.ent.x - cx) * scale, sy = (P.ent.y - 22 - Math.round(P.hd || 0) - cy) * scale;   /* c52-tuthebay: tên theo độ cao người đang bay */ if (sx < -80 || sy < -40 || sx > ug.canvas.width + 80 || sy > ug.canvas.height + 40) continue;
      const t = P.name, w = ug.measureText(t).width + 8, h = fs + 4;
      ug.fillStyle = 'rgba(13,11,20,.55)'; ug.beginPath(); if (ug.roundRect) ug.roundRect(sx - w / 2, sy - h, w, h, 3); else ug.rect(sx - w / 2, sy - h, w, h); ug.fill();
      ug.fillStyle = P.ko ? '#9a9aa8' : P.st && P.st.pk ? '#ff6a5a' : '#9fe0ff';   /* c17-pk: đang bật PK → tên đỏ */ ug.fillText(t, sx, sy - 2);
    }
    ug.restore();
  },
};
