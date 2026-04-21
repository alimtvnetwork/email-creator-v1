# Kill running Chrome/Edge bound to a given user-data dir, then relaunch
# with --profile-directory and --load-extension. Chrome re-reads files on
# relaunch, so this also handles the "reload extension" case.

function Stop-BrowserForUserDataDir {
  param(
    [string]$Browser,        # "chrome" | "edge"
    [string]$UserDataDir
  )
  $procName = if ($Browser -eq "edge") { "msedge" } else { "chrome" }
  $matched = @()
  $allFlagged = $false

  # Try to filter by command line via WMI (CIM). Falls back to "all" if WMI
  # can't be queried (some locked-down corporate machines).
  try {
    $procs = Get-CimInstance Win32_Process -Filter "Name='$procName.exe'" -ErrorAction Stop
    foreach ($p in $procs) {
      $cmd = $p.CommandLine
      if (-not $cmd) { continue }
      if ($cmd -match [regex]::Escape("--user-data-dir=$UserDataDir") -or
          ($cmd -notmatch "--user-data-dir=" -and (Resolve-DefaultUserDataDir $Browser) -eq $UserDataDir)) {
        $matched += $p.ProcessId
      }
    }
  } catch {
    Write-Warn "WMI query failed ($($_.Exception.Message)); will close ALL $procName processes."
    $matched = (Get-Process $procName -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Id)
    $allFlagged = $true
  }

  if (-not $matched -or $matched.Count -eq 0) {
    Write-Info "No running $procName processes bound to $UserDataDir."
    return
  }

  Write-Warn "Closing $($matched.Count) $procName process(es)$(if($allFlagged){' (could not filter by user-data-dir)'} else {' bound to '+$UserDataDir})"
  foreach ($pid in $matched) {
    try { Stop-Process -Id $pid -Force -ErrorAction Stop } catch { Write-Warn "  pid $pid: $($_.Exception.Message)" }
  }
  Start-Sleep -Milliseconds 600
}

function Resolve-DefaultUserDataDir {
  param([string]$Browser)
  if ($Browser -eq "edge") { return "$env:LOCALAPPDATA\Microsoft\Edge\User Data" }
  return "$env:LOCALAPPDATA\Google\Chrome\User Data"
}

function Start-BrowserWithExtension {
  param(
    [string]$ExePath,
    [string]$UserDataDir,
    [string]$ProfileName,
    [string]$ExtensionPath,
    [string[]]$ExtraArgs = @()
  )

  if (-not (Test-Path $ExtensionPath)) {
    throw "Extension path does not exist: $ExtensionPath"
  }
  if (-not (Test-Path (Join-Path $ExtensionPath "manifest.json"))) {
    throw "manifest.json missing in extension path: $ExtensionPath"
  }

  $argsList = @(
    "--user-data-dir=$UserDataDir",
    "--profile-directory=$ProfileName",
    "--load-extension=$ExtensionPath"
  ) + $ExtraArgs

  Write-Info "Launching: $ExePath"
  Write-Info "  --user-data-dir   = $UserDataDir"
  Write-Info "  --profile-directory = $ProfileName"
  Write-Info "  --load-extension  = $ExtensionPath"
  if ($ExtraArgs.Count -gt 0) { Write-Info "  extra: $($ExtraArgs -join ' ')" }

  Start-Process -FilePath $ExePath -ArgumentList $argsList | Out-Null
}

function Invoke-DeployExtension {
  param(
    [pscustomobject]$Config,
    [string]$ExtensionPath,
    [string]$ProfileOverride = "",
    [string]$BrowserOverride = ""
  )

  $browser = if ($BrowserOverride) { $BrowserOverride } elseif ($Config.browser) { $Config.browser } else { "chrome" }
  $profileName = if ($ProfileOverride) { $ProfileOverride } elseif ($Config.profile) { $Config.profile } else { "Default" }

  $exeOverride = if ($browser -eq "edge") { $Config.edgeExePath } else { $Config.chromeExePath }
  $udOverride  = if ($browser -eq "edge") { $Config.edgeUserDataDir } else { $Config.chromeUserDataDir }

  $exe = Resolve-BrowserExe -Browser $browser -Override ([string]$exeOverride)
  $userDataDir = Resolve-UserDataDir -Browser $browser -Override ([string]$udOverride)

  Write-Info "Browser:       $browser"
  Write-Info "Executable:    $exe"
  Write-Info "User-data dir: $userDataDir"
  Write-Info "Profile:       $profileName"

  if (-not (Test-ProfileExists -UserDataDir $userDataDir -ProfileName $profileName)) {
    $available = (Get-AllProfileNames -UserDataDir $userDataDir) -join ", "
    Write-Warn "Profile '$profileName' not found under $userDataDir."
    if ($available) { Write-Warn "  Available profiles: $available" }
    Write-Warn "  Continuing anyway — Chrome will create the profile on first launch."
  }

  $shouldKill = $true
  if ($null -ne $Config.killBeforeLaunch) { $shouldKill = [bool]$Config.killBeforeLaunch }
  if ($shouldKill) { Stop-BrowserForUserDataDir -Browser $browser -UserDataDir $userDataDir }
  else { Write-Info "killBeforeLaunch=false; not closing existing browser processes." }

  $extraArgs = @()
  if ($Config.extraChromeArgs) { $extraArgs = @($Config.extraChromeArgs) }

  Start-BrowserWithExtension `
    -ExePath $exe `
    -UserDataDir $userDataDir `
    -ProfileName $profileName `
    -ExtensionPath $ExtensionPath `
    -ExtraArgs $extraArgs

  Write-Ok "Deployed. Click the XP21 toolbar icon (or the popup) to inject the panel on the active tab."
}
