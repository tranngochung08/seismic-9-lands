// audio/dsp.js — tổng hợp âm kiểu sfxr ra mảng mẫu (Float32Array), không phụ thuộc Web Audio.
// Dùng chung: game (audio/mixer.js), trang nghe thử tools/audio-preview.html (ghép nguyên văn), render offline để kiểm tra.
// Một "giọng" (voice) = { w sóng, f→f2 trượt cao độ, a/h/d bao âm, v âm lượng, lp/hp/bp lọc (có quét), vib, am, jmp, rep… }.
// Một công thức (recipe) = { v: [giọng…], vary, seeds, rev, gain } hoặc hàm R => công thức (R = số ngẫu nhiên có hạt giống → mỗi bản hơi khác).

export function dspRng(seed) {   /* mulberry32 */
  let a = (seed >>> 0) || 1;
  return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

/* lọc biến trạng thái TPT (Zavalishin) — ổn định với mọi tần số, quét được từng mẫu */
function dspSvf() {
  let ic1 = 0, ic2 = 0, g = 0, k = 1.4142, a1 = 0, a2 = 0, a3 = 0, lf = -1, lq = -1;
  return (x, fc, q, sr, mode) => {
    if (fc !== lf || q !== lq) {
      const f = Math.max(10, Math.min(fc, sr * 0.45));
      g = Math.tan(Math.PI * f / sr); k = 1 / Math.max(0.1, q); a1 = 1 / (1 + g * (g + k)); a2 = g * a1; a3 = g * a2; lf = fc; lq = q;
    }
    const v3 = x - ic2, v1 = a1 * ic1 + a2 * v3, v2 = ic2 + a2 * ic1 + a3 * v3;
    ic1 = 2 * v1 - ic1; ic2 = 2 * v2 - ic2;
    return mode === 0 ? v2 : mode === 1 ? k * v1 : x - k * v1 - v2;   /* 0 thông thấp · 1 thông dải (đỉnh = 1) · 2 thông cao */
  };
}
const dspBlep = (t, dt) => {   /* PolyBLEP: bớt răng cưa cho sóng vuông / răng cưa */
  if (t < dt) { t /= dt; return t + t - t * t - 1; }
  if (t > 1 - dt) { t = (t - 1) / dt; return t * t + t + t + 1; }
  return 0;
};
const DSP_RANGE_SKIP = { vib: 1, am: 1, jmp: 1 };

/* giọng hạt (grains: n) → n giọng con, mỗi tham số dạng [min, max] được bốc ngẫu nhiên; span = khoảng rải, dens > 1 dồn về đầu */
function dspExpand(list, R) {
  const out = [];
  for (const v of list) {
    if (!v) continue;
    if (v.grains) {
      const n = Array.isArray(v.grains) ? Math.round(v.grains[0] + R() * (v.grains[1] - v.grains[0])) : v.grains;
      for (let i = 0; i < n; i++) {
        const o = {};
        for (const k in v) {
          if (k === 'grains' || k === 'span' || k === 'dens') continue;
          const val = v[k];
          o[k] = Array.isArray(val) && val.length === 2 && typeof val[0] === 'number' && !DSP_RANGE_SKIP[k] ? val[0] + R() * (val[1] - val[0]) : val;
        }
        o.t = (v.t || 0) + Math.pow(R(), v.dens || 1) * (v.span || 0.3);
        out.push(o);
      }
    } else {
      const o = {};
      for (const k in v) { const val = v[k]; o[k] = Array.isArray(val) && val.length === 2 && typeof val[0] === 'number' && !DSP_RANGE_SKIP[k] ? val[0] + R() * (val[1] - val[0]) : val; }
      out.push(o);
    }
  }
  return out;
}
const dspVoiceLen = v => { const one = (v.a ?? 0.004) + (v.h || 0) + (v.d ?? 0.12); return (v.t || 0) + (v.rep ? v.rep * ((v.reps || 1) - 1) + one : one); };

function dspVoice(out, v, sr, R) {
  const t0 = Math.round((v.t || 0) * sr);
  const a = Math.max(0.0004, v.a ?? 0.004), h = v.h || 0, d = Math.max(0.002, v.d ?? 0.12), dur = a + h + d;
  const rep = v.rep || 0, reps = v.reps || 1, total = rep ? rep * (reps - 1) + dur : dur;
  const n = Math.min(Math.ceil(total * sr), out.length - t0);
  const w = v.w || 'sq', f0 = v.f ?? 440, f1 = v.fr ? f0 * v.fr : (v.f2 ?? f0), sl = v.sl ?? dur, sc = v.sc ?? 1;
  const vol = v.v ?? 0.3, pk = v.pk || 0, dc = v.dc ?? 2;
  let ph = R(), duty = v.duty ?? 0.5, nph = 0, nv = 0, br = 0, p0 = 0, p1 = 0, p2 = 0, cc = 0, cv = 0;
  const lp = v.lp ? dspSvf() : null, hp = v.hp ? dspSvf() : null, bp = v.bp ? dspSvf() : null;
  const lq = v.lq ?? 0.707, hq = v.hq ?? 0.707, bq = v.bq ?? 1;
  const lp2 = v.lp2 ?? v.lp, hp2 = v.hp2 ?? v.hp, bp2 = v.bp2 ?? v.bp;
  const crush = v.crush ? Math.max(1, Math.round(v.crush)) : 0;
  let fc = 0, hc = 0, bc = 0;
  for (let i = 0; i < n; i++) {
    const tt = i / sr, lt = rep ? tt % rep : tt;
    if (rep && Math.floor(tt / rep) >= reps) break;
    let env;
    if (lt < a) env = lt / a;
    else if (lt < a + h) env = 1 + pk * (1 - (lt - a) / Math.max(h, 1e-4));
    else if (lt < dur) env = Math.pow(1 - (lt - a - h) / d, dc);
    else env = 0;
    let f = f1 === f0 ? f0 : f0 * Math.pow(f1 / f0, Math.pow(Math.min(1, lt / sl), sc));
    if (v.jmp) { let m = 1; for (const j of v.jmp) if (lt >= j[0]) m = j[1]; f *= m; }
    if (v.vib) { const vd = v.vd || 0; if (lt > vd) f *= Math.pow(2, v.vib[1] / 12 * Math.sin(6.2832 * v.vib[0] * (lt - vd)) * Math.min(1, (lt - vd) / 0.05)); }
    const inc = Math.min(0.5, f / sr);
    let s;
    switch (w) {
      case 'sin': s = Math.sin(6.2832 * ph); break;
      case 'tri': s = 1 - 4 * Math.abs(((ph + 0.25) % 1) - 0.5); break;
      case 'saw': s = 2 * ph - 1 - dspBlep(ph, inc); break;
      case 'noise': s = R() * 2 - 1; break;
      case 'pn': nph += inc; if (nph >= 1) { nph -= Math.floor(nph); nv = R() * 2 - 1; } s = nv; break;   /* nhiễu có cao độ (giữ mẫu theo f) */
      case 'brown': br = (br + 0.02 * (R() * 2 - 1)) / 1.02; s = br * 3.5; break;
      case 'pink': { const wn = R() * 2 - 1; p0 = 0.99765 * p0 + wn * 0.099046; p1 = 0.963 * p1 + wn * 0.2965164; p2 = 0.57 * p2 + wn * 1.0526913; s = (p0 + p1 + p2 + wn * 0.1848) * 0.25; break; }
      default: { s = (ph < duty ? 1 : -1) + dspBlep(ph, inc) - dspBlep((ph - duty + 1) % 1, inc); }   /* 'sq' xung có duty */
    }
    ph += inc; if (ph >= 1) ph -= 1;
    if (v.dsw) duty = Math.max(0.05, Math.min(0.95, duty + v.dsw / sr));
    if ((i & 7) === 0) {   /* quét lọc theo cả độ dài giọng (cập nhật mỗi 8 mẫu) */
      const x = Math.min(1, lt / dur);
      if (lp) fc = v.lp * Math.pow(lp2 / v.lp, x);
      if (hp) hc = v.hp * Math.pow(hp2 / v.hp, x);
      if (bp) bc = v.bp * Math.pow(bp2 / v.bp, x);
    }
    if (hp) s = hp(s, hc, hq, sr, 2);
    if (lp) s = lp(s, fc, lq, sr, 0);
    if (bp) s = bp(s, bc, bq, sr, 1);
    if (v.am) s *= 1 - v.am[1] * (0.5 + 0.5 * Math.sin(6.2832 * v.am[0] * lt));
    if (crush) { if (cc-- <= 0) { cc = crush - 1; cv = s; } s = cv; }
    out[t0 + i] += s * env * vol;
  }
}

/* render(recipe, sampleRate, seed) → { data: Float32Array, rec } */
export function dspRender(recipe, sr, seed) {
  const R = dspRng((seed || 1) * 7919 + 13);
  const rec = typeof recipe === 'function' ? recipe(R) : recipe;
  const voices = dspExpand(rec.v || [], R);
  let len = 0; for (const v of voices) len = Math.max(len, dspVoiceLen(v));
  len = Math.min(6, len + (rec.tail || 0.01));
  const N = Math.max(16, Math.ceil(len * sr)), out = new Float32Array(N);
  for (const v of voices) dspVoice(out, v, sr, R);
  const g = rec.gain ?? 1; let pk = 0;
  for (let i = 0; i < N; i++) { out[i] *= g; const m = Math.abs(out[i]); if (m > pk) pk = m; }
  if (pk > 0.92) { const k = 0.92 / pk; for (let i = 0; i < N; i++) out[i] *= k; }   /* an toàn: không bao giờ vỡ tiếng */
  const fi = Math.min(N, Math.round(sr * 0.001)), fo = Math.min(N, Math.round(sr * 0.004));
  for (let i = 0; i < fi; i++) out[i] *= i / fi;
  for (let i = 0; i < fo; i++) out[N - 1 - i] *= i / fo;
  return { data: out, rec };
}
