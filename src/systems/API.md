# Systems API (for gameplay modules in `src/systems/`)

Each module exports one object. Every hook is optional. `ctx` is the shared context object built by `main.js` (same object every call).

```js
export const mySystem = {
  id: 'mySystem',
  onZoneEnter(ctx) {},                 // zone loaded, NPCs placed. Spawn your entities here. Called on every zone change.
  update(dt, ctx) {},                  // every frame, before NPC updates. dt in seconds (≤ 0.05).
  onZoneLeave(ctx) {},                 // called just before the current map is discarded (zone change). Restore player defaults here.
  near(ctx) { return null; },          // return { label, x, y, limit, priority?, data } for the closest interactable thing you own, or null.
                                       //   priority: true → wins over NPCs/objects regardless of distance (still must be within limit).
                                       //   label: prompt text (already localized). x,y: world px of the thing. limit: px radius. Core picks the closest across systems/NPCs/objects.
  interact(ctx, cand) {},              // player pressed E while your `near` candidate was the closest. cand = what you returned from near().
  drawables(ctx, cx, cy) { return []; }, // depth-sorted world sprites: [{ y: worldBottomY, f: () => ctx.g.drawImage(..., worldX - cx, worldY - cy) }]
  draw(g, ctx, cx, cy) {},             // drawn on the pixel canvas after everything, before tint/labels (overlays, effects). Screen coords = world - cx/cy.
  drawUI(ug, ctx, cx, cy, scale) {},   // full-resolution overlay canvas (crisp text, bars). Screen px = (world - cx) * scale.
  key(code, ctx) { return false; },    // keydown (e.code). Return true if consumed.
  hudLines(ctx) { return []; },        // extra short strings for the HUD (inventory line is drawn by core from save.inv).
};
```

## ctx fields
- `S` — game state: `S.save` (persisted, see `save.js`), `S.zone` (ZONES entry: id, lv, tier, tremor…), `S.map` (tiles: `ground`, `solid`, `w`, `h`, `objects`, `plots[{x,y,w,h,nation,spawn}]`, `entries`, `roads`), `S.player`, `S.npcs`, `S.mode`, `S.nations` ([{key, flag, name, members}] for this level), `S.time`.
- `TS` (=16), `T` (tile ids), `O` (object defs by name: {w,h,fw,fh,img,solid}), `PAL`.
- `g` main pixel canvas 2d context (only valid inside draw hooks), `VW`, `VH` (logical viewport size).
- `getG(map,x,y)`, `setG(map,x,y,tile,solid)`, `isSolid(map,x,y)`, `removeObject(map,obj)`, `place(map,type,x,y,extra)`, `freeTiles(map,rng,rect,count,avoid,minDist,spacing)`, `computeReach`.
- `allNpcs()`, `membersOfLevel(lv)`, `nationOf(member)`, `byId` (Map id→member), `isLeader`, `isBooster`, `nationGroups(lv)`.
- `charSheet(outfit)`, `lookFor(id, shirt)`, `mkCanvas`, `rngFrom(seed)`, `hashStr(s)`, `rockyObj(nationKey, tier)` (returns object name whose `O[name].img` is the statue canvas).
- `onAction(mode, fn)` — while `S.mode === mode`, pressing E / Space / Enter / the touch A button calls `fn()` (use it for confirm steps in your own mini-game modes).
- `setMode(name)` / `S.mode`. Use your own mode names for panels (e.g. `'market'`). Register how to close it: `registerCloser('market', () => {...})` — core calls it on Esc and you must call `setMode('play')` inside.
- `toast(text, big?)`, `quake(seconds)`, `persist()`, `lang()` → `'en' | 'vi'`, `openDialog({title, pages, onClose})` (guide-style box; set mode to `'dialog'` first and back to `'play'` in onClose), `levelBadge(lv)`, `avatarHTML(member)`.
- `panel(id, innerHTML)` → returns a `.ov > .panel` element you can fill (created once, reused; hidden by default; set `.hidden=false` to show). Existing CSS classes: `.btn .btn.primary .dim .hrow .hwho .hnum .lvb .chip .scroll .pbar`.
- `input` — {up,down,left,right} booleans (touch + keys).
- `metIds()` → Set of met member ids; `trust(nationKey)` → number of met NPCs of that nation currently in this zone / number present (0..1).

