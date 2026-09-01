import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  UC6_BROWSER_ADMIN_ENDPOINTS,
  createUc6BrowserAdminApi,
  normalizeUc6ApiBaseUrl,
  parseUc6PublicErrorPayload,
  parseUc6JobEventFrame,
  projectUc6BootstrapMutationControl,
  projectUc6CanonicalJob,
  projectUc6FinalDeliveryCapabilities,
  projectUc6FreshSyntheticScenarioBinding,
  projectUc6FreshSyntheticGenerationSubmission,
  projectUc6FreshSyntheticRenderSubmission,
  projectUc6OnboardingObservationControl,
  projectUc6MutationObservationControl,
  projectUc6PersonaBindingMutationControl,
  projectUc6PersistedState,
  projectUc6PublicationMutationControl,
  projectUc6FreshSyntheticScenarios,
  projectUc6ReusableAssetRuntimeBootstrap,
  validateUc6SyntheticScenarioBindingCommand,
  validateUc6ReusableAssetBootstrapCommand,
  validateUc6ReusableAssetPublicationCommand
} from '../public/uc6-browser-admin.mjs';

const API = 'http://127.0.0.1:8787/';
const JOB = 'fd_uc6_admin_test_job_001';
const ASSET = `reusable_template_asset__${'a'.repeat(40)}`;
const OTHER_ASSET = `reusable_template_asset__${'c'.repeat(40)}`;
const SHA = 'b'.repeat(64);
const PERSONA_CATALOG_SCHEMA = 'uc6_postprod_q4_r3e_3g_browser_admin_fresh_selected_persona_options_v1';
const PERSONA_BINDING_SCHEMA = 'uc6_postprod_q4_r3e_3e_browser_admin_fresh_selected_persona_selection_projection_v1';
const SOURCE_GENERATION_SCHEMA = 'uc6_postprod_q4_r3e_3g_browser_admin_fresh_selected_persona_source_generation_submission_v1';
const SOURCE_GENERATION_TASK = 'fetchdoc_browser_admin_uc6_fresh_synthetic_scenario_generation';
const RENDER_SUBMISSION_SCHEMA = 'uc6_postprod_q4_r3e_3g_browser_admin_fresh_selected_persona_render_submission_v1';
const RENDER_SUBMISSION_TASK = 'fetchdoc_browser_admin_uc6_render_fresh_synthetic_scenario';
const RUNTIME_BOOTSTRAP_SCHEMA = 'uc6_fresh_published_asset_runtime_bootstrap_projection_v1';
const CONTRACT = 'uc6_11c8r2_browser_admin_uc6_control_plane_v1';

const PERSONA = Object.freeze({
  scenario_key: 'executive',
  label: 'Executive',
  scenario_summary: 'Executive summary focus',
  differentiation_basis: { emphasis: 'outcomes' }
});

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function response(body = {}, status = 200, contentType = 'application/json') {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (name) => name.toLowerCase() === 'content-type' ? contentType : null },
    body: contentType.startsWith('text/event-stream') ? { getReader() {} } : null,
    async json() { return body; }
  };
}

function createApi(fetchImpl, tokenCalls = []) {
  return createUc6BrowserAdminApi({
    apiBaseUrl: API,
    allowLoopbackHttp: true,
    fetchImpl,
    getIdToken: async (refresh) => { tokenCalls.push(refresh); return refresh ? 'token-refreshed' : 'token-current'; }
  });
}

function sourceBlock(source, start, end) {
  const startIndex = source.indexOf(start);
  const endIndex = source.indexOf(end, startIndex + start.length);
  assert.ok(startIndex >= 0 && endIndex > startIndex, `missing source block: ${start}`);
  return source.slice(startIndex, endIndex);
}

test('API base accepts production HTTPS and explicit loopback HTTP only', () => {
  assert.equal(normalizeUc6ApiBaseUrl('https://api.peter-n8n.duckdns.org'), 'https://api.peter-n8n.duckdns.org/');
  assert.equal(normalizeUc6ApiBaseUrl(API, { allowLoopbackHttp: true }), API);
  assert.throws(() => normalizeUc6ApiBaseUrl('http://example.com/'));
});

test('public error parsing exposes only allowlisted copy, never raw backend content', () => {
  const raw = '<html>C:\\internal\\jobs secret-token authorization: bearer private</html>';
  const projected = parseUc6PublicErrorPayload({ detail: { code: 'unknown_backend_code', message: raw }, raw }, 500);
  assert.equal(projected.code, 'unknown_public_error');
  assert.equal(projected.status, 500);
  assert.equal(projected.message.includes('internal'), false);
  assert.equal(projected.message.includes('token'), false);
  assert.equal(projected.message.includes('<html>'), false);
});

test('canonical route map is exact and dead route builders are absent', () => {
  assert.deepEqual(Object.keys(UC6_BROWSER_ADMIN_ENDPOINTS).sort(), [
    'job', 'jobEvents', 'jobs', 'onboarding', 'renderArtifactCapabilities', 'reusableAssetJobs',
    'reusableAssetPublication', 'reusableAssets', 'session', 'syntheticScenarioBinding',
    'syntheticScenarioRender', 'syntheticScenarios'
  ].sort());
  assert.equal(UC6_BROWSER_ADMIN_ENDPOINTS.onboarding(JOB), `/fetchdoc/browser-admin/uc6/jobs/${JOB}/onboarding`);
  assert.equal(UC6_BROWSER_ADMIN_ENDPOINTS.syntheticScenarioBinding(JOB), `/fetchdoc/browser-admin/uc6/jobs/${JOB}/synthetic-scenarios/binding`);
  assert.equal(UC6_BROWSER_ADMIN_ENDPOINTS.syntheticScenarioRender(JOB), `/fetchdoc/browser-admin/uc6/jobs/${JOB}/synthetic-scenarios/render`);
  assert.equal(UC6_BROWSER_ADMIN_ENDPOINTS.renderArtifactCapabilities(JOB), `/fetchdoc/browser-admin/uc6/jobs/${JOB}/render-artifact-capabilities`);
  assert.equal(UC6_BROWSER_ADMIN_ENDPOINTS.reusableAssetJobs(ASSET), `/fetchdoc/browser-admin/uc6/reusable-assets/${ASSET}/jobs`);
});

