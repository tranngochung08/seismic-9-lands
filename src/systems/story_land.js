// story_land.js — Act 2 of "Friend at Sea" (see systems/API.md, "Story"): the three things you gather ashore
//   · the diving bell forged at the M4 furnace (4 glass + 3 iron), · the trench map from the M6 librarian (after the exam),
//   · the Great Crystal the fifteen Leaders hand over in the M9 Core (after the M9 badge) — then the pier dive (act 3),
//   Lyron living in Harbor Village with festival lanterns (act 4), and the scarf keepsake for saves that skipped the prologue.
// Persisted: S.save.story (shared, via ctx.story()) and S.save.sys.storyLand = { talks }.
import { NPC } from '../entities.js';

const TS = 16;
const STR = {
  en: {
    forge: 'Forge the diving bell (4 glass + 3 iron)', missing: l => `Missing for the bell: ${l}`, bellMade: '🔔 The diving bell is forged! It will breathe for you in the trench.',
    askMap: 'Ask the librarian for the trench map',
    mapPages: ["Librarian: 'The trench under the reef? Nobody comes back from there… but the old charts remember it. You passed our exam — you have earned a look.'",
      "'Take this. The mouth of the Kraken Trench opens right below the pier of the Sea of Origins. Follow the vents — they breathe. And the coral walls move, so trust the map, not your eyes.'"],
    mapGot: '🗺 Map of the Kraken Trench received',
    askCrystal: 'Receive the Great Crystal',
    crystalPages: n => [`${n}: 'You have met all fifteen of us. The Core has watched you cross every land — and it has heard why.'`,
      "'This crystal holds the light of the Core. Down in the trench there is no sun. Let it burn for Lyron. Bring him home — the whole community is waiting.'"],
    crystalGot: '🔮 The fifteen Leaders entrust you with the Great Crystal',
    allThree: 'You have all three — dive at the pier of the Sea of Origins',
    dive: 'Dive into the Kraken Trench',
    divePage: 'The bell is heavy on your shoulders. The map points straight down, under the pier.', rockyWith: n => `The Rocky of ${n} wades into the sea behind you.`,
    rockyNone: 'No Rocky trusts you yet — the Kraken will be merciless.', ready: 'Ready?', diveHint: 'E  dive  ·  Esc  not yet', later: 'The sea can wait a little longer.',
    talk: 'Talk to Lyron',
    lyronFirst: ["Lyron: 'You came down there for me. With a bell, a map and the light of the Core… I don't know what to say.'",
      "'Every artist in Seismic is a little bit of this village. Take this — the only card of me there will ever be.'"],
    lyronPages: ["Lyron: 'The lanterns are for you, you know. The whole village hung them the night we came back.'",
      "Lyron: 'Seismic was never about me. It is every artist who washed up on this shore and decided to stay.'",
      "Lyron: 'Next time we go to sea, I row. Deal?'"],
    cardGot: '🖼 Unique art card: Lyron', scarfGiven: "🧣 Noxx gives you Lyron's scarf"
  },
  vi: {
    forge: 'Rèn chuông lặn (4 kính + 3 sắt)', missing: l => `Còn thiếu để rèn chuông: ${l}`, bellMade: '🔔 Chuông lặn đã rèn xong! Nó sẽ thở thay bạn dưới vực.',
    askMap: 'Xin thủ thư bản đồ vực',
    mapPages: ["Thủ thư: 'Vực dưới rạn san hô à? Chưa ai xuống đó mà quay về… nhưng hải đồ cũ vẫn nhớ nó. Bạn đã đỗ kỳ thi của chúng tôi — xứng đáng được xem.'",
      "'Cầm lấy. Miệng Vực Kraken mở ngay dưới cầu tàu Biển Khởi Nguồn. Cứ theo các miệng phun — chúng thở đấy. Tường san hô còn di chuyển, nên hãy tin bản đồ, đừng tin mắt mình.'"],
    mapGot: '🗺 Đã nhận Bản đồ Vực Kraken',
    askCrystal: 'Nhận Đại tinh thể',
    crystalPages: n => [`${n}: 'Bạn đã gặp đủ mười lăm người chúng tôi. Lõi đã dõi theo bạn qua từng vùng đất — và đã nghe vì sao.'`,
      "'Tinh thể này giữ ánh sáng của Lõi. Dưới vực không có mặt trời. Hãy để nó cháy vì Lyron. Đưa cậu ấy về — cả cộng đồng đang đợi.'"],
    crystalGot: '🔮 Mười lăm Leader trao bạn Đại tinh thể',
    allThree: 'Đủ ba thứ rồi — ra cầu tàu Biển Khởi Nguồn mà lặn',
    dive: 'Lặn xuống Vực Kraken',
    divePage: 'Chuông nặng trĩu trên vai. Bản đồ chỉ thẳng xuống, ngay dưới cầu tàu.', rockyWith: n => `Rocky của ${n} lội biển theo sau bạn.`,
    rockyNone: 'Chưa Rocky nào tin bạn — Kraken sẽ không nương tay.', ready: 'Sẵn sàng chưa?', diveHint: 'E  lặn  ·  Esc  để sau', later: 'Biển còn đợi được thêm chút nữa.',
    talk: 'Nói chuyện với Lyron',
    lyronFirst: ["Lyron: 'Bạn đã xuống tận đó vì mình. Với một cái chuông, một tấm bản đồ và ánh sáng của Lõi… mình không biết nói gì.'",
      "'Mỗi nghệ sĩ trong Seismic đều mang một chút ngôi làng này. Cầm lấy — tấm thẻ duy nhất về mình từng có.'"],
    lyronPages: ["Lyron: 'Đèn lồng là cho bạn đấy. Cả làng treo lên cái đêm bọn mình về.'",
      "Lyron: 'Seismic chưa bao giờ là về mình. Nó là mọi nghệ sĩ từng dạt vào bờ này và quyết định ở lại.'",
      "Lyron: 'Lần sau ra biển, mình chèo. Chịu không?'"],
    cardGot: '🖼 Thẻ tranh độc nhất: Lyron', scarfGiven: '🧣 Noxx trao bạn chiếc khăn của Lyron'
  }
};
const L = ctx => STR[ctx.lang()] || STR.en;
const BELL_COST = { glass: 4, iron: 3 };
const LANTERN_ROWS = [3, 9], PLAZA_CX = 40, LANTERN_DX = [-5, -2, 2, 5];       // village plaza: rows 3..9, x CX-5..CX+5, the avenue (CX±1) stays clear

