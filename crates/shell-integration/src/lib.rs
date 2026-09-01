use std::path::Path;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum ShellIntegrationError {
    #[error("windows integration is only supported on Windows")]
    UnsupportedPlatform,
    #[error("failed to update the Windows context menu: {0}")]
    Registry(#[from] std::io::Error),
}

#[cfg(windows)]
const MENU_KEY: &str = r"Software\Classes\*\shell\Recast";

#[cfg(windows)]
pub fn install_windows_context_menu(exe_path: &Path) -> Result<(), ShellIntegrationError> {
    use winreg::enums::HKEY_CURRENT_USER;
    use winreg::RegKey;

    let current_user = RegKey::predef(HKEY_CURRENT_USER);
    let (menu, _) = current_user.create_subkey(MENU_KEY)?;
    menu.set_value("MUIVerb", &"Recast")?;
    menu.set_value("Icon", &exe_path.display().to_string())?;
    menu.set_value("SubCommands", &"")?;

    let (commands, _) = menu.create_subkey("shell")?;
    add_command(&commands, "00-open", "Open in Recast", exe_path, None)?;
    add_command(&commands, "10-jpg", "Convert to JPG", exe_path, Some("jpg"))?;
    add_command(&commands, "20-png", "Convert to PNG", exe_path, Some("png"))?;
    add_command(
        &commands,
        "30-webp",
        "Convert to WebP",
        exe_path,
        Some("webp"),
    )?;
    add_command(&commands, "40-mp3", "Convert to MP3", exe_path, Some("mp3"))?;
    add_command(&commands, "50-mp4", "Convert to MP4", exe_path, Some("mp4"))?;
    Ok(())
}

#[cfg(windows)]
fn add_command(
    parent: &winreg::RegKey,
    key_name: &str,
    label: &str,
    exe_path: &Path,
    target_format: Option<&str>,
) -> Result<(), ShellIntegrationError> {
    let (item, _) = parent.create_subkey(key_name)?;
    item.set_value("MUIVerb", &label)?;
    let (command, _) = item.create_subkey("command")?;
    let executable = exe_path.display();
    let value = match target_format {
        Some(format) => format!("\"{executable}\" --quick-convert {format} \"%1\""),
        None => format!("\"{executable}\" --open \"%1\""),
    };
    command.set_value("", &value)?;
    Ok(())
}

#[cfg(windows)]
pub fn remove_windows_context_menu() -> Result<(), ShellIntegrationError> {
    use winreg::enums::HKEY_CURRENT_USER;
    use winreg::RegKey;

    let current_user = RegKey::predef(HKEY_CURRENT_USER);
    match current_user.delete_subkey_all(MENU_KEY) {
        Ok(()) => Ok(()),
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(()),
        Err(error) => Err(error.into()),
    }
}

#[cfg(not(windows))]
pub fn install_windows_context_menu(_exe_path: &Path) -> Result<(), ShellIntegrationError> {
    Err(ShellIntegrationError::UnsupportedPlatform)
}

#[cfg(not(windows))]
pub fn remove_windows_context_menu() -> Result<(), ShellIntegrationError> {
    Err(ShellIntegrationError::UnsupportedPlatform)
}
