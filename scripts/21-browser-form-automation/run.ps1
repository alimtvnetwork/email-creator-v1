# XP21 — Build & Deploy script
# Version: 0.12.0
#
# USAGE
#   .\run.ps1                Pull, install, build (legacy behavior)
#   .\run.ps1 -D             Pull, install, build, then deploy + reload Chrome extension
#   .\run.ps1 -D -S          Skip build, just deploy (re-launch Chrome with current extension/)
#   .\run.ps1 -D -P          Skip git pull
#   .\run.ps1 -D -Profile "Profile 2"   Override the configured Chrome profile
#   .\run.ps1 -D -Browser edge          Use Edge instead of Chrome
#   .\run.ps1 -h             Show this help

param(
  [Alias('d')][switch]$Deploy,
  [Alias('s')][switch]$SkipBuild,
  [Alias('p')][switch]$SkipPull,
  [Alias('h')][switch]$Help,
  [string]$Profile = "",
  [string]$Browser = ""
)

$ErrorActionPreference = "Stop"

# ---------------------------------------------------------------------------
# Paths + module loading
# ---------------------------------------------------------------------------
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
if ([string]::IsNullOrWhiteSpace($ScriptDir)) { $ScriptDir = (Get-Location).Path }
$RepoRoot = Resolve-Path (Join-Path $ScriptDir "..\..")
$ExtensionDir = Join-Path $ScriptDir "extension"
$ConfigPath = Join-Path $ScriptDir "powershell.json"

$ModulesDir = Join-Path $ScriptDir "scripts\ps-modules"
$RequiredModules = @("utils.ps1", "browser-profiles.ps1", "browser-deploy.ps1")
foreach ($m in $RequiredModules) {
  $path = Join-Path $ModulesDir $m
  if (-not (Test-Path $path)) {
    Write-Host "ERROR: Missing ps-module: $path" -ForegroundColor Red
    exit 1
  }
  . $path
}

if ($Help) {
  @"
XP21 — Build & Deploy

  -D, -Deploy       Build, then deploy + reload the Chrome extension on the
                    profile configured in powershell.json (default: 'Default').
  -S, -SkipBuild    Skip the build step (only useful with -D).
  -P, -SkipPull     Skip the git pull step.
  -Profile <name>   Override Chrome profile directory (e.g. "Default", "Profile 1").
  -Browser <name>   Override browser ("chrome" | "edge").
  -h, -Help         Show this help.

Configure defaults in: $ConfigPath
"@ | Write-Host
  exit 0
}

# ---------------------------------------------------------------------------
# Step 1 — git pull
# ---------------------------------------------------------------------------
if (-not $SkipPull) {
  Write-Step "git pull in $RepoRoot"
  Push-Location $RepoRoot
  try {
    if (Test-Path ".git") {
      git pull --ff-only
      if ($LASTEXITCODE -ne 0) { Write-Warn "git pull returned non-zero; continuing with local state." }
      else { Write-Ok "git up to date" }
    } else {
      Write-Info "Not a git repo; skipping."
    }
  } finally { Pop-Location }
} else {
  Write-Step "Skipping git pull (-P)"
}

# ---------------------------------------------------------------------------
# Step 2 — npm install + build
# ---------------------------------------------------------------------------
if (-not $SkipBuild) {
  Write-Step "npm install (idempotent)"
  Push-Location $ScriptDir
  try {
    npm install --no-audit --no-fund
    if ($LASTEXITCODE -ne 0) { throw "npm install failed (exit $LASTEXITCODE)" }

    Write-Step "esbuild bundle"
    node build.mjs
    if ($LASTEXITCODE -ne 0) { throw "build.mjs failed (exit $LASTEXITCODE)" }
  } finally { Pop-Location }

  $bundle      = Join-Path $ScriptDir "dist\bundle.js"
  $bookmarklet = Join-Path $ScriptDir "dist\bookmarklet.txt"
  $loader      = Join-Path $ScriptDir "dist\loader.txt"
  Write-Host ""
  Write-Ok "Bundle:        $bundle"
  Write-Ok "Bookmarklet:   $bookmarklet"
  Write-Ok "Loader:        $loader"
  Write-Ok "Extension:     $ExtensionDir"
} else {
  Write-Step "Skipping build (-S)"
}

# ---------------------------------------------------------------------------
# Step 3 — deploy (only with -D)
# ---------------------------------------------------------------------------
if ($Deploy) {
  Write-Step "Deploying Chrome extension"

  $config = $null
  if (Test-Path $ConfigPath) {
    try { $config = Read-JsonFile $ConfigPath }
    catch { Write-Warn "Could not read $ConfigPath — using defaults. ($($_.Exception.Message))"; $config = [pscustomobject]@{} }
  } else {
    Write-Warn "$ConfigPath not found — using defaults."
    $config = [pscustomobject]@{}
  }

  Invoke-DeployExtension `
    -Config $config `
    -ExtensionPath $ExtensionDir `
    -ProfileOverride $Profile `
    -BrowserOverride $Browser
} else {
  Write-Host ""
  Write-Info "Tip: pass -D to deploy + reload the Chrome extension on your profile."
}
