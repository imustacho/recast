use crate::errors::CoreError;
use recast_models::OverwritePolicy;
use std::path::{Path, PathBuf};

pub fn temp_output_path(final_output: &Path) -> PathBuf {
    let file_name = final_output
        .file_name()
        .and_then(|name| name.to_str())
        .map(|name| format!("{name}.recast-temp"))
        .unwrap_or_else(|| "output.recast-temp".into());
    final_output.with_file_name(file_name)
}

pub fn resolve_output_collision(
    path: &Path,
    policy: &OverwritePolicy,
) -> Result<PathBuf, CoreError> {
    if !path.exists() {
        return Ok(path.to_path_buf());
    }

    match policy {
        OverwritePolicy::Overwrite => Ok(path.to_path_buf()),
        OverwritePolicy::Skip => Err(CoreError::OutputExists),
        OverwritePolicy::Ask => Err(CoreError::OutputExists),
        OverwritePolicy::Rename => {
            let stem = path
                .file_stem()
                .and_then(|value| value.to_str())
                .unwrap_or("output");
            let ext = path
                .extension()
                .and_then(|value| value.to_str())
                .unwrap_or("");
            let parent = path.parent().unwrap_or_else(|| Path::new("."));

            for index in 1..10_000 {
                let candidate = if ext.is_empty() {
                    parent.join(format!("{stem} ({index})"))
                } else {
                    parent.join(format!("{stem} ({index}).{ext}"))
                };

                if !candidate.exists() {
                    return Ok(candidate);
                }
            }

            Err(CoreError::OutputExists)
        }
    }
}
