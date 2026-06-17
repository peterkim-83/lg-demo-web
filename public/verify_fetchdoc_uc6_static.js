const fs = require('fs');
const path = require('path');

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));

const result = {
  ok: true,
  checked_at: new Date().toISOString(),
  root,
  checks: [],
  errors: [],
  warnings: []
};

function pass(name, detail = '') {
  result.checks.push({ name, status: 'PASS', detail });
}

function fail(name, detail = '') {
  result.ok = false;
  result.checks.push({ name, status: 'FAIL', detail });
  result.errors.push(`${name}: ${detail}`);
}

function assert(name, condition, detail = '') {
  if (condition) pass(name, detail);
  else fail(name, detail);
}

for (const file of ['index.html', 'app.js', 'style.css', 'pdf-embed.html']) {
  assert(`file_exists:${file}`, exists(file), file);
}

const index = read('index.html');
const app = read('app.js');
const css = read('style.css');

for (const viewId of ['view-home', 'view-uc1', 'view-uc2', 'view-uc3', 'view-uc4', 'view-uc5']) {
  assert(`existing_view_preserved:${viewId}`, index.includes(`id="${viewId}"`), viewId);
}

for (const target of ['view-uc1', 'view-uc2', 'view-uc3', 'view-uc4', 'view-uc5']) {
  assert(`existing_sidebar_or_card_target_preserved:${target}`, index.includes(`data-target="${target}"`), target);
}

const uc6RequiredHtml = [
  'data-target="view-uc6"',
  'id="view-uc6"',
  'id="uc6-pptxInput"',
  'id="uc6-batchSelect"',
  'id="uc6-customBatchId"',
  'id="uc6-sampleCase"',
  'id="uc6-runtimeContextEditor"',
  'id="uc6-runBtn"',
  'id="uc6-resetBtn"',
  'id="uc6-stageTimeline"',
  'id="uc6-templateSummary"',
  'id="uc6-slotTableBody"',
  'id="uc6-readinessSummary"',
  'id="uc6-artifactTableBody"',
  'id="uc6-debugJson"',
  'id="uc6-runtimeContextPreview"',
  'id="uc6-pdfDownloadBtn"',
  'id="uc6-pptxDownloadBtn"'
];

for (const needle of uc6RequiredHtml) {
  assert(`uc6_html_required:${needle}`, index.includes(needle), needle);
}

assert('uc6_sidebar_and_home_card_present', (index.match(/data-target=\"view-uc6\"/g) || []).length >= 2, 'sidebar menu and dashboard home card');

const uc6RequiredApp = [
  'UC6_RUNTIME_DATABAG_PREP_WEBHOOK',
  'UC6_SAMPLE_CASES',
  'UC6_STAGE_MODEL',
  'buildUC6RequestPayload',
  'runUC6DatabagPrep',
  'initUC6()',
  'runtime_render_bridge_pending'
];

for (const needle of uc6RequiredApp) {
  assert(`uc6_app_required:${needle}`, app.includes(needle), needle);
}

const uc6RequiredCss = [
  'UC6 — FetchDoc 문서 생성 운영 관리 Shell',
  '.uc6-dashboard-container',
  '.uc6-top-control-bar',
  '.uc6-stage-strip',
  '.uc6-workbench',
  '.uc6-preview-panel'
];

for (const needle of uc6RequiredCss) {
  assert(`uc6_css_required:${needle}`, css.includes(needle), needle);
}

const configRequired = [
  'UC1_WEBHOOK',
  'UC1_STATUS_WEBHOOK',
  'UC2_WEBHOOK',
  'UC3_START_CALL',
  'UC3_END_CALL',
  'UC4_WEBHOOK',
  'UC5_W01_WEBHOOK',
  'UC5_W02_WEBHOOK',
  'UC5_W03_WEBHOOK',
  'UC6_RUNTIME_DATABAG_PREP_WEBHOOK'
];
for (const key of configRequired) {
  assert(`config_key_present:${key}`, app.includes(key), key);
}

const uc6AppStart = app.indexOf('// 🧾 Use Case 6: FetchDoc 문서 생성 운영 관리');
const uc6AppEnd = app.indexOf('// Keyboard Left/Right Navigation Hook for UC5 V2.1');
const uc6AppBlock = uc6AppStart >= 0 && uc6AppEnd > uc6AppStart ? app.slice(uc6AppStart, uc6AppEnd) : '';
const uc6IndexStart = index.indexOf('id="view-uc6"');
const uc6IndexBlock = uc6IndexStart >= 0 ? index.slice(uc6IndexStart) : '';

const forbiddenInUc6 = [
  'X-Internal-Token',
  'n8n-internal-secret',
  'http://fastapi-app',
  'final_render_output_pptx',
  '/fetchdoc/jobs/',
  'artifact-status',
  '/data/'
];
for (const needle of forbiddenInUc6) {
  assert(`uc6_forbidden_absent:${needle}`, !uc6AppBlock.includes(needle) && !uc6IndexBlock.includes(needle), needle);
}

assert('uc6_endpoint_is_n8n_webhook', app.includes('https://peter-n8n.duckdns.org/webhook/fetchdoc/runtime-databag-prep/mvp'), 'B1 public webhook');
assert('uc6_no_fastapi_direct_endpoint', !uc6AppBlock.includes('fastapi-app') && !uc6AppBlock.includes('127.0.0.1'), 'no direct FastAPI internal call in UC6 block');

fs.writeFileSync(path.join(root, 'fetchdoc_uc6_static_check_result.json'), JSON.stringify(result, null, 2), 'utf8');

if (!result.ok) {
  console.error(JSON.stringify(result, null, 2));
  process.exit(1);
}

console.log(JSON.stringify(result, null, 2));
