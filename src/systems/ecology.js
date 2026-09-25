// ecology.js — the ecology module: new wild animals (sheep, horse, rabbit, crab, bat, fire
// salamander, snow fox, crystal moth) and the products you get from them (wool, taming + riding,
// rabbit traps, lava samples, a pet fox that digs, a chicken coop that lays eggs).
// Head-carried kinds added here: 'sheep', 'rabbit', 'crab', 'bat'. See systems/API.md.
import { mkCanvas, HOOK } from '../gfx.js';
import { getCarry, removeCarry, canCarry, carryDeny, registerHead, faceOf, dirFrame } from './animals.js';

// ---------------------------------------------------------------- strings
const STR = {
  en: {
    sheep: 'Catch sheep', shear: 'Shear', gotSheep: 'Caught a sheep! 🐑', gotWool: 'Sheared: +2 🐑 wool', shorn: 'This one is already shorn',
    full: 'Hands full — sell at the trader',
    feedHay: 'Feed hay', needHay: 'Needs hay 🌾 — cut tall grass with a scythe (workbench: 3 wood + 1 rock)', horseAte: n => `The horse eats the hay (${n}/3)`, horseTame: 'The horse trusts you now! 💛',
    ride: 'Ride', off: 'Dismount', needSaddle: 'Needs a saddle — craft it at the workbench (2 fur + 2 rope + 1 wood)', busy: 'Get off what you are riding first',
    setTrap: 'Set a trap', trapDone: 'Trap set — stay back and wait', trapTake: 'Take the rabbit',
    trapSprung: 'A rabbit is in the trap! 🐰', gotRabbit: 'Caught a rabbit! 🐰',
    crab: 'Catch crab', gotCrab: 'Caught a crab! 🦀', pinch: 'Ouch — the crab pinched you! −1 🪨', pinch0: 'Ouch — the crab pinched you!',
    bat: 'Catch bat', gotBat: 'Caught a bat! 🦇',
    scoop: 'Scoop', gotLava: 'Lava sample scooped! 🌋', needBucket: 'Needs an iron bucket — forge it at the furnace in M4/M5 (2 iron bars)',
    moth: 'Catch moth', gotCrystal: 'Crystal dust! +1 💎', mothGone: 'The moth slipped away',
    foxFeed: 'Feed a fish', foxNeed: 'Wants a fish — catch one at a shore with the fishing rod and bring it here', foxAte: n => `The snow fox eats (${n}/3)`, foxPet: 'The snow fox follows you now! 🦊',
    foxDug: n => `The fox digs up ${n}`,
    coopFeed: n => `Give hay to the coop (${n}/3)`, coopNeedHay: 'Needs hay 🌾 — cut tall grass with a scythe (workbench: 3 wood + 1 rock)', coopReady: 'The coop is stocked — the hens will lay 🥚', coopOk: 'The coop is warm and full of hay',
    gotEgg: 'Picked up an egg 🥚'
  },
  vi: {
    sheep: 'Bắt cừu', shear: 'Xén lông', gotSheep: 'Bắt được cừu! 🐑', gotWool: 'Xén xong: +2 🐑 len', shorn: 'Con này vừa xén rồi',
    full: 'Đầy tay rồi — đem bán ở Thương nhân',
    feedHay: 'Cho ăn rơm', needHay: 'Cần rơm 🌾 — cắt cỏ cao bằng liềm (chế ở Bàn mộc: 3 gỗ + 1 đá)', horseAte: n => `Ngựa ăn rơm (${n}/3)`, horseTame: 'Ngựa đã tin bạn! 💛',
    ride: 'Cưỡi ngựa', off: 'Xuống ngựa', needSaddle: 'Cần yên ngựa — chế ở Bàn mộc (2 lông thú + 2 dây thừng + 1 gỗ)', busy: 'Xuống khỏi thứ đang cưỡi/lái đã',
    setTrap: 'Đặt bẫy', trapDone: 'Đã đặt bẫy — lùi ra chờ', trapTake: 'Lấy con thỏ',
    trapSprung: 'Có thỏ dính bẫy! 🐰', gotRabbit: 'Bắt được thỏ! 🐰',
    crab: 'Bắt cua', gotCrab: 'Bắt được cua! 🦀', pinch: 'Á — cua kẹp tay! −1 🪨', pinch0: 'Á — cua kẹp tay!',
    bat: 'Bắt dơi', gotBat: 'Bắt được dơi! 🦇',
    scoop: 'Múc', gotLava: 'Múc được mẫu dung nham! 🌋', needBucket: 'Cần Xô sắt — rèn ở Lò nung M4/M5 (2 thanh sắt)',
    moth: 'Bắt bướm', gotCrystal: 'Bụi tinh thể! +1 💎', mothGone: 'Bướm bay mất rồi',
    foxFeed: 'Cho ăn cá', foxNeed: 'Nó muốn cá — câu một con ở bờ nước bằng cần câu rồi mang tới', foxAte: n => `Cáo tuyết ăn cá (${n}/3)`, foxPet: 'Cáo tuyết theo bạn rồi! 🦊',
    foxDug: n => `Cáo đào được ${n}`,
    coopFeed: n => `Cho chuồng gà ăn rơm (${n}/3)`, coopNeedHay: 'Cần rơm 🌾 — cắt cỏ cao bằng liềm (chế ở Bàn mộc: 3 gỗ + 1 đá)', coopReady: 'Chuồng đã đủ rơm — gà sắp đẻ 🥚', coopOk: 'Chuồng ấm và đầy rơm',
    gotEgg: 'Nhặt được quả trứng 🥚'
  }
};
const L = ctx => STR[ctx.lang() === 'vi' ? 'vi' : 'en'];

// ---------------------------------------------------------------- sprites (built once, at module load)
const px = (g, x, y, c, w = 1, h = 1) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
const OUT = '#1c1a24';
const TAU = Math.PI * 2;

