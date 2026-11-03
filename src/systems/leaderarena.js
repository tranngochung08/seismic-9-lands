// leaderarena.js — plan-48 §12 (2026-10-28): ĐẤU TRƯỜNG LEADER (vùng 'leader_arena', world.js buildLeaderArena).
//  · Nền: 1 ảnh ghép từ texture PixelLab (zones/leader_arena/bg.png — tools/px-p48b-compose.py) vẽ ở drawGround thay cho ô.
//  · Khán giả: dân Seismic THẬT (roster, sprite NPC sẵn có ctx.npcSheet) ngồi theo bậc ghế quanh sân — KHÔNG phải NPC đi lại:
//    vẽ 1 lần vào 2 canvas đệm (2 nhóm lệch pha), lúc thường đổi đệm thưa (0,8 s) = nhấp nhô 1 px file rất nhẹ.
//    ctx.crowdCheer(level 1..3) → cổ vũ NGẮN (1,4 / 2,2 / 3,2 s): khán giả trong khung nhảy + vẫy tay, bậc 2–3 giơ băng rôn PixelLab, rồi tắt hẳn.
//    (luật anh: hiệu ứng lặp chỉ bật khi có sự kiện — ra đòn mạnh, hạ thú, thắng)
//  · 15 Leader (roster ro có 'Leader') đứng trên lối đi đá nửa bắc, ghế VIP sau lưng; vương miện + tên ★ = cơ chế Leader sẵn có (main.js).
//    E → bảng 'Thách đấu linh thú?' → ctx.duel.start({ foe, team, field: 'leader_arena', onWin, onLose }) nếu engine đấu đã có, chưa có → 'Sắp mở'.
//  · Lưu: save.sys.leaderArena = { v, wins: { [leaderId]: dayIndex }, badges: [leaderId…], champion }.
const TS = 16, K = 2;
const vi = ctx => ctx.lang() === 'vi';
const ST = { on: false, ctx: null, bg: null, fx: {}, crowd: [], built: 0, bufs: null, phase: 0, phT: 0, cheer: null, leaders: [], buildMs: 0, t: 0 };
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const IM = {};
function img(src) { let i = IM[src]; if (!i) { i = IM[src] = new Image(); i.src = 'assets/px/' + src; } return i.complete && i.naturalWidth ? i : null; }

/* ---- đội 3 thú của 15 Leader (loài lấy từ _wip/p48a/src/systems/duel-data.js SPECIES — chỉ đọc; dễ → khó) ---- */
const SPN = { utchan: 'Ụt Chấn', dinhchan: 'Đỉnh Chấn', thanhong: 'Than Hồng', hoagiap: 'Hoả Giáp', botboi: 'Bọt Bơi', trieudang: 'Triều Đăng', daydi: 'Dây Dí', cotloi: 'Cột Lôi',
  maybong: 'Mây Bông', locvuong: 'Lốc Vương', namlac: 'Nấm Lắc', rungmang: 'Rừng Mang', dongchau: 'Đông Châu', bangthap: 'Băng Tháp', langkinh: 'Lăng Kính', tinhhoang: 'Tinh Hoàng',
  bitbit: 'Bít Bít', matmaxa: 'Mật Mã Xà', kenken: 'Kèn Kẹn', loavuong: 'Loa Vương', bongle: 'Bóng Lẻ', dadang: 'Dạ Đăng', domsang: 'Đom Sáng', thienkinh: 'Thiên Kính', tamchan: 'Tâm Chấn' };
