package io.github.imustacho.recast.engine

import com.arthenica.ffmpegkit.FFmpegKit
import com.arthenica.ffmpegkit.ReturnCode

object FFmpegEngine {

    fun convert(
        inputPath: String,
        outputPath: String,
        category: String,
        targetFormat: String,
        overwrite: Boolean = true
    ): Result<String> {
        val codecArgs = FormatRegistry.getFFmpegArgsFor(category, targetFormat)
            ?: return Result.failure(IllegalArgumentException("Unsupported conversion to $targetFormat for $category"))

        val args = mutableListOf<String>()
        args.addAll(listOf("-hide_banner", "-loglevel", "error"))
        if (overwrite) {
            args.add("-y")
        } else {
            args.add("-n")
        }
        args.addAll(listOf("-i", inputPath))
        args.addAll(codecArgs)
        args.add(outputPath)

        val session = FFmpegKit.executeWithArguments(args.toTypedArray())
        val returnCode = session.returnCode

        return if (ReturnCode.isSuccess(returnCode)) {
            Result.success(outputPath)
        } else {
            val logs = session.allLogsAsString?.trim().orEmpty()
            val failStackTrace = session.failStackTrace?.trim().orEmpty()
            val errorMsg = when {
                logs.isNotEmpty() -> logs
                failStackTrace.isNotEmpty() -> failStackTrace
                else -> "FFmpeg exited with return code: ${returnCode?.value ?: -1}"
            }
            Result.failure(RuntimeException(errorMsg))
        }
    }
}
