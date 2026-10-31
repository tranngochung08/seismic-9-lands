// perf.js — plan-37: đo khung hình. Bật bằng ?fps (hoặc localStorage seismic.fps = '1', hoặc __perf.enable()).
// Không bật: lap() / frame() là hàm rỗng, hook của hệ KHÔNG bị bọc → gần như 0 chi phí.
// Bật: bảng nhỏ góc trên trái (fps TB / 1 % thấp, ms/khung, 6 phần tốn nhất, số khung giật > 50 ms, cỡ canvas, DPR, bậc đồ hoạ).
// window.__perf.snapshot() trả số liệu cho test.
const now = () => performance.now();
const RING = 300;
const P = {
  on: false, iv: new Float32Array(RING), wk: new Float32Array(RING), n: 0, i: 0, hitch: 0, frames: 0,
  acc: new Map(), sysAcc: 0, lapT: 0, lapSys: 0, t0: 0, tLast: 0, el: null, nextShow: 0, getCanvas: null, getTier: null, systems: null,
};
const noop = () => { };
export const PERF = {
  get on() { return P.on; },
  lap: noop,          /* PERF.lap('tên') — cộng thời gian từ mốc trước (trừ phần đã tính cho hệ) vào mục 'tên' */
  begin: noop,        /* đầu khung: PERF.begin(t rAF) */
  end: noop,          /* cuối khung */
  add: noop,
  init(o) { P.getCanvas = o.canvas; P.getTier = o.tier; P.systems = o.systems; if (o.on) enable(); },
};
function add(k, d) { P.acc.set(k, (P.acc.get(k) || 0) + d); }
function lap(name) { const t = now(), d = t - P.lapT - (P.sysAcc - P.lapSys); P.lapT = t; P.lapSys = P.sysAcc; if (d > 0) add(name, d); }
function begin(t) {
  if (P.tLast) { const d = t - P.tLast; P.iv[P.i] = d; if (d > 50) P.hitch++; }
  P.tLast = t; P.t0 = now(); P.lapT = P.t0; P.lapSys = P.sysAcc;
}
function end() {
  const w = now() - P.t0; P.wk[P.i] = w; P.i = (P.i + 1) % RING; P.n = Math.min(RING, P.n + 1); P.frames++;
  if (P.el && P.t0 >= P.nextShow) { P.nextShow = P.t0 + 500; show(); }
}
const HOOKS = ['update', 'draw', 'drawGround', 'drawUI', 'drawables', 'hudLines', 'near'];
function wrapSys(sys) {
  for (const k of HOOKS) {
    const f = sys[k]; if (typeof f !== 'function' || f.__pw) continue;
    const key = sys.id + '.' + (k === 'drawables' ? 'dw' : k === 'drawGround' ? 'ground' : k === 'drawUI' ? 'ui' : k);
    let w;
    if (k === 'drawables') {
      const kf = sys.id + '.dwDraw';
      w = function () { const t0 = now(); let r; try { r = f.apply(this, arguments); } finally { const d = now() - t0; P.sysAcc += d; add(key, d); }
        if (r && r.length) for (const d of r) if (d && typeof d.f === 'function' && !d.f.__pw) { const ff = d.f; d.f = function () { const t1 = now(); try { return ff.apply(this, arguments); } finally { const dd = now() - t1; P.sysAcc += dd; add(kf, dd); } }; d.f.__pw = true; }
        return r; };
    } else w = function () { const t0 = now(); try { return f.apply(this, arguments); } finally { const d = now() - t0; P.sysAcc += d; add(key, d); } };
    w.__pw = true; w.__orig = f; sys[k] = w;
  }
}
function enable() {
  if (P.on) return; P.on = true;
  PERF.lap = lap; PERF.begin = begin; PERF.end = end; PERF.add = add;
  for (const s of P.systems || []) wrapSys(s);
  if (!P.el) {
    const el = document.createElement('pre'); el.id = 'perfhud';
    el.style.cssText = 'position:fixed;left:2px;top:calc(env(safe-area-inset-top,0px) + 2px);z-index:99999;margin:0;padding:3px 5px;font:11px/1.25 ui-monospace,Consolas,monospace;color:#e8ffe0;background:rgba(0,0,0,.62);pointer-events:none;white-space:pre;border-radius:3px;max-width:62vw;overflow:hidden';
    document.body.appendChild(el); P.el = el;
  }
  reset();
}
function disable() {
  if (!P.on) return; P.on = false; PERF.lap = noop; PERF.begin = noop; PERF.end = noop; PERF.add = noop;
  for (const s of P.systems || []) for (const k of HOOKS) if (s[k] && s[k].__pw) s[k] = s[k].__orig;
  if (P.el) { P.el.remove(); P.el = null; }
}
function reset() { P.n = 0; P.i = 0; P.hitch = 0; P.frames = 0; P.acc.clear(); P.tLast = 0; }
function stats() {
  const n = P.n; if (!n) return null;
  const iv = Array.from(P.iv.subarray(0, n)).filter(v => v > 0), wk = Array.from(P.wk.subarray(0, n));
  const mean = a => a.reduce((s, v) => s + v, 0) / Math.max(1, a.length);
  const srt = iv.slice().sort((a, b) => a - b), wks = wk.slice().sort((a, b) => a - b);
  const p99 = srt[Math.min(srt.length - 1, Math.floor(srt.length * 0.99))] || 0;
  const mi = mean(iv), mw = mean(wk), fr = Math.max(1, P.frames);
  const top = [...P.acc.entries()].map(([k, v]) => [k, +(v / fr).toFixed(2)]).sort((a, b) => b[1] - a[1]);
  const cv = P.getCanvas ? P.getCanvas() : null;
  return {
    fps: +(1000 / Math.max(1e-3, mi)).toFixed(1), low1: +(1000 / Math.max(1e-3, p99)).toFixed(1), frameMs: +mi.toFixed(2),
    workMs: +mw.toFixed(2), workP95: +(wks[Math.floor(wks.length * 0.95)] || 0).toFixed(2), hitches: P.hitch, frames: P.frames,
    top: top.slice(0, 14), backing: cv ? { w: cv.width, h: cv.height, cssW: cv.clientWidth, cssH: cv.clientHeight } : null,
    dpr: +(window.devicePixelRatio || 1).toFixed(2), tier: P.getTier ? P.getTier() : null,
  };
}
function show() {
  const s = stats(); if (!s || !P.el) return;
  const L = [`${s.fps} fps · 1%↓ ${s.low1} · ${s.frameMs} ms`, `JS ${s.workMs} ms (p95 ${s.workP95}) · giật ${s.hitches}`];
  for (const [k, v] of s.top.slice(0, 6)) L.push(`${v.toFixed(2).padStart(5)} ${k}`);
  if (s.backing) L.push(`cv ${s.backing.w}×${s.backing.h} · css ${s.backing.cssW}×${s.backing.cssH} · dpr ${s.dpr}${s.tier ? ' · ' + s.tier : ''}`);
  P.el.textContent = L.join('\n');
  /* cửa sổ trượt: tổng theo từng phần chỉ giữ ~2 s gần nhất cho bảng */
  if (P.frames > 240) { for (const [k, v] of P.acc) P.acc.set(k, v / 2); P.frames = P.frames / 2; }
}
window.__perf = { snapshot: stats, reset, enable, disable, get on() { return P.on; } };
{ let on = false; try { on = new URLSearchParams(location.search).has('fps') || localStorage.getItem('seismic.fps') === '1'; } catch (e) { } PERF.autoOn = on; }