test('GET uses Bearer auth, credentials omit, and one forced refresh after 401', async () => {
  const calls = []; const tokens = [];
  const api = createApi(async (url, init) => {
    calls.push({ url, init });
    return calls.length === 1 ? response({ detail: { code: 'browser_admin_token_expired' } }, 401) : response({ status: 'authorized' });
  }, tokens);
  await api.getSession();
  assert.deepEqual(tokens, [false, true]);
  assert.equal(calls[0].init.credentials, 'omit');
  assert.equal(calls[0].init.headers.Authorization, 'Bearer token-current');
  assert.equal(calls[1].init.headers.Authorization, 'Bearer token-refreshed');
});

test('bodyless mutations remain bodyless and are never replayed on network ambiguity', async () => {
  const calls = [];
  const api = createApi(async (url, init) => { calls.push({ url, init }); throw new TypeError('network'); });
  await assert.rejects(api.submitFreshTemplateOnboarding(JOB), { name: 'Uc6AmbiguousSubmissionError' });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].init.method, 'POST');
  assert.equal(calls[0].init.body, undefined);
  assert.equal(calls[0].init.credentials, 'omit');
});

test('source_ready is canonical and ambiguous onboarding reconciles without a duplicate POST', async () => {
  const canonical = {
    job_id: JOB,
    state: 'source_ready',
    source: { sha256: SHA, size_bytes: 8192, slide_count: 7, filename: 'source.pptx' },
    control_plane_contract_version: CONTRACT
  };
  assert.equal(projectUc6CanonicalJob(canonical, { expectedJobId: JOB }).state, 'source_ready');

  const calls = [];
  const api = createApi(async (url, init) => {
    calls.push({ url, init });
    if (init.method === 'POST') throw new TypeError('connection_lost_after_send');
    return response(canonical);
  });
  await assert.rejects(api.submitFreshTemplateOnboarding(JOB), { name: 'Uc6AmbiguousSubmissionError' });
  const reconciled = projectUc6CanonicalJob(await api.getJob(JOB), { expectedJobId: JOB });
  assert.equal(reconciled.state, 'source_ready');
  assert.equal(calls.filter(({ init }) => init.method === 'POST').length, 1);
});

test('Persona binding body and selected-Persona generation routes remain exact', async () => {
  const calls = [];
  const api = createApi(async (url, init) => { calls.push({ url, init }); return response({}); });
  await api.bindFreshSyntheticScenario(JOB, 'persona_dynamic_7');
  await api.submitFreshSyntheticScenarios(JOB);
  await api.submitFreshSyntheticScenarioRender(JOB);
  assert.deepEqual(JSON.parse(calls[0].init.body), { scenario_key: 'persona_dynamic_7' });
  assert.equal(calls[1].init.body, undefined);
  assert.equal(calls[2].init.body, undefined);
  assert.match(calls[1].url, /synthetic-scenarios$/);
  assert.match(calls[2].url, /synthetic-scenarios\/render$/);
});

test('Published Template bootstrap body remains exact', async () => {
  const calls = [];
  const api = createApi(async (url, init) => { calls.push({ url, init }); return response({}); });
  await api.bootstrapReusableAssetRuntimeJob(ASSET, { bootstrap_identity: 'uc6_bootstrap_1234567890' });
  assert.deepEqual(JSON.parse(calls[0].init.body), { bootstrap_identity: 'uc6_bootstrap_1234567890' });
});

test('publication command includes exact hash binding and nullable administrator note', () => {
  const valid = validateUc6ReusableAssetPublicationCommand({
    decision: 'approve_for_reuse_and_publish', decision_identity: 'uc6_publish_1234567890',
    reviewed_final_pptx_sha256: SHA, reviewed_final_pdf_sha256: 'c'.repeat(64), administrator_note: null
  });
  assert.equal(valid.ok, true);
  assert.deepEqual(valid.body, {
    decision: 'approve_for_reuse_and_publish', decision_identity: 'uc6_publish_1234567890',
    reviewed_final_pptx_sha256: SHA, reviewed_final_pdf_sha256: 'c'.repeat(64), administrator_note: null
  });
});

test('authenticated SSE uses fetch, Bearer auth, credentials omit, and one 401 refresh', async () => {
  const calls = []; const tokens = [];
  const api = createApi(async (url, init) => {
    calls.push({ url, init });
    return calls.length === 1 ? response({}, 401) : response({}, 200, 'text/event-stream; charset=utf-8');
  }, tokens);
  await api.openJobEvents(JOB);
  assert.deepEqual(tokens, [false, true]);
  assert.equal(calls[1].init.headers.Accept, 'text/event-stream');
  assert.equal(calls[1].init.credentials, 'omit');
});

test('strict SSE parser accepts a public wake-up frame and rejects malformed progress', () => {
  const frame = `data: ${JSON.stringify({ schema_version: 'fetchdoc_job_event_v1', event_kind: 'state_change', job_id: JOB, sequence: 4, stage: 'generate', status: 'running', completed_units: 1, total_units: 3 })}\n\n`;
  assert.equal(parseUc6JobEventFrame(frame).sequence, 4);
  assert.throws(() => parseUc6JobEventFrame(frame.replace('"completed_units":1', '"completed_units":9')));
});

