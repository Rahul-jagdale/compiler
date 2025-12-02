// ----- Config -----
const PISTON_BASE_URL = "https://emkc.org/api/v2/piston";
const STORAGE_PREFIX = "codepad_v2_";

// DOM refs
const langSelect = document.getElementById("language-select");
const fileLabel = document.getElementById("file-label");
const stdinEl = document.getElementById("stdin");
const runBtn = document.getElementById("run-btn");
const clearEditorBtn = document.getElementById("clear-editor");
const loadExampleBtn = document.getElementById("load-example");
const clearOutputBtn = document.getElementById("clear-output");
const stdoutEl = document.getElementById("stdout");
const stderrEl = document.getElementById("stderr");
const statusBar = document.getElementById("status-bar");
const statusIcon = document.getElementById("status-icon");
const statusText = document.getElementById("status-text");
const execTimeEl = document.getElementById("exec-time");

let editor;

// Example starter code
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

// Piston language aliases
const PISTON_LANG_MAP = {
  c: "c",
  cpp: "cpp",
  python: "python",
  javascript: "javascript",
  java: "java"
};

// ----- LocalStorage helpers -----

function storageKeyForLang(lang) {
  return STORAGE_PREFIX + "code_" + lang;
}

function loadSavedCode(lang) {
  return localStorage.getItem(storageKeyForLang(lang));
}

function saveCode(lang, code) {
  try {
    localStorage.setItem(storageKeyForLang(lang), code);
  } catch {
    // ignore quota errors
  }
}

// ----- Editor init -----

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
  editor.setSize("100%", "300px");

  // Auto-save on changes (lightweight)
  editor.on("change", () => {
    const lang = langSelect.value;
    const code = editor.getValue();
    saveCode(lang, code);
  });
}

// ----- Status helpers -----

function setStatusIdle() {
  statusBar.classList.remove("running", "error");
  statusBar.classList.add("idle");
  statusText.textContent = "Idle";
  statusIcon.textContent = "●";
  execTimeEl.textContent = "";
}

function setStatusRunning() {
  statusBar.classList.remove("idle", "error");
  statusBar.classList.add("running");
  statusText.textContent = "Sending code to server…";
  statusIcon.textContent = "●";
  execTimeEl.textContent = "";
}

function setStatusSuccess(ms) {
  statusBar.classList.remove("running", "error");
  statusBar.classList.add("idle");
  statusText.textContent = "Execution finished successfully";
  statusIcon.textContent = "●";
  execTimeEl.textContent = `≈ ${ms.toFixed(1)} ms`;
}

function setStatusError(ms) {
  statusBar.classList.remove("running");
  statusBar.classList.add("error");
  statusText.textContent = "Execution finished with errors";
  statusIcon.textContent = "●";
  execTimeEl.textContent = ms ? `≈ ${ms.toFixed(1)} ms` : "";
}

// ----- UI helpers -----

function clearOutput() {
  stdoutEl.textContent = "";
  stderrEl.textContent = "";
  execTimeEl.textContent = "";
  setStatusIdle();
}

function setFileLabel() {
  const lang = langSelect.value;
  const label =
    lang === "c"
      ? "main.c"
      : lang === "cpp"
      ? "main.cpp"
      : lang === "java"
      ? "Main.java"
      : lang === "python"
      ? "main.py"
      : "main.js";
  fileLabel.textContent = label;
}

function loadExampleForCurrentLanguage() {
  const lang = langSelect.value;
  const saved = loadSavedCode(lang);
  if (saved) {
    editor.setValue(saved);
  } else {
    editor.setValue(EXAMPLES[lang] || "// Start coding here...");
  }
  clearOutput();
}

// ----- Run code -----

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
  setStatusRunning();
  runBtn.classList.add("running");
  runBtn.disabled = true;

  try {
    const payload = {
      language: pistonLanguage,
      version: "*",
      files: [{ content: source }],
      stdin
    };

    const start = performance.now();
    const res = await fetch(`${PISTON_BASE_URL}/execute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const end = performance.now();
    const elapsed = end - start;

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

    if (code === 0 && !stderr) {
      setStatusSuccess(elapsed);
    } else if (stderr) {
      setStatusError(elapsed);
    } else {
      statusText.textContent = `Finished with exit code ${code}`;
      execTimeEl.textContent = `≈ ${elapsed.toFixed(1)} ms`;
    }

    // Save latest code for this language
    saveCode(langKey, source);
  } catch (err) {
    console.error(err);
    stderrEl.textContent = String(err.message || err);
    setStatusError();
  } finally {
    runBtn.classList.remove("running");
    runBtn.disabled = false;
  }
}

// ----- Events -----

document.addEventListener("DOMContentLoaded", () => {
  initEditor();
  setFileLabel();
  loadExampleForCurrentLanguage();
  setStatusIdle();
});

// language change
langSelect.addEventListener("change", () => {
  const lang = langSelect.value;
  setFileLabel();
  editor.setOption("mode", CM_MODE_MAP[lang] || "text/plain");
  loadExampleForCurrentLanguage();
});

// buttons
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

// keyboard shortcut: Ctrl + Enter
window.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
    e.preventDefault();
    runCode();
  }
});
