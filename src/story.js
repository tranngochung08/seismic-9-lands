// story.js — the "Friend at Sea" storyline shared by the core and the story systems (see systems/API.md, "Story").
// Lyron (founder of Seismic) pulls you onto his raft in the prologue, the Kraken takes him near the pier,
// you gather three things across the lands (M3/M6/M9) and dive into the Kraken Trench to bring him back.
import { charSheet } from './gfx.js';
import { ART } from './art.js';

// The friend: not a roster member — a fixed character with a real photo as his dialog avatar.
export const FRIEND = {
  id: 'lyron', n: 'Lyron', k: 'Lyron Co Ting Keh', lv: -1, ro: ['Founder'], p: 0, i: 0, r: 0, f: '2025-03', l: '2026-09', a: 'data/lyron.jpg',
  friend: true, art: ['data/lyron.jpg'],                                                     // NPC.m.friend === true → the core skips the "met artist" bookkeeping
  outfit: { skin: '#f6d3b5', hair: '#1f1f1f', shirt: '#3b2a22', pants: '#2f2a33' },   // black tousled hair, dark brown jacket
  scarf: '#ff1f4b',                                                 // the red Seismic scarf — floats back up when the raft goes down (the keepsake)
  title: { en: 'Founder of Seismic', vi: 'Nhà sáng lập Seismic' }
};
let sheet = null;
export function friendSheet() { return sheet || (sheet = charSheet(FRIEND.outfit)); }
// draw the scarf over a 16×20 character frame whose top-left is (x, y) — call after drawing the sheet frame
export function drawScarf(g, x, y, dir = 0, t = 0) {
  if (ART.on && ART.fixed && ART.fixed.lyron && ART.fixed.lyron.scarf) return;   /* 2026-09-28: sheet PixelLab của Lyron đã vẽ sẵn khăn đỏ */
  g.fillStyle = FRIEND.scarf; g.fillRect(x + 4, y + 10, 8, 2);
  const tail = Math.round(Math.sin(t * 4) * 1.5);
  if (dir === 1) g.fillRect(x + 11, y + 11 + tail, 3, 1); else if (dir === 2) g.fillRect(x + 2, y + 11 + tail, 3, 1); else if (dir === 0) g.fillRect(x + 10, y + 12, 2, 3 + tail);
}

// Acts: 1 prologue at sea (with Lyron) · 2 gather the three things · 3 all three in hand — dive at the pier · 4 Lyron rescued.
export const ITEMS3 = ['divebell', 'trenchmap', 'greatcrystal'];
export function defaultStory() { return { act: 1, step: 0, items: { divebell: false, trenchmap: false, greatcrystal: false }, rescued: false, attempts: 0, flashback: false, seaDone: false, keepsake: false }; }
export function normalizeStory(sv) {
  const d = defaultStory(), s = (sv.story = { ...d, ...(sv.story || {}) }); s.items = { ...d.items, ...(s.items || {}) };
  // an old save (already ashore, never played the prologue with Lyron): skip to act 2 and let the Old Seismologist tell the tale
  if (s.act === 1 && sv.zone && sv.zone !== 'sea') { s.act = 2; s.flashback = true; s.seaDone = true; }
  if (s.act === 2 && ITEMS3.every(k => s.items[k])) s.act = 3;
  if (s.rescued) s.act = 4;
  return s;
}
export const storyItemsLeft = s => ITEMS3.filter(k => !s.items[k]);