test('Persona Catalog is fully dynamic and binding validates current membership', () => {
  const payload = {
    schema_version: PERSONA_CATALOG_SCHEMA, job_id: JOB, source_pptx_sha256: SHA,
    onboarding_state: 'onboarding_ready', generation_state: 'not_started', selection_state: 'unbound', bound_scenario: null,
    scenario_options: [
      PERSONA,
      { scenario_key: 'operator', label: 'Operator', scenario_summary: 'Operational detail focus', differentiation_basis: { emphasis: 'delivery' } }
    ], control_plane_contract_version: CONTRACT, public_safety: 'PASS'
  };
  const projected = projectUc6FreshSyntheticScenarios(payload, { expectedJobId: JOB, expectedSourceSha: SHA });
  assert.equal(projected.scenario_options.length, 2);
  assert.equal(validateUc6SyntheticScenarioBindingCommand('operator', projected.scenario_options).ok, true);
  assert.equal(validateUc6SyntheticScenarioBindingCommand('unknown', projected.scenario_options).ok, false);
  const sourceReady = { ...payload, onboarding_state: 'source_ready', scenario_options: [] };
  assert.equal(projectUc6FreshSyntheticScenarios(sourceReady, { expectedJobId: JOB, expectedSourceSha: SHA }).onboarding_state, 'source_ready');
  assert.throws(() => projectUc6FreshSyntheticScenarios({ ...payload, onboarding_state: 'persona_selection_ready' }, { expectedJobId: JOB, expectedSourceSha: SHA }), /invalid_persona_catalog/);
  assert.throws(() => projectUc6FreshSyntheticScenarios({ ...payload, schema_version: 'fabricated_dynamic_schema_v1' }, { expectedJobId: JOB }), /invalid_persona_catalog/);
  assert.throws(() => projectUc6FreshSyntheticScenarios({ ...payload, unexpected: true }, { expectedJobId: JOB }), /invalid_persona_catalog_fields/);
});

test('Persona binding projection matches the exact live backend schema and field envelope', () => {
  const binding = {
    schema_version: PERSONA_BINDING_SCHEMA,
    job_id: JOB,
    source_pptx_sha256: SHA,
    selection_state: 'bound',
    bound_scenario: PERSONA,
    disposition: 'created',
    public_safety: 'PASS'
  };
  const options = { expectedJobId: JOB, expectedSourceSha: SHA, expectedScenarioKey: PERSONA.scenario_key };
  assert.deepEqual(projectUc6FreshSyntheticScenarioBinding(binding, options), binding);
  for (const disposition of ['created', 'replayed', 'resolved']) assert.equal(projectUc6FreshSyntheticScenarioBinding({ ...binding, disposition }, options).disposition, disposition);
  for (const invalid of [
    { ...binding, schema_version: 'wrong' },
    { ...binding, job_id: 'fd_uc6_admin_other_job_001' },
    { ...binding, source_pptx_sha256: 'd'.repeat(64) },
    { ...binding, selection_state: 'unbound' },
    { ...binding, bound_scenario: { ...PERSONA, scenario_key: 'operator' } },
    { ...binding, disposition: 'unknown' },
    { ...binding, public_safety: 'FAIL' },
    { ...binding, control_plane_contract_version: CONTRACT }
  ]) assert.throws(() => projectUc6FreshSyntheticScenarioBinding(invalid, options));
});

test('selected-Persona source-generation submission enforces exact live structure and replay coherence', () => {
  const queued = {
    schema_version: SOURCE_GENERATION_SCHEMA,
    job_id: JOB,
    task_type: SOURCE_GENERATION_TASK,
    task_id: 41,
    queue_status: 'pending',
    created: true,
    state: 'synthetic_scenarios_queued',
    source_pptx_sha256: SHA,
    bound_scenario: PERSONA,
    control_plane_contract_version: CONTRACT,
    public_safety: 'PASS'
  };
  const options = { expectedJobId: JOB, expectedSourceSha: SHA, expectedScenarioKey: PERSONA.scenario_key };
  assert.equal(projectUc6FreshSyntheticGenerationSubmission(queued, options).task_id, 41);
  const doneWithoutRuntime = { ...queued, queue_status: 'done', created: false, state: 'synthetic_scenarios_failed' };
  assert.equal(projectUc6FreshSyntheticGenerationSubmission(doneWithoutRuntime, options).queue_status, 'done');
  const failedQueue = { ...queued, queue_status: 'failed', created: false, state: 'synthetic_scenarios_failed' };
  assert.equal(projectUc6FreshSyntheticGenerationSubmission(failedQueue, options).queue_status, 'failed');
  const readyReplay = {
    ...queued,
    task_id: null,
    queue_status: 'ready',
    created: false,
    state: 'synthetic_scenarios_ready',
    network_call_count: 0,
    provider_attempt_count: 1,
    replayed: true
  };
  assert.equal(projectUc6FreshSyntheticGenerationSubmission(readyReplay, options).replayed, true);
  const incompleteReady = clone(readyReplay); delete incompleteReady.replayed;
  assert.throws(() => projectUc6FreshSyntheticGenerationSubmission(incompleteReady, options), /invalid_source_generation_ready_replay/);
  assert.throws(() => projectUc6FreshSyntheticGenerationSubmission({ ...readyReplay, network_call_count: 1 }, options), /invalid_source_generation_ready_replay/);

  for (const invalid of [
    { ...queued, schema_version: 'wrong' },
    { ...queued, task_type: 'wrong' },
    { ...queued, queue_status: 'processing' },
    { ...queued, task_id: null },
    { ...queued, source_pptx_sha256: 'd'.repeat(64) },
    { ...queued, bound_scenario: { ...PERSONA, scenario_key: 'operator' } },
    { ...queued, public_safety: 'FAIL' },
    { ...queued, private_receipt: 'internal' }
  ]) assert.throws(() => projectUc6FreshSyntheticGenerationSubmission(invalid, options));
});

