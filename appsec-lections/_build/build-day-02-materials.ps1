Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Convert-FromUtf8Base64 {
  param([Parameter(Mandatory = $true)][string]$Base64)
  return [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String($Base64))
}

$siteRoot = Split-Path -Parent $PSScriptRoot
$downloadsRoot = Join-Path $siteRoot 'downloads'
$dayRoot = Join-Path $downloadsRoot 'day-02'
$transcripts = Join-Path $dayRoot 'transcripts'
$participantMaterials = Join-Path $dayRoot 'participant-materials'
$materialsRoot = Join-Path $siteRoot 'materials'
$archiveHelper = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..\_PROJECT\deterministic-archive.ps1'))

foreach ($requiredPath in @($dayRoot, $transcripts, $participantMaterials, $materialsRoot)) {
  if (-not (Test-Path -LiteralPath $requiredPath -PathType Container)) {
    throw "Missing required directory: $requiredPath"
  }
}
if (-not (Test-Path -LiteralPath $archiveHelper -PathType Leaf)) {
  throw "Deterministic archive helper not found: $archiveHelper"
}
. $archiveHelper

$authorMaterialNames = @(
  (Convert-FromUtf8Base64 '0LTQtdC90YwtMi3QvNC10YLQvtC00LjRh9C10YHQutC40Lkt0LrQvtC90YHQv9C10LrRgi5tZA=='),
  (Convert-FromUtf8Base64 '0L/RgNCw0LrRgtC40LrRg9C8LdC00LXQvdGMLTIt0L3QsNCx0L7RgC3Qt9Cw0LTQsNC90LjQuS5tZA=='),
  (Convert-FromUtf8Base64 '0LjRgdGC0L7Rh9C90LjQutC4LdC4LdCy0LXRgNGB0LjQuC3QtNC10L3RjC0yLm1k'),
  (Convert-FromUtf8Base64 '0LTQtdC90YwtMi3QstC10LEt0YHQu9Cw0LnQtNGLLUFwcFNlYy1TU0RMQy3QuC3QmNCYLm1k')
)
$authorMaterialPaths = foreach ($name in $authorMaterialNames) {
  $path = Join-Path $materialsRoot $name
  if (-not (Test-Path -LiteralPath $path -PathType Leaf)) {
    throw "Missing Day 2 author material: $path"
  }
  $item = Get-Item -LiteralPath $path -Force
  if (($item.Attributes -band [System.IO.FileAttributes]::ReparsePoint) -ne 0) {
    throw "Day 2 author material must not be a reparse point: $path"
  }
  $path
}

Add-Type -AssemblyName System.IO.Compression.FileSystem

# Собираем архив из временного staging-каталога общим воспроизводимым writer:
# пути сортируются ordinal, текст канонизируется в UTF-8/LF без BOM, а mtime
# каждой ZIP-записи фиксируется, поэтому результат не зависит от EOL и mtime checkout.
# $Dir — каталоги, копируемые в корень архива под своим именем;
# $AuthorFile — файлы, помещаемые в архиве под materials/.
function New-DayTwoArchive {
  param(
    [Parameter(Mandatory = $true)][string]$Destination,
    [string[]]$Dir = @(),
    [string[]]$AuthorFile = @()
  )

  Remove-Item -LiteralPath $Destination -Force -ErrorAction SilentlyContinue
  $staging = Join-Path ([System.IO.Path]::GetTempPath()) ('d2zip-' + [System.Guid]::NewGuid().ToString('N'))
  New-Item -ItemType Directory -Path $staging -Force | Out-Null
  try {
    foreach ($d in $Dir) {
      Copy-Item -LiteralPath $d -Destination $staging -Recurse -Force
    }
    if ($AuthorFile.Count -gt 0) {
      $materialsStage = Join-Path $staging 'materials'
      New-Item -ItemType Directory -Path $materialsStage -Force | Out-Null
      foreach ($f in $AuthorFile) {
        Copy-Item -LiteralPath $f -Destination $materialsStage -Force
      }
    }
    New-DeterministicArchive -SourceRoot $staging -Destination $Destination
  }
  finally {
    Remove-Item -LiteralPath $staging -Recurse -Force -ErrorAction SilentlyContinue
  }
}

