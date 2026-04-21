# Shared helpers for run.ps1 and ps-modules.
# Keep functions tiny and side-effect-free where possible.

function Write-Step {
  param([string]$Message, [string]$Color = "Cyan")
  Write-Host ""
  Write-Host "==> $Message" -ForegroundColor $Color
}

function Write-Info { param([string]$Message) Write-Host "    $Message" -ForegroundColor Gray }
function Write-Ok   { param([string]$Message) Write-Host "    [OK] $Message" -ForegroundColor Green }
function Write-Warn { param([string]$Message) Write-Host "    [WARN] $Message" -ForegroundColor Yellow }
function Write-Err  { param([string]$Message) Write-Host "    [ERR ] $Message" -ForegroundColor Red }

function Test-CommandExists {
  param([string]$Name)
  return [bool](Get-Command $Name -ErrorAction SilentlyContinue)
}

function Read-JsonFile {
  param([string]$Path)
  if (-not (Test-Path $Path)) { throw "Config file not found: $Path" }
  try { return Get-Content $Path -Raw | ConvertFrom-Json }
  catch { throw "Failed to parse JSON ($Path): $($_.Exception.Message)" }
}
