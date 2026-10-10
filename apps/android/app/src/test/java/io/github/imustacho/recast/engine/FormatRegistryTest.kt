package io.github.imustacho.recast.engine

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class FormatRegistryTest {

    @Test
    fun everyMediaTargetSelectsItsMuxerExplicitly() {
        for (target in FormatRegistry.formats.filter { it.category == "audio" || it.category == "video" }) {
            val args = FormatRegistry.getFFmpegArgsFor(target.category, target.id)!!
            assertEquals(target.ffmpegFormat, args[args.indexOf("-f") + 1])
        }
    }

    @Test
    fun videoAudioExtractionUsesAudioMuxerAndOddVideoSizesArePadded() {
        val audio = FormatRegistry.getFFmpegArgsFor("video", "opus")!!
        assertEquals("ogg", audio[audio.indexOf("-f") + 1])
        assertTrue(audio.contains("48000"))
        val video = FormatRegistry.getFFmpegArgsFor("video", "mp4")!!
        assertTrue(video.contains("pad=ceil(iw/2)*2:ceil(ih/2)*2"))
    }

    @Test
    fun capabilitiesExposeOnlyConversionsImplementedByAndroidDocumentEngine() {
        val targets = FormatRegistry.getCapabilities().targetsBySourceFormat.orEmpty()

        assertEquals(listOf("txt", "png", "jpg"), targets["pdf"])
        assertEquals(listOf("txt", "html", "pdf"), targets["docx"])
        assertTrue(targets["xlsx"].orEmpty().isEmpty())
    }

    @Test
    fun videoCanBeConvertedToAudio() {
        val args = FormatRegistry.getFFmpegArgsFor("video", "mp3")

        assertTrue(args.orEmpty().contains("libmp3lame"))
    }

    @Test
    fun advertisedFormatsDoNotDependOnUnavailableGplOrAv1Encoders() {
        val capabilities = FormatRegistry.getCapabilities()
        val allArguments = listOf("mp4", "mkv", "mov", "m4v")
            .flatMap { FormatRegistry.getFFmpegArgsFor("video", it).orEmpty() }

        assertTrue("avif" !in capabilities.formats.map { it.id })
        assertTrue("libx264" !in allArguments)
        assertTrue("libaom-av1" !in allArguments)
    }
}