const st = { ctx: null, lyron: null, ask: null, bub: null };
const slot = ctx => (ctx.S.save.sys.storyLand ||= { talks: 0 });
const story = ctx => (ctx.S.save && ctx.story()) || null;
const hideDlg = () => { const d = document.getElementById('dialog'); if (d) d.hidden = true; };

// ---------------------------------------------------------------- the three things
function grant(ctx, k) {
  const s = story(ctx), t = L(ctx); if (!s || s.items[k]) return false;
  s.items[k] = true; ctx.bag.add(k, 1); ctx.persist();
  ctx.toast(k === 'divebell' ? t.bellMade : k === 'trenchmap' ? t.mapGot : t.crystalGot, true);
  ctx.sfx(k === 'greatcrystal' ? 'win' : 'craft');
  checkAll(ctx);
  return true;
}
function checkAll(ctx) {
  const s = story(ctx); if (!s || s.act !== 2 || !ctx.ITEMS3.every(k => s.items[k])) return;
  ctx.storyAct(3);
  setTimeout(() => { if (story(ctx)?.act === 3) ctx.toast(L(ctx).allThree, true); }, 1700);
}
function forgeBell(ctx) {
  const t = L(ctx), miss = Object.entries(BELL_COST).filter(([id, n]) => !ctx.bag.has(id, n)).map(([id, n]) => `${n - ctx.bag.count(id)}× ${ctx.itemName(id)}`);
  if (miss.length) { ctx.toast(t.missing(miss.join(', '))); ctx.sfx('fail'); return; }
  for (const [id, n] of Object.entries(BELL_COST)) ctx.bag.remove(id, n);
  grant(ctx, 'divebell');
}
function askMap(ctx) {
  ctx.setMode('dialog');
  ctx.openDialog({ title: '📜', pages: L(ctx).mapPages, onClose: () => { ctx.setMode('play'); grant(ctx, 'trenchmap'); } });
}
function askCrystal(ctx, npc) {
  const S = ctx.S; S.player.faceTo(npc.x, npc.y); S.talking = npc;
  ctx.setMode('dialog');
  ctx.openDialog({ m: npc.m, pages: L(ctx).crystalPages(npc.m.n), onClose: () => { ctx.setMode('play'); S.talking = null; if (grant(ctx, 'greatcrystal')) ctx.quake(1); } });
}

