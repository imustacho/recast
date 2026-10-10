package io.github.imustacho.recast.engine

import org.junit.Assert.*
import org.junit.Test
import java.io.File
import java.util.zip.ZipEntry
import java.util.zip.ZipOutputStream

class DocumentEngineTest {
    private fun withDocx(xml: String, check: (File, File) -> Unit) {
        val source = File.createTempFile("recast-docx-", ".docx")
        val output = File.createTempFile("recast-text-", ".txt")
        try {
            ZipOutputStream(source.outputStream()).use {
                it.putNextEntry(ZipEntry("word/document.xml"))
                it.write(xml.toByteArray(Charsets.UTF_8))
                it.closeEntry()
            }
            check(source, output)
        } finally { source.delete(); output.delete() }
    }

    @Test fun readsUnicodeEntitiesTabsAndArbitraryNamespacePrefix() {
        withDocx("""<d:document xmlns:d="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><d:body><d:p><d:r><d:t>Türkçe &amp; ığüşöç</d:t><d:tab/><d:t>ikinci</d:t><d:br/><d:t>satır</d:t></d:r></d:p></d:body></d:document>""") { source, output ->
            val result = DocumentEngine.convert(source.path, output.path, "docx", "txt")
            assertTrue(result.exceptionOrNull()?.toString(), result.isSuccess)
            assertEquals("Türkçe & ığüşöç\tikinci\nsatır\n", output.readText())
        }
    }

    @Test fun rejectsDtdWithoutResolvingExternalFiles() {
        withDocx("""<!DOCTYPE document [<!ENTITY secret SYSTEM "file:///not-readable">]><document>&secret;</document>""") { source, output ->
            val result = DocumentEngine.convert(source.path, output.path, "docx", "txt")
            assertTrue(result.isFailure)
            assertTrue(result.exceptionOrNull()?.message.orEmpty().contains("DTD"))
        }
    }

    @Test fun rejectsMalformedXml() {
        withDocx("<document><p></document>") { source, output ->
            assertTrue(DocumentEngine.convert(source.path, output.path, "docx", "txt").isFailure)
        }
    }
}