/* ---------- plan-37 (h): CHẤT LƯỢNG ĐỒ HOẠ tự động ----------
   Chế độ (⚙ Cài đặt, lưu localStorage 'seismic.gfx'): 'auto' (mặc định) · 'high' (Đẹp: luôn đủ) · 'smooth' (Mượt: luôn bậc nhẹ).
   Tự động: đo khoảng cách khung (luôn đo, rẻ: 1 phép trừ / khung); cứ mỗi 1 s xét cửa sổ 3 s gần nhất —
   1 % thấp < 45 fps 3 lần liền → bậc nhẹ ('low'); đang nhẹ mà TB ≥ 57 và 1 % thấp ≥ 50 suốt 12 s → trả lại bậc đủ.
   Đã tụt ≥ 3 lần trong phiên → giữ bậc nhẹ (tránh chập chờn). Tab ẩn / khung > 250 ms (tải vùng, chuyển cảnh) không tính.
   Hệ đọc: ctx.gfxLow() → true khi đang bậc nhẹ (ít lớp sương, trần hạt, tắt bóng mây trong trận, khảm phân giải thấp). */
const GQ = { mode: 'auto', low: false, iv: new Float32Array(240), n: 0, i: 0, last: 0, nextCheck: 0, bad: 0, good: 0, drops: 0, listeners: [] };
try { const m = localStorage.getItem('seismic.gfx'); if (m === 'high' || m === 'smooth' || m === 'auto') GQ.mode = m; } catch (e) { }
function gqEval(t) {
  const n = GQ.n; if (n < 60) return;
  let sum = 0, cnt = 0; const a = [];
  for (let k = 0; k < n; k++) { const v = GQ.iv[k]; if (v > 0) { sum += v; cnt++; a.push(v); } }
  if (cnt < 60) return; a.sort((x, y) => x - y);
  const avg = 1000 / (sum / cnt), low1 = 1000 / a[Math.min(a.length - 1, Math.floor(a.length * 0.99))];
  GQ.lastAvg = avg; GQ.lastLow = low1;
  if (!GQ.low) { GQ.bad = low1 < 45 ? GQ.bad + 1 : 0; if (GQ.bad >= 3) setLow(true, `1%↓ ${low1.toFixed(0)}`); }
  else if (GQ.drops < 3) { GQ.good = avg >= 57 && low1 >= 50 ? GQ.good + 1 : 0; if (GQ.good >= 12) setLow(false, `TB ${avg.toFixed(0)}`); }
}
function setLow(v, why) { if (GQ.low === v) return; GQ.low = v; GQ.bad = 0; GQ.good = 0; GQ.n = 0; GQ.i = 0; if (v) GQ.drops++; GQ.why = why; for (const f of GQ.listeners) { try { f(v); } catch (e) { } } }
export const GFX = {
  /* gọi mỗi khung với mốc rAF */
  frame(t) {
    if (GQ.mode !== 'auto') { GQ.last = t; return; }
    const d = GQ.last ? t - GQ.last : 0; GQ.last = t;
    if (d > 0 && d < 250 && document.visibilityState !== 'hidden') { GQ.iv[GQ.i] = d; GQ.i = (GQ.i + 1) % 180; GQ.n = Math.min(180, GQ.n + 1); }
    if (t >= GQ.nextCheck) { GQ.nextCheck = t + 1000; gqEval(t); }
  },
  low: () => GQ.mode === 'smooth' || (GQ.mode === 'auto' && GQ.low),
  mode: () => GQ.mode,
  setMode(m) { GQ.mode = m; try { localStorage.setItem('seismic.gfx', m); } catch (e) { } GQ.n = 0; GQ.i = 0; GQ.bad = 0; GQ.good = 0; if (m !== 'auto') GQ.low = false; for (const f of GQ.listeners) { try { f(GFX.low()); } catch (e) { } } },
  cycle() { GFX.setMode(GQ.mode === 'auto' ? 'high' : GQ.mode === 'high' ? 'smooth' : 'auto'); },
  label(vi) { const m = GQ.mode; return (vi ? 'Đồ họa: ' : 'Graphics: ') + (m === 'auto' ? (vi ? 'Tự động' : 'Auto') + (GQ.low ? (vi ? ' (đang nhẹ)' : ' (light)') : '') : m === 'high' ? (vi ? 'Đẹp' : 'Pretty') : (vi ? 'Mượt' : 'Smooth')); },
  tierName: () => GQ.mode + (GFX.low() ? ':low' : ':high'),
  onChange(f) { GQ.listeners.push(f); },
  debug: () => ({ mode: GQ.mode, low: GFX.low(), drops: GQ.drops, avg: GQ.lastAvg, low1: GQ.lastLow, why: GQ.why }),
  force(v) { setLow(!!v, 'test'); },
};
window.__gfx = GFX;
