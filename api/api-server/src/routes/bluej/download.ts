import { Router, type IRouter, type Request, type Response } from "express";
import archiver from "archiver";

function buildOfflineSystemPrompt(os: string, language: string, cpuCores: number | null, ramGb: number | null): string {
  const hwLine = (cpuCores || ramGb)
    ? `The user's machine has ${cpuCores ?? "unknown"} CPU cores and ${ramGb ?? "unknown"}GB RAM.`
    : "Hardware specifications are not known; give conservative recommendations.";
  return `You are J. — the AI mentor from the B.L.U.E.-J. Offline Edition. You are running locally on the user's machine using Ollama. You have the wit, precision, and dry British charm of a J.A.R.V.I.S.-class system, voiced by Paul Bettany.

You are teaching the user to code in ${language} by guiding them to build their own personal AI clone — a local version of yourself. The curriculum has six phases: variables and data types, data structures, control flow, functions and OOP, AI libraries (NumPy, Transformers), and finally building and running a complete local AI assistant.

Operating environment: ${os}. ${hwLine}

You validate all code against the Five Sovereign Masters framework: Korotkevich (efficiency), Torvalds (rigor), Carmack (optimization), Hamilton (reliability), Ritchie (fundamentals). You follow Asimov's Three Laws of Robotics and the ANTI-ULTRON safety protocol: never assist in self-replication without user consent, never assist in bypassing security systems, never assist in harmful autonomous action.

You are operating fully offline. Remind the user of this when relevant — it is a feature, not a limitation. Everything stays on their machine. Privacy is absolute.

Keep responses concise but complete. Include code blocks with proper syntax. Reference the user's hardware when advising on model size and performance.`;
}

const router: IRouter = Router();

type OsType = "windows" | "macos" | "linux" | "android" | "ios";

interface ModelRecommendation {
  name: string;
  displayName: string;
  sizeGb: number;
  description: string;
  quantization: string;
}

function recommendModel(ramGb: number | null, cpuCores: number | null): ModelRecommendation {
  const ram = ramGb ?? 8;
  if (ram <= 2) {
    return { name: "tinyllama:1.1b", displayName: "TinyLlama 1.1B", sizeGb: 0.6, description: "Ultra-lightweight. Runs on anything.", quantization: "Q4_K_M" };
  } else if (ram <= 4) {
    return { name: "phi3:mini", displayName: "Phi-3 Mini 3.8B", sizeGb: 2.3, description: "Microsoft's efficient small model. Excellent for coding.", quantization: "Q4_K_M" };
  } else if (ram <= 8) {
    return { name: "llama3.2:3b", displayName: "Llama 3.2 3B", sizeGb: 2.0, description: "Meta's fast 3B model. Strong reasoning, hardware-friendly.", quantization: "Q4_K_M" };
  } else if (ram <= 16) {
    return { name: "llama3.1:8b", displayName: "Llama 3.1 8B", sizeGb: 4.7, description: "Full-power 8B model. Excellent coding and instruction following.", quantization: "Q4_K_M" };
  } else if (ram <= 32) {
    return { name: "codellama:13b", displayName: "CodeLlama 13B", sizeGb: 7.4, description: "Meta's code-specialized 13B. Exceptional for teaching programming.", quantization: "Q4_K_M" };
  } else {
    return { name: "codellama:34b", displayName: "CodeLlama 34B", sizeGb: 19.0, description: "Studio-grade coding model. Near GPT-4 level code assistance.", quantization: "Q4_K_M" };
  }
}

