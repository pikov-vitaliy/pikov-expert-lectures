param(
  [string]$Root = (Split-Path -Parent $PSScriptRoot),
  [string]$ReleaseIndex = '',
  [switch]$PolicySelfTest
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression

function Fail([string]$Message) {
  throw "PUBLIC INDEPENDENCE TEST FAIL: $Message"
}

function Decode-Utf8Base64([string]$Value) {
  [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String($Value))
}

function Get-LatestReleaseIndex([string]$ProjectPath) {
  $candidate = Get-ChildItem -LiteralPath $ProjectPath -Filter 'RELEASE_INDEX_????-??-??.json' -File |
    Sort-Object LastWriteTime, Name |
    Select-Object -Last 1
  if ($null -eq $candidate) { Fail "No RELEASE_INDEX_YYYY-MM-DD.json under $ProjectPath" }
  return $candidate.FullName
}

$formerEmployerName = Decode-Utf8Base64 'KD860JzQkNCh0JrQntCcfE1BU0NPTXzQnEHQoUNPTXzQo9CmXHMr0JzQkNCh0JrQntCcKQ=='
$roleOrAffiliation = Decode-Utf8Base64 'KD860L/RgNC10L/QvtC00LDQstCw0YLQtdC7XHB7TH0qfNGB0L7RgtGA0YPQtNC90LjQulxwe0x9KnzRjdC60YHQv9C10YDRglxwe0x9KnzQu9C10LrRgtC+0YBccHtMfSp80LjQvdGB0YLRgNGD0LrRgtC+0YBccHtMfSp80YDQsNCx0L7RgtCwKD860Y580Lt80LvQsHzQu9C4KXzRgdC70YPQttC4KD860Lt80LvQsHzQu9C4KXzRgNCw0LHQvtGC0L7QtNCw0YLQtdC70YxccHtMfSp80LzQtdGB0YLQvlxzK9GA0LDQsdC+0YLRi3xlbXBsb3llZXxpbnN0cnVjdG9yfGxlY3R1cmVyfGV4cGVydHx3b3JrZWR8ZW1wbG95ZWR8ZW1wbG95ZXJ8YWZmaWxpYXRcdyop'
$authorshipOrOwnership = Decode-Utf8Base64 'KD860LDQstGC0L7RgFxwe0x9KnzQv9GA0LDQstC+0L7QsdC70LDQtNCw0YLQtdC7XHB7TH0qfNCy0LvQsNC00LXQu9C10YZccHtMfSp80L/QvtC00LPQvtGC0L7QstC70LXQvVxwe0x9KnzRgNCw0LfRgNCw0LHQvtGC0LDQvVxwe0x9KnzRgdC+0LfQtNCw0L1ccHtMfSp8wql8Y29weXJpZ2h0fGF1dGhvcmVkfHByZXBhcmVkfGRldmVsb3BlZHxjcmVhdGVkfG93bmVkKQ=='
$reverseAttribution = Decode-Utf8Base64 'KD860YDQsNCx0L7RgtC+0LTQsNGC0LXQu9GMXHB7TH0qfNC80LXRgdGC0L5ccyvRgNCw0LHQvtGC0Yt80LDQstGC0L7RgFxwe0x9KnzQv9GA0LDQstC+0L7QsdC70LDQtNCw0YLQtdC7XHB7TH0qfNCy0LvQsNC00LXQu9C10YZccHtMfSp8ZW1wbG95ZXJ8YXV0aG9yfG93bmVyfGNvcHlyaWdodFxzK2hvbGRlcik='
$brandingLead = Decode-Utf8Base64 'KD860LvQvtCz0L7RgtC40L9ccHtMfSp80YTQuNGA0LzQtdC90L1ccHtMfSpccyvRgdGC0LjQu1xwe0x9KnzQsdGA0LXQvdC00LjRgNC+0LLQsNC9XHB7TH0qfG9mZmljaWFsXHMrKD86Y291cnNlfGxlY3R1cmV8bWF0ZXJpYWwpfGxvZ298YnJhbmRpbmcp'
$retiredIdentity = Decode-Utf8Base64 'KD860KPQptCR0Jh80J3QntCjXHMr0JTQn9CefNCh0YLQsNGA0L7QutCw0LvRg9C20YHQutC+0LVccyvRiNC+0YHRgdC1fDI4MC0wMS0wNik='
$publicResource = Decode-Utf8Base64 'KD860LrRg9GA0YFccHtMfSp80LvQtdC60YbQuFxwe0x9KnzQvNCw0YLQtdGA0LjQsNC7XHB7TH0qfNGB0LDQudGCXHB7TH0qfGNvdXJzZXxsZWN0dXJlfHRyYWluaW5nXHMrbWF0ZXJpYWxzP3x3ZWJzaXRlKQ=='
$resourceConnector = Decode-Utf8Base64 'KD860LrQvtC80L/QsNC90LgoPzrQuHzRjyl8Ynl8b2Yp'
$ownershipRelation = Decode-Utf8Base64 'KD860L/RgNC40L3QsNC00LvQtdC20LjRgnzQvtGC0L3QvtGB0LjRgtGB0Y9ccyvQunxiZWxvbmdzXHMrdG98b3duZWRccytieSk='
$clauseGap = '[^.!?;]{0,100}'
$forbiddenClaimPatterns = @(
  [pscustomobject]@{ pattern = "(?is)$roleOrAffiliation$clauseGap$formerEmployerName"; why = 'personal role or affiliation' },
  [pscustomobject]@{ pattern = "(?is)$authorshipOrOwnership$clauseGap(?:by\s+)?$formerEmployerName"; why = 'authorship or ownership' },
  [pscustomobject]@{ pattern = "(?is)$formerEmployerName[^.!?;]{0,60}$reverseAttribution"; why = 'reverse attribution claim' },
  [pscustomobject]@{ pattern = "(?is)$brandingLead$clauseGap$formerEmployerName"; why = 'branding claim' },
  [pscustomobject]@{ pattern = "(?is)$publicResource(?:\s+$resourceConnector)?\s+$formerEmployerName"; why = 'resource attributed to former employer' },
  [pscustomobject]@{ pattern = "(?is)$formerEmployerName(?:'s)?\s+$publicResource"; why = 'former-employer resource label' },
  [pscustomobject]@{ pattern = "(?is)$publicResource[^.!?;]{0,50}$ownershipRelation[^.!?;]{0,20}$formerEmployerName"; why = 'resource ownership claim' },
  [pscustomobject]@{ pattern = "(?is)$retiredIdentity"; why = 'retired contact or legal identity' }
)
$forbiddenBrandedFileNames = @(
  (Decode-Utf8Base64 'KD9pKShefC8pKD86bG9nb1stXy4gXSooPzptYXNjb2180LzQsNGB0LrQvtC8KXwoPzptYXNjb2180LzQsNGB0LrQvtC8KVstXy4gXSooPzpsb2dvfGJyYW5kfGJyYW5kaW5nfGxldHRlcmhlYWR8dGVtcGxhdGV80LvQvtCz0L7RgtC40L980LHRgNC10L3QtHzRiNCw0LHQu9C+0L0pKSg/OlstXy4gL118JCk=')
)

# These SHA-256 values identify former-employer logos/backgrounds and the six
# retired branded VKR slide/thumbnail JPGs. Matching bytes protects direct URLs
# and nested Office/ZIP content even after an HTML reference has been removed.
$forbiddenHashes = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::OrdinalIgnoreCase)
@(
  '9969676d6bf86f114b1d9b4a06b11d0bf5a7ca319df603d2a3fd494d2ebf1fa2',
  '49137f9ce8b6ddd2806daa1576884e8fd0539bda724eccdf9dc5ac2b979f7d17',
  '3e2297ac5b5d9858e23782b7fe5c7a616d770128df999f3765c8ca67e01c4311',
  '1206d0daa1de064ee881a7f63c05ba824d047e057c423c7e513e863dd64d393c',
  '284482990cba7f331572ebea2f8a98dde900aa5432c32ab0a7428e83fd33b6d8',
  '053dcabf7cdf2b90c1a17bb8e784622bdfcd9b644a318f9136704d6032b06e14',
  '29903ed8a2fb5d4d2bc2f04cce7e7a0a518efd1aacbbbe8bdafedaf4d1169d63',
  'fd487f72c6b891514fc3a9c371d4b98d170049be57fac7d419befb157fdef68e',
  'ea0e1d060d2fe0e941800a581c6a9a579c7c268eef9dc975edd26690a4bf1ca7',
  '77239f856e1cfe3f8d1d961195655517abe156888ef718858bfb1efe0363252e'
) | ForEach-Object { [void]$forbiddenHashes.Add($_) }

