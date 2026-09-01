use recast_core::inspection::inspect_path;
use recast_core::paths::resolve_output_collision;
use recast_core::queue::QueueState;
use recast_models::{ConversionJob, ConversionRequest, MediaCategory, OverwritePolicy};
use serde::Serialize;
use std::path::{Path, PathBuf};
use std::sync::OnceLock;
use tauri::{AppHandle, Manager};
use tokio::process::Command;

static QUEUE: OnceLock<QueueState> = OnceLock::new();

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct UiMediaFile {
    path: String,
    detected_format: String,
    category: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ConversionResult {
    input_path: PathBuf,
    output_path: Option<PathBuf>,
    success: bool,
    error: Option<String>,
}

#[derive(Default, Serialize)]
#[serde(rename_all = "camelCase")]
struct LaunchRequest {
    paths: Vec<String>,
    target_format: Option<String>,
    auto_start: bool,
}

#[tauri::command]
fn inspect_files(paths: Vec<String>) -> Result<Vec<UiMediaFile>, String> {
    paths
        .into_iter()
        .map(|path| {
            let info = inspect_path(Path::new(&path)).map_err(|error| error.to_string())?;
            Ok(UiMediaFile {
                path,
                detected_format: info.detected_format,
                category: category_name(&info.category).into(),
            })
        })
        .collect()
}

#[tauri::command]
fn queue_conversion(request: ConversionRequest) -> Result<Vec<ConversionJob>, String> {
    let queue = QUEUE.get_or_init(QueueState::default);
    let jobs = request
        .input_paths
        .into_iter()
        .map(|input| {
            queue.add_job(
                input,
                request.target_format.clone(),
                request.preset_id.clone(),
            )
        })
        .collect();
    Ok(jobs)
}

#[tauri::command]
async fn convert_files(app: AppHandle, request: ConversionRequest) -> Vec<ConversionResult> {
    let ffmpeg = find_ffmpeg(&app);
    let mut results = Vec::with_capacity(request.input_paths.len());

    for input in &request.input_paths {
        results.push(convert_one(&ffmpeg, input, &request).await);
    }

    results
}

async fn convert_one(ffmpeg: &Path, input: &Path, request: &ConversionRequest) -> ConversionResult {
    let failure = |message: String| ConversionResult {
        input_path: input.to_path_buf(),
        output_path: None,
        success: false,
        error: Some(message),
    };

    let media = match inspect_path(input) {
        Ok(media) => media,
        Err(error) => return failure(error.to_string()),
    };

    if let Err(message) = validate_target(&media.category, &request.target_format) {
        return failure(message);
    }

    let output_directory = request
        .output_directory
        .clone()
        .or_else(|| input.parent().map(Path::to_path_buf));
    let Some(output_directory) = output_directory else {
        return failure("Output directory could not be determined".into());
    };

    let stem = input
        .file_stem()
        .and_then(|value| value.to_str())
        .unwrap_or("output");
    let requested_output = output_directory.join(format!("{stem}.{}", request.target_format));
    let output_path = match resolve_output_collision(&requested_output, &request.overwrite_policy) {
        Ok(path) => path,
        Err(error) => return failure(error.to_string()),
    };

    let mut command = hidden_command(ffmpeg);
    command.args(["-hide_banner", "-loglevel", "error"]);
    if request.overwrite_policy == OverwritePolicy::Overwrite {
        command.arg("-y");
    } else {
        command.arg("-n");
    }
    command.arg("-i").arg(input);
    add_conversion_args(&mut command, &media.category, &request.target_format);
    command.arg(&output_path);

    match command.output().await {
        Ok(output) if output.status.success() => ConversionResult {
            input_path: input.to_path_buf(),
            output_path: Some(output_path),
            success: true,
            error: None,
        },
        Ok(output) => {
            let details = String::from_utf8_lossy(&output.stderr).trim().to_string();
            failure(if details.is_empty() {
                format!("FFmpeg exited with status {}", output.status)
            } else {
                details
            })
        }
        Err(error) => failure(format!(
            "FFmpeg could not be started at '{}': {error}",
            ffmpeg.display()
        )),
    }
}

fn validate_target(category: &MediaCategory, target: &str) -> Result<(), String> {
    let supported = match category {
        MediaCategory::Image => ["jpg", "jpeg", "png", "webp", "bmp", "gif"].as_slice(),
        MediaCategory::Video => ["mp4", "mkv", "webm", "gif", "mp3", "wav"].as_slice(),
        MediaCategory::Audio => ["mp3", "wav", "flac", "ogg", "m4a"].as_slice(),
    };

    if supported.contains(&target) {
        Ok(())
    } else {
        Err(format!(
            "{} files cannot be converted to {target}",
            category_name(category)
        ))
    }
}

fn add_conversion_args(command: &mut Command, category: &MediaCategory, target: &str) {
    match (category, target) {
        (MediaCategory::Image, _) => {
            command.args(["-frames:v", "1"]);
        }
        (MediaCategory::Video, "mp3") => {
            command.args(["-vn", "-c:a", "libmp3lame", "-q:a", "2"]);
        }
        (MediaCategory::Video, "wav") => {
            command.args(["-vn", "-c:a", "pcm_s16le"]);
        }
        (MediaCategory::Video, "webm") => {
            command.args(["-c:v", "libvpx-vp9", "-c:a", "libopus"]);
        }
        (MediaCategory::Video, "gif") => {
            command.args(["-vf", "fps=12,scale=960:-1:flags=lanczos"]);
        }
        (MediaCategory::Video, _) => {
            command.args([
                "-c:v",
                "libx264",
                "-preset",
                "medium",
                "-crf",
                "23",
                "-c:a",
                "aac",
                "-movflags",
                "+faststart",
            ]);
        }
        (MediaCategory::Audio, "mp3") => {
            command.args(["-c:a", "libmp3lame", "-q:a", "2"]);
        }
        (MediaCategory::Audio, "m4a") => {
            command.args(["-c:a", "aac", "-b:a", "192k"]);
        }
        (MediaCategory::Audio, "ogg") => {
            command.args(["-c:a", "libvorbis", "-q:a", "5"]);
        }
        (MediaCategory::Audio, "wav") => {
            command.args(["-c:a", "pcm_s16le"]);
        }
        (MediaCategory::Audio, "flac") => {
            command.args(["-c:a", "flac"]);
        }
        (MediaCategory::Audio, _) => {}
    }
}

fn find_ffmpeg(app: &AppHandle) -> PathBuf {
    let executable = if cfg!(windows) {
        "ffmpeg.exe"
    } else {
        "ffmpeg"
    };
    let mut candidates = Vec::new();

    if let Ok(resource_dir) = app.path().resource_dir() {
        candidates.push(resource_dir.join("resources/engines").join(executable));
        candidates.push(resource_dir.join("engines").join(executable));
    }
    if let Ok(current_exe) = std::env::current_exe() {
        if let Some(directory) = current_exe.parent() {
            candidates.push(directory.join("resources/engines").join(executable));
            candidates.push(directory.join("engines").join(executable));
        }
    }

    candidates
        .into_iter()
        .find(|path| path.is_file())
        .unwrap_or_else(|| PathBuf::from(executable))
}

fn hidden_command(program: &Path) -> Command {
    let mut command = Command::new(program);
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        command.as_std_mut().creation_flags(0x0800_0000);
    }
    command
}

