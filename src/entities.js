// entities.js — player + NPC movement, collision, animation
import { isSolid } from './world.js';

const CYCLE = [0, 1, 0, 2];
export class Entity {
  constructor(x, y, sheet) {
    this.x = x; this.y = y; this.sheet = sheet; this.dir = 0; this.frame = 0; this.animT = 0; this.moving = false;
    // hooks used by systems (vehicles, rocky control): speed multiplier, custom tile rule, custom collision box, custom drawing
    this.speedMul = 1; this.passable = null; this.boxW = 10; this.boxH = 6; this.custom = null; this.ghost = false;
  }
  box(x = this.x, y = this.y) { return { x: x - this.boxW / 2, y: y - this.boxH, w: this.boxW, h: this.boxH }; }
  blocked(x, y, map, others) {
    const b = this.box(x, y);
    const x0 = Math.floor(b.x / 16), x1 = Math.floor((b.x + b.w - 1) / 16), y0 = Math.floor(b.y / 16), y1 = Math.floor((b.y + b.h - 1) / 16);
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) { if (this.passable ? !this.passable(map, tx, ty) : isSolid(map, tx, ty)) return true; }
    if (this.ghost) return false;
    const cur = this.box(), hit = (a, c) => a.x < c.x + c.w && a.x + a.w > c.x && a.y < c.y + c.h && a.y + a.h > c.y;
    for (const o of others) { if (o === this || o.ghost) continue; const ob = o.box(); if (hit(b, ob) && !hit(cur, ob)) return true; } // already-overlapping entities may always move apart
    return false;
  }
  tryMove(dx, dy, map, others) {
    let moved = false;
    if (dx) { const nx = this.x + dx; if (!this.blocked(nx, this.y, map, others)) { this.x = nx; moved = true; } }
    if (dy) { const ny = this.y + dy; if (!this.blocked(this.x, ny, map, others)) { this.y = ny; moved = true; } }
    return moved;
  }
  animate(dt) {
    this.tickAct(dt);
    if (this.moving) { this.animT += dt; this.frame = CYCLE[Math.floor(this.animT / 0.13) % 4]; }
    else { this.frame = 0; this.animT = 0; }
  }
  faceTo(px, py) { const dx = px - this.x, dy = py - this.y; this.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 2 : 1) : (dy > 0 ? 0 : 3); }
  draw(g) {
    if (this.custom) { this.custom(g, this); return; }
    const a = this.action, sh = a && this.sheet.actions && this.sheet.actions[a.name];   // clip động tác PixelLab (art.js gắn vào sheet)
    if (sh) {
      // walk (bế): clip AI mở đầu bằng khung giơ tay dần → chỉ dùng 3 khung cuối (tay đã giơ): đứng = khung n-3, bước = n-2/n-1 luân phiên
      const f = a.walk ? sh.n - 3 + (this.moving ? CYCLE[Math.floor(this.animT / 0.13) % 4] : 0) : Math.min(sh.n - 1, Math.floor(a.t / a.dur * sh.n));   /* clip đi: 3 cột cuối = đứng/bước/bước như sheet đi */
      const ch = sh.ch || 20, cw = sh.cw || 16; g.drawImage(sh.img, f * cw, this.dir * ch, cw, ch, Math.round(this.x) - (cw >> 1), Math.round(this.y) - 18 - (ch - 20), cw, ch); return;   /* cw: ô động tác rộng 24 (px-actions 2026-09-28) */
    }
    g.drawImage(this.sheet, this.frame * 16, this.dir * 20, 16, 20, Math.round(this.x) - 8, Math.round(this.y) - 18, 16, 20);
  }
  // Động tác: act('chop', 0.35) chạy 1 lần; act('fish', 1, true) lặp/giữ khung cuối tới khi endAct(). hasAct(name): có clip PixelLab không (module quyết định vẽ dụng cụ code hay không)
  act(name, dur = 0.4, hold = false, walk = false) { if (this.action && this.action.name === name && this.action.hold) return; this.action = { name, t: 0, dur, hold, walk }; }
  endAct(name) { if (this.action && (!name || this.action.name === name)) this.action = null; }
  hasAct(name) { return !!(this.sheet && this.sheet.actions && this.sheet.actions[name]); }
  tickAct(dt) { const a = this.action; if (!a) return; a.t += dt; if (a.t >= a.dur) { if (a.hold) a.t = a.dur - 0.0001; else this.action = null; } }
}

export class Player extends Entity {
  update(dt, input, map, others) {
    let dx = (input.right ? 1 : 0) - (input.left ? 1 : 0), dy = (input.down ? 1 : 0) - (input.up ? 1 : 0);
    this.moving = !!(dx || dy);
    if (this.moving) {
      if (dx && dy) { dx *= 0.7071; dy *= 0.7071; }
      if (Math.abs(dx) >= Math.abs(dy) && dx) this.dir = dx > 0 ? 2 : 1; else if (dy) this.dir = dy > 0 ? 0 : 3;
      const sp = 84 * dt * this.speedMul;
      this.tryMove(dx * sp, dy * sp, map, others);
    }
    this.animate(dt);
  }
}

const DIRV = [[0, 1], [-1, 0], [1, 0], [0, -1]];
export class NPC extends Entity {
  constructor(m, x, y, sheet, rng) { super(x, y, sheet); this.m = m; this.home = { x, y }; this.rng = rng; this.timer = rng() * 2; this.walking = false; this.radius = 64; }
  update(dt, map, others, talkingTo) {
    if (talkingTo) { this.moving = false; this.faceTo(talkingTo.x, talkingTo.y); this.animate(dt); return; }
    // systems can send an NPC somewhere: this.goal = {x, y} (pixels) or this.path = [{x,y}, …] (waypoints from ctx.pathTo). Arrives within 6px, then holds still while `this.busy` is set.
    if (!this.goal && this.path && this.path.length) this.goal = this.path.shift();
    if (this.goal) {
      const dx = this.goal.x - this.x, dy = this.goal.y - this.y, d = Math.hypot(dx, dy);
      if (d < 6) { this.goal = null; this.moving = false; this.animate(dt); return; }
      this.faceTo(this.goal.x, this.goal.y); this.moving = true;
      const sp = 40 * dt * (this.speedMul || 1); const ok = this.tryMove(dx / d * sp, dy / d * sp, map, others);
      if (!ok) { this.stuck = (this.stuck || 0) + dt; if (this.stuck > 1.5) { this.goal = null; this.stuck = 0; } } else this.stuck = 0;
      this.animate(dt); return;
    }
    if (this.busy) { this.moving = false; this.animate(dt); return; }
    this.timer -= dt;
    if (this.timer <= 0) {
      if (this.walking) { this.walking = false; this.timer = 0.8 + this.rng() * 2.5; }
      else {
        this.walking = true; this.timer = 0.4 + this.rng() * 1.3;
        const far = Math.hypot(this.x - this.home.x, this.y - this.home.y) > this.radius;
        if (far) this.faceTo(this.home.x, this.home.y); else this.dir = (this.rng() * 4) | 0;
      }
    }
    this.moving = this.walking;
    if (this.walking) {
      const [vx, vy] = DIRV[this.dir], sp = 28 * dt;
      if (!this.tryMove(vx * sp, vy * sp, map, others)) { this.walking = false; this.timer = 0.5 + this.rng(); }
    }
    this.animate(dt);
  }
}
