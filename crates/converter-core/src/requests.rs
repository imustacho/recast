use crate::errors::CoreError;
use crate::formats::target_formats_for;
use recast_models::ConversionRequest;

pub fn validate_request(request: &ConversionRequest) -> Result<(), CoreError> {
    if request.input_paths.is_empty() {
        return Err(CoreError::UnsupportedInput);
    }

    if request.target_format.trim().is_empty() {
        return Err(CoreError::UnsupportedOutput);
    }

    for input in &request.input_paths {
        let extension = input
            .extension()
            .and_then(|value| value.to_str())
            .unwrap_or_default()
            .to_ascii_lowercase();

        let targets = target_formats_for(&extension);
        if !targets.contains(&request.target_format) {
            return Err(CoreError::UnsupportedOutput);
        }
    }

    Ok(())
}
