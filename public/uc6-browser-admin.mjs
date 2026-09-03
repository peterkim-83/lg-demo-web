export const UC6_PRODUCTION_API_BASE = 'https://api.peter-n8n.duckdns.org/';

export const UC6_BROWSER_ADMIN_ENDPOINTS = Object.freeze({
  session: '/fetchdoc/browser-admin/session',
  jobs: '/fetchdoc/browser-admin/uc6/jobs',
  job: (jobId) => `/fetchdoc/browser-admin/uc6/jobs/${encodeURIComponent(normalizeUc6JobId(jobId))}`,
  onboarding: (jobId) => `/fetchdoc/browser-admin/uc6/jobs/${encodeURIComponent(normalizeUc6JobId(jobId))}/onboarding`,
  jobEvents: (jobId) => `/fetchdoc/browser-admin/uc6/jobs/${encodeURIComponent(normalizeUc6JobId(jobId))}/events`,
  syntheticScenarios: (jobId) => `/fetchdoc/browser-admin/uc6/jobs/${encodeURIComponent(normalizeUc6JobId(jobId))}/synthetic-scenarios`,
  syntheticScenarioBinding: (jobId) => `/fetchdoc/browser-admin/uc6/jobs/${encodeURIComponent(normalizeUc6JobId(jobId))}/synthetic-scenarios/binding`,
  syntheticScenarioRender: (jobId) => `/fetchdoc/browser-admin/uc6/jobs/${encodeURIComponent(normalizeUc6JobId(jobId))}/synthetic-scenarios/render`,
  renderArtifactCapabilities: (jobId) => `/fetchdoc/browser-admin/uc6/jobs/${encodeURIComponent(normalizeUc6JobId(jobId))}/render-artifact-capabilities`,
  reusableAssetPublication: (jobId) => `/fetchdoc/browser-admin/uc6/jobs/${encodeURIComponent(normalizeUc6JobId(jobId))}/reusable-asset-publication`,
  reusableAssets: '/fetchdoc/browser-admin/uc6/reusable-assets',
  reusableAssetJobs: (assetId) => `/fetchdoc/browser-admin/uc6/reusable-assets/${encodeURIComponent(normalizeUc6ReusableAssetId(assetId))}/jobs`
});

export const UC6_GENERIC_PUBLIC_ERROR_MESSAGE = '요청을 처리할 수 없습니다. 잠시 후 다시 시도하세요.';
export const UC6_PUBLIC_ERROR_MESSAGES = Object.freeze({
  browser_admin_bearer_token_required: '관리자 로그인이 필요합니다. 다시 로그인하세요.',
  browser_admin_authorization_header_invalid: '관리자 인증 정보를 확인할 수 없습니다. 다시 로그인하세요.',
  browser_admin_token_invalid: '관리자 인증이 유효하지 않습니다. 다시 로그인하세요.',
  browser_admin_token_expired: '관리자 인증 시간이 만료되었습니다. 다시 로그인하세요.',
  browser_admin_role_required: 'FetchDoc 관리자 권한이 필요합니다.',
  browser_admin_email_unverified: '인증된 관리자 계정만 사용할 수 있습니다.',
  browser_admin_email_not_allowed: '허용된 관리자 계정이 아닙니다.',
  browser_admin_verification_unavailable: '관리자 권한 확인을 일시적으로 수행할 수 없습니다.',
  browser_admin_uc6_invalid_upload: 'PPTX 업로드 형식이 올바르지 않습니다.',
  browser_admin_uc6_invalid_pptx: '유효한 PPTX 파일을 업로드하세요.',
  browser_admin_uc6_upload_too_large: '업로드 가능한 PPTX 크기를 초과했습니다.',
  browser_admin_uc6_job_not_found: 'FetchDoc 작업을 찾을 수 없습니다.',
  browser_admin_uc6_synthetic_scenarios_not_ready: 'Persona 데이터가 아직 준비되지 않았습니다.',
  browser_admin_uc6_synthetic_scenarios_failed: 'Persona 데이터 준비에 실패했습니다.',
  browser_admin_uc6_synthetic_scenario_invalid: '선택한 Persona가 유효하지 않습니다.',
  browser_admin_uc6_synthetic_scenario_binding_conflict: '이 작업에는 이미 다른 Persona가 선택되어 있습니다. 작업 상태를 새로고침하세요.',
  browser_admin_uc6_render_conflict: '이미 처리 중인 생성 작업이 있습니다.',
  browser_admin_uc6_render_not_ready: '문서 생성 요청을 처리할 준비가 되지 않았습니다.',
  browser_admin_uc6_render_failed: '문서 생성 작업이 실패했습니다.',
  browser_admin_uc6_reusable_asset_not_found: '게시된 템플릿을 찾을 수 없습니다.',
  browser_admin_uc6_reusable_asset_unavailable: '게시된 템플릿을 일시적으로 사용할 수 없습니다.'
});

const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);
const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const JOB_ID_PATTERN = /^fd_uc6_admin_[A-Za-z0-9][A-Za-z0-9_.-]{2,127}$/;
const ASSET_ID_PATTERN = /^reusable_template_asset__[a-f0-9]{40}$/;
const BOUNDED_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_.:/-]{0,127}$/;
const PERSONA_KEY_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_.-]{0,127}$/;
const QUEUE_STATUSES = new Set(['pending', 'processing', 'done', 'failed']);
const ONBOARDING_STATES = new Set(['onboarding_queued', 'onboarding_running', 'onboarding_ready', 'onboarding_blocked', 'persona_selection_ready']);
const PERSONA_CATALOG_ONBOARDING_STATES = new Set(['source_ready', 'onboarding_queued', 'onboarding_running', 'onboarding_ready', 'onboarding_blocked']);
const JOB_STATES = new Set(['source_ready', ...ONBOARDING_STATES, 'synthetic_scenarios_queued', 'synthetic_scenarios_running', 'synthetic_scenarios_ready', 'synthetic_scenario_bound', 'synthetic_scenarios_failed', 'render_queued', 'render_running', 'render_completed', 'render_unknown', 'failed']);
const GENERATION_STATES = new Set(['not_started', 'generation_queued', 'generation_running', 'generation_ready', 'generation_failed']);
const PUBLICATION_DECISION = 'approve_for_reuse_and_publish';
const PERSONA_CATALOG_SCHEMA = 'uc6_postprod_q4_r3e_3g_browser_admin_fresh_selected_persona_options_v1';
const PERSONA_BINDING_SCHEMA = 'uc6_postprod_q4_r3e_3e_browser_admin_fresh_selected_persona_selection_projection_v1';
const SOURCE_GENERATION_SCHEMA = 'uc6_postprod_q4_r3e_3g_browser_admin_fresh_selected_persona_source_generation_submission_v1';
const SOURCE_GENERATION_TASK = 'fetchdoc_browser_admin_uc6_fresh_synthetic_scenario_generation';
const RENDER_SUBMISSION_SCHEMA = 'uc6_postprod_q4_r3e_3g_browser_admin_fresh_selected_persona_render_submission_v1';
const RENDER_SUBMISSION_TASK = 'fetchdoc_browser_admin_uc6_render_fresh_synthetic_scenario';
const RUNTIME_BOOTSTRAP_SCHEMA = 'uc6_fresh_published_asset_runtime_bootstrap_projection_v1';
const UC6_TRANSIENT_ACKNOWLEDGEMENT = '요청이 접수되었습니다.';
const UC6_TRANSIENT_PERSONA_BOUND = 'Persona 선택이 완료되었습니다.';
const UC6_TRANSIENT_RUNTIME_READY = '게시된 템플릿 작업이 준비되었습니다.';
const UC6_WORKFLOW_RAIL = Object.freeze([
  ['source', 'Source'], ['analyze', 'Analyze'], ['persona', 'Persona'],
  ['prepare', 'Prepare'], ['generate', 'Generate'], ['review', 'Review']
]);

export function projectUc6WorkflowRail(stage = '') {
  if (['auth', 'workspace', 'library'].includes(stage)) return [];
  const currentIndex = stage === 'publish'
    ? UC6_WORKFLOW_RAIL.length
    : UC6_WORKFLOW_RAIL.findIndex(([key]) => key === stage);
  return UC6_WORKFLOW_RAIL.map(([key, label], position) => ({
    key,
    label,
    state: position < currentIndex ? 'completed' : position === currentIndex ? 'current' : 'future',
    marker: position < currentIndex ? '✓' : String(position + 1)
  }));
}

export function projectUc6PresentationMessage({ message = '', tone = 'neutral', jobState = '', generationState = '' } = {}) {
  const normalized = String(message || '').trim();
  if (!normalized) return null;
  const authoritativeJobState = new Set([
    'onboarding_queued', 'onboarding_running', 'onboarding_ready', 'onboarding_blocked', 'persona_selection_ready',
    'synthetic_scenarios_queued', 'synthetic_scenarios_running', 'synthetic_scenarios_ready',
    'synthetic_scenario_bound', 'synthetic_scenarios_failed', 'render_queued', 'render_running',
    'render_completed', 'failed'
  ]).has(jobState);
  const authoritativeGenerationState = new Set([
    'generation_queued', 'generation_running', 'generation_ready', 'generation_failed'
  ]).has(generationState);
  if (normalized === UC6_TRANSIENT_ACKNOWLEDGEMENT && (authoritativeJobState || authoritativeGenerationState)) return null;
  if (normalized === UC6_TRANSIENT_PERSONA_BOUND && GENERATION_STATES.has(generationState)) return null;
  if (normalized === UC6_TRANSIENT_RUNTIME_READY && authoritativeJobState) return null;
  return { message: normalized, tone: String(tone || 'neutral') };
}

export function projectUc6TemplateDisplayName({ filename = '', mode = '' } = {}) {
  const normalized = String(filename || '').trim();
  if (normalized && !normalized.toLowerCase().includes('reusable_template_asset_')) return normalized;
  return mode === 'published_template_runtime' ? '게시된 템플릿' : '소스 템플릿';
}

function isPlainObject(value) {
  return !!value && typeof value === 'object' && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
}

function safeText(value, maxLength, allowEmpty = false) {
  if (typeof value !== 'string') throw new TypeError('invalid_public_text');
  const text = value.trim();
  if ((!allowEmpty && !text) || text.length > maxLength || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(text)) throw new TypeError('invalid_public_text');
  if (/^(?:\/|~\/|[A-Za-z]:[\\/])/.test(text) || /authorization:\s*bearer|api[_-]?key|password|secret|token/i.test(text)) throw new TypeError('invalid_public_text');
  return text;
}

function version(value) {
  if (typeof value !== 'string' || !BOUNDED_ID_PATTERN.test(value)) throw new TypeError('invalid_contract_version');
  return value;
}

function assertContractFields(value, allowed, required, code) {
  if (!isPlainObject(value)) throw new TypeError(code);
  const keys = Object.keys(value);
  if (keys.some((key) => !allowed.includes(key)) || required.some((key) => !Object.prototype.hasOwnProperty.call(value, key))) {
    throw new TypeError(code);
  }
}

export function normalizeUc6ApiBaseUrl(value, options = {}) {
  let parsed;
  try { parsed = new URL(String(value || '').trim()); } catch (_) { throw new TypeError('invalid_api_base'); }
  if (parsed.username || parsed.password || parsed.search || parsed.hash || (parsed.pathname !== '/' && parsed.pathname !== '')) throw new TypeError('invalid_api_base');
  if (parsed.origin === 'https://api.peter-n8n.duckdns.org') return `${parsed.origin}/`;
  const loopback = LOOPBACK_HOSTS.has(parsed.hostname) || parsed.hostname === '0.0.0.0';
  if (parsed.protocol === 'http:' && loopback && options.allowLoopbackHttp === true) return `${parsed.origin}/`;
  throw new TypeError('invalid_api_base_origin');
}

export function normalizeUc6JobId(value) {
  if (typeof value !== 'string' || !JOB_ID_PATTERN.test(value.trim())) throw new TypeError('invalid_job_id');
  return value.trim();
}

export function projectUc6ReviewDocumentIdentity({ jobId, alias, viewHref } = {}) {
  let normalizedJobId = '';
  try { normalizedJobId = normalizeUc6JobId(jobId); } catch (_) { return ''; }
  if (alias !== 'final_render_output_pdf' || typeof viewHref !== 'string' || !viewHref) return '';
  return JSON.stringify([normalizedJobId, alias, viewHref]);
}

export function synchronizeUc6ReviewPdfViewer(shell, { documentIdentity = '', viewHref = '', emptyText = '' } = {}) {
  if (!shell || typeof shell.querySelector !== 'function' || typeof shell.replaceChildren !== 'function' || !shell.ownerDocument?.createElement) throw new TypeError('uc6_review_pdf_shell_invalid');
  const existing = shell.querySelector('iframe.uc6-pdf-frame');
  if (documentIdentity && viewHref && existing?.isConnected === true
    && shell.dataset.uc6DocumentIdentity === documentIdentity
    && existing.dataset.uc6DocumentIdentity === documentIdentity) {
    return { frame: existing, preserved: true, replaced: false };
  }
  let content;
  let frame = null;
  if (documentIdentity && viewHref) {
    frame = shell.ownerDocument.createElement('iframe');
    frame.className = 'uc6-pdf-frame'; frame.title = 'Generated PDF review';
    frame.dataset.uc6DocumentIdentity = documentIdentity; frame.src = viewHref; content = frame;
  } else {
    content = shell.ownerDocument.createElement('div'); content.className = 'uc6-viewer-empty'; content.textContent = String(emptyText || 'PDF를 준비하고 있습니다.');
  }
  shell.dataset.uc6DocumentIdentity = documentIdentity;
  shell.replaceChildren(content);
  return { frame, preserved: false, replaced: true };
}

