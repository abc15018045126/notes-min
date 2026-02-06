# capacitor-codemirror

CodeMirror 6 editor for Capacitor.

## Philosophy

This plugin provides a straightforward Capacitor bridge for CodeMirror 6. Our focus is on essential integrations, such as theme management and basic configuration. 

**Upstream First**: The core editing and layout logic are powered entirely by official CodeMirror 6 modules. We deliberately avoid hacking the core editor logic to fix minor upstream quirks (e.g., specific layout issues during scale gestures) and prefer to wait for official patches to maintain a clean and maintainable codebase.

For all core editor features and documentation, refer to the official sites:
- [Official Documentation](https://codemirror.net/docs/)
- [Main Website](https://codemirror.net/)

## Development Strategy & Scope

We strictly follow the official CodeMirror 6 ecosystem. Any new feature added to this plugin must be based on existing official extensions or core capabilities.

### 1. Supported Features (Upstream-Based)
We intend to support features that are natively available via the following official packages:
- **@codemirror/language**: Syntax highlighting and language-specific logic.
- **@codemirror/autocomplete**: Native completion providers.
- **@codemirror/search**: Standard search and replace panels.
- **@codemirror/lint**: Diagnostic and linting integration.
- **@codemirror/commands**: Core command sets (Undo, Redo, etc.).
- **@codemirror/view**: UI components (Gutter, Tooltips, Panels).

### 2. Implementation Policy
- **No Core Hacks**: If a bug or limitation exists within the CodeMirror 6 layout or measurement engine, we do not attempt to patch it locally. We instead track the issue in the official [CodeMirror repository](https://github.com/codemirror/dev/issues).
- **Simplicity First**: Custom logic is only added for the bridge between Capacitor (Native) and Web.
- **Feature Parity**: If a feature is not in the [Official Docs](https://codemirror.net/docs/), it is considered out of scope for this plugin unless it is a vital bridge requirement.

## Install

```bash
npm install capacitor-codemirror
npx cap sync
```

## API

<docgen-index>

* [`echo(...)`](#echo)
* [`start(...)`](#start)

</docgen-index>

<docgen-api>
<!--Update the source file JSDoc comments and rerun docgen to update the docs below-->

### echo(...)

```typescript
echo(options: { value: string; }) => Promise<{ value: string; }>
```

| Param         | Type                            |
| ------------- | ------------------------------- |
| **`options`** | <code>{ value: string; }</code> |

**Returns:** <code>Promise&lt;{ value: string; }&gt;</code>

--------------------


### start(...)

```typescript
start(options: { path: string; title?: string; content?: string; theme?: 'dark' | 'light'; fontSize?: number; autoSave?: boolean; showLineNumbers?: boolean; readOnly?: boolean; language?: string; }) => Promise<void>
```

| Param         | Type                                                                                                                                                                                                 |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`options`** | <code>{ path: string; title?: string; content?: string; theme?: 'dark' \| 'light'; fontSize?: number; autoSave?: boolean; showLineNumbers?: boolean; readOnly?: boolean; language?: string; }</code> |

--------------------

</docgen-api>
