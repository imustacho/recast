package io.github.imustacho.recast.engine

import java.io.Reader
import java.io.Writer
import java.io.PushbackReader

/** Streaming CSV/TSV conversion preserving quoted delimiters, quotes and newlines. */
internal object DelimitedText {
    fun convert(input: Reader, output: Writer, from: Char, to: Char) {
        val reader = PushbackReader(input, 1)
        val field = StringBuilder()
        var quoted = false
        var closedQuote = false
        var start = true
        var pending = false
        fun writeField() {
            val text = field.toString()
            if (text.any { it == to || it == '"' || it == '\n' || it == '\r' }) {
                output.write("\"" + text.replace("\"", "\"\"") + "\"")
            } else output.write(text)
            field.setLength(0)
            closedQuote = false
        }
        while (true) {
            val code = reader.read()
            if (code == -1) break
            val c = code.toChar()
            if (start && c == '\uFEFF') { start = false; continue }
            start = false
            pending = true
            if (quoted) {
                if (c == '"') {
                    val next = reader.read()
                    if (next == '"'.code) field.append('"')
                    else { quoted = false; closedQuote = true; if (next != -1) reader.unread(next) }
                } else field.append(c)
            } else when {
                c == from -> { writeField(); output.write(to.code) }
                c == '\r' || c == '\n' -> {
                    writeField(); output.write("\n"); pending = false
                    if (c == '\r') { val next = reader.read(); if (next != -1 && next != '\n'.code) reader.unread(next) }
                }
                c == '"' && field.isEmpty() && !closedQuote -> quoted = true
                else -> {
                    require(!closedQuote && c != '"') { "Geçersiz CSV/TSV tırnak kullanımı" }
                    field.append(c)
                }
            }
            require(field.length <= 1024 * 1024) { "Tablo hücresi 1 MB sınırını aşıyor" }
        }
        require(!quoted) { "CSV/TSV içinde kapanmamış tırnak var" }
        if (pending) writeField()
    }
}
