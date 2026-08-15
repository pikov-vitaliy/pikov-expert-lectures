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

$archiveHelper = Join-Path $PSScriptRoot 'deterministic-archive.ps1'
if (-not (Test-Path -LiteralPath $archiveHelper -PathType Leaf)) {
  Fail "Missing deterministic archive helper: $archiveHelper"
}
. $archiveHelper

function Get-RelativePathSafe([string]$BasePath, [string]$Path) {
  $base = [System.IO.Path]::GetFullPath($BasePath).TrimEnd('\') + '\'
  $target = [System.IO.Path]::GetFullPath($Path)
  $baseUri = [Uri]::new($base)
  $targetUri = [Uri]::new($target)
  [Uri]::UnescapeDataString($baseUri.MakeRelativeUri($targetUri).ToString()).Replace('/', '\')
}

function Test-LexicalPathWithin([string]$Parent, [string]$Child, [switch]$AllowEqual) {
  $parentFull = [System.IO.Path]::GetFullPath($Parent).TrimEnd('\')
  $childFull = [System.IO.Path]::GetFullPath($Child).TrimEnd('\')
  if ($AllowEqual -and $childFull.Equals($parentFull, [System.StringComparison]::OrdinalIgnoreCase)) {
    return $true
  }
  return $childFull.StartsWith($parentFull + '\', [System.StringComparison]::OrdinalIgnoreCase)
}

function Assert-ChildPath([string]$Parent, [string]$Child, [switch]$AllowEqual) {
  if (-not (Test-LexicalPathWithin -Parent $Parent -Child $Child -AllowEqual:$AllowEqual)) {
    Fail "Unsafe path outside parent: $([System.IO.Path]::GetFullPath($Child))"
  }
}

function Assert-NoReparsePathComponents([string]$BoundaryRoot, [string]$TargetPath, [switch]$RequireTarget) {
  Assert-ChildPath -Parent $BoundaryRoot -Child $TargetPath -AllowEqual
  $boundaryFull = [System.IO.Path]::GetFullPath($BoundaryRoot).TrimEnd('\')
  $targetFull = [System.IO.Path]::GetFullPath($TargetPath).TrimEnd('\')
  $targetItem = Get-Item -LiteralPath $targetFull -Force -ErrorAction SilentlyContinue
  if ($RequireTarget -and $null -eq $targetItem) {
    Fail "Missing release source path: $targetFull"
  }

  $current = $targetFull
  while ($true) {
    $item = Get-Item -LiteralPath $current -Force -ErrorAction SilentlyContinue
    if ($null -ne $item -and (($item.Attributes -band [System.IO.FileAttributes]::ReparsePoint) -ne 0)) {
      Fail "Release path contains a reparse point: $current"
    }
    if ($current.Equals($boundaryFull, [System.StringComparison]::OrdinalIgnoreCase)) { break }
    $parent = Split-Path -Parent $current
    if ([string]::IsNullOrWhiteSpace($parent) -or $parent.Equals($current, [System.StringComparison]::OrdinalIgnoreCase)) {
      Fail "Could not validate release path ancestry: $targetFull"
    }
    $current = [System.IO.Path]::GetFullPath($parent).TrimEnd('\')
  }
}

function Assert-SafeLectureFolder([string]$RootPath, [string]$Folder) {
  if ([string]::IsNullOrWhiteSpace($Folder) -or
      [System.IO.Path]::IsPathRooted($Folder) -or
      $Folder -notmatch '^[A-Za-z0-9][A-Za-z0-9._-]*$' -or
      $Folder.Contains('/') -or
      $Folder.Contains('\') -or
      $Folder -in @('.', '..') -or
      $Folder.ToLowerInvariant() -in @('release', 'source', 'tools', 'output', 'notes', 'tests', 'test-results', 'node_modules') -or
      $Folder.IndexOfAny([System.IO.Path]::GetInvalidFileNameChars()) -ge 0) {
    Fail "Unsafe lecture folder in lectures.json: $Folder"
  }
  $folderPath = [System.IO.Path]::GetFullPath((Join-Path $RootPath $Folder))
  Assert-ChildPath -Parent $RootPath -Child $folderPath
  if (-not (Test-Path -LiteralPath $folderPath -PathType Container)) {
    Fail "Missing lecture folder: $Folder"
  }
  Assert-NoReparsePathComponents -BoundaryRoot $RootPath -TargetPath $folderPath -RequireTarget
}

function Assert-SafeLectureDomain([string]$Domain) {
  if ([string]::IsNullOrWhiteSpace($Domain) -or
      $Domain.Length -gt 63 -or
      $Domain -notmatch '^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$') {
    Fail "Unsafe lecture domain in lectures.json: $Domain"
  }
}

function Reset-Directory([string]$Path, [string]$RequiredParent) {
  Assert-ChildPath -Parent $RequiredParent -Child $Path
  Assert-NoReparsePathComponents -BoundaryRoot $RequiredParent -TargetPath $RequiredParent -RequireTarget
  Assert-NoReparsePathComponents -BoundaryRoot $RequiredParent -TargetPath $Path
  if (Test-Path -LiteralPath $Path) {
    Remove-Item -LiteralPath $Path -Recurse -Force
  }
  [void](New-Item -ItemType Directory -Path $Path -Force)
  Assert-NoReparsePathComponents -BoundaryRoot $RequiredParent -TargetPath $Path -RequireTarget
}

function Get-ValidatedReleaseSourcePath([string]$SourceRoot, [string]$RelativePath) {
  if ([string]::IsNullOrWhiteSpace($RelativePath) -or [System.IO.Path]::IsPathRooted($RelativePath)) {
    Fail "Unsafe release relative path: $RelativePath"
  }
  $segments = $RelativePath.Replace('/', '\').Split('\')
  if ($segments -contains '..' -or $segments -contains '.') {
    Fail "Unsafe release relative path: $RelativePath"
  }

  $source = [System.IO.Path]::GetFullPath((Join-Path $SourceRoot $RelativePath))
  Assert-ChildPath -Parent $SourceRoot -Child $source
  Assert-ChildPath -Parent $script:ReleaseRepositoryRoot -Child $source -AllowEqual
  Assert-NoReparsePathComponents -BoundaryRoot $script:ReleaseRepositoryRoot -TargetPath $source -RequireTarget
  if (-not (Test-Path -LiteralPath $source -PathType Leaf)) {
    Fail "Missing release source file: $source"
  }

  Assert-ReleaseSourcePolicy -SourcePath $source

  return $source
}

function Copy-ReleaseFile([string]$SourceRoot, [string]$StageRoot, [string]$RelativePath) {
  $source = Get-ValidatedReleaseSourcePath -SourceRoot $SourceRoot -RelativePath $RelativePath

  $dest = [System.IO.Path]::GetFullPath((Join-Path $StageRoot $RelativePath))
  Assert-ChildPath -Parent $StageRoot -Child $dest
  Assert-NoReparsePathComponents -BoundaryRoot $StageRoot -TargetPath $StageRoot -RequireTarget
  $destParent = Split-Path -Parent $dest
  Assert-NoReparsePathComponents -BoundaryRoot $StageRoot -TargetPath $destParent
  if (-not (Test-Path -LiteralPath $destParent)) {
    [void](New-Item -ItemType Directory -Path $destParent -Force)
  }
  Assert-NoReparsePathComponents -BoundaryRoot $StageRoot -TargetPath $destParent -RequireTarget
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
    'materials_from_4days',
    # Build artifacts of local tooling. A lecture folder that ships runnable
    # code collects these as soon as anyone runs the linter, the tests or the
    # sample app in it, and without this they end up published.
    '__pycache__',
    '.pytest_cache',
    '.ruff_cache',
    '.mypy_cache',
    '.venv',
    'venv',
    'export'
  )
  if ($excluded -contains $lower) { return $true }
  if ($Name.StartsWith('_')) { return $true }
  return $false
}

function Should-ExcludeDistributable([string]$Name) {
  $extension = [System.IO.Path]::GetExtension($Name).ToLowerInvariant()
  return $extension -in @('.pdf', '.pptx', '.docx', '.xlsx', '.eps', '.zip')
}

# Lecture folders explicitly cleared to publish a 'materials.zip' handout bundle.
# The exception is per folder, not per file name: a stray archive dropped into
# any other lecture still gets excluded. Each bundle is assembled by that
# lecture's own build-materials-zip.ps1 from a literal file list, so nothing
# reaches it that was not reviewed.
$script:MaterialsZipFolders = @('27-07-2026', '29-07-2026')

# Generated archives are ignored in Git by design and are rebuilt from literal
# source allowlists immediately before release selection. They are the only
# ignored source artifacts that the global release builder may publish.
$script:ApprovedIgnoredReleaseArtifacts = @(
  '27-07-2026/materials.zip',
  '29-07-2026/materials.zip',
  'appsec-lections/downloads/day-01-canonical-safe-package.zip',
  'appsec-lections/downloads/day-01-edited-transcript-and-summaries.zip',
  'appsec-lections/downloads/day-02-edited-transcript-and-protocol.zip',
  'appsec-lections/downloads/day-02-laboratory-materials.zip',
  'appsec-lections/downloads/day-02-public-materials.zip'
)

function Test-HighRiskReleaseFileName([string]$Name) {
  $lower = $Name.ToLowerInvariant()
  if ($lower -eq '.env' -or $lower.StartsWith('.env.')) { return $true }
  if ($lower -in @('id_rsa', 'id_ed25519')) { return $true }
  if ($lower -match '\.(?:db|sqlite|sqlite3)(?:-journal|-shm|-wal)?$') { return $true }
  $extension = [System.IO.Path]::GetExtension($lower)
  return $extension -in @('.orig', '.key', '.pem', '.pfx', '.p12', '.kdbx', '.log', '.exe', '.dll', '.msi')
}

function Initialize-IgnoredReleaseSourceGate([string]$RepositoryRoot) {
  $script:IgnoredReleaseSourcePaths = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::OrdinalIgnoreCase)
  $script:UntrackedReleaseSourcePaths = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::OrdinalIgnoreCase)
  if (-not (Test-Path -LiteralPath (Join-Path $RepositoryRoot '.git'))) { return }
  $gitCommand = Get-Command git -ErrorAction SilentlyContinue
  if ($null -eq $gitCommand) {
    Fail 'Git is required to verify ignored release sources in a repository checkout'
  }
  $ignored = @(& $gitCommand.Source -c core.quotepath=false -C $RepositoryRoot ls-files --others --ignored --exclude-standard)
  if ($LASTEXITCODE -ne 0) {
    Fail 'Could not enumerate ignored repository artifacts before release selection'
  }
  foreach ($relative in $ignored) {
    if (-not [string]::IsNullOrWhiteSpace($relative)) {
      [void]$script:IgnoredReleaseSourcePaths.Add($relative.Replace('\', '/'))
    }
  }
  $untracked = @(& $gitCommand.Source -c core.quotepath=false -C $RepositoryRoot ls-files --others --exclude-standard)
  if ($LASTEXITCODE -ne 0) {
    Fail 'Could not enumerate untracked repository artifacts before release selection'
  }
  foreach ($relative in $untracked) {
    if (-not [string]::IsNullOrWhiteSpace($relative)) {
      [void]$script:UntrackedReleaseSourcePaths.Add($relative.Replace('\', '/'))
    }
  }
}

function Assert-ReleaseSourcePolicy([string]$SourcePath) {
  if (Test-HighRiskReleaseFileName ([System.IO.Path]::GetFileName($SourcePath))) {
    Fail "High-risk release source file is not allowed: $SourcePath"
  }
  if ($null -eq $script:IgnoredReleaseSourcePaths) { return }
  $relative = Get-RelativePathSafe -BasePath $script:ReleaseRepositoryRoot -Path $SourcePath
  $normalized = $relative.Replace('\', '/')
  if ($script:IgnoredReleaseSourcePaths.Contains($normalized) -and
      $script:ApprovedIgnoredReleaseArtifacts -notcontains $normalized) {
    Fail "Ignored repository artifact is not approved for release: $normalized"
  }
  if ($script:UntrackedReleaseSourcePaths.Contains($normalized)) {
    Fail "Untracked repository artifact is not approved for release: $normalized"
  }
}

# Raw Day 1 working trees are editorial inputs, not public handouts. Their
# reviewed output is rebuilt into the canonical ZIP, transcript ZIP, checksum
# document and manifest. Keep this directory-level boundary ahead of the
# generic nested-file rules so a newly added Markdown or script cannot leak.
$script:QuarantinedNestedDirectories = @{
  'appsec-lections' = @(
    'downloads\day-01\lab-results',
    'downloads\day-01\participant-materials',
    'downloads\day-01\program-and-environment'
  )
}

function Should-ExcludeQuarantinedNestedDirectory([string]$FolderName, [string]$RelativePath) {
  if (-not $script:QuarantinedNestedDirectories.ContainsKey($FolderName)) { return $false }
  $normalized = $RelativePath.Replace('/', '\')
  foreach ($prefix in $script:QuarantinedNestedDirectories[$FolderName]) {
    if ($normalized -eq $prefix -or $normalized.StartsWith($prefix + '\', [System.StringComparison]::OrdinalIgnoreCase)) {
      return $true
    }
  }
  return $false
}

# Narrow allowlist for reviewed nested handouts that must remain downloadable
# from the published HTML. The global distributable rules still exclude every
# other ZIP and README file from lecture releases.
$script:ReviewedNestedDistributables = @{
  'scaner-vs' = @(
    'materials\README.md',
    'materials\downloads\all-labs-markdown.zip',
    'materials\downloads\inspector-labs-markdown.zip',
    'materials\downloads\scanner-labs-markdown.zip'
  )
  # Day 1 publishes only the reviewed transcript and the canonical package
  # rebuilt from Markdown plus the bounded local lab. Legacy combined archives
  # with unreviewed binaries are deliberately not allowlisted.
  'appsec-lections' = @(
    'downloads\day-01-edited-transcript-and-summaries.zip',
    'downloads\day-01-canonical-safe-package.zip',
    'downloads\day-01-SHA256SUMS.md',
    'downloads\day-01-manifest.json',
    'lab\juice-shop\README.md',
    'downloads\day-02-edited-transcript-and-protocol.zip',
    'downloads\day-02-laboratory-materials.zip',
    'downloads\day-02-public-materials.zip',
    'downloads\day-02\participant-materials\lr-ssrf\README.md'
  )
}

function Should-IncludeReviewedNestedDistributable([string]$FolderName, [string]$RelativePath) {
  if (-not $script:ReviewedNestedDistributables.ContainsKey($FolderName)) { return $false }
  $normalized = $RelativePath.Replace('/', '\')
  return $script:ReviewedNestedDistributables[$FolderName] -contains $normalized
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
  $generatedReadFirstHtml = ((1095, 1080, 1090, 1072, 1090, 1100, 45, 1087, 1077, 1088, 1074, 1099, 1084 | ForEach-Object { [char]$_ }) -join '') + '.html'
  if ($Name.StartsWith('_')) { return $true }
  if ($lower -eq $generatedReadFirstHtml) { return $true }
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
    if (($_.Attributes -band [System.IO.FileAttributes]::ReparsePoint) -ne 0) {
      Fail "Release source file is a reparse point: $($_.FullName)"
    }
    if (Test-HighRiskReleaseFileName $_.Name) {
      Fail "High-risk release source file is not allowed: $($_.FullName)"
    }
    if (-not (Should-ExcludeFile $_.Name)) {
      $files.Add($_.Name)
    }
  }

  $folderName = Split-Path -Leaf $FolderPath
  if ($script:MaterialsZipFolders -contains $folderName) {
    $bundlePath = Join-Path $FolderPath 'materials.zip'
    if (Test-Path -LiteralPath $bundlePath -PathType Leaf) {
      $files.Add('materials.zip')
    }
  }

  Get-ChildItem -LiteralPath $FolderPath -Directory -Force | ForEach-Object {
    if (Should-ExcludeDirectory $_.Name) { return }
    if (($_.Attributes -band [System.IO.FileAttributes]::ReparsePoint) -ne 0) {
      Fail "Release source directory is a reparse point: $($_.FullName)"
    }
    Get-ChildItem -LiteralPath $_.FullName -File -Recurse -Force | ForEach-Object {
      # Excluded directories must be honoured at EVERY depth, not just at the
      # top level. A lecture folder that ships runnable code grows nested
      # '__pycache__' and '.ruff_cache' the moment anyone runs it, and their
      # files carry ordinary names that no per-file rule would catch.
      $relative = Get-RelativePathSafe -BasePath $FolderPath -Path $_.FullName
      $segments = $relative.Split('\')
      $parentSegments = @($segments | Select-Object -First ([Math]::Max($segments.Count - 1, 0)))
      if (@($parentSegments | Where-Object { Should-ExcludeDirectory $_ }).Count -gt 0) { return }

      if (($_.Attributes -band [System.IO.FileAttributes]::ReparsePoint) -ne 0) {
        Fail "Release source file is a reparse point: $($_.FullName)"
      }
      if (Test-HighRiskReleaseFileName $_.Name) {
        Fail "High-risk release source file is not allowed: $($_.FullName)"
      }

      if (Should-ExcludeQuarantinedNestedDirectory -FolderName $folderName -RelativePath $relative) { return }

      # Photographs taken during the first-day session are a private editorial
      # source. Keep this narrow guard even if a local working folder returns.
      if ($folderName -eq 'appsec-lections' -and $relative -match '^downloads\\day-01\\slides(\\|$)') { return }

      # Day 2 is published only as a reconstructed accessible HTML deck.
      # Keep both the former gallery index and its image directory out of a
      # release even if somebody reintroduces a local working copy.
      if ($folderName -eq 'appsec-lections' -and ($relative -eq 'assets\\day-02-slides.js' -or $relative -match '^assets\\day-02-slides(\\|$)')) { return }

      # Published AppSec downloads use Markdown for reader-facing text. Raw
      # ASR TXT files must not re-enter the public release by accident.
      if ($folderName -eq 'appsec-lections' -and $relative -match '^downloads\\.*\.txt$') {
        throw "TXT is not allowed in published AppSec downloads: $relative"
      }

      if (Should-IncludeReviewedNestedDistributable -FolderName $folderName -RelativePath $relative) {
        $files.Add($relative)
        return
      }

      if (-not (Should-ExcludeNestedFile $_.Name)) {
        $files.Add($relative)
      }
    }
  }

  @($files | Sort-Object -Unique)
}

function Get-RootReleaseFiles([string]$RootPath) {
  $rootNames = @(
    '.htaccess',
    'course-map.html',
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
          sha256 = (Get-DeterministicFileSha256 -Path $_.FullName).ToLowerInvariant()
        }
      }
  )

  [pscustomobject]@{
    generated = "$($script:ReleaseDateValue)T00:00:00Z"
    releaseDate = $script:ReleaseDateValue
    target = $Target
    archive = $ArchiveName
    fileCount = $files.Count
    files = $files
    staticIssues = $Issues
  }
}

$rootPath = (Resolve-Path -LiteralPath $Root).Path
$script:ReleaseRepositoryRoot = [System.IO.Path]::GetFullPath($rootPath).TrimEnd('\')
Assert-NoReparsePathComponents -BoundaryRoot $script:ReleaseRepositoryRoot -TargetPath $script:ReleaseRepositoryRoot -RequireTarget
Initialize-IgnoredReleaseSourceGate -RepositoryRoot $script:ReleaseRepositoryRoot
$projectPath = Join-Path $rootPath '_PROJECT'
$lecturesPath = Join-Path $projectPath 'lectures.json'
if (-not (Test-Path -LiteralPath $lecturesPath)) { Fail "Missing _PROJECT\lectures.json" }

$astraLabsBuilder = Join-Path $projectPath 'build-astra-hardening-labs.ps1'
if (-not (Test-Path -LiteralPath $astraLabsBuilder -PathType Leaf)) {
  Fail "Missing _PROJECT\build-astra-hardening-labs.ps1"
}
& $astraLabsBuilder -Check

$data = Get-Content -LiteralPath $lecturesPath -Encoding UTF8 -Raw | ConvertFrom-Json
if ([string]::IsNullOrWhiteSpace($ReleaseDate)) {
  $ReleaseDate = [string]$data.updated
}
if ($ReleaseDate -notmatch '^\d{4}-\d{2}-\d{2}$') {
  Fail "ReleaseDate must be YYYY-MM-DD, got $ReleaseDate"
}
$script:ReleaseDateValue = $ReleaseDate

$uniqueFolders = @($data.lectures | Select-Object -ExpandProperty folder -Unique)
foreach ($lectureEntry in @($data.lectures)) {
  Assert-SafeLectureDomain -Domain ([string]$lectureEntry.domain)
}
foreach ($folder in $uniqueFolders) {
  Assert-SafeLectureFolder -RootPath $rootPath -Folder ([string]$folder)
}

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

# Build every canonical generated handout before selecting any release source.
# A builder can legitimately replace an ignored generated archive, but it must
# not be able to create an undeclared ignored/untracked file after the Git gate
# snapshot and have that file selected by the broad site-file enumerator.
foreach ($target in @($targets | Where-Object { $_.kind -eq 'domain' })) {
  $sourceRoot = Join-Path $rootPath $target.folder

  if ($target.folder -eq 'scaner-vs') {
    $scanerBundleScript = Join-Path $projectPath 'build-scaner-vs-archives.ps1'
    if (-not (Test-Path -LiteralPath $scanerBundleScript -PathType Leaf)) {
      Fail "Missing Scanner-VS bundle builder: $scanerBundleScript"
    }
    Write-Output 'RUN bundle scaner-vs'
    & $scanerBundleScript -Root $rootPath | Out-Null
  }

  $bundleScript = Join-Path $sourceRoot '_build\build-materials-zip.ps1'
  if (Test-Path -LiteralPath $bundleScript -PathType Leaf) {
    Write-Output "RUN bundle $($target.folder)"
    & $bundleScript | Out-Null
    if ($LASTEXITCODE -ne 0) {
      Fail "Bundle builder failed for $($target.folder) with exit code $LASTEXITCODE"
    }
  }
}

# Refresh after all builders and before all selection. From this point until
# staging, release inputs are read-only and every selected path is checked
# against the post-build tracked/ignored/untracked repository state.
Initialize-IgnoredReleaseSourceGate -RepositoryRoot $script:ReleaseRepositoryRoot

$rootReleaseFiles = @(Get-RootReleaseFiles $rootPath)
foreach ($relativeFile in $rootReleaseFiles) {
  [void](Get-ValidatedReleaseSourcePath -SourceRoot $rootPath -RelativePath $relativeFile)
}

$domainReleaseFiles = @{}
foreach ($target in @($targets | Where-Object { $_.kind -eq 'domain' })) {
  $sourceRoot = Join-Path $rootPath $target.folder
  $selected = @(Get-DomainReleaseFiles $sourceRoot)
  foreach ($relativeFile in $selected) {
    [void](Get-ValidatedReleaseSourcePath -SourceRoot $sourceRoot -RelativePath $relativeFile)
  }
  $domainReleaseFiles[$target.folder] = $selected
}

$stagingRoot = Join-Path $projectPath ".release-staging-$ReleaseDate"
Reset-Directory -Path $stagingRoot -RequiredParent $projectPath

$results = New-Object System.Collections.Generic.List[object]

foreach ($target in $targets) {
  if ($target.kind -eq 'root') {
    $sourceRoot = $rootPath
    $releaseDir = Join-Path $rootPath 'release'
    $archiveName = "pikov.expert-root-release-$ReleaseDate.zip"
    $relativeFiles = $rootReleaseFiles
    $stageName = 'root'
  } else {
    $sourceRoot = Join-Path $rootPath $target.folder
    if (-not (Test-Path -LiteralPath (Join-Path $sourceRoot 'index.html'))) {
      Fail "Missing index.html for $($target.folder)"
    }
    $releaseDir = Join-Path $sourceRoot 'release'
    $archiveName = "$($target.domain)-release-$ReleaseDate.zip"

    $relativeFiles = $domainReleaseFiles[$target.folder]
    $stageName = $target.folder
  }

  Reset-Directory -Path $releaseDir -RequiredParent $sourceRoot
  $stageDir = Join-Path $stagingRoot $stageName
  Reset-Directory -Path $stageDir -RequiredParent $stagingRoot

  foreach ($relativeFile in $relativeFiles) {
    Copy-ReleaseFile -SourceRoot $sourceRoot -StageRoot $stageDir -RelativePath $relativeFile
  }
  ConvertTo-DeterministicArchiveTree -Root $stageDir

  $issues = @(Test-StaticRelease -StageRoot $stageDir -SiteName $target.domain)
  $archivePath = Join-Path $releaseDir $archiveName
  Assert-ChildPath -Parent $releaseDir -Child $archivePath
  if (Test-Path -LiteralPath $archivePath) { Remove-Item -LiteralPath $archivePath -Force }

  $stageChildren = @(Get-ChildItem -LiteralPath $stageDir -Force)
  if ($stageChildren.Count -eq 0) { Fail "No files selected for $($target.domain)" }
  New-DeterministicArchive -SourceRoot $stageDir -Destination $archivePath

  $verifyDir = Join-Path $releaseDir 'verify-unpacked'
  Reset-Directory -Path $verifyDir -RequiredParent $releaseDir
  Expand-Archive -LiteralPath $archivePath -DestinationPath $verifyDir -Force
  if (-not (Test-Path -LiteralPath (Join-Path $verifyDir 'index.html'))) {
    Fail "Archive verification failed for $($target.domain): no index.html at unpacked root"
  }
  Remove-Item -LiteralPath $verifyDir -Recurse -Force

  $archiveHash = (Get-DeterministicFileSha256 -Path $archivePath).ToLowerInvariant()
  $archiveItem = Get-Item -LiteralPath $archivePath
  $manifest = New-Manifest -StageRoot $stageDir -Target $target -Issues $issues -ArchiveName $archiveName
  $manifestPath = Join-Path $releaseDir 'MANIFEST.json'
  Write-DeterministicUtf8Text `
    -Path $manifestPath `
    -Text ($manifest | ConvertTo-Json -Depth 10) `
    -TrailingNewline

  $shaPath = Join-Path $releaseDir 'SHA256SUMS.txt'
  $shaLines = New-Object System.Collections.Generic.List[string]
  $shaLines.Add("$archiveHash  $archiveName")
  foreach ($file in $manifest.files) {
    $shaLines.Add("$($file.sha256)  $($file.path)")
  }
  Write-DeterministicUtf8Text -Path $shaPath -Text ($shaLines -join "`n") -TrailingNewline

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
  Write-DeterministicUtf8Text -Path $notesPath -Text ($noteLines -join "`n") -TrailingNewline

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
Write-DeterministicUtf8Text -Path $indexPath -Text ($indexLines -join "`n") -TrailingNewline

if (-not $KeepStaging) {
  Remove-Item -LiteralPath $stagingRoot -Recurse -Force
}

Write-DeterministicUtf8Text `
  -Path (Join-Path $projectPath "RELEASE_INDEX_$ReleaseDate.json") `
  -Text ($results | ConvertTo-Json -Depth 6) `
  -TrailingNewline

Write-Output "RELEASE BUILD OK"
Write-Output "archives=$($results.Count)"
Write-Output "staticIssues=$totalIssues"
Write-Output "releaseIndex=$indexPath"

if ($FailOnIssues -and $totalIssues -gt 0) {
  Fail "Static release issues found: $totalIssues"
}
