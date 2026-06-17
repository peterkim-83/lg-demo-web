param(
  [string]$RepoRoot = ".",
  [switch]$RequireWorkflowExports
)

$ErrorActionPreference = "Stop"

function Fail([string]$Message) {
  Write-Host "FAIL: $Message" -ForegroundColor Red
  exit 1
}

function Pass([string]$Message) {
  Write-Host "PASS: $Message" -ForegroundColor Green
}

function Info([string]$Message) {
  Write-Host "INFO: $Message" -ForegroundColor Cyan
}

function Get-JsonProperty($Object, [string]$Name) {
  if ($null -eq $Object) { return $null }
  $prop = $Object.PSObject.Properties[$Name]
  if ($null -eq $prop) { return $null }
  return $prop.Value
}

function To-Array($Value) {
  if ($null -eq $Value) { return @() }
  if ($Value -is [System.Array]) { return @($Value) }
  return @($Value)
}

function Assert-Contains([string]$Text, [string]$Needle, [string]$Label) {
  if (-not $Text.Contains($Needle)) {
    Fail "$Label marker missing: $Needle"
  }
  Pass "$Label marker found"
}

$Root = Resolve-Path $RepoRoot
$appPath = Join-Path $Root "app.js"
$registryPath = Join-Path $Root "uc5_component_registry.canonical.json"

if (-not (Test-Path $appPath)) { Fail "app.js not found: $appPath" }
if (-not (Test-Path $registryPath)) { Fail "uc5_component_registry.canonical.json not found: $registryPath" }

$app = Get-Content -Raw -LiteralPath $appPath
$registry = Get-Content -Raw -LiteralPath $registryPath | ConvertFrom-Json -Depth 100

Info "Checking frontend strict canonical markers"
Assert-Contains $app "UC5_CANONICAL_REGISTRY_PATH" "frontend registry loader"
Assert-Contains $app "loadUC5CanonicalComponentRegistry" "frontend registry loader"
Assert-Contains $app "buildUC5TemplateRegistryBundle" "W02 bundle builder"
Assert-Contains $app "buildUC5PayloadPolicyBundle" "W03 payload policy builder"
Assert-Contains $app "formData.append('registry_version', UC5_EXPECTED_COMPONENT_REGISTRY_VERSION)" "registry_version attach"
Assert-Contains $app "formData.append('template_registry_bundle', JSON.stringify(templateRegistryBundle))" "W02 template_registry_bundle attach"
Assert-Contains $app "formData.append('payload_policy_bundle', JSON.stringify(payloadPolicyBundle))" "W03 payload_policy_bundle attach"
Assert-Contains $app "const blueprintFormData = await buildUC5TemplateBlueprintFormData()" "W02 async bundle build"
Assert-Contains $app "const payloadFormData = await buildUC5SlotPayloadSeedFormData()" "W03 async bundle build"

Info "Checking canonical registry shape"
if ($registry.registry_id -ne "uc5_component_registry") { Fail "registry_id mismatch: $($registry.registry_id)" }
if ($registry.registry_version -ne "uc5_component_registry.v1") { Fail "registry_version mismatch: $($registry.registry_version)" }
if (-not $registry.components) { Fail "registry.components missing" }
if (-not $registry.templates) { Fail "registry.templates missing" }

$componentNames = @($registry.components.PSObject.Properties.Name)
if ($componentNames.Count -ne 33) { Fail "component count mismatch. expected=33 actual=$($componentNames.Count)" }
Pass "canonical component count = 33"

$expectedTemplates = @{
  "learning_canvas.core_concept_flow" = 21
  "process_playbook.operational_step_flow" = 20
  "decision_simulator.scenario_decision_flow" = 20
}

$validPayloadFields = @("title", "summary", "body", "items", "cards", "steps", "checklist_items", "options", "key_message")

