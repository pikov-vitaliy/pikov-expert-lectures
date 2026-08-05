[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
$siteRoot = Join-Path $repoRoot 'scaner-vs'
$failures = [System.Collections.Generic.List[string]]::new()

function Add-Failure {
    param([Parameter(Mandatory)][string]$Message)
    $script:failures.Add($Message)
}

function Assert-File {
    param([Parameter(Mandatory)][string]$RelativePath)
    $fullPath = Join-Path $repoRoot $RelativePath
    if (-not (Test-Path -LiteralPath $fullPath -PathType Leaf)) {
        Add-Failure "Нет обязательного файла: $RelativePath"
        return $false
    }
    return $true
}

function Get-Utf8Text {
    param([Parameter(Mandatory)][string]$RelativePath)
    $fullPath = Join-Path $repoRoot $RelativePath
    if (-not (Test-Path -LiteralPath $fullPath -PathType Leaf)) {
        return ''
    }
    return Get-Content -LiteralPath $fullPath -Raw -Encoding UTF8
}

function Assert-Contains {
    param(
        [Parameter(Mandatory)][string]$RelativePath,
        [Parameter(Mandatory)][string[]]$Patterns
    )
    $text = Get-Utf8Text $RelativePath
    foreach ($pattern in $Patterns) {
        if ($text -notmatch $pattern) {
            Add-Failure "${RelativePath}: не найдено требование /$pattern/"
        }
    }
}

function Assert-NotContains {
    param(
        [Parameter(Mandatory)][string]$RelativePath,
        [Parameter(Mandatory)][string[]]$Patterns
    )
    $text = Get-Utf8Text $RelativePath
    foreach ($pattern in $Patterns) {
        if ($text -match $pattern) {
            Add-Failure "${RelativePath}: найдено запрещённое выражение /$pattern/"
        }
    }
}

$requiredFiles = @(
    'scaner-vs/index.html',
    'scaner-vs/scanner/index.html',
    'scaner-vs/inspector/index.html',
    'scaner-vs/assets/site.css',
    'scaner-vs/assets/site.js',
    'scaner-vs/assets/scanner-inspector-hero.png',
    'scaner-vs/materials/README.md',
    'scaner-vs/materials/CHECKSUMS.md',
    'scaner-vs/materials/scanner/01-common-workflow.md',
    'scaner-vs/materials/scanner/02-scanoval-local.md',
    'scaner-vs/materials/scanner/03-wsl-individual.md',
    'scaner-vs/materials/scanner/04-virtualbox-full-lab.md',
    'scaner-vs/materials/scanner/05-live-usb.md',
    'scaner-vs/materials/scanner/REPORT-TEMPLATE.md',
    'scaner-vs/materials/inspector/01-practicum.md',
    'scaner-vs/materials/inspector/REPORT-TEMPLATE.md',
    'scaner-vs/materials/downloads/scanner-labs-markdown.zip',
    'scaner-vs/materials/downloads/inspector-labs-markdown.zip',
    'scaner-vs/materials/downloads/all-labs-markdown.zip',
    '_PROJECT/scaner-vs-offline/scanner/index.html',
    '_PROJECT/scaner-vs-offline/inspector/index.html',
    '_PROJECT/scaner-vs-offline/all/index.html',
    '_PROJECT/scaner-vs-offline/all/README.md',
    '_PROJECT/build-scaner-vs-archives.ps1',
    'scaner-vs/.htaccess',
    'scaner-vs/robots.txt',
    'scaner-vs/sitemap.xml'
)

foreach ($file in $requiredFiles) {
    [void](Assert-File $file)
}

$htmlFiles = @(
    'scaner-vs/index.html',
    'scaner-vs/scanner/index.html',
    'scaner-vs/inspector/index.html'
)

foreach ($html in $htmlFiles) {
    Assert-Contains $html @(
        '<html\s+lang="ru"',
        '<meta\s+name="viewport"',
        '<link\s+rel="canonical"',
        'property="og:title"',
        'application/ld\+json',
        '109116119',
        'webvisor:false',
        'class="brand-back"',
        'только[^<]{0,120}(собственн|разрешённ|письменн|учебн)'
    )

    $text = Get-Utf8Text $html
    $h1Count = ([regex]::Matches($text, '<h1(?:\s|>)', 'IgnoreCase')).Count
    if ($h1Count -ne 1) {
        Add-Failure "${html}: ожидается ровно один h1, найдено $h1Count"
    }
}

Assert-Contains 'scaner-vs/assets/site.css' @(
    '(?s)\.hero-grid\s*\{[^}]*align-items:\s*center',
    '(?s)\.hero-copy\s*\{[^}]*padding-top:\s*0',
    '(?s)\.hero-figure img\s*\{[^}]*height:\s*auto'
)
Assert-NotContains 'scaner-vs/assets/site.css' @('\.hero-copy\s*\{\s*padding-top:\s*34px')

$heroHtmlFiles = $htmlFiles + @(
    '_PROJECT/scaner-vs-offline/scanner/index.html',
    '_PROJECT/scaner-vs-offline/inspector/index.html',
    '_PROJECT/scaner-vs-offline/all/index.html'
)
foreach ($html in $heroHtmlFiles) {
    Assert-Contains $html @('scanner-inspector-hero\.png"[^>]*width="1672"\s+height="941"')
    Assert-NotContains $html @('scanner-inspector-hero\.png"[^>]*height="(?:720|1024)"')
}

Assert-Contains 'scaner-vs/index.html' @(
    'два учебных дня',
    '90 минут',
    'четыре практических блока',
    'Сканер-ВС 7[^<]{0,120}компонент[^<]{0,80}Инспектор',
    'scaner-vs\.ru/#form',
    'демоверси[июя] Сканер-ВС 7 Base',
    'файл[^<]{0,20}лицензи',
    'materials/README\.md',
    'materials/downloads/all-labs-markdown\.zip',
    'офлайн[^<]{0,40}лендинг',
    'scanner/',
    'inspector/'
)

Assert-Contains 'scaner-vs/scanner/index.html' @(
    'CWE', 'CVE', 'CPE', 'CVSS\s*v?4\.0', 'KEV', 'EPSS',
    'ScanOVAL', 'winrm\.ps1', 'WinRM', 'SSH',
    'Исследовани[ея] сети', 'Инвентаризац', 'Поиск уязвимост',
    'парол', 'Аудит конфигурац', 'Best Practice',
    'WSL', 'VirtualBox', 'Metasploitable', 'Live USB',
    'scaner-vs\.ru/#form',
    'демоверси[июя] Сканер-ВС 7 Base',
    'файл[^<]{0,20}лицензи',
    '../materials/scanner/01-common-workflow\.md',
    '../materials/downloads/scanner-labs-markdown\.zip',
    'историческ[^<]{0,80}снимок',
    'docs\.etecs\.ru/scanner/docs/',
    'scaner-vs\.ru',
    'bdu\.fstec\.ru/scanoval'
)

Assert-NotContains 'scaner-vs/scanner/index.html' @(
    '\bKEF\b', '\bScanVAL\b',
    'два\s+независим\w*\s+продукт',
    'автоматическ\w*\s+(интеграц|обмен)'
)

Assert-Contains 'scaner-vs/inspector/index.html' @(
    'остаточн', 'контрольн[^<]{0,40}сумм', 'системн[^<]{0,20}аудит',
    'прав[^<]{0,20}доступ', 'сравнен[^<]{0,20}отч',
    'синтетическ[^<]{0,40}данн',
    'не[^<]{0,60}аттестац',
    'верси[ия][^<]{0,80}(операцион|ядр|файлов)',
    '../materials/inspector/01-practicum\.md',
    '../materials/downloads/inspector-labs-markdown\.zip'
)

Assert-Contains 'scaner-vs/sitemap.xml' @(
    'https://scaner-vs\.pikov\.expert/',
    'https://scaner-vs\.pikov\.expert/scanner/',
    'https://scaner-vs\.pikov\.expert/inspector/'
)

if (Test-Path -LiteralPath $siteRoot) {
    $forbidden = Get-ChildItem -LiteralPath $siteRoot -Recurse -File -ErrorAction SilentlyContinue |
        Where-Object { $_.Extension -match '^\.(pdf|docx|xlsx|pptx|ps1|exe|msi|ova|iso|lic|7z|rar)$' }
    foreach ($file in $forbidden) {
        Add-Failure "В публичный каталог попал сторонний/тяжёлый материал: $($file.FullName)"
    }

    Add-Type -AssemblyName System.IO.Compression.FileSystem
    $requiredArchiveEntries = @{
        'scanner-labs-markdown.zip' = @(
            'index.html',
            'assets/site.css',
            'assets/site.js',
            'assets/scanner-inspector-hero.png',
            'materials/scanner/01-common-workflow.md',
            'materials/scanner/02-scanoval-local.md',
            'materials/scanner/03-wsl-individual.md',
            'materials/scanner/04-virtualbox-full-lab.md',
            'materials/scanner/05-live-usb.md',
            'materials/scanner/REPORT-TEMPLATE.md'
        )
        'inspector-labs-markdown.zip' = @(
            'index.html',
            'assets/site.css',
            'assets/site.js',
            'assets/scanner-inspector-hero.png',
            'materials/inspector/01-practicum.md',
            'materials/inspector/REPORT-TEMPLATE.md'
        )
        'all-labs-markdown.zip' = @(
            'index.html',
            'assets/site.css',
            'assets/site.js',
            'assets/scanner-inspector-hero.png',
            'materials/README.md',
            'materials/scanner/01-common-workflow.md',
            'materials/inspector/01-practicum.md'
        )
    }
    $allowedArchiveExtensions = @('.md', '.html', '.css', '.js', '.png')
    $archives = Get-ChildItem -LiteralPath (Join-Path $siteRoot 'materials\downloads') -Filter '*.zip' -File -ErrorAction SilentlyContinue
    foreach ($archive in $archives) {
        $zip = [System.IO.Compression.ZipFile]::OpenRead($archive.FullName)
        try {
            $entryNames = @($zip.Entries | ForEach-Object { $_.FullName.Replace('\', '/') })
            foreach ($requiredEntry in $requiredArchiveEntries[$archive.Name]) {
                if ($entryNames -notcontains $requiredEntry) {
                    Add-Failure "В архиве $($archive.Name) нет обязательного файла: $requiredEntry"
                }
            }
            foreach ($entry in $zip.Entries) {
                if ($entry.FullName -match '(^|/)\.\.(/|$)' -or $entry.FullName.StartsWith('/')) {
                    Add-Failure "Небезопасный путь в архиве $($archive.Name): $($entry.FullName)"
                }
                if ($entry.Name -and $allowedArchiveExtensions -notcontains ([IO.Path]::GetExtension($entry.Name).ToLowerInvariant())) {
                    Add-Failure "В архиве $($archive.Name) найден файл недопустимого типа: $($entry.FullName)"
                }
            }
            foreach ($entry in $zip.Entries | Where-Object { [IO.Path]::GetExtension($_.Name) -eq '.md' }) {
                $reader = [IO.StreamReader]::new($entry.Open(), [Text.Encoding]::UTF8)
                try {
                    $markdownText = $reader.ReadToEnd()
                }
                finally {
                    $reader.Dispose()
                }
                $baseUri = [Uri]('https://offline.invalid/' + $entry.FullName.Replace('\', '/'))
                foreach ($match in [regex]::Matches($markdownText, '\[[^\]]+\]\(([^)]+)\)')) {
                    $target = $match.Groups[1].Value.Trim()
                    if ($target -match '^(?:https?://|mailto:|tel:|#)') {
                        continue
                    }
                    $resolvedTarget = [Uri]::UnescapeDataString(([Uri]::new($baseUri, $target)).AbsolutePath.TrimStart('/'))
                    if ($entryNames -notcontains $resolvedTarget) {
                        Add-Failure "Неразрешимая Markdown-ссылка в $($archive.Name): $($entry.FullName) -> $target"
                    }
                }
            }
            $offlineIndex = $zip.GetEntry('index.html')
            if ($null -ne $offlineIndex) {
                $reader = [IO.StreamReader]::new($offlineIndex.Open(), [Text.Encoding]::UTF8)
                try {
                    $offlineHtml = $reader.ReadToEnd()
                }
                finally {
                    $reader.Dispose()
                }
                foreach ($pattern in @('Офлайн-комплект', 'href="assets/site\.css"', 'src="assets/site\.js"', 'src="assets/scanner-inspector-hero\.png"')) {
                    if ($offlineHtml -notmatch $pattern) {
                        Add-Failure "Офлайн-лендинг в $($archive.Name) не содержит: $pattern"
                    }
                }
                if ($offlineHtml -match '(?:href|src)="/') {
                    Add-Failure "Офлайн-лендинг в $($archive.Name) содержит абсолютный локальный путь"
                }
            }
        }
        finally {
            $zip.Dispose()
        }
    }

    $checksumsPath = Join-Path $siteRoot 'materials\CHECKSUMS.md'
    if (Test-Path -LiteralPath $checksumsPath -PathType Leaf) {
        $checksumsText = Get-Content -LiteralPath $checksumsPath -Raw -Encoding UTF8
        foreach ($archive in $archives) {
            $actualHash = (Get-FileHash -LiteralPath $archive.FullName -Algorithm SHA256).Hash
            if ($checksumsText -notmatch ('(?im)^' + [regex]::Escape($actualHash) + '\s+' + [regex]::Escape($archive.Name) + '$')) {
                Add-Failure "CHECKSUMS.md не содержит актуальный SHA-256 для $($archive.Name)"
            }
        }
    }
}

if ($failures.Count -gt 0) {
    Write-Host "FAIL: портал Сканер-ВС не прошёл контрактные проверки ($($failures.Count))." -ForegroundColor Red
    $failures | ForEach-Object { Write-Host " - $_" -ForegroundColor Red }
    exit 1
}

Write-Host 'PASS: структура, термины, безопасность и метаданные портала Сканер-ВС проверены.' -ForegroundColor Green
