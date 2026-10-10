// audio/mixer.js — bộ trộn Web Audio: bus nhạc / tiếng động / môi trường, vang (reverb), vọng (delay), nén chống vỡ tiếng,
// phát tiếng động (buffer dựng từ audio/dsp.js, có cache), nhạc cụ chiptune + bộ xếp nốt (sequencer) đọc audio/songs.js, nhạc ngắn (stinger), âm nền môi trường.
// Chạy được trên AudioContext thật và OfflineAudioContext (render kiểm tra / trang nghe thử): với offline gọi M.pumpUntil(giây) trước startRendering().
import { dspRender } from './dsp.js';
import { SFX_LIB, SFX_ALIAS, DRUMS } from './sfxlib.js';
import { SONGS, TRACKS, NIGHT_DEFAULT } from './songs.js';

const MX_PC = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 };
export function mxNote(s) {   /* 'c#5' 'bb4' 'e5' → MIDI (c4 = 60) */
  const L = MX_PC[s[0]]; if (L === undefined) return null;
  let i = 1, acc = 0;
  if (s[i] === '#') { acc = 1; i++; } else if (s[i] === 'b' && s.length > 2) { acc = -1; i++; }
  const o = parseInt(s.slice(i), 10); if (isNaN(o)) return null;
  return 12 * (o + 1) + L + acc;
}
const MX_Q = [['m7b5', [0, 3, 6, 10]], ['maj7', [0, 4, 7, 11]], ['m7', [0, 3, 7, 10]], ['m6', [0, 3, 7, 9]], ['m9', [0, 3, 7, 10, 14]], ['madd9', [0, 3, 7, 14]], ['add9', [0, 4, 7, 14]],
  ['sus2', [0, 2, 7]], ['sus4', [0, 5, 7]], ['dim', [0, 3, 6]], ['aug', [0, 4, 8]], ['7', [0, 4, 7, 10]], ['6', [0, 4, 7, 9]], ['m', [0, 3, 7]], ['', [0, 4, 7]]];
export function mxChord(sym) {
  const [main, slash] = sym.split('/');
  let root = MX_PC[main[0].toLowerCase()], i = 1;
  if (main[1] === '#') { root++; i++; } else if (main[1] === 'b') { root--; i++; }
  const q = main.slice(i), hit = MX_Q.find(([k]) => k === q) || MX_Q[MX_Q.length - 1];
  let bass = null;
  if (slash) { bass = MX_PC[slash[0].toLowerCase()]; if (slash[1] === '#') bass++; else if (slash[1] === 'b') bass--; bass = (bass + 12) % 12; }
  return { root: (root + 12) % 12, tones: hit[1], bass, sym };
}
const mxVoice = (ch, center) => {   /* mỗi nốt hợp âm lấy bản gần "tâm" nhất → chuyển hợp âm mượt */
  const out = [];
  for (const off of ch.tones) { const pc = (ch.root + off) % 12; let m = center - ((center - pc) % 12 + 12) % 12; if (center - m > 6) m += 12; if (!out.includes(m)) out.push(m); }
  return out.sort((a, b) => a - b);
};
const mxBassRoot = pc => 40 + ((pc - 4 + 12) % 12);   /* E2..D#3 */
const mxTok = s => String(s).replace(/\|/g, ' ').trim().split(/\s+/).filter(Boolean);

