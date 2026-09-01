use crate::errors::CoreError;
use recast_models::{MediaCategory, MediaInfo};
use std::fs;
use std::path::Path;

pub fn inspect_path(path: &Path) -> Result<MediaInfo, CoreError> {
    let metadata =
        fs::metadata(path).map_err(|error| CoreError::InspectionFailed(error.to_string()))?;
    let extension = path
        .extension()
        .and_then(|value| value.to_str())
        .unwrap_or_default()
        .to_ascii_lowercase();

    let category = match extension.as_str() {
        "png" | "jpg" | "jpeg" | "webp" | "avif" | "gif" | "bmp" | "tiff" | "ico" => {
            MediaCategory::Image
        }
        "mp4" | "mkv" | "webm" | "mov" | "avi" => MediaCategory::Video,
        "mp3" | "wav" | "flac" | "ogg" | "aac" | "m4a" | "opus" => MediaCategory::Audio,
        _ => return Err(CoreError::UnsupportedInput),
    };

    Ok(MediaInfo {
        path: path.to_path_buf(),
        category,
        detected_format: extension,
        duration_ms: None,
        width: None,
        height: None,
        frame_rate: None,
        bitrate: None,
        video_codec: None,
        audio_codec: None,
        audio_channels: None,
        file_size: metadata.len(),
    })
}