# These retired artifacts must never become public again. Unlike the reviewed
# PDF hash allowlist below, this path-level denylist survives byte changes and
# therefore fails closed if a regenerated copy is accidentally staged.
$forbiddenReleasePaths = @(
  '(?i)(^|/)materials/From_Working_Code_to_Shippable_Product\.pdf$',
  '(?i)(^|/)downloads/day-01/(?:lab-results|participant-materials|program-and-environment)(?:/|$)',
  '(?i)(^|/)(?:\.env(?:\.[^/]*)?|id_rsa|id_ed25519)$',
  '(?i)(^|/)[^/]+\.(?:db|sqlite|sqlite3)(?:-journal|-shm|-wal)?$',
  '(?i)(^|/)[^/]+\.(?:orig|key|pem|pfx|p12|kdbx|log|exe|dll|msi)$'
)

$textExtensions = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::OrdinalIgnoreCase)
@('.html', '.htm', '.md', '.markdown', '.txt', '.json', '.jsonld', '.css', '.js', '.mjs', '.svg', '.xml', '.yml', '.yaml', '.csv') |
  ForEach-Object { [void]$textExtensions.Add($_) }

# Public PDFs do not expose source text through the archive API. Their
# manually reviewed SHA-256 values are pinned here; a new or changed PDF fails
# closed until its text and visual provenance have been reviewed explicitly.
$reviewedPdfHashes = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::OrdinalIgnoreCase)
@(
  '5637fc29cb8f3c61ed22bd429e6cdbd7ac7f99cb31876f14b3edf2c6b394dde7',
  '251c5d734a73b94ac43577e2a7234bedd943f2b172461cdbd45ac043304e19ef',
  '2826c15b97cc7ffeada52f2000a4b0712a7cf4a81a38d7ba4087de350049c350',
  '40651600b2550513231ab481323f1a510f47770e29c46344c8a7bb686aa1dfd5',
  '68f68afa6cc90068000a41673862fdf68303938cb0409df838e99c580d89380b',
  '7096c79b69bdb842d81de5947a118befbb8e70a4f3e2593aaf07ad27c28ff31a',
  'c31b9bb34a5476bcefdcf65c7e6537bfa9fce23666eff4152a6a77f28e17a657',
  'dda92267f335ca0a2a61d7d0bee65a2cd792b77b3eb8480a8bbddc208bf7b686',
  'f27cd06b0195a08983927b30f6dccb0c744f26bb57239577a7f04aeaff81c18c',
  'fb5169743783b44c95df5072489c471ff6bbcd350b271ffe60873188e01e0744'
) | ForEach-Object { [void]$reviewedPdfHashes.Add($_) }