export function normalizeUc6ReusableAssetId(value) {
  if (typeof value !== 'string' || !ASSET_ID_PATTERN.test(value.trim())) throw new TypeError('invalid_reusable_asset_id');
  return value.trim();
}

export function parseUc6PublicErrorPayload(payload, status = 0) {
  const code = isPlainObject(payload?.detail) && typeof payload.detail.code === 'string' ? payload.detail.code : 'unknown_public_error';
  const known = Object.prototype.hasOwnProperty.call(UC6_PUBLIC_ERROR_MESSAGES, code);
  return { code: known ? code : 'unknown_public_error', status: Number(status || 0), message: known ? UC6_PUBLIC_ERROR_MESSAGES[code] : UC6_GENERIC_PUBLIC_ERROR_MESSAGE };
}

export async function parseUc6PublicError(response) {
  try { return parseUc6PublicErrorPayload(await response?.json?.(), response?.status); }
  catch (_) { return parseUc6PublicErrorPayload(null, response?.status); }
}

export function classifyUc6AuthorizationFailure(error) {
  const status = Number(error?.status || 0);
  const code = String(error?.code || '');
  if (status === 401 || ['browser_admin_bearer_token_required', 'browser_admin_authorization_header_invalid', 'browser_admin_token_invalid', 'browser_admin_token_expired'].includes(code)) return 'signed_out';
  if (status === 403 || ['browser_admin_role_required', 'browser_admin_email_unverified', 'browser_admin_email_not_allowed'].includes(code)) return 'access_denied';
  return null;
}

export function projectUc6PersistedState(value) {
  const input = isPlainObject(value) ? value : {};
  const output = {};
  try { if (input.job_id) output.job_id = normalizeUc6JobId(input.job_id); } catch (_) {}
  try { if (input.selected_asset_id) output.selected_asset_id = normalizeUc6ReusableAssetId(input.selected_asset_id); } catch (_) {}
  if (input.mode === 'fresh_template' || input.mode === 'published_template_runtime') output.mode = input.mode;
  else if (output.job_id) output.mode = output.selected_asset_id ? 'published_template_runtime' : 'fresh_template';
  if (typeof input.last_known_public_state === 'string' && JOB_STATES.has(input.last_known_public_state)) output.last_known_public_state = input.last_known_public_state;
  if (typeof input.source_pptx_sha256 === 'string' && SHA256_PATTERN.test(input.source_pptx_sha256)) output.source_pptx_sha256 = input.source_pptx_sha256;
  for (const key of ['source_generation_submitted', 'source_generation_ambiguous', 'render_submitted', 'render_ambiguous']) if (typeof input[key] === 'boolean') output[key] = input[key];
  if (input.onboarding_ambiguous === true && output.job_id) output.onboarding_ambiguous = true;
  const personaBindingKey = typeof input.persona_binding_key === 'string' && PERSONA_KEY_PATTERN.test(input.persona_binding_key) ? input.persona_binding_key : '';
  if (input.persona_binding_ambiguous === true && output.job_id && personaBindingKey) Object.assign(output, { persona_binding_ambiguous: true, persona_binding_key: personaBindingKey });
  let bootstrapAssetId = '';
  try { if (input.bootstrap_asset_id) bootstrapAssetId = normalizeUc6ReusableAssetId(input.bootstrap_asset_id); } catch (_) {}
  const bootstrapIdentity = typeof input.bootstrap_identity === 'string' && /^[A-Za-z0-9][A-Za-z0-9._-]{15,159}$/.test(input.bootstrap_identity) && !input.bootstrap_identity.includes('..') ? input.bootstrap_identity : '';
  if (input.bootstrap_ambiguous === true && bootstrapAssetId && bootstrapIdentity) Object.assign(output, { bootstrap_ambiguous: true, bootstrap_asset_id: bootstrapAssetId, bootstrap_identity: bootstrapIdentity });
  const publicationIdentity = typeof input.publication_decision_identity === 'string' && /^[A-Za-z0-9][A-Za-z0-9._-]{15,159}$/.test(input.publication_decision_identity) && !input.publication_decision_identity.includes('..') ? input.publication_decision_identity : '';
  if (publicationIdentity) output.publication_decision_identity = publicationIdentity;
  if (input.publication_ambiguous === true && output.job_id && publicationIdentity) output.publication_ambiguous = true;
  return output;
}

export function projectUc6PersonaBindingMutationControl(input = {}) {
  const attemptedPersonaKey = typeof input.attemptedPersonaKey === 'string' && PERSONA_KEY_PATTERN.test(input.attemptedPersonaKey) ? input.attemptedPersonaKey : '';
  const requestedPersonaKey = typeof input.requestedPersonaKey === 'string' && PERSONA_KEY_PATTERN.test(input.requestedPersonaKey) ? input.requestedPersonaKey : '';
  const authoritativeBoundKey = input.selectionState === 'bound' && isPlainObject(input.boundScenario) && typeof input.boundScenario.scenario_key === 'string' && PERSONA_KEY_PATTERN.test(input.boundScenario.scenario_key) ? input.boundScenario.scenario_key : '';
  const resolved = input.ambiguous === true && !!attemptedPersonaKey && authoritativeBoundKey === attemptedPersonaKey;
  const ambiguityLocked = input.ambiguous === true && !resolved;
  return { attemptedPersonaKey, requestedPersonaKey, authoritativeBoundKey, resolved, ambiguityLocked, canSubmit: !!requestedPersonaKey && !ambiguityLocked };
}

export function projectUc6OnboardingObservationControl(input = {}) {
  const state = typeof input.state === 'string' && JOB_STATES.has(input.state) ? input.state : '';
  const unresolved = input.ambiguous === true && state === 'source_ready';
  const active = ['onboarding_queued', 'onboarding_running'].includes(state);
  const ambiguityCleared = input.ambiguous === true && !!state && state !== 'source_ready';
  return { state, unresolved, active, ambiguityCleared, observationRequired: unresolved || active };
}

export function projectUc6MutationObservationControl(input = {}) {
  const state = typeof input.state === 'string' && JOB_STATES.has(input.state) ? input.state : '';
  const sourceGenerationUnresolved = input.sourceAmbiguous === true && state === 'onboarding_ready';
  const renderUnresolved = input.renderAmbiguous === true && ['synthetic_scenarios_ready', 'synthetic_scenario_bound'].includes(state);
  return { state, sourceGenerationUnresolved, renderUnresolved, observationRequired: sourceGenerationUnresolved || renderUnresolved };
}

export function projectUc6PublicationMutationControl(input = {}) {
  const identityValid = typeof input.decisionIdentity === 'string' && /^[A-Za-z0-9][A-Za-z0-9._-]{15,159}$/.test(input.decisionIdentity) && !input.decisionIdentity.includes('..');
  const published = input.publicationState === 'published';
  const reconciliationRequired = input.ambiguous === true && !published;
  return { published, identityValid, reconciliationRequired, canSubmit: input.reviewed === true && input.publicationState === 'unpublished' && !reconciliationRequired && input.busy !== true };
}

export function projectUc6BootstrapMutationControl(input = {}) {
  let attemptedAssetId = '';
  let requestedAssetId = '';
  try { if (input.attemptedAssetId) attemptedAssetId = normalizeUc6ReusableAssetId(input.attemptedAssetId); } catch (_) {}
  try { if (input.requestedAssetId) requestedAssetId = normalizeUc6ReusableAssetId(input.requestedAssetId); } catch (_) {}
  const bootstrapIdentity = typeof input.bootstrapIdentity === 'string'
    && /^[A-Za-z0-9][A-Za-z0-9._-]{15,159}$/.test(input.bootstrapIdentity)
    && !input.bootstrapIdentity.includes('..')
    ? input.bootstrapIdentity
    : '';
  const ambiguityLocked = input.ambiguous === true && !!attemptedAssetId && !!bootstrapIdentity;
  return {
    ambiguityLocked,
    attemptedAssetId,
    bootstrapIdentity,
    canSubmit: !ambiguityLocked && !!requestedAssetId,
    requestedAssetMatchesAttempt: !!requestedAssetId && requestedAssetId === attemptedAssetId
  };
}

function projectSource(value) {
  if (!isPlainObject(value) || !SHA256_PATTERN.test(value.sha256) || !Number.isSafeInteger(value.size_bytes) || value.size_bytes <= 0 || !Number.isSafeInteger(value.slide_count) || value.slide_count <= 0) throw new TypeError('invalid_job_source');
  const filename = safeText(value.filename, 256);
  if (/[\\/]/.test(filename)) throw new TypeError('invalid_job_source');
  return { sha256: value.sha256, size_bytes: value.size_bytes, slide_count: value.slide_count, filename };
}

export function projectUc6CanonicalJob(payload, options = {}) {
  const expectedJobId = normalizeUc6JobId(options.expectedJobId);
  if (!isPlainObject(payload) || payload.job_id !== expectedJobId || !JOB_STATES.has(payload.state)) throw new TypeError('invalid_job');
  return { job_id: expectedJobId, state: payload.state, source: projectSource(payload.source), control_plane_contract_version: version(payload.control_plane_contract_version), review: isPlainObject(payload.review) ? payload.review : null };
}

export function projectUc6FreshTemplateOnboardingSubmission(payload, options = {}) {
  const expectedJobId = normalizeUc6JobId(options.expectedJobId);
  if (!isPlainObject(payload) || payload.schema_version !== 'uc6_a9_0g2a_r6d2a_browser_admin_fresh_template_onboarding_submission_v1' || payload.job_id !== expectedJobId || payload.task_type !== 'fetchdoc_browser_admin_uc6_fresh_template_onboarding') throw new TypeError('invalid_onboarding_submission');
  if (!Number.isSafeInteger(payload.task_id) || payload.task_id <= 0 || !QUEUE_STATUSES.has(payload.queue_status) || typeof payload.created !== 'boolean' || !ONBOARDING_STATES.has(payload.state) || payload.public_safety !== 'PASS') throw new TypeError('invalid_onboarding_submission');
  return { job_id: expectedJobId, state: payload.state, created: payload.created, queue_status: payload.queue_status, public_safety: 'PASS' };
}

function differentiation(value, depth = 0) {
  if (value === null) return null;
  if (depth > 3) throw new TypeError('invalid_persona_detail');
  if (typeof value === 'string') return safeText(value, 1024);
  if (typeof value === 'boolean' || (typeof value === 'number' && Number.isFinite(value))) return value;
  if (Array.isArray(value) && value.length <= 20) return value.map((entry) => differentiation(entry, depth + 1));
  if (!isPlainObject(value) || Object.keys(value).length > 20) throw new TypeError('invalid_persona_detail');
  const output = {};
  for (const [key, entry] of Object.entries(value)) {
    if (!/^[A-Za-z0-9][A-Za-z0-9_.-]{0,63}$/.test(key) || /path|token|secret|provider|receipt|fingerprint|internal/i.test(key)) throw new TypeError('invalid_persona_detail');
    output[key] = differentiation(entry, depth + 1);
  }
  return output;
}

function projectPersona(value) {
  if (!isPlainObject(value) || Object.keys(value).some((key) => !['scenario_key', 'label', 'scenario_summary', 'differentiation_basis'].includes(key))) throw new TypeError('invalid_persona');
  if (!PERSONA_KEY_PATTERN.test(value.scenario_key) || !Object.prototype.hasOwnProperty.call(value, 'differentiation_basis')) throw new TypeError('invalid_persona');
  return { scenario_key: value.scenario_key, label: safeText(value.label, 256), scenario_summary: safeText(value.scenario_summary, 2048), differentiation_basis: differentiation(value.differentiation_basis) };
}

export function projectUc6FreshSyntheticScenarios(payload, options = {}) {
  const fields = ['schema_version', 'job_id', 'source_pptx_sha256', 'onboarding_state', 'generation_state', 'scenario_options', 'selection_state', 'bound_scenario', 'control_plane_contract_version', 'public_safety'];
  assertContractFields(payload, fields, fields, 'invalid_persona_catalog_fields');
  const expectedJobId = normalizeUc6JobId(options.expectedJobId);
  if (payload.schema_version !== PERSONA_CATALOG_SCHEMA || payload.job_id !== expectedJobId || !SHA256_PATTERN.test(payload.source_pptx_sha256) || (options.expectedSourceSha && payload.source_pptx_sha256 !== options.expectedSourceSha)) throw new TypeError('invalid_persona_catalog');
  if (!PERSONA_CATALOG_ONBOARDING_STATES.has(payload.onboarding_state) || !GENERATION_STATES.has(payload.generation_state) || !['unbound', 'bound'].includes(payload.selection_state) || !Array.isArray(payload.scenario_options) || payload.public_safety !== 'PASS') throw new TypeError('invalid_persona_catalog');
  const personas = payload.scenario_options.map(projectPersona);
  const ready = payload.onboarding_state === 'onboarding_ready';
  if ((ready && (!personas.length || new Set(personas.map((item) => item.scenario_key)).size !== personas.length)) || (!ready && personas.length)) throw new TypeError('invalid_persona_catalog');
  let bound = null;
  if (payload.selection_state === 'bound') {
    bound = projectPersona(payload.bound_scenario);
    if (!personas.some((item) => JSON.stringify(item) === JSON.stringify(bound))) throw new TypeError('invalid_bound_persona');
  } else if (payload.bound_scenario !== null || payload.generation_state !== 'not_started') throw new TypeError('invalid_unbound_persona');
  return { schema_version: PERSONA_CATALOG_SCHEMA, job_id: expectedJobId, source_pptx_sha256: payload.source_pptx_sha256, onboarding_state: payload.onboarding_state, generation_state: payload.generation_state, scenario_options: personas, selection_state: payload.selection_state, bound_scenario: bound, control_plane_contract_version: version(payload.control_plane_contract_version), public_safety: 'PASS' };
}

