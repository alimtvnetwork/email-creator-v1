# Pulls latest source, installs deps, and builds the injectable bundle.
# Output: dist/bundle.js (paste into DevTools) and dist/bookmarklet.txt.
$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot  = Resolve-Path (Join-Path $scriptDir "..\..")

Write-Host "==> git pull in $repoRoot"
Push-Location $repoRoot
try {
    git pull --ff-only
} finally {
    Pop-Location
}

Write-Host "==> npm install"
Push-Location $scriptDir
try {
    npm install --no-audit --no-fund

    Write-Host "==> build"
    node build.mjs

    $bundle      = Join-Path $scriptDir "dist\bundle.js"
    $bookmarklet = Join-Path $scriptDir "dist\bookmarklet.txt"
    Write-Host ""
    Write-Host "Bundle:      $bundle"
    Write-Host "Bookmarklet: $bookmarklet"
} finally {
    Pop-Location
}
