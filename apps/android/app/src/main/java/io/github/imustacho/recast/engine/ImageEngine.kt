package io.github.imustacho.recast.engine

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.os.Build
import com.squareup.gifencoder.GifEncoder
import com.squareup.gifencoder.ImageOptions
import java.io.File
import java.io.FileOutputStream

object ImageEngine {
    // Quantization needs multiple pixel buffers; cap still-image GIFs to keep
    // peak memory safe on low-memory Android devices.
    private const val MAX_GIF_DIMENSION = 1280
    private const val MAX_BITMAP_DIMENSION = 4096

    fun convert(inputPath: String, outputPath: String, targetFormat: String): Result<String> {
        return if (targetFormat == "gif") {
            convertToGif(inputPath, outputPath)
        } else {
            convertBitmap(inputPath, outputPath, targetFormat)
        }
    }

    private fun convertToGif(inputPath: String, outputPath: String): Result<String> = runCatching {
        val safeDimension = kotlin.math.sqrt(Runtime.getRuntime().maxMemory().toDouble() / 256).toInt()
            .coerceIn(128, MAX_GIF_DIMENSION)
        val bitmap = decodeSampledBitmap(inputPath, safeDimension)
            ?: throw IllegalArgumentException("Görsel Android tarafından okunamadı")

        try {
            FileOutputStream(File(outputPath)).use { output ->
                writeGif(toRgbMatrix(bitmap), output)
            }
        } finally {
            bitmap.recycle()
        }

        outputPath
    }

    private fun convertBitmap(inputPath: String, outputPath: String, targetFormat: String): Result<String> = runCatching {
        val safeDimension = kotlin.math.sqrt(Runtime.getRuntime().maxMemory().toDouble() / 32).toInt()
            .coerceIn(256, MAX_BITMAP_DIMENSION)
        val decoded = decodeSampledBitmap(inputPath, safeDimension)
            ?: throw IllegalArgumentException("Görsel Android tarafından okunamadı")
        var bitmap = decoded
        try {
            val compressFormat = when (targetFormat) {
                "jpg" -> {
                    if (decoded.hasAlpha()) {
                        bitmap = Bitmap.createBitmap(decoded.width, decoded.height, Bitmap.Config.ARGB_8888)
                        Canvas(bitmap).apply {
                            drawColor(Color.WHITE)
                            drawBitmap(decoded, 0f, 0f, Paint(Paint.ANTI_ALIAS_FLAG))
                        }
                    }
                    Bitmap.CompressFormat.JPEG
                }
                "png" -> Bitmap.CompressFormat.PNG
                "webp" -> if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                    Bitmap.CompressFormat.WEBP_LOSSY
                } else {
                    @Suppress("DEPRECATION")
                    Bitmap.CompressFormat.WEBP
                }
                else -> throw IllegalArgumentException("Desteklenmeyen güvenli görsel hedefi: $targetFormat")
            }
            FileOutputStream(File(outputPath)).use { output ->
                check(bitmap.compress(compressFormat, 90, output)) { "Görsel çıktısı yazılamadı" }
            }
        } finally {
            if (bitmap !== decoded) bitmap.recycle()
            decoded.recycle()
        }
        outputPath
    }

    internal fun writeGif(rgb: Array<IntArray>, output: java.io.OutputStream) {
        require(rgb.isNotEmpty() && rgb[0].isNotEmpty())
        require(rgb.all { it.size == rgb[0].size }) { "Görsel satır genişlikleri eşleşmiyor" }
        // gifencoder expects rows first: [height][width], matching Bitmap.getPixels.
        val encoder = GifEncoder(output, rgb[0].size, rgb.size, 0)
        encoder.addImage(rgb, ImageOptions())
        encoder.finishEncoding()
    }

    internal fun decodeSampledBitmap(path: String, maxDimension: Int): Bitmap? {
        val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
        BitmapFactory.decodeFile(path, bounds)
        if (bounds.outWidth <= 0 || bounds.outHeight <= 0) return null

        var sampleSize = 1
        while (bounds.outWidth.toLong() > maxDimension.toLong() * sampleSize ||
            bounds.outHeight.toLong() > maxDimension.toLong() * sampleSize
        ) {
            sampleSize *= 2
        }

        val decoded = BitmapFactory.decodeFile(
            path,
            BitmapFactory.Options().apply {
                inSampleSize = sampleSize
                inPreferredConfig = Bitmap.Config.ARGB_8888
            }
        ) ?: return null

        val largestSide = maxOf(decoded.width, decoded.height)
        if (largestSide <= maxDimension) return decoded

        val scale = maxDimension.toFloat() / largestSide
        val scaled = Bitmap.createScaledBitmap(
            decoded,
            (decoded.width * scale).toInt().coerceAtLeast(1),
            (decoded.height * scale).toInt().coerceAtLeast(1),
            true
        )
        if (scaled !== decoded) decoded.recycle()
        return scaled
    }

    private fun toRgbMatrix(bitmap: Bitmap): Array<IntArray> {
        val width = bitmap.width
        val height = bitmap.height
        val row = IntArray(width)
        val result = Array(height) { IntArray(width) }

        for (y in 0 until height) {
            bitmap.getPixels(row, 0, width, 0, y, width, 1)
            for (x in 0 until width) {
                // GIF has no partial alpha: composite transparent pixels on white.
                val pixel = row[x]
                val alpha = pixel ushr 24
                fun channel(shift: Int) = (((pixel ushr shift) and 255) * alpha + 255 * (255 - alpha) + 127) / 255
                result[y][x] = (channel(16) shl 16) or (channel(8) shl 8) or channel(0)
            }
        }
        return result
    }
}
