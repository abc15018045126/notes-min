import { EditorState, Compartment } from "@codemirror/state"
import { EditorView, keymap, lineNumbers, highlightActiveLine, highlightSpecialChars, drawSelection, dropCursor, rectangularSelection, crosshairCursor, highlightActiveLineGutter } from "@codemirror/view"
import { defaultKeymap, history, historyKeymap, undo, redo } from "@codemirror/commands"
import { searchKeymap, highlightSelectionMatches } from "@codemirror/search"
import { closeBrackets, autocompletion, closeBracketsKeymap, completionKeymap } from "@codemirror/autocomplete"
import { lintKeymap } from "@codemirror/lint"
import { markdown } from "@codemirror/lang-markdown"
import { oneDark } from "@codemirror/theme-one-dark"
import { languages } from "@codemirror/language-data"
import { foldGutter } from "@codemirror/language"

// --- Configuration Compartments ---
const fontSizeConf = new Compartment()
const wordWrapConf = new Compartment()
const themeConf = new Compartment()
const foldConf = new Compartment()

// --- State Variables ---
let currentFontSize = 16
let isWordWrap = true
let isAutoPush = false
let isDarkTheme = true
let isFoldEnabled = true

// --- UI Elements ---
const vScrollbar = document.getElementById("virtual-scrollbar")!
const vThumb = document.getElementById("scrollbar-thumb")!
const hScrollbar = document.getElementById("virtual-scrollbar-h")!
const hThumb = document.getElementById("scrollbar-thumb-h")!
let scrollTimeout: any

// --- Basic Setup ---
const basicSetup = [
    lineNumbers(),
    highlightActiveLineGutter(),
    highlightSpecialChars(),
    history(),
    drawSelection(),
    dropCursor(),
    closeBrackets(),
    autocompletion(),
    rectangularSelection(),
    crosshairCursor(),
    highlightActiveLine(),
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
                    overflow: "auto"
                }
            }),

            // Padding / Margins
            EditorView.scrollMargins.of(() => ({ bottom: 150 })),

            // Update Listener
            EditorView.updateListener.of((update) => {
                if (update.docChanged) {
                    debouncedSave()
                    updateStats()
                }
                if (update.selectionSet) {
                    updateStats()
                }
                // Scrollbar Logic
                if (update.geometryChanged || update.view.scrollDOM.scrollTop) {
                    updateScrollbar()
                }
            })
        ]
    })
})

// --- Scrollbar Implementation ---
editor.scrollDOM.addEventListener("scroll", () => updateScrollbar())

// --- Vertical Drag Logic ---
let isDraggingV = false;
let startY = 0;
let startThumbTop = 0;

vScrollbar.addEventListener('touchstart', (e) => {
    isDraggingV = true;
    startY = e.touches[0].clientY;

    const el = editor.scrollDOM;
    const clientHeight = el.clientHeight;
    // Recalc logic
    const scrollHeight = el.scrollHeight;
    const scrollTop = el.scrollTop;

    const availableScrollHeight = scrollHeight - clientHeight;
    const ratio = clientHeight / scrollHeight;
    const thumbHeight = Math.max(ratio * clientHeight, 40);
    const availableThumbSpace = clientHeight - thumbHeight;

    let currentThumbTop = 0;
    if (availableScrollHeight > 0) {
        currentThumbTop = (scrollTop / availableScrollHeight) * availableThumbSpace;
    }
    startThumbTop = currentThumbTop;

    vScrollbar.classList.add('visible');
    if (scrollTimeout) clearTimeout(scrollTimeout);
    e.preventDefault();
});

// --- Horizontal Drag Logic ---
let isDraggingH = false;
let startX = 0;
let startThumbLeft = 0;

hScrollbar.addEventListener('touchstart', (e) => {
    isDraggingH = true;
    startX = e.touches[0].clientX;

    const el = editor.scrollDOM;
    const clientWidth = el.clientWidth;
    const scrollWidth = el.scrollWidth;
    const scrollLeft = el.scrollLeft;

    const availableScrollWidth = scrollWidth - clientWidth;
    const ratio = clientWidth / scrollWidth;
    const thumbWidth = Math.max(ratio * clientWidth, 40);
    const availableThumbSpace = clientWidth - thumbWidth;

    let currentThumbLeft = 0;
    if (availableScrollWidth > 0) {
        currentThumbLeft = (scrollLeft / availableScrollWidth) * availableThumbSpace;
    }
    startThumbLeft = currentThumbLeft;

    hScrollbar.classList.add('visible');
    if (scrollTimeout) clearTimeout(scrollTimeout);
    e.preventDefault();
});