export const LEADER_TEAMS = [   /* [loài…], cấp — thứ tự = độ khó (0 dễ nhất) */
  [['utchan', 'thanhong', 'botboi'], 8], [['daydi', 'maybong', 'namlac'], 10], [['dongchau', 'langkinh', 'kenken'], 12],
  [['utchan', 'daydi', 'dongchau'], 15], [['thanhong', 'maybong', 'langkinh'], 18], [['botboi', 'namlac', 'kenken'], 21],
  [['dinhchan', 'hoagiap', 'trieudang'], 24], [['cotloi', 'locvuong', 'rungmang'], 27], [['bangthap', 'tinhhoang', 'loavuong'], 30],
  [['bitbit', 'bongle', 'domsang'], 33], [['matmaxa', 'dadang', 'thienkinh'], 36], [['hoagiap', 'cotloi', 'bangthap'], 40],
  [['rungmang', 'loavuong', 'matmaxa'], 44], [['dinhchan', 'trieudang', 'thienkinh'], 48], [['dadang', 'tinhhoang', 'tamchan'], 52]];
/* độ khó d → chỗ đứng (world.js m.leaderSpots: 0 = tây … 7 = giữa bắc, lô VIP … 14 = đông): dễ ở 2 đầu gần cổng, khó dần về giữa bắc */
const SPOT_OF = [0, 14, 1, 13, 2, 12, 3, 11, 4, 10, 5, 9, 6, 8, 7];

function sv(ctx) { const s = ctx.S.save; s.sys ||= {}; const d = (s.sys.leaderArena ||= { v: 1, wins: {}, badges: [] }); d.wins ||= {}; d.badges ||= []; return d; }
const rosterAll = ctx => (ctx.byId ? [...ctx.byId.values()] : []);

/* ---------- khán giả ---------- */
function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
const MARG = 192;   /* nền + khán giả nối ra ngoài bản đồ MARG px mỗi phía (camera không kẹp mép) — khớp px-p48b-compose.py M */
function crowdSpots(m) {
  const G = m.stadium.geo, out = [], W = m.w * TS, H = m.h * TS, rects = [];
  for (const o of m.objects) { const d = ST.ctx.O[o.type]; if (!d) continue; const x = o.x * TS + (d.ox || 0), by = (o.y + d.fh) * TS; rects.push([x + 2, by - d.h + 4, x + d.w - 2, by + 2]); }
  for (let k = 0; k < 60; k++) {
    const off = G.APRON + G.WALL + (k + 0.62) * G.ROWP, a = G.FRX + off, b = G.FRY + off;
    let acc = (k * 5) % 12, px0 = G.CX + a, py0 = G.CY, any = false;
    const N = Math.ceil((a + b) * 4);
    for (let i = 1; i <= N; i++) {
      const t = i / N * Math.PI * 2, x = G.CX + Math.cos(t) * a, y = G.CY + Math.sin(t) * b; acc += Math.hypot(x - px0, y - py0); px0 = x; py0 = y;
      const hs = hash(k + ':' + Math.round(t * 400)), step = 10.5 + (hs % 5) * 0.75;   /* khoảng cách ghế lệch nhẹ + vài ghế trống → không thành giấy dán tường */
      if (acc < step) continue; acc = 0; if (hs % 19 === 0) continue;
      if (x < -MARG + 6 || x > W + MARG - 6 || y < -MARG + 14 || y > H + MARG + 2) continue; any = true;
      if (y > G.CY && x > G.TUN[0] * TS - 10 && x < (G.TUN[1] + 1) * TS + 10) continue;   /* hành lang cổng Nam */
      if (rects.some(r => x > r[0] && x < r[2] && y > r[1] && y < r[3])) continue;   /* bảng tỉ số / đèn pha / ghế VIP che chỗ */
      const vx = (G.CX - x) / a, vy = (G.CY - y) / b, dir = Math.abs(vy) > Math.abs(vx) * 0.8 ? (vy > 0 ? 0 : 3) : (vx < 0 ? 1 : 2);
      out.push({ x: Math.round(x + ((hs >>> 5) % 3) - 1), y: Math.round(y), dir, k });
    }
    if (!any) break;
  }
  out.sort((p, q) => p.y - q.y);
  return out;
}
const SEAT_H = 14;   /* phần thân hiện trên ghế (đầu + ngực), px logic */
function drawSeated(g, c, x, y, dy, frame) {
  const sh = c.sheet; if (!sh) return;
  g.drawImage(sh, (frame || 0) * 16, c.dir * 20, 16, SEAT_H, x - 8, y - SEAT_H + 2 + dy, 16, SEAT_H);
}
/* Ngoại hình khán giả: lookFor(id) như dân thường nhưng gom về ≤ 16 cặp da/tóc × màu áo theo cấp (≤ 160 sheet) — tô lại màu áo PixelLab tốn ~10 ms/sheet,
   ngoại hình riêng từng người (3 700 cặp) làm vào vùng mất > 5 s. Sheet chuẩn bị rải nhiều khung theo ngân sách thời gian. */
