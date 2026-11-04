/* nhandien22.js — c22-nhandien (anh 04/11: "nhân vật hơi bị lạc quẻ giữa map" — dễ nhận ra NHÂN VẬT + CHẤN THÚ CỦA MÌNH; đặt tên + thanh máu Chấn Thú).
   · Mọi dấu đều TĨNH (luật anh chốt: không hào quang xoay / nhấp nháy lặp).
   · Vòng elip pixel VÀNG dưới chân người chơi + vòng nhỏ cùng tông dưới mỗi Chấn Thú đang thả (squad104 / Elyziuma) — lớp nền (drawGround), vẽ code từng pixel
     (nửa sau sẫm hơn nửa trước cho ra mặt đất + 1 px bóng tối phía dưới để nổi trên cỏ / cát).
   · Phương án 'b' thêm VIỀN SÁNG 1 px quanh sprite người chơi (drawables, ngay trước thân người chơi); 'c' chỉ có viền, không vòng.
   · Chấn Thú của mình: tên nhỏ (vàng nhạt) + thanh máu XANH mảnh LUÔN hiện trên đầu (khung obar_s của target91 qua globalThis.__ob91);
     squad104.drawUI tự bỏ thanh cũ khi globalThis.__nd22on bật (vá chuỗi nhỏ ở lớp c22) để không vẽ trùng.
   · Tên: lấy từ đội (save.sys.chanthu.team[].name — đổi ở bảng Đội Chấn Thú); tên trùng tên loài tiếng Việt → hiện tên loài theo ngôn ngữ.
     Ô đổi tên của bảng Đội / bảng chọn con khởi đầu: lọc ký tự lạ + tối đa 12 ký tự (lắng nghe sự kiện input trên document, không sửa chanthu.js).
   · Chơi chung (coop): chỉ máy của mình vẽ vòng / tên / máu cho người chơi + Chấn Thú của CHÍNH mình; người khác không có vòng (coop.js chưa gửi máu / tên Chấn Thú).
   · Chọn phương án: ?nd22=off|a|b|c, hoặc window.__nd22.v('a'). Mặc định: DEF bên dưới. */
import { SPECIES, SPECIES_EN } from './duel-data.js';

const DEF = 'b';   /* anh xem ảnh so shots/so_*.png: b = vòng + viền sáng người chơi */
const NAME_MAX = 12;
const COL = { front: '#ffd45e', back: '#c98e2c', dark: 'rgba(30,18,6,0.55)', line: '#fff3b8', name: '#ffe9a0' };
const ST = { v: DEF, ring: new Map(), hgt: new Map(), oc: null, sc: null, bound: false, n: { ring: 0, pet: 0 }, drawn: [] };

const vi = ctx => !(ctx.lang && ctx.lang() === 'en');
const duelOn = ctx => !!(ctx.duel && ctx.duel.active && ctx.duel.active());
const R = v => Math.round(v);

/* ---------- vòng elip pixel (cache theo cỡ) ---------- */
function ringCv(rx, ry) {
  const k = rx + 'x' + ry; if (ST.ring.has(k)) return ST.ring.get(k);
  if (typeof document === 'undefined') return null;
  const W = rx * 2 + 3, H = ry * 2 + 4, c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
  const ox = W / 2, oy = ry + 1.5, ins = (x, y) => { const dx = (x + 0.5 - ox) / rx, dy = (y + 0.5 - oy) / ry; return dx * dx + dy * dy <= 1; };
  const on = new Set(), px = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (ins(x, y) && (!ins(x - 1, y) || !ins(x + 1, y) || !ins(x, y - 1) || !ins(x, y + 1))) { on.add(x + ',' + y); px.push([x, y]); }
  g.fillStyle = COL.dark; for (const [x, y] of px) if (!on.has(x + ',' + (y + 1))) g.fillRect(x, y + 1, 1, 1);   /* 1 px bóng tối dưới vòng */
  for (const [x, y] of px) { g.fillStyle = y + 0.5 < oy ? COL.back : COL.front; g.fillRect(x, y, 1, 1); }
  const o = { c, W, H, ox, oy }; ST.ring.set(k, o); return o;
}
function ring(g, wx, wy, cx, cy, rx, ry) {
  const o = ringCv(rx, ry); if (!o) return;
  g.drawImage(o.c, 0, 0, o.W, o.H, R(wx - cx - o.ox), R(wy - cy + 1 - o.oy), o.W, o.H); ST.n.ring++;
}

