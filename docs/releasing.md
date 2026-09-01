# Releasing Recast

Releases are built by GitHub Actions from version tags. The workflow publishes
the GitHub Release after all platform artifacts are uploaded.

## Prepare a release

1. Confirm CI is green on `main`.
2. Update the version in `package.json`, `apps/desktop/package.json`,
   `Cargo.toml`, and `apps/desktop/src-tauri/tauri.conf.json`.
3. Run `npm install --package-lock-only` and `cargo check` to refresh lockfiles.
4. Move relevant entries from `Unreleased` into a dated version in
   `CHANGELOG.md`.
5. Commit with `chore(release): prepare vX.Y.Z` and push `main`.

## Trigger the build

```bash
git tag -a vX.Y.Z -m "Recast vX.Y.Z"
git push origin vX.Y.Z
```

The `Release` workflow builds Windows, Linux, Apple Silicon macOS, and Intel
macOS packages. Verify the published notes and artifacts when all matrix jobs
finish. If any platform fails, fix the cause and create a new patch version
instead of moving a published tag.

## Engine licensing

Before bundling FFmpeg, fill in `binaries/manifest.json` and
update `THIRD_PARTY_LICENSES.md`. Do not publish unknown or incompatible binary
builds.