// ---------------------------------------------------------------- the pier dive (sea zone, act ≥ 3)
function bestRocky(ctx) {
  const tamed = (ctx.S.save.sys.rocky || {}).tamed || {}; let best = null;
  for (const [k, v] of Object.entries(tamed)) if (v > 0 && (!best || v > best.v)) best = { k, v };
  return best ? best.k : null;
}
function askDive(ctx) {
  const t = L(ctx), rk = bestRocky(ctx);
  if (!st.ask) {                                                          // own mode: E = dive, Esc = not yet (a plain dialog could not be cancelled)
    st.ask = true;
    ctx.onAction('diveask', () => { if (ctx.S.mode !== 'diveask' || performance.now() - st.askT < 350) return; hideDlg(); ctx.setMode('play'); ctx.sfx('splash'); ctx.travel('trench', 'default'); });
    ctx.registerCloser('diveask', () => { hideDlg(); ctx.setMode('play'); ctx.toast(L(ctx).later); });
  }
  st.askT = performance.now();
  ctx.setMode('diveask');
  ctx.openDialog({ title: '🌊', pages: [`${t.divePage}\n${rk ? t.rockyWith(ctx.nationName(rk)) : t.rockyNone}\n${t.ready}`], onClose: null });
  const h = document.getElementById('d-hint'); if (h) h.textContent = t.diveHint;
}
const dockPx = m => ({ x: m.dock.x * TS + 8, y: m.dock.y * TS + 8 });
// the water tiles flanking the pier end (bubble columns rise there, not over the planks)
function bubbleSpots(ctx) {
  const m = ctx.S.map, T = ctx.T, water = (x, y) => [T.WATER, T.DEEP, T.REEF].includes(ctx.getG(m, x, y)), out = [];
  for (const dir of [-1, 1]) for (let k = 1; k <= 5; k++) { const x = m.dock.x + dir * k; if (water(x, m.dock.y)) { out.push({ x, y: m.dock.y }); break; } }
  return out.length ? out : [{ x: m.dock.x, y: m.dock.y - 1 }];
}
const diveOffer = ctx => { const S = ctx.S, s = story(ctx); return !!(s && s.act >= 3 && S.map && S.map.sea && S.map.dock && S.sea && S.sea.riding === null && !S.sea.diving); };

