# Recast Windows Development Setup

## Required tools

- Node.js 24+
- Rust stable toolchain
- Microsoft Visual Studio Build Tools with C++ workload
- Tauri prerequisites
- WebView2 runtime
- Bundled FFmpeg and FFprobe binaries under `binaries/windows/`
- Bundled ImageMagick binaries under `binaries/windows/`

## Install steps

```powershell
npm install
rustup default stable
rustup target add x86_64-pc-windows-msvc
```

## Expected binary layout

```text
binaries/windows/ffmpeg.exe
binaries/windows/ffprobe.exe
binaries/windows/magick.exe
```

## Development commands

```powershell
npm run dev
npm run tauri:dev
cargo test
```

Create a distributable installer with:

```powershell
npm run tauri:build
```

Installers are written below `target/release/bundle/`.

## Notes

- Release installers bundle FFmpeg; local Tauri builds prepare it from the
  `ffmpeg-static` npm package before compilation.
- Recast installs its per-user Windows context menu when the app starts.
  On Windows 11, open **Show more options** to see the classic Recast menu.
- The sidebar action **Install right-click menu** can repair the registry entry
  without administrator privileges.
