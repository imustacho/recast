use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;
use std::path::PathBuf;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum MediaCategory {
    Image,
    Video,
    Audio,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FormatDefinition {
    pub id: String,
    pub display_name: String,
    pub category: MediaCategory,
    pub extensions: Vec<String>,
    pub mime_types: Vec<String>,
    pub default_extension: String,
    pub ffmpeg_format: Option<String>,
    pub default_video_codec: Option<String>,
    pub default_audio_codec: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum CodecKind {
    Video,
    Audio,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CodecDefinition {
    pub id: String,
    pub kind: CodecKind,
    pub ffmpeg_encoder: String,
    pub default_args: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConversionCapabilities {
    pub formats: Vec<FormatDefinition>,
    pub codecs: Vec<CodecDefinition>,
    pub targets_by_source_category: BTreeMap<String, Vec<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MediaInfo {
    pub path: PathBuf,
    pub category: MediaCategory,
    pub detected_format: String,
    pub duration_ms: Option<u64>,
    pub width: Option<u32>,
    pub height: Option<u32>,
    pub frame_rate: Option<f64>,
    pub bitrate: Option<u64>,
    pub video_codec: Option<String>,
    pub audio_codec: Option<String>,
    pub audio_channels: Option<u32>,
    pub file_size: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConversionRequest {
    pub input_paths: Vec<PathBuf>,
    pub target_format: String,
    pub preset_id: Option<String>,
    pub output_directory: Option<PathBuf>,
    pub overwrite_policy: OverwritePolicy,
    pub options: BTreeMap<String, serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum OverwritePolicy {
    Rename,
    Overwrite,
    Skip,
    Ask,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConversionPlan {
    pub executable: PathBuf,
    pub args: Vec<String>,
    pub temp_output: PathBuf,
    pub final_output: PathBuf,
    pub category: MediaCategory,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum JobStatus {
    Pending,
    Inspecting,
    Ready,
    Processing,
    Completed,
    Failed,
    Cancelled,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConversionError {
    pub code: String,
    pub message: String,
    pub technical_details: Option<String>,
    pub recoverable: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConversionJob {
    pub id: Uuid,
    pub input_path: PathBuf,
    pub output_path: Option<PathBuf>,
    pub source_format: Option<String>,
    pub target_format: String,
    pub preset_id: Option<String>,
    pub status: JobStatus,
    pub progress: f32,
    pub current_step: Option<String>,
    pub error: Option<ConversionError>,
    pub created_at: DateTime<Utc>,
    pub started_at: Option<DateTime<Utc>>,
    pub completed_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConversionHistoryEntry {
    pub id: Uuid,
    pub input_path: PathBuf,
    pub output_path: Option<PathBuf>,
    pub target_format: String,
    pub preset_id: Option<String>,
    pub status: String,
    pub started_at: DateTime<Utc>,
    pub completed_at: Option<DateTime<Utc>>,
    pub original_size: Option<u64>,
    pub output_size: Option<u64>,
    pub error_code: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PresetDefinition {
    pub id: String,
    pub name: String,
    pub category: MediaCategory,
    pub target_format: String,
    pub settings: BTreeMap<String, serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PresetFile {
    pub version: u32,
    pub presets: Vec<PresetDefinition>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProgressEvent {
    pub job_id: Uuid,
    pub progress: f32,
    pub processed_duration_ms: Option<u64>,
    pub total_duration_ms: Option<u64>,
    pub speed: Option<String>,
    pub eta_seconds: Option<u64>,
    pub current_frame: Option<u64>,
    pub current_file: Option<PathBuf>,
    pub message: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppSettings {
    pub theme: String,
    pub language: String,
    pub default_output_mode: String,
    pub custom_output_directory: Option<PathBuf>,
    pub overwrite_policy: OverwritePolicy,
    pub image_concurrency: usize,
    pub audio_concurrency: usize,
    pub video_concurrency: usize,
    pub preserve_metadata: bool,
    pub notifications_enabled: bool,
    pub minimize_to_tray: bool,
    pub hardware_acceleration: String,
    pub context_menu_enabled: bool,
}