test('final Generation submission enforces exact live structure and completed replay semantics', () => {
  const queued = {
    schema_version: RENDER_SUBMISSION_SCHEMA,
    job_id: JOB,
    task_type: RENDER_SUBMISSION_TASK,
    task_id: 73,
    queue_status: 'pending',
    created: true,
    state: 'render_queued',
    bound_scenario: PERSONA,
    control_plane_contract_version: CONTRACT,
    public_safety: 'PASS'
  };
  const options = { expectedJobId: JOB, expectedScenarioKey: PERSONA.scenario_key };
  assert.deepEqual(projectUc6FreshSyntheticRenderSubmission(queued, options), queued);
  const doneWithoutArtifact = { ...queued, queue_status: 'done', created: false, state: 'failed' };
  assert.equal(projectUc6FreshSyntheticRenderSubmission(doneWithoutArtifact, options).queue_status, 'done');
  const failedQueue = { ...queued, queue_status: 'failed', created: false, state: 'failed' };
  assert.equal(projectUc6FreshSyntheticRenderSubmission(failedQueue, options).queue_status, 'failed');
  const completedReplay = { ...queued, task_id: null, queue_status: 'done', created: false, state: 'render_completed' };
  assert.deepEqual(projectUc6FreshSyntheticRenderSubmission(completedReplay, options), completedReplay);

  for (const invalid of [
    { ...queued, schema_version: 'wrong' },
    { ...queued, task_type: 'wrong' },
    { ...queued, queue_status: 'processing' },
    { ...queued, task_id: null },
    { ...queued, selection_state: 'bound' },
    { ...queued, source_pptx_sha256: SHA },
    { ...queued, bound_scenario: { ...PERSONA, scenario_key: 'operator' } },
    { ...queued, public_safety: 'FAIL' },
    { ...queued, provider_receipt: 'internal' },
    { ...completedReplay, queue_status: 'ready' },
    { ...completedReplay, task_id: 73 },
    { ...completedReplay, created: true }
  ]) assert.throws(() => projectUc6FreshSyntheticRenderSubmission(invalid, options));
});

test('Published Template runtime bootstrap enforces exact schema and nested Asset coherence', () => {
  const bootstrap = {
    schema_version: RUNTIME_BOOTSTRAP_SCHEMA,
    job_id: JOB,
    state: 'persona_selection_ready',
    source_pptx_sha256: SHA,
    asset: { asset_id: ASSET, source_pptx_sha256: SHA, generation_unit_count: 41, slot_count: 155, slide_count: 7 },
    disposition: 'created',
    control_plane_contract_version: CONTRACT,
    public_safety: 'PASS'
  };
  assert.equal(projectUc6ReusableAssetRuntimeBootstrap(bootstrap, { expectedAssetId: ASSET }).asset.asset_id, ASSET);
  assert.equal(projectUc6ReusableAssetRuntimeBootstrap({ ...bootstrap, disposition: 'replayed' }, { expectedAssetId: ASSET }).disposition, 'replayed');
  assert.equal(projectUc6ReusableAssetRuntimeBootstrap({ ...bootstrap, disposition: 'resolved' }, { expectedAssetId: ASSET }).disposition, 'resolved');

  for (const invalid of [
    { ...bootstrap, schema_version: 'wrong' },
    { ...bootstrap, state: 'source_ready' },
    { ...bootstrap, disposition: 'unknown' },
    { ...bootstrap, public_safety: 'FAIL' },
    { ...bootstrap, asset: { ...bootstrap.asset, asset_id: OTHER_ASSET } },
    { ...bootstrap, asset: { ...bootstrap.asset, source_pptx_sha256: 'd'.repeat(64) } },
    { ...bootstrap, asset: { ...bootstrap.asset, slide_count: 0 } },
    { ...bootstrap, created: true }
  ]) assert.throws(() => projectUc6ReusableAssetRuntimeBootstrap(invalid, { expectedAssetId: ASSET }));
});

test('artifact capabilities fail closed on malformed aliases, filenames, and unsafe URLs', () => {
  const payload = {
    job_id: JOB,
    artifacts: [
      {
        alias: 'final_render_output_pdf', media_type: 'application/pdf', ready: true, suggested_filename: 'document.pdf',
        capabilities: { download: { available: true, href: '/artifacts/document.pdf' }, view: { available: true, href: '/artifacts/document.pdf' } }
      },
      {
        alias: 'final_render_output_pptx', media_type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', ready: true, suggested_filename: 'document.pptx',
        capabilities: { download: { available: true, href: '/artifacts/document.pptx' }, view: { available: false, href: null } }
      }
    ]
  };
  const options = { expectedJobId: JOB, apiBaseUrl: API, allowLoopbackHttp: true };
  assert.equal(projectUc6FinalDeliveryCapabilities(payload, options).readyCount, 2);
  const wrongAlias = clone(payload); wrongAlias.artifacts[0].alias = 'provider_pdf';
  const unsafeUrl = clone(payload); unsafeUrl.artifacts[0].capabilities.view.href = '//evil.example/file.pdf';
  const unsafeFilename = clone(payload); unsafeFilename.artifacts[1].suggested_filename = '../internal.pptx';
  const pptxViewer = clone(payload); pptxViewer.artifacts[1].capabilities.view = { available: true, href: '/artifacts/document.pptx' };
  for (const invalid of [wrongAlias, unsafeUrl, unsafeFilename, pptxViewer, { ...payload, artifacts: [payload.artifacts[0]] }]) {
    assert.throws(() => projectUc6FinalDeliveryCapabilities(invalid, options));
  }
});