export function validateUc6SyntheticScenarioBindingCommand(scenarioKey, personas = null) {
  const key = typeof scenarioKey === 'string' ? scenarioKey.trim() : '';
  if (!PERSONA_KEY_PATTERN.test(key)) return { ok: false, code: 'persona_key_invalid', message: 'Persona 선택값을 확인하세요.' };
  if (Array.isArray(personas) && !personas.some((item) => item?.scenario_key === key)) return { ok: false, code: 'persona_not_in_catalog', message: '현재 Persona 목록에 없는 선택입니다.' };
  return { ok: true, body: { scenario_key: key } };
}

export function projectUc6FreshSyntheticScenarioBinding(payload, options = {}) {
  const fields = ['schema_version', 'job_id', 'source_pptx_sha256', 'selection_state', 'bound_scenario', 'disposition', 'public_safety'];
  assertContractFields(payload, fields, fields, 'invalid_persona_binding_fields');
  const expectedJobId = normalizeUc6JobId(options.expectedJobId);
  if (payload.schema_version !== PERSONA_BINDING_SCHEMA || payload.job_id !== expectedJobId || !SHA256_PATTERN.test(payload.source_pptx_sha256) || (options.expectedSourceSha && payload.source_pptx_sha256 !== options.expectedSourceSha) || payload.selection_state !== 'bound' || payload.public_safety !== 'PASS') throw new TypeError('invalid_persona_binding');
  const persona = projectPersona(payload.bound_scenario);
  if (persona.scenario_key !== options.expectedScenarioKey || !['created', 'replayed', 'resolved'].includes(payload.disposition)) throw new TypeError('invalid_persona_binding');
  return { schema_version: PERSONA_BINDING_SCHEMA, job_id: expectedJobId, source_pptx_sha256: payload.source_pptx_sha256, selection_state: 'bound', bound_scenario: persona, disposition: payload.disposition, public_safety: 'PASS' };
}

export function projectUc6FreshSyntheticGenerationSubmission(payload, options = {}) {
  const allowed = ['schema_version', 'job_id', 'task_type', 'task_id', 'queue_status', 'created', 'state', 'control_plane_contract_version', 'public_safety', 'source_pptx_sha256', 'bound_scenario', 'network_call_count', 'replayed', 'provider_attempt_count'];
  const required = ['schema_version', 'job_id', 'task_type', 'task_id', 'queue_status', 'created', 'state', 'control_plane_contract_version', 'public_safety', 'bound_scenario'];
  assertContractFields(payload, allowed, required, 'invalid_source_generation_submission_fields');
  const expectedJobId = normalizeUc6JobId(options.expectedJobId);
  if (payload.schema_version !== SOURCE_GENERATION_SCHEMA || payload.task_type !== SOURCE_GENERATION_TASK || payload.job_id !== expectedJobId || !['synthetic_scenarios_queued', 'synthetic_scenarios_running', 'synthetic_scenarios_ready', 'synthetic_scenarios_failed'].includes(payload.state) || typeof payload.created !== 'boolean' || payload.public_safety !== 'PASS') throw new TypeError('invalid_source_generation_submission');
  const readyReplay = payload.state === 'synthetic_scenarios_ready';
  if (readyReplay) {
    if (payload.queue_status !== 'ready' || payload.task_id !== null || payload.created !== false) throw new TypeError('invalid_source_generation_ready_replay');
    if (!SHA256_PATTERN.test(payload.source_pptx_sha256) || payload.network_call_count !== 0 || payload.replayed !== true || payload.provider_attempt_count !== 1) throw new TypeError('invalid_source_generation_ready_replay');
  } else {
    const expectedQueues = { synthetic_scenarios_queued: ['pending'], synthetic_scenarios_running: ['processing'], synthetic_scenarios_failed: ['failed', 'done'] }[payload.state];
    if (!expectedQueues?.includes(payload.queue_status) || !Number.isSafeInteger(payload.task_id) || payload.task_id <= 0) throw new TypeError('invalid_source_generation_queue');
  }
  if (payload.source_pptx_sha256 !== undefined && (!SHA256_PATTERN.test(payload.source_pptx_sha256) || (options.expectedSourceSha && payload.source_pptx_sha256 !== options.expectedSourceSha))) throw new TypeError('invalid_source_generation_source');
  const boundScenario = projectPersona(payload.bound_scenario);
  if (options.expectedScenarioKey && boundScenario.scenario_key !== options.expectedScenarioKey) throw new TypeError('source_generation_persona_mismatch');
  if (payload.network_call_count !== undefined && (!Number.isSafeInteger(payload.network_call_count) || payload.network_call_count < 0)) throw new TypeError('invalid_source_generation_network_count');
  if (payload.provider_attempt_count !== undefined && (!Number.isSafeInteger(payload.provider_attempt_count) || payload.provider_attempt_count < 0)) throw new TypeError('invalid_source_generation_attempt_count');
  if (payload.replayed !== undefined && typeof payload.replayed !== 'boolean') throw new TypeError('invalid_source_generation_replayed');
  return {
    schema_version: SOURCE_GENERATION_SCHEMA, job_id: expectedJobId, task_type: SOURCE_GENERATION_TASK,
    task_id: payload.task_id, queue_status: payload.queue_status, created: payload.created, state: payload.state,
    bound_scenario: boundScenario, control_plane_contract_version: version(payload.control_plane_contract_version), public_safety: 'PASS',
    ...(payload.source_pptx_sha256 !== undefined ? { source_pptx_sha256: payload.source_pptx_sha256 } : {}),
    ...(payload.network_call_count !== undefined ? { network_call_count: payload.network_call_count } : {}),
    ...(payload.provider_attempt_count !== undefined ? { provider_attempt_count: payload.provider_attempt_count } : {}),
    ...(payload.replayed !== undefined ? { replayed: payload.replayed } : {})
  };
}

export function projectUc6FreshSyntheticRenderSubmission(payload, options = {}) {
  const fields = ['schema_version', 'job_id', 'task_type', 'task_id', 'queue_status', 'created', 'state', 'bound_scenario', 'control_plane_contract_version', 'public_safety'];
  assertContractFields(payload, fields, fields, 'invalid_render_submission_fields');
  const expectedJobId = normalizeUc6JobId(options.expectedJobId);
  const queuesByState = { render_queued: ['pending'], render_running: ['processing'], render_completed: ['done'], failed: ['failed', 'done'] };
  if (payload.schema_version !== RENDER_SUBMISSION_SCHEMA || payload.task_type !== RENDER_SUBMISSION_TASK || payload.job_id !== expectedJobId || !queuesByState[payload.state]?.includes(payload.queue_status) || typeof payload.created !== 'boolean' || payload.public_safety !== 'PASS') throw new TypeError('invalid_render_submission');
  if (payload.state === 'render_completed') {
    if (payload.task_id !== null || payload.created !== false) throw new TypeError('invalid_render_completed_replay');
  } else if (!Number.isSafeInteger(payload.task_id) || payload.task_id <= 0) throw new TypeError('invalid_render_task');
  const boundScenario = projectPersona(payload.bound_scenario);
  if (options.expectedScenarioKey && boundScenario.scenario_key !== options.expectedScenarioKey) throw new TypeError('render_persona_mismatch');
  return { schema_version: RENDER_SUBMISSION_SCHEMA, job_id: expectedJobId, task_type: RENDER_SUBMISSION_TASK, task_id: payload.task_id, queue_status: payload.queue_status, created: payload.created, state: payload.state, bound_scenario: boundScenario, control_plane_contract_version: version(payload.control_plane_contract_version), public_safety: 'PASS' };
}

export function validateUc6ReusableAssetBootstrapCommand(command) {
  const identity = String(command?.bootstrap_identity || '').trim();
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{15,159}$/.test(identity) || identity.includes('..')) return { ok: false, code: 'bootstrap_identity_invalid', message: '런타임 작업 식별자를 다시 생성하세요.' };
  return { ok: true, body: { bootstrap_identity: identity } };
}

export function projectUc6ReusableAssetRuntimeBootstrap(payload, options = {}) {
  const fields = ['schema_version', 'job_id', 'state', 'source_pptx_sha256', 'asset', 'disposition', 'control_plane_contract_version', 'public_safety'];
  assertContractFields(payload, fields, fields, 'invalid_runtime_bootstrap_fields');
  const assetId = normalizeUc6ReusableAssetId(options.expectedAssetId);
  if (payload.schema_version !== RUNTIME_BOOTSTRAP_SCHEMA || payload.state !== 'persona_selection_ready' || !SHA256_PATTERN.test(payload.source_pptx_sha256) || !['created', 'replayed', 'resolved'].includes(payload.disposition) || payload.public_safety !== 'PASS') throw new TypeError('invalid_runtime_bootstrap');
  const assetFields = ['asset_id', 'source_pptx_sha256', 'generation_unit_count', 'slot_count', 'slide_count'];
  assertContractFields(payload.asset, assetFields, assetFields, 'invalid_runtime_bootstrap_asset_fields');
  if (normalizeUc6ReusableAssetId(payload.asset.asset_id) !== assetId || payload.asset.source_pptx_sha256 !== payload.source_pptx_sha256) throw new TypeError('runtime_asset_mismatch');
  for (const key of ['generation_unit_count', 'slot_count', 'slide_count']) if (!Number.isSafeInteger(payload.asset[key]) || payload.asset[key] <= 0) throw new TypeError('invalid_runtime_bootstrap_asset_count');
  return { schema_version: RUNTIME_BOOTSTRAP_SCHEMA, job_id: normalizeUc6JobId(payload.job_id), state: payload.state, source_pptx_sha256: payload.source_pptx_sha256, asset: { asset_id: assetId, source_pptx_sha256: payload.asset.source_pptx_sha256, generation_unit_count: payload.asset.generation_unit_count, slot_count: payload.asset.slot_count, slide_count: payload.asset.slide_count }, disposition: payload.disposition, control_plane_contract_version: version(payload.control_plane_contract_version), public_safety: 'PASS' };
}

function projectAsset(row) {
  if (!isPlainObject(row)) throw new TypeError('invalid_template');
  const assetId = normalizeUc6ReusableAssetId(row.asset_id);
  if (row.status !== 'published' || row.review_state !== 'approved_for_reuse' || row.publication_state !== 'published' || !SHA256_PATTERN.test(row.source_pptx_sha256)) throw new TypeError('invalid_template');
  for (const key of ['generation_unit_count', 'slot_count', 'slide_count']) if (!Number.isSafeInteger(row[key]) || row[key] <= 0) throw new TypeError('invalid_template');
  const approvedAt = safeText(row.approved_at, 64);
  if (!Number.isFinite(Date.parse(approvedAt))) throw new TypeError('invalid_template');
  return { asset_id: assetId, status: row.status, review_state: row.review_state, publication_state: row.publication_state, source_pptx_sha256: row.source_pptx_sha256, generation_unit_count: row.generation_unit_count, slot_count: row.slot_count, slide_count: row.slide_count, approved_at: approvedAt };
}

export function projectUc6ReusableAssetCatalog(payload) {
  if (!isPlainObject(payload) || payload.schema_version !== 'uc6_e2e4c2c_a8g_browser_admin_reusable_asset_catalog_v1' || payload.public_safety !== 'PASS' || !Array.isArray(payload.assets) || payload.asset_count !== payload.assets.length) throw new TypeError('invalid_template_catalog');
  const assets = payload.assets.map(projectAsset);
  if (new Set(assets.map((asset) => asset.asset_id)).size !== assets.length) throw new TypeError('duplicate_template');
  return { asset_count: assets.length, assets, control_plane_contract_version: version(payload.control_plane_contract_version), public_safety: 'PASS' };
}

function capabilityAction(action, ready, baseUrl) {
  if (!isPlainObject(action) || typeof action.available !== 'boolean') throw new TypeError('invalid_capability');
  if (!action.available) {
    if (action.href !== null) throw new TypeError('invalid_capability');
    return { available: false, href: null };
  }
  if (!ready || typeof action.href !== 'string' || !action.href.startsWith('/') || action.href.startsWith('//')) throw new TypeError('invalid_capability');
  const resolved = new URL(action.href, baseUrl);
  if (resolved.origin !== new URL(baseUrl).origin || resolved.username || resolved.password || resolved.hash) throw new TypeError('invalid_capability');
  return { available: true, href: resolved.toString() };
}

export function projectUc6FinalDeliveryCapabilities(payload, options = {}) {
  if (!isPlainObject(payload) || payload.job_id !== normalizeUc6JobId(options.expectedJobId) || !Array.isArray(payload.artifacts) || payload.artifacts.length !== 2) throw new TypeError('invalid_artifact_capabilities');
  const baseUrl = normalizeUc6ApiBaseUrl(options.apiBaseUrl || UC6_PRODUCTION_API_BASE, { allowLoopbackHttp: options.allowLoopbackHttp === true });
  const expected = [['final_render_output_pdf', 'PDF', 'application/pdf'], ['final_render_output_pptx', 'PowerPoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation']];
  const artifacts = payload.artifacts.map((artifact, index) => {
    const [alias, label, mediaType] = expected[index];
    if (!isPlainObject(artifact) || artifact.alias !== alias || artifact.media_type !== mediaType || typeof artifact.ready !== 'boolean' || !isPlainObject(artifact.capabilities)) throw new TypeError('invalid_artifact');
    const filename = safeText(artifact.suggested_filename, 128);
    if (/[\\/]/.test(filename) || filename.includes('..')) throw new TypeError('invalid_artifact');
    const download = capabilityAction(artifact.capabilities.download, artifact.ready, baseUrl);
    const view = capabilityAction(artifact.capabilities.view, artifact.ready, baseUrl);
    if (alias.endsWith('pptx') && view.available) throw new TypeError('invalid_artifact');
    return { alias, label, ready: artifact.ready, suggestedFilename: filename, actions: { download, view } };
  });
  return { artifacts, readyCount: artifacts.filter((artifact) => artifact.ready).length, totalCount: artifacts.length };
}