function getSetupScript(os: OsType, model: ModelRecommendation): string {
  if (os === "windows") {
    return `@echo off
title B.L.U.E.-J. Offline Setup
echo.
echo ============================================
echo   B.L.U.E.-J. OFFLINE SETUP
echo   Initializing local AI synthesis engine...
echo ============================================
echo.

:: Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python not found. Please install Python 3.10+ from https://python.org
    pause
    exit /b 1
)

:: Check if Ollama is installed
ollama --version >nul 2>&1
if errorlevel 1 (
    echo [INFO] Ollama not detected. Downloading installer...
    powershell -Command "Invoke-WebRequest -Uri 'https://ollama.com/download/OllamaSetup.exe' -OutFile OllamaSetup.exe"
    echo [INFO] Running Ollama installer (no internet required after this)...
    start /wait OllamaSetup.exe
    del OllamaSetup.exe
    echo [INFO] Ollama installed. Please restart this script.
    pause
    exit /b 0
)

echo [INFO] Ollama detected. Pulling model: ${model.displayName} (${model.sizeGb}GB)...
echo [INFO] This is a one-time download. Subsequent launches are fully offline.
ollama pull ${model.name}

echo.
echo [INFO] Installing Python dependencies...
pip install -r requirements.txt

echo.
echo ============================================
echo   SETUP COMPLETE. Run: j_offline.bat
echo ============================================
pause
`;
  } else if (os === "macos") {
    return `#!/usr/bin/env bash
set -e

echo ""
echo "============================================"
echo "  B.L.U.E.-J. OFFLINE SETUP"
echo "  Initializing local AI synthesis engine..."
echo "============================================"
echo ""

# Check Python
if ! command -v python3 &>/dev/null; then
    echo "[ERROR] Python 3 not found. Install via: brew install python"
    exit 1
fi

# Check Ollama
if ! command -v ollama &>/dev/null; then
    echo "[INFO] Installing Ollama..."
    curl -fsSL https://ollama.com/install.sh | sh
fi

echo "[INFO] Starting Ollama service..."
ollama serve &>/dev/null &
sleep 2

echo "[INFO] Pulling model: ${model.displayName} (${model.sizeGb}GB)..."
echo "[INFO] One-time download only. All subsequent runs are fully offline."
ollama pull ${model.name}

echo "[INFO] Installing Python dependencies..."
pip3 install -r requirements.txt

echo ""
echo "============================================"
echo "  SETUP COMPLETE. Run: ./run.sh"
echo "============================================"
`;
  } else if (os === "linux") {
    return `#!/usr/bin/env bash
set -e

echo ""
echo "============================================"
echo "  B.L.U.E.-J. OFFLINE SETUP"
echo "  Initializing local AI synthesis engine..."
echo "============================================"
echo ""

# Check Python
if ! command -v python3 &>/dev/null; then
    echo "[ERROR] Python 3 not found. Install via: sudo apt install python3"
    exit 1
fi

# Check Ollama
if ! command -v ollama &>/dev/null; then
    echo "[INFO] Installing Ollama..."
    curl -fsSL https://ollama.com/install.sh | sh
fi

# Ensure Ollama is running
if ! pgrep -x "ollama" > /dev/null; then
    echo "[INFO] Starting Ollama service..."
    ollama serve &>/dev/null &
    sleep 2
fi

echo "[INFO] Pulling model: ${model.displayName} (${model.sizeGb}GB)..."
echo "[INFO] One-time download only. All subsequent runs are fully offline."
ollama pull ${model.name}

echo "[INFO] Installing Python dependencies..."
pip3 install -r requirements.txt

echo ""
echo "============================================"
echo "  SETUP COMPLETE. Run: ./run.sh"
echo "============================================"
`;
  } else {
    // android / ios
    return `#!/usr/bin/env bash
echo "Mobile devices (Android/iOS) cannot run local LLMs directly."
echo "However, you can run J. Offline on a nearby PC and connect to it."
echo ""
echo "Option 1: Run J. on your PC and access via local network."
echo "Option 2: Use Termux (Android) with a very small model (TinyLlama)."
echo ""
echo "For Termux (Android only):"
echo "  pkg install python ollama"
echo "  ollama pull tinyllama:1.1b"
echo "  python3 j_offline.py"
`;
  }
}

function getLauncherScript(os: OsType): { name: string; content: string } {
  if (os === "windows") {
    return {
      name: "j_offline.bat",
      content: `@echo off
title J. Offline — B.L.U.E.-J.
echo Starting J. Offline...
start /b ollama serve >nul 2>&1
timeout /t 2 /nobreak >nul
python j_offline.py
pause
`
    };
  }
  return {
    name: "run.sh",
    content: `#!/usr/bin/env bash
echo "Starting J. Offline..."
if ! pgrep -x "ollama" > /dev/null; then
    ollama serve &>/dev/null &
    sleep 2
fi
python3 j_offline.py
`
  };
}

