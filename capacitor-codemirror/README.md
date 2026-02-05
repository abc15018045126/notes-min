# capacitor-codemirror

CodeMirror 6 editor for Capacitor

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
