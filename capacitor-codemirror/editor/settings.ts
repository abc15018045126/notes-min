import { EditorView, keymap, lineNumbers, highlightActiveLine, highlightSpecialChars, drawSelection, dropCursor, rectangularSelection, crosshairCursor, highlightActiveLineGutter } from "@codemirror/view"
import { Compartment } from "@codemirror/state"
import { foldGutter } from "@codemirror/language"

declare global {
    interface Window {
        editorBridge: any,
        Android: any
    }
}
import { markdown } from "@codemirror/lang-markdown"
import { languages } from "@codemirror/language-data"

export class SettingsManager {
    private editor: EditorView
    private fontSizeConf: Compartment
    private wordWrapConf: Compartment
    private foldConf: Compartment
    private themeConf: Compartment
    private oneDark: any

    // New CM compartments
    private lineNumbersConf: Compartment
    private highlightLineConf: Compartment
    private customThemeConf: Compartment
    private languageConf: Compartment

    public currentFontSize = 16
    public isWordWrap = true
    public isFoldEnabled = true
    public isDarkTheme = true

    // New spacing settings
    public lineHeight = 1.5
    public wrapLineHeight = 1.2
    public sideMargin = 16

    // New UI Visibility settings
    public showLineNumbers = true
    public showHighlightLine = true
    public showStatusBar = true
    public showSymbolBar = true
    public languageMode = "Plain Text"
    public isAutoSave = true
    public isKeyboardAvoidance = true
    public keyboardAvoidanceLines = 2

    // Custom Theme Logic
    public customThemeStyle: any = {}

    // Theme Colors
    public editorBgColor = "#0d1117"
    public editorTextColor = "#c9d1d9"
    public uiBgColor = "#0d1117"
    public activeLineColor = "#21262d"
    public scrollbarColor = "#9b9b9b"
    public gutterTextColor = "#8b949e"

    constructor(
        editor: EditorView,
        fontSizeConf: Compartment,
        wordWrapConf: Compartment,
        foldConf: Compartment,
        themeConf: Compartment,
        oneDark: any,
        lineNumbersConf: Compartment,
        highlightLineConf: Compartment,
        customThemeConf: Compartment,
        languageConf: Compartment
    ) {
        this.editor = editor
        this.fontSizeConf = fontSizeConf
        this.wordWrapConf = wordWrapConf
        this.foldConf = foldConf
        this.themeConf = themeConf
        this.oneDark = oneDark
        this.lineNumbersConf = lineNumbersConf
        this.highlightLineConf = highlightLineConf
        this.customThemeConf = customThemeConf
        this.languageConf = languageConf
        this.initListeners()
    }

