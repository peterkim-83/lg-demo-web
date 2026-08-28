export const UC6_PRODUCTION_API_BASE = 'https://api.peter-n8n.duckdns.org/';

export const UC6_BROWSER_ADMIN_ENDPOINTS = Object.freeze({
  session: '/fetchdoc/browser-admin/session',
  jobs: '/fetchdoc/browser-admin/uc6/jobs',
  analysis: (jobId) => `/fetchdoc/browser-admin/uc6/jobs/${encodeURIComponent(normalizeUc6JobId(jobId))}/analysis`,
  onboarding: (jobId) => `/fetchdoc/browser-admin/uc6/jobs/${encodeURIComponent(normalizeUc6JobId(jobId))}/onboarding`,
  syntheticScenarios: (jobId) => `/fetchdoc/browser-admin/uc6/jobs/${encodeURIComponent(normalizeUc6JobId(jobId))}/synthetic-scenarios`,
  syntheticScenarioBinding: (jobId) => `/fetchdoc/browser-admin/uc6/jobs/${encodeURIComponent(normalizeUc6JobId(jobId))}/synthetic-scenarios/binding`,
  syntheticScenarioRender: (jobId) => `/fetchdoc/browser-admin/uc6/jobs/${encodeURIComponent(normalizeUc6JobId(jobId))}/synthetic-scenarios/render`,
  job: (jobId) => `/fetchdoc/browser-admin/uc6/jobs/${encodeURIComponent(normalizeUc6JobId(jobId))}`,
  jobEvents: (jobId) => `/fetchdoc/browser-admin/uc6/jobs/${encodeURIComponent(normalizeUc6JobId(jobId))}/events`,
  review: (jobId) => `/fetchdoc/browser-admin/uc6/jobs/${encodeURIComponent(normalizeUc6JobId(jobId))}/review`,
  reviewDecision: (jobId) => `/fetchdoc/browser-admin/uc6/jobs/${encodeURIComponent(normalizeUc6JobId(jobId))}/review-decision`,
  finalDeliveryCapabilities: (jobId) => `/fetchdoc/browser-admin/uc6/jobs/${encodeURIComponent(normalizeUc6JobId(jobId))}/final-delivery-capabilities`,
  reviewArtifactCapabilities: (jobId) => `/fetchdoc/browser-admin/uc6/jobs/${encodeURIComponent(normalizeUc6JobId(jobId))}/review-artifact-capabilities`,
  reusableAssetPublication: (jobId) => `/fetchdoc/browser-admin/uc6/jobs/${encodeURIComponent(normalizeUc6JobId(jobId))}/reusable-asset-publication`,
  dummyDatabagPackages: (jobId) => `/fetchdoc/browser-admin/uc6/jobs/${encodeURIComponent(normalizeUc6JobId(jobId))}/dummy-databag-packages`,
  dummyDatabagPackageFamilies: (jobId) => `/fetchdoc/browser-admin/uc6/jobs/${encodeURIComponent(normalizeUc6JobId(jobId))}/dummy-databag-package-families`,
  render: (jobId) => `/fetchdoc/browser-admin/uc6/jobs/${encodeURIComponent(normalizeUc6JobId(jobId))}/render`,
  reusableAssets: '/fetchdoc/browser-admin/uc6/reusable-assets',
  reusableAssetJobs: (assetId) => `/fetchdoc/browser-admin/uc6/reusable-assets/${encodeURIComponent(normalizeUc6ReusableAssetId(assetId))}/jobs`,
  reusableAssetPackages: (assetId) => `/fetchdoc/browser-admin/uc6/reusable-assets/${encodeURIComponent(normalizeUc6ReusableAssetId(assetId))}/dummy-databag-packages`,
  reusableAssetRenders: (assetId) => `/fetchdoc/browser-admin/uc6/reusable-assets/${encodeURIComponent(normalizeUc6ReusableAssetId(assetId))}/renders`,
  linkedScenarioFamily: (assetId) => `/fetchdoc/browser-admin/uc6/reusable-assets/${encodeURIComponent(normalizeUc6ReusableAssetId(assetId))}/linked-scenario-family`,
  publishedScenarioRenders: (assetId) => `/fetchdoc/browser-admin/uc6/reusable-assets/${encodeURIComponent(normalizeUc6ReusableAssetId(assetId))}/published-scenario-renders`,
  renderArtifactCapabilities: (jobId) => `/fetchdoc/browser-admin/uc6/jobs/${encodeURIComponent(normalizeUc6JobId(jobId))}/render-artifact-capabilities`
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
  browser_admin_uc6_analysis_conflict: '이미 처리 중인 분석 작업이 있습니다.',
  browser_admin_uc6_review_not_ready: '아직 관리자 검토 정보가 준비되지 않았습니다.',
  browser_admin_uc6_decision_invalid: '검토 결정 입력값을 확인하세요.',
  browser_admin_uc6_decision_conflict: '검토 결정을 현재 작업 상태에 적용할 수 없습니다. 작업 상태를 새로고침해 최신 상태를 확인하세요.',
  browser_admin_uc6_analysis_failed: '분석 작업이 실패했습니다. 재시도할 수 있습니다.',
  browser_admin_uc6_queue_unavailable: '분석 대기열을 일시적으로 사용할 수 없습니다.',
  browser_admin_uc6_final_delivery_not_approved: '승인 완료 후 최종 산출물 상태를 확인할 수 있습니다.',
  browser_admin_uc6_review_artifact_not_ready: '관리자 검토용 산출물이 아직 준비되지 않았습니다.',
  browser_admin_uc6_service_unavailable: 'FetchDoc 서비스를 일시적으로 사용할 수 없습니다.',
  browser_admin_uc6_dummy_databag_package_invalid: '선택한 데이터 패키지가 유효하지 않습니다.',
  browser_admin_uc6_dummy_databag_binding_conflict: '이 작업에 이미 다른 데이터 패키지가 고정되어 있습니다. 작업 상태를 새로고침하세요.',
  browser_admin_uc6_dummy_databag_unavailable: '데이터 패키지 서비스를 일시적으로 사용할 수 없습니다.',
  browser_admin_uc6_synthetic_scenarios_not_ready: '합성 샘플 컨텍스트가 아직 준비되지 않았습니다.',
  browser_admin_uc6_synthetic_scenarios_failed: '합성 샘플 컨텍스트 생성에 실패했습니다.',
  browser_admin_uc6_synthetic_scenario_invalid: '선택한 합성 샘플 컨텍스트가 유효하지 않습니다.',
  browser_admin_uc6_synthetic_scenario_binding_conflict: '이 작업에는 이미 다른 합성 샘플 컨텍스트가 고정되어 있습니다. 작업 상태를 새로고침하세요.',
  browser_admin_uc6_render_conflict: '이미 처리 중인 생성 작업이 있습니다.',
  browser_admin_uc6_render_not_ready: '생성 요청을 처리할 준비가 되지 않았습니다.',
  browser_admin_uc6_render_failed: '문서 생성 작업이 실패했습니다.',
  browser_admin_uc6_render_invalid_task: '생성 작업 정보가 유효하지 않습니다.',
  browser_admin_uc6_reusable_asset_not_found: '게시된 재사용 Asset을 찾을 수 없습니다.',
  browser_admin_uc6_reusable_asset_unavailable: '게시된 재사용 Asset을 일시적으로 사용할 수 없습니다.',
  browser_admin_uc6_linked_scenario_family_not_found: '이 Asset에 연결된 게시 Scenario Family가 없습니다.',
  browser_admin_uc6_linked_scenario_family_incompatible: '이 Asset과 연결된 Scenario Family를 사용할 수 없습니다.',
  browser_admin_uc6_published_scenario_render_conflict: '이미 처리 중인 Scenario Family 생성 작업이 있습니다.',
  browser_admin_uc6_published_scenario_render_not_ready: 'Scenario Family 생성 요청을 처리할 준비가 되지 않았습니다.'
});

const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);
const KNOWN_DECISIONS = new Set(['approve', 'request_revision', 'reject']);
const REVIEW_STATES = new Set(['review_ready', 'review_ready_with_warnings', 'review_blocked']);
const TERMINAL_STATES = new Set(['approved', 'revision_requested', 'rejected']);
const POLLABLE_STATES = new Set(['analysis_queued', 'analysis_running']);
const RENDER_POLLABLE_STATES = new Set(['render_queued', 'render_running']);
const ONBOARDING_POLLABLE_STATES = new Set(['onboarding_queued', 'onboarding_running']);
const KNOWN_ONBOARDING_STATES = new Set(['onboarding_queued', 'onboarding_running', 'onboarding_ready', 'onboarding_blocked', 'persona_selection_ready']);
const SYNTHETIC_POLLABLE_STATES = new Set(['synthetic_scenarios_queued', 'synthetic_scenarios_running']);
const KNOWN_SYNTHETIC_JOB_STATES = new Set([
  'synthetic_scenarios_queued',
  'synthetic_scenarios_running',
  'synthetic_scenarios_ready',
  'synthetic_scenario_bound',
  'synthetic_scenarios_failed'
]);
const KNOWN_RUNTIME_PERSONA_STATES = new Set(['persona_selection_ready']);
const KNOWN_FRESH_JOB_STATES = new Set([...KNOWN_ONBOARDING_STATES, ...KNOWN_SYNTHETIC_JOB_STATES]);
const KNOWN_RENDER_STATES = new Set(['render_queued', 'render_running', 'render_completed', 'failed']);
const KNOWN_COMPATIBILITY_STATES = new Set(['compatible', 'incompatible_source_pptx']);
const KNOWN_SELECTION_STATES = new Set(['unbound', 'bound']);
const KNOWN_QUEUE_STATUSES = new Set(['pending', 'processing', 'done', 'failed']);
const KNOWN_FLOW_LANES = new Set(['dummy_render', 'asset_render', 'legacy_analysis']);
const KNOWN_ASSET_SOURCE_LANES = new Set(['static_package', 'published_scenario_family']);
const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const REUSABLE_ASSET_ID_PATTERN = /^reusable_template_asset__[a-f0-9]{40}$/;
const BOUNDED_ID_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9_.:/-]{0,127}$/;
const JOB_ID_PATTERN = /^fd_uc6_admin_[A-Za-z0-9][A-Za-z0-9_.-]{2,127}$/;

export function normalizeUc6ApiBaseUrl(value, options = {}) {
  if (typeof value !== 'string') throw new TypeError('invalid_api_base');
  const trimmed = value.trim();
  if (!trimmed) throw new TypeError('invalid_api_base');
  let parsed;
  try {
    parsed = new URL(trimmed);
  } catch (_) {
    throw new TypeError('invalid_api_base');
  }
  if (parsed.username || parsed.password) throw new TypeError('invalid_api_base_credentials');
  if (parsed.search) throw new TypeError('invalid_api_base_query');
  if (parsed.hash) throw new TypeError('invalid_api_base_fragment');
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') throw new TypeError('invalid_api_base_scheme');
  if (parsed.pathname !== '/' && parsed.pathname !== '') throw new TypeError('invalid_api_base_path');

  const origin = parsed.origin;
  if (origin === 'https://api.peter-n8n.duckdns.org') return `${origin}/`;

  const isLoopback = LOOPBACK_HOSTS.has(parsed.hostname) || parsed.hostname === '0.0.0.0';
  if (parsed.protocol === 'http:' && isLoopback && options.allowLoopbackHttp === true) return `${origin}/`;

  throw new TypeError('invalid_api_base_origin');
}

export function normalizeUc6JobId(value) {
  if (typeof value !== 'string') throw new TypeError('invalid_job_id');
  const trimmed = value.trim();
  if (!JOB_ID_PATTERN.test(trimmed)) throw new TypeError('invalid_job_id');
  return trimmed;
}

export function normalizeUc6ReusableAssetId(value) {
  if (typeof value !== 'string') throw new TypeError('invalid_reusable_asset_id');
  const trimmed = value.trim();
  if (!REUSABLE_ASSET_ID_PATTERN.test(trimmed)) throw new TypeError('invalid_reusable_asset_id');
  return trimmed;
}

export function parseUc6PublicErrorPayload(payload, status = 0) {
  const code = payload && typeof payload === 'object' && payload.detail && typeof payload.detail.code === 'string'
    ? payload.detail.code
    : 'unknown_public_error';
  const knownCode = Object.prototype.hasOwnProperty.call(UC6_PUBLIC_ERROR_MESSAGES, code) ? code : 'unknown_public_error';
  return {
    code: knownCode,
    status,
    message: knownCode === 'unknown_public_error' ? UC6_GENERIC_PUBLIC_ERROR_MESSAGE : UC6_PUBLIC_ERROR_MESSAGES[knownCode]
  };
}

export async function parseUc6PublicError(response) {
  const status = Number(response?.status || 0);
  try {
    const payload = typeof response?.json === 'function' ? await response.json() : null;
    return parseUc6PublicErrorPayload(payload, status);
  } catch (_) {
    return parseUc6PublicErrorPayload(null, status);
  }
}

export function splitDecisionTextLines(text, options = {}) {
  const maxEntries = options.maxEntries || 20;
  const maxLength = options.maxLength || 1000;
  const normalized = String(text || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = normalized.split('\n').map((line) => line.trim()).filter(Boolean);
  if (lines.length > maxEntries) throw new RangeError('too_many_decision_entries');
  if (lines.some((line) => line.length > maxLength)) throw new RangeError('decision_entry_too_long');
  return lines;
}

export function validateUc6DecisionCommand(command) {
  const decision = String(command?.decision || '').trim();
  const state = String(command?.state || '').trim();
  const reviewNotes = Array.isArray(command?.review_notes) ? command.review_notes : [];
  const requestedRevisions = Array.isArray(command?.requested_revisions) ? command.requested_revisions : [];

  if (!KNOWN_DECISIONS.has(decision)) return { ok: false, code: 'decision_invalid', message: '검토 결정을 선택하세요.' };
  if (decision === 'approve' && state === 'review_blocked') return { ok: false, code: 'approve_blocked', message: '차단 상태에서는 승인할 수 없습니다.' };
  if (decision === 'approve' && state !== 'review_ready' && state !== 'review_ready_with_warnings') {
    return { ok: false, code: 'approve_state_invalid', message: '승인 가능한 검토 상태가 아닙니다.' };
  }
  if (decision === 'approve' && requestedRevisions.length > 0) {
    return { ok: false, code: 'approve_with_revisions', message: '승인 시 요청 수정 항목은 비워야 합니다.' };
  }
  if (decision === 'request_revision' && reviewNotes.length === 0 && requestedRevisions.length === 0) {
    return { ok: false, code: 'revision_requires_content', message: '수정 요청에는 검토 메모 또는 요청 수정 항목이 필요합니다.' };
  }
  if (decision === 'reject' && reviewNotes.length === 0) {
    return { ok: false, code: 'reject_requires_notes', message: '반려에는 검토 메모가 필요합니다.' };
  }
  return {
    ok: true,
    body: {
      decision,
      review_notes: reviewNotes,
      requested_revisions: requestedRevisions
    }
  };
}

export function mapUc6StateToView(state) {
  const normalized = typeof state === 'string' ? state.trim() : '';
  if (normalized === 'source_ready') {
    return { state: normalized, known: true, pollable: false, terminal: false, reviewReady: false, canRetry: false, canSubmitAnalysis: true, canDecide: false };
  }
  if (POLLABLE_STATES.has(normalized)) {
    return { state: normalized, known: true, pollable: true, terminal: false, reviewReady: false, canRetry: false, canSubmitAnalysis: false, canDecide: false };
  }
  if (RENDER_POLLABLE_STATES.has(normalized)) {
    return { state: normalized, known: true, pollable: false, terminal: false, reviewReady: false, canRetry: false, canSubmitAnalysis: false, canDecide: false, renderPollable: true };
  }
  if (ONBOARDING_POLLABLE_STATES.has(normalized)) {
    return { state: normalized, known: true, pollable: false, terminal: false, reviewReady: false, canRetry: false, canSubmitAnalysis: false, canDecide: false, onboardingPollable: true };
  }
  if (SYNTHETIC_POLLABLE_STATES.has(normalized)) {
    return { state: normalized, known: true, pollable: false, terminal: false, reviewReady: false, canRetry: false, canSubmitAnalysis: false, canDecide: false, syntheticScenariosPollable: true };
  }
  if (KNOWN_SYNTHETIC_JOB_STATES.has(normalized)) {
    return { state: normalized, known: true, pollable: false, terminal: false, reviewReady: false, canRetry: false, canSubmitAnalysis: false, canDecide: false, syntheticScenariosPollable: false };
  }
  if (KNOWN_RUNTIME_PERSONA_STATES.has(normalized)) {
    return { state: normalized, known: true, pollable: false, terminal: false, reviewReady: false, canRetry: false, canSubmitAnalysis: false, canDecide: false, syntheticScenariosPollable: false };
  }
  if (normalized === 'onboarding_ready' || normalized === 'onboarding_blocked') {
    return { state: normalized, known: true, pollable: false, terminal: false, reviewReady: false, canRetry: false, canSubmitAnalysis: false, canDecide: false, onboardingPollable: false };
  }
  if (normalized === 'render_completed') {
    return { state: normalized, known: true, pollable: false, terminal: false, reviewReady: false, canRetry: false, canSubmitAnalysis: false, canDecide: false, renderPollable: false };
  }
  if (normalized === 'failed') {
    return { state: normalized, known: true, pollable: false, terminal: false, reviewReady: false, canRetry: true, canSubmitAnalysis: false, canDecide: false };
  }
  if (REVIEW_STATES.has(normalized)) {
    return { state: normalized, known: true, pollable: false, terminal: false, reviewReady: true, canRetry: false, canSubmitAnalysis: false, canDecide: true };
  }
  if (TERMINAL_STATES.has(normalized)) {
    return { state: normalized, known: true, pollable: false, terminal: true, reviewReady: true, canRetry: false, canSubmitAnalysis: false, canDecide: false };
  }
  return { state: normalized || 'unknown', known: false, pollable: false, terminal: false, reviewReady: false, canRetry: false, canSubmitAnalysis: false, canDecide: false };
}

export function projectUc6PersistedState(value) {
  const input = value && typeof value === 'object' ? value : {};
  const projected = {};
  try {
    if (typeof input.job_id === 'string') projected.job_id = normalizeUc6JobId(input.job_id);
  } catch (_) {
    // Invalid persisted job IDs are intentionally dropped.
  }
  if (typeof input.last_known_public_state === 'string' && mapUc6StateToView(input.last_known_public_state).known) {
    projected.last_known_public_state = input.last_known_public_state;
  }
  if (Number.isSafeInteger(input.last_polling_timestamp) && input.last_polling_timestamp >= 0) {
    projected.last_polling_timestamp = input.last_polling_timestamp;
  }
  if (typeof input.selected_panel === 'string' && /^[a-z_]{3,32}$/.test(input.selected_panel)) projected.selected_panel = input.selected_panel;
  if (typeof input.flow_lane === 'string' && KNOWN_FLOW_LANES.has(input.flow_lane)) projected.flow_lane = input.flow_lane;
  if (typeof input.asset_source_lane === 'string' && KNOWN_ASSET_SOURCE_LANES.has(input.asset_source_lane)) {
    projected.asset_source_lane = input.asset_source_lane;
  }
  if (typeof input.fresh_onboarding_expected === 'boolean') projected.fresh_onboarding_expected = input.fresh_onboarding_expected;
  if (typeof input.fresh_synthetic_expected === 'boolean') projected.fresh_synthetic_expected = input.fresh_synthetic_expected;
  if (typeof input.asset_runtime_expected === 'boolean') projected.asset_runtime_expected = input.asset_runtime_expected;
  if (typeof input.synthetic_generation_submitted === 'boolean') projected.synthetic_generation_submitted = input.synthetic_generation_submitted;
  if (typeof input.synthetic_generation_submission_ambiguous === 'boolean') {
    projected.synthetic_generation_submission_ambiguous = input.synthetic_generation_submission_ambiguous;
  }
  if (typeof input.synthetic_binding_submission_ambiguous === 'boolean') {
    projected.synthetic_binding_submission_ambiguous = input.synthetic_binding_submission_ambiguous;
  }
  if (typeof input.fresh_render_submitted === 'boolean') projected.fresh_render_submitted = input.fresh_render_submitted;
  if (typeof input.fresh_render_submission_ambiguous === 'boolean') {
    projected.fresh_render_submission_ambiguous = input.fresh_render_submission_ambiguous;
  }
  try {
    if (typeof input.selected_asset_id === 'string') projected.selected_asset_id = normalizeUc6ReusableAssetId(input.selected_asset_id);
  } catch (_) {
    // Invalid persisted Asset IDs are intentionally dropped.
  }
  if (typeof input.selected_published_scenario_family_id === 'string' && BOUNDED_ID_PATTERN.test(input.selected_published_scenario_family_id)) {
    projected.selected_published_scenario_family_id = input.selected_published_scenario_family_id;
  }
  if (typeof input.selected_published_scenario_key === 'string' && UC6_R6G_SCENARIO_KEYS.includes(input.selected_published_scenario_key)) {
    projected.selected_published_scenario_key = input.selected_published_scenario_key;
  }
  if (typeof input.selected_package_family_id === 'string' && BOUNDED_ID_PATTERN.test(input.selected_package_family_id)) {
    projected.selected_package_family_id = input.selected_package_family_id;
  }
  const packageIdValid = typeof input.selected_package_id === 'string' && BOUNDED_ID_PATTERN.test(input.selected_package_id);
  const packageVersionValid = typeof input.selected_package_version === 'string' && BOUNDED_ID_PATTERN.test(input.selected_package_version);
  if (packageIdValid && packageVersionValid) {
    projected.selected_package_id = input.selected_package_id;
    projected.selected_package_version = input.selected_package_version;
  }
  if (
    typeof input.publication_decision_identity === 'string'
    && /^[A-Za-z0-9][A-Za-z0-9._-]{0,159}$/.test(input.publication_decision_identity)
    && !input.publication_decision_identity.includes('..')
  ) {
    projected.publication_decision_identity = input.publication_decision_identity;
  }
  return projected;
}

function isPlainObject(value) {
  return !!value && typeof value === 'object' && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
}

const UC6_MAX_REVIEW_ISSUE_PREVIEW_ITEMS = 5;
const UC6_MAX_REVIEW_ISSUE_SCAN_ITEMS = 25;

function isUc6UnsafePublicScalar(value) {
  return /\/(?:data|app)\//i.test(value)
    || /file:\/\//i.test(value)
    || /[A-Za-z]:[\\/]/.test(value)
    || value.startsWith('\\\\')
    || value.startsWith('//')
    || /\bBearer\s+\S+/i.test(value)
    || /x-internal-token/i.test(value)
    || /internal_secret_token/i.test(value)
    || /internal secret token/i.test(value)
    || /traceback/i.test(value)
    || /https?:\/\//i.test(value)
    || (/^[{[]/.test(value) && /[\]}]$/.test(value));
}

function normalizeUc6IssueScalar(value, maxLength) {
  if (typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'boolean') return '';
  if (typeof value === 'number' && !Number.isFinite(value)) return '';
  const cleaned = String(value).replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!cleaned) return '';
  if (isUc6UnsafePublicScalar(cleaned)) return '';
  return cleaned.length > maxLength ? `${cleaned.slice(0, Math.max(0, maxLength - 3))}...` : cleaned;
}

