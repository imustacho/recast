# Recast

[![CI](https://github.com/imustacho/offconvert/actions/workflows/ci.yml/badge.svg)](https://github.com/imustacho/offconvert/actions/workflows/ci.yml)
[![Release](https://github.com/imustacho/offconvert/actions/workflows/release.yml/badge.svg)](https://github.com/imustacho/offconvert/actions/workflows/release.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-0f766e.svg)](LICENSE)

Private, offline-first file conversion for Windows, macOS, and Linux. Recast
uses Tauri 2, React, TypeScript, and Rust, with a reusable core shared by the
desktop application, CLI, and operating-system integrations.

> [!IMPORTANT]
> Recast is currently an early development release. Core image, video, and
> audio conversions work through bundled FFmpeg, but advanced presets, history,
> cancellation, and some platform integrations are still being implemented.

## Features

- Offline image, video, and audio conversion architecture
- Native desktop shell with a multilingual React interface
- Reusable Rust core and command-line interface
- Preset-driven conversion plans and queue management
- Release automation for Windows, macOS, and Linux

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

## Contributing and security

Read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request. Report
security issues privately as described in [SECURITY.md](SECURITY.md).

Recast is licensed under the [MIT License](LICENSE). FFmpeg, ImageMagick,
and other bundled tools retain their own licenses; see
[THIRD_PARTY_LICENSES.md](THIRD_PARTY_LICENSES.md).
