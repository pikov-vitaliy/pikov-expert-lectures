Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$siteRoot = Split-Path -Parent $PSScriptRoot
$downloadsRoot = Join-Path $siteRoot 'downloads'
$dayRoot = Join-Path $downloadsRoot 'day-01'

if (-not (Test-Path -LiteralPath $dayRoot -PathType Container)) {
  throw "Не найден каталог исходных материалов: $dayRoot"
}

function New-DayArchive {
  param(
    [Parameter(Mandatory = $true)][string]$Destination,
    [Parameter(Mandatory = $true)][string[]]$Path
  )

  Remove-Item -LiteralPath $Destination -Force -ErrorAction SilentlyContinue
  Compress-Archive -LiteralPath $Path -DestinationPath $Destination -CompressionLevel Optimal -Force
}

$slides = Join-Path $dayRoot 'slides'
$transcripts = Join-Path $dayRoot 'transcripts'
$participantMaterials = Join-Path $dayRoot 'participant-materials'
$labResults = Join-Path $dayRoot 'lab-results'
$programAndEnvironment = Join-Path $dayRoot 'program-and-environment'

$archives = @(
  @{ Name = 'day-01-slides-original.zip'; Paths = @($slides) },
  @{ Name = 'day-01-transcripts-original.zip'; Paths = @($transcripts) },
  @{ Name = 'day-01-laboratory-materials-and-reports.zip'; Paths = @($participantMaterials, $labResults, $programAndEnvironment) },
  @{ Name = 'day-01-full-source-package.zip'; Paths = @($dayRoot) }
)

$checksumLines = New-Object System.Collections.Generic.List[string]
foreach ($archive in $archives) {
  $destination = Join-Path $downloadsRoot $archive.Name
  New-DayArchive -Destination $destination -Path $archive.Paths
  $hash = (Get-FileHash -LiteralPath $destination -Algorithm SHA256).Hash
  $size = (Get-Item -LiteralPath $destination).Length
  $checksumLines.Add("$hash  $($archive.Name)  $size bytes")
  Write-Output "BUILT $($archive.Name) $size bytes"
}

Set-Content -LiteralPath (Join-Path $downloadsRoot 'day-01-SHA256SUMS.txt') -Value $checksumLines -Encoding utf8

$files = Get-ChildItem -LiteralPath $dayRoot -File -Recurse | Sort-Object FullName | ForEach-Object {
  [pscustomobject]@{
    path = [System.IO.Path]::GetRelativePath($dayRoot, $_.FullName).Replace('\', '/')
    bytes = $_.Length
    sha256 = (Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash
  }
}
$manifest = [pscustomobject]@{
  title = 'Исходные материалы первого дня — 11 августа 2026 года'
  files = @($files)
}
$manifest | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath (Join-Path $downloadsRoot 'day-01-manifest.json') -Encoding utf8
Write-Output "BUILT day-01-manifest.json $($files.Count) files"
