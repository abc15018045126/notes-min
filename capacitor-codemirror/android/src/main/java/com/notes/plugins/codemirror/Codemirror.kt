package com.notes.plugins.codemirror

import com.getcapacitor.Logger

class Codemirror {
    fun echo(value: String): String {
        Logger.info("Echo", value)
        return value
    }
}
