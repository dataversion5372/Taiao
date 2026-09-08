#!/usr/bin/env python3
"""Emit ready-to-run Colab notebooks that LoRA-fine-tune LFM2.5-230M on the
Emberfall NPC dataset and export a Q4_K_M GGUF.

Two variants:
  python build_notebook.py               -> Emberfall_NPC_finetune.ipynb  (Drive-backed,
                                            checkpoints + auto-resume across disconnects)
  python build_notebook.py --no-drive    -> Emberfall_NPC_finetune_nodrive.ipynb  (no Drive;
                                            upload each session, download the GGUF at the end)

Both share the training/merge/convert cells; only the storage + intro differ.
"""
import argparse, json

MD, CODE = "markdown", "code"


def make_cells(nodrive: bool):
    # ── intro ────────────────────────────────────────────────────────────────
    if nodrive:
        intro = (MD, """# 🏰 Emberfall NPC — fine-tune LFM2.5-230M → Q4_K_M GGUF (no-Drive)

Trains a tiny **LFM2.5-230M** to speak as an *Isle of Emberfall* townsperson, then
exports **`LFM2.5-230M-Emberfall-Q4_K_M.gguf`** and **downloads it to your browser** —
no Google Drive needed.

**Heads-up on disconnects:** without Drive, everything lives on the Colab VM's local
disk (`/content`), which is wiped if the runtime resets. Re-running a cell in the
*same* session resumes from the last checkpoint, but a full disconnect means starting
over. A 230M LoRA on ~3k examples is only ~a few minutes on a T4, so most runs finish
in one go — but don't let the tab go idle. (For full disconnect-resilience, use the
Drive-backed notebook instead.)

**Runtime → change runtime type → GPU (T4 is fine).**""")
    else:
        intro = (MD, """# 🏰 Emberfall NPC — fine-tune LFM2.5-230M → Q4_K_M GGUF (resumable)

Trains a tiny **LFM2.5-230M** to speak as an *Isle of Emberfall* townsperson, then
exports **`LFM2.5-230M-Emberfall-Q4_K_M.gguf`** for Nets / the NPC bridge.

### Built to survive Colab disconnects
- Everything is stored on **Google Drive** (`MyDrive/emberfall_npc/`), not the VM disk.
- Training **checkpoints every 50 steps** and **auto-resumes** from the latest one.
- Every heavy cell is **idempotent** — it skips if its output already exists.

**If Colab disconnects: reconnect and run all cells again, top to bottom.** It picks up
from the last checkpoint; finished stages are skipped.

**Runtime → change runtime type → GPU (T4 is fine).**""")

    # ── storage / paths cell ──────────────────────────────────────────────────
    if nodrive:
        paths_md = (MD, "## 2 · Set paths (local VM disk — no Drive)")
        paths_code = (CODE, """import os
WORK      = '/content/emberfall_npc'   # local VM disk — wiped if the runtime resets
CKPT_DIR  = f'{WORK}/checkpoints'
MERGED    = f'{WORK}/merged'
os.makedirs(CKPT_DIR, exist_ok=True); os.makedirs(MERGED, exist_ok=True)

DATA_PATH = f'{WORK}/emberfall_npc_sft_v2.jsonl'
GGUF_NAME = 'LFM2.5-230M-Emberfall-Q4_K_M.gguf'
GGUF_PATH = f'{WORK}/{GGUF_NAME}'

BASE_MODEL = "LiquidAI/LFM2.5-230M"     # non-GGUF base (adjust if the id differs)
MAX_LEN, EPOCHS, LR, BATCH, GRAD_ACCUM, SAVE_STEPS = 512, 3, 2e-4, 8, 2, 50
print("work dir:", WORK)""")
        data_md = (MD, "## 3 · Upload the dataset\nUpload `emberfall_npc_sft_v2.jsonl` (you'll re-upload if the session resets).")
        data_code = (CODE, """import os, shutil
if not os.path.exists(DATA_PATH):
    from google.colab import files
    up = files.upload()
    shutil.copy(next(iter(up)), DATA_PATH)
print("dataset:", DATA_PATH)

from datasets import load_dataset
ds = load_dataset("json", data_files=DATA_PATH, split="train")
print(ds, "| example roles:", [m["role"] for m in ds[0]["messages"]])""")
    else:
        paths_md = (MD, """## 2 · Mount Google Drive & set persistent paths
All work lives under `MyDrive/emberfall_npc/` so it survives a disconnect.""")
        paths_code = (CODE, """from google.colab import drive
drive.mount('/content/drive')

import os
WORK      = '/content/drive/MyDrive/emberfall_npc'
CKPT_DIR  = f'{WORK}/checkpoints'      # training checkpoints (auto-resume)
MERGED    = f'{WORK}/merged'           # merged full-precision model
os.makedirs(CKPT_DIR, exist_ok=True); os.makedirs(MERGED, exist_ok=True)

DATA_PATH = f'{WORK}/emberfall_npc_sft_v2.jsonl'
GGUF_NAME = 'LFM2.5-230M-Emberfall-Q4_K_M.gguf'
GGUF_PATH = f'{WORK}/{GGUF_NAME}'

BASE_MODEL = "LiquidAI/LFM2.5-230M"     # non-GGUF base (adjust if the id differs)
MAX_LEN, EPOCHS, LR, BATCH, GRAD_ACCUM, SAVE_STEPS = 512, 3, 2e-4, 8, 2, 50
print("work dir:", WORK)""")
        data_md = (MD, """## 3 · Dataset (uploaded once, then cached on Drive)
First run: pick `emberfall_npc_sft_v2.jsonl` when prompted — it's copied to
Drive so later runs skip the upload.""")
        data_code = (CODE, """import os, shutil
if not os.path.exists(DATA_PATH):
    print("No dataset on Drive yet — upload emberfall_npc_sft_v2.jsonl")
    from google.colab import files
    up = files.upload()
    shutil.copy(next(iter(up)), DATA_PATH)
print("dataset:", DATA_PATH)

from datasets import load_dataset
ds = load_dataset("json", data_files=DATA_PATH, split="train")
print(ds, "| example roles:", [m["role"] for m in ds[0]["messages"]])""")

    resume_note = ("*No `trl` — this uses the plain `transformers.Trainer` with a hand-rolled "
                   "collator, so there is no version-drifting SFT API to break.*")
    resume_hdr = ("Re-run this cell after any hiccup: it continues from the newest checkpoint in "
                  "`checkpoints/`. " if not nodrive else
                  "Re-running in the same session continues from the newest local checkpoint. ")

    getmodel_md = (MD, ("## 9 · Download the model\n"
                        + ("It's saved on your Drive at `MyDrive/emberfall_npc/`; this also triggers a browser download."
                           if not nodrive else
                           "Downloads the finished GGUF straight to your browser (nothing is left behind on reset).")))

    # ── shared cells ───────────────────────────────────────────────────────────
    cells = [
      intro,
      (MD, """## 1 · Install dependencies
Pins **transformers to the 4.x line the model was authored with** (the Hub config says
`transformers_version: 4.57.2`). Floating to 5.x is what caused the TokensBackend
tokenizer error and the torchao requirement. No `trl` — training uses the plain,
long-stable `transformers.Trainer` API instead."""),
      (CODE, """%pip -q uninstall -y torchao
%pip -q install "transformers>=4.57,<5" peft datasets accelerate sentencepiece
import torch, transformers, peft
print("torch", torch.__version__, "| cuda", torch.cuda.is_available())
print("transformers", transformers.__version__, "| peft", getattr(peft, "__version__", "?"))
if not transformers.__version__.startswith("4."):
    raise RuntimeError("An already-imported transformers 5.x is still live. "
                       "Runtime -> Restart session, then run all cells again from the top.")
assert torch.cuda.is_available(), "No GPU! Runtime -> change runtime type -> GPU."
"""),
      paths_md, paths_code,
      data_md, data_code,
      (MD, """## 4 · Load base model + tokenizer, tokenize the conversations
*(Skipped if a merged model already exists.)* Uses **fp16 on T4** (which has no bf16
support — `bf16=True` there is an instant crash) and bf16 on A100/L4 automatically."""),
      (CODE, """import os, torch
DONE = os.path.exists(f'{MERGED}/config.json')     # merged model already built?
BF16 = torch.cuda.is_bf16_supported()
DTYPE = torch.bfloat16 if BF16 else torch.float16
print("precision:", "bf16" if BF16 else "fp16 (T4)")
if not DONE:
    from transformers import AutoModelForCausalLM, AutoTokenizer
    tok = AutoTokenizer.from_pretrained(BASE_MODEL)
    if tok.pad_token is None: tok.pad_token = tok.eos_token
    model = AutoModelForCausalLM.from_pretrained(BASE_MODEL, torch_dtype=DTYPE, device_map="auto")
    model.config.use_cache = False       # incompatible with checkpointed training
    def tokenize(ex):
        # render-to-text then tokenize with the plain call: returns a plain int list on
        # EVERY transformers version (tokenize=True returns an un-serializable Encoding
        # object on some versions and crashes datasets' Arrow writer)
        text = tok.apply_chat_template(ex["messages"], tokenize=False, add_generation_prompt=False)
        ids = tok(text, add_special_tokens=False, truncation=True, max_length=MAX_LEN)["input_ids"]
        return {"input_ids": list(ids)}
    ds_tok = ds.map(tokenize, remove_columns=ds.column_names)
    ds_tok = ds_tok.filter(lambda e: len(e["input_ids"]) > 8)
    print(ds_tok)
    print("sample decode:", tok.decode(ds_tok[0]["input_ids"][:80]))
else:
    print("merged model already exists — skipping load/train, jump to step 7.")"""),
      (MD, "## 5 · LoRA fine-tune — checkpoints + auto-resume\n" + resume_hdr + resume_note),
      (CODE, """if not DONE:
    from transformers import Trainer, TrainingArguments
    from transformers.trainer_utils import get_last_checkpoint
    from peft import LoraConfig, get_peft_model
    import torch

    model_l = get_peft_model(model, LoraConfig(
        r=16, lora_alpha=32, lora_dropout=0.05, bias="none",
        task_type="CAUSAL_LM", target_modules="all-linear"))
    model_l.print_trainable_parameters()

    PAD = tok.pad_token_id
    def collate(batch):                       # pad a batch; labels use -100 on padding
        mx = max(len(b["input_ids"]) for b in batch)
        ids, labels, attn = [], [], []
        for b in batch:
            s = list(b["input_ids"]); pad = mx - len(s)
            ids.append(s + [PAD] * pad)
            labels.append(s + [-100] * pad)
            attn.append([1] * len(s) + [0] * pad)
        t = torch.tensor
        return {"input_ids": t(ids), "labels": t(labels), "attention_mask": t(attn)}

    targs = TrainingArguments(
        output_dir=CKPT_DIR, num_train_epochs=EPOCHS,
        per_device_train_batch_size=BATCH, gradient_accumulation_steps=GRAD_ACCUM,
        learning_rate=LR, lr_scheduler_type="cosine", warmup_ratio=0.03,
        logging_steps=10, save_strategy="steps", save_steps=SAVE_STEPS, save_total_limit=2,
        bf16=BF16, fp16=not BF16, report_to="none", remove_unused_columns=False,
    )
    trainer = Trainer(model=model_l, args=targs, train_dataset=ds_tok, data_collator=collate)

    resume = get_last_checkpoint(CKPT_DIR)          # None on the first run
    print("resuming from:", resume or "scratch")
    trainer.train(resume_from_checkpoint=resume)
    trainer.save_model(f'{CKPT_DIR}/final')          # saves the LoRA adapter
    print("training complete")"""),
      (MD, """## 6 · Merge the LoRA adapter into the base weights (once)
Works three ways: merges the just-trained model if it's in memory; else rebuilds from
the LoRA adapter on disk; else (VM was reset) asks you to re-upload the tiny adapter
zip — so a crash here never means retraining."""),
      (CODE, """import os, gc, torch
if os.path.exists(f'{MERGED}/config.json'):
    print("merged model already exists -> skipping")
elif 'trainer' in globals():
    trainer.model.merge_and_unload().save_pretrained(MERGED, safe_serialization=True)
    tok.save_pretrained(MERGED)
    print("merged (from this session) ->", MERGED)
else:
    # kernel/VM was reset — rebuild from the LoRA adapter (re-upload if it's gone)
    ADAPTER = f'{CKPT_DIR}/final'
    if not os.path.exists(f'{ADAPTER}/adapter_config.json'):
        print("No adapter on disk — upload emberfall_lora_adapter.zip:")
        from google.colab import files; import zipfile
        up = files.upload(); os.makedirs(ADAPTER, exist_ok=True)
        with zipfile.ZipFile(next(iter(up))) as z: z.extractall(ADAPTER)
    from transformers import AutoModelForCausalLM, AutoTokenizer
    from peft import PeftModel
    dt = torch.bfloat16 if torch.cuda.is_bf16_supported() else torch.float16
    base = AutoModelForCausalLM.from_pretrained(BASE_MODEL, torch_dtype=dt, device_map="auto")
    PeftModel.from_pretrained(base, ADAPTER).merge_and_unload().save_pretrained(MERGED, safe_serialization=True)
    tk = AutoTokenizer.from_pretrained(BASE_MODEL)
    if tk.pad_token is None: tk.pad_token = tk.eos_token
    tk.save_pretrained(MERGED)
    del base; gc.collect()
    print("merged (from adapter) ->", MERGED)"""),
      (MD, "## 7 · Quick sanity check"),
      (CODE, """from transformers import AutoModelForCausalLM, AutoTokenizer, pipeline
import torch
dt = torch.bfloat16 if torch.cuda.is_bf16_supported() else torch.float16
tok2 = AutoTokenizer.from_pretrained(MERGED)
mdl2 = AutoModelForCausalLM.from_pretrained(MERGED, torch_dtype=dt, device_map="auto")
sysp = ("You are Bram, an Emberfall fisher. Voice=weathered; traits=patient, plain-spoken. "
        "Reply naturally in-world in 1-3 short sentences. Stay in character. STATE: location=harbour; "
        "time=dawn; weather=clear; mood=calm; relationship=unfamiliar(0); quest=none; player_skill=novice; "
        "shop_open=true; stock=hooks, line, bait, smoked eel; known_fact=none.")
msgs = [{"role":"system","content":sysp},{"role":"user","content":"Hello there! Anything biting?"}]
prompt = tok2.apply_chat_template(msgs, tokenize=False, add_generation_prompt=True)
gen = pipeline("text-generation", model=mdl2, tokenizer=tok2)
print(gen(prompt, max_new_tokens=64, do_sample=True, temperature=0.85, top_p=0.9)[0]["generated_text"][len(prompt):])"""),
      (MD, """## 8 · Convert → GGUF and quantize to Q4_K_M
Frees the models still in RAM first, then builds **only the CPU quantizer with CUDA
OFF and `-j 2`** — compiling llama.cpp's CUDA kernels across all cores is what OOMs
the Colab VM. Idempotent (skips if the GGUF exists); the build is the slow step."""),
      (CODE, """import os, gc, sys, subprocess, torch

# 1) release the training / merge / sanity-check models still held in RAM+VRAM,
#    or the converter + C++ compiler will fight them for memory and OOM the VM.
for _v in ["trainer", "model", "model_l", "merged", "mdl2", "tok2", "gen", "ds_tok", "ds_txt"]:
    globals().pop(_v, None)
gc.collect()
if torch.cuda.is_available():
    torch.cuda.empty_cache()

def sh(cmd):
    print("$", " ".join(cmd)); subprocess.run(cmd, check=True)

if os.path.exists(GGUF_PATH):
    print("GGUF already exists ->", GGUF_PATH)
else:
    if not os.path.isdir("llama.cpp"):
        sh(["git", "clone", "--depth", "1", "https://github.com/ggml-org/llama.cpp"])
    # Install ONLY the converter's deps. Do NOT run llama.cpp/requirements.txt — it
    # pins/DOWNGRADES transformers, and then the converter can't read the tokenizer
    # our newer transformers saved ("Tokenizer class TokenizersBackend does not
    # exist"). Install the bundled gguf package and keep transformers >= 4.55.
    # NOTE: do NOT touch transformers here (cell 1 pinned 4.x; upgrading or running
    # llama.cpp/requirements.txt re-breaks the tokenizer). Only the gguf package.
    sh([sys.executable, "-m", "pip", "install", "-q", "./llama.cpp/gguf-py"])

    f16 = "/content/emberfall-f16.gguf"
    sh([sys.executable, "llama.cpp/convert_hf_to_gguf.py", MERGED,
        "--outfile", f16, "--outtype", "f16"])

    # build ONLY the quantizer, CUDA off + low parallelism → light on RAM
    cands = ["llama.cpp/build/bin/llama-quantize", "llama.cpp/build/llama-quantize"]
    if not any(os.path.exists(b) for b in cands):
        sh(["cmake", "-S", "llama.cpp", "-B", "llama.cpp/build",
            "-DGGML_CUDA=OFF", "-DLLAMA_CURL=OFF"])
        sh(["cmake", "--build", "llama.cpp/build", "--target", "llama-quantize", "-j", "2"])
    qbin = next(b for b in cands if os.path.exists(b))
    sh([qbin, f16, GGUF_PATH, "Q4_K_M"])
    os.remove(f16)                       # drop the big intermediate F16
    print("wrote", GGUF_PATH)

subprocess.run(["ls", "-lh", GGUF_PATH])"""),
      getmodel_md,
      (CODE, """from google.colab import files
files.download(GGUF_PATH)"""),
      (MD, """## 10 · Install into Nets & run the bridge

On your machine:

```sh
cp ~/Downloads/LFM2.5-230M-Emberfall-Q4_K_M.gguf ~/Nets/models/gguf/
# register an alias 'lfm2.5-230m-emberfall' → this file in Nets' model registry, then:
~/Nets/.venv/bin/python ~/RPG/tools/npc_bridge.py \\
    --model lfm2.5-230m-emberfall
```

The game's `npcPersona` already emits the `STATE:` prompt shape this model was
trained on, so it drops straight in. 230M speed (~2.5 s/turn), Emberfall voice."""),
    ]
    # no-Drive builds get an adapter-download safety net before the risky convert step
    if nodrive:
        ins = [
          (MD, """## 5b · 🛟 Insurance — download the LoRA adapter (no Drive)
Grabs the tiny (~few MB) adapter now, before the risky convert/build steps. If a
later step crashes the VM, re-upload it at step 6 and skip retraining."""),
          (CODE, """import os, shutil
adir = f'{CKPT_DIR}/final'
if os.path.exists(f'{adir}/adapter_config.json'):
    shutil.make_archive('/content/emberfall_lora_adapter', 'zip', adir)
    print('adapter zip -> /content/emberfall_lora_adapter.zip')
    from google.colab import files
    files.download('/content/emberfall_lora_adapter.zip')
else:
    print('no adapter yet — run the training cell (step 5) first')"""),
        ]
        idx = next(i for i, (t, s) in enumerate(cells) if t == MD and s.startswith("## 6 · Merge"))
        cells[idx:idx] = ins
    return cells


