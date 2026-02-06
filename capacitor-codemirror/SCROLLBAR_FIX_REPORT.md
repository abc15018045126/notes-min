# Technical Report: Solving the "Scroll Jump" Bug on Android Keyboards

## 1. The Problem
When using a custom virtual scrollbar in **CodeMirror 6** on Android:
- **Scenario**: The user opens the virtual keyboard (shrinking the viewport) and tries to drag the scrollbar.
- **Symptom**: The editor violently "jumps" or fights back, resetting the scroll position repeatedly during the drag.
- **Observation**: This *only* happens when the keyboard is open.

## 2. Root Cause Analysis
The issue stems from a conflict between **User Intent** and **Android System Protection**.

### A. Viewport Compression
When the keyboard opens, the visible viewport height is reduced by ~50%.

### B. The "Lost Cursor" Trigger
1.  The user drags the scrollbar, moving the document content.
2.  The active text cursor (selection) moves **out of the visible viewport**.
3.  **The Conflict**: Android's `WebView` (Chromium) detects that an input element has focus but the caret is not visible. To prevent the user from "typing blindly," the browser **automatically and forcibly scrolls** to bring the cursor back into view.
4.  **The Jump**: The user drags down -> Content moves up -> Cursor goes off-screen -> Android forces scroll back to Cursor -> **JUMP**.

## 3. The Solution: Continuous Cursor Sync (The "Ghost Cursor")
To appease the Android system, we must ensure the cursor is **always visible** to the browser, even while the user is scrolling away from the original position.

### Implementation Strategy
We implemented a **Live Sync** mechanism in the `ScrollbarManager`.

1.  **Event Hook**: We intervene in the `touchmove` (drag) and `touchend` events.
2.  **Coordinate Mapping**:
    Instead of using document coordinates (which are unreliable during layouts), we use **Client Coordinates** (`getBoundingClientRect`). We calculate the exact pixel center of the *currently visible* viewport.
    ```typescript
    const rect = view.scrollDOM.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    ```
3.  **Position Resolution**:
    We ask CodeMirror what character is located at that physical pixel point:
    ```typescript
    const pos = view.posAtCoords({ x: centerX, y: centerY }, false);
    ```
4.  **Silent Dispatch**:
    With every frame of the drag, we silently update the cursor selection to that new position **without triggering a scroll**:
    ```typescript
    view.dispatch({
        selection: { anchor: pos, head: pos },
        scrollIntoView: false // Critical!
    });
    ```

## 4. Conclusion
By continuously moving the cursor to the center of the screen as the user drags, we successfully "trick" the Android system. The browser sees that the cursor is always valid and visible, so it never triggers the viewport protection jump. The result is a buttery smooth, industrial-grade scrolling experience, indistinguishable from native apps.
