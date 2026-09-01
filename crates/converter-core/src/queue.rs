use chrono::Utc;
use recast_models::{ConversionJob, JobStatus};
use parking_lot::Mutex;
use std::collections::VecDeque;
use std::path::PathBuf;
use std::sync::Arc;
use uuid::Uuid;

#[derive(Clone, Default)]
pub struct QueueState {
    jobs: Arc<Mutex<VecDeque<ConversionJob>>>,
}

impl QueueState {
    pub fn add_job(
        &self,
        input_path: PathBuf,
        target_format: String,
        preset_id: Option<String>,
    ) -> ConversionJob {
        let job = ConversionJob {
            id: Uuid::new_v4(),
            input_path,
            output_path: None,
            source_format: None,
            target_format,
            preset_id,
            status: JobStatus::Pending,
            progress: 0.0,
            current_step: None,
            error: None,
            created_at: Utc::now(),
            started_at: None,
            completed_at: None,
        };
        self.jobs.lock().push_back(job.clone());
        job
    }

    pub fn list_jobs(&self) -> Vec<ConversionJob> {
        self.jobs.lock().iter().cloned().collect()
    }
}