    private initListeners() {
        const settingsPage = document.getElementById("settings-page")!
        const btnSettingsBack = document.getElementById("btn-settings-back")!
        const fontSlider = document.getElementById("font-slider") as HTMLInputElement
        const wrapCheck = document.getElementById("wrap-check") as HTMLInputElement
        const foldCheck = document.getElementById("fold-check") as HTMLInputElement

        // New UI checks
        const lineNumbersCheck = document.getElementById("line-numbers-check") as HTMLInputElement
        const highlightLineCheck = document.getElementById("highlight-line-check") as HTMLInputElement
        const statusBarCheck = document.getElementById("status-bar-check") as HTMLInputElement
        const symbolBarCheck = document.getElementById("symbol-bar-check") as HTMLInputElement
        const autoSaveCheck = document.getElementById("auto-save-check") as HTMLInputElement
        const languageSelect = document.getElementById("language-select") as HTMLSelectElement

        const lineSlider = document.getElementById("line-height-slider") as HTMLInputElement
        const wrapLineSlider = document.getElementById("wrap-line-height-slider") as HTMLInputElement
        const marginSlider = document.getElementById("margin-slider") as HTMLInputElement
        const jsonArea = document.getElementById("json-settings") as HTMLTextAreaElement
        const themeJsonArea = document.getElementById("theme-json-settings") as HTMLTextAreaElement

        // Populate Theme JSON on Init
        if (themeJsonArea) {
            themeJsonArea.value = JSON.stringify(this.customThemeStyle, null, 4)
        }

        btnSettingsBack.onclick = () => {
            // Lazy Update: Apply JSON changes only on Exit
            try {
                const data = JSON.parse(jsonArea.value)
                this.updateFromData(data)
            } catch (e) { /* ignore */ }

            if (themeJsonArea) {
                try {
                    const style = JSON.parse(themeJsonArea.value)
                    this.customThemeStyle = style
                    this.applyCustomTheme()
                } catch (e) { /* ignore */ }
            }

            // Sync final state to storage
            settingsPage.classList.remove("active")
            this.saveToStorage()
        }

        fontSlider.addEventListener("input", () => this.setFontSize(parseInt(fontSlider.value)))
        wrapCheck.addEventListener("change", () => {
            this.isWordWrap = wrapCheck.checked
            this.editor.dispatch({
                effects: this.wordWrapConf.reconfigure(this.isWordWrap ? EditorView.lineWrapping : [])
            })
            this.syncWordWrapUI()
            this.updateJsonArea()
        })
        foldCheck.addEventListener("change", () => {
            this.isFoldEnabled = foldCheck.checked
            this.editor.dispatch({
                effects: this.foldConf.reconfigure(this.isFoldEnabled ? foldGutter() : [])
            })
            this.updateJsonArea()
        })

        // New listeners
        lineNumbersCheck.addEventListener("change", () => {
            this.showLineNumbers = lineNumbersCheck.checked
            this.editor.dispatch({
                effects: this.lineNumbersConf.reconfigure(this.showLineNumbers ? lineNumbers() : [])
            })
            this.updateJsonArea()
        })
        highlightLineCheck.addEventListener("change", () => {
            this.showHighlightLine = highlightLineCheck.checked
            this.editor.dispatch({
                effects: this.highlightLineConf.reconfigure(this.showHighlightLine ? highlightActiveLine() : [])
            })
            this.updateJsonArea()
        })
        statusBarCheck.addEventListener("change", () => {
            this.showStatusBar = statusBarCheck.checked
            this.syncUIVisibility()
            this.updateJsonArea()
        })
        symbolBarCheck.addEventListener("change", () => {
            this.showSymbolBar = symbolBarCheck.checked
            this.syncUIVisibility()
            this.updateJsonArea()
        })
        autoSaveCheck.addEventListener("change", () => {
            this.isAutoSave = autoSaveCheck.checked
            this.updateJsonArea()
        })

        const keyboardAvoidCheck = document.getElementById("keyboard-avoid-check") as HTMLInputElement
        const keyboardAvoidLines = document.getElementById("keyboard-avoid-lines") as HTMLInputElement

        keyboardAvoidCheck.addEventListener("change", () => {
            this.isKeyboardAvoidance = keyboardAvoidCheck.checked
            this.updateJsonArea()
        })
        keyboardAvoidLines.addEventListener("change", () => {
            this.keyboardAvoidanceLines = parseInt(keyboardAvoidLines.value)
            this.updateJsonArea()
        })

        // Listen to visual viewport resize (keyboard open/close)
        if (window.visualViewport) {
            window.visualViewport.addEventListener("resize", () => {
                if (this.isKeyboardAvoidance && this.editor.hasFocus) {
                    const view = this.editor
                    // Calculate pixels to push
                    const lineHeightPx = this.currentFontSize * this.lineHeight
                    const pushPx = this.keyboardAvoidanceLines * lineHeightPx

                    // Delay slightly to allow layout to settle
                    setTimeout(() => {
                        const head = view.state.selection.main.head
                        view.dispatch({
                            effects: EditorView.scrollIntoView(head, { y: "nearest", yMargin: pushPx }),
                            userEvent: "scroll.jump"
                        })
                    }, 100)
                }
            })
        }

        languageSelect.addEventListener("change", () => {
            this.setLanguage(languageSelect.value)
            this.updateJsonArea()
        })

        lineSlider.addEventListener("input", () => {
            this.lineHeight = parseFloat(lineSlider.value)
            this.applySpacing()
        })
        wrapLineSlider.addEventListener("input", () => {
            this.wrapLineHeight = parseFloat(wrapLineSlider.value)
            this.applySpacing()
        })
        marginSlider.addEventListener("input", () => {
            this.sideMargin = parseInt(marginSlider.value)
            this.applySpacing()
        })

        this.applySpacing()



        // Unified Color Strips Logic
        const colorCircles = document.querySelectorAll(".color-circle")
        colorCircles.forEach(circle => {
            circle.addEventListener("click", (e) => {
                const target = e.currentTarget as HTMLElement
                const color = target.getAttribute("data-color")!
                const parentId = target.parentElement!.getAttribute("data-id")!

                if (parentId === "editor-bg-color") this.editorBgColor = color
                else if (parentId === "editor-text-color") this.editorTextColor = color
                else if (parentId === "ui-bg-color") this.uiBgColor = color
                else if (parentId === "active-line-color") this.activeLineColor = color
                else if (parentId === "scrollbar-color") this.scrollbarColor = color
                else if (parentId === "gutter-text-color") this.gutterTextColor = color

                this.syncColorPickers()
                this.applyCustomTheme()
                this.updateJsonArea()
            })
        })
    }

