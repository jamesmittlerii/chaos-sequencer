# Build an unsigned Windows installer for the VST3.
$ErrorActionPreference = "Stop"

$version = $env:LORENZ_VERSION
if (-not $version) { throw "LORENZ_VERSION is required" }

$root = Resolve-Path (Join-Path $PSScriptRoot "..\..\..")
$artefact = Join-Path $root "plugin\build\LorenzMIDI_artefacts\Release\VST3\Lorenz.vst3"
if (-not (Test-Path $artefact)) { throw "VST3 bundle not found: $artefact" }

$iscc = "C:\Program Files (x86)\Inno Setup 6\ISCC.exe"
if (-not (Test-Path $iscc)) { throw "Inno Setup compiler not found" }

$stage = Join-Path $PSScriptRoot "staging"
if (Test-Path $stage) { Remove-Item $stage -Recurse -Force }
New-Item -ItemType Directory -Path (Join-Path $stage "Lorenz.vst3") | Out-Null
Copy-Item -Path (Join-Path $artefact "*") -Destination (Join-Path $stage "Lorenz.vst3") -Recurse

& $iscc "/DAppVersion=$version" (Join-Path $PSScriptRoot "lorenz.iss")
if ($LASTEXITCODE -ne 0) { throw "ISCC failed" }

$installer = Join-Path $root "dist\Lorenz-$version-Windows.exe"
if (-not (Test-Path $installer)) { throw "installer was not written: $installer" }
Write-Host "wrote unsigned $installer"
