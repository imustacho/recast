use recast_models::{FormatDefinition, MediaCategory};

pub fn built_in_formats() -> Vec<FormatDefinition> {
    vec![
        FormatDefinition {
            id: "png".into(),
            category: MediaCategory::Image,
            extensions: vec!["png".into()],
            mime_types: vec!["image/png".into()],
            output_formats: vec!["jpg".into(), "webp".into(), "avif".into(), "bmp".into()],
        },
        FormatDefinition {
            id: "jpg".into(),
            category: MediaCategory::Image,
            extensions: vec!["jpg".into(), "jpeg".into()],
            mime_types: vec!["image/jpeg".into()],
            output_formats: vec!["png".into(), "webp".into(), "avif".into(), "bmp".into()],
        },
        FormatDefinition {
            id: "webp".into(),
            category: MediaCategory::Image,
            extensions: vec!["webp".into()],
            mime_types: vec!["image/webp".into()],
            output_formats: vec!["png".into(), "jpg".into(), "avif".into()],
        },
        FormatDefinition {
            id: "mp4".into(),
            category: MediaCategory::Video,
            extensions: vec!["mp4".into()],
            mime_types: vec!["video/mp4".into()],
            output_formats: vec!["mkv".into(), "webm".into(), "mp3".into()],
        },
        FormatDefinition {
            id: "mkv".into(),
            category: MediaCategory::Video,
            extensions: vec!["mkv".into()],
            mime_types: vec!["video/x-matroska".into()],
            output_formats: vec!["mp4".into(), "webm".into(), "mp3".into()],
        },
        FormatDefinition {
            id: "mp3".into(),
            category: MediaCategory::Audio,
            extensions: vec!["mp3".into()],
            mime_types: vec!["audio/mpeg".into()],
            output_formats: vec!["wav".into(), "flac".into(), "ogg".into()],
        },
        FormatDefinition {
            id: "wav".into(),
            category: MediaCategory::Audio,
            extensions: vec!["wav".into()],
            mime_types: vec!["audio/wav".into()],
            output_formats: vec!["mp3".into(), "flac".into(), "ogg".into()],
        },
    ]
}

pub fn target_formats_for(source_format: &str) -> Vec<String> {
    built_in_formats()
        .into_iter()
        .find(|format| format.id == source_format)
        .map(|format| format.output_formats)
        .unwrap_or_default()
}
