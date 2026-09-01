use crate::errors::CoreError;
use crate::formats::detect_format;
use recast_models::MediaInfo;
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

    let format = detect_format(&extension).ok_or(CoreError::UnsupportedInput)?;

    Ok(MediaInfo {
        path: path.to_path_buf(),
        category: format.category,
        detected_format: format.id,
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