test('Persona binding ambiguity is Persona-bound, persisted, non-replayable, and cleared by authoritative GET', async () => {
  const otherPersona = { scenario_key: 'operator', label: 'Operator', scenario_summary: 'Operational focus', differentiation_basis: { emphasis: 'delivery' } };
  const calls = [];
  const api = createApi(async (url, init) => { calls.push({ url, init }); throw new TypeError('network'); });
  let local = { ambiguous: false, attemptedPersonaKey: '' };
  async function guardedBind(requestedPersonaKey) {
    const control = projectUc6PersonaBindingMutationControl({ ...local, requestedPersonaKey });
    if (!control.canSubmit) return false;
    local = { ambiguous: true, attemptedPersonaKey: requestedPersonaKey };
    try { await api.bindFreshSyntheticScenario(JOB, requestedPersonaKey, { personas: [PERSONA, otherPersona] }); }
    catch (error) { if (error.name !== 'Uc6AmbiguousSubmissionError') throw error; }
    return true;
  }
  assert.equal(await guardedBind(PERSONA.scenario_key), true);
  assert.equal(await guardedBind(PERSONA.scenario_key), false);
  assert.equal(await guardedBind(otherPersona.scenario_key), false);
  assert.equal(calls.filter(({ init }) => init.method === 'POST').length, 1);

  const persisted = projectUc6PersistedState({
    job_id: JOB, mode: 'fresh_template', persona_binding_ambiguous: true, persona_binding_key: PERSONA.scenario_key
  });
  assert.equal(persisted.persona_binding_ambiguous, true);
  assert.equal(persisted.persona_binding_key, PERSONA.scenario_key);
  assert.equal(projectUc6PersonaBindingMutationControl({
    ambiguous: persisted.persona_binding_ambiguous,
    attemptedPersonaKey: persisted.persona_binding_key,
    requestedPersonaKey: otherPersona.scenario_key
  }).canSubmit, false);

  const authoritativeCatalog = projectUc6FreshSyntheticScenarios({
    schema_version: PERSONA_CATALOG_SCHEMA, job_id: JOB, source_pptx_sha256: SHA,
    onboarding_state: 'onboarding_ready', generation_state: 'not_started',
    scenario_options: [PERSONA, otherPersona], selection_state: 'bound', bound_scenario: PERSONA,
    control_plane_contract_version: CONTRACT, public_safety: 'PASS'
  }, { expectedJobId: JOB, expectedSourceSha: SHA });
  const reconciled = projectUc6PersonaBindingMutationControl({
    ambiguous: true, attemptedPersonaKey: PERSONA.scenario_key,
    selectionState: authoritativeCatalog.selection_state, boundScenario: authoritativeCatalog.bound_scenario
  });
  assert.equal(reconciled.resolved, true);
  assert.equal(reconciled.ambiguityLocked, false);
  const afterAuthoritativeGet = projectUc6PersistedState({ job_id: JOB, mode: 'fresh_template', persona_binding_ambiguous: !reconciled.resolved, persona_binding_key: reconciled.resolved ? '' : PERSONA.scenario_key });
  assert.equal(Object.hasOwn(afterAuthoritativeGet, 'persona_binding_ambiguous'), false);
  assert.equal(Object.hasOwn(afterAuthoritativeGet, 'persona_binding_key'), false);
});

test('ambiguous onboarding keeps source_ready observation active until authoritative state advances', async () => {
  const sourceReady = {
    job_id: JOB, state: 'source_ready',
    source: { sha256: SHA, size_bytes: 8192, slide_count: 7, filename: 'source.pptx' },
    control_plane_contract_version: CONTRACT
  };
  const onboardingQueued = { ...sourceReady, state: 'onboarding_queued' };
  const calls = [];
  let getCount = 0;
  const api = createApi(async (url, init) => {
    calls.push({ url, init });
    if (init.method === 'POST') throw new TypeError('connection_lost_after_send');
    return response(getCount++ === 0 ? sourceReady : onboardingQueued);
  });
  await assert.rejects(api.submitFreshTemplateOnboarding(JOB), { name: 'Uc6AmbiguousSubmissionError' });
  const first = projectUc6CanonicalJob(await api.getJob(JOB), { expectedJobId: JOB });
  const unresolved = projectUc6OnboardingObservationControl({ ambiguous: true, state: first.state });
  assert.equal(unresolved.unresolved, true);
  assert.equal(unresolved.observationRequired, true);
  const persisted = projectUc6PersistedState({ job_id: JOB, mode: 'fresh_template', onboarding_ambiguous: true, last_known_public_state: first.state });
  assert.equal(projectUc6OnboardingObservationControl({ ambiguous: persisted.onboarding_ambiguous, state: persisted.last_known_public_state }).observationRequired, true);
  const later = projectUc6CanonicalJob(await api.getJob(JOB), { expectedJobId: JOB });
  const advanced = projectUc6OnboardingObservationControl({ ambiguous: true, state: later.state });
  assert.equal(advanced.ambiguityCleared, true);
  assert.equal(advanced.observationRequired, true);
  assert.equal(calls.filter(({ init }) => init.method === 'POST').length, 1);
});

