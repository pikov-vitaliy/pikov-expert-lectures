[CmdletBinding()]
param(
    [string]$Python
)

$ErrorActionPreference = 'Stop'
$scriptPath = Join-Path $PSScriptRoot 'build-materials-zip.py'

if ($Python) {
    & $Python $scriptPath
    if ($LASTEXITCODE -ne 0) {
        throw "materials.zip Python builder failed with exit code $LASTEXITCODE"
    }
    return
}

$pyLauncher = Get-Command py -ErrorAction SilentlyContinue
if ($pyLauncher) {
    & $pyLauncher.Source -3 $scriptPath
    if ($LASTEXITCODE -ne 0) {
        throw "materials.zip Python builder failed with exit code $LASTEXITCODE"
    }
    return
}

$pythonCommand = Get-Command python -ErrorAction SilentlyContinue
if ($pythonCommand) {
    & $pythonCommand.Source $scriptPath
    if ($LASTEXITCODE -ne 0) {
        throw "materials.zip Python builder failed with exit code $LASTEXITCODE"
    }
    return
}

throw 'Python 3 not found. Pass the interpreter path with -Python.'