document.addEventListener('touchmove', (e) => {
    if (isDraggingV) {
        const deltaY = e.touches[0].clientY - startY;
        const newThumbTop = startThumbTop + deltaY;

        const el = editor.scrollDOM;
        const scrollHeight = el.scrollHeight;
        const clientHeight = el.clientHeight;

        const ratio = clientHeight / scrollHeight;
        const thumbHeight = Math.max(ratio * clientHeight, 40);
        const availableThumbSpace = clientHeight - thumbHeight;

        const clampedThumbTop = Math.max(0, Math.min(newThumbTop, availableThumbSpace));

        vThumb.style.transform = `translateY(${clampedThumbTop}px)`;

        if (availableThumbSpace > 0) {
            const scrollRatio = clampedThumbTop / availableThumbSpace;
            el.scrollTop = scrollRatio * (scrollHeight - clientHeight);
        }
    }

    if (isDraggingH) {
        const deltaX = e.touches[0].clientX - startX;
        const newThumbLeft = startThumbLeft + deltaX;

        const el = editor.scrollDOM;
        const scrollWidth = el.scrollWidth;
        const clientWidth = el.clientWidth;

        const ratio = clientWidth / scrollWidth;
        const thumbWidth = Math.max(ratio * clientWidth, 40);
        const availableThumbSpace = clientWidth - thumbWidth;

        const clampedThumbLeft = Math.max(0, Math.min(newThumbLeft, availableThumbSpace));

        hThumb.style.transform = `translateX(${clampedThumbLeft}px)`;

        if (availableThumbSpace > 0) {
            const scrollRatio = clampedThumbLeft / availableThumbSpace;
            el.scrollLeft = scrollRatio * (scrollWidth - clientWidth);
        }
    }
});

document.addEventListener('touchend', () => {
    if (isDraggingV || isDraggingH) {
        isDraggingV = false;
        isDraggingH = false;
        if (scrollTimeout) clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
            vScrollbar.classList.remove("visible");
            hScrollbar.classList.remove("visible");
        }, 1500);
    }
});

function updateScrollbar() {
    const el = editor.scrollDOM

    // Vertical
    if (!isDraggingV) {
        const totalHeight = el.scrollHeight
        const clientHeight = el.clientHeight
        const scrollTop = el.scrollTop

        if (totalHeight <= clientHeight + 1) {
            vScrollbar.classList.remove("visible")
        } else {
            const ratio = clientHeight / totalHeight
            const thumbHeight = Math.max(ratio * clientHeight, 40)
            const availableScrollHeight = totalHeight - clientHeight
            const availableThumbSpace = clientHeight - thumbHeight

            let scrollRatio = 0
            if (availableScrollHeight > 0) scrollRatio = scrollTop / availableScrollHeight

            const thumbTop = scrollRatio * availableThumbSpace

            vThumb.style.height = `${thumbHeight}px`
            vThumb.style.transform = `translateY(${thumbTop}px)`
            vScrollbar.classList.add("visible")
        }
    }

    // Horizontal
    if (!isDraggingH) {
        const totalWidth = el.scrollWidth
        const clientWidth = el.clientWidth
        const scrollLeft = el.scrollLeft

        if (totalWidth <= clientWidth + 1) {
            hScrollbar.classList.remove("visible")
        } else {
            const ratio = clientWidth / totalWidth
            const thumbWidth = Math.max(ratio * clientWidth, 40)
            const availableScrollWidth = totalWidth - clientWidth
            const availableThumbSpace = clientWidth - thumbWidth

            let scrollRatio = 0
            if (availableScrollWidth > 0) scrollRatio = scrollLeft / availableScrollWidth

            const thumbLeft = scrollRatio * availableThumbSpace

            hThumb.style.width = `${thumbWidth}px`
            hThumb.style.transform = `translateX(${thumbLeft}px)`
            hScrollbar.classList.add("visible")
        }
    }

    if (scrollTimeout) clearTimeout(scrollTimeout)
    scrollTimeout = setTimeout(() => {
        vScrollbar.classList.remove("visible")
        hScrollbar.classList.remove("visible")
    }, 1500)
}
updateScrollbar()

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
            isDarkTheme = options.theme !== 'light'
            editor.dispatch({
                effects: themeConf.reconfigure(isDarkTheme ? oneDark : [])
            })
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

// --- Pinch to Zoom Logic (Optimized) ---
let isPinching = false
let startDist = 0
let startFontSize = 16
let lastScale = 1

