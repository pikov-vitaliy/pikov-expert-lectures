param(
  [string]$Root = (Split-Path -Parent $PSScriptRoot),
  [string]$ReleaseDate = ''
)

$ErrorActionPreference = 'Stop'

function Get-Web([string]$Url) {
  try {
    $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -MaximumRedirection 5 -TimeoutSec 30 -Headers @{
      'User-Agent' = "pikov.expert hosting QA/$ReleaseDate"
    }
    [pscustomobject]@{
      Ok = $true
      StatusCode = [int]$response.StatusCode
      ContentType = [string]$response.Headers['Content-Type']
      Content = [string]$response.Content
      Error = ''
    }
  } catch {
    $code = 0
    $contentType = ''
    if ($_.Exception.Response) {
      try { $code = [int]$_.Exception.Response.StatusCode } catch { $code = 0 }
      try { $contentType = [string]$_.Exception.Response.Headers['Content-Type'] } catch { $contentType = '' }
    }
    [pscustomobject]@{
      Ok = $false
      StatusCode = $code
      ContentType = $contentType
      Content = ''
      Error = $_.Exception.Message
    }
  }
}

function Normalize-Base([string]$Url) {
  $uri = [Uri]$Url
  $path = $uri.AbsolutePath.TrimEnd('/')
  if ($path -eq '') {
    return "$($uri.Scheme)://$($uri.Host)"
  }
  "$($uri.Scheme)://$($uri.Host)$path"
}

function Add-Result([System.Collections.Generic.List[object]]$Results, [string]$Name, [string]$Url, [string]$Status, [string]$Details) {
  $Results.Add([pscustomobject]@{
    Name = $Name
    Url = $Url
    Status = $Status
    Details = $Details
  }) | Out-Null
}

