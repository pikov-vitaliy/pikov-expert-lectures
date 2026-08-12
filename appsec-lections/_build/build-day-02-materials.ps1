Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$siteRoot = Split-Path -Parent $PSScriptRoot
$downloadsRoot = Join-Path $siteRoot 'downloads'
$dayRoot = Join-Path $downloadsRoot 'day-02'
$transcripts = Join-Path $dayRoot 'transcripts'
$participantMaterials = Join-Path $dayRoot 'participant-materials'
$materialsRoot = Join-Path $siteRoot 'materials'

foreach ($requiredPath in @($dayRoot, $transcripts, $participantMaterials, $materialsRoot)) {
  if (-not (Test-Path -LiteralPath $requiredPath -PathType Container)) {
    throw "Не найден обязательный каталог: $requiredPath"
  }
}

$authorMaterialNames = @(
  '2026-08-12-день-2-методический-конспект.md',
  'практикум-день-2-набор-заданий.md',
  'источники-и-версии-день-2.md',
  'день-2-веб-слайды-AppSec-SSDLC-и-ИИ.md'
)
$authorMaterialPaths = foreach ($name in $authorMaterialNames) {
  $path = Join-Path $materialsRoot $name
  if (-not (Test-Path -LiteralPath $path -PathType Leaf)) {
    throw "Не найден авторский материал второго дня: $path"
  }
  $path
}

function Assert-PublicTree {
  param([Parameter(Mandatory = $true)][string[]]$Path)

  $forbidden = Get-ChildItem -LiteralPath $Path -File -Recurse | Where-Object {
    $_.Extension -in @('.txt', '.jpg', '.jpeg', '.png', '.webp')
  }
  if ($forbidden) {
    $names = ($forbidden | ForEach-Object FullName) -join [Environment]::NewLine
    throw "В публичном пакете второго дня запрещены raw-тексты или изображения:`n$names"
  }
}

function New-DayTwoArchive {
  param(
    [Parameter(Mandatory = $true)][string]$Destination,
    [Parameter(Mandatory = $true)][string[]]$Path
  )

  Remove-Item -LiteralPath $Destination -Force -ErrorAction SilentlyContinue
  Compress-Archive -LiteralPath $Path -DestinationPath $Destination -CompressionLevel Optimal -Force
}

function Get-RelativeForwardSlashPath {
  param(
    [Parameter(Mandatory = $true)][string]$BasePath,
    [Parameter(Mandatory = $true)][string]$FullPath
  )

  $base = [System.IO.Path]::GetFullPath($BasePath).TrimEnd('\') + '\'
  $full = [System.IO.Path]::GetFullPath($FullPath)
  if (-not $full.StartsWith($base, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "Файл находится вне ожидаемого каталога: $FullPath"
  }
  return $full.Substring($base.Length).Replace('\', '/')
}

Assert-PublicTree -Path (@($transcripts, $participantMaterials) + $authorMaterialPaths)

# Не допускаем повторного появления черновых/первичных архивов в release.
@(
  'day-02-slides-original.zip',
  'day-02-full-source-package.zip',
  'day-02-transcripts-original.zip',
  'day-02-group-submissions.zip',
  'day-02-SHA256SUMS.txt'
) | ForEach-Object {
  Remove-Item -LiteralPath (Join-Path $downloadsRoot $_) -Force -ErrorAction SilentlyContinue
}

$archives = @(
  @{ Name = 'day-02-edited-transcript-and-protocol.zip'; Paths = @($transcripts) },
  @{ Name = 'day-02-laboratory-materials.zip'; Paths = @($participantMaterials) },
  @{ Name = 'day-02-public-materials.zip'; Paths = @($transcripts, $participantMaterials) + $authorMaterialPaths }
)

$checksumLines = New-Object System.Collections.Generic.List[string]
foreach ($archive in $archives) {
  $destination = Join-Path $downloadsRoot $archive.Name
  New-DayTwoArchive -Destination $destination -Path $archive.Paths
  $hash = (Get-FileHash -LiteralPath $destination -Algorithm SHA256).Hash
  $size = (Get-Item -LiteralPath $destination).Length
  $checksumLines.Add("$hash  $($archive.Name)  $size bytes")
  Write-Output "BUILT $($archive.Name) $size bytes"
}

$checksumDocument = @(
  '# Контрольные суммы SHA-256 — материалы второго дня',
  '',
  '> ZIP-пакеты содержат только нормализованные Markdown-материалы и авторский локальный fixture. В них нет raw-ASR TXT, исходных изображений слайдов или документов подгрупп.',
  '',
  '```text'
) + @($checksumLines) + @('```')
Set-Content -LiteralPath (Join-Path $downloadsRoot 'day-02-SHA256SUMS.md') -Value $checksumDocument -Encoding utf8

$dayFiles = @($transcripts, $participantMaterials) | ForEach-Object {
  Get-ChildItem -LiteralPath $_ -File -Recurse
} | Sort-Object FullName | ForEach-Object {
  [pscustomobject]@{
    path = Get-RelativeForwardSlashPath -BasePath $dayRoot -FullPath $_.FullName
    bytes = $_.Length
    sha256 = (Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash
  }
}
$authorFiles = $authorMaterialPaths | ForEach-Object {
  [pscustomobject]@{
    path = ('materials/' + [System.IO.Path]::GetFileName($_))
    bytes = (Get-Item -LiteralPath $_).Length
    sha256 = (Get-FileHash -LiteralPath $_ -Algorithm SHA256).Hash
  }
}
$files = @($dayFiles + $authorFiles | Sort-Object path)
$manifest = [pscustomobject]@{
  title = 'Публичные материалы второго дня — 12 августа 2026 года'
  files = @($files)
}
$manifestText = $manifest | ConvertTo-Json -Depth 4
[System.IO.File]::WriteAllText((Join-Path $downloadsRoot 'day-02-manifest.json'), $manifestText, (New-Object System.Text.UTF8Encoding($false)))
Write-Output "BUILT day-02-manifest.json $($files.Count) files"