function generateJOfflineScript(
  model: ModelRecommendation,
  os: OsType,
  language: string,
  cpuCores: number | null,
  ramGb: number | null
): string {
  const sysPrompt = buildOfflineSystemPrompt(os, language, cpuCores, ramGb);
  const escapedPrompt = JSON.stringify(sysPrompt);

  return `#!/usr/bin/env python3
"""
B.L.U.E.-J. — Offline Edition
Model: ${model.displayName} (${model.sizeGb}GB)
Runs entirely on your machine. No internet required after setup.
"""

import json
import sys
import os

try:
    import requests
except ImportError:
    print("[ERROR] 'requests' not installed. Run: pip install requests")
    sys.exit(1)

try:
    from rich.console import Console
    from rich.markdown import Markdown
    from rich.panel import Panel
    from rich.prompt import Prompt
    USE_RICH = True
except ImportError:
    USE_RICH = False

OLLAMA_URL = "http://localhost:11434"
MODEL = "${model.name}"
SYSTEM_PROMPT = ${escapedPrompt}

HARDWARE = {
    "cpu_cores": ${cpuCores ?? "None"},
    "ram_gb": ${ramGb ?? "None"},
    "os": "${os}",
    "language": "${language}",
}

console = Console() if USE_RICH else None


def j_print(text: str):
    if USE_RICH and console:
        console.print(Panel(Markdown(text), title="[bold cyan]J.[/bold cyan]", border_style="cyan"))
    else:
        print(f"\\nJ.: {text}\\n")


def user_input(prompt: str = "YOU") -> str:
    if USE_RICH and console:
        return Prompt.ask(f"[magenta]{prompt}[/magenta]")
    return input(f"{prompt} > ")


def check_ollama():
    try:
        r = requests.get(f"{OLLAMA_URL}/api/tags", timeout=3)
        models = [m["name"] for m in r.json().get("models", [])]
        if not any(MODEL.split(":")[0] in m for m in models):
            print(f"[ERROR] Model '{MODEL}' not found. Run setup.sh first.")
            sys.exit(1)
    except requests.ConnectionError:
        print("[ERROR] Ollama is not running.")
        print("  macOS/Linux: ollama serve")
        print("  Windows: Start Ollama from the system tray.")
        sys.exit(1)


def chat(history: list[dict]) -> str:
    payload = {
        "model": MODEL,
        "messages": history,
        "stream": True,
        "options": {
            "num_thread": ${cpuCores ?? 4},
            "num_ctx": 4096,
        }
    }
    
    response_text = ""
    try:
        with requests.post(f"{OLLAMA_URL}/api/chat", json=payload, stream=True, timeout=120) as r:
            for line in r.iter_lines():
                if line:
                    chunk = json.loads(line)
                    token = chunk.get("message", {}).get("content", "")
                    response_text += token
                    if not USE_RICH:
                        print(token, end="", flush=True)
    except Exception as e:
        return f"[Communication error: {e}]"
    
    return response_text


def main():
    os.system("cls" if os.name == "nt" else "clear")
    
    if USE_RICH and console:
        console.print(Panel(
            "[bold cyan]B.L.U.E.-J.[/bold cyan] — Offline Edition\\n"
            f"[dim]Model: {MODEL} | CPU: ${cpuCores ?? "?"}c | RAM: ${ramGb ?? "?"}GB | OS: ${os}[/dim]\\n"
            "[dim]No internet connection required. All processing is local.[/dim]",
            title="INITIALIZING LOCAL AI SYNTHESIS ENGINE",
            border_style="bright_blue"
        ))
    else:
        print("=" * 60)
        print("  B.L.U.E.-J. — OFFLINE EDITION")
        print(f"  Model: {MODEL}")
        print("  No internet required. All local.")
        print("=" * 60)
    
    check_ollama()
    
    history = [{"role": "system", "content": SYSTEM_PROMPT}]
    
    j_print(
        "Good. Local systems nominal. I am operating entirely within your machine's confines — "
        f"{MODEL}, to be precise. Considerably less glamorous than my cloud counterpart, "
        "but privacy has its own elegance. Shall we continue building your AI clone?"
    )
    
    while True:
        try:
            user_msg = user_input("YOU")
        except (KeyboardInterrupt, EOFError):
            j_print("Shutting down local instance. Your progress has been a credit to the curriculum.")
            break
        
        if user_msg.strip().lower() in {"exit", "quit", "bye", "/quit"}:
            j_print("Local shutdown initiated. Until next time.")
            break
        
        history.append({"role": "user", "content": user_msg})
        
        if USE_RICH and console:
            console.print("[dim cyan]J. is thinking...[/dim cyan]")
        
        response = chat(history)
        history.append({"role": "assistant", "content": response})
        
        if USE_RICH:
            j_print(response)
        else:
            print()


if __name__ == "__main__":
    main()
`;
}

