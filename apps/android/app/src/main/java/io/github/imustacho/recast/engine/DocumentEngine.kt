package io.github.imustacho.recast.engine

import android.content.Context
import android.graphics.Bitmap
import android.graphics.Color
import android.graphics.Matrix
import android.graphics.Paint
import android.graphics.pdf.PdfDocument as AndroidPdfDocument
import android.graphics.pdf.PdfRenderer
import android.os.ParcelFileDescriptor
import com.tom_roush.pdfbox.android.PDFBoxResourceLoader
import com.tom_roush.pdfbox.pdmodel.PDDocument
import com.tom_roush.pdfbox.text.PDFTextStripper
import org.commonmark.parser.Parser
import org.commonmark.renderer.html.HtmlRenderer
import org.jsoup.Jsoup
import java.io.ByteArrayInputStream
import java.io.ByteArrayOutputStream
import java.io.File
import java.io.FileOutputStream
import java.io.InputStream
import java.util.zip.ZipFile

object DocumentEngine {

    private const val MAX_TEXT_BYTES = 32 * 1024 * 1024
    private const val MAX_XML_BYTES = 16 * 1024 * 1024
    private const val MAX_IMAGE_DIMENSION = 4096

    @Volatile
    private var initialized = false

    @Synchronized
    fun init(context: Context) {
        if (!initialized) {
            try {
                PDFBoxResourceLoader.init(context)
                initialized = true
            } catch (failure: Throwable) {
                failure.printStackTrace()
            }
        }
    }

    fun convert(
        inputPath: String,
        outputPath: String,
        sourceFormat: String,
        targetFormat: String
    ): Result<String> {
        return try {
            val src = sourceFormat.lowercase()
            val tgt = targetFormat.lowercase()

            when {
                // PDF to Text
                src == "pdf" && tgt == "txt" -> {
                    pdfToText(inputPath, outputPath)
                }
                // Text to PDF
                src == "txt" && tgt == "pdf" -> {
                    textToPdf(inputPath, outputPath)
                }
                // Markdown to HTML
                src == "md" && tgt == "html" -> {
                    markdownToHtml(inputPath, outputPath)
                }
                // HTML to Text
                src == "html" && tgt == "txt" -> {
                    htmlToText(inputPath, outputPath)
                }
                // Markdown to Text
                src == "md" && tgt == "txt" -> {
                    markdownToText(inputPath, outputPath)
                }
                // Markdown / HTML to PDF
                (src == "md" || src == "html") && tgt == "pdf" -> {
                    formattedTextToPdf(inputPath, outputPath, src)
                }
                // PDF to Images (renders page 1 to PNG)
                src == "pdf" && (tgt == "png" || tgt == "jpg") -> {
                    pdfToImage(inputPath, outputPath, tgt)
                }
                // CSV <-> TSV
                src == "csv" && tgt == "tsv" -> {
                    csvToTsv(inputPath, outputPath, ',', '\t')
                }
                src == "tsv" && tgt == "csv" -> {
                    csvToTsv(inputPath, outputPath, '\t', ',')
                }
                src in listOf("csv", "tsv") && tgt == "txt" -> {
                    File(inputPath).copyTo(File(outputPath), overwrite = true)
                }
                // DOCX to Text
                src == "docx" && tgt == "txt" -> {
                    docxToText(inputPath, outputPath)
                }
                // DOCX to HTML
                src == "docx" && tgt == "html" -> {
                    docxToHtml(inputPath, outputPath)
                }
                // DOCX to PDF
                src == "docx" && tgt == "pdf" -> {
                    docxToPdf(inputPath, outputPath)
                }
                // Image to PDF
                src in listOf("png", "jpg", "jpeg", "webp", "bmp", "gif") && tgt == "pdf" -> {
                    imageToPdf(inputPath, outputPath)
                }
                else -> {
                    // Fallback: if plain text conversion
                    if (tgt == "txt") {
                        val content = readUtf8Limited(File(inputPath))
                        File(outputPath).writeText(content, Charsets.UTF_8)
                    } else {
                        return Result.failure(
                            IllegalArgumentException("Document conversion from $src to $tgt is not supported on Android engine")
                        )
                    }
                }
            }
            Result.success(outputPath)
        } catch (failure: Throwable) {
            Result.failure(failure)
        }
    }

