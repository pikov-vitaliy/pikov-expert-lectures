[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$ComposeFile = Join-Path $PSScriptRoot 'compose.yaml'
$StopScript = Join-Path $PSScriptRoot 'stop.ps1'
$ProjectName = 'appsec-day1-juice-shop'
$ExpectedJuiceDigest = 'sha256:cd58d79c5cb4d82f22fbaf616f9ff43bbd04ba630cd6b448a9ed99cf652fcebf'
$ExpectedProxyDigest = 'sha256:28bd5fe8b56d1bd048e5babf5b10710ebe0bae67db86916198a6eec434943f8b'

function Invoke-Docker {
  param([Parameter(Mandatory = $true)][string[]]$Arguments)
  $output = @(& docker @Arguments 2>&1)
  if ($LASTEXITCODE -ne 0) {
    throw "Docker command failed: docker $($Arguments -join ' ')`n$($output -join [Environment]::NewLine)"
  }
  return @($output)
}

try {
  $serverVersion = (Invoke-Docker -Arguments @('version', '--format', '{{.Server.Version}}') | Select-Object -First 1).Trim()
  $versionMatch = [regex]::Match($serverVersion, '^(?<major>[0-9]+)\.')
  if (-not $versionMatch.Success -or [int]$versionMatch.Groups['major'].Value -lt 28) {
    throw "Docker Engine 28.0.0 or newer is required; found '$serverVersion'"
  }
  [void](Invoke-Docker -Arguments @('compose', 'version'))
  [void](Invoke-Docker -Arguments @('compose', '--project-name', $ProjectName, '-f', $ComposeFile, 'config', '--quiet'))

  foreach ($digest in @($ExpectedJuiceDigest, $ExpectedProxyDigest)) {
    $imageId = (Invoke-Docker -Arguments @('image', 'inspect', '--format', '{{.Id}}', $digest) | Select-Object -First 1).Trim()
    if ($imageId -ne $digest) { throw "Local image identity mismatch for $digest" }
  }

  & $StopScript -ValidateOnly
  $listener = Get-NetTCPConnection -State Listen -LocalPort 3000 -ErrorAction SilentlyContinue
  if ($listener) { throw 'Local port 3000 is occupied; stop and investigate before starting the lab' }

  [void](Invoke-Docker -Arguments @('compose', '--project-name', $ProjectName, '-f', $ComposeFile, 'up', '--detach', '--wait'))
  $ready = $false
  foreach ($attempt in 1..30) {
    try {
      $response = Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:3000/' -TimeoutSec 3
      if ($response.StatusCode -eq 200) { $ready = $true; break }
    } catch {
      Start-Sleep -Milliseconds 500
    }
  }
  if (-not $ready) { throw 'Juice Shop did not become HTTP-ready within the bounded wait' }
  Write-Output 'LAB READY http://127.0.0.1:3000/'
} catch {
  $startError = $_
  try { & $StopScript } catch { throw "$startError`nCleanup also failed: $_" }
  throw $startError
}
