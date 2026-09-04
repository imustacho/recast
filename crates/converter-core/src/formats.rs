use recast_models::{
    CodecDefinition, CodecKind, ConversionCapabilities, FormatDefinition, MediaCategory,
};
use std::collections::BTreeMap;

pub fn built_in_codecs() -> Vec<CodecDefinition> {
    vec![
        video_codec("mjpeg", "mjpeg", &["-q:v", "2"]),
        video_codec("png", "png", &[]),
        video_codec("webp", "libwebp", &["-quality", "82"]),
        video_codec("bmp", "bmp", &[]),
        video_codec("tiff", "tiff", &[]),
        video_codec("gif", "gif", &[]),
        video_codec(
            "av1",
            "libaom-av1",
            &["-crf", "30", "-b:v", "0", "-still-picture", "1"],
        ),
        video_codec("h264", "libx264", &["-preset", "medium", "-crf", "23"]),
        video_codec("vp9", "libvpx-vp9", &["-crf", "31", "-b:v", "0"]),
        video_codec("mpeg4", "mpeg4", &["-q:v", "5"]),
        video_codec("mpeg2", "mpeg2video", &["-q:v", "5"]),
        video_codec("theora", "libtheora", &["-q:v", "7"]),
        audio_codec("mp3", "libmp3lame", &["-q:a", "2"]),
        audio_codec("pcm-s16le", "pcm_s16le", &[]),
        audio_codec("pcm-s16be", "pcm_s16be", &[]),
        audio_codec("flac", "flac", &[]),
        audio_codec("aac", "aac", &["-b:a", "192k"]),
        audio_codec("vorbis", "libvorbis", &["-q:a", "5"]),
        audio_codec("opus", "libopus", &["-b:a", "160k"]),
        audio_codec("alac", "alac", &[]),
        audio_codec("ac3", "ac3", &["-b:a", "192k"]),
        audio_codec("mp2", "mp2", &["-b:a", "192k"]),
    ]
}