function sheepArt(shorn) {
  return (g, f) => {
    const W = '#f7f3e9', WD = '#ddd5c3', SK = '#e7c3b2', D = '#453f4c';
    const a = f ? 1 : 0, b = f ? 0 : 1;
    px(g, 4 + a, 10, OUT, 2, 4); px(g, 4 + a, 10, D, 2, 3);                       // legs
    px(g, 9 - b, 10, OUT, 2, 4); px(g, 9 - b, 10, D, 2, 3);
    px(g, 0, 5, OUT, 2, 3); px(g, 0, 5, shorn ? SK : W, 1, 2);                    // tail
    if (shorn) {
      px(g, 1, 6, OUT, 11, 6); px(g, 2, 7, SK, 9, 4); px(g, 2, 10, WD, 9, 1);     // a bare, skinny body
      px(g, 4, 7, '#d9ad9c', 3, 1);
    } else {
      px(g, 1, 2, OUT, 12, 10); px(g, 2, 3, W, 10, 8); px(g, 2, 9, WD, 10, 2);    // a fat woolly cloud
      px(g, 2, 2, W, 3, 1); px(g, 6, 1, OUT, 4, 2); px(g, 6, 2, W, 4, 1); px(g, 9, 2, W, 3, 1);
      px(g, 3, 5, WD, 2, 1); px(g, 7, 7, WD, 3, 1);
    }
    const hy = shorn ? 4 : 2;
    px(g, 11, hy, OUT, 5, 7); px(g, 12, hy + 1, D, 3, 5);                          // head
    px(g, 10, hy + 1, OUT, 2, 2); px(g, 10, hy + 1, D, 1, 1);                       // ear
    px(g, 13, hy + 2, '#ffffff', 1, 1); px(g, 14, hy + 2, OUT, 1, 1);               // eye
    px(g, 13, hy + 5, SK, 3, 1);                                                    // muzzle
  };
}
function horseArt(g, f) {
  const B = '#a9703c', BD = '#7d4f28', M = '#3a2a1d', S = '#c99055';
  const a = f ? 1 : 0, b = f ? 0 : 1;
  px(g, 4 + a, 10, OUT, 2, 8); px(g, 4 + a, 10, BD, 1, 7);                           // hind legs
  px(g, 7 - a, 10, OUT, 2, 8); px(g, 7 - a, 10, BD, 1, 7);
  px(g, 12 + b, 10, OUT, 2, 8); px(g, 12 + b, 10, B, 1, 7);                          // fore legs
  px(g, 15 - b, 10, OUT, 2, 8); px(g, 15 - b, 10, B, 1, 7);
  px(g, 1, 3, OUT, 3, 8); px(g, 2, 4, M, 2, 6);                                       // tail
  px(g, 3, 4, OUT, 14, 7); px(g, 4, 5, B, 12, 5); px(g, 4, 9, S, 12, 1);              // barrel
  px(g, 13, 1, OUT, 5, 6); px(g, 14, 2, B, 3, 4);                                     // neck
  px(g, 12, 1, OUT, 2, 6); px(g, 12, 2, M, 1, 4);                                     // mane
  px(g, 13, 0, OUT, 1, 2); px(g, 16, 0, OUT, 1, 2);                                   // ears
  px(g, 16, 3, OUT, 4, 4); px(g, 16, 4, B, 3, 2); px(g, 18, 5, M, 2, 1);              // head + muzzle
  px(g, 15, 4, '#ffffff', 1, 1);                                                       // eye
}
function rabbitArt(g, f) {
  const W = '#e8e3d8', WD = '#c3bcae', P = '#e79ba6';
  const hop = f ? 1 : 0;
  px(g, 2, 7 - hop, OUT, 3, 3); px(g, 2, 7 - hop, WD, 2, 2);                          // back leg
  px(g, 7, 8 - hop, OUT, 2, 2); px(g, 7, 8 - hop, W, 1, 1);                            // front paw
  px(g, 0, 4 - hop, OUT, 2, 3); px(g, 0, 4 - hop, W, 1, 2);                            // puff tail
  px(g, 1, 3 - hop, OUT, 8, 6); px(g, 2, 4 - hop, W, 6, 4); px(g, 2, 7 - hop, WD, 6, 1);
  px(g, 7, 1 - hop, OUT, 5, 5); px(g, 8, 2 - hop, W, 3, 3);                            // head
  px(g, 7, -2 - hop + 1, OUT, 2, 4); px(g, 7, -1 - hop + 1, P, 1, 2);                  // ears
  px(g, 9, -2 - hop + 1, OUT, 2, 4); px(g, 9, -1 - hop + 1, P, 1, 2);
  px(g, 10, 3 - hop, OUT, 1, 1); px(g, 11, 4 - hop, P, 1, 1);                          // eye + nose
}
function crabArt(g, f) {
  const R = '#d8452f', RD = '#a32e1e', RL = '#f07a56';
  const a = f ? 1 : 0;
  px(g, 1, 5 + a, OUT, 2, 1); px(g, 0, 6 + a, OUT, 1, 2); px(g, 1, 7 - a, OUT, 2, 1);          // left legs
  px(g, 9, 5 + a, OUT, 2, 1); px(g, 11, 6 + a, OUT, 1, 2); px(g, 9, 7 - a, OUT, 2, 1);         // right legs
  px(g, 2, 2, OUT, 8, 6); px(g, 3, 3, R, 6, 4); px(g, 3, 3, RL, 6, 1); px(g, 3, 6, RD, 6, 1);  // shell
  px(g, 0, 1 + a, OUT, 3, 3); px(g, 1, 2 + a, R, 2, 1); px(g, 0, 1 + a, RL, 1, 1);             // left claw
  px(g, 9, 1 - a, OUT, 3, 3); px(g, 9, 2 - a, R, 2, 1); px(g, 11, 1 - a, RL, 1, 1);            // right claw
  px(g, 4, 1, OUT, 1, 2); px(g, 7, 1, OUT, 1, 2);                                               // eye stalks
  px(g, 4, 0, '#ffffff', 1, 1); px(g, 7, 0, '#ffffff', 1, 1);
}
function batFlyArt(g, f) {
  const B = '#4a3a58', BD = '#2e2438', E = '#ffd45e';
  px(g, 4, 4, OUT, 4, 5); px(g, 5, 5, B, 2, 3);                                                 // body
  px(g, 4, 2, OUT, 4, 3); px(g, 5, 3, BD, 2, 1);                                                // head
  px(g, 4, 0, OUT, 1, 2); px(g, 7, 0, OUT, 1, 2);                                               // ears
  px(g, 5, 3, E, 1, 1); px(g, 6, 3, E, 1, 1);                                                    // eyes
  if (f) { px(g, 0, 2, OUT, 4, 4); px(g, 1, 3, B, 3, 2); px(g, 8, 2, OUT, 4, 4); px(g, 8, 3, B, 3, 2); }
  else { px(g, 0, 5, OUT, 4, 4); px(g, 1, 6, B, 3, 2); px(g, 8, 5, OUT, 4, 4); px(g, 8, 6, B, 3, 2); }
}
function batSitArt(g, f) {
  const B = '#4a3a58', BD = '#2e2438', E = '#ffd45e';
  px(g, 3, 0, OUT, 4, 2); px(g, 4, 0, BD, 2, 1);                                                 // grip
  px(g, 2, 2, OUT, 6, 7); px(g, 3, 3, B, 4, 5);                                                  // folded wings
  px(g, 3, 6, BD, 4, 2);
  px(g, 3, 8 + (f ? 1 : 0), OUT, 4, 2); px(g, 4, 8 + (f ? 1 : 0), BD, 2, 1);                     // head hangs down
  px(g, 3, 8 + (f ? 1 : 0), E, 1, 1); px(g, 6, 8 + (f ? 1 : 0), E, 1, 1);
}
function salaArt(g, f) {
  const K = '#22202c', O2 = '#ff8c1a', Y = '#ffd45e';
  const a = f ? 1 : 0;
  px(g, 3, 6 + a, OUT, 2, 3); px(g, 3, 7 + a, K, 1, 2);                                          // legs
  px(g, 8, 6 - a, OUT, 2, 3); px(g, 8, 7 - a, K, 1, 2);
  px(g, 0, 3 + a, OUT, 4, 3); px(g, 1, 4 + a, K, 3, 1);                                          // tail
  px(g, 3, 2, OUT, 9, 6); px(g, 4, 3, K, 7, 4);                                                  // body
  px(g, 5, 3, O2, 2, 1); px(g, 8, 5, O2, 2, 1); px(g, 6, 5, Y, 1, 1); px(g, 9, 3, Y, 1, 1);      // fire spots
  px(g, 11, 2, OUT, 3, 5); px(g, 11, 3, K, 2, 3);                                                 // head
  px(g, 12, 4, O2, 1, 1); px(g, 13, 5, Y, 1, 1);
}
function foxArt(g, f) {
  const W = '#f4f6fa', WD = '#cdd6e2', D = '#8f9bb0', N = '#2b2733';
  const a = f ? 1 : 0, b = f ? 0 : 1;
  px(g, 3 + a, 7, OUT, 2, 4); px(g, 3 + a, 7, WD, 2, 3);                                         // legs
  px(g, 7 - b, 7, OUT, 2, 4); px(g, 7 - b, 7, WD, 2, 3);
  px(g, 0, 2 - a, OUT, 5, 5); px(g, 1, 3 - a, W, 4, 3); px(g, 1, 3 - a, WD, 2, 1);               // bushy tail
  px(g, 3, 3, OUT, 8, 5); px(g, 4, 4, W, 6, 3); px(g, 4, 6, WD, 6, 1);                            // body
  px(g, 9, 1, OUT, 5, 5); px(g, 10, 2, W, 3, 3);                                                  // head
  px(g, 9, 0, OUT, 2, 2); px(g, 12, 0, OUT, 2, 2); px(g, 10, 0, D, 1, 1); px(g, 12, 0, D, 1, 1);  // ears
  px(g, 11, 3, N, 1, 1); px(g, 13, 4, N, 1, 1);                                                    // eye + nose
}
function mothArt(g, f) {
  const W = f ? '#bfe8ff' : '#a8d8f5', WD = '#7fc4ef', B = '#3a3550';
  px(g, 4, 3, OUT, 2, 4); px(g, 4, 4, B, 2, 2);                                                    // body
  px(g, 3, 1, OUT, 1, 2); px(g, 6, 1, OUT, 1, 2);                                                  // antennae
  if (f) { px(g, 0, 1, OUT, 4, 4); px(g, 1, 2, W, 3, 2); px(g, 6, 1, OUT, 4, 4); px(g, 6, 2, W, 3, 2); }
  else { px(g, 0, 3, OUT, 4, 4); px(g, 1, 4, WD, 3, 2); px(g, 6, 3, OUT, 4, 4); px(g, 6, 4, WD, 3, 2); }
  px(g, 2, 3, '#ffffff', 1, 1); px(g, 7, 3, '#ffffff', 1, 1);
}
// the horse you ride: body only, the rider is stamped on top from the player's own sheet
function rideSide(g, f) {
  const B = '#a9703c', BD = '#7d4f28', M = '#3a2a1d', S = '#c99055', LE = '#5a3a1e';
  const a = f ? 2 : 0;
  px(g, 4 + a, 12, OUT, 2, 6); px(g, 4 + a, 12, BD, 2, 5);
  px(g, 8 - a, 12, OUT, 2, 6); px(g, 8 - a, 12, BD, 2, 5);
  px(g, 15 - a, 12, OUT, 2, 6); px(g, 15 - a, 12, B, 2, 5);
  px(g, 18 + a, 12, OUT, 2, 6); px(g, 18 + a, 12, B, 2, 5);
  px(g, 1, 3, OUT, 3, 9); px(g, 2, 4, M, 2, 7);                                   // tail
  px(g, 3, 4, OUT, 17, 9); px(g, 4, 5, B, 15, 7); px(g, 4, 10, S, 15, 1);         // barrel
  px(g, 5, 5, LE, 6, 2); px(g, 5, 4, OUT, 6, 1);                                  // saddle
  px(g, 16, 1, OUT, 7, 8); px(g, 17, 2, B, 5, 6);                                 // neck + head
  px(g, 15, 2, OUT, 3, 6); px(g, 16, 3, M, 2, 5);                                 // mane
  px(g, 20, 6, OUT, 4, 4); px(g, 20, 6, B, 3, 3); px(g, 22, 8, M, 2, 1);
  px(g, 19, 0, OUT, 1, 2); px(g, 21, 0, OUT, 1, 2);
  px(g, 19, 4, '#ffffff', 1, 1); px(g, 20, 4, OUT, 1, 1);
  px(g, 20, 7, LE, 3, 1);                                                          // rein
}
function rideFront(back) {
  return (g, f) => {
    const B = '#a9703c', BD = '#7d4f28', M = '#3a2a1d', S = '#c99055';
    const a = f ? 1 : 0;
    px(g, 2 + a, 12, OUT, 3, 6); px(g, 3 + a, 13, BD, 1, 4);                      // legs
    px(g, 11 - a, 12, OUT, 3, 6); px(g, 12 - a, 13, BD, 1, 4);
    px(g, 1, 4, OUT, 14, 9); px(g, 2, 5, B, 12, 7); px(g, 2, 11, S, 12, 1);       // chest / rump
    if (back) {
      px(g, 6, 3, OUT, 4, 3); px(g, 7, 4, BD, 2, 2);                              // rump
      px(g, 7, 6, OUT, 3, 10); px(g, 8, 7, M, 1, 9);                              // tail hanging down
    } else {
      px(g, 4, 5, OUT, 2, 3); px(g, 10, 5, OUT, 2, 3);                            // ears
      px(g, 4, 6, M, 1, 2); px(g, 11, 6, M, 1, 2);
      px(g, 4, 6, OUT, 8, 11); px(g, 5, 7, B, 6, 9);                              // head, seen head-on
      px(g, 5, 7, M, 6, 1);                                                        // forelock
      px(g, 7, 8, S, 2, 5);                                                        // blaze
      px(g, 5, 9, '#ffffff', 2, 2); px(g, 9, 9, '#ffffff', 2, 2);                  // eyes
      px(g, 6, 10, OUT, 1, 1); px(g, 9, 10, OUT, 1, 1);
      px(g, 6, 14, M, 4, 2); px(g, 7, 15, OUT, 1, 1); px(g, 9, 15, OUT, 1, 1);     // muzzle + nostrils
    }
  };
}
function flip(src) { const c = mkCanvas(src.width, src.height), g = c.getContext('2d'); g.translate(src.width, 0); g.scale(-1, 1); g.drawImage(src, 0, 0); return c; }
function build(w, h, fn) { return [0, 1].map(f => { const c = mkCanvas(w, h); fn(c.getContext('2d'), f); return [c, flip(c)]; }); }  // [frame][0=right,1=left]
function build1(w, h, fn) { return [0, 1].map(f => { const c = mkCanvas(w, h); fn(c.getContext('2d'), f); return c; }); }

