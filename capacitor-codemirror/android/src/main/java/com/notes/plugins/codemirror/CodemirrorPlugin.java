package com.notes.plugins.codemirror;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import android.content.Intent;

@CapacitorPlugin(name = "Codemirror")
public class CodemirrorPlugin extends Plugin {

    private Codemirror implementation = new Codemirror();

    @PluginMethod
    public void echo(PluginCall call) {
        String value = call.getString("value");

        JSObject ret = new JSObject();
        ret.put("value", implementation.echo(value));
        call.resolve(ret);
    }

    @PluginMethod
    public void start(PluginCall call) {
        String path = call.getString("path");
        if (path == null) {
            call.reject("Path is required");
            return;
        }

        String title = call.getString("title", "Editor");
        String theme = call.getString("theme", "dark");

        Intent intent = new Intent(getContext(), CodemirrorActivity.class);
        intent.putExtra("path", path);
        intent.putExtra("title", title);
        intent.putExtra("theme", theme);
        
        // We start the activity. Note: if you want to get result back, use startActivityForResult
        getActivity().startActivity(intent);
        
        call.resolve();
    }
}
