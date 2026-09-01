use crate::errors::CoreError;
use crate::inspection::inspect_path;
use crate::paths::{resolve_output_collision, temp_output_path};
use crate::requests::validate_request;
use recast_engines::EngineSet;
use recast_models::{ConversionPlan, ConversionRequest, MediaCategory};
use std::path::Path;

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

            let final_output = output_dir.join(output_name_for(input, &request.target_format));
            let final_output = resolve_output_collision(&final_output, &request.overwrite_policy)?;
            let executable = engines.executable_for(&media.category);
            let args = build_args(
                input,
                &final_output,
                &media.category,
                &request.target_format,
            );

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

fn build_args(
    input: &Path,
    final_output: &Path,
    category: &MediaCategory,
    target_format: &str,
) -> Vec<String> {
    match category {
        MediaCategory::Image => vec![
            "convert".into(),
            input.display().to_string(),
            final_output.display().to_string(),
        ],
        MediaCategory::Video => {
            if target_format == "mp3" {
                vec![
                    "-i".into(),
                    input.display().to_string(),
                    "-vn".into(),
                    "-c:a".into(),
                    "libmp3lame".into(),
                    final_output.display().to_string(),
                ]
            } else {
                vec![
                    "-i".into(),
                    input.display().to_string(),
                    "-c:v".into(),
                    "libx264".into(),
                    "-c:a".into(),
                    "aac".into(),
                    final_output.display().to_string(),
                ]
            }
        }
        MediaCategory::Audio => vec![
            "-i".into(),
            input.display().to_string(),
            final_output.display().to_string(),
        ],
    }
}

pub fn finalize_output(temp: &Path, final_output: &Path) -> Result<(), CoreError> {
    if !temp.exists() {
        return Err(CoreError::InvalidOutput);
    }
    std::fs::rename(temp, final_output).map_err(|error| CoreError::ProcessFailed(error.to_string()))
}
