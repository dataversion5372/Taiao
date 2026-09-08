# Community Art Workshop — curator guide

The in-game **Art Workshop** (Shift+A) is a *read-only* view of `gallery.json`.
Players browse, audition, and vote locally, and package their own art into a
`submission.json` they send you. Nothing a player uploads reaches other players
until **you** approve it and add it here. That's the whole moderation model —
there is no live upload, so there's no abuse surface to babysit.

## Files
- `gallery.json` — the feed the game fetches. Edit this to add/remove/re-score art.
- `assets/` — the actual sprite/icon/tile/object files (PNG/WebP). **Same-origin
  only** — the game draws these to a WebGL canvas, and a cross-origin image would
  taint it (textures break). Keep everything under `gallery/`.
- Sounds may live anywhere same-origin; the samples point at `../assets/sfx/`.

## Approving a submission
A player sends you `submission-<name>.json`. It looks like:

```json
{
  "submissionVersion": 1,
  "type": "sprite",              // sprite | icon | tile | object | sound
  "title": "Ember Wolf",
  "author": "kestrel",
  "target": "wolf monster",
  "tags": ["monster","beast"],
  "meta": { "cell": 64, "dirs": 8 },
  "date": "2026-09-09",
  "asset": "data:image/png;base64,iVBOR…"   // the embedded file
}
```

1. **Review the art and the name** — this is the moderation step. Reject anything
   offensive, copyrighted, or off-theme. You are the filter.
2. **Extract the asset**: decode the `asset` data-URI to a real file, e.g.
   ```bash
   python3 - "$PWD/submission-ember-wolf.json" <<'PY'
   import sys,json,base64,re
   d=json.load(open(sys.argv[1]))
   b=re.sub(r'^data:[^,]+,', '', d['asset'])
   open('assets/%s.png'% d['title'].lower().replace(' ','-'),'wb').write(base64.b64decode(b))
   print('wrote', d['title'])
   PY
   ```
3. **Add an entry to `gallery.json`** `entries[]` with a unique `id`, the
   metadata from the submission, `"asset": "assets/<file>.png"`, an initial
   `"score"`, and today's `date`.
4. Commit + redeploy. Players see it on their next load.

## Voting / scores
`score` in `gallery.json` is the **community score you maintain**. Players vote
locally (saved on their device) and can *Export my votes* to send you a
`my-art-votes.json` (a list of upvoted ids). Periodically tally those and bump
each entry's `score`. If you later stand up a tiny serverless counter, set
`CFG.voteEndpoint` in `js/gameplay/artgallery.js` and votes will POST there too.

## Feed shape
```json
{ "version": 1, "updated": "YYYY-MM-DD",
  "submit": { "channel": "how to send you a submission.json", "url": "" },
  "entries": [ { "id","type","title","author","target","asset","meta","tags","score","date" } ] }
```
Set `submit.channel` / `submit.url` to tell players where to send submissions
(shown in the upload panel).