const SPR = {   // HOOK.creature: art.js thay ảnh PixelLab tại chỗ khi gói vùng có
  sheep: HOOK.creature('sheep', build(16, 14, sheepArt(false))), sheepShorn: HOOK.creature('sheepShorn', build(16, 14, sheepArt(true))),
  horse: HOOK.creature('horse', build(20, 18, horseArt)), rabbit: HOOK.creature('rabbit', build(12, 10, rabbitArt)), crab: HOOK.creature('crab', build(12, 9, crabArt)),
  bat: HOOK.creature('bat', build(12, 10, batFlyArt)), batSit: HOOK.creature('batSit', build(10, 11, batSitArt)), sala: HOOK.creature('sala', build(14, 10, salaArt)),
  fox: HOOK.creature('fox', build(14, 11, foxArt)), moth: HOOK.creature('moth', build(10, 8, mothArt))
};
const RIDE = { side: build(24, 18, rideSide), front: build1(16, 18, rideFront(false)), back: build1(16, 18, rideFront(true)) };
// what the four new kinds look like riding on the player's head (animals.js only draws its own kinds)
const HEAD = { sheep: SPR.sheep, rabbit: SPR.rabbit, crab: SPR.crab, bat: SPR.batSit };
for (const [k, v] of Object.entries(HEAD)) registerHead(k, v);   /* plan-9: animals.js vẽ tập trung */

// ---------------------------------------------------------------- kind table
const K = {
  sheep: { sp: 11, flee: 20, anim: 3.0, idle: 0.8, lim: 26 },
  horse: { sp: 15, flee: 0, anim: 4.0, idle: 0.9, lim: 30 },
  rabbit: { sp: 52, flee: 104, anim: 10.0, idle: 1.6, lim: 0 },
  crab: { sp: 15, flee: 34, anim: 5.0, idle: 1.0, lim: 24 },
  sala: { sp: 13, flee: 22, anim: 4.0, idle: 1.0, lim: 26 },
  fox: { sp: 26, flee: 44, anim: 6.0, idle: 1.2, lim: 30 }
};
// per-zone spawn counts [min,max] — rolled on every visit
const TH = {
  m1: { crab: [4, 6] },
  m2: { sheep: [4, 6], horse: [2, 3] },
  m3: { rabbit: [4, 6], horse: [2, 3] },
  m4: { bat: [3, 4], horse: [2, 3] },
  m5: { horse: [2, 3] },
  m7: { sala: [2, 3] },
  m8: { fox: [1, 2] },
  m9: { moth: [3, 4] }
};
const SHEAR_CD = 120, EGG_EVERY = 90, EGG_MAX = 3, FOX_DIG = 180, DIG_LOOT = ['rock', 'hay', 'berry', 'seed', 'feather'];
const TILE = 16;
const tileOf = v => Math.floor(v / TILE);
const GRASSY = t => t === 1 || t === 2 || t === 3 || t === 17;   // GRASS GRASS2 FLOWER MOSS

// ---------------------------------------------------------------- state
let list = [];          // wild animals of this zone
let fx = [];            // particles
let trap = null;        // { x, y, obj, rabbit, t }
let coop = null;        // { x, y, obj }
let eggs = [];          // [{x,y,t}]
let pet = null;         // the tame fox that follows the player
let mount = null;       // the horse being ridden (entity pulled out of `list`)
let crystals = [];      // anchors for the moths
let T_ACC = 0;          // module clock (sprite animation)
let digT = FOX_DIG;     // seconds until the pet fox digs again (survives zone changes)
let fullT = 0;          // toast throttle for "hands full"

// ---------------------------------------------------------------- save slot
function sv(ctx) {
  const s = ctx.S.save; s.sys = s.sys || {};
  const e = (s.sys.ecology = s.sys.ecology || {});
  if (!e.horse) e.horse = { tamed: false };
  if (typeof e.feeds !== 'number') e.feeds = 0;
  if (typeof e.foxFeeds !== 'number') e.foxFeeds = 0;
  if (!e.pos) e.pos = {};
  if (!e.coop) e.coop = { hay: 0 };
  return e;
}

// ---------------------------------------------------------------- head-carry stack (shared with animals.js)
// animals.js owns save.sys.animals.carry and exports getCarry/removeCarry/carryFull, but not an add —
// so pushing is done here, exactly the way animals.js does it (mirror in save.inv + persist).
const MIRROR = ['cow', 'chicken', 'bird', 'fish', 'sheep', 'rabbit', 'crab', 'bat'];
const kindOf = it => (typeof it === 'string' ? it : (it && it.kind) || 'fish');
function carryArr(ctx) {
  const s = ctx.S.save; s.sys = s.sys || {};
  const a = (s.sys.animals = s.sys.animals || {});
  if (!Array.isArray(a.carry)) a.carry = [];
  return a.carry;
}
function syncInv(ctx) {
  const inv = (ctx.S.save.inv = ctx.S.save.inv || {});
  for (const k of MIRROR) inv[k] = 0;
  for (const it of carryArr(ctx)) { const k = kindOf(it); if (MIRROR.includes(k)) inv[k]++; }
}
function addCarry(ctx, kind) {
  const c = carryArr(ctx);
  if (!canCarry(ctx, kind)) return false;
  c.push(kind); syncInv(ctx); ctx.persist(); return true;
}
function headFull(ctx, quiet, kind = 'rabbit') {
  if (canCarry(ctx, kind)) return false;
  if (!quiet && T_ACC - fullT > 3) { fullT = T_ACC; ctx.toast(carryDeny(ctx, kind)); }
  return true;
}

