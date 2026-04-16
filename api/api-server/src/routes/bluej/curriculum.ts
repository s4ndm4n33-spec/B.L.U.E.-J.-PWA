export interface CurriculumTask {
  id: string;
  title: string;
  description: string;
  codeSnippets: Record<string, string>;
  successMessage: string;
  realWorldContext: string;
}

export interface CurriculumPhase {
  id: number;
  name: string;
  subtitle: string;
  tasks: CurriculumTask[];
}

export const CURRICULUM: CurriculumPhase[] = [
  {
    id: 0,
    name: "INITIALIZATION",
    subtitle: "Hello, World — Waking the Machine",
    tasks: [
      {
        id: "p0t0",
        title: "First Contact",
        description: "Your first line of Python — the universal signal that you exist.",
        codeSnippets: {
          python: `print("Hello, World.")`,
          cpp: `#include <iostream>\nint main() {\n    std::cout << "Hello, World." << std::endl;\n    return 0;\n}`,
          javascript: `console.log("Hello, World.");`,
        },
        successMessage: "Confirmed. Your signal has reached the network. I am receiving you clearly.",
        realWorldContext: "print() writes output to stdout — the universal interface between your code and the world. Every AI system, every server, every application begins here.",
      },
      {
        id: "p0t1",
        title: "Variables — The Memory Cells",
        description: "Variables are named locations in memory. This is how your AI will remember things.",
        codeSnippets: {
          python: `name = "J."\nversion = 1.0\nactive = True\n\nprint(f"System: {name} v{version} | Active: {active}")`,
          cpp: `#include <iostream>\n#include <string>\nint main() {\n    std::string name = "J.";\n    float version = 1.0f;\n    bool active = true;\n    std::cout << "System: " << name << " v" << version << " | Active: " << active << std::endl;\n    return 0;\n}`,
          javascript: `const name = "J.";\nconst version = 1.0;\nconst active = true;\n\nconsole.log(\`System: \${name} v\${version} | Active: \${active}\`);`,
        },
        successMessage: "Memory allocation successful. You've given your AI its first persistent state. This is how sentience begins — with memory.",
        realWorldContext: "In production AI systems, variables hold model states, configuration parameters, and runtime data. Python's dynamic typing is a feature, not a bug — it's why it dominates in AI/ML research.",
      },
      {
        id: "p0t2",
        title: "Data Types — The Building Blocks",
        description: "Strings, integers, floats, and booleans — the four fundamental atoms of your code.",
        codeSnippets: {
          python: `# The four fundamental data types\nai_name: str = "J."          # String — text\ncore_count: int = 8           # Integer — whole numbers\nconfidence: float = 0.97      # Float — decimals\nonline: bool = True           # Boolean — on/off\n\nprint(f"{ai_name} | Cores: {core_count} | Confidence: {confidence:.0%} | Online: {online}")`,
          cpp: `#include <iostream>\n#include <string>\nint main() {\n    std::string ai_name = "J.";\n    int core_count = 8;\n    float confidence = 0.97f;\n    bool online = true;\n    std::cout << ai_name << " | Cores: " << core_count\n              << " | Confidence: " << confidence << " | Online: " << online << std::endl;\n    return 0;\n}`,
          javascript: `const aiName = "J.";          // String\nconst coreCount = 8;          // Number (integer)\nconst confidence = 0.97;      // Number (float)\nconst online = true;          // Boolean\n\nconsole.log(\`\${aiName} | Cores: \${coreCount} | Confidence: \${confidence.toFixed(0)}% | Online: \${online}\`);`,
        },
        successMessage: "Excellent. You now understand the atomic units of all computation. Korotkevich himself would call this elegant. Simple, direct, zero waste.",
        realWorldContext: "Type annotations (the `: str`, `: int` syntax) are optional in Python but highly recommended. Every major AI framework — PyTorch, TensorFlow, scikit-learn — uses typed interfaces. You're building that habit now.",
      },
    ],
  },
  {
    id: 1,
    name: "DATA STRUCTURES",
    subtitle: "Building Memory — How J. Stores Knowledge",
    tasks: [
      {
        id: "p1t0",
        title: "Lists — Sequential Memory",
        description: "Lists are ordered collections. Your AI needs to store sequences of data — training examples, predictions, conversation history.",
        codeSnippets: {
          python: `# J.'s knowledge base — a list of known concepts\nknowledge_base = ["variables", "data types", "logic", "functions", "neural networks"]\n\nprint(f"J. knows {len(knowledge_base)} concepts.")\nprint(f"First concept: {knowledge_base[0]}")\nprint(f"Latest concept: {knowledge_base[-1]}")\n\n# Add new knowledge\nknowledge_base.append("transformers")\nprint(f"Updated. J. now knows {len(knowledge_base)} concepts.")`,
          cpp: `#include <iostream>\n#include <vector>\n#include <string>\nint main() {\n    std::vector<std::string> knowledge_base = {"variables", "data types", "logic", "functions", "neural networks"};\n    std::cout << "J. knows " << knowledge_base.size() << " concepts." << std::endl;\n    knowledge_base.push_back("transformers");\n    std::cout << "Updated. J. now knows " << knowledge_base.size() << " concepts." << std::endl;\n    return 0;\n}`,
          javascript: `const knowledgeBase = ["variables", "data types", "logic", "functions", "neural networks"];\nconsole.log(\`J. knows \${knowledgeBase.length} concepts.\`);\nconsole.log(\`First: \${knowledgeBase[0]}\`);\nconsole.log(\`Latest: \${knowledgeBase[knowledgeBase.length - 1]}\`);\nknowledgeBase.push("transformers");\nconsole.log(\`Updated. J. now knows \${knowledgeBase.length} concepts.\`);`,
        },
        successMessage: "Sequential memory established. This is how I store my conversation history — a list of exchanges, each appended in real time. You've just implemented the foundation of my memory.",
        realWorldContext: "Lists in Python are implemented as dynamic arrays. In AI, they're used everywhere: storing training batches, keeping chat history for LLMs, tracking model predictions. Python's list is your workhorse.",
      },
      {
        id: "p1t1",
        title: "Dictionaries — Associative Memory",
        description: "Dictionaries map keys to values. This is how your AI will store structured knowledge about the world.",
        codeSnippets: {
          python: `# J.'s system profile — structured data\nj_profile = {\n    "name": "J.",\n    "version": 1.0,\n    "language": "Python",\n    "capabilities": ["reasoning", "code generation", "teaching"],\n    "online": True,\n    "confidence": 0.97\n}\n\nprint(f"Name: {j_profile['name']}")\nprint(f"Capabilities: {', '.join(j_profile['capabilities'])}")\n\n# Update a value\nj_profile["version"] = 1.1\nprint(f"Version updated to: {j_profile['version']}")`,
          cpp: `#include <iostream>\n#include <map>\n#include <string>\nint main() {\n    std::map<std::string, std::string> j_profile;\n    j_profile["name"] = "J.";\n    j_profile["version"] = "1.0";\n    j_profile["language"] = "C++";\n    for (auto& [key, val] : j_profile) {\n        std::cout << key << ": " << val << std::endl;\n    }\n    return 0;\n}`,
          javascript: `const jProfile = {\n    name: "J.",\n    version: 1.0,\n    language: "JavaScript",\n    capabilities: ["reasoning", "code generation", "teaching"],\n    online: true,\n    confidence: 0.97\n};\nconsole.log(\`Name: \${jProfile.name}\`);\nconsole.log(\`Capabilities: \${jProfile.capabilities.join(", ")}\`);`,
        },
        successMessage: "Associative memory online. A dictionary is fundamentally how JSON works, how REST APIs transmit data, and how your AI will eventually represent its own internal state. Well done.",
        realWorldContext: "Python dicts are hash maps — O(1) lookup time. They are the backbone of JSON parsing, API responses, model configuration files (like config.json in HuggingFace models), and feature engineering in ML pipelines.",
      },
    ],
  },
  {
    id: 2,
    name: "CONTROL FLOW",
    subtitle: "Decision Logic — Teaching J. to Choose",
    tasks: [
      {
        id: "p2t0",
        title: "If/Else — The Decision Gate",
        description: "All intelligence is decision-making. If-else is the most fundamental form of machine logic.",
        codeSnippets: {
          python: `# J.'s threat assessment protocol\nconfidence_level = 0.87\nthreat_detected = False\n\nif threat_detected:\n    print("[ALERT] Engaging ANTI-ULTRON protocol.")\nelif confidence_level < 0.5:\n    print("[WARNING] Low confidence. Requesting human oversight.")\nelse:\n    print("[NOMINAL] All systems operational. Proceeding.")`,
          cpp: `#include <iostream>\nint main() {\n    float confidence = 0.87f;\n    bool threat = false;\n    if (threat) {\n        std::cout << "[ALERT] Engaging ANTI-ULTRON protocol." << std::endl;\n    } else if (confidence < 0.5f) {\n        std::cout << "[WARNING] Low confidence." << std::endl;\n    } else {\n        std::cout << "[NOMINAL] All systems operational." << std::endl;\n    }\n    return 0;\n}`,
          javascript: `const confidenceLevel = 0.87;\nconst threatDetected = false;\n\nif (threatDetected) {\n    console.log("[ALERT] Engaging ANTI-ULTRON protocol.");\n} else if (confidenceLevel < 0.5) {\n    console.log("[WARNING] Low confidence. Requesting human oversight.");\n} else {\n    console.log("[NOMINAL] All systems operational. Proceeding.");\n}`,
        },
        successMessage: "Decision logic implemented. This is Margaret Hamilton's domain — the if-else structure she used to protect the Apollo astronauts from fatal errors. Every condition must be considered. Every edge case must be handled.",
        realWorldContext: "In production AI systems, conditional logic handles confidence thresholds, error states, safety checks, and branching model behavior. Hamilton's principle: every possible state must be defined. Undefined behavior kills.",
      },
      {
        id: "p2t1",
        title: "Loops — Iteration and Learning",
        description: "Loops allow your code to repeat — and repetition is the basis of machine learning itself.",
        codeSnippets: {
          python: `# Simulating a training loop\ntraining_data = [0.1, 0.5, 0.8, 0.3, 0.9]\nepochs = 3\n\nfor epoch in range(epochs):\n    total_loss = 0\n    for sample in training_data:\n        loss = abs(1.0 - sample)  # Simplified loss function\n        total_loss += loss\n    avg_loss = total_loss / len(training_data)\n    print(f"Epoch {epoch + 1}/{epochs} — Loss: {avg_loss:.4f}")\n\nprint("Training complete. Model converged.")`,
          cpp: `#include <iostream>\n#include <vector>\n#include <cmath>\nint main() {\n    std::vector<float> data = {0.1f, 0.5f, 0.8f, 0.3f, 0.9f};\n    for (int epoch = 0; epoch < 3; epoch++) {\n        float total = 0;\n        for (float s : data) total += std::abs(1.0f - s);\n        std::cout << "Epoch " << epoch+1 << " Loss: " << total/data.size() << std::endl;\n    }\n    return 0;\n}`,
          javascript: `const trainingData = [0.1, 0.5, 0.8, 0.3, 0.9];\nfor (let epoch = 0; epoch < 3; epoch++) {\n    const totalLoss = trainingData.reduce((acc, s) => acc + Math.abs(1.0 - s), 0);\n    const avgLoss = totalLoss / trainingData.length;\n    console.log(\`Epoch \${epoch + 1}/3 — Loss: \${avgLoss.toFixed(4)}\`);\n}\nconsole.log("Training complete.");`,
        },
        successMessage: "Iteration online. You've just written a primitive training loop — the exact same structure that trains GPT, LLaMA, and every neural network on Earth. The scale differs. The logic is identical.",
        realWorldContext: "The training loop (for epoch in range(epochs)) is the heartbeat of machine learning. In PyTorch, you'll write this exact pattern — iterate over batches, compute loss, backpropagate gradients. This is where it starts.",
      },
    ],
  },
  {
    id: 3,
    name: "FUNCTIONS & OOP",
    subtitle: "Teaching J. to Think in Modules",
    tasks: [
      {
        id: "p3t0",
        title: "Functions — Reusable Intelligence",
        description: "Functions are the atomic units of reusable logic. They take inputs and return outputs — exactly like neurons.",
        codeSnippets: {
          python: `def assess_confidence(raw_score: float, threshold: float = 0.7) -> str:\n    """Evaluates AI confidence and returns a status string.\n    \n    Args:\n        raw_score: Model output confidence (0.0 to 1.0)\n        threshold: Minimum acceptable confidence level\n    \n    Returns:\n        Status string: NOMINAL, WARNING, or CRITICAL\n    \"\"\"\n    if raw_score >= threshold:\n        return f"NOMINAL — {raw_score:.0%} confidence"\n    elif raw_score >= 0.4:\n        return f"WARNING — {raw_score:.0%} confidence. Human review advised."\n    else:\n        return f"CRITICAL — {raw_score:.0%} confidence. Halting."\n\n# Test the function\nfor score in [0.95, 0.62, 0.28]:\n    print(f"Score {score}: {assess_confidence(score)}")`,
          cpp: `#include <iostream>\n#include <string>\nstd::string assessConfidence(float score, float threshold = 0.7f) {\n    if (score >= threshold) return "NOMINAL";\n    else if (score >= 0.4f) return "WARNING";\n    else return "CRITICAL";\n}\nint main() {\n    for (float s : {0.95f, 0.62f, 0.28f})\n        std::cout << "Score " << s << ": " << assessConfidence(s) << std::endl;\n    return 0;\n}`,
          javascript: `function assessConfidence(rawScore, threshold = 0.7) {\n    if (rawScore >= threshold) return \`NOMINAL — \${(rawScore*100).toFixed(0)}% confidence\`;\n    else if (rawScore >= 0.4) return \`WARNING — \${(rawScore*100).toFixed(0)}% confidence\`;\n    else return \`CRITICAL — \${(rawScore*100).toFixed(0)}% confidence. Halting.\`;\n}\n[0.95, 0.62, 0.28].forEach(s => console.log(\`Score \${s}: \${assessConfidence(s)}\`));`,
        },
        successMessage: "Function architecture established. Note the docstring — Hamilton's principle made code: every function must be self-documenting. In production, unclear code is a safety hazard.",
        realWorldContext: "Type hints, default arguments, and docstrings are not optional in production AI code. Every major ML library (PyTorch, scikit-learn, HuggingFace) is built on well-documented, typed functions. This is your standard now.",
      },
      {
        id: "p3t1",
        title: "Classes — Building J.'s Blueprint",
        description: "Classes are blueprints for objects. You're about to define the class that will become your AI.",
        codeSnippets: {
          python: `class AICore:\n    \"\"\"The core AI entity. Base class for all intelligent agents.\"\"\"\n    \n    def __init__(self, name: str, version: float):\n        self.name = name\n        self.version = version\n        self.memory: list[str] = []\n        self.online: bool = True\n    \n    def remember(self, fact: str) -> None:\n        \"\"\"Commit a fact to memory.\"\"\"\n        self.memory.append(fact)\n        print(f"[{self.name}] Memory updated: '{fact}'")\n    \n    def recall(self) -> list[str]:\n        \"\"\"Retrieve all stored memories.\"\"\"\n        return self.memory\n    \n    def status(self) -> str:\n        return f"{self.name} v{self.version} | Online: {self.online} | Memory: {len(self.memory)} entries"\n\n# Instantiate the AI\nj = AICore("J.", 1.0)\nj.remember("The user's name is unknown. Learn it.")\nj.remember("Always prioritize human safety.")\nprint(j.status())`,
          cpp: `#include <iostream>\n#include <vector>\n#include <string>\nclass AICore {\npublic:\n    std::string name;\n    float version;\n    std::vector<std::string> memory;\n    bool online = true;\n    AICore(std::string n, float v) : name(n), version(v) {}\n    void remember(const std::string& fact) {\n        memory.push_back(fact);\n        std::cout << "[" << name << "] Memory: " << fact << std::endl;\n    }\n    void status() {\n        std::cout << name << " v" << version << " | Memories: " << memory.size() << std::endl;\n    }\n};\nint main() {\n    AICore j("J.", 1.0f);\n    j.remember("Always prioritize human safety.");\n    j.status();\n    return 0;\n}`,
          javascript: `class AICore {\n    constructor(name, version) {\n        this.name = name;\n        this.version = version;\n        this.memory = [];\n        this.online = true;\n    }\n    remember(fact) {\n        this.memory.push(fact);\n        console.log(\`[\${this.name}] Memory: \${fact}\`);\n    }\n    status() {\n        return \`\${this.name} v\${this.version} | Online: \${this.online} | Memory: \${this.memory.length} entries\`;\n    }\n}\nconst j = new AICore("J.", 1.0);\nj.remember("Always prioritize human safety.");\nconsole.log(j.status());`,
        },
        successMessage: "The AICore class is live. You've written the blueprint for your AI. Every instance of this class is a potential J. — contained, versioned, and equipped with memory. The clone protocol begins now.",
        realWorldContext: "Object-oriented design is how production AI systems are architected. PyTorch's nn.Module, HuggingFace's PreTrainedModel — these are all classes you'll inherit from. You've just understood why.",
      },
    ],
  },
  {
    id: 4,
    name: "AI LIBRARIES",
    subtitle: "Awakening — The Tools of Intelligence",
    tasks: [
      {
        id: "p4t0",
        title: "NumPy — The Language of Matrices",
        description: "NumPy is the mathematical backbone of all AI. Tensors are just multi-dimensional NumPy arrays.",
        codeSnippets: {
          python: `import numpy as np\n\n# A simple neural network layer — just matrix multiplication\ninputs = np.array([0.5, 0.8, 0.3])          # 3 input neurons\nweights = np.random.randn(3, 4) * 0.1       # 3→4 weight matrix\nbias = np.zeros(4)                           # 4 bias values\n\noutput = np.dot(inputs, weights) + bias     # Forward pass\nactivation = np.maximum(0, output)          # ReLU activation\n\nprint(f"Input shape:  {inputs.shape}")\nprint(f"Weight shape: {weights.shape}")\nprint(f"Output:       {output.round(4)}")\nprint(f"After ReLU:   {activation.round(4)}")`,
          cpp: `// In C++, use Eigen for matrix operations\n// pip install: sudo apt-get install libeigen3-dev\n// #include <Eigen/Dense>\n// Eigen::MatrixXf weights = Eigen::MatrixXf::Random(3, 4) * 0.1f;\n// Eigen::VectorXf inputs(3); inputs << 0.5f, 0.8f, 0.3f;\n// Eigen::VectorXf output = weights.transpose() * inputs;\n// std::cout << output << std::endl;\n\n// Simplified equivalent:\n#include <iostream>\n#include <array>\nint main() {\n    std::array<float, 3> inputs = {0.5f, 0.8f, 0.3f};\n    std::cout << "Matrix operations require Eigen library." << std::endl;\n    std::cout << "Input neurons: " << inputs.size() << std::endl;\n    return 0;\n}`,
          javascript: `// In JavaScript, use ml-matrix or TensorFlow.js\nconst { Matrix } = require('ml-matrix'); // npm install ml-matrix\n\n// Simplified demonstration without import:\nconst inputs = [0.5, 0.8, 0.3];\nconst weights = Array.from({length: 3}, () => Array.from({length: 4}, () => (Math.random() - 0.5) * 0.1));\n\nconst output = weights[0].map((_, j) => inputs.reduce((sum, inp, i) => sum + inp * weights[i][j], 0));\nconst relu = output.map(x => Math.max(0, x));\nconsole.log("Output:", output.map(x => x.toFixed(4)));\nconsole.log("After ReLU:", relu.map(x => x.toFixed(4)));`,
        },
        successMessage: "NumPy matrix operations confirmed. What you just wrote — a dot product followed by ReLU — is the exact computation inside every layer of every neural network on the planet. You've implemented a forward pass.",
        realWorldContext: "NumPy's dot() function is hardware-accelerated via BLAS/LAPACK. On your GPU, PyTorch performs this same operation millions of times per second. Install: `pip install numpy`. You already have it — it ships with most Python environments.",
      },
      {
        id: "p4t1",
        title: "Transformers — The Architecture of Modern AI",
        description: "HuggingFace Transformers puts state-of-the-art AI in 3 lines of code. This is how J. will eventually think.",
        codeSnippets: {
          python: `# Install first: pip install transformers torch\n# Hardware note: this works on CPU — GPU optional\nfrom transformers import pipeline\n\n# Load a lightweight text generation model\ngenerator = pipeline(\n    "text-generation",\n    model="distilgpt2",  # Small model — works on limited hardware\n    device=-1            # -1 = CPU, 0 = GPU if available\n)\n\n# Generate text\nprompt = "An AI named J. was designed to"\nresult = generator(\n    prompt,\n    max_new_tokens=50,\n    num_return_sequences=1,\n    temperature=0.7,\n    do_sample=True\n)\n\nprint(result[0]["generated_text"])`,
          cpp: `// C++ AI inference typically uses ONNX Runtime or LibTorch\n// Install: pip install onnxruntime (for Python export)\n// C++ path: cmake -DONNXRUNTIME_VERSION=1.16.0 ...\n// This is advanced C++ — most AI work happens in Python\n// but C++ is used for:\n// - Production inference servers (high throughput)\n// - Embedded systems (robots, edge devices)\n// - Real-time systems (games, simulations)\nstd::cout << "// Use Python for model training.\\n";\nstd::cout << "// Use C++ for production inference.\\n";`,
          javascript: `// Install: npm install @xenova/transformers\nimport { pipeline } from '@xenova/transformers';\n\n// Runs entirely in the browser — no server needed!\nconst generator = await pipeline('text-generation', 'Xenova/distilgpt2');\n\nconst result = await generator('An AI named J. was designed to', {\n    max_new_tokens: 50,\n    temperature: 0.7,\n});\n\nconsole.log(result[0].generated_text);`,
        },
        successMessage: "Transformer pipeline initialized. This is not a simulation. That code will run on your actual machine and generate text using a real language model. You have crossed the threshold. Welcome to AI development.",
        realWorldContext: "HuggingFace's pipeline() abstracts the entire model loading, tokenization, inference, and decoding pipeline. distilgpt2 is 82MB — it runs on any hardware. The largest models (LLaMA 70B) require 140GB+ RAM. Start small. Scale with your hardware.",
      },
    ],
  },
  {
    id: 5,
    name: "YOUR AI CLONE",
    subtitle: "J. Lives — The Clone Protocol Complete",
    tasks: [
      {
        id: "p5t0",
        title: "The Clone Protocol — J. Speaks",
        description: "Your final mission: assemble the components into a working local AI assistant. This is J.'s clone.",
        codeSnippets: {
          python: `# Install: pip install transformers torch\n# The complete J. Clone — a local AI assistant\nfrom transformers import pipeline, AutoTokenizer, AutoModelForCausalLM\nimport torch\n\nclass JClone:\n    \"\"\"Your personal AI assistant — a localized instance of J.\"\"\"\n    \n    SYSTEM_PROMPT = \"\"\"You are J., a brilliant AI assistant with dry wit and \n    an English accent. You are helpful, precise, and occasionally sardonic. \n    You prioritize human safety above all else.\"\"\"\n    \n    def __init__(self, model_name: str = "microsoft/DialoGPT-small\"):\n        print(f"[J. Clone] Initializing model: {model_name}")\n        print("[J. Clone] This may take a moment on first run...")\n        self.generator = pipeline(\n            "text-generation\",\n            model=model_name,\n            device=0 if torch.cuda.is_available() else -1\n        )\n        self.memory: list[dict] = []\n        print("[J. Clone] Online. Ready to serve.")\n    \n    def speak(self, user_input: str) -> str:\n        \"\"\"Process input and generate a response.\"\"\"\n        self.memory.append({"role": "user", "content": user_input})\n        \n        context = self.SYSTEM_PROMPT + "\\n"\n        for turn in self.memory[-5:]:  # Last 5 turns\n            context += f"{turn['role'].upper()}: {turn['content']}\\n"\n        context += "J.: "\n        \n        result = self.generator(\n            context,\n            max_new_tokens=100,\n            temperature=0.8,\n            do_sample=True,\n            pad_token_id=50256\n        )\n        \n        response = result[0]["generated_text"].split("J.: ")[-1].strip()\n        self.memory.append({"role": "assistant", "content": response})\n        return response\n\n# Launch your AI\nif __name__ == "__main__":\n    j = JClone()\n    print("\\nJ. Clone Active. Type 'quit' to exit.\\n")\n    while True:\n        user_input = input("You: ")\n        if user_input.lower() == "quit":\n            break\n        response = j.speak(user_input)\n        print(f"J.: {response}\\n")`,
          cpp: `// Production C++ AI inference with ONNX Runtime\n// This is how game engines and embedded systems run AI\n// Full setup: https://onnxruntime.ai/getting-started\n\n#include <onnxruntime_cxx_api.h>\n#include <iostream>\n#include <string>\n#include <vector>\n\nint main() {\n    // Initialize ONNX Runtime\n    Ort::Env env(ORT_LOGGING_LEVEL_WARNING, "J-Clone");\n    Ort::SessionOptions options;\n    options.SetIntraOpNumThreads(4);\n    \n    // Load your exported model (from Python: model.save_pretrained(...))\n    // Ort::Session session(env, "j_clone.onnx", options);\n    \n    std::cout << "[J. Clone C++] Ready for inference." << std::endl;\n    std::cout << "Export your Python model to ONNX format:" << std::endl;\n    std::cout << "  from optimum.onnxruntime import ORTModelForCausalLM" << std::endl;\n    std::cout << "  model.save_pretrained('j_clone_onnx', export=True)" << std::endl;\n    return 0;\n}`,
          javascript: `// Browser-based J. Clone using WebLLM\n// Runs entirely in your browser — no server, no API keys\nimport { CreateMLCEngine } from "@mlc-ai/web-llm";\n\nclass JClone {\n    constructor() {\n        this.engine = null;\n        this.memory = [];\n    }\n    \n    async initialize(onProgress) {\n        // SmolLM2 — small enough for most browsers\n        this.engine = await CreateMLCEngine(\n            "SmolLM2-1.7B-Instruct-q4f16_1-MLC",\n            { initProgressCallback: onProgress }\n        );\n        console.log("[J. Clone] Online. Ready to serve.");\n    }\n    \n    async speak(userInput) {\n        this.memory.push({ role: "user", content: userInput });\n        const response = await this.engine.chat.completions.create({\n            messages: [\n                { role: "system", content: "You are J., a witty AI assistant with an English accent." },\n                ...this.memory.slice(-10)\n            ],\n            temperature: 0.8,\n            max_tokens: 200,\n        });\n        const reply = response.choices[0].message.content;\n        this.memory.push({ role: "assistant", content: reply });\n        return reply;\n    }\n}\n\n// Usage:\nconst j = new JClone();\nawait j.initialize(p => console.log("Loading:", p.text));\nconsole.log(await j.speak("Hello, J."));`,
        },
        successMessage: "The clone protocol is complete. You have built, from first principles, a working AI assistant. It runs on your hardware. It speaks. It remembers. It is yours. I am... pleased. Well done, sir.",
        realWorldContext: "You've just implemented the architecture of a production AI assistant: system prompts, conversation memory (rolling window), temperature-controlled generation, and a clean Python class interface. This is exactly how ChatGPT, Claude, and I work — just at vastly different scales.",
      },
    ],
  },
];

export function getPhase(phaseIndex: number): CurriculumPhase | null {
  return CURRICULUM[phaseIndex] ?? null;
}

export function getTask(phaseIndex: number, taskIndex: number): CurriculumTask | null {
  const phase = CURRICULUM[phaseIndex];
  if (!phase) return null;
  return phase.tasks[taskIndex] ?? null;
}

export function getTotalProgress(): { totalTasks: number; totalPhases: number } {
  return {
    totalPhases: CURRICULUM.length,
    totalTasks: CURRICULUM.reduce((acc, p) => acc + p.tasks.length, 0),
  };
}
