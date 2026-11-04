/* c35-demban (04/11): vật THẤP (bụi quả, đá nhỏ, cỏ…) không chắn đường vô lý — anh khoanh 3 bụi quả cạnh rừng "sao không đi qua được".
   Không đổi O[type].solid toàn cục (đường đèo dùng bụi làm hàng rào viền). Mỗi lần vào vùng: gỡ ô cứng của vật thấp 1×1
   nếu MỌI ô đi được kề nó thuộc CÙNG một vùng liền (gỡ không nối 2 khu tách biệt → không mở lối ra ngoài bản đồ / qua viền).
   Vật vẫn còn (hái, đập, hiện ảnh như cũ) — chỉ đi xuyên được. */
const LOW = new Set(['bush', 'rock_s', 'rocks88', 'flower', 'flowers', 'weed', 'grass_tuft', 'tuft', 'mushroom', 'sprout']);
const ST = { opened: [], zone: null };

function openLow(ctx) {
  const m = ctx.S.map, O = ctx.O; ST.opened = []; ST.zone = ctx.S.zone && ctx.S.zone.id;
  if (!m || !m.solid || !m.objects || !O) return;
  const W = m.w, H = m.h; if (!W || !H) return;
  const lab = new Int32Array(W * H), q = new Int32Array(W * H); let L = 0;
  for (let s = 0; s < W * H; s++) {   /* đánh nhãn vùng liền của ô đi được (4 hướng) */
    if (m.solid[s] || lab[s]) continue; L++; let h = 0, t = 0; q[t++] = s; lab[s] = L;
    while (h < t) { const c = q[h++], x = c % W, y = (c / W) | 0;
      if (x > 0 && !m.solid[c - 1] && !lab[c - 1]) { lab[c - 1] = L; q[t++] = c - 1; }
      if (x < W - 1 && !m.solid[c + 1] && !lab[c + 1]) { lab[c + 1] = L; q[t++] = c + 1; }
      if (y > 0 && !m.solid[c - W] && !lab[c - W]) { lab[c - W] = L; q[t++] = c - W; }
      if (y < H - 1 && !m.solid[c + W] && !lab[c + W]) { lab[c + W] = L; q[t++] = c + W; } }
  }
  for (const o of m.objects) {
    const d = O[o.type]; if (!d || !d.solid || d.fw !== 1 || d.fh !== 1 || !LOW.has(o.type) || o.ruined) continue;
    const x = o.x, y = o.y; if (x < 1 || y < 1 || x >= W - 1 || y >= H - 1) continue; const c = y * W + x;
    if (!m.solid[c]) continue; let k = 0, ok = true;
    for (const n of [c - 1, c + 1, c - W, c + W]) { const l = lab[n]; if (!l) continue; if (!k) k = l; else if (l !== k) { ok = false; break; } }
    if (!ok || !k) continue;
    m.solid[c] = 0; o.walk35 = 1; ST.opened.push([o.type, x, y]);
  }
}

export const demban35 = {
  id: 'demban35',
  onZoneEnter(ctx) { try { openLow(ctx); } catch (e) { console.error('demban35', e); } },
  update(dt, ctx) {   /* vật thấp đã mở mà bị đặt lại cứng (mọc lại / dựng lại map) → mở lại */
    const m = ctx.S.map; if (!m || !m.solid || !ST.opened.length) return;
    for (const o of m.objects) if (o.walk35) { const c = o.y * m.w + o.x; if (m.solid[c]) m.solid[c] = 0; }
  },
};
if (typeof window !== 'undefined') window.__dem35 = { st: () => ({ zone: ST.zone, n: ST.opened.length, opened: ST.opened.slice(0, 40) }), reopen: ctx => openLow(ctx || window.__CTX) };
