import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  UC6_BROWSER_ADMIN_ENDPOINTS,
  UC6_GENERIC_PUBLIC_ERROR_MESSAGE,
  createUc6BrowserAdminApi,
  classifyUc6AuthorizationFailure,
  mapUc6StateToView,
  normalizeUc6ApiBaseUrl,
  normalizeUc6JobId,
  normalizeUc6ReusableAssetId,
  projectUc6DummyDatabagPackageFamilyOptions,
  projectUc6FreshTemplateOnboardingJobStatus,
  projectUc6FreshTemplateOnboardingSubmission,
  projectUc6FreshSyntheticGenerationSubmission,
  projectUc6FreshSyntheticScenarios,
  projectUc6FreshSyntheticScenarioBinding,
  projectUc6FreshSyntheticRenderControl,
  projectUc6FreshSyntheticRenderJobStatus,
  projectUc6FreshSyntheticRenderSubmission,
  projectUc6DummyDatabagPackageOptions,
  projectUc6ReusableAssetCatalog,
  projectUc6ReusableAssetPackageOptions,
  projectUc6ReusableAssetRenderJobStatus,
  projectUc6ReusableAssetRenderSubmission,
  projectUc6DummyDatabagRenderJobStatus,
  projectUc6DummyDatabagRenderSubmission,
  projectUc6FinalDeliveryCapabilities,
  parseUc6PublicError,
  projectUc6PersistedState,
  projectUc6ReviewIssuePresentation,
  projectUc6ReusableAssetPublication,
  runUc6CreateJobAndSubmitInitialAnalysis,
  splitDecisionTextLines,
  validateUc6DecisionCommand,
  validateUc6DummyDatabagRenderCommand,
  validateUc6SyntheticScenarioBindingCommand,
  validateUc6ReusableAssetPublicationCommand,
  validateUc6ReusableAssetRenderCommand
} from '../public/uc6-browser-admin.mjs';

const API_BASE = 'https://api.peter-n8n.duckdns.org/';
const JOB_ID = 'fd_uc6_admin_test_12345';
const R6C_SOURCE_SHA = 'a'.repeat(64);
const R6C_CONTROL_PLANE_VERSION = 'uc6_11c8r2_browser_admin_uc6_control_plane_v1';

function cloneFixture(value) {
  return JSON.parse(JSON.stringify(value));
}

function r6cVariant(profileId, packageId, order) {
  return {
    schema_version: 'uc6_a8c_dummy_databag_package_public_projection_v1',
    package_id: packageId,
    package_version: '2026.08.11',
    title: `Scenario ${order}`,
    description: `Synthetic public scenario ${order}.`,
    template_family_id: profileId,
    source_pptx_sha256: R6C_SOURCE_SHA,
    supported_canonical_source_group_count: order,
    status: 'active',
    canonical_sha256: String(order).repeat(64)
  };
}

function r6cFamily(packageFamilyId, title, variants) {
  return {
    schema_version: 'uc6_a9_0g2a_r6a_dummy_databag_package_family_projection_v1',
    package_family_id: packageFamilyId,
    title,
    description: `${title} public description.`,
    variant_count: variants.length,
    variants
  };
}

function r6cAxFixture() {
  const profileId = 'ax_agentic_selling_v3';
  return {
    schema_version: 'uc6_a9_0g2a_r6a_browser_admin_dummy_databag_package_family_options_v1',
    job_id: JOB_ID,
    source_pptx_sha256: R6C_SOURCE_SHA,
    compatibility_state: 'compatible',
    template_profile: {
      profile_id: profileId,
      profile_version: 'v3',
      generation_unit_count: 54,
      fillable_slot_count: 177
    },
    package_family_count: 1,
    package_families: [r6cFamily('ax_demo_scenarios', 'AX demo scenarios', [
      r6cVariant(profileId, 'ax_customer_retention', 1),
      r6cVariant(profileId, 'ax_growth_acceleration', 2),
      r6cVariant(profileId, 'ax_operational_recovery', 3)
    ])],
    selection_state: 'unbound',
    bound_package_family_id: null,
    bound_package: null,
    control_plane_contract_version: R6C_CONTROL_PLANE_VERSION,
    public_safety: 'PASS'
  };
}

function r6cNovaGridFixture() {
  const profileId = 'novagrid_energy_proposal_v2';
  return {
    ...r6cAxFixture(),
    template_profile: {
      profile_id: profileId,
      profile_version: 'v2',
      generation_unit_count: 42,
      fillable_slot_count: 120
    },
    package_families: [r6cFamily('novagrid_customer_scenarios', 'NovaGrid customer scenarios', [
      r6cVariant(profileId, 'novagrid_helios_foods', 4),
      r6cVariant(profileId, 'novagrid_orion_metals', 5),
      r6cVariant(profileId, 'novagrid_asteron_mobility', 6)
    ])]
  };
}

function r6d3OnboardingSubmission(state = 'onboarding_queued') {
  const queueStatus = {
    onboarding_queued: 'pending',
    onboarding_running: 'processing',
    onboarding_ready: 'done',
    onboarding_blocked: 'failed'
  }[state];
  return {
    schema_version: 'uc6_a9_0g2a_r6d2a_browser_admin_fresh_template_onboarding_submission_v1',
    job_id: JOB_ID,
    task_type: 'fetchdoc_browser_admin_uc6_fresh_template_onboarding',
    task_id: 731,
    queue_status: queueStatus,
    created: state === 'onboarding_queued',
    state,
    control_plane_contract_version: R6C_CONTROL_PLANE_VERSION,
    public_safety: 'PASS'
  };
}

function r6d3OnboardingJob(state = 'onboarding_queued') {
  return {
    job_id: JOB_ID,
    state,
    source: {
      sha256: R6C_SOURCE_SHA,
      size_bytes: 2048,
      slide_count: 12,
      filename: 'fresh-source.pptx'
    },
    onboarding: { state, private_runtime_data: 'not-projected' },
    control_plane_contract_version: R6C_CONTROL_PLANE_VERSION
  };
}

function r6eSyntheticScenario(index, overrides = {}) {
  const suffix = String(index).padStart(3, '0');
  return {
    scenario_key: `scenario_${suffix}`,
    label: `가상 샘플 ${index + 1}`,
    scenario_summary: `템플릿 호환 합성 샘플 컨텍스트 ${index + 1}`,
    differentiation_basis: index === 1 ? null : `차별화 기준 ${index + 1}`,
    synthetic_scenario_family_id: 'synthetic_family_demo_v1',
    package_id: `synthetic_package_${suffix}`,
    package_version: '2026.08.13',
    template_family_id: 'fresh_template_family_v1',
    ...overrides
  };
}

function r6eSyntheticGet(generationState = 'generation_ready', selectionState = 'unbound') {
  const ready = generationState === 'generation_ready';
  const scenarioOptions = ready ? [0, 1, 2].map((index) => r6eSyntheticScenario(index)) : [];
  return {
    schema_version: 'backend_owned_r6e_c1_public_v1',
    job_id: JOB_ID,
    source_pptx_sha256: R6C_SOURCE_SHA,
    onboarding_state: 'onboarding_ready',
    generation_state: generationState,
    scenario_options: scenarioOptions,
    selection_state: selectionState,
    bound_scenario: selectionState === 'bound' ? cloneFixture(scenarioOptions[1]) : null,
    control_plane_contract_version: R6C_CONTROL_PLANE_VERSION,
    public_safety: 'PASS'
  };
}

function r6eSyntheticSubmission(state = 'synthetic_scenarios_queued') {
  const isReadyReplay = state === 'synthetic_scenarios_ready';
  const payload = {
    schema_version: 'backend_owned_r6e_c1_submission_v1',
    job_id: JOB_ID,
    task_type: 'fetchdoc_browser_admin_uc6_fresh_synthetic_scenario_generation',
    task_id: isReadyReplay ? null : 812,
    queue_status: {
      synthetic_scenarios_queued: 'pending',
      synthetic_scenarios_running: 'processing',
      synthetic_scenarios_ready: 'ready',
      synthetic_scenarios_failed: 'failed'
    }[state],
    created: isReadyReplay ? false : state === 'synthetic_scenarios_queued',
    state,
    control_plane_contract_version: R6C_CONTROL_PLANE_VERSION,
    public_safety: 'PASS'
  };
  if (isReadyReplay) Object.assign(payload, {
    source_pptx_sha256: R6C_SOURCE_SHA,
    synthetic_scenario_family_id: 'synthetic_family_demo_v1',
    scenario_count: 3,
    package_count: 3,
    network_call_count: 0,
    replayed: true,
    provider_attempt_count: 1
  });
  return payload;
}

function r6eSyntheticBinding(scenarioKey = 'scenario_001', disposition = 'created') {
  const index = Number(scenarioKey.slice(-3));
  return {
    schema_version: 'backend_owned_r6e_c1_binding_v1',
    job_id: JOB_ID,
    source_pptx_sha256: R6C_SOURCE_SHA,
    selection_state: 'bound',
    bound_scenario: r6eSyntheticScenario(index),
    disposition,
    public_safety: 'PASS'
  };
}

function r6d3FreshProfile() {
  return {
    schema_version: 'uc6_a9_0g2a_r6d2b_fresh_same_job_r1_template_profile_projection_v1',
    profile_origin: 'fresh_same_job',
    source_pptx_sha256: R6C_SOURCE_SHA,
    delivery_bundle_id: 'fresh_delivery_bundle_001',
    generation_unit_count: 18,
    fillable_slot_count: 47,
    authoritative_generation_unit_delivery_sha256: 'b'.repeat(64),
    private_renderer_fallback_lineage_sha256: 'c'.repeat(64),
    authoritative_delivery_boundary_validation_sha256: 'd'.repeat(64),
    required_authoritative_source_groups: ['customer_context', 'growth_targets'],
    supporting_source_groups: ['market_signals']
  };
}

function r6d3FreshFamilyFixture() {
  const compatibilityFamilyId = 'fresh_package_compatibility_v1';
  return {
    schema_version: 'uc6_a9_0g2a_r6d2b_browser_admin_dummy_databag_package_family_options_v1',
    job_id: JOB_ID,
    source_pptx_sha256: R6C_SOURCE_SHA,
    onboarding_state: 'onboarding_ready',
    compatibility_state: 'compatible',
    template_profile: r6d3FreshProfile(),
    compatibility_metadata: {
      template_family_id: compatibilityFamilyId,
      source_matched_package_count: 2
    },
    package_family_count: 1,
    package_families: [r6cFamily('fresh_customer_scenarios', 'Fresh customer scenarios', [
      r6cVariant(compatibilityFamilyId, 'fresh_growth_case', 8),
      r6cVariant(compatibilityFamilyId, 'fresh_recovery_case', 9)
    ])],
    selection_state: 'binding_deferred',
    bound_package_family_id: null,
    bound_package: null,
    control_plane_contract_version: R6C_CONTROL_PLANE_VERSION,
    public_safety: 'PASS'
  };
}

function response(status, body) {
  return {
    status,
    ok: status >= 200 && status < 300,
    async json() {
      if (body instanceof Error) throw body;
      return body;
    }
  };
}

function makeBlobFile(name = 'source.pptx') {
  const blob = new Blob(['pptx']);
  Object.defineProperty(blob, 'name', { value: name });
  return blob;
}

function validFinalDeliveryPayload(overrides = {}) {
  const payload = {
    job_id: JOB_ID,
    artifacts: [
      {
        alias: 'final_render_output_pdf',
        media_type: 'application/pdf',
        ready: true,
        suggested_filename: 'final.pdf',
        capabilities: {
          download: { available: true, href: '/fetchdoc/browser-admin/uc6/jobs/fd_uc6_admin_test_12345/artifacts/pdf?sig=ok' },
          view: { available: true, href: '/fetchdoc/browser-admin/uc6/jobs/fd_uc6_admin_test_12345/artifacts/pdf/view?sig=ok' }
        }
      },
      {
        alias: 'final_render_output_pptx',
        media_type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        ready: true,
        suggested_filename: 'final.pptx',
        capabilities: {
          download: { available: true, href: '/fetchdoc/browser-admin/uc6/jobs/fd_uc6_admin_test_12345/artifacts/pptx?sig=ok' },
          view: { available: false, href: null }
        }
      }
    ]
  };
  return Object.assign(payload, overrides);
}


function unpublishedPublicationPayload(overrides = {}) {
  return Object.assign({
    schema_version: 'uc6_e2e4c2c_a8b_browser_admin_reusable_asset_publication_projection_v1',
    job_id: JOB_ID,
    render_state: 'render_completed',
    review_state: 'review_pending',
    publication_state: 'unpublished',
    publication_requires_manual_admin_action: true,
    reviewed_final_pptx_sha256: 'a'.repeat(64),
    reviewed_final_pdf_sha256: 'b'.repeat(64),
    published_asset: null,
    control_plane_contract_version: 'uc6_11c8r2_browser_admin_uc6_control_plane_v1',
    public_safety: 'PASS'
  }, overrides);
}

function publishedPublicationPayload(overrides = {}) {
  return Object.assign({
    schema_version: 'uc6_e2e4c2c_a8b_browser_admin_reusable_asset_publication_projection_v1',
    job_id: JOB_ID,
    render_state: 'render_completed',
    review_state: 'approved_for_reuse',
    publication_state: 'published',
    publication_requires_manual_admin_action: false,
    published_asset: {
      asset_id: 'reusable_template_asset__' + 'c'.repeat(40),
      template_job_id: 'fd_uc6_e2e4c2c_a7r6a_20260803T090516Z_62cee54d',
      decision: 'approve_for_reuse_and_publish',
      decision_identity: 'a8f-test-001',
      approved_at: '2026-08-05T08:00:00Z',
      reviewed_final_pptx_sha256: 'a'.repeat(64),
      reviewed_final_pdf_sha256: 'b'.repeat(64),
      source_pptx_sha256: 'c'.repeat(64),
      generation_unit_count: 54,
      slot_count: 177,
      slide_count: 7,
      asset_manifest_sha256: 'd'.repeat(64),
      catalog_entry_sha256: 'e'.repeat(64),
      approval_receipt_sha256: 'f'.repeat(64)
    },
    idempotent_replay: false,
    control_plane_contract_version: 'uc6_11c8r2_browser_admin_uc6_control_plane_v1',
    public_safety: 'PASS'
  }, overrides);
}

function allNotReadyFinalDeliveryPayload() {
  const payload = validFinalDeliveryPayload();
  for (const artifact of payload.artifacts) {
    artifact.ready = false;
    artifact.capabilities.download = { available: false, href: null };
    artifact.capabilities.view = { available: false, href: null };
  }
  return payload;
}

function extractFunctionBody(source, name) {
  const start = source.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `${name} missing`);
  const bodyStart = source.indexOf(') {', start);
  assert.notEqual(bodyStart, -1, `${name} body opener missing`);
  const open = bodyStart + 2;
  assert.notEqual(open, -1, `${name} body missing`);
  let depth = 0;
  for (let i = open; i < source.length; i += 1) {
    if (source[i] === '{') depth += 1;
    if (source[i] === '}') depth -= 1;
    if (depth === 0) return source.slice(open + 1, i);
  }
  throw new Error(`${name} body unterminated`);
}

function extractFunctionSource(source, name) {
  const start = source.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `${name} missing`);
  const bodyStart = source.indexOf(') {', start);
  assert.notEqual(bodyStart, -1, `${name} body opener missing`);
  const open = bodyStart + 2;
  assert.notEqual(open, -1, `${name} body missing`);
  let depth = 0;
  for (let i = open; i < source.length; i += 1) {
    if (source[i] === '{') depth += 1;
    if (source[i] === '}') depth -= 1;
    if (depth === 0) return source.slice(start, i + 1);
  }
  throw new Error(`${name} body unterminated`);
}

function readSource(relativePath) {
  return readFileSync(new URL(relativePath, import.meta.url), 'utf8');
}

test('API base validation accepts only production HTTPS and explicit loopback HTTP', () => {
  assert.equal(normalizeUc6ApiBaseUrl('https://api.peter-n8n.duckdns.org'), API_BASE);
  assert.equal(normalizeUc6ApiBaseUrl('https://api.peter-n8n.duckdns.org/'), API_BASE);
  assert.throws(() => normalizeUc6ApiBaseUrl('https://user:pw@api.peter-n8n.duckdns.org'), /credentials|invalid_api_base/);
  assert.throws(() => normalizeUc6ApiBaseUrl('https://api.peter-n8n.duckdns.org?x=1'), /query|invalid_api_base/);
  assert.throws(() => normalizeUc6ApiBaseUrl('https://api.peter-n8n.duckdns.org#x'), /fragment|invalid_api_base/);
  assert.throws(() => normalizeUc6ApiBaseUrl('ftp://api.peter-n8n.duckdns.org'), /scheme|invalid_api_base/);
  assert.equal(normalizeUc6ApiBaseUrl('http://127.0.0.1:8787', { allowLoopbackHttp: true }), 'http://127.0.0.1:8787/');
  assert.throws(() => normalizeUc6ApiBaseUrl('http://api.peter-n8n.duckdns.org'), /origin|invalid_api_base/);
  assert.throws(() => normalizeUc6ApiBaseUrl('https://api.peter-n8n.duckdns.org/fetchdoc'), /path|invalid_api_base/);
});

test('token and request boundary headers are bounded for each request', async () => {
  const calls = [];
  const events = [];
  const api = createUc6BrowserAdminApi({
    apiBaseUrl: API_BASE,
    getIdToken: async () => {
      events.push('token');
      return `token-${events.length}`;
    },
    fetchImpl: async (url, init) => {
      events.push('fetch');
      calls.push({ url, init });
      return response(200, { status: 'authorized' });
    }
  });

  await api.getSession();
  await api.getJob(JOB_ID);
  assert.deepEqual(events, ['token', 'fetch', 'token', 'fetch']);
  assert.equal(calls[0].init.headers.Authorization, 'Bearer token-1');
  assert.equal((calls[0].init.headers.Authorization.match(/Bearer/g) || []).length, 1);
  const internalHeader = ['X', 'Internal', 'Token'].join('-');
  assert.equal(calls[0].init.headers[internalHeader], undefined);
  assert.equal(calls[0].init.credentials, 'omit');
  assert.equal(calls[0].init.cache, 'no-store');
  assert.equal(projectUc6PersistedState({ job_id: JOB_ID, id_token: 'secret', token: 'secret' }).id_token, undefined);
  assert.equal(projectUc6PersistedState({ job_id: JOB_ID, publication_decision_identity: 'a8f-test-001' }).publication_decision_identity, 'a8f-test-001');
  assert.equal(projectUc6PersistedState({ job_id: JOB_ID, publication_decision_identity: '../bad' }).publication_decision_identity, undefined);
});

test('401 forced refresh retries once; 403 and network POST failures are not replayed', async () => {
  const calls401 = [];
  const tokenForces = [];
  const api401 = createUc6BrowserAdminApi({
    apiBaseUrl: API_BASE,
    getIdToken: async (forceRefresh) => {
      tokenForces.push(forceRefresh);
      return forceRefresh ? 'fresh' : 'stale';
    },
    fetchImpl: async (url, init) => {
      calls401.push({ url, init });
      return calls401.length === 1
        ? response(401, { detail: { code: 'browser_admin_token_expired' } })
        : response(200, { status: 'authorized' });
    }
  });
  assert.deepEqual(await api401.getSession(), { status: 'authorized' });
  assert.equal(calls401.length, 2);
  assert.deepEqual(tokenForces, [false, true]);

  const callsSecond401 = [];
  const apiSecond401 = createUc6BrowserAdminApi({
    apiBaseUrl: API_BASE,
    getIdToken: async () => 'token',
    fetchImpl: async (url, init) => {
      callsSecond401.push({ url, init });
      return response(401, { detail: { code: 'browser_admin_token_expired' } });
    }
  });
  await assert.rejects(() => apiSecond401.getSession(), { code: 'browser_admin_token_expired' });
  assert.equal(callsSecond401.length, 2);

  const calls403 = [];
  const api403 = createUc6BrowserAdminApi({
    apiBaseUrl: API_BASE,
    getIdToken: async () => 'token',
    fetchImpl: async (url, init) => {
      calls403.push({ url, init });
      return response(403, { detail: { code: 'browser_admin_role_required' } });
    }
  });
  await assert.rejects(() => api403.getSession(), { code: 'browser_admin_role_required' });
  assert.equal(calls403.length, 1);

  const callsNetwork = [];
  const apiNetwork = createUc6BrowserAdminApi({
    apiBaseUrl: API_BASE,
    getIdToken: async () => 'token',
    fetchImpl: async (url, init) => {
      callsNetwork.push({ url, init });
      throw new Error('network down');
    }
  });
  await assert.rejects(() => apiNetwork.submitAnalysis(JOB_ID, { retryFailed: false }), /network down/);
  assert.equal(callsNetwork.length, 1);
});

test('final-delivery endpoint uses exact GET route and unchanged authorization boundary', async () => {
  const calls = [];
  const forces = [];
  const api = createUc6BrowserAdminApi({
    apiBaseUrl: API_BASE,
    getIdToken: async (forceRefresh) => {
      forces.push(forceRefresh);
      return forceRefresh ? 'fresh-token' : 'initial-token';
    },
    fetchImpl: async (url, init) => {
      calls.push({ url, init });
      return response(200, validFinalDeliveryPayload());
    }
  });

  const payload = await api.getFinalDeliveryCapabilities(JOB_ID);
  assert.equal(payload.job_id, JOB_ID);
  assert.equal(UC6_BROWSER_ADMIN_ENDPOINTS.finalDeliveryCapabilities(JOB_ID), `/fetchdoc/browser-admin/uc6/jobs/${JOB_ID}/final-delivery-capabilities`);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, `${API_BASE}fetchdoc/browser-admin/uc6/jobs/${JOB_ID}/final-delivery-capabilities`);
  assert.equal(calls[0].init.method, 'GET');
  assert.equal(calls[0].init.cache, 'no-store');
  assert.equal(calls[0].init.credentials, 'omit');
  assert.equal(calls[0].init.headers.Authorization, 'Bearer initial-token');
  assert.equal(calls[0].init.headers[['X', 'Internal', 'Token'].join('-')], undefined);
  assert.equal(forces.length, 1);
  assert.deepEqual(forces, [false]);
});

