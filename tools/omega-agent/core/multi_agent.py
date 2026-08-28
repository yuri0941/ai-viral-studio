#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Multi-Provider Omega Agent v2.1
Fallback chain: Cerebras -> Groq -> DeepSeek -> Mistral -> Together -> Fireworks -> Novita -> DeepInfra -> Cloudflare -> OpenRouter
Reads API keys from environment variables (loaded from .env by run.bat)
"""

import os
import sys
import json
import time
import shutil
import subprocess
import argparse
import re
from pathlib import Path
from datetime import datetime
from typing import List, Optional, Dict, Tuple
import fnmatch
import urllib.request
import urllib.error

# ============ PROVIDERS ============
PROVIDERS = [
    {"name": "cerebras", "model": "llama-3.1-70b", "env_key": "CEREBRAS_API_KEY",
     "url": "https://api.cerebras.ai/v1/chat/completions",
     "extract": lambda r: r["choices"][0]["message"]["content"]},
    {"name": "groq", "model": "llama-3.3-70b-versatile", "env_key": "GROQ_API_KEY",
     "url": "https://api.groq.com/openai/v1/chat/completions",
     "extract": lambda r: r["choices"][0]["message"]["content"]},
    {"name": "deepseek", "model": "deepseek-chat", "env_key": "DEEPSEEK_API_KEY",
     "url": "https://api.deepseek.com/v1/chat/completions",
     "extract": lambda r: r["choices"][0]["message"]["content"]},
    {"name": "mistral", "model": "mistral-large-latest", "env_key": "MISTRAL_API_KEY",
     "url": "https://api.mistral.ai/v1/chat/completions",
     "extract": lambda r: r["choices"][0]["message"]["content"]},
    {"name": "together", "model": "meta-llama/Llama-3.3-70B-Instruct", "env_key": "TOGETHER_API_KEY",
     "url": "https://api.together.xyz/v1/chat/completions",
     "extract": lambda r: r["choices"][0]["message"]["content"]},
    {"name": "fireworks", "model": "accounts/fireworks/models/llama-v3p1-70b-instruct", "env_key": "FIREWORKS_API_KEY",
     "url": "https://api.fireworks.ai/inference/v1/chat/completions",
     "extract": lambda r: r["choices"][0]["message"]["content"]},
    {"name": "novita", "model": "meta-llama/llama-3.1-70b-instruct", "env_key": "NOVITA_API_KEY",
     "url": "https://api.novita.ai/v3/openai/chat/completions",
     "extract": lambda r: r["choices"][0]["message"]["content"]},
    {"name": "deepinfra", "model": "meta-llama/Meta-Llama-3.1-70B-Instruct", "env_key": "DEEPINFRA_API_KEY",
     "url": "https://api.deepinfra.com/v1/openai/chat/completions",
     "extract": lambda r: r["choices"][0]["message"]["content"]},
    {"name": "cloudflare", "model": "@cf/meta/llama-3-8b-instruct", "env_key": "CLOUDFLARE_API_KEY",
     "url": "https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/ai/run/@cf/meta/llama-3-8b-instruct",
     "extract": lambda r: r["result"]["response"]},
    {"name": "openrouter", "model": "qwen/qwen-2.5-7b-instruct", "env_key": "OPENROUTER_API_KEY",
     "url": "https://openrouter.ai/api/v1/chat/completions",
     "extract": lambda r: r["choices"][0]["message"]["content"]},
]

class MultiProviderClient:
    def __init__(self):
        self.provider = None
        self.key = None
        self._find_working_provider()

    def _find_working_provider(self):
        for p in PROVIDERS:
            key = os.environ.get(p["env_key"])
            if not key or key.startswith("YOUR_"):
                print(f"  [{p['name']}] Key not set or placeholder, skip")
                continue
            try:
                test_msg = [{"role": "user", "content": "Hi"}]
                self._raw_call(p, key, test_msg, "", timeout=8)
                self.provider = p
                self.key = key
                print(f"  ✅ [{p['name']}] Connected ({p['model']})")
                return
            except Exception as e:
                print(f"  ⚠️  [{p['name']}] Failed: {str(e)[:60]}")
                continue
        raise RuntimeError("No working provider found. Check API keys and internet.")

    def _raw_call(self, provider, key, messages, system, timeout=120):
        url = provider["url"]
        if "{ACCOUNT_ID}" in url:
            acct = os.environ.get("CLOUDFLARE_ACCOUNT_ID", "")
            url = url.replace("{ACCOUNT_ID}", acct)
        payload = {
            "model": provider["model"],
            "messages": ([{"role": "system", "content": system}] if system else []) + messages,
            "temperature": 0.1,
            "max_tokens": 4096
        }
        data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(
            url, data=data,
            headers={"Content-Type": "application/json", "Authorization": f"Bearer {key}"},
            method="POST"
        )
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            result = json.loads(resp.read())
            return provider["extract"](result)

    def chat(self, messages, system=""):
        try:
            return self._raw_call(self.provider, self.key, messages, system)
        except Exception as e:
            print(f"  ❌ [{self.provider['name']}] Error: {str(e)[:80]}")
            idx = PROVIDERS.index(self.provider)
            for p in PROVIDERS[idx+1:]:
                key = os.environ.get(p["env_key"])
                if not key or key.startswith("YOUR_"):
                    continue
                try:
                    result = self._raw_call(p, key, messages, system)
                    self.provider = p
                    self.key = key
                    print(f"  ✅ Fallback to [{p['name']}] OK")
                    return result
                except Exception as e2:
                    print(f"  ⚠️  [{p['name']}] Also failed: {str(e2)[:60]}")
                    continue
            raise RuntimeError("All providers failed.")

class SafetyGuard:
    def __init__(self, root):
        self.root = Path(root).resolve()
        self.backup_dir = self.root / ".agent-backups"
        self.backup_dir.mkdir(exist_ok=True)

    def git_snapshot(self, label):
        ts = datetime.now().strftime("%Y%m%d_%H%M%S")
        branch = f"agent/auto-{ts}-{label[:20]}"
        try:
            subprocess.run(["git", "stash", "-u"], cwd=self.root, capture_output=True, check=False)
            subprocess.run(["git", "checkout", "-b", branch], cwd=self.root, capture_output=True, check=False)
            subprocess.run(["git", "add", "-A"], cwd=self.root, capture_output=True, check=False)
            subprocess.run(["git", "commit", "-m", f"[AGENT BACKUP] {label}"], cwd=self.root, capture_output=True, check=False)
            return branch
        except Exception as e:
            print(f"⚠️ Git snapshot failed: {e}")
            return ""

    def backup_file(self, path):
        ts = datetime.now().strftime("%Y%m%d_%H%M%S")
        bak = self.backup_dir / f"{path.name}.{ts}.bak"
        shutil.copy2(path, bak)
        return bak

    def show_diff(self, original, modified):
        import difflib
        return "".join(difflib.unified_diff(
            original.splitlines(keepends=True),
            modified.splitlines(keepends=True),
            fromfile="original", tofile="modified", lineterm=""
        ))

    def rollback(self, branch):
        subprocess.run(["git", "checkout", "-"], cwd=self.root, capture_output=True, check=False)
        subprocess.run(["git", "branch", "-D", branch], cwd=self.root, capture_output=True, check=False)
        print(f"🔄 Rolled back, deleted {branch}")

def read_file(path):
    return path.read_text(encoding="utf-8", errors="ignore")

def write_file(path, content):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("task", nargs="+")
    parser.add_argument("--force", action="store_true")
    args = parser.parse_args()

    root = Path("D:/kilo2").resolve()
    task = " ".join(args.task)

    print("=" * 60)
    print(f"🚀 OMEGA AGENT — Task: {task}")
    print("=" * 60)

    print("\n🔌 Connecting to AI providers...")
    try:
        api = MultiProviderClient()
    except RuntimeError as e:
        print(f"\n❌ {e}")
        sys.exit(1)

    guard = SafetyGuard(root)
    branch = guard.git_snapshot(task[:40])
    if branch:
        print(f"📦 Git snapshot: {branch}")

    # Simple implementation: ask AI for code, apply manually
    print("\n🧠 Sending task to AI...")
    msg = [{"role": "user", "content": task}]
    system = "You are a senior React/Node developer. Write clean, minimal code. If modifying a file, output ONLY the complete new file content. Preserve all existing logic. Add comments for changes."

    try:
        result = api.chat(msg, system)
    except Exception as e:
        print(f"\n💥 AI Error: {e}")
        if branch:
            guard.rollback(branch)
        sys.exit(1)

    print(f"\n📋 AI Response ({len(result)} chars):")
    print("-" * 60)
    print(result[:2000])
    if len(result) > 2000:
        print(f"... ({len(result) - 2000} more chars)")
    print("-" * 60)

    # Save report
    reports_dir = root / "agent-reports"
    reports_dir.mkdir(exist_ok=True)
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    report_path = reports_dir / f"report_{ts}.md"
    report_path.write_text(
        f"# Agent Report {ts}\n\n**Task:** {task}\n**Branch:** {branch}\n**Provider:** {api.provider['name']}\n\n## AI Response\n\n```\n{result[:5000]}\n```\n\n## Next Step\nCopy this report to Kimi chat for review.\n",
        encoding="utf-8"
    )
    print(f"\n📝 Report saved: {report_path}")
    print("\n📤 COPY THIS REPORT TO KIMI CHAT")

if __name__ == "__main__":
    main()
