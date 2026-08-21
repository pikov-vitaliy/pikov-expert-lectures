param(
  [string]$Root = (Split-Path -Parent $PSScriptRoot),
  [string]$SshAlias = 'pikov-hosting',
  [string]$ReleaseDate = '',
  [int]$KeepLocalDeployDirs = 3,
  [string[]]$OnlyDomains = @(),
  [string]$ExpectedSourceCommit = '',
  [switch]$KeepRemoteDeployRoot,
  [switch]$SkipPostDeployCheck,
  [switch]$PrepareOnly
)

$ErrorActionPreference = 'Stop'

Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

function Fail([string]$Message) {
  throw "DEPLOY FAIL: $Message"
}

function Test-GitCommitOnMainHistory(
  [string]$RepositoryRoot,
  [string]$Commit,
  [object]$GitCommand
) {
  $originMainRef = 'refs/remotes/origin/main'
  & $GitCommand.Source -C $RepositoryRoot show-ref --verify --quiet $originMainRef 2>$null
  if ($LASTEXITCODE -eq 0) {
    & $GitCommand.Source -C $RepositoryRoot merge-base --is-ancestor $Commit $originMainRef 2>$null
    return ($LASTEXITCODE -eq 0)
  }

  $localMainRef = 'refs/heads/main'
  & $GitCommand.Source -C $RepositoryRoot show-ref --verify --quiet $localMainRef 2>$null
  if ($LASTEXITCODE -ne 0) { return $false }
  & $GitCommand.Source -C $RepositoryRoot merge-base --is-ancestor $Commit $localMainRef 2>$null
  return ($LASTEXITCODE -eq 0)
}