    private fun pdfToText(inputPath: String, outputPath: String) {
        PDDocument.load(File(inputPath)).use { document ->
            val stripper = PDFTextStripper()
            val text = stripper.getText(document).take(MAX_TEXT_BYTES)
            File(outputPath).writeText(text, Charsets.UTF_8)
        }
    }

    private fun textToPdf(inputPath: String, outputPath: String) {
        val text = readUtf8Limited(File(inputPath))
        require(text.length <= 1_000_000) { "PDF için metin çok büyük (en fazla 1 milyon karakter)" }
        // Android's font fallback preserves Turkish and other Unicode characters.
        val paint = android.text.TextPaint(Paint.ANTI_ALIAS_FLAG).apply { textSize = 11f; color = Color.BLACK }
        val layout = android.text.StaticLayout.Builder.obtain(text, 0, text.length, paint, 495)
            .setIncludePad(false).setLineSpacing(4f, 1f).build()
        val pdf = AndroidPdfDocument()
        try {
            var firstLine = 0
            var pageNumber = 1
            while (firstLine < layout.lineCount) {
                require(pageNumber <= 1000) { "PDF 1000 sayfa sınırını aşıyor" }
                val top = layout.getLineTop(firstLine)
                var endLine = firstLine + 1
                while (endLine < layout.lineCount && layout.getLineBottom(endLine) - top <= 742) endLine++
                val page = pdf.startPage(AndroidPdfDocument.PageInfo.Builder(595, 842, pageNumber++).create())
                page.canvas.save()
                page.canvas.clipRect(50f, 50f, 545f, 50f + layout.getLineTop(endLine) - top)
                page.canvas.translate(50f, 50f - top)
                layout.draw(page.canvas)
                page.canvas.restore()
                pdf.finishPage(page)
                firstLine = endLine
            }
            FileOutputStream(outputPath).use { pdf.writeTo(it) }
        } finally {
            pdf.close()
        }
    }

    private fun markdownToHtml(inputPath: String, outputPath: String) {
        val md = readUtf8Limited(File(inputPath))
        val parser = Parser.builder().build()
        val document = parser.parse(md)
        val renderer = HtmlRenderer.builder().build()
        val bodyHtml = renderer.render(document)
        val fullHtml = """
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; padding: 24px; max-width: 800px; margin: 0 auto; color: #1e293b; }
                    pre { background: #f1f5f9; padding: 12px; border-radius: 8px; overflow-x: auto; }
                    code { background: #f1f5f9; padding: 2px 4px; border-radius: 4px; font-family: monospace; }
                    table { border-collapse: collapse; width: 100%; margin: 16px 0; }
                    th, td { border: 1px solid #cbd5e1; padding: 8px 12px; text-align: left; }
                    th { background: #f8fafc; }
                </style>
            </head>
            <body>
            $bodyHtml
            </body>
            </html>
        """.trimIndent()
        File(outputPath).writeText(fullHtml, Charsets.UTF_8)
    }

    private fun htmlToText(inputPath: String, outputPath: String) {
        val html = readUtf8Limited(File(inputPath))
        val doc = Jsoup.parse(html)
        File(outputPath).writeText(doc.text(), Charsets.UTF_8)
    }

    private fun markdownToText(inputPath: String, outputPath: String) {
        val md = readUtf8Limited(File(inputPath))
        val parser = Parser.builder().build()
        val document = parser.parse(md)
        val renderer = HtmlRenderer.builder().build()
        val html = renderer.render(document)
        val text = Jsoup.parse(html).text()
        File(outputPath).writeText(text, Charsets.UTF_8)
    }

