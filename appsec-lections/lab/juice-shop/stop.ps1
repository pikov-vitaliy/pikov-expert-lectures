[CmdletBinding()]
param(
  [switch]$ValidateOnly
)

$ErrorActionPreference = 'Stop'
$ComposeFile = Join-Path $PSScriptRoot 'compose.yaml'
$ProjectName = 'appsec-day1-juice-shop'
$OwnerKey = 'expert.pikov.lab'
$OwnerValue = 'appsec-day1-juice-shop'
$ConfigKey = 'expert.pikov.config'
$ConfigValue = 'appsec-day1-juice-shop-v1'

function Invoke-Docker {
  param([Parameter(Mandatory = $true)][string[]]$Arguments)

  $output = @(& docker @Arguments 2>&1)
  if ($LASTEXITCODE -ne 0) {
    throw "Docker command failed: docker $($Arguments -join ' ')`n$($output -join [Environment]::NewLine)"
  }
  return @($output | ForEach-Object { ([string]$_).Trim() } | Where-Object { $_ })
}

function Assert-OwnedProjectObjects {
  $specifications = @(
    [pscustomobject]@{
      Kind = 'container'
      List = @('ps', '--all', '--filter', "label=com.docker.compose.project=$ProjectName", '--format', '{{.ID}}')
      Inspect = @('container', 'inspect')
      LabelPath = 'Config'
    },
    [pscustomobject]@{
      Kind = 'network'
      List = @('network', 'ls', '--filter', "label=com.docker.compose.project=$ProjectName", '--format', '{{.ID}}')
      Inspect = @('network', 'inspect')
      LabelPath = 'Labels'
    },
    [pscustomobject]@{
      Kind = 'volume'
      List = @('volume', 'ls', '--filter', "label=com.docker.compose.project=$ProjectName", '--format', '{{.Name}}')
      Inspect = @('volume', 'inspect')
      LabelPath = 'Labels'
    }
  )

  foreach ($specification in $specifications) {
    foreach ($objectId in @(Invoke-Docker -Arguments $specification.List)) {
      $json = (Invoke-Docker -Arguments @($specification.Inspect + $objectId)) -join "`n"
      $inspected = @($json | ConvertFrom-Json)
      if ($inspected.Count -ne 1) {
        throw "Foreign or unreadable $($specification.Kind) object '$objectId'; cleanup stopped"
      }
      $labels = if ($specification.LabelPath -eq 'Config') { $inspected[0].Config.Labels } else { $inspected[0].Labels }
      $owner = if ($labels) { $labels.PSObject.Properties[$OwnerKey] } else { $null }
      $config = if ($labels) { $labels.PSObject.Properties[$ConfigKey] } else { $null }
      if (-not $owner -or $owner.Value -ne $OwnerValue -or -not $config -or $config.Value -ne $ConfigValue) {
        throw "Foreign $($specification.Kind) object '$objectId' uses Compose project '$ProjectName'; cleanup stopped"
      }
    }
  }
}

Assert-OwnedProjectObjects
if ($ValidateOnly) {
  Write-Output 'OWNERSHIP OK'
  return
}

[void](Invoke-Docker -Arguments @('compose', '--project-name', $ProjectName, '-f', $ComposeFile, 'down', '--volumes', '--remove-orphans'))
Assert-OwnedProjectObjects

$remaining = @(
  Invoke-Docker -Arguments @('ps', '--all', '--filter', "label=com.docker.compose.project=$ProjectName", '--format', '{{.ID}}')
  Invoke-Docker -Arguments @('network', 'ls', '--filter', "label=com.docker.compose.project=$ProjectName", '--format', '{{.ID}}')
  Invoke-Docker -Arguments @('volume', 'ls', '--filter', "label=com.docker.compose.project=$ProjectName", '--format', '{{.Name}}')
) | Where-Object { $_ }
if ($remaining.Count -gt 0) {
  throw "Cleanup incomplete for '$ProjectName': $($remaining -join ', ')"
}

Write-Output 'CLEANUP OK'