function Get-GitDeploymentState([string]$RepositoryRoot) {
  if (-not (Test-Path -LiteralPath (Join-Path $RepositoryRoot '.git'))) {
    Fail 'ExpectedSourceCommit verification requires a Git repository checkout'
  }
  $gitCommand = Get-Command git -ErrorAction SilentlyContinue
  if ($null -eq $gitCommand) {
    Fail 'Git is required to verify ExpectedSourceCommit before deployment'
  }

  $headOutput = @(& $gitCommand.Source -C $RepositoryRoot rev-parse --verify HEAD 2>&1)
  if ($LASTEXITCODE -ne 0) {
    Fail "Could not resolve Git HEAD before deployment: $($headOutput -join ' ')"
  }
  $headCommit = (($headOutput | Select-Object -First 1) -as [string]).Trim().ToLowerInvariant()
  if ($headCommit -notmatch '^[0-9a-f]{40}$') {
    Fail "Git HEAD is not a full 40-character commit: $headCommit"
  }

  $refOutput = @(& $gitCommand.Source -C $RepositoryRoot symbolic-ref -q HEAD 2>$null)
  $sourceRef = if ($LASTEXITCODE -eq 0 -and $refOutput.Count -gt 0) {
    ([string]$refOutput[0]).Trim()
  } else {
    'detached-HEAD'
  }

  $statusOutput = @(& $gitCommand.Source -c core.quotepath=false -C $RepositoryRoot status --porcelain=v1 --untracked-files=no 2>&1)
  if ($LASTEXITCODE -ne 0) {
    Fail "Could not inspect tracked Git state before deployment: $($statusOutput -join ' ')"
  }
  $trackedChanges = @($statusOutput | Where-Object { -not [string]::IsNullOrWhiteSpace([string]$_) })
  $onMainHistory = Test-GitCommitOnMainHistory `
    -RepositoryRoot $RepositoryRoot `
    -Commit $headCommit `
    -GitCommand $gitCommand
  return [pscustomobject]@{
    headCommit = $headCommit
    sourceRef = $sourceRef
    onMainHistory = $onMainHistory
    trackedDirty = ($trackedChanges.Count -gt 0)
  }
}

function Invoke-Checked([string]$FilePath, [string[]]$Arguments) {
  $display = $FilePath + ' ' + ($Arguments -join ' ')
  Write-Output "RUN $display"
  & $FilePath @Arguments
  if ($LASTEXITCODE -ne 0) {
    Fail "Command failed: $display"
  }
}

function Get-Sha256Stream([System.IO.Stream]$Stream) {
  $algorithm = [System.Security.Cryptography.SHA256]::Create()
  try {
    return ([System.BitConverter]::ToString($algorithm.ComputeHash($Stream))).Replace('-', '').ToLowerInvariant()
  } finally {
    $algorithm.Dispose()
  }
}

function Get-Sha256File([string]$Path) {
  $stream = [System.IO.File]::OpenRead($Path)
  try {
    return Get-Sha256Stream -Stream $stream
  } finally {
    $stream.Dispose()
  }
}

function Get-Sha256Bytes([byte[]]$Bytes) {
  $stream = New-Object System.IO.MemoryStream(,$Bytes)
  try {
    return Get-Sha256Stream -Stream $stream
  } finally {
    $stream.Dispose()
  }
}

function Get-ArchiveSourceTreeSha256([string]$Path) {
  $archive = [System.IO.Compression.ZipFile]::OpenRead($Path)
  try {
    $recordsByPath = [System.Collections.Generic.Dictionary[string,object]]::new(
      [System.StringComparer]::Ordinal
    )
    foreach ($entry in $archive.Entries) {
      $relative = [string]$entry.FullName
      $segments = @($relative.Split(@([char]'/'), [System.StringSplitOptions]::None))
      if ([string]::IsNullOrWhiteSpace($relative) -or
          [string]::IsNullOrWhiteSpace([string]$entry.Name) -or
          $relative.Contains('\') -or
          $relative.StartsWith('/', [System.StringComparison]::Ordinal) -or
          [System.IO.Path]::IsPathRooted($relative) -or
          $relative -match '[\x00-\x1f\x7f]' -or
          @($segments | Where-Object { $_ -in @('', '.', '..') }).Count -gt 0) {
        Fail "Unsafe archive path while verifying source tree: $relative"
      }
      if ($recordsByPath.ContainsKey($relative)) {
        Fail "Duplicate archive path while verifying source tree: $relative"
      }

      $entryStream = $entry.Open()
      try {
        $entrySha256 = Get-Sha256Stream -Stream $entryStream
      } finally {
        $entryStream.Dispose()
      }
      $recordsByPath.Add($relative, [pscustomobject]@{
        size = [long]$entry.Length
        sha256 = $entrySha256
      })
    }

    if ($recordsByPath.Count -eq 0) {
      Fail 'Archive has no files while verifying source tree'
    }
    [string[]]$relativePaths = @($recordsByPath.Keys)
    [System.Array]::Sort($relativePaths, [System.StringComparer]::Ordinal)
    $treeLines = @(
      foreach ($relative in $relativePaths) {
        $record = $recordsByPath[$relative]
        $size = ([long]$record.size).ToString([System.Globalization.CultureInfo]::InvariantCulture)
        "$relative`t$size`t$($record.sha256)"
      }
    )
    $treeText = ($treeLines -join "`n") + "`n"
    $treeBytes = (New-Object System.Text.UTF8Encoding($false)).GetBytes($treeText)
    return Get-Sha256Bytes -Bytes $treeBytes
  } finally {
    $archive.Dispose()
  }
}

function Get-CurrentPowerShellExecutable {
  $leafNames = if ($PSVersionTable.PSEdition -eq 'Core') {
    @('pwsh.exe', 'pwsh')
  } else {
    @('powershell.exe', 'powershell')
  }
  foreach ($leafName in $leafNames) {
    $candidate = Join-Path $PSHOME $leafName
    if (Test-Path -LiteralPath $candidate -PathType Leaf) {
      return $candidate
    }
  }
  foreach ($leafName in $leafNames) {
    $command = Get-Command $leafName -ErrorAction SilentlyContinue
    if ($null -ne $command) {
      return [string]$command.Source
    }
  }
  Fail 'Could not locate a PowerShell executable for the post-deploy check'
}

function Assert-SafeLeaf([string]$Value, [string]$FieldName, [string]$Pattern) {
  if ([string]::IsNullOrWhiteSpace($Value)) {
    Fail "Unsafe ${FieldName}: value is empty"
  }
  if ($Value -in @('.', '..') -or $Value.IndexOfAny(@([char]'/', [char]'\')) -ge 0) {
    Fail "Unsafe $FieldName leaf: $Value"
  }
  if (@($Value.ToCharArray() | Where-Object { [char]::IsControl($_) }).Count -gt 0) {
    Fail "Unsafe ${FieldName}: control character"
  }
  if ($Value -notmatch $Pattern) {
    Fail "Unsafe $FieldName leaf: $Value"
  }
}

function Get-CanonicalReleaseTargets([object]$LectureData, [string]$RepositoryRoot, [string]$Date) {
  $targets = New-Object System.Collections.Generic.List[object]
  $targets.Add([pscustomobject]@{
    kind = 'root'
    folder = ''
    domain = 'pikov.expert'
    archiveName = "pikov.expert-root-release-$Date.zip"
    archivePath = Join-Path $RepositoryRoot "release\pikov.expert-root-release-$Date.zip"
  })

  $folders = @($LectureData.lectures | Select-Object -ExpandProperty folder -Unique)
  foreach ($folderValue in $folders) {
    $folder = [string]$folderValue
    Assert-SafeLeaf -Value $folder -FieldName 'lecture folder' -Pattern '^[A-Za-z0-9][A-Za-z0-9._-]*$'
    $lecture = @($LectureData.lectures | Where-Object { ([string]$_.folder) -ceq $folder })[0]
    $domain = "$([string]$lecture.domain).pikov.expert"
    Assert-SafeLeaf -Value $domain -FieldName 'canonical domain' -Pattern '^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)*$'
    $archiveName = "$domain-release-$Date.zip"
    $targets.Add([pscustomobject]@{
      kind = 'domain'
      folder = $folder
      domain = $domain
      archiveName = $archiveName
      archivePath = Join-Path $RepositoryRoot "$folder\release\$archiveName"
    })
  }
  return $targets
}

function Assert-CanonicalReleaseIndex([object[]]$Entries, [object[]]$CanonicalTargets) {
  if ($Entries.Count -ne $CanonicalTargets.Count) {
    Fail "Release index does not match canonical domain set: expected $($CanonicalTargets.Count), got $($Entries.Count)"
  }

  $seen = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::Ordinal)
  foreach ($entry in $Entries) {
    $domain = [string]$entry.domain
    $archiveName = [string]$entry.archiveName
    Assert-SafeLeaf -Value $domain -FieldName 'domain' -Pattern '^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)*$'
    Assert-SafeLeaf -Value $archiveName -FieldName 'archiveName' -Pattern '^[A-Za-z0-9][A-Za-z0-9._-]*\.zip$'
    if (-not $seen.Add($domain)) {
      Fail "Release index contains duplicate domain: $domain"
    }

    $expected = @($CanonicalTargets | Where-Object { ([string]$_.domain) -ceq $domain })
    if ($expected.Count -ne 1) {
      Fail "Release index does not match canonical domain set: unexpected domain $domain"
    }
    $target = $expected[0]
    if ([string]$entry.kind -cne [string]$target.kind -or [string]$entry.folder -cne [string]$target.folder) {
      Fail "Release target metadata mismatch for $domain"
    }
    if ($archiveName -cne [string]$target.archiveName) {
      Fail "archiveName mismatch for ${domain}: expected $($target.archiveName), got $archiveName"
    }

    try {
      $actualArchivePath = [System.IO.Path]::GetFullPath([string]$entry.archivePath)
      $expectedArchivePath = [System.IO.Path]::GetFullPath([string]$target.archivePath)
    } catch {
      Fail "Invalid archivePath for $domain"
    }
    if (-not $actualArchivePath.Equals($expectedArchivePath, [System.StringComparison]::OrdinalIgnoreCase)) {
      Fail "archivePath mismatch for ${domain}: expected $expectedArchivePath, got $actualArchivePath"
    }
  }

  $missing = @($CanonicalTargets | Where-Object { -not $seen.Contains([string]$_.domain) })
  if ($missing.Count -gt 0) {
    Fail "Release index does not match canonical domain set: missing $($missing.domain -join ', ')"
  }
}

function Assert-AcceptedReleaseProvenance(
  [object[]]$Entries,
  [string]$ExpectedCommit,
  [string]$ExpectedDate
) {
  foreach ($entry in $Entries) {
    $domain = [string]$entry.domain
    if ([int]$entry.provenanceVersion -ne 1) {
      Fail "Unsupported or missing release provenance for ${domain}: provenanceVersion must be 1"
    }
    if ([string]$entry.releaseKind -cne 'accepted') {
      Fail "Release $domain is not accepted: releaseKind=$($entry.releaseKind)"
    }
    if ([string]$entry.sourceCommit -cne $ExpectedCommit) {
      Fail "Release source commit mismatch for ${domain}: expected $ExpectedCommit, got $($entry.sourceCommit)"
    }
    if ([string]$entry.releaseDate -cne $ExpectedDate) {
      Fail "Release date mismatch for ${domain}: expected $ExpectedDate, got $($entry.releaseDate)"
    }
    if ([string]$entry.sourceRef -cne 'refs/heads/main') {
      Fail "Release $domain has an invalid accepted source ref: $($entry.sourceRef)"
    }
    if ($entry.sourceDirty -isnot [bool] -or [bool]$entry.sourceDirty) {
      Fail "Release $domain has dirty or invalid source provenance"
    }
    if ($entry.deployable -isnot [bool] -or -not [bool]$entry.deployable) {
      Fail "Release $domain is not deployable"
    }
    if ([string]$entry.policyDecision -cne 'allow-deploy') {
      Fail "Release $domain policy does not allow deployment"
    }
    if ([string]$entry.sourceTreeSha256 -cnotmatch '^[0-9a-f]{64}$') {
      Fail "Release $domain has an invalid source tree SHA256"
    }
  }
}

function New-UniqueDeployEvidencePath(
  [string]$ProjectPath,
  [string]$Date,
  [string]$Stamp,
  [string]$SourceCommit
) {
  $baseName = "HOSTING_DEPLOY_${Date}_${Stamp}_$($SourceCommit.Substring(0, 12))"
  $suffix = 0
  while ($true) {
    $name = if ($suffix -eq 0) { "$baseName.md" } else { "$baseName-$suffix.md" }
    $candidate = Join-Path $ProjectPath $name
    try {
      $stream = [System.IO.File]::Open(
        $candidate,
        [System.IO.FileMode]::CreateNew,
        [System.IO.FileAccess]::Write,
        [System.IO.FileShare]::None
      )
      $stream.Dispose()
      return $candidate
    } catch [System.IO.IOException] {
      if (Test-Path -LiteralPath $candidate) {
        $suffix++
        continue
      }
      throw
    }
  }
}

function Write-DeployEvidence(
  [string]$Path,
  [string]$Status,
  [string]$Date,
  [string]$Stamp,
  [string]$EvidenceUtc,
  [string]$SourceCommit,
  [string]$ReleaseSourceRef,
  [string]$CheckoutSourceRef,
  [string]$RemoteDeployRoot,
  [object[]]$Entries,
  [bool]$RetainRemoteRoot,
  [bool]$PostDeployCheckSkipped,
  [string]$FailureMessage = ''
) {
  $lines = New-Object System.Collections.Generic.List[string]
  $lines.Add("# Hosting deploy evidence $Date")
  $lines.Add('')
  $lines.Add("Status: $Status")
  $lines.Add("Deploy stamp: $Stamp")
  $lines.Add("Evidence UTC: $EvidenceUtc")
  $lines.Add("Source commit: $SourceCommit")
  $lines.Add("Release source ref: $ReleaseSourceRef")
  $lines.Add("Deployment checkout ref: $CheckoutSourceRef")
  $lines.Add('Policy decision: allow-deploy')
  $lines.Add("Remote deploy root: $RemoteDeployRoot")
  $lines.Add("Remote deploy root retained: $($RetainRemoteRoot.ToString().ToLowerInvariant())")
  $lines.Add("Post-deploy check skipped: $($PostDeployCheckSkipped.ToString().ToLowerInvariant())")
  if (-not [string]::IsNullOrWhiteSpace($FailureMessage)) {
    $safeFailure = $FailureMessage.Replace("`r", ' ').Replace("`n", ' ').Replace('|', '\|')
    $lines.Add("Failure: $safeFailure")
  }
  $lines.Add('')
  $lines.Add('## Targets')
  $lines.Add('')
  $lines.Add('| Domain | Archive | Archive SHA256 | Source tree SHA256 | Backup |')
  $lines.Add('|---|---|---|---|---|')
  foreach ($entry in $Entries) {
    $backup = "$RemoteDeployRoot/backups/$($entry.domain)-www-$Stamp.tar.gz"
    $lines.Add("| $($entry.domain) | $($entry.archiveName) | $($entry.archiveSha256) | $($entry.sourceTreeSha256) | $backup |")
  }
  $lines.Add('')
  if ($RetainRemoteRoot) {
    $lines.Add('The remote deploy root and per-target backups were retained for an operator-controlled rollback.')
  } else {
    $lines.Add('The remote deploy root is scheduled for removal only after deployment and post-deploy verification succeed.')
  }
  [System.IO.File]::WriteAllText(
    $Path,
    (($lines -join "`n").TrimEnd("`n") + "`n"),
    (New-Object System.Text.UTF8Encoding($false))
  )
}

