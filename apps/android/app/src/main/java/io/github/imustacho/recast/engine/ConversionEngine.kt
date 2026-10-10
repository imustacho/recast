package io.github.imustacho.recast.engine

import android.annotation.SuppressLint
import android.content.Context
import android.os.Environment
import io.github.imustacho.recast.model.ConversionRequest
import io.github.imustacho.recast.model.ConversionResult
import java.io.File
import java.io.IOException
import java.util.UUID

class ConversionEngine(private val context: Context) {

    companion object {
        private const val MAX_BATCH_SIZE = 50
        private const val MAX_INPUT_BYTES = 1024L * 1024L * 1024L
        private const val MAX_DOCUMENT_BYTES = 128L * 1024L * 1024L
        private const val MAX_IMAGE_BYTES = 256L * 1024L * 1024L
        private const val MIN_FREE_BYTES = 64L * 1024L * 1024L
    }

    init {
        DocumentEngine.init(context)
    }

    @Synchronized
    fun convertFiles(request: ConversionRequest): List<ConversionResult> {
        require(request.inputPaths.isNotEmpty()) { "Dönüştürülecek dosya seçilmedi" }
        require(request.inputPaths.size <= MAX_BATCH_SIZE) { "Tek seferde en fazla $MAX_BATCH_SIZE dosya dönüştürülebilir" }
        require((request.overwritePolicy ?: "rename") in setOf("overwrite", "rename", "skip")) { "Geçersiz üzerine yazma ilkesi" }
        val targetDef = FormatRegistry.findFormatById(request.targetFormat)
            ?: throw IllegalArgumentException("Bilinmeyen hedef format: ${request.targetFormat}")

        val results = mutableListOf<ConversionResult>()
        val outputDir = getOutputDir()

        for (inputPath in request.inputPaths) {
            val inputFile = File(inputPath)
            if (!inputFile.isFile) {
                results.add(
                    ConversionResult(
                        inputPath = inputPath,
                        outputPath = null,
                        success = false,
                        error = "Dosya bulunamadı: ${inputFile.name}"
                    )
                )
                continue
            }

            if (inputFile.length() <= 0L || inputFile.length() > MAX_INPUT_BYTES) {
                results.add(ConversionResult(inputPath, null, false, "Dosya boş veya 1 GB sınırını aşıyor"))
                continue
            }

            val formatDef = FormatRegistry.detectFormat(inputPath)
            if (formatDef == null || !FormatRegistry.isConversionSupported(formatDef.id, targetDef.id)) {
                results.add(ConversionResult(inputPath, null, false, "${inputFile.extension} → ${targetDef.id} Android üzerinde desteklenmiyor"))
                continue
            }
            val category = formatDef.category
            val extension = targetDef.defaultExtension
            if ((category == "document" && inputFile.length() > MAX_DOCUMENT_BYTES) ||
                (category == "image" && inputFile.length() > MAX_IMAGE_BYTES)
            ) {
                results.add(ConversionResult(inputPath, null, false, "Dosya bu format için güvenli bellek sınırını aşıyor"))
                continue
            }

            val requiredSpace = maxOf(MIN_FREE_BYTES, inputFile.length() * 2)
            if (outputDir.usableSpace < requiredSpace) {
                results.add(ConversionResult(inputPath, null, false, "Çıktı için yeterli boş alan yok"))
                continue
            }

            val stem = inputFile.nameWithoutExtension.ifEmpty { "recast_output" }
            val resolvedOutput = resolveCollision(outputDir, stem, extension, request.overwritePolicy ?: "rename")
            if (request.overwritePolicy == "skip" && resolvedOutput.exists()) {
                results.add(ConversionResult(inputPath, null, false, "Çıktı zaten mevcut"))
                continue
            }
            val workingOutput = File(outputDir, ".${stem}-${UUID.randomUUID()}.$extension")

            val result = if (category == "image" && formatDef.id == "tiff" && targetDef.id in setOf("jpg", "png", "webp", "gif", "pdf")) {
                // Android BitmapFactory cannot decode TIFF. Decode one frame locally first.
                val intermediate = File(outputDir, ".decode-${UUID.randomUUID()}.png")
                try {
                    FFmpegEngine.convert(inputPath, intermediate.absolutePath, "image", "png").fold(
                        onSuccess = {
                            if (targetDef.id == "pdf") DocumentEngine.convert(it, workingOutput.absolutePath, "png", "pdf")
                            else ImageEngine.convert(it, workingOutput.absolutePath, targetDef.id)
                        },
                        onFailure = { Result.failure(it) }
                    )
                } finally {
                    intermediate.delete()
                }
            } else if (category == "image" && targetDef.id in setOf("jpg", "png", "webp", "gif")) {
                ImageEngine.convert(inputPath, workingOutput.absolutePath, targetDef.id)
            } else if (category == "document" || (category == "image" && targetDef.id == "pdf")) {
                val sourceExt = formatDef?.defaultExtension ?: inputFile.extension
                DocumentEngine.convert(
                    inputPath = inputPath,
                    outputPath = workingOutput.absolutePath,
                    sourceFormat = sourceExt,
                    targetFormat = targetDef.id
                )
            } else {
                FFmpegEngine.convert(
                    inputPath = inputPath,
                    outputPath = workingOutput.absolutePath,
                    category = category,
                    targetFormat = targetDef.id,
                    overwrite = true
                )
            }

            if (result.isSuccess) {
                try {
                    commitOutput(workingOutput, resolvedOutput)
                    results.add(
                        ConversionResult(
                            inputPath = inputPath,
                            outputPath = resolvedOutput.absolutePath,
                            success = true,
                            error = null
                        )
                    )
                } catch (failure: Throwable) {
                    workingOutput.delete()
                    results.add(ConversionResult(inputPath, null, false, failure.message ?: "Çıktı kaydedilemedi"))
                }
            } else {
                workingOutput.delete()
                results.add(
                    ConversionResult(
                        inputPath = inputPath,
                        outputPath = null,
                        success = false,
                        error = result.exceptionOrNull()?.message?.take(4000) ?: "Dönüştürme başarısız"
                    )
                )
            }
        }

        return results
    }

    @SuppressLint("UsableSpace")
    private fun getOutputDir(): File {
        val extDir = context.getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS)
            ?: context.filesDir
        val fallback = File(extDir, "Recast")
        if ((!fallback.exists() && !fallback.mkdirs()) || !fallback.isDirectory || !fallback.canWrite()) {
            throw IOException("Yazılabilir çıktı dizini oluşturulamadı")
        }
        return fallback
    }

    private fun commitOutput(working: File, destination: File) {
        if (!working.isFile || working.length() <= 0L) throw IOException("Motor geçerli bir çıktı üretmedi")
        // Both paths are in the same directory; POSIX rename replaces atomically.
        android.system.Os.rename(working.absolutePath, destination.absolutePath)
    }

    private fun resolveCollision(
        dir: File,
        stem: String,
        extension: String,
        policy: String
    ): File {
        var candidate = File(dir, "$stem.$extension")
        if (!candidate.exists() || policy == "overwrite" || policy == "skip") {
            return candidate
        }

        var counter = 1
        while (candidate.exists()) {
            candidate = File(dir, "$stem ($counter).$extension")
            counter++
        }
        return candidate
    }
}
