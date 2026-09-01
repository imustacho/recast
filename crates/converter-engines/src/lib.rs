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
}

#[derive(Debug, Error)]
pub enum EngineDiscoveryError {
    #[error("required engine binary missing: {0}")]
    MissingBinary(String),
}

impl EngineSet {
    pub fn discover(base_dir: &Path) -> Result<Self, EngineDiscoveryError> {
        let executable = if cfg!(windows) {
            "ffmpeg.exe"
        } else {
            "ffmpeg"
        };
        let ffmpeg = base_dir.join(executable);
        if !ffmpeg.exists() {
            return Err(EngineDiscoveryError::MissingBinary("ffmpeg".into()));
        }

        Ok(Self {
            ffmpeg: EngineBinary {
                name: "ffmpeg".into(),
                path: ffmpeg,
                version_args: vec!["-version".into()],
            },
        })
    }
}
