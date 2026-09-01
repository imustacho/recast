# Changelog

All notable changes to Recast are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and versions follow
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

[Unreleased]: https://github.com/imustacho/offconvert/compare/v0.1.3...HEAD
[0.1.3]: https://github.com/imustacho/offconvert/compare/v0.1.2...v0.1.3
[0.1.2]: https://github.com/imustacho/offconvert/compare/v0.1.1...v0.1.2
[0.1.1]: https://github.com/imustacho/offconvert/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/imustacho/offconvert/releases/tag/v0.1.0