pub fn built_in_formats() -> Vec<FormatDefinition> {
    vec![
        image_format(
            "jpg",
            "JPG / JPEG",
            &["jpg", "jpeg"],
            &["image/jpeg"],
            "jpg",
            "mjpeg",
        ),
        image_format("png", "PNG", &["png"], &["image/png"], "png", "png"),
        image_format("webp", "WebP", &["webp"], &["image/webp"], "webp", "webp"),
        image_format("bmp", "BMP", &["bmp"], &["image/bmp"], "bmp", "bmp"),
        image_format(
            "tiff",
            "TIFF",
            &["tif", "tiff"],
            &["image/tiff"],
            "tiff",
            "tiff",
        ),
        image_format("gif", "GIF", &["gif"], &["image/gif"], "gif", "gif"),
        image_format("avif", "AVIF", &["avif"], &["image/avif"], "avif", "av1"),
        audio_format(
            "mp3",
            "MP3",
            &["mp3"],
            &["audio/mpeg"],
            "mp3",
            "mp3",
            Some("mp3"),
        ),
        audio_format(
            "wav",
            "WAV",
            &["wav"],
            &["audio/wav", "audio/x-wav"],
            "wav",
            "pcm-s16le",
            Some("wav"),
        ),
        audio_format(
            "flac",
            "FLAC",
            &["flac"],
            &["audio/flac"],
            "flac",
            "flac",
            Some("flac"),
        ),
        audio_format(
            "aac",
            "AAC",
            &["aac"],
            &["audio/aac"],
            "aac",
            "aac",
            Some("adts"),
        ),
        audio_format(
            "m4a",
            "M4A",
            &["m4a"],
            &["audio/mp4"],
            "m4a",
            "aac",
            Some("ipod"),
        ),
        audio_format(
            "ogg",
            "OGG Vorbis",
            &["ogg", "oga"],
            &["audio/ogg"],
            "ogg",
            "vorbis",
            Some("ogg"),
        ),
        audio_format(
            "opus",
            "Opus",
            &["opus"],
            &["audio/opus", "audio/ogg"],
            "opus",
            "opus",
            Some("ogg"),
        ),
        audio_format(
            "aiff",
            "AIFF",
            &["aif", "aiff", "aifc"],
            &["audio/aiff", "audio/x-aiff"],
            "aiff",
            "pcm-s16be",
            Some("aiff"),
        ),
        audio_format(
            "alac",
            "ALAC",
            &[],
            &["audio/mp4"],
            "m4a",
            "alac",
            Some("ipod"),
        ),
        audio_format(
            "ac3",
            "AC3",
            &["ac3"],
            &["audio/ac3"],
            "ac3",
            "ac3",
            Some("ac3"),
        ),
        video_format(
            "mp4",
            "MP4",
            &["mp4"],
            &["video/mp4"],
            "mp4",
            "h264",
            "aac",
            Some("mp4"),
        ),
        video_format(
            "mkv",
            "MKV",
            &["mkv"],
            &["video/x-matroska"],
            "mkv",
            "h264",
            "aac",
            Some("matroska"),
        ),
        video_format(
            "webm",
            "WebM",
            &["webm"],
            &["video/webm"],
            "webm",
            "vp9",
            "opus",
            Some("webm"),
        ),
        video_format(
            "mov",
            "MOV",
            &["mov"],
            &["video/quicktime"],
            "mov",
            "h264",
            "aac",
            Some("mov"),
        ),
        video_format(
            "avi",
            "AVI",
            &["avi"],
            &["video/x-msvideo"],
            "avi",
            "mpeg4",
            "mp3",
            Some("avi"),
        ),
        video_format(
            "m4v",
            "M4V",
            &["m4v"],
            &["video/x-m4v"],
            "m4v",
            "h264",
            "aac",
            Some("ipod"),
        ),
        video_format(
            "mpeg",
            "MPEG / MPG",
            &["mpeg", "mpg"],
            &["video/mpeg"],
            "mpeg",
            "mpeg2",
            "mp2",
            Some("mpeg"),
        ),
        video_format(
            "ogv",
            "OGV",
            &["ogv"],
            &["video/ogg"],
            "ogv",
            "theora",
            "vorbis",
            Some("ogg"),
        ),
        video_format(
            "ts",
            "TS / MTS / M2TS",
            &["ts", "mts", "m2ts"],
            &["video/mp2t"],
            "ts",
            "mpeg2",
            "mp2",
            Some("mpegts"),
        ),
        // Document - Text formats
        document_format("pdf", "PDF", &["pdf"], &["application/pdf"], "pdf"),
        document_format(
            "odt",
            "ODT (OpenDocument Text)",
            &["odt"],
            &["application/vnd.oasis.opendocument.text"],
            "odt",
        ),
        document_format(
            "docx",
            "DOCX (Word Document)",
            &["docx"],
            &["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
            "docx",
        ),
        document_format(
            "doc",
            "DOC (Word 97-2003)",
            &["doc"],
            &["application/msword"],
            "doc",
        ),
        document_format(
            "rtf",
            "RTF (Rich Text)",
            &["rtf"],
            &["application/rtf", "text/rtf"],
            "rtf",
        ),
        document_format("txt", "TXT (Plain Text)", &["txt"], &["text/plain"], "txt"),
        document_format(
            "md",
            "Markdown",
            &["md", "markdown"],
            &["text/markdown", "text/x-markdown"],
            "md",
        ),
        document_format(
            "html",
            "HTML",
            &["html", "htm", "xhtml"],
            &["text/html", "application/xhtml+xml"],
            "html",
        ),
        document_format("epub", "EPUB", &["epub"], &["application/epub+zip"], "epub"),
        // Document - Spreadsheet formats
        document_format(
            "ods",
            "ODS (OpenDocument Sheet)",
            &["ods"],
            &["application/vnd.oasis.opendocument.spreadsheet"],
            "ods",
        ),
        document_format(
            "xlsx",
            "XLSX (Excel Spreadsheet)",
            &["xlsx"],
            &["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
            "xlsx",
        ),
        document_format(
            "xls",
            "XLS (Excel 97-2003)",
            &["xls"],
            &["application/vnd.ms-excel"],
            "xls",
        ),
        document_format("csv", "CSV", &["csv"], &["text/csv"], "csv"),
        document_format(
            "tsv",
            "TSV",
            &["tsv"],
            &["text/tab-separated-values"],
            "tsv",
        ),
        // Document - Presentation formats
        document_format(
            "odp",
            "ODP (OpenDocument Presentation)",
            &["odp"],
            &["application/vnd.oasis.opendocument.presentation"],
            "odp",
        ),
        document_format(
            "pptx",
            "PPTX (PowerPoint Presentation)",
            &["pptx"],
            &["application/vnd.openxmlformats-officedocument.presentationml.presentation"],
            "pptx",
        ),
        document_format(
            "ppt",
            "PPT (PowerPoint 97-2003)",
            &["ppt"],
            &["application/vnd.ms-powerpoint"],
            "ppt",
        ),
    ]
}

pub fn conversion_capabilities() -> ConversionCapabilities {
    let targets_by_source_category = [
        MediaCategory::Image,
        MediaCategory::Audio,
        MediaCategory::Video,
        MediaCategory::Document,
    ]
    .into_iter()
    .map(|category| {
        (
            category_name(&category).to_string(),
            target_formats_for_category(&category),
        )
    })
    .collect::<BTreeMap<_, _>>();

    let formats = built_in_formats();
    let targets_by_source_format = formats
        .iter()
        .map(|format| (format.id.clone(), target_formats_for(&format.id)))
        .collect::<BTreeMap<_, _>>();

    ConversionCapabilities {
        formats,
        codecs: built_in_codecs(),
        targets_by_source_category,
        targets_by_source_format,
    }
}

pub fn detect_format(extension: &str) -> Option<FormatDefinition> {
    let extension = extension.trim_start_matches('.').to_ascii_lowercase();
    built_in_formats().into_iter().find(|format| {
        format
            .extensions
            .iter()
            .any(|candidate| candidate == &extension)
    })
}

pub fn format_by_id(id: &str) -> Option<FormatDefinition> {
    built_in_formats()
        .into_iter()
        .find(|format| format.id == id)
}

pub fn target_formats_for(source_format: &str) -> Vec<String> {
    let Some(source) = detect_format(source_format).or_else(|| format_by_id(source_format)) else {
        return Vec::new();
    };

    if source.category == MediaCategory::Document {
        return target_formats_for_document(&source.id);
    }

    target_formats_for_category(&source.category)
        .into_iter()
        .filter(|target| target != &source.id)
        .collect()
}

pub fn target_formats_for_document(source_id: &str) -> Vec<String> {
    let clean = source_id.trim_start_matches('.').to_ascii_lowercase();
    let targets: &[&str] = match clean.as_str() {
        "pdf" => &[], // PDF is output-only
        "docx" | "doc" | "odt" | "rtf" | "txt" | "md" | "markdown" | "html" | "htm" | "xhtml" => &[
            "pdf", "odt", "docx", "doc", "rtf", "txt", "md", "html", "epub",
        ],
        "epub" => &["pdf", "odt", "docx", "doc", "rtf", "txt", "html"],
        "xlsx" | "xls" | "ods" => &["pdf", "ods", "xlsx", "xls", "csv", "tsv", "html"],
        "csv" | "tsv" => &["pdf", "ods", "xlsx", "xls", "csv", "tsv"],
        "pptx" | "ppt" | "odp" => &["pdf", "odp", "pptx", "ppt"],
        _ => &[],
    };

    targets
        .iter()
        .filter(|target| **target != clean)
        .map(|target| (*target).to_string())
        .collect()
}

pub fn is_format_conversion_supported(source_format: &str, target_format: &str) -> bool {
    let clean_target = target_format.trim_start_matches('.').to_ascii_lowercase();
    target_formats_for(source_format)
        .iter()
        .any(|target| target == &clean_target)
}

pub fn target_formats_for_category(category: &MediaCategory) -> Vec<String> {
    built_in_formats()
        .into_iter()
        .filter(|format| match category {
            MediaCategory::Image => format.category == MediaCategory::Image,
            MediaCategory::Audio => format.category == MediaCategory::Audio,
            MediaCategory::Video => {
                format.category == MediaCategory::Video || format.category == MediaCategory::Audio
            }
            MediaCategory::Document => format.category == MediaCategory::Document,
        })
        .map(|format| format.id)
        .collect()
}

pub fn is_conversion_supported(source: &MediaCategory, target_id: &str) -> bool {
    target_formats_for_category(source)
        .iter()
        .any(|target| target == target_id)
}

pub fn ffmpeg_args_for(source: &MediaCategory, target_id: &str) -> Option<Vec<String>> {
    if matches!(source, MediaCategory::Document) {
        return None;
    }
    if !is_conversion_supported(source, target_id) {
        return None;
    }
    let format = format_by_id(target_id)?;
    let codecs = built_in_codecs();
    let mut args = Vec::new();
    match format.category {
        MediaCategory::Image => {
            args.extend(["-frames:v".into(), "1".into()]);
            append_codec(
                &mut args,
                "-c:v",
                format.default_video_codec.as_deref()?,
                &codecs,
            )?;
        }
        MediaCategory::Audio => {
            args.push("-vn".into());
            append_codec(
                &mut args,
                "-c:a",
                format.default_audio_codec.as_deref()?,
                &codecs,
            )?;
        }
        MediaCategory::Video => {
            append_codec(
                &mut args,
                "-c:v",
                format.default_video_codec.as_deref()?,
                &codecs,
            )?;
            append_codec(
                &mut args,
                "-c:a",
                format.default_audio_codec.as_deref()?,
                &codecs,
            )?;
            if matches!(format.id.as_str(), "mp4" | "mov" | "m4v") {
                args.extend(["-movflags".into(), "+faststart".into()]);
            }
        }
        MediaCategory::Document => return None,
    }
    if let Some(container) = format.ffmpeg_format {
        args.extend(["-f".into(), container]);
    }
    Some(args)
}

fn append_codec(
    args: &mut Vec<String>,
    flag: &str,
    codec_id: &str,
    codecs: &[CodecDefinition],
) -> Option<()> {
    let codec = codecs.iter().find(|codec| codec.id == codec_id)?;
    args.extend([flag.into(), codec.ffmpeg_encoder.clone()]);
    args.extend(codec.default_args.clone());
    Some(())
}

pub fn category_name(category: &MediaCategory) -> &'static str {
    match category {
        MediaCategory::Image => "image",
        MediaCategory::Video => "video",
        MediaCategory::Audio => "audio",
        MediaCategory::Document => "document",
    }
}

fn video_codec(id: &str, encoder: &str, args: &[&str]) -> CodecDefinition {
    codec(id, CodecKind::Video, encoder, args)
}
fn audio_codec(id: &str, encoder: &str, args: &[&str]) -> CodecDefinition {
    codec(id, CodecKind::Audio, encoder, args)
}
fn codec(id: &str, kind: CodecKind, encoder: &str, args: &[&str]) -> CodecDefinition {
    CodecDefinition {
        id: id.into(),
        kind,
        ffmpeg_encoder: encoder.into(),
        default_args: args.iter().map(|arg| (*arg).into()).collect(),
    }
}

fn image_format(
    id: &str,
    display_name: &str,
    extensions: &[&str],
    mime_types: &[&str],
    default_extension: &str,
    video_codec: &str,
) -> FormatDefinition {
    format(
        id,
        display_name,
        MediaCategory::Image,
        extensions,
        mime_types,
        default_extension,
        None,
        Some(video_codec),
        None,
    )
}
fn audio_format(
    id: &str,
    display_name: &str,
    extensions: &[&str],
    mime_types: &[&str],
    default_extension: &str,
    audio_codec: &str,
    ffmpeg_format: Option<&str>,
) -> FormatDefinition {
    format(
        id,
        display_name,
        MediaCategory::Audio,
        extensions,
        mime_types,
        default_extension,
        ffmpeg_format,
        None,
        Some(audio_codec),
    )
}
#[allow(clippy::too_many_arguments)]
fn video_format(
    id: &str,
    display_name: &str,
    extensions: &[&str],
    mime_types: &[&str],
    default_extension: &str,
    video_codec: &str,
    audio_codec: &str,
    ffmpeg_format: Option<&str>,
) -> FormatDefinition {
    format(
        id,
        display_name,
        MediaCategory::Video,
        extensions,
        mime_types,
        default_extension,
        ffmpeg_format,
        Some(video_codec),
        Some(audio_codec),
    )
}
#[allow(clippy::too_many_arguments)]
fn format(
    id: &str,
    display_name: &str,
    category: MediaCategory,
    extensions: &[&str],
    mime_types: &[&str],
    default_extension: &str,
    ffmpeg_format: Option<&str>,
    default_video_codec: Option<&str>,
    default_audio_codec: Option<&str>,
) -> FormatDefinition {
    FormatDefinition {
        id: id.into(),
        display_name: display_name.into(),
        category,
        extensions: extensions.iter().map(|value| (*value).into()).collect(),
        mime_types: mime_types.iter().map(|value| (*value).into()).collect(),
        default_extension: default_extension.into(),
        ffmpeg_format: ffmpeg_format.map(str::to_string),
        default_video_codec: default_video_codec.map(str::to_string),
        default_audio_codec: default_audio_codec.map(str::to_string),
    }
}

fn document_format(
    id: &str,
    display_name: &str,
    extensions: &[&str],
    mime_types: &[&str],
    default_extension: &str,
) -> FormatDefinition {
    format(
        id,
        display_name,
        MediaCategory::Document,
        extensions,
        mime_types,
        default_extension,
        None,
        None,
        None,
    )
}
