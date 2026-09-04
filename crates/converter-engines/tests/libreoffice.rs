use recast_engines::libreoffice::{
    build_libreoffice_args, detect_libreoffice_version, discover_libreoffice,
    libreoffice_convert_arg, libreoffice_filter_for, path_to_file_uri, LibreOfficeVersion,
};
use std::fs;
use std::path::Path;

#[test]
fn libreoffice_filter_mappings_cover_document_families() {
    // Text documents
    assert_eq!(
        libreoffice_filter_for("docx", "pdf"),
        Some("writer_pdf_Export")
    );
    assert_eq!(
        libreoffice_filter_for("odt", "pdf"),
        Some("writer_pdf_Export")
    );
    assert_eq!(
        libreoffice_filter_for("txt", "pdf"),
        Some("writer_pdf_Export")
    );
    assert_eq!(
        libreoffice_filter_for("html", "pdf"),
        Some("writer_pdf_Export")
    );
    assert_eq!(
        libreoffice_filter_for("md", "pdf"),
        Some("writer_pdf_Export")
    );
    assert_eq!(
        libreoffice_filter_for("odt", "docx"),
        Some("MS Word 2007 XML")
    );
    assert_eq!(libreoffice_filter_for("docx", "odt"), Some("writer8"));
    assert_eq!(libreoffice_filter_for("docx", "doc"), Some("MS Word 97"));
    assert_eq!(
        libreoffice_filter_for("docx", "rtf"),
        Some("Rich Text Format")
    );
    assert_eq!(libreoffice_filter_for("docx", "txt"), Some("Text"));
    assert_eq!(libreoffice_filter_for("docx", "md"), Some("Markdown"));
    assert_eq!(
        libreoffice_filter_for("docx", "html"),
        Some("HTML (StarWriter)")
    );
    assert_eq!(libreoffice_filter_for("docx", "epub"), Some("EPUB"));

    // Spreadsheets
    assert_eq!(
        libreoffice_filter_for("xlsx", "pdf"),
        Some("calc_pdf_Export")
    );
    assert_eq!(
        libreoffice_filter_for("ods", "pdf"),
        Some("calc_pdf_Export")
    );
    assert_eq!(
        libreoffice_filter_for("csv", "pdf"),
        Some("calc_pdf_Export")
    );
    assert_eq!(libreoffice_filter_for("xlsx", "ods"), Some("calc8"));
    assert_eq!(
        libreoffice_filter_for("ods", "xlsx"),
        Some("Calc MS Excel 2007 XML")
    );
    assert_eq!(
        libreoffice_filter_for("xlsx", "csv"),
        Some("Text - txt - csv (StarCalc)")
    );
    assert_eq!(
        libreoffice_filter_for("xlsx", "tsv"),
        Some("Text - txt - csv (StarCalc)")
    );

    // Presentations
    assert_eq!(
        libreoffice_filter_for("pptx", "pdf"),
        Some("impress_pdf_Export")
    );
    assert_eq!(
        libreoffice_filter_for("odp", "pdf"),
        Some("impress_pdf_Export")
    );
    assert_eq!(libreoffice_filter_for("pptx", "odp"), Some("impress8"));
    assert_eq!(
        libreoffice_filter_for("odp", "pptx"),
        Some("Impress MS PowerPoint 2007 XML")
    );
    assert_eq!(
        libreoffice_filter_for("pptx", "ppt"),
        Some("MS PowerPoint 97")
    );
}

#[test]
fn convert_arg_formats_combined_extension_and_filter() {
    assert_eq!(
        libreoffice_convert_arg("docx", "pdf"),
        "pdf:writer_pdf_Export"
    );
    assert_eq!(
        libreoffice_convert_arg("xlsx", "pdf"),
        "pdf:calc_pdf_Export"
    );
    assert_eq!(
        libreoffice_convert_arg("pptx", "pdf"),
        "pdf:impress_pdf_Export"
    );
    assert_eq!(libreoffice_convert_arg("docx", "md"), "md:Markdown");
    assert_eq!(
        libreoffice_convert_arg("odt", "docx"),
        "docx:MS Word 2007 XML"
    );
}

#[test]
fn command_args_generation_handles_spaces_and_special_paths() {
    let input = Path::new("C:/Users/Test User/Belgelerim/türkçe rapor.docx");
    let outdir = Path::new("C:/Users/Test User/Output Klasörü");
    let profile = Path::new("C:/Users/Test User/AppData/Local/Temp/recast profile");

    let args = build_libreoffice_args(input, outdir, "docx", "pdf", Some(profile));

    assert_eq!(args[0], "--headless");
    assert!(args[1].starts_with("-env:UserInstallation=file:///"));
    assert!(args[1].contains("recast profile"));
    assert_eq!(args[2], "--convert-to");
    assert_eq!(args[3], "pdf:writer_pdf_Export");
    assert_eq!(args[4], "--outdir");
    assert_eq!(args[5], outdir.display().to_string());
    assert_eq!(args[6], input.display().to_string());
}

