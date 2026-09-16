#!/usr/bin/env bash
# Publish the remote-backed asset layers to the companion Taiao-cdn repo
# that sw.js's REMOTE_BASE points at (raw.githubusercontent.com serves it
# with CORS; GitHub release assets don't send CORS headers, which is why
# this is a repo and not a release). A fresh clone of the main repo 404s
# on these locally; the service worker then fetches each file from the CDN
# repo on demand and caches it.
#
# Layers published (all gitignored in the main repo — see .gitignore):
#   assets/birdsong/      CC BY-NC-SA xeno-canto clips + their CREDITS.txt
#   assets/npc_dialogue/  MiniLM-embedded dialogue bank (~127 MB)
#   assets/models/        MiniLM q8 ONNX model + tokenizer (~23 MB)
#   libs/npcml/           transformers.js bundle + ORT wasm runtimes
# bank.meta.json is additionally published gzipped (the SW prefers it and
# stream-decompresses). Paths inside the CDN repo mirror the game tree.
#
# Idempotent: re-run after refreshing any layer (e.g. fetch_birdsong.py or
# a dialogue-bank rebuild) to push the new files.
#
# Usage: tools/publish_cdn_assets.sh
set -euo pipefail
cd "$(dirname "$0")/.."
REPO="dataversion5372/Taiao-cdn"
STAGE="$(mktemp -d)"
trap 'rm -rf "$STAGE"' EXIT

copy() { mkdir -p "$STAGE/$(dirname "$1")"; cp "$1" "$STAGE/$1"; }

for f in assets/birdsong/*.ogg; do copy "$f"; done
copy assets/birdsong/CREDITS.txt   # NC license: attribution travels with the audio

copy assets/npc_dialogue/bank.emb.bin
copy assets/npc_dialogue/bank.remb.bin
copy assets/npc_dialogue/bank.meta.json
copy assets/npc_dialogue/bank.scale.bin
copy assets/npc_dialogue/bank.rscale.bin
gzip -9 -c assets/npc_dialogue/bank.meta.json > "$STAGE/assets/npc_dialogue/bank.meta.json.gz"

MODEL=assets/models/Xenova/all-MiniLM-L6-v2
for f in "$MODEL"/config.json "$MODEL"/tokenizer.json "$MODEL"/tokenizer_config.json \
         "$MODEL"/special_tokens_map.json "$MODEL"/onnx/model_quantized.onnx; do copy "$f"; done

for f in libs/npcml/*; do copy "$f"; done

# audio diet (2026-09-16): the itch/web zip ships WITHOUT sfx/ambience/music
# (tools/build_web_zip.sh) — the SW streams them from here on first use.
# Repo clones have them locally and never touch the CDN. CREDITS ride along.
for f in assets/sfx/*.ogg; do copy "$f"; done
copy assets/sfx/CREDITS.txt
for f in assets/ambience/*.ogg; do copy "$f"; done
for f in assets/music/*.ogg; do copy "$f"; done
copy assets/music/CREDITS.txt

# paperdoll data files (51M, one per character, script-injected on demand by
# js/paperdoll.js) — excluded from the web zip, streamed from here instead
for f in js/sprites/paperdolls/*.js; do copy "$f"; done

cat > "$STAGE/README.md" <<'EOF'
# Taiao-cdn

Static asset layers for [Taiao](https://github.com/dataversion5372/Taiao),
lazily fetched by the game's service worker when a served tree lacks them.
Published by `tools/publish_cdn_assets.sh` in the main repo — do not edit
here by hand.

Licensing: `assets/birdsong/` clips are third-party CC BY-NC-SA recordings
from xeno-canto.org (per-clip attribution in `assets/birdsong/CREDITS.txt`);
they are distributed in this side repo precisely because that license is
NOT part of the main repo's CC BY-SA asset grant. The MiniLM model is
Apache-2.0 (Xenova/all-MiniLM-L6-v2); the ONNX runtime is MIT; the
dialogue bank is CC BY-SA like the main repo's assets.
EOF

cd "$STAGE"
git init -q -b main
git add -A
git commit -q -m "Publish Taiao asset layers $(date +%Y-%m-%d)"
if gh repo view "$REPO" >/dev/null 2>&1; then
  git remote add origin "https://github.com/$REPO.git"
  git push -q -f origin main
else
  gh repo create "$REPO" --public --source=. --push \
    --description "Taiao's lazily-fetched asset layers (birdsong, NPC dialogue bank, MiniLM runtime)"
fi
echo "published $(git ls-files | wc -l | tr -d ' ') files to https://github.com/$REPO"