test('final-delivery GET applies one forced token refresh on HTTP 401', async () => {
  const calls = [];
  const forces = [];
  const api = createUc6BrowserAdminApi({
    apiBaseUrl: API_BASE,
    getIdToken: async (forceRefresh) => {
      forces.push(forceRefresh);
      return forceRefresh ? 'fresh-token' : 'stale-token';
    },
    fetchImpl: async (url, init) => {
      calls.push({ url, init });
      return calls.length === 1
        ? response(401, { detail: { code: 'browser_admin_token_expired' } })
        : response(200, validFinalDeliveryPayload());
    }
  });

  await api.getFinalDeliveryCapabilities(JOB_ID);
  assert.equal(calls.length, 2);
  assert.deepEqual(forces, [false, true]);
  assert.equal(calls[0].init.headers.Authorization, 'Bearer stale-token');
  assert.equal(calls[1].init.headers.Authorization, 'Bearer fresh-token');
});

test('routes, methods, multipart boundary, and bounded JSON bodies are exact', async () => {
  const calls = [];
  const api = createUc6BrowserAdminApi({
    apiBaseUrl: API_BASE,
    getIdToken: async () => 'token',
    fetchImpl: async (url, init) => {
      calls.push({ url, init });
      return response(init.method === 'POST' && url.endsWith('/analysis') ? 202 : 200, { ok: true, state: 'analysis_queued' });
    }
  });

  await api.getSession();
  await api.createJob(makeBlobFile());
  await api.submitAnalysis(JOB_ID, { retryFailed: false });
  await api.getJob(JOB_ID);
  await api.getReview(JOB_ID);
  await api.getFinalDeliveryCapabilities(JOB_ID);
  await api.submitDecision(JOB_ID, { state: 'review_ready', decision: 'request_revision', review_notes: ['note'], requested_revisions: [] });

  assert.equal(calls[0].url, `${API_BASE}fetchdoc/browser-admin/session`);
  assert.equal(calls[0].init.method, 'GET');
  assert.equal(calls[1].url, `${API_BASE}fetchdoc/browser-admin/uc6/jobs`);
  assert.equal(calls[1].init.method, 'POST');
  assert.equal(calls[1].init.body.get('file').name, 'source.pptx');
  assert.equal(calls[1].init.headers['Content-Type'], undefined);
  assert.equal(calls[2].url, `${API_BASE}fetchdoc/browser-admin/uc6/jobs/${JOB_ID}/analysis`);
  assert.equal(JSON.parse(calls[2].init.body).retry_failed, false);
  assert.equal(calls[3].url, `${API_BASE}fetchdoc/browser-admin/uc6/jobs/${JOB_ID}`);
  assert.equal(calls[3].init.method, 'GET');
  assert.equal(calls[4].url, `${API_BASE}fetchdoc/browser-admin/uc6/jobs/${JOB_ID}/review`);
  assert.equal(calls[5].url, `${API_BASE}fetchdoc/browser-admin/uc6/jobs/${JOB_ID}/final-delivery-capabilities`);
  assert.equal(calls[5].init.method, 'GET');
  assert.equal(calls[6].url, `${API_BASE}fetchdoc/browser-admin/uc6/jobs/${JOB_ID}/review-decision`);
  assert.deepEqual(JSON.parse(calls[6].init.body), { decision: 'request_revision', review_notes: ['note'], requested_revisions: [] });
  assert.throws(() => normalizeUc6JobId('bad/../id'), /invalid_job_id/);
  for (const call of calls) {
    const serialized = typeof call.init.body === 'string' ? call.init.body : '';
    const taskTypeKey = ['task', 'type'].join('_');
    const retryTaskKey = ['retry', 'expected', 'task', 'id'].join('_');
    assert.equal(serialized.includes(taskTypeKey), false);
    assert.equal(serialized.includes(retryTaskKey), false);
  }
});

test('upload orchestration creates a job, publishes state callback, and submits one initial analysis', async () => {
  const file = makeBlobFile();
  const signal = new AbortController().signal;
  const events = [];
  const api = {
    async createJob(receivedFile, options) {
      events.push(['create', receivedFile === file, options.signal === signal]);
      return { job_id: ` ${JOB_ID} `, state: 'source_ready', source: { size_bytes: 4, slide_count: 2 } };
    },
    async submitAnalysis(jobId, options) {
      events.push(['analysis', jobId, options.retryFailed, options.signal === signal]);
      return { job_id: jobId, state: 'analysis_queued' };
    }
  };
  const callbacks = [];
  const result = await runUc6CreateJobAndSubmitInitialAnalysis({
    api,
    file,
    signal,
    onJobCreated(jobId, created) {
      callbacks.push({ jobId, state: created.state, eventCount: events.length });
    }
  });
  assert.equal(events.filter((event) => event[0] === 'create').length, 1);
  assert.equal(events.filter((event) => event[0] === 'analysis').length, 1);
  assert.equal(events[1][2], false);
  assert.equal(callbacks.length, 1);
  assert.equal(callbacks[0].eventCount, 1);
  assert.equal(result.jobId, JOB_ID);
  assert.equal(result.analysisResponse.state, 'analysis_queued');
  assert.equal(events[0][2], true);
  assert.equal(events[1][3], true);
});

test('upload orchestration does not analyze on create failure and does not replay analysis failure', async () => {
  const createFailureEvents = [];
  await assert.rejects(() => runUc6CreateJobAndSubmitInitialAnalysis({
    api: {
      async createJob() {
        createFailureEvents.push('create');
        throw new Error('create failed');
      },
      async submitAnalysis() {
        createFailureEvents.push('analysis');
      }
    },
    file: makeBlobFile(),
    onJobCreated() {
      createFailureEvents.push('callback');
    }
  }), /create failed/);
  assert.deepEqual(createFailureEvents, ['create']);

  const analysisFailureEvents = [];
  await assert.rejects(() => runUc6CreateJobAndSubmitInitialAnalysis({
    api: {
      async createJob() {
        analysisFailureEvents.push('create');
        return { job_id: JOB_ID, state: 'source_ready' };
      },
      async submitAnalysis() {
        analysisFailureEvents.push('analysis');
        throw new Error('analysis failed');
      }
    },
    file: makeBlobFile(),
    onJobCreated() {
      analysisFailureEvents.push('callback');
    }
  }), /analysis failed/);
  assert.deepEqual(analysisFailureEvents, ['create', 'callback', 'analysis']);
  assert.equal(analysisFailureEvents.filter((event) => event === 'analysis').length, 1);
});

test('authorization failure classification is bounded', () => {
  assert.equal(classifyUc6AuthorizationFailure({ status: 401 }), 'signed_out');
  for (const code of [
    'browser_admin_bearer_token_required',
    'browser_admin_authorization_header_invalid',
    'browser_admin_token_invalid',
    'browser_admin_token_expired'
  ]) {
    assert.equal(classifyUc6AuthorizationFailure({ code }), 'signed_out');
  }
  assert.equal(classifyUc6AuthorizationFailure({ status: 403 }), 'access_denied');
  for (const code of [
    'browser_admin_role_required',
    'browser_admin_email_unverified',
    'browser_admin_email_not_allowed'
  ]) {
    assert.equal(classifyUc6AuthorizationFailure({ code }), 'access_denied');
  }
  for (const err of [
    { code: 'browser_admin_uc6_queue_unavailable' },
    { code: 'browser_admin_uc6_service_unavailable' },
    { code: 'browser_admin_uc6_invalid_upload' },
    new Error('network'),
    Object.assign(new Error('aborted'), { name: 'AbortError' })
  ]) {
    assert.equal(classifyUc6AuthorizationFailure(err), null);
  }
});

test('public error parser never exposes raw HTML, text, tokens, or internal paths', async () => {
  const known = await parseUc6PublicError(response(400, { detail: { code: 'browser_admin_uc6_invalid_pptx' } }));
  assert.equal(known.code, 'browser_admin_uc6_invalid_pptx');
  assert.notEqual(known.message, UC6_GENERIC_PUBLIC_ERROR_MESSAGE);

  const unknownJson = await parseUc6PublicError(response(500, { detail: { code: 'unexpected', message: 'Bearer secret /data/fetchdoc' } }));
  assert.equal(unknownJson.code, 'unknown_public_error');
  assert.equal(unknownJson.message, UC6_GENERIC_PUBLIC_ERROR_MESSAGE);

  const html = await parseUc6PublicError(response(502, new Error('<html>token /data/fetchdoc</html>')));
  assert.equal(html.message, UC6_GENERIC_PUBLIC_ERROR_MESSAGE);
  assert.equal(html.message.includes('<html>'), false);
  assert.equal(html.message.includes('Bearer'), false);
  assert.equal(html.message.includes('/data/'), false);
});

test('decision line splitting and local decision validation enforce bounded input', () => {
  assert.deepEqual(splitDecisionTextLines('a\r\nb\n\n c '), ['a', 'b', 'c']);
  assert.deepEqual(splitDecisionTextLines('a\rb'), ['a', 'b']);
  assert.equal(splitDecisionTextLines(Array.from({ length: 20 }, (_, i) => `line ${i}`).join('\n')).length, 20);
  assert.throws(() => splitDecisionTextLines(Array.from({ length: 21 }, (_, i) => `line ${i}`).join('\n')), /too_many/);
  assert.throws(() => splitDecisionTextLines('x'.repeat(1001)), /too_long/);
  assert.equal(validateUc6DecisionCommand({ state: 'review_ready', decision: 'approve', review_notes: [], requested_revisions: ['change'] }).ok, false);
  assert.equal(validateUc6DecisionCommand({ state: 'review_ready', decision: 'request_revision', review_notes: [], requested_revisions: [] }).ok, false);
  assert.equal(validateUc6DecisionCommand({ state: 'review_ready', decision: 'reject', review_notes: [], requested_revisions: [] }).ok, false);
  assert.equal(validateUc6DecisionCommand({ state: 'review_blocked', decision: 'approve', review_notes: [], requested_revisions: [] }).ok, false);
  assert.equal(validateUc6DecisionCommand({ state: 'review_ready_with_warnings', decision: 'approve', review_notes: ['ok'], requested_revisions: [] }).ok, true);
});

test('state mapping is fail-closed and separates poll, retry, review, terminal states', () => {
  assert.equal(mapUc6StateToView('analysis_queued').pollable, true);
  assert.equal(mapUc6StateToView('analysis_running').pollable, true);
  assert.equal(mapUc6StateToView('failed').canRetry, true);
  assert.equal(mapUc6StateToView('review_ready').reviewReady, true);
  assert.equal(mapUc6StateToView('review_ready_with_warnings').reviewReady, true);
  assert.equal(mapUc6StateToView('review_blocked').reviewReady, true);
  assert.equal(mapUc6StateToView('approved').terminal, true);
  assert.equal(mapUc6StateToView('revision_requested').terminal, true);
  assert.equal(mapUc6StateToView('rejected').terminal, true);
  assert.equal(mapUc6StateToView('mystery').known, false);
  assert.equal(mapUc6StateToView('mystery').pollable, false);
});

test('persistence projection keeps only public allowlisted fields', () => {
  const projected = projectUc6PersistedState({
    job_id: JOB_ID,
    last_known_public_state: 'analysis_running',
    last_polling_timestamp: 123,
    selected_panel: 'review',
    id_token: 'token',
    token: 'token',
    firebase_user: { uid: 'uid' },
    uid: 'uid',
    email: 'a@example.com',
    source: { sha256: 'sha' },
    review: { public_review_surface: {} },
    finalDelivery: validFinalDeliveryPayload(),
    final_delivery: { href: '/signed?sig=secret' },
    capability_href: '/signed?sig=secret',
    raw_capability_response: { artifacts: [] },
    task_id: 'task',
    queue_payload: { x: true }
  });
  assert.deepEqual(projected, {
    job_id: JOB_ID,
    last_known_public_state: 'analysis_running',
    last_polling_timestamp: 123,
    selected_panel: 'review'
  });
});

function assertNoObjectLeak(value) {
  const strings = [];
  const visit = (item) => {
    if (typeof item === 'string') strings.push(item);
    else if (Array.isArray(item)) item.forEach(visit);
    else if (item && typeof item === 'object') Object.values(item).forEach(visit);
  };
  visit(value);
  const display = strings.join('\n');
  assert.equal(display.includes('[object Object]'), false);
  assert.equal(display.includes('{"'), false);
  assert.equal(display.includes('Bearer'), false);
  assert.equal(display.includes('/data/'), false);
  assert.equal(display.includes('/app/'), false);
  assert.equal(display.includes('file://'), false);
  assert.equal(/[A-Za-z]:[\\/]/.test(display), false);
  assert.equal(/(^|\n)(\\\\|\/\/)/.test(display), false);
  assert.equal(display.includes('x-internal-token'), false);
  assert.equal(display.includes('internal_secret_token'), false);
  assert.equal(display.includes('traceback'), false);
  assert.equal(display.includes('http://'), false);
  assert.equal(display.includes('https://'), false);
}

test('A8-E persistence requires paired package identity and a bounded timestamp', () => {
  assert.deepEqual(projectUc6PersistedState({
    job_id: JOB_ID,
    flow_lane: 'dummy_render',
    selected_package_id: 'pkg1',
    last_polling_timestamp: -1
  }), {
    job_id: JOB_ID,
    flow_lane: 'dummy_render'
  });
  assert.deepEqual(projectUc6PersistedState({
    job_id: JOB_ID,
    flow_lane: 'dummy_render',
    selected_package_id: 'pkg1',
    selected_package_version: 'v1',
    last_polling_timestamp: 123
  }), {
    job_id: JOB_ID,
    last_polling_timestamp: 123,
    flow_lane: 'dummy_render',
    selected_package_id: 'pkg1',
    selected_package_version: 'v1'
  });
});

test('review issue projection presents production-shaped warning preview safely', () => {
  const review = {
    warning_count: 231,
    blocking_issue_count: 0,
    public_review_surface: {
      top_warnings: Array.from({ length: 5 }, (_, index) => ({
        warning_id: index === 0 ? 'warning__missing_segment_mapping__slide_1' : `warning__reason_${index + 1}__slide_${index + 1}`,
        reason_code: index === 0 ? 'missing_segment_mapping' : `warning_reason_${index + 1}`,
        target_ref: `slide_${index + 1}`,
        ignored_payload: { secret: 'Bearer token' }
      }))
    }
  };
  const projected = projectUc6ReviewIssuePresentation(review);
  assert.equal(projected.warnings.totalCount, 231);
  assert.equal(projected.warnings.previewCount, 5);
  assert.equal(projected.warnings.omittedCount, 226);
  assert.equal(projected.blockers.totalCount, 0);
  assert.equal(projected.warnings.items[0].title, 'Missing segment mapping');
  assert.equal(projected.warnings.items[0].technicalId, 'warning__missing_segment_mapping__slide_1');
  assert.equal(projected.warnings.items[0].reasonCode, 'missing_segment_mapping');
  assert.equal(projected.warnings.items[0].contextLabel, '대상');
  assert.equal(projected.warnings.items[0].contextValue, 'slide_1');
  assertNoObjectLeak(projected);
});

test('review issue projection presents production-shaped blockers prominently and bounded', () => {
  const projected = projectUc6ReviewIssuePresentation({
    blocking_issue_count: 2,
    warning_count: 0,
    public_review_surface: {
      top_blockers: [
        {
          blocker_id: 'block-1',
          reason_code: 'missing_required_asset',
          severity: 'high',
          affected_segment_ids: ['seg-a', 'seg-b', { ignored: true }]
        },
        {
          blocker_id: 'block-2',
          reason_code: 'render_blocked',
          affected_segment_ids: ['seg-c']
        }
      ]
    }
  });
  assert.equal(projected.blockers.totalCount, 2);
  assert.equal(projected.blockers.previewCount, 2);
  assert.equal(projected.blockers.omittedCount, 0);
  assert.equal(projected.blockers.items[0].kind, 'blocker');
  assert.equal(projected.blockers.items[0].title, 'Missing required asset');
  assert.equal(projected.blockers.items[0].contextLabel, '영향 구간');
  assert.equal(projected.blockers.items[0].contextValue, 'seg-a, seg-b');
  assert.equal(projected.blockers.items[0].technicalId, 'block-1');
  assertNoObjectLeak(projected);
});

test('review issue projection truncates previews, supports scalar fixtures, and normalizes counts', () => {
  const projected = projectUc6ReviewIssuePresentation({
    blocking_issue_count: -4,
    warning_count: 8,
    public_review_surface: {
      top_blockers: ['legacy blocker'],
      top_warnings: Array.from({ length: 9 }, (_, index) => `warning ${index + 1}`)
    }
  });
  assert.equal(projected.blockers.totalCount, 1);
  assert.equal(projected.blockers.previewCount, 1);
  assert.equal(projected.blockers.omittedCount, 0);
  assert.equal(projected.blockers.items[0].title, 'legacy blocker');
  assert.equal(projected.warnings.totalCount, 8);
  assert.equal(projected.warnings.previewCount, 5);
  assert.equal(projected.warnings.omittedCount, 3);
  assert.deepEqual(projected.warnings.items.map((item) => item.title), ['warning 1', 'warning 2', 'warning 3', 'warning 4', 'warning 5']);
});

test('review issue projection ignores malformed nested objects and bounds unsafe text', () => {
  const longReason = `reason_${'x'.repeat(220)}`;
  const projected = projectUc6ReviewIssuePresentation({
    blocking_issue_count: 1,
    warning_count: 3,
    public_review_surface: {
      top_blockers: [{ message: { nested: true }, reason_code: { nested: true }, blocker_id: { nested: true } }],
      top_warnings: [
        { summary: 'Readable\u0000 warning\n title', reason_code: longReason, warning_id: `warn-${'y'.repeat(200)}`, target_ref: { name: 'Deck target', ignored: { object: true } } },
        { message: { nested: true }, target_ref: { slide_id: { nested: true } } },
        { label: true, code: false, target_ref: 'not-object' }
      ]
    }
  });
  assert.equal(projected.blockers.previewCount, 0);
  assert.equal(projected.blockers.totalCount, 1);
  assert.equal(projected.blockers.omittedCount, 1);
  assert.equal(projected.warnings.totalCount, 3);
  assert.equal(projected.warnings.previewCount, 2);
  assert.equal(projected.warnings.omittedCount, 1);
  assert.equal(projected.warnings.items[0].title, 'Readable warning title');
  assert.equal(projected.warnings.items[0].reasonCode.length <= 128, true);
  assert.equal(projected.warnings.items[0].technicalId.length <= 128, true);
  assert.equal(projected.warnings.items[0].contextValue, '대상 Deck target');
  assert.equal(projected.warnings.items[1].title, 'true');
  assert.equal(projected.warnings.items[1].reasonCode, 'false');
  assertNoObjectLeak(projected);
});

test('review issue projection omits unsafe scalar display values', () => {
  const projected = projectUc6ReviewIssuePresentation({
    blocking_issue_count: 3,
    warning_count: 10,
    public_review_surface: {
      top_blockers: [
        '/data/fetchdoc/jobs/private',
        'Bearer abc123',
        'C:\\secret\\file.pptx',
        '\\\\server\\share\\file.pptx',
        { message: '/app/private/path', reason_code: 'safe_blocker_reason', blocker_id: 'block-safe-1' }
      ],
      top_warnings: [
        'file://private/file.pptx',
        'x-internal-token: secret',
        'internal_secret_token value',
        'traceback line 1',
        'https://private.example/path',
        '{"raw":"json"}',
        { message: '/data/fetchdoc/jobs/private', reason_code: 'safe_warning_reason', warning_id: 'warn-safe-1', target_ref: '/data/fetchdoc/jobs/private' },
        { label: 'Safe warning title', code: 'safe_code', warning_id: 'warn-safe-2', source_artifact: 'C:/secret/file.pptx' },
        { reason_code: 'missing_segment_mapping', warning_id: 'warn-safe-3', target_ref: 'slide_7' }
      ]
    }
  });
  assert.equal(projected.blockers.previewCount, 1);
  assert.equal(projected.blockers.items[0].title, 'Safe blocker reason');
  assert.equal(projected.warnings.previewCount, 3);
  assert.equal(projected.warnings.items[0].title, 'Safe warning reason');
  assert.equal(projected.warnings.items[0].contextValue, undefined);
  assert.equal(projected.warnings.items[1].title, 'Safe warning title');
  assert.equal(projected.warnings.items[1].contextValue, undefined);
  assert.equal(projected.warnings.items[2].contextValue, 'slide_7');
  assertNoObjectLeak(projected);
});

test('review issue projection scans a bounded source window to collect five safe previews', () => {
  const projected = projectUc6ReviewIssuePresentation({
    warning_count: 12,
    public_review_surface: {
      top_warnings: [
        '/data/fetchdoc/jobs/private',
        'Bearer abc123',
        ...Array.from({ length: 7 }, (_, index) => ({ reason_code: `safe_reason_${index + 1}`, warning_id: `warn-${index + 1}`, target_ref: `slide_${index + 1}` }))
      ]
    }
  });
  assert.equal(projected.warnings.previewCount, 5);
  assert.equal(projected.warnings.omittedCount, 7);
  assert.deepEqual(projected.warnings.items.map((item) => item.contextValue), ['slide_1', 'slide_2', 'slide_3', 'slide_4', 'slide_5']);
  assertNoObjectLeak(projected);
});

