// save.js — localStorage persistence
const KEY = 'seismic9.save.v1';
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
export function loadSave() { try { const s = JSON.parse(localStorage.getItem(KEY)); return s ? { ...defaultSave(), ...s } : null; } catch (e) { return null; } }
export let SAVE_OFF = false; export function saveOff() { SAVE_OFF = true; }   /* ?promo: không ghi đè save thật */
export function writeSave(s) { if (SAVE_OFF) return; try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) { } }
export function clearSave() { try { localStorage.removeItem(KEY); } catch (e) { } }
