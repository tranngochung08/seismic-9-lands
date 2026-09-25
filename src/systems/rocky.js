// rocky.js — pilot a nation's Rocky statue once that nation trusts you (see API.md)
// Stand in front of a district's Rocky statue. If you have met half of that nation's
// artists in this land, 5 stones wake the statue: you *become* Rocky for 40 s,
// stomp through rocks and crates, and the nation's artists cheer.

const COST = 5, DURATION = 40, REACH = 34, TRUST = 0.5;
// breakable decor: value = stones gained when Rocky smashes it
const LOOT = { rock: 1, rock_s: 1, boulder: 1, ore: 1, pillar_broken: 1, bush: 0, deadtree: 0, crate: 0, shell: 0 };
const DEBRIS = { rock: '#c8c8d2', rock_s: '#b9b9c2', boulder: '#c8c8d2', ore: '#ffd45e', pillar_broken: '#d6d6de', bush: '#4caa4f', deadtree: '#8a5a2b', crate: '#c08a4a', shell: '#f4c6c0' };

const STR = {
  en: {
    pilot: `Pilot Rocky (${COST} 🪨)`,
    locked: (k, n) => `Rocky — earn trust: met ${k}/${n}`,
    out: 'Step out',
    needTrust: (k, n) => `Rocky will not stir — you have met ${k}/${n} of this nation.`,
    needStone: s => `Rocky needs ${COST} 🪨 stones to wake (you have ${s}).`,
    go: 'You are Rocky! Stomp through the rubble.',
    done: (k, s) => `Rocky rests. Broke ${k} things, +${s} stones`,
    bar: (sec, st) => `Rocky · ${sec}s · 🪨 ${st}`
  },
  vi: {
    pilot: `Điều khiển Rocky (${COST} 🪨)`,
    locked: (k, n) => `Rocky — cần tin tưởng: đã gặp ${k}/${n}`,
    out: 'Rời Rocky',
    needTrust: (k, n) => `Rocky chưa chịu nhúc nhích — mới gặp ${k}/${n} người của nước này.`,
    needStone: s => `Rocky cần ${COST} 🪨 đá để thức dậy (đang có ${s}).`,
    go: 'Bạn là Rocky! Đạp tung đống đá đi.',
    done: (k, s) => `Rocky nghỉ. Đập ${k} vật, +${s} đá`,
    bar: (sec, st) => `Rocky · ${sec}s · 🪨 ${st}`
  }
};
const L = ctx => STR[ctx.lang() === 'vi' ? 'vi' : 'en'];

// ---------- module state (one pilot at a time) ----------
let on = false;          // piloting right now?
let left = 0;            // seconds remaining
let nation = null;       // nation key of the statue being piloted
let statue = null;       // { type, x, y } of the hidden statue, to put back
let art = null;          // { img, w, h } of the drawn Rocky
let broke = 0, gained = 0;
let stepT = 0, saveT = 0;
const parts = [];        // debris particles

const nationNpcs = (ctx, key) => ctx.S.npcs.filter(n => !n.m.guide && ctx.nationOf(n.m)?.key === key);
function metCount(ctx, key) {
  const mine = nationNpcs(ctx, key), met = ctx.metIds();
  return [mine.filter(n => met.has(n.m.id)).length, mine.length];
}
const sysStats = ctx => {
  const sv = ctx.S.save; sv.sys = sv.sys || {};
  sv.sys.rocky = { pilots: 0, broken: 0, ...(sv.sys.rocky || {}) };
  return sv.sys.rocky;
};
// the breakable decor object covering tile (tx,ty), if any
function breakableAt(ctx, map, tx, ty) {
  for (const o of map.objects) {
    if (!(o.type in LOOT)) continue;
    const d = ctx.O[o.type];
    if (tx >= o.x && tx < o.x + d.fw && ty >= o.y && ty < o.y + d.fh) return o;
  }
  return null;
}

