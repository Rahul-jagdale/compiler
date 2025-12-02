// ----- Config -----
const PISTON_BASE_URL = "https://emkc.org/api/v2/piston";

// DOM elements
const langSelect = document.getElementById("language-select");
const stdinEl = document.getElementById("stdin");
const runBtn = document.getElementById("run-btn");
const clearEditorBtn = document.getElementById("clear-editor");
const loadExampleBtn = document.getElementById("load-example");
const clearOutputBtn = document.getElementById("clear-output");
const stdoutEl = document.getElementById("stdout");
const stderrEl = document.getElementById("stderr");
const statusText = document.getElementById("status-text");
const execTimeEl = document.getElementById("exec-time");

let editor;

// Example starter code per language
const EXAMPLES = {
  c: `#include <stdio.h>

int main() {
    int a, b;
    scanf("%d %d", &a, &b);
    printf("Sum = %d\\n", a + b);
    return 0;
}`,
  cpp: `#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;
    cout << "Square: " << n * n << "\\n";
    return 0;
}`,
  python: `# Online Python example
name = input("Enter your name: ")
print("Hello,", name)`,
  javascript: `// Node.js example
const readline = require("readline");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

let data = "";
rl.on("line", (line) => {
  data += line;
});
rl.on("close", () => {
  console.log("You typed:", data);
});`,
  java: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int n = sc.nextInt();
        System.out.println("Double: " + (2 * n));
    }
}`
};

// CodeMirror mode per language
const CM_MODE_MAP = {
  c: "text/x-csrc",
  cpp: "text/x-c++src",
  python: "python",
  javascript: "javascript",
  java: "text/x-java"
};

// Piston language aliases (frontend value -> API language)
const PISTON_LANG_MAP = {
  c: "c",
  cpp: "cpp",
  python: "python",
  javascript: "javascript",
  java: "java"
};

// ----- Init CodeMirror -----
function initEditor() {
  const textarea = document.getElementById("code-editor");
  editor = CodeMirror.fromTextArea(textarea, {
    lineNumbers: true,
    tabSize: 2,
    indentUnit: 2,
    styleActiveLine: true,
    matchBrackets: true,
    theme: "material-palenight",
    mode: CM_MODE_MAP[langSelect.value]
  });

  editor.setSize("100%", "290px");
}

document.addEventListener("DOMContentLoaded", () => {
  initEditor();
  loadExampleForCurrentLanguage();
});

// ----- Helpers -----

function setModeForLanguage(lang) {
  const mode = CM_MODE_MAP[lang] || "text/plain";
  editor.setOption("mode", mode);
}

function loadExampleForCurrentLanguage() {
  const lang = langSelect.value;
  const example = EXAMPLES[lang];
  if (example) {
    editor.setValue(example);
  } else {
    editor.setValue("// Start coding here...");
  }
  clearOutput();
}

function clearOutput() {
  stdoutEl.textContent = "";
  stderrEl.textContent = "";
  execTimeEl.textContent = "";
  statusText.textContent = "";
}

function setRunningState(isRunning) {
  if (isRunning) {
    runBtn.classList.add("running");
    runBtn.disabled = true;
    statusText.textContent = "Running your code...";
  } else {
    runBtn.classList.remove("running");
    runBtn.disabled = false;
  }
}

// ----- Event Listeners -----

langSelect.addEventListener("change", () => {
  const lang = langSelect.value;
  setModeForLanguage(lang);
  loadExampleForCurrentLanguage();
});

clearEditorBtn.addEventListener("click", () => {
  editor.setValue("");
  clearOutput();
});

loadExampleBtn.addEventListener("click", () => {
  loadExampleForCurrentLanguage();
});

clearOutputBtn.addEventListener("click", () => {
  clearOutput();
});

runBtn.addEventListener("click", () => {
  runCode();
});

// ----- Core: call Piston API -----

async function runCode() {
  const langKey = langSelect.value;
  const pistonLanguage = PISTON_LANG_MAP[langKey];

  const source = editor.getValue().trim();
  const stdin = stdinEl.value;

  if (!source) {
    statusText.textContent = "Write some code first.";
    return;
  }

  clearOutput();
  setRunningState(true);

  try {
    const payload = {
      language: pistonLanguage,
      version: "*", // latest version
      files: [
        {
          content: source
        }
      ],
      stdin
    };

    const start = performance.now();
    const res = await fetch(`${PISTON_BASE_URL}/execute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const end = performance.now();

    if (!res.ok) {
      throw new Error(`Server error: ${res.status}`);
    }

    const data = await res.json();
    const run = data.run || data;

    const stdout = run.stdout ?? "";
    const stderr = run.stderr ?? "";
    const code = run.code;

    stdoutEl.textContent = stdout || "(no output)";
    stderrEl.textContent = stderr;

    const elapsed = end - start;
    execTimeEl.textContent = `≈ ${elapsed.toFixed(1)} ms`;

    if (code === 0 && !stderr) {
      statusText.textContent = "Execution finished successfully ✅";
    } else if (stderr) {
      statusText.textContent = "Finished with errors ❌";
    } else {
      statusText.textContent = `Finished with exit code ${code}`;
    }
  } catch (err) {
    console.error(err);
    stderrEl.textContent = String(err.message || err);
    statusText.textContent = "Failed to run code. Check error box.";
  } finally {
    setRunningState(false);
  }
}
