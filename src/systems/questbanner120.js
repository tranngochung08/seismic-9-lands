/* questbanner120.js — c65-hud (plan-120 việc 3, học Saiyan): BANNER "HOÀN THÀNH NHIỆM VỤ".
   Không sửa core: mỗi khung so trạng thái save với khung trước →
     · lời nhờ của nghệ sĩ (save.sys.quests.done tăng; món vừa biến khỏi active = việc vừa giao) → tên người nhờ + việc, thưởng 🪨 (+ thẻ tranh nếu save.cards tăng)
     · huy hiệu vùng (save.badges thêm Mn) → "Việc vùng Mn", thưởng = ảnh huy hiệu
     · 3 món cứu Lyron (save.story.items.<k> từ false → true) → "Cứu Lyron k/3", thưởng = icon món
   Banner giữa trên ~3 s: ruy băng đỏ PixelLab (ui/npick/banner.png) ghi tiêu đề + khung giấy (ui/hud91/tframe.png) ghi tên việc + hàng thưởng có icon (manifest ui.items).
   Trượt xuống khi hiện, mờ khi tắt, KHÔNG lặp; nhiều việc xong cùng lúc → xếp hàng. Banner vào vùng đang hiện → chờ nó tắt.
   Móc test: window.__qb120 = { state(), fake(kind) }. Dấu build: QB120_DONE */
import { img, paper, sh, uiS, isVi, bannerTop, itemRel, man } from './hud120lib.js';

const T_ALL = 3.0, T_IN = 0.3, T_OUT = 0.7;
const ST = { save: null, snap: null, q: [], cur: null, log: [] };
const TX = {
  vi: { title: 'HOÀN THÀNH NHIỆM VỤ', zone: 'HOÀN THÀNH VIỆC VÙNG', story: 'TIẾN TRIỂN CỐT TRUYỆN', stones: 'đá', card: 'Thẻ tranh', badge: n => `Huy hiệu M${n}`,
    zoneTask: (n, nm) => `Việc vùng M${n} · ${nm}`, lyron: (n, nm) => `Cứu Lyron ${n}/3 · ${nm}`,
    fetch: (n, it) => `Mang ${n} ${it}`, carry: it => `Đội ${it} trên đầu`, friend: w => `Chào hỏi ${w}`, help: 'Dựng lại khu nhà', chop: 'Chặt 3 cây', big: 'cá to' },
  en: { title: 'QUEST COMPLETE', zone: 'LAND TASK COMPLETE', story: 'STORY PROGRESS', stones: 'stones', card: 'Art card', badge: n => `M${n} badge`,
    zoneTask: (n, nm) => `Land task M${n} · ${nm}`, lyron: (n, nm) => `Save Lyron ${n}/3 · ${nm}`,
    fetch: (n, it) => `Bring ${n} ${it}`, carry: it => `Carry ${it} on your head`, friend: w => `Say hello to ${w}`, help: 'Rebuild the yard', chop: 'Cut 3 trees', big: 'big fish' },
};
const ITEMS3 = ['divebell', 'trenchmap', 'greatcrystal'];