/* dựng bản nhạc (bài gốc + biến thể) thành danh sách nốt theo ô */
export function mxSpec(id) {
  const tr = TRACKS[id] || [id], song = SONGS[tr[0]]; if (!song) return null;
  let v = tr[1]; if (v === 'night') v = song.night ? { ...NIGHT_DEFAULT, ...song.night, arp: song.night.arp !== undefined ? song.night.arp : NIGHT_DEFAULT.arp } : NIGHT_DEFAULT;
  const sp = { ...song, id };
  if (v) for (const k in v) {
    if (['lead', 'arp', 'bass', 'pad', 'drums'].includes(k)) sp[k] = v[k] === null ? null : song[k] ? { ...song[k], ...v[k] } : (v[k].ins || v[k].pat || v[k].notes) ? v[k] : null;   /* biến thể chỉ chỉnh âm lượng mà bài gốc không có bè đó → bỏ qua */
    else sp[k] = v[k];
  }
  if (tr[1] === 'night' && !('vol' in (song.night || {}))) sp.vol = NIGHT_DEFAULT.vol;
  return sp;
}
export function mxCompile(sp) {
  const spb = sp.sig[0] * sp.sig[1], stepDur = 60 / sp.bpm / sp.sig[1];
  const bars = mxTok(sp.chords).map(b => b.split(',').map(mxChord));
  const total = bars.length * spb, errs = [];
  const chordAt = s => { const b = bars[Math.floor(s / spb) % bars.length], k = Math.min(b.length - 1, Math.floor((s % spb) / (spb / b.length))); return b[k]; };
  const parts = [];
  const add = (part, ev) => { (part.ev[ev.s] ||= []).push(ev); };
  if (sp.lead) {   /* giai điệu viết tay */
    const p = { name: 'lead', ins: sp.lead.ins, vol: sp.lead.vol ?? 0.4, dly: sp.lead.dly || 0, vib: sp.lead.vib, ev: [] };
    let s = 0;
    for (const bar of String(sp.lead.notes).split('|')) {
      const b0 = s;
      for (const t of mxTok(bar)) {
        const [n, l] = t.split(':'), len = l ? parseInt(l, 10) : 1;
        if (n !== 'r') { const m = mxNote(n); if (m == null) errs.push('nốt sai: ' + t); else add(p, { s, m: [m], len }); }
        s += len;
      }
      if (s - b0 !== spb && bar.trim()) errs.push(`ô nhịp ${Math.round(b0 / spb) + 1} có ${s - b0}/${spb} ô`);
    }
    if (s !== total) errs.push(`giai điệu dài ${s} ô, hợp âm ${total} ô`);
    parts.push(p);
  }
  if (sp.arp) {   /* đệm rải theo hợp âm */
    const p = { name: 'arp', ins: sp.arp.ins, vol: sp.arp.vol ?? 0.2, ev: [] }, pat = mxTok(sp.arp.pat || '1 2 3 2'), c = sp.arp.center || 60;
    let last = null;
    for (let s = 0; s < total; s++) {
      const tk = pat[s % pat.length];
      if (tk === '-') { if (last) last.len++; continue; }
      if (tk === '.') { last = null; continue; }
      const vc = mxVoice(chordAt(s), c);
      let m;
      if (tk === 'c') m = vc; else { const d = parseInt(tk, 10) - 1; if (isNaN(d)) continue; m = [vc[d % vc.length] + 12 * Math.floor(d / vc.length)]; }
      last = { s, m, len: 1 }; add(p, last);
    }
    parts.push(p);
  }
  if (sp.pad) {   /* hợp âm ngân dài */
    const p = { name: 'pad', ins: sp.pad.ins || 'pad', vol: sp.pad.vol ?? 0.12, ev: [] }, c = sp.pad.center || 60;
    for (let b = 0; b < bars.length; b++) { const seg = spb / bars[b].length; bars[b].forEach((ch, k) => add(p, { s: b * spb + k * seg, m: mxVoice(ch, c), len: seg })); }
    parts.push(p);
  }
  if (sp.bass) {   /* bè trầm */
    const p = { name: 'bass', ins: sp.bass.ins || 'bass', vol: sp.bass.vol ?? 0.45, ev: [] };
    const pat = mxTok(sp.bass.pat || 'R - - - 5 - - -'), fill = sp.bass.fill ? mxTok(sp.bass.fill) : null;
    let last = null;
    for (let s = 0; s < total; s++) {
      const bar = Math.floor(s / spb), useFill = fill && (bar % 8 === 7 || bar === bars.length - 1);
      const tk = (useFill ? fill : pat)[(useFill ? s % spb : s) % (useFill ? fill.length : pat.length)];
      if (tk === '-') { if (last) last.len++; continue; }
      if (tk === '.') { last = null; continue; }
      const ch = chordAt(s), r = mxBassRoot(ch.bass != null ? ch.bass : ch.root);
      const third = ch.tones.includes(3) ? 3 : 4, fifth = ch.tones.includes(6) ? 6 : ch.tones.includes(8) ? 8 : 7, sev = ch.tones.includes(11) ? 11 : 10;
      const m = tk === 'R' ? r : tk === '3' ? r + third : tk === '5' ? r + fifth : tk === '7' ? r + sev : tk === '8' ? r + 12 : null;
      if (m == null) continue;
      last = { s, m: [m], len: 1 }; add(p, last);
    }
    parts.push(p);
  }
  if (sp.drums) {
    const p = { name: 'drums', ins: 'drum', vol: sp.drums.vol ?? 0.35, ev: [] };
    const pats = (Array.isArray(sp.drums.pat) ? sp.drums.pat : [sp.drums.pat]).map(mxTok), fill = sp.drums.fill ? mxTok(sp.drums.fill) : null;
    for (let s = 0; s < total; s++) {
      const bar = Math.floor(s / spb), useFill = fill && (bar % 8 === 7 || bar === bars.length - 1) && bars.length > 1;
      const pt = useFill ? fill : pats[bar % pats.length], tk = pt[(s % spb) % pt.length];
      if (tk && tk !== '.' && tk !== '-') add(p, { s, d: tk, len: 1 });
    }
    parts.push(p);
  }
  return { id: sp.id, name: sp.name, spb, stepDur, total, bars: bars.length, parts, swing: sp.swing || 0, vol: sp.vol ?? 1, lp: sp.lp || 0, stinger: !!sp.stinger, errs };
}

