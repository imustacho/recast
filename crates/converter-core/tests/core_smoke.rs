use recast_core::formats::target_formats_for;
use recast_core::paths::{resolve_output_collision, temp_output_path};
use recast_models::OverwritePolicy;
use std::fs;

#[test]
fn png_exposes_expected_targets() {
    let targets = target_formats_for("png");
    assert!(targets.contains(&"jpg".to_string()));
    assert!(targets.contains(&"webp".to_string()));
}

#[test]
fn temp_output_suffix_is_appended() {
    let path = temp_output_path(std::path::Path::new("sample.mp4"));
    assert_eq!(path.to_string_lossy(), "sample.mp4.recast-temp");
}

#[test]
fn rename_policy_avoids_existing_file() {
    let root = std::env::temp_dir().join(format!("recast-test-{}", std::process::id()));
    let _ = fs::create_dir_all(&root);
    let file = root.join("photo.jpg");
    fs::write(&file, b"existing").expect("write fixture");

    let renamed = resolve_output_collision(&file, &OverwritePolicy::Rename).expect("rename path");
    assert_ne!(renamed, file);

    let _ = fs::remove_file(&file);
    let _ = fs::remove_dir(&root);
}
