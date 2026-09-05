package io.github.imustacho.recast.model

import com.google.gson.annotations.SerializedName

data class FormatDefinition(
    val id: String,
    val displayName: String,
    val category: String, // "image", "video", "audio", "document"
    val extensions: List<String>,
    val mimeTypes: List<String>,
    val defaultExtension: String,
    val ffmpegFormat: String? = null,
    val defaultVideoCodec: String? = null,
    val defaultAudioCodec: String? = null
)

data class CodecDefinition(
    val id: String,
    val kind: String, // "video" or "audio"
    val ffmpegEncoder: String,
    val defaultArgs: List<String>
)

data class ConversionCapabilities(
    val formats: List<FormatDefinition>,
    val codecs: List<CodecDefinition>,
    val targetsBySourceCategory: Map<String, List<String>>,
    val targetsBySourceFormat: Map<String, List<String>>? = null
)

data class UiMediaFile(
    val path: String,
    val detectedFormat: String,
    val category: String
)

data class ConversionJob(
    val id: String,
    val inputPath: String,
    val outputPath: String? = null,
    val sourceFormat: String? = null,
    val targetFormat: String,
    val presetId: String? = null,
    var status: String, // "pending", "inspecting", "ready", "processing", "completed", "failed", "cancelled"
    var progress: Int,
    var currentStep: String? = null,
    val createdAt: String
)

data class ConversionResult(
    val inputPath: String,
    val outputPath: String? = null,
    val success: Boolean,
    val error: String? = null
)

data class ConversionRequest(
    val inputPaths: List<String>,
    val targetFormat: String,
    val presetId: String? = null,
    val outputDirectory: String? = null,
    val overwritePolicy: String? = "rename", // "overwrite", "rename", "skip"
    val options: Map<String, Any>? = null
)

data class LaunchRequest(
    val paths: List<String>,
    val targetFormat: String? = null,
    val autoStart: Boolean = false
)

data class EngineStatus(
    val ffmpeg: Boolean,
    val libreoffice: Boolean,
    val libreofficeVersion: String? = null
)
