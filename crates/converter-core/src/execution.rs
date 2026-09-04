use crate::errors::CoreError;
use crate::formats::{ffmpeg_args_for, format_by_id};
use crate::inspection::inspect_path;
use crate::paths::{resolve_output_collision, temp_output_path};
use crate::requests::validate_request;
use recast_engines::EngineSet;
use recast_models::{ConversionPlan, ConversionRequest, MediaCategory};
use std::path::{Path, PathBuf};

pub fn build_plan(
    request: &ConversionRequest,
    engines: &EngineSet,
) -> Result<Vec<ConversionPlan>, CoreError> {
    validate_request(request)?;

    request
        .input_paths
        .iter()
        .map(|input| {
            let media = inspect_path(input)?;
            let output_dir = request
                .output_directory
                .clone()
                .or_else(|| input.parent().map(Path::to_path_buf))
                .ok_or(CoreError::InvalidOutput)?;

            let target =
                format_by_id(&request.target_format).ok_or(CoreError::UnsupportedOutput)?;
            let final_output = output_dir.join(output_name_for(input, &target.default_extension));
            let final_output = resolve_output_collision(&final_output, &request.overwrite_policy)?;

            let (executable, args) = if media.category == MediaCategory::Document {
                let libreoffice = engines.libreoffice.as_ref().ok_or_else(|| {
                    CoreError::EngineNotFound(
                        "LibreOffice document engine is unavailable. Please install LibreOffice or set the LIBREOFFICE_PATH environment variable.".into(),
                    )
                })?;

                let is_markdown = media.detected_format == "md" || request.target_format == "md";
                if is_markdown {
                    if let Some(version) = recast_engines::detect_libreoffice_version(&libreoffice.path) {
                        if !version.supports_markdown() {
                            return Err(CoreError::ProcessFailed(format!(
                                "Markdown conversion requires LibreOffice 26.2 or newer (detected version: {}.{}.{})",
                                version.major, version.minor, version.patch
                            )));
                        }
                    }
                }

                let args = build_libreoffice_args(
                    input,
                    &output_dir,
                    &media.detected_format,
                    &request.target_format,
                    None,
                )?;

                (libreoffice.path.clone(), args)
            } else {
                let executable = engines.ffmpeg.path.clone();
                let args = build_args(
                    input,
                    &final_output,
                    &media.category,
                    &request.target_format,
                )?;
                (executable, args)
            };

            Ok(ConversionPlan {
                executable,
                args,
                temp_output: temp_output_path(&final_output),
                final_output,
                category: media.category,
            })
        })
        .collect()
}

fn output_name_for(input: &Path, target_format: &str) -> String {
    let stem = input
        .file_stem()
        .and_then(|value| value.to_str())
        .unwrap_or("output");
    format!("{stem}.{target_format}")
}

pub fn build_libreoffice_args(
    input: &Path,
    outdir: &Path,
    source_format: &str,
    target_format: &str,
    profile_dir: Option<&Path>,
) -> Result<Vec<String>, CoreError> {
    Ok(recast_engines::build_libreoffice_args(
        input,
        outdir,
        source_format,
        target_format,
        profile_dir,
    ))
}

pub fn build_args(
    input: &Path,
    final_output: &Path,
    category: &MediaCategory,
    target_format: &str,
) -> Result<Vec<String>, CoreError> {
    if *category == MediaCategory::Document {
        let outdir = final_output.parent().unwrap_or(Path::new("."));
        let source_format = input.extension().and_then(|ext| ext.to_str()).unwrap_or("");
        return build_libreoffice_args(input, outdir, source_format, target_format, None);
    }
    let mut args = vec!["-i".into(), input.display().to_string()];
    args.extend(ffmpeg_args_for(category, target_format).ok_or(CoreError::UnsupportedOutput)?);
    args.push(final_output.display().to_string());
    Ok(args)
}

