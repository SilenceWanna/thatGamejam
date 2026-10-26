param([switch]$NoOpen)
# Windows PowerShell 5.1 compatible. All downloads stay inside the project.
$ErrorActionPreference = 'Stop'
Set-Location (Join-Path $PSScriptRoot '..\..')
$projectRoot = (Get-Location).Path
$config = Get-Content -LiteralPath 'scripts\launcher\runtime.json' -Raw | ConvertFrom-Json
$architecture = $env:PROCESSOR_ARCHITEW6432
if (-not $architecture) { $architecture = $env:PROCESSOR_ARCHITECTURE }
switch ($architecture) {
    'ARM64' { $runtimeArch = 'arm64' }
    'AMD64' { $runtimeArch = 'x64' }
    default { throw 'This launcher requires 64-bit Windows (x64 or ARM64).' }
}
$runtimeName = "node-v$($config.version)-win-$runtimeArch"
$runtimeDirectory = Join-Path $projectRoot ".launcher\runtime\$runtimeName"
$runtimeNode = $null
$candidates = @()
if ($env:GAMEJAM_FORCE_BUNDLED_NODE -ne '1') {
    $systemNode = Get-Command node.exe -ErrorAction SilentlyContinue
    if ($systemNode) { $candidates += $systemNode.Source }
}
$candidates += (Join-Path $runtimeDirectory 'node.exe')
foreach ($candidate in $candidates) {
    if (Test-Path -LiteralPath $candidate) {
        & $candidate 'scripts/launcher/runtime-tools.cjs'
        if ($LASTEXITCODE -eq 0) { $runtimeNode = $candidate; break }
    }
}

if (-not $runtimeNode) {
    Write-Host "First launch: downloading Node.js $($config.version). Please stay online..."
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    $downloadDirectory = Join-Path $projectRoot ('.launcher\runtime\download-' + [guid]::NewGuid())
    New-Item -ItemType Directory -Path $downloadDirectory -Force | Out-Null
    try {
        $archive = Join-Path $downloadDirectory "$runtimeName.zip"
        Invoke-WebRequest -UseBasicParsing -Uri "https://nodejs.org/dist/v$($config.version)/$runtimeName.zip" -OutFile $archive
        $expectedHash = $config.PSObject.Properties["win-$runtimeArch"].Value
        if ((Get-FileHash -LiteralPath $archive -Algorithm SHA256).Hash -ne $expectedHash) {
            throw 'Node.js download checksum mismatch. Please launch again to retry.'
        }
        Expand-Archive -LiteralPath $archive -DestinationPath $downloadDirectory
        if (Test-Path -LiteralPath $runtimeDirectory) { Remove-Item -LiteralPath $runtimeDirectory -Recurse -Force }
        Move-Item -LiteralPath (Join-Path $downloadDirectory $runtimeName) -Destination $runtimeDirectory
    } finally {
        Remove-Item -LiteralPath $downloadDirectory -Recurse -Force
    }
    $runtimeNode = Join-Path $runtimeDirectory 'node.exe'
}

$env:PATH = (Split-Path -Parent $runtimeNode) + ';' + $env:PATH
$launcherArguments = @()
if ($NoOpen) { $launcherArguments += '--no-open' }
& $runtimeNode 'scripts/launcher/launch-game.mjs' @launcherArguments
exit $LASTEXITCODE
