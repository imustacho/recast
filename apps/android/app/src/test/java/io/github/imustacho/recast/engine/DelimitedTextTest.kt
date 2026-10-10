package io.github.imustacho.recast.engine

import org.junit.Assert.assertEquals
import org.junit.Test
import java.io.StringReader
import java.io.StringWriter

class DelimitedTextTest {
    private fun convert(text: String, from: Char = ',', to: Char = '\t'): String {
        val output = StringWriter()
        DelimitedText.convert(StringReader(text), output, from, to)
        return output.toString()
    }

    @Test fun preservesQuotedComma() = assertEquals("a,b\tc\n", convert("\"a,b\",c\r\n"))
    @Test fun preservesQuotesAndMultilineCells() = assertEquals("\"a\n\"\"b\"\"\"\tc\n", convert("\"a\n\"\"b\"\"\",c\n"))
    @Test fun quotesTargetDelimiter() = assertEquals("\"a\tb\"\tc", convert("a\tb,c"))
    @Test fun preservesEmptyFields() = assertEquals("\t\n\t", convert(",\n,"))
    @Test fun convertsUnicodeAndBom() = assertEquals("Türkçe\tığüşöç", convert("\uFEFFTürkçe,ığüşöç"))
    @Test fun reversesTsv() = assertEquals("\"a,b\",c", convert("a,b\tc", '\t', ','))
    @Test(expected = IllegalArgumentException::class) fun rejectsUnclosedQuotes() { convert("\"broken,value") }
}