pub fn finalize_output(temp: &Path, final_output: &Path) -> Result<(), CoreError> {
    if !temp.exists() {
        return Err(CoreError::InvalidOutput);
    }
    std::fs::rename(temp, final_output).map_err(|error| CoreError::ProcessFailed(error.to_string()))
}

struct TempDirGuard(PathBuf);

impl Drop for TempDirGuard {
    fn drop(&mut self) {
        let _ = std::fs::remove_dir_all(&self.0);
    }
}

pub async fn execute_document_conversion(
    libreoffice_path: &Path,
    input: &Path,
    final_output: &Path,
    source_format: &str,
    target_format: &str,
) -> Result<PathBuf, CoreError> {
    let temp_job_dir = std::env::temp_dir().join(format!("recast-lo-{}", uuid::Uuid::new_v4()));
    std::fs::create_dir_all(&temp_job_dir)
        .map_err(|e| CoreError::ProcessFailed(format!("Failed to create temp directory: {e}")))?;
    let _guard = TempDirGuard(temp_job_dir.clone());

    let profile_dir = temp_job_dir.join("profile");
    let work_outdir = temp_job_dir.join("out");
    std::fs::create_dir_all(&profile_dir).map_err(|e| {
        CoreError::ProcessFailed(format!("Failed to create profile directory: {e}"))
    })?;
    std::fs::create_dir_all(&work_outdir)
        .map_err(|e| CoreError::ProcessFailed(format!("Failed to create work directory: {e}")))?;

    let args = recast_engines::build_libreoffice_args(
        input,
        &work_outdir,
        source_format,
        target_format,
        Some(&profile_dir),
    );

    let mut cmd = tokio::process::Command::new(libreoffice_path);
    cmd.args(&args);
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        cmd.as_std_mut().creation_flags(0x0800_0000); // CREATE_NO_WINDOW
    }

    let output = cmd.output().await.map_err(|e| {
        CoreError::ProcessFailed(format!(
            "Failed to run LibreOffice at '{}': {e}",
            libreoffice_path.display()
        ))
    })?;

    let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
    let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();

    if !output.status.success() {
        let details = if !stderr.is_empty() {
            stderr
        } else if !stdout.is_empty() {
            stdout
        } else {
            format!("Exit status: {:?}", output.status)
        };
        return Err(CoreError::ProcessFailed(format!(
            "LibreOffice conversion failed: {details}"
        )));
    }

    let target_def = format_by_id(target_format).ok_or(CoreError::UnsupportedOutput)?;
    let stem = input
        .file_stem()
        .and_then(|v| v.to_str())
        .unwrap_or("output");
    let expected_file = work_outdir.join(format!("{stem}.{}", target_def.default_extension));

    let actual_produced = if expected_file.is_file() {
        expected_file
    } else {
        let mut found = None;
        if let Ok(entries) = std::fs::read_dir(&work_outdir) {
            for entry in entries.flatten() {
                let p = entry.path();
                if p.is_file() {
                    if let Some(ext) = p.extension().and_then(|e| e.to_str()) {
                        if ext.eq_ignore_ascii_case(&target_def.default_extension) {
                            found = Some(p);
                            break;
                        }
                    }
                }
            }
        }
        found.ok_or_else(|| {
            let details = if !stderr.is_empty() {
                stderr
            } else if !stdout.is_empty() {
                stdout
            } else {
                "Unknown error".into()
            };
            CoreError::ProcessFailed(format!(
                "LibreOffice completed but no output file was generated: {details}"
            ))
        })?
    };

    if let Some(parent) = final_output.parent() {
        std::fs::create_dir_all(parent).map_err(|e| {
            CoreError::ProcessFailed(format!("Failed to create destination folder: {e}"))
        })?;
    }

    if std::fs::rename(&actual_produced, final_output).is_err() {
        std::fs::copy(&actual_produced, final_output).map_err(|e| {
            CoreError::ProcessFailed(format!(
                "Failed to place output file at '{}': {e}",
                final_output.display()
            ))
        })?;
        let _ = std::fs::remove_file(&actual_produced);
    }

    Ok(final_output.to_path_buf())
}
