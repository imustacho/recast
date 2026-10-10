package io.github.imustacho.recast.engine

import com.arthenica.ffmpegkit.FFmpegKit
import com.arthenica.ffmpegkit.FFmpegSession
import com.arthenica.ffmpegkit.ReturnCode
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit
import java.io.File

object FFmpegEngine {

    fun convert(
        inputPath: String,
        outputPath: String,
        category: String,
        targetFormat: String,
        overwrite: Boolean = true
    ): Result<String> {
        return try {
            val codecArgs = FormatRegistry.getFFmpegArgsFor(category, targetFormat)
                ?: return Result.failure(IllegalArgumentException("Unsupported conversion to $targetFormat for $category"))

            require(File(inputPath).isFile) { "Girdi yerel bir dosya olmalı" }
            val args = mutableListOf<String>()
            args.addAll(listOf("-hide_banner", "-loglevel", "error", "-nostdin", "-threads", "2", "-filter_threads", "1"))
            args.add(if (overwrite) "-y" else "-n")
            args.addAll(listOf("-protocol_whitelist", "file,pipe"))
            args.addAll(listOf("-i", inputPath))
            args.addAll(listOf("-map_metadata", "-1", "-threads", "2"))
            if (category == "image") args.addAll(listOf("-frames:v", "1"))
            args.addAll(codecArgs)
            args.add(outputPath)

            val completed = arrayOfNulls<FFmpegSession>(1)
            val completion = CountDownLatch(1)
            val running = FFmpegKit.executeWithArgumentsAsync(args.toTypedArray()) { session ->
                completed[0] = session
                completion.countDown()
            }
            try {
                if (!completion.await(20, TimeUnit.MINUTES)) {
                    FFmpegKit.cancel(running.sessionId)
                    // Do not delete a partial file while the native worker is writing it.
                    completion.await()
                    return Result.failure(RuntimeException("Dönüştürme süre sınırını aştı; daha kısa bir dosya deneyin"))
                }
            } catch (failure: InterruptedException) {
                FFmpegKit.cancel(running.sessionId)
                completion.await()
                throw failure
            }
            val session = completed[0] ?: running
            val returnCode = session.returnCode

            if (ReturnCode.isSuccess(returnCode)) {
                Result.success(outputPath)
            } else {
                val logs = session.allLogsAsString?.trim().orEmpty()
                val failStackTrace = session.failStackTrace?.trim().orEmpty()
                val errorMsg = when {
                    logs.isNotEmpty() -> logs
                    failStackTrace.isNotEmpty() -> failStackTrace
                    else -> "FFmpeg exited with return code: ${returnCode?.value ?: -1}"
                }
                Result.failure(RuntimeException(errorMsg.replace(inputPath, File(inputPath).name)
                    .replace(outputPath, File(outputPath).name).takeLast(1200)))
            }
        } catch (failure: InterruptedException) {
            Thread.currentThread().interrupt()
            Result.failure(failure)
        } catch (failure: Throwable) {
            Result.failure(failure)
        }
    }
}
