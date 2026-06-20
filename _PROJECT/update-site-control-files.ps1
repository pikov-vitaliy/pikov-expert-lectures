param(
  [string]$Root = (Split-Path -Parent $PSScriptRoot)
)

$ErrorActionPreference = 'Stop'

function Fail([string]$Message) {
  throw "CONTROL FILES FAIL: $Message"
}

function Write-AsciiFile([string]$Path, [string[]]$Lines) {
  $parent = Split-Path -Parent $Path
  if (-not (Test-Path -LiteralPath $parent)) {
    [void](New-Item -ItemType Directory -Path $parent -Force)
  }
  $Lines | Set-Content -LiteralPath $Path -Encoding ASCII
}

function HtmlPathToUrl([string]$RelativePath, [string]$BaseUrl) {
  $urlPath = $RelativePath.Replace('\', '/')
  if ($urlPath -ieq 'index.html' -or $urlPath -ieq 'index.htm') {
    return $BaseUrl
  }
  return ($BaseUrl.TrimEnd('/') + '/' + $urlPath)
}

function Add-UniqueUrl([System.Collections.Generic.List[string]]$List, [string]$Url) {
  if ([string]::IsNullOrWhiteSpace($Url)) { return }
  $clean = $Url.Trim()
  if ($clean.Contains('#')) { $clean = $clean.Split('#')[0] }
  if ($List -notcontains $clean) { $List.Add($clean) }
}

function Get-RelativePathSafe([string]$BasePath, [string]$Path) {
  $base = (Resolve-Path -LiteralPath $BasePath).Path.TrimEnd('\') + '\'
  $target = (Resolve-Path -LiteralPath $Path).Path
  $baseUri = [Uri]::new($base)
  $targetUri = [Uri]::new($target)
  [Uri]::UnescapeDataString($baseUri.MakeRelativeUri($targetUri).ToString()).Replace('/', '\')
}

function Should-SkipSitemapPath([string]$RelativePath) {
  $normalized = $RelativePath.Replace('\', '/')
  if ($normalized -match '(^|/)(release|source|tools|output|notes|tests|test-results|node_modules)(/|$)') { return $true }
  if ($normalized -match '(^|/)(_PROJECT|_НА_УДАЛЕНИЕ_2026-06-20|\.git|\.codegraph|\.codex|\.agents|\.gigacode)(/|$)') { return $true }
  if ($normalized -match '(^|/)index-v[0-9].*\.html$') { return $true }
  if ($normalized -match '(^|/)indexOLD.*\.html$') { return $true }
  return $false
}

function New-HtaccessLines {
  @(
    '# pikov.expert static lecture site rules',
    '# Keep text and Markdown files readable as UTF-8 in browsers.',
    '',
    'DirectoryIndex index.html',
    'AddDefaultCharset UTF-8',
    '',
    'AddCharset UTF-8 .html .htm .css .js .mjs .json .jsonld .xml .svg .txt .md .markdown .csv .log .ttl',
    'AddType "text/markdown; charset=UTF-8" .md .markdown',
    'AddType "text/plain; charset=UTF-8" .txt .log',
    'AddType application/json .json',
    'AddType application/ld+json .jsonld',
    'AddType text/turtle .ttl',
    'AddType application/pdf .pdf',
    'AddType application/vnd.openxmlformats-officedocument.presentationml.presentation .pptx',
    'AddType application/vnd.openxmlformats-officedocument.wordprocessingml.document .docx',
    'AddType application/vnd.openxmlformats-officedocument.spreadsheetml.sheet .xlsx',
    'AddType image/svg+xml .svg',
    'AddType image/x-icon .ico',
    '',
    '<Files ".htaccess">',
    '  Require all denied',
    '</Files>'
  )
}

function New-RobotsLines([string]$SitemapUrl) {
  @(
    'User-agent: *',
    'Allow: /',
    '',
    "Sitemap: $SitemapUrl"
  )
}

function New-SitemapLines([string[]]$Urls, [string]$LastMod) {
  $lines = New-Object System.Collections.Generic.List[string]
  $lines.Add('<?xml version="1.0" encoding="UTF-8"?>')
  $lines.Add('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">')
  foreach ($url in $Urls) {
    $escaped = [System.Security.SecurityElement]::Escape($url)
    $lines.Add('  <url>')
    $lines.Add("    <loc>$escaped</loc>")
    $lines.Add("    <lastmod>$LastMod</lastmod>")
    $lines.Add('  </url>')
  }
  $lines.Add('</urlset>')
  @($lines)
}

$rootPath = (Resolve-Path -LiteralPath $Root).Path
$projectPath = Join-Path $rootPath '_PROJECT'
$lecturesPath = Join-Path $projectPath 'lectures.json'
if (-not (Test-Path -LiteralPath $lecturesPath)) { Fail "Missing _PROJECT\lectures.json" }

$data = Get-Content -LiteralPath $lecturesPath -Encoding UTF8 -Raw | ConvertFrom-Json
$lastMod = [string]$data.updated
if ($lastMod -notmatch '^\d{4}-\d{2}-\d{2}$') { Fail "Invalid lectures.json updated date: $lastMod" }

$rootUrls = New-Object System.Collections.Generic.List[string]
Add-UniqueUrl -List $rootUrls -Url 'https://pikov.expert/'
foreach ($lecture in @($data.lectures | Sort-Object position)) {
  Add-UniqueUrl -List $rootUrls -Url ([string]$lecture.url)
}

Write-AsciiFile -Path (Join-Path $rootPath '.htaccess') -Lines (New-HtaccessLines)
Write-AsciiFile -Path (Join-Path $rootPath 'robots.txt') -Lines (New-RobotsLines -SitemapUrl 'https://pikov.expert/sitemap.xml')
Write-AsciiFile -Path (Join-Path $rootPath 'sitemap.xml') -Lines (New-SitemapLines -Urls @($rootUrls) -LastMod $lastMod)

$uniqueFolders = @($data.lectures | Select-Object -ExpandProperty folder -Unique)
foreach ($folder in $uniqueFolders) {
  $folderPath = Join-Path $rootPath $folder
  if (-not (Test-Path -LiteralPath $folderPath)) { Fail "Missing folder: $folder" }
  $lecture = @($data.lectures | Where-Object { $_.folder -eq $folder } | Sort-Object position)[0]
  $domain = "$($lecture.domain).pikov.expert"
  $baseUrl = "https://$domain/"

  $urls = New-Object System.Collections.Generic.List[string]
  foreach ($entry in @($data.lectures | Where-Object { $_.folder -eq $folder } | Sort-Object position)) {
    Add-UniqueUrl -List $urls -Url ([string]$entry.url)
  }

  Get-ChildItem -LiteralPath $folderPath -Recurse -File -Force |
    Where-Object { $_.Extension.ToLowerInvariant() -in @('.html', '.htm') } |
    ForEach-Object {
      $relative = Get-RelativePathSafe -BasePath $folderPath -Path $_.FullName
      if (-not (Should-SkipSitemapPath $relative)) {
        Add-UniqueUrl -List $urls -Url (HtmlPathToUrl -RelativePath $relative -BaseUrl $baseUrl)
      }
    }

  Write-AsciiFile -Path (Join-Path $folderPath '.htaccess') -Lines (New-HtaccessLines)
  Write-AsciiFile -Path (Join-Path $folderPath 'robots.txt') -Lines (New-RobotsLines -SitemapUrl ($baseUrl + 'sitemap.xml'))
  Write-AsciiFile -Path (Join-Path $folderPath 'sitemap.xml') -Lines (New-SitemapLines -Urls @($urls) -LastMod $lastMod)
}

Write-Output "CONTROL FILES OK"
Write-Output "rootUrls=$($rootUrls.Count)"
Write-Output "domainFolders=$($uniqueFolders.Count)"
