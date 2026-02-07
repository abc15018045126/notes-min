import { EditorState, Compartment } from "@codemirror/state"
import { EditorView, keymap, lineNumbers, highlightActiveLine, highlightSpecialChars, drawSelection, dropCursor, rectangularSelection, crosshairCursor, highlightActiveLineGutter } from "@codemirror/view"
import { defaultKeymap, history, historyKeymap, undo, redo } from "@codemirror/commands"
import { searchKeymap, highlightSelectionMatches, openSearchPanel } from "@codemirror/search"
import { closeBrackets, autocompletion, closeBracketsKeymap, completionKeymap } from "@codemirror/autocomplete"
import { lintKeymap } from "@codemirror/lint"

import { oneDark } from "@codemirror/theme-one-dark"
import { foldGutter } from "@codemirror/language"
import { markdown } from "@codemirror/lang-markdown"
import { languages } from "@codemirror/language-data"
import { SettingsManager } from "./settings"
import { ZoomManager } from "./zoom"
import { ScrollbarManager } from "./scrollbar"
import { emptyLineFix } from "./empty-line-fix"

// --- Configuration Compartments ---
const fontSizeConf = new Compartment()
const wordWrapConf = new Compartment()
const themeConf = new Compartment()
const foldConf = new Compartment()
const lineNumbersConf = new Compartment()
const highlightLineConf = new Compartment()
const customThemeConf = new Compartment()
const languageConf = new Compartment()

// --- UI Elements ---
const vScrollbar = document.getElementById("virtual-scrollbar")!
const hScrollbar = document.getElementById("virtual-scrollbar-h")!

// --- Basic Setup ---
const basicSetup = [
    lineNumbersConf.of(lineNumbers()),
    highlightActiveLineGutter(),
    highlightSpecialChars(),
    history(),
    // drawSelection(),
    // dropCursor(),
    closeBrackets(),
    autocompletion(),
    // rectangularSelection(),
    // crosshairCursor(),
    // highlightLineConf.of(highlightActiveLine()),
    // highlightSelectionMatches(),
    keymap.of([
        ...closeBracketsKeymap,
        ...defaultKeymap,
        ...searchKeymap,
        ...historyKeymap,
        ...lintKeymap,
        ...completionKeymap
    ]),
    emptyLineFix()
]

// --- Editor Initialization ---
const editorParent = document.getElementById("editor")!

const editor = new EditorView({
    parent: editorParent,
    state: EditorState.create({
        doc: "",
        extensions: [
            basicSetup,
            // Dynamic Configurations
            languageConf.of([]), // Default to Plain Text
            themeConf.of(oneDark),
            customThemeConf.of([]),
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
                    "overflow-x": "auto"
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

                /* [Android Fix] - Temporarily disabled as it interferes with manual selection
                if (update.viewportChanged || update.geometryChanged) {
                    const view = update.view
                    const head = view.state.selection.main.head

                    let isVisible = false
                    for (const { from, to } of view.visibleRanges) {
                        if (head >= from && head <= to) {
                            isVisible = true
                            break
                        }
                    }

                    if (!isVisible && view.visibleRanges.length > 0) {
                        const firstRange = view.visibleRanges[0]
                        const center = Math.floor((firstRange.from + firstRange.to) / 2)

                        setTimeout(() => {
                            view.dispatch({
                                selection: { anchor: center, head: center },
                                scrollIntoView: false
                            })
                        }, 50)
                    }
                }
                */
            })
        ]
    })
})

// [Android Fix] Selection monitoring to adjust UI priorities
document.addEventListener('selectionchange', () => {
    const sel = window.getSelection()
    const hasSelection = sel && sel.toString().length > 0
    if (hasSelection) {
        document.body.classList.add('app-selecting')
    } else {
        document.body.classList.remove('app-selecting')
    }
})

// [Android Fix] Ensure focus on first touch to stabilize long-press selection
editor.contentDOM.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1 && !editor.hasFocus) {
        editor.focus()
    }
}, { passive: true })

// --- Initialize Managers ---
const settings = new SettingsManager(
    editor,
    fontSizeConf,
    wordWrapConf,
    foldConf,
    themeConf,
    oneDark,
    lineNumbersConf,
    highlightLineConf,
    customThemeConf,
    languageConf
)
settings.loadSettings()
new ZoomManager(editor, settings)
const scrollbar = new ScrollbarManager(editor, settings)

// --- File State ---
let initialContent = ""
let fileMetadata = { name: "file.txt", path: "/" }

