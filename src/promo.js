// promo.js — chế độ quay video quảng bá (anh 2026-09-28): ?promo&art=px&lang=vi
// Tự chạy chuỗi cảnh khoe animation/tính năng tâm huyết, không HUD, viền điện ảnh 2 dải đen, tiêu đề cảnh lớn góc trái, chuyển cảnh mờ đen.
// Phím: Space tạm dừng · N bỏ qua cảnh · H ẩn/hiện chữ. Mỗi cảnh bọc try/catch: cảnh lỗi thì tự sang cảnh sau.
export function runPromo(G) {
  const { S, CTX, UI, enterZone, startGame, defaultSave, setMode, input } = G;
  const vi = () => UI.lang() === 'vi', T = (en, v) => (vi() ? v : en);
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const st = { paused: false, skip: false, hide: false };
  const FROM = +(new URLSearchParams(location.search).get('from') || 0);   /* ?from=N: bắt đầu từ cảnh N (quay lại một đoạn) */
  const $ = s => document.querySelector(s);

  /* ---------- lớp phủ điện ảnh ---------- */
  const css = document.createElement('style');
  css.textContent = `#promo-top,#promo-bot{position:fixed;left:0;right:0;height:7vh;background:#000;z-index:60;pointer-events:none}#promo-top{top:0}#promo-bot{bottom:0}
  #promo-cap{position:fixed;left:5vw;top:11vh;z-index:61;pointer-events:none;color:#fff4d6;font-family:VT323,monospace;text-shadow:0 3px 0 #000,0 0 12px rgba(0,0,0,.8);opacity:0;transition:opacity .6s}
  #promo-cap.on{opacity:1}#promo-cap .k{font-size:clamp(14px,1.6vw,22px);color:#ffd45e;letter-spacing:3px}#promo-cap .t{font-size:clamp(34px,4.6vw,64px);line-height:1}#promo-cap .s{font-size:clamp(18px,2vw,28px);color:#d8cfe8;max-width:52vw}
  #promo-fade{position:fixed;inset:0;background:#000;z-index:59;pointer-events:none;opacity:0;transition:opacity .5s}#promo-fade.on{opacity:1}
  #promo-end{position:fixed;inset:0;z-index:62;display:none;align-items:center;justify-content:center;flex-direction:column;background:radial-gradient(#1c1530,#05040a);color:#fff4d6;font-family:VT323,monospace;text-align:center}
  #promo-end .l{font-family:'Press Start 2P',monospace;font-size:clamp(28px,5vw,64px);color:#ffb347;text-shadow:0 5px 0 #6b2f0a}#promo-end .s{font-size:clamp(20px,2.4vw,34px);margin-top:14px}
  body.promo #hud,body.promo #prompt,body.promo #toast,body.promo #touch,body.promo #touch-skills{visibility:hidden!important}
  body.promo.hidecap #promo-cap{display:none}`;
  document.head.appendChild(css);
  const mk = (id, html = '') => { const d = document.createElement('div'); d.id = id; d.innerHTML = html; document.body.appendChild(d); return d; };
  const top = mk('promo-top'), bot = mk('promo-bot'), cap = mk('promo-cap', '<div class="k"></div><div class="t"></div><div class="s"></div>'), fade = mk('promo-fade');
  const end = mk('promo-end', `<div class="l">SEISMIC</div><div class="s"></div>`);
  window.addEventListener('keydown', e => { if (e.code === 'Space') { st.paused = !st.paused; e.preventDefault(); } if (e.code === 'KeyN') st.skip = true; if (e.code === 'KeyH') document.body.classList.toggle('hidecap'); }, true);

  async function wait(s) { const t = performance.now() + s * 1000; while (performance.now() < t) { if (st.skip) return; if (st.paused) { await sleep(100); continue; } await sleep(40); } }
  async function caption(n, title, sub) { cap.querySelector('.k').textContent = `${String(n).padStart(2, '0')} ·`; cap.querySelector('.t').textContent = title; cap.querySelector('.s').textContent = sub || ''; cap.classList.add('on'); }
  const capOff = () => cap.classList.remove('on');
  async function fadeOut() { fade.classList.add('on'); await sleep(550); }
  async function fadeIn() { fade.classList.remove('on'); await sleep(450); }
  const keyDown = code => window.dispatchEvent(new KeyboardEvent('keydown', { code, key: code, bubbles: true }));
  const keyUp = code => window.dispatchEvent(new KeyboardEvent('keyup', { code, key: code, bubbles: true }));
  async function E(gap = 0.3) { keyDown('KeyE'); await sleep(40); keyUp('KeyE'); await wait(gap); }
  async function walk(dir, s) { input[dir] = true; await wait(s); input[dir] = false; await sleep(60); }
  const tp = (tx, ty, dir) => { S.player.x = tx * 16 + 8; S.player.y = ty * 16 + 12; if (dir !== undefined) S.player.dir = dir; };
  async function goZone(id) { if (S.zone.id !== id) { enterZone(id, 'default'); await wait(1.4); } }
  const cv = () => $('#c');
  function mouseAt(wx, wy, down) {   /* con trỏ PixelLab: di chuột tới toạ độ thế giới */
    const c = cv(), r = c.getBoundingClientRect(), sc = CTX.scale, cam = CTX.cam || { cx: 0, cy: 0 };
    const o = { clientX: r.left + (wx - cam.cx) * sc, clientY: r.top + (wy - cam.cy) * sc, pointerType: 'mouse', button: 0, bubbles: true };
    c.dispatchEvent(new PointerEvent('pointermove', o)); if (down) c.dispatchEvent(new PointerEvent('pointerdown', o));
  }
  const clearNpcs = (r = 40) => { for (const n of S.npcs) if (Math.hypot(n.x - S.player.x, n.y - S.player.y) < r) { n.x += 300; n.home = { x: n.x, y: n.y }; } };
  async function scene(n, title, sub, fn) {
    if (n < FROM) return;
    st.skip = false; await fadeOut();
    try { await fn('pre'); } catch (e) { console.warn('promo pre', title, e); }
    await fadeIn(); caption(n, title, sub);
    try { await fn('run'); } catch (e) { console.warn('promo', title, e); }
    capOff(); await wait(0.4);
    for (let i = 0; i < 4 && S.mode !== 'play'; i++) { const c = S.closers && S.closers[S.mode]; if (c) c(); else setMode('play'); await sleep(120); }   /* dọn: đóng câu cá / hộp thoại / bảng */
    for (const k of ['up', 'down', 'left', 'right']) input[k] = false;
  }

  /* ---------- kịch bản ---------- */
  (async () => {
    document.body.classList.add('promo');
    if (!FROM) caption(0, 'SEISMIC · 9 LANDS', T('A pixel journey through the 9 Magnitude lands', 'Hành trình pixel qua 9 Vùng Đất Magnitude'));
    if (!FROM) await wait(6); capOff();
    const sv = defaultSave(); sv.zone = 'village'; sv.entry = 'default'; sv.story = { act: 2, seaDone: true, flashback: false, guideStoryTold: true }; sv.name = vi() ? 'Hùng' : 'Tuong';   /* bản tiếng Anh: Tuong */ sv.nation = 'Vietnamese';   /* bỏ đoạn mở đầu trên biển */ sv.lang = vi() ? 'vi' : 'en';
    sv.inv.stone = 60; sv.toolTier = { axe: 1, pickaxe: 1, shovel: 1, bucket: 2, cage: 2, cart: 2, rod: 1 }; sv.tools = { ...(sv.tools || {}), rod: true, rodBought: true };
    await fadeOut(); startGame(sv); await wait(1.5); await fadeIn();

    await scene(1, T('Your hero', 'Nhân vật của bạn'), T('Hand-drawn with PixelLab from a real avatar — walks in 4 directions', 'Vẽ bằng PixelLab từ avatar thật — đi đủ 4 hướng'), async ph => {
      if (ph === 'pre') { const my = CTX.myPlot(); const sp = my ? (my.spawn || my) : { x: 30, y: 20 }; tp(sp.x + 2, sp.y + 3, 0); clearNpcs(80); return; }
      await walk('right', 1.4); await walk('down', 1.0); await walk('left', 1.4); await walk('up', 1.0);
    });

    await scene(2, 'Noxx · CM', T('The community manager greets every newcomer', 'CM của Seismic chào đón người mới'), async ph => {
      if (ph === 'pre') { const g = S.guide; if (g) { S.player.x = g.x; S.player.y = g.y + 16; S.player.dir = 3; } return; }
      await wait(0.6); await E(2.6); await E(2.6); await E(0.4);
      for (let i = 0; i < 6 && S.mode !== 'play'; i++) await E(0.4);
    });

    await scene(3, T('Living animals', 'Muôn thú sống động'), T('Every animal walks in 4 directions — catch them and carry them home', 'Mỗi con vật đi đủ 4 hướng — bắt và mang về nhà'), async ph => {
      const A = window.__animals;
      if (ph === 'pre') { const a = A && A.list().find(x => x.kind === 'cow') ? 'cow' : 'chicken'; A && A.warp(a, 40); clearNpcs(60); return; }
      await wait(2.4); await walk('left', 0.5);
      const near = A.list().filter(a => a.kind !== 'fish').sort((a, b) => Math.hypot(a.x - S.player.x, a.y - S.player.y) - Math.hypot(b.x - S.player.x, b.y - S.player.y))[0];
      if (near) { A.bring(near.kind); await wait(0.5); await E(1.0); }
      await walk('right', 1.2); await walk('down', 0.8);
    });

    await scene(4, T('Stardew-style farming', 'Trồng trọt kiểu Stardew'), T('Point with the cursor, till, sow, water — watch the crops grow day by day', 'Trỏ chuột để cày, gieo, tưới — cây lớn qua từng ngày'), async ph => {
      const F = window.__farm;
      if (ph === 'pre') { F.tools(); for (const id of Object.keys(CTX.ITEMS)) if (id.startsWith('seed_')) CTX.bag.add(id, 6); const my = CTX.myPlot(); const sp = my.spawn || my; tp(sp.x + 1, sp.y + 2, 2); clearNpcs(80); st.farmAt = { x: sp.x + 1, y: sp.y + 2 }; return; }
      const b = st.farmAt;
      for (let i = 1; i <= 3; i++) { const wx = (b.x + i) * 16 + 8, wy = b.y * 16 + 8; mouseAt(wx, wy); await wait(0.45); mouseAt(wx, wy, true); await wait(0.7); mouseAt(wx, wy, true); await wait(0.7); }
      const w = S.map.objects.find(o => o.type === 'well'); if (w) { tp(w.x + 1, w.y + 3, 3); await wait(0.4); await E(0.6); }
      for (let n = 0; n < 3; n++) {
        tp(b.x, b.y, 2);
        for (let i = 1; i <= 3; i++) { const wx = (b.x + i) * 16 + 8, wy = b.y * 16 + 8; mouseAt(wx, wy); await wait(0.25); mouseAt(wx, wy, true); await wait(0.4); }
        if (st.skip) return; CTX.clock.sleep(); await wait(1.6); if (S.mode === 'summary' && S.closers && S.closers.summary) S.closers.summary(); await wait(0.9);
        if (F.state().bucketWater <= 1 && w) { tp(w.x + 1, w.y + 3, 3); await wait(0.2); await E(0.3); }
      }
      tp(b.x, b.y + 1, 3); await wait(1.5);
    });

    await scene(5, T('Your own pen', 'Chuồng thú của riêng bạn'), T('Build a pen in your nation’s yard, feed your animals, collect eggs and milk', 'Dựng chuồng trong khu nước mình, cho ăn, nhặt trứng và sữa'), async ph => {
      const P = window.__pens;
      if (ph === 'pre') { CTX.bag.add('pen1', 1); CTX.bag.add('hay', 8); const c = CTX.carry.get(); c.push('chicken', 'cow', 'chicken'); CTX.persist(); const sp = P.spot(); st.pen = sp; if (sp) P.warp(sp.gate.x, sp.gate.y); clearNpcs(80); return; }
      if (!st.pen) return;
      await wait(0.8); P.tryE(); await wait(1.2);
      for (let i = 0; i < 3; i++) { P.tryE(); await wait(0.7); }
      const tr = S.map.objects.find(o => o.type === 'pen_trough'); if (tr) { tp(tr.x, tr.y + 1, 3); await wait(0.6); await E(0.8); await E(0.8); }
      tp(st.pen.gate.x, st.pen.gate.y + 2, 3); await wait(3);
    });

    await scene(6, T('Fishing', 'Câu cá'), T('Cast, wait for the bite, reel it in — every species has its own card', 'Vung cần, chờ cá cắn, giật kéo — mỗi loài cá có thẻ riêng'), async ph => {
      const A = window.__animals;
      if (ph === 'pre') { await goZone('m1'); const sh = A.shore(); if (sh) { tp(sh.tx, sh.ty, sh.dir); } clearNpcs(60); return; }
      await wait(0.6); await E(0.4); await wait(2.2);
      const f = A.fishing(); if (f) f.t = 0.05; await wait(0.6);
      const rnd = Math.random; Math.random = () => 0.5; await E(0.2); Math.random = rnd;
      for (let i = 0; i < 30 && A.fishing() && A.fishing().phase === 'reel'; i++) await E(0.28);
      await wait(4.2); await E(0.3);
    });

    await scene(7, T('Shallow & deep water', 'Nước nông & nước sâu'), T('Wade, swim, run out of breath — a boat from your friends comes to the rescue', 'Lội, bơi, kiệt sức — thuyền của bạn bè tới cứu'), async ph => {
      const W = window.__swim;
      if (ph === 'pre') { await goZone('m1'); const m = S.map, ty = Math.floor(m.h / 2); let sx = -1; for (let x = 0; x < m.w; x++) if (CTX.getG(m, x, ty) === CTX.T.WATER) { sx = x; break; } st.sw = { sx, ty }; tp(sx - 2, ty, 2); return; }
      await walk('right', 1.2); await walk('right', 1.4); await wait(1.2);
      W.drain(); await wait(1.2);
      for (let i = 0; i < 50 && W.state().mode === 'rescue'; i++) await wait(0.25);
      await wait(1.5);
    });

    await scene(8, T('The Sea of Origins', 'Biển Khởi Nguồn'), T('Stardew-blue water, drifting castaways — and something big below', 'Nước xanh kiểu Stardew, người trôi dạt — và thứ gì đó rất lớn bên dưới'), async ph => {
      if (ph === 'pre') { await goZone('sea'); return; }
      await wait(1.2); try { window.__life && window.__life.summonWhale(); } catch (e) { } await wait(5.5);
    });

    await scene(9, T('Nine monuments', 'Chín tượng đài'), T('Each land carries its own Magnitude badge', 'Mỗi vùng đất mang huy hiệu Magnitude riêng'), async ph => {
      if (ph === 'pre') { await goZone('village'); const mo = S.map.objects.find(o => o.type === 'monument'); if (mo) tp(mo.x + 1, mo.y + 3, 3); return; }
      await wait(1.8);
      for (const z of ['m1', 'm3', 'm5', 'm7', 'm9']) { if (st.skip) return; fade.classList.add('on'); await sleep(300); enterZone(z, 'default'); await sleep(900); const mo = S.map.objects.find(o => o.type === "monument"); if (mo) tp(mo.x + 1, mo.y + 3, 3); fade.classList.remove('on'); await wait(1.7); }
    });

    await scene(10, T('Nations & Seismic stones', 'Quốc gia & đá Seismic'), T('Mine Seismic crystals, join a nation — and never plant in someone else’s yard', 'Đào tinh thể Seismic, gia nhập quốc gia — và đừng trồng trọt trong khu nhà người khác'), async ph => {
      if (ph === 'pre') { await goZone('village'); const v = S.map.objects.find(o => o.type === 'seisvein'); if (v) tp(v.x, v.y + 1, 3); clearNpcs(40); st.vein = v; return; }
      if (st.vein) for (let i = 0; i < 3 && S.map.objects.includes(st.vein); i++) await E(1.2);
      await wait(0.6);
      const N = window.__nations, f = S.map.plots.find(q => q.nation && q.nation !== 'Vietnamese' && S.npcs.some(n => n.m && (CTX.nationOf(n.m) || {}).key === q.nation));
      if (!f) return; let tile = null;
      for (let y = f.y + 1; y < f.y + f.h - 1 && !tile; y++) for (let x = f.x + 1; x < f.x + f.w - 1; x++) if (!CTX.isSolid(S.map, x, y) && !S.map.objects.some(o => Math.abs(o.x - x) <= 1 && Math.abs(o.y - y) <= 1)) { tile = { x, y }; break; }
      if (!tile) return; fade.classList.add('on'); await sleep(300); tp(tile.x, tile.y, 0); fade.classList.remove('on'); await wait(0.8);
      await E(1.4); await E(0.2); for (let i = 0; i < 24 && N.chase(); i++) await wait(0.25); await wait(1.5);
    });

    await scene(11, T('Day & night', 'Ngày & đêm'), T('12 real minutes per day, four seasons, lanterns at night', '12 phút thật mỗi ngày, bốn mùa, đèn lồng về đêm'), async ph => {
      if (ph === 'pre') { const mo = S.map.objects.find(o => o.type === 'monument'); if (mo) tp(mo.x + 1, mo.y + 5, 3); CTX.clock.set({ hour: 17, minute: 30 }); return; }
      for (let h = 18; h <= 23; h++) { if (st.skip) return; CTX.clock.set({ hour: h, minute: 0 }); await wait(0.9); }
      await wait(1.5);
    });

    capOff(); await fadeOut(); end.querySelector('.s').textContent = T('9 Lands · game by Tuong', '9 Vùng Đất · game by Tuong'); end.style.display = 'flex'; fade.classList.remove('on');
  })();
}