function normalizeUc6IssueCount(value) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.floor(value));
}

function formatUc6ReasonTitle(value) {
  const code = normalizeUc6IssueScalar(value, 160);
  if (!code) return '';
  const spaced = code.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
  const readable = /^[A-Z0-9\s]+$/.test(spaced) ? spaced.toLowerCase() : spaced;
  return readable ? `${readable.charAt(0).toUpperCase()}${readable.slice(1)}` : '';
}

function firstUc6IssueScalar(source, fields, maxLength) {
  if (!isPlainObject(source)) return '';
  for (const field of fields) {
    const value = normalizeUc6IssueScalar(source[field], maxLength);
    if (value) return value;
  }
  return '';
}

function collectUc6IssueContextComponents(item, options = {}) {
  const components = [];
  const add = (label, value) => {
    const normalized = normalizeUc6IssueScalar(value, 80);
    if (normalized && components.length < 2) components.push(`${label} ${normalized}`);
  };
  if (Array.isArray(item.affected_segment_ids)) {
    const segments = item.affected_segment_ids.map((value) => normalizeUc6IssueScalar(value, 40)).filter(Boolean).slice(0, 5);
    if (segments.length) return { label: '영향 구간', value: segments.join(', ') };
  }
  const scalarTargetRef = normalizeUc6IssueScalar(item.target_ref, 200);
  if (scalarTargetRef) return { label: options.kind === 'blocker' ? '영향 대상' : '대상', value: scalarTargetRef };
  const target = isPlainObject(item.target_ref) ? item.target_ref : item;
  add('슬라이드', target.slide_id ?? target.slide_index);
  add('세그먼트', target.segment_id);
  add('슬롯', target.slot_id);
  add('그룹', target.group_id);
  add('아티팩트', target.source_artifact ?? target.artifact_alias);
  add('대상', target.target ?? target.ref ?? target.id ?? target.name);
  if (components.length) return { label: options.kind === 'blocker' ? '영향 대상' : '대상', value: normalizeUc6IssueScalar(components.join(' / '), 200) };
  const severity = options.kind === 'blocker' ? normalizeUc6IssueScalar(item.severity, 80) : '';
  return severity ? { label: '심각도', value: severity } : { label: '', value: '' };
}

function projectUc6ReviewIssueItem(raw, kind) {
  if (typeof raw === 'string' || typeof raw === 'number' || typeof raw === 'boolean') {
    const title = normalizeUc6IssueScalar(raw, 160);
    return title ? { kind, title } : null;
  }
  if (!isPlainObject(raw)) return null;
  const reasonCode = firstUc6IssueScalar(raw, ['reason_code', 'code'], 128);
  const technicalId = firstUc6IssueScalar(raw, kind === 'blocker' ? ['blocker_id'] : ['warning_id'], 128);
  const directTitle = firstUc6IssueScalar(raw, ['message', 'label', 'summary', 'reason'], 160);
  const title = directTitle || formatUc6ReasonTitle(reasonCode) || formatUc6ReasonTitle(technicalId);
  if (!title) return null;
  const context = collectUc6IssueContextComponents(raw, { kind });
  return {
    kind,
    title,
    ...(reasonCode ? { reasonCode } : {}),
    ...(context.label && context.value ? { contextLabel: context.label, contextValue: normalizeUc6IssueScalar(context.value, 200) } : {}),
    ...(technicalId ? { technicalId } : {})
  };
}

function projectUc6ReviewIssueGroup(items, totalCount, kind) {
  const sourceItems = Array.isArray(items) ? items : [];
  const projectedItems = [];
  for (const item of sourceItems.slice(0, UC6_MAX_REVIEW_ISSUE_SCAN_ITEMS)) {
    const projected = projectUc6ReviewIssueItem(item, kind);
    if (projected) projectedItems.push(projected);
    if (projectedItems.length >= UC6_MAX_REVIEW_ISSUE_PREVIEW_ITEMS) break;
  }
  const safeTotal = Math.max(normalizeUc6IssueCount(totalCount), projectedItems.length);
  return {
    totalCount: safeTotal,
    previewCount: projectedItems.length,
    omittedCount: Math.max(safeTotal - projectedItems.length, 0),
    items: projectedItems
  };
}

export function projectUc6ReviewIssuePresentation(review) {
  const input = isPlainObject(review) ? review : {};
  const surface = isPlainObject(input.public_review_surface) ? input.public_review_surface : {};
  return {
    blockers: projectUc6ReviewIssueGroup(surface.top_blockers || surface.blockers, input.blocking_issue_count, 'blocker'),
    warnings: projectUc6ReviewIssueGroup(surface.top_warnings || surface.warnings, input.warning_count, 'warning')
  };
}

function invalidFinalDeliveryContract() {
  throw new TypeError('invalid_uc6_final_delivery_capabilities');
}

function projectUc6CapabilityAction(action, { artifactReady, baseUrl }) {
  if (!isPlainObject(action) || typeof action.available !== 'boolean') invalidFinalDeliveryContract();
  if (action.available === false) {
    if (action.href !== null) invalidFinalDeliveryContract();
    return { available: false, href: null };
  }
  if (artifactReady !== true) invalidFinalDeliveryContract();
  if (typeof action.href !== 'string' || action.href.trim() !== action.href || action.href === '') invalidFinalDeliveryContract();
  if (!action.href.startsWith('/') || action.href.startsWith('//')) invalidFinalDeliveryContract();
  let resolved;
  try {
    resolved = new URL(action.href, baseUrl);
  } catch (_) {
    invalidFinalDeliveryContract();
  }
  const normalizedBase = new URL(baseUrl);
  if (resolved.origin !== normalizedBase.origin) invalidFinalDeliveryContract();
  if (resolved.username || resolved.password || resolved.hash) invalidFinalDeliveryContract();
  return { available: true, href: resolved.toString() };
}

function projectUc6SuggestedFilename(value) {
  if (typeof value !== 'string') invalidFinalDeliveryContract();
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 128) invalidFinalDeliveryContract();
  if (/[\\/\u0000-\u001f\u007f]/.test(trimmed) || trimmed.includes('..')) invalidFinalDeliveryContract();
  return trimmed;
}

export function projectUc6FinalDeliveryCapabilities(payload, options = {}) {
  if (!isPlainObject(payload)) invalidFinalDeliveryContract();
  const expectedJobId = normalizeUc6JobId(options.expectedJobId);
  const baseUrl = normalizeUc6ApiBaseUrl(options.apiBaseUrl || UC6_PRODUCTION_API_BASE, { allowLoopbackHttp: options.allowLoopbackHttp === true });
  if (payload.job_id !== expectedJobId) invalidFinalDeliveryContract();
  if (!Array.isArray(payload.artifacts) || payload.artifacts.length !== 2) invalidFinalDeliveryContract();

  const expectedArtifacts = [
    { alias: 'final_render_output_pdf', label: 'PDF', mediaType: 'application/pdf' },
    { alias: 'final_render_output_pptx', label: 'PowerPoint', mediaType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' }
  ];

  const artifacts = payload.artifacts.map((artifact, index) => {
    const expected = expectedArtifacts[index];
    if (!isPlainObject(artifact)) invalidFinalDeliveryContract();
    if (artifact.alias !== expected.alias || artifact.media_type !== expected.mediaType) invalidFinalDeliveryContract();
    if (typeof artifact.ready !== 'boolean') invalidFinalDeliveryContract();
    if (!isPlainObject(artifact.capabilities) || !isPlainObject(artifact.capabilities.download) || !isPlainObject(artifact.capabilities.view)) invalidFinalDeliveryContract();

    const download = projectUc6CapabilityAction(artifact.capabilities.download, { artifactReady: artifact.ready, baseUrl });
    const view = projectUc6CapabilityAction(artifact.capabilities.view, { artifactReady: artifact.ready, baseUrl });
    if (expected.alias === 'final_render_output_pptx' && (view.available !== false || view.href !== null)) invalidFinalDeliveryContract();

    return {
      alias: expected.alias,
      label: expected.label,
      ready: artifact.ready,
      suggestedFilename: projectUc6SuggestedFilename(artifact.suggested_filename),
      actions: {
        download,
        view
      }
    };
  });

  return {
    artifacts,
    readyCount: artifacts.filter((artifact) => artifact.ready).length,
    totalCount: artifacts.length
  };
}


const UC6_PUBLICATION_SCHEMA_VERSION = 'uc6_e2e4c2c_a8b_browser_admin_reusable_asset_publication_projection_v1';
const UC6_FRESH_PUBLICATION_SCHEMA_VERSION = 'uc6_a9_0g2a_r6f_a_fresh_reusable_asset_publication_projection_v1';
const UC6_PUBLICATION_DECISION = 'approve_for_reuse_and_publish';

function invalidReusablePublicationContract() {
  throw new TypeError('invalid_uc6_reusable_asset_publication');
}

function projectUc6PublishedAsset(value) {
  if (!isPlainObject(value)) invalidReusablePublicationContract();
  const stringFields = [
    'asset_id', 'template_job_id', 'decision', 'decision_identity', 'approved_at',
    'reviewed_final_pptx_sha256', 'reviewed_final_pdf_sha256', 'source_pptx_sha256',
    'asset_manifest_sha256', 'catalog_entry_sha256', 'approval_receipt_sha256'
  ];
  for (const field of stringFields) {
    if (typeof value[field] !== 'string' || value[field].trim() !== value[field] || value[field] === '') {
      invalidReusablePublicationContract();
    }
  }
  if (value.decision !== UC6_PUBLICATION_DECISION) invalidReusablePublicationContract();
  for (const field of [
    'reviewed_final_pptx_sha256', 'reviewed_final_pdf_sha256', 'source_pptx_sha256',
    'asset_manifest_sha256', 'catalog_entry_sha256', 'approval_receipt_sha256'
  ]) {
    if (!SHA256_PATTERN.test(value[field])) invalidReusablePublicationContract();
  }
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,159}$/.test(value.decision_identity) || value.decision_identity.includes('..')) {
    invalidReusablePublicationContract();
  }
  for (const field of ['generation_unit_count', 'slot_count', 'slide_count']) {
    if (!Number.isSafeInteger(value[field]) || value[field] <= 0) invalidReusablePublicationContract();
  }
  const approvedAt = Date.parse(value.approved_at);
  if (!Number.isFinite(approvedAt)) invalidReusablePublicationContract();
  return {
    asset_id: value.asset_id,
    template_job_id: value.template_job_id,
    decision: value.decision,
    decision_identity: value.decision_identity,
    approved_at: value.approved_at,
    reviewed_final_pptx_sha256: value.reviewed_final_pptx_sha256,
    reviewed_final_pdf_sha256: value.reviewed_final_pdf_sha256,
    source_pptx_sha256: value.source_pptx_sha256,
    generation_unit_count: value.generation_unit_count,
    slot_count: value.slot_count,
    slide_count: value.slide_count,
    asset_manifest_sha256: value.asset_manifest_sha256,
    catalog_entry_sha256: value.catalog_entry_sha256,
    approval_receipt_sha256: value.approval_receipt_sha256
  };
}

function projectUc6ReusableAssetPublicationBase(payload, options, expectedSchemaVersion) {
  if (!isPlainObject(payload)) invalidReusablePublicationContract();
  const expectedJobId = normalizeUc6JobId(options.expectedJobId);
  if (payload.schema_version !== expectedSchemaVersion) invalidReusablePublicationContract();
  if (payload.job_id !== expectedJobId || payload.public_safety !== 'PASS') invalidReusablePublicationContract();
  if (payload.render_state !== 'render_completed') invalidReusablePublicationContract();
  if (payload.control_plane_contract_version !== 'uc6_11c8r2_browser_admin_uc6_control_plane_v1') {
    invalidReusablePublicationContract();
  }

  if (payload.publication_state === 'unpublished') {
    if (
      payload.review_state !== 'review_pending'
      || payload.publication_requires_manual_admin_action !== true
      || payload.published_asset !== null
      || !SHA256_PATTERN.test(payload.reviewed_final_pptx_sha256)
      || !SHA256_PATTERN.test(payload.reviewed_final_pdf_sha256)
      || Object.prototype.hasOwnProperty.call(payload, 'idempotent_replay')
    ) {
      invalidReusablePublicationContract();
    }
    return {
      state: 'unpublished',
      render_state: 'render_completed',
      review_state: 'review_pending',
      publication_state: 'unpublished',
      publication_requires_manual_admin_action: true,
      reviewed_final_pptx_sha256: payload.reviewed_final_pptx_sha256,
      reviewed_final_pdf_sha256: payload.reviewed_final_pdf_sha256,
      published_asset: null,
      idempotent_replay: null
    };
  }

  if (
    payload.publication_state !== 'published'
    || payload.review_state !== 'approved_for_reuse'
    || payload.publication_requires_manual_admin_action !== false
    || !isPlainObject(payload.published_asset)
  ) {
    invalidReusablePublicationContract();
  }
  if (
    Object.prototype.hasOwnProperty.call(payload, 'idempotent_replay')
    && typeof payload.idempotent_replay !== 'boolean'
  ) {
    invalidReusablePublicationContract();
  }
  return {
    state: 'published',
    render_state: 'render_completed',
    review_state: 'approved_for_reuse',
    publication_state: 'published',
    publication_requires_manual_admin_action: false,
    published_asset: projectUc6PublishedAsset(payload.published_asset),
    idempotent_replay: typeof payload.idempotent_replay === 'boolean' ? payload.idempotent_replay : null
  };
}

export function projectUc6ReusableAssetPublication(payload, options = {}) {
  return projectUc6ReusableAssetPublicationBase(payload, options, UC6_PUBLICATION_SCHEMA_VERSION);
}

function projectUc6FreshLinkedScenarioFamily(value) {
  if (!isPlainObject(value)) invalidReusablePublicationContract();
  const allowed = new Set([
    'synthetic_scenario_family_id', 'scenario_count', 'ordered_scenario_keys',
    'scenario_family_artifact_sha256', 'published_scenario_family_id',
    'publication_manifest_sha256', 'link_identity'
  ]);
  assertUc6AllowedFields(value, allowed, 'invalid_fresh_linked_scenario_family_fields');
  if (!BOUNDED_ID_PATTERN.test(value.synthetic_scenario_family_id)) invalidReusablePublicationContract();
  if (value.scenario_count !== 3) invalidReusablePublicationContract();
  if (
    !Array.isArray(value.ordered_scenario_keys)
    || value.ordered_scenario_keys.length !== UC6_PUBLISHED_SYNTHETIC_SCENARIO_KEYS.length
    || value.ordered_scenario_keys.some((key, index) => key !== UC6_PUBLISHED_SYNTHETIC_SCENARIO_KEYS[index])
  ) invalidReusablePublicationContract();
  if (!SHA256_PATTERN.test(value.scenario_family_artifact_sha256)) invalidReusablePublicationContract();

  const optionalIdFields = ['published_scenario_family_id', 'link_identity'];
  for (const field of optionalIdFields) {
    if (Object.prototype.hasOwnProperty.call(value, field) && !BOUNDED_ID_PATTERN.test(value[field])) {
      invalidReusablePublicationContract();
    }
  }
  if (
    Object.prototype.hasOwnProperty.call(value, 'publication_manifest_sha256')
    && !SHA256_PATTERN.test(value.publication_manifest_sha256)
  ) invalidReusablePublicationContract();

  return {
    synthetic_scenario_family_id: value.synthetic_scenario_family_id,
    scenario_count: 3,
    ordered_scenario_keys: [...UC6_PUBLISHED_SYNTHETIC_SCENARIO_KEYS],
    scenario_family_artifact_sha256: value.scenario_family_artifact_sha256,
    ...(value.published_scenario_family_id ? { published_scenario_family_id: value.published_scenario_family_id } : {}),
    ...(value.publication_manifest_sha256 ? { publication_manifest_sha256: value.publication_manifest_sha256 } : {}),
    ...(value.link_identity ? { link_identity: value.link_identity } : {})
  };
}

export function projectUc6FreshReusableAssetPublication(payload, options = {}) {
  // Fresh publication promotes the original mold and validated template intelligence.
  // Scenario-family data was intentionally removed from the public control-plane contract.
  return projectUc6ReusableAssetPublicationBase(payload, options, UC6_FRESH_PUBLICATION_SCHEMA_VERSION);
}

export function validateUc6ReusableAssetPublicationCommand(command) {
  const decision = String(command?.decision || '').trim();
  const decisionIdentity = String(command?.decision_identity || '').trim();
  const pptxSha = String(command?.reviewed_final_pptx_sha256 || '').trim();
  const pdfSha = String(command?.reviewed_final_pdf_sha256 || '').trim();
  const rawNote = command?.administrator_note;
  if (decision !== UC6_PUBLICATION_DECISION) {
    return { ok: false, code: 'publication_decision_invalid', message: '승인·게시 결정을 확인하세요.' };
  }
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,159}$/.test(decisionIdentity) || decisionIdentity.includes('..')) {
    return { ok: false, code: 'publication_identity_invalid', message: '승인 식별자를 다시 생성하세요.' };
  }
  if (!SHA256_PATTERN.test(pptxSha) || !SHA256_PATTERN.test(pdfSha)) {
    return { ok: false, code: 'publication_sha_invalid', message: '검토한 산출물 SHA-256을 확인하세요.' };
  }
  let administratorNote;
  if (rawNote !== undefined && rawNote !== null && String(rawNote).trim() !== '') {
    administratorNote = String(rawNote).replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
    if (
      administratorNote.length > 1000
      || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(administratorNote)
      || /^(?:\/|~\/|[A-Za-z]:[\\/])/.test(administratorNote)
      || /internal_secret_token|authorization:\s*bearer|api_key=|password=/i.test(administratorNote)
    ) {
      return { ok: false, code: 'publication_note_invalid', message: '관리자 메모는 1,000자 이하의 공개 가능한 텍스트여야 합니다.' };
    }
  }
  return {
    ok: true,
    body: {
      decision: UC6_PUBLICATION_DECISION,
      decision_identity: decisionIdentity,
      reviewed_final_pptx_sha256: pptxSha,
      reviewed_final_pdf_sha256: pdfSha,
      ...(administratorNote ? { administrator_note: administratorNote } : {})
    }
  };
}

const UC6_A8G_CATALOG_SCHEMA = 'uc6_e2e4c2c_a8g_browser_admin_reusable_asset_catalog_v1';
const UC6_A8G_PACKAGE_OPTIONS_SCHEMA = 'uc6_e2e4c2c_a8g_browser_admin_reusable_asset_package_options_v1';
const UC6_A8G_SUBMISSION_SCHEMA = 'uc6_e2e4c2c_a8g_browser_admin_reusable_asset_render_submission_v1';
const UC6_A8G_RESULT_SCHEMA = 'uc6_e2e4c2c_a8g_browser_admin_reusable_asset_render_result_v1';
const UC6_A8G_TASK_TYPE = 'fetchdoc_browser_admin_uc6_render_reusable_asset';

function validateUc6ControlPlaneVersion(value) {
  if (typeof value !== 'string' || value.length < 1 || value.length > 128 || !BOUNDED_ID_PATTERN.test(value)) {
    throw new TypeError('invalid_control_plane_contract_version');
  }
  return value;
}

function validateUc6SafePublicText(value, { maxLength, allowEmpty = false, code = 'invalid_public_text' } = {}) {
  if (typeof value !== 'string') throw new TypeError(code);
  const trimmed = value.trim();
  if ((!allowEmpty && !trimmed) || trimmed.length > maxLength || (trimmed && isUc6UnsafePublicScalar(trimmed))) {
    throw new TypeError(code);
  }
  return trimmed;
}

function projectUc6FreshOnboardingSource(value) {
  if (!isPlainObject(value)) throw new TypeError('invalid_onboarding_job_source');
  if (typeof value.sha256 !== 'string' || !SHA256_PATTERN.test(value.sha256)) {
    throw new TypeError('invalid_onboarding_job_source_sha');
  }
  if (!Number.isInteger(value.size_bytes) || value.size_bytes <= 0) {
    throw new TypeError('invalid_onboarding_job_source_size');
  }
  if (!Number.isInteger(value.slide_count) || value.slide_count <= 0) {
    throw new TypeError('invalid_onboarding_job_source_slides');
  }
  const filename = validateUc6SafePublicText(value.filename, {
    maxLength: 256,
    code: 'invalid_onboarding_job_source_filename'
  });
  if (/[\\/\u0000-\u001f]/.test(filename)) throw new TypeError('invalid_onboarding_job_source_filename');
  return {
    sha256: value.sha256,
    size_bytes: value.size_bytes,
    slide_count: value.slide_count,
    filename
  };
}

export function projectUc6FreshTemplateOnboardingSubmission(payload, options = {}) {
  if (!isPlainObject(payload)) throw new TypeError('invalid_onboarding_submission_payload');
  const expectedJobId = normalizeUc6JobId(options.expectedJobId);
  if (payload.schema_version !== 'uc6_a9_0g2a_r6d2a_browser_admin_fresh_template_onboarding_submission_v1') {
    throw new TypeError('invalid_onboarding_submission_schema');
  }
  if (payload.job_id !== expectedJobId) throw new TypeError('invalid_onboarding_submission_job_id');
  if (payload.task_type !== 'fetchdoc_browser_admin_uc6_fresh_template_onboarding') {
    throw new TypeError('invalid_onboarding_submission_task_type');
  }
  if (!Number.isInteger(payload.task_id) || payload.task_id <= 0 || payload.task_id > Number.MAX_SAFE_INTEGER) {
    throw new TypeError('invalid_onboarding_submission_task_id');
  }
  if (!KNOWN_QUEUE_STATUSES.has(payload.queue_status)) throw new TypeError('invalid_onboarding_submission_queue_status');
  if (typeof payload.created !== 'boolean') throw new TypeError('invalid_onboarding_submission_created');
  if (!KNOWN_ONBOARDING_STATES.has(payload.state)) throw new TypeError('invalid_onboarding_submission_state');
  const controlPlaneContractVersion = validateUc6ControlPlaneVersion(payload.control_plane_contract_version);
  if (payload.public_safety !== 'PASS') throw new TypeError('invalid_onboarding_submission_public_safety');
  return {
    schema_version: payload.schema_version,
    job_id: payload.job_id,
    task_type: payload.task_type,
    task_id: payload.task_id,
    queue_status: payload.queue_status,
    created: payload.created,
    state: payload.state,
    control_plane_contract_version: controlPlaneContractVersion,
    public_safety: payload.public_safety
  };
}