test('ambiguous publication with failed GET reconciliation stays identity-bound and blocks a second POST', async () => {
  const identity = 'uc6_publish_1234567890';
  const calls = [];
  const api = createApi(async (url, init) => {
    calls.push({ url, init });
    if (init.method === 'POST') throw new TypeError('connection_lost_after_send');
    return response({ detail: { code: 'unknown_backend_code' } }, 503);
  });
  const command = {
    decision: 'approve_for_reuse_and_publish', decision_identity: identity,
    reviewed_final_pptx_sha256: SHA, reviewed_final_pdf_sha256: 'c'.repeat(64), administrator_note: null
  };
  await assert.rejects(api.submitReusableAssetPublication(JOB, command), { name: 'Uc6AmbiguousSubmissionError' });
  await assert.rejects(api.getReusableAssetPublication(JOB), { name: 'Uc6PublicError' });
  const persisted = projectUc6PersistedState({ job_id: JOB, mode: 'fresh_template', publication_decision_identity: identity, publication_ambiguous: true });
  const locked = projectUc6PublicationMutationControl({
    ambiguous: persisted.publication_ambiguous, decisionIdentity: persisted.publication_decision_identity,
    publicationState: 'unpublished', reviewed: true, busy: false
  });
  assert.equal(locked.reconciliationRequired, true);
  assert.equal(locked.canSubmit, false);
  if (locked.canSubmit) await api.submitReusableAssetPublication(JOB, command);
  assert.equal(calls.filter(({ init }) => init.method === 'POST').length, 1);
  assert.equal(persisted.publication_decision_identity, identity);
  const completed = projectUc6PublicationMutationControl({ ambiguous: true, decisionIdentity: identity, publicationState: 'published', reviewed: true, busy: false });
  assert.equal(completed.published, true);
  assert.equal(completed.reconciliationRequired, false);
  assert.equal(completed.canSubmit, false);
});

test('bootstrap ambiguity lock is persisted, Asset-bound, and blocks same or different follow-up mutation', async () => {
  const identity = 'uc6_bootstrap_1234567890';
  let persisted = projectUc6PersistedState({
    mode: 'published_template_runtime', selected_asset_id: ASSET,
    bootstrap_asset_id: ASSET, bootstrap_identity: identity, bootstrap_ambiguous: true
  });
  assert.deepEqual(persisted, {
    selected_asset_id: ASSET,
    mode: 'published_template_runtime',
    bootstrap_ambiguous: true,
    bootstrap_asset_id: ASSET,
    bootstrap_identity: identity
  });
  for (const requestedAssetId of [ASSET, OTHER_ASSET]) {
    const control = projectUc6BootstrapMutationControl({
      ambiguous: persisted.bootstrap_ambiguous,
      attemptedAssetId: persisted.bootstrap_asset_id,
      bootstrapIdentity: persisted.bootstrap_identity,
      requestedAssetId
    });
    assert.equal(control.ambiguityLocked, true);
    assert.equal(control.canSubmit, false);
  }

  const calls = [];
  const api = createApi(async (url, init) => { calls.push({ url, init }); throw new TypeError('network'); });
  let local = { ambiguous: false, attemptedAssetId: '', bootstrapIdentity: '' };
  async function guardedBootstrap(requestedAssetId) {
    const control = projectUc6BootstrapMutationControl({ ...local, requestedAssetId });
    if (!control.canSubmit) return false;
    local = { ambiguous: false, attemptedAssetId: requestedAssetId, bootstrapIdentity: identity };
    try { await api.bootstrapReusableAssetRuntimeJob(requestedAssetId, { bootstrap_identity: identity }); }
    catch (error) { if (error.name === 'Uc6AmbiguousSubmissionError') local.ambiguous = true; else throw error; }
    return true;
  }
  assert.equal(await guardedBootstrap(ASSET), true);
  assert.equal(await guardedBootstrap(ASSET), false);
  assert.equal(await guardedBootstrap(OTHER_ASSET), false);
  assert.equal(calls.length, 1);

  const afterSuccess = projectUc6PersistedState({
    mode: 'published_template_runtime', job_id: JOB, selected_asset_id: ASSET,
    last_known_public_state: 'persona_selection_ready', bootstrap_ambiguous: false,
    bootstrap_asset_id: '', bootstrap_identity: ''
  });
  assert.equal(Object.hasOwn(afterSuccess, 'bootstrap_ambiguous'), false);
  assert.equal(Object.hasOwn(afterSuccess, 'bootstrap_asset_id'), false);
  assert.equal(Object.hasOwn(afterSuccess, 'bootstrap_identity'), false);
});

test('persistence projects canonical state and safely normalizes resumable old records', () => {
  assert.deepEqual(projectUc6PersistedState({ job_id: JOB, selected_asset_id: ASSET, unrelated_secret: 'nope' }), {
    job_id: JOB, selected_asset_id: ASSET, mode: 'published_template_runtime'
  });
  assert.equal(projectUc6PersistedState({ bootstrap_ambiguous: true }).bootstrap_ambiguous, undefined);
});

test('ambiguous source-generation and render submissions keep precursor states observable without replay', () => {
  const sourcePending = projectUc6MutationObservationControl({ sourceAmbiguous: true, state: 'onboarding_ready' });
  assert.equal(sourcePending.sourceGenerationUnresolved, true);
  assert.equal(sourcePending.observationRequired, true);
  assert.equal(projectUc6MutationObservationControl({ sourceAmbiguous: false, state: 'onboarding_ready' }).observationRequired, false);

  for (const state of ['synthetic_scenarios_ready', 'synthetic_scenario_bound']) {
    const renderPending = projectUc6MutationObservationControl({ renderAmbiguous: true, state });
    assert.equal(renderPending.renderUnresolved, true);
    assert.equal(renderPending.observationRequired, true);
  }
  assert.equal(projectUc6MutationObservationControl({ renderAmbiguous: false, state: 'synthetic_scenario_bound' }).observationRequired, false);
  assert.equal(projectUc6MutationObservationControl({ renderAmbiguous: true, state: 'render_queued' }).observationRequired, false);
});