function snapOf(sv) {
  const qs = (sv.sys && sv.sys.quests) || {}, st = sv.story || {}, it = st.items || {};
  return { done: qs.done || 0, active: (qs.active || []).map(q => ({ npcId: q.npcId, type: q.type, item: q.item, kind: q.kind, big: q.big, n: q.n, reward: q.reward, friendId: q.friendId, zone: q.zone, day: q.day })),
    badges: (sv.badges || []).slice(), cards: (sv.cards || []).length, items: ITEMS3.map(k => !!it[k]) };
}
const key = q => [q.npcId, q.type, q.item || q.kind || '', q.n || 0, q.zone, q.day].join('|');
const who = (ctx, id) => { try { const m = ctx.byId && ctx.byId.get(id); return m ? m.n : null; } catch (e) { return null; } };
function questText(ctx, q, t) {
  const nm = id => { try { return ctx.itemName(id); } catch (e) { return id; } };
  switch (q.type) {
    case 'fetch': return t.fetch(q.n, nm(q.item));
    case 'carry': return t.carry(q.big ? t.big : nm(q.kind));
    case 'friend': return t.friend(who(ctx, q.friendId) || '???');
    case 'helpDistrict': return t.help;
    case 'chop': return t.chop;
  }
  return '';
}
function zoneName(ctx, lv, vi) {
  const z = ctx.S.zone && ctx.S.zone.lv === lv ? ctx.S.zone : null;
  const n = z && z.name ? (z.name[vi ? 'vi' : 'en'] || z.name.en) : 'M' + lv;
  return String(n).replace(/^M\d\s*·\s*/, '');
}
function diff(ctx, a, b) {
  const vi = isVi(ctx), t = TX[vi ? 'vi' : 'en'], out = [];
  if (b.done > a.done) {
    const bk = new Set(b.active.map(key)), gone = a.active.filter(q => !bk.has(key(q)));
    const n = Math.min(gone.length, b.done - a.done) || 0;
    for (let i = 0; i < Math.max(1, n); i++) {
      const q = gone[i], rw = [];
      if (q && q.reward) rw.push({ icon: itemRel('stone'), txt: `+${q.reward} ${t.stones}` });
      if (i === 0 && b.cards > a.cards) rw.push({ icon: itemRel('parcel'), txt: t.card });
      const g = q ? who(ctx, q.npcId) : null, tx = q ? questText(ctx, q, t) : '';
      out.push({ kind: 'quest', title: t.title, name: g ? (tx ? `${g}: ${tx}` : g) : (tx || t.title), rw });
    }
  }
  for (const lv of b.badges) if (!a.badges.includes(lv) && lv >= 1 && lv <= 9) {
    const m = man(), bi = m && m.ui && m.ui.mbadges && m.ui.mbadges[lv];
    out.push({ kind: 'zone', lv, title: t.zone, name: t.zoneTask(lv, zoneName(ctx, lv, vi)), rw: [{ icon: bi || null, txt: t.badge(lv) }] });
  }
  ITEMS3.forEach((k, i) => { if (b.items[i] && !a.items[i]) {
    const have = b.items.filter(Boolean).length; let nm = k; try { nm = ctx.itemName(k); } catch (e) { }
    out.push({ kind: 'story', title: t.story, name: t.lyron(have, nm), rw: [{ icon: itemRel(k), txt: nm }] });
  } });
  return out;
}

/* toast to của core trùng nội dung banner (thưởng đá của lời nhờ, 'Nhận huy hiệu Magnitude N.0') → ẩn đi cho khỏi 2 dải đỏ chồng nhau */
function hideDup(B) {
  if (typeof document === 'undefined') return;
  for (const el of [document.getElementById('px-banner'), document.getElementById('toast')]) {   /* hud.js #px-banner (bản pixel) / ui.js #toast.big (dự phòng) */
    if (!el || el.hidden || (el.id === 'toast' && el.className !== 'big')) continue;
    const tx = (el.textContent || '').trim();
    const dup = B.kind === 'quest' ? (/^\+\s*\d/.test(tx) && !/Magnitude/.test(tx)) : B.kind === 'zone' ? tx.includes(`Magnitude ${B.lv}.0`) : false;
    if (dup) { el.hidden = true; ST.log.push('hide toast: ' + tx.slice(0, 40)); }
  }
}

