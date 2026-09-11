Set-StrictMode -Version Latest

Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$script:DeterministicArchiveTextExtensions = @(
  '.asm', '.bat', '.c', '.cc', '.cfg', '.cjs', '.conf', '.cpp', '.cs', '.css',
  '.csv', '.h', '.hpp', '.htm', '.html', '.ini', '.java', '.js', '.json',
  '.jsonld', '.log', '.md', '.mjs', '.pas', '.properties', '.ps1', '.py',
  '.sh', '.sql', '.svg', '.toml', '.ts', '.tsx', '.ttl', '.txt', '.xml',
  '.yaml', '.yml'
)

$script:DeterministicArchiveTextLeafNames = @(
  '.gitignore', '.gitattributes', '.htaccess', 'dockerfile', 'makefile',
  'robots.txt'
)

function Test-DeterministicArchiveTextFile {
  param([Parameter(Mandatory = $true)][string]$Path)

  $leaf = [System.IO.Path]::GetFileName($Path).ToLowerInvariant()
  if ($script:DeterministicArchiveTextLeafNames -contains $leaf) { return $true }
  return $script:DeterministicArchiveTextExtensions -contains [System.IO.Path]::GetExtension($leaf)
}

function Get-DeterministicArchiveBytes {
  param(
    [Parameter(Mandatory = $true)][string]$Path,
    [switch]$PreserveBytes
  )

  if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
    throw "Archive source file is missing: $Path"
  }

  $bytes = [System.IO.File]::ReadAllBytes($Path)
  if ($PreserveBytes) { return ,$bytes }
  if (-not (Test-DeterministicArchiveTextFile -Path $Path)) { return ,$bytes }

  $utf8 = New-Object System.Text.UTF8Encoding($false, $true)
  try {
    $text = $utf8.GetString($bytes)
  }
  catch {
    throw "Published text file is not valid UTF-8: $Path"
  }
  if ($text.Length -gt 0 -and $text[0] -eq [char]0xFEFF) {
    $text = $text.Substring(1)
  }
  $text = $text.Replace("`r`n", "`n").Replace("`r", "`n")
  return ,$utf8.GetBytes($text)
}