foreach ($templateId in $expectedTemplates.Keys) {
  $template = Get-JsonProperty $registry.templates $templateId
  if ($null -eq $template) { Fail "template missing: $templateId" }

  $allowedComponents = @(To-Array $template.allowed_components | ForEach-Object { [string]$_ })
  $allowedSlots = @(To-Array $template.allowed_slots | ForEach-Object { [string]$_ })
  $allowedInteractions = @(To-Array $template.allowed_interactions | ForEach-Object { [string]$_ })
  $expectedCount = $expectedTemplates[$templateId]

  if ($allowedComponents.Count -ne $expectedCount) {
    Fail "$templateId allowed component count mismatch. expected=$expectedCount actual=$($allowedComponents.Count)"
  }
  if ($allowedSlots.Count -lt 1) { Fail "$templateId allowed_slots is empty" }
  if ($allowedInteractions.Count -lt 1) { Fail "$templateId allowed_interactions is empty" }

  foreach ($componentType in $allowedComponents) {
    $spec = Get-JsonProperty $registry.components $componentType
    if ($null -eq $spec) { Fail "$templateId component spec missing: $componentType" }

    $componentSlots = @(To-Array $spec.allowed_slots | ForEach-Object { [string]$_ })
    $requiredFields = @(To-Array $spec.required_payload_fields | ForEach-Object { [string]$_ })
    $componentInteractions = @(To-Array $spec.allowed_interactions | ForEach-Object { [string]$_ })

    if ($componentSlots.Count -lt 1) { Fail "$componentType allowed_slots is empty" }
    if ($requiredFields.Count -lt 1) { Fail "$componentType required_payload_fields is empty" }

    foreach ($slot in $componentSlots) {
      if ($allowedSlots -notcontains $slot) { Fail "$componentType has slot not allowed by ${templateId}: $slot" }
    }
    foreach ($field in $requiredFields) {
      if ($validPayloadFields -notcontains $field) { Fail "$componentType has invalid W02 required payload field: $field" }
    }
    foreach ($interaction in $componentInteractions) {
      if ($allowedInteractions -notcontains $interaction) { Fail "$componentType has interaction not allowed by ${templateId}: $interaction" }
    }

    $policy = $spec.payload_policy
    if ($null -eq $policy) { Fail "$componentType payload_policy missing" }
    if ($null -eq $policy.required_non_empty_fields) { Fail "$componentType payload_policy.required_non_empty_fields missing" }
    if ($null -eq $policy.allowed_primary_arrays) { Fail "$componentType payload_policy.allowed_primary_arrays missing" }
    if ($null -eq $policy.preferred_primary_arrays) { Fail "$componentType payload_policy.preferred_primary_arrays missing" }
    if ($null -eq $policy.min_primary_array_items) { Fail "$componentType payload_policy.min_primary_array_items missing" }
    if ($null -eq $policy.quiz) { Fail "$componentType payload_policy.quiz missing" }
  }

  Pass "$templateId virtual W02 template_registry_bundle contract valid"
}

Info "Checking optional workflow export strict markers"
$w02Candidates = @(
  (Join-Path $Root "UC5 _ 02 Template-bound Blueprint Planner.json"),
  (Join-Path $Root "n8n\UC5 _ 02 Template-bound Blueprint Planner.json")
)
$w03Candidates = @(
  (Join-Path $Root "UC5 _ 03 Slot Filling Render Composer.json"),
  (Join-Path $Root "n8n\UC5 _ 03 Slot Filling Render Composer.json")
)

$w02Path = $w02Candidates | Where-Object { Test-Path $_ } | Select-Object -First 1
$w03Path = $w03Candidates | Where-Object { Test-Path $_ } | Select-Object -First 1

if ($w02Path) {
  $w02 = Get-Content -Raw -LiteralPath $w02Path
  Assert-Contains $w02 "template_registry_bundle_required" "W02 strict missing-bundle lock"
  Assert-Contains $w02 "uc5_template_registry_bundle.v1" "W02 bundle version"
  Assert-Contains $w02 "legacy_registry_fallback_used: false" "W02 legacy fallback disabled"
  Assert-Contains $w02 "strict_canonical_mode: true" "W02 strict canonical mode"
} elseif ($RequireWorkflowExports) {
  Fail "W02 workflow export not found beside repo root"
} else {
  Info "W02 workflow export not found; skipped optional workflow marker check"
}

if ($w03Path) {
  $w03 = Get-Content -Raw -LiteralPath $w03Path
  Assert-Contains $w03 "payload_policy_bundle_required" "W03 strict missing-bundle lock"
  Assert-Contains $w03 "uc5_payload_policy_bundle.v1" "W03 payload bundle version"
  Assert-Contains $w03 "legacy_payload_policy_fallback_used: false" "W03 legacy fallback disabled"
  Assert-Contains $w03 "strict_canonical_mode: true" "W03 strict canonical mode"
} elseif ($RequireWorkflowExports) {
  Fail "W03 workflow export not found beside repo root"
} else {
  Info "W03 workflow export not found; skipped optional workflow marker check"
}

Pass "UC5 R2-2H frontend strict canonical contract smoke passed"
