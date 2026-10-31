// audio/dspworker.js — plan-37: tổng hợp tiếng động (dsp.js) ở LUỒNG RIÊNG, không chặn vòng vẽ.
// Nhận { name, i, sr } → trả { name, i, data (Float32Array, chuyển quyền), rec: { seeds, vary, vol, rev } }.
import { dspRender } from './dsp.js';
import { SFX_LIB } from './sfxlib.js';
const q = []; let armed = false;
function run() {   /* mỗi lượt 1 tiếng rồi nhường → tin nhắn ưu tiên (tiếng cần ngay) chen lên đầu hàng */
  armed = false; const it = q.shift(); if (!it) return;
  const { name, i, sr } = it, e = SFX_LIB[name];
  if (e) try {
    const r = dspRender(e[2], sr, i + 1), rc = r.rec || {};
    self.postMessage({ name, i, data: r.data, rec: { seeds: rc.seeds, vary: rc.vary, vol: rc.vol, rev: rc.rev } }, [r.data.buffer]);
  } catch (err) { self.postMessage({ name, i, err: String(err) }); }
  if (q.length && !armed) { armed = true; setTimeout(run, 0); }
}
self.onmessage = ev => { const m = ev.data; if (m && m.list) for (const x of m.list) q.push(x); else if (m && m.pri) q.unshift(m); else q.push(m); if (!armed) { armed = true; setTimeout(run, 0); } };
