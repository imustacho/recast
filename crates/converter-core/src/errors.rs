use recast_models::ConversionError;
use thiserror::Error;

#[derive(Debug, Clone, Copy)]
pub enum ConversionErrorCode {
    UnsupportedInput,
    UnsupportedOutput,
    InvalidPreset,
    InspectionFailed,
    EngineNotFound,
    ProcessFailed,
    PermissionDenied,
    OutputExists,
    DiskFull,
    Cancelled,
    InvalidOutput,
    Unknown,
}

#[derive(Debug, Error)]
pub enum CoreError {
    #[error("unsupported input")]
    UnsupportedInput,
    #[error("unsupported output")]
    UnsupportedOutput,
    #[error("invalid preset")]
    InvalidPreset,
    #[error("inspection failed: {0}")]
    InspectionFailed(String),
    #[error("engine not found: {0}")]
    EngineNotFound(String),
    #[error("process failed: {0}")]
    ProcessFailed(String),
    #[error("permission denied")]
    PermissionDenied,
    #[error("output already exists")]
    OutputExists,
    #[error("disk full")]
    DiskFull,
    #[error("cancelled")]
    Cancelled,
    #[error("invalid output")]
    InvalidOutput,
    #[error("unknown error: {0}")]
    Unknown(String),
}

impl CoreError {
    pub fn to_public_error(&self) -> ConversionError {
        let (code, recoverable) = match self {
            Self::UnsupportedInput => (ConversionErrorCode::UnsupportedInput, true),
            Self::UnsupportedOutput => (ConversionErrorCode::UnsupportedOutput, true),
            Self::InvalidPreset => (ConversionErrorCode::InvalidPreset, true),
            Self::InspectionFailed(_) => (ConversionErrorCode::InspectionFailed, true),
            Self::EngineNotFound(_) => (ConversionErrorCode::EngineNotFound, false),
            Self::ProcessFailed(_) => (ConversionErrorCode::ProcessFailed, true),
            Self::PermissionDenied => (ConversionErrorCode::PermissionDenied, true),
            Self::OutputExists => (ConversionErrorCode::OutputExists, true),
            Self::DiskFull => (ConversionErrorCode::DiskFull, true),
            Self::Cancelled => (ConversionErrorCode::Cancelled, true),
            Self::InvalidOutput => (ConversionErrorCode::InvalidOutput, true),
            Self::Unknown(_) => (ConversionErrorCode::Unknown, false),
        };

        ConversionError {
            code: format!("{code:?}"),
            message: self.to_string(),
            technical_details: None,
            recoverable,
        }
    }
}
