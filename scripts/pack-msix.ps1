[CmdletBinding()]
param(
  [switch]$LocalTest
)

$ErrorActionPreference = "Stop"

if ($env:OS -ne "Windows_NT") {
  throw "MSIX packaging must run on Windows."
}

function Invoke-CheckedCommand {
  param(
    [Parameter(Mandatory = $true)][string]$Command,
    [Parameter(ValueFromRemainingArguments = $true)][string[]]$Arguments
  )

  & $Command @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "$Command failed with exit code $LASTEXITCODE."
  }
}

function Require-EnvironmentValue {
  param([Parameter(Mandatory = $true)][string]$Name)

  $value = [Environment]::GetEnvironmentVariable($Name)
  if ([string]::IsNullOrWhiteSpace($value)) {
    throw "$Name is required. Copy the exact value from Partner Center; do not invent an identity value."
  }

  return $value.Trim()
}

$repositoryRoot = Split-Path -Parent $PSScriptRoot
$packageIdentityName = Require-EnvironmentValue "MICROSOFT_STORE_IDENTITY_NAME"
$publisher = Require-EnvironmentValue "MICROSOFT_STORE_PUBLISHER"
$publisherDisplayName = Require-EnvironmentValue "MICROSOFT_STORE_PUBLISHER_DISPLAY_NAME"
$storeDisplayName = Require-EnvironmentValue "MICROSOFT_STORE_DISPLAY_NAME"
$storeVersion = Require-EnvironmentValue "MICROSOFT_STORE_VERSION"

if ($storeVersion -notmatch "^(\d+)\.(\d+)\.(\d+)\.(\d+)$") {
  throw "MICROSOFT_STORE_VERSION must use Major.Minor.Build.Revision format."
}

$versionParts = $storeVersion.Split(".") | ForEach-Object { [int]$_ }
if ($versionParts[0] -eq 0) {
  throw "The Microsoft Store package version major component cannot be zero."
}
if (($versionParts | Where-Object { $_ -gt 65535 }).Count -gt 0) {
  throw "Every Microsoft Store package version component must be between 0 and 65535."
}
if ($versionParts[3] -ne 0) {
  throw "The fourth Microsoft Store package version component is reserved by the Store and must be zero."
}

$winapp = Get-Command winapp -ErrorAction SilentlyContinue
if (-not $winapp) {
  throw "winapp CLI was not found. Install it with: winget install Microsoft.winappcli --source winget"
}

$artifactRoot = Join-Path $repositoryRoot "artifacts\msix"
$stagingDirectory = Join-Path $artifactRoot "staging"
$expectedArtifactPrefix = [IO.Path]::GetFullPath($artifactRoot) + [IO.Path]::DirectorySeparatorChar
$resolvedStagingDirectory = [IO.Path]::GetFullPath($stagingDirectory)

if (-not $resolvedStagingDirectory.StartsWith($expectedArtifactPrefix, [StringComparison]::OrdinalIgnoreCase)) {
  throw "Refusing to reset an MSIX staging directory outside artifacts/msix."
}

New-Item -ItemType Directory -Path $artifactRoot -Force | Out-Null
if (Test-Path -LiteralPath $resolvedStagingDirectory) {
  Remove-Item -LiteralPath $resolvedStagingDirectory -Recurse -Force
}
New-Item -ItemType Directory -Path $resolvedStagingDirectory | Out-Null

$tauriDirectory = Join-Path $repositoryRoot "apps\desktop"
$tauriCli = Join-Path $repositoryRoot "node_modules\.bin\tauri.cmd"
if (-not (Test-Path -LiteralPath $tauriCli)) {
  throw "Tauri CLI was not found. Run npm ci first."
}

Push-Location $tauriDirectory
try {
  Invoke-CheckedCommand $tauriCli "build" "--target" "x86_64-pc-windows-msvc" "--no-bundle" "--ci"
}
finally {
  Pop-Location
}

$releaseDirectory = Join-Path $repositoryRoot "target\x86_64-pc-windows-msvc\release"
$executableName = "recast-desktop.exe"
$executablePath = Join-Path $releaseDirectory $executableName
$resourceDirectory = Join-Path $releaseDirectory "resources"

