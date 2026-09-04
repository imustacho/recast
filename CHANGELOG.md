# Changelog

All notable changes to Recast are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and versions follow
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.2.0] - 2026-09-04

### Added

- Add first-class Document conversion support powered by LibreOffice 26.2+.
- Support Text (ODT, DOCX, DOC, RTF, TXT, MD, HTML, EPUB), Spreadsheet (ODS, XLSX, XLS, CSV, TSV), and Presentation (ODP, PPTX, PPT) formats.
- Add isolated user profile execution (`-env:UserInstallation=file:///...`) for concurrent, thread-safe document conversions.
- Enforce family-isolated conversion capability graph and strict PDF output-only behavior.
- Add Markdown version compatibility detection and gating (requiring LibreOffice 26.2+).
- Add CLI `--execute` support for documents and `presets/document.json`.
- Add optional PFX-based Windows release signing with SignTool verification.
- Publish a `SHA256SUMS.txt` integrity file with every GitHub Release.
- Add Microsoft Store-compatible MSIX packaging with Microsoft's `winapp` CLI.

## [0.1.4] - 2026-09-01

### Added

- Add comprehensive FFmpeg-backed image, audio, and video format support.
- Add centralized format and codec capabilities shared by core, CLI, and desktop UI.
- Add video-to-audio extraction for every supported audio target.
- Add format alias, codec mapping, engine discovery, and UI capability tests.

### Changed

- Use FFmpeg for image conversions and remove the unused ImageMagick engine path.
- Populate desktop target selectors from backend capabilities.
- Document the supported format and default codec matrix.

## [0.1.3] - 2026-07-13

### Fixed

- Allow the main window to open the native file picker and reveal converted files.
- Remove the unused sidebar and expand the converter workspace.

## [0.1.2] - 2026-07-13

### Fixed

- Prepare the platform FFmpeg resource when Tauri is invoked directly by the
  GitHub release action.

## [0.1.1] - 2026-07-13

### Fixed

- Run real image, video, and audio conversions with bundled FFmpeg.
- Connect file selection, drag-and-drop, queue status, and output actions.
- Install a Windows Explorer right-click conversion submenu for the current user.
- Surface conversion and engine errors in the desktop interface.

## [0.1.0] - 2026-07-12

### Added

- Initial Tauri, React, TypeScript, and Rust workspace.
- Conversion format registry, request planning, queue model, and presets.
- Desktop shell and reusable command-line interface.
- Cross-platform CI and GitHub Release automation.

[Unreleased]: https://github.com/imustacho/recast/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/imustacho/recast/compare/v0.1.4...v0.2.0
[0.1.4]: https://github.com/imustacho/recast/compare/v0.1.3...v0.1.4
[0.1.3]: https://github.com/imustacho/recast/compare/v0.1.2...v0.1.3
[0.1.2]: https://github.com/imustacho/recast/compare/v0.1.1...v0.1.2
[0.1.1]: https://github.com/imustacho/recast/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/imustacho/recast/releases/tag/v0.1.0