function Get-RelativeForwardSlashPath {
  param(
    [Parameter(Mandatory = $true)][string]$BasePath,
    [Parameter(Mandatory = $true)][string]$FullPath
  )

  $base = [System.IO.Path]::GetFullPath($BasePath).TrimEnd('\') + '\'
  $full = [System.IO.Path]::GetFullPath($FullPath)
  if (-not $full.StartsWith($base, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "File is outside the expected directory: $FullPath"
  }
  return $full.Substring($base.Length).Replace('\', '/')
}

function Assert-ExactPublicFileSet {
  param(
    [Parameter(Mandatory = $true)][string]$Root,
    [Parameter(Mandatory = $true)][string[]]$ExpectedRelativePath
  )

  $reparsePoints = @(Get-ChildItem -LiteralPath $Root -Force -Recurse | Where-Object {
    ($_.Attributes -band [System.IO.FileAttributes]::ReparsePoint) -ne 0
  })
  if ($reparsePoints.Count -gt 0) {
    throw "Unexpected public source reparse point: $($reparsePoints[0].FullName)"
  }

  $expected = @($ExpectedRelativePath | ForEach-Object { $_.Replace('\', '/') } | Sort-Object -Unique)
  $actual = @(Get-ChildItem -LiteralPath $Root -Force -File -Recurse | ForEach-Object {
    Get-RelativeForwardSlashPath -BasePath $Root -FullPath $_.FullName
  } | Sort-Object -Unique)
  $unexpected = @($actual | Where-Object { $expected -notcontains $_ })
  if ($unexpected.Count -gt 0) {
    throw "Unexpected public source file: $($unexpected[0])"
  }
  $missing = @($expected | Where-Object { $actual -notcontains $_ })
  if ($missing.Count -gt 0) {
    throw "Missing reviewed public source file: $($missing[0])"
  }
}

$dayTwoTranscriptFiles = @(
  (Convert-FromUtf8Base64 '0J/RgNC+0YLQvtC60L7Quy3QtNC90Y8tMDIt0YDQtdC00LDQutGC0LjRgNC+0LLQsNC90L3Ri9C5Lm1k'),
  (Convert-FromUtf8Base64 '0KHRgtC10L3QvtCz0YDQsNC80LzQsC3QtNC90Y8tMDIt0L/QvtC70L3QsNGPLdGA0LXQtNCw0LrRgtC40YDQvtCy0LDQvdC90LDRjy5tZA==')
)
$dayTwoParticipantFiles = @(
  'lr-ssrf/docker-compose.yml',
  'lr-ssrf/README.md',
  'lr-ssrf/app/app.py',
  'lr-ssrf/app/Dockerfile',
  'lr-ssrf/gateway/Dockerfile',
  'lr-ssrf/gateway/gateway.py',
  'lr-ssrf/internal/app.py',
  'lr-ssrf/internal/Dockerfile',
  'lr-ssrf/start.ps1',
  'lr-ssrf/stop.ps1'
)

# Fail closed before changing published archives. The package is built only
# when its source trees exactly match these reviewed relative-file allowlists.
Assert-ExactPublicFileSet -Root $transcripts -ExpectedRelativePath $dayTwoTranscriptFiles
Assert-ExactPublicFileSet -Root $participantMaterials -ExpectedRelativePath $dayTwoParticipantFiles

# Keep draft and primary archives from re-entering the public release.
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
  @{ Name = 'day-02-edited-transcript-and-protocol.zip'; Dir = @($transcripts); AuthorFile = @() },
  @{ Name = 'day-02-laboratory-materials.zip'; Dir = @($participantMaterials); AuthorFile = @() },
  @{ Name = 'day-02-public-materials.zip'; Dir = @($transcripts, $participantMaterials); AuthorFile = $authorMaterialPaths }
)

$checksumLines = New-Object System.Collections.Generic.List[string]
foreach ($archive in $archives) {
  $destination = Join-Path $downloadsRoot $archive.Name
  New-DayTwoArchive -Destination $destination -Dir $archive.Dir -AuthorFile $archive.AuthorFile
  $hash = Get-DeterministicFileSha256 -Path $destination
  $size = (Get-Item -LiteralPath $destination).Length
  $checksumLines.Add("$hash  $($archive.Name)  $size bytes")
  Write-Output "BUILT $($archive.Name) $size bytes"
}

$checksumDocument = @(
  (Convert-FromUtf8Base64 'IyDQmtC+0L3RgtGA0L7Qu9GM0L3Ri9C1INGB0YPQvNC80YsgU0hBLTI1NiDigJQg0LzQsNGC0LXRgNC40LDQu9GLINCy0YLQvtGA0L7Qs9C+INC00L3Rjw=='),
  '',
  (Convert-FromUtf8Base64 'PiBaSVAt0L/QsNC60LXRgtGLINGB0L7QtNC10YDQttCw0YIg0YLQvtC70YzQutC+INC90L7RgNC80LDQu9C40LfQvtCy0LDQvdC90YvQtSBNYXJrZG93bi3QvNCw0YLQtdGA0LjQsNC70Ysg0Lgg0LDQstGC0L7RgNGB0LrQuNC5INC70L7QutCw0LvRjNC90YvQuSBmaXh0dXJlLiDQkiDQvdC40YUg0L3QtdGCIHJhdy1BU1IgVFhULCDQuNGB0YXQvtC00L3Ri9GFINC40LfQvtCx0YDQsNC20LXQvdC40Lkg0YHQu9Cw0LnQtNC+0LIg0LjQu9C4INC00L7QutGD0LzQtdC90YLQvtCyINC/0L7QtNCz0YDRg9C/0L8u'),
  '',
  '```text'
) + @($checksumLines) + @('```')
Write-DeterministicUtf8Text `
  -Path (Join-Path $downloadsRoot 'day-02-SHA256SUMS.md') `
  -Text ($checksumDocument -join "`n")

$dayFiles = @($transcripts, $participantMaterials) | ForEach-Object {
  Get-ChildItem -LiteralPath $_ -File -Recurse
} | Sort-Object FullName | ForEach-Object {
  $archivePath = Get-RelativeForwardSlashPath -BasePath $dayRoot -FullPath $_.FullName
  Get-DeterministicArchiveFileRecord -Path $_.FullName -ArchivePath $archivePath
}
$authorFiles = $authorMaterialPaths | ForEach-Object {
  Get-DeterministicArchiveFileRecord `
    -Path $_ `
    -ArchivePath ('materials/' + [System.IO.Path]::GetFileName($_))
}
$files = @($dayFiles + $authorFiles | Sort-Object path)
$manifest = [pscustomobject]@{
  title = (Convert-FromUtf8Base64 '0J/Rg9Cx0LvQuNGH0L3Ri9C1INC80LDRgtC10YDQuNCw0LvRiyDQstGC0L7RgNC+0LPQviDQtNC90Y8=')
  files = @($files)
}
$manifestText = $manifest | ConvertTo-Json -Depth 4
Write-DeterministicUtf8Text -Path (Join-Path $downloadsRoot 'day-02-manifest.json') -Text $manifestText
Write-Output "BUILT day-02-manifest.json $($files.Count) files"
