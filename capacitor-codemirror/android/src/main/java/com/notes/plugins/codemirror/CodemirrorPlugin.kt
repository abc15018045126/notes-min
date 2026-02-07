package com.notes.plugins.codemirror

import android.content.Intent
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin

@CapacitorPlugin(name = "Codemirror")
class CodemirrorPlugin : Plugin() {
    private val implementation = Codemirror()

    @PluginMethod
    fun echo(call: PluginCall) {
        val value = call.getString("value")
        val ret = JSObject()
        ret.put("value", implementation.echo(value ?: ""))
        call.resolve(ret)
    }

    @PluginMethod
    fun start(call: PluginCall) {
        val path = call.getString("path")
        if (path == null) {
            call.reject("Path is required")
            return
        }
        val title = call.getString("title", "Editor")
        val theme = call.getString("theme", "dark")
        val fontSize = call.getInt("fontSize", 16)
        val showLineNumbers = call.getBoolean("showLineNumbers", true)
        val autoSave = call.getBoolean("autoSave", true)
        val language = call.getString("language", "Plain Text")

        val intent = Intent(context, CodemirrorActivity::class.java)
        intent.putExtra("path", path)
        intent.putExtra("title", title)
        intent.putExtra("theme", theme)
        intent.putExtra("fontSize", fontSize)
        intent.putExtra("showLineNumbers", showLineNumbers)
        intent.putExtra("autoSave", autoSave)
        intent.putExtra("language", language)

        // We start the activity. Note: if you want to get result back, use startActivityForResult
        activity.startActivity(intent)
        call.resolve()
    }
}