    private syncUIVisibility() {
        const statusBar = document.querySelector(".status-bar") as HTMLElement
        const symbolBar = document.getElementById("symbol-bar") as HTMLElement

        if (statusBar) statusBar.style.display = this.showStatusBar ? "flex" : "none"
        if (symbolBar) symbolBar.style.display = this.showSymbolBar ? "flex" : "none"
    }

    public updateFromData(s: any) {
        if (s.fontSize) this.setFontSize(s.fontSize)
        if (s.lineHeight) {
            this.lineHeight = s.lineHeight
            const slider = document.getElementById("line-height-slider") as HTMLInputElement
            if (slider) slider.value = s.lineHeight.toString()
        }
        if (s.wrapLineHeight) {
            this.wrapLineHeight = s.wrapLineHeight
            const slider = document.getElementById("wrap-line-height-slider") as HTMLInputElement
            if (slider) slider.value = s.wrapLineHeight.toString()
        }
        if (s.sideMargin !== undefined) {
            this.sideMargin = s.sideMargin
            const slider = document.getElementById("margin-slider") as HTMLInputElement
            if (slider) slider.value = s.sideMargin.toString()
        }
        if (s.wordWrap !== undefined) {
            this.isWordWrap = s.wordWrap
            const check = document.getElementById("wrap-check") as HTMLInputElement
            if (check) check.checked = s.wordWrap
            this.editor.dispatch({ effects: this.wordWrapConf.reconfigure(this.isWordWrap ? EditorView.lineWrapping : []) })
            this.syncWordWrapUI()
        }

        // New settings data sync
        if (s.showLineNumbers !== undefined) {
            this.showLineNumbers = s.showLineNumbers
            const check = document.getElementById("line-numbers-check") as HTMLInputElement
            if (check) check.checked = s.showLineNumbers
            this.editor.dispatch({ effects: this.lineNumbersConf.reconfigure(this.showLineNumbers ? lineNumbers() : []) })
        }
        if (s.showHighlightLine !== undefined) {
            this.showHighlightLine = s.showHighlightLine
            const check = document.getElementById("highlight-line-check") as HTMLInputElement
            if (check) check.checked = s.showHighlightLine
            this.editor.dispatch({ effects: this.highlightLineConf.reconfigure(this.showHighlightLine ? highlightActiveLine() : []) })
        }
        if (s.showStatusBar !== undefined) {
            this.showStatusBar = s.showStatusBar
            const check = document.getElementById("status-bar-check") as HTMLInputElement
            if (check) check.checked = s.showStatusBar
        }
        if (s.showSymbolBar !== undefined) {
            this.showSymbolBar = s.showSymbolBar
            const check = document.getElementById("symbol-bar-check") as HTMLInputElement
            if (check) check.checked = s.showSymbolBar
        }
        if (s.languageMode) {
            this.setLanguage(s.languageMode)
        }
        if (s.autoSave !== undefined) {
            this.isAutoSave = s.autoSave
            const check = document.getElementById("auto-save-check") as HTMLInputElement
            if (check) check.checked = s.autoSave
        }
        if (s.isKeyboardAvoidance !== undefined) {
            this.isKeyboardAvoidance = s.isKeyboardAvoidance
            const check = document.getElementById("keyboard-avoid-check") as HTMLInputElement
            if (check) check.checked = s.isKeyboardAvoidance
        }
        if (s.keyboardAvoidanceLines !== undefined) {
            this.keyboardAvoidanceLines = s.keyboardAvoidanceLines
            const input = document.getElementById("keyboard-avoid-lines") as HTMLInputElement
            if (input) input.value = s.keyboardAvoidanceLines.toString()
        }

        // Custom Theme Sync
        if (s.customThemeStyle) {
            this.customThemeStyle = s.customThemeStyle
            const tArea = document.getElementById("theme-json-settings") as HTMLTextAreaElement
            if (tArea) tArea.value = JSON.stringify(this.customThemeStyle, null, 4)
        }

        if (s.editorBgColor) this.editorBgColor = s.editorBgColor
        if (s.editorTextColor) this.editorTextColor = s.editorTextColor
        if (s.uiBgColor) this.uiBgColor = s.uiBgColor
        if (s.activeLineColor) this.activeLineColor = s.activeLineColor
        if (s.scrollbarColor) this.scrollbarColor = s.scrollbarColor
        if (s.gutterTextColor) this.gutterTextColor = s.gutterTextColor

        this.syncColorPickers()
        this.applyCustomTheme()

        this.syncUIVisibility()
        this.applySpacing()
        this.updateJsonArea()
    }

