param(
  [string]$Root = (Split-Path -Parent $PSScriptRoot),
  [string]$ReleaseIndex = ''
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression

function Fail([string]$Message) {
  throw "PUBLIC INDEPENDENCE TEST FAIL: $Message"
}

function Get-LatestReleaseIndex([string]$ProjectPath) {
  $candidate = Get-ChildItem -LiteralPath $ProjectPath -Filter 'RELEASE_INDEX_????-??-??.json' -File |
    Sort-Object LastWriteTime, Name |
    Select-Object -Last 1
  if ($null -eq $candidate) { Fail "No RELEASE_INDEX_YYYY-MM-DD.json under $ProjectPath" }
  return $candidate.FullName
}

$forbiddenText = @(
  '(?i)\u043c\u0430\u0441\u043a\u043e\u043c',
  '(?i)mascom',
  '(?i)\u043c\u0430\u0441com',
  '(?i)\u0423\u0426\u0411\u0418',
  '(?i)\u041d\u041e\u0423\s+\u0414\u041f\u041e',
  '(?i)\u0421\u0442\u0430\u0440\u043e\u043a\u0430\u043b\u0443\u0436\u0441\u043a\u043e\u0435\s+\u0448\u043e\u0441\u0441\u0435',
  '(?i)280-01-06'
)

# These SHA-256 values identify the former MАСКОМ logo, its TЗ variant, and
# the branded classroom background. Matching the bytes protects direct URLs
# even when an HTML reference has already been removed.
$forbiddenHashes = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::OrdinalIgnoreCase)
@(
  '9969676d6bf86f114b1d9b4a06b11d0bf5a7ca319df603d2a3fd494d2ebf1fa2',
  '49137f9ce8b6ddd2806daa1576884e8fd0539bda724eccdf9dc5ac2b979f7d17',
  '3e2297ac5b5d9858e23782b7fe5c7a616d770128df999f3765c8ca67e01c4311',
  '1206d0daa1de064ee881a7f63c05ba824d047e057c423c7e513e863dd64d393c'
) | ForEach-Object { [void]$forbiddenHashes.Add($_) }

$textExtensions = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::OrdinalIgnoreCase)
@('.html', '.htm', '.md', '.markdown', '.txt', '.json', '.jsonld', '.css', '.js', '.mjs', '.svg', '.xml', '.yml', '.yaml', '.csv') |
  ForEach-Object { [void]$textExtensions.Add($_) }

# Public PDFs do not expose source text through the archive API. Their
# manually reviewed SHA-256 values are pinned here; a new or changed PDF fails
# closed until its text and visual provenance have been reviewed explicitly.
$reviewedPdfHashes = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::OrdinalIgnoreCase)
@(
  '251c5d734a73b94ac43577e2a7234bedd943f2b172461cdbd45ac043304e19ef',
  '2826c15b97cc7ffeada52f2000a4b0712a7cf4a81a38d7ba4087de350049c350',
  '39241a1dab8f38ee8fa5d9b898078a8b8af30c98b7251c167f8b1f555cfb66d2',
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
  if (-not $script:textExtensions.Contains($extension) -and $Entry.Name -ne '.gitkeep') { return }
  $stream = $Entry.Open()
  $reader = [System.IO.StreamReader]::new($stream, [System.Text.UTF8Encoding]::new($false, $false), $true)
  try {
    $content = $reader.ReadToEnd()
  } finally {
    $reader.Dispose()
  }
  # The VКР deck may retain exactly three user-approved historical examples. Every
  # other company reference there remains forbidden, including a provider,
  # employer, contact, or new slide text.
  if ($DisplayPath -match '^vkr\.pikov\.expert!index\.html$') {
    $allowedHistorical = [regex]::Matches(
      $content,
      '(?i)(?:\u044d\u043a\u0441\u043f\u0435\u0440\u0442|\u0430\u043a\u0442\s+\u043e\s+\u0432\u043d\u0435\u0434\u0440\u0435\u043d\u0438\u0438\s+\u0432)\s+\u0413\u041a\s+\u00ab?\u043c\u0430\u0441\u043a\u043e\u043c\u00bb?'
    )
    if ($allowedHistorical.Count -ne 3) {
      Add-Failure "$DisplayPath must contain exactly the three approved historical company examples, found $($allowedHistorical.Count)"
    }
    foreach ($brandMatch in [regex]::Matches($content, '(?i)\u043c\u0430\u0441\u043a\u043e\u043c')) {
      $permitted = @($allowedHistorical | Where-Object {
        $brandMatch.Index -ge $_.Index -and $brandMatch.Index -lt ($_.Index + $_.Length)
      })
      if ($permitted.Count -eq 0) {
        Add-Failure "$DisplayPath contains a non-historical company reference"
      }
    }
    foreach ($pattern in @($script:forbiddenText | Where-Object { $_ -notmatch '\\u043c\\u0430\\u0441\\u043a\\u043e\\u043c' })) {
      $match = [regex]::Match($content, $pattern)
      if ($match.Success) {
        Add-Failure "$DisplayPath contains forbidden public branding: $($match.Value)"
      }
    }
    return
  }
  foreach ($pattern in $script:forbiddenText) {
    $match = [regex]::Match($content, $pattern)
    if ($match.Success) {
      Add-Failure "$DisplayPath contains forbidden public branding: $($match.Value)"
      break
    }
  }
}

function Test-Archive([System.IO.Stream]$InputStream, [string]$DisplayPath, [int]$Depth) {
  if ($Depth -gt 4) { Fail "Nested archive depth exceeded at $DisplayPath" }
  $archive = [System.IO.Compression.ZipArchive]::new($InputStream, [System.IO.Compression.ZipArchiveMode]::Read, $true)
  try {
    foreach ($entry in $archive.Entries) {
      if ([string]::IsNullOrWhiteSpace($entry.Name)) { continue }
      $entryPath = "$DisplayPath!$($entry.FullName.Replace('\','/'))"
      if ($entry.FullName -match '(?i)mascom|маском') {
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
          Test-Archive -InputStream $nestedBuffer -DisplayPath $entryPath -Depth ($Depth + 1)
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