test('final-delivery projection accepts ready and all-not-ready contracts', () => {
  const ready = projectUc6FinalDeliveryCapabilities(validFinalDeliveryPayload(), { expectedJobId: JOB_ID, apiBaseUrl: API_BASE });
  assert.equal(ready.readyCount, 2);
  assert.equal(ready.totalCount, 2);
  assert.equal(ready.artifacts[0].alias, 'final_render_output_pdf');
  assert.equal(ready.artifacts[0].label, 'PDF');
  assert.equal(ready.artifacts[0].actions.view.available, true);
  assert.equal(ready.artifacts[0].actions.view.href.startsWith(API_BASE), true);
  assert.equal(ready.artifacts[0].actions.download.href.startsWith(API_BASE), true);
  assert.equal(ready.artifacts[1].label, 'PowerPoint');
  assert.equal(ready.artifacts[1].actions.download.available, true);
  assert.equal(ready.artifacts[1].actions.download.href.startsWith(API_BASE), true);
  assert.equal(ready.artifacts[1].actions.view.available, false);
  assert.equal(ready.artifacts[1].actions.view.href, null);

  const waiting = projectUc6FinalDeliveryCapabilities(allNotReadyFinalDeliveryPayload(), { expectedJobId: JOB_ID, apiBaseUrl: API_BASE });
  assert.equal(waiting.readyCount, 0);
  assert.equal(waiting.artifacts.every((artifact) => artifact.ready === false), true);
  assert.equal(waiting.artifacts.every((artifact) => artifact.actions.download.href === null && artifact.actions.view.href === null), true);
});

test('final-delivery projection rejects malformed or unsafe contracts', () => {
  const reject = (mutate) => {
    const payload = validFinalDeliveryPayload();
    mutate(payload);
    assert.throws(() => projectUc6FinalDeliveryCapabilities(payload, { expectedJobId: JOB_ID, apiBaseUrl: API_BASE }), TypeError);
  };

  assert.throws(() => projectUc6FinalDeliveryCapabilities(null, { expectedJobId: JOB_ID, apiBaseUrl: API_BASE }), TypeError);
  reject((payload) => { payload.job_id = 'fd_uc6_admin_other_12345'; });
  reject((payload) => { payload.artifacts.reverse(); });
  reject((payload) => { payload.artifacts.pop(); });
  reject((payload) => { payload.artifacts[0].alias = 'unknown_alias'; });
  reject((payload) => { payload.artifacts[0].media_type = 'application/octet-stream'; });
  reject((payload) => { payload.artifacts[0].ready = 'true'; });
  reject((payload) => { payload.artifacts[0].capabilities.download.available = 'true'; });
  reject((payload) => { payload.artifacts[0].capabilities.download = { available: false, href: '/still-present' }; });
  reject((payload) => { payload.artifacts[0].capabilities.download = { available: true, href: null }; });
  reject((payload) => { payload.artifacts[0].capabilities.download.href = '//evil.example/path'; });
  reject((payload) => { payload.artifacts[0].capabilities.download.href = 'https://evil.example/path'; });
  reject((payload) => { payload.artifacts[0].ready = false; });
  reject((payload) => { payload.artifacts[1].capabilities.view = { available: true, href: '/pptx/view' }; });
  for (const filename of ['../final.pdf', 'nested/final.pdf', 'nested\\final.pdf', 'bad\u0000name.pdf', '']) {
    reject((payload) => { payload.artifacts[0].suggested_filename = filename; });
  }
});

test('mock browser control-plane flow stays bounded through revision request and semantic replay', async () => {
  const calls = [];
  const statuses = ['analysis_queued', 'analysis_running', 'review_ready_with_warnings', 'revision_requested'];
  const api = createUc6BrowserAdminApi({
    apiBaseUrl: API_BASE,
    getIdToken: async () => 'token',
    fetchImpl: async (url, init) => {
      calls.push({ url, init });
      const obsoletePath = ['/webhook', 'fetchdoc', 'uc6'].join('/');
      assert.equal(url.includes(obsoletePath), false);
      const internalHeader = ['X', 'Internal', 'Token'].join('-');
      assert.equal(init.headers[internalHeader], undefined);
      if (url.endsWith('/session')) return response(200, { status: 'authorized', principal: { authenticated: true, authorized: true, email_verified: true, admin_claim: 'fetchdoc_admin' } });
      if (url.endsWith('/uc6/jobs')) return response(201, { job_id: JOB_ID, state: 'source_ready', source: { size_bytes: 4, slide_count: 2, filename: 'source.pptx', sha256: 'hidden' } });
      if (url.endsWith('/analysis')) return response(202, { job_id: JOB_ID, state: 'analysis_queued', created: true });
      if (url.endsWith('/review')) return response(200, { job_id: JOB_ID, state: 'review_ready_with_warnings', warning_count: 1, public_review_surface: { top_warnings: ['w'] } });
      if (url.endsWith('/review-decision')) return response(200, { job_id: JOB_ID, state: 'revision_requested', decision: 'request_revision' });
      return response(200, { job_id: JOB_ID, state: statuses.shift() });
    }
  });

  await api.getSession();
  await api.createJob(makeBlobFile());
  await api.submitAnalysis(JOB_ID, { retryFailed: false });
  const seen = [await api.getJob(JOB_ID), await api.getJob(JOB_ID), await api.getJob(JOB_ID)];
  await api.getReview(JOB_ID);
  const decision = await api.submitDecision(JOB_ID, { state: 'review_ready_with_warnings', decision: 'request_revision', review_notes: ['revise'], requested_revisions: [] });
  const finalStatus = await api.getJob(JOB_ID);

  assert.deepEqual(seen.map((item) => item.state), ['analysis_queued', 'analysis_running', 'review_ready_with_warnings']);
  assert.equal(decision.state, 'revision_requested');
  assert.equal(finalStatus.state, 'revision_requested');
  assert.equal(calls.filter((call) => call.url.endsWith('/uc6/jobs')).length, 1);
  assert.equal(calls.filter((call) => call.url.endsWith('/analysis')).length, 1);
  assert.equal(calls.filter((call) => call.url.endsWith('/review')).length, 1);
  assert.equal(calls.filter((call) => call.url.endsWith('/review-decision')).length, 1);
});

test('mock 403, failed retry, and review-blocked approve guard are bounded', async () => {
  const api403 = createUc6BrowserAdminApi({
    apiBaseUrl: API_BASE,
    getIdToken: async () => 'token',
    fetchImpl: async () => response(403, { detail: { code: 'browser_admin_email_not_allowed' } })
  });
  await assert.rejects(() => api403.getSession(), { code: 'browser_admin_email_not_allowed' });

  const retryBodies = [];
  const apiRetry = createUc6BrowserAdminApi({
    apiBaseUrl: API_BASE,
    getIdToken: async () => 'token',
    fetchImpl: async (url, init) => {
      if (url.endsWith('/analysis')) retryBodies.push(JSON.parse(init.body));
      return response(200, { state: 'analysis_queued' });
    }
  });
  assert.equal(mapUc6StateToView('failed').canRetry, true);
  await apiRetry.submitAnalysis(JOB_ID, { retryFailed: true });
  assert.deepEqual(retryBodies, [{ retry_failed: true }]);

  assert.equal(validateUc6DecisionCommand({ state: 'review_blocked', decision: 'approve', review_notes: [], requested_revisions: [] }).ok, false);
});

test('app controller source guards lock repaired upload, retry, review, and auth-boundary paths', () => {
  const source = readFileSync(new URL('../public/app.js', import.meta.url), 'utf8');
  const uploadBody = extractFunctionBody(source, 'uploadUC6PptxJob');
  const initBody = extractFunctionBody(source, 'initUC6');
  const decisionBody = extractFunctionBody(source, 'submitUC6Decision');
  const refreshBody = extractFunctionBody(source, 'refreshUC6JobStatus');
  const finalDeliveryBody = extractFunctionBody(source, 'fetchUC6FinalDeliveryCapabilities');
  const resetBody = extractFunctionBody(source, 'resetUC6JobState');
  const persistBody = extractFunctionBody(source, 'saveUC6LocalState');
  const pollBody = extractFunctionBody(source, 'pollUC6JobStatus');
  const analysisBody = extractFunctionBody(source, 'submitUC6Analysis');
  const reviewBody = extractFunctionBody(source, 'fetchUC6Review');
  const renderReviewBody = extractFunctionBody(source, 'renderUC6ReviewStage');
  const issueOverviewBody = extractFunctionBody(source, 'renderUC6IssueOverview');
  const issueGroupBody = extractFunctionBody(source, 'renderUC6IssueGroup');
  const issueRowBody = extractFunctionBody(source, 'renderUC6IssueRow');
  const authHandlerBody = extractFunctionBody(source, 'handleUC6AuthorizationFailure');

  assert.equal(uploadBody.includes('submitUC6Analysis(false)'), false);
  assert.equal(uploadBody.includes('loadUC6PackageOptions'), false);
  assert.equal(uploadBody.includes('reconcileUC6FreshSyntheticScenarios'), true);
  assert.equal((uploadBody.match(/operationInFlight = true/g) || []).length, 1);
  assert.equal(initBody.includes('submitUC6Analysis(true)'), true);
  assert.equal((decisionBody.match(/refreshUC6JobStatus/g) || []).length, 1);
  assert.equal(refreshBody.includes("uc6State.jobState === 'approved'"), true);
  assert.equal(refreshBody.includes('fetchUC6FinalDeliveryCapabilities(options.signal)'), true);
  assert.equal(refreshBody.includes('else clearUC6FinalDeliveryState()'), true);
  assert.equal(finalDeliveryBody.includes("uc6State.jobState !== 'approved'"), true);
  assert.equal(finalDeliveryBody.includes('uc6State.finalDeliveryRequestActive'), true);
  assert.equal(finalDeliveryBody.includes('getFinalDeliveryCapabilities'), true);
  assert.equal(finalDeliveryBody.includes('projectUc6FinalDeliveryCapabilities'), true);
  assert.equal(finalDeliveryBody.includes('handleUC6AuthorizationFailure(error)'), true);
  assert.equal(source.includes('projectUc6ReviewIssuePresentation,'), true);
  assert.equal(renderReviewBody.includes('projectUc6ReviewIssuePresentation(review)'), true);
  assert.equal(renderReviewBody.includes('toUc6DisplayLines(surface.top_warnings'), false);
  assert.equal(renderReviewBody.includes('toUc6DisplayLines(surface.top_blockers'), false);
  assert.equal(renderReviewBody.includes("appendUC6DetailSection(details, '차단·경고'"), false);
  assert.equal(issueOverviewBody.includes('warnings.totalCount > 0'), true);
  assert.equal(issueOverviewBody.includes('warnings.totalCount <= 3'), true);
  assert.equal(issueOverviewBody.includes('아래에는 대표'), true);
  assert.equal(issueOverviewBody.includes('renderUC6IssueGroup'), true);
  assert.equal(issueGroupBody.indexOf("createUc6Node('p', 'uc6-issue-summary', copy)") < issueGroupBody.indexOf("createUc6Node('details'"), true);
  assert.equal(issueGroupBody.includes("createUc6Node('section', `uc6-issue-group"), true);
  assert.equal(issueGroupBody.includes("createUc6Node('details'"), true);
  assert.equal(issueGroupBody.includes("createUc6Node('summary'"), true);
  assert.equal(issueGroupBody.includes('group.items.slice(0, 5)'), true);
  assert.equal(issueGroupBody.includes('대표 항목 세부 정보를 안전하게 표시할 수 없습니다.'), true);
  assert.equal(issueRowBody.includes('createUc6Node'), true);
  assert.equal(resetBody.includes('clearUC6FinalDeliveryState()'), true);
  assert.equal(persistBody.includes('finalDelivery'), false);
  assert.equal(persistBody.includes('capabilit'), false);
  assert.equal(initBody.includes('uc6-refreshFinalDeliveryBtn'), true);
  assert.equal(decisionBody.includes('await fetchUC6Review(controller.signal)'), false);
  assert.equal(pollBody.includes('handleUC6AuthorizationFailure(error)'), true);
  assert.equal(analysisBody.includes('handleUC6AuthorizationFailure(error)'), true);
  assert.equal(reviewBody.includes('handleUC6AuthorizationFailure(error)'), true);
  assert.equal(decisionBody.includes('handleUC6AuthorizationFailure(error)'), true);
  assert.equal(uploadBody.includes('handleUC6AuthorizationFailure(error)'), true);
  assert.equal(authHandlerBody.includes('classifyUc6AuthorizationFailure(error)'), true);
});

test('UC6 redesigned HTML keeps compact auth controls and one dynamic stage shell', () => {
  const html = readSource('../public/index.html');
  const uc6Start = html.indexOf('id="view-uc6"');
  const uc6 = html.slice(uc6Start, html.indexOf('    </main>', uc6Start));
  assert.notEqual(uc6.length, 0);
  assert.equal((html.match(/id="uc6-signInBtn"/g) || []).length, 1);
  assert.equal((html.match(/id="uc6-signOutBtn"/g) || []).length, 1);
  assert.equal((html.match(/id="uc6-refreshSessionBtn"/g) || []).length, 1);
  assert.equal(uc6.includes('Administrator session'), false);
  assert.equal(uc6.includes('PPTX job intake'), false);
  assert.equal(uc6.includes('Analysis status'), false);
  assert.equal(uc6.includes('Admin review'), false);
  assert.equal(uc6.includes('Public-safe diagnostics'), false);
  assert.equal((uc6.match(/data-uc6-step=/g) || []).length, 5);
  for (const label of ['PPTX 등록', '분석', '결과 검토', '결정', '완료']) {
    assert.equal(uc6.includes(label), true);
  }
  assert.equal((html.match(/id="uc6-activeStageRoot"/g) || []).length, 1);
  assert.equal((html.match(/id="uc6-contextSummary"/g) || []).length, 1);
  assert.equal((html.match(/aria-live=/g) || []).length, 1);
  for (const obsoleteId of ['uc6-reviewSummaryGrid', 'uc6-diagnosticsList', 'uc6-sourceSize', 'uc6-sourceSlides', 'uc6-jobState']) {
    assert.equal(uc6.includes(obsoleteId), false);
  }
  for (const heading of ['Global readiness', 'Blockers', 'Warnings', 'Admin actions', 'Review decision']) {
    assert.equal(uc6.includes(heading), false);
  }
});

test('UC6 presentation stage mapper is deterministic and presentation-only', () => {
  const source = readSource('../public/app.js');
  const mapper = new Function(`return (${extractFunctionSource(source, 'mapUC6PublicStateToStage')});`)();
  assert.equal(mapper({ authorizationState: 'signed_out', publicState: null }), 'auth');
  assert.equal(mapper({ authorizationState: 'access_denied', publicState: 'review_ready' }), 'auth');
  assert.equal(mapper({ authorizationState: 'authorized', publicState: null }), 'intake');
  assert.equal(mapper({ authorizationState: 'authorized', publicState: 'idle' }), 'intake');
  assert.equal(mapper({ authorizationState: 'authorized', publicState: 'source_ready' }), 'intake');
  assert.equal(mapper({ authorizationState: 'authorized', publicState: 'analysis_queued' }), 'analysis');
  assert.equal(mapper({ authorizationState: 'authorized', publicState: 'analysis_running' }), 'analysis');
  assert.equal(mapper({ authorizationState: 'authorized', publicState: 'failed' }), 'analysis_error');
  assert.equal(mapper({ authorizationState: 'authorized', publicState: 'review_ready' }), 'review');
  assert.equal(mapper({ authorizationState: 'authorized', publicState: 'review_ready_with_warnings' }), 'review');
  assert.equal(mapper({ authorizationState: 'authorized', publicState: 'review_blocked' }), 'review');
  assert.equal(mapper({ authorizationState: 'authorized', publicState: 'review_ready', decisionMode: true }), 'decision');
  assert.equal(mapper({ authorizationState: 'authorized', publicState: 'approved' }), 'complete');
  assert.equal(mapper({ authorizationState: 'authorized', publicState: 'revision_requested' }), 'complete');
  assert.equal(mapper({ authorizationState: 'authorized', publicState: 'rejected' }), 'complete');
  assert.equal(mapper({ authorizationState: 'authorized', publicState: 'mystery' }), 'unavailable');
});

test('UC6 dynamic renderer avoids hidden focusable stage panels and empty placeholders', () => {
  const source = readSource('../public/app.js');
  const html = readSource('../public/index.html');
  const intakeBody = extractFunctionBody(source, 'renderUC6IntakeStage');
  const analysisBody = extractFunctionBody(source, 'renderUC6AnalysisStage');
  const reviewBody = extractFunctionBody(source, 'renderUC6ReviewStage');
  const decisionBody = extractFunctionBody(source, 'renderUC6DecisionStage');
  const completeBody = extractFunctionBody(source, 'renderUC6CompleteStage');
  const finalDeliverySection = extractFunctionBody(source, 'renderUC6FinalDeliverySection');
  const artifactCard = extractFunctionBody(source, 'renderUC6ArtifactCard');
  const activeBody = extractFunctionBody(source, 'renderUC6ActiveStage');
  assert.equal(activeBody.includes('root.replaceChildren'), false);
  assert.equal(source.includes('replaceChildren(card)'), true);
  assert.equal(html.includes('id="uc6-pptxFileInput"'), false);
  assert.equal(html.includes('id="uc6-retryAnalysisBtn"'), false);
  assert.equal(intakeBody.includes('Job ID'), false);
  assert.equal(intakeBody.includes('파일 크기'), true);
  assert.equal(intakeBody.includes('슬라이드'), true);
  assert.equal(analysisBody.includes('uc6-retryAnalysisBtn'), true);
  assert.equal(analysisBody.includes('if (failed)'), true);
  assert.equal(reviewBody.includes('filter((item) => hasUC6Value(item[1]))'), true);
  assert.equal(decisionBody.includes("decision === 'request_revision'"), true);
  assert.equal(decisionBody.includes("decision === 'reject'"), true);
  assert.equal(completeBody.includes("uc6State.jobState === 'approved'"), true);
  assert.equal(completeBody.includes('renderUC6FinalDeliverySection()'), true);
  assert.equal(finalDeliverySection.includes('최종 산출물'), true);
  assert.equal(finalDeliverySection.includes('PDF'), true);
  assert.equal(finalDeliverySection.includes('PowerPoint'), true);
  assert.equal(finalDeliverySection.includes('uc6-refreshFinalDeliveryBtn'), true);
  assert.equal(artifactCard.includes('PDF 보기'), true);
  assert.equal(artifactCard.includes('PDF 다운로드'), true);
  assert.equal(artifactCard.includes('PPTX 다운로드'), true);
  assert.equal(artifactCard.includes('PPTX 보기'), false);
  assert.equal(artifactCard.includes('생성 대기 중'), true);
  assert.equal(`${completeBody}\n${finalDeliverySection}\n${artifactCard}`.includes('생성 버튼'), false);
  assert.equal(`${completeBody}\n${finalDeliverySection}\n${artifactCard}`.includes('generate'), false);
  assert.equal(`${completeBody}\n${finalDeliverySection}\n${artifactCard}`.includes('capabilities'), false);
  assert.equal(`${completeBody}\n${finalDeliverySection}\n${artifactCard}`.includes('/data/'), false);
});

test('authentication, token processing, endpoints, route constants, and webhooks stay bounded', () => {
  const app = readSource('../public/app.js');
  const html = readSource('../public/index.html');
  const admin = readSource('../public/uc6-browser-admin.mjs');
  assert.equal(app.includes("const UC6_FIREBASE_SDK_VERSION = '10.14.1'"), true);
  assert.equal(app.includes('app.uc6-r6e-c2-synthetic-scenario-binding-2026-08-13-v1'), true);
  assert.equal(app.includes('projectUc6DummyDatabagPackageOptions'), true);
  assert.equal(app.includes('projectUc6DummyDatabagRenderSubmission'), true);
  assert.equal(app.includes('projectUc6DummyDatabagRenderJobStatus'), true);
  assert.equal(app.includes('signInWithPopup'), true);
  assert.equal(app.includes('signInWithRedirect'), true);
  assert.equal(app.includes('browserSessionPersistence'), true);
  assert.equal(app.includes('getIdToken(true)'), true);
  assert.equal(app.includes('validateUc6SessionContract(session)'), true);
  for (const endpoint of [
    '/fetchdoc/browser-admin/session',
    '/fetchdoc/browser-admin/uc6/jobs',
    '/analysis',
    '/review',
    '/review-decision',
    '/final-delivery-capabilities',
    '/review-artifact-capabilities',
    '/reusable-asset-publication'
  ]) {
    assert.equal(admin.includes(endpoint), true);
  }
  assert.equal(admin.includes("X-Internal-Token"), false);
  assert.equal(admin.includes("cache: 'no-store'"), true);
  assert.equal(admin.includes("credentials: 'omit'"), true);
  assert.equal(admin.includes('getIdToken(forceRefresh === true)'), true);
  assert.equal(admin.includes('if (response?.status === 401)'), true);
  for (const id of ['view-uc1', 'view-uc2', 'view-uc3', 'view-uc4', 'view-uc5']) {
    assert.equal(html.includes(`id="${id}"`), true);
    assert.equal(html.includes(`data-target="${id}"`), true);
  }
  for (const constant of ['UC1_WEBHOOK', 'UC2_WEBHOOK', 'UC3_START_CALL', 'UC4_WEBHOOK', 'UC5_W00_WEBHOOK', 'UC5_W03_WEBHOOK']) {
    assert.equal(app.includes(constant), true);
  }
});

