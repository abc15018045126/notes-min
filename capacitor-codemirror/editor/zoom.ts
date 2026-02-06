import { EditorView } from "@codemirror/view"
import { SettingsManager } from "./settings"

export class ZoomManager {
    private editor: EditorView
    private settings: SettingsManager

    private isPinching = false
    private startDist = 0
    private startFontSize = 16
    private lastScale = 1
    private ticking = false

    constructor(editor: EditorView, settings: SettingsManager) {
        this.editor = editor
        this.settings = settings
        this.initListeners()
    }

    private initListeners() {
        const dom = this.editor.contentDOM

        dom.addEventListener("touchstart", (e) => {
            if (e.touches.length === 2) {
                this.isPinching = true
                this.startDist = this.getDist(e.touches)
                this.startFontSize = this.settings.currentFontSize
                this.lastScale = 1
            }
        }, { passive: false })

        dom.addEventListener("touchmove", (e) => {
            if (this.isPinching && e.touches.length === 2) {
                e.preventDefault()
                const dist = this.getDist(e.touches)
                this.lastScale = dist / this.startDist

                if (!this.ticking) {
                    window.requestAnimationFrame(() => {
                        this.updatePreview()
                        this.ticking = false
                    })
                    this.ticking = true
                }
            }
        }, { passive: false })

        const endPinch = () => {
            if (!this.isPinching) return
            this.isPinching = false

            // Clear preview transform
            this.editor.scrollDOM.style.transform = ""
            this.editor.scrollDOM.style.transformOrigin = ""

            // Apply new font size
            const newSize = Math.max(8, Math.min(Math.round(this.startFontSize * this.lastScale), 32))
            if (newSize !== this.settings.currentFontSize) {
                this.settings.setFontSize(newSize)
            }
        }

        dom.addEventListener("touchend", endPinch)
        dom.addEventListener("touchcancel", endPinch)
    }

    private getDist(touches: TouchList): number {
        const dx = touches[0].clientX - touches[1].clientX
        const dy = touches[0].clientY - touches[1].clientY
        return Math.sqrt(dx * dx + dy * dy)
    }

    private updatePreview() {
        if (!this.isPinching) return
        // Use transform for smooth visual feedback during pinch
        this.editor.scrollDOM.style.transform = `scale(${this.lastScale})`
        this.editor.scrollDOM.style.transformOrigin = "top left"
    }
}