// --- Bridge Implementation ---
window.editorBridge = {
    onRenamed: (newName: string, newPath: string) => {
        fileMetadata.name = newName
        fileMetadata.path = newPath
        document.getElementById("st-filename")!.textContent = newName
    },
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

        // Save initial state for Revert
        initialContent = content

        // Update Metadata
        if (options.filename) fileMetadata.name = options.filename
        if (options.path) fileMetadata.path = options.path

        // Update UI
        document.getElementById("st-filename")!.textContent = fileMetadata.name

        // Reset state completely to clear history
        editor.setState(EditorState.create({
            doc: content,
            extensions: [
                basicSetup,
                // Re-apply dynamic configurations
                languageConf.of(settings.languageMode === "Markdown" ?
                    [markdown({ codeLanguages: languages })] : []),
                themeConf.of(settings.isDarkTheme ? oneDark : []),
                customThemeConf.of(settings.getCustomTheme()),
                fontSizeConf.of(EditorView.theme({
                    ".cm-content": {
                        lineHeight: settings.lineHeight,
                        fontSize: settings.currentFontSize + "px"
                    },
                    ".cm-gutters": {
                        fontSize: settings.currentFontSize + "px"
                    },
                    ".cm-line": {
                        paddingLeft: settings.sideMargin + "px",
                        paddingRight: settings.sideMargin + "px"
                    },
                    ".cm-lineWrapping .cm-line": { lineHeight: settings.wrapLineHeight }
                })),
                wordWrapConf.of(settings.isWordWrap ? EditorView.lineWrapping : []),
                foldConf.of(settings.isFoldEnabled ? foldGutter() : []),

                // Re-apply Base Theme
                EditorView.theme({
                    "&": { height: "100%" },
                    ".cm-scroller": {
                        fontFamily: "'JetBrains Mono', monospace",
                        overflow: "auto",
                        "overflow-x": "auto"
                    },
                    ".cm-content": { "box-sizing": "border-box" }
                }),

                // Re-apply Listener
                EditorView.updateListener.of((update) => {
                    if (update.docChanged) {
                        debouncedSave()
                        updateStats()
                    }
                    if (update.selectionSet) updateStats()
                    if (update.geometryChanged && scrollbar) scrollbar.update()

                    /*
                    if (update.viewportChanged || update.geometryChanged) {
                        const view = update.view
                        const head = view.state.selection.main.head
                        let isVisible = false
                        for (const { from, to } of view.visibleRanges) {
                            if (head >= from && head <= to) { isVisible = true; break; }
                        }
                        if (!isVisible && view.visibleRanges.length > 0) {
                            const fr = view.visibleRanges[0]
                            const center = Math.floor((fr.from + fr.to) / 2)
                            setTimeout(() => {
                                view.dispatch({ selection: { anchor: center, head: center }, scrollIntoView: false })
                            }, 50)
                        }
                    }
                    */
                })
            ]
        }))

        if (options.theme) {
            settings.setTheme(options.theme !== 'light')
        }
        settings.updateFromData(options)
    }
}

// --- Utilities ---
let saveTimeout: any
function debouncedSave() {
    if (!settings.isAutoSave) return
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

            // Instant Jump Logic
            editor.dispatch({
                selection: { anchor: chap.pos, head: chap.pos },
                effects: EditorView.scrollIntoView(chap.pos, { y: 'center' }),
                userEvent: 'select'
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

document.getElementById("mi-rename")!.onclick = () => {
    hideOverlay()
    const newName = prompt("请输入新的文件名:", fileMetadata.name)
    if (newName && newName !== fileMetadata.name) {
        if (window.Android && window.Android.rename) {
            window.Android.rename(newName)
        }
    }
}

document.getElementById("mi-settings")!.onclick = () => {
    hideOverlay()
    settingsPage.classList.add("active")
}

// --- File Info & Revert Logic ---
const infoModal = document.getElementById("file-info-modal")!
const btnInfoClose = document.getElementById("btn-info-close")!

document.getElementById("mi-info")!.onclick = () => {
    hideOverlay()

    // Populate Data
    document.getElementById("info-filename")!.textContent = fileMetadata.name
    document.getElementById("info-path")!.textContent = fileMetadata.path
    document.getElementById("info-lines")!.textContent = editor.state.doc.lines.toString()
    document.getElementById("info-chars")!.textContent = editor.state.doc.length.toString()

    // Show Modal
    showOverlay(false) // Show overlay but no menu
    infoModal.classList.remove("hidden")
}

btnInfoClose.onclick = () => {
    hideOverlay()
    infoModal.classList.add("hidden")
}

document.getElementById("mi-revert")!.onclick = () => {
    hideOverlay()
    if (confirm("确定要重置文件到初始状态吗？所有未保存的修改将丢失。")) {
        window.editorBridge.setContent(initialContent, JSON.stringify({
            theme: settings.isDarkTheme ? 'dark' : 'light',
            filename: fileMetadata.name,
            path: fileMetadata.path
        }))
    }
}