export const questbanner120 = {
  id: 'questbanner120',
  always: true,
  onZoneEnter(ctx) {
    img('ui/npick/banner.png'); img('ui/hud91/tframe.png'); const ir = itemRel('stone'); if (ir) img(ir);
    if (typeof window !== 'undefined') window.__qb120 = {
      state: () => ({ cur: ST.cur && { ...ST.cur }, q: ST.q.length, log: ST.log.slice(-20), snap: ST.snap && { done: ST.snap.done, active: ST.snap.active.length, badges: ST.snap.badges.slice() } }),
      fake: kind => { const vi = isVi(ctx), t = TX[vi ? 'vi' : 'en'];
        const b = kind === 'zone' ? { kind: 'zone', title: t.zone, name: t.zoneTask(3, zoneName(ctx, 3, vi)), rw: [{ icon: man() && man().ui.mbadges && man().ui.mbadges[3], txt: t.badge(3) }] }
          : kind === 'story' ? { kind: 'story', title: t.story, name: t.lyron(1, ctx.itemName('divebell')), rw: [{ icon: itemRel('divebell'), txt: ctx.itemName('divebell') }] }
          : { kind: 'quest', title: t.title, name: (vi ? 'Mina: Mang 4 ' : 'Mina: Bring 4 ') + ctx.itemName('wood'), rw: [{ icon: itemRel('stone'), txt: `+12 ${t.stones}` }, { icon: itemRel('parcel'), txt: t.card }] };
        ST.q.push(b); return true; },
    };
  },
  update(dt, ctx) {
    const sv = ctx.S.save; if (!sv) return;
    if (sv !== ST.save) { ST.save = sv; ST.snap = null; ST.q.length = 0; ST.cur = null; }
    let s2; try { s2 = snapOf(sv); } catch (e) { return; }
    if (ST.snap) { try { const d = diff(ctx, ST.snap, s2); if (d.length) { ST.q.push(...d); ST.log.push(...d.map(x => x.kind + ':' + x.name)); } } catch (e) { console.error('questbanner120', e); } }
    ST.snap = s2;
    if (ctx.S.mode === 'title') return;
    if (!ST.cur && ST.q.length) {
      let zb = null; try { zb = window.__zb120 && window.__zb120.state().ban; } catch (e) { }
      if (!zb) { ST.cur = { ...ST.q.shift(), t: 0 }; for (const r of ST.cur.rw) if (r.icon) img(r.icon); }
    }
    if (ST.cur) { ST.cur.t += dt; hideDup(ST.cur); if (ST.cur.t > T_ALL) ST.cur = null; }
  },
  drawUI(ug, ctx, cx, cy, scale) {
    const B = ST.cur; if (!B || ctx.S.mode === 'title') return;
    const t = B.t, a = t < T_IN ? t / T_IN : t > T_ALL - T_OUT ? Math.max(0, (T_ALL - t) / T_OUT) : 1; if (a <= 0) return;
    const W = ug.canvas.width, H = ug.canvas.height, s = uiS(ctx, scale);
    const fT = Math.max(18, Math.round(s * 6.2)), fN = Math.max(14, Math.round(s * 4.6)), fR = Math.max(13, Math.round(s * 4.2)), ic = Math.max(16, Math.round(s * 6));
    ug.save(); ug.globalAlpha = a; ug.imageSmoothingEnabled = false; ug.textBaseline = 'middle';
    ug.font = `bold ${fT}px VT323, monospace`; const wT = ug.measureText(B.title).width;
    ug.font = `${fN}px VT323, monospace`; let name = B.name; const maxW = Math.min(W - 40, 150 * s);
    while (name.length > 4 && ug.measureText(name).width > maxW) name = name.slice(0, -2);
    if (name !== B.name) name = name.replace(/\s+$/, '') + '…';
    const wN = ug.measureText(name).width;
    ug.font = `${fR}px VT323, monospace`; const gap = 6 * s, items = B.rw.map(r => ({ ...r, w: (r.icon ? ic + 3 * s : 0) + ug.measureText(r.txt).width }));
    const wR = items.reduce((v, r) => v + r.w, 0) + gap * Math.max(0, items.length - 1);
    const rbH = Math.round(fT + 7 * s), rbW = Math.round(Math.max(wT + 34 * s, 90 * s));
    const pw = Math.round(Math.min(W - 16, Math.max(wN, wR, rbW - 16 * s) + 22 * s)), ph = Math.round(rbH * 0.38 + fN + (items.length ? ic + 2 * s : 0) + 13 * s);
    const top = bannerTop(W, H, s), y = Math.round(top - (1 - Math.min(1, t / T_IN)) * 8 * s), cxm = Math.round(W / 2);
    const py = y + Math.round(rbH * 0.62);
    paper(ug, cxm - pw / 2, py, pw, ph, s);
    const rib = img('ui/npick/banner.png');
    if (rib) { const k = rbH / 27, c = 24, ck = Math.round(c * k), x0 = Math.round(cxm - rbW / 2);   /* 3 mảnh ruy băng (27 hàng trên của ảnh = thân, phần đuôi dưới bỏ qua) */
      ug.drawImage(rib, 0, 0, c, 27, x0, y, ck, rbH); ug.drawImage(rib, c, 0, rib.width - 2 * c, 27, x0 + ck, y, rbW - 2 * ck, rbH); ug.drawImage(rib, rib.width - c, 0, c, 27, x0 + rbW - ck, y, ck, rbH); }
    else { ug.fillStyle = '#a8121c'; ug.fillRect(cxm - rbW / 2, y, rbW, rbH); }
    ug.textAlign = 'center';
    sh(ug, B.title, cxm, y + rbH / 2, '#fff3c8', `bold ${fT}px VT323, monospace`, '#4a0a0e');
    const ny = py + Math.round(rbH * 0.38) + Math.round(3 * s) + fN / 2;
    sh(ug, name, cxm, ny, '#3b2412', `${fN}px VT323, monospace`, 'rgba(255,240,200,.6)');
    if (items.length) {
      let x = Math.round(cxm - wR / 2); const ry = Math.round(ny + fN / 2 + 2 * s + ic / 2);
      ug.textAlign = 'left';
      for (const r of items) {
        if (r.icon) { const im = img(r.icon); if (im) ug.drawImage(im, 0, 0, im.width, im.height, x, Math.round(ry - ic / 2), ic, ic); x += ic + 3 * s; }
        sh(ug, r.txt, x, ry + 1, '#5a3a18', `bold ${fR}px VT323, monospace`, 'rgba(255,240,200,.6)');
        x += ug.measureText(r.txt).width + gap;
      }
    }
    ug.restore();
  },
};