$failures = [System.Collections.Generic.List[string]]::new()

function Add-Failure([string]$Message) {
  if ($script:failures.Count -lt 250) { $script:failures.Add($Message) }
}

function Find-ForbiddenFormerEmployerClaim([string]$Content) {
  $normalized = [regex]::Replace([regex]::Replace($Content, '<[^>]+>', ' '), '\s+', ' ')
  foreach ($rule in $script:forbiddenClaimPatterns) {
    $match = [regex]::Match($normalized, [string]$rule.pattern)
    if ($match.Success) {
      return [pscustomobject]@{ match = $match.Value; why = [string]$rule.why }
    }
  }
  return $null
}

function Test-ForbiddenBrandedFileName([string]$EntryName) {
  foreach ($pattern in $script:forbiddenBrandedFileNames) {
    if ($EntryName -match $pattern) { return $true }
  }
  return $false
}

function Test-PublicHtmlPrefix([string]$Content) {
  return $Content -match '(?is)(?:<\?xml\b[^>]*>\s*)?(?:<!doctype\b[^>]*>\s*)?<html\b'
}

function Get-Sha256Hex([System.IO.Stream]$InputStream) {
  $sha = [System.Security.Cryptography.SHA256]::Create()
  try {
    return ([System.BitConverter]::ToString($sha.ComputeHash($InputStream))).Replace('-', '').ToLowerInvariant()
  } finally {
    $sha.Dispose()
  }
}

