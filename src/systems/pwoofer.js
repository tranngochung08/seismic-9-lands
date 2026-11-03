/* pwoofer.js — p101 (plan-92, anh duyệt Pwoofer v2 2026-11-02): NPC "Đại sứ Succinct" ở Quảng Trường Làng mới (bản đồ p88/p89).
   · Ảnh: PixelLab character 627886a8… (pro 40 px) + clip v3 đi / đứng thở 4 hướng (W = lật E), đóng gói bằng tools/px-p101pack.py
     → assets/px/npc/pwoofer/{walk,idle}_{S,E,N,W}.png (dải ngang, ô 48×52 ảnh = 24×26 px logic, chân ở hàng 48 → vẽ 1:1 theo ½ ảnh, không phóng).
   · Đứng ở mép Đông quảng trường (ô HOME), đi dạo ngắn trong bán kính WANDER, dừng lại quay về phía người chơi khi người chơi tới gần.
   · Không phải vật cản (không chắn lối); có bóng dưới chân (shadow.js); nhãn tên chỉ hiện khi người chơi ở gần hoặc trỏ chuột vào.
   · E / bấm → hộp thoại của game (khung pixel ui.dialog) với vài câu giới thiệu Succinct, vi / en. */
import { shadowFor } from './shadow.js';

const DIR = 'assets/px/npc/pwoofer/', CW = 48, CH = 52, FOOT = 48, NF = 8;
const HOME = { tx: 91, ty: 60 }, WANDER = 22, SPEED = 20, NEAR = 26, NAME_R = 56, STOP_R = 34;
const IM = {};
function im(k) { if (typeof Image === 'undefined') return null; let i = IM[k]; if (!i) { i = IM[k] = new Image(); i.src = DIR + k + '.png'; } return i.complete && i.naturalWidth ? i : null; }
for (const c of ['walk', 'idle']) for (const d of 'SENW') im(`${c}_${d}`);

const TXT = {
  vi: {
    title: 'Đại sứ Succinct', talk: 'Nói chuyện với Pwoofer',
    first: ['Gâu! Mình là Pwoofer, đại sứ của Succinct ghé thăm làng mình.',
      'Succinct làm "bằng chứng không tiết lộ" (zero-knowledge proof): chứng minh một phép tính đã chạy đúng, người kiểm không cần chạy lại.',
      'Kiểu như mình bảo "đã đếm đủ 1.000 cục xương" rồi đưa kèm một tờ giấy nhỏ — ai cũng soát được trong chớp mắt, khỏi phải đếm lại. Gâu!'],
    more: [
      ['SP1 là máy ảo của Succinct: viết chương trình bằng Rust như bình thường, rồi tạo bằng chứng rằng nó chạy đúng.'],
      ['Mạng Prover của Succinct: nhiều máy ở khắp nơi nhận việc tạo bằng chứng, máy nào làm nhanh và đúng thì được giao việc.'],
      ['Bằng chứng thì nhỏ mà kiểm lại rất nhanh — có ích cho blockchain, cho cầu nối giữa các chuỗi, và mọi chỗ cần tin kết quả mà không phải tin một ai.'],
      ['Mình được vẽ theo một chú chó thật tên Pwoof đó. Muốn biết thêm về Succinct thì hỏi cộng đồng của họ nhé.'],
    ],
  },
  en: {
    title: 'Succinct Ambassador', talk: 'Talk to Pwoofer',
    first: ['Woof! I\'m Pwoofer, Succinct\'s ambassador, visiting your village.',
      'Succinct builds zero-knowledge proofs: a way to prove a computation ran correctly without the checker having to run it again.',
      'Like me saying "I counted all 1,000 bones" and handing you a tiny slip anyone can check in a blink, no recounting needed. Woof!'],
    more: [
      ['SP1 is Succinct\'s zkVM: write a normal Rust program, then generate a proof that it ran correctly.'],
      ['The Succinct Prover Network: machines all over take proving jobs, and the ones that prove fast and correctly get the work.'],
      ['Proofs are small and quick to verify, which helps blockchains, bridges between chains, and anywhere you need to trust a result without trusting anyone.'],
      ['I\'m drawn after a real dog named Pwoof. Want to know more about Succinct? Ask their community.'],
    ],
  },
};
const T = ctx => TXT[ctx.lang && ctx.lang() === 'vi' ? 'vi' : 'en'];
const M = { id: 'pwoofer', n: 'Pwoofer', friend: true, a: DIR + 'portrait.png', title: { vi: TXT.vi.title, en: TXT.en.title } };

