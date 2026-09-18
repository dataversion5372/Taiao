# Gameplay telemetry — event stream spec

Client: `js/net/telemetry.js` (inert without `TAIAO_SERVER_URL`; per-player
off switch in the help tab). Server: `server/src/telemetry.js`, batches stored
verbatim in R2 under `tele/<day>/<sender>/<recvMs>-<seq>.json`.

Purpose: see how players actually play — which activities hold attention,
where sessions die, what never gets touched — to guide design. It is NOT
anti-cheat (that's `actionlog.js` + the Phase-2 envelope).

## Batch envelope

```json
{ "v": 1, "user": 17, "username": "moa", "device": "d…", "char": 3,
  "dev": 0, "build": "g1a2b3c4d5", "session": "mfx1-abc", "seq": 4,
  "sentAt": 0, "recvAt": 0, "country": "NZ", "dropped": 0,
  "events": [[1758000000000, "move", 402, 288, 0], …] }
```

`device` is an anonymous per-install id; `user` is set only when logged in.
`dev: 1` batches are developer (DEV_MODE) play — filter them out of insights.
`dropped` counts events lost to the in-memory cap since the last good send.

## Events — `[t, type, ...fields]` (t = client wall-clock ms)

| type | fields | meaning |
|---|---|---|
| `session` | "start", build, dev / "end" | boot / page close |
| `move` | x, y, level | active body arrived on a tile (250 ms sampler) |
| `click` | label, x, y | tile-menu action executed (left-click default or right-click pick): "Attack Rat", "Chop", "Examine", "Walk here"… |
| `goal` | type, name, x, y | resolved click intent via setGoal: combat/npc/gather/station/pickup/door/ladder/portal… |
| `act` | kind, seconds | an action ended (skill:Fishing, combat, act:craft…) with its duration |
| `xp` | skill, amount | XP awarded |
| `gain` / `lose` | itemId, qty | inventory in/out (crafting inputs, loot, drops) |
| `kill` | monsterKind | monster killed |
| `die` | killer | player death |
| `eat` | itemId | food eaten |
| `equip` / `unequip` | itemId / slot | gear changes |
| `door` | x, y | door used |
| `ladder` | "up"/"down" | storey change |
| `talk` | npcName, npcJob | NPC conversation opened |
| `examine` | itemId | inventory examine (world examines arrive as `click` "Examine") |
| `ui` | name, 1/0 | panel open/close: map, bestiary, quests, skillguide, soaps, pulse, bank, trade, panel:inv, panel:skills… |
| `cam` | zoom, step | camera zoom/rotation settled at a new value |
| `wmzoom` | zoom | world-map zoom level changed |
| `queue` | label \| type, x?, y? | task queued onto a body (Option/Alt-click) |
| `split` / `merge` | bodyCount | self split apart / merged back |
| `bank` | "dep"/"wd", itemId, qty | vault deposit / withdrawal |
| `buy` / `sell` | itemId, price, qty | shop trades |

## Pulling data

```sh
curl -H "authorization: Bearer $ADMIN_TOKEN" \
  "$SERVER/api/admin/telemetry?day=2026-09-17"          # list a day's batches
curl -H "authorization: Bearer $ADMIN_TOKEN" \
  "$SERVER/api/admin/telemetry?key=tele/2026-09-17/…"   # fetch one batch
```

or bulk-sync the `tele/` prefix straight out of the `taiao-vault` R2 bucket.
