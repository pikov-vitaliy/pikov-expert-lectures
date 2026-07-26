# ---------------------------------------------------------------------------
# Собирает materials.zip — раздаточный комплект лекции для слушателя.
#
# Запускать после ЛЮБОЙ правки index.html, конспекта, заданий или кода,
# иначе архив разойдётся с сайтом.
#
#     powershell -NoProfile -ExecutionPolicy Bypass -File .\_teacher\build-materials-zip.ps1
#
# В архив попадает только то, что предназначено слушателю. Каталог _teacher
# (план занятия, материалы преподавателя, эталоны и ключи) не включается
# никогда — список файлов задаётся явно, а не «всё кроме».
# ---------------------------------------------------------------------------

$ErrorActionPreference = 'Stop'

$lectureRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$stage = Join-Path $env:TEMP ("materials-stage-" + [guid]::NewGuid().ToString('N'))
$archive = Join-Path $lectureRoot 'materials.zip'

New-Item -ItemType Directory -Path $stage -Force | Out-Null

# --- явный список того, что уезжает слушателю ------------------------------
Copy-Item -LiteralPath (Join-Path $lectureRoot 'index.html') -Destination (Join-Path $stage 'index.html') -Force
Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'ЧИТАТЬ-ПЕРВЫМ.md') -Destination (Join-Path $stage 'ЧИТАТЬ-ПЕРВЫМ.md') -Force
Copy-Item -LiteralPath (Join-Path $lectureRoot 'materials') -Destination (Join-Path $stage 'materials') -Recurse -Force
Copy-Item -LiteralPath (Join-Path $lectureRoot 'code') -Destination (Join-Path $stage 'code') -Recurse -Force

# служебное, что могло осесть в code/ при прогонах
foreach ($junk in '__pycache__', '.pytest_cache', '.ruff_cache', 'export') {
  Get-ChildItem -LiteralPath (Join-Path $stage 'code') -Directory -Recurse -Force -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -eq $junk } |
    ForEach-Object { Remove-Item -LiteralPath $_.FullName -Recurse -Force }
}

# --- страховка: преподавательских файлов в архиве быть не должно ------------
$leak = @(
  Get-ChildItem -LiteralPath $stage -Recurse -File -Force |
    Where-Object { $_.FullName -match '_teacher|Эталон|Материалы преподавател|План занятия|ИНСТРУКЦИЯ' }
)
if ($leak.Count -gt 0) {
  Remove-Item -LiteralPath $stage -Recurse -Force
  throw "В архив попали преподавательские файлы: $($leak.Name -join ', ')"
}

if (Test-Path -LiteralPath $archive) { Remove-Item -LiteralPath $archive -Force }
Get-ChildItem -LiteralPath $stage -Force | Compress-Archive -DestinationPath $archive -Force
Remove-Item -LiteralPath $stage -Recurse -Force

$size = (Get-Item -LiteralPath $archive).Length
Write-Output "MATERIALS ZIP OK"
Write-Output ("archive=" + $archive)
Write-Output ("size={0:N0} KB" -f ($size / 1KB))

Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [System.IO.Compression.ZipFile]::OpenRead($archive)
Write-Output ("entries=" + $zip.Entries.Count)
$zip.Dispose()
