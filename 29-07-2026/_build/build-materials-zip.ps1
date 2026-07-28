[CmdletBinding()]
param(
    [string]$Python
)

$ErrorActionPreference = 'Stop'
$scriptPath = Join-Path $PSScriptRoot 'build-materials-zip.py'

if ($Python) {
    & $Python $scriptPath
    exit $LASTEXITCODE
}

$pyLauncher = Get-Command py -ErrorAction SilentlyContinue
if ($pyLauncher) {
    & $pyLauncher.Source -3 $scriptPath
    exit $LASTEXITCODE
}

$pythonCommand = Get-Command python -ErrorAction SilentlyContinue
if ($pythonCommand) {
    & $pythonCommand.Source $scriptPath
    exit $LASTEXITCODE
}

throw 'Python 3 not found. Pass the interpreter path with -Python.'
