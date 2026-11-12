Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# Архивы курса «Искусственный интеллект для инженеров»: по одному на день и весь курс.
# Источник – полные папки дней в kamaz-ai/_src (в git, в релиз не попадают),
# архивы – kamaz-ai/downloads (игнорируются git, разрешены в build-release.ps1).
# Используется общий детерминированный writer сайта: байты архива не зависят от mtime и EOL.

$siteRoot = Split-Path -Parent $PSScriptRoot
$srcRoot = Join-Path $siteRoot '_src'
$downloadsRoot = Join-Path $siteRoot 'downloads'
$archiveHelper = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..\_PROJECT\deterministic-archive.ps1'))

if (-not (Test-Path -LiteralPath $srcRoot -PathType Container)) { throw "Course source directory not found: $srcRoot" }
if (-not (Test-Path -LiteralPath $archiveHelper -PathType Leaf)) { throw "Deterministic archive helper not found: $archiveHelper" }
. $archiveHelper

$readme = Join-Path $srcRoot 'README.md'
if (-not (Test-Path -LiteralPath $readme -PathType Leaf)) { throw "Missing $readme" }
$days = @(Get-ChildItem -LiteralPath $srcRoot -Directory | Where-Object { $_.Name -match '^\S+-0[1-5]-2026-11-\d\d$' } | Sort-Object Name)
if ($days.Count -ne 5) { throw "Expected 5 day folders in $srcRoot, found $($days.Count)" }
New-Item -ItemType Directory -Path $downloadsRoot -Force | Out-Null

function New-CourseArchive {
  param([Parameter(Mandatory = $true)][string]$Destination, [Parameter(Mandatory = $true)][System.IO.DirectoryInfo[]]$Folders)
  Remove-Item -LiteralPath $Destination -Force -ErrorAction SilentlyContinue
  $staging = Join-Path ([System.IO.Path]::GetTempPath()) ('kamaz-ai-zip-' + [System.Guid]::NewGuid().ToString('N'))
  New-Item -ItemType Directory -Path $staging -Force | Out-Null
  try {
    Copy-Item -LiteralPath $readme -Destination $staging -Force
    foreach ($f in $Folders) { Copy-Item -LiteralPath $f.FullName -Destination $staging -Recurse -Force }
    # Текстовые файлы канонизируются в UTF-8/LF, двоичные (PDF, DOCX, PNG) пишутся как есть
    New-DeterministicArchive -SourceRoot $staging -Destination $Destination
  }
  finally { Remove-Item -LiteralPath $staging -Recurse -Force -ErrorAction SilentlyContinue }
}

for ($i = 0; $i -lt $days.Count; $i++) {
  $n = $i + 1
  New-CourseArchive -Destination (Join-Path $downloadsRoot ("kamaz-ai-day-0{0}.zip" -f $n)) -Folders @($days[$i])
}
New-CourseArchive -Destination (Join-Path $downloadsRoot 'kamaz-ai-course.zip') -Folders $days

# Рабочая тетрадь итогового проекта: Word для заполнения и PDF для просмотра – отдельным архивом
# рядом с программой курса. Файлы берутся из самостоятельной работы первого дня.
# Код без кириллицы: скрипт запускается в Windows PowerShell 5.1, файл без BOM.
$workbookDirs = @(Get-ChildItem -LiteralPath $days[0].FullName -Directory | Where-Object { $_.Name -like '05-*' })
if ($workbookDirs.Count -ne 1) { throw "Expected one homework folder 05-* in $($days[0].FullName), found $($workbookDirs.Count)" }
$workbookDir = $workbookDirs[0].FullName
$workbookFiles = @(Get-ChildItem -LiteralPath $workbookDir -File | Where-Object { $_.Extension -in @('.docx', '.pdf') } | Sort-Object Name)
if ($workbookFiles.Count -ne 2) { throw "Expected workbook DOCX and PDF in $workbookDir, found $($workbookFiles.Count)" }
$workbookZip = Join-Path $downloadsRoot 'kamaz-ai-workbook.zip'
Remove-Item -LiteralPath $workbookZip -Force -ErrorAction SilentlyContinue
$staging = Join-Path ([System.IO.Path]::GetTempPath()) ('kamaz-ai-workbook-' + [System.Guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $staging -Force | Out-Null
try {
  foreach ($f in $workbookFiles) { Copy-Item -LiteralPath $f.FullName -Destination $staging -Force }
  New-DeterministicArchive -SourceRoot $staging -Destination $workbookZip
}
finally { Remove-Item -LiteralPath $staging -Recurse -Force -ErrorAction SilentlyContinue }
Write-Output 'KAMAZ-AI MATERIALS ZIP OK'