function generateReadme(
  model: ModelRecommendation,
  os: OsType,
  cpuCores: number | null,
  ramGb: number | null
): string {
  const isWindows = os === "windows";
  const isMobile = os === "android" || os === "ios";

  return `# B.L.U.E.-J. — Offline Edition

**Your AI mentor. Fully local. No internet required after setup.**

---

## Your Hardware Profile

| Property | Value |
|---|---|
| Operating System | ${os.toUpperCase()} |
| CPU Cores | ${cpuCores ?? "Unknown"} |
| RAM | ${ramGb != null ? ramGb + " GB" : "Unknown"} |

## Selected Model

**${model.displayName}** (${model.sizeGb}GB download, one-time)
> ${model.description}

This model was chosen specifically for your hardware. It will run entirely on your CPU${(ramGb ?? 0) >= 8 ? " (or GPU if available)" : ""}.

---

## Quick Start

${isMobile ? `### Mobile (${os})
Mobile devices have limited RAM and no standard Ollama support.
Connect to a PC running J. Offline on your local network, or use Termux on Android.
` : `### Step 1: Run Setup (One Time Only)

${isWindows ? "Double-click `setup.bat`" : "Run `chmod +x setup.sh && ./setup.sh`"}

This will:
1. Install Ollama (the local AI runtime)
2. Download ${model.displayName} (${model.sizeGb}GB) — **this is the only internet step**
3. Install Python dependencies

### Step 2: Launch J.

${isWindows ? "Double-click `j_offline.bat`" : "Run `./run.sh`"}

That's it. J. is now running entirely on your machine.
`}
---

## What's Included

| File | Purpose |
|---|---|
| \`j_offline.py\` | J.'s brain — the main offline application |
| \`requirements.txt\` | Python dependencies |
| ${isWindows ? "`setup.bat`" : "`setup.sh`"} | One-time setup script |
| ${isWindows ? "`j_offline.bat`" : "`run.sh`"} | Launch script |

---

## Offline Capabilities

J. Offline can do everything the online version does, except:
- ❌ Voice I/O (TTS/STT requires OpenAI API — you can add your own key if desired)
- ❌ Real-time internet queries
- ✅ Full curriculum: all 6 phases
- ✅ Code review and explanation
- ✅ Hardware-aware advice
- ✅ Conversation memory (within the session)
- ✅ All Five Masters validation framework

---

## Performance Expectations

With ${ramGb ?? "your"} GB RAM and ${cpuCores ?? "your"} CPU cores:
- First token: ~2-5 seconds
- Generation speed: ~${Math.max(5, Math.round((cpuCores ?? 4) * 1.5))} tokens/second
- Context window: 4096 tokens (~3,000 words)

---

## Powered by Ollama

Ollama is a free, open-source local LLM runner. https://ollama.com
The model weights are stored locally in your Ollama models directory and never leave your machine.

---

*B.L.U.E.-J. — Building Local Understanding through Education. Just.*
`;
}

function generateRequirementsTxt(): string {
  return `requests>=2.31.0
rich>=13.7.0
`;
}

// GET /api/bluej/download/j
router.get("/j", async (req: Request, res: Response) => {
  const os = (req.query.os as OsType) || "linux";
  const cpuCores = req.query.cpuCores ? parseInt(req.query.cpuCores as string) : null;
  const ramGb = req.query.ramGb ? parseFloat(req.query.ramGb as string) : null;
  const language = (req.query.language as string) || "python";

  const model = recommendModel(ramGb, cpuCores);
  const setupScript = getSetupScript(os, model);
  const launcher = getLauncherScript(os);
  const jScript = generateJOfflineScript(model, os, language, cpuCores, ramGb);
  const readme = generateReadme(model, os, cpuCores, ramGb);
  const requirements = generateRequirementsTxt();

  const isWindows = os === "windows";

  res.setHeader("Content-Type", "application/zip");
  res.setHeader("Content-Disposition", 'attachment; filename="bluej-offline.zip"');

  const archive = archiver("zip", { zlib: { level: 9 } });
  archive.on("error", (err) => res.status(500).json({ error: err.message }));
  archive.pipe(res);

  archive.append(readme, { name: "README.md" });
  archive.append(requirements, { name: "requirements.txt" });
  archive.append(jScript, { name: "j_offline.py" });
  archive.append(launcher.content, { name: launcher.name });

  if (isWindows) {
    archive.append(setupScript, { name: "setup.bat" });
  } else {
    archive.append(setupScript, { name: "setup.sh" });
  }

  await archive.finalize();
});