function Remove-OldLocalDeployDirs([string]$ProjectPath, [int]$Keep) {
  if ($Keep -lt 1) { Fail "KeepLocalDeployDirs must be >= 1" }
  $projectResolved = (Resolve-Path -LiteralPath $ProjectPath).Path.TrimEnd('\') + '\'
  $dirs = @(
    Get-ChildItem -LiteralPath $ProjectPath -Directory -Force |
      Where-Object { $_.Name -like '.hosting-deploy-*' } |
      Sort-Object LastWriteTime -Descending
  )
  $oldDirs = @($dirs | Select-Object -Skip $Keep)
  foreach ($dir in $oldDirs) {
    $resolved = (Resolve-Path -LiteralPath $dir.FullName).Path
    if (-not (($resolved + '\').StartsWith($projectResolved, [System.StringComparison]::OrdinalIgnoreCase))) {
      Fail "Refusing to remove deploy directory outside _PROJECT: $resolved"
    }
    if ($dir.Name -notlike '.hosting-deploy-*') {
      Fail "Refusing to remove unexpected directory: $resolved"
    }
    Remove-Item -LiteralPath $resolved -Recurse -Force
    Write-Output "removedOldLocalDeployDir=$resolved"
  }
}

$rootPath = (Resolve-Path -LiteralPath $Root).Path
$projectPath = Join-Path $rootPath '_PROJECT'
$lecturesPath = Join-Path $projectPath 'lectures.json'
if (-not (Test-Path -LiteralPath $lecturesPath)) { Fail "Missing _PROJECT\lectures.json" }
$lectureData = Get-Content -LiteralPath $lecturesPath -Encoding UTF8 -Raw | ConvertFrom-Json
if ([string]::IsNullOrWhiteSpace($ReleaseDate)) {
  $ReleaseDate = [string]$lectureData.updated
}
if ($ReleaseDate -notmatch '^\d{4}-\d{2}-\d{2}$') {
  Fail "ReleaseDate must be YYYY-MM-DD, got $ReleaseDate"
}
$expectedCommit = $ExpectedSourceCommit.Trim().ToLowerInvariant()
if ([string]::IsNullOrWhiteSpace($expectedCommit)) {
  Fail 'ExpectedSourceCommit is required and must identify the accepted release commit'
}
if ($expectedCommit -notmatch '^[0-9a-f]{40}$') {
  Fail "ExpectedSourceCommit must be a full 40-character hexadecimal commit, got $ExpectedSourceCommit"
}
$gitState = Get-GitDeploymentState -RepositoryRoot $rootPath
if ($gitState.headCommit -cne $expectedCommit) {
  Fail "ExpectedSourceCommit does not match Git HEAD: expected $expectedCommit, got $($gitState.headCommit)"
}
if (-not $gitState.onMainHistory) {
  Fail "ExpectedSourceCommit is not in accepted main history: $expectedCommit"
}
if ($gitState.trackedDirty) {
  Fail 'Deployment requires a clean tracked Git tree at ExpectedSourceCommit'
}
if ($SkipPostDeployCheck -and -not $KeepRemoteDeployRoot) {
  Fail 'SkipPostDeployCheck requires KeepRemoteDeployRoot so rollback data is not removed without verification'
}

$releaseIndexPath = Join-Path $projectPath "RELEASE_INDEX_$ReleaseDate.json"
if (-not (Test-Path -LiteralPath $releaseIndexPath)) { Fail "Missing release index: $releaseIndexPath" }
$entries = @(Get-Content -LiteralPath $releaseIndexPath -Encoding UTF8 -Raw | ConvertFrom-Json | ForEach-Object { $_ })
$canonicalTargets = @(Get-CanonicalReleaseTargets -LectureData $lectureData -RepositoryRoot $rootPath -Date $ReleaseDate)
Assert-CanonicalReleaseIndex -Entries $entries -CanonicalTargets $canonicalTargets
Assert-AcceptedReleaseProvenance -Entries $entries -ExpectedCommit $expectedCommit -ExpectedDate $ReleaseDate
$releaseSourceRefs = @($entries | ForEach-Object { [string]$_.sourceRef } | Select-Object -Unique)
if ($releaseSourceRefs.Count -ne 1) {
  Fail 'Release index contains inconsistent source refs'
}
$releaseSourceRef = $releaseSourceRefs[0]

$independenceGatePath = Join-Path $projectPath 'test-public-release-independence.ps1'
if (-not (Test-Path -LiteralPath $independenceGatePath)) { Fail "Missing public independence gate: $independenceGatePath" }
& $independenceGatePath -Root $rootPath -ReleaseIndex $releaseIndexPath

if ($OnlyDomains.Count -gt 0) {
  $requestedDomains = @($OnlyDomains | ForEach-Object { $_.Trim().ToLowerInvariant() } | Where-Object { $_ } | Select-Object -Unique)
  $knownDomains = @($entries | ForEach-Object { ([string]$_.domain).ToLowerInvariant() })
  $unknownDomains = @($requestedDomains | Where-Object { $_ -notin $knownDomains })
  if ($unknownDomains.Count -gt 0) { Fail "Unknown release domain(s): $($unknownDomains -join ', ')" }
  $entries = @($entries | Where-Object { ([string]$_.domain).ToLowerInvariant() -in $requestedDomains })
}
if ($entries.Count -eq 0) { Fail 'No release entries selected' }

if ($PrepareOnly) {
  $remoteHome = '/tmp/pikov-deploy-dry-run'
} else {
  $remoteHome = (& ssh $SshAlias 'printf %s "$HOME"')
  if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($remoteHome)) {
    Fail "Could not resolve remote HOME through SSH alias $SshAlias"
  }
  $remoteHome = $remoteHome.Trim().TrimEnd('/')
}

$stamp = Get-Date -Format 'yyyyMMdd-HHmmssfff'
$deployRoot = "$remoteHome/_deploy_pikov_$stamp"
$localDeployDir = Join-Path $projectPath ".hosting-deploy-$stamp"
New-Item -ItemType Directory -Path $localDeployDir -Force | Out-Null

$manifestPath = Join-Path $localDeployDir 'manifest.tsv'
$manifestLines = foreach ($entry in $entries) {
  if (-not (Test-Path -LiteralPath $entry.archivePath)) {
    Fail "Missing archive: $($entry.archivePath)"
  }
  if ([string]$entry.archiveSha256 -cnotmatch '^[0-9a-f]{64}$') {
    Fail "Invalid archive SHA256 for $($entry.domain)"
  }
  $actual = Get-Sha256File -Path ([string]$entry.archivePath)
  if ($actual -ne $entry.archiveSha256) {
    Fail "Local SHA256 mismatch for $($entry.domain)"
  }
  $actualSourceTree = Get-ArchiveSourceTreeSha256 -Path ([string]$entry.archivePath)
  if ($actualSourceTree -cne [string]$entry.sourceTreeSha256) {
    Fail "Source tree SHA256 mismatch for $($entry.domain): expected $($entry.sourceTreeSha256), got $actualSourceTree"
  }
  "$($entry.domain)`t$($entry.archiveName)`t$($entry.archiveSha256)`t$expectedCommit"
}
[System.IO.File]::WriteAllText($manifestPath, (($manifestLines -join "`n") + "`n"), [System.Text.Encoding]::ASCII)

$remoteScriptPath = Join-Path $localDeployDir 'deploy-remote.sh'
$remoteScript = @'
#!/usr/bin/env bash
set -euo pipefail

DEPLOY_ROOT="$1"
STAMP="$2"
EXPECTED_SOURCE_COMMIT="$3"
MANIFEST="$DEPLOY_ROOT/manifest.tsv"
LOG="$DEPLOY_ROOT/deploy.log"

mkdir -p "$DEPLOY_ROOT/backups" "$DEPLOY_ROOT/unpacked" "$DEPLOY_ROOT/logs"
: > "$LOG"

if ! command -v python3 >/dev/null 2>&1; then
  echo "python3 is required to extract ZIP archives with UTF-8 names" | tee -a "$LOG"
  exit 9
fi

if [[ ! "$EXPECTED_SOURCE_COMMIT" =~ ^[0-9a-f]{40}$ ]]; then
  echo "Unsafe expected source commit" | tee -a "$LOG"
  exit 20
fi

home_real="$(python3 - "$HOME" <<'PY'
import os
import sys

home = os.path.realpath(sys.argv[1])
if not os.path.isabs(home) or home == os.path.sep:
    raise SystemExit("unsafe remote HOME: %s" % home)
print(home)
PY
)"

while IFS=$'\t' read -r domain archive sha256 source_commit; do
  domain="${domain%$'\r'}"
  archive="${archive%$'\r'}"
  sha256="${sha256%$'\r'}"
  source_commit="${source_commit%$'\r'}"
  [ -n "$domain" ] || continue
  if [[ ! "$domain" =~ ^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*$ ]]; then
    echo "Unsafe domain in manifest: $domain" | tee -a "$LOG"
    exit 16
  fi
  if [[ ! "$archive" =~ ^[A-Za-z0-9][A-Za-z0-9._-]*\.zip$ ]]; then
    echo "Unsafe archive name in manifest: $archive" | tee -a "$LOG"
    exit 17
  fi
  if [[ ! "$sha256" =~ ^[0-9a-f]{64}$ ]]; then
    echo "Unsafe SHA256 in manifest for $domain" | tee -a "$LOG"
    exit 18
  fi
  if [[ "$source_commit" != "$EXPECTED_SOURCE_COMMIT" ]]; then
    echo "Source commit mismatch in manifest for $domain" | tee -a "$LOG"
    exit 21
  fi
  target="$(python3 - "$home_real" "$domain" <<'PY'
import os
import sys

home = os.path.realpath(sys.argv[1])
domain = sys.argv[2]
expected = os.path.join(home, domain, "www")
resolved = os.path.realpath(expected)
try:
    inside_home = os.path.commonpath((home, resolved)) == home
except ValueError:
    inside_home = False
if not inside_home or resolved != expected:
    raise SystemExit("target escapes expected domain root: %s" % resolved)
print(resolved)
PY
)" || {
    echo "Unsafe target for $domain" | tee -a "$LOG"
    exit 19
  }
  zip_path="$DEPLOY_ROOT/zips/$archive"
  unpack_dir="$DEPLOY_ROOT/unpacked/$domain"
  backup_path="$DEPLOY_ROOT/backups/${domain}-www-${STAMP}.tar.gz"

  echo "=== $domain ===" | tee -a "$LOG"

  if [ ! -d "$target" ]; then
    echo "Missing target: $target" | tee -a "$LOG"
    exit 10
  fi
  if [ ! -w "$target" ]; then
    echo "Target is not writable: $target" | tee -a "$LOG"
    exit 11
  fi
  if [ ! -f "$zip_path" ]; then
    echo "Missing zip: $zip_path" | tee -a "$LOG"
    exit 12
  fi

  actual="$(sha256sum "$zip_path" | awk '{print tolower($1)}')"
  if [ "$actual" != "$sha256" ]; then
    echo "SHA256 mismatch for $domain: $actual != $sha256" | tee -a "$LOG"
    exit 13
  fi

  tar -C "$(dirname "$target")" -czf "$backup_path" www
  rm -rf "$unpack_dir"
  mkdir -p "$unpack_dir"
  python3 - "$zip_path" "$unpack_dir" <<'PY'