## Items, bag, tools (src/items.js)
- `ctx.ITEMS` registry: `{ id: {icon, name:{en,vi}, w (weight), tags[]} }` — ids: wood stone rock ore charcoal iron sand glass rope hay leaf resin seed flower egg milk berry mushroom honey meat wax wool fur feather tusk obsidian ice crystal lava wormhide firescale yetifur greatcrystal (+ head-carry mirrors fish cow chicken bird). Use ONLY these ids; if you need a new one, report it.
- `ctx.bag.add(id, n)` → number actually added (weight-limited, toasts "Bag is full"); `ctx.bag.remove(id, n)`; `ctx.bag.count(id)`; `ctx.bag.has(id, n)`; `ctx.bag.weight()`, `ctx.bag.cap()` (40 base); `ctx.bag.setBonus(v)` (a mount/vehicle may raise the cap while active — reset to 0 when it ends). The bag is `save.inv`; the HUD line is drawn by the core from it.
- `ctx.itemName(id)`, `ctx.itemIcon(id)`.
- `ctx.TOOLS` (axe pickaxe rod shovel scythe knife bucket lasso trap saddle torch). `ctx.tool.tier(id)` → 0 (none) / 1 wood / 2 iron / 3 obsidian; `ctx.tool.set(id, tier)`.
- `ctx.defineObject(name, w, h, fw, fh, drawFn(g, rng), {solid})` → registers a new map-object sprite you can `ctx.place(...)` (same helper style as gfx.js; draw with g.fillRect). Returns the name; idempotent.
- `ctx.sfx('hit'|'chop'|'pickup'|'coin'|'craft'|'build'|'squeak'|'roar'|'splash'|'alarm'|'fail'|'win')` — short procedural sound.
- `ctx.pathTo(tx0, ty0, tx1, ty1, margin=6)` → array of pixel waypoints (or null); assign to `npc.path` and the NPC follows it.
- `ctx.nationName(key)` → localized nation name (EN/VI). `S.nations[].name` is already localized at zone enter.

## The Sea of Origins (zone id `sea`) — the prologue
`S.map.sea === true`. Open water (`T.WATER`, `T.DEEP` = deep water, `T.REEF` = shallow bright reef water, `T.SAND` islets, `T.DOCK` stone pier), all water tiles are SOLID for walking (`isSolid`), so the player only moves on water while a system sets `player.passable` (raft, whale, diving). `S.map.flow` = Uint8Array per tile with `ctx.FLOW.{NONE,R,L,D,U}` current direction (core draws the arrows; a raft system should push the player along it). `S.map.dock = {x,y}` (tile of the pier end), `entries.default` = adrift spot at the top (40,5), `entries.back` = the dock. Objects: `wreck` ({wreck:true}), 6 `buoy` ({buoy: 1..6}), `lighthouse` ({lighthouse:true}), `debris` decor, islet palms/rocks, the hermit (`npc.hermit === true`, a real artist). Gate at the bottom → Harbor Village. `ctx.dayT()` 0..1 (10-min cycle) and `ctx.darkness()` 0..0.2 (gentle night; the core draws lamp glows and the lighthouse beam).
Shared sea state convention: `S.sea = { raft: { hp, max, sail }, riding: 'raft'|'whale'|null, diving: bool, x, y }` — `sea_raft.js` creates it on zone enter (and puts the player on the raft), other sea systems read it (e.g. the Kraken lowers `S.sea.raft.hp`, the whale sets `riding='whale'` while it carries the player, diving sets `diving=true`). While `S.sea.riding === 'raft'` the raft system owns `player.passable/custom/speedMul`; a system that takes the player off the raft must set `S.sea.riding` to its own value and give it back (`S.sea.riding = 'raft'`) when done — the raft system re-applies its own defaults every frame from that field. Sea items in `ctx.ITEMS`: plank sailcloth pearl shell seagem ink bottle + head-carry squid goldfish.