function Join-Url([string]$Base, [string]$RelativePath) {
  $relative = $RelativePath.Replace('\', '/').TrimStart('/')
  return ($Base.TrimEnd('/') + '/' + $relative)
}

function Get-ReleaseMarkdownUrls([object[]]$Targets) {
  $urls = New-Object System.Collections.Generic.List[string]
  foreach ($target in $Targets) {
    if ([string]$target.kind -ne 'domain') { continue }
    $releaseDir = [string]$target.releaseDir
    if ([string]::IsNullOrWhiteSpace($releaseDir)) { continue }
    $manifestPath = Join-Path $releaseDir 'MANIFEST.json'
    if (-not (Test-Path -LiteralPath $manifestPath)) { continue }

    $manifest = Get-Content -LiteralPath $manifestPath -Encoding UTF8 -Raw | ConvertFrom-Json
    $base = Normalize-Base ([string]$target.url)
    foreach ($file in @($manifest.files)) {
      $relativePath = [string]$file.path
      if ([string]::IsNullOrWhiteSpace($relativePath)) { continue }
      $normalized = $relativePath.Replace('\', '/')
      $lower = $normalized.ToLowerInvariant()
      if (-not ($lower.EndsWith('.md') -or $lower.EndsWith('.markdown'))) { continue }
      if ($normalized -match '(^|/)00_') { continue }
      if ($normalized -match '(^|/)(README|SOURCE)\.md$') { continue }

      $url = Join-Url -Base $base -RelativePath $normalized
      if ($urls -notcontains $url) { $urls.Add($url) | Out-Null }
    }
  }
  @($urls | Sort-Object)
}

$rootPath = (Resolve-Path -LiteralPath $Root).Path
$projectPath = Join-Path $rootPath '_PROJECT'
$lecturesPath = Join-Path $projectPath 'lectures.json'
if (-not (Test-Path -LiteralPath $lecturesPath)) {
  throw "Missing _PROJECT\lectures.json"
}
$lectureData = Get-Content -LiteralPath $lecturesPath -Encoding UTF8 -Raw | ConvertFrom-Json
if ([string]::IsNullOrWhiteSpace($ReleaseDate)) {
  $ReleaseDate = [string]$lectureData.updated
}
if ($ReleaseDate -notmatch '^\d{4}-\d{2}-\d{2}$') {
  throw "ReleaseDate must be YYYY-MM-DD, got $ReleaseDate"
}

$indexPath = Join-Path $projectPath "RELEASE_INDEX_$ReleaseDate.json"
$reportPath = Join-Path $projectPath "HOSTING_CHECK_$ReleaseDate.md"

if (-not (Test-Path -LiteralPath $indexPath)) {
  throw "Missing release index: $indexPath"
}

$targets = @(Get-Content -LiteralPath $indexPath -Raw -Encoding UTF8 | ConvertFrom-Json | ForEach-Object { $_ })
$results = New-Object System.Collections.Generic.List[object]

foreach ($target in $targets) {
  $base = Normalize-Base ([string]$target.url)
  $indexUrl = [string]$target.url

  $index = Get-Web $indexUrl
  if ($index.Ok -and $index.StatusCode -eq 200 -and $index.Content -match '<html') {
    Add-Result $results 'index' $indexUrl 'OK' ("200; type={0}; bytes={1}" -f $index.ContentType, $index.Content.Length)
  } else {
    Add-Result $results 'index' $indexUrl 'FAIL' ("status={0}; error={1}" -f $index.StatusCode, $index.Error)
  }

  $robotsUrl = "$base/robots.txt"
  $robots = Get-Web $robotsUrl
  if ($robots.Ok -and $robots.StatusCode -eq 200 -and $robots.Content -match 'Sitemap:\s*https?://') {
    Add-Result $results 'robots' $robotsUrl 'OK' ("200; bytes={0}" -f $robots.Content.Length)
  } else {
    Add-Result $results 'robots' $robotsUrl 'FAIL' ("status={0}; error={1}" -f $robots.StatusCode, $robots.Error)
  }

  $sitemapUrl = "$base/sitemap.xml"
  $sitemap = Get-Web $sitemapUrl
  if ($sitemap.Ok -and $sitemap.StatusCode -eq 200 -and $sitemap.Content -match '<urlset') {
    $urlCount = ([regex]::Matches($sitemap.Content, '<url>')).Count
    Add-Result $results 'sitemap' $sitemapUrl 'OK' "200; urls=$urlCount; type=$($sitemap.ContentType)"
  } else {
    Add-Result $results 'sitemap' $sitemapUrl 'FAIL' ("status={0}; error={1}" -f $sitemap.StatusCode, $sitemap.Error)
  }

  $htaccessUrl = "$base/.htaccess"
  $htaccess = Get-Web $htaccessUrl
  if (-not $htaccess.Ok -and ($htaccess.StatusCode -eq 403 -or $htaccess.StatusCode -eq 404)) {
    Add-Result $results 'htaccess' $htaccessUrl 'OK' "blocked=$($htaccess.StatusCode)"
  } elseif ($htaccess.Ok -and ($htaccess.StatusCode -eq 403 -or $htaccess.StatusCode -eq 404)) {
    Add-Result $results 'htaccess' $htaccessUrl 'OK' "blocked=$($htaccess.StatusCode)"
  } else {
    Add-Result $results 'htaccess' $htaccessUrl 'FAIL' ("status={0}; type={1}" -f $htaccess.StatusCode, $htaccess.ContentType)
  }
}

$markdownUrls = @(Get-ReleaseMarkdownUrls -Targets $targets)

foreach ($url in $markdownUrls) {
  $markdown = Get-Web $url
  $contentType = $markdown.ContentType
  if ($markdown.Ok -and $markdown.StatusCode -eq 200 -and $contentType -match 'text/markdown' -and $contentType -match 'charset=UTF-8') {
    Add-Result $results 'markdown' $url 'OK' "200; type=$contentType; bytes=$($markdown.Content.Length)"
  } elseif ($markdown.Ok -and $markdown.StatusCode -eq 200 -and $contentType -match 'charset=UTF-8') {
    Add-Result $results 'markdown' $url 'WARN' "200; type=$contentType; expected text/markdown with UTF-8"
  } else {
    Add-Result $results 'markdown' $url 'FAIL' ("status={0}; type={1}; error={2}" -f $markdown.StatusCode, $contentType, $markdown.Error)
  }
}

$okCount = @($results | Where-Object Status -eq 'OK').Count
$warnCount = @($results | Where-Object Status -eq 'WARN').Count
$failCount = @($results | Where-Object Status -eq 'FAIL').Count

$lines = New-Object System.Collections.Generic.List[string]
$lines.Add("# Hosting check $ReleaseDate") | Out-Null
$lines.Add('') | Out-Null
$lines.Add(("Checked at: {0:yyyy-MM-dd HH:mm:ss zzz}" -f (Get-Date))) | Out-Null
$lines.Add('') | Out-Null
$lines.Add(("Summary: OK={0}; WARN={1}; FAIL={2}; targets={3}; markdown={4}" -f $okCount, $warnCount, $failCount, $targets.Count, $markdownUrls.Count)) | Out-Null
$lines.Add('') | Out-Null
$lines.Add('| Check | URL | Status | Details |') | Out-Null
$lines.Add('|---|---|---:|---|') | Out-Null

foreach ($result in $results) {
  $details = ($result.Details -replace '\|', '\|')
  $lines.Add("| $($result.Name) | $($result.Url) | $($result.Status) | $details |") | Out-Null
}

[System.IO.File]::WriteAllLines($reportPath, $lines, [System.Text.UTF8Encoding]::new($false))

Write-Output "HOSTING CHECK report=$reportPath OK=$okCount WARN=$warnCount FAIL=$failCount targets=$($targets.Count) markdown=$($markdownUrls.Count)"

if ($failCount -gt 0) {
  $results | Where-Object Status -eq 'FAIL' | Format-Table -AutoSize | Out-String -Width 240 | Write-Output
  exit 1
}

if ($warnCount -gt 0) {
  $results | Where-Object Status -eq 'WARN' | Format-Table -AutoSize | Out-String -Width 240 | Write-Output
}