// ---------------------------------------------------------------- particles
function puff(x, y, n = 8, c = '#fdf6e8') {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * TAU, sp = 10 + Math.random() * 26;
    fx.push({ k: 'puff', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 12, gy: 22, t: 0.45, life: 0.45, r: 1.6 + Math.random() * 2.2, c });
  }
}
function bits(x, y, n, c, spread = 26, up = 26) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * TAU;
    fx.push({ k: 'bit', x, y, vx: Math.cos(a) * spread * (0.4 + Math.random()), vy: -up - Math.random() * up, gy: 110, t: 0.8, life: 0.8, c, w: 2, h: 2 });
  }
}
function hearts(x, y, n = 5) {
  for (let i = 0; i < n; i++) fx.push({ k: 'heart', x: x + (Math.random() - 0.5) * 10, y: y - Math.random() * 4, vx: (Math.random() - 0.5) * 8, vy: -16 - Math.random() * 12, t: 1.1, life: 1.1 });
}
function sparkle(x, y, n = 8, c = '#bfe8ff') {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * TAU, sp = 12 + Math.random() * 24;
    fx.push({ k: 'bit', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, gy: 10, t: 0.6, life: 0.6, c, w: 1, h: 1 });
  }
}
function updateFx(dt) {
  for (let i = fx.length - 1; i >= 0; i--) {
    const p = fx[i]; p.t -= dt;
    if (p.t <= 0) { fx.splice(i, 1); continue; }
    if (p.vx !== undefined) { p.x += p.vx * dt; p.y += p.vy * dt; if (p.gy) p.vy += p.gy * dt; }
  }
  if (fx.length > 140) fx.splice(0, fx.length - 140);
}
function drawFx(g, cx, cy) {
  for (const p of fx) {
    const k = Math.max(0, p.t / p.life), x = Math.round(p.x) - cx, y = Math.round(p.y) - cy;
    if (p.k === 'puff') { g.globalAlpha = k * 0.9; g.fillStyle = p.c; g.beginPath(); g.arc(x, y, p.r * (0.6 + (1 - k) * 0.9), 0, TAU); g.fill(); }
    else if (p.k === 'bit') { g.globalAlpha = Math.min(1, k * 1.6); g.fillStyle = p.c; g.fillRect(x, y, p.w, p.h); }
    else if (p.k === 'heart') {
      g.globalAlpha = Math.min(1, k * 1.5); g.fillStyle = '#ff6b8b';
      g.fillRect(x - 2, y - 2, 2, 2); g.fillRect(x + 1, y - 2, 2, 2); g.fillRect(x - 2, y, 5, 2); g.fillRect(x - 1, y + 2, 3, 1); g.fillRect(x, y + 3, 1, 1);
    }
  }
  g.globalAlpha = 1;
}

// ---------------------------------------------------------------- map helpers
function inPlot(map, tx, ty, m = 0) { return map.plots.some(p => tx >= p.x - m && tx < p.x + p.w + m && ty >= p.y - m && ty < p.y + p.h + m); }
function onRoad(map, tx, ty) { return tx >= 0 && ty >= 0 && tx < map.w && ty < map.h && map.roads[ty * map.w + tx] === 1; }
function freeTile(ctx, tx, ty) {
  const map = ctx.S.map;
  if (tx < 2 || ty < 2 || tx > map.w - 3 || ty > map.h - 3) return false;
  if (ctx.isSolid(map, tx, ty)) return false;
  return !inPlot(map, tx, ty, 1) && !onRoad(map, tx, ty);
}
function walkable(ctx, x, y) { return freeTile(ctx, tileOf(x), tileOf(y)); }
function objAt(ctx, tx, ty) {
  return ctx.S.map.objects.some(o => { const d = ctx.O[o.type]; return d && tx >= o.x && tx < o.x + d.fw && ty >= o.y && ty < o.y + d.fh; });
}
function stepTo(ctx, a, dx, dy) {
  let moved = false;
  if (dx && walkable(ctx, a.x + dx, a.y)) { a.x += dx; moved = true; }
  if (dy && walkable(ctx, a.x, a.y + dy)) { a.y += dy; moved = true; }
  return moved;
}

// ---------------------------------------------------------------- spawning
function mk(kind, x, y, rng, extra) {
  return { kind, x, y, dir: rng() < 0.5 ? 1 : -1, st: 'idle', t: rng() * 2, ang: rng() * TAU, fr: 0, ft: rng() * 2, z: 0, hx: x, hy: y, ...extra };
}
// every free tile that passes `test`, then n of them picked at random and kept apart
function spots(ctx, rng, n, test, spacing = 3) {
  const map = ctx.S.map, ent = Object.values(map.entries || {}), all = [];
  for (let ty = 3; ty < map.h - 3; ty++) for (let tx = 3; tx < map.w - 3; tx++) {
    if (!freeTile(ctx, tx, ty)) continue;
    if (ent.some(e => Math.abs(e.x - tx) < 3 && Math.abs(e.y - ty) < 3)) continue;
    if (test && !test(tx, ty)) continue;
    all.push({ x: tx, y: ty });
  }
  const out = [];
  for (let guard = 0; guard < 600 && out.length < n && all.length; guard++) {
    const s = all[(rng() * all.length) | 0];
    if (out.some(o => Math.abs(o.x - s.x) < spacing && Math.abs(o.y - s.y) < spacing)) continue;
    out.push(s);
  }
  return out;
}
const nearTile = (ctx, tx, ty, r, want) => {
  for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (ctx.getG(ctx.S.map, tx + dx, ty + dy) === want) return true;
  return false;
};
function spawnKind(ctx, rng, kind, n, test) {
  for (const s of spots(ctx, rng, n, test)) list.push(mk(kind, s.x * TILE + 8, s.y * TILE + 14, rng));
}
function spawnBats(ctx, rng, n) {
  const map = ctx.S.map;
  // beams and rock walls, well inside the map (never the border ring) — that is where a bat hangs
  const inner = o => o.x > 3 && o.y > 3 && o.x < map.w - 5 && o.y < map.h - 5;
  const pick = re => map.objects.filter(o => re.test(o.type) && inner(o) && !inPlot(map, o.x, o.y, 0));
  const beams = pick(/beam|pillar|boulder/), rocks = pick(/rock|crate|cart|wall|turret|tower/);
  const walls = beams.length >= n ? beams : beams.concat(rocks);
  for (let i = 0; i < n; i++) {
    const w = walls.length ? walls[(rng() * walls.length) | 0] : null;
    let cx2, cy2;
    if (w) { const d = ctx.O[w.type]; cx2 = w.x * TILE + d.fw * 8; cy2 = (w.y + d.fh) * TILE - Math.min(d.h, 24) + 6; }
    else { const s = spots(ctx, rng, 1)[0]; if (!s) continue; cx2 = s.x * TILE + 8; cy2 = s.y * TILE + 13; }
    const a = mk('bat', cx2, cy2 - 10, rng, {
      st: 'fly', z: 0, cx: cx2, cy: cy2 - 16, rx: 26 + rng() * 26, ry: 14 + rng() * 14,
      av: (rng() < 0.5 ? -1 : 1) * (0.5 + rng() * 0.5), perch: { x: cx2, y: cy2 }, t: 3 + rng() * 5
    });
    list.push(a);
  }
}
function spawnMoths(ctx, rng, n) {
  const map = ctx.S.map;
  crystals = map.objects.filter(o => /crystal/.test(o.type)).map(o => { const d = ctx.O[o.type]; return { x: o.x * TILE + d.fw * 8, y: (o.y + d.fh) * TILE - Math.min(d.h, 20) }; });
  for (let i = 0; i < n; i++) {
    let a0;
    if (crystals.length) a0 = crystals[(rng() * crystals.length) | 0];
    else { const s = spots(ctx, rng, 1)[0]; if (!s) continue; a0 = { x: s.x * TILE + 8, y: s.y * TILE + 6 }; }
    list.push(mk('moth', a0.x, a0.y, rng, { cx: a0.x, cy: a0.y, rx: 10 + rng() * 12, ry: 6 + rng() * 8, av: (rng() < 0.5 ? -1 : 1) * (0.9 + rng()), z: 0 }));
  }
}
function spawnHorses(ctx, rng, n) {
  const e = sv(ctx), zid = ctx.S.zone.id;
  spawnKind(ctx, rng, 'horse', n);
  const hs = list.filter(a => a.kind === 'horse');
  if (!hs.length || !e.horse.tamed) return;
  const tame = hs[0]; tame.tame = true;
  const p = e.pos[zid];
  if (p && walkable(ctx, p.x, p.y)) { tame.x = p.x; tame.y = p.y; tame.hx = p.x; tame.hy = p.y; }
}