function Test-TextEntry([System.IO.Compression.ZipArchiveEntry]$Entry, [string]$DisplayPath) {
  $extension = [System.IO.Path]::GetExtension($Entry.FullName)
  $isKnownText = $script:textExtensions.Contains($extension) -or $Entry.Name -eq '.gitkeep'
  if (-not $isKnownText) {
    $probeLength = [int][Math]::Min([int64]4096, $Entry.Length)
    if ($probeLength -le 0) { return }
    $probeBytes = New-Object byte[] $probeLength
    $probeStream = $Entry.Open()
    try {
      $bytesRead = $probeStream.Read($probeBytes, 0, $probeBytes.Length)
    } finally {
      $probeStream.Dispose()
    }
    $probeText = [System.Text.Encoding]::UTF8.GetString($probeBytes, 0, $bytesRead)
    if (-not (Test-PublicHtmlPrefix -Content $probeText)) { return }
  }
  $stream = $Entry.Open()
  $reader = [System.IO.StreamReader]::new($stream, [System.Text.UTF8Encoding]::new($false, $false), $true)
  try {
    $content = $reader.ReadToEnd()
  } finally {
    $reader.Dispose()
  }
  $finding = Find-ForbiddenFormerEmployerClaim -Content $content
  if ($null -ne $finding) {
    Add-Failure "$DisplayPath contains an incorrect former-employer claim ($($finding.why)): $($finding.match)"
  }
}