// ---------------------------------------------------------------- Lyron in the village (act 4)
function drawLyron(ctx, g, ent) {
  const x = Math.round(ent.x) - 8, y = Math.round(ent.y) - 18;
  g.drawImage(ent.sheet, ent.frame * 16, ent.dir * 20, 16, 20, x, y, 16, 20);
  ctx.drawScarf(g, x, y, ent.dir, ctx.S.time);
}
function spawnLyron(ctx) {
  const S = ctx.S, m = S.map, rng = ctx.rngFrom(ctx.hashStr('lyron-home'));
  const at = S.guide ? { x: Math.floor(S.guide.x / TS), y: Math.floor(S.guide.y / TS) } : m.entries.default;
  const avoid = [at, m.entries.default, m.entries.back].filter(Boolean);
  let spot = ctx.freeTiles(m, rng, { x: at.x - 4, y: at.y - 3, w: 9, h: 6 }, 1, avoid, 3, 2)[0]
    || ctx.freeTiles(m, rng, { x: at.x - 5, y: at.y - 4, w: 11, h: 8 }, 1, avoid, 2, 2)[0]
    || { x: at.x + 3, y: at.y };
  const n = new NPC(ctx.FRIEND, spot.x * TS + 8, spot.y * TS + 14, ctx.friendSheet(), rng);
  n.radius = 14; n.custom = (g, ent) => drawLyron(ctx, g, ent);
  S.npcs.push(n); st.lyron = n;
}
function hangLanterns(ctx) {
  const S = ctx.S, m = S.map, busy = new Set(S.npcs.map(n => `${Math.floor(n.x / TS)},${Math.floor(n.y / TS)}`));
  for (const y of LANTERN_ROWS) for (const dx of LANTERN_DX) {
    const x = PLAZA_CX + dx;
    if (ctx.isSolid(m, x, y) || ctx.hasObjectAt(m, x, y) || busy.has(`${x},${y}`)) continue;
    ctx.place(m, 'lantern', x, y, { festival: true });
  }
}
function talkLyron(ctx) {
  const S = ctx.S, n = st.lyron, t = L(ctx), sl = slot(ctx); if (!n) return;
  S.player.faceTo(n.x, n.y); S.talking = n;
  const first = !S.save.cards.includes('lyron');
  const pages = first ? t.lyronFirst : [t.lyronPages[sl.talks % t.lyronPages.length]];
  ctx.setMode('dialog');
  ctx.openDialog({
    m: ctx.FRIEND, pages, onClose: () => {
      ctx.setMode('play'); S.talking = null; if (!first) sl.talks = (sl.talks || 0) + 1;
      if (first && !S.save.cards.includes('lyron')) {
        S.save.cards.push('lyron'); ctx.sfx('win');
        ctx.achieve('rescue');                                            // no-op when the trench already granted it
        setTimeout(() => ctx.toast(t.cardGot, true), 1700);
      }
      ctx.persist();
    }
  });
}

// ---------------------------------------------------------------- the keepsake for saves that never sailed with Lyron
function keepsake(ctx) {
  const s = story(ctx), t = L(ctx); if (!s || s.act < 2 || s.keepsake) return;
  s.keepsake = true; ctx.bag.add('scarf', 1); ctx.persist();
  ctx.achieve('keepsake');
  setTimeout(() => ctx.toast(t.scarfGiven, true), 1700);
}

