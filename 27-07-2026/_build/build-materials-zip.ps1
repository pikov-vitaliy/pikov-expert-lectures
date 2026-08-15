# ---------------------------------------------------------------------------
# Собирает materials.zip - раздаточный комплект лекции для слушателя.
#
# Запускать после ЛЮБОЙ правки index.html, конспекта, заданий или кода,
# иначе архив разойдётся с сайтом.
#
#     powershell -NoProfile -ExecutionPolicy Bypass -File .\27-07-2026\_build\build-materials-zip.ps1
#
# Принцип: архив собирается по ЛИТЕРАЛЬНОМУ СПИСКУ файлов, а не «скопировать
# каталог и вычистить лишнее». Рекурсивное копирование опасно тем, что молча
# затягивает всё новое: .env, ключ, базу, журнал, вложенный .git. Список ниже
# задан явно, и любое расхождение с ним останавливает сборку.
# ---------------------------------------------------------------------------

$ErrorActionPreference = 'Stop'

function Fail([string]$Message) { throw "MATERIALS ZIP FAIL: $Message" }

$lectureRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$archive = Join-Path $lectureRoot 'materials.zip'
$archiveHelper = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..\_PROJECT\deterministic-archive.ps1'))
if (-not (Test-Path -LiteralPath $archiveHelper -PathType Leaf)) {
    Fail "Нет общего модуля воспроизводимой сборки: $archiveHelper"
}
. $archiveHelper

# --- Точный состав раздаточного комплекта ----------------------------------
# Ключ - путь внутри архива, значение - путь относительно каталога лекции.
# Все перечисленные файлы предназначены слушателю и лежат в публикуемых
# каталогах. Преподавательских путей здесь нет: проверка ниже это подтверждает.
$manifest = [ordered]@{
    'ЧИТАТЬ-ПЕРВЫМ.md'            = 'materials\ЧИТАТЬ-ПЕРВЫМ.md'
    'index.html'                  = 'index.html'
    'materials\from-working-code-to-shippable-product.html' = 'materials\from-working-code-to-shippable-product.html'
    'materials\konspekt.md'       = 'materials\konspekt.md'
    'materials\praktikum.md'      = 'materials\praktikum.md'
    'code\spravka.md'             = 'code\spravka.md'
    'code\step1_list.py'          = 'code\step1_list.py'
    'code\step2_class.py'         = 'code\step2_class.py'
    'code\step3_defect.py'        = 'code\step3_defect.py'
    'code\step3_student.py'       = 'code\step3_student.py'
    'code\step3_fixed.py'         = 'code\step3_fixed.py'
    'code\test_journal.py'        = 'code\test_journal.py'
    'code\test_student.py'        = 'code\test_student.py'
    'code\requirements-dev.txt'   = 'code\requirements-dev.txt'
    'code\.gitignore'             = 'code\.gitignore'
    'code\.gitlab-ci.yml'         = 'code\.gitlab-ci.yml'
    'code\languages\copy_name.asm'  = 'code\languages\copy_name.asm'
    'code\languages\CopyName.pas'   = 'code\languages\CopyName.pas'
    'code\languages\CopyName.cs'    = 'code\languages\CopyName.cs'
    'code\languages\copy_name.py'   = 'code\languages\copy_name.py'
}

# --- Проверка 1: каждый файл списка существует и это обычный файл ----------
foreach ($entry in $manifest.GetEnumerator()) {
    $source = Join-Path $lectureRoot $entry.Value
    if (-not (Test-Path -LiteralPath $source -PathType Leaf)) {
        Fail "Нет файла из списка: $($entry.Value)"
    }
    $item = Get-Item -LiteralPath $source -Force
    if ($item.Attributes -band [System.IO.FileAttributes]::ReparsePoint) {
        Fail "Файл является ссылкой (reparse point), это запрещено: $($entry.Value)"
    }
}

# --- Проверка 2: в каталогах лекции не появилось ничего неучтённого --------
# Если кто-то положит в code/ или materials/ новый файл, сборка остановится,
# и его придётся осознанно внести в список либо убрать. Именно это и нужно:
# случайный .env или база не уедут слушателю молча.
$ignorableDirs = @('__pycache__', '.pytest_cache', '.ruff_cache', '.mypy_cache', 'export', '.venv', 'venv', '.git')

# Типы, которые политика репозитория и так держит вне публикации
# («High-risk distributables pending explicit redistribution review» в
# .gitignore). Попасть в архив они не могут ни при каких условиях, поэтому
# сборку из-за них не роняем — но и молчать нельзя: о каждом таком файле
# сообщаем, чтобы он не остался незамеченным в каталоге лекции.
$policyExcludedExtensions = @('.pdf', '.pptx', '.docx', '.xlsx', '.eps', '.zip')
$generatedReadFirstHtml = ((1095, 1080, 1090, 1072, 1090, 1100, 45, 1087, 1077, 1088, 1074, 1099, 1084 | ForEach-Object { [char]$_ }) -join '') + '.html'
$ignoredGeneratedFiles = @("materials\$generatedReadFirstHtml")

