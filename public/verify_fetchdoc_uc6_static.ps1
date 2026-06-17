param(
  [string]$Root = (Get-Location).Path
)

$ErrorActionPreference = 'Stop'
Set-Location $Root

if (-not (Test-Path ".\verify_fetchdoc_uc6_static.js")) {
  throw "verify_fetchdoc_uc6_static.js not found in $Root"
}

$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) {
  throw "Node.js is required to run verify_fetchdoc_uc6_static.js"
}

node ".\verify_fetchdoc_uc6_static.js"

if (-not (Test-Path ".\fetchdoc_uc6_static_check_result.json")) {
  throw "fetchdoc_uc6_static_check_result.json was not created"
}

Write-Host "UC6 static verification completed: fetchdoc_uc6_static_check_result.json"