export function projectUc6FreshTemplateOnboardingJobStatus(payload, options = {}) {
  if (!isPlainObject(payload)) throw new TypeError('invalid_onboarding_job_status_payload');
  const expectedJobId = normalizeUc6JobId(options.expectedJobId);
  if (payload.job_id !== expectedJobId) throw new TypeError('invalid_onboarding_job_status_job_id');
  if (!KNOWN_FRESH_JOB_STATES.has(payload.state)) throw new TypeError('invalid_onboarding_job_status_state');
  return {
    job_id: payload.job_id,
    state: payload.state,
    source: projectUc6FreshOnboardingSource(payload.source),
    control_plane_contract_version: validateUc6ControlPlaneVersion(payload.control_plane_contract_version)
  };
}

const UC6_SYNTHETIC_GENERATION_TASK_TYPE = 'fetchdoc_browser_admin_uc6_fresh_synthetic_scenario_generation';
const UC6_SYNTHETIC_RENDER_TASK_TYPE = 'fetchdoc_browser_admin_uc6_render_fresh_synthetic_scenario';
const UC6_SCENARIO_KEY_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_.-]{0,127}$/;
// Retained only by legacy readback helpers; it is not part of the active Persona Catalog contract.
const UC6_PUBLISHED_SYNTHETIC_SCENARIO_KEYS = Object.freeze(['scenario_000', 'scenario_001', 'scenario_002']);
const UC6_SYNTHETIC_SUBMISSION_STATES = new Set([
  'synthetic_scenarios_queued',
  'synthetic_scenarios_running',
  'synthetic_scenarios_ready',
  'synthetic_scenarios_failed'
]);
const UC6_SYNTHETIC_GENERATION_STATES = new Set([
  'not_started',
  'generation_queued',
  'generation_running',
  'generation_ready',
  'generation_failed'
]);

function validateUc6OpaqueSchemaVersion(value) {
  // R6E-C1 is versioned independently; C2 treats only this new schema literal as opaque and bounded.
  if (typeof value !== 'string' || value.length < 1 || value.length > 128 || !BOUNDED_ID_PATTERN.test(value)) {
    throw new TypeError('invalid_synthetic_schema_version');
  }
  return value;
}

function assertUc6AllowedFields(value, allowed, code) {
  if (Object.keys(value).some((key) => !allowed.has(key))) throw new TypeError(code);
}

function projectUc6SyntheticDifferentiationBasis(value, depth = 0) {
  if (value === null) return null;
  if (depth > 3) throw new TypeError('invalid_synthetic_differentiation_basis');
  if (typeof value === 'string') {
    return validateUc6SafePublicText(value, { maxLength: 1024, code: 'invalid_synthetic_differentiation_basis' });
  }
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (Array.isArray(value)) {
    if (value.length > 20) throw new TypeError('invalid_synthetic_differentiation_basis');
    return value.map((entry) => projectUc6SyntheticDifferentiationBasis(entry, depth + 1));
  }
  if (!isPlainObject(value) || Object.keys(value).length > 20) {
    throw new TypeError('invalid_synthetic_differentiation_basis');
  }
  const projected = {};
  for (const [key, entry] of Object.entries(value)) {
    if (
      !/^[A-Za-z0-9][A-Za-z0-9_.-]{0,63}$/.test(key)
      || /(?:path|token|secret|provider|receipt|fingerprint|source_context|internal)/i.test(key)
    ) {
      throw new TypeError('invalid_synthetic_differentiation_basis');
    }
    projected[key] = projectUc6SyntheticDifferentiationBasis(entry, depth + 1);
  }
  return projected;
}

function projectUc6SyntheticScenarioOption(value) {
  if (!isPlainObject(value)) throw new TypeError('invalid_synthetic_scenario_option');
  const allowed = new Set(['scenario_key', 'label', 'scenario_summary', 'differentiation_basis']);
  assertUc6AllowedFields(value, allowed, 'invalid_synthetic_scenario_option_fields');
  if (typeof value.scenario_key !== 'string' || !UC6_SCENARIO_KEY_PATTERN.test(value.scenario_key)) throw new TypeError('invalid_synthetic_scenario_key');
  if (!Object.prototype.hasOwnProperty.call(value, 'differentiation_basis')) {
    throw new TypeError('invalid_synthetic_differentiation_basis');
  }
  return {
    scenario_key: value.scenario_key,
    label: validateUc6SafePublicText(value.label, { maxLength: 256, code: 'invalid_synthetic_scenario_label' }),
    scenario_summary: validateUc6SafePublicText(value.scenario_summary, { maxLength: 2048, code: 'invalid_synthetic_scenario_summary' }),
    differentiation_basis: projectUc6SyntheticDifferentiationBasis(value.differentiation_basis)
  };
}

export function projectUc6FreshSyntheticGenerationSubmission(payload, options = {}) {
  if (!isPlainObject(payload)) throw new TypeError('invalid_synthetic_generation_submission_payload');
  const allowed = new Set([
    'schema_version', 'job_id', 'task_type', 'task_id', 'queue_status', 'created', 'state',
    'control_plane_contract_version', 'public_safety', 'source_pptx_sha256',
    'bound_scenario', 'network_call_count', 'replayed', 'provider_attempt_count'
  ]);
  assertUc6AllowedFields(payload, allowed, 'invalid_synthetic_generation_submission_fields');
  const expectedJobId = normalizeUc6JobId(options.expectedJobId);
  if (payload.job_id !== expectedJobId) throw new TypeError('invalid_synthetic_generation_submission_job_id');
  if (
    Object.prototype.hasOwnProperty.call(payload, 'task_type')
    && payload.task_type !== UC6_SYNTHETIC_GENERATION_TASK_TYPE
  ) throw new TypeError('invalid_synthetic_generation_submission_task_type');
  if (!UC6_SYNTHETIC_SUBMISSION_STATES.has(payload.state)) throw new TypeError('invalid_synthetic_generation_submission_state');
  if (typeof payload.created !== 'boolean') throw new TypeError('invalid_synthetic_generation_submission_created');
  if (payload.public_safety !== 'PASS') throw new TypeError('invalid_synthetic_generation_submission_public_safety');

  const isReadyReplay = payload.state === 'synthetic_scenarios_ready';
  if (isReadyReplay) {
    if (payload.queue_status !== 'ready') throw new TypeError('invalid_synthetic_generation_submission_queue_status');
    if (payload.task_id !== null) throw new TypeError('invalid_synthetic_generation_submission_task_id');
    if (payload.created !== false) throw new TypeError('invalid_synthetic_generation_submission_created');
  } else {
    const expectedQueueStatus = {
      synthetic_scenarios_queued: 'pending',
      synthetic_scenarios_running: 'processing',
      synthetic_scenarios_failed: 'failed'
    }[payload.state];
    if (!KNOWN_QUEUE_STATUSES.has(payload.queue_status) || payload.queue_status !== expectedQueueStatus) {
      throw new TypeError('invalid_synthetic_generation_submission_queue_status');
    }
    if (!Number.isInteger(payload.task_id) || payload.task_id <= 0 || payload.task_id > Number.MAX_SAFE_INTEGER) {
      throw new TypeError('invalid_synthetic_generation_submission_task_id');
    }
  }
  if (payload.source_pptx_sha256 !== undefined && !SHA256_PATTERN.test(payload.source_pptx_sha256)) {
    throw new TypeError('invalid_synthetic_generation_source_sha');
  }
  const boundScenario = payload.bound_scenario === undefined
    ? undefined
    : projectUc6SyntheticScenarioOption(payload.bound_scenario);
  if (payload.network_call_count !== undefined && (!Number.isSafeInteger(payload.network_call_count) || payload.network_call_count < 0)) {
    throw new TypeError('invalid_synthetic_generation_network_call_count');
  }
  if (payload.replayed !== undefined && typeof payload.replayed !== 'boolean') {
    throw new TypeError('invalid_synthetic_generation_replayed');
  }
  if (payload.provider_attempt_count !== undefined && (!Number.isSafeInteger(payload.provider_attempt_count) || payload.provider_attempt_count < 0)) {
    throw new TypeError('invalid_synthetic_generation_provider_attempt_count');
  }
  return {
    schema_version: validateUc6OpaqueSchemaVersion(payload.schema_version),
    job_id: payload.job_id,
    ...(Object.prototype.hasOwnProperty.call(payload, 'task_type') ? { task_type: payload.task_type } : {}),
    task_id: payload.task_id,
    queue_status: payload.queue_status,
    created: payload.created,
    state: payload.state,
    control_plane_contract_version: validateUc6ControlPlaneVersion(payload.control_plane_contract_version),
    public_safety: payload.public_safety,
    ...(payload.source_pptx_sha256 !== undefined ? { source_pptx_sha256: payload.source_pptx_sha256 } : {}),
    ...(boundScenario !== undefined ? { bound_scenario: boundScenario } : {}),
    ...(payload.network_call_count !== undefined ? { network_call_count: payload.network_call_count } : {}),
    ...(payload.replayed !== undefined ? { replayed: payload.replayed } : {}),
    ...(payload.provider_attempt_count !== undefined ? { provider_attempt_count: payload.provider_attempt_count } : {})
  };
}

export const projectUc6FreshSyntheticScenarioGenerationSubmission = projectUc6FreshSyntheticGenerationSubmission;

export function projectUc6FreshSyntheticScenarios(payload, options = {}) {
  if (!isPlainObject(payload)) throw new TypeError('invalid_synthetic_scenarios_payload');
  const allowed = new Set([
    'schema_version', 'job_id', 'source_pptx_sha256', 'onboarding_state', 'generation_state',
    'scenario_options', 'selection_state', 'bound_scenario', 'control_plane_contract_version', 'public_safety'
  ]);
  assertUc6AllowedFields(payload, allowed, 'invalid_synthetic_scenarios_fields');
  const expectedJobId = normalizeUc6JobId(options.expectedJobId);
  if (payload.job_id !== expectedJobId) throw new TypeError('invalid_synthetic_scenarios_job_id');
  if (!SHA256_PATTERN.test(payload.source_pptx_sha256)) throw new TypeError('invalid_synthetic_scenarios_source_sha');
  if (options.expectedSourceSha && payload.source_pptx_sha256 !== options.expectedSourceSha) {
    throw new TypeError('synthetic_scenarios_source_sha_mismatch');
  }
  if (!KNOWN_ONBOARDING_STATES.has(payload.onboarding_state)) throw new TypeError('invalid_synthetic_scenarios_onboarding_state');
  if (!UC6_SYNTHETIC_GENERATION_STATES.has(payload.generation_state)) throw new TypeError('invalid_synthetic_scenarios_generation_state');
  if (!KNOWN_SELECTION_STATES.has(payload.selection_state)) throw new TypeError('invalid_synthetic_scenarios_selection_state');
  if (!Array.isArray(payload.scenario_options)) throw new TypeError('invalid_synthetic_scenario_options');
  if (payload.public_safety !== 'PASS') throw new TypeError('invalid_synthetic_scenarios_public_safety');
  const scenarioOptions = payload.scenario_options.map(projectUc6SyntheticScenarioOption);
  const personaCatalogReady = payload.onboarding_state === 'onboarding_ready' || payload.onboarding_state === 'persona_selection_ready';
  if (personaCatalogReady) {
    if (!scenarioOptions.length || new Set(scenarioOptions.map((option) => option.scenario_key)).size !== scenarioOptions.length) {
      throw new TypeError('invalid_synthetic_scenario_catalog');
    }
  } else if (scenarioOptions.length !== 0) {
    throw new TypeError('invalid_synthetic_scenarios_onboarding_options');
  }
  if (payload.generation_state !== 'not_started' && !personaCatalogReady) {
    throw new TypeError('invalid_synthetic_scenarios_generation_onboarding_state');
  }
  let boundScenario = null;
  if (payload.selection_state === 'bound') {
    boundScenario = projectUc6SyntheticScenarioOption(payload.bound_scenario);
    const authoritative = scenarioOptions.find((option) => option.scenario_key === boundScenario.scenario_key);
    if (!authoritative || JSON.stringify(authoritative) !== JSON.stringify(boundScenario)) {
      throw new TypeError('invalid_synthetic_bound_scenario_identity');
    }
  } else if (payload.bound_scenario !== null) {
    throw new TypeError('invalid_synthetic_unbound_scenario');
  } else if (payload.generation_state !== 'not_started') {
    throw new TypeError('invalid_synthetic_unbound_generation_state');
  }
  return {
    schema_version: validateUc6OpaqueSchemaVersion(payload.schema_version),
    job_id: payload.job_id,
    source_pptx_sha256: payload.source_pptx_sha256,
    onboarding_state: payload.onboarding_state,
    generation_state: payload.generation_state,
    scenario_options: scenarioOptions,
    selection_state: payload.selection_state,
    bound_scenario: boundScenario,
    control_plane_contract_version: validateUc6ControlPlaneVersion(payload.control_plane_contract_version),
    public_safety: payload.public_safety
  };
}

export function validateUc6SyntheticScenarioBindingCommand(scenarioKey, scenarioOptions = null) {
  const normalized = typeof scenarioKey === 'string' ? scenarioKey.trim() : '';
  if (!UC6_SCENARIO_KEY_PATTERN.test(normalized)) {
    return { ok: false, code: 'synthetic_scenario_key_invalid', message: '샘플 Persona 선택값을 확인하세요.' };
  }
  if (Array.isArray(scenarioOptions) && !scenarioOptions.some((option) => option?.scenario_key === normalized)) {
    return { ok: false, code: 'synthetic_scenario_not_in_catalog', message: '현재 Persona Catalog에 없는 선택입니다.' };
  }
  return { ok: true, body: { scenario_key: normalized } };
}

export function validateUc6ReusableAssetBootstrapCommand(command) {
  const bootstrapIdentity = String(command?.bootstrap_identity || '').trim();
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{15,159}$/.test(bootstrapIdentity) || bootstrapIdentity.includes('..')) {
    return { ok: false, code: 'bootstrap_identity_invalid', message: '런타임 작업 식별자를 다시 생성하세요.' };
  }
  return { ok: true, body: { bootstrap_identity: bootstrapIdentity } };
}

export function projectUc6ReusableAssetRuntimeBootstrap(payload, options = {}) {
  if (!isPlainObject(payload)) throw new TypeError('invalid_reusable_asset_bootstrap_payload');
  const expectedAssetId = normalizeUc6ReusableAssetId(options.expectedAssetId);
  const allowed = new Set([
    'schema_version', 'asset_id', 'job_id', 'state', 'source_pptx_sha256', 'asset', 'disposition',
    'created', 'replayed', 'control_plane_contract_version', 'public_safety'
  ]);
  assertUc6AllowedFields(payload, allowed, 'invalid_reusable_asset_bootstrap_fields');
  if (payload.public_safety !== 'PASS') throw new TypeError('invalid_reusable_asset_bootstrap_public_safety');
  if (typeof payload.job_id !== 'string') throw new TypeError('invalid_reusable_asset_bootstrap_job');
  const jobId = normalizeUc6JobId(payload.job_id);
  if (payload.state !== 'persona_selection_ready') throw new TypeError('invalid_reusable_asset_bootstrap_state');
  if (!SHA256_PATTERN.test(payload.source_pptx_sha256)) throw new TypeError('invalid_reusable_asset_bootstrap_source_sha');
  let asset = null;
  if (payload.asset !== undefined) {
    if (!isPlainObject(payload.asset)) throw new TypeError('invalid_reusable_asset_bootstrap_asset');
    const assetAllowed = new Set(['asset_id', 'source_pptx_sha256', 'generation_unit_count', 'slot_count', 'slide_count']);
    assertUc6AllowedFields(payload.asset, assetAllowed, 'invalid_reusable_asset_bootstrap_asset_fields');
    if (normalizeUc6ReusableAssetId(payload.asset.asset_id) !== expectedAssetId || payload.asset.source_pptx_sha256 !== payload.source_pptx_sha256) {
      throw new TypeError('invalid_reusable_asset_bootstrap_asset');
    }
    for (const field of ['generation_unit_count', 'slot_count', 'slide_count']) {
      if (!Number.isSafeInteger(payload.asset[field]) || payload.asset[field] <= 0) throw new TypeError(`invalid_reusable_asset_bootstrap_${field}`);
    }
    asset = {
      asset_id: expectedAssetId,
      source_pptx_sha256: payload.source_pptx_sha256,
      generation_unit_count: payload.asset.generation_unit_count,
      slot_count: payload.asset.slot_count,
      slide_count: payload.asset.slide_count
    };
  } else if (payload.asset_id !== expectedAssetId) {
    throw new TypeError('invalid_reusable_asset_bootstrap_asset');
  }
  if (payload.disposition !== undefined && !['created', 'replayed'].includes(payload.disposition)) throw new TypeError('invalid_reusable_asset_bootstrap_disposition');
  if (payload.created !== undefined && typeof payload.created !== 'boolean') throw new TypeError('invalid_reusable_asset_bootstrap_created');
  if (payload.replayed !== undefined && typeof payload.replayed !== 'boolean') throw new TypeError('invalid_reusable_asset_bootstrap_replayed');
  return {
    ...(payload.schema_version !== undefined ? { schema_version: validateUc6OpaqueSchemaVersion(payload.schema_version) } : {}),
    job_id: jobId,
    state: 'persona_selection_ready',
    source_pptx_sha256: payload.source_pptx_sha256,
    ...(asset ? { asset } : { asset_id: expectedAssetId }),
    ...(payload.disposition !== undefined ? { disposition: payload.disposition } : {}),
    ...(payload.created !== undefined ? { created: payload.created } : {}),
    ...(payload.replayed !== undefined ? { replayed: payload.replayed } : {}),
    control_plane_contract_version: validateUc6ControlPlaneVersion(payload.control_plane_contract_version),
    public_safety: 'PASS'
  };
}

export function projectUc6FreshSyntheticScenarioBinding(payload, options = {}) {
  if (!isPlainObject(payload)) throw new TypeError('invalid_synthetic_binding_payload');
  const allowed = new Set([
    'schema_version', 'job_id', 'source_pptx_sha256', 'selection_state',
    'bound_scenario', 'disposition', 'public_safety'
  ]);
  assertUc6AllowedFields(payload, allowed, 'invalid_synthetic_binding_fields');
  const expectedJobId = normalizeUc6JobId(options.expectedJobId);
  const expectedScenarioKey = validateUc6SyntheticScenarioBindingCommand(options.expectedScenarioKey);
  if (!expectedScenarioKey.ok) throw new TypeError('invalid_synthetic_binding_expected_scenario');
  if (payload.job_id !== expectedJobId) throw new TypeError('invalid_synthetic_binding_job_id');
  if (!SHA256_PATTERN.test(payload.source_pptx_sha256)) throw new TypeError('invalid_synthetic_binding_source_sha');
  if (options.expectedSourceSha && payload.source_pptx_sha256 !== options.expectedSourceSha) {
    throw new TypeError('synthetic_binding_source_sha_mismatch');
  }
  if (payload.selection_state !== 'bound') throw new TypeError('invalid_synthetic_binding_selection_state');
  if (!['created', 'replayed', 'resolved'].includes(payload.disposition)) throw new TypeError('invalid_synthetic_binding_disposition');
  if (payload.public_safety !== 'PASS') throw new TypeError('invalid_synthetic_binding_public_safety');
  const boundScenario = projectUc6SyntheticScenarioOption(payload.bound_scenario);
  if (boundScenario.scenario_key !== expectedScenarioKey.body.scenario_key) {
    throw new TypeError('invalid_synthetic_binding_scenario_key');
  }
  return {
    schema_version: validateUc6OpaqueSchemaVersion(payload.schema_version),
    job_id: payload.job_id,
    source_pptx_sha256: payload.source_pptx_sha256,
    selection_state: 'bound',
    bound_scenario: boundScenario,
    disposition: payload.disposition,
    public_safety: payload.public_safety
  };
}

const UC6_FRESH_RENDER_STATES = new Set(['render_queued', 'render_running', 'render_completed', 'failed']);
const UC6_FRESH_RENDER_QUEUE_STATUSES = Object.freeze({
  render_queued: new Set(['pending']),
  render_running: new Set(['processing']),
  render_completed: new Set(['done', 'ready', 'completed']),
  failed: new Set(['failed'])
});
const UC6_FRESH_RENDER_UNSAFE_FIELD = /(?:^|_)(?:absolute_?path|internal|locator|provider|request_?id|secret|token|fallback_?text|slot_?id|generation_?unit_?id|selection_?id|package_?id|package_?version|family_?id)(?:_|$)/i;

function assertUc6FreshRenderPublicFields(value, code) {
  if (!isPlainObject(value)) throw new TypeError(code);
  if (Object.keys(value).some((key) => UC6_FRESH_RENDER_UNSAFE_FIELD.test(key))) throw new TypeError(code);
}

function projectUc6FreshRenderOptionalCount(value, code) {
  if (value === undefined) return undefined;
  if (!Number.isSafeInteger(value) || value < 0) throw new TypeError(code);
  return value;
}

function projectUc6FreshRenderDisposition(value) {
  const source = isPlainObject(value?.disposition_summary)
    ? value.disposition_summary
    : isPlainObject(value?.validation_summary)
      ? value.validation_summary
      : value;
  assertUc6FreshRenderPublicFields(source, 'invalid_fresh_render_disposition_fields');
  const statusValue = source.validation_status ?? source.review_status;
  const validationStatus = statusValue === undefined
    ? undefined
    : validateUc6SafePublicText(statusValue, { maxLength: 64, code: 'invalid_fresh_render_validation_status' });
  const finalValidationStatus = source.final_validation_status === undefined
    ? undefined
    : validateUc6SafePublicText(source.final_validation_status, { maxLength: 64, code: 'invalid_fresh_render_final_validation_status' });
  const generatedCount = projectUc6FreshRenderOptionalCount(source.generated_count, 'invalid_fresh_render_generated_count');
  const privateFallbackCount = projectUc6FreshRenderOptionalCount(source.private_fallback_count, 'invalid_fresh_render_private_fallback_count');
  const expectedCount = projectUc6FreshRenderOptionalCount(
    source.expected_slot_count ?? source.expected_count,
    'invalid_fresh_render_expected_count'
  );
  const blockingIssueCount = projectUc6FreshRenderOptionalCount(source.blocking_issue_count, 'invalid_fresh_render_blocking_count');
  const redMarkerCount = projectUc6FreshRenderOptionalCount(source.red_marker_count, 'invalid_fresh_render_red_marker_count');
  if (source.review_required !== undefined && typeof source.review_required !== 'boolean') {
    throw new TypeError('invalid_fresh_render_review_required');
  }
  if (expectedCount !== undefined && generatedCount !== undefined && privateFallbackCount !== undefined
      && generatedCount + privateFallbackCount !== expectedCount) {
    throw new TypeError('fresh_render_disposition_count_mismatch');
  }
  return {
    ...(validationStatus !== undefined ? { validation_status: validationStatus } : {}),
    ...(finalValidationStatus !== undefined ? { final_validation_status: finalValidationStatus } : {}),
    ...(generatedCount !== undefined ? { generated_count: generatedCount } : {}),
    ...(privateFallbackCount !== undefined ? { private_fallback_count: privateFallbackCount } : {}),
    ...(expectedCount !== undefined ? { expected_count: expectedCount } : {}),
    ...(blockingIssueCount !== undefined ? { blocking_issue_count: blockingIssueCount } : {}),
    ...(redMarkerCount !== undefined ? { red_marker_count: redMarkerCount } : {}),
    review_required: source.review_required === true || validationStatus === 'ready_with_review' || privateFallbackCount > 0
  };
}