function prepSheets(ctx, budget) {
  const t0 = performance.now();
  while (ST.prep < ST.crowd.length && performance.now() - t0 < budget) { const c = ST.crowd[ST.prep++]; c.sheet = ST.sheetOf(c.look); }
  ST.buildMs += performance.now() - t0;
}
/* Canvas đệm CỬA SỔ (khung nhìn + 64 px mỗi phía): vẽ lại chỉ khi camera ra khỏi cửa sổ hoặc tới nhịp nhấp nhô (0,8 s) — rẻ, ít bộ nhớ (không đệm cả sân). */
const WPAD = 64;
function winRebuild(ctx, cx, cy, VW, VH) {
  const t0 = performance.now(), w = VW + 2 * WPAD, h = VH + 2 * WPAD;
  let B = ST.win; if (!B || B.w !== w || B.h !== h) { const c = document.createElement('canvas'); c.width = w * K; c.height = h * K; B = ST.win = { c, g: c.getContext('2d'), w, h }; }
  const g = B.g, x0 = cx - WPAD, y0 = cy - WPAD; B.x = x0; B.y = y0; B.ph = ST.phase; B.n = ST.prep;
  delete B.c.__hi; g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, B.c.width, B.c.height); g.setTransform(K, 0, 0, K, 0, 0); g.imageSmoothingEnabled = false;
  for (const c of ST.crowd) { if (c.x < x0 - 10 || c.x > x0 + w + 10 || c.y < y0 - 2 || c.y > y0 + h + 16 || !c.sheet) continue; drawSeated(g, c, c.x - x0, c.y - y0, c.grp === ST.phase ? -0.5 : 0, 0); }
  B.c.__hi = K; ST.rebuilds++; ST.rebMs = performance.now() - t0;
}
function setupCrowd(ctx) {
  const m = ctx.S.map, spots = crowdSpots(m);
  const all = rosterAll(ctx).filter(x => !ctx.isLeader(x));
  const pool = all.slice().sort((a, b) => ((a.lv === -1 ? 0 : 1) - (b.lv === -1 ? 0 : 1)) || hash(a.id) - hash(b.id));   /* p89 (anh 02/11): dân Làng (lv −1) bỏ khỏi map Làng → ngồi khán đài trước, chỗ còn lại mới tới dân vùng khác */
  const LC = { 9: '#ff1f4b', 8: '#e8402a', 7: '#e8862e', 6: '#e6bd2c', 5: '#a9b02e', 4: '#7fd14b', 3: '#3fbf6a', 2: '#4fc7a8', 1: '#e2d79a', '-1': '#9a9a9a', '-2': '#3f8fd6' };   /* = data.js LEVEL_COLORS */
  const reps = [], cache = new Map();
  ST.sheetOf = lk => { const k = lk.skin + '|' + lk.hair + '|' + lk.shirt; let sh = cache.get(k); if (!sh) { sh = ctx.charSheet({ ...lk, pants: '#2f3b5e' }); cache.set(k, sh); } return sh; };
  ST.crowd = spots.map((s, i) => { const mem = pool[i % pool.length], lk = ctx.lookFor(mem.id, LC[Math.round(mem.lv)] || LC[1]), pr = lk.skin + '|' + lk.hair;
    let rp = reps.find(r => r.k === pr); if (!rp && reps.length < 16) reps.push(rp = { k: pr, skin: lk.skin, hair: lk.hair }); if (!rp) rp = reps[hash(mem.id) % reps.length];
    return { ...s, m: mem, look: { skin: rp.skin, hair: rp.hair, shirt: lk.shirt }, grp: hash(String(i * 7919)) & 1, ph: (hash(String(i)) % 628) / 100, sheet: null }; });
  ST.prep = 0; ST.win = null; ST.buildMs = 0; ST.rebuilds = 0;
}