// ---------------------------------------------------------------- objects (trap, coop, egg)
function defineObjects(ctx) {
  ctx.defineObject('eco_trap', 16, 12, 1, 1, g => {                            // sprung: the jaws snapped shut
    px(g, 2, 6, OUT, 12, 5); px(g, 3, 7, '#8a5a2b', 10, 3); px(g, 3, 10, '#5f3d1c', 10, 1);
    px(g, 3, 3, OUT, 10, 4); px(g, 4, 4, '#9a9aa3', 8, 2);
    for (let i = 4; i < 12; i += 2) px(g, i, 2, '#dcdce4', 1, 2);
  }, { solid: false });
  ctx.defineObject('eco_trap_set', 16, 12, 1, 1, g => {                        // armed: open jaws around the bait
    px(g, 2, 5, OUT, 12, 6); px(g, 3, 6, '#8a5a2b', 10, 4); px(g, 3, 9, '#5f3d1c', 10, 1);
    px(g, 0, 4, OUT, 3, 6); px(g, 13, 4, OUT, 3, 6);                            // jaws swung open
    px(g, 1, 5, '#b9b9c2', 1, 4); px(g, 14, 5, '#b9b9c2', 1, 4);
    for (let i = 3; i < 13; i += 3) { px(g, i, 4, '#dcdce4', 1, 2); px(g, i, 10, '#dcdce4', 1, 2); }
    px(g, 6, 6, '#ffd45e', 4, 3); px(g, 7, 5, '#e8dcc0', 2, 1);                 // hay bait
  }, { solid: false });
  ctx.defineObject('eco_coop', 32, 34, 2, 2, g => {
    px(g, 2, 14, OUT, 28, 20); px(g, 3, 15, '#8a5a2b', 26, 18); px(g, 3, 29, '#5f3d1c', 26, 4);   // body
    for (let x = 5; x < 29; x += 4) px(g, x, 16, '#7a4d24', 2, 13);
    px(g, 0, 4, OUT, 32, 11);                                                                       // roof
    for (let y = 0; y < 9; y++) px(g, 1 + Math.floor(y * 0.3), 5 + y, y < 4 ? '#c94b33' : '#a53c28', 30 - Math.floor(y * 0.6), 1);
    px(g, 11, 20, OUT, 10, 12); px(g, 12, 21, '#2a2438', 8, 11);                                    // doorway
    px(g, 12, 30, '#e8dcc0', 8, 2);                                                                  // straw on the ramp
    px(g, 22, 18, OUT, 6, 6); px(g, 23, 19, '#ffd45e', 4, 4);                                        // hatch window
    px(g, 14, 0, OUT, 4, 5); px(g, 15, 1, '#e04b4b', 2, 3);                                          // weather vane
  }, { solid: true });
}
function placeTrap(ctx, tx, ty) {
  const o = ctx.place(ctx.S.map, 'eco_trap_set', tx, ty, {});
  trap = { x: tx * TILE + 8, y: ty * TILE + 12, tx, ty, obj: o, rabbit: false, t: 0 };
}
function springTrap(ctx) {
  trap.rabbit = true; trap.t = 0;
  ctx.removeObject(ctx.S.map, trap.obj);
  trap.obj = ctx.place(ctx.S.map, 'eco_trap', trap.tx, trap.ty, {});
  puff(trap.x, trap.y - 4, 8, '#e8e3d8'); bits(trap.x, trap.y - 4, 5, '#c3bcae');
  ctx.sfx('squeak'); ctx.toast(L(ctx).trapSprung);
}
function takeTrap(ctx) {
  if (ctx.trespass && !ctx.trespass(trap.tx, trap.ty, 'catch')) return;   /* plan-18 */
  if (headFull(ctx)) return;
  addCarry(ctx, 'rabbit');
  ctx.removeObject(ctx.S.map, trap.obj);
  puff(trap.x, trap.y - 6, 8);
  trap = null;
  ctx.sfx('pickup'); ctx.toast(L(ctx).gotRabbit);
}
// a 2×2 patch as close to the village plaza as we can get: off the roads, out of the nation yards
function coopSpot(ctx) {
  const map = ctx.S.map;
  const ok = (x, y) => {
    for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) {
      const tx = x + i, ty = y + j;
      if (tx < 3 || ty < 3 || tx > map.w - 4 || ty > map.h - 4) return false;
      if (ctx.isSolid(map, tx, ty) || objAt(ctx, tx, ty) || onRoad(map, tx, ty) || inPlot(map, tx, ty, 1)) return false;
      if (map.reserved.some(r => r.x === tx && r.y === ty)) return false;
    }
    return !ctx.isSolid(map, x, y + 2) && !objAt(ctx, x, y + 2);      // somewhere to stand in front of the door
  };
  let best = null, bd = Infinity;
  for (let y = 6; y <= 30; y++) for (let x = 14; x <= 66; x++) {
    if (!ok(x, y)) continue;
    const d = Math.hypot(x + 1 - 40, (y + 1 - 10) * 1.4);            // the plaza sits at (40, 3..9)
    if (d < bd) { bd = d; best = { x, y }; }
  }
  if (best) return best;
  for (let y = 4; y < map.h - 6; y++) for (let x = 3; x < map.w - 5; x++) if (ok(x, y)) return { x, y };
  return null;
}
function placeCoop(ctx) {
  const s = coopSpot(ctx); if (!s) return;
  const o = ctx.place(ctx.S.map, 'eco_coop', s.x, s.y, {});
  coop = { x: s.x * TILE + 16, y: (s.y + 2) * TILE, tx: s.x, ty: s.y, obj: o, t: EGG_EVERY };
}
function layEgg(ctx) {
  if (eggs.length >= EGG_MAX) return;
  for (let i = 0; i < 12; i++) {
    const a = Math.random() * TAU, r = 16 + Math.random() * 18;
    const x = coop.x + Math.cos(a) * r, y = coop.y + 6 + Math.sin(a) * r * 0.6;
    if (!walkable(ctx, x, y)) continue;
    if (eggs.some(e => Math.hypot(e.x - x, e.y - y) < 8)) continue;
    eggs.push({ x, y, t: 0 }); puff(x, y - 3, 4, '#fbf8f2'); return;
  }
}

// ---------------------------------------------------------------- riding
let prevBonus = 0;   // whatever another system had granted before we climbed on
function restorePlayer(ctx) {
  const p = ctx.S.player;
  p.speedMul = 1; p.passable = null; p.custom = null; p.ghost = false; p.boxW = 10; p.boxH = 6;
  ctx.bag.setBonus(prevBonus);
}
function drawHorseRider(g, ent) {
  const x = Math.round(ent.x), y = Math.round(ent.y), d = ent.dir & 3;
  const f = ent.moving ? (Math.floor(T_ACC * 7) & 1) : 0;
  const bob = ent.moving ? (Math.floor(T_ACC * 7) & 1) : 0;
  g.fillStyle = 'rgba(0,0,0,.22)'; g.beginPath(); g.ellipse(x, y, 11, 3.5, 0, 0, TAU); g.fill();
  if (d === 1 || d === 2) {
    g.drawImage(RIDE.side[f][d === 1 ? 1 : 0], x - 12, y - 18 - bob);
    g.drawImage(ent.sheet, (ent.frame || 0) * 16, d * 20, 16, 15, x - 8, y - 29 - bob, 16, 15);
    const lx = d === 1 ? x + 1 : x - 4;                                  // the rider's near leg, over the flank
    px(g, lx, y - 15 - bob, OUT, 3, 5); px(g, lx, y - 15 - bob, '#2f3b5e', 2, 3); px(g, lx, y - 12 - bob, '#3a2f22', 2, 2);
  } else {
    g.drawImage(d === 0 ? RIDE.front[f] : RIDE.back[f], x - 8, y - 18 - bob);
    g.drawImage(ent.sheet, (ent.frame || 0) * 16, d * 20, 16, 15, x - 8, y - 29 - bob, 16, 15);
  }
}
function ride(ctx, a) {
  const p = ctx.S.player, S = L(ctx);
  if (p.custom) { ctx.toast(S.busy); return; }               // already on a boat / jeep / ski / Rocky
  if (ctx.tool.tier('saddle') < 1) { ctx.toast(S.needSaddle); ctx.sfx('fail'); return; }
  const i = list.indexOf(a); if (i >= 0) list.splice(i, 1);
  mount = a;
  p.speedMul = 1.8; p.boxW = 14; p.custom = drawHorseRider;
  prevBonus = ctx.S.bagBonus || 0;                            // hand it back when the ride ends
  ctx.bag.setBonus(40);
  puff(p.x, p.y - 6, 6, '#e0d4b6'); ctx.sfx('craft');
  const e = sv(ctx); e.pos[ctx.S.zone.id] = { x: p.x, y: p.y }; ctx.persist();
}
function dismount(ctx, silent) {
  if (!mount) return;
  const p = ctx.S.player;
  restorePlayer(ctx);
  mount.x = p.x; mount.y = p.y; mount.hx = p.x; mount.hy = p.y; mount.st = 'idle'; mount.t = 1.2;
  // nudge the horse one step aside so it does not stand exactly on the player
  for (const [dx, dy] of [[14, 0], [-14, 0], [0, 12], [0, -12]]) { if (walkable(ctx, p.x + dx, p.y + dy)) { mount.x = p.x + dx; mount.y = p.y + dy; break; } }
  list.push(mount);
  const e = sv(ctx); e.pos[ctx.S.zone.id] = { x: mount.x, y: mount.y };
  mount = null; ctx.persist();
  if (!silent) { puff(p.x, p.y - 6, 5, '#e0d4b6'); ctx.sfx('build'); }
}

