use crate::errors::CoreError;
use crate::formats::{detect_format, is_format_conversion_supported};
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

        let source = detect_format(&extension).ok_or(CoreError::UnsupportedInput)?;
        if !is_format_conversion_supported(&source.id, &request.target_format) {
            return Err(CoreError::UnsupportedOutput);
        }
    }

    Ok(())
}
