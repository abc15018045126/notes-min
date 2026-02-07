import { Extension, RangeSetBuilder } from "@codemirror/state"
import { EditorView, Decoration, DecorationSet, ViewPlugin, ViewUpdate, WidgetType } from "@codemirror/view"

// Zero-width space character
const ZWSP = "\u200b"

class EmptyLineWidget extends WidgetType {
    toDOM() {
        const span = document.createElement("span")
        span.textContent = ZWSP
        span.className = "cm-empty-line-fix"
        // Make it invisible but present for layout
        span.style.opacity = "0"
        span.style.pointerEvents = "none"
        return span
    }

    ignoreEvent() { return true }
}

const emptyLineDeco = Decoration.widget({
    widget: new EmptyLineWidget(),
    side: -1 // Render at the start of the line
})

const emptyLinePlugin = ViewPlugin.fromClass(class {
    decorations: DecorationSet

    constructor(view: EditorView) {
        this.decorations = this.computeDecorations(view)
    }

    update(update: ViewUpdate) {
        if (update.docChanged || update.viewportChanged) {
            this.decorations = this.computeDecorations(update.view)
        }
    }

    computeDecorations(view: EditorView): DecorationSet {
        const builder = new RangeSetBuilder<Decoration>()
        for (let { from, to } of view.visibleRanges) {
            for (let pos = from; pos <= to;) {
                const line = view.state.doc.lineAt(pos)
                // If line is empty, add the invisible widget
                if (line.length === 0) {
                    builder.add(line.from, line.from, emptyLineDeco)
                }
                pos = line.to + 1
            }
        }
        return builder.finish()
    }
}, {
    decorations: v => v.decorations
})

export function emptyLineFix(): Extension {
    return [
        emptyLinePlugin,
        EditorView.theme({
            ".cm-empty-line-fix": {
                display: "inline-block",
                width: "0px"
            }
        })
    ]
}