#[test]
fn pdf_input_includes_writer_pdf_import_infilter() {
    let input = Path::new("C:/Users/Test User/Belgelerim/belge.pdf");
    let outdir = Path::new("C:/Users/Test User/Output");
    let profile = Path::new("C:/Users/Test User/Temp/profile");

    let args = build_libreoffice_args(input, outdir, "pdf", "docx", Some(profile));

    assert_eq!(args[0], "--headless");
    assert!(args[1].starts_with("-env:UserInstallation=file:///"));
    assert_eq!(args[2], "--infilter=writer_pdf_import");
    assert_eq!(args[3], "--convert-to");
    assert_eq!(args[4], "docx:MS Word 2007 XML");
    assert_eq!(args[5], "--outdir");
    assert_eq!(args[6], outdir.display().to_string());
    assert_eq!(args[7], input.display().to_string());
}

#[test]
fn path_to_file_uri_produces_valid_schemes() {
    let win_path = Path::new(r"C:\Users\USER\Temp\profile");
    let win_uri = path_to_file_uri(win_path);
    assert!(win_uri.starts_with("file:///C:/") || win_uri.starts_with("file:///"));
    assert!(!win_uri.contains('\\'));

    let unix_path = Path::new("/tmp/recast-profile");
    let unix_uri = path_to_file_uri(unix_path);
    assert_eq!(unix_uri, "file:///tmp/recast-profile");
}

#[test]
fn version_parsing_and_markdown_support() {
    // 26.2 supports markdown
    let v26_2 = LibreOfficeVersion::parse("LibreOffice 26.2.0.1 20(Build:1)").expect("26.2");
    assert_eq!(v26_2.major, 26);
    assert_eq!(v26_2.minor, 2);
    assert_eq!(v26_2.patch, 0);
    assert!(v26_2.supports_markdown());

    // 27.0 supports markdown
    let v27 = LibreOfficeVersion::parse("LibreOffice 27.1.0").expect("27.1");
    assert!(v27.supports_markdown());

    // 26.1 does NOT support markdown
    let v26_1 = LibreOfficeVersion::parse("LibreOffice 26.1.4").expect("26.1");
    assert!(!v26_1.supports_markdown());

    // 24.8 does NOT support markdown
    let v24_8 = LibreOfficeVersion::parse("LibreOffice 24.8.2.1").expect("24.8");
    assert_eq!(v24_8.major, 24);
    assert_eq!(v24_8.minor, 8);
    assert!(!v24_8.supports_markdown());

    // 7.6 does NOT support markdown
    let v7_6 = LibreOfficeVersion::parse("LibreOffice 7.6.4.1").expect("7.6");
    assert!(!v7_6.supports_markdown());

    // ProductKey format from bootstrap.ini
    let v_ini = LibreOfficeVersion::parse("ProductKey=LibreOffice 26.2").expect("bootstrap format");
    assert_eq!(v_ini.major, 26);
    assert_eq!(v_ini.minor, 2);
    assert!(v_ini.supports_markdown());
}

#[test]
fn discovery_supports_environment_variable_override() {
    let root = std::env::temp_dir().join(format!("recast-lo-test-{}", std::process::id()));
    let _ = fs::create_dir_all(&root);
    let fake_exe = if cfg!(windows) {
        root.join("soffice.exe")
    } else {
        root.join("soffice")
    };
    fs::write(&fake_exe, b"dummy").expect("write fake soffice");

    std::env::set_var("LIBREOFFICE_PATH", &fake_exe);
    let discovered = discover_libreoffice(None);
    assert_eq!(discovered.as_deref(), Some(fake_exe.as_path()));
    std::env::remove_var("LIBREOFFICE_PATH");

    let _ = fs::remove_file(&fake_exe);
    let _ = fs::remove_dir(&root);
}

#[test]
fn integration_skips_gracefully_when_libreoffice_absent() {
    let discovered = discover_libreoffice(None);
    if let Some(lo_path) = discovered {
        println!("LibreOffice discovered at: {}", lo_path.display());
        let version = detect_libreoffice_version(&lo_path);
        println!("Detected version: {:?}", version);
    } else {
        println!("LibreOffice not found on this system; skipping active execution integration test gracefully.");
    }
}
