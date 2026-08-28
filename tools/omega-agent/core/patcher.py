import os
import re
import json
import urllib.request
from pathlib import Path

PROJECT_ROOT = Path("D:/kilo2")
API_KEY = os.environ.get("MISTRAL_API_KEY") or os.environ.get("DEEPSEEK_API_KEY")
API_URL = "https://api.mistral.ai/v1/chat/completions" if os.environ.get("MISTRAL_API_KEY") else "https://api.deepseek.com/v1/chat/completions"

def call_api(prompt, file_content):
    payload = {
        "model": "mistral-large-latest" if "mistral" in API_URL else "deepseek-chat",
        "messages": [
            {"role": "system", "content": "You are a code editor. You receive a file and a task. Return ONLY the exact lines that need to change, in format: OLD: [exact old line] NEW: [exact new line]. If multiple lines, list them one by one. Do not return full file. Do not add explanations."},
            {"role": "user", "content": f"FILE:\n```javascript\n{file_content}\n```\n\nTASK:\n{prompt}\n\nReturn only OLD/NEW pairs."}
        ],
        "temperature": 0.1,
        "max_tokens": 4096
    }
    data = json.dumps(payload).encode()
    req = urllib.request.Request(API_URL, data=data, headers={"Content-Type": "application/json", "Authorization": f"Bearer {API_KEY}"}, method="POST")
    with urllib.request.urlopen(req, timeout=60) as resp:
        return json.loads(resp.read())["choices"][0]["message"]["content"]

def apply_changes(file_path, changes_text):
    content = file_path.read_text(encoding="utf-8")
    original = content
    
    pairs = re.findall(r'OLD:\s*(.*?)\n\s*NEW:\s*(.*?)(?=\nOLD:|\Z)', changes_text, re.DOTALL)
    
    for old, new in pairs:
        old_stripped = old.strip()
        new_stripped = new.strip()
        if old_stripped in content:
            content = content.replace(old_stripped, new_stripped, 1)
            print(f"  ✅ Replaced: {old_stripped[:60]}...")
        else:
            print(f"  ⚠️ Not found (skipped): {old_stripped[:60]}...")
    
    if content != original:
        file_path.write_text(content, encoding="utf-8")
        print(f"✅ Written: {file_path}")
    else:
        print("ℹ️ No changes applied")

def main():
    file_path = PROJECT_ROOT / "backend/services/emailService.js"
    if not file_path.exists():
        print("❌ File not found")
        return
    
    content = file_path.read_text(encoding="utf-8")
    
    task = """Add import PlanConfig from '../models/PlanConfig.js' after other imports.
In resendVerificationEmail, after "user.verificationToken = token;", add:
    const planConfig = await PlanConfig.findOne().lean();
    const freeGenerations = planConfig?.free?.generationsPerDay || 10;
Replace "10 бесплатных генераций" with "${freeGenerations} бесплатных генераций".
Replace hardcoded URL "https://aiviral-studio.ru/verify-email/${token}" with "${FRONTEND_URL}/verify-email/${token}" in both places."""
    
    print("🧠 Sending file + task to API...")
    result = call_api(task, content)
    print(f"\n📋 API Response:\n{result}\n")
    
    apply_changes(file_path, result)
    
    import subprocess
    r = subprocess.run(["node", "--check", str(file_path)], capture_output=True, text=True)
    if r.returncode == 0:
        print("✅ Syntax OK")
    else:
        print(f"❌ Syntax error:\n{r.stderr}")

if __name__ == "__main__":
    main()