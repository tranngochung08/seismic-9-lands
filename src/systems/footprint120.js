/* footprint120.js — c67-world (plan-120 #13): DẤU CHÂN người chơi trên cát / tuyết / tro, vẽ code từng pixel ở lớp nền (drawGround — luật 10/10).
   · Mỗi bước chân chạm đất (khung đi 1 / 2, cùng nhịp bụi bước chân của vfx.js) trên ô SAND / SAND2 / SNOW / ASH → 1 dấu (trái / phải lệch 2 px theo hướng đi).
   · Màu = NHÂN (multiply) lên chính ô đất bên dưới → dấu lấy đúng bảng màu ô (cát nâu sẫm, tuyết xanh xám), không màu lạ.
   · Mờ dần ~6 s bằng dither Bayer 4×4 (bớt dần điểm ảnh, không trong suốt); tối đa 40 dấu; tĩnh, không nhấp nháy.
   · Không in khi: đi xe / bè / bơi / đang bay trên trời, đổi vùng thì xoá. Tắt thử: ?foot120=0. Móc test: window.__fp120. */
const OFF = typeof location !== 'undefined' && /[?&]foot120=0\b/.test(location.search);
const LIFE = 6, MAX = 40;
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + 0.5) / 16);
const SHADE = { SAND: [168, 128, 96], SAND2: [168, 128, 96], ASH: [150, 138, 138], SNOW: [150, 168, 210] };
const FOOT_V = [[0, 0], [1, 0], [0, 1], [1, 1], [0, 2], [1, 2]];   /* đi lên / xuống: bàn chân 2 × 3 */
const FOOT_H = [[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1]];   /* đi ngang: 3 × 2 */
const ST = { list: [], lastFrame: 0, px: 0, py: 0, ang: Math.PI / 2, names: null, n: 0 };

function tileName(ctx, id) {
  if (!ST.names) { ST.names = {}; for (const k of Object.keys(ctx.T || {})) ST.names[ctx.T[k]] = k; }
  return ST.names[id];
}

export const footprint120 = {
  id: 'footprint120',
  always: true,
  onZoneEnter(ctx) {
    ST.list.length = 0; ST.lastFrame = 0;
    if (typeof window !== 'undefined') window.__fp120 = { n: () => ST.list.length, made: () => ST.n, list: () => ST.list.map(f => ({ x: Math.round(f.x), y: Math.round(f.y), tile: f.tile, age: +((ctx.S.time || 0) - f.t).toFixed(1) })) };
  },
  onZoneLeave() { ST.list.length = 0; },
  update(dt, ctx) {
    if (OFF) return; const S = ctx.S, p = S.player, m = S.map, now = S.time || 0;
    while (ST.list.length && now - ST.list[0].t > LIFE) ST.list.shift();
    if (!p || !m) return;
    const mdx = p.x - ST.px, mdy = p.y - ST.py; if (Math.hypot(mdx, mdy) > 0.3) ST.ang = Math.atan2(mdy, mdx); ST.px = p.x; ST.py = p.y;
    if (p.custom || !p.moving || S.swimming || m.sky || m.air || (S.sea && S.sea.riding) || S.mode !== 'play') { ST.lastFrame = 0; return; }
    if (p.frame !== ST.lastFrame && p.frame !== 0) {
      const tx = Math.floor(p.x / 16), ty = Math.floor(p.y / 16), gid = ctx.getG ? ctx.getG(m, tx, ty) : m.ground[ty * m.w + tx], nm = tileName(ctx, gid);
      if (nm && SHADE[nm]) {
        const side = p.frame === 1 ? -1 : 1, a = ST.ang, ox = -Math.sin(a) * 3 * side, oy = Math.cos(a) * 3 * side;
        ST.list.push({ x: p.x + ox, y: p.y + oy, t: now, horiz: Math.abs(Math.cos(a)) > 0.7, tile: nm }); ST.n++;
        if (ST.list.length > MAX) ST.list.shift();
      }
    }
    ST.lastFrame = p.frame;
  },
  drawGround(g, ctx, cx, cy) {
    if (OFF || !ST.list.length) return; const now = ctx.S.time || 0, VW = ctx.VW || 480, VH = ctx.VH || 270;
    g.save(); g.globalCompositeOperation = 'multiply'; let col = null;
    for (const f of ST.list) {
      const k = 1 - (now - f.t) / LIFE; if (k <= 0) continue;
      const X = Math.round(f.x - cx) - (f.horiz ? 1 : 1), Y = Math.round(f.y - cy) - (f.horiz ? 1 : 2); if (X < -4 || Y < -4 || X > VW + 4 || Y > VH + 4) continue;
      const c = SHADE[f.tile]; if (c !== col) { col = c; g.fillStyle = `rgb(${c[0]},${c[1]},${c[2]})`; }
      const keep = Math.min(1, k * 1.6);   /* 2,2 s đầu đậm đủ, sau đó bớt điểm dần tới hết */
      for (const [i, j] of (f.horiz ? FOOT_H : FOOT_V)) { const px = X + i, py = Y + j, wx = Math.round(f.x) + i, wy = Math.round(f.y) + j; if (BAYER[((wy & 3) << 2) | (wx & 3)] >= keep) continue; g.fillRect(px, py, 1, 1); }
    }
    g.restore();
  },
};
