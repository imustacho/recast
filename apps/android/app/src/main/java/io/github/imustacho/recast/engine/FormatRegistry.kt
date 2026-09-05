package io.github.imustacho.recast.engine

import io.github.imustacho.recast.model.CodecDefinition
import io.github.imustacho.recast.model.ConversionCapabilities
import io.github.imustacho.recast.model.FormatDefinition
import java.io.File

object FormatRegistry {

    val codecs: List<CodecDefinition> = listOf(
        CodecDefinition("mjpeg", "video", "mjpeg", listOf("-q:v", "2")),
        CodecDefinition("png", "video", "png", emptyList()),
        CodecDefinition("webp", "video", "libwebp", listOf("-quality", "82")),
        CodecDefinition("bmp", "video", "bmp", emptyList()),
        CodecDefinition("tiff", "video", "tiff", emptyList()),
        CodecDefinition("gif", "video", "gif", emptyList()),
        CodecDefinition("av1", "video", "libaom-av1", listOf("-crf", "30", "-b:v", "0", "-still-picture", "1")),
        CodecDefinition("h264", "video", "libx264", listOf("-preset", "medium", "-crf", "23")),
        CodecDefinition("vp9", "video", "libvpx-vp9", listOf("-crf", "31", "-b:v", "0")),
        CodecDefinition("mpeg4", "video", "mpeg4", listOf("-q:v", "5")),
        CodecDefinition("mpeg2", "video", "mpeg2video", listOf("-q:v", "5")),
        CodecDefinition("theora", "video", "libtheora", listOf("-q:v", "7")),
        CodecDefinition("mp3", "audio", "libmp3lame", listOf("-q:a", "2")),
        CodecDefinition("pcm-s16le", "audio", "pcm_s16le", emptyList()),
        CodecDefinition("pcm-s16be", "audio", "pcm_s16be", emptyList()),
        CodecDefinition("flac", "audio", "flac", emptyList()),
        CodecDefinition("aac", "audio", "aac", listOf("-b:a", "192k")),
        CodecDefinition("vorbis", "audio", "libvorbis", listOf("-q:a", "5")),
        CodecDefinition("opus", "audio", "libopus", listOf("-b:a", "160k")),
        CodecDefinition("alac", "audio", "alac", emptyList()),
        CodecDefinition("ac3", "audio", "ac3", listOf("-b:a", "192k")),
        CodecDefinition("mp2", "audio", "mp2", listOf("-b:a", "192k"))
    )