    private syncWordWrapUI() {
        const scroller = this.editor.scrollDOM
        if (scroller) scroller.setAttribute("data-word-wrap", this.isWordWrap.toString())
    }

    public setFontSize(size: number) {
        this.currentFontSize = Math.max(8, Math.min(size, 32))
        const fontSlider = document.getElementById("font-slider") as HTMLInputElement
        const fontVal = document.getElementById("font-val")!
        if (fontSlider) fontSlider.value = this.currentFontSize.toString()
        if (fontVal) fontVal.textContent = this.currentFontSize + "px"
        this.applySpacing()
    }

    private syncColorPickers() {
        const strips = document.querySelectorAll(".color-strip")
        strips.forEach(strip => {
            const id = strip.getAttribute("data-id")
            let currentColor = ""
            if (id === "editor-bg-color") currentColor = this.editorBgColor
            else if (id === "editor-text-color") currentColor = this.editorTextColor
            else if (id === "ui-bg-color") currentColor = this.uiBgColor
            else if (id === "active-line-color") currentColor = this.activeLineColor
            else if (id === "scrollbar-color") currentColor = this.scrollbarColor
            else if (id === "gutter-text-color") currentColor = this.gutterTextColor

            const circles = strip.querySelectorAll(".color-circle")
            circles.forEach(circle => {
                const circleColor = circle.getAttribute("data-color")!
                circle.classList.toggle("active", circleColor.toUpperCase() === currentColor.toUpperCase())
            })
        })
    }

