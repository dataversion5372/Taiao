#!/usr/bin/env python3
"""LoRA-train LFM2.5-1.2B on the distilled data, merge, convert, quantize to Q4_K_M.
Run on the A100 AFTER distill_gpu.py. Mirrors the validated Colab training notebook
(render-then-tokenize, plain Trainer, transformers<5, RAM-safe CPU quantizer build)."""
import argparse, json, os, subprocess, sys, time

import torch
from transformers import (AutoModelForCausalLM, AutoTokenizer, Trainer, TrainingArguments)
from transformers.trainer_utils import get_last_checkpoint
from peft import LoraConfig, get_peft_model
from datasets import load_dataset


def sh(cmd, **kw):
    print("$", " ".join(cmd), flush=True)
    subprocess.run(cmd, check=True, **kw)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", default="/content/emberfall/emberfall_npc_distilled.jsonl")
    ap.add_argument("--base", default="LiquidAI/LFM2.5-1.2B-Instruct")
    ap.add_argument("--work", default="/content/emberfall")
    ap.add_argument("--gguf-name", default="LFM2.5-1.2B-Emberfall-v2-Q4_K_M.gguf")
    ap.add_argument("--epochs", type=int, default=3)
    ap.add_argument("--batch", type=int, default=16)
    ap.add_argument("--max-len", type=int, default=512)
    args = ap.parse_args()

    CKPT, MERGED = f"{args.work}/ckpt", f"{args.work}/merged"
    GGUF = f"{args.work}/{args.gguf_name}"
    os.makedirs(CKPT, exist_ok=True)

    DTYPE = torch.bfloat16 if torch.cuda.is_bf16_supported() else torch.float16
    BF16 = DTYPE == torch.bfloat16

    if not os.path.exists(f"{MERGED}/config.json"):
        tok = AutoTokenizer.from_pretrained(args.base)
        if tok.pad_token is None: tok.pad_token = tok.eos_token
        model = AutoModelForCausalLM.from_pretrained(args.base, torch_dtype=DTYPE, device_map="auto")
        model.config.use_cache = False

        ds = load_dataset("json", data_files=args.data, split="train")

        def tokenize(ex):
            text = tok.apply_chat_template(ex["messages"], tokenize=False, add_generation_prompt=False)
            ids = tok(text, add_special_tokens=False, truncation=True, max_length=args.max_len)["input_ids"]
            return {"input_ids": list(ids)}
        ds_tok = ds.map(tokenize, remove_columns=ds.column_names).filter(lambda e: len(e["input_ids"]) > 8)
        print("dataset:", ds_tok, flush=True)

        model_l = get_peft_model(model, LoraConfig(
            r=16, lora_alpha=32, lora_dropout=0.05, bias="none",
            task_type="CAUSAL_LM", target_modules="all-linear"))
        model_l.print_trainable_parameters()

        PAD = tok.pad_token_id

        def collate(batch):
            mx = max(len(b["input_ids"]) for b in batch)
            ids, labels, attn = [], [], []
            for b in batch:
                s = list(b["input_ids"]); pad = mx - len(s)
                ids.append(s + [PAD] * pad); labels.append(s + [-100] * pad)
                attn.append([1] * len(s) + [0] * pad)
            t = torch.tensor
            return {"input_ids": t(ids), "labels": t(labels), "attention_mask": t(attn)}

        targs = TrainingArguments(
            output_dir=CKPT, num_train_epochs=args.epochs,
            per_device_train_batch_size=args.batch, gradient_accumulation_steps=1,
            learning_rate=2e-4, lr_scheduler_type="cosine", warmup_ratio=0.03,
            logging_steps=10, save_strategy="steps", save_steps=100, save_total_limit=2,
            bf16=BF16, fp16=not BF16, report_to="none", remove_unused_columns=False,
        )
        trainer = Trainer(model=model_l, args=targs, train_dataset=ds_tok, data_collator=collate)
        resume = get_last_checkpoint(CKPT)
        print("resume:", resume or "scratch", flush=True)
        trainer.train(resume_from_checkpoint=resume)
        trainer.save_model(f"{CKPT}/final")

        trainer.model.merge_and_unload().save_pretrained(MERGED, safe_serialization=True)
        tok.save_pretrained(MERGED)
        print("merged ->", MERGED, flush=True)
        del trainer, model, model_l
        torch.cuda.empty_cache()
    else:
        print("merged model exists — skipping training", flush=True)

    # sanity generation
    tok2 = AutoTokenizer.from_pretrained(MERGED)
    m2 = AutoModelForCausalLM.from_pretrained(MERGED, torch_dtype=DTYPE, device_map="auto")
    sysp = ("You are Bram, a villager of the Isle of Emberfall — dour and blunt; you find outsiders "
            "quietly amusing; your voice is weathered. Quirk: you pepper your talk with sea-sayings. "
            "You still grieve a brother lost to the sea. You earn your keep as a fisher, but the trade is "
            "just work — you are a whole person first. You are flesh and blood and have lived your whole "
            "life on Emberfall; you know nothing of any world beyond it. \"Kia ora\" is the greeting of "
            "Emberfall folk — answer a greeting with a warm Kia ora of your own. Speak in-world in 1-3 "
            "short sentences like natural talk. SCENE: location=harbour; time=dawn; weather=clear; "
            "your mood=calm; toward this traveller you feel unfamiliar; your stock if asked: hooks, line, bait.")
    for q in ["Kia ora!", "Do you sell pies, or just fishing gear?", "My name is Finn. What's my name?"]:
        msgs = [{"role": "system", "content": sysp}, {"role": "user", "content": q}]
        prompt = tok2.apply_chat_template(msgs, tokenize=False, add_generation_prompt=True)
        enc = tok2(prompt, return_tensors="pt").to(m2.device)
        out = m2.generate(**enc, max_new_tokens=64, do_sample=True, temperature=0.85, top_p=0.9,
                          pad_token_id=tok2.pad_token_id or tok2.eos_token_id)
        print("SANITY:", q, "->", tok2.decode(out[0][enc["input_ids"].shape[1]:], skip_special_tokens=True), flush=True)
    del m2
    torch.cuda.empty_cache()

    # convert + quantize (do NOT touch transformers; only the bundled gguf pkg)
    if not os.path.exists(GGUF):
        if not os.path.isdir("/content/llama.cpp"):
            sh(["git", "clone", "--depth", "1", "https://github.com/ggml-org/llama.cpp", "/content/llama.cpp"])
        sh([sys.executable, "-m", "pip", "install", "-q", "/content/llama.cpp/gguf-py"])
        f16 = f"{args.work}/emberfall-f16.gguf"
        sh([sys.executable, "/content/llama.cpp/convert_hf_to_gguf.py", MERGED, "--outfile", f16, "--outtype", "f16"])
        cands = ["/content/llama.cpp/build/bin/llama-quantize", "/content/llama.cpp/build/llama-quantize"]
        if not any(os.path.exists(b) for b in cands):
            sh(["cmake", "-S", "/content/llama.cpp", "-B", "/content/llama.cpp/build",
                "-DGGML_CUDA=OFF", "-DLLAMA_CURL=OFF"])
            sh(["cmake", "--build", "/content/llama.cpp/build", "--target", "llama-quantize", "-j", "8"])
        qbin = next(b for b in cands if os.path.exists(b))
        sh([qbin, f16, GGUF, "Q4_K_M"])
        os.remove(f16)
    print("GGUF READY:", GGUF, flush=True)


if __name__ == "__main__":
    main()
