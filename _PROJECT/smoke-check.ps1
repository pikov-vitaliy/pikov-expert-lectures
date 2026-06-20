param(
  [string]$Root = (Split-Path -Parent $PSScriptRoot)
)

$ErrorActionPreference = 'Stop'

function Fail([string]$Message) {
  throw "SMOKE FAIL: $Message"
}

$rootPath = (Resolve-Path -LiteralPath $Root).Path
$projectPath = Join-Path $rootPath '_PROJECT'
$lecturesPath = Join-Path $projectPath 'lectures.json'
$indexPath = Join-Path $rootPath 'index.html'
$sitemapPath = Join-Path $rootPath 'sitemap.xml'
$robotsPath = Join-Path $rootPath 'robots.txt'

if (-not (Test-Path -LiteralPath $lecturesPath)) { Fail "Missing _PROJECT\lectures.json" }
if (-not (Test-Path -LiteralPath $indexPath)) { Fail "Missing root index.html" }
if (-not (Test-Path -LiteralPath $sitemapPath)) { Fail "Missing root sitemap.xml" }
if (-not (Test-Path -LiteralPath $robotsPath)) { Fail "Missing root robots.txt" }

$data = Get-Content -LiteralPath $lecturesPath -Encoding UTF8 -Raw | ConvertFrom-Json
$lectures = @($data.lectures)

if ($lectures.Count -ne [int]$data.summary.cards) {
  Fail "lectures.json count $($lectures.Count) != summary.cards $($data.summary.cards)"
}

$duplicatePositions = $lectures | Group-Object position | Where-Object Count -gt 1
if ($duplicatePositions) {
  Fail "Duplicate lecture positions: $($duplicatePositions.Name -join ', ')"
}

$expectedPositions = 1..$lectures.Count
$actualPositions = @($lectures | Sort-Object position | ForEach-Object { [int]$_.position })
for ($i = 0; $i -lt $expectedPositions.Count; $i++) {
  if ($actualPositions[$i] -ne $expectedPositions[$i]) {
    Fail "Position sequence mismatch at index ${i}: got $($actualPositions[$i]), expected $($expectedPositions[$i])"
  }
}

$domainFolders = @($lectures | Select-Object -ExpandProperty folder -Unique)
foreach ($folder in $domainFolders) {
  $folderPath = Join-Path $rootPath $folder
  $folderIndex = Join-Path $folderPath 'index.html'
  if (-not (Test-Path -LiteralPath $folderPath)) { Fail "Missing folder $folder" }
  if (-not (Test-Path -LiteralPath $folderIndex)) { Fail "Missing $folder\index.html" }
}

$actualRootDirObjects = @(Get-ChildItem -LiteralPath $rootPath -Directory -Force)
$quarantineDirs = @(
  $actualRootDirObjects |
    Where-Object { $_.Name -like '_*2026-06-20' } |
    Select-Object -ExpandProperty Name
)
if ($quarantineDirs.Count -ne 1) {
  if ($quarantineDirs.Count -gt 1) {
    Fail "Expected at most one quarantine directory, got $($quarantineDirs.Count)"
  }
}
$allowedRootDirs = @('.git', '.github', '_PROJECT', 'release') + $quarantineDirs + $domainFolders
$unexpectedRootDirs = @(
  $actualRootDirObjects |
    Where-Object { $allowedRootDirs -notcontains $_.Name } |
    Select-Object -ExpandProperty Name
)
if ($unexpectedRootDirs.Count -gt 0) {
  Fail "Unexpected root directories: $($unexpectedRootDirs -join ', ')"
}

$readyLocal = @($lectures | Where-Object status -eq 'ready-local').Count
$publishedSnapshot = @($lectures | Where-Object status -eq 'published-snapshot').Count
if ($readyLocal -ne [int]$data.summary.readyLocal) {
  Fail "ready-local count $readyLocal != summary.readyLocal $($data.summary.readyLocal)"
}
if ($publishedSnapshot -ne [int]$data.summary.publishedSnapshot) {
  Fail "published-snapshot count $publishedSnapshot != summary.publishedSnapshot $($data.summary.publishedSnapshot)"
}

$html = Get-Content -LiteralPath $indexPath -Encoding UTF8 -Raw
$cardUrls = [regex]::Matches($html, '<a class="card" href="([^"]+)"') | ForEach-Object { $_.Groups[1].Value }
if (@($cardUrls).Count -ne $lectures.Count) {
  Fail "Root card count $(@($cardUrls).Count) != lectures count $($lectures.Count)"
}

foreach ($lecture in $lectures) {
  if ($cardUrls -notcontains $lecture.url.TrimEnd('/')) {
    $withoutSlash = $lecture.url.TrimEnd('/')
    if ($cardUrls -notcontains $withoutSlash) {
      Fail "Root card missing URL $($lecture.url)"
    }
  }
}