    public getCustomTheme() {
        const isDark = !this.isColorLight(this.editorBgColor)
        // Build the custom theme object for CodeMirror
        const combinedTheme = {
            ...this.customThemeStyle,
            "&": {
                backgroundColor: this.editorBgColor,
                color: this.editorTextColor,
                ...(this.customThemeStyle["&"] || {})
            },
            "&.cm-focused": {
                outline: "none",
                ...(this.customThemeStyle["&.cm-focused"] || {})
            },
            ".cm-scroller": {
                backgroundColor: this.editorBgColor,
                ...(this.customThemeStyle[".cm-scroller"] || {})
            },
            ".cm-content": {
                color: this.editorTextColor,
                caretColor: this.editorTextColor,
                backgroundColor: this.editorBgColor, // Reinforce
                ...(this.customThemeStyle[".cm-content"] || {})
            },
            ".cm-gutters": {
                backgroundColor: this.editorBgColor,
                color: this.gutterTextColor,
                border: "none !important",
                borderRight: "none !important",
                boxShadow: "none !important",
                ...(this.customThemeStyle[".cm-gutters"] || {})
            },
            ".cm-gutter": {
                backgroundColor: this.editorBgColor,
                borderRight: "none !important",
                boxShadow: "none !important",
                ...(this.customThemeStyle[".cm-gutter"] || {})
            },
            ".cm-lineNumbers .cm-gutterElement": {
                backgroundColor: this.editorBgColor,
                color: "inherit",
                ...(this.customThemeStyle[".cm-lineNumbers .cm-gutterElement"] || {})
            },
            ".cm-gutterElement": {
                backgroundColor: this.editorBgColor, // Lock background
                ...(this.customThemeStyle[".cm-gutterElement"] || {})
            },
            ".cm-foldGutter": {
                backgroundColor: "transparent",
                color: this.gutterTextColor,
                ...(this.customThemeStyle[".cm-foldGutter"] || {})
            },
            ".cm-foldGutter .cm-gutterElement": {
                color: this.gutterTextColor + " !important",
                ...(this.customThemeStyle[".cm-foldGutter .cm-gutterElement"] || {})
            },
            ".cm-activeLine": {
                backgroundColor: this.activeLineColor,
                ...(this.customThemeStyle[".cm-activeLine"] || {})
            },
            ".cm-activeLineGutter": {
                backgroundColor: this.activeLineColor,
                color: this.editorTextColor,
                border: "none !important",
                ...(this.customThemeStyle[".cm-activeLineGutter"] || {})
            },
            // Fix for potential dark separator line
            ".cm-line": {
                border: "none !important",
                ...(this.customThemeStyle[".cm-line"] || {})
            },
            // Search & Panels
            ".cm-panels": {
                backgroundColor: this.editorBgColor,
                color: this.editorTextColor,
                borderTop: "1px solid var(--border)",
                ...(this.customThemeStyle[".cm-panels"] || {})
            },
            ".cm-search": {
                backgroundColor: this.editorBgColor,
                color: this.editorTextColor,
                ...(this.customThemeStyle[".cm-search"] || {})
            },
            ".cm-search input": {
                backgroundColor: "rgba(0,0,0,0.1)",
                color: "inherit",
                border: "1px solid var(--border)",
                borderRadius: "4px",
                padding: "2px 6px",
                outline: "none",
                ...(this.customThemeStyle[".cm-search input"] || {})
            },
            ".cm-search button": {
                backgroundColor: "rgba(0,0,0,0.05)",
                color: "inherit",
                border: "1px solid var(--border)",
                borderRadius: "4px",
                cursor: "pointer",
                padding: "2px 8px",
                ...(this.customThemeStyle[".cm-search button"] || {})
            },
            // Tooltips & Autocomplete
            ".cm-tooltip": {
                backgroundColor: this.editorBgColor,
                color: this.editorTextColor,
                border: "1px solid var(--border)",
                boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
                ...(this.customThemeStyle[".cm-tooltip"] || {})
            },
            ".cm-tooltip-autocomplete": {
                "& > ul > li[aria-selected]": {
                    backgroundColor: "var(--primary)",
                    color: "white"
                }
            }
        }
        return EditorView.theme(combinedTheme, { dark: isDark })
    }

    private applyCustomTheme() {
        try {
            // Update UI Colors via CSS Variables
            document.documentElement.style.setProperty('--bg', this.uiBgColor)
            document.documentElement.style.setProperty('--surface', this.uiBgColor) // Match exactly to remove gray
            document.documentElement.style.setProperty('--editor-bg', this.editorBgColor)
            document.documentElement.style.setProperty('--active-line-color', this.activeLineColor)
            document.documentElement.style.setProperty('--thumb-color', this.scrollbarColor)

            // System Level: Update Meta Theme Color for Navigation/Status bars
            const meta = document.getElementById('meta-theme-color')
            if (meta) meta.setAttribute('content', this.uiBgColor)

            // Sync with Native Layer (Android) to prevent gray flashes during keyboard/resize
            if (window.Android && typeof window.Android.setBackgroundColor === 'function') {
                window.Android.setBackgroundColor(this.uiBgColor)
            }

            // Adjust border color slightly to be visible but not black on white
            const isLightUI = this.isColorLight(this.uiBgColor)
            document.documentElement.style.setProperty('--border', isLightUI ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)')
            document.documentElement.style.setProperty('--accent', isLightUI ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)')
            document.documentElement.style.setProperty('--text', isLightUI ? '#1a1a1a' : '#c9d1d9')
            document.documentElement.style.setProperty('--text-dim', isLightUI ? '#666' : '#8b949e')

            this.editor.dispatch({
                effects: this.customThemeConf.reconfigure(this.getCustomTheme())
            })
            this.updateJsonArea()
        } catch (e) { console.error("Invalid Theme JSON", e) }
    }

