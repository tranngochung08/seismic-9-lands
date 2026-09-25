// audio.js — tiny procedural chiptune: one looping pattern per land, tempo rises with magnitude
import { rngFrom, hashStr } from './gfx.js';

let ctx = null, master = null, timer = null, cur = null, step = 0, enabled = true;
let vol = 0.5; try { const v = parseFloat(localStorage.getItem('seismic.vol')); if (!isNaN(v)) vol = Math.max(0, Math.min(1, v)); } catch (e) { }   /* plan-13: âm lượng 0–1, 0.5 = mức cũ */
const GAIN = () => 0.14 * vol;
export function getVolume() { return vol; }
export function setVolume(v) { vol = Math.max(0, Math.min(1, v)); try { localStorage.setItem('seismic.vol', String(vol)); } catch (e) { } if (master && ctx) master.gain.setTargetAtTime(enabled ? GAIN() : 0, ctx.currentTime, 0.05); }
const SCALE = [0, 2, 4, 7, 9, 12, 14, 16]; // major pentatonic, two octaves

export function initAudio() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
  ctx = new AC(); master = ctx.createGain(); master.gain.value = enabled ? GAIN() : 0; master.connect(ctx.destination);
  if (cur) start();
}
export function setEnabled(on) { enabled = on; if (master) master.gain.setTargetAtTime(on ? GAIN() : 0, ctx.currentTime, 0.05); }
export function isEnabled() { return enabled; }
export function setZone(zone) {
  const rng = rngFrom(hashStr('music:' + zone.id));
  const root = 110 * Math.pow(2, (zone.order % 7) / 12) * (zone.lv >= 7 ? 0.5 : 1);
  const lead = [], bass = [];
  for (let i = 0; i < 32; i++) { lead.push(rng() < 0.7 ? SCALE[(rng() * SCALE.length) | 0] : null); bass.push(i % 8 === 0 ? 0 : i % 8 === 4 ? (rng() < .5 ? 7 : 5) : null); }
  cur = { root, lead, bass, bpm: 84 + zone.tremor * 70, dark: zone.lv >= 6, hat: zone.lv >= 3 };
  step = 0; if (ctx) start();
}
function start() {
  clearInterval(timer);
  const period = 60000 / cur.bpm / 4;
  timer = setInterval(tick, period);
}
function note(freq, dur, type, gain, when = 0) {
  const o = ctx.createOscillator(), gn = ctx.createGain(); o.type = type; o.frequency.value = freq;
  const t = ctx.currentTime + when; gn.gain.setValueAtTime(gain, t); gn.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(gn); gn.connect(master); o.start(t); o.stop(t + dur + 0.02);
}
function hat(when = 0) {
  const b = ctx.createBuffer(1, 1200, ctx.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
  const s = ctx.createBufferSource(), gn = ctx.createGain(); s.buffer = b; gn.gain.value = 0.25; s.connect(gn); gn.connect(master); s.start(ctx.currentTime + when);
}
// one-shot sound effects for systems: ctx.sfx('hit' | 'pickup' | 'craft' | 'build' | 'squeak' | 'roar' | 'splash' | 'chop' | 'coin' | 'alarm')
const SFX = {
  hit: [[180, 0.08, 'square', .5], [90, 0.12, 'triangle', .4]], chop: [[140, 0.06, 'square', .5], [70, 0.1, 'triangle', .3]], pickup: [[660, 0.06, 'square', .3], [990, 0.08, 'square', .3]],
  coin: [[880, 0.05, 'square', .3], [1320, 0.1, 'square', .3]], craft: [[440, 0.08, 'triangle', .4], [550, 0.08, 'triangle', .4], [660, 0.12, 'triangle', .4]], build: [[220, 0.1, 'square', .4], [220, 0.1, 'square', .4, 0.15]],
  squeak: [[1400, 0.05, 'sawtooth', .2], [1800, 0.05, 'sawtooth', .2, 0.06]], roar: [[70, 0.5, 'sawtooth', .6], [55, 0.6, 'sawtooth', .5, 0.1]], splash: [[300, 0.15, 'triangle', .3], [200, 0.2, 'triangle', .2, 0.05]],
  alarm: [[520, 0.12, 'square', .35], [390, 0.12, 'square', .35, 0.15], [520, 0.12, 'square', .35, 0.3]], fail: [[300, 0.12, 'sawtooth', .3], [200, 0.2, 'sawtooth', .3, 0.12]], win: [[523, 0.1, 'square', .3], [659, 0.1, 'square', .3, 0.1], [784, 0.2, 'square', .35, 0.2]]
};
export function blip(freq = 500) { if (!ctx || !enabled || ctx.state !== 'running') return; note(freq, 0.035, 'square', 0.16); }   /* plan-12: tiếng chữ chạy */
export function sfx(name) { if (!ctx || !enabled || ctx.state !== 'running') return; for (const [f, d, type, g, when = 0] of SFX[name] || SFX.hit) note(f, d, type, g, when); }
function tick() {
  if (!ctx || !cur || ctx.state !== 'running') return;
  const i = step % 32, r = cur.root;
  const l = cur.lead[i]; if (l !== null) note(r * 2 * Math.pow(2, (l + (cur.dark ? -3 : 0)) / 12), 0.18, cur.dark ? 'sawtooth' : 'square', 0.35);
  const b = cur.bass[i]; if (b !== null) note(r * Math.pow(2, b / 12), 0.4, 'triangle', 0.6);
  if (cur.hat && i % 2 === 1) hat();
  step++;
}
