$ErrorActionPreference = 'Stop'
& python -X utf8 (Join-Path $PSScriptRoot 'build-package.py')
if ($LASTEXITCODE -ne 0) { throw 'KAPO course package build failed' }
