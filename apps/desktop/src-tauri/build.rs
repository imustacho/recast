fn main() {
    let engines_dir = std::path::Path::new("resources/engines");
    if !engines_dir.exists() {
        let _ = std::fs::create_dir_all(engines_dir);
    }
    let has_files = std::fs::read_dir(engines_dir)
        .map(|entries| {
            entries.filter_map(Result::ok).any(|entry| {
                entry
                    .file_name()
                    .to_string_lossy()
                    .starts_with(|c: char| c != '.')
            })
        })
        .unwrap_or(false);
    if !has_files {
        let _ = std::fs::write(engines_dir.join("placeholder.txt"), b"");
    }
    tauri_build::build()
}
