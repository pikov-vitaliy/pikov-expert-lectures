param()

$ErrorActionPreference = 'Stop'

function Assert-Equal([System.Collections.Generic.List[string]]$Failures, [string]$Name, [string]$Expected, [string]$Actual) {
  if ($Expected -cne $Actual) {
    $Failures.Add("$Name changed unexpectedly")
  }
}

function Read-Raw([string]$Path) {
  [System.IO.File]::ReadAllText($Path, [System.Text.Encoding]::UTF8)
}

function Write-Raw([string]$Path, [string]$Content) {
  [System.IO.File]::WriteAllText($Path, $Content, [System.Text.UTF8Encoding]::new($false))
}

$fixtureRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("pikov-control-files-test-" + [guid]::NewGuid().ToString('N'))

try {
  $failures = [System.Collections.Generic.List[string]]::new()
  [void](New-Item -ItemType Directory -Path (Join-Path $fixtureRoot '_PROJECT') -Force)
  [void](New-Item -ItemType Directory -Path (Join-Path $fixtureRoot 'alpha') -Force)
  [void](New-Item -ItemType Directory -Path (Join-Path $fixtureRoot 'scaner-vs\scanner') -Force)
  [void](New-Item -ItemType Directory -Path (Join-Path $fixtureRoot 'scaner-vs\inspector') -Force)

  Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'update-site-control-files.ps1') -Destination (Join-Path $fixtureRoot '_PROJECT\update-site-control-files.ps1')

  Write-Raw (Join-Path $fixtureRoot '_PROJECT\lectures.json') @'
{
  "updated": "2026-08-05",
  "lectures": [
    {
      "position": 1,
      "folder": "alpha",
      "domain": "alpha",
      "url": "https://alpha.pikov.expert/"
    },
    {
      "position": 2,
      "folder": "scaner-vs",
      "domain": "scaner-vs",
      "url": "https://scaner-vs.pikov.expert/"
    }
  ]
}
'@

  Write-Raw (Join-Path $fixtureRoot 'alpha\index.html') '<!doctype html><title>Alpha</title>'
  Write-Raw (Join-Path $fixtureRoot 'scaner-vs\index.html') '<!doctype html><title>Scanner</title>'
  Write-Raw (Join-Path $fixtureRoot 'scaner-vs\scanner\index.html') '<!doctype html><title>Scanner day</title>'
  Write-Raw (Join-Path $fixtureRoot 'scaner-vs\inspector\index.html') '<!doctype html><title>Inspector day</title>'

  $customHtaccess = "# custom scaner-vs htaccess`nHeader always set Content-Security-Policy `"default-src 'self'`"`n"
  $customRobots = "User-agent: *`nAllow: /`nDisallow: /materials/`nSitemap: https://scaner-vs.pikov.expert/sitemap.xml`n"
  $customSitemap = @'
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://scaner-vs.pikov.expert/</loc><lastmod>2026-08-01</lastmod></url>
  <url><loc>https://scaner-vs.pikov.expert/scanner/</loc><lastmod>2026-08-01</lastmod></url>
  <url><loc>https://scaner-vs.pikov.expert/inspector/</loc><lastmod>2026-08-01</lastmod></url>
</urlset>
'@
  $alphaSitemap = @'
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://alpha.pikov.expert/</loc>
    <lastmod>2026-08-01</lastmod>
  </url>