if (-not (Test-Path -LiteralPath $executablePath)) {
  throw "Tauri build did not produce $executablePath."
}
if (-not (Test-Path -LiteralPath $resourceDirectory)) {
  throw "Tauri build did not produce the bundled resource directory at $resourceDirectory."
}

Copy-Item -LiteralPath $executablePath -Destination $resolvedStagingDirectory
Copy-Item -LiteralPath $resourceDirectory -Destination (Join-Path $resolvedStagingDirectory "resources") -Recurse

$manifestTemplate = Join-Path $repositoryRoot "apps\desktop\msix\Package.appxmanifest"
$manifestPath = Join-Path $resolvedStagingDirectory "Package.appxmanifest"
Copy-Item -LiteralPath $manifestTemplate -Destination $manifestPath

[xml]$manifest = Get-Content -LiteralPath $manifestPath -Raw
$namespace = New-Object System.Xml.XmlNamespaceManager($manifest.NameTable)
$namespace.AddNamespace("foundation", "http://schemas.microsoft.com/appx/manifest/foundation/windows10")
$namespace.AddNamespace("uap", "http://schemas.microsoft.com/appx/manifest/uap/windows10")
$identity = $manifest.SelectSingleNode("/foundation:Package/foundation:Identity", $namespace)
$displayNameNode = $manifest.SelectSingleNode("/foundation:Package/foundation:Properties/foundation:DisplayName", $namespace)
$publisherDisplayNameNode = $manifest.SelectSingleNode("/foundation:Package/foundation:Properties/foundation:PublisherDisplayName", $namespace)
$visualElements = $manifest.SelectSingleNode("/foundation:Package/foundation:Applications/foundation:Application/uap:VisualElements", $namespace)

if (-not $identity -or -not $displayNameNode -or -not $publisherDisplayNameNode -or -not $visualElements) {
  throw "Package.appxmanifest does not contain the required identity and display-name nodes."
}

$identity.SetAttribute("Name", $packageIdentityName)
$identity.SetAttribute("Publisher", $publisher)
$identity.SetAttribute("Version", $storeVersion)
$displayNameNode.InnerText = $storeDisplayName
$publisherDisplayNameNode.InnerText = $publisherDisplayName
$visualElements.SetAttribute("DisplayName", $storeDisplayName)
$manifest.Save($manifestPath)

$logoSource = Join-Path $repositoryRoot "assets\recast.png"
Invoke-CheckedCommand $winapp.Source "manifest" "update-assets" $logoSource `
  "--manifest" $manifestPath `
  "--quiet"

$outputPath = Join-Path $artifactRoot "${packageIdentityName}_${storeVersion}_x64.msix"
if (Test-Path -LiteralPath $outputPath) {
  Remove-Item -LiteralPath $outputPath -Force
}

$packArguments = @(
  "pack",
  $resolvedStagingDirectory,
  "--manifest", $manifestPath,
  "--executable", $executableName,
  "--output", $outputPath,
  "--quiet"
)

if ($LocalTest) {
  $developmentCertificatePassword = Require-EnvironmentValue "MSIX_DEVELOPMENT_CERTIFICATE_PASSWORD"
  $developmentCertificate = Join-Path $artifactRoot "devcert.pfx"

  if (-not (Test-Path -LiteralPath $developmentCertificate)) {
    Invoke-CheckedCommand $winapp.Source "cert" "generate" `
      "--manifest" $manifestPath `
      "--output" $developmentCertificate `
      "--password" $developmentCertificatePassword
  }

  $packArguments += @("--cert", $developmentCertificate, "--cert-password", $developmentCertificatePassword)
  Write-Output "Creating a development-signed MSIX for local sideload testing."
}
else {
  Write-Output "Creating an unsigned MSIX for Microsoft Store submission. Partner Center will sign it."
}

Invoke-CheckedCommand $winapp.Source @packArguments
Write-Output "MSIX created at $outputPath"
