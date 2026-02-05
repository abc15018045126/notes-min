package com.notes.plugins.codemirror;

import android.annotation.SuppressLint;
import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import android.util.Log;
import android.view.ViewGroup;
import android.webkit.JavascriptInterface;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import androidx.appcompat.app.AppCompatActivity;

import com.getcapacitor.JSObject;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;

public class CodemirrorActivity extends AppCompatActivity {
    private WebView webView;
    private String filePath;
    private static final String TAG = "CodemirrorActivity";

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Create WebView programmatically
        webView = new WebView(this);
        FrameLayout.LayoutParams params = new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
        );
        webView.setLayoutParams(params);
        setContentView(webView);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);

        filePath = getIntent().getStringExtra("path");
        final String title = getIntent().getStringExtra("title");
        final String theme = getIntent().getStringExtra("theme");
        final String content = readFile(filePath);

        if (java.util.Objects.equals(theme, "dark")) {
            webView.setBackgroundColor(android.graphics.Color.BLACK);
        }

        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.KITKAT) {
            WebView.setWebContentsDebuggingEnabled(true);
        }

        webView.addJavascriptInterface(new EditorBridge(), "Android");

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageFinished(WebView view, String url) {
                Log.d(TAG, "Page finished loading: " + url);
                
                // Use a safer injection method
                String escapedContent = escapeJs(content);
                String script = "if (window.editorBridge) { " +
                                "  window.editorBridge.setContent(`" + escapedContent + "`); " +
                                "  console.log('Content injected'); " +
                                "} else { " +
                                "  console.error('window.editorBridge not found'); " +
                                "}";
                webView.evaluateJavascript(script, null);
            }
        });

        webView.loadUrl("file:///android_asset/editor/index.html");
    }

    private String readFile(String path) {
        if (path == null) return "";
        File file = new File(path);
        if (!file.exists()) return "";
        try (FileInputStream fis = new FileInputStream(file)) {
            byte[] data = new byte[(int) file.length()];
            fis.read(data);
            return new String(data, StandardCharsets.UTF_8);
        } catch (IOException e) {
            Log.e(TAG, "Error reading file", e);
            return "";
        }
    }

    private void saveFile(String content) {
        if (filePath == null) return;
        try (FileOutputStream fos = new FileOutputStream(filePath)) {
            fos.write(content.getBytes(StandardCharsets.UTF_8));
            Log.d(TAG, "File saved: " + filePath);
        } catch (IOException e) {
            Log.e(TAG, "Error saving file", e);
        }
    }

    private String escapeJs(String str) {
        if (str == null) return "";
        return str.replace("\\", "\\\\")
                  .replace("`", "\\`")
                  .replace("$", "\\$");
    }

    public class EditorBridge {
        @JavascriptInterface
        public void save(String content) {
            Log.d(TAG, "Native save called");
            saveFile(content);
        }

        @JavascriptInterface
        public void close() {
            Log.d(TAG, "Native close called");
            finish();
        }

        @JavascriptInterface
        public void log(String msg) {
            Log.d(TAG, "JS Log: " + msg);
        }
    }
}