function projectUc6FreshRenderArtifact(value, expectedAlias) {
  if (!isPlainObject(value) || value.alias !== expectedAlias) throw new TypeError('invalid_fresh_render_artifact');
  if (typeof value.sha256 !== 'string' || !SHA256_PATTERN.test(value.sha256)) throw new TypeError('invalid_fresh_render_artifact_sha');
  if (!Number.isSafeInteger(value.size_bytes) || value.size_bytes <= 0) throw new TypeError('invalid_fresh_render_artifact_size');
  return { alias: expectedAlias, sha256: value.sha256, size_bytes: value.size_bytes };
}

function projectUc6FreshCompletedRender(value, expectedJobId, expectedSourceSha) {
  assertUc6FreshRenderPublicFields(value, 'invalid_fresh_render_result');
  if (value.job_id !== expectedJobId) throw new TypeError('fresh_render_result_job_id_mismatch');
  if (value.state !== 'render_completed' || value.render_state !== 'render_completed') throw new TypeError('invalid_fresh_render_result_state');
  if (value.public_safety !== 'PASS') throw new TypeError('invalid_fresh_render_result_public_safety');
  if (value.source_pptx_sha256 !== undefined && value.source_pptx_sha256 !== expectedSourceSha) {
    throw new TypeError('fresh_render_result_source_mismatch');
  }
  if (!isPlainObject(value.final_artifacts)) throw new TypeError('invalid_fresh_render_final_artifacts');
  const finalArtifacts = {
    pptx: projectUc6FreshRenderArtifact(value.final_artifacts.pptx, 'final_render_output_pptx'),
    pdf: projectUc6FreshRenderArtifact(value.final_artifacts.pdf, 'final_render_output_pdf')
  };
  const disposition = projectUc6FreshRenderDisposition(value);
  return {
    schema_version: validateUc6OpaqueSchemaVersion(value.schema_version),
    job_id: value.job_id,
    state: 'render_completed',
    render_state: 'render_completed',
    final_artifacts: finalArtifacts,
    disposition,
    review_required: disposition.review_required,
    control_plane_contract_version: validateUc6ControlPlaneVersion(value.control_plane_contract_version),
    public_safety: value.public_safety
  };
}

export function projectUc6FreshSyntheticRenderSubmission(payload, options = {}) {
  assertUc6FreshRenderPublicFields(payload, 'invalid_fresh_render_submission_payload');
  const expectedJobId = normalizeUc6JobId(options.expectedJobId);
  if (payload.job_id !== expectedJobId) throw new TypeError('invalid_fresh_render_submission_job_id');
  if (!UC6_FRESH_RENDER_STATES.has(payload.state)) throw new TypeError('invalid_fresh_render_submission_state');
  if (payload.task_type !== undefined && payload.task_type !== UC6_SYNTHETIC_RENDER_TASK_TYPE) {
    throw new TypeError('invalid_fresh_render_submission_task_type');
  }
  if (payload.public_safety !== 'PASS') throw new TypeError('invalid_fresh_render_submission_public_safety');
  if (payload.created !== undefined && typeof payload.created !== 'boolean') throw new TypeError('invalid_fresh_render_submission_created');
  if (payload.created === true && payload.state === 'render_completed') throw new TypeError('invalid_fresh_render_submission_created_completed');
  if (payload.queue_status !== undefined && !UC6_FRESH_RENDER_QUEUE_STATUSES[payload.state].has(payload.queue_status)) {
    throw new TypeError('invalid_fresh_render_submission_queue_status');
  }
  if (payload.task_id !== undefined && payload.task_id !== null
      && (!Number.isSafeInteger(payload.task_id) || payload.task_id <= 0)) {
    throw new TypeError('invalid_fresh_render_submission_task_id');
  }
  if ((payload.state === 'render_queued' || payload.state === 'render_running') && payload.task_id === null) {
    throw new TypeError('invalid_fresh_render_submission_task_id');
  }
  if (payload.selection_state !== undefined && payload.selection_state !== 'bound') {
    throw new TypeError('invalid_fresh_render_submission_selection_state');
  }
  let boundScenario;
  if (payload.bound_scenario !== undefined) {
    boundScenario = projectUc6SyntheticScenarioOption(payload.bound_scenario);
    if (options.expectedScenarioKey && boundScenario.scenario_key !== options.expectedScenarioKey) {
      throw new TypeError('fresh_render_submission_scenario_mismatch');
    }
  }
  return {
    schema_version: validateUc6OpaqueSchemaVersion(payload.schema_version),
    job_id: payload.job_id,
    ...(payload.task_type !== undefined ? { task_type: payload.task_type } : {}),
    ...(payload.task_id !== undefined ? { task_id: payload.task_id } : {}),
    ...(payload.queue_status !== undefined ? { queue_status: payload.queue_status } : {}),
    ...(payload.created !== undefined ? { created: payload.created } : {}),
    state: payload.state,
    ...(payload.selection_state !== undefined ? { selection_state: 'bound' } : {}),
    ...(boundScenario ? { bound_scenario: boundScenario } : {}),
    control_plane_contract_version: validateUc6ControlPlaneVersion(payload.control_plane_contract_version),
    public_safety: payload.public_safety
  };
}

export function projectUc6FreshSyntheticRenderJobStatus(payload, options = {}) {
  assertUc6FreshRenderPublicFields(payload, 'invalid_fresh_render_job_payload');
  const expectedJobId = normalizeUc6JobId(options.expectedJobId);
  if (payload.job_id !== expectedJobId) throw new TypeError('fresh_render_job_id_mismatch');
  if (!UC6_FRESH_RENDER_STATES.has(payload.state)) throw new TypeError('invalid_fresh_render_job_state');
  const source = projectUc6FreshOnboardingSource(payload.source);
  const controlPlaneContractVersion = validateUc6ControlPlaneVersion(payload.control_plane_contract_version);
  if (payload.state !== 'render_completed') {
    if (payload.render !== undefined) throw new TypeError('non_completed_fresh_render_must_not_have_result');
    return { job_id: payload.job_id, state: payload.state, source, render: null, control_plane_contract_version: controlPlaneContractVersion };
  }
  const render = projectUc6FreshCompletedRender(payload.render, expectedJobId, source.sha256);
  if (render.control_plane_contract_version !== controlPlaneContractVersion) {
    throw new TypeError('fresh_render_control_plane_mismatch');
  }
  return {
    job_id: payload.job_id,
    state: 'render_completed',
    source,
    render,
    render_state: render.render_state,
    final_artifacts: render.final_artifacts,
    disposition: render.disposition,
    review_required: render.review_required,
    control_plane_contract_version: controlPlaneContractVersion,
    public_safety: render.public_safety
  };
}

export function projectUc6FreshSyntheticRenderControl(input = {}) {
  const authoritativeBound = input.selectionState === 'bound'
    && isPlainObject(input.boundScenario)
    && typeof input.boundScenario.scenario_key === 'string'
    && UC6_SCENARIO_KEY_PATTERN.test(input.boundScenario.scenario_key);
  const publicState = typeof input.publicState === 'string' ? input.publicState : '';
  const submitted = input.submitted === true;
  const ambiguous = input.ambiguous === true;
  const inFlight = input.inFlight === true;
  const submissionLocked = submitted || ambiguous || inFlight;
  return {
    authoritativeBound,
    canSubmit: authoritativeBound && publicState === 'synthetic_scenarios_ready' && !submissionLocked,
    submissionLocked,
    reconciliationRequired: ambiguous || publicState === 'render_unknown',
    renderPollable: publicState === 'render_queued'
      || publicState === 'render_running'
      || (authoritativeBound && submitted && !ambiguous && publicState === 'synthetic_scenarios_ready'),
    completed: publicState === 'render_completed',
    failed: publicState === 'failed'
  };
}

export function projectUc6FreshRenderDeliveryControl(input = {}) {
  const publicState = typeof input.publicState === 'string' ? input.publicState : '';
  const deliveryStatus = ['idle', 'loading', 'ready', 'error'].includes(input.deliveryStatus)
    ? input.deliveryStatus
    : 'idle';
  const explicitRetry = input.explicitRetry === true;
  const executionPollable = publicState === 'render_queued' || publicState === 'render_running';
  const executionTerminal = publicState === 'render_completed' || publicState === 'failed';
  return {
    publicState,
    deliveryStatus,
    executionPollable,
    executionTerminal,
    shouldResolveCapabilities: publicState === 'render_completed'
      && (deliveryStatus === 'idle' || (explicitRetry && deliveryStatus !== 'loading')),
    deliveryReconciliationRequired: publicState === 'render_completed' && deliveryStatus === 'error'
  };
}

function projectUc6ReusableAssetRow(row) {
  if (!isPlainObject(row)) throw new TypeError('invalid_reusable_asset_item');
  const allowed = new Set([
    'asset_id', 'status', 'review_state', 'publication_state', 'source_pptx_sha256',
    'generation_unit_count', 'slot_count', 'slide_count', 'approved_at',
    'template_family_ids', 'compatible_dummy_databag_package_count'
  ]);
  if (Object.keys(row).some((key) => !allowed.has(key))) {
    throw new TypeError('invalid_reusable_asset_item_fields');
  }
  const assetId = normalizeUc6ReusableAssetId(row.asset_id);
  if (row.status !== 'published' || row.review_state !== 'approved_for_reuse' || row.publication_state !== 'published') {
    throw new TypeError('invalid_reusable_asset_state');
  }
  if (typeof row.source_pptx_sha256 !== 'string' || !SHA256_PATTERN.test(row.source_pptx_sha256)) {
    throw new TypeError('invalid_reusable_asset_source_sha');
  }
  for (const key of ['generation_unit_count', 'slot_count', 'slide_count']) {
    if (!Number.isInteger(row[key]) || row[key] <= 0) throw new TypeError(`invalid_reusable_asset_${key}`);
  }
  const approvedAt = validateUc6SafePublicText(row.approved_at, { maxLength: 64, code: 'invalid_reusable_asset_approved_at' });
  if (!Number.isFinite(Date.parse(approvedAt))) throw new TypeError('invalid_reusable_asset_approved_at');
  let templateFamilyIds;
  if (Object.prototype.hasOwnProperty.call(row, 'template_family_ids')) {
    if (!Array.isArray(row.template_family_ids) || row.template_family_ids.length > 32) {
      throw new TypeError('invalid_reusable_asset_template_families');
    }
    const seenFamilies = new Set();
    templateFamilyIds = row.template_family_ids.map((value) => {
      if (typeof value !== 'string' || !BOUNDED_ID_PATTERN.test(value) || seenFamilies.has(value)) {
        throw new TypeError('invalid_reusable_asset_template_family');
      }
      seenFamilies.add(value);
      return value;
    });
  }
  let compatiblePackageCount;
  if (Object.prototype.hasOwnProperty.call(row, 'compatible_dummy_databag_package_count')) {
    if (!Number.isInteger(row.compatible_dummy_databag_package_count) || row.compatible_dummy_databag_package_count < 0) {
      throw new TypeError('invalid_reusable_asset_package_count');
    }
    compatiblePackageCount = row.compatible_dummy_databag_package_count;
  }
  return {
    asset_id: assetId,
    status: row.status,
    review_state: row.review_state,
    publication_state: row.publication_state,
    source_pptx_sha256: row.source_pptx_sha256,
    generation_unit_count: row.generation_unit_count,
    slot_count: row.slot_count,
    slide_count: row.slide_count,
    approved_at: approvedAt,
    ...(templateFamilyIds !== undefined ? { template_family_ids: templateFamilyIds } : {}),
    ...(compatiblePackageCount !== undefined ? { compatible_dummy_databag_package_count: compatiblePackageCount } : {})
  };
}

function projectUc6A8gPackageRow(pkg, expectedSourceSha = '') {
  if (!isPlainObject(pkg)) throw new TypeError('invalid_asset_package_item');
  if (pkg.schema_version !== 'uc6_a8c_dummy_databag_package_public_projection_v1') {
    throw new TypeError('invalid_asset_package_schema');
  }
  if (typeof pkg.package_id !== 'string' || !BOUNDED_ID_PATTERN.test(pkg.package_id)) throw new TypeError('invalid_asset_package_id');
  if (typeof pkg.package_version !== 'string' || !BOUNDED_ID_PATTERN.test(pkg.package_version)) throw new TypeError('invalid_asset_package_version');
  const title = validateUc6SafePublicText(pkg.title, { maxLength: 256, code: 'invalid_asset_package_title' });
  const description = validateUc6SafePublicText(pkg.description, { maxLength: 1024, allowEmpty: true, code: 'invalid_asset_package_description' });
  if (typeof pkg.template_family_id !== 'string' || !BOUNDED_ID_PATTERN.test(pkg.template_family_id)) throw new TypeError('invalid_asset_template_family_id');
  if (typeof pkg.source_pptx_sha256 !== 'string' || !SHA256_PATTERN.test(pkg.source_pptx_sha256)) throw new TypeError('invalid_asset_package_source_sha');
  if (expectedSourceSha && pkg.source_pptx_sha256 !== expectedSourceSha) throw new TypeError('asset_package_source_sha_mismatch');
  if (typeof pkg.canonical_sha256 !== 'string' || !SHA256_PATTERN.test(pkg.canonical_sha256)) throw new TypeError('invalid_asset_package_canonical_sha');
  if (!Number.isInteger(pkg.supported_canonical_source_group_count) || pkg.supported_canonical_source_group_count <= 0) {
    throw new TypeError('invalid_asset_package_group_count');
  }
  if (pkg.status !== 'active') throw new TypeError('invalid_asset_package_status');
  return {
    schema_version: pkg.schema_version,
    package_id: pkg.package_id,
    package_version: pkg.package_version,
    title,
    description,
    template_family_id: pkg.template_family_id,
    source_pptx_sha256: pkg.source_pptx_sha256,
    supported_canonical_source_group_count: pkg.supported_canonical_source_group_count,
    status: pkg.status,
    canonical_sha256: pkg.canonical_sha256
  };
}

function projectUc6A8gBoundPackage(value) {
  if (!isPlainObject(value)) throw new TypeError('invalid_asset_bound_package');
  if (typeof value.package_id !== 'string' || !BOUNDED_ID_PATTERN.test(value.package_id)) throw new TypeError('invalid_asset_bound_package_id');
  if (typeof value.package_version !== 'string' || !BOUNDED_ID_PATTERN.test(value.package_version)) throw new TypeError('invalid_asset_bound_package_version');
  const title = validateUc6SafePublicText(value.title, { maxLength: 256, code: 'invalid_asset_bound_package_title' });
  const description = validateUc6SafePublicText(value.description, { maxLength: 1024, allowEmpty: true, code: 'invalid_asset_bound_package_description' });
  if (typeof value.source_context_bundle_sha256 !== 'string' || !SHA256_PATTERN.test(value.source_context_bundle_sha256)) {
    throw new TypeError('invalid_asset_bound_package_sha');
  }
  return {
    package_id: value.package_id,
    package_version: value.package_version,
    title,
    description,
    source_context_bundle_sha256: value.source_context_bundle_sha256
  };
}

export function projectUc6ReusableAssetCatalog(payload) {
  if (!isPlainObject(payload)) throw new TypeError('invalid_reusable_asset_catalog_payload');
  if (payload.schema_version !== UC6_A8G_CATALOG_SCHEMA) throw new TypeError('invalid_reusable_asset_catalog_schema');
  if (payload.public_safety !== 'PASS') throw new TypeError('invalid_reusable_asset_catalog_public_safety');
  validateUc6ControlPlaneVersion(payload.control_plane_contract_version);
  if (!Array.isArray(payload.assets) || !Number.isInteger(payload.asset_count) || payload.asset_count !== payload.assets.length || payload.asset_count < 0 || payload.asset_count > 10000) {
    throw new TypeError('invalid_reusable_asset_catalog_count');
  }
  const seen = new Set();
  const assets = payload.assets.map((row) => {
    const projected = projectUc6ReusableAssetRow(row);
    if (seen.has(projected.asset_id)) throw new TypeError('duplicate_reusable_asset_id');
    seen.add(projected.asset_id);
    return projected;
  });
  return {
    schema_version: payload.schema_version,
    asset_count: assets.length,
    assets,
    control_plane_contract_version: payload.control_plane_contract_version,
    public_safety: payload.public_safety
  };
}

export function projectUc6ReusableAssetPackageOptions(payload, options = {}) {
  if (!isPlainObject(payload)) throw new TypeError('invalid_reusable_asset_package_options_payload');
  const expectedAssetId = normalizeUc6ReusableAssetId(options.expectedAssetId);
  if (payload.schema_version !== UC6_A8G_PACKAGE_OPTIONS_SCHEMA) throw new TypeError('invalid_reusable_asset_package_options_schema');
  if (payload.public_safety !== 'PASS') throw new TypeError('invalid_reusable_asset_package_options_public_safety');
  validateUc6ControlPlaneVersion(payload.control_plane_contract_version);
  const asset = projectUc6ReusableAssetRow(payload.asset);
  if (asset.asset_id !== expectedAssetId) throw new TypeError('reusable_asset_package_options_asset_mismatch');
  if (!Array.isArray(payload.packages) || !Number.isInteger(payload.package_count) || payload.package_count !== payload.packages.length || payload.package_count < 0) {
    throw new TypeError('invalid_reusable_asset_package_options_count');
  }
  const seen = new Set();
  const packages = payload.packages.map((pkg) => {
    const projected = projectUc6A8gPackageRow(pkg, asset.source_pptx_sha256);
    const key = `${projected.package_id}:${projected.package_version}`;
    if (seen.has(key)) throw new TypeError('duplicate_reusable_asset_package');
    seen.add(key);
    if (!asset.template_family_ids.includes(projected.template_family_id)) throw new TypeError('reusable_asset_package_family_mismatch');
    return projected;
  });
  if (asset.compatible_dummy_databag_package_count !== packages.length) {
    throw new TypeError('reusable_asset_package_count_mismatch');
  }
  return {
    schema_version: payload.schema_version,
    asset,
    package_count: packages.length,
    packages,
    control_plane_contract_version: payload.control_plane_contract_version,
    public_safety: payload.public_safety
  };
}

export function validateUc6ReusableAssetRenderCommand(command, packageOptions = null) {
  if (!isPlainObject(command)) return { ok: false, code: 'asset_render_command_invalid', message: 'Asset 생성 명령이 유효하지 않습니다.' };
  const keys = Object.keys(command).sort();
  if (keys.length !== 2 || keys[0] !== 'package_id' || keys[1] !== 'package_version') {
    return { ok: false, code: 'asset_render_command_fields_invalid', message: 'Asset 생성 명령 필드를 확인하세요.' };
  }
  const packageId = String(command.package_id || '').trim();
  const packageVersion = String(command.package_version || '').trim();
  if (!BOUNDED_ID_PATTERN.test(packageId) || !BOUNDED_ID_PATTERN.test(packageVersion)) {
    return { ok: false, code: 'asset_render_package_identity_invalid', message: '선택한 데이터 패키지를 다시 확인하세요.' };
  }
  if (packageOptions !== null) {
    if (!isPlainObject(packageOptions) || !Array.isArray(packageOptions.packages) || !isPlainObject(packageOptions.asset)) {
      return { ok: false, code: 'asset_render_package_options_invalid', message: 'Asset 데이터 패키지 상태를 다시 확인하세요.' };
    }
    const matched = packageOptions.packages.find((pkg) => pkg.package_id === packageId && pkg.package_version === packageVersion);
    if (!matched) return { ok: false, code: 'asset_render_package_not_found', message: '선택한 데이터 패키지를 목록에서 찾을 수 없습니다.' };
  }
  return { ok: true, body: { package_id: packageId, package_version: packageVersion } };
}

export function projectUc6ReusableAssetRenderSubmission(payload, options = {}) {
  if (!isPlainObject(payload)) throw new TypeError('invalid_reusable_asset_render_submission_payload');
  const expectedAssetId = normalizeUc6ReusableAssetId(options.expectedAssetId);
  if (payload.schema_version !== UC6_A8G_SUBMISSION_SCHEMA) throw new TypeError('invalid_reusable_asset_render_submission_schema');
  const jobId = normalizeUc6JobId(payload.job_id);
  if (payload.task_type !== UC6_A8G_TASK_TYPE) throw new TypeError('invalid_reusable_asset_render_task_type');
  if (!Number.isInteger(payload.task_id) || payload.task_id <= 0) throw new TypeError('invalid_reusable_asset_render_task_id');
  if (!KNOWN_QUEUE_STATUSES.has(payload.queue_status)) throw new TypeError('invalid_reusable_asset_render_queue_status');
  if (typeof payload.created !== 'boolean') throw new TypeError('invalid_reusable_asset_render_created');
  const mappedState = QUEUE_STATE_MAP[payload.queue_status];
  if (payload.state !== mappedState) throw new TypeError('reusable_asset_render_queue_state_mismatch');
  const asset = projectUc6ReusableAssetRow(payload.asset);
  if (asset.asset_id !== expectedAssetId) throw new TypeError('reusable_asset_render_asset_mismatch');
  const boundPackage = projectUc6A8gBoundPackage(payload.bound_package);
  validateUc6ControlPlaneVersion(payload.control_plane_contract_version);
  if (payload.public_safety !== 'PASS') throw new TypeError('invalid_reusable_asset_render_submission_public_safety');
  return {
    schema_version: payload.schema_version,
    job_id: jobId,
    task_type: payload.task_type,
    task_id: payload.task_id,
    queue_status: payload.queue_status,
    created: payload.created,
    state: payload.state,
    asset,
    bound_package: boundPackage,
    control_plane_contract_version: payload.control_plane_contract_version,
    public_safety: payload.public_safety
  };
}

function projectUc6A8gFinalArtifact(value, expectedAlias) {
  if (!isPlainObject(value) || value.alias !== expectedAlias || typeof value.sha256 !== 'string' || !SHA256_PATTERN.test(value.sha256) || !Number.isInteger(value.size_bytes) || value.size_bytes <= 0) {
    throw new TypeError('invalid_reusable_asset_render_artifact');
  }
  return { alias: value.alias, sha256: value.sha256, size_bytes: value.size_bytes };
}

