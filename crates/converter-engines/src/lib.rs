pub mod libreoffice;

pub use libreoffice::{
    build_libreoffice_args, detect_libreoffice_version, discover_libreoffice,
    libreoffice_convert_arg, libreoffice_filter_for, path_to_file_uri, LibreOfficeVersion,
};

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
    pub libreoffice: Option<EngineBinary>,
}

#[derive(Debug, Error)]
pub enum EngineDiscoveryError {
    #[error("required engine binary missing: {0}")]
    MissingBinary(String),
    #[error("unsupported engine version: {0}")]
    UnsupportedVersion(String),
}

impl EngineSet {
    pub fn discover(base_dir: &Path) -> Result<Self, EngineDiscoveryError> {
        let executable = if cfg!(windows) {
            "ffmpeg.exe"
        } else {
            "ffmpeg"
        };
        let ffmpeg = if base_dir.join(executable).exists() {
            base_dir.join(executable)
        } else if let Some(path) = find_binary_in_path(executable) {
            path
        } else {
            return Err(EngineDiscoveryError::MissingBinary("ffmpeg".into()));
        };

        let libreoffice = discover_libreoffice(Some(base_dir)).map(|path| EngineBinary {
            name: "libreoffice".into(),
            path,
            version_args: vec!["--version".into()],
        });

        Ok(Self {
            ffmpeg: EngineBinary {
                name: "ffmpeg".into(),
                path: ffmpeg,
                version_args: vec!["-version".into()],
            },
            libreoffice,
        })
    }
}

fn find_binary_in_path(name: &str) -> Option<PathBuf> {
    let paths = std::env::var_os("PATH")?;
    for path in std::env::split_paths(&paths) {
        let candidate = path.join(name);
        if candidate.is_file() {
            return Some(candidate);
        }
    }
    None
}