/* p89: nối sự kiện trận đấu → cổ vũ. Bọc ctx.duelSfx 1 lần (giữ hàm âm thanh gốc); ngoài sân vận động cheer() tự trả false. */
const CHEER89 = { impact_frame: 1, clash_boom: 1, ult_cast: 1, ko_freeze: 2, victory_banner: 3 };
function hookDuel89(ctx) { const o = ctx.duelSfx; if (o && o.__la89) return; const w = function (name, d) { try { const lv = CHEER89[name]; if (lv && ST.on) { cheer(ctx, lv); (ST.cheerLog ||= []).push(name); if (ST.cheerLog.length > 30) ST.cheerLog.shift(); } } catch (e) { } return o ? o.apply(this, arguments) : undefined; }; w.__la89 = true; ctx.duelSfx = w; }
/* ---------- cổ vũ (chỉ khi có sự kiện) ---------- */
const CHEER = { 1: { dur: 1.4, frac: 0.35, amp: 2 }, 2: { dur: 2.2, frac: 0.65, amp: 3 }, 3: { dur: 3.2, frac: 1, amp: 4 } };
function cheer(ctx, level = 2) {
  if (!ST.on) return false; const lv = Math.max(1, Math.min(3, Math.round(level || 2))), c = CHEER[lv];
  if (ST.cheer && ST.cheer.lv > lv && ST.cheer.t < ST.cheer.dur * 0.6) return true;   /* đang reo to hơn → giữ */
  ST.cheer = { lv, t: 0, dur: c.dur, frac: c.frac, amp: c.amp };
  if (lv >= 3) ctx.sfx('win'); else if (lv === 2) ctx.sfx('quest_step');   /* chưa có tiếng reo đám đông riêng — dùng tiếng có sẵn */
  return true;
}
function drawCheer(g, cx, cy, VW, VH) {
  const C = ST.cheer, T = C.t, env = Math.min(1, T / 0.15) * Math.min(1, (C.dur - T) / 0.35);
  for (const c of ST.crowd) {
    if (c.x < cx - 24 || c.x > cx + VW + 24 || c.y < cy - 8 || c.y > cy + VH + 40 || !c.sheet) continue;
    const r = (hash(c.m.id) % 1000) / 1000, act = r < C.frac;
    if (!act) { drawSeated(g, c, c.x - cx, c.y - cy, c.grp === ST.phase ? -0.5 : 0, 0); continue; }
    const jump = -Math.round(Math.max(0, Math.sin(T * 11 + c.ph)) * C.amp * env), fr = 1 + (Math.floor(T * 7 + c.ph) & 1);
    const x = c.x - cx, y = c.y - cy;
    const bi = hash(c.m.id + 'b') % 9, ban = C.lv >= 2 && bi === 0 ? ST.fx.banner_red : C.lv >= 2 && bi === 1 ? ST.fx.banner_blue : C.lv >= 3 && (bi === 2 || bi === 3) ? ST.fx.flag_y : null;
    if (ban) { const im = img(ban); if (im) { const w = im.naturalWidth / K, h = im.naturalHeight / K; g.drawImage(im, Math.round(x - w / 2 + (bi === 2 ? 5 : 0)), Math.round(y - SEAT_H - h + 8 + jump * 1.5), w, h); } }
    drawSeated(g, c, x, y, jump, fr);
  }
}