## Districts (nation yards) — damage / repair / upgrade
Every object placed inside a nation district carries `o.plot` (index into `S.map.plots`) and `o.piece` ∈ `wall | corner | flag | board | light | house | fountain | rocky`. `S.map.plots[i]` = `{x,y,w,h,nation,tier,rank,spawn}`; `S.map.tier` = land tier (0..5).
- `ctx.piecesOf(i)` → the district's objects. `ctx.plotAt(tx,ty)` → plot index or -1.
- `ctx.hpMax(o)`; `ctx.damage(o, amount=1)` → lowers `o.hp`, at 0 the piece becomes a ruin (`o.ruined=true`, `o.orig`=original type, `o.type='rubble_WxH'`, footprint no longer solid). Returns true when it just got ruined. Persisted automatically per zone (`save.districts[zone][i]`), including partial hp.
- `ctx.repair(o)` → restores a ruined piece (type, solidity, hp). `ctx.districtState(i)` → `{tier, ruined, total, condition 0..1}`.
- `ctx.upgradePlot(i)` → rebuilds the district in place at tier+1 (walls, statue, house change); returns the plot or null when at the cap. `ctx.tierCap()` = land tier + 1 (max 5); `ctx.MAX_TIER`.
- `ctx.isRocky()` → true while the player is piloting a Rocky statue (use it to let Rocky hit raiders).
- `ctx.alert(text, seconds)` → red warning line in the HUD (empty text hides it). Keep warnings subtle: no screen shake, no flashes.
- NPC steering: set `npc.goal = {x, y}` (pixels) → the NPC walks straight there (no pathfinding — pick goals inside the same district / open ground), clears `goal` on arrival; set `npc.busy = true` to hold it still (remember to clear). NPCs are in `ctx.S.npcs`; `npc.m` is the member (`nationOf(npc.m)`, `npc.m.lv`, `npc.m.i` artworks).
- `ctx.carry.get()` → the carried-animals array; `ctx.carry.remove(index)` → removes one item and keeps the HUD mirror in sync (use this instead of editing the array directly). `ctx.alert(text, Infinity)` holds the warning until `ctx.alert('')`.
- Carried animals live in `ctx.S.save.sys.animals.carry` (array of `'cow'|'chicken'|'bird'|'fish'|{kind:'fish',big:true}`; max 3). Raiders may steal from / consume it; then call `ctx.persist()`.

## Rules
- Only edit your own file(s) in `src/systems/`. Do not edit `main.js`, `ui.js`, `world.js`, `gfx.js`, `entities.js`, `save.js` — if you need a hook that does not exist, write it down in your final report instead.
- Keep all text bilingual: `const STR = { en: {...}, vi: {...} }` inside your module, pick with `ctx.lang()`.
- Persist progress only in `ctx.S.save.inv`, `ctx.S.save.tools`, `ctx.S.save.cards`, `ctx.S.save.sys[yourId]` (object you own) — then call `ctx.persist()`.
- Draw sprites procedurally on canvases (like `gfx.js` does) — no image files. Cache them at module load.
- Entities you control: `S.player.speedMul`, `S.player.passable = (map,tx,ty)=>bool` (null = default solid rule), `S.player.boxW/boxH`, `S.player.custom = (g, ent)=>{}` (replace drawing; draw at `Math.round(ent.x)`, `Math.round(ent.y)` = feet centre), `S.player.ghost = true` (ignore entity collisions). Always restore defaults when your mode ends (`speedMul=1, passable=null, custom=null, ghost=false, boxW=10, boxH=6`).
- Never block the core loop: no `alert/confirm`, no `while(true)`.
- Tests: the site runs at `http://127.0.0.1:8765/`. Headless driver: `node "<scratchpad>/cdp.js" scenario.json` with `CDP_PORT=<unique port>` env var (see prompt). Debug URL: `?auto&zone=m7`; `window.__S` is the state; `window.__CTX` is the ctx.

