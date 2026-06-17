param(
  [string]$RepoRoot = "."
)

$ErrorActionPreference = "Stop"

function Fail([string]$Message) {
  Write-Host "FAIL: $Message" -ForegroundColor Red
  exit 1
}

function Pass([string]$Message) {
  Write-Host "PASS: $Message" -ForegroundColor Green
}

Set-Location $RepoRoot

$appPath = Join-Path (Get-Location) "app.js"
$registryPath = Join-Path (Get-Location) "uc5_component_registry.canonical.json"

if (!(Test-Path $appPath)) { Fail "app.js not found: $appPath" }
if (!(Test-Path $registryPath)) { Fail "uc5_component_registry.canonical.json not found: $registryPath" }

$app = Get-Content $appPath -Raw -Encoding UTF8
$registry = Get-Content $registryPath -Raw -Encoding UTF8 | ConvertFrom-Json -Depth 100

$requiredMarkers = @(
  "app.uc5-r2-2h-strict-canonical-frontend-bundle-2026-06-17-v1",
  "[UC5 R2-2H] strict canonical frontend contract patch active",
  "UC5_CANONICAL_REGISTRY_PATH",
  "buildUC5TemplateRegistryBundle",
  "buildUC5PayloadPolicyBundle",
  "formData.append('registry_version', UC5_EXPECTED_COMPONENT_REGISTRY_VERSION)",
  "formData.append('template_registry_bundle', JSON.stringify(templateRegistryBundle))",
  "formData.append('payload_policy_bundle', JSON.stringify(payloadPolicyBundle))",
  "[UC5 R2-2H] W02 template_registry_bundle attached",
  "[UC5 R2-2H] W03 payload_policy_bundle attached"
)

foreach ($marker in $requiredMarkers) {
  if (!$app.Contains($marker)) { Fail "missing app.js marker: $marker" }
  Pass "marker found: $marker"
}

if ($registry.registry_id -ne "uc5_component_registry") { Fail "registry_id mismatch: $($registry.registry_id)" }
if ($registry.registry_version -ne "uc5_component_registry.v1") { Fail "registry_version mismatch: $($registry.registry_version)" }

if (!$registry.components) { Fail "registry.components missing" }
if (!$registry.templates) { Fail "registry.templates missing" }

$componentCount = ($registry.components.PSObject.Properties | Measure-Object).Count
$templateCount = ($registry.templates.PSObject.Properties | Measure-Object).Count

if ($componentCount -ne 33) { Fail "expected 33 canonical components, actual=$componentCount" }
if ($templateCount -lt 3) { Fail "expected at least 3 templates, actual=$templateCount" }

$requiredTemplates = @(
  "learning_canvas.core_concept_flow",
  "process_playbook.operational_step_flow",
  "decision_simulator.scenario_decision_flow"
)

foreach ($templateId in $requiredTemplates) {
  $template = $registry.templates.$templateId
  if (!$template) { Fail "missing template registry: $templateId" }
  if (!$template.allowed_components -or $template.allowed_components.Count -lt 1) {
    Fail "template allowed_components empty: $templateId"
  }
  Pass "template registry valid: $templateId allowed_components=$($template.allowed_components.Count)"
}

Pass "registry valid: components=$componentCount templates=$templateCount"
Write-Host "PASS: UC5 R2-2H frontend strict canonical reapply verification passed" -ForegroundColor Green