fn category_name(category: &MediaCategory) -> &'static str {
    match category {
        MediaCategory::Image => "image",
        MediaCategory::Video => "video",
        MediaCategory::Audio => "audio",
    }
}

#[tauri::command]
fn get_launch_request() -> LaunchRequest {
    let args: Vec<String> = std::env::args().skip(1).collect();
    match args.as_slice() {
        [flag, target, paths @ ..] if flag == "--quick-convert" => LaunchRequest {
            paths: paths.to_vec(),
            target_format: Some(target.clone()),
            auto_start: true,
        },
        [flag, paths @ ..] if flag == "--open" => LaunchRequest {
            paths: paths.to_vec(),
            target_format: None,
            auto_start: false,
        },
        _ => LaunchRequest::default(),
    }
}

#[tauri::command]
fn install_context_menu() -> Result<(), String> {
    let executable = std::env::current_exe().map_err(|error| error.to_string())?;
    shell_integration::install_windows_context_menu(&executable).map_err(|error| error.to_string())
}

#[tauri::command]
fn remove_context_menu() -> Result<(), String> {
    shell_integration::remove_windows_context_menu().map_err(|error| error.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .setup(|_| {
            #[cfg(windows)]
            if let Ok(executable) = std::env::current_exe() {
                if let Err(error) = shell_integration::install_windows_context_menu(&executable) {
                    eprintln!("Could not install Recast context menu: {error}");
                }
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            inspect_files,
            queue_conversion,
            convert_files,
            get_launch_request,
            install_context_menu,
            remove_context_menu
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