test('production sources contain only canonical lanes and live historical transport token', async () => {
  const [admin, app] = await Promise.all([
    readFile(new URL('../public/uc6-browser-admin.mjs', import.meta.url), 'utf8'),
    readFile(new URL('../public/app.js', import.meta.url), 'utf8')
  ]);
  const production = `${admin}\n${app}`;
  for (const residue of ['dummy-databag-packages', 'dummy-databag-package-families', 'dummy_databag', 'linked-scenario-family', 'published-scenario-renders', 'scenario_000', 'scenario_001', 'scenario_002', 'scenario_count', 'package_count', 'dummy_render', 'asset_render', 'legacy_analysis', 'static_package', 'published_scenario_family']) {
    assert.equal(production.includes(residue), false, residue);
  }
  assert.equal(production.includes('synthetic-scenarios'), true);
  for (const liveContract of [
    'source_ready', PERSONA_CATALOG_SCHEMA, PERSONA_BINDING_SCHEMA, SOURCE_GENERATION_SCHEMA, SOURCE_GENERATION_TASK,
    RENDER_SUBMISSION_SCHEMA, RENDER_SUBMISSION_TASK, RUNTIME_BOOTSTRAP_SCHEMA
  ]) assert.equal(production.includes(liveContract), true, liveContract);
});

