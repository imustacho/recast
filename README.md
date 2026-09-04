# Recast

[![CI](https://github.com/imustacho/recast/actions/workflows/ci.yml/badge.svg)](https://github.com/imustacho/recast/actions/workflows/ci.yml)
[![Release](https://github.com/imustacho/recast/actions/workflows/release.yml/badge.svg)](https://github.com/imustacho/recast/actions/workflows/release.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-0f766e.svg)](LICENSE)

Private, offline-first file conversion for Windows, macOS, and Linux. Recast
uses Tauri 2, React, TypeScript, and Rust, with a reusable core shared by the
desktop application, CLI, and operating-system integrations.

> [!IMPORTANT]
> Recast is currently an early development release. Core image, video, and
> audio conversions work through bundled FFmpeg, and document conversions work
> through headless LibreOffice. Advanced presets, history, cancellation, and some
> platform integrations are still being implemented.

## Features

- Offline image, video, audio, and document conversion architecture
- Native desktop shell with a multilingual React interface
- Reusable Rust core and command-line interface
- Preset-driven conversion plans and queue management
- Release automation for Windows, macOS, and Linux

## Supported formats

Recast pairs media types with dedicated engines:
- **Media (Image, Video, Audio)**: Processed via bundled/system FFmpeg.
- **Documents**: Processed via headless LibreOffice (Writer, Calc, Impress).

| Media | Accepted formats | Engine / Output details |
| --- | --- | --- |
| Image | JPG/JPEG, PNG, WebP, BMP, TIFF, GIF, AVIF | FFmpeg (MJPEG, PNG, libwebp, BMP, TIFF, GIF, AV1) |
| Audio | MP3, WAV, FLAC, AAC, M4A, OGG, Opus, AIFF, ALAC, AC3 | FFmpeg (libmp3lame, PCM, FLAC, AAC, Vorbis, Opus, ALAC, AC3) |
| Video | MP4, MKV, WebM, MOV, AVI, M4V, MPEG/MPG, OGV, TS/MTS/M2TS | FFmpeg (H.264/AAC, VP9/Opus, MPEG-4, MPEG-2, Theora/Vorbis) |
| Document (Text) | ODT, DOCX, DOC, RTF, TXT, Markdown (MD), HTML, EPUB | LibreOffice (Writer filters; targets text formats & PDF) |
| Document (Spreadsheet) | ODS, XLSX, XLS, CSV, TSV | LibreOffice (Calc filters; targets spreadsheet formats & PDF) |
| Document (Presentation) | ODP, PPTX, PPT | LibreOffice (Impress filters; targets presentation formats & PDF) |

### Conversion Rules & Capabilities

- **Image & Audio**: Inputs can target every format within their category.
- **Video**: Can target every video format as well as every audio format (direct audio extraction).
- **Documents**: Conversions are strictly **family-isolated** (Text documents cannot convert to Spreadsheets or Presentations, and vice versa).
- **PDF Output-Only**: PDF is strictly an output/rendered destination. Recast does not convert PDF files back to editable document formats.
- **Markdown Support**: Markdown (`.md`, `.markdown`) conversions require LibreOffice 26.2+. If an earlier version of LibreOffice is present, Markdown conversions fail gracefully with an actionable version error while other document formats continue to work.

### Engine Discovery & Setup

Recast discovers FFmpeg and LibreOffice automatically:
- **FFmpeg**: Bundled binaries in `binaries/` or discovered on system `PATH`.
- **LibreOffice**: Automatically detected in standard platform installation directories (Windows Program Files/LocalAppData, macOS `/Applications`, Linux `/usr/bin/soffice`), from system `PATH`, or via the `LIBREOFFICE_PATH` environment variable (e.g. `LIBREOFFICE_PATH="C:\Program Files\LibreOffice\program\soffice.exe"`). Each conversion job runs with an isolated temporary user profile to ensure thread safety during concurrent operations.

## Development

Install Node.js 24+, the stable Rust toolchain, and the
[Tauri prerequisites](https://v2.tauri.app/start/prerequisites/) for your system.

```bash
npm ci
npm run tauri:dev
```

Run all frontend checks with `npm run check`. Rust checks are:

```bash
cargo fmt --check
cargo clippy --workspace --all-targets -- -D warnings
cargo test --workspace
```

Windows-specific setup and engine binary placement are documented in
[docs/setup-windows.md](docs/setup-windows.md).

## Repository layout

```text
apps/desktop             Tauri desktop application and React UI
crates/converter-core    Inspection, planning, queue, and execution logic
crates/converter-cli     Reusable command-line interface
crates/converter-engines Engine discovery and process integrations
crates/converter-models  Shared domain models
crates/shell-integration Windows shell integration helpers
presets/                 Built-in data-driven presets
binaries/                Bundled-binary metadata
docs/                    Setup, architecture, and release guides
```

## Releases

Version tags such as `v0.1.0` build installers on all supported platforms and
publish them to GitHub Releases. Maintainer instructions are in
[docs/releasing.md](docs/releasing.md).

Microsoft Store distribution uses a separate, unsigned MSIX package built with
Microsoft's `winapp` CLI. It requires the exact application identity values
reserved in Partner Center and does not replace the existing NSIS or WiX
packages. Setup, local sideload testing, and CI instructions are in
[docs/microsoft-store.md](docs/microsoft-store.md).

### Windows code signing and SmartScreen

Release builds can sign both the Windows NSIS `.exe` installer and WiX `.msi`
package with a PFX code-signing certificate supplied through GitHub Secrets.
The workflow uses SignTool with a SHA-256 file digest and an RFC 3161 timestamp,
then verifies both signatures before completing the Windows build. No
certificate or private key is stored in the repository. When signing secrets
are absent, the workflow emits a warning and publishes unsigned installers.

Code signing establishes publisher identity and helps reduce Microsoft Defender
SmartScreen warnings, but a standard organization-validated code-signing
certificate does not remove them immediately. SmartScreen reputation normally
builds over time through consistently signed downloads; certificate type,
download volume, and other Microsoft reputation signals can affect the result.
Each release also includes `SHA256SUMS.txt` for artifact integrity checks.

## Contributing and security

Read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request. Report
security issues privately as described in [SECURITY.md](SECURITY.md).

Recast is licensed under the [MIT License](LICENSE). FFmpeg and other bundled
tools retain their own licenses; see
[THIRD_PARTY_LICENSES.md](THIRD_PARTY_LICENSES.md).
