use recast_core::execution::build_args;
use recast_core::formats::{
    conversion_capabilities, detect_format, ffmpeg_args_for, format_by_id, target_formats_for,
};
use recast_core::paths::{resolve_output_collision, temp_output_path};
use recast_models::{MediaCategory, OverwritePolicy};
use std::fs;

#[test]
fn png_exposes_expected_targets() {
    let targets = target_formats_for("png");
    assert!(targets.contains(&"jpg".to_string()));
    assert!(targets.contains(&"webp".to_string()));
}

#[test]
fn aliases_are_detected_as_canonical_formats() {
    assert_eq!(detect_format("JPEG").expect("jpeg").id, "jpg");
    assert_eq!(detect_format("tif").expect("tiff").id, "tiff");
    assert_eq!(detect_format("mpg").expect("mpeg").id, "mpeg");
    assert_eq!(detect_format("m2ts").expect("transport stream").id, "ts");
}

#[test]
fn catalog_contains_every_supported_format() {
    let capabilities = conversion_capabilities();
    for expected in [
        "jpg", "png", "webp", "bmp", "tiff", "gif", "avif", "mp3", "wav", "flac", "aac", "m4a",
        "ogg", "opus", "aiff", "alac", "ac3", "mp4", "mkv", "webm", "mov", "avi", "m4v", "mpeg",
        "ogv", "ts",
    ] {
        assert!(
            capabilities
                .formats
                .iter()
                .any(|format| format.id == expected),
            "missing {expected}"
        );
    }
}

#[test]
fn formats_reference_separate_known_codecs() {
    let capabilities = conversion_capabilities();
    for format in &capabilities.formats {
        for codec_id in [
            format.default_video_codec.as_ref(),
            format.default_audio_codec.as_ref(),
        ]
        .into_iter()
        .flatten()
        {
            assert!(
                capabilities
                    .codecs
                    .iter()
                    .any(|codec| &codec.id == codec_id),
                "{} references unknown codec {codec_id}",
                format.id
            );
        }
    }
}

#[test]
fn video_targets_include_audio_extraction() {
    let capabilities = conversion_capabilities();
    let targets = &capabilities.targets_by_source_category["video"];
    assert!(targets.contains(&"mkv".into()));
    assert!(targets.contains(&"mp3".into()));
    assert!(targets.contains(&"alac".into()));
}

#[test]
fn ffmpeg_mappings_keep_container_and_codecs_distinct() {
    let webm = ffmpeg_args_for(&MediaCategory::Video, "webm").expect("webm mapping");
    assert!(webm.windows(2).any(|args| args == ["-c:v", "libvpx-vp9"]));
    assert!(webm.windows(2).any(|args| args == ["-c:a", "libopus"]));
    assert!(webm.windows(2).any(|args| args == ["-f", "webm"]));

    let extracted = ffmpeg_args_for(&MediaCategory::Video, "flac").expect("flac extraction");
    assert!(extracted.contains(&"-vn".into()));
    assert!(extracted.windows(2).any(|args| args == ["-c:a", "flac"]));
}

#[test]
fn plans_use_ffmpeg_for_images_and_target_default_extension() {
    let output = std::path::Path::new("output.m4a");
    let args = build_args(
        std::path::Path::new("input.wav"),
        output,
        &MediaCategory::Audio,
        "alac",
    )
    .expect("alac args");
    assert!(args.windows(2).any(|args| args == ["-c:a", "alac"]));
    assert_eq!(
        format_by_id("alac").expect("alac format").default_extension,
        "m4a"
    );
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
