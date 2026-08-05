[CmdletBinding()]
param(
    [string]$Root
)

$ErrorActionPreference = 'Stop'

if (-not ('ScanerVsZipCrc32' -as [type])) {
    Add-Type -TypeDefinition @'
public static class ScanerVsZipCrc32
{
    public static uint Compute(byte[] data)
    {
        uint crc = 0xFFFFFFFFu;
        foreach (byte value in data)
        {
            crc ^= value;
            for (int bit = 0; bit < 8; bit++)
            {
                crc = (crc & 1u) != 0u
                    ? (crc >> 1) ^ 0xEDB88320u
                    : crc >> 1;
            }
        }
        return ~crc;
    }
}
'@
}

if ([string]::IsNullOrWhiteSpace($Root)) {
    $Root = Split-Path -Parent $PSScriptRoot
}

$repoRoot = (Resolve-Path -LiteralPath $Root).Path
$siteRoot = Join-Path $repoRoot 'scaner-vs'
$materialsRoot = Join-Path $siteRoot 'materials'
$offlineRoot = Join-Path $repoRoot '_PROJECT\scaner-vs-offline'
$downloadsRoot = Join-Path $materialsRoot 'downloads'
$tempBase = [IO.Path]::GetFullPath([IO.Path]::GetTempPath())
$stageRoot = Join-Path $tempBase ('scaner-vs-archives-' + [guid]::NewGuid().ToString('N'))

function Copy-FileChecked {
    param(
        [Parameter(Mandatory)][string]$Source,
        [Parameter(Mandatory)][string]$Destination
    )

    if (-not (Test-Path -LiteralPath $Source -PathType Leaf)) {
        throw "Missing source file: $Source"
    }
    $destinationDirectory = Split-Path -Parent $Destination
    if (-not (Test-Path -LiteralPath $destinationDirectory -PathType Container)) {
        [void](New-Item -ItemType Directory -Path $destinationDirectory -Force)
    }
    Copy-Item -LiteralPath $Source -Destination $Destination -Force
}

function Copy-MarkdownDirectory {
    param(
        [Parameter(Mandatory)][string]$Name,
        [Parameter(Mandatory)][string]$DestinationRoot
    )

    $sourceDirectory = Join-Path $materialsRoot $Name
    $destinationDirectory = Join-Path (Join-Path $DestinationRoot 'materials') $Name
    [void](New-Item -ItemType Directory -Path $destinationDirectory -Force)
    Get-ChildItem -LiteralPath $sourceDirectory -Filter '*.md' -File |
        Sort-Object Name |
        ForEach-Object {
            Copy-Item -LiteralPath $_.FullName -Destination (Join-Path $destinationDirectory $_.Name) -Force
        }
}