const P = { on: false, x: 0, y: 0, hx: 0, hy: 0, dir: 'S', goal: null, wait: 1.5, walkT: 0, idleT: 0, talking: false, said: 0, moved: 0, faceT: 0 };
function home(ctx) { const TS = ctx.TS || 16; P.hx = HOME.tx * TS + 8; P.hy = HOME.ty * TS + 12; }
function free(ctx, x, y) {   /* ô đi được (không cứng, không nước) ở chân */
  const TS = ctx.TS || 16, m = ctx.S.map; if (!m) return false; const tx = Math.floor(x / TS), ty = Math.floor(y / TS);
  if (tx < 0 || ty < 0 || tx >= m.w || ty >= m.h) return false; return !(ctx.isSolid && ctx.isSolid(m, tx, ty));
}
function face(dx, dy) { return Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'E' : 'W') : (dy > 0 ? 'S' : 'N'); }
function pickGoal(ctx) {
  for (let k = 0; k < 8; k++) { const a = Math.random() * Math.PI * 2, r = 6 + Math.random() * WANDER, x = P.hx + Math.cos(a) * r, y = P.hy + Math.sin(a) * r * 0.7; if (free(ctx, x, y)) return { x, y }; }
  return { x: P.hx, y: P.hy };
}
if (typeof window !== 'undefined') window.__pwoofer = { st: () => ({ on: P.on, x: Math.round(P.x), y: Math.round(P.y), dir: P.dir, walking: !!P.goal, talking: P.talking, said: P.said, moved: Math.round(P.moved), home: [HOME.tx, HOME.ty], ready: !!im('idle_S') }), stop: (v = true) => { P.freeze = v; P.goal = null; }, hide: (v = true) => { P.hidden = v; }, place: (x, y, dir) => { P.x = x; P.y = y; if (dir) P.dir = dir; P.goal = null; } };   /* hide / place: chỉ cho test đo cỡ */