test('new UC6 CSS selectors stay scoped under view-uc6', () => {
  const css = readSource('../public/style.css');
  const marker = css.indexOf('UC6 - FetchDoc Dynamic Stage UI');
  assert.notEqual(marker, -1);
  const uc6Css = css.slice(marker);
  const selectorBlocks = [...uc6Css.matchAll(/(^|})\\s*([^@{}][^{}]*)\\{/g)].map((match) => match[2].trim());
  for (const selector of selectorBlocks) {
    for (const part of selector.split(',')) {
      const trimmed = part.trim();
      if (!trimmed || trimmed === 'from' || trimmed === 'to') continue;
      assert.equal(trimmed.startsWith('#view-uc6'), true, `unscoped selector: ${trimmed}`);
    }
  }
  assert.equal(uc6Css.includes('@media (max-width: 1024px)'), true);
  assert.equal(uc6Css.includes('@media (max-width: 800px)'), true);
  assert.equal(uc6Css.includes(':focus-visible'), true);
  for (const selector of [
    '#view-uc6 .uc6-issue-overview',
    '#view-uc6 .uc6-issue-group',
    '#view-uc6 .uc6-issue-disclosure',
    '#view-uc6 .uc6-issue-list',
    '#view-uc6 .uc6-issue-row',
    '#view-uc6 .uc6-issue-title',
    '#view-uc6 .uc6-issue-context',
    '#view-uc6 .uc6-issue-meta',
    '#view-uc6 .uc6-package-grid',
    '#view-uc6 .uc6-package-card',
    '#view-uc6 .uc6-render-evidence',
    '#view-uc6 .uc6-hash-display'
  ]) {
    assert.equal(uc6Css.includes(selector), true);
  }
});

test('A8-E Section 11: Direct Contract Smoke Test', () => {
  const submissionPayload = {
    schema_version: 'uc6_e2e4c2c_a8d_browser_admin_dummy_databag_render_submission_v1',
    job_id: JOB_ID,
    task_type: 'fetchdoc_browser_admin_uc6_render_dummy_databag_package',
    task_id: 2471,
    queue_status: 'pending',
    created: true,
    state: 'render_queued',
    bound_package: {
      package_id: 'ax_customer_retention',
      package_version: 'v1',
      title: 'Customer Retention',
      description: 'Customer retention scenario'
    },
    control_plane_contract_version: 'uc6_e2e4c2c_v1',
    public_safety: 'PASS'
  };

  const queuedEnvelope = {
    job_id: JOB_ID,
    state: 'render_queued',
    source: {
      sha256: 'a'.repeat(64),
      size_bytes: 10240,
      slide_count: 10,
      filename: 'source.pptx'
    },
    control_plane_contract_version: 'uc6_e2e4c2c_v1'
  };

  const completedEnvelope = {
    job_id: JOB_ID,
    state: 'render_completed',
    source: {
      sha256: 'a'.repeat(64),
      size_bytes: 10240,
      slide_count: 10,
      filename: 'source.pptx'
    },
    render: {
      schema_version: 'uc6_e2e4c2c_a8d_browser_admin_dummy_databag_render_result_v1',
      job_id: JOB_ID,
      state: 'render_completed',
      render_state: 'render_completed',
      review_state: 'review_pending',
      publication_state: 'unpublished',
      promotion_eligible: true,
      bound_package: {
        package_id: 'ax_customer_retention',
        package_version: 'v1',
        title: 'Customer Retention',
        description: 'Customer retention scenario'
      },
      final_artifacts: {
        pptx: {
          alias: 'final_render_output_pptx',
          sha256: 'b'.repeat(64),
          size_bytes: 20480
        },
        pdf: {
          alias: 'final_render_output_pdf',
          sha256: 'c'.repeat(64),
          size_bytes: 15360
        }
      },
      control_plane_contract_version: 'uc6_e2e4c2c_v1',
      public_safety: 'PASS'
    },
    control_plane_contract_version: 'uc6_e2e4c2c_v1'
  };

  const projSub = projectUc6DummyDatabagRenderSubmission(submissionPayload, { expectedJobId: JOB_ID });
  const projQueued = projectUc6DummyDatabagRenderJobStatus(queuedEnvelope, { expectedJobId: JOB_ID });
  const projCompleted = projectUc6DummyDatabagRenderJobStatus(completedEnvelope, { expectedJobId: JOB_ID });

  assert.equal(projSub.task_id, 2471);
  assert.equal(projQueued.state, 'render_queued');
  assert.equal(projCompleted.state, 'render_completed');
  assert.equal(projCompleted.schema_version, completedEnvelope.render.schema_version);
  assert.equal(projCompleted.source.filename, 'source.pptx');
  assert.equal(projCompleted.promotion_eligible, true);
  assert.equal(projCompleted.public_safety, 'PASS');
  assert.equal(projCompleted.final_artifacts.pptx.alias, 'final_render_output_pptx');
  assert.equal(projCompleted.final_artifacts.pdf.alias, 'final_render_output_pdf');

  console.log('Contract Smoke Test: PASS');
});

test('A8-E Section 9: Detailed contract projection and validation tests', async () => {
  const validSub = {
    schema_version: 'uc6_e2e4c2c_a8d_browser_admin_dummy_databag_render_submission_v1',
    job_id: JOB_ID,
    task_type: 'fetchdoc_browser_admin_uc6_render_dummy_databag_package',
    task_id: 2471,
    queue_status: 'pending',
    created: true,
    state: 'render_queued',
    bound_package: { package_id: 'pkg1', package_version: 'v1', title: 'Title', description: 'Desc' },
    control_plane_contract_version: 'uc6_e2e4c2c_v1',
    public_safety: 'PASS'
  };
  assert.equal(projectUc6DummyDatabagRenderSubmission(validSub, { expectedJobId: JOB_ID }).task_id, 2471);
  assert.throws(() => projectUc6DummyDatabagRenderSubmission({ ...validSub, task_id: '2471' }, { expectedJobId: JOB_ID }), /invalid_render_submission_task_id/);
  assert.throws(() => projectUc6DummyDatabagRenderSubmission({ ...validSub, task_id: -5 }, { expectedJobId: JOB_ID }), /invalid_render_submission_task_id/);

  assert.equal(projectUc6DummyDatabagRenderSubmission({ ...validSub, queue_status: 'pending', state: 'render_queued' }, { expectedJobId: JOB_ID }).state, 'render_queued');
  assert.equal(projectUc6DummyDatabagRenderSubmission({ ...validSub, queue_status: 'processing', state: 'render_running' }, { expectedJobId: JOB_ID }).state, 'render_running');
  assert.equal(projectUc6DummyDatabagRenderSubmission({ ...validSub, created: false, queue_status: 'done', state: 'render_completed' }, { expectedJobId: JOB_ID }).state, 'render_completed');
  assert.equal(projectUc6DummyDatabagRenderSubmission({ ...validSub, created: false, queue_status: 'failed', state: 'failed' }, { expectedJobId: JOB_ID }).state, 'failed');

  assert.throws(() => projectUc6DummyDatabagRenderSubmission({ ...validSub, queue_status: 'pending', state: 'render_running' }, { expectedJobId: JOB_ID }), /invalid_render_submission_queue_state_mismatch/);

  const replaySub = { ...validSub, created: false, queue_status: 'done', state: 'render_completed' };
  assert.equal(projectUc6DummyDatabagRenderSubmission(replaySub, { expectedJobId: JOB_ID }).created, false);

  const baseSource = { sha256: 'a'.repeat(64), size_bytes: 100, slide_count: 5, filename: 'doc.pptx' };
  assert.equal(projectUc6DummyDatabagRenderJobStatus({ job_id: JOB_ID, state: 'source_ready', source: baseSource, control_plane_contract_version: 'uc6_e2e4c2c_v1' }, { expectedJobId: JOB_ID }).state, 'source_ready');
  assert.equal(projectUc6DummyDatabagRenderJobStatus({ job_id: JOB_ID, state: 'render_queued', source: baseSource, control_plane_contract_version: 'uc6_e2e4c2c_v1' }, { expectedJobId: JOB_ID }).state, 'render_queued');
  assert.equal(projectUc6DummyDatabagRenderJobStatus({ job_id: JOB_ID, state: 'render_running', source: baseSource, control_plane_contract_version: 'uc6_e2e4c2c_v1' }, { expectedJobId: JOB_ID }).state, 'render_running');
  assert.equal(projectUc6DummyDatabagRenderJobStatus({ job_id: JOB_ID, state: 'failed', source: baseSource, control_plane_contract_version: 'uc6_e2e4c2c_v1' }, { expectedJobId: JOB_ID }).state, 'failed');

  const completedEnv = {
    job_id: JOB_ID,
    state: 'render_completed',
    source: baseSource,
    render: {
      schema_version: 'uc6_e2e4c2c_a8d_browser_admin_dummy_databag_render_result_v1',
      job_id: JOB_ID,
      state: 'render_completed',
      render_state: 'render_completed',
      review_state: 'review_pending',
      publication_state: 'unpublished',
      promotion_eligible: true,
      bound_package: { package_id: 'pkg1', package_version: 'v1', title: 'T', description: 'D' },
      final_artifacts: {
        pptx: { alias: 'final_render_output_pptx', sha256: 'b'.repeat(64), size_bytes: 200 },
        pdf: { alias: 'final_render_output_pdf', sha256: 'c'.repeat(64), size_bytes: 150 }
      },
      control_plane_contract_version: 'uc6_e2e4c2c_v1',
      public_safety: 'PASS'
    },
    control_plane_contract_version: 'uc6_e2e4c2c_v1'
  };
  assert.equal(projectUc6DummyDatabagRenderJobStatus(completedEnv, { expectedJobId: JOB_ID }).state, 'render_completed');
  assert.throws(() => projectUc6DummyDatabagRenderJobStatus({
    job_id: JOB_ID,
    state: 'render_completed',
    public_safety: 'PASS',
    control_plane_contract_version: 'uc6_e2e4c2c_v1'
  }, { expectedJobId: JOB_ID }), /invalid_render_job_status_source/);

  assert.throws(() => projectUc6DummyDatabagRenderJobStatus({
    ...completedEnv,
    render: { ...completedEnv.render, job_id: 'fd_uc6_admin_other_12345' }
  }, { expectedJobId: JOB_ID }), /nested_render_job_id_mismatch/);

  assert.throws(() => projectUc6DummyDatabagRenderJobStatus({
    ...completedEnv,
    render: { ...completedEnv.render, public_safety: undefined }
  }, { expectedJobId: JOB_ID }), /invalid_nested_render_public_safety/);

  assert.throws(() => projectUc6DummyDatabagRenderJobStatus({
    ...completedEnv,
    render: { ...completedEnv.render, schema_version: 'wrong' }
  }, { expectedJobId: JOB_ID }), /invalid_nested_render_schema/);

  assert.throws(() => projectUc6DummyDatabagRenderJobStatus({
    ...completedEnv,
    render: {
      ...completedEnv.render,
      final_artifacts: {
        pptx: { alias: 'wrong_alias', sha256: 'b'.repeat(64), size_bytes: 200 },
        pdf: { alias: 'final_render_output_pdf', sha256: 'c'.repeat(64), size_bytes: 150 }
      }
    }
  }, { expectedJobId: JOB_ID }), /invalid_nested_render_pptx_alias/);

  const validPkgOpt = {
    schema_version: 'uc6_e2e4c2c_a8d_browser_admin_dummy_databag_package_options_v1',
    job_id: JOB_ID,
    source_pptx_sha256: 'a'.repeat(64),
    compatibility_state: 'compatible',
    template_profile: { profile_id: 'p1', profile_version: 'v1', generation_unit_count: 1, fillable_slot_count: 2 },
    package_count: 1,
    packages: [{
      schema_version: 'uc6_a8c_dummy_databag_package_public_projection_v1',
      package_id: 'pkg1',
      package_version: 'v1',
      title: 'Title',
      description: 'Desc',
      template_family_id: 'tf1',
      source_pptx_sha256: 'a'.repeat(64),
      supported_canonical_source_group_count: 1,
      status: 'active',
      canonical_sha256: 'b'.repeat(64)
    }],
    selection_state: 'unbound',
    bound_package: null,
    public_safety: 'PASS'
  };
  assert.equal(projectUc6DummyDatabagPackageOptions(validPkgOpt, { expectedJobId: JOB_ID }).package_count, 1);
  assert.throws(() => projectUc6DummyDatabagPackageOptions({
    ...validPkgOpt,
    packages: [{ ...validPkgOpt.packages[0], status: 'deprecated' }]
  }, { expectedJobId: JOB_ID }), /invalid_package_status/);

  assert.throws(() => projectUc6DummyDatabagPackageOptions({
    ...validPkgOpt,
    packages: [{ ...validPkgOpt.packages[0], source_pptx_sha256: 'f'.repeat(64) }]
  }, { expectedJobId: JOB_ID }), /package_source_sha_mismatch/);

  assert.throws(() => projectUc6DummyDatabagPackageOptions({
    ...validPkgOpt,
    selection_state: 'unbound',
    bound_package: { package_id: 'pkg1', package_version: 'v1', title: 'Title', description: 'Desc' }
  }, { expectedJobId: JOB_ID }), /unbound_selection_state_must_have_null_bound_package/);

  assert.throws(() => projectUc6DummyDatabagPackageOptions({
    ...validPkgOpt,
    selection_state: 'bound',
    bound_package: null
  }, { expectedJobId: JOB_ID }), /invalid_bound_package_selection_state/);

  assert.throws(() => projectUc6DummyDatabagPackageOptions({
    ...validPkgOpt,
    package_count: 2,
    packages: [validPkgOpt.packages[0], validPkgOpt.packages[0]]
  }, { expectedJobId: JOB_ID }), /duplicate_package_identity/);
  assert.throws(() => projectUc6DummyDatabagPackageOptions({
    ...validPkgOpt,
    source_pptx_sha256: ''
  }, { expectedJobId: JOB_ID }), /invalid_package_options_source_sha/);

  const projectedCompleted = projectUc6DummyDatabagRenderJobStatus(completedEnv, { expectedJobId: JOB_ID });
  assert.equal(projectedCompleted.schema_version, completedEnv.render.schema_version);
  assert.deepEqual(projectedCompleted.source, baseSource);
  assert.equal(projectedCompleted.promotion_eligible, true);
  assert.equal(projectedCompleted.public_safety, 'PASS');

  const commandOptions = projectUc6DummyDatabagPackageOptions(validPkgOpt, { expectedJobId: JOB_ID });
  assert.equal(validateUc6DummyDatabagRenderCommand({ package_id: 'pkg1', package_version: 'v1', retry_failed: false }, commandOptions).ok, true);
  assert.equal(validateUc6DummyDatabagRenderCommand({ package_id: 'pkg1', package_version: 'v1', retry_failed: 'false' }, commandOptions).ok, false);
  assert.equal(validateUc6DummyDatabagRenderCommand({ package_id: 'pkg1', package_version: 'v1', retry_failed: false, extra: true }, commandOptions).ok, false);
  assert.equal(validateUc6DummyDatabagRenderCommand({ package_id: 'pkg1', package_version: 'v1', retry_failed: true }, commandOptions).code, 'retry_requires_bound_package');
});


test('A8-F publication projection and command validation are strict and public-safe', () => {
  const unpublished = projectUc6ReusableAssetPublication(unpublishedPublicationPayload(), { expectedJobId: JOB_ID });
  assert.equal(unpublished.publication_state, 'unpublished');
  assert.equal(unpublished.reviewed_final_pptx_sha256, 'a'.repeat(64));

  const published = projectUc6ReusableAssetPublication(publishedPublicationPayload(), { expectedJobId: JOB_ID });
  assert.equal(published.publication_state, 'published');
  assert.equal(published.published_asset.slot_count, 177);
  assert.equal(published.idempotent_replay, false);

  const command = validateUc6ReusableAssetPublicationCommand({
    decision: 'approve_for_reuse_and_publish',
    decision_identity: 'a8f-test-001',
    reviewed_final_pptx_sha256: 'a'.repeat(64),
    reviewed_final_pdf_sha256: 'b'.repeat(64),
    administrator_note: 'Reviewed in the Browser Admin PDF viewer.'
  });
  assert.equal(command.ok, true);
  assert.equal(command.body.administrator_note, 'Reviewed in the Browser Admin PDF viewer.');
  assert.equal(validateUc6ReusableAssetPublicationCommand({ ...command.body, decision_identity: '../bad' }).ok, false);
  assert.equal(validateUc6ReusableAssetPublicationCommand({ ...command.body, reviewed_final_pdf_sha256: 'bad' }).ok, false);
  assert.equal(validateUc6ReusableAssetPublicationCommand({ ...command.body, administrator_note: '/data/fetchdoc/jobs/private' }).ok, false);

  assert.throws(() => projectUc6ReusableAssetPublication(unpublishedPublicationPayload({ public_safety: 'FAIL' }), { expectedJobId: JOB_ID }));
  assert.throws(() => projectUc6ReusableAssetPublication(publishedPublicationPayload({ idempotent_replay: 'false' }), { expectedJobId: JOB_ID }));
});

test('A8-F review capability GET and approval POST use exact routes and never replay ambiguous POST', async () => {
  const calls = [];
  const api = createUc6BrowserAdminApi({
    apiBaseUrl: API_BASE,
    getIdToken: async () => 'firebase-token',
    fetchImpl: async (url, init) => {
      calls.push({ url, init });
      if (init.method === 'GET' && url.endsWith('/review-artifact-capabilities')) return response(200, validFinalDeliveryPayload());
      if (init.method === 'GET' && url.endsWith('/reusable-asset-publication')) return response(200, unpublishedPublicationPayload());
      throw new Error('ambiguous network failure');
    }
  });

  await api.getReviewArtifactCapabilities(JOB_ID);
  await api.getReusableAssetPublication(JOB_ID);
  const command = {
    decision: 'approve_for_reuse_and_publish',
    decision_identity: 'a8f-test-001',
    reviewed_final_pptx_sha256: 'a'.repeat(64),
    reviewed_final_pdf_sha256: 'b'.repeat(64)
  };
  await assert.rejects(() => api.submitReusableAssetPublication(JOB_ID, command), { code: 'ambiguous_submission' });
  assert.equal(calls.length, 3);
  assert.equal(calls[0].url, `${API_BASE}fetchdoc/browser-admin/uc6/jobs/${JOB_ID}/review-artifact-capabilities`);
  assert.equal(calls[1].url, `${API_BASE}fetchdoc/browser-admin/uc6/jobs/${JOB_ID}/reusable-asset-publication`);
  assert.equal(calls[2].url, `${API_BASE}fetchdoc/browser-admin/uc6/jobs/${JOB_ID}/reusable-asset-publication`);
  assert.equal(calls[2].init.method, 'POST');
  assert.equal(calls[2].init.headers.Authorization, 'Bearer firebase-token');
  assert.equal(calls[2].init.headers[['X', 'Internal', 'Token'].join('-')], undefined);
  assert.deepEqual(JSON.parse(calls[2].init.body), command);
});

test('A8-F app source provides PDF review, stable decision identity, and server reconciliation', () => {
  const appSource = readSource('../public/app.js');
  const cssSource = readSource('../public/style.css');
  const resultBody = extractFunctionBody(appSource, 'renderUC6ResultStage');
  const panelBody = extractFunctionBody(appSource, 'createUC6A8FReviewPanel');
  const submitBody = extractFunctionBody(appSource, 'submitUC6ReusableAssetPublication');
  assert.equal(resultBody.includes('/pdf-embed.html?file='), true);
  assert.equal(panelBody.includes('uc6-publicationReviewConfirmed'), true);
  assert.equal(panelBody.includes('uc6-submitPublicationBtn'), true);
  assert.equal(submitBody.includes('ensureUC6PublicationDecisionIdentity()'), true);
  assert.equal(submitBody.includes('reconcileUC6PublicationState'), true);
  assert.equal(submitBody.includes('submitReusableAssetPublication'), true);
  assert.equal(cssSource.includes('#view-uc6 .uc6-a8f-review-layout'), true);
  assert.equal(cssSource.includes('#view-uc6 .uc6-a8f-pdf-frame'), true);
});

test('A8-F review loading isolates publication failure from PDF capability state', () => {
  const appSource = readSource('../public/app.js');
  const loadBody = extractFunctionBody(appSource, 'loadUC6A8FReviewState');
  assert.equal(loadBody.includes('Promise.allSettled(['), true);
  assert.equal(loadBody.includes('capabilityResult.status'), true);
  assert.equal(loadBody.includes('publicationResult.status'), true);
  assert.equal(loadBody.includes("uc6State.reviewArtifactsStatus = 'ready'"), true);
  assert.equal(loadBody.includes("uc6State.publicationStatus = 'error'"), true);
  assert.equal(loadBody.includes('publicationError || capabilityError'), true);
  assert.equal(loadBody.includes(`uc6State.reviewArtifacts = null;
      uc6State.reviewArtifactsStatus = 'error';
      uc6State.reviewArtifactsMessage = message;`), false);
});

test('A8-F publication interactions preserve the mounted PDF viewer', () => {
  const appSource = readSource('../public/app.js');
  const surfaceBody = extractFunctionBody(appSource, 'renderUC6A8FReviewSurfaceOnly');
  const resultBody = extractFunctionBody(appSource, 'renderUC6ResultStage');
  const submitBody = extractFunctionBody(appSource, 'submitUC6ReusableAssetPublication');
  const reconcileBody = extractFunctionBody(appSource, 'reconcileUC6PublicationState');
  const changeHandler = appSource.slice(
    appSource.indexOf("target.id === 'uc6-publicationReviewConfirmed'"),
    appSource.indexOf("target.id === 'uc6-decisionChoice'")
  );

  assert.equal(resultBody.includes('createUC6A8FReviewPanel(renderStatus, publication, isPublished)'), true);
  assert.equal(surfaceBody.includes('currentPanel.replaceWith(createUC6A8FReviewPanel'), true);
  assert.equal(surfaceBody.includes('root.replaceChildren'), false);
  assert.equal(surfaceBody.includes('uc6-a8f-viewer-column'), false);
  assert.equal(changeHandler.includes('renderUC6A8FReviewSurfaceOnly()'), true);
  assert.equal(changeHandler.includes('renderUC6All()'), false);
  assert.equal(submitBody.includes('renderUC6A8FReviewSurfaceOnly()'), true);
  assert.equal(submitBody.includes('renderUC6All()'), false);
  assert.equal(reconcileBody.includes('renderUC6A8FReviewSurfaceOnly()'), true);
  assert.equal(reconcileBody.includes('renderUC6All()'), false);
});

