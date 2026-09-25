// data.js — roster loading, level colors, flags, NPC picking
export const LEVEL_COLORS = { 9: '#ff1f4b', 8: '#e8402a', 7: '#e8862e', 6: '#e6bd2c', 5: '#a9b02e', 4: '#7fd14b', 3: '#3fbf6a', 2: '#4fc7a8', 1: '#e2d79a', '-1': '#9a9a9a', '-2': '#3f8fd6' };

export const NATIONS = {
  Indonesian: ['🇮🇩', 'Indonesia', 'Indonesia'], Vietnamese: ['🇻🇳', 'Vietnam', 'Việt Nam'], Russian: ['🇷🇺', 'Russia', 'Nga'], Indian: ['🇮🇳', 'India', 'Ấn Độ'],
  Nigerian: ['🇳🇬', 'Nigeria', 'Nigeria'], Ukrainian: ['🇺🇦', 'Ukraine', 'Ukraine'], chinese: ['🇨🇳', 'China', 'Trung Quốc'], Pakistan: ['🇵🇰', 'Pakistan', 'Pakistan'],
  Iranian: ['🇮🇷', 'Iran', 'Iran'], Turkish: ['🇹🇷', 'Turkey', 'Thổ Nhĩ Kỳ'], Bangladeshi: ['🇧🇩', 'Bangladesh', 'Bangladesh'], Thai: ['🇹🇭', 'Thailand', 'Thái Lan'],
  Korean: ['🇰🇷', 'Korea', 'Hàn Quốc'], philippines: ['🇵🇭', 'Philippines', 'Philippines'], French: ['🇫🇷', 'France', 'Pháp'], japanese: ['🇯🇵', 'Japan', 'Nhật Bản'],
  Egyptian: ['🇪🇬', 'Egypt', 'Ai Cập'], Brazilian: ['🇧🇷', 'Brazil', 'Brazil'], 'Singapore/Malaysia': ['🇸🇬', 'Singapore/Malaysia', 'Singapore/Malaysia'],
  Moroccan: ['🇲🇦', 'Morocco', 'Ma-rốc'], Arabic: ['🇸🇦', 'Arabia', 'Ả Rập'], Portugal: ['🇵🇹', 'Portugal', 'Bồ Đào Nha'], Italian: ['🇮🇹', 'Italy', 'Ý'], Polish: ['🇵🇱', 'Poland', 'Ba Lan']
};
export let NATION_LANG = 'en';
export function setNationLang(l) { NATION_LANG = l; }

export let ROSTER = [];
export const byId = new Map();
const byLevel = new Map();

export async function loadRoster() {
  const r = await fetch('data/roster.json');
  ROSTER = await r.json();
  for (const m of ROSTER) {
    byId.set(m.id, m);
    if (!byLevel.has(m.lv)) byLevel.set(m.lv, []);
    byLevel.get(m.lv).push(m);
  }
  for (const arr of byLevel.values()) arr.sort((a, b) => b.i - a.i || b.p - a.p);
  return ROSTER;
}

export function membersOfLevel(lv) { return (byLevel.get(lv) || []).filter(m => m.n !== 'Deleted User'); }
export function nationOf(m) { for (const r of m.ro || []) if (NATIONS[r]) return { key: r, flag: NATIONS[r][0], name: NATION_LANG === 'vi' ? NATIONS[r][2] : NATIONS[r][1], nameEn: NATIONS[r][1] }; return null; }
export function isLeader(m) { return (m.ro || []).includes('Leader'); }
export function isBooster(m) { return (m.ro || []).includes('Booster'); }

// Pick walking NPCs for a level, spread evenly across nationalities: every nation with members at this level
// gets at least one representative (round-robin), so small countries are visible too. Within a nation the
// most active artists come first, lightly shuffled per day so different people appear. Leaders always present.
export function pickNpcs(lv, cap, rng, maxPerNation = 6) {
  const all = membersOfLevel(lv);
  const groups = new Map();
  for (const m of all) { const n = nationOf(m); const k = n ? n.key : '_'; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(m); }
  const lists = [...groups.entries()].map(([k, arr]) => {
    const pool = arr.slice(0, Math.max(3, Math.ceil(arr.length * 0.3)));
    for (let i = pool.length - 1; i > 0; i--) { const j = (rng() * (i + 1)) | 0;[pool[i], pool[j]] = [pool[j], pool[i]]; }
    return { k, q: pool.concat(arr.slice(pool.length)), size: arr.length, taken: 0 };
  });
  lists.sort((a, b) => (a.k === '_') - (b.k === '_') || b.size - a.size); // biggest nations first, "no nation" last
  const target = Math.min(cap, Math.max(20, lists.length * 2)); // about two artists per nation district
  const out = all.filter(isLeader);
  for (const m of out) { const l = lists.find(l => l.q.includes(m)); if (l) { l.taken++; l.q.splice(l.q.indexOf(m), 1); } }
  let added = true;
  while (out.length < target && added) {
    added = false;
    for (const l of lists) {
      if (out.length >= target) break; if (l.taken >= (l.k === '_' ? 3 : maxPerNation)) continue;
      const m = l.q.shift(); if (m) { out.push(m); l.taken++; added = true; }
    }
  }
  return out;
}
export function nationsAtLevel(lv) { const s = new Set(); for (const m of membersOfLevel(lv)) { const n = nationOf(m); if (n) s.add(n.key); } return s.size; }

// Nations present at a level, biggest first: [{key, flag, name, members}]
export function nationGroups(lv) {
  const g = new Map();
  for (const m of membersOfLevel(lv)) { const n = nationOf(m); if (!n) continue; if (!g.has(n.key)) g.set(n.key, { key: n.key, flag: n.flag, name: n.name, members: [] }); g.get(n.key).members.push(m); }
  return [...g.values()].sort((a, b) => b.members.length - a.members.length);
}
// A nation's record at one level: totals, ranks among nations at that level, top artists, pioneers
export function nationStats(key, lv) {
  const groups = nationGroups(lv), me = groups.find(x => x.key === key); if (!me) return null;
  const sum = (arr, f) => arr.reduce((a, m) => a + (m[f] || 0), 0);
  const rows = groups.map(x => ({ key: x.key, count: x.members.length, i: sum(x.members, 'i'), p: sum(x.members, 'p'), r: sum(x.members, 'r') }));
  const rank = f => rows.slice().sort((a, b) => b[f] - a[f]).findIndex(x => x.key === key) + 1;
  const all = ROSTER.filter(m => nationOf(m)?.key === key);
  const first = me.members.slice().sort((a, b) => a.f < b.f ? -1 : 1)[0];
  return {
    key, flag: me.flag, name: me.name, lv, nations: groups.length,
    count: me.members.length, artworks: sum(me.members, 'i'), posts: sum(me.members, 'p'), reactions: sum(me.members, 'r'),
    rankCount: rank('count'), rankArt: rank('i'), rankReact: rank('r'),
    leaders: me.members.filter(isLeader).length, boosters: me.members.filter(isBooster).length,
    top: me.members.slice(0, 3), pioneer: first,
    totalAll: all.length, artworksAll: sum(all, 'i'), at9: all.filter(m => m.lv === 9).length, share: all.length / ROSTER.length
  };
}

export function findMember(q) {
  q = q.trim().toLowerCase(); if (!q) return null;
  return ROSTER.find(m => m.n.toLowerCase() === q) || ROSTER.find(m => (m.k || '').toLowerCase() === q) || ROSTER.find(m => m.n.toLowerCase().includes(q) || (m.k || '').toLowerCase().includes(q)) || null;
}
