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

#[test]
fn document_extensions_and_aliases_are_detected() {
    let docx = detect_format("docx").expect("docx");
    assert_eq!(docx.id, "docx");
    assert_eq!(docx.category, MediaCategory::Document);

    let md_alias = detect_format("markdown").expect("markdown alias");
    assert_eq!(md_alias.id, "md");
    assert_eq!(md_alias.category, MediaCategory::Document);

    let htm_alias = detect_format("htm").expect("htm alias");
    assert_eq!(htm_alias.id, "html");

    let pdf = detect_format("pdf").expect("pdf");
    assert_eq!(pdf.id, "pdf");
    assert_eq!(pdf.category, MediaCategory::Document);

    let odt = detect_format("odt").expect("odt");
    assert_eq!(odt.id, "odt");

    let xlsx = detect_format("xlsx").expect("xlsx");
    assert_eq!(xlsx.id, "xlsx");

    let pptx = detect_format("pptx").expect("pptx");
    assert_eq!(pptx.id, "pptx");
}

#[test]
fn pdf_supports_text_document_targets() {
    let pdf_targets = target_formats_for("pdf");
    assert!(
        !pdf_targets.is_empty(),
        "PDF should advertise text document target formats"
    );
    assert!(pdf_targets.contains(&"docx".into()));
    assert!(pdf_targets.contains(&"odt".into()));
    assert!(pdf_targets.contains(&"txt".into()));
    assert!(!pdf_targets.contains(&"xlsx".into()));
    assert!(recast_core::formats::is_format_conversion_supported(
        "pdf", "docx"
    ));
    assert!(recast_core::formats::is_format_conversion_supported(
        "pdf", "txt"
    ));
    assert!(!recast_core::formats::is_format_conversion_supported(
        "pdf", "xlsx"
    ));
}

#[test]
fn document_capabilities_are_family_isolated() {
    // Text documents
    let docx_targets = target_formats_for("docx");
    assert!(docx_targets.contains(&"pdf".into()));
    assert!(docx_targets.contains(&"odt".into()));
    assert!(docx_targets.contains(&"txt".into()));
    assert!(docx_targets.contains(&"md".into()));
    assert!(docx_targets.contains(&"html".into()));
    // Cannot convert docx to spreadsheet or presentation
    assert!(!docx_targets.contains(&"xlsx".into()));
    assert!(!docx_targets.contains(&"pptx".into()));

    // Spreadsheets
    let xlsx_targets = target_formats_for("xlsx");
    assert!(xlsx_targets.contains(&"pdf".into()));
    assert!(xlsx_targets.contains(&"ods".into()));
    assert!(xlsx_targets.contains(&"csv".into()));
    assert!(!xlsx_targets.contains(&"docx".into()));
    assert!(!xlsx_targets.contains(&"pptx".into()));

    // Presentations
    let pptx_targets = target_formats_for("pptx");
    assert!(pptx_targets.contains(&"pdf".into()));
    assert!(pptx_targets.contains(&"odp".into()));
    assert!(pptx_targets.contains(&"ppt".into()));
    assert!(!pptx_targets.contains(&"docx".into()));
    assert!(!pptx_targets.contains(&"xlsx".into()));

    // Cross-category is unsupported
    assert!(!recast_core::formats::is_format_conversion_supported(
        "docx", "mp4"
    ));
    assert!(!recast_core::formats::is_format_conversion_supported(
        "mp4", "pdf"
    ));
}