import os
import shutil
import sys
import zipfile

zip_path = sys.argv[1]
dest = os.path.abspath(sys.argv[2])

with zipfile.ZipFile(zip_path) as zf:
    for member in zf.infolist():
        normalized = member.filename.replace("\\", "/")
        parts = [part for part in normalized.split("/") if part not in ("", ".")]
        if not parts or any(part == ".." for part in parts):
            raise SystemExit("unsafe zip member: %s" % member.filename)
        target = os.path.abspath(os.path.join(dest, *parts))
        if not (target == dest or target.startswith(dest + os.sep)):
            raise SystemExit("zip member escapes target: %s" % member.filename)
        if member.filename.endswith(("/", "\\")):
            if not os.path.isdir(target):
                os.makedirs(target)
            continue
        parent = os.path.dirname(target)
        if not os.path.isdir(parent):
            os.makedirs(parent)
        with zf.open(member) as source, open(target, "wb") as sink:
            shutil.copyfileobj(source, sink)
PY

  for required in index.html .htaccess robots.txt sitemap.xml; do
    if [ ! -f "$unpack_dir/$required" ]; then
      echo "Archive $domain missing $required at root" | tee -a "$LOG"
      exit 14
    fi
  done
  chmod -R u+rwX "$unpack_dir"

  if (cd "$unpack_dir" && find . \( -path './_PROJECT/*' -o -path './_*/*' -o -path './*/_PROJECT/*' -o -path './*/_*/*' -o -path './release/*' -o -path './*/release/*' -o -path './source/*' -o -path './*/source/*' -o -path './node_modules/*' -o -path './*/node_modules/*' -o -path './.git/*' -o -path './*/.git/*' -o -path './.codegraph/*' -o -path './*/.codegraph/*' -o -path './.codex/*' -o -path './*/.codex/*' -o -path './.claude/*' -o -path './*/.claude/*' -o -path './.agents/*' -o -path './*/.agents/*' -o -path './.gigacode/*' -o -path './*/.gigacode/*' -o -path './.qwen/*' -o -path './*/.qwen/*' -o -path './.vscode/*' -o -path './*/.vscode/*' -o -path './.idea/*' -o -path './*/.idea/*' \) -print -quit | grep -q .); then
    echo "Archive $domain contains internal paths" | tee -a "$LOG"
    exit 15
  fi

  rsync -a --delete "$unpack_dir"/ "$target"/
  find "$target" -type d -exec chmod 755 {} +
  find "$target" -type f -exec chmod 644 {} +

  file_count="$(find "$target" -type f | wc -l | tr -d ' ')"
  size="$(du -sh "$target" | awk '{print $1}')"
  echo "deployed $domain files=$file_count size=$size backup=$backup_path" | tee -a "$LOG"