/* ---------- Chấn Thú đang thả của mình ---------- */
function pets(ctx) {
  const out = [], Q = ctx.squad104; if (!Q || !Q.units) return out;
  let tm = []; try { tm = ctx.chanthu && ctx.chanthu.team ? ctx.chanthu.team() : []; } catch (e) { tm = []; }
  for (const u of Q.units()) {
    let ok = false; try { ok = u.onField(); } catch (e) { ok = false; } if (!ok) continue;
    const m = tm.find(q => q.id === u.id) || u.m;
    if (u.sp === 'elyziuma' && ctx.elyz95) { const E = ctx.elyz95.E && ctx.elyz95.E(); if (!E || E.ko) continue; out.push({ u, m, ely: true, x: E.x, y: E.y, hp: E.hp, max: E.max, fw: 26, top: 32 });   /* ely.json idle ay 61 px ảnh = 30,5 logic */ continue; }
    const f = u.f; if (!f || u.ko) continue;
    const fw0 = u.sp === 'rocky' ? 22 : f.tier === 'l' ? 18 : f.tier === 's' ? 10 : 13, fw = globalThis.__fw110 ? globalThis.__fw110(f.sp, fw0) : fw0;
    out.push({ u, m, f, x: f.x, y: f.y - (f.alt || 0), gy: f.y, hp: u.hp, max: u.max, fw, top: heightOf(ctx, f) });
  }
  return out;
}
function heightOf(ctx, f) {   /* chiều cao sprite trận (px logic, chân → đỉnh) — đo 1 lần mỗi loài từ chính ảnh PixelLab */
  const k = f.sp + '|' + (f.tier || ''); if (ST.hgt.has(k)) return ST.hgt.get(k);
  const def = f.sp === 'rocky' ? 34 : f.tier === 'l' ? 32 : 24;
  if (typeof document === 'undefined' || !ctx.ldKit || !ctx.ldKit.ready()) return def;
  try {
    const c = document.createElement('canvas'); c.width = 160; c.height = 160; const g = c.getContext('2d');
    const px = Object.create(f); px.clip = 'idle'; px.ct = 0; px.flash = 0; px.tint = 0; px.alt = 0; px.decoy = null; px.status = null;
    ctx.ldKit.draw(g, px, f.x - 80, f.y - 140);
    const d = g.getImageData(0, 0, 160, 160).data; let top = -1;
    for (let y = 0; y < 160 && top < 0; y++) for (let x = 0; x < 160; x++) if (d[(y * 160 + x) * 4 + 3] > 100) { top = y; break; }
    if (top < 0) return def;   /* ảnh chưa tải xong — đo lại khung sau */
    const h = Math.max(12, 140 - top); ST.hgt.set(k, h); return h;
  } catch (e) { ST.hgt.set(k, def); return def; }
}
function petName(ctx, m, sp) {
  const spVi = SPECIES[sp] ? SPECIES[sp].name : sp, spLoc = (!vi(ctx) && SPECIES_EN && SPECIES_EN[sp]) || spVi;
  let n = m && m.name ? clean(m.name) : ''; if (!n || n === spVi) n = spLoc; return n;
}
export function clean(s) { return String(s || '').replace(/[^\p{L}\p{M}\p{N} _.'\-]/gu, '').replace(/\s+/g, ' ').trimStart().slice(0, NAME_MAX); }

/* ---------- viền sáng 1 px quanh người chơi (phương án b / c) ---------- */
function outline(g, ctx, p, cx, cy) {
  if (typeof document === 'undefined' || ctx.S.swimming) return;
  const W = 72, H = 96, AX = 36, AY = 80;
  if (!ST.oc) { ST.oc = document.createElement('canvas'); ST.oc.width = W; ST.oc.height = H; ST.sc = document.createElement('canvas'); ST.sc.width = W; ST.sc.height = H; }
  const og = ST.oc.getContext('2d'), sg = ST.sc.getContext('2d');
  og.setTransform(1, 0, 0, 1, 0, 0); og.clearRect(0, 0, W, H); og.imageSmoothingEnabled = false;
  const bx = R(p.x), by = R(p.y);
  try { og.save(); og.translate(AX - bx, AY - by); p.draw(og); og.restore(); } catch (e) { try { og.restore(); } catch (e2) { } return; }
  sg.setTransform(1, 0, 0, 1, 0, 0); sg.globalCompositeOperation = 'source-over'; sg.clearRect(0, 0, W, H); sg.drawImage(ST.oc, 0, 0);
  sg.globalCompositeOperation = 'source-in'; sg.fillStyle = COL.line; sg.fillRect(0, 0, W, H); sg.globalCompositeOperation = 'source-over';
  const x0 = bx - cx - AX, y0 = by - cy - AY; g.save(); g.imageSmoothingEnabled = false; g.globalAlpha = 0.9;
  g.drawImage(ST.sc, x0 - 1, y0); g.drawImage(ST.sc, x0 + 1, y0); g.drawImage(ST.sc, x0, y0 - 1); g.drawImage(ST.sc, x0, y0 + 1); g.restore();
}

/* ---------- lọc ô đổi tên (bảng Đội / bảng chọn con khởi đầu của chanthu.js) ---------- */
function bindInputs() {
  if (ST.bound || typeof document === 'undefined') return; ST.bound = true;
  const sel = '#ct-panel input[data-id], #ct-panel #ct-name';
  const fix = el => { const v = clean(el.value); if (v !== el.value) { const pos = Math.min(v.length, el.selectionStart || v.length); el.value = v; try { el.setSelectionRange(pos, pos); } catch (e) { } } };
  document.addEventListener('focusin', e => { const el = e.target; if (el && el.matches && el.matches(sel)) { el.maxLength = NAME_MAX; el.setAttribute('autocomplete', 'off'); el.setAttribute('enterkeyhint', 'done'); fix(el); } }, true);
  document.addEventListener('input', e => { const el = e.target; if (el && el.matches && el.matches(sel) && !e.isComposing) fix(el); }, true);
  document.addEventListener('compositionend', e => { const el = e.target; if (el && el.matches && el.matches(sel)) fix(el); }, true);
}

export const nhandien22 = {
  id: 'nhandien22',
  always: true,
  onZoneEnter(ctx) {   /* main.js không gọi init của hệ → khởi tạo ở đây (hệ always: chạy mọi vùng) */
    if (ST.v0 == null) { ST.v0 = 1;
      try { const q = typeof location !== 'undefined' && /[?&]nd22=(off|a|b|c)\b/.exec(location.search); if (q) ST.v = q[1]; } catch (e) { }
    }
    globalThis.__nd22on = ST.v !== 'off';
    bindInputs();
    if (typeof window !== 'undefined') window.__nd22 = {
      v: x => { if (x && /^(off|a|b|c)$/.test(x)) ST.v = x; globalThis.__nd22on = ST.v !== 'off'; return ST.v; },
      pets: () => pets(ctx).map(e => ({ id: e.u.id, sp: e.u.sp, name: petName(ctx, e.m, e.u.sp), hp: R(e.hp), max: e.max, x: R(e.x), y: R(e.y), top: e.top, ely: !!e.ely })),
      drawn: () => ST.drawn.slice(), n: () => ({ ...ST.n }), clean,
    };
  },
  drawGround(g, ctx, cx, cy) {
    if (ST.v === 'off' || ST.v === 'c' || ctx.S.mode !== 'play' || duelOn(ctx)) return;
    const p = ctx.S.player; if (!p) return;
    g.save(); g.imageSmoothingEnabled = false; g.globalAlpha = 0.92;
    for (const e of pets(ctx)) { const rx = Math.max(7, R(e.fw / 2) + 3); ring(g, e.x, e.gy != null ? e.gy : e.y, cx, cy, rx, Math.max(2, R(rx * 0.36))); }
    if (!ctx.S.swimming) ring(g, p.x, p.y, cx, cy, 10, 4);
    g.restore();
  },
  drawables(ctx, cx, cy) {
    if ((ST.v !== 'b' && ST.v !== 'c') || ctx.S.mode !== 'play' || duelOn(ctx)) return [];
    const p = ctx.S.player; if (!p || p.hidden) return [];
    return [{ y: p.y + (p.sortUp || 0) - 0.001, f: () => outline(ctx.g, ctx, p, cx, cy) }];
  },
  drawUI(ug, ctx, cx, cy, scale) {
    ST.drawn = []; if (ST.v === 'off' || ctx.S.mode !== 'play' || duelOn(ctx) || ctx.S.hideLabels) return;
    const su = ctx.scaleUI || scale, ob = globalThis.__ob91, W = ug.canvas.width, H = ug.canvas.height, fs = Math.max(11, R(su * 2.7));
    ug.save(); ug.font = `bold ${fs}px VT323, monospace`; ug.textAlign = 'center'; ug.textBaseline = 'bottom';
    for (const e of pets(ctx)) {
      const sx = R((e.x - cx) * scale), headY = (e.y - e.top - cy) * scale; if (sx < -80 || sx > W + 80 || headY < -60 || headY > H + 60) continue;
      const bw = R(su * (e.ely ? 13 : 11)), bh = Math.max(8, R(su * 2.6)), name = petName(ctx, e.m, e.u.sp), tw = Math.ceil(ug.measureText(name).width) + 8, th = fs + 2;
      let by = R(headY - Math.max(3, su * 1.2) - bh), ty = by - 1;   /* thanh ngay trên đầu, tên ngay trên thanh */
      const blockH = th + 1 + bh, bx0 = sx - Math.max(tw, bw) / 2;
      const dy = ctx.lblPlace ? ctx.lblPlace(bx0, ty - th, Math.max(tw, bw), blockH, name, 'pet22') : 0; by += dy; ty += dy;
      if (ob) ob(ug, sx - R(bw / 2), by, bw, Math.max(0, e.hp / (e.max || 1)), 'ally', su);
      else { ug.fillStyle = '#1a2a12'; ug.fillRect(sx - bw / 2, by, bw, bh); ug.fillStyle = '#7bd04a'; ug.fillRect(sx - bw / 2 + 1, by + 1, (bw - 2) * Math.max(0, e.hp / (e.max || 1)), bh - 2); }
      ug.fillStyle = 'rgba(13,11,20,.6)'; ug.beginPath(); if (ug.roundRect) ug.roundRect(sx - tw / 2, ty - th, tw, th, 3); else ug.rect(sx - tw / 2, ty - th, tw, th); ug.fill();
      ug.fillStyle = COL.name; ug.fillText(name, sx, ty - 1);
      ST.n.pet++; ST.drawn.push({ id: e.u.id, name, hp: R(e.hp), max: e.max, bar: { x: sx - R(bw / 2), y: by, w: bw, h: bh }, tag: { x: R(sx - tw / 2), y: R(ty - th), w: tw, h: th } });
    }
    ug.restore();
  },
};
