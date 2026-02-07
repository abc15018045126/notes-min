# Technical Report: Resolving the Persistent "Gray Haze" on Editor Edges

## 1. The Mystery
Users reported a faint, persistent gray layer on the left side of the editor, even when line numbers were disabled or set to match the background color. Additionally, the settings page appeared inconsistent with the custom theme.

## 2. Root Cause Analysis
After deep debugging, we identified three primary culprits:

### A. Ghost Shadow Overflow (The Primary Culprit)
The **Table of Contents (TOC)** side drawer was designed with a heavy `box-shadow` to provide depth. Even when the drawer was hidden (`translateX(-100%)`), its 50px shadow spread was large enough to "leak" back into the visible viewport. On a pure white or pure black background, this overflow appeared as a vertical gray haze on the left edge.

### B. CodeMirror Gutter Fallbacks
CodeMirror's internal structure has multiple nested layers (Gutters, Fold-Gutters, Gutter-Elements). While the main background was themed, individual sub-elements often fell back to the library's default gray style. Furthermore, the library forcibly adds a 1-pixel `border-right` (separator line) and shadow to the gutter area which remained visible against high-contrast themes.

### C. UI Variable Inconsistency
The application used two distinct variables: `--bg` (main background) and `--surface` (UI panels/items). In the default state, `--surface` was set to a grayish color. Because settings items used surface colors, they created a "layered gray" effect that didn't match the new custom background color.

## 3. Implementation of the "Final Cure"

### Step 1: Shadow Entrapment
We modified the TOC drawer CSS. The `box-shadow` is now strictly conditioned:
- **Inactive State:** `visibility: hidden` and `box-shadow: none`. This ensures the shadow is physically removed from the rendering pipeline when the drawer is closed.
- **Active State:** Only then is the shadow applied, with a reduced spread to keep it clean.

### Step 2: Global Background Unification
We modified the `SettingsManager` and `index.html` to force synchronization:
- `var(--surface)` is now programmatically forced to match `var(--bg)` when a custom theme is applied.
- All setting items were switched to `background: transparent !important`, ensuring they never carry their own "gray" baggage.

### Step 3: High-Priority CSS Overrides
We added a "Nuclear Option" block in the `index.html` head:
- Used `!important` to override CodeMirror’s internal `border-right` and `box-shadow` on all gutter components.
- Forced `.cm-gutters` to use the dynamic `--editor-bg` variable even when hidden/inactive.

## 4. Conclusion
The "Gray Layer" was not a single bug but a combination of **Shadow Overflowing** and **Variable Mismatch**. By isolating the TOC shadow and forcing global transparency on UI items, the editor now achieves a 100% pure color match across all states.