test('A8-F artifact downloads refresh signed capabilities and never navigate to expired JSON', () => {
  const appSource = readSource('../public/app.js');
  const resultBody = extractFunctionBody(appSource, 'renderUC6ResultStage');
  const downloadBody = extractFunctionBody(appSource, 'downloadUC6ReviewArtifact');
  const consumeBody = extractFunctionBody(appSource, 'consumeUC6ReviewArtifactDownload');
  const triggerBody = extractFunctionBody(appSource, 'triggerUC6ReviewArtifactDownload');
  const clickHandler = appSource.slice(
    appSource.indexOf("const reviewArtifactAlias = target.dataset.uc6ArtifactDownload"),
    appSource.indexOf("uc6Els.section.addEventListener('change'")
  );

  assert.equal(resultBody.includes('button.dataset.uc6ArtifactDownload = capability.alias'), true);
  assert.equal(resultBody.includes('link.href = capability.actions.download.href'), false);
  assert.equal(downloadBody.includes('getReviewArtifactCapabilities'), true);
  assert.equal(downloadBody.includes('projectUc6FinalDeliveryCapabilities'), true);
  assert.equal(downloadBody.includes('for (let attempt = 0; attempt < 2; attempt += 1)'), true);
  assert.equal(downloadBody.includes("error?.code === 'review_artifact_capability_expired'"), true);
  assert.equal(consumeBody.includes('response.status === 410'), true);
  assert.equal(consumeBody.includes("credentials: 'omit'"), true);
  assert.equal(consumeBody.includes("redirect: 'error'"), true);
  assert.equal(consumeBody.includes('response.blob()'), true);
  assert.equal(triggerBody.includes('URL.createObjectURL(blob)'), true);
  assert.equal(triggerBody.includes('anchor.click()'), true);
  assert.equal(clickHandler.includes('downloadUC6ReviewArtifact(reviewArtifactAlias)'), true);
});

test('A8-F administrator session actions remain on one compact row', () => {
  const cssSource = readSource('../public/style.css');
  assert.equal(cssSource.includes('#view-uc6 .uc6-auth-actions {'), true);
  assert.equal(cssSource.includes('grid-template-columns: repeat(3, minmax(0, 1fr));'), true);
  assert.equal(cssSource.includes('#view-uc6 .uc6-auth-actions .btn {'), true);
  assert.equal(cssSource.includes('white-space: nowrap;'), true);
});

test('A8-E Section 9: Source code assertions for single function declarations and active-stage rendering', () => {
  const appSource = readFileSync(new URL('../public/app.js', import.meta.url), 'utf8');

  for (const fnName of ['renderUC6UnavailableStage', 'renderUC6ActiveStage', 'renderUC6ContextSummary', 'renderUC6All']) {
    const matches = appSource.match(new RegExp(`function ${fnName}\\b`, 'g')) || [];
    assert.equal(matches.length, 1, `Function ${fnName} should be declared exactly once, found ${matches.length}`);
  }

  const activeStageFn = appSource.slice(appSource.indexOf('function renderUC6ActiveStage'));
  const activeStageBody = activeStageFn.slice(0, activeStageFn.indexOf('function renderUC6ContextSummary'));

  for (const stage of ['auth', 'intake', 'package', 'render', 'render_unknown', 'render_error', 'result', 'publication', 'analysis', 'analysis_error', 'review', 'decision', 'complete']) {
    assert.equal(activeStageBody.includes(`stage === '${stage}'`), true, `Active stage renderer must support stage: ${stage}`);
  }

  const intakeBody = extractFunctionBody(appSource, 'renderUC6IntakeStage');
  const packageBody = extractFunctionBody(appSource, 'renderUC6PackageStage');
  const resultBody = extractFunctionBody(appSource, 'renderUC6ResultStage');
  const publicationPanelBody = extractFunctionBody(appSource, 'createUC6A8FReviewPanel');
  assert.equal(intakeBody.includes('분석 시작'), false);
  assert.equal(intakeBody.includes('PPTX 등록'), true);
  assert.equal(packageBody.includes('saveUC6LocalState()'), true);
  assert.equal(packageBody.includes("uc6State.jobState === 'source_ready'"), true);
  assert.equal(packageBody.includes('패키지 다시 불러오기'), true);
  assert.equal(resultBody.includes('createUC6A8FReviewPanel'), true);
  assert.equal(publicationPanelBody.includes("uc6-submitPublicationBtn"), true);
  assert.equal(resultBody.includes('uc6-a8f-pdf-frame'), true);
  assert.equal(publicationPanelBody.includes('publication_state'), true);
  assert.equal(appSource.includes("flowLane: 'dummy_render'"), true);
  assert.equal(appSource.includes("renderSubmissionActive"), false);
  assert.equal(appSource.includes("renderMessage"), false);
  assert.equal(appSource.includes("renderTaskId"), false);

  const resumeBody = extractFunctionBody(appSource, 'resumeUC6PersistedJob');
  assert.equal(resumeBody.includes('await refreshUC6JobStatus({'), true);
  assert.equal(resumeBody.includes("fetchReview: uc6State.flowLane === 'legacy_analysis'"), true);
  assert.equal(resumeBody.includes("uc6State.flowLane === 'asset_render'"), true);

  const refreshBody = extractFunctionBody(appSource, 'refreshUC6JobStatus');
  assert.equal(refreshBody.includes('const authoritativeDummyRenderLane = rawJob'), true);
  assert.equal(refreshBody.includes("rawJob.state === 'render_queued'"), true);
  assert.equal(refreshBody.includes("rawJob.state === 'render_running'"), true);
  assert.equal(refreshBody.includes("rawJob.state === 'render_completed'"), true);
  assert.equal(refreshBody.includes("uc6State.flowLane = 'dummy_render'"), true);
  assert.equal(
    refreshBody.indexOf('const authoritativeDummyRenderLane = rawJob')
      < refreshBody.indexOf("if (uc6State.flowLane === 'dummy_render')"),
    true
  );
});


const A8H_ASSET_ID = 'reusable_template_asset__' + '1'.repeat(40);
const A8H_SOURCE_SHA = 'a'.repeat(64);

function a8hAssetRow(overrides = {}) {
  return Object.assign({
    asset_id: A8H_ASSET_ID,
    status: 'published',
    review_state: 'approved_for_reuse',
    publication_state: 'published',
    source_pptx_sha256: A8H_SOURCE_SHA,
    generation_unit_count: 54,
    slot_count: 177,
    slide_count: 7,
    approved_at: '2026-08-06T01:02:03Z',
    template_family_ids: ['ax_agentic_selling_v3'],
    compatible_dummy_databag_package_count: 1
  }, overrides);
}

function a8hPackageRow(overrides = {}) {
  return Object.assign({
    schema_version: 'uc6_a8c_dummy_databag_package_public_projection_v1',
    package_id: 'ax_growth_acceleration',
    package_version: 'v1',
    title: 'AX Growth Acceleration',
    description: 'Growth scenario',
    template_family_id: 'ax_agentic_selling_v3',
    source_pptx_sha256: A8H_SOURCE_SHA,
    supported_canonical_source_group_count: 5,
    status: 'active',
    canonical_sha256: 'b'.repeat(64)
  }, overrides);
}

function a8hPackageOptions(overrides = {}) {
  return Object.assign({
    schema_version: 'uc6_e2e4c2c_a8g_browser_admin_reusable_asset_package_options_v1',
    asset: a8hAssetRow(),
    package_count: 1,
    packages: [a8hPackageRow()],
    control_plane_contract_version: 'uc6_11c8r2_browser_admin_uc6_control_plane_v1',
    public_safety: 'PASS'
  }, overrides);
}

function a8hBoundPackage(overrides = {}) {
  return Object.assign({
    package_id: 'ax_growth_acceleration',
    package_version: 'v1',
    title: 'AX Growth Acceleration',
    description: 'Growth scenario',
    source_context_bundle_sha256: 'c'.repeat(64)
  }, overrides);
}

test('A8-H Asset identifiers, catalog, package options, and persistence are strict', () => {
  assert.equal(normalizeUc6ReusableAssetId(A8H_ASSET_ID), A8H_ASSET_ID);
  assert.throws(() => normalizeUc6ReusableAssetId('../bad'));

  const catalog = projectUc6ReusableAssetCatalog({
    schema_version: 'uc6_e2e4c2c_a8g_browser_admin_reusable_asset_catalog_v1',
    asset_count: 1,
    assets: [a8hAssetRow()],
    control_plane_contract_version: 'uc6_11c8r2_browser_admin_uc6_control_plane_v1',
    public_safety: 'PASS'
  });
  assert.equal(catalog.asset_count, 1);
  assert.equal(catalog.assets[0].review_state, 'approved_for_reuse');

  const options = projectUc6ReusableAssetPackageOptions(a8hPackageOptions(), { expectedAssetId: A8H_ASSET_ID });
  assert.equal(options.package_count, 1);
  assert.equal(options.packages[0].source_pptx_sha256, A8H_SOURCE_SHA);
  assert.throws(() => projectUc6ReusableAssetPackageOptions(a8hPackageOptions({ asset: a8hAssetRow({ source_pptx_sha256: 'd'.repeat(64) }) }), { expectedAssetId: A8H_ASSET_ID }));

  const persisted = projectUc6PersistedState({
    flow_lane: 'asset_render',
    selected_asset_id: A8H_ASSET_ID,
    selected_package_id: 'ax_growth_acceleration',
    selected_package_version: 'v1',
    token: 'secret'
  });
  assert.deepEqual(persisted, {
    flow_lane: 'asset_render',
    selected_asset_id: A8H_ASSET_ID,
    selected_package_id: 'ax_growth_acceleration',
    selected_package_version: 'v1'
  });
});

test('A8-H render command and submission preserve Asset identity without retry fields', () => {
  const options = projectUc6ReusableAssetPackageOptions(a8hPackageOptions(), { expectedAssetId: A8H_ASSET_ID });
  const valid = validateUc6ReusableAssetRenderCommand({ package_id: 'ax_growth_acceleration', package_version: 'v1' }, options);
  assert.equal(valid.ok, true);
  assert.deepEqual(valid.body, { package_id: 'ax_growth_acceleration', package_version: 'v1' });
  assert.equal(validateUc6ReusableAssetRenderCommand({ package_id: 'ax_growth_acceleration', package_version: 'v1', retry_failed: false }, options).ok, false);

  const projected = projectUc6ReusableAssetRenderSubmission({
    schema_version: 'uc6_e2e4c2c_a8g_browser_admin_reusable_asset_render_submission_v1',
    job_id: JOB_ID,
    task_type: 'fetchdoc_browser_admin_uc6_render_reusable_asset',
    task_id: 2473,
    queue_status: 'pending',
    created: true,
    state: 'render_queued',
    asset: a8hAssetRow(),
    bound_package: a8hBoundPackage(),
    control_plane_contract_version: 'uc6_11c8r2_browser_admin_uc6_control_plane_v1',
    public_safety: 'PASS'
  }, { expectedAssetId: A8H_ASSET_ID });
  assert.equal(projected.job_id, JOB_ID);
  assert.equal(projected.state, 'render_queued');
  assert.throws(() => projectUc6ReusableAssetRenderSubmission({ ...projected, state: 'render_running' }, { expectedAssetId: A8H_ASSET_ID }));
});

test('A8-H completed job status is delivery-only and rejects publication semantics', () => {
  const payload = {
    job_id: JOB_ID,
    state: 'render_completed',
    source: { sha256: A8H_SOURCE_SHA, size_bytes: 24377844, slide_count: 7, filename: 'source.pptx' },
    render: {
      schema_version: 'uc6_e2e4c2c_a8g_browser_admin_reusable_asset_render_result_v1',
      job_id: JOB_ID,
      state: 'render_completed',
      render_state: 'render_completed',
      review_state: 'not_required',
      publication_state: 'not_applicable',
      promotion_eligible: false,
      asset: {
        asset_id: A8H_ASSET_ID,
        source_pptx_sha256: A8H_SOURCE_SHA,
        asset_manifest_sha256: 'd'.repeat(64),
        catalog_entry_sha256: 'e'.repeat(64),
        approval_receipt_sha256: 'f'.repeat(64)
      },
      bound_package: a8hBoundPackage(),
      final_artifacts: {
        pptx: { alias: 'final_render_output_pptx', sha256: '1'.repeat(64), size_bytes: 120 },
        pdf: { alias: 'final_render_output_pdf', sha256: '2'.repeat(64), size_bytes: 121 }
      },
      control_plane_contract_version: 'uc6_11c8r2_browser_admin_uc6_control_plane_v1',
      public_safety: 'PASS'
    },
    control_plane_contract_version: 'uc6_11c8r2_browser_admin_uc6_control_plane_v1'
  };
  const projected = projectUc6ReusableAssetRenderJobStatus(payload, { expectedJobId: JOB_ID, expectedAssetId: A8H_ASSET_ID });
  assert.equal(projected.review_state, 'not_required');
  assert.equal(projected.publication_state, 'not_applicable');
  assert.equal(projected.promotion_eligible, false);
  assert.throws(() => projectUc6ReusableAssetRenderJobStatus({ ...payload, render: { ...payload.render, publication_state: 'published' } }, { expectedJobId: JOB_ID, expectedAssetId: A8H_ASSET_ID }));
});

test('A8-H API uses exact routes, Firebase Bearer, and one-shot render POST', async () => {
  const calls = [];
  const packageOptions = projectUc6ReusableAssetPackageOptions(a8hPackageOptions(), { expectedAssetId: A8H_ASSET_ID });
  const api = createUc6BrowserAdminApi({
    apiBaseUrl: 'http://127.0.0.1',
    allowLoopbackHttp: true,
    getIdToken: async () => 'firebase-token',
    fetchImpl: async (url, init) => {
      calls.push({ url, init });
      return response(200, {});
    }
  });
  await api.getReusableAssets();
  await api.getReusableAssetPackages(A8H_ASSET_ID);
  await api.submitReusableAssetRender(A8H_ASSET_ID, { package_id: 'ax_growth_acceleration', package_version: 'v1' }, { packageOptions });
  await api.getRenderArtifactCapabilities(JOB_ID);
  assert.deepEqual(calls.map((call) => new URL(call.url).pathname), [
    '/fetchdoc/browser-admin/uc6/reusable-assets',
    `/fetchdoc/browser-admin/uc6/reusable-assets/${A8H_ASSET_ID}/dummy-databag-packages`,
    `/fetchdoc/browser-admin/uc6/reusable-assets/${A8H_ASSET_ID}/renders`,
    `/fetchdoc/browser-admin/uc6/jobs/${JOB_ID}/render-artifact-capabilities`
  ]);
  assert.equal(calls[2].init.method, 'POST');
  assert.deepEqual(JSON.parse(calls[2].init.body), { package_id: 'ax_growth_acceleration', package_version: 'v1' });
  assert.equal(calls.every((call) => call.init.headers.Authorization === 'Bearer firebase-token'), true);
  assert.equal(calls.every((call) => !Object.prototype.hasOwnProperty.call(call.init.headers, 'X-Internal-Token')), true);

  let attempts = 0;
  const ambiguousApi = createUc6BrowserAdminApi({
    apiBaseUrl: 'http://127.0.0.1',
    allowLoopbackHttp: true,
    getIdToken: async () => 'firebase-token',
    fetchImpl: async () => { attempts += 1; throw new Error('network'); }
  });
  await assert.rejects(() => ambiguousApi.submitReusableAssetRender(A8H_ASSET_ID, { package_id: 'ax_growth_acceleration', package_version: 'v1' }, { packageOptions }), { name: 'Uc6AmbiguousSubmissionError' });
  assert.equal(attempts, 1);
});

test('A8-H app source keeps Asset render-only lane separate from upload review publication', () => {
  const app = readSource('../public/app.js');
  const admin = readSource('../public/uc6-browser-admin.mjs');
  const style = readSource('../public/style.css');
  assert.equal(app.includes("flowLane === 'asset_render'"), true);
  assert.equal(app.includes('renderUC6AssetSelectionStage'), true);
  assert.equal(app.includes('renderUC6AssetPackageStage'), true);
  assert.equal(app.includes('submitUC6ReusableAssetRender'), true);
  assert.equal(app.includes('loadUC6A8HDeliveryState'), true);
  assert.equal(app.includes('review_state !== \'not_required\''), true);
  assert.equal(app.includes('publication_state !== \'not_applicable\''), true);
  assert.equal(app.includes('같은 Asset으로 새 문서 생성'), true);
  assert.equal(admin.includes('/render-artifact-capabilities'), true);
  assert.equal(admin.includes('X-Internal-Token'), false);
  assert.equal(style.includes('#view-uc6 .uc6-a8h-asset-grid'), true);
  assert.equal(style.includes('#view-uc6 .uc6-flow-lane-switch'), true);
});


test('A8-H delivery capability readiness does not require hashes absent from the frozen capability contract', () => {
  const app = readSource('../public/app.js');
  const start = app.indexOf('async function loadUC6A8HDeliveryState(');
  const end = app.indexOf('function restartUC6AssetRenderSelection(', start + 1);
  assert.notEqual(start, -1, 'loadUC6A8HDeliveryState missing');
  assert.notEqual(end, -1, 'loadUC6A8HDeliveryState end marker missing');
  const delivery = app.slice(start, end);
  assert.equal(delivery.includes('if (!pdf?.ready || !pptx?.ready)'), true);
  assert.equal(delivery.includes('pdf.sha256'), false);
  assert.equal(delivery.includes('pptx.sha256'), false);
  assert.equal(delivery.includes('render_only_artifact_capability_mismatch'), true);
});

test('A8-H runtime branches keep status polling, context summary, and retry semantics isolated', () => {
  const app = readSource('../public/app.js');
  const sliceFunction = (name, nextName) => {
    const start = app.indexOf(`function ${name}(`);
    const end = app.indexOf(`function ${nextName}(`, start + 1);
    assert.notEqual(start, -1, `${name} missing`);
    assert.notEqual(end, -1, `${nextName} missing`);
    return app.slice(start, end);
  };

  assert.equal(app.includes("persisted.flow_lane || (persisted.job_id ? 'legacy_analysis' : 'dummy_render')"), true);

  const refreshStart = app.indexOf('async function refreshUC6JobStatus(');
  const refreshEnd = app.indexOf('const UC6_REVIEW_ARTIFACT_DOWNLOAD_SPECS', refreshStart);
  assert.notEqual(refreshStart, -1, 'refreshUC6JobStatus missing');
  assert.notEqual(refreshEnd, -1, 'refreshUC6JobStatus end marker missing');
  const refresh = app.slice(refreshStart, refreshEnd);
  assert.equal(refresh.includes("flowLane === 'asset_render'"), true);
  assert.equal(refresh.includes('projectUc6ReusableAssetRenderJobStatus'), true);
  assert.equal(refresh.includes("flowLane === 'dummy_render'"), true);
  assert.equal(refresh.includes('projectUc6DummyDatabagRenderJobStatus'), true);
  assert.equal(refresh.includes('rows.push'), false);

  const context = sliceFunction('renderUC6ContextSummary', 'renderUC6All');
  assert.equal(context.includes("flowLane === 'asset_render'"), true);
  assert.equal(context.includes("rows.push(['Reusable Asset'"), true);
  assert.equal(context.includes("flowLane === 'dummy_render'"), true);

  const renderError = sliceFunction('renderUC6RenderErrorStage', 'createUC6A8FReviewPanel');
  assert.equal(renderError.includes('같은 Asset으로 다시 생성'), true);
  assert.equal(renderError.includes('uc6-restartAssetRenderBtn'), true);

  const init = app.slice(app.indexOf('function initUC6()'));
  assert.equal(init.includes("if (uc6State.flowLane === 'asset_render')"), true);
  assert.equal(/restartUC6AssetRenderSelection\(\);\r?\n\s*submitUC6ReusableAssetRender\(\);/.test(init), true);
});

test('R6C package-family endpoint uses normalized job route and Firebase GET boundary', async () => {
  const calls = [];
  const api = createUc6BrowserAdminApi({
    apiBaseUrl: API_BASE,
    getIdToken: async () => 'firebase-r6c-token',
    fetchImpl: async (url, init) => {
      calls.push({ url, init });
      return response(200, r6cAxFixture());
    }
  });

  assert.equal(
    UC6_BROWSER_ADMIN_ENDPOINTS.dummyDatabagPackageFamilies(`  ${JOB_ID}  `),
    `/fetchdoc/browser-admin/uc6/jobs/${JOB_ID}/dummy-databag-package-families`
  );
  assert.equal(typeof api.getDummyDatabagPackageFamilies, 'function');
  assert.equal(typeof api.getDummyDatabagPackages, 'function');
  await api.getDummyDatabagPackageFamilies(`  ${JOB_ID}  `);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, `${API_BASE}fetchdoc/browser-admin/uc6/jobs/${JOB_ID}/dummy-databag-package-families`);
  assert.equal(calls[0].init.method, 'GET');
  assert.equal(calls[0].init.headers.Authorization, 'Bearer firebase-r6c-token');
  assert.equal(calls[0].init.headers[['X', 'Internal', 'Token'].join('-')], undefined);
  assert.equal(calls[0].init.credentials, 'omit');
  assert.equal(calls[0].init.cache, 'no-store');
});

