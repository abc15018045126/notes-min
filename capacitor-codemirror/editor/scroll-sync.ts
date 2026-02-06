import { EditorView } from "@codemirror/view"

export class ScrollSyncManager {
    private editor: EditorView
    private updatePending = false

    constructor(editor: EditorView) {
        this.editor = editor
        this.init()
    }

    private init() {
        // Listen to scroll events (captured from user sliding or momentum)
        this.editor.scrollDOM.addEventListener("scroll", () => {
            this.checkAndSyncCursor()
        }, { passive: true })
    }

    private checkAndSyncCursor() {
        if (this.updatePending) return
        this.updatePending = true

        window.requestAnimationFrame(() => {
            this.updatePending = false
            this.sync()
        })
    }

    private sync() {
        // [CHECK] Only activate when keyboard is likely open (viewport squeezed)
        const isKeyboardOpen = window.visualViewport && window.visualViewport.height < window.screen.height * 0.75
        if (!isKeyboardOpen) return

        const view = this.editor
        const head = view.state.selection.main.head

        // 1. Get visual coordinates of the cursor
        const coords = view.coordsAtPos(head)

        // 2. Get viewport boundaries
        const scrollDOM = view.scrollDOM
        const rect = scrollDOM.getBoundingClientRect()

        // Padding to be safe (Android might panic even if it's barely inside)
        const safeMargin = 20

        let isVisible = false
        if (coords) {
            // Check if cursor is vertically within safety bounds
            isVisible = (
                coords.top >= rect.top + safeMargin &&
                coords.bottom <= rect.bottom - safeMargin
            )
        }

        // 3. If cursor is lost (or about to be), teleport it to center
        if (!isVisible) {
            const centerX = rect.left + rect.width / 2
            const centerY = rect.top + rect.height / 2

            // Find character at the center of the viewport
            const centerPos = view.posAtCoords({ x: centerX, y: centerY }, false)

            if (centerPos !== null) {
                view.dispatch({
                    selection: { anchor: centerPos, head: centerPos },
                    scrollIntoView: false // Crucial: Don't scroll to the new cursor
                })
            }
        }
    }
}
