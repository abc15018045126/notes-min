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
    private startScrollTop = 0
    private startScrollLeft = 0
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
        const el = this.editor.scrollDOM

        // Update on scroll
        el.addEventListener("scroll", () => {
            if (!this.isDraggingV && !this.isDraggingH) {
                this.update()
            }
        }, { passive: true })

        // Vertical Drag - Industrial Standard Implementation
        this.vThumb.addEventListener('touchstart', (e) => {
            this.isDraggingV = true
            this.startY = e.touches[0].clientY
            this.startScrollTop = el.scrollTop

            this.vScrollbar.classList.add('visible')
            if (this.scrollTimeout) clearTimeout(this.scrollTimeout)

            e.preventDefault()
            e.stopPropagation()
        }, { passive: false })

        // Horizontal Drag
        this.hThumb.addEventListener('touchstart', (e) => {
            this.isDraggingH = true
            this.startX = e.touches[0].clientX
            this.startScrollLeft = el.scrollLeft

            this.hScrollbar.classList.add('visible')
            if (this.scrollTimeout) clearTimeout(this.scrollTimeout)

            e.preventDefault()
            e.stopPropagation()
        }, { passive: false })

        document.addEventListener('touchmove', (e) => {
            if (!this.isDraggingV && !this.isDraggingH) return

            e.preventDefault()
            e.stopPropagation()

            const { scrollHeight, clientHeight, scrollWidth, clientWidth } = el

            if (this.isDraggingV) {
                const deltaY = e.touches[0].clientY - this.startY

                const thumbHeight = Math.max((clientHeight / (scrollHeight || 1)) * clientHeight, 40)
                const availableThumbSpace = clientHeight - thumbHeight
                const availableScrollSpace = scrollHeight - clientHeight

                if (availableThumbSpace > 0) {
                    const scrollDelta = (deltaY / availableThumbSpace) * availableScrollSpace
                    el.scrollTop = this.startScrollTop + scrollDelta

                    // Update thumb position immediately for visual feedback
                    const ratio = el.scrollTop / (availableScrollSpace || 1)
                    this.vThumb.style.transform = `translateY(${ratio * availableThumbSpace}px)`

                    // [CRITICAL FIX] Continuous Cursor Sync
                    // ONLY run this when keyboard is open (viewport is squeezed).
                    // In read-only mode (full screen), we rely on native behavior.
                    const isKeyboardOpen = window.visualViewport && window.visualViewport.height < window.screen.height * 0.75

                    if (isKeyboardOpen) {
                        const view = this.editor
                        const rect = el.getBoundingClientRect()
                        const centerX = rect.left + rect.width / 2
                        const centerY = rect.top + rect.height / 2

                        const pos = view.posAtCoords({ x: centerX, y: centerY }, false)
                        if (pos !== null) {
                            view.dispatch({
                                selection: { anchor: pos, head: pos },
                                scrollIntoView: false
                            })
                        }
                    }
                }
            }

            if (this.isDraggingH) {
                const deltaX = e.touches[0].clientX - this.startX

                const thumbWidth = Math.max((clientWidth / (scrollWidth || 1)) * clientWidth, 40)
                const availableThumbSpace = clientWidth - thumbWidth
                const availableScrollSpace = scrollWidth - clientWidth

                if (availableThumbSpace > 0) {
                    const scrollDelta = (deltaX / availableThumbSpace) * availableScrollSpace
                    el.scrollLeft = this.startScrollLeft + scrollDelta

                    const ratio = el.scrollLeft / (availableScrollSpace || 1)
                    this.hThumb.style.transform = `translateX(${ratio * availableThumbSpace}px)`
                }
            }
        }, { passive: false })

        const endDrag = () => {
            if (this.isDraggingV || this.isDraggingH) {
                this.isDraggingV = false
                this.isDraggingH = false

                // Industrial Focus Guard (Final Sync)
                const isKeyboardOpen = window.visualViewport && window.visualViewport.height < window.screen.height * 0.75

                if (isKeyboardOpen) {
                    // Use robust SCREEN coordinates to find center
                    const view = this.editor
                    const rect = view.scrollDOM.getBoundingClientRect()
                    const centerX = rect.left + rect.width / 2
                    const centerY = rect.top + rect.height / 2

                    const pos = view.posAtCoords({ x: centerX, y: centerY }, false)

                    if (pos !== null) {
                        view.dispatch({
                            selection: { anchor: pos, head: pos },
                            scrollIntoView: false
                        })
                    }
                }

                this.editor.requestMeasure()
                this.hideLater()
            }
        }

        document.addEventListener('touchend', endDrag)
        document.addEventListener('touchcancel', endDrag)
    }

    private hideLater() {
        if (this.scrollTimeout) clearTimeout(this.scrollTimeout)
        this.scrollTimeout = setTimeout(() => {
            if (!this.isDraggingV && !this.isDraggingH) {
                this.vScrollbar.classList.remove("visible")
                this.hScrollbar.classList.remove("visible")
            }
        }, 1500)
    }

    public update() {
        if (this.updatePending) return
        this.updatePending = true

        window.requestAnimationFrame(() => {
            this.updatePending = false
            const el = this.editor.scrollDOM
            if (!el) return

            // Vertical
            const { scrollHeight, clientHeight, scrollTop } = el
            if (scrollHeight <= clientHeight + 1) {
                this.vScrollbar.classList.remove("visible")
            } else {
                const ratio = clientHeight / scrollHeight
                const thumbHeight = Math.max(ratio * clientHeight, 40)
                const availableSpace = clientHeight - thumbHeight
                const scrollRatio = scrollTop / (scrollHeight - clientHeight || 1)

                this.vThumb.style.height = `${thumbHeight}px`
                this.vThumb.style.transform = `translateY(${scrollRatio * availableSpace}px)`
                this.vScrollbar.classList.add("visible")
            }

            // Horizontal
            const { scrollWidth, clientWidth, scrollLeft } = el
            if (this.settings.isWordWrap || scrollWidth <= clientWidth + 1) {
                this.hScrollbar.classList.remove("visible")
            } else {
                const ratio = clientWidth / scrollWidth
                const thumbWidth = Math.max(ratio * clientWidth, 40)
                const availableSpace = clientWidth - thumbWidth
                const scrollRatio = scrollLeft / (scrollWidth - clientWidth || 1)

                this.hThumb.style.width = `${thumbWidth}px`
                this.hThumb.style.transform = `translateX(${scrollRatio * availableSpace}px)`
                this.hScrollbar.classList.add("visible")
            }

            this.hideLater()
        })
    }
}