test('R6C family projector accepts AX and NovaGrid while preserving detached catalog order', () => {
  const ax = r6cAxFixture();
  const axBefore = JSON.stringify(ax);
  const axProjected = projectUc6DummyDatabagPackageFamilyOptions(ax, { expectedJobId: JOB_ID });
  assert.equal(JSON.stringify(ax), axBefore);
  assert.deepEqual(axProjected.template_profile, ax.template_profile);
  assert.equal(axProjected.package_family_count, 1);
  assert.equal(axProjected.package_count, 3);
  assert.deepEqual(
    axProjected.packages.map((pkg) => pkg.package_id),
    ['ax_customer_retention', 'ax_growth_acceleration', 'ax_operational_recovery']
  );
  assert.notStrictEqual(axProjected.package_families, ax.package_families);
  assert.notStrictEqual(axProjected.package_families[0].variants, ax.package_families[0].variants);
  axProjected.package_families[0].variants[0].title = 'Detached title';
  assert.equal(ax.package_families[0].variants[0].title, 'Scenario 1');

  const nova = r6cNovaGridFixture();
  const novaProjected = projectUc6DummyDatabagPackageFamilyOptions(nova, { expectedJobId: JOB_ID });
  assert.equal(novaProjected.template_profile.profile_id, 'novagrid_energy_proposal_v2');
  assert.deepEqual(
    novaProjected.package_families[0].variants.map((pkg) => pkg.package_id),
    ['novagrid_helios_foods', 'novagrid_orion_metals', 'novagrid_asteron_mobility']
  );

  const ordered = r6cAxFixture();
  ordered.package_families.push(r6cFamily('ax_secondary_scenarios', 'AX secondary scenarios', [
    r6cVariant(ordered.template_profile.profile_id, 'ax_secondary_variant', 7)
  ]));
  ordered.package_family_count = 2;
  const orderedProjected = projectUc6DummyDatabagPackageFamilyOptions(ordered, { expectedJobId: JOB_ID });
  assert.deepEqual(orderedProjected.package_families.map((family) => family.package_family_id), ['ax_demo_scenarios', 'ax_secondary_scenarios']);
  assert.deepEqual(orderedProjected.packages.map((pkg) => pkg.package_id), [
    'ax_customer_retention',
    'ax_growth_acceleration',
    'ax_operational_recovery',
    'ax_secondary_variant'
  ]);
});

test('R6C family projector accepts only coherent bound family and compact package identity', () => {
  const bound = r6cAxFixture();
  const variant = bound.package_families[0].variants[1];
  bound.selection_state = 'bound';
  bound.bound_package_family_id = 'ax_demo_scenarios';
  bound.bound_package = {
    package_id: variant.package_id,
    package_version: variant.package_version,
    title: variant.title,
    description: variant.description
  };
  const projected = projectUc6DummyDatabagPackageFamilyOptions(bound, { expectedJobId: JOB_ID });
  assert.equal(projected.selection_state, 'bound');
  assert.equal(projected.bound_package_family_id, 'ax_demo_scenarios');
  assert.deepEqual(projected.bound_package, bound.bound_package);
  assert.notStrictEqual(projected.bound_package, bound.bound_package);
});

test('R6C family projector fails closed for malformed, unsafe, incompatible, and contradictory responses', () => {
  const incompatible = () => ({
    ...r6cAxFixture(),
    compatibility_state: 'incompatible_source_pptx',
    template_profile: null,
    package_family_count: 0,
    package_families: [],
    selection_state: 'unbound',
    bound_package_family_id: null,
    bound_package: null
  });
  const withSecondFamily = () => {
    const value = r6cAxFixture();
    value.package_families.push(r6cFamily('ax_secondary_scenarios', 'AX secondary scenarios', [
      r6cVariant(value.template_profile.profile_id, 'ax_secondary_variant', 7)
    ]));
    value.package_family_count = 2;
    return value;
  };
  const compact = (variant) => ({
    package_id: variant.package_id,
    package_version: variant.package_version,
    title: variant.title,
    description: variant.description
  });
  const cases = [
    ['wrong top schema', (v) => { v.schema_version = 'wrong'; }],
    ['wrong job id', (v) => { v.job_id = 'fd_uc6_admin_other_12345'; }],
    ['public safety fail', (v) => { v.public_safety = 'FAIL'; }],
    ['invalid source sha', (v) => { v.source_pptx_sha256 = 'ABC'; }],
    ['invalid compatibility state', (v) => { v.compatibility_state = 'unknown'; }],
    ['invalid selection state', (v) => { v.selection_state = 'unknown'; }],
    ['family count mismatch', (v) => { v.package_family_count = 2; }],
    ['non-array family list', (v) => { v.package_families = {}; }],
    ['duplicate family id', (v) => { v.package_families.push(cloneFixture(v.package_families[0])); v.package_family_count = 2; }],
    ['wrong family schema', (v) => { v.package_families[0].schema_version = 'wrong'; }],
    ['empty family variants', (v) => { v.package_families[0].variants = []; v.package_families[0].variant_count = 0; }],
    ['variant count mismatch', (v) => { v.package_families[0].variant_count = 99; }],
    ['duplicate package identity across families', (v) => {
      v.package_families.push(r6cFamily('ax_secondary_scenarios', 'AX secondary scenarios', [cloneFixture(v.package_families[0].variants[0])]));
      v.package_family_count = 2;
    }],
    ['wrong package schema', (v) => { v.package_families[0].variants[0].schema_version = 'wrong'; }],
    ['invalid package id', (v) => { v.package_families[0].variants[0].package_id = 'bad id'; }],
    ['invalid package version', (v) => { v.package_families[0].variants[0].package_version = '*bad'; }],
    ['bad package title', (v) => { v.package_families[0].variants[0].title = ' '; }],
    ['unsafe package description', (v) => { v.package_families[0].variants[0].description = 'https://internal.example/private'; }],
    ['unsafe family title', (v) => { v.package_families[0].title = 'file:///private/catalog'; }],
    ['variant source mismatch', (v) => { v.package_families[0].variants[0].source_pptx_sha256 = 'b'.repeat(64); }],
    ['variant template profile mismatch', (v) => { v.package_families[0].variants[0].template_family_id = 'other_profile'; }],
    ['invalid canonical sha', (v) => { v.package_families[0].variants[0].canonical_sha256 = 'bad'; }],
    ['inactive variant status', (v) => { v.package_families[0].variants[0].status = 'deprecated'; }],
    ['invalid control plane text', (v) => { v.control_plane_contract_version = 'bad value'; }],
    ['unbound with family id', (v) => { v.bound_package_family_id = 'ax_demo_scenarios'; }],
    ['unbound with package', (v) => { v.bound_package = compact(v.package_families[0].variants[0]); }],
    ['bound without family id', (v) => { v.selection_state = 'bound'; v.bound_package = compact(v.package_families[0].variants[0]); }],
    ['bound without package', (v) => { v.selection_state = 'bound'; v.bound_package_family_id = 'ax_demo_scenarios'; }],
    ['bound family missing', (v) => {
      v.selection_state = 'bound';
      v.bound_package_family_id = 'missing_family';
      v.bound_package = compact(v.package_families[0].variants[0]);
    }],
    ['bound package missing from family', (v) => {
      v.selection_state = 'bound';
      v.bound_package_family_id = 'ax_demo_scenarios';
      v.bound_package = { package_id: 'missing_variant', package_version: 'v1', title: 'Missing', description: '' };
    }]
  ];
  for (const [label, mutate] of cases) {
    const value = r6cAxFixture();
    mutate(value);
    assert.throws(
      () => projectUc6DummyDatabagPackageFamilyOptions(value, { expectedJobId: JOB_ID }),
      TypeError,
      label
    );
  }

  const incompatibleWithFamilies = incompatible();
  incompatibleWithFamilies.package_families = cloneFixture(r6cAxFixture().package_families);
  incompatibleWithFamilies.package_family_count = 1;
  assert.throws(() => projectUc6DummyDatabagPackageFamilyOptions(incompatibleWithFamilies, { expectedJobId: JOB_ID }), TypeError);

  const incompatibleWithProfile = incompatible();
  incompatibleWithProfile.template_profile = cloneFixture(r6cAxFixture().template_profile);
  assert.throws(() => projectUc6DummyDatabagPackageFamilyOptions(incompatibleWithProfile, { expectedJobId: JOB_ID }), TypeError);

  const incompatibleBound = incompatible();
  incompatibleBound.selection_state = 'bound';
  incompatibleBound.bound_package_family_id = 'ax_demo_scenarios';
  incompatibleBound.bound_package = { package_id: 'pkg', package_version: 'v1', title: 'Package', description: '' };
  assert.throws(() => projectUc6DummyDatabagPackageFamilyOptions(incompatibleBound, { expectedJobId: JOB_ID }), TypeError);

  const wrongFamilyBinding = withSecondFamily();
  wrongFamilyBinding.selection_state = 'bound';
  wrongFamilyBinding.bound_package_family_id = 'ax_demo_scenarios';
  wrongFamilyBinding.bound_package = compact(wrongFamilyBinding.package_families[1].variants[0]);
  assert.throws(() => projectUc6DummyDatabagPackageFamilyOptions(wrongFamilyBinding, { expectedJobId: JOB_ID }), TypeError);
});

test('R6C render command and persistence boundaries keep family metadata out of runtime identity', () => {
  const options = projectUc6DummyDatabagPackageFamilyOptions(r6cAxFixture(), { expectedJobId: JOB_ID });
  const validation = validateUc6DummyDatabagRenderCommand({
    package_id: 'ax_customer_retention',
    package_version: '2026.08.11',
    retry_failed: false
  }, options);
  assert.equal(validation.ok, true);
  assert.deepEqual(validation.body, {
    package_id: 'ax_customer_retention',
    package_version: '2026.08.11',
    retry_failed: false
  });
  assert.equal(Object.prototype.hasOwnProperty.call(validation.body, 'package_family_id'), false);

  const persisted = projectUc6PersistedState({
    job_id: JOB_ID,
    selected_package_family_id: 'ax_demo_scenarios',
    selected_package_id: 'ax_customer_retention',
    selected_package_version: '2026.08.11',
    id_token: 'secret',
    token: 'secret',
    internal_path: '/data/fetchdoc/private',
    template_profile: { profile_id: 'secret' },
    package_families: r6cAxFixture().package_families,
    backend_payload: r6cAxFixture()
  });
  assert.deepEqual(persisted, {
    job_id: JOB_ID,
    selected_package_family_id: 'ax_demo_scenarios',
    selected_package_id: 'ax_customer_retention',
    selected_package_version: '2026.08.11'
  });
  assert.equal(projectUc6PersistedState({ selected_package_family_id: 'bad family' }).selected_package_family_id, undefined);
  assert.deepEqual(projectUc6PersistedState({
    selected_package_family_id: 'ax_demo_scenarios',
    selected_package_id: 'ax_customer_retention'
  }), { selected_package_family_id: 'ax_demo_scenarios' });
});

test('R6C app source uses hierarchical dummy-render selection and preserves flat Asset flow', () => {
  const app = readSource('../public/app.js');
  const apiSource = readSource('../public/uc6-browser-admin.mjs');
  const css = readSource('../public/style.css');
  const load = extractFunctionBody(app, 'loadUC6PackageOptions');
  const save = extractFunctionBody(app, 'saveUC6LocalState');
  const resume = extractFunctionBody(app, 'resumeUC6PersistedJob');
  const reset = extractFunctionBody(app, 'resetUC6JobState');
  const render = extractFunctionBody(app, 'renderUC6PackageStage');
  const reconcile = extractFunctionBody(app, 'reconcileUC6BoundPackageFamily');
  const submit = extractFunctionBody(app, 'submitUC6DummyRender');
  const assetLoad = extractFunctionBody(app, 'loadUC6ReusableAssetPackages');
  const assetRender = extractFunctionBody(app, 'renderUC6AssetPackageStage');

  assert.equal(app.includes('projectUc6DummyDatabagPackageFamilyOptions,'), true);
  assert.equal(app.includes('uc6-r6e-c2-synthetic-scenario-binding'), true);
  assert.equal(load.includes('getDummyDatabagPackageFamilies'), true);
  assert.equal(load.includes('projectUc6DummyDatabagPackageFamilyOptions'), true);
  assert.equal(load.includes('getDummyDatabagPackages('), false);
  assert.equal(app.includes("selectedPackageFamilyId: ''"), true);
  assert.equal(save.includes('selected_package_family_id: uc6State.selectedPackageFamilyId'), true);
  assert.equal(resume.includes('persisted.selected_package_family_id'), true);
  assert.equal(reset.includes("uc6State.selectedPackageFamilyId = ''"), true);

  assert.equal(render.includes('Template Profile'), true);
  assert.equal(render.includes('package_families.forEach'), true);
  assert.equal(render.includes('selectedFamily.variants.forEach'), true);
  assert.equal(render.includes('packageStillBelongsToFamily'), true);
  assert.equal(render.includes("uc6State.selectedPackageId = ''"), true);
  assert.equal(render.includes("uc6State.selectedPackageVersion = ''"), true);
  assert.equal(render.includes("const isBound = options.selection_state === 'bound';"), true);
  assert.equal(render.includes('options.bound_package_family_id'), true);
  assert.equal(render.includes('innerHTML'), false);
  assert.equal(reconcile.includes("options.selection_state = 'unbound'"), false);
  assert.equal(reconcile.includes("options.selection_state = 'bound'"), true);
  assert.equal(reconcile.includes('options.bound_package_family_id = null'), true);
  assert.equal(reconcile.includes('options.bound_package = boundPackage'), true);

  const commandStart = submit.indexOf('const command = {');
  const commandEnd = submit.indexOf('};', commandStart);
  const command = submit.slice(commandStart, commandEnd + 2);
  assert.notEqual(commandStart, -1);
  assert.equal(command.includes('package_id:'), true);
  assert.equal(command.includes('package_version:'), true);
  assert.equal(command.includes('retry_failed:'), true);
  assert.equal(command.includes('package_family_id'), false);
  assert.equal(command.includes('template_profile_id'), false);

  assert.equal(assetLoad.includes('getReusableAssetPackages'), true);
  assert.equal(assetLoad.includes('projectUc6ReusableAssetPackageOptions'), true);
  assert.equal(assetLoad.includes('getDummyDatabagPackageFamilies'), false);
  assert.equal(assetRender.includes('package_families'), false);
  assert.equal(app.includes('X-Internal-Token'), false);
  assert.equal(apiSource.includes('X-Internal-Token'), false);

  const newSelectorLines = css.split(/\r?\n/).filter((line) => (
    /\.uc6-(?:selection-layer|template-profile|package-family|variant-layer|bound-selection)/.test(line)
  ));
  assert.ok(newSelectorLines.length > 0);
  assert.equal(newSelectorLines.every((line) => line.trimStart().startsWith('#view-uc6')), true);
});

test('R6D3 onboarding endpoint is normalized and POST is a Firebase-only one-shot without a command body', async () => {
  assert.equal(
    UC6_BROWSER_ADMIN_ENDPOINTS.onboarding(`  ${JOB_ID}  `),
    `/fetchdoc/browser-admin/uc6/jobs/${JOB_ID}/onboarding`
  );
  const calls = [];
  const tokenRefreshes = [];
  const api = createUc6BrowserAdminApi({
    apiBaseUrl: API_BASE,
    getIdToken: async (forceRefresh) => { tokenRefreshes.push(forceRefresh); return 'firebase-onboarding-token'; },
    fetchImpl: async (url, init) => {
      calls.push({ url, init });
      return response(200, r6d3OnboardingSubmission());
    }
  });
  await api.submitFreshTemplateOnboarding(`  ${JOB_ID}  `);
  assert.equal(calls.length, 1);
  assert.deepEqual(tokenRefreshes, [true]);
  assert.equal(calls[0].url, `${API_BASE}fetchdoc/browser-admin/uc6/jobs/${JOB_ID}/onboarding`);
  assert.equal(calls[0].init.method, 'POST');
  assert.equal(calls[0].init.headers.Authorization, 'Bearer firebase-onboarding-token');
  assert.equal(calls[0].init.headers[['X', 'Internal', 'Token'].join('-')], undefined);
  assert.equal(calls[0].init.headers['Content-Type'], undefined);
  assert.equal(calls[0].init.credentials, 'omit');
  assert.equal(calls[0].init.cache, 'no-store');
  assert.equal(calls[0].init.body, undefined);

  for (const status of [401, 403]) {
    let attempts = 0;
    const rejectedApi = createUc6BrowserAdminApi({
      apiBaseUrl: API_BASE,
      getIdToken: async () => 'firebase-onboarding-token',
      fetchImpl: async () => { attempts += 1; return response(status, { detail: { code: 'unknown' } }); }
    });
    await assert.rejects(() => rejectedApi.submitFreshTemplateOnboarding(JOB_ID));
    assert.equal(attempts, 1, `HTTP ${status} must not replay onboarding`);
  }

  let networkAttempts = 0;
  const ambiguousApi = createUc6BrowserAdminApi({
    apiBaseUrl: API_BASE,
    getIdToken: async () => 'firebase-onboarding-token',
    fetchImpl: async () => { networkAttempts += 1; throw new Error('network unavailable'); }
  });
  await assert.rejects(() => ambiguousApi.submitFreshTemplateOnboarding(JOB_ID), {
    name: 'Uc6AmbiguousSubmissionError',
    code: 'ambiguous_submission'
  });
  assert.equal(networkAttempts, 1);
});

test('R6D3 onboarding submission projector accepts all public states and fails closed', () => {
  for (const state of ['onboarding_queued', 'onboarding_running', 'onboarding_ready', 'onboarding_blocked']) {
    const payload = r6d3OnboardingSubmission(state);
    const projected = projectUc6FreshTemplateOnboardingSubmission(payload, { expectedJobId: JOB_ID });
    assert.equal(projected.state, state);
    assert.notStrictEqual(projected, payload);
  }
  const cases = [
    (v) => { v.schema_version = 'wrong'; },
    (v) => { v.job_id = 'fd_uc6_admin_other_12345'; },
    (v) => { v.task_type = 'wrong'; },
    (v) => { v.task_id = 0; },
    (v) => { v.queue_status = 'unknown'; },
    (v) => { v.created = 'true'; },
    (v) => { v.state = 'source_ready'; },
    (v) => { v.control_plane_contract_version = 'bad value'; },
    (v) => { v.public_safety = 'FAIL'; }
  ];
  for (const mutate of cases) {
    const payload = r6d3OnboardingSubmission();
    mutate(payload);
    assert.throws(() => projectUc6FreshTemplateOnboardingSubmission(payload, { expectedJobId: JOB_ID }), TypeError);
  }
});

test('R6D3 GET onboarding projector accepts detached public envelopes and rejects malformed source state', () => {
  for (const state of ['onboarding_queued', 'onboarding_running', 'onboarding_ready', 'onboarding_blocked']) {
    const payload = r6d3OnboardingJob(state);
    const projected = projectUc6FreshTemplateOnboardingJobStatus(payload, { expectedJobId: JOB_ID });
    assert.equal(projected.state, state);
    assert.deepEqual(projected.source, payload.source);
    assert.notStrictEqual(projected.source, payload.source);
    assert.equal(projected.onboarding, undefined);
  }
  const cases = [
    (v) => { v.job_id = 'bad'; },
    (v) => { v.state = 'render_running'; },
    (v) => { v.source.sha256 = 'A'.repeat(64); },
    (v) => { v.source.size_bytes = 0; },
    (v) => { v.source.slide_count = -1; },
    (v) => { v.source.filename = '/data/private/source.pptx'; },
    (v) => { v.control_plane_contract_version = 'bad value'; }
  ];
  for (const mutate of cases) {
    const payload = r6d3OnboardingJob();
    mutate(payload);
    assert.throws(() => projectUc6FreshTemplateOnboardingJobStatus(payload, { expectedJobId: JOB_ID }), TypeError);
  }
});

test('R6D3 state mapping separates onboarding polling from analysis and render polling', () => {
  assert.equal(mapUc6StateToView('onboarding_queued').onboardingPollable, true);
  assert.equal(mapUc6StateToView('onboarding_running').onboardingPollable, true);
  assert.equal(mapUc6StateToView('onboarding_ready').onboardingPollable, false);
  assert.equal(mapUc6StateToView('onboarding_blocked').onboardingPollable, false);
  assert.equal(mapUc6StateToView('onboarding_queued').renderPollable, undefined);
  assert.equal(mapUc6StateToView('render_queued').renderPollable, true);
  assert.equal(mapUc6StateToView('analysis_queued').pollable, true);
});

test('R6D3 fresh family projector supports waiting, blocked, compatible, and no-package contracts without static profile identity', () => {
  const compatible = r6d3FreshFamilyFixture();
  const before = JSON.stringify(compatible);
  const projected = projectUc6DummyDatabagPackageFamilyOptions(compatible, { expectedJobId: JOB_ID });
  assert.equal(JSON.stringify(compatible), before);
  assert.equal(projected.template_profile.profile_origin, 'fresh_same_job');
  assert.equal(projected.template_profile.generation_unit_count, 18);
  assert.equal(projected.template_profile.fillable_slot_count, 47);
  assert.deepEqual(projected.template_profile.required_authoritative_source_groups, ['customer_context', 'growth_targets']);
  assert.deepEqual(projected.template_profile.supporting_source_groups, ['market_signals']);
  assert.equal(projected.template_profile.profile_id, undefined);
  assert.equal(projected.template_profile.profile_version, undefined);
  assert.equal(projected.template_profile.template_family_id, undefined);
  assert.equal(projected.compatibility_metadata.template_family_id, 'fresh_package_compatibility_v1');
  assert.equal(projected.package_count, 2);
  assert.notStrictEqual(projected.package_families, compatible.package_families);

  for (const [state, compatibilityState] of [
    ['onboarding_queued', 'fresh_onboarding_not_ready'],
    ['onboarding_running', 'fresh_onboarding_not_ready'],
    ['onboarding_blocked', 'fresh_onboarding_blocked']
  ]) {
    const payload = r6d3FreshFamilyFixture();
    payload.onboarding_state = state;
    payload.compatibility_state = compatibilityState;
    payload.template_profile = null;
    payload.compatibility_metadata = null;
    payload.package_family_count = 0;
    payload.package_families = [];
    const waiting = projectUc6DummyDatabagPackageFamilyOptions(payload, { expectedJobId: JOB_ID });
    assert.equal(waiting.compatibility_state, compatibilityState);
    assert.deepEqual(waiting.package_families, []);
  }

  const none = r6d3FreshFamilyFixture();
  none.compatibility_state = 'no_compatible_packages';
  none.compatibility_metadata.source_matched_package_count = 0;
  none.package_family_count = 0;
  none.package_families = [];
  const noPackages = projectUc6DummyDatabagPackageFamilyOptions(none, { expectedJobId: JOB_ID });
  assert.equal(noPackages.compatibility_state, 'no_compatible_packages');
  assert.equal(noPackages.template_profile.profile_origin, 'fresh_same_job');
  assert.deepEqual(noPackages.package_families, []);
});

