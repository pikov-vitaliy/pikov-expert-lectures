param(
  [string]$Root = (Split-Path -Parent $PSScriptRoot),
  [string]$ReleaseDate = '',
  [switch]$KeepStaging,
  [switch]$FailOnIssues
)

$ErrorActionPreference = 'Stop'

function Fail([string]$Message) {
  throw "RELEASE FAIL: $Message"
}

function Get-RelativePathSafe([string]$BasePath, [string]$Path) {
  $base = (Resolve-Path -LiteralPath $BasePath).Path.TrimEnd('\') + '\'
  $target = (Resolve-Path -LiteralPath $Path).Path
  $baseUri = [Uri]::new($base)
  $targetUri = [Uri]::new($target)
  [Uri]::UnescapeDataString($baseUri.MakeRelativeUri($targetUri).ToString()).Replace('/', '\')
}

function Assert-ChildPath([string]$Parent, [string]$Child) {
  $parentResolved = (Resolve-Path -LiteralPath $Parent).Path.TrimEnd('\') + '\'
  if (Test-Path -LiteralPath $Child) {
    $childResolved = (Resolve-Path -LiteralPath $Child).Path
  } else {
    $childResolved = [System.IO.Path]::GetFullPath($Child)
  }
  if (-not ($childResolved + '\').StartsWith($parentResolved, [System.StringComparison]::OrdinalIgnoreCase)) {
    Fail "Unsafe path outside parent: $childResolved"
  }
}

function Reset-Directory([string]$Path, [string]$RequiredParent) {
  Assert-ChildPath -Parent $RequiredParent -Child $Path
  if (Test-Path -LiteralPath $Path) {
    Remove-Item -LiteralPath $Path -Recurse -Force
  }
  [void](New-Item -ItemType Directory -Path $Path -Force)
}

function Copy-ReleaseFile([string]$SourceRoot, [string]$StageRoot, [string]$RelativePath) {
  $source = Join-Path $SourceRoot $RelativePath
  if (-not (Test-Path -LiteralPath $source)) {
    Fail "Missing release source file: $source"
  }
  $dest = Join-Path $StageRoot $RelativePath
  $destParent = Split-Path -Parent $dest
  if (-not (Test-Path -LiteralPath $destParent)) {
    [void](New-Item -ItemType Directory -Path $destParent -Force)
  }
  Copy-Item -LiteralPath $source -Destination $dest -Force
}

function Should-ExcludeDirectory([string]$Name) {
  $lower = $Name.ToLowerInvariant()
  $excluded = @(
    'release',
    'source',
    'tools',
    'output',
    'notes',
    'tests',
    'test-results',
    'node_modules',
    '.git',
    '.codegraph',
    '.codex',
    '.claude',
    '.agents',
    '.gigacode',
    '.qwen',
    '.vscode',
    '.idea',
    'materials_from_4days'
  )
  if ($excluded -contains $lower) { return $true }
  if ($Name.StartsWith('_')) { return $true }
  return $false
}

function Should-ExcludeDistributable([string]$Name) {
  $extension = [System.IO.Path]::GetExtension($Name).ToLowerInvariant()
  return $extension -in @('.pdf', '.pptx', '.docx', '.xlsx', '.eps', '.zip')
}

function Should-ExcludeFile([string]$Name) {
  $lower = $Name.ToLowerInvariant()
  if ($lower -eq 'index1.html' -or $lower -like 'indexold*.html' -or $lower -like 'index-v*.html') { return $true }
  if (Should-ExcludeDistributable $Name) { return $true }
  if ($Name.ToLowerInvariant().EndsWith('.md') -and $Name.ToLowerInvariant() -ne 'materials.md') { return $true }
  if ($Name -like '00_*.md') { return $true }
  if ($Name -in @('README.md', 'SOURCE.md')) { return $true }
  if ($Name.EndsWith('.tmp') -or $Name.EndsWith('.bak')) { return $true }
  return $false
}

function Should-ExcludeNestedFile([string]$Name) {
  $lower = $Name.ToLowerInvariant()
  if ($Name.StartsWith('_')) { return $true }
  if (Should-ExcludeDistributable $Name) { return $true }
  if ($lower -like 'img_*.jpg' -or $lower -like 'img_*.jpeg') { return $true }
  if ($Name -like '00_*.md') { return $true }
  if ($Name -in @('README.md', 'SOURCE.md')) { return $true }
  if ($Name.EndsWith('.tmp') -or $Name.EndsWith('.bak')) { return $true }
  return $false
}

function Get-DomainReleaseFiles([string]$FolderPath) {
  $files = New-Object System.Collections.Generic.List[string]

  Get-ChildItem -LiteralPath $FolderPath -File -Force | ForEach-Object {
    if (-not (Should-ExcludeFile $_.Name)) {
      $files.Add($_.Name)
    }
  }

  Get-ChildItem -LiteralPath $FolderPath -Directory -Force | ForEach-Object {
    if (Should-ExcludeDirectory $_.Name) { return }
    Get-ChildItem -LiteralPath $_.FullName -File -Recurse -Force | ForEach-Object {
      if (-not (Should-ExcludeNestedFile $_.Name)) {
        $relative = Get-RelativePathSafe -BasePath $FolderPath -Path $_.FullName
        $files.Add($relative)
      }
    }
  }

  @($files | Sort-Object -Unique)
}

function Get-RootReleaseFiles([string]$RootPath) {
  $rootNames = @(
    '.htaccess',
    'index.html',
    'photo.jpg',
    'robots.txt',
    'sitemap.xml',
    'yandex_bf73d77ba788688e.html'
  )
  @($rootNames | Where-Object { Test-Path -LiteralPath (Join-Path $RootPath $_) })
}

function Normalize-LocalUrl([string]$Url) {
  $u = $Url.Trim()
  if ($u.Length -eq 0) { return $null }
  $u = $u.Trim('"', "'", ' ')
  if ($u.Length -eq 0) { return $null }
  if ($u.StartsWith('#')) { return $null }
  if ($u -match '^(?i)(https?:|mailto:|tel:|javascript:|data:|about:|//)') { return $null }
  $u = ($u -split '#', 2)[0]
  $u = ($u -split '\?', 2)[0]
  if ($u.Length -eq 0) { return $null }
  try {
    return [Uri]::UnescapeDataString($u)
  } catch {
    return $u
  }
}

function Test-StaticRelease([string]$StageRoot, [string]$SiteName) {
  $issues = @()
  $stageResolved = (Resolve-Path -LiteralPath $StageRoot).Path.TrimEnd('\') + '\'
  $htmlFiles = @(
    Get-ChildItem -LiteralPath $StageRoot -Recurse -File -Force |
      Where-Object { $_.Extension.ToLowerInvariant() -in @('.html', '.htm') }
  )

  if (-not (Test-Path -LiteralPath (Join-Path $StageRoot 'index.html'))) {
    $issues += [pscustomobject]@{ severity = 'P0'; site = $SiteName; file = 'index.html'; issue = 'index.html is missing in release root' }
  }

  foreach ($htmlFile in $htmlFiles) {
    $relativeHtml = Get-RelativePathSafe -BasePath $StageRoot -Path $htmlFile.FullName
    $html = Get-Content -LiteralPath $htmlFile.FullName -Encoding UTF8 -Raw

    foreach ($pattern in @('(?i)(?:href|src)\s*=\s*["'']([^"'']+)["'']', '(?i)url\(([^)]*\.(?:png|jpe?g|gif|svg|webp|ico|css|js|woff2?|ttf|eot|pdf)[^)]*)\)')) {
      foreach ($match in [regex]::Matches($html, $pattern)) {
        $raw = $match.Groups[1].Value
        $local = Normalize-LocalUrl $raw
        if (-not $local) { continue }

        if ($local -match '^[A-Za-z]:\\') {
          $issues += [pscustomobject]@{ severity = 'P0'; site = $SiteName; file = $relativeHtml; issue = "absolute local path reference: $raw" }
          continue
        }

        if ($local -match '(^|/|\\)(_PROJECT|release|source|_[^/\\]*)($|/|\\)') {
          $issues += [pscustomobject]@{ severity = 'P0'; site = $SiteName; file = $relativeHtml; issue = "internal path reference: $raw" }
          continue
        }

        $candidate = $local.Replace('/', '\')
        if ($candidate.StartsWith('\')) {
          $candidatePath = Join-Path $StageRoot $candidate.TrimStart('\')
        } else {
          $candidatePath = Join-Path (Split-Path -Parent $htmlFile.FullName) $candidate
        }
        try {
          $fullCandidate = [System.IO.Path]::GetFullPath($candidatePath)
        } catch {
          $issues += [pscustomobject]@{ severity = 'P1'; site = $SiteName; file = $relativeHtml; issue = "invalid local resource reference: $raw" }
          continue
        }
        if (-not (($fullCandidate + '\').StartsWith($stageResolved, [System.StringComparison]::OrdinalIgnoreCase))) {
          $issues += [pscustomobject]@{ severity = 'P0'; site = $SiteName; file = $relativeHtml; issue = "path escapes release root: $raw" }
          continue
        }
        if (-not (Test-Path -LiteralPath $fullCandidate)) {
          $issues += [pscustomobject]@{ severity = 'P1'; site = $SiteName; file = $relativeHtml; issue = "missing local resource: $raw" }
        }
      }
    }
  }

  return @($issues)
}

function New-Manifest([string]$StageRoot, [object]$Target, [object[]]$Issues, [string]$ArchiveName) {
  $files = @(
    Get-ChildItem -LiteralPath $StageRoot -Recurse -File -Force |
      Sort-Object FullName |
      ForEach-Object {
        $relative = Get-RelativePathSafe -BasePath $StageRoot -Path $_.FullName
        [pscustomobject]@{
          path = $relative.Replace('\', '/')
          size = $_.Length
          sha256 = (Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
        }
      }
  )

  [pscustomobject]@{
    generated = (Get-Date).ToString('s')
    releaseDate = $script:ReleaseDateValue
    target = $Target
    archive = $ArchiveName
    fileCount = $files.Count
    files = $files
    staticIssues = $Issues
  }
}

$rootPath = (Resolve-Path -LiteralPath $Root).Path
$projectPath = Join-Path $rootPath '_PROJECT'
$lecturesPath = Join-Path $projectPath 'lectures.json'
if (-not (Test-Path -LiteralPath $lecturesPath)) { Fail "Missing _PROJECT\lectures.json" }

$data = Get-Content -LiteralPath $lecturesPath -Encoding UTF8 -Raw | ConvertFrom-Json
if ([string]::IsNullOrWhiteSpace($ReleaseDate)) {
  $ReleaseDate = [string]$data.updated
}
if ($ReleaseDate -notmatch '^\d{4}-\d{2}-\d{2}$') {
  Fail "ReleaseDate must be YYYY-MM-DD, got $ReleaseDate"
}
$script:ReleaseDateValue = $ReleaseDate

$stagingRoot = Join-Path $projectPath ".release-staging-$ReleaseDate"
Reset-Directory -Path $stagingRoot -RequiredParent $projectPath

$uniqueFolders = @($data.lectures | Select-Object -ExpandProperty folder -Unique)
$targets = New-Object System.Collections.Generic.List[object]

$targets.Add([pscustomobject]@{
  kind = 'root'
  folder = ''
  domain = 'pikov.expert'
  url = 'https://pikov.expert/'
  title = 'Root lecture catalog'
})

foreach ($folder in $uniqueFolders) {
  $lecture = @($data.lectures | Where-Object { $_.folder -eq $folder })[0]
  $targets.Add([pscustomobject]@{
    kind = 'domain'
    folder = $folder
    domain = "$($lecture.domain).pikov.expert"
    url = $lecture.url
    title = $lecture.title
  })
}

$results = New-Object System.Collections.Generic.List[object]

foreach ($target in $targets) {
  if ($target.kind -eq 'root') {
    $sourceRoot = $rootPath
    $releaseDir = Join-Path $rootPath 'release'
    $archiveName = "pikov.expert-root-release-$ReleaseDate.zip"
    $relativeFiles = Get-RootReleaseFiles $rootPath
    $stageName = 'root'
  } else {
    $sourceRoot = Join-Path $rootPath $target.folder
    if (-not (Test-Path -LiteralPath (Join-Path $sourceRoot 'index.html'))) {
      Fail "Missing index.html for $($target.folder)"
    }
    $releaseDir = Join-Path $sourceRoot 'release'
    $archiveName = "$($target.domain)-release-$ReleaseDate.zip"
    $relativeFiles = Get-DomainReleaseFiles $sourceRoot
    $stageName = $target.folder
  }

  Reset-Directory -Path $releaseDir -RequiredParent $sourceRoot
  $stageDir = Join-Path $stagingRoot $stageName
  Reset-Directory -Path $stageDir -RequiredParent $stagingRoot

  foreach ($relativeFile in $relativeFiles) {
    Copy-ReleaseFile -SourceRoot $sourceRoot -StageRoot $stageDir -RelativePath $relativeFile
  }

  $issues = @(Test-StaticRelease -StageRoot $stageDir -SiteName $target.domain)
  $archivePath = Join-Path $releaseDir $archiveName
  if (Test-Path -LiteralPath $archivePath) { Remove-Item -LiteralPath $archivePath -Force }

  $stageChildren = @(Get-ChildItem -LiteralPath $stageDir -Force)
  if ($stageChildren.Count -eq 0) { Fail "No files selected for $($target.domain)" }
  $stageChildren | Compress-Archive -DestinationPath $archivePath -Force

  $verifyDir = Join-Path $releaseDir 'verify-unpacked'
  Reset-Directory -Path $verifyDir -RequiredParent $releaseDir
  Expand-Archive -LiteralPath $archivePath -DestinationPath $verifyDir -Force
  if (-not (Test-Path -LiteralPath (Join-Path $verifyDir 'index.html'))) {
    Fail "Archive verification failed for $($target.domain): no index.html at unpacked root"
  }
  Remove-Item -LiteralPath $verifyDir -Recurse -Force

  $archiveHash = (Get-FileHash -LiteralPath $archivePath -Algorithm SHA256).Hash.ToLowerInvariant()
  $archiveItem = Get-Item -LiteralPath $archivePath
  $manifest = New-Manifest -StageRoot $stageDir -Target $target -Issues $issues -ArchiveName $archiveName
  $manifestPath = Join-Path $releaseDir 'MANIFEST.json'
  $manifest | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath $manifestPath -Encoding UTF8

  $shaPath = Join-Path $releaseDir 'SHA256SUMS.txt'
  $shaLines = New-Object System.Collections.Generic.List[string]
  $shaLines.Add("$archiveHash  $archiveName")
  foreach ($file in $manifest.files) {
    $shaLines.Add("$($file.sha256)  $($file.path)")
  }
  $shaLines | Set-Content -LiteralPath $shaPath -Encoding UTF8

  $notesPath = Join-Path $releaseDir 'RELEASE_NOTES.md'
  $staticStatus = if ($issues.Count -eq 0) { 'ok' } else { "issues-$($issues.Count)" }
  $riskLines = New-Object System.Collections.Generic.List[string]
  if ($issues.Count -eq 0) {
    $riskLines.Add('- No static local-link blockers were found.')
  } else {
    foreach ($issue in $issues) {
      $riskLines.Add("- [$($issue.severity)] $($issue.file): $($issue.issue)")
    }
  }
  $noteLines = @(
    "# Release notes: $($target.domain)",
    '',
    "Build date: $ReleaseDate",
    "Target URL: $($target.url)",
    "Archive: $archiveName",
    "Archive SHA256: $archiveHash",
    "Files in archive: $($manifest.files.Count)",
    "Static QA: $staticStatus",
    "Browser QA: not-run",
    '',
    '## Purpose',
    '',
    'Unpack this archive directly into the target document root. The archive has no extra top-level wrapper directory.',
    '',
    '## Residual risks'
  ) + @($riskLines)
  $noteLines | Set-Content -LiteralPath $notesPath -Encoding UTF8

  $results.Add([pscustomobject]@{
    kind = $target.kind
    folder = $target.folder
    domain = $target.domain
    url = $target.url
    releaseDir = $releaseDir
    archivePath = $archivePath
    archiveName = $archiveName
    archiveSha256 = $archiveHash
    archiveBytes = $archiveItem.Length
    fileCount = $manifest.files.Count
    staticIssueCount = $issues.Count
    staticStatus = $staticStatus
    browserQA = 'not-run'
  })
}

$indexPath = Join-Path $projectPath "RELEASE_INDEX_$ReleaseDate.md"
$totalIssues = ($results | Measure-Object staticIssueCount -Sum).Sum
$indexLines = New-Object System.Collections.Generic.List[string]
$indexLines.Add("# Release index pikov.expert")
$indexLines.Add('')
$indexLines.Add("Build date: $ReleaseDate")
$indexLines.Add("Archives: $($results.Count) ($($uniqueFolders.Count) subdomains + root)")
$indexLines.Add("Static issues: $totalIssues")
$indexLines.Add("Browser QA: not-run")
$indexLines.Add('')
$indexLines.Add('## Smoke')
$indexLines.Add('')
$indexLines.Add('Run after build:')
$indexLines.Add('')
$indexLines.Add('```powershell')
$indexLines.Add("powershell -NoProfile -ExecutionPolicy Bypass -File `"$projectPath\smoke-check.ps1`"")
$indexLines.Add('```')
$indexLines.Add('')
$indexLines.Add('## Archives')
$indexLines.Add('')
$indexLines.Add('| Target | URL | Archive | Size | SHA256 | Static QA | Browser QA |')
$indexLines.Add('|---|---|---|---:|---|---|---|')
foreach ($result in $results) {
  $sizeMb = [math]::Round($result.archiveBytes / 1MB, 2)
  $archiveDisplay = $result.archivePath.Replace('\', '\\')
  $indexLines.Add("| $($result.domain) | $($result.url) | $archiveDisplay | $sizeMb MB | $($result.archiveSha256) | $($result.staticStatus) | $($result.browserQA) |")
}
$indexLines.Add('')
$indexLines.Add('## Publishing instruction')
$indexLines.Add('')
$indexLines.Add('- Unpack `pikov.expert-root-release-*.zip` into the document root for `pikov.expert`.')
$indexLines.Add('- Unpack `<subdomain>.pikov.expert-release-*.zip` into the matching subdomain document root.')
$indexLines.Add('- Archives have no extra top-level wrapper directory: `index.html` must land directly in the site root.')
$indexLines.Add('')
$indexLines.Add('## Residual risks')
$indexLines.Add('')
if ($totalIssues -eq 0) {
  $indexLines.Add('- No static local-link blockers were found.')
} else {
  $indexLines.Add("- Static issues found: $totalIssues. See `MANIFEST.json` and `RELEASE_NOTES.md` in each release directory.")
}
$indexLines.Add('- Browser QA is not run by this script yet; run a separate Playwright pass for desktop/tablet/mobile.')
$indexLines | Set-Content -LiteralPath $indexPath -Encoding UTF8

if (-not $KeepStaging) {
  Remove-Item -LiteralPath $stagingRoot -Recurse -Force
}

$results | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath (Join-Path $projectPath "RELEASE_INDEX_$ReleaseDate.json") -Encoding UTF8

Write-Output "RELEASE BUILD OK"
Write-Output "archives=$($results.Count)"
Write-Output "staticIssues=$totalIssues"
Write-Output "releaseIndex=$indexPath"

if ($FailOnIssues -and $totalIssues -gt 0) {
  Fail "Static release issues found: $totalIssues"
}
