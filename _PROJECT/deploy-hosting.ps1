param(
  [string]$Root = (Split-Path -Parent $PSScriptRoot),
  [string]$SshAlias = 'pikov-hosting',
  [string]$ReleaseDate = '2026-06-20'
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

$rootPath = (Resolve-Path -LiteralPath $Root).Path
$projectPath = Join-Path $rootPath '_PROJECT'
$releaseIndexPath = Join-Path $projectPath "RELEASE_INDEX_$ReleaseDate.json"
if (-not (Test-Path -LiteralPath $releaseIndexPath)) { Fail "Missing release index: $releaseIndexPath" }

$entries = @(Get-Content -LiteralPath $releaseIndexPath -Encoding UTF8 -Raw | ConvertFrom-Json | ForEach-Object { $_ })
if ($entries.Count -ne 24) { Fail "Expected 24 release entries, got $($entries.Count)" }

$remoteHome = (& ssh $SshAlias 'printf %s "$HOME"')
if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($remoteHome)) {
  Fail "Could not resolve remote HOME through SSH alias $SshAlias"
}
$remoteHome = $remoteHome.Trim().TrimEnd('/')

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

  if find "$unpack_dir" \( -path '*/_PROJECT/*' -o -path '*/_НА_УДАЛЕНИЕ_2026-06-20/*' -o -path '*/release/*' -o -path '*/source/*' -o -path '*/node_modules/*' -o -path '*/.git/*' -o -path '*/.codegraph/*' -o -path '*/.codex/*' -o -path '*/.agents/*' -o -path '*/.gigacode/*' \) -print -quit | grep -q .; then
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
[System.IO.File]::WriteAllText($remoteScriptPath, ($remoteScript + "`n"), [System.Text.Encoding]::ASCII)

Write-Output "Deploy root: $deployRoot"
Invoke-Checked -FilePath 'ssh' -Arguments @($SshAlias, "mkdir -p '$deployRoot/zips'")
Invoke-Checked -FilePath 'scp' -Arguments @($manifestPath, "$SshAlias`:$deployRoot/manifest.tsv")
Invoke-Checked -FilePath 'scp' -Arguments @($remoteScriptPath, "$SshAlias`:$deployRoot/deploy-remote.sh")
Invoke-Checked -FilePath 'ssh' -Arguments @($SshAlias, "chmod 700 '$deployRoot/deploy-remote.sh'")

foreach ($entry in $entries) {
  Invoke-Checked -FilePath 'scp' -Arguments @([string]$entry.archivePath, "$SshAlias`:$deployRoot/zips/$($entry.archiveName)")
}

Invoke-Checked -FilePath 'ssh' -Arguments @($SshAlias, "'$deployRoot/deploy-remote.sh' '$deployRoot' '$stamp'")

$summaryPath = Join-Path $projectPath "HOSTING_DEPLOY_$ReleaseDate.md"
$lines = @(
  "# Hosting deploy $ReleaseDate",
  '',
  "Deploy stamp: $stamp",
  "Remote deploy root: $deployRoot",
  "Targets: $($entries.Count)",
  '',
  "Backups are stored on the server under:",
  '',
  '```text',
  "$deployRoot/backups",
  '```',
  '',
  "Remote log:",
  '',
  '```text',
  "$deployRoot/deploy.log",
  '```'
)
$lines | Set-Content -LiteralPath $summaryPath -Encoding UTF8
Write-Output "DEPLOY SCRIPT OK"
Write-Output "summary=$summaryPath"
