use recast_engines::EngineSet;
use std::fs;

#[test]
fn discovery_requires_only_ffmpeg() {
    let root = std::env::temp_dir().join(format!("recast-engine-test-{}", std::process::id()));
    fs::create_dir_all(&root).expect("fixture directory");
    let executable = if cfg!(windows) {
        "ffmpeg.exe"
    } else {
        "ffmpeg"
    };
    fs::write(root.join(executable), b"fixture").expect("ffmpeg fixture");

    let engines = EngineSet::discover(&root).expect("FFmpeg-only engine set");
    assert_eq!(engines.ffmpeg.name, "ffmpeg");

    fs::remove_file(root.join(executable)).expect("remove fixture");
    fs::remove_dir(root).expect("remove directory");
}