function projectUc6A8gCompletedRender(render, expectedAssetId) {
  if (!isPlainObject(render) || render.schema_version !== UC6_A8G_RESULT_SCHEMA || render.state !== 'render_completed' || render.render_state !== 'render_completed') {
    throw new TypeError('invalid_reusable_asset_render_result');
  }
  if (render.review_state !== 'not_required' || render.publication_state !== 'not_applicable' || render.promotion_eligible !== false || render.public_safety !== 'PASS') {
    throw new TypeError('invalid_reusable_asset_render_terminal_state');
  }
  const asset = render.asset;
  if (!isPlainObject(asset) || normalizeUc6ReusableAssetId(asset.asset_id) !== expectedAssetId) throw new TypeError('reusable_asset_render_result_asset_mismatch');
  const assetProjection = {
    asset_id: asset.asset_id,
    source_pptx_sha256: asset.source_pptx_sha256,
    asset_manifest_sha256: asset.asset_manifest_sha256,
    catalog_entry_sha256: asset.catalog_entry_sha256,
    approval_receipt_sha256: asset.approval_receipt_sha256
  };
  for (const key of ['source_pptx_sha256', 'asset_manifest_sha256', 'catalog_entry_sha256', 'approval_receipt_sha256']) {
    if (typeof assetProjection[key] !== 'string' || !SHA256_PATTERN.test(assetProjection[key])) throw new TypeError('invalid_reusable_asset_render_result_asset_sha');
  }
  const boundPackage = projectUc6A8gBoundPackage(render.bound_package);
  if (!isPlainObject(render.final_artifacts)) throw new TypeError('invalid_reusable_asset_render_final_artifacts');
  const finalArtifacts = {
    pptx: projectUc6A8gFinalArtifact(render.final_artifacts.pptx, 'final_render_output_pptx'),
    pdf: projectUc6A8gFinalArtifact(render.final_artifacts.pdf, 'final_render_output_pdf')
  };
  return {
    schema_version: render.schema_version,
    job_id: render.job_id,
    state: render.state,
    render_state: render.render_state,
    review_state: render.review_state,
    publication_state: render.publication_state,
    promotion_eligible: render.promotion_eligible,
    asset: assetProjection,
    bound_package: boundPackage,
    final_artifacts: finalArtifacts,
    control_plane_contract_version: validateUc6ControlPlaneVersion(render.control_plane_contract_version),
    public_safety: render.public_safety
  };
}

export function projectUc6ReusableAssetRenderJobStatus(payload, options = {}) {
  if (!isPlainObject(payload)) throw new TypeError('invalid_reusable_asset_render_job_payload');
  const expectedJobId = normalizeUc6JobId(options.expectedJobId);
  const expectedAssetId = normalizeUc6ReusableAssetId(options.expectedAssetId);
  if (payload.job_id !== expectedJobId) throw new TypeError('reusable_asset_render_job_id_mismatch');
  if (!KNOWN_RENDER_STATES.has(payload.state)) throw new TypeError('invalid_reusable_asset_render_job_state');
  validateUc6ControlPlaneVersion(payload.control_plane_contract_version);
  if (!isPlainObject(payload.source)) throw new TypeError('invalid_reusable_asset_render_job_source');
  if (typeof payload.source.sha256 !== 'string' || !SHA256_PATTERN.test(payload.source.sha256)) throw new TypeError('invalid_reusable_asset_render_job_source_sha');
  if (!Number.isInteger(payload.source.size_bytes) || payload.source.size_bytes <= 0) throw new TypeError('invalid_reusable_asset_render_job_source_size');
  if (!Number.isInteger(payload.source.slide_count) || payload.source.slide_count <= 0) throw new TypeError('invalid_reusable_asset_render_job_source_slides');
  const filename = validateUc6SafePublicText(payload.source.filename, { maxLength: 256, code: 'invalid_reusable_asset_render_job_source_filename' });
  const source = { sha256: payload.source.sha256, size_bytes: payload.source.size_bytes, slide_count: payload.source.slide_count, filename };
  if (payload.state !== 'render_completed') {
    if (payload.render !== undefined) throw new TypeError('non_completed_reusable_asset_render_must_not_have_result');
    return {
      job_id: payload.job_id,
      state: payload.state,
      source,
      render: null,
      control_plane_contract_version: payload.control_plane_contract_version
    };
  }
  const render = projectUc6A8gCompletedRender(payload.render, expectedAssetId);
  if (render.job_id !== expectedJobId || render.asset.source_pptx_sha256 !== source.sha256) {
    throw new TypeError('reusable_asset_render_result_lineage_mismatch');
  }
  return {
    job_id: payload.job_id,
    state: payload.state,
    source,
    render,
    render_state: render.render_state,
    review_state: render.review_state,
    publication_state: render.publication_state,
    promotion_eligible: render.promotion_eligible,
    asset: render.asset,
    bound_package: render.bound_package,
    final_artifacts: render.final_artifacts,
    control_plane_contract_version: payload.control_plane_contract_version,
    public_safety: render.public_safety
  };
}

export const UC6_R6G_LINKED_FAMILY_SCHEMA = 'uc6_a9_0g2a_r6g_a_published_asset_scenario_options_v1';
export const UC6_R6G_SUBMISSION_SCHEMA = 'uc6_a9_0g2a_r6g_a_published_asset_scenario_render_submission_v1';
export const UC6_R6G_RESULT_SCHEMA = 'uc6_a9_0g2a_r6g_a_published_asset_scenario_render_result_v1';
export const UC6_R6G_TASK_TYPE = 'fetchdoc_browser_admin_uc6_render_published_asset_scenario';
export const UC6_R6G_SCENARIO_KEYS = Object.freeze(['scenario_000', 'scenario_001', 'scenario_002']);

function projectUc6R6gLinkedFamilyIdentity(value, {
  requireScenarioKey = false,
  expectedFamilyId = null,
  expectedScenarioKey = null
} = {}) {
  if (!isPlainObject(value)) throw new TypeError('invalid_published_asset_linked_family_identity');
  const allowed = new Set([
    'published_scenario_family_id', 'synthetic_scenario_family_id', 'scenario_key',
    'scenario_count', 'scenario_family_artifact_sha256',
    'publication_manifest_sha256', 'link_identity'
  ]);
  assertUc6AllowedFields(value, allowed, 'invalid_published_asset_linked_family_identity_fields');
  for (const field of ['published_scenario_family_id', 'synthetic_scenario_family_id', 'link_identity']) {
    if (typeof value[field] !== 'string' || !BOUNDED_ID_PATTERN.test(value[field])) {
      throw new TypeError(`invalid_published_asset_linked_family_${field}`);
    }
  }
  if (Object.prototype.hasOwnProperty.call(value, 'immutable_link_identity')) {
    throw new TypeError('invalid_published_asset_linked_family_identity_fields');
  }
  if (expectedFamilyId !== null && value.published_scenario_family_id !== expectedFamilyId) {
    throw new TypeError('published_scenario_render_family_mismatch');
  }
  if (value.scenario_count !== 3) throw new TypeError('invalid_published_asset_linked_family_scenario_count');
  for (const field of ['scenario_family_artifact_sha256', 'publication_manifest_sha256']) {
    if (typeof value[field] !== 'string' || !SHA256_PATTERN.test(value[field])) {
      throw new TypeError(`invalid_published_asset_linked_family_${field}`);
    }
  }
  if (requireScenarioKey) {
    if (
      !UC6_R6G_SCENARIO_KEYS.includes(value.scenario_key)
      || (expectedScenarioKey !== null && value.scenario_key !== expectedScenarioKey)
    ) {
      throw new TypeError('invalid_published_asset_linked_family_scenario_key');
    }
  } else if (Object.prototype.hasOwnProperty.call(value, 'scenario_key')) {
    throw new TypeError('unexpected_published_asset_linked_family_scenario_key');
  }
  return {
    published_scenario_family_id: value.published_scenario_family_id,
    synthetic_scenario_family_id: value.synthetic_scenario_family_id,
    ...(requireScenarioKey ? { scenario_key: value.scenario_key } : {}),
    scenario_count: 3,
    scenario_family_artifact_sha256: value.scenario_family_artifact_sha256,
    publication_manifest_sha256: value.publication_manifest_sha256,
    link_identity: value.link_identity
  };
}

function projectUc6R6gDiscoveryAsset(value) {
  if (!isPlainObject(value)) throw new TypeError('invalid_published_asset_linked_family_asset');
  assertUc6AllowedFields(value, new Set(['asset_id', 'source_pptx_sha256']), 'invalid_published_asset_linked_family_asset_fields');
  const assetId = normalizeUc6ReusableAssetId(value.asset_id);
  if (assetId !== value.asset_id) throw new TypeError('invalid_published_asset_linked_family_asset_id');
  if (typeof value.source_pptx_sha256 !== 'string' || !SHA256_PATTERN.test(value.source_pptx_sha256)) {
    throw new TypeError('invalid_published_asset_linked_family_source_sha');
  }
  return { asset_id: assetId, source_pptx_sha256: value.source_pptx_sha256 };
}

function projectUc6R6gDiscoveryScenario(value, expectedKey) {
  if (!isPlainObject(value)) throw new TypeError('invalid_published_asset_scenario');
  const allowed = new Set(['scenario_key', 'label', 'package_id', 'package_version']);
  assertUc6AllowedFields(value, allowed, 'invalid_published_asset_scenario_fields');
  if (value.scenario_key !== expectedKey) throw new TypeError('invalid_published_asset_scenario_order');
  const label = validateUc6SafePublicText(value.label, { maxLength: 256, code: 'invalid_published_asset_scenario_label' });
  if (
    typeof value.package_id !== 'string'
    || typeof value.package_version !== 'string'
    || !BOUNDED_ID_PATTERN.test(value.package_id)
    || !BOUNDED_ID_PATTERN.test(value.package_version)
  ) throw new TypeError('invalid_published_asset_scenario_package_identity');
  return {
    scenario_key: value.scenario_key,
    label,
    package_id: value.package_id,
    package_version: value.package_version
  };
}

function projectUc6R6gDiscoveryLinkedFamily(value) {
  if (!isPlainObject(value)) throw new TypeError('invalid_published_asset_linked_family_identity');
  const allowed = new Set([
    'published_scenario_family_id', 'synthetic_scenario_family_id', 'scenario_count',
    'scenario_family_artifact_sha256', 'publication_manifest_sha256', 'link_identity', 'scenarios'
  ]);
  assertUc6AllowedFields(value, allowed, 'invalid_published_asset_linked_family_identity_fields');
  for (const field of ['published_scenario_family_id', 'synthetic_scenario_family_id', 'link_identity']) {
    if (typeof value[field] !== 'string' || !BOUNDED_ID_PATTERN.test(value[field])) {
      throw new TypeError(`invalid_published_asset_linked_family_${field}`);
    }
  }
  if (value.scenario_count !== 3) throw new TypeError('invalid_published_asset_linked_family_scenario_count');
  if (!Array.isArray(value.scenarios) || value.scenarios.length !== UC6_R6G_SCENARIO_KEYS.length) {
    throw new TypeError('invalid_published_asset_scenarios_count');
  }
  for (const field of ['scenario_family_artifact_sha256', 'publication_manifest_sha256']) {
    if (typeof value[field] !== 'string' || !SHA256_PATTERN.test(value[field])) {
      throw new TypeError(`invalid_published_asset_linked_family_${field}`);
    }
  }
  return {
    published_scenario_family_id: value.published_scenario_family_id,
    synthetic_scenario_family_id: value.synthetic_scenario_family_id,
    scenario_count: 3,
    scenario_family_artifact_sha256: value.scenario_family_artifact_sha256,
    publication_manifest_sha256: value.publication_manifest_sha256,
    link_identity: value.link_identity,
    scenarios: value.scenarios.map((scenario, index) => projectUc6R6gDiscoveryScenario(scenario, UC6_R6G_SCENARIO_KEYS[index]))
  };
}

export function projectUc6PublishedAssetLinkedScenarioFamily(payload, options = {}) {
  if (!isPlainObject(payload)) throw new TypeError('invalid_published_asset_linked_family_payload');
  const allowed = new Set([
    'schema_version', 'asset', 'linked_scenario_family',
    'control_plane_contract_version', 'public_safety'
  ]);
  assertUc6AllowedFields(payload, allowed, 'invalid_published_asset_linked_family_fields');
  if (payload.schema_version !== UC6_R6G_LINKED_FAMILY_SCHEMA) throw new TypeError('invalid_published_asset_linked_family_schema');
  if (payload.public_safety !== 'PASS') throw new TypeError('invalid_published_asset_linked_family_public_safety');
  const expectedAssetId = normalizeUc6ReusableAssetId(options.expectedAssetId);
  const asset = projectUc6R6gDiscoveryAsset(payload.asset);
  if (asset.asset_id !== expectedAssetId) throw new TypeError('published_asset_linked_family_asset_mismatch');
  const linkedScenarioFamily = projectUc6R6gDiscoveryLinkedFamily(payload.linked_scenario_family);
  return {
    schema_version: payload.schema_version,
    asset,
    linked_scenario_family: linkedScenarioFamily,
    control_plane_contract_version: validateUc6ControlPlaneVersion(payload.control_plane_contract_version),
    public_safety: payload.public_safety
  };
}

export function validateUc6PublishedAssetScenarioRenderCommand(command, linkedFamilyProjection = null) {
  if (!isPlainObject(command)) return { ok: false, code: 'published_scenario_render_command_invalid', message: 'Scenario Family 생성 명령이 유효하지 않습니다.' };
  const keys = Object.keys(command).sort();
  if (keys.length !== 2 || keys[0] !== 'published_scenario_family_id' || keys[1] !== 'scenario_key') {
    return { ok: false, code: 'published_scenario_render_command_fields_invalid', message: 'Scenario Family 생성 명령 필드를 확인하세요.' };
  }
  const familyId = String(command.published_scenario_family_id || '').trim();
  const scenarioKey = String(command.scenario_key || '').trim();
  if (!BOUNDED_ID_PATTERN.test(familyId) || !UC6_R6G_SCENARIO_KEYS.includes(scenarioKey)) {
    return { ok: false, code: 'published_scenario_render_identity_invalid', message: '연결된 Scenario Family와 시나리오를 다시 확인하세요.' };
  }
  if (linkedFamilyProjection !== null) {
    const linked = linkedFamilyProjection?.linked_scenario_family;
    const scenarios = linked?.scenarios;
    if (
      !isPlainObject(linked)
      || linked.published_scenario_family_id !== familyId
      || !Array.isArray(scenarios)
      || !scenarios.some((scenario) => scenario?.scenario_key === scenarioKey)
    ) {
      return { ok: false, code: 'published_scenario_render_selection_mismatch', message: '서버가 확인한 Scenario Family 선택 상태와 일치하지 않습니다.' };
    }
  }
  return { ok: true, body: { published_scenario_family_id: familyId, scenario_key: scenarioKey } };
}

function projectUc6R6gBoundPackage(value) {
  if (!isPlainObject(value)) throw new TypeError('invalid_published_scenario_bound_package');
  const allowed = new Set(['package_id', 'package_version', 'title', 'package_manifest_sha256', 'source_context_bundle_sha256']);
  assertUc6AllowedFields(value, allowed, 'invalid_published_scenario_bound_package_fields');
  if (typeof value.package_id !== 'string' || !BOUNDED_ID_PATTERN.test(value.package_id)) {
    throw new TypeError('invalid_published_scenario_bound_package_identity');
  }
  const packageVersion = validateUc6SafePublicText(value.package_version, { maxLength: 128, code: 'invalid_published_scenario_bound_package_version' });
  const title = validateUc6SafePublicText(value.title, { maxLength: 256, code: 'invalid_published_scenario_bound_package_title' });
  for (const field of ['package_manifest_sha256', 'source_context_bundle_sha256']) {
    if (typeof value[field] !== 'string' || !SHA256_PATTERN.test(value[field])) {
      throw new TypeError('invalid_published_scenario_bound_package_sha');
    }
  }
  return {
    package_id: value.package_id,
    package_version: packageVersion,
    title,
    package_manifest_sha256: value.package_manifest_sha256,
    source_context_bundle_sha256: value.source_context_bundle_sha256
  };
}

function projectUc6R6gSubmissionBoundPackage(value) {
  if (!isPlainObject(value)) throw new TypeError('invalid_published_scenario_render_submission_bound_package');
  const allowed = new Set(['package_id', 'package_version', 'title', 'source_context_bundle_sha256']);
  assertUc6AllowedFields(value, allowed, 'invalid_published_scenario_render_submission_bound_package_fields');
  if (typeof value.package_id !== 'string' || !BOUNDED_ID_PATTERN.test(value.package_id)) {
    throw new TypeError('invalid_published_scenario_render_submission_package_id');
  }
  const packageVersion = validateUc6SafePublicText(value.package_version, {
    maxLength: 128,
    code: 'invalid_published_scenario_render_submission_package_version'
  });
  const title = validateUc6SafePublicText(value.title, {
    maxLength: 256,
    code: 'invalid_published_scenario_render_submission_package_title'
  });
  if (typeof value.source_context_bundle_sha256 !== 'string' || !SHA256_PATTERN.test(value.source_context_bundle_sha256)) {
    throw new TypeError('invalid_published_scenario_render_submission_package_sha');
  }
  return {
    package_id: value.package_id,
    package_version: packageVersion,
    title,
    source_context_bundle_sha256: value.source_context_bundle_sha256
  };
}

export function projectUc6PublishedAssetScenarioRenderSubmission(payload, options = {}) {
  if (!isPlainObject(payload)) throw new TypeError('invalid_published_scenario_render_submission_payload');
  const allowed = new Set([
    'schema_version', 'job_id', 'task_type', 'task_id', 'queue_status', 'created',
    'state', 'asset', 'linked_scenario_family', 'bound_package',
    'control_plane_contract_version', 'public_safety'
  ]);
  assertUc6AllowedFields(payload, allowed, 'invalid_published_scenario_render_submission_fields');
  const expectedAssetId = normalizeUc6ReusableAssetId(options.expectedAssetId);
  if (typeof options.expectedPublishedScenarioFamilyId !== 'string' || !BOUNDED_ID_PATTERN.test(options.expectedPublishedScenarioFamilyId)) {
    throw new TypeError('invalid_expected_published_scenario_family_id');
  }
  if (!UC6_R6G_SCENARIO_KEYS.includes(options.expectedScenarioKey)) {
    throw new TypeError('invalid_expected_published_scenario_key');
  }
  if (payload.schema_version !== UC6_R6G_SUBMISSION_SCHEMA) throw new TypeError('invalid_published_scenario_render_submission_schema');
  const jobId = normalizeUc6JobId(payload.job_id);
  if (payload.task_type !== UC6_R6G_TASK_TYPE) throw new TypeError('invalid_published_scenario_render_submission_task_type');
  if (!Number.isSafeInteger(payload.task_id) || payload.task_id <= 0) throw new TypeError('invalid_published_scenario_render_submission_task_id');
  if (!KNOWN_QUEUE_STATUSES.has(payload.queue_status) || payload.queue_status !== 'pending' || payload.state !== 'render_queued') {
    throw new TypeError('invalid_published_scenario_render_submission_queue_state');
  }
  if (typeof payload.created !== 'boolean') throw new TypeError('invalid_published_scenario_render_submission_created');
  if (payload.public_safety !== 'PASS') throw new TypeError('invalid_published_scenario_render_submission_public_safety');
  const asset = projectUc6R6gDiscoveryAsset(payload.asset);
  if (asset.asset_id !== expectedAssetId) throw new TypeError('published_scenario_render_submission_asset_mismatch');
  const linkedScenarioFamily = projectUc6R6gLinkedFamilyIdentity(payload.linked_scenario_family, {
    requireScenarioKey: true,
    expectedFamilyId: options.expectedPublishedScenarioFamilyId,
    expectedScenarioKey: options.expectedScenarioKey
  });
  return {
    schema_version: payload.schema_version,
    job_id: jobId,
    task_type: payload.task_type,
    task_id: payload.task_id,
    queue_status: payload.queue_status,
    created: payload.created,
    state: payload.state,
    asset,
    linked_scenario_family: linkedScenarioFamily,
    bound_package: projectUc6R6gSubmissionBoundPackage(payload.bound_package),
    control_plane_contract_version: validateUc6ControlPlaneVersion(payload.control_plane_contract_version),
    public_safety: payload.public_safety
  };
}

function projectUc6R6gNonNegativeCount(value, code) {
  if (!Number.isSafeInteger(value) || value < 0) throw new TypeError(code);
  return value;
}

function projectUc6R6gAssetIdentity(value, expectedAssetId) {
  if (!isPlainObject(value) || normalizeUc6ReusableAssetId(value.asset_id) !== expectedAssetId) {
    throw new TypeError('published_scenario_render_result_asset_mismatch');
  }
  const allowed = new Set([
    'asset_id', 'source_pptx_sha256', 'asset_manifest_sha256',
    'catalog_entry_sha256', 'approval_receipt_sha256'
  ]);
  assertUc6AllowedFields(value, allowed, 'invalid_published_scenario_render_result_asset_fields');
  const projection = { asset_id: value.asset_id };
  for (const field of ['source_pptx_sha256', 'asset_manifest_sha256', 'catalog_entry_sha256', 'approval_receipt_sha256']) {
    if (!SHA256_PATTERN.test(value[field])) throw new TypeError('invalid_published_scenario_render_result_asset_sha');
    projection[field] = value[field];
  }
  return projection;
}

function projectUc6R6gProviderExecution(value) {
  if (!isPlainObject(value)) throw new TypeError('invalid_published_scenario_provider_execution');
  const allowed = new Set([
    'actual_provider_call_count', 'logical_provider_call_count', 'provider_attempt_count',
    'retry_count', 'receipt_replay_count', 'checkpoint_replay_count'
  ]);
  assertUc6AllowedFields(value, allowed, 'invalid_published_scenario_provider_execution_fields');
  const projected = {};
  for (const key of allowed) {
    projected[key] = projectUc6R6gNonNegativeCount(value[key], `invalid_published_scenario_provider_execution_${key}`);
  }
  return projected;
}

function projectUc6R6gResultPublicSafety(value) {
  if (value === 'PASS') return value;
  if (!isPlainObject(value)) throw new TypeError('invalid_published_scenario_render_result_public_safety');
  const entries = Object.entries(value);
  if (entries.length < 1 || entries.length > 32) {
    throw new TypeError('invalid_published_scenario_render_result_public_safety');
  }
  const projected = {};
  for (const [flag, exposed] of entries) {
    if (!BOUNDED_ID_PATTERN.test(flag) || exposed !== false) {
      throw new TypeError('invalid_published_scenario_render_result_public_safety');
    }
    projected[flag] = false;
  }
  return projected;
}