/* ---------- Leader ---------- */
/* p81 (plan-79 câu 3, anh chốt): BẠN TẬP — 1 người Seismic (không phải Leader) đứng cạnh cổng Nam; đội 3 con ngẫu nhiên lấy từ các loài của 15 Leader, cấp = cấp con đầu đội của người chơi */
function practiceTeam(ctx) { const pool = [...new Set(LEADER_TEAMS.flatMap(x => x[0]))], me = (ctx.duelLead && ctx.duelLead()) || null, lv = Math.max(5, (me && me.lv) || 10), out = [];
  while (out.length < 3 && pool.length) out.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]); return [out, lv]; }
function spawnPractice(ctx) {
  ST.prac = null; const m = ctx.S.map, e = (m.entries && m.entries.default) || { x: 16, y: 22 }, used = new Set(ST.leaders.map(n => n.m.id));
  const mem = rosterAll(ctx).filter(x => !ctx.isLeader(x) && !used.has(x.id)).sort((a, b) => String(a.id).localeCompare(String(b.id)))[3]; if (!mem) return;
  let at = null; for (let dy = -2; dy >= -9 && !at; dy--) for (const dx of [3, -3, 4, -4, 2, -2, 5, -5]) { const tx = e.x + dx, ty = e.y + dy; if (!ctx.isSolid(m, tx, ty) && !ctx.isSolid(m, tx, ty + 1) && !ctx.isSolid(m, tx, ty - 1)) { at = { x: tx, y: ty }; break; } }   /* lối đá cạnh cổng Nam: dò dần lên phía sân */
  if (!at) return; const n = new ctx.NPC(mem, at.x * TS + 8, at.y * TS + 14, ctx.npcSheet(mem), () => 0.5); n.busy = true; n.radius = 0; n.dir = 3; n.laPractice = true; n.laRank = -1; n.laTeam = practiceTeam(ctx);
  ctx.S.npcs.push(n); ST.prac = n;
}
function spawnLeaders(ctx) {
  ST.leaders = []; const m = ctx.S.map, spots = m.leaderSpots || [];
  const L = rosterAll(ctx).filter(x => ctx.isLeader(x)).sort((a, b) => (a.r || 0) - (b.r || 0) || String(a.id).localeCompare(String(b.id)));
  L.forEach((mem, d) => {
    const sp = spots[SPOT_OF[d]]; if (!sp) return;
    const n = new ctx.NPC(mem, sp.x * TS + 8, sp.y * TS + 14, ctx.npcSheet(mem), () => 0.5);
    n.busy = true; n.radius = 0; n.rng = Math.random; n.laRank = d; n.laTeam = LEADER_TEAMS[d];
    const vx = ctx.S.map.stadium.geo.CX - n.x, vy = ctx.S.map.stadium.geo.CY - n.y; n.dir = Math.abs(vy) * 1.5 > Math.abs(vx) ? (vy > 0 ? 0 : 3) : (vx < 0 ? 1 : 2);
    ctx.S.npcs.push(n); ST.leaders.push(n);
  });
}
const T_ = ctx => (vi(ctx) ? {
  prac: 'Bạn tập · đấu luyện tập — thắng thua không mất gì', pracLbl: n => `E · Đấu tập với ${n}`, pracWin: 'Thắng trận tập! Đội đã nóng máy.', pracLose: 'Thua trận tập — không sao, tập tiếp!',
  ask: (n) => `Thách đấu Chấn Thú với <b>${esc(n)}</b>?`, team: 'Đội 3 thú', lv: 'cấp', go: '⚔ Thách đấu', later: 'Để sau', won: '✓ Đã thắng', rank: (d) => `Leader bậc ${d + 1}/15`,
  soon: 'Đấu linh thú sắp mở — trận 3 đấu 3 đang được hoàn thiện.', label: n => `Thách đấu ${n}`, win: n => `Thắng Leader ${n}! Nhận huy hiệu Leader.`, lose: n => `${n} thắng trận này. Luyện thêm rồi quay lại nhé!`,
  champ: 'VÔ ĐỊCH ĐẤU TRƯỜNG LEADER! Đã thắng cả 15 Leader.', hud: (w) => `★ Leader đã thắng ${w}/15`, board: 'ĐẤU TRƯỜNG LEADER'
} : {
  prac: 'Sparring partner · practice match — nothing to lose', pracLbl: n => `E · Spar with ${n}`, pracWin: 'Practice won! Your team is warmed up.', pracLose: 'Practice lost — no harm, keep training!',
  ask: (n) => `Challenge <b>${esc(n)}</b> to a spirit-beast duel?`, team: 'Team of 3', lv: 'lv', go: '⚔ Challenge', later: 'Later', won: '✓ Beaten', rank: (d) => `Leader rank ${d + 1}/15`,
  soon: 'Spirit-beast duels open soon — 3 vs 3 battles are still being finished.', label: n => `Challenge ${n}`, win: n => `You beat Leader ${n}! Leader badge earned.`, lose: n => `${n} wins this one. Train up and come back!`,
  champ: 'LEADER ARENA CHAMPION! All 15 Leaders beaten.', hud: (w) => `★ Leaders beaten ${w}/15`, board: 'LEADER ARENA'
});
const nameOf = n => n.m.n || n.m.k || n.m.id;
const spN = (ctx, s) => (ctx.ldKit && ctx.ldKit.name ? ctx.ldKit.name(s) : SPN[s] || s);   /* p81: tên loài theo duel-data hiện tại (có tiếng Anh) */
function openAsk(ctx, n) {
  if (n.laPractice) n.laTeam = practiceTeam(ctx);   /* p81: bạn tập — đội mới mỗi lần hỏi */
  const t = T_(ctx), d = sv(ctx), [team, lv] = n.laTeam, won = !n.laPractice && !!d.wins[n.m.id];
  const av = ctx.avatarHTML ? ctx.avatarHTML(n.m) : '';
  const html = `<div style="display:flex;gap:12px;align-items:center">${av}<div><p style="margin:0;font:22px VT323,monospace">${t.ask(nameOf(n))}</p><p class="dim" style="margin:2px 0 0;font:18px VT323,monospace">${n.laPractice ? t.prac : t.rank(n.laRank)}${won ? ' · ' + t.won : ''}</p></div></div>`
    + `<p style="margin:8px 0 0;font:18px VT323,monospace">${t.team} (${t.lv} ${lv}): ${team.map(s => esc(spN(ctx, s))).join(' · ')}</p>`
    + `<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:10px;flex-wrap:wrap"><button class="btn primary" id="la-go">${t.go}</button><button class="btn" id="la-x">${t.later}</button></div>`;
  const el = ctx.panel('leaderask', html); el.panel.style.cssText = 'border:20px solid transparent;border-image:url(assets/px/ui/frame.png) 20 / 20px round;border-radius:0;image-rendering:pixelated;background:#1c1424;background-clip:padding-box;max-width:520px';
  el.hidden = false; ctx.setMode('leaderask');
  const close = () => { el.hidden = true; ctx.setMode('play'); };
  ctx.registerCloser('leaderask', close);
  el.panel.querySelector('#la-x').onclick = close;
  el.panel.querySelector('#la-go').onclick = () => { close(); start(ctx, n); };
  ST.ask = { leader: n.m.id, el };
  return el;
}
function start(ctx, n) {
  const t = T_(ctx), [team, lv] = n.laTeam;
  if (!(ctx.duel && typeof ctx.duel.start === 'function')) { ctx.toast(t.soon); return false; }
  const opts = { foe: n.m.id, foeNpc: n, team: team.map(sp => ({ sp, lv })), field: 'leader_arena', leaderRank: n.laRank,
    onWin: () => (n.laPractice ? (ctx.toast(t.pracWin), cheer(ctx, 2)) : win(ctx, n)), onLose: () => { ctx.toast(n.laPractice ? t.pracLose : t.lose(nameOf(n))); cheer(ctx, 1); } };   /* p81: bạn tập không cho / không mất gì */
  cheer(ctx, 1);
  try { ctx.duel.start(opts); } catch (e) { console.error('leaderarena duel', e); ctx.toast(t.soon); return false; }
  return true;
}
function win(ctx, n) {
  const t = T_(ctx), d = sv(ctx), id = n.m.id, first = !d.wins[id];
  d.wins[id] = ctx.clock ? ctx.clock.dayIndex + 1 : 1; if (!d.badges.includes(id)) d.badges.push(id);
  if (first) ctx.give('stone', 40 + 20 * n.laRank, n.x, n.y + 12);
  cheer(ctx, 3); ctx.toast(t.win(nameOf(n)), true);
  if (!d.champion && ST.leaders.length && ST.leaders.every(l => d.wins[l.m.id])) { d.champion = true; setTimeout(() => ctx.toast(t.champ, true), 1800); }
  ctx.persist();
}