editor.contentDOM.addEventListener("touchstart", (e) => {
    if (e.touches.length === 2) {
        isPinching = true
        const t1 = e.touches[0]
        const t2 = e.touches[1]
        startDist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY)
        startFontSize = currentFontSize
        lastScale = 1

        // Prepare for smooth scaling
        const scroller = editor.scrollDOM
        scroller.style.transition = "none"
        scroller.style.willChange = "transform"
    }
}, { passive: false })

editor.contentDOM.addEventListener("touchmove", (e) => {
    if (isPinching && e.touches.length === 2) {
        e.preventDefault()
        const t1 = e.touches[0]
        const t2 = e.touches[1]
        const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY)

        if (startDist > 0) {
            lastScale = dist / startDist
            // Hardware accelerated scaling for immediate feedback
            editor.scrollDOM.style.transform = `scale(${lastScale})`
            editor.scrollDOM.style.transformOrigin = "center center"
        }
    }
}, { passive: false })

const endPinch = () => {
    if (!isPinching) return
    isPinching = false

    // 1. Clear visual transform
    const scroller = editor.scrollDOM
    scroller.style.transform = ""
    scroller.style.transformOrigin = ""
    scroller.style.willChange = ""

    // 2. Finalize font size
    let newSize = Math.round(startFontSize * lastScale)
    newSize = Math.max(10, Math.min(newSize, 64))

    if (newSize !== currentFontSize) {
        setFontSize(newSize)
    }
}

editor.contentDOM.addEventListener("touchend", endPinch)
editor.contentDOM.addEventListener("touchcancel", endPinch)

// --- Helper: Set Font Size ---
function setFontSize(size: number) {
    currentFontSize = size
    fontSlider.value = size.toString()
    fontVal.textContent = size + "px"
    editor.dispatch({
        effects: fontSizeConf.reconfigure(EditorView.theme({
            ".cm-content": { fontSize: currentFontSize + "px" },
            ".cm-gutters": { fontSize: currentFontSize + "px" }
        }))
    })
}

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

document.getElementById("mi-settings")!.onclick = () => {
    hideOverlay()
    settingsPage.classList.add("active")
}

document.getElementById("btn-settings-back")!.onclick = () => {
    settingsPage.classList.remove("active")
    const settings = {
        fontSize: currentFontSize,
        wordWrap: isWordWrap,
        autoPush: isAutoPush,
        fold: isFoldEnabled
    }
    localStorage.setItem("editor_settings", JSON.stringify(settings))
}

// --- Settings Listeners ---
const fontSlider = document.getElementById("font-slider") as HTMLInputElement
const fontVal = document.getElementById("font-val")!
fontSlider.addEventListener("input", () => {
    setFontSize(parseInt(fontSlider.value))
})

const wrapCheck = document.getElementById("wrap-check") as HTMLInputElement
wrapCheck.addEventListener("change", () => {
    isWordWrap = wrapCheck.checked
    editor.dispatch({
        effects: wordWrapConf.reconfigure(isWordWrap ? EditorView.lineWrapping : [])
    })
})

const foldCheck = document.getElementById("fold-check") as HTMLInputElement
foldCheck.addEventListener("change", () => {
    isFoldEnabled = foldCheck.checked
    editor.dispatch({
        effects: foldConf.reconfigure(isFoldEnabled ? foldGutter() : [])
    })
})

const autoPushCheck = document.getElementById("autopush-check") as HTMLInputElement
autoPushCheck.addEventListener("change", () => {
    isAutoPush = autoPushCheck.checked
    const scroller = document.querySelector(".cm-scroller") as HTMLElement
    if (scroller) {
        scroller.style.paddingBottom = isAutoPush ? "70vh" : "200px"
    }
})

// --- Init Settings ---
const saved = localStorage.getItem("editor_settings")
if (saved) {
    try {
        const s = JSON.parse(saved)
        if (s.fontSize) {
            setFontSize(s.fontSize)
        }
        if (s.wordWrap !== undefined) {
            isWordWrap = s.wordWrap
            wrapCheck.checked = s.wordWrap
            editor.dispatch({
                effects: wordWrapConf.reconfigure(isWordWrap ? EditorView.lineWrapping : [])
            })
        }
        if (s.fold !== undefined) {
            isFoldEnabled = s.fold
            foldCheck.checked = s.fold
            editor.dispatch({
                effects: foldConf.reconfigure(isFoldEnabled ? foldGutter() : [])
            })
        }
        if (s.autoPush !== undefined) {
            isAutoPush = s.autoPush
            autoPushCheck.checked = s.autoPush
            setTimeout(() => {
                const scroller = document.querySelector(".cm-scroller") as HTMLElement
                if (scroller) scroller.style.paddingBottom = isAutoPush ? "70vh" : "200px"
            }, 100)
        }
    } catch (e) { console.error(e) }
}