function Test-Archive(
  [System.IO.Stream]$InputStream,
  [string]$DisplayPath,
  [int]$Depth,
  [string]$PolicyPathPrefix = '',
  [bool]$InsideApprovedDayOneBundle = $false
) {
  if ($Depth -gt 4) { Fail "Nested archive depth exceeded at $DisplayPath" }
  $archive = [System.IO.Compression.ZipArchive]::new($InputStream, [System.IO.Compression.ZipArchiveMode]::Read, $true)
  try {
    foreach ($entry in $archive.Entries) {
      if ([string]::IsNullOrWhiteSpace($entry.Name)) { continue }
      $entryPath = "$DisplayPath!$($entry.FullName.Replace('\','/'))"
      $normalizedEntryName = $entry.FullName.Replace('\','/')
      $policyEntryPath = if ([string]::IsNullOrWhiteSpace($PolicyPathPrefix)) {
        $normalizedEntryName
      } else {
        "$PolicyPathPrefix!/$normalizedEntryName"
      }
      $entryStartsApprovedDayOneBundle = $normalizedEntryName -match '(?i)(^|/)downloads/day-01-(?:canonical-safe-package|edited-transcript-and-summaries)\.zip$'
      $entryInsideApprovedDayOneBundle = $InsideApprovedDayOneBundle -or $entryStartsApprovedDayOneBundle
      if ($InsideApprovedDayOneBundle -and
          $normalizedEntryName -match '(?i)(^|/)(?:lab-results|participant-materials|program-and-environment)(?:/|$)') {
        Add-Failure "$entryPath is a quarantined Day 1 source path inside an approved public bundle"
      }
      foreach ($pattern in $script:forbiddenReleasePaths) {
        if ($policyEntryPath -match $pattern) {
          Add-Failure "$entryPath is a retired artifact that must not be published"
          break
        }
      }
      if (Test-ForbiddenBrandedFileName -EntryName $entry.FullName.Replace('\','/')) {
        Add-Failure "$entryPath uses forbidden branded file name"
      }

      $entryStream = $entry.Open()
      try {
        $hash = Get-Sha256Hex $entryStream
      } finally {
        $entryStream.Dispose()
      }
      if ($script:forbiddenHashes.Contains($hash)) {
        Add-Failure "$entryPath contains a forbidden branded visual asset ($hash)"
      }
      if ($entry.FullName -match '(?i)\.pdf$') {
        if (-not $script:reviewedPdfHashes.Contains($hash)) {
          Add-Failure "$entryPath is a public PDF without an approved reviewed SHA-256"
        }
      }

      Test-TextEntry -Entry $entry -DisplayPath $entryPath

      if ($entry.FullName -match '(?i)\.(zip|docx|pptx|xlsx)$') {
        $nestedBuffer = [System.IO.MemoryStream]::new()
        $nestedStream = $entry.Open()
        try {
          $nestedStream.CopyTo($nestedBuffer)
          $nestedBuffer.Position = 0
          Test-Archive -InputStream $nestedBuffer -DisplayPath $entryPath -Depth ($Depth + 1) -PolicyPathPrefix $policyEntryPath -InsideApprovedDayOneBundle $entryInsideApprovedDayOneBundle
        } finally {
          $nestedStream.Dispose()
          $nestedBuffer.Dispose()
        }
      }
    }
  } finally {
    $archive.Dispose()
  }
}

if ($PolicySelfTest) {
  if (-not (Test-PublicHtmlPrefix -Content '<?xml version="1.0"?><html><head></head><body></body></html>')) {
    Fail 'Extensionless XHTML was not classified as public text'
  }
  $neutralExamples = @(
    (Decode-Utf8Base64 '0KPRh9C10LHQvdGL0Lkg0L/RgNC40LzQtdGAOiDQutC+0LzQv9Cw0L3QuNGPINCc0JDQodCa0J7QnCDQstGL0YHRgtGD0L/QsNC10YIg0LfQsNC60LDQt9GH0LjQutC+0Lwg0L/RgNC4INGA0LDQt9Cx0L7RgNC1INC80L7QtNC10LvQuCDRg9Cz0YDQvtC3Lg=='),
    (Decode-Utf8Base64 '0JDQstGC0L7RgCDQutGD0YDRgdCwIOKAlCDQktC40YLQsNC70LjQuSDQn9C40LrQvtCyLiDQo9GH0LXQsdC90YvQuSDQv9GA0LjQvNC10YA6INC60L7QvNC/0LDQvdC40Y8g0JzQkNCh0JrQntCcINCy0YvRgdGC0YPQv9Cw0LXRgiDQt9Cw0LrQsNC30YfQuNC60L7QvC4='),
    'Case study: MASCOM is used as a fictionalized customer in this exercise.'
  )
  foreach ($example in $neutralExamples) {
    if ($null -ne (Find-ForbiddenFormerEmployerClaim -Content $example)) {
      Fail "Neutral teaching example was rejected: $example"
    }
  }
  $forbiddenExamples = @(
    (Decode-Utf8Base64 '0JDQstGC0L7RgCDQu9C10LrRhtC40Lg6INCc0JDQodCa0J7QnC4='),
    (Decode-Utf8Base64 '0JLQuNGC0LDQu9C40Lkg0J/QuNC60L7QsiDigJQg0L/RgNC10L/QvtC00LDQstCw0YLQtdC70Ywg0KPQpiDQnNCQ0KHQmtCe0Jwu'),
    'This course was developed by MASCOM.',
    'Copyright © MASCOM. All rights reserved.',
    'MASCOM course materials.'
  )
  foreach ($example in $forbiddenExamples) {
    if ($null -eq (Find-ForbiddenFormerEmployerClaim -Content $example)) {
      Fail "Incorrect attribution claim was accepted: $example"
    }
  }
  if (Test-ForbiddenBrandedFileName -EntryName 'examples/mascom-case-study.html') {
    Fail 'Neutral example filename was rejected'
  }
  if (-not (Test-ForbiddenBrandedFileName -EntryName 'images/logo-mascom.svg')) {
    Fail 'Branded logo filename was accepted'
  }
  Write-Output 'PUBLIC AFFILIATION POLICY SELF-TEST OK'
  return
}

$rootPath = (Resolve-Path -LiteralPath $Root).Path
$projectPath = Join-Path $rootPath '_PROJECT'
if ([string]::IsNullOrWhiteSpace($ReleaseIndex)) {
  $ReleaseIndex = Get-LatestReleaseIndex $projectPath
}
if (-not (Test-Path -LiteralPath $ReleaseIndex -PathType Leaf)) { Fail "Release index does not exist: $ReleaseIndex" }

$targets = Get-Content -LiteralPath $ReleaseIndex -Encoding UTF8 -Raw | ConvertFrom-Json
foreach ($target in @($targets)) {
  $archivePath = [string]$target.archivePath
  if (-not (Test-Path -LiteralPath $archivePath -PathType Leaf)) {
    Fail "Release archive missing: $archivePath"
  }
  $stream = [System.IO.File]::OpenRead($archivePath)
  try {
    Test-Archive -InputStream $stream -DisplayPath ([string]$target.domain) -Depth 0
  } finally {
    $stream.Dispose()
  }
}

if ($failures.Count -gt 0) {
  throw "PUBLIC INDEPENDENCE TEST FAIL ($($failures.Count) shown):`n- $($failures -join "`n- ")"
}

Write-Output "PUBLIC INDEPENDENCE TEST OK archives=$(@($targets).Count)"
