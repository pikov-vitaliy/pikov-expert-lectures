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
    [hashtable[]]$DirMap = @(),
    [string[]]$AuthorFile = @()
  )

  Remove-Item -LiteralPath $Destination -Force -ErrorAction SilentlyContinue
  $staging = Join-Path ([System.IO.Path]::GetTempPath()) ('d1zip-' + [System.Guid]::NewGuid().ToString('N'))
  New-Item -ItemType Directory -Path $staging -Force | Out-Null
  try {
    foreach ($d in $Dir) {
      Copy-Item -LiteralPath $d -Destination $staging -Recurse -Force
    }
    foreach ($mapping in $DirMap) {
      $parent = [string]$mapping.Parent
      if ([System.IO.Path]::IsPathRooted($parent) -or $parent -match '(^|[\\/])\.\.([\\/]|$)') {
        throw "Unsafe archive parent path: $parent"
      }
      $mappedParent = Join-Path $staging $parent
      New-Item -ItemType Directory -Path $mappedParent -Force | Out-Null
      Copy-Item -LiteralPath ([string]$mapping.Source) -Destination $mappedParent -Recurse -Force
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

function Get-LocalizedText {
  param([Parameter(Mandatory = $true)][string]$JsonString)
  return [string](ConvertFrom-Json -InputObject $JsonString)
}

$transcripts = Join-Path $dayRoot 'transcripts'
$participantMaterials = Join-Path $dayRoot 'participant-materials'
$labResults = Join-Path $dayRoot 'lab-results'
$programAndEnvironment = Join-Path $dayRoot 'program-and-environment'
$materialsRoot = Join-Path $siteRoot 'materials'
$canonicalLab = Join-Path $siteRoot 'lab\juice-shop'

$dayOneTranscriptFiles = @(
  (Get-LocalizedText -JsonString '"01-\u0430\u0432\u0442\u043e\u043c\u0430\u0442\u0438\u0447\u0435\u0441\u043a\u0438\u0439-\u043f\u0435\u0440\u0435\u0441\u043a\u0430\u0437-\u0434\u043d\u044f-01.md"'),
  (Get-LocalizedText -JsonString '"02-\u0430\u0432\u0442\u043e\u043c\u0430\u0442\u0438\u0447\u0435\u0441\u043a\u0438\u0439-\u043f\u0435\u0440\u0435\u0441\u043a\u0430\u0437-\u0434\u043d\u044f-01.md"'),
  (Get-LocalizedText -JsonString '"03-\u0430\u0432\u0442\u043e\u043c\u0430\u0442\u0438\u0447\u0435\u0441\u043a\u0438\u0439-\u043f\u0435\u0440\u0435\u0441\u043a\u0430\u0437-\u0434\u043d\u044f-01.md"'),
  (Get-LocalizedText -JsonString '"\u041f\u0440\u043e\u0442\u043e\u043a\u043e\u043b-\u0434\u043d\u044f-01-\u0440\u0435\u0434\u0430\u043a\u0442\u0438\u0440\u043e\u0432\u0430\u043d\u043d\u044b\u0439.md"'),
  (Get-LocalizedText -JsonString '"\u0421\u0442\u0435\u043d\u043e\u0433\u0440\u0430\u043c\u043c\u0430-\u0434\u043d\u044f-01-\u043f\u043e\u0434\u0440\u043e\u0431\u043d\u0430\u044f-\u0440\u0435\u0434\u0430\u043a\u0442\u0438\u0440\u043e\u0432\u0430\u043d\u043d\u0430\u044f.md"')
)
$canonicalLabFiles = @('compose.yaml', 'README.md', 'start.ps1', 'stop.ps1')

# Fail closed before changing any published archive. A newly dropped secret,
# database, binary, nested archive or reparse point is never copied implicitly.
Assert-ExactPublicFileSet -Root $transcripts -ExpectedRelativePath $dayOneTranscriptFiles
Assert-ExactPublicFileSet -Root $canonicalLab -ExpectedRelativePath $canonicalLabFiles

# The Day 1 handout is a closed, reviewed set. Do not let newly added Day 2
# materials silently cross the day boundary merely because they share a folder.
$dayOneAuthorMaterialNames = @(
  (Get-LocalizedText -JsonString '"\u0434\u0435\u043d\u044c-1-\u043c\u0435\u0442\u043e\u0434\u0438\u0447\u0435\u0441\u043a\u0438\u0439-\u043a\u043e\u043d\u0441\u043f\u0435\u043a\u0442.md"'),
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
  $item = Get-Item -LiteralPath $path -Force
  if (($item.Attributes -band [System.IO.FileAttributes]::ReparsePoint) -ne 0) {
    throw "Day 1 author material must not be a reparse point: $path"
  }
  $path
}

# Working photographs and superseded generated packages never enter a release.
# Keep this an exact-name deletion list: no wildcard may remove an unrelated
# instructor artefact from downloads/.
@(
  'day-01-slides-original.zip',
  'day-01-full-source-package.zip',
  'day-01-transcripts-original.zip',
  'day-01-SHA256SUMS.txt',
  'day-01-public-materials.zip',
  'day-01-laboratory-materials-and-reports.zip',
  'day-01-SHA256SUMS.md',
  'day-01-manifest.json'
) | ForEach-Object {
  Remove-Item -LiteralPath (Join-Path $downloadsRoot $_) -Force -ErrorAction SilentlyContinue
}

# The former combined archives contained unreviewed binaries and legacy
# commands. Rebuild only the transcript archive and the canonical text/lab set.
$archives = @(
  @{ Name = 'day-01-edited-transcript-and-summaries.zip'; Dir = @($transcripts); AuthorFile = @() },
  @{
    Name = 'day-01-canonical-safe-package.zip'
    Dir = @($transcripts)
    DirMap = @(@{ Source = $canonicalLab; Parent = 'lab' })
    AuthorFile = @($dayOneAuthorMaterials)
  }
)

$checksumLines = New-Object System.Collections.Generic.List[string]
foreach ($archive in $archives) {
  $destination = Join-Path $downloadsRoot $archive.Name
  $dirMap = if ($archive.ContainsKey('DirMap')) { @($archive.DirMap) } else { @() }
  New-DayArchive -Destination $destination -Dir $archive.Dir -DirMap $dirMap -AuthorFile $archive.AuthorFile
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
[System.IO.File]::WriteAllText(
  (Join-Path $downloadsRoot 'day-01-SHA256SUMS.md'),
  ($checksumDocument -join [Environment]::NewLine),
  (New-Object System.Text.UTF8Encoding($false))
)

$dayFiles = @(
  @{ Root = $transcripts; Prefix = 'transcripts' },
  @{ Root = $canonicalLab; Prefix = 'lab/juice-shop' }
) | ForEach-Object {
  $group = $_
  Get-ChildItem -LiteralPath $group.Root -File -Recurse | ForEach-Object {
    [pscustomobject]@{
      path = ($group.Prefix + '/' + (Get-RelativeForwardSlashPath -BasePath $group.Root -FullPath $_.FullName))
      bytes = $_.Length
      sha256 = (Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash
    }
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
  title = Get-LocalizedText -JsonString '"\u041F\u0443\u0431\u043B\u0438\u0447\u043D\u044B\u0435 \u043A\u0430\u043D\u043E\u043D\u0438\u0447\u0435\u0441\u043A\u0438\u0435 \u043C\u0430\u0442\u0435\u0440\u0438\u0430\u043B\u044B \u043F\u0435\u0440\u0432\u043E\u0433\u043E \u0434\u043D\u044F"'
  archives = @($archives.Name)
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