# Substitutions to retarget the 230M notebook onto LFM2.5-1.2B-Instruct. Applied in
# order (specific strings before the generic "LFM2.5-230M" prose replace).
BIG_SUBS = [
    ("LiquidAI/LFM2.5-230M", "LiquidAI/LFM2.5-1.2B-Instruct"),          # base repo
    ("LFM2.5-230M-Emberfall-Q4_K_M.gguf", "LFM2.5-1.2B-Emberfall-Q4_K_M.gguf"),
    ("lfm2.5-230m-emberfall", "lfm2.5-1.2b-emberfall"),                  # bridge alias
    ("512, 3, 2e-4, 8, 2, 50", "512, 3, 2e-4, 4, 4, 100"),              # smaller batch, more accum/steps
    ("LFM2.5-230M", "LFM2.5-1.2B"),                                      # remaining prose
    ("230M LoRA", "1.2B LoRA"),
    ("a few minutes", "~15-40 minutes"),
    ("~150 MB RAM", "~2 GB RAM"),
]


def _apply(cells, subs):
    out = []
    for t, s in cells:
        for a, b in subs:
            s = s.replace(a, b)
        out.append((t, s))
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--no-drive", action="store_true", help="emit the no-Drive variant")
    ap.add_argument("--big", action="store_true", help="target LFM2.5-1.2B-Instruct instead of 230M")
    args = ap.parse_args()
    cells = make_cells(args.no_drive)
    if args.big:
        cells = _apply(cells, BIG_SUBS)
    nb = {
      "cells": [
        {"cell_type": t, "metadata": {}, "source": src.splitlines(keepends=True),
         **({"outputs": [], "execution_count": None} if t == CODE else {})}
        for (t, src) in cells
      ],
      "metadata": {
        "accelerator": "GPU",
        "colab": {"provenance": [], "gpuType": "T4"},
        "kernelspec": {"display_name": "Python 3", "name": "python3"},
        "language_info": {"name": "python"},
      },
      "nbformat": 4, "nbformat_minor": 0,
    }
    base = "Emberfall_NPC_finetune_1.2b" if args.big else "Emberfall_NPC_finetune"
    out = base + ("_nodrive" if args.no_drive else "") + ".ipynb"
    with open(out, "w") as f:
        json.dump(nb, f, indent=1)
    print(f"wrote {out} with {len(cells)} cells")


if __name__ == "__main__":
    main()
