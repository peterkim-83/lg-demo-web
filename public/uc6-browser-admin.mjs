export const UC6_PRODUCTION_API_BASE = 'https://api.peter-n8n.duckdns.org/';

export const UC6_BROWSER_ADMIN_ENDPOINTS = Object.freeze({
  session: '/fetchdoc/browser-admin/session',
  jobs: '/fetchdoc/browser-admin/uc6/jobs',
  analysis: (jobId) => `/fetchdoc/browser-admin/uc6/jobs/${encodeURIComponent(normalizeUc6JobId(jobId))}/analysis`,
  job: (jobId) => `/fetchdoc/browser-admin/uc6/jobs/${encodeURIComponent(normalizeUc6JobId(jobId))}`,
  review: (jobId) => `/fetchdoc/browser-admin/uc6/jobs/${encodeURIComponent(normalizeUc6JobId(jobId))}/review`,
  reviewDecision: (jobId) => `/fetchdoc/browser-admin/uc6/jobs/${encodeURIComponent(normalizeUc6JobId(jobId))}/review-decision`,
  finalDeliveryCapabilities: (jobId) => `/fetchdoc/browser-admin/uc6/jobs/${encodeURIComponent(normalizeUc6JobId(jobId))}/final-delivery-capabilities`
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
  browser_admin_uc6_service_unavailable: 'FetchDoc 서비스를 일시적으로 사용할 수 없습니다.'
});

const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);
const KNOWN_DECISIONS = new Set(['approve', 'request_revision', 'reject']);
const REVIEW_STATES = new Set(['review_ready', 'review_ready_with_warnings', 'review_blocked']);
const TERMINAL_STATES = new Set(['approved', 'revision_requested', 'rejected']);
const POLLABLE_STATES = new Set(['analysis_queued', 'analysis_running']);
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
  if (Number.isFinite(input.last_polling_timestamp)) projected.last_polling_timestamp = input.last_polling_timestamp;
  if (typeof input.selected_panel === 'string' && /^[a-z_]{3,32}$/.test(input.selected_panel)) projected.selected_panel = input.selected_panel;
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
