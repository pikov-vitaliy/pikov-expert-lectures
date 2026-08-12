Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Convert-FromUtf8Base64 {
  param([Parameter(Mandatory = $true)][string]$Base64)
  return [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String($Base64))
}

$siteRoot = Split-Path -Parent $PSScriptRoot
$downloadsRoot = Join-Path $siteRoot 'downloads'
$dayRoot = Join-Path $downloadsRoot 'day-02'
$transcripts = Join-Path $dayRoot 'transcripts'
$participantMaterials = Join-Path $dayRoot 'participant-materials'
$materialsRoot = Join-Path $siteRoot 'materials'

foreach ($requiredPath in @($dayRoot, $transcripts, $participantMaterials, $materialsRoot)) {
  if (-not (Test-Path -LiteralPath $requiredPath -PathType Container)) {
    throw "Missing required directory: $requiredPath"
  }
}

$authorMaterialNames = @(
  (Convert-FromUtf8Base64 'MjAyNi0wOC0xMi3QtNC10L3RjC0yLdC80LXRgtC+0LTQuNGH0LXRgdC60LjQuS3QutC+0L3RgdC/0LXQutGCLm1k'),
  (Convert-FromUtf8Base64 '0L/RgNCw0LrRgtC40LrRg9C8LdC00LXQvdGMLTIt0L3QsNCx0L7RgC3Qt9Cw0LTQsNC90LjQuS5tZA=='),
  (Convert-FromUtf8Base64 '0LjRgdGC0L7Rh9C90LjQutC4LdC4LdCy0LXRgNGB0LjQuC3QtNC10L3RjC0yLm1k'),
  (Convert-FromUtf8Base64 '0LTQtdC90YwtMi3QstC10LEt0YHQu9Cw0LnQtNGLLUFwcFNlYy1TU0RMQy3QuC3QmNCYLm1k')
)
$authorMaterialPaths = foreach ($name in $authorMaterialNames) {
  $path = Join-Path $materialsRoot $name
  if (-not (Test-Path -LiteralPath $path -PathType Leaf)) {
    throw "Missing Day 2 author material: $path"
  }
  $path
}

function Assert-PublicTree {
  param([Parameter(Mandatory = $true)][string[]]$Path)

  $forbidden = Get-ChildItem -LiteralPath $Path -File -Recurse | Where-Object {
    $_.Extension -in @('.txt', '.jpg', '.jpeg', '.png', '.webp')
  }
  if ($forbidden) {
    $names = ($forbidden | ForEach-Object FullName) -join [Environment]::NewLine
    throw "Day 2 public package contains forbidden raw text or image files:`n$names"
  }
}

function New-DayTwoArchive {
  param(
    [Parameter(Mandatory = $true)][string]$Destination,
    [Parameter(Mandatory = $true)][string[]]$Path
  )

  Remove-Item -LiteralPath $Destination -Force -ErrorAction SilentlyContinue
  Compress-Archive -LiteralPath $Path -DestinationPath $Destination -CompressionLevel Optimal -Force
}