// would a normal-sized player standing at (x,y) be inside a wall or an artist?
function blockedSpot(ctx, x, y) {
  const map = ctx.S.map, bx = x - 5, by = y - 6, bw = 10, bh = 6;
  const x0 = Math.floor(bx / 16), x1 = Math.floor((bx + bw - 1) / 16), y0 = Math.floor(by / 16), y1 = Math.floor((by + bh - 1) / 16);
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) if (ctx.isSolid(map, tx, ty)) return true;
  for (const n of ctx.allNpcs()) { const o = n.box(); if (bx < o.x + o.w && bx + bw > o.x && by < o.y + o.h && by + bh > o.y) return true; }
  return false;
}
// the tile in front of the statue, or the nearest free tile if somebody is standing there
const RING = [[0, 1], [-1, 0], [1, 0], [-1, 1], [1, 1], [0, 2], [-2, 0], [2, 0], [-2, 1], [2, 1], [-1, 2], [1, 2], [0, 3]];
function stepOutSpot(ctx, d) {
  const TS = ctx.TS, spot = { x: (statue.x + d.fw / 2) * TS, y: (statue.y + d.fh + 1) * TS - 2 };
  if (!blockedSpot(ctx, spot.x, spot.y)) return spot;
  const tx = Math.floor(spot.x / TS), ty = Math.floor(spot.y / TS);
  for (const [dx, dy] of RING) {
    const c = { x: (tx + dx) * TS + 8, y: (ty + dy) * TS + 14 };
    if (!blockedSpot(ctx, c.x, c.y)) return c;
  }
  return spot;
}

function spawnDebris(ctx, o) {
  const d = ctx.O[o.type], c = DEBRIS[o.type] || ctx.PAL.stone;
  const cx = (o.x + d.fw / 2) * ctx.TS, cy = (o.y + d.fh) * ctx.TS - 6;
  for (let i = 0; i < 12; i++) {
    const a = Math.random() * Math.PI * 2, sp = 20 + Math.random() * 55;
    parts.push({ x: cx, y: cy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 40, t: 0.7 + Math.random() * 0.5, c, s: Math.random() < 0.5 ? 2 : 1 });
  }
}

// ---------- start / stop ----------
function start(ctx, o) {
  const d = ctx.O[o.type], tier = ctx.S.zone.tier || 0, map = ctx.S.map, p = ctx.S.player;
  if (p.custom) { ctx.toast(ctx.lang() === 'vi' ? 'Xuống xe / ngựa trước đã' : 'Get off your ride first'); return; } // never clobber a vehicle or horse mount
  statue = { type: o.type, x: o.x, y: o.y };
  nation = o.nation;
  const w = tier >= 3 ? Math.min(48, d.w) : 32;              // 2 tiles wide, or natural size (capped) for the grander statues
  art = { img: d.img, w, h: Math.round(d.h * (w / d.w)) };
  ctx.removeObject(map, o);                                   // the statue steps off its plinth

  ctx.S.save.inv.stone = (ctx.S.save.inv.stone || 0) - COST;
  const st = sysStats(ctx); st.pilots++;
  (st.tamed ||= {})[nation] = (st.tamed[nation] || 0) + 1;       // a nation whose Rocky you have piloted is "tamed": its Rocky follows you into the Kraken Trench (trench.js)
  st.tamedTier = Math.max(st.tamedTier || 0, tier);
  on = true; left = DURATION; broke = 0; gained = 0; stepT = 0; saveT = 0; parts.length = 0;

  p.speedMul = 0.75; p.boxW = 20; p.boxH = 10; p.ghost = true; p.pilot = 'rocky';
  p.passable = (m, tx, ty) => !ctx.isSolid(m, tx, ty) || !!breakableAt(ctx, m, tx, ty);
  p.custom = (g, ent) => {
    const bob = ent.moving && Math.floor(ent.animT / 0.16) % 2 ? 1 : 0;
    const x = Math.round(ent.x) - (art.w >> 1), y = Math.round(ent.y) - art.h + 2 - bob;
    g.save();
    const gr = g.createRadialGradient(Math.round(ent.x), y + art.h * 0.55, 2, Math.round(ent.x), y + art.h * 0.55, art.w * 0.85);
    gr.addColorStop(0, 'rgba(255,212,94,.28)'); gr.addColorStop(1, 'rgba(255,212,94,0)');
    g.fillStyle = gr; g.fillRect(x - art.w, y - 6, art.w * 3, art.h + 12);
    g.fillStyle = 'rgba(0,0,0,.28)'; g.beginPath(); g.ellipse(Math.round(ent.x), Math.round(ent.y) + 1, art.w * 0.4, art.w * 0.16, 0, 0, 7); g.fill();
    g.drawImage(art.img, x, y, art.w, art.h);
    g.restore();
  };
  ctx.quake(0.5); ctx.toast(L(ctx).go, true); ctx.persist();
}

