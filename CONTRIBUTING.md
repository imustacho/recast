# Contributing to Recast

Thank you for improving Recast. Keep pull requests focused and explain the
user-visible reason for each change.

## Local setup

1. Install Node.js 24+, Rust stable, and the Tauri prerequisites for your OS.
2. Run `npm ci` from the repository root.
3. Run `npm run tauri:dev` to start the desktop application.

Windows contributors should also read [docs/setup-windows.md](docs/setup-windows.md).

## Before opening a pull request

```bash
npm run check
cargo fmt --check
cargo clippy --workspace --all-targets -- -D warnings
cargo test --workspace
```

Add tests for new behavior where practical. Do not commit media files, engine
binaries, generated installers, secrets, or private conversion data.

## Commit style

Use short imperative Conventional Commit messages, for example:

- `feat: add WebP quality preset`
- `fix: preserve output extension during rename`
- `docs: clarify Windows build prerequisites`

By contributing, you agree that your work is licensed under the MIT License.