    private fun formattedTextToPdf(inputPath: String, outputPath: String, type: String) {
        val raw = readUtf8Limited(File(inputPath))
        val text = if (type == "md") {
            val parser = Parser.builder().build()
            val document = parser.parse(raw)
            val html = HtmlRenderer.builder().build().render(document)
            Jsoup.parse(html).wholeText()
        } else {
            Jsoup.parse(raw).wholeText()
        }
        val tempTxt = File.createTempFile("recast-doc-", ".txt")
        try {
            tempTxt.writeText(text, Charsets.UTF_8)
            textToPdf(tempTxt.absolutePath, outputPath)
        } finally {
            tempTxt.delete()
        }
    }

    private fun pdfToImage(inputPath: String, outputPath: String, format: String) {
        val file = File(inputPath)
        ParcelFileDescriptor.open(file, ParcelFileDescriptor.MODE_READ_ONLY).use { pfd ->
            PdfRenderer(pfd).use { renderer ->
                require(renderer.pageCount > 0) { "PDF sayfa içermiyor" }
                renderer.openPage(0).use { page ->
                    val scale = (MAX_IMAGE_DIMENSION.toFloat() / maxOf(page.width, page.height)).coerceAtMost(1f)
                    val width = (page.width * scale).toInt().coerceAtLeast(1)
                    val height = (page.height * scale).toInt().coerceAtLeast(1)
                    val bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
                    try {
                        bitmap.eraseColor(Color.WHITE)
                        val matrix = Matrix().apply { postScale(scale, scale) }
                        page.render(bitmap, null, matrix, PdfRenderer.Page.RENDER_MODE_FOR_DISPLAY)
                        FileOutputStream(outputPath).use { out ->
                            val compressFormat = if (format == "jpg" || format == "jpeg") {
                                Bitmap.CompressFormat.JPEG
                            } else {
                                Bitmap.CompressFormat.PNG
                            }
                            check(bitmap.compress(compressFormat, 90, out)) { "Görsel çıktısı yazılamadı" }
                        }
                    } finally {
                        bitmap.recycle()
                    }
                }
            }
        }
    }

    private fun imageToPdf(inputPath: String, outputPath: String) {
        val bitmap = ImageEngine.decodeSampledBitmap(inputPath, MAX_IMAGE_DIMENSION)
            ?: throw IllegalArgumentException("Görsel okunamadı: ${File(inputPath).name}")

        try {
            val pdfDoc = AndroidPdfDocument()
            try {
                val pageInfo = AndroidPdfDocument.PageInfo.Builder(bitmap.width, bitmap.height, 1).create()
                val page = pdfDoc.startPage(pageInfo)
                page.canvas.drawBitmap(bitmap, 0f, 0f, null)
                pdfDoc.finishPage(page)
                FileOutputStream(outputPath).use { out -> pdfDoc.writeTo(out) }
            } finally {
                pdfDoc.close()
            }
        } finally {
            bitmap.recycle()
        }
    }

    private fun csvToTsv(inputPath: String, outputPath: String, fromSep: Char, toSep: Char) {
        val input = File(inputPath)
        val output = File(outputPath)
        input.bufferedReader(Charsets.UTF_8).use { reader ->
            output.bufferedWriter(Charsets.UTF_8).use { writer ->
                DelimitedText.convert(reader, writer, fromSep, toSep)
            }
        }
    }

    private fun docxToText(inputPath: String, outputPath: String) {
        val extracted = extractTextFromDocx(inputPath)
        File(outputPath).writeText(extracted, Charsets.UTF_8)
    }