function projectPublishedAsset(value) {
  if (!isPlainObject(value) || value.decision !== PUBLICATION_DECISION || !SHA256_PATTERN.test(value.reviewed_final_pptx_sha256) || !SHA256_PATTERN.test(value.reviewed_final_pdf_sha256)) throw new TypeError('invalid_publication_asset');
  return { asset_id: normalizeUc6ReusableAssetId(value.asset_id), approved_at: safeText(value.approved_at, 64), reviewed_final_pptx_sha256: value.reviewed_final_pptx_sha256, reviewed_final_pdf_sha256: value.reviewed_final_pdf_sha256 };
}

export function projectUc6FreshReusableAssetPublication(payload, options = {}) {
  if (!isPlainObject(payload) || payload.schema_version !== 'uc6_a9_0g2a_r6f_a_fresh_reusable_asset_publication_projection_v1' || payload.job_id !== normalizeUc6JobId(options.expectedJobId) || payload.public_safety !== 'PASS' || payload.render_state !== 'render_completed') throw new TypeError('invalid_publication');
  if (payload.publication_state === 'unpublished') {
    if (payload.review_state !== 'review_pending' || payload.publication_requires_manual_admin_action !== true || payload.published_asset !== null || !SHA256_PATTERN.test(payload.reviewed_final_pptx_sha256) || !SHA256_PATTERN.test(payload.reviewed_final_pdf_sha256)) throw new TypeError('invalid_publication');
    return { state: 'unpublished', review_state: payload.review_state, publication_requires_manual_admin_action: true, reviewed_final_pptx_sha256: payload.reviewed_final_pptx_sha256, reviewed_final_pdf_sha256: payload.reviewed_final_pdf_sha256, published_asset: null };
  }
  if (payload.publication_state !== 'published' || payload.review_state !== 'approved_for_reuse' || payload.publication_requires_manual_admin_action !== false) throw new TypeError('invalid_publication');
  return { state: 'published', review_state: payload.review_state, publication_requires_manual_admin_action: false, published_asset: projectPublishedAsset(payload.published_asset), idempotent_replay: typeof payload.idempotent_replay === 'boolean' ? payload.idempotent_replay : null };
}

export function validateUc6ReusableAssetPublicationCommand(command) {
  const identity = String(command?.decision_identity || '').trim();
  const note = command?.administrator_note == null || String(command.administrator_note).trim() === '' ? null : String(command.administrator_note).replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
  if (command?.decision !== PUBLICATION_DECISION) return { ok: false, code: 'publication_decision_invalid', message: '템플릿 게시 결정을 확인하세요.' };
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{15,159}$/.test(identity) || identity.includes('..')) return { ok: false, code: 'publication_identity_invalid', message: '게시 식별자를 다시 생성하세요.' };
  if (!SHA256_PATTERN.test(command?.reviewed_final_pptx_sha256) || !SHA256_PATTERN.test(command?.reviewed_final_pdf_sha256)) return { ok: false, code: 'publication_sha_invalid', message: '검토한 산출물 정보를 확인하세요.' };
  if (note && (note.length > 1000 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(note) || /authorization:\s*bearer|api[_-]?key|password|secret/i.test(note))) return { ok: false, code: 'publication_note_invalid', message: '관리자 노트는 1,000자 이하의 공개 가능한 텍스트여야 합니다.' };
  return { ok: true, body: { decision: PUBLICATION_DECISION, decision_identity: identity, reviewed_final_pptx_sha256: command.reviewed_final_pptx_sha256, reviewed_final_pdf_sha256: command.reviewed_final_pdf_sha256, administrator_note: note } };
}

