use recast_models::ProgressEvent;
use uuid::Uuid;

pub fn parse_ffmpeg_progress(job_id: Uuid, line: &str) -> Option<ProgressEvent> {
    let mut event = ProgressEvent {
        job_id,
        progress: 0.0,
        processed_duration_ms: None,
        total_duration_ms: None,
        speed: None,
        eta_seconds: None,
        current_frame: None,
        current_file: None,
        message: None,
    };

    for part in line.split('\n') {
        if let Some(value) = part.strip_prefix("frame=") {
            event.current_frame = value.trim().parse().ok();
        } else if let Some(value) = part.strip_prefix("speed=") {
            event.speed = Some(value.trim().to_string());
        } else if let Some(value) = part.strip_prefix("progress=") {
            event.message = Some(value.trim().to_string());
        }
    }

    event.message.as_ref()?;
    Some(event)
}