test('R6D3 no-compatible metadata permits absent identity only when the source-matched count is zero', () => {
  const identified = r6d3FreshFamilyFixture();
  identified.compatibility_state = 'no_compatible_packages';
  identified.package_family_count = 0;
  identified.package_families = [];
  const identifiedProjected = projectUc6DummyDatabagPackageFamilyOptions(identified, { expectedJobId: JOB_ID });
  assert.equal(identifiedProjected.compatibility_metadata.template_family_id, 'fresh_package_compatibility_v1');
  assert.equal(identifiedProjected.compatibility_metadata.source_matched_package_count, 2);

  const unidentified = cloneFixture(identified);
  unidentified.compatibility_metadata.template_family_id = null;
  unidentified.compatibility_metadata.source_matched_package_count = 0;
  const unidentifiedProjected = projectUc6DummyDatabagPackageFamilyOptions(unidentified, { expectedJobId: JOB_ID });
  assert.deepEqual(unidentifiedProjected.compatibility_metadata, {
    template_family_id: null,
    source_matched_package_count: 0
  });
  assert.equal(unidentifiedProjected.template_profile.profile_id, undefined);
  assert.equal(unidentifiedProjected.template_profile.template_family_id, undefined);

  const compatibleWithoutIdentity = r6d3FreshFamilyFixture();
  compatibleWithoutIdentity.compatibility_metadata.template_family_id = null;
  compatibleWithoutIdentity.compatibility_metadata.source_matched_package_count = 0;
  assert.throws(
    () => projectUc6DummyDatabagPackageFamilyOptions(compatibleWithoutIdentity, { expectedJobId: JOB_ID }),
    /invalid_fresh_compatibility_template_family_id/
  );

  const positiveCountWithoutIdentity = cloneFixture(unidentified);
  positiveCountWithoutIdentity.compatibility_metadata.source_matched_package_count = 1;
  assert.throws(
    () => projectUc6DummyDatabagPackageFamilyOptions(positiveCountWithoutIdentity, { expectedJobId: JOB_ID }),
    /invalid_fresh_null_compatibility_identity_package_count/
  );
});

test('R6D3 fresh family identity and public-safety validation fail closed while legacy render remains valid', () => {
  const cases = [
    (v) => { v.package_families[0].variants[0].template_family_id = 'static_profile_id'; },
    (v) => { v.package_families[0].variants[0].source_pptx_sha256 = 'e'.repeat(64); },
    (v) => { v.package_families[0].variants[0].canonical_sha256 = 'BAD'; },
    (v) => { v.package_families[0].variants[0].description = 'https://internal.invalid/private'; },
    (v) => { v.package_families.push(cloneFixture(v.package_families[0])); v.package_family_count = 2; },
    (v) => { v.package_families[0].variants.push(cloneFixture(v.package_families[0].variants[0])); v.package_families[0].variant_count = 3; },
    (v) => { v.template_profile.profile_id = v.compatibility_metadata.template_family_id; },
    (v) => { v.selection_state = 'unbound'; },
    (v) => { v.bound_package = { package_id: 'pkg' }; }
  ];
  for (const mutate of cases) {
    const payload = r6d3FreshFamilyFixture();
    mutate(payload);
    assert.throws(() => projectUc6DummyDatabagPackageFamilyOptions(payload, { expectedJobId: JOB_ID }), TypeError);
  }

  const freshOptions = projectUc6DummyDatabagPackageFamilyOptions(r6d3FreshFamilyFixture(), { expectedJobId: JOB_ID });
  assert.equal(validateUc6DummyDatabagRenderCommand({
    package_id: 'fresh_growth_case', package_version: '2026.08.11', retry_failed: false
  }, freshOptions).code, 'fresh_render_deferred');
  const legacyOptions = projectUc6DummyDatabagPackageFamilyOptions(r6cAxFixture(), { expectedJobId: JOB_ID });
  assert.equal(validateUc6DummyDatabagRenderCommand({
    package_id: 'ax_customer_retention', package_version: '2026.08.11', retry_failed: false
  }, legacyOptions).ok, true);
});

test('R6D3 onboarding protection remains intact while fresh continuation uses the R6E control plane', () => {
  assert.deepEqual(projectUc6PersistedState({
    job_id: JOB_ID,
    fresh_onboarding_expected: true,
    task_id: 731,
    onboarding_result: r6d3OnboardingSubmission(),
    provider_response: { secret: true },
    authorization: 'Bearer secret',
    firebase_user: { uid: 'secret' }
  }), { job_id: JOB_ID, fresh_onboarding_expected: true });
  assert.deepEqual(projectUc6PersistedState({ job_id: JOB_ID }), { job_id: JOB_ID });
  assert.equal(projectUc6PersistedState({ fresh_onboarding_expected: 'true' }).fresh_onboarding_expected, undefined);

  const app = readSource('../public/app.js');
  const upload = extractFunctionBody(app, 'uploadUC6PptxJob');
  const refresh = extractFunctionBody(app, 'refreshUC6JobStatus');
  const poll = extractFunctionBody(app, 'pollUC6JobStatus');
  const submit = extractFunctionBody(app, 'submitUC6DummyRender');
  const render = extractFunctionBody(app, 'renderUC6PackageStage');
  const context = extractFunctionBody(app, 'renderUC6ContextSummary');
  const save = extractFunctionBody(app, 'saveUC6LocalState');
  const resume = extractFunctionBody(app, 'resumeUC6PersistedJob');
  const reset = extractFunctionBody(app, 'resetUC6JobState');
  assert.equal(upload.includes('api.createJob'), true);
  assert.equal(upload.includes('submitFreshTemplateOnboarding'), true);
  assert.equal(upload.includes('submitAnalysis'), false);
  assert.equal(upload.includes('submitDummyDatabagRender'), false);
  assert.ok(upload.indexOf("projected.state === 'onboarding_ready'") < upload.indexOf('reconcileUC6FreshSyntheticScenarios'));
  assert.equal(upload.includes('loadUC6PackageOptions'), false);
  assert.equal((upload.match(/submitFreshTemplateOnboarding/g) || []).length, 1);
  assert.equal(upload.includes('startUC6Polling();'), true);
  assert.ok(refresh.indexOf('projectUc6FreshTemplateOnboardingJobStatus') < refresh.indexOf('projectUc6DummyDatabagRenderJobStatus'));
  assert.equal(refresh.includes("projected.state === 'source_ready' && uc6State.freshOnboardingExpected"), true);
  assert.equal(refresh.includes("projected.state === 'onboarding_ready'"), true);
  assert.equal(refresh.includes('reconcileUC6FreshSyntheticScenarios'), true);
  assert.equal(poll.includes('mapped.onboardingPollable'), true);
  assert.equal(save.includes('fresh_onboarding_expected: uc6State.freshOnboardingExpected'), true);
  assert.equal(resume.includes('persisted.fresh_onboarding_expected === true'), true);
  assert.equal(reset.includes('uc6State.freshOnboardingExpected = false'), true);
  assert.ok(submit.indexOf('UC6_R6D2B_PACKAGE_FAMILY_OPTIONS_SCHEMA') < submit.indexOf('submitDummyDatabagRender'));
  assert.equal(render.includes('if (!isFresh) actions.append'), true);
  assert.equal(render.includes('renderUC6FreshSyntheticScenarioStage'), true);
  assert.equal(render.includes("profile.profile_origin === 'fresh_same_job'"), true);
  assert.equal(context.includes("profile?.profile_origin === 'fresh_same_job'"), true);
  assert.equal(context.includes('undefined:undefined'), false);
});

test('R6D3 fresh source-ready reconciliation remains contextually GET-pollable across polling and resume', () => {
  const app = readSource('../public/app.js');
  const eligibility = extractFunctionBody(app, 'isUC6FreshSourceReconciliationPending');
  const resume = extractFunctionBody(app, 'resumeUC6PersistedJob');
  const poll = extractFunctionBody(app, 'pollUC6JobStatus');
  const refresh = extractFunctionBody(app, 'refreshUC6JobStatus');

  assert.equal(eligibility.includes("uc6State.flowLane === 'dummy_render'"), true);
  assert.equal(eligibility.includes('uc6State.freshOnboardingExpected === true'), true);
  assert.equal(eligibility.includes("uc6State.jobState === 'source_ready'"), true);
  assert.equal(mapUc6StateToView('source_ready').pollable, false, 'legacy source_ready stays globally non-pollable');
  assert.equal(mapUc6StateToView('source_ready').renderPollable, undefined);
  assert.equal(mapUc6StateToView('source_ready').onboardingPollable, undefined);

  assert.equal(resume.includes('persisted.fresh_onboarding_expected === true'), true);
  assert.equal(resume.includes('isUC6FreshSourceReconciliationPending()'), true);
  assert.ok(resume.indexOf('isUC6FreshSourceReconciliationPending()') < resume.indexOf('if (shouldPoll) startUC6Polling()'));
  assert.equal(poll.includes('isUC6FreshSourceReconciliationPending()'), true);
  assert.ok(poll.indexOf('isUC6FreshSourceReconciliationPending()') < poll.indexOf('if (isPollable) scheduleUC6Poll()'));

  assert.equal(eligibility.includes('submitFreshTemplateOnboarding'), false);
  assert.equal(resume.includes('submitFreshTemplateOnboarding'), false);
  assert.equal(poll.includes('submitFreshTemplateOnboarding'), false);
  assert.equal(refresh.includes('submitFreshTemplateOnboarding'), false);

  const sourceReconciliation = refresh.indexOf("projected.state === 'source_ready' && uc6State.freshOnboardingExpected");
  const legacyPackageLoad = refresh.indexOf("else if (projected.state === 'failed' || projected.state === 'source_ready')");
  assert.notEqual(sourceReconciliation, -1);
  assert.ok(sourceReconciliation < legacyPackageLoad, 'fresh source_ready is handled before legacy package loading');

  const readyBranch = refresh.indexOf("projected.state === 'onboarding_ready'");
  const blockedBranch = refresh.indexOf("projected.state === 'onboarding_blocked'");
  const queuedRunningBranch = refresh.indexOf('} else {', blockedBranch);
  assert.ok(readyBranch < blockedBranch);
  assert.equal(refresh.slice(readyBranch, blockedBranch).includes('loadUC6PackageOptions'), false);
  assert.equal(refresh.slice(readyBranch, blockedBranch).includes('reconcileUC6FreshSyntheticScenarios'), true);
  assert.equal(refresh.slice(blockedBranch, queuedRunningBranch).includes('stopUC6Polling()'), true);
  assert.equal(refresh.slice(blockedBranch, queuedRunningBranch).includes('loadUC6PackageOptions'), false);
});

test('R6E-C2 synthetic endpoints use Firebase-only GET and one-shot POST boundaries', async () => {
  assert.equal(
    UC6_BROWSER_ADMIN_ENDPOINTS.syntheticScenarios(`  ${JOB_ID}  `),
    `/fetchdoc/browser-admin/uc6/jobs/${JOB_ID}/synthetic-scenarios`
  );
  assert.equal(
    UC6_BROWSER_ADMIN_ENDPOINTS.syntheticScenarioBinding(`  ${JOB_ID}  `),
    `/fetchdoc/browser-admin/uc6/jobs/${JOB_ID}/synthetic-scenarios/binding`
  );
  const calls = [];
  const refreshes = [];
  const responses = [
    r6eSyntheticSubmission(),
    r6eSyntheticGet(),
    r6eSyntheticBinding('scenario_001')
  ];
  const api = createUc6BrowserAdminApi({
    apiBaseUrl: API_BASE,
    getIdToken: async (forceRefresh) => { refreshes.push(forceRefresh); return 'firebase-r6e-token'; },
    fetchImpl: async (url, init) => {
      calls.push({ url, init });
      return response(200, responses.shift());
    }
  });
  await api.submitFreshSyntheticScenarios(JOB_ID);
  await api.getFreshSyntheticScenarios(JOB_ID);
  await api.bindFreshSyntheticScenario(JOB_ID, 'scenario_001');
  assert.deepEqual(refreshes, [true, false, true]);
  assert.deepEqual(calls.map((call) => call.init.method), ['POST', 'GET', 'POST']);
  assert.equal(calls[0].init.body, undefined);
  assert.equal(calls[0].init.headers['Content-Type'], undefined);
  assert.equal(calls[1].init.body, undefined);
  assert.equal(calls[2].init.body, JSON.stringify({ scenario_key: 'scenario_001' }));
  assert.equal(calls[2].init.headers['Content-Type'], 'application/json');
  for (const call of calls) {
    assert.equal(call.init.headers.Authorization, 'Bearer firebase-r6e-token');
    assert.equal(call.init.headers[['X', 'Internal', 'Token'].join('-')], undefined);
    assert.equal(call.init.credentials, 'omit');
    assert.equal(call.init.cache, 'no-store');
  }

  let invalidCalls = 0;
  const invalidApi = createUc6BrowserAdminApi({
    apiBaseUrl: API_BASE,
    getIdToken: async () => 'token',
    fetchImpl: async () => { invalidCalls += 1; return response(200, {}); }
  });
  assert.throws(() => invalidApi.bindFreshSyntheticScenario(JOB_ID, 'scenario_999'), { code: 'synthetic_scenario_key_invalid' });
  assert.equal(invalidCalls, 0);
  assert.deepEqual(validateUc6SyntheticScenarioBindingCommand(' scenario_002 ').body, { scenario_key: 'scenario_002' });

  for (const method of ['submitFreshSyntheticScenarios', 'bindFreshSyntheticScenario']) {
    let attempts = 0;
    const ambiguousApi = createUc6BrowserAdminApi({
      apiBaseUrl: API_BASE,
      getIdToken: async () => 'token',
      fetchImpl: async () => { attempts += 1; throw new Error('network unavailable'); }
    });
    const invoke = method === 'bindFreshSyntheticScenario'
      ? () => ambiguousApi[method](JOB_ID, 'scenario_000')
      : () => ambiguousApi[method](JOB_ID);
    await assert.rejects(invoke, { name: 'Uc6AmbiguousSubmissionError', code: 'ambiguous_submission' });
    assert.equal(attempts, 1);
  }

  let unauthorizedAttempts = 0;
  const unauthorizedApi = createUc6BrowserAdminApi({
    apiBaseUrl: API_BASE,
    getIdToken: async () => 'token',
    fetchImpl: async () => { unauthorizedAttempts += 1; return response(401, { detail: { code: 'browser_admin_token_expired' } }); }
  });
  await assert.rejects(() => unauthorizedApi.submitFreshSyntheticScenarios(JOB_ID), { status: 401 });
  assert.equal(unauthorizedAttempts, 1);
});

test('R6E-C2 generation submission projector keeps queue-backed states strict and detached', () => {
  for (const state of ['synthetic_scenarios_queued', 'synthetic_scenarios_running', 'synthetic_scenarios_failed']) {
    const payload = r6eSyntheticSubmission(state);
    const projected = projectUc6FreshSyntheticGenerationSubmission(payload, { expectedJobId: JOB_ID });
    assert.equal(projected.state, state);
    assert.equal(Number.isSafeInteger(projected.task_id), true);
    assert.notStrictEqual(projected, payload);
  }

  const mutations = [
    (v) => { v.schema_version = ''; },
    (v) => { v.job_id = 'fd_uc6_admin_other_12345'; },
    (v) => { v.task_type = 'wrong'; },
    (v) => { v.task_id = 0; },
    (v) => { v.queue_status = 'processing'; },
    (v) => { v.created = 'true'; },
    (v) => { v.public_safety = 'FAIL'; },
    (v) => { v.operation_fingerprint = 'private'; }
  ];
  for (const mutate of mutations) {
    const payload = r6eSyntheticSubmission();
    mutate(payload);
    assert.throws(() => projectUc6FreshSyntheticGenerationSubmission(payload, { expectedJobId: JOB_ID }), TypeError);
  }

  for (const state of ['synthetic_scenarios_queued', 'synthetic_scenarios_running', 'synthetic_scenarios_failed']) {
    const payload = r6eSyntheticSubmission(state);
    payload.source_pptx_sha256 = R6C_SOURCE_SHA;
    assert.throws(
      () => projectUc6FreshSyntheticGenerationSubmission(payload, { expectedJobId: JOB_ID }),
      /invalid_synthetic_generation_ready_metadata/
    );
  }
});

test('R6E-C2 accepts the exact provider-free ready replay envelope without manufacturing a task', () => {
  const readyReplay = {
    schema_version: 'backend_owned_r6e_c1_submission_v1',
    job_id: JOB_ID,
    task_type: 'fetchdoc_browser_admin_uc6_fresh_synthetic_scenario_generation',
    task_id: null,
    queue_status: 'ready',
    created: false,
    state: 'synthetic_scenarios_ready',
    control_plane_contract_version: R6C_CONTROL_PLANE_VERSION,
    public_safety: 'PASS',
    source_pptx_sha256: R6C_SOURCE_SHA,
    synthetic_scenario_family_id: 'synthetic_family_demo_v1',
    scenario_count: 3,
    package_count: 3,
    network_call_count: 0,
    replayed: true,
    provider_attempt_count: 1
  };
  const before = JSON.stringify(readyReplay);
  const projected = projectUc6FreshSyntheticGenerationSubmission(readyReplay, { expectedJobId: JOB_ID });
  assert.equal(JSON.stringify(readyReplay), before);
  assert.notStrictEqual(projected, readyReplay);
  assert.equal(projected.state, 'synthetic_scenarios_ready');
  assert.equal(projected.queue_status, 'ready');
  assert.equal(projected.task_id, null);
  assert.equal(projected.created, false);
  assert.equal(projected.source_pptx_sha256, R6C_SOURCE_SHA);
  assert.equal(projected.synthetic_scenario_family_id, 'synthetic_family_demo_v1');
  assert.equal(projected.scenario_count, 3);
  assert.equal(projected.package_count, 3);
  assert.equal(projected.network_call_count, 0);
  assert.equal(projected.replayed, true);
  assert.equal(projected.provider_attempt_count, 1);

  const readyWithoutTaskType = cloneFixture(readyReplay);
  delete readyWithoutTaskType.task_type;
  assert.equal(projectUc6FreshSyntheticGenerationSubmission(readyWithoutTaskType, { expectedJobId: JOB_ID }).task_type, undefined);
});

test('R6E-C2 rejects malformed or partial provider-free ready replay envelopes', () => {
  const invalidReadyMutations = [
    (v) => { v.queue_status = 'done'; },
    (v) => { v.task_id = 812; },
    (v) => { v.created = true; },
    (v) => { delete v.provider_attempt_count; },
    (v) => {
      for (const field of ['source_pptx_sha256', 'synthetic_scenario_family_id', 'scenario_count', 'package_count', 'network_call_count', 'replayed', 'provider_attempt_count']) delete v[field];
    },
    (v) => {
      for (const field of ['synthetic_scenario_family_id', 'scenario_count', 'package_count', 'network_call_count', 'replayed', 'provider_attempt_count']) delete v[field];
    },
    (v) => { v.scenario_count = 2; },
    (v) => { v.package_count = 4; },
    (v) => { v.network_call_count = 1; },
    (v) => { v.replayed = false; },
    (v) => { v.provider_attempt_count = 2; }
  ];
  for (const mutate of invalidReadyMutations) {
    const payload = r6eSyntheticSubmission('synthetic_scenarios_ready');
    mutate(payload);
    assert.throws(() => projectUc6FreshSyntheticGenerationSubmission(payload, { expectedJobId: JOB_ID }), TypeError);
  }
});

test('R6E-C2 synthetic GET projector enforces exactly three ordered coherent public scenarios', () => {
  const payload = r6eSyntheticGet();
  const before = JSON.stringify(payload);
  const projected = projectUc6FreshSyntheticScenarios(payload, { expectedJobId: JOB_ID, expectedSourceSha: R6C_SOURCE_SHA });
  assert.equal(JSON.stringify(payload), before);
  assert.deepEqual(projected.scenario_options.map((row) => row.scenario_key), ['scenario_000', 'scenario_001', 'scenario_002']);
  assert.notStrictEqual(projected.scenario_options, payload.scenario_options);
  assert.notStrictEqual(projected.scenario_options[0], payload.scenario_options[0]);
  assert.equal(projected.scenario_options[1].differentiation_basis, null);

  for (const state of ['not_started', 'generation_queued', 'generation_running', 'generation_failed']) {
    assert.equal(projectUc6FreshSyntheticScenarios(r6eSyntheticGet(state), { expectedJobId: JOB_ID }).generation_state, state);
  }
  const bound = projectUc6FreshSyntheticScenarios(r6eSyntheticGet('generation_ready', 'bound'), { expectedJobId: JOB_ID });
  assert.equal(bound.bound_scenario.scenario_key, 'scenario_001');

  const mutations = [
    (v) => { v.scenario_options.pop(); },
    (v) => { v.scenario_options.push(r6eSyntheticScenario(2, { scenario_key: 'scenario_002' })); },
    (v) => { [v.scenario_options[0], v.scenario_options[1]] = [v.scenario_options[1], v.scenario_options[0]]; },
    (v) => { v.scenario_options[2].scenario_key = 'scenario_001'; },
    (v) => { v.scenario_options[2].synthetic_scenario_family_id = 'other_family'; },
    (v) => { v.scenario_options[2].template_family_id = 'other_template'; },
    (v) => { v.scenario_options[0].source_context = { secret: true }; },
    (v) => { v.scenario_options[0].scenario_summary = 'C:\\private\\source.json'; },
    (v) => { v.public_safety = 'FAIL'; },
    (v) => { v.provider_receipt_id = 'private'; }
  ];
  for (const mutate of mutations) {
    const candidate = r6eSyntheticGet();
    mutate(candidate);
    assert.throws(() => projectUc6FreshSyntheticScenarios(candidate, { expectedJobId: JOB_ID }), TypeError);
  }
  const notReadyWithOptions = r6eSyntheticGet('generation_running');
  notReadyWithOptions.scenario_options = [r6eSyntheticScenario(0)];
  assert.throws(() => projectUc6FreshSyntheticScenarios(notReadyWithOptions, { expectedJobId: JOB_ID }), TypeError);
  const unboundWithBoundScenario = r6eSyntheticGet();
  unboundWithBoundScenario.bound_scenario = r6eSyntheticScenario(0);
  assert.throws(() => projectUc6FreshSyntheticScenarios(unboundWithBoundScenario, { expectedJobId: JOB_ID }), TypeError);
});

