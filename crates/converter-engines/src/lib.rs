use recast_models::MediaCategory;
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use thiserror::Error;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EngineBinary {
    pub name: String,
    pub path: PathBuf,
    pub version_args: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EngineSet {
    pub ffmpeg: EngineBinary,
    pub ffprobe: EngineBinary,
    pub imagemagick: EngineBinary,
}

#[derive(Debug, Error)]
pub enum EngineDiscoveryError {
    #[error("required engine binary missing: {0}")]
    MissingBinary(String),
}

impl EngineSet {
    pub fn discover(base_dir: &Path) -> Result<Self, EngineDiscoveryError> {
        let ffmpeg = base_dir.join("ffmpeg.exe");
        let ffprobe = base_dir.join("ffprobe.exe");
        let imagemagick = base_dir.join("magick.exe");

        for (name, path) in [
            ("ffmpeg", &ffmpeg),
            ("ffprobe", &ffprobe),
            ("imagemagick", &imagemagick),
        ] {
            if !path.exists() {
                return Err(EngineDiscoveryError::MissingBinary(name.to_string()));
            }
        }

        Ok(Self {
            ffmpeg: EngineBinary {
                name: "ffmpeg".into(),
                path: ffmpeg,
                version_args: vec!["-version".into()],
            },
            ffprobe: EngineBinary {
                name: "ffprobe".into(),
                path: ffprobe,
                version_args: vec!["-version".into()],
            },
            imagemagick: EngineBinary {
                name: "magick".into(),
                path: imagemagick,
                version_args: vec!["-version".into()],
            },
        })
    }

    pub fn executable_for(&self, category: &MediaCategory) -> PathBuf {
        match category {
            MediaCategory::Image => self.imagemagick.path.clone(),
            MediaCategory::Video | MediaCategory::Audio => self.ffmpeg.path.clone(),
        }
    }
}