export const leaderarena = {
  id: 'leaderarena',
  onZoneEnter(ctx) {
    ST.ctx = ctx; ST.on = !!(ctx.S.map && ctx.S.map.stadium); ST.cheer = null; ST.leaders = []; ST.win = null; ST.crowd = [];
    ctx.crowdCheer = level => cheer(ctx, level);
    hookDuel89(ctx);   /* p89: trận đấu (linhduel) báo sự kiện qua ctx.duelSfx → khán giả reo NGẮN: đòn mạnh (impact / đụng chưởng / tuyệt chiêu) 1, hạ thú 2, thắng 3 */   /* API cho hệ đấu (ra đòn mạnh 1–2, hạ thú 2, thắng 3); ngoài sân vận động → false */
    if (typeof window !== 'undefined') window.__la = {
      on: () => ST.on, cheer: lv => cheer(ctx, lv), cheerLog: () => (ST.cheerLog || []).slice(), crowdLv: () => { const c = {}; for (const q of ST.crowd) { const k = q.m ? q.m.lv : '?'; c[k] = (c[k] || 0) + 1; } return c; }, cheering: () => (ST.cheer ? { ...ST.cheer } : null),
      crowd: () => ({ n: ST.crowd.length, prep: ST.prep, ms: Math.round(ST.buildMs), ready: ST.crowd.length > 0 && ST.prep >= ST.crowd.length, ids: new Set(ST.crowd.map(c => c.m && c.m.id)).size, sheets: new Set(ST.crowd.map(c => c.sheet)).size, rebuilds: ST.rebuilds, rebMs: +(ST.rebMs || 0).toFixed(2) }),
      leaders: () => ST.leaders.map(n => ({ id: n.m.id, n: nameOf(n), x: n.x, y: n.y, rank: n.laRank, team: n.laTeam })),
      state: () => JSON.parse(JSON.stringify(sv(ctx))), ask: () => ST.ask && { leader: ST.ask.leader, open: !ST.ask.el.hidden }, start: i => start(ctx, ST.leaders[i]), win: i => win(ctx, ST.leaders[i]), prac: () => ST.prac && { id: ST.prac.m.id, n: nameOf(ST.prac), x: ST.prac.x, y: ST.prac.y }, pracStart: () => { ST.prac.laTeam = practiceTeam(ctx); return start(ctx, ST.prac); },
    };
    if (!ST.on) return;
    ST.fx = { banner_red: 'zones/leader_arena/fx/banner_red.png', banner_blue: 'zones/leader_arena/fx/banner_blue.png', flag_y: 'zones/leader_arena/fx/flag_y.png' };
    img(ctx.S.map.stadium.bg); for (const f of Object.values(ST.fx)) img(f);
    sv(ctx); spawnLeaders(ctx); spawnPractice(ctx); setupCrowd(ctx);
  },
  onZoneLeave() { ST.prac = null; ST.on = false; ST.win = null; ST.crowd = []; ST.leaders = []; ST.cheer = null; },
  update(dt, ctx) {
    if (!ST.on) return; ST.t += dt;
    if (ST.prep < ST.crowd.length) prepSheets(ctx, 6);   /* chuẩn bị sheet khán giả rải nhiều khung (≤ 6 ms/khung, không giật lúc vào vùng) */
    ST.phT += dt; if (ST.phT > 0.8) { ST.phT = 0; ST.phase ^= 1; }   /* nhấp nhô thưa: đổi đệm 0,8 s/lần */
    if (ST.cheer) { ST.cheer.t += dt; if (ST.cheer.t >= ST.cheer.dur) ST.cheer = null; }
    for (const n of ST.leaders) { n.busy = true; n.goal = null; n.path = null; }
  },
  drawGround(g, ctx, cx, cy) {
    if (!ST.on) return; const m = ctx.S.map, VW = ctx.VW, VH = ctx.VH, bg = img(m.stadium.bg);
    const x0 = Math.max(-MARG, cx), y0 = Math.max(-MARG, cy), x1 = Math.min(m.w * TS + MARG, cx + VW), y1 = Math.min(m.h * TS + MARG, cy + VH);
    if (bg && x1 > x0 && y1 > y0) g.drawImage(bg, (x0 + MARG) * K, (y0 + MARG) * K, (x1 - x0) * K, (y1 - y0) * K, x0 - cx, y0 - cy, x1 - x0, y1 - y0);
    if (ST.cheer) { drawCheer(g, cx, cy, VW, VH); return; }
    const B = ST.win;
    if (!B || B.ph !== ST.phase || B.w !== VW + 2 * WPAD || B.h !== VH + 2 * WPAD || cx < B.x || cy < B.y || cx + VW > B.x + B.w || cy + VH > B.y + B.h || (B.n < ST.crowd.length && B.n !== ST.prep)) winRebuild(ctx, cx, cy, VW, VH);
    const W2 = ST.win; g.drawImage(W2.c, cx - W2.x, cy - W2.y, VW, VH, 0, 0, VW, VH);
  },
  near(ctx) {
    if (!ST.on || ctx.S.mode !== 'play') return null; if (ctx.duel && ctx.duel.active && ctx.duel.active()) return null;
    const p = ctx.S.player; let best = null, bd = 30;
    for (const n of ST.leaders.concat(ST.prac ? [ST.prac] : [])) { const d = Math.hypot(n.x - p.x, n.y - p.y); if (d < bd) { bd = d; best = n; } }
    return best ? { label: best.laPractice ? T_(ctx).pracLbl(nameOf(best)) : T_(ctx).label(nameOf(best)), x: best.x, y: best.y - 4, limit: 30, priority: true, data: { leader: best } } : null;
  },
  interact(ctx, cand) { const n = cand && cand.data && cand.data.leader; if (n) openAsk(ctx, n); },
  drawUI(ug, ctx, cx, cy, scale) {   /* chữ trên màn hình lớn (bảng tỉ số PixelLab la_score) */
    if (!ST.on || ctx.S.hideLabels) return; const o = ctx.S.map.objects.find(o => o.type === 'la_score'); if (!o) return; const d = ctx.O[o.type];
    const sx = (o.x * TS + (d.ox || 0) + d.w / 2 - cx) * scale, top = ((o.y + d.fh) * TS - d.h - cy) * scale; if (sx < -200 || sx > ug.canvas.width + 200 || top > ug.canvas.height || top + d.h * scale < 0) return;
    const t = T_(ctx), w = Object.keys(sv(ctx).wins).length, fs = Math.max(10, Math.round((globalThis.__u89?globalThis.__u89(scale):scale) * 3.6));
    ug.save(); ug.textAlign = 'center'; ug.textBaseline = 'middle'; ug.font = `bold ${fs}px VT323, monospace`; ug.fillStyle = '#ffd45e';
    ug.fillText(t.board, sx, top + d.h * scale * 0.3); ug.font = `bold ${Math.round(fs * 1.5)}px VT323, monospace`; ug.fillStyle = '#9fe0ff'; ug.fillText(`★ ${w} / 15`, sx, top + d.h * scale * 0.52); ug.restore();
  },
  hudLines(ctx) { if (!ST.on) return []; return [T_(ctx).hud(Object.keys(sv(ctx).wins).length)]; },
};
