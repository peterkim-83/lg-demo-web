import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

import {
  UC6_GENERIC_PUBLIC_ERROR_MESSAGE,
  createUc6BrowserAdminApi,
  classifyUc6AuthorizationFailure,
  mapUc6StateToView,
  normalizeUc6ApiBaseUrl,
  normalizeUc6JobId,
  parseUc6PublicError,
  projectUc6PersistedState,
  runUc6CreateJobAndSubmitInitialAnalysis,
  splitDecisionTextLines,
  validateUc6DecisionCommand
} from '../public/uc6-browser-admin.mjs';

const API_BASE = 'https://api.peter-n8n.duckdns.org/';
const JOB_ID = 'fd_uc6_admin_test_12345';

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

function extractFunctionBody(source, name) {
  const start = source.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `${name} missing`);
  const open = source.indexOf('{', start);
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
  assert.equal(calls[5].url, `${API_BASE}fetchdoc/browser-admin/uc6/jobs/${JOB_ID}/review-decision`);
  assert.deepEqual(JSON.parse(calls[5].init.body), { decision: 'request_revision', review_notes: ['note'], requested_revisions: [] });
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
  const pollBody = extractFunctionBody(source, 'pollUC6JobStatus');
  const analysisBody = extractFunctionBody(source, 'submitUC6Analysis');
  const reviewBody = extractFunctionBody(source, 'fetchUC6Review');
  const authHandlerBody = extractFunctionBody(source, 'handleUC6AuthorizationFailure');

  assert.equal(uploadBody.includes('submitUC6Analysis(false)'), false);
  assert.equal(uploadBody.includes('runUc6CreateJobAndSubmitInitialAnalysis'), true);
  assert.equal((uploadBody.match(/operationInFlight = true/g) || []).length, 1);
  assert.equal(initBody.includes('submitUC6Analysis(true)'), true);
  assert.equal((decisionBody.match(/refreshUC6JobStatus/g) || []).length, 1);
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
  assert.equal(completeBody.includes('PDF'), false);
  assert.equal(completeBody.includes('download'), false);
  assert.equal(completeBody.includes('다운로드'), false);
});

test('authentication, token processing, endpoints, and frozen API client stay unchanged', () => {
  const app = readSource('../public/app.js');
  const html = readSource('../public/index.html');
  assert.equal(app.includes("const UC6_FIREBASE_SDK_VERSION = '10.14.1'"), true);
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
    '/review-decision'
  ]) {
    assert.equal(readSource('../public/uc6-browser-admin.mjs').includes(endpoint), true);
  }
  for (const id of ['view-uc1', 'view-uc2', 'view-uc3', 'view-uc4', 'view-uc5']) {
    assert.equal(html.includes(`id="${id}"`), true);
    assert.equal(html.includes(`data-target="${id}"`), true);
  }
  for (const constant of ['UC1_WEBHOOK', 'UC2_WEBHOOK', 'UC3_START_CALL', 'UC4_WEBHOOK', 'UC5_W00_WEBHOOK', 'UC5_W03_WEBHOOK']) {
    assert.equal(app.includes(constant), true);
  }
  const baseline = execFileSync('git', ['rev-parse', '76d1d5c33601a8e93c91a055f70822631d2d0090:public/uc6-browser-admin.mjs'], { encoding: 'utf8' }).trim();
  const head = execFileSync('git', ['rev-parse', 'HEAD:public/uc6-browser-admin.mjs'], { encoding: 'utf8' }).trim();
  assert.equal(head, baseline);
  execFileSync('git', ['diff', '--quiet', '76d1d5c33601a8e93c91a055f70822631d2d0090', '--', 'public/uc6-browser-admin.mjs']);
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
});