function Get-DeterministicPreserveBytesPaths {
  param([string[]]$Paths = @())

  $normalizedPaths = @()
  foreach ($path in $Paths) {
    $relative = $path.Replace('\', '/')
    if ([string]::IsNullOrWhiteSpace($relative) -or
        [System.IO.Path]::IsPathRooted($relative) -or
        $relative -match '(^|/)\.\.?(?:/|$)|//|[:*?<>|"]' -or
        $relative.EndsWith('/')) {
      throw "Byte-preservation path must be an exact relative file path: $path"
    }
    if ($normalizedPaths -ccontains $relative) {
      throw "Duplicate byte-preservation path: $path"
    }
    $normalizedPaths += $relative
  }
  return $normalizedPaths
}

function Get-DeterministicSha256 {
  param([Parameter(Mandatory = $true)][byte[]]$Bytes)

  $algorithm = [System.Security.Cryptography.SHA256]::Create()
  try {
    return ([System.BitConverter]::ToString($algorithm.ComputeHash($Bytes))).Replace('-', '')
  }
  finally {
    $algorithm.Dispose()
  }
}

function Get-DeterministicFileSha256 {
  param([Parameter(Mandatory = $true)][string]$Path)

  return Get-DeterministicSha256 -Bytes ([System.IO.File]::ReadAllBytes($Path))
}

function Write-DeterministicUtf8Text {
  param(
    [Parameter(Mandatory = $true)][string]$Path,
    [AllowEmptyString()][Parameter(Mandatory = $true)][string]$Text,
    [switch]$TrailingNewline
  )

  $normalized = $Text.Replace("`r`n", "`n").Replace("`r", "`n")
  if ($TrailingNewline) {
    $normalized = $normalized.TrimEnd("`n") + "`n"
  }
  [System.IO.File]::WriteAllText(
    $Path,
    $normalized,
    (New-Object System.Text.UTF8Encoding($false))
  )
}

function Get-DeterministicArchiveFileRecord {
  param(
    [Parameter(Mandatory = $true)][string]$Path,
    [Parameter(Mandatory = $true)][string]$ArchivePath,
    [string[]]$PreserveBytesPaths = @()
  )

  $normalizedArchivePath = $ArchivePath.Replace('\', '/')
  if ([System.IO.Path]::IsPathRooted($normalizedArchivePath) -or
      $normalizedArchivePath -match '(^|/)\.\.(/|$)') {
    throw "Unsafe archive path: $ArchivePath"
  }
  $preservePaths = @(Get-DeterministicPreserveBytesPaths -Paths $PreserveBytesPaths)
  $bytes = Get-DeterministicArchiveBytes -Path $Path -PreserveBytes:($preservePaths -ccontains $normalizedArchivePath)
  return [pscustomobject]@{
    path = $normalizedArchivePath
    bytes = $bytes.Length
    sha256 = Get-DeterministicSha256 -Bytes $bytes
  }
}

function ConvertTo-DeterministicArchiveTree {
  param(
    [Parameter(Mandatory = $true)][string]$Root,
    [string[]]$PreserveBytesPaths = @()
  )

  $preservePaths = @(Get-DeterministicPreserveBytesPaths -Paths $PreserveBytesPaths)
  $rootPath = (Get-Item -LiteralPath $Root -Force).FullName
  $prefix = [System.IO.Path]::GetFullPath($rootPath).TrimEnd('\', '/') + [System.IO.Path]::DirectorySeparatorChar
  $files = @(Get-ChildItem -LiteralPath $rootPath -Recurse -File -Force)
  $relativePaths = @($files | ForEach-Object {
    $full = [System.IO.Path]::GetFullPath($_.FullName)
    if (-not $full.StartsWith($prefix, [System.StringComparison]::OrdinalIgnoreCase)) {
      throw "Archive source escaped the expected root: $full"
    }
    $full.Substring($prefix.Length).Replace('\', '/')
  })
  foreach ($preserved in $preservePaths) {
    if ($relativePaths -cnotcontains $preserved) {
      throw "Byte-preservation file is missing or its case differs: $preserved"
    }
  }
  for ($index = 0; $index -lt $files.Count; $index++) {
    $file = $files[$index]
    if ($preservePaths -ccontains $relativePaths[$index]) { continue }
    if (-not (Test-DeterministicArchiveTextFile -Path $file.FullName)) { continue }
    $bytes = Get-DeterministicArchiveBytes -Path $file.FullName
    [System.IO.File]::WriteAllBytes($file.FullName, $bytes)
  }
}

function New-DeterministicArchive {
  param(
    [Parameter(Mandatory = $true)][string]$SourceRoot,
    [Parameter(Mandatory = $true)][string]$Destination,
    [string[]]$PreserveBytesPaths = @()
  )

  $preservePaths = @(Get-DeterministicPreserveBytesPaths -Paths $PreserveBytesPaths)
  $root = [System.IO.Path]::GetFullPath($SourceRoot).TrimEnd('\', '/')
  if (-not (Test-Path -LiteralPath $root -PathType Container)) {
    throw "Archive source directory is missing: $SourceRoot"
  }
  # Align Windows 8.3 input aliases with the FullName values used below.
  $root = [System.IO.Path]::GetFullPath((Get-Item -LiteralPath $root -Force).FullName).TrimEnd('\', '/')

  $reparsePoint = @(Get-ChildItem -LiteralPath $root -Recurse -Force | Where-Object {
    ($_.Attributes -band [System.IO.FileAttributes]::ReparsePoint) -ne 0
  } | Select-Object -First 1)
  if ($reparsePoint.Count -gt 0) {
    throw "Archive source contains a reparse point: $($reparsePoint[0].FullName)"
  }

  $prefix = $root + [System.IO.Path]::DirectorySeparatorChar
  $sourcesByPath = @{}
  foreach ($file in @(Get-ChildItem -LiteralPath $root -Recurse -File -Force)) {
    $full = [System.IO.Path]::GetFullPath($file.FullName)
    if (-not $full.StartsWith($prefix, [System.StringComparison]::OrdinalIgnoreCase)) {
      throw "Archive source escaped the expected root: $full"
    }
    $relative = $full.Substring($prefix.Length).Replace('\', '/')
    if ($sourcesByPath.ContainsKey($relative)) {
      throw "Duplicate archive path: $relative"
    }
    $sourcesByPath[$relative] = $full
  }

  [string[]]$relativePaths = @($sourcesByPath.Keys)
  [System.Array]::Sort($relativePaths, [System.StringComparer]::Ordinal)
  foreach ($preserved in $preservePaths) {
    if ($relativePaths -cnotcontains $preserved) {
      throw "Byte-preservation file is missing or its case differs: $preserved"
    }
  }
  $destinationFull = [System.IO.Path]::GetFullPath($Destination)
  $destinationParent = [System.IO.Path]::GetDirectoryName($destinationFull)
  if (-not (Test-Path -LiteralPath $destinationParent -PathType Container)) {
    New-Item -ItemType Directory -Path $destinationParent -Force | Out-Null
  }
  $temporary = $destinationFull + '.tmp-' + [System.Guid]::NewGuid().ToString('N')
  # ZIP/DOS timestamps cannot represent dates before 1980. A constant epoch,
  # explicit entry order and explicit Unix mode remove checkout mtimes and
  # filesystem enumeration order from the archive bytes.
  $fixedTimestamp = [System.DateTimeOffset]([System.DateTime]::SpecifyKind(
    [datetime]'1980-01-01T00:00:00', [System.DateTimeKind]::Utc))

  try {
    $fileStream = New-Object System.IO.FileStream(
      $temporary,
      [System.IO.FileMode]::CreateNew,
      [System.IO.FileAccess]::ReadWrite,
      [System.IO.FileShare]::None
    )
    try {
      $archive = New-Object System.IO.Compression.ZipArchive(
        $fileStream,
        [System.IO.Compression.ZipArchiveMode]::Create,
        $true,
        [System.Text.Encoding]::UTF8
      )
      try {
        foreach ($relative in $relativePaths) {
          $entry = $archive.CreateEntry($relative, [System.IO.Compression.CompressionLevel]::Optimal)
          $entry.LastWriteTime = $fixedTimestamp
          # 0100644 << 16 represented as a signed Int32 for Windows PowerShell
          # 5.1, where casting the hexadecimal value itself can overflow.
          $entry.ExternalAttributes = [int]-2119958528
          $entryStream = $entry.Open()
          try {
            $bytes = Get-DeterministicArchiveBytes `
              -Path ([string]$sourcesByPath[$relative]) `
              -PreserveBytes:($preservePaths -ccontains $relative)
            $entryStream.Write($bytes, 0, $bytes.Length)
          }
          finally {
            $entryStream.Dispose()
          }
        }
      }
      finally {
        $archive.Dispose()
      }
    }
    finally {
      $fileStream.Dispose()
    }

    $verify = [System.IO.Compression.ZipFile]::OpenRead($temporary)
    try {
      $actual = @($verify.Entries | ForEach-Object { $_.FullName })
      if ($actual.Count -ne $relativePaths.Count) {
        throw "Archive entry count mismatch: $($actual.Count) != $($relativePaths.Count)"
      }
      for ($index = 0; $index -lt $relativePaths.Count; $index++) {
        if ($actual[$index] -cne $relativePaths[$index]) {
          throw "Archive entry order or path mismatch: $($actual[$index]) != $($relativePaths[$index])"
        }
        $stream = $verify.Entries[$index].Open()
        try {
          $buffer = New-Object byte[] 8192
          while ($stream.Read($buffer, 0, $buffer.Length) -gt 0) { }
        }
        finally {
          $stream.Dispose()
        }
      }
    }
    finally {
      $verify.Dispose()
    }

    if (Test-Path -LiteralPath $destinationFull) {
      Remove-Item -LiteralPath $destinationFull -Force
    }
    Move-Item -LiteralPath $temporary -Destination $destinationFull
  }
  finally {
    Remove-Item -LiteralPath $temporary -Force -ErrorAction SilentlyContinue
  }
}