    private fun docxToHtml(inputPath: String, outputPath: String) {
        val text = extractTextFromDocx(inputPath)
        val paragraphs = text.split("\n\n").joinToString("\n") {
            "<p>${escapeHtml(it).replace("\n", "<br/>")}</p>"
        }
        val html = """
            <!DOCTYPE html>
            <html>
            <head><meta charset="utf-8"></head>
            <body>$paragraphs</body>
            </html>
        """.trimIndent()
        File(outputPath).writeText(html, Charsets.UTF_8)
    }

    private fun docxToPdf(inputPath: String, outputPath: String) {
        val text = extractTextFromDocx(inputPath)
        val tempTxt = File.createTempFile("recast-docx-", ".txt")
        try {
            tempTxt.writeText(text, Charsets.UTF_8)
            textToPdf(tempTxt.absolutePath, outputPath)
        } finally {
            tempTxt.delete()
        }
    }

    private fun extractTextFromDocx(inputPath: String): String {
        ZipFile(inputPath).use { zip ->
            val entry = zip.getEntry("word/document.xml")
                ?: throw IllegalArgumentException("Geçerli DOCX belge içeriği bulunamadı")
            require(entry.size < 0 || entry.size <= MAX_XML_BYTES) { "DOCX içeriği güvenli boyut sınırını aşıyor" }
            zip.getInputStream(entry).use { stream ->
                val parser = org.xmlpull.v1.XmlPullParserFactory.newInstance().apply { isNamespaceAware = true }.newPullParser()
                parser.setInput(ByteArrayInputStream(readLimited(stream, MAX_XML_BYTES)), null)
                val sb = StringBuilder()
                var inText = false
                val wordNamespace = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
                val strictNamespace = "http://purl.oclc.org/ooxml/wordprocessingml/main"
                var event = parser.nextToken()
                while (event != org.xmlpull.v1.XmlPullParser.END_DOCUMENT) {
                    require(event != org.xmlpull.v1.XmlPullParser.DOCDECL) { "DOCX içinde DTD desteklenmiyor" }
                    val word = parser.namespace == wordNamespace || parser.namespace == strictNamespace
                    when (event) {
                        org.xmlpull.v1.XmlPullParser.START_TAG -> if (word) when (parser.name) {
                            "t" -> inText = true
                            "tab" -> sb.append('\t')
                            "br", "cr" -> sb.append('\n')
                        }
                        org.xmlpull.v1.XmlPullParser.END_TAG -> if (word) when (parser.name) {
                            "t" -> inText = false
                            "p" -> sb.append('\n')
                        }
                        org.xmlpull.v1.XmlPullParser.TEXT, org.xmlpull.v1.XmlPullParser.CDSECT,
                        org.xmlpull.v1.XmlPullParser.ENTITY_REF -> if (inText) {
                            require(parser.text != null) { "DOCX tanımsız XML varlığı içeriyor" }
                            sb.append(parser.text)
                        }
                    }
                    require(sb.length <= MAX_TEXT_BYTES) { "DOCX metin sınırını aşıyor" }
                    event = parser.nextToken()
                }
                return sb.toString()
            }
        }
    }

    private fun readUtf8Limited(file: File): String {
        require(file.length() <= MAX_TEXT_BYTES) { "Metin dosyası 32 MB sınırını aşıyor" }
        return file.inputStream().use { readLimited(it, MAX_TEXT_BYTES).toString(Charsets.UTF_8) }
    }

    private fun readLimited(input: InputStream, maxBytes: Int): ByteArray {
        val output = ByteArrayOutputStream(minOf(maxBytes, 8192))
        val buffer = ByteArray(DEFAULT_BUFFER_SIZE)
        var total = 0
        while (true) {
            val count = input.read(buffer)
            if (count < 0) break
            total += count
            require(total <= maxBytes) { "Dosya güvenli boyut sınırını aşıyor" }
            output.write(buffer, 0, count)
        }
        return output.toByteArray()
    }

    private fun escapeHtml(value: String): String = value
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace("\"", "&quot;")

}
