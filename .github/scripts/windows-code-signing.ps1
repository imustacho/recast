param(
  [Parameter(Mandatory = $true)]
  [ValidateSet("prepare", "verify", "cleanup")]
  [string]$Mode
)

$ErrorActionPreference = "Stop"

function Add-GitHubEnvironmentVariable {
  param(
    [Parameter(Mandatory = $true)][string]$Name,
    [Parameter(Mandatory = $true)][AllowEmptyString()][string]$Value
  )

  if (-not $env:GITHUB_ENV) {
    throw "GITHUB_ENV is not available. This script is intended for GitHub Actions."
  }

  "$Name=$Value" | Out-File -FilePath $env:GITHUB_ENV -Encoding utf8 -Append
}

function Find-SignTool {
  $command = Get-Command signtool.exe -ErrorAction SilentlyContinue
  if ($command) {
    return $command.Source
  }

  $kitsRoot = Join-Path ${env:ProgramFiles(x86)} "Windows Kits\10\bin"
  $candidate = Get-ChildItem -LiteralPath $kitsRoot -Filter signtool.exe -File -Recurse |
    Where-Object { $_.FullName -match "\\x64\\signtool\.exe$" } |
    Sort-Object FullName -Descending |
    Select-Object -First 1

  if (-not $candidate) {
    throw "SignTool was not found in PATH or the Windows SDK."
  }

  return $candidate.FullName
}

function Prepare-CodeSigning {
  $pfxBase64 = $env:WINDOWS_CERTIFICATE_PFX_BASE64
  $pfxPassword = $env:WINDOWS_CERTIFICATE_PASSWORD

  if ([string]::IsNullOrWhiteSpace($pfxBase64) -and [string]::IsNullOrWhiteSpace($pfxPassword)) {
    Write-Output "::warning title=Windows code signing skipped::WINDOWS_CERTIFICATE_PFX_BASE64 and WINDOWS_CERTIFICATE_PASSWORD are not configured; unsigned Windows artifacts will be published."
    Add-GitHubEnvironmentVariable -Name "WINDOWS_CODE_SIGNING_ENABLED" -Value "false"
    return
  }

  if ([string]::IsNullOrWhiteSpace($pfxBase64) -or [string]::IsNullOrWhiteSpace($pfxPassword)) {
    Write-Output "::warning title=Windows code signing skipped::Both WINDOWS_CERTIFICATE_PFX_BASE64 and WINDOWS_CERTIFICATE_PASSWORD must be configured; unsigned Windows artifacts will be published."
    Add-GitHubEnvironmentVariable -Name "WINDOWS_CODE_SIGNING_ENABLED" -Value "false"
    return
  }

  $signTool = Find-SignTool
  $signToolDirectory = Split-Path -Parent $signTool
  $signToolDirectory | Out-File -FilePath $env:GITHUB_PATH -Encoding utf8 -Append

  $pfxPath = Join-Path $env:RUNNER_TEMP "recast-code-signing.pfx"
  try {
    [IO.File]::WriteAllBytes($pfxPath, [Convert]::FromBase64String($pfxBase64))
    $securePassword = ConvertTo-SecureString $pfxPassword -AsPlainText -Force
    $importedCertificates = @(Import-PfxCertificate `
      -FilePath $pfxPath `
      -CertStoreLocation "Cert:\CurrentUser\My" `
      -Password $securePassword)
  }
  catch {
    Remove-Item -LiteralPath $pfxPath -Force -ErrorAction SilentlyContinue
    throw "Could not import the Windows signing certificate: $($_.Exception.Message)"
  }

  $codeSigningEku = "1.3.6.1.5.5.7.3.3"
  $certificate = $importedCertificates |
    Where-Object {
      $_.HasPrivateKey -and
      ($_.EnhancedKeyUsageList.ObjectId.Value -contains $codeSigningEku)
    } |
    Select-Object -First 1

  if (-not $certificate) {
    foreach ($importedCertificate in $importedCertificates) {
      Remove-Item -LiteralPath "Cert:\CurrentUser\My\$($importedCertificate.Thumbprint)" -Force -ErrorAction SilentlyContinue
    }
    Remove-Item -LiteralPath $pfxPath -Force -ErrorAction SilentlyContinue
    throw "The PFX does not contain a certificate with a private key and the Code Signing enhanced key usage."
  }

  $timestampUrl = if ([string]::IsNullOrWhiteSpace($env:WINDOWS_TIMESTAMP_URL)) {
    "http://timestamp.digicert.com"
  }
  else {
    $env:WINDOWS_TIMESTAMP_URL
  }

  $tauriConfig = @{
    bundle = @{
      windows = @{
        certificateThumbprint = $certificate.Thumbprint
        digestAlgorithm       = "sha256"
        timestampUrl          = $timestampUrl
        tsp                   = $true
      }
    }
  } | ConvertTo-Json -Depth 5 -Compress

  Add-GitHubEnvironmentVariable -Name "TAURI_CONFIG" -Value $tauriConfig
  Add-GitHubEnvironmentVariable -Name "WINDOWS_CODE_SIGNING_ENABLED" -Value "true"
  Add-GitHubEnvironmentVariable -Name "WINDOWS_CERTIFICATE_THUMBPRINT" -Value $certificate.Thumbprint
  Add-GitHubEnvironmentVariable -Name "WINDOWS_CERTIFICATE_PATH" -Value $pfxPath
  Write-Output "Windows code signing is enabled with SHA-256 and RFC 3161 timestamping."
}

function Verify-CodeSigning {
  if ($env:WINDOWS_CODE_SIGNING_ENABLED -ne "true") {
    Write-Output "::warning title=Unsigned Windows artifacts::Signature verification was skipped because code signing is not configured."
    return
  }

  $signTool = Find-SignTool
  $bundleRoot = Join-Path $env:GITHUB_WORKSPACE "target\x86_64-pc-windows-msvc\release\bundle"
  $installers = @(
    Get-ChildItem -Path (Join-Path $bundleRoot "nsis\*.exe") -File -ErrorAction SilentlyContinue
    Get-ChildItem -Path (Join-Path $bundleRoot "msi\*.msi") -File -ErrorAction SilentlyContinue
  )

  if ($installers.Count -ne 2) {
    throw "Expected one signed NSIS installer and one signed MSI package under $bundleRoot, but found $($installers.Count)."
  }

  foreach ($installer in $installers) {
    Write-Output "Verifying Authenticode signature: $($installer.Name)"
    & $signTool verify /pa /v $installer.FullName
    if ($LASTEXITCODE -ne 0) {
      throw "SignTool verification failed for $($installer.Name)."
    }
  }
}

function Remove-CodeSigningMaterial {
  if ($env:WINDOWS_CERTIFICATE_THUMBPRINT) {
    $certificatePath = "Cert:\CurrentUser\My\$($env:WINDOWS_CERTIFICATE_THUMBPRINT)"
    Remove-Item -LiteralPath $certificatePath -Force -ErrorAction SilentlyContinue
  }

  if ($env:WINDOWS_CERTIFICATE_PATH -and (Test-Path -LiteralPath $env:WINDOWS_CERTIFICATE_PATH)) {
    Remove-Item -LiteralPath $env:WINDOWS_CERTIFICATE_PATH -Force
  }
}

switch ($Mode) {
  "prepare" { Prepare-CodeSigning }
  "verify" { Verify-CodeSigning }
  "cleanup" { Remove-CodeSigningMaterial }
}