export const pwoofer = {
  id: 'pwoofer',
  onZoneEnter(ctx) {
    const m = ctx.S.map; P.on = !!(m && m.v88); P.talking = false; if (!P.on) return;
    home(ctx); P.x = P.hx; P.y = P.hy; P.dir = 'S'; P.goal = null; P.wait = 1.5; P.moved = 0;
  },
  onZoneLeave() { P.on = false; },
  update(dt, ctx) {
    if (!P.on) return; const S = ctx.S, p = S.player; P.idleT += dt;
    if (P.talking) { if (S.mode !== 'dialog') P.talking = false; else { P.goal = null; return; } }
    const dp = p ? Math.hypot(p.x - P.x, p.y - P.y) : 999;
    if (dp < STOP_R && S.mode === 'play') { P.goal = null; P.wait = Math.max(P.wait, 1.2); P.faceT -= dt; if (P.faceT <= 0) { P.dir = face(p.x - P.x, p.y - P.y); P.faceT = 0.35; } return; }   /* người chơi tới gần → đứng lại, quay sang chào */
    if (P.freeze) return;
    if (!P.goal) { P.wait -= dt; if (P.wait <= 0) { P.goal = pickGoal(ctx); } return; }
    const dx = P.goal.x - P.x, dy = P.goal.y - P.y, d = Math.hypot(dx, dy);
    if (d < 1.5) { P.goal = null; P.wait = 2.5 + Math.random() * 3.5; return; }
    const s = Math.min(d, SPEED * dt), nx = P.x + dx / d * s, ny = P.y + dy / d * s;
    if (!free(ctx, nx, ny)) { P.goal = null; P.wait = 1; return; }
    P.x = nx; P.y = ny; P.moved += s; P.walkT += dt; P.dir = face(dx, dy);
  },
  near(ctx) {
    if (!P.on || ctx.S.mode !== 'play') return null; const p = ctx.S.player, d = Math.hypot(p.x - P.x, p.y - P.y);
    if (d > NEAR + 6) return null;
    return { label: '💬 ' + T(ctx).talk, x: P.x, y: P.y - 10, limit: NEAR + 6, priority: 1, data: { pwoofer: true } };   /* core đo khoảng cách tới (x, y) này: lấy giữa thân; priority thắng 'Vuốt ve Rocky' khi Rocky đứng sát */
  },
  interact(ctx, cand) {
    if (!cand || !cand.data || !cand.data.pwoofer) return; const t = T(ctx), S = ctx.S, p = S.player;
    const sv = (S.save.flags ||= {}); const first = !sv['p101:pwoofer'];
    const pages = first ? t.first.slice() : t.more[(sv['p101:pwoofer'] - 1) % t.more.length].slice();
    sv['p101:pwoofer'] = (sv['p101:pwoofer'] || 0) + 1; P.said++;
    P.goal = null; P.talking = true; P.dir = face(p.x - P.x, p.y - P.y); if (p.faceTo) p.faceTo(P.x, P.y);
    ctx.setMode('dialog');
    ctx.openDialog({ m: M, pages, onClose: () => { ctx.setMode('play'); P.talking = false; P.wait = 2; ctx.persist && ctx.persist(); } });
  },
  drawGround(g, ctx, cx, cy) {
    if (!P.on) return; try { shadowFor(g, P.x, P.y, Math.round(P.x - cx), Math.round(P.y - cy) + 1, (globalThis.__fw110 ? globalThis.__fw110('pwoofer', 12) : 12)); } catch (e) { /* bóng là phụ */ }
  },
  drawables(ctx, cx, cy) {
    if (!P.on || P.hidden) return []; const walking = !!P.goal, img = im(`${walking ? 'walk' : 'idle'}_${P.dir}`) || im('idle_S'); if (!img) return [];
    const f = walking ? Math.floor(P.walkT * 9) % NF : Math.floor(P.idleT * 5) % NF, g = ctx.g;
    const x = Math.round(P.x - CW / 4) - cx, y = Math.round(P.y - FOOT / 2) - cy;
    return [{ y: P.y, f: () => g.drawImage(img, f * CW, 0, CW, CH, x, y, CW / 2, CH / 2) }];   /* 9 tham số: ảnh thường (không __hi), ½ cỡ ảnh = cỡ logic */
  },
  drawUI(ug, ctx, cx, cy, scale) {   /* nhãn tên: chỉ khi người chơi ở gần hoặc trỏ chuột vào Pwoofer (anh: bớt rối) */
    if (!P.on || ctx.S.mode !== 'play' || ctx.S.hideLabels) return; const p = ctx.S.player, dp = Math.hypot(p.x - P.x, p.y - P.y);
    const mt = ctx.mouseTile && ctx.mouseTile(), hov = mt && Math.abs(mt.wx - P.x) < 9 && mt.wy > P.y - 24 && mt.wy < P.y + 3;
    if (dp > NAME_R && !hov) return; const nr = ctx.S.near; if (nr && nr.kind === 'sys' && nr.sys === pwoofer) return;   /* đang hiện nhắc 'Nói chuyện với Pwoofer' (đã có tên) → khỏi nhãn trùng */
    const a = hov ? 1 : Math.max(0, Math.min(1, (NAME_R - dp) / 14)), t = T(ctx), fs = Math.max(10, Math.round((globalThis.__u89?globalThis.__u89(scale):scale) * 3));
    const sx = (P.x - cx) * scale, sy = (P.y - 26 - cy) * scale, txt = 'Pwoofer · ' + t.title;
    ug.save(); ug.globalAlpha = a; ug.font = `${fs}px VT323, monospace`; ug.textAlign = 'center'; ug.textBaseline = 'alphabetic';
    const w = ug.measureText(txt).width + 8, h = fs + 4;
    ug.fillStyle = 'rgba(13,11,20,.6)'; ug.beginPath(); if (ug.roundRect) ug.roundRect(sx - w / 2, sy - h, w, h, 3); else ug.rect(sx - w / 2, sy - h, w, h); ug.fill();
    ug.fillStyle = '#ffd45e'; ug.fillText(txt, sx, sy - 2); ug.restore();
  },
};