done < "$MANIFEST"

echo "DEPLOY OK" | tee -a "$LOG"
'@
$remoteScript = $remoteScript -replace "`r`n", "`n"
[System.IO.File]::WriteAllText($remoteScriptPath, ($remoteScript.TrimEnd("`n") + "`n"), [System.Text.UTF8Encoding]::new($false))
$remoteScriptBytes = [System.IO.File]::ReadAllBytes($remoteScriptPath)
if ($remoteScriptBytes -contains 13) { Fail "Generated deploy-remote.sh contains CR bytes" }

$summaryPath = New-UniqueDeployEvidencePath `
  -ProjectPath $projectPath `
  -Date $ReleaseDate `
  -Stamp $stamp `
  -SourceCommit $expectedCommit
$evidenceUtc = [DateTime]::UtcNow.ToString('yyyy-MM-ddTHH:mm:ss.fffZ', [System.Globalization.CultureInfo]::InvariantCulture)
Write-DeployEvidence `
  -Path $summaryPath `
  -Status 'PREPARED' `
  -Date $ReleaseDate `
  -Stamp $stamp `
  -EvidenceUtc $evidenceUtc `
  -SourceCommit $expectedCommit `
  -ReleaseSourceRef $releaseSourceRef `
  -CheckoutSourceRef $gitState.sourceRef `
  -RemoteDeployRoot $deployRoot `
  -Entries $entries `
  -RetainRemoteRoot ([bool]$KeepRemoteDeployRoot) `
  -PostDeployCheckSkipped ([bool]$SkipPostDeployCheck)
