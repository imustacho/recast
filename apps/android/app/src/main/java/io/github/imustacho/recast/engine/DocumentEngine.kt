package io.github.imustacho.recast.engine

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Color
import android.graphics.Paint
import android.graphics.pdf.PdfDocument as AndroidPdfDocument
import android.graphics.pdf.PdfRenderer
import android.os.ParcelFileDescriptor
import com.tom_roush.pdfbox.android.PDFBoxResourceLoader
import com.tom_roush.pdfbox.pdmodel.PDDocument
import com.tom_roush.pdfbox.pdmodel.PDPage
import com.tom_roush.pdfbox.pdmodel.PDPageContentStream
import com.tom_roush.pdfbox.pdmodel.common.PDRectangle
import com.tom_roush.pdfbox.pdmodel.font.PDType1Font
import com.tom_roush.pdfbox.text.PDFTextStripper
import org.commonmark.parser.Parser
import org.commonmark.renderer.html.HtmlRenderer
import org.jsoup.Jsoup
import java.io.File
import java.io.FileOutputStream
import java.util.zip.ZipFile
import javax.xml.parsers.DocumentBuilderFactory

object DocumentEngine {

    private var initialized = false

    fun init(context: Context) {
        if (!initialized) {
            try {
                PDFBoxResourceLoader.init(context)
                initialized = true
            } catch (e: Exception) {
                e.printStackTrace()
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
                src in listOf("png", "jpg", "jpeg", "webp") && tgt == "pdf" -> {
                    imageToPdf(inputPath, outputPath)
                }
                else -> {
                    // Fallback: if plain text conversion
                    if (tgt == "txt") {
                        val content = File(inputPath).readText(Charsets.UTF_8)
                        File(outputPath).writeText(content, Charsets.UTF_8)
                    } else {
                        return Result.failure(
                            IllegalArgumentException("Document conversion from $src to $tgt is not supported on Android engine")
                        )
                    }
                }
            }
            Result.success(outputPath)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    private fun pdfToText(inputPath: String, outputPath: String) {
        PDDocument.load(File(inputPath)).use { document ->
            val stripper = PDFTextStripper()
            val text = stripper.getText(document)
            File(outputPath).writeText(text, Charsets.UTF_8)
        }
    }

    private fun textToPdf(inputPath: String, outputPath: String) {
        val text = File(inputPath).readText(Charsets.UTF_8)
        val lines = text.lines()

        PDDocument().use { document ->
            val font = PDType1Font.HELVETICA
            val fontSize = 11f
            val leading = 15f
            val margin = 50f
            val width = PDRectangle.A4.width - 2 * margin
            val startY = PDRectangle.A4.height - margin

            var page = PDPage(PDRectangle.A4)
            document.addPage(page)
            var contentStream = PDPageContentStream(document, page)
            contentStream.beginText()
            contentStream.setFont(font, fontSize)
            contentStream.newLineAtOffset(margin, startY)

            var currentY = startY

            for (rawLine in lines) {
                val wrapped = wrapText(rawLine, font, fontSize, width)
                for (line in wrapped) {
                    if (currentY <= margin) {
                        contentStream.endText()
                        contentStream.close()

                        page = PDPage(PDRectangle.A4)
                        document.addPage(page)
                        contentStream = PDPageContentStream(document, page)
                        contentStream.beginText()
                        contentStream.setFont(font, fontSize)
                        contentStream.newLineAtOffset(margin, startY)
                        currentY = startY
                    }
                    val safeLine = sanitizeText(line)
                    contentStream.showText(safeLine)
                    contentStream.newLineAtOffset(0f, -leading)
                    currentY -= leading
                }
            }

            contentStream.endText()
            contentStream.close()
            document.save(outputPath)
        }
    }

    private fun markdownToHtml(inputPath: String, outputPath: String) {
        val md = File(inputPath).readText(Charsets.UTF_8)
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
        val html = File(inputPath).readText(Charsets.UTF_8)
        val doc = Jsoup.parse(html)
        File(outputPath).writeText(doc.text(), Charsets.UTF_8)
    }

    private fun markdownToText(inputPath: String, outputPath: String) {
        val md = File(inputPath).readText(Charsets.UTF_8)
        val parser = Parser.builder().build()
        val document = parser.parse(md)
        val renderer = HtmlRenderer.builder().build()
        val html = renderer.render(document)
        val text = Jsoup.parse(html).text()
        File(outputPath).writeText(text, Charsets.UTF_8)
    }

    private fun formattedTextToPdf(inputPath: String, outputPath: String, type: String) {
        val raw = File(inputPath).readText(Charsets.UTF_8)
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
        val pfd = ParcelFileDescriptor.open(file, ParcelFileDescriptor.MODE_READ_ONLY)
        val renderer = PdfRenderer(pfd)
        if (renderer.pageCount > 0) {
            val page = renderer.openPage(0)
            val bitmap = Bitmap.createBitmap(page.width, page.height, Bitmap.Config.ARGB_8888)
            bitmap.eraseColor(Color.WHITE)
            page.render(bitmap, null, null, PdfRenderer.Page.RENDER_MODE_FOR_DISPLAY)
            page.close()

            FileOutputStream(outputPath).use { out ->
                val compressFormat = if (format == "jpg" || format == "jpeg") {
                    Bitmap.CompressFormat.JPEG
                } else {
                    Bitmap.CompressFormat.PNG
                }
                bitmap.compress(compressFormat, 90, out)
            }
        }
        renderer.close()
        pfd.close()
    }

    private fun imageToPdf(inputPath: String, outputPath: String) {
        val bitmap = BitmapFactory.decodeFile(inputPath)
            ?: throw IllegalArgumentException("Could not decode image at $inputPath")

        val pdfDoc = AndroidPdfDocument()
        val pageInfo = AndroidPdfDocument.PageInfo.Builder(bitmap.width, bitmap.height, 1).create()
        val page = pdfDoc.startPage(pageInfo)
        val canvas = page.canvas
        canvas.drawBitmap(bitmap, 0f, 0f, null)
        pdfDoc.finishPage(page)

        FileOutputStream(outputPath).use { out ->
            pdfDoc.writeTo(out)
        }
        pdfDoc.close()
        bitmap.recycle()
    }

    private fun csvToTsv(inputPath: String, outputPath: String, fromSep: Char, toSep: Char) {
        val input = File(inputPath)
        val output = File(outputPath)
        input.bufferedReader(Charsets.UTF_8).use { reader ->
            output.bufferedWriter(Charsets.UTF_8).use { writer ->
                reader.forEachLine { line ->
                    val converted = line.replace(fromSep, toSep)
                    writer.write(converted)
                    writer.newLine()
                }
            }
        }
    }

    private fun docxToText(inputPath: String, outputPath: String) {
        val extracted = extractTextFromDocx(inputPath)
        File(outputPath).writeText(extracted, Charsets.UTF_8)
    }

    private fun docxToHtml(inputPath: String, outputPath: String) {
        val text = extractTextFromDocx(inputPath)
        val paragraphs = text.split("\n\n").joinToString("\n") { "<p>${it.replace("\n", "<br/>")}</p>" }
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
                ?: return ""
            zip.getInputStream(entry).use { stream ->
                val builder = DocumentBuilderFactory.newInstance().newDocumentBuilder()
                val doc = builder.parse(stream)
                val paragraphs = doc.getElementsByTagName("w:p")
                val sb = StringBuilder()
                for (i in 0 until paragraphs.length) {
                    val p = paragraphs.item(i)
                    val texts = (p as? org.w3c.dom.Element)?.getElementsByTagName("w:t") ?: continue
                    for (j in 0 until texts.length) {
                        sb.append(texts.item(j).textContent)
                    }
                    sb.append("\n")
                }
                return sb.toString()
            }
        }
    }

    private fun sanitizeText(input: String): String {
        val sb = StringBuilder()
        for (c in input) {
            if (c.code in 32..126) {
                sb.append(c)
            } else if (c == '\t') {
                sb.append("    ")
            } else {
                sb.append('?')
            }
        }
        return sb.toString()
    }

    private fun wrapText(
        text: String,
        font: PDType1Font,
        fontSize: Float,
        maxWidth: Float
    ): List<String> {
        val result = mutableListOf<String>()
        val words = text.split(" ")
        var currentLine = StringBuilder()

        for (word in words) {
            val candidate = if (currentLine.isEmpty()) word else "$currentLine $word"
            val width = try {
                font.getStringWidth(sanitizeText(candidate)) / 1000 * fontSize
            } catch (e: Exception) {
                candidate.length * (fontSize * 0.6f)
            }

            if (width > maxWidth && currentLine.isNotEmpty()) {
                result.add(currentLine.toString())
                currentLine = StringBuilder(word)
            } else {
                currentLine = StringBuilder(candidate)
            }
        }

        if (currentLine.isNotEmpty()) {
            result.add(currentLine.toString())
        }

        return if (result.isEmpty()) listOf("") else result
    }
}
