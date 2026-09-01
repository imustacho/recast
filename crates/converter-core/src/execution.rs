use crate::errors::CoreError;
use crate::formats::{ffmpeg_args_for, format_by_id};
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

            let target =
                format_by_id(&request.target_format).ok_or(CoreError::UnsupportedOutput)?;
            let final_output = output_dir.join(output_name_for(input, &target.default_extension));
            let final_output = resolve_output_collision(&final_output, &request.overwrite_policy)?;
            let executable = engines.ffmpeg.path.clone();
            let args = build_args(
                input,
                &final_output,
                &media.category,
                &request.target_format,
            )?;

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

pub fn build_args(
    input: &Path,
    final_output: &Path,
    category: &MediaCategory,
    target_format: &str,
) -> Result<Vec<String>, CoreError> {
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