    val formats: List<FormatDefinition> = listOf(
        // Image formats
        FormatDefinition("jpg", "JPG / JPEG", "image", listOf("jpg", "jpeg"), listOf("image/jpeg"), "jpg", defaultVideoCodec = "mjpeg"),
        FormatDefinition("png", "PNG", "image", listOf("png"), listOf("image/png"), "png", defaultVideoCodec = "png"),
        FormatDefinition("webp", "WebP", "image", listOf("webp"), listOf("image/webp"), "webp", defaultVideoCodec = "webp"),
        FormatDefinition("bmp", "BMP", "image", listOf("bmp"), listOf("image/bmp"), "bmp", defaultVideoCodec = "bmp"),
        FormatDefinition("tiff", "TIFF", "image", listOf("tif", "tiff"), listOf("image/tiff"), "tiff", defaultVideoCodec = "tiff"),
        FormatDefinition("gif", "GIF", "image", listOf("gif"), listOf("image/gif"), "gif", defaultVideoCodec = "gif"),
        FormatDefinition("avif", "AVIF", "image", listOf("avif"), listOf("image/avif"), "avif", defaultVideoCodec = "av1"),

        // Audio formats
        FormatDefinition("mp3", "MP3", "audio", listOf("mp3"), listOf("audio/mpeg"), "mp3", ffmpegFormat = "mp3", defaultAudioCodec = "mp3"),
        FormatDefinition("wav", "WAV", "audio", listOf("wav"), listOf("audio/wav", "audio/x-wav"), "wav", ffmpegFormat = "wav", defaultAudioCodec = "pcm-s16le"),
        FormatDefinition("flac", "FLAC", "audio", listOf("flac"), listOf("audio/flac"), "flac", ffmpegFormat = "flac", defaultAudioCodec = "flac"),
        FormatDefinition("aac", "AAC", "audio", listOf("aac"), listOf("audio/aac"), "aac", ffmpegFormat = "adts", defaultAudioCodec = "aac"),
        FormatDefinition("m4a", "M4A", "audio", listOf("m4a"), listOf("audio/mp4"), "m4a", ffmpegFormat = "ipod", defaultAudioCodec = "aac"),
        FormatDefinition("ogg", "OGG Vorbis", "audio", listOf("ogg", "oga"), listOf("audio/ogg"), "ogg", ffmpegFormat = "ogg", defaultAudioCodec = "vorbis"),
        FormatDefinition("opus", "Opus", "audio", listOf("opus"), listOf("audio/opus", "audio/ogg"), "opus", ffmpegFormat = "ogg", defaultAudioCodec = "opus"),
        FormatDefinition("aiff", "AIFF", "audio", listOf("aif", "aiff", "aifc"), listOf("audio/aiff", "audio/x-aiff"), "aiff", ffmpegFormat = "aiff", defaultAudioCodec = "pcm-s16be"),
        FormatDefinition("alac", "ALAC", "audio", emptyList(), listOf("audio/mp4"), "m4a", ffmpegFormat = "ipod", defaultAudioCodec = "alac"),
        FormatDefinition("ac3", "AC3", "audio", listOf("ac3"), listOf("audio/ac3"), "ac3", ffmpegFormat = "ac3", defaultAudioCodec = "ac3"),

        // Video formats
        FormatDefinition("mp4", "MP4", "video", listOf("mp4"), listOf("video/mp4"), "mp4", ffmpegFormat = "mp4", defaultVideoCodec = "h264", defaultAudioCodec = "aac"),
        FormatDefinition("mkv", "MKV", "video", listOf("mkv"), listOf("video/x-matroska"), "mkv", ffmpegFormat = "matroska", defaultVideoCodec = "h264", defaultAudioCodec = "aac"),
        FormatDefinition("webm", "WebM", "video", listOf("webm"), listOf("video/webm"), "webm", ffmpegFormat = "webm", defaultVideoCodec = "vp9", defaultAudioCodec = "opus"),
        FormatDefinition("mov", "MOV", "video", listOf("mov"), listOf("video/quicktime"), "mov", ffmpegFormat = "mov", defaultVideoCodec = "h264", defaultAudioCodec = "aac"),
        FormatDefinition("avi", "AVI", "video", listOf("avi"), listOf("video/x-msvideo"), "avi", ffmpegFormat = "avi", defaultVideoCodec = "mpeg4", defaultAudioCodec = "mp3"),
        FormatDefinition("m4v", "M4V", "video", listOf("m4v"), listOf("video/x-m4v"), "m4v", ffmpegFormat = "ipod", defaultVideoCodec = "h264", defaultAudioCodec = "aac"),
        FormatDefinition("mpeg", "MPEG / MPG", "video", listOf("mpeg", "mpg"), listOf("video/mpeg"), "mpeg", ffmpegFormat = "mpeg", defaultVideoCodec = "mpeg2", defaultAudioCodec = "mp2"),
        FormatDefinition("ogv", "OGV", "video", listOf("ogv"), listOf("video/ogg"), "ogv", ffmpegFormat = "ogg", defaultVideoCodec = "theora", defaultAudioCodec = "vorbis"),
        FormatDefinition("ts", "TS / MTS / M2TS", "video", listOf("ts", "mts", "m2ts"), listOf("video/mp2t"), "ts", ffmpegFormat = "mpegts", defaultVideoCodec = "mpeg2", defaultAudioCodec = "mp2"),

        // Document formats
        FormatDefinition("pdf", "PDF", "document", listOf("pdf"), listOf("application/pdf"), "pdf"),
        FormatDefinition("odt", "ODT (OpenDocument Text)", "document", listOf("odt"), listOf("application/vnd.oasis.opendocument.text"), "odt"),
        FormatDefinition("docx", "DOCX (Word Document)", "document", listOf("docx"), listOf("application/vnd.openxmlformats-officedocument.wordprocessingml.document"), "docx"),
        FormatDefinition("doc", "DOC (Word 97-2003)", "document", listOf("doc"), listOf("application/msword"), "doc"),
        FormatDefinition("rtf", "RTF (Rich Text)", "document", listOf("rtf"), listOf("application/rtf", "text/rtf"), "rtf"),
        FormatDefinition("txt", "TXT (Plain Text)", "document", listOf("txt"), listOf("text/plain"), "txt"),
        FormatDefinition("md", "Markdown", "document", listOf("md", "markdown"), listOf("text/markdown", "text/x-markdown"), "md"),
        FormatDefinition("html", "HTML", "document", listOf("html", "htm", "xhtml"), listOf("text/html", "application/xhtml+xml"), "html"),
        FormatDefinition("epub", "EPUB", "document", listOf("epub"), listOf("application/epub+zip"), "epub"),
        FormatDefinition("ods", "ODS (OpenDocument Sheet)", "document", listOf("ods"), listOf("application/vnd.oasis.opendocument.spreadsheet"), "ods"),
        FormatDefinition("xlsx", "XLSX (Excel Spreadsheet)", "document", listOf("xlsx"), listOf("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"), "xlsx"),
        FormatDefinition("xls", "XLS (Excel 97-2003)", "document", listOf("xls"), listOf("application/vnd.ms-excel"), "xls"),
        FormatDefinition("csv", "CSV", "document", listOf("csv"), listOf("text/csv"), "csv"),
        FormatDefinition("tsv", "TSV", "document", listOf("tsv"), listOf("text/tab-separated-values"), "tsv"),
        FormatDefinition("odp", "ODP (OpenDocument Presentation)", "document", listOf("odp"), listOf("application/vnd.oasis.opendocument.presentation"), "odp"),
        FormatDefinition("pptx", "PPTX (PowerPoint Presentation)", "document", listOf("pptx"), listOf("application/vnd.openxmlformats-officedocument.presentationml.presentation"), "pptx")
    )

