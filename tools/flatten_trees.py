#!/usr/bin/env python3
"""Make each tree billboard show a single view (south or north) from ALL 8
rotation frames, so it looks the same from every camera angle. The view is
chosen deterministically-at-random per tree (hash of folder name). silverleaf
and dreamwood are forced to south. Reads the chosen frame from the pristine
kenney-shape source when available (idempotent), writes into objects_source.
Run: python3 tools/flatten_trees.py  then rebuild the object sheet."""
import json, os, shutil, hashlib
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
KS=os.environ.get("KENNEY_TREES", "kenney-shape/images/trees")  # local source images (not in repo)
OS=os.path.join(ROOT,"assets","objects_source")
DIRS=["south","south-east","east","north-east","north","north-west","west","south-west"]
FORCE_SOUTH={"tree_silverleaf","tree_dreamwood"}
m=json.load(open(os.path.join(ROOT,"assets","objects.json")))
trees={f:k for f,k in m.items() if str(k).startswith(("tree_","nz_"))}
counts={"south":0,"north":0}; log=[]
for f,k in sorted(trees.items()):
    od=os.path.join(OS,f,"base","rotations")
    src_base = os.path.join(KS,f,"base","rotations")
    if not os.path.isdir(src_base): src_base = od          # non-kenney trees (dreamwood, charred, ...)
    if k in FORCE_SOUTH:
        choice="south"
    else:
        choice = "south" if int(hashlib.md5(f.encode()).hexdigest(),16)%2==0 else "north"
    src=os.path.join(src_base, choice+".png")
    if not os.path.exists(src):
        choice = "north" if choice=="south" else "south"
        src=os.path.join(src_base, choice+".png")
    os.makedirs(od, exist_ok=True)
    for d in DIRS:
        dst=os.path.join(od, d+".png")
        if os.path.abspath(src)!=os.path.abspath(dst): shutil.copy(src, dst)
    counts[choice]+=1; log.append(f"  {k:20} -> {choice}")
print("flattened", len(trees), "trees:", counts)
print("\n".join(log))
