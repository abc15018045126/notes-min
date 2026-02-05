package com.notes.plugins.codemirror;

import com.getcapacitor.Logger;

public class Codemirror {

    public String echo(String value) {
        Logger.info("Echo", value);
        return value;
    }
}