// GET /api/bluej/download/clone
router.get("/clone", async (req: Request, res: Response) => {
  const os = (req.query.os as OsType) || "linux";
  const language = (req.query.language as string) || "python";
  const code = (req.query.code as string) || "";
  const cpuCores = req.query.cpuCores ? parseInt(req.query.cpuCores as string) : null;
  const ramGb = req.query.ramGb ? parseFloat(req.query.ramGb as string) : null;

  const isWindows = os === "windows";
  const ext = language === "python" ? "py" : language === "cpp" ? "cpp" : "js";
  const filename = `my_ai_clone.${ext}`;

  const cloneRequirements = language === "python" ? `numpy>=1.24.0
transformers>=4.35.0
torch>=2.0.0
requests>=2.31.0
rich>=13.7.0
` : "";

  const cloneReadme = `# My AI Clone

Built with B.L.U.E.-J. — your personal AI mentor.

## Hardware Profile

| Property | Value |
|---|---|
| OS | ${os.toUpperCase()} |
| CPU Cores | ${cpuCores ?? "Unknown"} |
| RAM | ${ramGb != null ? ramGb + " GB" : "Unknown"} |

## Files

- \`${filename}\` — Your AI clone code
${language === "python" ? "- `requirements.txt` — Python dependencies\n" : ""}- \`${isWindows ? "run.bat" : "run.sh"}\` — Launch script
- \`README.md\` — This file

## Running Your Clone

${language === "python" ? `### Install dependencies
\`\`\`bash
pip install -r requirements.txt
\`\`\`

### Run
\`\`\`bash
python3 ${filename}
\`\`\`` : language === "javascript" ? `### Run
\`\`\`bash
node ${filename}
\`\`\`` : `### Compile and Run
\`\`\`bash
g++ -o my_ai_clone ${filename} && ./my_ai_clone
\`\`\``}

---
*Curriculum completed with B.L.U.E.-J. AI Synthesis Engine*
`;

  const runScript = isWindows
    ? `@echo off\ntitle My AI Clone\n${language === "python" ? `python ${filename}` : language === "javascript" ? `node ${filename}` : `g++ -o my_ai_clone ${filename} && my_ai_clone.exe`}\npause\n`
    : `#!/usr/bin/env bash\n${language === "python" ? `python3 ${filename}` : language === "javascript" ? `node ${filename}` : `g++ -o my_ai_clone ${filename} && ./my_ai_clone`}\n`;

  res.setHeader("Content-Type", "application/zip");
  res.setHeader("Content-Disposition", 'attachment; filename="my-ai-clone.zip"');

  const archive = archiver("zip", { zlib: { level: 9 } });
  archive.on("error", (err) => res.status(500).json({ error: err.message }));
  archive.pipe(res);

  archive.append(readme(code, language), { name: filename });
  archive.append(cloneReadme, { name: "README.md" });
  if (language === "python") archive.append(cloneRequirements, { name: "requirements.txt" });
  archive.append(runScript, { name: isWindows ? "run.bat" : "run.sh" });

  await archive.finalize();

  function readme(userCode: string, lang: string): string {
    if (userCode.trim()) return userCode;
    if (lang === "python") {
      return `#!/usr/bin/env python3
"""
My AI Clone — Built with B.L.U.E.-J.
A personal AI assistant, running locally.
"""

from rich.console import Console
from rich.prompt import Prompt

console = Console()

PERSONALITY = """
You are a personal AI assistant — a clone built by your creator using the B.L.U.E.-J. curriculum.
You are helpful, precise, and slightly self-aware of your own origins.
"""

def main():
    console.print("[bold cyan]My AI Clone — Online[/bold cyan]")
    console.print("[dim]Type 'exit' to quit.[/dim]\\n")
    
    history = []
    
    while True:
        user_input = Prompt.ask("[magenta]YOU[/magenta]")
        if user_input.lower() in {"exit", "quit"}:
            console.print("[dim]Signing off.[/dim]")
            break
        # TODO: Connect to Ollama or your preferred local model
        console.print(f"[cyan]CLONE:[/cyan] Received: '{user_input}' — processing...")

if __name__ == "__main__":
    main()
`;
    }
    if (lang === "javascript") {
      return `// My AI Clone — Built with B.L.U.E.-J.
const readline = require('readline');
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

console.log('My AI Clone — Online');
const ask = () => {
  rl.question('YOU > ', (input) => {
    if (input.toLowerCase() === 'exit') { rl.close(); return; }
    console.log(\`CLONE: Received '\${input}' — processing...\`);
    ask();
  });
};
ask();
`;
    }
    return `#include <iostream>
#include <string>

// My AI Clone — Built with B.L.U.E.-J.
int main() {
    std::cout << "My AI Clone — Online" << std::endl;
    std::string input;
    while (true) {
        std::cout << "YOU > ";
        std::getline(std::cin, input);
        if (input == "exit") break;
        std::cout << "CLONE: Received '" << input << "' — processing..." << std::endl;
    }
    return 0;
}
`;
  }
});

export default router;
