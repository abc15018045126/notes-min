import { EditorState, Compartment } from "@codemirror/state"
import { EditorView, keymap, lineNumbers, highlightActiveLine, highlightSpecialChars, drawSelection, dropCursor, rectangularSelection, crosshairCursor, highlightActiveLineGutter } from "@codemirror/view"
import { defaultKeymap, history, historyKeymap, undo, redo } from "@codemirror/commands"
import { searchKeymap, highlightSelectionMatches, openSearchPanel } from "@codemirror/search"
import { closeBrackets, autocompletion, closeBracketsKeymap, completionKeymap } from "@codemirror/autocomplete"
import { lintKeymap } from "@codemirror/lint"
import { markdown } from "@codemirror/lang-markdown"
import { oneDark } from "@codemirror/theme-one-dark"
import { languages } from "@codemirror/language-data"
import { foldGutter } from "@codemirror/language"
import { SettingsManager } from "./settings"
import { ZoomManager } from "./zoom"
import { ScrollbarManager } from "./scrollbar"
import { ScrollSyncManager } from "./scroll-sync"

// --- Configuration Compartments ---
const fontSizeConf = new Compartment()
const wordWrapConf = new Compartment()
const themeConf = new Compartment()
const foldConf = new Compartment()
const lineNumbersConf = new Compartment()
const highlightLineConf = new Compartment()

// --- UI Elements ---
const vScrollbar = document.getElementById("virtual-scrollbar")!
const hScrollbar = document.getElementById("virtual-scrollbar-h")!

// --- Basic Setup ---
const basicSetup = [
    lineNumbersConf.of(lineNumbers()),
    highlightActiveLineGutter(),
    highlightSpecialChars(),
    history(),
    drawSelection(),
    dropCursor(),
    closeBrackets(),
    autocompletion(),
    rectangularSelection(),
    crosshairCursor(),
    highlightLineConf.of(highlightActiveLine()),
    highlightSelectionMatches(),
    keymap.of([
        ...closeBracketsKeymap,
        ...defaultKeymap,
        ...searchKeymap,
        ...historyKeymap,
        ...lintKeymap,
        ...completionKeymap
    ])
]

// --- Editor Initialization ---
const editorParent = document.getElementById("editor")!

const editor = new EditorView({
    parent: editorParent,
    state: EditorState.create({
        doc: "",
        extensions: [
            basicSetup,
            markdown({ codeLanguages: languages }),

            // Dynamic Configurations
            themeConf.of(oneDark),
            fontSizeConf.of(EditorView.theme({
                ".cm-content": { fontSize: "16px" },
                ".cm-gutters": { fontSize: "16px" }
            })),
            wordWrapConf.of(EditorView.lineWrapping),
            foldConf.of(foldGutter()),

            // Base Theme Logic
            EditorView.theme({
                "&": { height: "100%" },
                ".cm-scroller": {
                    fontFamily: "'JetBrains Mono', monospace",
                    overflow: "auto",
                    "overflow-x": "auto",
                    "touch-action": "pan-x pan-y"
                },
                ".cm-content": {
                    "box-sizing": "border-box"
                }
            }),

            // Update Listener
            EditorView.updateListener.of((update) => {
                if (update.docChanged) {
                    debouncedSave()
                    updateStats()
                }
                if (update.selectionSet) {
                    updateStats()
                }
                // Scrollbar Logic - Only update on geometry changes. 
                if (update.geometryChanged && scrollbar) {
                    scrollbar.update()
                }
            })
        ]
    })
})

// --- Initialize Managers ---
const settings = new SettingsManager(
    editor,
    fontSizeConf,
    wordWrapConf,
    foldConf,
    themeConf,
    oneDark,
    lineNumbersConf,
    highlightLineConf
)
settings.loadSettings()
new ZoomManager(editor, settings)
new ZoomManager(editor, settings)
const scrollbar = new ScrollbarManager(editor, settings)
new ScrollSyncManager(editor)

// --- Bridge Implementation ---
window.editorBridge = {
    save: () => {
        if (window.Android) window.Android.save(editor.state.doc.toString())
    },
    close: () => {
        if (window.Android) {
            window.Android.save(editor.state.doc.toString())
            window.Android.close()
        }
    },
    setContent: (content: string, optionsJson: string = "{}") => {
        const options = JSON.parse(optionsJson)

        editor.dispatch({
            changes: { from: 0, to: editor.state.doc.length, insert: content }
        })

        if (options.theme) {
            settings.setTheme(options.theme !== 'light')
        }
    }
}

// --- Utilities ---
let saveTimeout: any
function debouncedSave() {
    if (saveTimeout) clearTimeout(saveTimeout)
    saveTimeout = setTimeout(() => {
        if (window.Android) window.Android.save(editor.state.doc.toString())
    }, 800)
}

function updateStats() {
    const state = editor.state
    const head = state.selection.main.head
    const line = state.doc.lineAt(head)
    const col = head - line.from + 1

    document.getElementById("st-info")!.textContent = `Line ${line.number}, Col ${col}`
}

