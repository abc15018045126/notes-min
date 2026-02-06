import { EditorView } from "@codemirror/view"
import { SettingsManager } from "./settings"

export class ScrollbarManager {
    private editor: EditorView
    private settings: SettingsManager

    private vScrollbar: HTMLElement
    private vThumb: HTMLElement
    private hScrollbar: HTMLElement
    private hThumb: HTMLElement

    private isDraggingV = false
    private isDraggingH = false
    private startY = 0
    private startX = 0
    private startThumbTop = 0
    private startThumbLeft = 0

    private scrollTimeout: any
    private updatePending = false

    constructor(editor: EditorView, settings: SettingsManager) {
        this.editor = editor
        this.settings = settings

        this.vScrollbar = document.getElementById("virtual-scrollbar")!
        this.vThumb = document.getElementById("scrollbar-thumb")!
        this.hScrollbar = document.getElementById("virtual-scrollbar-h")!
        this.hThumb = document.getElementById("scrollbar-thumb-h")!

        this.initListeners()
        this.update()
    }

    private initListeners() {
        const scroller = this.editor.scrollDOM

        // Scroll event from editor
        scroller.addEventListener("scroll", () => this.update(), { passive: true })

        // Vertical Drag
        this.vScrollbar.addEventListener('touchstart', (e) => {
            this.isDraggingV = true
            this.startY = e.touches[0].clientY

            const el = this.editor.scrollDOM
            const clientHeight = el.clientHeight
            const scrollHeight = el.scrollHeight
            const scrollTop = el.scrollTop

            const availableScrollHeight = scrollHeight - clientHeight
            const ratio = clientHeight / scrollHeight
            const thumbHeight = Math.max(ratio * clientHeight, 40)
            const availableThumbSpace = clientHeight - thumbHeight

            this.startThumbTop = (availableScrollHeight > 0)
                ? (scrollTop / availableScrollHeight) * availableThumbSpace
                : 0

            this.vScrollbar.classList.add('visible')
            if (this.scrollTimeout) clearTimeout(this.scrollTimeout)
            e.preventDefault()
            e.stopPropagation()
        }, { passive: false })

        // Horizontal Drag
        this.hScrollbar.addEventListener('touchstart', (e) => {
            this.isDraggingH = true
            this.startX = e.touches[0].clientX

            const el = this.editor.scrollDOM
            const clientWidth = el.clientWidth
            const scrollWidth = el.scrollWidth
            const scrollLeft = el.scrollLeft

            const availableScrollWidth = scrollWidth - clientWidth
            const ratio = clientWidth / scrollWidth
            const thumbWidth = Math.max(ratio * clientWidth, 40)
            const availableThumbSpace = clientWidth - thumbWidth

            this.startThumbLeft = (availableScrollWidth > 0)
                ? (scrollLeft / availableScrollWidth) * availableThumbSpace
                : 0

            this.hScrollbar.classList.add('visible')
            if (this.scrollTimeout) clearTimeout(this.scrollTimeout)
            e.preventDefault()
            e.stopPropagation()
        }, { passive: false })

        // Document level move and end to ensure capture
        document.addEventListener('touchmove', (e) => {
            if (!this.isDraggingV && !this.isDraggingH) return

            e.preventDefault()
            e.stopPropagation()

            if (this.isDraggingV) {
                const deltaY = e.touches[0].clientY - this.startY
                const el = this.editor.scrollDOM
                const scrollHeight = el.scrollHeight
                const clientHeight = el.clientHeight
                const ratio = clientHeight / scrollHeight
                const thumbHeight = Math.max(ratio * clientHeight, 40)
                const availableThumbSpace = clientHeight - thumbHeight

                const newThumbTop = Math.max(0, Math.min(this.startThumbTop + deltaY, availableThumbSpace))
                this.vThumb.style.transform = `translateY(${newThumbTop}px)`

                if (availableThumbSpace > 0) {
                    const scrollRatio = newThumbTop / availableThumbSpace
                    el.scrollTop = scrollRatio * (scrollHeight - clientHeight)
                }
            }

            if (this.isDraggingH) {
                const deltaX = e.touches[0].clientX - this.startX
                const el = this.editor.scrollDOM
                const scrollWidth = el.scrollWidth
                const clientWidth = el.clientWidth
                const ratio = clientWidth / scrollWidth
                const thumbWidth = Math.max(ratio * clientWidth, 40)
                const availableThumbSpace = clientWidth - thumbWidth

                const newThumbLeft = Math.max(0, Math.min(this.startThumbLeft + deltaX, availableThumbSpace))
                this.hThumb.style.transform = `translateX(${newThumbLeft}px)`

                if (availableThumbSpace > 0) {
                    const scrollRatio = newThumbLeft / availableThumbSpace
                    el.scrollLeft = scrollRatio * (scrollWidth - clientWidth)
                }
            }
        }, { passive: false })

        document.addEventListener('touchend', () => {
            if (this.isDraggingV || this.isDraggingH) {
                this.isDraggingV = false
                this.isDraggingH = false
                this.hideAfterDelay()
            }
        })

        document.addEventListener('touchcancel', () => {
            if (this.isDraggingV || this.isDraggingH) {
                this.isDraggingV = false
                this.isDraggingH = false
                this.hideAfterDelay()
            }
        })
    }

