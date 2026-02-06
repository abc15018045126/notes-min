---
description: Build, sync, and install the application on an Android device
---

# ⚠️ CRITICAL WARNING ⚠️
**If you have modified code in `capacitor-codemirror/editor`, you MUST build the editor assets first!**
Otherwise, your changes will NOT be updated in the Android app. 

## Standard Deployment Steps

1. **Ensure your phone is connected** via USB and USB Debugging is enabled.
2. **Build the Custom Editor (MANDATORY if editor code changed):**
   ```bash
   cd capacitor-codemirror/editor && npx vite build && cd ../..
   ```
3. **Build the Main App & Sync:**
   ```bash
   npm run build && npx cap sync android
   ```
4. **Install and Run:**
// turbo
   ```bash
   cd android && ./gradlew.bat installDebug
   ```

## Shortcut (Project Root)
// turbo
```bash
# This command ONLY builds the main app by default. 
# Make sure you've built the editor above first if needed!
npm run run
```

*Note: The `run` command will ask you to select a device if multiple are connected.*
