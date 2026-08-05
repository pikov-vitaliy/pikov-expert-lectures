[CmdletBinding()]
param(
    [string]$Root = (Split-Path -Parent $PSScriptRoot)
)

$ErrorActionPreference = 'Stop'

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
        throw "Не найден исходный файл: $Source"
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

function New-OfflinePackage {
    param(
        [Parameter(Mandatory)][ValidateSet('scanner', 'inspector', 'all')][string]$Package,
        [Parameter(Mandatory)][string]$ArchiveName
    )

    $packageRoot = Join-Path $stageRoot $Package
    [void](New-Item -ItemType Directory -Path $packageRoot -Force)

    Copy-FileChecked -Source (Join-Path (Join-Path $offlineRoot $Package) 'index.html') -Destination (Join-Path $packageRoot 'index.html')
    foreach ($assetName in @('site.css', 'site.js', 'scanner-inspector-hero.png')) {
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
    Compress-Archive -Path (Join-Path $packageRoot '*') -DestinationPath $archivePath -CompressionLevel Optimal -Force
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