$declared = @($manifest.Values | ForEach-Object { $_.ToLowerInvariant() })
$skipped = New-Object System.Collections.Generic.List[string]

foreach ($scanDir in @('code', 'materials')) {
    $base = Join-Path $lectureRoot $scanDir
    if (-not (Test-Path -LiteralPath $base)) { Fail "Нет каталога $scanDir" }
    Get-ChildItem -LiteralPath $base -Recurse -File -Force | ForEach-Object {
        $relative = $_.FullName.Substring($lectureRoot.Length + 1)
        $parts = $relative.Split('\')
        if ($parts | Where-Object { $ignorableDirs -contains $_ }) { return }
        if ($declared -contains $relative.ToLowerInvariant()) { return }
        if ($ignoredGeneratedFiles -contains $relative.ToLowerInvariant()) {
            $skipped.Add($relative)
            return
        }
        if ($policyExcludedExtensions -contains $_.Extension.ToLowerInvariant()) {
            $skipped.Add($relative)
            return
        }
        Fail "Неучтённый файл: $relative. Внесите его в `$manifest или уберите из каталога лекции."
    }
}

foreach ($name in $skipped) {
    Write-Warning "В каталоге лекции лежит нераспространяемый файл, в архив он НЕ включён: $name"
}
# --- Проверка 3: явный запрет на секреты и служебные файлы -----------------
$forbidden = @('.env', '.env.local', 'id_rsa', 'id_ed25519', 'secrets.json', 'journal.db')
foreach ($name in $manifest.Keys) {
    $leaf = Split-Path -Leaf $name
    if ($forbidden -contains $leaf.ToLowerInvariant()) { Fail "Запрещённый файл в списке: $name" }
    if ($leaf -match '\.(key|pem|p12|pfx|db|sqlite3?|log)$') { Fail "Запрещённое расширение: $name" }
    if ($name -match '(^|\\)_teacher(\\|$)') { Fail "Преподавательский путь в архиве: $name" }
}

# --- Сборка ----------------------------------------------------------------
$stage = Join-Path $env:TEMP ('materials-stage-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $stage -Force | Out-Null
try {
    foreach ($entry in $manifest.GetEnumerator()) {
        $dest = Join-Path $stage $entry.Key
        $parent = Split-Path -Parent $dest
        if (-not (Test-Path -LiteralPath $parent)) { New-Item -ItemType Directory -Path $parent -Force | Out-Null }
        Copy-Item -LiteralPath (Join-Path $lectureRoot $entry.Value) -Destination $dest -Force
    }

    $staged = @(Get-ChildItem -LiteralPath $stage -Recurse -File -Force)
    if ($staged.Count -ne $manifest.Count) {
        Fail "В стейджинге $($staged.Count) файлов вместо $($manifest.Count)"
    }

    New-DeterministicArchive -SourceRoot $stage -Destination $archive
} finally {
    Remove-Item -LiteralPath $stage -Recurse -Force -ErrorAction SilentlyContinue
}

# --- Проверка 4: контроль готового архива ----------------------------------
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [System.IO.Compression.ZipFile]::OpenRead($archive)
try {
    $names = @($zip.Entries | ForEach-Object { $_.FullName.Replace('\', '/') })
    $expectedNames = @($manifest.Keys | ForEach-Object { $_.Replace('\', '/') })
    if ($names.Count -ne $manifest.Count) { Fail "В архиве $($names.Count) записей вместо $($manifest.Count)" }
    foreach ($expected in $expectedNames) {
        if ($names -notcontains $expected) { Fail "В архиве нет файла: $expected" }
    }
    foreach ($actual in $names) {
        if ($expectedNames -notcontains $actual) { Fail "В архиве лишний файл: $actual" }
    }
} finally {
    $zip.Dispose()
}

# --- Манифест с контрольными суммами ---------------------------------------
$sha = (Get-DeterministicFileSha256 -Path $archive).ToLowerInvariant()
$manifestPath = Join-Path $PSScriptRoot 'materials-zip-manifest.txt'
$lines = New-Object System.Collections.Generic.List[string]
$lines.Add("materials.zip")
$lines.Add("sha256 = $sha")
$lines.Add("size   = $((Get-Item -LiteralPath $archive).Length) bytes")
$lines.Add("files  = $($manifest.Count)")
$lines.Add('')
foreach ($entry in $manifest.GetEnumerator()) {
    $record = Get-DeterministicArchiveFileRecord `
        -Path (Join-Path $lectureRoot $entry.Value) `
        -ArchivePath $entry.Key
    $lines.Add("$($record.sha256.ToLowerInvariant())  $($entry.Key)")
}
Write-DeterministicUtf8Text -Path $manifestPath -Text ($lines -join "`n") -TrailingNewline

Write-Output "MATERIALS ZIP OK"
Write-Output "archive=$archive"
Write-Output ("size={0:N0} KB" -f ((Get-Item -LiteralPath $archive).Length / 1KB))
Write-Output "entries=$($manifest.Count)"
Write-Output "sha256=$sha"
Write-Output "manifest=$manifestPath"
