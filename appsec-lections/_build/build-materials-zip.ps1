Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$siteRoot = Split-Path -Parent $PSScriptRoot
$downloadsRoot = Join-Path $siteRoot 'downloads'
$dayRoot = Join-Path $downloadsRoot 'day-01'

if (-not (Test-Path -LiteralPath $dayRoot -PathType Container)) {
  throw "Source materials directory not found: $dayRoot"
}

Add-Type -AssemblyName System.IO.Compression.FileSystem

# Собираем архив из временного staging-каталога через CreateFromDirectory: он
# пишет записи с прямым слэшем, поэтому дерево папок корректно разворачивается на
# macOS/Linux, а пути в архиве совпадают с манифестом (авторские файлы — под
# materials/, а не в корне, как это делал Compress-Archive со списком файлов).
function New-DayArchive {
  param(
    [Parameter(Mandatory = $true)][string]$Destination,
    [string[]]$Dir = @(),
    [string[]]$AuthorFile = @()
  )

  Remove-Item -LiteralPath $Destination -Force -ErrorAction SilentlyContinue
  $staging = Join-Path ([System.IO.Path]::GetTempPath()) ('d1zip-' + [System.Guid]::NewGuid().ToString('N'))
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
    [System.IO.Compression.ZipFile]::CreateFromDirectory(
      $staging, $Destination, [System.IO.Compression.CompressionLevel]::Optimal, $false)
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

function Get-LocalizedText {
  param([Parameter(Mandatory = $true)][string]$JsonString)
  return [string](ConvertFrom-Json -InputObject $JsonString)
}

$transcripts = Join-Path $dayRoot 'transcripts'
$participantMaterials = Join-Path $dayRoot 'participant-materials'
$labResults = Join-Path $dayRoot 'lab-results'
$programAndEnvironment = Join-Path $dayRoot 'program-and-environment'
$materialsRoot = Join-Path $siteRoot 'materials'

# The Day 1 handout is a closed, reviewed set. Do not let newly added Day 2
# materials silently cross the day boundary merely because they share a folder.
$dayOneAuthorMaterialNames = @(
  (Get-LocalizedText -JsonString '"2026-08-11-\u0434\u0435\u043d\u044c-1-\u043c\u0435\u0442\u043e\u0434\u0438\u0447\u0435\u0441\u043a\u0438\u0439-\u043a\u043e\u043d\u0441\u043f\u0435\u043a\u0442.md"'),
  (Get-LocalizedText -JsonString '"\u0434\u0435\u043d\u044c-1-\u0441\u043b\u0430\u0439\u0434\u044b-AppSec-OWASP-\u0438-\u0418\u0418.md"'),
  (Get-LocalizedText -JsonString '"\u0438\u0441\u0442\u043e\u0447\u043d\u0438\u043a\u0438-\u0438-\u0432\u0435\u0440\u0441\u0438\u0438.md"'),
  (Get-LocalizedText -JsonString '"\u043a\u0430\u0442\u0430\u043b\u043e\u0433-\u043c\u0430\u0442\u0435\u0440\u0438\u0430\u043b\u043e\u0432-\u0434\u043d\u044f-1.md"'),
  (Get-LocalizedText -JsonString '"\u043c\u0435\u0442\u043e\u0434\u0438\u043a\u0430-\u043f\u0440\u0435\u043f\u043e\u0434\u0430\u0432\u0430\u0442\u0435\u043b\u044f-\u0434\u0435\u043d\u044c-1.md"'),
  (Get-LocalizedText -JsonString '"\u043f\u0440\u0430\u0432\u0430-\u0438-\u0430\u0442\u0440\u0438\u0431\u0443\u0446\u0438\u044f.md"'),
  (Get-LocalizedText -JsonString '"\u043f\u0440\u0430\u043a\u0442\u0438\u043a\u0443\u043c-\u0431\u0435\u0437\u043e\u043f\u0430\u0441\u043d\u043e\u0441\u0442\u044c-\u043f\u0440\u0438\u043b\u043e\u0436\u0435\u043d\u0438\u0439-\u043c\u0435\u0442\u043e\u0434\u0438\u0447\u043a\u0430.md"'),
  (Get-LocalizedText -JsonString '"\u0447\u0435\u043a-\u043b\u0438\u0441\u0442-\u0441\u043b\u0443\u0448\u0430\u0442\u0435\u043b\u044f.md"'),
  (Get-LocalizedText -JsonString '"\u0448\u0430\u0431\u043b\u043e\u043d-\u043e\u0442\u0447\u0451\u0442\u0430-\u043b\u0430\u0431\u043e\u0440\u0430\u0442\u043e\u0440\u043d\u043e\u0439-\u0440\u0430\u0431\u043e\u0442\u044b.md"')
)
$dayOneAuthorMaterials = foreach ($name in $dayOneAuthorMaterialNames) {
  $path = Join-Path $materialsRoot $name
  if (-not (Test-Path -LiteralPath $path -PathType Leaf)) {
    throw "Missing Day 1 author material: $path"
  }
  $path
}

# Working photographs are used only for editorial verification and never enter
# the public package. Remove stale source artefacts before every release.
@('day-01-slides-original.zip', 'day-01-full-source-package.zip', 'day-01-transcripts-original.zip', 'day-01-SHA256SUMS.txt') | ForEach-Object {
  Remove-Item -LiteralPath (Join-Path $downloadsRoot $_) -Force -ErrorAction SilentlyContinue
}

$archives = @(
  @{ Name = 'day-01-edited-transcript-and-summaries.zip'; Dir = @($transcripts); AuthorFile = @() },
  @{ Name = 'day-01-laboratory-materials-and-reports.zip'; Dir = @($participantMaterials, $labResults, $programAndEnvironment); AuthorFile = @() },
  @{ Name = 'day-01-public-materials.zip'; Dir = @($transcripts, $participantMaterials, $labResults, $programAndEnvironment); AuthorFile = $dayOneAuthorMaterials }
)

$checksumLines = New-Object System.Collections.Generic.List[string]
foreach ($archive in $archives) {
  $destination = Join-Path $downloadsRoot $archive.Name
  New-DayArchive -Destination $destination -Dir $archive.Dir -AuthorFile $archive.AuthorFile
  $hash = (Get-FileHash -LiteralPath $destination -Algorithm SHA256).Hash
  $size = (Get-Item -LiteralPath $destination).Length
  $checksumLines.Add("$hash  $($archive.Name)  $size bytes")
  Write-Output "BUILT $($archive.Name) $size bytes"
}

$checksumDocument = @(
  (Get-LocalizedText -JsonString '"# \u041A\u043E\u043D\u0442\u0440\u043E\u043B\u044C\u043D\u044B\u0435 \u0441\u0443\u043C\u043C\u044B SHA-256 \u2014 \u043C\u0430\u0442\u0435\u0440\u0438\u0430\u043B\u044B \u043F\u0435\u0440\u0432\u043E\u0433\u043E \u0434\u043D\u044F"'),
  '',
  (Get-LocalizedText -JsonString '"> \u0417\u043D\u0430\u0447\u0435\u043D\u0438\u044F \u043E\u0442\u043D\u043E\u0441\u044F\u0442\u0441\u044F \u043A ZIP-\u043F\u0430\u043A\u0435\u0442\u0430\u043C, \u0441\u043E\u0431\u0440\u0430\u043D\u043D\u044B\u043C \u0438\u0437 \u043E\u043F\u0443\u0431\u043B\u0438\u043A\u043E\u0432\u0430\u043D\u043D\u043E\u0433\u043E \u043D\u0430\u0431\u043E\u0440\u0430. \u0412\u0441\u0435 \u0442\u0435\u043A\u0441\u0442\u043E\u0432\u044B\u0435 \u043C\u0430\u0442\u0435\u0440\u0438\u0430\u043B\u044B \u0432\u043D\u0443\u0442\u0440\u0438 \u0430\u0440\u0445\u0438\u0432\u0430 \u0441\u0442\u0435\u043D\u043E\u0433\u0440\u0430\u043C\u043C\u044B \u0438 \u043F\u0435\u0440\u0435\u0441\u043A\u0430\u0437\u043E\u0432 \u043F\u0440\u0435\u0434\u0441\u0442\u0430\u0432\u043B\u0435\u043D\u044B \u0432 Markdown."'),
  '',
  '```text'
) + @($checksumLines) + @('```')
[System.IO.File]::WriteAllText((Join-Path $downloadsRoot 'day-01-SHA256SUMS.md'), $checksumDocument, (New-Object System.Text.UTF8Encoding($false)))

$dayFiles = @($transcripts, $participantMaterials, $labResults, $programAndEnvironment) | ForEach-Object {
  Get-ChildItem -LiteralPath $_ -File -Recurse
} | Sort-Object FullName | ForEach-Object {
  [pscustomobject]@{
    path = Get-RelativeForwardSlashPath -BasePath $dayRoot -FullPath $_.FullName
    bytes = $_.Length
    sha256 = (Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash
  }
}
$authorFiles = $dayOneAuthorMaterials | Sort-Object | ForEach-Object {
  [pscustomobject]@{
    path = ('materials/' + [System.IO.Path]::GetFileName($_))
    bytes = (Get-Item -LiteralPath $_).Length
    sha256 = (Get-FileHash -LiteralPath $_ -Algorithm SHA256).Hash
  }
}
$files = @($dayFiles + $authorFiles | Sort-Object path)
$manifest = [pscustomobject]@{
  title = Get-LocalizedText -JsonString '"\u041F\u0443\u0431\u043B\u0438\u0447\u043D\u044B\u0435 \u043C\u0430\u0442\u0435\u0440\u0438\u0430\u043B\u044B \u043F\u0435\u0440\u0432\u043E\u0433\u043E \u0434\u043D\u044F \u2014 11 \u0430\u0432\u0433\u0443\u0441\u0442\u0430 2026 \u0433\u043E\u0434\u0430"'
  files = @($files)
}
$manifestText = $manifest | ConvertTo-Json -Depth 4
[System.IO.File]::WriteAllText((Join-Path $downloadsRoot 'day-01-manifest.json'), $manifestText, (New-Object System.Text.UTF8Encoding($false)))
Write-Output "BUILT day-01-manifest.json $($files.Count) files"

# The site-level release builder invokes this canonical AppSec entry point.
# Keep Day 2 package generation coupled to it so that public HTML links and
# the staged release are always built from the same reviewed source set.
$dayTwoBuilder = Join-Path $PSScriptRoot 'build-day-02-materials.ps1'
if (-not (Test-Path -LiteralPath $dayTwoBuilder -PathType Leaf)) {
  throw "Missing Day 2 materials builder: $dayTwoBuilder"
}
& $dayTwoBuilder
