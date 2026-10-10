package io.github.imustacho.recast.engine

import org.junit.Assert.assertArrayEquals
import org.junit.Assert.assertTrue
import org.junit.Assert.assertEquals
import org.junit.Test
import java.io.File

class ImageEngineTest {

    @Test
    fun writesAValidGif89aFile() {
        val output = File.createTempFile("recast-gif-test-", ".gif")
        try {
            val red = 0xffff0000.toInt()
            val green = 0xff00ff00.toInt()
            val blue = 0xff0000ff.toInt()
            val white = 0xffffffff.toInt()
            output.outputStream().use { ImageEngine.writeGif(arrayOf(intArrayOf(red, green), intArrayOf(blue, white)), it) }

            val bytes = output.readBytes()
            assertTrue(bytes.size > 13)
            assertArrayEquals("GIF89a".toByteArray(), bytes.copyOfRange(0, 6))
        } finally {
            output.delete()
        }
    }

    @Test
    fun rectangularAndSinglePixelImagesPreserveDimensionsAndPixelPositions() {
        for ((width, height) in listOf(3 to 2, 2 to 3, 1 to 17, 17 to 1, 1 to 1, 320 to 180, 180 to 320)) {
            val colors = intArrayOf(0xff0000, 0x00ff00, 0x0000ff, 0xffffff)
            val rows = Array(height) { y -> IntArray(width) { x -> colors[(y * width + x) % colors.size] } }
            val file = File.createTempFile("recast-rectangle-", ".gif")
            try {
                file.outputStream().use { ImageEngine.writeGif(rows, it) }
                // Android's compile bootclasspath excludes java.desktop, but host JVM
                // ImageIO gives us an independent decoder rather than header-only checks.
                val decoded = Class.forName("javax.imageio.ImageIO").getMethod("read", File::class.java).invoke(null, file)
                val imageClass = Class.forName("java.awt.image.BufferedImage")
                assertEquals(width, imageClass.getMethod("getWidth").invoke(decoded))
                assertEquals(height, imageClass.getMethod("getHeight").invoke(decoded))
                for (y in 0 until height) for (x in 0 until width) {
                    val pixel = imageClass.getMethod("getRGB", Int::class.javaPrimitiveType, Int::class.javaPrimitiveType).invoke(decoded, x, y) as Int
                    assertEquals("Pixel $x,$y in ${width}x$height", rows[y][x], pixel and 0xffffff)
                }
            } finally { file.delete() }
        }
    }

    @Test(expected = IllegalArgumentException::class)
    fun rejectsRaggedRowsBeforeWriting() {
        ImageEngine.writeGif(arrayOf(intArrayOf(1), intArrayOf(2, 3)), java.io.ByteArrayOutputStream())
    }

    @Test
    fun quantizesPhotographicColorCountsIntoAReadableGif() {
        val rows = Array(60) { y -> IntArray(80) { x -> ((x * 255 / 79) shl 16) or ((y * 255 / 59) shl 8) or ((x + y) * 255 / 138) } }
        val file = File.createTempFile("recast-gradient-", ".gif")
        try {
            file.outputStream().use { ImageEngine.writeGif(rows, it) }
            val decoded = Class.forName("javax.imageio.ImageIO").getMethod("read", File::class.java).invoke(null, file)
            val type = Class.forName("java.awt.image.BufferedImage")
            assertEquals(80, type.getMethod("getWidth").invoke(decoded))
            assertEquals(60, type.getMethod("getHeight").invoke(decoded))
            var error = 0L
            val getRgb = type.getMethod("getRGB", Int::class.javaPrimitiveType, Int::class.javaPrimitiveType)
            for (y in rows.indices) for (x in rows[y].indices) {
                val actual = getRgb.invoke(decoded, x, y) as Int
                for (shift in listOf(0, 8, 16)) error += kotlin.math.abs(((actual ushr shift) and 255) - ((rows[y][x] ushr shift) and 255))
            }
            assertTrue("Excessive color error: $error", error / (80 * 60 * 3) < 20)
        } finally { file.delete() }
    }
}