#[test]
fn planning_selects_correct_engine_and_builds_args() {
    use recast_core::execution::build_plan;
    use recast_engines::{EngineBinary, EngineSet};
    use recast_models::ConversionRequest;
    use std::collections::BTreeMap;
    use std::path::PathBuf;

    let dummy_ffmpeg = EngineBinary {
        name: "ffmpeg".into(),
        path: PathBuf::from("fake/ffmpeg.exe"),
        version_args: vec![],
    };
    let dummy_lo = EngineBinary {
        name: "libreoffice".into(),
        path: PathBuf::from("fake/soffice.exe"),
        version_args: vec![],
    };
    let engines = EngineSet {
        ffmpeg: dummy_ffmpeg,
        libreoffice: Some(dummy_lo),
    };

    let root = std::env::temp_dir().join(format!("recast-plan-test-{}", std::process::id()));
    let _ = fs::create_dir_all(&root);
    let doc_file = root.join("test.docx");
    let media_file = root.join("test.mp4");
    fs::write(&doc_file, b"content").expect("doc fixture");
    fs::write(&media_file, b"content").expect("media fixture");

    let doc_request = ConversionRequest {
        input_paths: vec![doc_file.clone()],
        target_format: "pdf".into(),
        preset_id: None,
        output_directory: Some(root.clone()),
        overwrite_policy: OverwritePolicy::Overwrite,
        options: BTreeMap::new(),
    };

    let plans = build_plan(&doc_request, &engines).expect("document plan");
    assert_eq!(plans.len(), 1);
    assert_eq!(plans[0].category, MediaCategory::Document);
    assert_eq!(plans[0].executable, PathBuf::from("fake/soffice.exe"));
    assert!(plans[0].args.contains(&"--headless".into()));
    assert!(plans[0].args.contains(&"--convert-to".into()));
    assert!(plans[0].args.contains(&"pdf:writer_pdf_Export".into()));

    let media_request = ConversionRequest {
        input_paths: vec![media_file.clone()],
        target_format: "mp3".into(),
        preset_id: None,
        output_directory: Some(root.clone()),
        overwrite_policy: OverwritePolicy::Overwrite,
        options: BTreeMap::new(),
    };

    let media_plans = build_plan(&media_request, &engines).expect("media plan");
    assert_eq!(media_plans.len(), 1);
    assert_eq!(media_plans[0].category, MediaCategory::Video);
    assert_eq!(media_plans[0].executable, PathBuf::from("fake/ffmpeg.exe"));

    let _ = fs::remove_file(&doc_file);
    let _ = fs::remove_file(&media_file);
    let _ = fs::remove_dir(&root);
}

#[test]
fn planning_rejects_missing_libreoffice_engine() {
    use recast_core::execution::build_plan;
    use recast_engines::{EngineBinary, EngineSet};
    use recast_models::ConversionRequest;
    use std::collections::BTreeMap;
    use std::path::PathBuf;

    let root = std::env::temp_dir().join(format!("recast-plan-test2-{}", std::process::id()));
    let _ = fs::create_dir_all(&root);
    let doc_file = root.join("test.docx");
    fs::write(&doc_file, b"content").expect("doc fixture");

    let dummy_ffmpeg = EngineBinary {
        name: "ffmpeg".into(),
        path: PathBuf::from("fake/ffmpeg.exe"),
        version_args: vec![],
    };
    let engines = EngineSet {
        ffmpeg: dummy_ffmpeg,
        libreoffice: None, // LibreOffice is missing!
    };

    let doc_request = ConversionRequest {
        input_paths: vec![doc_file.clone()],
        target_format: "pdf".into(),
        preset_id: None,
        output_directory: Some(root.clone()),
        overwrite_policy: OverwritePolicy::Overwrite,
        options: BTreeMap::new(),
    };

    let result = build_plan(&doc_request, &engines);
    assert!(result.is_err());
    let err = result.unwrap_err();
    assert!(matches!(err, recast_core::CoreError::EngineNotFound(_)));

    let _ = fs::remove_file(&doc_file);
    let _ = fs::remove_dir(&root);
}

#[test]
fn planning_rejects_unsupported_document_pair() {
    use recast_core::execution::build_plan;
    use recast_engines::{EngineBinary, EngineSet};
    use recast_models::ConversionRequest;
    use std::collections::BTreeMap;
    use std::path::PathBuf;

    let engines = EngineSet {
        ffmpeg: EngineBinary {
            name: "ffmpeg".into(),
            path: PathBuf::from("fake/ffmpeg.exe"),
            version_args: vec![],
        },
        libreoffice: Some(EngineBinary {
            name: "libreoffice".into(),
            path: PathBuf::from("fake/soffice.exe"),
            version_args: vec![],
        }),
    };

    // PDF -> XLSX is cross-family and not allowed!
    let invalid_request = ConversionRequest {
        input_paths: vec![PathBuf::from("test.pdf")],
        target_format: "xlsx".into(),
        preset_id: None,
        output_directory: Some(PathBuf::from("out")),
        overwrite_policy: OverwritePolicy::Overwrite,
        options: BTreeMap::new(),
    };

    let result = build_plan(&invalid_request, &engines);
    assert!(result.is_err());
    assert!(matches!(
        result.unwrap_err(),
        recast_core::CoreError::UnsupportedOutput
    ));
}