export function projectUc6PublishedAssetScenarioRenderResult(payload, options = {}) {
  if (!isPlainObject(payload) || payload.schema_version !== UC6_R6G_RESULT_SCHEMA) {
    throw new TypeError('invalid_published_scenario_render_result_schema');
  }
  const allowed = new Set([
    'schema_version', 'status', 'job_id', 'task_type', 'artifact_id', 'artifact_visibility',
    'asset', 'linked_scenario_family',
    'bound_package', 'provider_profile_id', 'source_generation_batch_count',
    'provider_call_count', 'generation_unit_count', 'slot_count', 'generated_slot_count',
    'private_fallback_slot_count', 'active_canonical_source_groups', 'render_state',
    'review_state', 'publication_state', 'publication_requires_manual_admin_action',
    'promotion_eligible', 'final_artifacts', 'blocking_issue_count',
    'red_physical_mutation_failure_count', 'provider_execution',
    'control_plane_contract_version', 'public_safety'
  ]);
  assertUc6AllowedFields(payload, allowed, 'invalid_published_scenario_render_result_fields');
  const expectedJobId = normalizeUc6JobId(options.expectedJobId);
  const expectedAssetId = normalizeUc6ReusableAssetId(options.expectedAssetId);
  if (payload.job_id !== expectedJobId || payload.task_type !== UC6_R6G_TASK_TYPE) {
    throw new TypeError('invalid_published_scenario_render_result_identity');
  }
  if (
    payload.artifact_id !== 'browser_admin_uc6_published_asset_scenario_render_result'
    || payload.artifact_visibility !== 'public'
  ) throw new TypeError('invalid_published_scenario_render_result_artifact_identity');
  if (
    payload.status !== 'completed'
    || payload.render_state !== 'render_completed'
    || payload.review_state !== 'not_required'
    || payload.publication_state !== 'not_applicable'
    || payload.publication_requires_manual_admin_action !== false
    || payload.promotion_eligible !== false
  ) throw new TypeError('invalid_published_scenario_render_result_terminal_state');
  const publicSafety = projectUc6R6gResultPublicSafety(payload.public_safety);
  const counts = {};
  for (const field of [
    'source_generation_batch_count', 'provider_call_count', 'generation_unit_count',
    'slot_count', 'generated_slot_count', 'private_fallback_slot_count',
    'blocking_issue_count', 'red_physical_mutation_failure_count'
  ]) counts[field] = projectUc6R6gNonNegativeCount(payload[field], `invalid_published_scenario_render_result_${field}`);
  if (counts.generation_unit_count <= 0 || counts.slot_count <= 0) throw new TypeError('invalid_published_scenario_render_result_work_count');
  if (counts.generated_slot_count + counts.private_fallback_slot_count !== counts.slot_count) {
    throw new TypeError('published_scenario_render_result_slot_count_mismatch');
  }
  if (counts.blocking_issue_count !== 0 || counts.red_physical_mutation_failure_count !== 0) {
    throw new TypeError('invalid_published_scenario_render_result_success_counts');
  }
  if (!BOUNDED_ID_PATTERN.test(payload.provider_profile_id)) throw new TypeError('invalid_published_scenario_render_result_provider_profile');
  if (!Array.isArray(payload.active_canonical_source_groups) || payload.active_canonical_source_groups.length > 128) {
    throw new TypeError('invalid_published_scenario_render_result_source_groups');
  }
  const seenGroups = new Set();
  const activeCanonicalSourceGroups = payload.active_canonical_source_groups.map((group) => {
    if (typeof group !== 'string' || !BOUNDED_ID_PATTERN.test(group) || seenGroups.has(group)) {
      throw new TypeError('invalid_published_scenario_render_result_source_group');
    }
    seenGroups.add(group);
    return group;
  });
  if (!isPlainObject(payload.final_artifacts)) throw new TypeError('invalid_published_scenario_render_final_artifacts');
  const projected = {
    schema_version: payload.schema_version,
    status: payload.status,
    state: payload.render_state,
    job_id: payload.job_id,
    task_type: payload.task_type,
    artifact_id: payload.artifact_id,
    artifact_visibility: payload.artifact_visibility,
    asset: projectUc6R6gAssetIdentity(payload.asset, expectedAssetId),
    linked_scenario_family: projectUc6R6gLinkedFamilyIdentity(payload.linked_scenario_family, { requireScenarioKey: true }),
    bound_package: projectUc6R6gBoundPackage(payload.bound_package),
    provider_profile_id: payload.provider_profile_id,
    ...counts,
    active_canonical_source_groups: activeCanonicalSourceGroups,
    render_state: payload.render_state,
    review_state: payload.review_state,
    publication_state: payload.publication_state,
    publication_requires_manual_admin_action: payload.publication_requires_manual_admin_action,
    promotion_eligible: payload.promotion_eligible,
    final_artifacts: {
      pptx: projectUc6A8gFinalArtifact(payload.final_artifacts.pptx, 'final_render_output_pptx'),
      pdf: projectUc6A8gFinalArtifact(payload.final_artifacts.pdf, 'final_render_output_pdf')
    },
    public_safety: publicSafety
  };
  if (Object.prototype.hasOwnProperty.call(payload, 'provider_execution')) {
    projected.provider_execution = projectUc6R6gProviderExecution(payload.provider_execution);
  }
  if (Object.prototype.hasOwnProperty.call(payload, 'control_plane_contract_version')) {
    projected.control_plane_contract_version = validateUc6ControlPlaneVersion(payload.control_plane_contract_version);
  }
  return projected;
}

export function projectUc6PublishedAssetScenarioRenderJobStatus(payload, options = {}) {
  if (!isPlainObject(payload)) throw new TypeError('invalid_published_scenario_render_job_payload');
  assertUc6AllowedFields(
    payload,
    new Set(['job_id', 'state', 'source', 'render', 'control_plane_contract_version']),
    'invalid_published_scenario_render_job_fields'
  );
  const expectedJobId = normalizeUc6JobId(options.expectedJobId);
  if (payload.job_id !== expectedJobId || !KNOWN_RENDER_STATES.has(payload.state)) {
    throw new TypeError('invalid_published_scenario_render_job_identity');
  }
  const source = projectUc6FreshOnboardingSource(payload.source);
  const controlPlaneContractVersion = validateUc6ControlPlaneVersion(payload.control_plane_contract_version);
  if (payload.state !== 'render_completed') {
    if (payload.render !== undefined) throw new TypeError('non_completed_published_scenario_render_must_not_have_result');
    return { job_id: payload.job_id, state: payload.state, source, render: null, control_plane_contract_version: controlPlaneContractVersion };
  }
  const render = projectUc6PublishedAssetScenarioRenderResult(payload.render, options);
  if (render.asset.source_pptx_sha256 !== source.sha256) throw new TypeError('published_scenario_render_result_lineage_mismatch');
  return { ...render, state: 'render_completed', source, render, control_plane_contract_version: controlPlaneContractVersion };
}

const KNOWN_PACKAGE_STATUSES = new Set(['active']);
const QUEUE_STATE_MAP = Object.freeze({
  pending: 'render_queued',
  processing: 'render_running',
  done: 'render_completed',
  failed: 'failed'
});

export function projectUc6DummyDatabagPackageOptions(payload, options = {}) {
  if (!isPlainObject(payload)) throw new TypeError('invalid_package_options_payload');
  const expectedJobId = normalizeUc6JobId(options.expectedJobId);
  if (payload.schema_version !== 'uc6_e2e4c2c_a8d_browser_admin_dummy_databag_package_options_v1') {
    throw new TypeError('invalid_package_options_schema');
  }
  if (payload.job_id !== expectedJobId) throw new TypeError('invalid_package_options_job_id');
  if (payload.public_safety !== 'PASS') throw new TypeError('invalid_package_options_public_safety');
  if (!KNOWN_COMPATIBILITY_STATES.has(payload.compatibility_state)) throw new TypeError('invalid_package_options_compatibility_state');
  if (!KNOWN_SELECTION_STATES.has(payload.selection_state)) throw new TypeError('invalid_package_options_selection_state');

  const topSourceSha = typeof payload.source_pptx_sha256 === 'string' ? payload.source_pptx_sha256 : '';
  if (!SHA256_PATTERN.test(topSourceSha)) {
    throw new TypeError('invalid_package_options_source_sha');
  }

  if (!Array.isArray(payload.packages)) throw new TypeError('invalid_package_options_packages');
  if (!Number.isInteger(payload.package_count) || payload.package_count !== payload.packages.length || payload.package_count < 0) {
    throw new TypeError('invalid_package_options_package_count');
  }

  if (payload.compatibility_state === 'incompatible_source_pptx') {
    if (payload.package_count !== 0 || payload.packages.length !== 0) throw new TypeError('incompatible_source_pptx_packages_must_be_empty');
    if (payload.template_profile !== null && payload.template_profile !== undefined) throw new TypeError('incompatible_source_pptx_template_profile_must_be_null');
    if (payload.selection_state !== 'unbound') throw new TypeError('incompatible_source_pptx_selection_state_must_be_unbound');
    if (payload.bound_package !== null && payload.bound_package !== undefined) throw new TypeError('incompatible_source_pptx_bound_package_must_be_null');
  }

  let templateProfile = null;
  if (payload.compatibility_state === 'compatible') {
    if (!payload.template_profile || !isPlainObject(payload.template_profile)) {
      throw new TypeError('compatible_requires_template_profile');
    }
    const profId = String(payload.template_profile.profile_id || '').trim();
    const profVer = String(payload.template_profile.profile_version || '').trim();
    const genCount = payload.template_profile.generation_unit_count;
    const slotCount = payload.template_profile.fillable_slot_count;
    if (!profId || !BOUNDED_ID_PATTERN.test(profId)) throw new TypeError('invalid_template_profile_id');
    if (!profVer || !BOUNDED_ID_PATTERN.test(profVer)) throw new TypeError('invalid_template_profile_version');
    if (!Number.isInteger(genCount) || genCount < 0) throw new TypeError('invalid_template_profile_gen_count');
    if (!Number.isInteger(slotCount) || slotCount < 0) throw new TypeError('invalid_template_profile_slot_count');
    templateProfile = {
      profile_id: profId,
      profile_version: profVer,
      generation_unit_count: genCount,
      fillable_slot_count: slotCount
    };
  }

  let boundPackage = null;
  if (payload.bound_package !== null && payload.bound_package !== undefined) {
    if (!isPlainObject(payload.bound_package)) throw new TypeError('invalid_bound_package');
    const bId = payload.bound_package.package_id;
    const bVer = payload.bound_package.package_version;
    const bTitle = payload.bound_package.title;
    const bDesc = payload.bound_package.description;
    if (typeof bId !== 'string' || !BOUNDED_ID_PATTERN.test(bId) || typeof bVer !== 'string' || !BOUNDED_ID_PATTERN.test(bVer)) {
      throw new TypeError('invalid_bound_package_identity');
    }
    if (typeof bTitle !== 'string' || bTitle.trim() === '' || bTitle.length > 256) {
      throw new TypeError('invalid_bound_package_title');
    }
    if (typeof bDesc !== 'string' || bDesc.length > 1024) {
      throw new TypeError('invalid_bound_package_description');
    }
    boundPackage = {
      package_id: bId,
      package_version: bVer,
      title: bTitle.trim(),
      description: bDesc.trim()
    };
  }

  if (payload.selection_state === 'unbound' && boundPackage !== null) {
    throw new TypeError('unbound_selection_state_must_have_null_bound_package');
  }
  if (payload.selection_state === 'bound' && !boundPackage) {
    throw new TypeError('invalid_bound_package_selection_state');
  }

  const seenKeys = new Set();
  const packages = payload.packages.map((pkg) => {
    if (!isPlainObject(pkg)) throw new TypeError('invalid_package_item');
    if (pkg.schema_version !== 'uc6_a8c_dummy_databag_package_public_projection_v1') {
      throw new TypeError('invalid_package_item_schema');
    }
    if (typeof pkg.package_id !== 'string' || !BOUNDED_ID_PATTERN.test(pkg.package_id)) throw new TypeError('invalid_package_id');
    if (typeof pkg.package_version !== 'string' || !BOUNDED_ID_PATTERN.test(pkg.package_version)) throw new TypeError('invalid_package_version');
    if (typeof pkg.title !== 'string' || pkg.title.trim() === '' || pkg.title.length > 256) throw new TypeError('invalid_package_title');
    if (typeof pkg.description !== 'string' || pkg.description.length > 1024) throw new TypeError('invalid_package_description');
    if (typeof pkg.template_family_id !== 'string' || !BOUNDED_ID_PATTERN.test(pkg.template_family_id)) throw new TypeError('invalid_template_family_id');
    if (typeof pkg.source_pptx_sha256 !== 'string' || !SHA256_PATTERN.test(pkg.source_pptx_sha256)) throw new TypeError('invalid_package_source_sha');
    if (topSourceSha && pkg.source_pptx_sha256 !== topSourceSha) {
      throw new TypeError('package_source_sha_mismatch');
    }
    if (typeof pkg.canonical_sha256 !== 'string' || !SHA256_PATTERN.test(pkg.canonical_sha256)) throw new TypeError('invalid_package_canonical_sha');
    if (!Number.isInteger(pkg.supported_canonical_source_group_count) || pkg.supported_canonical_source_group_count < 0) {
      throw new TypeError('invalid_package_group_count');
    }
    if (!KNOWN_PACKAGE_STATUSES.has(pkg.status)) throw new TypeError('invalid_package_status');

    const key = `${pkg.package_id}:${pkg.package_version}`;
    if (seenKeys.has(key)) throw new TypeError('duplicate_package_identity');
    seenKeys.add(key);

    return {
      schema_version: pkg.schema_version,
      package_id: pkg.package_id,
      package_version: pkg.package_version,
      title: pkg.title.trim(),
      description: pkg.description.trim(),
      template_family_id: pkg.template_family_id,
      source_pptx_sha256: pkg.source_pptx_sha256,
      supported_canonical_source_group_count: pkg.supported_canonical_source_group_count,
      status: pkg.status,
      canonical_sha256: pkg.canonical_sha256
    };
  });

  if (boundPackage) {
    const matched = packages.find((p) => p.package_id === boundPackage.package_id && p.package_version === boundPackage.package_version);
    if (!matched) throw new TypeError('bound_package_not_in_package_list');
    if (!boundPackage.title && matched.title) boundPackage.title = matched.title;
    if (!boundPackage.description && matched.description) boundPackage.description = matched.description;
  }

  return {
    schema_version: payload.schema_version,
    job_id: payload.job_id,
    source_pptx_sha256: topSourceSha,
    compatibility_state: payload.compatibility_state,
    template_profile: templateProfile,
    package_count: packages.length,
    packages,
    selection_state: payload.selection_state,
    bound_package: boundPackage,
    control_plane_contract_version: payload.control_plane_contract_version || '',
    public_safety: payload.public_safety
  };
}

const UC6_R6A_PACKAGE_FAMILY_OPTIONS_SCHEMA = 'uc6_a9_0g2a_r6a_browser_admin_dummy_databag_package_family_options_v1';
const UC6_R6D2B_PACKAGE_FAMILY_OPTIONS_SCHEMA = 'uc6_a9_0g2a_r6d2b_browser_admin_dummy_databag_package_family_options_v1';
const UC6_R6A_PACKAGE_FAMILY_SCHEMA = 'uc6_a9_0g2a_r6a_dummy_databag_package_family_projection_v1';
const UC6_DUMMY_PACKAGE_PUBLIC_SCHEMA = 'uc6_a8c_dummy_databag_package_public_projection_v1';
const UC6_R6D2B_FRESH_PROFILE_SCHEMA = 'uc6_a9_0g2a_r6d2b_fresh_same_job_r1_template_profile_projection_v1';
const FRESH_COMPATIBILITY_STATES = new Set(['fresh_onboarding_not_ready', 'fresh_onboarding_blocked', 'compatible', 'no_compatible_packages']);

function projectUc6R6cTemplateProfile(value) {
  if (!isPlainObject(value)) throw new TypeError('invalid_package_family_template_profile');
  if (typeof value.profile_id !== 'string' || !BOUNDED_ID_PATTERN.test(value.profile_id)) {
    throw new TypeError('invalid_package_family_template_profile_id');
  }
  if (typeof value.profile_version !== 'string' || !BOUNDED_ID_PATTERN.test(value.profile_version)) {
    throw new TypeError('invalid_package_family_template_profile_version');
  }
  if (!Number.isInteger(value.generation_unit_count) || value.generation_unit_count < 0) {
    throw new TypeError('invalid_package_family_generation_unit_count');
  }
  if (!Number.isInteger(value.fillable_slot_count) || value.fillable_slot_count < 0) {
    throw new TypeError('invalid_package_family_fillable_slot_count');
  }
  return {
    profile_id: value.profile_id,
    profile_version: value.profile_version,
    generation_unit_count: value.generation_unit_count,
    fillable_slot_count: value.fillable_slot_count
  };
}

function projectUc6R6cPackageVariant(value, { expectedSourceSha, expectedTemplateFamilyId } = {}) {
  if (!isPlainObject(value)) throw new TypeError('invalid_package_family_variant');
  if (value.schema_version !== UC6_DUMMY_PACKAGE_PUBLIC_SCHEMA) {
    throw new TypeError('invalid_package_family_variant_schema');
  }
  if (typeof value.package_id !== 'string' || !BOUNDED_ID_PATTERN.test(value.package_id)) {
    throw new TypeError('invalid_package_family_variant_id');
  }
  if (typeof value.package_version !== 'string' || !BOUNDED_ID_PATTERN.test(value.package_version)) {
    throw new TypeError('invalid_package_family_variant_version');
  }
  const title = validateUc6SafePublicText(value.title, {
    maxLength: 256,
    code: 'invalid_package_family_variant_title'
  });
  const description = validateUc6SafePublicText(value.description, {
    maxLength: 1024,
    allowEmpty: true,
    code: 'invalid_package_family_variant_description'
  });
  if (typeof value.template_family_id !== 'string' || !BOUNDED_ID_PATTERN.test(value.template_family_id)) {
    throw new TypeError('invalid_package_family_variant_template_family_id');
  }
  if (value.template_family_id !== expectedTemplateFamilyId) {
    throw new TypeError('package_family_variant_template_family_mismatch');
  }
  if (typeof value.source_pptx_sha256 !== 'string' || !SHA256_PATTERN.test(value.source_pptx_sha256)) {
    throw new TypeError('invalid_package_family_variant_source_sha');
  }
  if (value.source_pptx_sha256 !== expectedSourceSha) {
    throw new TypeError('package_family_variant_source_sha_mismatch');
  }
  if (!Number.isInteger(value.supported_canonical_source_group_count) || value.supported_canonical_source_group_count < 0) {
    throw new TypeError('invalid_package_family_variant_group_count');
  }
  if (value.status !== 'active') throw new TypeError('invalid_package_family_variant_status');
  if (typeof value.canonical_sha256 !== 'string' || !SHA256_PATTERN.test(value.canonical_sha256)) {
    throw new TypeError('invalid_package_family_variant_canonical_sha');
  }
  return {
    schema_version: value.schema_version,
    package_id: value.package_id,
    package_version: value.package_version,
    title,
    description,
    template_family_id: value.template_family_id,
    source_pptx_sha256: value.source_pptx_sha256,
    supported_canonical_source_group_count: value.supported_canonical_source_group_count,
    status: value.status,
    canonical_sha256: value.canonical_sha256
  };
}

function projectUc6R6cBoundPackage(value) {
  if (!isPlainObject(value)) throw new TypeError('invalid_package_family_bound_package');
  if (typeof value.package_id !== 'string' || !BOUNDED_ID_PATTERN.test(value.package_id)) {
    throw new TypeError('invalid_package_family_bound_package_id');
  }
  if (typeof value.package_version !== 'string' || !BOUNDED_ID_PATTERN.test(value.package_version)) {
    throw new TypeError('invalid_package_family_bound_package_version');
  }
  return {
    package_id: value.package_id,
    package_version: value.package_version,
    title: validateUc6SafePublicText(value.title, {
      maxLength: 256,
      code: 'invalid_package_family_bound_package_title'
    }),
    description: validateUc6SafePublicText(value.description, {
      maxLength: 1024,
      allowEmpty: true,
      code: 'invalid_package_family_bound_package_description'
    })
  };
}

function projectUc6FreshSourceGroups(value, code) {
  if (!Array.isArray(value) || value.length > 64) throw new TypeError(code);
  const seen = new Set();
  return value.map((item) => {
    const projected = validateUc6SafePublicText(item, { maxLength: 128, code });
    if (seen.has(projected)) throw new TypeError(code);
    seen.add(projected);
    return projected;
  });
}

function projectUc6FreshTemplateProfile(value, expectedSourceSha) {
  if (!isPlainObject(value)) throw new TypeError('invalid_fresh_template_profile');
  if (value.schema_version !== UC6_R6D2B_FRESH_PROFILE_SCHEMA) throw new TypeError('invalid_fresh_template_profile_schema');
  if (value.profile_origin !== 'fresh_same_job') throw new TypeError('invalid_fresh_template_profile_origin');
  if (value.profile_id !== undefined || value.profile_version !== undefined || value.template_family_id !== undefined) {
    throw new TypeError('invalid_fresh_template_profile_identity');
  }
  if (typeof value.source_pptx_sha256 !== 'string' || !SHA256_PATTERN.test(value.source_pptx_sha256) || value.source_pptx_sha256 !== expectedSourceSha) {
    throw new TypeError('invalid_fresh_template_profile_source_sha');
  }
  if (typeof value.delivery_bundle_id !== 'string' || !BOUNDED_ID_PATTERN.test(value.delivery_bundle_id)) {
    throw new TypeError('invalid_fresh_template_profile_delivery_bundle_id');
  }
  if (!Number.isInteger(value.generation_unit_count) || value.generation_unit_count < 0) {
    throw new TypeError('invalid_fresh_template_profile_generation_unit_count');
  }
  if (!Number.isInteger(value.fillable_slot_count) || value.fillable_slot_count < 0) {
    throw new TypeError('invalid_fresh_template_profile_fillable_slot_count');
  }
  for (const field of [
    'authoritative_generation_unit_delivery_sha256',
    'private_renderer_fallback_lineage_sha256',
    'authoritative_delivery_boundary_validation_sha256'
  ]) {
    if (typeof value[field] !== 'string' || !SHA256_PATTERN.test(value[field])) {
      throw new TypeError(`invalid_fresh_template_profile_${field}`);
    }
  }
  return {
    schema_version: value.schema_version,
    profile_origin: value.profile_origin,
    source_pptx_sha256: value.source_pptx_sha256,
    delivery_bundle_id: value.delivery_bundle_id,
    generation_unit_count: value.generation_unit_count,
    fillable_slot_count: value.fillable_slot_count,
    authoritative_generation_unit_delivery_sha256: value.authoritative_generation_unit_delivery_sha256,
    private_renderer_fallback_lineage_sha256: value.private_renderer_fallback_lineage_sha256,
    authoritative_delivery_boundary_validation_sha256: value.authoritative_delivery_boundary_validation_sha256,
    required_authoritative_source_groups: projectUc6FreshSourceGroups(value.required_authoritative_source_groups, 'invalid_fresh_template_profile_required_source_groups'),
    supporting_source_groups: projectUc6FreshSourceGroups(value.supporting_source_groups, 'invalid_fresh_template_profile_supporting_source_groups')
  };
}