$jsonMatch = [regex]::Match($html, '(?s)<script type="application/ld\+json">(.*?)</script>')
if (-not $jsonMatch.Success) { Fail "Missing JSON-LD block" }
$jsonld = $jsonMatch.Groups[1].Value | ConvertFrom-Json
$itemList = @($jsonld.'@graph' | Where-Object { $_.'@type' -eq 'ItemList' })[0]
if (-not $itemList) { Fail "Missing ItemList in JSON-LD" }
if ([int]$itemList.numberOfItems -ne $lectures.Count) {
  Fail "JSON-LD numberOfItems $($itemList.numberOfItems) != lectures count $($lectures.Count)"
}
$jsonItems = @($itemList.itemListElement)
if ($jsonItems.Count -ne $lectures.Count) {
  Fail "JSON-LD item count $($jsonItems.Count) != lectures count $($lectures.Count)"
}
$jsonPositions = @($jsonItems | Sort-Object position | ForEach-Object { [int]$_.position })
for ($i = 0; $i -lt $expectedPositions.Count; $i++) {
  if ($jsonPositions[$i] -ne $expectedPositions[$i]) {
    Fail "JSON-LD position sequence mismatch at index $i"
  }
}
if (-not ($jsonItems | Where-Object { $_.item.url -eq 'https://spdx.pikov.expert/' })) {
  Fail "JSON-LD does not include spdx.pikov.expert"
}

[xml]$sitemap = Get-Content -LiteralPath $sitemapPath -Encoding UTF8 -Raw
$ns = New-Object System.Xml.XmlNamespaceManager($sitemap.NameTable)
$ns.AddNamespace('sm', 'http://www.sitemaps.org/schemas/sitemap/0.9')
$sitemapUrls = @($sitemap.SelectNodes('//sm:url/sm:loc', $ns) | ForEach-Object { $_.'#text' })
$expectedSitemapUrls = New-Object System.Collections.Generic.HashSet[string]
[void]$expectedSitemapUrls.Add('https://pikov.expert/')
foreach ($lecture in $lectures) {
  $loc = [string]$lecture.url
  if ($loc.Contains('#')) { $loc = $loc.Split('#')[0] }
  [void]$expectedSitemapUrls.Add($loc)
}
foreach ($loc in $expectedSitemapUrls) {
  if ($sitemapUrls -notcontains $loc) { Fail "Sitemap missing $loc" }
}

$robots = Get-Content -LiteralPath $robotsPath -Encoding UTF8 -Raw
if ($robots -notmatch 'Sitemap:\s+https://pikov\.expert/sitemap\.xml') {
  Fail "robots.txt does not include canonical sitemap"
}
if ($robots -match 'komrad-build|2026-06-20|_PROJECT') {
  Fail "robots.txt includes an internal or obsolete path"
}

$rbpoFolders = @('tz', 'fstec-sdlc', 'kapo', 'sast', 'p19', 'ppk')
foreach ($folder in $rbpoFolders) {
  $lecture = @($lectures | Where-Object { $_.folder -eq $folder })[0]
  if (-not $lecture) { Fail "Missing $folder in lectures.json" }

  $lectureHtmlPath = Join-Path (Join-Path $rootPath $folder) 'index.html'
  $lectureHtml = Get-Content -LiteralPath $lectureHtmlPath -Encoding UTF8 -Raw
  if ($lectureHtml -notmatch '<meta\s+name="description"') { Fail "$folder missing meta description" }
  if ($lectureHtml -notmatch '<meta\s+name="author"') { Fail "$folder missing meta author" }
  if ($lectureHtml -notmatch '<link\s+rel="canonical"\s+href="([^"]+)"') { Fail "$folder missing canonical" }
  if ($Matches[1] -ne $lecture.url) { Fail "$folder canonical $($Matches[1]) != $($lecture.url)" }
  if ($lectureHtml -notmatch 'property="og:url"\s+content="([^"]+)"') { Fail "$folder missing og:url" }
  if ($Matches[1] -ne $lecture.url) { Fail "$folder og:url $($Matches[1]) != $($lecture.url)" }
  if ($lectureHtml -notmatch 'property="og:image"\s+content="https://pikov\.expert/photo\.jpg"') {
    Fail "$folder missing canonical og:image"
  }
}

Write-Output "SMOKE OK"
Write-Output "lectures=$($lectures.Count)"
Write-Output "domainFolders=$($domainFolders.Count)"
Write-Output "readyLocal=$readyLocal"
Write-Output "publishedSnapshot=$publishedSnapshot"
Write-Output "sitemapUrls=$($sitemapUrls.Count)"
