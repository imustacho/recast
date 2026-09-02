# Microsoft Store MSIX packaging

Recast uses Microsoft's `winapp` CLI to create a separate x64 MSIX package for
Microsoft Store submission. This path does not replace or rename the NSIS `.exe`
or WiX `.msi` artifacts produced by the existing Release workflow.

## Partner Center configuration

Reserve the application in Partner Center before packaging. Copy these three
values exactly from the product identity page; do not use the marketing name or
invent substitute values:

- `Package/Identity/Name` -> `MICROSOFT_STORE_IDENTITY_NAME`
- `Package/Identity/Publisher` -> `MICROSOFT_STORE_PUBLISHER`
- `Package/Properties/PublisherDisplayName` ->
  `MICROSOFT_STORE_PUBLISHER_DISPLAY_NAME`

The packaging script injects them into
`apps/desktop/msix/Package.appxmanifest`. It also requires
`MICROSOFT_STORE_VERSION` in `Major.Minor.Build.Revision` form. For Store
packages, the major component must be nonzero, every component must be at most
65535, and the Store-reserved fourth component must be `0`.

For GitHub Actions, create repository **Variables** (not secrets) with the three
Partner Center values. Run the **Microsoft Store MSIX** workflow manually and
enter the package version when prompted. The workflow creates an unsigned MSIX
and stores it as a workflow artifact; it does not create a Git tag or GitHub
Release.

## Local Store package build

Install the prerequisites, dependencies, and Microsoft's CLI on Windows:

```powershell
winget install Microsoft.winappcli --source winget
npm ci
```

Set the exact Partner Center identity and the next Store version in the current
PowerShell session:

```powershell
$env:MICROSOFT_STORE_IDENTITY_NAME = "<Package/Identity/Name>"
$env:MICROSOFT_STORE_PUBLISHER = "<Package/Identity/Publisher>"
$env:MICROSOFT_STORE_PUBLISHER_DISPLAY_NAME = "<PublisherDisplayName>"
$env:MICROSOFT_STORE_VERSION = "<Major.Minor.Build.0>"
npm run pack:msix
```

The output is `artifacts/msix/<IdentityName>_<Version>_x64.msix`. This unsigned
file is the Store submission package. Partner Center signs accepted Store
packages using the reserved product identity, so this path does not require a
paid CA code-signing certificate. During packaging, `winapp manifest
update-assets` generates the MSIX scale and target-size variants from
`assets/recast.png`.

## Local installation test

Windows will not sideload the unsigned Store submission package. To create a
development-signed package for local testing only, set a disposable certificate
password and run:

```powershell
$env:MSIX_DEVELOPMENT_CERTIFICATE_PASSWORD = "<local-development-password>"
npm run pack:msix:test
```

The script asks `winapp` to generate `artifacts/msix/devcert.pfx` from the
materialized manifest when it does not already exist. The certificate therefore
uses the same Publisher value as the MSIX. The PFX and the entire `artifacts/`
directory are ignored by Git.

Trust the development certificate from an elevated PowerShell prompt, then
install the generated MSIX:

```powershell
winapp cert install .\artifacts\msix\devcert.pfx --password $env:MSIX_DEVELOPMENT_CERTIFICATE_PASSWORD
$package = Get-ChildItem .\artifacts\msix\*.msix | Select-Object -First 1
Add-AppxPackage -Path $package.FullName
```

The development certificate is only for testing on machines where it has been
explicitly trusted. Never upload `devcert.pfx` to Partner Center or commit it.
If an earlier loose-layout package is registered, remove it first with
`winapp unregister --manifest .\artifacts\msix\staging\Package.appxmanifest`.