function stop(ctx, restore) {
  if (!on) return;
  const p = ctx.S.player;
  on = false; parts.length = 0;
  p.speedMul = 1; p.passable = null; p.custom = null; p.ghost = false; p.boxW = 10; p.boxH = 6; p.pilot = null;
  if (restore && statue) {                                    // put the statue back on its tile and step out in front of it
    const d = ctx.O[statue.type];
    ctx.place(ctx.S.map, statue.type, statue.x, statue.y, { rocky: true, nation });
    const spot = stepOutSpot(ctx, d);
    p.x = spot.x; p.y = spot.y; p.dir = 0;
    ctx.toast(L(ctx).done(broke, gained), true);
    ctx.quake(0.4);
  }
  statue = null; art = null; nation = null;
  ctx.persist();
}

export const rockyControl = {
  id: 'rockyControl',

  onZoneEnter(ctx) { stop(ctx, false); },                     // maps rebuild — drop the pilot, never re-place the statue

  near(ctx) {
    const p = ctx.S.player;
    if (on) return { label: L(ctx).out, x: p.x, y: p.y, limit: 999, data: { out: true } };
    let best = null, bd = Infinity;
    for (const o of ctx.S.map.objects) {
      if (!o.rocky) continue;
      const d = ctx.O[o.type];
      const x = (o.x + d.fw / 2) * ctx.TS, y = (o.y + d.fh) * ctx.TS;
      const dist = Math.hypot(x - p.x, y - p.y);
      if (dist < REACH && dist < bd) { bd = dist; best = { o, x, y }; }
    }
    if (!best) return null;
    const ok = ctx.trust(best.o.nation) >= TRUST;
    const [k, n] = metCount(ctx, best.o.nation);
    return { label: ok ? L(ctx).pilot : L(ctx).locked(k, n), x: best.x, y: best.y, limit: REACH, data: { obj: best.o, ok, k, n } };
  },

  interact(ctx, cand) {
    const d = cand && cand.data;
    if (!d) return;
    if (d.out) { stop(ctx, true); return; }
    if (!d.ok) { ctx.toast(L(ctx).needTrust(d.k, d.n)); return; }
    const have = ctx.S.save.inv.stone || 0;
    if (have < COST) { ctx.toast(L(ctx).needStone(have)); return; }
    if (ctx.S.map.objects.indexOf(d.obj) < 0) return;          // statue vanished (zone change) — nothing to pilot
    start(ctx, d.obj);
  },

  update(dt, ctx) {
    for (let i = parts.length - 1; i >= 0; i--) {
      const q = parts[i]; q.t -= dt;
      if (q.t <= 0) { parts.splice(i, 1); continue; }
      q.x += q.vx * dt; q.y += q.vy * dt; q.vy += 150 * dt; q.vx *= 0.94;
    }
    if (!on || ctx.S.mode !== 'play') return;
    left -= dt;
    if (left <= 0) { stop(ctx, true); return; }

    const p = ctx.S.player, map = ctx.S.map, TS = ctx.TS;
    const bx = p.x - p.boxW / 2, by = p.y - p.boxH, bw = p.boxW, bh = p.boxH;
    for (const o of map.objects.slice()) {
      if (!(o.type in LOOT)) continue;
      const d = ctx.O[o.type], ox = o.x * TS, oy = o.y * TS, ow = d.fw * TS, oh = d.fh * TS;
      if (bx < ox + ow && bx + bw > ox && by < oy + oh && by + bh > oy) {
        spawnDebris(ctx, o);
        ctx.removeObject(map, o);
        broke++; sysStats(ctx).broken++;
        const gain = LOOT[o.type];
        if (gain) { ctx.S.save.inv.stone = (ctx.S.save.inv.stone || 0) + gain; gained += gain; }
        ctx.quake(0.25); saveT = 0.6;
      }
    }
    if (saveT > 0) { saveT -= dt; if (saveT <= 0) { saveT = 0; ctx.persist(); } }
    if (p.moving) { stepT += dt; if (stepT >= 0.5) { stepT -= 0.5; ctx.quake(0.15); } }  // heavy footsteps
  },

  draw(g, ctx, cx, cy) {
    for (const q of parts) {
      g.globalAlpha = Math.max(0, Math.min(1, q.t * 2));
      const x = Math.round(q.x - cx), y = Math.round(q.y - cy);
      g.fillStyle = ctx.PAL.out; g.fillRect(x - 1, y - 1, q.s + 2, q.s + 2);   // dark outline so chips read on any ground
      g.fillStyle = q.c; g.fillRect(x, y, q.s, q.s);
    }
    g.globalAlpha = 1;
  },

  drawUI(ug, ctx, cx, cy, scale) {
    if (!on) return;
    const W = ug.canvas.width, H = ug.canvas.height, t = ctx.S.time;
    ug.save();
    // the nation's artists cheer
    ug.textAlign = 'center'; ug.textBaseline = 'middle';
    ug.font = `bold ${Math.max(13, Math.round(scale * 4.2))}px "Segoe UI",system-ui,sans-serif`;
    nationNpcs(ctx, nation).forEach((n, i) => {
      const sx = Math.round((n.x - cx) * scale), sy = Math.round((n.y - 30 - cy) * scale) - Math.round(Math.abs(Math.sin(t * 3 + i)) * scale * 2.5);
      if (sx < -40 || sx > W + 40 || sy < -20 || sy > H + 20) return;
      ug.fillStyle = 'rgba(13,11,20,.55)'; ug.fillText(i % 2 ? '★' : '♥', sx + 1, sy + 1);
      ug.fillStyle = i % 2 ? '#ffd45e' : '#ff7fa8';
      ug.fillText(i % 2 ? '★' : '♥', sx, sy);
    });
    // timer bar
    const bw = Math.max(170, Math.min(380, Math.round(W * 0.34))), bh = Math.max(16, Math.round(scale * 5.5));
    const bx = Math.round((W - bw) / 2), by = Math.min(Math.max(122, Math.round(H * 0.17)), Math.max(60, H - 90)); // clear of the toast (top: 60px)
    const k = Math.max(0, Math.min(1, left / DURATION));
    ug.fillStyle = 'rgba(13,11,20,.78)'; ug.beginPath(); ug.roundRect(bx, by, bw, bh, 5); ug.fill();
    ug.fillStyle = k < 0.2 ? 'rgba(255,31,75,.55)' : 'rgba(255,212,94,.45)';
    ug.beginPath(); ug.roundRect(bx + 2, by + 2, Math.max(0, (bw - 4) * k), bh - 4, 4); ug.fill();
    ug.strokeStyle = '#ffd45e'; ug.lineWidth = 1; ug.beginPath(); ug.roundRect(bx + .5, by + .5, bw - 1, bh - 1, 5); ug.stroke();
    ug.fillStyle = '#fff'; ug.font = `bold ${Math.max(11, Math.round(scale * 3.4))}px "Segoe UI",system-ui,sans-serif`;
    ug.fillText(L(ctx).bar(Math.ceil(left), ctx.S.save.inv.stone || 0), bx + bw / 2, by + bh / 2 + 1);
    ug.restore();
  }
};