// ---------------------------------------------------------------- actions
function catchAnimal(ctx, a, kind, msg) {
  if (ctx.trespass && !ctx.trespass(Math.floor(a.x / 16), Math.floor(a.y / 16), 'catch')) return;   /* plan-18 */
  if (headFull(ctx, false, kind)) return;
  const i = list.indexOf(a); if (i < 0) return;
  list.splice(i, 1);
  puff(a.x, a.y - 5, 9); bits(a.x, a.y - 5, 4, '#fdf6e8');
  addCarry(ctx, kind);
  ctx.sfx('pickup'); ctx.toast(msg);
}
function shear(ctx, a) {
  const S = L(ctx);
  a.shorn = true; a.shearT = SHEAR_CD;
  const n = ctx.bag.add('wool', 2);
  bits(a.x, a.y - 8, 10, '#f7f3e9', 30, 34);
  ctx.sfx('chop'); ctx.toast(n > 0 ? S.gotWool : L(ctx).full);
}
function feedHorse(ctx, a) {
  const S = L(ctx), e = sv(ctx);
  if (!ctx.bag.has('hay', 1)) { ctx.toast(S.needHay); ctx.sfx('fail'); return; }
  ctx.bag.remove('hay', 1);
  e.feeds = Math.min(3, e.feeds + 1);
  bits(a.x + (a.dir > 0 ? 8 : -8), a.y - 8, 6, '#ffd45e', 18, 16);
  if (e.feeds >= 3 && !e.horse.tamed) {
    e.horse.tamed = true; a.tame = true;
    hearts(a.x, a.y - 14, 7); ctx.sfx('win'); ctx.toast(S.horseTame, true);
    e.pos[ctx.S.zone.id] = { x: a.x, y: a.y };
  } else {
    hearts(a.x, a.y - 12, 2); ctx.sfx('squeak'); ctx.toast(S.horseAte(e.feeds));
  }
  ctx.persist();
}
function catchCrab(ctx, a) {
  const S = L(ctx);
  if (Math.random() < 0.3) {
    const had = ctx.bag.count('stone') > 0;
    if (had) ctx.bag.remove('stone', 1);
    bits(a.x, a.y - 6, 6, '#ff8c8c', 24, 28);
    a.st = 'flee'; a.t = 1.4; a.ang = Math.atan2(a.y - ctx.S.player.y, a.x - ctx.S.player.x);
    ctx.sfx('fail'); ctx.toast(had ? S.pinch : S.pinch0);
    return;
  }
  catchAnimal(ctx, a, 'crab', S.gotCrab);
}
function scoopLava(ctx, a) {
  const S = L(ctx);
  if (ctx.tool.tier('bucket') < 2) { ctx.toast(S.needBucket); ctx.sfx('fail'); return; }
  const n = ctx.bag.add('lava', 1);
  const i = list.indexOf(a); if (i >= 0) list.splice(i, 1);
  bits(a.x, a.y - 4, 10, '#ff8c1a', 26, 30); bits(a.x, a.y - 4, 6, '#ffd45e', 20, 24);
  ctx.sfx('splash'); ctx.toast(n > 0 ? S.gotLava : L(ctx).full);
}
function catchMoth(ctx, a) {
  const S = L(ctx);
  const i = list.indexOf(a); if (i >= 0) list.splice(i, 1);
  if (Math.random() < 0.2) { sparkle(a.x, a.y, 6, '#a8d8f5'); ctx.sfx('fail'); ctx.toast(S.mothGone); return; }
  const n = ctx.bag.add('crystal', 1);
  sparkle(a.x, a.y, 12); ctx.sfx('coin'); ctx.toast(n > 0 ? S.gotCrystal : L(ctx).full);
}
function feedFox(ctx, a) {
  const S = L(ctx), e = sv(ctx);
  const items = getCarry(ctx), i = items.findIndex(it => it.kind === 'fish');
  if (i < 0) { ctx.toast(S.foxNeed); ctx.sfx('fail'); return; }
  removeCarry(ctx, i); syncInv(ctx);
  e.foxFeeds = Math.min(3, e.foxFeeds + 1);
  bits(a.x, a.y - 6, 6, '#a8d8f5', 20, 20);
  if (e.foxFeeds >= 3 && !e.fox) {
    e.fox = true;
    for (let j = list.length - 1; j >= 0; j--) if (list[j].kind === 'fox') list.splice(j, 1);
    pet = { kind: 'fox', x: a.x, y: a.y, dir: 1, fr: 0, ft: 0, st: 'walk' };
    digT = FOX_DIG;
    hearts(a.x, a.y - 12, 8); ctx.sfx('win'); ctx.toast(S.foxPet, true);
  } else {
    hearts(a.x, a.y - 10, 2); ctx.sfx('squeak'); ctx.toast(S.foxAte(e.foxFeeds));
  }
  ctx.persist();
}
function feedCoop(ctx) {
  const S = L(ctx), e = sv(ctx);
  if (e.coop.hay >= 3) { ctx.toast(S.coopOk); return; }
  if (!ctx.bag.has('hay', 1)) { ctx.toast(S.coopNeedHay); ctx.sfx('fail'); return; }
  ctx.bag.remove('hay', 1);
  e.coop.hay++;
  bits(coop.x, coop.y - 16, 7, '#ffd45e', 20, 22);
  if (e.coop.hay >= 3) { coop.t = Math.min(coop.t, 6); ctx.sfx('win'); ctx.toast(S.coopReady, true); }
  else { ctx.sfx('build'); ctx.toast(S.coopFeed(e.coop.hay)); }
  ctx.persist();
}
function foxDig(ctx) {
  const p = ctx.S.player, id = DIG_LOOT[(Math.random() * DIG_LOOT.length) | 0];
  const n = ctx.bag.add(id, 1);
  const fxx = pet ? pet.x : p.x, fxy = pet ? pet.y : p.y;
  bits(fxx, fxy, 9, '#c9a86b', 22, 26); puff(fxx, fxy - 2, 5, '#d8c9a8');
  ctx.sfx('craft');
  if (n > 0) ctx.toast(L(ctx).foxDug(`${ctx.itemIcon(id)} ${ctx.itemName(id)}`));
}

// ---------------------------------------------------------------- movement
function wander(dt, ctx, a, p, playing) {
  const k = K[a.kind]; if (!k) return;
  a.t -= dt;
  if (playing && k.flee && Math.hypot(a.x - p.x, a.y - p.y) < (a.kind === 'rabbit' ? 42 : 13) && a.st !== 'flee') {
    a.st = 'flee'; a.t = a.kind === 'rabbit' ? 1.6 : 1.2;
    a.ang = Math.atan2(a.y - p.y, a.x - p.x) + (Math.random() - 0.5) * 0.6;
  }
  if (a.st === 'flee') {
    const sp = k.flee * dt;
    if (!stepTo(ctx, a, Math.cos(a.ang) * sp, Math.sin(a.ang) * sp)) a.ang += 1.7;
    if (a.t <= 0) { a.st = 'idle'; a.t = 0.5 + Math.random() * 1.4; }
  } else if (a.st === 'walk') {
    const sp = k.sp * dt;
    if (!stepTo(ctx, a, Math.cos(a.ang) * sp, Math.sin(a.ang) * sp)) a.ang += 1.9;
    if (a.hr && Math.hypot(a.x - a.hx, a.y - a.hy) > a.hr) a.ang = Math.atan2(a.hy - a.y, a.hx - a.x) + (Math.random() - 0.5) * 0.6;
    if (a.t <= 0) { a.st = 'idle'; a.t = 0.6 + Math.random() * 2.2; }
  } else if (a.t <= 0) {
    a.st = 'walk'; a.t = 0.5 + Math.random() * 1.6;
    a.ang = Math.random() * TAU;
    if (a.kind === 'rabbit' && trap && !trap.rabbit && Math.hypot(trap.x - a.x, trap.y - a.y) < 220 && Math.random() < 0.55) {
      a.ang = Math.atan2(trap.y - a.y, trap.x - a.x) + (Math.random() - 0.5) * 0.5;   // the bait pulls it in
    }
    if (a.hr && Math.hypot(a.x - a.hx, a.y - a.hy) > a.hr * 0.8) a.ang = Math.atan2(a.hy - a.y, a.hx - a.x) + (Math.random() - 0.5) * 0.8;
  }
  if (a.st !== 'idle') { a.dir = Math.cos(a.ang) >= 0 ? 1 : -1; a.face = faceOf(a); }
  a.ft += dt * (a.st === 'idle' ? k.idle : k.anim * (a.st === 'flee' ? 1.4 : 1));
  a.fr = (a.ft | 0) % 2;
}
// the wild snow fox keeps its distance but does not run off — you can still hold a fish out to it
function wanderFox(dt, ctx, a, p, playing) {
  const d = Math.hypot(a.x - p.x, a.y - p.y);
  if (playing && d < 22) {
    a.st = 'walk'; a.t = Math.max(a.t, 0.3);
    a.ang = Math.atan2(a.y - p.y, a.x - p.x);
    const sp = 30 * dt;
    if (!stepTo(ctx, a, Math.cos(a.ang) * sp, Math.sin(a.ang) * sp)) a.ang += 1.5;
    a.dir = Math.cos(a.ang) >= 0 ? 1 : -1; a.face = faceOf(a);
    a.ft += dt * K.fox.anim; a.fr = (a.ft | 0) % 2;
    return;
  }
  wander(dt, ctx, a, p, false);
}
function updateBat(dt, ctx, a) {
  if (a.st === 'fly') {
    a.ang += a.av * dt; a.t -= dt;
    a.x = a.cx + Math.cos(a.ang) * a.rx; a.y = a.cy + Math.sin(a.ang) * a.ry * 0.7;
    const map = ctx.S.map;                                        // never drift off the map
    a.x = Math.max(32, Math.min((map.w - 2) * TILE, a.x)); a.y = Math.max(32, Math.min((map.h - 2) * TILE, a.y));
    a.dir = (-Math.sin(a.ang) * a.av) >= 0 ? 1 : -1;
    if (a.t <= 0) { a.st = 'land'; a.t = 0.5; a.sx = a.x; a.sy = a.y; }
  } else if (a.st === 'land') {
    a.t -= dt; const k = Math.max(0, a.t / 0.5);
    a.x = a.perch.x + (a.sx - a.perch.x) * k; a.y = a.perch.y + (a.sy - a.perch.y) * k;
    if (a.t <= 0) { a.st = 'sit'; a.x = a.perch.x; a.y = a.perch.y; a.t = 3 + Math.random() * 2; }
  } else if (a.st === 'sit') {
    a.t -= dt;
    if (a.t <= 0) { a.st = 'fly'; a.t = 4 + Math.random() * 5; a.ang = Math.random() * TAU; a.cx = a.perch.x; a.cy = a.perch.y - 18; }
  }
  a.ft += dt * (a.st === 'sit' ? 1.2 : 11); a.fr = (a.ft | 0) % 2;
}
function updateMoth(dt, ctx, a) {
  a.ang += a.av * dt;
  a.x = a.cx + Math.cos(a.ang) * a.rx + Math.sin(a.ang * 3.1) * 2;
  a.y = a.cy + Math.sin(a.ang * 1.7) * a.ry;
  a.dir = Math.cos(a.ang) >= 0 ? 1 : -1; a.face = faceOf(a);
  a.ft += dt * 12; a.fr = (a.ft | 0) % 2;
}
function updatePet(dt, ctx) {
  const p = ctx.S.player;
  const back = (p.dir === 1 ? 1 : p.dir === 2 ? -1 : 0) * 13;
  const down = p.dir === 3 ? 10 : p.dir === 0 ? -11 : 4;
  const tx = p.x + back, ty = p.y + down;
  const dx = tx - pet.x, dy = ty - pet.y, d = Math.hypot(dx, dy);
  if (d > 6) {
    const sp = Math.min(d, (34 + d * 1.6) * dt);
    const nx = pet.x + dx / d * sp, ny = pet.y + dy / d * sp;
    const map = ctx.S.map;                                          // the pet may cross roads, just not walls
    if (!ctx.isSolid(map, tileOf(nx), tileOf(pet.y))) pet.x = nx;
    if (!ctx.isSolid(map, tileOf(pet.x), tileOf(ny))) pet.y = ny;
    if (Math.hypot(pet.x - p.x, pet.y - p.y) > 90) { pet.x = p.x; pet.y = p.y; }   // never lose it
    pet.dir = dx >= 0 ? 1 : -1;
    pet.ft += dt * 8;
  } else pet.ft += dt * 1.2;
  pet.fr = (pet.ft | 0) % 2;
}

