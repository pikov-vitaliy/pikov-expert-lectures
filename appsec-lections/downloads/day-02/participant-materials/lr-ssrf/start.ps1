[CmdletBinding()]
param(
  [ValidateRange(1024, 65535)][int]$LabPort = 8080
)

$ErrorActionPreference = 'Stop'
$ComposeFile = Join-Path $PSScriptRoot 'docker-compose.yml'
$StopScript = Join-Path $PSScriptRoot 'stop.ps1'
$ProjectName = 'appsec-day2-ssrf'

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
  & $StopScript -ValidateOnly
  $listener = Get-NetTCPConnection -State Listen -LocalPort $LabPort -ErrorAction SilentlyContinue
  if ($listener) { throw "Local port $LabPort is occupied; choose another port and repeat preflight" }

  $env:SSRF_LAB_PORT = [string]$LabPort
  [void](Invoke-Docker -Arguments @('compose', '--project-name', $ProjectName, '-f', $ComposeFile, 'config', '--quiet'))
  [void](Invoke-Docker -Arguments @('compose', '--project-name', $ProjectName, '-f', $ComposeFile, 'up', '--build', '--detach'))

  $ready = $false
  foreach ($attempt in 1..30) {
    try {
      $response = Invoke-WebRequest -UseBasicParsing -Uri "http://127.0.0.1:$LabPort/" -TimeoutSec 3
      if ($response.StatusCode -eq 200) { $ready = $true; break }
    } catch {
      Start-Sleep -Milliseconds 500
    }
  }
  if (-not $ready) { throw 'SSRF fixture did not become HTTP-ready within the bounded wait' }
  Write-Output "LAB READY http://127.0.0.1:$LabPort/"
} catch {
  $startError = $_
  try { & $StopScript } catch { throw "$startError`nCleanup also failed: $_" }
  throw $startError
}