function projectUc6FreshCompatibilityMetadata(value, allowNullIdentity) {
  if (value === null && allowNullIdentity) return null;
  if (!isPlainObject(value)) throw new TypeError('invalid_fresh_compatibility_metadata');
  const templateFamilyId = value.template_family_id;
  if (templateFamilyId !== null && (typeof templateFamilyId !== 'string' || !BOUNDED_ID_PATTERN.test(templateFamilyId))) {
    throw new TypeError('invalid_fresh_compatibility_template_family_id');
  }
  if (!allowNullIdentity && templateFamilyId === null) throw new TypeError('invalid_fresh_compatibility_template_family_id');
  if (!Number.isInteger(value.source_matched_package_count) || value.source_matched_package_count < 0) {
    throw new TypeError('invalid_fresh_source_matched_package_count');
  }
  if (templateFamilyId === null && value.source_matched_package_count !== 0) {
    throw new TypeError('invalid_fresh_null_compatibility_identity_package_count');
  }
  return {
    template_family_id: templateFamilyId,
    source_matched_package_count: value.source_matched_package_count
  };
}

function projectUc6FreshPackageFamilyOptions(payload, expectedJobId) {
  if (payload.job_id !== expectedJobId) throw new TypeError('invalid_package_family_options_job_id');
  if (payload.public_safety !== 'PASS') throw new TypeError('invalid_package_family_options_public_safety');
  if (!KNOWN_ONBOARDING_STATES.has(payload.onboarding_state)) throw new TypeError('invalid_fresh_onboarding_state');
  if (!FRESH_COMPATIBILITY_STATES.has(payload.compatibility_state)) throw new TypeError('invalid_fresh_compatibility_state');
  if (payload.selection_state !== 'binding_deferred') throw new TypeError('invalid_fresh_selection_state');
  if (payload.bound_package_family_id !== null || payload.bound_package !== null) throw new TypeError('invalid_fresh_bound_package');
  if (typeof payload.source_pptx_sha256 !== 'string' || !SHA256_PATTERN.test(payload.source_pptx_sha256)) {
    throw new TypeError('invalid_package_family_options_source_sha');
  }
  if (!Array.isArray(payload.package_families)) throw new TypeError('invalid_package_family_options_families');
  if (!Number.isInteger(payload.package_family_count) || payload.package_family_count < 0 || payload.package_family_count !== payload.package_families.length) {
    throw new TypeError('invalid_package_family_options_family_count');
  }
  const waiting = payload.onboarding_state === 'onboarding_queued' || payload.onboarding_state === 'onboarding_running';
  const blocked = payload.onboarding_state === 'onboarding_blocked';
  const ready = payload.onboarding_state === 'onboarding_ready';
  if (
    (waiting && payload.compatibility_state !== 'fresh_onboarding_not_ready')
    || (blocked && payload.compatibility_state !== 'fresh_onboarding_blocked')
    || (ready && payload.compatibility_state !== 'compatible' && payload.compatibility_state !== 'no_compatible_packages')
  ) {
    throw new TypeError('invalid_fresh_onboarding_compatibility_combination');
  }
  if (!waiting && !blocked && !ready) throw new TypeError('invalid_fresh_onboarding_state');
  const compatibilityMetadata = projectUc6FreshCompatibilityMetadata(
    payload.compatibility_metadata,
    payload.compatibility_state !== 'compatible'
  );
  const controlPlaneContractVersion = validateUc6ControlPlaneVersion(payload.control_plane_contract_version);

  if (waiting || blocked) {
    if (payload.template_profile !== null || payload.package_family_count !== 0) throw new TypeError('invalid_fresh_non_ready_options');
    return {
      schema_version: payload.schema_version,
      job_id: payload.job_id,
      source_pptx_sha256: payload.source_pptx_sha256,
      onboarding_state: payload.onboarding_state,
      compatibility_state: payload.compatibility_state,
      template_profile: null,
      compatibility_metadata: compatibilityMetadata,
      package_family_count: 0,
      package_families: [],
      package_count: 0,
      packages: [],
      selection_state: payload.selection_state,
      bound_package_family_id: null,
      bound_package: null,
      control_plane_contract_version: controlPlaneContractVersion,
      public_safety: payload.public_safety
    };
  }

  const templateProfile = projectUc6FreshTemplateProfile(payload.template_profile, payload.source_pptx_sha256);
  if (payload.compatibility_state === 'compatible' && payload.package_family_count < 1) throw new TypeError('fresh_compatible_requires_package_family');
  if (payload.compatibility_state === 'no_compatible_packages' && payload.package_family_count !== 0) {
    throw new TypeError('fresh_no_compatible_packages_requires_empty_families');
  }
  const seenFamilyIds = new Set();
  const seenPackageIdentities = new Set();
  const packages = [];
  const packageFamilies = payload.package_families.map((family) => {
    if (!isPlainObject(family) || family.schema_version !== UC6_R6A_PACKAGE_FAMILY_SCHEMA) throw new TypeError('invalid_package_family_schema');
    if (typeof family.package_family_id !== 'string' || !BOUNDED_ID_PATTERN.test(family.package_family_id)) throw new TypeError('invalid_package_family_id');
    if (seenFamilyIds.has(family.package_family_id)) throw new TypeError('duplicate_package_family_id');
    seenFamilyIds.add(family.package_family_id);
    const title = validateUc6SafePublicText(family.title, { maxLength: 256, code: 'invalid_package_family_title' });
    const description = validateUc6SafePublicText(family.description, { maxLength: 1024, allowEmpty: true, code: 'invalid_package_family_description' });
    if (!Array.isArray(family.variants) || !Number.isInteger(family.variant_count) || family.variant_count < 1 || family.variant_count !== family.variants.length) {
      throw new TypeError('invalid_package_family_variant_count');
    }
    const variants = family.variants.map((variant) => {
      const projected = projectUc6R6cPackageVariant(variant, {
        expectedSourceSha: payload.source_pptx_sha256,
        expectedTemplateFamilyId: compatibilityMetadata.template_family_id
      });
      const identity = `${projected.package_id}:${projected.package_version}`;
      if (seenPackageIdentities.has(identity)) throw new TypeError('duplicate_package_identity_across_families');
      seenPackageIdentities.add(identity);
      packages.push(projected);
      return projected;
    });
    return { schema_version: family.schema_version, package_family_id: family.package_family_id, title, description, variant_count: variants.length, variants };
  });
  return {
    schema_version: payload.schema_version,
    job_id: payload.job_id,
    source_pptx_sha256: payload.source_pptx_sha256,
    onboarding_state: payload.onboarding_state,
    compatibility_state: payload.compatibility_state,
    template_profile: templateProfile,
    compatibility_metadata: compatibilityMetadata,
    package_family_count: packageFamilies.length,
    package_families: packageFamilies,
    package_count: packages.length,
    packages,
    selection_state: payload.selection_state,
    bound_package_family_id: null,
    bound_package: null,
    control_plane_contract_version: controlPlaneContractVersion,
    public_safety: payload.public_safety
  };
}

export function projectUc6DummyDatabagPackageFamilyOptions(payload, options = {}) {
  if (!isPlainObject(payload)) throw new TypeError('invalid_package_family_options_payload');
  const expectedJobId = normalizeUc6JobId(options.expectedJobId);
  if (payload.schema_version === UC6_R6D2B_PACKAGE_FAMILY_OPTIONS_SCHEMA) {
    return projectUc6FreshPackageFamilyOptions(payload, expectedJobId);
  }
  if (payload.schema_version !== UC6_R6A_PACKAGE_FAMILY_OPTIONS_SCHEMA) {
    throw new TypeError('invalid_package_family_options_schema');
  }
  if (payload.job_id !== expectedJobId) throw new TypeError('invalid_package_family_options_job_id');
  if (payload.public_safety !== 'PASS') throw new TypeError('invalid_package_family_options_public_safety');
  if (!KNOWN_COMPATIBILITY_STATES.has(payload.compatibility_state)) {
    throw new TypeError('invalid_package_family_options_compatibility_state');
  }
  if (!KNOWN_SELECTION_STATES.has(payload.selection_state)) {
    throw new TypeError('invalid_package_family_options_selection_state');
  }
  if (typeof payload.source_pptx_sha256 !== 'string' || !SHA256_PATTERN.test(payload.source_pptx_sha256)) {
    throw new TypeError('invalid_package_family_options_source_sha');
  }
  if (!Array.isArray(payload.package_families)) throw new TypeError('invalid_package_family_options_families');
  if (
    !Number.isInteger(payload.package_family_count)
    || payload.package_family_count < 0
    || payload.package_family_count !== payload.package_families.length
  ) {
    throw new TypeError('invalid_package_family_options_family_count');
  }
  const controlPlaneContractVersion = validateUc6ControlPlaneVersion(payload.control_plane_contract_version);

  if (payload.compatibility_state === 'incompatible_source_pptx') {
    if (payload.template_profile !== null && payload.template_profile !== undefined) {
      throw new TypeError('incompatible_source_pptx_family_template_profile_must_be_null');
    }
    if (payload.package_family_count !== 0 || payload.package_families.length !== 0) {
      throw new TypeError('incompatible_source_pptx_package_families_must_be_empty');
    }
    if (payload.selection_state !== 'unbound') {
      throw new TypeError('incompatible_source_pptx_family_selection_must_be_unbound');
    }
    if (payload.bound_package_family_id !== null && payload.bound_package_family_id !== undefined) {
      throw new TypeError('incompatible_source_pptx_bound_package_family_must_be_null');
    }
    if (payload.bound_package !== null && payload.bound_package !== undefined) {
      throw new TypeError('incompatible_source_pptx_family_bound_package_must_be_null');
    }
    return {
      schema_version: payload.schema_version,
      job_id: payload.job_id,
      source_pptx_sha256: payload.source_pptx_sha256,
      compatibility_state: payload.compatibility_state,
      template_profile: null,
      package_family_count: 0,
      package_families: [],
      package_count: 0,
      packages: [],
      selection_state: payload.selection_state,
      bound_package_family_id: null,
      bound_package: null,
      control_plane_contract_version: controlPlaneContractVersion,
      public_safety: payload.public_safety
    };
  }

  const templateProfile = projectUc6R6cTemplateProfile(payload.template_profile);
  const seenFamilyIds = new Set();
  const seenPackageIdentities = new Set();
  const packages = [];
  const packageFamilies = payload.package_families.map((family) => {
    if (!isPlainObject(family)) throw new TypeError('invalid_package_family');
    if (family.schema_version !== UC6_R6A_PACKAGE_FAMILY_SCHEMA) {
      throw new TypeError('invalid_package_family_schema');
    }
    if (typeof family.package_family_id !== 'string' || !BOUNDED_ID_PATTERN.test(family.package_family_id)) {
      throw new TypeError('invalid_package_family_id');
    }
    if (seenFamilyIds.has(family.package_family_id)) throw new TypeError('duplicate_package_family_id');
    seenFamilyIds.add(family.package_family_id);
    const title = validateUc6SafePublicText(family.title, {
      maxLength: 256,
      code: 'invalid_package_family_title'
    });
    const description = validateUc6SafePublicText(family.description, {
      maxLength: 1024,
      allowEmpty: true,
      code: 'invalid_package_family_description'
    });
    if (!Array.isArray(family.variants)) throw new TypeError('invalid_package_family_variants');
    if (
      !Number.isInteger(family.variant_count)
      || family.variant_count < 0
      || family.variant_count !== family.variants.length
    ) {
      throw new TypeError('invalid_package_family_variant_count');
    }
    if (family.variant_count === 0) throw new TypeError('empty_package_family_variants');
    const variants = family.variants.map((variant) => {
      const projected = projectUc6R6cPackageVariant(variant, {
        expectedSourceSha: payload.source_pptx_sha256,
        expectedTemplateFamilyId: templateProfile.profile_id
      });
      const identity = `${projected.package_id}:${projected.package_version}`;
      if (seenPackageIdentities.has(identity)) throw new TypeError('duplicate_package_identity_across_families');
      seenPackageIdentities.add(identity);
      packages.push(projected);
      return projected;
    });
    return {
      schema_version: family.schema_version,
      package_family_id: family.package_family_id,
      title,
      description,
      variant_count: variants.length,
      variants
    };
  });

  let boundPackageFamilyId = null;
  let boundPackage = null;
  if (payload.selection_state === 'unbound') {
    if (payload.bound_package_family_id !== null && payload.bound_package_family_id !== undefined) {
      throw new TypeError('unbound_selection_must_have_null_package_family');
    }
    if (payload.bound_package !== null && payload.bound_package !== undefined) {
      throw new TypeError('unbound_selection_must_have_null_bound_package');
    }
  } else {
    if (typeof payload.bound_package_family_id !== 'string' || !BOUNDED_ID_PATTERN.test(payload.bound_package_family_id)) {
      throw new TypeError('invalid_bound_package_family_id');
    }
    boundPackage = projectUc6R6cBoundPackage(payload.bound_package);
    const boundFamily = packageFamilies.find((family) => family.package_family_id === payload.bound_package_family_id);
    if (!boundFamily) throw new TypeError('bound_package_family_not_found');
    const boundMatches = boundFamily.variants.filter((variant) => (
      variant.package_id === boundPackage.package_id
      && variant.package_version === boundPackage.package_version
    ));
    if (boundMatches.length !== 1) throw new TypeError('bound_package_not_in_bound_family');
    boundPackageFamilyId = payload.bound_package_family_id;
  }

  return {
    schema_version: payload.schema_version,
    job_id: payload.job_id,
    source_pptx_sha256: payload.source_pptx_sha256,
    compatibility_state: payload.compatibility_state,
    template_profile: templateProfile,
    package_family_count: packageFamilies.length,
    package_families: packageFamilies,
    package_count: packages.length,
    packages,
    selection_state: payload.selection_state,
    bound_package_family_id: boundPackageFamilyId,
    bound_package: boundPackage,
    control_plane_contract_version: controlPlaneContractVersion,
    public_safety: payload.public_safety
  };
}

export function validateUc6DummyDatabagRenderCommand(command, packageOptions = null) {
  if (!isPlainObject(command)) return { ok: false, code: 'command_invalid', message: '생성 명령이 유효하지 않습니다.' };
  const keys = Object.keys(command).sort();
  if (keys.length !== 3 || keys[0] !== 'package_id' || keys[1] !== 'package_version' || keys[2] !== 'retry_failed') {
    return { ok: false, code: 'command_fields_invalid', message: '생성 명령 필드를 확인하세요.' };
  }
  if (typeof command.retry_failed !== 'boolean') {
    return { ok: false, code: 'retry_failed_invalid', message: '생성 재시도 설정이 유효하지 않습니다.' };
  }

  const packageId = String(command.package_id || '').trim();
  const packageVersion = String(command.package_version || '').trim();
  const retryFailed = command.retry_failed;

  if (!BOUNDED_ID_PATTERN.test(packageId)) {
    return { ok: false, code: 'package_id_invalid', message: '선택한 데이터 패키지 식별자가 유효하지 않습니다.' };
  }
  if (!BOUNDED_ID_PATTERN.test(packageVersion)) {
    return { ok: false, code: 'package_version_invalid', message: '선택한 데이터 패키지 버전이 유효하지 않습니다.' };
  }

  if (packageOptions !== null) {
    if (packageOptions.schema_version === UC6_R6D2B_PACKAGE_FAMILY_OPTIONS_SCHEMA || packageOptions.selection_state === 'binding_deferred') {
      return { ok: false, code: 'fresh_render_deferred', message: 'Fresh same-job 데이터 선택의 문서 생성 연결은 다음 단계에서 지원됩니다.' };
    }
    if (!isPlainObject(packageOptions) || packageOptions.compatibility_state !== 'compatible' || !Array.isArray(packageOptions.packages)) {
      return { ok: false, code: 'package_options_invalid', message: '데이터 패키지 상태를 다시 확인하세요.' };
    }
    const matched = packageOptions.packages.find((p) => p.package_id === packageId && p.package_version === packageVersion);
    if (!matched) {
      return { ok: false, code: 'package_not_found', message: '선택한 데이터 패키지를 패키지 목록에서 찾을 수 없습니다.' };
    }
    if (packageOptions.selection_state === 'bound') {
      const bound = packageOptions.bound_package;
      if (!isPlainObject(bound) || bound.package_id !== packageId || bound.package_version !== packageVersion) {
        return { ok: false, code: 'bound_package_mismatch', message: '서버에 고정된 데이터 패키지를 다시 확인하세요.' };
      }
    } else if (packageOptions.selection_state !== 'unbound') {
      return { ok: false, code: 'selection_state_invalid', message: '데이터 패키지 선택 상태를 다시 확인하세요.' };
    }
    if (retryFailed && packageOptions.selection_state !== 'bound') {
      return { ok: false, code: 'retry_requires_bound_package', message: '서버에 고정된 데이터 패키지를 확인한 후 다시 생성하세요.' };
    }
  }

  return {
    ok: true,
    body: {
      package_id: packageId,
      package_version: packageVersion,
      retry_failed: retryFailed
    }
  };
}


export function projectUc6DummyDatabagRenderSubmission(payload, options = {}) {
  if (!isPlainObject(payload)) throw new TypeError('invalid_render_submission_payload');
  const expectedJobId = normalizeUc6JobId(options.expectedJobId);
  if (payload.schema_version !== 'uc6_e2e4c2c_a8d_browser_admin_dummy_databag_render_submission_v1') {
    throw new TypeError('invalid_render_submission_schema');
  }
  if (payload.job_id !== expectedJobId) throw new TypeError('invalid_render_submission_job_id');
  if (payload.public_safety !== 'PASS') throw new TypeError('invalid_render_submission_public_safety');
  if (payload.task_type !== 'fetchdoc_browser_admin_uc6_render_dummy_databag_package') {
    throw new TypeError('invalid_render_submission_task_type');
  }
  if (!Number.isInteger(payload.task_id) || payload.task_id <= 0 || payload.task_id > Number.MAX_SAFE_INTEGER) {
    throw new TypeError('invalid_render_submission_task_id');
  }
  if (!KNOWN_QUEUE_STATUSES.has(payload.queue_status)) throw new TypeError('invalid_render_submission_queue_status');
  if (typeof payload.created !== 'boolean') throw new TypeError('invalid_render_submission_created');
  if (!KNOWN_RENDER_STATES.has(payload.state)) throw new TypeError('invalid_render_submission_state');

  if (QUEUE_STATE_MAP[payload.queue_status] !== payload.state) {
    throw new TypeError('invalid_render_submission_queue_state_mismatch');
  }

  if (payload.final_artifacts !== undefined) {
    throw new TypeError('invalid_render_submission_unexpected_artifacts');
  }

  if (!isPlainObject(payload.bound_package)) throw new TypeError('invalid_render_submission_bound_package');
  const bId = payload.bound_package.package_id;
  const bVer = payload.bound_package.package_version;
  const bTitle = payload.bound_package.title;
  const bDesc = payload.bound_package.description;
  if (typeof bId !== 'string' || !BOUNDED_ID_PATTERN.test(bId) || typeof bVer !== 'string' || !BOUNDED_ID_PATTERN.test(bVer)) {
    throw new TypeError('invalid_render_submission_bound_package_identity');
  }
  if (typeof bTitle !== 'string' || bTitle.trim() === '' || bTitle.length > 256) {
    throw new TypeError('invalid_render_submission_bound_package_title');
  }
  if (typeof bDesc !== 'string' || bDesc.length > 1024) {
    throw new TypeError('invalid_render_submission_bound_package_description');
  }

  if (payload.created === true && payload.state === 'render_completed') {
    throw new TypeError('invalid_render_submission_combination_created_completed');
  }

  return {
    schema_version: payload.schema_version,
    job_id: payload.job_id,
    task_type: payload.task_type,
    task_id: payload.task_id,
    queue_status: payload.queue_status,
    created: payload.created,
    state: payload.state,
    bound_package: {
      package_id: bId,
      package_version: bVer,
      title: bTitle.trim(),
      description: bDesc.trim()
    },
    control_plane_contract_version: payload.control_plane_contract_version || '',
    public_safety: payload.public_safety
  };
}