// ---------------------------------------------------------------- system
export const ecology = {
  id: 'ecology',

  onZoneEnter(ctx) {
    if (mount) restorePlayer(ctx);                       // a reload straight into a ride: put the player back
    list = []; fx = []; eggs = []; trap = null; coop = null; crystals = []; mount = null; pet = null;
    defineObjects(ctx);
    syncInv(ctx);
    const e = sv(ctx), id = ctx.S.zone.id;
    const rng = ctx.rngFrom(((ctx.hashStr('eco:' + id) ^ (Date.now() >>> 7)) >>> 0) || 7);
    const n = r => r[0] + ((rng() * (r[1] - r[0] + 1)) | 0);
    const th = TH[id];
    if (th) {
      if (th.sheep) spawnKind(ctx, rng, 'sheep', n(th.sheep));
      if (th.horse) spawnHorses(ctx, rng, n(th.horse));
      if (th.rabbit) spawnKind(ctx, rng, 'rabbit', n(th.rabbit));
      if (th.crab) spawnKind(ctx, rng, 'crab', n(th.crab), (x, y) => nearTile(ctx, x, y, 4, ctx.T.WATER));
      if (th.bat) spawnBats(ctx, rng, n(th.bat));
      if (th.sala) spawnKind(ctx, rng, 'sala', n(th.sala), (x, y) => nearTile(ctx, x, y, 2, ctx.T.LAVA));
      if (th.fox && !e.fox) spawnKind(ctx, rng, 'fox', n(th.fox));
      if (th.moth) spawnMoths(ctx, rng, n(th.moth));
    }
    for (const a of list) if (a.kind === 'sala' || a.kind === 'fox' || a.kind === 'crab') a.hr = 64;
    if (id === 'village') placeCoop(ctx);
    if (e.fox) { const p = ctx.S.player; pet = { kind: 'fox', x: p.x - 12, y: p.y + 4, dir: 1, fr: 0, ft: 0 }; }
    ctx.persist();
    if (typeof window !== 'undefined') window.__eco = {
      state: () => ({
        zone: ctx.S.zone.id, n: list.length,
        kinds: list.reduce((o, a) => (o[a.kind] = (o[a.kind] || 0) + 1, o), {}),
        mounted: !!mount, pet: !!pet, digT, trap: trap && { x: trap.x, y: trap.y, rabbit: trap.rabbit },
        coop: coop && { x: coop.x, y: coop.y, t: Math.round(coop.t) },
        eggs: eggs.length, eggsAt: eggs.map(e => ({ x: Math.round(e.x), y: Math.round(e.y) })), save: sv(ctx)
      }),
      list: () => list.map(a => ({ kind: a.kind, x: Math.round(a.x), y: Math.round(a.y), st: a.st, shorn: !!a.shorn, tame: !!a.tame })),
      warp: (kind, dx = 16) => { const a = list.find(x => x.kind === kind); if (!a) return null; ctx.S.player.x = a.x + dx; ctx.S.player.y = a.y + 4; return { x: a.x, y: a.y }; },
      bring: (kind) => {
        const a = list.find(x => x.kind === kind), p = ctx.S.player; if (!a) return null;
        a.x = p.x + 16; a.y = p.y; a.st = 'idle'; a.t = 6;
        if (a.cx !== undefined) { a.cx = p.x + 16; a.cy = p.y - 8; }
        if (a.perch) { a.perch.x = p.x + 16; a.perch.y = p.y - 4; }
        return { x: a.x, y: a.y };
      },
      perch: () => { const a = list.find(x => x.kind === 'bat'); if (!a) return null; a.st = 'sit'; a.x = a.perch.x; a.y = a.perch.y; a.t = 20; ctx.S.player.x = a.x; ctx.S.player.y = a.y + 22; return { x: a.x, y: a.y }; },
      trapNow: () => { if (trap && !trap.rabbit) springTrap(ctx); return !!trap; },
      eggNow: () => { if (coop) { coop.t = 0.05; } return !!coop; },
      digNow: () => { digT = 0.05; return !!pet; },
      shearReset: () => { for (const a of list) { a.shorn = false; a.shearT = 0; } return true; }
    };
  },

  onZoneLeave(ctx) {
    if (mount) dismount(ctx, true);
    restorePlayer(ctx);
    list = []; fx = []; eggs = []; trap = null; coop = null; crystals = []; pet = null;
  },

  update(dt, ctx) {
    T_ACC += dt;
    const p = ctx.S.player, playing = ctx.S.mode === 'play';
    for (const a of list) {
      if (a.kind === 'bat') updateBat(dt, ctx, a);
      else if (a.kind === 'moth') updateMoth(dt, ctx, a);
      else if (a.kind === 'fox') wanderFox(dt, ctx, a, p, playing);
      else wander(dt, ctx, a, p, playing);
      if (a.shearT > 0) { a.shearT -= dt; if (a.shearT <= 0) a.shorn = false; }
    }
    // ridden horse: remember where it is, so it stays there when you get off or leave
    if (mount) {
      const e = sv(ctx);
      mount.x = p.x; mount.y = p.y;
      if (!e.pos[ctx.S.zone.id] || Math.hypot(e.pos[ctx.S.zone.id].x - p.x, e.pos[ctx.S.zone.id].y - p.y) > 24) e.pos[ctx.S.zone.id] = { x: p.x, y: p.y };
      if (p.custom !== drawHorseRider) {                              // something else took the player over
        mount.st = 'idle'; mount.t = 1.5; list.push(mount); mount = null;
        ctx.bag.setBonus(prevBonus); ctx.persist();
      }
    }
    // trap
    if (trap) {
      if (!trap.rabbit) {
        for (const a of list) if (a.kind === 'rabbit' && Math.hypot(a.x - trap.x, a.y - trap.y) < 10) { const i = list.indexOf(a); list.splice(i, 1); springTrap(ctx); break; }
      } else if (playing && Math.hypot(p.x - trap.x, p.y - trap.y) < 12) {
        if (!headFull(ctx)) takeTrap(ctx);
      }
    }
    // chicken coop + eggs
    if (coop) {
      const e = sv(ctx);
      if (e.coop.hay >= 3) {
        coop.t -= dt;
        if (coop.t <= 0) { coop.t = EGG_EVERY; layEgg(ctx); }
      }
      for (let i = eggs.length - 1; i >= 0; i--) {
        const eg = eggs[i]; eg.t += dt;
        if (playing && Math.hypot(eg.x - p.x, eg.y - p.y) < 10) {
          eggs.splice(i, 1);
          const n = ctx.bag.add('egg', 1);
          puff(eg.x, eg.y - 3, 5, '#fbf8f2'); ctx.sfx('pickup');
          if (n > 0) ctx.toast(L(ctx).gotEgg);
        }
      }
    }
    // the pet fox
    if (pet) {
      updatePet(dt, ctx);
      digT -= dt;
      if (digT <= 0) { digT = FOX_DIG; foxDig(ctx); }
    }
    updateFx(dt);
  },

  drawables(ctx, cx, cy) {
    const out = [], g = ctx.g, VW = ctx.VW, VH = ctx.VH;
    const push = (a, img, dx, dy, y) => out.push({ y, f: () => g.drawImage(img, dx, dy) });
    for (const a of list) {
      const sx = a.x - cx, sy = a.y - cy;
      if (sx < -48 || sy < -64 || sx > VW + 48 || sy > VH + 48) continue;
      const set0 = SPR[a.kind === 'sheep' && a.shorn ? 'sheepShorn' : a.kind === 'bat' ? (a.st === 'sit' ? 'batSit' : 'bat') : a.kind]; let set = set0;
      if (!set) continue;
      if ((a.st === 'idle' || a.st === 'sit') && set.idle) set = set.idle;   // clip idle PixelLab nếu có
      const img = dirFrame(set0, a.face, a.ft, a.st !== 'idle' && a.st !== 'sit') || set[a.fr % set.length][a.dir < 0 ? 1 : 0];   /* plan-11 */
      const dx = Math.round(a.x) - (img.width >> 1) - cx;
      const dy = Math.round(a.y) - img.height - cy;
      if (a.kind === 'bat' || a.kind === 'moth') {
        push(a, img, dx, dy, 1e5 + a.y);                                     // flyers draw over everything
      } else {
        push(a, img, dx, dy, a.y);
      }
    }
    if (trap && trap.rabbit) {                                     // the catch sits in the jaws until you fetch it
      const img = SPR.rabbit[((T_ACC * 1.5) | 0) % 2][0];
      const dx = Math.round(trap.x) - (img.width >> 1) - cx, dy = Math.round(trap.y) - 5 - img.height - cy;
      out.push({ y: trap.y + 0.2, f: () => g.drawImage(img, dx, dy) });
    }
    if (pet) {
      const img = SPR.fox[pet.fr][pet.dir < 0 ? 1 : 0];
      const dx = Math.round(pet.x) - (img.width >> 1) - cx, dy = Math.round(pet.y) - img.height - cy;
      out.push({ y: pet.y - 0.1, f: () => g.drawImage(img, dx, dy) });
    }
    for (const eg of eggs) {
      const x = Math.round(eg.x) - cx, y = Math.round(eg.y) - cy, bob = Math.round(Math.sin(T_ACC * 3 + eg.x));
      out.push({
        y: eg.y, f: () => {
          g.fillStyle = 'rgba(0,0,0,.2)'; g.beginPath(); g.ellipse(x, y, 4, 1.6, 0, 0, TAU); g.fill();
          g.fillStyle = OUT;                                                   // a rounded shell, not a white brick
          g.fillRect(x - 1, y - 9 + bob, 2, 1); g.fillRect(x - 2, y - 8 + bob, 4, 1);
          g.fillRect(x - 3, y - 7 + bob, 6, 5); g.fillRect(x - 2, y - 2 + bob, 4, 1);
          g.fillStyle = '#fbf8f2';
          g.fillRect(x - 1, y - 8 + bob, 2, 1); g.fillRect(x - 2, y - 7 + bob, 4, 5);
          g.fillStyle = '#e8dcc0'; g.fillRect(x - 2, y - 3 + bob, 4, 1);
          g.fillStyle = '#ffffff'; g.fillRect(x - 1, y - 7 + bob, 1, 2);
        }
      });
    }
    /* plan-9: đồ mang theo do animals.js vẽ tập trung (sprite đã đăng ký qua registerHead) */
    return out;
  },

  draw(g, ctx, cx, cy) { drawFx(g, cx, cy); },

  near(ctx) {
    const S = L(ctx), p = ctx.S.player, e = sv(ctx);
    if (mount) return { label: S.off, x: p.x, y: p.y, limit: 15, data: { act: 'off' } };
    let best = null, bd = Infinity;
    // x,y = where the prompt sits (and what the core measures distance to), lim = reach for that kind
    const take = (a, x, y, lim, label, act) => {
      const d = Math.hypot(x - p.x, y - p.y);
      if (d < lim && d < bd) { bd = d; best = { label, x, y, limit: lim, data: { act, a } }; }
    };
    for (const a of list) {
      if (a.kind === 'sheep') {
        const canShear = ctx.tool.tier('knife') >= 1 && !a.shorn;
        take(a, a.x, a.y, K.sheep.lim, canShear ? S.shear : S.sheep, canShear ? 'shear' : 'catch');
      } else if (a.kind === 'horse') {
        if (e.horse.tamed && a.tame) {
          if (p.custom) continue;                                        // on a boat / jeep / Rocky: no riding
          take(a, a.x, a.y, K.horse.lim, ctx.tool.tier('saddle') >= 1 ? S.ride : S.needSaddle, 'ride');
        } else take(a, a.x, a.y, K.horse.lim, ctx.bag.has('hay', 1) ? S.feedHay : S.needHay, 'hay');
      } else if (a.kind === 'crab') take(a, a.x, a.y, K.crab.lim, S.crab, 'crab');
      else if (a.kind === 'bat') { if (a.st === 'sit') take(a, a.x, a.y + 14, 32, S.bat, 'bat'); }
      else if (a.kind === 'sala') take(a, a.x, a.y, K.sala.lim, ctx.tool.tier('bucket') >= 2 ? S.scoop : S.needBucket, 'sala');
      else if (a.kind === 'fox') take(a, a.x, a.y, K.fox.lim, getCarry(ctx).some(it => it.kind === 'fish') ? S.foxFeed : S.foxNeed, 'fox');
      else if (a.kind === 'moth') take(a, a.x, a.y + 10, 26, S.moth, 'moth');
    }
    if (best) return best;
    if (trap && trap.rabbit) {
      const d = Math.hypot(trap.x - p.x, trap.y - p.y);
      if (d < 26) return { label: S.trapTake, x: trap.x, y: trap.y, limit: 26, data: { act: 'trapTake' } };
    }
    if (coop) {
      const d = Math.hypot(coop.x - p.x, coop.y - p.y);
      if (d < 34) return { label: e.coop.hay >= 3 ? S.coopOk : S.coopFeed(e.coop.hay), x: coop.x, y: coop.y - 8, limit: 34, data: { act: 'coop' } };
    }
    if (!trap && ctx.tool.tier('trap') >= 1 && list.some(a => a.kind === 'rabbit')) {
      const tx = tileOf(p.x), ty = tileOf(p.y);
      if (GRASSY(ctx.getG(ctx.S.map, tx, ty)) && freeTile(ctx, tx, ty) && !objAt(ctx, tx, ty)) {
        return { label: S.setTrap, x: p.x, y: p.y, limit: 20, data: { act: 'trapSet', tx, ty } };
      }
    }
    return null;
  },

  interact(ctx, cand) {
    const d = cand && cand.data; if (!d) return;
    const S = L(ctx);
    switch (d.act) {
      case 'off': dismount(ctx); break;
      case 'catch': catchAnimal(ctx, d.a, 'sheep', S.gotSheep); break;
      case 'shear': if (d.a.shorn) ctx.toast(S.shorn); else shear(ctx, d.a); break;
      case 'hay': feedHorse(ctx, d.a); break;
      case 'ride': ride(ctx, d.a); break;
      case 'crab': catchCrab(ctx, d.a); break;
      case 'bat': catchAnimal(ctx, d.a, 'bat', S.gotBat); break;
      case 'sala': scoopLava(ctx, d.a); break;
      case 'fox': feedFox(ctx, d.a); break;
      case 'moth': catchMoth(ctx, d.a); break;
      case 'trapSet': placeTrap(ctx, d.tx, d.ty); ctx.sfx('build'); ctx.toast(S.trapDone); break;
      case 'trapTake': if (trap && trap.rabbit) takeTrap(ctx); break;
      case 'coop': feedCoop(ctx); break;
    }
  },

  hudLines(ctx) {
    const out = [];
    const n = {};                                               // straight off the head stack: never a stale mirror
    for (const it of carryArr(ctx)) { const k = kindOf(it); n[k] = (n[k] || 0) + 1; }
    // 🐏 for a sheep on your head — 🐑 is already the wool icon in the bag line
    const carried = [['sheep', '🐏'], ['rabbit', '🐰'], ['crab', '🦀'], ['bat', '🦇']].filter(([k]) => n[k] > 0).map(([k, ic]) => `${ic} ${n[k]}`);
    if (carried.length) out.push(carried.join(' '));
    if (mount) out.push('🐎');
    if (pet) out.push('🦊');
    if (trap) out.push(trap.rabbit ? '🪤 🐰' : '🪤');
    return out;
  }
};