// --- Toolbar Logic ---
document.getElementById("btn-undo")!.onclick = () => undo(editor)
document.getElementById("btn-redo")!.onclick = () => redo(editor)
document.getElementById("btn-save")!.onclick = () => {
    if (window.Android) window.Android.save(editor.state.doc.toString())
}

// --- Symbol Bar ---
const symbols = [",", ".", ";", "(", ")", "{", "}", "[", "]", "\"", "'", ":", "/", "<", ">", "=", "+", "-", "*", "&", "|", "!", "?", "#", "@", "$", "%", "^", "~", "`"]
const bar = document.getElementById("symbol-bar")!
symbols.forEach(s => {
    const btn = document.createElement("button")
    btn.className = "symbol-btn"
    btn.textContent = s
    btn.onclick = () => {
        editor.dispatch(editor.state.replaceSelection(s))
        editor.focus()
    }
    bar.appendChild(btn)
})

// --- TOC Logic & Navigation ---
const tocPage = document.getElementById("toc-page")!
const tocContent = document.getElementById("toc-content")!
const btnTocOpen = document.getElementById("btn-toc-open")!
const btnTocClose = document.getElementById("btn-toc-close")!
const tabTocRow = document.getElementById("tab-toc-row")!
const tabTocChar = document.getElementById("tab-toc-char")!

let tocType: 'row' | 'char' = 'row'

function generateTOC() {
    tocContent.innerHTML = ""
    const state = editor.state
    const doc = state.doc

    let chapters = []
    let lastLine = 1
    let lastOffset = 0

    chapters.push({ line: 1, pos: 0, label: "开始 (Start)" })

    for (let i = 1; i <= doc.lines; i++) {
        const line = doc.line(i)

        let shouldBreak = false
        if (tocType === 'char') {
            if ((line.to - lastOffset) >= 2000) shouldBreak = true
        } else {
            if ((i - lastLine) >= 100) shouldBreak = true
        }

        if (shouldBreak) {
            const content = line.text.substring(0, 30).trim() || `第 ${i} 行`
            chapters.push({ line: i, pos: line.from, label: content })
            lastLine = i
            lastOffset = line.to
        }
    }

    chapters.forEach((chap, index) => {
        const item = document.createElement("div")
        item.className = "toc-item"

        const head = editor.state.selection.main.head
        const nextChap = chapters[index + 1]
        if (head >= chap.pos && (!nextChap || head < nextChap.pos)) {
            item.classList.add("current")
        }

        item.innerHTML = `
            <div class="toc-item-title" style="pointer-events: none;">${chap.label}</div>
            <div class="toc-item-meta" style="pointer-events: none;">${tocType === 'row' ? '第 ' + chap.line + ' 行' : '内容偏移: ' + chap.pos}</div>
        `

        item.onclick = (e) => {
            e.preventDefault()
            e.stopPropagation()
            item.style.backgroundColor = "#3b82f6"
            item.style.color = "#ffffff"
            editor.dispatch({
                selection: { anchor: chap.pos, head: chap.pos },
                scrollIntoView: true
            })
            setTimeout(() => {
                tocPage.classList.remove("active")
                editor.focus()
            }, 50)
        }
        tocContent.appendChild(item)
    })
}

function updateTabs() {
    tabTocRow.classList.toggle("active", tocType === 'row')
    tabTocChar.classList.toggle("active", tocType === 'char')
    generateTOC()
}

tabTocRow.onclick = () => { tocType = 'row'; updateTabs(); }
tabTocChar.onclick = () => { tocType = 'char'; updateTabs(); }

btnTocOpen.onclick = () => {
    generateTOC()
    tocPage.classList.add("active")
    setTimeout(() => {
        const currentItem = tocContent.querySelector(".toc-item.current")
        if (currentItem) currentItem.scrollIntoView({ behavior: "smooth", block: "center" })
    }, 350)
}
btnTocClose.onclick = () => { tocPage.classList.remove("active"); }

// --- Menus & Settings ---
const overlay = document.getElementById("global-overlay")!
const moreMenu = document.getElementById("more-menu")!
const settingsPage = document.getElementById("settings-page")!
function showOverlay(menu: boolean) {
    overlay.classList.add("visible")
    if (menu) moreMenu.classList.remove("hidden")
}
function hideOverlay() {
    overlay.classList.remove("visible")
    moreMenu.classList.add("hidden")
}

document.getElementById("btn-menu-open")!.onclick = () => showOverlay(true)
overlay.onclick = (e) => {
    if (e.target === overlay) hideOverlay()
}

document.getElementById("mi-back")!.onclick = () => {
    window.editorBridge.close()
}

document.getElementById("mi-search")!.onclick = () => {
    hideOverlay()
    openSearchPanel(editor)
}

document.getElementById("mi-settings")!.onclick = () => {
    hideOverlay()
    settingsPage.classList.add("active")
}