Write-Output "summary=$summaryPath"

if ($PrepareOnly) {
  Write-Output "DEPLOY PREPARE OK"
  Write-Output "manifest=$manifestPath"
  Write-Output "remoteScript=$remoteScriptPath"
  return
}

try {
  Write-Output "Deploy root: $deployRoot"
  Invoke-Checked -FilePath 'ssh' -Arguments @($SshAlias, "mkdir -p '$deployRoot/zips'")
  Invoke-Checked -FilePath 'scp' -Arguments @($manifestPath, "$SshAlias`:$deployRoot/manifest.tsv")
  Invoke-Checked -FilePath 'scp' -Arguments @($remoteScriptPath, "$SshAlias`:$deployRoot/deploy-remote.sh")
  Invoke-Checked -FilePath 'ssh' -Arguments @($SshAlias, "chmod 700 '$deployRoot/deploy-remote.sh'")

  foreach ($entry in $entries) {
    Invoke-Checked -FilePath 'scp' -Arguments @([string]$entry.archivePath, "$SshAlias`:$deployRoot/zips/$($entry.archiveName)")
  }

  Invoke-Checked -FilePath 'ssh' -Arguments @($SshAlias, "'$deployRoot/deploy-remote.sh' '$deployRoot' '$stamp' '$expectedCommit'")

  if (-not $SkipPostDeployCheck) {
    $hostingCheckPath = Join-Path $projectPath 'hosting-check.ps1'
    if (-not (Test-Path -LiteralPath $hostingCheckPath)) { Fail "Missing hosting check: $hostingCheckPath" }
    $powershellExecutable = Get-CurrentPowerShellExecutable
    Invoke-Checked -FilePath $powershellExecutable -Arguments @(
      '-NoProfile',
      '-ExecutionPolicy', 'Bypass',
      '-File', $hostingCheckPath,
      '-Root', $rootPath,
      '-ReleaseDate', $ReleaseDate
    )
  }

  if (-not $KeepRemoteDeployRoot) {
    $expectedPrefix = "$remoteHome/_deploy_pikov_"
    if (-not $deployRoot.StartsWith($expectedPrefix, [System.StringComparison]::Ordinal)) {
      Fail "Refusing to remove unexpected remote deploy root: $deployRoot"
    }
    Invoke-Checked -FilePath 'ssh' -Arguments @($SshAlias, "rm -rf -- '$deployRoot'")
    Write-Output "removedRemoteDeployRoot=$deployRoot"
  }

  Write-DeployEvidence `
    -Path $summaryPath `
    -Status 'DEPLOYED' `
    -Date $ReleaseDate `
    -Stamp $stamp `
    -EvidenceUtc $evidenceUtc `
    -SourceCommit $expectedCommit `
    -ReleaseSourceRef $releaseSourceRef `
    -CheckoutSourceRef $gitState.sourceRef `
    -RemoteDeployRoot $deployRoot `
    -Entries $entries `
    -RetainRemoteRoot ([bool]$KeepRemoteDeployRoot) `
    -PostDeployCheckSkipped ([bool]$SkipPostDeployCheck)
} catch {
  Write-DeployEvidence `
    -Path $summaryPath `
    -Status 'FAILED' `
    -Date $ReleaseDate `
    -Stamp $stamp `
    -EvidenceUtc $evidenceUtc `
    -SourceCommit $expectedCommit `
    -ReleaseSourceRef $releaseSourceRef `
    -CheckoutSourceRef $gitState.sourceRef `
    -RemoteDeployRoot $deployRoot `
    -Entries $entries `
    -RetainRemoteRoot $true `
    -PostDeployCheckSkipped ([bool]$SkipPostDeployCheck) `
    -FailureMessage $_.Exception.Message
  throw
}
Remove-OldLocalDeployDirs -ProjectPath $projectPath -Keep $KeepLocalDeployDirs
Write-Output "DEPLOY SCRIPT OK"
