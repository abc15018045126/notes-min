package com.notes.plugins.codemirror

import android.annotation.SuppressLint
import android.graphics.Color
import android.os.Build
import android.os.Bundle
import android.util.Log
import android.view.ViewGroup
import android.webkit.JavascriptInterface
import android.webkit.WebSettings
import android.webkit.WebChromeClient
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.FrameLayout
import androidx.appcompat.app.AppCompatActivity
import com.getcapacitor.JSObject
import java.io.File
import java.io.FileInputStream
import java.io.FileOutputStream
import java.io.IOException
import java.nio.charset.StandardCharsets

class CodemirrorActivity : AppCompatActivity() {
    private lateinit var webView: WebView
    private var filePath: String? = null

    companion object {
        private const val TAG = "CodemirrorActivity"
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Set window background to transparent to avoid flicker/layers during keyboard resize

        // Create WebView programmatically
        webView = WebView(this)
        val params = FrameLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.MATCH_PARENT
        )
        webView.layoutParams = params
        setContentView(webView)

        val settings = webView.settings
        settings.javaScriptEnabled = true
        settings.domStorageEnabled = true
        settings.allowFileAccess = true
        settings.allowContentAccess = true

        filePath = intent.getStringExtra("path")
        val theme = intent.getStringExtra("theme")
        val content = readFile(filePath)

        if (theme == "dark") {
            window.decorView.setBackgroundColor(Color.BLACK)
            webView.setBackgroundColor(Color.BLACK)
        } else {
            window.decorView.setBackgroundColor(Color.WHITE)
            webView.setBackgroundColor(Color.WHITE)
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
            WebView.setWebContentsDebuggingEnabled(true)
        }

        webView.addJavascriptInterface(EditorBridge(), "Android")
        webView.overScrollMode = WebView.OVER_SCROLL_NEVER
        webView.webChromeClient = WebChromeClient()

        webView.webViewClient = object : WebViewClient() {
            override fun onPageFinished(view: WebView, url: String) {
                Log.d(TAG, "Page finished loading: $url")

                val escapedContent = escapeJs(content)
                val fileName = File(filePath ?: "").name
                val options = JSObject()
                options.put("theme", theme ?: "dark")
                options.put("filename", fileName)
                options.put("path", filePath)
                options.put("fontSize", intent.getIntExtra("fontSize", 16))
                options.put("showLineNumbers", intent.getBooleanExtra("showLineNumbers", true))
                options.put("languageMode", intent.getStringExtra("language") ?: "Plain Text")

                val script = """
                    if (window.editorBridge) {
                      window.editorBridge.setContent(`${escapedContent}`, '${options}');
                      console.log('Content injected with theme: ${theme}');
                    } else {
                      console.error('window.editorBridge not found');
                    }
                """.trimIndent()
                webView.evaluateJavascript(script, null)
            }
        }

        webView.loadUrl("file:///android_asset/editor/index.html")
    }

    private fun readFile(path: String?): String {
        if (path == null) return ""
        val file = File(path)
        if (!file.exists()) return ""
        return try {
            FileInputStream(file).use { fis ->
                val data = ByteArray(file.length().toInt())
                fis.read(data)
                String(data, StandardCharsets.UTF_8)
            }
        } catch (e: IOException) {
            Log.e(TAG, "Error reading file", e)
            ""
        }
    }

    private fun saveFile(content: String) {
        val path = filePath ?: return
        try {
            FileOutputStream(path).use { fos ->
                fos.write(content.toByteArray(StandardCharsets.UTF_8))
                Log.d(TAG, "File saved: $path")
            }
        } catch (e: IOException) {
            Log.e(TAG, "Error saving file", e)
        }
    }

    private fun escapeJs(str: String?): String {
        if (str == null) return ""
        return str.replace("\\", "\\\\")
            .replace("`", "\\`")
            .replace("$", "\\$")
    }

    inner class EditorBridge {
        @JavascriptInterface
        fun save(content: String) {
            Log.d(TAG, "Native save called")
            saveFile(content)
        }

        @JavascriptInterface
        fun close() {
            Log.d(TAG, "Native close called")
            finish()
        }

        @JavascriptInterface
        fun setBackgroundColor(hexColor: String) {
            runOnUiThread {
                try {
                    webView.setBackgroundColor(Color.parseColor(hexColor))
                } catch (e: Exception) {
                    Log.e(TAG, "Invalid color: $hexColor")
                }
            }
        }

        @JavascriptInterface
        fun rename(newName: String) {
            Log.d(TAG, "Native rename called: $newName")
            val currentFile = File(filePath ?: return)
            val parent = currentFile.parentFile
            val newFile = File(parent, newName)
            
            if (currentFile.renameTo(newFile)) {
                filePath = newFile.absolutePath
                runOnUiThread {
                    val escapedPath = newFile.absolutePath.replace("\\", "\\\\")
                    webView.evaluateJavascript("if(window.editorBridge && window.editorBridge.onRenamed) window.editorBridge.onRenamed('${newFile.name}', '${escapedPath}')", null)
                }
            } else {
                Log.e(TAG, "Failed to rename file from ${currentFile.name} to $newName")
            }
        }

        @JavascriptInterface
        fun log(msg: String) {
            Log.d(TAG, "JS Log: $msg")
        }
    }
}
