# Resolve Chrome/Edge executable + user-data directory + target profile.
# All resolution rules live here so run.ps1 stays declarative.

function Resolve-BrowserExe {
  param(
    [string]$Browser,        # "chrome" | "edge"
    [string]$Override = ""
  )
  if ($Override -and (Test-Path $Override)) { return (Resolve-Path $Override).Path }
  if ($Override) { Write-Warn "browser exe override does not exist: $Override (falling back to auto-detect)" }

  $candidates = @()
  if ($Browser -eq "edge") {
    $candidates = @(
      "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe",
      "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe",
      "$env:LOCALAPPDATA\Microsoft\Edge\Application\msedge.exe"
    )
    $cmd = Get-Command "msedge.exe" -ErrorAction SilentlyContinue
  } else {
    $candidates = @(
      "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
      "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
      "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe"
    )
    $cmd = Get-Command "chrome.exe" -ErrorAction SilentlyContinue
  }
  if ($cmd) { return $cmd.Source }
  foreach ($p in $candidates) { if (Test-Path $p) { return $p } }
  throw "Could not locate $Browser executable. Set chromeExePath / edgeExePath in powershell.json."
}

function Resolve-UserDataDir {
  param(
    [string]$Browser,
    [string]$Override = ""
  )
  if ($Override) { return $Override }
  if ($Browser -eq "edge") { return "$env:LOCALAPPDATA\Microsoft\Edge\User Data" }
  return "$env:LOCALAPPDATA\Google\Chrome\User Data"
}

function Test-ProfileExists {
  param([string]$UserDataDir, [string]$ProfileName)
  $profilePath = Join-Path $UserDataDir $ProfileName
  return (Test-Path $profilePath)
}

function Get-AllProfileNames {
  param([string]$UserDataDir)
  if (-not (Test-Path $UserDataDir)) { return @() }
  $names = @()
  foreach ($d in (Get-ChildItem $UserDataDir -Directory -ErrorAction SilentlyContinue)) {
    $prefsPath = Join-Path $d.FullName "Preferences"
    if (Test-Path $prefsPath) { $names += $d.Name }
  }
  return $names
}
