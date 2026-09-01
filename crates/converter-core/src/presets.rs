use crate::errors::CoreError;
use recast_models::{PresetDefinition, PresetFile};
use std::fs;
use std::path::Path;

pub fn load_presets(path: &Path) -> Result<Vec<PresetDefinition>, CoreError> {
    let raw = fs::read_to_string(path).map_err(|error| CoreError::Unknown(error.to_string()))?;
    let parsed: PresetFile =
        serde_json::from_str(&raw).map_err(|error| CoreError::Unknown(error.to_string()))?;
    Ok(parsed.presets)
}