    public update() {
        if (this.updatePending) return
        this.updatePending = true

        window.requestAnimationFrame(() => {
            this.updatePending = false
            const el = this.editor.scrollDOM

            // Vertical
            if (!this.isDraggingV) {
                const totalHeight = el.scrollHeight
                const clientHeight = el.clientHeight
                const scrollTop = el.scrollTop

                if (totalHeight <= clientHeight + 1) {
                    this.vScrollbar.classList.remove("visible")
                } else {
                    const ratio = clientHeight / totalHeight
                    const thumbHeight = Math.max(ratio * clientHeight, 40)
                    const availableScrollHeight = totalHeight - clientHeight
                    const availableThumbSpace = clientHeight - thumbHeight

                    const scrollRatio = availableScrollHeight > 0 ? scrollTop / availableScrollHeight : 0
                    const thumbTop = scrollRatio * availableThumbSpace

                    this.vThumb.style.height = `${thumbHeight}px`
                    this.vThumb.style.transform = `translateY(${thumbTop}px)`
                    this.vScrollbar.classList.add("visible")
                }
            }

            // Horizontal
            if (!this.isDraggingH) {
                const totalWidth = el.scrollWidth
                const clientWidth = el.clientWidth
                const scrollLeft = el.scrollLeft

                if (this.settings.isWordWrap || totalWidth <= clientWidth + 1) {
                    this.hScrollbar.classList.remove("visible")
                } else {
                    const ratio = clientWidth / totalWidth
                    const thumbWidth = Math.max(ratio * clientWidth, 40)
                    const availableScrollWidth = totalWidth - clientWidth
                    const availableThumbSpace = clientWidth - thumbWidth

                    const scrollRatio = availableScrollWidth > 0 ? scrollLeft / availableScrollWidth : 0
                    const thumbLeft = scrollRatio * availableThumbSpace

                    this.hThumb.style.width = `${thumbWidth}px`
                    this.hThumb.style.transform = `translateX(${thumbLeft}px)`
                    this.hScrollbar.classList.add("visible")
                }
            }

            this.hideAfterDelay()
        })
    }

    private hideAfterDelay() {
        if (this.scrollTimeout) clearTimeout(this.scrollTimeout)
        this.scrollTimeout = setTimeout(() => {
            if (!this.isDraggingV && !this.isDraggingH) {
                this.vScrollbar.classList.remove("visible")
                this.hScrollbar.classList.remove("visible")
            }
        }, 1500)
    }
}