test('R6E-C2 binding projector requires the requested immutable scenario and safe metadata', () => {
  for (const disposition of ['created', 'replayed']) {
    const payload = r6eSyntheticBinding('scenario_001', disposition);
    const projected = projectUc6FreshSyntheticScenarioBinding(payload, {
      expectedJobId: JOB_ID,
      expectedScenarioKey: 'scenario_001',
      expectedSourceSha: R6C_SOURCE_SHA
    });
    assert.equal(projected.disposition, disposition);
    assert.equal(projected.bound_scenario.scenario_key, 'scenario_001');
    assert.notStrictEqual(projected.bound_scenario, payload.bound_scenario);
  }
  const mutations = [
    (v) => { v.selection_state = 'unbound'; },
    (v) => { v.disposition = 'changed'; },
    (v) => { v.public_safety = 'FAIL'; },
    (v) => { v.bound_scenario.package_id = ''; },
    (v) => { v.absolute_path = 'C:\\private'; }
  ];
  for (const mutate of mutations) {
    const payload = r6eSyntheticBinding();
    mutate(payload);
    assert.throws(() => projectUc6FreshSyntheticScenarioBinding(payload, {
      expectedJobId: JOB_ID,
      expectedScenarioKey: 'scenario_001'
    }), TypeError);
  }
  assert.throws(() => projectUc6FreshSyntheticScenarioBinding(r6eSyntheticBinding('scenario_000'), {
    expectedJobId: JOB_ID,
    expectedScenarioKey: 'scenario_001'
  }), TypeError);
});

test('R6E-C2 state mapping is synthetic-only for queued/running and terminal within the C2 stage', () => {
  for (const state of ['synthetic_scenarios_queued', 'synthetic_scenarios_running']) {
    const mapped = mapUc6StateToView(state);
    assert.equal(mapped.known, true);
    assert.equal(mapped.syntheticScenariosPollable, true);
    assert.equal(mapped.pollable, false);
    assert.equal(mapped.renderPollable, undefined);
    assert.equal(mapped.onboardingPollable, undefined);
  }
  for (const state of ['synthetic_scenarios_ready', 'synthetic_scenario_bound', 'synthetic_scenarios_failed']) {
    const mapped = mapUc6StateToView(state);
    assert.equal(mapped.known, true);
    assert.equal(mapped.syntheticScenariosPollable, false);
    assert.equal(mapped.pollable, false);
    assert.equal(mapped.renderPollable, undefined);
    assert.equal(mapped.onboardingPollable, undefined);
  }
});

test('R6E-C2 persistence and app source enforce GET-first one-shot generation, three-card binding, and stop before render', () => {
  assert.deepEqual(projectUc6PersistedState({
    job_id: JOB_ID,
    fresh_onboarding_expected: true,
    fresh_synthetic_expected: true,
    synthetic_generation_submitted: true,
    synthetic_generation_submission_ambiguous: true,
    synthetic_binding_submission_ambiguous: true,
    selected_synthetic_scenario_key: 'scenario_002',
    source_context: { private: true }
  }), {
    job_id: JOB_ID,
    fresh_onboarding_expected: true,
    fresh_synthetic_expected: true,
    synthetic_generation_submitted: true,
    synthetic_generation_submission_ambiguous: true,
    synthetic_binding_submission_ambiguous: true
  });

  const app = readSource('../public/app.js');
  const upload = extractFunctionBody(app, 'uploadUC6PptxJob');
  const reconcile = extractFunctionBody(app, 'reconcileUC6FreshSyntheticScenarios');
  const loadSynthetic = extractFunctionBody(app, 'loadUC6FreshSyntheticScenarios');
  const submitGeneration = extractFunctionBody(app, 'submitUC6FreshSyntheticGeneration');
  const bind = extractFunctionBody(app, 'bindUC6FreshSyntheticScenario');
  const renderSynthetic = extractFunctionBody(app, 'renderUC6FreshSyntheticScenarioStage');
  const renderPackage = extractFunctionBody(app, 'renderUC6PackageStage');
  const loadLegacy = extractFunctionBody(app, 'loadUC6PackageOptions');
  const loadAsset = extractFunctionBody(app, 'loadUC6ReusableAssetPackages');
  const resume = extractFunctionBody(app, 'resumeUC6PersistedJob');
  const polling = extractFunctionBody(app, 'pollUC6JobStatus');

  assert.equal(upload.includes('loadUC6PackageOptions'), false);
  assert.equal(upload.includes('reconcileUC6FreshSyntheticScenarios'), true);
  assert.ok(reconcile.indexOf('loadUC6FreshSyntheticScenarios') < reconcile.indexOf('submitUC6FreshSyntheticGeneration'));
  assert.equal(loadSynthetic.includes('getFreshSyntheticScenarios'), true);
  assert.equal(submitGeneration.includes('syntheticGenerationSubmitted || uc6State.syntheticGenerationSubmissionAmbiguous'), true);
  assert.ok(submitGeneration.indexOf('uc6State.syntheticGenerationSubmitted = true') < submitGeneration.indexOf('api.submitFreshSyntheticScenarios'));
  assert.equal((submitGeneration.match(/api\.submitFreshSyntheticScenarios/g) || []).length, 1);
  assert.equal(submitGeneration.includes('submitDummyDatabagRender'), false);
  assert.equal(resume.includes('refreshUC6JobStatus'), true);
  assert.equal(resume.includes('submitFreshSyntheticScenarios'), false);
  assert.equal(polling.includes('syntheticScenariosPollable'), true);

  assert.equal(renderSynthetic.includes('uc6State.syntheticScenarioOptions.length === 3'), true);
  assert.equal(renderSynthetic.includes("data.uc6SyntheticScenario"), false);
  assert.equal(renderSynthetic.includes('action.dataset.uc6SyntheticScenario = scenario.scenario_key'), true);
  assert.equal(renderSynthetic.includes('실제 고객 정보가 아닙니다'), true);
  assert.equal(renderSynthetic.includes("isBound || uc6State.operationInFlight || uc6State.syntheticBindingSubmissionAmbiguous"), true);
  assert.equal(renderSynthetic.includes('uc6-submitRenderBtn'), false);
  assert.equal(renderPackage.includes('renderUC6FreshSyntheticScenarioStage'), true);

  assert.equal(bind.includes('bindFreshSyntheticScenario'), true);
  assert.equal(bind.includes('expectedScenarioKey: option.scenario_key'), true);
  assert.equal(bind.includes("uc6State.jobState = 'synthetic_scenario_bound'"), true);
  assert.equal(bind.includes('submitDummyDatabagRender'), false);
  assert.equal(bind.includes('submitReusableAssetRender'), false);
  assert.equal(bind.includes('startUC6Polling'), false);
  assert.equal(loadLegacy.includes('getDummyDatabagPackageFamilies'), true, 'static/curated package family flow remains');
  assert.equal(loadAsset.includes('getReusableAssetPackages'), true, 'reusable Asset flow remains');
});

function r6eD2RenderSubmission(state = 'render_queued') {
  return {
    schema_version: 'backend_owned_r6e_d2_render_submission_v1',
    job_id: JOB_ID,
    task_type: 'fetchdoc_browser_admin_uc6_render_fresh_synthetic_scenario',
    task_id: state === 'render_completed' ? null : 913,
    queue_status: {
      render_queued: 'pending',
      render_running: 'processing',
      render_completed: 'ready',
      failed: 'failed'
    }[state],
    created: state === 'render_queued',
    state,
    selection_state: 'bound',
    bound_scenario: r6eSyntheticScenario(1),
    control_plane_contract_version: R6C_CONTROL_PLANE_VERSION,
    public_safety: 'PASS'
  };
}

function r6eD2RenderJob(state = 'render_completed', disposition = {}) {
  const payload = {
    job_id: JOB_ID,
    state,
    source: {
      sha256: R6C_SOURCE_SHA,
      size_bytes: 4096,
      slide_count: 12,
      filename: 'fresh-source.pptx'
    },
    control_plane_contract_version: R6C_CONTROL_PLANE_VERSION
  };
  if (state === 'render_completed') {
    payload.render = {
      schema_version: 'backend_owned_r6e_d2_render_result_v1',
      job_id: JOB_ID,
      state: 'render_completed',
      render_state: 'render_completed',
      source_pptx_sha256: R6C_SOURCE_SHA,
      final_artifacts: {
        pptx: { alias: 'final_render_output_pptx', sha256: 'b'.repeat(64), size_bytes: 8192 },
        pdf: { alias: 'final_render_output_pdf', sha256: 'c'.repeat(64), size_bytes: 6144 }
      },
      disposition_summary: {
        validation_status: 'ready_with_review',
        final_validation_status: 'ready',
        generated_count: 44,
        private_fallback_count: 15,
        expected_slot_count: 59,
        blocking_issue_count: 0,
        red_marker_count: 0,
        ...disposition
      },
      control_plane_contract_version: R6C_CONTROL_PLANE_VERSION,
      public_safety: 'PASS'
    };
  }
  return payload;
}

test('R6E-D2 render endpoint is normalized and submits one Firebase-only bodyless POST', async () => {
  assert.equal(
    UC6_BROWSER_ADMIN_ENDPOINTS.syntheticScenarioRender(`  ${JOB_ID}  `),
    `/fetchdoc/browser-admin/uc6/jobs/${JOB_ID}/synthetic-scenarios/render`
  );
  const calls = [];
  const refreshes = [];
  const api = createUc6BrowserAdminApi({
    apiBaseUrl: API_BASE,
    getIdToken: async (forceRefresh) => { refreshes.push(forceRefresh); return 'firebase-r6e-d2-token'; },
    fetchImpl: async (url, init) => { calls.push({ url, init }); return response(200, r6eD2RenderSubmission()); }
  });
  await api.submitFreshSyntheticScenarioRender(JOB_ID);
  assert.deepEqual(refreshes, [true]);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, `${API_BASE}fetchdoc/browser-admin/uc6/jobs/${JOB_ID}/synthetic-scenarios/render`);
  assert.equal(calls[0].init.method, 'POST');
  assert.equal(calls[0].init.body, undefined);
  assert.equal(calls[0].init.headers['Content-Type'], undefined);
  assert.equal(calls[0].init.headers.Authorization, 'Bearer firebase-r6e-d2-token');
  assert.equal(calls[0].init.headers[['X', 'Internal', 'Token'].join('-')], undefined);
  assert.equal(calls[0].init.cache, 'no-store');
  assert.equal(calls[0].init.credentials, 'omit');

  let attempts = 0;
  const ambiguousApi = createUc6BrowserAdminApi({
    apiBaseUrl: API_BASE,
    getIdToken: async () => 'firebase-token',
    fetchImpl: async () => { attempts += 1; throw new Error('network unavailable'); }
  });
  await assert.rejects(() => ambiguousApi.submitFreshSyntheticScenarioRender(JOB_ID), {
    name: 'Uc6AmbiguousSubmissionError',
    code: 'ambiguous_submission'
  });
  assert.equal(attempts, 1, 'ambiguous POST is never replayed');
});

test('R6E-D2 submission projection validates public identity and state-specific retained completion', () => {
  for (const state of ['render_queued', 'render_running', 'failed']) {
    const projected = projectUc6FreshSyntheticRenderSubmission(r6eD2RenderSubmission(state), {
      expectedJobId: JOB_ID,
      expectedScenarioKey: 'scenario_001'
    });
    assert.equal(projected.state, state);
    assert.equal(projected.selection_state, 'bound');
    assert.equal(projected.bound_scenario.package_id, 'synthetic_package_001');
  }
  const retained = projectUc6FreshSyntheticRenderSubmission(r6eD2RenderSubmission('render_completed'), {
    expectedJobId: JOB_ID,
    expectedScenarioKey: 'scenario_001'
  });
  assert.equal(retained.state, 'render_completed');
  assert.equal(retained.task_id, null);
  assert.equal(retained.created, false);

  for (const mutate of [
    (v) => { v.job_id = 'fd_uc6_admin_other_12345'; },
    (v) => { v.task_type = 'fetchdoc_browser_admin_uc6_render_dummy_databag'; },
    (v) => { v.selection_state = 'unbound'; },
    (v) => { v.public_safety = 'FAIL'; },
    (v) => { v.provider_request_id = 'private'; },
    (v) => { v.bound_scenario.package_id = ''; }
  ]) {
    const payload = r6eD2RenderSubmission();
    mutate(payload);
    assert.throws(() => projectUc6FreshSyntheticRenderSubmission(payload, {
      expectedJobId: JOB_ID,
      expectedScenarioKey: 'scenario_001'
    }), TypeError);
  }
});

test('R6E-D2 job projection resumes queued/running/failed without a submission and exposes completed artifacts', () => {
  for (const state of ['render_queued', 'render_running', 'failed']) {
    const projected = projectUc6FreshSyntheticRenderJobStatus(r6eD2RenderJob(state), { expectedJobId: JOB_ID });
    assert.equal(projected.state, state);
    assert.equal(projected.render, null);
  }
  const completed = projectUc6FreshSyntheticRenderJobStatus(r6eD2RenderJob(), { expectedJobId: JOB_ID });
  assert.equal(completed.state, 'render_completed');
  assert.equal(completed.final_artifacts.pptx.alias, 'final_render_output_pptx');
  assert.equal(completed.final_artifacts.pdf.alias, 'final_render_output_pdf');
  assert.equal(completed.disposition.generated_count, 44);
  assert.equal(completed.disposition.private_fallback_count, 15);
  assert.equal(completed.review_required, true);

  const noFallback = r6eD2RenderJob('render_completed', {
    validation_status: 'ready',
    generated_count: 59,
    private_fallback_count: 0
  });
  assert.equal(projectUc6FreshSyntheticRenderJobStatus(noFallback, { expectedJobId: JOB_ID }).review_required, false);

  const mismatched = r6eD2RenderJob();
  mismatched.render.disposition_summary.generated_count = 43;
  assert.throws(() => projectUc6FreshSyntheticRenderJobStatus(mismatched, { expectedJobId: JOB_ID }), /count_mismatch/);
  const unsafe = r6eD2RenderJob();
  unsafe.render.provider_request_id = 'private';
  assert.throws(() => projectUc6FreshSyntheticRenderJobStatus(unsafe, { expectedJobId: JOB_ID }), TypeError);
});

test('R6E-D2 render control enables only authoritative bound selection and locks exactly once', () => {
  const base = {
    selectionState: 'bound',
    boundScenario: r6eSyntheticScenario(1),
    publicState: 'synthetic_scenario_bound',
    submitted: false,
    ambiguous: false,
    inFlight: false
  };
  assert.equal(projectUc6FreshSyntheticRenderControl({ ...base, selectionState: 'unbound' }).canSubmit, false);
  assert.equal(projectUc6FreshSyntheticRenderControl({ ...base, boundScenario: null }).canSubmit, false);
  assert.equal(projectUc6FreshSyntheticRenderControl({ ...base, publicState: 'synthetic_scenarios_ready' }).canSubmit, false);
  assert.equal(projectUc6FreshSyntheticRenderControl(base).canSubmit, true);
  assert.equal(projectUc6FreshSyntheticRenderControl({ ...base, inFlight: true }).canSubmit, false);
  assert.equal(projectUc6FreshSyntheticRenderControl({ ...base, submitted: true }).canSubmit, false);
  assert.equal(projectUc6FreshSyntheticRenderControl({ ...base, submitted: true }).renderPollable, true);
  assert.equal(projectUc6FreshSyntheticRenderControl({ ...base, publicState: 'render_queued' }).renderPollable, true);
  assert.equal(projectUc6FreshSyntheticRenderControl({ ...base, publicState: 'render_running' }).renderPollable, true);
  assert.equal(projectUc6FreshSyntheticRenderControl({ ...base, publicState: 'render_completed' }).completed, true);
  assert.equal(projectUc6FreshSyntheticRenderControl({ ...base, ambiguous: true }).reconciliationRequired, true);
});

test('R6E-D2 persisted submission flags survive refresh without storing scenario or authority payloads', () => {
  assert.deepEqual(projectUc6PersistedState({
    job_id: JOB_ID,
    fresh_onboarding_expected: true,
    fresh_synthetic_expected: true,
    fresh_render_submitted: true,
    fresh_render_submission_ambiguous: true,
    scenario_key: 'scenario_001',
    package_id: 'synthetic_package_001',
    provider_profile: 'private',
    internal_path: 'C:\\private'
  }), {
    job_id: JOB_ID,
    fresh_onboarding_expected: true,
    fresh_synthetic_expected: true,
    fresh_render_submitted: true,
    fresh_render_submission_ambiguous: true
  });
});

test('R6E-D2 app continuation reuses polling and capabilities, reconciles ambiguity, and stops before review/publication', () => {
  const app = readSource('../public/app.js');
  const admin = readSource('../public/uc6-browser-admin.mjs');
  const submit = extractFunctionBody(app, 'submitUC6FreshSyntheticRender');
  const refresh = extractFunctionBody(app, 'refreshUC6JobStatus');
  const poll = extractFunctionBody(app, 'pollUC6JobStatus');
  const renderSelection = extractFunctionBody(app, 'renderUC6FreshSyntheticScenarioStage');
  const renderProgress = extractFunctionBody(app, 'renderUC6RenderStage');
  const renderResult = extractFunctionBody(app, 'renderUC6FreshSyntheticRenderResultStage');
  const loadFreshDelivery = extractFunctionBody(app, 'loadUC6FreshRenderDeliveryState');
  const download = extractFunctionBody(app, 'downloadUC6ReviewArtifact');
  const staticRender = extractFunctionBody(app, 'submitUC6DummyRender');
  const assetRender = extractFunctionBody(app, 'submitUC6ReusableAssetRender');

  assert.equal((submit.match(/api\.submitFreshSyntheticScenarioRender/g) || []).length, 1);
  assert.ok(submit.indexOf('uc6State.freshRenderSubmitted = true') < submit.indexOf('api.submitFreshSyntheticScenarioRender'));
  assert.equal(submit.includes('projectUc6FreshSyntheticRenderControl'), true);
  assert.equal(submit.includes('renderSubmissionReconciliation: true'), true);
  assert.equal(submit.includes("uc6State.jobState === 'render_queued' || uc6State.jobState === 'render_running'"), true);
  assert.equal(submit.includes('startUC6Polling()'), true, 'accepted ambiguous submission resumes the shared poller');
  assert.equal(submit.includes('submitDummyDatabagRender'), false);
  assert.equal(submit.includes('submitReusableAssetRender'), false);
  assert.equal(refresh.includes('projectUc6FreshSyntheticRenderJobStatus'), true);
  assert.equal(refresh.includes('submitFreshSyntheticScenarioRender'), false, 'GET reconciliation cannot replay POST');
  assert.equal(poll.includes('isUC6FreshRenderReconciliationPending()'), true);
  assert.equal(renderSelection.includes('uc6-submitFreshRenderBtn'), true);
  assert.equal(renderSelection.includes("selectionState: uc6State.syntheticSelectionState"), true);
  assert.equal(renderProgress.includes('uc6State.freshSyntheticExpected'), true);
  assert.equal(renderResult.includes('final_render_output_pdf'), true);
  assert.equal(renderResult.includes('최종 PDF'), true);
  assert.equal(renderResult.includes('생성된 PPTX'), true);
  assert.equal(renderResult.includes('private_fallback_count'), true);
  assert.equal(renderResult.includes('근거 데이터가 부족'), true);
  assert.equal(renderResult.includes('submitUC6ReusableAssetPublication'), false);
  assert.equal(renderResult.includes('loadUC6A8FReviewState'), false);
  assert.equal(renderResult.includes('uc6-submitPublicationBtn'), false);
  assert.equal(loadFreshDelivery.includes('getRenderArtifactCapabilities'), true);
  assert.equal(loadFreshDelivery.includes('getReviewArtifactCapabilities'), false);
  assert.equal(download.includes("uc6State.flowLane === 'asset_render' || uc6State.freshSyntheticExpected"), true);
  assert.equal(admin.includes('X-Internal-Token'), false);
  assert.equal(admin.includes('/data/'), false);
  assert.equal(staticRender.includes('submitDummyDatabagRender'), true, 'static/curated render remains on its endpoint');
  assert.equal(staticRender.includes('submitFreshSyntheticScenarioRender'), false);
  assert.equal(assetRender.includes('submitReusableAssetRender'), true, 'reusable Asset render remains on its endpoint');
  assert.equal(assetRender.includes('submitFreshSyntheticScenarioRender'), false);
});