function Get-RelativeForwardSlashPath {
  param(
    [Parameter(Mandatory = $true)][string]$BasePath,
    [Parameter(Mandatory = $true)][string]$FullPath
  )

  $base = [System.IO.Path]::GetFullPath($BasePath).TrimEnd('\') + '\'
  $full = [System.IO.Path]::GetFullPath($FullPath)
  if (-not $full.StartsWith($base, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "File is outside the expected directory: $FullPath"
  }
  return $full.Substring($base.Length).Replace('\', '/')
}

Assert-PublicTree -Path (@($transcripts, $participantMaterials) + $authorMaterialPaths)

# Keep draft and primary archives from re-entering the public release.
@(
  'day-02-slides-original.zip',
  'day-02-full-source-package.zip',
  'day-02-transcripts-original.zip',
  'day-02-group-submissions.zip',
  'day-02-SHA256SUMS.txt'
) | ForEach-Object {
  Remove-Item -LiteralPath (Join-Path $downloadsRoot $_) -Force -ErrorAction SilentlyContinue
}

$archives = @(
  @{ Name = 'day-02-edited-transcript-and-protocol.zip'; Paths = @($transcripts) },
  @{ Name = 'day-02-laboratory-materials.zip'; Paths = @($participantMaterials) },
  @{ Name = 'day-02-public-materials.zip'; Paths = @($transcripts, $participantMaterials) + $authorMaterialPaths }
)

$checksumLines = New-Object System.Collections.Generic.List[string]
foreach ($archive in $archives) {
  $destination = Join-Path $downloadsRoot $archive.Name
  New-DayTwoArchive -Destination $destination -Path $archive.Paths
  $hash = (Get-FileHash -LiteralPath $destination -Algorithm SHA256).Hash
  $size = (Get-Item -LiteralPath $destination).Length
  $checksumLines.Add("$hash  $($archive.Name)  $size bytes")
  Write-Output "BUILT $($archive.Name) $size bytes"
}

$checksumDocument = @(
  (Convert-FromUtf8Base64 'IyDQmtC+0L3RgtGA0L7Qu9GM0L3Ri9C1INGB0YPQvNC80YsgU0hBLTI1NiDigJQg0LzQsNGC0LXRgNC40LDQu9GLINCy0YLQvtGA0L7Qs9C+INC00L3Rjw=='),
  '',
  (Convert-FromUtf8Base64 'PiBaSVAt0L/QsNC60LXRgtGLINGB0L7QtNC10YDQttCw0YIg0YLQvtC70YzQutC+INC90L7RgNC80LDQu9C40LfQvtCy0LDQvdC90YvQtSBNYXJrZG93bi3QvNCw0YLQtdGA0LjQsNC70Ysg0Lgg0LDQstGC0L7RgNGB0LrQuNC5INC70L7QutCw0LvRjNC90YvQuSBmaXh0dXJlLiDQkiDQvdC40YUg0L3QtdGCIHJhdy1BU1IgVFhULCDQuNGB0YXQvtC00L3Ri9GFINC40LfQvtCx0YDQsNC20LXQvdC40Lkg0YHQu9Cw0LnQtNC+0LIg0LjQu9C4INC00L7QutGD0LzQtdC90YLQvtCyINC/0L7QtNCz0YDRg9C/0L8u'),
  '',
  '```text'
) + @($checksumLines) + @('```')
[System.IO.File]::WriteAllText((Join-Path $downloadsRoot 'day-02-SHA256SUMS.md'), ($checksumDocument -join [Environment]::NewLine), (New-Object System.Text.UTF8Encoding($false)))

$dayFiles = @($transcripts, $participantMaterials) | ForEach-Object {
  Get-ChildItem -LiteralPath $_ -File -Recurse
} | Sort-Object FullName | ForEach-Object {
  [pscustomobject]@{
    path = Get-RelativeForwardSlashPath -BasePath $dayRoot -FullPath $_.FullName
    bytes = $_.Length
    sha256 = (Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash
  }
}
$authorFiles = $authorMaterialPaths | ForEach-Object {
  [pscustomobject]@{
    path = ('materials/' + [System.IO.Path]::GetFileName($_))
    bytes = (Get-Item -LiteralPath $_).Length
    sha256 = (Get-FileHash -LiteralPath $_ -Algorithm SHA256).Hash
  }
}
$files = @($dayFiles + $authorFiles | Sort-Object path)
$manifest = [pscustomobject]@{
  title = (Convert-FromUtf8Base64 '0J/Rg9Cx0LvQuNGH0L3Ri9C1INC80LDRgtC10YDQuNCw0LvRiyDQstGC0L7RgNC+0LPQviDQtNC90Y8g4oCUIDEyINCw0LLQs9GD0YHRgtCwIDIwMjYg0LPQvtC00LA=')
  files = @($files)
}
$manifestText = $manifest | ConvertTo-Json -Depth 4
[System.IO.File]::WriteAllText((Join-Path $downloadsRoot 'day-02-manifest.json'), $manifestText, (New-Object System.Text.UTF8Encoding($false)))
Write-Output "BUILT day-02-manifest.json $($files.Count) files"
