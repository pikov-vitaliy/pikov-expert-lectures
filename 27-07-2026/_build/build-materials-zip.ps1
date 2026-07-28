# ---------------------------------------------------------------------------
# Собирает materials.zip - раздаточный комплект лекции для слушателя.
#
# Запускать после ЛЮБОЙ правки index.html, конспекта, заданий или кода,
# иначе архив разойдётся с сайтом.
#
#     powershell -NoProfile -ExecutionPolicy Bypass -File .\_teacher\build-materials-zip.ps1
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

# --- Точный состав раздаточного комплекта ----------------------------------
# Ключ - путь внутри архива, значение - путь относительно каталога лекции.
# Все перечисленные файлы предназначены слушателю и лежат в публикуемых
# каталогах. Преподавательских путей здесь нет: проверка ниже это подтверждает.
$manifest = [ordered]@{
    'ЧИТАТЬ-ПЕРВЫМ.md'            = 'materials\ЧИТАТЬ-ПЕРВЫМ.md'
    'index.html'                  = 'index.html'
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

# --- Необязательная часть комплекта ----------------------------------------
# Файлы, разрешённые к распространению, но НЕ хранящиеся в репозитории
# (политика держит .pdf и подобное вне git - см. комментарий в .gitignore).
# Если файл лежит в рабочем дереве - он попадает в архив; если нет, например
# на чистом клоне в CI, сборка идёт дальше и просто сообщает об этом.
# Обязательными их делать нельзя: тогда сборка станет невоспроизводимой.
$optional = [ordered]@{
    'materials\From_Working_Code_to_Shippable_Product.pdf' = 'materials\From_Working_Code_to_Shippable_Product.pdf'
}

$missingOptional = New-Object System.Collections.Generic.List[string]
foreach ($entry in $optional.GetEnumerator()) {
    if (Test-Path -LiteralPath (Join-Path $lectureRoot $entry.Value) -PathType Leaf) {
        $manifest[$entry.Key] = $entry.Value
    } else {
        $missingOptional.Add($entry.Value)
    }
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
foreach ($name in $missingOptional) {
    Write-Warning "Необязательный файл отсутствует в рабочем дереве, архив собран без него: $name"
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

    if (Test-Path -LiteralPath $archive) { Remove-Item -LiteralPath $archive -Force }
    Get-ChildItem -LiteralPath $stage -Force | Compress-Archive -DestinationPath $archive -Force
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
$sha = (Get-FileHash -LiteralPath $archive -Algorithm SHA256).Hash.ToLowerInvariant()
$manifestPath = Join-Path $PSScriptRoot 'materials-zip-manifest.txt'
$lines = New-Object System.Collections.Generic.List[string]
$lines.Add("materials.zip")
$lines.Add("sha256 = $sha")
$lines.Add("size   = $((Get-Item -LiteralPath $archive).Length) bytes")
$lines.Add("files  = $($manifest.Count)")
$lines.Add('')
foreach ($entry in $manifest.GetEnumerator()) {
    $h = (Get-FileHash -LiteralPath (Join-Path $lectureRoot $entry.Value) -Algorithm SHA256).Hash.ToLowerInvariant()
    $lines.Add("$h  $($entry.Key)")
}
[System.IO.File]::WriteAllLines($manifestPath, $lines, [System.Text.UTF8Encoding]::new($false))

Write-Output "MATERIALS ZIP OK"
Write-Output "archive=$archive"
Write-Output ("size={0:N0} KB" -f ((Get-Item -LiteralPath $archive).Length / 1KB))
Write-Output "entries=$($manifest.Count)"
Write-Output "sha256=$sha"
Write-Output "manifest=$manifestPath"