export function projectUc6DummyDatabagRenderJobStatus(payload, options = {}) {
  if (!isPlainObject(payload)) throw new TypeError('invalid_render_job_status_payload');
  const expectedJobId = normalizeUc6JobId(options.expectedJobId);
  if (payload.job_id !== expectedJobId) throw new TypeError('invalid_render_job_status_job_id');

  if (payload.task_type !== undefined || payload.created !== undefined || payload.queue_status !== undefined || payload.task_id !== undefined) {
    throw new TypeError('invalid_render_job_status_submission_fields');
  }

  const state = payload.state;
  if (!KNOWN_RENDER_STATES.has(state) && state !== 'source_ready') {
    throw new TypeError('invalid_render_job_status_state');
  }
  if (typeof payload.control_plane_contract_version !== 'string' || payload.control_plane_contract_version.trim() === '' || payload.control_plane_contract_version.length > 128) {
    throw new TypeError('invalid_render_job_status_contract_version');
  }

  if (!isPlainObject(payload.source)) throw new TypeError('invalid_render_job_status_source');
  if (typeof payload.source.sha256 !== 'string' || !SHA256_PATTERN.test(payload.source.sha256)) throw new TypeError('invalid_render_job_status_source_sha');
  if (!Number.isInteger(payload.source.size_bytes) || payload.source.size_bytes <= 0) throw new TypeError('invalid_render_job_status_source_size');
  if (!Number.isInteger(payload.source.slide_count) || payload.source.slide_count <= 0) throw new TypeError('invalid_render_job_status_source_slides');
  if (typeof payload.source.filename !== 'string' || payload.source.filename.trim() === '' || payload.source.filename.length > 256) throw new TypeError('invalid_render_job_status_source_filename');

  const sourceProj = {
    sha256: payload.source.sha256,
    size_bytes: payload.source.size_bytes,
    slide_count: payload.source.slide_count,
    filename: payload.source.filename.trim()
  };

  if (state !== 'render_completed') {
    if (payload.render !== undefined) throw new TypeError('non_completed_envelope_must_not_have_render');
    return {
      job_id: payload.job_id,
      state: payload.state,
      source: sourceProj,
      control_plane_contract_version: payload.control_plane_contract_version || ''
    };
  }

  const renderPayload = payload.render;
  if (!isPlainObject(renderPayload)) throw new TypeError('render_completed_requires_nested_render');
  if (renderPayload.schema_version !== 'uc6_e2e4c2c_a8d_browser_admin_dummy_databag_render_result_v1') {
    throw new TypeError('invalid_nested_render_schema');
  }
  if (renderPayload.job_id !== payload.job_id || renderPayload.job_id !== expectedJobId) {
    throw new TypeError('nested_render_job_id_mismatch');
  }
  if (renderPayload.public_safety !== 'PASS') throw new TypeError('invalid_nested_render_public_safety');
  if (typeof renderPayload.control_plane_contract_version !== 'string' || renderPayload.control_plane_contract_version !== payload.control_plane_contract_version) {
    throw new TypeError('invalid_nested_render_contract_version');
  }
  if (renderPayload.state !== 'render_completed' || renderPayload.render_state !== 'render_completed') {
    throw new TypeError('invalid_nested_render_state');
  }
  if (renderPayload.review_state !== 'review_pending') throw new TypeError('invalid_nested_render_review_state');
  if (renderPayload.publication_state !== 'unpublished') throw new TypeError('invalid_nested_render_publication_state');
  if (typeof renderPayload.promotion_eligible !== 'boolean') throw new TypeError('invalid_nested_render_promotion_eligible');

  if (!isPlainObject(renderPayload.bound_package)) throw new TypeError('invalid_nested_render_bound_package');
  const bId = renderPayload.bound_package.package_id;
  const bVer = renderPayload.bound_package.package_version;
  const bTitle = renderPayload.bound_package.title;
  const bDesc = renderPayload.bound_package.description;
  if (typeof bId !== 'string' || !BOUNDED_ID_PATTERN.test(bId) || typeof bVer !== 'string' || !BOUNDED_ID_PATTERN.test(bVer)) {
    throw new TypeError('invalid_nested_render_bound_package_identity');
  }
  if (typeof bTitle !== 'string' || bTitle.trim() === '' || bTitle.length > 256) {
    throw new TypeError('invalid_nested_render_bound_package_title');
  }
  if (typeof bDesc !== 'string' || bDesc.length > 1024) {
    throw new TypeError('invalid_nested_render_bound_package_description');
  }
  const boundPackage = {
    package_id: bId,
    package_version: bVer,
    title: bTitle.trim(),
    description: bDesc.trim()
  };

  if (!isPlainObject(renderPayload.final_artifacts)) throw new TypeError('invalid_nested_render_final_artifacts');
  const pptx = renderPayload.final_artifacts.pptx;
  const pdf = renderPayload.final_artifacts.pdf;

  if (!isPlainObject(pptx) || pptx.alias !== 'final_render_output_pptx') throw new TypeError('invalid_nested_render_pptx_alias');
  if (typeof pptx.sha256 !== 'string' || !SHA256_PATTERN.test(pptx.sha256)) throw new TypeError('invalid_nested_render_pptx_sha');
  if (!Number.isInteger(pptx.size_bytes) || pptx.size_bytes <= 0) throw new TypeError('invalid_nested_render_pptx_size');

  if (!isPlainObject(pdf) || pdf.alias !== 'final_render_output_pdf') throw new TypeError('invalid_nested_render_pdf_alias');
  if (typeof pdf.sha256 !== 'string' || !SHA256_PATTERN.test(pdf.sha256)) throw new TypeError('invalid_nested_render_pdf_sha');
  if (!Number.isInteger(pdf.size_bytes) || pdf.size_bytes <= 0) throw new TypeError('invalid_nested_render_pdf_size');

  return {
    schema_version: renderPayload.schema_version,
    job_id: payload.job_id,
    state: 'render_completed',
    source: sourceProj,
    render_state: 'render_completed',
    review_state: 'review_pending',
    publication_state: 'unpublished',
    promotion_eligible: renderPayload.promotion_eligible,
    bound_package: boundPackage,
    final_artifacts: {
      pptx: {
        alias: 'final_render_output_pptx',
        sha256: pptx.sha256,
        size_bytes: pptx.size_bytes
      },
      pdf: {
        alias: 'final_render_output_pdf',
        sha256: pdf.sha256,
        size_bytes: pdf.size_bytes
      }
    },
    control_plane_contract_version: renderPayload.control_plane_contract_version,
    public_safety: renderPayload.public_safety
  };
}

export function classifyUc6AuthorizationFailure(error) {
  const status = Number(error?.status || 0);
  const code = typeof error?.code === 'string' ? error.code : '';
  if (
    status === 401
    || code === 'browser_admin_bearer_token_required'
    || code === 'browser_admin_authorization_header_invalid'
    || code === 'browser_admin_token_invalid'
    || code === 'browser_admin_token_expired'
  ) {
    return 'signed_out';
  }
  if (
    status === 403
    || code === 'browser_admin_role_required'
    || code === 'browser_admin_email_unverified'
    || code === 'browser_admin_email_not_allowed'
  ) {
    return 'access_denied';
  }
  return null;
}

export async function runUc6CreateJobAndSubmitInitialAnalysis({ api, file, signal, onJobCreated } = {}) {
  if (!api || typeof api.createJob !== 'function' || typeof api.submitAnalysis !== 'function') {
    throw new TypeError('uc6_api_required');
  }
  const createJobResponse = await api.createJob(file, { signal });
  const jobId = normalizeUc6JobId(createJobResponse?.job_id);
  if (typeof onJobCreated === 'function') onJobCreated(jobId, createJobResponse);
  const analysisResponse = await api.submitAnalysis(jobId, { retryFailed: false, signal });
  return { jobId, createJobResponse, analysisResponse };
}

function createPublicError(publicError) {
  const err = new Error(publicError.message || UC6_GENERIC_PUBLIC_ERROR_MESSAGE);
  err.name = 'Uc6PublicError';
  err.code = publicError.code || 'unknown_public_error';
  err.status = Number(publicError.status || 0);
  err.publicMessage = publicError.message || UC6_GENERIC_PUBLIC_ERROR_MESSAGE;
  return err;
}

function joinUrl(baseUrl, path) {
  return new URL(path.replace(/^\//, ''), baseUrl).toString();
}

async function parseJsonResponse(response) {
  try {
    const payload = await response.json();
    return payload && typeof payload === 'object' ? payload : {};
  } catch (_) {
    return {};
  }
}

export function parseUc6JobEventFrame(frame) {
  const normalized = String(frame ?? '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  if (!normalized.trim() || normalized.trimStart().startsWith(':')) return null;

  const dataLines = [];
  for (const line of normalized.split('\n')) {
    if (line.startsWith('data:')) dataLines.push(line.slice(5).replace(/^ /, ''));
  }
  if (!dataLines.length) return null;

  let payload;
  try {
    payload = JSON.parse(dataLines.join('\n'));
  } catch (_) {
    throw new TypeError('uc6_job_event_invalid_json');
  }
  if (!payload || typeof payload !== 'object') throw new TypeError('uc6_job_event_invalid_payload');
  if (payload.schema_version !== 'fetchdoc_job_event_v1') throw new TypeError('uc6_job_event_schema_unsupported');
  if (payload.event_kind !== 'snapshot' && payload.event_kind !== 'state_change') throw new TypeError('uc6_job_event_kind_invalid');

  const jobId = normalizeUc6JobId(payload.job_id);
  const sequence = Number(payload.sequence);
  if (!Number.isInteger(sequence) || sequence < 0) throw new TypeError('uc6_job_event_sequence_invalid');
  const stage = String(payload.stage || '').trim();
  const status = String(payload.status || '').trim();
  if (!stage || !status) throw new TypeError('uc6_job_event_state_invalid');

  const normalizeCount = (value, name) => {
    if (value === null || value === undefined) return null;
    const number = Number(value);
    if (!Number.isInteger(number) || number < 0) throw new TypeError(`uc6_job_event_${name}_invalid`);
    return number;
  };
  const completedUnits = normalizeCount(payload.completed_units, 'completed_units');
  const totalUnits = normalizeCount(payload.total_units, 'total_units');
  if (completedUnits !== null && totalUnits !== null && completedUnits > totalUnits) {
    throw new TypeError('uc6_job_event_progress_invalid');
  }

  return {
    schema_version: payload.schema_version,
    event_kind: payload.event_kind,
    job_id: jobId,
    task_id: payload.task_id !== null && payload.task_id !== undefined && Number.isInteger(Number(payload.task_id)) ? Number(payload.task_id) : null,
    task_type: typeof payload.task_type === 'string' && payload.task_type.trim() ? payload.task_type.trim() : null,
    stage,
    status,
    sequence,
    completed_units: completedUnits,
    total_units: totalUnits,
    updated_at: typeof payload.updated_at === 'string' && payload.updated_at.trim() ? payload.updated_at.trim() : null
  };
}

export function createUc6BrowserAdminApi({ apiBaseUrl, fetchImpl, getIdToken, allowLoopbackHttp = false } = {}) {
  if (typeof fetchImpl !== 'function') throw new TypeError('fetchImpl_required');
  if (typeof getIdToken !== 'function') throw new TypeError('getIdToken_required');
  const baseUrl = normalizeUc6ApiBaseUrl(apiBaseUrl || UC6_PRODUCTION_API_BASE, { allowLoopbackHttp });

  async function request(path, options = {}) {
    const method = options.method || 'GET';
    const isJson = Object.prototype.hasOwnProperty.call(options, 'json');
    const headers = {
      Accept: 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      Pragma: 'no-cache'
    };
    if (isJson) headers['Content-Type'] = 'application/json';

    const buildOptions = async (forceRefresh) => {
      const token = await getIdToken(forceRefresh === true);
      if (typeof token !== 'string' || token.trim() === '') {
        throw createPublicError(parseUc6PublicErrorPayload({ detail: { code: 'browser_admin_bearer_token_required' } }, 401));
      }
      return {
        method,
        headers: {
          ...headers,
          Authorization: `Bearer ${token}`
        },
        cache: 'no-store',
        credentials: 'omit',
        signal: options.signal,
        body: isJson ? JSON.stringify(options.json) : options.body
      };
    };

    const url = joinUrl(baseUrl, path);
    let response = await fetchImpl(url, await buildOptions(false));
    if (response?.status === 401) {
      response = await fetchImpl(url, await buildOptions(true));
    }
    if (!response || typeof response.ok !== 'boolean') throw createPublicError(parseUc6PublicErrorPayload(null, 0));
    if (!response.ok) throw createPublicError(await parseUc6PublicError(response));
    return parseJsonResponse(response);
  }

  async function requestStream(path, options = {}) {
    const headers = {
      Accept: 'text/event-stream',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      Pragma: 'no-cache'
    };

    const buildOptions = async (forceRefresh) => {
      const token = await getIdToken(forceRefresh === true);
      if (typeof token !== 'string' || token.trim() === '') {
        throw createPublicError(parseUc6PublicErrorPayload({ detail: { code: 'browser_admin_bearer_token_required' } }, 401));
      }
      return {
        method: 'GET',
        headers: {
          ...headers,
          Authorization: `Bearer ${token}`
        },
        cache: 'no-store',
        credentials: 'omit',
        signal: options.signal
      };
    };

    const url = joinUrl(baseUrl, path);
    let response = await fetchImpl(url, await buildOptions(false));
    if (response?.status === 401) {
      response = await fetchImpl(url, await buildOptions(true));
    }
    if (!response || typeof response.ok !== 'boolean') throw createPublicError(parseUc6PublicErrorPayload(null, 0));
    if (!response.ok) throw createPublicError(await parseUc6PublicError(response));

    const contentType = String(response.headers?.get?.('content-type') || '').toLowerCase();
    if (!contentType.startsWith('text/event-stream') || !response.body || typeof response.body.getReader !== 'function') {
      const error = new Error('FetchDoc job event stream is unavailable.');
      error.name = 'Uc6JobEventStreamError';
      error.code = 'job_event_stream_unavailable';
      error.publicMessage = '실시간 상태 연결을 사용할 수 없습니다.';
      throw error;
    }
    return response;
  }

  async function requestSingle(path, options = {}) {
    const method = options.method || 'POST';
    const isJson = Object.prototype.hasOwnProperty.call(options, 'json');
    const headers = {
      Accept: 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      Pragma: 'no-cache'
    };
    if (isJson) headers['Content-Type'] = 'application/json';

    let token;
    try {
      token = await getIdToken(true);
    } catch (_) {
      throw createPublicError(parseUc6PublicErrorPayload({ detail: { code: 'browser_admin_bearer_token_required' } }, 401));
    }
    if (typeof token !== 'string' || token.trim() === '') {
      throw createPublicError(parseUc6PublicErrorPayload({ detail: { code: 'browser_admin_bearer_token_required' } }, 401));
    }

    const requestInit = {
      method,
      headers: {
        ...headers,
        Authorization: `Bearer ${token}`
      },
      cache: 'no-store',
      credentials: 'omit',
      signal: options.signal,
      body: isJson ? JSON.stringify(options.json) : options.body
    };

    const url = joinUrl(baseUrl, path);
    let response;
    try {
      response = await fetchImpl(url, requestInit);
    } catch (cause) {
      if (cause?.name === 'AbortError') throw cause;
      const ambError = new Error(options.ambiguousMessage || 'Network failure during submission; outcome is ambiguous.');
      ambError.name = 'Uc6AmbiguousSubmissionError';
      ambError.code = 'ambiguous_submission';
      ambError.publicMessage = options.ambiguousPublicMessage || '요청의 접수 여부를 확인할 수 없습니다.';
      throw ambError;
    }

    if (!response || typeof response.ok !== 'boolean') throw createPublicError(parseUc6PublicErrorPayload(null, 0));
    if (!response.ok) throw createPublicError(await parseUc6PublicError(response));
    return parseJsonResponse(response);
  }

  return {
    getSession(options = {}) {
      return request(UC6_BROWSER_ADMIN_ENDPOINTS.session, { method: 'GET', signal: options.signal });
    },
    createJob(file, options = {}) {
      const form = new FormData();
      if (file && typeof file.name === 'string') form.append('file', file, file.name);
      else form.append('file', file);
      return request(UC6_BROWSER_ADMIN_ENDPOINTS.jobs, { method: 'POST', body: form, signal: options.signal });
    },
    submitAnalysis(jobId, options = {}) {
      const body = { retry_failed: options.retryFailed === true };
      return request(UC6_BROWSER_ADMIN_ENDPOINTS.analysis(jobId), { method: 'POST', json: body, signal: options.signal });
    },
    submitFreshTemplateOnboarding(jobId, options = {}) {
      return requestSingle(UC6_BROWSER_ADMIN_ENDPOINTS.onboarding(jobId), {
        method: 'POST',
        signal: options.signal,
        ambiguousMessage: 'Network failure during fresh onboarding submission; outcome is ambiguous.',
        ambiguousPublicMessage: 'Fresh onboarding 요청의 접수 여부를 확인할 수 없습니다. 작업 상태를 새로고침하세요.'
      });
    },
    submitFreshSyntheticScenarios(jobId, options = {}) {
      return requestSingle(UC6_BROWSER_ADMIN_ENDPOINTS.syntheticScenarios(jobId), {
        method: 'POST',
        signal: options.signal,
        ambiguousMessage: 'Network failure during synthetic scenario generation submission; outcome is ambiguous.',
        ambiguousPublicMessage: '합성 샘플 컨텍스트 생성 요청의 접수 여부를 확인할 수 없습니다. 작업 상태를 새로고침하세요.'
      });
    },
    getFreshSyntheticScenarios(jobId, options = {}) {
      return request(UC6_BROWSER_ADMIN_ENDPOINTS.syntheticScenarios(jobId), { method: 'GET', signal: options.signal });
    },
    bindFreshSyntheticScenario(jobId, scenarioKey, options = {}) {
      const validation = validateUc6SyntheticScenarioBindingCommand(scenarioKey);
      if (!validation.ok) {
        const err = new Error(validation.message);
        err.name = 'Uc6SyntheticScenarioBindingValidationError';
        err.code = validation.code;
        err.publicMessage = validation.message;
        throw err;
      }
      return requestSingle(UC6_BROWSER_ADMIN_ENDPOINTS.syntheticScenarioBinding(jobId), {
        method: 'POST',
        json: validation.body,
        signal: options.signal,
        ambiguousMessage: 'Network failure during synthetic scenario binding; outcome is ambiguous.',
        ambiguousPublicMessage: '합성 샘플 컨텍스트 선택 요청의 접수 여부를 확인할 수 없습니다. 작업 상태를 새로고침하세요.'
      });
    },
    submitFreshSyntheticScenarioRender(jobId, options = {}) {
      return requestSingle(UC6_BROWSER_ADMIN_ENDPOINTS.syntheticScenarioRender(jobId), {
        method: 'POST',
        signal: options.signal,
        ambiguousMessage: 'Network failure during fresh synthetic scenario render submission; outcome is ambiguous.',
        ambiguousPublicMessage: '샘플 문서 생성 요청의 접수 여부를 확인할 수 없습니다. 작업 상태를 확인하고 있습니다.'
      });
    },
    getJob(jobId, options = {}) {
      return request(UC6_BROWSER_ADMIN_ENDPOINTS.job(jobId), { method: 'GET', signal: options.signal });
    },
    openJobEvents(jobId, options = {}) {
      return requestStream(UC6_BROWSER_ADMIN_ENDPOINTS.jobEvents(jobId), { signal: options.signal });
    },
    getReview(jobId, options = {}) {
      return request(UC6_BROWSER_ADMIN_ENDPOINTS.review(jobId), { method: 'GET', signal: options.signal });
    },
    getFinalDeliveryCapabilities(jobId, options = {}) {
      return request(UC6_BROWSER_ADMIN_ENDPOINTS.finalDeliveryCapabilities(jobId), { method: 'GET', signal: options.signal });
    },
    getReviewArtifactCapabilities(jobId, options = {}) {
      return request(UC6_BROWSER_ADMIN_ENDPOINTS.reviewArtifactCapabilities(jobId), { method: 'GET', signal: options.signal });
    },
    getReusableAssetPublication(jobId, options = {}) {
      return request(UC6_BROWSER_ADMIN_ENDPOINTS.reusableAssetPublication(jobId), { method: 'GET', signal: options.signal });
    },
    getDummyDatabagPackages(jobId, options = {}) {
      return request(UC6_BROWSER_ADMIN_ENDPOINTS.dummyDatabagPackages(jobId), { method: 'GET', signal: options.signal });
    },
    getDummyDatabagPackageFamilies(jobId, options = {}) {
      return request(UC6_BROWSER_ADMIN_ENDPOINTS.dummyDatabagPackageFamilies(jobId), { method: 'GET', signal: options.signal });
    },
    submitDummyDatabagRender(jobId, command, options = {}) {
      const validation = validateUc6DummyDatabagRenderCommand(command, options?.packageOptions);
      if (!validation.ok) {
        const err = new Error(validation.message);
        err.name = 'Uc6RenderValidationError';
        err.code = validation.code;
        err.publicMessage = validation.message;
        throw err;
      }
      return requestSingle(UC6_BROWSER_ADMIN_ENDPOINTS.render(jobId), { method: 'POST', json: validation.body, signal: options?.signal });
    },
    getReusableAssets(options = {}) {
      return request(UC6_BROWSER_ADMIN_ENDPOINTS.reusableAssets, { method: 'GET', signal: options.signal });
    },
    bootstrapReusableAssetRuntimeJob(assetId, command, options = {}) {
      const validation = validateUc6ReusableAssetBootstrapCommand(command);
      if (!validation.ok) {
        const err = new Error(validation.message);
        err.name = 'Uc6ReusableAssetBootstrapValidationError';
        err.code = validation.code;
        err.publicMessage = validation.message;
        throw err;
      }
      return requestSingle(UC6_BROWSER_ADMIN_ENDPOINTS.reusableAssetJobs(assetId), {
        method: 'POST',
        json: validation.body,
        signal: options.signal,
        ambiguousMessage: 'Network failure during reusable Asset runtime bootstrap; outcome is ambiguous.',
        ambiguousPublicMessage: '런타임 작업 생성 요청의 접수 여부를 확인할 수 없습니다. Asset을 다시 선택하지 말고 상태를 새로고침하세요.'
      });
    },
    getReusableAssetPackages(assetId, options = {}) {
      return request(UC6_BROWSER_ADMIN_ENDPOINTS.reusableAssetPackages(assetId), { method: 'GET', signal: options.signal });
    },
    getPublishedAssetLinkedScenarioFamily(assetId, options = {}) {
      return request(UC6_BROWSER_ADMIN_ENDPOINTS.linkedScenarioFamily(assetId), { method: 'GET', signal: options.signal });
    },
    submitReusableAssetRender(assetId, command, options = {}) {
      const validation = validateUc6ReusableAssetRenderCommand(command, options?.packageOptions);
      if (!validation.ok) {
        const err = new Error(validation.message);
        err.name = 'Uc6AssetRenderValidationError';
        err.code = validation.code;
        err.publicMessage = validation.message;
        throw err;
      }
      return requestSingle(UC6_BROWSER_ADMIN_ENDPOINTS.reusableAssetRenders(assetId), { method: 'POST', json: validation.body, signal: options?.signal });
    },
    submitPublishedAssetScenarioRender(assetId, command, options = {}) {
      const validation = validateUc6PublishedAssetScenarioRenderCommand(command, options?.linkedFamilyProjection);
      if (!validation.ok) {
        const err = new Error(validation.message);
        err.name = 'Uc6PublishedScenarioRenderValidationError';
        err.code = validation.code;
        err.publicMessage = validation.message;
        throw err;
      }
      return requestSingle(UC6_BROWSER_ADMIN_ENDPOINTS.publishedScenarioRenders(assetId), {
        method: 'POST',
        json: validation.body,
        signal: options?.signal,
        ambiguousMessage: 'Network failure during published Scenario Family render submission; outcome is ambiguous.',
        ambiguousPublicMessage: 'Scenario Family 문서 생성 요청의 접수 여부를 확인할 수 없습니다. 자동 재전송하지 않습니다.'
      });
    },
    getRenderArtifactCapabilities(jobId, options = {}) {
      return request(UC6_BROWSER_ADMIN_ENDPOINTS.renderArtifactCapabilities(jobId), { method: 'GET', signal: options.signal });
    },
    submitReusableAssetPublication(jobId, command, options = {}) {
      const validation = validateUc6ReusableAssetPublicationCommand(command);
      if (!validation.ok) {
        const err = new Error(validation.message);
        err.name = 'Uc6PublicationValidationError';
        err.code = validation.code;
        err.publicMessage = validation.message;
        throw err;
      }
      return requestSingle(UC6_BROWSER_ADMIN_ENDPOINTS.reusableAssetPublication(jobId), { method: 'POST', json: validation.body, signal: options?.signal });
    },
    submitDecision(jobId, command, options = {}) {
      const validation = validateUc6DecisionCommand(command);
      if (!validation.ok) {
        const err = new Error(validation.message);
        err.name = 'Uc6DecisionValidationError';
        err.code = validation.code;
        err.publicMessage = validation.message;
        throw err;
      }
      return request(UC6_BROWSER_ADMIN_ENDPOINTS.reviewDecision(jobId), { method: 'POST', json: validation.body, signal: options.signal });
    }
  };
}