</urlset>
'@
  $alphaRobots = "User-agent: *`nAllow: /`nDisallow: /release/`nDisallow: /source/`nDisallow: /tools/`nDisallow: /output/`nDisallow: /notes/`nDisallow: /tests/`nDisallow: /test-results/`nDisallow: /node_modules/`nDisallow: /materials_from_4days/`nDisallow: /_*/`n`nSitemap: https://alpha.pikov.expert/sitemap.xml`n"

  [System.IO.File]::WriteAllText((Join-Path $fixtureRoot 'scaner-vs\.htaccess'), $customHtaccess, [System.Text.UTF8Encoding]::new($false))
  [System.IO.File]::WriteAllText((Join-Path $fixtureRoot 'scaner-vs\robots.txt'), $customRobots, [System.Text.UTF8Encoding]::new($false))
  [System.IO.File]::WriteAllText((Join-Path $fixtureRoot 'scaner-vs\sitemap.xml'), $customSitemap, [System.Text.UTF8Encoding]::new($false))
  [System.IO.File]::WriteAllText((Join-Path $fixtureRoot 'alpha\robots.txt'), $alphaRobots, [System.Text.UTF8Encoding]::new($false))
  [System.IO.File]::WriteAllText((Join-Path $fixtureRoot 'alpha\sitemap.xml'), $alphaSitemap, [System.Text.UTF8Encoding]::new($false))

  & (Join-Path $fixtureRoot '_PROJECT\update-site-control-files.ps1') -Root $fixtureRoot | Out-Null

  Assert-Equal $failures 'scaner-vs/.htaccess' $customHtaccess (Read-Raw (Join-Path $fixtureRoot 'scaner-vs\.htaccess'))
  Assert-Equal $failures 'scaner-vs/robots.txt' $customRobots (Read-Raw (Join-Path $fixtureRoot 'scaner-vs\robots.txt'))
  Assert-Equal $failures 'scaner-vs/sitemap.xml' $customSitemap (Read-Raw (Join-Path $fixtureRoot 'scaner-vs\sitemap.xml'))
  Assert-Equal $failures 'logically unchanged alpha robots bytes' $alphaRobots (Read-Raw (Join-Path $fixtureRoot 'alpha\robots.txt'))
  if ((Read-Raw (Join-Path $fixtureRoot 'alpha\sitemap.xml')) -notmatch '<lastmod>2026-08-05</lastmod>') {
    $failures.Add('alpha sitemap was not refreshed to the manifest lastmod')
  }

  $firstRun = @{
    Htaccess = Read-Raw (Join-Path $fixtureRoot 'scaner-vs\.htaccess')
    Robots = Read-Raw (Join-Path $fixtureRoot 'scaner-vs\robots.txt')
    Sitemap = Read-Raw (Join-Path $fixtureRoot 'scaner-vs\sitemap.xml')
    AlphaRobots = Read-Raw (Join-Path $fixtureRoot 'alpha\robots.txt')
    AlphaSitemap = Read-Raw (Join-Path $fixtureRoot 'alpha\sitemap.xml')
  }

  & (Join-Path $fixtureRoot '_PROJECT\update-site-control-files.ps1') -Root $fixtureRoot | Out-Null

  Assert-Equal $failures 'second-run scaner-vs/.htaccess' $firstRun.Htaccess (Read-Raw (Join-Path $fixtureRoot 'scaner-vs\.htaccess'))
  Assert-Equal $failures 'second-run scaner-vs/robots.txt' $firstRun.Robots (Read-Raw (Join-Path $fixtureRoot 'scaner-vs\robots.txt'))
  Assert-Equal $failures 'second-run scaner-vs/sitemap.xml' $firstRun.Sitemap (Read-Raw (Join-Path $fixtureRoot 'scaner-vs\sitemap.xml'))
  Assert-Equal $failures 'second-run alpha/robots.txt' $firstRun.AlphaRobots (Read-Raw (Join-Path $fixtureRoot 'alpha\robots.txt'))
  Assert-Equal $failures 'second-run alpha/sitemap.xml' $firstRun.AlphaSitemap (Read-Raw (Join-Path $fixtureRoot 'alpha\sitemap.xml'))

  Write-Raw (Join-Path $fixtureRoot 'alpha\new.html') '<!doctype html><title>New alpha page</title>'
  & (Join-Path $fixtureRoot '_PROJECT\update-site-control-files.ps1') -Root $fixtureRoot | Out-Null

  $alphaXml = [System.Xml.XmlDocument]::new()
  $alphaXml.XmlResolver = $null
  $alphaXml.Load((Join-Path $fixtureRoot 'alpha\sitemap.xml'))
  $alphaEntries = @($alphaXml.SelectNodes('/*[local-name()="urlset"]/*[local-name()="url"]'))
  $oldEntry = @($alphaEntries | Where-Object { $_.SelectSingleNode('./*[local-name()="loc"]').InnerText -eq 'https://alpha.pikov.expert/' })
  $newEntry = @($alphaEntries | Where-Object { $_.SelectSingleNode('./*[local-name()="loc"]').InnerText -eq 'https://alpha.pikov.expert/new.html' })
  if ($oldEntry.Count -ne 1 -or $oldEntry[0].SelectSingleNode('./*[local-name()="lastmod"]').InnerText -ne '2026-08-05') {
    $failures.Add('existing alpha URL did not retain the current manifest lastmod when a URL was added')
  }
  if ($newEntry.Count -ne 1 -or $newEntry[0].SelectSingleNode('./*[local-name()="lastmod"]').InnerText -ne '2026-08-05') {
    $failures.Add('new alpha URL did not receive the manifest lastmod')
  }

  $thirdRunSitemap = Read-Raw (Join-Path $fixtureRoot 'alpha\sitemap.xml')
  & (Join-Path $fixtureRoot '_PROJECT\update-site-control-files.ps1') -Root $fixtureRoot | Out-Null
  Assert-Equal $failures 'repeat run after URL addition' $thirdRunSitemap (Read-Raw (Join-Path $fixtureRoot 'alpha\sitemap.xml'))

  $lecturesPath = Join-Path $fixtureRoot '_PROJECT\lectures.json'
  Write-Raw $lecturesPath ((Read-Raw $lecturesPath).Replace('2026-08-05', '2026-08-06'))
  & (Join-Path $fixtureRoot '_PROJECT\update-site-control-files.ps1') -Root $fixtureRoot | Out-Null

  $refreshedXml = [System.Xml.XmlDocument]::new()
  $refreshedXml.XmlResolver = $null
  $refreshedXml.Load((Join-Path $fixtureRoot 'alpha\sitemap.xml'))
  $refreshedDates = @($refreshedXml.SelectNodes('/*[local-name()="urlset"]/*[local-name()="url"]/*[local-name()="lastmod"]') | ForEach-Object { $_.InnerText })
  if ($refreshedDates.Count -ne 2 -or @($refreshedDates | Where-Object { $_ -ne '2026-08-06' }).Count -ne 0) {
    $failures.Add('existing URLs were not refreshed after lectures.json updated changed')
  }
  Assert-Equal $failures 'manifest refresh preserved custom scaner-vs sitemap' $customSitemap (Read-Raw (Join-Path $fixtureRoot 'scaner-vs\sitemap.xml'))

  $fourthRunSitemap = Read-Raw (Join-Path $fixtureRoot 'alpha\sitemap.xml')
  & (Join-Path $fixtureRoot '_PROJECT\update-site-control-files.ps1') -Root $fixtureRoot | Out-Null
  Assert-Equal $failures 'repeat run after manifest date refresh' $fourthRunSitemap (Read-Raw (Join-Path $fixtureRoot 'alpha\sitemap.xml'))

  if ($failures.Count -gt 0) {
    throw "CONTROL FILES TEST FAIL:`n- $($failures -join "`n- ")"
  }

  Write-Output 'CONTROL FILES TEST OK'
} finally {
  if ((Test-Path -LiteralPath $fixtureRoot) -and $fixtureRoot.StartsWith([System.IO.Path]::GetTempPath(), [System.StringComparison]::OrdinalIgnoreCase)) {
    Remove-Item -LiteralPath $fixtureRoot -Recurse -Force
  }
}