## Story — "Friend at Sea" (src/story.js; systems story_sea.js / story_land.js / trench.js)
Lyron (founder of Seismic, **not** a roster member) pulls the new player onto his raft in the prologue, guides the crossing, and is taken by the Kraken in sight of the pier. The player gathers three things across the lands and dives into the **Kraken Trench** (zone `trench`) to bring him back.
- `ctx.story()` → `S.save.story = { act, step, items:{divebell,trenchmap,greatcrystal}, rescued, attempts, flashback, seaDone, keepsake, guideStoryTold }`. Edit fields directly, then `ctx.persist()`. `ctx.storyAct(n)` sets the act and persists.
  Acts: **1** prologue at sea with Lyron (only on a save that starts at sea) · **2** gather the three things (HUD line drawn by the core: `Save Lyron: 🔔· 🗺· 🔮·`) · **3** all three in hand → dive at the pier · **4** rescued. `story.js#normalizeStory` runs at load: an old save that is already ashore jumps to act 2 with `flashback=true` (the Old Seismologist tells the tale — core handles that dialog).
- `ctx.FRIEND` = `{ id:'lyron', n:'Lyron', k, a:'data/lyron.jpg' (real photo, used by openDialog), friend:true, outfit, scarf:'#ff1f4b', title:{en,vi} }`. `ctx.friendSheet()` → his 16×20×(3 frames × 4 dirs) character sheet (same layout as `charSheet`). `ctx.drawScarf(g, x, y, dir, t)` draws his red scarf over a frame drawn at (x, y). `ctx.openDialog({ m: ctx.FRIEND, pages, onClose })` shows his photo + title (no roster stats).
  If you put Lyron into `S.npcs` as an `NPC` with `m = ctx.FRIEND`, the core **skips** him in the default talk logic (`m.friend`) and labels him `♥ Lyron` — your system's `near()`/`interact()` own him.
