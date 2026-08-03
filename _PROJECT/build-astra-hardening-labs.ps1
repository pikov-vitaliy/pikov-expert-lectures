[CmdletBinding()]
param(
  [switch]$Check
)

$ErrorActionPreference = 'Stop'

# Windows PowerShell 5.1 does not provide ConvertFrom-Markdown. Re-enter this
# script through PowerShell 7 when an older host runs the repository gates.
if (-not (Get-Command ConvertFrom-Markdown -ErrorAction SilentlyContinue)) {
  $pwsh = Get-Command pwsh.exe -ErrorAction SilentlyContinue
  if (-not $pwsh) {
    throw 'PowerShell 7 is required to generate Astra hardening laboratory pages.'
  }
  $forward = @()
  if ($Check) { $forward += '-Check' }
  & $pwsh.Source -NoProfile -ExecutionPolicy Bypass -File $PSCommandPath @forward
  if ($LASTEXITCODE -ne 0) {
    throw "PowerShell 7 laboratory page generator failed with exit code $LASTEXITCODE."
  }
  return
}

$siteRoot = Join-Path (Split-Path -Parent $PSScriptRoot) 'astra-hardening'
$labsRoot = Join-Path $siteRoot 'labs'
$utf8NoBom = [System.Text.UTF8Encoding]::new($false)

$labs = @(
  [pscustomobject]@{
    Source = '01-easy-password-policy.md'
    Output = '01-easy-password-policy.html'
    ShortTitle = 'Лабораторная 1 · Парольная политика'
    Description = 'Проверка PAM-стека, настройка парольной политики и безопасный откат в Astra Linux SE.'
  },
  [pscustomobject]@{
    Source = '02-medium-secure-ssh.md'
    Output = '02-medium-secure-ssh.html'
    ShortTitle = 'Лабораторная 2 · Безопасный SSH'
    Description = 'Настройка SSH по ключам с проверкой эффективной конфигурации и сохранением доступа.'
  },
  [pscustomobject]@{
    Source = '03-hard-apache-hardening.md'
    Output = '03-hard-apache-hardening.html'
    ShortTitle = 'Лабораторная 3 · Apache и TLS'
    Description = 'Усиление Apache, ограниченное решение по AstraMode и проверяемый TLS.'
  }
)

$failures = [System.Collections.Generic.List[string]]::new()

foreach ($lab in $labs) {
  $sourcePath = Join-Path $labsRoot $lab.Source
  $outputPath = Join-Path $labsRoot $lab.Output
  if (-not (Test-Path -LiteralPath $sourcePath)) {
    throw "Missing laboratory source: $sourcePath"
  }

  $markdown = [System.IO.File]::ReadAllText($sourcePath, [System.Text.Encoding]::UTF8)
  $body = (ConvertFrom-Markdown -InputObject $markdown).Html
  $document = @"
<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="$($lab.Description)">
  <link rel="canonical" href="https://astra-hardening.pikov.expert/labs/$($lab.Output)">
  <meta property="og:title" content="$($lab.ShortTitle) · Astra Linux SE">
  <meta property="og:description" content="$($lab.Description)">
  <meta property="og:type" content="article">
  <meta property="og:url" content="https://astra-hardening.pikov.expert/labs/$($lab.Output)">
  <meta property="og:image" content="https://pikov.expert/photo.jpg">
  <title>$($lab.ShortTitle) · Astra Linux SE</title>
  <link rel="stylesheet" href="labs.css">
</head>
<body>
  <header class="site-header">
    <div class="shell header-inner">
      <a class="back-link" href="index.html">← Ко всем работам</a>
      <span class="header-label">$($lab.ShortTitle)</span>
    </div>
  </header>

  <main class="shell document-page">
    <p class="document-meta">Практикум к лекции «Astra Linux Hardening» · редакция 03.08.2026</p>
    <article class="document">
$body
    </article>
    <nav class="document-nav" aria-label="Навигация по материалам">
      <a href="index.html">← Список лабораторных</a>
      <a href="$($lab.Source)" download>Скачать исходный Markdown</a>
      <a href="../index.html">К лекции</a>
    </nav>
  </main>

  <footer class="site-footer">
    <div class="shell">Учебный стенд · перед изменениями создайте снимок ВМ</div>
  </footer>
</body>
</html>
"@

  $document = $document.Replace("`r`n", "`n").TrimEnd() + "`n"

  if ($Check) {
    if (-not (Test-Path -LiteralPath $outputPath)) {
      $failures.Add("Missing generated page: $($lab.Output)")
      continue
    }
    $actual = [System.IO.File]::ReadAllText($outputPath, [System.Text.Encoding]::UTF8).Replace("`r`n", "`n")
    if ($actual -cne $document) {
      $failures.Add("Generated page is stale: $($lab.Output)")
    }
  }
  else {
    [System.IO.File]::WriteAllText($outputPath, $document, $utf8NoBom)
    Write-Host "Generated $($lab.Output)"
  }
}

if ($failures.Count -gt 0) {
  $failures | ForEach-Object { Write-Error $_ }
  exit 1
}

if ($Check) {
  Write-Host "All generated laboratory pages are current."
}