    private isColorLight(color: string) {
        const hex = color.replace('#', '')
        const r = parseInt(hex.substr(0, 2), 16)
        const g = parseInt(hex.substr(2, 2), 16)
        const b = parseInt(hex.substr(4, 2), 16)
        const brightness = (r * 299 + g * 587 + b * 114) / 1000
        return brightness > 155
    }
    private applySpacing() {
        const fontVal = document.getElementById("font-val")!
        const lineVal = document.getElementById("line-height-val")!
        const wrapVal = document.getElementById("wrap-line-height-val")!
        const marginVal = document.getElementById("margin-val")!

        if (fontVal) fontVal.textContent = this.currentFontSize + "px"
        if (lineVal) lineVal.textContent = this.lineHeight.toFixed(1)
        if (wrapVal) wrapVal.textContent = this.wrapLineHeight.toFixed(1)
        if (marginVal) marginVal.textContent = this.sideMargin + "px"

        this.editor.dispatch({
            effects: this.fontSizeConf.reconfigure(EditorView.theme({
                ".cm-content, .cm-gutters": { fontSize: this.currentFontSize + "px" },
                ".cm-line": {
                    lineHeight: this.lineHeight,
                    paddingLeft: this.sideMargin + "px",
                    paddingRight: this.sideMargin + "px"
                },
                ".cm-content": {
                    lineHeight: this.lineHeight
                },
                ".cm-lineWrapping .cm-line": {
                    lineHeight: this.wrapLineHeight
                }
            }))
        })
        this.updateJsonArea()
    }

    public setTheme(isDark: boolean) {
        this.isDarkTheme = isDark
        this.editor.dispatch({
            effects: this.themeConf.reconfigure(this.isDarkTheme ? this.oneDark : [])
        })
    }

    public loadSettings() {
        const saved = localStorage.getItem("editor_settings")
        if (saved) {
            try {
                this.updateFromData(JSON.parse(saved))
                const s = JSON.parse(saved)
                if (s.fold !== undefined) {
                    this.isFoldEnabled = s.fold
                    const foldCheck = document.getElementById("fold-check") as HTMLInputElement
                    if (foldCheck) foldCheck.checked = s.fold
                    this.editor.dispatch({ effects: this.foldConf.reconfigure(this.isFoldEnabled ? foldGutter() : []) })
                }
            } catch (e) { console.error(e) }
        }
        this.syncWordWrapUI()
    }

    private updateJsonArea() {
        const jsonArea = document.getElementById("json-settings") as HTMLTextAreaElement
        if (jsonArea && document.activeElement !== jsonArea) {
            const data = this.getSettingsData()
            jsonArea.value = JSON.stringify(data, null, 4)
        }
    }

    private getSettingsData() {
        return {
            fontSize: this.currentFontSize,
            lineHeight: this.lineHeight,
            wrapLineHeight: this.wrapLineHeight,
            sideMargin: this.sideMargin,
            wordWrap: this.isWordWrap,
            fold: this.isFoldEnabled,
            showLineNumbers: this.showLineNumbers,
            showHighlightLine: this.showHighlightLine,
            showStatusBar: this.showStatusBar,
            showSymbolBar: this.showSymbolBar,
            autoSave: this.isAutoSave,
            isKeyboardAvoidance: this.isKeyboardAvoidance,
            keyboardAvoidanceLines: this.keyboardAvoidanceLines,
            languageMode: this.languageMode,
            customThemeStyle: this.customThemeStyle,
            editorBgColor: this.editorBgColor,
            editorTextColor: this.editorTextColor,
            uiBgColor: this.uiBgColor,
            activeLineColor: this.activeLineColor,
            scrollbarColor: this.scrollbarColor,
            gutterTextColor: this.gutterTextColor
        }
    }

    private saveToStorage() {
        const data = this.getSettingsData()
        localStorage.setItem("editor_settings", JSON.stringify(data))
    }

    public setLanguage(mode: string) {
        this.languageMode = mode
        const select = document.getElementById("language-select") as HTMLSelectElement
        if (select) select.value = mode

        let extension: any[] = []
        if (mode === "Markdown") {
            extension = [markdown({ codeLanguages: languages })]
        }

        this.editor.dispatch({
            effects: this.languageConf.reconfigure(extension)
        })
    }
}
