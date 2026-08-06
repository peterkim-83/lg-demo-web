export const UC6_PRODUCTION_API_BASE = 'https://api.peter-n8n.duckdns.org/';

export const UC6_BROWSER_ADMIN_ENDPOINTS = Object.freeze({
  session: '/fetchdoc/browser-admin/session',
  jobs: '/fetchdoc/browser-admin/uc6/jobs',
  analysis: (jobId) => `/fetchdoc/browser-admin/uc6/jobs/${encodeURIComponent(normalizeUc6JobId(jobId))}/analysis`,
  job: (jobId) => `/fetchdoc/browser-admin/uc6/jobs/${encodeURIComponent(normalizeUc6JobId(jobId))}`,
  review: (jobId) => `/fetchdoc/browser-admin/uc6/jobs/${encodeURIComponent(normalizeUc6JobId(jobId))}/review`,
  reviewDecision: (jobId) => `/fetchdoc/browser-admin/uc6/jobs/${encodeURIComponent(normalizeUc6JobId(jobId))}/review-decision`,
  finalDeliveryCapabilities: (jobId) => `/fetchdoc/browser-admin/uc6/jobs/${encodeURIComponent(normalizeUc6JobId(jobId))}/final-delivery-capabilities`,
  reviewArtifactCapabilities: (jobId) => `/fetchdoc/browser-admin/uc6/jobs/${encodeURIComponent(normalizeUc6JobId(jobId))}/review-artifact-capabilities`,
  reusableAssetPublication: (jobId) => `/fetchdoc/browser-admin/uc6/jobs/${encodeURIComponent(normalizeUc6JobId(jobId))}/reusable-asset-publication`,
  dummyDatabagPackages: (jobId) => `/fetchdoc/browser-admin/uc6/jobs/${encodeURIComponent(normalizeUc6JobId(jobId))}/dummy-databag-packages`,
  render: (jobId) => `/fetchdoc/browser-admin/uc6/jobs/${encodeURIComponent(normalizeUc6JobId(jobId))}/render`
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
  browser_admin_uc6_decision_conflict: '이미 다른 검토 결정이 기록되었습니다.',
  browser_admin_uc6_analysis_failed: '분석 작업이 실패했습니다. 재시도할 수 있습니다.',
  browser_admin_uc6_queue_unavailable: '분석 대기열을 일시적으로 사용할 수 없습니다.',
  browser_admin_uc6_final_delivery_not_approved: '승인 완료 후 최종 산출물 상태를 확인할 수 있습니다.',
  browser_admin_uc6_review_artifact_not_ready: '관리자 검토용 산출물이 아직 준비되지 않았습니다.',
  browser_admin_uc6_service_unavailable: 'FetchDoc 서비스를 일시적으로 사용할 수 없습니다.',
  browser_admin_uc6_dummy_databag_package_invalid: '선택한 데이터 패키지가 유효하지 않습니다.',
  browser_admin_uc6_dummy_databag_binding_conflict: '이 작업에 이미 다른 데이터 패키지가 고정되어 있습니다. 작업 상태를 새로고침하세요.',
  browser_admin_uc6_dummy_databag_unavailable: '데이터 패키지 서비스를 일시적으로 사용할 수 없습니다.',
  browser_admin_uc6_render_conflict: '이미 처리 중인 생성 작업이 있습니다.',
  browser_admin_uc6_render_not_ready: '생성 요청을 처리할 준비가 되지 않았습니다.',
  browser_admin_uc6_render_failed: '문서 생성 작업이 실패했습니다.',
  browser_admin_uc6_render_invalid_task: '생성 작업 정보가 유효하지 않습니다.'
});

const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);
const KNOWN_DECISIONS = new Set(['approve', 'request_revision', 'reject']);
const REVIEW_STATES = new Set(['review_ready', 'review_ready_with_warnings', 'review_blocked']);
const TERMINAL_STATES = new Set(['approved', 'revision_requested', 'rejected']);
const POLLABLE_STATES = new Set(['analysis_queued', 'analysis_running']);
const RENDER_POLLABLE_STATES = new Set(['render_queued', 'render_running']);
const KNOWN_RENDER_STATES = new Set(['render_queued', 'render_running', 'render_completed', 'failed']);
const KNOWN_COMPATIBILITY_STATES = new Set(['compatible', 'incompatible_source_pptx']);
const KNOWN_SELECTION_STATES = new Set(['unbound', 'bound']);
const KNOWN_QUEUE_STATUSES = new Set(['pending', 'processing', 'done', 'failed']);
const KNOWN_FLOW_LANES = new Set(['dummy_render', 'legacy_analysis']);
const SHA256_PATTERN = /^[a-f0-9]{64}$/;
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

export function projectUc6ReusableAssetPublication(payload, options = {}) {
  if (!isPlainObject(payload)) invalidReusablePublicationContract();
  const expectedJobId = normalizeUc6JobId(options.expectedJobId);
  if (payload.schema_version !== UC6_PUBLICATION_SCHEMA_VERSION) invalidReusablePublicationContract();
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
      const ambError = new Error('Network failure during render submission; outcome is ambiguous.');
      ambError.name = 'Uc6AmbiguousSubmissionError';
      ambError.code = 'ambiguous_submission';
      ambError.publicMessage = '생성 요청의 접수 여부를 확인할 수 없습니다.';
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
    getJob(jobId, options = {}) {
      return request(UC6_BROWSER_ADMIN_ENDPOINTS.job(jobId), { method: 'GET', signal: options.signal });
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