export function parseUc6JobEventFrame(frame) {
  const normalized = String(frame ?? '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  if (!normalized.trim() || normalized.trimStart().startsWith(':')) return null;
  const lines = normalized.split('\n').filter((line) => line.startsWith('data:')).map((line) => line.slice(5).replace(/^ /, ''));
  if (!lines.length) return null;
  let payload;
  try { payload = JSON.parse(lines.join('\n')); } catch (_) { throw new TypeError('uc6_job_event_invalid_json'); }
  if (!isPlainObject(payload) || payload.schema_version !== 'fetchdoc_job_event_v1' || !['snapshot', 'state_change'].includes(payload.event_kind)) throw new TypeError('uc6_job_event_invalid');
  const jobId = normalizeUc6JobId(payload.job_id);
  if (!Number.isSafeInteger(payload.sequence) || payload.sequence < 0 || !String(payload.stage || '').trim() || !String(payload.status || '').trim()) throw new TypeError('uc6_job_event_invalid');
  const count = (value) => value == null ? null : Number.isSafeInteger(value) && value >= 0 ? value : (() => { throw new TypeError('uc6_job_event_invalid'); })();
  const completed = count(payload.completed_units);
  const total = count(payload.total_units);
  if (completed != null && total != null && completed > total) throw new TypeError('uc6_job_event_invalid');
  return { job_id: jobId, sequence: payload.sequence, event_kind: payload.event_kind, stage: payload.stage.trim(), status: payload.status.trim(), completed_units: completed, total_units: total };
}

function publicError(value) {
  const error = new Error(value.message || UC6_GENERIC_PUBLIC_ERROR_MESSAGE);
  Object.assign(error, { name: 'Uc6PublicError', code: value.code || 'unknown_public_error', status: Number(value.status || 0), publicMessage: value.message || UC6_GENERIC_PUBLIC_ERROR_MESSAGE });
  return error;
}

async function json(response) {
  try { const value = await response.json(); return isPlainObject(value) ? value : {}; } catch (_) { return {}; }
}

export function createUc6BrowserAdminApi({ apiBaseUrl, fetchImpl, getIdToken, allowLoopbackHttp = false } = {}) {
  if (typeof fetchImpl !== 'function' || typeof getIdToken !== 'function') throw new TypeError('uc6_api_dependencies_required');
  const baseUrl = normalizeUc6ApiBaseUrl(apiBaseUrl || UC6_PRODUCTION_API_BASE, { allowLoopbackHttp });
  const resolve = (path) => new URL(path.replace(/^\//, ''), baseUrl).toString();

  async function init(options, refresh) {
    const token = await getIdToken(refresh === true);
    if (typeof token !== 'string' || !token.trim()) throw publicError(parseUc6PublicErrorPayload({ detail: { code: 'browser_admin_bearer_token_required' } }, 401));
    const headers = { Accept: options.accept || 'application/json', 'Cache-Control': 'no-cache, no-store, must-revalidate', Pragma: 'no-cache', Authorization: `Bearer ${token}` };
    if (options.bodyJson !== undefined) headers['Content-Type'] = 'application/json';
    return { method: options.method || 'GET', headers, cache: 'no-store', credentials: 'omit', signal: options.signal, body: options.bodyJson !== undefined ? JSON.stringify(options.bodyJson) : options.body };
  }

  async function request(path, options = {}) {
    let response = await fetchImpl(resolve(path), await init(options, false));
    if (response?.status === 401) response = await fetchImpl(resolve(path), await init(options, true));
    if (!response?.ok) throw publicError(await parseUc6PublicError(response));
    return json(response);
  }

  async function mutate(path, options = {}) {
    let response;
    try { response = await fetchImpl(resolve(path), await init({ ...options, method: 'POST' }, true)); }
    catch (cause) {
      if (cause?.name === 'AbortError') throw cause;
      throw Object.assign(new Error('ambiguous_submission'), { name: 'Uc6AmbiguousSubmissionError', code: 'ambiguous_submission', publicMessage: '요청 결과를 확인하고 있습니다.' });
    }
    if (!response?.ok) throw publicError(await parseUc6PublicError(response));
    return json(response);
  }

  async function stream(jobId, options = {}) {
    const path = UC6_BROWSER_ADMIN_ENDPOINTS.jobEvents(jobId);
    const streamOptions = { method: 'GET', signal: options.signal, accept: 'text/event-stream' };
    let response = await fetchImpl(resolve(path), await init(streamOptions, false));
    if (response?.status === 401) response = await fetchImpl(resolve(path), await init(streamOptions, true));
    if (!response?.ok) throw publicError(await parseUc6PublicError(response));
    if (!String(response.headers?.get?.('content-type') || '').toLowerCase().startsWith('text/event-stream') || !response.body?.getReader) throw new TypeError('job_event_stream_unavailable');
    return response;
  }

  return {
    getSession: (options = {}) => request(UC6_BROWSER_ADMIN_ENDPOINTS.session, { method: 'GET', signal: options.signal }),
    createJob(file, options = {}) {
      const form = new FormData();
      file && typeof file.name === 'string' ? form.append('file', file, file.name) : form.append('file', file);
      return request(UC6_BROWSER_ADMIN_ENDPOINTS.jobs, { method: 'POST', body: form, signal: options.signal });
    },
    getJob: (jobId, options = {}) => request(UC6_BROWSER_ADMIN_ENDPOINTS.job(jobId), { method: 'GET', signal: options.signal }),
    submitFreshTemplateOnboarding: (jobId, options = {}) => mutate(UC6_BROWSER_ADMIN_ENDPOINTS.onboarding(jobId), { signal: options.signal }),
    openJobEvents: (jobId, options = {}) => stream(jobId, options),
    getFreshSyntheticScenarios: (jobId, options = {}) => request(UC6_BROWSER_ADMIN_ENDPOINTS.syntheticScenarios(jobId), { method: 'GET', signal: options.signal }),
    bindFreshSyntheticScenario(jobId, scenarioKey, options = {}) {
      const command = validateUc6SyntheticScenarioBindingCommand(scenarioKey, options.personas);
      if (!command.ok) throw Object.assign(new Error(command.message), { code: command.code, publicMessage: command.message });
      return mutate(UC6_BROWSER_ADMIN_ENDPOINTS.syntheticScenarioBinding(jobId), { bodyJson: command.body, signal: options.signal });
    },
    submitFreshSyntheticScenarios: (jobId, options = {}) => mutate(UC6_BROWSER_ADMIN_ENDPOINTS.syntheticScenarios(jobId), { signal: options.signal }),
    submitFreshSyntheticScenarioRender: (jobId, options = {}) => mutate(UC6_BROWSER_ADMIN_ENDPOINTS.syntheticScenarioRender(jobId), { signal: options.signal }),
    getRenderArtifactCapabilities: (jobId, options = {}) => request(UC6_BROWSER_ADMIN_ENDPOINTS.renderArtifactCapabilities(jobId), { method: 'GET', signal: options.signal }),
    getReusableAssetPublication: (jobId, options = {}) => request(UC6_BROWSER_ADMIN_ENDPOINTS.reusableAssetPublication(jobId), { method: 'GET', signal: options.signal }),
    submitReusableAssetPublication(jobId, command, options = {}) {
      const validated = validateUc6ReusableAssetPublicationCommand(command);
      if (!validated.ok) throw Object.assign(new Error(validated.message), { code: validated.code, publicMessage: validated.message });
      return mutate(UC6_BROWSER_ADMIN_ENDPOINTS.reusableAssetPublication(jobId), { bodyJson: validated.body, signal: options.signal });
    },
    getReusableAssets: (options = {}) => request(UC6_BROWSER_ADMIN_ENDPOINTS.reusableAssets, { method: 'GET', signal: options.signal }),
    bootstrapReusableAssetRuntimeJob(assetId, command, options = {}) {
      const validated = validateUc6ReusableAssetBootstrapCommand(command);
      if (!validated.ok) throw Object.assign(new Error(validated.message), { code: validated.code, publicMessage: validated.message });
      return mutate(UC6_BROWSER_ADMIN_ENDPOINTS.reusableAssetJobs(assetId), { bodyJson: validated.body, signal: options.signal });
    }
  };
}

export function initUc6Studio({ section, apiBaseUrl = UC6_PRODUCTION_API_BASE } = {}) {
  if (!(section instanceof Element)) return;
  const $ = (id) => section.querySelector(`#${id}`);
  const els = {
    authChip: $('uc6-authStateChip'), authText: $('uc6-authStatus'), signIn: $('uc6-signInBtn'),
    signOut: $('uc6-signOutBtn'), refreshSession: $('uc6-refreshSessionBtn'), rail: $('uc6-stepper'),
    root: $('uc6-activeStageRoot'), live: $('uc6-liveStatus')
  };
  const STORAGE_KEY = 'fetchdoc.uc6.canonical_workspace.v2';
  const PREVIOUS_STORAGE_KEY = 'fetchdoc.uc6.browser_admin_control_plane.v1';
  const FIREBASE_VERSION = '10.14.1';
  const RECONNECT_MS = [1000, 2000, 5000];
  const ACTIVE_STATES = new Set(['onboarding_queued', 'onboarding_running', 'synthetic_scenarios_queued', 'synthetic_scenarios_running', 'render_queued', 'render_running', 'render_unknown']);
  const AUTH_COPY = {
    initializing: ['초기화 중', '관리자 세션을 준비하고 있습니다.'],
    signed_out: ['로그인 필요', 'Google 계정으로 로그인한 뒤 FetchDoc 관리자 권한을 확인하세요.'],
    authenticating: ['로그인 중', 'Google 로그인을 진행하고 있습니다.'],
    authorizing: ['권한 확인 중', 'FetchDoc 관리자 권한을 확인하고 있습니다.'],
    authorized: ['관리자 연결됨', '승인된 FetchDoc 관리자'],
    access_denied: ['접근 거부', 'FetchDoc 관리자 권한이 확인되지 않았습니다.'],
    temporarily_unavailable: ['연결 확인 필요', '관리자 세션을 확인할 수 없습니다. 잠시 후 다시 시도하세요.']
  };
  const state = {
    auth: 'initializing', firebase: null, user: null, api: null, mode: '', jobId: '', jobState: '',
    source: null, selectedFile: null, selectedAssetId: '', catalog: null, catalogStatus: 'idle',
    bootstrapIdentity: '', bootstrapAssetId: '', bootstrapAmbiguous: false,
    onboardingAmbiguous: false, personas: null, selectedPersonaKey: '', personaBindingAmbiguous: false, personaBindingKey: '', sourceSubmitted: false,
    sourceAmbiguous: false, renderSubmitted: false, renderAmbiguous: false, artifacts: null,
    artifactStatus: 'idle', publication: null, publicationStatus: 'idle', publicationIdentity: '', publicationAmbiguous: false,
    note: '', reviewed: false, showPublish: false, busy: false, reconciling: false, message: '', tone: 'neutral',
    eventController: null, eventEpoch: 0, eventSequence: -1, reconnectAttempt: 0, timer: null
  };

  function el(tag, className = '', text = '') {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== '') node.textContent = String(text);
    return node;
  }

  function button(id, label, primary = false, disabled = false) {
    const node = el('button', primary ? 'btn btn-primary' : 'btn btn-outline', label);
    node.type = 'button'; node.id = id; node.disabled = disabled;
    return node;
  }

  function newWorkspaceButton() {
    const node = button('uc6-newWorkspaceBtn', '새 작업 시작', false, state.busy || state.reconciling);
    node.classList.add('uc6-escape-action');
    return node;
  }

  function setMessage(message = '', tone = 'neutral') {
    state.message = String(message); state.tone = tone;
    if (els.live) els.live.textContent = state.message;
  }

  function errorMessage(error) {
    return error?.publicMessage || (error?.name === 'AbortError' ? '요청이 취소되었습니다.' : UC6_GENERIC_PUBLIC_ERROR_MESSAGE);
  }

  function identity(prefix) {
    const value = globalThis.crypto?.randomUUID?.().replace(/-/g, '') || `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
    return `${prefix}_${value}`.slice(0, 150);
  }

  function shortId(value) {
    const text = String(value || '');
    return text.length > 24 ? `${text.slice(0, 12)}…${text.slice(-8)}` : text;
  }

  function bytes(value) {
    const number = Number(value || 0);
    if (number <= 0) return '';
    return number < 1048576 ? `${Math.max(1, Math.round(number / 1024))} KB` : `${(number / 1048576).toFixed(1)} MB`;
  }

  function validateSession(value) {
    const principal = value?.principal || {};
    return value?.status === 'authorized' && principal.authenticated === true && principal.authorized === true
      && principal.email_verified === true && principal.admin_claim === 'fetchdoc_admin';
  }

  function validatePptx(files) {
    if (!files || files.length !== 1) return { ok: false, message: 'PPTX 파일을 하나만 선택하세요.' };
    const file = files[0];
    if (!file || file.size <= 0 || !/\.pptx$/i.test(file.name || '')) return { ok: false, message: '비어 있지 않은 PPTX 파일을 선택하세요.' };
    const mime = String(file.type || '');
    if (mime && mime !== 'application/vnd.openxmlformats-officedocument.presentationml.presentation') return { ok: false, message: 'PPTX 형식의 파일만 업로드할 수 있습니다.' };
    return { ok: true, file };
  }

  function save() {
    const projected = projectUc6PersistedState({
      mode: state.mode, job_id: state.jobId, selected_asset_id: state.selectedAssetId,
      last_known_public_state: state.jobState, source_pptx_sha256: state.source?.sha256,
      onboarding_ambiguous: state.onboardingAmbiguous,
      persona_binding_ambiguous: state.personaBindingAmbiguous, persona_binding_key: state.personaBindingKey,
      source_generation_submitted: state.sourceSubmitted, source_generation_ambiguous: state.sourceAmbiguous,
      render_submitted: state.renderSubmitted, render_ambiguous: state.renderAmbiguous,
      bootstrap_identity: state.bootstrapIdentity, bootstrap_asset_id: state.bootstrapAssetId,
      bootstrap_ambiguous: state.bootstrapAmbiguous, publication_decision_identity: state.publicationIdentity,
      publication_ambiguous: state.publicationAmbiguous
    });
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(projected)); } catch (_) {}
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(PREVIOUS_STORAGE_KEY) || '{}';
      return projectUc6PersistedState(JSON.parse(raw));
    }
    catch (_) { return {}; }
  }

  function stopObservation() {
    state.eventEpoch += 1; state.eventController?.abort(); state.eventController = null;
    clearTimeout(state.timer); state.timer = null;
  }

  function reset() {
    stopObservation();
    Object.assign(state, {
      mode: '', jobId: '', jobState: '', source: null, selectedFile: null, selectedAssetId: '',
      catalog: null, catalogStatus: 'idle', bootstrapIdentity: '', bootstrapAssetId: '', bootstrapAmbiguous: false,
      onboardingAmbiguous: false, personas: null, selectedPersonaKey: '', personaBindingAmbiguous: false, personaBindingKey: '',
      sourceSubmitted: false, sourceAmbiguous: false, renderSubmitted: false, renderAmbiguous: false,
      artifacts: null, artifactStatus: 'idle', publication: null, publicationStatus: 'idle',
      publicationIdentity: '', publicationAmbiguous: false, note: '', reviewed: false, showPublish: false, busy: false, message: '', tone: 'neutral',
      eventSequence: -1, reconnectAttempt: 0
    });
    try { localStorage.removeItem(STORAGE_KEY); localStorage.removeItem(PREVIOUS_STORAGE_KEY); } catch (_) {}
    render();
  }

  function currentStage() {
    if (state.auth !== 'authorized') return 'auth';
    if (!state.mode) return 'workspace';
    if (state.mode === 'fresh_template' && !state.jobId) return 'source';
    if (state.mode === 'published_template_runtime' && !state.jobId) return 'library';
    if (state.showPublish || state.publication?.state === 'published') return 'publish';
    if (['onboarding_queued', 'onboarding_running', 'onboarding_blocked'].includes(state.jobState) || !state.personas) return 'analyze';
    if (state.personas.selection_state !== 'bound') return 'persona';
    if (['not_started', 'generation_queued', 'generation_running', 'generation_failed'].includes(state.personas.generation_state)) return 'prepare';
    if (['render_queued', 'render_running', 'render_unknown'].includes(state.jobState)) return 'generate';
    if (state.jobState === 'render_completed') return 'review';
    return state.personas.generation_state === 'generation_ready' ? 'generate' : 'analyze';
  }

  function surface(title, copy, className = '') {
    const node = el('section', `uc6-stage-surface ${className}`.trim());
    const head = el('div', 'uc6-stage-heading'); head.append(el('h2', '', title), el('p', '', copy));
    node.append(head); return node;
  }

  function status() {
    const projected = projectUc6PresentationMessage({
      message: state.message,
      tone: state.tone,
      jobState: state.jobState,
      generationState: state.personas?.generation_state
    });
    return projected ? el('p', `uc6-transient-message is-${projected.tone}`, projected.message) : null;
  }

  function actions(...nodes) {
    const row = el('div', 'uc6-action-row'); row.append(...nodes); return row;
  }

  function staticState(title, copy, tone = 'neutral') {
    const panel = el('div', `uc6-state-panel is-${tone}`);
    panel.append(el('strong', '', title), el('p', '', copy));
    return panel;
  }

  function process(title, copy) {
    const panel = el('div', 'uc6-process-panel');
    const mark = el('span', 'uc6-process-mark'); mark.setAttribute('aria-hidden', 'true');
    panel.append(mark, el('h3', '', title), el('p', '', copy));
    const bar = el('div', 'uc6-progress is-indeterminate'); bar.setAttribute('role', 'progressbar'); bar.setAttribute('aria-label', '진행 중'); bar.append(el('span')); panel.append(bar);
    return panel;
  }

  function sourceRow() {
    if (!state.source) return null;
    const row = el('div', 'uc6-source-identity'); const copy = el('div');
    copy.append(el('strong', '', state.source.filename), el('span', '', [`${state.source.slide_count} slides`, bytes(state.source.size_bytes)].filter(Boolean).join(' · ')));
    row.append(el('span', 'uc6-document-glyph', 'PPTX'), copy); return row;
  }

  function renderRail() {
    const stage = currentStage();
    const visible = !!state.jobId && !['auth', 'workspace', 'library'].includes(stage);
    els.rail.hidden = !visible; if (!visible) return els.rail.replaceChildren();
    const list = el('ol');
    projectUc6WorkflowRail(stage).forEach((step) => {
      const item = el('li'); item.dataset.state = step.state;
      item.append(el('span', '', step.marker), el('strong', '', step.label)); list.append(item);
    });
    els.rail.replaceChildren(list);
  }

  function renderWorkspace() {
    const node = surface('문서 작업을 시작하세요', '새 템플릿을 만들거나 검증된 게시 템플릿으로 문서를 생성합니다.', 'uc6-workspace-start');
    const grid = el('div', 'uc6-entry-grid');
    const card = (id, icon, title, copy) => {
      const item = el('button', 'uc6-entry-card'); item.type = 'button'; item.id = id;
      item.append(el('span', 'uc6-entry-icon', icon), el('h3', '', title), el('p', '', copy)); return item;
    };
    grid.append(card('uc6-startFreshBtn', '＋', '새 템플릿 만들기', '완성된 PPTX를 분석하고 검증하여 재사용 가능한 템플릿으로 등록'), card('uc6-openLibraryBtn', '▤', '게시된 템플릿으로 문서 생성', '검증된 템플릿을 선택하여 새로운 문서를 생성'));
    node.append(grid); return node;
  }

  function renderSource() {
    const node = surface('PPTX Source', '분석할 완성된 PowerPoint 문서를 하나 선택하세요.', 'uc6-intake-stage');
    const upload = el('div', 'uc6-upload-object'); const input = el('input');
    input.type = 'file'; input.id = 'uc6-pptxFileInput'; input.accept = '.pptx,application/vnd.openxmlformats-officedocument.presentationml.presentation'; input.disabled = state.busy;
    const label = el('label', 'uc6-upload-label'); label.htmlFor = input.id;
    label.append(el('span', 'uc6-document-glyph', 'PPTX'), el('strong', '', 'PPTX 파일 선택'), el('span', '', '파일을 선택하여 템플릿 분석을 시작합니다.'));
    upload.append(input, label);
    if (state.selectedFile) { const row = el('div', 'uc6-selected-document'); row.append(el('strong', '', state.selectedFile.name), el('span', '', bytes(state.selectedFile.size))); upload.append(row); }
    node.append(upload); if (status()) node.append(status());
    node.append(actions(button('uc6-backWorkspaceBtn', '돌아가기'), button('uc6-analyzeBtn', state.busy ? '업로드 중…' : '분석 시작', true, !state.selectedFile || state.busy)));
    return node;
  }

  function renderAnalyze() {
    const blocked = state.jobState === 'onboarding_blocked';
    const failed = ['synthetic_scenarios_failed', 'failed'].includes(state.jobState);
    const node = surface(failed ? '문서 작업에 실패했습니다' : blocked ? '문서 분석이 중단되었습니다' : '문서 구조를 분석하고 있습니다', failed ? '현재 작업은 실패한 상태이며 더 이상 처리되고 있지 않습니다.' : blocked ? '현재 작업은 차단된 상태이며 더 이상 처리되고 있지 않습니다.' : '슬라이드의 레이아웃과 문서 구조를 분석하여 재사용 가능한 템플릿 정보를 준비하고 있습니다.', 'uc6-analyze-stage');
    if (sourceRow()) node.append(sourceRow());
    if (blocked) node.append(staticState('분석 차단됨', '상태를 다시 확인하거나 새 작업을 시작하세요.', 'error'));
    else if (failed) node.append(staticState('작업 실패', '자동으로 다시 시도하지 않습니다. 상태를 다시 확인하거나 새 작업을 시작하세요.', 'error'));
    else node.append(process('Analyze', '문서 구조와 생성 단위를 안전하게 확인하고 있습니다.'));
    if (status()) node.append(status()); node.append(actions(newWorkspaceButton(), button('uc6-refreshJobBtn', '상태 새로고침', false, state.reconciling))); return node;
  }

  function personaDetail(value) {
    if (typeof value === 'string') return value;
    const values = Array.isArray(value) ? value : value && typeof value === 'object' ? Object.values(value) : [];
    return values.filter((item) => ['string', 'number', 'boolean'].includes(typeof item)).slice(0, 4).join(' · ');
  }

  function renderPersona() {
    const node = surface('문서 생성 목적에 맞는 Persona를 선택하세요', '문서에 사용할 데이터의 관점과 강조 방향을 결정합니다.', 'uc6-persona-stage');
    const bindingControl = projectUc6PersonaBindingMutationControl({ ambiguous: state.personaBindingAmbiguous, attemptedPersonaKey: state.personaBindingKey, requestedPersonaKey: state.selectedPersonaKey, selectionState: state.personas?.selection_state, boundScenario: state.personas?.bound_scenario });
    const grid = el('div', 'uc6-persona-grid');
    for (const persona of state.personas?.scenario_options || []) {
      const selected = persona.scenario_key === state.selectedPersonaKey;
      const card = el('button', `uc6-persona-card ${selected ? 'is-selected' : ''}`); card.type = 'button'; card.dataset.uc6Persona = persona.scenario_key;
      card.setAttribute('aria-pressed', selected ? 'true' : 'false');
      card.disabled = state.busy || bindingControl.ambiguityLocked;
      const head = el('span', 'uc6-persona-card-head'); head.append(el('span', 'uc6-persona-label', 'Persona'));
      if (selected) head.append(el('span', 'uc6-persona-selection', '선택됨'));
      card.append(head, el('h3', '', persona.label), el('p', '', persona.scenario_summary));
      const detail = personaDetail(persona.differentiation_basis); if (detail) card.append(el('small', '', detail)); grid.append(card);
    }
    node.append(grid);
    if (bindingControl.ambiguityLocked) node.append(el('p', 'uc6-state-panel is-neutral', '선택 요청 결과를 확인하고 있습니다. 결과가 확인되기 전에는 다른 Persona를 선택할 수 없습니다.'));
    else if (status()) node.append(status());
    node.append(bindingControl.ambiguityLocked
      ? actions(newWorkspaceButton())
      : actions(newWorkspaceButton(), button('uc6-bindPersonaBtn', state.busy ? '선택 중…' : '이 Persona로 계속', true, !bindingControl.canSubmit || state.busy)));
    return node;
  }

  function renderPrepare() {
    const generation = state.personas?.generation_state;
    const ready = generation === 'not_started';
    const failed = generation === 'generation_failed';
    const processing = ['generation_queued', 'generation_running'].includes(generation);
    const submitting = ready && state.busy && !state.sourceSubmitted && !state.sourceAmbiguous;
    const acceptedPending = ready && state.sourceSubmitted && !state.sourceAmbiguous;
    const submissionReconciling = ready && state.sourceAmbiguous;
    const node = surface(
      submitting ? '데이터 준비 요청을 전송하고 있습니다'
        : acceptedPending ? '데이터 준비 요청이 접수되었습니다'
          : submissionReconciling ? '데이터 준비 요청 결과를 확인하고 있습니다'
            : ready ? '문서 데이터를 준비할 수 있습니다'
              : failed ? '문서 데이터 준비에 실패했습니다'
                : '문서에 필요한 데이터를 준비하고 있습니다',
      submitting ? '데이터 준비 요청을 보내고 응답을 기다리고 있습니다.'
        : acceptedPending ? '요청이 접수되어 현재 작업 상태를 확인하고 있습니다.'
          : submissionReconciling ? '요청 결과가 확정되지 않아 현재 상태를 확인하고 있습니다.'
            : ready ? '데이터 준비는 아직 시작되지 않았습니다. 아래에서 시작할 수 있습니다.'
              : failed ? '데이터 준비 작업이 종료되었습니다. 상태를 확인한 뒤 다음 조치를 선택하세요.'
                : '선택한 Persona에 맞는 하나의 데이터 준비 작업을 진행합니다.',
      'uc6-prepare-stage'
    );
    const persona = state.personas?.bound_scenario;
    if (persona) { const summary = el('div', 'uc6-selected-persona'); summary.append(el('span', '', '선택한 Persona'), el('strong', '', persona.label), el('p', '', persona.scenario_summary)); node.append(summary); }
    if (submitting) node.append(process('요청 전송 중', '데이터 준비 요청을 보내고 응답을 기다리고 있습니다. 중복 요청을 보내지 않습니다.'));
    else if (acceptedPending) node.append(process('요청 접수됨', '데이터 준비 작업이 시작되었는지 현재 상태를 확인하고 있습니다.'));
    else if (submissionReconciling) node.append(staticState('요청 결과 확인 중', '데이터 준비 요청 결과를 확인하고 있습니다. 결과가 확인되기 전에는 요청을 다시 보내지 않습니다.'));
    else if (ready) node.append(staticState('데이터 준비를 시작할 수 있습니다.', "선택한 Persona에 맞는 문서 데이터를 준비합니다. 아래의 '데이터 준비 시작' 버튼을 눌러 시작하세요."));
    else if (failed) node.append(staticState('데이터 준비 실패', '자동으로 다시 시도하지 않습니다. 상태를 새로고침하거나 새 작업을 시작하세요.', 'error'));
    else if (processing) node.append(process('데이터 준비', '문서 생성에 필요한 공개 데이터 컨텍스트를 준비하고 있습니다.'));
    if (status()) node.append(status());
    node.append(ready ? actions(newWorkspaceButton(), button('uc6-startContextBtn', state.busy ? '요청 중…' : state.sourceSubmitted ? '요청 접수됨' : state.sourceAmbiguous ? '결과 확인 중…' : '데이터 준비 시작', true, state.busy || state.sourceSubmitted || state.sourceAmbiguous)) : actions(newWorkspaceButton(), button('uc6-refreshJobBtn', '상태 새로고침', false, state.reconciling)));
    return node;
  }

  function renderGenerate() {
    const failed = ['synthetic_scenarios_failed', 'failed'].includes(state.jobState);
    const running = ['render_queued', 'render_running'].includes(state.jobState);
    const reconciling = state.jobState === 'render_unknown';
    const active = running || reconciling;
    const submitting = state.busy && !state.renderSubmitted && !state.renderAmbiguous && !failed && !running && !reconciling;
    const acceptedPending = state.renderSubmitted && !failed && !running && !reconciling;
    const node = surface(
      failed ? '문서 생성에 실패했습니다'
        : reconciling ? '문서 생성 결과를 확인하고 있습니다'
          : running ? '최종 문서를 생성하고 있습니다'
            : submitting ? '문서 생성 요청을 전송하고 있습니다'
              : acceptedPending ? '문서 생성 요청이 접수되었습니다'
                : '최종 문서를 생성할 준비가 되었습니다',
      failed ? '현재 작업은 실패한 상태이며 더 이상 처리되고 있지 않습니다.'
        : reconciling ? '요청 결과가 확정되지 않아 현재 상태를 다시 확인하고 있습니다.'
          : submitting ? '문서 생성 요청을 보내고 응답을 기다리고 있습니다.'
            : acceptedPending ? '요청이 접수되어 현재 작업 상태를 확인하고 있습니다.'
              : '템플릿과 준비된 데이터를 결합하여 최종 문서를 생성합니다.',
      'uc6-generate-stage'
    );
    if (!failed && !submitting && !acceptedPending) {
      const composition = el('div', 'uc6-generation-composition');
      const inputs = el('div', 'uc6-generation-inputs');
      const template = el('section', 'uc6-generation-object is-template');
      const templateName = projectUc6TemplateDisplayName({ filename: state.source?.filename, mode: state.mode });
      const templateTitle = el('strong', '', templateName); templateTitle.title = templateName;
      template.append(el('span', 'uc6-generation-label', '템플릿'), templateTitle, el('span', 'uc6-generation-meta', '문서 구조와 레이아웃'));
      const prepared = el('section', 'uc6-generation-object is-data');
      prepared.append(el('span', 'uc6-generation-label', '준비된 데이터'), el('strong', '', state.personas?.bound_scenario?.label || '선택한 Persona 기반 데이터'), el('span', 'uc6-generation-meta', '문서 생성 컨텍스트'));
      inputs.append(template, prepared);
      const relation = el('div', 'uc6-generation-relation');
      const relationCopy = el('span', 'uc6-generation-relation-copy'); relationCopy.append(el('span', '', '결합'), el('strong', '', reconciling ? '상태 확인 중' : running ? '생성 중' : '준비 완료'));
      relation.append(relationCopy);
      const output = el('section', 'uc6-generation-object is-output');
      output.append(el('span', 'uc6-generation-label', '생성 문서'), el('strong', '', reconciling ? '결과 확인 중' : running ? '최종 문서 생성 중' : '최종 문서'), el('span', 'uc6-generation-meta', 'PDF · PPTX'));
      composition.append(inputs, relation, output); node.append(composition);
    }
    if (failed) node.append(staticState('문서 생성 실패', '자동으로 다시 시도하지 않습니다. 상태를 다시 확인하거나 새 작업을 시작하세요.', 'error'));
    else if (submitting) node.append(process('요청 전송 중', '문서 생성 요청을 보내고 응답을 기다리고 있습니다. 중복 요청을 보내지 않습니다.'));
    else if (acceptedPending) node.append(process('요청 접수됨', '문서 생성 작업이 시작되었는지 현재 상태를 확인하고 있습니다.'));
    else if (running) node.append(process('문서 생성', '최종 문서를 생성하고 결과를 관찰하고 있습니다.'));
    else if (reconciling) node.append(staticState('결과 확인 중', '요청 결과와 현재 상태를 확인하고 있습니다. 최종 문서 생성 여부가 확인되기 전에는 요청을 다시 보내지 않습니다.'));
    if (status()) node.append(status());
    node.append(failed || active ? actions(newWorkspaceButton(), button('uc6-refreshJobBtn', '상태 새로고침', false, state.reconciling)) : actions(newWorkspaceButton(), button('uc6-generateBtn', state.busy ? '요청 중…' : state.renderSubmitted ? '요청 접수됨' : '문서 생성', true, state.busy || state.renderSubmitted || state.renderAmbiguous)));
    return node;
  }

  function artifact(alias) {
    return state.artifacts?.artifacts?.find((item) => item.alias === alias) || null;
  }

  function reviewArtifacts() {
    const pdf = artifact('final_render_output_pdf'); const pptx = artifact('final_render_output_pptx');
    const viewHref = pdf?.ready && pdf.actions.view.available ? pdf.actions.view.href : '';
    const documentIdentity = projectUc6ReviewDocumentIdentity({ jobId: state.jobId, alias: pdf?.alias, viewHref });
    return { pdf, pptx, viewHref, documentIdentity };
  }

  function renderReviewViewerHead() {
    const viewerHead = el('div', 'uc6-viewer-head');
    viewerHead.append(el('strong', '', 'Generated PDF'), button('uc6-refreshArtifactsBtn', '새로고침', false, state.artifactStatus === 'loading'));
    return viewerHead;
  }

  function renderReviewRail(pdf, pptx) {
    const rail = el('aside', 'uc6-review-rail'); rail.append(el('h3', '', 'Review'));
    const fact = (label, copy, ready = false) => { const item = el('section', 'uc6-review-section'); item.append(el('span', 'uc6-review-label', label), el(ready ? 'strong' : 'p', ready ? 'uc6-review-state is-ready' : '', copy)); return item; };
    rail.append(fact('생성 상태', '완료되었습니다.', true), fact('검토 이슈', '별도 검토 이슈 정보가 제공되지 않았습니다.'));
    const confirm = el('label', 'uc6-review-confirm'); const check = el('input'); check.type = 'checkbox'; check.id = 'uc6-reviewConfirmed'; check.checked = state.reviewed; confirm.append(check, el('span', '', 'PDF와 PPTX 산출물을 확인했습니다.')); rail.append(confirm);
    const noteLabel = el('label', 'uc6-note-field'); noteLabel.append(el('span', 'uc6-review-label', '관리자 노트'));
    const note = el('textarea'); note.id = 'uc6-publicationNote'; note.rows = 4; note.maxLength = 1000; note.value = state.note; note.placeholder = '검토 노트를 입력하세요 (선택)'; noteLabel.append(note); rail.append(noteLabel);
    const downloads = el('div', 'uc6-review-downloads'); const pdfButton = button('', 'PDF 다운로드', false, !pdf?.ready); pdfButton.dataset.uc6Download = 'final_render_output_pdf';
    const pptxButton = button('', 'PPTX 다운로드', false, !pptx?.ready); pptxButton.dataset.uc6Download = 'final_render_output_pptx'; downloads.append(pdfButton, pptxButton); rail.append(downloads);
    rail.append(state.mode === 'fresh_template' ? button('uc6-openPublishBtn', '템플릿 게시', true, !state.reviewed) : newWorkspaceButton());
    return rail;
  }

  function synchronizeReviewStatus(node) {
    const current = node.querySelector(':scope > .uc6-transient-message'); const next = status();
    if (current && next) current.replaceWith(next);
    else if (current) current.remove();
    else if (next) node.append(next);
  }

  function synchronizeReview(node) {
    if (node?.dataset.uc6ReviewJobId !== state.jobId) return false;
    const { pdf, pptx, viewHref, documentIdentity } = reviewArtifacts();
    const viewer = node.querySelector('.uc6-viewer-column'); const shell = viewer?.querySelector('.uc6-pdf-shell'); const rail = node.querySelector('.uc6-review-rail');
    if (!viewer || !shell || !rail) return false;
    const head = viewer.querySelector('.uc6-viewer-head'); const nextHead = renderReviewViewerHead();
    if (head) head.replaceWith(nextHead); else viewer.prepend(nextHead);
    synchronizeUc6ReviewPdfViewer(shell, { documentIdentity, viewHref, emptyText: state.artifactStatus === 'error' ? 'PDF 상태를 확인할 수 없습니다.' : 'PDF를 준비하고 있습니다.' });
    rail.replaceWith(renderReviewRail(pdf, pptx)); synchronizeReviewStatus(node); return true;
  }

  function renderReview() {
    const node = surface('생성된 문서를 검토하세요', '최종 산출물을 확인하고 필요한 파일을 다운로드합니다.', 'uc6-review-stage');
    node.dataset.uc6ReviewJobId = state.jobId;
    const layout = el('div', 'uc6-review-layout'); const viewer = el('section', 'uc6-viewer-column');
    viewer.append(renderReviewViewerHead());
    const { pdf, pptx, viewHref, documentIdentity } = reviewArtifacts(); const shell = el('div', 'uc6-pdf-shell');
    synchronizeUc6ReviewPdfViewer(shell, { documentIdentity, viewHref, emptyText: state.artifactStatus === 'error' ? 'PDF 상태를 확인할 수 없습니다.' : 'PDF를 준비하고 있습니다.' });
    viewer.append(shell);
    layout.append(viewer, renderReviewRail(pdf, pptx)); node.append(layout); if (status()) node.append(status()); return node;
  }

  function renderPublish() {
    const published = state.publication?.state === 'published';
    const node = surface(published ? '템플릿 게시 완료' : '템플릿 게시', published ? '게시가 완료되었습니다. 이제 이 템플릿을 새로운 문서 생성에 사용할 수 있습니다.' : '검토한 최종 산출물을 재사용 가능한 게시 템플릿으로 등록합니다.', 'uc6-publish-stage');
    const card = el('div', 'uc6-publish-card'); if (sourceRow()) card.append(sourceRow());
    if (published) {
      card.append(el('div', 'uc6-success-receipt', '✓'), el('strong', '', '게시가 완료되었습니다.'), el('p', '', `Template ${shortId(state.publication.published_asset.asset_id)}`));
      card.append(actions(button('uc6-openLibraryBtn', '게시된 템플릿 보기', true), newWorkspaceButton()));
    } else {
      const confirm = el('div', 'uc6-publish-confirmation'); confirm.append(el('span', '', '관리자 확인'), el('strong', '', state.reviewed ? '검토 완료' : '검토 필요')); if (state.note) confirm.append(el('p', '', state.note)); card.append(confirm);
      if (state.publicationStatus === 'loading') card.append(process('게시 상태 확인', '현재 게시 가능 상태를 확인하고 있습니다.'));
      if (state.publicationAmbiguous) card.append(el('p', 'uc6-state-panel is-neutral', '게시 요청 결과를 확인하고 있습니다. 결과가 확인되기 전에는 요청을 다시 보내지 않습니다.'));
      else if (status()) card.append(status());
      const publicationControl = projectUc6PublicationMutationControl({ ambiguous: state.publicationAmbiguous, decisionIdentity: state.publicationIdentity, publicationState: state.publication?.state, reviewed: state.reviewed, busy: state.busy });
      card.append(actions(button('uc6-backReviewBtn', '검토로 돌아가기'), button('uc6-publishBtn', state.busy ? '게시 중…' : '템플릿 게시', true, !publicationControl.canSubmit)));
    }
    node.append(card); return node;
  }

  function renderLibrary() {
    const node = surface('게시된 템플릿', '검증된 템플릿을 선택하여 새로운 문서를 생성합니다.', 'uc6-library-stage');
    const bootstrapControl = projectUc6BootstrapMutationControl({
      ambiguous: state.bootstrapAmbiguous,
      attemptedAssetId: state.bootstrapAssetId,
      bootstrapIdentity: state.bootstrapIdentity
    });
    if (state.catalogStatus === 'loading') node.append(process('템플릿 불러오기', '게시된 템플릿 목록을 확인하고 있습니다.'));
    else if (!state.catalog?.assets?.length) node.append(el('div', 'uc6-empty-library', state.catalogStatus === 'error' ? '템플릿 목록을 불러오지 못했습니다.' : '사용할 수 있는 게시된 템플릿이 없습니다.'));
    else {
      const grid = el('div', 'uc6-template-grid');
      for (const [position, asset] of state.catalog.assets.entries()) {
        const templateLabel = `게시된 템플릿 ${position + 1}`;
        const card = el('article', 'uc6-template-card'); card.append(el('span', 'uc6-template-kicker', 'Published Template'), el('h3', '', templateLabel));
        const templateId = el('p', 'uc6-template-id', `ID ${shortId(asset.asset_id)}`); templateId.title = asset.asset_id; card.append(templateId);
        const facts = el('dl', 'uc6-template-facts');
        [['슬라이드', asset.slide_count], ['슬롯', asset.slot_count], ['생성 단위', asset.generation_unit_count], ['승인일', new Date(asset.approved_at).toLocaleDateString('ko-KR')]].forEach(([label, value]) => facts.append(el('dt', '', label), el('dd', '', value)));
        card.append(facts); const use = button('', '이 템플릿 사용하기', true, state.busy || bootstrapControl.ambiguityLocked); use.dataset.uc6Asset = asset.asset_id; use.setAttribute('aria-label', `${templateLabel} 사용하기`); card.append(use); grid.append(card);
      }
      node.append(grid);
    }
    if (bootstrapControl.ambiguityLocked) {
      node.append(el('p', 'uc6-state-panel is-neutral', '요청 결과를 확인하고 있습니다. 안전하게 중복할 수 없어 다른 템플릿을 시작할 수 없습니다.'));
    } else if (status()) node.append(status());
    node.append(bootstrapControl.ambiguityLocked
      ? actions(newWorkspaceButton())
      : actions(button('uc6-backWorkspaceBtn', '돌아가기'), button('uc6-refreshCatalogBtn', '목록 새로고침', false, state.catalogStatus === 'loading')));
    return node;
  }

  function render() {
    const copy = AUTH_COPY[state.auth] || AUTH_COPY.temporarily_unavailable;
    els.authChip.textContent = copy[0]; els.authText.textContent = copy[1];
    els.authChip.className = `uc6-admin-chip is-${state.auth === 'authorized' ? 'ready' : state.auth === 'access_denied' ? 'danger' : state.auth === 'temporarily_unavailable' ? 'warning' : 'neutral'}`;
    els.signIn.disabled = !['signed_out', 'access_denied', 'temporarily_unavailable'].includes(state.auth);
    els.signOut.disabled = !state.user; els.refreshSession.disabled = !state.user; renderRail();
    const stage = currentStage();
    const renderers = { auth: () => { const node = surface('FetchDoc 문서 스튜디오', '관리자 로그인 후 템플릿을 만들거나 게시된 템플릿으로 문서를 생성할 수 있습니다.', 'uc6-auth-gate'); if (status()) node.append(status()); return node; }, workspace: renderWorkspace, source: renderSource, analyze: renderAnalyze, persona: renderPersona, prepare: renderPrepare, generate: renderGenerate, review: renderReview, publish: renderPublish, library: renderLibrary };
    if (stage === 'review' && synchronizeReview(els.root.firstElementChild)) return;
    els.root.replaceChildren(renderers[stage]());
  }

  function authFailure(error) {
    const status = classifyUc6AuthorizationFailure(error); if (!status) return false;
    state.auth = status; stopObservation(); setMessage(status === 'signed_out' ? '관리자 인증이 만료되었습니다. 다시 로그인하세요.' : errorMessage(error), 'error'); render(); return true;
  }

  async function loadFirebase() {
    if (state.firebase) return state.firebase;
    const response = await fetch('/__/firebase/init.json', { cache: 'no-store' }); if (!response.ok) throw new Error('firebase_init_unavailable');
    const config = await response.json();
    const [appMod, authMod] = await Promise.all([import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-app.js`), import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-auth.js`)]);
    const app = appMod.getApps().length ? appMod.getApps()[0] : appMod.initializeApp(config); const auth = authMod.getAuth(app);
    await authMod.setPersistence(auth, authMod.browserSessionPersistence); try { await authMod.getRedirectResult(auth); } catch (_) {}
    state.firebase = { auth, authMod };
    state.api = createUc6BrowserAdminApi({ apiBaseUrl, fetchImpl: fetch, getIdToken: async (refresh = false) => { if (!state.user) throw new Error('firebase_user_missing'); return state.user.getIdToken(refresh === true); } });
    return state.firebase;
  }

  async function authorize() {
    if (!state.user || !state.api) { state.auth = 'signed_out'; return render(); }
    state.auth = 'authorizing'; render();
    try {
      await state.user.getIdToken(true); const session = await state.api.getSession();
      if (!validateSession(session)) { state.auth = 'access_denied'; return render(); }
      state.auth = 'authorized'; await resume();
    } catch (error) { if (!authFailure(error)) { state.auth = 'temporarily_unavailable'; setMessage(errorMessage(error), 'warning'); render(); } }
  }

  async function resume() {
    const saved = load();
    Object.assign(state, { mode: saved.mode || (saved.selected_asset_id ? 'published_template_runtime' : ''), jobId: saved.job_id || '', selectedAssetId: saved.selected_asset_id || '', jobState: saved.last_known_public_state || '', onboardingAmbiguous: saved.onboarding_ambiguous === true, personaBindingAmbiguous: saved.persona_binding_ambiguous === true, personaBindingKey: saved.persona_binding_key || '', sourceSubmitted: saved.source_generation_submitted === true, sourceAmbiguous: saved.source_generation_ambiguous === true, renderSubmitted: saved.render_submitted === true, renderAmbiguous: saved.render_ambiguous === true, bootstrapIdentity: saved.bootstrap_identity || '', bootstrapAssetId: saved.bootstrap_asset_id || '', bootstrapAmbiguous: saved.bootstrap_ambiguous === true, publicationIdentity: saved.publication_decision_identity || '', publicationAmbiguous: saved.publication_ambiguous === true });
    if (!state.jobId) {
      if (state.bootstrapAmbiguous) { state.mode = 'published_template_runtime'; await loadCatalog(); return; }
      return render();
    }
    await reconcile(true);
  }

  async function loadPersonas(signal) {
    state.personas = projectUc6FreshSyntheticScenarios(await state.api.getFreshSyntheticScenarios(state.jobId, { signal }), { expectedJobId: state.jobId, expectedSourceSha: state.source?.sha256 });
    const bindingControl = projectUc6PersonaBindingMutationControl({ ambiguous: state.personaBindingAmbiguous, attemptedPersonaKey: state.personaBindingKey, selectionState: state.personas.selection_state, boundScenario: state.personas.bound_scenario });
    if (bindingControl.resolved) { state.personaBindingAmbiguous = false; state.personaBindingKey = ''; }
    if (state.personas.selection_state === 'bound') state.selectedPersonaKey = state.personas.bound_scenario.scenario_key;
    else if (bindingControl.ambiguityLocked) state.selectedPersonaKey = bindingControl.attemptedPersonaKey;
    if (['generation_queued', 'generation_running', 'generation_ready', 'generation_failed'].includes(state.personas.generation_state)) { state.sourceSubmitted = true; state.sourceAmbiguous = false; }
  }

  async function loadArtifacts(signal) {
    state.artifactStatus = 'loading';
    try { state.artifacts = projectUc6FinalDeliveryCapabilities(await state.api.getRenderArtifactCapabilities(state.jobId, { signal }), { expectedJobId: state.jobId, apiBaseUrl }); state.artifactStatus = 'ready'; }
    catch (error) { if (error?.name === 'AbortError') throw error; state.artifactStatus = 'error'; setMessage('문서 생성은 완료되었습니다. 파일 정보를 다시 확인해 주세요.', 'warning'); }
  }

  async function loadPublication(signal) {
    if (state.mode !== 'fresh_template') return;
    state.publicationStatus = 'loading';
    try { state.publication = projectUc6FreshReusableAssetPublication(await state.api.getReusableAssetPublication(state.jobId, { signal }), { expectedJobId: state.jobId }); state.publicationStatus = 'ready'; if (state.publication.state === 'published') state.publicationAmbiguous = false; save(); }
    catch (error) { if (error?.name === 'AbortError') throw error; state.publicationStatus = 'error'; setMessage(state.publicationAmbiguous ? '게시 요청 결과를 확인할 수 없습니다. 중복 요청을 보내지 않습니다.' : errorMessage(error), state.publicationAmbiguous ? 'neutral' : 'error'); }
  }

  async function reconcile(observe = false) {
    if (!state.jobId || !state.api || state.reconciling) return;
    const jobId = state.jobId; state.reconciling = true; render();
    try {
      const job = projectUc6CanonicalJob(await state.api.getJob(jobId), { expectedJobId: jobId }); if (jobId !== state.jobId) return;
      state.jobState = job.state; state.source = job.source;
      const onboardingControl = projectUc6OnboardingObservationControl({ ambiguous: state.onboardingAmbiguous, state: job.state });
      if (onboardingControl.ambiguityCleared) state.onboardingAmbiguous = false;
      if (state.renderAmbiguous && ['render_queued', 'render_running', 'render_completed', 'failed'].includes(job.state)) { state.renderSubmitted = true; state.renderAmbiguous = false; }
      if (!['source_ready', 'onboarding_queued', 'onboarding_running', 'onboarding_blocked'].includes(job.state)) { try { await loadPersonas(); } catch (error) { if (!['render_queued', 'render_running', 'render_completed', 'failed'].includes(job.state)) throw error; } }
      if (job.state === 'render_completed') { state.renderSubmitted = true; state.renderAmbiguous = false; await Promise.all([loadArtifacts(), loadPublication()]); stopObservation(); }
      else if (job.state === 'failed') stopObservation();
      save(); if (observe && observationRequired()) startObservation();
    } catch (error) { if (!authFailure(error)) setMessage(`${errorMessage(error)} 현재 작업 상태를 확인할 수 없습니다. 상태를 새로고침하거나 새 작업을 시작할 수 있습니다.`, 'neutral'); }
    finally { state.reconciling = false; render(); }
  }

  function observationRequired() {
    const onboarding = projectUc6OnboardingObservationControl({ ambiguous: state.onboardingAmbiguous, state: state.jobState });
    const mutation = projectUc6MutationObservationControl({ sourceAmbiguous: state.sourceAmbiguous, renderAmbiguous: state.renderAmbiguous, state: state.jobState });
    return ACTIVE_STATES.has(state.jobState) || onboarding.unresolved || mutation.observationRequired;
  }

  function startPolling(epoch) {
    clearTimeout(state.timer);
    const tick = async () => { if (epoch !== state.eventEpoch || !state.jobId) return; await reconcile(); if (epoch === state.eventEpoch && observationRequired()) state.timer = setTimeout(tick, 5000); };
    state.timer = setTimeout(tick, 1000);
  }

  async function consumeEvents(response, jobId, epoch) {
    const reader = response.body.getReader(); const decoder = new TextDecoder(); let buffer = '';
    while (epoch === state.eventEpoch && jobId === state.jobId) {
      const { done, value } = await reader.read(); if (done) break; buffer += decoder.decode(value, { stream: true });
      const frames = buffer.split(/\r?\n\r?\n/); buffer = frames.pop() || '';
      for (const frame of frames) { const event = parseUc6JobEventFrame(frame); if (!event || event.job_id !== jobId || event.sequence <= state.eventSequence) continue; state.eventSequence = event.sequence; await reconcile(); }
    }
  }

  async function startObservation() {
    if (!state.jobId || !state.api || state.eventController) return;
    stopObservation(); const epoch = state.eventEpoch; const jobId = state.jobId; state.eventController = new AbortController();
    try { const response = await state.api.openJobEvents(jobId, { signal: state.eventController.signal }); state.reconnectAttempt = 0; await consumeEvents(response, jobId, epoch); if (epoch === state.eventEpoch && observationRequired()) throw new Error('stream_closed'); }
    catch (error) {
      if (error?.name === 'AbortError' || epoch !== state.eventEpoch || jobId !== state.jobId) return; state.eventController = null;
      if (state.reconnectAttempt < RECONNECT_MS.length) state.timer = setTimeout(startObservation, RECONNECT_MS[state.reconnectAttempt++]);
      else { setMessage('실시간 연결을 복구하는 동안 상태 조회로 계속 확인합니다.', 'warning'); startPolling(epoch); render(); }
    }
  }

  async function upload() {
    const valid = validatePptx(state.selectedFile ? [state.selectedFile] : []); if (!valid.ok || state.busy) { setMessage(valid.message, 'error'); return render(); }
    state.busy = true; setMessage('PPTX를 업로드하고 있습니다.'); render();
    try {
      const created = await state.api.createJob(valid.file); state.jobId = normalizeUc6JobId(created?.job_id); state.mode = 'fresh_template'; state.onboardingAmbiguous = true; save();
      const result = projectUc6FreshTemplateOnboardingSubmission(await state.api.submitFreshTemplateOnboarding(state.jobId), { expectedJobId: state.jobId }); state.onboardingAmbiguous = false; state.jobState = result.state; setMessage('요청이 접수되었습니다.'); save(); await reconcile(true);
    } catch (error) { if (error?.name === 'Uc6AmbiguousSubmissionError' && state.jobId) { state.onboardingAmbiguous = true; setMessage('요청 결과를 확인하고 있습니다.', 'neutral'); save(); await reconcile(true); } else { state.onboardingAmbiguous = false; save(); if (!authFailure(error)) setMessage(errorMessage(error), 'error'); } }
    finally { state.busy = false; render(); }
  }

  async function bindPersona() {
    const control = projectUc6PersonaBindingMutationControl({ ambiguous: state.personaBindingAmbiguous, attemptedPersonaKey: state.personaBindingKey, requestedPersonaKey: state.selectedPersonaKey, selectionState: state.personas?.selection_state, boundScenario: state.personas?.bound_scenario });
    if (state.busy || !control.canSubmit) return;
    const attemptedPersonaKey = control.requestedPersonaKey; state.busy = true; state.personaBindingAmbiguous = true; state.personaBindingKey = attemptedPersonaKey; save(); render();
    try { const bound = projectUc6FreshSyntheticScenarioBinding(await state.api.bindFreshSyntheticScenario(state.jobId, attemptedPersonaKey, { personas: state.personas.scenario_options }), { expectedJobId: state.jobId, expectedSourceSha: state.source?.sha256, expectedScenarioKey: attemptedPersonaKey }); state.personaBindingAmbiguous = false; state.personaBindingKey = ''; state.personas = { ...state.personas, selection_state: 'bound', bound_scenario: bound.bound_scenario }; setMessage('Persona 선택이 완료되었습니다.'); save(); }
    catch (error) { if (error?.name === 'Uc6AmbiguousSubmissionError') { state.personaBindingAmbiguous = true; setMessage('선택 요청 결과를 확인하고 있습니다.', 'neutral'); save(); await reconcile(); } else { state.personaBindingAmbiguous = false; state.personaBindingKey = ''; save(); if (!authFailure(error)) setMessage(errorMessage(error), 'error'); } }
    finally { state.busy = false; render(); }
  }

  async function prepare() {
    if (state.sourceSubmitted || state.sourceAmbiguous || state.busy) return; state.busy = true; render();
    try { const result = projectUc6FreshSyntheticGenerationSubmission(await state.api.submitFreshSyntheticScenarios(state.jobId), { expectedJobId: state.jobId, expectedSourceSha: state.source?.sha256, expectedScenarioKey: state.personas?.bound_scenario?.scenario_key }); state.sourceSubmitted = true; state.jobState = result.state; setMessage('요청이 접수되었습니다.'); save(); startObservation(); }
    catch (error) { if (error?.name === 'Uc6AmbiguousSubmissionError') { state.sourceAmbiguous = true; setMessage('요청 결과를 확인하고 있습니다.', 'warning'); save(); await reconcile(true); } else if (!authFailure(error)) setMessage(errorMessage(error), 'error'); }
    finally { state.busy = false; render(); }
  }

  async function generate() {
    if (state.renderSubmitted || state.renderAmbiguous || state.busy) return; state.busy = true; render();
    try { const result = projectUc6FreshSyntheticRenderSubmission(await state.api.submitFreshSyntheticScenarioRender(state.jobId), { expectedJobId: state.jobId, expectedScenarioKey: state.personas?.bound_scenario?.scenario_key }); state.renderSubmitted = true; state.jobState = result.state; setMessage('요청이 접수되었습니다.'); save(); startObservation(); }
    catch (error) { if (error?.name === 'Uc6AmbiguousSubmissionError') { state.renderAmbiguous = true; state.jobState = 'render_unknown'; setMessage('요청 결과를 확인하고 있습니다.', 'warning'); save(); await reconcile(true); } else if (!authFailure(error)) setMessage(errorMessage(error), 'error'); }
    finally { state.busy = false; render(); }
  }

  async function loadCatalog() {
    state.catalogStatus = 'loading'; setMessage(); render();
    try { state.catalog = projectUc6ReusableAssetCatalog(await state.api.getReusableAssets()); state.catalogStatus = 'ready'; }
    catch (error) { state.catalogStatus = 'error'; if (!authFailure(error)) setMessage(errorMessage(error), 'error'); }
    render();
  }

  async function bootstrap(assetId) {
    const control = projectUc6BootstrapMutationControl({ ambiguous: state.bootstrapAmbiguous, attemptedAssetId: state.bootstrapAssetId, bootstrapIdentity: state.bootstrapIdentity, requestedAssetId: assetId });
    if (state.busy || !control.canSubmit) return;
    state.busy = true; state.mode = 'published_template_runtime'; state.selectedAssetId = assetId;
    state.bootstrapAssetId = assetId; state.bootstrapIdentity = identity('uc6_bootstrap'); state.bootstrapAmbiguous = true;
    save(); render();
    try {
      const runtime = projectUc6ReusableAssetRuntimeBootstrap(await state.api.bootstrapReusableAssetRuntimeJob(assetId, { bootstrap_identity: state.bootstrapIdentity }), { expectedAssetId: assetId });
      state.jobId = runtime.job_id; state.jobState = runtime.state; state.bootstrapAmbiguous = false; state.bootstrapAssetId = ''; state.bootstrapIdentity = '';
      setMessage('게시된 템플릿 작업이 준비되었습니다.'); save(); await reconcile(true);
    }
    catch (error) {
      if (error?.name === 'Uc6AmbiguousSubmissionError') { state.bootstrapAmbiguous = true; setMessage('요청 결과를 확인하고 있습니다. 안전하게 중복할 수 없어 추가 요청을 보내지 않습니다.', 'neutral'); save(); }
      else { state.bootstrapAmbiguous = false; state.bootstrapAssetId = ''; state.bootstrapIdentity = ''; save(); if (!authFailure(error)) setMessage(errorMessage(error), 'error'); }
    }
    finally { state.busy = false; render(); }
  }

  async function download(alias) {
    await loadArtifacts(); const item = artifact(alias);
    if (item?.ready && item.actions.download.available) { const link = el('a'); link.href = item.actions.download.href; link.download = item.suggestedFilename || ''; link.rel = 'noopener'; document.body.append(link); link.click(); link.remove(); }
    render();
  }

  async function publish() {
    const control = projectUc6PublicationMutationControl({ ambiguous: state.publicationAmbiguous, decisionIdentity: state.publicationIdentity, publicationState: state.publication?.state, reviewed: state.reviewed, busy: state.busy });
    if (!control.canSubmit) return; state.busy = true; state.publicationIdentity ||= identity('uc6_publish'); state.publicationAmbiguous = true; save(); render();
    const command = { decision: PUBLICATION_DECISION, decision_identity: state.publicationIdentity, reviewed_final_pptx_sha256: state.publication.reviewed_final_pptx_sha256, reviewed_final_pdf_sha256: state.publication.reviewed_final_pdf_sha256, administrator_note: state.note.trim() || null };
    try { state.publication = projectUc6FreshReusableAssetPublication(await state.api.submitReusableAssetPublication(state.jobId, command), { expectedJobId: state.jobId }); state.publicationAmbiguous = false; setMessage('게시가 완료되었습니다.'); save(); }
    catch (error) { if (error?.name === 'Uc6AmbiguousSubmissionError') { state.publicationAmbiguous = true; setMessage('게시 요청 결과를 확인하고 있습니다.', 'neutral'); save(); await loadPublication(); } else { state.publicationAmbiguous = false; save(); if (!authFailure(error)) setMessage(errorMessage(error), 'error'); } }
    finally { state.busy = false; render(); }
  }

  els.signIn.addEventListener('click', async () => {
    try { state.auth = 'authenticating'; render(); const { auth, authMod } = await loadFirebase(); const provider = new authMod.GoogleAuthProvider(); try { await authMod.signInWithPopup(auth, provider); } catch (error) { if (['auth/popup-blocked', 'auth/popup-closed-by-user', 'auth/operation-not-supported-in-this-environment'].includes(String(error?.code || ''))) return authMod.signInWithRedirect(auth, provider); throw error; } }
    catch (_) { state.auth = 'signed_out'; setMessage('로그인을 완료하지 못했습니다. 다시 시도하세요.', 'error'); render(); }
  });
  els.signOut.addEventListener('click', async () => { try { const client = state.firebase || await loadFirebase(); stopObservation(); await client.authMod.signOut(client.auth); } catch (_) { state.auth = 'signed_out'; render(); } });
  els.refreshSession.addEventListener('click', authorize);
  section.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target.closest('button') : null; if (!target) return;
    if (target.id === 'uc6-startFreshBtn') { reset(); state.mode = 'fresh_template'; render(); }
    else if (target.id === 'uc6-openLibraryBtn') { reset(); state.mode = 'published_template_runtime'; loadCatalog(); }
    else if (target.id === 'uc6-backWorkspaceBtn') reset();
    else if (target.id === 'uc6-newWorkspaceBtn' && !state.busy && !state.reconciling) reset();
    else if (target.id === 'uc6-analyzeBtn') upload(); else if (target.id === 'uc6-bindPersonaBtn') bindPersona();
    else if (target.id === 'uc6-startContextBtn') prepare(); else if (target.id === 'uc6-generateBtn') generate();
    else if (target.id === 'uc6-refreshJobBtn') reconcile(true); else if (target.id === 'uc6-refreshCatalogBtn') loadCatalog();
    else if (target.dataset.uc6Asset) bootstrap(target.dataset.uc6Asset);
    else if (target.dataset.uc6Persona) { state.selectedPersonaKey = target.dataset.uc6Persona; setMessage(); render(); }
    else if (target.dataset.uc6Download) download(target.dataset.uc6Download);
    else if (target.id === 'uc6-refreshArtifactsBtn') loadArtifacts().then(render);
    else if (target.id === 'uc6-openPublishBtn') { state.showPublish = true; loadPublication().then(render); }
    else if (target.id === 'uc6-backReviewBtn') { state.showPublish = false; render(); }
    else if (target.id === 'uc6-publishBtn') publish();
  });
  section.addEventListener('change', (event) => {
    if (event.target?.id === 'uc6-pptxFileInput') { const result = validatePptx(event.target.files); state.selectedFile = result.ok ? result.file : null; setMessage(result.ok ? 'PPTX 파일이 준비되었습니다.' : result.message, result.ok ? 'neutral' : 'error'); render(); }
    else if (event.target?.id === 'uc6-reviewConfirmed') { state.reviewed = event.target.checked === true; render(); }
  });
  section.addEventListener('input', (event) => { if (event.target?.id === 'uc6-publicationNote') state.note = event.target.value.slice(0, 1000); });
  window.addEventListener('beforeunload', stopObservation);

  render();
  loadFirebase().then(({ auth, authMod }) => authMod.onAuthStateChanged(auth, async (user) => { state.user = user || null; if (!user) { stopObservation(); state.auth = 'signed_out'; render(); } else await authorize(); })).catch(() => { state.auth = 'temporarily_unavailable'; render(); });
}
