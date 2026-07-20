param(
  [string]$Root = (Split-Path -Parent $PSScriptRoot),
  [string]$SshAlias = 'pikov-hosting',
  [string]$ReleaseDate = '',
  [int]$KeepLocalDeployDirs = 3,
  [string[]]$OnlyDomains = @(),
  [switch]$KeepRemoteDeployRoot,
  [switch]$SkipPostDeployCheck,
  [switch]$PrepareOnly
)

$ErrorActionPreference = 'Stop'

function Fail([string]$Message) {
  throw "DEPLOY FAIL: $Message"
}

function Invoke-Checked([string]$FilePath, [string[]]$Arguments) {
  $display = $FilePath + ' ' + ($Arguments -join ' ')
  Write-Output "RUN $display"
  & $FilePath @Arguments
  if ($LASTEXITCODE -ne 0) {
    Fail "Command failed: $display"
  }
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
if ($SkipPostDeployCheck -and -not $KeepRemoteDeployRoot) {
  Fail 'SkipPostDeployCheck requires KeepRemoteDeployRoot so rollback data is not removed without verification'
}

$releaseIndexPath = Join-Path $projectPath "RELEASE_INDEX_$ReleaseDate.json"
if (-not (Test-Path -LiteralPath $releaseIndexPath)) { Fail "Missing release index: $releaseIndexPath" }

$entries = @(Get-Content -LiteralPath $releaseIndexPath -Encoding UTF8 -Raw | ConvertFrom-Json | ForEach-Object { $_ })
$expectedEntries = @($lectureData.lectures | Select-Object -ExpandProperty folder -Unique).Count + 1
if ($entries.Count -ne $expectedEntries) { Fail "Expected $expectedEntries release entries, got $($entries.Count)" }
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

$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$deployRoot = "$remoteHome/_deploy_pikov_$stamp"
$localDeployDir = Join-Path $projectPath ".hosting-deploy-$stamp"
New-Item -ItemType Directory -Path $localDeployDir -Force | Out-Null

$manifestPath = Join-Path $localDeployDir 'manifest.tsv'
$manifestLines = foreach ($entry in $entries) {
  if (-not (Test-Path -LiteralPath $entry.archivePath)) {
    Fail "Missing archive: $($entry.archivePath)"
  }
  $actual = (Get-FileHash -LiteralPath $entry.archivePath -Algorithm SHA256).Hash.ToLowerInvariant()
  if ($actual -ne $entry.archiveSha256) {
    Fail "Local SHA256 mismatch for $($entry.domain)"
  }
  "$($entry.domain)`t$($entry.archiveName)`t$($entry.archiveSha256)"
}
[System.IO.File]::WriteAllText($manifestPath, (($manifestLines -join "`n") + "`n"), [System.Text.Encoding]::ASCII)

$remoteScriptPath = Join-Path $localDeployDir 'deploy-remote.sh'
$remoteScript = @'
#!/usr/bin/env bash
set -euo pipefail

DEPLOY_ROOT="$1"
STAMP="$2"
MANIFEST="$DEPLOY_ROOT/manifest.tsv"
LOG="$DEPLOY_ROOT/deploy.log"

mkdir -p "$DEPLOY_ROOT/backups" "$DEPLOY_ROOT/unpacked" "$DEPLOY_ROOT/logs"
: > "$LOG"

if ! command -v python3 >/dev/null 2>&1; then
  echo "python3 is required to extract ZIP archives with UTF-8 names" | tee -a "$LOG"
  exit 9
fi

while IFS=$'\t' read -r domain archive sha256; do
  domain="${domain%$'\r'}"
  archive="${archive%$'\r'}"
  sha256="${sha256%$'\r'}"
  [ -n "$domain" ] || continue
  target="$HOME/$domain/www"
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

  tar -C "$HOME/$domain" -czf "$backup_path" www
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

if ($PrepareOnly) {
  Write-Output "DEPLOY PREPARE OK"
  Write-Output "manifest=$manifestPath"
  Write-Output "remoteScript=$remoteScriptPath"
  return
}

Write-Output "Deploy root: $deployRoot"
Invoke-Checked -FilePath 'ssh' -Arguments @($SshAlias, "mkdir -p '$deployRoot/zips'")
Invoke-Checked -FilePath 'scp' -Arguments @($manifestPath, "$SshAlias`:$deployRoot/manifest.tsv")
Invoke-Checked -FilePath 'scp' -Arguments @($remoteScriptPath, "$SshAlias`:$deployRoot/deploy-remote.sh")
Invoke-Checked -FilePath 'ssh' -Arguments @($SshAlias, "chmod 700 '$deployRoot/deploy-remote.sh'")

foreach ($entry in $entries) {
  Invoke-Checked -FilePath 'scp' -Arguments @([string]$entry.archivePath, "$SshAlias`:$deployRoot/zips/$($entry.archiveName)")
}

Invoke-Checked -FilePath 'ssh' -Arguments @($SshAlias, "'$deployRoot/deploy-remote.sh' '$deployRoot' '$stamp'")

if (-not $SkipPostDeployCheck) {
  $hostingCheckPath = Join-Path $projectPath 'hosting-check.ps1'
  if (-not (Test-Path -LiteralPath $hostingCheckPath)) { Fail "Missing hosting check: $hostingCheckPath" }
  & $hostingCheckPath -Root $rootPath -ReleaseDate $ReleaseDate
}

if (-not $KeepRemoteDeployRoot) {
  $expectedPrefix = "$remoteHome/_deploy_pikov_"
  if (-not $deployRoot.StartsWith($expectedPrefix, [System.StringComparison]::Ordinal)) {
    Fail "Refusing to remove unexpected remote deploy root: $deployRoot"
  }
  Invoke-Checked -FilePath 'ssh' -Arguments @($SshAlias, "rm -rf -- '$deployRoot'")
  Write-Output "removedRemoteDeployRoot=$deployRoot"
}

$summaryPath = Join-Path $projectPath "HOSTING_DEPLOY_$ReleaseDate.md"
$lines = @(
  "# Hosting deploy $ReleaseDate",
  '',
  "Deploy stamp: $stamp",
  "Remote deploy root: $deployRoot",
  "Targets: $($entries.Count)",
  '',
  $(if ($KeepRemoteDeployRoot) { "Remote deploy root retained (including temporary backups and log): $deployRoot" } else { "Remote deploy root removed after successful deployment and hosting check." })
)
$lines | Set-Content -LiteralPath $summaryPath -Encoding UTF8
Remove-OldLocalDeployDirs -ProjectPath $projectPath -Keep $KeepLocalDeployDirs
Write-Output "DEPLOY SCRIPT OK"
Write-Output "summary=$summaryPath"