export function createMixer(ac, opt = {}) {
  const sr = ac.sampleRate, out = opt.out || ac.destination;
  const G = (v, dst) => { const g = ac.createGain(); g.gain.value = v; if (dst) g.connect(dst); return g; };
  const BQ = (type, f, q, dst) => { const b = ac.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q ?? 0.707; if (dst) b.connect(dst); return b; };
  const lim = ac.createDynamicsCompressor();
  lim.threshold.value = -9; lim.knee.value = 6; lim.ratio.value = 8; lim.attack.value = 0.003; lim.release.value = 0.2; lim.connect(out);
  const master = G(0.9, lim);
  const an = ac.createAnalyser(); an.fftSize = 2048; lim.connect(an);   /* đo mức ra (móc test: có tiếng thật hay không) */
  const musicVol = G(1, master), sfxVol = G(1, master), ambVol = G(1, master);
  const musicLP = BQ('lowpass', 20000, 0.5, musicVol);
  const duck = G(1, musicLP), musicIn = G(1, duck), stingIn = G(1, musicLP);
  /* vọng (delay) cho giai điệu */
  const dly = ac.createDelay(2); dly.delayTime.value = 0.375;
  const dlyIn = G(1, dly), dlyLP = BQ('lowpass', 2200, 0.5), fb = G(0.3, dly); dly.connect(dlyLP); dlyLP.connect(fb); dlyLP.connect(G(0.45, duck));
  const setTimeoutSafe = (f, ms) => { if (typeof setTimeout !== 'undefined' && !opt.offline) setTimeout(f, ms); };
  /* vang: đáp ứng xung tự dựng (nhiễu tắt dần, 2 kênh) */
  const conv = ac.createConvolver();
  { const n = Math.round(sr * 2.2), b = ac.createBuffer(2, n, sr);
    for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); let lp = 0; for (let i = 0; i < n; i++) { const t = i / sr, w = Math.random() * 2 - 1; lp += (w - lp) * (0.35 - 0.25 * Math.min(1, t / 2.2)); d[i] = t < 0.008 ? 0 : lp * Math.pow(1 - t / 2.2, 2.4) * 0.9; } }
    conv.buffer = b; }
  const revOut = G(0.85, master); conv.connect(revOut);
  const revMusic = G(0.16, conv); musicVol.connect(revMusic);
  const revSfx = G(1, conv);
  const M = { ac, sr, master, musicVol, sfxVol, ambVol, duck, musicLP, musicIn, stingIn, revSfx, active: [], stings: [], log: null };
  M.level = () => { const d = new Float32Array(an.fftSize); an.getFloatTimeDomainData(d); let s = 0, pk = 0; for (const v of d) { s += v * v; pk = Math.max(pk, Math.abs(v)); } return { rms: +Math.sqrt(s / d.length).toFixed(4), peak: +pk.toFixed(3) }; };

  /* ---------------- mức âm lượng ---------------- */
  M.setLevels = (o, now) => {
    const t = now ?? ac.currentTime;
    if (o.instant) { if (o.music != null) musicVol.gain.value = o.music; if (o.sfx != null) { sfxVol.gain.value = o.sfx; revSfx.gain.value = o.sfx; } if (o.amb != null) ambVol.gain.value = o.amb; return; }   /* render offline: đặt ngay */
    if (o.music != null) musicVol.gain.setTargetAtTime(o.music, t, 0.08);
    if (o.sfx != null) { sfxVol.gain.setTargetAtTime(o.sfx, t, 0.05); revSfx.gain.setTargetAtTime(o.sfx, t, 0.05); }
    if (o.amb != null) ambVol.gain.setTargetAtTime(o.amb, t, 0.3);
  };
  let duckDlg = 1, duckSting = 1;
  const applyDuck = () => duck.gain.setTargetAtTime(Math.min(duckDlg, duckSting), ac.currentTime, 0.12);
  M.duckDialog = on => { const v = on ? 0.5 : 1; if (v !== duckDlg) { duckDlg = v; applyDuck(); } };
  let muffled = false;
  M.muffle = on => { if (on === muffled) return; muffled = on; musicLP.frequency.setTargetAtTime(on ? 1300 : 20000, ac.currentTime, on ? 0.12 : 0.3); };

  /* ---------------- tiếng động ---------------- */
  const cache = new Map();
  const toBuf = data => { const b = ac.createBuffer(1, data.length, sr); b.getChannelData(0).set(data); return b; };
  M.has = name => !!SFX_LIB[SFX_ALIAS[name] || name];
  M.buffer = (name, k) => {
    name = SFX_ALIAS[name] || name; const e = SFX_LIB[name]; if (!e) return null;
    let c = cache.get(name);
    if (!c) { const r = dspRender(e[2], sr, 1); c = { rec: r.rec, list: [toBuf(r.data)] }; cache.set(name, c); }
    const n = Math.max(1, c.rec.seeds || 1), i = (k == null ? Math.floor(Math.random() * n) : k) % n;
    if (!c.list[i]) c.list[i] = toBuf(dspRender(e[2], sr, i + 1).data);
    return { buf: c.list[i], rec: c.rec };
  };
  M.warm = names => { for (const n of names) M.buffer(n, 0); };
  M.sfx = (name, o = {}) => {
    const b = M.buffer(name, o.seed); if (!b) return false;
    const src = ac.createBufferSource(); src.buffer = b.buf;
    const vary = o.vary ?? b.rec.vary ?? 0;
    src.playbackRate.value = Math.max(0.25, (o.rate || 1) * (1 + (Math.random() * 2 - 1) * vary));
    const g = G((o.vol ?? 1) * (b.rec.vol ?? 1)); src.connect(g);
    let tail = g;
    if (o.pan && ac.createStereoPanner) { const p = ac.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, o.pan)); g.connect(p); tail = p; }
    tail.connect(o.bus === 'amb' ? ambVol : sfxVol);
    const rv = (o.rev ?? b.rec.rev ?? 0) * (o.bus === 'amb' ? 0.6 : 1);
    if (rv > 0) tail.connect(G(rv, o.bus === 'amb' ? conv : revSfx));
    src.start(o.when ?? ac.currentTime);
    src.onended = () => { try { tail.disconnect(); g.disconnect(); } catch (e) { } };
    return true;
  };

  /* ---------------- giọng nói hội thoại (blip) ---------------- */
  const waves = {};
  const pulse = duty => waves[duty] || (waves[duty] = (() => { const n = 40, re = new Float32Array(n), im = new Float32Array(n); for (let k = 1; k < n; k++) re[k] = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * duty); return ac.createPeriodicWave(re, im); })());
  M.blip = (freq, o = {}) => {
    const t = o.when ?? ac.currentTime, osc = ac.createOscillator(), g = G(0), lp = BQ('lowpass', 2600, 0.7);
    if (freq < 300) osc.type = 'triangle'; else osc.setPeriodicWave(pulse(freq > 520 ? 0.125 : 0.25));
    osc.frequency.setValueAtTime(freq * 1.03, t); osc.frequency.exponentialRampToValueAtTime(freq * 0.97, t + 0.045);
    const pk = (o.vol ?? 1) * (freq < 300 ? 0.16 : 0.075);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(pk, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0008, t + 0.055);
    osc.connect(lp); lp.connect(g); g.connect(sfxVol); osc.start(t); osc.stop(t + 0.07);
    osc.onended = () => { try { g.disconnect(); } catch (e) { } };
  };

  /* ---------------- nhạc cụ ---------------- */
  const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
  let noiseBuf = null;
  const noise = () => noiseBuf || (noiseBuf = (() => { const b = ac.createBuffer(1, sr, sr), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; return b; })());
  const env = (g, t, a, pk, dec, sus, end, rel) => {
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(pk, t + a);
    if (sus < 1) g.gain.setTargetAtTime(pk * sus, t + a, dec);
    g.gain.setTargetAtTime(0, Math.max(t + a, end), rel);
  };
  const osc = (type, f, t) => { const o = ac.createOscillator(); if (typeof type === 'number') o.setPeriodicWave(pulse(type)); else o.type = type; o.frequency.setValueAtTime(f, t); o.start(t); return o; };
  const vibr = (o, t, delay, rate, cents) => { const l = ac.createOscillator(), lg = G(0); l.frequency.value = rate; lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(cents, t + delay + 0.15); l.connect(lg); lg.connect(o.detune); l.start(t); return l; };
  const finish = (nodes, gain, stopAt) => { for (const n of nodes) n.stop(stopAt); nodes[0].onended = () => { try { gain.disconnect(); } catch (e) { } }; };
  const INS = {
    lead(d, m, t, dur, v, p) { const f = mtof(m), o = osc(0.25, f, t), lp = BQ('lowpass', 2300, 0.6), g = G(0); o.connect(lp); lp.connect(g); g.connect(d); if (p.dly) g.connect(G(p.dly, dlyIn));
      env(g, t, 0.008, v * 0.42, 0.12, 0.7, t + dur, 0.06); const n = [o]; if (dur > 0.28) n.push(vibr(o, t, 0.18, 5.2, 14)); finish(n, g, t + dur + 0.5); },
    lead50(d, m, t, dur, v, p) { const o = osc('square', mtof(m), t), lp = BQ('lowpass', 1500, 0.6), g = G(0); o.connect(lp); lp.connect(g); g.connect(d); if (p.dly) g.connect(G(p.dly, dlyIn));
      env(g, t, 0.01, v * 0.28, 0.15, 0.75, t + dur, 0.07); const n = [o]; if (dur > 0.3) n.push(vibr(o, t, 0.2, 5, 12)); finish(n, g, t + dur + 0.5); },
    bell(d, m, t, dur, v, p) { const f = mtof(m), g = G(0), a = osc('sine', f, t), b = osc('sine', f * 2, t), c = osc('sine', f * 3.01, t), gb = G(0.22), gc = G(0.07);
      a.connect(g); b.connect(gb); gb.connect(g); c.connect(gc); gc.connect(g); g.connect(d); if (p.dly) g.connect(G(p.dly, dlyIn));
      const tau = Math.min(0.7, 0.16 + dur * 0.35); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v * 0.55, t + 0.004); g.gain.setTargetAtTime(0, t + 0.004, tau);
      gc.gain.setTargetAtTime(0, t, 0.08); finish([a, b, c], g, t + tau * 7); },
    mallet(d, m, t, dur, v) { const f = mtof(m), g = G(0), a = osc('triangle', f, t), b = osc('sine', f * 4, t), gb = G(0.3);
      a.connect(g); b.connect(gb); gb.connect(g); g.connect(d); gb.gain.setTargetAtTime(0, t, 0.025);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v * 0.7, t + 0.003); g.gain.setTargetAtTime(0, t + 0.003, Math.min(0.3, 0.12 + dur * 0.15)); finish([a, b], g, t + 1.6); },
    harp(d, m, t, dur, v) { const o = osc('triangle', mtof(m), t), g = G(0); o.connect(g); g.connect(d);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v * 0.45, t + 0.004); g.gain.setTargetAtTime(0, t + 0.004, 0.32); finish([o], g, t + 2.2); },
    pluck(d, m, t, dur, v, p) { const o = osc(0.25, mtof(m), t), lp = BQ('lowpass', 3600, 1), g = G(0); o.connect(lp); lp.connect(g); g.connect(d);
      lp.frequency.setValueAtTime(3600, t); lp.frequency.setTargetAtTime(800, t, 0.09);
      if (p.vib && dur > 0.25) { o.frequency.setValueAtTime(mtof(m) * 0.985, t); o.frequency.linearRampToValueAtTime(mtof(m), t + 0.05); }
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v * 0.5, t + 0.003); g.gain.setTargetAtTime(0, t + 0.003, Math.min(0.28, 0.1 + dur * 0.2)); finish([o], g, t + 1.8); },
    harpsi(d, m, t, dur, v) { const o = osc(0.125, mtof(m), t), lp = BQ('lowpass', 4200, 0.7), g = G(0); o.connect(lp); lp.connect(g); g.connect(d);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v * 0.5, t + 0.002); g.gain.setTargetAtTime(0, t + 0.002, 0.1); finish([o], g, t + 0.8); },
    digi(d, m, t, dur, v) { const o = osc(0.125, mtof(m), t), lp = BQ('lowpass', 3000, 0.8), g = G(0); o.connect(lp); lp.connect(g); g.connect(d); g.connect(G(0.18, dlyIn));
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v * 0.5, t + 0.002); g.gain.setTargetAtTime(0, t + 0.002, 0.055); finish([o], g, t + 0.5); },
    flute(d, m, t, dur, v, p) { const f = mtof(m), o = osc('triangle', f, t), lp = BQ('lowpass', 3000, 0.6), g = G(0); o.connect(lp); lp.connect(g); g.connect(d); if (p.dly) g.connect(G(p.dly, dlyIn));
      env(g, t, 0.045, v * 0.45, 0.2, 0.85, t + dur, 0.09); const n = [o];
      if (dur > 0.25) n.push(vibr(o, t, 0.12, 5, 18));
      const nz = ac.createBufferSource(); nz.buffer = noise(); const bp = BQ('bandpass', 1800, 1.2), ng = G(0); nz.connect(bp); bp.connect(ng); ng.connect(d);
      ng.gain.setValueAtTime(0, t); ng.gain.linearRampToValueAtTime(v * 0.06, t + 0.02); ng.gain.setTargetAtTime(0, t + 0.02, 0.05); nz.start(t); nz.stop(t + 0.3);
      finish(n, g, t + dur + 0.6); },
    brass(d, m, t, dur, v, p) { const o = osc('sawtooth', mtof(m), t), lp = BQ('lowpass', 500, 1.1), g = G(0); o.connect(lp); lp.connect(g); g.connect(d); if (p.dly) g.connect(G(p.dly, dlyIn));
      lp.frequency.setValueAtTime(500, t); lp.frequency.linearRampToValueAtTime(2000, t + 0.06); lp.frequency.setTargetAtTime(1100, t + 0.06, 0.25);
      env(g, t, 0.03, v * 0.36, 0.2, 0.8, t + dur, 0.08); const n = [o]; if (dur > 0.35) n.push(vibr(o, t, 0.25, 5, 10)); finish(n, g, t + dur + 0.6); },
    pad(d, ms, t, dur, v) { const g = G(0), lp = BQ('lowpass', 900, 0.7); lp.connect(g); g.connect(d); const n = [];
      for (const m of ms) for (const dt of [-8, 8]) { const o = osc('sawtooth', mtof(m), t); o.detune.value = dt; o.connect(lp); n.push(o); }
      const k = v * 0.22 / Math.sqrt(ms.length); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(k, t + Math.min(0.5, dur * 0.4)); g.gain.setTargetAtTime(0, t + dur, 0.35);
      finish(n, g, t + dur + 2.2); },
    bass(d, m, t, dur, v) { const o = osc('triangle', mtof(m), t), g = G(0); o.connect(g); g.connect(d); env(g, t, 0.006, v * 0.4, 0.2, 0.85, t + dur * 0.95, 0.04); finish([o], g, t + dur + 0.3); },
    pbass(d, m, t, dur, v) { const o = osc('square', mtof(m), t), lp = BQ('lowpass', 650, 0.8), g = G(0); o.connect(lp); lp.connect(g); g.connect(d); env(g, t, 0.006, v * 0.32, 0.15, 0.7, t + dur * 0.9, 0.04); finish([o], g, t + dur + 0.3); },
    sub(d, m, t, dur, v) { const f = mtof(m), a = osc('sine', f, t), b = osc('triangle', f * 2, t), gb = G(0.18), g = G(0); a.connect(g); b.connect(gb); gb.connect(g); g.connect(d);
      env(g, t, 0.08, v * 0.45, 0.3, 0.9, t + dur, 0.3); finish([a, b], g, t + dur + 2); },
  };
  const drumBufs = {};
  const drum = (ch, t, v, d) => {
    let k = ch, acc = 1; if (!DRUMS[k] && DRUMS[k.toLowerCase()]) { k = k.toLowerCase(); acc = 1.4; }
    const r = DRUMS[k]; if (!r) return;
    const b = drumBufs[k] || (drumBufs[k] = toBuf(dspRender(r, sr, 3).data));
    const s = ac.createBufferSource(); s.buffer = b; const g = G(v * acc); s.connect(g); g.connect(d); s.start(t); s.onended = () => { try { g.disconnect(); } catch (e) { } };
  };

  /* ---------------- bộ xếp nốt ---------------- */
  function Track(id) {
    const sp = mxSpec(id); if (!sp) return null;
    const C = mxCompile(sp), tr = { id, C, step: 0, t0: 0, done: false, stopAt: Infinity };
    tr.g = G(0); let head = tr.g;
    if (C.lp) { const f = BQ('lowpass', C.lp, 0.5); tr.g.connect(f); head = f; }
    head.connect(C.stinger ? stingIn : musicIn);
    tr.timeOf = s => tr.t0 + s * C.stepDur + (C.swing && (s & 1) ? C.swing * C.stepDur : 0);
    tr.pump = until => {
      while (!tr.done) {
        const t = tr.timeOf(tr.step); if (t >= until) break;
        if (t >= tr.stopAt) { tr.done = true; break; }
        if (C.stinger && tr.step >= C.total) { tr.done = true; tr.endT = t; break; }
        const ls = tr.step % C.total;
        for (const p of C.parts) {
          const evs = p.ev[ls]; if (!evs) continue;
          for (const e of evs) {
            const dur = e.len * C.stepDur;
            try {
              if (p.ins === 'drum') drum(e.d, t, p.vol, tr.g);
              else if (p.ins === 'pad') INS.pad(tr.g, e.m, t, dur, p.vol);
              else for (const m of e.m) (INS[p.ins] || INS.lead)(tr.g, m, t, dur * 0.96, p.vol, p);
            } catch (er) { }
          }
        }
        tr.step++;
      }
    };
    return tr;
  }
  let cur = null;
  M.current = () => (cur ? cur.id : null);
  M.compile = id => { const sp = mxSpec(id); return sp ? mxCompile(sp) : null; };
  M.playTrack = (id, o = {}) => {
    if (cur && cur.id === id && !cur.done) return cur;
    const tr = Track(id); if (!tr) return null;
    const now = o.at ?? ac.currentTime, fade = o.fade ?? 1.0;
    if (o.align && cur && Math.abs(cur.C.stepDur - tr.C.stepDur) < 1e-6 && cur.C.total === tr.C.total) { tr.t0 = cur.t0; tr.step = cur.step; }
    else { tr.t0 = now + 0.06; tr.step = 0; }
    tr.g.gain.setValueAtTime(0, now); tr.g.gain.linearRampToValueAtTime(tr.C.vol, now + Math.max(0.05, fade));
    if (cur) { const old = cur; old.g.gain.cancelScheduledValues(now); old.g.gain.setValueAtTime(old.g.gain.value, now); old.g.gain.linearRampToValueAtTime(0, now + Math.max(0.05, fade)); old.stopAt = now + fade + 0.05; setTimeoutSafe(() => { try { old.g.disconnect(); } catch (e) { } }, (fade + 3) * 1000); }
    cur = tr; M.active.push(tr);
    const ds = tr.C.spb === 6 ? 2 * tr.C.stepDur : 3 * tr.C.stepDur;   /* vọng = móc đơn chấm */
    dly.delayTime.setTargetAtTime(Math.min(1.5, ds), now, 0.05);
    return tr;
  };
  M.stopMusic = (fade = 1) => { if (!cur) return; const now = ac.currentTime, old = cur; old.g.gain.cancelScheduledValues(now); old.g.gain.setValueAtTime(old.g.gain.value, now); old.g.gain.linearRampToValueAtTime(0, now + fade); old.stopAt = now + fade; cur = null; };
  M.stinger = (id, o = {}) => {
    const tr = Track(id); if (!tr) return null;
    const now = o.at ?? ac.currentTime; tr.t0 = now + 0.05; tr.g.gain.value = tr.C.vol; M.stings.push(tr);
    duckSting = 0.28; duck.gain.cancelScheduledValues(now); duck.gain.setTargetAtTime(Math.min(duckDlg, duckSting), now, 0.05);
    tr.len = tr.C.total * tr.C.stepDur; tr.releaseAt = now + 0.05 + tr.len + 0.4;
    setTimeoutSafe(() => { try { tr.g.disconnect(); } catch (e) { } }, (tr.len + 4) * 1000);
    return tr;
  };
  M.pumpUntil = t => {   /* xếp nốt tới thời điểm t (giây của ac) */
    for (const tr of M.active) tr.pump(t);
    for (const tr of M.stings) tr.pump(t);
  };
  M.tick = () => {
    const now = ac.currentTime, ahead = now + (opt.ahead || 0.22);
    for (const tr of M.active) {
      if (!tr.done && tr.timeOf(tr.step) < now - 0.08) { tr.step = Math.ceil((now + 0.03 - tr.t0) / tr.C.stepDur); }   /* bị trễ (tab ẩn / máy giật) → nhảy tới, không dồn nốt */
      tr.pump(ahead);
    }
    M.active = M.active.filter(tr => !tr.done && tr.stopAt > now - 0.1);
    for (const tr of M.stings) tr.pump(ahead);
    if (M.stings.length) {
      const live = M.stings.filter(s => now < s.releaseAt);
      if (live.length !== M.stings.length) { M.stings = live; if (!live.length) { duckSting = 1; duck.gain.setTargetAtTime(Math.min(duckDlg, 1), now, 0.5); } }
    }
    ambTick(now);
  };

  /* ---------------- âm nền môi trường ---------------- */
  const nbufs = {};
  const nbuf = type => nbufs[type] || (nbufs[type] = (() => {
    const n = Math.round(sr * 3), b = ac.createBuffer(1, n, sr), d = b.getChannelData(0); let br = 0, p0 = 0, p1 = 0, p2 = 0, pk = 0;
    for (let i = 0; i < n; i++) { const w = Math.random() * 2 - 1; let s = w;
      if (type === 'brown') { br = (br + 0.02 * w) / 1.02; s = br * 3.5; } else if (type === 'pink') { p0 = 0.99765 * p0 + w * 0.099046; p1 = 0.963 * p1 + w * 0.2965164; p2 = 0.57 * p2 + w * 1.0526913; s = (p0 + p1 + p2 + w * 0.1848) * 0.25; }
      d[i] = s; pk = Math.max(pk, Math.abs(s)); }
    const fade = Math.round(sr * 0.05); for (let i = 0; i < fade; i++) { const k = i / fade; d[n - fade + i] = d[n - fade + i] * (1 - k) + d[i] * k; }   /* nối vòng không lộ */
    for (let i = 0; i < n; i++) d[i] /= pk || 1; return b; })());
  const AMB = {
    waves: { g: 0.06, L: [{ n: 'pink', f: 'lowpass', fr: [380, 900], q: 0.5, amp: [0.35, 1], per: [5, 9] }, { n: 'white', f: 'bandpass', fr: [1600, 3200], q: 0.6, amp: [0, 0.22], per: [6, 11] }] },
    shore: { g: 0.035, L: [{ n: 'pink', f: 'lowpass', fr: [350, 800], q: 0.5, amp: [0.3, 1], per: [6, 10] }] },
    wind: { g: 0.045, L: [{ n: 'white', f: 'bandpass', fr: [260, 1100], q: [0.8, 3], amp: [0.15, 1], per: [3, 8] }, { n: 'pink', f: 'lowpass', fr: [200, 400], q: 0.5, amp: [0.2, 0.6], per: [7, 12] }] },
    breeze: { g: 0.02, L: [{ n: 'white', f: 'bandpass', fr: [300, 900], q: [0.7, 2], amp: [0.1, 1], per: [4, 9] }] },
    lava: { g: 0.07, L: [{ n: 'brown', f: 'lowpass', fr: [80, 150], q: 0.6, amp: [0.5, 1], per: [4, 9] }], ev: { s: 'lava_bloop', every: [4, 11], vol: 0.45 } },
    under: { g: 0.05, L: [{ n: 'brown', f: 'lowpass', fr: [160, 320], q: 0.5, amp: [0.6, 1], per: [6, 12] }], ev: { s: 'bubbles', every: [3, 9], vol: 0.3 } },
    deep: { g: 0.06, L: [{ n: 'brown', f: 'lowpass', fr: [70, 150], q: 0.5, amp: [0.6, 1], per: [7, 13] }], ev: { s: 'bubbles', every: [5, 13], vol: 0.25 } },
    drips: { g: 0.0, L: [], ev: { s: 'drip', every: [2.5, 8], vol: 0.55 } },
  };
  M.AMB = AMB;
  let amb = null;
  const rnd = (r) => Array.isArray(r) ? r[0] + Math.random() * (r[1] - r[0]) : r;
  M.ambience = (id, fade = 2) => {
    const now = ac.currentTime;
    if (amb && amb.id === id) return;
    if (amb) { const o = amb; o.g.gain.cancelScheduledValues(now); o.g.gain.setValueAtTime(o.g.gain.value, now); o.g.gain.linearRampToValueAtTime(0, now + 1.5); for (const l of o.layers) try { l.src.stop(now + 1.6); } catch (e) { } amb = null; }
    const def = AMB[id]; if (!def) return;
    const a = { id, def, g: G(0, ambVol), layers: [], nextEv: now + rnd(def.ev ? def.ev.every : 5) };
    a.g.gain.setValueAtTime(0, now); a.g.gain.linearRampToValueAtTime(def.g, now + fade);
    for (const L of def.L) {
      const src = ac.createBufferSource(); src.buffer = nbuf(L.n); src.loop = true; src.loopStart = 0; src.loopEnd = src.buffer.duration - 0.05; src.playbackRate.value = 0.9 + Math.random() * 0.2;
      const f = BQ(L.f, rnd(L.fr), rnd(L.q)), lg = G(rnd(L.amp)); src.connect(f); f.connect(lg); lg.connect(a.g); src.start(now, Math.random() * 2);
      a.layers.push({ L, src, f, lg, next: now + rnd(L.per) * Math.random() });
    }
    amb = a;
  };
  M.ambId = () => (amb ? amb.id : null);
  function ambTick(now) {
    if (!amb) return;
    for (const l of amb.layers) if (now >= l.next) { const per = rnd(l.L.per); l.next = now + per; l.f.frequency.setTargetAtTime(rnd(l.L.fr), now, per / 3); if (Array.isArray(l.L.q)) l.f.Q.setTargetAtTime(rnd(l.L.q), now, per / 3); l.lg.gain.setTargetAtTime(rnd(l.L.amp), now, per / 3); }
    const ev = amb.def.ev;
    if (ev && now >= amb.nextEv) { amb.nextEv = now + rnd(ev.every); M.sfx(ev.s, { vol: ev.vol, bus: 'amb', pan: (Math.random() * 2 - 1) * 0.6 }); }
  }
  return M;
}