function New-DeterministicZip {
    param(
        [Parameter(Mandatory)][string]$SourceRoot,
        [Parameter(Mandatory)][string]$DestinationPath
    )

    if (-not [BitConverter]::IsLittleEndian) {
        throw 'This ZIP writer requires a little-endian runtime.'
    }

    $utf8 = [Text.UTF8Encoding]::new($false)
    $relativePaths = [Collections.Generic.List[string]]::new()
    Get-ChildItem -LiteralPath $SourceRoot -Recurse -File | ForEach-Object {
        $relativePaths.Add($_.FullName.Substring($SourceRoot.Length).TrimStart([char[]]@('\', '/')).Replace('\', '/'))
    }
    $relativePaths.Sort([StringComparer]::Ordinal)

    $archiveStream = $null
    $writer = $null
    try {
        $archiveStream = [IO.File]::Open(
            $DestinationPath,
            [IO.FileMode]::Create,
            [IO.FileAccess]::ReadWrite,
            [IO.FileShare]::None
        )
        $writer = [IO.BinaryWriter]::new($archiveStream, $utf8, $true)
        $entries = [Collections.Generic.List[object]]::new()

        foreach ($relativePath in $relativePaths) {
            $sourcePath = Join-Path $SourceRoot ($relativePath.Replace('/', '\'))
            $data = [IO.File]::ReadAllBytes($sourcePath)
            if ($data.LongLength -gt [uint32]::MaxValue) {
                throw "File is too large for this ZIP writer: $relativePath"
            }
            $nameBytes = $utf8.GetBytes($relativePath)
            if ($nameBytes.Length -gt [uint16]::MaxValue) {
                throw "ZIP entry name is too long: $relativePath"
            }
            $crc32 = [ScanerVsZipCrc32]::Compute($data)
            $size = [uint32]$data.Length
            $offset = [uint32]$archiveStream.Position

            $writer.Write([uint32]0x04034b50)
            $writer.Write([uint16]20)
            $writer.Write([uint16]2048)
            $writer.Write([uint16]0)
            $writer.Write([uint16]0)
            $writer.Write([uint16]10273)
            $writer.Write([uint32]$crc32)
            $writer.Write($size)
            $writer.Write($size)
            $writer.Write([uint16]$nameBytes.Length)
            $writer.Write([uint16]0)
            $writer.Write($nameBytes)
            $writer.Write($data)

            $entries.Add([pscustomobject]@{
                NameBytes = $nameBytes
                Crc32 = [uint32]$crc32
                Size = $size
                Offset = $offset
            })
        }

        $centralOffset = [uint32]$archiveStream.Position
        foreach ($entry in $entries) {
            $writer.Write([uint32]0x02014b50)
            $writer.Write([uint16]20)
            $writer.Write([uint16]20)
            $writer.Write([uint16]2048)
            $writer.Write([uint16]0)
            $writer.Write([uint16]0)
            $writer.Write([uint16]10273)
            $writer.Write([uint32]$entry.Crc32)
            $writer.Write([uint32]$entry.Size)
            $writer.Write([uint32]$entry.Size)
            $writer.Write([uint16]$entry.NameBytes.Length)
            $writer.Write([uint16]0)
            $writer.Write([uint16]0)
            $writer.Write([uint16]0)
            $writer.Write([uint16]0)
            $writer.Write([uint32]0)
            $writer.Write([uint32]$entry.Offset)
            $writer.Write([byte[]]$entry.NameBytes)
        }
        $centralSize = [uint32]($archiveStream.Position - $centralOffset)

        $writer.Write([uint32]0x06054b50)
        $writer.Write([uint16]0)
        $writer.Write([uint16]0)
        $writer.Write([uint16]$entries.Count)
        $writer.Write([uint16]$entries.Count)
        $writer.Write($centralSize)
        $writer.Write($centralOffset)
        $writer.Write([uint16]0)
        $writer.Flush()
    }
    finally {
        if ($null -ne $writer) { $writer.Dispose() }
        if ($null -ne $archiveStream) { $archiveStream.Dispose() }
    }
}

function New-OfflinePackage {
    param(
        [Parameter(Mandatory)][ValidateSet('scanner', 'inspector', 'all')][string]$Package,
        [Parameter(Mandatory)][string]$ArchiveName
    )

    $packageRoot = Join-Path $stageRoot $Package
    [void](New-Item -ItemType Directory -Path $packageRoot -Force)

    Copy-FileChecked -Source (Join-Path (Join-Path $offlineRoot $Package) 'index.html') -Destination (Join-Path $packageRoot 'index.html')
    $assetNames = @('site.css', 'site.js', 'scanner-inspector-hero.png')
    switch ($Package) {
        'scanner' { $assetNames += 'practical-trajectories.png' }
        'inspector' { $assetNames += 'two-level-analysis.png' }
        'all' { $assetNames += @('course-map-two-days.png', 'two-level-analysis.png') }
    }
    foreach ($assetName in $assetNames) {
        Copy-FileChecked -Source (Join-Path (Join-Path $siteRoot 'assets') $assetName) -Destination (Join-Path (Join-Path $packageRoot 'assets') $assetName)
    }

    if ($Package -in @('scanner', 'all')) {
        Copy-MarkdownDirectory -Name 'scanner' -DestinationRoot $packageRoot
    }
    if ($Package -in @('inspector', 'all')) {
        Copy-MarkdownDirectory -Name 'inspector' -DestinationRoot $packageRoot
    }
    if ($Package -eq 'all') {
        Copy-FileChecked -Source (Join-Path (Join-Path $offlineRoot 'all') 'README.md') -Destination (Join-Path (Join-Path $packageRoot 'materials') 'README.md')
    }

    $archivePath = Join-Path $downloadsRoot $ArchiveName
    New-DeterministicZip -SourceRoot $packageRoot -DestinationPath $archivePath
}

try {
    [void](New-Item -ItemType Directory -Path $stageRoot -Force)
    [void](New-Item -ItemType Directory -Path $downloadsRoot -Force)

    New-OfflinePackage -Package 'scanner' -ArchiveName 'scanner-labs-markdown.zip'
    New-OfflinePackage -Package 'inspector' -ArchiveName 'inspector-labs-markdown.zip'
    New-OfflinePackage -Package 'all' -ArchiveName 'all-labs-markdown.zip'

    Get-ChildItem -LiteralPath $downloadsRoot -Filter '*.zip' -File |
        Sort-Object Name |
        Get-FileHash -Algorithm SHA256 |
        ForEach-Object { '{0}  {1}' -f $_.Hash, (Split-Path -Leaf $_.Path) }
}
finally {
    $resolvedStage = [IO.Path]::GetFullPath($stageRoot)
    if ($resolvedStage.StartsWith($tempBase, [StringComparison]::OrdinalIgnoreCase) -and
        (Split-Path -Leaf $resolvedStage).StartsWith('scaner-vs-archives-', [StringComparison]::OrdinalIgnoreCase) -and
        (Test-Path -LiteralPath $resolvedStage -PathType Container)) {
        Remove-Item -LiteralPath $resolvedStage -Recurse -Force
    }
}
