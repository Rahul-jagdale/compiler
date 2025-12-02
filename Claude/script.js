// Language configurations for Piston API
const languageConfigs = {
    python: { 
        language: 'python', 
        version: '3.10.0', 
        defaultCode: 'print("Hello from Python!")\n\n# Write your code here\nfor i in range(5):\n    print(f"Number: {i}")',
        monacoLang: 'python'
    },
    javascript: { 
        language: 'javascript', 
        version: '18.15.0', 
        defaultCode: 'console.log("Hello from JavaScript!");\n\n// Write your code here\nconst numbers = [1, 2, 3, 4, 5];\nnumbers.forEach(num => console.log(num));',
        monacoLang: 'javascript'
    },
    java: { 
        language: 'java', 
        version: '15.0.2', 
        defaultCode: 'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello from Java!");\n        \n        // Write your code here\n        for(int i = 0; i < 5; i++) {\n            System.out.println("Number: " + i);\n        }\n    }\n}',
        monacoLang: 'java'
    },
    cpp: { 
        language: 'c++', 
        version: '10.2.0', 
        defaultCode: '#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << "Hello from C++!" << endl;\n    \n    // Write your code here\n    for(int i = 0; i < 5; i++) {\n        cout << "Number: " << i << endl;\n    }\n    return 0;\n}',
        monacoLang: 'cpp'
    },
    c: { 
        language: 'c', 
        version: '10.2.0', 
        defaultCode: '#include <stdio.h>\n\nint main() {\n    printf("Hello from C!\\n");\n    \n    // Write your code here\n    for(int i = 0; i < 5; i++) {\n        printf("Number: %d\\n", i);\n    }\n    return 0;\n}',
        monacoLang: 'c'
    },
    go: { 
        language: 'go', 
        version: '1.16.2', 
        defaultCode: 'package main\nimport "fmt"\n\nfunc main() {\n    fmt.Println("Hello from Go!")\n    \n    // Write your code here\n    for i := 0; i < 5; i++ {\n        fmt.Printf("Number: %d\\n", i)\n    }\n}',
        monacoLang: 'go'
    },
    rust: { 
        language: 'rust', 
        version: '1.68.2', 
        defaultCode: 'fn main() {\n    println!("Hello from Rust!");\n    \n    // Write your code here\n    for i in 0..5 {\n        println!("Number: {}", i);\n    }\n}',
        monacoLang: 'rust'
    },
    php: { 
        language: 'php', 
        version: '8.2.3', 
        defaultCode: '<?php\necho "Hello from PHP!\\n";\n\n// Write your code here\nfor($i = 0; $i < 5; $i++) {\n    echo "Number: $i\\n";\n}\n?>',
        monacoLang: 'php'
    },
    ruby: { 
        language: 'ruby', 
        version: '3.0.1', 
        defaultCode: 'puts "Hello from Ruby!"\n\n# Write your code here\n5.times do |i|\n  puts "Number: #{i}"\nend',
        monacoLang: 'ruby'
    }
};

// Global variables
let editor;
let currentLanguage = 'python';

// DOM Elements
const languageSelect = document.getElementById('languageSelect');
const runBtn = document.getElementById('runBtn');
const clearBtn = document.getElementById('clearBtn');
const outputArea = document.getElementById('output');
const statusIndicator = document.getElementById('statusIndicator');
const loadingOverlay = document.getElementById('loadingOverlay');
const copyOutput = document.getElementById('copyOutput');