- `ctx.ITEMS3 = ['divebell','trenchmap','greatcrystal']`; items `scarf`, `divebell`, `trenchmap` (weight 0, tag `story`) exist in `ctx.ITEMS`; `greatcrystal` already existed (trophy). Mark progress in `story.items[k] = true` **and** give the bag item.
- `ctx.travel(zoneId, entry)` → fades out and loads another zone (returns false if a fade is already running). Sea pier → trench: `ctx.travel('trench','default')`. Trench → surface: the bottom gate leads to `sea` entry `back` (the dock), or `ctx.travel('sea','back')`.
- `ctx.finale({ title, body })` → the end screen with custom text (its credits button rolls credits; once `story.rescued` is true, the credits open with Lyron's name). `ctx.rollCredits()`.
- `ctx.achieve(id)` → grants an achievement once (ids `keepsake` = picked up the scarf, `rescue` = Lyron rescued).
- `ctx.hazardsOff(bool)` → pause the zone's falling rocks / lava spurts (cutscenes).
- **Cutscenes**: `ctx.setMode('cutscene')` (any name you like) stops player movement and E/Esc default handling; your `update()` still runs every frame, NPC `goal`/`path` still work; end with `ctx.setMode('play')`. `ctx.registerCloser('cutscene', fn)` if Esc should skip it.
- **Rocky allies**: `S.save.sys.rocky.tamed = { [nationKey]: pilotCount }` and `tamedTier` are written by rocky.js whenever the player pilots a nation's Rocky. `ctx.rockyObj(key, tier)` → object name; `ctx.O[name].img` is that nation's statue canvas (draw it scaled up for the giant).
- **Zone `trench`** (`S.map.trench === true`, `S.zone.systems = ['trench','storyLand','photo','pet']` — other systems are not called there): 80×64, floor `T.SEABED` (walkable), `T.ABYSS` solid frame, coral walls (`coral` 1×1 / `coral_t` 1×2, solid) form a 12×6-cell maze in rows 16..52 (`S.map.doors` = the carved openings `{x,y,w,h}` — chokepoints for tentacle pillars), `vent` objects (`{vent:true}`, oxygen), 2 `wreck` (`{wreck:true, trench:true}`), `kelp` decor, the arena `S.map.arena = {x,y,w,h}` at the top with the `cage` object (`{cage:true}`, at `S.map.cage`) and two `gcrystal` lights. Entrance `entries.default` = (40, 59) just above the bottom gate back to the sea. The zone has `tint` + `vignette`; draw your own darkness/lamp overlay in `draw()` on top if you want it darker.
- Debug: `?auto&zone=trench`, `?auto&zone=sea` (a fresh save starts at sea in act 1). Set state then reload: `__CTX.story().act = 3; __CTX.persist(); location.reload()`.

## Clock — đồng hồ, lịch & hết ngày trong game (plan-17 F01, `src/clock.js`, gắn ở `ctx.clock`)
1 ngày game = 6:00 → 2:00 (1200 phút game) ≈ 12 phút thật (`RATE` = 5/3 phút game / giây thật). 4 mùa `'spring'|'summer'|'autumn'|'winter'` × 12 ngày, rồi `year` +1. Đồng hồ CHỈ chạy khi `S.mode === 'play'`, tab đang hiện và không ai `pause(reason)`; menu/dialog/cutscene/panel tự dừng; tắt game giữ giờ lúc persist cuối. Trạng thái nằm ở `save.clock = { day, season, year, hour, minute, min, today }` (save cũ thiếu → Xuân · Ngày 1 · 6:00). `S.dark` (0 ban ngày … 0,45 khuya, 17:00→21:00 mượt, mùa đông sớm 1 giờ) và `ctx.dayT()` (0 = trưa, 0,5 = nửa đêm) nay tính từ giờ game.
- `ctx.clock.day` (1..12), `.season`, `.seasonIndex` (0..3), `.year` (≥1), `.hour` (0..23), `.minute` (0..59) — getter, đọc thẳng.
- `ctx.clock.dayIndex` → số ngày tuyệt đối từ đầu game (0 = Xuân 1 năm 1). Dùng làm seed 'hôm nay' (quests/animals đã chuyển sang đây).
- `ctx.clock.now()` → phút game kể từ 6:00 (số thực 0 … 1199). `ctx.clock.isNight()` → từ 19:00.
- `ctx.clock.ms()` → 'ms game' tuyệt đối (600 ms / phút game) — thay `Date.now()` cho mọi thứ lớn theo thời gian; `ctx.clock.fromRealMs(t0)` quy đổi mốc `Date.now()` cũ trong save sang ms game giữ nguyên thời gian đã trôi (gather.js dùng cho cây con).
- `ctx.clock.onDayEnd(cb)` — cb(ctx, {day, season, year, dayIndex}) gọi khi ngủ hoặc tới 2:00, TRƯỚC khi tăng ngày (tính cây lớn, sản phẩm chuồng, hết hạn…). `ctx.clock.onDayStart(cb)` — sau khi tăng ngày (6:00 ngày mới), trước bảng tổng kết. Đăng ký 1 lần lúc module load hoặc trong `onZoneEnter` (trùng cb bị bỏ qua). Lỗi trong cb được bắt riêng, không chặn ngày.
- `ctx.clock.sleep()` → fade đen, mode `'sleep'` → onDayEnd → ngày +1 6:00 → onDayStart → `persist()` → bảng tổng kết (mode `'summary'`, Esc/E/nút → `'play'`). Trả `false` nếu đang fade dở. Không mất gì, người chơi đứng nguyên chỗ. Vật `bed` (`{bed:true}`, cạnh đình mỗi vùng đất) gọi hàm này khi E.
- `ctx.clock.pause(reason)` / `resume(reason)` — cùng chuỗi reason; dùng khi mini-game của bạn chạy trong mode `'play'` mà muốn dừng giờ.
- `ctx.clock.log(text)` → thêm 1 dòng 'Chuyện đã xảy ra' vào bảng tổng kết sáng (tối đa 8, cắt 80 ký tự). Bảng tự đếm đá 🪨, mảnh ◆, nghệ sĩ gặp trong ngày.
- `ctx.clock.label(lang, noTime?)` → `'Xuân · Ngày 1 · 6:00'`; `ctx.clock.seasonName(lang)`; `ctx.season()` → chuỗi mùa. Test: `ctx.clock.set({ hour, minute } | { min } | { day, season, year })`, `ctx.clock.running()`.
- Item tag mùa: `ITEMS[id].tags` chứa `'spring'|'summer'|'autumn'|'winter'|'any'` cho hạt/nông sản → cây sai mùa khi `!tags.includes(ctx.season()) && !tags.includes('any')`.

## Plot helpers (plan-17 đợt 1)
- `ctx.plotOf(tx, ty)` → plot `{x,y,w,h,nation,tier,rank,spawn,idx}` chứa ô, hoặc `null`.
- `ctx.myNation()` → key nước của người chơi: `save.self` (Discord) → nước gặp nhiều nhất `save.talks` → `null`.
- `ctx.myPlot()` → plot của nước người chơi trong vùng hiện tại (`p.mine === true`); không có → plot GẦN người chơi nhất (`p.mine === false`) — giả định để ruộng/chuồng vẫn đặt được khi chưa chọn nước; vùng không có plot (sea/trench) → `null`. Ruộng + chuồng (F02/F03) chỉ đặt TRONG plot này.

## Đợt 1 — items/tiles/recipes đã vá (A0)
- Tiles: `T.TILLED` (30) đất cày khô, `T.TILLED_WET` (31) đã tưới — không solid, `ctx.setG(map, x, y, T.TILLED, false)`; ảnh px qua manifest `tiles: { TILLED: [...], TILLED_WET: [...] }` (art.js ánh xạ theo tên `T`).
- Items: hạt `seed_turnip seed_strawberry seed_tomato seed_corn seed_pumpkin seed_yam seed_starmush seed_quakeflower` (tag `seed` + mùa), nông sản `turnip strawberry tomato corn pumpkin yam starmush quakeflower` (tag `crop food|dye` + mùa), `fur_rabbit` (tag `animal`), vật đặt được `pen1 pen2 scarecrow` (tag `placeable`, `pen`). `egg milk wool hay` đã có.
- RECIPES: `pen1` bàn mộc (wood 12, rope 4, rock 2) → item `pen1`; `scarecrow` bàn mộc (wood 10, hay 5) → item `scarecrow`; `pen2` lò nung (rock 8, iron 4) → item `pen2`. Module pens.js/farm.js: `ctx.bag.has('pen1')` → đặt → `ctx.bag.remove('pen1')`.
- market.js (chỉ thêm dòng): PRICE turnip 3, strawberry 4, tomato 4, corn 5, pumpkin 8, yam 5, starmush 6, quakeflower 6, egg 2, milk 3, wool 3, fur_rabbit 3; các id này vào GOODS (bán được ở quầy).
- index.js đã đăng ký `farm` (sau `gather`) và `pens` (sau `farm`) từ 2 stub `src/systems/farm.js`, `pens.js`.
- (A5 sửa lỗi) **Nguồn hạt trong game thật:** market.js bán `seed_<crop>` đúng mùa hiện tại (`tags` có mùa hoặc `any`) 2 đá/hạt ở mục 'Hạt giống theo mùa' (`SEED_PRICE`, `seedsOfSeason`); gather.js cắt cỏ ('hay') rơi 10 % một `seed_<crop>` đúng mùa (`dropCropSeed`).
- (A5) raiders_low.js import `guardedByScarecrow` từ farm.js: mảnh rào trong bán kính 6 ô quanh bù nhìn không bị chọn làm mục tiêu; thú phá lọt vào tầm bù nhìn → bỏ chạy.
- (A5) gather.js `pruneCd`: cooldown save cũ lưu theo `Date.now()` (> 1e11) được quy đổi sang ms game giữ phần còn lại (đặt `clockRef` ngay đầu `onZoneEnter`).