// ---------------------------------------------------------------- system
export const storyLand = {
  id: 'storyLand',

  onZoneEnter(ctx) {
    st.ctx = ctx; st.lyron = null; st.bub = null;
    const S = ctx.S, s = story(ctx); if (!s || !S.map || !S.zone) return;
    if (S.zone.id === 'village') {
      keepsake(ctx);
      if (s.rescued) { spawnLyron(ctx); hangLanterns(ctx); }
    }
  },

  onZoneLeave(ctx) {
    if (st.lyron) { const i = ctx.S.npcs.indexOf(st.lyron); if (i >= 0) ctx.S.npcs.splice(i, 1); }
    st.lyron = null;
    if (ctx.S.mode === 'diveask') { hideDlg(); ctx.setMode('play'); }
  },

  near(ctx) {
    const S = ctx.S, p = S.player, m = S.map, z = S.zone && S.zone.id, s = story(ctx); if (!p || !m || !z || !s) return null;
    const t = L(ctx), dist = (x, y) => Math.hypot(x - p.x, y - p.y);
    if (z === 'm4' && s.act >= 2 && !s.items.divebell) {
      const o = m.objects.find(o => o.type === 'craft_furnace'); if (!o) return null;
      const x = o.x * TS + 16, y = (o.y + 1) * TS - 4;
      return dist(x, y) < 30 ? { label: t.forge, x, y, limit: 30, priority: 2, data: { kind: 'bell' } } : null;
    }
    if (z === 'm6' && s.act >= 2 && !s.items.trenchmap && ((S.save.tasks.m6 || {}).quiz || 0) >= 1) {
      let best = null, bd = 32;
      for (const o of m.objects) { if (!o.quiz) continue; const d = ctx.O[o.type], x = o.x * TS + d.fw * 8, y = (o.y + d.fh) * TS - 4, dd = dist(x, y); if (dd < bd) { bd = dd; best = { label: t.askMap, x, y, limit: 32, priority: 2, data: { kind: 'map' } }; } }
      return best;
    }
    if (z === 'm9' && s.act >= 2 && !s.items.greatcrystal && S.save.badges.includes(9)) {
      let best = null, bd = 22;
      for (const n of S.npcs) { if (!n.m || !ctx.isLeader(n.m)) continue; const dd = dist(n.x, n.y); if (dd < bd) { bd = dd; best = { label: t.askCrystal, x: n.x, y: n.y, limit: 22, priority: 2, data: { kind: 'crystal', npc: n } }; } }
      return best;
    }
    if (z === 'sea' && diveOffer(ctx)) {
      const d = dockPx(m);
      return dist(d.x, d.y) < 48 ? { label: t.dive, x: d.x, y: d.y, limit: 48, priority: 3, data: { kind: 'dive' } } : null;
    }
    if (z === 'village' && st.lyron && S.npcs.includes(st.lyron)) {
      const n = st.lyron;
      return dist(n.x, n.y) < 22 ? { label: t.talk, x: n.x, y: n.y, limit: 22, priority: 2, data: { kind: 'lyron' } } : null;
    }
    return null;
  },

  interact(ctx, cand) {
    const k = cand && cand.data && cand.data.kind; if (!k || ctx.S.mode !== 'play') return;
    if (k === 'bell') forgeBell(ctx);
    else if (k === 'map') askMap(ctx);
    else if (k === 'crystal') askCrystal(ctx, cand.data.npc);
    else if (k === 'dive') askDive(ctx);
    else if (k === 'lyron') talkLyron(ctx);
  },

  drawables(ctx, cx, cy) {
    if (!diveOffer(ctx)) return [];
    const g = ctx.g, tm = ctx.S.time, spots = st.bub || (st.bub = bubbleSpots(ctx));
    return spots.map((sp, si) => {
      const bx = sp.x * TS + 8, by = sp.y * TS + 12;
      return {
        y: sp.y * TS + 16, f: () => {                                    // a column of small bubbles rising from the water beside the pier end
          for (let i = 0; i < 7; i++) {
            const ph = (tm * 0.9 + i * 0.37 + si * 0.5) % 1, x = bx + Math.round(Math.sin(tm * 3 + i * 1.7) * 2) - cx, y = by - Math.round(ph * 22) - cy, s = ph < 0.5 ? 2 : 1;
            g.fillStyle = `rgba(220,245,255,${(0.95 - ph * 0.7).toFixed(2)})`; g.fillRect(x, y, s, s);
          }
          g.fillStyle = 'rgba(255,255,255,0.45)'; g.fillRect(bx - 3 - cx, by - cy, 7, 1);
        }
      };
    });
  },

  hudLines() { return []; }
};

// ---- test hooks ----
if (typeof window !== 'undefined') window.__storyLand = {
  state: () => { const ctx = st.ctx; return ctx ? { ...story(ctx), zone: ctx.S.zone && ctx.S.zone.id, lyron: !!st.lyron, cards: ctx.S.save.cards.slice(), lanterns: ctx.S.map ? ctx.S.map.objects.filter(o => o.festival).length : 0 } : null; },
  give: k => grant(st.ctx, k),
  giveAll: () => ctx3(st.ctx),
  rescued: () => { const ctx = st.ctx, s = story(ctx); if (!s) return; s.rescued = true; s.act = 4; ctx.persist(); return s; }
};
function ctx3(ctx) { for (const k of ctx.ITEMS3) grant(ctx, k); return story(ctx); }
