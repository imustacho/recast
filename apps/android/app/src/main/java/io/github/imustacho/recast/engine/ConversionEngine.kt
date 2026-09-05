package io.github.imustacho.recast.engine

import android.content.Context
import android.os.Environment
import io.github.imustacho.recast.model.ConversionRequest
import io.github.imustacho.recast.model.ConversionResult
import java.io.File

class ConversionEngine(private val context: Context) {

    init {
        DocumentEngine.init(context)
    }

    fun convertFiles(request: ConversionRequest): List<ConversionResult> {
        val results = mutableListOf<ConversionResult>()
        val outputDir = getOutputDir(request.outputDirectory)

        for (inputPath in request.inputPaths) {
            val inputFile = File(inputPath)
            if (!inputFile.exists()) {
                results.add(
                    ConversionResult(
                        inputPath = inputPath,
                        outputPath = null,
                        success = false,
                        error = "File does not exist: $inputPath"
                    )
                )
                continue
            }

            val formatDef = FormatRegistry.detectFormat(inputPath)
            val category = formatDef?.category ?: "unknown"
            val targetDef = FormatRegistry.findFormatById(request.targetFormat)
            val extension = targetDef?.defaultExtension ?: request.targetFormat

            val stem = inputFile.nameWithoutExtension.ifEmpty { "recast_output" }
            val resolvedOutput = resolveCollision(outputDir, stem, extension, request.overwritePolicy ?: "rename")

            val result = if (category == "document") {
                val sourceExt = formatDef?.defaultExtension ?: inputFile.extension
                DocumentEngine.convert(
                    inputPath = inputPath,
                    outputPath = resolvedOutput.absolutePath,
                    sourceFormat = sourceExt,
                    targetFormat = request.targetFormat
                )
            } else {
                FFmpegEngine.convert(
                    inputPath = inputPath,
                    outputPath = resolvedOutput.absolutePath,
                    category = category,
                    targetFormat = request.targetFormat,
                    overwrite = request.overwritePolicy == "overwrite"
                )
            }

            if (result.isSuccess) {
                results.add(
                    ConversionResult(
                        inputPath = inputPath,
                        outputPath = resolvedOutput.absolutePath,
                        success = true,
                        error = null
                    )
                )
            } else {
                results.add(
                    ConversionResult(
                        inputPath = inputPath,
                        outputPath = null,
                        success = false,
                        error = result.exceptionOrNull()?.message ?: "Conversion failed"
                    )
                )
            }
        }

        return results
    }

    private fun getOutputDir(customPath: String?): File {
        if (!customPath.isNullOrEmpty()) {
            val dir = File(customPath)
            if (dir.exists() || dir.mkdirs()) return dir
        }

        // Try standard Downloads/Recast directory
        val downloads = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS)
        if (downloads != null) {
            val recastDir = File(downloads, "Recast")
            if (recastDir.exists() || recastDir.mkdirs()) {
                return recastDir
            }
        }

        // Fallback to app-specific external files dir
        val extDir = context.getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS)
            ?: context.filesDir
        val fallback = File(extDir, "Recast")
        if (!fallback.exists()) fallback.mkdirs()
        return fallback
    }

    private fun resolveCollision(
        dir: File,
        stem: String,
        extension: String,
        policy: String
    ): File {
        var candidate = File(dir, "$stem.$extension")
        if (!candidate.exists() || policy == "overwrite") {
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
