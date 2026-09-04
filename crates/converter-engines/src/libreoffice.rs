use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct LibreOfficeVersion {
    pub major: u32,
    pub minor: u32,
    pub patch: u32,
    pub raw: String,
}

impl LibreOfficeVersion {
    pub fn parse(output: &str) -> Option<Self> {
        let text = output.trim();
        let version_candidate = if let Some(idx) = text.find("LibreOffice") {
            &text[idx + "LibreOffice".len()..]
        } else {
            text
        };
        let version_candidate = version_candidate.trim().trim_start_matches('=').trim();

        let mut numbers = Vec::new();
        for token in version_candidate.split(|c: char| !c.is_ascii_digit() && c != '.') {
            let token = token.trim();
            if token.is_empty() {
                continue;
            }
            for part in token.split('.') {
                if let Ok(n) = part.parse::<u32>() {
                    numbers.push(n);
                } else {
                    break;
                }
            }
            if !numbers.is_empty() {
                break;
            }
        }

        if numbers.is_empty() {
            return None;
        }

        let major = numbers[0];
        let minor = if numbers.len() > 1 { numbers[1] } else { 0 };
        let patch = if numbers.len() > 2 { numbers[2] } else { 0 };

        Some(Self {
            major,
            minor,
            patch,
            raw: text.to_string(),
        })
    }

    pub fn supports_markdown(&self) -> bool {
        self.major > 26 || (self.major == 26 && self.minor >= 2)
    }
}

pub fn path_to_file_uri(path: &Path) -> String {
    let s = path.to_string_lossy().replace('\\', "/");
    let trimmed = s.trim_start_matches("//?/");
    if trimmed.starts_with('/') {
        format!("file://{trimmed}")
    } else {
        format!("file:///{trimmed}")
    }
}

pub fn libreoffice_filter_for(source_format: &str, target_format: &str) -> Option<&'static str> {
    let target = target_format.trim_start_matches('.').to_ascii_lowercase();
    let source = source_format.trim_start_matches('.').to_ascii_lowercase();

    match target.as_str() {
        "pdf" => match source.as_str() {
            "ods" | "fods" | "ots" | "xlsx" | "xls" | "csv" | "tsv" => Some("calc_pdf_Export"),
            "odp" | "fodp" | "otp" | "pptx" | "ppt" => Some("impress_pdf_Export"),
            _ => Some("writer_pdf_Export"),
        },
        "html" | "htm" | "xhtml" => match source.as_str() {
            "ods" | "fods" | "ots" | "xlsx" | "xls" | "csv" | "tsv" => Some("HTML (StarCalc)"),
            _ => Some("HTML (StarWriter)"),
        },
        "odt" => Some("writer8"),
        "ott" => Some("writer8_template"),
        "fodt" => Some("OpenDocument Text Flat XML"),
        "docx" => Some("MS Word 2007 XML"),
        "doc" => Some("MS Word 97"),
        "rtf" => Some("Rich Text Format"),
        "txt" => Some("Text"),
        "md" | "markdown" => Some("Markdown"),
        "epub" => Some("EPUB"),
        "ods" => Some("calc8"),
        "fods" => Some("OpenDocument Spreadsheet Flat XML"),
        "ots" => Some("calc8_template"),
        "xlsx" => Some("Calc MS Excel 2007 XML"),
        "xls" => Some("MS Excel 97"),
        "csv" | "tsv" => Some("Text - txt - csv (StarCalc)"),
        "odp" => Some("impress8"),
        "fodp" => Some("OpenDocument Presentation Flat XML"),
        "otp" => Some("impress8_template"),
        "pptx" => Some("Impress MS PowerPoint 2007 XML"),
        "ppt" => Some("MS PowerPoint 97"),
        _ => None,
    }
}

pub fn libreoffice_convert_arg(source_format: &str, target_format: &str) -> String {
    let clean_target = target_format.trim_start_matches('.').to_ascii_lowercase();
    if let Some(filter) = libreoffice_filter_for(source_format, &clean_target) {
        format!("{clean_target}:{filter}")
    } else {
        clean_target
    }
}

pub fn build_libreoffice_args(
    input: &Path,
    outdir: &Path,
    source_format: &str,
    target_format: &str,
    profile_dir: Option<&Path>,
) -> Vec<String> {
    let mut args = vec!["--headless".to_string()];
    if let Some(profile) = profile_dir {
        let uri = path_to_file_uri(profile);
        args.push(format!("-env:UserInstallation={uri}"));
    }
    let clean_source = source_format.trim_start_matches('.').to_ascii_lowercase();
    if clean_source == "pdf" {
        args.push("--infilter=writer_pdf_import".to_string());
    }
    args.push("--convert-to".to_string());
    args.push(libreoffice_convert_arg(source_format, target_format));
    args.push("--outdir".to_string());
    args.push(outdir.display().to_string());
    args.push(input.display().to_string());
    args
}

