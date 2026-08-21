param(
  [string]$Root = (Split-Path -Parent $PSScriptRoot)
)

$ErrorActionPreference = 'Stop'

function Fail([string]$Message) {
  throw "CONTROL FILES FAIL: $Message"
}

function Assert-SafeLectureFolder([string]$RootPath, [string]$Folder) {
  if ([string]::IsNullOrWhiteSpace($Folder) -or
      [System.IO.Path]::IsPathRooted($Folder) -or
      $Folder -notmatch '^[A-Za-z0-9][A-Za-z0-9._-]*$' -or
      $Folder.Contains('/') -or
      $Folder.Contains('\') -or
      $Folder -in @('.', '..') -or
      $Folder.ToLowerInvariant() -in @('release', 'source', 'tools', 'output', 'notes', 'tests', 'test-results', 'node_modules') -or
      $Folder.IndexOfAny([System.IO.Path]::GetInvalidFileNameChars()) -ge 0) {
    Fail "Unsafe lecture folder in lectures.json: $Folder"
  }
  $rootFull = [System.IO.Path]::GetFullPath($RootPath).TrimEnd('\')
  $folderPath = [System.IO.Path]::GetFullPath((Join-Path $RootPath $Folder)).TrimEnd('\')
  if (-not $folderPath.StartsWith($rootFull + '\', [System.StringComparison]::OrdinalIgnoreCase)) {
    Fail "Unsafe lecture folder outside repository: $Folder"
  }
  if (-not (Test-Path -LiteralPath $folderPath -PathType Container)) {
    Fail "Missing folder: $Folder"
  }
  $item = Get-Item -LiteralPath $folderPath -Force
  if (($item.Attributes -band [System.IO.FileAttributes]::ReparsePoint) -ne 0) {
    Fail "Unsafe lecture folder is a reparse point: $Folder"
  }
}

function Assert-SafeLectureDomain([string]$Domain) {
  if ([string]::IsNullOrWhiteSpace($Domain) -or
      $Domain.Length -gt 63 -or
      $Domain -notmatch '^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$') {
    Fail "Unsafe lecture domain in lectures.json: $Domain"
  }
}

function Write-Utf8File([string]$Path, [string[]]$Lines) {
  $parent = Split-Path -Parent $Path
  if (-not (Test-Path -LiteralPath $parent)) {
    [void](New-Item -ItemType Directory -Path $parent -Force)
  }

  $content = [string]::Join([Environment]::NewLine, $Lines)
  if ($Lines.Count -gt 0) { $content += [Environment]::NewLine }

  if (Test-Path -LiteralPath $Path) {
    $existing = [System.IO.File]::ReadAllText($Path, [System.Text.Encoding]::UTF8)
    $existingNormalized = (($existing -replace "`r`n", "`n") -replace "`r", "`n").TrimEnd([char[]]"`n")
    $contentNormalized = (($content -replace "`r`n", "`n") -replace "`r", "`n").TrimEnd([char[]]"`n")
    if ($existingNormalized -ceq $contentNormalized) { return }
  }

  [System.IO.File]::WriteAllText($Path, $content, [System.Text.UTF8Encoding]::new($false))
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
  $generatedReadFirstHtml = ((1095, 1080, 1090, 1072, 1090, 1100, 45, 1087, 1077, 1088, 1074, 1099, 1084 | ForEach-Object { [char]$_ }) -join '') + '.html'
  if ($normalized -match '(^|/)(release|source|tools|output|notes|tests|test-results|node_modules)(/|$)') { return $true }
  if ($normalized -match '(^|/)(_PROJECT|_[^/]*|\.git|\.codegraph|\.codex|\.claude|\.agents|\.gigacode|\.qwen|\.vscode|\.idea)(/|$)') { return $true }
  if ($normalized -match '(^|/)index-v[0-9].*\.html$') { return $true }
  if ($normalized -match '(^|/)indexOLD.*\.html$') { return $true }
  if ([System.IO.Path]::GetFileName($normalized) -ieq $generatedReadFirstHtml) { return $true }
  return $false
}

function New-HtaccessLines([switch]$SpdxExtensionlessHtml, [switch]$RootLocaleRedirect) {
  $lines = [System.Collections.ArrayList]@(
    '# pikov.expert static lecture site rules',
    '# Keep text and Markdown files readable as UTF-8 in browsers.',
    '',
    'DirectoryIndex index.html',
    'AddDefaultCharset UTF-8',
    '',
    '# HTTPS redirect is handled by the hosting layer. Duplicating it here can',
    '# create self-redirect loops when Apache runs behind a TLS terminator.',
    '',
    '<IfModule mod_headers.c>',
    '  Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains"',
    '  Header always set X-Content-Type-Options "nosniff"',
    '  Header always set X-Frame-Options "DENY"',
    '  Header always set Referrer-Policy "strict-origin-when-cross-origin"',
    '  Header always set Permissions-Policy "accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()"',
    '  Header always set Content-Security-Policy "default-src ''self''; base-uri ''self''; object-src ''none''; frame-ancestors ''none''; img-src ''self'' data: https://mc.yandex.ru https://*.mc.yandex.ru https://mc.yandex.com https://*.mc.yandex.com https://spdx.org; script-src ''self'' ''unsafe-inline'' https://mc.yandex.ru; style-src ''self'' ''unsafe-inline'' https://fonts.googleapis.com; font-src ''self'' data: https://fonts.gstatic.com; connect-src ''self'' https://mc.yandex.ru https://*.mc.yandex.ru https://mc.yandex.com https://*.mc.yandex.com wss://mc.yandex.com wss://*.mc.yandex.com; form-action ''self''; upgrade-insecure-requests"',
    '</IfModule>',
    '',
    '<IfModule mod_headers.c>',
    '<FilesMatch "\.(md|markdown|csv|txt|log|ttl|json|jsonld)$">',
    '  Header set X-Robots-Tag "noindex, noarchive"',
    '</FilesMatch>',
    '</IfModule>',
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

  if ($RootLocaleRedirect) {
    $index = $lines.IndexOf('<IfModule mod_headers.c>')
    if ($index -lt 0) {
      throw 'Root locale redirect insertion marker is missing from the common template'
    }
    [void]$lines.InsertRange($index, [object[]]@(
      '# Legacy Russian locale URL: use the crawlable static /ru/ document.',
      '<IfModule mod_rewrite.c>',
      '  RewriteEngine On',
      '  RewriteCond %{REQUEST_URI} ^/$',
      '  RewriteCond %{QUERY_STRING} ^lang=ru$ [NC]',
      '  RewriteRule ^$ /ru/? [R=302,L]',
      '</IfModule>',
      ''
    ))
  }

  if ($SpdxExtensionlessHtml) {
    $index = $lines.IndexOf('<Files ".htaccess">')
    if ($index -lt 0) {
      throw 'SPDX .htaccess marker is missing from the common template'
    }
    [void]$lines.InsertRange($index, [object[]]@(
      '# SPDX publishes each XHTML page both as <id> and <id>.html. Apache cannot',
      '# infer a MIME type for names such as 0BSD or Apache-2.0, while nosniff is set.',
      '# Known non-HTML formats are excluded; smoke-check verifies every remaining',
      '# matched file has a paired .html page.',
      '<FilesMatch "(?i)^(?!\.)(?!^(?:LICENSE|NOTICE)$)(?!.*\.(?:css|html?|ico|js|json|jsonld|md|ttl|txt|xml|zip|orig|py)$).+$">',
      '  ForceType text/html',
      '</FilesMatch>',
      ''
    ))
  }

  [string[]]$lines
}

function New-RobotsLines([string]$SitemapUrl) {
  @(
    'User-agent: *',
    'Allow: /',
    'Disallow: /release/',
    'Disallow: /source/',
    'Disallow: /tools/',
    'Disallow: /output/',
    'Disallow: /notes/',
    'Disallow: /tests/',
    'Disallow: /test-results/',
    'Disallow: /node_modules/',
    'Disallow: /materials_from_4days/',
    'Disallow: /_*/',
    '',
    "Sitemap: $SitemapUrl"
  )
}

function Get-SitemapEntries([string]$Path) {
  if (-not (Test-Path -LiteralPath $Path)) { return @() }

  $document = [System.Xml.XmlDocument]::new()
  $document.XmlResolver = $null
  try {
    $document.Load($Path)
  } catch {
    Fail "Invalid sitemap XML at $Path`: $($_.Exception.Message)"
  }

  $entries = New-Object System.Collections.Generic.List[object]
  foreach ($node in @($document.SelectNodes('/*[local-name()="urlset"]/*[local-name()="url"]'))) {
    $locNode = $node.SelectSingleNode('./*[local-name()="loc"]')
    $lastModNode = $node.SelectSingleNode('./*[local-name()="lastmod"]')
    $url = if ($null -eq $locNode) { '' } else { $locNode.InnerText.Trim() }
    $entryLastMod = if ($null -eq $lastModNode) { '' } else { $lastModNode.InnerText.Trim() }
    if ([string]::IsNullOrWhiteSpace($url)) { Fail "Missing sitemap loc in $Path" }
    if ($entryLastMod -notmatch '^\d{4}-\d{2}-\d{2}$') { Fail "Invalid sitemap lastmod for $url in $Path" }
    $entries.Add([pscustomobject]@{ Url = $url; LastMod = $entryLastMod })
  }
  foreach ($entry in $entries) { $entry }
}

function New-SitemapLines([string[]]$Urls, [string]$DefaultLastMod, [object]$LastModsByUrl) {
  $lines = New-Object System.Collections.Generic.List[string]
  $lines.Add('<?xml version="1.0" encoding="UTF-8"?>')
  $lines.Add('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">')
  foreach ($url in $Urls) {
    $escaped = [System.Security.SecurityElement]::Escape($url)
    $entryLastMod = if ($null -ne $LastModsByUrl -and $LastModsByUrl.ContainsKey($url)) { $LastModsByUrl[$url] } else { $DefaultLastMod }
    $lines.Add('  <url>')
    $lines.Add("    <loc>$escaped</loc>")
    $lines.Add("    <lastmod>$entryLastMod</lastmod>")
    $lines.Add('  </url>')
  }
  $lines.Add('</urlset>')
  @($lines)
}

function Write-SitemapFile([string]$Path, [string[]]$Urls, [string]$DefaultLastMod) {
  $desiredByUrl = [System.Collections.Generic.Dictionary[string,string]]::new([System.StringComparer]::OrdinalIgnoreCase)
  foreach ($url in $Urls) {
    if (-not $desiredByUrl.ContainsKey($url)) { $desiredByUrl.Add($url, $url) }
  }

  $existingEntries = @(Get-SitemapEntries -Path $Path)
  $existingByUrl = [System.Collections.Generic.Dictionary[string,object]]::new([System.StringComparer]::OrdinalIgnoreCase)
  foreach ($entry in $existingEntries) {
    if (-not $existingByUrl.ContainsKey($entry.Url)) { $existingByUrl.Add($entry.Url, $entry) }
  }

  $sameUrlSet = $existingEntries.Count -eq $desiredByUrl.Count
  if ($sameUrlSet) {
    foreach ($url in $desiredByUrl.Keys) {
      if (-not $existingByUrl.ContainsKey($url)) {
        $sameUrlSet = $false
        break
      }
    }
  }
  $sameLastMod = $existingEntries.Count -gt 0
  foreach ($entry in $existingEntries) {
    if ($entry.LastMod -ne $DefaultLastMod) {
      $sameLastMod = $false
      break
    }
  }
  if ($sameUrlSet -and $sameLastMod) { return }

  $orderedUrls = New-Object System.Collections.Generic.List[string]
  $lastModsByUrl = [System.Collections.Generic.Dictionary[string,string]]::new([System.StringComparer]::OrdinalIgnoreCase)
  foreach ($entry in $existingEntries) {
    if ($desiredByUrl.ContainsKey($entry.Url) -and -not $lastModsByUrl.ContainsKey($entry.Url)) {
      $canonicalUrl = $desiredByUrl[$entry.Url]
      $orderedUrls.Add($canonicalUrl)
      $lastModsByUrl.Add($canonicalUrl, $DefaultLastMod)
    }
  }
  foreach ($url in $Urls) {
    if (-not $lastModsByUrl.ContainsKey($url)) {
      $orderedUrls.Add($url)
      $lastModsByUrl.Add($url, $DefaultLastMod)
    }
  }

  Write-Utf8File -Path $Path -Lines (New-SitemapLines -Urls @($orderedUrls) -DefaultLastMod $DefaultLastMod -LastModsByUrl $lastModsByUrl)
}

$rootPath = (Resolve-Path -LiteralPath $Root).Path
$projectPath = Join-Path $rootPath '_PROJECT'
$lecturesPath = Join-Path $projectPath 'lectures.json'
if (-not (Test-Path -LiteralPath $lecturesPath)) { Fail "Missing _PROJECT\lectures.json" }

$data = Get-Content -LiteralPath $lecturesPath -Encoding UTF8 -Raw | ConvertFrom-Json
$lastMod = [string]$data.updated
if ($lastMod -notmatch '^\d{4}-\d{2}-\d{2}$') { Fail "Invalid lectures.json updated date: $lastMod" }
$uniqueFolders = @($data.lectures | Select-Object -ExpandProperty folder -Unique)
foreach ($lectureEntry in @($data.lectures)) {
  Assert-SafeLectureDomain -Domain ([string]$lectureEntry.domain)
}
foreach ($folder in $uniqueFolders) {
  Assert-SafeLectureFolder -RootPath $rootPath -Folder ([string]$folder)
}

$rootUrls = New-Object System.Collections.Generic.List[string]
Add-UniqueUrl -List $rootUrls -Url 'https://pikov.expert/'
Add-UniqueUrl -List $rootUrls -Url 'https://pikov.expert/ru/'
Add-UniqueUrl -List $rootUrls -Url 'https://pikov.expert/course-map.html'
foreach ($lecture in @($data.lectures | Sort-Object position)) {
  Add-UniqueUrl -List $rootUrls -Url ([string]$lecture.url)
}

Write-Utf8File -Path (Join-Path $rootPath '.htaccess') -Lines (New-HtaccessLines -RootLocaleRedirect)
Write-Utf8File -Path (Join-Path $rootPath 'robots.txt') -Lines (New-RobotsLines -SitemapUrl 'https://pikov.expert/sitemap.xml')
Write-SitemapFile -Path (Join-Path $rootPath 'sitemap.xml') -Urls @($rootUrls) -DefaultLastMod $lastMod

# Folders whose .htaccess is domain-specific and must NOT be overwritten by the
# common template. The 27001 deck unpacks its runtime into blob: URLs and needs
# 'unsafe-eval' plus blob: in script-src; the shared policy drops both and the
# slide navigation stops working. robots.txt and sitemap.xml are still generated.
$customHtaccessFolders = @('27001', '29-07-2026')

# Some sites intentionally curate all three controls. Scanner-VS publishes
# selected Markdown materials in its sitemap, serves offline ZIP archives,
# blocks those downloads in robots.txt, and adds ZIP-specific response headers.
$customControlFolders = @('scaner-vs')

foreach ($folder in $uniqueFolders) {
  $folderPath = Join-Path $rootPath $folder
  if (-not (Test-Path -LiteralPath $folderPath)) { Fail "Missing folder: $folder" }
  $lecture = @($data.lectures | Where-Object { $_.folder -eq $folder } | Sort-Object position)[0]
  $domain = "$($lecture.domain).pikov.expert"
  $baseUrl = "https://$domain/"

  if ($folder -eq 'spdx') {
    Write-Utf8File -Path (Join-Path $folderPath '.htaccess') -Lines (New-HtaccessLines -SpdxExtensionlessHtml)
    Write-Utf8File -Path (Join-Path $folderPath 'robots.txt') -Lines (New-RobotsLines -SitemapUrl ($baseUrl + 'sitemap.xml'))
    Write-Output "controlExternalFolder=$folder"
    continue
  }

  if ($customControlFolders -contains $folder) {
    foreach ($controlName in @('.htaccess', 'robots.txt', 'sitemap.xml')) {
      if (-not (Test-Path -LiteralPath (Join-Path $folderPath $controlName))) {
        Fail "Folder $folder is marked as having custom controls, but $controlName is missing"
      }
    }
    Write-Output "controlCustomFiles=$folder"
    continue
  }

  $urls = New-Object System.Collections.Generic.List[string]
  foreach ($entry in @($data.lectures | Where-Object { $_.folder -eq $folder } | Sort-Object position)) {
    Add-UniqueUrl -List $urls -Url ([string]$entry.url)
  }

  Get-ChildItem -LiteralPath $folderPath -Recurse -File -Force |
    Where-Object { $_.Extension.ToLowerInvariant() -in @('.html', '.htm') } |
    Sort-Object FullName |
    ForEach-Object {
      $relative = Get-RelativePathSafe -BasePath $folderPath -Path $_.FullName
      if (-not (Should-SkipSitemapPath $relative)) {
        Add-UniqueUrl -List $urls -Url (HtmlPathToUrl -RelativePath $relative -BaseUrl $baseUrl)
      }
    }

  if ($customHtaccessFolders -contains $folder) {
    if (-not (Test-Path -LiteralPath (Join-Path $folderPath '.htaccess'))) {
      Fail "Folder $folder is marked as having a custom .htaccess, but the file is missing"
    }
    Write-Output "controlCustomHtaccess=$folder"
  } else {
    Write-Utf8File -Path (Join-Path $folderPath '.htaccess') -Lines (New-HtaccessLines)
  }
  Write-Utf8File -Path (Join-Path $folderPath 'robots.txt') -Lines (New-RobotsLines -SitemapUrl ($baseUrl + 'sitemap.xml'))
  Write-SitemapFile -Path (Join-Path $folderPath 'sitemap.xml') -Urls @($urls) -DefaultLastMod $lastMod
}

Write-Output "CONTROL FILES OK"
Write-Output "rootUrls=$($rootUrls.Count)"
Write-Output "domainFolders=$($uniqueFolders.Count)"