// Initialize Monaco Editor
require.config({ paths: { vs: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.44.0/min/vs' } });

require(['vs/editor/editor.main'], function () {
    editor = monaco.editor.create(document.getElementById('monacoEditor'), {
        value: languageConfigs[currentLanguage].defaultCode,
        language: languageConfigs[currentLanguage].monacoLang,
        theme: 'vs-dark',
        fontSize: 16,
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        automaticLayout: true,
        lineNumbers: 'on',
        roundedSelection: false,
        scrollbar: {
            vertical: 'visible',
            horizontal: 'visible'
        },
        folding: true,
        lineDecorationsWidth: 0,
        lineNumbersMinChars: 3
    });

    // Keyboard shortcut to run code
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, function () {
        runCode();
    });
});

// Language change handler
languageSelect.addEventListener('change', (e) => {
    currentLanguage = e.target.value;
    const config = languageConfigs[currentLanguage];
    
    if (editor) {
        monaco.editor.setModelLanguage(editor.getModel(), config.monacoLang);
        editor.setValue(config.defaultCode);
    }
    
    updateStatus('Ready', 'normal');
});

// Run code function
async function runCode() {
    const code = editor.getValue().trim();
    
    if (!code) {
        showOutput('⚠️ Error: Please write some code first!', 'error');
        return;
    }

    // Show loading
    loadingOverlay.classList.remove('hidden');
    updateStatus('Running...', 'loading');

    try {
        const config = languageConfigs[currentLanguage];
        
        const response = await fetch('https://emkc.org/api/v2/piston/execute', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                language: config.language,
                version: config.version,
                files: [{
                    content: code
                }]
            })
        });

        const result = await response.json();

        // Hide loading
        loadingOverlay.classList.add('hidden');

        if (result.run) {
            if (result.run.stderr) {
                // Error occurred
                const errorOutput = `❌ Error:\n${result.run.stderr}`;
                showOutput(errorOutput, 'error');
                updateStatus('Error', 'error');
            } else if (result.run.stdout) {
                // Successful execution
                const successOutput = `✅ Output:\n${result.run.stdout}`;
                showOutput(successOutput, 'success');
                updateStatus('Success', 'success');
            } else {
                // No output
                showOutput('✅ Code executed successfully with no output.', 'success');
                updateStatus('Success', 'success');
            }
        } else {
            throw new Error('Unexpected response from API');
        }

    } catch (error) {
        loadingOverlay.classList.add('hidden');
        showOutput(`❌ Compilation Error:\n${error.message}\n\nPlease check your code and try again.`, 'error');
        updateStatus('Failed', 'error');
        console.error('Error:', error);
    }
}

// Show output function
function showOutput(text, type) {
    outputArea.innerHTML = '';
    const pre = document.createElement('pre');
    pre.textContent = text;
    pre.className = type === 'error' ? 'output-error' : 'output-success';
    outputArea.appendChild(pre);
}

// Update status indicator
function updateStatus(text, type) {
    statusIndicator.textContent = text;
    statusIndicator.style.color = 
        type === 'error' ? '#f87171' : 
        type === 'success' ? '#4ade80' : 
        type === 'loading' ? '#fbbf24' : '#667eea';
}

// Clear code function
function clearCode() {
    if (editor) {
        editor.setValue(languageConfigs[currentLanguage].defaultCode);
    }
    outputArea.innerHTML = `
        <div class="output-placeholder">
            <span class="placeholder-icon">🚀</span>
            <p>Run your code to see the output here</p>
        </div>
    `;
    updateStatus('Ready', 'normal');
}

// Copy output function
function copyOutputText() {
    const outputText = outputArea.textContent;
    if (outputText && !outputText.includes('Run your code')) {
        navigator.clipboard.writeText(outputText)
            .then(() => {
                copyOutput.textContent = '✓';
                setTimeout(() => {
                    copyOutput.textContent = '📋';
                }, 2000);
            })
            .catch(err => {
                console.error('Failed to copy:', err);
            });
    }
}

// Event listeners
runBtn.addEventListener('click', runCode);
clearBtn.addEventListener('click', clearCode);
copyOutput.addEventListener('click', copyOutputText);

// Welcome message
console.log('%c🚀 CodeX Compiler Ready!', 'color: #667eea; font-size: 20px; font-weight: bold;');
console.log('%cPress Ctrl+Enter to run your code', 'color: #764ba2; font-size: 14px;');
console.log('%cPowered by Monaco Editor (VS Code)', 'color: #4ade80; font-size: 12px;');