    fun getCapabilities(): ConversionCapabilities {
        val targetsByCategory = mutableMapOf<String, List<String>>()
        val categories = listOf("image", "video", "audio", "document")
        for (category in categories) {
            targetsByCategory[category] = formats.filter { it.category == category }.map { it.id }
        }

        return ConversionCapabilities(
            formats = formats,
            codecs = codecs,
            targetsBySourceCategory = targetsByCategory
        )
    }

    fun findFormatById(id: String): FormatDefinition? {
        return formats.firstOrNull { it.id.equals(id, ignoreCase = true) }
    }

    fun detectFormat(path: String): FormatDefinition? {
        val extension = File(path).extension.lowercase()
        if (extension.isEmpty()) return null
        return formats.firstOrNull { format ->
            format.id.equals(extension, ignoreCase = true) ||
            format.extensions.any { it.equals(extension, ignoreCase = true) }
        }
    }

    fun getFFmpegArgsFor(category: String, targetFormat: String): List<String>? {
        val target = findFormatById(targetFormat) ?: return null
        val args = mutableListOf<String>()

        when (category) {
            "image" -> {
                when (targetFormat) {
                    "jpg", "jpeg" -> args.addAll(listOf("-c:v", "mjpeg", "-q:v", "2"))
                    "png" -> args.addAll(listOf("-c:v", "png"))
                    "webp" -> args.addAll(listOf("-c:v", "libwebp", "-quality", "82"))
                    "bmp" -> args.addAll(listOf("-c:v", "bmp"))
                    "tiff" -> args.addAll(listOf("-c:v", "tiff"))
                    "gif" -> args.addAll(listOf("-c:v", "gif"))
                    "avif" -> args.addAll(listOf("-c:v", "libaom-av1", "-crf", "30", "-b:v", "0", "-still-picture", "1"))
                    else -> return null
                }
            }
            "audio" -> {
                when (targetFormat) {
                    "mp3" -> args.addAll(listOf("-vn", "-c:a", "libmp3lame", "-q:a", "2"))
                    "wav" -> args.addAll(listOf("-vn", "-c:a", "pcm_s16le"))
                    "flac" -> args.addAll(listOf("-vn", "-c:a", "flac"))
                    "aac" -> args.addAll(listOf("-vn", "-c:a", "aac", "-b:a", "192k"))
                    "m4a" -> args.addAll(listOf("-vn", "-c:a", "aac", "-b:a", "192k"))
                    "ogg" -> args.addAll(listOf("-vn", "-c:a", "libvorbis", "-q:a", "5"))
                    "opus" -> args.addAll(listOf("-vn", "-c:a", "libopus", "-b:a", "160k"))
                    "aiff" -> args.addAll(listOf("-vn", "-c:a", "pcm_s16be"))
                    "alac" -> args.addAll(listOf("-vn", "-c:a", "alac"))
                    "ac3" -> args.addAll(listOf("-vn", "-c:a", "ac3", "-b:a", "192k"))
                    else -> return null
                }
            }
            "video" -> {
                when (targetFormat) {
                    "mp4" -> args.addAll(listOf("-c:v", "libx264", "-preset", "medium", "-crf", "23", "-c:a", "aac", "-b:a", "192k"))
                    "mkv" -> args.addAll(listOf("-c:v", "libx264", "-preset", "medium", "-crf", "23", "-c:a", "aac", "-b:a", "192k"))
                    "webm" -> args.addAll(listOf("-c:v", "libvpx-vp9", "-crf", "31", "-b:v", "0", "-c:a", "libopus", "-b:a", "160k"))
                    "mov" -> args.addAll(listOf("-c:v", "libx264", "-preset", "medium", "-crf", "23", "-c:a", "aac", "-b:a", "192k"))
                    "avi" -> args.addAll(listOf("-c:v", "mpeg4", "-q:v", "5", "-c:a", "libmp3lame", "-q:a", "2"))
                    "m4v" -> args.addAll(listOf("-c:v", "libx264", "-preset", "medium", "-crf", "23", "-c:a", "aac", "-b:a", "192k"))
                    "mpeg" -> args.addAll(listOf("-c:v", "mpeg2video", "-q:v", "5", "-c:a", "mp2", "-b:a", "192k"))
                    "ogv" -> args.addAll(listOf("-c:v", "libtheora", "-q:v", "7", "-c:a", "libvorbis", "-q:a", "5"))
                    "ts" -> args.addAll(listOf("-c:v", "mpeg2video", "-q:v", "5", "-c:a", "mp2", "-b:a", "192k"))
                    else -> return null
                }
            }
            else -> return null
        }

        return args
    }
}