pub fn detect_libreoffice_version(executable: &Path) -> Option<LibreOfficeVersion> {
    // 1. Try reading bootstrap.ini if present in the executable's directory
    if let Some(parent) = executable.parent() {
        let bootstrap = parent.join("bootstrap.ini");
        if bootstrap.is_file() {
            if let Ok(content) = std::fs::read_to_string(&bootstrap) {
                for line in content.lines() {
                    let trimmed = line.trim();
                    if trimmed.starts_with("ProductKey=") {
                        if let Some(ver) = LibreOfficeVersion::parse(trimmed) {
                            return Some(ver);
                        }
                    }
                }
            }
        }
    }

    // 2. Invoke executable --version
    let run_exe = if cfg!(windows) {
        if let Some(parent) = executable.parent() {
            let com = parent.join("soffice.com");
            if com.is_file() {
                com
            } else {
                executable.to_path_buf()
            }
        } else {
            executable.to_path_buf()
        }
    } else {
        executable.to_path_buf()
    };

    let mut cmd = std::process::Command::new(&run_exe);
    cmd.arg("--version");
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        cmd.creation_flags(0x0800_0000); // CREATE_NO_WINDOW
    }

    if let Ok(output) = cmd.output() {
        let stdout = String::from_utf8_lossy(&output.stdout);
        if let Some(ver) = LibreOfficeVersion::parse(&stdout) {
            return Some(ver);
        }
        let stderr = String::from_utf8_lossy(&output.stderr);
        if let Some(ver) = LibreOfficeVersion::parse(&stderr) {
            return Some(ver);
        }
    }

    None
}

pub fn discover_libreoffice(base_dir: Option<&Path>) -> Option<PathBuf> {
    // 1. Check LIBREOFFICE_PATH environment variable override
    if let Ok(path_str) = std::env::var("LIBREOFFICE_PATH") {
        let path = PathBuf::from(path_str);
        if path.is_file() {
            return Some(path);
        }
        let exe_name = if cfg!(windows) {
            "soffice.exe"
        } else {
            "soffice"
        };
        let in_dir = path.join(exe_name);
        if in_dir.is_file() {
            return Some(in_dir);
        }
        let in_program = path.join("program").join(exe_name);
        if in_program.is_file() {
            return Some(in_program);
        }
    }

    // 2. Check bundled binary in base_dir
    if let Some(base) = base_dir {
        let exe_name = if cfg!(windows) {
            "soffice.exe"
        } else {
            "soffice"
        };
        let direct = base.join(exe_name);
        if direct.is_file() {
            return Some(direct);
        }
        let program = base.join("program").join(exe_name);
        if program.is_file() {
            return Some(program);
        }
    }

    // 3. Platform-specific well-known paths
    #[cfg(windows)]
    {
        let mut candidates = vec![
            PathBuf::from(r"C:\Program Files\LibreOffice\program\soffice.exe"),
            PathBuf::from(r"C:\Program Files (x86)\LibreOffice\program\soffice.exe"),
        ];

        if let Ok(prog_files) = std::env::var("ProgramFiles") {
            candidates.push(PathBuf::from(prog_files).join(r"LibreOffice\program\soffice.exe"));
        }
        if let Ok(prog_files_x86) = std::env::var("ProgramFiles(x86)") {
            candidates.push(PathBuf::from(prog_files_x86).join(r"LibreOffice\program\soffice.exe"));
        }
        if let Ok(local_app_data) = std::env::var("LOCALAPPDATA") {
            candidates.push(
                PathBuf::from(local_app_data).join(r"Programs\LibreOffice\program\soffice.exe"),
            );
        }

        for candidate in candidates {
            if candidate.is_file() {
                return Some(candidate);
            }
        }
    }

    #[cfg(target_os = "macos")]
    {
        let mut candidates = vec![PathBuf::from(
            "/Applications/LibreOffice.app/Contents/MacOS/soffice",
        )];
        if let Ok(home) = std::env::var("HOME") {
            candidates.push(
                PathBuf::from(home).join("Applications/LibreOffice.app/Contents/MacOS/soffice"),
            );
        }
        for candidate in candidates {
            if candidate.is_file() {
                return Some(candidate);
            }
        }
    }

    #[cfg(target_os = "linux")]
    {
        let candidates = [
            "/usr/bin/soffice",
            "/usr/local/bin/soffice",
            "/usr/bin/libreoffice",
            "/usr/local/bin/libreoffice",
        ];
        for candidate in candidates {
            let p = PathBuf::from(candidate);
            if p.is_file() {
                return Some(p);
            }
        }
    }

    // 4. Search PATH
    if let Some(paths) = std::env::var_os("PATH") {
        let exe_names = if cfg!(windows) {
            vec!["soffice.exe", "soffice.com"]
        } else {
            vec!["soffice", "libreoffice"]
        };
        for path in std::env::split_paths(&paths) {
            for exe in &exe_names {
                let candidate = path.join(exe);
                if candidate.is_file() {
                    return Some(candidate);
                }
            }
        }
    }

    None
}
