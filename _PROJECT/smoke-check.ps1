param(
  [string]$Root = (Split-Path -Parent $PSScriptRoot),
  [switch]$P19Only
)

$ErrorActionPreference = 'Stop'

function Fail([string]$Message) {
  throw "SMOKE FAIL: $Message"
}

function Decode-Utf8Base64([string]$Value) {
  [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String($Value))
}

function Get-ExpectedIndexUrl($Lecture) {
  $expectedIndexUrl = ([string]$Lecture.url).Split('#')[0]
  if ($expectedIndexUrl.EndsWith('.html')) {
    $expectedIndexUrl = "https://$($Lecture.domain).pikov.expert/"
  }
  return $expectedIndexUrl
}

function Assert-PublicHtmlMetadata([string]$Html, [string]$Label, [string]$ExpectedUrl, [bool]$RequireBrandBack) {
  if ($Html -notmatch '(?s)<html\b[^>]*\blang="ru"') { Fail "$Label missing lang=`"ru`"" }
  if ($Html -notmatch '<meta\s+name="viewport"\s+content="[^"]*width=device-width') { Fail "$Label missing responsive viewport" }
  if ($Html -match '<meta\s+name="viewport"\s+content="width=1920"') { Fail "$Label has fixed 1920px viewport" }
  if ($Html -notmatch '109116119|mc\.yandex\.ru/metrika') { Fail "$Label missing Yandex Metrika" }
  if ($Html -notmatch 'webvisor:false') { Fail "$Label must keep Yandex Webvisor disabled" }
  foreach ($property in @('og:title', 'og:description', 'og:type', 'og:url', 'og:image')) {
    if ($Html -notmatch ('property="' + [regex]::Escape($property) + '"')) { Fail "$Label missing $property" }
  }
  if ($Html -notmatch 'property="og:url"\s+content="([^"]+)"') { Fail "$Label missing og:url" }
  if ($Matches[1] -ne $ExpectedUrl) { Fail "$Label og:url $($Matches[1]) != $ExpectedUrl" }
  if ($Html -notmatch 'application/ld\+json') { Fail "$Label missing JSON-LD" }
  if ($RequireBrandBack) {
    $brandBackLinks = @([regex]::Matches($Html, '<a\b[^>]*class="[^"]*\bbrand-back\b[^"]*"[^>]*>', 'IgnoreCase'))
    if ($brandBackLinks.Count -eq 0) { Fail "$Label missing brand-back link" }
    $hasCatalogLink = $false
    foreach ($link in $brandBackLinks) {
      if ($link.Value -match 'href="https://pikov\.expert/?"') {
        $hasCatalogLink = $true
        break
      }
    }
    if (-not $hasCatalogLink) { Fail "$Label brand-back does not link to https://pikov.expert" }
  }
}

$rootPath = (Resolve-Path -LiteralPath $Root).Path
$projectPath = Join-Path $rootPath '_PROJECT'
$lecturesPath = Join-Path $projectPath 'lectures.json'
$indexPath = Join-Path $rootPath 'index.html'
$sitemapPath = Join-Path $rootPath 'sitemap.xml'
$robotsPath = Join-Path $rootPath 'robots.txt'
$p19HtmlPath = Join-Path (Join-Path $rootPath 'p19') 'index.html'

if (-not (Test-Path -LiteralPath $lecturesPath)) { Fail "Missing _PROJECT\lectures.json" }
if (-not (Test-Path -LiteralPath $indexPath)) { Fail "Missing root index.html" }
if (-not (Test-Path -LiteralPath $sitemapPath)) { Fail "Missing root sitemap.xml" }
if (-not (Test-Path -LiteralPath $robotsPath)) { Fail "Missing root robots.txt" }
if (-not (Test-Path -LiteralPath $p19HtmlPath)) { Fail "Missing p19\index.html" }

$p19Html = Get-Content -LiteralPath $p19HtmlPath -Encoding UTF8 -Raw
if ($p19Html -match '\u2116\s*18') { Fail 'p19 contains obsolete process number 18' }
if ($p19Html -notmatch '\u043F\u0440\u043E\u0446\u0435\u0441\u0441\s+\u2116\s*19') { Fail 'p19 does not identify the lecture as process 19' }

$p19Title = Decode-Utf8Base64 '0J3QtdGE0YPQvdC60YbQuNC+0L3QsNC70YzQvdC+0LUg0YLQtdGB0YLQuNGA0L7QstCw0L3QuNC1INCx0LXQt9C+0L/QsNGB0L3QvtGB0YLQuCDQn9Ce'
$obsoleteP19Title = Decode-Utf8Base64 '0J/RgNC+0LLQtdGA0LrQsCDQsdC10LfQvtC/0LDRgdC90L7RgdGC0Lgg0L/RgNC40LvQvtC20LXQvdC40Y8='
$rootIndexHtml = Get-Content -LiteralPath $indexPath -Encoding UTF8 -Raw
$lectureCatalogJson = Get-Content -LiteralPath $lecturesPath -Encoding UTF8 -Raw
foreach ($surface in @(
  [pscustomobject]@{ Label = 'p19'; Text = $p19Html },
  [pscustomobject]@{ Label = 'root index'; Text = $rootIndexHtml },
  [pscustomobject]@{ Label = 'lecture catalog'; Text = $lectureCatalogJson }
)) {
  if ($surface.Text.IndexOf($p19Title, [System.StringComparison]::OrdinalIgnoreCase) -lt 0) { Fail "$($surface.Label) missing corrected p19 title" }
  if ($surface.Text.IndexOf($obsoleteP19Title, [System.StringComparison]::OrdinalIgnoreCase) -ge 0) { Fail "$($surface.Label) contains obsolete p19 title" }
}

$requiredP19Text = @(
  $p19Title,
  '5.19.2.2',
  '5.19.2.5',
  '5.19.3.1',
  '5.19.3.2',
  '5.19.3.3',
  'SELECT id, password_hash FROM users WHERE username = ?',
  'passwordHasher.verify',
  (Decode-Utf8Base64 '0LjQvdGC0YDQvtGB0L/QtdC60YbQuNGPINGB0LDQvNCwINC/0L4g0YHQtdCx0LUg0L3QtSDRj9Cy0LvRj9C10YLRgdGPINGD0Y/Qt9Cy0LjQvNC+0YHRgtGM0Y4='),
  '-fstack-protector-strong',
  '-D_FORTIFY_SOURCE=3',
  (Decode-Utf8Base64 '0LjRgdGF0L7QtNC90YvQuSDRhNCw0LnQuyDQvdC1INCx0YvQuyDQv9C10YDQtdC30LDQv9C40YHQsNC9'),
  'org.freedesktop.DBus.ListNames',
  'org.freedesktop.DBus.ListActivatableNames',
  'connection.createStatement().executeQuery(sql)',
  'github.com/google/syzkaller',
  'CWE-732',
  'dbus-send --session'
)
foreach ($requiredText in $requiredP19Text) {
  if ($p19Html.IndexOf($requiredText, [System.StringComparison]::OrdinalIgnoreCase) -lt 0) { Fail "p19 missing required corrected text: $requiredText" }
}

$forbiddenP19Text = @(
  (Decode-Utf8Base64 '0J/RgNC+0YbQtdGB0YEg4oSWMTkg4oCUIMKr0J/RgNC+0LLQtdGA0LrQsCDQsdC10LfQvtC/0LDRgdC90L7RgdGC0Lgg0L/RgNC40LvQvtC20LXQvdC40Y/Cuw=='),
  (Decode-Utf8Base64 '0JfQsNC/0YPRgdC60LDQtdGC0YHRjyDQv9C+0YHQu9C1INGE0YPQvdC60YbQuNC+0L3QsNC70YzQvdC+0LPQviDRgtC10YHRgtC40YDQvtCy0LDQvdC40Y8sINC+0LHRi9GH0L3QviDigJQg0L3QsCDRgdGC0LDQtNC40Lgg0LPQvtGC0L7QstC+0LPQviDQutCw0L3QtNC40LTQsNGC0LAg0LIg0YDQtdC70LjQty4='),
  'SELECT * FROM users WHERE username = ? AND password = ?',
  (Decode-Utf8Base64 '0JXQtNC40L3RgdGC0LLQtdC90L3Ri9C5INC/0YDQsNCy0LjQu9GM0L3Ri9C5INC/0L7QtNGF0L7QtCDigJQg0YbQtdC70LjQutC+0Lwg0LfQsNC40LzRgdGC0LLQvtCy0LDRgtGMINGH0YPQttC+0LUg0L/RgNC+0LPRgNCw0LzQvNC90L7QtSDRgNC10YjQtdC90LjQtQ=='),
  (Decode-Utf8Base64 '0LrRgNCw0LbRgyDRgdC10YHRgdC40Lgg0LvRjtCx0L7Qs9C+INC/0L7Qu9GM0LfQvtCy0LDRgtC10LvRjw=='),
  (Decode-Utf8Base64 '0L/QtdGA0LXQt9Cw0L/QuNGB0LDQuyDRgNC10YHRg9GA0YEg0L/RgNC40LvQvtC20LXQvdC40Y8gPGNvZGU+VHJhbnNsYXRpb24ueGFtbDwvY29kZT4='),
  (Decode-Utf8Base64 '0JvRjtCx0L7QuSDRgdCw0LzQvtC/0LjRgdC90YvQuSDQtNGA0LDQudCy0LXRgCDigJQg0LPQsNGA0LDQvdGC0LjRgNC+0LLQsNC90L3Ri9C5INC40YHRgtC+0YfQvdC40Log0L/RgNC+0LHQu9C10Lw='),
  'for (i = 0; i &lt; MAX_SYSCALL; i++)',
  '%c0%ae%c0%ae',
  (Decode-Utf8Base64 '0JIgV2F5bGFuZCDQuCBBbmRyb2lkINGBINCx0LXQt9C+0L/QsNGB0L3QvtGB0YLRjNGOINCy0YDQvtC00LUg0LLRgdGRINGF0L7RgNC+0YjQvi4='),
  (Decode-Utf8Base64 '0J3QvtGA0LzQsNC70YzQvdGL0YUg0YDQtdCw0LvQuNC30LDRhtC40Lkg0JzQo9CULCDQv9GA0LjQs9C+0LTQvdGL0YUg0LTQu9GPINC/0L7QstGB0LXQtNC90LXQstC90L7Qs9C+INC40YHQv9C+0LvRjNC30L7QstCw0L3QuNGPLCDQstC40LTQuNC80L4sINC90LXRgi4='),
  'set /p a=&lt;c:\secret\secret.doc',
  (Decode-Utf8Base64 'TGlzdFtBY3RpdmF0YWJsZV1OYW1lcw=='),
  (Decode-Utf8Base64 'U3FsQ29tbWFuZA=='),
  (Decode-Utf8Base64 'PGNvZGU+Li4vPC9jb2RlPiwgPGNvZGU+Li88L2NvZGU+IOKAlCDQv9C10YDQtdGF0L7QtCDQvdCwINGD0YDQvtCy0LXQvdGMINCy0YvRiNC1'),
  (Decode-Utf8Base64 '0L/RgNCw0LLQsCA8Y29kZT42NjY8L2NvZGU+IC8gPGNvZGU+RklMRV9BTllfQUNDRVNTPC9jb2RlPg=='),
  (Decode-Utf8Base64 '0LIg0L7QtNC90L7QstGA0LXQvNC10L3QvdC+INCy0YvQv9C+0LvQvdGP0Y7RidC40YXRgdGPINC/0YDQvtGG0LXRgdGB0LDRhSDRgNCw0YHQv9GA0LXQtNC10LvQtdC90LjQtSDQtNC+0LvQttC90L4g0L7RgtC70LjRh9Cw0YLRjNGB0Y8='),
  (Decode-Utf8Base64 '0L3QtdC+0LPRgNCw0L3QuNGH0LXQvdC90L4g0LTQvtC70LPQviDQvdC10LLQt9C40YDQsNGPINC90LAgQVNMUg=='),
  'dbus-send [--system]'
)
foreach ($forbiddenText in $forbiddenP19Text) {
  if ($p19Html.IndexOf($forbiddenText, [System.StringComparison]::OrdinalIgnoreCase) -ge 0) { Fail "p19 contains obsolete or unsafe text: $forbiddenText" }
}
if ($P19Only) {
  Write-Output 'P19 CONTENT CHECK OK'
  return
}

$data = Get-Content -LiteralPath $lecturesPath -Encoding UTF8 -Raw | ConvertFrom-Json
$lectures = @($data.lectures)

foreach ($htaccessPath in @(
  (Join-Path $rootPath '.htaccess'),
  (Join-Path (Join-Path $rootPath 'p19') '.htaccess')
)) {
  if (-not (Test-Path -LiteralPath $htaccessPath)) { Fail "Missing CSP control file: $htaccessPath" }
  $htaccess = Get-Content -LiteralPath $htaccessPath -Encoding UTF8 -Raw
  if ($htaccess -notmatch 'img-src[^\r\n"]*https://mc\.yandex\.com[^\r\n"]*https://\*\.mc\.yandex\.com') {
    Fail "$htaccessPath does not allow Yandex Metrika image endpoints on mc.yandex.com"
  }
  if ($htaccess -notmatch 'connect-src[^\r\n"]*https://mc\.yandex\.com[^\r\n"]*https://\*\.mc\.yandex\.com') {
    Fail "$htaccessPath does not allow Yandex Metrika connection endpoints on mc.yandex.com"
  }
  if ($htaccess -notmatch 'connect-src[^\r\n"]*wss://mc\.yandex\.com[^\r\n"]*wss://\*\.mc\.yandex\.com') {
    Fail "$htaccessPath does not allow Yandex Metrika WebSocket endpoints on mc.yandex.com"
  }
}

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
    Where-Object { $_.Name.StartsWith('_') -and $_.Name -ne '_PROJECT' } |
    Select-Object -ExpandProperty Name
)
if ($quarantineDirs.Count -ne 1) {
  if ($quarantineDirs.Count -gt 1) {
    Fail "Expected at most one quarantine directory, got $($quarantineDirs.Count)"
  }
}
$allowedLocalToolDirs = @('.git', '.github', '.codegraph', '.codex', '.claude', '.agents', '.serena', '.gigacode', '.qwen', '.vscode', '.idea')
$localWorkspaceDirs = @(
  $actualRootDirObjects |
    Where-Object { Test-Path -LiteralPath (Join-Path $_.FullName '.obsidian') } |
    Select-Object -ExpandProperty Name
)
$allowedRootDirs = $allowedLocalToolDirs + @('_PROJECT', 'release', 'docs', 'tests') + $localWorkspaceDirs + $quarantineDirs + $domainFolders
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

$trackedHtml = git -C $rootPath grep -n 'pikov@yandex\.ru' -- '*.html' 2>$null
if ($LASTEXITCODE -eq 0 -and $trackedHtml) {
  Fail "Public HTML still references pikov@yandex.ru"
}

$webvisorHtml = git -C $rootPath grep -n 'webvisor:true' -- '*.html' 2>$null
if ($LASTEXITCODE -eq 0 -and $webvisorHtml) {
  Fail "Yandex Webvisor/session replay must stay disabled unless explicitly approved"
}

foreach ($blockedPath in @(
  'p19/materials',
  'ppk/materials_from_4days',
  'threats-kii/threats-kii',
  'astralinux01/materials/astra-linux-se-1.8.3.7'
)) {
  $candidate = Join-Path $rootPath $blockedPath
  if (Test-Path -LiteralPath $candidate) {
    $trackedBlocked = git -C $rootPath ls-files -- $blockedPath
    if ($LASTEXITCODE -eq 0 -and $trackedBlocked) {
      Fail "High-risk or duplicate tracked path remains: $blockedPath"
    }
  }
}

foreach ($folder in $domainFolders) {
  $lecture = @($lectures | Where-Object { $_.folder -eq $folder })[0]
  if (-not $lecture) { Fail "Missing $folder in lectures.json" }

  $lectureHtmlPath = Join-Path (Join-Path $rootPath $folder) 'index.html'
  $lectureHtml = Get-Content -LiteralPath $lectureHtmlPath -Encoding UTF8 -Raw
  if ($lectureHtml -notmatch '<link\s+rel="canonical"\s+href="([^"]+)"') { Fail "$folder missing canonical" }
  $expectedIndexUrl = Get-ExpectedIndexUrl $lecture
  if ($Matches[1] -ne $expectedIndexUrl) { Fail "$folder canonical $($Matches[1]) != $expectedIndexUrl" }
  if ($lectureHtml -notmatch 'property="og:url"\s+content="([^"]+)"') { Fail "$folder missing og:url" }
  if ($Matches[1] -ne $expectedIndexUrl) { Fail "$folder og:url $($Matches[1]) != $expectedIndexUrl" }
  if ($lectureHtml -notmatch 'property="og:image"\s+content="https://[^"]+"') {
    Fail "$folder missing og:image"
  }
  Assert-PublicHtmlMetadata -Html $lectureHtml -Label $folder -ExpectedUrl $expectedIndexUrl -RequireBrandBack $true
}

foreach ($lecture in @($lectures | Where-Object { ([string]$_.url).Split('#')[0].EndsWith('.html') })) {
  $cleanUrl = ([string]$lecture.url).Split('#')[0]
  $fileName = [System.IO.Path]::GetFileName(([Uri]$cleanUrl).AbsolutePath)
  $pagePath = Join-Path (Join-Path $rootPath ([string]$lecture.folder)) $fileName
  if (-not (Test-Path -LiteralPath $pagePath)) { Fail "Missing lecture detail page: $pagePath" }
  $pageHtml = Get-Content -LiteralPath $pagePath -Encoding UTF8 -Raw
  Assert-PublicHtmlMetadata -Html $pageHtml -Label "$($lecture.folder)/$fileName" -ExpectedUrl $cleanUrl -RequireBrandBack $true
}

foreach ($folder in @('tz', 'fstec-sdlc', 'kapo', 'sast', 'p19', 'ppk')) {
  $lectureHtmlPath = Join-Path (Join-Path $rootPath $folder) 'index.html'
  $lectureHtml = Get-Content -LiteralPath $lectureHtmlPath -Encoding UTF8 -Raw
  if ($lectureHtml -notmatch '<meta\s+name="description"') { Fail "$folder missing meta description" }
  if ($lectureHtml -notmatch '<meta\s+name="author"') { Fail "$folder missing meta author" }
}

Write-Output "SMOKE OK"
Write-Output "lectures=$($lectures.Count)"
Write-Output "domainFolders=$($domainFolders.Count)"
Write-Output "readyLocal=$readyLocal"
Write-Output "publishedSnapshot=$publishedSnapshot"
Write-Output "sitemapUrls=$($sitemapUrls.Count)"
