import { EditorView, lineNumbers, highlightActiveLine } from "@codemirror/view"
import { Compartment } from "@codemirror/state"
import { foldGutter } from "@codemirror/language"

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

    constructor(
        editor: EditorView,
        fontSizeConf: Compartment,
        wordWrapConf: Compartment,
        foldConf: Compartment,
        themeConf: Compartment,
        oneDark: any,
        lineNumbersConf: Compartment,
        highlightLineConf: Compartment
    ) {
        this.editor = editor
        this.fontSizeConf = fontSizeConf
        this.wordWrapConf = wordWrapConf
        this.foldConf = foldConf
        this.themeConf = themeConf
        this.oneDark = oneDark
        this.lineNumbersConf = lineNumbersConf
        this.highlightLineConf = highlightLineConf
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

        const lineSlider = document.getElementById("line-height-slider") as HTMLInputElement
        const wrapLineSlider = document.getElementById("wrap-line-height-slider") as HTMLInputElement
        const marginSlider = document.getElementById("margin-slider") as HTMLInputElement
        const jsonArea = document.getElementById("json-settings") as HTMLTextAreaElement

        btnSettingsBack.onclick = () => {
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
        })
        foldCheck.addEventListener("change", () => {
            this.isFoldEnabled = foldCheck.checked
            this.editor.dispatch({
                effects: this.foldConf.reconfigure(this.isFoldEnabled ? foldGutter() : [])
            })
        })

        // New listeners
        lineNumbersCheck.addEventListener("change", () => {
            this.showLineNumbers = lineNumbersCheck.checked
            this.editor.dispatch({
                effects: this.lineNumbersConf.reconfigure(this.showLineNumbers ? lineNumbers() : [])
            })
        })
        highlightLineCheck.addEventListener("change", () => {
            this.showHighlightLine = highlightLineCheck.checked
            this.editor.dispatch({
                effects: this.highlightLineConf.reconfigure(this.showHighlightLine ? highlightActiveLine() : [])
            })
        })
        statusBarCheck.addEventListener("change", () => {
            this.showStatusBar = statusBarCheck.checked
            this.syncUIVisibility()
        })
        symbolBarCheck.addEventListener("change", () => {
            this.showSymbolBar = symbolBarCheck.checked
            this.syncUIVisibility()
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

        jsonArea.addEventListener("input", () => {
            try {
                const data = JSON.parse(jsonArea.value)
                this.updateFromData(data)
            } catch (e) { /* ignore invalid json while typing */ }
        })
    }

    private syncUIVisibility() {
        const statusBar = document.querySelector(".status-bar") as HTMLElement
        const symbolBar = document.getElementById("symbol-bar") as HTMLElement

        if (statusBar) statusBar.style.display = this.showStatusBar ? "flex" : "none"
        if (symbolBar) symbolBar.style.display = this.showSymbolBar ? "flex" : "none"
    }

    private updateFromData(s: any) {
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
            showSymbolBar: this.showSymbolBar
        }
    }

    private saveToStorage() {
        const data = this.getSettingsData()
        localStorage.setItem("editor_settings", JSON.stringify(data))
    }
}
