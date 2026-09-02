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

Microsoft Store MSIX packages use a separate manually triggered workflow and
are not attached to GitHub Releases. See [microsoft-store.md](microsoft-store.md).

## Windows code signing

The release workflow supports a password-protected PFX certificate without
placing signing material in the repository. Configure these repository secrets:

- `WINDOWS_CERTIFICATE_PFX_BASE64`: the complete PFX file encoded as Base64.
- `WINDOWS_CERTIFICATE_PASSWORD`: the password protecting the PFX.

You may also set the repository variable `WINDOWS_TIMESTAMP_URL` to an RFC 3161
timestamp service. It defaults to `http://timestamp.digicert.com`.

To encode a PFX as a single-line value in PowerShell:

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("C:\path\to\certificate.pfx"))
```

Add the resulting text and password under **Settings > Secrets and variables >
Actions**. The Windows job decodes the PFX into the runner's temporary folder,
imports it into the current user's certificate store, and supplies only its
thumbprint to Tauri. Tauri invokes SignTool during release packaging with a
SHA-256 digest and RFC 3161 timestamping. The workflow then runs
`signtool verify /pa /v` against both the NSIS `.exe` and WiX `.msi`, and removes
the imported certificate and temporary PFX even if the build fails.

If either required secret is missing, Windows packaging continues unsigned and
the workflow displays an explicit warning. Invalid or incomplete signing
material fails the Windows job instead of silently publishing a bad signature.
After all platform jobs succeed, `SHA256SUMS.txt` is generated from the uploaded
release artifacts and attached to the same GitHub Release.

## Engine licensing

Before bundling FFmpeg, fill in `binaries/manifest.json` and
update `THIRD_PARTY_LICENSES.md`. Do not publish unknown or incompatible binary
builds.