test('Analyze, normal Persona, Prepare, and every running Generate state expose safe local detach', async () => {
  const source = await readFile(new URL('../public/uc6-browser-admin.mjs', import.meta.url), 'utf8');
  const helper = sourceBlock(source, 'function newWorkspaceButton', 'function setMessage');
  assert.match(helper, /button\('uc6-newWorkspaceBtn', '새 작업 시작', primary, state\.busy \|\| state\.reconciling\)/);

  const analyze = sourceBlock(source, 'function renderAnalyze', 'function personaDetail');
  assert.match(analyze, /actions\(newWorkspaceButton\(\), button\('uc6-refreshJobBtn'/);

  const persona = sourceBlock(source, 'function renderPersona', 'function renderPrepare');
  assert.match(persona, /\? actions\(newWorkspaceButton\(\)\)/);
  assert.match(persona, /: actions\(newWorkspaceButton\(\), button\('uc6-bindPersonaBtn'/);

  const prepare = sourceBlock(source, 'function renderPrepare', 'function renderGenerate');
  assert.equal((prepare.match(/actions\(newWorkspaceButton\(\), button\(/g) || []).length, 2);

  const generate = sourceBlock(source, 'function renderGenerate', 'function artifact');
  assert.match(generate, /\['render_queued', 'render_running', 'render_unknown'\]\.includes\(state\.jobState\)/);
  assert.match(generate, /running \? actions\(newWorkspaceButton\(\), button\('uc6-refreshJobBtn'/);
  assert.match(generate, /: actions\(newWorkspaceButton\(\), button\('uc6-generateBtn'/);
});

test('new workspace action remains guarded and delegates only to the existing reset implementation', async () => {
  const source = await readFile(new URL('../public/uc6-browser-admin.mjs', import.meta.url), 'utf8');
  const reset = sourceBlock(source, 'function reset()', 'function currentStage');
  assert.match(reset, /stopObservation\(\)/);
  assert.match(reset, /localStorage\.removeItem\(STORAGE_KEY\); localStorage\.removeItem\(PREVIOUS_STORAGE_KEY\)/);
  assert.equal(reset.includes('state.api'), false);
  assert.equal(reset.includes('fetch('), false);
  assert.match(source, /const STORAGE_KEY = 'fetchdoc\.uc6\.canonical_workspace\.v2'/);
  assert.match(source, /const PREVIOUS_STORAGE_KEY = 'fetchdoc\.uc6\.browser_admin_control_plane\.v1'/);
  assert.match(source, /target\.id === 'uc6-newWorkspaceBtn' && !state\.busy && !state\.reconciling\) reset\(\)/);
});

test('bound-job reconciliation failures retain identity and present neutral refresh-or-detach recovery', async () => {
  const source = await readFile(new URL('../public/uc6-browser-admin.mjs', import.meta.url), 'utf8');
  const reconcile = sourceBlock(source, 'async function reconcile', 'function observationRequired');
  assert.match(reconcile, /const jobId = state\.jobId; state\.reconciling = true/);
  assert.match(reconcile, /현재 작업 상태를 확인할 수 없습니다\. 상태를 새로고침하거나 새 작업을 시작할 수 있습니다\.`?, 'neutral'/);
  assert.equal(reconcile.includes('removeItem'), false);
  assert.equal(reconcile.includes('submitFresh'), false);
  assert.equal(reconcile.includes("method: 'POST'"), false);
  assert.equal(parseUc6PublicErrorPayload({ detail: { code: 'browser_admin_uc6_job_not_found' } }, 404).status, 404);
  assert.equal(parseUc6PublicErrorPayload({ detail: { code: 'browser_admin_uc6_synthetic_scenario_binding_conflict' } }, 409).status, 409);
});

test('confirmed render results preserve authoritative 202 state while ambiguity alone uses render_unknown', async () => {
  const source = await readFile(new URL('../public/uc6-browser-admin.mjs', import.meta.url), 'utf8');
  const generate = sourceBlock(source, 'async function generate()', 'async function loadCatalog');
  const confirmed = sourceBlock(generate, 'try { const result', 'catch (error)');
  assert.match(confirmed, /state\.renderSubmitted = true; state\.jobState = result\.state; setMessage\('요청이 접수되었습니다.'\); save\(\); startObservation\(\)/);
  assert.equal(confirmed.includes('render_unknown'), false);
  assert.match(generate, /error\?\.name === 'Uc6AmbiguousSubmissionError'.*state\.jobState = 'render_unknown'/s);
});

test('artifact readback failure keeps completed Review semantics and non-destructive copy', async () => {
  const source = await readFile(new URL('../public/uc6-browser-admin.mjs', import.meta.url), 'utf8');
  const stages = sourceBlock(source, 'function currentStage', 'function surface');
  const artifacts = sourceBlock(source, 'async function loadArtifacts', 'async function loadPublication');
  const reconcile = sourceBlock(source, 'async function reconcile', 'function observationRequired');
  assert.match(stages, /state\.jobState === 'render_completed'\) return 'review'/);
  assert.match(artifacts, /state\.artifactStatus = 'error'; setMessage\('문서 생성은 완료되었습니다\. 파일 정보를 다시 확인해 주세요\.', 'warning'\)/);
  assert.equal(artifacts.includes('state.jobState'), false);
  assert.match(reconcile, /state\.jobState = job\.state/);
  assert.match(reconcile, /job\.state === 'render_completed'.*await Promise\.all\(\[loadArtifacts\(\), loadPublication\(\)\]\)/s);
});

test('UC6 deployment marker identifies canonical workspace recovery patch', async () => {
  const app = await readFile(new URL('../public/app.js', import.meta.url), 'utf8');
  assert.match(app, /const APP_VERSION = 'app\.uc6-canonical-workspace-recovery-2026-09-01-v1'/);
  assert.equal(app.includes('app.uc6-q4-r1e-publication-error-semantics-2026-08-18-v1'), false);
});

test('controller keeps bounded reconnect, polling fallback, and stale-context guards', async () => {
  const source = await readFile(new URL('../public/uc6-browser-admin.mjs', import.meta.url), 'utf8');
  assert.match(source, /const RECONNECT_MS = \[1000, 2000, 5000\]/);
  assert.match(source, /startPolling\(epoch\)/);
  assert.match(source, /epoch !== state\.eventEpoch/);
  assert.match(source, /jobId !== state\.jobId/);
  assert.equal(source.includes('EventSource'), false);
});

test('controller supplements behavioral mutation tests with persisted guards and one-shot call sites', async () => {
  const source = await readFile(new URL('../public/uc6-browser-admin.mjs', import.meta.url), 'utf8');
  assert.match(source, /!\['source_ready', 'onboarding_queued', 'onboarding_running', 'onboarding_blocked'\]\.includes\(job\.state\)/);
  assert.equal((source.match(/submitFreshTemplateOnboarding\(state\.jobId\)/g) || []).length, 1);
  assert.match(source, /bootstrap_ambiguous: state\.bootstrapAmbiguous/);
  assert.match(source, /bootstrap_asset_id: state\.bootstrapAssetId/);
  assert.match(source, /if \(state\.busy \|\| !control\.canSubmit\) return/);
  assert.match(source, /state\.bootstrapAmbiguous = true/);
  assert.match(source, /state\.bootstrapAmbiguous = false; state\.bootstrapAssetId = ''; state\.bootstrapIdentity = ''/);
  const bootstrapStart = source.indexOf('async function bootstrap(assetId)');
  const lockSave = source.indexOf('save(); render();', bootstrapStart);
  const bootstrapPost = source.indexOf('state.api.bootstrapReusableAssetRuntimeJob', bootstrapStart);
  assert.ok(bootstrapStart >= 0 && lockSave > bootstrapStart && bootstrapPost > lockSave, 'durable one-shot lock must be saved before the POST');
  assert.match(source, /persona_binding_ambiguous: state\.personaBindingAmbiguous/);
  assert.match(source, /onboarding_ambiguous: state\.onboardingAmbiguous/);
  assert.match(source, /publication_ambiguous: state\.publicationAmbiguous/);
  assert.equal((source.match(/bindFreshSyntheticScenario\(state\.jobId, attemptedPersonaKey/g) || []).length, 1);
  assert.match(source, /expectedSourceSha: state\.source\?\.sha256, expectedScenarioKey: attemptedPersonaKey/);
  assert.equal((source.match(/submitReusableAssetPublication\(state\.jobId, command\)/g) || []).length, 1);
});

test('UC6 markup has one local shell, dynamic rail, and no second navigation', async () => {
  const html = await readFile(new URL('../public/index.html', import.meta.url), 'utf8');
  const uc6 = html.slice(html.indexOf('id="view-uc6"'));
  assert.match(uc6, /class="uc6-admin-shell"/);
  assert.match(uc6, /id="uc6-stepper"[^>]*><\/nav>/);
  assert.match(uc6, /id="uc6-activeStageRoot"/);
  assert.equal((html.match(/id="view-uc[1-5]"/g) || []).length, 5);
});

test('UC6 presentation is scoped and contains document-dominant Review layout', async () => {
  const [css, source] = await Promise.all([
    readFile(new URL('../public/style.css', import.meta.url), 'utf8'),
    readFile(new URL('../public/uc6-browser-admin.mjs', import.meta.url), 'utf8')
  ]);
  const uc6Css = css.slice(css.indexOf('#view-uc6 {'));
  for (const selector of uc6Css.split(/\n(?=[^\s@}])/).filter((line) => line.includes('{') && !line.startsWith('@'))) {
    assert.equal(selector.trim().startsWith('#view-uc6') || selector.trim().startsWith('to {') || /^\d/.test(selector.trim()), true, selector);
  }
  assert.match(uc6Css, /\.uc6-review-layout/);
  assert.match(uc6Css, /grid-template-columns: minmax\(0, 1\.85fr\) minmax\(300px, 1fr\)/);
  assert.match(source, /Generated PDF review/);
  assert.match(source, /게시된 템플릿으로 문서 생성/);
  assert.match(source, /요청 결과를 확인하고 있습니다\./);
  assert.match(source, /별도 검토 이슈 정보가 제공되지 않았습니다\./);
  assert.equal(source.includes("fact('Blockers'"), false);
  assert.equal(source.includes("fact('Warnings'"), false);
  assert.equal(source.includes('확인된 차단 항목이 없습니다.'), false);
  assert.equal(source.includes('확인된 경고가 없습니다.'), false);
});
