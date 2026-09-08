#!/usr/bin/env python3
"""DEPRECATED shim — the NPC bridge is now the self-contained llama.cpp brain at
tools/npc_brain/npc_brain.py (no Nets framework). This forwards all arguments."""
import os, sys
brain = os.path.join(os.path.dirname(os.path.abspath(__file__)), "npc_brain", "npc_brain.py")
print("[npc_bridge] forwarding to", brain)
os.execv(sys.executable, [sys.executable, brain] + sys.argv[1:])
